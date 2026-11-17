/**
 * Turning what a reader saw in photographs into quantities that can be priced.
 *
 * THE RULE THIS WHOLE FILE EXISTS TO ENFORCE: THE MODEL OBSERVES, CODE COMPUTES.
 *
 * `/project-vision/analyze` asks a model for `unitCost`, `hourlyRate` and
 * `estimatedCost` directly, which is why its output cannot be checked against
 * anything. `blueprintTakeoff.ts` does the opposite — the model reports what is
 * on the drawing and typed, tested code turns that into quantities — and this
 * follows it. Nothing here asks what anything costs; a cubic yard arrives, a
 * dollar leaves, and every step between is in this file where a test can reach
 * it.
 *
 * WHAT A PHOTOGRAPH CANNOT DO, STATED UP FRONT
 *
 * It cannot see the back of a pile. That is the largest single error in this
 * trade, and the answer is not to pretend otherwise: the reader is asked what
 * it could not see, that volume is carried through as `unseenCuYd`, and it
 * widens the range upward without ever lowering the bottom of it. What we could
 * not see cannot make a job cheaper.
 *
 * A RANGE, NOT A FIGURE
 *
 * Eric's call, 2026-11-14: the customer gets a range at once and the office
 * confirms it. So every quantity here carries low / likely / high, and the
 * price is computed three times rather than once and padded by a percentage.
 * A flat ±15% dressed up as analysis is a worse lie than a wide honest band.
 *
 * ASSUMPTIONS ARE MARKED, NOT AVOIDED
 *
 * Every line carries `from` — the observation it came from — and `assumed`,
 * the convention `blueprintTakeoff.ts` set, so a wrong number traces to a wrong
 * reading rather than to arithmetic.
 */

import type { PriceSource } from "./repriceEstimate.ts";
import {
  BLENDED_TONS_PER_CU_YD, MATERIAL_CLASSES, TONS_PER_CU_YD,
  type MaterialClass, type TrashRates,
} from "./trashRates.ts";
import { hazardFor, type Surcharge } from "./hazardRules.ts";

/* ── what the reader gives us ─────────────────────────────────────────────── */

export interface ObservedItem {
  /** What it is, in the reader's own words. Classified here, not by the model. */
  name: string;
  count: number;
  materialClass: MaterialClass;
  /** Cubic yards for ONE of them, as a range the reader would defend. */
  volumeLowCuYd: number;
  volumeHighCuYd: number;
  /** Indices into the image array the reader was sent. Evidence, not decoration. */
  seenIn?: number[];
  confidence?: "low" | "medium" | "high";
  /**
   * Whether the customer wants this taken. Absent means yes.
   *
   * The only thing a customer's own words are allowed to decide. They can say
   * "everything but the bed" and the bed stops being priced; they cannot say
   * anything that changes a volume, a rate or a total.
   */
  include?: boolean;
  /** Which of their words left it out, in their terms, for the estimate. */
  excludeReason?: string;
}

export interface Access {
  /** 1 is ground. Only used to sanity-check the stair count. */
  storey?: number;
  stairFlights?: number;
  /** A lift changes stairs from a multiplier into a queue. */
  lift?: boolean;
  /** Feet from where the stuff is to where a truck can legally park. */
  carryDistanceFt?: number;
  doorwayWidthIn?: number;
  /** People still living there, furniture still in use, pets, children. */
  occupied?: boolean;
}

export interface DemoScope {
  description: string;
  areaSqFt?: number;
  /** Whole bathrooms taken to the studs. Priced per room, not per square foot. */
  bathrooms?: number;
  /** Load-bearing, or any part of the building's structure. */
  structural: boolean;
  /** Built before 1978 — asbestos and lead both become live questions. */
  preSeventyEight?: boolean;
  /** Live services in the area to be removed. */
  utilitiesPresent?: boolean;
}

export interface Unseen {
  what: string;
  estimatedVolumeCuYd?: number;
}

export interface Observations {
  items?: ObservedItem[];
  access?: Access;
  demo?: DemoScope[];
  /** Hazards the reader named that were not themselves items. */
  hazards?: string[];
  unseen?: Unseen[];
  /** The reader is allowed to decline. */
  unsure?: boolean;
  why?: string;
}

/* ── what comes out ───────────────────────────────────────────────────────── */

