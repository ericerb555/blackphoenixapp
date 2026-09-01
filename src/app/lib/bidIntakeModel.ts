/**
 * Reading a subcontractor's quote and putting it against ours.
 *
 * WHY THIS IS NOT A FORM THEY FILL IN
 *
 * Because they will not fill it in. A subcontractor sends a PDF on his own
 * letterhead, or a photograph of something handwritten from the van, and any
 * system that requires otherwise gets routed around by email — at which point
 * the numbers live in an inbox and the scope is out of date and lying.
 *
 * So the system reads what they actually send. The standard form exists for the
 * ones who will use it; the reader exists for everyone else.
 *
 * THE RULE THAT MATTERS MOST
 *
 * A reading is proposed, never applied. An AI parsing a supplier's PDF and
 * silently writing money into a customer quote is exactly the wrong shape — the
 * failure mode is a wrong number that nobody typed and nobody checked, sitting
 * in front of a customer with your name on it. So every mapping arrives as a
 * suggestion with a confidence and has to be accepted.
 *
 * AND THE SECOND RULE
 *
 * Say what did not match. Both directions. A line on their quote that fits
 * nothing of ours might be work we forgot to scope; one of our lines with
 * nothing against it might be work they have not priced. Both are worth knowing
 * before the total is believed, and both vanish if the reader only reports what
 * it managed to match.
 */

/** A line as it appears on the subcontractor's own document. */
export interface TheirLine {
  /** Their wording, kept verbatim — it is what they will argue from later. */
  description: string;
  amount: number;
  qty?: number;
  unit?: string;
  /** 0–1, how sure the reader is it read this line correctly. */
  readConfidence: number;
}

/** One of our scope lines, as far as this matching cares. */
export interface OurLine {
  id: string;
  description: string;
  trade: string;
  phase: string;
  bidOut?: boolean;
}

export interface ProposedMatch {
  ourLineId: string;
  ourDescription: string;
  theirIndex: number;
  theirDescription: string;
  amount: number;
  /** 0–1. Below `REVIEW_BELOW` it is shown but never pre-ticked. */
  confidence: number;
  why: string;
}

export interface BidReading {
  /** Who sent it, as read off the document. */
  vendor: string;
  /** Their total, as printed — not the sum of the lines. */
  statedTotal: number | null;
  lines: TheirLine[];
  matches: ProposedMatch[];
  /** Their lines that matched nothing of ours. */
  unmatchedTheirs: number[];
  /** Our lines nothing was priced against. */
  unmatchedOurs: string[];
  notes: string[];
}

/**
 * Anything under this is shown but not pre-selected.
 *
 * A match somebody has to look at is useful. A match that ticks itself and is
 * wrong is worse than no reader at all.
 */
export const REVIEW_BELOW = 0.7;

const round2 = (n: number) => Math.round((Number(n) || 0) * 100) / 100;

/** Sum of the lines, which is not always what the document says at the bottom. */
export function sumOfLines(lines: TheirLine[]): number {
  return round2(lines.reduce((n, l) => n + (Number(l.amount) || 0), 0));
}

/**
 * Does the arithmetic on their own document add up?
 *
 * Worth checking before anything else. A stated total that does not match the
 * lines means either the reader misread a line or their quote has a mistake in
 * it, and both are things to resolve with a phone call rather than absorb.
 */
export function totalDisagreement(r: BidReading): number | null {
  if (r.statedTotal === null) return null;
  const diff = round2(r.statedTotal - sumOfLines(r.lines));
  return Math.abs(diff) < 0.02 ? null : diff;
}

/** The matches worth ticking by default. */
export function confidentMatches(r: BidReading): ProposedMatch[] {
  return r.matches.filter(m => m.confidence >= REVIEW_BELOW);
}

/**
 * Apply the accepted matches to our scope lines.
 *
 * Returns the amounts to write, keyed by our line id. Several of their lines
 * may land on one of ours — a plumber itemising the rough and the trim against
 * a single "rough plumbing" line of ours is normal — so amounts add rather than
 * overwrite.
 */
export function amountsFor(matches: ProposedMatch[], acceptedIds: Set<string>): Record<string, number> {
  const out: Record<string, number> = {};
  for (const m of matches) {
    const key = `${m.ourLineId}:${m.theirIndex}`;
    if (!acceptedIds.has(key)) continue;
    out[m.ourLineId] = round2((out[m.ourLineId] || 0) + m.amount);
  }
  return out;
}

/** A stable key for one proposed match, so acceptance survives a re-render. */
export function matchKey(m: ProposedMatch): string {
  return `${m.ourLineId}:${m.theirIndex}`;
}

/**
 * What the reading is worth, in one sentence.
 *
 * Leads with whatever most threatens the number, because that is the thing
 * somebody about to accept it needs to know first.
 */
export function readingNote(r: BidReading): string {
  if (!r.lines.length) return 'Nothing readable was found in that. Enter it by hand.';

  const disagreement = totalDisagreement(r);
  if (disagreement !== null) {
    return `Their total and their own lines differ by $${Math.abs(disagreement).toFixed(2)}. `
      + 'Either a line was misread or their quote has a mistake — worth a call before this is used.';
  }

  const shaky = r.matches.filter(m => m.confidence < REVIEW_BELOW).length;
  const parts: string[] = [];
  if (r.unmatchedTheirs.length) {
    parts.push(`${r.unmatchedTheirs.length} of their lines match nothing in our scope — possibly work we missed`);
  }
  if (r.unmatchedOurs.length) {
    parts.push(`${r.unmatchedOurs.length} of our lines have nothing priced against them`);
  }
  if (shaky) parts.push(`${shaky} match${shaky === 1 ? '' : 'es'} the reader is unsure about`);

  if (!parts.length) {
    return `Every line matched, and their total agrees with their lines. Still worth a glance before accepting.`;
  }
  return parts.join('. ') + '.';
}

/**
 * A blank reading, for the case where nothing could be extracted.
 *
 * Returned rather than throwing, so a bad scan degrades to typing it in rather
 * than to an error message.
 */
export const EMPTY_READING: BidReading = {
  vendor: '', statedTotal: null, lines: [], matches: [],
  unmatchedTheirs: [], unmatchedOurs: [], notes: [],
};
