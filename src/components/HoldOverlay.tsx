// ─── Overlay de presas resaltadas ─────────────────────────────────────────────
// SVG que dibuja las presas guardadas del bloque sobre la foto.
// Coordenadas normalizadas (0-1): el contenedor debe tener el mismo aspect
// ratio que la imagen (img natural, sin objectFit cover).

import type { HoldRegion } from '@/types';

interface HoldOverlayProps {
  regions: HoldRegion[];
  colors: string[];
}

export function HoldOverlay({ regions, colors }: HoldOverlayProps) {
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
        const color = colors[r.colorIndex] ?? '#ffffff';
        return (
          <ellipse
            key={i}
            cx={r.x}
            cy={r.y}
            rx={r.w / 2}
            ry={r.h / 2}
            fill={color}
            fillOpacity={0.32}
            stroke={color}
            strokeWidth={0.0028}
            strokeOpacity={0.95}
            style={{ filter: 'url(#hold-glow)' }}
          />
        );
      })}
    </svg>
  );
}
