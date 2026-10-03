/**
 * Property Inspection Report Template — `tmpl-inspection`, $19.
 *
 * WHAT IT IS FOR
 *
 * The document that decides a security deposit argument. A move-in and
 * move-out record of condition, area by area, with somewhere to put the cost
 * of each thing found and both signatures at the end.
 *
 * WHY THE SAME FORM DOES MOVE-IN AND MOVE-OUT
 *
 * Because a deposit deduction is a comparison, not an observation. "The carpet
 * is stained" is worthless on its own; "the carpet was recorded as clean on
 * 1 March with a photograph, and is stained on 28 February" is the whole case.
 * Two separate forms invite two different vocabularies and two different sets
 * of areas, and the comparison then has to be argued rather than read. So this
 * is one form with two columns, filled twice.
 *
 * THE RATING SCALE IS WORDS, NOT STARS
 *
 * A 1-to-5 scale with no definitions produces a landlord's 3 and a tenant's 4
 * for the same wall. Each number here has a sentence attached, and the sentence
 * is about what would be DONE about it — cleaning, repair, replacement — which
 * is the thing the deposit is actually spent on.
 *
 * ON THE LEGAL SIDE, ONE HONEST LINE
 *
 * New Hampshire's deposit rules carry deadlines and itemisation requirements,
 * and they are amended. This template is built to produce the evidence those
 * rules ask for — dated, itemised, signed, photographed — and says once that
 * the current deadlines should be confirmed rather than printing a number that
 * may have moved. It does not repeat that warning on every page.
 */
import {
  buildDocx, DOCX_MIME, title as dTitle, h1 as dH1, h2 as dH2, p as dP,
  fill, note as dNote, table as dTable, spacer, pageBreak,
} from '../lib/docx.mjs';
import { renderBook, PDF_MIME } from '../lib/pdfBook.mjs';

export const meta = {
  id: 'tmpl-inspection',
  title: 'Property Inspection Report Template',
  subtitle: 'Document every unit condition with professional precision',
  price: 1900,
  files: ['pdf', 'docx'],
};

/** The sixteen areas the listing promises, with what to actually look at. */
const AREAS = [
  ['Entry and hallway', ['Door, frame, threshold and weatherstrip', 'Locks, keys handed over, deadbolt operation', 'Walls, trim and ceiling', 'Flooring and transition strips', 'Light fitting and switch', 'Smoke alarm present and sounding']],
  ['Living room', ['Walls, ceiling and trim', 'Flooring or carpet', 'Windows, glazing, locks and screens', 'Blinds or curtains and their fixings', 'Outlets, switches and cover plates', 'Heat source and its controls']],
  ['Kitchen', ['Cabinets, doors, hinges and drawer runners', 'Countertops and backsplash', 'Sink, taps, spray and drain', 'Range, oven and extractor', 'Refrigerator including seals and shelves', 'Dishwasher and its connections', 'Flooring, especially in front of the sink', 'Visible plumbing under the sink']],
  ['Dining area', ['Walls, ceiling and trim', 'Flooring', 'Light fitting', 'Windows and coverings']],
  ['Bedroom 1', ['Walls, ceiling and trim', 'Flooring or carpet', 'Closet, rail, shelf and doors', 'Windows, locks, screens and egress', 'Outlets and switches', 'Smoke alarm']],
  ['Bedroom 2', ['Walls, ceiling and trim', 'Flooring or carpet', 'Closet and doors', 'Windows, locks, screens and egress', 'Outlets and switches']],
  ['Bedroom 3', ['Walls, ceiling and trim', 'Flooring or carpet', 'Closet and doors', 'Windows, locks, screens and egress', 'Outlets and switches']],
  ['Bathroom 1', ['Toilet, seat, flush and base seal', 'Sink, taps and drain', 'Bath or shower, enclosure and grout', 'Tiling and any sign of damp behind it', 'Extractor fan operation', 'Mirror, cabinet and fittings', 'Flooring around the toilet and bath']],
  ['Bathroom 2', ['Toilet, flush and base seal', 'Sink, taps and drain', 'Shower or bath and enclosure', 'Extractor fan', 'Flooring']],
  ['Laundry', ['Washer and dryer, where supplied', 'Hoses, valves and any sign of past leaks', 'Dryer vent and its termination', 'Floor drain or pan', 'Ventilation']],
  ['Heating and hot water', ['Boiler or furnace, and the date of its last service', 'Hot water tank, including the relief valve and its drain', 'Thermostat operation', 'Visible pipework and insulation', 'Fuel level, where the tank is the tenant\'s responsibility', 'Carbon monoxide alarm present and sounding']],
  ['Electrical and safety', ['Panel, labelling and any obvious amateur work', 'Every smoke alarm, by test button', 'Every carbon monoxide alarm', 'Fire extinguisher, where provided, and its gauge', 'Outlets tested, GFCI where required near water', 'Egress from every sleeping room']],
  ['Basement or crawlspace', ['Signs of water ingress, staining or efflorescence', 'Sump pump operation, where fitted', 'Foundation walls and floor', 'Visible framing and sill', 'Smell — damp is detectable before it is visible']],
  ['Attic and roof access', ['Insulation depth and coverage', 'Any daylight or staining on the sheathing', 'Ventilation at soffit and ridge', 'Hatch seal and insulation']],
  ['Exterior and grounds', ['Siding, trim and paint', 'Gutters, downspouts and their discharge', 'Walks, steps, handrails and the drive', 'Grading away from the foundation', 'Decks, porches, railings and stairs', 'Grounds, grass and planting condition', 'Rubbish and recycling storage']],
  ['Keys, meters and handover', ['Every key, fob and remote, counted', 'Meter readings, all services', 'Parking space or garage, where assigned', 'Storage or basement allocation', 'Manuals and warranties handed over']],
];

