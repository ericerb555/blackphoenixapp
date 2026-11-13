/**
 * What lands on a quote PDF, and what must not.
 *
 * A PDF emailed to a customer is exactly as public as a share link, so this
 * has to obey the same rules as `customerQuoteView` — and the failure is
 * worse, because an email cannot be unsent. If the customer copy carries a
 * line Eric hid, he finds out when they quote his own labour rate back at
 * him.
 *
 * So the tests come in pairs: what the customer gets, and what the internal
 * copy gets. Those two diverging in the wrong direction is the whole risk.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { selectQuoteLines, sectionsOf, isIncluded } from '../src/app/lib/quotePdfSelection.ts';
import { groupLinesByPhase } from '../src/app/lib/invoicePhases.ts';

const quote = {
  materials: [
    { name: 'Lumber', quantity: 1, unitCost: 1100, totalCost: 1100, phase: 'Framing' },
    { name: 'Skip hire', quantity: 1, unitCost: 450, totalCost: 450, phase: 'Strip out', visible: false },
  ],
  labor: [
    { role: 'Carpenter', hours: 40, hourlyRate: 70, totalCost: 2800, phase: 'Framing' },
  ],
  processSteps: [
    { title: 'Strip out', description: 'Remove existing', estimatedDuration: '2 days' },
    { title: 'Framing', description: 'Build the frame', estimatedDuration: '5 days' },
    { title: 'Internal staging', description: 'our scheduling', visible: false },
  ],
};

/* ── the customer copy ───────────────────────────────────────────────────── */

test('a hidden line is not on the customer copy', () => {
  const sel = selectQuoteLines(quote, true);
  assert.ok(!sel.lines.some((l) => l.description.includes('Skip hire')));
});

test('a hidden line still counts towards its phase cost', () => {
  // Hiding removes the detail, not the money. A total summed from the drawn
  // lines would undercharge by exactly the hidden amount.
  const sel = selectQuoteLines(quote, true);
  assert.equal(sel.phaseCost.get('Strip out'), 450);
  assert.equal(sel.phaseCost.get('Framing'), 3900);
});

test('a hidden process step is not on the customer copy', () => {
  const sel = selectQuoteLines(quote, true);
  assert.ok(!sel.steps.some((s: any) => s.title === 'Internal staging'));
});

test('switching labour off withholds the rate but keeps the phase cost', () => {
  const sel = selectQuoteLines(
    { ...quote, customerSections: { materials: true, labor: false, processDetail: true } },
    true,
  );
  assert.ok(!sel.lines.some((l) => l.description.includes('Carpenter')), 'labour leaked');
  assert.ok(sel.lines.some((l) => l.description.includes('Lumber')), 'materials should stay');
  assert.equal(sel.phaseCost.get('Framing'), 3900, 'phase cost unchanged');
  assert.equal(sel.showLines, true);
});

test('switching both line sections off leaves nothing drawable but the totals', () => {
  const sel = selectQuoteLines(
    { ...quote, customerSections: { materials: false, labor: false, processDetail: true } },
    true,
  );
  assert.deepEqual(sel.lines, []);
  assert.equal(sel.showLines, false);
  assert.equal(sel.phaseCost.get('Framing'), 3900);
});

test('switching process detail off drops the text, never the phase', () => {
  const sel = selectQuoteLines(
    { ...quote, customerSections: { materials: true, labor: true, processDetail: false } },
    true,
  );
  assert.equal(sel.phaseText.size, 0, 'no phase prose');
  assert.equal(sel.steps.length, 2, 'the phases themselves survive');
});

test('nothing withheld leaks into the serialised customer selection', () => {
  const sel = selectQuoteLines(
    { ...quote, customerSections: { materials: false, labor: false, processDetail: false } },
    true,
  );
  const json = JSON.stringify({ lines: sel.lines, text: [...sel.phaseText] });
  for (const secret of ['Carpenter', 'Lumber', 'Skip hire', 'Build the frame', 'our scheduling']) {
    assert.ok(!json.includes(secret), `${secret} leaked onto the customer PDF`);
  }
});

