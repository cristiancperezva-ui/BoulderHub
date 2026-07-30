import { useAuth } from '@/hooks/useAuth';
import { useGlobalStats } from '@/hooks/useGlobalStats';
import { useActiveBlocks } from '@/hooks/useBlocks';
import { Wallpaper, Mountain, Users, Medal, Star, Activity } from 'lucide-react';

export function AdminDashboardView() {
  const { profile } = useAuth();

  // ✅ 1 lectura a un documento agregado vs 3 lecturas completas
  const { data: stats, isLoading: statsLoading } = useGlobalStats();
  // ✅ Bloques cacheados para el ranking (10 min)
  const { data: blocks = [], isLoading: blocksLoading } = useActiveBlocks();

  const isLoading = statsLoading || blocksLoading;

  // Top routesetter (calculado en cliente desde bloques cacheados)
  const topSetter = blocks.length > 0
    ? blocks.reduce<{ name: string; count: number; totalRating: number }>((best, b) => {
        const name = b.routeSetterName;
        const existing = blocks.filter(x => x.routeSetterName === name);
        const count = existing.length;
        const totalRating = existing.reduce((s, x) => s + (x.avgRating ?? 0), 0);
        if (!best.name || count > best.count) return { name, count, totalRating };
        return best;
      }, { name: '', count: 0, totalRating: 0 })
    : { name: '', count: 0, totalRating: 0 };

  const cards = [
    { icon: Wallpaper, label: 'Muros activos', value: String(stats?.totalWalls ?? '—'), color: 'var(--color-accent-primary)' },
    { icon: Mountain, label: 'Bloques totales', value: String(stats?.totalBlocks ?? '—'), color: 'var(--color-state-info)' },
    { icon: Mountain, label: 'Bloques activos', value: String(stats?.activeBlocks ?? '—'), color: 'var(--color-state-success)' },
    { icon: Users, label: 'Escaladores', value: String(stats?.totalUsers ?? '—'), color: 'var(--color-accent-tertiary)' },
    { icon: Activity, label: 'Intentos totales', value: String(stats?.totalAttempts ?? '—'), color: 'var(--color-state-error)' },
    { icon: Star, label: 'Rating promedio', value: stats?.avgRating && stats.avgRating > 0 ? stats.avgRating.toFixed(1) : '—', color: 'var(--color-accent-tertiary)' },
    { icon: Medal, label: 'Top routesetter', value: topSetter.name || '—', color: 'var(--color-accent-primary)' },
  ];

  if (isLoading) return <p style={{ color: 'var(--color-text-muted)', padding: '2rem', textAlign: 'center' }}>Cargando...</p>;

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
        {cards.map(({ icon: Icon, label, value, color }) => (
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
            🏆 Ranking de routesetters
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
                    <img src="/icons/icon-192x192.png" alt="" style={{ width: 18, height: 18, borderRadius: '0.25rem' }} />
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
