/**
 * Every job makes rubbish, so every quote carries the cost of taking it away.
 *
 * Eric: "can we please make sure we add trash removal and disposal on every
 * quote."
 *
 * WHY THE PROMPT ALONE WAS NOT DOING IT
 *
 * The estimator was told to include soft costs "when applicable", which
 * leaves the model to decide, and on small jobs it routinely decides a skip
 * is not applicable. It is always applicable. Strip-out, offcuts, packaging,
 * old units, broken tile — it goes somewhere, somebody loads it, and a tip
 * charges for it. A quote without it is a quote that eats that cost.
 *
 * The prompt now demands it. This is the check behind the demand, for the
 * runs where the model does not comply, which is the same two-part shape as
 * `quotePhasePlan`: ask properly, then verify deterministically.
 *
 * THERE IS A FLOOR, AND IT IS A POLICY, NOT A GUESS
 *
 * Eric: "lets make it have a minimum of $125 trash removal."
 *
 * This started out adding disposal at ZERO, on the reasoning that an
 * invented figure is worse than a blank one — blank is visible and gets
 * priced, invented is invisible and gets sent. That reasoning was right
 * about a number the software made up and wrong about this one: $125 is the
 * company's stated minimum, so putting it on a quote is applying a rule,
 * not guessing.
 *
 * The floor is on the TOTAL disposal charge, counting every disposal line
 * wherever it sits. A quote carrying only $80 of hauling labour is charging
 * $80 to take the rubbish away, which is under the minimum, so it is topped
 * up to $125. A quote already over the floor is left alone entirely.
 *
 * It is a MINIMUM, not a price. A full house strip-out needs far more than
 * $125 of skips, so a line sitting exactly at the floor says so in its own
 * description and asks to be raised if the job warrants it.
 *
 * NOR WILL IT DUPLICATE ONE THAT IS THERE
 *
 * The model names this a dozen ways — skip hire, dumpster rental, debris
 * disposal, haul-away, tip fees, waste removal. Adding a second disposal
 * line because the first was called something unexpected would overcharge,
 * and overcharging quietly is the failure that matters here. So the
 * detector is deliberately generous about what counts, across soft costs,
 * materials AND labour, since the model files it under all three.
 */

/**
 * The least this company will charge to take a job's rubbish away.
 *
 * A stated business rule, not an estimate. Every quote carries at least
 * this much disposal: there is a trip, a tip fee and somebody's time in the
 * smallest job there is, and quoting less than this has never covered it.
 */
export const DISPOSAL_MINIMUM = 125;

/** Words that mean "getting rid of what the job produces". */
const DISPOSAL_TERMS = [
  'disposal', 'dispose', 'debris', 'dumpster', 'skip hire', 'skip',
  'waste', 'rubbish', 'trash', 'garbage', 'refuse', 'junk',
  'haul away', 'haul-away', 'haulaway', 'hauling', 'tip fee', 'tipping',
  'landfill', 'dump run', 'dump fee', 'spoil removal', 'muck away',
  'demolition removal', 'clearance',
];

const hay = (row: any): string =>
  [row?.name, row?.description, row?.category, row?.role, row?.trade]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

/** Does this line already cover taking the rubbish away? */
export function isDisposalLine(row: any): boolean {
  const text = hay(row);
  if (!text) return false;
  return DISPOSAL_TERMS.some((term) => text.includes(term));
}

/** What one line charges, whichever shape it was written in. */
function amountOf(row: any): number {
  const stated = Number(row?.amount);
  if (Number.isFinite(stated) && stated !== 0) return stated;
  const total = Number(row?.totalCost);
  if (Number.isFinite(total) && total !== 0) return total;
  const qty = Number(row?.quantity ?? row?.hours ?? 0) || 0;
  const rate = Number(row?.unitCost ?? row?.hourlyRate ?? 0) || 0;
  return qty * rate;
}

/**
 * What this estimate charges, in total, to take the rubbish away.
 *
 * Counts disposal wherever it sits — the skip as a soft cost, the dumpster
 * as a material, the hours loading it as labour. All three are money the
 * customer pays for removal, so all three count towards the floor. Counting
 * only the soft cost would top up a quote that already charges plenty.
 */
export function disposalValueOf(estimate: {
  additionalCosts?: any[]; materials?: any[]; labor?: any[];
}): number {
  const rows = [
    ...(Array.isArray(estimate?.additionalCosts) ? estimate.additionalCosts : []),
    ...(Array.isArray(estimate?.materials) ? estimate.materials : []),
    ...(Array.isArray(estimate?.labor) ? estimate.labor : []),
  ];
  const total = rows.filter(isDisposalLine).reduce((sum, row) => sum + amountOf(row), 0);
  return Math.round(total * 100) / 100;
}

