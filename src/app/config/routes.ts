/**
 * Route Registry
 * Central configuration for all application routes
 * 
 * This file will eventually support:
 * - Lazy loading (Phase 2)
 * - Route metadata (permissions, titles, etc.)
 * - React Router migration (Phase 3)
 */

export type RouteName = 
  // Core Dashboard Routes
  | 'dashboard'
  | 'admin-dashboard'
  | 'unified-dashboard'
  
  // Admin & Management
  | 'admin-alerts-tracking'
  | 'admin-alerts'
  | 'admin-workflow-manager'
  | 'admin-access-control'
  | 'control-center'
  
  // Design & Showcase
  | 'design-showcase'
  | 'design-studio-pro'
  | 'design-pipelines'
  | 'drawing-settings'
  
  // Mobile & Portal Apps
  | 'employee-mobile-app'
  | 'mobile-app-feature-manager'
  | 'mobile-portal-hub'
  | 'portal-builder'
  | 'mobile-app-portal'
  | 'companion-app-builder'
  | 'mobile-app-management'
  | 'mobile-app-hub'
  
  // Communication
  | 'messaging'
  | 'messaging-system-test'
  | 'calendar'
  | 'master-schedule'
  | 'master-scheduling'
  
  // People Management
  | 'employee-management'
  | 'customers'
  | 'user-management'
  
  // Quotes & Contracts
  | 'quote-creation'
  | 'quote-workflow'
  | 'enterprise-quote-workflow'
  | 'contract-workflow'
  | 'quote-responses'
  | 'change-orders'
  | 'quote-prep'
  | 'ai-quote-builder'
  
  // Subscriptions & Payments
  | 'subscriptions'
  | 'subscription-hub'
  | 'subscription-plans'
  | 'payment-center'
  | 'payment-hub'
  | 'payment-notifications'
  | 'payment-settings'
  
  // Work Management
  | 'work-orders'
  | 'invoices'
  | 'service-transfers'
  | 'time-tracking'
  | 'work-request-tracking'
  | 'work-request-intake'
  | 'service-scheduling'
  
  // Reporting & Analytics
  | 'reports'
  | 'enterprise-coding-tracking'
  | 'enterprise-reporting'
  | 'transaction-history'
  
  // Services
  | 'services'
  
  // Subcontractor Management
  | 'subcontractor-discounts'
  | 'subcontractor-plans'
  | 'subcontractor-subscription-plans'
  | 'subcontractor-subscription-dashboard'
  | 'subcontractor-management'
  | 'subcontractor-enterprise'
  | 'subcontractor-debug'
  | 'all-subcontractors'
  | 'subcontractor-quote-review'
  | 'social-media-manager'
  
  // Stakeholders
  | 'stakeholder-hub'
  | 'stakeholders'
  
  // Workflow Systems
  | 'workflow-manager'
  | 'workflow-sentinel'
  | 'workflow-controls'
  | 'handyman-tech'
  
  // Supplier/Vendor Management
  | 'supplier-connect'
  | 'supplier-audit'
  | 'vendor-advertising-hub'
  | 'vendor-super-portal'
  | 'dropshipper-admin'
  
  // Company Management
  | 'company-profile'
  | 'company-management'
  | 'announcements'
  
  // Media & Content
  | 'customer-media'
  | 'reel-ads'
  | 'content-center'
  | 'content-automation'
  | 'advertising-management'
  
  // Access & Security
  | 'role-management'
  | 'business-profiles'
  
  // Customer Relations
  | 'customer-reviews'
  | 'referral-rewards'
  
  // Promotions & Rewards
  | 'promotional-codes'
  
  // Finance & HR
  | 'payroll'
  | 'enterprise-hr'
  | 'hr-configuration-wizard'
  
  // System Management
  | 'data-backup'
  | 'enterprise-email'
  | 'domain-management'
  | 'system-backup-recovery'
  | 'server-deployment'
  | 'landing-page-editor'
  | 'website-settings'
  
  // AI & Advanced Features
  | 'ai-diagnostics'
  | 'blockchain-management'
  
  // Theming
  | 'theme-control-room'
  | 'theme-manager'
  | 'theme-settings'
  
  // CRM
  | 'crm'
  | 'crm-management'
  
  // Material & Estimating
  | 'material-estimating'
  | 'materials-database'
  
  // Modules
  | 'module-management'
  | 'module-manager'
  | 'module-view-bindings'
  | 'module-access-control'
  
  // Folder Systems
  | 'personal-folder-system'
  
  // Specialized Measurement Tools
  | 'door-window-measurement'
  | 'door-window-scope'
  | 'door-window-openings'
  
  // CAD & Design Tools
  | 'electrical-plumbing-design'
  | 'cad-system'
  | 'enterprise-cad-studio'
  
  // Portals (Stakeholder Views)
  | 'owners-portal'
  | 'owner-portal'
  | 'bank-portal'
  | 'customer-dashboard'
  | 'customer-portal'
  | 'customer-module-dashboard'
  | 'subcontractor-portal'
  | 'employee-portal'
  | 'vendor-portal'
  | 'employee-module-dashboard'
  | 'subcontractor-module-dashboard'
  
  // Testing & Debug
  | 'sandbox-testing'
  | 'platform-observability'
  
  // Document Management
  | 'document-management'
  | 'documents'
  
  // Dashboard Configuration
  | 'dashboard-management'
  | 'dashboard-layout-editor'
  | 'layout-settings'
  
  // External Viewers
  | 'external-viewer-management'
  
  // Specialized Outputs
  | 'kitchen-outputs'
  
  // Approval Systems
  | 'customer-approval-portal'
  | 'contract-creation'
  | 'contract-approval-portal'
  
  // Asset Management
  | 'asset-management'
  
  // Video Features
  | 'video-integration-example'
  | 'enterprise-video-demo'
  
  // White Label
  | 'white-label-management'
  | 'white-label'
  | 'portal-creation'
  | 'portal-global-settings'
  
  // Onsite Management
  | 'onsite-capture-management'
  
  // Stakeholder Apps
  | 'customer-app'
  | 'subcontractor-app'
  | 'advertiser-app'
  | 'investor-app';

