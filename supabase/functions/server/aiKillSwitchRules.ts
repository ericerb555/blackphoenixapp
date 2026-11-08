/**
 * The decisions the emergency stop makes, with no I/O in sight.
 *
 * WHY THIS IS SPLIT FROM `aiKillSwitch.ts`
 *
 * The same reason `aiCeiling.ts` is split from `aiSpend.ts`: that module
 * imports `npm:@supabase/supabase-js@2`, which `node --test` cannot resolve,
 * so anything defined beside it is unreachable from a test. This is a safety
 * control — the thing somebody reaches for when the AI is doing something
 * expensive or wrong — and "we read it carefully" is not the standard it
 * should be held to.
 *
 * So the rules that decide whether a call is refused live here, where they
 * can be driven directly, and the module next door does the database work.
 */

export const GLOBAL_SCOPE = 'global';

export interface StopState {
  scope: string;
  engagedAt: string;
  engagedBy: string;
  reason: string | null;
}

/** Thrown at the call site when a stop applies. */
export class AiStopped extends Error {
  readonly scope: string;
  constructor(state: StopState) {
    super(describeStop(state));
    this.name = 'AiStopped';
    this.scope = state.scope;
  }
}

/**
 * The sentence a caller sees.
 *
 * Names who engaged it, because the first question on hitting a stop is
 * "who turned this off and can I turn it back on". The reason is appended
 * only when there is one — a stop engaged by hand in an emergency may carry
 * none, and a dangling colon reads like a bug.
 */
export function describeStop(state: StopState): string {
  const who = `Engaged by ${state.engagedBy}`;
  const why = state.reason ? `: ${state.reason}` : '';
  return state.scope === GLOBAL_SCOPE
    ? `AI is stopped platform-wide. ${who}${why}.`
    : `The ${state.scope} agent is stopped. ${who}${why}.`;
}

/**
 * Which stop applies to this agent, given everything currently engaged.
 *
 * GLOBAL WINS. "Stop everything" must not be weakened by which agent happens
 * to be asking, and an agent-scoped entry can never narrow a global one.
 */
export function pickStop(
  live: ReadonlyMap<string, StopState>, agent?: string,
): StopState | null {
  return live.get(GLOBAL_SCOPE) || (agent ? live.get(agent) || null : null);
}

/** Global first, then agents alphabetically — the dashboard's order. */
export function sortStops(stops: StopState[]): StopState[] {
  return [...stops].sort((a, b) =>
    a.scope === GLOBAL_SCOPE ? -1
      : b.scope === GLOBAL_SCOPE ? 1
        : a.scope.localeCompare(b.scope));
}

/**
 * One flat shape rather than a discriminated union on `allow`.
 *
 * `tsconfig.server.json` runs with `strictNullChecks: false`, and without it
 * TypeScript will not narrow a union on a boolean discriminant — every read
 * of `held` is then reported as a property that does not exist. The union is
 * the better type and this config cannot use it.
 */
export interface ReadFailureAction {
  allow: boolean;
  reason: 'never-read' | 'holding-last-known';
  /** How many stops are being held through the outage. Zero when allowing. */
  held: number;
}

/**
 * What to do when the switch cannot be read.
 *
 * THIS IS THE WHOLE DESIGN, SO IT IS A FUNCTION RATHER THAN AN `IF`.
 *
 * Neither plain answer is right. Fail closed — refuse everything when the
 * table is unreadable — turns a transient database blip into a total AI
 * outage, including for whoever is trying to diagnose it. Fail open — allow
 * everything — means the stop silently stops working at exactly the moment
 * things are going wrong, which `SECURITY.md` calls the worst kind of
 * failure: "a control that stops enforcing is invisible until somebody else
 * finds it."
 *
 * So it fails to THE LAST THING IT KNEW. A stop never silently releases
 * itself. Only a cold start that has never read successfully allows, because
 * the alternative is a platform that bricks its own AI on the first
 * transient error after a deploy — and that path warns loudly.
 */
export function onReadFailure(lastKnown: ReadonlyMap<string, StopState> | null): ReadFailureAction {
  if (!lastKnown) return { allow: true, reason: 'never-read', held: 0 };
  return { allow: false, reason: 'holding-last-known', held: lastKnown.size };
}

/**
 * How long a reading is trusted, and therefore the honest upper bound on
 * "how long after I press stop does it stop".
 *
 * Read before every model call, so a query per call would put a round trip
 * in front of latency-sensitive work — which is how a safety check gets
 * argued out of the hot path later. Fifteen seconds is stated in the UI
 * rather than glossed: a stop that claimed to be instantaneous would be
 * wrong at exactly the moment somebody relies on it.
 */
export const CACHE_MS = 15_000;
export const TAKES_EFFECT_WITHIN_SECONDS = CACHE_MS / 1000;
