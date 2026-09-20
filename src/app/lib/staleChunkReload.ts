/**
 * Surviving a deploy while somebody has the app open.
 *
 * THE FAILURE THIS EXISTS FOR
 *
 * Every screen in this application is loaded on demand — `routes.tsx` has 179
 * `lazy(() => import(...))` calls, one per page. The browser only fetches a
 * page's JavaScript at the moment somebody navigates to it, and it asks for the
 * exact filename that was baked into the HTML when the tab was first loaded.
 *
 * A deploy replaces those filenames. So anyone who had the app open when a
 * build went out asks for a chunk that no longer exists the next time they move
 * between screens, and gets:
 *
 *     TypeError: Failed to fetch dynamically imported module:
 *     /assets/CustomerPortalView-DO87881s-1789941823893.js
 *
 * React then leaves them on the Suspense fallback — the word "Loading…" —
 * indefinitely. Nothing recovers, nothing explains it, and the person has no
 * way to know that a refresh would fix it in a second. Observed on the live
 * site on 2026-09-20, where a portal sat on "Loading…" through forty-four
 * identical console errors until the page was reloaded by hand.
 *
 * It is not an edge case. It happens to every open session on every deploy, and
 * the more often the app ships the more often somebody hits it.
 *
 * WHAT THIS DOES
 *
 * Reloads the page once, which is the only real fix: the reload fetches fresh
 * HTML, which names the chunks that actually exist.
 *
 * WHY A TIMESTAMP RATHER THAN A FLAG
 *
 * A chunk can also fail for reasons a reload will never cure — a broken CDN, a
 * genuinely missing file, somebody offline. Reloading on every failure would
 * spin such a browser in a loop forever, which is worse than the stall it
 * replaces. So the last attempt is remembered and another is refused inside a
 * short window. A boolean would have been simpler but wrong in the other
 * direction: it would make the first deploy of the session recoverable and
 * every later one not, and a tab can easily be open across several.
 *
 * `sessionStorage`, not `localStorage`: the guard should last as long as the
 * tab and no longer, and a reload preserves it while a new tab starts clean.
 */

/** When we last reloaded for this, as epoch milliseconds. */
const ATTEMPT_KEY = 'bp:stale-chunk-reload-at';

/**
 * How long to refuse a second reload. Long enough that a chunk which is simply
 * gone cannot cause a loop, short enough that two deploys in one sitting are
 * both recovered from.
 */
const COOLDOWN_MS = 20_000;

/**
 * The shapes browsers use to say "that module would not load".
 *
 * Deliberately narrow. This triggers a full page reload, so it must not fire on
 * an ordinary application error — matching too widely would turn any unhandled
 * rejection into a refresh and lose whatever the person was typing.
 */
const CHUNK_ERROR = /Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed|ChunkLoadError/i;

let installed = false;

function describes(value: unknown): string {
  if (!value) return '';
  if (typeof value === 'string') return value;
  const err = value as { message?: unknown; name?: unknown };
  return `${String(err?.name ?? '')} ${String(err?.message ?? '')}`;
}

function reloadOnce(reason: string): void {
  try {
    const last = Number(sessionStorage.getItem(ATTEMPT_KEY) || 0);
    if (Number.isFinite(last) && Date.now() - last < COOLDOWN_MS) {
      // Already tried. Let the failure surface rather than spinning.
      console.warn(`[staleChunk] ${reason} — already reloaded once, leaving it alone.`);
      return;
    }
    sessionStorage.setItem(ATTEMPT_KEY, String(Date.now()));
  } catch {
    // Storage can be unavailable in a private window. Without a guard a loop is
    // possible, so do nothing rather than risk one.
    return;
  }
  console.warn(`[staleChunk] ${reason} — reloading to pick up the current build.`);
  window.location.reload();
}

/**
 * Watch for a page's code failing to load, and refresh into the current build.
 *
 * Installed from main.tsx before render, because the very first navigation
 * after a deploy is as likely to hit this as any later one.
 */
export function installStaleChunkReload(): void {
  if (installed || typeof window === 'undefined') return;
  installed = true;

  // Vite's own signal. It fires on the preload helper that wraps every dynamic
  // import in a built bundle, and is the most reliable of the three.
  window.addEventListener('vite:preloadError', (event) => {
    // Stop Vite throwing on top of the reload we are about to do.
    (event as Event & { preventDefault(): void }).preventDefault?.();
    reloadOnce('a page chunk failed to preload');
  });

  // The rejection React surfaces when a `lazy()` import fails.
  window.addEventListener('unhandledrejection', (event) => {
    if (CHUNK_ERROR.test(describes(event.reason))) {
      reloadOnce('a page chunk failed to import');
    }
  });

  // And a plain error, for browsers that report it that way.
  window.addEventListener('error', (event) => {
    if (CHUNK_ERROR.test(describes(event.error) || String(event.message || ''))) {
      reloadOnce('a page chunk failed to load');
    }
  });
}
