// ─── Estadísticas globales cacheadas ──────────────────────────────────────────
// Elimina el N+1 de Admin Metrics al mantener un documento agregado
// que se actualiza en cada escritura (nuevo bloque, nuevo intento)

import { useQuery } from '@tanstack/react-query';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export interface GlobalStats {
  totalBlocks: number;
  activeBlocks: number;
  totalUsers: number;
  totalAttempts: number;
  avgRating: number;
  routeSetterCount: number;
  climberCount: number;
  totalWalls: number;
  lastUpdated: number;
}

const DEFAULT_STATS: GlobalStats = {
  totalBlocks: 0,
  activeBlocks: 0,
  totalUsers: 0,
  totalAttempts: 0,
  avgRating: 0,
  routeSetterCount: 0,
  climberCount: 0,
  totalWalls: 0,
  lastUpdated: 0,
};

export const globalStatsKeys = {
  all: ['globalStats'] as const,
};

export function useGlobalStats() {
  return useQuery({
    queryKey: globalStatsKeys.all,
    queryFn: async (): Promise<GlobalStats> => {
      try {
        const snap = await getDoc(doc(db, 'config', 'globalStats'));
        if (snap.exists()) {
          return snap.data() as GlobalStats;
        }
      } catch {
        // Si el documento no existe, calcular desde cero (fallback)
      }
      return computeGlobalStats();
    },
    staleTime: 5 * 60 * 1000,    // 5 min
    gcTime: 30 * 60 * 1000,
  });
}

// ─── Fallback: calcular stats desde las colecciones ───────────────────────────

async function computeGlobalStats(): Promise<GlobalStats> {
  const { getAllDocs } = await import('@/lib/firestore');

  try {
    const allBlocks = await getAllDocs<{ active: boolean; avgRating: number; totalAttempts: number }>('blocks');
    const allUsers = await getAllDocs<{ roles: string[] }>('users');

    const activeBlocks = allBlocks.filter(b => b.active !== false);
    const totalAttempts = allBlocks.reduce((s, b) => s + (b.totalAttempts ?? 0), 0);
    const avgRating = allBlocks.length > 0
      ? allBlocks.reduce((s, b) => s + (b.avgRating ?? 0), 0) / allBlocks.length
      : 0;

    // Contar walls activos
    const walls = await getAllDocs<{ active: boolean }>('walls');
    const activeWalls = walls.filter(w => w.active !== false).length;

    return {
      totalBlocks: allBlocks.length,
      activeBlocks: activeBlocks.length,
      totalUsers: allUsers.length,
      totalAttempts,
      avgRating: Math.round(avgRating * 10) / 10,
      routeSetterCount: allUsers.filter(u => u.roles?.includes('routesetter')).length,
      climberCount: allUsers.filter(u => u.roles?.includes('climber')).length,
      totalWalls: activeWalls,
      lastUpdated: Date.now(),
    };
  } catch {
    return DEFAULT_STATS;
  }
}
