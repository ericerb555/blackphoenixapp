/**
 * The owner's "System Healthy" button checked nothing.
 *
 * It was green, it was labelled "System Healthy", and clicking it answered
 * `toast.success('All systems operational')` without making a single request.
 * On the platform owner's dashboard that is the worst possible place to assert
 * something untrue: it is the screen somebody opens BECAUSE they suspect
 * trouble, and it reported none while the API could have been down all day.
 *
 * It now asks `/health` and reports what came back, including the commit the
 * live server was built from — on this project "still broken" is usually "not
 * deployed", and that commit is the number which settles it.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const PAGE = 'src/app/pages/MasterAdminDashboard.tsx';
const page = readFileSync(PAGE, 'utf8');

/** `checkServerHealth`, from its declaration to the end of the function. */
function handler(): string {
  const start = page.indexOf('const checkServerHealth =');
  assert.ok(start >= 0, `${PAGE} no longer declares checkServerHealth`);
  const after = page.indexOf('\n  };', start);
  return page.slice(start, after === -1 ? start + 3000 : after);
}

test('THE CLAIM IS GONE — nothing asserts every system is fine', () => {
  const live = page.split('\n').filter((line) =>
    line.includes('All systems operational') && !/^\s*(\*|\/\/|\/\*)/.test(line));
  assert.deepEqual(live, [], 'no code may claim all systems are operational');
});

test('it actually asks the server', () => {
  const body = handler();
  assert.match(body, /fetch\(/);
  assert.match(body, /make-server-3eae23a6\/health/);
  assert.match(body, /API_BASE_URL/, 'the functions root belongs to apiConfig, not this file');
});

test('A 4XX IS NOT HEALTH, and neither is a 200 saying otherwise', () => {
  // The retired function answers HTTP 200 with `{ status: 'ok', retired: true,
  // message: 'This function is retired.' }` — so the body has to be read. A
  // status check alone would call a dead function healthy.
  const body = handler();
  assert.match(body, /if \(!res\.ok\) throw/, 'the HTTP status has to be read');
  assert.match(body, /json\?\.status !== 'ok'/, 'and so does what it said');
});

test('a failure turns the button red and says why', () => {
  const body = handler();
  assert.match(body, /state: 'down'/);
  assert.match(body, /toast\.error/);
  assert.match(page, /serverHealth\.state === 'down'/, 'the button must show it');
  assert.match(page, /Server not answering/);
});

test('THE BUILD COMMIT IS REPORTED — "still broken" is usually "not deployed"', () => {
  const body = handler();
  assert.match(body, /json\?\.build\?\.commit/);
  assert.match(body, /build \$\{/, 'and it is shown to the owner, not just stored');
});

test('it does not run on mount, so the button cannot paint itself green', () => {
  // A check that runs by itself and leaves a green button is how the old lie
  // comes back: the owner reads a colour nobody asked for.
  assert.match(page, /useState<\{\s*state: 'unknown' \| 'checking' \| 'ok' \| 'down';/,
    'the starting state must be unknown');
  assert.ok(
    !/useEffect\([^)]*checkServerHealth/s.test(page),
    'checkServerHealth must not be called from an effect',
  );
  assert.match(page, /Check the server/, 'and the unknown state must say so on the button');
});

test('the label speaks only for what was asked', () => {
  // /health answers for the API. It says nothing about mail, texts, Stripe or
  // the database, which is what "All systems operational" claimed.
  assert.match(page, /Server answering/);
  // The old label survives in the comment explaining why it went; what must be
  // gone is any line of code still printing it.
  const live = page.split('\n').filter((line) =>
    line.includes('System Healthy') && !/^\s*(\*|\/\/|\/\*)/.test(line));
  assert.deepEqual(live, [], 'the old blanket label must be gone from the markup');
});
