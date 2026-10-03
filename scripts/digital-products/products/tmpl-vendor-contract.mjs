/**
 * Vendor Contract Template Pack — `tmpl-vendor-contract`, $59.
 *
 * WHAT A BUYER IS PAYING FOR
 *
 * Five service agreements, plus the two reference pieces that are arguably
 * worth more than the contracts: how to actually read a certificate of
 * insurance, and what New Hampshire does and does not license.
 *
 * WHY THE INSURANCE CHECKLIST IS THE MOST VALUABLE PAGE
 *
 * Almost every property owner asks a contractor for "proof of insurance",
 * receives a certificate, glances at it, and files it. A certificate can be
 * genuine and still leave the owner completely exposed — expired, wrong
 * coverage type, a policy that excludes the exact work being done, no
 * additional-insured endorsement, or a general liability limit that would not
 * cover one serious injury. Knowing which six boxes to read is the difference
 * between holding a document and holding cover.
 *
 * THE CLAUSES ARE CHOSEN, NOT COLLECTED
 *
 * A contract full of clauses nobody will enforce is worse than a short one,
 * because it teaches both parties that the paperwork is decoration. Each
 * template here carries the clauses that actually get used when something goes
 * wrong on a property job: scope and exclusions, what happens on a no-show,
 * who holds the risk for damage, how it ends, and who pays if somebody is hurt.
 *
 * ON THE LEGAL SIDE
 *
 * These are templates, written to be fair and to cover the things that recur.
 * No claim is made that they have been reviewed by an attorney, because they
 * have not been. The guide says so once, in plain words, where somebody
 * deciding whether to use them for a large contract can read it.
 */
import {
  buildDocx, DOCX_MIME, title as dTitle, h1 as dH1, h2 as dH2, h3 as dH3,
  p as dP, numbered, bullet, fill, note as dNote, table as dTable, spacer, pageBreak,
} from '../lib/docx.mjs';
import { renderBook, PDF_MIME } from '../lib/pdfBook.mjs';

export const meta = {
  id: 'tmpl-vendor-contract',
  title: 'Vendor Contract Template Pack',
  subtitle: 'Professional contracts for every property service',
  price: 5900,
  files: ['pdf', 'docx'],
};

/**
 * What a certificate of insurance has to say before it is worth anything.
 *
 * [what to check, where it is, what wrong looks like]
 */
const COI_CHECKS = [
  ['The policy is in force today', 'Policy period dates, right-hand columns', 'An expiry inside the contract term. A certificate is a snapshot of the day it was issued, not a promise about next month — which is why the contracts here require a fresh one at renewal.'],
  ['General liability, and the limit', '"Commercial General Liability" row', 'A limit of $300,000 or less. One serious injury on your property exhausts that and the balance comes looking for you. $1,000,000 per occurrence and $2,000,000 aggregate is the normal ask for property work.'],
  ['Workers\' compensation', '"Workers Compensation" row', 'Blank, or "excluded officers". If an uninsured worker is hurt on your property, the claim can land on you. A sole trader with a genuine exemption should say so in writing and accept the indemnity clause.'],
  ['Automobile liability', '"Automobile Liability" row', 'Missing on any vendor who drives to the site. A plough truck sliding into a parked car is an auto claim, not a general liability one.'],
  ['You are an additional insured', 'The "Description of Operations" box, and the certificate holder', 'Your name only in the holder box. Being the certificate HOLDER means you were sent a copy. Being an ADDITIONAL INSURED means the policy covers you too — and that takes an endorsement, which costs the vendor very little and is the single most valuable thing to insist on.'],
  ['The work being done is actually covered', '"Description of Operations"', 'A description that does not match the job. A landscaping policy may exclude snow ploughing; a handyman policy frequently excludes roofing, electrical and anything structural. Read the description against the scope of your contract.'],
  ['The certificate came from the insurer or broker', 'Who sent the email', 'A PDF forwarded by the vendor. Not an accusation — but the only certificate worth relying on is one that arrived from the agency, and asking for that is routine.'],
  ['A cancellation notice obligation', 'Cancellation box, bottom left', 'Modern certificates usually disclaim this. Put it in the CONTRACT instead: the vendor must tell you within some days if cover lapses, and lapsed cover is a breach.'],
];

