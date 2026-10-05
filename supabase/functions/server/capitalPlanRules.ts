/**
 * capitalPlanRules.ts — when each component is due, and what it will cost.
 *
 * The arithmetic behind the 10-Year Capital Plan ($129). Pure: no records, no
 * network. The gathering is `propertyReportData.ts` and the document is
 * `propertyReportContent.ts`; this is the part that has to be right.
 *
 * WHAT MAKES THIS WORTH $129 RATHER THAN A SPREADSHEET
 *
 * The plan's own words: costed *"through **our own** labour and materials
 * catalogue, which is the thing no competitor can copy"*. So a component's cost
 * is not a national average — it is our trade's hourly rate times the hours the
 * work takes, plus materials at our markup, plus the overhead and profit our
 * quotes carry. Those rates are learned from jobs the crews actually finished
 * (`labor_tasks:measured`, `labor_rates:global`), and a reserve study bought
 * anywhere else cannot reach them.
 *
 * Which means the report must say, per line, whether the figure came from our
 * rates or from a book default — a plan that mixes the two silently is the
 * competitor's product with our logo on it.
 *
 * WHAT IS ESTIMATED, AND WHY IT CANNOT BE HIDDEN
 *
 * Nothing on this platform records when a roof went on. Only `yearBuilt`. So
 * every component's age starts as the building's age, and the only thing that
 * moves a line off that assumption is an inspection that looked at it. The
 * output marks each line `seen` or `assumed`, and `dont-defer-to-engineers`
 * is why: it asks for the most accurate figure we can produce, not a confident
 * one. A plan claiming to know a 1962 roof's install year would be inventing
 * precision, and the owner would plan money around it.
 */

/** A trade we hold an hourly rate for, from `pricingDefaults.ts`. */
export type TradeId =
  | 'carpentry' | 'painting' | 'electrical' | 'plumbing' | 'laboring'
  | 'sheetrock' | 'siding' | 'roofing' | 'tile' | 'flooring' | 'masonry'
  | 'hvac' | 'power_washing';

export interface ComponentSpec {
  id: string;
  name: string;
  category: 'Building envelope' | 'Mechanical' | 'Interiors' | 'Site' | 'Safety';
  /** Which of our rates prices the labour. */
  trade: TradeId;
  /** Conventional service life in years, as reserve studies use. */
  usefulLife: number;
  /** Labour hours for one unit of this component. */
  hoursPerUnit: number;
  /** Materials for one unit, in dollars, before markup. */
  materialPerUnit: number;
  /** What a unit is, and how many of them a property has. */
  unit: string;
  /**
   * How the quantity is derived from the property record.
   *
   *   'per-property'   one, whatever the size
   *   'per-unit'       one per dwelling unit
   *   'per-sq-ft'      the property's square footage
   *   'roof-sq-ft'     footprint plus a pitch allowance — see quantityFor
   */
  basis: 'per-property' | 'per-unit' | 'per-sq-ft' | 'roof-sq-ft';
  /** Which markup band the materials fall in, matching STANDARD_PRICING. */
  materialCategory: string;
  /**
   * The inspection area whose condition speaks for this component, lower-cased.
   * Matched as a substring, so "Roof — south slope" still finds "roof".
   */
  areaKeywords: string[];
}

/**
 * The components a small residential property actually replaces.
 *
 * Deliberately NOT the association inventory in the reserve-fund calculator —
 * that one prices 24,000 sq ft of roofing and a pool liner, which is the wrong
 * document for a duplex. Lives follow the conventional reserve-study ranges;
 * hours and materials are ordinary New Hampshire residential figures and are
 * replaced by our own catalogue wherever it has published a task.
 */
