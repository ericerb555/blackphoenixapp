/**
 * priceWatchRules.ts — when a price should move, by how much, and why.
 *
 * WHAT ERIC ASKED FOR
 *
 * > "corhort system should run it all and increase and decrease if nessasary.
 * > ai assistant should be watching of of this and ping the owner and admin if
 * > somehting needs to be changed and why."
 *
 * The last two words are the deliverable. A watcher that says "raise the vendor
 * Advanced rung to $128" is useless; one that says "raise it because 9 of 11
 * trials on it converted and the band has been full for two months" is a
 * decision somebody can make in ten seconds. So every proposal here carries the
 * number that triggered it and what the change is expected to do.
 *
 * WHY THE RULES ARE SEPARATE FROM THE JOB
 *
 * Everything in this file is pure. It reads no records, calls no network, and
 * knows nothing about KV — which is what lets it be tested, and these are rules
 * about money that fail quietly. A watcher that proposes a 40% rise because a
 * divisor was zero does not throw; it writes a confident sentence into the place
 * a person looks and waits to be approved.
 *
 * NOTHING HERE CHANGES A PRICE
 *
 * A proposal is a question raised on the ask channel that already exists
 * (`askForGuidance`), answered by the owner or an administrator. Automatic
 * movement is not switched on and this file could not do it: it returns
 * sentences, not writes. Whether the watcher may ever move a price by itself is
 * question 3 in section 15 of `tasks/price-ladders.md`, and it is Eric's.
 */

/** The guardrails from section 12 of tasks/price-ladders.md. */
export interface Guardrails {
  /** Largest single move, as a fraction. 0.10 is ten percent. */
  maxMoveFraction: number;
  /** Days that must pass since the last change to this price. */
  minDaysBetweenChanges: number;
  /** Nothing may be proposed below this, in cents. The labour floor. */
  floorCents: number;
  /** Nor above this, in cents. Absent means no ceiling. */
  ceilingCents?: number;
}

export const DEFAULT_GUARDRAILS: Guardrails = {
  maxMoveFraction: 0.10,
  minDaysBetweenChanges: 90,
  floorCents: 0,
};

/** What the watcher is given about one priced thing. */
export interface PriceSignals {
  /** `plan_tier:vendor:advanced` or similar — identifies what would move. */
  id: string;
  audience: string;
  rung: string;
  priceCents: number;
  /** When this price last changed. Absent means it has never moved. */
  lastChangedAt?: string | null;
  /** Floor for anything with labour in it: the employee bill rate times hours. */
  labourFloorCents?: number;

  /** Territory capacity, when the audience has it. */
  spotsTotal?: number;
  spotsTaken?: number;
  /** Months the capacity has been unchanged, for the "empty for a quarter" rule. */
  monthsAtCurrentCapacity?: number;

  /** Trials that reached their end on this rung, and how many converted. */
  trialsEnded?: number;
  trialsConverted?: number;

  /** Subscribers on this rung, and how many cancelled in the last month. */
  subscribers?: number;
  cancelledLastMonth?: number;

  /** Add-on attach: how many of those subscribers took the add-on offered. */
  addOnOffered?: number;
  addOnTaken?: number;
}

export type ProposalKind =
  | 'raise-capacity'
  | 'lower-capacity'
  | 'raise-trial-conversion'
  | 'lower-trial-conversion'
  | 'lower-churn'
  | 'raise-labour-floor'
  | 'review-attach-rate';

export interface Proposal {
  kind: ProposalKind;
  id: string;
  audience: string;
  rung: string;
  fromCents: number;
  /** Null for a proposal that is a question rather than a number. */
  toCents: number | null;
  /** The figure that triggered it, in words. */
  because: string;
  /** What the change is expected to do. */
  expect: string;
}

/**
 * The smallest sample worth acting on.
 *
 * Two trials converting out of two is not a signal, it is a coincidence, and a
 * price moved on it would be moved back next month. Every rule below that
 * divides by a count checks this first — a ratio from a denominator of one is
 * the classic way a watcher like this starts confidently talking nonsense.
 */
export const MIN_SAMPLE = 8;

