import { useState, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Upload, Camera, X } from 'lucide-react';

const PRESET_HOLD_COLORS = [
  '#F5D742', '#4ADE80', '#60A5FA', '#F87171',
  '#C084FC', '#FB923C', '#374151', '#F3F4F6',
  '#EC4899', '#14B8A6',
];

export function RouteSetterCreateBlockView() {
  const { profile } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [photo, setPhoto] = useState<{ file: File; preview: string } | null>(null);
  const [wall, setWall] = useState('');
  const [category, setCategory] = useState('');
  const [holdColors, setHoldColors] = useState<string[]>([]);
  const [difficulty, setDifficulty] = useState(6);
  const [comments, setComments] = useState('');

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhoto({
      file,
      preview: URL.createObjectURL(file),
    });
  };

  const toggleHoldColor = (color: string) => {
    setHoldColors(prev =>
      prev.includes(color) ? prev.filter(c => c !== color) : [...prev, color]
    );
  };

  const handleSubmit = () => {
    // TODO: Implement Firestore save
    console.log({ photo, wall, category, holdColors, difficulty, comments, routeSetter: profile?.displayName });
  };

  return (
    <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1.5rem', color: 'var(--color-text-primary)' }}>
        Nuevo Bloque
      </h1>

      <div style={{
        background: 'var(--color-bg-surface)',
        border: '1px solid var(--color-border-subtle)',
        borderRadius: '0.75rem',
        padding: '1.5rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.25rem',
      }}>
        {/* Foto */}
        <div>
          <label style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem', display: 'block' }}>
            Foto del bloque *
          </label>
          {photo ? (
            <div style={{ position: 'relative', display: 'inline-block' }}>
              <img
                src={photo.preview}
                alt="Preview"
                style={{
                  maxWidth: '100%',
                  maxHeight: 300,
                  borderRadius: '0.5rem',
                  objectFit: 'cover',
                }}
              />
              <button
                onClick={() => { setPhoto(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                style={{
                  position: 'absolute',
                  top: 8,
                  right: 8,
                  background: 'rgba(0,0,0,0.7)',
                  border: 'none',
                  borderRadius: '50%',
                  width: 32,
                  height: 32,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: 'white',
                }}
              >
                <X size={18} />
              </button>
              <p style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                Se convertirá a WebP automáticamente
              </p>
            </div>
          ) : (
            <div
              onClick={() => fileInputRef.current?.click()}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '2rem',
                border: '2px dashed var(--color-border-default)',
                borderRadius: '0.5rem',
                cursor: 'pointer',
                color: 'var(--color-text-muted)',
                transition: 'border-color 0.2s',
              }}
              onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--color-accent-primary)'}
              onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--color-border-default)'}
            >
              <Camera size={32} style={{ marginBottom: '0.75rem', opacity: 0.5 }} />
              <span>Haz clic para subir una foto</span>
              <span style={{ fontSize: '0.8rem', marginTop: '0.25rem' }}>Se convertirá a WebP (máximo 10MB)</span>
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handlePhoto}
            style={{ display: 'none' }}
          />
        </div>

        {/* Muro */}
        <div>
          <label style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem', display: 'block' }}>
            Muro *
          </label>
          <select
            value={wall}
            onChange={(e) => setWall(e.target.value)}
            style={{
              width: '100%',
              padding: '0.75rem 1rem',
              background: 'var(--color-bg-base)',
              border: '1px solid var(--color-border-default)',
              borderRadius: '0.5rem',
              color: wall ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
              fontSize: '0.9rem',
              outline: 'none',
            }}
          >
            <option value="">Seleccionar muro...</option>
            <option value="muro1">Muro Principal</option>
            <option value="muro2">Muro Secundario</option>
          </select>
        </div>

        {/* Categoría de color */}
        <div>
          <label style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem', display: 'block' }}>
            Categoría de color (dificultad) *
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            style={{
              width: '100%',
              padding: '0.75rem 1rem',
              background: 'var(--color-bg-base)',
              border: '1px solid var(--color-border-default)',
              borderRadius: '0.5rem',
              color: category ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
              fontSize: '0.9rem',
              outline: 'none',
            }}
          >
            <option value="">Seleccionar categoría...</option>
            <option value="amarillo">Amarillo (V0-V1)</option>
            <option value="verde">Verde (V2-V3)</option>
            <option value="azul">Azul (V4-V5)</option>
          </select>
        </div>

        {/* Colores de presas */}
        <div>
          <label style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem', display: 'block' }}>
            Colores de las presas *
          </label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {PRESET_HOLD_COLORS.map((color) => {
              const selected = holdColors.includes(color);
              return (
                <button
                  key={color}
                  onClick={() => toggleHoldColor(color)}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: '50%',
                    background: color,
                    border: selected ? '3px solid var(--color-accent-primary)' : '2px solid transparent',
                    cursor: 'pointer',
                    outline: selected ? '2px solid var(--color-accent-primary)' : 'none',
                    boxShadow: selected ? '0 0 8px rgba(232,125,62,0.5)' : 'none',
                    transition: 'all 0.15s',
                  }}
                  title={color}
                />
              );
            })}
          </div>
          {holdColors.length > 0 && (
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem', marginTop: '0.375rem' }}>
              {holdColors.length} color{holdColors.length > 1 ? 'es' : ''} seleccionado{holdColors.length > 1 ? 's' : ''}
            </p>
          )}
        </div>

        {/* Dificultad V */}
        <div>
          <label style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem', display: 'block' }}>
            Dificultad propuesta (V{'{difficulty}'}) *
          </label>
          <input
            type="range"
            min={1}
            max={14}
            value={difficulty}
            onChange={(e) => setDifficulty(Number(e.target.value))}
            style={{ width: '100%', accentColor: 'var(--color-accent-primary)' }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
            <span>V1</span>
            <span style={{ fontWeight: 700, color: 'var(--color-accent-primary)' }}>V{difficulty}</span>
            <span>V14</span>
          </div>
        </div>

        {/* Comentarios */}
        <div>
          <label style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem', display: 'block' }}>
            Comentarios
          </label>
          <textarea
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            placeholder="Describe el bloque: tipo de presas, movimientos clave, estilo..."
            rows={4}
            style={{
              width: '100%',
              padding: '0.75rem 1rem',
              background: 'var(--color-bg-base)',
              border: '1px solid var(--color-border-default)',
              borderRadius: '0.5rem',
              color: 'var(--color-text-primary)',
              fontSize: '0.9rem',
              outline: 'none',
              resize: 'vertical',
              fontFamily: 'inherit',
            }}
          />
        </div>

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={!photo || !wall || !category}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            padding: '0.875rem 1.5rem',
            background: (!photo || !wall || !category) ? 'var(--color-bg-hover)' : 'var(--color-accent-primary)',
            color: (!photo || !wall || !category) ? 'var(--color-text-muted)' : 'var(--color-text-inverse)',
            border: 'none',
            borderRadius: '0.5rem',
            fontWeight: 600,
            fontSize: '1rem',
            cursor: (!photo || !wall || !category) ? 'not-allowed' : 'pointer',
          }}
        >
          <Upload size={18} />
          Publicar Bloque
        </button>
      </div>
    </div>
  );
}
