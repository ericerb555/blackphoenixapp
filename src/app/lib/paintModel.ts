/**
 * Paint — colours, products, and how many tins a job needs.
 *
 * WHY A PAINT COLOUR IS NOT A COLOUR
 *
 * The obvious version of this feature is a colour picker with a list of
 * Benjamin Moore colours pasted into a constant. That is wrong twice over.
 *
 * A paint colour is a **product from a vendor's catalogue**. It has a code, a
 * name, a line, a sheen, a base, a price per gallon and a coverage rate, and
 * which vendor it came from decides every one of those. Two vendors' "off
 * white" are different paints at different prices covering different areas.
 * So paint lives with the rest of the vendor catalogue and this file models
 * what is specific to it, rather than owning a private list of colours.
 *
 * WHAT MUST NEVER HAPPEN HERE
 *
 * **No invented colours.** If it is not in a catalogue it is not offered. An
 * invented paint code on an order is a real-world error — somebody stands at a
 * counter and is told the code does not exist — not a UI blemish. Everything
 * below refuses rather than guesses.
 *
 * **No bare hex.** A swatch is always shown with the vendor's own name and
 * code, because `#F7F4EF` cannot be ordered and "Simply White OC-117" can.
 * `paintLabel` exists so no screen has to remember that.
 *
 * **No pretending a screen is a fan deck.** An uncalibrated monitor is not the
 * colour that arrives in the tin, and a customer who chooses from a screen and
 * is disappointed on site is a real dispute. `SCREEN_COLOUR_CAVEAT` is part of
 * the feature, not a disclaimer bolted on afterwards.
 *
 * ON PRICING
 *
 * Only the vendor's own price per gallon appears here. What Black Phoenix
 * negotiates is not in this model at all, so no screen built on it can leak a
 * margin by accident — the rule is enforced by the shape rather than by
 * remembering to filter.
 */

/** Sheen, in the order a decorator would list it — flattest first. */
export type Sheen = 'flat' | 'matte' | 'eggshell' | 'satin' | 'semi-gloss' | 'gloss';

export const SHEENS: Sheen[] = ['flat', 'matte', 'eggshell', 'satin', 'semi-gloss', 'gloss'];

/**
 * One colour from one vendor's deck.
 *
 * `hex` is for display only and is documented as an approximation everywhere it
 * is shown. `code` is what gets ordered.
 */
export interface PaintColor {
  id: string;
  /** "Benjamin Moore", "Sherwin-Williams". Never blank. */
  vendor: string;
  /** The vendor's own code — "OC-117", "SW 7008". Never blank. */
  code: string;
  /** The vendor's own name — "Simply White". */
  name: string;
  /** Approximate screen rendering. Not orderable, not a decision. */
  hex: string;
}

/**
 * A tin: a product line at a sheen, with what it costs and what it covers.
 *
 * Coverage is the field people forget and it swings the quantity by a third.
 * A flat wall paint covers far more than a semi-gloss over bare trim, and a
 * deep base covers less than a white one.
 */
export interface PaintProduct {
  id: string;
  vendor: string;
  /** The product line — "Regal Select", "Duration". */
  line: string;
  sheen: Sheen;
  /** Which base, because it changes both price and coverage. */
  base?: string;
  /** Square feet one gallon covers, one coat. */
  coverageSqFtPerGal: number;
  /** The VENDOR's price. Never ours. */
  pricePerGal: number;
}

/** Which surface is being painted. Each has its own area and its own habits. */
export type PaintSurface = 'walls' | 'ceiling' | 'trim' | 'siding' | 'doors';

export const SURFACE_LABEL: Record<PaintSurface, string> = {
  walls: 'Walls',
  ceiling: 'Ceiling',
  trim: 'Trim',
  siding: 'Siding',
  doors: 'Doors',
};

/**
 * Two coats is the honest default and it is stated rather than hidden.
 *
 * One coat over an existing similar colour happens and is a decision somebody
 * makes; one coat assumed silently is how a quote comes in short and the crew
 * runs out on the second day.
 */
export const DEFAULT_COATS = 2;

/** A colour and a product chosen for one surface. */
export interface PaintChoice {
  surface: PaintSurface;
  colorId: string;
  productId: string;
  coats: number;
}

export const SCREEN_COLOUR_CAVEAT =
  'Screen colour is an approximation — monitors vary and the tin will not match '
  + 'exactly. Decide from a physical chip or a sample pot.';

/* ── what may be offered at all ──────────────────────────────────────────── */

/**
 * Is this colour something somebody can actually walk in and buy?
 *
 * A colour with no vendor or no code came from somewhere it should not have —
 * a hand-typed row, a half-parsed import — and offering it produces an order
 * nobody can fill. Refused rather than repaired, because there is nothing to
 * repair it from.
 */