/* ── the internal copy, which must NOT be censored ───────────────────────── */

test('the internal copy shows everything, hidden lines included', () => {
  const sel = selectQuoteLines(quote, false);
  assert.ok(sel.lines.some((l) => l.description.includes('Skip hire')));
  assert.ok(sel.lines.some((l) => l.description.includes('Carpenter')));
  assert.ok(sel.steps.some((s: any) => s.title === 'Internal staging'));
});

test('the internal copy marks which lines the customer was not shown', () => {
  // Reading a printout and not knowing which lines the customer saw is how
  // somebody discusses a line the customer has never heard of.
  const sel = selectQuoteLines(quote, false);
  const skip = sel.lines.find((l) => l.description.includes('Skip hire'));
  assert.match(skip!.description, /hidden from customer/);
});

test('the internal copy ignores the section switches', () => {
  const sel = selectQuoteLines(
    { ...quote, customerSections: { materials: false, labor: false, processDetail: false } },
    false,
  );
  assert.equal(sel.lines.length, 3, 'all lines regardless');
  assert.equal(sel.sections.materials, true);
});

/* ── defaults and rubbish ────────────────────────────────────────────────── */

test('every section defaults on', () => {
  for (const q of [{}, { customerSections: {} }, { customerSections: { materials: true } }]) {
    const s = sectionsOf(q);
    assert.equal(s.labor, true, JSON.stringify(q));
    assert.equal(s.processDetail, true);
  }
});

test('the old lineDetail setting is still honoured', () => {
  const s = sectionsOf({ lineDetail: 'phase-totals' });
  assert.deepEqual(s, { materials: false, labor: false, processDetail: true });
});

test('a malformed quote selects nothing rather than throwing', () => {
  for (const bad of [undefined, null, {}, { materials: 'nope', labor: 3 }]) {
    const sel = selectQuoteLines(bad, true);
    assert.deepEqual(sel.lines, []);
    assert.equal(sel.phaseCost.size, 0);
  }
});

/* ── what the home owner is supplying ────────────────────────────────────── */

const withSupplied = {
  ...quote,
  credits: [
    { id: 'c1', description: 'Hardwood flooring', amount: 2400, reason: 'Bought their own at Home Depot, receipt on file' },
    { id: 'c2', description: 'Bathroom fixtures', amount: 650 },
  ],
};

test('what the owner supplies reaches the customer copy', () => {
  const sel = selectQuoteLines(withSupplied, true);
  assert.equal(sel.credits.length, 2);
  assert.equal(sel.credits[0].description, 'Hardwood flooring');
  assert.equal(sel.credits[0].amount, 2400);
  assert.match(sel.credits[0].note!, /Home Depot/);
});

test('the section switches do NOT withhold it', () => {
  /**
   * The switches exist to stop a customer working backwards to our rates.
   * This is money coming OFF their bill for something they are providing,
   * so hiding it would leave a deduction in the total with nothing on the
   * page explaining it — which is the one thing that generates a phone call.
   */
  const sel = selectQuoteLines(
    { ...withSupplied, customerSections: { materials: false, labor: false, processDetail: false } },
    true,
  );
  assert.equal(sel.credits.length, 2, 'withheld along with the materials');
});

test('the amount is always positive, whatever was typed', () => {
  // Being a credit is the record type, not the sign. A negative here would
  // be subtracted twice by anything that already knows these come off.
  const sel = selectQuoteLines({ credits: [{ description: 'Tiles', amount: -500 }] }, true);
  assert.equal(sel.credits[0].amount, 500);
});

test('an unnamed item still reads as something', () => {
  const sel = selectQuoteLines({ credits: [{ amount: 100 }] }, true);
  assert.equal(sel.credits[0].description, 'Supplied by you');
  assert.equal(sel.credits[0].note, undefined, 'no empty note to draw');
});

