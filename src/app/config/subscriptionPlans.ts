/**
 * Subscription Plans Configuration
 *
 * SINGLE SOURCE OF TRUTH for all subscription plans across the platform
 * Used in: Cohort Management, Landing Page, Application Forms, Checkout
 *
 * First 12 Subscribers Benefits:
 * - Half price pressure washing
 * - 15% off Black Phoenix Services for life
 * - Founding Subscriber badge
 *
 * Premium Plan Special Benefits:
 * - 20% off for lifetime with continued subscription
 * - After 5 straight years of Premium plan, customers can downgrade to lower plan
 *   and keep lifetime 20% discount as long as they don't cancel at anytime
 *
 * Default Limits (per territory, configurable):
 * - 3 subcontractors per trade
 * - 10 total vendors
 * - 5 total advertisers
 */

export type PlanCategory =
  | 'customer'
  | 'construction'
  | 'demolition'
  | 'property-management'
  | 'vendor'
  | 'subcontractor'
  | 'advertiser'
  | 'investor'
  | 'territory-owner';

/** Maps a plan category to the portal type it provisions (used by invites/onboarding). */
export const CATEGORY_TO_PORTAL: Record<PlanCategory, string> = {
  customer: 'customer',
  construction: 'customer',
  demolition: 'customer',
  'property-management': 'property_manager',
  vendor: 'vendor',
  subcontractor: 'subcontractor',
  advertiser: 'advertiser',
  investor: 'investor',
  'territory-owner': 'territory_owner',
};

export interface SubscriptionPlan {
  id: string;
  category: PlanCategory;
  /** The portal this plan unlocks. Defaults from CATEGORY_TO_PORTAL when omitted. */
  portalType?: string;
  tier: 'starter' | 'professional' | 'enterprise';
  name: string;
  tagline: string;
  regularPrice: number;
  foundingPrice: number; // 30% off regular price
  features: string[];
  /**
   * Portal-specific add-on options a subscriber can toggle onto this plan —
   * the things that portal actually uses. Populated per category by default.
   */
  portalOptions?: string[];
  /**
   * When true (default for every plan), the subscriber can request any custom
   * service or feature we don't offer yet and we'll build it into their plan.
   */
  allowCustomRequest?: boolean;
  limits: {
    projects?: number;
    quotes?: number;
    leads?: number;
    storage?: string;
    support?: string;
    apiCalls?: number;
    teamMembers?: number;
    impressions?: number;
    campaigns?: number;
    monthlyHours?: number;
    monthlyTrips?: number;
    /**
     * Maximum number of tenant sub-portals a landlord/property-management plan
     * may provision. Tier 1 (Landlord) = 25, Tier 2 (Condo Manager) = 50,
     * Tier 3 (Property Manager) = 100.
     */
    tenantSubPortals?: number;
  };
  highlighted?: boolean;
  popular?: boolean;
}

export const FOUNDING_SUBSCRIBER_CONFIG = {
  firstSubscribers: 12,
  benefits: {
    pressureWashingDiscount: 0.50, // Half price
    servicesDiscount: 0.15, // 15% off Black Phoenix Services for life
  },
  premiumPlanDiscount: 0.20, // 20% off for lifetime with continued subscription
  premiumDowngradeYears: 5, // After 5 years, can downgrade and keep 20% discount
  defaultLimits: {
    subcontractorsPerTrade: 3,
    totalVendors: 10,
    totalAdvertisers: 5,
  },
} as const;

