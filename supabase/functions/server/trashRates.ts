/**
 * What a haul costs us, before anybody's photographs are involved.
 *
 * Separated from `trashTakeoff.ts` on purpose: the takeoff is arithmetic that
 * should never change, and these are prices that should change often. A rate
 * that lives inside a formula is a rate nobody edits.
 *
 * EVERY NUMBER HERE IS `standard`, AND THAT IS NOT A FORMALITY
 *
 * On 2026-11-14 I counted the dump tickets in production: **zero**
 * `waste_entry:` records and zero `dump_run:`. So there is no measured
 * dollars-per-ton for this company and nothing to learn one from yet. These are
 * published trade norms for southern New Hampshire, and they are marked
 * `standard` so that every line they price says so on the customer's estimate.
 *
 * `rateLearning.ts` already has the mechanism to replace them — `MIN_JOBS_TO_ADJUST
 * = 5` — and `repriceEstimate.ts` already types the distinction as
 * `catalogue | your-rate | standard | estimated`. When the tickets exist, the
 * measured figure wins and the source changes with it. Until then the estimate
 * tells the truth about where its numbers came from.
 *
 * WEIGHT IS NOT VOLUME, AND THE DIFFERENCE IS MOST OF THE BILL
 *
 * A truck fills up on household junk long before it is heavy, and fills up on
 * concrete long before it is full. One figure for both is how a tip bill
 * surprises somebody. `WasteDisposalTracking.tsx` uses a single blended
 * 0.75 tons per cubic yard for construction debris; that figure is kept below,
 * and the per-class table refines it rather than contradicting it.
 */

import type { PriceSource } from "./repriceEstimate.ts";

/**
 * What the reader is allowed to call a thing.
 *
 * These are disposal streams, not shapes: two items share a class when they go
 * to the same place and are weighed the same way.
 */
export type MaterialClass =
  | "wood"
  | "drywall"
  | "metal"
  | "concrete-masonry"
  | "mattress"
  | "appliance"
  | "electronics"
  | "tyre"
  | "yard-waste"
  | "mixed-household";

export const MATERIAL_CLASSES: MaterialClass[] = [
  "wood", "drywall", "metal", "concrete-masonry", "mattress",
  "appliance", "electronics", "tyre", "yard-waste", "mixed-household",
];

/**
 * The blended figure `WasteDisposalTracking.tsx:97` uses for a cubic yard of
 * construction debris, kept here so the estimate and the dump-run tracking
 * cannot drift apart. Its own comment calls it a field estimate, not an exact
 * weight, and that is the right way to read it.
 */
export const BLENDED_TONS_PER_CU_YD = 0.75;

/**
 * Tons per cubic yard, by stream.
 *
 * Household junk is bulky and light — a full truck of it weighs a fraction of
 * what the same truck of concrete does, and pricing both off one number
 * overcharges every house clear-out to subsidise every patio tear-out.
 */
export const TONS_PER_CU_YD: Record<MaterialClass, number> = {
  "mixed-household": 0.2,   // ~400 lb/cu yd — furniture, boxes, bagged waste
  wood: 0.17,               // ~340 lb/cu yd — dimensional lumber and sheet goods
  drywall: 0.25,            // ~500 lb/cu yd — dense, and its own stream
  metal: 0.15,              // light by volume; scrap value offsets the tip fee
  "concrete-masonry": 1.2,  // ~2,400 lb/cu yd — the one that fills a truck by weight
  "yard-waste": 0.2,
  mattress: 0.04,           // priced per piece; the volume is truck space only
  appliance: 0.12,
  electronics: 0.1,
  tyre: 0.08,
};

