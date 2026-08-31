/**
 * Turning "the customer wants a kitchen" into a process.
 *
 * WHY A STARTER RATHER THAN A BLANK PAGE
 *
 * A work request says what somebody wants — a kitchen, a bathroom, a deck — and
 * the scope says how it gets done. Between those two is twenty minutes of
 * typing out the same twelve phases somebody has typed a hundred times, and
 * every time it is typed fresh something gets left off. Usually the dumpster,
 * the dust barrier, or the temporary power.
 *
 * So a request becomes a draft process, and the estimator's job becomes editing
 * rather than remembering. That is the difference between a scope that is
 * complete because somebody was careful and one that is complete because it
 * started complete.
 *
 * WHAT A STARTER IS NOT
 *
 * It is not a quote and it carries no quantities worth trusting. Every line
 * comes in provisional, most with a quantity of one, because the point is the
 * shape of the job rather than its size. The trade tools and the walkthrough
 * fill in the numbers.
 */
import type { ScopeLine, PhaseId } from './scopeModel';

export interface StarterLine {
  phase: PhaseId;
  trade: string;
  description: string;
  unit: string;
  qty?: number;
  /** Suggested rather than assumed — a sub is a decision about this job. */
  bidOut?: boolean;
}

export interface Starter {
  id: string;
  label: string;
  /** Matched against a work request's serviceType, case-insensitively. */
  matches: string[];
  blurb: string;
  lines: StarterLine[];
}

/** The lines every job of any size gets, whatever the trade. */
const SITE_LINES: StarterLine[] = [
  { phase: 'mobilise', trade: 'laboring', description: 'Mobilise and set up', unit: 'job' },
  { phase: 'protection', trade: 'laboring', description: 'Floor protection and ram board', unit: 'job' },
  { phase: 'protection', trade: 'laboring', description: 'Dust barriers and zip walls', unit: 'job' },
  { phase: 'protection', trade: 'laboring', description: 'Cover furniture and contents', unit: 'job' },
  { phase: 'demolition', trade: 'laboring', description: 'Dumpster and hauling', unit: 'job' },
  { phase: 'final-clean', trade: 'laboring', description: 'Final clean', unit: 'job' },
];

