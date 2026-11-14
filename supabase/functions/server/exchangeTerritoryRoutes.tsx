/**
 * Phoenix Exchange — opening and running towns.
 *
 * Staff only, all of it. These routes decide where the directory operates and
 * can write hundreds of rows describing real businesses who never asked to be
 * listed, so none of them belongs in `PUBLIC_PREFIXES` and none ever will.
 *
 * WHY THIS EXISTS AT ALL
 *
 * Adding a town was three manual steps across two tools: hand-written SQL for
 * the territory row, a curl call with a staff session for the ingest, and more
 * SQL to make it visible. Two of those are things only somebody with database
 * access can do, which in practice meant only an agent could add a town — and
 * an agent cannot hold a staff session, so it could not finish the job either.
 * Nobody could do the whole thing.
 *
 * THE GEOCODER WILL HAND YOU A COUNTY IF YOU LET IT
 *
 * Asking Nominatim for "Merrimack, New Hampshire" returns Merrimack COUNTY —
 * centre 43.33, -71.69, about forty-five miles from the town of Merrimack near
 * Nashua. Used unchecked that creates a territory in the wrong place, and the
 * six-kilometre ingest radius then compiles a handful of businesses from
 * whatever happens to be at the county's centroid. Nothing about the result
 * looks wrong; it is simply a different town.
 *
 * So `addresstype` is checked and a county, a state or a region is refused
 * outright. This was found by running it, not by reading the documentation.
 */

import { Hono } from "npm:hono@4";
import { createClient } from "npm:@supabase/supabase-js@2";
import { isStaffRequest } from "./requireStaff.ts";
import { demandGaps } from "./exchangeLedger.ts";
import {
  municipalityQuery,
  candidatesFrom,
  describeCandidates,
  type TownCandidate,
} from "./exchangeTownDiscovery.ts";

export const exchangeTerritoryRoutes = new Hono();

function service() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
}

function must(result: { data: any; error: any } | null, what: string): any {
  if (!result) throw new Error(`${what}: no result`);
  if (result.error) throw new Error(`${what}: ${result.error.message || result.error}`);
  return result.data;
}

/** A settlement, not an administrative area that happens to share its name. */
const SETTLEMENT_TYPES = [
  "town", "city", "village", "hamlet", "municipality", "borough", "suburb",
];

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

// ── what people asked for and did not find ──────────────────────────────────

/**
 * The recruitment worklist, and the answer to "which town next".
 *
 * `demandGaps` and `rankDemandGaps` were written with the ledger and tested,
 * and then nothing ever called them: the worklist existed as arithmetic with
 * no way to read it. This is the route that was missing.
 *
 * WHY IT BELONGS WITH THE TOWN ROUTES
 *
 * Because it answers the same question they do. These routes decide where the
 * directory operates; this is the evidence for that decision, taken from what
 * residents actually tried to find.
 *
 * WHAT IT WILL NOT RETURN
 *
 * The table carries `actor_user_id` and this never selects it — `demandGaps`
 * asks for the category, the town and the phrase and nothing else. The
 * standing rule is that a business learns how many and never who, and a staff
 * screen about unmet demand has even less reason to know. The plan this came
 * from promised the phrase and the town, so that is all there is to show.
 */
exchangeTerritoryRoutes.get("/exchange/admin/demand", async (c) => {
  if (!await isStaffRequest(c)) {
    return c.json({ success: false, error: "Company access is required." }, 403);
  }

  try {
    const sb = service();
    const territory = String(c.req.query("territory") ?? "").trim();
    const days = Math.min(365, Math.max(1, Number(c.req.query("days") ?? 90) || 90));
    const since = new Date(Date.now() - days * 86_400_000).toISOString();

    const gaps = await demandGaps(sb, {
      territorySlug: territory || null,
      since,
      limit: 100,
    });

    /*
     * A category id is not a thing to put on a screen, so the names are
     * resolved here rather than leaving the browser to do a second round trip
     * for a lookup the server already has to hand.
     */
    const ids = [...new Set(gaps.map((g) => g.categoryId).filter(Boolean))] as string[];
    const names = new Map<string, string>();
    if (ids.length) {
      const rows = must(
        await sb.from("exchange_category").select("id, name, slug").in("id", ids),
        "reading the categories",
      ) as any[];
      for (const row of rows ?? []) names.set(String(row.id), String(row.name));
    }

    const towns = must(
      await sb.from("exchange_territory").select("slug, name"),
      "reading the towns",
    ) as any[];
    const townNames = new Map((towns ?? []).map((t: any) => [String(t.slug), String(t.name)]));

    return c.json({
      success: true,
      days,
      gaps: gaps.map((gap) => ({
        categoryId: gap.categoryId,
        // A gap with no category is a phrase nothing could be made of, which
        // is the most interesting kind and must not be dropped for having no
        // name to show.
        category: gap.categoryId ? names.get(gap.categoryId) ?? null : null,
        territorySlug: gap.territorySlug,
        town: gap.territorySlug ? townNames.get(gap.territorySlug) ?? gap.territorySlug : null,
        searches: gap.searches,
        phrases: gap.phrases,
      })),
    });
  } catch (error) {
    return c.json({ success: false, error: String((error as Error).message) }, 500);
  }
});