// CUSTOMER MAINTENANCE PLANS
export const CUSTOMER_PLANS: SubscriptionPlan[] = [
  {
    id: 'customer-basic',
    category: 'customer',
    tier: 'starter',
    name: 'Basic Maintenance Plan',
    tagline: 'Perfect for homeowners',
    regularPrice: 149,
    foundingPrice: 149,
    popular: true,
    features: [
      '4 hours/month of handyman services',
      'Priority scheduling',
      'Email & phone support',
      'Service history tracking',
      'Seasonal maintenance reminders',
      '💰 5% off all contract jobs & quotes',
      'Discounted materials (10% off)',
      'Annual service report',
      '🤖 PropertyAI: Home health check & seasonal planning tools',
      '📚 Knowledge Center: NH homeowner guides & Eversource rebate info',
      '🛒 Marketplace: First-Time Homeowner Guide + Annual Maintenance Planner included',
      '🎁 First 12 Subscribers: Half price pressure washing',
      '🎁 First 12 Subscribers: 15% off Black Phoenix Services for life',
    ],
    limits: {
      monthlyHours: 4,
      projects: 10,
      storage: '1 GB',
      support: 'Email & Phone (48hr response)',
    },
  },
  {
    id: 'customer-standard',
    category: 'customer',
    tier: 'professional',
    name: 'Standard Maintenance Plan',
    tagline: 'For growing home needs',
    regularPrice: 299,
    foundingPrice: 299,
    features: [
      '8 hours/month of handyman services',
      'Priority scheduling (24hr guarantee)',
      'Dedicated account manager',
      'Advanced project tracking',
      'Seasonal maintenance included',
      '💰 10% off all contract jobs & quotes',
      'Discounted materials (15% off)',
      'Free emergency call-outs (2/year)',
      'Photo documentation & reports',
      '🤖 PropertyAI: Property health report + ROI analyzer',
      '📚 Knowledge Center: NH home improvement guides & contractor vetting tips',
      '🛒 Marketplace: DIY Repair Encyclopedia + Property ROI Calculator included',
      '🎁 First 12 Subscribers: Half price pressure washing',
      '🎁 First 12 Subscribers: 15% off Black Phoenix Services for life',
    ],
    limits: {
      monthlyHours: 8,
      projects: 25,
      storage: '5 GB',
      support: 'Email & Phone (24hr response)',
    },
  },
  {
    id: 'customer-premium',
    category: 'customer',
    tier: 'enterprise',
    name: 'Premium Maintenance Plan',
    tagline: 'For property portfolios',
    regularPrice: 439,
    foundingPrice: 439,
    highlighted: true,
    features: [
      '8 hours/month of handyman services',
      'Same-day scheduling guarantee',
      'Dedicated property manager',
      'Multi-property management',
      'Comprehensive preventive maintenance',
      '💰 15% off all contract jobs & quotes',
      'Discounted materials (20% off)',
      'Unlimited emergency call-outs',
      '24/7 priority support',
      'Quarterly property inspections',
      'Custom project planning',
      '🤖 PropertyAI Enterprise: Full suite — all 5 phases',
      '📚 Knowledge Center: Complete NH library + capital planning guides',
      '🛒 Marketplace: Landlord Starter Bundle ($89 value) included',
      '⭐ 20% off for lifetime with continued subscription',
      '⭐ After 5 years: Downgrade to any plan and keep 20% discount forever',
      '🎁 First 12 Subscribers: Half price pressure washing',
      '🎁 First 12 Subscribers: 15% off Black Phoenix Services for life',
    ],
    limits: {
      monthlyHours: 8,
      projects: 999999,
      storage: 'Unlimited',
      support: '24/7 Phone & Priority',
    },
  },
];

// CONSTRUCTION PLANS
export const CONSTRUCTION_PLANS: SubscriptionPlan[] = [
  {
    id: 'construction-basic',
    category: 'construction',
    tier: 'starter',
    name: 'Basic Build Plan',
    tagline: 'Perfect for small projects',
    regularPrice: 999,
    foundingPrice: 999,
    features: [
      '10 build hours/month',
      'Project management & scheduling',
      'Material sourcing assistance',
      'Licensed & insured contractors',
      'Progress photo documentation',
      'Email & phone support',
      'Standard timeline delivery',
      '🎁 First 12 Subscribers: Half price pressure washing',
      '🎁 First 12 Subscribers: 15% off Black Phoenix Services for life',
    ],
    limits: {
      monthlyHours: 10,
      projects: 5,
      storage: '10 GB',
      support: 'Email & Phone (48hr response)',
      teamMembers: 2,
    },
  },
  {
    id: 'construction-pro',
    category: 'construction',
    tier: 'professional',
    name: 'Pro Build Plan',
    tagline: 'For growing construction needs',
    regularPrice: 2199,
    foundingPrice: 2199,
    popular: true,
    features: [
      '25 build hours/month',
      'Priority project scheduling',
      'Dedicated project manager',
      'Full material procurement',
      'Advanced 3D rendering',
      'Permit assistance included',
      'Weekly progress reports',
      'Video documentation',
      '🎁 First 12 Subscribers: Half price pressure washing',
      '🎁 First 12 Subscribers: 15% off Black Phoenix Services for life',
    ],
    limits: {
      monthlyHours: 25,
      projects: 15,
      storage: '50 GB',
      support: 'Email & Phone (24hr response)',
      teamMembers: 5,
    },
  },
  {
    id: 'construction-enterprise',
    category: 'construction',
    tier: 'enterprise',
    name: 'Enterprise Build Plan',
    tagline: 'For large-scale construction',
    regularPrice: 3999,
    foundingPrice: 3999,
    highlighted: true,
    features: [
      '50 build hours/month',
      'Same-day project initiation',
      'Dedicated construction team',
      'Comprehensive material management',
      'Architectural design services',
      'Full permit & inspection handling',
      'Daily progress updates',
      '24/7 project monitoring',
      'Custom project planning',
      'Quality guarantee & warranty',
      '⭐ 20% off for lifetime with continued subscription',
      '⭐ After 5 years: Downgrade to any plan and keep 20% discount forever',
      '🎁 First 12 Subscribers: Half price pressure washing',
      '🎁 First 12 Subscribers: 15% off Black Phoenix Services for life',
    ],
    limits: {
      monthlyHours: 50,
      projects: 999999,
      storage: 'Unlimited',
      support: '24/7 Phone & Priority',
      teamMembers: 999999,
    },
  },
];

