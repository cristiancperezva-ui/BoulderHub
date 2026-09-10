// Contornos: puerto a CommonJS de src/lib/holdGeometry.ts (traceOuterBoundary + rdpClosed).
// Mantener en sync manualmente si cambia la lógica del lado del cliente.
'use strict';

const DX = [0, 1, 1, 1, 0, -1, -1, -1];
const DY = [-1, -1, 0, 1, 1, 1, 0, -1];

function dirIndex(dx, dy) {
  for (let i = 0; i < 8; i++) if (DX[i] === dx && DY[i] === dy) return i;
  return -1;
}

/** Traza el contorno exterior (8-conectividad, vecino de Moore) de una máscara binaria w×h. */
function traceOuterBoundary(mask, w, h) {
  let sx = -1, sy = -1;
  for (let y = 0; y < h && sx < 0; y++) {
    for (let x = 0; x < w; x++) {
      if (mask[y * w + x]) { sx = x; sy = y; break; }
    }
  }
  if (sx < 0) return [];

  const boundary = [[sx, sy]];
  let cx = sx, cy = sy;
  let bx = sx - 1, by = sy;
  let guard = 0;
  const maxGuard = w * h * 4 + 256;

  while (guard++ < maxGuard) {
    let startIdx = dirIndex(bx - cx, by - cy);
    if (startIdx < 0) startIdx = 6;
    let foundDir = -1, fx = 0, fy = 0;
    for (let k = 1; k <= 8; k++) {
      const d = (startIdx + k) % 8;
      const nx = cx + DX[d];
      const ny = cy + DY[d];
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
      if (mask[ny * w + nx]) { foundDir = d; fx = nx; fy = ny; break; }
    }
    if (foundDir < 0) { boundary.push([cx, cy]); break; }
    const pbDir = (foundDir - 1 + 8) % 8;
    bx = cx + DX[pbDir];
    by = cy + DY[pbDir];
    cx = fx; cy = fy;
    if (cx === sx && cy === sy) { boundary.push([sx, sy]); break; }
    boundary.push([cx, cy]);
  }
  return boundary;
}

function perpDist(p, a, b) {
  const [px, py] = p, [ax, ay] = a, [bx, by] = b;
  const dx = bx - ax, dy = by - ay;
  const len = Math.hypot(dx, dy);
  if (len === 0) return Math.hypot(px - ax, py - ay);
  return Math.abs(dy * px - dx * py + bx * ay - by * ax) / len;
}

/** Simplificación de Ramer-Douglas-Peucker sobre un anillo cerrado. */
function rdpClosed(points, epsilon) {
  if (points.length < 4) return points.slice();
  const open = points.length > 0 &&
    points[0][0] === points[points.length - 1][0] &&
    points[0][1] === points[points.length - 1][1]
    ? points.slice(0, -1)
    : points.slice();
  if (open.length < 3) return open;

  const keep = new Uint8Array(open.length);
  keep[0] = 1;
  keep[open.length - 1] = 1;
  const stack = [[0, open.length - 1]];
  while (stack.length) {
    const [s, e] = stack.pop();
    let maxD = 0, idx = -1;
    const a = open[s], b = open[e];
    for (let i = s + 1; i < e; i++) {
      const d = perpDist(open[i], a, b);
      if (d > maxD) { maxD = d; idx = i; }
    }
    if (maxD > epsilon && idx > 0) {
      keep[idx] = 1;
      stack.push([s, idx], [idx, e]);
    }
  }
  const simplified = open.filter((_, i) => keep[i] === 1);
  if (simplified.length > 1) {
    const first = simplified[0], last = simplified[simplified.length - 1];
    if (first[0] !== last[0] || first[1] !== last[1]) simplified.push(first);
  }
  return simplified;
}

/** Convierte una máscara binaria (0/1, w×h) en un polígono normalizado 0-1 listo para HoldRegion.pts. */
function maskToRegion(mask, w, h) {
  const boundary = traceOuterBoundary(mask, w, h);
  if (boundary.length < 4) return null;
  const epsilon = Math.max(w, h) * 0.004; // ~0.4% del lado mayor, igual criterio que el cliente
  const simplified = rdpClosed(boundary, epsilon);
  if (simplified.length < 4) return null;

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const [x, y] of simplified) {
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }
  const pts = simplified.slice(0, -1).map(([x, y]) => ({ x: x / w, y: y / h }));
  return {
    x: (minX + maxX) / 2 / w,
    y: (minY + maxY) / 2 / h,
    w: (maxX - minX) / w,
    h: (maxY - minY) / h,
    pts,
  };
}

module.exports = { traceOuterBoundary, rdpClosed, maskToRegion };
