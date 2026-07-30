import { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useBlock } from '@/hooks/useBlocks';
import { uploadImageAsWebP } from '@/lib/storage';
import { createDoc, updateDocById } from '@/lib/firestore';
import { useWalls, useColorCategories, useRouteSetters } from '@/hooks/useStaticData';
import { Camera, X, Save, CheckCircle, HelpCircle } from 'lucide-react';
import { ColorPicker } from '@/components/ui/ColorPicker';

export function RouteSetterCreateBlockView() {
  const { blockId } = useParams<{ blockId: string }>();
  const navigate = useNavigate();
  const isEditing = !!blockId;
  const { user, profile } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Cargar datos del bloque si estamos editando
  const { data: existingBlock } = useBlock(isEditing ? blockId : undefined);

  const [photo, setPhoto] = useState<{ file: File; preview: string } | null>(null);
  const [existingPhotoUrl, setExistingPhotoUrl] = useState<string>('');
  const [wall, setWall] = useState('');
  const [category, setCategory] = useState('');
  const [holdColors, setHoldColors] = useState<string[]>([]);
  const [difficulty, setDifficulty] = useState(0); // 0 = V? desconocido, 1-14 = V1-V14
  const [comments, setComments] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadLabel, setUploadLabel] = useState('');
  const [newHoldColor, setNewHoldColor] = useState('#E87D3E');
  const [errors, setErrors] = useState<string[]>([]);

  // ✅ Datos cacheados con TanStack Query
  const { data: walls = [] } = useWalls();
  const { data: categories = [] } = useColorCategories();
  const { data: routesetters = [] } = useRouteSetters();
  const [selectedRouteSetterId, setSelectedRouteSetterId] = useState('');

  // Pre-seleccionar routesetter una vez que se carguen los datos
  const isRoutesetterInitialized = useRef(false);
  if (!isRoutesetterInitialized.current && routesetters.length > 0 && !selectedRouteSetterId) {
    const found = user ? routesetters.find(r => r.id === user.uid) : null;
    setSelectedRouteSetterId(found?.id ?? routesetters[0]?.id ?? '');
    isRoutesetterInitialized.current = true;
  }

  // Pre-cargar datos del bloque existente cuando se carga
  useEffect(() => {
    if (existingBlock && isEditing) {
      setWall(existingBlock.wallId || '');
      setCategory(existingBlock.categoryColorId || '');
      setHoldColors(existingBlock.holdColors || []);
      setDifficulty(existingBlock.proposedDifficultyUnknown ? 0 : existingBlock.proposedDifficultyV);
      setComments(existingBlock.comments || '');
      setExistingPhotoUrl(existingBlock.photoUrl || '');
      setSelectedRouteSetterId(existingBlock.routeSetterId || '');
    }
  }, [existingBlock, isEditing]);

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

  const validate = (): boolean => {
    const errs: string[] = [];
    if (!photo && !existingPhotoUrl) errs.push('Foto del bloque');
    if (!wall) errs.push('Muro');
    if (!category) errs.push('Categoría de color');
    if (holdColors.length === 0) errs.push('Colores de las presas');
    setErrors(errs);
    return errs.length === 0;
  };

  const handleSubmit = async () => {
    if (!validate() || !user) return;
    setSaving(true);
    setUploadProgress(0);
    setUploadLabel('Preparando...');
    try {
      const wallObj = walls.find(w => w.id === wall);
      const catObj = categories.find(c => c.id === category);

      let photoUrl = existingPhotoUrl;

      // Subir nueva foto si se cambió
      if (photo) {
        const targetBlockId = isEditing ? blockId! : crypto.randomUUID();
        const photoPath = `blocks/${targetBlockId}`;
        setUploadLabel('Optimizando imagen...');
        photoUrl = await uploadImageAsWebP(photo.file, photoPath, (pct, label) => {
          setUploadProgress(pct);
          if (label) setUploadLabel(label);
        });
      }

      setUploadLabel(isEditing ? 'Actualizando...' : 'Guardando en la base de datos...');
      setUploadProgress(0.9);

      const selectedRSetter = routesetters.find(r => r.id === selectedRouteSetterId);

      if (isEditing && blockId) {
        // ─── MODO EDICIÓN ───
        const updates: Record<string, unknown> = {
          wallId: wall,
          wallName: wallObj?.name ?? wall,
          routeSetterId: selectedRouteSetterId || user.uid,
          routeSetterName: selectedRSetter?.displayName ?? existingBlock?.routeSetterName ?? profile?.displayName ?? 'RouteSetter',
          photoUrl,
          categoryColorId: category,
          categoryColorName: catObj?.name ?? category,
          holdColors,
          proposedDifficultyV: difficulty,
          comments,
        };
        if (difficulty === 0) updates.proposedDifficultyUnknown = true;
        await updateDocById('blocks', blockId, updates);
      } else {
        // ─── MODO CREACIÓN ───
        const newBlock: Record<string, unknown> = {
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
        if (difficulty === 0) newBlock.proposedDifficultyUnknown = true;
        await createDoc('blocks', newBlock);
      }

      setUploadProgress(1);
      setUploadLabel('¡Guardado!');
      setSaved(true);

      if (!isEditing) {
        // Reset form solo en creación
        setPhoto(null);
        setWall('');
        setCategory('');
        setHoldColors([]);
        setDifficulty(0);
        setComments('');
        setExistingPhotoUrl('');
        if (fileInputRef.current) fileInputRef.current.value = '';
      }

      setTimeout(() => {
        setSaved(false);
        setUploadProgress(0);
        setUploadLabel('');
        if (isEditing) navigate('/routesetter/blocks');
      }, 2000);
    } catch (err) {
      console.error('Error al guardar bloque:', err);
      alert('Error al guardar el bloque. Revisa la consola para más detalles.');
    } finally {
      setSaving(false);
    }
  };

  const selectedCat = categories.find(c => c.id === category);

  return (
    <div style={{ animation: 'fadeIn 0.3s ease-out', maxWidth: 640, margin: '0 auto' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--color-text-primary)' }}>
        {isEditing ? 'Editar Bloque' : 'Nuevo Bloque'}
      </h1>
      {isEditing && (
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
          Editando bloque · {existingBlock?.wallName || ''} · V{existingBlock?.proposedDifficultyV || '?'}
        </p>
      )}

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
          {isEditing ? '¡Bloque actualizado exitosamente!' : '¡Bloque publicado exitosamente!'}
        </div>
      )}

      {/* Errores de validación */}
      {errors.length > 0 && (
        <div style={{
          padding: '0.75rem 1rem', marginBottom: '1rem',
          background: 'rgba(216,76,76,0.1)',
          border: '1px solid rgba(216,76,76,0.3)',
          borderRadius: '0.5rem',
          color: 'var(--color-state-error)',
          fontSize: '0.85rem',
        }}>
          <strong>Campos requeridos faltantes:</strong>
          <ul style={{ margin: '0.375rem 0 0 1.25rem', padding: 0 }}>
            {errors.map(e => <li key={e}>{e}</li>)}
          </ul>
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
          {photo || existingPhotoUrl ? (
            <div style={{ position: 'relative', display: 'inline-block', width: '100%' }}>
              <img
                src={photo?.preview || existingPhotoUrl}
                alt="Preview"
                loading="lazy"
                style={{ width: '100%', maxHeight: 300, borderRadius: '0.5rem', objectFit: 'cover' }}
              />
              <button
                onClick={() => { setPhoto(null); setExistingPhotoUrl(''); if (fileInputRef.current) fileInputRef.current.value = ''; }}
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
                {isEditing ? 'Toca el botón ✕ y selecciona una nueva foto para cambiarla' : 'Se convertirá a WebP automáticamente'}
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
                border: `1px solid ${!wall ? 'var(--color-state-error)' : 'var(--color-border-default)'}`,
                borderRadius: '0.5rem',
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
              border: `1px solid ${!category ? 'var(--color-state-error)' : 'var(--color-border-default)'}`,
              borderRadius: '0.5rem',
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

        {/* Colores de presas - Selector por paleta */}
        <div>
          <label style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem', display: 'block' }}>
            Colores de las presas *
          </label>

          <div style={{
            background: 'var(--color-bg-base)',
            border: `1px solid ${holdColors.length === 0 && errors.includes('Colores de las presas') ? 'var(--color-state-error)' : 'var(--color-border-subtle)'}`,
            borderRadius: '0.5rem',
            padding: '1rem',
            marginBottom: '0.75rem',
          }}>
            <ColorPicker value={newHoldColor} onChange={(c) => setNewHoldColor(c)} />
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.75rem' }}>
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
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>Selecciona colores de la paleta y agrégalos.</p>
          )}
        </div>

        {/* Dificultad V */}
        <div>
          <label style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem', display: 'block' }}>
            Dificultad propuesta *
          </label>

          <input
            type="range" min={0} max={14} value={difficulty}
            onChange={(e) => setDifficulty(Number(e.target.value))}
            style={{ width: '100%', accentColor: 'var(--color-accent-primary)' }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
            <span style={{ fontWeight: difficulty === 0 ? 700 : 400, color: difficulty === 0 ? 'var(--color-accent-primary)' : undefined }}>
              <HelpCircle size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '0.125rem' }} />
              V?
            </span>
            {difficulty === 0 ? (
              <span style={{ fontWeight: 700, fontSize: '1.125rem', color: 'var(--color-text-muted)' }}>
                <HelpCircle size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '0.25rem' }} />
                Sin definir
              </span>
            ) : (
              <span style={{ fontWeight: 700, fontSize: '1.125rem', color: 'var(--color-accent-primary)' }}>
                V{difficulty}
              </span>
            )}
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

        {/* Botones */}
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          {isEditing && (
            <button
              onClick={() => navigate('/routesetter/blocks')}
              style={{
                padding: '0.875rem 1.5rem',
                background: 'var(--color-bg-base)',
                color: 'var(--color-text-secondary)',
                border: '1px solid var(--color-border-default)',
                borderRadius: '0.5rem', fontWeight: 600, fontSize: '1rem',
                cursor: 'pointer',
              }}
            >
              Cancelar
            </button>
          )}
          <button
            onClick={handleSubmit}
            disabled={saving}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
              padding: '0.875rem 1.5rem', flex: 1,
              background: saving ? 'var(--color-bg-hover)' : 'var(--color-accent-primary)',
              color: saving ? 'var(--color-text-muted)' : 'var(--color-text-inverse)',
              border: 'none', borderRadius: '0.5rem', fontWeight: 600, fontSize: '1rem',
              cursor: saving ? 'not-allowed' : 'pointer',
            }}
          >
            <Save size={18} />
            {saving ? uploadLabel || 'Guardando...' : isEditing ? 'Guardar Cambios' : 'Publicar Bloque'}
          </button>
        </div>
      </div>
    </div>
  );
}
