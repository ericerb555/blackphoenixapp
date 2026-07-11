export interface Cohort {
  id: string;
  name: string;
  description: string;
  price: number;
  billingPeriod: 'monthly' | 'yearly' | 'one-time';
  color: string;
  icon: string;
  isPopular?: boolean;
  maxUsers?: number;
  maxProjects?: number;
  storageGB?: number;
  features: Array<{ id: string; name: string }>;
}

const DEFAULT_COHORTS: Cohort[] = [
  {
    id: 'starter',
    name: 'Starter',
    description: 'Perfect for solo contractors getting started',
    price: 49,
    billingPeriod: 'monthly',
    color: '#6B7280',
    icon: '🔧',
    maxUsers: 2,
    maxProjects: 10,
    storageGB: 5,
    features: [
      { id: 'invoices', name: 'Invoice Management' },
      { id: 'customers', name: 'Customer Database' },
      { id: 'pipeline', name: 'Project Pipeline' },
      { id: 'scheduling', name: 'Basic Scheduling' },
      { id: 'store', name: 'Digital Store (5 products)' },
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    description: 'For growing contractors and small teams',
    price: 99,
    billingPeriod: 'monthly',
    color: '#F97316',
    icon: '⚡',
    isPopular: true,
    maxUsers: 10,
    maxProjects: 50,
    storageGB: 25,
    features: [
      { id: 'invoices', name: 'Invoice Management' },
      { id: 'customers', name: 'Customer Database' },
      { id: 'pipeline', name: 'Project Pipeline' },
      { id: 'scheduling', name: 'Advanced Scheduling' },
      { id: 'store', name: 'Digital Store (unlimited)' },
      { id: 'crm', name: 'CRM & Lead Management' },
      { id: 'messaging', name: 'Direct Messaging' },
      { id: 'permit-ai', name: 'PermitAI' },
      { id: 'payments', name: 'Payment Processing' },
      { id: 'property', name: 'Property Management' },
    ],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    description: 'For established businesses with full needs',
    price: 249,
    billingPeriod: 'monthly',
    color: '#7C3AED',
    icon: '🏆',
    maxUsers: 1000000,
    maxProjects: 1000000,
    storageGB: 500,
    features: [
      { id: 'all-pro', name: 'Everything in Pro' },
      { id: 'analytics', name: 'Enterprise Reporting' },
      { id: 'design', name: 'Design Studio Pro' },
      { id: 'property-ai', name: 'Property AI Enterprise' },
      { id: 'bid-room', name: 'Bid Room' },
      { id: 'financial', name: 'Job Financial Tracker' },
      { id: 'subcontractors', name: 'Subcontractor Management' },
      { id: 'white-label', name: 'White Label Portals' },
      { id: 'api', name: 'API Access' },
      { id: 'dedicated', name: 'Dedicated Support' },
    ],
  },
];

export function getVisibleCohorts(): Cohort[] {
  try {
    const saved = localStorage.getItem('cohort_definitions');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  return DEFAULT_COHORTS;
}

export function getCohortPriceDisplay(cohort: Cohort): string {
  if (cohort.billingPeriod === 'one-time') return `$${cohort.price}`;
  return `$${cohort.price}/${cohort.billingPeriod === 'monthly' ? 'mo' : 'yr'}`;
}

export function getLimitDisplay(value: number): string {
  if (value === Infinity || value >= 1000000) return 'Unlimited';
  return value.toString();
}
