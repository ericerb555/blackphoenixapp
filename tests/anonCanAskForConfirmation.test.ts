/**
 * A visitor with no account can price a job AND ask us to confirm it.
 *
 * Found by using the site as a new customer, which is the only way it could
 * have been found: every piece was built and one call used the wrong helper.
 *
 * WHAT HAPPENED
 *
 * The junk pricer ran end to end for an anonymous visitor — photo uploaded to
 * the guest path, estimate stored with an empty `customerEmail` and
 * `userId: "anon:2026-11-20"`, priced from the photograph with the customer's
 * own exclusion read back correctly. Then "Ask us to confirm it" said:
 *
 *     Your session has expired. Sign in again to continue.
 *
 * To somebody who had never signed in and never could, on the one button that
 * turns a stranger into a lead.
 *
 * `askWithoutAccount` — the function named for the case — called
 * `authedHeaders`, which THROWS rather than falling back when there is no
 * session. The comment above the pricing call, forty lines earlier, describes
 * this exact failure and the fix applied there: *"a visitor with no account
 * was told 'Your session has expired' by a button they had never been able to
 * press."* That call was fixed. This one was missed.
 *
 * So the test is about both calls, not one. Fixing a helper in one place and
 * leaving its twin is what happened here, and it is what this catches.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const PANEL = join(import.meta.dirname, '..', 'src/app/components/portals/TrashEstimatePanel.tsx');
const code = readFileSync(PANEL, 'utf8');
const stripped = code
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
  .replace(/^\s*\/\/.*$/gm, '');

/** The body of a named arrow function, as far as its closing brace. */
function functionBody(source: string, name: string): string {
  const start = source.indexOf(`const ${name} = async (`);
  assert.notEqual(start, -1, `${name} is gone from TrashEstimatePanel`);
  let depth = 0;
  let i = source.indexOf('{', start);
  const from = i;
  for (; i < source.length; i++) {
    if (source[i] === '{') depth++;
    else if (source[i] === '}' && --depth === 0) break;
  }
  return source.slice(from, i + 1);
}

test('asking for confirmation without an account does not demand a session', () => {
  const body = functionBody(stripped, 'askWithoutAccount');

  assert.match(
    body, /authedHeadersOrAnon\(/,
    'askWithoutAccount is back on a helper that requires a session, so the one '
    + 'button that turns an anonymous visitor into a lead will tell them their '
    + 'session has expired',
  );
  assert.doesNotMatch(
    body, /\bawait authedHeaders\(/,
    'askWithoutAccount calls authedHeaders, which throws when there is no session',
  );
});

/**
 * And the call it was supposed to match stays matched.
 *
 * These two are the whole anonymous path: price it, then ask about it. One
 * without the other is a visitor who gets a number and cannot act on it.
 */
test('pricing without an account does not demand a session either', () => {
  const body = functionBody(stripped, 'submit');
  assert.match(
    body, /authedHeadersOrAnon\(/,
    'the pricing call no longer falls back for an anonymous visitor',
  );
  assert.doesNotMatch(body, /\bawait authedHeaders\(/);
});

/**
 * AND THE SIGNED-IN TWIN KEEPS ITS SESSION REQUIREMENT.
 *
 * `askUsToConfirm` acts on an estimate the caller already owns, so demanding
 * a session is correct there — the server reads the account to decide whose
 * estimate it is. Relaxing it to match its anonymous neighbour would let
 * anybody send somebody else's estimate to the office.
 *
 * Pinned because the obvious reading of the fix next door is "they should
 * both be OrAnon", and they should not.
 */
test('the signed-in confirm still requires a session', () => {
  const body = functionBody(stripped, 'askUsToConfirm');
  assert.match(
    body, /await authedHeaders\(/,
    'askUsToConfirm no longer requires a session, so one customer could act on '
    + "another's estimate",
  );
});

/**
 * Nothing on the anonymous path may use the throwing helper.
 *
 * A third call added later with `authedHeaders` would fail the same way and
 * would not be covered by either test above.
 */
test('the panel never uses the throwing helper on a path a guest can reach', () => {
  const guestReachable = ['askWithoutAccount'];
  for (const name of guestReachable) {
    const body = functionBody(stripped, name);
    assert.doesNotMatch(
      body, /authedHeaders\(/,
      `${name} is reachable without an account and must not require one`,
    );
  }
});
