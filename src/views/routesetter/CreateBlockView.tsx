import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { uploadImageAsWebP } from '@/lib/storage';
import { createDoc, getAllDocs } from '@/lib/firestore';
import type { Block, Wall, ColorCategory, UserProfile, FirestoreDoc } from '@/types';
import { Camera, X, Save, CheckCircle } from 'lucide-react';

export function RouteSetterCreateBlockView() {
  const { user, profile } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [photo, setPhoto] = useState<{ file: File; preview: string } | null>(null);
  const [wall, setWall] = useState('');
  const [category, setCategory] = useState('');
  const [holdColors, setHoldColors] = useState<string[]>([]);
  const [difficulty, setDifficulty] = useState(6);
  const [comments, setComments] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadLabel, setUploadLabel] = useState('');

  // Datos desde Firestore (sin mocks)
  const [walls, setWalls] = useState<FirestoreDoc<Wall>[]>([]);
  const [categories, setCategories] = useState<FirestoreDoc<ColorCategory>[]>([]);
  const [newHoldColor, setNewHoldColor] = useState('#E87D3E');

  // RouteSetters parametrizados (para que un routesetter pueda documentar la ruta de otro)
  const [routesetters, setRoutesetters] = useState<FirestoreDoc<UserProfile>[]>([]);
  const [selectedRouteSetterId, setSelectedRouteSetterId] = useState('');

  useEffect(() => {
    getAllDocs<Wall>('walls').then(setWalls).catch(() => setWalls([]));
    getAllDocs<ColorCategory>('colorCategories').then(setCategories).catch(() => setCategories([]));
    // Cargar todos los routesetters
    getAllDocs<UserProfile>('users').then(users => {
      const rsetters = users.filter(u => u.roles?.includes('routesetter'));
      setRoutesetters(rsetters);
      // Pre-seleccionar el usuario actual si es routesetter
      if (user && rsetters.find(r => r.id === user.uid)) {
        setSelectedRouteSetterId(user.uid);
      } else if (rsetters.length > 0) {
        setSelectedRouteSetterId(rsetters[0].id);
      }
    }).catch(() => setRoutesetters([]));
  }, []);

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhoto({ file, preview: URL.createObjectURL(file) });
  };

  const addHoldColor = () => {
    if (!holdColors.includes(newHoldColor)) {
      setHoldColors(prev => [...prev, newHoldColor]);
    }
  };

  const removeHoldColor = (color: string) => {
    setHoldColors(prev => prev.filter(c => c !== color));
  };

  const handleSubmit = async () => {
    if (!photo || !wall || !category || !user) return;
    setSaving(true);
    setUploadProgress(0);
    setUploadLabel('Preparando...');
    try {
      // Subir foto como WebP (con progreso)
      const wallObj = walls.find(w => w.id === wall);
      const catObj = categories.find(c => c.id === category);
      const blockId = crypto.randomUUID();
      const photoPath = `blocks/${blockId}`;

      setUploadLabel('Optimizando imagen...');
      const photoUrl = await uploadImageAsWebP(photo.file, photoPath, (pct, label) => {
        setUploadProgress(pct);
        if (label) setUploadLabel(label);
      });

      setUploadLabel('Guardando en la base de datos...');
      setUploadProgress(0.9);

      // Guardar en Firestore
      const selectedRSetter = routesetters.find(r => r.id === selectedRouteSetterId);
      const newBlock: Partial<Block> = {
        wallId: wall,
        wallName: wallObj?.name ?? wall,
        routeSetterId: selectedRouteSetterId || user.uid,
        routeSetterName: selectedRSetter?.displayName ?? profile?.displayName ?? 'RouteSetter',
        photoUrl,
        categoryColorId: category,
        categoryColorName: catObj?.name ?? category,
        holdColors,
        proposedDifficultyV: difficulty,
        comments,
        active: true,
        avgRating: 0,
        totalAttempts: 0,
        flashCount: 0,
        encadenadoCount: 0,
        proyectoCount: 0,
      };
      await createDoc<Block>('blocks', newBlock);

      setUploadProgress(1);
      setUploadLabel('¡Publicado!');
      setSaved(true);
      // Reset form
      setPhoto(null);
      setWall('');
      setCategory('');
      setHoldColors([]);
      setDifficulty(6);
      setComments('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      setTimeout(() => {
        setSaved(false);
        setUploadProgress(0);
        setUploadLabel('');
      }, 3000);
    } catch (err) {
      console.error('Error al publicar bloque:', err);
      alert('Error al publicar el bloque. Revisa la consola para más detalles.');
    } finally {
      setSaving(false);
    }
  };

  const selectedCat = categories.find(c => c.id === category);

  return (
    <div style={{ animation: 'fadeIn 0.3s ease-out', maxWidth: 640, margin: '0 auto' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1.5rem', color: 'var(--color-text-primary)' }}>
        Nuevo Bloque
      </h1>

      {saved && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '0.5rem',
          padding: '0.75rem 1rem', marginBottom: '1rem',
          background: 'rgba(74,158,110,0.15)',
          border: '1px solid rgba(74,158,110,0.3)',
          borderRadius: '0.5rem',
          color: 'var(--color-state-success)',
          fontSize: '0.9rem',
        }}>
          <CheckCircle size={18} />
          ¡Bloque publicado exitosamente!
        </div>
      )}

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
            <div style={{ position: 'relative', display: 'inline-block', width: '100%' }}>
              <img
                src={photo.preview}
                alt="Preview"
                style={{ width: '100%', maxHeight: 300, borderRadius: '0.5rem', objectFit: 'cover' }}
              />
              <button
                onClick={() => { setPhoto(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                style={{
                  position: 'absolute', top: 8, right: 8,
                  background: 'rgba(0,0,0,0.7)', border: 'none', borderRadius: '50%',
                  width: 32, height: 32, display: 'flex', alignItems: 'center',
                  justifyContent: 'center', cursor: 'pointer', color: 'white',
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
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                justifyContent: 'center', padding: '2rem',
                border: '2px dashed var(--color-border-default)', borderRadius: '0.5rem',
                cursor: 'pointer', color: 'var(--color-text-muted)',
              }}
            >
              <Camera size={32} style={{ marginBottom: '0.75rem', opacity: 0.5 }} />
              <span>Haz clic para subir una foto</span>
              <span style={{ fontSize: '0.8rem', marginTop: '0.25rem' }}>Se convertirá a WebP</span>
            </div>
          )}
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePhoto} style={{ display: 'none' }} />
        </div>

        {/* Muro */}
        <div>
          <label style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem', display: 'block' }}>
            Muro *
          </label>
          {walls.length === 0 ? (
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', padding: '0.75rem', background: 'var(--color-bg-base)', borderRadius: '0.5rem' }}>
              No hay muros disponibles. El admin debe crear muros primero.
            </p>
          ) : (
            <select
              value={wall}
              onChange={(e) => setWall(e.target.value)}
              style={{
                width: '100%', padding: '0.75rem 1rem',
                background: 'var(--color-bg-base)',
                border: '1px solid var(--color-border-default)', borderRadius: '0.5rem',
                color: wall ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
                fontSize: '0.9rem', outline: 'none',
              }}
            >
              <option value="">Seleccionar muro...</option>
              {walls.map(w => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>
          )}
        </div>

        {/* Categoría de color */}
        <div>
          <label style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem', display: 'block' }}>
            Categoría de color *
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            style={{
              width: '100%', padding: '0.75rem 1rem',
              background: 'var(--color-bg-base)',
              border: '1px solid var(--color-border-default)', borderRadius: '0.5rem',
              color: category ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
              fontSize: '0.9rem', outline: 'none',
            }}
          >
            <option value="">Seleccionar categoría...</option>
            {categories.map(c => (
              <option key={c.id} value={c.id}>
                {c.name} {c.color ? '●' : ''}
              </option>
            ))}
          </select>
          {selectedCat && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.375rem' }}>
              <div style={{ width: 16, height: 16, borderRadius: '50%', background: selectedCat.color, border: '1px solid rgba(255,255,255,0.1)' }} />
              <span style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>{selectedCat.name}</span>
            </div>
          )}
        </div>

        {/* RouteSetter responsable */}
        <div>
          <label style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem', display: 'block' }}>
            RouteSetter responsable *
          </label>
          <select
            value={selectedRouteSetterId}
            onChange={(e) => setSelectedRouteSetterId(e.target.value)}
            style={{
              width: '100%', padding: '0.75rem 1rem',
              background: 'var(--color-bg-base)',
              border: '1px solid var(--color-border-default)', borderRadius: '0.5rem',
              color: 'var(--color-text-primary)',
              fontSize: '0.9rem', outline: 'none',
            }}
          >
            {routesetters.length === 0 && <option value="">No hay routesetters disponibles</option>}
            {routesetters.map(r => (
              <option key={r.id} value={r.id}>
                {r.displayName} {r.id === user?.uid ? '(tú)' : ''}
              </option>
            ))}
          </select>
          {selectedRouteSetterId && selectedRouteSetterId !== user?.uid && (
            <p style={{ color: 'var(--color-accent-tertiary)', fontSize: '0.75rem', marginTop: '0.25rem' }}>
              Estás documentando la ruta de otro routesetter
            </p>
          )}
        </div>

        {/* Colores de presas - Color Picker */}
        <div>
          <label style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem', display: 'block' }}>
            Colores de las presas
          </label>
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
            <input
              type="color"
              value={newHoldColor}
              onChange={(e) => setNewHoldColor(e.target.value)}
              style={{
                width: 44, height: 44, padding: 0, border: 'none',
                borderRadius: '0.5rem', cursor: 'pointer',
                background: 'none',
              }}
            />
            <button
              onClick={addHoldColor}
              style={{
                padding: '0.5rem 1rem',
                background: 'var(--color-accent-primary)',
                color: 'var(--color-text-inverse)',
                border: 'none', borderRadius: '0.5rem',
                cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem',
              }}
            >
              + Agregar color
            </button>
          </div>
          {holdColors.length > 0 ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {holdColors.map((color) => (
                <div key={color} style={{
                  display: 'flex', alignItems: 'center', gap: '0.375rem',
                  padding: '0.25rem 0.5rem 0.25rem 0.25rem',
                  background: 'var(--color-bg-base)',
                  border: '1px solid var(--color-border-subtle)',
                  borderRadius: '999px',
                }}>
                  <div style={{ width: 24, height: 24, borderRadius: '50%', background: color, border: '1px solid rgba(255,255,255,0.1)' }} />
                  <span style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>{color}</span>
                  <button
                    onClick={() => removeHoldColor(color)}
                    style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', padding: '0.125rem', fontSize: '0.8rem' }}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>Selecciona colores con el picker y agrégalos.</p>
          )}
        </div>

        {/* Dificultad V */}
        <div>
          <label style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem', display: 'block' }}>
            Dificultad propuesta *
          </label>
          <input
            type="range" min={1} max={14} value={difficulty}
            onChange={(e) => setDifficulty(Number(e.target.value))}
            style={{ width: '100%', accentColor: 'var(--color-accent-primary)' }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
            <span>V1</span>
            <span style={{ fontWeight: 700, fontSize: '1.125rem', color: 'var(--color-accent-primary)' }}>V{difficulty}</span>
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
            rows={3}
            style={{
              width: '100%', padding: '0.75rem 1rem',
              background: 'var(--color-bg-base)',
              border: '1px solid var(--color-border-default)', borderRadius: '0.5rem',
              color: 'var(--color-text-primary)', fontSize: '0.9rem',
              outline: 'none', resize: 'vertical', fontFamily: 'inherit',
            }}
          />
        </div>

        {/* Barra de progreso */}
        {saving && (
          <div style={{ marginBottom: '0.75rem' }}>
            <div style={{
              height: 6, background: 'var(--color-bg-base)', borderRadius: '3px',
              overflow: 'hidden', marginBottom: '0.375rem',
            }}>
              <div style={{
                width: `${Math.round(uploadProgress * 100)}%`,
                height: '100%',
                background: 'var(--color-accent-primary)',
                borderRadius: '3px',
                transition: 'width 0.3s ease',
              }} />
            </div>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem', margin: 0, textAlign: 'center' }}>
              {uploadLabel} ({Math.round(uploadProgress * 100)}%)
            </p>
          </div>
        )}

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={!photo || !wall || !category || saving}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
            padding: '0.875rem 1.5rem', width: '100%',
            background: (!photo || !wall || !category || saving) ? 'var(--color-bg-hover)' : 'var(--color-accent-primary)',
            color: (!photo || !wall || !category || saving) ? 'var(--color-text-muted)' : 'var(--color-text-inverse)',
            border: 'none', borderRadius: '0.5rem', fontWeight: 600, fontSize: '1rem',
            cursor: (!photo || !wall || !category || saving) ? 'not-allowed' : 'pointer',
          }}
        >
          <Save size={18} />
          {saving ? uploadLabel || 'Publicando...' : 'Publicar Bloque'}
        </button>
      </div>
    </div>
  );
}