// DEMOLITION & TRASH REMOVAL PLANS
export const DEMOLITION_PLANS: SubscriptionPlan[] = [
  {
    id: 'demolition-basic',
    category: 'demolition',
    tier: 'starter',
    name: 'Basic Trash Removal',
    tagline: 'Perfect for residential needs',
    regularPrice: 199,
    foundingPrice: 199,
    features: [
      '4 removal trips/month',
      '15% off all demolition quotes',
      'Priority scheduling',
      'Same-day service available',
      'Eco-friendly disposal',
      'Free estimates',
      'Recycling services included',
      '🎁 First 12 Subscribers: Half price pressure washing',
      '🎁 First 12 Subscribers: 15% off Black Phoenix Services for life',
    ],
    limits: {
      monthlyTrips: 4,
      projects: 10,
      storage: '1 GB',
      support: 'Email & Phone (48hr response)',
    },
  },
  {
    id: 'demolition-standard',
    category: 'demolition',
    tier: 'professional',
    name: 'Standard Trash Removal',
    tagline: 'For contractors and renovators',
    regularPrice: 379,
    foundingPrice: 379,
    popular: true,
    features: [
      '8 removal trips/month',
      '15% off all demolition quotes',
      'Priority scheduling (24hr guarantee)',
      'Same-day service guaranteed',
      'Large debris removal included',
      'Construction waste management',
      'Dumpster rental included (2/mo)',
      'Free estimates & consultations',
      '🎁 First 12 Subscribers: Half price pressure washing',
      '🎁 First 12 Subscribers: 15% off Black Phoenix Services for life',
    ],
    limits: {
      monthlyTrips: 8,
      projects: 25,
      storage: '5 GB',
      support: 'Email & Phone (24hr response)',
    },
  },
  {
    id: 'demolition-premium',
    category: 'demolition',
    tier: 'enterprise',
    name: 'Premium Trash Removal',
    tagline: 'For high-volume commercial',
    regularPrice: 539,
    foundingPrice: 539,
    highlighted: true,
    features: [
      '12 removal trips/month',
      '15% off all demolition quotes',
      'On-demand service anytime',
      'Dedicated truck & crew',
      'Full demolition services',
      'Hazardous material handling',
      'Unlimited dumpster rentals',
      '24/7 emergency service',
      'Custom project planning',
      '⭐ 20% off for lifetime with continued subscription',
      '⭐ After 5 years: Downgrade to any plan and keep 20% discount forever',
      '🎁 First 12 Subscribers: Half price pressure washing',
      '🎁 First 12 Subscribers: 15% off Black Phoenix Services for life',
    ],
    limits: {
      monthlyTrips: 12,
      projects: 999999,
      storage: 'Unlimited',
      support: '24/7 Phone & Priority',
    },
  },
];

