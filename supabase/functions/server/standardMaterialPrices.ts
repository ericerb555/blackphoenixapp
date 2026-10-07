/**
 * A reference price for common materials, for when no vendor sells one yet.
 *
 * WHY THIS EXISTS, AND WHAT IT IS CAREFUL NOT TO CLAIM
 *
 * `repriceMaterial` had two outcomes: a vendor catalogue match, marked
 * `catalogue`, or the model's own invented price, marked `estimated`. With 11
 * catalogue items in production, almost every material line on every quote was
 * the second — a number a language model believed, re-guessed from scratch on
 * each quote, so the same stud could be $3 on Monday and $9 on Tuesday.
 *
 * Labour already had the answer to this. `STANDARD_LABOR_RATES` are reference
 * trade rates used until Eric saves his own, and `PriceSource` has carried a
 * `'standard'` label since it was written — labour used it and materials never
 * did. This finishes that pattern rather than inventing one.
 *
 * WHAT THE LABEL MEANS, PRECISELY
 *
 *   catalogue   a real price a real vendor published. Checkable.
 *   standard    a reference figure from THIS FILE. Stable and reviewable,
 *               but nobody has quoted it.
 *   estimated   the model's guess for this quote only.
 *
 * A `standard` line must never read as a vendor price, which is why it gets its
 * own label rather than borrowing `catalogue`. The repricing summary counts it
 * separately and the wording already distinguishes "your own figures" from
 * "standard rates" — see `repriceEstimate`.
 *
 * WHERE THESE NUMBERS COME FROM
 *
 * Ordinary New England contractor-level material costs for 2026, before any
 * markup, calibrated against the real catalogue prices Granite State Building
 * Supply published on 2026-09-27 — the ten overlapping entries below carry
 * that vendor's figure exactly, and the rest sit consistently with them.
 *
 * They are a floor to stand on, not a price list to sell from. A real vendor
 * price always wins: `repriceMaterial` consults the catalogue first and only
 * falls back here. The honest way to retire this file is to load a supplier's
 * export into `vendor_catalog:*`, after which these entries stop being reached
 * for anything a vendor actually sells.
 *
 * MATCHING IS DELIBERATELY STRICT
 *
 * Every token in `all` must appear in the material's name, none in `none` may,
 * and the unit must agree where both sides state one. A wrong match here is
 * worse than no match, because `standard` reads as semi-authoritative: pricing
 * 500 linear feet of trim at a per-stud rate would be a plausible-looking
 * number that is wrong by a factor of a hundred. First match wins, so entries
 * run most specific first.
 */

export interface StandardMaterial {
  /** Stable id, recorded on a priced line so it can be traced back here. */
  id: string;
  label: string;
  /** Unit cost before any markup, in dollars. */
  price: number;
  /** The unit this price is per. */
  unit: string;
  /** Every one of these must appear in the material's name. */
  all: string[];
  /** None of these may appear. Guards the near-misses. */
  none?: string[];
}

/** The units that mean the same thing, so a price is never applied per wrong unit. */
const UNIT_ALIASES: Record<string, string> = {
  each: 'each', ea: 'each', pc: 'each', pcs: 'each', piece: 'each', pieces: 'each', unit: 'each',
  sheet: 'sheet', sheets: 'sheet', panel: 'sheet', board: 'sheet',
  'sq ft': 'sqft', sqft: 'sqft', sf: 'sqft', 'square foot': 'sqft', 'square feet': 'sqft', 'ft2': 'sqft',
  'lin ft': 'lnft', 'linear ft': 'lnft', lf: 'lnft', lnft: 'lnft', 'linear foot': 'lnft',
  'linear feet': 'lnft', ft: 'lnft', foot: 'lnft', feet: 'lnft',
  box: 'box', boxes: 'box',
  bag: 'bag', bags: 'bag',
  gallon: 'gallon', gal: 'gallon', gallons: 'gallon',
  roll: 'roll', rolls: 'roll',
  bundle: 'bundle', bundles: 'bundle',
  square: 'square', squares: 'square',
  tube: 'tube', tubes: 'tube',
};

/** One canonical spelling for a unit, or null when none was given. */
export function normaliseUnit(unit: unknown): string | null {
  const raw = String(unit ?? '').trim().toLowerCase().replace(/\./g, '').replace(/\s+/g, ' ');
  if (!raw) return null;
  return UNIT_ALIASES[raw] ?? raw;
}

