/**
 * The walkthrough — standing in the building and finding out what is true.
 *
 * WHY IT IS A SHEET AND NOT A CHECKBOX
 *
 * Because nobody measures forty lines. Standing in a kitchen tells you the
 * cabinet run and teaches you nothing about the joist spacing under the floor.
 * A single button promoting every quantity to "confirmed" makes an estimate
 * look like a measurement, which is precisely the failure the confidence field
 * exists to prevent — `scopeModel`'s own header says so.
 *
 * So each line is confirmed on its own, carrying what was actually measured.
 * The ones nobody put a tape on can still be accepted as estimated, out loud,
 * rather than being quietly promoted.
 *
 * THE PART PEOPLE FORGET THE WALK IS FOR
 *
 * Not ticking off what is already on the list. Finding what is not. The joist
 * that is cut, the panel that is full, the wall that turned out to be bearing.
 * A screen that can only confirm known lines cannot record the reason the visit
 * was worth making, so discoveries are first-class here.
 *
 * AND THE THIRD THING, WHICH IS MONEY
 *
 * Conditions are not quantities and cost real money anyway: no parking, three
 * flights and no lift, an occupied house, a dog, an eight-to-four noise
 * window. A subcontractor who is not told these prices them as risk, and his
 * guess is always worse than the truth.
 */
import type { Scope, ScopeLine, Confidence } from './scopeModel';
import { phaseOf } from './scopeModel';

/* ── what happened to a line on site ──────────────────────────────────── */

/**
 * How a quantity came to be what it is.
 *
 * `measured` and `accepted` are both confirmations and they are not the same
 * claim. One means somebody put a tape on it; the other means somebody looked
 * and was content with the desk figure. Recording which is the whole point.
 */
export type LineVerdict = 'measured' | 'accepted' | 'unvisited';

export interface LineCheck {
  lineId: string;
  verdict: LineVerdict;
  /** What the tape said, when it was measured and differed. */
  measuredQty?: number;
  note?: string;
}

/* ── conditions ───────────────────────────────────────────────────────── */

export interface SiteCondition {
  id: string;
  label: string;
  /** Why it costs money, said plainly — it is what makes anyone tick it. */
  why: string;
}

/**
 * The things that cost money and are not quantities.
 *
 * Every one of these has been the subject of an argument on a real job. They
 * are asked once, per site, and they travel to the subcontractor because he
 * prices their absence as risk.
 */
export const SITE_CONDITIONS: SiteCondition[] = [
  { id: 'no-parking', label: 'No parking at the property', why: 'Loading a van from two streets away is time on every trip, every day.' },
  { id: 'no-lift', label: 'Upper floor, no lift', why: 'Everything is carried. It changes the labour on materials, not the materials.' },
  { id: 'occupied', label: 'Occupied while we work', why: 'Protection, tidying every night, and no working past the family.' },
  { id: 'restricted-hours', label: 'Restricted working hours', why: 'A condo or a town by-law can cut the day short, which stretches the programme.' },
  { id: 'pets', label: 'Pets on site', why: 'Doors get closed, gates get made, and nobody wants to be the one who lost the cat.' },
  { id: 'shared-access', label: 'Shared entrance or common area', why: 'The association has a say, and protection of common parts is on us.' },
  { id: 'no-staging', label: 'Nowhere to stage materials', why: 'Deliveries have to be timed to the day rather than dropped.' },
  { id: 'asbestos-suspect', label: 'Suspected asbestos or lead', why: 'Pre-1978 finishes stop the job dead until it is tested. Better known now than on demolition day.' },
  { id: 'water-shutoff', label: 'Shut-off is not where it should be', why: 'A plumber who cannot isolate cannot start, and finding out on the day costs the day.' },
  { id: 'panel-full', label: 'Panel is full or undersized', why: 'A sub-panel or a service upgrade is a different job from adding a circuit.' },
  { id: 'low-headroom', label: 'Low headroom or tight stair', why: 'Sheets, tubs and cabinets have to physically fit through the building.' },
  { id: 'active-leak', label: 'Active leak or water damage', why: 'Nothing goes back until the source is dealt with, whatever the schedule says.' },
];

