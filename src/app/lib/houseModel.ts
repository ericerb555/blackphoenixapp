/**
 * The house, as the design centre understands it.
 *
 * WHY THIS EXISTS
 *
 * The house in the 3D view was invented from the deck — the wall was the deck's
 * width plus sixteen feet, the door was a hardcoded six by six-eight, and the
 * door sill was derived from the deck height. That last one is backwards from
 * how the job is actually done: the sill is what decides how high the deck can
 * sit, not the other way round.
 *
 * Meanwhile the photo analysis was already returning the real thing — siding
 * type, sill height, storeys, each wall with its dimensions and openings, every
 * field carrying its own confidence — and nothing read any of it for geometry.
 * The two ends existed and were never joined.
 *
 * HOW ACCURACY WORKS HERE
 *
 * Not by scanning. A sheet of paper of known size goes in every photograph,
 * which is what gives a single camera absolute scale, and the builder corrects
 * the numbers afterwards with a tape measure. Approximate-from-photographs plus
 * operator correction is the design, not a stepping stone to something cleverer.
 * That is why every field carries where it came from: a number read off a photo
 * and a number somebody measured are both useful, and confusing them is how a
 * guess ends up in a permit set.
 *
 * A HOUSE IS A SET OF VIEWS
 *
 * Not one elevation. A view is one named piece of the building — "back
 * elevation", "kitchen", "north gable". A partial capture is a single view and a
 * full house is several, which matters because a deck job needs one wall and
 * being made to photograph a whole house first would be an obstacle. When the
 * same customer later wants siding, the remaining elevations are added to the
 * house that already exists rather than described a second time.
 *
 * The house belongs to the project rather than to any one trade, because siding,
 * openings, roofing and the interior trades are all working on the same
 * building. Four trades each holding their own description of one house is four
 * things free to disagree.
 */

/** Where a number came from. Never let these blur together. */
export type Provenance = 'measured' | 'photos' | 'estimated';

export type OpeningKind = 'door' | 'slider' | 'window' | 'garage';

export interface Opening {
  id: string;
  kind: OpeningKind;
  widthFt: number;
  heightFt: number;
  /** Feet from the left end of the wall to this opening's left edge. */
  offsetFt: number;
  /** Feet from grade to the bottom of the opening. */
  sillFt: number;
}

export interface HouseView {
  id: string;
  name: string;
  kind: 'elevation' | 'room';
  /** Along the wall, or the long dimension of a room. */
  widthFt: number;
  /** Grade to eave for an elevation; floor to ceiling for a room. */
  heightFt: number;
  storeys: number;
  sidingType: string;
  /**
   * Grade to the door threshold, in inches.
   *
   * The single most important number on an elevation for a deck: it decides the
   * deck height, because the deck surface sits just below the threshold.
   */
  sillHeightInches: number;
  openings: Opening[];
  /** Field name → where that field's value came from. */
  source: Record<string, Provenance>;
  capturedAt?: string;
}

export interface House {
  views: HouseView[];
  /** Which view the open trade is working against. */
  activeViewId: string | null;
}

/**
 * How far the deck surface sits below the door threshold, in inches.
 *
 * A deck flush with the threshold walks water back into the house, so the
 * surface drops slightly below it.
 */
export const DECK_BELOW_SILL_INCHES = 1.5;

export const BLANK_HOUSE: House = { views: [], activeViewId: null };

let seq = 0;
function newId(prefix: string): string {
  seq += 1;
  return `${prefix}-${Date.now().toString(36)}-${seq.toString(36)}`;
}

/** A view with nothing known about it yet. Every field marked as a guess. */
export function blankView(name: string, kind: 'elevation' | 'room' = 'elevation'): HouseView {
  return {
    id: newId('HV'),
    name: name.trim() || 'Untitled view',
    kind,
    widthFt: kind === 'room' ? 12 : 28,
    heightFt: kind === 'room' ? 8 : 18,
    storeys: kind === 'room' ? 1 : 2,
    sidingType: 'unknown',
    sillHeightInches: 24,
    openings: [],
    source: {
      widthFt: 'estimated', heightFt: 'estimated', storeys: 'estimated',
      sidingType: 'estimated', sillHeightInches: 'estimated',
    },
  };
}

