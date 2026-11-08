/**
 * Stopping the AI, and knowing whether it is stopped.
 *
 * WHY THIS IS SEPARATE FROM `aiLedger.ts`
 *
 * The ledger's contract is that it only observes: every write is best-effort,
 * every failure is swallowed, and nothing is ever permitted or refused on the
 * strength of a ledger write succeeding. That is the right contract for a
 * logger and exactly the wrong one for a safety control, so the stop lives in
 * its own file with the opposite disposition — this one is allowed to refuse.
 *
 * The two are used together at each call site: check the stop, then open the
 * ledger row. Keeping them apart means nobody can accidentally weaken the
 * stop while making the logging more forgiving.
 *
 * WHAT IT GOVERNS
 *
 * `global` stops every model call on the platform. Any other scope is an
 * agent name and stops just that one — which is what the dashboard's pause
 * button should have been doing instead of flipping a boolean in React state
 * and reporting success.
 *
 * It does NOT govern anything else. The stop is about model spend and
 * autonomous output; it does not log anybody out, pause the schedulers, or
 * touch the store. Those have their own switches, and a control that claims
 * a wider blast radius than it has is its own kind of lie.
 */
import { createClient } from "npm:@supabase/supabase-js@2";
import {
  GLOBAL_SCOPE, AiStopped, pickStop, sortStops, onReadFailure, CACHE_MS,
  type StopState,
} from "./aiKillSwitchRules.ts";

/**
 * Re-exported so callers import the stop from one place, while the rules
 * themselves stay in a module `node --test` can load.
 */
export { GLOBAL_SCOPE, AiStopped, CACHE_MS, type StopState };

let cachedClient: any = null;
function admin() {
  if (!cachedClient) {
    cachedClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );
  }
  return cachedClient;
}


interface Snapshot {
  at: number;
  /** Scope -> live stop. Empty map means nothing is engaged. */
  live: Map<string, StopState>;
}

let snapshot: Snapshot | null = null;

/**
 * Read the live stops, through a short cache.
 *
 * THE FAILURE MODE, WHICH IS THE WHOLE DESIGN
 *
 * Neither "fail open" nor "fail closed" is right on its own here.
 *
 * Fail closed — refuse everything when the table cannot be read — turns a
 * transient database blip into a total AI outage, including for the person
 * trying to diagnose it.
 *
 * Fail open — allow everything when the table cannot be read — means the stop
 * silently stops working exactly when things are going wrong, which is the
 * failure `SECURITY.md` describes as the worst kind: "a control that stops
 * enforcing is invisible until somebody else finds it."
 *
 * So it fails to THE LAST THING IT KNEW. If the switch was engaged when we
 * last looked, it stays engaged through the outage — a stop never silently
 * releases itself. If it was clear, it stays clear. Only on a cold start with
 * no successful read ever does it allow, because the alternative is a
 * platform that bricks its own AI on the first transient error after a
 * deploy. Every one of those paths logs loudly.
 */
async function liveStops(): Promise<Map<string, StopState>> {
  const now = Date.now();
  if (snapshot && now - snapshot.at < CACHE_MS) return snapshot.live;

  try {
    const { data, error } = await admin()
      .from('ai_kill_switch')
      .select('scope,engaged_at,engaged_by,reason')
      .is('released_at', null);
    if (error) throw new Error(error.message);

    const live = new Map<string, StopState>();
    for (const row of data || []) {
      live.set(String(row.scope), {
        scope: String(row.scope),
        engagedAt: row.engaged_at,
        engagedBy: row.engaged_by,
        reason: row.reason ?? null,
      });
    }
    snapshot = { at: now, live };
    return live;
  } catch (e: any) {
    const action = onReadFailure(snapshot ? snapshot.live : null);
    if (!action.allow) {
      console.error(
        `[aiKillSwitch] could not read the switch (${e?.message || e}); `
        + `holding the last known state from ${new Date(snapshot!.at).toISOString()} `
        + `(${action.held} stop(s) engaged)`,
      );
      return snapshot!.live;
    }
    console.error(
      `[aiKillSwitch] could not read the switch and have never read it successfully `
      + `(${e?.message || e}); ALLOWING calls. If a stop is engaged it is NOT being enforced.`,
    );
    return new Map();
  }
}

/** The live stop that applies to this agent, or null. Global wins. */
export async function stopFor(agent?: string): Promise<StopState | null> {
  return pickStop(await liveStops(), agent);
}

/**
 * Refuse to proceed if a stop applies. Call this before the model call.
 *
 * Throws rather than returning a verdict, so a caller cannot forget to check
 * the result. A forgotten `if` is the way a safety control quietly stops
 * covering a route; an unhandled throw is loud and is caught by the handler's
 * existing error path.
 */
export async function assertAiAllowed(agent?: string): Promise<void> {
  const stop = await stopFor(agent);
  if (stop) throw new AiStopped(stop);
}

/** Everything currently engaged, for the dashboard. */
export async function allStops(): Promise<StopState[]> {
  return sortStops([...(await liveStops()).values()]);
}

/**
 * Drop the cache, so a change takes effect on the very next call.
 *
 * Called by the engage and release routes. Without it, pressing stop would
 * appear to do nothing for up to fifteen seconds in the UI that just pressed
 * it — which is how somebody presses it four more times, or decides it is
 * broken and does something worse.
 *
 * This only clears the cache in THIS isolate. Supabase may be running several,
 * so another one can still be up to `CACHE_MS` behind. That is the same
 * fifteen-second bound as above and is stated in the UI.
 */
export function forgetCachedStops(): void {
  snapshot = null;
}

export async function engageStop(
  scope: string, engagedBy: string, reason?: string,
): Promise<{ ok: boolean; already?: boolean; error?: string }> {
  try {
    const { error } = await admin().from('ai_kill_switch').insert({
      scope, engaged_by: engagedBy, reason: reason || null,
    });
    if (error) {
      // The partial unique index refuses a second live row for a scope.
      // Already stopped is the outcome the caller wanted, not a failure.
      if (String(error.code) === '23505') { forgetCachedStops(); return { ok: true, already: true }; }
      return { ok: false, error: error.message };
    }
    forgetCachedStops();
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message || String(e) };
  }
}

export async function releaseStop(
  scope: string, releasedBy: string,
): Promise<{ ok: boolean; wasEngaged: boolean; error?: string }> {
  try {
    const { data, error } = await admin()
      .from('ai_kill_switch')
      .update({ released_at: new Date().toISOString(), released_by: releasedBy })
      .eq('scope', scope)
      .is('released_at', null)
      .select('id');
    if (error) return { ok: false, wasEngaged: false, error: error.message };
    forgetCachedStops();
    return { ok: true, wasEngaged: (data || []).length > 0 };
  } catch (e: any) {
    return { ok: false, wasEngaged: false, error: e?.message || String(e) };
  }
}
