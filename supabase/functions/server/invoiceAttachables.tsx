/**
 * invoiceAttachables — everything that can be put against one invoice.
 *
 * WHY ONE ENDPOINT
 *
 * Five separate things can reduce what somebody pays: a discount grant, a
 * promotion, a gift card, banked plan hours, and a plan add-on. They live in
 * five different stores and nothing could list them together, so there was
 * nothing to search and no way to apply more than one.
 *
 * WHY THE SERVER DECIDES
 *
 * A browser knows neither what somebody pays for, nor what an administrator
 * granted them, nor what is left on a card. Asking it would mean trusting the
 * party with the most reason to be wrong. So this resolves everything and the
 * screen only renders what comes back.
 *
 * WHAT EACH ONE DOES, WHICH IS NOT THE SAME THING
 *
 * A DISCOUNT changes what is owed. It belongs on the invoice before it is sent
 * and it is the company's decision.
 *
 * A GIFT CARD and BANKED HOURS are not discounts — they are money and time the
 * customer already holds. Applying either reduces the BALANCE, not the total.
 * The invoice still says what was agreed, and what has been settled against it
 * is a separate column. Rewriting the total instead would quietly change a
 * figure the customer has already been shown.
 *
 * WHAT A CUSTOMER MAY SEE
 *
 * Their own. A customer asking about somebody else's invoice is refused; a
 * customer asking about their own sees their own cards and their own hours.
 * Staff see the same list plus the grants, because grants are the company's
 * business and a customer does not need to know what they were nearly given.
 */
import { Hono } from "npm:hono@4";
import * as kv from "./kv_store.tsx";

export const invoiceAttachablesRouter = new Hono();
const PREFIX = "/make-server-3eae23a6";

const money = (value: unknown): number => {
  const n = Number(value);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0;
};

/**
 * What an hour is worth against a bill.
 *
 * Read from the plan rather than assumed, because a plan that bills overage at
 * $95 and one that bills it at $145 do not credit an hour the same way. Falls
 * back to the overage rate, which is the only rate a plan is guaranteed to
 * carry.
 */
function hourValue(plan: any): number {
  return money(
    plan?.hours?.hourlyRate ?? plan?.maintenance?.hourlyRate
    ?? plan?.hours?.overageRate ?? plan?.maintenance?.overageRate ?? 0,
  );
}

export interface Attachable {
  kind: "grant" | "promotion" | "giftcard" | "hours" | "addon";
  id: string;
  label: string;
  /** What it does to the bill, in plain words, for somebody choosing. */
  detail: string;
  /** A percentage off, where that is what it is. */
  percent?: number;
  /** Money it can cover, where that is what it is. */
  amount?: number;
  /** Hours it can cover, and what they are worth. */
  hours?: number;
  /** Whether it reduces the TOTAL (a discount) or the BALANCE (money held). */
  reduces: "total" | "balance";
}

/**
 * Everything applicable to this customer, and to this job where one is named.
 *
 * `forStaff` adds the things a customer should not be shown.
 */
export async function attachablesFor(
  email: string,
  opts: { jobId?: string; forStaff?: boolean } = {},
): Promise<Attachable[]> {
  const who = String(email || "").toLowerCase().trim();
  if (!who) return [];

  const out: Attachable[] = [];

  /* ── gift cards they hold ──────────────────────────────────────────────── */
  try {
    const codes: string[] = (await kv.get(`giftcard_owner:${who}`)) || [];
    for (const code of codes) {
      const card = (await kv.get(`giftcard:${code}`)) as any;
      if (!card || card.status !== "active") continue;
      const balance = money(card.balance);
      if (balance <= 0) continue;
      out.push({
        kind: "giftcard",
        id: code,
        label: `Gift card ${code}`,
        detail: `$${balance.toFixed(2)} remaining`,
        amount: balance,
        reduces: "balance",
      });
    }
  } catch { /* a card store that will not read must not empty the whole list */ }

  /* ── hours they have already paid for ──────────────────────────────────── */
  try {
    const plans = ((await kv.getByPrefix("plan:")) || []) as any[];
    const theirs = plans.filter(
      (plan) => String(plan?.ownerEmail || "").toLowerCase() === who && plan?.status === "active",
    );
    for (const plan of theirs) {
      const balance = (await kv.get(`entitlement_balance:${plan.id}`)) as any;
      /**
       * The ledger is the truth about hours, and the plan's own counter is the
       * fallback for a plan whose hours were never posted through it. Reading
       * the plan first would prefer a number nothing reconciles.
       */
      const remaining = balance
        ? money(balance.hoursRemaining)
        : Math.max(0, money(plan?.hours?.included) - money(plan?.hours?.used));
      if (remaining <= 0) continue;
      const rate = hourValue(plan);
      out.push({
        kind: "hours",
        id: plan.id,
        label: `${remaining} hour${remaining === 1 ? "" : "s"} on ${plan.planName || plan.name || "your plan"}`,
        detail: rate > 0
          ? `Worth $${money(remaining * rate).toFixed(2)} at $${rate.toFixed(2)} an hour`
          : "Already paid for on your plan",
        hours: remaining,
        amount: rate > 0 ? money(remaining * rate) : undefined,
        reduces: "balance",
      });
    }
  } catch { /* as above */ }

  /* ── what the company has granted them ─────────────────────────────────── */
  if (opts.forStaff) {
    try {
      const grants = ((await kv.getByPrefix("discount_grant:")) || []) as any[];
      const now = Date.now();
      for (const grant of grants) {
        if (!grant || grant.revokedAt) continue;
        const scopeId = String(grant.scopeId || "").toLowerCase();
        const applies =
          (grant.scope === "customer" && scopeId === who) ||
          (grant.scope === "job" && opts.jobId && scopeId === String(opts.jobId).toLowerCase());
        if (!applies) continue;
        const ends = grant.endsAt ? new Date(grant.endsAt).getTime() : null;
        if (ends !== null && Number.isFinite(ends) && ends < now) continue;
        out.push({
          kind: "grant",
          id: String(grant.id || scopeId),
          label: `${money(grant.percent)}% granted`,
          detail: String(grant.reason || "Granted discount"),
          percent: money(grant.percent),
          reduces: "total",
        });
      }
    } catch { /* as above */ }
  }

  return out;
}

invoiceAttachablesRouter.get(`${PREFIX}/invoice-attachables`, async (c) => {
  try {
    const actor = c.get("actor");
    if (!actor?.email) return c.json({ success: false, error: "Sign in required." }, 401);
    const isStaff = Boolean(c.get("admin"));

    const asked = String(c.req.query("email") || "").toLowerCase().trim();
    /**
     * A customer may only ask about themselves. Staff may ask about anybody,
     * because raising an invoice for somebody is their job.
     */
    const email = asked && isStaff ? asked : String(actor.email).toLowerCase();

    const items = await attachablesFor(email, {
      jobId: c.req.query("jobId") || undefined,
      forStaff: isStaff,
    });

    return c.json({ success: true, email, attachables: items });
  } catch (error: any) {
    return c.json({ success: false, error: error?.message || "Could not list what can be applied." }, 500);
  }
});

export default invoiceAttachablesRouter;