// PROPERTY MANAGEMENT PLANS
export const PROPERTY_MANAGEMENT_PLANS: SubscriptionPlan[] = [
  {
    id: 'condo-manager',
    category: 'property-management',
    portalType: 'condo_manager',
    tier: 'professional',
    name: 'Condo Manager Plan',
    tagline: 'For condo associations',
    regularPrice: 399,
    foundingPrice: 399,
    features: [
      'Common area maintenance',
      'Emergency response 24/7',
      'Vendor coordination',
      'Seasonal maintenance programs',
      'Board meeting reports',
      'Up to 50 tenant sub-portals',
      'Resident portal access',
      'Budget tracking & reporting',
      'Priority scheduling',
      '🤖 PropertyAI Enterprise (RSA 356-B compliance tools)',
      '📚 Knowledge Center: NH condo law library & board templates',
      '🛒 Marketplace: Condo Board Handbook + Board Meeting Package included',
      '🎁 First 12 Subscribers: Half price pressure washing',
      '🎁 First 12 Subscribers: 15% off Black Phoenix Services for life',
    ],
    limits: {
      projects: 20,
      storage: '25 GB',
      support: 'Email & Phone (24hr response)',
      teamMembers: 3,
      tenantSubPortals: 50,
    },
  },
  {
    id: 'landlord',
    category: 'property-management',
    portalType: 'landlord',
    tier: 'starter',
    name: 'Landlord Plan',
    tagline: 'For individual landlords',
    regularPrice: 249,
    foundingPrice: 249,
    popular: true,
    features: [
      'Up to 5 rental properties',
      'Up to 25 tenant sub-portals',
      'Tenant maintenance requests',
      'Emergency repair coordination',
      'Property inspection services',
      'Maintenance tracking',
      'Service history per property',
      'Vendor management',
      '🤖 PropertyAI Enterprise (RSA 540 landlord compliance tools)',
      '📚 Knowledge Center: NH landlord law library & lease templates',
      '🛒 Marketplace: NH Landlord Operations Manual + NH Lease Pack included',
      '🎁 First 12 Subscribers: Half price pressure washing',
      '🏷️ 15% off every quoted project — for the lifetime of your subscription',
    ],
    limits: {
      projects: 10,
      storage: '10 GB',
      support: 'Email & Phone (48hr response)',
      teamMembers: 2,
      tenantSubPortals: 25,
    },
  },
  {
    id: 'property-manager',
    category: 'property-management',
    portalType: 'property_manager',
    tier: 'enterprise',
    name: 'Property Manager Plan',
    tagline: 'For professional property managers',
    regularPrice: 599,
    foundingPrice: 599,
    highlighted: true,
    features: [
      'Unlimited properties',
      'Multi-tenant coordination',
      '24/7 emergency dispatch',
      'Comprehensive maintenance programs',
      'Financial reporting & analytics',
      'Dedicated account manager',
      'Custom service agreements',
      'Preventive maintenance scheduling',
      'Up to 100 tenant sub-portals',
      'White-label tenant portal',
      '🤖 PropertyAI Enterprise: Full suite (all 5 phases)',
      '📚 Knowledge Center: Complete NH property law + Eversource rebate guides',
      '🛒 Marketplace: Property Manager Pro Bundle ($199 value) included',
      '⭐ 20% off for lifetime with continued subscription',
      '⭐ After 5 years: Downgrade to any plan and keep 20% discount forever',
      '🎁 First 12 Subscribers: Half price pressure washing',
      '🎁 First 12 Subscribers: 15% off Black Phoenix Services for life',
    ],
    limits: {
      projects: 999999,
      storage: 'Unlimited',
      support: '24/7 Phone & Priority',
      teamMembers: 999999,
      tenantSubPortals: 100,
    },
  },
];

// VENDOR PLANS
export const VENDOR_PLANS: SubscriptionPlan[] = [
  {
    id: 'vendor-starter',
    category: 'vendor',
    tier: 'starter',
    name: 'Vendor Starter',
    tagline: 'Perfect for small hardware stores',
    regularPrice: 149,
    foundingPrice: 104, // 30% off = $149 - $45
    features: [
      'Online storefront & catalog',
      'Basic inventory management',
      'Customer order processing',
      'Email notifications',
      'Standard analytics dashboard',
      'Mobile app access',
      'Community support',
    ],
    limits: {
      projects: 50,
      quotes: 100,
      storage: '10 GB',
      support: 'Email (48hr response)',
      teamMembers: 2,
    },
  },
  {
    id: 'vendor-professional',
    category: 'vendor',
    tier: 'professional',
    name: 'Vendor Professional',
    tagline: 'For growing hardware businesses',
    regularPrice: 299,
    foundingPrice: 209, // 30% off
    popular: true,
    features: [
      'Everything in Starter, plus:',
      'Advanced inventory sync (real-time)',
      'Multi-location management',
      'Custom pricing rules & discounts',
      'Advanced analytics & reporting',
      'API access for integrations',
      'Priority email & chat support',
      'Marketing automation tools',
      'Bulk order processing',
    ],
    limits: {
      projects: 200,
      quotes: 500,
      storage: '100 GB',
      support: 'Email & Chat (24hr response)',
      teamMembers: 10,
      apiCalls: 10000,
    },
  },
  {
    id: 'vendor-enterprise',
    category: 'vendor',
    tier: 'enterprise',
    name: 'Vendor Enterprise',
    tagline: 'For major hardware retailers',
    regularPrice: 599,
    foundingPrice: 419, // 30% off
    highlighted: true,
    features: [
      'Everything in Professional, plus:',
      'Unlimited products & locations',
      'White-label storefront options',
      'Dedicated account manager',
      'Custom integrations & webhooks',
      'Advanced fraud protection',
      'Priority vendor placement',
      '24/7 phone support',
      'Custom SLA agreements',
      'Data export & backup tools',
    ],
    limits: {
      projects: 999999,
      quotes: 999999,
      storage: 'Unlimited',
      support: '24/7 Phone & Priority',
      teamMembers: 999999,
      apiCalls: 999999,
    },
  },
];

