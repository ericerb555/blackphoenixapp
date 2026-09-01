/**
 * Turning the scope into packages a subcontractor can actually price.
 *
 * WHAT A SUB IS BEING ASKED TO DO
 *
 * Put a number on work he has not seen. Everything he cannot determine, he
 * prices as a risk, and the number he picks for a risk is always larger than
 * the truth. So the cost of a vague package is not that he refuses it — he
 * accepts it, and quietly charges us for the vagueness.
 *
 * A bid request today is a title and a paragraph somebody retyped. This builds
 * the package from the scope itself: his lines, his quantities, in the order
 * they happen, with the inspections that constrain him named.
 *
 * WHAT A PACKAGE MUST NEVER CONTAIN
 *
 * Our money. Not our labour rate, not our material cost, not our margin, and
 * not what we have budgeted for his trade. `PackageLine` has no price field at
 * all, which is deliberate — the type makes the leak impossible rather than
 * relying on somebody remembering. The bid room is read by outside
 * organisations, and a budget shown to a bidder is a floor he bids just under.
 *
 * THE INSPECTIONS ARE THE PART THAT GETS MISSED
 *
 * A trade needs three things about hold points, and asking after the fact is
 * how a schedule slips: what must pass before he can start, what falls inside
 * his own span so that part of his work is inspected before he continues, and
 * which inspection his work must be complete for. The last one is the real
 * deadline, and it is almost never the date on the request.
 */
import {
  type Scope, type ScopeLine, type PhaseId, type Confidence,
  PHASES, phaseOf,
} from './scopeModel';

/**
 * One line as a subcontractor sees it.
 *
 * No price, by construction. See the note at the top of the file — this
 * omission is the point, not an oversight.
 */
export interface PackageLine {
  /** Our scope line it came from, so what returns can be put back. */
  sourceLineId: string;
  phase: PhaseId;
  description: string;
  qty: number;
  unit: string;
  /**
   * Told to him honestly.
   *
   * A quantity taken off photographs and one confirmed on site are worth
   * different things to a bidder, and hiding the difference is how an
   * indicative figure becomes a fixed price nobody meant to give.
   */
  confidence: Confidence;
  sortOrder: number;
}

export interface BidPackage {
  /** The trade as the scope names it — 'electrical', 'tile'. */
  trade: string;
  lines: PackageLine[];
  firstPhase: PhaseId;
  lastPhase: PhaseId;
  /** The inspection that must pass before he may start. */
  waitFor?: string;
  /** Inspections falling inside his own span of work. */
  within: string[];
  /** The inspection his work must be complete and signed off for. */
  completeBefore?: string;
}

export interface PackageGap {
  /** `blocking` means it must not be sent. `warning` means send it knowing. */
  severity: 'blocking' | 'warning';
  message: string;
}

const orderOf = (p: PhaseId) => phaseOf(p).order;

/** 'rough-electrical' → 'Rough electrical'. Trades are free text in the scope. */
export function tradeLabel(trade: string): string {
  const t = (trade || '').replace(/[-_]+/g, ' ').trim();
  return t ? t[0].toUpperCase() + t.slice(1) : 'Unassigned';
}

/**
 * Which inspections constrain a trade working between two phases.
 *
 * `completeBefore` is the one that matters most and the one nobody is told.
 * It is the first hold point at or after his last phase — his work has to be
 * finished and signed off before it, which is usually earlier than whatever
 * date is printed on the request.
 */
export function holdPointsFor(first: PhaseId, last: PhaseId): {
  waitFor?: string; within: string[]; completeBefore?: string;
} {
  const lo = orderOf(first);
  const hi = orderOf(last);
  const held = PHASES.filter(p => p.holdPoint);

  // The latest hold point strictly before he starts. Earlier ones have already
  // passed by then and telling him about all of them is noise.
  const before = held.filter(p => p.order < lo).sort((a, b) => b.order - a.order)[0];

  // Inside his span — he works across it, so part of his work is inspected
  // before the rest may continue.
  const within = held
    .filter(p => p.order >= lo && p.order < hi)
    .map(p => p.holdPoint!);

  // The first at or after he finishes.
  const after = held.filter(p => p.order >= hi).sort((a, b) => a.order - b.order)[0];

  return {
    waitFor: before?.holdPoint,
    within,
    completeBefore: after?.holdPoint,
  };
}

/**
 * The scope, split into one package per trade.
 *
 * Only lines marked as going out. A trade we self-perform has no business
 * appearing in somebody's inbox, and a package mixing the two invites a bid on
 * work we are already doing ourselves.
 */
export function packagesFor(scope: Scope): BidPackage[] {
  const byTrade = new Map<string, ScopeLine[]>();
  for (const l of scope.lines) {
    if (!l.bidOut) continue;
    const key = (l.trade || '').trim() || 'unassigned';
    const list = byTrade.get(key);
    list ? list.push(l) : byTrade.set(key, [l]);
  }

  const packages: BidPackage[] = [];
  for (const [trade, lines] of byTrade) {
    // In build order, so it reads as his sequence of work rather than as the
    // order somebody happened to type it.
    const sorted = [...lines].sort((a, b) => orderOf(a.phase) - orderOf(b.phase));
    const first = sorted[0].phase;
    const last = sorted[sorted.length - 1].phase;
    const holds = holdPointsFor(first, last);

    packages.push({
      trade,
      firstPhase: first,
      lastPhase: last,
      ...holds,
      lines: sorted.map((l, i) => ({
        sourceLineId: l.id,
        phase: l.phase,
        description: l.description,
        qty: l.qty,
        unit: l.unit,
        confidence: l.confidence,
        sortOrder: i,
      })),
    });
  }

  // Packages themselves in build order, so the trades that hold up everything
  // else are the ones at the top of the screen.
  return packages.sort((a, b) => orderOf(a.firstPhase) - orderOf(b.firstPhase));
}

