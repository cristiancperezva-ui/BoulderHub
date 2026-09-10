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

/**
 * Aísla el componente conexo (4-conectividad) que contiene el píxel semilla (seedX, seedY).
 * La máscara binaria "cruda" que devuelve SAM (sigmoid + threshold sobre un mapa de baja
 * resolución reescalado) a veces trae píxeles sueltos de ruido lejos de la presa real; sin esto,
 * `traceOuterBoundary` (que arranca en el píxel más arriba-a la izquierda) podía trazar ese
 * ruido en vez de la presa, devolviendo un contorno diminuto y descartando una máscara válida.
 */
function isolateComponent(mask, w, h, seedX, seedY) {
  const sx = Math.min(w - 1, Math.max(0, Math.round(seedX)));
  const sy = Math.min(h - 1, Math.max(0, Math.round(seedY)));
  if (!mask[sy * w + sx]) return mask; // semilla fuera de la máscara: devolver tal cual (caso raro)

  const out = new Uint8Array(w * h);
  const queue = new Int32Array(w * h);
  let head = 0, tail = 0;
  const start = sy * w + sx;
  queue[tail++] = start;
  out[start] = 1;
  while (head < tail) {
    const idx = queue[head++];
    const px = idx % w, py = (idx / w) | 0;
    const neighbors = [
      px > 0 ? idx - 1 : -1,
      px < w - 1 ? idx + 1 : -1,
      py > 0 ? idx - w : -1,
      py < h - 1 ? idx + w : -1,
    ];
    for (const n of neighbors) {
      if (n >= 0 && mask[n] && !out[n]) {
        out[n] = 1;
        queue[tail++] = n;
      }
    }
  }
  return out;
}

/**
 * Convierte una máscara binaria (0/1, w×h) en un polígono normalizado 0-1 listo para HoldRegion.pts.
 * Si se pasa (seedX, seedY) (el punto que tocó el setter), primero aísla el componente conexo que
 * contiene ese punto — evita que ruido suelto en la máscara cruda de SAM arruine el trazado.
 */
function maskToRegion(mask, w, h, seedX, seedY) {
  const m = typeof seedX === 'number' ? isolateComponent(mask, w, h, seedX, seedY) : mask;
  const boundary = traceOuterBoundary(m, w, h);
  if (boundary.length < 4) return null;
  // Mismo criterio que buildSilhouette() en holdDetection.ts: epsilon fijo y chico (en px), que
  // solo crece si hay demasiados puntos. Usar una fracción del lado mayor de la imagen completa
  // (como se hacía antes) era demasiado agresivo para presas chicas/redondas y las colapsaba a
  // <4 puntos (se rechazaban máscaras perfectamente válidas) — visto en la simulación de bloques.
  let epsilon = 1.6;
  let simplified = rdpClosed(boundary, epsilon);
  let guard = 0;
  while (simplified.length > 60 && guard++ < 24) {
    epsilon *= 1.5;
    simplified = rdpClosed(boundary, epsilon);
  }
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

module.exports = { traceOuterBoundary, rdpClosed, isolateComponent, maskToRegion };
