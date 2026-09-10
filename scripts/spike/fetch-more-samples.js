import { readFileSync, mkdirSync, writeFileSync } from 'fs';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const KEY_FILE = './firebase-admin-key.json';
const OUT_DIR = './scripts/spike/samples';
const IDS = ['6XwWnIcUFGhyCZWzaQ3F', 'CQTGwnZVcxD4qqpAoSrb'];

const key = JSON.parse(readFileSync(KEY_FILE, 'utf-8'));
initializeApp({ credential: cert(key) });
const db = getFirestore();

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });
  const manifest = JSON.parse(readFileSync(`${OUT_DIR}/manifest.json`, 'utf-8'));
  for (const id of IDS) {
    const doc = await db.collection('blocks').doc(id).get();
    const data = doc.data();
    if (!data?.photoUrl) continue;
    const res = await fetch(data.photoUrl);
    const buf = Buffer.from(await res.arrayBuffer());
    const file = `${OUT_DIR}/${id}.webp`;
    writeFileSync(file, buf);
    manifest.push({ id, file, holdColors: data.holdColors || [] });
    console.log(`Guardado: ${file} (${data.holdColors})`);
  }
  writeFileSync(`${OUT_DIR}/manifest.json`, JSON.stringify(manifest, null, 2));
}

main().catch((err) => { console.error(err); process.exit(1); });
