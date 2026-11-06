/**
 * Phoenix Exchange — finding the towns, so the directory can grow.
 *
 * Eric: "i want it to grow over time so the app can cover larger areas and i
 * sell more territories."
 *
 * WHY COVERAGE HAD BEEN FLAT, WHICH IS NOT WHAT ANYONE ASSUMED
 *
 * The weekly clock was working perfectly. It compiles one LISTED town per
 * tick, and the seed migration listed three — Pelham, Salem, Manchester —
 * with Windham and Hudson added by hand later. Five towns, in a state with
 * 234 municipalities. The clock had nothing left to reach, so it refreshed
 * the same five forever and the directory looked stuck.
 *
 * Nothing in the system has ever CREATED a territory. The only route that
 * does is `POST /exchange/admin/territories`, typed in a field at a time
 * with a name, a slug, a centre and at least one postcode. That is the
 * bottleneck this file removes.
 *
 * WHAT IT DOES AND DELIBERATELY DOES NOT DO
 *
 * It turns one Overpass answer into a list of CANDIDATES. It does not write
 * anything, it does not decide what is worth selling, and it does not invent
 * the fields it cannot find. A territory is inventory — something Eric sells
 * — so which towns exist stays a decision somebody makes, and this only
 * removes the typing.
 *
 * THE POSTCODE IS THE HARD PART, AND IT IS NOT GUESSED
 *
 * `POST /exchange/admin/territories` refuses a town with no postcode, for a
 * good reason written on that route: `belongsToTerritory` uses postcodes to
 * keep a neighbour's businesses out, and Pelham is close enough to the line
 * that the neighbour is a different state. US municipality boundaries in OSM
 * carry `postal_code` only sometimes.
 *
 * So a candidate with no postcode comes back MARKED INCOMPLETE rather than
 * filled in with a plausible nearby one. Somebody types the postcode, or the
 * town is not added. Inventing it would quietly mis-bound an ingest, and a
 * mis-bounded ingest puts another town's businesses in a territory Eric
 * sells as exclusive.
 *
 * NO IMPORTS. The same reason as `exchangeOsm`, `quoteMargins` and
 * `quotePdfSelection`: the rules that decide what lands in a live directory
 * have to be testable without a network, and the route file that fetches
 * cannot be loaded by the test runner.
 */

/** A town as Overpass describes it, before any of our rules are applied. */
export interface OverpassArea {
  type?: string;
  id?: number;
  tags?: Record<string, string>;
  center?: { lat?: number; lon?: number };
  lat?: number;
  lon?: number;
}

/** A town we could add, and whether it is ready to be. */
export interface TownCandidate {
  slug: string;
  name: string;
  state: string;
  lat: number;
  lng: number;
  postcodes: string[];
  /** OSM's own id, so a second run can be matched against the first. */
  osmId: string;
  /** False when a required field is missing — see `blockedBy`. */
  ready: boolean;
  /** Why it cannot be added yet, in words a person can act on. */
  blockedBy?: string;
  /** True when a territory with this slug already exists. */
  existing?: boolean;
}

/** The slug rule, copied from the create route so the two cannot disagree. */
export const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * A town's slug: its name, lower case, hyphenated, with the state on the end.
 *
 * The state suffix is not decoration. There is a Windham in New Hampshire, a
 * Windham in Maine and a Windham in Vermont, and this project already holds
 * `pelham-nh` and `salem-nh` in that shape. Dropping the state would collide
 * the first time coverage crosses a border, and a slug collision here means
 * two towns sharing one territory's listings.
 */
export function townSlug(name: string, state: string): string {
  const base = String(name || '')
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  const st = String(state || '').toLowerCase().replace(/[^a-z]/g, '');
  if (!base) return '';
  return st ? `${base}-${st}` : base;
}

/**
 * The postcodes on a boundary, as OSM writes them.
 *
 * `postal_code` is sometimes one code and sometimes a semicolon or comma
 * separated list. Anything that is not a five-digit US ZIP is dropped rather
 * than passed along — a malformed code in this field reaches
 * `belongsToTerritory`, and a territory bounded by a code that matches
 * nothing silently collects no businesses at all.
 */
export function postcodesFrom(tags: Record<string, string> | undefined): string[] {
  const raw = String(tags?.postal_code ?? tags?.['postal_code:prefix'] ?? '').trim();
  if (!raw) return [];
  const out: string[] = [];
  for (const part of raw.split(/[;,]/)) {
    const code = part.trim();
    if (/^\d{5}$/.test(code) && !out.includes(code)) out.push(code);
  }
  return out;
}

