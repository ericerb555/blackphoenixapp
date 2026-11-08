/**
 * What a model call is recorded as costing.
 *
 * A price table is the easiest thing in a codebase to be quietly wrong
 * about: nothing throws, no test fails on its own, and the only symptom is a
 * number on a dashboard that somebody believes. This screen spent its whole
 * life showing invented figures, so the rules that turn tokens into money
 * are pinned here — particularly the two that fail silently.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  priceFor, estimateCostCents, unverifiedModels, MODEL_PRICES,
} from '../supabase/functions/server/modelPricing.ts';

/* ── the prefix trap ─────────────────────────────────────────────────────── */

test('a dated model id still matches its base price', () => {
  // Providers append date suffixes. gpt-4o-2026-01-01 is still gpt-4o.
  assert.equal(priceFor('gpt-4o-2026-01-01')?.inputPerMTok, 2.5);
  assert.equal(priceFor('claude-opus-5-20260401')?.inputPerMTok, 5);
});

test('gpt-4o-mini is NEVER priced as gpt-4o', () => {
  // The silent disaster: shortest-prefix matching would bill mini at 2.50
  // instead of 0.15 — seventeen times over, on the cheapest, highest-volume
  // model here, and nothing would look wrong.
  assert.equal(priceFor('gpt-4o-mini')?.inputPerMTok, 0.15);
  assert.equal(priceFor('gpt-4o-mini-2026-01-01')?.inputPerMTok, 0.15);
  assert.notEqual(priceFor('gpt-4o-mini')?.inputPerMTok, priceFor('gpt-4o')?.inputPerMTok);
});

test('an unknown model has no price at all', () => {
  assert.equal(priceFor('some-model-we-have-never-heard-of'), null);
  assert.equal(priceFor(''), null);
  assert.equal(priceFor(null), null);
  assert.equal(priceFor(undefined), null);
});

/* ── null is not zero ────────────────────────────────────────────────────── */

test('an unknown model costs null, not zero', () => {
  // Zero is a claim that the call was free. Null says we do not know, and
  // the column stays empty so the dashboard says "not computed".
  assert.equal(estimateCostCents('mystery-model', 1000, 1000), null);
});

test('a token-priced model with no token counts costs null', () => {
  assert.equal(estimateCostCents('gpt-4o', null, null), null);
  assert.equal(estimateCostCents('gpt-4o', undefined, undefined), null);
});

test('zero tokens is a real answer, not a missing one', () => {
  const c = estimateCostCents('gpt-4o', 0, 0);
  assert.equal(c?.cents, 0);
});

/* ── the arithmetic ──────────────────────────────────────────────────────── */

test('claude-opus-5 is priced at its published rate', () => {
  // $5/MTok in, $25/MTok out. 1M in + 1M out = $30 = 3000 cents.
  const c = estimateCostCents('claude-opus-5', 1_000_000, 1_000_000);
  assert.equal(c?.cents, 3000);
  assert.equal(c?.verified, true);
});

test('a realistic call lands on a sane figure', () => {
  // 10k in, 2k out on opus-5 = $0.05 + $0.05 = $0.10 = 10 cents.
  const c = estimateCostCents('claude-opus-5', 10_000, 2_000);
  assert.equal(c?.cents, 10);
});

test('a cheap call is recorded as cheap, not rounded to free', () => {
  // gpt-4o-mini, 1000 in / 200 out, is about 0.027 cents. Rounding that to
  // zero would make the cheap models look free and hide real volume.
  const c = estimateCostCents('gpt-4o-mini', 1000, 200);
  assert.ok(c!.cents > 0, `expected a non-zero cost, got ${c!.cents}`);
  assert.ok(c!.cents < 0.1, `expected well under a tenth of a cent, got ${c!.cents}`);
});

test('input and output are priced at different rates', () => {
  const inputOnly = estimateCostCents('claude-opus-5', 1_000_000, 0)!.cents;
  const outputOnly = estimateCostCents('claude-opus-5', 0, 1_000_000)!.cents;
  assert.equal(inputOnly, 500);
  assert.equal(outputOnly, 2500);
});

test('a partial token count still prices what is known', () => {
  // Some providers report only one side. Price that rather than give up.
  assert.equal(estimateCostCents('claude-opus-5', 1_000_000, null)?.cents, 500);
});

/* ── per-call models ─────────────────────────────────────────────────────── */

test('an image model is priced per call, with no tokens', () => {
  // gpt-image-1 bills per image. It is the reason aiSpend has a separate
  // render ceiling, so it must cost something even with no token counts.
  const c = estimateCostCents('gpt-image-1', null, null);
  assert.ok(c !== null);
  assert.ok(c!.cents > 0);
});

test('an image model ignores token counts rather than adding them', () => {
  const bare = estimateCostCents('gpt-image-1', null, null)!.cents;
  const withTokens = estimateCostCents('gpt-image-1', 5000, 5000)!.cents;
  assert.equal(bare, withTokens);
});

/* ── provenance ──────────────────────────────────────────────────────────── */

test('every Anthropic rate is marked verified and dated', () => {
  for (const [id, price] of Object.entries(MODEL_PRICES)) {
    if (!id.startsWith('claude-')) continue;
    assert.equal(price.verified, true, `${id} should be verified`);
    assert.match(price.asOf, /^\d{4}-\d{2}-\d{2}$/, `${id} needs a real asOf date`);
  }
});

test('the OpenAI rates are honestly flagged as unchecked', () => {
  // They are in the table because most calls here are OpenAI and a cost
  // report covering none of them is useless. They are flagged because
  // presenting a recalled number as a verified one is how this dashboard
  // got its reputation.
  const unverified = unverifiedModels();
  assert.ok(unverified.includes('gpt-4o'));
  assert.ok(unverified.includes('gpt-4o-mini'));
  for (const id of unverified) {
    assert.equal(MODEL_PRICES[id].verified, false);
  }
});

test('an estimate reports whether its rate was checked', () => {
  assert.equal(estimateCostCents('claude-opus-5', 100, 100)?.verified, true);
  assert.equal(estimateCostCents('gpt-4o', 100, 100)?.verified, false);
});

test('every price has a source that says where it came from', () => {
  for (const [id, price] of Object.entries(MODEL_PRICES)) {
    assert.ok(price.source && price.source.length > 10, `${id} needs a source`);
  }
});
