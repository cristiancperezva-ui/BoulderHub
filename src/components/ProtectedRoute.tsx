// ─── Protected Route ──────────────────────────────────────────────────────────

import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import type { UserRole } from '@/types';

interface ProtectedRouteProps {
  children: React.ReactNode;
  /** Rol requerido. Si no se especifica, solo requiere autenticación */
  requiredRole?: UserRole;
  /** Array de roles permitidos */
  allowedRoles?: UserRole[];
}

export function ProtectedRoute({ children, requiredRole, allowedRoles }: ProtectedRouteProps) {
  const { user, profile, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100dvh',
        color: 'var(--color-text-secondary)',
      }}>
        Cargando...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  if (requiredRole || allowedRoles) {
    const validRoles = allowedRoles ?? (requiredRole ? [requiredRole] : []);
    const userRoles = profile?.roles ?? [];
    const hasAccess = validRoles.some(r => userRoles.includes(r));
    if (!hasAccess) {
      // Redirigir al dashboard del primer rol que tiene
      const roleRoutes: Record<string, string> = {
        admin: '/admin/dashboard',
        routesetter: '/routesetter/dashboard',
        climber: '/climber/dashboard',
      };
      const firstRole = userRoles[0] ?? 'climber';
      return <Navigate to={roleRoutes[firstRole] ?? '/climber/dashboard'} replace />;
    }
  }

  return <>{children}</>;
}
