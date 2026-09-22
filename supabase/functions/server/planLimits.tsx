/**
 * planLimits — the one place a tier's ceiling is actually applied.
 *
 * `limits` has been recorded on tiers for a while and enforced nowhere, so a
 * plan could promise "Up to 250 catalogue products" and nothing stopped the
 * 251st. A limit nothing reads is a promise the software does not keep, and the
 * customer who discovers it is the one who paid for the tier above.
 *
 * WHAT THIS DELIBERATELY DOES NOT DO
 *
 * Refuse people it cannot place. A caller with no resolvable subscription is
 * ALLOWED through, and the fact is logged. That is the wrong answer
 * commercially and the right one operationally: vendors are already using this
 * platform without a plan, and the alternative is locking every one of them out
 * of their own catalogue the moment this deploys.
 *
 * Eric's standing rule is that every path onto the platform must be proven
 * before real people meet it. Failing closed here would break paths that work
 * today, silently, for everybody at once. So the gate bites only where a tier
 * is genuinely resolved, and the log says how often it does not — which is the
 * number to look at before tightening it.
 */
import { createClient } from "npm:@supabase/supabase-js@2";
import * as kv from "./kv_store.tsx";
import { resolveEntitlement, withinLimit, type PlanTier } from "./planTier.ts";

const admin = createClient(
  Deno.env.get("SUPABASE_URL") || "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "",
);

export interface LimitVerdict {
  allowed: boolean;
  /** The ceiling that applied, or null when none did. */
  limit: number | null;
  used: number;
  tierId: string | null;
  tierName: string | null;
  /** A sentence to show the person who was refused. Null when allowed. */
  reason: string | null;
  /** Why no ceiling applied, for the log rather than the customer. */
  unenforced: string | null;
}

const ALLOW = (used: number, unenforced: string): LimitVerdict => ({
  allowed: true, limit: null, used, tierId: null, tierName: null,
  reason: null, unenforced,
});

/**
 * May this account add one more of something?
 *
 * `used` is the count the caller has already worked out, because only the
 * caller knows how to count its own things — products under a vendor, deals
 * live for an advertiser. This decides, it does not count.
 */
export async function checkPlanLimit(opts: {
  email: string;
  /** Which limit: products, deals, bidQuotesPerMonth, seats… */
  key: string;
  used: number;
  /** Staff are not held to a customer's ceiling. */
  exempt?: boolean;
}): Promise<LimitVerdict> {
  const { key, used } = opts;
  const email = String(opts.email || "").trim().toLowerCase();

  if (opts.exempt) return ALLOW(used, "staff are exempt");
  if (!email) return ALLOW(used, "no account resolved");

  let grant: any = null;
  try {
    grant = await kv.get(`feature_grant:${email}`);
  } catch {
    // A ceiling we cannot read is not a ceiling we can enforce. Allowing is the
    // only outcome that does not punish somebody for our storage being slow.
    return ALLOW(used, "grant could not be read");
  }

  const entitlement = resolveEntitlement(grant);
  if (entitlement.source !== "subscription" || !grant?.tierId || !grant?.portalType) {
    return ALLOW(used, `no paid tier resolved (source: ${entitlement.source})`);
  }

  const tier = (await kv.get(`plan_tier:${grant.portalType}:${grant.tierId}`)) as PlanTier | null;
  if (!tier) return ALLOW(used, `tier ${grant.portalType}/${grant.tierId} no longer exists`);

  const raw = tier.limits?.[key];
  if (raw === undefined || raw === null) {
    return ALLOW(used, `tier ${tier.name} publishes no ${key} limit`);
  }

  // Zero is unlimited — the convention the editor, the assistant and the vendor
  // tiers all use. withinLimit is the single place that reading lives.
  if (withinLimit(tier, key, used)) {
    return {
      allowed: true,
      limit: Number(raw) > 0 ? Number(raw) : null,
      used,
      tierId: String(tier.id),
      tierName: String(tier.name),
      reason: null,
      unenforced: null,
    };
  }

  const ceiling = Number(raw);
  return {
    allowed: false,
    limit: ceiling,
    used,
    tierId: String(tier.id),
    tierName: String(tier.name),
    /**
     * Says the plan, the number, and what to do about it.
     *
     * A bare "limit reached" makes somebody hunt for which limit and which
     * plan. Naming the tier is also the only honest way to offer the upgrade:
     * they are being refused because of what they bought, so they should be
     * told what they bought.
     */
    reason: `Your ${tier.name} plan includes ${ceiling} ${key === "products" ? "catalogue products" : key}`
      + `, and you have ${used}. Upgrade the plan to add more.`,
    unenforced: null,
  };
}

/**
 * The same question, answered for a vendor by their vendor id.
 *
 * A vendor's catalogue is keyed by vendorId and their plan by email, so
 * something has to bridge the two. Kept here so each route does not grow its
 * own version of the lookup.
 */
export async function vendorEmailFor(vendorId: string): Promise<string> {
  if (!vendorId) return "";
  try {
    const vendor = (await kv.get(`vendor:${vendorId}`)) as any;
    return String(vendor?.email || vendor?.contactEmail || vendor?.ownerEmail || "")
      .trim().toLowerCase();
  } catch {
    return "";
  }
}

/** Count what a vendor already has in their catalogue. */
export async function vendorProductCount(vendorId: string): Promise<number> {
  try {
    const rows = ((await kv.getByPrefix(`vendor_catalog:${vendorId}:`)) as any[] || [])
      .filter(Boolean);
    return rows.length;
  } catch {
    return 0;
  }
}

export { admin as limitsAdminClient };
