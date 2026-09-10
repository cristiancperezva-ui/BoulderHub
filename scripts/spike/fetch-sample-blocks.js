/**
 * Fase 0 (spike SAM) — descarga 3-5 fotos reales de bloques desde Firestore/Storage
 * para probar calidad de segmentación localmente, sin tocar producción.
 *
 * Uso: node scripts/spike/fetch-sample-blocks.js
 */
import { readFileSync, mkdirSync, writeFileSync } from 'fs';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const KEY_FILE = './firebase-admin-key.json';
const OUT_DIR = './scripts/spike/samples';
const LIMIT = 5;

const key = JSON.parse(readFileSync(KEY_FILE, 'utf-8'));
initializeApp({ credential: cert(key) });
const db = getFirestore();

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });
  const snap = await db.collection('blocks').limit(LIMIT).get();
  console.log(`Bloques encontrados: ${snap.size}`);

  const manifest = [];
  for (const doc of snap.docs) {
    const data = doc.data();
    if (!data.photoUrl) continue;
    const res = await fetch(data.photoUrl);
    if (!res.ok) {
      console.warn(`No se pudo descargar ${doc.id}: ${res.status}`);
      continue;
    }
    const buf = Buffer.from(await res.arrayBuffer());
    const file = `${OUT_DIR}/${doc.id}.webp`;
    writeFileSync(file, buf);
    manifest.push({ id: doc.id, file, holdColors: data.holdColors || [] });
    console.log(`Guardado: ${file}`);
  }
  writeFileSync(`${OUT_DIR}/manifest.json`, JSON.stringify(manifest, null, 2));
  console.log(`Listo. ${manifest.length} fotos guardadas en ${OUT_DIR}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
