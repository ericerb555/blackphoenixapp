/**
 * What we charge extra to take, and what we will not take at all.
 *
 * Eric's call, 2026-11-14, asked as a question with three answers:
 *
 *   "Freon appliances, tires, paint and solvents, e-waste, propane tanks,
 *    suspected asbestos, biohazard. What should the agent do when it sees one?"
 *   → "Surcharge the common ones, refuse the dangerous ones."
 *
 * So this file is two lists and nothing else. It is deliberately separate from
 * the takeoff: what a hauler may legally carry is a licensing and disposal
 * question, not an arithmetic one, and it changes on its own schedule.
 *
 * A REFUSAL IS NOT AN ERROR
 *
 * Seeing a propane cylinder does not fail the estimate. It removes that item,
 * names it, says why in a sentence a homeowner can act on, and the rest of the
 * load is still priced. A customer told "we cannot take the propane tank, the
 * exchange cage at any hardware store will" has been helped. One told "we could
 * not price your job" has not.
 *
 * THE MONEY HERE IS NOT YET BLACK PHOENIX'S MONEY
 *
 * Every surcharge below is marked `standard` and every figure is a published
 * trade norm, not a number off one of Eric's tip receipts — there are none yet:
 * I counted zero `waste_entry:` records in production on 2026-11-14. The
 * convention `pricingDefaults.ts` sets is the one followed here, and its reason
 * is worth repeating: a published standard figure is defensible, but it is not
 * *this company's* number, and a quote that cannot tell the difference is the
 * same dishonesty in a smarter suit.
 *
 * Replace these with real receipts and change `source` to `your-rate`. Nothing
 * else has to change.
 */

import type { PriceSource } from "./repriceEstimate.ts";

export interface Surcharge {
  action: "surcharge";
  id: string;
  /** What the line says on the customer's estimate. */
  label: string;
  /** Dollars, per item. */
  each: number;
  /** Why it costs extra, in one sentence, for the estimate's basis. */
  why: string;
  source: PriceSource;
}

export interface Refusal {
  action: "refuse";
  id: string;
  label: string;
  /** Why we will not take it, and what the customer can do instead. */
  why: string;
}

export type HazardRule = Surcharge | Refusal;

/**
 * Taken, at a price.
 *
 * Each of these costs something real at the far end — a certified recovery fee,
 * a per-unit tip charge, a separate stream the transfer station weighs on its
 * own — which is why they are their own lines and are never folded into the
 * volume. A mattress is not expensive because it is big.
 */
export const SURCHARGES: Surcharge[] = [
  {
    action: "surcharge",
    id: "freon-appliance",
    label: "Refrigerant appliance (fridge, freezer, AC, dehumidifier)",
    each: 45,
    why:
      "The refrigerant has to be recovered by a certified technician before the " +
      "unit can be scrapped, and the transfer station charges per unit for it.",
    source: "standard",
  },
  {
    action: "surcharge",
    id: "mattress",
    label: "Mattress or box spring",
    each: 35,
    why:
      "Mattresses are banned from the landfill here and go to a separate " +
      "recycler that charges per piece.",
    source: "standard",
  },
  {
    action: "surcharge",
    id: "tyre",
    label: "Tyre",
    each: 15,
    why: "Tyres are a separate stream with a per-tyre fee, more on a rim.",
    source: "standard",
  },
  {
    action: "surcharge",
    id: "e-waste",
    label: "Television, monitor or other e-waste",
    each: 30,
    why:
      "Screens carry leaded glass and go to a certified electronics recycler, " +
      "which charges per unit rather than by weight.",
    source: "standard",
  },
];

/**
 * Not taken, at any price.
 *
 * The test for this list is not "is it unpleasant" but "would carrying it in
 * our truck be unlawful, uninsured, or a danger to the crew". Each entry says
 * what the customer should do instead, because the point of telling somebody no
 * is to leave them able to solve it.
 */
