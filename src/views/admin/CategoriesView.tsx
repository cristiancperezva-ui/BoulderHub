import { useState, useEffect } from 'react';
import { Palette, Trash2, Edit2, Save, X, Plus } from 'lucide-react';
import { createDoc, getAllDocs, updateDocById } from '@/lib/firestore';
import type { ColorCategory, FirestoreDoc } from '@/types';

const DEFAULT_CATS = [
  { name: 'Naranja', color: '#FB923C' },
  { name: 'Azul', color: '#60A5FA' },
  { name: 'Verde', color: '#4ADE80' },
  { name: 'Amarillo', color: '#F5D742' },
  { name: 'Rojo', color: '#F87171' },
  { name: 'Negro', color: '#374151' },
];

export function AdminCategoriesView() {
  const [categories, setCategories] = useState<FirestoreDoc<ColorCategory>[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('#888888');
  const [showAdd, setShowAdd] = useState(false);
  const [addName, setAddName] = useState('');
  const [addColor, setAddColor] = useState('#E87D3E');

  const load = async () => {
    try {
      const data = await getAllDocs<ColorCategory>('colorCategories', 'order');
      if (data.length === 0) {
        // Seed defaults if empty
        for (const cat of DEFAULT_CATS) {
          await createDoc<ColorCategory>('colorCategories', {
            name: cat.name, color: cat.color, order: DEFAULT_CATS.indexOf(cat), active: true,
          } as Partial<ColorCategory>);
        }
        const seeded = await getAllDocs<ColorCategory>('colorCategories', 'order');
        setCategories(seeded);
      } else {
        setCategories(data.filter(c => c.active !== false));
      }
    } catch (e) { console.warn('Categories load:', e); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const addCategory = async () => {
    if (!addName.trim()) return;
    try {
      await createDoc<ColorCategory>('colorCategories', {
        name: addName.trim(), color: addColor, order: categories.length, active: true,
      } as Partial<ColorCategory>);
      setAddName(''); setAddColor('#E87D3E'); setShowAdd(false);
      await load();
    } catch (e) { console.error(e); }
  };

  const removeCat = async (id: string) => {
    try {
      await updateDocById<ColorCategory>('colorCategories', id, { active: false } as Partial<ColorCategory>);
      await load();
    } catch (e) { console.error(e); }
  };

  const startEdit = (cat: FirestoreDoc<ColorCategory>) => {
    setEditingId(cat.id); setEditName(cat.name); setEditColor(cat.color);
  };

  const saveEdit = async () => {
    if (!editingId || !editName.trim()) return;
    try {
      await updateDocById<ColorCategory>('colorCategories', editingId, {
        name: editName.trim(), color: editColor,
      } as Partial<ColorCategory>);
      setEditingId(null); await load();
    } catch (e) { console.error(e); }
  };

  if (loading) return <p style={{ color: 'var(--color-text-muted)' }}>Cargando...</p>;

  return (
    <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1.5rem', color: 'var(--color-text-primary)' }}>
        Categorías por Color
      </h1>

      <div style={{
        background: 'var(--color-bg-surface)', border: '1px solid var(--color-border-subtle)',
        borderRadius: '0.75rem', padding: '1.5rem', marginBottom: '1.5rem',
      }}>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem', marginBottom: '1rem' }}>
          Colores disponibles en el gimnasio. No están asociados a un grado V — los routesetters propondrán la dificultad.
        </p>

        <button onClick={() => setShowAdd(!showAdd)}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.375rem',
            padding: '0.5rem 1rem', background: 'var(--color-bg-base)',
            border: '1px dashed var(--color-border-default)', borderRadius: '999px',
            color: 'var(--color-text-secondary)', cursor: 'pointer', fontSize: '0.85rem', marginBottom: '1rem',
          }}
        >
          <Palette size={14} /> {showAdd ? 'Cancelar' : 'Agregar color'}
        </button>

        {showAdd && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap',
            padding: '1rem', background: 'var(--color-bg-base)', borderRadius: '0.5rem', marginBottom: '1rem',
          }}>
            <input
              value={addName} onChange={(e) => setAddName(e.target.value)}
              placeholder="Nombre del color..."
              style={{
                flex: 1, minWidth: 120, padding: '0.5rem 0.75rem', background: 'var(--color-bg-elevated)',
                border: '1px solid var(--color-border-default)', borderRadius: '0.375rem',
                color: 'var(--color-text-primary)', fontSize: '0.85rem', outline: 'none',
              }}
            />
            <input
              type="color" value={addColor}
              onChange={(e) => setAddColor(e.target.value)}
              style={{ width: 40, height: 40, padding: 0, border: 'none', borderRadius: '0.375rem', cursor: 'pointer', background: 'none' }}
            />
            <button onClick={addCategory} disabled={!addName.trim()}
              style={{
                padding: '0.5rem 1rem', background: addName.trim() ? 'var(--color-accent-primary)' : 'var(--color-bg-hover)',
                color: addName.trim() ? 'var(--color-text-inverse)' : 'var(--color-text-muted)',
                border: 'none', borderRadius: '0.375rem', cursor: addName.trim() ? 'pointer' : 'not-allowed',
                fontWeight: 600, fontSize: '0.85rem',
              }}
            >
              <Plus size={16} /> Agregar
            </button>
          </div>
        )}

        {categories.length === 0 ? (
          <p style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: '1rem' }}>Sin categorías.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {categories.map((cat) => (
              <div key={cat.id} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '0.75rem 1rem', background: 'var(--color-bg-base)',
                borderRadius: '0.5rem', border: '1px solid var(--color-border-subtle)',
              }}>
                {editingId === cat.id ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1 }}>
                    <input
                      value={editName} onChange={(e) => setEditName(e.target.value)}
                      style={{
                        flex: 1, padding: '0.5rem 0.75rem', background: 'var(--color-bg-elevated)',
                        border: '1px solid var(--color-accent-primary)', borderRadius: '0.375rem',
                        color: 'var(--color-text-primary)', fontSize: '0.85rem', outline: 'none',
                      }}
                    />
                    <input type="color" value={editColor} onChange={(e) => setEditColor(e.target.value)}
                      style={{ width: 36, height: 36, padding: 0, border: 'none', borderRadius: '0.375rem', cursor: 'pointer', background: 'none' }}
                    />
                    <button onClick={saveEdit} style={{ background: 'none', border: 'none', color: 'var(--color-state-success)', cursor: 'pointer' }}><Save size={16} /></button>
                    <button onClick={() => setEditingId(null)} style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer' }}><X size={16} /></button>
                  </div>
                ) : (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{ width: 24, height: 24, borderRadius: '50%', background: cat.color, border: '1px solid rgba(255,255,255,0.1)' }} />
                      <span style={{ color: 'var(--color-text-primary)', fontWeight: 500 }}>{cat.name}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '0.375rem' }}>
                      <button onClick={() => startEdit(cat)}
                        style={{ display: 'flex', padding: '0.375rem', background: 'rgba(90,155,213,0.1)',
                          color: 'var(--color-state-info)', border: 'none', borderRadius: '0.375rem', cursor: 'pointer' }}>
                        <Edit2 size={14} />
                      </button>
                      <button onClick={() => removeCat(cat.id)}
                        style={{ display: 'flex', padding: '0.375rem', background: 'rgba(216,76,76,0.1)',
                          color: 'var(--color-state-error)', border: 'none', borderRadius: '0.375rem', cursor: 'pointer' }}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