const whole = (v: unknown) => {
  const n = Math.floor(Number(v));
  return Number.isFinite(n) && n >= 0 ? n : 0;
};

/** Days since an ISO timestamp, or null when it is missing or unreadable. */
export function daysSince(iso: string | null | undefined, now = Date.now()): number | null {
  const t = Date.parse(String(iso || ''));
  if (!Number.isFinite(t)) return null;
  return Math.floor((now - t) / 86400000);
}

/**
 * May this price be moved at all right now?
 *
 * Separate from deciding which way to move it, because "not yet" is the answer
 * most of the time and the reason matters: a price held back by the interval is
 * a different situation from one at its floor.
 */
export function moveIsAllowed(
  signals: PriceSignals,
  rails: Guardrails = DEFAULT_GUARDRAILS,
  now = Date.now(),
): { ok: boolean; reason?: string } {
  if (!(Number(signals.priceCents) > 0)) {
    return { ok: false, reason: 'this rung has no price yet, so there is nothing to move' };
  }
  const age = daysSince(signals.lastChangedAt, now);
  if (age !== null && age < rails.minDaysBetweenChanges) {
    return {
      ok: false,
      reason: `it changed ${age} day${age === 1 ? '' : 's'} ago and prices wait ${rails.minDaysBetweenChanges} days between changes`,
    };
  }
  return { ok: true };
}

/**
 * Apply the move cap and the floor and ceiling to a wanted price.
 *
 * Clamps rather than refuses. A rule wanting a 25% rise should still produce a
 * 10% one — the direction is the useful part of the judgement and the size is
 * what the guardrail is for. Returns null only when the clamp leaves nothing to
 * propose, which is how "already at the ceiling" comes back as silence instead
 * of as a proposal to change a price to itself.
 */
export function clampMove(
  fromCents: number,
  wantedCents: number,
  rails: Guardrails = DEFAULT_GUARDRAILS,
): number | null {
  const from = Math.max(0, Math.round(Number(fromCents) || 0));
  if (!from) return null;

  const span = Math.max(1, Math.round(from * rails.maxMoveFraction));
  let to = Math.max(from - span, Math.min(from + span, Math.round(Number(wantedCents) || 0)));

  const floor = Math.max(0, Math.round(Number(rails.floorCents) || 0));
  if (to < floor) to = floor;
  const ceiling = Math.round(Number(rails.ceilingCents) || 0);
  if (ceiling > 0 && to > ceiling) to = ceiling;

  return to === from ? null : to;
}

const pct = (n: number, d: number) => Math.round((n / d) * 100);

/**
 * Everything worth saying about one priced rung.
 *
 * Returns an empty list most of the time, which is the normal and correct
 * answer. A watcher that always finds something is a watcher nobody reads.
 */