/** The five contracts, and the clauses each one genuinely needs. */
const CONTRACTS = [
  {
    key: 'hvac',
    name: 'HVAC Maintenance Agreement',
    for: 'Scheduled servicing of heating and cooling equipment, with or without repair cover.',
    whatGoesWrong: 'The visit happens but the report does not, so nobody knows what was found until the system fails. Or "maintenance" turns out to exclude every part that ever actually breaks.',
    clauses: [
      ['Equipment schedule', 'List every unit by location, make, model and serial. A contract that says "the heating system" is unenforceable on a property with three boilers and covers whichever one the technician felt like visiting.'],
      ['What a visit includes', 'Itemise it: filters, combustion test, flue check, controls, pressures, a written report. "Standard service" means whatever the vendor usually does, which varies by technician.'],
      ['The written report', 'Due within a stated number of days of each visit, listing what was tested, what was found, and what is recommended. This is the clause that turns a service contract into a maintenance record — and the record is what a buyer, a lender or an insurer asks for.'],
      ['Visit schedule and window', 'Months, not "annually". An annual service performed in December is not a pre-season service.'],
      ['What is excluded', 'Say it plainly. Parts, refrigerant, after-hours calls, anything behind a wall. An exclusion discovered on an invoice is an argument; one in the contract is a price.'],
      ['Emergency response time', 'Hours, and whether it differs out of hours and at weekends. This is the clause most often quoted back and least often written down.'],
      ['Parts and labour pricing', 'Either a rate card attached, or a percentage over cost with the invoice attached. "Market rate" is not a price.'],
      ['Term, renewal and notice', 'Including whether it renews automatically. An auto-renewing service contract nobody remembers is a standing charge.'],
    ],
  },
  {
    key: 'snow',
    name: 'Landscaping and Snow Removal Contract',
    for: 'Grounds maintenance through the season, and winter clearing — the two usually come from the same vendor in New Hampshire.',
    whatGoesWrong: 'The trigger. Everybody agrees the drive gets ploughed; nobody wrote down at what depth, by what time, or whether the walks and the stairs are included. Then it snows four inches on a Sunday.',
    clauses: [
      ['The trigger depth', 'In inches, and whether it is cumulative or per event. This is the single most argued term in any snow contract.'],
      ['Clearing deadline', 'A time of day, by when. "Before business hours" and "by 7am" are different contracts.'],
      ['What surfaces are included', 'Drive, walks, steps, landings, fire exits, hydrant access, mailbox approach, dumpster approach. Each one, named. Walks and steps are where people fall and where the contract is usually silent.'],
      ['Ice treatment', 'Whether sanding and salting are included, on what trigger, and whether the material is charged separately.'],
      ['Snow storage', 'Where it may be piled, and where it may NOT — over the leach field, against the building, blocking sight lines, or on a neighbour\'s land.'],
      ['Re-clearing after a plough-in', 'Whose job it is when the town plough fills the apron back in. Usually the vendor\'s, and usually unwritten.'],
      ['Seasonal versus per-event pricing', 'Both have a place. A seasonal price is a known budget and the vendor takes the weather risk; per-event is cheaper in a mild winter and unbudgetable in a bad one. Say which, and state the cap or the rate.'],
      ['Damage to turf, edging and plantings', 'Expected to a degree, and repaired in spring at whose cost. Markers are the cheap prevention and the contract should require them.'],
      ['Growing-season scope', 'Cuts per month, trimming, beds, leaf clearance, and the date the season starts and ends.'],
      ['Insurance, specifically auto', 'A plough truck is a vehicle. See the certificate checklist.'],
    ],
  },
  {
    key: 'cleaning',
    name: 'Cleaning Services Agreement',
    for: 'Common areas, turnovers, or both.',
    whatGoesWrong: 'Scope drift in both directions, and key control. Nobody wrote down who holds a key, how many exist, or what happens when a cleaner leaves that company.',
    clauses: [
      ['Room-by-room scope and frequency', 'A table, not a paragraph. Which rooms, what in each, how often.'],
      ['The turnover standard', 'If the vendor cleans between tenancies, define "ready to let" — appliances inside and out, inside cabinets, windows, floors. This is the standard a new tenant judges on their first day.'],
      ['Supplies and equipment', 'Who provides what. Also who pays for consumables in common areas, which is usually the owner and usually assumed to be the cleaner.'],
      ['Key control', 'How many keys or fobs are issued, to whom by name, returned on what event, and the charge for a lost one. A re-key is the real cost of a casual arrangement.'],
      ['Access hours', 'And notice for occupied units, which may also be a legal requirement.'],
      ['Inspection and remedy', 'How a complaint is raised and how long the vendor has to put it right before it is deducted. Without this, the only remedy is cancelling.'],
      ['Staff screening and substitution', 'Whether a background check is required, and that substitutes are subject to the same terms. People in an empty building matters more than the rate.'],
      ['Damage and breakage', 'Reported within a stated time, which is far better than discovered later.'],
    ],
  },
  {
    key: 'handyman',
    name: 'General Handyman Contract',
    for: 'Small repairs on call, usually at an hourly rate.',
    whatGoesWrong: 'Everything, because this is the arrangement most often made on a handshake. The two expensive failures are work done beyond what was authorised, and licensed work done by somebody not licensed to do it.',
    clauses: [
      ['Hourly rate, minimum charge and travel', 'Including whether travel is billed and from where. A one-hour minimum on a fifteen-minute job is normal and should be known in advance.'],
      ['Authorisation limit', 'A dollar figure above which written approval is required before work proceeds. This single clause prevents the most common dispute in the pack.'],
      ['Scope boundary on licensed trades', 'Electrical, plumbing, gas and anything structural. New Hampshire licenses specific trades — see the licensing chapter — and work outside a licence is a problem for the owner as well as the worker, including with the insurer.'],
      ['Materials and markup', 'At cost with receipts, or at cost plus a stated percentage. Either is fine; unstated is not.'],
      ['Response time for routine and urgent', 'Two different numbers, because they are two different promises. A vendor who will be there within four hours for a burst pipe and within five working days for a sticking door is a vendor you can plan around; one number covering both means neither is real.'],
      ['Who holds the warranty on parts', 'And for how long the labour is warranted. Thirty days on labour is common and worth having in writing.'],
      ['Permits', 'Who pulls them and who pays. Unpermitted work surfaces at resale, which is the worst possible moment.'],
      ['Insurance, and the independent-contractor status', 'Both, explicitly. A handyman with no workers\' compensation who is hurt on your property is a serious exposure.'],
    ],
  },
  {
    key: 'management',
    name: 'Property Management Agreement',
    for: 'A manager taking day-to-day responsibility for a property or portfolio.',
    whatGoesWrong: 'Money. Specifically: which account rent lands in, when it is remitted, what the manager may spend without asking, and whether the manager earns anything from the contractors they appoint.',
    clauses: [
      ['Fee basis', 'Percentage of collected rent, or flat. On COLLECTED rent, not scheduled — otherwise the manager is paid the same whether or not they collect.'],
      ['Leasing and renewal fees', 'Separate from the management fee, and stated. This is where the real money often is.'],
      ['Spending authority', 'A per-item limit above which the owner must approve, and a separate higher limit for genuine emergencies. Both figures, in writing.'],
      ['Trust account handling', 'Which account, whether it is separate from the manager\'s own funds, and when the statement and remittance arrive each month. A date, not "monthly".'],
      ['Markup on maintenance, and vendor relationships', 'Whether the manager adds anything to contractor invoices, and whether they have an interest in any vendor they appoint. Ask, and write the answer down.'],
      ['Reporting pack', 'What arrives each month and by when: rent roll, income and expenditure, arrears, work orders, and the bank statement.'],
      ['Tenant selection criteria', 'Set by the owner, applied by the manager, and recorded per applicant. This protects both parties on fair-housing grounds and is a clause owners rarely think to ask for.'],
      ['Termination', 'Notice either way, what happens to keys, records, deposits and prepaid rent, and whether any fee survives. Records belong to the owner and the contract should say so.'],
      ['Indemnity, both directions', 'A manager should not carry the owner\'s building risk, and an owner should not carry the manager\'s negligence.'],
    ],
  },
];

