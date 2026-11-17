/**
 * The smoke harness must refuse a dev server it did not start.
 *
 * WHY THIS TEST EXISTS AT ALL
 *
 * This check only fires when a port collision happens to occur — which is to
 * say, not on the runs where it matters that it still works. It is the thing
 * standing between a green sweep and ten minutes spent measuring somebody
 * else's worktree, and without a test it is exercised by accident or not at
 * all.
 *
 * WHAT IT IS GUARDING AGAINST, CONCRETELY
 *
 * A vite left behind on 5177 by a run on 2026-11-14 was still serving two days
 * later. Every smoke run in between asked it for `/smoke.html`, got a 200 —
 * because it was serving ITS worktree's copy of the same file — and reported
 * nothing, which the failure message blamed on the route map. Each individual
 * step behaved correctly. Nothing was broken enough to report itself.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { identityTag, serverVerdict } from '../scripts/smokeServerIdentity.mjs';

const token = 'run-1234-abcd';
const ourPage = `<!doctype html><html><head><meta charset="utf-8"><title>smoke</title>${identityTag(token)}</head><body></body></html>`;

test('the page this run wrote is recognised as ours', () => {
  assert.equal(serverVerdict({ ok: true, body: ourPage, token }), 'ours');
});

/**
 * The failure that actually happened, and the only one that is silent.
 *
 * Another worktree's harness page: same filename, same markup, same 200 — and
 * a different token, because the token is the one thing that cannot be copied
 * from a file on disk.
 */
test('a 200 from another worktree is foreign, not ours', () => {
  const theirs = ourPage.replace(token, 'run-9999-zzzz');
  assert.equal(serverVerdict({ ok: true, body: theirs, token }), 'foreign');
});

test('a harness page from before tokens existed is foreign', () => {
  const old = '<!doctype html><html><head><meta charset="utf-8"><title>smoke</title></head><body></body></html>';
  assert.equal(serverVerdict({ ok: true, body: old, token }), 'foreign');
});

/**
 * Not-yet-answering is not the same as wrong.
 *
 * Vite takes a few seconds to boot and `waitForServer` polls for sixty. A
 * non-200 has to stay retryable or the harness would give up on its own server
 * before it finished starting.
 */
test('anything short of a 200 is worth retrying, not a verdict', () => {
  assert.equal(serverVerdict({ ok: false, body: '', token }), 'retry');
  assert.equal(serverVerdict({ ok: false, body: ourPage, token }), 'retry');
});

/**
 * A prefix is not a match.
 *
 * `body.includes(token)` — the obvious implementation — says yes when one
 * token is a prefix of another, because the shorter string really is inside
 * the longer one. Tokens carry a pid and a timestamp so this is unlikely
 * rather than impossible, and "unlikely" is the wrong standard for the check
 * that decides whether any of the numbers mean anything. Matching the rendered
 * tag, quotes and all, makes a prefix a mismatch.
 */
test('a token that merely starts the same is a different run', () => {
  const longer = ourPage.replace(token, token + 'ef');
  assert.equal(serverVerdict({ ok: true, body: longer, token }), 'foreign');

  const shorter = ourPage.replace(token, 'run-1234-ab');
  assert.equal(serverVerdict({ ok: true, body: shorter, token }), 'foreign');
});

test('an empty or missing body is never mistaken for ours', () => {
  for (const body of ['', null, undefined, '<html></html>']) {
    assert.equal(serverVerdict({ ok: true, body: body as any, token }), 'foreign');
  }
});

/**
 * No token means no claim.
 *
 * If the run somehow has not minted one, every page would match an empty
 * marker and every foreign server would read as ours — the exact failure this
 * file exists to prevent, arrived at from the other direction.
 */
test('a run with no token of its own claims nothing', () => {
  assert.equal(serverVerdict({ ok: true, body: ourPage, token: '' }), 'retry');
});

test('the tag is the shape the harness page actually writes', () => {
  assert.equal(identityTag('abc'), '<meta name="smoke-run" content="abc">');
  // And it is what the written page contains, so the two cannot drift apart.
  assert.ok(ourPage.includes(identityTag(token)));
});
