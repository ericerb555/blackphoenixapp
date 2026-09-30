/**
 * Whether a blueprint quote charges the company's own rates.
 *
 * It did not. The route read `labor_rates_config` and `profit_settings`, two
 * keys that have never existed, so it used the figures typed into its own file
 * and marked materials up by zero.
 *
 * The test that matters most is the second group: pointing it at the right key
 * would NOT have been enough, because the route looks rates up by ROLE and the
 * rate card is keyed by TRADE. Every lookup would still have missed, and the
 * bug would have looked fixed.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rateForRole, blueprintPricing, ROLE_TRADES } from '../supabase/functions/server/blueprintRates.ts';

/* Eric's real saved card, in the shape the store holds it. */
const HIS_CARD = {
  laborRates: [
    { id: 'carpentry', category: 'Carpentry', hourlyRate: 70, visible: true },
    { id: 'electrical', category: 'Electrical', hourlyRate: 100, visible: true },
    { id: 'plumbing', category: 'Plumbing', hourlyRate: 105, visible: true },
    { id: 'painting', category: 'Painting', hourlyRate: 50, visible: true },
    { id: 'laboring', category: 'General Labor', hourlyRate: 45, visible: true },
  ],
  profitSettings: { materialsMarkup: 20, laborMarkup: 15 },
};

/* ── the fix ─────────────────────────────────────────────────────────────── */

test("the company's own rate is used, not the figure typed into the route", () => {
  const { rates, usingStandards } = blueprintPricing(HIS_CARD);
  const r = rateForRole('Lead Carpenter', rates, usingStandards, 65);
  assert.equal(r.hourlyRate, 70, 'his carpentry rate, not the typed 65');
  assert.equal(r.source, 'your-rate');
});

test('every mapped role reaches its trade', () => {
  const { rates, usingStandards } = blueprintPricing(HIS_CARD);
  const expected: Record<string, number> = {
    'Lead Carpenter': 70, 'Carpenter': 70, 'Electrician': 100,
    'Plumber': 105, 'Painter': 50, 'General Labor': 45,
  };
  for (const [role, rate] of Object.entries(expected)) {
    assert.equal(rateForRole(role, rates, usingStandards, 1).hourlyRate, rate, role);
  }
});

test('the markups come from the same record, so materials stop marking up by zero', () => {
  assert.equal(blueprintPricing(HIS_CARD).profitSettings.materialsMarkup, 20);
  assert.equal(blueprintPricing(null).profitSettings, null, 'nothing saved is honestly nothing');
});

/* ── why the key change alone would not have worked ──────────────────────── */

test('a role name is not a trade id, which is what made the key look right', () => {
  // The rate card has no entry called "Lead Carpenter" — this is the lookup the
  // route was doing, and it is why it always fell through to the typed figure.
  assert.equal(HIS_CARD.laborRates.some((r) => (r as any).name === 'Lead Carpenter'), false);
  assert.equal(ROLE_TRADES['Lead Carpenter'], 'carpentry');
});

test('a role with no trade on the card keeps its typed figure and says so', () => {
  const { rates, usingStandards } = blueprintPricing(HIS_CARD);
  const r = rateForRole('Project Manager', rates, usingStandards, 85);
  assert.equal(r.hourlyRate, 85);
  assert.equal(r.source, 'typed', 'there is no project management line on the rate card');
  assert.equal(r.tradeId, null);
});

test('a role nobody mapped falls back rather than throwing', () => {
  const { rates, usingStandards } = blueprintPricing(HIS_CARD);
  const r = rateForRole('Falconer', rates, usingStandards, 42);
  assert.equal(r.hourlyRate, 42);
  assert.equal(r.source, 'typed');
});

/* ── provenance, because a blueprint quote is checked by hand ────────────── */

test('a standard rate is labelled standard, not as the company figure', () => {
  const { rates, usingStandards } = blueprintPricing({});
  assert.equal(usingStandards, true, 'nothing saved');
  const r = rateForRole('Lead Carpenter', rates, usingStandards, 65);
  assert.equal(r.source, 'standard');
  assert.ok(r.hourlyRate > 0, 'the standards are a real defensible number');
});

test('a trade hidden from quotes is not quietly used anyway', () => {
  const hidden = {
    laborRates: [{ id: 'painting', category: 'Painting', hourlyRate: 50, visible: false }],
  };
  const { rates, usingStandards } = blueprintPricing(hidden);
  const r = rateForRole('Painter', rates, usingStandards, 50);
  assert.equal(r.source, 'typed', 'the toggle says hide from quotes, so honour it');
});

test('a zero or missing rate on the card falls back instead of quoting nothing', () => {
  const broken = { laborRates: [{ id: 'carpentry', category: 'Carpentry', hourlyRate: 0 }] };
  const { rates, usingStandards } = blueprintPricing(broken);
  const r = rateForRole('Lead Carpenter', rates, usingStandards, 65);
  assert.ok(r.hourlyRate > 0, 'a zero rate is how labour silently becomes free');
});
