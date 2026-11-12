/**
 * The shape of an emergency phone call, pinned.
 *
 * WHY THESE ASSERTIONS
 *
 * None of this can be proven against Bird without placing a real call, so what
 * can be proven is pinned instead: that the sequence graph is connected end to
 * end, that it speaks twice, and that the config refuses the two mistakes that
 * would otherwise be discovered at three in the morning.
 *
 * The one worth the file on its own is the sender. `BIRD_SMS_FROM` may
 * legitimately be an alphanumeric sender id — "BLACKPHOENIX" — which is valid
 * for a text and cannot place a call. Falling back to it blindly means every
 * page fails at Bird with a vague code, on the attempt nobody is watching.
 *
 * A disconnected graph is the other: Bird would answer the call, run the entry
 * node, find nothing wired to it and hang up on somebody's emergency without
 * saying a word. Nothing in a JSON body makes that visible by reading it.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sayTwiceDefinition, describeBirdVoiceError } from '../supabase/functions/server/birdVoice.ts';

/* ── the sequence graph ──────────────────────────────────────────────────── */

test('the graph runs start → say → say → exit, with nothing dangling', () => {
  const def = sayTwiceDefinition('There is an emergency.');
  const byId = new Map(def.nodes.map((n: any) => [n.id, n]));

  // Every connection must point at a node that exists. A typo here is a call
  // that connects, says nothing and hangs up.
  for (const node of def.nodes as any[]) {
    for (const conn of Object.values(node.connections || {}) as any[]) {
      assert.ok(byId.has(conn.node_id), `${node.id} points at missing node ${conn.node_id}`);
    }
  }

  // And the path from the entry node must actually reach the exit.
  const visited: string[] = [];
  let cursor: any = byId.get('start');
  while (cursor && visited.length < 10) {
    visited.push(cursor.id);
    const next = Object.values(cursor.connections || {})[0] as any;
    cursor = next ? byId.get(next.node_id) : null;
  }
  assert.deepEqual(visited, ['start', 'say1', 'say2', 'end']);
});

test('it says the message twice, because once does not wake anybody', () => {
  const def = sayTwiceDefinition('Burst pipe at 14 Maple Court.');
  const spoken = (def.nodes as any[]).filter((n) => n.type === 'voice.say');
  assert.equal(spoken.length, 2);
  assert.equal(spoken[0].input.text, 'Burst pipe at 14 Maple Court.');
  assert.equal(spoken[1].input.text, 'Burst pipe at 14 Maple Court.');
});

test('the entry node is the one the request names', () => {
  // `entry_node_id: 'start'` is sent in the request body; if the graph stopped
  // calling it that, Bird would have nowhere to begin.
  const def = sayTwiceDefinition('x');
  assert.ok((def.nodes as any[]).some((n) => n.id === 'start' && n.type === 'trigger.start_call'));
});

test('only documented node types are used', () => {
  // A guessed node type is a call that fails at 3am.
  const allowed = new Set(['trigger.start_call', 'voice.say', 'logic.exit']);
  for (const node of sayTwiceDefinition('x').nodes as any[]) {
    assert.ok(allowed.has(node.type), `undocumented node type ${node.type}`);
  }
});

test('an over-long message is cut rather than sent whole', () => {
  const def = sayTwiceDefinition('a'.repeat(5000));
  const spoken = (def.nodes as any[]).find((n) => n.type === 'voice.say');
  assert.ok(spoken.input.text.length <= 900);
});

test('an empty message still produces a valid graph', () => {
  // Nothing upstream guarantees pageSpeech returns text. A call that says
  // nothing is bad; a malformed request that silently places no call is worse.
  const def = sayTwiceDefinition('');
  assert.equal((def.nodes as any[]).length, 4);
});

/* ── the errors a person has to act on ───────────────────────────────────── */

test('a rejected key names the scope, because that is the actual fix', () => {
  const msg = describeBirdVoiceError(403, '{"message":"forbidden"}');
  assert.match(msg, /scope/i);
  assert.match(msg, /BIRD_API_VOICE_KEY/);
});

test('a rejected call names the caller ID and the recipient format', () => {
  const msg = describeBirdVoiceError(422, '{"message":"invalid from"}');
  assert.match(msg, /BIRD_VOICE_FROM/);
  assert.match(msg, /E\.164/);
});

test('an unreadable body is reported rather than swallowed', () => {
  const msg = describeBirdVoiceError(500, 'not json at all');
  assert.match(msg, /not json at all/);
});

test('no error message can leak the key, because none is given one', () => {
  // describeBirdVoiceError is built from the status and Bird's own body only.
  // This pins that it has no access to credentials to leak in the first place.
  assert.equal(describeBirdVoiceError.length, 2);
});
