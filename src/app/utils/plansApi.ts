/**
 * plansApi — thin client for the /plans server routes.
 * Handles create, list/search, single fetch, usage logging, and stats.
 */

import { projectId, publicAnonKey } from './supabase/info';
import { supabase } from '../lib/supabase';

const BASE = `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6`;

async function authHeaders() {
  const { data: { session } } = await supabase.auth.getSession();
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${session?.access_token || publicAnonKey}`,
  };
}

export interface PlanGiftCard { code: string; amount: number; balance: number; reason: string; issuedAt: string; }
export interface PlanPromotion { code: string; name: string; discount: string; }
export interface PlanOffer { code: string; title: string; description: string; }
export interface PlanHours { included: number; used: number; overageRate: number; bankId?: string; }

export interface PlanRecord {
  id: string;
  planName: string;
  portalType: string;
  entity: string;
  skillId: string;
  frequencyId: string;
  serviceIds: string[];
  serviceNames: string[];
  monthlyTotal: number;
  annualTotal: number;
  owner: string | null;
  ownerEmail?: string | null;
  source: string;
  status: 'active' | 'paused' | 'cancelled';
  createdAt: string;
  updatedAt: string;
  hours: PlanHours;
  giftCards: PlanGiftCard[];
  promotions: PlanPromotion[];
  offers: PlanOffer[];
  rewards?: { points: number };
  history?: { ts: string; type: string; note: string }[];
}

export async function createPlan(input: Partial<PlanRecord>): Promise<PlanRecord> {
  const res = await fetch(`${BASE}/plans`, {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify(input),
  });
  const data = await res.json();
  if (!res.ok || !data.success) throw new Error(data?.error || `Failed to save plan (${res.status})`);
  return data.plan as PlanRecord;
}

export async function listPlans(params: {
  search?: string; owner?: string; portalType?: string; status?: string;
} = {}): Promise<PlanRecord[]> {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => { if (v) qs.set(k, String(v)); });
  const res = await fetch(`${BASE}/plans?${qs.toString()}`, { headers: await authHeaders() });
  const data = await res.json();
  if (!res.ok || !data.success) throw new Error(data?.error || `Failed to load plans (${res.status})`);
  return (data.plans || []) as PlanRecord[];
}

/**
 * Bridge plan-issued gift cards into the Gift Cards page store (`bp_gift_cards`)
 * so they appear under "My Cards" and are redeemable there. Idempotent by code.
 */
export function bridgePlanGiftCards(plan: PlanRecord): number {
  const KEY = 'bp_gift_cards';
  try {
    const existing: any[] = JSON.parse(localStorage.getItem(KEY) || '[]');
    const byCode = new Set(existing.map(c => c.code));
    let added = 0;
    for (const g of plan.giftCards || []) {
      if (byCode.has(g.code)) continue;
      existing.unshift({
        code: g.code,
        amount: g.amount,
        balance: g.balance,
        from: 'Black Phoenix Rewards',
        to: plan.owner || 'You',
        message: g.reason || 'Thanks for building a plan!',
        purchasedAt: g.issuedAt,
        design: 'celebrate',
      });
      byCode.add(g.code);
      added++;
    }
    localStorage.setItem(KEY, JSON.stringify(existing));
    return added;
  } catch {
    return 0;
  }
}

/** Log hours used against a plan (ties into the shared hours source of truth). */
export async function logPlanUsage(
  planId: string,
  entry: { hours: number; description?: string; tech?: string; date?: string },
): Promise<PlanHours> {
  const res = await fetch(`${BASE}/plans/${planId}/usage`, {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify(entry),
  });
  const data = await res.json();
  if (!res.ok || !data.success) throw new Error(data?.error || `Failed to log usage (${res.status})`);
  return data.hours as PlanHours;
}

/** Start a verified Stripe checkout for an invoice. Completion is confirmed server-side. */
export async function createInvoiceCheckout(invoiceId: string, description?: string): Promise<{ paymentId: string; checkoutUrl: string }> {
  const res = await fetch(`${BASE}/payments/create-checkout`, {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify({ invoiceId, description }),
  });
  const data = await res.json();
  if (!res.ok || !data.success || !data.checkoutUrl) throw new Error(data?.error || `Failed to start payment (${res.status})`);
  return { paymentId: data.paymentId, checkoutUrl: data.checkoutUrl };
}

export async function getPlanStats(): Promise<{
  total: number; active: number; mrr: number; giftIssued: number; hoursIncluded: number; hoursUsed: number;
}> {
  const res = await fetch(`${BASE}/plans-stats`, { headers: await authHeaders() });
  const data = await res.json();
  if (!res.ok || !data.success) throw new Error(data?.error || `Failed to load plan stats (${res.status})`);
  return data.stats;
}