// ── what we cover, and how full each one is ──────────────────────────────────

exchangeTerritoryRoutes.get("/exchange/admin/territories", async (c) => {
  if (!await isStaffRequest(c)) {
    return c.json({ success: false, error: "Company access is required." }, 403);
  }

  try {
    const sb = service();
    const territories = must(
      await sb.from("exchange_territory")
        .select("slug, name, state, postcodes, center_lat, center_lng, status")
        .order("name"),
      "reading the towns",
    ) as any[];

    /*
     * How many listings each town holds, which is the number that decides
     * whether it is worth showing anybody. A town with nine businesses reads
     * as a broken product rather than a new one.
     */
    const links = must(
      await sb.from("organization_territory").select("territory_slug"),
      "counting the listings",
    ) as any[];

    const counts = new Map<string, number>();
    for (const l of links ?? []) {
      counts.set(l.territory_slug, (counts.get(l.territory_slug) ?? 0) + 1);
    }

    return c.json({
      success: true,
      territories: (territories ?? []).map((t) => ({
        slug: t.slug,
        name: t.name,
        state: t.state ?? null,
        postcodes: t.postcodes ?? [],
        center: t.center_lat != null && t.center_lng != null
          ? { lat: Number(t.center_lat), lng: Number(t.center_lng) }
          : null,
        status: t.status,
        listings: counts.get(t.slug) ?? 0,
      })),
    });
  } catch (error) {
    return c.json({ success: false, error: String((error as Error).message) }, 500);
  }
});

// ── look a town up before creating it ────────────────────────────────────────

/**
 * Ask OpenStreetMap where a town is, and refuse anything that is not one.
 *
 * Separate from creating it, so the centre can be looked at before it is
 * committed to. The coordinates decide what the ingest sweeps, and a centre
 * two miles out quietly compiles half the wrong town.
 */
exchangeTerritoryRoutes.post("/exchange/admin/territories/lookup", async (c) => {
  if (!await isStaffRequest(c)) {
    return c.json({ success: false, error: "Company access is required." }, 403);
  }

  const body = await c.req.json().catch(() => ({}));
  const name = String(body?.name ?? "").trim();
  const state = String(body?.state ?? "NH").trim().toUpperCase();
  if (name.length < 2) return c.json({ success: false, error: "Which town?" }, 400);

  try {
    const url = "https://nominatim.openstreetmap.org/search"
      + `?q=${encodeURIComponent(`${name}, ${state}, USA`)}`
      + "&format=json&limit=5&addressdetails=1";

    const res = await fetch(url, {
      headers: {
        // Nominatim requires an identifiable agent. An anonymous caller is
        // what gets a project blocked, and we rely on their data elsewhere.
        "User-Agent": "BlackPhoenixExchange/1.0 (+https://theblackphoenixcompany.com)",
        "Accept-Language": "en",
      },
    });
    if (!res.ok) {
      return c.json({ success: false, error: `The geocoder answered ${res.status}.` }, 502);
    }

    const hits = await res.json();
    const settlements = (Array.isArray(hits) ? hits : [])
      .filter((h: any) => SETTLEMENT_TYPES.includes(String(h?.addresstype ?? "")));

    if (!settlements.length) {
      const got = (Array.isArray(hits) ? hits : []).map((h: any) => h?.addresstype).filter(Boolean);
      return c.json({
        success: false,
        // Named explicitly, because "not found" would send somebody looking
        // for a spelling mistake when the real answer is "that is a county".
        error: got.length
          ? `No town of that name — the geocoder offered ${[...new Set(got)].join(", ")} instead. Enter the centre by hand if you know it.`
          : "The geocoder has no town of that name.",
      }, 404);
    }

    return c.json({
      success: true,
      matches: settlements.slice(0, 3).map((h: any) => ({
        label: h.display_name,
        kind: h.addresstype,
        center: { lat: Number(h.lat), lng: Number(h.lon) },
        postcode: h.address?.postcode ?? null,
      })),
    });
  } catch (error) {
    return c.json({ success: false, error: String((error as Error).message) }, 502);
  }
});

