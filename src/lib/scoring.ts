// ─── Sistema de Puntuación de Retos ───────────────────────────────────────────

import type { AttemptType, AttemptsRange } from '@/types';

/**
 * Calcula los puntos obtenidos por un escalador en un bloque.
 *
 * Flash = 100pts
 * Encadenado (2-5 intentos) = 70pts
 * Encadenado (5-10 intentos) = 50pts
 * Encadenado (10+ intentos) = 30pts
 * Proyecto = 10pts
 */
export function scoreForAttempt(type: AttemptType, attemptsRange: AttemptsRange | null): number {
  if (type === 'flash') return 100;
  if (type === 'proyecto') return 10;
  if (type === 'encadenado') {
    switch (attemptsRange) {
      case '2-5': return 70;
      case '5-10': return 50;
      case '10+': return 30;
      default: return 50;
    }
  }
  return 0;
}

/**
 * Calcula el puntaje total de un reto.
 * @param blocksResults Array de resultados por bloque
 */
export function calculateTotalScore(
  blocksResults: { type: AttemptType; attemptsRange: AttemptsRange | null }[],
): number {
  return blocksResults.reduce((total, block) => total + scoreForAttempt(block.type, block.attemptsRange), 0);
}
