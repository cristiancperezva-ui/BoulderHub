// ─── Detección de presas por color (100% en el cliente) ──────────────────────
// Segmenta la foto por color y agrupa los píxeles en "presas" (blobs conexos).
// Todo corre en canvas en el navegador: cero costo de servidor.

import type { HoldRegion } from '@/types';
import { traceOuterBoundary, rdpClosed, pointInPolygon } from './holdGeometry';

interface Hsv {
  h: number;
  s: number;
  v: number;
}

/** Rodea con la silueta poligonal (pts) a una región; si falla, undefined. */
interface SilhouetteInput {
  ccX: number[];
  ccY: number[];
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  w: number;
  h: number;
}

function samePt(a: { x: number; y: number }, b: { x: number; y: number }): boolean {
  return Math.abs(a.x - b.x) < 1e-9 && Math.abs(a.y - b.y) < 1e-9;
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
  const p = readWorkingPixels(img, maxDimension);
  if (!p) return null;
  return {
    ...p,
    matchers: buildMatchers(holdColors),
    tols: buildTolerances(sensitivity),
  };
}

/** Lee la imagen a un canvas de trabajo (≤ maxDimension px) y devuelve RGBA. */
function readWorkingPixels(
  img: HTMLImageElement | HTMLCanvasElement,
  maxDimension: number,
): { w: number; h: number; data: Uint8ClampedArray } | null {
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
  return { w, h, data: ctx.getImageData(0, 0, w, h).data };
}

/**
 * Construye la silueta poligonal (normalizada 0-1) de un componente conexo a
 * partir de sus píxeles. Devuelve undefined si no se puede trazar (el render
 * usa la elipse x/y/w/h como fallback).
 */
function buildSilhouette(s: SilhouetteInput): { x: number; y: number }[] | undefined {
  const { ccX, ccY, minX, minY, maxX, maxY, w, h } = s;
  if (ccX.length < 4) return undefined;
  const bw = maxX - minX + 1;
  const bh = maxY - minY + 1;
  if (bw * bh > 2_000_000) return undefined;
  const mask = new Uint8Array(bw * bh);
  for (let i = 0; i < ccX.length; i++) {
    mask[(ccY[i] - minY) * bw + (ccX[i] - minX)] = 1;
  }
  const ring = traceOuterBoundary(mask, bw, bh);
  if (ring.length < 4) return undefined;
  // Simplificación RDP en espacio de píxel, con tope de puntos (controla el
  // tamaño guardado en Firestore: el doc del bloque sigue siendo pequeño).
  let eps = 1.6;
  let pts = rdpClosed(ring, eps);
  let guard = 0;
  while (pts.length > 60 && guard++ < 24) {
    eps *= 1.5;
    pts = rdpClosed(ring, eps);
  }
  if (pts.length < 3) return undefined;
  const out = pts.map(([px, py]) => ({ x: (minX + px + 0.5) / w, y: (minY + py + 0.5) / h }));
  // Quitar el punto de cierre duplicado (el path se cierra con Z en el SVG)
  if (out.length > 1 && samePt(out[0], out[out.length - 1])) out.pop();
  return out;
}

/** HSV → hex. */
function hsvToHex(h: number, s: number, v: number): string {
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  let r = 0;
  let g = 0;
  let b = 0;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  const to2 = (n: number) => Math.round((n + m) * 255).toString(16).padStart(2, '0');
  return `#${to2(r)}${to2(g)}${to2(b)}`;
}

/**
 * Muestra el color de la presa en el punto (nx,ny) (promedio de una vecindad
 * pequeña) y devuelve un hex "canónico" estable:
 * - acromático (blanco/gris/negro) → snap a #FFFFFF / #808080 / #000000
 * - cromático → cuantizado a buckets de tono/saturación/valor
 * Devuelve null si el punto no tiene píxeles visibles.
 */
