/**
 * The conditions report record, and what may happen to it.
 *
 * `conditionDiff` decides what changed and `depositMath` decides what comes off
 * the deposit. This holds the thing itself: which two checklists it was built
 * from, what the landlord has overridden, what Black Phoenix priced, and where
 * it is in its life.
 *
 * WHAT IS FROZEN, AND WHY ONLY HALF OF IT
 *
 * A report that has been sent out must not change underneath the people holding
 * it. Edit a move-out checklist a week after the report went to the tenant and,
 * if the findings were recomputed on every read, the statement in their hand
 * would quietly stop matching the one on the screen. So the FINDINGS are frozen
 * the moment the report leaves the landlord's hands.
 *
 * The MONEY is not frozen, because it does not exist yet at that moment. Black
 * Phoenix prices the damage after the report is sent, so the settlement is
 * always computed from the frozen findings plus whatever has been priced since.
 * Freezing both would mean freezing a report with no figures on it.
 *
 * That split is the whole design: findings are a record of a day, costs are a
 * conversation that happens afterwards.
 *
 * TOTALS ARE NEVER STORED
 *
 * No deduction total, no returned figure, no owed figure is kept on the record.
 * They are derived on every read from the findings, the costs and the deposit.
 * A stored total is a number that can disagree with the lines above it, and this
 * one decides how much of somebody's money goes back.
 */

import {
  compareConditions, type ConditionDiff, type ConditionOverride,
} from './conditionDiff.ts';
import { settleDeposit, type DeductionLine, type Settlement } from './depositMath.ts';

export type ReportStatus =
  /** The landlord has it. Findings recompute as the checklists change. */
  | 'documented'
  /** With Black Phoenix for pricing. Findings frozen from here on. */
  | 'sent'
  /** Every chargeable area has a price. */
  | 'priced'
  /** The tenant has been given it. */
  | 'shared';

/** One priced area. The cost comes from Black Phoenix, never from the landlord. */
export interface ReportCost {
  area: string;
  cost: number | null;
  quoteId?: string;
}

export interface ConditionsReportRecord {
  id: string;
  landlordEmail: string;
  landlordUserId?: string;
  tenantEmail: string;
  tenantName: string;
  propertyAddress: string;
  unit: string;
  moveInFormId: string | null;
  moveOutFormId: string;
  /**
   * The deposit as the lease recorded it WHEN THE REPORT WAS MADE.
   *
   * Copied rather than read live: a lease can be edited or renewed, and a
   * statement that silently re-based itself on a new deposit figure would be
   * arithmetic nobody could reproduce.
   */
  depositRaw: string;
  /** A figure the landlord typed because the lease field was not one. */
  depositOverride?: string;
  overrides: ConditionOverride[];
  costs: ReportCost[];
  /** The work request raised when it was sent for pricing. */
  workRequestId?: string;
  jobId?: string;
  status: ReportStatus;
  /** The findings as at the moment it was sent. Absent while `documented`. */
  frozenDiff?: ConditionDiff;
  frozenAt?: string;
  createdAt: string;
  updatedAt: string;
  sentAt?: string;
  pricedAt?: string;
  sharedAt?: string;
}

const str = (v: unknown): string => (v == null ? '' : String(v));
const lower = (v: unknown): string => str(v).trim().toLowerCase();

/**
 * Build a report from a move-out checklist and, where there is one, a move-in.
 *
 * The move-in may legitimately be absent — a tenancy that predates the forms —
 * and the comparison reports that as "nothing is chargeable" rather than as an
 * error, so the report is still worth having as a record of the departure
 * condition.
 */
