/**
 * A token in the path does not make a public page private.
 *
 * MEASURED ON PRODUCTION, SIGNED OUT:
 *
 *     /junk-quote/sometesttoken   →   /login   "Welcome Back"
 *
 * That is the link Eric texts to somebody standing in front of a pile of
 * junk. It landed on a sign-in form — the precise outcome `junkLinks.ts` was
 * written to avoid, and the one the note beside `PREFIX_ROUTES` says is
 * handled.
 *
 * THE CAUSE
 *
 * `ProtectedRoutes` reads `currentPath` as the WHOLE path after the leading
 * slash — `junk-quote/abc123` — and tested it against `publicRoutes` with an
 * exact `includes`. That list holds page NAMES, so no path carrying a token
 * ever matched, and every prefix route bounced a visitor with no account:
 * the texted pricing link, an architect's framing submittal, a product page
 * a search engine had indexed, and the estimate portal added today.
 *
 * It went unnoticed because signed-in staff match nothing in this branch at
 * all — `isAuthenticated` short-circuits it — so the people most likely to
 * click one of these links were the only people it worked for.
 *
 * WHY THIS TEST DOES THE RESOLUTION RATHER THAN GREPPING
 *
 * The first version of my portal test asserted that `'my-estimate'` appeared
 * in App.tsx. It did appear. The page still redirected to login, because the
 * question was never whether the string was present — it was what the guard
 * computes for a path with a token on the end. So this reimplements that
 * decision and checks the answer.
 *
 * AND THAT REIMPLEMENTATION CANNOT CATCH A REGRESSION ON ITS OWN. It is a
 * copy of the rule, so reverting the guard leaves these four cases passing
 * against the copy. Checked by reverting it: only the last test here failed.
 * So the division of labour is explicit — the cases below document what the
 * answers must be, and the final test is what notices if the source stops
 * computing them that way. Neither is sufficient alone.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const app = readFileSync(join(import.meta.dirname, '..', 'src/app/App.tsx'), 'utf8');

/** The prefix routes, read from the source so the test cannot drift from it. */
function prefixRoutes(): Set<string> {
  const m = app.match(/const PREFIX_ROUTES = new Set<string>\(\[([^\]]*)\]\)/);
  assert.ok(m, 'PREFIX_ROUTES is gone');
  return new Set([...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1]));
}

/**
 * The public route names, read from the `publicRoutes` array in the guard.
 *
 * LINE BY LINE, not by slicing to the next `];`. The array runs nearly three
 * hundred lines and the prose between its entries contains both `];` and
 * apostrophes, so a character-level parse stopped early and silently returned
 * a list missing every name this test is about — which made the test fail
 * against a fix that was already correct.
 */
function publicRoutes(): Set<string> {
  const lines = app.split(/\r?\n/);
  const start = lines.findIndex((l) => l.includes('const publicRoutes = ['));
  assert.notEqual(start, -1, 'publicRoutes is gone');
  let end = start;
  while (end < lines.length && lines[end].trim() !== '];') end++;

  const names = new Set<string>();
  for (const line of lines.slice(start + 1, end)) {
    const m = line.match(/^\s*'([^']+)',?\s*$/);
    if (m) names.add(m[1]);
  }
  assert.ok(names.size > 50, 'the public list parsed to almost nothing; the shape has changed');
  return names;
}

/**
 * The guard's decision, as the source now computes it.
 *
 * Kept deliberately close to the code it mirrors: if that changes shape, this
 * should be updated beside it rather than silently keep passing.
 */
function isPublicPath(currentPath: string): boolean {
  const pub = publicRoutes();
  const firstSegment = currentPath.split('/')[0];
  return pub.has(currentPath) || (prefixRoutes().has(firstSegment) && pub.has(firstSegment));
}

/* ── the links that were broken ─────────────────────────────────────────── */

test('a texted junk pricing link opens without an account', () => {
  assert.equal(
    isPublicPath('junk-quote/abc123'), true,
    'the link Eric texts is bouncing to the login screen again',
  );
});

test('the estimate portal opens without an account', () => {
  assert.equal(
    isPublicPath('my-estimate/IPTc2CBJqaHJpXxOwgJoWyu5lDkOvGMxNOacQ2V2AJU'), true,
    'the portal handed to somebody who has never signed in demands a sign-in',
  );
});

test("an architect's submittal link still opens", () => {
  assert.equal(isPublicPath('architect-review/sometoken'), true);
});

test('the bare page names still resolve as they did', () => {
  assert.equal(isPublicPath('junk-quote'), true);
  assert.equal(isPublicPath('my-estimate'), true);
  assert.equal(isPublicPath('landing'), true);
});

/* ── and nothing else became public ─────────────────────────────────────── */

/**
 * The fix widens the rule, so this is the half that matters: a prefix route
 * is public only when its NAME is listed public. Being in PREFIX_ROUTES is
 * about routing, not about access.
 */
test('a protected page is still protected, with or without a tail', () => {
  for (const path of [
    'unified-dashboard',
    'unified-dashboard/anything',
    'owners-dashboard',
    'admin-portal/abc',
    'customer-portal-app?tab=trash-estimate',
  ]) {
    assert.equal(isPublicPath(path), false, `${path} became reachable without a session`);
  }
});

test('a prefix route that is not listed public stays private', () => {
  const prefixes = prefixRoutes();
  const pub = publicRoutes();
  for (const name of prefixes) {
    if (pub.has(name)) continue;
    assert.equal(
      isPublicPath(`${name}/whatever`), false,
      `${name} is in PREFIX_ROUTES but not public, and must not be reachable`,
    );
  }
});

/* ── and EVERY gate reads the same answer ───────────────────────────────── */

/**
 * THE FIX THAT WAS HALF A FIX.
 *
 *  had the same comparison in several places. The first
 * pass corrected the redirect in the effect and left the RENDER gate alone,
 * so the portal link stopped redirecting to /login and started rendering
 * "Please log in to continue..." in place instead — a different wrong
 * answer, from the half nobody had looked for. The test at the time asserted
 * the redirect branch and passed.
 *
 * There were five uses in total: two gates, two early-returns and a log line
 * that was printing the wrong value. A duplicated condition is how one of
 * them gets fixed alone, so this asserts there is exactly one left — the
 * definition.
 */
test('no gate carries its own copy of the comparison', () => {
  const code = app.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  const copies = [...code.matchAll(/publicRoutes\.includes\(currentPath\)/g)].length;

  assert.equal(
    copies, 1,
    `publicRoutes.includes(currentPath) appears ${copies} times; it should appear `
    + 'once, in the definition of isPublicPath. Every other reader must use that, '
    + 'or one of them gets fixed on its own again.',
  );
});

/* ── the source still computes it this way ──────────────────────────────── */

test('the guard uses the first segment for a prefix route', () => {
  const code = app.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  assert.match(code, /const firstSegment = currentPath\.split\('\/'\)\[0\]/);
  assert.match(code, /PREFIX_ROUTES\.has\(firstSegment\) && publicRoutes\.includes\(firstSegment\)/);
  assert.doesNotMatch(
    code, /!loading && !isAuthenticated && !publicRoutes\.includes\(currentPath\)\)/,
    'the guard is back to an exact match on the whole path, which never matches a tokenised link',
  );
});
