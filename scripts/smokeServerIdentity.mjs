/**
 * Is the dev server that answered the one this run started?
 *
 * WHY THIS IS ITS OWN FILE
 *
 * It is the check standing between a green sweep and ten minutes spent
 * measuring somebody else's worktree — and it only ever fires when a collision
 * happens to occur, which is to say not on the runs where it matters that it
 * still works. A check that is exercised only in the rare case is the one that
 * rots unnoticed, so it lives here, pure, and `tests/smokeServerIdentity.test.ts`
 * exercises all three answers on every run of the suite.
 *
 * `smoke.mjs` itself cannot be imported by a test: it starts vite, opens a
 * browser and sweeps the app the moment it is loaded.
 *
 * WHY THE WHOLE TAG, NOT `body.includes(token)`
 *
 * A bare substring test says yes when one token is a prefix of another —
 * `run-7-a` is inside `run-7-ab`. Tokens carry a pid and a timestamp so that
 * is unlikely rather than impossible, and "unlikely" is the wrong standard for
 * the check that decides whether the numbers mean anything. Matching the
 * rendered tag makes a prefix a mismatch.
 */

/** The marker written into the harness page, and looked for on the way back. */
export function identityTag(token) {
  return `<meta name="smoke-run" content="${token}">`;
}

/**
 * What to do with a response from the port we intend to use.
 *
 *   'ours'    — the server this run started; go.
 *   'foreign' — a 200 from somebody else's dev server; stop and say so.
 *   'retry'   — nothing useful yet; vite is probably still booting.
 */
export function serverVerdict({ ok, body, token }) {
  if (!ok) return 'retry';
  if (!token) return 'retry';
  return String(body || '').includes(identityTag(token)) ? 'ours' : 'foreign';
}
