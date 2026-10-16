/**
 * Which refund policy governed a charge, and what may be published as one.
 *
 * WHY THESE EXIST
 *
 * Stripe's dispute evidence asks for the refund policy and for where the
 * customer saw it. The honest answer is the policy **as it stood on the day
 * they paid** — and the moment after a losing dispute is exactly when somebody
 * is tempted to go and edit it. So the two rules pinned hardest here are:
 *
 *   policyInForce   returns the version in effect AT THE TIME, and returns
 *                   NULL rather than falling back to the current one
 *   canPublish      refuses a draft that still reads like a draft
 *
 * The null case is the one worth the most attention. Falling back to today's
 * policy is one line, it reads perfectly on a screen, and it is a false
 * statement to a bank about what a customer could have seen.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  canPublish, policyInForce, currentPolicy, publishedVersions,
  policySnapshot, nextVersion,
  type CompanyPolicy, type PolicyVersion,
} from '../supabase/functions/server/refundPolicy.ts';

const section = (heading = 'Refunds', body = 'We refund unused deposits within fourteen days of a written request.') =>
  ({ heading, body });

const version = (over: Partial<PolicyVersion> = {}): PolicyVersion => ({
  version: 1,
  effectiveFrom: '2026-01-01T00:00:00Z',
  publishedAt: '2026-01-01T00:00:00Z',
  sections: [section()],
  updatedAt: '2026-01-01T00:00:00Z',
  ...over,
});

const policy = (versions: PolicyVersion[]): CompanyPolicy => ({
  companyId: 'bpb-8544',
  companyName: 'Black Phoenix Builds',
  versions,
});

/* ── which version governed the charge ──────────────────────────────────── */

test('the version in effect at the time is the one, not the newest', () => {
  const p = policy([
    version({ version: 1, effectiveFrom: '2026-01-01T00:00:00Z', publishedAt: '2026-01-01T00:00:00Z' }),
    version({ version: 2, effectiveFrom: '2026-06-01T00:00:00Z', publishedAt: '2026-06-01T00:00:00Z' }),
  ]);
  assert.equal(policyInForce(p, '2026-03-15T00:00:00Z')?.version, 1);
  assert.equal(policyInForce(p, '2026-09-15T00:00:00Z')?.version, 2);
});

test('a charge before any policy existed returns NULL, never the current one', () => {
  // The whole point. Falling back to today's policy would tell a bank the
  // customer saw terms that did not exist when they paid.
  const p = policy([version({ effectiveFrom: '2026-06-01T00:00:00Z', publishedAt: '2026-06-01T00:00:00Z' })]);
  assert.equal(policyInForce(p, '2026-01-15T00:00:00Z'), null);
});

test('a charge exactly at the effective instant is governed by it', () => {
  const p = policy([version({ effectiveFrom: '2026-06-01T00:00:00Z', publishedAt: '2026-06-01T00:00:00Z' })]);
  assert.equal(policyInForce(p, '2026-06-01T00:00:00Z')?.version, 1);
});

test('an unpublished draft never governs anything, however old', () => {
  const p = policy([version({ publishedAt: null, effectiveFrom: '2020-01-01T00:00:00Z' })]);
  assert.equal(policyInForce(p, '2026-06-01T00:00:00Z'), null);
});

test('a company with no policy at all returns null rather than throwing', () => {
  assert.equal(policyInForce(null, '2026-06-01T00:00:00Z'), null);
  assert.equal(policyInForce(undefined, '2026-06-01T00:00:00Z'), null);
  assert.equal(policyInForce(policy([]), '2026-06-01T00:00:00Z'), null);
});

test('an unreadable charge date yields null rather than a guess', () => {
  const p = policy([version()]);
  assert.equal(policyInForce(p, 'not a date'), null);
  assert.equal(policyInForce(p, ''), null);
});

test('a version with an unreadable effective date is ignored, not crashed on', () => {
  const p = policy([
    version({ version: 1, effectiveFrom: 'whenever', publishedAt: '2026-01-01T00:00:00Z' }),
    version({ version: 2, effectiveFrom: '2026-02-01T00:00:00Z', publishedAt: '2026-02-01T00:00:00Z' }),
  ]);
  assert.equal(policyInForce(p, '2026-06-01T00:00:00Z')?.version, 2);
});

test('versions out of order in the array still resolve correctly', () => {
  // Append-only storage does not guarantee sorted, and a dispute is not the
  // moment to discover that.
  const p = policy([
    version({ version: 3, effectiveFrom: '2026-09-01T00:00:00Z', publishedAt: '2026-09-01T00:00:00Z' }),
    version({ version: 1, effectiveFrom: '2026-01-01T00:00:00Z', publishedAt: '2026-01-01T00:00:00Z' }),
    version({ version: 2, effectiveFrom: '2026-05-01T00:00:00Z', publishedAt: '2026-05-01T00:00:00Z' }),
  ]);
  assert.equal(policyInForce(p, '2026-06-15T00:00:00Z')?.version, 2);
});

test('currentPolicy is what a customer sees now', () => {
  const p = policy([
    version({ version: 1, effectiveFrom: '2026-01-01T00:00:00Z', publishedAt: '2026-01-01T00:00:00Z' }),
    // Dated in the future: published but not yet in force.
    version({ version: 2, effectiveFrom: '2099-01-01T00:00:00Z', publishedAt: '2026-06-01T00:00:00Z' }),
  ]);
  assert.equal(currentPolicy(p, '2026-07-01T00:00:00Z')?.version, 1);
});

