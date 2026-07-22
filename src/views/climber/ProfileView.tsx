import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import EmojiPicker, { type EmojiClickData } from 'emoji-picker-react';
import { Save, Smile } from 'lucide-react';

export function ClimberProfileView() {
  const { profile, refreshProfile } = useAuth();
  const [displayName, setDisplayName] = useState(profile?.displayName ?? '');
  const [emoji, setEmoji] = useState(profile?.emoji ?? '🧗');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const handleSave = async () => {
    // TODO: Update profile in Firestore
    await refreshProfile();
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
