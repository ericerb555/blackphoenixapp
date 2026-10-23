/**
 * A quote's phases, in the shape the payment schedule bills them.
 *
 * WHY THIS IS NOT THREE LINES INLINE
 *
 * Because the phases on the schedule MUST be the phases on the document. If
 * the quote shows "Strip out, Structural, Second fix" and the schedule draws
 * against "Demolition, Steels, Fit-out", the customer is being asked to pay
 * against milestones that do not appear on the thing they agreed to — and
 * nobody notices until the first draw is queried.
 *
 * So this derives them through exactly the machinery the PDF and the
 * on-screen document use: `selectQuoteLines` for what the job consists of,
 * `groupLinesByPhase` for the order. One answer to "what are the phases of
 * this job", three consumers reading it.
 *
 * THE SUBTOTALS COUNT HIDDEN LINES
 *
 * `forCustomer: false`, deliberately. The schedule apportions the CONTRACT,
 * and a line Eric has hidden from the customer's copy is still work he is
 * owed for. Weighting the draws by the visible lines only would quietly move
 * money from the phase with the hidden skip hire onto the other phases —
 * the total would still be right, so nothing would look wrong, and the draws
 * would be billing the wrong phases.
 */
import { selectQuoteLines } from './quotePdfSelection.ts';
import { groupLinesByPhase } from './invoicePhases.ts';
import type { SchedulePhase } from './paymentSchedule.ts';

/**
 * The phases of a quote, in the job's own order, with their true value.
 *
 * Returns an empty list for a quote with no phase structure at all. That is
 * not an error — `buildPaymentSchedule` turns it into a deposit and a
 * balance, which is the right schedule for a job priced as one number.
 */
export function schedulePhasesOf(quote: any): SchedulePhase[] {
  const { lines, steps, phaseCost } = selectQuoteLines(quote, false);
  const groups = groupLinesByPhase(lines, steps);

  const phases: SchedulePhase[] = [];
  for (const group of groups) {
    // The unphased group is real work, but it is not a milestone anyone can
    // mark complete, so it cannot carry a draw. Its money is left to be
    // apportioned across the named phases by weight.
    if (!group.phase) continue;
    phases.push({
      title: group.phase,
      // `phaseCost` counts withheld lines; `group.subtotal` only counts drawn
      // ones. They differ exactly when something is hidden, and the contract
      // value is the former.
      subtotal: phaseCost.get(group.phase) ?? group.subtotal,
    });
  }

  /**
   * A job can have phases described in `processSteps` with no priced lines
   * against them yet. Those are still stages the customer will be billed at,
   * so they appear with zero value and pick up nothing from the split until
   * they are priced — better than silently dropping a phase the quote lists.
   */
  if (!phases.length) {
    for (const step of steps) {
      const title = String(step?.title || step?.step || '').trim();
      if (title && !phases.some((p) => p.title === title)) {
        phases.push({ title, subtotal: phaseCost.get(title) ?? 0 });
      }
    }
  }

  return phases;
}

/** The contract total a schedule is apportioning — tax included. */
export const contractTotalOf = (quote: any): number =>
  Number(quote?.totalCost ?? quote?.total ?? 0) || 0;
