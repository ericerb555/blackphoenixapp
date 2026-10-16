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
  overpassClassQueries,
  truncatedClasses,
  dedupeOsmElements,
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
  /**
   * Whether residents can see this town yet.
   *
   * Reported because compiling now works on a hidden town — see the note on
   * the territory lookup — and a run that created 400 listings nobody can see
   * must say so. Otherwise "Compiled hudson-nh: 412 new" reads as done, and
   * the town stays invisible with nothing to suggest a step is outstanding.
   */
  status?: string;
  found: number;
  outsideTerritory: number;
  notListable: number;
  duplicates: number;
  created: number;
  filled: number;
  untouched: number;
  uncategorised: number;
  /**
   * Listings already in the directory that gained a category this run,
   * because one now exists that did not when they were compiled.
   */
  categorised: number;
  /**
   * Feature classes that came back at their query's limit, and so may have
   * been cut short. Empty is the normal and expected answer; anything in here
   * means the town should be re-run over a smaller radius, because the
   * directory it produced is short by an unknown amount.
   */
  truncated: string[];
  attribution: string;
  dryRun: boolean;
  error?: string;
}

/**
 * The category a business may actually hold, for a slug that might name a
 * service under one.
 *
 * A BUSINESS HOLDS A CATEGORY, NEVER A SERVICE UNDER ONE. The alias table can
 * resolve a phrase to a service leaf: "lawyer" resolves to `family-law`,
 * whose parent is `lawyers`. Inserting the leaf is refused by
 * `exchange_org_category_guard` with "a business holds categories, not
 * individual services" — and because that insert was the last thing done for a
 * listing, the organisation row went in and its category did not.
 *
 * Found compiling Manchester, which has eleven law offices: every one resolved
 * to the service. Taking the parent is the same rule the read path already
 * applies in reverse, since a category page lists the businesses holding its
 * parent (`holdingId` in exchangeDirectory). One copy, used by both the
 * create and the fill paths.
 */
async function holdingCategoryId(sb: any, slug: string): Promise<string | null> {
  const { data } = await sb
    .from("exchange_category")
    .select("id, parent_id")
    .eq("slug", slug)
    .maybeSingle();
  return (data?.parent_id ?? data?.id) ?? null;
}

/**
 * Give an existing listing the category it could not have had.
 *
 * WHY THIS EXISTS
 *
 * The runner filled missing COLUMNS on a listing it had seen before and never
 * touched its categories. That was invisible until the taxonomy grew: on
 * 2026-10-12 a Shops & Retail section was added, and 595 of 1,090 compiled
 * listings — every shop in the directory — were sitting uncategorised because
 * when they were compiled there was nowhere to put a shop. Re-running the
 * ingest would have found them all, filled nothing, and reported them
 * untouched.
 *
 * It adds only. A listing that already holds a category keeps it, because a
 * person may have corrected it by hand and a re-run must never overrule that.
 */