/**
 * The book. Most specific entries first, because the first match wins.
 *
 * An entry marked "GS" carries Granite State Building Supply's own published
 * price from 2026-09-27 rather than an estimate of it.
 */
export const STANDARD_MATERIAL_PRICES: StandardMaterial[] = [
  // ── flooring (GS-anchored) ───────────────────────────────────────────────
  { id: 'floor-engineered-oak', label: 'Engineered oak flooring, 5" wide', price: 4.85, unit: 'sqft',
    all: ['engineered', 'oak'] },
  { id: 'floor-lvp', label: 'Luxury vinyl plank, 20 mil wear layer', price: 2.48, unit: 'sqft',
    all: ['vinyl', 'plank'] },
  { id: 'floor-underlayment-acoustic', label: 'Acoustic underlayment, 3mm closed cell', price: 0.42, unit: 'sqft',
    all: ['acoustic', 'underlayment'] },
  { id: 'floor-transition-oak', label: 'Transition strip, oak, 72"', price: 18.75, unit: 'each',
    all: ['transition', 'strip'] },

  // ── framing lumber (GS-anchored where noted) ─────────────────────────────
  { id: 'lumber-2x4-pt-8', label: '2x4 pressure treated, 8ft', price: 8.74, unit: 'each',
    all: ['2x4', 'pressure', 'treated'] },
  { id: 'lumber-2x8-pt-12', label: 'Pressure-treated SYP, 2x8 x 12ft', price: 21.40, unit: 'each',
    all: ['2x8', 'pressure', 'treated'] },
  { id: 'lumber-2x4-stud', label: 'Kiln-dried SPF stud, 2x4', price: 4.12, unit: 'each',
    all: ['2x4', 'stud'], none: ['pressure', 'treated'] },
  { id: 'lumber-2x6', label: 'SPF framing lumber, 2x6 x 8ft', price: 7.20, unit: 'each',
    all: ['2x6'], none: ['pressure', 'treated'] },
  { id: 'lumber-2x10', label: 'SPF framing lumber, 2x10 x 12ft', price: 18.50, unit: 'each',
    all: ['2x10'], none: ['pressure', 'treated'] },

  // ── sheet goods ──────────────────────────────────────────────────────────
  { id: 'sheet-osb-716', label: 'OSB sheathing, 7/16" 4x8', price: 19.85, unit: 'sheet',
    all: ['osb'] },
  { id: 'sheet-ply-half', label: 'Plywood, 1/2" 4x8', price: 32.00, unit: 'sheet',
    all: ['plywood'] },
  { id: 'sheet-cement-board', label: 'Cement backer board, 1/4" 3x5', price: 12.90, unit: 'sheet',
    all: ['cement', 'board'] },
  { id: 'sheet-drywall-half', label: 'Drywall, 1/2" 4x8', price: 14.50, unit: 'sheet',
    all: ['drywall'], none: ['tape', 'compound', 'screw', 'mud'] },

  // ── drywall finishing ────────────────────────────────────────────────────
  { id: 'drywall-compound', label: 'Joint compound, 4.5 gallon', price: 18.00, unit: 'each',
    all: ['joint', 'compound'] },
  { id: 'drywall-tape', label: 'Drywall tape, 500ft roll', price: 8.50, unit: 'roll',
    all: ['drywall', 'tape'] },

  // ── roofing ──────────────────────────────────────────────────────────────
  { id: 'roof-shingles-arch', label: 'Architectural shingles', price: 38.00, unit: 'bundle',
    all: ['architectural', 'shingle'] },
  { id: 'roof-ice-water', label: 'Ice and water shield', price: 95.00, unit: 'roll',
    all: ['ice', 'water'] },
  { id: 'roof-underlayment-syn', label: 'Synthetic roofing underlayment', price: 115.00, unit: 'roll',
    all: ['synthetic', 'underlayment'] },
  { id: 'roof-drip-edge', label: 'Drip edge, 10ft', price: 12.00, unit: 'each',
    all: ['drip', 'edge'] },

  // ── siding & weather barrier ─────────────────────────────────────────────
  { id: 'siding-vinyl', label: 'Vinyl siding', price: 110.00, unit: 'square',
    all: ['vinyl', 'siding'] },
  { id: 'wrap-house', label: 'House wrap, 9ft x 150ft', price: 155.00, unit: 'roll',
    all: ['house', 'wrap'] },

  // ── tile ─────────────────────────────────────────────────────────────────
  { id: 'tile-ceramic-floor', label: 'Ceramic floor tile', price: 2.40, unit: 'sqft',
    all: ['ceramic', 'tile'] },
  { id: 'tile-thinset', label: 'Thinset mortar, 50lb', price: 18.00, unit: 'bag',
    all: ['thinset'] },
  { id: 'tile-grout', label: 'Tile grout, 25lb', price: 22.00, unit: 'bag',
    all: ['grout'] },

  // ── paint & sealant ──────────────────────────────────────────────────────
  { id: 'paint-interior-latex', label: 'Interior latex paint', price: 42.00, unit: 'gallon',
    all: ['interior', 'paint'] },
  { id: 'paint-primer', label: 'Primer', price: 32.00, unit: 'gallon',
    all: ['primer'] },
  { id: 'sealant-caulk', label: 'Caulk', price: 6.50, unit: 'tube',
    all: ['caulk'] },

  // ── fasteners & hardware (GS-anchored where noted) ───────────────────────
  { id: 'fastener-screws-925', label: 'Construction screws, #9 x 2-1/2", 5lb', price: 34.60, unit: 'box',
    all: ['construction', 'screw'] },
  { id: 'fastener-framing-nails', label: 'Framing nails, 3"', price: 55.00, unit: 'box',
    all: ['framing', 'nail'] },
  { id: 'hardware-joist-hanger', label: 'Joist hanger, 2x8, galvanised', price: 2.35, unit: 'each',
    all: ['joist', 'hanger'] },

  // ── concrete & masonry ───────────────────────────────────────────────────
  { id: 'concrete-mix-80', label: 'Concrete mix, 80lb', price: 6.25, unit: 'bag',
    all: ['concrete', 'mix'] },
  { id: 'rebar-4', label: 'Rebar, #4 x 20ft', price: 14.00, unit: 'each',
    all: ['rebar'] },

  // ── insulation & trim ────────────────────────────────────────────────────
  { id: 'insulation-batt-r13', label: 'Fibreglass batt, R-13', price: 0.62, unit: 'sqft',
    all: ['batt'] },
  { id: 'trim-baseboard-pine', label: 'Primed pine baseboard, 1x4', price: 2.10, unit: 'lnft',
    all: ['baseboard'] },

  // ── protection & consumables ─────────────────────────────────────────────
  { id: 'protect-poly-sheeting', label: 'Plastic sheeting, 10ft x 100ft', price: 28.00, unit: 'roll',
    all: ['plastic', 'sheeting'] },
  { id: 'protect-painters-tape', label: "Painter's tape", price: 7.00, unit: 'roll',
    all: ['painter', 'tape'] },
];