const CLAUSE_COUNT = CONTRACTS.reduce((n, c) => n + c.clauses.length, 0);

// ── The PDF guide ───────────────────────────────────────────────────────────

function guideChapters() {
  return [
    {
      title: 'What is here, and how to use it',
      blocks: [
        { t: 'p', text: `Five service agreements with ${CLAUSE_COUNT} clauses between them, a certificate of insurance checklist, and a chapter on what New Hampshire actually licenses. The Word file contains the contracts themselves, ready to fill in and edit.` },
        { t: 'h2', text: 'The clauses are chosen, not collected' },
        { t: 'p', text: 'A contract full of terms nobody will ever enforce is worse than a short one, because it teaches both parties that the paperwork is decoration. Every clause in this pack is here because it is the thing that gets argued about when a property job goes wrong: what exactly was in scope, what happens on a no-show, who holds the risk for damage, how it ends, and who pays if somebody is hurt.' },
        { t: 'p', text: 'Each contract chapter opens with what usually goes wrong with that kind of vendor. That is the most useful paragraph in each one, and it is why the clause list looks different for a snow contractor than for a property manager.' },
        { t: 'h2', text: 'Read the two reference chapters first' },
        { t: 'p', text: 'The insurance checklist and the licensing chapter apply to every vendor, including ones not covered here. If you only take two things from this pack, take the six boxes to read on a certificate of insurance and the fact that being the certificate HOLDER is not the same as being an ADDITIONAL INSURED.' },
        { t: 'callout', heading: 'These have not been reviewed by an attorney', body: 'Said plainly and once. They are templates written to be fair and to cover the failures that recur on property work, and for routine service arrangements that is usually what is needed. For a large contract, a long term, or anything where a dispute would be expensive, have a New Hampshire attorney read it — and the time they spend is far shorter starting from a draft than from nothing.' },
        { t: 'h2', text: 'How to fill them in' },
        { t: 'p', text: 'Every blank in the Word file is shaded. Work through them in order; anything left shaded is a term nobody has agreed, and a shaded blank in a signed contract is the gap the argument will go through. If a clause does not apply, delete it rather than leaving it empty — an empty clause reads as an oversight, and in a dispute it will be read in whichever way suits the other party.' },
      ],
    },
    {
      title: 'Reading a certificate of insurance',
      blocks: [
        { t: 'p', text: 'Almost every owner asks for proof of insurance, receives a certificate, glances at it, and files it. A certificate can be entirely genuine and still leave you completely exposed. There are eight things to check and they take about two minutes.' },
        { t: 'table', head: ['Check', 'Where to look', 'What wrong looks like'], rows: COI_CHECKS, widths: [0.22, 0.22, 0.56] },
        { t: 'callout', heading: 'The one worth insisting on', body: 'Additional insured status. Being the certificate HOLDER only means a copy was sent to you. Being an ADDITIONAL INSURED means the vendor\'s policy covers you as well, which is what you actually want when somebody is hurt on your property and the claim arrives at your door. It requires an endorsement, it costs the vendor very little, and a vendor who refuses is telling you something useful.' },
        { t: 'h2', text: 'What to do with it once it is right' },
        { t: 'bullets', items: [
          'File it with the contract, not separately. A certificate with no contract beside it is hard to place.',
          'Diary the expiry date. Every contract in this pack requires a fresh certificate at renewal, which only works if somebody is watching the date.',
          'Ask for it again after any change of ownership or name at the vendor. A new entity is a new policy.',
          'Never accept one that is dated after work has already started. The gap is exactly when the accident happens.',
        ] },
      ],
    },
    {
      title: 'What New Hampshire licenses, and what it does not',
      blocks: [
        { t: 'p', text: 'This surprises people moving from other states, and it changes how you verify a vendor.' },
        { t: 'h2', text: 'There is no state general contractor licence' },
        { t: 'p', text: 'New Hampshire does not issue a general contractor licence. Anybody may hold themselves out as a general contractor or a handyman, and "licensed and insured" in an advertisement may mean only the second half. That is not a reason to distrust tradespeople here — it is a reason to verify differently, because the licence check that works in other states does not exist to be done.' },
        { t: 'h2', text: 'Specific trades ARE licensed' },
        { t: 'p', text: 'Electricians, plumbers and gas fitters are licensed by the state, as are several other specialities including asbestos and lead work. For those trades a licence number exists, can be asked for, and can be checked against the state register. Ask for the number rather than a photograph of a card.' },
        { t: 'p', text: 'Towns and cities also impose their own requirements — registration, permits, sometimes local licensing — and those vary considerably. The town building department is the right place to ask, and the call takes a few minutes.' },
        { t: 'h2', text: 'So what to verify instead' },
        { t: 'numbers', items: [
          'The trade licence, where the trade has one. Electrical, plumbing and gas work: ask for the number and check it. Work in these trades done by somebody unlicensed can create a problem with your insurer as well as with the town.',
          'Insurance, properly, using the checklist in the previous chapter. In the absence of general licensing this is the main protection available and it is the one most often inspected carelessly.',
          'The business entity. Confirm the name on the contract matches the name on the insurance and the name registered with the state. Three different names for the same vendor is common and makes a claim much harder.',
          'Permits. Ask who is pulling them and confirm with the town that they were. Unpermitted work surfaces at resale, which is the worst possible moment to discover it.',
          'References for the same kind of work. Not "are they good" but "did they do exactly this, on a building like this".',
          'For a large job: lien waivers on payment. New Hampshire allows mechanics\' liens, and a subcontractor who was not paid by your contractor can attach your property.',
        ] },
        { t: 'callout', heading: 'The practical version', body: 'Licence number for electrical, plumbing and gas. Certificate of insurance, read properly, with you as additional insured. Matching entity name on both. A call to the town about permits. Those four cover the great majority of the risk, and none of them takes long.' },
      ],
    },
    {
      title: 'Getting bids you can actually compare',
      blocks: [
        { t: 'p', text: 'A contract is the end of a process. Most of the money is lost earlier, when three bids arrive that cannot be compared because each vendor was answering a slightly different question.' },
        { t: 'h2', text: 'Write the scope before you ask anybody' },
        { t: 'p', text: 'Send every vendor the same written scope and ask them to price that, line by line. It takes half an hour and it changes what comes back: three prices for the same work instead of three descriptions of different work at three prices.' },
        { t: 'p', text: 'Without it the lowest bid almost always wins, and it is almost always lowest because it left something out — which is then discovered as a change order at full rate, after the other vendors have gone away.' },
        { t: 'h2', text: 'Ask for the price broken down' },
        { t: 'bullets', items: [
          'Labour, materials and equipment separately. A single number cannot be challenged or compared.',
          'What is specifically excluded. The exclusions tell you more about a bid than the inclusions.',
          'What the price assumes. "Assumes no rot behind the siding" is the sentence that explains the difference between two bids.',
          'The unit rate for the likely extras — per sheet, per foot, per hour — agreed in advance, so a discovery is priced rather than negotiated under pressure.',
        ] },
        { t: 'h2', text: 'Compare on more than price' },
        { t: 'table', head: ['Ask', 'Why it separates the bids'], rows: [
          ['When can you start, and how long will it take?', 'A cheap bid that starts in nine weeks is not cheap if the roof is open now. Availability is part of the price.'],
          ['Who will actually be on site?', 'The person quoting is often not the person working. Ask whether it is their own crew or a subcontractor, and the contracts here then require your consent to subcontract.'],
          ['What warranty, on labour and on materials?', 'They are two different warranties with two different lengths, and the labour one is the one that matters.'],
          ['How are changes priced?', 'The answer "we\'ll work it out" costs more than any other answer in this table.'],
          ['Two references for this same work, on this kind of building', 'Not "are they good". Did they do exactly this, on a building like this, and would the owner use them again.'],
        ], widths: [0.34, 0.66] },
        { t: 'h2', text: 'The deposit question' },
        { t: 'p', text: 'A deposit is normal for work with materials to order. A large deposit on labour-only work is not, and a vendor who needs most of the money before starting is telling you about their cash position rather than their quality. Tie payments to progress — a schedule of values on anything substantial — and keep a meaningful final payment until the work is complete and inspected.' },
        { t: 'callout', heading: 'Never pay the final instalment on a promise', body: 'The last payment is the only leverage that exists. Once it is gone, a snag list is a favour rather than an obligation, and the vendor has moved to the next job. Hold it until the work is finished, the site is clean, the permits are closed and any warranty paperwork is in your hand.' },
      ],
    },
    {
      title: 'Red flags, and the ones that are not',
      blocks: [
        { t: 'p', text: 'Some warning signs are real and some are folklore that costs good tradespeople work. Both are worth knowing, because being suspicious of the wrong things is how people end up with the wrong vendor.' },
        { t: 'h2', text: 'Genuine red flags' },
        { t: 'bullets', items: [
          'Reluctance to put the scope in writing. Every other problem in this chapter follows from this one.',
          'No certificate of insurance, or one forwarded by the vendor rather than the agency, or one that expires inside the term.',
          'A business name on the contract that differs from the one on the insurance and the one registered with the state.',
          'Pressure to decide today, or a price that is only available this week. Property work does not have flash sales.',
          'Cash only, or a request to pay an individual when the contract names a company.',
          'Unwilling to pull permits, or suggesting the work does not need them when the town says otherwise.',
          'Most of the money up front on labour-only work.',
          'No written warranty, or a warranty with no stated length.',
          'Doing licensed work — electrical, plumbing, gas — without the licence number for it.',
        ] },
        { t: 'h2', text: 'Not actually red flags' },
        { t: 'bullets', items: [
          'A small operation, or one person. Some of the best trades in New Hampshire are one van and a reputation. Check the insurance and the references, not the size.',
          'No website. Plenty of fully booked contractors have never needed one.',
          'Being expensive. The highest bid is sometimes the only one that included everything, and the breakdown will show you which.',
          'Being busy. A vendor with a waiting list is a recommendation. A vendor who can start tomorrow in October is the question worth asking about.',
          'Asking for a deposit on materials. Normal, and reasonable to document.',
        ] },
        { t: 'h2', text: 'When it has already gone wrong' },
        { t: 'numbers', items: [
          'Put it in writing, once, specifically: what was agreed, what was done, what you want remedied, and by when. Email is fine and is a record.',
          'Stop paying. Not out of spite — the contracts here give a remedy period, and payment during it undermines the position you are preserving.',
          'Photograph everything, dated, before anybody touches it.',
          'Give the remedy period honestly. Most disputes are a misunderstanding and most vendors would rather fix it than lose the reference.',
          'If it does not resolve: the contract\'s termination clause, then a written demand, then small claims for a modest sum or an attorney for a large one. Keep the paperwork in one place from the first day — the person with the organised file usually prevails, and that is often the only difference between the two sides.',
        ] },
      ],
    },
    ...CONTRACTS.map((contract) => ({
      title: contract.name,
      blocks: [
        { t: 'p', text: contract.for },
        { t: 'h2', text: 'What usually goes wrong' },
        { t: 'p', text: contract.whatGoesWrong },
        { t: 'h2', text: 'The clauses, and why each one is there' },
        {
          t: 'table',
          head: ['Clause', 'Why it is in the contract'],
          rows: contract.clauses,
          widths: [0.28, 0.72],
        },
      ],
    })),
  ];
}

