import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Save, Check, Mountain, Search } from 'lucide-react';
import { getAllDocs, createDoc } from '@/lib/firestore';
import { useAuth } from '@/hooks/useAuth';
import type { Block, Challenge, ChallengeBlock, FirestoreDoc } from '@/types';

export function ClimberCreateChallengeView() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [blocks, setBlocks] = useState<FirestoreDoc<Block>[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
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

  const filtered = blocks.filter(b => {
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

      const isRouteSetter = profile?.roles?.includes('routesetter') ?? false;
      const newChallenge: Partial<Challenge> = {
        name: name.trim(),
        description,
        creatorId: user.uid,
        creatorName: profile?.displayName ?? 'Escalador',
        creatorEmoji: profile?.emoji ?? null,
        isRouteSetterChallenge: isRouteSetter,
        blockIds: Array.from(selected),
        blocks: buildBlocks(selected),
        avgRating: 0,
        totalResults: 0,
        active: true,
      };
      await createDoc<Challenge>('challenges', newChallenge);
      navigate('/climber/challenges');
    } catch (err) {
      console.error('Error creating challenge:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
      <Link to="/climber/challenges" style={{
        display: 'inline-flex', alignItems: 'center', gap: '0.375rem',
        color: 'var(--color-text-secondary)', fontSize: '0.875rem',
        marginBottom: '1rem', textDecoration: 'none',
      }}>
        <ArrowLeft size={16} /> Volver a retos
      </Link>

      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1.5rem', color: 'var(--color-text-primary)' }}>
        Crear Reto
      </h1>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', alignItems: 'start' }}>
        {/* Formulario */}
        <div style={{
          background: 'var(--color-bg-surface)', border: '1px solid var(--color-border-subtle)',
          borderRadius: '0.75rem', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem',
        }}>
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
          <div style={{
            padding: '1rem', background: 'var(--color-bg-base)', borderRadius: '0.5rem',
            border: '1px solid var(--color-border-subtle)',
          }}>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.85rem', fontWeight: 500, margin: '0 0 0.5rem' }}>
              Bloques seleccionados: <strong>{selected.size}</strong>
            </p>
            {selected.size === 0 ? (
              <p style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem', margin: 0 }}>
                Selecciona bloques de la lista de la derecha.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', maxHeight: 200, overflowY: 'auto' }}>
                {Array.from(selected).map(id => {
                  const b = blocks.find(bl => bl.id === id);
                  return b ? (
                    <div key={id} style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '0.375rem 0.5rem', background: 'var(--color-bg-surface)',
                      borderRadius: '0.375rem', fontSize: '0.8rem',
                    }}>
                      <span style={{ color: 'var(--color-text-primary)' }}>{b.wallName} · V{b.proposedDifficultyV}</span>
                      <button onClick={() => toggleBlock(id)}
                        style={{ background: 'none', border: 'none', color: 'var(--color-state-error)', cursor: 'pointer', fontSize: '0.75rem' }}>
                        Quitar
                      </button>
                    </div>
                  ) : null;
                })}
              </div>
            )}
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
            <Save size={18} /> {saving ? 'Creando...' : 'Crear reto'}
          </button>
        </div>

        {/* Lista de bloques */}
        <div style={{
          background: 'var(--color-bg-surface)', border: '1px solid var(--color-border-subtle)',
          borderRadius: '0.75rem', padding: '1.5rem',
        }}>
          <h3 style={{ color: 'var(--color-text-primary)', fontSize: '0.95rem', fontWeight: 600, marginBottom: '0.75rem' }}>
            Bloques disponibles
          </h3>
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: 400, overflowY: 'auto' }}>
            {filtered.length === 0 ? (
              <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', textAlign: 'center', padding: '2rem' }}>
                No hay bloques disponibles.
              </p>
            ) : filtered.map((block) => {
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
      </div>
    </div>
  );
}
