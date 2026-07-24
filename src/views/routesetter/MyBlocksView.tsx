import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { getAllDocs, updateDocById } from '@/lib/firestore';
import { formatBlockDate } from '@/lib/scoring';
import type { Block, FirestoreDoc } from '@/types';
import { Mountain, Eye, EyeOff, Search, Clock, TrendingUp, Star, Filter } from 'lucide-react';

type SortKey = 'newest' | 'oldest' | 'difficulty' | 'rating';

export function RouteSetterMyBlocksView() {
  const { user } = useAuth();
  const [blocks, setBlocks] = useState<FirestoreDoc<Block>[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<'all' | 'mine'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [sort, setSort] = useState<SortKey>('newest');
  const [showSort, setShowSort] = useState(false);

  const loadBlocks = async () => {
    try {
      const data = await getAllDocs<Block>('blocks', 'createdAt');
      setBlocks(data);
    } catch (e) { console.warn('Blocks load:', e); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadBlocks(); }, []);

  const toggleActive = async (blockId: string, current: boolean) => {
    // Si va a desactivar, preguntar confirmación
    if (current) {
      const confirmed = window.confirm('¿Estás seguro de desactivar este bloque? Se moverá a históricos.');
      if (!confirmed) return;
    }
    try {
      const updates: Partial<Block> = { active: !current };
      // Si se desactiva, guardar timestamp para históricos
      if (current) {
        updates.deactivatedAt = Date.now() as any;
      } else {
        updates.deactivatedAt = null as any;
      }
      await updateDocById<Block>('blocks', blockId, updates as Partial<Block>);
      setBlocks(prev => prev.map(b => b.id === blockId ? { ...b, active: !current, deactivatedAt: current ? Date.now() : null } : b));
    } catch (e) { console.error(e); }
  };

  const filtered = useMemo(() => {
    let result = blocks.filter(b => {
      if (tab === 'mine' && b.routeSetterId !== user?.uid) return false;
      if (statusFilter === 'active' && b.active === false) return false;
      if (statusFilter === 'inactive' && b.active !== false) return false;
      if (search) {
        const q = search.toLowerCase();
        return b.wallName?.toLowerCase().includes(q) ||
               b.routeSetterName?.toLowerCase().includes(q) ||
               b.categoryColorName?.toLowerCase().includes(q) ||
               (b.comments && b.comments.toLowerCase().includes(q));
      }
      return true;
    });
    switch (sort) {
      case 'newest': result.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0)); break;
      case 'oldest': result.sort((a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0)); break;
      case 'difficulty': result.sort((a, b) => (b.proposedDifficultyV ?? 0) - (a.proposedDifficultyV ?? 0)); break;
      case 'rating': result.sort((a, b) => (b.avgRating ?? 0) - (a.avgRating ?? 0)); break;
    }
    return result;
  }, [blocks, search, tab, statusFilter, sort, user?.uid]);

  if (loading) return <p style={{ color: 'var(--color-text-muted)' }}>Cargando...</p>;

  return (
    <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--color-text-primary)' }}>
        Bloques del Gimnasio
      </h1>

      {/* Tabs */}
      <div style={{
        display: 'flex', gap: '0.5rem', marginBottom: '1rem',
        borderBottom: '1px solid var(--color-border-subtle)', paddingBottom: '0.5rem',
      }}>
        {(['all', 'mine'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            style={{
              padding: '0.5rem 1rem',
              background: tab === t ? 'var(--color-accent-primary)' : 'transparent',
              color: tab === t ? 'var(--color-text-inverse)' : 'var(--color-text-secondary)',
              border: 'none', borderRadius: '0.5rem', cursor: 'pointer',
              fontWeight: tab === t ? 600 : 400, fontSize: '0.85rem',
            }}
          >
            {t === 'all' ? '🏔️ Todos los Bloques' : '🧗 Mis Bloques'}
          </button>
        ))}
      </div>

      {/* Search + Filters */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <div style={{
          flex: 1, minWidth: 200, display: 'flex', alignItems: 'center', gap: '0.75rem',
          padding: '0.75rem 1rem', background: 'var(--color-bg-surface)',
          border: '1px solid var(--color-border-default)', borderRadius: '0.5rem',
        }}>
          <Search size={18} style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por muro, routesetter, color..."
            style={{ flex: 1, background: 'none', border: 'none', color: 'var(--color-text-primary)', fontSize: '0.9rem', outline: 'none' }}
          />
        </div>
        {/* Status filter */}
        <div style={{ display: 'flex', gap: '0.375rem' }}>
          {([{ k: 'all', l: 'Todos' }, { k: 'active', l: 'Activos' }, { k: 'inactive', l: 'Inactivos' }] as const).map(({ k, l }) => (
            <button key={k} onClick={() => setStatusFilter(k)}
              style={{
                padding: '0.625rem 0.875rem',
                background: statusFilter === k ? 'var(--color-accent-primary)' : 'var(--color-bg-surface)',
                color: statusFilter === k ? 'var(--color-text-inverse)' : 'var(--color-text-secondary)',
                border: `1px solid ${statusFilter === k ? 'var(--color-accent-primary)' : 'var(--color-border-default)'}`,
                borderRadius: '0.5rem', cursor: 'pointer', fontSize: '0.8rem', fontWeight: statusFilter === k ? 600 : 400,
              }}
            >
              {k === 'all' ? '📋' : k === 'active' ? '✅' : '🚫'} {l}
            </button>
          ))}
        </div>
        {/* Sort */}
        <div style={{ position: 'relative' }}>
          <button onClick={() => setShowSort(!showSort)}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.375rem',
              padding: '0.625rem 0.875rem', background: 'var(--color-bg-surface)',
              border: '1px solid var(--color-border-default)', borderRadius: '0.5rem',
              color: 'var(--color-text-secondary)', cursor: 'pointer', fontSize: '0.8rem',
            }}
          >
            <Filter size={14} /> Ordenar
          </button>
          {showSort && (
            <div style={{
              position: 'absolute', top: '100%', right: 0, marginTop: '0.375rem', zIndex: 50,
              background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border-default)',
              borderRadius: '0.5rem', padding: '0.375rem', minWidth: 170, boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
            }}>
              {([{ k: 'newest' as SortKey, l: 'Más nuevos', i: Clock }, { k: 'oldest' as SortKey, l: 'Más antiguos', i: Clock }, { k: 'difficulty' as SortKey, l: 'Mayor dificultad', i: TrendingUp }, { k: 'rating' as SortKey, l: 'Mejor rating', i: Star }]).map(({ k, l, i: Icon }) => (
                <button key={k} onClick={() => { setSort(k); setShowSort(false); }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%',
                    padding: '0.5rem 0.75rem', background: sort === k ? 'var(--color-bg-hover)' : 'transparent',
                    border: 'none', borderRadius: '0.375rem',
                    color: sort === k ? 'var(--color-accent-primary)' : 'var(--color-text-secondary)',
                    cursor: 'pointer', fontSize: '0.85rem', fontWeight: sort === k ? 600 : 400, textAlign: 'left',
                  }}
                >
                  <Icon size={16} /> {l}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div style={{
          background: 'var(--color-bg-surface)', border: '1px solid var(--color-border-subtle)',
          borderRadius: '0.75rem', padding: '3rem 2rem', textAlign: 'center',
        }}>
          <Mountain size={48} style={{ margin: '0 auto 1rem', opacity: 0.4, color: 'var(--color-text-muted)' }} />
          <p style={{ color: 'var(--color-text-secondary)' }}>
            {tab === 'mine' ? 'Aún no has subido bloques.' : 'No hay bloques en el gimnasio.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {/* Sección: Activos */}
          {filtered.filter(b => b.active !== false).length > 0 && (
            <>
              <h3 style={{ color: 'var(--color-state-success)', fontSize: '0.85rem', fontWeight: 600, margin: '0.5rem 0 0.25rem', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                ✅ Activos ({filtered.filter(b => b.active !== false).length})
              </h3>
              {filtered.filter(b => b.active !== false).map((block) => (
                <BlockRow key={block.id} block={block} onToggle={toggleActive} />
              ))}
            </>
          )}
          {/* Sección: Históricos (inactivos) */}
          {filtered.filter(b => b.active === false).length > 0 && (
            <>
              <h3 style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', fontWeight: 600, margin: '1rem 0 0.25rem', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                📦 Históricos ({filtered.filter(b => b.active === false).length})
              </h3>
              {filtered.filter(b => b.active === false).map((block) => (
                <BlockRow key={block.id} block={block} onToggle={toggleActive} />
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}

/** Fila individual de bloque (reutilizada para activos e históricos) */
function BlockRow({ block, onToggle }: { block: FirestoreDoc<Block>; onToggle: (id: string, active: boolean) => void }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '1rem',
      padding: '0.75rem 1rem',
      background: block.active ? 'var(--color-bg-surface)' : 'var(--color-bg-elevated)',
      border: `1px solid ${block.active ? 'var(--color-border-subtle)' : 'var(--color-border-default)'}`,
      borderRadius: '0.75rem',
      opacity: block.active ? 1 : 0.6,
    }}>
      {/* Mini foto */}
      <div style={{
        width: 60, height: 60, borderRadius: '0.5rem', flexShrink: 0,
        background: 'var(--color-bg-base)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '0.7rem', color: 'var(--color-text-muted)',
        overflow: 'hidden',
      }}>
        {block.photoUrl ? (
          <img src={block.photoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <Mountain size={20} style={{ opacity: 0.4 }} />
        )}
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <span style={{ color: 'var(--color-text-primary)', fontWeight: 500, fontSize: '0.9rem' }}>
            {block.wallName || 'Sin muro'}
          </span>
          <span style={{
            fontSize: '0.7rem', padding: '0.125rem 0.5rem', borderRadius: '999px',
            background: 'rgba(232,125,62,0.15)', color: 'var(--color-accent-primary)', fontWeight: 600,
          }}>
            V{block.proposedDifficultyV}
          </span>
          <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
            {block.categoryColorName}
          </span>
          {!block.active && (
            <span style={{ fontSize: '0.7rem', padding: '0.125rem 0.5rem', borderRadius: '999px',
              background: 'rgba(216,76,76,0.15)', color: 'var(--color-state-error)', fontWeight: 600 }}>
              Inactivo
            </span>
          )}
        </div>
        <div style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem', marginTop: '0.125rem' }}>
          {block.routeSetterName} · {formatBlockDate(block.createdAt)} · ⭐ {block.avgRating?.toFixed(1) || '—'}
          {block.deactivatedAt && ` · 📦 ${formatBlockDate(block.deactivatedAt)}`}
        </div>
      </div>

      {/* Acciones */}
      <button onClick={() => onToggle(block.id, block.active)}
        title={block.active ? 'Deshabilitar bloque' : 'Habilitar bloque'}
        style={{
          display: 'flex', alignItems: 'center', gap: '0.375rem',
          padding: '0.5rem 0.75rem',
          background: block.active ? 'rgba(216,76,76,0.1)' : 'rgba(74,158,110,0.1)',
          color: block.active ? 'var(--color-state-error)' : 'var(--color-state-success)',
          border: 'none', borderRadius: '0.375rem', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600, flexShrink: 0,
        }}
      >
        {block.active ? <EyeOff size={14} /> : <Eye size={14} />}
        {block.active ? 'Desactivar' : 'Activar'}
      </button>
    </div>
  );
}
