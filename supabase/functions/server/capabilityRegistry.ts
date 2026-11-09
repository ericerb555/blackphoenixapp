/**
 * What this application can do, described so Phoenix can find it.
 *
 * WHY IT LIVES HERE AND NOT IN src/
 *
 * The same reason `laborMath.ts` does: an edge function cannot import from
 * `src/` — only `supabase/functions` is uploaded — and both sides need this
 * list. Two hand-kept copies would disagree within a month, and the way you
 * would find out is Phoenix offering a door that is not there.
 *
 * WHAT THIS IS NOT
 *
 * It is not a permission. Nothing here grants access to anything. A
 * capability says "a module called X exists, it is for Y". Whether the person
 * asking may open X is decided where it has always been decided: the route
 * guard in App.tsx, and the auth wall in front of every server route. The
 * `access` field below only controls whether Phoenix *mentions* a module —
 * so it does not recommend the platform-owner screens to an office account —
 * and if it were wrong in the permissive direction the worst outcome is
 * Phoenix naming a page that then refuses to open.
 *
 * That distinction is the whole safety story for this file, so it is worth
 * being blunt: treating this list as an access-control decision, anywhere,
 * would be a security bug.
 *
 * KEEPING IT HONEST
 *
 * `tests/capabilityRegistry.test.ts` fails if any `route` here is not a real
 * key in `src/app/routes.tsx`. Renaming a page without updating this file
 * breaks the build rather than quietly stranding Phoenix.
 */

export type CapabilityArea =
  | 'Money'
  | 'Work'
  | 'Customers'
  | 'Marketing'
  | 'Property'
  | 'People'
  | 'Catalog'
  | 'AI'
  | 'Admin';

/** Who Phoenix should mention this to. Not enforcement — see the header. */
export type CapabilityAccess = 'any' | 'staff' | 'owner';

export interface Capability {
  /** Stable handle the tools use. Does not change when a route is renamed. */
  id: string;
  /** A key in `pageMap` (src/app/routes.tsx). Checked by test. */
  route: string;
  label: string;
  /**
   * What it is FOR, in one line. The model reads this to decide whether this
   * is the module somebody meant, so it describes the job, not the screen.
   */
  purpose: string;
  /** Words an owner might actually say. Search matches these. */
  keywords: string[];
  area: CapabilityArea;
  access: CapabilityAccess;
}

/**
 * Deliberately not all 359 routes. A registry padded with every alias and
 * every landing page makes search worse, not better — the model picks a
 * plausible-sounding wrong door. These are the modules somebody runs the
 * business from. Coverage is reported by the test rather than assumed.
 */
