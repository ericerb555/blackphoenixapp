/**
 * Property Manager Pro Bundle — `bundle-pm-pro`, $199.
 *
 * The most expensive product in the catalogue, and the one with the largest
 * pricing problem: it is listed at $199 against an "original" of $297, while
 * its four components are priced at $34, $59, $39 and $24 — $156 in total. So
 * it costs $43 MORE than buying the parts, and the "SAVE $100" badge is
 * computed from a figure nobody can substantiate.
 *
 * `lib/bundle.mjs` runs that arithmetic on every build and the check
 * deliberately does not pass. See the note there; resolving it is a commercial
 * decision rather than a number to invent.
 *
 * WHY THESE FOUR GO TOGETHER
 *
 * They are the four things a manager is actually paid for, in order: knowing
 * whether a property is worth holding, keeping the fabric from failing,
 * contracting for the work properly, and funding the large items without a
 * crisis. A manager who does those four well is worth their fee and a manager
 * who does not is an expense.
 */
import { buildBundle, checkBundle } from '../lib/bundle.mjs';

export const meta = {
  id: 'bundle-pm-pro',
  title: 'Property Manager Pro Bundle',
  subtitle: 'The complete toolkit for professional property managers',
  price: 19900,
  /** What the listing claims it would cost separately. */
  listedOriginalPrice: 29700,
  files: ['pdf', 'docx', 'xlsx'],
};

const COMPONENTS = [
  {
    id: 'calc-roi',
    why: 'Start here, because it decides whether the rest is worth doing. Underwrites a property properly — itemised operating costs rather than a percentage rule, DSCR, break-even occupancy, IRR over the hold. The figure most spreadsheets omit is break-even occupancy, and it kills more deals than any other.',
  },
  {
    id: 'maint-annual-planner',
    why: 'Then stop the fabric failing. Fifty-three jobs across twelve months, each in the month it belongs in and with what missing that window costs — plus the tracker that totals by month and by category so next year\'s budget comes from this property rather than from a guess.',
  },
  {
    id: 'tmpl-vendor-contract',
    why: 'Then contract for the work properly. Five editable agreements, and the two chapters that apply to every vendor you will ever hire: how to actually read a certificate of insurance, and what New Hampshire does and does not license.',
  },
  {
    id: 'eb-capital-planning',
    why: 'Then fund the large items without a crisis. Reading a reserve study and challenging it, choosing between reserves, a loan and an assessment with the real arithmetic of each, and the ten-year plan that models the funding MIX rather than reserves alone.',
  },
];

/** The chapter specific to this bundle: the first month on a new instruction. */
function extraChapters() {
  return [
    {
      title: 'A first month on a new instruction',
      blocks: [
        { t: 'p', text: 'Taking on a property or a portfolio you have not managed before. This sequence uses all four products and it is designed to find the expensive surprises in the first four weeks rather than in the first year.' },
        { t: 'h2', text: 'Week one: find out what you have taken on' },
        { t: 'bullets', items: [
          'Every lease, every amendment, and the deposit ledger with the money accounted for per tenant.',
          'Twelve months of rent history, so you can see who actually pays rather than what the rent roll claims.',
          'All outstanding repair requests in writing. An unaddressed habitability complaint becomes yours on day one.',
          'Insurance declarations pages — not certificates — and the renewal dates.',
          'Every service contract, with its term and its notice period. Auto-renewing contracts nobody remembers are the commonest hidden cost on a new instruction.',
        ] },
        { t: 'h2', text: 'Week two: underwrite what you are managing' },
        { t: 'p', text: 'Put the property through the ROI calculator using the ACTUAL figures rather than the pro forma you were handed. Two numbers decide how you manage it:' },
        { t: 'bullets', items: [
          'Break-even occupancy. If it is above about 85%, the property has very little tolerance for a vacancy and your priority is tenant retention over rent increases.',
          'Debt service coverage. Under 1.20 and there is no room for a capital surprise, which changes what you recommend to the owner about reserves.',
        ] },
        { t: 'p', text: 'Expect the itemised expenses to come out higher than the figures you were given. Reserves and management are the two lines usually missing, and they are the two that make the difference between a property that works and one that appears to.' },
        { t: 'h2', text: 'Week three: walk it and build the year' },
        { t: 'bullets', items: [
          'Walk every unit and the exterior with the annual planner in hand. Mark what has clearly not been done and when it last was.',
          'Book whatever is in the next two months immediately — heating service and snow contract if it is anything after August, because those are other people\'s calendars and cannot be fixed later with urgency.',
          'Enter the whole year into the tracker with budget figures, then give the owner the annual total. An owner who sees one annual figure in week three is a different owner from one who receives six surprise invoices.',
        ] },
        { t: 'h2', text: 'Week four: contracts and the capital question' },
        { t: 'bullets', items: [
          'Get a certificate of insurance from every vendor currently working there and read all eight checks. This is where you will find at least one problem, and finding it now rather than after an injury is most of the value of the first month.',
          'Put the main vendors onto written agreements at the next renewal point. Name the association or owner as additional insured.',
          'Ask whether a reserve study exists and when it was done. If there is none, that recommendation is the single most valuable thing you can put in your first report.',
          'Build the ten-year plan from whatever is known, even if it is rough. A rough plan shared in month one is worth more than a precise one in year two.',
        ] },
        { t: 'callout', heading: 'The first report is the whole relationship', body: 'An owner who receives, in month one, the real operating figures, the year\'s maintenance plan with its annual cost, one insurance problem you found and fixed, and a clear recommendation about reserves — that owner will keep you for a decade. The alternative first report, which says the rent was collected, is indistinguishable from what they could have done themselves.' },
      ],
    },
  ];
}

export async function build() {
  const { files } = await buildBundle({
    meta,
    components: COMPONENTS,
    blurb: 'The four things a manager is actually paid for, in order: knowing whether a property is worth holding, keeping the fabric from failing, contracting for the work properly, and funding the large items without a crisis. With a first month on a new instruction that finds the expensive surprises in four weeks rather than in a year.',
    audience: ['Property Managers', 'Commercial Owners'],
    extraChapters,
    startHereName: 'START HERE — Property Manager Pro.pdf',
  });
  return files;
}

export async function selfCheck() {
  const { files, components } = await buildBundle({
    meta,
    components: COMPONENTS,
    blurb: '',
    audience: [],
    extraChapters,
    startHereName: 'START HERE — Property Manager Pro.pdf',
  });
  // The listing promises five contracts plus the planner and capital
  // spreadsheets, so the file mix is part of the promise.
  return checkBundle({ meta, files, components, expect: { pdf: 4, docx: 6, xlsx: 3 } });
}
