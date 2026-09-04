/**
 * A ceiling on what one account can spend on model calls.
 *
 * WHY IT EXISTS
 *
 * These routes are gated on being signed in, not on being staff — every portal
 * customer, vendor, subcontractor and tenant with an account can reach them.
 * An image is roughly twenty cents of `gpt-image-1` at high quality and a
 * blueprint read is a vision call over several full-size sheets. An unbounded
 * loop against any of them is simply a bill.
 *
 * WHY IT LIVES HERE RATHER THAN IN ONE ROUTE FILE
 *
 * It was written inside `house-capture.tsx` and worked, and then a second
 * expensive route needed the same thing. Copying it would have produced two
 * ceilings to keep in agreement, and the one that drifted would be the one
 * nobody was watching. There is one implementation and the caller names its
 * bucket.
 *
 * THE RULES THAT MAKE IT A LIMIT
 *
 * Counted on the server against the user id from the verified token. A limit
 * the browser enforces is not a limit — the client decides nothing here.
 *
 * Reserved before the call and refunded if it fails, rather than charged on
 * success. Charging afterwards lets a burst of parallel requests all pass the
 * same check before any of them has been counted.
 *
 * Staff are waived, and staffness is read from `app_metadata` only. This gate
 * decides who spends money without limit, so a self-assigned role would be
 * somebody else spending ours.
 */
import * as kv from "./kv_store.tsx";
import { trustedRole } from "./trustedRole.ts";

/** What is being spent. Each bucket has its own counter and its own ceiling. */
export type SpendBucket = "render" | "blueprint" | "ai";

export const DEFAULT_LIMITS: Record<SpendBucket, number> = {
  /**
   * Everything else that calls a model: writing copy, analysing a photo,
   * drafting a quote, scripting a reel.
   *
   * One call is cents rather than the twenty a render costs, so the ceiling is
   * far higher — this is a runaway loop backstop, not a quota anybody should
   * meet in normal use. If a real customer hits 300 model calls, that is worth
   * a conversation rather than a silent bill.
   */
  ai: 300,
  render: 10,
  // Set by Eric at 120 SHEETS, chosen so it works out at roughly thirty real
  // drawing sets — a set runs about four sheets. The unit is the sheet because
  // that is what costs money; the intent was thirty drawings, and this is what
  // thirty drawings costs. Do not "tidy" it to 30 without changing the unit.
  blueprint: 120,
};

/**
 * Storage keys.
 *
 * `render` keeps its original un-prefixed shape deliberately. Those counters
 * are live in production and renaming them would silently reset every
 * customer's usage to zero — which is not a migration, it is a gift of free
 * renders that nobody would notice until the bill.
 */
export function budgetKey(bucket: SpendBucket, userId: string): string {
  return bucket === "render"
    ? `render_budget:${userId}`
    : `${bucket}_budget:${userId}`;
}

export function limitKey(bucket: SpendBucket, userId: string): string {
  return bucket === "render"
    ? `render_budget_limit:${userId}`
    : `${bucket}_budget_limit:${userId}`;
}

const STAFF_ROLES = new Set([
  "admin", "owner", "super_admin", "superadmin", "staff", "employee",
  "project_manager", "estimator", "office",
]);

export function isStaff(user: any): boolean {
  return STAFF_ROLES.has(trustedRole(user));
}

/**
 * The decision itself, kept pure so the boundary can be tested.
 *
 * Getting this off by one either turns paying customers away a call early or
 * lets every account spend more than intended, and neither is visible by
 * reading it.
 */
export function budgetDecision(used: number, limit: number, n: number):
  { allowed: true } | { allowed: false; error: string } {
  if (used + n <= limit) return { allowed: true };
  const left = Math.max(0, limit - used);
  return {
    allowed: false,
    error: left === 0
      ? `You have used all ${limit} of your renders. Get in touch and we will open up some more.`
      : `That would take ${n} renders and you have ${left} left. Try a single render, or get in touch and we will open up some more.`,
  };
}

/** The same decision, worded for a bucket that is not images. */
export function spendDecision(used: number, limit: number, n: number, noun: string):
  { allowed: true } | { allowed: false; error: string } {
  if (used + n <= limit) return { allowed: true };
  const left = Math.max(0, limit - used);
  return {
    allowed: false,
    error: left === 0
      ? `You have used all ${limit} of your ${noun}. Get in touch and we will open up some more.`
      : `That would take ${n} ${noun} and you have ${left} left. Get in touch and we will open up some more.`,
  };
}

/**
 * Take `n` out of this account's allowance for a bucket.
 *
 * Returns null when allowed, or a body when refused — worded so somebody who
 * has simply been working gets a way forward rather than a failure they cannot
 * interpret.
 */
export async function reserve(
  user: any, bucket: SpendBucket, n: number, noun = "renders",
): Promise<{ error: string; used: number; limit: number } | null> {
  if (isStaff(user)) return null;

  const id = String(user?.id || "");
  if (!id) return { error: "Sign in required.", used: 0, limit: 0 };

  // A per-account override, so Eric can lift the ceiling for one customer
  // without changing it for everybody.
  const override = Number(await kv.get(limitKey(bucket, id))) || 0;
  const limit = override > 0 ? override : DEFAULT_LIMITS[bucket];

  const used = Number(await kv.get(budgetKey(bucket, id))) || 0;
  const verdict = bucket === "render"
    ? budgetDecision(used, limit, n)
    : spendDecision(used, limit, n, noun);
  if (!verdict.allowed) {
    // Narrowed by hand. This project's server config runs with strictNullChecks
    // off, which switches off discriminated-union narrowing on a boolean, so
    // `verdict.error` after `if (!verdict.allowed)` does not typecheck. The
    // version of this that lived in house-capture carried that as a standing
    // finding; it is fixed rather than moved.
    const refused = verdict as { allowed: false; error: string };
    return { error: refused.error, used, limit };
  }

  await kv.set(budgetKey(bucket, id), used + n);
  return null;
}

/** Give back what was reserved for a call that never happened. */
export async function refund(user: any, bucket: SpendBucket, n: number): Promise<void> {
  if (isStaff(user)) return;
  const id = String(user?.id || "");
  if (!id) return;
  const used = Number(await kv.get(budgetKey(bucket, id))) || 0;
  await kv.set(budgetKey(bucket, id), Math.max(0, used - n));
}
