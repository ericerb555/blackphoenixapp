/**
 * Condo Board Complete Bundle — `bundle-condo-complete`, $149.
 *
 * WHAT A BUNDLE IS, HERE
 *
 * Not a new product. The component products' own files, delivered together,
 * plus one short "start here" document that says what to read in what order
 * and how the three pieces fit — which is the only thing a bundle can add that
 * buying the parts does not already give you.
 *
 * So this module imports the components and asks them to build. Nothing is
 * duplicated, and a correction to the governance handbook reaches the bundle
 * on the next build rather than needing to be made twice.
 *
 * THE PRICING PROBLEM, WHICH IS REAL
 *
 * This bundle is listed at $149 with an "original price" of $177 and a badge
 * reading "SAVE $28". Its three components are priced at $24, $24 and $29 —
 * $77 in total. So the bundle costs nearly twice what buying the parts
 * separately costs, and the saving the badge advertises does not exist.
 *
 * That is not a rounding problem, it is a figure somebody invented alongside
 * the ratings and the page counts. `selfCheck` computes the component total
 * from the components themselves and reports the discrepancy on every run, so
 * it cannot be quietly forgotten. It is Eric's decision how to resolve it —
 * the price, the badge, or the contents — and it has to be resolved before
 * this is sold to anybody.
 */
import { renderBook, PDF_MIME } from '../lib/pdfBook.mjs';

export const meta = {
  id: 'bundle-condo-complete',
  title: 'Condo Board Complete Bundle',
  subtitle: 'The full governance toolkit for NH condo boards',
  price: 14900,
  /** What the listing claims it would cost separately. */
  listedOriginalPrice: 17700,
  files: ['pdf', 'docx', 'xlsx'],
};

/** The components, in the order somebody should read them. */
const COMPONENTS = [
  {
    id: 'eb-condo-board',
    why: 'Start here. Which document governs, what your fiduciary duty actually requires, how to fund the building, and how to adopt a rule that holds. Everything else in the bundle is easier once this has been read.',
  },
  {
    id: 'tmpl-board-meeting',
    why: 'Then run the meetings on these. The agenda and minutes templates are editable; the action tracker is the part that changes how a board performs, because it reports what share of the board\'s own decisions actually got done.',
  },
  {
    id: 'calc-reserve',
    why: 'Then put real numbers on the reserve. This is where the funding chapter of the handbook becomes your association\'s own figures — percent funded, the recommended contribution, and the year the fund runs dry on your current course.',
  },
];

async function loadComponents() {
  const loaded = [];
  for (const component of COMPONENTS) {
    const mod = await import(`./${component.id}.mjs`);
    loaded.push({ ...component, meta: mod.meta, files: await mod.build() });
  }
  return loaded;
}

function startHereChapters(components) {
  const fileList = components.flatMap((c) => c.files.map((f) => [c.meta.title, f.name]));

  return [
    {
      title: 'What is in this bundle, and the order to use it',
      blocks: [
        { t: 'p', text: 'Three products, and they are meant to be used in sequence rather than dipped into. The handbook explains how an association works; the meeting package is how a board operates week to week; the calculator turns the money chapter into your own figures.' },
        ...components.flatMap((c) => [
          { t: 'h2', text: c.meta.title },
          { t: 'p', text: c.why },
          { t: 'p', text: `Files: ${c.files.map((f) => f.name).join(', ')}`, opts: { italic: true, size: 10 } },
        ]),
        { t: 'h2', text: 'Everything in the download' },
        { t: 'table', head: ['From', 'File'], rows: fileList, widths: [0.4, 0.6] },
      ],
    },
    {
      title: 'A first ninety days for a new board',
      blocks: [
        { t: 'p', text: 'If the board is new, or newly serious, this is the order that produces the most change for the least effort. It uses all three products and it takes about four evenings spread over three months.' },
        { t: 'h2', text: 'Weeks one and two: find out what you have' },
        { t: 'bullets', items: [
          'Gather the declaration, bylaws, current rules, last two years of minutes, the budget, the most recent reserve study and the insurance declarations pages.',
          'Read chapters one and two of the handbook — the hierarchy. Two evenings at most, and it will answer questions the board has been arguing about.',
          'Write the one-page "who fixes what" summary from your own declaration. Highest-value page an association can produce.',
        ] },
        { t: 'h2', text: 'Weeks three to six: put the meetings right' },
        { t: 'bullets', items: [
          'Adopt the standing agenda from the meeting package, with the times.',
          'Start the action tracker. Enter every open item the board can remember, with one name and one date against each.',
          'Switch the minutes to the template — decisions, not discussion.',
          'Circulate the pack three days ahead. This single change usually halves the length of a meeting.',
        ] },
        { t: 'h2', text: 'Weeks seven to twelve: find the real financial position' },
        { t: 'bullets', items: [
          'Fill in the reserve calculator from the study, replacing the two largest unit costs with real local quotes.',
          'Read the percent funded figure and the first year the fund runs dry. Those two numbers are the board\'s actual situation.',
          'Take the recommended contribution and the monthly per-unit gap to the next meeting. A monthly figure is understood; an annual total is argued with.',
          'Decide the reserve contribution deliberately, as its own motion, and minute the reason.',
        ] },
        { t: 'callout', heading: 'The one thing that matters most', body: 'The reserve contribution, decided deliberately and recorded. It is the line that quietly gives way whenever a budget is squeezed, and it is the single decision that determines whether this board spends the next decade managing a building or managing special assessments.' },
        { t: 'h2', text: 'After ninety days' },
        { t: 'p', text: 'The board year calendar in the last chapter of the handbook sets out what has to happen and when — quarterly arrears reviews, the property walk, insurance before the budget, the rules review, and the handover that stops an association losing its own history at every election.' },
      ],
    },
  ];
}

