/**
 * A draw, turned into an invoice the server will agree with.
 *
 * The server recomputes every invoice total from the line items and ignores
 * a posted total that disagrees. So the test that matters is not "does this
 * function return the right number" — it is "does the SERVER arrive at the
 * draw amount when handed this payload". That is simulated here, with the
 * server's arithmetic copied in the server's order, so the two cannot drift
 * without a test going red.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { drawToInvoice, normalisedTaxRate } from '../src/app/lib/drawToInvoice.ts';
import { buildPaymentSchedule } from '../src/app/lib/paymentSchedule.ts';
import { schedulePhasesOf, contractTotalOf } from '../src/app/lib/quoteToSchedule.ts';

/**
 * What `POST /invoices` does with a payload, exactly as index.tsx does it.
 *
 *   subtotal = sum of line amounts        tax = subtotal * rate
 *   total    = subtotal + tax - discount
 */
const money = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0;
};
function serverTotal(payload: any): number {
  const subtotal = money(payload.line_items.reduce((s: number, i: any) => s + i.amount, 0));
  const taxAmount = money(subtotal * (Number(payload.tax_rate || 0) / 100));
  const discount = money(payload.discount_amount || 0);
  return money(subtotal + taxAmount - discount);
}

const quote = {
  id: 'q-1',
  taxRate: 8.75,
  /**
   * CONSISTENT WITH ITS OWN LINES, deliberately.
   *
   * Materials and labour come to 5,588; 8.75% of that is 488.95. A fixture
   * whose total does not match its lines makes every draw disagree with
   * every invoice, which is a real failure mode but not the one these tests
   * are for — it is the one the schedule panel's "rebuild it" warning
   * covers, and it is asserted on its own below.
   */
  totalCost: 6076.95,
  materials: [
    { name: 'Steel beam', quantity: 1, unitCost: 1840, totalCost: 1840, phase: 'Structural' },
    { name: 'Skip hire', quantity: 2, unitCost: 450, totalCost: 900, phase: 'Strip out', visible: false },
  ],
  labor: [
    { role: 'Carpenter', hours: 32, hourlyRate: 70, totalCost: 2240, phase: 'Structural' },
    { role: 'Labourer', hours: 16, hourlyRate: 38, totalCost: 608, phase: 'Strip out' },
  ],
  processSteps: [{ title: 'Strip out' }, { title: 'Structural' }],
};

const schedule = buildPaymentSchedule({
  phases: schedulePhasesOf(quote),
  total: contractTotalOf(quote),
  depositRate: 0.3,
});

/* ── THE PROPERTY: the server must land on the draw ──────────────────────── */

test('the server computes exactly the draw amount, for every draw', () => {
  for (const draw of schedule) {
    const payload = drawToInvoice({ quote, draw });
    assert.equal(
      serverTotal(payload),
      draw.amount,
      `${draw.label}: server computed ${serverTotal(payload)}, draw is ${draw.amount}`,
    );
  }
});

test('…and across thousands of randomised quotes', () => {
  let seed = 7771;
  const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;

  for (let run = 0; run < 2000; run++) {
    const phaseNames = ['A', 'B', 'C'].slice(0, 1 + Math.floor(rnd() * 3));
    const q: any = {
      id: 'q', taxRate: Math.round(rnd() * 2000) / 100,
      materials: [], labor: [],
      processSteps: phaseNames.map((t) => ({ title: t })),
    };
    for (const name of phaseNames) {
      q.materials.push({
        name: 'M', quantity: 1 + Math.floor(rnd() * 9),
        unitCost: Math.round(rnd() * 200000) / 100, phase: name,
        ...(rnd() < 0.3 ? { visible: false } : {}),
      });
      q.labor.push({
        role: 'L', hours: 1 + Math.floor(rnd() * 40),
        hourlyRate: Math.round(rnd() * 15000) / 100, phase: name,
      });
    }
    for (const m of q.materials) m.totalCost = m.quantity * m.unitCost;
    for (const l of q.labor) l.totalCost = l.hours * l.hourlyRate;
    const sub = [...q.materials, ...q.labor].reduce((a: number, x: any) => a + x.totalCost, 0);
    q.totalCost = money(sub * (1 + q.taxRate / 100));

    const draws = buildPaymentSchedule({
      phases: schedulePhasesOf(q), total: contractTotalOf(q), depositRate: Math.round(rnd() * 60) / 100,
    });
    for (const draw of draws) {
      const payload = drawToInvoice({ quote: q, draw });
      // A randomised quote's total is built from its own lines, so every
      // draw should reconcile. Where it cannot, it must SAY so.
      if (!payload.matchesDraw) {
        assert.equal(payload.discount_amount, 0, `run ${run}: unflagged mismatch`);
        continue;
      }
      assert.equal(serverTotal(payload), draw.amount, `run ${run} ${draw.label}`);
    }
  }
});

/* ── what is on the invoice ──────────────────────────────────────────────── */

test('a phase draw itemises that phase and nothing else', () => {
  const structural = schedule.find((d) => d.phase === 'Structural')!;
  const payload = drawToInvoice({ quote, draw: structural });
  assert.deepEqual(
    payload.line_items.map((l) => l.description),
    ['Steel beam', 'Carpenter'],
  );
  assert.ok(payload.line_items.every((l) => l.phase === 'Structural'));
});

