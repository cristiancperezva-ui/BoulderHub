import { useState } from 'react';
import { Palette, Trash2 } from 'lucide-react';

interface ColorCat {
  id: string;
  name: string;
  color: string;
  difficulty: string;
  order: number;
}

const PRESET_COLORS = [
  { name: 'Amarillo', color: '#F5D742', difficulty: 'V0-V1' },
  { name: 'Verde', color: '#4ADE80', difficulty: 'V2-V3' },
  { name: 'Azul', color: '#60A5FA', difficulty: 'V4-V5' },
  { name: 'Rojo', color: '#F87171', difficulty: 'V6-V7' },
  { name: 'Naranja', color: '#FB923C', difficulty: 'V8-V9' },
  { name: 'Púrpura', color: '#C084FC', difficulty: 'V10-V11' },
  { name: 'Negro', color: '#374151', difficulty: 'V12-V13' },
  { name: 'Blanco', color: '#F3F4F6', difficulty: 'V14' },
];

export function AdminCategoriesView() {
  const [categories, setCategories] = useState<ColorCat[]>([]);

  const addPreset = (preset: typeof PRESET_COLORS[0]) => {
    if (categories.some(c => c.name === preset.name)) return;
    setCategories(prev => [...prev, {
      id: crypto.randomUUID(),
      ...preset,
      order: prev.length,
    }]);
  };

  const removeCat = (id: string) => {
    setCategories(prev => prev.filter(c => c.id !== id));
  };

  return (
    <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1.5rem', color: 'var(--color-text-primary)' }}>
        Categorías por Color
      </h1>

      <div style={{
        background: 'var(--color-bg-surface)',
        border: '1px solid var(--color-border-subtle)',
        borderRadius: '0.75rem',
        padding: '1.5rem',
        marginBottom: '1.5rem',
      }}>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem', marginBottom: '1rem' }}>
          Cada color representa una dificultad en la escala "V". Selecciona los que uses en tu gimnasio.
        </p>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1.5rem' }}>
          {PRESET_COLORS.map((preset) => {
            const isAdded = categories.some(c => c.name === preset.name);
            return (
              <button
                key={preset.name}
                onClick={() => addPreset(preset)}
                disabled={isAdded}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.5rem 1rem',
                  background: isAdded ? 'var(--color-bg-hover)' : preset.color,
                  color: isAdded ? 'var(--color-text-muted)' : (
                    ['#374151', '#F3F4F6'].includes(preset.color) ? 'var(--color-text-primary)' : '#1C1512'
                  ),
                  border: `2px solid ${preset.color}`,
                  borderRadius: '999px',
                  cursor: isAdded ? 'not-allowed' : 'pointer',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  opacity: isAdded ? 0.5 : 1,
                }}
              >
                <Palette size={14} />
                {preset.name} ({preset.difficulty})
              </button>
            );
          })}
        </div>

        {categories.length === 0 ? (
          <p style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: '1rem' }}>
            Haz clic en los colores de arriba para agregar categorías.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {categories
              .sort((a, b) => a.order - b.order)
              .map((cat) => (
                <div key={cat.id} style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.75rem 1rem',
                  background: 'var(--color-bg-base)',
                  borderRadius: '0.5rem',
                  border: '1px solid var(--color-border-subtle)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{
                      width: 24,
                      height: 24,
                      borderRadius: '50%',
                      background: cat.color,
                      border: '1px solid rgba(255,255,255,0.1)',
                    }} />
                    <div>
                      <span style={{ color: 'var(--color-text-primary)', fontWeight: 500 }}>{cat.name}</span>
                      <span style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem', marginLeft: '0.75rem' }}>
                        {cat.difficulty}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => removeCat(cat.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '0.375rem',
                      background: 'rgba(216,76,76,0.1)',
                      color: 'var(--color-state-error)',
                      border: 'none',
                      borderRadius: '0.375rem',
                      cursor: 'pointer',
                    }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
