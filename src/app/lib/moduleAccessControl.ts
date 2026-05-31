/**
 * Module Access Control System
 * Enforces module and feature access based on user roles and portal configurations
 */

import { supabase } from './supabase';

export interface ModuleAccess {
  module_id: string;
  module_name: string;
  enabled: boolean;
  permissions: string[];
  inherited_from?: string;
}

export interface PortalConfig {
  portal_id: string;
  portal_name: string;
  portal_type: 'customer' | 'employee' | 'subcontractor' | 'admin' | 'full';
  allowed_roles: string[];
  available_modules: string[];
  required_auth: boolean;
  is_published: boolean;
}

export interface UserModuleAccess {
  userId: string;
  roleId: string;
  roleName: string;
  portalType: string;
  allowedModules: Set<string>;
  permissions: Record<string, string[]>;
}

/**
 * Default module configurations by role
 */
export const DEFAULT_ROLE_MODULES: Record<string, string[]> = {
  owner: ['*'], // All modules
  admin: [
    'dashboard', 'profile', 'notifications', 'projects_view', 'quotes_view',
    'invoices_view', 'service_requests', 'appointments', 'document_access',
    'payments', 'subscriptions', 'work_orders', 'time_tracking', 'location_tracking',
    'messaging', 'video_calls', 'phone_support', 'project_analytics', 'photo_gallery'
  ],
  manager: [
    'dashboard', 'profile', 'notifications', 'projects_view', 'quotes_view',
    'invoices_view', 'service_requests', 'appointments', 'document_access',
    'payments', 'work_orders', 'time_tracking', 'location_tracking',
    'messaging', 'video_calls', 'project_analytics', 'photo_gallery'
  ],
  technician: [
    'dashboard', 'profile', 'notifications', 'work_orders', 'time_tracking',
    'location_tracking', 'messaging', 'photo_gallery'
  ],
  sales: [
    'dashboard', 'profile', 'notifications', 'quotes_view', 'service_requests',
    'messaging', 'video_calls', 'document_access'
  ],
  office: [
    'dashboard', 'profile', 'notifications', 'appointments', 'document_access',
    'messaging'
  ],
  subcontractor: [
    'dashboard', 'profile', 'notifications', 'work_orders', 'time_tracking',
    'messaging'
  ],
  customer: [
    'dashboard', 'profile', 'notifications', 'projects_view', 'quotes_view',
    'invoices_view', 'service_requests', 'appointments', 'document_access',
    'payments', 'subscriptions', 'rewards', 'messaging', 'video_calls',
    'phone_support', 'project_analytics', 'photo_gallery', 'video_library',
    'vendor_directory'
  ],
};

/**
 * Portal type mappings
 */
export const PORTAL_TYPE_BY_ROLE: Record<string, PortalConfig['portal_type']> = {
  owner: 'full',
  admin: 'admin',
  manager: 'admin',
  technician: 'employee',
  sales: 'employee',
  office: 'employee',
  subcontractor: 'subcontractor',
  customer: 'customer',
};

/**
 * Get user's module access configuration
 */
export async function getUserModuleAccess(userId: string): Promise<UserModuleAccess | null> {
  try {
    // Get user role and company context
    const { data: userRole, error: roleError } = await supabase
      .from('user_permissions')
      .select('role_id, role_name')
      .eq('user_id', userId)
      .single();

    if (roleError || !userRole) {
      console.error('Error fetching user role:', roleError);
      return null;
    }

    // Get custom module access overrides (if any)
    const { data: customAccess } = await supabase
      .from('user_module_access')
      .select('module_id, permissions')
      .eq('user_id', userId)
      .eq('enabled', true);

    // Determine portal type
    const portalType = PORTAL_TYPE_BY_ROLE[userRole.role_name] || 'customer';

    // Get default modules for role
    const defaultModules = DEFAULT_ROLE_MODULES[userRole.role_name] || [];
    
    // Combine default and custom access
    const allowedModules = new Set(
      userRole.role_name === 'owner' || defaultModules.includes('*')
        ? Object.keys(DEFAULT_ROLE_MODULES).flatMap(role => DEFAULT_ROLE_MODULES[role])
        : defaultModules
    );

    // Build permissions map
    const permissions: Record<string, string[]> = {};
    if (customAccess) {
      customAccess.forEach(access => {
        permissions[access.module_id] = access.permissions || [];
      });
    }

    return {
      userId,
      roleId: userRole.role_id,
      roleName: userRole.role_name,
      portalType,
      allowedModules,
      permissions,
    };
  } catch (error) {
    console.error('Error in getUserModuleAccess:', error);
    return null;
  }
}

/**
 * Check if user has access to a specific module
 */
export async function hasModuleAccess(
  userId: string,
  moduleId: string
): Promise<boolean> {
  const access = await getUserModuleAccess(userId);
  if (!access) return false;

  return access.allowedModules.has(moduleId) || access.roleName === 'owner';
}

/**
 * Check if user has specific permission within a module
 */
export async function hasModulePermission(
  userId: string,
  moduleId: string,
  permission: string
): Promise<boolean> {
  const access = await getUserModuleAccess(userId);
  if (!access) return false;

  // Owner has all permissions
  if (access.roleName === 'owner') return true;

  // Check if user has module access first
  if (!access.allowedModules.has(moduleId)) return false;

  // Check specific permission
  const modulePermissions = access.permissions[moduleId];
  if (!modulePermissions) return false;

  return modulePermissions.includes(permission);
}

