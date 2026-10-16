/**
 * Which town the Exchange refreshes next, and when it leaves Overpass alone.
 *
 * WHY THIS IS ITS OWN FILE
 *
 * It decides what a scheduled job does to a live directory of 1,100
 * businesses, and the test runner strips types from `.ts` only — a rule living
 * in a `.tsx` cannot be checked by hand. `exchangeIngestRun.ts` fetches and
 * writes; this only chooses, so it can be tested without touching anything.
 *
 * WHY ONE TOWN PER TICK
 *
 * `exchangeIngestRun.ts` says it plainly: the public Overpass endpoint
 * answered 504 on two of three towns during testing, repeatedly, and it is a
 * free shared service entitled to say no. An earlier fetcher fired twelve
 * queries back to back and was blocked outright. So a tick is one town, and
 * the plan Eric agreed on 2026-10-13 was weekly, one town per tick.
 *
 * THE DAILY TICK *IS* THE BACKOFF, AND THAT IS WORTH SAYING OUT LOUD
 *
 * Asked directly on 2026-10-16, while watching the first real tick fail, the
 * endpoint answered:
 *
 *   502 — "This Overpass API server is currently at capacity. All query workers
 *   are busy and the request queue is full... Retry your request using
 *   exponential backoff... This public endpoint is intended for browser-based
 *   and human-operated tools. For automated or high-volume use, run a local
 *   Overpass API instance."
 *
 * A fair warning, and worth reading twice before anybody is tempted to add
 * retries inside a tick. Retrying in-process is the behaviour that got the
 * earlier fetcher blocked; it turns one polite request into several impolite
 * ones. A tick that fails, records why, leaves the town at the front of the
 * queue and comes back tomorrow is already exponential backoff with a 24-hour
 * first interval — gentler than anything the endpoint asks for.
 *
 * If that ever stops being enough, the answer the endpoint itself gives is to
 * run our own Overpass instance, not to ask the public one harder.
 *
 * NEVER-COMPILED COMES FIRST, AND THAT IS THE POINT
 *
 * A town with no listings is not a stale town, it is an empty product. Hudson
 * and Windham sat opened-but-empty for days because compiling a hidden town
 * threw `no such territory` — see the note on the territory lookup in
 * `exchangeIngestRun.ts`. With that fixed, the clock should fill them before
 * it goes back to re-checking Manchester, which already holds 897.
 *
 * WHAT IT WILL NOT DO
 *
 * It does not promote a town. Eric's decision, recorded in
 * `tasks/exchange-more-towns-and-upkeep.md`: a town goes live **only when he
 * says so**. A clock that published towns on its own would be making a
 * judgement about whether a town is worth a resident's time, which is the one
 * thing that flow deliberately keeps in a person's hands.
 *
 * It does not open a town either. Choosing where to operate is not a decision
 * to hand a schedule.
 */

/** A territory, as far as choosing cares. */
export interface UpkeepTown {
  slug: string;
  name?: string;
  status?: string;
  center_lat?: number | string | null;
  center_lng?: number | string | null;
  /** When the ingest last ran for this town. Null means it never has. */
  last_compiled_at?: string | null;
}

/**
 * How long a town's listings are allowed to go unchecked.
 *
 * Seven days, which is the interval Eric agreed. Not shorter: ten towns
 * refreshed nightly is ten times the fetching against an endpoint that has
 * already refused us, and a business's opening hours do not change daily.
 */
export const REFRESH_AFTER_DAYS = 7;

export type SkipReason =
  | 'no-towns'
  | 'all-fresh'
  | 'no-centre';

export interface Choice {
  town: UpkeepTown | null;
  /** Why this one, or why none. For the run record a person reads. */
  why: string;
  reason?: SkipReason;
}

const hasCentre = (town: UpkeepTown): boolean =>
  town.center_lat !== null && town.center_lat !== undefined && town.center_lat !== ''
  && town.center_lng !== null && town.center_lng !== undefined && town.center_lng !== ''
  && Number.isFinite(Number(town.center_lat)) && Number.isFinite(Number(town.center_lng));

/** Milliseconds since this town was compiled, or null if it never was. */
const compiledAt = (town: UpkeepTown): number | null => {
  const raw = town.last_compiled_at;
  if (!raw) return null;
  const t = Date.parse(String(raw));
  return Number.isFinite(t) ? t : null;
};

