import { ReactNode, useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { hasModuleAccess, hasModulePermission } from '../lib/moduleAccessControl';
import { Lock, AlertCircle, Shield } from 'lucide-react';

interface ModuleAccessGuardProps {
  children: ReactNode;
  moduleId: string;
  permission?: string;
  fallback?: ReactNode;
  showMessage?: boolean;
  silentFail?: boolean;
}

/**
 * Module Access Guard Component
 * Enforces module-level access control based on admin configurations
 * 
 * Usage:
 * <ModuleAccessGuard moduleId="payments">
 *   <PaymentComponent />
 * </ModuleAccessGuard>
 * 
 * <ModuleAccessGuard moduleId="payments" permission="make_payments">
 *   <MakePaymentButton />
 * </ModuleAccessGuard>
 */
export default function ModuleAccessGuard({
  children,
  moduleId,
  permission,
  fallback = null,
  showMessage = true,
  silentFail = false,
}: ModuleAccessGuardProps) {
  const { user } = useAuth();
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function checkAccess() {
      if (!user) {
        if (isMounted) {
          setHasAccess(false);
          setLoading(false);
        }
        return;
      }

      try {
        let accessGranted = false;

        if (permission) {
          // Check specific permission within module
          accessGranted = await hasModulePermission(user.id, moduleId, permission);
        } else {
          // Check general module access
          accessGranted = await hasModuleAccess(user.id, moduleId);
        }

        if (isMounted) {
          setHasAccess(accessGranted);
          setLoading(false);
        }
      } catch (error) {
        console.error('Error checking module access:', error);
        if (isMounted) {
          setHasAccess(false);
          setLoading(false);
        }
      }
    }

    checkAccess();

    return () => {
      isMounted = false;
    };
  }, [user, moduleId, permission]);

  if (loading) {
    return silentFail ? null : (
      <div className="animate-pulse bg-gray-100 rounded-lg h-20" />
    );
  }

  if (hasAccess) {
    return <>{children}</>;
  }

  if (silentFail) {
    return null;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  if (showMessage) {
    return (
      <div className="p-6 bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-200 rounded-2xl">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-600 to-orange-600 flex items-center justify-center flex-shrink-0">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-amber-900 mb-2 flex items-center gap-2">
              <Lock className="w-5 h-5" />
              Access Restricted
            </h3>
            <p className="text-amber-800 mb-3">
              {permission
                ? `You don't have the required permission (${permission}) to access this feature.`
                : `You don't have access to the ${moduleId} module.`}
            </p>
            <div className="bg-white/60 rounded-lg p-3 border border-amber-200">
              <p className="text-sm text-amber-900 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>
                  <strong>Need Access?</strong> Contact your administrator to request access to this feature.
                  Your current role may not include permissions for this module.
                </span>
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

/**
 * Hook for checking module access in component logic
 */
export function useModuleAccess(moduleId: string, permission?: string) {
  const { user } = useAuth();
  const [hasAccess, setHasAccess] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;

    async function checkAccess() {
      if (!user) {
        if (isMounted) {
          setHasAccess(false);
          setLoading(false);
        }
        return;
      }

      try {
        let accessGranted = false;

        if (permission) {
          accessGranted = await hasModulePermission(user.id, moduleId, permission);
        } else {
          accessGranted = await hasModuleAccess(user.id, moduleId);
        }

        if (isMounted) {
          setHasAccess(accessGranted);
          setLoading(false);
        }
      } catch (error) {
        console.error('Error checking module access:', error);
        if (isMounted) {
          setHasAccess(false);
          setLoading(false);
        }
      }
    }

    checkAccess();

    return () => {
      isMounted = false;
    };
  }, [user, moduleId, permission]);

  return { hasAccess, loading };
}

/**
 * Conditional component that only renders for users with module access
 */
interface ConditionalModuleProps {
  children: ReactNode;
  moduleId: string;
  permission?: string;
}

export function ConditionalModule({ children, moduleId, permission }: ConditionalModuleProps) {
  const { hasAccess, loading } = useModuleAccess(moduleId, permission);

  if (loading) return null;
  if (!hasAccess) return null;

  return <>{children}</>;
}

/**
 * Button that disables when user lacks module access
 */
interface ModuleAccessButtonProps {
  children: ReactNode;
  moduleId: string;
  permission?: string;
  onClick?: () => void;
  className?: string;
  variant?: 'primary' | 'secondary' | 'danger';
}

export function ModuleAccessButton({
  children,
  moduleId,
  permission,
  onClick,
  className = '',
  variant = 'primary',
}: ModuleAccessButtonProps) {
  const { hasAccess, loading } = useModuleAccess(moduleId, permission);

  const variantClasses = {
    primary: 'bg-orange-600 hover:bg-orange-700 text-white disabled:bg-gray-600',
    secondary: 'bg-gray-700 hover:bg-gray-600 text-white disabled:bg-gray-800',
    danger: 'bg-red-600 hover:bg-red-700 text-white disabled:bg-gray-600',
  };

  return (
    <button
      onClick={onClick}
      disabled={loading || !hasAccess}
      className={`px-4 py-2 rounded-xl font-medium transition-all disabled:cursor-not-allowed disabled:opacity-50 ${variantClasses[variant]} ${className}`}
      title={!hasAccess ? 'You don\'t have access to this feature' : ''}
    >
      {loading ? (
        <span className="flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          Loading...
        </span>
      ) : (
        children
      )}
    </button>
  );
}

/**
 * Badge showing module access status
 */
interface ModuleAccessBadgeProps {
  moduleId: string;
  permission?: string;
  showIcon?: boolean;
}

export function ModuleAccessBadge({ moduleId, permission, showIcon = true }: ModuleAccessBadgeProps) {
  const { hasAccess, loading } = useModuleAccess(moduleId, permission);

  if (loading) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold bg-gray-600 text-gray-300">
        Checking...
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${
        hasAccess
          ? 'bg-green-500/20 text-green-400 border border-green-500/30'
          : 'bg-red-500/20 text-red-400 border border-red-500/30'
      }`}
    >
      {showIcon && (hasAccess ? (
        <Lock className="w-3 h-3" />
      ) : (
        <Lock className="w-3 h-3" />
      ))}
      {hasAccess ? 'Granted' : 'Denied'}
    </span>
  );
}
