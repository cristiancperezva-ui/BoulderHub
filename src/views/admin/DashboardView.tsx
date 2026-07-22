import { useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';

export function AdminDashboardView() {
  const { profile } = useAuth();

  const stats = useMemo(() => [
    { label: 'Muros activos', value: '—' },
    { label: 'Bloques totales', value: '—' },
    { label: 'Escaladores registrados', value: '—' },
    { label: 'Retos creados', value: '—' },
  ], []);

  return (
    <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0 0 0.25rem', color: 'var(--color-text-primary)' }}>
          Panel de Administración
        </h1>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', margin: 0 }}>
          Bienvenido, {profile?.displayName ?? 'Admin'} — Resumen general de BoulderHub
        </p>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '1rem',
        marginBottom: '2rem',
      }}>
        {stats.map((stat) => (
          <div key={stat.label} style={{
            background: 'var(--color-bg-surface)',
            border: '1px solid var(--color-border-subtle)',
            borderRadius: '0.75rem',
            padding: '1.5rem',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--color-accent-primary)', marginBottom: '0.25rem' }}>
              {stat.value}
            </div>
            <div style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>
              {stat.label}
            </div>
          </div>
        ))}
      </div>

      <div style={{
        background: 'var(--color-bg-surface)',
        border: '1px solid var(--color-border-subtle)',
        borderRadius: '0.75rem',
        padding: '2rem',
        textAlign: 'center',
        color: 'var(--color-text-muted)',
      }}>
        <p>Configura muros, categorías y usuarios desde el menú lateral.</p>
        <p style={{ fontSize: '0.875rem' }}>Los datos se cargarán automáticamente al conectar Firebase.</p>
      </div>
    </div>
  );
}
