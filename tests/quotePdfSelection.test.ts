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
