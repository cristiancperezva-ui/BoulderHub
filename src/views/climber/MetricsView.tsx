import { useState, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { format, subMonths, startOfMonth, endOfMonth, isWithinInterval, parseISO } from 'date-fns';
import {
  BarChart3,
  Download,
  TrendingUp,
  Award,
  Flame,
  Calendar,
  Star,
  Activity,
} from 'lucide-react';

// ─── Tipos locales ───────────────────────────────────────────────────────────
interface AttemptRecord {
  date: string;       // ISO
  type: 'flash' | 'encadenado' | 'proyecto';
  attemptsRange?: string;
  blockName?: string;
  wallName?: string;
  categoryColor?: string;
  proposedV?: number;
  proposedVMin?: number;
  proposedVMax?: number;
  rating?: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function generateCSV(attempts: AttemptRecord[], _username: string): string {
  const headers = [
    'Fecha', 'Bloque', 'Muro', 'Color categoría',
    'Grado V propuesto', 'Tipo', 'Rango intentos',
    'Mi rango V min', 'Mi rango V max', 'Mi calificación',
  ].join(',');

  const rows = attempts.map(a => [
    a.date,
    `"${a.blockName ?? ''}"`,
    `"${a.wallName ?? ''}"`,
    `"${a.categoryColor ?? ''}"`,
    a.proposedV ?? '',
    a.type,
    a.attemptsRange ?? '',
    a.proposedVMin ?? '',
    a.proposedVMax ?? '',
    a.rating ?? '',
  ].join(','));

  const csv = [headers, ...rows].join('\n');
  return csv;
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

function calculateStreak(attempts: AttemptRecord[]): number {
  if (attempts.length === 0) return 0;
  const uniqueDates = [...new Set(attempts.map(a => a.date))].sort().reverse();
  let streak = 1;
  const today = new Date();
  const todayStr = format(today, 'yyyy-MM-dd');
  const yesterdayStr = format(subMonths(today, 0), 'yyyy-MM-dd');

  // Check if most recent activity is today or yesterday
  if (uniqueDates[0] !== todayStr && uniqueDates[0] !== yesterdayStr) return 0;

  for (let i = 1; i < uniqueDates.length; i++) {
    const curr = new Date(uniqueDates[i - 1]);
    const prev = new Date(uniqueDates[i]);
    const diff = (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24);
    if (diff <= 1.5) streak++;
    else break;
  }
  return streak;
}

// ─── Mock data ───────────────────────────────────────────────────────────────
function getMockAttempts(): AttemptRecord[] {
  const now = new Date();
  const types: AttemptRecord['type'][] = ['flash', 'encadenado', 'proyecto'];
  const colors = ['Amarillo', 'Verde', 'Azul', 'Rojo', 'Naranja'];
  const walls = ['Muro Principal', 'Muro de Slab', 'Muro de Volumen'];
  const mock: AttemptRecord[] = [];

  for (let i = 0; i < 45; i++) {
    const date = new Date(now);
    date.setDate(date.getDate() - Math.floor(Math.random() * 120));
    const type = types[Math.floor(Math.random() * types.length)];
    mock.push({
      date: format(date, 'yyyy-MM-dd'),
      type,
      attemptsRange: type === 'encadenado' ? (['2-5', '5-10', '10+'] as const)[Math.floor(Math.random() * 3)] : undefined,
      blockName: `Bloque ${i + 1}`,
      wallName: walls[Math.floor(Math.random() * walls.length)],
      categoryColor: colors[Math.floor(Math.random() * colors.length)],
      proposedV: Math.floor(Math.random() * 11) + 2,
      proposedVMin: Math.floor(Math.random() * 4) + 2,
      proposedVMax: Math.floor(Math.random() * 4) + 6,
      rating: Math.floor(Math.random() * 5) + 1,
    });
  }
  return mock.sort((a, b) => a.date.localeCompare(b.date));
}

// ─── Componente ──────────────────────────────────────────────────────────────
export function ClimberMetricsView() {
  const { profile } = useAuth();

  // Fechas
  const now = new Date();
  const [dateFrom, setDateFrom] = useState(format(subMonths(now, 3), 'yyyy-MM'));
  const [dateTo, setDateTo] = useState(format(now, 'yyyy-MM'));

  // Datos
  const allAttempts = useMemo(() => getMockAttempts(), []);
  const filteredAttempts = useMemo(() => {
    const from = startOfMonth(new Date(dateFrom + '-01'));
    const to = endOfMonth(new Date(dateTo + '-01'));
    return allAttempts.filter(a => {
      const d = parseISO(a.date);
      return isWithinInterval(d, { start: from, end: to });
    });
  }, [allAttempts, dateFrom, dateTo]);

  // KPIs
  const kpis = useMemo(() => {
    const total = filteredAttempts.length;
    const flashes = filteredAttempts.filter(a => a.type === 'flash').length;
    const encadenados = filteredAttempts.filter(a => a.type === 'encadenado').length;
    const proyectos = filteredAttempts.filter(a => a.type === 'proyecto').length;
    const avgRating = filteredAttempts.length > 0
      ? filteredAttempts.reduce((s, a) => s + (a.rating ?? 0), 0) / filteredAttempts.length
      : 0;
    const streak = calculateStreak(filteredAttempts);
    const activeDays = new Set(filteredAttempts.map(a => a.date)).size;

    return { total, flashes, encadenados, proyectos, avgRating, streak, activeDays };
  }, [filteredAttempts]);

  // Distribución por rango de intentos (solo encadenados)
  const attemptsRangeDist = useMemo(() => {
    const enc = filteredAttempts.filter(a => a.type === 'encadenado');
    return {
      '2-5': enc.filter(a => a.attemptsRange === '2-5').length,
      '5-10': enc.filter(a => a.attemptsRange === '5-10').length,
      '10+': enc.filter(a => a.attemptsRange === '10+').length,
    };
  }, [filteredAttempts]);

  // Evolución mensual
  const monthlyEvolution = useMemo(() => {
    const months: Record<string, { flash: number; encadenado: number; proyecto: number }> = {};
    filteredAttempts.forEach(a => {
      const monthKey = a.date.slice(0, 7);
      if (!months[monthKey]) months[monthKey] = { flash: 0, encadenado: 0, proyecto: 0 };
      months[monthKey][a.type]++;
    });
    return Object.entries(months).sort(([a], [b]) => a.localeCompare(b));
  }, [filteredAttempts]);

  // Distribución por color
  const colorDist = useMemo(() => {
    const dist: Record<string, number> = {};
    filteredAttempts.forEach(a => {
      const color = a.categoryColor ?? 'Sin color';
      dist[color] = (dist[color] ?? 0) + 1;
    });
    return Object.entries(dist).sort(([, a], [, b]) => b - a);
  }, [filteredAttempts]);

  // Distribución de estrellas
  const ratingDist = useMemo(() => {
    const dist: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    filteredAttempts.forEach(a => {
      if (a.rating) dist[a.rating]++;
    });
    return Object.entries(dist);
  }, [filteredAttempts]);

  // Progresión de dificultad
  const difficultyProgression = useMemo(() => {
    return filteredAttempts
      .filter(a => a.proposedV)
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [filteredAttempts]);

  // Export CSV
  const handleExport = () => {
    const csv = generateCSV(filteredAttempts, profile?.displayName ?? 'escalador');
    downloadCSV(csv, profile?.displayName ?? 'escalador');
  };

  const maxMonthValue = Math.max(...monthlyEvolution.map(([, v]) => Math.max(v.flash, v.encadenado, v.proyecto)), 1);

  return (
    <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1rem',
        marginBottom: '1.5rem',
      }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0 0 0.25rem', color: 'var(--color-text-primary)' }}>
            Mis Métricas
          </h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', margin: 0 }}>
            {profile?.emoji ?? ''} {profile?.displayName ?? 'Escalador'}
          </p>
        </div>
        <button
          onClick={handleExport}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.625rem 1.25rem',
            background: 'var(--color-accent-primary)',
            color: 'var(--color-text-inverse)',
            border: 'none',
            borderRadius: '0.5rem',
            fontWeight: 600,
            cursor: 'pointer',
            fontSize: '0.875rem',
          }}
        >
          <Download size={16} />
          Descargar CSV
        </button>
      </div>

      {/* Filtro de rango */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        marginBottom: '1.5rem',
        padding: '1rem',
        background: 'var(--color-bg-surface)',
        border: '1px solid var(--color-border-subtle)',
        borderRadius: '0.75rem',
        flexWrap: 'wrap',
      }}>
        <Calendar size={16} style={{ color: 'var(--color-text-muted)' }} />
        <span style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>Rango:</span>
        <input
          type="month"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          style={{
            padding: '0.375rem 0.75rem',
            background: 'var(--color-bg-base)',
            border: '1px solid var(--color-border-default)',
            borderRadius: '0.375rem',
            color: 'var(--color-text-primary)',
            fontSize: '0.85rem',
          }}
        />
        <span style={{ color: 'var(--color-text-muted)' }}>→</span>
        <input
          type="month"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          style={{
            padding: '0.375rem 0.75rem',
            background: 'var(--color-bg-base)',
            border: '1px solid var(--color-border-default)',
            borderRadius: '0.375rem',
            color: 'var(--color-text-primary)',
            fontSize: '0.85rem',
          }}
        />
        <span style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem', marginLeft: 'auto' }}>
          {filteredAttempts.length} registros
        </span>
      </div>

      {/* KPIs */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
        gap: '0.75rem',
        marginBottom: '1.5rem',
      }}>
        {[
          { icon: BarChart3, label: 'Totales', value: kpis.total, color: 'var(--color-accent-primary)' },
          { icon: Award, label: 'Flash ✅', value: kpis.flashes, color: 'var(--color-accent-secondary)' },
          { icon: TrendingUp, label: 'Encadenados 🧗', value: kpis.encadenados, color: 'var(--color-accent-tertiary)' },
          { icon: Activity, label: 'Proyectos 🎯', value: kpis.proyectos, color: 'var(--color-state-info)' },
          { icon: Star, label: 'Prom. estrellas', value: kpis.avgRating.toFixed(1), color: 'var(--color-accent-tertiary)' },
          { icon: Flame, label: 'Racha 🔥', value: `${kpis.streak} días`, color: 'var(--color-state-error)' },
          { icon: Calendar, label: 'Días activo', value: kpis.activeDays, color: 'var(--color-state-info)' },
        ].map(({ icon: Icon, label, value, color }) => (
          <div key={label} style={{
            background: 'var(--color-bg-surface)',
            border: '1px solid var(--color-border-subtle)',
            borderRadius: '0.75rem',
            padding: '1rem',
            textAlign: 'center',
          }}>
            <Icon size={20} style={{ color, margin: '0 auto 0.375rem' }} />
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
              {value}
            </div>
            <div style={{ color: 'var(--color-text-muted)', fontSize: '0.7rem', marginTop: '0.125rem' }}>
              {label}
            </div>
          </div>
        ))}
      </div>

      {/* Gráfico 1: Evolución mensual */}
      <div style={{
        background: 'var(--color-bg-surface)',
        border: '1px solid var(--color-border-subtle)',
        borderRadius: '0.75rem',
        padding: '1.25rem',
        marginBottom: '1rem',
      }}>
        <h3 style={{ color: 'var(--color-text-primary)', fontSize: '0.95rem', fontWeight: 600, marginBottom: '1rem' }}>
          📈 Evolución por mes
        </h3>
        {monthlyEvolution.length === 0 ? (
          <p style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: '1rem' }}>Sin datos</p>
        ) : (
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.5rem', height: 150, padding: '0.5rem 0' }}>
            {monthlyEvolution.map(([month, counts]) => {
              const hFlash = (counts.flash / maxMonthValue) * 120;
              const hEnc = (counts.encadenado / maxMonthValue) * 120;
              const hProy = (counts.proyecto / maxMonthValue) * 120;
              return (
                <div key={month} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                  <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: 130 }}>
                    <div style={{ width: '80%', background: 'var(--color-accent-secondary)', borderRadius: '3px 3px 0 0', height: Math.max(hFlash, 4), minHeight: 4 }} title={`Flash: ${counts.flash}`} />
                    <div style={{ width: '80%', background: 'var(--color-accent-tertiary)', borderRadius: '3px 3px 0 0', height: Math.max(hEnc, 4), minHeight: 4 }} title={`Encadenado: ${counts.encadenado}`} />
                    <div style={{ width: '80%', background: 'var(--color-state-info)', borderRadius: '3px 3px 0 0', height: Math.max(hProy, 4), minHeight: 4 }} title={`Proyecto: ${counts.proyecto}`} />
                  </div>
                  <span style={{ color: 'var(--color-text-muted)', fontSize: '0.6rem', transform: 'rotate(-45deg)', marginTop: '0.25rem', whiteSpace: 'nowrap' }}>
                    {month}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Gráfico 2: Progresión de dificultad */}
      <div style={{
        background: 'var(--color-bg-surface)',
        border: '1px solid var(--color-border-subtle)',
        borderRadius: '0.75rem',
        padding: '1.25rem',
        marginBottom: '1rem',
      }}>
        <h3 style={{ color: 'var(--color-text-primary)', fontSize: '0.95rem', fontWeight: 600, marginBottom: '1rem' }}>
          📊 Progresión de dificultad
        </h3>
        {difficultyProgression.length === 0 ? (
          <p style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: '1rem' }}>Sin datos</p>
        ) : (
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '2px', height: 130, padding: '0.5rem 0' }}>
            {difficultyProgression.map((a, i) => {
              const h = ((a.proposedV ?? 1) / 14) * 120;
              const colorMap: Record<string, string> = {
                flash: 'var(--color-accent-secondary)',
                encadenado: 'var(--color-accent-tertiary)',
                proyecto: 'var(--color-state-info)',
              };
              return (
                <div
                  key={i}
                  title={`${a.date} · V${a.proposedV} · ${a.type}`}
                  style={{
                    flex: 1,
                    height: Math.max(h, 4),
                    background: colorMap[a.type] ?? 'var(--color-text-muted)',
                    borderRadius: '2px 2px 0 0',
                    minWidth: 4,
                    opacity: 0.8,
                  }}
                />
              );
            })}
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
          <span>V1</span>
          <span>V14</span>
        </div>
      </div>

      {/* Gráficos en grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '1rem',
        marginBottom: '1rem',
      }}>
        {/* Distribución por tipo */}
        <div style={{
          background: 'var(--color-bg-surface)',
          border: '1px solid var(--color-border-subtle)',
          borderRadius: '0.75rem',
          padding: '1.25rem',
        }}>
          <h3 style={{ color: 'var(--color-text-primary)', fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.75rem' }}>
            🍩 Distribución por tipo
          </h3>
          {kpis.total === 0 ? (
            <p style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: '1rem', fontSize: '0.85rem' }}>Sin datos</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {[
                { type: 'Flash', count: kpis.flashes, color: 'var(--color-accent-secondary)' },
                { type: 'Encadenado', count: kpis.encadenados, color: 'var(--color-accent-tertiary)' },
                { type: 'Proyecto', count: kpis.proyectos, color: 'var(--color-state-info)' },
              ].map(({ type, count, color }) => (
                <div key={type}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.25rem' }}>
                    <span style={{ color: 'var(--color-text-secondary)' }}>{type}</span>
                    <span style={{ color: 'var(--color-text-primary)', fontWeight: 600 }}>{count} ({kpis.total > 0 ? ((count / kpis.total) * 100).toFixed(0) : 0}%)</span>
                  </div>
                  <div style={{ height: 8, background: 'var(--color-bg-base)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ width: `${kpis.total > 0 ? (count / kpis.total) * 100 : 0}%`, height: '100%', background: color, borderRadius: '4px', transition: 'width 0.5s' }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Distribución por color */}
        <div style={{
          background: 'var(--color-bg-surface)',
          border: '1px solid var(--color-border-subtle)',
          borderRadius: '0.75rem',
          padding: '1.25rem',
        }}>
          <h3 style={{ color: 'var(--color-text-primary)', fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.75rem' }}>
            🎨 Distribución por color
          </h3>
          {colorDist.length === 0 ? (
            <p style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: '1rem', fontSize: '0.85rem' }}>Sin datos</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {colorDist.map(([color, count]) => {
                const maxCount = Math.max(...colorDist.map(([, c]) => c));
                return (
                  <div key={color}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.25rem' }}>
                      <span style={{ color: 'var(--color-text-secondary)' }}>{color}</span>
                      <span style={{ color: 'var(--color-text-primary)', fontWeight: 600 }}>{count}</span>
                    </div>
                    <div style={{ height: 8, background: 'var(--color-bg-base)', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{
                        width: `${(count / maxCount) * 100}%`,
                        height: '100%',
                        background: 'var(--color-accent-primary)',
                        borderRadius: '4px',
                        transition: 'width 0.5s',
                      }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Gráficos en grid fila 2 */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '1rem',
        marginBottom: '1rem',
      }}>
        {/* Rangos de intentos */}
        <div style={{
          background: 'var(--color-bg-surface)',
          border: '1px solid var(--color-border-subtle)',
          borderRadius: '0.75rem',
          padding: '1.25rem',
        }}>
          <h3 style={{ color: 'var(--color-text-primary)', fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.75rem' }}>
            🎯 Rangos de intentos (Encadenados)
          </h3>
          {kpis.encadenados === 0 ? (
            <p style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: '1rem', fontSize: '0.85rem' }}>Sin datos</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {Object.entries(attemptsRangeDist).map(([range, count]) => {
                const maxCount = Math.max(...Object.values(attemptsRangeDist));
                return (
                  <div key={range}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.25rem' }}>
                      <span style={{ color: 'var(--color-text-secondary)' }}>{range} intentos</span>
                      <span style={{ color: 'var(--color-text-primary)', fontWeight: 600 }}>{count}</span>
                    </div>
                    <div style={{ height: 8, background: 'var(--color-bg-base)', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{
                        width: `${maxCount > 0 ? (count / maxCount) * 100 : 0}%`,
                        height: '100%',
                        background: 'var(--color-accent-tertiary)',
                        borderRadius: '4px',
                        transition: 'width 0.5s',
                      }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Calificaciones dadas */}
        <div style={{
          background: 'var(--color-bg-surface)',
          border: '1px solid var(--color-border-subtle)',
          borderRadius: '0.75rem',
          padding: '1.25rem',
        }}>
          <h3 style={{ color: 'var(--color-text-primary)', fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.75rem' }}>
            ⭐ Calificaciones dadas
          </h3>
          {filteredAttempts.filter(a => a.rating).length === 0 ? (
            <p style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: '1rem', fontSize: '0.85rem' }}>Sin calificaciones</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {ratingDist.map(([stars, count]) => {
                const maxCount = Math.max(...ratingDist.map(([, c]) => c));
                return (
                  <div key={stars}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.25rem' }}>
                      <span style={{ color: 'var(--color-text-secondary)' }}>
                        {'★'.repeat(Number(stars))}{'☆'.repeat(5 - Number(stars))}
                      </span>
                      <span style={{ color: 'var(--color-text-primary)', fontWeight: 600 }}>{count}</span>
                    </div>
                    <div style={{ height: 8, background: 'var(--color-bg-base)', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{
                        width: `${maxCount > 0 ? (count / maxCount) * 100 : 0}%`,
                        height: '100%',
                        background: 'var(--color-accent-tertiary)',
                        borderRadius: '4px',
                        transition: 'width 0.5s',
                      }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Heatmap (simplificado) */}
      <div style={{
        background: 'var(--color-bg-surface)',
        border: '1px solid var(--color-border-subtle)',
        borderRadius: '0.75rem',
        padding: '1.25rem',
      }}>
        <h3 style={{ color: 'var(--color-text-primary)', fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.75rem' }}>
          📅 Actividad reciente (heatmap)
        </h3>
        {filteredAttempts.length === 0 ? (
          <p style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: '1rem', fontSize: '0.85rem' }}>Sin datos</p>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px' }}>
            {Array.from({ length: 91 }, (_, i) => {
              const date = new Date();
              date.setDate(date.getDate() - (90 - i));
              const dateStr = format(date, 'yyyy-MM-dd');
              const hasActivity = filteredAttempts.some(a => a.date === dateStr);
              const count = filteredAttempts.filter(a => a.date === dateStr).length;
              return (
                <div
                  key={dateStr}
                  title={`${dateStr}: ${count} intento${count !== 1 ? 's' : ''}`}
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: '2px',
                    background: !hasActivity ? 'var(--color-bg-base)' :
                      count <= 1 ? 'rgba(74,158,110,0.3)' :
                      count <= 3 ? 'rgba(74,158,110,0.5)' :
                      'rgba(74,158,110,0.8)',
                    border: '1px solid var(--color-border-subtle)',
                  }}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
