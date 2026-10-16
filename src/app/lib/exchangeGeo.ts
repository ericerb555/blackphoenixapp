/**
 * Distance, and what a resident is searching for.
 *
 * Two small jobs that decide how the Exchange feels to use, and both of them
 * are arithmetic rather than interface, so they live here where they can be
 * tested to the decimal.
 *
 * WHY DISTANCE IS COMPUTED IN THE BROWSER
 *
 * Every listing already arrives with its coordinates — the public category
 * route returns `location: { lat, lng }` from `service_lat`/`service_lng`, and
 * all 1,090 compiled listings carry them. So the only missing number is where
 * the person is, and that is the one piece of data worth protecting.
 *
 * Doing the sums here means **the resident's own position never leaves their
 * device**. No request carries it, no server logs it, nothing stores it. A
 * server-side radius query would have been easier to write and would have
 * required sending that coordinate to be useful, which is the wrong trade for
 * a directory whose whole positioning is that it does not farm the people who
 * use it. When a search genuinely has to cross town boundaries we will need a
 * server query, and that is the moment to decide what it may be told — not
 * now, for a number we can work out locally in a microsecond.
 *
 * NO LOCATION MEANS NO DISTANCE, SAID OUT LOUD
 *
 * Every function here returns `null` rather than a fallback when it has
 * nothing to measure from. A plausible-looking distance computed from a town
 * centre the resident never chose is worse than an honest blank, because they
 * would drive on it.
 */

/**
 * The earth's mean radius in miles (6,371.0088 km).
 *
 * Miles because the audience is in New Hampshire and reads road signs.
 */
const EARTH_RADIUS_MILES = 3958.7613;

const RADIANS = Math.PI / 180;

export interface Point {
  lat: number;
  lng: number;
}

/**
 * A coordinate, or nothing.
 *
 * Numbers arrive from JSON, from `localStorage` and from the geolocation API,
 * so "looks like a coordinate" is checked rather than assumed. A latitude of
 * 200 is not a place, and `NaN` propagates silently through arithmetic until
 * it reaches a screen — so both are refused here at the edge.
 */
