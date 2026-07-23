import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { getAllDocs } from '@/lib/firestore';
import type { Block, UserProfile, FirestoreDoc } from '@/types';
import { Wallpaper, Mountain, Users, Medal, Star, Activity } from 'lucide-react';

export function AdminDashboardView() {
  const { profile } = useAuth();
  const [walls, setWalls] = useState<FirestoreDoc<{ name: string; active: boolean }>[]>([]);
  const [blocks, setBlocks] = useState<FirestoreDoc<Block>[]>([]);
  const [users, setUsers] = useState<FirestoreDoc<UserProfile>[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getAllDocs<{ name: string; active: boolean }>('walls'),
      getAllDocs<Block>('blocks'),
      getAllDocs<UserProfile>('users'),
    ]).then(([w, b, u]) => {
      setWalls(w.filter(x => x.active !== false));
      setBlocks(b);
      setUsers(u);
    }).catch(() => {})
    .finally(() => setLoading(false));
  }, []);

  const activeBlocks = blocks.filter(b => b.active !== false);
  const totalAttempts = blocks.reduce((s, b) => s + (b.totalAttempts ?? 0), 0);
  const avgRating = blocks.length > 0
    ? blocks.reduce((s, b) => s + (b.avgRating ?? 0), 0) / blocks.length
    : 0;
  const topSetter = blocks.reduce<{ name: string; count: number; avg: number }>((best, b) => {
    const key = b.routeSetterName;
    if (!best || !best.name) return { name: key, count: 1, avg: b.avgRating ?? 0 };
    return { name: key, count: best.count + 1, avg: (best.avg + (b.avgRating ?? 0)) / 2 };
  }, { name: '', count: 0, avg: 0 });

  const stats = [
    { icon: Wallpaper, label: 'Muros activos', value: String(walls.length), color: 'var(--color-accent-primary)' },
    { icon: Mountain, label: 'Bloques totales', value: String(blocks.length), color: 'var(--color-state-info)' },
    { icon: Mountain, label: 'Bloques activos', value: String(activeBlocks.length), color: 'var(--color-state-success)' },
    { icon: Users, label: 'Escaladores', value: String(users.length), color: 'var(--color-accent-tertiary)' },
    { icon: Activity, label: 'Intentos totales', value: String(totalAttempts), color: 'var(--color-state-error)' },
    { icon: Star, label: 'Rating promedio', value: avgRating > 0 ? avgRating.toFixed(1) : '—', color: 'var(--color-accent-tertiary)' },
    { icon: Medal, label: 'Top ruteador', value: topSetter.name || '—', color: 'var(--color-accent-primary)' },
  ];

  if (loading) return <p style={{ color: 'var(--color-text-muted)', padding: '2rem', textAlign: 'center' }}>Cargando...</p>;

  return (
    <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0 0 0.25rem', color: 'var(--color-text-primary)' }}>
          Panel de Administración
        </h1>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', margin: 0 }}>
          Bienvenido, {profile?.displayName ?? 'Admin'} — Datos en tiempo real
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '0.75rem', marginBottom: '2rem' }}>
        {stats.map(({ icon: Icon, label, value, color }) => (
          <div key={label} style={{
            background: 'var(--color-bg-surface)', border: '1px solid var(--color-border-subtle)',
            borderRadius: '0.75rem', padding: '1.25rem', textAlign: 'center',
          }}>
            <Icon size={24} style={{ color, margin: '0 auto 0.5rem' }} />
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>{value}</div>
            <div style={{ color: 'var(--color-text-secondary)', fontSize: '0.75rem', marginTop: '0.125rem' }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Top setters ranking */}
      {blocks.length > 0 && (
        <div style={{
          background: 'var(--color-bg-surface)', border: '1px solid var(--color-border-subtle)',
          borderRadius: '0.75rem', padding: '1.25rem',
        }}>
          <h3 style={{ color: 'var(--color-text-primary)', fontSize: '0.95rem', fontWeight: 600, marginBottom: '0.75rem' }}>
            🏆 Ranking de ruteadores
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {Array.from(new Set(blocks.map(b => b.routeSetterName))).map(name => {
              const setterBlocks = blocks.filter(b => b.routeSetterName === name);
              const avg = setterBlocks.reduce((s, b) => s + (b.avgRating ?? 0), 0) / setterBlocks.length;
              const total = setterBlocks.reduce((s, b) => s + (b.totalAttempts ?? 0), 0);
              return (
                <div key={name} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '0.625rem 0.75rem', background: 'var(--color-bg-base)',
                  borderRadius: '0.5rem', border: '1px solid var(--color-border-subtle)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ color: 'var(--color-accent-primary)', fontWeight: 700 }}>🧗</span>
                    <span style={{ color: 'var(--color-text-primary)', fontWeight: 500, fontSize: '0.9rem' }}>{name}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '1rem', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                    <span>📦 {setterBlocks.length} bloque{setterBlocks.length !== 1 ? 's' : ''}</span>
                    <span>⭐ {avg > 0 ? avg.toFixed(1) : '—'}</span>
                    <span>👀 {total} intento{total !== 1 ? 's' : ''}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
