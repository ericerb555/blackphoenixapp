/**
 * Phoenix Exchange — is this business still there?
 *
 * Eric: "we need to make sure these businesses are active and running."
 *
 * WHAT THE DIRECTORY COULD NOT SEE
 *
 * The ingest reports what it CREATED, what it FILLED, what it left
 * UNTOUCHED and what it could not categorise. Every one of those is about a
 * business that is present. Nothing has ever noticed a business that was in
 * last week's answer and is not in this week's — so a shop that closed in
 * 2024 is still in the directory, with a phone number that rings nobody, in
 * a territory sold to somebody as a live list of local trade.
 *
 * ABSENCE IS EVIDENCE, BUT IT IS WEAK EVIDENCE
 *
 * A business missing from one Overpass answer has not necessarily closed. It
 * may have been renamed, retagged, moved a hundred metres outside the search
 * radius, or dropped because the answer hit its limit. So a single miss
 * changes nothing visible: it is counted, and only a business missing from
 * several CONSECUTIVE complete runs is raised for a human to look at.
 *
 * NOTHING IS EVER DELETED, AND NOTHING IS EVER HIDDEN AUTOMATICALLY
 *
 * The strongest action this takes is setting a flag that puts a listing on a
 * review list. Removing a real business because OpenStreetMap had a quiet
 * week is a worse failure than leaving a closed one up: the closed listing
 * embarrasses us, the deleted one costs somebody their listing and we would
 * never know it happened.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * THE RULE THAT MATTERS MOST: A PARTIAL ANSWER PROVES NOTHING
 * ─────────────────────────────────────────────────────────────────────────
 *
 * Overpass truncates. `truncatedClasses` already detects it, because a class
 * that comes back at exactly its limit is a class that was cut off. On a
 * truncated run the businesses that did not appear are not absent — they are
 * past the cut.
 *
 * If a truncated run were allowed to count misses, one busy town would flag
 * half its own directory in a single tick, and the flags would look exactly
 * like real closures. So a run that is truncated, errored, or implausibly
 * empty counts NOTHING. The miss counters are left exactly as they were and
 * the run says why.
 *
 * NO IMPORTS, for the reason every rule file in this project has none: the
 * decision about whether somebody's listing gets flagged has to be testable
 * without a network or a database.
 */

/** How many consecutive complete runs a business must be absent from. */
export const MISSES_BEFORE_REVIEW = 3;

/**
 * The fewest results a run must return before its absences mean anything.
 *
 * A town that answers with two businesses when it held ninety last week has
 * not lost eighty-eight businesses; something went wrong upstream. Counting
 * that as evidence would flag almost the whole town at once.
 *
 * Expressed as a fraction of what we already hold rather than a flat number,
 * because a hamlet with four listings and a city with nine hundred cannot
 * share a threshold.
 */
export const MIN_COVERAGE_FRACTION = 0.5;

export interface ListingLiveness {
  id: string;
  /** 'listed' is unclaimed. Anything else means a person owns this row. */
  claim_state?: string | null;
  missing_runs?: number | null;
  missing_since?: string | null;
  needs_review?: boolean | null;
}

export interface RunQuality {
  /** True when absences from this run may be counted as evidence. */
  trustworthy: boolean;
  /** Why not, in words that belong in a run log. */
  why?: string;
}

/**
 * May this run's absences be believed?
 *
 * Three ways a run is disqualified, and each has been seen in the wild:
 * Overpass truncating a class at its limit, Overpass failing outright, and
 * Overpass answering with a fraction of what the town is known to hold.
 */
export function runQuality(input: {
  ok: boolean;
  truncated?: string[] | null;
  seenCount: number;
  heldCount: number;
}): RunQuality {
  if (!input?.ok) {
    return { trustworthy: false, why: 'The run did not complete, so nothing can be concluded from what is missing.' };
  }
  const truncated = Array.isArray(input.truncated) ? input.truncated.filter(Boolean) : [];
  if (truncated.length) {
    return {
      trustworthy: false,
      why: `The answer was cut off (${truncated.join(', ')}), so a business that did not appear may simply be past the cut.`,
    };
  }
  const held = Number(input.heldCount) || 0;
  const seen = Number(input.seenCount) || 0;
  if (held > 0 && seen < held * MIN_COVERAGE_FRACTION) {
    return {
      trustworthy: false,
      why: `Only ${seen} of ${held} known listings came back. That is too few to treat the rest as gone.`,
    };
  }
  return { trustworthy: true };
}

