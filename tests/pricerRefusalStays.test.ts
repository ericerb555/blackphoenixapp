/**
 * The reason a price did not come back stays on the page.
 *
 * The refusals this route gives are not errors in the usual sense. The daily
 * one, from `anonPricer.ts`, reads:
 *
 *     That is 3 free prices today. Create a free account to keep pricing
 *     jobs — and take 5% off the one you book.
 *
 * That is an OFFER. It was being shown in a `toast.error` with no duration,
 * so it appeared for a few seconds and left somebody looking at a form that
 * had apparently done nothing — which is how I read it myself, arriving at
 * the page three minutes after hitting the cap and reporting that the pricer
 * said nothing at all. It had; I was late.
 *
 * A toast is right for "try again in a moment". It is wrong for the one
 * message on this page that asks for the sale.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { mayPriceAnonymously, ANON_PER_IP_DAILY, ANON_GLOBAL_DAILY } from '../supabase/functions/server/anonPricer.ts';

const panel = readFileSync(
  join(import.meta.dirname, '..', 'src/app/components/portals/TrashEstimatePanel.tsx'), 'utf8',
);
const code = panel
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
  .replace(/^\s*\/\/.*$/gm, '');

/* ── the refusal is kept, not just flashed ──────────────────────────────── */

test('a refusal is held on the page as well as toasted', () => {
  assert.match(code, /const \[refusal, setRefusal\]/, 'the refusal is no longer kept');
  assert.match(code, /setRefusal\(why\)/, 'the reason is not stored when pricing fails');
  assert.match(code, /\{refusal && \(/, 'nothing renders it, so it is invisible again');
});

/**
 * And it is cleared before the next attempt.
 *
 * A reason that outlives its cause is worse than none: somebody fixes the
 * thing, presses the button, and reads a stale explanation for a different
 * failure.
 */
test('the reason is cleared when they try again', () => {
  const submit = code.slice(code.indexOf('setBusy(true)'));
  assert.match(
    submit.slice(0, 200), /setRefusal\(null\)/,
    'a stale refusal survives into the next attempt',
  );
});

/* ── the cap message is an offer, and offers get a button ───────────────── */

test('the daily cap says what it is and what to do about it', () => {
  const decision = mayPriceAnonymously(ANON_PER_IP_DAILY, 0);
  assert.equal(decision.allowed, false);
  assert.equal(decision.reason, 'per-ip');
  assert.match(decision.message || '', /free account/i, 'the refusal stopped asking for the sale');
  assert.match(decision.message || '', /5%/, 'the discount is no longer mentioned');
});

test('one under the cap is still allowed', () => {
  assert.equal(mayPriceAnonymously(ANON_PER_IP_DAILY - 1, 0).allowed, true);
});

test('the global ceiling refuses before the per-address one', () => {
  const decision = mayPriceAnonymously(0, ANON_GLOBAL_DAILY);
  assert.equal(decision.allowed, false);
  assert.equal(decision.reason, 'global');
  assert.doesNotMatch(
    decision.message || '', /5%/,
    'a visitor refused because WE are busy should not be sold to as though they '
    + 'had used up an allowance',
  );
});

/**
 * The page offers the account when the refusal is about having one.
 *
 * Keyed on the message rather than on a code, because the server owns the
 * wording and the page should follow it rather than keep a second copy of
 * which refusals mean what.
 */
test('the account button appears for the refusal that asks for an account', () => {
  assert.match(code, /\/account\/i\.test\(refusal\)/, 'the offer no longer gets a button');
  assert.match(code, /onNavigate\('signup'\)/, 'the button goes nowhere');

  /* The two messages this keys on, so the coupling is visible from here. */
  assert.match(mayPriceAnonymously(ANON_PER_IP_DAILY, 0).message || '', /account/i);
  assert.match(mayPriceAnonymously(0, ANON_GLOBAL_DAILY).message || '', /account/i);
});
