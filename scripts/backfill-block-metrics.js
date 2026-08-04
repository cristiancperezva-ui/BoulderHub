/**
 * Script de migración ÚNICA — Backfill de ratingSum/ratingCount en bloques existentes
 *
 * Contexto: se optimizó el guardado de intentos para usar increment() atómico
 * en vez de releer toda la subcolección "attempts" en cada escritura (ver
 * src/lib/blockMetrics.ts). Los bloques creados ANTES de este cambio no tienen
 * los campos "ratingSum"/"ratingCount", así que este script los calcula una
 * sola vez a partir de los intentos existentes, dejando avgRating consistente.
 *
 * Uso:
 *   node scripts/backfill-block-metrics.js
 *
 * Es un costo de lectura único (no recurrente), no afecta la cuota diaria
 * de los usuarios de la app.
 */
import { readFileSync } from 'fs';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const KEY_FILE = './firebase-admin-key.json';
const key = JSON.parse(readFileSync(KEY_FILE, 'utf-8'));

initializeApp({ credential: cert(key) });
const db = getFirestore();

async function main() {
  const blocksSnap = await db.collection('blocks').get();
  console.log(`Bloques encontrados: ${blocksSnap.size}`);

  let updated = 0;
  for (const blockDoc of blocksSnap.docs) {
    const data = blockDoc.data();

    // Si ya tiene ratingCount, asumimos que ya fue migrado
    if (typeof data.ratingCount === 'number') continue;

    const attemptsSnap = await db.collection('blocks').doc(blockDoc.id).collection('attempts').get();
    const ratings = attemptsSnap.docs
      .map(d => d.data().rating)
      .filter((r) => typeof r === 'number');

    const ratingSum = ratings.reduce((s, r) => s + r, 0);
    const ratingCount = ratings.length;
    const avgRating = ratingCount > 0 ? Math.round((ratingSum / ratingCount) * 10) / 10 : 0;

    const totalAttempts = attemptsSnap.size;
    const flashCount = attemptsSnap.docs.filter(d => d.data().type === 'flash').length;
    const encadenadoCount = attemptsSnap.docs.filter(d => d.data().type === 'encadenado').length;
    const proyectoCount = attemptsSnap.docs.filter(d => d.data().type === 'proyecto').length;

    await blockDoc.ref.update({
      ratingSum,
      ratingCount,
      avgRating,
      totalAttempts,
      flashCount,
      encadenadoCount,
      proyectoCount,
    });

    updated++;
    console.log(`✅ ${blockDoc.id}: ratingSum=${ratingSum} ratingCount=${ratingCount} avgRating=${avgRating} totalAttempts=${totalAttempts}`);
  }

  console.log(`\nListo. ${updated} bloque(s) actualizados, ${blocksSnap.size - updated} ya estaban migrados.`);
}

main().catch(console.error);
