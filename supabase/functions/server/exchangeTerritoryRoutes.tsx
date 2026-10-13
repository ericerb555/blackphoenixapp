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