export const STARTERS: Starter[] = [
  {
    id: 'kitchen-gut',
    label: 'Kitchen — full gut',
    matches: ['kitchen'],
    blurb: 'Strip to studs, rough in, then finishes. The usual twelve phases.',
    lines: [
      ...SITE_LINES,
      { phase: 'demolition', trade: 'laboring', description: 'Strip out kitchen', unit: 'sq ft' },
      { phase: 'framing', trade: 'carpentry', description: 'Framing changes and blocking', unit: 'job' },
      { phase: 'rough-electrical', trade: 'electrical', description: 'Rough electrical', unit: 'job', bidOut: true },
      { phase: 'rough-plumbing', trade: 'plumbing', description: 'Rough plumbing', unit: 'job', bidOut: true },
      { phase: 'rough-hvac', trade: 'hvac', description: 'Ventilation and make-up air', unit: 'job', bidOut: true },
      { phase: 'low-voltage', trade: 'electrical', description: 'Under-cabinet and low voltage', unit: 'job' },
      { phase: 'insulation', trade: 'laboring', description: 'Insulation to opened walls', unit: 'sq ft' },
      { phase: 'drywall', trade: 'drywall', description: 'Hang and finish sheetrock', unit: 'sq ft' },
      { phase: 'tile', trade: 'tile', description: 'Backsplash tile', unit: 'sq ft' },
      { phase: 'flooring', trade: 'flooring', description: 'Kitchen floor', unit: 'sq ft' },
      { phase: 'cabinets', trade: 'carpentry', description: 'Hang cabinets', unit: 'ea' },
      { phase: 'countertops', trade: 'carpentry', description: 'Template and set worktop', unit: 'sq ft' },
      { phase: 'trim', trade: 'carpentry', description: 'Trim, toe kick and crown', unit: 'lin ft' },
      { phase: 'paint', trade: 'painting', description: 'Prime and paint', unit: 'sq ft' },
      { phase: 'fixtures', trade: 'plumbing', description: 'Set sink, tap and appliances', unit: 'job' },
    ],
  },
  {
    id: 'bathroom-gut',
    label: 'Bathroom — full gut',
    matches: ['bathroom', 'bath'],
    blurb: 'Smaller than a kitchen and tighter. Waterproofing and ventilation matter more.',
    lines: [
      ...SITE_LINES,
      { phase: 'demolition', trade: 'laboring', description: 'Strip out bathroom', unit: 'sq ft' },
      { phase: 'framing', trade: 'carpentry', description: 'Framing changes and blocking', unit: 'job' },
      { phase: 'rough-plumbing', trade: 'plumbing', description: 'Rough plumbing and shower valve', unit: 'job', bidOut: true },
      { phase: 'rough-electrical', trade: 'electrical', description: 'Rough electrical and GFCI', unit: 'job', bidOut: true },
      { phase: 'rough-hvac', trade: 'hvac', description: 'Extract fan, ducted outside', unit: 'ea', bidOut: true },
      { phase: 'insulation', trade: 'laboring', description: 'Insulation to opened walls', unit: 'sq ft' },
      { phase: 'drywall', trade: 'drywall', description: 'Cement board and sheetrock', unit: 'sq ft' },
      { phase: 'tile', trade: 'tile', description: 'Waterproofing to wet areas', unit: 'sq ft' },
      { phase: 'tile', trade: 'tile', description: 'Set tile', unit: 'sq ft' },
      { phase: 'flooring', trade: 'flooring', description: 'Bathroom floor', unit: 'sq ft' },
      { phase: 'cabinets', trade: 'carpentry', description: 'Set vanity', unit: 'ea' },
      { phase: 'countertops', trade: 'carpentry', description: 'Vanity top', unit: 'ea' },
      { phase: 'trim', trade: 'carpentry', description: 'Trim and door', unit: 'job' },
      { phase: 'paint', trade: 'painting', description: 'Prime and paint', unit: 'sq ft' },
      { phase: 'fixtures', trade: 'plumbing', description: 'Set toilet, basin, shower and glass', unit: 'job' },
    ],
  },
  {
    id: 'deck',
    label: 'Deck',
    matches: ['deck', 'outdoor', 'patio deck'],
    blurb: 'Footings through railing. Frost depth decides the holes.',
    lines: [
      { phase: 'mobilise', trade: 'laboring', description: 'Mobilise and set up', unit: 'job' },
      { phase: 'demolition', trade: 'laboring', description: 'Tear out existing deck', unit: 'sq ft' },
      { phase: 'demolition', trade: 'laboring', description: 'Dumpster and hauling', unit: 'job' },
      { phase: 'excavation', trade: 'laboring', description: 'Dig footings to frost depth', unit: 'ea' },
      { phase: 'foundation', trade: 'masonry', description: 'Pour footings and set anchors', unit: 'ea' },
      { phase: 'framing', trade: 'carpentry', description: 'Ledger, beams, posts and joists', unit: 'sq ft' },
      { phase: 'flooring', trade: 'carpentry', description: 'Lay decking', unit: 'sq ft' },
      { phase: 'trim', trade: 'carpentry', description: 'Railing, stairs and fascia', unit: 'lin ft' },
      { phase: 'final-clean', trade: 'laboring', description: 'Final clean', unit: 'job' },
    ],
  },
  {
    id: 'structure',
    label: 'Roof-over, pavilion or pergola',
    matches: ['pergola', 'pavilion', 'carport', 'canopy', 'lean-to'],
    blurb: 'Posts, beams, rafters and covering. Snow load decides the members.',
    lines: [
      { phase: 'mobilise', trade: 'laboring', description: 'Mobilise and set up', unit: 'job' },
      { phase: 'excavation', trade: 'laboring', description: 'Dig footings to frost depth', unit: 'ea' },
      { phase: 'foundation', trade: 'masonry', description: 'Pour footings and set post bases', unit: 'ea' },
      { phase: 'framing', trade: 'carpentry', description: 'Posts, beams and rafters', unit: 'sq ft' },
      { phase: 'roofing', trade: 'roofing', description: 'Roof covering and flashing', unit: 'sq ft' },
      { phase: 'trim', trade: 'carpentry', description: 'Fascia and soffit', unit: 'lin ft' },
      { phase: 'final-clean', trade: 'laboring', description: 'Final clean', unit: 'job' },
    ],
  },
  {
    id: 'hardscape',
    label: 'Patio, walkway or steps',
    matches: ['patio', 'walkway', 'hardscape', 'paver', 'landscap'],
    blurb: 'Works from the hole up. The base and the digging usually cost more than the surface.',
    lines: [
      { phase: 'mobilise', trade: 'laboring', description: 'Mobilise and set up', unit: 'job' },
      { phase: 'excavation', trade: 'laboring', description: 'Excavate to depth', unit: 'cu yd' },
      { phase: 'excavation', trade: 'laboring', description: 'Haul off spoil', unit: 'cu yd' },
      { phase: 'foundation', trade: 'masonry', description: 'Compacted gravel base in lifts', unit: 'ton' },
      { phase: 'foundation', trade: 'masonry', description: 'Bedding sand', unit: 'ton' },
      { phase: 'flooring', trade: 'masonry', description: 'Lay pavers', unit: 'sq ft' },
      { phase: 'trim', trade: 'masonry', description: 'Edge restraint and polymeric sand', unit: 'lin ft' },
      { phase: 'final-clean', trade: 'laboring', description: 'Final clean', unit: 'job' },
    ],
  },
  {
    id: 'siding',
    label: 'Siding',
    matches: ['siding', 'exterior'],
    blurb: 'Strip, wrap, side and trim. Staging is labour, not material.',
    lines: [
      { phase: 'mobilise', trade: 'laboring', description: 'Staging and fall protection', unit: 'job' },
      { phase: 'demolition', trade: 'laboring', description: 'Strip existing siding', unit: 'sq ft' },
      { phase: 'demolition', trade: 'laboring', description: 'Dumpster and hauling', unit: 'job' },
      { phase: 'siding', trade: 'siding', description: 'House wrap and flashing', unit: 'sq ft' },
      { phase: 'siding', trade: 'siding', description: 'Install siding', unit: 'sq ft' },
      { phase: 'trim', trade: 'siding', description: 'Corners, trim and caulking', unit: 'lin ft' },
      { phase: 'final-clean', trade: 'laboring', description: 'Final clean', unit: 'job' },
    ],
  },
];

