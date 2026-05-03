/**
 * Enterprise Permission System
 * Granular role-based access control
 */

export interface Permission {
  id: string;
  name: string;
  description: string;
  category: PermissionCategory;
  resource: string;
  action: PermissionAction;
  scope: PermissionScope;
  metadata?: Record<string, any>;
}

export type PermissionCategory =
  | 'customers'
  | 'quotes'
  | 'work_orders'
  | 'invoices'
  | 'payments'
  | 'projects'
  | 'crm'
  | 'users'
  | 'roles'
  | 'settings'
  | 'reports'
  | 'analytics'
  | 'subcontractors'
  | 'investors'
  | 'advertisers'
  | 'modules'
  | 'content'
  | 'media'
  | 'documents'
  | 'calendar'
  | 'messaging'
  | 'notifications'
  | 'integrations'
  | 'api'
  | 'system';

export type PermissionAction =
  | 'create'
  | 'read'
  | 'update'
  | 'delete'
  | 'approve'
  | 'reject'
  | 'export'
  | 'import'
  | 'share'
  | 'publish'
  | 'archive'
  | 'restore'
  | 'assign'
  | 'manage'
  | 'view_all'
  | 'view_own'
  | 'execute';

export type PermissionScope = 'global' | 'company' | 'team' | 'own';

export interface Role {
  id: string;
  name: string;
  slug: string;
  description: string;
  type: 'system' | 'custom';
  level: number;
  permissions: string[];
  inherits_from?: string[];
  color: string;
  icon: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by: string;
  user_count?: number;
  metadata?: {
    can_be_deleted?: boolean;
    can_be_edited?: boolean;
    requires_approval?: boolean;
  };
}

export interface RoleTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  permissions: string[];
  recommended_for: string[];
}

/**
 * Complete permission definitions
 */
