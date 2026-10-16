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
import {
  publicLogoUrl, LOGO_SELECT_COLUMNS, looksLikeMissingLogoColumn,
} from "./exchangeLogo.ts";

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
 * WHETHER THE LOGO COLUMNS ARE IN THE DATABASE YET.
 *
 * Deploys here are manual and the function is deployed on its own: deploy.md
 * documents one command, `supabase functions deploy`, and nothing in it applies
 * a migration. So this code can perfectly well be live against a database that
 * has not had `20261015120000_exchange_listing_logo` applied — whichever order
 * somebody happens to do the two steps in, and for however long sits between.
 *
 * A hard dependency would turn a missing migration into a 500 on EVERY LISTING
 * in the directory. A logo not appearing is a disappointment; the directory
 * being down is the product being down, and the second must not be a
 * consequence of the first.
 *
 * So: ask for the logo, and if the database says it has never heard of those
 * columns, remember that and ask without them. One wasted query per isolate
 * while the migration is outstanding, and nothing wasted once it is applied.
 * `null` means not yet known.
 */
let logoColumnsExist: boolean | null = null;

/** The listing columns, with the logo if this database has it. */
function listingColumns(): string {
  return logoColumnsExist === false
    ? PUBLIC_LISTING_COLUMNS
    : `${PUBLIC_LISTING_COLUMNS}, ${LOGO_SELECT_COLUMNS}`;
}

/**
 * Run a listing query, and run it again without the logo if that is what the
 * database objected to.
 *
 * The callback takes the column list rather than the query, because a Supabase
 * query builder cannot have its select changed after the fact.
 */
async function selectingListings(
  // `any` to match `must` above: PostgREST row shapes are not typed here, and
  // a generic would only move the cast to every call site.
  run: (columns: string) => Promise<{ data: any; error: any }>,
): Promise<{ data: any; error: any }> {
  const asked = listingColumns();
  const first = await run(asked);

  if (!first.error) {
    // Only proof of presence if we actually asked for them.
    if (asked !== PUBLIC_LISTING_COLUMNS) logoColumnsExist = true;
    return first;
  }
  if (!looksLikeMissingLogoColumn(first.error)) return first;

  logoColumnsExist = false;
  return run(PUBLIC_LISTING_COLUMNS);
}

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
    /* Null unless a person approved it and the claim still stands. Decided in
       one place so no surface can serve an image by forgetting to ask. */
    logo: publicLogoUrl(row, PROJECT_URL),
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

// ── the towns the Exchange covers ────────────────────────────────────────────

/**
 * Which towns a resident may choose.
 *
 * WHY THIS EXISTS
 *
 * The browser held this list as a hardcoded constant, with a comment admitting
 * it: "Hardcoded because no route serves the territory list yet. When one
 * exists, this becomes a fetch and the shape stays the same." So opening a new
 * town meant editing a constant, committing, and waiting for a front-end
 * deploy — which is exactly what Eric's rule about settings taking effect the
 * moment they are saved rules out. A town is a row; it should behave like one.
 *
 * ONLY ACTIVE TOWNS
 *
 * A town is ingested long before it is worth visiting. One with nine
 * businesses reads as a broken product rather than a new one, so a town stays
 * `pending` until somebody decides it is ready, and only `active` ones are
 * listed here. That decision is a person's, not a threshold's.
 *
 * Public, because the browse surface is public and a signed-out resident has
 * to be able to choose where they are looking.
 */
exchangeDirectory.get("/exchange/territories", async (c) => {
  try {
    const rows = must(
      await service()
        .from("exchange_territory")
        .select("slug, name, state, center_lat, center_lng")
        .eq("status", "active")
        .order("name"),
      "reading the towns",
    ) as any[];

    return c.json({
      success: true,
      territories: (rows ?? []).map((t) => ({
        slug: t.slug,
        name: t.name,
        state: t.state ?? null,
        // The centre is what a map opens on before it has pins to frame.
        center: t.center_lat != null && t.center_lng != null
          ? { lat: Number(t.center_lat), lng: Number(t.center_lng) }
          : null,
      })),
    });
  } catch (error) {
    return c.json({ success: false, error: String((error as Error).message) }, 500);
  }
});

// ── everything on the map, across categories ─────────────────────────────────