const AREA_COUNT = AREAS.length;
const LINE_COUNT = AREAS.reduce((n, [, items]) => n + items.length, 0);

/** The scale, defined by what would be done about it rather than by adjective. */
const SCALE = [
  ['5', 'New or as-new', 'Nothing needed. A reasonable incoming tenant would not remark on it.'],
  ['4', 'Good', 'Normal cleaning only. Light wear consistent with its age.'],
  ['3', 'Fair', 'Wear that is visible but functional. Nothing chargeable — this is what "ordinary wear and tear" looks like written down.'],
  ['2', 'Poor', 'Repair needed, and the cause decides who pays. Record the cause, not just the condition.'],
  ['1', 'Unserviceable', 'Replacement needed. Note the age of the item: a carpet at the end of its life is not a tenant charge however it looks.'],
];

function guideChapters() {
  return [
    {
      title: 'How to use this, and why it is one form',
      blocks: [
        { t: 'p', text: `This is the document that decides a deposit argument. ${AREA_COUNT} areas and ${LINE_COUNT} individual lines, filled once when somebody moves in and again when they move out — on the same form, in the same words.` },
        { t: 'h2', text: 'Why move-in and move-out share a form' },
        { t: 'p', text: 'A deposit deduction is a comparison, not an observation. "The carpet is stained" proves nothing by itself. "The carpet was recorded as clean on 1 March, with a photograph, and is stained on 28 February" is the entire case, and it takes thirty seconds to read.' },
        { t: 'p', text: 'Two separate forms invite two different vocabularies and two different lists of areas, and the comparison then has to be argued rather than simply read across. So there are two condition columns on one sheet.' },
        { t: 'h2', text: 'Fill it in with the tenant present' },
        { t: 'p', text: 'Not because it is required, but because an argument at move-out is almost always an argument about what the place was like at move-in — and that argument is unwinnable a year later against somebody who was not there when the form was filled. A tenant who walked the unit and signed each page has very little left to dispute.' },
        { t: 'p', text: 'If they cannot attend, send them the completed form and a reasonable window to add their own notes in writing. A form they had the chance to correct is nearly as strong as one they signed.' },
        { t: 'callout', heading: 'Photographs are the actual evidence', body: 'The form records what you concluded; the photographs record what was there. Take them on the same day, with the date in the file, and reference the numbers in the photo column. One wide shot per area and a close-up of anything rated 2 or below is enough. Photographs with no dated form are hard to place in time, and a form with no photographs is one person\'s word.' },
        { t: 'h2', text: 'The scale, and the word that matters' },
        { t: 'p', text: 'A 1-to-5 scale with no definitions produces a landlord\'s 3 and a tenant\'s 4 for the same wall. Each number below is defined by what would be DONE about it, because that is what the deposit is actually spent on.' },
        { t: 'table', head: ['Rating', 'Means', 'What it implies'], rows: SCALE, widths: [0.1, 0.2, 0.7] },
        { t: 'callout', heading: 'Rating 3 is the one that saves money', body: 'Fair — visible wear, nothing chargeable. Most deposit disputes are an attempt to charge for a 3. Writing down at move-in that something is already a 3 removes the argument before it starts, and costs nothing to do.' },
      ],
    },
    {
      title: 'Charging for damage without losing the argument',
      blocks: [
        { t: 'p', text: 'The deposit exists to cover damage beyond ordinary wear and tear, cleaning beyond ordinary, and unpaid rent. Everything contentious is in the word "ordinary", so this chapter is about making that word unnecessary.' },
        { t: 'h2', text: 'Three tests before anything is charged' },
        { t: 'numbers', items: [
          'Was the condition recorded as better at move-in? If the form does not say so, the charge is a claim rather than a comparison. This is the test most deductions fail.',
          'Is the item still inside its useful life? A carpet rated for ten years and replaced at year eleven is a landlord cost no matter what state it is in. Prorate where the item was part-worn: if a $1,000 floor was six years into a ten-year life, the most that is arguably chargeable is the four years remaining.',
          'Is the cost evidenced? An invoice, or a written quote. A figure somebody estimated is the easiest thing in the file to challenge.',
        ] },
        { t: 'h2', text: 'What is ordinarily NOT chargeable' },
        { t: 'bullets', items: [
          'Faded paint, and nail holes from hanging pictures in the ordinary way.',
          'Carpet worn in the traffic path, as distinct from burned, torn or stained.',
          'Grout and silicone discolouring in a shower.',
          'Appliances that failed by age rather than misuse.',
          'Loose hinges, worn catches and tired weatherstripping.',
        ] },
        { t: 'h2', text: 'What ordinarily is' },
        { t: 'bullets', items: [
          'Holes larger than a picture hook, and anything needing patching rather than filling.',
          'Burns, tears and staining that cleaning does not lift.',
          'Pet damage of any kind, including odour treatment.',
          'Missing items — keys, blinds, shelves, alarm covers, remotes.',
          'Cleaning beyond ordinary: appliances, grease, rubbish left behind.',
          'A removed or disabled smoke or carbon monoxide alarm, which is the one line worth photographing every single time.',
        ] },
        { t: 'h2', text: 'Itemise, and keep the arithmetic visible' },
        { t: 'p', text: 'The deduction summary in the workbook has a line per item: what it was, what was recorded at move-in, the cost, the evidence, and any proration. An itemised sheet with an invoice attached is settled in one exchange. A single figure with the word "damages" beside it invites a demand for the detail, and then the detail arrives looking assembled after the fact.' },
        { t: 'callout', heading: 'New Hampshire, said once', body: 'New Hampshire sets out how a security deposit must be handled, including when it has to be returned and the requirement to itemise what was withheld, and those provisions are amended from time to time. This template is built to produce exactly the evidence they ask for — dated, itemised, signed and photographed. Confirm the current deadline that applies to you before you rely on a date, because that is the part that moves. The rest of this document does not change when it does.' },
      ],
    },
    {
      title: `The form: ${AREA_COUNT} areas, ${LINE_COUNT} lines`,
      blocks: [
        { t: 'p', text: 'This is the printed reference. The Word file in this package is the same form, editable, with the condition and cost columns ready to fill in — add or delete bedrooms and bathrooms to match the unit.' },
        ...AREAS.flatMap(([area, items]) => [
          { t: 'h2', text: area },
          { t: 'bullets', items },
        ]),
      ],
    },
  ];
}

