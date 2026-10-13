/**
 * Phoenix Exchange — following a business, and deals.
 *
 * Three audiences, and the whole design is about keeping them apart:
 *
 *   `/exchange/me/following`      a resident, about themselves
 *   `/exchange/business/deals`    a business, about its own listing
 *   `/exchange/deal-review`       staff, about everybody's submissions
 *
 * NOTHING A BUSINESS PUBLISHES REACHES A RESIDENT WITHOUT A PERSON SAYING SO
 *
 * That is Eric's standing rule for tenant-published content and it is the
 * reason the review queue exists. The enforcement is not a flag on a screen:
 * `businessMayMove` refuses every transition to `approved`, from every state,
 * so there is no sequence of business-side requests that publishes anything.
 * Approval lives behind `isStaffRequest` and nowhere else.
 *
 * AND A BUSINESS STILL LEARNS ONLY HOW MANY, NEVER WHO
 *
 * Following is consent to hear from a business, so it is tempting to let the
 * business see its followers. It must not. The follower count is served; the
 * identities are not, and no route here takes a business as its subject and
 * returns people.
 *
 * WHY THE FEED IS BUILT FROM THE RESIDENT'S SIDE
 *
 * `/exchange/me/deals` reads the resident's own follow rows and then the live
 * deals of those businesses. The opposite shape — asking each business for its
 * followers — would be the same data and a far worse habit.
 */

import { Hono } from "npm:hono@4";
import { createClient } from "npm:@supabase/supabase-js@2";
import { isStaffRequest } from "./requireStaff.ts";
import {
  isLive, businessMayMove, staffMayMove, validateDeal, mayPublish, PUBLISHED_STATE,
} from "./exchangeDeals.ts";

export const exchangeDealRoutes = new Hono();

function service() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
}

/** Who is asking, from the token and nothing else. */
async function resident(c: any): Promise<{ id: string; email: string } | null> {
  const token = (c.req.header("Authorization") || "").replace("Bearer ", "");
  if (!token) return null;
  try {
    const { data } = await service().auth.getUser(token);
    const user = data?.user;
    if (!user?.id) return null;
    return { id: user.id, email: String(user.email ?? "") };
  } catch {
    return null;
  }
}

function orThrow<T>(result: { data: T; error: any }, what: string): T {
  if (result.error) throw new Error(`${what}: ${result.error.message ?? result.error}`);
  return result.data;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const LISTING_COLUMNS = "id, slug, name, claim_state, listing_source, phone, website";

function publicListing(row: any) {
  if (!row) return null;
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    claimed: String(row.claim_state ?? "") === "claimed",
  };
}

/** What a resident is allowed to see of a deal. */
function publicDeal(deal: any, business: any) {
  return {
    id: deal.id,
    title: deal.title,
    body: deal.body,
    startsAt: deal.starts_at,
    endsAt: deal.ends_at,
    business,
  };
}

/**
 * The listing this person is allowed to act for.
 *
 * A business proves itself by holding the claim on the listing, which is the
 * same thing the claim flow already decides. Anything else — a body parameter,
 * a role in a token — would let one business publish as another.
 */
async function listingIClaim(sb: any, userId: string, orgId: string) {
  const claim = orThrow(
    await sb.from("exchange_claim")
      .select("org_id, state")
      .eq("org_id", orgId)
      .eq("claimant_user_id", userId)
      .eq("state", "granted")
      .maybeSingle(),
    "checking your claim",
  ) as any;
  if (!claim) return null;

  return orThrow(
    await sb.from("organizations").select(LISTING_COLUMNS).eq("id", orgId).maybeSingle(),
    "finding that business",
  ) as any;
}

// ── following ────────────────────────────────────────────────────────────────

