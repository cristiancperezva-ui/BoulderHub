// ─── Geometría de contornos (pura, sin DOM) ───────────────────────────────────
// Funciones usadas por la detección de presas y el editor de contorno:
// trazado del contorno exterior de una región binaria, simplificación RDP,
// área/point-in-polygon y corte de un polígono por una línea.

import type { HoldRegion } from '@/types';

export type Pt = readonly [number, number];

// ─── Silueta de región (HoldRegion → puntos / path SVG) ──────────────────────

/** Devuelve los puntos (normalizados 0-1) de una región; si no tiene silueta,
 *  genera una elipse aproximada a partir de x/y/w/h. */
export function regionToPts(r: HoldRegion): { x: number; y: number }[] {
  if (r.pts && r.pts.length >= 3) return r.pts;
  const out: { x: number; y: number }[] = [];
  const cx = r.x;
  const cy = r.y;
  const rx = r.w / 2;
  const ry = r.h / 2;
  const steps = 24;
  if (rx > 0 && ry > 0) {
    for (let i = 0; i < steps; i++) {
      const a = (i / steps) * Math.PI * 2;
      out.push({ x: cx + rx * Math.cos(a), y: cy + ry * Math.sin(a) });
    }
  }
  return out;
}

/** Convierte una región a una cadena de path SVG (coordenadas 0-1). */
export function regionToPath(r: HoldRegion): string | null {
  const pts = regionToPts(r);
  if (pts.length < 3) return null;
  let d = `M ${pts[0].x.toFixed(4)} ${pts[0].y.toFixed(4)}`;
  for (let i = 1; i < pts.length; i++) {
    d += ` L ${pts[i].x.toFixed(4)} ${pts[i].y.toFixed(4)}`;
  }
  return `${d} Z`;
}

/** Distancia perpendicular de p a la recta que pasa por a-b. */
function perpDist(p: Pt, a: Pt, b: Pt): number {
  const [px, py] = p;
  const [ax, ay] = a;
  const [bx, by] = b;
  const dx = bx - ax;
  const dy = by - ay;
  const len = Math.hypot(dx, dy);
  if (len === 0) return Math.hypot(px - ax, py - ay);
  return Math.abs(dy * px - dx * py + bx * ay - by * ax) / len;
}

/** Simplificación de Ramer-Douglas-Peucker sobre un anillo cerrado. */
export function rdpClosed(points: Pt[], epsilon: number): Pt[] {
  if (points.length < 4) return points.slice();
  // Trabajar sobre el anillo abierto (sin repetir el primer punto al final)
  const open = points.length > 0 && points[0][0] === points[points.length - 1][0] && points[0][1] === points[points.length - 1][1]
    ? points.slice(0, -1)
    : points.slice();
  if (open.length < 3) return open;

  const keep = new Uint8Array(open.length);
  keep[0] = 1;
  keep[open.length - 1] = 1;
  const stack: Array<[number, number]> = [[0, open.length - 1]];
  while (stack.length) {
    const [s, e] = stack.pop()!;
    let maxD = 0;
    let idx = -1;
    const a = open[s];
    const b = open[e];
    for (let i = s + 1; i < e; i++) {
      const d = perpDist(open[i], a, b);
      if (d > maxD) {
        maxD = d;
        idx = i;
      }
    }
    if (maxD > epsilon && idx > 0) {
      keep[idx] = 1;
      stack.push([s, idx], [idx, e]);
    }
  }
  const simplified = open.filter((_, i) => keep[i] === 1);
  // Cerrar: repetir el primer punto al final
  if (simplified.length > 1) {
    const first = simplified[0];
    const last = simplified[simplified.length - 1];
    if (first[0] !== last[0] || first[1] !== last[1]) simplified.push(first);
  }
  return simplified;
}

/** Área con signo de un polígono (fórmula del shoelace). */
export function polygonArea(pts: Pt[]): number {
  let area = 0;
  const n = pts.length;
  for (let i = 0; i < n; i++) {
    const [x0, y0] = pts[i];
    const [x1, y1] = pts[(i + 1) % n];
    area += x0 * y1 - x1 * y0;
  }
  return area / 2;
}

