// ─── Detección de presas con SAM en la nube (Cloud Functions) ───────────────
// Se usa solo al crear/editar un bloque: el setter toca una presa y esta capa
// llama al backend (SlimSAM) para obtener un contorno de alta calidad.
// Si falla (offline, error del backend), el caller debe hacer fallback a
// `addHoldAt` (detección local por color) — ver holdDetection.ts.

import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase';
import type { HoldRegion } from '@/types';

interface ComputeEmbeddingResult {
  embeddingId: string;
  cached: boolean;
}

interface SegmentPointResult {
  region: Omit<HoldRegion, 'colorIndex'>;
  iou: number;
}

const computeHoldEmbeddingFn = httpsCallable<{ photoBase64: string }, ComputeEmbeddingResult>(
  functions,
  'computeHoldEmbedding',
);
const segmentHoldPointFn = httpsCallable<{ embeddingId: string; x: number; y: number }, SegmentPointResult>(
  functions,
  'segmentHoldPoint',
);

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.slice(result.indexOf(',') + 1)); // quitar el prefijo "data:...;base64,"
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

/**
 * Calcula (o reusa) el embedding SAM de la foto. Llamar 1 vez al abrir el editor.
 * Acepta un File local (foto recién elegida, aún no subida) o una URL ya subida a Storage.
 */
export async function computeHoldEmbedding(photoSource: File | Blob | string): Promise<string> {
  const blob = typeof photoSource === 'string' ? await (await fetch(photoSource)).blob() : photoSource;
  const photoBase64 = await blobToBase64(blob);
  const res = await computeHoldEmbeddingFn({ photoBase64 });
  return res.data.embeddingId;
}

/** Segmenta la presa tocada en (nx, ny) normalizado 0-1, usando el embedding ya calculado. */
export async function addHoldAtML(
  embeddingId: string,
  nx: number,
  ny: number,
  colorIndex: number,
): Promise<HoldRegion> {
  const res = await segmentHoldPointFn({ embeddingId, x: nx, y: ny });
  return { ...res.data.region, colorIndex };
}
