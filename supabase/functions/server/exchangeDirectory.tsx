/**
 * Phoenix Exchange — the public directory.
 *
 * The only routes on this platform designed to be read by somebody with no
 * account and no session, and by a search engine. That is deliberate: a brand
 * new domain has no search authority, and the plan to earn it rests on
 * listing pages and category pages being indexable. A paywalled directory can
 * never be found.
 *
 * WHAT IS PUBLIC AND WHAT IS NOT
 *
 * Public: the category tree, a business's listing, the businesses in a
 * category and a place. That is a shop window.
 *
 * Not public, and not served from here at any access level: the lead ledger
 * and the demand ledger. A business may later be told HOW MANY people wanted
 * them. Nobody is ever told WHO. Those tables carry no row-level security
 * policies at all and are reached only with the service role, which is why
 * every read here names its columns rather than selecting everything.
 *
 * WHY THE SERVICE ROLE IS USED FOR PUBLIC READS
 *
 * The taxonomy and listing tables do have anon read policies, so a browser
 * could read them directly. Going through the server anyway buys three
 * things: the lead ledger gets written on the same request rather than being
 * trusted to the client, the shape of the response is ours to change without
 * a deploy of the page, and a listing's private columns can never leak
 * because this file decides the column list.
 */

import { Hono } from "npm:hono@4";
import { createClient } from "npm:@supabase/supabase-js@2";
import { recordLead, recordDemand } from "./exchangeLedger.ts";

export const exchangeDirectory = new Hono();

function service() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
}

/**
 * Who is asking, when anybody is.
 *
 * Null is the normal case here, not an error: these pages are for people who
 * have not signed up. The id is recorded against a lead so a business's own
 * numbers can be reconciled later, and is never handed back out.
 */
async function viewer(c: any): Promise<string | null> {
  const token = (c.req.header("Authorization") || "").replace("Bearer ", "");
  if (!token) return null;
  try {
    const { data } = await service().auth.getUser(token);
    return data?.user?.id ?? null;
  } catch {
    return null;
  }
}

/**
 * The columns a listing may show the public.
 *
 * Written out rather than `select('*')` on purpose. `organizations` carries
 * the licence number, the verification state and the claim state alongside
 * the public fields, and a future column added by somebody else must not
 * become public because this query was lazy.
 */
const PUBLIC_LISTING_COLUMNS = [
  "id", "slug", "name", "type", "status",
  "phone", "website",
  "service_lat", "service_lng", "service_radius_miles",
  "verification_state", "claim_state", "listing_source",
  "license_state", "license_expires_at", "insurance_expires_at",
].join(", ");

/**
 * What a listing looks like to a visitor.
 *
 * `license_number` is deliberately not here. Whether the licence is verified
 * and still in date is the public fact; the number itself belongs to the
 * business, and publishing it invites somebody to claim their listing with
 * it.
 */
function publicListing(row: any, categories: any[]) {
  const claimed = String(row?.claim_state ?? "") === "claimed";
  const now = Date.now();
  const inDate = (value: unknown) => {
    const at = Date.parse(String(value ?? ""));
    return Number.isFinite(at) ? at > now : false;
  };

  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    claimed,
    source: row.listing_source,
    phone: row.phone ?? null,
    website: row.website ?? null,
    location: row.service_lat != null && row.service_lng != null
      ? { lat: Number(row.service_lat), lng: Number(row.service_lng) }
      : null,
    categories,
    credentials: {
      // The badge lapses on the date, rather than standing for ever because
      // somebody uploaded a certificate once.
      licenceVerified: String(row.verification_state ?? "") === "verified" &&
        inDate(row.license_expires_at),
      insuranceInDate: inDate(row.insurance_expires_at),
      licenceState: row.license_state ?? null,
    },
  };
}

// ── the category tree ────────────────────────────────────────────────────────

exchangeDirectory.get("/exchange/taxonomy", async (c) => {
  try {
    const sb = service();
    const [sections, categories] = await Promise.all([
      sb.from("exchange_section")
        .select("slug, name, tagline, sort_order")
        .eq("status", "active").order("sort_order"),
      sb.from("exchange_category")
        .select("id, section_slug, parent_id, slug, name, engagement_modes, is_construction, default_radius_miles, sort_order")
        .eq("status", "active").order("sort_order"),
    ]);

    return c.json({
      success: true,
      sections: sections.data ?? [],
      categories: (categories.data ?? []).filter((r: any) => !r.parent_id),
      services: (categories.data ?? []).filter((r: any) => r.parent_id),
    });
  } catch (error: any) {
    console.error("[exchange] taxonomy failed:", error?.message || error);
    return c.json({ success: false, error: "Unable to load the directory." }, 500);
  }
});

// ── one listing ──────────────────────────────────────────────────────────────