// SUBCONTRACTOR PLANS (Service Providers)
export const SUBCONTRACTOR_PLANS: SubscriptionPlan[] = [
  {
    id: 'sub-starter',
    category: 'subcontractor',
    tier: 'starter',
    name: 'Trade Contractor Basic',
    tagline: 'For individual contractors',
    regularPrice: 99,
    foundingPrice: 69, // 30% off
    features: [
      'Profile & portfolio showcase',
      'Lead notifications',
      'Basic project management',
      'Quote builder & estimates',
      'Customer messaging',
      'Calendar & scheduling',
      'Mobile app access',
    ],
    limits: {
      projects: 25,
      quotes: 50,
      leads: 10,
      storage: '5 GB',
      support: 'Email (72hr response)',
      teamMembers: 1,
    },
  },
  {
    id: 'sub-professional',
    category: 'subcontractor',
    tier: 'professional',
    name: 'Trade Contractor Pro',
    tagline: 'For established trade businesses',
    regularPrice: 199,
    foundingPrice: 139, // 30% off
    popular: true,
    features: [
      'Everything in Basic, plus:',
      'Priority lead placement',
      'Advanced project tracking',
      'Invoice & payment processing',
      'Customer review management',
      'Team collaboration tools',
      'Insurance certificate management',
      'Before/after photo galleries',
      'Automated follow-ups',
    ],
    limits: {
      projects: 100,
      quotes: 250,
      leads: 50,
      storage: '50 GB',
      support: 'Email & Chat (24hr response)',
      teamMembers: 5,
    },
  },
  {
    id: 'sub-enterprise',
    category: 'subcontractor',
    tier: 'enterprise',
    name: 'Trade Contractor Elite',
    tagline: 'For large contracting firms',
    regularPrice: 399,
    foundingPrice: 279, // 30% off
    highlighted: true,
    features: [
      'Everything in Pro, plus:',
      'Unlimited lead capacity',
      'Multi-crew dispatch system',
      'GPS tracking & routing',
      'Equipment & inventory tracking',
      'Custom reporting & analytics',
      'Dedicated success manager',
      'White-label client portal',
      '24/7 priority support',
    ],
    limits: {
      projects: 999999,
      quotes: 999999,
      leads: 999999,
      storage: 'Unlimited',
      support: '24/7 Phone & Priority',
      teamMembers: 999999,
    },
  },
];

// ADVERTISER PLANS
export const ADVERTISER_PLANS: SubscriptionPlan[] = [
  {
    id: 'ad-starter',
    category: 'advertiser',
    tier: 'starter',
    name: 'Advertiser Basic',
    tagline: 'For local brand awareness',
    regularPrice: 499,
    foundingPrice: 349, // 30% off
    features: [
      'Banner ads in platform',
      'Basic targeting (location)',
      'Campaign performance dashboard',
      'Monthly analytics reports',
      'Standard ad placements',
      'Email campaign support',
    ],
    limits: {
      campaigns: 3,
      impressions: 50000,
      support: 'Email (48hr response)',
    },
  },
  {
    id: 'ad-professional',
    category: 'advertiser',
    tier: 'professional',
    name: 'Advertiser Pro',
    tagline: 'For regional marketing campaigns',
    regularPrice: 999,
    foundingPrice: 699, // 30% off
    popular: true,
    features: [
      'Everything in Basic, plus:',
      'Premium ad placements',
      'Advanced targeting (demographics, behavior)',
      'A/B testing capabilities',
      'Real-time campaign optimization',
      'Video ad support',
      'Sponsored content opportunities',
      'Dedicated campaign manager',
    ],
    limits: {
      campaigns: 10,
      impressions: 200000,
      support: 'Email & Chat (24hr response)',
    },
  },
  {
    id: 'ad-enterprise',
    category: 'advertiser',
    tier: 'enterprise',
    name: 'Advertiser Elite',
    tagline: 'For national brand campaigns',
    regularPrice: 2499,
    foundingPrice: 1749, // 30% off
    highlighted: true,
    features: [
      'Everything in Pro, plus:',
      'Unlimited campaigns',
      'Exclusive homepage placements',
      'Custom creative development',
      'Multi-territory campaigns',
      'White-label reporting',
      'API access for automation',
      'Quarterly strategy sessions',
      '24/7 priority support',
    ],
    limits: {
      campaigns: 999999,
      impressions: 999999,
      support: '24/7 Phone & Priority',
    },
  },
];

