import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Medal, Hammer, Mountain, Star, CheckCircle, Trophy } from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { getDocById, getSubDocs } from '@/lib/firestore';
import { collectionGroup, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { formatBlockDate, calculateTotalScore, scoreForAttempt } from '@/lib/scoring';
import type { Challenge, Block, Attempt, FirestoreDoc } from '@/types';

export function ClimberChallengeDetailView() {
  const { challengeId } = useParams();
  const { user } = useAuth();
  const [challenge, setChallenge] = useState<FirestoreDoc<Challenge> | null>(null);
  const [blocks, setBlocks] = useState<FirestoreDoc<Block>[]>([]);
  const [loading, setLoading] = useState(true);
  const [userAttempts, setUserAttempts] = useState<Map<string, Attempt>>(new Map());

  const hasExpired = useMemo(() => {
    return blocks.some(b => b.active === false);
  }, [blocks]);

  const hasParticipated = useMemo(() => {
    return challenge?.blockIds?.some(id => userAttempts.has(id)) ?? false;
  }, [challenge, userAttempts]);

  const userScore = useMemo(() => {
    const results: { type: Attempt['type']; attemptsRange: Attempt['attemptsRange'] }[] = [];
    userAttempts.forEach((a) => {
      results.push({ type: a.type, attemptsRange: a.attemptsRange });
    });
    return calculateTotalScore(results as any);
  }, [userAttempts]);

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

        // Cargar intentos del usuario en los bloques de este reto y calcular puntaje
        if (user && ch?.blockIds?.length) {
          const attemptsMap = new Map<string, Attempt>();
          const loadAttempts = async () => {
            try {
              const q = query(collectionGroup(db, 'attempts'), where('userId', '==', user.uid));
              const snap = await getDocs(q);
              snap.docs.forEach(doc => {
                const segments = doc.ref.path.split('/');
                const blockId = segments[segments.length - 3];
                if (ch.blockIds.includes(blockId)) {
                  attemptsMap.set(blockId, doc.data() as Attempt);
                }
              });
            } catch (e) {
              // Fallback: buscar bloque por bloque
              for (const bid of ch.blockIds) {
                try {
                  const subAttempts = await getSubDocs<Attempt>('blocks', bid, 'attempts');
                  const myAttempt = subAttempts.find(a => a.userId === user?.uid);
                  if (myAttempt) attemptsMap.set(bid, myAttempt as Attempt);
                } catch (_) { /* ignore */ }
              }
            }
          };
          await loadAttempts();
          setUserAttempts(attemptsMap);
        }
      } catch (e) { console.warn(e); }
      finally { setLoading(false); }
    };
    load();
  }, [challengeId, user]);

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
            <h2 style={{ color: 'var(--color-text-primary)', fontWeight: 600, margin: '0 0 0.125rem', fontSize: '1.125rem', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              {challenge.isRouteSetterChallenge && <Hammer size={16} style={{ color: 'var(--color-accent-primary)' }} />}
              {challenge.name}
              {hasExpired && <span style={{ fontSize: '0.65rem', padding: '0.125rem 0.5rem', borderRadius: '999px', background: 'rgba(216,76,76,0.1)', color: 'var(--color-state-error)', fontWeight: 600 }}>Pasado</span>}
              {hasParticipated && <CheckCircle size={16} style={{ color: 'var(--color-state-success)' }} />}
            </h2>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem', margin: 0 }}>
              {challenge.isRouteSetterChallenge ? '🔨 ' : ''}Por {challenge.creatorName} · {challenge.blocks?.length ?? 0} bloques · {challenge.totalResults} resultados
              {challenge.createdAt && ` · ${formatBlockDate(challenge.createdAt)}`}
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

        {/* Estado de participación y puntaje */}
        {!hasParticipated ? (
          <div style={{
            marginBottom: '1.5rem', padding: '1rem',
            background: 'rgba(90,155,213,0.1)', border: '1px solid rgba(90,155,213,0.25)',
            borderRadius: '0.5rem', textAlign: 'center',
          }}>
            <p style={{ color: 'var(--color-state-info)', fontSize: '0.85rem', margin: 0 }}>
              Aún no has participado en este reto. ¡Ve a los bloques y márcalos para participar!
            </p>
          </div>
        ) : (
          <div style={{
            marginBottom: '1.5rem', padding: '0.75rem 1rem',
            background: 'rgba(212,168,75,0.1)', border: '1px solid rgba(212,168,75,0.25)',
            borderRadius: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem',
          }}>
            <Trophy size={24} style={{ color: 'var(--color-accent-tertiary)' }} />
            <div>
              <p style={{ color: 'var(--color-text-primary)', fontWeight: 600, margin: 0, fontSize: '0.9rem' }}>
                ¡Estás participando! · {userAttempts.size}/{blocks.length} bloques completados
              </p>
              <p style={{ color: 'var(--color-accent-tertiary)', fontWeight: 700, margin: '0.125rem 0 0', fontSize: '1.125rem' }}>
                🏆 Puntaje total: {userScore} pts
              </p>
            </div>
          </div>
        )}

        {/* Bloques del reto */}
        <div>
          <h3 style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.75rem' }}>
            🧱 Bloques del reto ({blocks.length})
            {hasParticipated && <span style={{ color: 'var(--color-state-success)', fontSize: '0.8rem', marginLeft: '0.5rem' }}>✅ Participas en {userAttempts.size}/{blocks.length}</span>}
          </h3>
          {blocks.length === 0 ? (
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', textAlign: 'center', padding: '1rem' }}>
              No se encontraron bloques.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {blocks.map((block, i) => {
                const myAttempt = userAttempts.get(block.id);
                const attemptScore = myAttempt ? scoreForAttempt(myAttempt.type, myAttempt.attemptsRange) : 0;
                return (
                  <Link key={block.id} to={`/climber/blocks/${block.id}`} style={{ textDecoration: 'none' }}>
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: '0.75rem',
                      padding: '0.75rem', background: 'var(--color-bg-base)',
                      borderRadius: '0.5rem', border: '1px solid var(--color-border-subtle)',
                      transition: 'border-color 0.2s', opacity: block.active === false ? 0.55 : 1,
                    }}
                      onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--color-accent-primary)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--color-border-subtle)'; }}
                    >
                      <span style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem', fontWeight: 600, minWidth: 32 }}>
                        {myAttempt ? '✅' : `#${i + 1}`}
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
                          {block.active === false && (
                            <span style={{ fontSize: '0.65rem', padding: '0.125rem 0.375rem', borderRadius: '999px',
                              background: 'rgba(216,76,76,0.1)', color: 'var(--color-state-error)', fontWeight: 600 }}>
                              Desactivado
                            </span>
                          )}
                        </div>
                        <span style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>
                          {block.categoryColorName} · {block.routeSetterName}
                        </span>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        {myAttempt ? (
                          <span style={{
                            fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-accent-tertiary)',
                            background: 'rgba(212,168,75,0.1)', padding: '0.25rem 0.5rem', borderRadius: '0.375rem',
                          }}>
                            +{attemptScore} pts
                          </span>
                        ) : (
                          <span style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>
                            ⭐ {block.avgRating?.toFixed(1) || '—'}
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
