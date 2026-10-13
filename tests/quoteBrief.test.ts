/**
 * Composing what somebody knows about a job into estimator context.
 *
 * The properties that matter, and why:
 *
 *   - a field nobody filled in is ABSENT, not "unknown" — an estimator that
 *     reasons from invented absences produces numbers nobody can account for
 *   - the brief is passed VERBATIM, because summarising it loses exactly the
 *     detail that was worth typing
 *   - exclusions are an instruction, not a note, because "the customer supplies
 *     the tile" buried in a paragraph gets missed
 *   - the section order is fixed, so two similar jobs are prompted alike
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { composeEstimatorContext, BRIEF_MAX } from '../supabase/functions/server/quoteBrief.ts';

/* ── nothing invented ─────────────────────────────────────────────────────── */

test('an empty input composes to nothing at all', () => {
  assert.equal(composeEstimatorContext({}), '');
  assert.equal(composeEstimatorContext(null), '');
  assert.equal(composeEstimatorContext(undefined), '');
});

test('a field nobody filled in does not appear as unknown', () => {
  const out = composeEstimatorContext({ serviceType: 'Decking' });
  assert.ok(out.includes('Trade or service: Decking'));
  // The words that would be a lie about the job.
  assert.equal(/unknown/i.test(out), false);
  assert.equal(/n\/a/i.test(out), false);
  assert.equal(out.includes('Ceiling height'), false);
});

test('a section with no filled lines is dropped whole', () => {
  const out = composeEstimatorContext({ serviceType: 'Decking' });
  assert.ok(out.includes('THE JOB'));
  assert.equal(out.includes('THE SIZE'), false);
  assert.equal(out.includes('THE CONDITIONS'), false);
  assert.equal(out.includes('THE TIMING'), false);
});

test('a zero measurement is not a measurement', () => {
  // "0 square feet" would be read as a fact about the job.
  const out = composeEstimatorContext({ squareFootage: 0, roomCount: '0', ceilingHeight: '' });
  assert.equal(out.includes('THE SIZE'), false);
});

test('measurements are read out of untidy input', () => {
  const out = composeEstimatorContext({ squareFootage: '1,250 sq ft', ceilingHeight: "9'" });
  assert.ok(out.includes('Square footage: 1250'));
  assert.ok(out.includes('Ceiling height (ft): 9'));
});

/* ── the brief ────────────────────────────────────────────────────────────── */

const BRIEF = 'Deck is 16x20. Pressure-treated frame, composite surface. Existing footings are sound and stay. Replacing the slider at the same time.';

test('the brief is passed through verbatim', () => {
  const out = composeEstimatorContext({ brief: BRIEF });
  assert.ok(out.includes(BRIEF), 'the brief must survive untouched');
});

test('the brief is delimited and marked as authoritative', () => {
  const out = composeEstimatorContext({ serviceType: 'Decking', brief: BRIEF });
  assert.ok(out.includes('WHAT THE CONTRACTOR WANTS, IN THEIR OWN WORDS'));
  assert.ok(out.includes('Where it'));
  // Delimiters, so a model does not read the next heading as part of the brief.
  assert.ok(out.includes('---'));
});

test('the brief comes after the structured fields', () => {
  const out = composeEstimatorContext({ serviceType: 'Decking', squareFootage: 320, brief: BRIEF });
  assert.ok(out.indexOf('THE JOB') < out.indexOf(BRIEF));
  assert.ok(out.indexOf('THE SIZE') < out.indexOf(BRIEF));
});

test('an absurd brief is capped rather than refused', () => {
  const out = composeEstimatorContext({ brief: 'x'.repeat(BRIEF_MAX + 5000) });
  assert.ok(out.includes('x'.repeat(100)));
  assert.ok(out.length < BRIEF_MAX + 500);
});

/* ── exclusions ───────────────────────────────────────────────────────────── */

test('exclusions are phrased as an instruction and come last', () => {
  const out = composeEstimatorContext({ brief: BRIEF, exclusions: 'No demolition. Customer supplies the tile.' });
  assert.ok(out.includes('EXCLUDE FROM THIS ESTIMATE'));
  assert.ok(out.includes('Do not price these'));
  assert.ok(out.includes('Customer supplies the tile.'));
  assert.ok(out.indexOf(BRIEF) < out.indexOf('EXCLUDE FROM THIS ESTIMATE'));
});

test('no exclusions means no exclusion block', () => {
  const out = composeEstimatorContext({ brief: BRIEF, exclusions: '   ' });
  assert.equal(out.includes('EXCLUDE'), false);
});

/* ── the order is stable ──────────────────────────────────────────────────── */

test('sections always appear in the same order', () => {
  const full = composeEstimatorContext({
    serviceType: 'Decking', propertyType: 'Single family', workNature: 'Replacing an existing deck',
    unitCount: 1, storeys: 2, accessNotes: 'Side gate, narrow',
    squareFootage: 320, linearFootage: 72, roomCount: 1, ceilingHeight: 9,
    occupancy: 'Occupied', parking: 'Driveway', stairsOrLift: 'Stairs only', workingHours: '8-4 weekdays',
    urgency: 'Within a month', preferredWindow: 'Late October', deadline: '2026-11-15',
  });
  const order = ['THE JOB', 'THE PLACE', 'THE SIZE', 'THE CONDITIONS', 'THE TIMING'];
  const positions = order.map((h) => full.indexOf(h));
  assert.deepEqual(positions, [...positions].sort((a, b) => a - b));
  for (const p of positions) assert.ok(p >= 0);
});

/* ── prior machine analysis still reads as it did ─────────────────────────── */

test('blueprint analysis is summarised the way the routes already emitted it', () => {
  const out = composeEstimatorContext({
    blueprintAnalysis: {
      rooms: [{ name: 'Kitchen' }, { type: 'Bath' }],
      squareFootage: 1800,
      materials: [1, 2, 3],
      estimatedCosts: { total: 42000 },
    },
  });
  assert.ok(out.includes('Prior AI analysis available:'));
  assert.ok(out.includes('- Rooms: 2 (Kitchen, Bath)'));
  assert.ok(out.includes('- Square footage: 1800'));
  assert.ok(out.includes('- AI-suggested material groups: 3'));
});

test('video analysis is accepted in the same slot', () => {
  const out = composeEstimatorContext({ aiVideoAnalysis: { totalSquareFootage: 640 } });
  assert.ok(out.includes('- Square footage: 640'));
});
