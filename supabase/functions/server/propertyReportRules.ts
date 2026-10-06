/**
 * propertyReportRules.ts — may we sell this report about this property?
 *
 * D.8 of `tasks/store-autonomy.md`: three reports generated from a property's
 * own records rather than from authored content.
 *
 *   Property Health      $79   condition, from inspections and job history
 *   Revenue Opportunity  $99   rents against units and plans
 *   10-Year Capital Plan $129  remaining life and cost, from age and condition
 *
 * WHY THE GATE IS THE FIRST THING BUILT
 *
 * The plan's own words: *"Each refuses the sale when the property has too little
 * data behind it. A hollow report at $129 is worse than no product."* That is
 * the whole commercial risk of these three products. An ebook is the same for
 * everybody and can be judged before it is listed; a generated report is
 * different for every buyer and nobody sees it before they have paid. Sell one
 * built from two inspection areas and a guessed roof age and you have taken
 * $129 for a document that tells somebody what they already knew — and the
 * refund is the least of it, because `professional-grade-bar` is the standing
 * rule and that product would fail it in public.
 *
 * So the question "is there enough here" is answered before the buy button is
 * offered, from counts, by rules that are pure and tested.
 *
 * WHAT THE PLATFORM ACTUALLY RECORDS, WHICH DECIDED THESE THRESHOLDS
 *
 * Checked against the code on 2026-10-04 rather than assumed:
 *
 *   inspection:{email}:{id}         areas, each with a condition and notes
 *   conditions_report:{email}:{id}  move-in against move-out, with costs
 *   wr:{id}                         work requests — the job history
 *   landlord_portfolio:{email}      properties, each with `units`
 *   landlord_leases:{email}         tenancies, with rent
 *   yearBuilt                       on the property record
 *
 * **There are no per-component ages anywhere** — no roof-installed year, no
 * boiler year. Only `yearBuilt`. That is why the capital plan requires a build
 * year AND a completed inspection: the age gives an expected remaining life per
 * component and the inspection says whether what is actually there agrees with
 * it. A plan built on one of those two alone is a guess wearing a table, and
 * the report has to say which of its figures are estimated from age and which
 * were seen.
 */

export type ReportId = 'property-health' | 'revenue-opportunity' | 'capital-plan';

export interface ReportSpec {
  id: ReportId;
  title: string;
  priceCents: number;
  /** One line a listing can show. */
  blurb: string;
}

export const REPORTS: ReportSpec[] = [
  {
    id: 'property-health',
    title: 'Property Health Report',
    priceCents: 7900,
    blurb: 'Every area we have inspected, what condition it is in, what has been fixed, and what is still open.',
  },
  {
    id: 'revenue-opportunity',
    title: 'Revenue Opportunity Report',
    priceCents: 9900,
    blurb: 'What your units earn now, what comparable units earn, and where the gap is worth closing.',
  },
  {
    id: 'capital-plan',
    title: '10-Year Capital Plan',
    priceCents: 12900,
    blurb: 'When each major component is likely to need replacing and what it will cost, priced from our own labour and materials.',
  },
];

/**
 * The one add-on that unlocks all three reports.
 *
 * Eric's ruling on 2026-10-06, choosing between a one-off sale per report, an
 * add-on, and inclusion in the top rung: *"make it an add on"*.
 *
 * The reasoning that makes it the right shape, worth keeping next to the code:
 * a generated report is only worth buying again once the property's records
 * have changed, so a landlord who inspects annually would buy one every year or
 * two. As a one-off it earns almost nothing per customer and has to be sold
 * again every time; as an add-on it earns continuously and is worth MORE the
 * more properties somebody holds, which is the customer worth keeping.
 *
 * ONE ADD-ON, NOT THREE
 *
 * Selling the three separately would make a landlord choose between reports
 * about their own building, which is a choice with no good answer — and it
 * would triple the catalogue for no extra revenue, because somebody who wants
 * the capital plan wants the health report too.
 *
 * ALL PROPERTIES, NOT ONE
 *
 * This is what settles the question a one-off sale could not: whether buying
 * "Property Health" once unlocks it for a portfolio of forty. Holding the
 * add-on covers every property the account owns, and the gates below still
 * decide, per property, whether there is enough recorded to produce anything.
 */
