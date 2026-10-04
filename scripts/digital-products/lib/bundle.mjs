/**
 * Assembling a bundle, and checking its arithmetic.
 *
 * WHAT A BUNDLE IS HERE
 *
 * Not a new product. The component products' own files delivered together,
 * plus one "start here" document saying what to read in what order — which is
 * the only thing a bundle can add that buying the parts does not already give.
 *
 * So a bundle imports its components and asks them to build. Nothing is
 * duplicated, and a correction to the landlord manual reaches every bundle
 * containing it on the next build rather than needing to be made twice.
 *
 * WHY THE PRICING CHECK LIVES HERE
 *
 * Because all three bundles in this catalogue had the same fault and it was
 * found by doing the arithmetic once:
 *
 *     bundle            price   parts   real saving   badge claims
 *     Landlord Starter  $89     $97     $8            SAVE $121
 *     Condo Complete    $149    $77     MINUS $72     SAVE $28
 *     PM Pro            $199    $156    MINUS $43     SAVE $100
 *
 * Two of them cost MORE than their own contents, and all three advertise a
 * discount computed from an `originalPrice` nobody can substantiate — invented
 * alongside the review counts and the page counts.
 *
 * A bundle that costs more than the sum of its parts is not a bundle, and the
 * arithmetic is public: any customer can add up three listed prices. So the
 * check is shared, it runs on every build of every bundle, and it deliberately
 * does not pass while the figures are wrong. Resolving it — the price, the
 * badge, or the contents — is a commercial decision and not one to take by
 * inventing a replacement number.
 */
import { renderBook, PDF_MIME } from './pdfBook.mjs';

const cents = (c) => `$${(c / 100).toFixed(0)}`;

/**
 * Load every component and build its files.
 *
 * `components` is [{ id, why }] in the order a buyer should use them, which is
 * what the start-here document is for.
 */
export async function loadComponents(components) {
  const loaded = [];
  for (const component of components) {
    const mod = await import(`../products/${component.id}.mjs`);
    loaded.push({ ...component, meta: mod.meta, files: await mod.build() });
  }
  return loaded;
}

/**
 * The "what is here and in what order" chapters, which every bundle shares.
 *
 * `extraChapters` is where a bundle adds the thing specific to it — a first
 * ninety days, a first month, whatever genuinely helps that audience.
 */
export function startHereChapters(components, extraChapters = []) {
  const fileList = components.flatMap((c) => c.files.map((f) => [c.meta.title, f.name]));
  return [
    {
      title: 'What is in this bundle, and the order to use it',
      blocks: [
        { t: 'p', text: 'These are meant to be used in sequence rather than dipped into. Each one assumes you have read the one before, and the order below is the order they were written to be read in.' },
        ...components.flatMap((c) => [
          { t: 'h2', text: c.meta.title },
          { t: 'p', text: c.why },
          { t: 'p', text: `Files: ${c.files.map((f) => f.name).join(', ')}`, opts: { italic: true, size: 10 } },
        ]),
        { t: 'h2', text: 'Everything in the download' },
        { t: 'table', head: ['From', 'File'], rows: fileList, widths: [0.4, 0.6] },
      ],
    },
    ...extraChapters,
  ];
}

/** Build the bundle: the start-here document, then every component file. */
export async function buildBundle({ meta, components, blurb, audience, extraChapters, startHereName }) {
  const loaded = await loadComponents(components);

  const startHere = renderBook({
    title: meta.title,
    subtitle: 'What is here, and the order to use it',
    blurb,
    audience,
    edition: '2026 edition',
    keywords: meta.title,
    chapters: startHereChapters(loaded, extraChapters ? extraChapters(loaded) : []),
  });

  const files = [
    { name: startHereName, mime: PDF_MIME, buffer: startHere.buffer, pages: startHere.pages },
  ];
  // The components' own files, unchanged.
  for (const component of loaded) {
    for (const file of component.files) files.push({ ...file });
  }
  return { files, components: loaded };
}

/**
 * The checks every bundle gets: the files are all present and non-empty, and
 * the price actually represents a saving on the parts.
 *
 * `expect` lets a bundle state what its listing promises — `{ docx: 6 }` and so
 * on — so an unfulfilled claim is reported rather than noticed by a buyer.
 */
export async function checkBundle({ meta, files, components, expect = {} }) {
  const concerns = [];

  const componentTotal = components.reduce((sum, c) => sum + c.meta.price, 0);
  const realSaving = componentTotal - meta.price;

  if (meta.price >= componentTotal) {
    concerns.push(
      `the bundle is ${cents(meta.price)} and its parts total ${cents(componentTotal)} — `
      + `it costs ${cents(meta.price - componentTotal)} MORE than buying them separately`,
    );
  }
  if (meta.listedOriginalPrice && Math.abs(meta.listedOriginalPrice - componentTotal) > 100) {
    concerns.push(
      `the listing claims an original price of ${cents(meta.listedOriginalPrice)}, but the components actually `
      + `total ${cents(componentTotal)} — the "SAVE" badge is computed from a figure nobody can substantiate`,
    );
  }

  const byKind = {
    pdf: files.filter((f) => f.name.endsWith('.pdf')).length,
    docx: files.filter((f) => f.name.endsWith('.docx')).length,
    xlsx: files.filter((f) => f.name.endsWith('.xlsx')).length,
  };
  for (const [kind, wanted] of Object.entries(expect)) {
    if ((byKind[kind] || 0) < wanted) {
      concerns.push(`the listing implies ${wanted} ${kind.toUpperCase()} file(s) and the bundle has ${byKind[kind] || 0}`);
    }
  }

  for (const file of files) {
    if (!file.buffer?.length) concerns.push(`${file.name} is empty`);
  }

  return {
    figures: [
      ['components', components.map((c) => `${c.meta.title} (${cents(c.meta.price)})`).join(', ')],
      ['files delivered', `${files.length} — ${byKind.pdf} PDF, ${byKind.docx} Word, ${byKind.xlsx} Excel`],
      ['total size', `${Math.round(files.reduce((s, f) => s + f.buffer.length, 0) / 1024)} KB`],
      ['bundle price', cents(meta.price)],
      ['parts bought separately', cents(componentTotal)],
      ['real saving', realSaving >= 0 ? cents(realSaving) : `MINUS ${cents(-realSaving)}`],
      ...(meta.listedOriginalPrice
        ? [['listing claims', `original ${cents(meta.listedOriginalPrice)}, a saving of ${cents(meta.listedOriginalPrice - meta.price)}`]]
        : []),
    ],
    concerns,
  };
}