exchangeDealRoutes.get("/exchange/me/following", async (c) => {
  const me = await resident(c);
  if (!me) return c.json({ success: false, error: "Sign in required." }, 401);

  try {
    const sb = service();
    const rows = orThrow(
      await sb.from("exchange_follow")
        .select("org_id, followed_at")
        .eq("user_id", me.id)
        .order("followed_at", { ascending: false }),
      "reading who you follow",
    ) as any[];

    if (!rows.length) return c.json({ success: true, following: [] });

    const listings = orThrow(
      await sb.from("organizations").select(LISTING_COLUMNS).in("id", rows.map((r) => r.org_id)),
      "reading those businesses",
    ) as any[];
    const byId = new Map(listings.map((l) => [l.id, l]));

    return c.json({
      success: true,
      following: rows
        .map((r) => {
          const listing = publicListing(byId.get(r.org_id));
          return listing ? { ...listing, followedAt: r.followed_at } : null;
        })
        .filter(Boolean),
    });
  } catch (error) {
    return c.json({ success: false, error: String((error as Error).message) }, 500);
  }
});

exchangeDealRoutes.post("/exchange/me/following", async (c) => {
  const me = await resident(c);
  if (!me) return c.json({ success: false, error: "Sign in required." }, 401);

  const body = await c.req.json().catch(() => ({}));
  const orgId = String(body?.orgId ?? "").trim();
  if (!UUID.test(orgId)) return c.json({ success: false, error: "Which business?" }, 400);

  try {
    const sb = service();
    const listing = orThrow(
      await sb.from("organizations").select("id").eq("id", orgId).maybeSingle(),
      "finding that business",
    ) as any;
    if (!listing) return c.json({ success: false, error: "No such business." }, 404);

    orThrow(
      await sb.from("exchange_follow")
        .upsert({ user_id: me.id, org_id: orgId }, { onConflict: "user_id,org_id" }),
      "following them",
    );
    return c.json({ success: true, following: true });
  } catch (error) {
    return c.json({ success: false, error: String((error as Error).message) }, 500);
  }
});

exchangeDealRoutes.delete("/exchange/me/following/:orgId", async (c) => {
  const me = await resident(c);
  if (!me) return c.json({ success: false, error: "Sign in required." }, 401);

  const orgId = String(c.req.param("orgId") ?? "").trim();
  if (!UUID.test(orgId)) return c.json({ success: false, error: "Which business?" }, 400);

  try {
    // Scoped by user as well as business: without it this would unfollow for
    // everybody who had followed them.
    orThrow(
      await service().from("exchange_follow")
        .delete().eq("user_id", me.id).eq("org_id", orgId),
      "unfollowing them",
    );
    return c.json({ success: true, following: false });
  } catch (error) {
    return c.json({ success: false, error: String((error as Error).message) }, 500);
  }
});

// ── a resident's deals ───────────────────────────────────────────────────────

exchangeDealRoutes.get("/exchange/me/deals", async (c) => {
  const me = await resident(c);
  if (!me) return c.json({ success: false, error: "Sign in required." }, 401);

  try {
    const sb = service();
    const follows = orThrow(
      await sb.from("exchange_follow").select("org_id").eq("user_id", me.id),
      "reading who you follow",
    ) as any[];
    if (!follows.length) return c.json({ success: true, deals: [] });

    const orgIds = follows.map((f) => f.org_id);
    const deals = orThrow(
      await sb.from("exchange_deal")
        .select("id, org_id, title, body, starts_at, ends_at, state")
        .in("org_id", orgIds)
        .eq("state", PUBLISHED_STATE)
        .order("starts_at", { ascending: false })
        .limit(100),
      "reading their deals",
    ) as any[];

    /*
     * Filtered through `isLive` rather than trusting the state alone. The query
     * already asks for approved, but approval is necessary and not sufficient —
     * a deal that has not started or has finished is not live, and keeping that
     * judgement in one tested function means the feed and the listing page can
     * never disagree about it.
     */
    const live = deals.filter((d) => isLive(d));
    if (!live.length) return c.json({ success: true, deals: [] });

    const listings = orThrow(
      await sb.from("organizations").select(LISTING_COLUMNS).in("id", [...new Set(live.map((d) => d.org_id))]),
      "reading those businesses",
    ) as any[];
    const byId = new Map(listings.map((l) => [l.id, l]));

    return c.json({
      success: true,
      deals: live
        .map((d) => {
          const business = publicListing(byId.get(d.org_id));
          return business ? publicDeal(d, business) : null;
        })
        .filter(Boolean),
    });
  } catch (error) {
    return c.json({ success: false, error: String((error as Error).message) }, 500);
  }
});

