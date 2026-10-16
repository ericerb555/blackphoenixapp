/**
 * Where the resident is, if they choose to say.
 *
 * WHAT THIS DELIBERATELY DOES NOT DO
 *
 * It does not ask on load. A directory that demands your location before it
 * will show you anything is the behaviour people resent about the lead-resale
 * sites, and copying it would undo the Exchange's whole positioning. The
 * permission prompt appears only when somebody presses the button.
 *
 * It does not persist the coordinate. Nothing goes to `localStorage`, nothing
 * goes into a URL, and nothing is sent to our server or anybody else's — the
 * position lives in React state for as long as the page is open and is gone
 * when it closes. Distance is computed in the browser (see `exchangeGeo.ts`),
 * which is what makes keeping it local possible at all.
 *
 * `ask()` does not watch. `watchPosition` would follow somebody around the
 * town for the sake of a distance that barely changes, so `ask` reads the
 * position once, each time it is asked. That remains the default and the only
 * thing the front door ever uses.
 *
 * `follow()` DOES watch, and is a separate verb on purpose. Eric asked for a
 * map that follows you, and that is the one case where the reasoning above
 * does not apply: walking down a street, the dot genuinely has to move, and a
 * map that silently showed where you were two minutes ago would be worse than
 * one showing nothing. It never starts on its own, `stop()` ends it, and the
 * watch is cleared when the component goes away so no page can leave the GPS
 * running behind it.
 *
 * Both are the same promise about the data: the coordinate stays in this
 * browser. Watching changes how often a position is read, never where it goes
 * — nothing is persisted, nothing is put in a URL, and nothing is sent to our
 * server or anybody else's.
 *
 * It offers `forget()`, because a resident who shared a location should be
 * able to take it back without closing the tab, and a button that does that is
 * the only honest way to say the data is held nowhere else.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Point } from './exchangeGeo';
import { asPoint } from './exchangeGeo';

export type Here =
  /** Never asked. The starting state and the one we stay in by default. */
  | { kind: 'unknown' }
  /** The browser is deciding or the person is looking at the prompt. */
  | { kind: 'asking' }
  | { kind: 'known'; point: Point }
  /** They said no. Not an error, and not worth asking again unprompted. */
  | { kind: 'refused' }
  /** Asked and could not answer — no signal, a timeout, a wrong figure. */
  | { kind: 'failed'; why: string }
  /** No geolocation in this browser at all. */
  | { kind: 'unsupported' };

/** Long enough for a cold GPS fix, short enough not to look broken. */
const TIMEOUT_MS = 10_000;

/**
 * A position up to two minutes old is fine.
 *
 * Nobody moves far enough in two minutes to change which businesses are
 * nearest, and accepting a cached fix avoids waking the GPS for a number we
 * already have.
 */
const MAX_AGE_MS = 120_000;

export function useHere() {
  const [here, setHere] = useState<Here>({ kind: 'unknown' });
  /** The live `watchPosition` handle, when following. */
  const watch = useRef<number | null>(null);
  const [following, setFollowing] = useState(false);

  /** Read a position the browser handed us, or say why we could not. */
  const take = useCallback((position: any) => {
    // Validated rather than trusted, the same as the one-shot path: a browser
    // extension or a spoofing tool can put anything in here, and `NaN` would
    // travel silently through the distance arithmetic and onto the screen.
    const point = asPoint({
      lat: position?.coords?.latitude,
      lng: position?.coords?.longitude,
    });
    setHere(point
      ? { kind: 'known', point }
      : { kind: 'failed', why: 'Your browser gave us a position we could not read.' });
  }, []);

  const problem = useCallback((error: any) => {
    if (error?.code === 1) { setHere({ kind: 'refused' }); return; }
    setHere({
      kind: 'failed',
      why: error?.code === 3
        ? 'Finding your location took too long.'
        : 'We could not work out where you are.',
    });
  }, []);

  /** End a watch, wherever it is ended from. */
  const endWatch = useCallback(() => {
    if (watch.current !== null && typeof navigator !== 'undefined') {
      navigator.geolocation?.clearWatch?.(watch.current);
    }
    watch.current = null;
    setFollowing(false);
  }, []);

  /*
   * A page that unmounts while following must not leave the GPS running. This
   * is the difference between a feature somebody switched on and a device
   * quietly draining its battery for a tab that is gone.
   */
  useEffect(() => endWatch, [endWatch]);

  /**
   * Follow, until told to stop.
   *
   * `enableHighAccuracy` is on here and off in `ask`, because the two want
   * different things: a distance in miles is fine from a coarse fix, while a
   * dot that is meant to track you down a street is not. `maximumAge: 0`
   * because a cached position is exactly what following must not show.
   */
  const follow = useCallback(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setHere({ kind: 'unsupported' });
      return;
    }
    if (watch.current !== null) return;

    setHere((current) => (current.kind === 'known' ? current : { kind: 'asking' }));
    setFollowing(true);
    watch.current = navigator.geolocation.watchPosition(
      take,
      (error) => {
        problem(error);
        // A refusal or a hard failure ends the watch rather than retrying for
        // ever against a permission that is not going to be granted.
        if (error?.code === 1) endWatch();
      },
      { enableHighAccuracy: true, timeout: TIMEOUT_MS, maximumAge: 0 },
    );
  }, [take, problem, endWatch]);

  const stop = useCallback(() => endWatch(), [endWatch]);

  const ask = useCallback(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setHere({ kind: 'unsupported' });
      return;
    }

    setHere({ kind: 'asking' });
    // PERMISSION_DENIED is 1, and `problem` treats it as its own state rather
    // than as a failure: "no thank you" is an answer and should not be
    // reported back to somebody as though something went wrong.
    navigator.geolocation.getCurrentPosition(
      take,
      problem,
      { enableHighAccuracy: false, timeout: TIMEOUT_MS, maximumAge: MAX_AGE_MS },
    );
  }, [take, problem]);

  /** Give it back. Stops any watch first, or "forget" would be a lie. */
  const forget = useCallback(() => {
    endWatch();
    setHere({ kind: 'unknown' });
  }, [endWatch]);

  return { here, ask, follow, stop, forget, following };
}

/** The point, when there is one. Saves every caller writing the narrowing. */
export function pointOf(here: Here): Point | null {
  return here.kind === 'known' ? here.point : null;
}
