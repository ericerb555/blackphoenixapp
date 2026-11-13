/**
 * What a callout costs, as lines on an invoice a customer reads.
 *
 * Two kinds of mistake, and the quiet one is worse. Charging the wrong amount
 * gets spotted and argued about. Charging the right amount in a form nobody
 * can check — a labour line with the hours multiplied away, a minimum-hours
 * charge with nothing saying it was a minimum — produces an invoice that is
 * correct and still ends in a phone call, because the customer cannot see how
 * it was reached.
 *
 * So the arithmetic is asserted, and so is the shape it is presented in.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  callChargeLines, billedHoursFor, minimumHoursNote,
} from '../supabase/functions/server/onCallCharges.ts';
import { emptyConfig, normalizeConfig } from '../supabase/functions/server/onCallConfig.ts';

/** An account that charges $150 callout, $75 out of hours, $95/hr, 2hr minimum. */
const account = () => normalizeConfig({
  enabled: true,
  extras: {
    calloutCents: 15000, afterHoursCents: 7500, hourlyCents: 9500, minimumHours: 2,
  },
}, { email: 'eric@example.com', audience: 'construction' });

/* ── the arithmetic ──────────────────────────────────────────────────────── */

test('a daytime callout bills the callout and the minimum hours', () => {
  const out = callChargeLines(account(), { work: { hours: 0.5 } });
  assert.deepEqual(out.lines.map((l) => [l.description, l.quantity, l.unit_price, l.amount]), [
    ['Emergency callout', 1, 150, 150],
    ['Labour', 2, 95, 190],          // 0.5 worked, 2 minimum
  ]);
  assert.equal(out.totalCents, 34000);
});

test('out of hours is ADDED to the callout, never swapped for it', () => {
  // Turning out at 2am is the callout plus the inconvenience.
  const out = callChargeLines(account(), { work: { hours: 1, afterHours: true } });
  const descriptions = out.lines.map((l) => l.description);
  assert.ok(descriptions.includes('Emergency callout'));
  assert.ok(descriptions.includes('Out of hours'));
  assert.equal(out.totalCents, 15000 + 7500 + 19000);
});

test('hours above the minimum are billed as worked', () => {
  const out = callChargeLines(account(), { work: { hours: 3.5 } });
  const labour = out.lines.find((l) => l.description.startsWith('Labour'))!;
  assert.equal(labour.quantity, 3.5);
  assert.equal(labour.amount, 332.5);
});

test('the labour line keeps the rate and the hours apart', () => {
  // "Labour 2 hrs @ $95" can be checked by the person paying it.
  // "Labour — 2 hours ... $190" cannot, and that is what routing produces.
  const labour = callChargeLines(account(), { work: { hours: 2 } })
    .lines.find((l) => l.description.startsWith('Labour'))!;
  assert.equal(labour.quantity, 2);
  assert.equal(labour.unit_price, 95);
  assert.equal(labour.amount, 190);
});

test('the work done appears on the labour line when it is given', () => {
  const out = callChargeLines(account(), {
    work: { hours: 1, workDescription: 'Cleared blocked soil stack' },
  });
  assert.ok(out.lines.some((l) => l.description.includes('Cleared blocked soil stack')));
});

/* ── charging nothing is a real configuration ────────────────────────────── */

test('an account that charges nothing produces NO lines, not zero ones', () => {
  // Plenty of accounts fold the callout into the job. A $0.00 row on an
  // invoice reads as a mistake and generates the call it was meant to avoid.
  const free = normalizeConfig({
    enabled: true,
    extras: { calloutCents: 0, afterHoursCents: 0, hourlyCents: 0, minimumHours: 0 },
  }, { email: 'e@x.com', audience: 'construction' });
  const out = callChargeLines(free, { work: { hours: 3 } });
  assert.deepEqual(out.lines, []);
  assert.equal(out.totalCents, 0);
});

test('a rate of zero drops only its own line', () => {
  const noCallout = normalizeConfig({
    enabled: true,
    extras: { calloutCents: 0, afterHoursCents: 0, hourlyCents: 9500, minimumHours: 1 },
  }, { email: 'e@x.com', audience: 'construction' });
  const out = callChargeLines(noCallout, { work: { hours: 2 } });
  assert.deepEqual(out.lines.map((l) => l.description), ['Labour']);
});

/* ── line numbers, because these land on an invoice that has lines ───────── */

test('lines continue from where an invoice already got to', () => {
  const out = callChargeLines(account(), { work: { hours: 1 }, startLineNumber: 4 });
  assert.deepEqual(out.lines.map((l) => l.line_number), [4, 5]);
});

test('a missing or silly start number falls back to one', () => {
  for (const bad of [undefined, 0, -3, Number.NaN, 'x' as unknown as number]) {
    const out = callChargeLines(account(), { work: { hours: 1 }, startLineNumber: bad });
    assert.equal(out.lines[0].line_number, 1, String(bad));
  }
});

/* ── the minimum, and saying so ──────────────────────────────────────────── */

test('billedHoursFor raises to the minimum and never lowers below worked', () => {
  const rates = { calloutCents: 0, afterHoursCents: 0, hourlyCents: 0, minimumHours: 2 };
  assert.equal(billedHoursFor(rates, 0.25), 2);
  assert.equal(billedHoursFor(rates, 5), 5);
  assert.equal(billedHoursFor(rates, undefined), 2);
  assert.equal(billedHoursFor(null, 3), 3);
});

test('the minimum is explained on the invoice only when it actually applied', () => {
  const rates = { calloutCents: 0, afterHoursCents: 0, hourlyCents: 0, minimumHours: 2 };
  assert.match(String(minimumHoursNote(rates, { hours: 0.5 })), /2-hour minimum/);
  assert.equal(minimumHoursNote(rates, { hours: 3 }), null);
  assert.equal(minimumHoursNote({ ...rates, minimumHours: 0 }, { hours: 0.1 }), null);
});

/* ── whose rates ─────────────────────────────────────────────────────────── */

test('when Black Phoenix answers, our rates apply and the record says so', () => {
  const platform = {
    calloutCents: 25000, afterHoursCents: 10000, hourlyCents: 12500, minimumHours: 1,
  };
  const out = callChargeLines(account(), {
    weAnswer: true, platform, work: { hours: 1 },
  });
  assert.equal(out.chargedBy, 'platform');
  assert.equal(out.lines[0].unit_price, 250);
});

test('without our rates loaded, the account keeps its own', () => {
  // `ratesFor` requires the platform rates to be present before they are used;
  // "we answer" with nothing configured must not silently bill zero.
  const out = callChargeLines(account(), { weAnswer: true, platform: null, work: { hours: 1 } });
  assert.equal(out.chargedBy, 'account');
  assert.equal(out.lines[0].unit_price, 150);
});

test('an empty config charges nothing rather than throwing', () => {
  const out = callChargeLines(emptyConfig('e@x.com', 'construction'), { work: { hours: 2 } });
  assert.equal(out.totalCents, 0);
});