exchangeDirectory.get("/exchange/listing/:slug", async (c) => {
  try {
    const sb = service();
    const slug = c.req.param("slug");

    const { data: row, error } = await sb
      .from("organizations")
      .select(PUBLIC_LISTING_COLUMNS)
      .eq("slug", slug)
      .eq("status", "active")
      .maybeSingle();

    if (error) throw error;
    if (!row) return c.json({ success: false, error: "No such listing." }, 404);

    // A customer or a landlord is a private party, often a household, and is
    // never part of the public directory however it was created.
    if (!["subcontractor", "vendor", "advertiser", "operator"].includes(String(row.type))) {
      return c.json({ success: false, error: "No such listing." }, 404);
    }

    const { data: held } = await sb
      .from("organization_category")
      .select("category_id, exchange_category ( slug, name, section_slug )")
      .eq("org_id", row.id);

    const categories = (held ?? [])
      .map((r: any) => r.exchange_category)
      .filter(Boolean);

    // Counted on the server rather than trusted to the page: a view is the
    // first rung of the ledger, and the ledger is what sells the
    // subscription. An unclaimed listing accumulates these too — that is
    // what makes the recruitment call specific rather than a cold sell.
    void recordLead(sb, {
      orgId: row.id,
      kind: "viewed",
      categoryId: (held ?? [])[0]?.category_id ?? null,
      actorUserId: await viewer(c),
      surface: "profile",
    });

    return c.json({ success: true, listing: publicListing(row, categories) });
  } catch (error: any) {
    console.error("[exchange] listing failed:", error?.message || error);
    return c.json({ success: false, error: "Unable to load that listing." }, 500);
  }
});

// ── revealing contact details ────────────────────────────────────────────────

/**
 * The phone number is SHOWN, and showing it is an event.
 *
 * Hiding a number behind a form is the single most resented behaviour of the
 * lead-resale sites, and copying it would undo the whole positioning. So
 * nothing is withheld — the contact details come back on the listing itself.
 * This route exists for the *interaction*: the visitor tapped the number, or
 * followed the link to the business's own site, and that is a lead worth
 * counting.
 *
 * The honest limit, stated rather than papered over: somebody who writes the
 * number down and rings tomorrow is invisible. A tracked number could narrow
 * that and would annoy businesses, so it is not the place to start.
 */
exchangeDirectory.post("/exchange/listing/:slug/contact", async (c) => {
  try {
    const sb = service();
    const slug = c.req.param("slug");
    const body = await c.req.json().catch(() => ({}));

    const kind = String(body?.kind ?? "");
    if (!["revealed", "called", "website"].includes(kind)) {
      return c.json({ success: false, error: "Unknown contact kind." }, 400);
    }

    const { data: row } = await sb
      .from("organizations")
      .select("id, website")
      .eq("slug", slug)
      .eq("status", "active")
      .maybeSingle();

    if (!row) return c.json({ success: false, error: "No such listing." }, 404);

    await recordLead(sb, {
      orgId: row.id,
      kind: kind as any,
      actorUserId: await viewer(c),
      surface: String(body?.surface ?? "profile"),
    });

    // The destination is returned from the stored record rather than echoed
    // from the request, so this cannot be used as an open redirect.
    return c.json({ success: true, website: kind === "website" ? row.website ?? null : null });
  } catch (error: any) {
    console.error("[exchange] contact failed:", error?.message || error);
    return c.json({ success: false, error: "Unable to record that." }, 500);
  }
});

// ── a category in a place ────────────────────────────────────────────────────

exchangeDirectory.get("/exchange/category/:slug", async (c) => {
  try {
    const sb = service();
    const slug = c.req.param("slug");
    const territory = c.req.query("territory") || null;

    const { data: category } = await sb
      .from("exchange_category")
      .select("id, slug, name, section_slug, parent_id, default_radius_miles")
      .eq("slug", slug)
      .eq("status", "active")
      .maybeSingle();

    if (!category) return c.json({ success: false, error: "No such category." }, 404);

    // Holding a category brings every service under it, so a page for a
    // service leaf lists the businesses that hold its parent.
    const holdingId = category.parent_id ?? category.id;

    const { data: rows } = await sb
      .from("organization_category")
      .select(`org_id, organizations ( ${PUBLIC_LISTING_COLUMNS} )`)
      .eq("category_id", holdingId);

    const listings = (rows ?? [])
      .map((r: any) => r.organizations)
      .filter((o: any) => o && o.status === "active")
      .map((o: any) => publicListing(o, [{ slug: category.slug, name: category.name }]));

    // Every search is a demand signal, and the ones that found nothing are
    // the valuable ones: a category nobody covers here is a sales call with a
    // real number attached.
    void recordDemand(sb, {
      categoryId: category.id,
      sectionSlug: category.section_slug,
      territorySlug: territory,
      resultsCount: listings.length,
      actorUserId: await viewer(c),
      meta: { surface: "category" },
    });

    return c.json({ success: true, category, listings });
  } catch (error: any) {
    console.error("[exchange] category failed:", error?.message || error);
    return c.json({ success: false, error: "Unable to load that category." }, 500);
  }
});

// ── "we could not find anyone" ───────────────────────────────────────────────

/**
 * A resident telling us who is missing.
 *
 * This turns the most damaging moment in a directory — an empty result — into
 * the most useful row in the database. It is also why the main page asks the
 * question out loud rather than hoping nobody notices the gap.
 */
exchangeDirectory.post("/exchange/missing", async (c) => {
  try {
    const sb = service();
    const body = await c.req.json().catch(() => ({}));

    const phrase = String(body?.phrase ?? "").slice(0, 300).trim();
    if (!phrase) return c.json({ success: false, error: "Tell us what you were looking for." }, 400);

    await recordDemand(sb, {
      phrase,
      territorySlug: body?.territory ? String(body.territory).slice(0, 80) : null,
      resultsCount: 0,
      outcome: "reported_missing",
      actorUserId: await viewer(c),
      meta: { surface: String(body?.surface ?? "missing-form").slice(0, 60) },
    });

    return c.json({ success: true });
  } catch (error: any) {
    console.error("[exchange] missing report failed:", error?.message || error);
    return c.json({ success: false, error: "Unable to record that." }, 500);
  }
});
