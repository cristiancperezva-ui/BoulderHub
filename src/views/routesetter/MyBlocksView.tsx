import { Mountain } from 'lucide-react';

export function RouteSetterMyBlocksView() {
  return (
    <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1.5rem', color: 'var(--color-text-primary)' }}>
        Mis Bloques
      </h1>

      <div style={{
        background: 'var(--color-bg-surface)',
        border: '1px solid var(--color-border-subtle)',
        borderRadius: '0.75rem',
        padding: '2rem',
        textAlign: 'center',
        color: 'var(--color-text-muted)',
      }}>
        <Mountain size={48} style={{ margin: '0 auto 1rem', opacity: 0.4 }} />
        <p>Aún no has subido bloques.</p>
        <p style={{ fontSize: '0.875rem' }}>Usa "Nuevo Bloque" para crear tu primero.</p>
      </div>
    </div>
  );
}
