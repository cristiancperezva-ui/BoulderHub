import { useState, useMemo, useCallback } from 'react';
import { Download, Calendar, Mountain, Star, Activity, Users, TrendingUp, RefreshCw } from 'lucide-react';
import { useActiveBlocks } from '@/hooks/useBlocks';
import { useGlobalStats } from '@/hooks/useGlobalStats';
import { collectionGroup, query, getDocs, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { format, subMonths, startOfMonth, endOfMonth, isWithinInterval, parseISO } from 'date-fns';
import type { Attempt } from '@/types';

interface AttemptRecord {
  date: string;
  type: 'flash' | 'encadenado' | 'proyecto';
  blockName?: string;
  wallName?: string;
  rating?: number;
  routeSetterName?: string;
}

function generateCSV(attempts: AttemptRecord[]): string {
  const headers = 'Fecha,Bloque,Muro,Routesetter,Tipo,Calificación';
  const rows = attempts.map(a =>
    [a.date, `"${a.blockName ?? ''}"`, `"${a.wallName ?? ''}"`, `"${a.routeSetterName ?? ''}"`, a.type, a.rating ?? ''].join(',')
  );
  return [headers, ...rows].join('\n');
}

function downloadCSV(csv: string) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `boulderhub-metricas-admin-${format(new Date(), 'yyyy-MM-dd')}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function AdminMetricsView() {
  const now = new Date();
  const [dateFrom, setDateFrom] = useState(format(subMonths(now, 3), 'yyyy-MM'));
  const [dateTo, setDateTo] = useState(format(now, 'yyyy-MM'));

  // ✅ Stats globales cacheados (1 lectura)
  const { data: stats, isLoading: statsLoading } = useGlobalStats();
  // ✅ Bloques activos cacheados (10 min)
  const { data: blocks = [], isLoading: blocksLoading } = useActiveBlocks();

  // Estado para la carga bajo demanda de intentos detallados
  const [allAttempts, setAllAttempts] = useState<AttemptRecord[] | null>(null);
  const [loadingAttempts, setLoadingAttempts] = useState(false);

  // Cargar intentos SOLO cuando el usuario hace clic en "Cargar detalles" o cambia fecha
  // Usa collectionGroup — 1 sola consulta en vez de N+1
  const loadAttemptDetails = useCallback(async () => {
    setLoadingAttempts(true);
    try {
      const recs: AttemptRecord[] = [];

      // Construir mapa de bloques para denormalizar
      const blockMap = new Map(blocks.map(b => [b.id, b]));

      // 1 sola consulta con collectionGroup (requiere índice compuesto)
      const q = query(
        collectionGroup(db, 'attempts'),
        orderBy('createdAt', 'desc'),
      );
      const snap = await getDocs(q);
      snap.docs.forEach(doc => {
        const segments = doc.ref.path.split('/');
        const blockId = segments[segments.length - 3];
        const data = doc.data() as Attempt;
        const block = blockMap.get(blockId);
        const ts = data.createdAt;
        const dateStr = ts
          ? format(new Date(typeof ts === 'number' ? ts : (ts as any).seconds ? (ts as any).seconds * 1000 : Date.now()), 'yyyy-MM-dd')
          : format(new Date(), 'yyyy-MM-dd');
        recs.push({
          date: dateStr,
          type: data.type,
          blockName: block?.wallName ?? 'Bloque',
          wallName: block?.wallName ?? '—',
          rating: data.rating ?? undefined,
          routeSetterName: block?.routeSetterName ?? '—',
        });
      });

      setAllAttempts(recs);
    } catch (e) {
      console.warn('Error cargando intentos detallados:', e);
    } finally {
      setLoadingAttempts(false);
    }
  }, [blocks]);

  const filteredAttempts = useMemo(() => {
    if (!allAttempts) return [];
    const [fy, fm] = dateFrom.split('-').map(Number);
    const [ty, tm] = dateTo.split('-').map(Number);
    const from = startOfMonth(new Date(fy, fm - 1, 1));
    const to = endOfMonth(new Date(ty, tm - 1, 1));
    return allAttempts.filter(a => {
      const d = parseISO(a.date);
      return isWithinInterval(d, { start: from, end: to });
    });
  }, [allAttempts, dateFrom, dateTo]);

  // KPIs desde stats globales (sin leer intentos)
  const totalAttempts = allAttempts ? filteredAttempts.length : (stats?.totalAttempts ?? 0);
  const flashPct = allAttempts && totalAttempts > 0
    ? `${Math.round(filteredAttempts.filter(a => a.type === 'flash').length / totalAttempts * 100)}%`
    : '—';

  // Routesetters ranking desde bloques cacheados (sin leer intentos)
  const setterRanking = useMemo(() => {
    const setterMap = new Map<string, { blocks: number; attempts: number; rating: number }>();
    blocks.forEach(b => {
      const key = b.routeSetterName;
      if (!setterMap.has(key)) setterMap.set(key, { blocks: 0, attempts: 0, rating: 0 });
      const s = setterMap.get(key)!;
      s.blocks++;
      s.attempts += b.totalAttempts ?? 0;
      s.rating += b.avgRating ?? 0;
    });
    setterMap.forEach((v) => { v.rating = v.blocks > 0 ? v.rating / v.blocks : 0; });
    return Array.from(setterMap.entries())
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.blocks - a.blocks);
  }, [blocks]);

  const handleExport = () => {
    if (!allAttempts) return;
    const csv = generateCSV(filteredAttempts);
    downloadCSV(csv);
  };

  const isLoading = statsLoading || blocksLoading;

  if (isLoading) return <p style={{ color: 'var(--color-text-muted)', padding: '2rem', textAlign: 'center' }}>Cargando métricas...</p>;

  return (
    <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0 0 0.25rem', color: 'var(--color-text-primary)' }}>Métricas Generales</h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', margin: 0 }}>
            {stats?.totalBlocks ?? '—'} bloques · {stats?.totalAttempts ?? '—'} intentos totales · {stats?.activeBlocks ?? '—'} activos
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {!allAttempts && !loadingAttempts && (
            <button onClick={loadAttemptDetails}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.625rem 1.25rem',
                background: 'var(--color-accent-primary)',
                color: 'var(--color-text-inverse)',
                border: 'none', borderRadius: '0.5rem', fontWeight: 600,
                cursor: 'pointer', fontSize: '0.875rem',
              }}
            >
              <Activity size={16} /> Cargar detalles de intentos
            </button>
          )}
          {allAttempts && (
            <button onClick={handleExport} disabled={filteredAttempts.length === 0}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.625rem 1.25rem',
                background: filteredAttempts.length > 0 ? 'var(--color-accent-primary)' : 'var(--color-bg-hover)',
                color: filteredAttempts.length > 0 ? 'var(--color-text-inverse)' : 'var(--color-text-muted)',
                border: 'none', borderRadius: '0.5rem', fontWeight: 600,
                cursor: filteredAttempts.length > 0 ? 'pointer' : 'not-allowed', fontSize: '0.875rem',
              }}
            >
              <Download size={16} /> Exportar CSV
            </button>
          )}
        </div>
      </div>

      {/* Selector de rango de fechas */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem',
        padding: '1rem', background: 'var(--color-bg-surface)',
        border: '1px solid var(--color-border-subtle)', borderRadius: '0.75rem', flexWrap: 'wrap',
      }}>
        <Calendar size={16} style={{ color: 'var(--color-text-muted)' }} />
        <span style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>Rango:</span>
        <input type="month" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
          style={{ padding: '0.375rem 0.75rem', background: 'var(--color-bg-base)',
            border: '1px solid var(--color-border-default)', borderRadius: '0.375rem',
            color: 'var(--color-text-primary)', fontSize: '0.85rem' }} />
        <span style={{ color: 'var(--color-text-muted)' }}>→</span>
        <input type="month" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
          style={{ padding: '0.375rem 0.75rem', background: 'var(--color-bg-base)',
            border: '1px solid var(--color-border-default)', borderRadius: '0.375rem',
            color: 'var(--color-text-primary)', fontSize: '0.85rem' }} />
      </div>

      {/* KPIs — desde caché, 0 lecturas extra */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '0.75rem', marginBottom: '1.5rem' }}>
        {[
          { icon: Mountain, label: 'Bloques totales', value: String(stats?.totalBlocks ?? '—'), color: 'var(--color-state-info)' },
          { icon: Mountain, label: 'Bloques activos', value: String(stats?.activeBlocks ?? '—'), color: 'var(--color-state-success)' },
          { icon: Activity, label: 'Intentos', value: String(totalAttempts), color: 'var(--color-accent-primary)' },
          { icon: Star, label: 'Rating prom.', value: stats?.avgRating && stats.avgRating > 0 ? stats.avgRating.toFixed(1) : '—', color: 'var(--color-accent-tertiary)' },
          { icon: Users, label: 'Routesetters', value: String(setterRanking.length), color: 'var(--color-state-error)' },
          { icon: TrendingUp, label: 'Flash %', value: flashPct, color: 'var(--color-state-success)' },
        ].map(({ icon: Icon, label, value, color }) => (
          <div key={label} style={{
            background: 'var(--color-bg-surface)', border: '1px solid var(--color-border-subtle)',
            borderRadius: '0.75rem', padding: '1rem', textAlign: 'center',
          }}>
            <Icon size={20} style={{ color, margin: '0 auto 0.375rem' }} />
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>{value}</div>
            <div style={{ color: 'var(--color-text-secondary)', fontSize: '0.7rem', marginTop: '0.125rem' }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Carga bajo demanda de detalles */}
      {loadingAttempts && (
        <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--color-text-muted)' }}>
          <RefreshCw size={20} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 0.5rem' }} />
          Cargando detalles de intentos...
        </div>
      )}

      {/* Ranking de Routesetters — desde bloques cacheados */}
      <div style={{
        background: 'var(--color-bg-surface)', border: '1px solid var(--color-border-subtle)',
        borderRadius: '0.75rem', padding: '1.25rem', marginBottom: '1.5rem',
      }}>
        <h3 style={{ color: 'var(--color-text-primary)', fontSize: '0.95rem', fontWeight: 600, marginBottom: '0.75rem' }}>
          🏆 Ranking de routesetters
        </h3>
        {setterRanking.length === 0 ? (
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>Sin datos</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
            {setterRanking.map((s, i) => (
              <div key={s.name} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '0.5rem 0.75rem', background: 'var(--color-bg-base)',
                borderRadius: '0.375rem',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem', fontWeight: 600, minWidth: 20 }}>
                    {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                  </span>
                  <span style={{ color: 'var(--color-text-primary)', fontWeight: 500, fontSize: '0.85rem' }}>{s.name}</span>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                  <span>📦 {s.blocks}</span>
                  <span>⭐ {s.rating > 0 ? s.rating.toFixed(1) : '—'}</span>
                  <span>👀 {s.attempts}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Distribución de tipos de intento — solo si se cargaron detalles */}
      {allAttempts && filteredAttempts.length > 0 && (
        <div style={{
          background: 'var(--color-bg-surface)', border: '1px solid var(--color-border-subtle)',
          borderRadius: '0.75rem', padding: '1.25rem',
        }}>
          <h3 style={{ color: 'var(--color-text-primary)', fontSize: '0.95rem', fontWeight: 600, marginBottom: '0.75rem' }}>
            📊 Distribución de intentos ({filteredAttempts.length} en el período)
          </h3>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            {[
              { label: 'Flash ✅', count: filteredAttempts.filter(a => a.type === 'flash').length, color: 'var(--color-state-success)' },
              { label: 'Encadenado 🧗', count: filteredAttempts.filter(a => a.type === 'encadenado').length, color: 'var(--color-accent-tertiary)' },
              { label: 'Proyecto 🎯', count: filteredAttempts.filter(a => a.type === 'proyecto').length, color: 'var(--color-state-info)' },
            ].map(({ label, count, color }) => (
              <div key={label} style={{ flex: 1, minWidth: 120, textAlign: 'center' }}>
                <div style={{
                  height: 80, display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
                  marginBottom: '0.375rem',
                }}>
                  <div style={{
                    width: '60%', maxWidth: 48,
                    height: `${Math.max((count / Math.max(...[
                      filteredAttempts.filter(a => a.type === 'flash').length,
                      filteredAttempts.filter(a => a.type === 'encadenado').length,
                      filteredAttempts.filter(a => a.type === 'proyecto').length,
                    ])) * 70, 6)}px`,
                    background: color, borderRadius: '6px 6px 2px 2px', opacity: 0.8,
                    transition: 'height 0.3s',
                  }} />
                </div>
                <div style={{ fontSize: '0.9rem', fontWeight: 700, color }}>{count}</div>
                <div style={{ color: 'var(--color-text-muted)', fontSize: '0.7rem', marginTop: '0.125rem' }}>{label}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