export interface DisposalCheck {
  /** True when the estimate already prices disposal somewhere. */
  present: boolean;
  /** Where it was found, for the log. */
  foundIn: 'additionalCosts' | 'materials' | 'labor' | null;
}

/**
 * Is disposal priced anywhere on this estimate?
 *
 * Looks in all three places because the model is inconsistent about where it
 * puts a skip: usually a soft cost, often a material "Dumpster rental, 10
 * yard", sometimes only the labour to load it. Any of them means the cost
 * has been considered, and a second line would double-charge.
 */
export function findDisposal(estimate: {
  additionalCosts?: any[];
  materials?: any[];
  labor?: any[];
}): DisposalCheck {
  const buckets: Array<['additionalCosts' | 'materials' | 'labor', any[]]> = [
    ['additionalCosts', Array.isArray(estimate?.additionalCosts) ? estimate.additionalCosts : []],
    ['materials', Array.isArray(estimate?.materials) ? estimate.materials : []],
    ['labor', Array.isArray(estimate?.labor) ? estimate.labor : []],
  ];
  for (const [where, rows] of buckets) {
    if (rows.some(isDisposalLine)) return { present: true, foundIn: where };
  }
  return { present: false, foundIn: null };
}

export interface DisposalLine {
  id: string;
  name: string;
  description: string;
  category: string;
  amount: number;
  /** Set when this line exists only to bring the quote up to the floor. */
  atMinimum: true;
}

/**
 * The line that brings a quote up to the minimum.
 *
 * `shortfall` is what is missing, not the whole minimum, so a quote already
 * charging $80 of hauling gets a $45 top-up rather than a second $125 skip.
 *
 * It says it is the minimum in its own description. $125 covers a trip and
 * a tip fee; it does not cover a full house strip-out, and a line sitting
 * at the floor on a large job is one somebody should raise.
 */
export function disposalPlaceholder(makeId: () => string, shortfall = DISPOSAL_MINIMUM): DisposalLine {
  return {
    id: makeId(),
    name: 'Trash removal and disposal',
    description:
      'Skip or dumpster hire, loading and tip fees for everything this job takes out. '
      + `Charged at the $${DISPOSAL_MINIMUM} minimum — raise it if the job produces more than a single load.`,
    category: 'Disposal',
    amount: Math.round(shortfall * 100) / 100,
    atMinimum: true,
  };
}

/**
 * Guarantee disposal on the quote, and at no less than the minimum.
 *
 * Three outcomes, and the middle one is the subtle one:
 *
 *   already at or over the floor   nothing happens
 *   priced, but under the floor    the existing soft-cost line is RAISED,
 *                                  or a top-up added for the shortfall
 *   not priced at all              the minimum is added
 *
 * Raising the existing line rather than appending a second one matters:
 * two disposal lines on one quote reads as a mistake to a customer, and
 * invites the question of why they are being charged twice to empty one
 * skip. Only a soft cost is raised — a material priced by quantity and a
 * labour line priced by hours both mean something specific, and quietly
 * rewriting a unit cost to hit a total would make those lines lie.
 *
 * Returns what it did, so the caller can log a model that keeps omitting
 * disposal rather than papering over it in silence every time.
 */
export function ensureDisposal(
  estimate: { additionalCosts?: any[]; materials?: any[]; labor?: any[] },
  makeId: () => string,
): {
  additionalCosts: any[];
  added: boolean;
  raised: boolean;
  foundIn: DisposalCheck['foundIn'];
  value: number;
} {
  const existing = Array.isArray(estimate?.additionalCosts) ? estimate.additionalCosts : [];
  const check = findDisposal(estimate);
  const value = disposalValueOf(estimate);
  const shortfall = Math.round((DISPOSAL_MINIMUM - value) * 100) / 100;

  if (shortfall <= 0) {
    return { additionalCosts: existing, added: false, raised: false, foundIn: check.foundIn, value };
  }

  // Under the floor with a soft-cost line already there: raise that one.
  const softIndex = existing.findIndex(isDisposalLine);
  if (softIndex >= 0) {
    const row = existing[softIndex];
    const raisedTo = Math.round((amountOf(row) + shortfall) * 100) / 100;
    const next = existing.slice();
    next[softIndex] = { ...row, amount: raisedTo, atMinimum: true };
    return {
      additionalCosts: next,
      added: false,
      raised: true,
      foundIn: check.foundIn,
      value: DISPOSAL_MINIMUM,
    };
  }

  // Nothing to raise — add the shortfall as its own line.
  return {
    additionalCosts: [...existing, disposalPlaceholder(makeId, shortfall)],
    added: true,
    raised: false,
    foundIn: check.foundIn,
    value: DISPOSAL_MINIMUM,
  };
}
