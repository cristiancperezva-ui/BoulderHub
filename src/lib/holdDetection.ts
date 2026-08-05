// ─── Detección de presas por color (100% en el cliente) ──────────────────────
// Segmenta la foto por color y agrupa los píxeles en "presas" (blobs conexos).
// Todo corre en canvas en el navegador: cero costo de servidor.

import type { HoldRegion } from '@/types';

interface Hsv {
  h: number;
  s: number;
  v: number;
}

export interface DetectHoldOptions {
  /** 0-100. Qué tan estricto es el match de color. Mayor = más laxo. */
  sensitivity?: number;
  /** Fracción mínima del área de la imagen para considerarse una presa. */
  minBlobAreaPct?: number;
  /** Fracción máxima del área (descarta fondos/muros completos). */
  maxBlobAreaPct?: number;
  /** Resolución de trabajo (lado mayor en px). */
  maxDimension?: number;
}

export function hexToRgb(hex: string): [number, number, number] {
  let clean = hex.replace('#', '').trim();
  if (clean.length === 3) clean = clean.split('').map((c) => c + c).join('');
  if (clean.length !== 6) return [0, 0, 0];
  const n = parseInt(clean, 16);
  if (Number.isNaN(n)) return [0, 0, 0];
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgbToHsv(r: number, g: number, b: number): Hsv {
  const rr = r / 255;
  const gg = g / 255;
  const bb = b / 255;
  const max = Math.max(rr, gg, bb);
  const min = Math.min(rr, gg, bb);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === rr) h = ((gg - bb) / d + (gg < bb ? 6 : 0)) * 60;
    else if (max === gg) h = ((bb - rr) / d + 2) * 60;
    else h = ((rr - gg) / d + 4) * 60;
  }
  const s = max === 0 ? 0 : d / max;
  return { h, s, v: max };
}

interface ColorMatcher {
  index: number;
  target: Hsv;
  /** Acromáticas (negro/blanco/gris): sin tono, se comparan por luminosidad. */
  achromatic: boolean;
}

function buildMatchers(holdColors: string[]): ColorMatcher[] {
  return holdColors.map((hex, index) => {
    const [r, g, b] = hexToRgb(hex);
    const target = rgbToHsv(r, g, b);
    return { index, target, achromatic: target.s < 0.18 };
  });
}

function buildTolerances(sensitivity: number) {
  const t = Math.max(0, Math.min(1, sensitivity / 100));
  return {
    hueTol: 10 + t * 50,   // 10..60 grados
    sTol: 0.06 + t * 0.2,  // 0.06..0.26
    vTol: 0.05 + t * 0.22, // 0.05..0.27
  };
}

function hueDistance(a: number, b: number): number {
  let d = Math.abs(a - b);
  if (d > 180) d = 360 - d;
  return d;
}

function matches(
  p: Hsv,
  m: ColorMatcher,
  tols: { hueTol: number; sTol: number; vTol: number },
): boolean {
  if (m.achromatic) {
    const satOk = p.s < 0.5;
    const vOk = Math.abs(p.v - m.target.v) < tols.vTol;
    return satOk && vOk;
  }
  return (
    hueDistance(p.h, m.target.h) < tols.hueTol &&
    Math.abs(p.s - m.target.s) < tols.sTol &&
    Math.abs(p.v - m.target.v) < tols.vTol
  );
}

interface PrepResult {
  w: number;
  h: number;
  data: Uint8ClampedArray;
  matchers: ColorMatcher[];
  tols: { hueTol: number; sTol: number; vTol: number };
}

function prep(
  img: HTMLImageElement | HTMLCanvasElement,
  holdColors: string[],
  sensitivity: number,
  maxDimension: number,
): PrepResult | null {
  if (holdColors.length === 0) return null;
  const srcW = img instanceof HTMLImageElement ? img.naturalWidth || img.width : img.width;
  const srcH = img instanceof HTMLImageElement ? img.naturalHeight || img.height : img.height;
  if (!srcW || !srcH) return null;
  const scale = Math.min(1, maxDimension / Math.max(srcW, srcH));
  const w = Math.max(1, Math.round(srcW * scale));
  const h = Math.max(1, Math.round(srcH * scale));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(img, 0, 0, w, h);
  return {
    w,
    h,
    data: ctx.getImageData(0, 0, w, h).data,
    matchers: buildMatchers(holdColors),
    tols: buildTolerances(sensitivity),
  };
}