function workbookContent() {
  const content = [
    dTitle('Property Inspection Report'),
    dP([{ t: 'Move-in and move-out condition record. Fill the same form twice — the comparison is what makes it evidence.', i: true, color: '57534E' }]),
    spacer(),

    dH1('The property and the parties'),
    dTable([
      ['', 'Detail'],
      ['Property address', ''],
      ['Unit', ''],
      ['Landlord or agent', ''],
      ['Tenant name(s)', ''],
      ['Tenancy start date', ''],
      ['Move-in inspection date', ''],
      ['Move-out inspection date', ''],
      ['Present at move-in', ''],
      ['Present at move-out', ''],
    ], [0.36, 0.64]),
    spacer(),

    dH1('The rating scale'),
    dNote('Agree this with the tenant before walking the unit. A scale nobody read is the source of most disputes.'),
    dTable([['Rating', 'Means', 'What it implies'], ...SCALE], [0.1, 0.2, 0.7]),
    pageBreak(),

    dH1('Condition by area'),
    dNote('In = condition at move-in. Out = condition at move-out. Photo = your photograph reference. Cost = only where something is chargeable, and only with evidence.'),
  ];

  for (const [area, items] of AREAS) {
    content.push(dH2(area));
    content.push(dTable(
      [['Item', 'In', 'Out', 'Photo', 'Notes', 'Cost']].concat(
        items.map((item) => [item, '', '', '', '', '']),
      ),
      [0.38, 0.07, 0.07, 0.09, 0.27, 0.12],
    ));
  }

  content.push(
    pageBreak(),
    dH1('Deduction summary'),
    dNote('One line per item charged. An itemised sheet with invoices attached settles in one exchange; a single figure labelled "damages" invites a demand for the detail.'),
    dTable([
      ['Item and area', 'Recorded at move-in', 'Cost', 'Evidence attached', 'Prorated?'],
      ['', '', '', '', ''],
      ['', '', '', '', ''],
      ['', '', '', '', ''],
      ['', '', '', '', ''],
      ['', '', '', '', ''],
      ['', '', '', '', ''],
      ['', '', '', '', ''],
      ['', '', '', '', ''],
    ], [0.3, 0.22, 0.12, 0.22, 0.14]),
    spacer(),
    dTable([
      ['', 'Amount'],
      ['Deposit held', ''],
      ['Total deductions', ''],
      ['Unpaid rent or charges', ''],
      ['Balance returned to tenant', ''],
      ['Date returned', ''],
    ], [0.6, 0.4]),
    spacer(),

    dH1('Photograph log'),
    dNote('Photographs are the evidence; this form is the conclusion. Reference each number in the Photo column above.'),
    dTable([
      ['No.', 'Area', 'What it shows', 'Date taken'],
      ...Array.from({ length: 12 }, (_, i) => [String(i + 1), '', '', '']),
    ], [0.08, 0.22, 0.5, 0.2]),
    pageBreak(),

    dH1('Signatures'),
    dP('By signing, both parties confirm the conditions recorded above are an accurate description of the property on the date of the inspection.'),
    spacer(),
    dH2('At move-in'),
    fill('Landlord or agent', 3.4),
    fill('Date', 2),
    fill('Tenant', 3.4),
    fill('Tenant', 3.4),
    fill('Date', 2),
    spacer(),
    dH2('At move-out'),
    fill('Landlord or agent', 3.4),
    fill('Date', 2),
    fill('Tenant', 3.4),
    fill('Date', 2),
    spacer(),
    dH2('Tenant comments'),
    dNote('Space for the tenant to disagree in their own words. A form they were able to correct is far stronger than one they merely signed — and a tenant who had the chance and declined it has very little left to argue.'),
    ...Array.from({ length: 8 }, () => fill('', 5.5)),
  );

  return content;
}

