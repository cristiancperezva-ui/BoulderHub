import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Star } from 'lucide-react';
import { useState } from 'react';

export function ClimberBlockDetailView() {
  const { blockId } = useParams();
  const [attemptType, setAttemptType] = useState<'flash' | 'encadenado' | 'proyecto' | null>(null);
  const [attemptsRange, setAttemptsRange] = useState<string>('');
  const [rating, setRating] = useState(0);

  return (
    <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
      <Link to="/climber/blocks" style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.375rem',
        color: 'var(--color-text-secondary)',
        fontSize: '0.875rem',
        marginBottom: '1rem',
        textDecoration: 'none',
      }}>
        <ArrowLeft size={16} /> Volver a bloques
      </Link>

      <div style={{
        background: 'var(--color-bg-surface)',
        border: '1px solid var(--color-border-subtle)',
        borderRadius: '0.75rem',
        overflow: 'hidden',
      }}>
        {/* Foto */}
        <div style={{
          height: 300,
          background: 'var(--color-bg-elevated)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--color-text-muted)',
        }}>
          Bloque #{blockId?.slice(0, 8)}
        </div>

        <div style={{ padding: '1.5rem' }}>
          {/* Info */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1.5rem' }}>
            <div>
              <h2 style={{ color: 'var(--color-text-primary)', fontSize: '1.25rem', fontWeight: 600, margin: '0 0 0.25rem' }}>
                Detalle del Bloque
              </h2>
              <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', margin: 0 }}>
                Muro Principal · Categoría · Ruteador
              </p>
            </div>
            <div style={{
              fontSize: '1.5rem',
              fontWeight: 700,
              color: 'var(--color-accent-primary)',
              background: 'rgba(232,125,62,0.1)',
              padding: '0.375rem 0.75rem',
              borderRadius: '0.5rem',
            }}>
              V6
            </div>
          </div>

          {/* Marcar intento */}
          <div style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.75rem' }}>
              Marcar intento
            </h3>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
              {(['flash', 'encadenado', 'proyecto'] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setAttemptType(type)}
                  style={{
                    padding: '0.625rem 1.25rem',
                    background: attemptType === type ? 'var(--color-accent-primary)' : 'var(--color-bg-base)',
                    color: attemptType === type ? 'var(--color-text-inverse)' : 'var(--color-text-secondary)',
                    border: `1px solid ${attemptType === type ? 'var(--color-accent-primary)' : 'var(--color-border-default)'}`,
                    borderRadius: '999px',
                    cursor: 'pointer',
                    fontWeight: 600,
                    fontSize: '0.85rem',
                  }}
                >
                  {type === 'flash' ? 'Flash ✅' : type === 'encadenado' ? 'Encadenado 🧗' : 'Proyecto 🎯'}
                </button>
              ))}
            </div>

            {attemptType === 'encadenado' && (
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ color: 'var(--color-text-secondary)', fontSize: '0.8rem', display: 'block', marginBottom: '0.375rem' }}>
                  ¿En cuántos intentos?
                </label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {(['2-5', '5-10', '10+'] as const).map((range) => (
                    <button
                      key={range}
                      onClick={() => setAttemptsRange(range)}
                      style={{
                        padding: '0.5rem 1rem',
                        background: attemptsRange === range ? 'var(--color-accent-tertiary)' : 'var(--color-bg-base)',
                        color: attemptsRange === range ? 'var(--color-text-inverse)' : 'var(--color-text-secondary)',
                        border: `1px solid ${attemptsRange === range ? 'var(--color-accent-tertiary)' : 'var(--color-border-default)'}`,
                        borderRadius: '0.5rem',
                        cursor: 'pointer',
                        fontWeight: 500,
                        fontSize: '0.85rem',
                      }}
                    >
                      {range} intentos
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Calificación */}
            <div>
              <label style={{ color: 'var(--color-text-secondary)', fontSize: '0.8rem', display: 'block', marginBottom: '0.375rem' }}>
                ¿Qué tal el bloque?
              </label>
              <div style={{ display: 'flex', gap: '0.25rem' }}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setRating(star)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '0.25rem',
                    }}
                  >
                    <Star
                      size={28}
                      fill={star <= rating ? 'var(--color-accent-tertiary)' : 'none'}
                      color={star <= rating ? 'var(--color-accent-tertiary)' : 'var(--color-text-muted)'}
                    />
                  </button>
                ))}
              </div>
            </div>

            <button
              disabled={!attemptType}
              style={{
                marginTop: '1rem',
                width: '100%',
                padding: '0.75rem',
                background: attemptType ? 'var(--color-accent-secondary)' : 'var(--color-bg-hover)',
                color: attemptType ? 'var(--color-text-inverse)' : 'var(--color-text-muted)',
                border: 'none',
                borderRadius: '0.5rem',
                fontWeight: 600,
                cursor: attemptType ? 'pointer' : 'not-allowed',
                fontSize: '0.95rem',
              }}
            >
              Guardar intento
            </button>
          </div>

          {/* Intentos de otros */}
          <div>
            <h3 style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.75rem' }}>
              Intentos de otros escaladores
            </h3>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', textAlign: 'center', padding: '1rem' }}>
              Aún no hay intentos registrados. ¡Sé el primero!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