// ── open one ─────────────────────────────────────────────────────────────────

exchangeTerritoryRoutes.post("/exchange/admin/territories", async (c) => {
  if (!await isStaffRequest(c)) {
    return c.json({ success: false, error: "Company access is required." }, 403);
  }

  const body = await c.req.json().catch(() => ({}));
  const name = String(body?.name ?? "").trim();
  const state = String(body?.state ?? "NH").trim().toUpperCase();
  const slug = String(body?.slug ?? "").trim().toLowerCase();
  const lat = Number(body?.lat);
  const lng = Number(body?.lng);
  const postcodes = Array.isArray(body?.postcodes)
    ? body.postcodes.map((p: unknown) => String(p).trim()).filter(Boolean)
    : [];

  if (name.length < 2) return c.json({ success: false, error: "Which town?" }, 400);
  if (!SLUG.test(slug)) return c.json({ success: false, error: "The slug has to be lower case, words joined by hyphens." }, 400);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    return c.json({ success: false, error: "That centre is not a place." }, 400);
  }
  /*
   * A town with no postcodes is a town the ingest cannot bound. `belongsTo
   * Territory` uses them to keep a neighbour's businesses out, and Pelham is
   * close enough to Massachusetts that the difference is a different state.
   */
  if (!postcodes.length) {
    return c.json({ success: false, error: "At least one postcode, or the ingest cannot tell this town from the next one." }, 400);
  }

  try {
    const sb = service();
    const existing = must(
      await sb.from("exchange_territory").select("slug").eq("slug", slug).maybeSingle(),
      "checking for that town",
    );
    if (existing) return c.json({ success: false, error: "That town is already here." }, 409);

    // Hidden, always. A town is ingested long before it is worth visiting, and
    // whether it is ready is a judgement rather than a threshold.
    must(
      await sb.from("exchange_territory").insert({
        slug, name, state, postcodes,
        center_lat: lat, center_lng: lng,
        status: "hidden",
      }),
      "opening the town",
    );

    return c.json({ success: true, slug, status: "hidden" });
  } catch (error) {
    return c.json({ success: false, error: String((error as Error).message) }, 500);
  }
});

// ── show it to residents, or take it back ────────────────────────────────────

exchangeTerritoryRoutes.post("/exchange/admin/territories/:slug/status", async (c) => {
  if (!await isStaffRequest(c)) {
    return c.json({ success: false, error: "Company access is required." }, 403);
  }

  const slug = String(c.req.param("slug") ?? "").trim().toLowerCase();
  const status = String((await c.req.json().catch(() => ({})))?.status ?? "").trim();
  if (!SLUG.test(slug)) return c.json({ success: false, error: "Which town?" }, 400);
  // The column's own check constraint allows exactly these two.
  if (status !== "active" && status !== "hidden") {
    return c.json({ success: false, error: "A town is either active or hidden." }, 400);
  }

  try {
    const sb = service();
    const town = must(
      await sb.from("exchange_territory").select("slug, name").eq("slug", slug).maybeSingle(),
      "finding that town",
    );
    if (!town) return c.json({ success: false, error: "No such town." }, 404);

    must(
      await sb.from("exchange_territory").update({ status }).eq("slug", slug),
      "changing it",
    );
    return c.json({ success: true, slug, status });
  } catch (error) {
    return c.json({ success: false, error: String((error as Error).message) }, 500);
  }
});


