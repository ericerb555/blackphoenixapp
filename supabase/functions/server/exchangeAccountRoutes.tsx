/**
 * Phoenix Exchange — a resident's own account.
 *
 * Saved businesses and the record of who they contacted. Small surface, and
 * every route on it refuses an unidentified caller outright: unlike the public
 * directory, where an anonymous reader is the normal case, there is no such
 * thing as an anonymous account.
 *
 * THE ONE RULE THIS FILE EXISTS TO NOT BREAK
 *
 * A business may be told HOW MANY people wanted them. Never WHO. Adding a
 * customer identity to the Exchange is exactly the change that could leak that
 * by accident, so it is worth being explicit about the direction of every read
 * here: all of them are "this person's own rows", none of them is "the people
 * who did X to this business". Nothing in this file can be called by a
 * business about its own listing, because nothing in this file takes a
 * business as the subject.
 *
 * The lead ledger has no row-level security at all — it is reached only with
 * the service role — so the actor filter applied to every read of it is the
 * entire protection between one resident's history and another's. That is why
 * it comes from `actorFilter`, which throws rather than returning an empty
 * filter when the id is missing: an unscoped query would return every enquiry
 * every person has ever made.
 *
 * WHY THESE ROUTES ARE NOT IN PUBLIC_PREFIXES
 *
 * Deliberately. `/exchange/` paths are whitelisted one at a time in index.tsx
 * so that anything new under the prefix is private until somebody lists it.
 * These must never be listed.
 */

import { Hono } from "npm:hono@4";
import { createClient } from "npm:@supabase/supabase-js@2";
import { actorFilter, isEnquiry, phraseEnquiry, HISTORY_LIMIT } from "./exchangeAccount.ts";

export const exchangeAccountRoutes = new Hono();

function service() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
}

/**
 * Who is asking, from the token and nothing else.
 *
 * Never from the body, never from a query parameter. A client-supplied user id
 * is a request to read somebody else's account.
 */
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

/** The same public shape the directory serves, so screens can share a card. */
const LISTING_COLUMNS = [
  "id", "slug", "name", "type", "status",
  "phone", "website",
  "service_lat", "service_lng",
  "verification_state", "claim_state", "listing_source",
].join(", ");

function publicListing(row: any) {
  if (!row) return null;
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    claimed: String(row.claim_state ?? "") === "claimed",
    source: row.listing_source ?? null,
    phone: row.phone ?? null,
    website: row.website ?? null,
    location: row.service_lat != null && row.service_lng != null
      ? { lat: Number(row.service_lat), lng: Number(row.service_lng) }
      : null,
  };
}

/**
 * Make a failed query fail instead of reading as no data.
 *
 * `supabase-js` does not throw: a missing table or a refused permission comes
 * back as `error` with `data` null, so `data ?? []` turns a broken database
 * into a cheerful empty answer. On an account page that would read as "you
 * have saved nothing", which is a lie with consequences — somebody would save
 * things again, or conclude the feature lost their shelf.
 */