test('hidden lines are still ON the invoice record, flagged', () => {
  // They have to be: the total is derived from the lines, so dropping one
  // here would reduce the invoice by exactly the hidden amount. Withholding
  // them from the customer is the server projection's job.
  const strip = schedule.find((d) => d.phase === 'Strip out')!;
  const payload = drawToInvoice({ quote, draw: strip });
  const skip = payload.line_items.find((l) => l.description === 'Skip hire');
  assert.ok(skip, 'the hidden line must be on the record');
  assert.equal(skip!.visible, false);
  assert.equal(skip!.amount, 900);
});

test('a visible line carries no visible flag at all', () => {
  const strip = schedule.find((d) => d.phase === 'Strip out')!;
  const payload = drawToInvoice({ quote, draw: strip });
  const labourer = payload.line_items.find((l) => l.description === 'Labourer')!;
  assert.ok(!('visible' in labourer), 'absent means shown; do not write it');
});

test('the deposit bills as one untaxed line', () => {
  const deposit = schedule.find((d) => d.type === 'deposit')!;
  const payload = drawToInvoice({ quote, draw: deposit });
  assert.equal(payload.line_items.length, 1);
  assert.equal(payload.tax_rate, 0, 'the deposit is a share of the tax-inclusive total');
  assert.equal(payload.discount_amount, 0);
  assert.equal(serverTotal(payload), deposit.amount);
});

test('the deposit already paid appears as the discount on a phase draw', () => {
  const structural = schedule.find((d) => d.phase === 'Structural')!;
  const payload = drawToInvoice({ quote, draw: structural });
  assert.ok(payload.discount_amount > 0, 'the deposit must be credited');
  assert.ok(
    Math.abs(payload.discount_amount - structural.depositCredit!) < 2,
    'the discount should be about the deposit credit',
  );
  assert.equal(payload.matchesDraw, true);
});

test('with no deposit, pennies of apportionment residue still land on the draw', () => {
  /**
   * The schedule weights a TAX-INCLUSIVE total by PRE-TAX subtotals, so a
   * phase's allocated share and what its own lines compute can differ by a
   * few cents. With a deposit the discount absorbs that. With no deposit
   * there is no discount to absorb it, so the reconciliation is allowed to
   * go slightly negative rather than leaving the invoice a nickel short of
   * the figure the customer agreed to.
   */
  const none = buildPaymentSchedule({
    phases: schedulePhasesOf(quote), total: contractTotalOf(quote), depositRate: 0,
  });
  for (const draw of none) {
    const payload = drawToInvoice({ quote, draw });
    assert.equal(serverTotal(payload), draw.amount, draw.label);
    assert.equal(payload.matchesDraw, true, draw.label);
    assert.ok(Math.abs(payload.discount_amount) <= 2, 'residue only, never a real discount');
  }
});

test('a schedule that has genuinely drifted is flagged, not silently reconciled', () => {
  // Not rounding: this phase's lines are worth far less than the draw.
  const drifted = { ...schedule.find((d) => d.phase === 'Structural')!, amount: 99999 };
  const payload = drawToInvoice({ quote, draw: drifted });
  assert.equal(payload.matchesDraw, false, 'the UI has to be able to warn');
  assert.equal(payload.discount_amount, 0, 'never invent a negative discount of thousands');
  assert.ok(payload.total_amount < 99999);
});

test('each invoice records the draw it came from', () => {
  for (const draw of schedule) {
    const payload = drawToInvoice({ quote, draw });
    assert.equal(payload.drawId, draw.id);
    assert.equal(payload.quoteId, 'q-1');
  }
});

/* ── the tax rate, stored two ways over the years ────────────────────────── */

test('a fractional tax rate is read as a fraction, not a percent', () => {
  assert.equal(normalisedTaxRate({ taxRate: 0.0875 }), 8.75);
  assert.equal(normalisedTaxRate({ taxRate: 8.75 }), 8.75);
  assert.equal(normalisedTaxRate({ taxRate: 1 }), 100);
  for (const bad of [undefined, null, {}, { taxRate: 'x' }, { taxRate: -3 }, { taxRate: 0 }]) {
    assert.equal(normalisedTaxRate(bad), 0);
  }
});

test('an explicit rate overrides the quote’s', () => {
  const structural = schedule.find((d) => d.phase === 'Structural')!;
  assert.equal(drawToInvoice({ quote, draw: structural, taxRatePercent: 0 }).tax_rate, 0);
});

/* ── rubbish ─────────────────────────────────────────────────────────────── */

test('a draw for a phase with no lines does not produce a negative invoice', () => {
  const ghost = { id: 'phase:Nope', type: 'phase' as const, phase: 'Nope', label: 'Nope', amount: 500, trigger: '', status: 'pending' as const };
  const payload = drawToInvoice({ quote, draw: ghost });
  assert.deepEqual(payload.line_items, []);
  assert.equal(payload.discount_amount, 0, 'never a negative discount, which would ADD money');
  assert.equal(serverTotal(payload), 0);
});

test('malformed input does not throw', () => {
  for (const draw of [undefined, null, {}, { phase: 'X' }, { amount: 'x' }] as any[]) {
    assert.doesNotThrow(() => drawToInvoice({ quote, draw }));
  }
  assert.doesNotThrow(() => drawToInvoice({ quote: null, draw: schedule[0] }));
});
