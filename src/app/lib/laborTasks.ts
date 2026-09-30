/**
 * How long work actually takes.
 *
 * WHY THIS EXISTS
 *
 * The company had an hourly rate for twelve trades and nothing that said a
 * tiled floor is about a tenth of an hour per square foot. A rate without a
 * production rate cannot produce a labour cost, which is exactly why the quote
 * generator was left asking a language model to guess the hours — and a guess
 * is neither current nor defensible in front of a customer.
 *
 * `deckQuote.ts` already got this right for decks: hours per square foot, the
 * builder's own number, defaulting to zero so it never invents one. This is the
 * same idea across every trade.
 *
 * MAN-HOURS, NOT CREW-HOURS — READ THIS BEFORE CHANGING A NUMBER
 *
 * `hoursPerUnit` is MAN-hours: the labour one person would spend. Cost is
 * therefore hours × rate, and crew size does not enter the cost at all — it
 * only tells you how long the job occupies the calendar. Two framers at 0.035
 * man-hours per square foot cost the same as one framer taking twice as long;
 * they simply finish sooner. Reading these as crew-hours and multiplying by
 * crew size doubles every labour line, which is the single easiest way to price
 * yourself out of a job.
 *
 * WHERE THE NUMBERS COME FROM, HONESTLY
 *
 * Everything seeded here is an industry starting figure, marked `source: 'seed'`.
 * They are not measurements of Black Phoenix crews and must not be presented as
 * though they were. They exist so the estimator produces something defensible on
 * day one, and every one of them is meant to be corrected the first time a real
 * job is measured against it. A task Eric has edited is marked `source: 'yours'`
 * and is never silently overwritten by a later seed update.
 */

/**
 * How each trade is written for a person to read.
 *
 * This lived as a private const inside `LaborTasksConfig.tsx` while it was the
 * only screen that needed it. The technician application needs the same twelve
 * names, and a second copy is a list that drifts — one gains a trade, the other
 * does not, and the two screens quietly disagree about what the company does.
 *
 * It belongs here, beside the tasks whose `tradeId` it labels.
 */
/**
 * The types and the arithmetic now live on the server.
 *
 * `supabase/functions/server/laborMath.ts` owns them because an edge function
 * cannot import from `src/` — only `supabase/functions` is uploaded — and the
 * blueprint quoter needs the same minimum-hours floor this screen uses. Two
 * copies of that floor would eventually disagree about a customer's price
 * depending on which screen asked, so there is one, and it is re-exported here
 * so every existing import of this file keeps working unchanged.
 */
export {
  LABOR_CONDITIONS,
  estimateTaskLabor,
} from '../../../supabase/functions/server/laborMath.ts';
export type {
  LaborUnit,
  LaborTask,
  LaborCondition,
  LaborEstimate,
} from '../../../supabase/functions/server/laborMath.ts';

/* The catalogue itself stays here: it is data the client ships, and the server
   holds its own published copy in `labor_tasks:catalogue`. */
import type { LaborTask } from '../../../supabase/functions/server/laborMath.ts';

export const TRADE_LABELS: Record<string, string> = {
  carpentry: 'Carpentry', painting: 'Painting', electrical: 'Electrical',
  plumbing: 'Plumbing', laboring: 'General Labour', sheetrock: 'Drywall & Taping',
  siding: 'Siding', roofing: 'Roofing', tile: 'Tile', flooring: 'Flooring',
  masonry: 'Masonry', hvac: 'HVAC',
  power_washing: 'Power Washing',
};

/** Every trade the estimator prices, in the order the labels above declare them. */
export const TRADE_IDS: string[] = Object.keys(TRADE_LABELS);

/** The readable name for a trade, falling back to the id rather than to nothing. */
export const tradeLabel = (tradeId: string): string => TRADE_LABELS[tradeId] || tradeId;

/**
 * Seeded production rates for the twelve trades.
 *
 * Man-hours per unit. Correct these against real jobs — that is the point of
 * them being editable rather than compiled in.
 */
