import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/features/auth/components/AuthContext';
import { hasPermission, type Permission } from '@/lib/permissions';

interface ProtectedRouteProps {
  children: ReactNode;
  permission?: Permission;
}

/**
 * Route guard: waits for session restore, redirects to /login when
 * unauthenticated, and optionally enforces a permission.
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

  if (permission && !hasPermission(permissions, permission)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
