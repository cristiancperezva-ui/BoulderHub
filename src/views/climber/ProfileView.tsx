import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import EmojiPicker, { type EmojiClickData } from 'emoji-picker-react';
import { updateDocById } from '@/lib/firestore';
import type { UserProfile } from '@/types';
import { Save, Smile, CheckCircle } from 'lucide-react';

export function ClimberProfileView() {
  const { user, profile, refreshProfile } = useAuth();
  const [displayName, setDisplayName] = useState(profile?.displayName ?? '');
  const [emoji, setEmoji] = useState(profile?.emoji ?? '🧗');

  // Sincronizar estado local cuando el perfil cambia (ej: después de guardar)
  useEffect(() => {
    if (profile?.displayName) {
      setDisplayName(profile.displayName);
    }
    if (profile?.emoji) {
      setEmoji(profile.emoji);
    }
  }, [profile?.displayName, profile?.emoji]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await updateDocById<Partial<UserProfile>>('users', user.uid, {
        displayName: displayName.trim() || 'Escalador',
        emoji,
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

  const onEmojiClick = (emojiData: EmojiClickData) => {
    setEmoji(emojiData.emoji);
    setShowEmojiPicker(false);
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
        {/* Emoji picker */}
        <div style={{ marginBottom: '1.25rem' }}>
          <label style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem', display: 'block' }}>
            Tu emoji
          </label>
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.75rem 1rem',
                background: 'var(--color-bg-base)',
                border: '1px solid var(--color-border-default)',
                borderRadius: '0.5rem',
                color: 'var(--color-text-primary)',
                cursor: 'pointer',
                fontSize: '1.5rem',
                width: '100%',
              }}
            >
              <span style={{ fontSize: '2rem' }}>{emoji}</span>
              <Smile size={18} style={{ color: 'var(--color-text-muted)' }} />
              <span style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>Cambiar emoji</span>
            </button>
            {showEmojiPicker && (
              <div style={{ position: 'absolute', top: '100%', left: 0, zIndex: 10, marginTop: '0.5rem' }}>
                <EmojiPicker onEmojiClick={onEmojiClick} />
              </div>
            )}
          </div>
        </div>

        {/* Nombre */}
        <div style={{ marginBottom: '1.25rem' }}>
          <label style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem', display: 'block' }}>
            Nombre de escalador
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
            Este nombre y emoji serán visibles para otros escaladores.
          </p>
        </div>

        {/* Email (readonly) */}
        <div style={{ marginBottom: '1.25rem' }}>
          <label style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem', display: 'block' }}>
            Email (Google)
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
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.75rem 1.5rem',
              background: saving ? 'var(--color-bg-hover)' : 'var(--color-accent-primary)',
              color: saving ? 'var(--color-text-muted)' : 'var(--color-text-inverse)',
              border: 'none',
              borderRadius: '0.5rem',
              fontWeight: 600,
              cursor: saving ? 'not-allowed' : 'pointer',
              fontSize: '0.9rem',
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
