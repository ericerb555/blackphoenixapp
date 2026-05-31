// Temporary cohort stub - will be replaced with new cohort system
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

export function getVisibleCohorts(): Cohort[] {
  // Temporary stub - returns empty array
  return [];
}

export function getCohortPriceDisplay(cohort: Cohort): string {
  return `$${cohort.price}`;
}

export function getLimitDisplay(value: number): string {
  if (value === Infinity || value >= 1000000) return 'Unlimited';
  return value.toString();
}
