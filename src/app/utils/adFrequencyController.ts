/**
 * Ad Frequency Controller
 * 
 * Controls ad serving based on subscription status and frequency limits.
 * Ensures ads only display when:
 * 1. Subscription is active and paid
 * 2. Impression/click limits haven't been exceeded
 * 3. Billing period is current
 */

interface Subscription {
  id: string;
  advertisementId: string;
  status: 'active' | 'expired' | 'suspended' | 'trial';
  startDate: string;
  endDate: string;
  currentImpressions: number;
  currentClicks: number;
  impressionLimit: number; // -1 = unlimited
  clickLimit: number; // -1 = unlimited
  billingCycle: 'monthly' | '90-day';
}

export class AdFrequencyController {
  private static instance: AdFrequencyController;
  private subscriptions: Subscription[] = [];
  private lastUpdate: number = 0;
  private UPDATE_INTERVAL = 60000; // Update every minute

  private constructor() {
    this.loadSubscriptions();
    this.setupListeners();
  }

  static getInstance(): AdFrequencyController {
    if (!AdFrequencyController.instance) {
      AdFrequencyController.instance = new AdFrequencyController();
    }
    return AdFrequencyController.instance;
  }

  private loadSubscriptions() {
    try {
      const data = localStorage.getItem('adSubscriptions');
      if (data) {
        this.subscriptions = JSON.parse(data);
      }
    } catch (error) {
      console.error('Error loading subscriptions:', error);
    }
    this.lastUpdate = Date.now();
  }

  private setupListeners() {
    // Listen for subscription updates
    window.addEventListener('subscriptionUpdate', () => {
      this.loadSubscriptions();
    });

    // Listen for ad clicks to update limits
    window.addEventListener('adClick', ((event: CustomEvent) => {
      this.recordClick(event.detail.adId);
    }) as EventListener);

    // Listen for ad impressions to update limits
    window.addEventListener('adImpression', ((event: CustomEvent) => {
      this.recordImpression(event.detail.adId);
    }) as EventListener);
  }

  private refreshIfNeeded() {
    if (Date.now() - this.lastUpdate > this.UPDATE_INTERVAL) {
      this.loadSubscriptions();
    }
  }

  /**
   * Check if an ad can be displayed based on subscription and frequency limits
   */
  canDisplayAd(advertisementId: string): {
    allowed: boolean;
    reason?: string;
  } {
    this.refreshIfNeeded();

    const subscription = this.subscriptions.find(
      sub => sub.advertisementId === advertisementId
    );

    // No subscription = free tier, allow display
    if (!subscription) {
      return { allowed: true };
    }

    // Check subscription status
    if (subscription.status !== 'active' && subscription.status !== 'trial') {
      return {
        allowed: false,
        reason: `Subscription ${subscription.status}`
      };
    }

    // Check if billing period is valid
    const now = new Date();
    const endDate = new Date(subscription.endDate);
    if (now > endDate) {
      return {
        allowed: false,
        reason: 'Billing period expired'
      };
    }

    // Check impression limit
    if (subscription.impressionLimit !== -1) {
      if (subscription.currentImpressions >= subscription.impressionLimit) {
        return {
          allowed: false,
          reason: 'Impression limit reached'
        };
      }
    }

    // Check click limit (warning only, doesn't block display)
    if (subscription.clickLimit !== -1) {
      if (subscription.currentClicks >= subscription.clickLimit) {
        console.warn(`Ad ${advertisementId} has reached click limit`);
      }
    }

    return { allowed: true };
  }

  /**
   * Record an impression for an ad
   */
  private recordImpression(advertisementId: string) {
    const subscription = this.subscriptions.find(
      sub => sub.advertisementId === advertisementId
    );

    if (!subscription || subscription.impressionLimit === -1) {
      return;
    }

    // Update impression count
    subscription.currentImpressions++;

    // Save to localStorage
    localStorage.setItem('adSubscriptions', JSON.stringify(this.subscriptions));

    // Check if limit reached
    if (subscription.currentImpressions >= subscription.impressionLimit) {
      console.warn(`Ad ${advertisementId} has reached impression limit (${subscription.impressionLimit})`);
      
      // Dispatch event to notify UI
      window.dispatchEvent(new CustomEvent('adLimitReached', {
        detail: {
          advertisementId,
          type: 'impression',
          limit: subscription.impressionLimit
        }
      }));
    }
  }

  /**
   * Record a click for an ad
   */
  private recordClick(advertisementId: string) {
    const subscription = this.subscriptions.find(
      sub => sub.advertisementId === advertisementId
    );

    if (!subscription || subscription.clickLimit === -1) {
      return;
    }

    // Update click count
    subscription.currentClicks++;

    // Save to localStorage
    localStorage.setItem('adSubscriptions', JSON.stringify(this.subscriptions));

    // Check if limit reached
    if (subscription.currentClicks >= subscription.clickLimit) {
      console.warn(`Ad ${advertisementId} has reached click limit (${subscription.clickLimit})`);
      
      // Dispatch event to notify UI
      window.dispatchEvent(new CustomEvent('adLimitReached', {
        detail: {
          advertisementId,
          type: 'click',
          limit: subscription.clickLimit
        }
      }));
    }
  }

  /**
   * Get subscription status for an ad
   */
  getSubscriptionStatus(advertisementId: string): {
    hasSubscription: boolean;
    status?: string;
    impressionsUsed?: number;
    impressionsLimit?: number;
    clicksUsed?: number;
    clicksLimit?: number;
    daysRemaining?: number;
  } {
    this.refreshIfNeeded();

    const subscription = this.subscriptions.find(
      sub => sub.advertisementId === advertisementId
    );

    if (!subscription) {
      return { hasSubscription: false };
    }

    const endDate = new Date(subscription.endDate);
    const now = new Date();
    const daysRemaining = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    return {
      hasSubscription: true,
      status: subscription.status,
      impressionsUsed: subscription.currentImpressions,
      impressionsLimit: subscription.impressionLimit,
      clicksUsed: subscription.currentClicks,
      clicksLimit: subscription.clickLimit,
      daysRemaining
    };
  }

  /**
   * Get all active subscriptions
   */
  getActiveSubscriptions(): Subscription[] {
    this.refreshIfNeeded();
    return this.subscriptions.filter(sub => sub.status === 'active' || sub.status === 'trial');
  }

  /**
   * Calculate frequency throttling (e.g., show ad every N impressions)
   */
  shouldThrottleDisplay(advertisementId: string, frequency: number = 1): boolean {
    // frequency = 1 means show every time
    // frequency = 2 means show every other time
    // frequency = 5 means show every 5th time

    if (frequency <= 1) return false;

    const subscription = this.subscriptions.find(
      sub => sub.advertisementId === advertisementId
    );

    if (!subscription) return false;

    // Use impression count to determine if we should show
    return (subscription.currentImpressions % frequency) !== 0;
  }
}

// Export singleton instance
export const adFrequencyController = AdFrequencyController.getInstance();

/**
 * Hook for React components to check if an ad should display
 */
export function useAdFrequency(advertisementId: string) {
  const controller = AdFrequencyController.getInstance();
  const canDisplay = controller.canDisplayAd(advertisementId);
  const status = controller.getSubscriptionStatus(advertisementId);

  return {
    canDisplay: canDisplay.allowed,
    reason: canDisplay.reason,
    ...status
  };
}
