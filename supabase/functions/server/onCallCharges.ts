/**
 * A callout, as lines a customer can read on an invoice.
 *
 * `tasks/on-call-system.md` item 6: "Callout fee, after-hours rate and the work
 * done, as real lines on the job, priced on the server from the account's own
 * rates — never a total posted by a browser."
 *
 * WHAT WAS ALREADY THERE, AND WHAT WAS NOT
 *
 * `calloutCents()` in onCallConfig.ts prices a callout correctly and has done
 * since it was written: callout, out-of-hours on top rather than instead, and
 * labour with the minimum-hours floor. `routeEmergency` calls it and parks the
 * result on the call's routing plan.
 *
 * And there it stopped. The money was computed and never reached the job, so
 * every callout had to be typed onto an invoice by hand from a figure sitting
 * in a JSON blob — which is the one way the hourly rate on the invoice ends up
 * disagreeing with the hourly rate on the account.
 *
 * WHY THIS DOES NOT JUST REFORMAT calloutCents
 *
 * That function returns one collapsed label per line — "Labour — 2 hours",
 * with the hours multiplied into a single figure. Correct for a routing plan,
 * wrong on an invoice: a customer reading "Labour 2 hrs @ $95.00" can check the
 * arithmetic, and one reading "Labour — 2 hours ... $190.00" cannot see the
 * rate they are being charged. So the labour line is rebuilt here with the
 * quantity and the unit price kept apart.
 *
 * The rates still come from `ratesFor`, so an account that sets its own hourly
 * rate, or a service that overrides it, or Black Phoenix answering on its own
 * rates, all resolve exactly once and in one place.
 *
 * HOURS ARE AN INPUT AND THE PRICE IS NOT
 *
 * Somebody has to say how long the work took; that is a fact about the world
 * and a person reports it. Everything after that — the minimum, the rate, the
 * out-of-hours addition, the totals — is computed here from the stored record.
 * A browser may say "two hours". It may not say "$190".
 */

import {
  ratesFor,
  type CallExtras,
  type OnCallConfig,
  type OnCallService,
} from './onCallConfig.ts';
import type { InvoiceLineItem } from './invoiceDraft.ts';

/** What a person reports about a finished callout. */
export interface CallWorkDone {
  /** How long the work actually took. The minimum below may raise it. */
  hours?: number;
  /**
   * Whether it landed outside the working day.
   *
   * Derived by the caller from the call's own timestamp and the account's
   * hours — never taken from a form. `isOnCallNow` is what answers it.
   */
  afterHours?: boolean;
  /** Optional words for the labour line, e.g. "Cleared blocked soil stack". */
  workDescription?: string;
}

export interface CallChargeResult {
  lines: InvoiceLineItem[];
  /** In cents, derived from the lines and never from anything posted. */
  totalCents: number;
  /** Whose rates were applied, for the record. */
  chargedBy: 'platform' | 'account';
  /** Hours actually billed, after the minimum. Shown so a dispute is short. */
  billedHours: number;
}

const money = (cents: number): number => Math.round(cents) / 100;

/**
 * The billable hours for a call.
 *
 * The minimum is a floor and not a replacement: twenty minutes on a two-hour
 * minimum bills two hours, and three hours bills three. Exported because the
 * number appears on the invoice and in the conversation that follows it, and
 * both should come from the same place.
 */
export function billedHoursFor(rates: CallExtras | null, hours: unknown): number {
  const worked = Number(hours);
  const actual = Number.isFinite(worked) && worked > 0 ? worked : 0;
  const minimum = Number(rates?.minimumHours) || 0;
  return Math.max(actual, minimum);
}

/**
 * A finished callout as invoice lines.
 *
 * Returns an empty list when the account charges nothing for any of it, which
 * is a real configuration: plenty of accounts fold the callout into the job
 * and bill only materials. An empty list is not a failure and must not become
 * a zero-value line — a $0.00 row on an invoice reads as a mistake.
 */
export function callChargeLines(
  config: OnCallConfig,
  opts: {
    service?: OnCallService | null;
    weAnswer?: boolean;
    platform?: CallExtras | null;
    work?: CallWorkDone;
    /** Where these lines start, when an invoice already has some. */
    startLineNumber?: number;
  } = {},
): CallChargeResult {
  const { rates, owner } = ratesFor(config, {
    service: opts.service,
    weAnswer: opts.weAnswer,
    platform: opts.platform,
  });
  const work = opts.work || {};
  const billedHours = billedHoursFor(rates, work.hours);
  const lines: InvoiceLineItem[] = [];
  let n = Math.max(1, Math.floor(Number(opts.startLineNumber) || 1));

  const push = (description: string, quantity: number, unitCents: number) => {
    const amountCents = Math.round(unitCents * quantity);
    if (amountCents <= 0) return;      // nothing charged is no line, not a zero
    lines.push({
      description,
      quantity,
      unit_price: money(unitCents),
      amount: money(amountCents),
      line_number: n++,
    });
  };

  if (rates) {
    push('Emergency callout', 1, rates.calloutCents);
    /*
     * Added, never substituted. Turning out at 2am is the callout plus the
     * inconvenience, not a different callout — the same ruling calloutCents
     * records, repeated here because this is the other place it could drift.
     */
    if (work.afterHours) push('Out of hours', 1, rates.afterHoursCents);

    if (billedHours > 0) {
      const label = work.workDescription
        ? `Labour — ${String(work.workDescription).slice(0, 120)}`
        : 'Labour';
      push(label, billedHours, rates.hourlyCents);
    }
  }

  return {
    lines,
    totalCents: lines.reduce((sum, l) => sum + Math.round(l.amount * 100), 0),
    chargedBy: owner,
    billedHours,
  };
}

/**
 * One line saying how the labour figure was reached.
 *
 * Only when the minimum did the raising. A customer who was billed two hours
 * for twenty minutes' work is entitled to see that written down before they
 * ring up about it, and an invoice that explains itself is one nobody has to
 * ring up about.
 */
export function minimumHoursNote(
  rates: CallExtras | null, work: CallWorkDone | undefined,
): string | null {
  const worked = Number(work?.hours);
  const minimum = Number(rates?.minimumHours) || 0;
  if (!(minimum > 0)) return null;
  if (!Number.isFinite(worked) || worked >= minimum) return null;
  const shown = Number.isFinite(worked) && worked > 0 ? worked : 0;
  return `Billed at the ${minimum}-hour minimum callout; time on site was ${shown}.`;
}