function num(value: any, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

/**
 * Build a view from what the photo read came back with.
 *
 * Anything the analysis actually supplied is marked `photos`; anything it left
 * out keeps the blank default and stays `estimated`, so the panel can be honest
 * about which is which rather than presenting a default as a finding.
 */
export function viewFromAnalysis(analysis: any, name = 'Back elevation'): HouseView {
  const base = blankView(name, 'elevation');
  if (!analysis || typeof analysis !== 'object') return base;

  const wall = Array.isArray(analysis.walls) && analysis.walls.length
    ? analysis.walls[0]
    : analysis;
  const attachment = analysis.attachment || {};

  const view: HouseView = { ...base, source: { ...base.source }, capturedAt: new Date().toISOString() };

  const widthFt = Number(wall?.widthFt);
  if (Number.isFinite(widthFt) && widthFt > 0) { view.widthFt = widthFt; view.source.widthFt = 'photos'; }

  const heightFt = Number(wall?.heightFt);
  if (Number.isFinite(heightFt) && heightFt > 0) { view.heightFt = heightFt; view.source.heightFt = 'photos'; }

  const storeys = Number(wall?.storeys ?? analysis.storeys);
  if (Number.isFinite(storeys) && storeys > 0) { view.storeys = storeys; view.source.storeys = 'photos'; }

  const siding = String(analysis.sidingType || wall?.sidingType || '').trim();
  if (siding && siding !== 'unknown') { view.sidingType = siding; view.source.sidingType = 'photos'; }

  const sill = Number(attachment.sillHeightInches ?? analysis.sillHeightInches);
  if (Number.isFinite(sill) && sill > 0) { view.sillHeightInches = sill; view.source.sillHeightInches = 'photos'; }

  // The analysis reports openings as a count and a typical size rather than
  // individually placed ones. Spreading them evenly is a starting point to drag
  // or type over, not a claim about where the windows are — so they are marked
  // estimated even though the count came from a photograph.
  const count = Number(wall?.openings?.count) || 0;
  if (count > 0) {
    const ow = num(wall?.openings?.typicalWidthFt, 3);
    const oh = num(wall?.openings?.typicalHeightFt, 4);
    const gap = view.widthFt / (count + 1);
    for (let i = 0; i < count; i++) {
      view.openings.push({
        id: newId('OP'),
        kind: 'window',
        widthFt: ow,
        heightFt: oh,
        offsetFt: Math.max(0, gap * (i + 1) - ow / 2),
        sillFt: 3,
      });
    }
    view.source.openings = 'estimated';
  }

  return view;
}

/**
 * Type a real measurement over a field.
 *
 * Marks it `measured`, which is what stops a later photo read from overwriting
 * it — somebody standing at the house with a tape beats anything inferred from
 * an image, and having done that work once they should not have to do it again.
 */
export function setMeasured<K extends keyof HouseView>(
  view: HouseView, field: K, value: HouseView[K],
): HouseView {
  return { ...view, [field]: value, source: { ...view.source, [field as string]: 'measured' } };
}

/**
 * Fold a fresh photo read into a view, keeping every measured field.
 *
 * Re-reading the photos must never quietly discard numbers somebody measured.
 */
export function mergeRead(existing: HouseView, fresh: HouseView): HouseView {
  const out: any = { ...existing };
  const source = { ...existing.source };

  for (const field of ['widthFt', 'heightFt', 'storeys', 'sidingType', 'sillHeightInches'] as const) {
    if (existing.source[field] === 'measured') continue;
    if (fresh.source[field] === 'photos') { out[field] = fresh[field]; source[field] = 'photos'; }
  }

  // Openings are replaced only when none have been placed by hand.
  if (source.openings !== 'measured' && fresh.openings.length) {
    out.openings = fresh.openings;
    source.openings = fresh.source.openings || 'estimated';
  }

  out.source = source;
  out.capturedAt = fresh.capturedAt || existing.capturedAt;
  return out as HouseView;
}

export function activeView(house: House | null | undefined): HouseView | null {
  if (!house || !Array.isArray(house.views) || !house.views.length) return null;
  return house.views.find((v) => v.id === house.activeViewId) || house.views[0];
}

/** Add a view, or replace one with the same id. Keeps it the active one. */
export function upsertView(house: House, view: HouseView): House {
  const views = house.views.some((v) => v.id === view.id)
    ? house.views.map((v) => (v.id === view.id ? view : v))
    : [...house.views, view];
  return { views, activeViewId: view.id };
}

export function removeView(house: House, id: string): House {
  const views = house.views.filter((v) => v.id !== id);
  return {
    views,
    activeViewId: house.activeViewId === id ? (views[0]?.id ?? null) : house.activeViewId,
  };
}

/**
 * The deck height this elevation implies, in feet.
 *
 * This is the relationship the old code had inverted. The threshold is a fact
 * about the house; the deck height follows from it.
 */
export function deckHeightFromSill(sillHeightInches: number): number {
  const usable = Math.max(0, Number(sillHeightInches) || 0);
  return Math.max(0, (usable - DECK_BELOW_SILL_INCHES) / 12);
}

/** Gross wall area, before openings are taken out. */
export function grossWallArea(view: HouseView): number {
  return Math.max(0, view.widthFt) * Math.max(0, view.heightFt);
}

/** Wall area with the openings deducted — what siding is actually priced on. */
export function netWallArea(view: HouseView): number {
  const holes = view.openings.reduce((sum, o) => sum + Math.max(0, o.widthFt) * Math.max(0, o.heightFt), 0);
  return Math.max(0, grossWallArea(view) - holes);
}

/** True when nothing about this view has been measured or read from a photo. */
export function isGuesswork(view: HouseView): boolean {
  return Object.values(view.source).every((s) => s === 'estimated');
}

/** How many of a view's fields are still guesses — drives the honesty badge. */
export function guessCount(view: HouseView): number {
  return Object.values(view.source).filter((s) => s === 'estimated').length;
}
