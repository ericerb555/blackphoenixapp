/**
 * The two ledgers — the lead count that sells the subscription, and the
 * unmet demand that says who to go after.
 *
 * WHY THESE ASSERTIONS
 *
 * RECORDING MUST NEVER BREAK THE THING BEING RECORDED. A search that works
 * but is not counted costs a row. A search that fails because counting failed
 * costs a customer. Every writer swallows its own failures, and that is
 * pinned here because the obvious "improvement" — letting the error surface
 * so somebody notices — is exactly the wrong trade.
 *
 * THE CONVERSION SENTENCE HAS TO BE TRUE. A business will check the website
 * clicks against their own analytics and the calls against their own phone.
 * One inflated number and the whole ledger stops being believed, which means
 * the product has nothing left to sell. So: no rounding up, no counting a
 * page view as an enquiry, and silence rather than "you received 0".
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  recordLead,
  recordLeads,
  recordDemand,
  tallyLeads,
  conversionSentence,
  rankDemandGaps,
  type LeadTotals,
} from '../supabase/functions/server/exchangeLedger.ts';

/** A client that records inserts, or fails in the way asked for. */
function fakeDb(mode: 'ok' | 'error' | 'throw' = 'ok') {
  const inserts: { table: string; rows: any }[] = [];
  return {
    inserts,
    from(table: string) {
      return {
        async insert(rows: any) {
          inserts.push({ table, rows });
          if (mode === 'throw') throw new Error('database down');
          if (mode === 'error') return { error: new Error('permission denied') };
          return { error: null };
        },
      };
    },
  };
}

const totals = (over: Partial<LeadTotals> = {}): LeadTotals => ({
  viewed: 0, revealed: 0, called: 0, website: 0,
  messaged: 0, requested: 0, quoted: 0, awarded: 0, total: 0,
  ...over,
});

// ── writing ──────────────────────────────────────────────────────────────────

test('a lead is written with the fields the table expects', async () => {
  const db = fakeDb();
  const ok = await recordLead(db, {
    orgId: 'org-1', kind: 'messaged', categoryId: 'cat-1',
    surface: 'profile', requestRef: 'wr_9',
  });
  assert.equal(ok, true);
  assert.equal(db.inserts[0].table, 'exchange_lead_event');
  assert.deepEqual(db.inserts[0].rows, {
    org_id: 'org-1', kind: 'messaged', category_id: 'cat-1',
    actor_user_id: null, request_ref: 'wr_9', surface: 'profile', meta: {},
  });
});

test('a failing database does not take the caller down with it', async () => {
  for (const mode of ['error', 'throw'] as const) {
    const db = fakeDb(mode);
    assert.equal(await recordLead(db, { orgId: 'org-1', kind: 'viewed' }), false,
      `${mode}: reports failure rather than throwing`);
    assert.equal(await recordLeads(db, [{ orgId: 'org-1', kind: 'viewed' }]), 0);
    assert.equal(await recordDemand(db, { phrase: 'roofer' }), false);
  }
});

test('an incomplete event is dropped rather than written half-formed', async () => {
  const db = fakeDb();
  assert.equal(await recordLead(db, { orgId: '', kind: 'viewed' }), false);
  assert.equal(await recordLead(db, { orgId: 'org-1' } as any), false);
  assert.equal(db.inserts.length, 0);
});

test('one request reaching five businesses is one insert, not five', async () => {
  const db = fakeDb();
  const n = await recordLeads(db, [
    { orgId: 'a', kind: 'requested' },
    { orgId: 'b', kind: 'requested' },
    { orgId: '', kind: 'requested' },   // dropped
    { orgId: 'c', kind: 'requested' },
  ]);
  assert.equal(n, 3);
  assert.equal(db.inserts.length, 1);
  assert.equal(db.inserts[0].rows.length, 3);
});

test('a search that found nothing is still recorded — it is the valuable one', async () => {
  const db = fakeDb();
  await recordDemand(db, {
    phrase: 'gutter cleaning', territorySlug: 'salem-nh', resultsCount: 0, radiusMiles: 25,
  });
  assert.equal(db.inserts[0].table, 'exchange_demand_event');
  assert.equal(db.inserts[0].rows.results_count, 0);
  assert.equal(db.inserts[0].rows.territory_slug, 'salem-nh');
});