/**
 * Get all modules accessible to user
 */
export async function getAccessibleModules(userId: string): Promise<string[]> {
  const access = await getUserModuleAccess(userId);
  if (!access) return [];

  return Array.from(access.allowedModules);
}

/**
 * Get portal configuration for user role
 */
export async function getPortalConfigForUser(userId: string): Promise<PortalConfig | null> {
  const access = await getUserModuleAccess(userId);
  if (!access) return null;

  // In production, this would fetch from database
  // For now, return a default configuration
  return {
    portal_id: `portal-${access.portalType}`,
    portal_name: `${access.roleName} Portal`,
    portal_type: access.portalType as PortalConfig['portal_type'],
    allowed_roles: [access.roleName],
    available_modules: Array.from(access.allowedModules),
    required_auth: true,
    is_published: true,
  };
}

/**
 * Validate module access and log security event
 */
export async function validateAndLogModuleAccess(
  userId: string,
  moduleId: string,
  action: string = 'access'
): Promise<{ allowed: boolean; reason?: string }> {
  try {
    const hasAccess = await hasModuleAccess(userId, moduleId);

    // Log security event
    await supabase.from('security_audit_log').insert({
      user_id: userId,
      event_type: hasAccess ? 'module_access_granted' : 'module_access_denied',
      details: {
        module_id: moduleId,
        action,
        timestamp: new Date().toISOString(),
      },
      success: hasAccess,
    });

    return {
      allowed: hasAccess,
      reason: hasAccess ? undefined : 'Insufficient permissions',
    };
  } catch (error) {
    console.error('Error validating module access:', error);
    return {
      allowed: false,
      reason: 'Validation error',
    };
  }
}

/**
 * Update user's module access (admin only)
 */
export async function updateUserModuleAccess(
  adminUserId: string,
  targetUserId: string,
  moduleId: string,
  enabled: boolean,
  permissions: string[] = []
): Promise<{ success: boolean; error?: string }> {
  try {
    // Verify admin has permission to modify access
    const adminAccess = await getUserModuleAccess(adminUserId);
    if (!adminAccess || !['owner', 'admin'].includes(adminAccess.roleName)) {
      return { success: false, error: 'Insufficient permissions' };
    }

    // Update or insert module access
    const { error } = await supabase
      .from('user_module_access')
      .upsert({
        user_id: targetUserId,
        module_id: moduleId,
        enabled,
        permissions,
        updated_by: adminUserId,
        updated_at: new Date().toISOString(),
      });

    if (error) {
      return { success: false, error: error.message };
    }

    // Log the change
    await supabase.from('security_audit_log').insert({
      user_id: adminUserId,
      event_type: 'module_access_modified',
      details: {
        target_user_id: targetUserId,
        module_id: moduleId,
        enabled,
        permissions,
        timestamp: new Date().toISOString(),
      },
      success: true,
    });

    return { success: true };
  } catch (error) {
    console.error('Error updating module access:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Bulk update module access for role
 */
export async function updateRoleModuleAccess(
  adminUserId: string,
  roleId: string,
  moduleAccess: Record<string, { enabled: boolean; permissions: string[] }>
): Promise<{ success: boolean; error?: string }> {
  try {
    // Verify admin has permission
    const adminAccess = await getUserModuleAccess(adminUserId);
    if (!adminAccess || !['owner', 'admin'].includes(adminAccess.roleName)) {
      return { success: false, error: 'Insufficient permissions' };
    }

    // Update role module access configuration
    const { error } = await supabase
      .from('role_module_access')
      .upsert({
        role_id: roleId,
        module_access: moduleAccess,
        updated_by: adminUserId,
        updated_at: new Date().toISOString(),
      });

    if (error) {
      return { success: false, error: error.message };
    }

    // Log the change
    await supabase.from('security_audit_log').insert({
      user_id: adminUserId,
      event_type: 'role_module_access_updated',
      details: {
        role_id: roleId,
        module_count: Object.keys(moduleAccess).length,
        timestamp: new Date().toISOString(),
      },
      success: true,
    });

    return { success: true };
  } catch (error) {
    console.error('Error updating role module access:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get module access statistics for admin dashboard
 */
export async function getModuleAccessStats(companyId?: string) {
  try {
    const filters = companyId ? { company_id: companyId } : {};

    const [
      { count: totalUsers },
      { count: totalModules },
      { data: accessData },
    ] = await Promise.all([
      supabase.from('user_profiles').select('*', { count: 'exact', head: true }).match(filters),
      supabase
        .from('user_module_access')
        .select('module_id', { count: 'exact', head: true })
        .eq('enabled', true),
      supabase
        .from('user_module_access')
        .select('module_id, user_id')
        .eq('enabled', true)
        .match(filters),
    ]);

    // Calculate module usage statistics
    const moduleUsage: Record<string, number> = {};
    if (accessData) {
      accessData.forEach(access => {
        moduleUsage[access.module_id] = (moduleUsage[access.module_id] || 0) + 1;
      });
    }

    return {
      totalUsers: totalUsers || 0,
      totalModules: totalModules || 0,
      moduleUsage,
      averageModulesPerUser: totalUsers ? (totalModules || 0) / totalUsers : 0,
    };
  } catch (error) {
    console.error('Error getting module access stats:', error);
    return {
      totalUsers: 0,
      totalModules: 0,
      moduleUsage: {},
      averageModulesPerUser: 0,
    };
  }
}
