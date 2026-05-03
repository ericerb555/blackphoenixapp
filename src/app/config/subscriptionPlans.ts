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

export interface SubscriptionPlan {
  id: string;
  category: 'customer' | 'vendor' | 'subcontractor' | 'advertiser';
  tier: 'starter' | 'professional' | 'enterprise';
  name: string;
  tagline: string;
  regularPrice: number;
  foundingPrice: number; // 30% off regular price
  features: string[];
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
      'Discounted materials (10% off)',
      'Annual service report',
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
      'Discounted materials (15% off)',
      'Free emergency call-outs (2/year)',
      'Photo documentation & reports',
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
      'Discounted materials (20% off)',
      'Unlimited emergency call-outs',
      '24/7 priority support',
      'Quarterly property inspections',
      'Custom project planning',
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

// ALL PLANS COMBINED
export const ALL_SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  ...CUSTOMER_PLANS,
  ...VENDOR_PLANS,
  ...SUBCONTRACTOR_PLANS,
  ...ADVERTISER_PLANS,
];

// HELPER FUNCTIONS
export const getPlanById = (planId: string): SubscriptionPlan | undefined => {
  return ALL_SUBSCRIPTION_PLANS.find(plan => plan.id === planId);
};

export const getPlansByCategory = (category: 'customer' | 'vendor' | 'subcontractor' | 'advertiser'): SubscriptionPlan[] => {
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