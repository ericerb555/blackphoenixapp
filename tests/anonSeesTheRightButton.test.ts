/**
 * An anonymous visitor gets the button they can actually press.
 *
 * Found by running the junk pricer as a new customer, twice, and being told
 * both times:
 *
 *     Your session has expired. Sign in again to continue.
 *
 * THE INFERENCE THAT WAS ALMOST RIGHT
 *
 * The page chose between two confirm buttons on `estimate.signupOffer`,
 * reasoning that the 5%-off offer exists only for somebody without an
 * account — so its presence means "no account", and its absence means
 * "customer".
 *
 * Half true. `signupOfferFor` returns null for THREE reasons:
 *
 *   hasAccount        correct, and the one the page assumed
 *   needsSiteVisit    nothing firm to take 5% off
 *   band not finite   same
 *
 * So an anonymous visitor whose job needed a site visit was indistinguishable
 * from a signed-in customer, and was shown the signed-in button: one that
 * throws for want of a session, and past that scopes to `customerEmail` and
 * answers "No such estimate".
 *
 * That is the worst audience to lose. A job uncertain enough to need a visit
 * is the one most worth a phone call, and the visitor could not leave a name.
 * Reproduced on a garage clear-out priced at $636–$1,642, where the estimator
 * asked for a visit over suspected asbestos and 7 cu yd it could not see.
 *
 * The server now says `anonymous` outright. One fact, one field.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = join(import.meta.dirname, '..');
const read = (p: string) => readFileSync(join(root, p), 'utf8');
const strip = (code: string) => code
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
  .replace(/^\s*\/\/.*$/gm, '');

import { signupOfferFor } from '../supabase/functions/server/signupIncentive.ts';

/* ── the inference that failed, pinned as a fact about the helper ───────── */

/**
 * This is the whole bug in four assertions: `signupOffer` is null in cases
 * that have nothing to do with having an account.
 */
test('a null signup offer does not mean the caller has an account', () => {
  const band = { low: 636, likely: 1139, high: 1642 };

  assert.notEqual(
    signupOfferFor(band, { hasAccount: false }), null,
    'an anonymous caller with a firm price is offered the discount',
  );
  assert.equal(
    signupOfferFor(band, { hasAccount: true }), null,
    'a customer is not',
  );
  assert.equal(
    signupOfferFor(band, { hasAccount: false, needsSiteVisit: true }), null,
    'and NEITHER IS AN ANONYMOUS CALLER WHOSE JOB NEEDS A VISIT — which is '
    + 'why the page could not tell the two apart',
  );
  assert.equal(
    signupOfferFor(null, { hasAccount: false }), null,
    'nor one without a finite band',
  );
});

/* ── so the page asks the server directly ───────────────────────────────── */

test('the page branches on `anonymous`, not on the discount', () => {
  const code = strip(read('src/app/components/portals/TrashEstimatePanel.tsx'));

  assert.match(
    code, /estimate\.anonymous \|\| estimate\.signupOffer \|\| linkToken \?/,
    'the confirm button is chosen without asking whether the caller had an '
    + 'account, so an anonymous visitor needing a site visit gets the button '
    + 'that demands a session',
  );
});

/**
 * `signupOffer` stays in the test deliberately.
 *
 * Estimates stored before the server sent `anonymous` have no such field, and
 * they must still show their owner the button that works.
 */
test('older stored estimates still fall back to the offer', () => {
  const code = strip(read('src/app/components/portals/TrashEstimatePanel.tsx'));
  assert.match(code, /estimate\.signupOffer \|\| linkToken/);
});

test('the server states it rather than leaving it to be inferred', () => {
  const code = strip(read('supabase/functions/server/trash-estimator.tsx'));
  assert.match(
    code, /anonymous: !actor/,
    'the estimate no longer carries whether its caller had an account',
  );
  /*
   * `actor`, not `user`. A link visitor's `user` is the synthetic principal
   * that pays for the call and is always truthy — keying on it is the mistake
   * `signupIncentive.ts` records having made once already.
   */
  assert.doesNotMatch(code, /anonymous: !user\b/);
});
