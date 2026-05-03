import { ReactNode, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Loader } from 'lucide-react';

interface ProtectedRouteProps {
  children: ReactNode;
  requireAuth?: boolean;
  requireRole?: string[];
  redirectTo?: string;
}

export default function ProtectedRoute({
  children,
  requireAuth = true,
  requireRole,
  redirectTo = '/login',
}: ProtectedRouteProps) {
  const { user, loading, userRole, isDemoMode } = useAuth(); // Added isDemoMode

  useEffect(() => {
    // Demo mode bypasses authentication requirement
    if (!loading && requireAuth && !user && !isDemoMode) {
      window.location.href = redirectTo;
    }
  }, [loading, requireAuth, user, isDemoMode, redirectTo]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <Loader className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Demo mode bypasses authentication requirement
  if (requireAuth && !user && !isDemoMode) {
    return null; // Will redirect via useEffect
  }

  if (requireRole && requireRole.length > 0 && userRole && !requireRole.includes(userRole)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Access Denied</h1>
          <p className="text-slate-600">You don't have permission to access this page.</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}