// INVESTOR PLANS
export const INVESTOR_PLANS: SubscriptionPlan[] = [
  {
    id: 'investor-observer',
    category: 'investor',
    tier: 'starter',
    name: 'Investor Observer',
    tagline: 'Browse opportunities',
    regularPrice: 0,
    foundingPrice: 0,
    features: [
      'Public deal & opportunity feed',
      'Quarterly performance snapshots',
      'Company update newsletter',
      'Document library (public)',
      'Express interest in deals',
    ],
    limits: {
      storage: '2 GB',
      support: 'Email (72hr response)',
    },
  },
  {
    id: 'investor-partner',
    category: 'investor',
    tier: 'professional',
    name: 'Investor Partner',
    tagline: 'For active investors',
    regularPrice: 199,
    foundingPrice: 139, // 30% off
    popular: true,
    features: [
      'Everything in Observer, plus:',
      'Full deal room & due-diligence docs',
      'Monthly portfolio performance reports',
      'Early access to new opportunities',
      'Distribution & return tracking',
      'Direct line to investor relations',
      'Tax document center (K-1s, 1099s)',
    ],
    limits: {
      storage: '25 GB',
      support: 'Email & Phone (24hr response)',
    },
  },
  {
    id: 'investor-principal',
    category: 'investor',
    tier: 'enterprise',
    name: 'Investor Principal',
    tagline: 'For principal & institutional capital',
    regularPrice: 499,
    foundingPrice: 349, // 30% off
    highlighted: true,
    features: [
      'Everything in Partner, plus:',
      'Priority allocation on new deals',
      'Custom portfolio analytics & modeling',
      'Quarterly strategy calls with leadership',
      'Co-investment & syndication access',
      'Dedicated investor relations manager',
      'Real-time portfolio dashboard',
      '24/7 priority support',
    ],
    limits: {
      storage: 'Unlimited',
      support: '24/7 Phone & Priority',
    },
  },
];

// TERRITORY OWNER PLANS (franchise / regional operator licenses)
export const TERRITORY_OWNER_PLANS: SubscriptionPlan[] = [
  {
    id: 'territory-starter',
    category: 'territory-owner',
    tier: 'starter',
    name: 'Territory Starter',
    tagline: 'Launch a single local territory',
    regularPrice: 499,
    foundingPrice: 349, // 30% off
    features: [
      'One exclusive local territory (up to 5 ZIP codes)',
      'Full white-label platform access',
      'Customer, vendor & subcontractor portals',
      'Local marketing starter kit',
      'Territory revenue & booking dashboard',
      'Standard onboarding & training',
      'Email & phone support',
    ],
    limits: {
      storage: '50 GB',
      support: 'Email & Phone (24hr response)',
      teamMembers: 5,
    },
  },
  {
    id: 'territory-growth',
    category: 'territory-owner',
    tier: 'professional',
    name: 'Territory Growth',
    tagline: 'Scale across a metro area',
    regularPrice: 999,
    foundingPrice: 699, // 30% off
    popular: true,
    features: [
      'Everything in Starter, plus:',
      'Expanded territory (up to 15 ZIP codes)',
      'Co-branded storefront & campaigns',
      'Priority lead routing in your region',
      'Advanced territory analytics',
      'Dedicated launch & growth manager',
      'Recruiting tools for subs & vendors',
      'Quarterly business reviews',
    ],
    limits: {
      storage: '250 GB',
      support: 'Email & Phone (12hr response)',
      teamMembers: 25,
    },
  },
  {
    id: 'territory-regional',
    category: 'territory-owner',
    tier: 'enterprise',
    name: 'Regional Operator',
    tagline: 'Own an entire region',
    regularPrice: 1999,
    foundingPrice: 1399, // 30% off
    highlighted: true,
    features: [
      'Everything in Growth, plus:',
      'Multi-territory / regional exclusivity',
      'Full white-label & custom domain',
      'Master franchise sub-licensing rights',
      'Custom integrations & API access',
      'Dedicated regional success team',
      'Priority platform roadmap input',
      '24/7 priority support',
    ],
    limits: {
      storage: 'Unlimited',
      support: '24/7 Phone & Priority',
      teamMembers: 999999,
    },
  },
];