/**
 * The starter a work request points at, if any.
 *
 * Matched loosely on the service type, because a request saying "Bathroom" and
 * one saying "Master bath remodel" want the same process. Returns null rather
 * than guessing when nothing matches — a wrong starter is worse than none,
 * since it has to be unpicked line by line.
 */
export function starterFor(serviceType?: string, title?: string): Starter | null {
  const hay = `${serviceType || ''} ${title || ''}`.toLowerCase();
  if (!hay.trim()) return null;
  for (const s of STARTERS) {
    if (s.matches.some(m => hay.includes(m))) return s;
  }
  return null;
}

/**
 * A starter as scope lines.
 *
 * Everything provisional, because nothing here has been measured or looked at —
 * the shape is right and the numbers are not, and saying so is the difference
 * between a draft and a lie.
 */
export function linesFromStarter(starter: Starter): Array<Omit<ScopeLine, 'id'>> {
  return starter.lines.map(l => ({
    phase: l.phase,
    trade: l.trade,
    description: l.description,
    qty: l.qty ?? 1,
    unit: l.unit,
    confidence: 'provisional' as const,
    origin: 'template' as const,
    bidOut: l.bidOut,
    basis: `from the ${starter.label.toLowerCase()} starter — quantity not yet measured`,
  }));
}

/* ── trade takeoffs into scope lines ──────────────────────────────────────
 *
 * The architecture's rule: a trade tool generates scope lines rather than being
 * a destination. Kitchens and bathrooms were the only trades that could be
 * designed, scheduled and priced and then not become a job, because nothing
 * carried their takeoff across.
 */

export interface KitchenTakeoff {
  /** Boxes to hang, from the cabinet schedule. */
  cabinetCount: number;
  /** Handles and hinges. */
  hardwareCount: number;
  counterSqFt: number;
  counterLinearFt: number;
  backsplashSqFt: number;
  sinkCutouts: number;
  /** Appliances or sanitaryware placed in the room. */
  fixtures: string[];
  kind: 'kitchen' | 'bathroom';
}

/**
 * A room takeoff as the work it implies.
 *
 * Quantities come across confirmed-looking but are marked provisional, because
 * a cabinet count from a drawing is only as good as the room it was drawn in —
 * and the room has usually not been measured yet.
 */
export function linesFromRoom(t: KitchenTakeoff): Array<Omit<ScopeLine, 'id'>> {
  const out: Array<Omit<ScopeLine, 'id'>> = [];
  const base = { confidence: 'provisional' as const, origin: 'trade-tool' as const };

  if (t.cabinetCount > 0) {
    out.push({
      ...base, phase: 'cabinets', trade: 'carpentry',
      description: `Hang ${t.cabinetCount} ${t.kind === 'bathroom' ? 'vanity ' : ''}cabinet${t.cabinetCount === 1 ? '' : 's'}`,
      qty: t.cabinetCount, unit: 'ea', taskId: 'hang-cabinets',
      basis: 'from the cabinet schedule',
    });
  }
  if (t.hardwareCount > 0) {
    out.push({
      ...base, phase: 'cabinets', trade: 'carpentry',
      description: 'Fit handles and hinges',
      qty: t.hardwareCount, unit: 'ea',
      basis: 'one per door and drawer, from the schedule',
    });
  }
  if (t.counterSqFt > 0) {
    out.push({
      ...base, phase: 'countertops', trade: 'carpentry',
      description: 'Template and set worktop',
      qty: t.counterSqFt, unit: 'sq ft',
      basis: `${t.counterLinearFt} linear feet, measured off the cabinets`,
    });
  }
  if (t.sinkCutouts > 0) {
    out.push({
      ...base, phase: 'countertops', trade: 'carpentry',
      description: `Sink cutout${t.sinkCutouts === 1 ? '' : 's'}`,
      qty: t.sinkCutouts, unit: 'ea', basis: 'fabricator charge',
    });
  }
  if (t.backsplashSqFt > 0) {
    out.push({
      ...base, phase: 'tile', trade: 'tile',
      description: t.kind === 'bathroom' ? 'Tile to wet areas' : 'Backsplash tile',
      qty: t.backsplashSqFt, unit: 'sq ft', taskId: 'set-tile',
      basis: 'from the worktop run',
    });
  }
  for (const f of t.fixtures) {
    out.push({
      ...base, phase: 'fixtures',
      // Sanitaryware and appliances are set by different trades, and charging
      // both at one rate is wrong for both.
      trade: /toilet|basin|tub|shower|sink|bidet|vanity/i.test(f) ? 'plumbing' : 'carpentry',
      description: `Set ${f.toLowerCase()}`,
      qty: 1, unit: 'ea', basis: 'placed in the room layout',
    });
  }

  return out;
}