// ── The Word pack ───────────────────────────────────────────────────────────

function partyBlock() {
  return [
    dH2('The parties'),
    fill('Owner / client', 4),
    fill('Address', 4.4),
    fill('Contact and phone', 4),
    spacer(),
    fill('Vendor / contractor', 4),
    fill('Business entity name, as registered', 4.4),
    fill('Address', 4.4),
    fill('Contact and phone', 4),
    fill('Trade licence number, where applicable', 3.4),
    spacer(),
    fill('Property covered by this agreement', 4.4),
    fill('Agreement date', 2.4),
  ];
}

function insuranceBlock() {
  return [
    dH2('Insurance'),
    dP('The vendor shall maintain, for the whole term of this agreement, at least:'),
    dTable([
      ['Cover', 'Minimum required'],
      ['Commercial general liability', ''],
      ['Workers\' compensation', ''],
      ['Automobile liability', ''],
      ['Other, as applicable', ''],
    ], [0.5, 0.5]),
    dP('The owner shall be named as an additional insured. A certificate evidencing the above shall be provided before any work begins, and again on each renewal. The vendor shall notify the owner in writing within the number of days stated below if any required cover lapses, is cancelled or is materially reduced; a lapse in required cover is a breach of this agreement.'),
    fill('Days to notify of a lapse', 1.2),
    dNote('See the insurance chapter in the guide before accepting a certificate. Being the certificate holder is not the same as being an additional insured.'),
  ];
}