export function sampleHoldColor(
  img: HTMLImageElement | HTMLCanvasElement,
  nx: number,
  ny: number,
  maxDimension = 1000,
): string | null {
  const p = readWorkingPixels(img, maxDimension);
  if (!p) return null;
  const { w, h, data } = p;
  const cx = Math.min(w - 1, Math.max(0, Math.round(nx * (w - 1))));
  const cy = Math.min(h - 1, Math.max(0, Math.round(ny * (h - 1))));
  const rad = 3;
  let rSum = 0;
  let gSum = 0;
  let bSum = 0;
  let n = 0;
  for (let dy = -rad; dy <= rad; dy++) {
    for (let dx = -rad; dx <= rad; dx++) {
      const px = cx + dx;
      const py = cy + dy;
      if (px < 0 || py < 0 || px >= w || py >= h) continue;
      const o = (py * w + px) * 4;
      if (data[o + 3] < 128) continue;
      rSum += data[o];
      gSum += data[o + 1];
      bSum += data[o + 2];
      n++;
    }
  }
  if (n === 0) return null;
  const px = rgbToHsv(rSum / n, gSum / n, bSum / n);
  if (px.s < 0.15) {
    if (px.v < 0.25) return '#000000';
    if (px.v > 0.78) return '#FFFFFF';
    return '#808080';
  }
  // Cuantizar para agrupar presas del mismo tono en un chip estable
  const hq = Math.round(px.h / 15) * 15;
  const sq = Math.round(px.s / 0.12) * 0.12;
  const vq = Math.round(px.v / 0.1) * 0.1;
  return hsvToHex(((hq % 360) + 360) % 360, Math.min(1, Math.max(0, sq)), Math.min(1, Math.max(0.12, vq)));
}

/**
 * Re-mapea `colorIndex` de cada región cuando cambia la lista holdColors
 * (p. ej. al quitar un color de la paleta): descarta las regiones del color
 * eliminado y reasigna los índices posteriores.
 */
export function remapColorIndices(regions: HoldRegion[], oldColors: string[], newColors: string[]): HoldRegion[] {
  const map = oldColors.map((c) => newColors.indexOf(c));
  const out: HoldRegion[] = [];
  for (const r of regions) {
    const ni = map[r.colorIndex] ?? -1;
    if (ni < 0) continue;
    out.push({ ...r, colorIndex: ni });
  }
  return out;
}

/** ¿El punto normalizado (nx,ny) cae dentro de la región (silueta o elipse)? */
export function regionContains(r: HoldRegion, nx: number, ny: number): boolean {
  if (r.pts && r.pts.length >= 3) {
    const poly = r.pts.map((p) => [p.x, p.y] as const);
    return pointInPolygon(poly, nx, ny);
  }
  const dx = (nx - r.x) / Math.max(r.w / 2, 1e-6);
  const dy = (ny - r.y) / Math.max(r.h / 2, 1e-6);
  return dx * dx + dy * dy <= 1;
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
      const ccX: number[] = [];
      const ccY: number[] = [];

      while (head < tail) {
        const pxl = queue[head++];
        const px = pxl % w;
        const py = (pxl / w) | 0;
        count++;
        ccX.push(px);
        ccY.push(py);
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
        const pts = buildSilhouette({ ccX, ccY, minX, minY, maxX, maxY, w, h });
        regions.push({
          x: ((minX + maxX) / 2 + 0.5) / w,
          y: ((minY + maxY) / 2 + 0.5) / h,
          w: (maxX - minX + 1) / w,
          h: (maxY - minY + 1) / h,
          colorIndex: ci,
          pts,
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
  const ccX: number[] = [];
  const ccY: number[] = [];

  while (head < tail) {
    const pxl = queue[head++];
    const ppx = pxl % w;
    const ppy = (pxl / w) | 0;
    count++;
    ccX.push(ppx);
    ccY.push(ppy);
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
  const pts = buildSilhouette({ ccX, ccY, minX, minY, maxX, maxY, w, h });
  return {
    x: ((minX + maxX) / 2 + 0.5) / w,
    y: ((minY + maxY) / 2 + 0.5) / h,
    w: (maxX - minX + 1) / w,
    h: (maxY - minY + 1) / h,
    colorIndex: ci,
    pts,
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
