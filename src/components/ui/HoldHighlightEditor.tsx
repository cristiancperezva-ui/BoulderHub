// ─── Editor de presas del bloque (para el routesetter) ───────────────────────
// Modelo nuevo (mobile-first):
//  - La foto ES el editor. Se arma el bloque a base de PRESAS ENTERAS:
//      · Herramienta por defecto ➕ : tocá una presa para SUMARLA, tocá una ya
//        marcada para QUITARLA. (con zoom/pan, sin arrastrar puntos)
//  - 🎨 Por color: tocar una presa detecta TODAS las de ese color pero NO las
//    marca todavía: quedan como "candidatas" en gris y el setter las confirma
//    o descarta (y puede tocar las que sobran para excluirlas del lote).
//  - El bloque SIEMPRE se muestra en UN solo color (el de su categoría), sin
//    importar los colores físicos de las presas.
//  - ✂️ Partir sigue disponible para dividir áreas grandes en dos.
//  - Se eliminó el ajuste fino por puntos (imposible en móvil).
// Detección 100% en cliente (canvas).

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as RPointerEvent,
} from 'react';
import { Wand2, Plus, Trash2, ZoomIn, ZoomOut, Maximize, Check, X } from 'lucide-react';
import { detectHolds, addHoldAt, overlapsAny, sampleHoldColor, regionContains } from '@/lib/holdDetection';
import { computeHoldEmbedding, addHoldAtML } from '@/lib/holdDetectionRemote';
import { splitPolygonByLine, polygonArea, regionToPath, regionToPts } from '@/lib/holdGeometry';
import { HoldOverlay } from '@/components/HoldOverlay';
import type { HoldRegion } from '@/types';

interface HoldHighlightEditorProps {
  src: string;
  /** Colores físicos detectados/usados (se auto-completan al tocar presas). */
  holdColors: string[];
  value: HoldRegion[];
  onChange: (regions: HoldRegion[]) => void;
  /** Color uniforme del bloque (categoría). Si no viene, se usa un acento por defecto. */
  color?: string;
  /** Para notificar colores físicos nuevos detectados. */
  onHoldColorsChange?: (colors: string[]) => void;
}

type Tool = 'add' | 'color' | 'split';

const DEFAULT_BLOCK = '#863bff';

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
  padding: '0.5rem 0.8rem',
  background: 'var(--color-bg-base)',
  border: 'none',
  color: 'var(--color-text-secondary)',
  fontSize: '0.8rem',
  fontWeight: 600,
  cursor: 'pointer',
  touchAction: 'manipulation',
};

const toolBtnActive: CSSProperties = {
  background: 'rgba(134,59,255,0.15)',
  color: 'var(--color-accent-primary)',
};

const zoomBtn: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 36,
  height: 36,
  borderRadius: '0.5rem',
  background: 'rgba(0,0,0,0.65)',
  border: '1px solid rgba(255,255,255,0.18)',
  color: '#fff',
  cursor: 'pointer',
  backdropFilter: 'blur(2px)',
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

type PendingSource = { kind: 'all'; colors: string[] } | { kind: 'one'; color: string };