export const PERMISSIONS: Record<string, Permission> = {
  // Customer Management
  'customers.create': {
    id: 'customers.create',
    name: 'Create Customers',
    description: 'Create new customer records',
    category: 'customers',
    resource: 'customers',
    action: 'create',
    scope: 'company',
  },
  'customers.read': {
    id: 'customers.read',
    name: 'View Customers',
    description: 'View customer information',
    category: 'customers',
    resource: 'customers',
    action: 'read',
    scope: 'company',
  },
  'customers.update': {
    id: 'customers.update',
    name: 'Edit Customers',
    description: 'Update customer records',
    category: 'customers',
    resource: 'customers',
    action: 'update',
    scope: 'company',
  },
  'customers.delete': {
    id: 'customers.delete',
    name: 'Delete Customers',
    description: 'Remove customer records',
    category: 'customers',
    resource: 'customers',
    action: 'delete',
    scope: 'company',
  },
  'customers.export': {
    id: 'customers.export',
    name: 'Export Customers',
    description: 'Export customer data',
    category: 'customers',
    resource: 'customers',
    action: 'export',
    scope: 'company',
  },

  // Quote Management
  'quotes.create': {
    id: 'quotes.create',
    name: 'Create Quotes',
    description: 'Create new quotes',
    category: 'quotes',
    resource: 'quotes',
    action: 'create',
    scope: 'company',
  },
  'quotes.read': {
    id: 'quotes.read',
    name: 'View Quotes',
    description: 'View quote information',
    category: 'quotes',
    resource: 'quotes',
    action: 'read',
    scope: 'company',
  },
  'quotes.update': {
    id: 'quotes.update',
    name: 'Edit Quotes',
    description: 'Update quotes',
    category: 'quotes',
    resource: 'quotes',
    action: 'update',
    scope: 'company',
  },
  'quotes.delete': {
    id: 'quotes.delete',
    name: 'Delete Quotes',
    description: 'Remove quotes',
    category: 'quotes',
    resource: 'quotes',
    action: 'delete',
    scope: 'company',
  },
  'quotes.approve': {
    id: 'quotes.approve',
    name: 'Approve Quotes',
    description: 'Approve quotes for customers',
    category: 'quotes',
    resource: 'quotes',
    action: 'approve',
    scope: 'company',
  },

  // Work Order Management
  'work_orders.create': {
    id: 'work_orders.create',
    name: 'Create Work Orders',
    description: 'Create new work orders',
    category: 'work_orders',
    resource: 'work_orders',
    action: 'create',
    scope: 'company',
  },
  'work_orders.read': {
    id: 'work_orders.read',
    name: 'View Work Orders',
    description: 'View work order information',
    category: 'work_orders',
    resource: 'work_orders',
    action: 'read',
    scope: 'company',
  },
  'work_orders.update': {
    id: 'work_orders.update',
    name: 'Edit Work Orders',
    description: 'Update work orders',
    category: 'work_orders',
    resource: 'work_orders',
    action: 'update',
    scope: 'company',
  },
  'work_orders.assign': {
    id: 'work_orders.assign',
    name: 'Assign Work Orders',
    description: 'Assign work orders to users',
    category: 'work_orders',
    resource: 'work_orders',
    action: 'assign',
    scope: 'company',
  },

  // Invoice Management
  'invoices.create': {
    id: 'invoices.create',
    name: 'Create Invoices',
    description: 'Generate new invoices',
    category: 'invoices',
    resource: 'invoices',
    action: 'create',
    scope: 'company',
  },
  'invoices.read': {
    id: 'invoices.read',
    name: 'View Invoices',
    description: 'View invoice details',
    category: 'invoices',
    resource: 'invoices',
    action: 'read',
    scope: 'company',
  },
  'invoices.update': {
    id: 'invoices.update',
    name: 'Edit Invoices',
    description: 'Modify invoices',
    category: 'invoices',
    resource: 'invoices',
    action: 'update',
    scope: 'company',
  },
  'invoices.delete': {
    id: 'invoices.delete',
    name: 'Delete Invoices',
    description: 'Remove invoices',
    category: 'invoices',
    resource: 'invoices',
    action: 'delete',
    scope: 'company',
  },

  // Payment Management
  'payments.create': {
    id: 'payments.create',
    name: 'Process Payments',
    description: 'Process customer payments',
    category: 'payments',
    resource: 'payments',
    action: 'create',
    scope: 'company',
  },
  'payments.read': {
    id: 'payments.read',
    name: 'View Payments',
    description: 'View payment records',
    category: 'payments',
    resource: 'payments',
    action: 'read',
    scope: 'company',
  },
  'payments.approve': {
    id: 'payments.approve',
    name: 'Approve Payments',
    description: 'Approve payment transactions',
    category: 'payments',
    resource: 'payments',
    action: 'approve',
    scope: 'company',
  },

  // CRM Management
  'crm.contacts.create': {
    id: 'crm.contacts.create',
    name: 'Create Contacts',
    description: 'Add new CRM contacts',
    category: 'crm',
    resource: 'crm.contacts',
    action: 'create',
    scope: 'company',
  },
  'crm.contacts.read': {
    id: 'crm.contacts.read',
    name: 'View Contacts',
    description: 'View CRM contacts',
    category: 'crm',
    resource: 'crm.contacts',
    action: 'read',
    scope: 'company',
  },
  'crm.deals.create': {
    id: 'crm.deals.create',
    name: 'Create Deals',
    description: 'Create new deals',
    category: 'crm',
    resource: 'crm.deals',
    action: 'create',
    scope: 'company',
  },
  'crm.deals.read': {
    id: 'crm.deals.read',
    name: 'View Deals',
    description: 'View deal pipeline',
    category: 'crm',
    resource: 'crm.deals',
    action: 'read',
    scope: 'company',
  },

  // User Management
  'users.create': {
    id: 'users.create',
    name: 'Create Users',
    description: 'Add new users to the system',
    category: 'users',
    resource: 'users',
    action: 'create',
    scope: 'company',
  },
  'users.read': {
    id: 'users.read',
    name: 'View Users',
    description: 'View user information',
    category: 'users',
    resource: 'users',
    action: 'read',
    scope: 'company',
  },
  'users.update': {
    id: 'users.update',
    name: 'Edit Users',
    description: 'Update user profiles',
    category: 'users',
    resource: 'users',
    action: 'update',
    scope: 'company',
  },
  'users.delete': {
    id: 'users.delete',
    name: 'Delete Users',
    description: 'Remove users from system',
    category: 'users',
    resource: 'users',
    action: 'delete',
    scope: 'company',
  },

  // Role Management
  'roles.create': {
    id: 'roles.create',
    name: 'Create Roles',
    description: 'Create new custom roles',
    category: 'roles',
    resource: 'roles',
    action: 'create',
    scope: 'company',
  },
  'roles.read': {
    id: 'roles.read',
    name: 'View Roles',
    description: 'View role configurations',
    category: 'roles',
    resource: 'roles',
    action: 'read',
    scope: 'company',
  },
  'roles.update': {
    id: 'roles.update',
    name: 'Edit Roles',
    description: 'Modify role permissions',
    category: 'roles',
    resource: 'roles',
    action: 'update',
    scope: 'company',
  },
  'roles.delete': {
    id: 'roles.delete',
    name: 'Delete Roles',
    description: 'Remove custom roles',
    category: 'roles',
    resource: 'roles',
    action: 'delete',
    scope: 'company',
  },
  'roles.assign': {
    id: 'roles.assign',
    name: 'Assign Roles',
    description: 'Assign roles to users',
    category: 'roles',
    resource: 'roles',
    action: 'assign',
    scope: 'company',
  },

  // Settings Management
  'settings.read': {
    id: 'settings.read',
    name: 'View Settings',
    description: 'View system settings',
    category: 'settings',
    resource: 'settings',
    action: 'read',
    scope: 'company',
  },
  'settings.update': {
    id: 'settings.update',
    name: 'Update Settings',
    description: 'Modify system settings',
    category: 'settings',
    resource: 'settings',
    action: 'update',
    scope: 'company',
  },

  // Reports & Analytics
  'reports.read': {
    id: 'reports.read',
    name: 'View Reports',
    description: 'Access business reports',
    category: 'reports',
    resource: 'reports',
    action: 'read',
    scope: 'company',
  },
  'reports.export': {
    id: 'reports.export',
    name: 'Export Reports',
    description: 'Export report data',
    category: 'reports',
    resource: 'reports',
    action: 'export',
    scope: 'company',
  },
  'analytics.read': {
    id: 'analytics.read',
    name: 'View Analytics',
    description: 'Access analytics dashboards',
    category: 'analytics',
    resource: 'analytics',
    action: 'read',
    scope: 'company',
  },

  // Module Management
  'modules.manage': {
    id: 'modules.manage',
    name: 'Manage Modules',
    description: 'Enable/disable platform modules',
    category: 'modules',
    resource: 'modules',
    action: 'manage',
    scope: 'company',
  },

  // System Administration
  'system.backup': {
    id: 'system.backup',
    name: 'System Backup',
    description: 'Create system backups',
    category: 'system',
    resource: 'system',
    action: 'execute',
    scope: 'global',
  },
  'system.restore': {
    id: 'system.restore',
    name: 'System Restore',
    description: 'Restore from backup',
    category: 'system',
    resource: 'system',
    action: 'execute',
    scope: 'global',
  },
  'system.logs': {
    id: 'system.logs',
    name: 'View System Logs',
    description: 'Access system audit logs',
    category: 'system',
    resource: 'system',
    action: 'read',
    scope: 'global',
  },
};

