/**
 * Overhead, profit, contingency and tax — the arithmetic above direct cost.
 *
 * WHY THIS IS ITS OWN MODULE
 *
 * The worst pricing fault this project has had lived here, in the handoff
 * between `repriceEstimate` and the assembler in `quote-generator.tsx`. The
 * repricer emitted PERCENTAGES out of the company's settings —
 * `overheadPercentage: 10` — and the assembler read the same fields as
 * FRACTIONS and clamped them at 0.4. So 10 became 0.4, and every repriced
 * quote carried 40% overhead and 40% profit instead of 10% and 15%, putting a
 * representative job at 1.88x direct cost rather than 1.35x.
 *
 * Unit tests on either side would both have passed, and did: each module did
 * exactly what it believed it should. The CONTRACT between them was the only
 * thing wrong, and nothing tested a contract — partly because the assembler
 * lives in a `.tsx` file that the test runner cannot load, so the one piece of
 * arithmetic that decides what a customer is charged was the one piece that
 * could not be tested.
 *
 * So it moved here, to a `.ts` module with no JSX and no imports, and
 * `tests/quoteMargins.test.ts` asserts the figures to the penny.
 *
 * THE UNITS, STATED ONCE
 *
 * Everything on `MarginInput` is a FRACTION: 0.10 means ten per cent. The
 * company's settings hold percentages and `repriceEstimate` converts them at
 * its boundary. Nothing in this file divides by a hundred.
 */

export interface MarginInput {
  /** Materials we are supplying, after markup. */
  materialsSubtotal: number;
  laborSubtotal: number;
  additionalCostsSubtotal: number;
  /** Customer-supplied material, which comes off the materials figure. */
  creditsSubtotal: number;
  /** Fractions. Absent falls back to the default; zero is honoured as zero. */
  overheadPercent?: unknown;
  profitPercent?: unknown;
  contingencyPercent?: unknown;
  taxRatePercent?: unknown;
}

export interface MarginResult {
  directCost: number;
  overheadPercent: number;
  overheadAmount: number;
  profitPercent: number;
  profitAmount: number;
  contingencyPercent: number;
  contingencyAmount: number;
  preTaxTotal: number;
  taxRate: number;
  taxableMaterials: number;
  taxAmount: number;
  totalCost: number;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * A fraction, where "not given" and "given as zero" are different answers.
 *
 * `Number(value) || fallback` was the original, and zero is falsy — so a
 * company that had set no labour markup, or the real case of NO SALES TAX
 * which is correct for New Hampshire, had that decision silently replaced by
 * the default. The tax line defaulted to 8% on every repriced quote in a state
 * that has none.
 *
 * The ceiling stays. It guards against a model returning something absurd, and
 * it is also what made the percent/fraction mix-up invisible for so long: 10
 * and 15 both clamped quietly to 0.4, so two very different wrong numbers
 * landed on the same plausible-looking value.
 */
export function pickFraction(value: unknown, fallback: number, ceiling: number): number {
  /**
   * Nothing at all is NOT zero.
   *
   * `Number('')` is 0, and so is `Number(null)` and `Number([])`. Reading the
   * value straight through `Number()` therefore turned an empty field into a
   * deliberate nought per cent — silently removing a margin instead of
   * applying the default. That is the same absent-versus-zero confusion this
   * function exists to end, so it has to be settled before the conversion,
   * not after it.
   *
   * Found by a test asserting the opposite of what the code did, which is the
   * argument for writing the assertion before trusting the line.
   */
  if (value === null || value === undefined || value === '') return clamp(fallback, ceiling);

  const n = Number(value);
  const chosen = Number.isFinite(n) ? n : fallback;
  return clamp(chosen, ceiling);
}

/** Zero is the floor; anything absurd stops at the ceiling. */
function clamp(value: number, ceiling: number): number {
  return Math.max(0, Math.min(ceiling, value));
}

/**
 * What sits on top of direct cost, and what the quote finally totals.
 *
 * Tax is on materials only, which matches most US construction contracts, and
 * only on the materials we are actually supplying — a customer's own flooring
 * is not ours to sell and taxing it would charge them tax on their own
 * purchase. Credits come off the materials figure rather than off the bottom
 * of the quote, so overhead, profit and tax are never calculated on material
 * we did not provide.
 */
export function applyMargins(input: MarginInput): MarginResult {
  const materialsSubtotal = round2(Number(input.materialsSubtotal) || 0);
  const laborSubtotal = round2(Number(input.laborSubtotal) || 0);
  const additionalCostsSubtotal = round2(Number(input.additionalCostsSubtotal) || 0);
  const creditsSubtotal = round2(Number(input.creditsSubtotal) || 0);

  const directCost = round2(materialsSubtotal + laborSubtotal + additionalCostsSubtotal);

  const overheadPercent = pickFraction(input.overheadPercent, 0.10, 0.4);
  const profitPercent = pickFraction(input.profitPercent, 0.10, 0.4);
  const contingencyPercent = pickFraction(input.contingencyPercent, 0.05, 0.4);

  const overheadAmount = round2(directCost * overheadPercent);
  const profitAmount = round2(directCost * profitPercent);
  const contingencyAmount = round2(directCost * contingencyPercent);

  const preTaxTotal = round2(directCost + overheadAmount + profitAmount + contingencyAmount);

  const taxRate = pickFraction(input.taxRatePercent, 0.08, 0.15);
  const taxableMaterials = Math.max(0, round2(materialsSubtotal - creditsSubtotal));
  const taxAmount = round2(taxableMaterials * taxRate);

  const totalCost = round2(preTaxTotal + taxAmount - creditsSubtotal);

  return {
    directCost,
    overheadPercent, overheadAmount,
    profitPercent, profitAmount,
    contingencyPercent, contingencyAmount,
    preTaxTotal,
    taxRate, taxableMaterials, taxAmount,
    totalCost,
  };
}
