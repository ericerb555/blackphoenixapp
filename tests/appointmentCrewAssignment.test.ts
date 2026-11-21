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
 * The three things that must stay true:
 *
 *   1. the handler reaches the server at all;
 *   2. `employeeId` is read by PRESENCE, so `null` can mean "take them off"
 *      and a status-only PATCH — every caller written before today — keeps
 *      working untouched;
 *   3. the id is checked against the roster, because an unknown id rosters
 *      nobody while reading on screen as assigned, which is the original bug
 *      wearing a server round-trip.
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

test('THE SERVER READS employeeId BY PRESENCE, so null can unassign', () => {
  const body = appointmentPatch();
  assert.match(body, /hasOwnProperty\.call\(body, 'employeeId'\)/,
    "`employeeId: null` must be told apart from a body that omits it; truthiness cannot do that");
});

test('a status-only PATCH still works — every caller before today sends one', () => {
  const body = appointmentPatch();
  assert.match(body, /wantsStatus/, 'status must remain independently settable');
  assert.match(body, /\['scheduled', 'confirmed', 'completed', 'cancelled'\]/,
    'the status whitelist must survive');
  // And a body with neither field is a mistake, not a no-op that reports success.
  assert.match(body, /if \(!wantsStatus && !wantsCrew\) return c\.json\(\{ error:/);
});

test('THE ID IS CHECKED AGAINST THE ROSTER', () => {
  const body = appointmentPatch();
  assert.match(body, /time_employee:\$\{id\}/,
    'an unknown id would roster nobody while reading as assigned');
  assert.match(body, /not on the roster/, 'and must be refused with a reason');
  assert.ok(
    body.indexOf('time_employee:') < body.indexOf('kv.set(appointmentKey'),
    'the roster check must happen before the record is written',
  );
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

test('the crew change is attributed to whoever made it', () => {
  // The status half already recorded `status_updated_by`. A crew change that
  // recorded nothing would leave "who put Dave on this job" unanswerable.
  const body = appointmentPatch();
  assert.match(body, /crew_updated_by/);
});
