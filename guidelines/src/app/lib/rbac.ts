/**
 * Role-Based Access Control (RBAC) System
 * 
 * Hierarchy:
 * 1. PLATFORM_OWNER - Master admin (YOU) - Full access to everything
 * 2. TERRITORY_ADMIN - Bought territory license - Manage their territory
 * 3. VENDOR - Pays monthly subscription - Manage their storefront
 * 4. ADVERTISER - Pays monthly subscription - Manage their campaigns
 * 5. SUBCONTRACTOR - Pays monthly subscription - Manage their services
 * 6. CUSTOMER - End users - Basic access
 */

export enum UserRole {
  PLATFORM_OWNER = 'platform_owner',
  ADMIN = 'admin',
  TERRITORY_ADMIN = 'territory_admin',
  VENDOR = 'vendor',
  ADVERTISER = 'advertiser',
  SUBCONTRACTOR = 'subcontractor',
  CUSTOMER = 'customer',
  EMPLOYEE = 'employee',
  INVESTOR = 'investor',
  PROPERTY_MANAGER = 'property_manager',
  CONDO_MANAGER = 'condo_manager',
  LANDLORD = 'landlord',
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  tenant_id: string | null; // null for PLATFORM_OWNER, specific ID for others
  territory_ids?: string[]; // For TERRITORY_ADMIN - territories they manage
  cohort_id?: string; // Links to subscription plan
  status: 'active' | 'trial' | 'suspended' | 'cancelled';
  trial_end_date?: string;
  subscription_start_date?: string;
  created_at: string;
}

export interface Tenant {
  id: string;
  name: string;
  type: 'territory' | 'vendor' | 'advertiser' | 'subcontractor';
  owner_user_id: string;
  cohort_id: string; // Which subscription plan they're on
  status: 'active' | 'trial' | 'suspended' | 'cancelled';
  territory_id?: string; // For territory-based tenants
  branding?: {
    logo?: string;
    primary_color?: string;
    company_name?: string;
  };
  created_at: string;
  updated_at: string;
}

// Permission definitions
export type Permission =
  // Platform Owner (God Mode)
  | '*'
  | 'platform.view_all_tenants'
  | 'platform.view_all_analytics'
  | 'platform.manage_pricing'
  | 'platform.manage_cohorts'
  | 'platform.approve_territory_admins'
  | 'platform.suspend_any_account'
  | 'platform.view_all_revenue'
  | 'platform.manage_system_settings'
  
  // Territory Admin
  | 'territory.view_own_analytics'
  | 'territory.manage_vendors'
  | 'territory.manage_advertisers'
  | 'territory.manage_subcontractors'
  | 'territory.set_local_pricing'
  | 'territory.view_territory_revenue'
  | 'territory.approve_members'
  | 'territory.remove_members'
  
  // Vendor
  | 'vendor.manage_products'
  | 'vendor.manage_inventory'
  | 'vendor.view_own_analytics'
  | 'vendor.respond_to_quotes'
  | 'vendor.manage_storefront'
  | 'vendor.view_orders'
  
  // Advertiser
  | 'advertiser.create_campaigns'
  | 'advertiser.view_ad_performance'
  | 'advertiser.manage_budget'
  | 'advertiser.target_audience'
  
  // Subcontractor
  | 'subcontractor.view_projects'
  | 'subcontractor.submit_quotes'
  | 'subcontractor.manage_schedule'
  | 'subcontractor.view_earnings'
  
  // Customer
  | 'customer.submit_requests'
  | 'customer.view_own_projects'
  | 'customer.make_payments';

// Role-based permissions mapping
export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  [UserRole.PLATFORM_OWNER]: [
    '*', // God mode - all permissions
  ],

  [UserRole.ADMIN]: [
    'admin.view_all_work_orders',
    'admin.dispatch_employees',
    'admin.assign_work_orders',
    'admin.manage_schedules',
    'admin.view_all_customers',
    'admin.view_analytics',
    'admin.manage_messages',
    'admin.approve_work_orders',
    'admin.manage_invoices',
    'admin.view_employees',
  ],

  [UserRole.TERRITORY_ADMIN]: [
    'territory.view_own_analytics',
    'territory.manage_vendors',
    'territory.manage_advertisers',
    'territory.manage_subcontractors',
    'territory.set_local_pricing',
    'territory.view_territory_revenue',
    'territory.approve_members',
    'territory.remove_members',
  ],
  
  [UserRole.VENDOR]: [
    'vendor.manage_products',
    'vendor.manage_inventory',
    'vendor.view_own_analytics',
    'vendor.respond_to_quotes',
    'vendor.manage_storefront',
    'vendor.view_orders',
  ],
  
  [UserRole.ADVERTISER]: [
    'advertiser.create_campaigns',
    'advertiser.view_ad_performance',
    'advertiser.manage_budget',
    'advertiser.target_audience',
  ],
  
  [UserRole.SUBCONTRACTOR]: [
    'subcontractor.view_projects',
    'subcontractor.submit_quotes',
    'subcontractor.manage_schedule',
    'subcontractor.view_earnings',
  ],
  
  [UserRole.CUSTOMER]: [
    'customer.submit_requests',
    'customer.view_own_projects',
    'customer.make_payments',
  ],

  [UserRole.EMPLOYEE]: [
    'customer.submit_requests',
    'customer.view_own_projects',
  ],

  [UserRole.INVESTOR]: [
    'customer.view_own_projects',
  ],

  [UserRole.PROPERTY_MANAGER]: [
    'customer.submit_requests',
    'customer.view_own_projects',
  ],

  [UserRole.CONDO_MANAGER]: [
    'customer.submit_requests',
    'customer.view_own_projects',
  ],

  [UserRole.LANDLORD]: [
    'customer.submit_requests',
    'customer.view_own_projects',
  ],
};