/** The centre of a boundary, however Overpass chose to express it. */
export function centreOf(area: OverpassArea): { lat: number; lng: number } | null {
  const lat = Number(area?.center?.lat ?? area?.lat);
  const lng = Number(area?.center?.lon ?? area?.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  // 0,0 is the Atlantic. Overpass returns it for a relation whose geometry
  // failed to resolve, and it would pass every other check.
  if (lat === 0 && lng === 0) return null;
  return { lat, lng };
}

/**
 * One Overpass boundary, as a candidate — or null if it is not a town at all.
 *
 * Returns a candidate even when it cannot be added, with `ready: false` and
 * the reason. A town silently dropped for want of a postcode is a town
 * nobody knows to go and fix.
 */
export function areaToCandidate(area: OverpassArea, state: string): TownCandidate | null {
  const tags = area?.tags || {};
  const name = String(tags.name || '').trim();
  if (!name) return null;

  const slug = townSlug(name, state);
  if (!SLUG_RE.test(slug)) return null;

  const centre = centreOf(area);
  const postcodes = postcodesFrom(tags);
  const osmId = `${area?.type || 'relation'}/${area?.id ?? ''}`;

  if (!centre) {
    return {
      slug, name, state: state.toUpperCase(), lat: 0, lng: 0, postcodes, osmId,
      ready: false,
      blockedBy: 'OpenStreetMap gave no usable centre for this boundary, so there is nowhere to search from.',
    };
  }
  if (!postcodes.length) {
    return {
      slug, name, state: state.toUpperCase(), lat: centre.lat, lng: centre.lng, postcodes, osmId,
      ready: false,
      blockedBy: 'No postcode on the boundary. Add one before this town can be compiled — without it the '
        + 'ingest cannot tell this town from its neighbours.',
    };
  }
  return {
    slug, name, state: state.toUpperCase(),
    lat: centre.lat, lng: centre.lng, postcodes, osmId,
    ready: true,
  };
}

/**
 * Every candidate in an Overpass answer, deduplicated, in name order.
 *
 * Deduplicated on SLUG rather than on OSM id, because a town can appear as
 * both a boundary relation and a place node and they are the same town.
 * First one wins, and a later duplicate carrying a postcode is preferred to
 * an earlier one without — the point is to add the town, not to be first.
 */
export function candidatesFrom(
  elements: Array<OverpassArea | null | undefined>,
  state: string,
  existingSlugs: Iterable<string> = [],
): TownCandidate[] {
  const have = new Set(Array.from(existingSlugs, (s) => String(s).toLowerCase()));
  const bySlug = new Map<string, TownCandidate>();

  for (const element of Array.isArray(elements) ? elements : []) {
    if (!element) continue;
    const candidate = areaToCandidate(element, state);
    if (!candidate) continue;

    const seen = bySlug.get(candidate.slug);
    if (seen && !(seen.blockedBy && candidate.ready)) continue;
    bySlug.set(candidate.slug, { ...candidate, existing: have.has(candidate.slug) });
  }

  return Array.from(bySlug.values()).sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * The Overpass query for every municipality in a state, or one county of it.
 *
 * `admin_level=8` is the US municipality — town, city, village. 6 is the
 * county and 4 the state, so asking for 8 inside a 6 inside a 4 is how one
 * county's towns are named without listing them.
 *
 * `out tags center` rather than full geometry: the centre and the tags are
 * everything a candidate needs, and asking a free endpoint for the polygon
 * of 234 municipalities to then throw it away is how a project gets blocked.
 */
export function municipalityQuery(state: string, county?: string, timeoutSeconds = 90): string {
  const st = String(state || '').toUpperCase().replace(/[^A-Z]/g, '');
  const lines = [
    `[out:json][timeout:${Math.max(10, Math.min(180, Math.floor(timeoutSeconds)))}];`,
    `area["ISO3166-2"="US-${st}"][admin_level=4]->.state;`,
  ];
  /*
   * A WHITELIST, not a blacklist.
   *
   * Stripping quotes is enough to stop the value escaping its own string,
   * but it leaves whatever else was typed sitting inside the query where a
   * reader cannot tell injected text from a county name. A county name is
   * letters, spaces, hyphens, apostrophes and full stops. Anything else is
   * not part of one and does not travel.
   */
  const countyName = String(county || '')
    .replace(/[^A-Za-z .'-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (countyName) {
    const safe = countyName;
    lines.push(`relation["boundary"="administrative"]["admin_level"="6"]["name"="${safe}"](area.state)->.c;`);
    lines.push(`.c map_to_area -> .countyArea;`);
    lines.push(`relation["boundary"="administrative"]["admin_level"="8"](area.countyArea);`);
  } else {
    lines.push(`relation["boundary"="administrative"]["admin_level"="8"](area.state);`);
  }
  lines.push('out tags center;');
  return lines.join('\n');
}

/** A short account of a discovery run, for the screen and the log. */
export function describeCandidates(found: TownCandidate[]): string {
  const all = Array.isArray(found) ? found : [];
  if (!all.length) return 'No municipalities came back.';
  const ready = all.filter((t) => t.ready && !t.existing).length;
  const already = all.filter((t) => t.existing).length;
  const blocked = all.filter((t) => !t.ready).length;
  const parts = [`${all.length} municipalit${all.length === 1 ? 'y' : 'ies'} found`];
  if (ready) parts.push(`${ready} ready to add`);
  if (already) parts.push(`${already} already here`);
  if (blocked) parts.push(`${blocked} needing a postcode or a centre`);
  return `${parts.join(', ')}.`;
}