test('a quote with none gets an empty list, not undefined', () => {
  for (const q of [quote, {}, undefined, { credits: 'nope' }]) {
    assert.deepEqual(selectQuoteLines(q, true).credits, []);
  }
});

/* ── excluded is not hidden, and the difference is the price ─────────────── */

const withExcluded = {
  materials: [
    { name: 'Lumber', quantity: 1, unitCost: 1100, totalCost: 1100, phase: 'Framing' },
    { name: 'Skip hire', quantity: 1, unitCost: 450, totalCost: 450, phase: 'Framing', visible: false },
    { name: 'Dropped extra', quantity: 1, unitCost: 700, totalCost: 700, phase: 'Framing', included: false },
  ],
  labor: [{ role: 'Carpenter', hours: 10, hourlyRate: 70, totalCost: 700, phase: 'Framing', included: false }],
  processSteps: [
    { title: 'Framing', description: 'Build the frame' },
    { title: 'Dropped phase', description: 'decided against', included: false },
  ],
  credits: [
    { description: 'Flooring', amount: 500 },
    { description: 'Dropped credit', amount: 900, included: false },
  ],
};

test('an excluded line is not charged, a hidden one is', () => {
  const sel = selectQuoteLines(withExcluded, true);
  assert.equal(sel.phaseCost.get('Framing'), 1550, '1100 + 450 hidden; the two 700s are out');
  assert.deepEqual(sel.lines.map((l) => l.description), ['Lumber']);
});

test('an excluded line is gone from the internal copy too', () => {
  const sel = selectQuoteLines(withExcluded, false);
  const json = JSON.stringify(sel.lines);
  assert.ok(!json.includes('Dropped extra'), 'excluded material leaked internally');
  assert.ok(!json.includes('Carpenter'), 'excluded labour leaked internally');
  assert.ok(json.includes('Skip hire'), 'the hidden one must still show internally');
});

test('an excluded process step is dropped for everyone', () => {
  for (const forCustomer of [true, false]) {
    const sel = selectQuoteLines(withExcluded, forCustomer);
    assert.ok(!sel.steps.some((s: any) => s.title === 'Dropped phase'), String(forCustomer));
  }
});

test('an excluded supplied item does not reduce the bill', () => {
  const sel = selectQuoteLines(withExcluded, true);
  assert.deepEqual(sel.credits.map((c) => c.description), ['Flooring']);
});

test('absent means included, so no existing quote changes', () => {
  for (const l of [{}, { included: true }, { included: undefined }]) {
    assert.equal(isIncluded(l), true, JSON.stringify(l));
  }
  assert.equal(isIncluded({ included: false }), false);
});

/* ── materials and labour, told apart inside a phase ─────────────────────── */

/**
 * "all the labor materials ... per section so they can see how the money is
 * broken up per process."
 *
 * The document splits each phase into its materials and its labour and
 * subtotals both. It can only do that if the selection says which a line is,
 * and it is the kind of field that is easy to set on one branch and forget on
 * the other — in which case half the lines quietly land in the wrong group
 * and the subtotals are wrong without anything looking broken.
 */
test('every selected line says whether it is material or labour', () => {
  for (const forCustomer of [true, false]) {
    const sel = selectQuoteLines(quote, forCustomer);
    assert.ok(sel.lines.length > 0);
    for (const line of sel.lines) {
      assert.ok(
        line.kind === 'material' || line.kind === 'labor',
        `${line.description} has kind ${JSON.stringify(line.kind)}`,
      );
    }
  }
});

test('a material is tagged material and a labour line labour', () => {
  const sel = selectQuoteLines(quote, false);
  const byKind = (k: string) => sel.lines.filter((l) => l.kind === k).map((l) => l.description);
  assert.ok(byKind('material').some((d) => /Lumber/.test(d)));
  assert.ok(byKind('material').some((d) => /Skip hire/.test(d)));
  assert.ok(byKind('labor').some((d) => /Carpenter/.test(d)));
  // And nothing has wandered across.
  assert.ok(!byKind('labor').some((d) => /Lumber|Skip hire/.test(d)));
  assert.ok(!byKind('material').some((d) => /Carpenter/.test(d)));
});