export const PROPERTY_REPORTS_ADD_ON_ID = 'property-reports';

/** The audiences that hold properties, and so can be offered it. */
export const REPORT_ADD_ON_AUDIENCES = [
  'landlord', 'property_manager', 'condo_association', 'condo_manager', 'investor',
];

export function reportSpec(id: string): ReportSpec | null {
  return REPORTS.find((r) => r.id === id) || null;
}

/**
 * What we have on a property, counted. Nothing here is a judgement yet.
 *
 * Counts rather than records, deliberately: the gate must be decidable without
 * loading everything, and a rule written against counts cannot accidentally
 * start depending on the content of somebody's notes.
 */
export interface PropertyEvidence {
  propertyId: string;
  /** Inspections marked complete. A draft is somebody halfway through a walk. */
  completedInspections: number;
  /** Areas assessed across those completed inspections. */
  assessedAreas: number;
  /** Distinct area names, so twelve looks at one kitchen is not twelve areas. */
  distinctAreas: number;
  /** Open items found across completed inspections. */
  openFindings: number;
  /** Work requests attached to this property, in any state. */
  jobs: number;
  /** Completed work requests — the part that shows what was actually done. */
  completedJobs: number;
  /** Conditions reports, which carry real costed damage. */
  conditionsReports: number;
  /** Units at this property, from our own records. */
  units: number;
  /** Units with a rent figure recorded. */
  unitsWithRent: number;
  /** The year the building went up, if recorded. */
  yearBuilt: number | null;
}

export function emptyEvidence(propertyId: string): PropertyEvidence {
  return {
    propertyId: String(propertyId || ''),
    completedInspections: 0, assessedAreas: 0, distinctAreas: 0, openFindings: 0,
    jobs: 0, completedJobs: 0, conditionsReports: 0,
    units: 0, unitsWithRent: 0, yearBuilt: null,
  };
}

/**
 * The thresholds, each with the sentence a buyer is shown when it is not met.
 *
 * Written as prose a customer reads rather than as field names, because the
 * refusal is the thing most people will see — most properties will not have
 * enough behind them for a while yet, and "we cannot sell you this" is a worse
 * answer than "inspect it once and we can".
 */
export const MIN_DISTINCT_AREAS = 8;
export const MIN_UNITS_WITH_RENT = 1;

export interface Requirement {
  met: boolean;
  /** What is needed, in the second person, when it is not met. */
  need: string;
  /** What exists now, so the gap is visible rather than implied. */
  have: string;
}

export interface Sellability {
  ok: boolean;
  requirements: Requirement[];
  /** The first unmet requirement, which is what a button should say. */
  blocker: string | null;
}

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

