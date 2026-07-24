import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { PublicLayout } from '@/components/Layouts/PublicLayout';
import { ClimberLayout } from '@/components/Layouts/ClimberLayout';
import { RouteSetterLayout } from '@/components/Layouts/RouteSetterLayout';
import { AdminLayout } from '@/components/Layouts/AdminLayout';

// Views
import { LoginView } from '@/views/auth/LoginView';
import { LegalView } from '@/views/LegalView';

// Admin views
import { AdminDashboardView } from '@/views/admin/DashboardView';
import { AdminWallsView } from '@/views/admin/WallsView';
import { AdminCategoriesView } from '@/views/admin/CategoriesView';
import { AdminUsersView } from '@/views/admin/UsersView';
import { AdminBlocksView } from '@/views/admin/BlocksView';
import { AdminMetricsView } from '@/views/admin/MetricsView';

// Routesetter views
import { RouteSetterDashboardView } from '@/views/routesetter/DashboardView';
import { RouteSetterCreateBlockView } from '@/views/routesetter/CreateBlockView';
import { RouteSetterMyBlocksView } from '@/views/routesetter/MyBlocksView';
import { RouteSetterChallengesView } from '@/views/routesetter/ChallengesView';
import { RouteSetterProfileView } from '@/views/routesetter/ProfileView';

// Climber views
import { ClimberDashboardView } from '@/views/climber/DashboardView';
import { ClimberBlocksView } from '@/views/climber/BlocksView';
import { ClimberBlockDetailView } from '@/views/climber/BlockDetailView';
import { ClimberMetricsView } from '@/views/climber/MetricsView';
import { ClimberChallengesView } from '@/views/climber/ChallengesView';
import { ClimberChallengeDetailView } from '@/views/climber/ChallengeDetailView';
import { ClimberCreateChallengeView } from '@/views/climber/CreateChallengeView';
import { ClimberProfileView } from '@/views/climber/ProfileView';

export default function App() {
  const { roles, loading } = useAuth();

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

  const getDefaultRedirect = () => {
    if (roles.length === 0) return '/auth';
    if (roles.includes('admin')) return '/admin/dashboard';
    if (roles.includes('routesetter')) return '/routesetter/dashboard';
    return '/climber/dashboard';
  };

  return (
    <Routes>
      <Route path="/" element={<Navigate to={getDefaultRedirect()} replace />} />

      <Route element={<PublicLayout />}>
        <Route path="/auth" element={<LoginView />} />
        <Route path="/legal" element={<LegalView />} />
      </Route>

      <Route
        element={
          <ProtectedRoute requiredRole="admin">
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/admin/dashboard" element={<AdminDashboardView />} />
        <Route path="/admin/walls" element={<AdminWallsView />} />
        <Route path="/admin/categories" element={<AdminCategoriesView />} />
        <Route path="/admin/users" element={<AdminUsersView />} />
        <Route path="/admin/blocks" element={<AdminBlocksView />} />
        <Route path="/admin/metrics" element={<AdminMetricsView />} />
      </Route>

      <Route
        element={
          <ProtectedRoute allowedRoles={['routesetter', 'admin']}>
            <RouteSetterLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/routesetter/dashboard" element={<RouteSetterDashboardView />} />
        <Route path="/routesetter/blocks/create" element={<RouteSetterCreateBlockView />} />
        <Route path="/routesetter/blocks" element={<RouteSetterMyBlocksView />} />
        <Route path="/routesetter/challenges" element={<RouteSetterChallengesView />} />
        <Route path="/routesetter/profile" element={<RouteSetterProfileView />} />
      </Route>

      <Route
        element={
          <ProtectedRoute allowedRoles={['climber', 'routesetter', 'admin']}>
            <ClimberLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/climber/dashboard" element={<ClimberDashboardView />} />
        <Route path="/climber/blocks" element={<ClimberBlocksView />} />
        <Route path="/climber/blocks/:blockId" element={<ClimberBlockDetailView />} />
        <Route path="/climber/metrics" element={<ClimberMetricsView />} />
        <Route path="/climber/challenges" element={<ClimberChallengesView />} />
        <Route path="/climber/challenges/create" element={<ClimberCreateChallengeView />} />
        <Route path="/climber/challenges/:challengeId" element={<ClimberChallengeDetailView />} />
        <Route path="/climber/profile" element={<ClimberProfileView />} />
      </Route>

      <Route path="*" element={<Navigate to={getDefaultRedirect()} replace />} />
    </Routes>
  );
}
