/**
 * Taking damage costs out of a security deposit.
 *
 * This decides how much of somebody's money goes back to them, so it refuses to
 * guess twice over.
 *
 * IT REFUSES AN UNREADABLE DEPOSIT RATHER THAN READING IT AS ZERO.
 *
 * `securityDeposit` on a lease is free text with a placeholder of "$1,800". It
 * can hold "1800", "$1,800.00", or "one month". The failure mode if that is
 * coerced is severe and silent: a deposit read as zero shows the ENTIRE cost as
 * owed by the tenant, on a document that is about to be handed to them. So an
 * unreadable figure stops the arithmetic and says what it could not read.
 *
 * The same reasoning rejects "1 month rent". Stripping the non-numeric
 * characters out of that leaves "1", and a one dollar deposit is a worse answer
 * than no answer. Any letters at all and it asks rather than parses.
 *
 * IT REFUSES TO TOTAL ANYTHING WHILE PRICING IS OUTSTANDING.
 *
 * Black Phoenix prices the damage, so between the report being sent and the
 * quote coming back there is no real number. Showing "$0 deducted" in that
 * window would read as "nothing owed" to both parties, which is the opposite of
 * what it means. A chargeable line with no price makes the whole settlement
 * `awaiting_pricing` and the money nulls rather than zeros.
 *
 * WHAT IT DELIBERATELY DOES NOT DO
 *
 * It does not hold interest. Massachusetts requires a deposit held in a separate
 * interest-bearing account with the interest paid to the tenant, and getting
 * that right needs the state, the account and the dates — none of which are on
 * these records yet. It is better absent than approximated: a wrong interest
 * figure on a statutory statement is worse than none.
 */

export interface DepositReading {
  /** The figure, or null when it could not be read. */
  amount: number | null;
  raw: string;
  readable: boolean;
  /** Why it could not be read, in words for the landlord. */
  why: string;
}

/** Money, to the cent, never a floating-point tail. */
const money = (n: number): number => Math.round(n * 100) / 100;

/**
 * Read a deposit out of whatever the lease field holds.
 *
 * Accepts the ordinary money shapes — 1800, $1,800, 1,800.00 — and refuses
 * everything else by design rather than by accident.
 */
export function parseDeposit(raw: unknown): DepositReading {
  const text = raw == null ? '' : String(raw).trim();

  if (!text) {
    return {
      amount: null, raw: text, readable: false,
      why: 'No security deposit is recorded on the lease.',
    };
  }

  if (/[a-z]/i.test(text)) {
    // "one month", "1 month rent", "1800 USD", "TBD". Pulling a number out of
    // any of these produces a figure nobody wrote down.
    return {
      amount: null, raw: text, readable: false,
      why: `The deposit is recorded as "${text}", which is not an amount. `
        + 'Enter the figure in dollars so it can be deducted from.',
    };
  }

  const cleaned = text.replace(/[$\s,]/g, '');
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) {
    return {
      amount: null, raw: text, readable: false,
      why: `The deposit "${text}" could not be read as an amount in dollars and cents.`,
    };
  }

  const amount = money(Number(cleaned));
  if (!Number.isFinite(amount) || amount < 0) {
    return {
      amount: null, raw: text, readable: false,
      why: `The deposit "${text}" is not a usable amount.`,
    };
  }

  return { amount, raw: text, readable: true, why: '' };
}

export type SettlementStatus = 'deposit_unreadable' | 'awaiting_pricing' | 'ready';

/** One chargeable area, with the price Black Phoenix put on it. */
export interface DeductionLine {
  area: string;
  /** The quoted cost, or null while pricing is outstanding. */
  cost: number | null;
  /** The quote the figure came from, so the report can name it. */
  quoteId?: string;
}

export interface Settlement {
  status: SettlementStatus;
  deposit: DepositReading;
  /** Total being deducted, or null while anything is unpriced or unreadable. */
  deductions: number | null;
  /** What goes back to the tenant. Never negative. */
  returnedToTenant: number | null;
  /** What the tenant still owes where the damage exceeds the deposit. */
  owedByTenant: number | null;
  /** Chargeable areas still waiting on a price. */
  unpriced: string[];
  lines: DeductionLine[];
  /** Everything that belongs on the face of the statement. */
  notes: string[];
}

/**
 * Settle a deposit against the chargeable lines.
 *
 * Only pass lines the comparison marked chargeable. Wear is listed on the report
 * and never reaches here, which is the point of classifying it separately — a
 * wear line that could carry a cost is a wear line that will eventually carry
 * one.
 */
export function settleDeposit(depositRaw: unknown, chargeable: DeductionLine[] = []): Settlement {
  const deposit = parseDeposit(depositRaw);
  const notes: string[] = [];

  const lines = (Array.isArray(chargeable) ? chargeable : [])
    .filter((l) => l && String(l.area || '').trim())
    .map((l) => {
      /*
       * ABSENT IS NOT ZERO, and this is the line where that would have gone
       * wrong. `Number(null)` is 0, which is finite and not negative — so an
       * unpriced area would have become a priced area costing nothing, the whole
       * settlement would have read as ready, and the report would have gone out
       * saying a damaged floor was quoted at zero.
       */
      const unpriced = l.cost === null || l.cost === undefined || l.cost === '';
      const cost = unpriced ? NaN : Number(l.cost);
      return {
        area: String(l.area).trim(),
        cost: Number.isFinite(cost) && cost >= 0 ? money(cost) : null,
        quoteId: l.quoteId ? String(l.quoteId) : undefined,
      };
    });

  const unpriced = lines.filter((l) => l.cost === null).map((l) => l.area);

  const blocked: Settlement = {
    status: 'ready', deposit, deductions: null, returnedToTenant: null,
    owedByTenant: null, unpriced, lines, notes,
  };

  if (!deposit.readable) {
    notes.push(deposit.why);
    notes.push('No deduction can be worked out until the deposit is a figure.');
    return { ...blocked, status: 'deposit_unreadable' };
  }

  if (unpriced.length > 0) {
    notes.push(`${unpriced.length} chargeable area${unpriced.length === 1 ? '' : 's'} `
      + `still waiting on a price: ${unpriced.join(', ')}.`);
    notes.push('The deposit arithmetic is deliberately blank until every chargeable area is '
      + 'priced. A total of zero here would read as nothing owed.');
    return { ...blocked, status: 'awaiting_pricing' };
  }

  const deductions = money(lines.reduce((sum, l) => sum + (l.cost || 0), 0));
  const returnedToTenant = money(Math.max(0, deposit.amount! - deductions));
  const owedByTenant = money(Math.max(0, deductions - deposit.amount!));

  if (lines.length === 0) {
    notes.push('Nothing is chargeable, so the deposit is returned in full.');
  }
  if (owedByTenant > 0) {
    notes.push(`The damage exceeds the deposit by ${owedByTenant.toFixed(2)}, which is owed `
      + 'separately rather than withheld.');
  }
  if (lines.some((l) => !l.quoteId)) {
    // Not a blocker: a figure can be right without a quote behind it. But the
    // report should say which lines are backed by one, because "the contractor
    // quoted this" and "this is the figure we are using" are different claims.
    notes.push('Some deductions are not linked to a quote. A quoted figure is far stronger '
      + 'evidence if the deduction is challenged.');
  }

  return {
    status: 'ready', deposit, deductions, returnedToTenant, owedByTenant,
    unpriced: [], lines, notes,
  };
}
