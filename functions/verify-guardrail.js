// Verifica el guardrail de área (MAX_AREA_FRAC=0.35) contra los puntos de la simulación
// de dos bloques con distinta iluminación (ver conversación / memoria de sesión).
const fs = require('fs');
const { computeEmbedding, segmentPoint } = require('./src/sam');
const { maskToRegion } = require('./src/maskToPolygon');

const MAX_AREA_FRAC = 0.2;
const MAX_DIM_FRAC = 0.5; // ninguna presa real debería abarcar más de la mitad del ancho/alto de la foto

const cases = [
  {
    label: 'Bloque A (iluminación uniforme)',
    file: '../scripts/spike/samples/29oQemOf7AG8wtiSj9fq.webp',
    points: [[0.25, 0.065], [0.18, 0.2], [0.18, 0.57], [0.43, 0.52], [0.05, 0.27]],
  },
  {
    label: 'Bloque B (iluminación difícil + color camuflado)',
    file: '../scripts/spike/samples/0f2ZyXK0npVFYxIRzsLh.webp',
    points: [[0.54, 0.21], [0.47, 0.26], [0.72, 0.5], [0.79, 0.41], [0.15, 0.41]],
  },
  {
    label: 'Bloque C (presas blancas, bajo contraste de color)',
    file: '../scripts/spike/samples/6XwWnIcUFGhyCZWzaQ3F.webp',
    points: [[0.117, 0.063], [0.55, 0.35], [0.43, 0.556], [0.41, 0.66], [0.81, 0.234]],
  },
  {
    label: 'Bloque D (presas negras, bajo contraste de color)',
    file: '../scripts/spike/samples/CQTGwnZVcxD4qqpAoSrb.webp',
    points: [[0.43, 0.6], [0.49, 0.46], [0.058, 0.238], [0.3, 0.32], [0.83, 0.28]],
  },
  {
    label: 'Bloque E (presas naranja, muro muy recargado)',
    file: '../scripts/spike/samples/B9N8cZmYeItiZgAvpKYA.webp',
    points: [[0.82, 0.253], [0.71, 0.353], [0.73, 0.4125], [0.95, 0.52], [0.82, 0.644]],
  },
  {
    label: 'Bloque F (presas rojas, muro con oclusión/clutter extremo)',
    file: '../scripts/spike/samples/3QTFndWPEgG08zJ2yHhh.webp',
    points: [[0.235, 0.494], [0.375, 0.475], [0.51, 0.494], [0.7125, 0.5625], [0.95, 0.5]],
  },
];

async function main() {
  for (const c of cases) {
    console.log(`\n=== ${c.label} ===`);
    const buf = fs.readFileSync(c.file);
    const embedding = await computeEmbedding(buf);
    for (const [x, y] of c.points) {
      const { mask, w, h, iou } = await segmentPoint(embedding, x, y);
      const region = maskToRegion(mask, w, h, x * w, y * h);
      const areaFrac = region ? region.w * region.h : null;
      const rejected = !region || areaFrac > MAX_AREA_FRAC || region.w > MAX_DIM_FRAC || region.h > MAX_DIM_FRAC;
      console.log(
        `  (${x},${y}) iou=${iou.toFixed(3)} areaFrac=${areaFrac?.toFixed(3)} w=${region?.w.toFixed(3)} h=${region?.h.toFixed(3)} -> ${rejected ? 'RECHAZADA (fallback local)' : 'OK'}`,
      );
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
