/**
 * Assigning a crew has to write something down.
 *
 * Master Scheduling's "Assign" button was `toast.success(`${emp.name} assigned
 * to job`)` and nothing else, and the page's own `handleAssignEmployee` was a
 * toast sitting above the comment `// Logic to assign employee`. A dispatcher
 * could staff the week, watch every name appear under "Assigned Employees",
 * and have written nothing anywhere: the crew is never told, and the shift
 * board the next morning is empty. Of the 35 handlers in the audit's C1 bucket
 * — "the whole handler is a message, nothing happens" — this is the one that
 * decides whether somebody turns up at a customer's house.
 *
 * Asserted against the source, like the email-send gate, because the failure
 * is invisible: both halves read perfectly well, nothing throws, and a toast
 * saying "Dave assigned to job" is indistinguishable from an assignment.
 *
 * Two things, and only two, are source questions:
 *
 *   1. the page's handler reaches the server at all, and the button calls the
 *      handler rather than raising its own toast — it did not;
 *   2. the route is gated, delegates the decision, and writes only what that
 *      decision returned.
 *
 * What the decision DOES — presence versus truthiness, the status whitelist,
 * the roster check, the attribution — is executed in
 * `tests/appointmentPatch.test.ts` instead, because a guard that is present
 * and wrong passes every grep.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const SERVER = 'supabase/functions/server/index.tsx';
const PAGE = 'src/app/pages/MasterScheduling.tsx';
const server = readFileSync(SERVER, 'utf8');
const page = readFileSync(PAGE, 'utf8');

/** The PATCH handler for one appointment, from its registration to the next route. */
function appointmentPatch(): string {
  const start = server.indexOf("app.patch('/make-server-3eae23a6/schedule/appointments/:id'");
  assert.ok(start >= 0, `${SERVER} no longer registers PATCH /schedule/appointments/:id`);
  const after = server.indexOf('\napp.', start + 10);
  return server.slice(start, after === -1 ? server.length : after);
}

/** `handleAssignEmployee`, from its declaration to the next one. */
function assignHandler(): string {
  const start = page.indexOf('const handleAssignEmployee =');
  assert.ok(start >= 0, `${PAGE} no longer declares handleAssignEmployee`);
  const after = page.indexOf('\n  const handleCreateJob', start);
  return page.slice(start, after === -1 ? page.length : after);
}

test('THE ASSIGNMENT REACHES THE SERVER — it is not a toast any more', () => {
  const body = assignHandler();
  assert.match(body, /fetch\(/, 'handleAssignEmployee must call the server');
  assert.match(body, /schedule\/appointments\//, 'it must PATCH the appointment it is assigning');
  assert.match(body, /method: 'PATCH'/);
  assert.match(body, /JSON\.stringify\(\{ employeeId \}\)/,
    'the employee id is what the server is being told');
});

test('and the button calls it, instead of raising its own toast', () => {
  // The original bug was in two places: the handler did nothing, AND the
  // button never called the handler — it raised a toast with the name in it.
  assert.ok(
    !page.includes('assigned to job`)}'),
    'the Assign button must not raise its own success toast',
  );
  assert.match(page, /onClick=\{\(\) => onAssign\(job, emp\.id, emp\.name\)\}/,
    'Assign must call onAssign with the job and the employee');
  assert.match(page, /onClick=\{\(\) => onAssign\(job, null\)\}/,
    'the X beside an assigned employee must take them off the job');
});

test('a failed response is reported, not swallowed', () => {
  // `fetch` does not reject on 4xx. A `.catch` alone would leave a 403 looking
  // exactly like success, which is the shape of the bug being fixed.
  const body = assignHandler();
  assert.match(body, /response\.ok/, 'the status has to be read');
  assert.match(body, /toast\.error/, 'a failure has to be said out loud');
});

test('a job with no appointment behind it says so rather than succeeding', () => {
  const body = assignHandler();
  assert.match(body, /if \(!job\.appointmentId\)/);
  assert.ok(
    body.indexOf('if (!job.appointmentId)') < body.indexOf('fetch('),
    'the check belongs before the request, not after it',
  );
});

/*
 * Presence-vs-truthiness, the status whitelist, the roster check and the
 * attribution all moved into `supabase/functions/server/appointmentPatch.ts`
 * on the same day they were written, because a source assertion catches a
 * DELETED guard and cannot catch one that is present and wrong — which is
 * exactly the shape of `if (body.employeeId)`. They are executed in
 * `tests/appointmentPatch.test.ts`, and both were confirmed by mutation:
 * swapping the presence check for truthiness fails two of them, and removing
 * the roster lookup fails four.
 *
 * What is still asserted here is what only this file can answer.
 */
test('the route delegates to the decision, and writes only what it returns', () => {
  const body = appointmentPatch();
  assert.match(body, /decideAppointmentPatch\(/, 'the decision must not be re-inlined here');
  assert.match(body, /time_employee:\$\{id\}/, 'the roster lookup is this route\'s to supply');
  // `=== false` rather than `!decision.ok`: the server project compiles without
  // strictNullChecks, where the boolean-literal discriminant does not narrow
  // (TS2339 on decision.error), so the explicit comparison is load-bearing.
  assert.match(body, /if \(decision\.ok === false\) return c\.json\(\{ error: decision\.error \}, decision\.status\)/,
    'a refusal must be returned, not ignored');
  assert.ok(
    body.indexOf('decideAppointmentPatch') < body.indexOf('kv.set(appointmentKey'),
    'the decision must precede the write',
  );
  assert.match(body, /\.\.\.decision\.changes/,
    'only the fields the decision returned may be merged onto the record');
});

test('it stays administrator-only', () => {
  const body = appointmentPatch();
  assert.match(body, /financialActor\(c\)/);
  assert.match(body, /if \(!admin\) return c\.json\(\{ error: '[^']*', 403\s*\)|if \(!admin\)/,
    'a non-admin must not be able to change who is on a job');
  assert.ok(
    body.indexOf('if (!admin)') < body.indexOf('kv.set(appointmentKey'),
    'the gate must precede the write',
  );
});

test('the record keeps its own clock, and the caller cannot set it', () => {
  // `updated_at` is the route's, not the body's: the decision deliberately
  // does not return it, and the spread order here is what makes that hold.
  const body = appointmentPatch();
  assert.match(body, /\{ \.\.\.existing, \.\.\.decision\.changes, updated_at: new Date\(\)\.toISOString\(\) \}/);
});
