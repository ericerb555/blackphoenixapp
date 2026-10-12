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
  /**
   * `craft=carpenter` is DELIBERATELY unmapped, and was effectively unmapped
   * already without saying so.
   *
   * It read "carpenter", and no alias of that name exists — so it resolved to
   * nothing while looking handled. The taxonomy has no carpentry category:
   * General Contracting is a different trade, and Handyman is the mistake that
   * put Lowe's under odd jobs. Unmapped and labelled is better than mapped to
   * the nearest thing.
   */
  carpenter: "",
  hvac: "furnace not working",
  gardener: "lawn guy",
  painter: "painter",
  // "tile" matched no alias either; "new floors" is the phrase the Flooring
  // category actually answers to, and a tiler laying floors is a fair reading
  // of it. Checked against the alias table rather than assumed this time.
  tiler: "new floors",
  plasterer: "painter",
  caterer: "catering",
  // shop=*
  car_repair: "mechanic",
  car_parts: "mechanic",
  hairdresser: "haircut",
  /**
   * `shop=beauty` is DELIBERATELY unmapped.
   *
   * It read as "manicure" and therefore filed everything under Nail Salons.
   * The first real Salem run showed what that catches: Medusa Body Piercing,
   * Buff City Soap and Bella Viaggio Salon & Spa — three for three, none of
   * them a nail salon. OSM uses `beauty` for piercing studios, waxing, soap
   * shops and spas as readily as for nails.
   *
   * So it resolves to nothing and the listing is left unassigned, which is
   * visible and fixable. A wrong category produces no leads, no complaint and
   * a cancellation six months later — the fault the ingest rules exist to
   * avoid.
   */
  beauty: "",
  /**
   * Mapped again, correctly this time.
   *
   * These read "handyman" and so filed The Home Depot, Harbor Freight Tools
   * and the local hardware shop under a SERVICE category — somebody looking
   * for a person to hang a door found a warehouse store. On 2026-10-06 they
   * were unmapped rather than corrected, because the taxonomy carried no
   * hardware or building-supply category and every available destination was
   * wrong. The note left behind said "these list unassigned until it does".
   *
   * It does: `hardware-building` in the `shops-retail` section, added
   * 2026-10-12. A retailer now lands in a retail category, which is what was
   * missing rather than what was mistaken.
   */
  doityourself: "home improvement",
  hardware: "hardware store",
  /**
   * A florist is not a landscaper.
   *
   * This read "planting & beds", which is landscaping work. It was wrong twice
   * over: wrong in meaning, and wrong in fact — no alias "planting & beds"
   * exists, so it resolved to nothing and the error was invisible. Jaques
   * Flower Shop, Rimmon Heights Florist, Celeste's Flower Barn and five more
   * sat uncategorised while the map claimed to handle them.
   */
  florist: "florist",
  funeral_directors: "",
  /**
   * shop=* — RETAIL
   *
   * None of these could be mapped before 2026-10-12, because the taxonomy had
   * Home & Property, Services, Food and Entertainment and no section for a
   * shop. That is why 595 of 1,090 compiled listings held no category: they
   * were shops, and there was nowhere to put a shop. The `shops-retail`
   * section exists now and these are its doors.
   *
   * Every value below was checked against the alias table. A mapping to a
   * phrase that does not exist resolves to nothing while looking handled,
   * which is how `carpenter`, `tile`, `insurance` and `planting & beds` sat
   * broken and silent above.
   *
   * Anything genuinely ambiguous is still left out. `shop=beauty` remains
   * unmapped, for instance: OSM uses it for nail bars, waxing, spas and soap
   * shops alike, and `beauty-supply` is a shop that sells cosmetics — not the
   * same thing. A wrong category produces no leads and no complaint, just a
   * cancellation six months later.
   */
  chemist: "pharmacy",
  convenience: "convenience store",
  kiosk: "corner store",
  /**
   * Mapped but not yet reachable, and said so rather than left to look live.
   *
   * Petrol stations are `amenity=fuel`, and `overpassClassQueries` asks for
   * only a named list of amenities — restaurant, cafe, bar, pub, fast_food,
   * pharmacy, veterinary. So this takes effect only if that list widens.
   * Those that appear today do so as `shop=convenience`, which is handled
   * above.
   */
  fuel: "gas station",
  variety_store: "discount store",
  department_store: "department store",
  wholesale: "wholesale club",
  clothes: "clothing",
  shoes: "shoes",
  boutique: "boutique",
  bag: "apparel",
  fashion_accessories: "apparel",
  mobile_phone: "mobile phone store",
  electronics: "electronics",
  computer: "computer store",
  hifi: "electronics",
  video_games: "video games",
  building_materials: "building supply",
  trade: "building supply",
  paint: "paint store",
  tool_hire: "tool store",
  furniture: "furniture",
  bed: "mattresses",
  interior_decoration: "interior decoration",
  houseware: "home furnishings",
  kitchen: "home furnishings",
  pet: "pet supplies",
  pet_supply: "pet supplies",
  jewelry: "jewelry",
  watches: "watches",
  cosmetics: "cosmetics",
  perfumery: "perfume",
  herbalist: "vitamins",
  health_food: "health food store",
  sports: "sporting goods",
  outdoor: "outdoor gear",
  bicycle: "bicycle shop",
  ski: "ski shop",
  fishing: "hunting and fishing",
  hunting: "hunting and fishing",
  books: "book store",
  music: "music store",
  musical_instrument: "musical instruments",
  art: "art supplies",
  craft: "craft supplies",
  hobby: "hobby shop",
  toys: "toy store",
  games: "games shop",
  charity: "charity shop",
  second_hand: "second hand",
  gift: "gift shop",
  optician: "optician",
  alcohol: "liquor store",
  wine: "wine shop",
  beverages: "beer store",
  tobacco: "tobacco",
  "e-cigarette": "vape shop",
  garden_centre: "garden center",
  agrarian: "farm supply",
  stationery: "office supplies",

  /**
   * shop=* — reaching categories that already existed and were unreachable.
   *
   * These were not missing a category, only a way in. Each of the five had
   * members sitting uncategorised while its category sat empty.
   */
  supermarket: "grocers",
  greengrocer: "grocers",
  bakery: "birthday cake",
  butcher: "butcher",
  deli: "deli counter",
  laundry: "dry cleaning",
  dry_cleaning: "dry cleaning",
  copyshop: "copy shop",
  storage_rental: "self storage",

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
  /**
   * Mappable at last. This was deliberately empty because the taxonomy had no
   * pharmacy category — fourteen of them, four CVS, four Walgreens and four
   * Rite Aid among them, sat uncategorised for want of somewhere to go. The
   * `shops-retail` section added one on 2026-10-12.
   */
  pharmacy: "pharmacy",
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
 * The four kinds of feature a listing can be compiled from.
 *
 * Kept as named clauses rather than inlined into one query string, because
 * each one is asked for separately — see `overpassClassQueries` below for why
 * that matters. `["name"]` on every clause because an unnamed feature cannot
 * become a listing, and filtering server-side is politer to a shared free
 * endpoint than downloading them and throwing them away.
 */