// ── a business's own deals ───────────────────────────────────────────────────

exchangeDealRoutes.get("/exchange/business/deals", async (c) => {
  const me = await resident(c);
  if (!me) return c.json({ success: false, error: "Sign in required." }, 401);

  try {
    const sb = service();
    // Everything this person holds a granted claim on. A business with two
    // listings sees both; nobody sees a listing they have not claimed.
    const claims = orThrow(
      await sb.from("exchange_claim")
        .select("org_id")
        .eq("claimant_user_id", me.id)
        .eq("state", "granted"),
      "checking your claims",
    ) as any[];
    if (!claims.length) return c.json({ success: true, listings: [], deals: [] });

    const orgIds = claims.map((c2) => c2.org_id);
    const [listings, deals] = await Promise.all([
      sb.from("organizations").select(LISTING_COLUMNS).in("id", orgIds),
      sb.from("exchange_deal")
        .select("id, org_id, title, body, starts_at, ends_at, state, decision_note, submitted_at, decided_at")
        .in("org_id", orgIds)
        .order("created_at", { ascending: false })
        .limit(200),
    ]);

    return c.json({
      success: true,
      listings: (orThrow(listings, "reading your businesses") as any[]).map(publicListing),
      deals: (orThrow(deals, "reading your deals") as any[]).map((d) => ({
        id: d.id,
        orgId: d.org_id,
        title: d.title,
        body: d.body,
        startsAt: d.starts_at,
        endsAt: d.ends_at,
        state: d.state,
        live: isLive(d),
        // Why it was turned down, so the business can fix it rather than guess.
        decisionNote: d.decision_note ?? null,
      })),
    });
  } catch (error) {
    return c.json({ success: false, error: String((error as Error).message) }, 500);
  }
});

exchangeDealRoutes.post("/exchange/business/deals", async (c) => {
  const me = await resident(c);
  if (!me) return c.json({ success: false, error: "Sign in required." }, 401);

  const body = await c.req.json().catch(() => ({}));
  const orgId = String(body?.orgId ?? "").trim();
  if (!UUID.test(orgId)) return c.json({ success: false, error: "Which business?" }, 400);

  try {
    const sb = service();
    const listing = await listingIClaim(sb, me.id, orgId);
    if (!listing) {
      // The same answer whether the listing does not exist or is somebody
      // else's, so this cannot be used to discover who claimed what.
      return c.json({ success: false, error: "You do not hold the claim on that business." }, 403);
    }

    const verdict = mayPublish({ claimed: String(listing.claim_state ?? "") === "claimed" });
    if (!verdict.allowed) return c.json({ success: false, error: verdict.reason }, 403);

    const problems = validateDeal({
      title: body?.title, body: body?.body, startsAt: body?.startsAt, endsAt: body?.endsAt,
    });
    if (problems.length) return c.json({ success: false, error: problems.join(" ") }, 400);

    // Submitted, never approved. There is no request a business can make that
    // puts a deal in front of a resident.
    const wantsReview = body?.submit !== false;
    const row = orThrow(
      await sb.from("exchange_deal").insert({
        org_id: orgId,
        title: String(body.title).trim(),
        body: String(body.body).trim(),
        starts_at: new Date(String(body.startsAt)).toISOString(),
        ends_at: new Date(String(body.endsAt)).toISOString(),
        state: wantsReview ? "submitted" : "draft",
        submitted_at: wantsReview ? new Date().toISOString() : null,
        created_by: me.id,
      }).select("id, state").maybeSingle(),
      "saving the deal",
    ) as any;

    return c.json({ success: true, id: row?.id ?? null, state: row?.state ?? null });
  } catch (error) {
    return c.json({ success: false, error: String((error as Error).message) }, 500);
  }
});

