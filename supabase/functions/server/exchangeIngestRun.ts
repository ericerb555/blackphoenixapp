/**
 * Phoenix Exchange — compiling the directory, one town at a time.
 *
 * The part that touches the world. Every rule it applies lives somewhere pure
 * and tested: `exchangeOsm.ts` turns an Overpass element into a record and
 * decides whether it belongs to the territory, `exchangeIngest.ts` decides
 * what a listing may contain, how two records are the same business, and what
 * a re-import is allowed to change. This file fetches, writes, and counts.
 *
 * IT RUNS ONE TOWN PER CALL, AND THAT IS THE DESIGN
 *
 * The public Overpass endpoint answered 504 on two of three towns during
 * testing, repeatedly. It is a free shared service and it is entitled to say
 * no. So a run is a town, the caller decides when to come back, and a failure
 * costs one town rather than the whole directory. `mergeListing` makes
 * re-running safe, which is what makes "try again later" a real answer rather
 * than a hope.
 *
 * DRY RUN IS THE DEFAULT
 *
 * The route writes nothing unless it is asked to in so many words. Compiling a
 * directory inserts hundreds of rows describing real businesses that never
 * asked to be there; being able to see exactly what a run would do, before it
 * does it, is worth the one extra parameter.
 *
 * WHAT IT WILL NOT DO
 *
 * It never touches a claimed listing — `mergeListing` returns an empty patch
 * for one, and this file does not second-guess it. It never overwrites an
 * answer on an unclaimed listing either; it only fills gaps. And it never
 * invents a category: an unrecognised trade is left unassigned, which is
 * visible and fixable, rather than guessed into something adjacent.
 *
 * ATTRIBUTION IS A LICENCE TERM. OSM data is ODbL, and every listing written
 * here records `openstreetmap` as its source so the obligation can be met and
 * audited rather than remembered.
 */
import { createClient } from "npm:@supabase/supabase-js@2";
import { safeFetch } from "./outboundGuard.ts";
import {
  osmToRegistryRecord,
  osmCoordinates,
  overpassQuery,
  belongsToTerritory,
  OSM_ATTRIBUTION,
  type OverpassElement,
} from "./exchangeOsm.ts";
import {
  toListing,
  dedupeListings,
  mergeListing,
  listingSlug,
  collidesWithInviteSlug,
  type ListingCandidate,
} from "./exchangeIngest.ts";

const OVERPASS = "https://overpass-api.de/api/interpreter";

/**
 * Overpass asks for a User-Agent that identifies the caller, and refuses with
 * 406 without one. Naming the project and a contact is the courtesy the
 * endpoint's terms ask for.
 */
const USER_AGENT = "PhoenixExchange/1.0 (local business directory; contact blackphoenixbuilds@proton.me)";

export interface IngestOutcome {
  territory: string;
  found: number;
  outsideTerritory: number;
  notListable: number;
  duplicates: number;
  created: number;
  filled: number;
  untouched: number;
  uncategorised: number;
  attribution: string;
  dryRun: boolean;
  error?: string;
}

/** The alias table as the resolver `toListing` expects. */
async function aliasIndex(sb: any): Promise<Map<string, string>> {
  const { data, error } = await sb
    .from("exchange_category_alias")
    .select("phrase, exchange_category ( slug )");
  if (error) throw new Error(`exchange_category_alias: ${error.message}`);

  const index = new Map<string, string>();
  for (const row of data ?? []) {
    const slug = (row as any)?.exchange_category?.slug;
    // The same normalisation the SQL `exchange_normalise_phrase` applies, so a
    // phrase resolves identically here and in the database.
    const phrase = String((row as any)?.phrase ?? "").toLowerCase().replace(/\s+/g, " ").trim();
    if (slug && phrase) index.set(phrase, slug);
  }
  return index;
}

/**
 * Ask Overpass for one town.
 *
 * Through `safeFetch`, which revalidates every redirect hop — the endpoint is
 * ours to choose rather than attacker-supplied, so this is belt and braces
 * rather than the main defence, and it also gives us the size ceiling for
 * free.
 */
async function fetchTown(lat: number, lng: number, radiusMetres: number): Promise<OverpassElement[]> {
  const result = await safeFetch(OVERPASS, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": USER_AGENT,
      Accept: "application/json",
    },
    body: new URLSearchParams({ data: overpassQuery(lat, lng, radiusMetres) }).toString(),
  });

  if (!result.ok || !result.body) {
    throw new Error(result.error || "Overpass did not answer");
  }
  // A 504 comes back as an HTML page, not JSON. Saying so plainly beats a
  // JSON parse error that reads like our bug.
  if (!result.body.trimStart().startsWith("{")) {
    throw new Error("Overpass is busy right now (it answered with an error page). Try again shortly.");
  }

  const payload = JSON.parse(result.body);
  return Array.isArray(payload?.elements) ? payload.elements : [];
}

/** Find the listing this candidate already is, if we have it. */
async function findExisting(sb: any, candidate: ListingCandidate) {
  // Phone first, exactly as `dedupeKeyFor` reasons: two sources rarely agree
  // on an address and almost always agree on a number.
  if (candidate.phone) {
    const { data } = await sb
      .from("organizations")
      .select("id, name, phone, website, license_number, claim_state, listing_source")
      .eq("phone", candidate.phone)
      .limit(1)
      .maybeSingle();
    if (data) return data;
  }

  const { data } = await sb
    .from("organizations")
    .select("id, name, phone, website, license_number, claim_state, listing_source")
    .eq("name", candidate.name)
    .limit(1)
    .maybeSingle();
  return data ?? null;
}