/* ── growing the map ────────────────────────────────────────────────────── */

/**
 * Phoenix Exchange — finding towns to add, and adding the ones chosen.
 *
 * Eric: "i want it to grow over time so the app can cover larger areas and i
 * sell more territories."
 *
 * Coverage had been flat at five towns because nothing in the system had
 * ever created a territory — the seed listed three, two more were typed in,
 * and the weekly clock faithfully refreshed those five forever. These two
 * routes are the missing half: one asks OpenStreetMap what municipalities
 * exist, the other adds the ones somebody picked.
 *
 * THE SPLIT IS THE POINT. Discovery writes nothing. A territory is inventory
 * Eric sells as exclusive, so which towns exist stays a decision a person
 * makes; what is removed is the typing, not the judgement.
 */

const OVERPASS = "https://overpass-api.de/api/interpreter";
// Overpass rates and blocks by client. Same identity as the ingest, so the
// two halves of this feature are one caller rather than two.
const OVERPASS_AGENT = "PhoenixExchange/1.0 (local business directory; contact blackphoenixbuilds@proton.me)";

/** A county-wide municipality query is slower than a town; same ceiling as the ingest. */
const OVERPASS_TIMEOUT_MS = 90_000;

/**
 * Ask Overpass for the municipalities of a state, or one county of it.
 *
 * ONE CALL. The query asks for tags and a centre, never geometry — the
 * polygons of 234 municipalities are megabytes this never reads, and asking
 * a free shared endpoint for them is how this project got blocked once
 * already.
 *
 * Staff only, and it writes nothing, so it is safe to press twice.
 */
exchangeTerritoryRoutes.post("/exchange/admin/territories/discover", async (c) => {
  if (!await isStaffRequest(c)) {
    return c.json({ success: false, error: "Company access is required." }, 403);
  }

  const body = await c.req.json().catch(() => ({}));
  const state = String(body?.state ?? "NH").trim().toUpperCase();
  const county = String(body?.county ?? "").trim();
  if (!/^[A-Z]{2}$/.test(state)) {
    return c.json({ success: false, error: "Which state? Two letters, e.g. NH." }, 400);
  }

  let elements: unknown[] = [];
  try {
    /*
     * The same call shape `exchangeIngestRun` uses, down to the User-Agent —
     * and now, as of 2026-11-13, the same plain `fetch` too.
     *
     * It went through `safeFetch`, and the scheduled ingest doing the same
     * thing came back `Overpass refused 406` once a day for a week. 406 is
     * the nginx front door turning away a request with NO User-Agent, so the
     * agent named on the line below was not arriving. The whole reasoning is
     * on `askOverpass` in `exchangeIngestRun.ts`; this is the second caller
     * and it had the identical defect.
     *
     * Overpass rates and blocks by client, and two different shapes from one
     * project is two things to be blocked for — so the two stay identical.
     */
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), OVERPASS_TIMEOUT_MS);
    let res: Response;
    try {
      res = await fetch(OVERPASS, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent": OVERPASS_AGENT,
          Accept: "application/json",
        },
        body: new URLSearchParams({ data: municipalityQuery(state, county) }).toString(),
        redirect: "error",
        signal: controller.signal,
      });
    } catch (e: any) {
      return c.json({
        success: false,
        error: `Overpass did not answer: ${e?.message || "the request never completed"}.`,
      }, 502);
    } finally {
      clearTimeout(timer);
    }

    const result = {
      ok: res.ok,
      status: res.status,
      body: await res.text().catch(() => ""),
    };
    if (!result.ok || !result.body) {
      /*
       * Say what Overpass actually said. "Could not reach it" sends somebody
       * looking at their own network for a 504 from a free service that is
       * entitled to refuse us — and it hid the 406 for a week.
       */
      return c.json({
        success: false,
        error: result.status === 406
          ? "Overpass refused the request as unidentified (406), which means our User-Agent "
            + "did not arrive. That is ours to fix, not a busy endpoint."
          : `Overpass answered ${result.status}. It is a free shared service and refuses `
            + "under load — this is worth trying again in a few minutes.",
      }, 502);
    }
    const payload = JSON.parse(result.body) as any;
    elements = Array.isArray(payload?.elements) ? payload.elements : [];
  } catch (err: any) {
    return c.json({ success: false, error: String(err?.message || err) }, 502);
  }

  // Flagged as existing rather than filtered out, so a second look at a
  // county shows what is already covered instead of a shorter list with no
  // explanation of what happened to the rest.
  const sb = service();
  const have = must(
    await sb.from("exchange_territory").select("slug"),
    "reading the towns already here",
  ) as Array<{ slug: string }> | null;

  const found = candidatesFrom(
    elements as any[],
    state,
    (have || []).map((r) => r.slug),
  );

  return c.json({
    success: true,
    state,
    county: county || null,
    summary: describeCandidates(found),
    towns: found,
  });
});