async function fillMissingCategory(
  sb: any,
  orgId: string,
  categorySlug: string | null,
  dryRun: boolean,
): Promise<boolean> {
  if (!categorySlug) return false;

  const { data: already } = await sb
    .from("organization_category")
    .select("org_id")
    .eq("org_id", orgId)
    .limit(1);
  if (already?.length) return false;

  const holdingId = await holdingCategoryId(sb, categorySlug);
  if (!holdingId) return false;
  if (dryRun) return true;

  const { error } = await sb
    .from("organization_category")
    .insert({ org_id: orgId, category_id: holdingId });
  // A guard refusal or a race must not end the town, and must not be counted
  // as a success either.
  if (error) {
    console.error(`[exchange] could not categorise ${orgId}:`, error.message);
    return false;
  }
  return true;
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
 * Ask Overpass one question.
 *
 * Through `safeFetch`, which revalidates every redirect hop — the endpoint is
 * ours to choose rather than attacker-supplied, so this is belt and braces
 * rather than the main defence, and it also gives us the size ceiling for
 * free.
 */
async function askOverpass(query: string): Promise<OverpassElement[]> {
  const result = await safeFetch(OVERPASS, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": USER_AGENT,
      Accept: "application/json",
    },
    body: new URLSearchParams({ data: query }).toString(),
  });

  if (!result.ok || !result.body) {
    /**
     * SAY WHAT OVERPASS ACTUALLY SAID.
     *
     * This threw `result.error || "Overpass did not answer"`, and `safeFetch`
     * sets `error` only when the request never completed — a blocked address, a
     * DNS failure, a timeout. A real HTTP response that is simply not 2xx comes
     * back as `{ ok: false, status }` with no `error` at all, so every refusal
     * BY Overpass was reported as Overpass not answering, with the status
     * thrown away.
     *
     * Found by firing the first real tick on 2026-10-16: the run recorded
     * "Overpass did not answer" after 906ms, which is far too fast to be a
     * timeout and was the clue. Asked directly, the endpoint was returning
     *
     *   502 — "This Overpass API server is currently at capacity. All query
     *   workers are busy and the request queue is full."
     *
     * which is a different situation with a different answer: nothing is wrong
     * with us, nothing is misconfigured, and the response is to come back
     * later. "Did not answer" reads as a network or credential problem and
     * sends somebody looking in the wrong place.
     *
     * 429 is the one that WOULD be about us — too many requests — and telling
     * the two apart matters, because one means wait and the other means we are
     * asking too often.
     */
    const status = result.status ? ` ${result.status}` : "";
    const detail = result.error
      ? result.error
      : result.status === 429
        ? "it is rate-limiting us, so we are asking too often"
        : result.status === 502 || result.status === 504
          ? "it is at capacity; all its query workers are busy"
          : "it answered with no usable body";
    throw new Error(`Overpass refused${status}: ${detail}`);
  }
  // A 504 comes back as an HTML page, not JSON. Saying so plainly beats a
  // JSON parse error that reads like our bug.
  if (!result.body.trimStart().startsWith("{")) {
    throw new Error("Overpass is busy right now (it answered with an error page). Try again shortly.");
  }

  const payload = JSON.parse(result.body);
  return Array.isArray(payload?.elements) ? payload.elements : [];
}

/**
 * Ask Overpass for one town, one feature class at a time.
 *
 * WHY NOT ONE QUERY. `out ... 800` caps the COMBINED result, so a single query
 * makes the four classes compete for one allowance and drops the overflow
 * silently — no flag, no warning, HTTP 200, well-formed JSON. Manchester lost
 * 431 of its 1231 features that way and produced a directory a third short
 * that looked completely normal, because every listing in it was real. See
 * `overpassClassQueries`.
 *
 * A class that comes back AT its limit is reported through `truncated`, which
 * `ingestTerritory` passes up into the outcome. That is the only signal
 * truncation gives, and a run that hides it is the bug all over again.
 */
async function fetchTown(
  lat: number,
  lng: number,
  radiusMetres: number,
): Promise<{ elements: OverpassElement[]; truncated: string[] }> {
  const counts: Record<string, number> = {};
  const collected: OverpassElement[] = [];

  // Sequentially, not in parallel: this is a shared free endpoint and four
  // simultaneous queries from one caller is not the courtesy its terms ask
  // for.
  for (const { className, query } of overpassClassQueries(lat, lng, radiusMetres)) {
    const elements = await askOverpass(query);
    counts[className] = elements.length;
    collected.push(...elements);
  }

  // A feature can answer two classes — a bakery that bakes on site is both
  // `shop` and `craft` — so identity is OSM's own type and id.
  return { elements: dedupeOsmElements(collected), truncated: truncatedClasses(counts) };
}

/**
 * Find the listing this candidate already is, if we have it.
 *
 * A SHARED PHONE MEANS THE SAME BUSINESS. A SHARED NAME DOES NOT.
 *
 * This matched on name alone, and the first real run showed what that costs:
 * Pelham now holds a Dunkin', a Subway, a McDonald's and a Supercuts, and
 * Salem has its own of each. Name-only matching would have found Pelham's and
 * skipped Salem's — quietly refusing to list a real business because a
 * different branch of the same chain was already in the directory.
 *
 * `dedupeKeyFor` already says the key is phone, or name PLUS postcode. The
 * postcode is the part that was missing here, and `organizations` does not
 * store one — so the territory stands in for it. Two businesses of the same
 * name in the same town are the same business; in different towns they are
 * not.
 */
