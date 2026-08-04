// ─── Cálculo incremental de métricas de bloque ───────────────────────────────
// Antes: cada intento guardado disparaba un getSubDocs() que releía TODOS los
// intentos del bloque (O(N) lecturas por cada escritura, escala muy mal con
// bloques populares). Ahora: usamos increment() atómico de Firestore + el
// snapshot ya cacheado del bloque (0 lecturas extra) para producir un delta.

import { increment } from 'firebase/firestore';
import type { Attempt, AttemptType, Block } from '@/types';

const COUNT_FIELD: Record<AttemptType, keyof Block> = {
  flash: 'flashCount',
  encadenado: 'encadenadoCount',
  proyecto: 'proyectoCount',
};

type BlockRatingSnapshot = Pick<Block, 'ratingSum' | 'ratingCount'>;
type AttemptDelta = Pick<Partial<Attempt>, 'type' | 'rating'>;

/**
 * Calcula el objeto de actualización (con FieldValue.increment donde aplica)
 * para reflejar un intento nuevo o editado, sin leer la subcolección completa.
 *
 * @param block snapshot actual del bloque (ya cacheado en el cliente)
 * @param previous intento anterior del mismo usuario (null si es nuevo)
 * @param next intento que se acaba de guardar
 */
export function computeBlockMetricsUpdate(
  block: BlockRatingSnapshot,
  previous: AttemptDelta | null,
  next: AttemptDelta,
): Record<string, unknown> {
  const update: Record<string, unknown> = { updatedAt: Date.now() };
  const isNew = !previous;

  if (isNew) {
    update.totalAttempts = increment(1);
  }

  // Cambios en el tipo de intento (flash/encadenado/proyecto)
  const prevType = previous?.type;
  const nextType = next.type;
  if (prevType !== nextType) {
    if (prevType) update[COUNT_FIELD[prevType]] = increment(-1);
    if (nextType) update[COUNT_FIELD[nextType]] = increment(1);
  }

  // Cambios en la calificación (estrellas) — mantiene ratingSum/ratingCount
  // para poder derivar avgRating sin recontar todos los intentos
  const prevRating = previous?.rating ?? null;
  const nextRating = next.rating ?? null;
  if (prevRating !== nextRating) {
    let ratingSumDelta = 0;
    let ratingCountDelta = 0;
    if (prevRating != null) { ratingSumDelta -= prevRating; ratingCountDelta -= 1; }
    if (nextRating != null) { ratingSumDelta += nextRating; ratingCountDelta += 1; }

    update.ratingSum = increment(ratingSumDelta);
    update.ratingCount = increment(ratingCountDelta);

    const newSum = (block.ratingSum ?? 0) + ratingSumDelta;
    const newCount = (block.ratingCount ?? 0) + ratingCountDelta;
    update.avgRating = newCount > 0 ? Math.round((newSum / newCount) * 10) / 10 : 0;
  }

  return update;
}
