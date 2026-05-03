/**
 * Vendor Subscription Service
 * 
 * Manages vendor subscriptions using localStorage
 * Integrates with the unified payment system
 * 
 * Features:
 * - Customer Portal Preview Access
 * - Landing Page Advertising
 * - Subcontractor Connection Management
 * - Coupon & Offer Creation
 */

import type { UnifiedSubscription } from './unifiedPaymentService';

export interface VendorSubscription {
  id: string;
  vendor_id: string;
  vendor_name: string;
  vendor_email: string;
  plan_id: 'starter' | 'professional' | 'enterprise';
  plan_name: string;
  status: 'active' | 'trial' | 'cancelled' | 'past_due' | 'expired';
  start_date: string;
  end_date?: string;
  next_billing_date: string;
  amount: number;
  billing_cycle: 'monthly' | 'annual';
  auto_renew: boolean;
  trial_ends_at?: string;
  
  // Usage tracking
  usage: {
    portal_views: number;
    landing_page_ads: number;
    active_coupons: number;
    subcontractor_connections: number;
    monthly_ad_impressions: number;
  };
  
  // Feature access
  features: {
    customer_portal_preview: boolean;
    landing_page_ads: boolean;
    coupon_management: boolean;
    subcontractor_connections: boolean;
    analytics_dashboard: boolean;
    priority_placement: boolean;
    custom_branding: boolean;
    api_access: boolean;
  };
  
  created_at: string;
  updated_at: string;
}

export interface VendorPlanFeatures {
  customer_portal_preview: boolean;
  landing_page_ads: boolean;
  coupon_management: boolean;
  subcontractor_connections: boolean;
  analytics_dashboard: boolean;
  priority_placement: boolean;
  custom_branding: boolean;
  api_access: boolean;
  featured_vendor_badge: boolean;
  enhanced_listings: boolean;
  promotional_emails: boolean;
  dedicated_support: boolean;
}

const PLAN_FEATURES: Record<'starter' | 'professional' | 'enterprise', VendorPlanFeatures> = {
  starter: {
    customer_portal_preview: true,
    landing_page_ads: false,
    coupon_management: true,
    subcontractor_connections: false,
    analytics_dashboard: false,
    priority_placement: false,
    custom_branding: false,
    api_access: false,
    featured_vendor_badge: false,
    enhanced_listings: false,
    promotional_emails: false,
    dedicated_support: false,
  },
  professional: {
    customer_portal_preview: true,
    landing_page_ads: true,
    coupon_management: true,
    subcontractor_connections: true,
    analytics_dashboard: true,
    priority_placement: false,
    custom_branding: false,
    api_access: false,
    featured_vendor_badge: true,
    enhanced_listings: true,
    promotional_emails: true,
    dedicated_support: false,
  },
  enterprise: {
    customer_portal_preview: true,
    landing_page_ads: true,
    coupon_management: true,
    subcontractor_connections: true,
    analytics_dashboard: true,
    priority_placement: true,
    custom_branding: true,
    api_access: true,
    featured_vendor_badge: true,
    enhanced_listings: true,
    promotional_emails: true,
    dedicated_support: true,
  },
};

const STORAGE_KEY = 'vendor_subscriptions';

