import { useState } from 'react';
import { Plus, Trash2, Edit2, Save, X } from 'lucide-react';
import { useAdminWalls, useCreateWall, useUpdateWall, useDeactivateWall } from '@/hooks/useAdminData';
import type { Wall } from '@/types';

export function AdminWallsView() {
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [saving, setSaving] = useState(false);

  // ✅ Datos cacheados 10 min
  const { data: walls = [], isLoading } = useAdminWalls();
  const createWall = useCreateWall();
  const updateWall = useUpdateWall();
  const deactivateWall = useDeactivateWall();

  const addWall = async () => {
    if (!newName.trim()) return;
    setSaving(true);
    try {
      await createWall.mutateAsync(newName.trim());
      setNewName('');
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  };

  const removeWall = async (id: string) => {
    try {
      await deactivateWall.mutateAsync(id);
    } catch (e) { console.error(e); }
  };

  const startEdit = (wall: Wall & { id: string }) => {
    setEditingId(wall.id);
    setEditName(wall.name);
  };

  const saveEdit = async () => {
    if (!editingId || !editName.trim()) return;
    try {
      await updateWall.mutateAsync({ id: editingId, name: editName.trim() });
      setEditingId(null);
    } catch (e) { console.error(e); }
  };

  if (isLoading) return <p style={{ color: 'var(--color-text-muted)' }}>Cargando...</p>;

  return (
    <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1.5rem', color: 'var(--color-text-primary)' }}>
        Gestión de Muros
      </h1>

      <div style={{
        background: 'var(--color-bg-surface)',
        border: '1px solid var(--color-border-subtle)',
        borderRadius: '0.75rem', padding: '1.5rem', marginBottom: '1.5rem',
      }}>
        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem' }}>
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addWall()}
            placeholder="Nombre del nuevo muro..."
            style={{
              flex: 1, padding: '0.75rem 1rem', background: 'var(--color-bg-base)',
              border: '1px solid var(--color-border-default)', borderRadius: '0.5rem',
              color: 'var(--color-text-primary)', fontSize: '0.9rem', outline: 'none',
            }}
          />
          <button onClick={addWall} disabled={saving}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              padding: '0.75rem 1.25rem',
              background: saving ? 'var(--color-bg-hover)' : 'var(--color-accent-primary)',
              color: saving ? 'var(--color-text-muted)' : 'var(--color-text-inverse)',
              border: 'none', borderRadius: '0.5rem', fontWeight: 600,
              cursor: saving ? 'not-allowed' : 'pointer', fontSize: '0.9rem',
            }}
          >
            <Plus size={18} /> {saving ? 'Guardando...' : 'Agregar'}
          </button>
        </div>

        {walls.length === 0 ? (
          <p style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: '2rem' }}>
            No hay muros aún. Crea el primero arriba.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {walls.map((wall) => (
              <div key={wall.id} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '0.75rem 1rem', background: 'var(--color-bg-base)',
                borderRadius: '0.5rem', border: '1px solid var(--color-border-subtle)',
              }}>
                {editingId === wall.id ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1 }}>
                    <input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && saveEdit()}
                      style={{
                        flex: 1, padding: '0.5rem 0.75rem', background: 'var(--color-bg-elevated)',
                        border: '1px solid var(--color-accent-primary)', borderRadius: '0.375rem',
                        color: 'var(--color-text-primary)', fontSize: '0.9rem', outline: 'none',
                      }}
                    />
                    <button onClick={saveEdit} style={{ background: 'none', border: 'none', color: 'var(--color-state-success)', cursor: 'pointer' }}>
                      <Save size={16} />
                    </button>
                    <button onClick={() => setEditingId(null)} style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer' }}>
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <span style={{ color: 'var(--color-text-primary)' }}>{wall.name}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '0.375rem' }}>
                      <button onClick={() => startEdit(wall)}
                        style={{ display: 'flex', padding: '0.375rem', background: 'rgba(90,155,213,0.1)',
                          color: 'var(--color-state-info)', border: 'none', borderRadius: '0.375rem', cursor: 'pointer' }}>
                        <Edit2 size={14} />
                      </button>
                      <button onClick={() => removeWall(wall.id)}
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
