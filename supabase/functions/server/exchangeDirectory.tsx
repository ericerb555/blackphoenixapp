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
 * Make a failed query fail, instead of reading as no data.
 *
 * WHY THIS EXISTS, WITH THE RECEIPT
 *
 * `supabase-js` does not throw. A missing table, a column that does not exist,
 * a permission refusal — all of them come back as `result.error` with
 * `result.data` set to null. So `const { data } = await sb.from(...)` followed
 * by `data ?? []` turns a completely broken database into a confident,
 * cheerful, empty answer.
 *
 * That is not hypothetical here. On 2026-10-03, against a production database
 * where **not one exchange table existed**, `/exchange/taxonomy` answered:
 *
 *     {"success":true,"sections":[],"categories":[],"services":[]}
 *
 * HTTP 200. Nothing in the logs. The same shape made `/exchange/category/:slug`
 * answer `404 No such category` — which reads as "that category is not in our
 * taxonomy" rather than "the taxonomy is gone" — and made a listing render
 * with none of the trades the business actually holds.
 *
 * This is the failure class that has cost this project the most: three storage
 * buckets public for months with the fix deployed, every Exchange route
 * answering 404 while the page typechecked and smoked clean, and half the
 * typecheck never running at all. In every case the system reported success.
 *
 * So: every read goes through here. An empty directory and a broken one must
 * never be the same answer.
 */