export function conditionById(id: string): SiteCondition | undefined {
  return SITE_CONDITIONS.find(c => c.id === id);
}

/**
 * The conditions, written for the subcontractor's copy of the package.
 *
 * Carried to him deliberately. Every one of these is a cost he will otherwise
 * discover on the first morning and price as risk on every job afterwards, and
 * a padded number is what not telling him buys. Told plainly, he prices the
 * actual inconvenience once.
 */
export function conditionsNote(ids: string[]): string {
  const found = ids.map(conditionById).filter(Boolean) as SiteCondition[];
  if (!found.length) return '';
  return 'Site conditions you should price for: '
    + found.map(c => c.label.toLowerCase()).join('; ') + '.';
}

/* ── the record ───────────────────────────────────────────────────────── */

export interface Walkthrough {
  /** ISO date the walk happened. */
  walkedOn?: string;
  /** Who walked it. */
  walkedBy?: string;
  /** Whether the customer was there — it decides what was agreed vs observed. */
  withCustomer?: boolean;
  checks: LineCheck[];
  conditionIds: string[];
  /** Free notes for anything the checklist has no box for. */
  notes?: string;
}

export const BLANK_WALKTHROUGH: Walkthrough = { checks: [], conditionIds: [] };

/** A tolerant read, so a project saved before this existed still opens. */
export function readWalkthrough(raw: any): Walkthrough {
  if (!raw || typeof raw !== 'object') return BLANK_WALKTHROUGH;
  return {
    walkedOn: typeof raw.walkedOn === 'string' ? raw.walkedOn : undefined,
    walkedBy: typeof raw.walkedBy === 'string' ? raw.walkedBy : undefined,
    withCustomer: raw.withCustomer === true,
    checks: Array.isArray(raw.checks) ? raw.checks.filter((c: any) => c && typeof c.lineId === 'string') : [],
    conditionIds: Array.isArray(raw.conditionIds) ? raw.conditionIds.map(String) : [],
    notes: typeof raw.notes === 'string' ? raw.notes : undefined,
  };
}

export function checkFor(w: Walkthrough, lineId: string): LineCheck | undefined {
  return w.checks.find(c => c.lineId === lineId);
}

/* ── the sheet ────────────────────────────────────────────────────────── */

export interface SheetRow {
  line: ScopeLine;
  check?: LineCheck;
  /** What the quantity would become if this check were applied. */
  effectiveQty: number;
  /** Set when a measurement disagreed with the desk figure. */
  delta?: number;
}

/**
 * The lines to walk, in the order you would walk them.
 *
 * Build order rather than the order they were typed, because that is how the
 * building reads: foundation, framing, then the things that hide them. Already
 * confirmed lines stay on the sheet rather than disappearing — a second visit
 * exists to find what changed, and a list that hides settled lines cannot show
 * that one of them moved.
 */
export function sheetFor(scope: Scope, w: Walkthrough): SheetRow[] {
  return [...scope.lines]
    .sort((a, b) => phaseOf(a.phase).order - phaseOf(b.phase).order)
    .map(line => {
      const check = checkFor(w, line.id);
      const measured = check?.verdict === 'measured' && typeof check.measuredQty === 'number'
        ? check.measuredQty
        : undefined;
      return {
        line,
        check,
        effectiveQty: measured ?? line.qty,
        delta: measured !== undefined && measured !== line.qty
          ? Math.round((measured - line.qty) * 1000) / 1000
          : undefined,
      };
    });
}

export interface WalkProgress {
  total: number;
  measured: number;
  accepted: number;
  unvisited: number;
  /** Lines a tape disagreed with. The reason the visit paid for itself. */
  corrected: number;
}

export function progressOf(scope: Scope, w: Walkthrough): WalkProgress {
  const rows = sheetFor(scope, w);
  return {
    total: rows.length,
    measured: rows.filter(r => r.check?.verdict === 'measured').length,
    accepted: rows.filter(r => r.check?.verdict === 'accepted').length,
    unvisited: rows.filter(r => !r.check || r.check.verdict === 'unvisited').length,
    corrected: rows.filter(r => r.delta !== undefined).length,
  };
}

