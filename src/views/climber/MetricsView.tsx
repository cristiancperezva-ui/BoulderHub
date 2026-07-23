import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { getAllDocs } from '@/lib/firestore';
import { collection, collectionGroup, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { format, subMonths, startOfMonth, endOfMonth, isWithinInterval, parseISO } from 'date-fns';
import type { Attempt, Block } from '@/types';
import {
  BarChart3, Download, TrendingUp, Award, Flame, Calendar, Star, Activity, RefreshCw
} from 'lucide-react';

interface AttemptRecord {
  date: string;
  type: 'flash' | 'encadenado' | 'proyecto';
  attemptsRange?: string;
  blockName?: string;
  wallName?: string;
  categoryColor?: string;
  proposedV?: number;
  rating?: number;
}

function generateCSV(attempts: AttemptRecord[], _username: string): string {
  const headers = 'Fecha,Bloque,Muro,Color,Grado V,Tipo,Rango intentos,Calificación';
  const rows = attempts.map(a =>
    [a.date, `"${a.blockName ?? ''}"`, `"${a.wallName ?? ''}"`, `"${a.categoryColor ?? ''}"`,
      a.proposedV ?? '', a.type, a.attemptsRange ?? '', a.rating ?? ''].join(',')
  );
  return [headers, ...rows].join('\n');
}

function downloadCSV(csv: string, username: string) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `boulderhub-metricas-${username}-${format(new Date(), 'yyyy-MM-dd')}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function calculateStreak(dates: string[]): number {
  const unique = [...new Set(dates)].sort().reverse();
  if (unique.length === 0) return 0;
  const today = format(new Date(), 'yyyy-MM-dd');
  const yesterday = format(subMonths(new Date(), 0), 'yyyy-MM-dd');
  if (unique[0] !== today && unique[0] !== yesterday) return 0;
  let streak = 1;
  for (let i = 1; i < unique.length; i++) {
    const diff = (new Date(unique[i - 1]).getTime() - new Date(unique[i]).getTime()) / (1000 * 60 * 60 * 24);
    if (diff <= 1.5) streak++; else break;
  }
  return streak;
}

export function ClimberMetricsView() {
  const { user, profile } = useAuth();
  const [records, setRecords] = useState<AttemptRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const now = new Date();
  const [dateFrom, setDateFrom] = useState(format(subMonths(now, 3), 'yyyy-MM'));
  const [dateTo, setDateTo] = useState(format(now, 'yyyy-MM'));

  const loadRecords = useCallback(async () => {
    if (!user) return;
    setRefreshing(true);
    try {
        const blocks = await getAllDocs<Block>('blocks');
        const blockMap = new Map(blocks.map(b => [b.id, b]));
        const recs: AttemptRecord[] = [];

        // Intenta primero con collectionGroup (más eficiente)
        try {
          const q = query(collectionGroup(db, 'attempts'), where('userId', '==', user.uid));
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
              attemptsRange: data.attemptsRange ?? undefined,
              blockName: block?.wallName ?? 'Bloque',
              wallName: block?.wallName ?? '—',
              categoryColor: block?.categoryColorName ?? '—',
              proposedV: block?.proposedDifficultyV,
              rating: data.rating ?? undefined,
            });
          });
        } catch (cgError) {
          // Fallback: si collectionGroup falla (falta índice), consultar bloque por bloque
          console.warn('collectionGroup falló, usando fallback por bloques:', cgError);
          for (const block of blocks) {
            try {
              const attemptSnap = await getDocs(
                query(collection(db, 'blocks', block.id, 'attempts'), where('userId', '==', user.uid))
              );
              attemptSnap.docs.forEach(doc => {
                const data = doc.data() as Attempt;
                const ts = data.createdAt;
                const dateStr = ts
                  ? format(new Date(typeof ts === 'number' ? ts : (ts as any).seconds ? (ts as any).seconds * 1000 : Date.now()), 'yyyy-MM-dd')
                  : format(new Date(), 'yyyy-MM-dd');
                recs.push({
                  date: dateStr,
                  type: data.type,
                  attemptsRange: data.attemptsRange ?? undefined,
                  blockName: block.wallName ?? 'Bloque',
                  wallName: block.wallName ?? '—',
                  categoryColor: block.categoryColorName ?? '—',
                  proposedV: block.proposedDifficultyV,
                  rating: data.rating ?? undefined,
                });
              });
            } catch (e) { /* ignorar errores por bloque */ }
          }
        }

        setRecords(recs);
      } catch (e) { console.warn('Metrics load:', e); }
      finally { setLoading(false); setRefreshing(false); }
    }, [user]);

  useEffect(() => {
    loadRecords();
  }, [user, refreshKey]);

  const filtered = useMemo(() => {
    const from = startOfMonth(new Date(dateFrom + '-01'));
    const to = endOfMonth(new Date(dateTo + '-01'));
    return records.filter(a => {
      const d = parseISO(a.date);
      return isWithinInterval(d, { start: from, end: to });
    });
  }, [records, dateFrom, dateTo]);

  const kpis = useMemo(() => {
    const total = filtered.length;
    const flashes = filtered.filter(a => a.type === 'flash').length;
    const encadenados = filtered.filter(a => a.type === 'encadenado').length;
    const proyectos = filtered.filter(a => a.type === 'proyecto').length;
    const avgRating = total > 0 ? filtered.reduce((s, a) => s + (a.rating ?? 0), 0) / total : 0;
    const streak = calculateStreak(filtered.map(a => a.date));
    const activeDays = new Set(filtered.map(a => a.date)).size;
    return { total, flashes, encadenados, proyectos, avgRating, streak, activeDays };
  }, [filtered]);

  const handleExport = () => {
    const csv = generateCSV(filtered, profile?.displayName ?? 'escalador');
    downloadCSV(csv, profile?.displayName ?? 'escalador');
  };

  if (loading) return <p style={{ color: 'var(--color-text-muted)', padding: '2rem', textAlign: 'center' }}>Cargando métricas...</p>;

  return (
    <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0 0 0.25rem', color: 'var(--color-text-primary)' }}>Mis Métricas</h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', margin: 0 }}>
            {profile?.emoji ?? ''} {profile?.displayName ?? 'Escalador'} · {records.length} intento{records.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button onClick={() => setRefreshKey(k => k + 1)} disabled={refreshing}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.625rem 1rem',
              background: 'var(--color-bg-surface)',
              color: 'var(--color-text-secondary)',
              border: '1px solid var(--color-border-default)', borderRadius: '0.5rem', fontWeight: 500,
              cursor: refreshing ? 'not-allowed' : 'pointer', fontSize: '0.875rem',
            }}
          >
            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} /> {refreshing ? 'Cargando...' : 'Actualizar'}
          </button>
          <button onClick={handleExport} disabled={records.length === 0}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.625rem 1.25rem',
              background: records.length > 0 ? 'var(--color-accent-primary)' : 'var(--color-bg-hover)',
              color: records.length > 0 ? 'var(--color-text-inverse)' : 'var(--color-text-muted)',
              border: 'none', borderRadius: '0.5rem', fontWeight: 600,
              cursor: records.length > 0 ? 'pointer' : 'not-allowed', fontSize: '0.875rem',
            }}
          >
            <Download size={16} /> {records.length > 0 ? 'Descargar CSV' : 'Sin datos'}
          </button>
        </div>
      </div>

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
        <span style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem', marginLeft: 'auto' }}>
          {filtered.length} registro{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '0.75rem', marginBottom: '1.5rem' }}>
        {[
          { icon: BarChart3, label: 'Totales', value: kpis.total, color: 'var(--color-accent-primary)' },
          { icon: Award, label: 'Flash ✅', value: kpis.flashes, color: 'var(--color-accent-secondary)' },
          { icon: TrendingUp, label: 'Encadenados 🧗', value: kpis.encadenados, color: 'var(--color-accent-tertiary)' },
          { icon: Activity, label: 'Proyectos 🎯', value: kpis.proyectos, color: 'var(--color-state-info)' },
          { icon: Star, label: 'Prom. estrellas', value: kpis.total > 0 ? kpis.avgRating.toFixed(1) : '—', color: 'var(--color-accent-tertiary)' },
          { icon: Flame, label: 'Racha 🔥', value: `${kpis.streak} días`, color: 'var(--color-state-error)' },
          { icon: Calendar, label: 'Días activo', value: kpis.activeDays, color: 'var(--color-state-info)' },
        ].map(({ icon: Icon, label, value, color }) => (
          <div key={label} style={{
            background: 'var(--color-bg-surface)', border: '1px solid var(--color-border-subtle)',
            borderRadius: '0.75rem', padding: '1rem', textAlign: 'center',
          }}>
            <Icon size={20} style={{ color, margin: '0 auto 0.375rem' }} />
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>{value}</div>
            <div style={{ color: 'var(--color-text-muted)', fontSize: '0.7rem', marginTop: '0.125rem' }}>{label}</div>
          </div>
        ))}
      </div>

      {records.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-muted)' }}>
          <p>Aún no has marcado ningún bloque. Ve a <strong>Bloques</strong> y comienza a escalar.</p>
        </div>
      ) : (
        <div style={{
          background: 'var(--color-bg-surface)', border: '1px solid var(--color-border-subtle)',
          borderRadius: '0.75rem', padding: '1.25rem',
        }}>
          <h3 style={{ color: 'var(--color-text-primary)', fontSize: '0.95rem', fontWeight: 600, marginBottom: '0.75rem' }}>
            📋 Registro de intentos
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {filtered.map((a, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: '0.75rem',
                padding: '0.625rem 0.75rem', background: 'var(--color-bg-base)',
                borderRadius: '0.5rem', border: '1px solid var(--color-border-subtle)', fontSize: '0.85rem',
              }}>
                <span style={{ color: 'var(--color-text-muted)', flexShrink: 0 }}>{a.date}</span>
                <span style={{
                  padding: '0.125rem 0.5rem', borderRadius: '999px', fontWeight: 600, fontSize: '0.75rem',
                  background: a.type === 'flash' ? 'rgba(74,158,110,0.15)' :
                    a.type === 'encadenado' ? 'rgba(212,168,75,0.15)' : 'rgba(90,155,213,0.15)',
                  color: a.type === 'flash' ? 'var(--color-state-success)' :
                    a.type === 'encadenado' ? 'var(--color-accent-tertiary)' : 'var(--color-state-info)',
                }}>
                  {a.type === 'flash' ? 'Flash' : a.type === 'encadenado' ? `Enc (${a.attemptsRange})` : 'Proy'}
                </span>
                <span style={{ color: 'var(--color-text-secondary)' }}>{a.wallName}</span>
                {a.rating && <span style={{ color: 'var(--color-accent-tertiary)', marginLeft: 'auto' }}>⭐{a.rating}</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
