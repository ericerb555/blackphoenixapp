/**
 * The appointment PATCH decision, RUN rather than read.
 *
 * `tests/appointmentCrewAssignment.test.ts` asserts that the guards exist in
 * the source. That catches a deleted guard and cannot catch a guard that is
 * present and wrong — and the three behaviours here are all of that kind:
 *
 *   - `employeeId: null` must unassign, so presence has to be told apart from
 *     truthiness. `if (body.employeeId)` reads fine and makes unassigning
 *     impossible.
 *   - a status-only PATCH must keep working, because every caller written
 *     before 2026-11-21 sends one and none of them mention a crew.
 *   - an id that is not on the roster must be refused, because storing it
 *     rosters nobody while the screen reads as assigned, which is the original
 *     bug with a server round-trip bolted on.
 *
 * The roster is injected, so these run with no Deno, no network and no
 * database.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { decideAppointmentPatch } from '../supabase/functions/server/appointmentPatch.ts';

/** The one real roster row in production, as it is actually stored. */
const DAVE_ID = '1a9f3ae4-0d46-4824-8d13-05c2193ca5e9';
const roster: Record<string, { name?: unknown; email?: unknown }> = {
  [DAVE_ID]: { name: 'ericerb555', email: 'ericerb555@proton.me' },
  'no-name': { email: 'nameless@example.com' },
  'blank-name': { name: '   ', email: '' },
};
const lookup = async (id: string) => roster[id] ?? null;

/** Narrowing helper — a failed decision has no `changes`. */
function changesOf(decision: Awaited<ReturnType<typeof decideAppointmentPatch>>) {
  assert.ok(decision.ok, `expected success, got ${JSON.stringify(decision)}`);
  return decision.changes;
}

test('assigning stores the id AND the name, attributed to whoever did it', async () => {
  const changes = changesOf(await decideAppointmentPatch(
    { employeeId: DAVE_ID }, 'Boss@Example.com', lookup,
  ));
  assert.equal(changes.employeeId, DAVE_ID);
  assert.equal(changes.employeeName, 'ericerb555');
  assert.equal(changes.crew_updated_by, 'boss@example.com', 'the actor is lower-cased');
  assert.ok(!('status' in changes), 'assigning must not touch the status');
});

test('EMPLOYEEID: NULL UNASSIGNS — the case truthiness gets wrong', async () => {
  const changes = changesOf(await decideAppointmentPatch({ employeeId: null }, 'boss@example.com', lookup));
  assert.equal(changes.employeeId, null);
  assert.equal(changes.employeeName, null);
  assert.equal(changes.crew_updated_by, 'boss@example.com');
});

test('an empty string unassigns too — that is what a cleared select sends', async () => {
  for (const blank of ['', '   ']) {
    const changes = changesOf(await decideAppointmentPatch({ employeeId: blank }, 'boss@example.com', lookup));
    assert.equal(changes.employeeId, null, JSON.stringify(blank));
    assert.equal(changes.employeeName, null);
  }
});

test('A BODY THAT DOES NOT MENTION THE CREW LEAVES IT ALONE', async () => {
  // The whole point of reading by presence: this is every caller written
  // before the crew field existed, and it must not wipe an assignment.
  const changes = changesOf(await decideAppointmentPatch({ status: 'confirmed' }, 'boss@example.com', lookup));
  assert.equal(changes.status, 'confirmed');
  assert.ok(!('employeeId' in changes), 'a status-only PATCH must not clear the crew');
  assert.ok(!('employeeName' in changes));
  assert.ok(!('crew_updated_by' in changes), 'and must not claim a crew change happened');
});

test('AN ID THAT IS NOT ON THE ROSTER IS REFUSED, not stored', async () => {
  const decision = await decideAppointmentPatch({ employeeId: 'whoever' }, 'boss@example.com', lookup);
  assert.equal(decision.ok, false);
  assert.ok(!decision.ok && decision.status === 404, JSON.stringify(decision));
  assert.ok(!decision.ok && /not on the roster/.test(decision.error), JSON.stringify(decision));
});

test('a roster row with no usable name stores the email, then null', async () => {
  // So that a schedule read can always say WHO, without the roster.
  assert.equal(changesOf(await decideAppointmentPatch({ employeeId: 'no-name' }, 'b@e.com', lookup)).employeeName,
    'nameless@example.com');
  assert.equal(changesOf(await decideAppointmentPatch({ employeeId: 'blank-name' }, 'b@e.com', lookup)).employeeName,
    null, 'whitespace is not a name');
});

test('both halves in one body are applied together', async () => {
  const changes = changesOf(await decideAppointmentPatch(
    { status: 'scheduled', employeeId: DAVE_ID }, 'boss@example.com', lookup,
  ));
  assert.equal(changes.status, 'scheduled');
  assert.equal(changes.employeeId, DAVE_ID);
  assert.equal(changes.status_updated_by, 'boss@example.com');
  assert.equal(changes.crew_updated_by, 'boss@example.com');
});

test('the status whitelist still holds, and is case- and space-insensitive', async () => {
  assert.equal(changesOf(await decideAppointmentPatch({ status: ' Completed ' }, 'b@e.com', lookup)).status,
    'completed');
  for (const bad of ['pending', 'in-progress', 'deleted', 'CONFIRM', 'true']) {
    const decision = await decideAppointmentPatch({ status: bad }, 'b@e.com', lookup);
    assert.ok(!decision.ok && decision.status === 400, `${bad} should be refused`);
  }
});

test('a body with neither field is a 400, not a silent success', async () => {
  for (const body of [{}, { note: 'hello' }, null, undefined, 'nope', 42]) {
    const decision = await decideAppointmentPatch(body, 'b@e.com', lookup);
    assert.ok(!decision.ok && decision.status === 400, JSON.stringify(body));
  }
});

test('an empty or whitespace status is "not mentioned", not a wipe', async () => {
  // A form that posts `status: ''` alongside a crew change must not be read as
  // an attempt to set a blank status.
  const changes = changesOf(await decideAppointmentPatch(
    { status: '  ', employeeId: DAVE_ID }, 'b@e.com', lookup,
  ));
  assert.ok(!('status' in changes), 'a blank status must be left alone');
  assert.equal(changes.employeeId, DAVE_ID);
  // And on its own it is nothing to do at all.
  const alone = await decideAppointmentPatch({ status: '' }, 'b@e.com', lookup);
  assert.ok(!alone.ok && alone.status === 400);
});

test('the decision never carries updated_at — the route owns the clock', async () => {
  const changes = changesOf(await decideAppointmentPatch({ employeeId: DAVE_ID }, 'b@e.com', lookup));
  assert.ok(!('updated_at' in changes));
  // And it cannot be talked into writing arbitrary fields.
  const injected = changesOf(await decideAppointmentPatch(
    { employeeId: DAVE_ID, id: 'somebody-elses-appointment', total: 999, status_updated_by: 'ghost' },
    'b@e.com', lookup,
  ));
  assert.deepEqual(
    Object.keys(injected).sort(),
    ['crew_updated_by', 'employeeId', 'employeeName'],
    'only the crew fields may come out of a crew change',
  );
});

test('the roster is asked for exactly the id given, once', async () => {
  const asked: string[] = [];
  await decideAppointmentPatch({ employeeId: ` ${DAVE_ID} ` }, 'b@e.com', async (id) => {
    asked.push(id);
    return roster[id] ?? null;
  });
  assert.deepEqual(asked, [DAVE_ID], 'the id is trimmed before the lookup');
});