export function proposalsFor(
  signals: PriceSignals,
  rails: Guardrails = DEFAULT_GUARDRAILS,
  now = Date.now(),
): Proposal[] {
  const out: Proposal[] = [];
  const base = {
    id: String(signals.id || ''),
    audience: String(signals.audience || ''),
    rung: String(signals.rung || ''),
    fromCents: Math.round(Number(signals.priceCents) || 0),
  };

  /**
   * The labour floor is checked FIRST and ignores the interval.
   *
   * Every other rule here is an optimisation and can wait ninety days. A price
   * below what the work costs to deliver loses money on every job sold at it,
   * and `employees-have-a-pay-rate-and-a-bill-rate` is why that figure is
   * knowable. So this one is raised whenever it is true.
   */
  const labourFloor = Math.round(Number(signals.labourFloorCents) || 0);
  if (labourFloor > 0 && base.fromCents > 0 && base.fromCents < labourFloor) {
    out.push({
      ...base,
      kind: 'raise-labour-floor',
      toCents: labourFloor,
      because: `it is priced at $${(base.fromCents / 100).toFixed(2)} and the labour in it bills at $${(labourFloor / 100).toFixed(2)}`,
      expect: 'every sale at this price loses the difference, so this stops a loss rather than chasing a gain',
    });
    // Nothing else is worth proposing about a rung that is underwater.
    return out;
  }

  const allowed = moveIsAllowed(signals, rails, now);
  if (!allowed.ok) return out;

  /* Capacity — a full territory is the clearest signal there is. */
  const total = whole(signals.spotsTotal);
  const taken = whole(signals.spotsTaken);
  if (total > 0) {
    const fullness = taken / total;
    if (fullness >= 0.9) {
      const to = clampMove(base.fromCents, Math.round(base.fromCents * 1.10), rails);
      if (to) {
        out.push({
          ...base,
          kind: 'raise-capacity',
          toCents: to,
          because: `${taken} of ${total} places are taken (${pct(taken, total)}%)`,
          expect: 'the last places are the scarcest thing being sold, and this prices them as such',
        });
      }
    } else if (taken === 0 && whole(signals.monthsAtCurrentCapacity) >= 3) {
      const to = clampMove(base.fromCents, Math.round(base.fromCents * 0.90), rails);
      if (to) {
        out.push({
          ...base,
          kind: 'lower-capacity',
          toCents: to,
          because: `none of the ${total} places has sold in ${whole(signals.monthsAtCurrentCapacity)} months`,
          expect: 'an empty band earns nothing, so a lower price costs nothing to try',
        });
      }
    }
  }

  /* Trial conversion — the rung above a trial is where a ladder is tested. */
  const trials = whole(signals.trialsEnded);
  if (trials >= MIN_SAMPLE) {
    const converted = Math.min(trials, whole(signals.trialsConverted));
    const rate = converted / trials;
    if (rate <= 0.25) {
      const to = clampMove(base.fromCents, Math.round(base.fromCents * 0.90), rails);
      if (to) {
        out.push({
          ...base,
          kind: 'lower-trial-conversion',
          toCents: to,
          because: `${converted} of ${trials} trials converted (${pct(converted, trials)}%)`,
          expect: 'people who used the product and then declined the price are the clearest evidence it is too high',
        });
      }
    } else if (rate >= 0.8) {
      const to = clampMove(base.fromCents, Math.round(base.fromCents * 1.10), rails);
      if (to) {
        out.push({
          ...base,
          kind: 'raise-trial-conversion',
          toCents: to,
          because: `${converted} of ${trials} trials converted (${pct(converted, trials)}%)`,
          expect: 'almost nobody is refusing at this price, which usually means there is room above it',
        });
      }
    }
  }

  /* Churn — people leaving a rung they already bought. */
  const subscribers = whole(signals.subscribers);
  if (subscribers >= MIN_SAMPLE) {
    const lost = Math.min(subscribers, whole(signals.cancelledLastMonth));
    if (lost / subscribers >= 0.1) {
      const to = clampMove(base.fromCents, Math.round(base.fromCents * 0.90), rails);
      if (to) {
        out.push({
          ...base,
          kind: 'lower-churn',
          toCents: to,
          because: `${lost} of ${subscribers} subscribers cancelled last month (${pct(lost, subscribers)}%)`,
          expect: 'churn at this rate costs more than the price difference, and a cancelled account stops paying entirely',
        });
      }
    }
  }

  /* Attach rate — a question rather than a number, because the answer may be
     that the add-on is wrong rather than that its price is. */
  const offered = whole(signals.addOnOffered);
  if (offered >= MIN_SAMPLE) {
    const takenUp = Math.min(offered, whole(signals.addOnTaken));
    if (takenUp === 0) {
      out.push({
        ...base,
        kind: 'review-attach-rate',
        toCents: null,
        because: `none of the ${offered} subscribers offered it has taken it`,
        expect: 'either the price is wrong or the add-on is, and the price cannot be the answer to both',
      });
    }
  }

  return out;
}

/** One line a person reads in the heartbeat. */
export function summarise(proposals: Proposal[]): string {
  if (proposals.length === 0) return 'nothing to propose';
  const moves = proposals.filter((p) => p.toCents !== null).length;
  const questions = proposals.length - moves;
  const parts: string[] = [];
  if (moves) parts.push(`${moves} price change${moves === 1 ? '' : 's'} proposed`);
  if (questions) parts.push(`${questions} question${questions === 1 ? '' : 's'}`);
  return parts.join(', ');
}
