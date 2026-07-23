import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { getAllDocs } from '@/lib/firestore';
import type { Block, FirestoreDoc } from '@/types';
import { Mountain, Star, Eye, TrendingUp } from 'lucide-react';

export function RouteSetterDashboardView() {
  const { user, profile } = useAuth();
  const [blocks, setBlocks] = useState<FirestoreDoc<Block>[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAllDocs<Block>('blocks', 'createdAt').then(setBlocks).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const myBlocks = blocks.filter(b => b.routeSetterId === user?.uid);
  const totalAttempts = myBlocks.reduce((s, b) => s + (b.totalAttempts ?? 0), 0);
  const avgRating = myBlocks.length > 0
    ? myBlocks.reduce((s, b) => s + (b.avgRating ?? 0), 0) / myBlocks.length
    : 0;

  const stats = [
    { icon: Mountain, label: 'Mis bloques', value: String(myBlocks.length), color: 'var(--color-accent-primary)' },
    { icon: Star, label: 'Rating promedio', value: avgRating > 0 ? avgRating.toFixed(1) : '—', color: 'var(--color-accent-tertiary)' },
    { icon: Eye, label: 'Intentos recibidos', value: String(totalAttempts), color: 'var(--color-state-info)' },
    { icon: TrendingUp, label: 'Bloques activos', value: String(myBlocks.filter(b => b.active !== false).length), color: 'var(--color-state-success)' },
  ];

  if (loading) return <p style={{ color: 'var(--color-text-muted)', padding: '2rem', textAlign: 'center' }}>Cargando...</p>;

  return (
    <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0 0 0.25rem', color: 'var(--color-text-primary)' }}>
          Panel de RouteSetter
        </h1>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', margin: 0 }}>
          Bienvenido, {profile?.displayName ?? 'RouteSetter'} — {myBlocks.length} bloque{myBlocks.length !== 1 ? 's' : ''} publicado{myBlocks.length !== 1 ? 's' : ''}
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        {stats.map(({ icon: Icon, label, value, color }) => (
          <div key={label} style={{
            background: 'var(--color-bg-surface)', border: '1px solid var(--color-border-subtle)',
            borderRadius: '0.75rem', padding: '1.25rem', textAlign: 'center',
          }}>
            <Icon size={24} style={{ color, margin: '0 auto 0.5rem' }} />
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>{value}</div>
            <div style={{ color: 'var(--color-text-secondary)', fontSize: '0.8rem' }}>{label}</div>
          </div>
        ))}
      </div>

      {myBlocks.length === 0 && (
        <div style={{
          background: 'var(--color-bg-surface)', border: '1px solid var(--color-border-subtle)',
          borderRadius: '0.75rem', padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)',
        }}>
          <p>Sube tu primer bloque usando <strong>"Nuevo Bloque"</strong> en el menú lateral.</p>
        </div>
      )}
    </div>
  );
}