async function findExisting(sb: any, candidate: ListingCandidate, territorySlug: string) {
  const COLUMNS = "id, name, phone, website, license_number, claim_state, listing_source";

  // Phone first, exactly as `dedupeKeyFor` reasons: two sources rarely agree
  // on an address and almost always agree on a number.
  if (candidate.phone) {
    const { data } = await sb
      .from("organizations")
      .select(COLUMNS)
      .eq("phone", candidate.phone)
      .limit(1)
      .maybeSingle();
    if (data) return data;
  }

  // Same name AND already in this territory.
  const { data: sameName } = await sb
    .from("organizations")
    .select(`${COLUMNS}, organization_territory!inner(territory_slug)`)
    .eq("name", candidate.name)
    .eq("organization_territory.territory_slug", territorySlug)
    .limit(1)
    .maybeSingle();

  return sameName ?? null;
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
    created: 0, filled: 0, untouched: 0, uncategorised: 0, categorised: 0,
    truncated: [],
    attribution: OSM_ATTRIBUTION,
    dryRun: options.dryRun,
  };

  /**
   * ANY status, and that is the fix for a flow that could not complete.
   *
   * This filtered on `status = 'active'`, which made the documented way of
   * opening a town impossible. `ExchangeTowns.tsx` states the order of the
   * work — *"open it → create it HIDDEN — residents see nothing yet"*, then
   * *"compile it"*, then *"show it"* — and says after creating one: "X is open
   * and hidden. Compile it, then show it when it is worth visiting."
   *
   * Compiling it threw `no such territory`, every time, because the town it
   * had just told you to compile was hidden. So step three of a four-step flow
   * could never run, and the only way to compile a town was to promote it
   * first — publishing an empty town to residents, which is the precise thing
   * hiding it exists to prevent.
   *
   * Found on 2026-10-16 while answering why Hudson and Windham held no
   * listings. Both were created, both hidden, both with zero businesses, and
   * nothing anywhere said why.
   *
   * The filter was copied from the read path, where it is right: a resident is
   * served active towns only. Compiling is a staff act on a town that is
   * deliberately not yet visible, so the statuses it accepts are both of them.
   * `status` is constrained to `active` or `hidden` by the table, so there is
   * no third thing this now lets in.
   */
  const { data: territory, error: territoryError } = await sb
    .from("exchange_territory")
    .select("slug, name, state, postcodes, center_lat, center_lng, status")
    .eq("slug", territorySlug)
    .maybeSingle();

  if (territoryError) throw new Error(`exchange_territory: ${territoryError.message}`);
  if (!territory) throw new Error(`no such territory: ${territorySlug}`);
  if (territory.center_lat == null || territory.center_lng == null) {
    throw new Error(`${territorySlug} has no centre, so there is nowhere to search`);
  }
  outcome.status = String(territory.status || '');

  const aliases = await aliasIndex(sb);
  const { elements, truncated } = await fetchTown(
    Number(territory.center_lat),
    Number(territory.center_lng),
    options.radiusMetres ?? 6000,
  );
  outcome.found = elements.length;
  outcome.truncated = truncated;

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
    const existing = await findExisting(sb, candidate, territory.slug);
    const patch = mergeListing(existing, candidate);

    if (existing) {
      /**
       * Before anything else, because a listing with nothing else to fill
       * returns early below — and a missing category is the most likely thing
       * to be missing on a listing compiled before its category existed.
       */
      if (await fillMissingCategory(sb, existing.id, candidate.categorySlug, options.dryRun)) {
        outcome.categorised += 1;
      }
    }

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
      const holdingId = await holdingCategoryId(sb, candidate.categorySlug);
      if (holdingId) {
        await sb.from("organization_category")
          .insert({ org_id: created.id, category_id: holdingId });
      }
    }

    if (created?.id) {
      await sb.from("organization_territory")
        .insert({ org_id: created.id, territory_slug: territory.slug });
    }
  }

  return outcome;
}
