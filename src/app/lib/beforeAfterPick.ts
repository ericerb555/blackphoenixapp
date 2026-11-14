/**
 * Choosing which photograph is the before and which is the after.
 *
 * WHAT THE MODEL IS AND IS NOT ALLOWED TO DO
 *
 * It picks from photographs it was shown, by position, and nothing else. It
 * never supplies a URL, never names a file, and never decides that a pair is
 * good enough to publish. `readPick` turns its answer into two indices into
 * the exact array that was sent, and anything that is not a valid index into
 * that array is thrown away whole.
 *
 * This is the same shape as `keepKnownIds` in the Exchange assistant, and for
 * the same reason: the cheapest way to stop a model inventing a thing is to
 * make the thing unsayable. An index can only ever point at a photograph that
 * was already chosen for it.
 *
 * WHY AN OUT-OF-RANGE ANSWER IS REJECTED RATHER THAN CLAMPED
 *
 * Clamping looks tidy and is the worse bug. If the model says "photo 9" of
 * eight, clamping to 7 produces a confident pick of a photograph the model
 * never considered, with the model's own reasoning printed underneath it —
 * an explanation of a choice nothing made. Rejecting leaves the person to
 * choose, which is what they would have done anyway.
 *
 * WHY THERE IS A FREE ANSWER TOO
 *
 * `guessPair` orders by when the photographs were taken: the earliest is the
 * before, the latest is the after. It is right most of the time, costs
 * nothing, and runs instantly — so it is what fills the slots while the model
 * is still thinking, and what remains when the model declines or the kill
 * switch is down.
 *
 * AND WHY NEITHER ONE PUBLISHES ANYTHING
 *
 * A model cannot reliably tell a finished room from a tidy mid-job one, and
 * the cost of being wrong is asymmetric: a before-and-after is the one piece
 * of marketing a customer can check against their own memory of the room. So
 * both of these PROPOSE. The person exporting is the one who decides.
 */

export interface PickablePhoto {
  id?: string;
  createdAt?: string;
  title?: string;
}

export interface Pick {
  before: number;
  after: number;
  /** The model's own words, short, for showing beside the proposal. */
  why: string;
  /** True when the model was asked and would not commit. */
  unsure: boolean;
}

/** How many photographs are worth sending. Every one costs tokens. */
export const MAX_CANDIDATES = 8;

const when = (p: PickablePhoto | null | undefined): number => {
  const t = Date.parse(String(p?.createdAt ?? ''));
  return Number.isFinite(t) ? t : Number.NaN;
};

/**
 * The photographs to offer, oldest first.
 *
 * Capped, because every image sent is billed and a job with sixty progress
 * photos would cost sixty photographs' worth of tokens to answer a question
 * about two of them. The cap keeps the ends: the earliest few and the latest
 * few are where a before and an after actually live, and the middle of a job
 * is the part that is neither.
 */
export function candidatesFor(
  photos: readonly PickablePhoto[] | null | undefined,
  limit = MAX_CANDIDATES,
): PickablePhoto[] {
  const all = (photos ?? []).filter(Boolean) as PickablePhoto[];
  const cap = Math.max(2, Math.floor(limit));

  // A stable order first: dated photos by date, undated ones left where they
  // were. Sorting undated rows against NaN would shuffle them arbitrarily.
  const dated = all.filter((p) => Number.isFinite(when(p)));
  const undated = all.filter((p) => !Number.isFinite(when(p)));
  dated.sort((a, b) => when(a) - when(b));
  const ordered = [...dated, ...undated];

  if (ordered.length <= cap) return ordered;

  // Keep both ends. The middle of a job is neither a before nor an after.
  const head = Math.ceil(cap / 2);
  const tail = cap - head;
  return [...ordered.slice(0, head), ...ordered.slice(ordered.length - tail)];
}

/**
 * The free answer: earliest is the before, latest is the after.
 *
 * Indices are into the array passed in, so a caller can use it directly
 * against the same list it would send to the model. Null when there are not
 * two photographs, because there is no pair to propose.
 */
export function guessPair(
  photos: readonly PickablePhoto[] | null | undefined,
): Pick | null {
  const all = (photos ?? []).filter(Boolean) as PickablePhoto[];
  if (all.length < 2) return null;

  let oldest = 0;
  let newest = 0;
  let haveDates = false;

  for (let i = 0; i < all.length; i += 1) {
    const t = when(all[i]);
    if (!Number.isFinite(t)) continue;
    if (!haveDates) { oldest = i; newest = i; haveDates = true; continue; }
    if (t < when(all[oldest])) oldest = i;
    if (t > when(all[newest])) newest = i;
  }

  // With no dates at all, position is the only ordering there is.
  if (!haveDates) {
    return {
      before: 0,
      after: all.length - 1,
      why: 'First and last in the list — these photos carry no date.',
      unsure: true,
    };
  }

  // Every photo sharing one timestamp gives no ordering to work from.
  if (oldest === newest) return null;

  return {
    before: oldest,
    after: newest,
    why: 'Earliest and latest photographs of this job.',
    unsure: false,
  };
}

/**
 * The model's answer, or null.
 *
 * `count` is the length of the array that was actually sent. Every rule here
 * exists because the alternative is a confident pick of something nobody
 * chose:
 *
 *   not an object            nothing was answered
 *   an index outside [0,n)   it is pointing at a photograph that was not sent
 *   before === after         one photograph is not a before and an after
 *   `unsure` true            it looked and would not commit, which is an
 *                            answer worth keeping and not worth applying
 */
export function readPick(raw: unknown, count: number): Pick | null {
  const n = Math.floor(Number(count));
  if (!Number.isFinite(n) || n < 2) return null;

  let data: any = raw;
  if (typeof data === 'string') {
    try { data = JSON.parse(data); } catch { return null; }
  }
  if (!data || typeof data !== 'object' || Array.isArray(data)) return null;

  const index = (v: unknown): number | null => {
    const i = Number(v);
    // Integers only: 2.5 is not a photograph, and rounding it would be the
    // same silent substitution as clamping.
    if (!Number.isFinite(i) || !Number.isInteger(i)) return null;
    return i >= 0 && i < n ? i : null;
  };

  const before = index(data.before);
  const after = index(data.after);
  const unsure = data.unsure === true;
  const why = String(data.why ?? '').trim().slice(0, 240);

  // An honest refusal is a result. It carries no pair, so the caller shows
  // the reason and leaves the slots alone.
  if (unsure) {
    return { before: -1, after: -1, why: why || 'Not sure enough to choose.', unsure: true };
  }

  if (before === null || after === null) return null;
  if (before === after) return null;

  return { before, after, why, unsure: false };
}

/** Is this a pair a caller can actually apply? */
export function isApplicable(pick: Pick | null | undefined): boolean {
  return Boolean(pick && !pick.unsure && pick.before >= 0 && pick.after >= 0
    && pick.before !== pick.after);
}
