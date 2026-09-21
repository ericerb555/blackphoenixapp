/**
 * The design assistant's prompt — is it told the right thing?
 *
 * WHY THESE ASSERTIONS AND NOT OTHERS
 *
 * Prompt quality cannot be unit-tested and this does not try. What can be
 * tested is everything the model never gets a say in: which trade's knowledge
 * was selected, whether an unrecognised trade falls back safely instead of
 * producing a prompt with `undefined` in it, whether a proposal can be made for
 * a trade with nothing to apply it to, and whether a dimension read off a
 * photograph is still labelled as one by the time the model sees it.
 *
 * Every one of those was a real defect or a real risk, and checking any of them
 * by asking the live assistant would cost money per assertion and give a
 * different answer each run.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  readTrade, systemFor, describe, describeHouse, describePlan, TRADE_BRIEF, CHANGE_FIELDS,
} from '../supabase/functions/server/assistantPrompt.ts';

// ── picking a trade ────────────────────────────────────────────────────────

test('every trade the design centre lists has knowledge behind it', () => {
  // Kept in step with lib/trades.ts by hand; a trade with no brief would get a
  // prompt containing the word "undefined".
  for (const id of [
    'deck', 'addition', 'structures', 'hardscape', 'siding', 'openings',
    'kitchen', 'bathroom', 'flooring', 'roofing',
  ]) {
    assert.ok(TRADE_BRIEF[id], `${id} has no brief`);
    assert.ok(!systemFor(id).includes('undefined'), `${id} produced a prompt with undefined in it`);
  }
});

test('an unknown or missing trade falls back to the deck rather than breaking', () => {
  for (const bad of ['', 'plumbing', null, undefined, 42, {}]) {
    assert.equal(readTrade(bad as any), 'deck');
  }
});

test('a trade cannot be smuggled in via a prototype property', () => {
  // `hasOwnProperty` rather than `in`, so "toString" is not a trade.
  assert.equal(readTrade('toString'), 'deck');
  assert.equal(readTrade('constructor'), 'deck');
});

// ── the right knowledge reaches the right question ─────────────────────────

test('a bathroom question is given fixture clearances, not span tables', () => {
  const prompt = systemFor('bathroom');
  assert.match(prompt, /clearance/i);
  assert.match(prompt, /toilet/i);
  assert.ok(!/DCA 6/.test(prompt), 'the deck standard has no business in a bathroom prompt');
  assert.ok(!/joist/i.test(prompt), 'this is the exact failure the split was for');
});

test('a kitchen question is given clearances and ventilation', () => {
  const prompt = systemFor('kitchen');
  assert.match(prompt, /walkway|aisle/i);
  assert.match(prompt, /hood|ventilation/i);
  assert.ok(!/DCA 6/.test(prompt));
});

test('a deck question still gets the deck standard', () => {
  const prompt = systemFor('deck');
  assert.match(prompt, /DCA 6/);
  assert.match(prompt, /ledger/i);
});

test('the shared rules are in every trade prompt, not just the deck one', () => {
  for (const id of Object.keys(TRADE_BRIEF)) {
    const prompt = systemFor(id);
    assert.match(prompt, /Be brief/i, `${id} lost the brevity rule`);
    assert.match(prompt, /load-bearing/i, `${id} lost the bearing-wall rule`);
    assert.match(prompt, /photograph/i, `${id} lost the photo-provenance rule`);
  }
});

// ── what may be proposed ───────────────────────────────────────────────────

test('only the deck may have changes proposed against it', () => {
  assert.ok(CHANGE_FIELDS.deck, 'the deck has a patchable model');
  for (const id of Object.keys(TRADE_BRIEF)) {
    if (id === 'deck') continue;
    assert.equal(CHANGE_FIELDS[id], undefined, `${id} has no model to patch`);
    assert.match(systemFor(id), /must\s*\n?always be an empty array/i,
      `${id} must be told not to propose changes`);
  }
});

test('the deck prompt names the fields it may actually set', () => {
  const prompt = systemFor('deck');
  for (const f of ['joistSize', 'beamSize', 'postSize', 'guardrail']) {
    assert.ok(prompt.includes(f), `${f} missing from the deck field list`);
  }
});

// ── the building travels with the question ─────────────────────────────────

const house = {
  views: [
    {
      kind: 'room', name: 'Main bath', widthFt: 9, depthFt: 5.5, heightFt: 8,
      openings: [{ kind: 'window', widthFt: 3, heightFt: 3, offsetFt: 3 }],
      source: { widthFt: 'photos', depthFt: 'photos', heightFt: 'measured', openings: 'photos' },
    },
    {
      kind: 'elevation', name: 'Back', widthFt: 28, heightFt: 18, storeys: 2,
      sidingType: 'vinyl lap', openings: [],
      source: { widthFt: 'measured', heightFt: 'estimated' },
    },
  ],
};

test('rooms and elevations both reach the prompt', () => {
  const text = describeHouse(house).join('\n');
  assert.match(text, /Main bath/);
  assert.match(text, /Back/);
  assert.match(text, /9ft by 5\.5ft/);
});

test('a photo-derived number is labelled as approximate, and a measured one is not', () => {
  const text = describeHouse(house).join('\n');
  assert.match(text, /from photos, approximate/);
  assert.match(text, /measured/);
  // The whole point: the two must not read alike.
  assert.ok(!/measured, approximate/.test(text));
});

test('an estimate is called a guess rather than dressed up', () => {
  const text = describeHouse(house).join('\n');
  assert.match(text, /a guess/);
});

test('an empty house says so plainly instead of being omitted', () => {
  const text = describeHouse({ views: [] }).join('\n');
  assert.match(text, /Nothing has been captured or measured yet/);
  // Omitting it would let the model assume the house simply was not sent.
  assert.ok(text.length > 0);
});

test('a missing or malformed house does not throw', () => {
  for (const bad of [null, undefined, {}, { views: 'not an array' }, 42]) {
    assert.doesNotThrow(() => describeHouse(bad as any));
  }
});

// ── what the model is shown about the job ──────────────────────────────────

test('the deck model is described when the deck section is open', () => {
  const text = describe({ model: { widthFt: 16, depthFt: 12, joistSize: '2x10' }, house }, 'deck');
  assert.match(text, /THE DESIGN AS IT STANDS/);
  assert.match(text, /16ft along the house/);
});

test('the deck model is NOT recited into another trade', () => {
  const text = describe({ model: { widthFt: 16, depthFt: 12, joistSize: '2x10' }, house }, 'bathroom');
  assert.ok(!/THE DESIGN AS IT STANDS/.test(text), 'joist sizes in a bathroom answer was the bug');
  assert.ok(!/2x10/.test(text));
  assert.match(text, /BATHROOM SECTION IS OPEN/);
});

test('the building is described whatever the trade', () => {
  for (const trade of ['deck', 'bathroom', 'flooring', 'siding']) {
    const text = describe({ model: {}, house }, trade);
    assert.match(text, /Main bath/, `${trade} was not told about the rooms`);
  }
});

test('a missing site figure is reported as missing, never defaulted', () => {
  const text = describe({ model: {}, loads: {}, house }, 'deck');
  assert.match(text, /Ground snow load: NOT SUPPLIED/);
  assert.match(text, /Frost depth: NOT SUPPLIED/);
});

// ── additions, and the question that decides the price ─────────────────────

test('an addition question leads with the bearing problem', () => {
  const prompt = systemFor('addition');
  assert.match(prompt, /bearing/i);
  assert.match(prompt, /joists run/i, 'it must say how the question is actually settled');
  assert.match(prompt, /egress/i);
});

test('a wall whose role nobody has established is reported as unknown, loudly', () => {
  const text = describePlan({
    rooms: [],
    walls: [{ label: 'kitchen/dining wall', state: 'removed', bearing: 'unknown' }],
  }).join('\n');
  assert.match(text, /BEARING STATUS UNKNOWN/);
  assert.match(text, /nobody has looked/);
});

test('a wall known to carry load is not softened', () => {
  const text = describePlan({
    rooms: [],
    walls: [{ label: 'centre wall', state: 'removed', bearing: 'bearing' }],
  }).join('\n');
  assert.match(text, /KNOWN TO BE CARRYING LOAD/);
});

test('a proposed room is marked as not existing yet', () => {
  const text = describePlan({
    rooms: [{ name: 'New family room', state: 'proposed', widthFt: 20, depthFt: 14, ceilingFt: 9 }],
    walls: [],
  }).join('\n');
  assert.match(text, /PROPOSED room/);
  assert.match(text, /does not exist yet/);
});

test('the plan reaches every trade, not just additions', () => {
  const p = {
    rooms: [{ name: 'Kitchen', state: 'existing', widthFt: 12, depthFt: 10, ceilingFt: 8 }],
    walls: [{ label: 'back wall', state: 'removed', bearing: 'unknown' }],
  };
  for (const trade of ['kitchen', 'bathroom', 'addition']) {
    const text = describe({ model: {}, plan: p }, trade);
    assert.match(text, /BEARING STATUS UNKNOWN/, `${trade} was not told about the wall`);
  }
});

test('no plan produces no section rather than an empty heading', () => {
  assert.deepEqual(describePlan(null), []);
  assert.deepEqual(describePlan({ rooms: [], walls: [] }), []);
});