export const CAPABILITIES: Capability[] = [
  /* ── Money ─────────────────────────────────────────────────────────── */
  { id: 'invoices', route: 'invoices', label: 'Invoices', area: 'Money', access: 'staff',
    purpose: 'Raise, send and track invoices, and see which are unpaid or overdue.',
    keywords: ['invoice', 'bill', 'billing', 'unpaid', 'overdue', 'owed', 'receivable'] },
  { id: 'estimates', route: 'estimates', label: 'Estimates', area: 'Money', access: 'staff',
    purpose: 'Estimates and their status — drafted, sent, accepted or gone cold.',
    keywords: ['estimate', 'quote', 'proposal', 'bid', 'outstanding'] },
  { id: 'quote-prep', route: 'quote-prep', label: 'Quote Preparation', area: 'Money', access: 'staff',
    purpose: 'Build a priced quote from labour, materials and margins before it goes out.',
    keywords: ['quote', 'price', 'pricing', 'margin', 'takeoff', 'prepare'] },
  { id: 'quote-to-contract', route: 'quote-to-contract-workflow', label: 'Quote to Contract', area: 'Money', access: 'staff',
    purpose: 'Turn an accepted quote into a signed contract and a scheduled job.',
    keywords: ['contract', 'sign', 'accepted', 'convert', 'workflow'] },
  { id: 'payment-center', route: 'unified-payment-center', label: 'Payment Center', area: 'Money', access: 'staff',
    purpose: 'Payments taken and owed across every channel, in one place.',
    keywords: ['payment', 'paid', 'card', 'deposit', 'collect', 'money in'] },
  { id: 'stripe-connect', route: 'stripe-connect', label: 'Stripe Connect', area: 'Money', access: 'owner',
    purpose: 'Connected Stripe accounts and payout routing for each company.',
    keywords: ['stripe', 'payout', 'connect', 'bank', 'merchant'] },
  { id: 'bank-accounts', route: 'bank-accounts', label: 'Bank Accounts', area: 'Money', access: 'owner',
    purpose: 'Bank accounts money is settled into.',
    keywords: ['bank', 'account', 'settlement', 'deposit'] },
  { id: 'financial-reconciliation', route: 'financial-reconciliation', label: 'Reconciliation', area: 'Money', access: 'owner',
    purpose: 'Match payments received against invoices raised and find the gaps.',
    keywords: ['reconcile', 'reconciliation', 'match', 'discrepancy', 'books'] },
  { id: 'revenue-analytics', route: 'revenue-analytics', label: 'Revenue Analytics', area: 'Money', access: 'staff',
    purpose: 'Revenue over time, by service, company and channel.',
    keywords: ['revenue', 'sales', 'income', 'turnover', 'trend', 'growth'] },
  { id: 'purchase-orders', route: 'purchase-orders', label: 'Purchase Orders', area: 'Money', access: 'staff',
    purpose: 'Orders placed with suppliers and what they cost.',
    keywords: ['purchase order', 'po', 'supplier', 'procurement', 'buy'] },
  { id: 'payroll', route: 'payroll', label: 'Payroll', area: 'Money', access: 'owner',
    purpose: 'What crew are paid, and the hours behind it.',
    keywords: ['payroll', 'wages', 'pay', 'salary', 'crew cost'] },
  { id: 'refunds', route: 'refunds', label: 'Refunds', area: 'Money', access: 'staff',
    purpose: 'Refunds requested and issued.',
    keywords: ['refund', 'money back', 'chargeback', 'credit'] },
  { id: 'subscriptions', route: 'subscriptions', label: 'Subscriptions', area: 'Money', access: 'staff',
    purpose: 'Recurring plans, who is on them and what they bill.',
    keywords: ['subscription', 'recurring', 'plan', 'mrr', 'membership'] },
  { id: 'subscription-hub', route: 'subscription-hub', label: 'Subscription Hub', area: 'Money', access: 'owner',
    purpose: 'Configure the subscription products and tiers the business sells.',
    keywords: ['subscription', 'tier', 'plan', 'configure', 'pricing'] },
  { id: 'maintenance-plans', route: 'maintenance-plans', label: 'Maintenance Plans', area: 'Money', access: 'staff',
    purpose: 'Maintenance subscriptions, their coverage and renewal dates.',
    keywords: ['maintenance', 'plan', 'service contract', 'renewal', 'recurring'] },

  /* ── Work ──────────────────────────────────────────────────────────── */
  { id: 'projects', route: 'projects', label: 'Projects', area: 'Work', access: 'staff',
    purpose: 'Live jobs, their stage, and who is on them.',
    keywords: ['project', 'job', 'build', 'site', 'active work'] },
  { id: 'project-pipeline', route: 'unified-project-pipeline', label: 'Project Pipeline', area: 'Work', access: 'staff',
    purpose: 'Every job as a pipeline stage, from enquiry to completion.',
    keywords: ['pipeline', 'stage', 'funnel', 'progress', 'kanban'] },
  { id: 'work-requests', route: 'work-request-hub', label: 'Work Requests', area: 'Work', access: 'staff',
    purpose: 'Incoming work requests waiting to be triaged, quoted or scheduled.',
    keywords: ['work request', 'request', 'enquiry', 'inbound', 'triage', 'new job'] },
  { id: 'work-order-management', route: 'work-order-management', label: 'Work Orders', area: 'Work', access: 'staff',
    purpose: 'Work orders issued to crew and subcontractors, and their status.',
    keywords: ['work order', 'dispatch', 'assign', 'crew'] },
  { id: 'scheduling', route: 'master-scheduling', label: 'Scheduling', area: 'Work', access: 'staff',
    purpose: 'The master schedule — who is where, on what day.',
    keywords: ['schedule', 'calendar', 'booking', 'diary', 'dispatch', 'availability'] },
  { id: 'calendar', route: 'unified-calendar', label: 'Calendar', area: 'Work', access: 'staff',
    purpose: 'Appointments, site visits and job dates in one calendar.',
    keywords: ['calendar', 'appointment', 'visit', 'date', 'diary'] },
  { id: 'job-tracking', route: 'job-tracking-hub', label: 'Job Tracking', area: 'Work', access: 'staff',
    purpose: 'Progress, photos and updates from jobs underway.',
    keywords: ['tracking', 'progress', 'update', 'status', 'site'] },
  { id: 'job-financials', route: 'job-financial-tracker', label: 'Job Financials', area: 'Work', access: 'staff',
    purpose: 'Cost against budget for each job, and where margin is going.',
    keywords: ['job cost', 'budget', 'margin', 'profit', 'overrun', 'variance'] },
  { id: 'time-tracking', route: 'time-tracking', label: 'Time Tracking', area: 'Work', access: 'staff',
    purpose: 'Hours logged by crew against jobs.',
    keywords: ['time', 'hours', 'clock', 'timesheet', 'labour'] },
  { id: 'change-orders', route: 'change-order-approval', label: 'Change Orders', area: 'Work', access: 'staff',
    purpose: 'Changes to agreed scope, and whether the customer has approved them.',
    keywords: ['change order', 'variation', 'extra', 'scope change', 'approval'] },
  { id: 'permits', route: 'permit-tracker', label: 'Permits', area: 'Work', access: 'staff',
    purpose: 'Permits applied for, granted or holding a job up.',
    keywords: ['permit', 'licence', 'council', 'approval', 'inspection'] },
  { id: 'materials', route: 'materials-hub', label: 'Materials', area: 'Work', access: 'staff',
    purpose: 'Materials needed, ordered and on site.',
    keywords: ['material', 'supply', 'stock', 'order', 'delivery'] },
  { id: 'material-estimating', route: 'materials-estimating-hub', label: 'Material Estimating', area: 'Work', access: 'staff',
    purpose: 'Work out material quantities and cost for a job from measurements.',
    keywords: ['estimate', 'takeoff', 'quantity', 'measure', 'material cost'] },
  { id: 'completion-reports', route: 'completion-reports', label: 'Completion Reports', area: 'Work', access: 'staff',
    purpose: 'Sign-off reports for finished work.',
    keywords: ['completion', 'sign off', 'handover', 'finished', 'report'] },
  { id: 'weather-monitor', route: 'weather-job-site-monitor', label: 'Site Weather', area: 'Work', access: 'staff',
    purpose: 'Weather against scheduled outdoor work, to spot days that will be lost.',
    keywords: ['weather', 'rain', 'forecast', 'delay', 'site'] },
  { id: 'waste-disposal', route: 'waste-disposal-tracking', label: 'Waste Disposal', area: 'Work', access: 'staff',
    purpose: 'Skips, tips and disposal cost per job.',
    keywords: ['waste', 'skip', 'disposal', 'rubbish', 'tip'] },

  /* ── Customers ─────────────────────────────────────────────────────── */
  { id: 'customers', route: 'customers', label: 'Customers', area: 'Customers', access: 'staff',
    purpose: 'Customer records, their history and their jobs.',
    keywords: ['customer', 'client', 'account', 'contact', 'who'] },
  { id: 'crm', route: 'unified-crm', label: 'CRM', area: 'Customers', access: 'staff',
    purpose: 'Every contact and the state of the relationship with them.',
    keywords: ['crm', 'contact', 'relationship', 'follow up', 'pipeline'] },
  { id: 'leads', route: 'lead-crm', label: 'Leads', area: 'Customers', access: 'staff',
    purpose: 'New enquiries that have not become customers yet, and who is chasing them.',
    keywords: ['lead', 'enquiry', 'prospect', 'chase', 'follow up', 'new'] },
  { id: 'messages', route: 'messages', label: 'Messages', area: 'Customers', access: 'staff',
    purpose: 'Conversations with customers across email, SMS and chat.',
    keywords: ['message', 'email', 'sms', 'chat', 'reply', 'inbox'] },
  { id: 'live-chat', route: 'live-chat-manager', label: 'Live Chat', area: 'Customers', access: 'staff',
    purpose: 'Chat conversations happening on the website right now.',
    keywords: ['chat', 'live', 'website', 'visitor', 'support'] },
  { id: 'reviews', route: 'reviews', label: 'Reviews', area: 'Customers', access: 'staff',
    purpose: 'Reviews customers left, and ones that need a reply.',
    keywords: ['review', 'rating', 'feedback', 'star', 'reputation'] },
  { id: 'review-surveys', route: 'review-surveys', label: 'Review Surveys', area: 'Customers', access: 'staff',
    purpose: 'Surveys sent after a job to ask how it went.',
    keywords: ['survey', 'feedback', 'nps', 'satisfaction', 'after'] },
  { id: 'customer-docs', route: 'customer-documents', label: 'Customer Documents', area: 'Customers', access: 'staff',
    purpose: 'Documents shared with a customer — contracts, certificates, photos.',
    keywords: ['document', 'file', 'contract', 'certificate', 'paperwork'] },

  /* ── Marketing ─────────────────────────────────────────────────────── */
  { id: 'marketing-command', route: 'marketing-command', label: 'Marketing Command', area: 'Marketing', access: 'staff',
    purpose: 'The marketing overview — campaigns running and what they are returning.',
    keywords: ['marketing', 'campaign', 'advertising', 'promotion', 'overview'] },
  { id: 'campaigns', route: 'autopilot-campaigns', label: 'Autopilot Campaigns', area: 'Marketing', access: 'staff',
    purpose: 'Campaigns that run themselves on a schedule, and their performance.',
    keywords: ['campaign', 'autopilot', 'automated', 'schedule', 'drip'] },
  { id: 'social-media', route: 'social-media-hub', label: 'Social Media', area: 'Marketing', access: 'staff',
    purpose: 'Social posts drafted, scheduled and published.',
    keywords: ['social', 'facebook', 'instagram', 'post', 'content'] },
  { id: 'email-marketing', route: 'enterprise-email', label: 'Email Marketing', area: 'Marketing', access: 'staff',
    purpose: 'Email campaigns, lists and what they opened.',
    keywords: ['email', 'newsletter', 'blast', 'list', 'open rate'] },
  { id: 'sms-marketing', route: 'sms-marketing', label: 'SMS Marketing', area: 'Marketing', access: 'staff',
    purpose: 'Text campaigns and the numbers they reach.',
    keywords: ['sms', 'text', 'message', 'campaign', 'mobile'] },
  { id: 'content-center', route: 'enterprise-content-center', label: 'Content Center', area: 'Marketing', access: 'staff',
    purpose: 'Written and visual content for the site and campaigns, with approval state.',
    keywords: ['content', 'copy', 'blog', 'article', 'asset', 'approve'] },
  { id: 'video-studio', route: 'video-studio', label: 'Video Studio', area: 'Marketing', access: 'staff',
    purpose: 'Video and reels made from job photos, and their approval state.',
    keywords: ['video', 'reel', 'clip', 'studio', 'footage'] },
  { id: 'ad-studio', route: 'ad-studio', label: 'Ad Studio', area: 'Marketing', access: 'staff',
    purpose: 'Build and run paid adverts.',
    keywords: ['ad', 'advert', 'paid', 'ppc', 'creative'] },
  { id: 'seo', route: 'ai-seo-engine', label: 'SEO Engine', area: 'Marketing', access: 'staff',
    purpose: 'Search rankings, keywords and the pages built to win them.',
    keywords: ['seo', 'search', 'ranking', 'keyword', 'google', 'traffic'] },
  { id: 'promotions', route: 'promotions-manager', label: 'Promotions', area: 'Marketing', access: 'staff',
    purpose: 'Discounts and offers currently running.',
    keywords: ['promotion', 'offer', 'discount', 'deal', 'sale'] },
  { id: 'coupons', route: 'coupon-manager', label: 'Coupons', area: 'Marketing', access: 'staff',
    purpose: 'Coupon codes, their rules and redemption.',
    keywords: ['coupon', 'code', 'voucher', 'discount', 'redeem'] },
  { id: 'referrals', route: 'referral-rewards', label: 'Referrals', area: 'Marketing', access: 'staff',
    purpose: 'Customers referring others, and the rewards owed for it.',
    keywords: ['referral', 'refer', 'reward', 'word of mouth', 'affiliate'] },
  { id: 'loyalty', route: 'rewards-hub', label: 'Loyalty & Rewards', area: 'Marketing', access: 'staff',
    purpose: 'Points, perks and repeat-customer rewards.',
    keywords: ['loyalty', 'reward', 'points', 'perk', 'repeat'] },
  { id: 'cart-recovery', route: 'cart-recovery', label: 'Cart Recovery', area: 'Marketing', access: 'staff',
    purpose: 'Checkouts people abandoned, and the follow-up to win them back.',
    keywords: ['cart', 'abandoned', 'recovery', 'checkout', 'lost'] },

  /* ── Property ──────────────────────────────────────────────────────── */
  { id: 'property-management', route: 'property-management-hub', label: 'Property Management', area: 'Property', access: 'staff',
    purpose: 'Managed buildings, their units and the work they need.',
    keywords: ['property', 'building', 'unit', 'manage', 'portfolio'] },
  { id: 'landlord-portal', route: 'landlord-portal', label: 'Landlord Portal', area: 'Property', access: 'any',
    purpose: 'What a landlord sees — their buildings, work and statements.',
    keywords: ['landlord', 'owner', 'portal', 'building'] },
  { id: 'tenant-portal', route: 'tenant-portal', label: 'Tenant Portal', area: 'Property', access: 'any',
    purpose: 'What a tenant sees — report a problem, track the fix.',
    keywords: ['tenant', 'renter', 'portal', 'repair', 'report'] },
  { id: 'property-revenue', route: 'property-revenue-intel', label: 'Property Revenue', area: 'Property', access: 'staff',
    purpose: 'What each managed property earns and costs.',
    keywords: ['property', 'revenue', 'yield', 'income', 'performance'] },

  /* ── People ────────────────────────────────────────────────────────── */
  { id: 'employees', route: 'employee-management', label: 'Employees', area: 'People', access: 'staff',
    purpose: 'Staff records, roles and availability.',
    keywords: ['employee', 'staff', 'team', 'worker', 'crew'] },
  { id: 'hr', route: 'enterprise-hr', label: 'HR', area: 'People', access: 'owner',
    purpose: 'Hiring, onboarding, documents and HR admin.',
    keywords: ['hr', 'hiring', 'onboarding', 'holiday', 'personnel'] },
  { id: 'subcontractors', route: 'subcontractor-enterprise', label: 'Subcontractors', area: 'People', access: 'staff',
    purpose: 'Subcontractors, their trades, insurance and the work given to them.',
    keywords: ['subcontractor', 'sub', 'trade', 'contractor', 'insurance'] },
  { id: 'vendors', route: 'vendor-management', label: 'Vendors', area: 'People', access: 'staff',
    purpose: 'Suppliers and vendors, their terms and their performance.',
    keywords: ['vendor', 'supplier', 'merchant', 'terms'] },
  { id: 'bid-room', route: 'bid-room', label: 'Bid Room', area: 'People', access: 'staff',
    purpose: 'Work put out to subcontractors for bids, and the bids back.',
    keywords: ['bid', 'tender', 'quote', 'subcontractor', 'compare'] },

  /* ── Catalog ───────────────────────────────────────────────────────── */
  { id: 'product-catalog', route: 'product-catalog', label: 'Product Catalog', area: 'Catalog', access: 'staff',
    purpose: 'Products and services offered, with their pricing.',
    keywords: ['product', 'catalog', 'service', 'sku', 'offering'] },
  { id: 'catalog-pricing', route: 'catalog-pricing', label: 'Catalog Pricing', area: 'Catalog', access: 'owner',
    purpose: 'The prices and margins behind the catalog.',
    keywords: ['price', 'pricing', 'margin', 'markup', 'cost'] },
  { id: 'labor-rates', route: 'labor-rates-config', label: 'Labour Rates', area: 'Catalog', access: 'owner',
    purpose: 'Hourly rates by trade that quotes are built from.',
    keywords: ['labour', 'labor', 'rate', 'hourly', 'cost', 'trade'] },
  { id: 'materials-database', route: 'materials-database', label: 'Materials Database', area: 'Catalog', access: 'staff',
    purpose: 'Material prices and specifications used in estimating.',
    keywords: ['material', 'price', 'database', 'spec', 'supplier'] },
  { id: 'orders', route: 'order-manager', label: 'Orders', area: 'Catalog', access: 'staff',
    purpose: 'Store orders placed and their fulfilment.',
    keywords: ['order', 'purchase', 'fulfil', 'shipping', 'store'] },
  { id: 'store', route: 'public-store', label: 'Online Store', area: 'Catalog', access: 'staff',
    purpose: 'The storefront customers buy from.',
    keywords: ['store', 'shop', 'ecommerce', 'storefront', 'buy'] },

  /* ── AI ────────────────────────────────────────────────────────────── */
  { id: 'ai-diagnostics', route: 'ai-diagnostics', label: 'AI Diagnostics', area: 'AI', access: 'staff',
    purpose: 'What the AI has been doing, what it cost, and the emergency stop.',
    keywords: ['ai', 'diagnostic', 'cost', 'spend', 'stop', 'kill switch', 'activity'] },
  { id: 'phoenix', route: 'phoenix-ai', label: 'Phoenix', area: 'AI', access: 'staff',
    purpose: 'This command center — ask about the business and approve what Phoenix proposes.',
    keywords: ['phoenix', 'ai', 'assistant', 'chat', 'command center'] },
  { id: 'property-ai', route: 'property-ai-studio', label: 'Property AI', area: 'AI', access: 'staff',
    purpose: 'AI analysis of properties from imagery and records.',
    keywords: ['property', 'ai', 'analysis', 'imagery', 'survey'] },
  { id: 'blueprint-analysis', route: 'blueprint-analyzer', label: 'Blueprint Analyzer', area: 'AI', access: 'staff',
    purpose: 'Read uploaded blueprints and pull measurements and quantities out of them.',
    keywords: ['blueprint', 'plan', 'drawing', 'measure', 'takeoff', 'analyse'] },

  /* ── Admin ─────────────────────────────────────────────────────────── */
  { id: 'owners-dashboard', route: 'owners-dashboard', label: "Owner's Control Center", area: 'Admin', access: 'owner',
    purpose: 'The owner overview — every business, every number, every control.',
    keywords: ['owner', 'dashboard', 'control center', 'overview', 'home'] },
  { id: 'unified-dashboard', route: 'unified-dashboard', label: 'Dashboard', area: 'Admin', access: 'staff',
    purpose: 'The day-to-day dashboard most staff start from.',
    keywords: ['dashboard', 'home', 'overview', 'today'] },
  { id: 'business-analytics', route: 'business-analytics', label: 'Business Analytics', area: 'Admin', access: 'staff',
    purpose: 'How the business is performing across jobs, money and customers.',
    keywords: ['analytics', 'performance', 'metric', 'kpi', 'report', 'how are we doing'] },
  { id: 'reports', route: 'enterprise-reporting', label: 'Reports', area: 'Admin', access: 'staff',
    purpose: 'Build and export reports across the business.',
    keywords: ['report', 'export', 'summary', 'statement'] },
  { id: 'alerts', route: 'admin-alerts', label: 'Alerts', area: 'Admin', access: 'staff',
    purpose: 'Things the system flagged that want a human.',
    keywords: ['alert', 'warning', 'attention', 'flag', 'issue', 'problem'] },
  { id: 'user-management', route: 'user-management-hub', label: 'Users', area: 'Admin', access: 'owner',
    purpose: 'Accounts, who they are and what they may reach.',
    keywords: ['user', 'account', 'access', 'permission', 'role', 'login'] },
  { id: 'role-management', route: 'role-management', label: 'Roles', area: 'Admin', access: 'owner',
    purpose: 'Roles and the permissions attached to them.',
    keywords: ['role', 'permission', 'access', 'authority'] },
  { id: 'module-manager', route: 'module-manager', label: 'Modules', area: 'Admin', access: 'owner',
    purpose: 'Which modules each company has switched on.',
    keywords: ['module', 'feature', 'enable', 'toggle', 'entitlement'] },
  { id: 'company-setup', route: 'company-setup', label: 'Company Setup', area: 'Admin', access: 'owner',
    purpose: 'Create and configure a business on the platform.',
    keywords: ['company', 'business', 'setup', 'create', 'configure', 'new'] },
  { id: 'master-admin', route: 'master-admin-dashboard', label: 'Master Admin', area: 'Admin', access: 'owner',
    purpose: 'Platform-wide control across every company on it.',
    keywords: ['master', 'platform', 'god mode', 'admin', 'all companies'] },
  { id: 'cohort-management', route: 'cohort-management', label: 'Cohorts', area: 'Admin', access: 'owner',
    purpose: 'Groups of companies managed and measured together.',
    keywords: ['cohort', 'group', 'segment', 'batch'] },
  { id: 'portals-hub', route: 'portals-hub', label: 'Portals', area: 'Admin', access: 'owner',
    purpose: 'The customer, vendor and partner portals, and who can reach them.',
    keywords: ['portal', 'access', 'customer portal', 'vendor portal', 'invite'] },
  { id: 'settings', route: 'settings', label: 'Settings', area: 'Admin', access: 'staff',
    purpose: 'Company details, branding, notifications and how the application behaves.',
    keywords: ['setting', 'configure', 'preference', 'option', 'branding', 'notification'] },
];