/** Ray-casting: ¿está el punto (x,y) dentro del polígono? */
export function pointInPolygon(pts: Pt[], x: number, y: number): boolean {
  let inside = false;
  const n = pts.length;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const [xi, yi] = pts[i];
    const [xj, yj] = pts[j];
    const intersects = (yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
}

// Direcciones en orden horario (N, NE, E, SE, S, SW, W, NW)
const DX = [0, 1, 1, 1, 0, -1, -1, -1];
const DY = [-1, -1, 0, 1, 1, 1, 0, -1];

function dirIndex(dx: number, dy: number): number {
  for (let i = 0; i < 8; i++) if (DX[i] === dx && DY[i] === dy) return i;
  return -1;
}

/**
 * Traza el contorno exterior (8-conectividad, vecino de Moore) de la región
 * binaria `mask` (w×h, 1 = región). Devuelve puntos en coordenadas de píxel
 * (esquina sup-izq). Devuelve la polilínea cerrada (repite el primer punto).
 */
export function traceOuterBoundary(mask: Uint8Array, w: number, h: number): Pt[] {
  // Punto inicial: el más arriba; si empata, el más a la izquierda.
  let sx = -1;
  let sy = -1;
  for (let y = 0; y < h && sx < 0; y++) {
    for (let x = 0; x < w; x++) {
      if (mask[y * w + x]) {
        sx = x;
        sy = y;
        break;
      }
    }
  }
  if (sx < 0) return [];

  const boundary: Pt[] = [[sx, sy]];
  let cx = sx;
  let cy = sy;
  // "Backtrack": píxel de fondo por el que se "entró" al inicio (el del oeste).
  let bx = sx - 1;
  let by = sy;
  let guard = 0;
  const maxGuard = w * h * 4 + 256;

  while (guard++ < maxGuard) {
    // Índice de dirección del backtrack respecto del actual
    let startIdx = dirIndex(bx - cx, by - cy);
    if (startIdx < 0) startIdx = 6; // oeste
    let foundDir = -1;
    let fx = 0;
    let fy = 0;
    for (let k = 1; k <= 8; k++) {
      const d = (startIdx + k) % 8;
      const nx = cx + DX[d];
      const ny = cy + DY[d];
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
      if (mask[ny * w + nx]) {
        foundDir = d;
        fx = nx;
        fy = ny;
        break;
      }
    }
    if (foundDir < 0) {
      // Píxel aislado
      boundary.push([cx, cy]);
      break;
    }
    // Nuevo backtrack = píxel inmediatamente anterior al encontrado en el barrido
    const pbDir = (foundDir - 1 + 8) % 8;
    bx = cx + DX[pbDir];
    by = cy + DY[pbDir];
    cx = fx;
    cy = fy;
    if (cx === sx && cy === sy) {
      boundary.push([sx, sy]);
      break;
    }
    boundary.push([cx, cy]);
  }

  return boundary;
}

/** Elimina duplicados consecutivos y puntos colineales triviales. */
function cleanupRing(pts: Pt[]): Pt[] {
  const out: Pt[] = [];
  for (const p of pts) {
    const last = out[out.length - 1];
    if (last && Math.abs(last[0] - p[0]) < 1e-9 && Math.abs(last[1] - p[1]) < 1e-9) continue;
    out.push(p);
  }
  return out;
}

/**
 * Corta el polígono cerrado `pts` con la recta infinita que pasa por A→B.
 * Devuelve [ladoIzquierdo, ladoDerecho] (lado = semiplano con cross ≥ 0).
 * Cada resultado es un polígono cerrado o vacío si no tiene ≥ 3 puntos.
 */
export function splitPolygonByLine(pts: Pt[], a: Pt, b: Pt): [Pt[], Pt[]] {
  const cross = (p: Pt): number => {
    const [px, py] = p;
    return (b[0] - a[0]) * (py - a[1]) - (b[1] - a[1]) * (px - a[0]);
  };
  const left: Pt[] = [];
  const right: Pt[] = [];
  const n = pts.length;

  const pushSide = (side: Pt[], p: Pt) => {
    const last = side[side.length - 1];
    if (!last || Math.abs(last[0] - p[0]) > 1e-9 || Math.abs(last[1] - p[1]) > 1e-9) side.push(p);
  };

  for (let i = 0; i < n; i++) {
    const p = pts[i];
    const q = pts[(i + 1) % n];
    const dp = cross(p);
    const dq = cross(q);
    const onLineP = Math.abs(dp) <= 1e-9;
    const onLineQ = Math.abs(dq) <= 1e-9;

    if (onLineP) {
      // Vértice sobre la línea de corte: pertenece al borde de AMBOS polígonos.
      pushSide(left, p);
      pushSide(right, p);
    } else if (dp > 0) {
      pushSide(left, p);
    } else {
      pushSide(right, p);
    }

    // Cruce estricto (ambos extremos fuera de la línea y de signo opuesto)
    if (!onLineP && !onLineQ && ((dp > 0 && dq < 0) || (dp < 0 && dq > 0))) {
      // cross(P(t)-A, v) es lineal en t: dp + t*(dq-dp) = 0 → t = -dp/(dq-dp)
      const denom = dq - dp;
      if (Math.abs(denom) > 1e-12) {
        const t = -dp / denom;
        if (t > 1e-9 && t < 1 - 1e-9) {
          const ix = p[0] + (q[0] - p[0]) * t;
          const iy = p[1] + (q[1] - p[1]) * t;
          const inter: Pt = [ix, iy];
          pushSide(left, inter);
          pushSide(right, inter);
        }
      }
    }
  }

  const close = (ring: Pt[]): Pt[] => {
    const c = cleanupRing(ring);
    if (c.length < 3) return [];
    const first = c[0];
    const last = c[c.length - 1];
    if (first[0] !== last[0] || first[1] !== last[1]) c.push(first);
    return c;
  };

  return [close(left), close(right)];
}
