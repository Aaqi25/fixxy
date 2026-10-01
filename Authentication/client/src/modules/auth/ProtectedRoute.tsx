import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';

/**
 * ProtectedRoute guards pages that require authentication.
 * Redirects unauthenticated users to /login preserving the intended destination.
 * Does NOT redirect while authentication state is still loading.
 */
export function ProtectedRoute() {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  // Wait for /api/auth/me to resolve before making routing decisions
  if (isLoading) {
    return (
      <div className="fixxy-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="fixxy-spinner" />
          <p style={{ color: '#14243d', marginTop: '1rem', fontSize: '0.9rem', opacity: 0.7 }}>
            Loading FIXXY...
          </p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
}