export async function build() {
  const components = await loadComponents();

  const startHere = renderBook({
    title: 'Condo Board Complete Bundle',
    subtitle: 'What is here, and the order to use it',
    blurb: 'Three products that work as a sequence: the handbook explains how an association works, the meeting package is how a board operates week to week, and the calculator turns the money chapter into your own figures. With a first ninety days for a board that is new, or newly serious.',
    audience: ['Condo Boards', 'HOA Boards'],
    edition: '2026 edition',
    keywords: 'condominium, association, board, bundle',
    chapters: startHereChapters(components),
  });

  const files = [
    { name: 'START HERE — Condo Board Complete.pdf', mime: PDF_MIME, buffer: startHere.buffer, pages: startHere.pages },
  ];

  // The components' own files, unchanged. A fix to any of them reaches the
  // bundle on the next build rather than needing to be made twice.
  for (const component of components) {
    for (const file of component.files) {
      files.push({ ...file, name: file.name });
    }
  }

  return files;
}

export async function selfCheck() {
  const components = await loadComponents();
  const files = await build();
  const concerns = [];

  const componentTotal = components.reduce((sum, c) => sum + c.meta.price, 0);
  const listedOriginal = meta.listedOriginalPrice;
  const realSaving = componentTotal - meta.price;

  /**
   * The check this product exists to run.
   *
   * A bundle that costs more than its parts is not a bundle, and a badge
   * advertising a saving that does not exist is the kind of thing that loses a
   * customer permanently rather than once.
   */
  if (meta.price >= componentTotal) {
    concerns.push(
      `the bundle is $${(meta.price / 100).toFixed(0)} and its parts total $${(componentTotal / 100).toFixed(0)} — `
      + `it costs $${((meta.price - componentTotal) / 100).toFixed(0)} MORE than buying them separately`,
    );
  }
  if (Math.abs(listedOriginal - componentTotal) > 100) {
    concerns.push(
      `the listing claims an original price of $${(listedOriginal / 100).toFixed(0)}, but the components actually total `
      + `$${(componentTotal / 100).toFixed(0)} — the "SAVE" badge is computed from a figure nobody can substantiate`,
    );
  }

  const pdfs = files.filter((f) => f.name.endsWith('.pdf'));
  const docx = files.filter((f) => f.name.endsWith('.docx'));
  const xlsx = files.filter((f) => f.name.endsWith('.xlsx'));
  if (pdfs.length < 2) concerns.push('the bundle has no component PDFs');
  if (docx.length < 4) concerns.push(`only ${docx.length} editable templates — the listing says six`);
  if (xlsx.length < 2) concerns.push(`only ${xlsx.length} spreadsheets`);

  for (const file of files) {
    if (!file.buffer?.length) concerns.push(`${file.name} is empty`);
  }

  return {
    figures: [
      ['components', components.map((c) => `${c.meta.title} ($${(c.meta.price / 100).toFixed(0)})`).join(', ')],
      ['files delivered', `${files.length} — ${pdfs.length} PDF, ${docx.length} Word, ${xlsx.length} Excel`],
      ['total size', `${Math.round(files.reduce((s, f) => s + f.buffer.length, 0) / 1024)} KB`],
      ['bundle price', `$${(meta.price / 100).toFixed(0)}`],
      ['parts bought separately', `$${(componentTotal / 100).toFixed(0)}`],
      ['real saving', realSaving >= 0 ? `$${(realSaving / 100).toFixed(0)}` : `MINUS $${(-realSaving / 100).toFixed(0)}`],
      ['listing claims', `original $${(listedOriginal / 100).toFixed(0)}, "SAVE $28"`],
    ],
    concerns,
  };
}
