import { ReactNode } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { hasPermission, hasAllPermissions } from '../lib/permissions';
import { Lock, AlertCircle } from 'lucide-react';

interface PermissionGuardProps {
  children: ReactNode;
  require?: string | string[];
  requireAll?: boolean;
  fallback?: ReactNode;
  showMessage?: boolean;
}

/**
 * Permission Guard Component
 * Conditionally renders children based on user permissions
 * 
 * Usage:
 * <PermissionGuard require="customers.create">
 *   <CreateCustomerButton />
 * </PermissionGuard>
 * 
 * <PermissionGuard require={["quotes.approve", "quotes.update"]} requireAll={true}>
 *   <ApproveQuoteButton />
 * </PermissionGuard>
 */
export default function PermissionGuard({
  children,
  require,
  requireAll = false,
  fallback = null,
  showMessage = true,
}: PermissionGuardProps) {
  const { user } = useAuth();

  // Get user permissions from user metadata or role
  const userPermissions = user?.user_metadata?.permissions || [];

  if (!require) {
    return <>{children}</>;
  }

  let hasAccess = false;

  if (Array.isArray(require)) {
    hasAccess = requireAll
      ? hasAllPermissions(userPermissions, require)
      : hasPermission(userPermissions, require);
  } else {
    hasAccess = hasPermission(userPermissions, require);
  }

  if (hasAccess) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  if (showMessage) {
    return (
      <div className="p-4 bg-amber-50 border-2 border-amber-200 rounded-lg">
        <div className="flex items-start gap-3">
          <Lock className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-amber-900">Insufficient Permissions</p>
            <p className="text-sm text-amber-700 mt-1">
              You don't have the required permissions to access this feature.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

/**
 * Permission Check Hook
 * Use this to check permissions in component logic
 */
export function usePermission() {
  const { user } = useAuth();
  const userPermissions = user?.user_metadata?.permissions || [];

  return {
    hasPermission: (permission: string | string[]) =>
      hasPermission(userPermissions, permission),
    hasAllPermissions: (permissions: string[]) =>
      hasAllPermissions(userPermissions, permissions),
    permissions: userPermissions,
  };
}

/**
 * Disabled Button with Permission Check
 */
interface PermissionButtonProps {
  children: ReactNode;
  require: string | string[];
  onClick?: () => void;
  className?: string;
  variant?: 'primary' | 'secondary' | 'danger';
}

export function PermissionButton({
  children,
  require,
  onClick,
  className = '',
  variant = 'primary',
}: PermissionButtonProps) {
  const { hasPermission: checkPermission } = usePermission();
  const hasAccess = checkPermission(require);

  const variantClasses = {
    primary: 'bg-blue-600 hover:bg-blue-700 text-white disabled:bg-gray-300',
    secondary: 'bg-gray-200 hover:bg-gray-300 text-gray-900 disabled:bg-gray-100',
    danger: 'bg-red-600 hover:bg-red-700 text-white disabled:bg-gray-300',
  };

  return (
    <button
      onClick={onClick}
      disabled={!hasAccess}
      className={`px-4 py-2 rounded-lg font-medium transition-colors disabled:cursor-not-allowed disabled:text-gray-500 ${variantClasses[variant]} ${className}`}
      title={!hasAccess ? 'You don\'t have permission for this action' : ''}
    >
      {children}
    </button>
  );
}

/**
 * Permission Badge
 * Shows permission status
 */
interface PermissionBadgeProps {
  permission: string;
  showIcon?: boolean;
}

export function PermissionBadge({ permission, showIcon = true }: PermissionBadgeProps) {
  const { hasPermission: checkPermission } = usePermission();
  const hasAccess = checkPermission(permission);

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${
        hasAccess
          ? 'bg-green-100 text-green-700'
          : 'bg-gray-100 text-gray-500'
      }`}
    >
      {showIcon && (hasAccess ? <Lock className="w-3 h-3" /> : <Lock className="w-3 h-3" />)}
      {permission}
    </span>
  );
}
