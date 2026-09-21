/**
 * discount-grants — the discounts an administrator hands out, and the one
 * place that works out what somebody actually gets.
 *
 * The arithmetic lives in `discounts.ts`, which is pure and tested. This is the
 * storage and authority half: who may grant, where grants live, and how a
 * figure is assembled from the plan somebody pays for plus the grants aimed at
 * them.
 *
 * WHY GRANTS ARE KEYED BY SCOPE
 *
 * `discount_grant:{scope}:{scopeId}:{id}`. Resolving a discount then reads at
 * most three short prefixes — this customer, this job, this quote — instead of
 * scanning every grant ever made and filtering. It also makes the common
 * question ("what has this customer got?") a direct read.
 *
 * WHAT THIS REPLACES
 *
 * `src/app/lib/subscriptionDiscount.ts`, which fell back to a `localStorage`
 * value the customer owned, could never reach the server because it called
 * `/kv/get/{key}` where the route reads `?key=`, and looked for a
 * `customer_membership` record nothing has ever written. A paying subscriber
 * got nothing while anyone editing one browser value took 15% off the margin.
 *
 * So: resolved on the server, from the entitlement the payment wrote, every
 * time. The client is told a number and never supplies one.
 */
import { Hono } from "npm:hono@4";
import { createClient } from "npm:@supabase/supabase-js@2";
import * as kv from "./kv_store.tsx";
import { resolveEntitlement, type PlanTier } from "./planTier.ts";
import {
  resolveDiscount, capFor, grantApplies,
  type DiscountGrant, type DiscountContext, type DiscountScope, type ResolvedDiscount,
} from "./discounts.ts";

export const discountGrantsRouter = new Hono();

const admin = createClient(
  Deno.env.get("SUPABASE_URL") || "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "",
);

const ADMIN_ROLES = new Set(["owner", "admin", "master_admin", "management"]);
const STAFF_ROLES = new Set([...ADMIN_ROLES, "employee", "staff"]);

const GRANT_KEY = (scope: string, scopeId: string, id: string) =>
  `discount_grant:${scope}:${String(scopeId).toLowerCase()}:${id}`;
const SCOPE_PREFIX = (scope: string, scopeId: string) =>
  `discount_grant:${scope}:${String(scopeId).toLowerCase()}:`;