/* ── lookup ──────────────────────────────────────────────────────────── */

export const CAPABILITY_IDS: readonly string[] = CAPABILITIES.map((c) => c.id);

export function capabilityById(id: unknown): Capability | undefined {
  if (typeof id !== 'string' || !id) return undefined;
  return CAPABILITIES.find((c) => c.id === id);
}

/**
 * Rank order, not alphabetical.
 *
 * `access` is 'any' | 'staff' | 'owner'; an owner sees everything, staff see
 * everything bar owner-only, and anyone else sees only 'any'. Again: this
 * chooses what gets *mentioned*. The route guard decides what opens.
 */
export function visibleTo(role: { isStaff?: boolean; isOwner?: boolean } | null | undefined): Capability[] {
  const owner = !!role?.isOwner;
  const staff = owner || !!role?.isStaff;
  return CAPABILITIES.filter((c) => {
    if (c.access === 'owner') return owner;
    if (c.access === 'staff') return staff;
    return true;
  });
}

/**
 * Deliberately crude scoring, and deliberately local.
 *
 * Running this in the edge function instead of asking the model to pick from
 * a 90-entry list keeps the list out of the prompt on every turn. An exact
 * id or label match wins outright; after that a keyword hit beats a mention
 * buried in the purpose text, because keywords are the words somebody says
 * out loud and the purpose is prose written for a different job.
 */
