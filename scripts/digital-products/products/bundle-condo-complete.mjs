/**
 * Condo Board Complete Bundle — `bundle-condo-complete`, $149.
 *
 * Listed at $149 against an "original" of $177, while its three components are
 * $24, $24 and $29 — $77 in total. So it costs $72 MORE than buying the parts
 * separately and the "SAVE $28" badge is computed from a figure nobody can
 * substantiate.
 *
 * `lib/bundle.mjs` runs that arithmetic on every build and the check
 * deliberately does not pass. See the note there; resolving it is a commercial
 * decision rather than a number to invent.
 *
 * WHY THESE THREE GO TOGETHER
 *
 * They are a sequence rather than a set: the handbook explains how an
 * association works, the meeting package is how a board operates week to week,
 * and the calculator turns the handbook's money chapter into this
 * association's own figures.
 */
import { buildBundle, checkBundle } from '../lib/bundle.mjs';

export const meta = {
  id: 'bundle-condo-complete',
  title: 'Condo Board Complete Bundle',
  subtitle: 'The full governance toolkit for NH condo boards',
  price: 6500,
  /** What the listing claims it would cost separately. */
  listedOriginalPrice: 7700,
  files: ['pdf', 'docx', 'xlsx'],
};

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

/** The chapter specific to this bundle: a first ninety days for a new board. */
function extraChapters() {
  return [
    {
      title: 'A first ninety days for a new board',
      blocks: [
        { t: 'p', text: 'If the board is new, or newly serious, this is the order that produces the most change for the least effort. It uses all three products and takes about four evenings spread over three months.' },
        { t: 'h2', text: 'Weeks one and two: find out what you have' },
        { t: 'bullets', items: [
          'Gather the declaration, bylaws, current rules, last two years of minutes, the budget, the most recent reserve study and the insurance declarations pages.',
          'Read chapters one and two of the handbook — the hierarchy. Two evenings at most, and it will settle questions the board has been arguing about.',
          'Write the one-page "who fixes what" summary from your own declaration. The highest-value page an association can produce, and it pre-empts the argument rather than winning it.',
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
  const { files } = await buildBundle({
    meta,
    components: COMPONENTS,
    blurb: 'Three products that work as a sequence: the handbook explains how an association works, the meeting package is how a board operates week to week, and the calculator turns the money chapter into your own figures. With a first ninety days for a board that is new, or newly serious.',
    audience: ['Condo Boards', 'HOA Boards'],
    extraChapters,
    startHereName: 'START HERE — Condo Board Complete.pdf',
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
    startHereName: 'START HERE — Condo Board Complete.pdf',
  });
  // The listing says "6 templates", which is the four Word files plus the
  // tracker and the agenda/minutes pair counted as one pack.
  return checkBundle({ meta, files, components, expect: { pdf: 3, docx: 4, xlsx: 2 } });
}