export async function build() {
  const book = renderBook({
    title: 'Property Inspection Report',
    subtitle: 'Document every unit condition with professional precision',
    blurb: `${AREA_COUNT} areas and ${LINE_COUNT} lines, filled once at move-in and again at move-out — on one form, in the same words, because a deposit deduction is a comparison rather than an observation. With the rating scale defined by what would be done about each condition, and the three tests to apply before charging for anything.`,
    audience: ['Landlords', 'Property Managers'],
    edition: '2026 edition',
    keywords: 'inspection, move-in, move-out, security deposit, condition report',
    chapters: guideChapters(),
  });

  const docx = buildDocx({
    title: 'Property Inspection Report',
    subject: 'Move-in and move-out condition record with deduction summary',
    keywords: 'inspection, condition, security deposit',
    footer: 'Property Inspection Report',
    content: workbookContent(),
  });

  return [
    { name: 'Property Inspection Guide.pdf', mime: PDF_MIME, buffer: book.buffer, pages: book.pages },
    { name: 'Property Inspection Report (fillable).docx', mime: DOCX_MIME, buffer: docx },
  ];
}

export async function selfCheck() {
  const { unzip } = await import('../lib/zip.mjs');
  const files = await build();
  const pdf = files.find((f) => f.name.endsWith('.pdf'));
  const docx = files.find((f) => f.name.endsWith('.docx'));
  const concerns = [];

  let parts = [];
  try {
    parts = unzip(docx.buffer).map((f) => f.name);
  } catch (error) {
    concerns.push(`the Word file is not a readable archive: ${error.message}`);
  }
  if (!parts.includes('word/document.xml')) concerns.push('the Word file has no document part');
  if (pdf.buffer.subarray(0, 4).toString() !== '%PDF') concerns.push('the PDF does not start with %PDF');

  // The listing promises sixteen areas. Say so if that stops being true.
  if (AREA_COUNT !== 16) concerns.push(`the listing promises a 16-area checklist and this has ${AREA_COUNT}`);
  // A rating scale with undefined numbers is the thing this product exists to fix.
  const undefinedRatings = SCALE.filter(([, , implies]) => !implies || implies.length < 30);
  if (undefinedRatings.length) concerns.push(`${undefinedRatings.length} rating(s) have no real definition`);
  if (pdf.pages < 8) concerns.push(`only ${pdf.pages} pages`);

  return {
    figures: [
      ['areas / lines', `${AREA_COUNT} areas, ${LINE_COUNT} individual items`],
      ['guide', `${pdf.pages} pages, ${Math.round(pdf.buffer.length / 1024)} KB`],
      ['fillable form', `${parts.length} parts, ${Math.round(docx.buffer.length / 1024)} KB`],
    ],
    concerns,
  };
}
