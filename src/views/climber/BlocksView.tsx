import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Mountain, Search, X } from 'lucide-react';
import { getAllDocs } from '@/lib/firestore';
import { collection, collectionGroup, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/useAuth';
import type { Block, Attempt, FirestoreDoc } from '@/types';

type StatusFilter = 'all' | 'realizados' | 'sin_realizar' | 'proyecto';

export function ClimberBlocksView() {
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [blocks, setBlocks] = useState<FirestoreDoc<Block>[]>([]);
  const [loading, setLoading] = useState(true);

  // Estado del usuario en cada bloque (bloqueId -> tipo de intento)
  const [userAttempts, setUserAttempts] = useState<Map<string, Attempt>>(new Map());

  // Filter state
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [selectedGrades, setSelectedGrades] = useState<number[]>([]);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sort, setSort] = useState<'newest' | 'difficulty' | 'rating'>('newest');

  useEffect(() => {
    getAllDocs<Block>('blocks', 'createdAt')
      .then(d => setBlocks(d.filter(b => b.active !== false)))
      .catch(() => setBlocks([]))
      .finally(() => setLoading(false));
  }, []);

  // Cargar los intentos del usuario actual para todos los bloques
  useEffect(() => {
    if (!user) return;
    const loadAttempts = async () => {
      const map = new Map<string, Attempt>();
      try {
        // Intento 1: collectionGroup (requiere índice en Firestore)
        const q = query(collectionGroup(db, 'attempts'), where('userId', '==', user.uid));
        const snap = await getDocs(q);
        snap.docs.forEach(doc => {
          const segments = doc.ref.path.split('/');
          const blockId = segments[segments.length - 3];
          map.set(blockId, doc.data() as Attempt);
        });
      } catch (e) {
        console.warn('collectionGroup falló, usando fallback:', e);
        // Fallback: buscar bloque por bloque
        try {
          const allBlocks = await getAllDocs<Block>('blocks');
          for (const b of allBlocks) {
            try {
              const attemptSnap = await getDocs(
                query(collection(db, 'blocks', b.id, 'attempts'), where('userId', '==', user.uid))
              );
              attemptSnap.docs.forEach(doc => {
                const data = doc.data() as Attempt;
                map.set(b.id, data);
              });
            } catch (_) { /* ignorar errores por bloque */ }
          }
        } catch (_) { /* ignorar error total */ }
      }
      setUserAttempts(map);
    };
    loadAttempts();
  }, [user]);

  const allColors = useMemo(() => [...new Set(blocks.map(b => b.categoryColorName).filter(Boolean))], [blocks]);
  const gradeRange = useMemo(() => {
    const grades = blocks.map(b => b.proposedDifficultyV).filter(Boolean);
    const min = Math.min(...grades);
    const max = Math.max(...grades);
    return Array.from({ length: max - min + 1 }, (_, i) => min + i);
  }, [blocks]);

  const toggleColor = (color: string) => {
    setSelectedColors(prev => prev.includes(color) ? prev.filter(c => c !== color) : [...prev, color]);
  };
  const toggleGrade = (g: number) => {
    setSelectedGrades(prev => prev.includes(g) ? prev.filter(x => x !== g) : [...prev, g]);
  };

  const filtered = useMemo(() => {
    let result = blocks.filter(b => {
      const attempt = userAttempts.get(b.id);
      // Filtro por estado
      if (statusFilter === 'realizados' && (!attempt || attempt.type === 'proyecto')) return false;
      if (statusFilter === 'proyecto' && (!attempt || attempt.type !== 'proyecto')) return false;
      if (statusFilter === 'sin_realizar' && attempt) return false;

      if (selectedColors.length > 0 && !selectedColors.includes(b.categoryColorName)) return false;
      if (selectedGrades.length > 0 && !selectedGrades.includes(b.proposedDifficultyV)) return false;
      if (search) {
        const q = search.toLowerCase();
        return b.wallName?.toLowerCase().includes(q) ||
               b.categoryColorName?.toLowerCase().includes(q) ||
               b.routeSetterName?.toLowerCase().includes(q) ||
               String(b.proposedDifficultyV).includes(q);
      }
      return true;
    });
    switch (sort) {
      case 'newest': result.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0)); break;
      case 'difficulty': result.sort((a, b) => (b.proposedDifficultyV ?? 0) - (a.proposedDifficultyV ?? 0)); break;
      case 'rating': result.sort((a, b) => (b.avgRating ?? 0) - (a.avgRating ?? 0)); break;
    }
    return result;
  }, [blocks, search, selectedColors, selectedGrades, sort, statusFilter, userAttempts]);

  if (loading) return <p style={{ color: 'var(--color-text-muted)', padding: '2rem', textAlign: 'center' }}>Cargando bloques...</p>;

  return (
    <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--color-text-primary)' }}>
        Bloques
      </h1>

      {/* Search */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem',
        padding: '0.75rem 1rem', background: 'var(--color-bg-surface)',
        border: '1px solid var(--color-border-default)', borderRadius: '0.5rem',
      }}>
        <Search size={18} style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />
        <input value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por muro, ruteador..."
          style={{ flex: 1, background: 'none', border: 'none', color: 'var(--color-text-primary)', fontSize: '0.9rem', outline: 'none' }}
        />
      </div>

      {/* Filter chips: Colors */}
      {allColors.length > 0 && (
        <div style={{ marginBottom: '0.75rem' }}>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem', marginBottom: '0.375rem' }}>🎨 Por color:</p>
          <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
            {allColors.map(color => {
              const active = selectedColors.includes(color);
              return (
                <button key={color} onClick={() => toggleColor(color)}
                  style={{
                    padding: '0.375rem 0.75rem', borderRadius: '999px', fontSize: '0.8rem', fontWeight: active ? 600 : 400,
                    background: active ? 'var(--color-accent-primary)' : 'var(--color-bg-surface)',
                    color: active ? 'var(--color-text-inverse)' : 'var(--color-text-secondary)',
                    border: `1px solid ${active ? 'var(--color-accent-primary)' : 'var(--color-border-default)'}`,
                    cursor: 'pointer',
                  }}
                >
                  {color} {active && <X size={12} style={{ marginLeft: '0.25rem', display: 'inline' }} />}
                </button>
              );
            })}
            {selectedColors.length > 0 && (
              <button onClick={() => setSelectedColors([])}
                style={{ padding: '0.375rem 0.75rem', borderRadius: '999px', fontSize: '0.75rem',
                  background: 'transparent', color: 'var(--color-text-muted)',
                  border: '1px dashed var(--color-border-default)', cursor: 'pointer' }}>
                Limpiar
              </button>
            )}
          </div>
        </div>
      )}

      {/* Filter chips: Grades */}
      {gradeRange.length > 0 && (
        <div style={{ marginBottom: '0.75rem' }}>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem', marginBottom: '0.375rem' }}>📊 Por grado V:</p>
          <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
            {gradeRange.map(g => {
              const active = selectedGrades.includes(g);
              return (
                <button key={g} onClick={() => toggleGrade(g)}
                  style={{
                    padding: '0.375rem 0.75rem', borderRadius: '999px', fontSize: '0.8rem', fontWeight: active ? 600 : 400,
                    background: active ? 'var(--color-accent-primary)' : 'var(--color-bg-surface)',
                    color: active ? 'var(--color-text-inverse)' : 'var(--color-text-secondary)',
                    border: `1px solid ${active ? 'var(--color-accent-primary)' : 'var(--color-border-default)'}`,
                    cursor: 'pointer',
                  }}
                >
                  V{g} {active && <X size={12} style={{ marginLeft: '0.25rem', display: 'inline' }} />}
                </button>
              );
            })}
            {selectedGrades.length > 0 && (
              <button onClick={() => setSelectedGrades([])}
                style={{ padding: '0.375rem 0.75rem', borderRadius: '999px', fontSize: '0.75rem',
                  background: 'transparent', color: 'var(--color-text-muted)',
                  border: '1px dashed var(--color-border-default)', cursor: 'pointer' }}>
                Limpiar
              </button>
            )}
          </div>
        </div>
      )}

      {/* Status filter */}
      <div style={{ marginBottom: '0.75rem' }}>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem', marginBottom: '0.375rem' }}>📋 Por estado:</p>
        <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
          {([
            { k: 'all' as StatusFilter, l: 'Todos', icon: '📋' },
            { k: 'realizados' as StatusFilter, l: 'Realizados ✅', icon: '✅' },
            { k: 'proyecto' as StatusFilter, l: 'En proyecto 🎯', icon: '🎯' },
            { k: 'sin_realizar' as StatusFilter, l: 'Sin realizar', icon: '⬜' },
          ]).map(({ k, l, icon }) => (
            <button key={k} onClick={() => setStatusFilter(k)}
              style={{
                padding: '0.375rem 0.75rem', borderRadius: '999px', fontSize: '0.8rem',
                fontWeight: statusFilter === k ? 600 : 400,
                background: statusFilter === k ? 'var(--color-accent-primary)' : 'var(--color-bg-surface)',
                color: statusFilter === k ? 'var(--color-text-inverse)' : 'var(--color-text-secondary)',
                border: `1px solid ${statusFilter === k ? 'var(--color-accent-primary)' : 'var(--color-border-default)'}`,
                cursor: 'pointer',
              }}
            >
              {icon} {l}
            </button>
          ))}
        </div>
      </div>

      {/* Sort tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
        {([{ k: 'newest', l: '🕐 Más nuevos' }, { k: 'difficulty', l: '📈 Dificultad' }, { k: 'rating', l: '⭐ Mejor rating' }] as const).map(({ k, l }) => (
          <button key={k} onClick={() => setSort(k)}
            style={{
              padding: '0.375rem 0.875rem', borderRadius: '999px', fontSize: '0.8rem',
              background: sort === k ? 'var(--color-accent-primary)' : 'var(--color-bg-surface)',
              color: sort === k ? 'var(--color-text-inverse)' : 'var(--color-text-secondary)',
              border: 'none', cursor: 'pointer', fontWeight: sort === k ? 600 : 400,
            }}
          >
            {l}
          </button>
        ))}
      </div>

      {/* Results count */}
      <p style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem', marginBottom: '0.75rem' }}>
        {filtered.length} bloque{filtered.length !== 1 ? 's' : ''}
        {(selectedColors.length > 0 || selectedGrades.length > 0) && ' filtrado' + (filtered.length !== 1 ? 's' : '')}
      </p>

      {filtered.length === 0 ? (
        <div style={{
          background: 'var(--color-bg-surface)', border: '1px solid var(--color-border-subtle)',
          borderRadius: '0.75rem', padding: '3rem 2rem', textAlign: 'center',
        }}>
          <Mountain size={48} style={{ margin: '0 auto 1rem', opacity: 0.4, color: 'var(--color-text-muted)' }} />
          <p style={{ color: 'var(--color-text-secondary)' }}>
            {blocks.length === 0 ? 'Aún no hay bloques publicados' : 'Ningún bloque coincide con los filtros'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {filtered.map((block) => (
            <BlockCard key={block.id} block={block} />
          ))}
        </div>
      )}
    </div>
  );
}

