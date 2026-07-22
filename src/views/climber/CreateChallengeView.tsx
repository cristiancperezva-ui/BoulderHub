import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Plus, Save } from 'lucide-react';

export function ClimberCreateChallengeView() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedBlocks] = useState<string[]>([]);

  const handleCreate = () => {
    // TODO: Save to Firestore
    navigate('/climber/challenges');
  };

  return (
    <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
      <Link to="/climber/challenges" style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.375rem',
        color: 'var(--color-text-secondary)',
        fontSize: '0.875rem',
        marginBottom: '1rem',
        textDecoration: 'none',
      }}>
        <ArrowLeft size={16} /> Volver a retos
      </Link>

      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1.5rem', color: 'var(--color-text-primary)' }}>
        Crear Reto
      </h1>

      <div style={{
        background: 'var(--color-bg-surface)',
        border: '1px solid var(--color-border-subtle)',
        borderRadius: '0.75rem',
        padding: '1.5rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.25rem',
        maxWidth: 600,
      }}>
        <div>
          <label style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem', display: 'block' }}>
            Nombre del reto *
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej: Desafío de Slab"
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
        </div>

        <div>
          <label style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem', display: 'block' }}>
            Descripción
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe el reto: qué tipo de bloques incluye, para qué nivel es..."
            rows={3}
            style={{
              width: '100%',
              padding: '0.75rem 1rem',
              background: 'var(--color-bg-base)',
              border: '1px solid var(--color-border-default)',
              borderRadius: '0.5rem',
              color: 'var(--color-text-primary)',
              fontSize: '0.9rem',
              outline: 'none',
              resize: 'vertical',
              fontFamily: 'inherit',
            }}
          />
        </div>

        <div>
          <label style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem', display: 'block' }}>
            Bloques seleccionados ({selectedBlocks.length})
          </label>
          <div style={{
            padding: '1rem',
            background: 'var(--color-bg-base)',
            border: '1px solid var(--color-border-default)',
            borderRadius: '0.5rem',
            textAlign: 'center',
            color: 'var(--color-text-muted)',
            fontSize: '0.875rem',
          }}>
            <Plus size={24} style={{ margin: '0 auto 0.5rem', opacity: 0.5 }} />
            <p>Los bloques disponibles aparecerán aquí cuando haya datos en Firestore.</p>
          </div>
        </div>

        <button
          onClick={handleCreate}
          disabled={!name.trim()}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            padding: '0.75rem 1.5rem',
            background: name.trim() ? 'var(--color-accent-primary)' : 'var(--color-bg-hover)',
            color: name.trim() ? 'var(--color-text-inverse)' : 'var(--color-text-muted)',
            border: 'none',
            borderRadius: '0.5rem',
            fontWeight: 600,
            cursor: name.trim() ? 'pointer' : 'not-allowed',
            fontSize: '0.95rem',
          }}
        >
          <Save size={18} />
          Crear reto
        </button>
      </div>
    </div>
  );
}
