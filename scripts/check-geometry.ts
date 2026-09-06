// Chequeo rápido (offline, sin DOM) de las funciones geométricas de contorno y
// helpers puros de detección (remapColorIndices/regionContains).
// Correr: npx tsx scripts/check-geometry.ts
import {
  traceOuterBoundary,
  rdpClosed,
  polygonArea,
  pointInPolygon,
  splitPolygonByLine,
  regionToPath,
  regionToPts,
  type Pt,
} from '../src/lib/holdGeometry.ts';
import { remapColorIndices, regionContains } from '../src/lib/holdDetection.ts';
import type { HoldRegion } from '../src/types/index.ts';

let failures = 0;
function check(name: string, cond: boolean, detail = '') {
  if (!cond) {
    failures++;
    console.log(`✗ ${name} ${detail}`);
  } else {
    console.log(`✓ ${name}`);
  }
}

function maskFrom(points: Array<[number, number]>, w: number, h: number): Uint8Array {
  const m = new Uint8Array(w * h);
  for (const [x, y] of points) m[y * w + x] = 1;
  return m;
}

// 1) Rectángulo 4x3 relleno → contorno cerrado con los 14 píxeles del borde
{
  const w = 6, h = 5;
  const pts: Array<[number, number]> = [];
  for (let y = 1; y <= 3; y++) for (let x = 1; x <= 4; x++) pts.push([x, y]);
  const ring = traceOuterBoundary(maskFrom(pts, w, h), w, h);
  check('rect traza cerrada', ring.length >= 3 && ring[0][0] === ring[ring.length - 1][0] && ring[0][1] === ring[ring.length - 1][1], `len=${ring.length}`);
  const area = Math.abs(polygonArea(ring));
  check('rect área (centros) ≈ 6', Math.abs(area - 6) < 1.5, `area=${area}`);
}

// 2) Píxel aislado no crashea y devuelve algo
{
  const ring = traceOuterBoundary(maskFrom([[3, 3]], 10, 10), 10, 10);
  check('pixel aislado sin crash', Array.isArray(ring));
}

// 3) Forma en L (concavidad)
{
  const w = 6, h = 6;
  const pts: Array<[number, number]> = [];
  for (let y = 1; y <= 4; y++) for (let x = 1; x <= 2; x++) pts.push([x, y]);
  for (let y = 1; y <= 2; y++) for (let x = 3; x <= 4; x++) pts.push([x, y]);
  const ring = traceOuterBoundary(maskFrom(pts, w, h), w, h);
  const area = Math.abs(polygonArea(ring));
  check('L traza cerrada', ring.length >= 3 && ring[0][0] === ring[ring.length - 1][0] && ring[0][1] === ring[ring.length - 1][1], `len=${ring.length}`);
  check('L área (centros) 4-7', area > 3 && area < 8, `area=${area}`);
}

// 4) RDP reduce puntos sin vaciar
{
  const ring: Pt[] = [];
  for (let i = 0; i <= 100; i++) {
    const a = (i / 100) * Math.PI * 2;
    ring.push([Math.cos(a), Math.sin(a)]);
  }
  ring.push([1, 0]); // cerrar
  const simp = rdpClosed(ring, 0.05);
  check('rdp reduce', simp.length > 3 && simp.length < ring.length, `simp=${simp.length}`);
}

// 5) point-in-polygon
{
  const square: Pt[] = [[0, 0], [4, 0], [4, 4], [0, 4], [0, 0]];
  check('pip dentro', pointInPolygon(square, 2, 2));
  check('pip fuera', !pointInPolygon(square, 6, 6));
  check('pip borde', pointInPolygon(square, 4, 2) === true || pointInPolygon(square, 4, 2) === false);
}

// 6) split rectángulo por diagonal → dos triángulos
{
  const square: Pt[] = [[0, 0], [4, 0], [4, 4], [0, 4]];
  const [left, right] = splitPolygonByLine(square, [0, 0], [4, 4]);
  const al = Math.abs(polygonArea(left));
  const ar = Math.abs(polygonArea(right));
  check('split dos partes', left.length >= 3 && right.length >= 3, `l=${left.length} r=${right.length}`);
  check('split áreas suman ≈ 16', Math.abs(al + ar - 16) < 0.01, `al=${al} ar=${ar}`);
}

// 7) split por línea vertical
{
  const rect: Pt[] = [[0, 0], [6, 0], [6, 4], [0, 4]];
  const [left, right] = splitPolygonByLine(rect, [3, -1], [3, 5]);
  const al = Math.abs(polygonArea(left));
  const ar = Math.abs(polygonArea(right));
  check('split vertical dos rects', left.length >= 3 && right.length >= 3, `l=${left.length} r=${right.length}`);
  check('split vertical áreas (12+12)', Math.abs(al - 12) < 0.01 && Math.abs(ar - 12) < 0.01, `al=${al} ar=${ar}`);
}

// 8) remapColorIndices: quitar color del medio re-mapea índices
{
  const oldColors = ['#ff0000', '#00ff00', '#0000ff'];
  const regions: HoldRegion[] = [
    { x: 0.1, y: 0.1, w: 0.05, h: 0.05, colorIndex: 0 }, // rojo → se elimina
    { x: 0.3, y: 0.1, w: 0.05, h: 0.05, colorIndex: 1 }, // verde → 0
    { x: 0.5, y: 0.1, w: 0.05, h: 0.05, colorIndex: 2 }, // azul → 1
  ];
  const next = remapColorIndices(regions, oldColors, ['#00ff00', '#0000ff']);
  check('remap quita color', next.length === 2);
  check('remap reindexa', next.length === 2 && next[0].colorIndex === 0 && next[1].colorIndex === 1);
}

// 9) regionContains: dentro/fuera con silueta y con elipse
{
  const poly: HoldRegion = { x: 0.5, y: 0.5, w: 0.4, h: 0.4, colorIndex: 0, pts: [{ x: 0.2, y: 0.2 }, { x: 0.8, y: 0.2 }, { x: 0.8, y: 0.8 }, { x: 0.2, y: 0.8 }] };
  check('regionContains dentro', regionContains(poly, 0.5, 0.5));
  check('regionContains fuera', !regionContains(poly, 0.05, 0.05));
  const ell: HoldRegion = { x: 0.5, y: 0.5, w: 0.4, h: 0.4, colorIndex: 0 };
  check('regionContains elipse centro', regionContains(ell, 0.5, 0.5));
  check('regionContains elipse esquina', !regionContains(ell, 0.01, 0.01));
}

// 10) regionToPts fallback a elipse y regionToPath genera path
{
  const ell: HoldRegion = { x: 0.5, y: 0.5, w: 0.4, h: 0.2, colorIndex: 0 };
  const pts = regionToPts(ell);
  check('regionToPts elipse 24 pts', pts.length === 24);
  const d = regionToPath(ell);
  check('regionToPath path', !!d && d.startsWith('M'));
}

console.log(failures === 0 ? '\nTODOS OK' : `\n${failures} fallos`);
process.exit(failures === 0 ? 0 : 1);