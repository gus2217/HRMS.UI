import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/features/auth/components/AuthContext';
import { hasAnyPermission, hasPermission, type Permission } from '@/lib/permissions';

interface ProtectedRouteProps {
  children: ReactNode;
  /** Single permission, or a list where ANY one grants access. */
  permission?: Permission | Permission[];
}

/**
 * Route guard: waits for session restore, redirects to /login when
 * unauthenticated, and optionally enforces a permission (or any of a
 * list). Mirrors the backend policy: the UI never grants more than the
 * backend permission catalog allows.
 */
const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, permission }) => {
  const { isAuthenticated, isLoading, permissions } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        <div className="w-8 h-8 border-2 border-slate-200 border-t-indigo-500 rounded-full animate-spin" />
        <div style={{ marginTop: 10, color: '#94a3b8', fontSize: 14 }}>Checking session…</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (permission) {
    const allowed = Array.isArray(permission)
      ? hasAnyPermission(permissions, permission)
      : hasPermission(permissions, permission);
    if (!allowed) {
      return <Navigate to="/" replace />;
    }
  }

  return <>{children}</>;
};

export default ProtectedRoute;