export type LineKind = "labour" | "disposal" | "trip" | "surcharge" | "demolition" | "minimum";

export interface TakeoffLine {
  kind: LineKind;
  label: string;
  quantity: number;
  unit: string;
  unitCost: number;
  cost: number;
  /** Which observation produced this number, in words. */
  from: string;
  /** True where a missing figure was assumed rather than read. */
  assumed: boolean;
  source: PriceSource;
}

export interface Band<T> { low: T; likely: T; high: T }

export interface RefusedItem {
  id: string;
  label: string;
  why: string;
  /** What the reader called it, so the customer recognises their own thing. */
  named: string;
}

/** Something the customer asked us to leave. Not priced, but said out loud. */
export interface ExcludedItem {
  name: string;
  count: number;
  /** Which of their own words left it out. */
  reason: string;
}

export interface TrashTakeoff {
  lines: TakeoffLine[];
  volumeCuYd: Band<number>;
  /** Cubic yards the reader said it could not see. Widens the top only. */
  unseenCuYd: number;
  tons: number;
  loads: number;
  labourHours: number;
  /** The multiplier the access conditions applied, and why. */
  conditions: { factor: number; reasons: string[] };
  cost: Band<number>;
  /** True where a number must not be presented as firm without a visit. */
  needsSiteVisit: boolean;
  siteVisitReasons: string[];
  refused: RefusedItem[];
  /** Things the customer told us to leave. Priced at nothing, listed anyway. */
  excluded: ExcludedItem[];
  notes: string[];
}

/* ── the figures this file decides ────────────────────────────────────────── */

/**
 * Interior demolition, non-structural: crew-hours per square foot.
 *
 * `laborTasks.ts` already carries this as `lab-demo-interior` at 0.035 with a
 * crew of two and an eight-hour minimum, described as "finishes to studs,
 * protection and containment included". Read here as CREW-hours per square
 * foot, which is the reading that makes the eight-hour minimum a half day for
 * two people rather than a full one.
 */
export const DEMO_CREW_HOURS_PER_SQFT = 0.035;
export const DEMO_MINIMUM_CREW_HOURS = 8;

/** `lab-demo-bath` — a typical 5x8 taken to the studs, tile, tub, vanity, floor. */
export const BATHROOM_GUT_CREW_HOURS = 16;

/**
 * Debris a gut produces: one cubic yard per thirty square feet stripped.
 *
 * Finishes only — board, trim, flooring, cabinets, fixtures — not the frame.
 * It is a rule of thumb and it is marked `assumed` on the line it produces,
 * because the real figure depends on how many layers of flooring somebody has
 * put down over forty years, which no photograph shows.
 */
export const DEMO_DEBRIS_CU_YD_PER_SQFT = 1 / 30;

/** A bathroom gut, same basis: roughly 4 cubic yards out of a 5x8. */
export const BATHROOM_GUT_DEBRIS_CU_YD = 4;

/** Structural work is priced as a band this wide, and never without a visit. */
export const STRUCTURAL_HIGH_FACTOR = 1.6;

/** Beyond this, a carry starts costing real time. */
export const FREE_CARRY_FT = 50;

const num = (value: unknown, fallback = 0): number => {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
};

const round2 = (n: number): number => Math.round(n * 100) / 100;

/**
 * What the access does to the labour.
 *
 * Multipliers rather than a softened base rate, so that the reason a job costs
 * more is a line the customer can read and argue with. Each one is stated with
 * its reason because each one is a judgement, not a measurement.
 */
export function conditionMultiplier(access?: Access): { factor: number; reasons: string[] } {
  const reasons: string[] = [];
  let factor = 1;

  const flights = num(access?.stairFlights);
  if (access?.lift && flights > 0) {
    // A lift turns a carry into a queue: slower than a flat floor, far faster
    // than the stairs it replaces.
    factor *= 1.05;
    reasons.push("lift rather than stairs (+5%)");
  } else if (flights > 0) {
    factor *= 1 + 0.15 * flights;
    reasons.push(`${flights} flight${flights === 1 ? "" : "s"} of stairs (+${Math.round(15 * flights)}%)`);
  }

  const carry = num(access?.carryDistanceFt);
  if (carry > FREE_CARRY_FT) {
    const extra = Math.ceil((carry - FREE_CARRY_FT) / 50);
    factor *= 1 + 0.1 * extra;
    reasons.push(`${Math.round(carry)} ft carry to the truck (+${extra * 10}%)`);
  }

  if (access?.occupied) {
    // Working around somebody's life: protection down, doors held, nothing
    // staged in the hallway, and every decision checked before it leaves.
    factor *= 1.2;
    reasons.push("occupied space, work around what stays (+20%)");
  }

  const doorway = num(access?.doorwayWidthIn);
  if (doorway > 0 && doorway < 30) {
    factor *= 1.1;
    reasons.push(`${Math.round(doorway)}in doorway, larger items come apart (+10%)`);
  }

  return { factor: round2(factor), reasons };
}

