/**
 * Turning a photo reading into walls the takeoff can count.
 *
 * WHY THIS IS ITS OWN FILE
 *
 * The translation is where honesty is either kept or quietly lost. The analysis
 * hands back numbers with a basis and a confidence attached; the takeoff has a
 * `source` per wall that decides whether the whole set reads as an order or as a
 * conversation. Mapping one to the other in the middle of a component is how
 * that gets dropped, so it happens here where it can be read and tested.
 *
 * THE RULE THAT MATTERS
 *
 * **Nothing that came out of a photograph is ever `measured`.** A wall scaled
 * against a sheet of paper is `scaled`; a wall guessed from typical
 * construction is `estimated`. `measured` is reserved for a number somebody put
 * a tape on, and the only way a wall becomes measured is a person typing it.
 * Siding is sold by the square, so the difference between those decides whether
 * an order arrives short.
 */

import type { Elevation, ExteriorModel, DimensionSource } from './exteriorModel';
import { DEFAULT_EXTERIOR } from './exteriorModel';

/** One wall as the analysis reports it. */
export interface CapturedElevation {
  label?: string;
  widthFt?: number;
  heightToEaveFt?: number;
  gableRiseFt?: number;
  storeys?: number;
  openings?: { count?: number; typicalWidthFt?: number; typicalHeightFt?: number };
  basis?: string;
  confidence?: string;
}

export interface CapturedExterior {
  house?: {
    storeys?: number;
    sidingType?: string;
    outsideCorners?: number;
    insideCorners?: number;
  };
  elevations?: CapturedElevation[];
}

/**
 * A photograph can produce two of the three sources and never the third.
 *
 * `low` confidence is demoted even when a scale object was used, because a
 * reference the model could barely see is not the reference doing the work.
 */
export function sourceFor(basis?: string, confidence?: string): DimensionSource {
  if (String(basis) === 'scale-object' && String(confidence) !== 'low') return 'scaled';
  return 'estimated';
}

/** The existing siding, mapped onto what we can actually quote. */
export function materialFor(sidingType?: string): ExteriorModel['material'] {
  const s = String(sidingType || '').toLowerCase();
  if (s.includes('fiber') || s.includes('fibre') || s.includes('cement')) return 'fibre-cement';
  if (s.includes('clapboard') || s.includes('cedar') || s.includes('wood') || s.includes('shingle')) return 'wood';
  // Vinyl is both the most common and the safest default: it is the cheapest to
  // hang, so defaulting here never quietly inflates an estimate.
  return 'vinyl';
}

/**
 * Walls from a reading, ready to be corrected.
 *
 * Anything without a usable length is dropped rather than added as a zero — an
 * empty row in the takeoff looks like a wall somebody forgot to fill in, which
 * is worse than a wall that was never claimed.
 */
export function exteriorFromCapture(capture: CapturedExterior): Partial<ExteriorModel> {
  const raw = Array.isArray(capture?.elevations) ? capture.elevations : [];

  const elevations: Elevation[] = raw
    .filter(e => Number(e?.widthFt) > 0)
    .map((e, i) => {
      const count = Math.max(0, Math.round(Number(e?.openings?.count) || 0));
      return {
        id: `captured-${i}`,
        label: String(e?.label || `Wall ${i + 1}`),
        widthFt: Number(e.widthFt) || 0,
        // A wall with no stated height is far more likely to be a single storey
        // at nine feet than zero, and zero would silently contribute no area.
        heightFt: Number(e?.heightToEaveFt) > 0 ? Number(e.heightToEaveFt) : 9,
        gableRiseFt: Math.max(0, Number(e?.gableRiseFt) || 0),
        storeys: Math.max(1, Math.round(Number(e?.storeys) || 1)),
        openings: count > 0
          ? [{
              kind: 'window' as const,
              widthFt: Number(e?.openings?.typicalWidthFt) || 3,
              heightFt: Number(e?.openings?.typicalHeightFt) || 4,
              count,
            }]
          : [],
        source: sourceFor(e?.basis, e?.confidence),
      };
    });

  if (!elevations.length) return {};

  const cornerHeightFt = Math.max(...elevations.map(e => e.heightFt), DEFAULT_EXTERIOR.cornerHeightFt);

  return {
    elevations,
    material: materialFor(capture?.house?.sidingType),
    // Four is the right guess for a rectangle and wrong for anything else, so
    // it is offered rather than asserted — the operator can see and change it.
    outsideCorners: Math.max(0, Math.round(Number(capture?.house?.outsideCorners) || 4)),
    insideCorners: Math.max(0, Math.round(Number(capture?.house?.insideCorners) || 0)),
    cornerHeightFt,
  };
}

/** Plain sentence about what was just read, for the screen. */
export function captureSummary(model: Partial<ExteriorModel>): string {
  const n = model.elevations?.length || 0;
  if (!n) return 'No walls could be read from those photos. Enter them by hand.';
  const scaled = model.elevations!.filter(e => e.source === 'scaled').length;
  return scaled === n
    ? `${n} wall${n > 1 ? 's' : ''} read and scaled against the reference. Check each one against a tape before ordering.`
    : scaled > 0
      ? `${n} walls read — ${scaled} scaled against the reference, the rest estimated from typical construction. Measure the estimated ones.`
      : `${n} wall${n > 1 ? 's' : ''} read, all estimated from typical construction. Nothing here is measured — treat it as a starting point.`;
}
