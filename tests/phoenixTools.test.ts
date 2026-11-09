/**
 * What the assistant may look at.
 *
 * Two properties matter here and neither is visible by reading the route:
 * that every tool is read-only, and that a column added to `ai_call_log`
 * later does not silently become something the assistant can read out.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  PHOENIX_TOOLS, PHOENIX_SYSTEM, TOOL_NAMES, isKnownTool,
  clampHours, clampLimit, CALL_FIELDS, publicCallRow,
} from '../supabase/functions/server/phoenixTools.ts';

/* ── read-only is the whole design ──────────────────────────────────────── */

test('no tool is named for an action', () => {
  // Autonomy Level 1. Adding a write tool should be its own commit with an
  // approval gate, not a line appended to the array — so this fails loudly.
  // Matched at the START of the name, because a tool is named for its verb.
  // `ai_stop_status` READS whether the stop is engaged — the earlier version
  // of this rule matched "stop" anywhere and flagged it, which is the kind
  // of false positive that gets a test deleted rather than fixed.
  for (const t of PHOENIX_TOOLS) {
    assert.doesNotMatch(t.name, /^(send|post|create|update|delete|charge|publish|set|write|run|start)_/i,
      `${t.name} reads like an action`);
    assert.doesNotMatch(t.description, /\b(sends?|creates?|deletes?|charges?|publishes?) /i,
      `${t.name} describes itself as acting`);
  }
  // Pinned by name. A new tool appearing here should be a deliberate
  // decision somebody made, not something that arrived with a feature.
  assert.deepEqual([...TOOL_NAMES].sort(), [
    'ai_activity_summary', 'ai_stop_status', 'alerts', 'business_snapshot',
    'leads', 'quotes_and_invoices', 'recent_ai_calls', 'work_requests',
  ]);
});

test('the brief says it cannot act, and where the control is', () => {
  assert.match(PHOENIX_SYSTEM, /You can only read/);
  assert.match(PHOENIX_SYSTEM, /AI\s*\n?Diagnostics/);
});

test('the brief forbids inventing figures', () => {
  // The one rule that makes its answers worth anything.
  assert.match(PHOENIX_SYSTEM, /Every number you give must come from a tool call/);
  assert.match(PHOENIX_SYSTEM, /Never\s*\n?estimate/);
});

test('the brief explains the two things a reader would misread', () => {
  assert.match(PHOENIX_SYSTEM, /ESTIMATES/);
  assert.match(PHOENIX_SYSTEM, /gpt-image-1/);            // no price, not free
  assert.match(PHOENIX_SYSTEM, /did not finish/);          // running != in progress
});

/* ── the column allowlist ────────────────────────────────────────────────── */

test('actor_email is never exposed to the assistant', () => {
  // The ledger holds who asked. That is a person, and the assistant has no
  // reason to see it to answer "what has the AI been doing".
  assert.ok(!CALL_FIELDS.includes('actor_email'));
  const row = publicCallRow({ agent: 'x', actor_email: 'eric@example.com', outcome: 'ok' });
  assert.equal(row.actor_email, undefined);
  assert.equal(row.agent, 'x');
});

test('a column added later is private until it is named', () => {
  // Allowlist, not redaction list. A new `prompt_text` column must not leak
  // by default.
  const row = publicCallRow({ agent: 'x', prompt_text: 'secret', input_digest: 'abc' });
  assert.deepEqual(Object.keys(row), ['agent']);
});

test('the fields that are exposed are the ones an answer needs', () => {
  for (const f of ['agent', 'operation', 'outcome', 'cost_cents', 'error']) {
    assert.ok(CALL_FIELDS.includes(f), `${f} should be readable`);
  }
});

/* ── clamping what the model asks for ────────────────────────────────────── */

test('hours is clamped to the retention window', () => {
  // The model infers these from a sentence, so it occasionally asks for a
  // year. Beyond ninety days is a slower query returning the same rows.
  assert.equal(clampHours(24 * 365), 24 * 90);
  assert.equal(clampHours(12), 12);
});

test('a nonsense window falls back rather than failing', () => {
  for (const bad of [undefined, null, 'soon', -5, 0, NaN]) {
    assert.equal(clampHours(bad), 24, String(bad));
  }
});

test('limit is capped and defaults sanely', () => {
  assert.equal(clampLimit(5000), 100);
  assert.equal(clampLimit(10), 10);
  assert.equal(clampLimit(undefined), 20);
  assert.equal(clampLimit(-1), 20);
});

/* ── dispatch ────────────────────────────────────────────────────────────── */

test('only the declared tools are dispatchable', () => {
  assert.equal(isKnownTool('ai_activity_summary'), true);
  assert.equal(isKnownTool('delete_everything'), false);
  assert.equal(isKnownTool(''), false);
  assert.equal(isKnownTool(undefined), false);
});

test('every tool declares a schema that rejects stray fields', () => {
  for (const t of PHOENIX_TOOLS) {
    assert.equal((t.input_schema as any).additionalProperties, false, t.name);
    assert.equal((t.input_schema as any).type, 'object', t.name);
  }
});

test('every tool says when to use it, not just what it is', () => {
  // A description that only names the tool gets called at the wrong moment.
  for (const t of PHOENIX_TOOLS) {
    assert.ok(t.description.length > 60, `${t.name} needs a fuller description`);
    // "Use this for…", and also "Use this FIRST for…" — the cue is the
    // for/when, not the exact wording in between.
    assert.match(t.description, /\bUse\b[^.]{0,24}\b(for|when)\b/i,
      `${t.name} should say when to use it`);
  }
});
