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
 * It does not watch. `watchPosition` would follow somebody around the town for
 * the sake of a number that barely changes, so this reads the position once,
 * each time it is asked.
 *
 * It offers `forget()`, because a resident who shared a location should be
 * able to take it back without closing the tab, and a button that does that is
 * the only honest way to say the data is held nowhere else.
 */
import { useCallback, useState } from 'react';
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

  const ask = useCallback(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setHere({ kind: 'unsupported' });
      return;
    }

    setHere({ kind: 'asking' });
    navigator.geolocation.getCurrentPosition(
      (position) => {
        // Validated rather than trusted. A browser extension or a spoofing
        // tool can put anything in here, and `NaN` would travel silently
        // through the distance arithmetic and onto the screen.
        const point = asPoint({
          lat: position?.coords?.latitude,
          lng: position?.coords?.longitude,
        });
        setHere(point
          ? { kind: 'known', point }
          : { kind: 'failed', why: 'Your browser gave us a position we could not read.' });
      },
      (error) => {
        // PERMISSION_DENIED is 1. Treated as its own state rather than as a
        // failure, because "no thank you" is an answer and should not be
        // reported back to somebody as though something went wrong.
        if (error?.code === 1) { setHere({ kind: 'refused' }); return; }
        setHere({
          kind: 'failed',
          why: error?.code === 3
            ? 'Finding your location took too long.'
            : 'We could not work out where you are.',
        });
      },
      { enableHighAccuracy: false, timeout: TIMEOUT_MS, maximumAge: MAX_AGE_MS },
    );
  }, []);

  const forget = useCallback(() => setHere({ kind: 'unknown' }), []);

  return { here, ask, forget };
}

/** The point, when there is one. Saves every caller writing the narrowing. */
export function pointOf(here: Here): Point | null {
  return here.kind === 'known' ? here.point : null;
}
