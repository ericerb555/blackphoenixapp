/**
 * Which advertisement links are placeholders.
 *
 * The failure this guards against was live: two approved, active, https
 * advertisements pointing at `example.com` served on every portal marquee for
 * nineteen days. So the acceptances matter at least as much as the refusals —
 * a predicate that quietly swallows `notexample.com` would drop a real
 * advertiser's ad, and nobody would file that as a bug. They would assume the
 * ad had been rejected on its merits.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isPlaceholderHost, isPlaceholderLink } from '../supabase/functions/server/placeholderLink.ts';

/* ── the rows that were actually serving ──────────────────────────────── */

test('the two seed advertisements that were live are placeholders', () => {
  assert.equal(isPlaceholderLink('https://example.com/lumber'), true);
  assert.equal(isPlaceholderLink('https://example.com/flooring'), true);
});

test("the owner's own advertisement is not", () => {
  assert.equal(isPlaceholderLink('https://theblackphoenixcompany.com'), false);
});

/* ── RFC 2606 names ───────────────────────────────────────────────────── */

for (const name of ['example.com', 'example.net', 'example.org', 'example.edu']) {
  test(`${name} is reserved for documentation`, () => {
    assert.equal(isPlaceholderHost(name), true);
  });
}

test('a subdomain of a reserved name is still reserved', () => {
  assert.equal(isPlaceholderHost('shop.example.com'), true);
  assert.equal(isPlaceholderHost('a.b.c.example.org'), true);
});

/* ── the boundary that would fail silently ────────────────────────────── */

test('a real domain merely ENDING in a reserved name is not a placeholder', () => {
  // The whole point: `endsWith('example.com')` would refuse these, and a
  // refused advertiser never finds out why.
  assert.equal(isPlaceholderHost('notexample.com'), false);
  assert.equal(isPlaceholderHost('myexample.com'), false);
  assert.equal(isPlaceholderHost('example.company'), false);
  assert.equal(isPlaceholderLink('https://notexample.com/deals'), false);
});

test('a reserved label inside a longer name is not a suffix match', () => {
  assert.equal(isPlaceholderHost('example.com.myshop.net'), false);
  assert.equal(isPlaceholderHost('testing.co.uk'), false);
  assert.equal(isPlaceholderHost('contest.com'), false);
});

/* ── RFC 6761 suffixes ────────────────────────────────────────────────── */

for (const host of ['anything.example', 'foo.invalid', 'staging.test', 'app.localhost']) {
  test(`${host} cannot resolve to anybody's site`, () => {
    assert.equal(isPlaceholderHost(host), true);
  });
}

test('bare localhost points at whoever is reading, which is not a destination', () => {
  assert.equal(isPlaceholderHost('localhost'), true);
  assert.equal(isPlaceholderLink('http://localhost:3000/offer'), true);
});

/* ── shapes that arrive from a JSON column ────────────────────────────── */

test('nothing at all is not a placeholder, because there is no link to refuse', () => {
  // `safeUrl` already turns these into "no link". Calling them placeholders
  // would attribute the removal to the wrong rule.
  for (const empty of ['', '   ', null, undefined]) {
    assert.equal(isPlaceholderLink(empty as unknown), false);
    assert.equal(isPlaceholderHost(empty as unknown), false);
  }
});

test('an unparseable value is left to the scheme check, not claimed here', () => {
  assert.equal(isPlaceholderLink('not a url'), false);
  assert.equal(isPlaceholderLink('/relative/path'), false);
  assert.equal(isPlaceholderLink('example.com/no-scheme'), false);
});

test('case and a trailing dot do not get a placeholder through', () => {
  assert.equal(isPlaceholderHost('EXAMPLE.COM'), true);
  assert.equal(isPlaceholderHost('Example.Com.'), true);
  assert.equal(isPlaceholderLink('HTTPS://EXAMPLE.COM/lumber'), true);
});

test('a non-string does not throw', () => {
  for (const odd of [42, {}, [], true, Symbol.iterator.toString()]) {
    assert.doesNotThrow(() => isPlaceholderLink(odd as unknown));
    assert.doesNotThrow(() => isPlaceholderHost(odd as unknown));
  }
});

/* ── the scheme check stays the scheme check ──────────────────────────── */

test('a dangerous scheme is not this rule\u2019s business', () => {
  // `javascript:example.com` has no hostname. `safeUrl` refuses it on the
  // scheme; this returns false so that the refusal is attributed correctly.
  assert.equal(isPlaceholderLink('javascript:alert(1)'), false);
  assert.equal(isPlaceholderLink('data:text/html,hi'), false);
});
