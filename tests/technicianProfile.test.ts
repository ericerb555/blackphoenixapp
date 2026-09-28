/**
 * The technician profile, and the two bugs that made these forms unusable.
 *
 * WHAT THIS IS GUARDING
 *
 * Two failures shipped together and hid each other. The required-field check
 * asked `Array.isArray` of an answer stored as an object, so five applications
 * could not be submitted at all; and the preview rendered raw values into JSX,
 * which throws on an object or a FileList. Because the first made the second
 * unreachable, fixing one alone would have swapped a dead end for a crash.
 *
 * Both are shape bugs, so the tests are about shape: what counts as answered,
 * and whether anything that reaches JSX is a string.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  isTechnicianApplication, technicianTrades, technicianCertifications,
  unlistedKeys,
} from '../src/app/lib/applicationFields.ts';
import {
  levelForYears, levelDisagreesWithYears, isLapsed, expiresSoon,
  reliableLevel, probationReviewDate, SKILL_LEVELS,
} from '../src/app/lib/technicianSkills.ts';

/** A field tech application exactly as the rewritten form posts it. */
const technician = {
  id: 'APP-1',
  applicationType: 'field_technician',
  name: 'Sam Pike',
  email: 'sam@example.com',
  trade_ratings: {
    carpentry: { tradeId: 'carpentry', declared: 'advanced', years: 12, tasks: ['carp-cabinets', 'carp-crown'] },
    plumbing: { tradeId: 'plumbing', declared: 'beginner', years: 1, tasks: [] },
    hvac: { tradeId: 'hvac', declared: 'novice', years: 3, tasks: ['hvac-service'] },
  },
  certifications: [
    { typeId: 'epa608', number: 'X-1', state: 'NH', expiresOn: '' },
    { typeId: 'osha10', number: 'Y-2', state: 'NH', expiresOn: '2020-01-01' },
  ],
};

test('a technician application is recognised, a vendor application is not', () => {
  assert.equal(isTechnicianApplication(technician), true);
  assert.equal(isTechnicianApplication({ applicationType: 'employee' }), true);
  assert.equal(isTechnicianApplication({ applicationType: 'maintenance tech' }), true);
  assert.equal(isTechnicianApplication({ applicationType: 'vendor' }), false);
  assert.equal(isTechnicianApplication({}), false);
  assert.equal(isTechnicianApplication(null), false);
});

test('trades come back strongest first, so the answer arrives first', () => {
  const trades = technicianTrades(technician);
  assert.deepEqual(trades.map((t) => t.tradeId), ['carpentry', 'hvac', 'plumbing']);
  assert.equal(trades[0].trade, 'Carpentry');
  assert.equal(trades[0].declared, 'Advanced');
  assert.equal(trades[0].years, 12);
  assert.equal(trades[0].tasks.length, 2);
});

/**
 * The whole point of probation: a claim is not a finding. If `confirmed` ever
 * defaulted to `declared`, an unreviewed technician would read as verified.
 */
test('an unconfirmed trade reports no confirmed level, never the claimed one', () => {
  const trades = technicianTrades(technician);
  assert.equal(trades[0].confirmed, '');
  assert.equal(reliableLevel({ tradeId: 'carpentry', declared: 'advanced', years: 12 }), null);
  assert.equal(reliableLevel({ tradeId: 'carpentry', declared: 'advanced', years: 12, confirmed: 'novice' }), 'novice');
});

test('a confirmed trade reports what was found, not what was claimed', () => {
  const reviewed = {
    ...technician,
    trade_ratings: {
      carpentry: { tradeId: 'carpentry', declared: 'advanced', years: 12, confirmed: 'novice', tasks: [] },
    },
  };
  const [carpentry] = technicianTrades(reviewed);
  assert.equal(carpentry.declared, 'Advanced');
  assert.equal(carpentry.confirmed, 'Novice');
});

test('a level that disagrees with the years is flagged, not rejected', () => {
  const [, , plumbing] = technicianTrades(technician);
  assert.equal(plumbing.tradeId, 'plumbing');
  assert.equal(plumbing.mismatch, false);

  const [odd] = technicianTrades({
    applicationType: 'field_technician',
    trade_ratings: { tile: { tradeId: 'tile', declared: 'beginner', years: 20, tasks: [] } },
  });
  assert.equal(odd.mismatch, true);
});

test('an application with no trade profile yields an empty list rather than throwing', () => {
  assert.deepEqual(technicianTrades({ applicationType: 'field_technician' }), []);
  assert.deepEqual(technicianTrades({ trade_ratings: 'nonsense' }), []);
  assert.deepEqual(technicianTrades(null), []);
  assert.deepEqual(technicianCertifications({ certifications: 'nonsense' }), []);
});

test('a lapsed certification is marked, one with no expiry is not', () => {
  const certs = technicianCertifications(technician);
  assert.equal(certs.length, 2);
  assert.equal(certs[0].label, 'EPA 608');
  assert.equal(certs[0].lapsed, false, 'EPA 608 has no expiry date');
  assert.equal(certs[1].label, 'OSHA 10');
  assert.equal(certs[1].lapsed, true, 'expired in 2020');
});

/**
 * The trade profile has its own panel on the review screen. If these ids were
 * not accounted for, the two most important answers on the application would
 * also be reported as "also submitted, not shown above".
 */
test('the trade profile is not reported as unaccounted for', () => {
  const unlisted = unlistedKeys(technician);
  assert.ok(!unlisted.includes('trade_ratings'));
  assert.ok(!unlisted.includes('certifications'));
});

test('the three levels are the three Eric asked for, and the top one is open-ended', () => {
  assert.deepEqual(SKILL_LEVELS.map((l) => l.label), ['Beginner', 'Novice', 'Advanced']);
  assert.equal(SKILL_LEVELS[2].maxYears, null, 'a twenty-year tradesman must have a rung to pick');
});

test('years map onto a level, including past the top of the stated range', () => {
  assert.equal(levelForYears(0), 'beginner');
  assert.equal(levelForYears(1), 'beginner');
  assert.equal(levelForYears(3), 'novice');
  assert.equal(levelForYears(7), 'advanced');
  assert.equal(levelForYears(30), 'advanced', 'the ladder must not run out');
  assert.equal(levelDisagreesWithYears('advanced', 12), false);
  assert.equal(levelDisagreesWithYears('beginner', 12), true);
  assert.equal(levelDisagreesWithYears('', 12), false, 'nothing claimed is not a disagreement');
});

test('an expiry in the near future is flagged separately from a lapsed one', () => {
  const today = new Date('2026-01-01');
  const soon = { typeId: 'osha10', expiresOn: '2026-02-15' };
  const later = { typeId: 'osha10', expiresOn: '2027-06-01' };
  const gone = { typeId: 'osha10', expiresOn: '2025-06-01' };

  assert.equal(expiresSoon(soon, 90, today), true);
  assert.equal(expiresSoon(later, 90, today), false);
  assert.equal(expiresSoon(gone, 90, today), false, 'already lapsed is not "expiring soon"');
  assert.equal(isLapsed(gone, today), true);
  assert.equal(isLapsed({ typeId: 'epa608', expiresOn: '' }, today), false);
  assert.equal(isLapsed({ typeId: 'x', expiresOn: 'not a date' }, today), false);
});

test('probation runs ninety days from the start', () => {
  assert.equal(probationReviewDate('2026-01-01'), '2026-04-01');
  assert.equal(probationReviewDate('nonsense'), '');
});
