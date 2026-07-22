import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Medal } from 'lucide-react';

export function ClimberChallengeDetailView() {
  const { challengeId } = useParams();

  return (
    <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
      <Link to="/climber/challenges" style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.375rem',
        color: 'var(--color-text-secondary)',
        fontSize: '0.875rem',
        marginBottom: '1rem',
        textDecoration: 'none',
      }}>
        <ArrowLeft size={16} /> Volver a retos
      </Link>

      <div style={{
        background: 'var(--color-bg-surface)',
        border: '1px solid var(--color-border-subtle)',
        borderRadius: '0.75rem',
        padding: '1.5rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
          <Medal size={28} style={{ color: 'var(--color-accent-primary)' }} />
          <div>
            <h2 style={{ color: 'var(--color-text-primary)', fontWeight: 600, margin: '0 0 0.125rem', fontSize: '1.125rem' }}>
              Reto #{challengeId?.slice(0, 8)}
            </h2>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem', margin: 0 }}>
              Creado por ... · 0 resultados
            </p>
          </div>
        </div>

        <p style={{ color: 'var(--color-text-secondary)', lineHeight: 1.6, marginBottom: '1.5rem' }}>
          Descripción del reto pendiente. Los bloques y el leaderboard se cargarán desde Firestore.
        </p>

        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-muted)' }}>
          <p>Los detalles del reto se conectarán cuando implementemos Firestore.</p>
        </div>
      </div>
    </div>
  );
}