/**
 * The town this tick should refresh, or none with a reason.
 *
 * The order of the decisions is the order of what matters:
 *
 *   1. a town with no centre is skipped — there is nowhere to search, and
 *      `ingestTerritory` would throw
 *   2. a town that has never been compiled wins — it holds nothing
 *   3. otherwise the one compiled longest ago
 *   4. and if everything is inside the refresh window, nothing runs
 *
 * Step 4 matters as much as the rest. A clock that always does something will
 * re-fetch the same town every tick the moment the list is short, which is how
 * a free endpoint starts refusing us.
 *
 * Ties break on slug so the choice is deterministic rather than dependent on
 * the order the database happened to return.
 */
export function pickTownToRefresh(
  towns: Array<UpkeepTown | null | undefined>,
  now: number = Date.now(),
): Choice {
  const all = (towns || []).filter((t): t is UpkeepTown => Boolean(t && t.slug));
  if (all.length === 0) {
    return { town: null, why: 'There are no towns to refresh.', reason: 'no-towns' };
  }

  const placeable = all.filter(hasCentre);
  if (placeable.length === 0) {
    return {
      town: null,
      why: `${all.length} town(s) exist and none has a centre, so there is nowhere to search.`,
      reason: 'no-centre',
    };
  }

  // Never compiled first, oldest-compiled after, slug as the tie-break.
  const sorted = [...placeable].sort((a, b) => {
    const ta = compiledAt(a);
    const tb = compiledAt(b);
    if (ta === null && tb !== null) return -1;
    if (tb === null && ta !== null) return 1;
    if (ta !== null && tb !== null && ta !== tb) return ta - tb;
    return String(a.slug).localeCompare(String(b.slug));
  });

  const chosen = sorted[0];
  const when = compiledAt(chosen);

  if (when === null) {
    return {
      town: chosen,
      why: `${chosen.name || chosen.slug} has never been compiled, so it holds no businesses.`,
    };
  }

  const days = (now - when) / 86_400_000;
  if (days < REFRESH_AFTER_DAYS) {
    return {
      town: null,
      why: `Every town was refreshed within the last ${REFRESH_AFTER_DAYS} days; `
        + `the next one due is ${chosen.name || chosen.slug}, in `
        + `${Math.max(1, Math.ceil(REFRESH_AFTER_DAYS - days))} day(s).`,
      reason: 'all-fresh',
    };
  }

  return {
    town: chosen,
    why: `${chosen.name || chosen.slug} was last compiled ${Math.floor(days)} days ago, `
      + `which is the longest of ${placeable.length} town(s).`,
  };
}

/**
 * What one refresh did, for somebody reading back over it.
 *
 * Eric's standing requirement is that anything running autonomously has a
 * place he can review. A run that reports "+412 listings" is a log; this is
 * what the Automation screen shows, so it has to carry the two things that are
 * actually decisions — what could not be categorised, and whether the town is
 * still invisible.
 */
export interface UpkeepRun {
  at: string;
  town: string | null;
  why: string;
  ok: boolean;
  created?: number;
  filled?: number;
  categorised?: number;
  uncategorised?: number;
  untouched?: number;
  truncated?: string[];
  /** 'hidden' means the listings this run wrote are not visible to anybody. */
  status?: string;
  error?: string;
  ms?: number;
}

/** A sentence for the screen, from a run record. */
export function describeRun(run: UpkeepRun | null | undefined): string {
  if (!run) return 'The Exchange refresh has never run.';
  if (!run.ok) return `Last run failed: ${run.error || 'no reason recorded'}.`;
  if (!run.town) return `Last tick did nothing: ${run.why}`;

  const parts = [
    `${run.created ?? 0} new`,
    `${run.filled ?? 0} filled in`,
    `${run.categorised ?? 0} categorised`,
  ];
  if (run.uncategorised) parts.push(`${run.uncategorised} still with no category`);
  let text = `${run.town}: ${parts.join(', ')}.`;
  if (run.truncated?.length) {
    text += ` Overpass capped ${run.truncated.join(', ')}, so that town is short by an unknown amount.`;
  }
  if (run.status === 'hidden') {
    text += ' The town is still hidden, so none of it is visible to residents.';
  }
  return text;
}
