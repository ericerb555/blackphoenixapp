/**
 * The outside of a house, in the quantities a siding job is bought in.
 *
 * WHY THIS EXISTS SEPARATELY FROM THE DECK MODEL
 *
 * `DeckModel` describes a structure being built. This describes a building that
 * already stands, measured well enough to order material against. They share
 * nothing — a deck has joists and spans, a facade has area, openings and
 * corners — so putting them in one type would only mean two half-empty objects.
 *
 * WHERE THE NUMBERS COME FROM, AND WHY EACH ONE SAYS SO
 *
 * Siding is sold by the square, and a fifteen percent error in facade area is
 * real money. So every elevation carries its own `source`, exactly as a quote
 * line carries a price source:
 *
 *   measured   — someone put a tape on it, or a survey did
 *   scaled     — derived from a known-size object in the photograph
 *   estimated  — derived from an assumption about typical construction
 *
 * A takeoff built entirely from `estimated` elevations is a conversation, not
 * an order, and the summary is required to say so rather than let it pass as
 * a quantity.
 */

export type DimensionSource = 'measured' | 'scaled' | 'estimated';

export type SidingMaterial = 'vinyl' | 'fibre-cement' | 'wood' | 'engineered-wood';

export interface Opening {
  kind: 'window' | 'door';
  widthFt: number;
  heightFt: number;
  /** How many of this size on this elevation. Saves listing eight identical windows. */
  count?: number;
}

export interface Elevation {
  id: string;
  label: string;
  /** Along the wall. */
  widthFt: number;
  /** Grade to the eave. The rectangle. */
  heightFt: number;
  /**
   * Height of the gable triangle above the eave, if this elevation has one.
   * Kept apart from `heightFt` because a gable is half the area of the
   * rectangle it sits on, and folding it into the wall height overstates it by
   * double — which on a cape or a colonial is several squares.
   */
  gableRiseFt?: number;
  openings: Opening[];
  /** Two storeys means staging, which is labour rather than material. */
  storeys?: number;
  source: DimensionSource;
}

export interface ExteriorModel {
  elevations: Elevation[];
  material: SidingMaterial;
  /** Outside corners are posts or corner boards; inside corners are trim. */
  outsideCorners: number;
  insideCorners: number;
  /** Corners run the full wall height, so this is usually the tallest eave. */
  cornerHeightFt: number;
  includeWrap: boolean;
  /**
   * Cut waste. Ten percent on plain walls, more where there are gables and
   * dormers, because every rake cut throws away the offcut.
   */
  wasteFactorPct: number;
  /**
   * Openings smaller than this are not deducted.
   *
   * This is estimating practice rather than arithmetic: the offcut from a small
   * window is unusable, so deducting it produces an order that comes up short.
   * Big openings are deducted because a patio slider genuinely is material not
   * bought.
   */
  minDeductSqFt: number;
}

export const DEFAULT_EXTERIOR: ExteriorModel = {
  elevations: [],
  material: 'vinyl',
  outsideCorners: 4,
  insideCorners: 0,
  cornerHeightFt: 9,
  includeWrap: true,
  wasteFactorPct: 10,
  minDeductSqFt: 10,
};

const round1 = (n: number) => Math.round((Number(n) || 0) * 10) / 10;
const round2 = (n: number) => Math.round((Number(n) || 0) * 100) / 100;

export interface ElevationAreas {
  id: string;
  label: string;
  /** Wall rectangle plus any gable, before anything is taken out. */
  grossSqFt: number;
  /** Only the openings big enough to be worth deducting. */
  deductedSqFt: number;
  netSqFt: number;
  /** Perimeter of every opening — this is what J-channel or trim follows. */
  openingPerimeterFt: number;
  /** Along the bottom, where the starter strip runs. */
  starterFt: number;
  storeys: number;
  source: DimensionSource;
}