export function isOrderable(color: Partial<PaintColor> | null | undefined): boolean {
  return !!(
    color
    && String(color.vendor || '').trim()
    && String(color.code || '').trim()
    && String(color.name || '').trim()
  );
}

/**
 * How a colour is written wherever it appears.
 *
 * Name, code, vendor — in that order, because that is the order somebody says
 * it at a trade counter. Never the hex: it is not orderable and showing it as
 * though it were invites somebody to work from it.
 */
export function paintLabel(color: PaintColor | null | undefined): string {
  if (!isOrderable(color)) return 'No colour chosen';
  const c = color as PaintColor;
  return `${c.name.trim()} ${c.code.trim()} (${c.vendor.trim()})`;
}

/**
 * A hex safe to put in a style attribute.
 *
 * Anything that is not a plain 3- or 6-digit hex becomes a neutral grey rather
 * than being passed through. A colour field is vendor-supplied text and it ends
 * up inside `style`, so it is exactly the sort of field that should not be
 * trusted to be what it claims.
 */
export function safeHex(hex: string | null | undefined): string {
  const v = String(hex || '').trim();
  return /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(v) ? v : '#9ca3af';
}

/* ── quantities ──────────────────────────────────────────────────────────── */

/**
 * Gallons for an area, rounded up, because paint is sold in tins.
 *
 * Rounding up is not padding. Three-quarters of a gallon short on the last wall
 * means a second trip, a different batch and a visible line where the two meet.
 *
 * Returns 0 for a zero area rather than a minimum tin: somebody who has not
 * drawn the room yet should see nothing, not one gallon.
 */
export function gallonsFor(
  areaSqFt: number,
  coverageSqFtPerGal: number,
  coats: number = DEFAULT_COATS,
): number {
  const area = Number(areaSqFt);
  const coverage = Number(coverageSqFtPerGal);
  const n = Number(coats);
  if (!Number.isFinite(area) || area <= 0) return 0;
  // A coverage of zero or nonsense cannot produce a quantity. Returning 0 says
  // "cannot answer" rather than dividing by zero and reporting Infinity tins.
  if (!Number.isFinite(coverage) || coverage <= 0) return 0;
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.ceil((area * n) / coverage);
}

/** What those gallons cost at the vendor's own price. Never at ours. */
export function paintCost(gallons: number, product: PaintProduct | null | undefined): number {
  const g = Number(gallons);
  const price = Number(product?.pricePerGal);
  if (!Number.isFinite(g) || g <= 0) return 0;
  if (!Number.isFinite(price) || price <= 0) return 0;
  return Math.round(g * price * 100) / 100;
}

/* ── into the scope ──────────────────────────────────────────────────────── */

export interface PaintLineInput {
  surface: PaintSurface;
  /** Where it is — "Kitchen", "Back elevation". */
  where: string;
  areaSqFt: number;
  color: PaintColor;
  product: PaintProduct;
  coats: number;
}

/**
 * A scope line for one painted surface.
 *
 * The basis says the arithmetic out loud — area, coats, coverage — because the
 * quantity is the thing somebody will want to check, and a number with no
 * working shown gets either believed blindly or ignored entirely.
 *
 * Shaped for `addLine`, which supplies the id.
 */
export function paintScopeLine(input: PaintLineInput): {
  phase: 'paint';
  trade: 'painting';
  description: string;
  qty: number;
  unit: string;
  confidence: 'provisional';
  origin: 'trade-tool';
  sku: string;
  basis: string;
} | null {
  if (!isOrderable(input?.color)) return null;
  const coats = Number(input.coats) > 0 ? Number(input.coats) : DEFAULT_COATS;
  const gallons = gallonsFor(input.areaSqFt, input.product?.coverageSqFtPerGal, coats);
  if (gallons <= 0) return null;

  const area = Math.round(Number(input.areaSqFt) * 10) / 10;
  const coverage = Number(input.product.coverageSqFtPerGal);

  return {
    phase: 'paint',
    trade: 'painting',
    description:
      `${SURFACE_LABEL[input.surface]} — ${input.where}: ${paintLabel(input.color)}`
      + `, ${input.product.line} ${input.product.sheen}`,
    qty: gallons,
    unit: 'gal',
    // Nothing here has been measured on site and the tin count follows from a
    // dimension that may itself be a photo read, so it starts provisional like
    // every other trade-tool line.
    confidence: 'provisional',
    origin: 'trade-tool',
    // The vendor's code is what gets looked up and what gets ordered.
    sku: input.color.code.trim(),
    basis: `${area} sq ft × ${coats} coat${coats === 1 ? '' : 's'} ÷ ${coverage} sq ft per gal`,
  };
}
