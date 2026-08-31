/**
 * The scope of work — the detailed process a job actually follows.
 *
 * WHY THIS IS THE CENTRE OF THE DESIGN CENTRE
 *
 * A customer can ask for anything in a house. Everything downstream — the
 * quote, the bid packages, the schedule, the portal the customer watches — needs
 * one thing in the middle that says what is actually being done, in what order,
 * by whom, and how sure we are of the quantity. Nothing in this codebase did
 * that. Work requests, trade tools, quotes, the bid room, the pipeline and the
 * portals all existed and nothing joined them, which is why the app felt like
 * separate tools sharing an address.
 *
 * ORDER IS THE POINT
 *
 * This is a process, not a list. A gut runs demolition, framing, rough
 * electrical, rough plumbing, rough HVAC, low voltage, inspection, insulation,
 * sheetrock, tile, flooring, trim, paint. Inspection hold points sit between
 * phases and nothing after one may start before it passes.
 *
 * The order matters because **selections reach backwards**. A wall-mounted
 * television chosen while picking finishes creates blocking in framing and a
 * recessed outlet in electrical — both of which have to happen before the
 * sheetrock. A flat task list cannot express that. This can, and it is what
 * stops somebody cutting open a finished wall.
 *
 * QUOTING THE WHOLE JOB
 *
 * Consumables belong to the task, not to somebody's memory. Hang a cabinet and
 * you need screws, shims and filler; set tile and you need thinset, grout,
 * spacers and backer board. Those live inside the template so they are quoted
 * by construction rather than by recollection.
 *
 * A second class belongs to the job rather than any task, and gets missed more
 * often precisely because it belongs to no trade: protection, safety, and the
 * site itself. Those are asked for once, per job.
 */

/* ── the order of work ────────────────────────────────────────────────── */

export type PhaseId =
  | 'mobilise' | 'protection' | 'demolition' | 'excavation' | 'foundation'
  | 'framing' | 'roofing' | 'windows-doors' | 'siding'
  | 'rough-electrical' | 'rough-plumbing' | 'rough-hvac' | 'low-voltage'
  | 'insulation' | 'drywall' | 'tile' | 'flooring' | 'cabinets'
  | 'countertops' | 'trim' | 'paint' | 'fixtures' | 'final-clean';

export interface PhaseSpec {
  id: PhaseId;
  label: string;
  /** Position in the build. Lower happens first. */
  order: number;
  /**
   * An inspection that must pass before anything later may start.
   *
   * Named rather than implied, because the whole reason a rough inspection
   * exists is that it happens while the walls are still open — and the cost of
   * finding out afterwards is the sheetrock.
   */
  holdPoint?: string;
}

export const PHASES: PhaseSpec[] = [
  { id: 'mobilise', label: 'Mobilise', order: 10 },
  { id: 'protection', label: 'Protection and set-up', order: 20 },
  { id: 'demolition', label: 'Demolition', order: 30 },
  { id: 'excavation', label: 'Excavation', order: 40 },
  { id: 'foundation', label: 'Foundation', order: 50, holdPoint: 'Footing inspection' },
  { id: 'framing', label: 'Framing', order: 60 },
  { id: 'roofing', label: 'Roofing', order: 70 },
  { id: 'windows-doors', label: 'Windows and doors', order: 80 },
  { id: 'siding', label: 'Siding', order: 90 },
  { id: 'rough-electrical', label: 'Rough electrical', order: 100 },
  { id: 'rough-plumbing', label: 'Rough plumbing', order: 110 },
  { id: 'rough-hvac', label: 'Rough HVAC', order: 120 },
  { id: 'low-voltage', label: 'Low voltage and AV', order: 130,
    holdPoint: 'Rough inspection — framing, electrical, plumbing and mechanical' },
  { id: 'insulation', label: 'Insulation', order: 140, holdPoint: 'Insulation inspection' },
  { id: 'drywall', label: 'Sheetrock', order: 150 },
  { id: 'tile', label: 'Tile', order: 160 },
  { id: 'flooring', label: 'Flooring', order: 170 },
  { id: 'cabinets', label: 'Cabinets', order: 180 },
  { id: 'countertops', label: 'Worktops', order: 190 },
  { id: 'trim', label: 'Trim and carpentry', order: 200 },
  { id: 'paint', label: 'Paint', order: 210 },
  { id: 'fixtures', label: 'Fixtures and finals', order: 220 },
  { id: 'final-clean', label: 'Final clean', order: 230, holdPoint: 'Final inspection' },
];

