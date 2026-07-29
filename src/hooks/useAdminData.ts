// ─── Hooks para datos de administración (usuarios, muros) ───────────────────
// Caché de 5 min — datos admin que cambian ocasionalmente

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getAllDocs, createDoc, updateDocById } from '@/lib/firestore';
import type { UserProfile, Wall } from '@/types';

// ─── Keys ────────────────────────────────────────────────────────────────────

export const adminKeys = {
  users: ['admin', 'users'] as const,
  walls: ['admin', 'walls'] as const,
};

// ─── Usuarios ────────────────────────────────────────────────────────────────

export function useAdminUsers() {
  return useQuery({
    queryKey: adminKeys.users,
    queryFn: () => getAllDocs<UserProfile>('users', 'createdAt'),
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
  });
}

export function useToggleUserRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ uid, roles }: { uid: string; roles: string[] }) => {
      await updateDocById<Partial<UserProfile>>('users', uid, { roles: roles as any });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.users });
      queryClient.invalidateQueries({ queryKey: ['globalStats'] });
    },
  });
}

// ─── Muros ───────────────────────────────────────────────────────────────────

export function useAdminWalls() {
  return useQuery({
    queryKey: adminKeys.walls,
    queryFn: async () => {
      const data = await getAllDocs<Wall>('walls', 'createdAt');
      return data.filter(w => w.active !== false);
    },
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

export function useCreateWall() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (name: string) => {
      await createDoc<Wall>('walls', {
        name,
        active: true,
        createdBy: 'admin',
      } as Partial<Wall>);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.walls });
      queryClient.invalidateQueries({ queryKey: ['globalStats'] });
    },
  });
}

export function useUpdateWall() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      await updateDocById<Wall>('walls', id, { name } as Partial<Wall>);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.walls });
    },
  });
}

export function useDeactivateWall() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await updateDocById<Wall>('walls', id, { active: false } as Partial<Wall>);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.walls });
      queryClient.invalidateQueries({ queryKey: ['globalStats'] });
    },
  });
}
