/**
 * Phoenix Exchange — OpenStreetMap as a source of listings.
 *
 * Pure functions, no network. The runner fetches; this file decides what an
 * Overpass element means, and nothing here needs a database or an endpoint to
 * be tested.
 *
 * WHY OPENSTREETMAP AND NOT THE STATE REGISTRY
 *
 * The plan named the New Hampshire Secretary of State first. Checked on
 * 2026-10-03: there is no bulk download and no public API — individual lookups
 * through the QuickStart portal only, with bulk data by written request. A job
 * cannot fetch it. The alternatives are scraping a state portal or paying an
 * aggregator, and neither is a line of code.
 *
 * OpenStreetMap was already in the plan, is openly licensed, needs no key, and
 * carries exactly the fields a compiled listing is allowed to hold: a name, a
 * trade, an address, a phone and a website. Verified against the live Overpass
 * API rather than assumed.
 *
 * ATTRIBUTION IS NOT OPTIONAL. OSM data is ODbL. Any page built from it has to
 * credit "© OpenStreetMap contributors". That is a licence term, not a
 * courtesy, and it belongs on the directory and category pages.
 *
 * WHAT THIS DELIBERATELY DOES NOT DO
 *
 * It does not invent. A postcode OSM does not hold is not filled in from the
 * town we happened to search, because `toListing` uses the postcode to decide
 * whether a business can be placed at all, and a guessed one would quietly
 * turn a rejected record into a listed one. The town and state ARE passed
 * through, because those are facts about the search rather than claims about
 * the business — we asked for businesses within six kilometres of Salem, New
 * Hampshire, and that is what came back.
 */

/** One element as Overpass returns it. Only the parts we read. */
export interface OverpassElement {
  type?: string;
  id?: number;
  lat?: number;
  lon?: number;
  center?: { lat?: number; lon?: number };
  tags?: Record<string, string>;
}

/** Where we searched, so a record can say which town it came from. */
export interface SearchedTown {
  name: string;
  state: string;
  territorySlug?: string;
}

/**
 * OSM tags that mean something in our taxonomy.
 *
 * Only tags whose meaning is unambiguous. The alias table already resolves a
 * great many of these on its own — "roofer", "plumber", "electrician" and
 * "mechanic" are all seeded aliases — so this map exists for the ones where
 * OSM's vocabulary and a resident's vocabulary differ, and for nothing else.
 *
 * An unmapped tag resolves to nothing, and `toListing` then leaves the
 * category unassigned. That is deliberate and matches the ingest rule: an
 * unclassified listing is visible and fixable, while a roofer filed under
 * plumbing produces no leads, no complaint, and a cancellation six months
 * later.
 */
export const OSM_TRADE_WORDS: Record<string, string> = {
  // craft=*
  roofer: "roofer",
  plumber: "plumber",
  electrician: "electrician",
  carpenter: "carpenter",
  hvac: "furnace not working",
  gardener: "lawn guy",
  painter: "painter",
  tiler: "tile",
  plasterer: "painter",
  caterer: "catering",
  // shop=*
  car_repair: "mechanic",
  car_parts: "mechanic",
  hairdresser: "haircut",
  beauty: "manicure",
  doityourself: "handyman",
  hardware: "handyman",
  florist: "planting & beds",
  funeral_directors: "",
  // office=*
  lawyer: "divorce lawyer",
  accountant: "tax preparer",
  estate_agent: "realtor",
  insurance: "insurance",
  it: "computer repair",
  // amenity=*
  restaurant: "somewhere to eat",
  fast_food: "somewhere to eat",
  cafe: "coffee",
  bar: "a drink",
  pub: "a drink",
  pharmacy: "",
  veterinary: "vet",
};

/**
 * The words we hand to the category resolver for an element.
 *
 * Returns the mapped phrase where we have one, otherwise the raw OSM value
 * with its underscores opened out — `car_repair` becomes `car repair`, which
 * the alias matcher can still do something sensible with. Empty string means
 * "mapped on purpose to nothing", so a pharmacy is not forced into a category
 * we do not carry.
 */
export function tradeWordsFor(tags: Record<string, string> | undefined): string | null {
  if (!tags) return null;
  const raw = tags.craft || tags.shop || tags.office || tags.amenity || "";
  if (!raw) return null;

  if (Object.prototype.hasOwnProperty.call(OSM_TRADE_WORDS, raw)) {
    const mapped = OSM_TRADE_WORDS[raw];
    return mapped === "" ? null : mapped;
  }
  return raw.replace(/_/g, " ");
}

/** The first tag that actually holds a value, across OSM's two conventions. */
function tag(tags: Record<string, string>, ...keys: string[]): string | null {
  for (const key of keys) {
    const value = String(tags[key] ?? "").trim();
    if (value) return value;
  }
  return null;
}

/**
 * The street address as one line, from OSM's separate parts.
 *
 * House number and street only. OSM's `addr:city` is used for the city where
 * it exists, but the searched town is the fallback — see the header for why
 * that is a fact about the search rather than an invention.
 */
function streetAddress(tags: Record<string, string>): string | null {
  const number = tag(tags, "addr:housenumber");
  const street = tag(tags, "addr:street");
  if (!street) return null;
  return number ? `${number} ${street}` : street;
}

