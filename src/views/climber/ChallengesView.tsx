import { Link } from 'react-router-dom';
import { Medal, Plus, Star, Hammer, Trash2, RefreshCw } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { getAllDocs, deleteDocById } from '@/lib/firestore';
import { collectionGroup, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Challenge, FirestoreDoc } from '@/types';

type ChallengeFilter = 'all' | 'activos' | 'pasados' | 'participados' | 'mios';

export function ClimberChallengesView() {
  const { user, profile } = useAuth();
  const [challenges, setChallenges] = useState<FirestoreDoc<Challenge>[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<ChallengeFilter>('all');
  const [userParticipatedIds, setUserParticipatedIds] = useState<Set<string>>(new Set());
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [blockStatusMap, setBlockStatusMap] = useState<Map<string, boolean>>(new Map());

  const loadChallenges = async () => {
    setLoading(true);
    try {
      const data = await getAllDocs<Challenge>('challenges', 'createdAt');
      setChallenges(data);

      // Cargar bloques activos para detectar retos con rutas desactivadas
      const allBlocks = await getAllDocs<{ active: boolean }>('blocks');
      const activeMap = new Map<string, boolean>();
      allBlocks.forEach(b => activeMap.set(b.id, b.active !== false));
      setBlockStatusMap(activeMap);
    } catch (e) { console.warn(e); }
    finally { setLoading(false); }
  };

  // Cargar retos en los que el usuario ha participado
  const loadUserParticipation = async () => {
    if (!user) return;
    try {
      const q = query(collectionGroup(db, 'attempts'), where('userId', '==', user.uid));
      const snap = await getDocs(q);
      const blockIds = new Set<string>();
      snap.docs.forEach(doc => {
        const segments = doc.ref.path.split('/');
        const blockId = segments[segments.length - 3];
        blockIds.add(blockId);
      });
      // Buscar qué retos contienen esos bloques
      const participated = new Set<string>();
      challenges.forEach(ch => {
        if (ch.blockIds?.some(id => blockIds.has(id))) {
          participated.add(ch.id);
        }
      });
      setUserParticipatedIds(participated);
    } catch (e) {
      // Fallback por si collectionGroup falla
      console.warn('Error loading participation:', e);
    }
  };

  useEffect(() => {
    loadChallenges();
  }, []);

  useEffect(() => {
    if (challenges.length > 0 && user) {
      loadUserParticipation();
    }
  }, [challenges, user]);

  const canDelete = (ch: FirestoreDoc<Challenge>) => {
    if (!user) return false;
    // RouteSetters pueden borrar todos
    if (profile?.roles?.includes('routesetter') || profile?.roles?.includes('admin')) return true;
    // Escaladores solo los propios
    return ch.creatorId === user.uid;
  };

  const handleDelete = async (ch: FirestoreDoc<Challenge>, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!canDelete(ch)) return;
    const msg = ch.creatorId === user?.uid
      ? '¿Estás seguro de eliminar este reto?'
      : '¿Estás seguro de eliminar este reto? (Eres routesetter/admin)';
    if (!window.confirm(msg)) return;
    setDeletingId(ch.id);
    try {
      await deleteDocById('challenges', ch.id);
      setChallenges(prev => prev.filter(c => c.id !== ch.id));
    } catch (err) {
      console.error('Error deleting challenge:', err);
    } finally {
      setDeletingId(null);
    }
  };

  const filtered = challenges.filter(ch => {
    if (filter === 'mios' && ch.creatorId !== user?.uid) return false;
    if (filter === 'participados' && !userParticipatedIds.has(ch.id)) return false;
    if (filter === 'activos') {
      // Reto activo = todos sus bloques están activos
      const hasInactive = ch.blockIds?.some(id => blockStatusMap.get(id) === false);
      return !hasInactive;
    }
    if (filter === 'pasados') {
      // Reto pasado = al menos un bloque está inactivo
      const hasInactive = ch.blockIds?.some(id => blockStatusMap.get(id) === false);
      return hasInactive;
    }
    return true;
  });

  if (loading) {
    return <p style={{ color: 'var(--color-text-muted)', padding: '2rem', textAlign: 'center' }}>Cargando retos...</p>;
  }

  return (
    <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0, color: 'var(--color-text-primary)' }}>
          Retos
        </h1>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button onClick={loadChallenges}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.375rem',
              padding: '0.5rem 0.75rem', background: 'var(--color-bg-surface)',
              border: '1px solid var(--color-border-default)', borderRadius: '0.5rem',
              color: 'var(--color-text-secondary)', cursor: 'pointer', fontSize: '0.8rem',
            }}
          >
            <RefreshCw size={14} />
          </button>
          <Link
            to="/climber/challenges/create"
            style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem',
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
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: '0.375rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        {([
          { k: 'all' as ChallengeFilter, l: '📋 Todos' },
          { k: 'activos' as ChallengeFilter, l: '✅ Activos' },
          { k: 'pasados' as ChallengeFilter, l: '📦 Pasados' },
          { k: 'participados' as ChallengeFilter, l: '🎯 Participé' },
          { k: 'mios' as ChallengeFilter, l: '👤 Mis retos' },
        ]).map(({ k, l }) => (
          <button key={k} onClick={() => setFilter(k)}
            style={{
              padding: '0.375rem 0.75rem', borderRadius: '999px', fontSize: '0.8rem',
              fontWeight: filter === k ? 600 : 400,
              background: filter === k ? 'var(--color-accent-primary)' : 'var(--color-bg-surface)',
              color: filter === k ? 'var(--color-text-inverse)' : 'var(--color-text-secondary)',
              border: `1px solid ${filter === k ? 'var(--color-accent-primary)' : 'var(--color-border-default)'}`,
              cursor: 'pointer',
            }}
          >
            {l}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div style={{
          background: 'var(--color-bg-surface)',
          border: '1px solid var(--color-border-subtle)',
          borderRadius: '0.75rem',
          padding: '3rem 2rem',
          textAlign: 'center',
        }}>
          <Medal size={48} style={{ margin: '0 auto 1rem', opacity: 0.4, color: 'var(--color-text-muted)' }} />
          <p style={{ color: 'var(--color-text-secondary)', marginBottom: '0.5rem' }}>
            {filter === 'mios' ? 'Aún no has creado retos.' :
             filter === 'participados' ? 'No has participado en ningún reto.' :
             filter === 'activos' ? 'No hay retos activos.' :
             filter === 'pasados' ? 'No hay retos pasados.' :
             'Aún no hay retos creados'}
          </p>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
            {filter === 'all' ? '¡Sé el primero en crear un reto! Arma un pack de bloques y desafía a otros escaladores.' : ''}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {filtered.map((ch) => {
            const hasExpired = ch.blockIds?.some(id => blockStatusMap.get(id) === false);
            return (
              <div key={ch.id} style={{
                background: 'var(--color-bg-surface)',
                border: `1px solid ${hasExpired ? 'var(--color-border-default)' : 'var(--color-border-subtle)'}`,
                borderRadius: '0.75rem',
                padding: '1.25rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                opacity: hasExpired ? 0.65 : 1,
              }}>
                <Link to={`/climber/challenges/${ch.id}`} style={{ textDecoration: 'none', flex: 1, minWidth: 0 }}>
                  <div>
                    <h3 style={{ color: 'var(--color-text-primary)', fontWeight: 600, margin: '0 0 0.25rem', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {ch.isRouteSetterChallenge && <Hammer size={16} style={{ color: 'var(--color-accent-primary)' }} />}
                      {ch.name}
                      {hasExpired && <span style={{ fontSize: '0.65rem', padding: '0.125rem 0.5rem', borderRadius: '999px', background: 'rgba(216,76,76,0.1)', color: 'var(--color-state-error)', fontWeight: 600 }}>Pasado</span>}
                    </h3>
                    <p style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem', margin: 0 }}>
                      {ch.isRouteSetterChallenge ? '🔨 ' : ''}Por {ch.creatorName} · {ch.blocks?.length ?? 0} bloques · {ch.totalResults} resultados
                    </p>
                  </div>
                </Link>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', color: 'var(--color-accent-tertiary)' }}>
                    <Star size={16} fill="var(--color-accent-tertiary)" />
                    <span style={{ fontWeight: 600 }}>{ch.avgRating.toFixed(1)}</span>
                  </div>
                  {canDelete(ch) && (
                    <button onClick={(e) => handleDelete(ch, e)} disabled={deletingId === ch.id}
                      style={{
                        background: 'rgba(216,76,76,0.1)', border: 'none', borderRadius: '0.375rem',
                        padding: '0.375rem', cursor: 'pointer', color: 'var(--color-state-error)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}
                      title="Eliminar reto"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
