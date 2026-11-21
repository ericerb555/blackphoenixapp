/**
 * The deck the customer asked for, against the one that is there.
 *
 * Eric: "then it should read what the customer is requestiong and prep a new
 * build that i can review and then render".
 *
 * The distinction these exist to pin: a customer's dimension is HEARSAY on the
 * as-built and a REQUIREMENT on the proposal. "The deck is 20 by 14" is a claim
 * about something nobody measured, and `deckObservationReply` refuses to
 * promote it. "I want it 20 by 16" is the customer telling us what to build,
 * and it is the only source for that. The same sentence, rejected on one deck
 * and honoured on the other.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  readDeckChanges, isDeckChanges, proposeDeck, type DeckModel,
} from '../supabase/functions/server/deckProposal.ts';
import { DEFAULT_DECK } from '../src/app/lib/deckModel.ts';

/** A 16x12 deck a foot off the ground, no guard, with stairs. */
const asBuilt = (over: Partial<DeckModel> = {}): DeckModel => ({
  ...(DEFAULT_DECK as any),
  widthFt: 16,
  depthFt: 12,
  heightFt: 1,
  guardrail: false,
  stairs: true,
  ...over,
});

const changes = (o: Record<string, unknown>) => {
  const r = readDeckChanges(o);
  assert.ok(isDeckChanges(r));
  return r;
};

/* ── a requirement is honoured ───────────────────────────────────────────── */

test('a requested size is taken, and recorded as requested', () => {
  const p = proposeDeck(asBuilt(), changes({ widthFt: 20, depthFt: 16 }));
  assert.equal(p.deck.widthFt, 20);
  assert.equal(p.deck.depthFt, 16);
  assert.equal(p.sizeUnchanged, false);
  const w = p.changes.find((c) => c.field === 'widthFt');
  assert.equal(w?.why, 'requested');
  assert.equal(w?.from, '16 ft');
  assert.equal(w?.to, '20 ft');
});

test('silence keeps the existing deck and changes nothing', () => {
  const p = proposeDeck(asBuilt(), changes({}));
  assert.deepEqual(p.deck, asBuilt());
  assert.deepEqual(p.changes, []);
  assert.equal(p.sizeUnchanged, true);
});

test('asking for what is already there is not a change', () => {
  const p = proposeDeck(asBuilt(), changes({ widthFt: 16 }));
  assert.deepEqual(p.changes, []);
  assert.equal(p.sizeUnchanged, true);
});

/* ── both toggles work, which a loop once broke ──────────────────────────── */

test('stairs and guardrail are each honoured, not just the first', () => {
  const p = proposeDeck(
    asBuilt({ stairs: true, guardrail: false }),
    changes({ stairs: false, guardrail: true }),
  );
  assert.equal(p.deck.stairs, false);
  assert.equal(p.deck.guardrail, true);
  assert.equal(p.changes.filter((c) => c.why === 'requested').length, 2);
});

test('false is a request, not an absence', () => {
  // "take the railings off" has to survive. A Boolean() or a falsy check would
  // read it as "they said nothing" and leave them on.
  const p = proposeDeck(asBuilt({ guardrail: true, heightFt: 1 }), changes({ guardrail: false }));
  assert.equal(p.deck.guardrail, false);
});

/* ── the code guard ──────────────────────────────────────────────────────── */

test('a deck raised past 30 inches gets a guardrail, marked code', () => {
  // Nobody asked for a railing. Leaving it off would draw a deck that cannot
  // be built; marking it `requested` would credit the customer with a decision
  // they never made.
  const p = proposeDeck(asBuilt({ guardrail: false, heightFt: 1 }), changes({ heightFt: 4 }));
  assert.equal(p.deck.guardrail, true);
  const g = p.changes.find((c) => c.field === 'guardrail');
  assert.equal(g?.why, 'code');
});

test('the guard is judged on the PROPOSED height, not the existing one', () => {
  // Applied last for exactly this: a deck being lowered to 1 ft does not need
  // a guard added because it used to be high.
  const p = proposeDeck(asBuilt({ heightFt: 6, guardrail: false }), changes({ heightFt: 1 }));
  assert.equal(p.deck.guardrail, false);
  assert.equal(p.changes.some((c) => c.field === 'guardrail'), false);
});

test('a low deck keeps no guardrail when nobody asked', () => {
  const p = proposeDeck(asBuilt({ heightFt: 2, guardrail: false }), changes({}));
  assert.equal(p.deck.guardrail, false);
});

test('a customer who asks to remove the rail on a HIGH deck still gets one', () => {
  // The code is not negotiable by request, and the note says why it is there.
  const p = proposeDeck(asBuilt({ heightFt: 5, guardrail: true }), changes({ guardrail: false }));
  assert.equal(p.deck.guardrail, true);
  assert.equal(p.changes.filter((c) => c.field === 'guardrail').map((c) => c.why).at(-1), 'code');
});

/* ── nothing structural may be requested ─────────────────────────────────── */

test('framing is not something a customer request can set', () => {
  // A model allowed to "request" a 2x12 joist would be making an engineering
  // decision inside a sentence about decking colour. deckStructural sizes the
  // framing from the span.
  const r = changes({ joistSize: '2x12', beamPlies: 4, postSize: '4x4', footingCount: 9 });
  assert.equal((r as any).joistSize, undefined);
  assert.equal((r as any).beamPlies, undefined);
  const p = proposeDeck(asBuilt(), r);
  assert.equal(p.deck.joistSize, asBuilt().joistSize);
  assert.equal(p.deck.postSize, asBuilt().postSize);
});

/* ── bounds ──────────────────────────────────────────────────────────────── */

test('an impossible size is refused rather than drawn', () => {
  const r = changes({ widthFt: 400, depthFt: 0.5, heightFt: 90 });
  assert.equal(r.widthFt, null);
  assert.equal(r.depthFt, null);
  assert.equal(r.heightFt, null);
  const p = proposeDeck(asBuilt(), r);
  assert.deepEqual(p.changes, []);
});

test('a ground-level deck is allowed, because zero height is a real deck', () => {
  assert.equal(changes({ heightFt: 0 }).heightFt, 0);
});

test('nonsense is null, not NaN', () => {
  const r = changes({ widthFt: 'wider please', depthFt: null, heightFt: undefined });
  assert.equal(r.widthFt, null);
  assert.equal(r.depthFt, null);
});

/* ── finishes ────────────────────────────────────────────────────────────── */

test('a finish id is carried, a sentence is not', () => {
  assert.equal(changes({ deckingFinish: 'comp-grey' }).deckingFinish, 'comp-grey');
  // "something nicer" is a question for the customer, not a finish.
  assert.equal(changes({ deckingFinish: 'something nicer' }).deckingFinish, null);
});

/* ── questions, never guesses ────────────────────────────────────────────── */

test('what the request raises but cannot answer is kept as a question', () => {
  const p = proposeDeck(asBuilt(), changes({
    asked: ['  Wants a gate  ', 'Wants a gate', 'Asked about a pergola'],
  }));
  assert.deepEqual(p.asked, ['Wants a gate', 'Asked about a pergola']);
});

/* ── refusals and rubbish ────────────────────────────────────────────────── */

test('a refusal comes back as a refusal', () => {
  const r = readDeckChanges({ unsure: true, why: 'The request only says "fix it".' });
  assert.ok(r && !isDeckChanges(r));
  assert.match((r as any).why, /fix it/);
});

test('rubbish is null', () => {
  assert.equal(readDeckChanges(null), null);
  assert.equal(readDeckChanges('bigger'), null);
  assert.equal(readDeckChanges([]), null);
});
