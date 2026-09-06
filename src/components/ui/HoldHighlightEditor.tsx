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
import { Wand2, Plus, Trash2 } from 'lucide-react';
import { detectHolds, addHoldAt, overlapsAny, sampleHoldColor, regionContains } from '@/lib/holdDetection';
import { splitPolygonByLine, polygonArea, regionToPath, regionToPts } from '@/lib/holdGeometry';
import { HoldOverlay } from '@/components/HoldOverlay';
import type { HoldRegion } from '@/types';

interface HoldHighlightEditorProps {
  src: string;
  holdColors: string[];
  value: HoldRegion[];
  onChange: (regions: HoldRegion[]) => void;
  /** Color del anillo/contorno iluminado (color de Categoría del bloque). */
  ringColor?: string;
  /** Agrega a la paleta un color físico detectado al tocar una presa en la foto. */
  onHoldColorsChange?: (colors: string[]) => void;
}

type Tool = 'color' | 'erase' | 'add' | 'split' | 'shape';

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

function clamp01(v: number): number {
  return Math.max(0.0005, Math.min(0.9995, v));
}

/** Convierte puntos normalizados en una región (recalcula bounds x/y/w/h). */
function ptsToRegion(ptsIn: { x: number; y: number }[], colorIndex: number): HoldRegion {
  const pts = ptsIn.map((p) => ({ x: clamp01(p.x), y: clamp01(p.y) }));
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of pts) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }
  return {
    x: (minX + maxX) / 2,
    y: (minY + maxY) / 2,
    w: Math.max(maxX - minX, 0.004),
    h: Math.max(maxY - minY, 0.004),
    colorIndex,
    pts,
  };
}

/** Cierra un anillo de puntos normalizados como [ [x,y], ... ] para holdGeometry. */
function closeRing(pts: { x: number; y: number }[]): Array<[number, number]> {
  const arr = pts.map((p) => [p.x, p.y] as [number, number]);
  if (arr.length > 1) {
    const f = arr[0];
    const l = arr[arr.length - 1];
    if (Math.abs(f[0] - l[0]) > 1e-9 || Math.abs(f[1] - l[1]) > 1e-9) arr.push(f);
  }
  return arr;
}

/** Convierte un anillo cerrado [x,y] a región (sin el punto de cierre duplicado). */
function ringToRegion(ring: Array<readonly [number, number]>, colorIndex: number): HoldRegion | null {
  if (ring.length < 4) return null;
  if (Math.abs(polygonArea(ring)) < 1e-7) return null;
  let pts = ring.map(([x, y]) => ({ x, y }));
  const first = pts[0];
  const last = pts[pts.length - 1];
  if (Math.abs(first.x - last.x) < 1e-9 && Math.abs(first.y - last.y) < 1e-9) pts = pts.slice(0, -1);
  if (pts.length < 3) return null;
  return ptsToRegion(pts, colorIndex);
}

