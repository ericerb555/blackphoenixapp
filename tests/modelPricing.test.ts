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
  priceFor, estimateCostCents, estimateTtsCostCents, unverifiedModels, MODEL_PRICES,
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

test('the OpenAI text rates were checked and are marked so', () => {
  // Read off OpenAI's published table on 2026-11-08. All three matched what
  // had been here from recall — which validates those three and nothing else.
  for (const id of ['gpt-4o', 'gpt-4o-mini', 'gpt-4.1-mini']) {
    assert.equal(MODEL_PRICES[id].verified, true, `${id} should be verified`);
    assert.match(MODEL_PRICES[id].source, /developers\.openai\.com/);
  }
  assert.equal(MODEL_PRICES['gpt-4o'].inputPerMTok, 2.5);
  assert.equal(MODEL_PRICES['gpt-4o'].outputPerMTok, 10);
  assert.equal(MODEL_PRICES['gpt-4o-mini'].inputPerMTok, 0.15);
  assert.equal(MODEL_PRICES['gpt-4.1-mini'].outputPerMTok, 1.6);
});

test('the two models OpenAI no longer lists stay unverified', () => {
  // gpt-image-1 and dall-e-3 are what this server actually asks for, and
  // neither is on OpenAI's pricing page any more. Marking them verified
  // would put a confident figure on a rate that no longer exists.
  const unverified = unverifiedModels();
  assert.deepEqual(unverified, ['dall-e-3', 'gpt-image-1']);
  for (const id of unverified) {
    assert.equal(MODEL_PRICES[id].verified, false);
    assert.match(MODEL_PRICES[id].source, /NOT on OpenAI's pricing page/);
  }
});

test('the current image models are priced per token, not per image', () => {
  // The structure changed. Anything still carrying perCall is a legacy rate.
  const current = MODEL_PRICES['gpt-image-1-mini'];
  assert.equal(current.verified, true);
  assert.equal(current.perCall, undefined);
  assert.ok(current.outputPerMTok > 0);
});

test('an estimate reports whether its rate was checked', () => {
  assert.equal(estimateCostCents('claude-opus-5', 100, 100)?.verified, true);
  assert.equal(estimateCostCents('gpt-4o', 100, 100)?.verified, true);
  assert.equal(estimateCostCents('gpt-image-1', null, null)?.verified, false);
});

test('every price has a source that says where it came from', () => {
  for (const [id, price] of Object.entries(MODEL_PRICES)) {
    assert.ok(price.source && price.source.length > 10, `${id} needs a source`);
  }
});

/* ── speech, which bills per character ───────────────────────────────── */

test('a spoken line is priced per character, not per token', () => {
  // The mistake this guards: routing characters through the token path. At
  // $15 per million characters versus a token rate the two differ by about
  // four times, and nothing would fail — the dashboard would just be wrong.
  const c = estimateTtsCostCents('tts-1', 1_000_000);
  assert.ok(c);
  assert.equal(c!.cents, 1500);                 // $15.00
  assert.equal(c!.verified, true);
  assert.equal(estimateTtsCostCents('tts-1-hd', 1_000_000)!.cents, 3000);
});

test('a short line costs a fraction of a cent and does not round to zero', () => {
  // 200 characters is a typical spoken answer. Rounding it away would have
  // the ledger report the voice as free, which is the one claim this module
  // exists to avoid making.
  const c = estimateTtsCostCents('tts-1', 200);
  assert.ok(c!.cents > 0, 'a real cost must not round away');
  assert.equal(c!.cents, 0.3);
});

test('speech pricing refuses a model with no character rate', () => {
  // gpt-4o-mini-tts is deliberately absent: the pricing page showed $12.00
  // for its audio output without naming the unit, and a guessed unit would
  // look exactly as authoritative on the dashboard as a verified one.
  assert.equal(estimateTtsCostCents('gpt-4o-mini-tts', 500), null);
  assert.equal(estimateTtsCostCents('gpt-4o', 500), null, 'a text model has no character rate');
  assert.equal(estimateTtsCostCents('made-up', 500), null);
});

test('an unknown character count is null, never zero', () => {
  for (const bad of [null, undefined, NaN, -1, 'lots']) {
    assert.equal(estimateTtsCostCents('tts-1', bad as any), null, String(bad));
  }
  // Zero characters genuinely is free, and that is a different answer.
  assert.equal(estimateTtsCostCents('tts-1', 0)!.cents, 0);
});

test('the token estimator never reports a speech model as free', () => {
  // tts-1 carries inputPerMTok 0, so the token path would return exactly
  // 0.0000 for a call that cost real money. Either it declines, or it
  // returns zero only because zero tokens were passed — never a confident
  // free verdict on real characters.
  const viaTokens = estimateCostCents('tts-1', 500, 0);
  assert.ok(viaTokens === null || viaTokens.cents === 0,
    'if this ever returns a non-zero token price the two paths have crossed');
});

test('every speech price carries its provenance', () => {
  for (const id of ['tts-1', 'tts-1-hd']) {
    const p = MODEL_PRICES[id];
    assert.ok(p.perMChar! > 0, `${id} needs a character rate`);
    assert.match(p.source, /openai/i, `${id} must say where the number came from`);
    assert.match(p.asOf, /^\d{4}-\d{2}-\d{2}$/, `${id} must say when`);
  }
});