// Returns `any` rather than a generic, to match the rest of this file: rows
// here are `any` throughout, and a generic parameter infers `unknown` off the
// Postgrest builder's result type, which then fails on every property read.
function must(result: { data: any; error: any } | null, what: string): any {
  if (!result) throw new Error(`${what}: no result`);
  if (result.error) {
    throw new Error(`${what}: ${result.error.message || result.error}`);
  }
  return result.data;
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
 * The organisation types the public directory is allowed to show.
 *
 * ONE LIST, USED BY EVERY ROUTE. The listing route had this filter and the
 * category route had none, so an organisation that should never be public —
 * a customer, a landlord, a condo association — would have 404'd on its own
 * page while appearing in a category listing, had it ever held a category.
 * Nothing holds one today; the inconsistency is the bug, not the symptom.
 *
 * `exchange_business` is the compiled local business: a type of its own so
 * that a pizzeria from OpenStreetMap can be in the directory without being
 * in front of every construction screen that lists subcontractors. Eric:
 * "yes it should be separate from the main app."
 *
 * A customer or a landlord is a private party, often a household, and is never
 * part of the public directory however it was created.
 */
const PUBLIC_ORG_TYPES = ["exchange_business", "subcontractor", "vendor", "advertiser", "operator"];

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
    const [sectionResult, categoryResult] = await Promise.all([
      sb.from("exchange_section")
        .select("slug, name, tagline, sort_order")
        .eq("status", "active").order("sort_order"),
      sb.from("exchange_category")
        .select("id, section_slug, parent_id, slug, name, engagement_modes, is_construction, default_radius_miles, sort_order")
        .eq("status", "active").order("sort_order"),
    ]);

    const sections = must(sectionResult, "exchange_section") ?? [];
    const categories = must(categoryResult, "exchange_category") ?? [];

    return c.json({
      success: true,
      sections,
      categories: categories.filter((r: any) => !r.parent_id),
      services: categories.filter((r: any) => r.parent_id),
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
    if (!PUBLIC_ORG_TYPES.includes(String(row.type))) {
      return c.json({ success: false, error: "No such listing." }, 404);
    }

    /**
     * Fatal rather than degraded, deliberately.
     *
     * A listing rendered with none of the trades the business actually holds
     * is wrong in the way nobody reports: the page looks finished, the
     * business looks like it does nothing, and no error exists anywhere. A 500
     * on a public page is worse to look at and far better to find.
     */
    const held = must(
      await sb
        .from("organization_category")
        .select("category_id, exchange_category ( slug, name, section_slug )")
        .eq("org_id", row.id),
      "organization_category",
    ) ?? [];

    const categories = held
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

    const row = must(
      await sb
        .from("organizations")
        .select("id, website")
        .eq("slug", slug)
        .eq("status", "active")
        .maybeSingle(),
      "organizations",
    );

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

    /**
     * `must` before the 404 check, and the order is the whole point.
     *
     * Reading only `.data` here made a missing taxonomy answer "No such
     * category" — which tells the reader their search term is wrong when in
     * fact the entire table is gone. A 404 must mean "we looked and it is not
     * there", never "we could not look".
     */
    const category = must(
      await sb
        .from("exchange_category")
        .select("id, slug, name, section_slug, parent_id, default_radius_miles")
        .eq("slug", slug)
        .eq("status", "active")
        .maybeSingle(),
      "exchange_category",
    );

    if (!category) return c.json({ success: false, error: "No such category." }, 404);

    /**
     * The town, checked against the real list before anything is done with it.
     *
     * It used to be read and then passed only to the demand ledger, where it
     * lands in `exchange_demand_event.territory_slug` — a foreign key to
     * `exchange_territory`. The ledger writer swallows its own failures by
     * design, so a slug that is not a real town lost the demand row without a
     * sound. `exchangeTowns.ts` keeps a closed set on the client for exactly
     * that reason; the server was taking the client's word for it, which is
     * never the right place to check.
     *
     * An unknown town answers 404 rather than an empty list, for the same
     * reason `must` exists in this file: an empty directory and a broken
     * request must never be the same answer.
     */
    if (territory) {
      const town = must(
        await sb
          .from("exchange_territory")
          .select("slug")
          .eq("slug", territory)
          .maybeSingle(),
        "exchange_territory",
      );
      if (!town) return c.json({ success: false, error: "No such town." }, 404);
    }

    // Holding a category brings every service under it, so a page for a
    // service leaf lists the businesses that hold its parent.
    const holdingId = category.parent_id ?? category.id;

    /**
     * The listings, in this category and — when one is named — in this town.
     *
     * THE TOWN FILTER WAS MISSING ENTIRELY. The parameter arrived, was read
     * into a local, and reached nothing but the demand ledger. Measured
     * against production on 2026-10-06, `restaurants` answered 49 for Pelham,
     * 49 for Salem and 49 for Manchester — which has no listings at all. The
     * real answers are 11, 38 and 0. With one town live the bug was invisible,
     * because unfiltered and Pelham were the same set; Salem made it show.
     *
     * Rooted at `organizations` rather than at `organization_category`, so
     * that BOTH filters sit one level deep in the embed rather than one of
     * them being nested two deep behind the other. `!inner` is what makes an
     * embed a join rather than a decoration — without it the filter would
     * narrow the embedded rows and keep every parent.
     *
     * The territory embed is added only when a town is named, because an
     * unconditional `!inner` would silently drop any listing that has no
     * territory row at all.
     */
    const embeds = [`organization_category!inner ( category_id )`];
    if (territory) embeds.push(`organization_territory!inner ( territory_slug )`);

    let query = sb
      .from("organizations")
      .select([PUBLIC_LISTING_COLUMNS, ...embeds].join(", "))
      .eq("organization_category.category_id", holdingId);

    if (territory) {
      query = query.eq("organization_territory.territory_slug", territory);
    }

    const rows = must(await query, "organizations") ?? [];

    /**
     * Deduplicated by id, because a join can repeat a parent.
     *
     * The type and status check stays here rather than moving into the query:
     * `PUBLIC_ORG_TYPES` is the rule that keeps a customer, a landlord or a
     * condo association out of a public page, and it is worth having in one
     * obvious place that every route in this file reads the same way.
     */
    const seen = new Set<string>();
    const listings = rows
      .filter((o: any) => o && o.status === "active" && PUBLIC_ORG_TYPES.includes(String(o.type)))
      .filter((o: any) => (seen.has(String(o.id)) ? false : (seen.add(String(o.id)), true)))
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
