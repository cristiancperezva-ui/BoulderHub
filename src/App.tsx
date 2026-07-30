import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { PublicLayout } from '@/components/Layouts/PublicLayout';
import { ClimberLayout } from '@/components/Layouts/ClimberLayout';
import { RouteSetterLayout } from '@/components/Layouts/RouteSetterLayout';
import { AdminLayout } from '@/components/Layouts/AdminLayout';
import { InstallBanner } from '@/components/InstallBanner';

// Views cargadas eager (siempre necesarias para el flujo principal)
import { LoginView } from '@/views/auth/LoginView';
import { LegalView } from '@/views/LegalView';

// Climber views — eager (flujo principal, deben cargar rápido)
import { ClimberDashboardView } from '@/views/climber/DashboardView';
import { ClimberBlocksView } from '@/views/climber/BlocksView';

// Admin views — lazy (solo admins las visitan)
const AdminDashboardView = lazy(() => import('@/views/admin/DashboardView').then(m => ({ default: m.AdminDashboardView })));
const AdminWallsView = lazy(() => import('@/views/admin/WallsView').then(m => ({ default: m.AdminWallsView })));
const AdminCategoriesView = lazy(() => import('@/views/admin/CategoriesView').then(m => ({ default: m.AdminCategoriesView })));
const AdminUsersView = lazy(() => import('@/views/admin/UsersView').then(m => ({ default: m.AdminUsersView })));
const AdminBlocksView = lazy(() => import('@/views/admin/BlocksView').then(m => ({ default: m.AdminBlocksView })));
const AdminMetricsView = lazy(() => import('@/views/admin/MetricsView').then(m => ({ default: m.AdminMetricsView })));

// Routesetter views — lazy (menos visitadas, algunas pesadas como CreateBlock)
const RouteSetterDashboardView = lazy(() => import('@/views/routesetter/DashboardView').then(m => ({ default: m.RouteSetterDashboardView })));
const RouteSetterCreateBlockView = lazy(() => import('@/views/routesetter/CreateBlockView').then(m => ({ default: m.RouteSetterCreateBlockView })));
const RouteSetterMyBlocksView = lazy(() => import('@/views/routesetter/MyBlocksView').then(m => ({ default: m.RouteSetterMyBlocksView })));
const RouteSetterChallengesView = lazy(() => import('@/views/routesetter/ChallengesView').then(m => ({ default: m.RouteSetterChallengesView })));
const RouteSetterProfileView = lazy(() => import('@/views/routesetter/ProfileView').then(m => ({ default: m.RouteSetterProfileView })));

// Climber views secundarias — lazy (detail, metrics, challenges se usan menos que blocks)
const ClimberBlockDetailView = lazy(() => import('@/views/climber/BlockDetailView').then(m => ({ default: m.ClimberBlockDetailView })));
const ClimberMetricsView = lazy(() => import('@/views/climber/MetricsView').then(m => ({ default: m.ClimberMetricsView })));
const ClimberChallengesView = lazy(() => import('@/views/climber/ChallengesView').then(m => ({ default: m.ClimberChallengesView })));
const ClimberChallengeDetailView = lazy(() => import('@/views/climber/ChallengeDetailView').then(m => ({ default: m.ClimberChallengeDetailView })));
const ClimberCreateChallengeView = lazy(() => import('@/views/climber/CreateChallengeView').then(m => ({ default: m.ClimberCreateChallengeView })));
const ClimberProfileView = lazy(() => import('@/views/climber/ProfileView').then(m => ({ default: m.ClimberProfileView })));

// Fallback visual para Suspense
function PageFallback() {
  return (
    <div style={{
      display: 'flex', justifyContent: 'center', alignItems: 'center',
      height: '100%', minHeight: 200,
      color: 'var(--color-text-muted)', fontSize: '0.875rem',
    }}>
      Cargando...
    </div>
  );
}

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
    <>
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
          <Route path="/admin/dashboard" element={<Suspense fallback={<PageFallback />}><AdminDashboardView /></Suspense>} />
          <Route path="/admin/walls" element={<Suspense fallback={<PageFallback />}><AdminWallsView /></Suspense>} />
          <Route path="/admin/categories" element={<Suspense fallback={<PageFallback />}><AdminCategoriesView /></Suspense>} />
          <Route path="/admin/users" element={<Suspense fallback={<PageFallback />}><AdminUsersView /></Suspense>} />
          <Route path="/admin/blocks" element={<Suspense fallback={<PageFallback />}><AdminBlocksView /></Suspense>} />
          <Route path="/admin/metrics" element={<Suspense fallback={<PageFallback />}><AdminMetricsView /></Suspense>} />
        </Route>

        <Route
          element={
            <ProtectedRoute allowedRoles={['routesetter', 'admin']}>
              <RouteSetterLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/routesetter/dashboard" element={<Suspense fallback={<PageFallback />}><RouteSetterDashboardView /></Suspense>} />
          <Route path="/routesetter/blocks/create" element={<Suspense fallback={<PageFallback />}><RouteSetterCreateBlockView /></Suspense>} />
          <Route path="/routesetter/blocks" element={<Suspense fallback={<PageFallback />}><RouteSetterMyBlocksView /></Suspense>} />
          <Route path="/routesetter/challenges" element={<Suspense fallback={<PageFallback />}><RouteSetterChallengesView /></Suspense>} />
          <Route path="/routesetter/profile" element={<Suspense fallback={<PageFallback />}><RouteSetterProfileView /></Suspense>} />
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
          <Route path="/climber/blocks/:blockId" element={<Suspense fallback={<PageFallback />}><ClimberBlockDetailView /></Suspense>} />
          <Route path="/climber/metrics" element={<Suspense fallback={<PageFallback />}><ClimberMetricsView /></Suspense>} />
          <Route path="/climber/challenges" element={<Suspense fallback={<PageFallback />}><ClimberChallengesView /></Suspense>} />
          <Route path="/climber/challenges/create" element={<Suspense fallback={<PageFallback />}><ClimberCreateChallengeView /></Suspense>} />
          <Route path="/climber/challenges/:challengeId" element={<Suspense fallback={<PageFallback />}><ClimberChallengeDetailView /></Suspense>} />
          <Route path="/climber/profile" element={<Suspense fallback={<PageFallback />}><ClimberProfileView /></Suspense>} />
        </Route>

        <Route path="*" element={<Navigate to={getDefaultRedirect()} replace />} />
      </Routes>
      <InstallBanner />
    </>
  );
}