export function HoldHighlightEditor({
  src,
  holdColors,
  value,
  onChange,
  color,
  onHoldColorsChange,
}: HoldHighlightEditorProps) {
  const imgRef = useRef<HTMLImageElement>(null);
  const viewRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [imgReady, setImgReady] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [tool, setTool] = useState<Tool>('add');
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, setPending] = useState<HoldRegion[] | null>(null);
  const [sensitivity, setSensitivity] = useState(45);

  // Zoom/pan
  const [view, setView] = useState<{ scale: number; pan: { x: number; y: number } }>({ scale: 1, pan: { x: 0, y: 0 } });
  const viewRef2 = useRef(view);
  viewRef2.current = view;
  const autoRan = useRef<string | null>(null);
  const splitStart = useRef<{ x: number; y: number } | null>(null);
  const [splitLine, setSplitLine] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null);

  // Segmentación con IA (SlimSAM en la nube): se calcula 1 vez por foto al abrir el editor.
  // Si falla (offline, backend caído), `addSingleHold` cae de vuelta a la detección local por color.
  const [embeddingId, setEmbeddingId] = useState<string | null>(null);
  const embeddingRan = useRef<string | null>(null);

  const valueRef = useRef(value);
  const holdColorsRef = useRef(holdColors);
  valueRef.current = value;
  holdColorsRef.current = holdColors;

  const pendingRef = useRef(pending);
  pendingRef.current = pending;
  const pendingSource = useRef<PendingSource | null>(null);

  // Gestos (tap/pan/pinch/split)
  const pointers = useRef(new Map<number, { lx: number; ly: number }>());
  const gesture = useRef<
    | { kind: 'none' }
    | { kind: 'maybe'; sx: number; sy: number; basePan: { x: number; y: number } }
    | { kind: 'pan'; sx: number; sy: number; basePan: { x: number; y: number } }
    | { kind: 'pinch'; dist0: number; scale0: number; lx0: number; ly0: number; basePan: { x: number; y: number } }
    | { kind: 'split' }
  >({ kind: 'none' });

  const colorsKey = holdColors.join(',');
  const autoKey = `${src}|${colorsKey}`;

  const MIN_SCALE = 1;
  const MAX_SCALE = 8;
  const TAP_MOVE = 10; // px

  // ─── Zoom helpers ──────────────────────────────────────────────────────────
  const clampScale = (s: number) => Math.max(MIN_SCALE, Math.min(MAX_SCALE, s));

  const clampPan = (pan: { x: number; y: number }, s: number, bw: number, bh: number) => {
    if (s <= 1.0001) return { x: 0, y: 0 };
    const minX = bw - s * bw;
    const minY = bh - s * bh;
    const margin = 0;
    return {
      x: Math.max(minX - margin, Math.min(margin, pan.x)),
      y: Math.max(minY - margin, Math.min(margin, pan.y)),
    };
  };

  const applyView = (scale: number, pan: { x: number; y: number }) => {
    const s = clampScale(scale);
    const el = contentRef.current;
    const bw = el?.offsetWidth ?? viewRef.current?.clientWidth ?? 1;
    const bh = el?.offsetHeight ?? 1;
    const p = clampPan(pan, s, bw, bh);
    setView({ scale: s, pan: p });
  };

  /** Aplica zoom de factor `f` anclado al punto local (viewport) (lx, ly). */
  const zoomAt = (f: number, lx?: number, ly?: number) => {
    const v = viewRef2.current;
    const vp = viewRef.current;
    const bw = contentRef.current?.offsetWidth ?? vp?.clientWidth ?? 1;
    const bh = contentRef.current?.offsetHeight ?? 1;
    const cx = lx ?? (vp?.clientWidth ?? bw) / 2;
    const cy = ly ?? (vp?.clientHeight ?? bh) / 2;
    const s = clampScale(v.scale * f);
    if (s === v.scale) return;
    // Punto de la imagen que hoy está bajo (cx,cy)
    const ix = (cx - v.pan.x) / v.scale;
    const iy = (cy - v.pan.y) / v.scale;
    const pan = { x: cx - ix * s, y: cy - iy * s };
    applyView(s, clampPan(pan, s, bw, bh));
  };

  const resetZoom = () => {
    gesture.current = { kind: 'none' };
    applyView(1, { x: 0, y: 0 });
  };

  useEffect(() => {
    resetZoom();
    setImgReady(false);
    const img = imgRef.current;
    if (img && img.complete) setImgReady(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src]);

  useEffect(() => {
    if (!src || embeddingRan.current === src) return;
    embeddingRan.current = src;
    setEmbeddingId(null);
    computeHoldEmbedding(src)
      .then((id) => setEmbeddingId(id))
      .catch((err) => console.warn('No se pudo calcular el embedding IA, se usará detección local:', err));
  }, [src]);

  // ─── Detección ─────────────────────────────────────────────────────────────
  const runDetect = useCallback(
    async (colorsArr: string[], sens: number) => {
      const img = imgRef.current;
      if (!img || colorsArr.length === 0) return null;
      setDetecting(true);
      setNotice(null);
      await new Promise((r) => setTimeout(r, 30));
      try {
        return detectHolds(img, colorsArr, { sensitivity: sens });
      } catch {
        setNotice('No se pudo analizar la foto (problema de CORS/origen).');
        return null;
      } finally {
        setDetecting(false);
      }
    },
    [],
  );

  /** Detecta en lote y muestra el resultado como CANDIDATAS (pendiente de confirmar). */
  const showPending = async (source: PendingSource, sens: number) => {
    const img = imgRef.current;
    if (!img) return;
    const regions = await runDetect(source.kind === 'all' ? source.colors : [source.color], sens);
    if (!regions) return;
    if (regions.length === 0) {
      setPending([]);
      pendingSource.current = source;
      setNotice(
        source.kind === 'one'
          ? 'No se detectaron presas de ese color. Subí la sensibilidad o usá ➕ para tocar la presa puntual.'
          : 'No se detectaron presas con estos colores. Probá ajustar la sensibilidad.',
      );
      return;
    }
    pendingSource.current = source;
    setPending(regions);
    setNotice(
      `${regions.length} presa${regions.length === 1 ? '' : 's'} detectada${regions.length === 1 ? '' : 's'} como candidata${regions.length === 1 ? '' : 's'}. Tocá las que sobren para excluirlas y confirmá.`,
    );
  };

  // Auto-detección inicial: solo la primera vez que aparece esta foto+colores y
  // no hay presas marcadas todavía. Se muestra como candidatas (no se marca solo).
  useEffect(() => {
    if (!imgReady || holdColors.length === 0 || !src) return;
    if (autoRan.current === autoKey) return;
    autoRan.current = autoKey;
    if (value.length > 0) return;
    void showPending({ kind: 'all', colors: holdColors }, sensitivity);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imgReady, autoKey, src, holdColors.length]);

  // ─── Mutaciones sobre el bloque (value) ───────────────────────────────────
  const commitRemove = (regionIdx: number) => {
    const cur = valueRef.current;
    if (regionIdx < 0 || regionIdx >= cur.length) return;
    onChange(cur.filter((_, i) => i !== regionIdx));
    setNotice('Presa quitada del bloque.');
  };

  const confirmPending = () => {
    const list = pendingRef.current;
    if (!list || list.length === 0) {
      setPending(null);
      pendingSource.current = null;
      return;
    }
    const existing = valueRef.current;
    const added = list.filter((r) => !overlapsAny(existing, r, 0.35));
    onChange([...existing, ...added]);
    setPending(null);
    pendingSource.current = null;
    setNotice(`Se marcaron ${added.length} presa${added.length === 1 ? '' : 's'}.`);
  };

  const cancelPending = () => {
    setPending(null);
    pendingSource.current = null;
    setNotice(null);
  };

  const handleSensitivity = (v: number) => {
    setSensitivity(v);
    const src = pendingSource.current;
    if (pendingRef.current !== null && src) {
      void showPending(src, v);
    }
  };

  const handleRedetect = () => {
    if (value.length > 0) {
      const ok = window.confirm('¿Re-detectar presas? Se perderá lo que deseleccionaste o ajustaste.');
      if (!ok) return;
    }
    autoRan.current = autoKey;
    setPending(null);
    pendingSource.current = null;
    const colors = holdColorsRef.current;
    if (colors.length > 0) {
      void showPending({ kind: 'all', colors }, sensitivity);
    } else {
      setNotice('Tocá las presas del bloque con ➕ (se suman de a una) o usá 🎨 para detectar un color.');
    }
  };

  const handleClear = () => {
    onChange([]);
    setPending(null);
    pendingSource.current = null;
    setNotice('Presas limpiadas. Tocá una presa en la foto para sumarla al bloque.');
  };

  const selectTool = (t: Tool) => {
    setTool(t);
    setSplitLine(null);
    splitStart.current = null;
    setNotice(null);
  };

  // ─── Herramienta ➕ : sumar/quitar presa tocándola ─────────────────────────
  const addSingleHold = async (nx: number, ny: number) => {
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
      setNotice('No se pudo leer el color ahí. Tocá justo sobre una presa.');
      return;
    }
    const colors = holdColorsRef.current;
    let idx = colors.indexOf(hex);
    if (idx < 0) idx = colors.length;

    // 1) Intentar segmentación IA (SlimSAM en la nube): mejor calidad de contorno.
    if (embeddingId) {
      setDetecting(true);
      try {
        const region = await addHoldAtML(embeddingId, nx, ny, idx);
        if (overlapsAny(valueRef.current, region)) {
          setNotice('Esa presa ya está en el bloque.');
          return;
        }
        if (idx >= colors.length) onHoldColorsChange?.([...colors, hex]);
        onChange([...valueRef.current, region]);
        setNotice('Presa sumada al bloque (IA). Tocá una ya marcada para quitarla.');
        return;
      } catch (err) {
        console.warn('Segmentación IA falló, se usa detección local:', err);
      } finally {
        setDetecting(false);
      }
    }

    // 2) Fallback local (HSV + flood-fill): sin conexión o error del backend.
    try {
      const region = addHoldAt(img, [hex], nx, ny, { sensitivity });
      if (!region) {
        setNotice('No se detectó una presa ahí. Tocá sobre la presa (sin agarrar el muro).');
        return;
      }
      if (overlapsAny(valueRef.current, region)) {
        setNotice('Esa presa ya está en el bloque.');
        return;
      }
      region.colorIndex = idx;
      if (idx >= colors.length) onHoldColorsChange?.([...colors, hex]);
      onChange([...valueRef.current, region]);
      setNotice('Presa sumada al bloque. Tocá una ya marcada para quitarla.');
    } catch {
      setNotice('No se pudo analizar la foto (CORS/origen).');
    }
  };

  const startColorBatch = async (nx: number, ny: number) => {
    const img = imgRef.current;
    if (!img) return;
    let hex: string | null = null;
    try {
      hex = sampleHoldColor(img, nx, ny);
    } catch {
      setNotice('No se pudo leer la foto (CORS/origen).');
      return;
    }
    if (!hex) {
      setNotice('No se pudo leer el color ahí. Tocá sobre una presa.');
      return;
    }
    const colors = holdColorsRef.current;
    if (!colors.includes(hex)) onHoldColorsChange?.([...colors, hex]);
    await showPending({ kind: 'one', color: hex }, sensitivity);
  };

  // ─── Herramienta ✂️ Partir ────────────────────────────────────────────────
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
    setNotice(pieces.length === 1 ? 'Presa recortada (se descartó el pedazo chico).' : 'Presa partida en dos.');
  };

  // ─── Taps (punto normalizado 0-1) ─────────────────────────────────────────
  const handleTap = async (nx: number, ny: number) => {
    // Si hay candidatas pendientes, tocar una la excluye del lote.
    if (pendingRef.current) {
      const list = pendingRef.current;
      const idx = list.findIndex((r) => regionContains(r, nx, ny));
      if (idx >= 0) {
        const next = list.filter((_, i) => i !== idx);
        setPending(next);
        setNotice(next.length === 0 ? 'Quedan 0 candidatas. Descartá o subí la sensibilidad.' : `Candidata excluida. Quedan ${next.length}. Confirmá para marcar.`);
      } else {
        setNotice('Tocá una presa en gris (candidata) para excluirla del lote.');
      }
      return;
    }
    if (tool === 'color') {
      await startColorBatch(nx, ny);
      return;
    }
    // ➕ toggle: quitar si ya está marcada; si no, sumarla.
    const list = valueRef.current;
    const hit = list.findIndex((r) => regionContains(r, nx, ny));
    if (hit >= 0) {
      commitRemove(hit);
    } else {
      addSingleHold(nx, ny);
    }
  };

  // ─── Gestos sobre la foto (tap / pan / pinch / split) ─────────────────────
  const localPt = (e: RPointerEvent<SVGSVGElement>) => {
    const rect = viewRef.current?.getBoundingClientRect();
    return { lx: e.clientX - (rect?.left ?? 0), ly: e.clientY - (rect?.top ?? 0) };
  };

  const svgPt = (e: RPointerEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    if (x < 0 || x > 1 || y < 0 || y > 1) return null;
    return { x, y };
  };

  const onPointerDown = (e: RPointerEvent<SVGSVGElement>) => {
    if (detecting) return;
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    if (!imgReady) return;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* noop */
    }
    const { lx, ly } = localPt(e);
    pointers.current.set(e.pointerId, { lx, ly });
    if (pointers.current.size === 1) {
      if (tool === 'split' && !pendingRef.current) {
        gesture.current = { kind: 'split' };
        const pt = svgPt(e);
        if (pt) {
          splitStart.current = pt;
          setSplitLine({ x1: pt.x, y1: pt.y, x2: pt.x, y2: pt.y });
        }
        return;
      }
      gesture.current = { kind: 'maybe', sx: lx, sy: ly, basePan: { ...viewRef2.current.pan } };
    } else if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      const dist = Math.max(1, Math.hypot(b.lx - a.lx, b.ly - a.ly));
      gesture.current = {
        kind: 'pinch',
        dist0: dist,
        scale0: viewRef2.current.scale,
        lx0: (a.lx + b.lx) / 2,
        ly0: (a.ly + b.ly) / 2,
        basePan: { ...viewRef2.current.pan },
      };
    }
  };

  const onPointerMove = (e: RPointerEvent<SVGSVGElement>) => {
    const { lx, ly } = localPt(e);
    pointers.current.set(e.pointerId, { lx, ly });
    const g = gesture.current;
    if (g.kind === 'split') {
      const pt = svgPt(e);
      if (pt && splitStart.current) {
        setSplitLine({ x1: splitStart.current.x, y1: splitStart.current.y, x2: pt.x, y2: pt.y });
      }
      return;
    }
    if (g.kind === 'pinch' && pointers.current.size >= 2) {
      const [a, b] = [...pointers.current.values()];
      const dist = Math.max(1, Math.hypot(b.lx - a.lx, b.ly - a.ly));
      const s = clampScale(g.scale0 * (dist / g.dist0));
      const v = viewRef2.current;
      const bw = contentRef.current?.offsetWidth ?? viewRef.current?.clientWidth ?? 1;
      const bh = contentRef.current?.offsetHeight ?? 1;
      const ix = (g.lx0 - v.pan.x) / v.scale;
      const iy = (g.ly0 - v.pan.y) / v.scale;
      const pan = { x: g.lx0 - ix * s, y: g.ly0 - iy * s };
      applyView(s, clampPan(pan, s, bw, bh));
      return;
    }
    if (g.kind === 'maybe') {
      const dx = lx - g.sx;
      const dy = ly - g.sy;
      if (Math.hypot(dx, dy) > TAP_MOVE) {
        gesture.current = { kind: 'pan', sx: g.sx, sy: g.sy, basePan: g.basePan };
      }
      return;
    }
    if (g.kind === 'pan') {
      const pan = { x: g.basePan.x + (lx - g.sx), y: g.basePan.y + (ly - g.sy) };
      const s = viewRef2.current.scale;
      const bw = contentRef.current?.offsetWidth ?? viewRef.current?.clientWidth ?? 1;
      const bh = contentRef.current?.offsetHeight ?? 1;
      applyView(s, clampPan(pan, s, bw, bh));
    }
  };

  const onPointerUp = (e: RPointerEvent<SVGSVGElement>) => {
    const g = gesture.current;
    pointers.current.delete(e.pointerId);
    if (g.kind === 'split') {
      const pt = svgPt(e);
      const pa = splitStart.current;
      splitStart.current = null;
      setSplitLine(null);
      if (pa && pt) doSplit(pa, pt);
    } else if (g.kind === 'maybe' && pointers.current.size === 0) {
      const pt = svgPt(e);
      if (pt) void handleTap(pt.x, pt.y);
    }
    if (g.kind === 'pinch' && pointers.current.size < 2) {
      gesture.current = { kind: 'none' };
      pointers.current.clear();
      return;
    }
    if (pointers.current.size === 0) gesture.current = { kind: 'none' };
  };

  const hasColors = holdColors.length > 0;
  const pendingCount = pending?.length ?? 0;

  return (
    <div
      style={{
        background: 'var(--color-bg-base)',
        border: '1px solid var(--color-border-subtle)',
        borderRadius: '0.5rem',
        padding: '0.875rem',
      }}
    >
      {/* Encabezado */}
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
          ✨ Presas del bloque{' '}
          <span style={{ fontWeight: 400, fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
            ({value.length} marcadas{pendingCount > 0 ? ` · ${pendingCount} candidatas` : ''})
          </span>
        </span>
        <div style={{ display: 'flex', gap: '0.375rem' }}>
          <button onClick={handleRedetect} disabled={detecting || !hasColors} style={chipStyle}>
            <Wand2 size={14} /> Re-detectar
          </button>
          <button onClick={handleClear} disabled={value.length === 0 && pendingCount === 0} style={chipStyle}>
            <Trash2 size={14} /> Quitar todas
          </button>
        </div>
      </div>

      {!src ? (
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem', margin: 0 }}>
          Sube una foto del bloque para marcar las presas.
        </p>
      ) : (
        <>
          {/* Foto editable (zoom + pan) */}
          <div
            ref={viewRef}
            style={{
              position: 'relative',
              width: '100%',
              overflow: 'hidden',
              borderRadius: '0.5rem',
              background: '#000',
              touchAction: 'none',
              userSelect: 'none',
              WebkitUserSelect: 'none',
              marginBottom: '0.625rem',
            }}
          >
            <div
              ref={contentRef}
              style={{
                transform: `translate(${view.pan.x}px, ${view.pan.y}px) scale(${view.scale})`,
                transformOrigin: '0 0',
                width: '100%',
                willChange: 'transform',
              }}
            >
              <img
                ref={imgRef}
                src={src}
                alt="Foto para marcar presas"
                crossOrigin="anonymous"
                draggable={false}
                onLoad={() => setImgReady(true)}
                style={{ width: '100%', height: 'auto', display: 'block', pointerEvents: 'none' }}
              />
              {/* Presas marcadas: color UNIFORME del bloque */}
              <HoldOverlay regions={value} colors={holdColors} color={color ?? DEFAULT_BLOCK} />
              {/* Candidatas pendientes: contorno neutro gris */}
              {pending && pending.length > 0 && (
                <svg viewBox="0 0 1 1" preserveAspectRatio="none" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }} aria-hidden="true">
                  {pending.map((r, i) => {
                    const d = regionToPath(r);
                    if (!d) return null;
                    return (
                      <path
                        key={i}
                        d={d}
                        fill="#ffffff"
                        fillOpacity={0.08}
                        stroke="#cbd5e1"
                        strokeWidth={0.003}
                        strokeDasharray="0.008 0.006"
                        strokeLinejoin="round"
                      />
                    );
                  })}
                </svg>
              )}
              {/* Capa de interacción */}
              <svg
                viewBox="0 0 1 1"
                preserveAspectRatio="none"
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                style={{
                  position: 'absolute',
                  inset: 0,
                  width: '100%',
                  height: '100%',
                  cursor: tool === 'split' ? 'crosshair' : 'grab',
                  touchAction: 'none',
                  pointerEvents: 'all',
                }}
              >
                <rect x={0} y={0} width={1} height={1} fill="transparent" />
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
            </div>

            {/* Controles de zoom */}
            <div style={{ position: 'absolute', top: 8, right: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <button aria-label="Acercar" onClick={() => zoomAt(1.5)} style={zoomBtn}>
                <ZoomIn size={18} />
              </button>
              <button aria-label="Alejar" onClick={() => zoomAt(1 / 1.5)} style={zoomBtn}>
                <ZoomOut size={18} />
              </button>
              <button aria-label="Ajustar" onClick={resetZoom} style={zoomBtn}>
                <Maximize size={18} />
              </button>
            </div>
            {view.scale > 1 && (
              <div
                style={{
                  position: 'absolute',
                  left: 8,
                  bottom: 8,
                  color: 'rgba(255,255,255,0.85)',
                  fontSize: '0.72rem',
                  background: 'rgba(0,0,0,0.55)',
                  padding: '0.2rem 0.5rem',
                  borderRadius: '0.375rem',
                  pointerEvents: 'none',
                }}
              >
                Arrastrá para mover · pellizcá para zoom
              </div>
            )}
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
                  pointerEvents: 'none',
                }}
              >
                Detectando presas…
              </div>
            )}
          </div>

          {/* Barra de confirmación de candidatas */}
          {pending && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                marginBottom: '0.625rem',
                padding: '0.5rem 0.625rem',
                background: 'rgba(134,59,255,0.12)',
                border: '1px solid rgba(134,59,255,0.3)',
                borderRadius: '0.5rem',
                flexWrap: 'wrap',
              }}
            >
              <span style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', flex: 1, minWidth: 150 }}>
                {pendingCount === 0
                  ? 'Sin candidatas.'
                  : `${pendingCount} presa${pendingCount === 1 ? '' : 's'} candidata${pendingCount === 1 ? '' : 's'}: tocá las grises que sobren.`}
              </span>
              <button
                onClick={confirmPending}
                disabled={pendingCount === 0}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.375rem',
                  padding: '0.5rem 1rem',
                  background: pendingCount === 0 ? 'var(--color-bg-hover)' : 'var(--color-accent-primary)',
                  color: pendingCount === 0 ? 'var(--color-text-muted)' : 'var(--color-text-inverse)',
                  border: 'none', borderRadius: '0.5rem', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer',
                }}
              >
                <Check size={16} /> Marcar {pendingCount}
              </button>
              <button
                onClick={cancelPending}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.375rem',
                  padding: '0.5rem 0.9rem',
                  background: 'var(--color-bg-surface)',
                  color: 'var(--color-text-secondary)',
                  border: '1px solid var(--color-border-default)', borderRadius: '0.5rem',
                  fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer',
                }}
              >
                <X size={16} /> Descartar
              </button>
            </div>
          )}

          {/* Herramientas */}
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
              <button
                onClick={() => selectTool('add')}
                disabled={!!pending}
                style={{ ...toolBtn, ...(tool === 'add' && !pending ? toolBtnActive : {}), ...(pending ? { opacity: 0.5, cursor: 'not-allowed' } : {}) }}
              >
                <Plus size={13} /> Sumar/Quitar
              </button>
              <button
                onClick={() => selectTool('color')}
                disabled={!!pending}
                style={{ ...toolBtn, ...(tool === 'color' && !pending ? toolBtnActive : {}), ...(pending ? { opacity: 0.5, cursor: 'not-allowed' } : {}) }}
              >
                🎨 Por color
              </button>
              <button
                onClick={() => selectTool('split')}
                disabled={!!pending}
                style={{ ...toolBtn, ...(tool === 'split' && !pending ? toolBtnActive : {}), ...(pending ? { opacity: 0.5, cursor: 'not-allowed' } : {}) }}
              >
                ✂️ Partir
              </button>
            </div>
            <div style={{ flex: 1, minWidth: 160 }}>
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
                  {pending
                    ? 'Tolerancia de detección de las candidatas'
                    : tool === 'add'
                      ? 'Tocá una presa: se suma · tocá una marcada: se quita'
                      : tool === 'color'
                        ? 'Tocá una presa para detectar todas las de su color'
                        : 'Arrastrá la línea para partir la presa'}
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
            <strong>Sumar/Quitar</strong>: tocá una presa para agregarla y tocá una ya marcada para quitarla (usá el zoom
            para precisión). <strong>🎨 Por color</strong>: detecta todas las de un color y te las muestra como candidatas
            para confirmar. El bloque se ve siempre de{' '}
            <strong>un solo color</strong> (el de su categoría), aunque las presas sean de varios colores.{' '}
            <strong>✂️ Partir</strong> divide un área grande en dos.
          </p>
        </>
      )}
    </div>
  );
}