export const COMPONENTS: ComponentSpec[] = [
  {
    id: 'roof-shingle', name: 'Asphalt shingle roof', category: 'Building envelope',
    trade: 'roofing', usefulLife: 25, hoursPerUnit: 0.022, materialPerUnit: 3.1,
    unit: 'sq ft', basis: 'roof-sq-ft', materialCategory: 'Roofing',
    areaKeywords: ['roof', 'shingle'],
  },
  {
    id: 'gutters', name: 'Gutters and downspouts', category: 'Building envelope',
    trade: 'carpentry', usefulLife: 20, hoursPerUnit: 0.09, materialPerUnit: 6.5,
    unit: 'lin ft', basis: 'per-property', materialCategory: 'Lumber',
    areaKeywords: ['gutter', 'downspout'],
  },
  {
    id: 'siding', name: 'Siding', category: 'Building envelope',
    trade: 'siding', usefulLife: 35, hoursPerUnit: 0.035, materialPerUnit: 4.1,
    unit: 'sq ft', basis: 'per-sq-ft', materialCategory: 'Lumber',
    areaKeywords: ['siding', 'exterior wall', 'clapboard'],
  },
  {
    id: 'windows', name: 'Windows', category: 'Building envelope',
    trade: 'carpentry', usefulLife: 30, hoursPerUnit: 2.5, materialPerUnit: 520,
    unit: 'window', basis: 'per-unit', materialCategory: 'Fixtures',
    areaKeywords: ['window'],
  },
  {
    id: 'exterior-doors', name: 'Exterior doors', category: 'Building envelope',
    trade: 'carpentry', usefulLife: 25, hoursPerUnit: 3.5, materialPerUnit: 780,
    unit: 'door', basis: 'per-unit', materialCategory: 'Fixtures',
    areaKeywords: ['door', 'entry'],
  },
  {
    id: 'exterior-paint', name: 'Exterior paint and trim', category: 'Building envelope',
    trade: 'painting', usefulLife: 8, hoursPerUnit: 0.018, materialPerUnit: 0.55,
    unit: 'sq ft', basis: 'per-sq-ft', materialCategory: 'Consumables',
    areaKeywords: ['paint', 'trim', 'exterior'],
  },
  {
    id: 'heating', name: 'Heating plant', category: 'Mechanical',
    trade: 'hvac', usefulLife: 22, hoursPerUnit: 14, materialPerUnit: 4800,
    unit: 'system', basis: 'per-property', materialCategory: 'Plumbing',
    areaKeywords: ['boiler', 'furnace', 'heat', 'hvac'],
  },
  {
    id: 'water-heater', name: 'Water heater', category: 'Mechanical',
    trade: 'plumbing', usefulLife: 12, hoursPerUnit: 4, materialPerUnit: 1250,
    unit: 'heater', basis: 'per-unit', materialCategory: 'Plumbing',
    areaKeywords: ['water heater', 'hot water'],
  },
  {
    id: 'electrical-panel', name: 'Electrical panel and service', category: 'Mechanical',
    trade: 'electrical', usefulLife: 40, hoursPerUnit: 12, materialPerUnit: 1900,
    unit: 'panel', basis: 'per-property', materialCategory: 'Electrical',
    areaKeywords: ['electrical', 'panel', 'service'],
  },
  {
    id: 'plumbing-supply', name: 'Supply and waste plumbing', category: 'Mechanical',
    trade: 'plumbing', usefulLife: 50, hoursPerUnit: 0.055, materialPerUnit: 2.4,
    unit: 'sq ft', basis: 'per-sq-ft', materialCategory: 'Plumbing',
    areaKeywords: ['plumbing', 'supply', 'waste', 'drain'],
  },
  {
    id: 'kitchen', name: 'Kitchen fit-out', category: 'Interiors',
    trade: 'carpentry', usefulLife: 20, hoursPerUnit: 48, materialPerUnit: 9800,
    unit: 'kitchen', basis: 'per-unit', materialCategory: 'Cabinetry',
    areaKeywords: ['kitchen'],
  },
  {
    id: 'bathroom', name: 'Bathroom fit-out', category: 'Interiors',
    trade: 'tile', usefulLife: 22, hoursPerUnit: 32, materialPerUnit: 5600,
    unit: 'bathroom', basis: 'per-unit', materialCategory: 'Tile',
    areaKeywords: ['bath', 'shower', 'wc'],
  },
  {
    id: 'flooring', name: 'Flooring', category: 'Interiors',
    trade: 'flooring', usefulLife: 15, hoursPerUnit: 0.05, materialPerUnit: 5.4,
    unit: 'sq ft', basis: 'per-sq-ft', materialCategory: 'Flooring',
    areaKeywords: ['floor', 'carpet'],
  },
  {
    id: 'interior-paint', name: 'Interior decoration', category: 'Interiors',
    trade: 'painting', usefulLife: 7, hoursPerUnit: 0.022, materialPerUnit: 0.6,
    unit: 'sq ft', basis: 'per-sq-ft', materialCategory: 'Consumables',
    areaKeywords: ['interior', 'decor', 'wall'],
  },
  {
    id: 'driveway', name: 'Driveway', category: 'Site',
    trade: 'masonry', usefulLife: 20, hoursPerUnit: 0.014, materialPerUnit: 2.3,
    unit: 'sq ft', basis: 'per-property', materialCategory: 'Consumables',
    areaKeywords: ['driveway', 'pavement', 'asphalt'],
  },
  {
    id: 'alarms', name: 'Smoke and CO alarms', category: 'Safety',
    trade: 'electrical', usefulLife: 10, hoursPerUnit: 0.5, materialPerUnit: 58,
    unit: 'alarm', basis: 'per-unit', materialCategory: 'Electrical',
    areaKeywords: ['smoke', 'alarm', 'carbon monoxide', ' co '],
  },
];

