/**
 * Which account a dialled number belongs to, pinned.
 *
 * WHY THESE ASSERTIONS
 *
 * The dialled number is the only thing an inbound emergency call carries that
 * says whose it is. Get it wrong and the call is routed to another account's
 * rota, honouring another account's contracted vendors — and it looks like a
 * call that worked. Two accounts holding one number has to be refused when
 * somebody saves it, because the alternative is guessing at three in the
 * morning. A disabled line has to actually stop answering. And an unrecognised
 * caller must never be turned away: the night a neighbour rings about a fire
 * is the night a strict check costs somebody their building.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeAssignment, numberKey, claimConflict, assignmentFor, recognizeCaller,
  type NumberAssignment,
} from '../supabase/functions/server/onCallNumbers.ts';

const claim = (over: Partial<NumberAssignment> = {}): NumberAssignment => ({
  number: '+16035550100', accountEmail: 'hoa@maple.test', label: 'Maple Court main line',
  propertyId: null, address: '', enabled: true,
  assignedAt: '2026-11-11T00:00:00.000Z', assignedBy: 'hoa@maple.test',
  ...over,
});

test('a number typed the way a person types it is stored the way Twilio dials it', () => {
  const a = normalizeAssignment({ number: '(603) 555-0100' }, { accountEmail: 'HOA@Maple.test' });
  assert.equal(a?.number, '+16035550100');
  assert.equal(a?.accountEmail, 'hoa@maple.test');
});

test('a number Twilio could not dial is refused rather than stored', () => {
  // Stored, this is a line that silently never rings — discovered on the first
  // emergency rather than on the settings screen.
  assert.equal(normalizeAssignment({ number: '555-0100' }, { accountEmail: 'a@b.test' }), null);
  assert.equal(normalizeAssignment({ number: '' }, { accountEmail: 'a@b.test' }), null);
});

test('a claim defaults to enabled, and the label falls back to the number', () => {
  const a = normalizeAssignment({ number: '+16035550100' }, { accountEmail: 'a@b.test' });
  assert.equal(a?.enabled, true);
  assert.equal(a?.label, '+16035550100');
});

test('the directory key is the normalised number', () => {
  assert.equal(numberKey('(603) 555-0100'), 'on_call_number:+16035550100');
  assert.equal(numberKey('nonsense'), '');
});

test('another account holding the number is refused', () => {
  const conflict = claimConflict(claim(), 'other@elsewhere.test');
  assert.ok(conflict);
  assert.match(conflict!, /already assigned/);
});

test('re-saving your own number is an edit, not a conflict', () => {
  assert.equal(claimConflict(claim(), 'hoa@maple.test'), null);
  assert.equal(claimConflict(claim(), 'HOA@MAPLE.TEST'), null);
});

test('an unclaimed number is not a conflict', () => {
  assert.equal(claimConflict(null, 'anyone@test'), null);
});

test('the dialled number finds its account however it was typed', () => {
  const found = assignmentFor([claim()], '603-555-0100');
  assert.equal(found?.accountEmail, 'hoa@maple.test');
});

test('a disabled line answers nothing', () => {
  // Switching the line off has to actually switch it off, not route anyway.
  assert.equal(assignmentFor([claim({ enabled: false })], '+16035550100'), null);
});

test('a number nobody has claimed resolves to nobody', () => {
  assert.equal(assignmentFor([claim()], '+16035559999'), null);
  assert.equal(assignmentFor([], '+16035550100'), null);
});

test('a known caller is recognised so the address need not be asked', () => {
  const hit = recognizeCaller('+16035550199', [
    { name: 'Dana', phone: '(603) 555-0199', unit: '4B', propertyId: 'prop_1' },
  ]);
  assert.equal(hit?.name, 'Dana');
  assert.equal(hit?.unit, '4B');
  assert.equal(hit?.propertyId, 'prop_1');
});

test('an unrecognised caller is not turned away, only unrecognised', () => {
  // recognizeCaller gates nothing. A miss is used for nothing at all.
  assert.equal(recognizeCaller('+16035550000', [{ name: 'Dana', phone: '+16035550199' }]), null);
  assert.equal(recognizeCaller('', [{ name: 'Dana', phone: '+16035550199' }]), null);
  assert.equal(recognizeCaller('+16035550199', []), null);
});

test('a contact with no number cannot be matched by an empty one', () => {
  assert.equal(recognizeCaller('+16035550199', [{ name: 'Nobody' }]), null);
});
