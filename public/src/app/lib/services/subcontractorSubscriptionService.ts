/**
 * Subcontractor Subscription Service
 * 
 * Manages subcontractor subscriptions using localStorage
 * Integrates with the unified payment system
 */

import type { UnifiedSubscription } from './unifiedPaymentService';

export interface SubcontractorSubscription {
  id: string;
  subcontractor_id: string;
  subcontractor_name: string;
  subcontractor_email: string;
  plan_id: 'basic' | 'pro' | 'enterprise';
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
    design_projects: number;
    ai_ad_credits_used: number;
    social_posts_used: number;
    storage_used_gb: number;
  };
  
  // Feature access
  features: {
    design_center: boolean;
    ai_ad_creator: boolean;
    social_media_manager: boolean;
    brand_creator: boolean;
    analytics: boolean;
    content_library: boolean;
  };
  
  created_at: string;
  updated_at: string;
}

export interface PlanFeatures {
  design_center: boolean;
  ai_ad_creator: boolean;
  social_media_manager: boolean;
  brand_creator: boolean;
  analytics: boolean;
  content_library: boolean;
  three_d_visualization: boolean;
  custom_templates: boolean;
  video_ad_creator: boolean;
  priority_support: boolean;
  white_label: boolean;
}

const PLAN_FEATURES: Record<'basic' | 'pro' | 'enterprise', PlanFeatures> = {
  basic: {
    design_center: true,
    ai_ad_creator: false,
    social_media_manager: false,
    brand_creator: false,
    analytics: false,
    content_library: true,
    three_d_visualization: false,
    custom_templates: false,
    video_ad_creator: false,
    priority_support: false,
    white_label: false,
  },
  pro: {
    design_center: true,
    ai_ad_creator: true,
    social_media_manager: false,
    brand_creator: true,
    analytics: true,
    content_library: true,
    three_d_visualization: true,
    custom_templates: true,
    video_ad_creator: false,
    priority_support: false,
    white_label: false,
  },
  enterprise: {
    design_center: true,
    ai_ad_creator: true,
    social_media_manager: true,
    brand_creator: true,
    analytics: true,
    content_library: true,
    three_d_visualization: true,
    custom_templates: true,
    video_ad_creator: true,
    priority_support: true,
    white_label: true,
  },
};

const STORAGE_KEY = 'subcontractor_subscriptions';

class SubcontractorSubscriptionService {
  /**
   * Get all subcontractor subscriptions
   */
  getAllSubscriptions(): SubcontractorSubscription[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return [];
      return JSON.parse(stored);
    } catch (error) {
      console.error('Error loading subcontractor subscriptions:', error);
      return [];
    }
  }

  /**
   * Get subscription by ID
   */
  getSubscription(id: string): SubcontractorSubscription | null {
    const subscriptions = this.getAllSubscriptions();
    return subscriptions.find((sub) => sub.id === id) || null;
  }

  /**
   * Get active subscription for a subcontractor
   */
  getActiveSubscription(subcontractorId: string): SubcontractorSubscription | null {
    const subscriptions = this.getAllSubscriptions();
    return (
      subscriptions.find(
        (sub) => sub.subcontractor_id === subcontractorId && sub.status === 'active'
      ) || null
    );
  }

  /**
   * Create a new subscription
   */
  createSubscription(data: Partial<SubcontractorSubscription>): SubcontractorSubscription {
    const subscriptions = this.getAllSubscriptions();
    
    const planId = data.plan_id || 'basic';
    const features = PLAN_FEATURES[planId];
    
    const newSubscription: SubcontractorSubscription = {
      id: data.id || `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      subcontractor_id: data.subcontractor_id || '',
      subcontractor_name: data.subcontractor_name || '',
      subcontractor_email: data.subcontractor_email || '',
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
        design_projects: 0,
        ai_ad_credits_used: 0,
        social_posts_used: 0,
        storage_used_gb: 0,
      },
      features: {
        design_center: features.design_center,
        ai_ad_creator: features.ai_ad_creator,
        social_media_manager: features.social_media_manager,
        brand_creator: features.brand_creator,
        analytics: features.analytics,
        content_library: features.content_library,
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
  updateSubscription(id: string, updates: Partial<SubcontractorSubscription>): SubcontractorSubscription | null {
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
    usageType: keyof SubcontractorSubscription['usage'],
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
  hasFeatureAccess(subscriptionId: string, feature: keyof PlanFeatures): boolean {
    const subscription = this.getSubscription(subscriptionId);
    if (!subscription || subscription.status !== 'active') return false;
    
    const planFeatures = PLAN_FEATURES[subscription.plan_id];
    return planFeatures[feature] || false;
  }

  /**
   * Get plan features
   */
  getPlanFeatures(planId: 'basic' | 'pro' | 'enterprise'): PlanFeatures {
    return PLAN_FEATURES[planId];
  }

  /**
   * Check usage limits
   */
  checkUsageLimit(
    subscriptionId: string,
    usageType: keyof SubcontractorSubscription['usage']
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
  private getPlanLimits(planId: 'basic' | 'pro' | 'enterprise') {
    const limits = {
      basic: {
        design_projects: 10,
        ai_ad_credits_used: 0,
        social_posts_used: 0,
        storage_used_gb: 5,
      },
      pro: {
        design_projects: 50,
        ai_ad_credits_used: 100,
        social_posts_used: 0,
        storage_used_gb: 25,
      },
      enterprise: {
        design_projects: 'unlimited' as const,
        ai_ad_credits_used: 'unlimited' as const,
        social_posts_used: 'unlimited' as const,
        storage_used_gb: 'unlimited' as const,
      },
    };
    
    return limits[planId];
  }

  /**
   * Get plan name
   */
  private getPlanName(planId: 'basic' | 'pro' | 'enterprise'): string {
    const names = {
      basic: 'Basic Builder',
      pro: 'Pro Creator',
      enterprise: 'Enterprise Suite',
    };
    return names[planId];
  }

  /**
   * Get plan price
   */
  private getPlanPrice(planId: 'basic' | 'pro' | 'enterprise', cycle: 'monthly' | 'annual'): number {
    const prices = {
      basic: { monthly: 49, annual: 490 },
      pro: { monthly: 149, annual: 1490 },
      enterprise: { monthly: 299, annual: 2990 },
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
  private saveSubscriptions(subscriptions: SubcontractorSubscription[]): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(subscriptions));
    } catch (error) {
      console.error('Error saving subcontractor subscriptions:', error);
    }
  }

  /**
   * Initialize demo subscriptions (for testing)
   */
  initializeDemoData(): void {
    const existing = this.getAllSubscriptions();
    if (existing.length > 0) return;
    
    // Create a demo subscription
    this.createSubscription({
      subcontractor_id: 'demo_sub_001',
      subcontractor_name: 'Demo Subcontractor',
      subcontractor_email: 'demo@subcontractor.com',
      plan_id: 'pro',
      status: 'active',
      billing_cycle: 'monthly',
      usage: {
        design_projects: 5,
        ai_ad_credits_used: 23,
        social_posts_used: 0,
        storage_used_gb: 2.4,
      },
    });
  }
}

// Export singleton instance
export const subcontractorSubscriptionService = new SubcontractorSubscriptionService();

// Export types
export type { PlanFeatures };
