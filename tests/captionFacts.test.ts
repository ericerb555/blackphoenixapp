/**
 * What a caption is allowed to say, enforced rather than requested.
 *
 * The feature promises, on screen, "If it is not written here it will not
 * appear." Until this check existed that promise rested entirely on the model
 * following a prompt, which on this platform it has repeatedly not done.
 *
 * Two failure directions, and the second is the one that gets checks deleted.
 * Letting an invented testimonial or price through is the obvious harm. But a
 * screen that fires on honest copy — on a hashtag with a year in it, or on the
 * word "cabinets" in a post about a kitchen — is a screen somebody switches
 * off within a week, and then the first failure is back with nothing watching.
 * So the false-positive cases are asserted as carefully as the true ones.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  screenCaption, screenChannel, numbersIn, describeFindings,
} from '../src/app/lib/captionFacts.ts';

const FACTS = 'gutted the kitchen, new cabinets and a quartz worktop, moved the sink to the window';

/* ── the thing it was built to stop ──────────────────────────────────────── */

test('an invented testimonial is caught', () => {
  const caption = 'The homeowners said "we could not be happier with the result" — swipe to see.';
  const found = screenCaption(caption, FACTS);
  assert.ok(found.some((f) => f.kind === 'quote'), 'the quote was not caught');
});

test('an invented price and timescale are caught', () => {
  const found = screenCaption('A full kitchen transformation in 2 weeks, from $15,000.', FACTS);
  const numbers = found.filter((f) => f.kind === 'number').map((f) => f.found);
  assert.ok(numbers.includes('2'), 'the timescale slipped through');
  assert.ok(numbers.includes('15000'), 'the price slipped through');
});

test('a number spelled out is caught like a number written down', () => {
  const found = screenCaption('Finished in three days flat.', FACTS);
  assert.ok(found.some((f) => f.kind === 'number' && f.found === '3'));
});

test('awards, ratings and guarantees are caught', () => {
  for (const claim of [
    'Our award-winning team did it again.',
    'Rated 5-star by homeowners across Salem.',
    'Every job guaranteed for life.',
    'Licensed and insured, as always.',
    'Over twenty years in business.',
  ]) {
    assert.ok(screenCaption(claim, FACTS).length > 0, `let through: ${claim}`);
  }
});

test('a reported customer feeling is caught even without quotation marks', () => {
  assert.ok(screenCaption('The client loved the new layout.', FACTS).length > 0);
  assert.ok(screenCaption('They were thrilled with how it turned out.', FACTS).length > 0);
});

/* ── and the copy it must leave alone ────────────────────────────────────── */

test('honest copy describing the photographs passes clean', () => {
  // Materials are deliberately not screened: the writer is TOLD to describe
  // what changed between the two pictures, and a kitchen photo shows cabinets.
  for (const good of [
    'Same kitchen, two very different mornings. Swipe to see the change.',
    'The sink now sits under the window. Everything else in this room changed with it.',
    'New cabinets, a quartz worktop, and a room that finally works.',
  ]) {
    assert.deepEqual(screenCaption(good, FACTS), [], `wrongly flagged: ${good}`);
  }
});

test('a hashtag with a year in it is a label, not an invented figure', () => {
  // The quickest way to get a check like this switched off is to fire on this.
  assert.deepEqual(screenCaption('Done and dusted. #KitchenReno2026 #SalemNH', FACTS), []);
});

test('a figure the user actually wrote is allowed through', () => {
  const facts = 'replaced 42 linear feet of worktop in a 1950s kitchen';
  assert.deepEqual(screenCaption('42 feet of new worktop in this 1950s kitchen.', facts), []);
});

test('a claim the user wrote themselves is allowed through', () => {
  // The rule is not that it may never be said — it is that the writer may not
  // be the one who decides it.
  const facts = 'kitchen refit; we are licensed and insured in NH';
  assert.deepEqual(screenCaption('Licensed and insured, start to finish.', facts), []);
});

test('a short quoted phrase is not mistaken for a testimonial', () => {
  assert.deepEqual(screenCaption('The brief was "open it up". Done.', FACTS), []);
});

/* ── the plumbing ────────────────────────────────────────────────────────── */

test('numbersIn ignores urls and hashtags but reads money and thousands', () => {
  const got = numbersIn('Visit site24.com/x #Reno2026 for $1,250.50 and 7 days');
  assert.ok(got.has(1250.5));
  assert.ok(got.has(7));
  assert.ok(!got.has(2026), 'a hashtag year was treated as a claim');
});

test('a channel is screened across title, body and hashtags as one', () => {
  const findings = screenChannel(
    { title: 'Done in 2 weeks', body: 'Finished in 2 weeks flat', hashtags: ['#reno'] },
    FACTS,
  );
  // The same invention twice is one fault, not two.
  assert.equal(findings.filter((f) => f.found === '2').length, 1);
});

test('an empty caption has nothing wrong with it', () => {
  assert.deepEqual(screenCaption('', FACTS), []);
  assert.deepEqual(screenChannel(null, FACTS), []);
  assert.deepEqual(screenChannel(undefined, ''), []);
});

test('the summary names what was struck out and does not run on', () => {
  const findings = screenCaption('In 2 weeks for $15,000, rated 5-star, guaranteed.', FACTS);
  const line = describeFindings(findings);
  assert.match(line, /not in what you wrote/);
  assert.ok(line.length < 200, 'the toast would not fit on a phone');
});
