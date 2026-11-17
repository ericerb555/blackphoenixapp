/**
 * Stripping "Bearer " off an Authorization header.
 *
 * Eric, 2026-11-17: "i am signed in and the before and after section of the
 * content center is reading that i am. it says i need to be signed in."
 *
 * He was signed in. The browser sent a valid token. Three routes stripped the
 * prefix with `/^Bearers+/i` — the backslash gone from `\s` — which matches
 * "Bearers", "Bearerss", "BEARERSSS", and never "Bearer " with a space. So the
 * prefix survived, `auth.getUser("Bearer eyJhbGci...")` was handed a malformed
 * token, it resolved to nobody, and the AI meter refused the request as
 * unauthenticated.
 *
 * WHY IT READ AS A SESSION PROBLEM AND NOT A PARSING ONE
 *
 * Because the refusal is the same one a genuinely signed-out caller gets. The
 * user is told to sign in, signs in again, sends a perfectly good token, and is
 * told to sign in again. Nothing errors and nothing logs; the only symptom is a
 * person being refused for a reason that is not true.
 *
 * It is a lost backslash, almost certainly from an edit made through a shell —
 * the same way `node -e` has eaten backticks in this repository before. That is
 * why the fix came with this file: a regex that cannot be eyeballed for a
 * missing escape should be pinned by a case that fails when it goes.
 *
 * 55 other places in the server already had it right. These assertions are
 * written against the correct pattern so they fail if any of them regresses to
 * the broken one.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

/** The pattern every token-reading route is supposed to use. */
const STRIP = /^Bearer\s+/i;

const strip = (header: string) => String(header || '').replace(STRIP, '');

test('a normal header loses exactly its prefix', () => {
  assert.equal(strip('Bearer eyJhbGciOiJIUzI1NiJ9.payload.sig'), 'eyJhbGciOiJIUzI1NiJ9.payload.sig');
});

test('case does not matter, because clients disagree about it', () => {
  assert.equal(strip('bearer abc123'), 'abc123');
  assert.equal(strip('BEARER abc123'), 'abc123');
});

test('extra whitespace after the scheme is absorbed', () => {
  assert.equal(strip('Bearer    abc123'), 'abc123');
  assert.equal(strip('Bearer\tabc123'), 'abc123');
});

test('a bare token is passed through untouched', () => {
  // Some callers send the raw token with no scheme at all.
  assert.equal(strip('abc123'), 'abc123');
});

test('THE BUG: the broken pattern leaves the prefix on the token', () => {
  // This is what the three routes were doing. Kept as an executable record of
  // why a signed-in owner was told to sign in.
  const brokenStrip = (h: string) => String(h || '').replace(/^Bearers+/i, '');
  const header = 'Bearer eyJhbGciOiJIUzI1NiJ9.payload.sig';

  assert.equal(brokenStrip(header), header, 'the broken pattern changes nothing');
  assert.notEqual(brokenStrip(header), strip(header));
  // And it does strip the thing nobody ever sends, which is why it looks fine.
  assert.equal(brokenStrip('Bearers token'), ' token');
});

test('an empty or missing header yields an empty string, not a crash', () => {
  assert.equal(strip(''), '');
  assert.equal(strip(undefined as any), '');
  assert.equal(strip(null as any), '');
});

/*
 * The repository-wide check, because the unit above only proves the regex this
 * file holds. What matters is that no ROUTE carries the broken one.
 */
test('no server source file strips the prefix with a missing backslash', () => {
  const dir = 'supabase/functions/server';
  const offenders: string[] = [];
  for (const name of fs.readdirSync(dir)) {
    if (!/\.(ts|tsx)$/.test(name)) continue;
    const text = fs.readFileSync(`${dir}/${name}`, 'utf8');
    // `Bearers+` with no backslash in front of the s.
    if (/replace\(\/\^Bearers\+\/i/.test(text)) offenders.push(name);
  }
  assert.deepEqual(offenders, [], `these strip the token wrongly: ${offenders.join(', ')}`);
});
