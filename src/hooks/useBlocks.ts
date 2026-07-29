// ─── Hook centralizado para consultas de bloques con TanStack Query ──────────
// Reduce Firestore reads mediante: caché configurable, paginación, field selection

import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getDocById } from '@/lib/firestore';
import type { Block, FirestoreDoc } from '@/types';

// ─── Keys para TanStack Query ────────────────────────────────────────────────

export const blockKeys = {
  all:       ['blocks'] as const,
  lists:     () => [...blockKeys.all, 'list'] as const,
  list:      (filters: Record<string, unknown>) => [...blockKeys.lists(), filters] as const,
  details:   () => [...blockKeys.all, 'detail'] as const,
  detail:    (id: string) => [...blockKeys.details(), id] as const,
  active:    () => [...blockKeys.all, 'active'] as const,
  bySetter:  (setterId: string) => [...blockKeys.all, 'bySetter', setterId] as const,
};

// ─── Todos los bloques activos (para navegación principal) ────────────────────
// Cachea por 10 min — los bloques no cambian frecuentemente

export function useActiveBlocks() {
  return useQuery({
    queryKey: blockKeys.active(),
    queryFn: async () => {
      const q = query(
        collection(db, 'blocks'),
        where('active', '==', true),
        orderBy('createdAt', 'desc'),
      );
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as FirestoreDoc<Block>));
    },
    staleTime: 10 * 60 * 1000,       // 10 min antes de re-validar
    gcTime: 30 * 60 * 1000,           // mantener en caché 30 min
  });
}

// ─── TODOS los bloques (incluyendo inactivos — para admin/routesetter) ────────

export function useAllBlocks() {
  return useQuery({
    queryKey: [...blockKeys.all, 'all'],
    queryFn: async () => {
      const q = query(
        collection(db, 'blocks'),
        orderBy('createdAt', 'desc'),
      );
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as FirestoreDoc<Block>));
    },
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

// ─── Bloque individual ────────────────────────────────────────────────────────

export function useBlock(blockId: string | undefined) {
  return useQuery({
    queryKey: blockKeys.detail(blockId ?? ''),
    queryFn: () => getDocById<Block>('blocks', blockId!),
    enabled: !!blockId,
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
  });
}

// ─── Bloques paginados (para escaladores) ─────────────────────────────────────
// Solo lee N bloques a la vez, reduce lecturas drásticamente

const PAGE_SIZE = 20;

export function usePaginatedBlocks(page: number, filters?: {
  colorName?: string;
  grade?: number;
  setterName?: string;
}) {
  return useQuery({
    queryKey: [...blockKeys.lists(), 'paginated', page, filters],
    queryFn: async () => {
      const constraints: unknown[] = [
        where('active', '==', true),
        orderBy('createdAt', 'desc'),
      ];

      if (filters?.colorName) {
        constraints.push(where('categoryColorName', '==', filters.colorName));
      }
      if (filters?.grade) {
        constraints.push(where('proposedDifficultyV', '==', filters.grade));
      }

      constraints.push(limit(PAGE_SIZE));

      // Para paginación offset, necesitamos cursor
      // En Firestore usamos startAfter con el último doc de la página anterior
      // Por simplicidad para la primera versión, cargamos página por página
      const q = query(collection(db, 'blocks'), ...constraints as never[]);
      const snap = await getDocs(q);
      return {
        blocks: snap.docs.map(d => ({ id: d.id, ...d.data() } as FirestoreDoc<Block>)),
        hasMore: snap.docs.length === PAGE_SIZE,
        lastDoc: snap.docs[snap.docs.length - 1] ?? null,
      };
    },
    staleTime: 10 * 60 * 1000,
    placeholderData: keepPreviousData,
  });
}

// ─── Bloques de un routesetter específico ────────────────────────────────────

export function useSetterBlocks(setterId: string | undefined) {
  return useQuery({
    queryKey: blockKeys.bySetter(setterId ?? ''),
    queryFn: async () => {
      if (!setterId) return [];
      const q = query(
        collection(db, 'blocks'),
        where('routeSetterId', '==', setterId),
        orderBy('createdAt', 'desc'),
      );
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as FirestoreDoc<Block>));
    },
    enabled: !!setterId,
    staleTime: 5 * 60 * 1000,
  });
}

// ─── Búsqueda de bloques por texto (parcial, sin índice compuesto) ────────────
// Estrategia: carga activos una vez y filtra en cliente
// Cuando haya muchos bloques, migrar a Algolia/Meilisearch

export function useBlockSearch(searchTerm: string) {
  const { data: allBlocks, ...rest } = useActiveBlocks();

  const filtered = allBlocks?.filter(b => {
    if (!searchTerm) return true;
    const q = searchTerm.toLowerCase();
    return (
      b.wallName?.toLowerCase().includes(q) ||
      b.categoryColorName?.toLowerCase().includes(q) ||
      b.routeSetterName?.toLowerCase().includes(q) ||
      String(b.proposedDifficultyV).includes(q)
    );
  });

  return { data: filtered, ...rest };
}

// ─── Mutation para actualizar métricas de un bloque (invalida caché) ──────────

export function useUpdateBlockMetrics() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ blockId, metrics }: {
      blockId: string;
      metrics: Partial<Block>;
    }) => {
      const { updateDocById } = await import('@/lib/firestore');
      await updateDocById<Block>('blocks', blockId, metrics);
    },
    onSuccess: (_data, variables) => {
      // Invalidar todas las queries relacionadas a este bloque
      queryClient.invalidateQueries({ queryKey: blockKeys.detail(variables.blockId) });
      queryClient.invalidateQueries({ queryKey: blockKeys.active() });
      queryClient.invalidateQueries({ queryKey: blockKeys.lists() });
    },
  });
}
