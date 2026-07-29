// ─── Datos estáticos con caché muy agresiva ──────────────────────────────────
// Walls y colorCategories cambian raramente → staleTime de 30 min

import { useQuery } from '@tanstack/react-query';
import { getAllDocs } from '@/lib/firestore';
import type { Wall, ColorCategory, UserProfile } from '@/types';

// ─── Keys ────────────────────────────────────────────────────────────────────

export const staticKeys = {
  walls:           ['walls'] as const,
  colorCategories: ['colorCategories'] as const,
  routesetters:    ['routesetters'] as const,
};

// ─── Muros ───────────────────────────────────────────────────────────────────

export function useWalls() {
  return useQuery({
    queryKey: staticKeys.walls,
    queryFn: async () => {
      const data = await getAllDocs<Wall>('walls', 'name');
      return data.filter(w => w.active !== false);
    },
    staleTime: 30 * 60 * 1000,      // 30 min
    gcTime: 60 * 60 * 1000,          // 1 hora en caché
  });
}

// ─── Categorías de color ─────────────────────────────────────────────────────

export function useColorCategories() {
  return useQuery({
    queryKey: staticKeys.colorCategories,
    queryFn: () => getAllDocs<ColorCategory>('colorCategories', 'order'),
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  });
}

// ─── Routesetters (se usa en CreateBlockView) ────────────────────────────────

export function useRouteSetters() {
  return useQuery({
    queryKey: staticKeys.routesetters,
    queryFn: async () => {
      const users = await getAllDocs<UserProfile>('users');
      return users.filter(u => u.roles?.includes('routesetter'));
    },
    staleTime: 10 * 60 * 1000,     // 10 min — los roles pueden cambiar
    gcTime: 30 * 60 * 1000,
  });
}