/**
 * Role templates for quick setup
 */
export const ROLE_TEMPLATES: RoleTemplate[] = [
  {
    id: 'owner',
    name: 'Owner',
    description: 'Full system access with all permissions',
    category: 'Executive',
    permissions: Object.keys(PERMISSIONS),
    recommended_for: ['Business Owner', 'CEO'],
  },
  {
    id: 'admin',
    name: 'Administrator',
    description: 'Administrative access to most features',
    category: 'Management',
    permissions: [
      'customers.create', 'customers.read', 'customers.update', 'customers.delete',
      'quotes.create', 'quotes.read', 'quotes.update', 'quotes.approve',
      'work_orders.create', 'work_orders.read', 'work_orders.update', 'work_orders.assign',
      'invoices.create', 'invoices.read', 'invoices.update',
      'payments.read', 'payments.approve',
      'crm.contacts.create', 'crm.contacts.read', 'crm.deals.create', 'crm.deals.read',
      'users.read', 'users.update',
      'reports.read', 'analytics.read',
    ],
    recommended_for: ['Office Manager', 'Operations Manager'],
  },
  {
    id: 'sales_manager',
    name: 'Sales Manager',
    description: 'Manage sales, quotes, and customer relationships',
    category: 'Sales',
    permissions: [
      'customers.create', 'customers.read', 'customers.update',
      'quotes.create', 'quotes.read', 'quotes.update', 'quotes.approve',
      'crm.contacts.create', 'crm.contacts.read', 'crm.deals.create', 'crm.deals.read',
      'reports.read',
    ],
    recommended_for: ['Sales Manager', 'Business Development'],
  },
  {
    id: 'project_manager',
    name: 'Project Manager',
    description: 'Manage projects, work orders, and scheduling',
    category: 'Operations',
    permissions: [
      'customers.read',
      'work_orders.create', 'work_orders.read', 'work_orders.update', 'work_orders.assign',
      'reports.read',
    ],
    recommended_for: ['Project Manager', 'Field Supervisor'],
  },
  {
    id: 'accountant',
    name: 'Accountant',
    description: 'Manage invoices, payments, and financial reports',
    category: 'Finance',
    permissions: [
      'customers.read',
      'invoices.create', 'invoices.read', 'invoices.update', 'invoices.delete',
      'payments.create', 'payments.read', 'payments.approve',
      'reports.read', 'reports.export', 'analytics.read',
    ],
    recommended_for: ['Accountant', 'Bookkeeper', 'Finance Manager'],
  },
  {
    id: 'customer_service',
    name: 'Customer Service',
    description: 'Handle customer inquiries and basic operations',
    category: 'Support',
    permissions: [
      'customers.read', 'customers.update',
      'quotes.read',
      'work_orders.read',
      'invoices.read',
    ],
    recommended_for: ['Customer Service Rep', 'Support Specialist'],
  },
  {
    id: 'technician',
    name: 'Technician',
    description: 'View and update assigned work orders',
    category: 'Field',
    permissions: [
      'work_orders.read', 'work_orders.update',
    ],
    recommended_for: ['Field Technician', 'Service Technician'],
  },
  {
    id: 'read_only',
    name: 'Read Only',
    description: 'View-only access to basic information',
    category: 'General',
    permissions: [
      'customers.read',
      'quotes.read',
      'work_orders.read',
      'invoices.read',
    ],
    recommended_for: ['Stakeholder', 'Auditor', 'Consultant'],
  },
];