/**
 * The per-kind subtotals are summed from DRAWN lines; the phase total counts
 * withheld ones too. The gap between them is real money and the document
 * carries it as a balancing row — so this asserts the gap is what we think it
 * is, because a wrong figure here is a quote whose own column does not add up.
 */
test('what the drawn lines miss is exactly the withheld money', () => {
  const sel = selectQuoteLines(quote, true);
  const drawnInStripOut = sel.lines
    .filter((l) => l.phase === 'Strip out')
    .reduce((sum, l) => sum + l.quantity * l.unit_price, 0);
  assert.equal(drawnInStripOut, 0, 'the only Strip out line is hidden');
  assert.equal(sel.phaseCost.get('Strip out'), 450, 'but its money is still charged');
});

/* ── the floor: a phase and its price, even with everything else off ────── */

/**
 * "i just see a total at the bottom of the pdf."
 *
 * The document has two fallbacks for when no lines can be drawn: the job's
 * written steps, and — when there are none of those either — the phases the
 * LINES name. A quote tagged "Demo" and "Framing" with no written process
 * used to fall through both and print a grand total over a blank page.
 *
 * Both fallbacks read `phaseCost`, so what matters is that it still knows
 * every phase and its price when the section switches have removed every
 * line from `lines`. That is what this asserts.
 */
test('phase costs survive both sections being switched off', () => {
  const allOff = {
    ...quote,
    customerSections: { materials: false, labor: false, processDetail: true },
  };
  const sel = selectQuoteLines(allOff, true);
  assert.equal(sel.lines.length, 0, 'nothing is drawable');
  assert.equal(sel.showLines, false);
  // But the money is still known, phase by phase — which is what the
  // document falls back to drawing.
  assert.equal(sel.phaseCost.get('Framing'), 3900);
  assert.equal(sel.phaseCost.get('Strip out'), 450);
});

test('a quote with no steps still names its phases through the costs', () => {
  const noSteps = { ...quote, processSteps: [] };
  const sel = selectQuoteLines(noSteps, true);
  assert.equal(sel.steps.length, 0, 'no written process to fall back on');
  assert.deepEqual([...sel.phaseCost.keys()].sort(), ['Framing', 'Strip out']);
});

test('a quote with genuinely no priced work has nothing to fall back to', () => {
  const empty = { materials: [], labor: [], processSteps: [] };
  const sel = selectQuoteLines(empty, true);
  assert.equal(sel.lines.length, 0);
  assert.equal(sel.steps.length, 0);
  assert.equal(sel.phaseCost.size, 0, 'so the document must explain itself instead');
});

/* ── lines without rates: the state between "everything" and "nothing" ──── */

/**
 * "even if i dont want the material and labor rates on the quote i want to
 * see the line item and the entire process details."
 *
 * The switch was a boolean, so the only choices were every line with its
 * quantity and unit price, or no lines at all. The useful middle state —
 * tell the customer what the work consists of and what each part costs,
 * without handing over the rate card — had no way to be expressed.
 *
 * The property that matters is the last test in this block: in 'no-rates'
 * the figures must be ABSENT from what the customer receives, not merely
 * undrawn. "Present but not displayed" is how the `visible` flag came one
 * keystroke from publishing a labour rate.
 */
import { rateVisibilityOf, sectionModeOf } from '../src/app/lib/quotePdfSelection.ts';

const rated = {
  materials: [{ name: 'Timber', quantity: 40, unitCost: 12, totalCost: 480, phase: 'Framing' }],
  labor: [{ role: 'Carpenter', hours: 24, hourlyRate: 55, totalCost: 1320, phase: 'Framing' }],
  processSteps: [{ title: 'Framing', description: 'We build the frame.' }],
};
const withMode = (mode: any) => ({
  ...rated,
  customerSections: { materials: mode, labor: mode, processDetail: true },
});

