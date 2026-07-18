/**
 * Revenue Service - Unified Revenue & Cohort Integration
 * Connects Revenue & Monetization Hub with Advanced Cohort Management System
 */

import { projectId, publicAnonKey } from '../../utils/supabase/info';

const API_BASE = `https://${projectId}.supabase.co/functions/v1/make-server-57095a78`;

interface RevenueAnalytics {
  overview: {
    totalMRR: number;
    totalARR: number;
    totalActiveSubscribers: number;
    totalCohorts: number;
    averageRevenuePerSubscriber: number;
    totalFoundingMembers: number;
    foundingMemberRevenue: number;
    regularRevenue: number;
  };
  revenueByCategory: {
    customer: number;
    construction: number;
    'property-management': number;
    vendor: number;
    subcontractor: number;
    advertiser: number;
    service_plan: number;
    other: number;
  };
  revenueByTier: {
    starter: number;
    professional: number;
    enterprise: number;
  };
  topCohorts: Array<{
    id: string;
    name: string;
    category: string;
    revenue: number;
    subscribers: number;
    growthRate: number;
    churnRate: number;
  }>;
  timestamp: string;
}

interface CategoryRevenue {
  totalRevenue: number;
  totalSubscribers: number;
  planCount: number;
  averagePrice: number;
  plans: Array<{
    id: string;
    name: string;
    price: number;
    subscribers: number;
    revenue: number;
    status: string;
    tier?: string;
  }>;
}

interface RevenueTrends {
  currentMRR: number;
  currentARR: number;
  averageGrowthRate: number;
  projections: Array<{
    month: number;
    projectedMRR: number;
    projectedARR: number;
  }>;
}

interface HealthStats {
  totalCohorts: number;
  totalRevenue: number;
  totalSubscribers: number;
  servicePlanCohorts: number;
}

/**
 * Fetch comprehensive revenue analytics from cohorts system
 */
export async function getRevenueAnalytics(): Promise<RevenueAnalytics | null> {
  try {
    const response = await fetch(`${API_BASE}/cohorts/revenue/analytics`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${publicAnonKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error('Failed to fetch revenue analytics:', response.status);
      return null;
    }

    const data = await response.json();
    return data.analytics;
  } catch (error) {
    console.error('Error fetching revenue analytics:', error);
    return null;
  }
}

/**
 * Fetch revenue breakdown for a specific category
 */
export async function getCategoryRevenue(category: string): Promise<CategoryRevenue | null> {
  try {
    const response = await fetch(`${API_BASE}/cohorts/revenue/category/${category}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${publicAnonKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error(`Failed to fetch ${category} revenue:`, response.status);
      return null;
    }

    const result = await response.json();
    return result.data;
  } catch (error) {
    console.error(`Error fetching ${category} revenue:`, error);
    return null;
  }
}

/**
 * Fetch revenue trends and projections
 */
export async function getRevenueTrends(): Promise<RevenueTrends | null> {
  try {
    const response = await fetch(`${API_BASE}/cohorts/revenue/trends`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${publicAnonKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error('Failed to fetch revenue trends:', response.status);
      return null;
    }

    const data = await response.json();
    return data.trends;
  } catch (error) {
    console.error('Error fetching revenue trends:', error);
    return null;
  }
}

/**
 * Get health stats for cohorts system
 */
export async function getCohortsHealth(): Promise<HealthStats | null> {
  try {
    const response = await fetch(`${API_BASE}/cohorts/health`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${publicAnonKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error('Failed to fetch cohorts health:', response.status);
      return null;
    }

    const data = await response.json();
    return data.stats;
  } catch (error) {
    console.error('Error fetching cohorts health:', error);
    return null;
  }
}

/**
 * Update subscriber count for a cohort and recalculate revenue
 */
export async function updateCohortSubscribers(
  cohortId: string,
  activeSubscribers: number,
  foundingMemberCount?: number
): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE}/cohorts/${cohortId}/update-subscribers`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${publicAnonKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        activeSubscribers,
        foundingMemberCount: foundingMemberCount || 0
      })
    });

    if (!response.ok) {
      console.error('Failed to update cohort subscribers:', response.status);
      return false;
    }

    const data = await response.json();
    console.log('Updated cohort:', data.cohort);
    return data.success;
  } catch (error) {
    console.error('Error updating cohort subscribers:', error);
    return false;
  }
}

/**
 * Get all cohorts from the system
 */
export async function getAllCohorts(): Promise<any[]> {
  try {
    const response = await fetch(`${API_BASE}/cohorts`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${publicAnonKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error('Failed to fetch cohorts:', response.status);
      return [];
    }

    const data = await response.json();
    return data.cohorts || [];
  } catch (error) {
    console.error('Error fetching cohorts:', error);
    return [];
  }
}

/**
 * Format currency for display
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format large numbers with abbreviations (K, M, etc.)
 */
export function formatNumber(num: number): string {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`;
  } else if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`;
  }
  return num.toString();
}

/**
 * Calculate percentage change
 */
export function calculatePercentageChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

/**
 * Calculate MRR from subscription plans
 */
export function calculateMRR(plans: Array<{ price: number; subscribers: number; billingCycle?: string }>): number {
  return plans.reduce((total, plan) => {
    const monthlyPrice = plan.billingCycle === 'yearly' ? plan.price / 12 : plan.price;
    return total + (monthlyPrice * plan.subscribers);
  }, 0);
}

/**
 * Calculate ARR from MRR
 */
export function calculateARR(mrr: number): number {
  return mrr * 12;
}

/**
 * Get revenue growth rate
 */
export function getGrowthRate(current: number, previous: number): number {
  if (previous === 0) return 0;
  return ((current - previous) / previous) * 100;
}

/**
 * Initialize cohorts system with default data (for first-time setup)
 */
export async function initializeCohorts(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE}/cohorts/initialize`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${publicAnonKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error('Failed to initialize cohorts:', response.status);
      return false;
    }

    const data = await response.json();
    console.log('Initialized cohorts:', data.cohortIds);
    return data.success;
  } catch (error) {
    console.error('Error initializing cohorts:', error);
    return false;
  }
}
