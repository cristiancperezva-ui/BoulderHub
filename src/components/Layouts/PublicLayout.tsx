import { Outlet, Link } from 'react-router-dom';

export function PublicLayout() {
  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
      <header style={{
        padding: '1rem 2rem',
        borderBottom: '1px solid var(--color-border-subtle)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <Link to="/" style={{
          fontSize: '1.25rem',
          fontWeight: 700,
          color: 'var(--color-accent-primary)',
          textDecoration: 'none',
        }}>
          🧗 BoulderHub
        </Link>
        <nav style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <Link to="/legal" style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>
            Aviso Legal
          </Link>
        </nav>
      </header>
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <Outlet />
      </main>
    </div>
  );
}
