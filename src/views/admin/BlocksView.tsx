import { useState, useEffect, useMemo } from 'react';
import { Search, Mountain, Trash2, Eye, EyeOff, AlertTriangle } from 'lucide-react';
import { getAllDocs, updateDocById, deleteDocById } from '@/lib/firestore';
import { formatBlockDate } from '@/lib/scoring';
import type { Block, FirestoreDoc } from '@/types';

export function AdminBlocksView() {
  const [blocks, setBlocks] = useState<FirestoreDoc<Block>[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showInactive, setShowInactive] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [deleteWord, setDeleteWord] = useState('');

  const loadBlocks = async () => {
    setLoading(true);
    try {
      const data = await getAllDocs<Block>('blocks', 'createdAt');
      setBlocks(data);
    } catch (e) { console.warn(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadBlocks(); }, []);

  const filtered = useMemo(() => {
    return blocks.filter(b => {
      if (!showInactive && b.active === false) return false;
      if (search) {
        const q = search.toLowerCase();
        return b.wallName?.toLowerCase().includes(q) ||
               b.routeSetterName?.toLowerCase().includes(q) ||
               b.categoryColorName?.toLowerCase().includes(q) ||
               String(b.proposedDifficultyV).includes(q);
      }
      return true;
    });
  }, [blocks, search, showInactive]);

  const handleDelete = async (blockId: string) => {
    if (deleteWord !== 'ELIMINAR') return;
    try {
      await deleteDocById('blocks', blockId);
      setBlocks(prev => prev.filter(b => b.id !== blockId));
      setConfirmDelete(null);
      setDeleteWord('');
    } catch (e) {
      console.error('Error deleting block:', e);
      alert('Error al eliminar el bloque. Revisa que tengas permisos de admin.');
      // Resetear estado para permitir nuevos intentos
      setConfirmDelete(null);
      setDeleteWord('');
    }
  };

  const toggleActive = async (blockId: string, current: boolean) => {
    try {
      await updateDocById<Block>('blocks', blockId, {
        active: !current,
        deactivatedAt: current ? Date.now() as any : null as any,
      } as Partial<Block>);
      setBlocks(prev => prev.map(b => b.id === blockId ? { ...b, active: !current } : b));
    } catch (e) { console.error(e); }
  };

  if (loading) return <p style={{ color: 'var(--color-text-muted)', padding: '2rem', textAlign: 'center' }}>Cargando bloques...</p>;

  return (
    <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0, color: 'var(--color-text-primary)' }}>
          Gestión de Bloques
        </h1>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', color: 'var(--color-text-secondary)', fontSize: '0.85rem', cursor: 'pointer' }}>
            <input type="checkbox" checked={showInactive} onChange={() => setShowInactive(!showInactive)} />
            Mostrar inactivos
          </label>
        </div>
      </div>

      <div style={{
        display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem',
        padding: '0.75rem 1rem', background: 'var(--color-bg-surface)',
        border: '1px solid var(--color-border-default)', borderRadius: '0.5rem',
      }}>
        <Search size={18} style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />
        <input value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por muro, routesetter, color..."
          style={{ flex: 1, background: 'none', border: 'none', color: 'var(--color-text-primary)', fontSize: '0.9rem', outline: 'none' }}
        />
        <span style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>{filtered.length} bloque{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-muted)' }}>
          <Mountain size={48} style={{ margin: '0 auto 1rem', opacity: 0.4 }} />
          <p>No hay bloques.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {filtered.map((block) => (
            <div key={block.id}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: '0.75rem',
                padding: '0.75rem 1rem',
                background: 'var(--color-bg-surface)',
                border: `1px solid ${block.active ? 'var(--color-border-subtle)' : 'var(--color-border-default)'}`,
                borderRadius: '0.5rem',
                opacity: block.active ? 1 : 0.6,
              }}>
                <div style={{ width: 44, height: 44, borderRadius: '0.375rem', background: 'var(--color-bg-base)', overflow: 'hidden', flexShrink: 0 }}>
                  {block.photoUrl ? (
                    <img src={block.photoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                      <Mountain size={18} style={{ opacity: 0.3 }} />
                    </div>
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <span style={{ color: 'var(--color-text-primary)', fontWeight: 500, fontSize: '0.85rem' }}>{block.wallName}</span>
                    <span style={{ fontSize: '0.7rem', padding: '0.125rem 0.5rem', borderRadius: '999px',
                      background: 'rgba(232,125,62,0.15)', color: 'var(--color-accent-primary)', fontWeight: 600 }}>
                      V{block.proposedDifficultyV}
                    </span>
                    <span style={{ fontSize: '0.7rem', padding: '0.125rem 0.5rem', borderRadius: '999px',
                      background: 'rgba(90,155,213,0.15)', color: 'var(--color-state-info)', fontWeight: 500 }}>
                      {block.categoryColorName}
                    </span>
                    {!block.active && <span style={{ fontSize: '0.65rem', padding: '0.125rem 0.5rem', borderRadius: '999px',
                      background: 'rgba(216,76,76,0.1)', color: 'var(--color-state-error)', fontWeight: 600 }}>Inactivo</span>}
                  </div>
                  <div style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem', marginTop: '0.125rem' }}>
                    {block.routeSetterName} · {formatBlockDate(block.createdAt)} · ⭐ {block.avgRating?.toFixed(1) || '—'} · 👀 {block.totalAttempts ?? 0} intentos
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.375rem', flexShrink: 0 }}>
                  <button onClick={() => toggleActive(block.id, block.active)}
                    title={block.active ? 'Desactivar' : 'Activar'}
                    style={{
                      padding: '0.375rem', borderRadius: '0.375rem', border: 'none', cursor: 'pointer',
                      background: block.active ? 'rgba(216,76,76,0.1)' : 'rgba(74,158,110,0.1)',
                      color: block.active ? 'var(--color-state-error)' : 'var(--color-state-success)',
                      display: 'flex',
                    }}>
                    {block.active ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                  <button onClick={() => { setConfirmDelete(block.id); setDeleteWord(''); }}
                    title="Eliminar bloque"
                    style={{
                      padding: '0.375rem', borderRadius: '0.375rem', border: 'none', cursor: 'pointer',
                      background: 'rgba(216,76,76,0.1)', color: 'var(--color-state-error)', display: 'flex',
                    }}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {/* Confirmación de eliminación */}
              {confirmDelete === block.id && (
                <div style={{
                  marginTop: '0.5rem', padding: '1rem', background: 'rgba(216,76,76,0.08)',
                  border: '1px solid rgba(216,76,76,0.25)', borderRadius: '0.5rem',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                    <AlertTriangle size={18} style={{ color: 'var(--color-state-error)', flexShrink: 0 }} />
                    <span style={{ color: 'var(--color-state-error)', fontWeight: 600, fontSize: '0.85rem' }}>
                      ¿Eliminar {block.wallName}? Esta acción no se puede deshacer.
                    </span>
                  </div>
                  <p style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem', marginBottom: '0.5rem' }}>
                    Escribe <strong>ELIMINAR</strong> para confirmar:
                  </p>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input value={deleteWord} onChange={(e) => setDeleteWord(e.target.value)}
                      placeholder="ELIMINAR"
                      style={{
                        flex: 1, padding: '0.5rem 0.75rem', background: 'var(--color-bg-base)',
                        border: '1px solid var(--color-border-default)', borderRadius: '0.375rem',
                        color: 'var(--color-text-primary)', fontSize: '0.85rem', outline: 'none',
                        textTransform: 'uppercase',
                      }}
                    />
                    <button onClick={() => handleDelete(block.id)} disabled={deleteWord !== 'ELIMINAR'}
                      style={{
                        padding: '0.5rem 1rem', borderRadius: '0.375rem', border: 'none', fontWeight: 600, fontSize: '0.8rem',
                        background: deleteWord === 'ELIMINAR' ? 'var(--color-state-error)' : 'var(--color-bg-hover)',
                        color: deleteWord === 'ELIMINAR' ? 'white' : 'var(--color-text-muted)',
                        cursor: deleteWord === 'ELIMINAR' ? 'pointer' : 'not-allowed',
                      }}>
                      Eliminar
                    </button>
                    <button onClick={() => { setConfirmDelete(null); setDeleteWord(''); }}
                      style={{
                        padding: '0.5rem 1rem', borderRadius: '0.375rem', border: '1px solid var(--color-border-default)',
                        background: 'transparent', color: 'var(--color-text-secondary)', cursor: 'pointer', fontSize: '0.8rem',
                      }}>
                      Cancelar
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
