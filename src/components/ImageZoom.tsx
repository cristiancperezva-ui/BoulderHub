// ─── ImageZoom ────────────────────────────────────────────────────────────────
// Modal que muestra la imagen en tamaño completo al hacer clic.
// Soporta un overlay de presas resaltadas (HoldOverlay) sobre el thumb y el zoom.

import { X, ZoomIn } from 'lucide-react';
import { useState, type CSSProperties } from 'react';
import { HoldOverlay } from '@/components/HoldOverlay';
import type { HoldRegion } from '@/types';

interface HoldOverlayData {
  regions: HoldRegion[];
  colors: string[];
}

interface ImageZoomProps {
  src: string;
  alt?: string;
  /** Clase CSS para el thumbnail */
  className?: string;
  /** Estilos inline para el thumbnail */
  style?: CSSProperties;
  /** Overlay de presas resaltadas (se dibuja sobre el thumb y el zoom). */
  overlay?: HoldOverlayData | null;
  /** Ajuste de la imagen en el thumbnail. 'contain' muestra la foto completa (necesario con overlay). */
  objectFit?: 'cover' | 'contain';
}

export function ImageThumb({
  src,
  alt,
  className,
  style,
  overlay = null,
  objectFit = 'cover',
}: ImageZoomProps) {
  const [open, setOpen] = useState(false);
  const showOverlay = !!(overlay && overlay.regions.length > 0 && overlay.colors.length > 0);

  return (
    <>
      <div
        onClick={() => setOpen(true)}
        style={{
          position: 'relative',
          cursor: 'pointer',
          overflow: 'hidden',
          ...style,
        }}
        className={className}
      >
        <img
          src={src}
          alt={alt ?? 'Imagen'}
          loading="lazy"
          style={{
            width: '100%',
            height: objectFit === 'cover' ? '100%' : 'auto',
            objectFit,
            display: 'block',
            transition: 'transform 0.3s',
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.transform = 'scale(1.05)'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)'; }}
        />
        {showOverlay && <HoldOverlay regions={overlay!.regions} colors={overlay!.colors} />}
        <div style={{
          position: 'absolute', bottom: 8, right: 8,
          background: 'rgba(0,0,0,0.6)', borderRadius: '50%',
          width: 32, height: 32, display: 'flex',
          alignItems: 'center', justifyContent: 'center',
        }}>
          <ZoomIn size={16} color="white" />
        </div>
      </div>

      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            background: 'rgba(0,0,0,0.9)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '2rem', cursor: 'pointer',
          }}
        >
          <button
            onClick={() => setOpen(false)}
            style={{
              position: 'absolute', top: '1rem', right: '1rem',
              background: 'rgba(255,255,255,0.15)', border: 'none',
              borderRadius: '50%', width: 44, height: 44,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: 'white',
            }}
          >
            <X size={24} />
          </button>
          <div style={{ position: 'relative', display: 'inline-block' }}>
            <img
              src={src}
              alt={alt ?? 'Imagen ampliada'}
              style={{
                maxWidth: '90vw',
                maxHeight: '85vh',
                width: 'auto',
                height: 'auto',
                objectFit: 'contain',
                borderRadius: '0.5rem',
                display: 'block',
              }}
              onClick={(e) => e.stopPropagation()}
            />
            {showOverlay && <HoldOverlay regions={overlay!.regions} colors={overlay!.colors} />}
          </div>
        </div>
      )}
    </>
  );
}
