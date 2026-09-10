// Smoke test end-to-end del backend (sin desplegar): valida que sam.js + maskToPolygon.js
// producen un HoldRegion válido a partir de una foto real, igual que las Cloud Functions.
const fs = require('fs');
const { computeEmbedding, segmentPoint, serializeEmbedding, deserializeEmbedding } = require('./src/sam');
const { maskToRegion } = require('./src/maskToPolygon');

async function main() {
  const buf = fs.readFileSync('../scripts/spike/samples/0D7b9BqnaGsPXOnzE6cF.webp');
  console.log('Computando embedding...');
  const embedding = await computeEmbedding(buf);

  // Round-trip de serialización (simula el cache en Cloud Storage)
  const { buffer, meta } = serializeEmbedding(embedding);
  const embedding2 = deserializeEmbedding(buffer, meta);

  console.log('Segmentando punto (0.075, 0.156)...');
  const { mask, w, h, iou } = await segmentPoint(embedding2, 0.075, 0.156);
  console.log('iou:', iou, 'mask pixels:', mask.reduce((a, b) => a + b, 0));

  const region = maskToRegion(mask, w, h);
  console.log('region:', region ? { x: region.x, y: region.y, w: region.w, h: region.h, nPts: region.pts.length } : null);
  if (!region) throw new Error('maskToRegion devolvió null');
  console.log('OK ✅');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