/**
 * Add the towns somebody chose, as hidden territories.
 *
 * HIDDEN, ALWAYS — the same rule the single-town route states: "A town is
 * ingested long before it is worth visiting, and whether it is ready is a
 * judgement rather than a threshold." Adding thirty at once does not make
 * that judgement thirty times faster.
 *
 * Every town is validated again HERE rather than trusted from the discovery
 * response. The client could send anything, and a territory with a bad
 * centre or no postcode quietly collects a neighbour's businesses — which is
 * worse than one that was never added, because it looks right.
 *
 * Partial success is reported, not rolled back. Twenty-eight towns added and
 * two refused is a better outcome than nothing added because two boundaries
 * had no postcode, and the two are named so they can be fixed by hand.
 */
exchangeTerritoryRoutes.post("/exchange/admin/territories/bulk", async (c) => {
  if (!await isStaffRequest(c)) {
    return c.json({ success: false, error: "Company access is required." }, 403);
  }

  const body = await c.req.json().catch(() => ({}));
  const towns = Array.isArray(body?.towns) ? body.towns : [];
  if (!towns.length) return c.json({ success: false, error: "No towns were sent." }, 400);
  if (towns.length > 300) {
    return c.json({ success: false, error: "That is more than 300 towns in one go." }, 400);
  }

  const sb = service();
  const have = new Set(
    ((must(await sb.from("exchange_territory").select("slug"), "reading the towns already here") as
      Array<{ slug: string }> | null) || []).map((r) => String(r.slug).toLowerCase()),
  );

  const added: string[] = [];
  const skipped: Array<{ slug: string; why: string }> = [];

  for (const raw of towns as TownCandidate[]) {
    const slug = String(raw?.slug ?? "").trim().toLowerCase();
    const name = String(raw?.name ?? "").trim();
    const state = String(raw?.state ?? "NH").trim().toUpperCase();
    const lat = Number(raw?.lat);
    const lng = Number(raw?.lng);
    const postcodes = Array.isArray(raw?.postcodes)
      ? raw.postcodes.map((x) => String(x).trim()).filter((x) => /^\d{5}$/.test(x))
      : [];

    if (!SLUG.test(slug) || name.length < 2) {
      skipped.push({ slug: slug || name || "(unnamed)", why: "The name or the slug is not usable." });
      continue;
    }
    if (have.has(slug)) {
      skipped.push({ slug, why: "Already here." });
      continue;
    }
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180
      || (lat === 0 && lng === 0)) {
      skipped.push({ slug, why: "That centre is not a place." });
      continue;
    }
    if (!postcodes.length) {
      skipped.push({ slug, why: "No postcode, so the ingest could not tell it from its neighbours." });
      continue;
    }

    try {
      must(
        await sb.from("exchange_territory").insert({
          slug, name, state, postcodes,
          center_lat: lat, center_lng: lng,
          status: "hidden",
        }),
        `adding ${slug}`,
      );
      have.add(slug);
      added.push(slug);
    } catch (err: any) {
      skipped.push({ slug, why: String(err?.message || err) });
    }
  }

  /*
   * Nothing is compiled here. The clock picks up a never-compiled town ahead
   * of every stale one, so these join the front of its queue and are filled
   * one per tick — which is what keeps a free endpoint answering.
   */
  return c.json({
    success: true,
    added: added.length,
    skipped: skipped.length,
    addedSlugs: added,
    skippedTowns: skipped,
    summary: `${added.length} town(s) added as hidden${skipped.length ? `, ${skipped.length} skipped` : ""}. `
      + "The upkeep clock will compile them one at a time, newest-uncompiled first.",
  });
});
