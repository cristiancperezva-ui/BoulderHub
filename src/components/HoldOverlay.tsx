// ─── Overlay de presas resaltadas ─────────────────────────────────────────────
// SVG que dibuja las presas guardadas del bloque sobre la foto.
// - Relleno interior  = color físico de la presa (colors[colorIndex]).
// - Anillo/contorno iluminado = ringColor (color de Categoría del bloque) si se
//   provee; si no, usa el color físico (backward compatible con bloques viejos).
// - Forma: usa la silueta poligonal (r.pts) cuando existe; si no, la elipse
//   definida por x/y/w/h.
// Coordenadas normalizadas (0-1): el contenedor debe tener el mismo aspect
// ratio que la imagen (img natural, sin objectFit cover).

import type { HoldRegion } from '@/types';
import { regionToPath } from '@/lib/holdGeometry';

interface HoldOverlayProps {
  regions: HoldRegion[];
  colors: string[];
  /** Color del anillo/contorno iluminado (ej. color de Categoría del bloque). */
  ringColor?: string;
  /** Dibujar el relleno interior semitransparente (por defecto true). */
  fill?: boolean;
}

export function HoldOverlay({ regions, colors, ringColor, fill = true }: HoldOverlayProps) {
  if (!regions || regions.length === 0) return null;

  return (
    <svg
      viewBox="0 0 1 1"
      preserveAspectRatio="none"
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        overflow: 'visible',
      }}
      aria-hidden="true"
    >
      <defs>
        <filter id="hold-glow" x="-120%" y="-120%" width="340%" height="340%">
          <feGaussianBlur stdDeviation="0.006" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      {regions.map((r, i) => {
        const physical = colors[r.colorIndex] ?? '#ffffff';
        const ring = ringColor ?? physical;
        const d = regionToPath(r);
        if (!d) return null;
        return (
          <path
            key={i}
            d={d}
            fill={fill ? physical : 'none'}
            fillOpacity={fill ? 0.32 : 0}
            stroke={ring}
            strokeWidth={0.0028}
            strokeOpacity={0.95}
            strokeLinejoin="round"
            style={{ filter: 'url(#hold-glow)' }}
          />
        );
      })}
    </svg>
  );
}
