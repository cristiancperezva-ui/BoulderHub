import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Save } from 'lucide-react';

export function RouteSetterProfileView() {
  const { profile, refreshProfile } = useAuth();
  const [displayName, setDisplayName] = useState(profile?.displayName ?? '');

  const handleSave = async () => {
    // TODO: Update profile in Firestore
    await refreshProfile();
  };

  return (
    <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1.5rem', color: 'var(--color-text-primary)' }}>
        Mi Perfil
      </h1>

      <div style={{
        background: 'var(--color-bg-surface)',
        border: '1px solid var(--color-border-subtle)',
        borderRadius: '0.75rem',
        padding: '1.5rem',
        maxWidth: 480,
      }}>
        <div style={{ marginBottom: '1.25rem' }}>
          <label style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem', display: 'block' }}>
            Nombre de ruteador
          </label>
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Tu nombre visible"
            style={{
              width: '100%',
              padding: '0.75rem 1rem',
              background: 'var(--color-bg-base)',
              border: '1px solid var(--color-border-default)',
              borderRadius: '0.5rem',
              color: 'var(--color-text-primary)',
              fontSize: '0.9rem',
              outline: 'none',
            }}
          />
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem', marginTop: '0.25rem' }}>
            Este nombre será visible para los escaladores en cada bloque que publiques.
          </p>
        </div>

        <div style={{ marginBottom: '1.25rem' }}>
          <label style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem', display: 'block' }}>
            Email
          </label>
          <input
            value={profile?.email ?? ''}
            disabled
            style={{
              width: '100%',
              padding: '0.75rem 1rem',
              background: 'var(--color-bg-base)',
              border: '1px solid var(--color-border-default)',
              borderRadius: '0.5rem',
              color: 'var(--color-text-muted)',
              fontSize: '0.9rem',
              opacity: 0.6,
            }}
          />
        </div>

        <button
          onClick={handleSave}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.75rem 1.5rem',
            background: 'var(--color-accent-primary)',
            color: 'var(--color-text-inverse)',
            border: 'none',
            borderRadius: '0.5rem',
            fontWeight: 600,
            cursor: 'pointer',
            fontSize: '0.9rem',
          }}
        >
          <Save size={18} />
          Guardar cambios
        </button>
      </div>
    </div>
  );
}
