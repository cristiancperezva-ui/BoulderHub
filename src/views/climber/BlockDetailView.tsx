import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Star, Mountain, Edit3 } from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { getDocById, setSubDoc, getSubDocs, updateDocById } from '@/lib/firestore';
import { ImageThumb } from '@/components/ImageZoom';
import { formatBlockDate } from '@/lib/scoring';
import type { Block, Attempt, FirestoreDoc } from '@/types';

export function ClimberBlockDetailView() {
  const { blockId } = useParams();
  const { user, profile } = useAuth();
  const [block, setBlock] = useState<FirestoreDoc<Block> | null>(null);
  const [allAttempts, setAllAttempts] = useState<FirestoreDoc<Attempt>[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showSavedPopup, setShowSavedPopup] = useState(false);

  // Form state
  const [attemptType, setAttemptType] = useState<'flash' | 'encadenado' | 'proyecto' | null>(null);
  const [attemptsRange, setAttemptsRange] = useState<string>('');
  const [rating, setRating] = useState(0);
  const [proposedVGrade, setProposedVGrade] = useState(0);

  const myAttempt = useMemo(() => {
    if (!user) return null;
    return allAttempts.find(a => a.id === user.uid) ?? null;
  }, [allAttempts, user]);

  const isEditing = !!myAttempt;

  useEffect(() => {
    if (!blockId) return;
    Promise.all([
      getDocById<Block>('blocks', blockId),
      getSubDocs<Attempt>('blocks', blockId, 'attempts', 'createdAt'),
    ]).then(([blockData, attempts]) => {
      setBlock(blockData);
      setAllAttempts(attempts);
      if (user && attempts) {
        const mine = attempts.find(a => a.id === user.uid);
        if (mine) {
          setAttemptType(mine.type);
          setAttemptsRange(mine.attemptsRange ?? '');
          setRating(mine.rating ?? 0);
          setProposedVGrade(mine.proposedVMin ?? 0);
        }
      }
    }).catch(console.warn)
    .finally(() => setLoading(false));
  }, [blockId, user]);

  /** Recalcula las métricas agregadas del bloque */
  const recalcBlockMetrics = async (attempts: FirestoreDoc<Attempt>[]) => {
    if (!blockId) return;
    const ratings = attempts.filter(a => a.rating).map(a => a.rating!);
    const avg = ratings.length > 0 ? ratings.reduce((s, r) => s + r, 0) / ratings.length : 0;
    await updateDocById<Block>('blocks', blockId, {
      avgRating: Math.round(avg * 10) / 10,
      totalAttempts: attempts.length,
      flashCount: attempts.filter(a => a.type === 'flash').length,
      encadenadoCount: attempts.filter(a => a.type === 'encadenado').length,
      proyectoCount: attempts.filter(a => a.type === 'proyecto').length,
    } as Partial<Block>);
    // Actualizar estado local
    setBlock(prev => prev ? {
      ...prev,
      avgRating: Math.round(avg * 10) / 10,
      totalAttempts: attempts.length,
      flashCount: attempts.filter(a => a.type === 'flash').length,
      encadenadoCount: attempts.filter(a => a.type === 'encadenado').length,
      proyectoCount: attempts.filter(a => a.type === 'proyecto').length,
    } : prev);
  };

  const handleSubmit = async () => {
    if (!user || !blockId || !attemptType) return;
    setSaving(true);
    try {
      await setSubDoc<Attempt>('blocks', blockId, 'attempts', user.uid, {
        userId: user.uid,
        userName: profile?.displayName ?? 'Escalador',
        userEmoji: profile?.emoji ?? null,
        type: attemptType,
        attemptsRange: attemptType === 'encadenado' ? (attemptsRange || null) as any : null,
        proposedVMin: proposedVGrade > 0 ? proposedVGrade : null,
        proposedVMax: proposedVGrade > 0 ? proposedVGrade : null,
        rating: rating || null,
        createdAt: Date.now(),
      });
      // Recargar intentos para asegurar consistencia
      const attempts = await getSubDocs<Attempt>('blocks', blockId, 'attempts', 'createdAt');
      setAllAttempts(attempts);
      await recalcBlockMetrics(attempts);
      // Mostrar popup de éxito
      setShowSavedPopup(true);
      setTimeout(() => setShowSavedPopup(false), 2500);
    } catch (err) {
      console.error('Error al guardar intento:', err);
      alert('Error al guardar. Revisa la consola.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p style={{ color: 'var(--color-text-muted)', padding: '2rem', textAlign: 'center' }}>Cargando...</p>;
  if (!block) return <p style={{ color: 'var(--color-text-muted)', padding: '2rem', textAlign: 'center' }}>Bloque no encontrado</p>;

  return (
    <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
      <Link to="/climber/blocks" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', color: 'var(--color-text-secondary)', fontSize: '0.875rem', marginBottom: '1rem', textDecoration: 'none' }}>
        <ArrowLeft size={16} /> Volver a bloques
      </Link>

      <div style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border-subtle)', borderRadius: '0.75rem', overflow: 'hidden' }}>
        {/* Foto con zoom */}
        <div style={{ width: '100%', aspectRatio: '16/9', background: 'var(--color-bg-elevated)' }}>
          {block.photoUrl ? (
            <ImageThumb src={block.photoUrl} alt="Bloque" style={{ width: '100%', height: '100%' }} />
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
              <Mountain size={48} style={{ opacity: 0.4 }} />
            </div>
          )}
        </div>

        <div style={{ padding: '1.5rem' }}>
          {/* Info + Chart en fila */}
          <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
            {/* Izquierda: Info del bloque */}
            <div style={{ flex: '1 1 300px', minWidth: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                <div>
                  <h2 style={{ color: 'var(--color-text-primary)', fontSize: '1.25rem', fontWeight: 600, margin: '0 0 0.25rem' }}>
                    {block.wallName}
                  </h2>
                  <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', margin: 0 }}>
                    {block.routeSetterName} · {formatBlockDate(block.createdAt)}
                  </p>
                </div>
              </div>

              {/* 1. Color */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '1rem' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>🎨 Color:</span>
                <span style={{
                  fontSize: '0.9rem', fontWeight: 600, padding: '0.25rem 0.75rem', borderRadius: '999px',
                  background: 'rgba(90,155,213,0.15)', color: 'var(--color-state-info)',
                }}>
                  {block.categoryColorName}
                </span>
              </div>

              {/* 2. Grado propuesto por el routesetter */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>🔧 Grado routesetter:</span>
                <span style={{
                  fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-accent-primary)',
                  background: 'rgba(232,125,62,0.1)', padding: '0.25rem 0.75rem', borderRadius: '0.5rem',
                }}>
                  V{block.proposedDifficultyV}
                </span>
              </div>

              {/* 3. Grado votado por escaladores (consenso del VGradeChart) */}
              {block.totalAttempts > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>🗳️ Grado comunidad:</span>
                  <ConsensusGradeBadge attempts={allAttempts} />
                </div>
              )}

              {block.comments && (
                <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.85rem', marginTop: '0.75rem', lineHeight: 1.5 }}>
                  {block.comments}
                </p>
              )}
              <p style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem', marginTop: '0.5rem' }}>
                ⭐ {block.avgRating?.toFixed(1) || '—'} · {block.flashCount ?? 0} flashes · {block.encadenadoCount ?? 0} encadenados · {block.proyectoCount ?? 0} proyectos
              </p>
            </div>

            {/* Derecha: Gráfico de frecuencias V */}
            <div style={{ flex: '1 1 300px', minWidth: 0 }}>
              {allAttempts.filter(a => a.proposedVMin || a.proposedVMax).length > 0 && (
                <>
                  <h3 style={{ color: 'var(--color-text-secondary)', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                    📊 Votos de grado
                  </h3>
                  <VGradeChart attempts={allAttempts} />
                </>
              )}
            </div>
          </div>

          {/* Formulario de intento */}
          <div style={{
            padding: '1.25rem', background: 'var(--color-bg-base)', borderRadius: '0.5rem',
            border: '1px solid var(--color-border-subtle)', marginBottom: '1.5rem',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <h3 style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem', fontWeight: 600, margin: 0 }}>
                {isEditing ? '✏️ Editar mi intento' : 'Marcar intento'}
              </h3>
              {isEditing && <Edit3 size={14} style={{ color: 'var(--color-accent-tertiary)' }} />}
            </div>

            {/* Tipo de intento */}
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
              {(['flash', 'encadenado', 'proyecto'] as const).map((type) => (
                <button key={type} onClick={() => setAttemptType(type)}
                  style={{
                    padding: '0.625rem 1.25rem',
                    background: attemptType === type ? 'var(--color-accent-primary)' : 'var(--color-bg-surface)',
                    color: attemptType === type ? 'var(--color-text-inverse)' : 'var(--color-text-secondary)',
                    border: `1px solid ${attemptType === type ? 'var(--color-accent-primary)' : 'var(--color-border-default)'}`,
                    borderRadius: '999px', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem',
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
                    <button key={range} onClick={() => setAttemptsRange(range)}
                      style={{
                        padding: '0.5rem 1rem',
                        background: attemptsRange === range ? 'var(--color-accent-tertiary)' : 'var(--color-bg-surface)',
                        color: attemptsRange === range ? 'var(--color-text-inverse)' : 'var(--color-text-secondary)',
                        border: `1px solid ${attemptsRange === range ? 'var(--color-accent-tertiary)' : 'var(--color-border-default)'}`,
                        borderRadius: '0.5rem', cursor: 'pointer', fontWeight: 500, fontSize: '0.85rem',
                      }}
                    >
                      {range} intentos
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Escala V propuesta — slider */}
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ color: 'var(--color-text-secondary)', fontSize: '0.8rem', display: 'block', marginBottom: '0.375rem' }}>
                ¿Qué grado V sientes que tiene?
              </label>
              <input
                type="range" min={0} max={14} value={proposedVGrade}
                onChange={(e) => setProposedVGrade(Number(e.target.value))}
                style={{ width: '100%', accentColor: 'var(--color-accent-primary)' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                <span>No sé</span>
                <span style={{ fontWeight: 700, fontSize: '1rem', color: proposedVGrade > 0 ? 'var(--color-accent-primary)' : 'var(--color-text-muted)' }}>
                  {proposedVGrade > 0 ? `V${proposedVGrade}` : '—'}
                </span>
                <span>V14</span>
              </div>
            </div>

            {/* Estrellas */}
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ color: 'var(--color-text-secondary)', fontSize: '0.8rem', display: 'block', marginBottom: '0.375rem' }}>
                ¿Qué tal el bloque?
              </label>
              <div style={{ display: 'flex', gap: '0.25rem' }}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <button key={star} onClick={() => setRating(star)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.25rem' }}
                  >
                    <Star size={28} fill={star <= rating ? 'var(--color-accent-tertiary)' : 'none'}
                      color={star <= rating ? 'var(--color-accent-tertiary)' : 'var(--color-text-muted)'} />
                  </button>
                ))}
              </div>
            </div>

            {/* Popup de éxito */}
            {showSavedPopup && (
              <div style={{
                marginBottom: '0.75rem', padding: '0.75rem 1rem',
                background: 'rgba(74,158,110,0.15)', border: '1px solid rgba(74,158,110,0.3)',
                borderRadius: '0.5rem', color: 'var(--color-state-success)',
                fontSize: '0.85rem', fontWeight: 600, textAlign: 'center',
                animation: 'fadeIn 0.2s ease-out',
              }}>
                ✅ {isEditing ? 'Intento actualizado correctamente' : 'Intento guardado correctamente'}
              </div>
            )}

            <button onClick={handleSubmit} disabled={!attemptType || saving}
              style={{
                width: '100%', padding: '0.75rem',
                background: (!attemptType || saving) ? 'var(--color-bg-hover)' : 'var(--color-accent-secondary)',
                color: (!attemptType || saving) ? 'var(--color-text-muted)' : 'var(--color-text-inverse)',
                border: 'none', borderRadius: '0.5rem', fontWeight: 600,
                cursor: (!attemptType || saving) ? 'not-allowed' : 'pointer', fontSize: '0.95rem',
              }}
            >
              {saving ? 'Guardando...' : isEditing ? '✏️ Actualizar' : '💾 Guardar'}
            </button>
          </div>

          {/* Intentos de otros — resumido con conteo */}
          <div style={{ marginTop: '1.5rem' }}>
            <h3 style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.75rem' }}>
              Intentos de otros escaladores ({allAttempts.length})
            </h3>
            {allAttempts.length === 0 ? (
              <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', textAlign: 'center', padding: '1rem' }}>
                Aún no hay intentos. ¡Sé el primero!
              </p>
            ) : (
              <div style={{
                display: 'flex', gap: '0.5rem', flexWrap: 'wrap',
                padding: '0.75rem', background: 'var(--color-bg-base)',
                borderRadius: '0.5rem', border: '1px solid var(--color-border-subtle)',
              }}>
                <span style={{
                  padding: '0.375rem 0.75rem', borderRadius: '999px', fontSize: '0.8rem', fontWeight: 600,
                  background: 'rgba(74,158,110,0.15)', color: 'var(--color-state-success)',
                }}>
                  🔥 {allAttempts.filter(a => a.type === 'flash').length} flash
                </span>
                <span style={{
                  padding: '0.375rem 0.75rem', borderRadius: '999px', fontSize: '0.8rem', fontWeight: 600,
                  background: 'rgba(212,168,75,0.15)', color: 'var(--color-accent-tertiary)',
                }}>
                  🧗 {allAttempts.filter(a => a.type === 'encadenado').length} encadenados
                </span>
                <span style={{
                  padding: '0.375rem 0.75rem', borderRadius: '999px', fontSize: '0.8rem', fontWeight: 600,
                  background: 'rgba(90,155,213,0.15)', color: 'var(--color-state-info)',
                }}>
                  🎯 {allAttempts.filter(a => a.type === 'proyecto').length} proyectos
                </span>
                {allAttempts.filter(a => a.rating).length > 0 && (
                  <span style={{
                    padding: '0.375rem 0.75rem', borderRadius: '999px', fontSize: '0.8rem', fontWeight: 600,
                    background: 'rgba(212,168,75,0.1)', color: 'var(--color-accent-tertiary)',
                  }}>
                    ⭐ Prom. {(() => {
                      const rated = allAttempts.filter(a => a.rating);
                      return (rated.reduce((s, a) => s + (a.rating ?? 0), 0) / rated.length).toFixed(1);
                    })()}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Gráfico de barras mejorado para frecuencias V */
function VGradeChart({ attempts }: { attempts: FirestoreDoc<Attempt>[] }) {
  const freq: Record<number, { count: number; voters: string[] }> = {};
  attempts.forEach(a => {
    const g = a.proposedVMin;
    if (g) {
      if (!freq[g]) freq[g] = { count: 0, voters: [] };
      freq[g].count++;
      freq[g].voters.push(a.userName);
    }
  });
  const grades = Object.entries(freq).sort(([a], [b]) => Number(a) - Number(b));
  const maxCount = Math.max(...Object.values(freq).map(v => v.count), 1);
  const colors = ['#E87D3E', '#4A9E6E', '#D4A84B', '#5B9BD5', '#C084FC', '#F87171', '#60A5FA'];

  return (
    <div style={{ background: 'var(--color-bg-base)', borderRadius: '0.5rem', padding: '1rem' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.5rem', height: 120, padding: '0.5rem 0', borderBottom: '1px solid var(--color-border-subtle)' }}>
        {grades.map(([grade, data], i) => (
          <div key={grade} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem', position: 'relative' }}>
            <span style={{ color: 'var(--color-text-muted)', fontSize: '0.65rem' }}>{data.count}</span>
            <div
              title={`V${grade}: ${data.count} voto${data.count !== 1 ? 's' : ''} (${data.voters.join(', ')})`}
              style={{
                width: '100%', maxWidth: 36,
                height: `${Math.max((data.count / maxCount) * 90, 6)}px`,
                background: colors[i % colors.length],
                borderRadius: '6px 6px 2px 2px',
                opacity: 0.8,
                transition: 'height 0.3s',
                cursor: 'help',
              }}
            />
            <span style={{ color: 'var(--color-text-muted)', fontSize: '0.7rem', fontWeight: 600 }}>V{grade}</span>
          </div>
        ))}
        {grades.length === 0 && (
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem', width: '100%', textAlign: 'center' }}>Sin votos</p>
        )}
      </div>
      {grades.length > 0 && (
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.7rem', marginTop: '0.5rem', textAlign: 'center' }}>
          🏆 Consenso: V{grades.sort((a, b) => freq[Number(b[0])]?.count - freq[Number(a[0])]?.count)[0]?.[0] ?? '—'}
        </p>
      )}
    </div>
  );
}

/** Badge con el grado de consenso de la comunidad */
function ConsensusGradeBadge({ attempts }: { attempts: FirestoreDoc<Attempt>[] }) {
  const freq: Record<number, number> = {};
  attempts.forEach(a => {
    const g = a.proposedVMin;
    if (g) freq[g] = (freq[g] ?? 0) + 1;
  });
  const entries = Object.entries(freq);
  if (entries.length === 0) return null;
  const consensusGrade = entries.sort(([, a], [, b]) => b - a)[0][0];
  return (
    <span style={{
      fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-accent-tertiary)',
      background: 'rgba(212,168,75,0.1)', padding: '0.25rem 0.75rem', borderRadius: '0.5rem',
    }}>
      V{consensusGrade}
    </span>
  );
}