test('the three modes read back as themselves', () => {
  assert.equal(sectionModeOf('full'), 'full');
  assert.equal(sectionModeOf('no-rates'), 'no-rates');
  assert.equal(sectionModeOf('off'), 'off');
});

/** Every quote written before this used booleans, and they must not move. */
test('the old booleans still mean what they meant', () => {
  assert.equal(sectionModeOf(true), 'full');
  assert.equal(sectionModeOf(false), 'off');
  assert.equal(sectionModeOf(undefined), 'full', 'absent has always meant shown');
  assert.equal(sectionModeOf(null), 'full');
});

test('a de-rated section is still SHOWN — it just loses its figures', () => {
  const q = withMode('no-rates');
  assert.equal(sectionsOf(q).labor, true, 'shown');
  assert.equal(rateVisibilityOf(q).labor, false, 'but not its rates');
  // And the lines are still drawable, which is the whole point.
  assert.equal(selectQuoteLines(q, true).lines.length, 2);
});

test('an off section is neither shown nor rated', () => {
  const q = withMode('off');
  assert.equal(sectionsOf(q).labor, false);
  assert.equal(rateVisibilityOf(q).labor, false);
  assert.equal(selectQuoteLines(q, true).lines.length, 0);
});

test('the office copy always keeps its rates, whatever the customer gets', () => {
  for (const mode of ['full', 'no-rates', 'off']) {
    const sel = selectQuoteLines(withMode(mode), false);
    assert.equal(sel.rates.materials, true, `internal copy, mode ${mode}`);
    assert.equal(sel.rates.labor, true, `internal copy, mode ${mode}`);
    assert.equal(sel.lines.length, 2, `internal copy shows everything, mode ${mode}`);
  }
});

test('the line keeps its figures internally, because the amounts are summed from them', () => {
  // The columns are dropped by the layout; the arithmetic still needs these.
  const sel = selectQuoteLines(withMode('no-rates'), true);
  const labour = sel.lines.find((l) => l.kind === 'labor')!;
  assert.equal(labour.quantity, 24);
  assert.equal(labour.unit_price, 55);
  assert.equal(labour.quantity * labour.unit_price, 1320);
});

/* ── soft costs that belong to a process ─────────────────────────────────── */

/**
 * Trash removal, and the reason this needed changing at all.
 *
 * `additionalCosts` was read by NOTHING customer-facing — not this
 * selection, not the PDF, not the portal payload. So the $125 disposal
 * minimum that goes on every quote was charged on all of them and shown on
 * none: present in the total, absent from every line. That is the one
 * combination a customer can fairly object to, and it is why the fix is to
 * draw it rather than to hide it better.
 *
 * Only PHASED soft costs are drawn. An unphased one is not under any
 * process, which is the honest answer for an overhead, and it stays exactly
 * as invisible as it was.
 */
const withSoftCosts = {
  materials: [{ name: 'Tile', quantity: 10, unitCost: 4, totalCost: 40, phase: 'First fix' }],
  labor: [],
  processSteps: [{ title: 'First fix' }, { title: 'Trash removal and disposal' }],
  additionalCosts: [
    { id: 'a1', name: 'Trash removal and disposal', amount: 125, phase: 'Trash removal and disposal' },
    { id: 'a2', name: 'Site insurance', amount: 90 },
  ],
};

test('a phased soft cost is drawn under its process', () => {
  const sel = selectQuoteLines(withSoftCosts, true);
  const line = sel.lines.find((l) => l.phase === 'Trash removal and disposal');

  assert.ok(line, 'the disposal line should be selected');
  assert.match(line!.description, /Trash removal/);
  // A skip is a charge, not a rate times an amount.
  assert.equal(line!.quantity, 0);
  assert.equal(line!.unit_price, 0);
});