/**
 * Route metadata interface
 * Will be expanded in Phase 2
 */
export interface RouteConfig {
  /** Unique route identifier */
  name: RouteName;
  /** Display name for navigation */
  title: string;
  /** Icon name (lucide-react) */
  icon?: string;
  /** Required permission level */
  requiredRole?: string[];
  /** Parent route for nested navigation */
  parent?: RouteName;
  /** Whether route requires authentication */
  requiresAuth?: boolean;
  /** Route category for grouping */
  category?: RouteCategory;
}

export type RouteCategory =
  | 'dashboard'
  | 'customer-management'
  | 'work-management'
  | 'financial'
  | 'hr'
  | 'design'
  | 'admin'
  | 'portal'
  | 'system';

/**
 * Route registry with metadata
 * Phase 1: Just names and titles
 * Phase 2: Add lazy loading and permissions
 * Phase 3: Migrate to React Router
 */
export const ROUTE_REGISTRY: Record<RouteName, Partial<RouteConfig>> = {
  // Core Dashboards
  'dashboard': { title: 'Dashboard', category: 'dashboard' },
  'admin-dashboard': { title: 'Admin Dashboard', category: 'dashboard' },
  'unified-dashboard': { title: 'Unified Dashboard', category: 'dashboard' },
  
  // Admin
  'admin-alerts-tracking': { title: 'Alerts Tracking', category: 'admin' },
  'admin-alerts': { title: 'Admin Alerts', category: 'admin' },
  'admin-workflow-manager': { title: 'Workflow Manager', category: 'admin' },
  'admin-access-control': { title: 'Access Control', category: 'admin' },
  'control-center': { title: 'Control Center', category: 'admin' },
  
  // Design
  'design-showcase': { title: 'Design Showcase', category: 'design' },
  'design-studio-pro': { title: 'Design Studio Pro', category: 'design' },
  'design-pipelines': { title: 'Design Pipelines', category: 'design' },
  'drawing-settings': { title: 'Drawing Settings', category: 'design' },
  
  // Mobile Apps
  'employee-mobile-app': { title: 'Employee Mobile App', category: 'portal' },
  'mobile-app-feature-manager': { title: 'Feature Manager', category: 'admin' },
  'mobile-portal-hub': { title: 'Mobile Portal Hub', category: 'portal' },
  'portal-builder': { title: 'Portal Builder', category: 'admin' },
  'mobile-app-portal': { title: 'Mobile App Portal', category: 'portal' },
  'companion-app-builder': { title: 'Companion App Builder', category: 'admin' },
  'mobile-app-management': { title: 'App Management', category: 'admin' },
  'mobile-app-hub': { title: 'Mobile App Hub', category: 'portal' },
  
  // Communication
  'messaging': { title: 'Messaging', category: 'dashboard' },
  'messaging-system-test': { title: 'Messaging System Test', category: 'system' },
  'calendar': { title: 'Calendar', category: 'dashboard' },
  'master-schedule': { title: 'Master Schedule', category: 'work-management' },
  'master-scheduling': { title: 'Master Scheduling', category: 'work-management' },
  
  // People
  'employee-management': { title: 'Employee Management', category: 'hr' },
  'customers': { title: 'Customers', category: 'customer-management' },
  'user-management': { title: 'User Management', category: 'admin' },
  
  // Quotes & Contracts
  'quote-creation': { title: 'Quote Creation', category: 'work-management' },
  'quote-workflow': { title: 'Quote Workflow', category: 'work-management' },
  'enterprise-quote-workflow': { title: 'Enterprise Quote Workflow', category: 'work-management' },
  'contract-workflow': { title: 'Contract Workflow', category: 'work-management' },
  'quote-responses': { title: 'Quote Responses', category: 'work-management' },
  'change-orders': { title: 'Change Orders', category: 'work-management' },
  'quote-prep': { title: 'Quote Prep', category: 'work-management' },
  'ai-quote-builder': { title: 'AI Quote Builder', category: 'work-management' },
  
  // Subscriptions
  'subscriptions': { title: 'Subscriptions', category: 'financial' },
  'subscription-hub': { title: 'Subscription Hub', category: 'financial' },
  'subscription-plans': { title: 'Subscription Plans', category: 'financial' },
  'payment-center': { title: 'Payment Center', category: 'financial' },
  'payment-hub': { title: 'Payment Hub', category: 'financial' },
  'payment-notifications': { title: 'Payment Notifications', category: 'financial' },
  'payment-settings': { title: 'Payment Settings', category: 'financial' },
  
  // Work Management
  'work-orders': { title: 'Work Orders', category: 'work-management' },
  'invoices': { title: 'Invoices', category: 'financial' },
  'service-transfers': { title: 'Service Transfers', category: 'work-management' },
  'time-tracking': { title: 'Time Tracking', category: 'work-management' },
  'work-request-tracking': { title: 'Work Request Tracking', category: 'work-management' },
  'work-request-intake': { title: 'Work Request Intake', category: 'work-management' },
  'service-scheduling': { title: 'Service Scheduling', category: 'work-management' },
  
  // Reporting
  'reports': { title: 'Reports', category: 'dashboard' },
  'enterprise-coding-tracking': { title: 'Coding Tracking', category: 'admin' },
  'enterprise-reporting': { title: 'Enterprise Reporting', category: 'dashboard' },
  'transaction-history': { title: 'Transaction History', category: 'financial' },
  
  // Services
  'services': { title: 'Services', category: 'work-management' },
  
  // Subcontractors
  'subcontractor-discounts': { title: 'Subcontractor Discounts', category: 'financial' },
  'subcontractor-plans': { title: 'Subcontractor Plans', category: 'financial' },
  'subcontractor-subscription-plans': { title: 'Subscription Plans', category: 'financial' },
  'subcontractor-subscription-dashboard': { title: 'Subscription Dashboard', category: 'dashboard' },
  'subcontractor-management': { title: 'Subcontractor Management', category: 'customer-management' },
  'subcontractor-enterprise': { title: 'Subcontractor Enterprise', category: 'customer-management' },
  'subcontractor-debug': { title: 'Subcontractor Debug', category: 'system' },
  'all-subcontractors': { title: 'All Subcontractors', category: 'customer-management' },
  'subcontractor-quote-review': { title: 'Quote Review', category: 'work-management' },
  'social-media-manager': { title: 'Social Media Manager', category: 'dashboard' },
  
  // Stakeholders
  'stakeholder-hub': { title: 'Stakeholder Hub', category: 'customer-management' },
  'stakeholders': { title: 'Stakeholders', category: 'customer-management' },
  
  // Workflows
  'workflow-manager': { title: 'Workflow Manager', category: 'admin' },
  'workflow-sentinel': { title: 'Workflow Sentinel', category: 'admin' },
  'workflow-controls': { title: 'Workflow Controls', category: 'admin' },
  'handyman-tech': { title: 'Handyman Tech', category: 'portal' },
  
  // Suppliers
  'supplier-connect': { title: 'Supplier Connect', category: 'customer-management' },
  'supplier-audit': { title: 'Supplier Audit', category: 'customer-management' },
  'vendor-advertising-hub': { title: 'Vendor Advertising Hub', category: 'portal' },
  'vendor-super-portal': { title: 'Vendor Super Portal', category: 'portal' },
  'dropshipper-admin': { title: 'Dropshipper Admin', category: 'admin' },
  
  // Company
  'company-profile': { title: 'Company Profile', category: 'admin' },
  'company-management': { title: 'Company Management', category: 'admin' },
  'announcements': { title: 'Announcements', category: 'dashboard' },
  
  // Content
  'customer-media': { title: 'Customer Media', category: 'customer-management' },
  'reel-ads': { title: 'Reel Ads', category: 'dashboard' },
  'content-center': { title: 'Content Center', category: 'dashboard' },
  'content-automation': { title: 'Content Automation', category: 'admin' },
  'advertising-management': { title: 'Advertising Management', category: 'admin' },
  
  // Security
  'role-management': { title: 'Role Management', category: 'admin' },
  'business-profiles': { title: 'Business Profiles', category: 'admin' },
  
  // Customer Relations
  'customer-reviews': { title: 'Customer Reviews', category: 'customer-management' },
  'referral-rewards': { title: 'Referral Rewards', category: 'customer-management' },
  
  // Promotions
  'promotional-codes': { title: 'Promotional Codes', category: 'financial' },
  
  // Finance & HR
  'payroll': { title: 'Payroll', category: 'hr' },
  'enterprise-hr': { title: 'Enterprise HR', category: 'hr' },
  'hr-configuration-wizard': { title: 'HR Configuration', category: 'hr' },
  
  // System
  'data-backup': { title: 'Data Backup', category: 'system' },
  'enterprise-email': { title: 'Enterprise Email', category: 'system' },
  'domain-management': { title: 'Domain Management', category: 'system' },
  'system-backup-recovery': { title: 'System Backup & Recovery', category: 'system' },
  'server-deployment': { title: 'Server Deployment', category: 'system' },
  'landing-page-editor': { title: 'Landing Page Editor', category: 'system' },
  'website-settings': { title: 'Website Settings', category: 'system' },
  
  // AI & Blockchain
  'ai-diagnostics': { title: 'AI Diagnostics', category: 'system' },
  'blockchain-management': { title: 'Blockchain Management', category: 'system' },
  
  // Theming
  'theme-control-room': { title: 'Theme Control Room', category: 'admin' },
  'theme-manager': { title: 'Theme Manager', category: 'admin' },
  'theme-settings': { title: 'Theme Settings', category: 'admin' },
  
  // CRM
  'crm': { title: 'CRM', category: 'customer-management' },
  'crm-management': { title: 'CRM Management', category: 'customer-management' },
  
  // Materials
  'material-estimating': { title: 'Material Estimating', category: 'work-management' },
  'materials-database': { title: 'Materials Database', category: 'work-management' },
  
  // Modules
  'module-management': { title: 'Module Management', category: 'admin' },
  'module-manager': { title: 'Module Manager', category: 'admin' },
  'module-view-bindings': { title: 'Module View Bindings', category: 'admin' },
  'module-access-control': { title: 'Module Access Control', category: 'admin' },
  
  // Folders
  'personal-folder-system': { title: 'Personal Folder System', category: 'dashboard' },
  
  // Door/Window Tools
  'door-window-measurement': { title: 'Door/Window Measurement', category: 'design' },
  'door-window-scope': { title: 'Door/Window Scope', category: 'design' },
  'door-window-openings': { title: 'Door/Window Openings', category: 'design' },
  
  // CAD
  'electrical-plumbing-design': { title: 'Electrical/Plumbing Design', category: 'design' },
  'cad-system': { title: 'CAD System', category: 'design' },
  'enterprise-cad-studio': { title: 'Enterprise CAD Studio', category: 'design' },
  
  // Portals
  'owners-portal': { title: 'Owners Portal', category: 'portal' },
  'owner-portal': { title: 'Owner Portal', category: 'portal' },
  'bank-portal': { title: 'Bank Portal', category: 'portal' },
  'customer-dashboard': { title: 'Customer Dashboard', category: 'portal' },
  'customer-portal': { title: 'Customer Portal', category: 'portal' },
  'customer-module-dashboard': { title: 'Customer Module Dashboard', category: 'portal' },
  'subcontractor-portal': { title: 'Subcontractor Portal', category: 'portal' },
  'employee-portal': { title: 'Employee Portal', category: 'portal' },
  'vendor-portal': { title: 'Vendor Portal', category: 'portal' },
  'employee-module-dashboard': { title: 'Employee Module Dashboard', category: 'portal' },
  'subcontractor-module-dashboard': { title: 'Subcontractor Module Dashboard', category: 'portal' },
  
  // Testing
  'sandbox-testing': { title: 'Sandbox Testing', category: 'system' },
  'platform-observability': { title: 'Platform Observability', category: 'system' },
  
  // Documents
  'document-management': { title: 'Document Management', category: 'dashboard' },
  'documents': { title: 'Documents', category: 'dashboard' },
  
  // Dashboard Config
  'dashboard-management': { title: 'Dashboard Management', category: 'admin' },
  'dashboard-layout-editor': { title: 'Dashboard Layout Editor', category: 'admin' },
  'layout-settings': { title: 'Layout Settings', category: 'admin' },
  
  // External
  'external-viewer-management': { title: 'External Viewer Management', category: 'admin' },
  
  // Outputs
  'kitchen-outputs': { title: 'Kitchen Outputs', category: 'design' },
  
  // Approvals
  'customer-approval-portal': { title: 'Customer Approval Portal', category: 'portal' },
  'contract-creation': { title: 'Contract Creation', category: 'work-management' },
  'contract-approval-portal': { title: 'Contract Approval Portal', category: 'portal' },
  
  // Assets
  'asset-management': { title: 'Asset Management', category: 'dashboard' },
  
  // Video
  'video-integration-example': { title: 'Video Integration Example', category: 'system' },
  'enterprise-video-demo': { title: 'Enterprise Video Demo', category: 'system' },
  
  // White Label
  'white-label-management': { title: 'White Label Management', category: 'admin' },
  'white-label': { title: 'White Label', category: 'admin' },
  'portal-creation': { title: 'Portal Creation', category: 'admin' },
  'portal-global-settings': { title: 'Portal Global Settings', category: 'admin' },
  
  // Onsite
  'onsite-capture-management': { title: 'Onsite Capture Management', category: 'work-management' },
  
  // Stakeholder Apps
  'customer-app': { title: 'Customer App', category: 'portal' },
  'subcontractor-app': { title: 'Subcontractor App', category: 'portal' },
  'advertiser-app': { title: 'Advertiser App', category: 'portal' },
  'investor-app': { title: 'Investor App', category: 'portal' },
};

/**
 * Helper function to get route title
 */
export function getRouteTitle(route: RouteName): string {
  return ROUTE_REGISTRY[route]?.title || route;
}

/**
 * Helper function to get routes by category
 */
export function getRoutesByCategory(category: RouteCategory): RouteName[] {
  return Object.entries(ROUTE_REGISTRY)
    .filter(([_, config]) => config.category === category)
    .map(([name]) => name as RouteName);
}

/**
 * Helper to validate if a route exists
 */
export function isValidRoute(route: string): route is RouteName {
  return route in ROUTE_REGISTRY;
}