/** Detecta todas las presas de los colores dados en la imagen. */
export function detectHolds(
  img: HTMLImageElement | HTMLCanvasElement,
  holdColors: string[],
  options: DetectHoldOptions = {},
): HoldRegion[] {
  const {
    sensitivity = 50,
    minBlobAreaPct = 0.0006,
    maxBlobAreaPct = 0.3,
    maxDimension = 1000,
  } = options;

  const p = prep(img, holdColors, sensitivity, maxDimension);
  if (!p) return [];
  const { w, h, data, matchers, tols } = p;
  const n = w * h;

  // 1) Clasificar cada píxel → matchColor (índice de color o -1)
  const matchColor = new Int16Array(n);
  matchColor.fill(-1);
  for (let i = 0; i < n; i++) {
    const o = i * 4;
    if (data[o + 3] < 128) continue;
    const px: Hsv = rgbToHsv(data[o], data[o + 1], data[o + 2]);
    for (let m = 0; m < matchers.length; m++) {
      if (matches(px, matchers[m], tols)) {
        matchColor[i] = matchers[m].index;
        break;
      }
    }
  }

  // 2) Etiquetar componentes conexos (4-conectividad) por color
  const visited = new Uint8Array(n);
  const queue = new Int32Array(n);
  const regions: HoldRegion[] = [];

  for (let ci = 0; ci < matchers.length; ci++) {
    for (let start = 0; start < n; start++) {
      if (visited[start] !== 0 || matchColor[start] !== ci) continue;

      let head = 0;
      let tail = 0;
      queue[tail++] = start;
      visited[start] = 1;
      let count = 0;
      let minX = w;
      let minY = h;
      let maxX = -1;
      let maxY = -1;

      while (head < tail) {
        const pxl = queue[head++];
        const px = pxl % w;
        const py = (pxl / w) | 0;
        count++;
        if (px < minX) minX = px;
        if (px > maxX) maxX = px;
        if (py < minY) minY = py;
        if (py > maxY) maxY = py;

        const push = (idx: number) => {
          if (visited[idx] === 0 && matchColor[idx] === ci) {
            visited[idx] = 1;
            queue[tail++] = idx;
          }
        };
        if (px > 0) push(pxl - 1);
        if (px < w - 1) push(pxl + 1);
        if (py > 0) push(pxl - w);
        if (py < h - 1) push(pxl + w);
      }

      const area = count / n;
      if (area >= minBlobAreaPct && area <= maxBlobAreaPct) {
        regions.push({
          x: ((minX + maxX) / 2 + 0.5) / w,
          y: ((minY + maxY) / 2 + 0.5) / h,
          w: (maxX - minX + 1) / w,
          h: (maxY - minY + 1) / h,
          colorIndex: ci,
        });
      }
    }
  }

  return regions;
}

/** Agrega la presa (blob conexo) que contiene el punto normalizado (0-1). */
export function addHoldAt(
  img: HTMLImageElement | HTMLCanvasElement,
  holdColors: string[],
  nx: number,
  ny: number,
  options: DetectHoldOptions = {},
): HoldRegion | null {
  const {
    sensitivity = 50,
    minBlobAreaPct = 0.0002,
    maxBlobAreaPct = 0.3,
    maxDimension = 1000,
  } = options;

  const p = prep(img, holdColors, sensitivity, maxDimension);
  if (!p) return null;
  const { w, h, data, matchers, tols } = p;

  const px = Math.min(w - 1, Math.max(0, Math.round(nx * (w - 1))));
  const py = Math.min(h - 1, Math.max(0, Math.round(ny * (h - 1))));
  const start = py * w + px;
  const o = start * 4;
  if (data[o + 3] < 128) return null;

  const tapped: Hsv = rgbToHsv(data[o], data[o + 1], data[o + 2]);
  let ci = -1;
  for (let m = 0; m < matchers.length; m++) {
    if (matches(tapped, matchers[m], tols)) {
      ci = matchers[m].index;
      break;
    }
  }
  if (ci < 0) return null;

  // Flood fill desde el punto para este color
  const visited = new Uint8Array(w * h);
  const queue = new Int32Array(w * h);
  let head = 0;
  let tail = 0;
  queue[tail++] = start;
  visited[start] = 1;
  let count = 0;
  let minX = w;
  let minY = h;
  let maxX = -1;
  let maxY = -1;

  while (head < tail) {
    const pxl = queue[head++];
    const ppx = pxl % w;
    const ppy = (pxl / w) | 0;
    count++;
    if (ppx < minX) minX = ppx;
    if (ppx > maxX) maxX = ppx;
    if (ppy < minY) minY = ppy;
    if (ppy > maxY) maxY = ppy;

    const push = (idx: number) => {
      if (visited[idx] === 0) {
        visited[idx] = 1;
        const io = idx * 4;
        if (data[io + 3] < 128) return;
        const pp: Hsv = rgbToHsv(data[io], data[io + 1], data[io + 2]);
        if (matches(pp, matchers[ci], tols)) queue[tail++] = idx;
      }
    };
    if (ppx > 0) push(pxl - 1);
    if (ppx < w - 1) push(pxl + 1);
    if (ppy > 0) push(pxl - w);
    if (ppy < h - 1) push(pxl + w);
  }

  const area = count / (w * h);
  if (area < minBlobAreaPct || area > maxBlobAreaPct) return null;
  return {
    x: ((minX + maxX) / 2 + 0.5) / w,
    y: ((minY + maxY) / 2 + 0.5) / h,
    w: (maxX - minX + 1) / w,
    h: (maxY - minY + 1) / h,
    colorIndex: ci,
  };
}

/** ¿La región `a` se superpone con alguna de `regions` más que `threshold` (0-1)? */
export function overlapsAny(regions: HoldRegion[], a: HoldRegion, threshold = 0.5): boolean {
  return regions.some((r) => {
    const ix = Math.min(r.x + r.w / 2, a.x + a.w / 2) - Math.max(r.x - r.w / 2, a.x - a.w / 2);
    const iy = Math.min(r.y + r.h / 2, a.y + a.h / 2) - Math.max(r.y - r.h / 2, a.y - a.h / 2);
    if (ix <= 0 || iy <= 0) return false;
    const inter = ix * iy;
    return inter / Math.min(a.w * a.h, r.w * r.h) > threshold;
  });
}