/** One elevation, resolved into areas. */
export function elevationAreas(e: Elevation, minDeductSqFt: number): ElevationAreas {
  const w = Number(e.widthFt) || 0;
  const h = Number(e.heightFt) || 0;
  const rise = Number(e.gableRiseFt) || 0;

  // A gable is a triangle: half the base times the rise.
  const gross = w * h + (rise > 0 ? (w * rise) / 2 : 0);

  let deducted = 0;
  let perimeter = 0;
  for (const o of e.openings || []) {
    const n = Math.max(1, Number(o.count) || 1);
    const ow = Number(o.widthFt) || 0;
    const oh = Number(o.heightFt) || 0;
    const area = ow * oh;
    perimeter += n * 2 * (ow + oh);
    if (area >= minDeductSqFt) deducted += n * area;
  }

  return {
    id: e.id,
    label: e.label,
    grossSqFt: round1(gross),
    deductedSqFt: round1(deducted),
    netSqFt: round1(Math.max(0, gross - deducted)),
    openingPerimeterFt: round1(perimeter),
    starterFt: round1(w),
    storeys: Math.max(1, Number(e.storeys) || 1),
    source: e.source,
  };
}

export interface ExteriorTakeoff {
  perElevation: ElevationAreas[];
  grossSqFt: number;
  deductedSqFt: number;
  /** What actually gets covered. */
  netSqFt: number;
  /** Net plus waste — the number to order against. */
  orderSqFt: number;
  /** Siding is bought and sold by the square. */
  squares: number;
  starterFt: number;
  /** J-channel on vinyl, trim boards on anything else. */
  openingTrimFt: number;
  outsideCornerFt: number;
  insideCornerFt: number;
  wrapSqFt: number;
  /** Any elevation above one storey needs staging, which is labour. */
  stagingSqFt: number;
  /** Worst source across the elevations — a takeoff is only as good as its weakest wall. */
  basis: DimensionSource;
  note: string;
}

const SOURCE_RANK: Record<DimensionSource, number> = { measured: 3, scaled: 2, estimated: 1 };

/**
 * Everything a siding job needs counted.
 *
 * Deliberately returns quantities and not prices. Pricing belongs where every
 * other price lives — the catalogue for material, the trade rate and the task
 * hours for labour — so that a siding job is priced by the same machinery, and
 * marked with the same sources, as everything else this company quotes.
 */
export function exteriorTakeoff(m: ExteriorModel): ExteriorTakeoff {
  const minDeduct = Number(m.minDeductSqFt) || 0;
  const per = (m.elevations || []).map(e => elevationAreas(e, minDeduct));

  const sum = (f: (a: ElevationAreas) => number) => per.reduce((s, a) => s + f(a), 0);

  const gross = sum(a => a.grossSqFt);
  const deducted = sum(a => a.deductedSqFt);
  const net = sum(a => a.netSqFt);
  const waste = Math.max(0, Number(m.wasteFactorPct) || 0);
  const order = net * (1 + waste / 100);

  const cornerH = Number(m.cornerHeightFt) || 0;

  // Only the walls that are actually more than one storey need staging, not the
  // whole house, or a ranch with one two-storey gable end gets priced as if the
  // crew staged the lot.
  const staging = per.filter(a => a.storeys > 1).reduce((s, a) => s + a.netSqFt, 0);

  const worst = per.length
    ? per.reduce<DimensionSource>((w, a) => (SOURCE_RANK[a.source] < SOURCE_RANK[w] ? a.source : w), 'measured')
    : 'estimated';

  const note = !per.length
    ? 'No elevations captured yet.'
    : worst === 'measured'
      ? 'Every elevation was measured. These quantities can be ordered against.'
      : worst === 'scaled'
        ? 'Some elevations were scaled from a reference object in a photograph rather than measured. Good enough to quote from, worth checking with a tape before ordering.'
        : 'At least one elevation is estimated from typical construction rather than measured. Treat these quantities as a conversation, not an order.';

  return {
    perElevation: per,
    grossSqFt: round1(gross),
    deductedSqFt: round1(deducted),
    netSqFt: round1(net),
    orderSqFt: round1(order),
    squares: round2(order / 100),
    starterFt: round1(sum(a => a.starterFt)),
    openingTrimFt: round1(sum(a => a.openingPerimeterFt)),
    outsideCornerFt: round1((Number(m.outsideCorners) || 0) * cornerH),
    insideCornerFt: round1((Number(m.insideCorners) || 0) * cornerH),
    wrapSqFt: m.includeWrap ? round1(gross) : 0,
    stagingSqFt: round1(staging),
    basis: worst,
    note,
  };
}
