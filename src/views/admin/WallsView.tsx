import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';

export function AdminWallsView() {
  const [walls, setWalls] = useState<{ id: string; name: string; active: boolean }[]>([]);
  const [newName, setNewName] = useState('');

  const addWall = () => {
    if (!newName.trim()) return;
    const id = crypto.randomUUID();
    setWalls(prev => [...prev, { id, name: newName.trim(), active: true }]);
    setNewName('');
  };

  const removeWall = (id: string) => {
    setWalls(prev => prev.filter(w => w.id !== id));
  };

  return (
    <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1.5rem', color: 'var(--color-text-primary)' }}>
        Gestión de Muros
      </h1>

      <div style={{
        background: 'var(--color-bg-surface)',
        border: '1px solid var(--color-border-subtle)',
        borderRadius: '0.75rem',
        padding: '1.5rem',
        marginBottom: '1.5rem',
      }}>
        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem' }}>
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addWall()}
            placeholder="Nombre del nuevo muro..."
            style={{
              flex: 1,
              padding: '0.75rem 1rem',
              background: 'var(--color-bg-base)',
              border: '1px solid var(--color-border-default)',
              borderRadius: '0.5rem',
              color: 'var(--color-text-primary)',
              fontSize: '0.9rem',
              outline: 'none',
            }}
          />
          <button
            onClick={addWall}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.75rem 1.25rem',
              background: 'var(--color-accent-primary)',
              color: 'var(--color-text-inverse)',
              border: 'none',
              borderRadius: '0.5rem',
              fontWeight: 600,
              cursor: 'pointer',
              fontSize: '0.9rem',
            }}
          >
            <Plus size={18} /> Agregar
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
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.75rem 1rem',
                background: 'var(--color-bg-base)',
                borderRadius: '0.5rem',
                border: '1px solid var(--color-border-subtle)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span style={{ color: 'var(--color-text-primary)' }}>{wall.name}</span>
                  <span style={{
                    fontSize: '0.75rem',
                    padding: '0.125rem 0.5rem',
                    borderRadius: '999px',
                    background: wall.active ? 'rgba(74,158,110,0.15)' : 'rgba(216,76,76,0.15)',
                    color: wall.active ? 'var(--color-state-success)' : 'var(--color-state-error)',
                  }}>
                    {wall.active ? 'Activo' : 'Inactivo'}
                  </span>
                </div>
                <button
                  onClick={() => removeWall(wall.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                    padding: '0.375rem 0.75rem',
                    background: 'rgba(216,76,76,0.1)',
                    color: 'var(--color-state-error)',
                    border: 'none',
                    borderRadius: '0.375rem',
                    cursor: 'pointer',
                    fontSize: '0.8rem',
                  }}
                >
                  <Trash2 size={14} /> Eliminar
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <p style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>
        ⚠️ Los muros se guardarán en Firestore al conectar Firebase. Por ahora es vista previa local.
      </p>
    </div>
  );
}