class VendorSubscriptionService {
  /**
   * Get all vendor subscriptions
   */
  getAllSubscriptions(): VendorSubscription[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return [];
      return JSON.parse(stored);
    } catch (error) {
      console.error('Error loading vendor subscriptions:', error);
      return [];
    }
  }

  /**
   * Get subscription by ID
   */
  getSubscription(id: string): VendorSubscription | null {
    const subscriptions = this.getAllSubscriptions();
    return subscriptions.find((sub) => sub.id === id) || null;
  }

  /**
   * Get active subscription for a vendor
   */
  getActiveSubscription(vendorId: string): VendorSubscription | null {
    const subscriptions = this.getAllSubscriptions();
    return (
      subscriptions.find(
        (sub) => sub.vendor_id === vendorId && sub.status === 'active'
      ) || null
    );
  }

  /**
   * Create a new subscription
   */
  createSubscription(data: Partial<VendorSubscription>): VendorSubscription {
    const subscriptions = this.getAllSubscriptions();
    
    const planId = data.plan_id || 'starter';
    const features = PLAN_FEATURES[planId];
    
    const newSubscription: VendorSubscription = {
      id: data.id || `vsub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      vendor_id: data.vendor_id || '',
      vendor_name: data.vendor_name || '',
      vendor_email: data.vendor_email || '',
      plan_id: planId,
      plan_name: data.plan_name || this.getPlanName(planId),
      status: data.status || 'trial',
      start_date: data.start_date || new Date().toISOString(),
      next_billing_date: data.next_billing_date || this.calculateNextBillingDate(data.billing_cycle || 'monthly'),
      amount: data.amount || this.getPlanPrice(planId, data.billing_cycle || 'monthly'),
      billing_cycle: data.billing_cycle || 'monthly',
      auto_renew: data.auto_renew ?? true,
      trial_ends_at: data.trial_ends_at || this.calculateTrialEndDate(),
      usage: data.usage || {
        portal_views: 0,
        landing_page_ads: 0,
        active_coupons: 0,
        subcontractor_connections: 0,
        monthly_ad_impressions: 0,
      },
      features: {
        customer_portal_preview: features.customer_portal_preview,
        landing_page_ads: features.landing_page_ads,
        coupon_management: features.coupon_management,
        subcontractor_connections: features.subcontractor_connections,
        analytics_dashboard: features.analytics_dashboard,
        priority_placement: features.priority_placement,
        custom_branding: features.custom_branding,
        api_access: features.api_access,
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    subscriptions.push(newSubscription);
    this.saveSubscriptions(subscriptions);
    
    return newSubscription;
  }

  /**
   * Update a subscription
   */
  updateSubscription(id: string, updates: Partial<VendorSubscription>): VendorSubscription | null {
    const subscriptions = this.getAllSubscriptions();
    const index = subscriptions.findIndex((sub) => sub.id === id);
    
    if (index === -1) return null;
    
    subscriptions[index] = {
      ...subscriptions[index],
      ...updates,
      updated_at: new Date().toISOString(),
    };
    
    this.saveSubscriptions(subscriptions);
    return subscriptions[index];
  }

  /**
   * Cancel a subscription
   */
  cancelSubscription(id: string): boolean {
    const subscriptions = this.getAllSubscriptions();
    const index = subscriptions.findIndex((sub) => sub.id === id);
    
    if (index === -1) return false;
    
    subscriptions[index] = {
      ...subscriptions[index],
      status: 'cancelled',
      auto_renew: false,
      updated_at: new Date().toISOString(),
    };
    
    this.saveSubscriptions(subscriptions);
    return true;
  }

  /**
   * Delete a subscription
   */
  deleteSubscription(id: string): boolean {
    const subscriptions = this.getAllSubscriptions();
    const filtered = subscriptions.filter((sub) => sub.id !== id);
    
    if (filtered.length === subscriptions.length) return false;
    
    this.saveSubscriptions(filtered);
    return true;
  }

  /**
   * Track usage for a subscription
   */
  trackUsage(
    subscriptionId: string,
    usageType: keyof VendorSubscription['usage'],
    amount: number
  ): boolean {
    const subscription = this.getSubscription(subscriptionId);
    if (!subscription) return false;
    
    const updatedUsage = {
      ...subscription.usage,
      [usageType]: subscription.usage[usageType] + amount,
    };
    
    this.updateSubscription(subscriptionId, { usage: updatedUsage });
    return true;
  }

  /**
   * Check if a feature is available for a subscription
   */
  hasFeatureAccess(subscriptionId: string, feature: keyof VendorPlanFeatures): boolean {
    const subscription = this.getSubscription(subscriptionId);
    if (!subscription || subscription.status !== 'active') return false;
    
    const planFeatures = PLAN_FEATURES[subscription.plan_id];
    return planFeatures[feature] || false;
  }

  /**
   * Get plan features
   */
  getPlanFeatures(planId: 'starter' | 'professional' | 'enterprise'): VendorPlanFeatures {
    return PLAN_FEATURES[planId];
  }

  /**
   * Check usage limits
   */
  checkUsageLimit(
    subscriptionId: string,
    usageType: keyof VendorSubscription['usage']
  ): { allowed: boolean; current: number; limit: number | 'unlimited' } {
    const subscription = this.getSubscription(subscriptionId);
    if (!subscription) {
      return { allowed: false, current: 0, limit: 0 };
    }
    
    const limits = this.getPlanLimits(subscription.plan_id);
    const current = subscription.usage[usageType];
    const limit = limits[usageType];
    
    if (limit === 'unlimited') {
      return { allowed: true, current, limit };
    }
    
    return {
      allowed: current < limit,
      current,
      limit,
    };
  }

  /**
   * Get plan limits
   */
  private getPlanLimits(planId: 'starter' | 'professional' | 'enterprise') {
    const limits = {
      starter: {
        portal_views: 'unlimited' as const,
        landing_page_ads: 0,
        active_coupons: 5,
        subcontractor_connections: 0,
        monthly_ad_impressions: 0,
      },
      professional: {
        portal_views: 'unlimited' as const,
        landing_page_ads: 3,
        active_coupons: 20,
        subcontractor_connections: 10,
        monthly_ad_impressions: 50000,
      },
      enterprise: {
        portal_views: 'unlimited' as const,
        landing_page_ads: 'unlimited' as const,
        active_coupons: 'unlimited' as const,
        subcontractor_connections: 'unlimited' as const,
        monthly_ad_impressions: 'unlimited' as const,
      },
    };
    
    return limits[planId];
  }

  /**
   * Get plan name
   */
  private getPlanName(planId: 'starter' | 'professional' | 'enterprise'): string {
    const names = {
      starter: 'Vendor Starter',
      professional: 'Vendor Professional',
      enterprise: 'Vendor Enterprise',
    };
    return names[planId];
  }

  /**
   * Get plan price
   */
  private getPlanPrice(planId: 'starter' | 'professional' | 'enterprise', cycle: 'monthly' | 'annual'): number {
    const prices = {
      starter: { monthly: 99, annual: 990 },
      professional: { monthly: 249, annual: 2490 },
      enterprise: { monthly: 499, annual: 4990 },
    };
    
    return prices[planId][cycle];
  }

  /**
   * Calculate next billing date
   */
  private calculateNextBillingDate(cycle: 'monthly' | 'annual'): string {
    const date = new Date();
    if (cycle === 'monthly') {
      date.setMonth(date.getMonth() + 1);
    } else {
      date.setFullYear(date.getFullYear() + 1);
    }
    return date.toISOString();
  }

  /**
   * Calculate trial end date (14 days from now)
   */
  private calculateTrialEndDate(): string {
    const date = new Date();
    date.setDate(date.getDate() + 14);
    return date.toISOString();
  }

  /**
   * Save subscriptions to localStorage
   */
  private saveSubscriptions(subscriptions: VendorSubscription[]): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(subscriptions));
    } catch (error) {
      console.error('Error saving vendor subscriptions:', error);
    }
  }

  /**
   * Initialize demo subscriptions (for testing)
   */
  initializeDemoData(): void {
    const existing = this.getAllSubscriptions();
    if (existing.length > 0) return;
    
    // Create demo subscriptions
    this.createSubscription({
      vendor_id: 'demo_vendor_001',
      vendor_name: 'Premier Home Solutions',
      vendor_email: 'contact@premierhome.com',
      plan_id: 'professional',
      status: 'active',
      billing_cycle: 'monthly',
      usage: {
        portal_views: 1243,
        landing_page_ads: 2,
        active_coupons: 8,
        subcontractor_connections: 5,
        monthly_ad_impressions: 12450,
      },
    });

    this.createSubscription({
      vendor_id: 'demo_vendor_002',
      vendor_name: 'Elite Construction Services',
      vendor_email: 'info@eliteconstruction.com',
      plan_id: 'enterprise',
      status: 'active',
      billing_cycle: 'annual',
      usage: {
        portal_views: 3842,
        landing_page_ads: 5,
        active_coupons: 15,
        subcontractor_connections: 23,
        monthly_ad_impressions: 89230,
      },
    });
  }
}

// Export singleton instance
export const vendorSubscriptionService = new VendorSubscriptionService();

// Export types
export type { VendorPlanFeatures };