// ─── PORTAL-SPECIFIC OPTIONS + UNIVERSAL CUSTOM REQUEST ────────────────────────
// Every plan is auto-equipped with options that portal actually uses, plus the
// universal ability to request anything we don't offer yet.

export const CUSTOM_REQUEST_FEATURE =
  '➕ Request any custom service or feature we don\'t offer yet — we\'ll build it into your plan';

export const PORTAL_OPTIONS_BY_CATEGORY: Record<PlanCategory, string[]> = {
  customer: [
    'Add extra monthly service hours',
    'Seasonal deep-clean / pressure-washing add-on',
    'Smart-home device install & setup',
    'Additional property coverage',
    'Priority emergency call-out upgrade',
  ],
  construction: [
    'Extra build hours',
    'Architectural & design package',
    'Expedited permit handling',
    '3D rendering / walkthrough package',
    'Dedicated project manager upgrade',
  ],
  demolition: [
    'Extra removal trips',
    'Roll-off dumpster rental add-on',
    'Hazardous material handling',
    'Weekend / after-hours service',
    'Full-site demolition add-on',
  ],
  'property-management': [
    'Additional tenant sub-portals',
    'After-hours emergency dispatch',
    'Annual reserve-study assessment',
    'Extra managed property slots',
    'White-label tenant portal upgrade',
  ],
  vendor: [
    'Featured storefront placement',
    'Additional product listings',
    'Extra store locations',
    'Dedicated onboarding specialist',
    'Marketing & promotion package',
  ],
  subcontractor: [
    'Extra lead package',
    'Additional crew seats',
    'GPS fleet tracking',
    'Priority dispatch upgrade',
    'Insurance & compliance management',
  ],
  advertiser: [
    'Extra impression pack',
    'Premium homepage placement',
    'Video ad production',
    'Additional active campaigns',
    'Dedicated campaign strategist',
  ],
  investor: [
    'Quarterly strategy call',
    'Custom reporting package',
    'Early / priority deal access',
    'Portfolio analytics add-on',
    'Co-investment access',
  ],
  'territory-owner': [
    'Additional ZIP codes / territory expansion',
    'Local marketing campaign package',
    'Extra staff & operator seats',
    'Co-branded storefront',
    'Sub-licensing rights',
  ],
};

/**
 * PLATFORM CAPABILITIES BY CATEGORY
 *
 * The actual platform tooling each portal unlocks today. Kept in sync with the
 * live app (see nav.ts / routes.tsx). These lines are appended to every plan in
 * the category so the published feature lists always reflect what the product
 * really does — no plan should advertise less than the app delivers.
 */