interface ClassVolume { low: number; likely: number; high: number }

/** Cubic yards by stream, with the refused items already taken out. */
function volumeByClass(items: ObservedItem[]): Record<MaterialClass, ClassVolume> {
  const out = {} as Record<MaterialClass, ClassVolume>;
  for (const cls of MATERIAL_CLASSES) out[cls] = { low: 0, likely: 0, high: 0 };

  for (const item of items) {
    const count = Math.max(1, Math.round(num(item.count, 1)));
    const low = num(item.volumeLowCuYd) * count;
    const high = Math.max(low, num(item.volumeHighCuYd) * count);
    const cls: MaterialClass = MATERIAL_CLASSES.includes(item.materialClass)
      ? item.materialClass
      : "mixed-household";
    out[cls].low += low;
    out[cls].high += high;
    out[cls].likely += (low + high) / 2;
  }
  return out;
}

const totalOf = (byClass: Record<MaterialClass, ClassVolume>, band: keyof ClassVolume): number =>
  MATERIAL_CLASSES.reduce((sum, cls) => sum + byClass[cls][band], 0);

/**
 * The takeoff.
 *
 * Pure: same observations and the same rates give the same number, on a laptop
 * with `node --test` and on the edge function. No clock, no network, no model.
 */
export function trashTakeoff(observations: Observations, rates: TrashRates): TrashTakeoff {
  const notes: string[] = [];
  const refused: RefusedItem[] = [];
  const siteVisitReasons: string[] = [];
  const lines: TakeoffLine[] = [];

  const rawItems = Array.isArray(observations?.items) ? observations.items : [];

  /*
   * Refusals come out of the load before anything is measured.
   *
   * Pricing the labour to carry something we are not going to carry is how a
   * customer ends up paying for a propane tank that stayed in the garage.
   */
  const kept: ObservedItem[] = [];
  const excluded: ExcludedItem[] = [];
  const surchargeHits = new Map<string, { rule: Surcharge; count: number; named: string }>();

  for (const item of rawItems) {
    /*
     * What the customer said to leave comes out first, before anything is
     * measured or any hazard is considered.
     *
     * Eric asked for a box where somebody can say "everything but the bed" or
     * "only the stuff on the right". This is the only effect those words are
     * allowed to have — an item is taken or it is not. They cannot reach a
     * volume, a rate or a total, which is what keeps a free-text box on a
     * pricing screen from being a way to set your own price.
     */
    if (item?.include === false) {
      excluded.push({
        name: String(item?.name ?? "something"),
        count: Math.max(1, Math.round(num(item?.count, 1))),
        reason: String(item?.excludeReason || "you asked us to leave this"),
      });
      continue;
    }

    const rule = hazardFor(item?.name);
    if (rule?.action === "refuse") {
      refused.push({ id: rule.id, label: rule.label, why: rule.why, named: String(item?.name ?? "") });
      if (rule.id === "asbestos") {
        siteVisitReasons.push("suspected asbestos — this has to be tested before anybody prices around it");
      }
      continue;
    }
    if (rule?.action === "surcharge") {
      const count = Math.max(1, Math.round(num(item?.count, 1)));
      const hit = surchargeHits.get(rule.id);
      if (hit) hit.count += count;
      else surchargeHits.set(rule.id, { rule, count, named: String(item?.name ?? "") });
    }
    kept.push(item);
  }

  /*
   * Hazards the reader named without listing them as items.
   *
   * Only counted where no item already produced that rule, so a fridge
   * described once as an item and again in the hazard list is one fridge.
   */
  for (const named of (Array.isArray(observations?.hazards) ? observations.hazards : [])) {
    const rule = hazardFor(named);
    if (!rule) continue;
    if (rule.action === "refuse") {
      if (!refused.some((r) => r.id === rule.id)) {
        refused.push({ id: rule.id, label: rule.label, why: rule.why, named: String(named ?? "") });
        if (rule.id === "asbestos") {
          siteVisitReasons.push("suspected asbestos — this has to be tested before anybody prices around it");
        }
      }
      continue;
    }
    if (!surchargeHits.has(rule.id)) {
      surchargeHits.set(rule.id, { rule, count: 1, named: String(named ?? "") });
    }
  }

  const byClass = volumeByClass(kept);

  /* ── demolition ─────────────────────────────────────────────────────────── */

  const demos = Array.isArray(observations?.demo) ? observations.demo : [];
  let demoCrewHours = 0;
  let demoDebrisCuYd = 0;
  let anyStructural = false;
  let demoAssumed = false;

  for (const demo of demos) {
    const area = num(demo?.areaSqFt);
    const baths = Math.max(0, Math.round(num(demo?.bathrooms)));
    let hours = 0;

    if (area > 0) hours += area * DEMO_CREW_HOURS_PER_SQFT;
    if (baths > 0) hours += baths * BATHROOM_GUT_CREW_HOURS;

    if (area > 0) demoDebrisCuYd += area * DEMO_DEBRIS_CU_YD_PER_SQFT;
    if (baths > 0) demoDebrisCuYd += baths * BATHROOM_GUT_DEBRIS_CU_YD;

    if (hours > 0) {
      hours = Math.max(hours, DEMO_MINIMUM_CREW_HOURS);
      demoAssumed = true; // the debris yield is a rule of thumb, always
      demoCrewHours += hours;
    }

    if (demo?.structural) {
      anyStructural = true;
      siteVisitReasons.push(
        `structural demolition (${String(demo?.description || "unnamed")}) — a photograph cannot tell you what a wall is holding up`,
      );
      notes.push(
        "Structural demolition is not included in this range beyond the labour to do it: " +
        "engineering sign-off, permits, temporary support and making good are priced after a visit.",
      );
    }
    if (demo?.preSeventyEight) {
      siteVisitReasons.push("built before 1978 — asbestos and lead both have to be ruled out before demolition");
    }
    if (demo?.utilitiesPresent) {
      notes.push("Live services in the demolition area have to be isolated by the utility or a licensed trade first. Not included.");
    }
  }

  /* ── volume, including what we could not see ────────────────────────────── */

  const unseenCuYd = round2(
    (Array.isArray(observations?.unseen) ? observations.unseen : [])
      .reduce((sum, u) => sum + num(u?.estimatedVolumeCuYd), 0),
  );

  const itemsLow = totalOf(byClass, "low");
  const itemsLikely = totalOf(byClass, "likely");
  const itemsHigh = totalOf(byClass, "high");

  /*
   * What we could not see cannot make the job cheaper.
   *
   * It is absent from the bottom of the range, half-counted in the middle and
   * fully counted at the top. A customer who reads "we could not see behind the
   * stack on the left" and sees the top of the range move accordingly is being
   * told the truth about their own job.
   */
  const volumeCuYd: Band<number> = {
    low: round2(itemsLow + demoDebrisCuYd),
    likely: round2(itemsLikely + demoDebrisCuYd + unseenCuYd / 2),
    high: round2(itemsHigh + demoDebrisCuYd + unseenCuYd),
  };

  const conditions = conditionMultiplier(observations?.access);

  /* ── what it costs, computed three times ────────────────────────────────── */

  /**
   * What one of these costs — Eric's figure where he has set one.
   *
   * `hazardRules.ts` carries a published trade figure so the estimator works on
   * day one. The moment a real price is set on the rate card it wins, and the
   * line reports `your-rate` instead of `standard`.
   */
  const eachFor = (rule: Surcharge): number => {
    const set = rates.surcharges?.[rule.id];
    return Number.isFinite(set) && (set as number) >= 0 ? (set as number) : rule.each;
  };
  const sourceFor = (rule: Surcharge): PriceSource =>
    rates.surcharges?.[rule.id] === undefined ? rule.source : "your-rate";

  const fixedSurcharges = [...surchargeHits.values()]
    .reduce((sum, hit) => sum + hit.count * eachFor(hit.rule), 0);

  /** Everything that scales with volume, priced at one band. */
  const priceAt = (band: keyof ClassVolume, structuralFactor: number): number => {
    const haulVolume = totalOf(byClass, band);
    const extra = band === "likely" ? unseenCuYd / 2 : band === "high" ? unseenCuYd : 0;
    const volume = haulVolume + extra + demoDebrisCuYd;

    const haulHours = volume > 0 ? (volume / rates.cuYdPerCrewHour) * conditions.factor : 0;
    const labour = (haulHours + demoCrewHours * structuralFactor) * rates.laborPerHour;

    let disposal = 0;
    for (const cls of MATERIAL_CLASSES) {
      const cuYd = byClass[cls][band] + (cls === "mixed-household" ? extra : 0);
      disposal += cuYd * TONS_PER_CU_YD[cls] * (rates.disposalPerTon[cls] ?? 0);
    }
    // Demolition debris is mixed construction waste: the blended density the
    // waste tracking already uses, at the wood/C&D gate rate.
    disposal += demoDebrisCuYd * BLENDED_TONS_PER_CU_YD * (rates.disposalPerTon.wood ?? 0);

    const loads = volume > 0 ? Math.ceil(volume / rates.truckCuYd) : 0;
    const trips = loads * rates.perTrip;

    const total = labour + disposal + trips + fixedSurcharges;
    return Math.max(total, total > 0 ? rates.minimum : 0);
  };

  const cost: Band<number> = {
    low: round2(priceAt("low", 1)),
    likely: round2(priceAt("likely", 1)),
    high: round2(priceAt("high", anyStructural ? STRUCTURAL_HIGH_FACTOR : 1)),
  };

  /* ── the itemisation, at the likely band ───────────────────────────────── */

  const haulHoursLikely = volumeCuYd.likely > 0
    ? (volumeCuYd.likely / rates.cuYdPerCrewHour) * conditions.factor
    : 0;
  const labourHours = round2(haulHoursLikely + demoCrewHours);
  const loads = volumeCuYd.likely > 0 ? Math.ceil(volumeCuYd.likely / rates.truckCuYd) : 0;

  if (demoCrewHours > 0) {
    lines.push({
      kind: "demolition",
      label: anyStructural ? "Demolition labour (structural — confirmed on site)" : "Demolition labour",
      quantity: round2(demoCrewHours),
      unit: "crew hours",
      unitCost: rates.laborPerHour,
      cost: round2(demoCrewHours * rates.laborPerHour),
      from: demos.map((d) => String(d?.description || "demolition")).join("; "),
      assumed: demoAssumed,
      source: rates.source,
    });
  }

  if (haulHoursLikely > 0) {
    lines.push({
      kind: "labour",
      label: conditions.reasons.length
        ? `Load out and haul (${conditions.reasons.join(", ")})`
        : "Load out and haul",
      quantity: round2(haulHoursLikely),
      unit: "crew hours",
      unitCost: rates.laborPerHour,
      cost: round2(haulHoursLikely * rates.laborPerHour),
      from: `${volumeCuYd.likely} cu yd at ${rates.cuYdPerCrewHour} cu yd per crew hour`,
      assumed: unseenCuYd > 0,
      source: rates.source,
    });
  }

  let tons = 0;
  for (const cls of MATERIAL_CLASSES) {
    const cuYd = byClass[cls].likely + (cls === "mixed-household" ? unseenCuYd / 2 : 0);
    if (cuYd <= 0) continue;
    const classTons = cuYd * TONS_PER_CU_YD[cls];
    tons += classTons;
    const perTon = rates.disposalPerTon[cls] ?? 0;
    if (perTon <= 0) continue;
    lines.push({
      kind: "disposal",
      label: `Disposal — ${cls.replace(/-/g, " ")}`,
      quantity: round2(classTons),
      unit: "tons",
      unitCost: perTon,
      cost: round2(classTons * perTon),
      from: `${round2(cuYd)} cu yd at ${TONS_PER_CU_YD[cls]} tons per cu yd`,
      assumed: true, // weight from volume is always an estimate, never a scale reading
      source: rates.source,
    });
  }

  if (demoDebrisCuYd > 0) {
    const demoTons = demoDebrisCuYd * BLENDED_TONS_PER_CU_YD;
    tons += demoTons;
    const perTon = rates.disposalPerTon.wood ?? 0;
    if (perTon > 0) {
      lines.push({
        kind: "disposal",
        label: "Disposal — demolition debris",
        quantity: round2(demoTons),
        unit: "tons",
        unitCost: perTon,
        cost: round2(demoTons * perTon),
        from: `${round2(demoDebrisCuYd)} cu yd of strip-out at ${BLENDED_TONS_PER_CU_YD} tons per cu yd`,
        assumed: true,
        source: rates.source,
      });
    }
  }

  if (loads > 0) {
    lines.push({
      kind: "trip",
      /*
       * "Dump fee", not "tip run".
       *
       * In the trade a tip is the landfill and a tip run is the trip to it. On
       * a price a homeowner reads, "tip" is a gratuity — so this line looked
       * like we had added one to their quote without asking. Eric asked where
       * the tip was coming from; it was this, and it was never a gratuity.
       *
       * Crew tips are a separate thing entirely and are never in a price: they
       * are chosen by the customer at payment and ride as their own Stripe
       * line (`tips.ts`, and the checkout in `index.tsx`).
       */
      label: loads === 1 ? "Truck and dump fee" : `Truck and dump fees (${loads})`,
      quantity: loads,
      unit: "trips",
      unitCost: rates.perTrip,
      cost: round2(loads * rates.perTrip),
      from: `${volumeCuYd.likely} cu yd in a ${rates.truckCuYd} cu yd truck`,
      assumed: false,
      source: rates.source,
    });
  }

  for (const hit of surchargeHits.values()) {
    lines.push({
      kind: "surcharge",
      label: hit.rule.label,
      quantity: hit.count,
      unit: hit.count === 1 ? "item" : "items",
      unitCost: eachFor(hit.rule),
      cost: round2(hit.count * eachFor(hit.rule)),
      from: hit.named || hit.rule.label,
      assumed: false,
      source: sourceFor(hit.rule),
    });
  }

  const itemised = round2(lines.reduce((sum, l) => sum + l.cost, 0));
  if (itemised > 0 && itemised < rates.minimum) {
    lines.push({
      kind: "minimum",
      label: "Minimum charge",
      quantity: 1,
      unit: "job",
      unitCost: round2(rates.minimum - itemised),
      cost: round2(rates.minimum - itemised),
      from: `itemised at ${itemised}, minimum is ${rates.minimum}`,
      assumed: false,
      source: rates.source,
    });
  }

  /* ── when a number must not be presented as firm ────────────────────────── */

  if (unseenCuYd > 0 && volumeCuYd.likely > 0 && unseenCuYd > 0.25 * volumeCuYd.likely) {
    siteVisitReasons.push(
      `about ${unseenCuYd} cu yd of this could not be seen — more than a quarter of the job`,
    );
  }
  if (cost.low > 0 && cost.high / cost.low > 2) {
    // "$400 to $1,900 is not an estimate, it is a shrug."
    siteVisitReasons.push("the range is wider than twice its own bottom — too wide to quote from photographs");
  }
  if (kept.some((i) => i?.confidence === "low")) {
    notes.push("Some items were read with low confidence and are worth checking against the photographs.");
  }
  if (observations?.unsure) {
    siteVisitReasons.push(String(observations?.why || "the reader could not make sense of the photographs"));
  }
  if (unseenCuYd > 0) {
    notes.push(`About ${unseenCuYd} cu yd could not be seen. It is counted at the top of the range and half in the middle, never at the bottom.`);
  }
  if (refused.length) {
    notes.push("Some items cannot go in our truck. They are listed separately and are not priced here.");
  }
  if (excluded.length) {
    notes.push(
      `${excluded.length} thing${excluded.length === 1 ? "" : "s"} you asked us to leave ` +
      `${excluded.length === 1 ? "is" : "are"} not in this price. Check the list — if we have ` +
      "read you wrong, say so before the day rather than after.",
    );
  }

  return {
    lines,
    volumeCuYd,
    unseenCuYd,
    tons: round2(tons),
    loads,
    labourHours,
    conditions,
    cost,
    needsSiteVisit: siteVisitReasons.length > 0,
    siteVisitReasons,
    refused,
    excluded,
    notes,
  };
}
