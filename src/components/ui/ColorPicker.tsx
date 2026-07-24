import { useRef, useEffect, useState, useCallback } from 'react';

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
}

function hslToHex(h: number, s: number, l: number): string {
  s /= 100;
  l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

function hexToHsl(hex: string): [number, number, number] {
  let r = 0, g = 0, b = 0;
  const clean = hex.replace('#', '');
  if (clean.length === 6) {
    r = parseInt(clean.substring(0, 2), 16) / 255;
    g = parseInt(clean.substring(2, 4), 16) / 255;
    b = parseInt(clean.substring(4, 6), 16) / 255;
  }
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) * 60; break;
      case g: h = ((b - r) / d + 2) * 60; break;
      case b: h = ((r - g) / d + 4) * 60; break;
    }
  }
  return [Math.round(h), Math.round(s * 100), Math.round(l * 100)];
}

export function ColorPicker({ value, onChange }: ColorPickerProps) {
  const svRef = useRef<HTMLCanvasElement>(null);
  const hueRef = useRef<HTMLCanvasElement>(null);
  const [hue, setHue] = useState(() => hexToHsl(value)[0]);
  const [saturation, setSaturation] = useState(() => hexToHsl(value)[1]);
  const [lightness, setLightness] = useState(() => hexToHsl(value)[2]);
  const [hexInput, setHexInput] = useState(value);
  const dragging = useRef<'sv' | 'hue' | null>(null);

  // Dibujar el canvas de saturación/luminosidad
  const drawSV = useCallback(() => {
    const canvas = svRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const w = canvas.width;
    const h = canvas.height;

    // Fondo con el tono actual
    const grad = ctx.createLinearGradient(0, 0, w, 0);
    grad.addColorStop(0, '#FFFFFF');
    grad.addColorStop(1, `hsl(${hue}, 100%, 50%)`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Negro de abajo hacia arriba
    const grad2 = ctx.createLinearGradient(0, 0, 0, h);
    grad2.addColorStop(0, 'rgba(0,0,0,0)');
    grad2.addColorStop(1, '#000000');
    ctx.fillStyle = grad2;
    ctx.fillRect(0, 0, w, h);

    // Círculo indicador
    const sx = (saturation / 100) * w;
    const sy = (1 - lightness / 100) * h;
    ctx.beginPath();
    ctx.arc(sx, sy, 6, 0, Math.PI * 2);
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(sx, sy, 4, 0, Math.PI * 2);
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1;
    ctx.stroke();
  }, [hue, saturation, lightness]);

  // Dibujar el canvas del hue
  const drawHue = useCallback(() => {
    const canvas = hueRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const w = canvas.width;
    const h = canvas.height;

    const grad = ctx.createLinearGradient(0, 0, w, 0);
    for (let i = 0; i <= 360; i += 30) {
      grad.addColorStop(i / 360, `hsl(${i}, 100%, 50%)`);
    }
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Indicador
    const hx = (hue / 360) * w;
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(hx, 0);
    ctx.lineTo(hx, h);
    ctx.stroke();
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(hx, 0);
    ctx.lineTo(hx, h);
    ctx.stroke();
  }, [hue]);

  useEffect(() => { drawSV(); }, [drawSV]);
  useEffect(() => { drawHue(); }, [drawHue]);

  const getSVFromEvent = (clientX: number, clientY: number) => {
    const canvas = svRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const y = Math.max(0, Math.min(clientY - rect.top, rect.height));
    const s = Math.round((x / rect.width) * 100);
    const l = Math.round(100 - (y / rect.height) * 100);
    setSaturation(s);
    setLightness(l);
    const hex = hslToHex(hue, s, l);
    setHexInput(hex);
    onChange(hex);
  };

  const getHueFromEvent = (clientX: number) => {
    const canvas = hueRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const h = Math.round((x / rect.width) * 360);
    setHue(h);
    const hex = hslToHex(h, saturation, lightness);
    setHexInput(hex);
    onChange(hex);
  };

  const handleMouseDownSV = (e: React.MouseEvent) => {
    dragging.current = 'sv';
    getSVFromEvent(e.clientX, e.clientY);
  };

  const handleMouseDownHue = (e: React.MouseEvent) => {
    dragging.current = 'hue';
    getHueFromEvent(e.clientX);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragging.current) return;
    if (dragging.current === 'sv') getSVFromEvent(e.clientX, e.clientY);
    else getHueFromEvent(e.clientX);
  };

  const handleMouseUp = () => {
    dragging.current = null;
  };

  const handleTouchStartSV = (e: React.TouchEvent) => {
    dragging.current = 'sv';
    const t = e.touches[0];
    getSVFromEvent(t.clientX, t.clientY);
  };

  const handleTouchStartHue = (e: React.TouchEvent) => {
    dragging.current = 'hue';
    const t = e.touches[0];
    getHueFromEvent(t.clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!dragging.current) return;
    const t = e.touches[0];
    if (dragging.current === 'sv') getSVFromEvent(t.clientX, t.clientY);
    else getHueFromEvent(t.clientX);
  };

  const handleTouchEnd = () => {
    dragging.current = null;
  };

  const handleHexChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setHexInput(v);
    if (/^#[0-9a-fA-F]{6}$/.test(v)) {
      const [h, s, l] = hexToHsl(v);
      setHue(h);
      setSaturation(s);
      setLightness(l);
      onChange(v);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', userSelect: 'none' as const }}>
      {/* Canvas de Saturación/Luminosidad */}
      <div
        onMouseDown={handleMouseDownSV}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStartSV}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          width: '100%', maxWidth: 320, height: 200,
          borderRadius: '0.5rem', overflow: 'hidden',
          cursor: 'crosshair', touchAction: 'none',
          border: '1px solid var(--color-border-subtle)',
          position: 'relative' as const,
        }}
      >
        <canvas ref={svRef} width={320} height={200}
          style={{ width: '100%', height: '100%', display: 'block' }} />
      </div>

      {/* Canvas de Hue */}
      <div
        onMouseDown={handleMouseDownHue}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStartHue}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          width: '100%', maxWidth: 320, height: 20,
          borderRadius: '0.5rem', overflow: 'hidden',
          cursor: 'crosshair', touchAction: 'none',
          border: '1px solid var(--color-border-subtle)',
          position: 'relative' as const,
        }}
      >
        <canvas ref={hueRef} width={320} height={20}
          style={{ width: '100%', height: '100%', display: 'block' }} />
      </div>

      {/* Previsualización + Hex */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', maxWidth: 320 }}>
        <div style={{
          width: 40, height: 40,
          borderRadius: '0.5rem',
          background: value,
          border: '1px solid var(--color-border-default)',
          flexShrink: 0,
        }} />
        <input
          value={hexInput}
          onChange={handleHexChange}
          placeholder="#E87D3E"
          maxLength={7}
          style={{
            flex: 1,
            padding: '0.5rem 0.75rem',
            background: 'var(--color-bg-base)',
            border: '1px solid var(--color-border-default)',
            borderRadius: '0.375rem',
            color: 'var(--color-text-primary)',
            fontSize: '0.9rem',
            fontFamily: 'monospace',
            outline: 'none',
            textTransform: 'uppercase' as const,
          }}
        />
      </div>
    </div>
  );
}
