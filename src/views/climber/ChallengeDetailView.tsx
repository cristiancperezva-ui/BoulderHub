import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Medal, Hammer, Mountain, Star } from 'lucide-react';
import { useState, useEffect } from 'react';
import { getDocById } from '@/lib/firestore';
import type { Challenge, Block, FirestoreDoc } from '@/types';

export function ClimberChallengeDetailView() {
  const { challengeId } = useParams();
  const [challenge, setChallenge] = useState<FirestoreDoc<Challenge> | null>(null);
  const [blocks, setBlocks] = useState<FirestoreDoc<Block>[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!challengeId) return;
    const load = async () => {
      try {
        const ch = await getDocById<Challenge>('challenges', challengeId);
        setChallenge(ch);
        if (ch?.blockIds?.length) {
          const blockPromises = ch.blockIds.map(id => getDocById<Block>('blocks', id));
          const results = await Promise.all(blockPromises);
          setBlocks(results.filter(Boolean) as FirestoreDoc<Block>[]);
        }
      } catch (e) { console.warn(e); }
      finally { setLoading(false); }
    };
    load();
  }, [challengeId]);

  if (loading) return <p style={{ color: 'var(--color-text-muted)', padding: '2rem', textAlign: 'center' }}>Cargando reto...</p>;
  if (!challenge) return <p style={{ color: 'var(--color-text-muted)', padding: '2rem', textAlign: 'center' }}>Reto no encontrado</p>;

  return (
    <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
      <Link to="/climber/challenges" style={{
        display: 'inline-flex', alignItems: 'center', gap: '0.375rem',
        color: 'var(--color-text-secondary)', fontSize: '0.875rem',
        marginBottom: '1rem', textDecoration: 'none',
      }}>
        <ArrowLeft size={16} /> Volver a retos
      </Link>

      <div style={{
        background: 'var(--color-bg-surface)', border: '1px solid var(--color-border-subtle)',
        borderRadius: '0.75rem', padding: '1.5rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
          {challenge.isRouteSetterChallenge ? (
            <Hammer size={28} style={{ color: 'var(--color-accent-primary)' }} />
          ) : (
            <Medal size={28} style={{ color: 'var(--color-accent-primary)' }} />
          )}
          <div>
            <h2 style={{ color: 'var(--color-text-primary)', fontWeight: 600, margin: '0 0 0.125rem', fontSize: '1.125rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {challenge.isRouteSetterChallenge && <Hammer size={16} style={{ color: 'var(--color-accent-primary)' }} />}
              {challenge.name}
            </h2>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem', margin: 0 }}>
              {challenge.isRouteSetterChallenge ? '🔨 ' : ''}Por {challenge.creatorName} · {challenge.blocks?.length ?? 0} bloques · {challenge.totalResults} resultados
              {challenge.createdAt && ` · ${new Date(challenge.createdAt as any).toLocaleDateString('es-CO')}`}
            </p>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.375rem', color: 'var(--color-accent-tertiary)' }}>
            <Star size={20} fill="var(--color-accent-tertiary)" />
            <span style={{ fontWeight: 700, fontSize: '1.125rem' }}>{challenge.avgRating.toFixed(1)}</span>
          </div>
        </div>

        {challenge.description && (
          <p style={{ color: 'var(--color-text-secondary)', lineHeight: 1.6, marginBottom: '1.5rem', whiteSpace: 'pre-wrap' }}>
            {challenge.description}
          </p>
        )}

        {/* Bloques del reto */}
        <div>
          <h3 style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.75rem' }}>
            🧱 Bloques del reto ({blocks.length})
          </h3>
          {blocks.length === 0 ? (
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', textAlign: 'center', padding: '1rem' }}>
              No se encontraron bloques.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {blocks.map((block, i) => (
                <Link key={block.id} to={`/climber/blocks/${block.id}`} style={{ textDecoration: 'none' }}>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: '0.75rem',
                    padding: '0.75rem', background: 'var(--color-bg-base)',
                    borderRadius: '0.5rem', border: '1px solid var(--color-border-subtle)',
                    transition: 'border-color 0.2s',
                  }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--color-accent-primary)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--color-border-subtle)'; }}
                  >
                    <span style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem', fontWeight: 600, minWidth: 24 }}>
                      #{i + 1}
                    </span>
                    {block.photoUrl ? (
                      <img src={block.photoUrl} alt="" style={{ width: 48, height: 48, borderRadius: '0.375rem', objectFit: 'cover', flexShrink: 0 }} />
                    ) : (
                      <div style={{ width: 48, height: 48, borderRadius: '0.375rem', background: 'var(--color-bg-elevated)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Mountain size={20} style={{ opacity: 0.4 }} />
                      </div>
                    )}
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ color: 'var(--color-text-primary)', fontWeight: 500, fontSize: '0.85rem' }}>
                          {block.wallName}
                        </span>
                        <span style={{ fontSize: '0.7rem', padding: '0.125rem 0.5rem', borderRadius: '999px',
                          background: 'rgba(232,125,62,0.15)', color: 'var(--color-accent-primary)', fontWeight: 600 }}>
                          V{block.proposedDifficultyV}
                        </span>
                      </div>
                      <span style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>
                        {block.categoryColorName} · {block.routeSetterName}
                      </span>
                    </div>
                    <span style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>
                      ⭐ {block.avgRating?.toFixed(1) || '—'}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