function commonTail() {
  return [
    dH2('Term and termination'),
    fill('Start date', 2.2),
    fill('End date, or term length', 2.2),
    fill('Renews automatically?  Yes / No', 2.6),
    fill('Notice to terminate, in days, either party', 1.6),
    dP('Either party may terminate for material breach on written notice if the breach is not remedied within the remedy period stated below.'),
    fill('Remedy period, in days', 1.6),
    spacer(),

    dH2('Independent contractor'),
    dP('The vendor is an independent contractor and not an employee or agent of the owner. The vendor is responsible for its own taxes, insurance, tools and personnel, and for the supervision of anybody it brings onto the property.'),
    spacer(),

    dH2('Indemnity'),
    dP('Each party shall indemnify the other against claims, damages and reasonable costs arising from its own negligence or breach of this agreement. Neither party indemnifies the other against the other\'s own negligence.'),
    spacer(),

    dH2('Damage to the property'),
    dP('The vendor shall report any damage it causes, or discovers, within the number of days stated below, and shall repair damage it caused to the condition it was in beforehand.'),
    fill('Days to report damage', 1.4),
    spacer(),

    dH2('Subcontracting'),
    dP('The vendor shall not subcontract any part of this work without the owner\'s written consent. Any approved subcontractor is subject to the same insurance and licensing requirements as the vendor.'),
    spacer(),

    dH2('Assignment and entire agreement'),
    dP('Neither party may assign this agreement without the other\'s written consent. This agreement, together with any attached schedules, is the entire agreement between the parties and replaces anything previously discussed or agreed.'),
    spacer(),

    dH2('Governing law'),
    fill('Governed by the laws of the State of', 2.6),
    spacer(),

    dH2('Signatures'),
    fill('Owner / client', 3.4),
    fill('Print name and title', 3.4),
    fill('Date', 2),
    spacer(),
    fill('Vendor / contractor', 3.4),
    fill('Print name and title', 3.4),
    fill('Date', 2),
  ];
}