export function buildReport(input: {
  id: string;
  landlordEmail: string;
  landlordUserId?: string;
  moveInForm: any | null;
  moveOutForm: any;
  depositRaw?: unknown;
  now?: string;
}): ConditionsReportRecord {
  const now = input.now || new Date().toISOString();
  const out = input.moveOutForm || {};
  return {
    id: input.id,
    landlordEmail: lower(input.landlordEmail),
    landlordUserId: input.landlordUserId,
    tenantEmail: lower(out.tenantEmail),
    tenantName: str(out.tenantName),
    propertyAddress: str(out.propertyAddress),
    unit: str(out.unit),
    moveInFormId: input.moveInForm?.id ? str(input.moveInForm.id) : null,
    moveOutFormId: str(out.id),
    depositRaw: str(input.depositRaw),
    overrides: [],
    costs: [],
    status: 'documented',
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Why a pair of checklists cannot make a report, or null when they can.
 *
 * Checked here rather than in the route so the reasons are testable and read as
 * one list. Every one of them is about evidence: an unsigned or unfinished
 * checklist is not a record of a condition, and two checklists about different
 * tenants are not a comparison.
 */
export function reportRefusal(moveInForm: any | null, moveOutForm: any): string | null {
  if (!moveOutForm) return 'A completed move-out checklist is needed before a report can be made.';
  if (str(moveOutForm.type) !== 'move-out') return 'That form is not a move-out checklist.';
  if (str(moveOutForm.status) !== 'completed') {
    return 'The move-out checklist has not been completed yet, so there is no departure condition to report.';
  }
  if (moveInForm) {
    if (str(moveInForm.type) !== 'move-in') return 'That form is not a move-in checklist.';
    if (str(moveInForm.status) !== 'completed') {
      return 'The move-in checklist was never completed, so it cannot be used as the arrival condition.';
    }
    if (lower(moveInForm.tenantEmail) !== lower(moveOutForm.tenantEmail)) {
      return 'Those two checklists are for different tenants.';
    }
  }
  return null;
}

/** The chargeable areas, with whatever has been priced against them. */
export function deductionsFor(diff: ConditionDiff, costs: ReportCost[] = []): DeductionLine[] {
  const byArea = new Map<string, ReportCost>();
  for (const cost of costs || []) {
    const area = str(cost?.area).trim();
    if (area && !byArea.has(area)) byArea.set(area, cost);
  }
  return (diff?.lines || [])
    .filter((line) => line.chargeable)
    .map((line) => {
      const priced = byArea.get(line.area);
      return {
        area: line.area,
        // Absent is null, not zero. `depositMath` refuses to total while any
        // chargeable area is unpriced, and that refusal depends on this.
        cost: priced && priced.cost !== null && priced.cost !== undefined ? Number(priced.cost) : null,
        quoteId: priced?.quoteId ? str(priced.quoteId) : undefined,
      };
    });
}

export interface ReportView {
  record: ConditionsReportRecord;
  diff: ConditionDiff;
  settlement: Settlement;
  /** True while the findings still move with the underlying checklists. */
  live: boolean;
  /** Whether it may be given to the tenant, and why not when it may not. */
  shareable: boolean;
  shareBlockedBecause: string | null;
}

/**
 * The report as it should be read, with the money worked out.
 *
 * Pass the two form records; they are only used while the report is still live.
 * Once frozen, the stored findings are served and the forms are not consulted —
 * that is the point of freezing them.
 */
export function reportView(
  record: ConditionsReportRecord,
  moveInForm: any | null,
  moveOutForm: any | null,
): ReportView {
  const live = !record.frozenDiff;
  const diff = record.frozenDiff
    || compareConditions(moveInForm, moveOutForm, record.overrides || []);

  const deposit = str(record.depositOverride).trim() || record.depositRaw;
  const settlement = settleDeposit(deposit, deductionsFor(diff, record.costs));

  const { shareable, because } = shareability(record, diff, settlement);

  return { record, diff, settlement, live, shareable, shareBlockedBecause: because };
}

/**
 * Whether the tenant may be given this, and why not when they may not.
 *
 * A report with nothing chargeable is shareable straight away: it makes no claim
 * and it is the evidence that the deposit is going back in full, which the
 * tenant is entitled to see. A report that DOES make a claim is shareable only
 * once the claim has a number behind it — a statement saying "your floor is
 * damaged, figure to follow" is an accusation with no arithmetic, and handing
 * one over would be worse than waiting.
 */
function shareability(
  record: ConditionsReportRecord,
  diff: ConditionDiff,
  settlement: Settlement,
): { shareable: boolean; because: string | null } {
  if (record.status === 'shared') return { shareable: true, because: null };

  if (diff.chargeableAreas === 0) {
    // Nothing is being deducted, so an unreadable deposit does not gate this:
    // there is no arithmetic to get wrong and the tenant is entitled to the
    // record of their departure condition either way.
    return { shareable: true, because: null };
  }

  if (settlement.status === 'awaiting_pricing') {
    return {
      shareable: false,
      because: 'The damage has not been priced yet. Send the report to Black Phoenix for a '
        + 'price first — a report naming damage with no figure behind it is a claim the tenant '
        + 'cannot check.',
    };
  }
  if (settlement.status === 'deposit_unreadable') {
    return {
      shareable: false,
      because: `${settlement.deposit.why} The statement cannot show what is being returned until `
        + 'the deposit is a figure.',
    };
  }
  return { shareable: true, because: null };
}

/** Why a status change is not allowed, or null when it is. */
export function transitionRefusal(
  record: ConditionsReportRecord,
  to: ReportStatus,
  view: ReportView,
): string | null {
  const from = record.status;
  // Asking for the state it is already in is a no-op rather than an error, so a
  // repeated click or a retried request does not surface a failure. The guard
  // against it DOING anything the second time is in `applyTransition`.
  if (from === to) return null;

  if (to === 'sent') {
    if (from !== 'documented') return 'This report has already been sent for pricing.';
    if (view.diff.chargeableAreas === 0) {
      return 'Nothing on this report is chargeable, so there is nothing to price.';
    }
    return null;
  }

  if (to === 'priced') {
    if (from === 'documented') return 'This report has not been sent for pricing yet.';
    return null;
  }

  if (to === 'shared') {
    return view.shareable ? null : view.shareBlockedBecause;
  }

  if (to === 'documented') {
    // Reopening is deliberate and allowed: a report sent in error should be
    // recoverable. It discards the freeze, which is why it is not automatic —
    // and it must not be possible once the tenant has been given it.
    if (from === 'shared') {
      return 'This report has been given to the tenant. Reopening it would change a statement '
        + 'somebody is already holding.';
    }
    return null;
  }

  return 'Unknown status.';
}

/**
 * Apply a status change, freezing or thawing the findings as it goes.
 *
 * Call `transitionRefusal` first; this assumes the move is allowed.
 */
export function applyTransition(
  record: ConditionsReportRecord,
  to: ReportStatus,
  view: ReportView,
  now: string = new Date().toISOString(),
): ConditionsReportRecord {
  const next: ConditionsReportRecord = { ...record, status: to, updatedAt: now };

  /*
   * Each timestamp is written ONCE.
   *
   * A repeated transition must not move the date it already has. "Sent on the
   * 2nd" is a fact about this report, and a retried request that re-stamped it
   * as the 9th would quietly rewrite the history of a document somebody is
   * relying on — and re-freezing would overwrite the findings that were frozen.
   */
  if (to === 'sent') {
    // The findings stop moving here. From this point the report is about a day,
    // not about whatever the checklists currently say.
    if (!next.frozenDiff) {
      next.frozenDiff = view.diff;
      next.frozenAt = now;
    }
    next.sentAt = next.sentAt || now;
  }
  if (to === 'priced') next.pricedAt = next.pricedAt || now;
  if (to === 'shared') next.sharedAt = next.sharedAt || now;
  if (to === 'documented') {
    delete next.frozenDiff;
    delete next.frozenAt;
    delete next.sentAt;
    delete next.pricedAt;
  }
  return next;
}

/**
 * Whether every chargeable area now has a price.
 *
 * Used to move a sent report to `priced` without anybody having to notice, since
 * the pricing arrives from our side rather than the landlord's.
 */
export function isFullyPriced(view: ReportView): boolean {
  return view.diff.chargeableAreas > 0 && view.settlement.unpriced.length === 0;
}

/**
 * The work request this report becomes when it is sent to be priced.
 *
 * ONE REQUEST FOR THE WHOLE REPORT, NOT ONE PER AREA
 *
 * Eric's words were "send me the report", and that is also the right shape: a
 * turnover is one job. Three damaged areas in one flat is one visit, one crew
 * and one quote, and raising three work requests would put three jobs on the
 * pipeline for a single departure — then ask somebody to reconcile them back
 * into one deposit statement.
 *
 * WHY THE DESCRIPTION IS LONG
 *
 * Whoever prices this has not been in the flat. "Flooring — Damaged" tells them
 * nothing they can quote from. The arrival condition, the departure condition,
 * what each side wrote and how much evidence is on file are what make a price
 * possible without a second visit — and where the two accounts disagree, that
 * belongs in front of whoever is pricing it rather than buried.
 */
export function workRequestScope(view: ReportView): {
  title: string; description: string; priority: string;
} {
  const r = view.record;
  const damage = view.diff.lines.filter((l) => l.chargeable);
  const where = [r.propertyAddress, r.unit].filter(Boolean).join(', ') || 'the property';

  const lines = damage.map((line) => {
    const bits = [`${line.area}: ${line.moveIn?.condition || 'unrecorded'} on arrival, `
      + `${line.moveOut?.condition || 'unrecorded'} on departure.`];
    if (line.moveOut?.notes) bits.push(`  Note on departure: ${line.moveOut.notes}`);
    if (line.moveIn?.notes) bits.push(`  Note on arrival: ${line.moveIn.notes}`);
    if (line.disputed) {
      bits.push('  The landlord and the tenant recorded different conditions for this area.');
    }
    const photos = (line.moveIn?.media?.length || 0) + (line.moveOut?.media?.length || 0);
    if (photos) bits.push(`  ${photos} photo/video on file across the two inspections.`);
    if (line.override) bits.push('  Classed as damage by the landlord rather than automatically.');
    return bits.join('\n');
  });

  const wear = view.diff.lines.filter((l) => l.classification === 'wear').map((l) => l.area);

  const description = [
    `Make good after a tenancy ended at ${where}.`,
    '',
    `${damage.length} area${damage.length === 1 ? '' : 's'} recorded as damage:`,
    '',
    ...lines,
    '',
    wear.length
      // Said explicitly so nobody quotes it. These areas deteriorated and are
      // NOT chargeable to the tenant, so pricing them would put work on a
      // deposit statement that has no business being there.
      ? `Not chargeable, and not to be quoted: ${wear.join(', ')} — recorded as fair `
        + 'wear and tear.'
      : 'No areas were classed as wear and tear.',
    '',
    view.diff.tenancyMonths !== null
      ? `The tenancy ran ${view.diff.tenancyMonths} months.`
      : 'The length of the tenancy is not recorded.',
    'These figures go onto a security deposit statement given to the former '
      + 'tenant, so each area needs its own price rather than one total.',
  ].filter((part) => part !== undefined).join('\n');

  return {
    title: `Make good after tenancy — ${where}`.slice(0, 160),
    description,
    // A unit that cannot be re-let is losing rent every day, so a turnover is
    // commercially urgent even when nothing about it is an emergency.
    priority: 'high',
  };
}

/**
 * What a tenant is allowed to see.
 *
 * Everything the landlord sees, minus nothing. A partial copy would defeat the
 * purpose: the tenant is being shown why money is being kept, and an itemised
 * statement with items removed is not one. What gates this is WHETHER they see
 * it at all, which is the landlord's decision and is checked by the route.
 *
 * The landlord's email is the one thing dropped, because it is not part of the
 * statement and the tenant already knows who their landlord is.
 */
export function tenantCopy(view: ReportView): Omit<ReportView, 'record'> & { record: any } {
  const { landlordEmail, landlordUserId, ...rest } = view.record;
  return { ...view, record: rest };
}