export function phaseOf(id: PhaseId): PhaseSpec {
  return PHASES.find(p => p.id === id) || PHASES[0];
}

/* ── a line of work ───────────────────────────────────────────────────── */

/**
 * How sure the quantity is.
 *
 * A figure worked out at the desk from photographs and a figure confirmed on
 * site are both useful, and letting them look the same is how an indicative
 * number becomes a fixed price. The walkthrough is what promotes one to the
 * other.
 */
export type Confidence = 'provisional' | 'confirmed';

export type LineOrigin = 'trade-tool' | 'template' | 'job-standard' | 'manual';

export interface ScopeLine {
  id: string;
  phase: PhaseId;
  /** The trade that owns it — 'carpentry', 'electrical', 'tile'... */
  trade: string;
  description: string;
  qty: number;
  unit: string;
  confidence: Confidence;
  origin: LineOrigin;
  /** Set when this line is going out to a subcontractor rather than self-performed. */
  bidOut?: boolean;
  /**
   * The template this came from, when it came from one.
   *
   * Kept so the hours can be recomputed if the quantity changes, rather than
   * frozen at whatever they were when the line was added — a scope that is
   * edited and then priced off stale hours is worse than one that was never
   * priced.
   */
  taskId?: string;
  /**
   * What to look this up as in the vendor catalogues.
   *
   * Only material lines have one. A line without a SKU is either labour or
   * something nobody sells, and both are handled rather than dropped.
   */
  sku?: string;
  /** A subcontractor's returned number, once one has come back. */
  bidAmount?: number;
  /** Where the number came from, in words. */
  basis?: string;
  /** Free text for the crew. */
  note?: string;
}

export interface Scope {
  lines: ScopeLine[];
  /** Ticked once somebody has walked the job. */
  walkthroughDone: boolean;
}

export const BLANK_SCOPE: Scope = { lines: [], walkthroughDone: false };

let seq = 0;
const nid = () => `SL-${Date.now().toString(36)}-${(++seq).toString(36)}`;

export function addLine(scope: Scope, line: Omit<ScopeLine, 'id'>): Scope {
  return { ...scope, lines: [...scope.lines, { ...line, id: nid() }] };
}

/**
 * Lines in the order the work happens, and grouped by phase.
 *
 * A scope read out of order is a list. Read in order it is a process, and the
 * order is what makes it possible to see that the television needs blocking
 * before the sheetrock.
 */
export function byPhase(scope: Scope): Array<{ phase: PhaseSpec; lines: ScopeLine[] }> {
  const out: Array<{ phase: PhaseSpec; lines: ScopeLine[] }> = [];
  for (const phase of [...PHASES].sort((a, b) => a.order - b.order)) {
    const lines = scope.lines.filter(l => l.phase === phase.id);
    if (lines.length) out.push({ phase, lines });
  }
  return out;
}

/** Every hold point this scope actually passes through, in order. */
export function holdPoints(scope: Scope): Array<{ after: string; inspection: string }> {
  return byPhase(scope)
    .filter(g => g.phase.holdPoint)
    .map(g => ({ after: g.phase.label, inspection: g.phase.holdPoint! }));
}

/* ── task templates, and the consumables that come with them ──────────── */

export interface Consumable {
  description: string;
  qtyPer: number;
  unit: string;
  /** What the quantity is per — one cabinet, one square foot, one job. */
  per: 'each' | 'sqft' | 'lnft' | 'job';
}

