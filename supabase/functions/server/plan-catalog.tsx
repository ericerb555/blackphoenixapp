/**
 * The published subscription tiers a portal sells from.
 *
 * WHY THIS EXISTS
 *
 * The provisioning route already writes a `feature_grant` and its own comment
 * says "full access for the trial window, then requires a plan". The trial half
 * was built; there was never a plan to require. This is the plan.
 *
 * WHAT IT IS NOT
 *
 * Not `plan:` records — those are the bespoke hour-allotment plans the AI plan
 * builder writes, with their own credits ledger in `entitlements.tsx`. Not
 * `subscription:` either; condo associations and hour transfers already use
 * that prefix. These are published tiers, under `plan_tier:`.
 *
 * IT STARTS EMPTY AND THAT IS DELIBERATE
 *
 * No seeded tiers, no invented prices. Two hardcoded price ladders already live
 * in this codebase — `SUBSCRIPTION_PLANS` in `DealsOffersSection` and `PLANS`
 * in `PropertyAIStudio` — and a third written here would be the copy that
 * disagrees. Nothing is on sale until somebody publishes a tier and attaches a
 * Stripe price that actually exists.
 *
 * WHO SEES WHAT
 *
 * Anybody signed in may read the catalogue for an audience: they have to see
 * what is on offer to buy it. Nobody but an administrator may write one, and
 * the Stripe price id never leaves the server — a portal is told whether a tier
 * is purchasable, not what it bills against.
 */
import { Hono } from "npm:hono@4";
import { createClient } from "npm:@supabase/supabase-js@2";
import * as kv from "./kv_store.tsx";
import {
  AUDIENCES, isPurchasable, publicTier,
  type Audience, type PlanTier, type StripeMode,
} from "./planTier.ts";

/**
 * Which Stripe mode this server sells in, from the key's own prefix.
 *
 * Read here rather than imported from `index.tsx` because that file is the
 * entry point and importing back into it would be a cycle. Kept out of
 * `planTier.ts` too: that module is pure so it can be unit-tested under node,
 * and reaching for `Deno.env` would end that.
 *
 * An unrecognised prefix resolves to live, because assuming test would be
 * assuming safety about a key we cannot identify.
 */
function activeMode(): StripeMode {
  const key = (Deno.env.get("STRIPE_SECRET_KEY_SERVICES") || Deno.env.get("STRIPE_SECRET_KEY") || "").trim();
  return key.startsWith("sk_test") || key.startsWith("rk_test") ? "test" : "live";
}

export const planCatalogRouter = new Hono();

const admin = createClient(
  Deno.env.get("SUPABASE_URL") || "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "",
);

const TIER = (audience: string, id: string) => `plan_tier:${audience}:${id}`;
const ADMIN_ROLES = new Set(["owner", "admin", "master_admin", "management"]);

async function actor(c: any): Promise<{ email: string; isAdmin: boolean } | null> {
  const token = String(c.req.header("Authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const { data: { user }, error } = await admin.auth.getUser(token);
  if (error || !user) return null;
  // app_metadata only. A role read from user_metadata is one the account can
  // set for itself, and this gate decides who may publish prices.
  const role = String(user.app_metadata?.role || user.app_metadata?.accountType || "")
    .toLowerCase().replace(/[\s-]+/g, "_");
  return { email: String(user.email || "").toLowerCase(), isAdmin: ADMIN_ROLES.has(role) };
}

function readAudience(raw: unknown): Audience | null {
  const asked = String(raw ?? "").trim() as Audience;
  return AUDIENCES.includes(asked) ? asked : null;
}

/** A tier from a request body, with only fields this app understands. */
function readTier(raw: any, audience: Audience): PlanTier | null {
  const id = String(raw?.id || "").trim().toLowerCase().replace(/[^a-z0-9_-]/g, "");
  const name = String(raw?.name || "").trim();
  if (!id || !name) return null;

  const limits: Record<string, number> = {};
  for (const [key, value] of Object.entries(raw?.limits || {})) {
    const n = Number(value);
    if (Number.isFinite(n) && n >= 0) limits[String(key).slice(0, 40)] = n;
  }

  return {
    id: id.slice(0, 40),
    audience,
    name: name.slice(0, 80),
    blurb: String(raw?.blurb || "").trim().slice(0, 300) || undefined,
    features: (Array.isArray(raw?.features) ? raw.features : [])
      .map((f: any) => String(f || "").trim().slice(0, 160))
      .filter(Boolean)
      .slice(0, 20),
    limits,
    // Stored exactly as given. Never generated: a price this app invented would
    // bill against nothing in Stripe.
    stripePriceId: String(raw?.stripePriceId || "").trim().slice(0, 120) || undefined,
    priceCents: Number.isFinite(Number(raw?.priceCents)) && Number(raw?.priceCents) >= 0
      ? Math.round(Number(raw.priceCents))
      : undefined,
    interval: raw?.interval === "year" ? "year" : "month",
    sortOrder: Number.isFinite(Number(raw?.sortOrder)) ? Number(raw.sortOrder) : 0,
    active: raw?.active !== false,
  };
}

/**
 * The tiers on offer for one audience.
 *
 * Readable by anybody signed in, because the people who need to see the price
 * list are the people being sold to. Withdrawn tiers are hidden from everybody
 * except an administrator, who needs to see them to put them back.
 */
planCatalogRouter.get("/make-server-3eae23a6/plan-tiers", async (c) => {
  const who = await actor(c);
  if (!who) return c.json({ error: "Sign in required." }, 401);

  const audience = readAudience(c.req.query("audience"));
  if (!audience) {
    return c.json({ error: `Unknown audience. One of: ${AUDIENCES.join(", ")}` }, 400);
  }

  const mode = activeMode();
  const rows = ((await kv.getByPrefix(`plan_tier:${audience}:`)) as PlanTier[] || []).filter(Boolean);
  const visible = who.isAdmin ? rows : rows.filter((t) => t.active !== false);
  visible.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0) || a.name.localeCompare(b.name));

  return c.json({
    audience,
    // The price id is stripped for everybody. An administrator who needs it can
    // read the single tier by id; a list is not where a secret belongs.
    // Arrow, not a bare reference: .map passes the index as the second
    // argument, which would have arrived as the Stripe mode.
    tiers: visible.map((t) => publicTier(t, mode)),
    // Said plainly so an empty catalogue reads as "not set up yet" rather than
    // as a loading failure.
    note: visible.length === 0
      ? "No plans are published for this portal yet. An administrator adds them, "
        + "and each one needs a Stripe price before it can be bought."
      : undefined,
  });
});

