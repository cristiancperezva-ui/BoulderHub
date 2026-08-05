// ─── Editor de resaltado de presas (para el routesetter) ─────────────────────
// Muestra la foto con las presas detectadas por color y permite al setter
// deseleccionar las que pertenecen a otros bloques o agregar las que la
// detección no captó. Toda la detección corre en el cliente (canvas).

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as RPointerEvent,
} from 'react';
import { Wand2, MousePointerClick, Plus, Trash2 } from 'lucide-react';
import { detectHolds, addHoldAt, overlapsAny } from '@/lib/holdDetection';
import { HoldOverlay } from '@/components/HoldOverlay';
import type { HoldRegion } from '@/types';

interface HoldHighlightEditorProps {
  src: string;
  holdColors: string[];
  value: HoldRegion[];
  onChange: (regions: HoldRegion[]) => void;
}

type Tool = 'deselect' | 'add';

const chipStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.375rem',
  padding: '0.375rem 0.625rem',
  background: 'var(--color-bg-surface)',
  border: '1px solid var(--color-border-default)',
  borderRadius: '0.5rem',
  color: 'var(--color-text-secondary)',
  fontSize: '0.75rem',
  fontWeight: 600,
  cursor: 'pointer',
};

const toolBtn: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.375rem',
  padding: '0.4rem 0.75rem',
  background: 'var(--color-bg-base)',
  border: 'none',
  color: 'var(--color-text-secondary)',
  fontSize: '0.8rem',
  fontWeight: 600,
  cursor: 'pointer',
};

const toolBtnActive: CSSProperties = {
  background: 'rgba(134,59,255,0.15)',
  color: 'var(--color-accent-primary)',
};

