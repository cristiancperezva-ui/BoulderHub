import { Link } from 'react-router-dom';
import { Medal, Plus, Star } from 'lucide-react';

export function ClimberChallengesView() {
  // TODO: Fetch from Firestore
  const challenges: { id: string; name: string; creatorName: string; blocks: unknown[]; avgRating: number; totalResults: number }[] = [];

  return (
    <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0, color: 'var(--color-text-primary)' }}>
          Retos
        </h1>
        <Link
          to="/climber/challenges/create"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.625rem 1.25rem',
            background: 'var(--color-accent-primary)',
            color: 'var(--color-text-inverse)',
            borderRadius: '0.5rem',
            fontWeight: 600,
            textDecoration: 'none',
            fontSize: '0.875rem',
          }}
        >
          <Plus size={18} /> Crear reto
        </Link>
      </div>

      {challenges.length === 0 ? (
        <div style={{
          background: 'var(--color-bg-surface)',
          border: '1px solid var(--color-border-subtle)',
          borderRadius: '0.75rem',
          padding: '3rem 2rem',
          textAlign: 'center',
        }}>
          <Medal size={48} style={{ margin: '0 auto 1rem', opacity: 0.4, color: 'var(--color-text-muted)' }} />
          <p style={{ color: 'var(--color-text-secondary)', marginBottom: '0.5rem' }}>
            Aún no hay retos creados
          </p>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
            ¡Sé el primero en crear un reto! Arma un pack de bloques y desafía a otros escaladores.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {challenges.map((ch) => (
            <Link key={ch.id} to={`/climber/challenges/${ch.id}`} style={{ textDecoration: 'none' }}>
              <div style={{
                background: 'var(--color-bg-surface)',
                border: '1px solid var(--color-border-subtle)',
                borderRadius: '0.75rem',
                padding: '1.25rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}>
                <div>
                  <h3 style={{ color: 'var(--color-text-primary)', fontWeight: 600, margin: '0 0 0.25rem', fontSize: '1rem' }}>
                    {ch.name}
                  </h3>
                  <p style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem', margin: 0 }}>
                    Por {ch.creatorName} · {ch.blocks?.length ?? 0} bloques · {ch.totalResults} resultados
                  </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', color: 'var(--color-accent-tertiary)' }}>
                  <Star size={16} fill="var(--color-accent-tertiary)" />
                  <span style={{ fontWeight: 600 }}>{ch.avgRating.toFixed(1)}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
