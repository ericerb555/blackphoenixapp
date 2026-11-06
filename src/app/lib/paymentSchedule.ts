/**
 * The payment schedule: a deposit, then one draw per phase of the work.
 *
 * Eric: "the invoices should be built off the payment schedule."
 *
 * WHAT WAS THERE BEFORE: NOTHING REAL
 *
 * `paymentSchedule` appeared in five browser files and zero server ones. The
 * only places that ever WROTE one were the seed-data fixtures, so the
 * schedule panels in `ProjectDetailsModal` and `FinancialDataSheet` rendered
 * for demo projects and were empty for every real job. The only genuine
 * figures in the system were `DEPOSIT_RATE` and `splitPayment` — a deposit
 * and a balance, computed at approval time and never stored anywhere.
 *
 * An earlier pass had already deleted a hardcoded 30/25/25/20 schedule whose
 * milestones described somebody else's kitchen. This is the replacement: a
 * schedule generated from figures the quote actually contains.
 *
 * WHY PER PHASE
 *
 * The quote has phases with real subtotals, so a draw can be defended —
 * "Structural, on completion, $4,390" is a number the customer can check
 * against work they can see. A percentage schedule bills 25% on a date, which
 * is the thing customers dispute, because nothing about it refers to the job.
 *
 * THE ONE RULE THAT CANNOT BEND
 *
 * THE DRAWS MUST SUM TO THE CONTRACT TOTAL. Exactly, not within a penny. A
 * schedule summing to $21,371.54 against a $21,371.55 contract is one the
 * customer finds, and finding it costs more trust than the cent is worth.
 *
 * So the arithmetic is done in integer cents and the proportional split uses
 * largest-remainder: every share is floored, then the leftover cents are
 * handed out one each to the phases with the largest discarded fractions.
 * Rounding each phase independently cannot do this — three phases rounded to
 * the nearest cent can miss the total by two.
 *
 * NO RETENTION. Asked and declined, so nothing is held back and the draws
 * account for the whole contract. If that changes it changes here, and the
 * sum-to-total test is what will catch the first mistake.
 */

export type DrawType = 'deposit' | 'phase' | 'balance';

export interface Draw {
  id: string;
  type: DrawType;
  /** The phase this draw bills, or null for the deposit and the fallback. */
  phase: string | null;
  label: string;
  /** What raising this draw invoices for. */
  amount: number;
  /**
   * This phase's full share of the contract, before the deposit is credited.
   * Shown so the customer can watch the deposit being worked off, rather than
   * wondering why a phase bills less than the quote said it was worth.
   */
  phaseValue?: number;
  /** The slice of the deposit credited against this phase. */
  depositCredit?: number;
  /** What has to have happened before this is raised. */
  trigger: string;
  status: 'pending' | 'invoiced' | 'paid';
}

export interface SchedulePhase {
  title: string;
  /** The phase's pre-tax subtotal, as the quote computed it. */
  subtotal: number;
}

export interface ScheduleOptions {
  phases: SchedulePhase[];
  /** The contract grand total, tax included — what the customer pays. */
  total: number;
  /** 0.30 for a 30% deposit. Zero is allowed and skips the deposit draw. */
  depositRate: number;
}

const toCents = (n: number) => Math.round((Number(n) || 0) * 100);
const toMoney = (cents: number) => Math.round(cents) / 100;

/**
 * Split `totalCents` across `weights` so the parts sum to it exactly.
 *
 * Largest-remainder. Floor every share, then give the undistributed cents to
 * the entries whose discarded fraction was biggest. Ties go to the earlier
 * phase, which keeps the result stable instead of depending on sort order.
 *
 * With all-zero weights the money cannot be apportioned by value, so it is
 * spread as evenly as possible — a zero-value phase list is degenerate, and
 * dropping the money entirely would be worse than distributing it arbitrarily.
 */
export function allocate(totalCents: number, weights: number[]): number[] {
  const n = weights.length;
  if (!n) return [];

  const safe = weights.map((w) => (Number.isFinite(w) ? w : 0));
  const sum = safe.reduce((a, b) => a + b, 0);

  if (sum <= 0) {
    const base = Math.trunc(totalCents / n);
    const out = new Array(n).fill(base);
    let left = totalCents - base * n;
    // `left` carries the sign of the total, so a negative remainder walks down.
    const step = left < 0 ? -1 : 1;
    for (let i = 0; left !== 0; i = (i + 1) % n) { out[i] += step; left -= step; }
    return out;
  }

  const exact = safe.map((w) => (totalCents * w) / sum);
  const floored = exact.map((v) => Math.floor(v));
  let remainder = totalCents - floored.reduce((a, b) => a + b, 0);

  const order = exact
    .map((v, i) => ({ i, frac: v - Math.floor(v) }))
    .sort((a, b) => (b.frac - a.frac) || (a.i - b.i));

  for (let k = 0; remainder > 0 && k < order.length; k++, remainder--) {
    floored[order[k].i] += 1;
  }
  // A negative total floors away from zero, so the correction runs the other way.
  for (let k = 0; remainder < 0 && k < order.length; k++, remainder++) {
    floored[order[order.length - 1 - k].i] -= 1;
  }
  return floored;
}

/**
 * Build the schedule.
 *
 * Phases are weighted by their pre-tax subtotals, but the money apportioned
 * is the TAX-INCLUSIVE total, so each draw carries its own share of the tax
 * and nobody is sent a separate tax invoice at the end of the job.
 */