/**
 * Every placeable business in a town, whatever it does.
 *
 * WHY THIS ROUTE HAD TO EXIST
 *
 * Until now a map could only be drawn once a resident had chosen a category,
 * which is backwards: "what is near me" is the question people arrive with,
 * and "plumbers" is an answer they work towards. The browse surface asks them
 * to pick a trade before showing them anything on a map.
 *
 * WHY IT RETURNS A TOWN RATHER THAN A RADIUS
 *
 * A radius query would need the resident's coordinates, and the whole point of
 * the distance work in `exchangeGeo.ts` is that their position never leaves
 * their browser. So the server answers "this town" and the browser does the
 * measuring. The resident sorts and filters locally, from data that was going
 * to be sent anyway, and nothing about where they are is ever transmitted.
 *
 * That is a real trade and worth naming: somebody near a town boundary will
 * not see the shop two miles away in the next town until they switch towns.
 * The alternative buys a better answer by collecting the one piece of data
 * this directory has promised not to collect, which is not a trade worth
 * making for a shorter list.
 *
 * WHY THE FIELDS ARE FEWER THAN THE CATEGORY ROUTE'S
 *
 * Manchester alone is nearly nine hundred businesses. This sends what a pin
 * and a list row need and nothing else; a resident who wants the phone number
 * opens the listing, which is one request for one business rather than nine
 * hundred phone numbers nobody asked for.
 */
const NEARBY_LIMIT = 1500;

/** Where a stored logo is addressed from. Read once; it does not change. */
const PROJECT_URL = Deno.env.get("SUPABASE_URL") ?? "";

exchangeDirectory.get("/exchange/nearby", async (c) => {
  const territory = String(c.req.query("territory") ?? "").trim();

  try {
    const sb = service();

    // Validated against the real list, so a hand-edited value cannot become a
    // query that quietly matches nothing and reads as "no businesses here".
    if (territory) {
      const known = must(
        await sb.from("exchange_territory").select("slug").eq("slug", territory).maybeSingle(),
        "checking that town",
      );
      if (!known) return c.json({ success: false, error: "No such town." }, 404);
    }

    const embeds = ["organization_category!inner ( category_id )"];
    if (territory) embeds.push("organization_territory!inner ( territory_slug )");

    /* The same tolerance as the listing routes above, for the same reason: the
       map must not go down because a migration has not been run yet. */
    const MAP_COLUMNS = "id, slug, name, type, status, claim_state, service_lat, service_lng";
    const rows = must(
      await (async () => {
        const run = (columns: string) => {
          let query = sb.from("organizations")
            .select([columns, ...embeds].join(", "))
            .not("service_lat", "is", null)
            .not("service_lng", "is", null)
            .limit(NEARBY_LIMIT);
          if (territory) query = query.eq("organization_territory.territory_slug", territory);
          return query;
        };

        const asked = logoColumnsExist === false
          ? MAP_COLUMNS
          : `${MAP_COLUMNS}, ${LOGO_SELECT_COLUMNS}`;
        const first = await run(asked);
        if (!first.error) {
          if (asked !== MAP_COLUMNS) logoColumnsExist = true;
          return first;
        }
        if (!looksLikeMissingLogoColumn(first.error)) return first;
        logoColumnsExist = false;
        return run(MAP_COLUMNS);
      })(),
      "reading the businesses here",
    ) as any[];

    // An inner join on categories multiplies a business by its categories, so
    // the same listing arrives more than once. Collapsed here, keeping every
    // category id, because the category list beside the map is built from them.
    const byId = new Map<string, any>();
    for (const row of rows ?? []) {
      if (!row || row.status !== "active" || !PUBLIC_ORG_TYPES.includes(String(row.type))) continue;
      const seen = byId.get(row.id);
      const categoryId = row.organization_category?.category_id
        ?? (Array.isArray(row.organization_category) ? row.organization_category[0]?.category_id : null);
      if (seen) {
        if (categoryId) seen.categoryIds.add(categoryId);
        continue;
      }
      byId.set(row.id, {
        id: row.id,
        slug: row.slug,
        name: row.name,
        claimed: String(row.claim_state ?? "") === "claimed",
        /* Null unless a person approved it AND the claim still stands.
           `publicLogoUrl` is the one place that decides, so no surface can
           serve an image by forgetting to check. */
        logo: publicLogoUrl(row, PROJECT_URL),
        location: { lat: Number(row.service_lat), lng: Number(row.service_lng) },
        categoryIds: new Set(categoryId ? [categoryId] : []),
      });
    }

    const places = [...byId.values()].map((p) => ({
      id: p.id,
      slug: p.slug,
      name: p.name,
      claimed: p.claimed,
      logo: p.logo,
      location: p.location,
      categoryIds: [...p.categoryIds],
    }));

    // The categories actually present, so the list beside the map offers only
    // doors that open onto something.
    const presentIds = new Set(places.flatMap((p) => p.categoryIds));
    const categories = presentIds.size
      ? must(
        await sb.from("exchange_category")
          .select("id, slug, name, section_slug")
          .in("id", [...presentIds])
          .eq("status", "active"),
        "reading the categories",
      ) as any[]
      : [];

    return c.json({
      success: true,
      territory: territory || null,
      // Said out loud: a capped list that looks complete is worse than a short
      // one that admits it.
      truncated: (rows ?? []).length >= NEARBY_LIMIT,
      places,
      categories,
    });
  } catch (error) {
    return c.json({ success: false, error: String((error as Error).message) }, 500);
  }
});