const OVERPASS_CLAUSES: Record<string, (at: string) => string> = {
  shop: (at) => `nwr(around:${at})["shop"]["name"];`,
  craft: (at) => `nwr(around:${at})["craft"]["name"];`,
  office: (at) =>
    `nwr(around:${at})["office"~"^(lawyer|accountant|estate_agent|insurance|it|company|financial|financial_advisor|employment_agency|architect|surveyor|engineer|tax_advisor|advertising_agency|graphic_design|moving_company|property_management|construction_company)$"]["name"];`,
  amenity: (at) =>
    `nwr(around:${at})["amenity"~"^(restaurant|cafe|bar|pub|fast_food|pharmacy|veterinary)$"]["name"];`,
};

/** The feature classes, in the order they are asked for. */
export const OVERPASS_CLASSES = Object.keys(OVERPASS_CLAUSES);

function around(lat: number, lng: number, radiusMetres: number): string {
  const r = Math.max(Math.min(Math.round(radiusMetres), 25_000), 500);
  return `${r},${lat.toFixed(6)},${lng.toFixed(6)}`;
}

const capped = (limit: number) => Math.max(Math.min(Math.round(limit), 2000), 1);

/**
 * The Overpass query for one town.
 *
 * A radius around a point rather than a named area: `area["name"="Pelham"]`
 * matched nothing in testing, because the administrative tagging it relies on
 * is inconsistent — and every town already has a centre stored on
 * `exchange_territory`, which is ours and known good.
 *
 * ONE QUERY FOR ALL FOUR CLASSES, WHICH IS WHY IT IS NO LONGER USED TO INGEST
 * A TOWN. `out ... 800` caps the COMBINED set, so the four classes compete for
 * one allowance and the overflow is dropped with no error and no marker. Use
 * `overpassClassQueries` instead; this is kept because a single query is the
 * right thing for a spot check and because it is what the cap tests describe.
 */
