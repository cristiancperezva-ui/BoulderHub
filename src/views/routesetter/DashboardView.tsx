import { useAuth } from '@/hooks/useAuth';
import { Mountain, Star, Eye } from 'lucide-react';

export function RouteSetterDashboardView() {
  const { profile } = useAuth();

  const stats = [
    { icon: Mountain, label: 'Bloques subidos', value: '0' },
    { icon: Star, label: 'Rating promedio', value: '—' },
    { icon: Eye, label: 'Intentos recibidos', value: '0' },
  ];

  return (
    <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0 0 0.25rem', color: 'var(--color-text-primary)' }}>
          Panel de Ruteador
        </h1>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', margin: 0 }}>
          Bienvenido, {profile?.displayName ?? 'Ruteador'}
        </p>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
        gap: '1rem',
        marginBottom: '2rem',
      }}>
        {stats.map(({ icon: Icon, label, value }) => (
          <div key={label} style={{
            background: 'var(--color-bg-surface)',
            border: '1px solid var(--color-border-subtle)',
            borderRadius: '0.75rem',
            padding: '1.25rem',
            textAlign: 'center',
          }}>
            <Icon size={24} style={{ color: 'var(--color-accent-primary)', margin: '0 auto 0.5rem' }} />
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
              {value}
            </div>
            <div style={{ color: 'var(--color-text-secondary)', fontSize: '0.8rem' }}>
              {label}
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
        <p>Sube tu primer bloque usando <strong>"Nuevo Bloque"</strong> en el menú lateral.</p>
      </div>
    </div>
  );
}