/** Tarjeta de bloque en formato lista (optimizada para mobile) */
function BlockCard({ block }: { block: FirestoreDoc<Block> }) {
  // Leer el userAttempts del contexto a través del componente padre
  // No podemos usar hooks aquí porque BlockCard no tiene acceso directo a userAttempts
  // Lo pasaremos como prop
  return (
    <Link to={`/climber/blocks/${block.id}`} style={{ textDecoration: 'none' }}>
      <div style={{
        display: 'flex', gap: '0.75rem', padding: '0.75rem',
        background: 'var(--color-bg-surface)', border: '1px solid var(--color-border-subtle)',
        borderRadius: '0.75rem',
        transition: 'border-color 0.2s',
      }}
        onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--color-accent-primary)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--color-border-subtle)'; }}
      >
        {/* Thumbnail */}
        <div style={{
          width: 80, height: 80, borderRadius: '0.5rem', flexShrink: 0,
          background: 'var(--color-bg-elevated)', overflow: 'hidden',
        }}>
          {block.photoUrl ? (
            <img src={block.photoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
              <Mountain size={24} style={{ opacity: 0.4, color: 'var(--color-text-muted)' }} />
            </div>
          )}
        </div>

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '0.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <span style={{ color: 'var(--color-text-primary)', fontWeight: 600, fontSize: '0.9rem' }}>
              🧱 {block.wallName}
            </span>
            <span style={{ fontSize: '0.7rem', padding: '0.125rem 0.5rem', borderRadius: '999px',
              background: 'rgba(232,125,62,0.15)', color: 'var(--color-accent-primary)', fontWeight: 600 }}>
              V{block.proposedDifficultyV}
            </span>
            <span style={{ fontSize: '0.7rem', padding: '0.125rem 0.5rem', borderRadius: '999px',
              background: 'rgba(90,155,213,0.15)', color: 'var(--color-state-info)', fontWeight: 500 }}>
              {block.categoryColorName}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>
            <span>🧗 {block.routeSetterName}</span>
            <span>⭐ {block.avgRating?.toFixed(1) || '—'}</span>
          </div>

          {block.totalAttempts && block.totalAttempts > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
              <span>🔥 {block.flashCount ?? 0} flash</span>
              <span>🧗 {block.encadenadoCount ?? 0} enc</span>
              <span>🎯 {block.proyectoCount ?? 0} proy</span>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
