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
  AUDIENCES, carryStripeLinkage, carryBandLinkage, isPurchasable, publicAddOn, publicTier, readInterval,
  type Audience, type PlanAddOn, type PlanTier, type StripeMode,
} from "./planTier.ts";
import { PORTAL_UPGRADE_PRICES } from "./portalUpgradePrices.ts";
import { QUOTE_DISCOUNT_CAP_PERCENT } from "./discounts.ts";

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
    // Through the shared reader, so a weekly price stays weekly. Written
    // inline this was `=== "year" ? "year" : "month"`, which collapsed week
    // to month and would have billed a quarter of what it should.
    interval: readInterval(raw?.interval),
    includedAddOns: (Array.isArray(raw?.includedAddOns) ? raw.includedAddOns : [])
      .map((a: any) => String(a || "").trim())
      .filter(Boolean)
      .slice(0, 40),
    // Bounded on the way in. The cap in `discounts.ts` is what actually
    // limits what a customer receives; this only refuses a nonsense figure.
    discountPercent: Number.isFinite(Number(raw?.discountPercent)) && Number(raw?.discountPercent) > 0
      ? Math.min(100, Math.round(Number(raw.discountPercent) * 100) / 100)
      : undefined,
    badge: String(raw?.badge || "").trim().slice(0, 40) || undefined,
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

  /**
   * Which mode the caller is asking about, not only which one this server
   * sells in.
   *
   * `purchasable` means "could somebody buy this", and that is a different
   * question in test and in live. An administrator rehearsing has just made a
   * test price and wants to know it worked; answering with the live mode tells
   * them their plan is still unsellable, which is true of live and reads as
   * though the button failed.
   *
   * Defaults to the server's own mode, so nothing that does not ask is
   * affected — a portal still gets the only answer that matters to a customer.
   */
  const asked = c.req.query("mode");
  const mode: StripeMode = asked === "test" || asked === "live" ? asked : activeMode();
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

  /**
   * The Stripe linkage is the server's, and an edit must not carry it.
   *
   * `readTier` builds a tier from the request body alone, so writing that
   * straight over the record would drop every Stripe field it already held —
   * and the caller cannot put them back, because the list route strips the
   * price ids before anybody sees them. Editing a plan's name would quietly
   * have unsold it. The rule, including when a changed amount means the old
   * price has to go, lives in `planTier.ts` where it is unit-tested.
   */
  const { linkage: carried, detached } = carryStripeLinkage(existing, tier.priceCents);

  await kv.set(TIER(audience, tier.id), {
    ...tier,
    ...carried,
    createdAt: existing?.createdAt || now,
    updatedAt: now,
    updatedBy: who.email,
  });

  const saved = { ...tier, ...carried } as PlanTier;
  const mode = activeMode();
  console.log(
    `[PlanCatalog] ${who.email} published ${audience}/${tier.id}`
    + (detached.length ? ` (detached ${detached.join(' and ')} price: amount changed)` : ''),
  );
  return c.json({
    success: true,
    tier: publicTier(saved, mode),
    purchasable: isPurchasable(saved, mode),
    detached,
    // A tier set above the cap is not an error, but it will never be felt in
    // full, and finding that out from a customer is worse than being told now.
    discountNote: Number(tier.discountPercent || 0) > QUOTE_DISCOUNT_CAP_PERCENT
      ? `This plan gives ${tier.discountPercent}% off, but no customer can receive more than `
        + `${QUOTE_DISCOUNT_CAP_PERCENT}% once every discount is added up.`
      : undefined,
    // The single most useful thing to tell somebody who has just saved a plan
    // that nobody can buy.
    warning: detached.length
      ? `Saved. The price changed, so the old ${detached.join(' and ')} Stripe price was `
        + 'detached — it can only ever charge the old amount. Create a new '
        + `${mode} price to put this plan back on sale. Anybody already subscribed `
        + 'keeps the figure they agreed to.'
      : isPurchasable(saved, mode)
        ? undefined
        : `Saved, but this plan cannot be bought yet — it needs a ${mode}-mode Stripe price and a price above zero.`,
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

/**
 * The limit keys this app names, per portal.
 *
 * Given to the assistant so it proposes keys the codebase already uses instead
 * of inventing a plausible-sounding one that nothing will ever read. These are
 * NOT a promise of enforcement: `withinLimit` exists in `planTier.ts` and no
 * route calls it yet, so a limit published today is documentation. Saying that
 * here keeps the next person from assuming the number does something.
 */
const LIMIT_VOCABULARY: Record<string, string> = {
  vendor: "products (catalogue size), deals (live at once), bidQuotesPerMonth, alertRadiusMiles",
  subcontractor: "bidQuotesPerMonth, alertRadiusMiles, seats",
  advertiser: "deals (live at once), campaignsPerMonth",
  customer: "designProjects, storageGb",
  content: "reelsPerMonth, seats, sites",
  property_manager: "properties, units, seats",
  landlord: "properties, units",
  condo_association: "units, seats",
};

/**
 * Draft a ladder of tiers from a description of what they should do.
 *
 * WHY THE ASSISTANT IS WORTH HAVING HERE
 *
 * The prices are the easy part. What is genuinely fiddly is making the rungs
 * step sensibly — the usual failure is a middle tier nobody buys because it is
 * barely better than the one below it, and that is only visible when the whole
 * ladder is held in view at once.
 *
 * IT PROPOSES; IT DOES NOT PUBLISH
 *
 * The same rule the design assistant follows, for the same reason: a proposal
 * applied without anybody reading it is a proposal nobody checked. This route
 * writes nothing. The reply lands in the editor as fields, and the catalogue
 * changes only when somebody presses save.
 *
 * AND IT NEVER RETURNS A PRICE ID
 *
 * A Stripe price id is a fact only Stripe can issue. A model cannot know one,
 * so anything that looks like one is wrong by construction — and storing a
 * fabricated one would publish a plan that bills against nothing. The field is
 * simply not carried out of here.
 *
 * Metered in the shared `ai` bucket by the prefix middleware in `index.tsx`,
 * which is registered before this router is mounted.
 */
planCatalogRouter.post("/make-server-3eae23a6/plan-draft", async (c) => {
  try {
    const who = await actor(c);
    if (!who) return c.json({ error: "Sign in required." }, 401);
    if (!who.isAdmin) return c.json({ error: "Only an administrator can draft plans." }, 403);

    const body = await c.req.json().catch(() => ({}));
    const audience = readAudience(body?.audience);
    if (!audience) return c.json({ error: "Unknown audience." }, 400);
    const brief = String(body?.brief || "").trim().slice(0, 2000);
    if (!brief) return c.json({ error: "Describe what the plans should do." }, 400);

    const key = Deno.env.get("ANTHROPIC_API_KEY");
    if (!key) {
      return c.json({ error: "The assistant is not configured. Set the ANTHROPIC_API_KEY secret." }, 503);
    }

    const existing = ((await kv.getByPrefix(`plan_tier:${audience}:`)) as PlanTier[] || []).filter(Boolean);

    const system = `You are setting up the subscription tiers a software portal sells.

Give back a LADDER, not a list. Each paid rung must be obviously worth more than
the one beneath it — the commonest mistake is a middle tier nobody would buy
because it is barely better than the cheaper one. If three rungs cannot be
justified, propose two. Put a free rung at the bottom at priceDollars 0, because
a paid tier only reads as good value against something.

FEATURES are what the buyer reads. Write them in their words, concrete, one
benefit each. Not "advanced analytics" — say what they can actually see or do.

LIMITS are the numbers, keyed by name. Use only these keys for this portal:
  ${LIMIT_VOCABULARY[audience] || "this portal names no metered limits"}
0 means unlimited. Never invent a key: a limit nothing reads is a promise
nobody keeps.

PRICES are a starting point for a human to overwrite. Whole dollars, in
priceDollars. Never output an identifier of any kind — Stripe price ids are
issued by Stripe, and anything you wrote would be false.

Return ONLY a JSON object, no prose, no code fence:
{
  "tiers": [
    { "id": "short-lowercase-slug", "name": "Listed",
      "blurb": "one line on who this is for",
      "features": ["what they get"], "limits": { "products": 250 },
      "priceDollars": 39, "interval": "month", "sortOrder": 1 }
  ],
  "reasoning": "two or three sentences on why the ladder steps where it does"
}`;

    const context = existing.length
      ? "They already sell these, so treat this as a revision rather than a blank sheet:\n"
        + existing.map((t) =>
          `· ${t.name} at ${((t.priceCents || 0) / 100).toFixed(0)}/${t.interval || "month"}`
          + ` — limits ${JSON.stringify(t.limits || {})}`
          + ` — features: ${(t.features || []).join("; ") || "none listed"}`).join("\n")
      : "They sell nothing for this portal yet.";

    const client = new (await import("npm:@anthropic-ai/sdk")).default({ apiKey: key });
    const message = await client.messages.create({
      model: Deno.env.get("PLAN_DRAFT_MODEL") || "claude-opus-5",
      max_tokens: 4000,
      system,
      messages: [{
        role: "user",
        content: `Portal: ${audience.replace(/_/g, " ")}\n\n${context}\n\nWhat they want:\n${brief}`,
      }],
    });

    const raw = message.content
      .filter((b: any) => b.type === "text").map((b: any) => b.text).join("").trim();
    const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
    const text = fenced ? fenced[1].trim() : raw;
    const first = text.indexOf("{");
    const last = text.lastIndexOf("}");
    let parsed: any;
    try {
      parsed = JSON.parse(first !== -1 && last > first ? text.slice(first, last + 1) : text);
    } catch {
      return c.json({ error: "The draft came back unreadable. Try describing it again." }, 502);
    }

    /**
     * Put through the same reader the save route uses.
     *
     * Not a second validator written alongside it: `readTier` is what decides
     * what a tier may contain, so a draft that skipped it could propose fields
     * the save route would silently drop, and the editor would show something
     * that could never be published. One gate, used twice.
     *
     * `stripePriceId` is cleared going in and coming out. `readTier` would take
     * one if it were offered, and the model is never asked for one — so the
     * only way a price id could appear here is by invention.
     */
    const tiers = (Array.isArray(parsed?.tiers) ? parsed.tiers : [])
      .slice(0, 6)
      .map((t: any) => readTier({
        ...t,
        stripePriceId: "",
        priceCents: Math.max(0, Math.round(Number(t?.priceDollars ?? 0) * 100)),
      }, audience))
      .filter(Boolean)
      .map((t: PlanTier) => ({ ...t, stripePriceId: undefined }));

    console.log(`[PlanCatalog] ${who.email} drafted ${tiers.length} ${audience} tiers`);
    return c.json({
      audience,
      tiers,
      reasoning: String(parsed?.reasoning || "").slice(0, 800),
      note: "Nothing is saved. Change anything you disagree with, then publish the ones you want.",
    });
  } catch (error: any) {
    console.error("[PlanCatalog] draft failed:", error?.message || error);
    return c.json({ error: error?.message || "Could not draft the plans." }, 500);
  }
});

/* ── add-ons ──────────────────────────────────────────────────────────────
 *
 * Sold alongside a tier rather than instead of one. See `PlanAddOn` in
 * `planTier.ts` for why they are their own records, and section 2 of
 * `tasks/plan-catalogue-unification.md` for why the work went this way.
 *
 * These routes deliberately mirror the tier routes rather than sharing a
 * generic handler with them. The two have the same shape today and there is no
 * reason to believe they will keep it — tiers will grow trial windows and
 * add-ons will grow quantities — and a shared handler with two flags reads
 * worse than two handlers that agree.
 */

const ADDON = (audience: string, id: string) => `plan_addon:${audience}:${id}`;

/** An add-on from a request body, with only fields this app understands. */
function readAddOn(raw: any, audience: Audience): PlanAddOn | null {
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
    // Never generated, exactly as for a tier: a price this app invented would
    // bill against nothing in Stripe.
    stripePriceId: String(raw?.stripePriceId || "").trim().slice(0, 120) || undefined,
    priceCents: Number.isFinite(Number(raw?.priceCents)) && Number(raw?.priceCents) >= 0
      ? Math.round(Number(raw.priceCents))
      : undefined,
    interval: readInterval(raw?.interval),
    availableOn: (Array.isArray(raw?.availableOn) ? raw.availableOn : [])
      .map((t: any) => String(t || "").trim())
      .filter(Boolean)
      .slice(0, 40),
    /**
     * How this add-on is priced, carried through the save.
     *
     * An edit posts the whole record back, so anything this function does not
     * name is destroyed on the next save. Left out, a banded add-on would
     * lose its bands — and with them every Stripe price id they were selling
     * against — the first time somebody corrected a typo in its blurb.
     */
    perUnit: raw?.perUnit === true || undefined,
    sizeBands: (Array.isArray(raw?.sizeBands) ? raw.sizeBands : [])
      .map((b: any, i: number) => ({
        id: String(b?.id || `band-${i + 1}`).trim().toLowerCase()
          .replace(/[^a-z0-9_-]/g, "").slice(0, 40) || `band-${i + 1}`,
        label: String(b?.label || "").trim().slice(0, 80) || undefined,
        upToUnits: Number.isFinite(Number(b?.upToUnits)) && Number(b.upToUnits) > 0
          ? Math.floor(Number(b.upToUnits)) : undefined,
        quoteOnly: b?.quoteOnly === true || undefined,
        // A quoted band has no price by definition; storing one would make it
        // sellable at a number nobody agreed to.
        priceCents: b?.quoteOnly === true
          ? undefined
          : (Number.isFinite(Number(b?.priceCents)) && Number(b.priceCents) >= 0
            ? Math.round(Number(b.priceCents)) : undefined),
        stripePriceId: String(b?.stripePriceId || "").trim().slice(0, 120) || undefined,
        stripePriceIdTest: String(b?.stripePriceIdTest || "").trim().slice(0, 120) || undefined,
      }))
      .slice(0, 12),
    sortOrder: Number.isFinite(Number(raw?.sortOrder)) ? Number(raw.sortOrder) : 0,
    active: raw?.active !== false,
  };
}

/** The add-ons on offer for one audience. */
planCatalogRouter.get("/make-server-3eae23a6/plan-addons", async (c) => {
  const who = await actor(c);
  if (!who) return c.json({ error: "Sign in required." }, 401);

  const audience = readAudience(c.req.query("audience"));
  if (!audience) {
    return c.json({ error: `Unknown audience. One of: ${AUDIENCES.join(", ")}` }, 400);
  }

  const mode = activeMode();
  const rows = ((await kv.getByPrefix(`plan_addon:${audience}:`)) as PlanAddOn[] || []).filter(Boolean);
  const visible = who.isAdmin ? rows : rows.filter((a) => a.active !== false);
  visible.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0) || a.name.localeCompare(b.name));

  return c.json({
    audience,
    addOns: visible.map((a) => publicAddOn(a, mode)),
    note: visible.length === 0
      ? "No add-ons are published for this portal yet."
      : undefined,
  });
});