export function asPoint(value: unknown): Point | null {
  if (!value || typeof value !== 'object') return null;
  const lat = Number((value as any).lat);
  const lng = Number((value as any).lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  // Exactly (0, 0) is in the Gulf of Guinea and is what an empty record looks
  // like once it has been through `Number()`. Nothing in New Hampshire is
  // there, so treating it as absent is right far more often than it is wrong.
  if (lat === 0 && lng === 0) return null;
  return { lat, lng };
}

/**
 * Great-circle distance in miles.
 *
 * Haversine rather than a flat approximation. The flat version is faster and
 * would be accurate enough across one town, but it degrades with latitude and
 * this directory will not stay in one town — and the saving is invisible at
 * eleven hundred points.
 */
export function haversineMiles(from: Point, to: Point): number {
  const dLat = (to.lat - from.lat) * RADIANS;
  const dLng = (to.lng - from.lng) * RADIANS;
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(from.lat * RADIANS) * Math.cos(to.lat * RADIANS) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_MILES * Math.asin(Math.min(1, Math.sqrt(a)));
}

/**
 * The distance as a person would say it.
 *
 * Feet when it is walkable, one decimal up to ten miles, whole numbers after
 * that — because "12.4 mi" implies a precision the pin does not have. A
 * compiled listing's coordinate is the centre of an OpenStreetMap feature,
 * which can be the middle of a car park.
 */
/**
 * How far away a town can be and still be called yours.
 *
 * The Exchange covers three towns in southern New Hampshire. Somebody in
 * Nashua is a few miles from Pelham and is genuinely well served by it;
 * somebody in Hartford is not, and showing them Pelham under a heading about
 * what is near them would be a lie told by a helpful feature.
 *
 * So beyond this the answer is "nowhere near you", and the switcher stays on
 * All towns rather than snapping to the least distant of three wrong answers.
 */
export const TOWN_NEAR_ENOUGH_MILES = 30;

/** Only what measuring a town needs, so this file keeps importing nothing. */
export interface PlaceableTown {
  slug: string;
  name?: string;
  center?: { lat: number; lng: number } | null;
}

/**
 * Which covered town somebody is in, worked out in the browser.
 *
 * THE COORDINATE DOES NOT LEAVE THIS BROWSER, AND THIS IS WHY IT CAN
 *
 * The towns arrive carrying their centres, so the whole question is answered
 * by arithmetic against a three-row list already in memory. No lookup, no
 * geocoding service, nothing sent anywhere. That is the only reason a
 * GPS-chosen town is compatible with the standing rule that a position never
 * reaches our server or anybody else's — a geocoder would answer this better
 * and would have to be told where somebody is to do it.
 *
 * A town with no centre is skipped rather than measured against nothing:
 * `FALLBACK_TOWNS` carries none, and treating a missing centre as 0,0 would
 * put every town off the coast of Africa and let the first one win always.
 */
export function nearestTown<T extends PlaceableTown>(
  point: Point | null | undefined,
  towns: readonly T[],
  withinMiles: number = TOWN_NEAR_ENOUGH_MILES,
): { town: T; miles: number } | null {
  const from = asPoint(point);
  if (!from) return null;

  let best: { town: T; miles: number } | null = null;
  for (const town of towns) {
    if (!town?.slug) continue;
    const at = asPoint(town.center);
    if (!at) continue;
    const miles = haversineMiles(from, at);
    if (!Number.isFinite(miles)) continue;
    if (!best || miles < best.miles) best = { town, miles };
  }

  if (!best || best.miles > withinMiles) return null;
  return best;
}

export function formatDistance(miles: number | null): string | null {
  if (miles == null || !Number.isFinite(miles) || miles < 0) return null;
  if (miles < 0.1) {
    const feet = Math.max(10, Math.round((miles * 5280) / 10) * 10);
    return `${feet} ft`;
  }
  // Rounded BEFORE the branch is chosen, or 9.96 would take the one-decimal
  // path and print "10.0 mi" — a trailing zero that appears at exactly one
  // value and reads like a different unit from the "10 mi" beside it.
  if (Number(miles.toFixed(1)) < 10) return `${miles.toFixed(1)} mi`;
  return `${Math.round(miles)} mi`;
}

/**
 * Collapse a phrase to its comparable form.
 *
 * The same shape as `exchange_normalise_phrase` in the database — lowercase,
 * single spaces, trimmed — with punctuation turned into spaces so that
 * "Ray's Auto" and "rays auto" are the same search, and so that a hyphenated
 * name does not become one unsearchable word.
 */
export function normalise(value: unknown): string {
  return String(value ?? '')
    .toLowerCase()
    // Apostrophes are DROPPED rather than turned into a space, so "Ray's"
    // becomes "rays" and a resident typing it finds the place. Lumping them in
    // with the rest of the punctuation gave "ray s auto body", which no
    // plausible search matches — and half the family businesses in New
    // Hampshire are named that way. Curly ones too: they are what a phone
    // keyboard and a copied website title actually produce.
    .replace(/['’ʼ]/g, '')
    // Everything else becomes a space, so a hyphenated or comma'd name breaks
    // into words instead of becoming one unsearchable string.
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Does this business answer what was typed?
 *
 * Every word has to appear somewhere in the haystack, so "auto salem" narrows
 * rather than widens. Prefix matching on each word, because somebody typing
 * "plumb" means plumbing and should not have to finish the word.
 *
 * An empty search matches NOTHING rather than everything. That reads backwards
 * until you see what it is for: the caller highlights matches, and before
 * anything is typed there is nothing to highlight. "Everything is a match"
 * would light the whole list up.
 */
export function matchesSearch(haystack: string, query: string): boolean {
  const words = normalise(query).split(' ').filter(Boolean);
  if (!words.length) return false;
  const hay = normalise(haystack);
  if (!hay) return false;
  return words.every((word) => {
    const at = hay.indexOf(word);
    if (at === -1) return false;
    // A word match has to start a word, so "art" does not match "quarter".
    return at === 0 || hay[at - 1] === ' ';
  });
}

/**
 * Everything about a listing that is worth searching.
 *
 * `skipCategory` is the category the resident is already inside, and leaving
 * it out matters more than it sounds. Every business on the "Clothing & Shoes"
 * page carries "Clothing & Shoes", so searching "shoe" there matched all
 * forty-five of them — a highlight that marks everything marks nothing, and
 * the feature looked like it was working while telling the resident no more
 * than the page already had. The business's *other* categories stay in,
 * because those genuinely distinguish one listing from the next.
 */
export function searchableText(
  listing: { name?: unknown; categories?: { name?: unknown }[] | null },
  skipCategory?: string,
): string {
  const skip = skipCategory ? normalise(skipCategory) : '';
  const categories = Array.isArray(listing.categories)
    ? listing.categories
      .map((c) => String(c?.name ?? ''))
      .filter((name) => !skip || normalise(name) !== skip)
      .join(' ')
    : '';
  return `${String(listing.name ?? '')} ${categories}`;
}

export interface Measured<T> {
  listing: T;
  /** Miles from the resident, or null when we do not know where they are. */
  miles: number | null;
  /** Whether this one answers what was typed. False when nothing was typed. */
  highlighted: boolean;
}

/**
 * Measure and mark a list of listings in one pass.
 *
 * Returned in a stable order — nearest first when there is somewhere to
 * measure from, otherwise exactly as the server sent them.
 *
 * A listing with no coordinate sorts LAST rather than first. Sorting `null` as
 * zero would put every listing we cannot place at the top of a "nearest"
 * list, which is the precise opposite of what the sort claims to do.
 */
export function measureListings<T extends {
  name?: unknown;
  location?: unknown;
  categories?: { name?: unknown }[] | null;
}>(
  listings: T[],
  from: Point | null,
  query: string,
  /** The category being browsed, left out of the haystack. See above. */
  skipCategory?: string,
): Measured<T>[] {
  const measured = listings.map((listing) => {
    const at = asPoint(listing.location);
    return {
      listing,
      miles: from && at ? haversineMiles(from, at) : null,
      highlighted: matchesSearch(searchableText(listing, skipCategory), query),
    };
  });

  if (!from) return measured;

  return measured.sort((a, b) => {
    if (a.miles == null && b.miles == null) return 0;
    if (a.miles == null) return 1;
    if (b.miles == null) return -1;
    return a.miles - b.miles;
  });
}

/**
 * The box that contains every placeable listing, for framing a map.
 *
 * Deliberately derived from the listings rather than from a town's stored
 * centre: it frames the actual results, so a category with three businesses
 * in one corner of Manchester opens on those three instead of on the whole
 * city with the pins in a huddle.
 */
export function boundsOf(locations: unknown[]): { sw: Point; ne: Point } | null {
  const points = locations.map(asPoint).filter((p): p is Point => p !== null);
  if (!points.length) return null;
  return {
    sw: {
      lat: Math.min(...points.map((p) => p.lat)),
      lng: Math.min(...points.map((p) => p.lng)),
    },
    ne: {
      lat: Math.max(...points.map((p) => p.lat)),
      lng: Math.max(...points.map((p) => p.lng)),
    },
  };
}
