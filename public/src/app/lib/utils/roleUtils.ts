/**
 * Role Utilities
 * Simple role checking and permissions
 */

export type UserRole = 'owner' | 'admin' | 'manager' | 'employee' | 'contractor' | 'customer' | 'guest';

// Role hierarchy (higher number = higher privilege)
const roleHierarchy: Record<UserRole, number> = {
  owner: 100,
  admin: 80,
  manager: 60,
  employee: 40,
  contractor: 30,
  customer: 20,
  guest: 10,
};

/**
 * Get current user role from localStorage
 * Defaults to 'admin' for development
 */
export function getCurrentUserRole(): UserRole {
  const storedRole = localStorage.getItem('user_role') as UserRole;
  return storedRole || 'admin'; // Default to admin for development
}

/**
 * Set current user role in localStorage
 */
export function setCurrentUserRole(role: UserRole): void {
  localStorage.setItem('user_role', role);
}

/**
 * Check if user has minimum required role level
 */
export function hasMinimumRole(requiredRole: UserRole): boolean {
  const currentRole = getCurrentUserRole();
  return roleHierarchy[currentRole] >= roleHierarchy[requiredRole];
}

/**
 * Check if user is admin or higher
 */
export function isAdminOrHigher(): boolean {
  return hasMinimumRole('admin');
}

/**
 * Check if user is manager or higher
 */
export function isManagerOrHigher(): boolean {
  return hasMinimumRole('manager');
}

/**
 * Check if user is owner
 */
export function isOwner(): boolean {
  return getCurrentUserRole() === 'owner';
}