test('an unphased soft cost stays out, as it always was', () => {
  const sel = selectQuoteLines(withSoftCosts, true);
  assert.ok(!sel.lines.some((l) => /Site insurance/.test(l.description)));
});

/**
 * The phase subtotal has to agree with the lines printed under it, and it
 * feeds the payment schedule — a phase counted as zero gets a zero draw.
 */
test('the phase cost counts the soft cost, by its `amount`', () => {
  const sel = selectQuoteLines(withSoftCosts, false);
  assert.equal(sel.phaseCost.get('Trash removal and disposal'), 125);
  assert.equal(sel.phaseCost.get('First fix'), 40);
});

test('an unphased soft cost is in no phase total', () => {
  const sel = selectQuoteLines(withSoftCosts, false);
  const counted = [...sel.phaseCost.values()].reduce((t, v) => t + v, 0);
  assert.equal(counted, 165, '40 + 125, with the 90 left out');
});

test('an excluded soft cost is not charged and not drawn', () => {
  const sel = selectQuoteLines({
    ...withSoftCosts,
    additionalCosts: [{ name: 'Skip', amount: 125, phase: 'Trash removal and disposal', included: false }],
  }, true);
  assert.ok(!sel.lines.some((l) => /Skip/.test(l.description)));
  assert.equal(sel.phaseCost.get('Trash removal and disposal') ?? 0, 0);
});

test('a soft cost hidden from the customer is withheld from them and kept on our copy', () => {
  const quote = {
    ...withSoftCosts,
    additionalCosts: [{ name: 'Skip', amount: 125, phase: 'Trash removal and disposal', visible: false }],
  };
  assert.ok(!selectQuoteLines(quote, true).lines.some((l) => /Skip/.test(l.description)));
  assert.ok(selectQuoteLines(quote, false).lines.some((l) => /Skip/.test(l.description)));
  // Hidden removes the detail and keeps the money — the phase total stands.
  assert.equal(selectQuoteLines(quote, true).phaseCost.get('Trash removal and disposal'), 125);
});

/* ── the waste factor, which is not in the unit price ────────────────────── */

/**
 * MEASURED on Q-2026-0002, 2026-11-13. A plywood line read 6 × $38.40 and was
 * stored at $253.44 — the estimator folds a 10% waste factor into the line
 * total and leaves the rate at what the supplier charges. The PDF printed
 * quantity × rate, so sixteen lines came to $12,643.09 under a total of
 * $12,666.13. Out by exactly the waste, on one line.
 *
 * Eric found it by adding the column up, which was the only way anyone would.
 */
const WASTED_QUOTE = {
  customerSections: { materials: true, labor: true, processDetail: true },
  materials: [
    { name: 'Plywood Sheets', quantity: 6, unitCost: 38.4, wasteFactor: 0.1, totalCost: 253.44, phase: 'Bench Construction' },
    { name: '2x4 Lumber', quantity: 25, unitCost: 4.38, totalCost: 109.5, phase: 'Bench Construction' },
  ],
  labor: [
    { role: 'Carpenter', hours: 30, hourlyRate: 80.5, totalCost: 2415, phase: 'Bench Construction' },
  ],
};

test('a line carries what it actually comes to, not quantity times rate', () => {
  const { lines } = selectQuoteLines(WASTED_QUOTE, true);
  const plywood = lines.find((l) => l.description.startsWith('Plywood'));
  assert.ok(plywood);
  assert.equal(plywood.amount, 253.44, 'the stored total wins');
  // The rate is still the supplier's, because that is what it is.
  assert.equal(plywood.unit_price, 38.4);
  assert.equal(plywood.quantity, 6);
});

test('the column adds up to the quote it came from', () => {
  const { lines } = selectQuoteLines(WASTED_QUOTE, true);
  const summed = Math.round(lines.reduce((t, l) => t + l.amount, 0) * 100) / 100;
  assert.equal(summed, 2777.94, 'what the three lines are stored at');
  // And emphatically not the figure the document used to print.
  const bare = Math.round(lines.reduce((t, l) => t + l.quantity * l.unit_price, 0) * 100) / 100;
  assert.equal(bare, 2754.9);
  assert.equal(Math.round((summed - bare) * 100) / 100, 23.04);
});