exchangeDealRoutes.post("/exchange/business/deals/:id/move", async (c) => {
  const me = await resident(c);
  if (!me) return c.json({ success: false, error: "Sign in required." }, 401);

  const id = String(c.req.param("id") ?? "").trim();
  if (!UUID.test(id)) return c.json({ success: false, error: "Which deal?" }, 400);
  const to = String((await c.req.json().catch(() => ({})))?.to ?? "").trim();

  try {
    const sb = service();
    const deal = orThrow(
      await sb.from("exchange_deal").select("id, org_id, state").eq("id", id).maybeSingle(),
      "finding that deal",
    ) as any;
    if (!deal) return c.json({ success: false, error: "No such deal." }, 404);

    const listing = await listingIClaim(sb, me.id, deal.org_id);
    if (!listing) return c.json({ success: false, error: "That is not your deal." }, 403);

    // The table says what a business may do, and it contains no route to
    // `approved` from any state.
    if (!businessMayMove(deal.state, to)) {
      return c.json({ success: false, error: `A deal cannot go from ${deal.state} to ${to}.` }, 400);
    }

    orThrow(
      await sb.from("exchange_deal").update({
        state: to,
        submitted_at: to === "submitted" ? new Date().toISOString() : undefined,
        updated_at: new Date().toISOString(),
      }).eq("id", id),
      "updating the deal",
    );
    return c.json({ success: true, state: to });
  } catch (error) {
    return c.json({ success: false, error: String((error as Error).message) }, 500);
  }
});

// ── the review queue ─────────────────────────────────────────────────────────

exchangeDealRoutes.get("/exchange/deal-review", async (c) => {
  if (!await isStaffRequest(c)) {
    return c.json({ success: false, error: "Company access is required." }, 403);
  }

  try {
    const sb = service();
    const deals = orThrow(
      await sb.from("exchange_deal")
        .select("id, org_id, title, body, starts_at, ends_at, state, submitted_at, decided_at, decision_note")
        .in("state", ["submitted", "approved", "rejected"])
        .order("submitted_at", { ascending: true, nullsFirst: false })
        .limit(200),
      "reading the queue",
    ) as any[];
    if (!deals.length) return c.json({ success: true, deals: [] });

    const listings = orThrow(
      await sb.from("organizations").select(LISTING_COLUMNS).in("id", [...new Set(deals.map((d) => d.org_id))]),
      "reading those businesses",
    ) as any[];
    const byId = new Map(listings.map((l) => [l.id, l]));

    return c.json({
      success: true,
      deals: deals.map((d) => ({
        id: d.id,
        title: d.title,
        body: d.body,
        startsAt: d.starts_at,
        endsAt: d.ends_at,
        state: d.state,
        live: isLive(d),
        submittedAt: d.submitted_at,
        decisionNote: d.decision_note ?? null,
        business: publicListing(byId.get(d.org_id)),
      })),
    });
  } catch (error) {
    return c.json({ success: false, error: String((error as Error).message) }, 500);
  }
});

exchangeDealRoutes.post("/exchange/deal-review/:id/decide", async (c) => {
  if (!await isStaffRequest(c)) {
    return c.json({ success: false, error: "Company access is required." }, 403);
  }
  const me = await resident(c);

  const id = String(c.req.param("id") ?? "").trim();
  if (!UUID.test(id)) return c.json({ success: false, error: "Which deal?" }, 400);

  const body = await c.req.json().catch(() => ({}));
  const to = String(body?.to ?? "").trim();
  const note = String(body?.note ?? "").trim().slice(0, 500);

  try {
    const sb = service();
    const deal = orThrow(
      await sb.from("exchange_deal").select("id, state").eq("id", id).maybeSingle(),
      "finding that deal",
    ) as any;
    if (!deal) return c.json({ success: false, error: "No such deal." }, 404);

    if (!staffMayMove(deal.state, to)) {
      return c.json({ success: false, error: `A deal cannot go from ${deal.state} to ${to}.` }, 400);
    }
    // Turning something down without saying why leaves the business guessing,
    // and they will simply submit it again.
    if (to === "rejected" && !note) {
      return c.json({ success: false, error: "Say why, so they can fix it." }, 400);
    }

    orThrow(
      await sb.from("exchange_deal").update({
        state: to,
        decided_at: new Date().toISOString(),
        decided_by: me?.id ?? null,
        decision_note: note || null,
        updated_at: new Date().toISOString(),
      }).eq("id", id),
      "recording the decision",
    );
    return c.json({ success: true, state: to });
  } catch (error) {
    return c.json({ success: false, error: String((error as Error).message) }, 500);
  }
});