export interface TaskTemplate {
  id: string;
  label: string;
  phase: PhaseId;
  trade: string;
  unit: string;
  /** Hours per unit. The builder's own productivity, adjustable. */
  hoursPer: number;
  consumables: Consumable[];
}

/**
 * The library.
 *
 * Deliberately small to begin with and shaped to grow: every job run through it
 * is a chance to correct an hours figure or add a consumable somebody had to
 * buy on the way to site. That accumulation is the asset — it is what makes the
 * tenth kitchen quote faster and more complete than the first.
 */
export const TASKS: TaskTemplate[] = [
  { id: 'hang-cabinets', label: 'Hang cabinets', phase: 'cabinets', trade: 'carpentry', unit: 'ea', hoursPer: 0.9,
    consumables: [
      { description: 'Cabinet screws', qtyPer: 8, unit: 'ea', per: 'each' },
      { description: 'Shims', qtyPer: 4, unit: 'ea', per: 'each' },
      { description: 'Filler and scribe', qtyPer: 0.2, unit: 'ea', per: 'each' },
    ] },
  { id: 'set-tile', label: 'Set tile', phase: 'tile', trade: 'tile', unit: 'sq ft', hoursPer: 0.22,
    consumables: [
      { description: 'Thinset', qtyPer: 0.02, unit: 'bag', per: 'sqft' },
      { description: 'Grout', qtyPer: 0.01, unit: 'bag', per: 'sqft' },
      { description: 'Spacers', qtyPer: 0.05, unit: 'bag', per: 'sqft' },
      { description: 'Backer board', qtyPer: 0.35, unit: 'sheet', per: 'sqft' },
      { description: 'Backer screws', qtyPer: 1.2, unit: 'ea', per: 'sqft' },
    ] },
  { id: 'hang-drywall', label: 'Hang and finish sheetrock', phase: 'drywall', trade: 'drywall', unit: 'sq ft', hoursPer: 0.05,
    consumables: [
      { description: 'Drywall screws', qtyPer: 1.5, unit: 'ea', per: 'sqft' },
      { description: 'Joint compound', qtyPer: 0.012, unit: 'bucket', per: 'sqft' },
      { description: 'Tape', qtyPer: 0.5, unit: 'ft', per: 'sqft' },
      { description: 'Corner bead', qtyPer: 0.04, unit: 'ft', per: 'sqft' },
    ] },
  { id: 'frame-wall', label: 'Frame wall', phase: 'framing', trade: 'carpentry', unit: 'lin ft', hoursPer: 0.35,
    consumables: [
      { description: 'Framing nails', qtyPer: 0.05, unit: 'box', per: 'lnft' },
      { description: 'Structural screws', qtyPer: 2, unit: 'ea', per: 'lnft' },
    ] },
  { id: 'lay-flooring', label: 'Lay flooring', phase: 'flooring', trade: 'flooring', unit: 'sq ft', hoursPer: 0.06,
    consumables: [
      { description: 'Underlayment', qtyPer: 1, unit: 'sq ft', per: 'sqft' },
      { description: 'Transition strips', qtyPer: 0.01, unit: 'ea', per: 'sqft' },
    ] },
  { id: 'interior-demo', label: 'Strip out', phase: 'demolition', trade: 'laboring', unit: 'sq ft', hoursPer: 0.08,
    consumables: [
      { description: 'Contractor bags', qtyPer: 0.02, unit: 'ea', per: 'sqft' },
      { description: 'Blades and consumables', qtyPer: 0.005, unit: 'ea', per: 'sqft' },
    ] },
];

export function taskById(id: string): TaskTemplate | undefined {
  return TASKS.find(t => t.id === id);
}

export interface ConsumableLine {
  description: string;
  qty: number;
  unit: string;
}

