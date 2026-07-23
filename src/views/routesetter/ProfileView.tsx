import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { updateDocById } from '@/lib/firestore';
import type { UserProfile } from '@/types';
import { Save, CheckCircle } from 'lucide-react';

export function RouteSetterProfileView() {
  const { user, profile, refreshProfile } = useAuth();
  const [displayName, setDisplayName] = useState(profile?.displayName ?? '');

  // Sincronizar estado local cuando el perfil cambia (ej: después de guardar)
  useEffect(() => {
    if (profile?.displayName) {
      setDisplayName(profile.displayName);
    }
  }, [profile?.displayName]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await updateDocById<Partial<UserProfile>>('users', user.uid, {
        displayName: displayName.trim() || 'RouteSetter',
      });
      await refreshProfile();
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      console.error('Error al guardar perfil:', err);
    } finally {
      setSaving(false);
    }
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
            Nombre de routesetter
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

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              padding: '0.75rem 1.5rem',
              background: saving ? 'var(--color-bg-hover)' : 'var(--color-accent-primary)',
              color: saving ? 'var(--color-text-muted)' : 'var(--color-text-inverse)',
              border: 'none', borderRadius: '0.5rem', fontWeight: 600,
              cursor: saving ? 'not-allowed' : 'pointer', fontSize: '0.9rem',
            }}
          >
            <Save size={18} />
            {saving ? 'Guardando...' : 'Guardar cambios'}
          </button>
          {saved && (
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', color: 'var(--color-state-success)', fontSize: '0.85rem' }}>
              <CheckCircle size={16} /> Guardado
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
