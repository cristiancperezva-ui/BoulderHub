import { useState, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Mountain, Search, X, ChevronDown } from 'lucide-react';
import { useActiveBlocks } from '@/hooks/useBlocks';
import { useMyAttempts } from '@/hooks/useAttempts';
import type { Block, Attempt, FirestoreDoc } from '@/types';

type StatusFilter = 'all' | 'realizados' | 'sin_realizar' | 'proyecto';

const PAGE_SIZE = 20;

export function ClimberBlocksView() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  // Leer filtros desde URL search params (persisten al navegar)
  const search = searchParams.get('q') ?? '';
  const selectedColors = searchParams.get('colors')?.split(',').filter(Boolean) ?? [];
  const selectedGrades = searchParams.get('grades')?.split(',').map(Number).filter(n => !isNaN(n)) ?? [];
  const statusFilter = (searchParams.get('status') as StatusFilter) ?? 'all';
  const sort = (searchParams.get('sort') as 'newest' | 'difficulty' | 'rating') ?? 'newest';

  // Helper para actualizar un filtro en la URL sin perder los demás
  const setFilter = (key: string, value: string | null) => {
    const next = new URLSearchParams(searchParams);
    if (!value || value === 'all' || value === 'newest') {
      next.delete(key);
    } else {
      next.set(key, value);
    }
    setSearchParams(next, { replace: true });
    setVisibleCount(PAGE_SIZE); // resetear paginación al cambiar filtros
  };

  // ✅ 1 sola query cacheada 10 min para TODOS los bloques activos
  const { data: blocks = [], isLoading } = useActiveBlocks();

  // ✅ Intentos del usuario cacheados en localStorage + TanStack Query
  const { data: userAttempts = new Map<string, Attempt>() } = useMyAttempts();

  // Filter state (todo en cliente porque los datos ya están cacheados)
  const allColors = useMemo(() => [...new Set(blocks.map(b => b.categoryColorName).filter(Boolean))], [blocks]);
  const gradeRange = useMemo(() => {
    const hasUnknown = blocks.some(b => b.proposedDifficultyUnknown);
    const grades = blocks.map(b => b.proposedDifficultyV).filter(Boolean);
    if (grades.length === 0 && !hasUnknown) return [];
    const min = Math.min(...grades);
    const max = Math.max(...grades);
    const range = Array.from({ length: max - min + 1 }, (_, i) => min + i);
    if (hasUnknown) range.unshift(0);
    return range;
  }, [blocks]);

  const toggleColor = (color: string) => {
    const next = selectedColors.includes(color)
      ? selectedColors.filter(c => c !== color)
      : [...selectedColors, color];
    setFilter('colors', next.length > 0 ? next.join(',') : null);
  };
  const toggleGrade = (g: number) => {
    const next = selectedGrades.includes(g)
      ? selectedGrades.filter(x => x !== g)
      : [...selectedGrades, g];
    setFilter('grades', next.length > 0 ? next.join(',') : null);
  };

  const filtered = useMemo(() => {
    let result = blocks.filter(b => {
      const attempt = userAttempts.get(b.id);
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

  // Paginación en cliente (los datos ya están en caché)
  const visibleBlocks = filtered.slice(0, visibleCount);
  const hasMore = visibleCount < filtered.length;

  const loadMore = () => setVisibleCount(prev => prev + PAGE_SIZE);

  if (isLoading) return <p style={{ color: 'var(--color-text-muted)', padding: '2rem', textAlign: 'center' }}>Cargando bloques...</p>;

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
        <input value={search} onChange={(e) => setFilter('q', e.target.value || null)}
          placeholder="Buscar por muro, routesetter..."
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
              <button onClick={() => setFilter('colors', null)}
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
              const isUnknown = g === 0;
              return (
                <button key={g} onClick={() => toggleGrade(g)}
                  style={{
                    padding: '0.375rem 0.75rem', borderRadius: '999px', fontSize: '0.8rem', fontWeight: active ? 600 : 400,
                    background: active ? 'var(--color-accent-primary)' : 'var(--color-bg-surface)',
                    color: active ? 'var(--color-text-inverse)' : isUnknown ? 'var(--color-text-muted)' : 'var(--color-text-secondary)',
                    border: `1px solid ${active ? 'var(--color-accent-primary)' : 'var(--color-border-default)'}`,
                    cursor: 'pointer',
                  }}
                >
                  {isUnknown ? 'V?' : `V${g}`} {active && <X size={12} style={{ marginLeft: '0.25rem', display: 'inline' }} />}
                </button>
              );
            })}
            {selectedGrades.length > 0 && (
              <button onClick={() => setFilter('grades', null)}
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
            <button key={k} onClick={() => setFilter('status', k)}
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
          <button key={k} onClick={() => setFilter('sort', k)}
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
          {visibleBlocks.map((block) => (
            <BlockCard
              key={block.id}
              block={block}
              userAttempt={userAttempts.get(block.id) ?? null}
            />
          ))}

          {/* Botón "Cargar más" — evita leer todos los bloques de golpe */}
          {hasMore && (
            <button
              onClick={loadMore}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.375rem',
                width: '100%', padding: '0.75rem',
                background: 'var(--color-bg-surface)', border: '1px solid var(--color-border-subtle)',
                borderRadius: '0.75rem', color: 'var(--color-text-secondary)',
                cursor: 'pointer', fontWeight: 500, fontSize: '0.875rem',
              }}
            >
              <ChevronDown size={18} />
              Mostrar más ({filtered.length - visibleCount} restantes)
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/** Tarjeta de bloque con badge de estado del usuario */
function BlockCard({ block, userAttempt }: { block: FirestoreDoc<Block>; userAttempt: Attempt | null }) {
  const statusBadge = userAttempt
    ? userAttempt.type === 'flash' ? { label: '✅ Flash', color: 'var(--color-state-success)' }
      : userAttempt.type === 'encadenado' ? { label: '🧗 Encadenado', color: 'var(--color-accent-tertiary)' }
      : { label: '🎯 Proyecto', color: 'var(--color-state-info)' }
    : null;

  return (
    <Link to={`/climber/blocks/${block.id}`} style={{ textDecoration: 'none' }}>
      <div style={{
        display: 'flex', gap: '0.75rem', padding: '0.75rem',
        background: 'var(--color-bg-surface)', border: `1px solid ${statusBadge ? 'var(--color-accent-tertiary)' : 'var(--color-border-subtle)'}`,
        borderLeft: statusBadge ? `4px solid ${statusBadge.color}` : '1px solid var(--color-border-subtle)',
        borderRadius: '0.75rem',
        transition: 'border-color 0.2s',
      }}
        onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--color-accent-primary)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.borderColor = statusBadge ? 'var(--color-accent-tertiary)' : 'var(--color-border-subtle)'; }}
      >
        {/* Thumbnail */}
        <div style={{
          width: 80, height: 80, borderRadius: '0.5rem', flexShrink: 0,
          background: 'var(--color-bg-elevated)', overflow: 'hidden',
        }}>
          {block.photoUrl ? (
            <img src={block.thumbUrl || block.photoUrl} alt="" loading="lazy" decoding="async" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
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
              background: block.proposedDifficultyUnknown ? 'rgba(108,108,108,0.15)' : 'rgba(232,125,62,0.15)',
              color: block.proposedDifficultyUnknown ? 'var(--color-text-muted)' : 'var(--color-accent-primary)',
              fontWeight: 600 }}>
              {block.proposedDifficultyUnknown ? 'V?' : `V${block.proposedDifficultyV}`}
            </span>
            <span style={{ fontSize: '0.7rem', padding: '0.125rem 0.5rem', borderRadius: '999px',
              background: 'rgba(90,155,213,0.15)', color: 'var(--color-state-info)', fontWeight: 500 }}>
              {block.categoryColorName}
            </span>
            {block.holdColors && block.holdColors.length > 0 && (
              <div style={{ display: 'flex', gap: '0.2rem', alignItems: 'center' }}>
                {block.holdColors.map((color, i) => (
                  <div key={i}
                    title={color}
                    style={{
                      width: 14, height: 14, borderRadius: '50%',
                      background: color,
                      border: '1px solid rgba(255,255,255,0.15)',
                      flexShrink: 0,
                    }}
                  />
                ))}
              </div>
            )}
            {statusBadge && (
              <span style={{ fontSize: '0.65rem', padding: '0.125rem 0.375rem', borderRadius: '999px',
                background: statusBadge.color + '22', color: statusBadge.color, fontWeight: 600 }}>
                {statusBadge.label}
              </span>
            )}
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
