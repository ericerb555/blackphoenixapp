/**
 * The Phoenix Exchange launch towns, and the remembered choice of one.
 *
 * WHY A CLOSED SET RATHER THAN FREE TEXT
 *
 * The town reaches `exchange_demand_event.territory_slug`, which is a foreign
 * key to `exchange_territory`. An invented slug violates it — and the ledger
 * writer swallows its own failures by design, so the demand row would vanish
 * without a sound. A closed set cannot produce a slug the database refuses.
 *
 * Hardcoded because no route serves the territory list yet. When one exists,
 * this becomes a fetch and the shape stays the same.
 *
 * WHY THIS LIVES HERE RATHER THAN IN A PAGE
 *
 * Both the directory and the category page need it. Importing it from one page
 * into the other would pull an entire lazy-loaded page component into the
 * other's chunk, which is a silly thing to ship for the sake of four strings.
 */
export const LAUNCH_TOWNS = [
  { slug: '', name: 'All towns' },
  { slug: 'pelham-nh', name: 'Pelham' },
  { slug: 'salem-nh', name: 'Salem' },
  { slug: 'manchester-nh', name: 'Manchester' },
] as const;

const TOWN_KEY = 'bpx_territory';

/**
 * The remembered town.
 *
 * Validated against the closed set on the way out, so a hand-edited
 * `localStorage` value cannot become a query parameter. It decides which town
 * we ask about and nothing else — it is a preference, never an authorisation.
 */
export function readTown(): string {
  try {
    const stored = localStorage.getItem(TOWN_KEY) || '';
    return LAUNCH_TOWNS.some((t) => t.slug === stored) ? stored : '';
  } catch {
    // A browser that refuses storage is not a failure; it just has no
    // preference yet.
    return '';
  }
}

export function writeTown(slug: string): void {
  try {
    localStorage.setItem(TOWN_KEY, LAUNCH_TOWNS.some((t) => t.slug === slug) ? slug : '');
  } catch {
    /* a refused store is not worth telling anybody about */
  }
}

export function townName(slug: string): string {
  return LAUNCH_TOWNS.find((t) => t.slug === slug)?.name ?? 'All towns';
}