// Check if user has permission
export function hasPermission(user: User | null, permission: Permission): boolean {
  if (!user) return false;
  
  const userPermissions = ROLE_PERMISSIONS[user.role];
  
  // Platform owner has god mode
  if (userPermissions.includes('*')) return true;
  
  // Check specific permission
  return userPermissions.includes(permission);
}

// Check if user has any of the provided permissions
export function hasAnyPermission(user: User | null, permissions: Permission[]): boolean {
  if (!user) return false;
  return permissions.some(p => hasPermission(user, p));
}

// Check if user has all of the provided permissions
export function hasAllPermissions(user: User | null, permissions: Permission[]): boolean {
  if (!user) return false;
  return permissions.every(p => hasPermission(user, p));
}

// Check if user can access tenant data
export function canAccessTenant(user: User | null, tenantId: string): boolean {
  if (!user) return false;
  
  // Platform owner can access everything
  if (user.role === UserRole.PLATFORM_OWNER) return true;
  
  // Users can only access their own tenant
  return user.tenant_id === tenantId;
}

// Get role display name
export function getRoleDisplayName(role: UserRole): string {
  const names: Record<UserRole, string> = {
    [UserRole.PLATFORM_OWNER]: 'Platform Owner',
    [UserRole.ADMIN]: 'Admin',
    [UserRole.TERRITORY_ADMIN]: 'Territory Administrator',
    [UserRole.VENDOR]: 'Vendor',
    [UserRole.ADVERTISER]: 'Advertiser',
    [UserRole.SUBCONTRACTOR]: 'Subcontractor',
    [UserRole.CUSTOMER]: 'Customer',
    [UserRole.EMPLOYEE]: 'Employee',
    [UserRole.INVESTOR]: 'Investor',
    [UserRole.PROPERTY_MANAGER]: 'Property Manager',
    [UserRole.CONDO_MANAGER]: 'Condo Manager',
    [UserRole.LANDLORD]: 'Landlord',
  };
  return names[role];
}

// Get role color for UI
export function getRoleColor(role: UserRole): string {
  const colors: Record<UserRole, string> = {
    [UserRole.PLATFORM_OWNER]: 'red',
    [UserRole.ADMIN]: 'rose',
    [UserRole.TERRITORY_ADMIN]: 'purple',
    [UserRole.VENDOR]: 'blue',
    [UserRole.ADVERTISER]: 'pink',
    [UserRole.SUBCONTRACTOR]: 'orange',
    [UserRole.CUSTOMER]: 'green',
    [UserRole.EMPLOYEE]: 'indigo',
    [UserRole.INVESTOR]: 'emerald',
    [UserRole.PROPERTY_MANAGER]: 'amber',
    [UserRole.CONDO_MANAGER]: 'cyan',
    [UserRole.LANDLORD]: 'teal',
  };
  return colors[role];
}

// Check if user is in trial period
export function isInTrialPeriod(user: User): boolean {
  if (!user.trial_end_date) return false;
  return new Date(user.trial_end_date) > new Date();
}

// Get subscription tier from cohort
export function getSubscriptionTier(cohortId: string): string {
  // Map cohort IDs to tier names
  const tierMap: Record<string, string> = {
    'cohort-001': 'Starter',
    'cohort-002': 'Professional',
    'cohort-003': 'Premium',
    'cohort-004': 'Elite',
    'cohort-005': 'Pro',
    'cohort-006': 'Storefront',
    'cohort-007': 'Essentials',
    'cohort-008': 'Premium Care',
  };
  return tierMap[cohortId] || 'Unknown';
}