export function searchCapabilities(
  query: unknown,
  role?: { isStaff?: boolean; isOwner?: boolean } | null,
  limit = 8,
): Capability[] {
  const q = String(query ?? '').toLowerCase().trim();
  const pool = visibleTo(role);
  if (!q) return pool.slice(0, limit);

  // Words, not the raw string: "show me the invoices" should find Invoices.
  const words = q.split(/[^a-z0-9]+/).filter((w) => w.length > 2);

  const scored = pool.map((c) => {
    const label = c.label.toLowerCase();
    const purpose = c.purpose.toLowerCase();
    let score = 0;

    if (c.id === q || label === q) score += 100;
    if (label.includes(q)) score += 40;
    if (c.keywords.some((k) => k === q)) score += 40;

    for (const w of words) {
      if (c.id.includes(w)) score += 12;
      if (label.includes(w)) score += 10;
      if (c.keywords.some((k) => k.includes(w) || w.includes(k))) score += 8;
      if (purpose.includes(w)) score += 3;
      if (c.area.toLowerCase() === w) score += 5;
    }
    return { c, score };
  });

  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score || a.c.label.localeCompare(b.c.label))
    .slice(0, Math.max(1, Math.min(25, limit)))
    .map((s) => s.c);
}

/** What the model is given. `route` is withheld — see openDirective. */
export function publicCapability(c: Capability) {
  return { id: c.id, label: c.label, purpose: c.purpose, area: c.area };
}

/**
 * The directive the browser acts on.
 *
 * It carries the id, and the route is resolved here rather than being taken
 * from the model. A model that could name its own route could send somebody
 * to any page in the application by inventing a string; this way the only
 * reachable routes are the ones written in the list above.
 */
export function openDirective(id: unknown): { id: string; route: string; label: string } | null {
  const c = capabilityById(id);
  if (!c) return null;
  return { id: c.id, route: c.route, label: c.label };
}
