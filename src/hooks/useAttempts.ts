// ─── Hook centralizado para consultas de intentos con TanStack Query ─────────
// Cache agresiva + localStorage para reducir lecturas a Firestore

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { collectionGroup, query, where, getDocs, setDoc, doc, collection } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getSubDocs, setSubDoc } from '@/lib/firestore';
import { useAuth } from '@/hooks/useAuth';
import type { Attempt } from '@/types';

// ─── Keys ────────────────────────────────────────────────────────────────────

export const attemptKeys = {
  all:          ['attempts'] as const,
  byBlock:      (blockId: string) => [...attemptKeys.all, 'block', blockId] as const,
  byUser:       (userId: string) => [...attemptKeys.all, 'user', userId] as const,
  userBlock:    (userId: string, blockId: string) =>
    [...attemptKeys.all, 'user', userId, 'block', blockId] as const,
};

// ─── Todos los intentos de un bloque (para BlockDetailView) ───────────────────

export function useBlockAttempts(blockId: string | undefined) {
  return useQuery({
    queryKey: attemptKeys.byBlock(blockId ?? ''),
    queryFn: () => getSubDocs<Attempt>('blocks', blockId!, 'attempts', 'createdAt'),
    enabled: !!blockId,
    staleTime: 2 * 60 * 1000,       // 2 min — los intentos cambian con frecuencia
    gcTime: 10 * 60 * 1000,
  });
}

// ─── Todos los intentos del usuario actual ────────────────────────────────────
// Usa collectionGroup (1 sola lectura) + caché en localStorage
// Estrategia: cache agresiva para evitar re-leer en cada navegación

const ATTEMPTS_CACHE_KEY = 'boulderhub_my_attempts_cache';
const ATTEMPTS_CACHE_DURATION = 5 * 60 * 1000; // 5 min

interface AttemptsCache {
  timestamp: number;
  userId: string;
  data: [string, Attempt][]; // blockId -> Attempt como array de tuplas para serialización
}

function getCachedAttempts(userId: string): Map<string, Attempt> | null {
  try {
    const raw = localStorage.getItem(ATTEMPTS_CACHE_KEY);
    if (!raw) return null;
    const cache: AttemptsCache = JSON.parse(raw);
    if (cache.userId !== userId) return null;
    if (Date.now() - cache.timestamp > ATTEMPTS_CACHE_DURATION) return null;
    return new Map(cache.data);
  } catch {
    return null;
  }
}

function setCachedAttempts(userId: string, data: Map<string, Attempt>) {
  try {
    const cache: AttemptsCache = {
      timestamp: Date.now(),
      userId,
      data: [...data.entries()],
    };
    localStorage.setItem(ATTEMPTS_CACHE_KEY, JSON.stringify(cache));
  } catch {
    // localStorage lleno, ignorar silenciosamente
  }
}

export function useMyAttempts() {
  const { user } = useAuth();

  return useQuery({
    queryKey: attemptKeys.byUser(user?.uid ?? ''),
    queryFn: async (): Promise<Map<string, Attempt>> => {
      if (!user) return new Map();

      // 1. Intentar leer de localStorage primero
      const cached = getCachedAttempts(user.uid);
      if (cached) return cached;

      // 2. Leer de Firestore desde users/{userId}/attempts (no necesita índice)
      const map = new Map<string, Attempt>();
      try {
        const snap = await getDocs(collection(db, 'users', user.uid, 'attempts'));
        snap.forEach(d => {
          map.set(d.id, d.data() as Attempt);
        });
      } catch (e) {
        console.warn('Error al leer intentos del usuario:', e);
        // Fallback: intentar via collectionGroup por si el índice ya existe
        try {
          const q = query(
            collectionGroup(db, 'attempts'),
            where('userId', '==', user.uid),
          );
          const snap = await getDocs(q);
          snap.docs.forEach(doc => {
            const segments = doc.ref.path.split('/');
            const blockId = segments[segments.length - 3];
            map.set(blockId, doc.data() as Attempt);
          });
        } catch { /* ignorar */ }
      }

      // 3. Guardar en localStorage
      setCachedAttempts(user.uid, map);
      return map;
    },
    enabled: !!user,
    staleTime: ATTEMPTS_CACHE_DURATION,
    gcTime: 30 * 60 * 1000,
  });
}

// ─── Mutation para guardar/actualizar intento ─────────────────────────────────
// Invalida todas las queries relacionadas + limpia caché localStorage

export function useSaveAttempt() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      blockId,
      attempt,
    }: {
      blockId: string;
      attempt: Partial<Attempt>;
    }) => {
      if (!user) throw new Error('No autenticado');
      // Escribir en ambos lugares para redundancia:
      // 1. Subcolección del bloque (para BlockDetailView)
      await setSubDoc<Attempt>('blocks', blockId, 'attempts', user.uid, attempt);
      // 2. Subcolección del usuario (para métricas y filtros, sin collectionGroup)
      await setDoc(doc(db, 'users', user.uid, 'attempts', blockId), {
        ...attempt,
        updatedAt: Date.now(),
      });
    },
    onSuccess: (_data, variables) => {
      // Invalidar queries de intentos
      queryClient.invalidateQueries({ queryKey: attemptKeys.byBlock(variables.blockId) });
      queryClient.invalidateQueries({ queryKey: attemptKeys.byUser(user?.uid ?? '') });
      queryClient.invalidateQueries({ queryKey: attemptKeys.userBlock(user?.uid ?? '', variables.blockId) });

      // Limpiar localStorage cache
      localStorage.removeItem(ATTEMPTS_CACHE_KEY);

      // También invalidar stats globales (cambia conteo de intentos)
      queryClient.invalidateQueries({ queryKey: ['globalStats'] });
    },
  });
}
