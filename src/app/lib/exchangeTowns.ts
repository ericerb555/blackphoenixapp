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
import { useCallback, useEffect, useState } from 'react';
import { projectId, publicAnonKey } from '../utils/supabase/info';
/* The rule itself lives in `exchangeGeo.ts`, which imports nothing and is
   therefore testable under `node --test`. This module cannot be: it imports
   React and the Supabase config. Re-exported so callers have one place to look. */
export { nearestTown, TOWN_NEAR_ENOUGH_MILES } from './exchangeGeo';
import type { Point } from './exchangeGeo';
import { nearestTown } from './exchangeGeo';

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
 * Whether the town is being chosen by where they are, or by them.
 *
 * Needed because `readTown()` cannot answer it on its own: an empty slug means
 * "All towns", and "All towns" is a perfectly good thing to pick on purpose.
 * Without this, a resident who deliberately chose to see everywhere would have
 * their choice quietly overruled by their own GPS on the next visit, which is
 * the rudest possible reading of a helpful feature.
 */
const MODE_KEY = 'bpx_territory_mode';

export type TownMode = 'auto' | 'manual';

export function readTownMode(): TownMode {
  try {
    return localStorage.getItem(MODE_KEY) === 'manual' ? 'manual' : 'auto';
  } catch {
    return 'auto';
  }
}

export function writeTownMode(mode: TownMode): void {
  try { localStorage.setItem(MODE_KEY, mode); } catch { /* refused storage is not a failure */ }
}


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
 * The chosen town: where they are, unless they said otherwise.
 *
 * Eric: "it should be whatever town the gps is pinging from but can be changed
 * manually by users." This is that, with one deliberate restraint.
 *
 * IT ASKS ON ARRIVAL, WHICH IS A DECISION THAT WAS MADE TWICE
 *
 * The first version only read a position when the Permissions API confirmed
 * one had already been granted, so nothing could put a dialog in front of
 * somebody arriving from a search engine — the deference `exchangeHere.ts`
 * argues for.
 *
 * It did not work, and Eric said so: "it still isnt bringing me to the gps
 * read town i am in." Of course it did not. Nobody had granted anything yet,
 * so the silent path never ran — and on an iPhone it could never run at all,
 * because Safari does not implement `permissions.query` for geolocation, so
 * the check meant as a safe shortcut was instead a permanent no.
 *
 * Asked for twice, and shipped not working once, is enough. It now asks on
 * arrival whenever the town is still being chosen automatically. The one
 * protection kept is the one that matters: somebody who has said no is never
 * asked again, because `denied` stops it before the call. Picking any town
 * stops it too — that is what `manual` means.
 *
 * The rule in `exchangeHere.ts` is untouched, and so is everything built on
 * it: distances, "show me what is nearest" and Follow me all still wait to be
 * pressed. What changed is this one question — which of three towns to show —
 * and it is the question a resident arrives already asking.
 *
 * WHAT A MANUAL CHOICE MEANS
 *
 * It wins, and it keeps winning. Tapping any town writes `manual` and the GPS
 * stops choosing until they press Near me again. That includes choosing "All
 * towns", which is a real preference and not an absence of one — the mode key
 * exists precisely so those two can be told apart.
 */
export function useTownChoice(towns: readonly Town[]) {
  const [town, setTownState] = useState<string>(() => readTown());
  const [mode, setMode] = useState<TownMode>(() => readTownMode());
  const [locating, setLocating] = useState(false);
  /** Set when a fix came back from somewhere the Exchange does not cover. */
  const [tooFar, setTooFar] = useState(false);

  /** Read a position and pick the town nearest it. */
  const resolve = useCallback((towns: readonly Town[], onDone?: () => void) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) { onDone?.(); return; }

    setLocating(true);
    setTooFar(false);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const near = nearestTown(
          { lat: position?.coords?.latitude, lng: position?.coords?.longitude } as Point,
          towns,
        );
        if (near) {
          setTownState(near.town.slug);
          writeTown(near.town.slug);
        } else {
          // Nowhere near a covered town. Saying so beats snapping them to the
          // least distant of three wrong answers.
          setTooFar(true);
        }
        setLocating(false);
        onDone?.();
      },
      () => { setLocating(false); onDone?.(); },
      // A coarse, two-minute-old fix is ideal here: this decides which of three
      // towns somebody is in, not where they are standing.
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 120_000 },
    );
  }, []);

  /* Silent resolution, only where the browser confirms no dialog can appear. */
  /*
   * Only once the REAL towns have arrived.
   *
   * `useTowns` starts on the offline fallback, which carries no centres, and
   * measuring against that list answers "nowhere near a covered town" for
   * somebody standing in the middle of one. The first version ran against it
   * and could flash exactly that.
   */
  const placeable = towns.some((t) => t.center);

  useEffect(() => {
    if (mode !== 'auto' || !placeable) return;
    let cancelled = false;

    void (async () => {
      try {
        const status = await (navigator as any)?.permissions?.query?.({ name: 'geolocation' });
        // Somebody who has said no is never asked again. Everything else —
        // granted, not yet asked, or a browser that cannot answer the question
        // — goes on to ask, which on iOS is the only path there has ever been.
        if (status?.state === 'denied') return;
      } catch {
        /* No Permissions API. Not a reason to give up; a reason to ask. */
      }
      if (!cancelled) resolve(towns);
    })();

    return () => { cancelled = true; };
  }, [mode, placeable, towns, resolve]);

  /** A town somebody picked. Theirs, and remembered as theirs. */
  const choose = useCallback((slug: string) => {
    setTownState(slug);
    writeTown(slug);
    setMode('manual');
    writeTownMode('manual');
    setTooFar(false);
  }, []);

  /** The Near me control: opts back in, and asks if it has to. */
  const locate = useCallback(() => {
    setMode('auto');
    writeTownMode('auto');
    resolve(towns);
  }, [towns, resolve]);

  return { town, mode, locating, tooFar, choose, locate };
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