/** Publish or update an add-on. Administrators only. */
planCatalogRouter.post("/make-server-3eae23a6/plan-addons/:audience", async (c) => {
  const who = await actor(c);
  if (!who) return c.json({ error: "Sign in required." }, 401);
  if (!who.isAdmin) return c.json({ error: "Only an administrator can publish an add-on." }, 403);

  const audience = readAudience(c.req.param("audience"));
  if (!audience) return c.json({ error: "Unknown audience." }, 400);

  const body = await c.req.json().catch(() => ({}));
  const addOn = readAddOn(body, audience);
  if (!addOn) return c.json({ error: "An add-on needs at least an id and a name." }, 400);

  const now = new Date().toISOString();
  const existing = (await kv.get(ADDON(audience, addOn.id))) as any;
  // The same rule as a tier, and for the same reason: the Stripe linkage is the
  // server's, the caller never sees it, and a changed amount cannot keep a
  // price that can only ever charge the old one.
  const { linkage: carried, detached } = carryStripeLinkage(existing, addOn.priceCents);

  /**
   * And once per band, for a size-banded add-on.
   *
   * Each band sells against its own Stripe price, so each needs the same
   * treatment the record gets: kept across a save, detached when the amount
   * changed. Without this a band would keep an id that charges yesterday's
   * figure while the screen shows today's.
   */
  const { bands, detached: bandsDetached } = carryBandLinkage(existing?.sizeBands, addOn.sizeBands);

  await kv.set(ADDON(audience, addOn.id), {
    ...addOn,
    ...carried,
    sizeBands: bands.length ? bands : undefined,
    createdAt: existing?.createdAt || now,
    updatedAt: now,
    updatedBy: who.email,
  });

  const saved = { ...addOn, ...carried, sizeBands: bands.length ? bands : undefined } as PlanAddOn;
  const mode = activeMode();
  console.log(
    `[PlanCatalog] ${who.email} published add-on ${audience}/${addOn.id}`
    + (detached.length ? ` (detached ${detached.join(" and ")} price: amount changed)` : "")
    + (bandsDetached.length ? ` (bands repriced, prices detached: ${bandsDetached.join(", ")})` : ""),
  );
  return c.json({
    success: true,
    addOn: publicAddOn(saved, mode),
    purchasable: isPurchasable(saved, mode),
    detached,
    warning: detached.length
      ? `Saved. The price changed, so the old ${detached.join(" and ")} Stripe price was `
        + "detached — it can only ever charge the old amount. Create a new "
        + `${mode} price to put this add-on back on sale.`
      : isPurchasable(saved, mode)
        ? undefined
        : `Saved, but this add-on cannot be bought yet — it needs a ${mode}-mode Stripe price `
          + "and a price above zero. An add-on a tier includes for free does not need one.",
  });
});

