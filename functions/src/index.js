// BoulderHub — Cloud Functions
// Resaltado de presas con SlimSAM (ONNX), 100% server-side, solo se llama al
// crear/editar un bloque (nunca al visualizarlo). Ver PLAN de la sesión para contexto completo.
'use strict';

const crypto = require('crypto');
const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { setGlobalOptions } = require('firebase-functions/v2');

const { computeEmbedding, segmentPoint, serializeEmbedding, deserializeEmbedding } = require('./sam');
const { maskToRegion } = require('./maskToPolygon');

admin.initializeApp({ storageBucket: 'boulderhub-app.firebasestorage.app' });
const db = admin.firestore();
const bucket = admin.storage().bucket();

setGlobalOptions({ region: 'us-central1', memory: '1GiB', timeoutSeconds: 60, minInstances: 0 });

const EMBEDDING_PREFIX = 'hold-embeddings';
// Cache en memoria del embedding deserializado por instancia tibia: evita releer Storage en
// cada tap de una misma sesión de edición (varios taps llegan a la misma instancia caliente).
const warmCache = new Map();
const WARM_CACHE_MAX = 8;

function rememberWarm(embeddingId, embedding) {
  warmCache.set(embeddingId, embedding);
  if (warmCache.size > WARM_CACHE_MAX) {
    const oldest = warmCache.keys().next().value;
    warmCache.delete(oldest);
  }
}

async function assertRouteSetter(uid) {
  if (!uid) throw new HttpsError('unauthenticated', 'Debes iniciar sesión.');
  const snap = await db.collection('users').doc(uid).get();
  const roles = snap.exists ? snap.data().roles || [] : [];
  if (!roles.includes('routesetter') && !roles.includes('admin')) {
    throw new HttpsError('permission-denied', 'Solo routesetters pueden usar esta función.');
  }
}

function hashBuffer(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

/**
 * Calcula (o reusa) el embedding SAM de una foto de bloque. Se llama una sola vez por foto,
 * al abrir el editor de presas. Recibe los bytes en base64 (no una URL) porque en modo
 * "creación de bloque" la foto todavía no fue subida a Storage (es un preview local del setter).
 * Cachea en Cloud Storage keyed por hash de los bytes de la imagen.
 */
exports.computeHoldEmbedding = onCall(async (request) => {
  await assertRouteSetter(request.auth && request.auth.uid);
  const { photoBase64 } = request.data || {};
  if (!photoBase64 || typeof photoBase64 !== 'string') {
    throw new HttpsError('invalid-argument', 'Falta photoBase64.');
  }
  // Límite defensivo: ~8MB de imagen decodificada (el cliente ya la comprime a WebP ~1200px).
  if (photoBase64.length > 12 * 1024 * 1024) {
    throw new HttpsError('invalid-argument', 'Imagen demasiado grande.');
  }

  const imageBuffer = Buffer.from(photoBase64, 'base64');
  const embeddingId = hashBuffer(imageBuffer);
  const binFile = bucket.file(`${EMBEDDING_PREFIX}/${embeddingId}.bin`);
  const metaFile = bucket.file(`${EMBEDDING_PREFIX}/${embeddingId}.json`);

  const [binExists] = await binFile.exists();
  if (binExists) {
    return { embeddingId, cached: true };
  }

  const embedding = await computeEmbedding(imageBuffer);
  const { buffer, meta } = serializeEmbedding(embedding);

  await Promise.all([
    binFile.save(buffer, { contentType: 'application/octet-stream' }),
    metaFile.save(JSON.stringify(meta), { contentType: 'application/json' }),
  ]);
  rememberWarm(embeddingId, embedding);

  return { embeddingId, cached: false };
});

/**
 * Segmenta la presa tocada dado un embeddingId ya calculado (ver computeHoldEmbedding) y un
 * punto (x,y normalizado 0-1). Devuelve un HoldRegion listo para guardar en Firestore.
 */
exports.segmentHoldPoint = onCall(async (request) => {
  await assertRouteSetter(request.auth && request.auth.uid);
  const { embeddingId, x, y } = request.data || {};
  if (!embeddingId || typeof x !== 'number' || typeof y !== 'number') {
    throw new HttpsError('invalid-argument', 'Faltan embeddingId, x o y.');
  }

  let embedding = warmCache.get(embeddingId);
  if (!embedding) {
    const binFile = bucket.file(`${EMBEDDING_PREFIX}/${embeddingId}.bin`);
    const metaFile = bucket.file(`${EMBEDDING_PREFIX}/${embeddingId}.json`);
    const [[binBuf], [metaBuf]] = await Promise.all([binFile.download(), metaFile.download()]).catch(() => {
      throw new HttpsError('not-found', 'Embedding no encontrado, llamá a computeHoldEmbedding primero.');
    });
    embedding = deserializeEmbedding(binBuf, JSON.parse(metaBuf.toString('utf-8')));
    rememberWarm(embeddingId, embedding);
  }

  const { mask, w, h, iou } = await segmentPoint(embedding, x, y);
  const region = maskToRegion(mask, w, h);
  if (!region) {
    throw new HttpsError('failed-precondition', 'No se pudo generar un contorno válido para ese punto.');
  }
  return { region, iou };
});