/**
 * What a quantity of a task actually consumes.
 *
 * Rounded up, because you cannot buy two thirds of a box of screws — and
 * rounding down is how a crew runs out at four o'clock.
 */
export function consumablesFor(task: TaskTemplate, qty: number): ConsumableLine[] {
  return task.consumables.map(c => ({
    description: c.description,
    qty: c.per === 'job' ? c.qtyPer : Math.ceil(c.qtyPer * Math.max(0, qty) * 100) / 100,
    unit: c.unit,
  }));
}

export function hoursFor(task: TaskTemplate, qty: number): number {
  return Math.round(task.hoursPer * Math.max(0, qty) * 100) / 100;
}

/* ── the lines that belong to the job rather than a trade ─────────────── */

export interface JobStandard {
  id: string;
  label: string;
  phase: PhaseId;
  trade: string;
  unit: string;
  /** Why it is here, so nobody deletes it without knowing what it was for. */
  why: string;
}

/**
 * Protection, safety and site.
 *
 * These get missed more than anything else because they belong to no trade —
 * there is nobody whose job it obviously is, so it falls off. Prompted once per
 * job rather than remembered.
 */
export const JOB_STANDARDS: JobStandard[] = [
  { id: 'floor-protection', label: 'Floor protection and ram board', phase: 'protection', trade: 'laboring', unit: 'job',
    why: 'Every route the crew walks. Cheaper than refinishing a hall floor.' },
  { id: 'dust-barrier', label: 'Dust barriers and zip walls', phase: 'protection', trade: 'laboring', unit: 'job',
    why: 'A lived-in house during a gut. Dust reaches every room without one.' },
  { id: 'cover-contents', label: 'Cover furniture and contents', phase: 'protection', trade: 'laboring', unit: 'job',
    why: 'Their belongings are in the room whether or not the estimate says so.' },
  { id: 'dumpster', label: 'Dumpster and hauling', phase: 'demolition', trade: 'laboring', unit: 'job',
    why: 'Everything taken out has to leave. Usually more than one pull.' },
  { id: 'portable-toilet', label: 'Portable toilet', phase: 'mobilise', trade: 'laboring', unit: 'job',
    why: 'On anything running more than a few days without a usable bathroom.' },
  { id: 'fall-protection', label: 'Fall protection and staging', phase: 'mobilise', trade: 'laboring', unit: 'job',
    why: 'Anything above one storey. Not optional and not free.' },
  { id: 'temporary-power', label: 'Temporary power and lighting', phase: 'mobilise', trade: 'electrical', unit: 'job',
    why: 'A gutted space has no working circuits and no daylight in the middle.' },
  { id: 'daily-clean', label: 'Daily clean-up', phase: 'protection', trade: 'laboring', unit: 'job',
    why: 'A tidy site is faster and it is what a customer judges you on daily.' },
  { id: 'final-clean', label: 'Final clean', phase: 'final-clean', trade: 'laboring', unit: 'job',
    why: 'Handover condition. Always underestimated.' },
];

/* ── the completeness check ───────────────────────────────────────────── */

export interface Gap {
  severity: 'missing' | 'worth-checking';
  message: string;
}

interface Rule {
  /** True when the rule applies to this scope. */
  when: (s: Scope) => boolean;
  /** True when the thing it wants is present. */
  satisfied: (s: Scope) => boolean;
  severity: Gap['severity'];
  message: string;
}

const has = (s: Scope, test: (l: ScopeLine) => boolean) => s.lines.some(test);
const inPhase = (s: Scope, p: PhaseId) => has(s, l => l.phase === p);
const mentions = (s: Scope, re: RegExp) => has(s, l => re.test(l.description));

/**
 * What a scope is missing.
 *
 * Deliberately not blocking. An exclusion may be entirely deliberate — the
 * customer is providing the dumpster, another trade is doing the demolition —
 * and software that refuses to proceed teaches people to click past it. The
 * point is to make an omission a decision rather than an accident.
 */
