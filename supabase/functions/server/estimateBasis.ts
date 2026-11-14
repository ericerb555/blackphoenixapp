/**
 * The writing that goes with the number.
 *
 * Eric, 2026-11-14: "but also have something in writing if something is changed
 * or not seen in quote process prrices could change."
 *
 * WHY THIS IS GENERATED AND NOT BOILERPLATE
 *
 * A paragraph saying "prices may vary" protects nobody. It is the sentence
 * every customer has read and none has absorbed, and on the day it sounds like
 * an excuse invented on the spot. What works is specific: *this* estimate
 * assumed *these* things, could not see *that*, and will change by *this much*
 * if *that* turns out differently. A customer who was told "we could not see
 * behind the stack on the left, and anything behind it is $38 a cubic yard"
 * accepts a revision. One who was told prices may vary does not.
 *
 * So every line below comes out of the takeoff that priced the job. There is no
 * template to fill in and nothing to remember to update: change the rate card
 * and the writing changes with it, because they are the same numbers.
 *
 * THE OTHER HALF IS THE CUSTOMER'S
 *
 * `ATTESTATION` is what they confirm when they submit — that the photographs
 * show everything, and that access is as they described. That sentence is what
 * makes a re-price on the day fair rather than a surprise, and it is why it is
 * recorded with their name and the time rather than being a tick nobody kept.
 *
 * WHAT HAPPENS WHEN IT DOES CHANGE
 *
 * Nothing new. The crew photographs the difference, it is priced, and it goes
 * out as a change order on the flow that already exists — hashed expiring
 * token, Decline a first-class button, one decision only. `ChangeOrderApproval`
 * already tells the customer that typing their name is "your written
 * instruction under clause 9". This is the paperwork that makes clause 9 mean
 * something on a job nobody visited first.
 */

import type { TrashTakeoff } from "./trashTakeoff.ts";
import { TONS_PER_CU_YD, type TrashRates } from "./trashRates.ts";

export interface PriceTrigger {
  /** What would have to be different. */
  trigger: string;
  /** What it costs when it is, in words with the figure in them. */
  rate: string;
}

export interface EstimateBasis {
  whatWeSaw: string[];
  whatWeAssumed: string[];
  whatWeCouldNotSee: string[];
  notIncluded: string[];
  whatChangesThisPrice: PriceTrigger[];
  /** The sentence the customer confirms when they send this. */
  attestation: string;
  /** The clause this estimate stands on, in one paragraph. */
  terms: string;
}

/**
 * The sentence the customer agrees to.
 *
 * Short on purpose. A paragraph nobody reads is not consent, and the only two
 * things that actually go wrong are things left out of the pictures and access
 * that turned out to be worse than described.
 */
export const ATTESTATION =
  "The photographs and video I have sent show everything that needs to be taken " +
  "away, and the access is as I have described it. I understand this is an " +
  "estimate made from pictures, not a visit, and that if what you find is " +
  "different you will show me the difference and what it costs before any extra " +
  "work is done.";

/**
 * Clause 11, in the words that go on the document.
 *
 * Clauses 9 and 10 — concealed conditions, and material prices — already exist
 * on the approval page. This is the one they do not cover: a price produced
 * from photographs by something that was never in the room.
 */
export const PHOTO_ESTIMATE_TERMS =
  "ESTIMATES MADE FROM PHOTOGRAPHS AND VIDEO. This estimate was prepared from " +
  "the pictures you sent and has not been checked on site. It prices what those " +
  "pictures show, on the access you described. Where we find more than the " +
  "pictures showed, something we are not able to carry, or access that is harder " +
  "than described, we will photograph it, price it at the rates set out below, " +
  "and send it to you for approval before we carry on. You can decline. Nothing " +
  "extra is charged without that approval, and nothing here changes the price of " +
  "what the pictures did show.";

const money = (n: number): string => `$${Math.round(n)}`;

/**
 * The written basis for one estimate.
 *
 * Pure: the same takeoff and rates always produce the same words, which is what
 * lets `tests/estimateBasis.test.ts` hold it to its promises.
 */