/** One tier in full, for an administrator editing it. Includes the price id. */
planCatalogRouter.get("/make-server-3eae23a6/plan-tiers/:audience/:id", async (c) => {
  const who = await actor(c);
  if (!who) return c.json({ error: "Sign in required." }, 401);
  const audience = readAudience(c.req.param("audience"));
  if (!audience) return c.json({ error: "Unknown audience." }, 400);

  const tier = (await kv.get(TIER(audience, c.req.param("id")))) as PlanTier | null;
  if (!tier) return c.json({ error: "No such plan." }, 404);
  const mode = activeMode();
  if (!who.isAdmin) return c.json({ tier: publicTier(tier, mode) });
  return c.json({ tier, mode, purchasable: isPurchasable(tier, mode) });
});

/** Publish or update a tier. Administrators only. */
planCatalogRouter.post("/make-server-3eae23a6/plan-tiers/:audience", async (c) => {
  const who = await actor(c);
  if (!who) return c.json({ error: "Sign in required." }, 401);
  if (!who.isAdmin) return c.json({ error: "Only an administrator can publish a plan." }, 403);

  const audience = readAudience(c.req.param("audience"));
  if (!audience) return c.json({ error: "Unknown audience." }, 400);

  const body = await c.req.json().catch(() => ({}));
  const tier = readTier(body, audience);
  if (!tier) return c.json({ error: "A plan needs at least an id and a name." }, 400);

  const now = new Date().toISOString();
  const existing = (await kv.get(TIER(audience, tier.id))) as any;
  await kv.set(TIER(audience, tier.id), {
    ...tier,
    createdAt: existing?.createdAt || now,
    updatedAt: now,
    updatedBy: who.email,
  });

  console.log(`[PlanCatalog] ${who.email} published ${audience}/${tier.id}`);
  return c.json({
    success: true,
    tier: publicTier(tier, activeMode()),
    purchasable: isPurchasable(tier, activeMode()),
    // The single most useful thing to tell somebody who has just saved a plan
    // that nobody can buy.
    warning: isPurchasable(tier)
      ? undefined
      : `Saved, but this plan cannot be bought yet — it needs a ${activeMode()}-mode Stripe price and a price above zero.`,
  });
});

/** Withdraw a tier from sale, or delete it outright. */
planCatalogRouter.delete("/make-server-3eae23a6/plan-tiers/:audience/:id", async (c) => {
  const who = await actor(c);
  if (!who) return c.json({ error: "Sign in required." }, 401);
  if (!who.isAdmin) return c.json({ error: "Only an administrator can remove a plan." }, 403);

  const audience = readAudience(c.req.param("audience"));
  if (!audience) return c.json({ error: "Unknown audience." }, 400);
  const id = c.req.param("id");
  const tier = (await kv.get(TIER(audience, id))) as PlanTier | null;
  if (!tier) return c.json({ error: "No such plan." }, 404);

  /**
   * Withdrawn by default rather than deleted.
   *
   * Somebody is probably subscribed to it. Deleting the tier would leave their
   * grant pointing at a plan that no longer exists, and the portal would have
   * no way to say what they are paying for. `?hard=1` deletes for real, for a
   * tier published in error that nobody ever bought.
   */
  if (c.req.query("hard") === "1") {
    await kv.del(TIER(audience, id));
    console.log(`[PlanCatalog] ${who.email} deleted ${audience}/${id}`);
    return c.json({ success: true, deleted: true });
  }

  await kv.set(TIER(audience, id), { ...tier, active: false, updatedAt: new Date().toISOString(), updatedBy: who.email });
  return c.json({
    success: true,
    withdrawn: true,
    note: "Withdrawn from sale. Anyone already subscribed keeps it. Use ?hard=1 to delete outright.",
  });
});

export default planCatalogRouter;