export const REFUSALS: Refusal[] = [
  {
    action: "refuse",
    id: "pressurised",
    label: "Propane, acetylene or other pressurised cylinder",
    why:
      "A sealed cylinder in a truck or a compactor is an explosion risk, so no " +
      "licensed hauler will take one. Propane tanks swap at the exchange cage " +
      "at most hardware stores; other cylinders go back to the gas supplier.",
  },
  {
    action: "refuse",
    id: "asbestos",
    label: "Suspected asbestos or vermiculite insulation",
    why:
      "Asbestos removal is licensed work and it is illegal for us to disturb or " +
      "transport it. It needs a licensed abatement contractor to test and remove " +
      "it first — we can price the rest of the job around it.",
  },
  {
    action: "refuse",
    id: "liquids",
    label: "Paint, solvents, fuel or oil in bulk",
    why:
      "Liquid chemicals are household hazardous waste and the transfer station " +
      "will turn the whole load away if they are in it. Your town's hazardous " +
      "waste day takes them free. Fully dried-out latex paint is fine — tell us " +
      "and we will take it.",
  },
  {
    action: "refuse",
    id: "biohazard",
    label: "Sharps, medical or biological waste",
    why:
      "Needles and biological waste need a licensed medical waste carrier. If " +
      "this is a property clear-out where that is the problem, call us — it is " +
      "a different service and we can point you at it.",
  },
];

/** Words that name each rule, lowercased. Refusals are tested first. */
const WORDS: Record<string, string[]> = {
  // Refusals
  pressurised: ["propane", "acetylene", "gas cylinder", "gas bottle", "pressurised cylinder", "pressurized cylinder", "compressed gas", "helium tank", "oxygen tank"],
  asbestos: ["asbestos", "vermiculite", "popcorn ceiling", "transite", "pipe lagging"],
  liquids: ["solvent", "thinner", "petrol", "gasoline", "diesel", "motor oil", "kerosene", "pesticide", "herbicide", "antifreeze", "paint can", "paint tin", "paint"],
  biohazard: ["sharps", "needle", "syringe", "medical waste", "biohazard", "biological waste"],
  // Surcharges
  "freon-appliance": ["fridge", "refrigerator", "freezer", "air conditioner", "air-conditioner", "ac unit", "a/c unit", "dehumidifier", "heat pump", "mini split", "mini-split", "water cooler"],
  mattress: ["mattress", "box spring", "boxspring", "futon"],
  tyre: ["tyre", "tire"],
  "e-waste": ["television", "tv", "monitor", "crt", "e-waste", "ewaste", "electronic waste", "computer screen"],
};

/**
 * Words that mean this is furniture rather than the hazard it names.
 *
 * "TV stand" is a piece of furniture; "TV" is leaded glass and a $30 recycler
 * fee. Matching on the word alone surcharges the stand, which is the kind of
 * small wrong number that a customer notices and that costs more trust than it
 * earns dollars.
 */
const NOT_WORDS: Record<string, string[]> = {
  "e-waste": ["stand", "cabinet", "console", "table", "mount", "bracket", "unit", "armoire"],
};

/**
 * Whole words only.
 *
 * Substring matching made "entire" a tyre and "painted dresser" a tin of paint.
 * A boundary is the difference between reading a description and grepping it.
 *
 * Plurals are allowed back in explicitly — nobody writes "four old tyre", and a
 * list that only matches the singular silently misses most of what a homeowner
 * actually types.
 */
const boundary = (word: string): RegExp =>
  new RegExp(`(^|[^a-z0-9])${word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(s|es)?($|[^a-z0-9])`, "i");

/*
 * Refusals are matched before surcharges, deliberately.
 *
 * "fridge full of paint cans" has to come out as a refusal, not as a $45
 * surcharge — and the dangerous reading is the one that must win whenever both
 * match, because the cost of being wrong is not symmetrical.
 */
const RULES: HazardRule[] = [...REFUSALS, ...SURCHARGES];

const ruleById = new Map<string, HazardRule>(RULES.map((r) => [r.id, r]));

/**
 * Which rule, if any, a described item falls under.
 *
 * Takes the words a reader used rather than a code, because the model is asked
 * to describe what it sees and must not be asked to classify against a list it
 * could get wrong silently. Classification happens here, in code, where it is
 * tested.
 */
export function hazardFor(description: unknown): HazardRule | null {
  const text = String(description ?? "").toLowerCase().trim();
  if (!text) return null;

  for (const rule of RULES) {
    const words = WORDS[rule.id] || [];
    if (!words.some((w) => boundary(w).test(text))) continue;
    const not = NOT_WORDS[rule.id] || [];
    if (not.some((w) => boundary(w).test(text))) continue;
    return rule;
  }
  return null;
}

/** The rule with this id, for reading one back off a stored estimate. */
export function hazardById(id: unknown): HazardRule | null {
  return ruleById.get(String(id ?? "")) || null;
}

/** True where this description is something we will not carry. */
export function isRefused(description: unknown): boolean {
  return hazardFor(description)?.action === "refuse";
}
