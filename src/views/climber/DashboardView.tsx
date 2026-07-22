import { useAuth } from '@/hooks/useAuth';
import { Mountain, Medal, BarChart3, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';

export function ClimberDashboardView() {
  const { profile } = useAuth();

  const quickLinks = [
    { to: '/climber/blocks', icon: Mountain, label: 'Ver Bloques', desc: 'Explora los bloques del gimnasio' },
    { to: '/climber/challenges', icon: Medal, label: 'Retos', desc: 'Desafía a otros escaladores' },
    { to: '/climber/metrics', icon: BarChart3, label: 'Mis Métricas', desc: 'Analiza tu progreso' },
  ];

  return (
    <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0 0 0.25rem', color: 'var(--color-text-primary)' }}>
          {profile?.emoji ?? '🧗'} ¡Bienvenido, {profile?.displayName ?? 'Escalador'}!
        </h1>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', margin: 0 }}>
          BoulderHub — Comunidad de Escalada
        </p>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '1rem',
        marginBottom: '2rem',
      }}>
        {quickLinks.map(({ to, icon: Icon, label, desc }) => (
          <Link key={to} to={to} style={{ textDecoration: 'none' }}>
            <div style={{
              background: 'var(--color-bg-surface)',
              border: '1px solid var(--color-border-subtle)',
              borderRadius: '0.75rem',
              padding: '1.5rem',
              textAlign: 'center',
              transition: 'border-color 0.2s, transform 0.2s',
              cursor: 'pointer',
            }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--color-accent-primary)';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--color-border-subtle)';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <Icon size={32} style={{ color: 'var(--color-accent-primary)', margin: '0 auto 0.75rem' }} />
              <div style={{ color: 'var(--color-text-primary)', fontWeight: 600, marginBottom: '0.25rem' }}>
                {label}
              </div>
              <div style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>
                {desc}
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div style={{
        background: 'linear-gradient(135deg, var(--color-bg-surface), var(--color-bg-elevated))',
        border: '1px solid var(--color-border-subtle)',
        borderRadius: '0.75rem',
        padding: '1.5rem',
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
      }}>
        <TrendingUp size={32} style={{ color: 'var(--color-accent-secondary)', flexShrink: 0 }} />
        <div>
          <p style={{ color: 'var(--color-text-primary)', fontWeight: 500, margin: '0 0 0.25rem' }}>
            ¡Comienza a escalar!
          </p>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', margin: 0 }}>
            Marca tus primeros bloques para ver estadísticas y progreso en "Mis Métricas".
          </p>
        </div>
      </div>
    </div>
  );
}