function contractDoc(contract) {
  const content = [
    dTitle(contract.name),
    dP([{ t: contract.for, i: true, color: '57534E' }]),
    dNote('Every shaded blank is a term somebody has to agree. A shaded blank left empty in a signed contract is the gap the argument goes through.'),
    spacer(),
    ...partyBlock(),
    pageBreak(),
    dH1('Scope of work'),
  ];

  for (const [clause, why] of contract.clauses) {
    content.push(dH3(clause));
    content.push(dNote(why));
    content.push(fill('', 5.4));
    content.push(fill('', 5.4));
  }

  content.push(
    pageBreak(),
    dH1('Price and payment'),
    fill('Price basis — flat / hourly / per event / percentage', 4.2),
    fill('Amount or rate', 2.6),
    fill('What is included in that price', 5),
    fill('What is expressly excluded', 5),
    fill('Invoicing frequency', 2.6),
    fill('Payment due within, in days', 1.8),
    fill('Late charge, if any', 2.2),
    fill('Written approval required above', 2.2),
    dNote('The approval limit is the clause that prevents the most common dispute in this pack: work done beyond what anybody authorised.'),
    spacer(),
    ...insuranceBlock(),
    pageBreak(),
    ...commonTail(),
  );

  return buildDocx({
    title: contract.name,
    subject: `${contract.name} — editable template`,
    keywords: 'vendor contract, property services, New Hampshire',
    footer: contract.name,
    content,
  });
}