export function buildPaymentSchedule(options: ScheduleOptions): Draw[] {
  const { phases, total, depositRate } = options;

  const totalCents = toCents(total);
  const rate = Number.isFinite(depositRate) ? Math.min(Math.max(depositRate, 0), 1) : 0;
  const depositCents = Math.round(totalCents * rate);

  const real = (Array.isArray(phases) ? phases : []).filter(
    (p) => String(p?.title || '').trim(),
  );

  const draws: Draw[] = [];

  if (depositCents !== 0) {
    draws.push({
      id: 'deposit',
      type: 'deposit',
      phase: null,
      label: `Deposit — ${Math.round(rate * 100)}%`,
      amount: toMoney(depositCents),
      trigger: 'On acceptance of the quote',
      status: 'pending',
    });
  }

  const remainingCents = totalCents - depositCents;

  /**
   * No phases is normal — an old quote, or a job priced as a single number.
   * It still needs a schedule, so it gets the balance as one draw rather than
   * a deposit that leaves the rest of the contract unaccounted for.
   */
  if (!real.length) {
    if (remainingCents !== 0 || !draws.length) {
      draws.push({
        id: 'balance',
        type: 'balance',
        phase: null,
        label: 'Balance',
        amount: toMoney(remainingCents),
        trigger: 'On completion of the work',
        status: 'pending',
      });
    }
    return draws;
  }

  const weights = real.map((p) => Number(p.subtotal) || 0);
  const drawCents = allocate(remainingCents, weights);
  /**
   * The gross value of each phase, apportioned the same way, so that
   * `phaseValue - depositCredit === amount` for every phase with no rounding
   * gap. Deriving the credit instead of allocating it twice is what keeps
   * those three figures consistent on the document.
   */
  const valueCents = allocate(totalCents, weights);

  real.forEach((phase, i) => {
    const title = String(phase.title).trim();
    draws.push({
      id: `phase:${title}`,
      type: 'phase',
      phase: title,
      label: title,
      amount: toMoney(drawCents[i]),
      phaseValue: toMoney(valueCents[i]),
      depositCredit: toMoney(valueCents[i] - drawCents[i]),
      trigger: `On completion of ${title.toLowerCase()}`,
      status: 'pending',
    });
  });

  return draws;
}

/** What the schedule bills in total. Must equal the contract total. */
export const scheduleTotal = (draws: Draw[]): number =>
  toMoney((Array.isArray(draws) ? draws : []).reduce((sum, d) => sum + toCents(d?.amount), 0));

/** What is still to be raised. */
export const scheduleOutstanding = (draws: Draw[]): number =>
  toMoney(
    (Array.isArray(draws) ? draws : [])
      .filter((d) => d?.status === 'pending')
      .reduce((sum, d) => sum + toCents(d?.amount), 0),
  );

/**
 * The least deposit this company takes.
 *
 * Eric: "lets make the deposit a minimum of 30%." A floor, not a default —
 * materials get bought and a crew gets booked before a penny of progress is
 * billable, and a job that starts on less than this is financed by us.
 */
export const DEPOSIT_MINIMUM = 0.30;

/**
 * Fewer payments than phases, by merging phases into consecutive groups.
 *
 * "please allow me pick how many payments and the breakdown in which the
 * payments are due."
 *
 * A draw per phase is right for a job priced that way and far too many
 * invoices for a kitchen with seven stages. This merges neighbouring phases
 * until there are `count` of them, so three payments across seven phases
 * become three progress payments, each covering the stretch of work up to a
 * milestone.
 *
 * ORDER IS NEVER BROKEN. Groups are consecutive runs of the job's own
 * sequence, so a payment always covers work that happens together. Merging
 * Framing with Snagging because their values happen to balance would
 * produce a draw nobody could explain.
 *
 * EACH GROUP IS NAMED FOR ITS LAST PHASE, which is the one whose completion
 * releases the money. A draw reading "On completion of Second fix" worth
 * everything up to and including second fix is exactly how a progress
 * payment works, and it keeps the title matching a real process step — so
 * marking that step complete still makes the draw due.
 *
 * The split targets equal VALUE rather than an equal number of phases.
 * Three payments should be roughly a third of the money each; a grouping
 * that put six cheap phases in one payment and one expensive phase in
 * another would be even in phases and useless in cash flow.
 *
 * No money is computed here — only which phases travel together. The
 * amounts still come from `buildPaymentSchedule`, so the sum-to-the-contract
 * guarantee and its four thousand randomised contracts cover this too.
 */
export function groupPhasesInto(phases: SchedulePhase[], count: number): SchedulePhase[] {
  const list = Array.isArray(phases) ? phases.filter((p) => p && p.title) : [];
  const want = Math.max(1, Math.floor(Number(count) || 0));
  if (!list.length) return [];
  if (want >= list.length) return list;

  const totalCents = list.reduce((sum, p) => sum + toCents(p.subtotal), 0);
  const groups: SchedulePhase[] = [];

  let i = 0;
  let runningCents = 0;
  for (let g = 0; g < want; g++) {
    const remainingGroups = want - g;
    // Always leave at least one phase for every group still to come, or the
    // last groups come out empty and the job loses a milestone.
    const maxIndex = list.length - (remainingGroups - 1);
    // Where this group should end if the money were split perfectly evenly.
    const targetCents = Math.round((totalCents * (g + 1)) / want);

    const start = i;
    let cents = 0;
    // Always take at least one phase.
    do {
      cents += toCents(list[i].subtotal);
      i++;
    } while (
      i < maxIndex
      && runningCents + cents < targetCents
    );
    runningCents += cents;

    const members = list.slice(start, i);
    groups.push({
      // The milestone that releases the payment: the last phase in the run.
      title: members[members.length - 1].title,
      subtotal: toMoney(members.reduce((sum, p) => sum + toCents(p.subtotal), 0)),
    });
  }

  return groups;
}