export function overpassQuery(lat: number, lng: number, radiusMetres: number, limit = 800): string {
  const at = around(lat, lng, radiusMetres);
  const clauses = OVERPASS_CLASSES.map((k) => `  ${OVERPASS_CLAUSES[k](at)}`).join("\n");

  return `[out:json][timeout:90];
(
${clauses}
);
out center tags ${capped(limit)};`;
}

/**
 * One query per feature class, so no class can be starved by another.
 *
 * WHY THIS EXISTS, WITH THE RECEIPT
 *
 * Manchester was ingested with the single combined query above and produced a
 * plausible-looking 570 listings. It was short. Asked class by class with
 * `out count`, six kilometres around the city centre holds:
 *
 *     shop      785
 *     craft      29
 *     office     94
 *     amenity   323
 *     ------------
 *     total    1231
 *
 * The combined query's `out center tags 800` returned the first 800 of those
 * 1231 and said nothing at all about the other 431. Overpass does not warn
 * when `out` truncates — there is no flag in the response, the HTTP status is
 * 200, and the JSON is well formed. Pelham (121 features) and Salem (438) were
 * both under the cap, so two correct runs came first and the cap looked like a
 * generous ceiling rather than a live constraint.
 *
 * That is this project's most expensive failure shape, again: a system
 * reporting success while quietly doing part of the job. A town's directory
 * being a third short is not visible by looking at it — the listings that are
 * there are all real.
 *
 * Four queries, each with its own allowance, means the largest class in
 * Manchester uses 785 of its 2000. The caller is still responsible for
 * noticing a class that comes back AT its limit, because that is the only
 * signal truncation gives: see `truncatedClasses`.
 */
export function overpassClassQueries(
  lat: number,
  lng: number,
  radiusMetres: number,
  limit = 2000,
): { className: string; query: string }[] {
  const at = around(lat, lng, radiusMetres);
  const n = capped(limit);

  return OVERPASS_CLASSES.map((className) => ({
    className,
    query: `[out:json][timeout:90];
(
  ${OVERPASS_CLAUSES[className](at)}
);
out center tags ${n};`,
  }));
}

/**
 * Which classes came back at their limit, and so may have been truncated.
 *
 * Exactly-at-the-limit is not proof of truncation — a class with precisely
 * 2000 features would look identical — but it is the only signal available,
 * and treating it as suspect is the right direction to be wrong in. A caller
 * that ignores this is back to compiling a town that is quietly short.
 */
export function truncatedClasses(
  counts: Record<string, number>,
  limit = 2000,
): string[] {
  const n = capped(limit);
  return Object.keys(counts).filter((k) => counts[k] >= n);
}

/**
 * The same feature arriving twice, reduced to once.
 *
 * Asking class by class makes this necessary: a feature tagged both `shop` and
 * `craft` — a bakery that bakes on site, say — answers to two of the four
 * queries. Identity is OSM's own type and id, which is stable and is the only
 * thing here that cannot be two different places by coincidence.
 */
export function dedupeOsmElements(elements: OverpassElement[]): OverpassElement[] {
  const seen = new Set<string>();
  const out: OverpassElement[] = [];

  for (const element of elements ?? []) {
    const key = `${element?.type ?? "?"}/${element?.id ?? "?"}`;
    if (key === "?/?" || seen.has(key)) continue;
    seen.add(key);
    out.push(element);
  }
  return out;
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