/**
 * How many units of a component a property has.
 *
 * Every figure here derives from the property record, and where the record is
 * silent the fallback is the smallest sensible one rather than an average —
 * a plan that quietly assumes a large house costs the owner money they do not
 * owe, and an under-count is visible in the total where an over-count is not.
 */
export function quantityFor(spec: ComponentSpec, property: { units?: number; squareFootage?: number; bedrooms?: number; bathrooms?: number }): number {
  const units = Math.max(1, Math.floor(Number(property?.units) || 1));
  const sqft = Math.max(0, Math.floor(Number(property?.squareFootage) || 0));
  const baths = Math.max(0, Math.floor(Number(property?.bathrooms) || 0));

  switch (spec.basis) {
    case 'per-property':
      // Gutters and driveways are measured, not counted. Without a square
      // footage there is nothing to scale them from, so they stay at one job.
      if (spec.id === 'gutters') return sqft ? Math.round(Math.sqrt(sqft) * 4.4) : 140;
      if (spec.id === 'driveway') return sqft ? Math.round(sqft * 0.35) : 600;
      return 1;
    case 'per-unit':
      if (spec.id === 'bathroom') return baths || units;
      if (spec.id === 'windows') return units * 8;
      if (spec.id === 'exterior-doors') return units + 1;
      if (spec.id === 'alarms') return units * 3;
      return units;
    case 'per-sq-ft':
      return sqft || units * 900;
    case 'roof-sq-ft':
      // Footprint over the storeys, plus a fifth for pitch and overhang.
      return Math.round(((sqft || units * 900) / (units > 2 ? 2 : 1)) * 1.2);
  }
}

export interface Rate { id: string; hourlyRate: number }
export interface PricingSettings {
  materialMarkup: number;
  materialMarkupByCategory: Record<string, number>;
  laborMarkup: number;
  profitMargin: number;
  overheadPercentage: number;
}

export interface CostedComponent {
  id: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  /** Our rate for the trade, and whether it is ours or the book's. */
  hourlyRate: number;
  labourHours: number;
  labourCost: number;
  materialCost: number;
  /** Labour + materials + markup + overhead + profit, today. */
  costToday: number;
  usefulLife: number;
  effectiveAge: number;
  remainingLife: number;
  dueYear: number;
  /** Grown at inflation over the remaining life. */
  costWhenDue: number;
  /** Did an inspection look at this, or is its age the building's age? */
  basisOfAge: 'seen' | 'assumed';
  /** The condition word, when one was recorded. */
  condition: string | null;
  /** Why the remaining life is what it is, in one sentence. */
  note: string;
  /**
   * The year the plan actually schedules the work.
   *
   * Equal to dueYear for anything with life left. For overdue work it is the
   * year the sequencing put it in — see buildCapitalPlan.
   */
  scheduledYear?: number;
}

/**
 * What a recorded condition says about the life LEFT in a component.
 *
 * The first version of this moved the component's effective AGE by a factor and
 * then let the age arithmetic decide. Rendering a real sample showed why that is
 * wrong: on a 1962 building a kitchen inspected and found good still came out
 * with nothing left, because the building's age swamped the adjustment — and the
 * line's own note said its life had been "extended" while the number beside it
 * said "due now". A document that contradicts itself in adjacent columns is
 * worse than one that is merely approximate.
 *
 * So an observation now sets the remaining life directly, as a share of the
 * component's own useful life. Something seen and found good has most of its
 * life left whatever the building's age says, because somebody looked at it.
 * Observations outrank arithmetic; arithmetic is what fills the gaps.
 */
const CONDITION_REMAINING: Record<string, number> = {
  excellent: 0.85, good: 0.6, fair: 0.3, poor: 0.1, failed: 0, unsafe: 0,
};