function coiChecklistDoc() {
  return buildDocx({
    title: 'Certificate of Insurance Checklist',
    subject: 'What to verify on a vendor certificate of insurance',
    keywords: 'certificate of insurance, additional insured, vendor',
    footer: 'Certificate of Insurance Checklist',
    content: [
      dTitle('Certificate of Insurance Checklist'),
      dP([{ t: 'Two minutes per vendor. Keep the completed sheet with the contract.', i: true, color: '57534E' }]),
      spacer(),
      fill('Vendor', 4),
      fill('Work being done', 4.4),
      fill('Certificate dated', 2.2),
      fill('Checked by / date', 3),
      spacer(),
      dH1('The eight checks'),
      dTable(
        [['☐', 'Check', 'What wrong looks like', 'Notes']].concat(
          COI_CHECKS.map(([check, , wrong]) => ['☐', check, wrong, '']),
        ),
        [0.05, 0.2, 0.52, 0.23],
      ),
      spacer(),
      dH1('Record'),
      dTable([
        ['', 'Detail'],
        ['Insurer', ''],
        ['Broker and contact', ''],
        ['General liability limit, per occurrence', ''],
        ['General liability limit, aggregate', ''],
        ['Workers\' compensation in place?', ''],
        ['Automobile liability limit', ''],
        ['Owner named as additional insured?', ''],
        ['Policy expiry date', ''],
        ['Diary date to request renewal', ''],
      ], [0.46, 0.54]),
      dNote('The expiry diary date is the whole point of filing this. A certificate is a snapshot of the day it was issued, not a promise about next month.'),
    ],
  });
}

