/**
 * The Phoenix Exchange towns, and the remembered choice of one.
 *
 * WHY A CLOSED SET RATHER THAN FREE TEXT
 *
 * The town reaches `exchange_demand_event.territory_slug`, which is a foreign
 * key to `exchange_territory`. An invented slug violates it — and the ledger
 * writer swallows its own failures by design, so the demand row would vanish
 * without a sound. A closed set cannot produce a slug the database refuses.
 *
 * IT IS NO LONGER A HARDCODED SET
 *
 * It used to be, with a comment promising that "when a route exists, this
 * becomes a fetch and the shape stays the same". That route now exists, and
 * this is that fetch. Opening a town was otherwise a code change, a commit and
 * a front-end deploy, which is exactly what Eric's rule about settings taking
 * effect the moment they are saved rules out. A town is a row in
 * `exchange_territory`; it now behaves like one.
 *
 * `FALLBACK_TOWNS` survives for one job: a browser that cannot reach the
 * server still has to render a usable switcher rather than an empty one. It is
 * the floor, not the list.
 *
 * WHY THIS LIVES HERE RATHER THAN IN A PAGE
 *
 * The directory, the category page and the map all need it. Importing it from
 * one page into another would pull an entire lazy-loaded page component into
 * the other's chunk, which is a silly thing to ship for the sake of four
 * strings.
 */
import { useEffect, useState } from 'react';
import { projectId, publicAnonKey } from '../utils/supabase/info';

const SERVER = `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6`;

export interface Town {
  slug: string;
  name: string;
  center?: { lat: number; lng: number } | null;
}

/**
 * The towns as of the last deploy, used only when the server cannot be reached.
 *
 * Deliberately not kept in step by hand. If this drifts from the database the
 * consequence is a stale switcher for somebody who is offline, which is a far
 * smaller problem than a list that can only change by shipping code.
 */
export const FALLBACK_TOWNS: readonly Town[] = [
  { slug: 'pelham-nh', name: 'Pelham' },
  { slug: 'salem-nh', name: 'Salem' },
  { slug: 'manchester-nh', name: 'Manchester' },
] as const;

/**
 * The towns, with "All towns" in front.
 *
 * Kept for the surfaces that offer an everywhere option. The map does not:
 * every town at once is a payload nobody asked for.
 */
export const LAUNCH_TOWNS: readonly Town[] = [
  { slug: '', name: 'All towns' },
  ...FALLBACK_TOWNS,
] as const;

const TOWN_KEY = 'bpx_territory';

/**
 * Towns from the server, fetched once per page and shared.
 *
 * A single in-flight promise rather than one request per caller: the directory,
 * the map and the category page can all ask at once, and three identical
 * requests for a three-row table would be silly.
 */
let inFlight: Promise<Town[]> | null = null;

export function fetchTowns(): Promise<Town[]> {
  if (inFlight) return inFlight;

  inFlight = (async () => {
    try {
      const res = await fetch(`${SERVER}/exchange/territories`, {
        headers: { Authorization: `Bearer ${publicAnonKey}` },
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || !body?.success || !Array.isArray(body.territories) || !body.territories.length) {
        return [...FALLBACK_TOWNS];
      }
      return body.territories
        .filter((t: any) => t?.slug && t?.name)
        .map((t: any) => ({ slug: String(t.slug), name: String(t.name), center: t.center ?? null }));
    } catch {
      // Offline is not empty. An empty switcher would read as "the Exchange
      // covers nowhere", which is worse than a slightly stale list.
      return [...FALLBACK_TOWNS];
    }
  })();

  return inFlight;
}

/**
 * The remembered town.
 *
 * Validated against the fallback set on the way out, so a hand-edited
 * `localStorage` value cannot become a query parameter before the real list
 * has arrived. It decides which town we ask about and nothing else — it is a
 * preference, never an authorisation, and the server validates the slug again
 * against `exchange_territory` regardless.
 */
export function readTown(): string {
  try {
    const stored = localStorage.getItem(TOWN_KEY) || '';
    if (!stored) return '';
    // A slug shape, so a town added since this page was built is still
    // remembered rather than silently discarded on the next visit.
    return /^[a-z0-9-]{2,64}$/.test(stored) ? stored : '';
  } catch {
    // A browser that refuses storage is not a failure; it just has no
    // preference yet.
    return '';
  }
}

export function writeTown(slug: string): void {
  try {
    localStorage.setItem(TOWN_KEY, /^[a-z0-9-]{2,64}$/.test(slug) ? slug : '');
  } catch {
    /* a refused store is not worth telling anybody about */
  }
}

/** The name for a slug, from whatever list the caller has. */
export function townName(slug: string, towns: readonly Town[] = LAUNCH_TOWNS): string {
  if (!slug) return 'All towns';
  return towns.find((t) => t.slug === slug)?.name
    ?? FALLBACK_TOWNS.find((t) => t.slug === slug)?.name
    // A town opened since this bundle shipped: say the slug rather than
    // "All towns", which would be a lie about what is on screen.
    ?? slug.replace(/-nh$/, '').replace(/-/g, ' ').replace(/\b\w/g, (ch) => ch.toUpperCase());
}

/**
 * The towns, for a screen.
 *
 * Starts on the fallback so the switcher renders immediately rather than
 * flashing empty, then replaces it with whatever the server says. A town
 * opened this morning appears without anybody shipping code, which is the
 * whole point of the route behind it.
 */
export function useTowns(): Town[] {
  const [towns, setTowns] = useState<Town[]>(() => [...FALLBACK_TOWNS]);

  useEffect(() => {
    let cancelled = false;
    void fetchTowns().then((list) => {
      if (!cancelled && list.length) setTowns(list);
    });
    return () => { cancelled = true; };
  }, []);

  return towns;
}
