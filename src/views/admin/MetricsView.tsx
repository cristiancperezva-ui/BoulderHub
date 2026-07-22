import { BarChart3 } from 'lucide-react';

export function AdminMetricsView() {
  return (
    <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1.5rem', color: 'var(--color-text-primary)' }}>
        Métricas Generales
      </h1>

      <div style={{
        background: 'var(--color-bg-surface)',
        border: '1px solid var(--color-border-subtle)',
        borderRadius: '0.75rem',
        padding: '2rem',
        textAlign: 'center',
      }}>
        <BarChart3 size={48} style={{ color: 'var(--color-accent-primary)', margin: '0 auto 1rem', opacity: 0.6 }} />
        <h2 style={{ color: 'var(--color-text-secondary)', fontSize: '1.125rem', marginBottom: '0.5rem' }}>
          Métricas próximamente
        </h2>
        <p style={{ color: 'var(--color-text-muted)', maxWidth: 400, margin: '0 auto', lineHeight: 1.6 }}>
          Aquí podrás ver gráficos detallados de:
        </p>
        <ul style={{
          listStyle: 'none',
          padding: 0,
          marginTop: '1rem',
          color: 'var(--color-text-secondary)',
          fontSize: '0.9rem',
          lineHeight: 2,
        }}>
          <li>📊 Calificaciones promedio por bloque y muro</li>
          <li>📈 Días de frecuencia de uso (días/semana)</li>
          <li>🏔️ Bloques por muro y ruteador</li>
          <li>⭐ Distribución de estrellas y tipos de intento</li>
          <li>🧗 Top ruteadores por popularidad</li>
          <li>📅 Actividad a lo largo del tiempo</li>
        </ul>
      </div>
    </div>
  );
}