/**
 * An Overpass element as a registry record, or null when it is not a business
 * we could list.
 *
 * Null for anything with no name: an unnamed shop is a map feature, not a
 * business. Everything past that is left to `toListing`, which already knows
 * what a listing may contain and refuses the ones nobody could contact.
 */
export function osmToRegistryRecord(
  element: OverpassElement | null | undefined,
  town: SearchedTown,
): Record<string, unknown> | null {
  const tags = element?.tags;
  if (!tags) return null;

  const name = String(tags.name ?? "").trim();
  if (!name) return null;

  return {
    name,
    businessType: tradeWordsFor(tags),
    address: streetAddress(tags),
    city: tag(tags, "addr:city") ?? town.name,
    state: tag(tags, "addr:state") ?? town.state,
    /**
     * What OSM ITSELF said the state was, kept separate from the line above.
     *
     * `state` falls back to the town we searched, which is what makes a
     * record from across the state line look like ours. `belongsToTerritory`
     * needs to know the difference, and `toListing` ignores fields it does
     * not recognise, so carrying it costs nothing.
     */
    osmState: tag(tags, "addr:state"),
    // Never defaulted. See the header: a guessed postcode would turn a record
    // `toListing` means to reject into one it accepts.
    postcode: tag(tags, "addr:postcode"),
    phone: tag(tags, "phone", "contact:phone"),
    website: tag(tags, "website", "contact:website", "url"),
    source: "openstreetmap",
  };
}

/** Where an element sits, for the service centre of a compiled listing. */
export function osmCoordinates(
  element: OverpassElement | null | undefined,
): { lat: number; lng: number } | null {
  const lat = Number(element?.lat ?? element?.center?.lat);
  const lng = Number(element?.lon ?? element?.center?.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return { lat, lng };
}

/**
 * The Overpass query for one town.
 *
 * A radius around a point rather than a named area: `area["name"="Pelham"]`
 * matched nothing in testing, because the administrative tagging it relies on
 * is inconsistent — and every town already has a centre stored on
 * `exchange_territory`, which is ours and known good.
 *
 * `["name"]` on every clause because an unnamed feature cannot become a
 * listing, and filtering server-side is politer to a shared free endpoint than
 * downloading them and throwing them away.
 */
export function overpassQuery(lat: number, lng: number, radiusMetres: number, limit = 800): string {
  const r = Math.max(Math.min(Math.round(radiusMetres), 25_000), 500);
  const n = Math.max(Math.min(Math.round(limit), 2000), 1);
  const at = `${r},${lat.toFixed(6)},${lng.toFixed(6)}`;

  return `[out:json][timeout:90];
(
  nwr(around:${at})["shop"]["name"];
  nwr(around:${at})["craft"]["name"];
  nwr(around:${at})["office"~"^(lawyer|accountant|estate_agent|insurance|it|company|financial|financial_advisor|employment_agency|architect|surveyor|engineer|tax_advisor|advertising_agency|graphic_design|moving_company|property_management|construction_company)$"]["name"];
  nwr(around:${at})["amenity"~"^(restaurant|cafe|bar|pub|fast_food|pharmacy|veterinary)$"]["name"];
);
out center tags ${n};`;
}

/**
 * Does this record actually belong to the territory we searched?
 *
 * A RADIUS IS NOT A BOUNDARY, and that is not a theoretical problem here. Six
 * kilometres around Salem, New Hampshire crosses the state line, and the first
 * dry run returned *Haverhill Fire Department* in postcode 01830 —
 * Massachusetts — which `osmToRegistryRecord` had dutifully stamped `NH`,
 * because the state is taken from the search when OSM does not say.
 *
 * That combination is the dangerous one: a record from another state,
 * labelled as ours. So the territory check lives here, after the record is
 * built and where the territory's own postcodes are known.
 *
 *   a postcode OSM gave us, not in the territory  → rejected
 *   a state OSM gave us, not the searched state   → rejected
 *   no postcode and no state of its own           → kept
 *
 * The last line is a deliberate, stated compromise. Such a record was found
 * within a few kilometres of the town centre and has to carry a phone number
 * to be listable at all, so it is placed by proximity rather than by claim.
 * The residual risk is a nearby out-of-state business listed as in-town, which
 * a human correction fixes and which no automatic rule can settle without
 * inventing a boundary we do not have.
 */
export function belongsToTerritory(
  record: Record<string, unknown> | null | undefined,
  territory: { postcodes?: readonly string[]; state?: string },
): boolean {
  if (!record) return false;

  // `postcode` is already never defaulted, so it is OSM's own or nothing.
  const ownPostcode = String(record.postcode ?? "").trim();
  const allowed = (territory.postcodes ?? []).map((p) => String(p).trim()).filter(Boolean);

  if (ownPostcode && allowed.length > 0) {
    // Compare on the five-digit prefix: OSM carries ZIP+4 in places.
    const five = ownPostcode.slice(0, 5);
    if (!allowed.some((p) => p.slice(0, 5) === five)) return false;
  }

  const ownState = String(record.osmState ?? "").trim().toUpperCase();
  const want = String(territory.state ?? "").trim().toUpperCase();
  if (ownState && want && ownState !== want) return false;

  return true;
}

/** What the licence requires every page built from this data to say. */
export const OSM_ATTRIBUTION = "© OpenStreetMap contributors";
