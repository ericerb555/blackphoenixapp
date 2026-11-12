/**
 * Reading a model's JSON reply, and telling a cut-off answer from a wrong one.
 *
 * The bug this covers shipped for months: a greedy /\{[\s\S]*\}/ ran from the
 * first brace to the last one anywhere in the reply, so a reply truncated at
 * max_tokens handed back a fragment and failed as "could not parse" over text
 * that visibly began as valid JSON. The error pointed at the wrong thing, and
 * a reader who looked at the raw response stopped trusting the error.
 *
 * So the two cases are asserted apart: a reply that stopped mid-object must
 * report TRUNCATED, and a reply that is merely wrapped must still parse.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  readJsonReply, unreadableReply,
} from '../supabase/functions/server/floorPlanReply.ts';

const reply = (content: string, finish = 'stop') => ({
  choices: [{ finish_reason: finish, message: { content } }],
});

/* ── the ordinary cases ──────────────────────────────────────────────────── */

test('a bare JSON object parses', () => {
  const out = readJsonReply(reply('{"rooms":[{"label":"Kitchen"}]}'));
  assert.equal(out.data.rooms[0].label, 'Kitchen');
  assert.equal(out.truncated, false);
});

test('a fenced block parses', () => {
  const out = readJsonReply(reply('```json\n{"rooms":[]}\n```'));
  assert.deepEqual(out.data, { rooms: [] });
});

test('an object followed by a sentence still parses', () => {
  // The greedy match this replaces would have swallowed the sentence.
  const out = readJsonReply(reply('{"a":1}\n\nI hope that helps!'));
  assert.deepEqual(out.data, { a: 1 });
});

test('a brace inside a room label does not confuse the scan', () => {
  const out = readJsonReply(reply('Here: {"label":"Bed {master}","n":2} done'));
  assert.equal(out.data.label, 'Bed {master}');
  assert.equal(out.data.n, 2);
});

test('an escaped quote inside a label does not end the string early', () => {
  const out = readJsonReply(reply('{"label":"the \\"good\\" room","n":1}'));
  assert.equal(out.data.n, 1);
});

/* ── the case that was being misreported ─────────────────────────────────── */

test('a reply cut off mid-object reports TRUNCATED, not bad JSON', () => {
  // Exactly the shape seen in production: valid-looking, and stops.
  const cut = '{"rooms":[{"label":"Bed Room","width":168,"height":144,"area":24192},'
    + '{"label":"Bath Room","width":54';
  const out = readJsonReply(reply(cut, 'length'));
  assert.equal(out.data, null);
  assert.equal(out.truncated, true);
});

test('an unclosed object counts as truncated even when finish_reason did not say so', () => {
  // The provider is not always the one that tells us. An object that never
  // closes stopped early whatever the field claims.
  const out = readJsonReply(reply('{"rooms":[{"label":"Bed', 'stop'));
  assert.equal(out.data, null);
  assert.equal(out.truncated, true);
});

test('the trailing-brace trap: a fragment ending in } must not parse as success', () => {
  // The old greedy match took first-brace-to-last-brace and produced this.
  const out = readJsonReply(reply('{"rooms":[{"label":"Bed Room","area":24192}', 'length'));
  assert.equal(out.data, null, 'a fragment was accepted as a reading');
  assert.equal(out.truncated, true);
});

/* ── refusals and emptiness ──────────────────────────────────────────────── */

test('a refusal is carried, not lost to an empty content field', () => {
  const out = readJsonReply({
    choices: [{ finish_reason: 'stop', message: { content: null, refusal: 'I cannot help.' } }],
  });
  assert.equal(out.data, null);
  assert.equal(out.text, 'I cannot help.');
  assert.equal(out.truncated, false);
});

test('an empty or malformed envelope yields no data rather than throwing', () => {
  for (const bad of [undefined, null, {}, { choices: [] }, { choices: [{}] }]) {
    const out = readJsonReply(bad as any);
    assert.equal(out.data, null);
  }
});

test('prose with no JSON at all is not truncation', () => {
  // Being precise about which failure it was is the whole point.
  const out = readJsonReply(reply('I am unable to analyze this image.'));
  assert.equal(out.data, null);
  assert.equal(out.truncated, false);
});

/* ── what the caller is told ─────────────────────────────────────────────── */

test('the two failures read differently to a person', () => {
  assert.match(unreadableReply(true), /cut off/);
  assert.match(unreadableReply(true), /nothing has been measured/);
  assert.match(unreadableReply(false), /could not be read/);
  assert.notEqual(unreadableReply(true), unreadableReply(false));
});