export function HoldHighlightEditor({ src, holdColors, value, onChange }: HoldHighlightEditorProps) {
  const imgRef = useRef<HTMLImageElement>(null);
  const [imgReady, setImgReady] = useState(false);
  const [sensitivity, setSensitivity] = useState(50);
  const [detecting, setDetecting] = useState(false);
  const [tool, setTool] = useState<Tool>('deselect');
  const [notice, setNotice] = useState<string | null>(null);
  const autoRan = useRef<string | null>(null);

  const colorsKey = holdColors.join(',');
  const autoKey = `${src}|${colorsKey}`;

  const runDetection = useCallback(
    async (sens: number) => {
      const img = imgRef.current;
      if (!img || holdColors.length === 0) return;
      setDetecting(true);
      setNotice(null);
      await new Promise((r) => setTimeout(r, 40)); // dejar que pinte "Detectando…"
      try {
        const regions = detectHolds(img, holdColors, { sensitivity: sens });
        onChange(regions);
        if (regions.length === 0) {
          setNotice('No se detectaron presas con estos colores. Baja la sensibilidad o agrégalas con el modo ➕.');
        }
      } catch {
        setNotice('No se pudo analizar la foto (problema de CORS/origen).');
      } finally {
        setDetecting(false);
      }
    },
    [holdColors, onChange],
  );

  // Resetear el estado "imagen lista" cuando cambia la foto.
  useEffect(() => {
    setImgReady(false);
    const img = imgRef.current;
    if (img && img.complete) setImgReady(true);
  }, [src]);

  // Auto-detección: solo la primera vez que aparece esta foto+colores y no hay
  // regiones manuales todavía (si el setter ya refinó, no se vuelve a ejecutar).
  useEffect(() => {
    if (!imgReady || holdColors.length === 0 || !src) return;
    if (autoRan.current === autoKey) return;
    if (value.length > 0) {
      autoRan.current = autoKey;
      return;
    }
    autoRan.current = autoKey;
    void runDetection(sensitivity);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imgReady, autoKey, src, holdColors.length]);

  const handleSensitivity = (v: number) => {
    setSensitivity(v);
    autoRan.current = autoKey;
    void runDetection(v);
  };

  const handleRedetect = () => {
    if (value.length > 0) {
      const ok = window.confirm('¿Re-detectar presas? Se perderá lo que deseleccionaste o agregaste.');
      if (!ok) return;
    }
    autoRan.current = autoKey;
    void runDetection(sensitivity);
  };

  const handlePointer = (e: RPointerEvent<SVGSVGElement>) => {
    if (detecting) return;
    const img = imgRef.current;
    if (!img) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const nx = (e.clientX - rect.left) / rect.width;
    const ny = (e.clientY - rect.top) / rect.height;
    if (nx < 0 || nx > 1 || ny < 0 || ny > 1) return;

    if (tool === 'deselect') {
      const hit = value.find((r) => {
        const dx = (nx - r.x) / Math.max(r.w / 2, 1e-6);
        const dy = (ny - r.y) / Math.max(r.h / 2, 1e-6);
        return dx * dx + dy * dy <= 1;
      });
      if (hit) {
        onChange(value.filter((r) => r !== hit));
        setNotice(null);
      }
    } else {
      try {
        const region = addHoldAt(img, holdColors, nx, ny, { sensitivity });
        if (region && !overlapsAny(value, region)) {
          onChange([...value, region]);
          setNotice(null);
        } else if (!region) {
          setNotice('No hay una presa de esos colores ahí. Prueba otro punto o ajusta la sensibilidad.');
        }
      } catch {
        setNotice('No se pudo analizar la foto (problema de CORS/origen).');
      }
    }
  };

  const handleClear = () => {
    onChange([]);
    setNotice('Presas limpiadas. Usa ➕ para agregarlas a mano o re-detecta.');
  };

  const hasColors = holdColors.length > 0;

  return (
    <div
      style={{
        background: 'var(--color-bg-base)',
        border: '1px solid var(--color-border-subtle)',
        borderRadius: '0.5rem',
        padding: '0.875rem',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.5rem',
          marginBottom: '0.625rem',
          flexWrap: 'wrap',
        }}
      >
        <span style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem', fontWeight: 500 }}>
          ✨ Resaltar presas{' '}
          <span style={{ fontWeight: 400, fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
            ({value.length} presas)
          </span>
        </span>
        <div style={{ display: 'flex', gap: '0.375rem' }}>
          <button onClick={handleRedetect} disabled={detecting || !hasColors} style={chipStyle}>
            <Wand2 size={14} /> Re-detectar
          </button>
          <button onClick={handleClear} disabled={detecting || value.length === 0} style={chipStyle}>
            <Trash2 size={14} /> Quitar todas
          </button>
        </div>
      </div>

      {!hasColors ? (
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem', margin: 0 }}>
          Agrega al menos un color de presa para resaltarlas en la foto.
        </p>
      ) : !src ? (
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem', margin: 0 }}>
          Sube una foto del bloque para resaltar las presas.
        </p>
      ) : (
        <>
          <div style={{ position: 'relative', width: '100%', marginBottom: '0.625rem', touchAction: 'none' }}>
            <img
              ref={imgRef}
              src={src}
              alt="Foto para resaltar presas"
              crossOrigin="anonymous"
              onLoad={() => setImgReady(true)}
              style={{
                width: '100%',
                height: 'auto',
                display: 'block',
                borderRadius: '0.5rem',
                userSelect: 'none',
              }}
            />
            <HoldOverlay regions={value} colors={holdColors} />
            <svg
              viewBox="0 0 1 1"
              preserveAspectRatio="none"
              onPointerDown={handlePointer}
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                cursor: tool === 'add' ? 'copy' : 'pointer',
                touchAction: 'none',
                pointerEvents: 'all',
              }}
            >
              <rect x={0} y={0} width={1} height={1} fill="transparent" />
            </svg>
            {detecting && (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'rgba(0,0,0,0.45)',
                  borderRadius: '0.5rem',
                  color: 'white',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                }}
              >
                Detectando presas…
              </div>
            )}
          </div>

          <div
            style={{
              display: 'flex',
              gap: '0.5rem',
              alignItems: 'center',
              flexWrap: 'wrap',
              marginBottom: '0.375rem',
            }}
          >
            <div
              style={{
                display: 'flex',
                borderRadius: '0.5rem',
                overflow: 'hidden',
                border: '1px solid var(--color-border-default)',
              }}
            >
              <button
                onClick={() => {
                  setTool('deselect');
                  setNotice(null);
                }}
                style={{ ...toolBtn, ...(tool === 'deselect' ? toolBtnActive : {}) }}
              >
                <MousePointerClick size={13} /> Quitar
              </button>
              <button
                onClick={() => {
                  setTool('add');
                  setNotice(null);
                }}
                style={{ ...toolBtn, ...(tool === 'add' ? toolBtnActive : {}) }}
              >
                <Plus size={13} /> Agregar
              </button>
            </div>
            <div style={{ flex: 1, minWidth: 180 }}>
              <label
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '0.72rem',
                  color: 'var(--color-text-muted)',
                  marginBottom: '0.125rem',
                }}
              >
                <span>
                  Sensibilidad · {tool === 'deselect' ? 'toca una presa para quitarla' : 'toca para agregar una presa'}
                </span>
                <span>{sensitivity < 33 ? 'Estricta' : sensitivity < 66 ? 'Media' : 'Laxa'}</span>
              </label>
              <input
                type="range"
                min={0}
                max={100}
                value={sensitivity}
                onChange={(e) => handleSensitivity(Number(e.target.value))}
                style={{ width: '100%', accentColor: 'var(--color-accent-primary)' }}
              />
            </div>
          </div>

          {notice && (
            <p style={{ color: 'var(--color-accent-tertiary)', fontSize: '0.75rem', margin: '0.375rem 0 0' }}>
              {notice}
            </p>
          )}
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.7rem', margin: '0.375rem 0 0' }}>
            Se resaltan automáticamente las presas del color elegido. Si en la foto hay otro bloque con presas del
            mismo tono, usa <strong>Quitar</strong> para deseleccionarlas. Cambiar foto o colores, o mover la
            sensibilidad, vuelve a detectar desde cero.
          </p>
        </>
      )}
    </div>
  );
}