export function remainingLifeFor(
  spec: ComponentSpec,
  buildingAge: number,
  condition: string | null,
): { remainingLife: number; effectiveAge: number; basis: 'seen' | 'assumed'; note: string } {
  const word = String(condition || '').trim().toLowerCase();
  const share = word ? CONDITION_REMAINING[word] : undefined;

  if (share === undefined) {
    // Nothing seen, or a word this plan does not rank. Fall back to the age,
    // capped at the component's life so an old building does not report a
    // negative remaining life.
    const age = Math.max(0, Math.min(buildingAge, spec.usefulLife));
    const note = word
      ? `The condition recorded was "${condition}", which is not a word this plan ranks, so its age is taken as the building's (${buildingAge} years).`
      : `No inspection has looked at this, so it is assumed to be as old as the building (${buildingAge} years).`;
    return { remainingLife: spec.usefulLife - age, effectiveAge: age, basis: 'assumed', note };
  }

  const remainingLife = Math.round(spec.usefulLife * share);
  const effectiveAge = spec.usefulLife - remainingLife;
  const note = share === 0
    ? `Inspected and found ${word}, so it is due now whatever its age.`
    : `Inspected and found ${word}, which puts roughly ${Math.round(share * 100)}% of its ${spec.usefulLife}-year life ahead of it `
      + `— an observation, rather than the building's age of ${buildingAge} years.`;
  return { remainingLife, effectiveAge, basis: 'seen', note };
}

/** Our quote arithmetic: markup on materials, then overhead, then profit. */
export function quotedCost(labour: number, materials: number, materialCategory: string, settings: PricingSettings): number {
  const markup = Number(settings.materialMarkupByCategory?.[materialCategory] ?? settings.materialMarkup) || 0;
  const materialsSold = materials * (1 + markup / 100);
  const labourSold = labour * (1 + (Number(settings.laborMarkup) || 0) / 100);
  const base = materialsSold + labourSold;
  const withOverhead = base * (1 + (Number(settings.overheadPercentage) || 0) / 100);
  return Math.round(withOverhead * (1 + (Number(settings.profitMargin) || 0) / 100));
}

export interface PlanInput {
  property: { units?: number; squareFootage?: number; bathrooms?: number; yearBuilt?: number | null };
  /** area name (lower case) → condition word, from the inspections. */
  conditions: Record<string, string>;
  rates: Rate[];
  settings: PricingSettings;
  /** Annual construction inflation. 3% unless somebody sets it. */
  inflation?: number;
  thisYear?: number;
}

export function costComponent(spec: ComponentSpec, input: PlanInput): CostedComponent {
  const thisYear = input.thisYear || new Date().getFullYear();
  const built = Number(input.property?.yearBuilt) || thisYear;
  const buildingAge = Math.max(0, thisYear - built);
  const inflation = Number.isFinite(Number(input.inflation)) ? Number(input.inflation) : 3;

  const condition = matchCondition(spec, input.conditions);
  const { remainingLife: life, effectiveAge: age, basis, note } = remainingLifeFor(spec, buildingAge, condition);

  const rate = input.rates.find((r) => r.id === spec.trade);
  // No rate for the trade is not a licence to price the labour at zero: the
  // general labouring rate is the floor, and it is better to be low and visible
  // than absent and silently free.
  const hourlyRate = Number(rate?.hourlyRate) || Number(input.rates.find((r) => r.id === 'laboring')?.hourlyRate) || 40;

  const quantity = quantityFor(spec, input.property);
  const labourHours = Math.round(spec.hoursPerUnit * quantity * 10) / 10;
  const labourCost = Math.round(labourHours * hourlyRate);
  const materialCost = Math.round(spec.materialPerUnit * quantity);
  const costToday = quotedCost(labourCost, materialCost, spec.materialCategory, input.settings);

  const remainingLife = Math.max(0, life);
  const dueYear = thisYear + remainingLife;
  const costWhenDue = Math.round(costToday * Math.pow(1 + inflation / 100, remainingLife));

  return {
    id: spec.id, name: spec.name, category: spec.category,
    quantity, unit: spec.unit,
    hourlyRate, labourHours, labourCost, materialCost, costToday,
    usefulLife: spec.usefulLife, effectiveAge: age, remainingLife, dueYear, costWhenDue,
    basisOfAge: basis, condition, note,
  };
}

function matchCondition(spec: ComponentSpec, conditions: Record<string, string>): string | null {
  for (const [area, condition] of Object.entries(conditions || {})) {
    const padded = ` ${area} `;
    if (spec.areaKeywords.some((k) => padded.includes(k) || area.includes(k.trim()))) return condition;
  }
  return null;
}

export interface CapitalPlan {
  components: CostedComponent[];
  /** Only what falls inside the ten years the product promises. */
  withinTenYears: CostedComponent[];
  /** Year → what is scheduled that year, for the ten-year table. */
  byYear: Array<{ year: number; items: string[]; total: number }>;
  tenYearTotal: number;
  /** What to set aside a month to meet it. */
  monthlyReserve: number;
  seenCount: number;
  assumedCount: number;
  /** Components already past their life, which had to be sequenced. */
  overdueCount: number;
}