test('a line that comes to more than its own maths says why', () => {
  const { lines } = selectQuoteLines(WASTED_QUOTE, true);
  const plywood = lines.find((l) => l.description.startsWith('Plywood'))!;
  // Otherwise the fix trades one unanswerable question for another: a customer
  // multiplying 6 × $38.40 gets $230.40 against a printed $253.44.
  assert.match(plywood.description, /incl\. 10% waste/);
});

test('an ordinary line is not annotated and is unchanged', () => {
  const { lines } = selectQuoteLines(WASTED_QUOTE, true);
  const lumber = lines.find((l) => l.description.startsWith('2x4'))!;
  assert.equal(lumber.amount, 109.5);
  assert.equal(lumber.description, '2x4 Lumber');
  const carpenter = lines.find((l) => l.description.startsWith('Carpenter'))!;
  assert.equal(carpenter.amount, 2415);
  assert.ok(!/waste/.test(carpenter.description));
});

test('a line with no stored total still falls back to quantity times rate', () => {
  const { lines } = selectQuoteLines({
    customerSections: { materials: true, labor: true, processDetail: true },
    materials: [{ name: 'Hand built', quantity: 3, unitCost: 25 }],
    labor: [],
  }, true);
  assert.equal(lines[0].amount, 75);
});

/* ── nothing a quote is charging for may fall off the document ───────────── */

/**
 * Eric: "make sure all line items show up even when added after."
 *
 * The case that prompted it: Q-2026-0002 carried `Fixture Installation` and
 * `Wall Modifications` on its LINES and in neither case on its process steps,
 * so both were appended after the six phases that had steps. Nothing was
 * dropped — the phase subtotals still came to the quote total — but they
 * landed past a page break and read as an appendix, and adding up what was on
 * the first page gave 10,032.94 against a total of 12,666.13.
 *
 * So this is the invariant, asserted rather than assumed: EVERY INCLUDED LINE
 * REACHES A DRAWN PHASE. Hiding a line from the customer folds its money into
 * the phase total and is deliberate; losing a line does not and is not.
 */
const PHASED_BASE = {
  customerSections: { materials: true, labor: true, processDetail: true },
  processSteps: [
    { title: 'Site Setup', stepNumber: 1 },
    { title: 'Framing', stepNumber: 2 },
    { title: 'Clean up', stepNumber: 3 },
  ],
  materials: [
    { name: 'Protection', phase: 'Site Setup', quantity: 1, unitCost: 120, totalCost: 120 },
    { name: 'Timber', phase: 'Framing', quantity: 10, unitCost: 40, totalCost: 400 },
  ],
  labor: [
    { role: 'Carpenter', phase: 'Framing', hours: 10, hourlyRate: 70, totalCost: 700 },
    { role: 'Cleaner', phase: 'Clean up', hours: 2, hourlyRate: 50, totalCost: 100 },
  ],
};

const drawnTotal = (quote: any, forCustomer = true) => {
  const sel = selectQuoteLines(quote, forCustomer);
  const groups = groupLinesByPhase(sel.lines, sel.steps);
  /* What the document prints per phase: the TRUE cost when it knows one,
     which is what keeps a withheld line's money on the page. */
  const total = groups.reduce((sum, g) => {
    const known = g.phase && sel.phaseCost.has(g.phase)
      ? (sel.phaseCost.get(g.phase) as number)
      : g.lines.reduce((t, l: any) => t + (Number.isFinite(l.amount) ? l.amount : l.quantity * l.unit_price), 0);
    return sum + known;
  }, 0);
  return { total: Math.round(total * 100) / 100, groups, sel };
};