export const PLATFORM_CAPABILITIES_BY_CATEGORY: Record<PlanCategory, string[]> = {
  customer: [
    '🌐 Customer Portal: track projects, invoices & service history online',
    '📅 Online booking with unified service calendar',
    '🛒 Marketplace access with member pricing & live order tracking',
    '💬 Live chat support with your service team',
  ],
  construction: [
    '📐 AI Blueprint Analyzer & Structural Design tools',
    '📋 PermitAI permit automation + AI Variance Filing',
    '🏗️ Bid Room, Master Scheduling & Change Order Camera',
    '🌦️ Weather job-site monitoring & waste/disposal tracking',
    '📸 Progress photo documentation & job financial tracker',
  ],
  demolition: [
    '📍 Live job & disposal tracking dashboard',
    '🗑️ Waste & disposal tracking with unified calendar',
    '📅 Online scheduling & instant quote requests',
    '💬 Live chat dispatch support',
  ],
  'property-management': [
    '🏢 Multi-property dashboard with tenant sub-portals',
    '🌐 White-label tenant portal creation & management',
    '📊 Financial reporting & analytics',
    '🌦️ Weather monitoring & preventive maintenance scheduling',
    '💬 Live chat & 24/7 emergency dispatch',
  ],
  vendor: [
    '🛍️ Full eCommerce storefront + Zendrop dropshipping catalog (1-click import)',
    '🚀 Product Page Pilot: AI advertorial / campaign landing pages',
    '🔥 Hot Products Radar + Auto-Product Pilot AI product sourcing',
    '📈 AI Ranking Engine, promotions engine & order tracking',
    '🎯 Retargeting pixels, exit-intent popups, live chat & review collection',
  ],
  subcontractor: [
    '🏗️ Bid Room & lead marketplace access',
    '📸 Change Order Camera & progress documentation',
    '🧰 Materials Center & Purchase Orders',
    '📅 Scheduling, invoicing & integrated payment processing',
  ],
  advertiser: [
    '📣 Ad Studio: AI creative & campaign builder',
    '🎯 Marketing Command Center + retargeting pixels',
    '📱 Social Media Hub, Blog Manager & Keyword Rank Tracker',
    '🤝 Influencer & ambassador tracking + marketing automation',
  ],
  investor: [
    '📲 Investor App with real-time portfolio dashboard',
    '📄 Document library & deal-room access',
    '📊 ROI, distribution & return tracking',
  ],
  'territory-owner': [
    '🌐 Full white-label platform: customer, vendor, subcontractor & investor portals',
    '📣 Complete marketing suite: Ad Studio, Marketing Command Center & Social Media Hub',
    '🛍️ eCommerce + dropshipping suite: Product Page Pilot, Hot Products Radar & Zendrop',
    '📊 Territory analytics & revenue dashboards',
  ],
};

/**
 * Ensures every plan carries its portal type, portal-specific options, the
 * real platform capabilities for its category, the custom-request flag, and the
 * universal custom-request feature line.
 */
function equipPortalOptions(plans: SubscriptionPlan[]): SubscriptionPlan[] {
  return plans.map((plan) => {
    const capabilities = PLATFORM_CAPABILITIES_BY_CATEGORY[plan.category] ?? [];
    // Append any platform capabilities not already listed, then guarantee the
    // universal custom-request line sits at the very end.
    const merged = [...plan.features];
    for (const cap of capabilities) {
      if (!merged.includes(cap)) merged.push(cap);
    }
    const features = merged.includes(CUSTOM_REQUEST_FEATURE)
      ? merged
      : [...merged, CUSTOM_REQUEST_FEATURE];
    return {
      ...plan,
      portalType: plan.portalType ?? CATEGORY_TO_PORTAL[plan.category],
      portalOptions: plan.portalOptions ?? PORTAL_OPTIONS_BY_CATEGORY[plan.category] ?? [],
      allowCustomRequest: plan.allowCustomRequest ?? true,
      features,
    };
  });
}

// ALL PLANS COMBINED (every portal, every tier — enriched with portal options)
export const ALL_SUBSCRIPTION_PLANS: SubscriptionPlan[] = equipPortalOptions([
  ...CUSTOMER_PLANS,
  ...CONSTRUCTION_PLANS,
  ...DEMOLITION_PLANS,
  ...PROPERTY_MANAGEMENT_PLANS,
  ...VENDOR_PLANS,
  ...SUBCONTRACTOR_PLANS,
  ...ADVERTISER_PLANS,
  ...INVESTOR_PLANS,
  ...TERRITORY_OWNER_PLANS,
]);

// HELPER FUNCTIONS
export const getPlanById = (planId: string): SubscriptionPlan | undefined => {
  return ALL_SUBSCRIPTION_PLANS.find(plan => plan.id === planId);
};

export const getPlansByCategory = (category: PlanCategory): SubscriptionPlan[] => {
  return ALL_SUBSCRIPTION_PLANS.filter(plan => plan.category === category);
};

export const calculatePremiumDiscountedPrice = (regularPrice: number): number => {
  return regularPrice * (1 - FOUNDING_SUBSCRIBER_CONFIG.premiumPlanDiscount);
};

export const calculateFirstYearSavings = (regularPrice: number, isPremium: boolean = false): number => {
  if (isPremium) {
    const discountedPrice = calculatePremiumDiscountedPrice(regularPrice);
    return (regularPrice - discountedPrice) * 12;
  }
  return 0;
};

export const formatPrice = (price: number): string => {
  return `$${price.toLocaleString()}`;
};

export const formatPricePerMonth = (price: number): string => {
  return `${formatPrice(price)}/mo`;
};