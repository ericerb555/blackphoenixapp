/**
 * nav.ts — Navigation sidebar structure.
 * To add a new page to the nav: add an entry here.
 * App.tsx never needs to change.
 */

export interface NavItem {
  name: string;
  path: string;
  badge?: string;
}

export interface NavSection {
  name: string;
  icon: string; // lucide icon name
  items: NavItem[];
}

export const navigationSections: NavSection[] = [
  {
    name: "Control Center",
    icon: "LayoutDashboard",
    items: [
      { name: "Unified Dashboard", path: "unified-dashboard" },
    ],
  },
  {
    name: "Customers & Contacts",
    icon: "Users",
    items: [
      { name: "Customers", path: "customers" },
    ],
  },
  {
    name: "Projects & Work",
    icon: "Wrench",
    items: [
      { name: "Project Pipeline",      path: "unified-project-pipeline" },
      { name: "Bid Room",              path: "bid-room",              badge: "NEW" },
      { name: "Change Order Camera",   path: "change-order-camera",   badge: "NEW" },
      { name: "Service Scheduling",    path: "service-scheduling" },
      { name: "Waste & Disposal",      path: "waste-disposal-tracking", badge: "NEW" },
      { name: "Weather Monitor",       path: "weather-job-site-monitor", badge: "NEW" },
      { name: "Master Scheduling",     path: "master-scheduling" },
      { name: "PermitAI",              path: "permit-ai",             badge: "NEW" },
      { name: "Unified Calendar",      path: "unified-calendar" },
    ],
  },
  {
    name: "Marketing & Content",
    icon: "TrendingUp",
    items: [
      { name: "🎯 Marketing Command Center", path: "enterprise-content-center?tab=command", badge: "HUB" },
      { name: "📣 Ad Studio",             path: "enterprise-content-center?tab=ad-studio", badge: "NEW" },
      { name: "Content Center",           path: "enterprise-content-center" },
      { name: "Online Store",             path: "dropshipper-admin" },
      { name: "Zendrop",                  path: "zendrop",                badge: "NEW" },
      { name: "Auto-Product Pilot",       path: "auto-product-pilot",     badge: "NEW" },
      { name: "AI Ranking Engine",        path: "ai-ranking-engine",      badge: "NEW" },
      { name: "Social Media Hub",         path: "social-media-hub",       badge: "NEW" },
      { name: "Exit-Intent Popups",       path: "exit-intent",            badge: "NEW" },
      { name: "Live Chat",                path: "live-chat",              badge: "NEW" },
      { name: "Photo Importer",           path: "photo-importer",         badge: "NEW" },
      { name: "Marketing Automation",     path: "marketing-automation",   badge: "NEW" },
      { name: "Retargeting Pixels",       path: "retargeting-pixels",     badge: "NEW" },
      { name: "Blog Manager",             path: "blog-manager",           badge: "NEW" },
      { name: "Reviews & Surveys",        path: "review-surveys",         badge: "NEW" },
      { name: "Influencer & Ambassadors", path: "influencer-tracker",     badge: "NEW" },
      { name: "Keyword Rank Tracker",     path: "keyword-tracker",        badge: "NEW" },
      { name: "Customer Portal",          path: "customer-portal",        badge: "NEW" },
      { name: "AI Blueprint Analyzer",    path: "design/blueprint",       badge: "NEW" },
    ],
  },
  {
    name: "Team & HR",
    icon: "UserCog",
    items: [
      { name: "Employees",       path: "employee-management" },
      { name: "HR Management",   path: "enterprise-hr" },
      { name: "Subcontractors",  path: "subcontractor-enterprise" },
      { name: "Time Tracking",   path: "time-tracking" },
      { name: "Payroll",         path: "payroll" },
    ],
  },
  {
    name: "Financial",
    icon: "DollarSign",
    items: [
      { name: "Quotes & Estimates",   path: "estimates", badge: "NEW" },
      { name: "Invoices",             path: "invoices" },
      { name: "Payments",             path: "unified-payment-center", badge: "NEW" },
      { name: "Company Bank Routing", path: "company-payment-routing", badge: "NEW" },
      { name: "Checkout",             path: "stripe-checkout", badge: "NEW" },
      { name: "Job Financial Tracker", path: "job-financial-tracker" },
    ],
  },
  {
    name: "Operations",
    icon: "Workflow",
    items: [
      { name: "Maintenance Plans",  path: "maintenance-plans",   badge: "NEW" },
      { name: "Materials Center",   path: "materials-center",    badge: "NEW" },
      { name: "Purchase Orders",    path: "purchase-orders",     badge: "NEW" },
      { name: "Product Data Sources", path: "product-data-sources" },
      { name: "Services",           path: "services" },
      { name: "Vendor Management",  path: "vendor-management" },
      { name: "Vendor API Management", path: "vendor-api-management" },
    ],
  },
  {
    name: "Design & Content",
    icon: "Palette",
    items: [
      { name: "Design Center",           path: "design",                  badge: "NEW" },
      { name: "Structural Design",       path: "design/structural",       badge: "NEW" },
      { name: "Enterprise Content Center", path: "enterprise-content-center" },
      { name: "Social Media Manager",    path: "social-media" },
      { name: "Module Manager",          path: "module-manager" },
      { name: "Referral Rewards",        path: "referral-rewards" },
    ],
  },
  {
    name: "Vendors & eCommerce",
    icon: "Store",
    items: [
      { name: "Vendors Admin Hub",   path: "vendors-admin-hub" },
      { name: "Dropshipper Admin",   path: "dropshipper-admin" },
      { name: "Zendrop Integration", path: "zendrop" },
      { name: "Public Store",        path: "public-store" },
      { name: "Order Tracking",      path: "order-tracking",      badge: "Track" },
      { name: "Promotions Manager",  path: "promotions-manager",  badge: "NEW" },
      { name: "Customer App",        path: "customer-app" },
      { name: "Investor App",        path: "investor-app" },
      { name: "Advertiser App",      path: "advertiser-app" },
      { name: "Portal Creation",     path: "portal-creation" },
      { name: "Portal Management",   path: "portal-management" },
    ],
  },
  {
    name: "Communication",
    icon: "MessageSquare",
    items: [
      { name: "Enterprise Email", path: "enterprise-email" },
    ],
  },
  {
    name: "Platform Management",
    icon: "Shield",
    items: [
      { name: "User Management",     path: "user-management-hub" },
      { name: "Role Management",     path: "user-management-hub?tab=roles" },
      { name: "Module Manager",      path: "module-manager" },
      { name: "AI Diagnostics",      path: "ai-diagnostics" },
    ],
  },
  {
    name: "Reports & Analytics",
    icon: "BarChart3",
    items: [
      { name: "Analytics Dashboard",  path: "reports" },
      { name: "Enterprise Reporting", path: "enterprise-reporting" },
    ],
  },
  {
    name: "Growth & Visibility",
    icon: "TrendingUp",
    items: [
      { name: "AI Ranking Engine",  path: "ai-ranking-engine",  badge: "NEW" },
      { name: "Auto-Product Pilot", path: "auto-product-pilot", badge: "NEW" },
    ],
  },
  {
    name: "Rewards & Perks",
    icon: "Gift",
    items: [
      { name: "Rewards & Perks Hub", path: "rewards-perks",              badge: "NEW" },
      { name: "Loyalty",             path: "rewards-perks?tab=loyalty" },
      { name: "Affiliate",           path: "rewards-perks?tab=affiliate" },
      { name: "Referrals",           path: "rewards-perks?tab=referrals" },
      { name: "Gift Cards",          path: "rewards-perks?tab=gift-cards" },
      { name: "Gift Hours",          path: "rewards-perks?tab=gift-hours" },
    ],
  },
];