/** Withdraw an add-on from sale, or delete it outright. */
planCatalogRouter.delete("/make-server-3eae23a6/plan-addons/:audience/:id", async (c) => {
  const who = await actor(c);
  if (!who) return c.json({ error: "Sign in required." }, 401);
  if (!who.isAdmin) return c.json({ error: "Only an administrator can remove an add-on." }, 403);

  const audience = readAudience(c.req.param("audience"));
  if (!audience) return c.json({ error: "Unknown audience." }, 400);
  const id = c.req.param("id");
  const addOn = (await kv.get(ADDON(audience, id))) as PlanAddOn | null;
  if (!addOn) return c.json({ error: "No such add-on." }, 404);

  if (c.req.query("hard") === "1") {
    await kv.del(ADDON(audience, id));
    console.log(`[PlanCatalog] ${who.email} deleted add-on ${audience}/${id}`);
    return c.json({ success: true, deleted: true });
  }

  await kv.set(ADDON(audience, id), {
    ...addOn, active: false, updatedAt: new Date().toISOString(), updatedBy: who.email,
  });
  return c.json({
    success: true,
    withdrawn: true,
    note: "Withdrawn from sale. Anyone already paying for it keeps it. Use ?hard=1 to delete outright.",
  });
});

/* ── the one-off import ───────────────────────────────────────────────────
 *
 * U2 of `tasks/plan-catalogue-unification.md`. The platform grew seven places
 * that name plans and carry their own prices; this is how the server-side one
 * gets into the catalogue without anybody retyping it.
 *
 * THREE RULES, ALL OF THEM ABOUT NOT DOING DAMAGE
 *
 * Everything lands INACTIVE. An import is not a decision to sell something, and
 * a row that appeared on the storefront because somebody pressed Import would be
 * exactly the wrong outcome.
 *
 * Nothing is ever overwritten. The vendor tiers Eric has already settled —
 * Listed, Stocked, Preferred — must survive an import that carries an older
 * vendor ladder, so an id that already exists is reported and skipped.
 *
 * Nothing is guessed. The old map has types this catalogue has no audience for:
 * `investor`, `employee`, and `condo_manager`, which is a different thing from
 * the `condo_association` the catalogue knows about. Those are reported as
 * skipped, with the reason, rather than filed under a near-enough audience.
 */

