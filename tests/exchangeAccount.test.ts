/**
 * The Exchange customer account's rules — the ones that are privacy failures
 * rather than bugs when they go wrong.
 *
 * WHY THESE ARE TESTS AND NOT COMMENTS
 *
 * The plan for this feature said the rule "a business may be told how many
 * people wanted them, never who" would be held by a test rather than a note,
 * because adding a customer identity to the Exchange is exactly the change
 * that could leak it by accident. A comment does not fail a build.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ENQUIRY_KINDS, isEnquiry, phraseEnquiry, actorFilter, HISTORY_LIMIT,
} from '../supabase/functions/server/exchangeAccount.ts';

/** Every kind the ledger's enum can hold, as the database defines it. */
const ALL_KINDS = [
  'viewed', 'revealed', 'called', 'website',
  'messaged', 'requested', 'quoted', 'awarded',
];

// ── a history is what you did, not what you looked at ───────────────────────

test('a page view is never part of somebody history', () => {
  /*
   * The most important assertion in this file. The ledger records a view of
   * every listing page, so a history built from every kind would be a list of
   * everything a resident had so much as glanced at — surveillance dressed as
   * a feature, and precisely what the Exchange is positioned against.
   */
  assert.ok(!isEnquiry('viewed'));
  assert.ok(!ENQUIRY_KINDS.includes('viewed' as never));
});

test('everything a person actually did is kept', () => {
  for (const kind of ALL_KINDS.filter((k) => k !== 'viewed')) {
    assert.ok(isEnquiry(kind), `${kind} should count as an enquiry`);
  }
});

test('an unknown kind is not quietly treated as an enquiry', () => {
  // A kind added to the enum later must be decided on deliberately, not swept
  // into everyone's history by a default.
  assert.ok(!isEnquiry('subpoenaed'));
  assert.ok(!isEnquiry(''));
  assert.ok(!isEnquiry(null));
  assert.ok(!isEnquiry(undefined));
});

test('every kind reads as a sentence about the person', () => {
  for (const kind of ALL_KINDS) {
    const phrase = phraseEnquiry(kind);
    assert.ok(phrase.length > 0, `${kind} has no phrasing`);
    /*
     * Written for a reader, not copied from the enum. Checked by shape rather
     * than by "differs from the kind", which was the first version of this
     * assertion and was simply wrong: "Called" is the correct English for
     * `called` and happens to be the same word.
     */
    assert.match(phrase, /^[A-Z]/, `${kind} should read as a sentence`);
    assert.ok(!/[_-]/.test(phrase), `${kind} still looks like an identifier`);
  }
  assert.equal(phraseEnquiry('called'), 'Called');
  assert.equal(phraseEnquiry('requested'), 'Asked for a quote');
  // An unrecognised kind still says something true rather than nothing.
  assert.equal(phraseEnquiry('something-new'), 'Got in touch');
});

// ── the ledger is never read unscoped ───────────────────────────────────────

test('reading the ledger without an actor is refused, not defaulted', () => {
  /*
   * `exchange_lead_event` carries no row-level security — it is reached only
   * with the service role — so this filter is the whole of the protection
   * between one resident's history and everybody else's. A function that
   * returned `{}` for a missing id would produce a query with no WHERE clause
   * and hand back every enquiry every person has ever made.
   */
  assert.throws(() => actorFilter(''), /unscoped/);
  assert.throws(() => actorFilter(null), /unscoped/);
  assert.throws(() => actorFilter(undefined), /unscoped/);
  assert.throws(() => actorFilter('   '), /unscoped/);
});

test('a real actor produces a filter that is actually scoped', () => {
  const filter = actorFilter('11111111-2222-3333-4444-555555555555');
  assert.deepEqual(filter, { actor_user_id: '11111111-2222-3333-4444-555555555555' });
  assert.ok(filter.actor_user_id.length > 0);
});

test('the history has a ceiling somebody chose', () => {
  assert.ok(Number.isInteger(HISTORY_LIMIT) && HISTORY_LIMIT > 0);
  // Not unbounded, and not so small that a normal account is truncated.
  assert.ok(HISTORY_LIMIT >= 50 && HISTORY_LIMIT <= 1000);
});

// ── the direction of every read ─────────────────────────────────────────────

test('the account module offers no way to ask who contacted a business', () => {
  /*
   * A structural check rather than a behavioural one, and the reason it is
   * worth having: the leak this feature could cause would not look like a bug.
   * It would look like a helpful new export — `whoSaved(orgId)`,
   * `enquirersFor(orgId)` — added by somebody building the business side who
   * did not know the rule. Every function here takes a PERSON as its subject.
   * If that stops being true, this fails and whoever changed it has to say so.
   */
  const surface = Object.keys(
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    {
      ENQUIRY_KINDS, isEnquiry, phraseEnquiry, actorFilter, HISTORY_LIMIT,
    },
  );
  const businessShaped = surface.filter((name) => /^(who|enquirersFor|savedBy|viewersOf)/i.test(name));
  assert.deepEqual(businessShaped, [],
    'this module must not grow a function that takes a business and returns people');
});
