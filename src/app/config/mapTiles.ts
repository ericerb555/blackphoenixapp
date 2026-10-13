/**
 * The basemap behind the Phoenix Exchange map.
 *
 * WHERE THE KEY LIVES, AND WHY NOT HERE
 *
 * The tile key is a Supabase secret named `MAP_TILE_KEY`, and the server
 * assembles the style URL from it — see `/exchange/map-style` in
 * `exchangeDirectory.tsx`. Eric put it there rather than in this file, which
 * is the better place for two concrete reasons: it is not committed to the
 * repository, and it can be rotated with `supabase secrets set` without
 * rebuilding and redeploying the front end. A constant compiled into the
 * bundle could do neither.
 *
 * It is worth being precise about what that buys, because it is easy to
 * overstate. The key still reaches the browser — a browser cannot fetch tiles
 * without it, so anyone who opens the network tab will see it. That is true of
 * every client-side map, which is why MapTiler calls these keys *publishable*.
 * The thing that actually protects it is the **origin restriction** on the key
 * in the MapTiler console: a request from anywhere but our own domains is
 * refused, so a copied key is worth nothing to whoever copied it. Keeping it
 * server-side is about storage and rotation, not secrecy.
 *
 * WHY OPENSTREETMAP'S OWN TILES ARE NOT AN OPTION
 *
 * Their usage policy forbids systematic use by an application, and a main
 * product feature is squarely that. The failure mode is being blocked without
 * notice, so it is not available even as a quick test. The *data* in our pins
 * is OpenStreetMap's and is credited; the tiles are a separate thing we have
 * to pay for or host.
 */
import { projectId, publicAnonKey } from '../utils/supabase/info';

const SERVER = `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6`;

/** The credit shown on the map if the server does not name one. */
export const MAP_ATTRIBUTION = '© MapTiler © OpenStreetMap contributors';

/**
 * A local override, for working offline or against a different provider.
 *
 * Normally empty: the server is the source of truth. Putting a key here is a
 * deliberate local-only act and it must not be committed with a value in it —
 * that would undo the reason the key lives in a secret.
 */
export const MAP_TILE_KEY_OVERRIDE = '';

const OVERRIDE_STYLE = 'streets-v2-dark';

export interface BasemapConfig {
  /** Null when no key is configured — the caller says so rather than guessing. */
  styleUrl: string | null;
  attribution: string;
}

/**
 * Ask the server what to draw.
 *
 * Resolved once, lazily, by the map component just before it initialises —
 * never on page load, because most visitors to a category page never scroll to
 * the map and this is a network round trip.
 *
 * Any failure resolves to `styleUrl: null` rather than throwing. The map has a
 * visible state for "no basemap" and the list of businesses never depends on
 * the map succeeding, so a failed config fetch should cost a map and nothing
 * else.
 */
export async function fetchBasemapConfig(): Promise<BasemapConfig> {
  const override = MAP_TILE_KEY_OVERRIDE.trim();
  if (override) {
    return {
      styleUrl: `https://api.maptiler.com/maps/${OVERRIDE_STYLE}/style.json?key=${encodeURIComponent(override)}`,
      attribution: MAP_ATTRIBUTION,
    };
  }

  try {
    const res = await fetch(`${SERVER}/exchange/map-style`, {
      headers: { Authorization: `Bearer ${publicAnonKey}` },
    });
    if (!res.ok) return { styleUrl: null, attribution: MAP_ATTRIBUTION };

    const body = await res.json().catch(() => null);
    const url = typeof body?.styleUrl === 'string' ? body.styleUrl : null;
    return {
      styleUrl: url || null,
      attribution: typeof body?.attribution === 'string' && body.attribution
        ? body.attribution
        : MAP_ATTRIBUTION,
    };
  } catch {
    return { styleUrl: null, attribution: MAP_ATTRIBUTION };
  }
}