const chargedTotal = (quote: any) => Math.round(
  [...quote.materials, ...quote.labor]
    .filter((l: any) => l?.included !== false)
    .reduce((t: number, l: any) => t + Number(l.totalCost || 0), 0) * 100,
) / 100;

test('a line added later, under a phase the process never listed, still appears', () => {
  const quote = {
    ...PHASED_BASE,
    labor: [
      ...PHASED_BASE.labor,
      // Added by hand afterwards, with a phase nobody put in processSteps.
      { role: 'Bench install', phase: 'Fixture Installation', hours: 4, hourlyRate: 65, totalCost: 260 },
    ],
  };
  const { groups, total } = drawnTotal(quote);
  const names = groups.map((g) => g.label);
  assert.ok(names.includes('Fixture Installation'), 'the new phase must be drawn');
  assert.equal(total, chargedTotal(quote));
  assert.equal(total, 1580);
});

test('a line added with NO phase at all is still drawn and still counted', () => {
  const quote = {
    ...PHASED_BASE,
    materials: [
      ...PHASED_BASE.materials,
      { name: 'Skip hire', quantity: 1, unitCost: 125, totalCost: 125 },
    ],
  };
  const { groups, total } = drawnTotal(quote);
  assert.ok(groups.some((g) => g.phase === null), 'an untagged line needs a home');
  assert.equal(total, chargedTotal(quote));
});

test('several late additions, several new phases, nothing lost', () => {
  const quote = {
    ...PHASED_BASE,
    materials: [
      ...PHASED_BASE.materials,
      { name: 'Tiles', phase: 'Tiling', quantity: 40, unitCost: 12, totalCost: 480 },
      { name: 'Grout', phase: 'Tiling', quantity: 2, unitCost: 18, totalCost: 36 },
      { name: 'Hair dryers', phase: 'Fixture Installation', quantity: 3, unitCost: 202.5, totalCost: 607.5 },
    ],
    labor: [
      ...PHASED_BASE.labor,
      { role: 'Tiler', phase: 'Tiling', hours: 12, hourlyRate: 65, totalCost: 780 },
    ],
  };
  const { groups, total } = drawnTotal(quote);
  for (const expected of ['Tiling', 'Fixture Installation']) {
    assert.ok(groups.some((g) => g.label === expected), `${expected} must be drawn`);
  }
  assert.equal(total, chargedTotal(quote));
});

test('a line hidden from the customer keeps its money on the page', () => {
  // Deliberate: hiding removes the detail, not the charge. The phase total
  // still carries it, which is what makes the document reconcile.
  const quote = {
    ...PHASED_BASE,
    materials: [
      ...PHASED_BASE.materials,
      { name: 'Dump run', phase: 'Clean up', quantity: 1, unitCost: 200, totalCost: 200, visible: false },
    ],
  };
  const { total, sel } = drawnTotal(quote);
  assert.equal(sel.lines.some((l) => l.description.startsWith('Dump run')), false, 'not itemised');
  assert.equal(total, chargedTotal(quote), 'but still charged for, and still on the page');
});

test('a line taken OFF the quote is not drawn and not charged', () => {
  const quote = {
    ...PHASED_BASE,
    materials: [
      ...PHASED_BASE.materials,
      { name: 'Dropped extra', phase: 'Framing', quantity: 1, unitCost: 900, totalCost: 900, included: false },
    ],
  };
  const { total } = drawnTotal(quote);
  assert.equal(total, chargedTotal(quote));
  assert.equal(total, 1320, 'the excluded line is in neither figure');
});

test('the office copy accounts for every line too', () => {
  const quote = {
    ...PHASED_BASE,
    labor: [
      ...PHASED_BASE.labor,
      { role: 'Late add', phase: 'Snagging', hours: 3, hourlyRate: 60, totalCost: 180, visible: false },
    ],
  };
  const { total, groups } = drawnTotal(quote, false);
  assert.ok(groups.some((g) => g.label === 'Snagging'));
  assert.equal(total, chargedTotal(quote));
});