/**
 * What is wrong with a package, before somebody else sees it.
 *
 * Blocking gaps stop it being sent. They are the ones that would produce a
 * padded number or an argument later — a line with no quantity is not a
 * request, it is an invitation to guess.
 */
export function packageGaps(
  pkg: BidPackage,
  ctx: { site?: string; walkthroughDone?: boolean } = {},
): PackageGap[] {
  const gaps: PackageGap[] = [];

  if (!pkg.lines.length) {
    gaps.push({ severity: 'blocking', message: 'Nothing is in this package.' });
    return gaps;
  }

  const noQty = pkg.lines.filter(l => !(l.qty > 0));
  if (noQty.length) {
    gaps.push({
      severity: 'blocking',
      message: `${noQty.length} line${noQty.length === 1 ? ' has' : 's have'} no quantity — `
        + `${noQty.slice(0, 2).map(l => `“${l.description}”`).join(', ')}`
        + `${noQty.length > 2 ? ', and others' : ''}. He would have to guess, and he will guess high.`,
    });
  }

  const noUnit = pkg.lines.filter(l => !(l.unit || '').trim());
  if (noUnit.length) {
    gaps.push({
      severity: 'blocking',
      message: `${noUnit.length} line${noUnit.length === 1 ? ' has' : 's have'} a quantity but no unit. `
        + 'A number without a unit means nothing to price against.',
    });
  }

  if (!(ctx.site || '').trim()) {
    gaps.push({
      severity: 'blocking',
      message: 'No site address. Travel, parking and access are real costs and he cannot price them blind.',
    });
  }

  const provisional = pkg.lines.filter(l => l.confidence === 'provisional').length;
  if (provisional === pkg.lines.length && !ctx.walkthroughDone) {
    gaps.push({
      severity: 'warning',
      message: 'Every quantity here is provisional and nobody has walked the job. '
        + 'Send it if you want an indicative number, but say so — a bid against unconfirmed '
        + 'quantities is not a price.',
    });
  } else if (provisional > 0) {
    gaps.push({
      severity: 'warning',
      message: `${provisional} of ${pkg.lines.length} quantities are still provisional. `
        + 'They are marked as such on his copy.',
    });
  }

  return gaps;
}

/** A package with no blocking gap may go out. */
export function isSendable(
  pkg: BidPackage,
  ctx: { site?: string; walkthroughDone?: boolean } = {},
): boolean {
  return !packageGaps(pkg, ctx).some(g => g.severity === 'blocking');
}

/** The title on the bid request, which is the subject line of his email. */
export function packageTitle(pkg: BidPackage, jobTitle?: string): string {
  const job = (jobTitle || '').trim();
  return job ? `${tradeLabel(pkg.trade)} — ${job}` : tradeLabel(pkg.trade);
}

/**
 * The sequencing paragraph that goes with the lines.
 *
 * Written as prose because it is the part he reads rather than scans, and
 * because a hold point rendered as a field gets skipped.
 */
export function sequencingNote(pkg: BidPackage): string {
  const parts: string[] = [];
  const first = phaseOf(pkg.firstPhase).label;
  const last = phaseOf(pkg.lastPhase).label;

  parts.push(pkg.firstPhase === pkg.lastPhase
    ? `This work sits in ${first.toLowerCase()}.`
    : `This work runs from ${first.toLowerCase()} through ${last.toLowerCase()}.`);

  if (pkg.waitFor) parts.push(`You cannot start until ${pkg.waitFor.toLowerCase()} has passed.`);
  for (const w of pkg.within) {
    parts.push(`${w} falls inside your work — the part before it must be complete and signed off before you carry on.`);
  }
  if (pkg.completeBefore) {
    parts.push(`Your work must be finished and signed off before ${pkg.completeBefore.toLowerCase()}, which is the date that actually governs, not the bid deadline.`);
  }
  return parts.join(' ');
}

/** One line about a package, for the review screen. */
export function packageNote(pkg: BidPackage, ctx: { site?: string; walkthroughDone?: boolean } = {}): string {
  const gaps = packageGaps(pkg, ctx);
  const blocking = gaps.filter(g => g.severity === 'blocking');
  if (blocking.length) return blocking[0].message;
  const warning = gaps.find(g => g.severity === 'warning');
  if (warning) return warning.message;
  return `${pkg.lines.length} line${pkg.lines.length === 1 ? '' : 's'}, every quantity confirmed. Ready to go out.`;
}

/**
 * Put a returned per-line price back onto our scope.
 *
 * The bid room's own return path, as distinct from the reader that handles a
 * subcontractor who sends a photograph. Because his lines came from ours, the
 * mapping is exact and nothing has to be guessed — which is the entire reason
 * the lines are sent as rows rather than as a paragraph.
 *
 * Amounts add rather than replace, matching the reader, so a trade that
 * returns two prices against one of our lines behaves the same either way.
 */
export function amountsFromReturnedLines(
  returned: Array<{ sourceLineId: string; amount: number }>,
  ourLineIds: Set<string>,
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const r of returned) {
    // A price against a line we do not have is dropped rather than created.
    // The alternative is money attached to nothing.
    if (!ourLineIds.has(r.sourceLineId)) continue;
    const amount = Number(r.amount);
    if (!Number.isFinite(amount) || amount < 0) continue;
    out[r.sourceLineId] = Math.round(((out[r.sourceLineId] || 0) + amount) * 100) / 100;
  }
  return out;
}
