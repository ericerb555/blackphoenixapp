/**
 * The basemap behind the Phoenix Exchange map.
 *
 * ONE PLACE, ON PURPOSE
 *
 * The tile provider and the key live here and nowhere else. Scattering a
 * provider URL through the map code is how a company ends up unable to change
 * supplier without a search-and-replace, and this one is expected to change:
 * the plan is to prove the feature on a hosted free tier and move to
 * self-hosted tiles if the volume ever justifies it.
 *
 * WHY THERE IS A KEY IN CLIENT CODE AT ALL
 *
 * A tile key is a *publishable* key, like the Supabase anon key next door in
 * `utils/supabase/info.tsx`. It has to reach the browser, because the browser
 * is what fetches the tiles. That is normal and it is not a secret — but it is
 * only safe under one condition:
 *
 *   **The key MUST be restricted to our own domains in the MapTiler console.**
 *
 * Without that restriction anybody who views source can spend our tile
 * allowance on their own website, and the first we would know is the bill or
 * the cut-off. Set the allowed origins to theblackphoenixcompany.com and
 * localhost before pasting the key in, not afterwards.
 *
 * WHY OPENSTREETMAP'S OWN TILES ARE NOT AN OPTION
 *
 * Their usage policy forbids systematic use by an application, and a main
 * product feature is squarely that. The failure mode is being blocked without
 * notice, so it is not available even as a quick test. The *data* in our pins
 * is OpenStreetMap's and is credited; the tiles are a separate thing we have
 * to pay for or host.
 */

/**
 * The MapTiler key. Empty until Eric creates one.
 *
 * Paste it here, after restricting it by origin in the MapTiler console. The
 * map degrades honestly while this is empty — it says the basemap is not
 * configured rather than rendering a blank grey square and looking broken.
 */
export const MAP_TILE_KEY = '';

/**
 * Which MapTiler style to ask for.
 *
 * `streets-v2-dark` because the Exchange is a dark interface and a light
 * basemap under dark pins is unreadable. Named rather than inlined so swapping
 * it is a one-word change.
 */
const MAP_TILE_STYLE = 'streets-v2-dark';

/** Attribution the licence requires, shown on the map itself. */
export const MAP_ATTRIBUTION =
  '© MapTiler © OpenStreetMap contributors';

/**
 * The style URL, or null when there is no key.
 *
 * Null rather than a URL with an empty key: a request with `?key=` returns a
 * 403 and MapLibre renders an empty void with no explanation, which looks like
 * our bug rather than missing configuration.
 */
export function mapStyleUrl(): string | null {
  const key = MAP_TILE_KEY.trim();
  if (!key) return null;
  return `https://api.maptiler.com/maps/${MAP_TILE_STYLE}/style.json?key=${encodeURIComponent(key)}`;
}

/** Whether a basemap can be drawn at all. */
export function basemapConfigured(): boolean {
  return mapStyleUrl() !== null;
}
