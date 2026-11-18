/**
 * Reading back a design a language model proposed for an advertisement.
 *
 * Everything in a direction is a claim about a design that will carry the
 * company's name on a public feed. These tests are the distrust: an index
 * outside the range sent, the same photograph twice, a layout the tool does
 * not have, a headline that would overflow its band.
 *
 * The index rule is the one that matters most and is the least obvious. An
 * out-of-range index is rejected WHOLE rather than clamped, because clamping
 * produces a confident pick of a photograph the model never looked at,
 * justified by the model's own reasoning about a different picture.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  DIRECTION_LAYOUTS,
  MAX_HEADLINE,
  isDirection,
  readDirection,
  readHeadline,
} from '../src/app/lib/adDirection.ts';

const good = {
  before: 0,
  after: 3,
  layout: 'side-by-side',
  headline: 'Kitchen stripped and rebuilt',
  why: 'The first shows the old units, the fourth the finished room.',
};

test('a sound direction comes back intact', () => {
  const d = readDirection(good, 5);
  assert.ok(isDirection(d));
  assert.equal(d.before, 0);
  assert.equal(d.after, 3);
  assert.equal(d.layout, 'side-by-side');
  assert.equal(d.headline, 'Kitchen stripped and rebuilt');
});

test('AN INDEX PAST THE END THROWS AWAY THE WHOLE DIRECTION', () => {
  // Not clamped to 4. A clamp would hand back a confident pick of a photo the
  // model never considered, carrying its reasoning about a different one.
  assert.equal(readDirection({ ...good, after: 9 }, 5), null);
  assert.equal(readDirection({ ...good, before: -1 }, 5), null);
  assert.equal(readDirection({ ...good, after: 5 }, 5), null, 'count 5 means 0..4');
});

test('a fractional or unreadable index is refused', () => {
  assert.equal(readDirection({ ...good, before: 1.5 }, 5), null);
  assert.equal(readDirection({ ...good, before: {} }, 5), null);
  assert.equal(readDirection({ ...good, before: true }, 5), null);
});

test('ABSENT IS NOT PHOTOGRAPH ZERO', () => {
  // Number(null) is 0 and Number.isInteger(0) is true, so a reply that never
  // mentioned `before` would be read as 'the first photograph' — confidently,
  // with the model's reasoning attached to a pick it never made.
  assert.equal(readDirection({ ...good, before: null }, 5), null);
  assert.equal(readDirection({ ...good, before: undefined }, 5), null);
  assert.equal(readDirection({ ...good, after: '' }, 5), null);
});

test('a numeric string is taken at its word', () => {
  // Models emit "0" as often as 0. Losing a sound pick and layout over a type
  // quirk punishes a correct answer; inventing an index does something worse.
  const d = readDirection({ ...good, before: '1', after: '4' }, 5);
  assert.ok(isDirection(d));
  assert.equal(d.before, 1);
  assert.equal(d.after, 4);
});

test('the same photograph twice is a before and after of nothing', () => {
  // It renders perfectly and reads as a mistake to the one person who knows
  // the room — the customer.
  assert.equal(readDirection({ ...good, before: 2, after: 2 }, 5), null);
});

test('a layout this tool does not have is refused', () => {
  // An unknown name would fall through to the renderer's default, which is a
  // design nobody chose.
  assert.equal(readDirection({ ...good, layout: 'carousel' }, 5), null);
  assert.equal(readDirection({ ...good, layout: '' }, 5), null);
  assert.equal(readDirection({ ...good, layout: 42 }, 5), null);
});

test('every layout the tool renders is accepted', () => {
  for (const layout of DIRECTION_LAYOUTS) {
    const d = readDirection({ ...good, layout }, 5);
    assert.ok(isDirection(d), `${layout} should be allowed`);
  }
});

test('a refusal is kept as a refusal, not flattened to null', () => {
  // "I could not tell" is worth showing somebody. "Nonsense" is not. A caller
  // has to be able to tell them apart.
  const d = readDirection({ unsure: true, why: 'None of these look finished.' }, 5);
  assert.ok(d && !isDirection(d));
  assert.equal((d as any).why, 'None of these look finished.');
});

test('a refusal with no reason still says something', () => {
  const d = readDirection({ unsure: true }, 5) as any;
  assert.ok(d.why.length > 0);
});

test('rubbish in gives null, not a throw', () => {
  for (const junk of [null, undefined, 'text', 42, [], true]) {
    assert.equal(readDirection(junk, 5), null);
  }
});

test('a headline is collapsed to one line', () => {
  // A newline in a single-line canvas band draws as a box glyph.
  assert.equal(readHeadline('Kitchen\nrebuilt   in   ten days'), 'Kitchen rebuilt in ten days');
});

test('the quotation marks a model wraps a slogan in are stripped', () => {
  assert.equal(readHeadline('"Transformed"'), 'Transformed');
  assert.equal(readHeadline('“Transformed”'), 'Transformed');
});

test('an over-long headline is cut on a word, not mid-word', () => {
  const long = 'A complete and total kitchen transformation carried out across three long weeks';
  const cut = readHeadline(long);
  assert.ok(cut.length <= MAX_HEADLINE);
  // Cut short reads as brevity; cut mid-word reads as a bug.
  assert.ok(!cut.endsWith('-'));
  assert.ok(long.startsWith(cut));
  assert.ok(!/\s$/.test(cut));
});

test('an empty headline does not lose a good pair and layout', () => {
  // A model told not to invent facts, and given none worth a headline, is
  // RIGHT to leave it blank. Failing the direction would punish the honest
  // answer.
  const d = readDirection({ ...good, headline: '' }, 5);
  assert.ok(isDirection(d));
  assert.equal(d.headline, '');

  const missing = readDirection({ ...good, headline: undefined }, 5);
  assert.ok(isDirection(missing));
});

test('one photograph cannot make a before and after', () => {
  assert.equal(readDirection({ ...good, before: 0, after: 0 }, 1), null);
});
