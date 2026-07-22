import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import {
  LayoutDashboard,
  Mountain,
  Medal,
  BarChart3,
  User,
  LogOut,
  Menu,
  X,
} from 'lucide-react';
import { useState } from 'react';

const NAV_ITEMS = [
  { to: '/climber/dashboard', icon: LayoutDashboard, label: 'Panel' },
  { to: '/climber/blocks', icon: Mountain, label: 'Bloques' },
  { to: '/climber/challenges', icon: Medal, label: 'Retos' },
  { to: '/climber/metrics', icon: BarChart3, label: 'Métricas' },
  { to: '/climber/profile', icon: User, label: 'Perfil' },
];

export function ClimberLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column' as const }}>
      {/* Top bar móvil */}
      <header style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0.75rem 1rem',
        borderBottom: '1px solid var(--color-border-subtle)',
        background: 'var(--color-bg-surface)',
        position: 'sticky' as const,
        top: 0,
        zIndex: 50,
      }}>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          style={{ background: 'none', border: 'none', color: 'var(--color-text-primary)', cursor: 'pointer' }}
          aria-label="Menú"
        >
          {mobileOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
        <span style={{ fontWeight: 700, color: 'var(--color-accent-primary)' }}>
          🧗 BoulderHub
        </span>
        <span style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>
          {profile?.emoji ?? ''} {profile?.displayName ?? ''}
        </span>
      </header>

      <div style={{ display: 'flex', flex: 1 }}>
        {/* Sidebar desktop */}
        <aside style={{
          width: 220,
          borderRight: '1px solid var(--color-border-subtle)',
          background: 'var(--color-bg-surface)',
          padding: '1rem 0',
          display: 'flex',
          flexDirection: 'column' as const,
          flexShrink: 0,
        }}
          className="sidebar-desktop"
        >
          <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            {NAV_ITEMS.map(({ to, icon: Icon, label }) => {
              const isActive = location.pathname === to || location.pathname.startsWith(to + '/');
              return (
                <Link
                  key={to}
                  to={to}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '0.75rem 1.25rem',
                    color: isActive ? 'var(--color-accent-primary)' : 'var(--color-text-secondary)',
                    background: isActive ? 'var(--color-bg-hover)' : 'transparent',
                    borderLeft: isActive ? '3px solid var(--color-accent-primary)' : '3px solid transparent',
                    textDecoration: 'none',
                    fontSize: '0.9rem',
                    fontWeight: isActive ? 600 : 400,
                  }}
                >
                  <Icon size={18} />
                  {label}
                </Link>
              );
            })}
          </nav>
          <div style={{ padding: '0.75rem 1.25rem', borderTop: '1px solid var(--color-border-subtle)' }}>
            <button
              onClick={handleSignOut}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                color: 'var(--color-text-muted)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: '0.875rem',
                width: '100%',
                padding: '0.5rem 0',
              }}
            >
              <LogOut size={16} />
              Cerrar sesión
            </button>
          </div>
        </aside>

        {/* Mobile nav overlay */}
        {mobileOpen && (
          <div style={{
            position: 'fixed' as const,
            top: 57,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'var(--color-bg-surface)',
            zIndex: 100,
            padding: '1rem 0',
          }}>
            <nav style={{ display: 'flex', flexDirection: 'column' }}>
              {NAV_ITEMS.map(({ to, icon: Icon, label }) => {
                const isActive = location.pathname === to;
                return (
                  <Link
                    key={to}
                    to={to}
                    onClick={() => setMobileOpen(false)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      padding: '1rem 1.5rem',
                      color: isActive ? 'var(--color-accent-primary)' : 'var(--color-text-secondary)',
                      textDecoration: 'none',
                      fontSize: '1rem',
                    }}
                  >
                    <Icon size={20} />
                    {label}
                  </Link>
                );
              })}
              <button
                onClick={() => { handleSignOut(); setMobileOpen(false); }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '1rem 1.5rem',
                  color: 'var(--color-text-muted)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '1rem',
                  textAlign: 'left' as const,
                }}
              >
                <LogOut size={20} />
                Cerrar sesión
              </button>
            </nav>
          </div>
        )}

        {/* Contenido principal */}
        <main style={{
          flex: 1,
          padding: '1.5rem',
          overflowY: 'auto' as const,
          maxWidth: 1100,
          width: '100%',
          margin: '0 auto',
        }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
