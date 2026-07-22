import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useEffect } from 'react';

export function LoginView() {
  const { signInWithGoogle, user, role, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user && role) {
      switch (role) {
        case 'admin': navigate('/admin/dashboard', { replace: true }); break;
        case 'routesetter': navigate('/routesetter/dashboard', { replace: true }); break;
        case 'climber': navigate('/climber/dashboard', { replace: true }); break;
      }
    }
  }, [user, role, navigate]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1 }}>
        <span style={{ color: 'var(--color-text-muted)' }}>Cargando...</span>
      </div>
    );
  }

  return (
    <div style={{
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem',
      textAlign: 'center',
    }}>
      <div style={{ maxWidth: 420, width: '100%' }}>
        <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🧗</div>
        <h1 style={{
          fontSize: '2rem',
          fontWeight: 700,
          color: 'var(--color-accent-primary)',
          margin: '0 0 0.5rem',
        }}>
          BoulderHub
        </h1>
        <p style={{
          color: 'var(--color-text-secondary)',
          marginBottom: '2rem',
          lineHeight: 1.6,
        }}>
          Conecta con tu comunidad de escalada local. Descubre bloques, comparte rutas, desafía a otros escaladores y mide tu progreso.
        </p>

        <button
          onClick={signInWithGoogle}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.75rem',
            width: '100%',
            padding: '0.875rem 1.5rem',
            background: 'var(--color-accent-primary)',
            color: 'var(--color-text-inverse)',
            border: 'none',
            borderRadius: '0.5rem',
            fontSize: '1rem',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'background 0.2s',
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = 'var(--color-accent-primary-hover)'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'var(--color-accent-primary)'}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Iniciar sesión con Google
        </button>

        <p style={{
          marginTop: '2rem',
          color: 'var(--color-text-muted)',
          fontSize: '0.75rem',
          lineHeight: 1.5,
        }}>
          Al iniciar sesión, aceptas el{' '}
          <a href="/legal" style={{ color: 'var(--color-accent-primary)' }}>
            aviso legal
          </a>{' '}
          de BoulderHub. Esta es una iniciativa independiente de la comunidad de escalada.
        </p>
      </div>
    </div>
  );
}