const normName = (value: unknown) =>
  String(value ?? '').toLowerCase().replace(/[^a-z0-9/"'\s.-]/g, ' ').replace(/\s+/g, ' ').trim();

/**
 * The reference price for a material, or null when the book does not cover it.
 *
 * Null is the expected answer for most of a real takeoff and is not a failure:
 * an unmatched line keeps the model's price and stays marked `estimated`, which
 * is honest. Guessing here would make a wrong number look stable.
 */
export function matchStandardMaterial(
  material: { name?: string; description?: string; unit?: string },
  book: StandardMaterial[] = STANDARD_MATERIAL_PRICES,
): StandardMaterial | null {
  const haystack = normName(`${material?.name ?? ''} ${material?.description ?? ''}`);
  if (!haystack) return null;

  const theirUnit = normaliseUnit(material?.unit);

  for (const entry of book) {
    if (!entry.all.every((token) => haystack.includes(token))) continue;
    if (entry.none?.some((token) => haystack.includes(token))) continue;
    // A unit the caller stated must agree. A line with no unit is allowed
    // through, because plenty of takeoff lines omit it and the entry's own unit
    // is then the stated one.
    if (theirUnit && theirUnit !== normaliseUnit(entry.unit)) continue;
    return entry;
  }
  return null;
}
