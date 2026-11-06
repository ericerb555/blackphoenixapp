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
 * IT WILL NOT INVENT A PRICE
 *
 * The one thing this must not do is make up what a skip costs. A fabricated
 * figure on a quote is worse than a missing one: missing is visible and gets
 * priced, invented is invisible and gets sent. So when disposal is absent it
 * is added at ZERO and marked `needsPricing`, which puts it in front of
 * whoever reviews the quote as an obvious blank to fill rather than a number
 * to trust.
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
  /** Set when this line was added by the check and still has no price. */
  needsPricing: true;
}

/**
 * The placeholder, when the estimator left disposal out entirely.
 *
 * Zero, and says so in its own description. Somebody reading the quote sees
 * a disposal line with no price against it, which is a question they will
 * ask. A plausible invented number is one they would not.
 */
export function disposalPlaceholder(makeId: () => string): DisposalLine {
  return {
    id: makeId(),
    name: 'Trash removal and disposal',
    description:
      'Skip or dumpster hire, loading and tip fees for everything this job takes out. '
      + 'The estimator did not price this — set the amount before sending the quote.',
    category: 'Disposal',
    amount: 0,
    needsPricing: true,
  };
}

/**
 * Guarantee a disposal line, without inventing a price or duplicating one.
 *
 * Returns the soft costs to use and whether anything was added, so the
 * caller can log a model that keeps omitting it rather than silently
 * papering over it every time.
 */
export function ensureDisposal(
  estimate: { additionalCosts?: any[]; materials?: any[]; labor?: any[] },
  makeId: () => string,
): { additionalCosts: any[]; added: boolean; foundIn: DisposalCheck['foundIn'] } {
  const existing = Array.isArray(estimate?.additionalCosts) ? estimate.additionalCosts : [];
  const check = findDisposal(estimate);
  if (check.present) return { additionalCosts: existing, added: false, foundIn: check.foundIn };
  return {
    additionalCosts: [...existing, disposalPlaceholder(makeId)],
    added: true,
    foundIn: null,
  };
}
