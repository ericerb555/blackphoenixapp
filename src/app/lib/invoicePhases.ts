/**
 * An invoice grouped by the phases of the job, with a subtotal for each.
 *
 * Eric asked for the invoice to be "seperate[d] by the proccess" — one
 * invoice, line items gathered under the phase they belong to, each phase
 * showing what that stage of the work costs, then the usual subtotal, tax and
 * total underneath.
 *
 * WHY THIS IS NOT JUST A `groupBy`
 *
 * Three things make it worth its own module and its own tests:
 *
 * ORDER. Phases are a sequence — strip-out happens before framing, which
 * happens before second fix — and an invoice that lists them alphabetically
 * or in whatever order the lines happen to sit in is harder to read than the
 * flat list it replaced. The job's own phase order is passed in and used;
 * anything not in that list is appended in first-seen order rather than
 * dropped or sorted arbitrarily.
 *
 * UNASSIGNED LINES. Most existing invoices have no phase on any line, and
 * after this ships people will still add ad-hoc lines by hand. Those cannot
 * vanish and they cannot invent a phase. They collect in one trailing group
 * with no phase name, which renders as a plain section the way the whole
 * invoice used to.
 *
 * THE MONEY HAS TO STILL ADD UP. Phase subtotals must sum to the invoice
 * subtotal exactly, including credits, or the customer finds the discrepancy
 * before anybody here does. Rounding is applied once per line and the groups
 * sum the already-rounded figures — the alternative, rounding each subtotal
 * independently, is how a grouped invoice ends up a penny out from its own
 * total.
 */

export interface PhasedLine {
  line_number?: number;
  description: string;
  quantity: number;
  unit_price: number;
  is_taxable?: boolean;
  /** Which phase of the job this line belongs to. Absent is normal. */
  phase?: string;
}

export interface PhaseGroup {
  /** The phase name, or null for the lines that belong to no phase. */
  phase: string | null;
  /** What to show as the heading — never empty. */
  label: string;
  /** How long this phase takes, when the job says. */
  duration?: string;
  lines: PhasedLine[];
  subtotal: number;
}

/** One line's money, rounded once, here, so every total agrees. */
export const lineAmount = (line: PhasedLine): number =>
  Math.round((Number(line.quantity) || 0) * (Number(line.unit_price) || 0) * 100) / 100;

const round2 = (n: number) => Math.round(n * 100) / 100;

/** A phase as the job describes it — name, and optionally how long it runs. */
export interface PhaseRef {
  title?: string;
  step?: string;
  estimatedDuration?: string;
}

/**
 * Group lines under phases, in the job's own order.
 *
 * `phases` is the ordering authority — normally the quote's `processSteps`.
 * Pass an empty list and the groups come out in the order the lines first
 * mention them, which is the best available guess when the job has no stated
 * sequence.
 */
export function groupLinesByPhase(
  lines: PhasedLine[],
  phases: PhaseRef[] = [],
): PhaseGroup[] {
  const safeLines = Array.isArray(lines) ? lines : [];

  const order: string[] = [];
  const durations = new Map<string, string>();
  for (const p of Array.isArray(phases) ? phases : []) {
    const name = String(p?.title || p?.step || '').trim();
    if (!name || order.includes(name)) continue;
    order.push(name);
    if (p?.estimatedDuration) durations.set(name, String(p.estimatedDuration));
  }

  const byPhase = new Map<string, PhasedLine[]>();
  const unassigned: PhasedLine[] = [];

  for (const line of safeLines) {
    const name = String(line?.phase || '').trim();
    if (!name) { unassigned.push(line); continue; }
    if (!byPhase.has(name)) {
      byPhase.set(name, []);
      // A phase the lines know about but the job did not list still has to
      // appear somewhere sensible, so it joins the end of the order.
      if (!order.includes(name)) order.push(name);
    }
    byPhase.get(name)!.push(line);
  }

  const groups: PhaseGroup[] = [];
  for (const name of order) {
    const grouped = byPhase.get(name);
    // A phase with no lines against it is not billed, so it is not shown.
    // Printing an empty phase at $0 invites "why am I being charged nothing
    // for this" — a question with no good answer.
    if (!grouped?.length) continue;
    groups.push({
      phase: name,
      label: name,
      duration: durations.get(name),
      lines: grouped,
      subtotal: round2(grouped.reduce((sum, l) => sum + lineAmount(l), 0)),
    });
  }

  if (unassigned.length) {
    groups.push({
      phase: null,
      /**
       * Deliberately not "Other" or "Miscellaneous", which read as an
       * afterthought on a document somebody is being asked to pay. On an
       * invoice with no phases at all this is the only group, and it should
       * read exactly like the heading the flat invoice always had.
       */
      label: groups.length ? 'Additional items' : 'Line Items',
      lines: unassigned,
      subtotal: round2(unassigned.reduce((sum, l) => sum + lineAmount(l), 0)),
    });
  }

  return groups;
}

/**
 * The invoice subtotal, from the same per-line rounding the groups used.
 *
 * Exported so a caller never recomputes it a second way. Two functions that
 * both "obviously" add up the same lines are how a grouped invoice ends up
 * disagreeing with its own total.
 */
export const subtotalOf = (groups: PhaseGroup[]): number =>
  round2(groups.reduce((sum, g) => sum + g.subtotal, 0));

/** True when there is any real phase structure worth rendering as sections. */
export const hasPhaseStructure = (groups: PhaseGroup[]): boolean =>
  groups.some((g) => g.phase !== null);

/**
 * How much of the breakdown the reader is allowed to see.
 *
 *   full          every line, under its phase heading — the office view
 *   phase-totals  the phases and what each one costs, and nothing else
 *
 * Eric: "i want to be able to show how much each process cost total but want
 * to hid visability from materal and labor cost on the quotes and invoices."
 *
 * This is NOT the same control as the per-line `visible` flag, and the two
 * answer different questions:
 *
 *   visible: false   this particular line is nobody's business — the dump
 *                    run, the contingency — and its cost stays folded into
 *                    the total
 *   phase-totals     ALL the arithmetic is nobody's business. The customer is
 *                    buying a finished phase of work for a price, not a bill
 *                    of materials they can shop around.
 *
 * The second is the one that protects margin. A customer who can see
 * "Carpenter 40h @ $70" knows the labour rate and can price the job
 * themselves; one who sees "Framing — $3,900" is reading a price for an
 * outcome. Which is also why this cannot be a front-end setting — see the
 * note on `collapseToPhaseTotals`.
 */
export type LineDetailLevel = 'full' | 'phase-totals';

/**
 * Collapse the groups so only the phase and its price remain.
 *
 * THE LINES ARE REMOVED, NOT HIDDEN.
 *
 * Returning the groups with a flag for the renderer to respect would put the
 * breakdown in the customer's browser and trust the UI not to draw it —
 * exactly the mistake the `visible` checkbox made for months, where the
 * editor stopped drawing a line that was still in the JSON. The array is
 * emptied here so there is nothing for a renderer, a PDF, or a devtools tab
 * to find.
 *
 * Subtotals survive untouched, so the phases still sum to the invoice total.
 */
export function collapseToPhaseTotals(groups: PhaseGroup[]): PhaseGroup[] {
  return groups.map((g) => ({ ...g, lines: [] }));
}

/** Apply a detail level to already-grouped lines. */
export const applyDetailLevel = (
  groups: PhaseGroup[],
  level: LineDetailLevel,
): PhaseGroup[] => (level === 'phase-totals' ? collapseToPhaseTotals(groups) : groups);
