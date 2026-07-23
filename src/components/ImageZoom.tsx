// ─── ImageZoom ────────────────────────────────────────────────────────────────
// Modal que muestra la imagen en tamaño completo al hacer clic.

import { X, ZoomIn } from 'lucide-react';
import { useState } from 'react';

interface ImageZoomProps {
  src: string;
  alt?: string;
  /** Clase CSS para el thumbnail */
  className?: string;
  /** Estilos inline para el thumbnail */
  style?: React.CSSProperties;
}

export function ImageThumb({ src, alt, className, style }: ImageZoomProps) {
  const [open, setOpen] = useState(false);

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
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            transition: 'transform 0.3s',
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.transform = 'scale(1.05)'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)'; }}
        />
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
          <img
            src={src}
            alt={alt ?? 'Imagen ampliada'}
            style={{
              maxWidth: '100%',
              maxHeight: '100%',
              objectFit: 'contain',
              borderRadius: '0.5rem',
            }}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}