test('a negative or junk result count is stored as zero, not as nonsense', async () => {
  const db = fakeDb();
  await recordDemand(db, { phrase: 'x', resultsCount: -4 });
  await recordDemand(db, { phrase: 'y', resultsCount: NaN });
  assert.equal(db.inserts[0].rows.results_count, 0);
  assert.equal(db.inserts[1].rows.results_count, 0);
});

// ── counting ─────────────────────────────────────────────────────────────────

test('tallying counts each kind and the total', () => {
  const out = tallyLeads([
    { kind: 'viewed' }, { kind: 'viewed' }, { kind: 'messaged' },
    { kind: 'awarded' }, { kind: 'not-a-kind' }, {},
  ]);
  assert.equal(out.viewed, 2);
  assert.equal(out.messaged, 1);
  assert.equal(out.awarded, 1);
  assert.equal(out.total, 4, 'unknown kinds are not counted toward the total');
});

test('tallying nothing is zero, not a crash', () => {
  assert.equal(tallyLeads(null).total, 0);
  assert.equal(tallyLeads([]).total, 0);
});

// ── the sentence that converts ───────────────────────────────────────────────

test('enquiries and wins read the way a business would say them', () => {
  assert.equal(
    conversionSentence(totals({ messaged: 20, requested: 10, called: 4, awarded: 9 })),
    '34 enquiries, won 9 jobs last month.',
  );
});

test('a page view is never counted as an enquiry', () => {
  // The distinction is the whole credibility of the number: somebody opening
  // a profile is not somebody who got in touch.
  assert.equal(
    conversionSentence(totals({ viewed: 60, revealed: 5, website: 12 })),
    '77 people looked you up last month.',
  );
});

test('quoted is reported when nothing was won yet', () => {
  assert.equal(
    conversionSentence(totals({ requested: 6, quoted: 4 })),
    '6 enquiries, quoted on 4 last month.',
  );
});

test('singulars are not left reading like a bug', () => {
  assert.equal(conversionSentence(totals({ messaged: 1, awarded: 1 })), '1 enquiry, won 1 job last month.');
  assert.equal(conversionSentence(totals({ viewed: 1 })), '1 person looked you up last month.');
});

test('nothing to claim says nothing at all', () => {
  // "You received 0 enquiries" is worse than silence, and rounding a single
  // view up into an achievement is how the ledger stops being believed.
  assert.equal(conversionSentence(totals()), null);
});

test('the period is the caller’s to name', () => {
  assert.equal(
    conversionSentence(totals({ requested: 3 }), 'during your trial'),
    '3 enquiries during your trial.',
  );
});

// ── the recruitment worklist ─────────────────────────────────────────────────

test('gaps rank by how many people wanted the thing', () => {
  const rows = [
    { category_id: 'gutters', territory_slug: 'salem-nh', phrase: 'gutter cleaning' },
    { category_id: 'gutters', territory_slug: 'salem-nh', phrase: 'clean my gutters' },
    { category_id: 'gutters', territory_slug: 'salem-nh', phrase: 'gutter cleaning' },
    { category_id: 'towing', territory_slug: 'salem-nh', phrase: 'tow truck' },
  ];
  const out = rankDemandGaps(rows);
  assert.equal(out.length, 2);
  assert.equal(out[0].categoryId, 'gutters');
  assert.equal(out[0].searches, 3);
  assert.deepEqual(out[0].phrases, ['gutter cleaning', 'clean my gutters'],
    'a couple of their actual words, deduplicated');
  assert.equal(out[1].searches, 1);
});

test('the same category in two towns is two different sales calls', () => {
  const out = rankDemandGaps([
    { category_id: 'gutters', territory_slug: 'salem-nh' },
    { category_id: 'gutters', territory_slug: 'pelham-nh' },
  ]);
  assert.equal(out.length, 2);
});

test('an unresolved search is a gap of its own, not discarded', () => {
  // Nobody could be matched because the taxonomy did not recognise it. That
  // is a different fix from "no business covers this", and it still needs
  // somebody to look at it.
  const out = rankDemandGaps([
    { category_id: null, territory_slug: 'pelham-nh', phrase: 'someone to fix my chimney flashing' },
  ]);
  assert.equal(out.length, 1);
  assert.equal(out[0].categoryId, null);
});

test('the worklist is capped so a nightly job stays a worklist', () => {
  const rows = Array.from({ length: 80 }, (_, i) => ({ category_id: `c${i}`, territory_slug: 't' }));
  assert.equal(rankDemandGaps(rows, 25).length, 25);
  assert.equal(rankDemandGaps(rows, 0).length, 0);
  assert.equal(rankDemandGaps(null).length, 0);
});