/** A slug nothing else is using. */
async function freeSlug(sb: any, candidate: ListingCandidate): Promise<string> {
  const first = listingSlug(candidate.name);
  const withPostcode = listingSlug(candidate.name, candidate.postcode);

  for (const slug of [first, withPostcode]) {
    // A compiled listing must never take a slug the invite flow would build,
    // because ensureOrganization REUSES an org it finds by slug — see
    // collidesWithInviteSlug for what that would hand to the wrong person.
    if (collidesWithInviteSlug(slug)) continue;
    const { data } = await sb.from("organizations").select("id").eq("slug", slug).maybeSingle();
    if (!data) return slug;
  }

  // Two of the same name in the same postcode. Rare, and a numbered tail is
  // better than refusing to list the second one.
  for (let n = 2; n < 50; n += 1) {
    const slug = listingSlug(candidate.name, `${candidate.postcode ?? ""}${n}`);
    if (collidesWithInviteSlug(slug)) continue;
    const { data } = await sb.from("organizations").select("id").eq("slug", slug).maybeSingle();
    if (!data) return slug;
  }
  throw new Error(`could not find a free slug for ${candidate.name}`);
}

/**
 * Compile one territory.
 *
 * `dryRun` defaults to true at the route; this function does exactly what it
 * is told.
 */
export async function ingestTerritory(
  sb: any,
  territorySlug: string,
  options: { dryRun: boolean; radiusMetres?: number },
): Promise<IngestOutcome> {
  const outcome: IngestOutcome = {
    territory: territorySlug,
    found: 0, outsideTerritory: 0, notListable: 0, duplicates: 0,
    created: 0, filled: 0, untouched: 0, uncategorised: 0,
    attribution: OSM_ATTRIBUTION,
    dryRun: options.dryRun,
  };

  const { data: territory, error: territoryError } = await sb
    .from("exchange_territory")
    .select("slug, name, state, postcodes, center_lat, center_lng")
    .eq("slug", territorySlug)
    .eq("status", "active")
    .maybeSingle();

  if (territoryError) throw new Error(`exchange_territory: ${territoryError.message}`);
  if (!territory) throw new Error(`no such territory: ${territorySlug}`);
  if (territory.center_lat == null || territory.center_lng == null) {
    throw new Error(`${territorySlug} has no centre, so there is nowhere to search`);
  }

  const aliases = await aliasIndex(sb);
  const elements = await fetchTown(
    Number(territory.center_lat),
    Number(territory.center_lng),
    options.radiusMetres ?? 6000,
  );
  outcome.found = elements.length;

  const town = { name: territory.name, state: territory.state, territorySlug: territory.slug };
  const candidates: ListingCandidate[] = [];
  const coordinates = new Map<string, { lat: number; lng: number }>();

  for (const element of elements) {
    const record = osmToRegistryRecord(element, town);
    if (!record) continue;

    if (!belongsToTerritory(record, { postcodes: territory.postcodes, state: territory.state })) {
      outcome.outsideTerritory += 1;
      continue;
    }

    const candidate = toListing(record, aliases);
    if (!candidate) {
      outcome.notListable += 1;
      continue;
    }

    const point = osmCoordinates(element);
    if (point) coordinates.set(candidate.dedupeKey, point);
    candidates.push(candidate);
  }

  const deduped = dedupeListings(candidates);
  outcome.duplicates = candidates.length - deduped.length;
  outcome.uncategorised = deduped.filter((c) => !c.categorySlug).length;

  for (const candidate of deduped) {
    const existing = await findExisting(sb, candidate);
    const patch = mergeListing(existing, candidate);

    if (existing && Object.keys(patch).length === 0) {
      // Claimed, or owned by a human, or nothing to add. All three mean leave
      // it exactly as it is.
      outcome.untouched += 1;
      continue;
    }

    if (existing) {
      outcome.filled += 1;
      if (!options.dryRun) {
        await sb.from("organizations").update({ ...patch, updated_at: new Date().toISOString() }).eq("id", existing.id);
      }
      continue;
    }

    outcome.created += 1;
    if (options.dryRun) continue;

    const point = coordinates.get(candidate.dedupeKey);
    const slug = await freeSlug(sb, candidate);

    const { data: created, error } = await sb
      .from("organizations")
      .insert({
        // Its own type, so a compiled pizzeria is never in front of a
        // construction screen that lists subcontractors.
        type: "exchange_business",
        name: candidate.name,
        slug,
        phone: candidate.phone,
        website: candidate.website,
        status: "active",
        claim_state: "listed",
        listing_source: "registry",
        verification_state: "unverified",
        service_lat: point?.lat ?? null,
        service_lng: point?.lng ?? null,
      })
      .select("id")
      .single();

    if (error) {
      // One bad row must not end the town.
      console.error(`[exchange] could not create ${candidate.name}:`, error.message);
      outcome.created -= 1;
      continue;
    }

    if (candidate.categorySlug && created?.id) {
      const { data: category } = await sb
        .from("exchange_category")
        .select("id")
        .eq("slug", candidate.categorySlug)
        .maybeSingle();

      if (category?.id) {
        await sb.from("organization_category")
          .insert({ org_id: created.id, category_id: category.id });
      }
    }

    if (created?.id) {
      await sb.from("organization_territory")
        .insert({ org_id: created.id, territory_slug: territory.slug });
    }
  }

  return outcome;
}