function requirementsFor(id: ReportId, e: PropertyEvidence): Requirement[] {
  switch (id) {
    /**
     * Condition cannot be inferred. One completed inspection covering most of
     * the building is the minimum that makes this report say anything the owner
     * does not already know, and a draft does not count — it is somebody
     * halfway through a walk.
     */
    case 'property-health':
      return [
        {
          met: e.completedInspections >= 1,
          need: 'one completed inspection of this property',
          have: e.completedInspections > 0
            ? `${plural(e.completedInspections, 'completed inspection')}`
            : 'no completed inspection yet',
        },
        {
          met: e.distinctAreas >= MIN_DISTINCT_AREAS,
          need: `at least ${MIN_DISTINCT_AREAS} areas assessed, so the report covers the building rather than one room`,
          have: `${plural(e.distinctAreas, 'area')} assessed`,
        },
      ];

    /**
     * A revenue report with no rent in it is a leaflet. Units alone are not
     * enough: the whole product is the gap between what is charged and what
     * comparable units charge, and without the first number there is no gap.
     */
    case 'revenue-opportunity':
      return [
        {
          met: e.units >= 1,
          need: 'at least one unit recorded at this property',
          have: e.units > 0 ? `${plural(e.units, 'unit')} recorded` : 'no units recorded',
        },
        {
          met: e.unitsWithRent >= MIN_UNITS_WITH_RENT,
          need: 'the rent recorded for at least one unit',
          have: e.unitsWithRent > 0
            ? `rent recorded for ${plural(e.unitsWithRent, 'unit')}`
            : 'no rent figures recorded',
        },
      ];

    /**
     * Both halves, and this is the one most likely to be asked for without
     * them. Age gives an expected remaining life per component; the inspection
     * says whether what is actually on the building agrees with it. With age
     * alone the plan is a table of averages that applies to any house of that
     * vintage, which is not worth $129 and is not what was promised.
     */
    case 'capital-plan':
      return [
        {
          met: !!e.yearBuilt,
          need: 'the year the building was built, which is what sets each component’s expected remaining life',
          have: e.yearBuilt ? `built ${e.yearBuilt}` : 'no build year recorded',
        },
        {
          met: e.completedInspections >= 1,
          need: 'one completed inspection, so the plan reflects what is actually there rather than the averages for its age',
          have: e.completedInspections > 0
            ? `${plural(e.completedInspections, 'completed inspection')}`
            : 'no completed inspection yet',
        },
        {
          met: e.distinctAreas >= MIN_DISTINCT_AREAS,
          need: `at least ${MIN_DISTINCT_AREAS} areas assessed`,
          have: `${plural(e.distinctAreas, 'area')} assessed`,
        },
      ];
  }
}

/**
 * May this report be sold for this property?
 *
 * Fails closed on an unknown report id, like everything else here: a report
 * nobody has defined has no thresholds, and no thresholds must never read as
 * "nothing to check".
 */
export function canSell(reportId: string, evidence: PropertyEvidence): Sellability {
  const spec = reportSpec(reportId);
  if (!spec) {
    return {
      ok: false,
      requirements: [],
      blocker: 'that report does not exist',
    };
  }
  const requirements = requirementsFor(spec.id, evidence);
  const unmet = requirements.filter((r) => !r.met);
  return {
    ok: unmet.length === 0,
    requirements,
    blocker: unmet.length ? unmet[0].need : null,
  };
}

/**
 * Which reports this property could buy, and what the others still need.
 *
 * Returned together on purpose. A landlord one inspection away from two
 * products should be told that, which is a reason to inspect rather than a
 * closed door — and it is the difference between a gate that sells and a gate
 * that only refuses.
 */
export function offerFor(evidence: PropertyEvidence): Array<ReportSpec & Sellability> {
  return REPORTS.map((spec) => ({ ...spec, ...canSell(spec.id, evidence) }));
}

/**
 * How confident the capital plan may sound, given what is behind it.
 *
 * It exists because this report is the one that invites over-claiming. Nothing
 * on this platform records when a roof went on, so every remaining life starts
 * as an estimate from the build year, and the inspection is what moves a line
 * from "typical for its age" to "seen". A report that does not distinguish the
 * two is making up precision, which is the exact failure
 * `dont-defer-to-engineers` does NOT license: it asks for the most accurate
 * figure we can produce, not for a confident one.
 */
export function capitalPlanBasis(e: PropertyEvidence): {
  estimatedFromAge: boolean;
  confirmedByInspection: number;
  caveat: string;
} {
  return {
    estimatedFromAge: true,
    confirmedByInspection: e.distinctAreas,
    caveat:
      'Remaining life starts from the building’s age and the typical service life of each component, '
      + `then is adjusted for the ${plural(e.distinctAreas, 'area')} we inspected. `
      + 'Where a component has been replaced since the building went up and we were not told, its real remaining life is longer than this plan shows — '
      + 'tell us the year and the plan changes.',
  };
}
