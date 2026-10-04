/**
 * agreedLadders.ts — the ladders Eric approved, as data.
 *
 * WHERE THESE NUMBERS COME FROM
 *
 * `tasks/price-ladders.md`, approved 2026-10-03. The basis is Eric's rule:
 * *"what is the average for new hampshire and add ten percent."* Every figure
 * below is researched market pricing with 10% added, and the market source is
 * recorded against each ladder so the next person to question a price can check
 * it rather than re-derive it. The document carries the citations.
 *
 * Two shapes, because the market has two.
 *
 *   FLAT      one price a month. Customer, vendor, subcontractor, advertiser.
 *   METERED   a monthly floor that includes a number of units, plus a rate for
 *             every unit above it. Landlord, property manager, condo
 *             association, condo manager, investor.
 *
 * The metered shape is not an invention: every platform the research covered —
 * AppFolio, Buildium, DoorLoop, Yardi, PayHOA, ManageCasa — charges a monthly
 * minimum plus a per-unit rate. Matching the market's shape as well as its level
 * is what lets a buyer compare us directly, which is the point of sitting ten
 * percent above rather than somewhere else entirely.
 *
 * WHAT IS DELIBERATELY MISSING
 *
 * `territory_owner` and the content centre. Neither has a usable market
 * comparable — franchise territory fees vary too widely to average honestly,
 * and the content tools were not researched. A figure invented here would look
 * exactly as confident as a researched one, so there is none.
 *
 * HOW IT REACHES THE CATALOGUE
 *
 * `POST /plan-catalog/seed-ladders` in plan-catalog.tsx, admin only, which
 * follows the same three rules as the older importer: everything lands
 * inactive, nothing is overwritten, nothing is guessed. Seeding is not a
 * decision to sell anything — a tier with no Stripe price cannot be bought even
 * if somebody switches it on by mistake.
 */
import type { Audience } from './planTier.ts';

export interface AgreedRung {
  id: 'basic' | 'advanced' | 'professional';
  name: 'Basic' | 'Advanced' | 'Professional';
  /** The monthly floor, in cents. */
  priceCents: number;
  /** Units the floor already covers. Metered ladders only. */
  includedUnits?: number;
  /** Each unit above the included count, in cents. Metered ladders only. */
  perUnitCents?: number;
  /** Carried onto the record so a reader knows what the rung is for. */
  blurb: string;
}

export interface AgreedLadder {
  audience: Audience;
  /** What a unit is for this audience. Display, and a check against mixing axes. */
  unitNoun?: string;
  /** The market figures the prices were derived from, kept for auditability. */
  marketBasis: string;
  rungs: AgreedRung[];
}

/** Dollars to cents, for legibility — every figure below reads as it does in the plan. */
const $ = (dollars: number) => Math.round(dollars * 100);