export const SEED_TASKS: LaborTask[] = [
  // ── Carpentry ────────────────────────────────────────────────────────────
  { id: 'carp-wall-framing', tradeId: 'carpentry', name: 'Wall framing, 2x4 or 2x6', unit: 'sq ft', hoursPerUnit: 0.035, crewSize: 2, minimumHours: 8, source: 'seed', notes: 'Per square foot of wall face, plates and studs, 8–9 ft height.' },
  { id: 'carp-floor-framing', tradeId: 'carpentry', name: 'Floor framing and sheathing', unit: 'sq ft', hoursPerUnit: 0.030, crewSize: 2, minimumHours: 8, source: 'seed', notes: 'Joists, blocking, subfloor glued and screwed.' },
  { id: 'carp-roof-framing', tradeId: 'carpentry', name: 'Roof framing, rafters or trusses', unit: 'sq ft', hoursPerUnit: 0.038, crewSize: 3, minimumHours: 8, source: 'seed', notes: 'Per square foot of roof area including sheathing.' },
  { id: 'carp-deck-framing', tradeId: 'carpentry', name: 'Deck framing', unit: 'sq ft', hoursPerUnit: 0.060, crewSize: 2, minimumHours: 8, source: 'seed', notes: 'Footings excluded — price those separately.' },
  { id: 'carp-door-hang', tradeId: 'carpentry', name: 'Hang prehung interior door', unit: 'each', hoursPerUnit: 1.2, crewSize: 1, minimumHours: 2, source: 'seed', notes: 'Set, shim, plumb, case one side.' },
  { id: 'carp-base-trim', tradeId: 'carpentry', name: 'Baseboard and casing', unit: 'lin ft', hoursPerUnit: 0.045, crewSize: 1, minimumHours: 4, source: 'seed', notes: 'Cut, cope, fit, nail. Paint grade.' },
  { id: 'carp-crown', tradeId: 'carpentry', name: 'Crown moulding', unit: 'lin ft', hoursPerUnit: 0.070, crewSize: 2, minimumHours: 6, source: 'seed', notes: 'Slower than base — inside corners are coped on ladders.' },
  { id: 'carp-cabinets', tradeId: 'carpentry', name: 'Cabinet installation', unit: 'lin ft', hoursPerUnit: 1.0, crewSize: 2, minimumHours: 8, source: 'seed', notes: 'Base and wall, scribed and levelled. Tops separate.' },

  // ── Painting ─────────────────────────────────────────────────────────────
  { id: 'paint-walls', tradeId: 'painting', name: 'Walls, prep and two coats', unit: 'sq ft', hoursPerUnit: 0.010, crewSize: 1, minimumHours: 6, source: 'seed', notes: 'Per square foot of wall. Patching beyond light filling is extra.' },
  { id: 'paint-ceilings', tradeId: 'painting', name: 'Ceilings, two coats', unit: 'sq ft', hoursPerUnit: 0.012, crewSize: 1, minimumHours: 4, source: 'seed', notes: 'Overhead work and cutting in at the perimeter.' },
  { id: 'paint-trim', tradeId: 'painting', name: 'Trim and casing', unit: 'lin ft', hoursPerUnit: 0.055, crewSize: 1, minimumHours: 4, source: 'seed', notes: 'Sand, caulk, two coats by brush.' },
  { id: 'paint-doors', tradeId: 'painting', name: 'Doors, both faces and edges', unit: 'each', hoursPerUnit: 1.1, crewSize: 1, minimumHours: 2, source: 'seed' },
  { id: 'paint-exterior', tradeId: 'painting', name: 'Exterior siding, prep and two coats', unit: 'sq ft', hoursPerUnit: 0.016, crewSize: 2, minimumHours: 8, source: 'seed', notes: 'Includes wash and scrape. Staging extra.' },

  // ── Electrical ───────────────────────────────────────────────────────────
  { id: 'elec-device', tradeId: 'electrical', name: 'Outlet or switch, rough and trim', unit: 'each', hoursPerUnit: 0.8, crewSize: 1, minimumHours: 2, source: 'seed', notes: 'New box, run, device and plate.' },
  { id: 'elec-recessed', tradeId: 'electrical', name: 'Recessed light', unit: 'each', hoursPerUnit: 0.9, crewSize: 1, minimumHours: 2, source: 'seed' },
  { id: 'elec-fixture', tradeId: 'electrical', name: 'Light fixture swap', unit: 'each', hoursPerUnit: 0.6, crewSize: 1, minimumHours: 2, source: 'seed' },
  { id: 'elec-circuit', tradeId: 'electrical', name: 'New circuit from panel', unit: 'each', hoursPerUnit: 1.8, crewSize: 1, minimumHours: 2, source: 'seed', notes: 'Home run, breaker, labelled.' },
  { id: 'elec-panel', tradeId: 'electrical', name: 'Panel upgrade to 200A', unit: 'each', hoursPerUnit: 12, crewSize: 2, minimumHours: 12, source: 'seed', notes: 'Utility coordination and inspection not included in hours.' },

  // ── Plumbing ─────────────────────────────────────────────────────────────
  { id: 'plumb-rough', tradeId: 'plumbing', name: 'Rough-in per fixture', unit: 'each', hoursPerUnit: 3.2, crewSize: 1, minimumHours: 4, source: 'seed', notes: 'Supply and waste to the fixture location.' },
  { id: 'plumb-set-fixture', tradeId: 'plumbing', name: 'Set fixture — toilet, sink, tub', unit: 'each', hoursPerUnit: 1.8, crewSize: 1, minimumHours: 3, source: 'seed' },
  { id: 'plumb-shower-valve', tradeId: 'plumbing', name: 'Shower or tub valve', unit: 'each', hoursPerUnit: 2.5, crewSize: 1, minimumHours: 3, source: 'seed' },
  { id: 'plumb-water-heater', tradeId: 'plumbing', name: 'Water heater replacement', unit: 'each', hoursPerUnit: 4.5, crewSize: 1, minimumHours: 4, source: 'seed' },
  { id: 'plumb-repipe', tradeId: 'plumbing', name: 'Repipe, PEX', unit: 'lin ft', hoursPerUnit: 0.12, crewSize: 1, minimumHours: 4, source: 'seed' },

  // ── General labour ───────────────────────────────────────────────────────
  { id: 'lab-demo-interior', tradeId: 'laboring', name: 'Interior demolition, non-structural', unit: 'sq ft', hoursPerUnit: 0.035, crewSize: 2, minimumHours: 8, source: 'seed', notes: 'Finishes to studs. Protection and containment included.' },
  { id: 'lab-demo-bath', tradeId: 'laboring', name: 'Bathroom gut to studs', unit: 'each', hoursPerUnit: 16, crewSize: 2, minimumHours: 16, source: 'seed', notes: 'Typical 5x8. Tile, tub, vanity, floor out.' },
  { id: 'lab-debris', tradeId: 'laboring', name: 'Debris load-out and haul prep', unit: 'sq ft', hoursPerUnit: 0.020, crewSize: 2, minimumHours: 4, source: 'seed', notes: 'Dumpster cost is a soft cost, not labour.' },
  { id: 'lab-protection', tradeId: 'laboring', name: 'Floor and surface protection', unit: 'sq ft', hoursPerUnit: 0.008, crewSize: 1, minimumHours: 2, source: 'seed' },
  { id: 'lab-cleanup', tradeId: 'laboring', name: 'Final clean', unit: 'sq ft', hoursPerUnit: 0.012, crewSize: 1, minimumHours: 4, source: 'seed' },

  // ── Drywall and taping ───────────────────────────────────────────────────
  { id: 'dry-hang-wall', tradeId: 'sheetrock', name: 'Hang board, walls', unit: 'sq ft', hoursPerUnit: 0.012, crewSize: 2, minimumHours: 6, source: 'seed', notes: 'Half inch, screwed. Per square foot of surface.' },
  { id: 'dry-hang-ceiling', tradeId: 'sheetrock', name: 'Hang board, ceilings', unit: 'sq ft', hoursPerUnit: 0.016, crewSize: 2, minimumHours: 6, source: 'seed', notes: 'Slower than walls — overhead and lifting.' },
  { id: 'dry-tape-finish', tradeId: 'sheetrock', name: 'Tape and finish, level 4', unit: 'sq ft', hoursPerUnit: 0.022, crewSize: 1, minimumHours: 8, source: 'seed', notes: 'Three coats with sanding between. Level 5 is roughly a third more.' },
  { id: 'dry-texture', tradeId: 'sheetrock', name: 'Texture', unit: 'sq ft', hoursPerUnit: 0.008, crewSize: 1, minimumHours: 4, source: 'seed' },
  { id: 'dry-patch', tradeId: 'sheetrock', name: 'Patch and repair', unit: 'each', hoursPerUnit: 1.5, crewSize: 1, minimumHours: 3, source: 'seed', notes: 'Per patch, including return trips to coat and sand.' },

  // ── Siding ───────────────────────────────────────────────────────────────
  { id: 'side-vinyl', tradeId: 'siding', name: 'Vinyl siding', unit: 'sq ft', hoursPerUnit: 0.030, crewSize: 2, minimumHours: 8, source: 'seed' },
  { id: 'side-fiber-cement', tradeId: 'siding', name: 'Fibre cement siding', unit: 'sq ft', hoursPerUnit: 0.048, crewSize: 2, minimumHours: 8, source: 'seed', notes: 'Heavier, cut outdoors, more fixings.' },
  { id: 'side-wood', tradeId: 'siding', name: 'Cedar or wood siding', unit: 'sq ft', hoursPerUnit: 0.058, crewSize: 2, minimumHours: 8, source: 'seed' },
  { id: 'side-trim', tradeId: 'siding', name: 'Exterior trim and corners', unit: 'lin ft', hoursPerUnit: 0.055, crewSize: 2, minimumHours: 6, source: 'seed' },
  { id: 'side-wrap', tradeId: 'siding', name: 'House wrap and flashing', unit: 'sq ft', hoursPerUnit: 0.008, crewSize: 2, minimumHours: 4, source: 'seed' },

  // ── Roofing ──────────────────────────────────────────────────────────────
  { id: 'roof-tearoff', tradeId: 'roofing', name: 'Tear-off, one layer', unit: 'sq ft', hoursPerUnit: 0.018, crewSize: 3, minimumHours: 8, source: 'seed', notes: 'Add roughly 60 percent for each additional layer.' },
  { id: 'roof-shingle', tradeId: 'roofing', name: 'Architectural shingles', unit: 'sq ft', hoursPerUnit: 0.026, crewSize: 3, minimumHours: 8, source: 'seed' },
  { id: 'roof-underlayment', tradeId: 'roofing', name: 'Underlayment and ice barrier', unit: 'sq ft', hoursPerUnit: 0.007, crewSize: 2, minimumHours: 4, source: 'seed' },
  { id: 'roof-ridge-vent', tradeId: 'roofing', name: 'Ridge vent', unit: 'lin ft', hoursPerUnit: 0.06, crewSize: 2, minimumHours: 4, source: 'seed' },
  { id: 'roof-flashing', tradeId: 'roofing', name: 'Step and chimney flashing', unit: 'lin ft', hoursPerUnit: 0.10, crewSize: 1, minimumHours: 4, source: 'seed' },

  // ── Tile ─────────────────────────────────────────────────────────────────
  { id: 'tile-floor-large', tradeId: 'tile', name: 'Floor tile, 12x24 or larger, straight lay', unit: 'sq ft', hoursPerUnit: 0.10, crewSize: 1, minimumHours: 6, source: 'seed', notes: 'Large format needs a flatter substrate — allow for levelling.' },
  { id: 'tile-floor-standard', tradeId: 'tile', name: 'Floor tile, 12x12, straight lay', unit: 'sq ft', hoursPerUnit: 0.09, crewSize: 1, minimumHours: 6, source: 'seed' },
  { id: 'tile-wall', tradeId: 'tile', name: 'Wall tile, tub or shower surround', unit: 'sq ft', hoursPerUnit: 0.15, crewSize: 1, minimumHours: 8, source: 'seed', notes: 'Vertical work, more cuts, niches and corners.' },
  { id: 'tile-mosaic', tradeId: 'tile', name: 'Mosaic or small format', unit: 'sq ft', hoursPerUnit: 0.26, crewSize: 1, minimumHours: 6, source: 'seed', notes: 'Sheets still need alignment and grout joints worked.' },
  { id: 'tile-backsplash', tradeId: 'tile', name: 'Kitchen backsplash', unit: 'sq ft', hoursPerUnit: 0.17, crewSize: 1, minimumHours: 6, source: 'seed', notes: 'Outlets, edges and a visible line at the countertop.' },
  { id: 'tile-waterproof', tradeId: 'tile', name: 'Waterproofing membrane', unit: 'sq ft', hoursPerUnit: 0.030, crewSize: 1, minimumHours: 4, source: 'seed', notes: 'Two coats plus corners and seams. Cure time is not labour.' },
  { id: 'tile-grout-seal', tradeId: 'tile', name: 'Grout and seal', unit: 'sq ft', hoursPerUnit: 0.022, crewSize: 1, minimumHours: 3, source: 'seed' },
  { id: 'tile-demo', tradeId: 'tile', name: 'Remove existing tile', unit: 'sq ft', hoursPerUnit: 0.055, crewSize: 2, minimumHours: 6, source: 'seed', notes: 'Mud beds are far slower than thinset over board.' },

  // ── Flooring ─────────────────────────────────────────────────────────────
  { id: 'floor-lvp', tradeId: 'flooring', name: 'LVP or laminate, floating', unit: 'sq ft', hoursPerUnit: 0.030, crewSize: 1, minimumHours: 5, source: 'seed' },
  { id: 'floor-hardwood-nail', tradeId: 'flooring', name: 'Hardwood, nail down', unit: 'sq ft', hoursPerUnit: 0.048, crewSize: 2, minimumHours: 8, source: 'seed' },
  { id: 'floor-sand-finish', tradeId: 'flooring', name: 'Sand and finish hardwood', unit: 'sq ft', hoursPerUnit: 0.036, crewSize: 2, minimumHours: 8, source: 'seed', notes: 'Three coats. Dry time between coats is not labour.' },
  { id: 'floor-carpet', tradeId: 'flooring', name: 'Carpet and pad', unit: 'sq ft', hoursPerUnit: 0.020, crewSize: 2, minimumHours: 4, source: 'seed' },
  { id: 'floor-underlayment', tradeId: 'flooring', name: 'Underlayment or levelling', unit: 'sq ft', hoursPerUnit: 0.014, crewSize: 1, minimumHours: 4, source: 'seed' },

  // ── Masonry ──────────────────────────────────────────────────────────────
  { id: 'mas-brick-veneer', tradeId: 'masonry', name: 'Brick veneer', unit: 'sq ft', hoursPerUnit: 0.13, crewSize: 2, minimumHours: 8, source: 'seed' },
  { id: 'mas-block', tradeId: 'masonry', name: 'Block wall', unit: 'sq ft', hoursPerUnit: 0.11, crewSize: 2, minimumHours: 8, source: 'seed' },
  { id: 'mas-stone-veneer', tradeId: 'masonry', name: 'Stone veneer', unit: 'sq ft', hoursPerUnit: 0.16, crewSize: 2, minimumHours: 8, source: 'seed', notes: 'Fitting and sorting stone is most of the time.' },
  { id: 'mas-flatwork', tradeId: 'masonry', name: 'Concrete flatwork, place and finish', unit: 'sq ft', hoursPerUnit: 0.038, crewSize: 3, minimumHours: 8, source: 'seed', notes: 'Forms and base prep separate.' },
  { id: 'mas-repoint', tradeId: 'masonry', name: 'Repointing', unit: 'sq ft', hoursPerUnit: 0.10, crewSize: 1, minimumHours: 6, source: 'seed' },

  // ── HVAC ─────────────────────────────────────────────────────────────────
  { id: 'hvac-duct', tradeId: 'hvac', name: 'Ductwork run', unit: 'lin ft', hoursPerUnit: 0.55, crewSize: 2, minimumHours: 6, source: 'seed' },
  { id: 'hvac-register', tradeId: 'hvac', name: 'Register or return grille', unit: 'each', hoursPerUnit: 0.6, crewSize: 1, minimumHours: 2, source: 'seed' },
  { id: 'hvac-minisplit', tradeId: 'hvac', name: 'Mini-split head and line set', unit: 'each', hoursPerUnit: 6.5, crewSize: 2, minimumHours: 8, source: 'seed' },
  { id: 'hvac-furnace', tradeId: 'hvac', name: 'Furnace or air handler replacement', unit: 'each', hoursPerUnit: 8, crewSize: 2, minimumHours: 8, source: 'seed' },
  { id: 'hvac-condenser', tradeId: 'hvac', name: 'Condenser set and charge', unit: 'each', hoursPerUnit: 6, crewSize: 2, minimumHours: 6, source: 'seed' },

  /*
   * ── Power washing ────────────────────────────────────────────────────────
   *
   * Eric: "power washing is going to be per job and size we can do it by the
   * hour or the job in some cases." Three shapes, because all three of those
   * are real: an AREA task for the usual case, an HOUR task for time and
   * materials, and an EACH task for a flat quoted job.
   *
   * The minimum hours matter more here than in any other trade. Most of these
   * jobs are small, and almost all of the work is setup — trailer, water,
   * hoses, mixing, moving furniture and plants, protecting what must not get
   * wet. A 500 sq ft driveway is not half an hour; it is a trip. Priced off
   * hours-per-unit alone, every small wash loses money.
   *
   * Every figure rounded toward SLOWER where it fell between steps, which is
   * the direction a quote should err.
   */
  { id: 'wash-house', tradeId: 'power_washing', name: 'House exterior, soft wash and rinse', unit: 'sq ft', hoursPerUnit: 0.001, crewSize: 1, minimumHours: 3, source: 'seed', notes: 'Per square foot of WALL area, not floor area. Detergent, dwell and rinse. Plant and fixture protection included.' },
  { id: 'wash-concrete', tradeId: 'power_washing', name: 'Driveway, walkway or patio', unit: 'sq ft', hoursPerUnit: 0.001, crewSize: 1, minimumHours: 3, source: 'seed', notes: 'Surface cleaner on open concrete. Edging by wand, and set-in staining, are both slower than this.' },
  { id: 'wash-deck', tradeId: 'power_washing', name: 'Deck or wood surface', unit: 'sq ft', hoursPerUnit: 0.003, crewSize: 1, minimumHours: 3, source: 'seed', notes: 'Lower pressure and far more care than concrete — wood furs up. Brightener, stain or sealer is separate work.' },
  { id: 'wash-fence', tradeId: 'power_washing', name: 'Fence, both sides', unit: 'lin ft', hoursPerUnit: 0.013, crewSize: 1, minimumHours: 3, source: 'seed', notes: 'Per linear foot of fence, washing both faces.' },
  { id: 'wash-roof', tradeId: 'power_washing', name: 'Roof soft wash', unit: 'square', hoursPerUnit: 0.35, crewSize: 2, minimumHours: 4, source: 'seed', notes: 'Chemical only. No pressure on shingles — pressure strips granules and voids the warranty. Staging and fall protection included.' },
  { id: 'wash-hourly', tradeId: 'power_washing', name: 'Washing, by the hour', unit: 'hour', hoursPerUnit: 1, crewSize: 1, minimumHours: 2, source: 'seed', notes: 'For work billed as time and materials rather than by area. The minimum is the minimum call-out.' },
  { id: 'wash-job', tradeId: 'power_washing', name: 'Whole-house wash, flat job price', unit: 'each', hoursPerUnit: 4, crewSize: 1, minimumHours: 4, source: 'seed', notes: 'The flat-price version: house, walkway and steps on an average single-family. Quote by area instead where the house is unusual.' },
];

// ── the maths ────────────────────────────────────────────────────────────────

/** Every task belonging to a trade. */
export function tasksForTrade(tasks: LaborTask[], tradeId: string): LaborTask[] {
  return tasks.filter(t => t.tradeId === tradeId);
}

/**
 * Merge saved tasks over the seed.
 *
 * A task Eric has edited wins and is never overwritten by a later seed change —
 * that is the whole point of recording `source`. New seed tasks added in a
 * release still appear, so the catalogue can grow without discarding his
 * corrections.
 */
export function mergeTasks(saved: LaborTask[] | null | undefined): LaborTask[] {
  const mine = new Map((saved || []).map(t => [t.id, t]));
  const merged = SEED_TASKS.map(seed => mine.get(seed.id) || seed);
  // Anything Eric added himself that is not in the seed.
  for (const t of mine.values()) {
    if (!SEED_TASKS.some(s => s.id === t.id)) merged.push(t);
  }
  return merged;
}

/** How much of the catalogue is still an untouched book figure. */
export function seedCoverage(tasks: LaborTask[]): { total: number; yours: number; seeded: number } {
  const total = tasks.length;
  const yours = tasks.filter(t => t.source === 'yours').length;
  return { total, yours, seeded: total - yours };
}