// ── the basemap ──────────────────────────────────────────────────────────────

/**
 * Which MapTiler style to serve.
 *
 * `streets-v2-dark` because the Exchange is a dark interface and dark pins on
 * a light basemap are unreadable. Named here rather than in the browser so
 * that changing the style — or the provider entirely — is a deploy of this
 * function and not of the page.
 */
const MAP_TILE_STYLE = "streets-v2-dark";

/** Both licences require a credit, and the map is where it has to appear. */
const MAP_ATTRIBUTION = "© MapTiler © OpenStreetMap contributors";

/**
 * The basemap style URL, assembled from the tile key this server holds.
 *
 * WHY THE BROWSER ASKS US INSTEAD OF CARRYING THE KEY
 *
 * Eric keeps the key as a Supabase secret (`MAP_TILE_KEY`), which is the right
 * place for it: it is not committed to the repository, and it can be rotated
 * with `supabase secrets set` without rebuilding and redeploying the front
 * end. A constant compiled into the bundle could not do either.
 *
 * WHAT THIS DOES AND DOES NOT PROTECT
 *
 * It does **not** make the key secret. A browser cannot fetch map tiles
 * without it, so anybody who opens the network tab will see it — that is true
 * of every client-side map and is why MapTiler calls these keys publishable.
 * The thing that actually protects it is the **origin restriction** set on the
 * key in the MapTiler console: a request from anywhere but our own domains is
 * refused, so a copied key is worth nothing. This route is about where the
 * value is *stored and rotated*, not about hiding it.
 *
 * So there is deliberately no attempt at access control here beyond what every
 * Exchange route has. Gating it would cost the signed-out visitor their map
 * and gain nothing, because the key reaches the browser either way.
 *
 * WHY A NULL RATHER THAN A URL WITH NO KEY
 *
 * `?key=` returns 403 and MapLibre renders an unexplained void, which reads as
 * our bug. A null lets the page say "the map needs a tile key" instead.
 */
exchangeDirectory.get("/exchange/map-style", (c) => {
  const key = (Deno.env.get("MAP_TILE_KEY") ?? "").trim();

  if (!key) {
    return c.json({ success: true, styleUrl: null, attribution: MAP_ATTRIBUTION });
  }

  // Five minutes: long enough that a resident panning around does not re-ask,
  // short enough that a rotated key takes effect while you are still watching.
  c.header("Cache-Control", "public, max-age=300");

  return c.json({
    success: true,
    styleUrl: `https://api.maptiler.com/maps/${MAP_TILE_STYLE}/style.json?key=${encodeURIComponent(key)}`,
    attribution: MAP_ATTRIBUTION,
  });
});

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

    const { data: row, error } = await selectingListings((columns) => sb
      .from("organizations")
      .select(columns)
      .eq("slug", slug)
      .eq("status", "active")
      .maybeSingle());

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

    /*
     * Anything this business has on at the moment.
     *
     * Served here rather than from a route of its own: it is one more read on
     * a request that is already happening, and a listing page that needed two
     * round trips to tell you about a deal would show the business first and
     * its offer a moment later, which reads as a page changing its mind.
     *
     * THE THREE CONDITIONS ARE ALL NECESSARY
     *
     * `approved` — nothing a business writes reaches a resident until a person
     * has said so, which is the rule the review queue exists to keep.
     * `starts_at <= now` and `ends_at >= now` — because an approved deal that
     * has finished is not a deal, and one that has not started is somebody
     * else's business. The equivalent judgement lives in `isLive` for the
     * routes that read a set of deals; here it is the query, and the two must
     * agree. If that ever stops being true, the account page and the listing
     * page will disagree about what is on, in front of the same resident.
     *
     * The columns are the public ones only. A decision note is correspondence
     * between us and the business, and `created_by` is a person.
     */
    const now = new Date().toISOString();
    const deals = must(
      await sb.from("exchange_deal")
        .select("id, title, body, starts_at, ends_at")
        .eq("org_id", row.id)
        .eq("state", "approved")
        .lte("starts_at", now)
        .gte("ends_at", now)
        .order("ends_at", { ascending: true })
        .limit(10),
      "reading what they have on",
    ) as any[];

    return c.json({
      success: true,
      listing: publicListing(row, categories),
      deals: (deals ?? []).map((d) => ({
        id: d.id,
        title: d.title,
        body: d.body,
        startsAt: d.starts_at,
        endsAt: d.ends_at,
      })),
    });
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

    const rows = must(
      await selectingListings((columns) => {
        let query = sb
          .from("organizations")
          .select([columns, ...embeds].join(", "))
          .eq("organization_category.category_id", holdingId);

        if (territory) {
          query = query.eq("organization_territory.territory_slug", territory);
        }
        return query as any;
      }),
      "organizations",
    ) ?? [];

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