async function actor(c: any) {
  const token = String(c.req.header("Authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const { data: { user }, error } = await admin.auth.getUser(token);
  if (error || !user) return null;
  const role = String(user.app_metadata?.role || user.app_metadata?.accountType || "")
    .toLowerCase().replace(/[\s-]+/g, "_");
  return {
    email: String(user.email || "").toLowerCase(),
    isAdmin: ADMIN_ROLES.has(role),
    isStaff: STAFF_ROLES.has(role),
  };
}

/* ── resolving ────────────────────────────────────────────────────────────── */

/**
 * What discount applies, for this person, on this thing.
 *
 * Exported because two callers need exactly this answer and must not each
 * work it out: the route below, for a signed-in portal, and the by-token quote
 * route, where the customer is reading a link and may not be signed in at all.
 *
 * The plan half comes from the entitlement the Stripe webhook wrote — the same
 * chain `/my-plan` reads — so the discount is tied to what is genuinely being
 * paid for rather than to a record kept alongside it.
 */
export async function resolveDiscountFor(opts: {
  customerEmail?: string | null;
  jobId?: string | null;
  quoteId?: string | null;
  context?: DiscountContext;
  seatNumber?: number | null;
  now?: Date;
}): Promise<ResolvedDiscount & { planTierId: string | null }> {
  const now = opts.now || new Date();
  const email = String(opts.customerEmail || "").trim().toLowerCase();

  // ── the plan they are actually paying for ──
  let planPercent = 0;
  let planTierId: string | null = null;
  if (email) {
    try {
      const grant = (await kv.get(`feature_grant:${email}`)) as any;
      const entitlement = resolveEntitlement(grant, now);
      if (entitlement.source === "subscription" && grant?.tierId && grant?.portalType) {
        const tier = (await kv.get(`plan_tier:${grant.portalType}:${grant.tierId}`)) as PlanTier | null;
        if (tier && tier.active !== false) {
          planPercent = Number(tier.discountPercent || 0);
          planTierId = String(tier.id || "");
        }
      }
    } catch {
      // A discount that cannot be resolved is zero, never a remembered value.
      planPercent = 0;
    }
  }

  // ── grants aimed at them, this job, or this quote ──
  const wanted: Array<[DiscountScope, string]> = [];
  if (email) wanted.push(["customer", email]);
  if (opts.jobId) wanted.push(["job", String(opts.jobId)]);
  if (opts.quoteId) wanted.push(["quote", String(opts.quoteId)]);

  const grants: DiscountGrant[] = [];
  for (const [scope, scopeId] of wanted) {
    try {
      const rows = ((await kv.getByPrefix(SCOPE_PREFIX(scope, scopeId))) as DiscountGrant[] || [])
        .filter(Boolean);
      grants.push(...rows);
    } catch { /* a scope that cannot be read contributes nothing */ }
  }

  const target = { customerEmail: email, jobId: opts.jobId, quoteId: opts.quoteId };
  const cap = capFor(opts.context || "quote", { seatNumber: opts.seatNumber });
  return { ...resolveDiscount(planPercent, grants, target, now, cap), planTierId };
}

/** What the signed-in caller would be discounted on a quote. */
discountGrantsRouter.get("/make-server-3eae23a6/my-discount", async (c) => {
  const who = await actor(c);
  if (!who) return c.json({ success: false, error: "Sign in required." }, 401);

  /**
   * Staff may ask on somebody's behalf; nobody else may.
   *
   * Without this a customer could read another customer's terms by passing
   * their email, which is commercially sensitive even though it is not
   * strictly private data.
   */
  const asked = String(c.req.query("email") || "").trim().toLowerCase();
  const email = asked && who.isStaff ? asked : who.email;

  const resolved = await resolveDiscountFor({
    customerEmail: email,
    jobId: c.req.query("jobId"),
    quoteId: c.req.query("quoteId"),
    context: c.req.query("context") === "subscription" ? "subscription" : "quote",
    seatNumber: c.req.query("seat") ? Number(c.req.query("seat")) : null,
  });

  return c.json({ success: true, email, ...resolved });
});

/* ── granting ─────────────────────────────────────────────────────────────── */

const SCOPES: DiscountScope[] = ["customer", "job", "quote"];

/**
 * Give somebody a discount.
 *
 * Administrator only, and it is the route that says so rather than a hidden
 * button — this hands away margin, and "at any time" means the door is always
 * open, which is exactly when the check has to be in the right place.
 */
discountGrantsRouter.post("/make-server-3eae23a6/discount-grants", async (c) => {
  const who = await actor(c);
  if (!who) return c.json({ success: false, error: "Sign in required." }, 401);
  if (!who.isAdmin) {
    return c.json({ success: false, error: "Only an administrator can grant a discount." }, 403);
  }

  const body = await c.req.json().catch(() => ({}));
  const scope = SCOPES.includes(body?.scope) ? (body.scope as DiscountScope) : null;
  if (!scope) return c.json({ success: false, error: `Scope must be one of: ${SCOPES.join(", ")}` }, 400);

  const scopeId = String(body?.scopeId || "").trim();
  if (!scopeId) return c.json({ success: false, error: "Which customer, job or quote?" }, 400);

  const percent = Number(body?.percent);
  if (!Number.isFinite(percent) || percent <= 0 || percent > 100) {
    return c.json({ success: false, error: "A discount is a percentage above zero." }, 400);
  }

  /**
   * A reason is required, and that is deliberate friction.
   *
   * An administrator adding 15% for a good reason and one adding it by mistake
   * look identical in a number and different in a record. This is the only
   * field that tells them apart later.
   */
  const reason = String(body?.reason || "").trim().slice(0, 500);
  if (!reason) return c.json({ success: false, error: "Say why this discount is being given." }, 400);

  const now = new Date().toISOString();
  const id = `dg_${crypto.randomUUID()}`;
  const grant: DiscountGrant = {
    id,
    percent: Math.round(percent * 100) / 100,
    scope,
    scopeId,
    reason,
    grantedBy: who.email,
    grantedAt: now,
    startsAt: String(body?.startsAt || "").trim() || undefined,
    // Absent means lifetime — which is what the founding subscription offer is,
    // and why this is optional rather than required.
    expiresAt: String(body?.expiresAt || "").trim() || undefined,
  };

  await kv.set(GRANT_KEY(scope, scopeId, id), grant);
  console.log(`[Discounts] ${who.email} granted ${grant.percent}% to ${scope} ${scopeId}: ${reason}`);

  return c.json({
    success: true,
    grant,
    note: grant.expiresAt
      ? undefined
      : "This grant has no end date, so it lasts until it is revoked.",
  }, 201);
});

/** Every grant, or the ones aimed at one customer, job or quote. */
discountGrantsRouter.get("/make-server-3eae23a6/discount-grants", async (c) => {
  const who = await actor(c);
  if (!who) return c.json({ success: false, error: "Sign in required." }, 401);
  if (!who.isStaff) return c.json({ success: false, error: "Staff access is required." }, 403);

  const scope = c.req.query("scope");
  const scopeId = c.req.query("scopeId");
  const prefix = scope && scopeId && SCOPES.includes(scope as DiscountScope)
    ? SCOPE_PREFIX(scope, scopeId)
    : "discount_grant:";

  const rows = ((await kv.getByPrefix(prefix)) as DiscountGrant[] || []).filter(Boolean);
  const now = new Date();

  // Live, expired and revoked are different facts and the screen needs all
  // three — a grants list that hid the dead ones would hide the history that
  // explains why somebody is on the rate they are on.
  const decorated = rows.map((g) => ({
    ...g,
    live: grantApplies(g, {
      customerEmail: g.scope === "customer" ? g.scopeId : null,
      jobId: g.scope === "job" ? g.scopeId : null,
      quoteId: g.scope === "quote" ? g.scopeId : null,
    }, now),
    openEnded: !g.expiresAt && !g.revokedAt,
  }));

  decorated.sort((a, b) => String(b.grantedAt || "").localeCompare(String(a.grantedAt || "")));
  return c.json({ success: true, count: decorated.length, grants: decorated });
});

/**
 * Withdraw a grant. Never deleted.
 *
 * Somebody was on a rate, and the record of why is the only thing that explains
 * an invoice from last quarter. Revoking stops it applying from now on and
 * leaves the history standing.
 */
discountGrantsRouter.delete("/make-server-3eae23a6/discount-grants/:id", async (c) => {
  const who = await actor(c);
  if (!who) return c.json({ success: false, error: "Sign in required." }, 401);
  if (!who.isAdmin) {
    return c.json({ success: false, error: "Only an administrator can revoke a discount." }, 403);
  }

  const id = String(c.req.param("id") || "").trim();
  const rows = ((await kv.getByPrefix("discount_grant:")) as DiscountGrant[] || []).filter(Boolean);
  const grant = rows.find((g) => g.id === id);
  if (!grant) return c.json({ success: false, error: "No such grant." }, 404);

  const revoked = { ...grant, revokedAt: new Date().toISOString(), revokedBy: who.email };
  await kv.set(GRANT_KEY(grant.scope, grant.scopeId, grant.id), revoked);
  console.log(`[Discounts] ${who.email} revoked ${grant.percent}% from ${grant.scope} ${grant.scopeId}`);

  return c.json({ success: true, grant: revoked, note: "Withdrawn. The record is kept." });
});

export default discountGrantsRouter;