function orThrow<T>(result: { data: T; error: any }, what: string): T {
  if (result.error) throw new Error(`${what}: ${result.error.message ?? result.error}`);
  return result.data;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ── what is on my shelf ──────────────────────────────────────────────────────

exchangeAccountRoutes.get("/exchange/me/saved", async (c) => {
  const me = await resident(c);
  if (!me) return c.json({ success: false, error: "Sign in required." }, 401);

  try {
    const sb = service();
    const saved = orThrow(
      await sb.from("exchange_saved_business")
        .select("org_id, saved_at")
        .eq("user_id", me.id)
        .order("saved_at", { ascending: false }),
      "reading your saved businesses",
    ) as any[];

    if (!saved.length) return c.json({ success: true, saved: [] });

    const listings = orThrow(
      await sb.from("organizations")
        .select(LISTING_COLUMNS)
        .in("id", saved.map((s) => s.org_id)),
      "reading those businesses",
    ) as any[];

    const byId = new Map(listings.map((l) => [l.id, l]));

    return c.json({
      success: true,
      // Ordered by when it was saved, not by whatever the second query
      // returned. A shelf that reshuffles itself is unsettling.
      saved: saved
        .map((s) => {
          const listing = publicListing(byId.get(s.org_id));
          return listing ? { ...listing, savedAt: s.saved_at } : null;
        })
        // A business delisted since it was saved simply disappears rather than
        // rendering as an empty card.
        .filter(Boolean),
    });
  } catch (error) {
    return c.json({ success: false, error: String((error as Error).message) }, 500);
  }
});

exchangeAccountRoutes.post("/exchange/me/saved", async (c) => {
  const me = await resident(c);
  if (!me) return c.json({ success: false, error: "Sign in required." }, 401);

  const body = await c.req.json().catch(() => ({}));
  const orgId = String(body?.orgId ?? "").trim();
  if (!UUID.test(orgId)) return c.json({ success: false, error: "Which business?" }, 400);

  try {
    const sb = service();

    // That it exists and is a listing a resident could have seen. Without this
    // the table would accept any UUID, and a shelf could be filled with
    // references to records that are not businesses at all.
    const listing = orThrow(
      await sb.from("organizations").select("id, status").eq("id", orgId).maybeSingle(),
      "finding that business",
    ) as any;
    if (!listing) return c.json({ success: false, error: "No such business." }, 404);

    // `user_id` comes from the token. The body says WHICH business, never WHO.
    orThrow(
      await sb.from("exchange_saved_business")
        .upsert({ user_id: me.id, org_id: orgId }, { onConflict: "user_id,org_id" }),
      "saving it",
    );

    return c.json({ success: true, saved: true });
  } catch (error) {
    return c.json({ success: false, error: String((error as Error).message) }, 500);
  }
});

exchangeAccountRoutes.delete("/exchange/me/saved/:orgId", async (c) => {
  const me = await resident(c);
  if (!me) return c.json({ success: false, error: "Sign in required." }, 401);

  const orgId = String(c.req.param("orgId") ?? "").trim();
  if (!UUID.test(orgId)) return c.json({ success: false, error: "Which business?" }, 400);

  try {
    // Scoped by user_id as well as org_id: without it this would unsave the
    // business for everybody who had saved it.
    orThrow(
      await service().from("exchange_saved_business")
        .delete().eq("user_id", me.id).eq("org_id", orgId),
      "removing it",
    );
    return c.json({ success: true, saved: false });
  } catch (error) {
    return c.json({ success: false, error: String((error as Error).message) }, 500);
  }
});

// ── who I have been in touch with ────────────────────────────────────────────

exchangeAccountRoutes.get("/exchange/me/enquiries", async (c) => {
  const me = await resident(c);
  if (!me) return c.json({ success: false, error: "Sign in required." }, 401);

  try {
    const sb = service();

    // `actorFilter` throws on a missing id rather than returning an empty
    // object, because an unscoped read here would return the whole ledger.
    const scope = actorFilter(me.id);

    const events = orThrow(
      await sb.from("exchange_lead_event")
        .select("id, org_id, kind, occurred_at")
        .eq("actor_user_id", scope.actor_user_id)
        .order("occurred_at", { ascending: false })
        .limit(HISTORY_LIMIT),
      "reading your history",
    ) as any[];

    // `viewed` is dropped here rather than in SQL so that the rule lives in
    // one tested place instead of being spelled out in a query string.
    const enquiries = events.filter((e) => isEnquiry(e.kind));
    if (!enquiries.length) return c.json({ success: true, enquiries: [] });

    const listings = orThrow(
      await sb.from("organizations")
        .select(LISTING_COLUMNS)
        .in("id", [...new Set(enquiries.map((e) => e.org_id))]),
      "reading those businesses",
    ) as any[];

    const byId = new Map(listings.map((l) => [l.id, l]));

    return c.json({
      success: true,
      enquiries: enquiries
        .map((e) => {
          const listing = publicListing(byId.get(e.org_id));
          return listing ? {
            id: String(e.id),
            what: phraseEnquiry(e.kind),
            at: e.occurred_at,
            business: listing,
          } : null;
        })
        .filter(Boolean),
    });
  } catch (error) {
    return c.json({ success: false, error: String((error as Error).message) }, 500);
  }
});