export function HoldHighlightEditor({
  src,
  holdColors,
  value,
  onChange,
  ringColor,
  onHoldColorsChange,
}: HoldHighlightEditorProps) {
  const imgRef = useRef<HTMLImageElement>(null);
  const [imgReady, setImgReady] = useState(false);
  const [sensitivity, setSensitivity] = useState(50);
  const [detecting, setDetecting] = useState(false);
  const [tool, setTool] = useState<Tool>('color');
  const [notice, setNotice] = useState<string | null>(null);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [splitLine, setSplitLine] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null);
  const autoRan = useRef<string | null>(null);
  const dragRef = useRef<{ kind: 'split'; ax: number; ay: number } | { kind: 'node'; regionIdx: number; vertexIdx: number } | null>(null);
  const valueRef = useRef(value);
  const holdColorsRef = useRef(holdColors);
  valueRef.current = value;
  holdColorsRef.current = holdColors;

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
      const ok = window.confirm('¿Re-detectar presas? Se perderá lo que deseleccionaste o ajustaste.');
      if (!ok) return;
    }
    autoRan.current = autoKey;
    setSelectedIdx(null);
    void runDetection(sensitivity);
  };

  const handleClear = () => {
    onChange([]);
    setSelectedIdx(null);
    setNotice('Presas limpiadas. Tocá una presa en la foto (🎨) para iluminar todas las de su color, o usá la paleta.');
  };

  const selectTool = (t: Tool) => {
    setTool(t);
    setSplitLine(null);
    dragRef.current = null;
    if (t !== 'shape') setSelectedIdx(null);
    setNotice(null);
  };

  const getPt = (e: RPointerEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    if (x < 0 || x > 1 || y < 0 || y > 1) return null;
    return { x, y };
  };

  // ─── Mutaciones sobre `value` (siempre contra el último valor conocido) ──
  const commitPatch = (regionIdx: number, makeNext: (r: HoldRegion) => HoldRegion) => {
    const cur = valueRef.current;
    if (regionIdx < 0 || regionIdx >= cur.length) return;
    const next = [...cur];
    next[regionIdx] = makeNext(next[regionIdx]);
    onChange(next);
  };

  const commitRemove = (regionIdx: number) => {
    const cur = valueRef.current;
    if (regionIdx < 0 || regionIdx >= cur.length) return;
    onChange(cur.filter((_, i) => i !== regionIdx));
    if (selectedIdx === regionIdx) setSelectedIdx(null);
    else if (selectedIdx !== null && regionIdx < selectedIdx) setSelectedIdx(selectedIdx - 1);
  };

  /** Herramienta 🎨: tocar una presa ilumina TODAS las del mismo color. */
  const handleColorTap = (nx: number, ny: number) => {
    const img = imgRef.current;
    if (!img) return;
    let hex: string | null = null;
    try {
      hex = sampleHoldColor(img, nx, ny);
    } catch {
      setNotice('No se pudo leer la foto (CORS/origen). Probá con otra imagen.');
      return;
    }
    if (!hex) {
      setNotice('No se pudo leer el color ahí. Tocá sobre una presa.');
      return;
    }
    const colors = holdColorsRef.current;
    if (colors.includes(hex)) {
      setNotice('Ese color ya está en la ruta. Usá Borrar para quitar presas puntuales que no apliquen.');
      return;
    }
    let found: HoldRegion[];
    try {
      found = detectHolds(img, [hex], { sensitivity });
    } catch {
      setNotice('No se pudo analizar la foto (CORS/origen).');
      return;
    }
    if (found.length === 0) {
      setNotice('No se detectaron presas de ese color ahí. Probá otro punto o subí la sensibilidad.');
      return;
    }
    const newIndex = colors.length;
    const added = found
      .map((r) => ({ ...r, colorIndex: newIndex }))
      .filter((r) => !overlapsAny(valueRef.current, r, 0.45));
    if (added.length === 0) {
      setNotice('Esas presas ya estaban marcadas.');
      return;
    }
    onChange([...valueRef.current, ...added]);
    onHoldColorsChange?.([...colors, hex]);
    setNotice(`Iluminadas ${added.length} presa${added.length === 1 ? '' : 's'} de color ${hex}.`);
  };

  /** Herramienta Borrar: quita una sola presa (tocar sobre su silueta). */
  const handleErase = (nx: number, ny: number) => {
    const list = valueRef.current;
    const idx = list.findIndex((r) => regionContains(r, nx, ny));
    if (idx >= 0) {
      commitRemove(idx);
      setNotice(null);
    } else {
      setNotice('Tocá sobre una presa iluminada para borrarla.');
    }
  };

  /** Herramienta Agregar: flood fill de una presa del color elegido en la paleta. */
  const handleAdd = (nx: number, ny: number) => {
    const img = imgRef.current;
    const colors = holdColorsRef.current;
    if (!img || colors.length === 0) {
      setNotice('Agregá primero un color en la paleta (o tocá una presa con 🎨).');
      return;
    }
    try {
      const region = addHoldAt(img, colors, nx, ny, { sensitivity });
      if (region && !overlapsAny(valueRef.current, region)) {
        onChange([...valueRef.current, region]);
        setNotice(null);
      } else if (!region) {
        setNotice('No hay una presa de esos colores ahí. Probá otro punto o ajustá la sensibilidad.');
      }
    } catch {
      setNotice('No se pudo analizar la foto (problema de CORS/origen).');
    }
  };

  /** Herramienta Partir: corta la presa con una línea (descarta pedazos minúsculos). */
  const doSplit = (pa: { x: number; y: number }, pb: { x: number; y: number }) => {
    const list = valueRef.current;
    const regionIdx = list.findIndex((r) => regionContains(r, pa.x, pa.y));
    if (regionIdx < 0) {
      setNotice('Arrastrá la línea de corte empezando sobre una presa para partirla.');
      return;
    }
    const src = list[regionIdx];
    const ring = closeRing(regionToPts(src));
    if (ring.length < 4) {
      setNotice('No se puede partir esta presa.');
      return;
    }
    const srcArea = Math.abs(polygonArea(ring));
    const [left, right] = splitPolygonByLine(ring, [pa.x, pa.y], [pb.x, pb.y]);
    const pieces = [left, right]
      .map((ring2) => ringToRegion(ring2, src.colorIndex))
      .filter((r): r is HoldRegion => !!r && Math.abs(polygonArea(closeRing(regionToPts(r)))) >= srcArea * 0.04);
    if (pieces.length === 0) {
      setNotice('La línea no partió la presa. Probá cruzándola completa.');
      return;
    }
    const next = list.filter((_, i) => i !== regionIdx);
    next.splice(Math.min(regionIdx, next.length), 0, ...pieces);
    onChange(next);
    setSelectedIdx(null);
    setNotice(pieces.length === 1 ? 'Presa recortada (se descartó el pedazo chico).' : 'Presa partida en dos.');
  };

  // ─── Herramienta Ajustar (forma): nodos arrastrables + agregar/borrar vértice ──
  const VERTEX_R = 16;
  const EDGE_R = 13;

  const addVertexNear = (regionIdx: number, edgeStartIdx: number, p: { x: number; y: number }) => {
    commitPatch(regionIdx, (r) => {
      const pts = regionToPts(r);
      const next = [...pts];
      next.splice(edgeStartIdx + 1, 0, { x: clamp01(p.x), y: clamp01(p.y) });
      return ptsToRegion(next, r.colorIndex);
    });
  };

  const handleShapeDown = (pt: { x: number; y: number }, rect: DOMRect) => {
    const list = valueRef.current;
    if (selectedIdx === null || selectedIdx >= list.length) {
      const idx = list.findIndex((r) => regionContains(r, pt.x, pt.y));
      setSelectedIdx(idx >= 0 ? idx : null);
      return;
    }
    const src = list[selectedIdx];
    const pts = regionToPts(src);
    const px = pt.x * rect.width;
    const py = pt.y * rect.height;

    for (let i = 0; i < pts.length; i++) {
      const dx = pts[i].x * rect.width - px;
      const dy = pts[i].y * rect.height - py;
      if (Math.hypot(dx, dy) <= VERTEX_R) {
        dragRef.current = { kind: 'node', regionIdx: selectedIdx, vertexIdx: i };
        return;
      }
    }
    // Agregar vértice al tocar un borde
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i];
      const b = pts[(i + 1) % pts.length];
      const ax = a.x * rect.width;
      const ay = a.y * rect.height;
      const bx = b.x * rect.width;
      const by = b.y * rect.height;
      const vx = bx - ax;
      const vy = by - ay;
      const L2 = vx * vx + vy * vy;
      if (L2 < 1e-9) continue;
      const t = ((px - ax) * vx + (py - ay) * vy) / L2;
      if (t < 0.04 || t > 0.96) continue;
      const qx = ax + vx * t;
      const qy = ay + vy * t;
      if (Math.hypot(qx - px, qy - py) > EDGE_R) continue;
      addVertexNear(selectedIdx, i, { x: qx / rect.width, y: qy / rect.height });
      setNotice('Vértice agregado. Arrastrá los puntos para ajustar el contorno.');
      return;
    }
    if (!regionContains(src, pt.x, pt.y)) {
      const other = list.findIndex((r, i) => i !== selectedIdx && regionContains(r, pt.x, pt.y));
      setSelectedIdx(other >= 0 ? other : null);
    }
  };

  const handleDeleteVertex = (pt: { x: number; y: number }, rect: DOMRect) => {
    const list = valueRef.current;
    if (selectedIdx === null || selectedIdx >= list.length) return;
    const pts = regionToPts(list[selectedIdx]);
    if (pts.length <= 4) {
      setNotice('Una presa necesita al menos 3 puntos.');
      return;
    }
    const px = pt.x * rect.width;
    const py = pt.y * rect.height;
    for (let i = 0; i < pts.length; i++) {
      const dx = pts[i].x * rect.width - px;
      const dy = pts[i].y * rect.height - py;
      if (Math.hypot(dx, dy) <= VERTEX_R + 2) {
        commitPatch(selectedIdx, (r) => {
          const arr = regionToPts(r);
          arr.splice(i, 1);
          return ptsToRegion(arr, r.colorIndex);
        });
        setNotice('Vértice borrado (doble toque en un punto).');
        return;
      }
    }
  };

  // ─── Puntero unificado sobre la foto ─────────────────────────────────────
  const handlePointerDown = (e: RPointerEvent<SVGSVGElement>) => {
    if (detecting) return;
    if (e.button !== 0) return;
    const img = imgRef.current;
    if (!img) return;
    const pt = getPt(e);
    if (!pt) return;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* noop */
    }
    const rect = e.currentTarget.getBoundingClientRect();

    if (tool === 'split') {
      dragRef.current = { kind: 'split', ax: pt.x, ay: pt.y };
      setSplitLine({ x1: pt.x, y1: pt.y, x2: pt.x, y2: pt.y });
      return;
    }
    if (tool === 'shape') {
      handleShapeDown(pt, rect);
      return;
    }
    if (tool === 'color') {
      handleColorTap(pt.x, pt.y);
      return;
    }
    if (tool === 'erase') {
      handleErase(pt.x, pt.y);
      return;
    }
    handleAdd(pt.x, pt.y);
  };

  const handlePointerMove = (e: RPointerEvent<SVGSVGElement>) => {
    const d = dragRef.current;
    if (!d) return;
    const pt = getPt(e);
    if (!pt) return;
    if (d.kind === 'split') {
      setSplitLine({ x1: d.ax, y1: d.ay, x2: pt.x, y2: pt.y });
      return;
    }
    // Arrastrar un vértice de la presa seleccionada
    const list = valueRef.current;
    if (d.regionIdx < 0 || d.regionIdx >= list.length) return;
    commitPatch(d.regionIdx, (r) => {
      const pts = regionToPts(r).map((p, i) => (i === d.vertexIdx ? { x: clamp01(pt.x), y: clamp01(pt.y) } : { ...p }));
      return ptsToRegion(pts, r.colorIndex);
    });
  };

  const handlePointerUp = (e: RPointerEvent<SVGSVGElement>) => {
    const d = dragRef.current;
    dragRef.current = null;
    const pt = getPt(e);
    if (!pt) return;
    if (d?.kind === 'split') {
      setSplitLine(null);
      doSplit({ x: d.ax, y: d.ay }, { x: pt.x, y: pt.y });
    }
  };

  const handlePointerDouble = (e: RPointerEvent<SVGSVGElement>) => {
    if (tool !== 'shape') return;
    const pt = getPt(e);
    if (!pt) return;
    handleDeleteVertex(pt, e.currentTarget.getBoundingClientRect());
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

      {!src ? (
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
            <HoldOverlay regions={value} colors={holdColors} ringColor={ringColor} />
            <svg
              viewBox="0 0 1 1"
              preserveAspectRatio="none"
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onDoubleClick={handlePointerDouble}
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                cursor:
                  tool === 'split'
                    ? 'crosshair'
                    : tool === 'shape'
                      ? 'grab'
                      : tool === 'erase'
                        ? 'pointer'
                        : 'copy',
                touchAction: 'none',
                pointerEvents: 'all',
              }}
            >
              <rect x={0} y={0} width={1} height={1} fill="transparent" />

              {/* Presa seleccionada (Ajustar): contorno + nodos */}
              {tool === 'shape' && selectedIdx !== null && value[selectedIdx] && (() => {
                const sel = value[selectedIdx];
                const d = regionToPath(sel);
                const pts = regionToPts(sel);
                return (
                  <g>
                    {d && <path d={d} fill="none" stroke="#000000" strokeOpacity={0.55} strokeWidth={0.006} />}
                    {d && <path d={d} fill="none" stroke="#ffffff" strokeWidth={0.0028} strokeDasharray="0.012 0.008" />}
                    {pts.map((p, i) => (
                      <circle key={i} cx={p.x} cy={p.y} r={0.014} fill="#ffffff" stroke="var(--color-accent-primary, #863bff)" strokeWidth={0.0022} />
                    ))}
                  </g>
                );
              })()}

              {/* Línea de corte (Partir) */}
              {splitLine && (
                <line
                  x1={splitLine.x1}
                  y1={splitLine.y1}
                  x2={splitLine.x2}
                  y2={splitLine.y2}
                  stroke="#ffffff"
                  strokeWidth={0.004}
                  strokeDasharray="0.01 0.008"
                />
              )}
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
                flexWrap: 'wrap',
              }}
            >
              <button onClick={() => selectTool('color')} style={{ ...toolBtn, ...(tool === 'color' ? toolBtnActive : {}) }}>
                🎨 Color
              </button>
              <button onClick={() => selectTool('erase')} style={{ ...toolBtn, ...(tool === 'erase' ? toolBtnActive : {}) }}>
                Borrar
              </button>
              <button onClick={() => selectTool('add')} style={{ ...toolBtn, ...(tool === 'add' ? toolBtnActive : {}) }}>
                <Plus size={13} /> Agregar
              </button>
              <button onClick={() => selectTool('split')} style={{ ...toolBtn, ...(tool === 'split' ? toolBtnActive : {}) }}>
                ✂️ Partir
              </button>
              <button onClick={() => selectTool('shape')} style={{ ...toolBtn, ...(tool === 'shape' ? toolBtnActive : {}) }}>
                ✏️ Ajustar
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
                  {tool === 'color'
                    ? 'Sensibilidad · toca una presa para iluminar todas las de su color'
                    : tool === 'erase'
                      ? 'toca una presa para borrarla entera'
                      : tool === 'add'
                        ? 'toca para agregar una presa del color elegido'
                        : tool === 'split'
                          ? 'arrastra la línea para partir la presa'
                          : 'toca la presa y arrastra sus puntos'}
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
            <strong>🎨 Color</strong>: tocá una presa (ej. una blanca) y se iluminan todas las de su color con el
            anillo del tono del problema. <strong>Borrar</strong> quita una presa puntual; <strong>Agregar</strong>{' '}
            suma una presa del color de la paleta; <strong>✂️ Partir</strong> divide un área grande en dos (descarta el
            pedazo chico); <strong>✏️ Ajustar</strong> edita el contorno arrastrando sus puntos, tocando un borde para
            sumar un vértice o doble-tocando un punto para borrarlo. También podés elegir colores en la paleta y
            usar <strong>Re-detectar</strong>. Cambiar foto o colores vuelve a detectar desde cero.
          </p>
        </>
      )}
    </div>
  );
}