export async function build() {
  const book = renderBook({
    title: 'Vendor Contract Template Pack',
    subtitle: 'Professional contracts for every property service',
    blurb: `Five service agreements with ${CLAUSE_COUNT} clauses between them — each one present because it is the term that gets argued about when a property job goes wrong. Plus the two chapters that apply to every vendor you will ever hire: how to actually read a certificate of insurance, and what New Hampshire does and does not license.`,
    audience: ['Property Managers', 'Condo Boards', 'Landlords'],
    edition: '2026 edition',
    keywords: 'vendor contracts, certificate of insurance, contractor licensing, New Hampshire',
    chapters: guideChapters(),
  });

  const files = [
    { name: 'Vendor Contracts — Guide.pdf', mime: PDF_MIME, buffer: book.buffer, pages: book.pages },
    { name: 'Certificate of Insurance Checklist.docx', mime: DOCX_MIME, buffer: coiChecklistDoc() },
  ];

  for (const contract of CONTRACTS) {
    files.push({
      name: `${contract.name}.docx`,
      mime: DOCX_MIME,
      buffer: contractDoc(contract),
    });
  }

  return files;
}

export async function selfCheck() {
  const { unzip } = await import('../lib/zip.mjs');
  const files = await build();
  const pdf = files.find((f) => f.name.endsWith('.pdf'));
  const docs = files.filter((f) => f.name.endsWith('.docx'));
  const concerns = [];

  for (const doc of docs) {
    try {
      const parts = unzip(doc.buffer).map((f) => f.name);
      if (!parts.includes('word/document.xml')) concerns.push(`${doc.name} has no document part`);
    } catch (error) {
      concerns.push(`${doc.name} is not a readable archive: ${error.message}`);
    }
  }
  if (pdf.buffer.subarray(0, 4).toString() !== '%PDF') concerns.push('the PDF does not start with %PDF');

  // The listing promises five contracts.
  if (CONTRACTS.length !== 5) concerns.push(`the listing promises five contracts and this has ${CONTRACTS.length}`);
  if (docs.length !== 6) concerns.push(`expected five contracts plus the checklist, got ${docs.length} Word files`);

  // Every clause must say why it is there, or it is a collected clause rather
  // than a chosen one — which is the thing this product claims not to be.
  const unexplained = CONTRACTS.flatMap((c) => c.clauses.filter(([, why]) => !why || why.length < 40).map(([name]) => `${c.name}: ${name}`));
  if (unexplained.length) concerns.push(`${unexplained.length} clause(s) do not say why they are there`);

  // Each contract needs its "what goes wrong", which is the best paragraph in it.
  const noFailure = CONTRACTS.filter((c) => !c.whatGoesWrong || c.whatGoesWrong.length < 60);
  if (noFailure.length) concerns.push(`${noFailure.length} contract(s) do not say what usually goes wrong`);

  if (COI_CHECKS.length < 6) concerns.push(`only ${COI_CHECKS.length} insurance checks`);
  if (pdf.pages < 14) concerns.push(`only ${pdf.pages} pages for a $59 product`);

  return {
    figures: [
      ['contracts', `${CONTRACTS.length}, ${CLAUSE_COUNT} clauses between them`],
      ['insurance checks', String(COI_CHECKS.length)],
      ['guide', `${pdf.pages} pages, ${Math.round(pdf.buffer.length / 1024)} KB`],
      ['editable files', `${docs.length} (${docs.map((d) => Math.round(d.buffer.length / 1024) + 'KB').join(', ')})`],
    ],
    concerns,
  };
}