export const AGREED_LADDERS: AgreedLadder[] = [
  // ─── Flat ──────────────────────────────────────────────────────────────────
  {
    audience: 'customer',
    marketBasis:
      'Residential maintenance agreements: $19-29/mo standard and $25-45/mo premium, '
      + 'tiered $100-200 / $200-350 / $300-500 a year. Average $12.50 / $23 / $35.',
    rungs: [
      { id: 'basic', name: 'Basic', priceCents: $(14), blurb: 'The portal, your property record, and your documents.' },
      { id: 'advanced', name: 'Advanced', priceCents: $(25), blurb: 'Adds the design centre, job history and priority scheduling.' },
      { id: 'professional', name: 'Professional', priceCents: $(39), blurb: 'Everything, with reporting and a named contact.' },
    ],
  },
  {
    audience: 'vendor',
    marketBasis:
      'Seller and storefront platforms at $39 / $105 / $399. Market+10% is $43 / $116 / $439; '
      + 'Basic holds at the $49 already being paid rather than dropping to $43.',
    rungs: [
      { id: 'basic', name: 'Basic', priceCents: $(49), blurb: 'Listed. Your catalogue visible to every portal that buys materials.' },
      { id: 'advanced', name: 'Advanced', priceCents: $(116), blurb: 'Stocked. Inventory sync, promotions and sales analytics.' },
      { id: 'professional', name: 'Professional', priceCents: $(439), blurb: 'Preferred. Multiple locations, API access and priority support.' },
    ],
  },
  {
    audience: 'subcontractor',
    marketBasis:
      'Jobber $39 / $129 / $249 and Housecall Pro $59 / $149 / $299, plus the $40-149 of '
      + 'add-ons most buyers end up needing. Average $49 / $139 / $274.',
    rungs: [
      { id: 'basic', name: 'Basic', priceCents: $(54), blurb: 'Steady work, quoting and invoicing.' },
      { id: 'advanced', name: 'Advanced', priceCents: $(153), blurb: 'Priority dispatch, reviews and a bigger lead allocation.' },
      { id: 'professional', name: 'Professional', priceCents: $(301), blurb: 'Crew seats, GPS, compliance tracking and insurance handling.' },
    ],
  },
  {
    audience: 'advertiser',
    marketBasis:
      'Yelp Enhanced $300-1,000, Yelp Ads $150-1,000, Angi $300-500, local Meta budgets '
      + '$300-2,000 and Google $1,200-8,500. Average $263 / $733 / $2,667.',
    rungs: [
      { id: 'basic', name: 'Basic', priceCents: $(289), blurb: 'Placement in front of the local audience, with targeting.' },
      { id: 'advanced', name: 'Advanced', priceCents: $(806), blurb: 'A/B testing, full reporting and better placements.' },
      { id: 'professional', name: 'Professional', priceCents: $(2933), blurb: 'Homepage placement, video, and a strategist.' },
    ],
  },

  // ─── Metered ───────────────────────────────────────────────────────────────
  {
    audience: 'landlord',
    unitNoun: 'unit',
    marketBasis:
      'Small-landlord software $20-69/mo; averages $25 / $84 / $200 with per-unit rates of '
      + 'about $1.25 / $2.00 / $3.00. NH management fees run 8-11% of monthly rent.',
    rungs: [
      { id: 'basic', name: 'Basic', priceCents: $(28), includedUnits: 4, perUnitCents: $(1.40), blurb: 'Four units included. Leases, rent and documents.' },
      { id: 'advanced', name: 'Advanced', priceCents: $(92), includedUnits: 4, perUnitCents: $(2.20), blurb: 'Adds screening, inspections and the conditions report.' },
      { id: 'professional', name: 'Professional', priceCents: $(220), includedUnits: 4, perUnitCents: $(3.30), blurb: 'Full portfolio management with reporting and export.' },
    ],
  },
  {
    audience: 'property_manager',
    unitNoun: 'door',
    marketBasis:
      'Per-unit $1.00-1.49 entry, $3.20 mid, $5.00 top, with $160-400 monthly minimums; '
      + 'flat plans $62-400. Averages $65 / $181 / $305 and $1.23 / $2.90 / $5.00 a door.',
    rungs: [
      { id: 'basic', name: 'Basic', priceCents: $(72), includedUnits: 24, perUnitCents: $(1.35), blurb: 'Twenty-four doors included. Work orders, tenants and documents.' },
      { id: 'advanced', name: 'Advanced', priceCents: $(199), includedUnits: 24, perUnitCents: $(3.20), blurb: 'Adds screening, inspections, owner statements and reporting.' },
      { id: 'professional', name: 'Professional', priceCents: $(335), includedUnits: 24, perUnitCents: $(5.50), blurb: 'Everything, with API access and a named contact.' },
    ],
  },
  {
    audience: 'condo_association',
    unitNoun: 'unit',
    marketBasis:
      'Flat $45-67.50 entry below 50 units, $100-300 mid-sized; per-unit $1.00-2.50 with '
      + '$280-400 minimums. Averages $53.83 / $93 / $176.',
    rungs: [
      { id: 'basic', name: 'Basic', priceCents: $(59), includedUnits: 24, perUnitCents: $(1.20), blurb: 'Twenty-four units included. Common-area work and board documents.' },
      { id: 'advanced', name: 'Advanced', priceCents: $(102), includedUnits: 24, perUnitCents: $(1.95), blurb: 'Adds meetings, violations, reserves and owner billing.' },
      { id: 'professional', name: 'Professional', priceCents: $(194), includedUnits: 24, perUnitCents: $(2.75), blurb: 'Everything, with reporting and export.' },
    ],
  },
  {
    audience: 'condo_manager',
    unitNoun: 'unit',
    marketBasis:
      'The per-unit platforms’ monthly minimums — $160, $298 and $400, averaging $286 — '
      + 'with per-unit rates of $1.49 / $3.20 / $5.00.',
    rungs: [
      { id: 'basic', name: 'Basic', priceCents: $(315), includedUnits: 100, perUnitCents: $(1.65), blurb: 'A hundred units across your associations, included.' },
      { id: 'advanced', name: 'Advanced', priceCents: $(450), includedUnits: 100, perUnitCents: $(3.50), blurb: 'Adds per-association reporting and owner billing.' },
      { id: 'professional', name: 'Professional', priceCents: $(675), includedUnits: 100, perUnitCents: $(5.50), blurb: 'Everything, with API access and a named contact.' },
    ],
  },
  {
    audience: 'investor',
    unitNoun: 'property',
    marketBasis:
      'Cash Flow Portal, InvestNext and Homebase at $99-100 entry, roughly $200-300 mid, '
      + 'AppFolio Investment Manager $650 and Agora $749 at the top. Averages $99 / $233 / $700.',
    rungs: [
      { id: 'basic', name: 'Basic', priceCents: $(109), includedUnits: 4, perUnitCents: $(12), blurb: 'Four properties included. Deal room and monthly reports.' },
      { id: 'advanced', name: 'Advanced', priceCents: $(256), includedUnits: 4, perUnitCents: $(25), blurb: 'Adds early access, portfolio analytics and tax documents.' },
      { id: 'professional', name: 'Professional', priceCents: $(770), includedUnits: 4, perUnitCents: $(45), blurb: 'Co-investment, advisory and dedicated investor relations.' },
    ],
  },
];

/** Every audience the agreed ladders cover. */
export function agreedAudiences(): Audience[] {
  return AGREED_LADDERS.map((l) => l.audience);
}

export function ladderFor(audience: string): AgreedLadder | null {
  return AGREED_LADDERS.find((l) => l.audience === audience) || null;
}