/**
 * Check if user has specific permission
 */
export function hasPermission(
  userPermissions: string[],
  requiredPermission: string | string[]
): boolean {
  if (Array.isArray(requiredPermission)) {
    return requiredPermission.some(perm => userPermissions.includes(perm));
  }
  return userPermissions.includes(requiredPermission);
}

/**
 * Check if user has all required permissions
 */
export function hasAllPermissions(
  userPermissions: string[],
  requiredPermissions: string[]
): boolean {
  return requiredPermissions.every(perm => userPermissions.includes(perm));
}

/**
 * Get permissions by category
 */
export function getPermissionsByCategory(category: PermissionCategory): Permission[] {
  return Object.values(PERMISSIONS).filter(p => p.category === category);
}

/**
 * Get all permission categories
 */
export function getPermissionCategories(): PermissionCategory[] {
  const categories = new Set<PermissionCategory>();
  Object.values(PERMISSIONS).forEach(p => categories.add(p.category));
  return Array.from(categories);
}

/**
 * Validate role permissions
 */
export function validateRolePermissions(permissions: string[]): {
  valid: boolean;
  invalid: string[];
} {
  const allPermissions = Object.keys(PERMISSIONS);
  const invalid = permissions.filter(p => !allPermissions.includes(p));
  
  return {
    valid: invalid.length === 0,
    invalid,
  };
}
