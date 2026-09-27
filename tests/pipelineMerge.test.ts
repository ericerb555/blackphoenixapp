/**
 * Which of the two records describing a job wins, field by field.
 *
 * The failure this guards against is silent in both directions: a stage that
 * quietly reverts, and a customer's photographs quietly disappearing because
 * the stored copy of the job never had them.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mergeItem, mergePipeline } from '../src/app/lib/pipelineMerge.ts';

/** What the board builds from a customer's work request. */
const seed = {
  id: 'wr-1',
  stage: 'quote-draft',
  customerName: 'Wanda Atherton',
  description: 'Hallway and stairs',
  createdDate: '2026-06-13T22:59:16.479Z',
  submission: { photos: [{ id: 'p1', url: 'a.jpg' }], videos: [], plans: [] },
  estimatedValue: 500000,
};

/* ── the stage ───────────────────────────────────────────────────────────── */

test('a stored stage beats one derived from a work request status', () => {
  const merged = mergeItem(seed, { id: 'wr-1', stage: 'contract' } as any);
  assert.equal(merged.stage, 'contract',
    'somebody moved this job deliberately; a status-derived guess must not undo it');
});

test('with nothing stored, the seeded stage stands', () => {
  assert.equal(mergeItem(seed, undefined).stage, 'quote-draft');
});

test('a stored record with no stage falls back rather than blanking the job', () => {
  const merged = mergeItem(seed, { id: 'wr-1', customerName: 'Wanda A.' } as any);
  assert.equal(merged.stage, 'quote-draft');
});

test('a job that exists only in the pipeline keeps everything it has', () => {
  const stored = { id: 'dp-9', stage: 'invoice', customerName: 'Design Project' };
  assert.deepEqual(mergeItem(undefined, stored as any), stored);
});

/* ── what the old merge destroyed ────────────────────────────────────────── */

test('the customer’s files survive a thin stored record', () => {
  const merged = mergeItem(seed, { id: 'wr-1', stage: 'contract' } as any);
  assert.deepEqual(merged.submission, seed.submission,
    'replacing the record wholesale is what used to lose the photographs');
  assert.equal(merged.description, 'Hallway and stairs');
  assert.equal(merged.createdDate, seed.createdDate);
});

test('an empty value in the stored record does not erase a real one', () => {
  const merged = mergeItem(seed, {
    id: 'wr-1', stage: 'contract', description: '', submission: undefined, customerName: null,
  } as any);
  assert.equal(merged.description, 'Hallway and stairs');
  assert.deepEqual(merged.submission, seed.submission);
  assert.equal(merged.customerName, 'Wanda Atherton');
});

test('an empty array in the stored record does not erase a full one', () => {
  const merged = mergeItem({ ...seed, credits: [{ id: 'c1' }] } as any, {
    id: 'wr-1', stage: 'contract', credits: [],
  } as any);
  assert.deepEqual((merged as any).credits, [{ id: 'c1' }]);
});

test('but a real stored value does replace the seeded one', () => {
  const merged = mergeItem(seed, {
    id: 'wr-1', stage: 'contract', customerName: 'Wanda Atherton-Smith', estimatedValue: 12000,
  } as any);
  assert.equal(merged.customerName, 'Wanda Atherton-Smith');
  assert.equal(merged.estimatedValue, 12000);
});

test('the quote comes from the stored record, which is where staff wrote it', () => {
  const merged = mergeItem(seed, { id: 'wr-1', stage: 'quote-sent', quote: { totalCost: 4632.4 } } as any);
  assert.equal((merged as any).quote.totalCost, 4632.4);
});

/* ── the whole board ─────────────────────────────────────────────────────── */

test('every job appears once, from whichever sources describe it', () => {
  const merged = mergePipeline(
    [seed, { id: 'wr-2', stage: 'quote-draft', customerName: 'Second' }] as any,
    [{ id: 'wr-1', stage: 'invoice' }, { id: 'dp-9', stage: 'contract', customerName: 'Design' }] as any,
  );
  assert.equal(merged.length, 3);
  const byId = Object.fromEntries(merged.map((i: any) => [i.id, i]));
  assert.equal(byId['wr-1'].stage, 'invoice', 'stored decision wins');
  assert.equal(byId['wr-1'].customerName, 'Wanda Atherton', 'and the seed fills the gaps');
  assert.equal(byId['wr-2'].stage, 'quote-draft', 'untouched jobs are unaffected');
  assert.equal(byId['dp-9'].stage, 'contract', 'pipeline-only jobs still appear');
});

test('records with no id are ignored rather than colliding under one key', () => {
  const merged = mergePipeline(
    [{ id: '', stage: 'quote-draft' }, { id: 'a', stage: 'quote-draft' }] as any,
    [{ stage: 'invoice' }] as any,
  );
  assert.equal(merged.length, 1);
  assert.equal((merged[0] as any).id, 'a');
});

test('empty input is an empty board, not a crash', () => {
  assert.deepEqual(mergePipeline([], []), []);
  assert.deepEqual(mergePipeline(undefined as any, undefined as any), []);
});
