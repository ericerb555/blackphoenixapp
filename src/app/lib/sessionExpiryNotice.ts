/**
 * Saying "you are signed out" instead of "something went wrong".
 *
 * THE FAILURE THIS EXISTS FOR
 *
 * Roughly eighty call sites in this app fetch with
 * `session?.access_token || publicAnonKey`. The fallback is deliberate and
 * correct for public routes — but when a session has quietly expired it means
 * every authenticated call sends the PUBLISHABLE KEY, which identifies nobody.
 *
 * The auth server then answers `invalid claim: missing sub claim`, the API turns
 * that into a 401, and the screen shows whatever generic failure it has. The
 * person is still looking at a fully rendered application, so the reasonable
 * conclusion is that the feature is broken. That happened: a work request would
 * not open into the pipeline, fourteen calls failed in half a minute, and
 * nothing anywhere said the word "signed out".
 *
 * WHY IT IS ONE LISTENER RATHER THAN EIGHTY EDITS
 *
 * Changing every call site would touch every screen to fix a message. This
 * watches responses instead: one place, no change to how anything requests, and
 * it cannot alter what a caller receives.
 *
 * WHAT IT DELIBERATELY DOES NOT DO
 *
 * It does not sign anybody out, redirect, or retry. Losing a half-filled form
 * because a token expired is worse than the confusion it replaces. It tells the
 * truth and leaves the decision to the person.
 */
import { toast } from 'sonner';
import { supabase } from './supabase';
import { projectId } from '../utils/supabase/info';

/** Our own API. A 401 from somewhere else is not ours to explain. */
const OUR_API = `https://${projectId}.supabase.co/functions/v1/`;

/** One notice per lull, because a screen can fire a dozen calls at once. */
const QUIET_MS = 30_000;
let lastNotice = 0;

let installed = false;

async function looksSignedOut(): Promise<boolean> {
  try {
    const { data } = await supabase.auth.getSession();
    return !data?.session?.access_token;
  } catch {
    // If even asking fails, treating it as signed out is the safe reading.
    return true;
  }
}

function notice() {
  const now = Date.now();
  if (now - lastNotice < QUIET_MS) return;
  lastNotice = now;
  toast.error('Your session has expired', {
    id: 'session-expired',
    duration: 12_000,
    description: 'Sign in again to carry on — nothing was saved under the wrong account.',
  });
}

/**
 * Watch our own API for the shape of an expired session.
 *
 * A 401 is only reported when there is genuinely no session, because a 401 with
 * a valid session means something quite different — that the account is not
 * allowed to do this — and calling that an expiry would send somebody to sign in
 * again for no reason.
 */
export function installSessionExpiryNotice(): void {
  if (installed || typeof window === 'undefined' || !window.fetch) return;
  installed = true;

  const original = window.fetch.bind(window);

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const res = await original(input as any, init);
    try {
      if (res.status !== 401) return res;
      const url = typeof input === 'string' ? input
        : input instanceof URL ? input.toString()
        : (input as Request)?.url || '';
      if (!url.startsWith(OUR_API)) return res;
      // Asked after the fact, so the check never delays the response the caller
      // is waiting for.
      void looksSignedOut().then((yes) => { if (yes) notice(); });
    } catch {
      // A notice is a convenience. It must never break a request.
    }
    return res;
  };
}
