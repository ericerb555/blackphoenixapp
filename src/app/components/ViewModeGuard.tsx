import { ReactNode } from 'react';
import { useViewMode } from '../contexts/ViewModeContext';

interface ViewModeGuardProps {
  children: ReactNode;
  allowedRoles?: string[];
  fallback?: ReactNode;
}

export default function ViewModeGuard({ children, allowedRoles, fallback }: ViewModeGuardProps) {
  const { getEffectiveRole } = useViewMode();

  // If no roles specified, allow all
  if (!allowedRoles || allowedRoles.length === 0) {
    return <>{children}</>;
  }

  const effectiveRole = getEffectiveRole();
  
  if (!effectiveRole || !allowedRoles.includes(effectiveRole)) {
    if (fallback) return <>{fallback}</>;
    return null;
  }

  return <>{children}</>;
}