/**
 * How many years overdue work is spread across.
 *
 * An old building has most of its components past their nominal life at once.
 * Rendering a real 1962 duplex produced a "ten-year plan" that was a single
 * line — sixteen components and $209,000, all in year one — which is a table,
 * not a plan: nobody replaces the kitchen, the roof, the siding, the plumbing
 * and the heating in the same twelve months, and an owner shown that figure
 * reads the document as not applying to them.
 *
 * So anything overdue is SEQUENCED. Five years is the window because it is
 * long enough to be fundable and short enough to be honest about work that is
 * already late — and the document says this is what it did rather than letting
 * the years look like predictions.
 */
export const OVERDUE_SPREAD_YEARS = 5;

/**
 * The order overdue work is done in.
 *
 * Safety first, because an alarm or a failed heating plant is not a budgeting
 * question. Then what was actually seen and found worst, because an inspector
 * looked at it. Then the envelope, since water getting in makes everything
 * behind it worse — a roof left another two years takes the interior with it.
 * Cost is the last tie-break, cheapest first, so a year's budget clears more
 * lines rather than fewer.
 */
function overdueUrgency(c: CostedComponent): number {
  let score = 0;
  if (c.category === 'Safety') score -= 100;
  if (c.basisOfAge === 'seen') score -= 40;
  if (String(c.condition || '').toLowerCase() === 'failed') score -= 60;
  if (c.category === 'Mechanical') score -= 25;
  if (c.category === 'Building envelope') score -= 20;
  return score;
}

export function buildCapitalPlan(input: PlanInput): CapitalPlan {
  const thisYear = input.thisYear || new Date().getFullYear();
  const inflation = Number.isFinite(Number(input.inflation)) ? Number(input.inflation) : 3;
  const components = COMPONENTS.map((spec) => costComponent(spec, input));

  /**
   * Sequence the overdue work, then re-inflate it to the year it is scheduled.
   *
   * The cost has to move with the schedule. Pushing a replacement to year four
   * and still quoting today's price would under-fund it by four years of
   * construction inflation, which is the kind of error that only shows up when
   * the money is short.
   */
  const overdue = components.filter((c) => c.remainingLife === 0).sort((a, b) => overdueUrgency(a) - overdueUrgency(b) || a.costToday - b.costToday);
  const perYear = Math.max(1, Math.ceil(overdue.length / OVERDUE_SPREAD_YEARS));
  overdue.forEach((c, i) => {
    const offset = Math.min(OVERDUE_SPREAD_YEARS - 1, Math.floor(i / perYear));
    c.scheduledYear = thisYear + offset;
    c.costWhenDue = Math.round(c.costToday * Math.pow(1 + inflation / 100, offset));
    c.note += offset === 0
      ? ' It is already due, and is first in the sequence.'
      : ` It is already overdue; this plan schedules it ${offset} ${offset === 1 ? 'year' : 'years'} out so the work is spread rather than stacked into one year.`;
  });
  for (const c of components) {
    if (c.scheduledYear === undefined) c.scheduledYear = c.dueYear;
  }

  components.sort((a, b) => (a.scheduledYear || 0) - (b.scheduledYear || 0) || b.costWhenDue - a.costWhenDue);
  const withinTenYears = components.filter((c) => (c.scheduledYear || 0) <= thisYear + 10);

  const byYear: CapitalPlan['byYear'] = [];
  for (let i = 0; i <= 10; i++) {
    const year = thisYear + i;
    const due = withinTenYears.filter((c) => c.scheduledYear === year);
    if (!due.length) continue;
    byYear.push({
      year,
      items: due.map((c) => c.name),
      total: due.reduce((sum, c) => sum + c.costWhenDue, 0),
    });
  }

  const tenYearTotal = byYear.reduce((sum, y) => sum + y.total, 0);
  return {
    components,
    withinTenYears,
    byYear,
    tenYearTotal,
    // Across ten years, which is the figure an owner can act on. Rounded up to
    // the nearest ten so it reads as a decision rather than a calculation.
    monthlyReserve: Math.ceil(tenYearTotal / 120 / 10) * 10,
    seenCount: components.filter((c) => c.basisOfAge === 'seen').length,
    assumedCount: components.filter((c) => c.basisOfAge === 'assumed').length,
    overdueCount: overdue.length,
  };
}
