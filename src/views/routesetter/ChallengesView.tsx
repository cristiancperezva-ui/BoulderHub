import { useState, useEffect } from 'react';
import { Medal, Plus, Star, Hammer, Save, Check, Mountain, Search, X, Trash2 } from 'lucide-react';
import { getAllDocs, createDoc, deleteDocById } from '@/lib/firestore';
import { useAuth } from '@/hooks/useAuth';
import type { Block, Challenge, ChallengeBlock, FirestoreDoc } from '@/types';

export function RouteSetterChallengesView() {
  const { user, profile } = useAuth();
  const [challenges, setChallenges] = useState<FirestoreDoc<Challenge>[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  // Create form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [blocks, setBlocks] = useState<FirestoreDoc<Block>[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);

  const loadChallenges = async () => {
    try {
      const data = await getAllDocs<Challenge>('challenges', 'createdAt');
      setChallenges(data);
    } catch (e) { console.warn(e); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    loadChallenges();
    getAllDocs<Block>('blocks', 'createdAt')
      .then(d => setBlocks(d.filter(b => b.active !== false)))
      .catch(() => {});
  }, []);

  const toggleBlock = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const filteredBlocks = blocks.filter(b => {
    if (!search) return true;
    const q = search.toLowerCase();
    return b.wallName?.toLowerCase().includes(q) ||
           b.categoryColorName?.toLowerCase().includes(q) ||
           String(b.proposedDifficultyV).includes(q);
  });

  const handleCreate = async () => {
    if (!name.trim() || selected.size === 0 || !user) return;
    setSaving(true);
    try {
      const buildBlocks = (ids: Set<string>): ChallengeBlock[] =>
        Array.from(ids).map(id => blocks.find(b => b.id === id)).filter(Boolean).map(b => ({
          blockId: b!.id,
          wallName: b!.wallName,
          photoUrl: b!.photoUrl,
          routeSetterName: b!.routeSetterName,
          proposedDifficultyV: b!.proposedDifficultyV,
          categoryColorName: b!.categoryColorName,
        }));

      const newChallenge: Partial<Challenge> = {
        name: name.trim(),
        description,
        creatorId: user.uid,
        creatorName: profile?.displayName ?? 'RouteSetter',
        creatorEmoji: profile?.emoji ?? null,
        isRouteSetterChallenge: true,
        blockIds: Array.from(selected),
        blocks: buildBlocks(selected),
        avgRating: 0,
        totalResults: 0,
        active: true,
      };
      await createDoc<Challenge>('challenges', newChallenge);
      setShowCreate(false);
      setName('');
      setDescription('');
      setSelected(new Set());
      await loadChallenges();
    } catch (err) {
      console.error('Error creating challenge:', err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p style={{ color: 'var(--color-text-muted)', padding: '2rem', textAlign: 'center' }}>Cargando retos...</p>;

  return (
    <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0 0 0.25rem', color: 'var(--color-text-primary)' }}>
            🔨 Retos de RouteSetter
          </h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', margin: 0 }}>
            Propón retos para los escaladores. Se mostrarán con un 🔨
          </p>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            padding: '0.625rem 1.25rem',
            background: showCreate ? 'var(--color-bg-hover)' : 'var(--color-accent-primary)',
            color: showCreate ? 'var(--color-text-secondary)' : 'var(--color-text-inverse)',
            border: 'none', borderRadius: '0.5rem', fontWeight: 600,
            cursor: 'pointer', fontSize: '0.875rem',
          }}
        >
          {showCreate ? <X size={18} /> : <Plus size={18} />}
          {showCreate ? 'Cancelar' : 'Proponer reto'}
        </button>
      </div>

      {/* Create Form */}
      {showCreate && (
        <div style={{
          background: 'var(--color-bg-surface)', border: '1px solid var(--color-border-subtle)',
          borderRadius: '0.75rem', padding: '1.5rem', marginBottom: '1.5rem',
          display: 'flex', flexDirection: 'column', gap: '1.25rem',
        }}>
          <h3 style={{ color: 'var(--color-text-primary)', fontSize: '1rem', fontWeight: 600, margin: 0 }}>
            Nuevo reto de equipador
          </h3>

          <div>
            <label style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem', display: 'block' }}>
              Nombre del reto *
            </label>
            <input value={name} onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Desafío de Slab"
              style={{
                width: '100%', padding: '0.75rem 1rem', background: 'var(--color-bg-base)',
                border: '1px solid var(--color-border-default)', borderRadius: '0.5rem',
                color: 'var(--color-text-primary)', fontSize: '0.9rem', outline: 'none',
              }}
            />
          </div>

          <div>
            <label style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem', display: 'block' }}>
              Descripción
            </label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe el reto: qué tipo de bloques incluye, para qué nivel es..."
              rows={3}
              style={{
                width: '100%', padding: '0.75rem 1rem', background: 'var(--color-bg-base)',
                border: '1px solid var(--color-border-default)', borderRadius: '0.5rem',
                color: 'var(--color-text-primary)', fontSize: '0.9rem',
                outline: 'none', resize: 'vertical', fontFamily: 'inherit',
              }}
            />
          </div>

          {/* Block selector */}
          <div>
            <label style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem', display: 'block' }}>
              Bloques del reto ({selected.size} seleccionados)
            </label>
            <div style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              padding: '0.5rem 0.75rem', background: 'var(--color-bg-base)',
              border: '1px solid var(--color-border-default)', borderRadius: '0.375rem', marginBottom: '0.75rem',
            }}>
              <Search size={16} style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />
              <input value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Filtrar bloques..."
                style={{ flex: 1, background: 'none', border: 'none', color: 'var(--color-text-primary)', fontSize: '0.85rem', outline: 'none' }}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: 300, overflowY: 'auto' }}>
              {filteredBlocks.length === 0 ? (
                <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', textAlign: 'center', padding: '1rem' }}>
                  No hay bloques disponibles.
                </p>
              ) : filteredBlocks.map((block) => {
                const isSelected = selected.has(block.id);
                return (
                  <div key={block.id} onClick={() => toggleBlock(block.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer',
                      padding: '0.75rem', background: isSelected ? 'var(--color-bg-hover)' : 'var(--color-bg-base)',
                      borderRadius: '0.5rem', border: `1px solid ${isSelected ? 'var(--color-accent-primary)' : 'var(--color-border-subtle)'}`,
                      transition: 'border-color 0.15s',
                    }}
                  >
                    {block.photoUrl ? (
                      <img src={block.photoUrl} alt="" style={{ width: 48, height: 48, borderRadius: '0.375rem', objectFit: 'cover', flexShrink: 0 }} />
                    ) : (
                      <div style={{ width: 48, height: 48, borderRadius: '0.375rem', background: 'var(--color-bg-elevated)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Mountain size={20} style={{ opacity: 0.4, color: 'var(--color-text-muted)' }} />
                      </div>
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ color: 'var(--color-text-primary)', fontWeight: 500, fontSize: '0.85rem' }}>{block.wallName}</span>
                        <span style={{
                          fontSize: '0.7rem', padding: '0.125rem 0.375rem', borderRadius: '999px',
                          background: 'rgba(232,125,62,0.15)', color: 'var(--color-accent-primary)', fontWeight: 600,
                        }}>
                          V{block.proposedDifficultyV}
                        </span>
                      </div>
                      <span style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>
                        {block.categoryColorName} · {block.routeSetterName}
                      </span>
                    </div>
                    <div style={{
                      width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
                      background: isSelected ? 'var(--color-accent-primary)' : 'transparent',
                      border: `2px solid ${isSelected ? 'var(--color-accent-primary)' : 'var(--color-border-default)'}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {isSelected && <Check size={14} color="var(--color-text-inverse)" />}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <button onClick={handleCreate} disabled={!name.trim() || selected.size === 0 || saving}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
              padding: '0.75rem 1.5rem',
              background: (!name.trim() || selected.size === 0 || saving) ? 'var(--color-bg-hover)' : 'var(--color-accent-primary)',
              color: (!name.trim() || selected.size === 0 || saving) ? 'var(--color-text-muted)' : 'var(--color-text-inverse)',
              border: 'none', borderRadius: '0.5rem', fontWeight: 600,
              cursor: (!name.trim() || selected.size === 0 || saving) ? 'not-allowed' : 'pointer', fontSize: '0.95rem',
            }}
          >
            <Save size={18} /> {saving ? 'Creando...' : 'Publicar reto'}
          </button>
        </div>
      )}

      {/* Challenge List */}
      {challenges.length === 0 ? (
        <div style={{
          background: 'var(--color-bg-surface)', border: '1px solid var(--color-border-subtle)',
          borderRadius: '0.75rem', padding: '3rem 2rem', textAlign: 'center',
        }}>
          <Medal size={48} style={{ margin: '0 auto 1rem', opacity: 0.4, color: 'var(--color-text-muted)' }} />
          <p style={{ color: 'var(--color-text-secondary)', marginBottom: '0.5rem' }}>
            Aún no hay retos
          </p>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
            Propón tu primer reto para los escaladores del gimnasio.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {challenges.map((ch) => (
            <div key={ch.id} style={{
              background: 'var(--color-bg-surface)',
              border: '1px solid var(--color-border-subtle)',
              borderRadius: '0.75rem',
              padding: '1.25rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <h3 style={{
                  color: 'var(--color-text-primary)', fontWeight: 600, margin: '0 0 0.25rem', fontSize: '1rem',
                  display: 'flex', alignItems: 'center', gap: '0.5rem',
                }}>
                  {ch.isRouteSetterChallenge && <Hammer size={16} style={{ color: 'var(--color-accent-primary)' }} />}
                  {ch.name}
                </h3>
                <p style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem', margin: 0 }}>
                  {ch.isRouteSetterChallenge ? '🔨 ' : ''}Por {ch.creatorName} · {ch.blocks?.length ?? 0} bloques · {ch.totalResults} resultados
                </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', color: 'var(--color-accent-tertiary)' }}>
                  <Star size={16} fill="var(--color-accent-tertiary)" />
                  <span style={{ fontWeight: 600 }}>{ch.avgRating.toFixed(1)}</span>
                </div>
                <button onClick={async () => {
                  if (window.confirm('¿Eliminar este reto definitivamente?')) {
                    try {
                      await deleteDocById('challenges', ch.id);
                      setChallenges(prev => prev.filter(c => c.id !== ch.id));
                    } catch (e) { console.error(e); }
                  }
                }}
                  style={{
                    background: 'rgba(216,76,76,0.1)', border: 'none', borderRadius: '0.375rem',
                    padding: '0.375rem', cursor: 'pointer', color: 'var(--color-state-error)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                  title="Eliminar reto"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