export function estimateBasis(takeoff: TrashTakeoff, rates: TrashRates): EstimateBasis {
  const whatWeSaw: string[] = [];
  const whatWeAssumed: string[] = [];
  const whatWeCouldNotSee: string[] = [];
  const notIncluded: string[] = [];
  const whatChangesThisPrice: PriceTrigger[] = [];

  /* ── what we saw ───────────────────────────────────────────────────────── */

  if (takeoff.volumeCuYd.likely > 0) {
    whatWeSaw.push(
      `About ${takeoff.volumeCuYd.likely} cubic yards in total — ${takeoff.loads} ` +
      `truck${takeoff.loads === 1 ? "" : "s"} at ${rates.truckCuYd} cubic yards each.`,
    );
  }
  for (const line of takeoff.lines) {
    if (line.kind === "surcharge") {
      whatWeSaw.push(`${line.quantity} × ${line.label} — charged separately at ${money(line.unitCost)} each.`);
    }
  }
  if (takeoff.conditions.reasons.length) {
    whatWeSaw.push(`Access we allowed for: ${takeoff.conditions.reasons.join(", ")}.`);
  } else if (takeoff.volumeCuYd.likely > 0) {
    whatWeSaw.push("Ground floor, short carry to where the truck can park, nothing in the way.");
    whatWeAssumed.push(
      "We have priced this as a ground-floor job with a short carry, because nothing " +
      "in the pictures said otherwise. Stairs or a long carry would change it.",
    );
  }

  /* ── what we assumed ───────────────────────────────────────────────────── */

  whatWeAssumed.push(
    "Weights are worked out from volume — a cubic yard of household waste is taken " +
    `at ${TONS_PER_CU_YD["mixed-household"]} tons, construction debris heavier. ` +
    "The transfer station weighs the real load, and that is what we pay on.",
  );
  if (takeoff.lines.some((l) => l.kind === "demolition" && l.assumed)) {
    whatWeAssumed.push(
      "The amount of debris a strip-out produces is a rule of thumb — one cubic yard " +
      "for every thirty square feet. Layers of old flooring nobody can see from a " +
      "photograph are the usual reason it comes out higher.",
    );
  }
  whatWeAssumed.push("Somebody can let us in, and we can park within a reasonable distance of the door.");

  /* ── what we could not see ─────────────────────────────────────────────── */

  if (takeoff.unseenCuYd > 0) {
    whatWeCouldNotSee.push(
      `About ${takeoff.unseenCuYd} cubic yards of this could not be seen in the pictures. ` +
      "It is counted at the top of the range and half-counted in the middle — never left out.",
    );
  }
  for (const reason of takeoff.siteVisitReasons) whatWeCouldNotSee.push(reason);
  if (!takeoff.unseenCuYd && !takeoff.siteVisitReasons.length) {
    whatWeCouldNotSee.push(
      "Nothing obvious was hidden in the pictures you sent — but a photograph only " +
      "shows the front of a pile, and that is the usual reason a price moves.",
    );
  }

  /* ── what is not included ──────────────────────────────────────────────── */

  /*
   * What they told us to leave, first and in their own terms.
   *
   * Above the hazards, because this is the half of "not included" the customer
   * themselves decided, and it is the half that gets argued about: a crew that
   * arrives and takes the bed after being told not to, or leaves it and is
   * asked why the price did not drop. Printing their own words back is how
   * both of those stop happening.
   */
  for (const item of takeoff.excluded || []) {
    notIncluded.push(
      `${item.count > 1 ? `${item.count} × ` : ""}${item.name} — left at your request (${item.reason}).`,
    );
  }

  for (const item of takeoff.refused) {
    notIncluded.push(`${item.label} — ${item.why}`);
  }
  if (takeoff.lines.some((l) => l.kind === "demolition")) {
    notIncluded.push("Permits, engineering sign-off, temporary support, and making good after demolition.");
    notIncluded.push("Isolating or disconnecting any live services in the area.");
  }
  notIncluded.push("Anything not visible in the pictures you sent.");

  /* ── what changes this price ───────────────────────────────────────────── */

  const perCuYd = Math.round(
    (rates.laborPerHour / rates.cuYdPerCrewHour) +
    (TONS_PER_CU_YD["mixed-household"] * (rates.disposalPerTon["mixed-household"] || 0)),
  );

  whatChangesThisPrice.push({
    trigger: "More than the pictures showed, once we are there",
    rate: `${money(perCuYd)} per extra cubic yard, plus ${money(rates.perTrip)} if it needs another trip.`,
  });
  whatChangesThisPrice.push({
    trigger: "Stairs or a carry further than we allowed for",
    rate: "15% more labour per flight of stairs, 10% for each extra 50 feet to the truck.",
  });
  whatChangesThisPrice.push({
    trigger: "A fridge, freezer, air conditioner, mattress, tyre or television we did not see",
    rate: "Charged at the per-item rates listed above, nothing more.",
  });
  whatChangesThisPrice.push({
    trigger: "Anything we are not allowed to carry — gas cylinders, suspected asbestos, paint or solvents",
    rate: "Taken out of the job and taken off the price. We will tell you who can take it.",
  });
  whatChangesThisPrice.push({
    trigger: "The space is occupied, or we are working around what stays",
    rate: "20% more labour, because everything is protected, carried and checked rather than cleared.",
  });

  return {
    whatWeSaw,
    whatWeAssumed,
    whatWeCouldNotSee,
    notIncluded,
    whatChangesThisPrice,
    attestation: ATTESTATION,
    terms: PHOTO_ESTIMATE_TERMS,
  };
}