test('publishedVersions excludes drafts and sorts newest first', () => {
  const p = policy([
    version({ version: 1, effectiveFrom: '2026-01-01T00:00:00Z', publishedAt: '2026-01-01T00:00:00Z' }),
    version({ version: 2, effectiveFrom: '2026-06-01T00:00:00Z', publishedAt: null }),
    version({ version: 3, effectiveFrom: '2026-09-01T00:00:00Z', publishedAt: '2026-09-01T00:00:00Z' }),
  ]);
  assert.deepEqual(publishedVersions(p).map((v) => v.version), [3, 1]);
});

/* ── what may be published ──────────────────────────────────────────────── */

test('a real policy can be published', () => {
  assert.deepEqual(canPublish(version()), { ok: true });
});

test('nothing, no sections, or an empty section list is refused', () => {
  assert.equal(canPublish(null).ok, false);
  assert.equal(canPublish(undefined).ok, false);
  assert.equal(canPublish(version({ sections: [] })).ok, false);
});

test('placeholder text is refused, with the reason a bank would notice', () => {
  for (const bad of ['{{company}} refunds within 14 days of purchase', 'TODO write this properly', 'TBD pending legal review']) {
    const verdict = canPublish(version({ sections: [section('Refunds', bad)] }));
    assert.equal(verdict.ok, false, `should refuse: ${bad}`);
    assert.match(String(verdict.why), /placeholder/i);
  }
});

test('a heading with nothing under it is refused', () => {
  const verdict = canPublish(version({ sections: [section('Cancellations', '')] }));
  assert.equal(verdict.ok, false);
  // Names the section, so whoever is publishing can find the empty one.
  assert.match(String(verdict.why), /Cancellations/);
});

test('"see invoice" and "n/a" are refused as bodies', () => {
  // These are the real-world non-answers, and the length floor exists to catch
  // exactly them rather than to have an opinion about prose.
  assert.equal(canPublish(version({ sections: [section('Refunds', 'n/a')] })).ok, false);
  assert.equal(canPublish(version({ sections: [section('Refunds', 'See invoice.')] })).ok, false);
});

test('a section with no heading is refused', () => {
  assert.equal(canPublish(version({ sections: [section('', 'A perfectly good paragraph of real policy text here.')] })).ok, false);
});

test('a policy with no effective date is refused, because it cannot be matched to an order', () => {
  const verdict = canPublish(version({ effectiveFrom: '' }));
  assert.equal(verdict.ok, false);
  assert.match(String(verdict.why), /takes effect|matched to an order/i);
});

test('the refusal names the offending section so it can be found', () => {
  const verdict = canPublish(version({
    sections: [section('Refunds'), section('Shipping', 'TODO')],
  }));
  assert.equal(verdict.ok, false);
  assert.match(String(verdict.why), /Shipping/);
});

/* ── the snapshot that goes on the order ────────────────────────────────── */

test('a snapshot copies the text rather than referencing it', () => {
  const live = version();
  const p = policy([live]);
  const snap = policySnapshot(p, {
    at: '2026-03-01T00:00:00Z',
    disclosureUrl: 'https://example.com/refund-policy',
    shownAt: 'checkout',
  });
  assert.ok(snap);
  // Mutating the source afterwards must not change what was frozen — this is
  // the property that makes it evidence rather than an assertion.
  live.sections[0].body = 'Actually we never refund anything.';
  assert.match(snap!.sections[0].body, /fourteen days/);
});

test('a snapshot records the version, the date and the URL a bank will ask for', () => {
  const snap = policySnapshot(policy([version({ version: 4 })]), {
    at: '2026-03-01T00:00:00Z',
    disclosureUrl: 'https://example.com/refund-policy',
  });
  assert.equal(snap?.version, 4);
  assert.equal(snap?.capturedAt, '2026-03-01T00:00:00Z');
  assert.equal(snap?.disclosureUrl, 'https://example.com/refund-policy');
  assert.equal(snap?.companyId, 'bpb-8544');
});

test('shownAt defaults to the weaker claim, not the stronger one', () => {
  // "They saw it at checkout" is a much better answer than "it was published
  // somewhere". It must be asserted deliberately, never assumed.
  const snap = policySnapshot(policy([version()]), {
    at: '2026-03-01T00:00:00Z',
    disclosureUrl: 'https://example.com/refund-policy',
  });
  assert.equal(snap?.shownAt, 'page');
});

test('no policy in force means no snapshot, so the absence is recordable', () => {
  const snap = policySnapshot(policy([version({ publishedAt: null })]), {
    at: '2026-03-01T00:00:00Z',
    disclosureUrl: 'https://example.com/refund-policy',
  });
  assert.equal(snap, null);
});

/* ── version numbering ──────────────────────────────────────────────────── */

test('versions never collide or get reused', () => {
  assert.equal(nextVersion(null), 1);
  assert.equal(nextVersion(policy([])), 1);
  assert.equal(nextVersion(policy([version({ version: 1 }), version({ version: 2 })])), 3);
  // Even if the highest is not last in the array.
  assert.equal(nextVersion(policy([version({ version: 7 }), version({ version: 2 })])), 8);
});