export interface TrashRates {
  /** Dollars per ton at the tip, by stream. */
  disposalPerTon: Record<MaterialClass, number>;
  /** The `laboring` trade's hourly rate — `pricingDefaults.ts` has it at 40. */
  laborPerHour: number;
  /** Cubic yards a crew clears in one crew-hour, ground floor, short carry. */
  cuYdPerCrewHour: number;
  /** People on the truck. Hours below are crew-hours, not per-person hours. */
  crewSize: number;
  /** Usable capacity of one truck, in cubic yards. */
  truckCuYd: number;
  /** Fuel, drive time and the queue at the transfer station, per trip. */
  perTrip: number;
  /** Nothing is cheaper than this. `quoteDisposal.ts` already sets it at 125. */
  minimum: number;
  source: PriceSource;
}

/**
 * Southern New Hampshire, late 2026, from published transfer station
 * schedules. Metal is zero because scrap value covers the tip fee — it is not
 * free to handle, and the labour line charges for that.
 */
export const STANDARD_TRASH_RATES: TrashRates = {
  disposalPerTon: {
    "mixed-household": 110,
    wood: 95,
    drywall: 105,
    metal: 0,
    "concrete-masonry": 38,
    "yard-waste": 45,
    mattress: 0,      // per-piece surcharge instead — see hazardRules.ts
    appliance: 0,     // ditto
    electronics: 0,   // ditto
    tyre: 0,          // ditto
  },
  laborPerHour: 40,
  /*
   * Three cubic yards per crew-hour.
   *
   * A two-person crew loading a 15 cubic yard truck off a ground floor with a
   * short carry is a morning's work — about five crew-hours. Stairs, distance
   * and an occupied room are handled as multipliers in the takeoff rather than
   * by softening this figure, so that the reason a job costs more is visible on
   * the estimate instead of baked into a constant.
   */
  cuYdPerCrewHour: 3,
  crewSize: 2,
  truckCuYd: 15,
  perTrip: 85,
  minimum: 125,
  source: "standard",
};

/** The rates to price with, given whatever the company has saved. */
export function resolveTrashRates(saved: any): TrashRates {
  const base = STANDARD_TRASH_RATES;
  if (!saved || typeof saved !== "object") return base;

  const num = (v: unknown, fallback: number): number => {
    const n = Number(v);
    return Number.isFinite(n) && n >= 0 ? n : fallback;
  };

  const perTon: Record<string, number> = { ...base.disposalPerTon };
  const savedTon = saved.disposalPerTon;
  let touched = false;
  if (savedTon && typeof savedTon === "object") {
    for (const cls of MATERIAL_CLASSES) {
      if (savedTon[cls] === undefined || savedTon[cls] === null) continue;
      const v = num(savedTon[cls], NaN);
      if (Number.isFinite(v)) { perTon[cls] = v; touched = true; }
    }
  }

  const rates: TrashRates = {
    disposalPerTon: perTon as Record<MaterialClass, number>,
    laborPerHour: num(saved.laborPerHour, base.laborPerHour),
    cuYdPerCrewHour: num(saved.cuYdPerCrewHour, base.cuYdPerCrewHour) || base.cuYdPerCrewHour,
    crewSize: num(saved.crewSize, base.crewSize) || base.crewSize,
    truckCuYd: num(saved.truckCuYd, base.truckCuYd) || base.truckCuYd,
    perTrip: num(saved.perTrip, base.perTrip),
    minimum: num(saved.minimum, base.minimum),
    source: "standard",
  };

  /*
   * The source changes only if something was actually overridden.
   *
   * A saved record that happens to hold the standard figures is still standing
   * on the standard table, and calling that "your rate" on a customer's
   * estimate would be a claim nobody made.
   */
  const overridden = touched ||
    rates.laborPerHour !== base.laborPerHour ||
    rates.cuYdPerCrewHour !== base.cuYdPerCrewHour ||
    rates.truckCuYd !== base.truckCuYd ||
    rates.perTrip !== base.perTrip ||
    rates.minimum !== base.minimum;

  return { ...rates, source: overridden ? "your-rate" : "standard" };
}