/** A pretty name from a map key fragment: "standard maintenance" → "Standard maintenance". */
function titleFrom(raw: string): string {
  const words = raw.trim().replace(/[_-]+/g, " ").replace(/\s+/g, " ");
  return words ? words[0].toUpperCase() + words.slice(1) : "";
}

planCatalogRouter.post("/make-server-3eae23a6/plan-catalog/import", async (c) => {
  const who = await actor(c);
  if (!who) return c.json({ error: "Sign in required." }, 401);
  if (!who.isAdmin) return c.json({ error: "Only an administrator can import." }, 403);

  // Add-ons by default. The tier rows are the ones most likely to duplicate
  // something already decided, so they are opt-in.
  const withTiers = c.req.query("tiers") === "1";
  const dryRun = c.req.query("dry") === "1";

  const created: any[] = [];
  const skipped: any[] = [];

  for (const [key, dollars] of Object.entries(PORTAL_UPGRADE_PRICES)) {
    const [rawType, rawPlan] = key.split(":");
    if (!rawType || !rawPlan) { skipped.push({ key, why: "unreadable key" }); continue; }

    const isAddOn = rawType.endsWith("_maintenance");
    const baseType = isAddOn ? rawType.slice(0, -"_maintenance".length) : rawType;
    const audience = readAudience(baseType);

    if (!audience) {
      skipped.push({
        key,
        why: baseType === "condo_manager"
          ? "the catalogue has condo_association, which is the association rather than the "
            + "managing company — these are not the same buyer, so this needs deciding not guessing"
          : `the catalogue has no '${baseType}' audience yet`,
      });
      continue;
    }
    if (!isAddOn && !withTiers) {
      skipped.push({ key, why: "a tier, and tiers are opt-in — repeat with ?tiers=1" });
      continue;
    }

    // "vendor standard maintenance" under type vendor_maintenance → "standard
    // maintenance"; "vendor basic" under type vendor → "basic".
    const label = rawPlan.toLowerCase().startsWith(`${baseType.replace(/_/g, " ")} `)
      ? rawPlan.slice(baseType.replace(/_/g, " ").length + 1)
      : rawPlan;
    const id = label.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9_-]/g, "");
    if (!id) { skipped.push({ key, why: "no usable id" }); continue; }

    const storeKey = isAddOn ? ADDON(audience, id) : TIER(audience, id);
    const existing = await kv.get(storeKey);
    if (existing) {
      skipped.push({ key, why: `${audience}/${id} already exists — left alone` });
      continue;
    }

    const record = {
      id,
      audience,
      name: titleFrom(label),
      blurb: `Imported from the portal upgrade prices on ${new Date().toISOString().slice(0, 10)}.`,
      features: [],
      limits: {},
      priceCents: Math.round(Number(dollars) * 100),
      interval: "month" as const,
      sortOrder: 0,
      // Never on sale by being imported, and with no Stripe price it could not
      // be sold even if somebody switched it on by mistake.
      active: false,
      importedFrom: key,
      createdAt: new Date().toISOString(),
      updatedBy: who.email,
    };

    if (!dryRun) await kv.set(storeKey, record);
    created.push({ key, as: isAddOn ? "add-on" : "tier", audience, id, priceCents: record.priceCents });
  }

  console.log(`[PlanCatalog] ${who.email} imported ${created.length}, skipped ${skipped.length}${dryRun ? " (dry run)" : ""}`);
  return c.json({
    success: true,
    dryRun,
    created,
    skipped,
    note: dryRun
      ? "Nothing was written. This is what an import would do."
      : "Everything landed withdrawn and with no Stripe price, so nothing is on sale. "
        + "Edit what you want to keep in the Portal Plans tab, delete the rest, "
        + "and create a price for anything you intend to sell.",
  });
});

export default planCatalogRouter;