export interface LivenessUpdate {
  id: string;
  last_seen_at?: string | null;
  missing_runs?: number;
  missing_since?: string | null;
  needs_review?: boolean;
}

export interface LivenessPlan {
  /** Rows to write. Empty when the run proved nothing. */
  updates: LivenessUpdate[];
  seen: number;
  missing: number;
  /** Listings crossing the threshold on THIS run — the new review work. */
  flagged: number;
  /** Listings that were missing and have come back. */
  recovered: number;
  why?: string;
}

/**
 * What to write after a run, given who was seen and what we hold.
 *
 * A SEEN business is stamped and has any miss history cleared — a business
 * that reappears was never gone, and leaving a stale counter on it would
 * flag it on its next quiet week for no reason.
 *
 * A MISSING business has its counter advanced, and crosses into review only
 * when it reaches the threshold. `missing_since` records the FIRST miss, not
 * the latest, because the useful question a reviewer asks is how long it has
 * been gone.
 *
 * A CLAIMED listing is never flagged. Somebody owns that row, answers for
 * it, and a claimed business absent from OpenStreetMap is the most ordinary
 * thing in the world — most small firms are not on the map at all. Their
 * `last_seen_at` is still stamped when they do appear, because that is a
 * fact and costs nothing.
 */
export function planLiveness(input: {
  held: Array<ListingLiveness | null | undefined>;
  seenIds: Iterable<string>;
  quality: RunQuality;
  now?: string;
}): LivenessPlan {
  const now = input?.now || new Date().toISOString();
  const held = (input?.held || []).filter((l): l is ListingLiveness => Boolean(l && l.id));
  const seen = new Set(Array.from(input?.seenIds || [], (id) => String(id)));

  if (!input?.quality?.trustworthy) {
    return {
      updates: [],
      seen: held.filter((l) => seen.has(l.id)).length,
      missing: 0,
      flagged: 0,
      recovered: 0,
      why: input?.quality?.why || 'This run proved nothing about what is missing.',
    };
  }

  const updates: LivenessUpdate[] = [];
  let missing = 0;
  let flagged = 0;
  let recovered = 0;

  for (const listing of held) {
    const wasMissing = (Number(listing.missing_runs) || 0) > 0;

    if (seen.has(listing.id)) {
      // Stamped either way; the history is cleared only if there was one, so
      // an untouched listing is not rewritten on every single run.
      if (wasMissing || listing.needs_review) {
        recovered += 1;
        updates.push({
          id: listing.id,
          last_seen_at: now,
          missing_runs: 0,
          missing_since: null,
          needs_review: false,
        });
      } else {
        updates.push({ id: listing.id, last_seen_at: now });
      }
      continue;
    }

    missing += 1;
    const claimed = String(listing.claim_state || 'listed') !== 'listed';
    if (claimed) {
      // Counted as missing for the summary, never acted on. See the note
      // above: most small firms are not on OpenStreetMap at all.
      continue;
    }

    const runs = (Number(listing.missing_runs) || 0) + 1;
    const crosses = runs >= MISSES_BEFORE_REVIEW && !listing.needs_review;
    if (crosses) flagged += 1;
    updates.push({
      id: listing.id,
      missing_runs: runs,
      // The FIRST miss, so a reviewer can see how long it has been gone.
      missing_since: listing.missing_since || now,
      needs_review: runs >= MISSES_BEFORE_REVIEW,
    });
  }

  return { updates, seen: held.length - missing, missing, flagged, recovered };
}

/** A sentence for the run log. */
export function describeLiveness(plan: LivenessPlan): string {
  if (!plan) return '';
  if (plan.why) return plan.why;
  const bits: string[] = [];
  if (plan.missing) bits.push(`${plan.missing} not seen`);
  if (plan.flagged) bits.push(`${plan.flagged} now up for review`);
  if (plan.recovered) bits.push(`${plan.recovered} back after being missed`);
  return bits.length ? bits.join(', ') + '.' : 'Every listing was still there.';
}
