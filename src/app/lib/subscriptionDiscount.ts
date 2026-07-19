/**
 * Subscription / Maintenance Plan → Contract Job Discount
 *
 * SINGLE SOURCE OF TRUTH for the loyalty discount that active subscribers and
 * maintenance-plan members receive on contract jobs / quotes:
 *
 *   starter (Basic)        → 5% off
 *   professional (Standard) → 10% off
 *   enterprise (Premium)    → 15% off
 *
 * A customer's membership is stored server-side keyed by EMAIL (business-wide,
 * not user-scoped) so it can be resolved even in anonymous, token-based flows
 * such as the customer quote-approval page. Falls back to localStorage.
 */
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { ALL_SUBSCRIPTION_PLANS, type SubscriptionPlan } from '../config/subscriptionPlans';

const SERVER = `https://${projectId}.supabase.co/functions/v1/make-server-57095a78`;

export type PlanTier = 'starter' | 'professional' | 'enterprise';

/** Tier → percent off contract jobs. The one place these numbers live. */
export const CONTRACT_DISCOUNT_BY_TIER: Record<PlanTier, number> = {
  starter: 5,
  professional: 10,
  enterprise: 15,
};

export interface CustomerMembership {
  planId?: string;
  planName?: string;
  tier?: PlanTier;
  status?: 'active' | 'paused' | 'cancelled';
  source?: 'subscription' | 'maintenance';
  updatedAt?: string;
}

const cacheKey = (email: string) => `customer_membership_${email.toLowerCase()}`;
const serverKey = (email: string) => `customer_membership:${email.toLowerCase()}`;

/** Resolve a plan's tier from its id using the shared plan catalog. */
export function tierForPlanId(planId?: string): PlanTier | undefined {
  if (!planId) return undefined;
  const plan = ALL_SUBSCRIPTION_PLANS.find((p: SubscriptionPlan) => p.id === planId);
  return plan?.tier;
}

/** Percent off contract jobs for a given tier (0 if none). */
export function contractDiscountForTier(tier?: PlanTier): number {
  return tier ? (CONTRACT_DISCOUNT_BY_TIER[tier] ?? 0) : 0;
}

/** Percent off contract jobs for a membership, honoring active status. */
export function contractDiscountForMembership(m?: CustomerMembership | null): number {
  if (!m || m.status === 'cancelled' || m.status === 'paused') return 0;
  const tier = m.tier || tierForPlanId(m.planId);
  return contractDiscountForTier(tier);
}

/** Human label for a tier. */
export function planTierLabel(tier?: PlanTier): string {
  switch (tier) {
    case 'starter': return 'Basic';
    case 'professional': return 'Standard';
    case 'enterprise': return 'Premium';
    default: return '';
  }
}

const headers = {
  'Content-Type': 'application/json',
  Authorization: `Bearer ${publicAnonKey}`,
};

/** Load a customer's membership by email (server first, localStorage fallback). */
export async function loadCustomerMembership(email?: string): Promise<CustomerMembership | null> {
  if (!email) return null;
  try {
    const res = await fetch(`${SERVER}/kv/get/${encodeURIComponent(serverKey(email))}`, { headers });
    if (res.ok) {
      const data = await res.json();
      if (data && data.value) {
        try { localStorage.setItem(cacheKey(email), JSON.stringify(data.value)); } catch {}
        return data.value as CustomerMembership;
      }
    }
  } catch (err) {
    console.error('loadCustomerMembership: server read failed:', err);
  }
  try {
    const raw = localStorage.getItem(cacheKey(email));
    if (raw) return JSON.parse(raw) as CustomerMembership;
  } catch {}
  return null;
}

/** Persist a customer's membership by email (server + localStorage). */
export async function saveCustomerMembership(email: string, membership: CustomerMembership): Promise<void> {
  if (!email) return;
  const value: CustomerMembership = { ...membership, updatedAt: new Date().toISOString() };
  try { localStorage.setItem(cacheKey(email), JSON.stringify(value)); } catch {}
  try {
    await fetch(`${SERVER}/kv/set`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ key: serverKey(email), value }),
    });
  } catch (err) {
    console.error('saveCustomerMembership: server write failed:', err);
  }
}

/** Convenience: active contract-job discount percent for a customer email. */
export async function getActiveContractDiscount(email?: string): Promise<number> {
  const m = await loadCustomerMembership(email);
  return contractDiscountForMembership(m);
}