/** One honest sentence about how much of this has been stood in front of. */
export function walkNote(scope: Scope, w: Walkthrough): string {
  const p = progressOf(scope, w);
  if (!p.total) return 'Nothing scoped yet, so there is nothing to walk.';
  if (!p.measured && !p.accepted) {
    return `${p.total} lines, none of them walked. Every quantity here came off photographs.`;
  }
  const parts = [`${p.measured} measured`, `${p.accepted} accepted as estimated`];
  if (p.unvisited) parts.push(`${p.unvisited} not looked at`);
  const head = parts.join(', ') + '.';
  return p.corrected
    ? `${head} ${p.corrected} quantit${p.corrected === 1 ? 'y was' : 'ies were'} wrong and the walk caught ${p.corrected === 1 ? 'it' : 'them'}.`
    : head;
}

/* ── applying it ──────────────────────────────────────────────────────── */

/**
 * Write the walk onto the scope.
 *
 * A measured line takes the measured quantity and becomes confirmed. A line
 * accepted as estimated becomes confirmed too — somebody looked and was
 * content — but keeps the desk figure and says so in its basis, which is the
 * distinction that survives into the quote six weeks later.
 *
 * A line nobody visited is left exactly as it was. Not touched, not promoted,
 * not quietly reworded. It stays provisional because it still is.
 */
export function applyWalkthrough(scope: Scope, w: Walkthrough): Scope {
  return {
    ...scope,
    walkthroughDone: w.checks.some(c => c.verdict !== 'unvisited'),
    lines: scope.lines.map(l => {
      const check = checkFor(w, l.id);
      if (!check || check.verdict === 'unvisited') return l;

      if (check.verdict === 'measured') {
        const qty = typeof check.measuredQty === 'number' && check.measuredQty > 0
          ? check.measuredQty
          : l.qty;
        return {
          ...l,
          qty,
          confidence: 'confirmed' as Confidence,
          basis: `measured on site${w.walkedOn ? ` on ${w.walkedOn}` : ''}`,
        };
      }

      return {
        ...l,
        confidence: 'confirmed' as Confidence,
        basis: 'estimated at the desk, accepted on site without measuring',
      };
    }),
  };
}

/* ── what a correction does to somebody who already bid ───────────────── */

export interface BidImpact {
  lineId: string;
  description: string;
  wasQty: number;
  nowQty: number;
  /** Positive means there is more work than he priced. */
  delta: number;
}

/**
 * Quantities that moved after a subcontractor had already priced them.
 *
 * His number was for a different job. That is not something to absorb quietly:
 * either he re-prices or we eat the difference, and the choice belongs to
 * whoever is looking at this screen rather than to whoever notices first on
 * site. Only lines carrying a returned bid are reported, because a line nobody
 * has priced can change freely.
 */
export function bidsAffectedBy(scope: Scope, w: Walkthrough): BidImpact[] {
  const out: BidImpact[] = [];
  for (const l of scope.lines) {
    if (typeof l.bidAmount !== 'number') continue;
    const check = checkFor(w, l.id);
    if (check?.verdict !== 'measured') continue;
    if (typeof check.measuredQty !== 'number' || check.measuredQty === l.qty) continue;
    out.push({
      lineId: l.id,
      description: l.description,
      wasQty: l.qty,
      nowQty: check.measuredQty,
      delta: Math.round((check.measuredQty - l.qty) * 1000) / 1000,
    });
  }
  return out;
}

/** What to say about that, or empty when nothing is affected. */
export function bidImpactNote(impacts: BidImpact[]): string {
  if (!impacts.length) return '';
  const more = impacts.filter(i => i.delta > 0).length;
  const less = impacts.length - more;
  const parts: string[] = [];
  if (more) parts.push(`${more} where there is more work than he priced`);
  if (less) parts.push(`${less} where there is less`);
  return `${impacts.length} line${impacts.length === 1 ? '' : 's'} already carry a returned bid `
    + `and the walk moved the quantity — ${parts.join(', ')}. `
    + `His price was for a different job. Settle it with him rather than absorbing it.`;
}