const RULES: Rule[] = [
  { when: s => inPhase(s, 'demolition'),
    satisfied: s => mentions(s, /dumpster|haul|disposal|skip/i),
    severity: 'missing',
    message: 'There is demolition here and nothing to take it away.' },

  { when: s => inPhase(s, 'tile'),
    satisfied: s => mentions(s, /thinset|mortar/i),
    severity: 'missing',
    message: 'Tile with no thinset. The consumables usually come with the task template.' },

  { when: s => inPhase(s, 'demolition') || inPhase(s, 'drywall'),
    satisfied: s => mentions(s, /dust barrier|zip wall|containment/i),
    severity: 'missing',
    message: 'Dust-making work in what is presumably a lived-in house, and no dust barrier.' },

  { when: s => s.lines.length > 0,
    satisfied: s => mentions(s, /protection|ram board|cover/i),
    severity: 'worth-checking',
    message: 'No floor protection. Every route the crew walks is worth covering.' },

  { when: s => inPhase(s, 'rough-electrical') || inPhase(s, 'rough-plumbing'),
    satisfied: s => inPhase(s, 'insulation') || inPhase(s, 'drywall'),
    severity: 'worth-checking',
    message: 'Rough-in with nothing closing the walls afterwards. Is somebody else doing that?' },

  { when: s => inPhase(s, 'drywall'),
    satisfied: s => inPhase(s, 'paint'),
    severity: 'worth-checking',
    message: 'Sheetrock and no paint. Deliberate, or missed?' },

  { when: s => s.lines.length > 3,
    satisfied: s => mentions(s, /final clean|clean/i),
    severity: 'worth-checking',
    message: 'No clean-up line. It is always more work than it sounds.' },

  { when: s => inPhase(s, 'cabinets'),
    satisfied: s => inPhase(s, 'countertops'),
    severity: 'worth-checking',
    message: 'Cabinets with no worktop.' },
];

export function findGaps(scope: Scope): Gap[] {
  return RULES
    .filter(r => r.when(scope) && !r.satisfied(scope))
    .map(r => ({ severity: r.severity, message: r.message }));
}

/* ── what the scope adds up to ────────────────────────────────────────── */

export interface ScopeSummary {
  lines: number;
  phases: number;
  provisional: number;
  confirmed: number;
  bidOut: number;
  selfPerformed: number;
  trades: string[];
  holdPoints: number;
}

export function summarise(scope: Scope): ScopeSummary {
  const trades = [...new Set(scope.lines.map(l => l.trade))].sort();
  return {
    lines: scope.lines.length,
    phases: byPhase(scope).length,
    provisional: scope.lines.filter(l => l.confidence === 'provisional').length,
    confirmed: scope.lines.filter(l => l.confidence === 'confirmed').length,
    bidOut: scope.lines.filter(l => l.bidOut).length,
    selfPerformed: scope.lines.filter(l => !l.bidOut).length,
    trades,
    holdPoints: holdPoints(scope).length,
  };
}

/**
 * Confirm everything a walkthrough settled.
 *
 * All at once rather than line by line, because the walk is one event: somebody
 * stood in the room and looked. Lines added afterwards start provisional again,
 * which is correct — they were not there when anyone looked.
 */
export function confirmAll(scope: Scope): Scope {
  return {
    ...scope,
    walkthroughDone: true,
    lines: scope.lines.map(l => ({ ...l, confidence: 'confirmed' as Confidence })),
  };
}

/** One sentence on how much of this scope has actually been stood in front of. */
export function confidenceNote(scope: Scope): string {
  const s = summarise(scope);
  if (!s.lines) return 'Nothing scoped yet.';
  if (s.provisional === 0) return 'Every line confirmed on site.';
  if (s.confirmed === 0) {
    return `All ${s.lines} lines are provisional — worked out at the desk and not yet walked.`;
  }
  return `${s.confirmed} of ${s.lines} lines confirmed on site; ${s.provisional} still provisional.`;
}
