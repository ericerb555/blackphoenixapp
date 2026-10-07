/**
 * The money ceiling on a fulfilment sweep.
 *
 * WHY THESE ASSERTIONS
 *
 * This is the guard on the only autonomous job that spends real money, and it
 * exists because the previous guard did not: `maxSpendPerTick` was declared,
 * validated, reported under `ceilings`, handed to every job — and read by none
 * of them. A ceiling nobody enforces is worse than no ceiling, because somebody
 * sets it and believes it.
 *
 * So the cases pinned here are the ones that let money through while reporting
 * that they did not:
 *
 *   - an unknown supplier cost counted as zero, so every unpriced line is free;
 *   - the first order waved past because nothing has been spent yet;
 *   - revenue counted instead of cost, which stops a sweep at half its budget;
 *   - a ceiling of zero read as "spend nothing" when it means "no ceiling".
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { orderSpend, maySpend, type SpendLine, type SupplierCost } from '../supabase/functions/server/storeSpendGuard.ts';

const costs = (map: Record<string, SupplierCost>) => map;
const line = (sku: string, quantity = 1, price = 0): SpendLine => ({ sku, quantity, price });

// ─── What an order commits ──────────────────────────────────────────────────

test('our cost is what counts, not what the customer paid', () => {
  // The two differ by the whole margin. Counting revenue would stop a sweep at
  // roughly half the money it was told it could spend.
  const spend = orderSpend(
    [line('A', 2, 49.99)],
    costs({ A: { cost: 11, shippingCost: 4 } }),
  );
  assert.equal(spend.dollars, 26, '2 x $11 plus $4 shipping');
  assert.equal(spend.estimatedLines, 0);
});

test('shipping is added once per line, not once per unit', () => {
  const one = orderSpend([line('A', 1)], costs({ A: { cost: 10, shippingCost: 5 } }));
  const ten = orderSpend([line('A', 10)], costs({ A: { cost: 10, shippingCost: 5 } }));
  assert.equal(one.dollars, 15);
  assert.equal(ten.dollars, 105, 'ten units, one shipping charge');
});

test('an unknown cost falls back to the sale price rather than to zero', () => {
  // The failure this is written against: an unpriced line treated as free is
  // how a sweep spends past a limit while reporting it stayed inside one.
  const spend = orderSpend([line('MYSTERY', 3, 20)], costs({}));
  assert.equal(spend.dollars, 60);
  assert.equal(spend.estimatedLines, 1, 'the caller must be able to say this was estimated');
});

test('the fallback OVER-states what we pay, so the ceiling binds sooner', () => {
  // Deliberately the wrong direction to be wrong in — for a spend guard,
  // stopping early beats spending past.
  const known = orderSpend([line('A', 1, 50)], costs({ A: { cost: 12 } }));
  const unknown = orderSpend([line('A', 1, 50)], costs({}));
  assert.ok(unknown.dollars > known.dollars);
});

test('a missing quantity is one, not zero', () => {
  // Zero would make the whole line free.
  for (const bad of [undefined, 0, -4, Number.NaN] as any[]) {
    const spend = orderSpend([{ sku: 'A', quantity: bad, price: 10 }], costs({}));
    assert.equal(spend.dollars, 10, String(bad));
  }
});

test('an order with no lines commits nothing', () => {
  assert.equal(orderSpend([], costs({})).dollars, 0);
  assert.equal(orderSpend(null as any, costs({})).dollars, 0);
});

// ─── Whether the sweep may commit it ────────────────────────────────────────

test('a sweep stops before passing the ceiling, not after', () => {
  const first = maySpend(0, 800, 2000);
  assert.equal(first.allowed, true);
  assert.equal(first.spentAfter, 800);

  const second = maySpend(800, 900, 2000);
  assert.equal(second.allowed, true);
  assert.equal(second.spentAfter, 1700);

  const third = maySpend(1700, 500, 2000);
  assert.equal(third.allowed, false, '1700 + 500 passes 2000');
  assert.equal(third.spentAfter, 1700, 'a refused order does not move the total');
  assert.match(third.reason || '', /\$1700\.00 already committed/);
});

test('landing exactly on the ceiling is allowed', () => {
  const exact = maySpend(1500, 500, 2000);
  assert.equal(exact.allowed, true);
  assert.equal(exact.spentAfter, 2000);
  // And one cent more is not.
  assert.equal(maySpend(1500, 500.01, 2000).allowed, false);
});

test('an order bigger than the whole ceiling is refused, not waved through', () => {
  // The tempting special case: nothing spent yet, so let the first one past.
  // That is exactly how a $5,000 order passes a $2,000 ceiling.
  const huge = maySpend(0, 5000, 2000);
  assert.equal(huge.allowed, false);
  assert.match(huge.reason || '', /more than the whole tick/);
  assert.match(huge.reason || '', /needs a person/);
});

test('a ceiling of zero means no ceiling, not spend nothing', () => {
  // normaliseSettings substitutes the default for an unset figure rather than
  // zero, so a zero arriving here is a caller that meant unlimited. Reading it
  // as "spend nothing" would stop fulfilment dead and look like a bug in CJ.
  for (const cap of [0, -1, Number.NaN, undefined] as any[]) {
    const verdict = maySpend(0, 9999, cap);
    assert.equal(verdict.allowed, true, String(cap));
  }
});

test('a nonsense running total cannot unlock extra budget', () => {
  // A negative "already spent" would otherwise buy headroom.
  for (const spent of [-5000, Number.NaN] as any[]) {
    const verdict = maySpend(spent, 1500, 2000);
    assert.equal(verdict.allowed, true);
    assert.equal(verdict.spentAfter, 1500, 'the total starts from zero, not from a negative');
  }
});

test('the default ceiling allows a realistic sweep but not a runaway one', () => {
  // $2,000 a tick, every fifteen minutes. The point of the figure is that it
  // bounds a bad night rather than a single order.
  const CAP = 2000;
  let spent = 0;
  let placed = 0;
  for (let i = 0; i < 100; i++) {
    const verdict = maySpend(spent, 45, CAP);
    if (!verdict.allowed) break;
    spent = verdict.spentAfter;
    placed += 1;
  }
  assert.equal(placed, 44, '44 x $45 = $1,980; the 45th would pass $2,000');
  assert.ok(spent <= CAP);
});
