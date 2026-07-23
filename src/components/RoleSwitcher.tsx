// ─── RoleSwitcher ─────────────────────────────────────────────────────────────
// Selector de rol visible en el header para usuarios con múltiples roles.
// Permite cambiar entre las vistas de Admin, Ruteador y Escalador.

import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Shield, Wrench, Mountain } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import type { UserRole } from '@/types';

const ROLE_CONFIG: Record<UserRole, { label: string; icon: typeof Shield; path: string; color: string }> = {
  admin: { label: 'Admin', icon: Shield, path: '/admin/dashboard', color: 'var(--color-accent-primary)' },
  routesetter: { label: 'Ruteador', icon: Wrench, path: '/routesetter/dashboard', color: 'var(--color-state-success)' },
  climber: { label: 'Escalador', icon: Mountain, path: '/climber/dashboard', color: 'var(--color-state-info)' },
};

export function RoleSwitcher() {
  const { roles } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Cerrar al hacer clic fuera
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Solo mostrar si tiene múltiples roles
  if (roles.length <= 1) return null;

  // Determinar el rol activo según la URL actual
  const currentRole: UserRole =
    location.pathname.startsWith('/admin') ? 'admin' :
    location.pathname.startsWith('/routesetter') ? 'routesetter' :
    'climber';

  const current = ROLE_CONFIG[currentRole];

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.375rem',
          padding: '0.375rem 0.75rem',
          background: 'var(--color-bg-base)',
          border: '1px solid var(--color-border-default)',
          borderRadius: '0.5rem',
          color: 'var(--color-text-primary)',
          cursor: 'pointer',
          fontSize: '0.8rem',
          fontWeight: 500,
        }}
        title="Cambiar de rol"
      >
        <current.icon size={14} style={{ color: current.color }} />
        <span>{current.label}</span>
        <span style={{ color: 'var(--color-text-muted)', fontSize: '0.6rem' }}>▼</span>
      </button>

      {open && (
        <div style={{
          position: 'absolute',
          top: '100%',
          right: 0,
          marginTop: '0.375rem',
          background: 'var(--color-bg-elevated)',
          border: '1px solid var(--color-border-default)',
          borderRadius: '0.5rem',
          padding: '0.375rem',
          zIndex: 200,
          minWidth: 160,
          boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
        }}>
          {roles.map((role) => {
            const cfg = ROLE_CONFIG[role];
            const Icon = cfg.icon;
            const isCurrent = role === currentRole;
            return (
              <button
                key={role}
                onClick={() => {
                  setOpen(false);
                  if (!isCurrent) navigate(cfg.path);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  width: '100%',
                  padding: '0.5rem 0.75rem',
                  background: isCurrent ? 'var(--color-bg-hover)' : 'transparent',
                  border: 'none',
                  borderRadius: '0.375rem',
                  color: isCurrent ? cfg.color : 'var(--color-text-secondary)',
                  cursor: isCurrent ? 'default' : 'pointer',
                  fontSize: '0.85rem',
                  fontWeight: isCurrent ? 600 : 400,
                  textAlign: 'left',
                }}
              >
                <Icon size={16} style={{ color: cfg.color }} />
                {cfg.label}
                {isCurrent && <span style={{ marginLeft: 'auto', fontSize: '0.7rem' }}>✓</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
