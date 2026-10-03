/**
 * The store's clock, where being wrong is expensive and silent.
 *
 * Three failure modes are asserted here because none of them would announce
 * itself: a secret check that accepts what it should refuse, a settings reader
 * that turns a half-written record into an armed job that spends money, and a
 * staleness judgement that reports a dead scheduler as healthy.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  normaliseSettings, secretMatches, leaseIsHeld, clockHealth, disabledJobs,
  DEFAULT_SETTINGS, STALE_AFTER_MINUTES, MAX_ORDERS_CEILING, MAX_SPEND_CEILING,
  askIsWellFormed, askIsOpen, applyAnswer,
} from '../supabase/functions/server/storeTickRules.ts';

const NOW = new Date('2026-10-03T12:00:00.000Z');
const minutesAgo = (m: number) => new Date(NOW.getTime() - m * 60_000).toISOString();

// ── The secret ──────────────────────────────────────────────────────────────

test('an unset secret refuses everything, including an empty offer', () => {
  assert.equal(secretMatches('', ''), false);
  assert.equal(secretMatches('anything', ''), false);
  assert.equal(secretMatches('', 'the-real-secret'), false);
});

test('only the exact secret matches', () => {
  const secret = 'Zm9vYmFyYmF6cXV1eA==';
  assert.equal(secretMatches(secret, secret), true);
  assert.equal(secretMatches(secret.toLowerCase(), secret), false);
  assert.equal(secretMatches(secret + 'x', secret), false);
  assert.equal(secretMatches(secret.slice(0, -1), secret), false);
});

test('a correct prefix is not enough', () => {
  // The whole point of the constant-time compare: a caller who has guessed the
  // first twenty bytes is no closer than one who has guessed none.
  const secret = 'abcdefghijklmnopqrstuvwxyz';
  assert.equal(secretMatches('abcdefghijklmnopqrst', secret), false);
  assert.equal(secretMatches('a', secret), false);
});

test('multi-byte characters compare by bytes, not by code units', () => {
  assert.equal(secretMatches('secret-é', 'secret-é'), true);
  assert.equal(secretMatches('secret-e', 'secret-é'), false);
});

// ── Settings ────────────────────────────────────────────────────────────────

test('nothing stored means the heartbeat only', () => {
  const s = normaliseSettings(undefined);
  assert.deepEqual(s.jobs, { heartbeat: true });
  assert.equal(s.maxOrdersPerTick, DEFAULT_SETTINGS.maxOrdersPerTick);
  assert.equal(s.maxSpendPerTick, DEFAULT_SETTINGS.maxSpendPerTick);
});

test('a job absent from the record is off, never on', () => {
  const s = normaliseSettings({ jobs: { heartbeat: true } });
  assert.equal(s.jobs.fulfil, undefined);
  assert.notEqual(s.jobs.fulfil, true);
});

test('only true enables a job — a half-written record cannot spend money', () => {
  // This is the one that matters. A stored "yes", 1, or "true" must not place
  // supplier orders, because none of them is a deliberate switch-on.
  for (const truthy of ['yes', 1, 'true', {}, [], 'on']) {
    const s = normaliseSettings({ jobs: { fulfil: truthy } });
    assert.equal(s.jobs.fulfil, false, `${JSON.stringify(truthy)} must not enable a job`);
  }
  assert.equal(normaliseSettings({ jobs: { fulfil: true } }).jobs.fulfil, true);
});

test('the heartbeat cannot be switched off, however the record says so', () => {
  assert.equal(normaliseSettings({ jobs: { heartbeat: false } }).jobs.heartbeat, true);
  assert.equal(normaliseSettings({ jobs: {} }).jobs.heartbeat, true);
  assert.equal(normaliseSettings({ jobs: null }).jobs.heartbeat, true);
  assert.equal(normaliseSettings('nonsense').jobs.heartbeat, true);
});

test('ceilings outside their range fall back to the default rather than through', () => {
  assert.equal(normaliseSettings({ maxOrdersPerTick: 0 }).maxOrdersPerTick, DEFAULT_SETTINGS.maxOrdersPerTick);
  assert.equal(normaliseSettings({ maxOrdersPerTick: -5 }).maxOrdersPerTick, DEFAULT_SETTINGS.maxOrdersPerTick);
  assert.equal(normaliseSettings({ maxOrdersPerTick: MAX_ORDERS_CEILING + 1 }).maxOrdersPerTick, DEFAULT_SETTINGS.maxOrdersPerTick);
  assert.equal(normaliseSettings({ maxSpendPerTick: MAX_SPEND_CEILING + 1 }).maxSpendPerTick, DEFAULT_SETTINGS.maxSpendPerTick);
  assert.equal(normaliseSettings({ maxSpendPerTick: 'lots' }).maxSpendPerTick, DEFAULT_SETTINGS.maxSpendPerTick);
  // And a sane value is kept.
  assert.equal(normaliseSettings({ maxOrdersPerTick: 40 }).maxOrdersPerTick, 40);
  assert.equal(normaliseSettings({ maxOrdersPerTick: 40.9 }).maxOrdersPerTick, 40);
});

// ── The lease ───────────────────────────────────────────────────────────────

test('no lease, a released lease and a malformed lease all mean "go"', () => {
  assert.equal(leaseIsHeld(null, NOW), false);
  assert.equal(leaseIsHeld({}, NOW), false);
  assert.equal(leaseIsHeld({ until: new Date(0).toISOString() }, NOW), false);
  assert.equal(leaseIsHeld({ until: 'not a date' }, NOW), false);
});

test('a lease in the future holds, one in the past does not', () => {
  assert.equal(leaseIsHeld({ until: minutesAgo(-5) }, NOW), true);
  assert.equal(leaseIsHeld({ until: minutesAgo(1) }, NOW), false);
});

// ── Health ──────────────────────────────────────────────────────────────────

test('never run is told apart from stopped', () => {
  // Different answers on purpose: "never-run" points at the schedule or the
  // 401 auth-gate trap, "stale" points at something that ran and then stopped.
  assert.equal(clockHealth(null, NOW), 'never-run');
  assert.equal(clockHealth(undefined, NOW), 'never-run');
  assert.equal(clockHealth('', NOW), 'never-run');
  assert.equal(clockHealth('rubbish', NOW), 'never-run');
});

test('a clock that ran recently is healthy, and one that stopped is stale', () => {
  assert.equal(clockHealth(minutesAgo(5), NOW), 'healthy');
  assert.equal(clockHealth(minutesAgo(STALE_AFTER_MINUTES - 1), NOW), 'healthy');
  assert.equal(clockHealth(minutesAgo(STALE_AFTER_MINUTES + 1), NOW), 'stale');
  assert.equal(clockHealth(minutesAgo(60 * 24), NOW), 'stale');
});

test('a fifteen-minute schedule is comfortably inside the stale threshold', () => {
  // Otherwise a healthy clock would report itself broken between ticks.
  assert.ok(STALE_AFTER_MINUTES > 15 * 2, 'two missed ticks should not read as stale');
});

// ── Reporting ───────────────────────────────────────────────────────────────

test('the heartbeat reports which jobs are registered and off', () => {
  const settings = normaliseSettings({ jobs: { heartbeat: true, fulfil: true } });
  const off = disabledJobs(['heartbeat', 'fulfil', 'track', 'catalogue'], settings);
  assert.deepEqual(off, ['track', 'catalogue']);
  assert.equal(disabledJobs(['heartbeat'], settings).length, 0);
});

// ── Asking a person, and answering ──────────────────────────────────────────

const ASK = {
  id: 'track--order:BP-1',
  job: 'track',
  dedupeKey: 'order:BP-1',
  question: 'What should we do about this order?',
  because: 'CJ will not say what happened to it.',
  choices: [
    { key: 'keep-trying', label: 'Keep trying' },
    { key: 'manual', label: 'I will check by hand' },
  ],
  detail: [['Order', 'BP-1']] as Array<[string, string]>,
  status: 'open' as const,
  raisedAt: NOW.toISOString(),
};

test('an ask must be answerable, or it is not worth the space it takes', () => {
  assert.equal(askIsWellFormed(ASK).ok, true);
  assert.equal(askIsWellFormed({ ...ASK, job: '' }).ok, false);
  assert.equal(askIsWellFormed({ ...ASK, dedupeKey: '' }).ok, false);
  assert.equal(askIsWellFormed({ ...ASK, question: '' }).ok, false);
  // The reason is required: an ask that does not say why the machine stopped
  // asks a person to reconstruct the machine's reasoning before deciding.
  assert.equal(askIsWellFormed({ ...ASK, because: '' }).ok, false);
});

test('one option is not a decision', () => {
  assert.equal(askIsWellFormed({ ...ASK, choices: [ASK.choices[0]] }).ok, false);
  assert.equal(askIsWellFormed({ ...ASK, choices: [] }).ok, false);
});

test('choices need keys and labels, and may not collide', () => {
  assert.equal(askIsWellFormed({ ...ASK, choices: [{ key: 'a', label: '' }, { key: 'b', label: 'B' }] as any }).ok, false);
  assert.equal(askIsWellFormed({ ...ASK, choices: [{ key: '', label: 'A' }, { key: 'b', label: 'B' }] as any }).ok, false);
  assert.equal(askIsWellFormed({ ...ASK, choices: [{ key: 'a', label: 'A' }, { key: 'a', label: 'Also A' }] }).ok, false);
});

test('an answer the ask never offered is refused', () => {
  // A job acts on `answer`, so an answer outside the offered set is an
  // instruction it has no code for — better refused than stored to be misread.
  const out = applyAnswer(ASK, 'refund', { now: NOW });
  assert.equal(out.ok, false);
  assert.match(String(out.error), /not one of the options/);
});

test('an offered answer is recorded with who said it and what they added', () => {
  const out = applyAnswer(ASK, 'manual', { by: 'eric@example.com', note: 'Checked CJ, it shipped.', now: NOW });
  assert.equal(out.ok, true);
  assert.equal(out.ask!.status, 'answered');
  assert.equal(out.ask!.answer, 'manual');
  assert.equal(out.ask!.answeredBy, 'eric@example.com');
  assert.equal(out.ask!.note, 'Checked CJ, it shipped.');
  assert.equal(out.ask!.answeredAt, NOW.toISOString());
});

test('answering twice does not overwrite the first decision', () => {
  const first = applyAnswer(ASK, 'manual', { now: NOW });
  const second = applyAnswer(first.ask!, 'keep-trying', { now: NOW });
  assert.equal(second.ok, false);
  assert.match(String(second.error), /already answered/);
});

test('a withdrawn ask cannot be answered either', () => {
  const withdrawn = { ...ASK, status: 'withdrawn' as const };
  const out = applyAnswer(withdrawn, 'manual', { now: NOW });
  assert.equal(out.ok, false);
  assert.equal(askIsOpen(withdrawn), false);
  assert.equal(askIsOpen(ASK), true);
});

test('a long note is kept but bounded', () => {
  const out = applyAnswer(ASK, 'manual', { note: 'x'.repeat(5000), now: NOW });
  assert.equal(out.ok, true);
  assert.equal(out.ask!.note!.length, 2000);
});
