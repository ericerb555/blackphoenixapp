/**
 * Turning a work request into a pipeline item.
 *
 * Eric, 2026-11-20: "the work request did not automativally generate a quote
 * and when i go into the project details i donthave an option to generate it
 * myself this needs to be fixed".
 *
 * Michael Saverse's request is the fixture, as stored: a design-intake shape
 * with snake_case fields, the form's default service type, no address, and a
 * description that is the only true thing on it.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  pipelineItemFrom, draftQuoteFrom, itemNumberFor,
} from '../supabase/functions/server/pipelineHandoff.ts';

const NOW = '2026-11-20T18:00:00.000Z';

/** Michael's request, as `wr:wr_1795195448482_1wag8` holds it. */
const michael = (over: Record<string, unknown> = {}) => ({
  id: 'wr_1795195448482_1wag8',
  client_name: 'Michael Saverse',
  client_email: 'msaverse@yahoo.com',
  client_phone: '',
  description: 'Replace deck',
  serviceType: 'Full Home Renovation',
  project_type: 'residential',
  site_address: '',
  city: '',
  state: 'CA',
  status: 'pending',
  priority_level: 'standard',
  jobId: 'job_0576cada-9d7d-4f86-9796-e0ecc590778e',
  created_at: '2026-11-20T17:24:09.415Z',
  budget_range: { max: null, min: null, priority: 'quality' },
  ...over,
});

const draft = (over: Record<string, unknown> = {}) => ({
  workRequestId: 'wr_1795195448482_1wag8',
  generatedAt: NOW,
  confidence: 'medium',
  assumptions: ['Deck size assumed'],
  priceSummary: { confidence: 0.5 },
  quote: {
    materialItems: [{ name: 'Decking', quantity: 200, unitCost: 4.5, totalCost: 900 }],
    laborItems: [{ role: 'Carpenter', hours: 40, hourlyRate: 51.75, totalCost: 2070 }],
    processSteps: [{ title: 'Demolition', description: 'Remove existing deck' }],
    subtotals: { materials: 900, labor: 2070, tax: 0 },
    total: 3564,
  },
  ...over,
});

/* ── the item ────────────────────────────────────────────────────────────── */

test('a request becomes an item the pipeline board can read', () => {
  const item = pipelineItemFrom(michael(), draft(), null, NOW);
  assert.equal(item.id, 'wr_1795195448482_1wag8');
  assert.equal(item.stage, 'quote-draft');
  assert.equal(item.customerName, 'Michael Saverse');
  assert.equal(item.customerEmail, 'msaverse@yahoo.com');
  assert.equal(item.description, 'Replace deck');
  // No project name on the request, so the title is built from what there is.
  assert.equal(item.title, 'Full Home Renovation — Michael Saverse');
  // The job the work request already opened travels with it.
  assert.equal(item.jobId, 'job_0576cada-9d7d-4f86-9796-e0ecc590778e');
  assert.equal(item.workRequestId, 'wr_1795195448482_1wag8');
});

test('the estimated value comes from the quote, not from an empty budget', () => {
  // His budget_range is {max: null, min: null} — `Number(null)` is 0, and a 0
  // estimate on a real job is the absent-is-not-zero bug in another costume.
  const item = pipelineItemFrom(michael(), draft(), null, NOW);
  assert.equal(item.estimatedValue, 3564);
});

test('no quote draft yet is an item with no quote, not an item with a zero one', () => {
  const item = pipelineItemFrom(michael(), null, null, NOW);
  assert.equal(item.quote, undefined);
  assert.equal(item.estimatedValue, 0);
  // It still opens, which is the point — the board needs the row either way.
  assert.equal(item.customerName, 'Michael Saverse');
});

/* ── regenerating must not undo somebody's work ──────────────────────────── */

test('regenerating keeps the stage a person moved it to', () => {
  const existing = {
    id: 'wr_1795195448482_1wag8',
    itemNumber: 'WR-20261120-8218',
    stage: 'quote-sent',
    priority: 'high',
    assignedTo: 'eric@example.com',
  };
  const item = pipelineItemFrom(michael(), draft(), existing, NOW);
  assert.equal(item.stage, 'quote-sent', 'a regenerate must not drag it back to quote-draft');
  assert.equal(item.itemNumber, 'WR-20261120-8218', 'the number it was filed under is kept');
  assert.equal(item.assignedTo, 'eric@example.com', 'fields this does not derive survive');
  // And the new quote does land.
  assert.equal(item.quote.totalCost, 3564);
});

test('the item number is derived from the request, so it never renumbers', () => {
  assert.equal(itemNumberFor(michael()), 'WR-20261120-8218');
  assert.equal(itemNumberFor(michael()), itemNumberFor(michael()));
});

/* ── the draft quote ─────────────────────────────────────────────────────── */

test('no sequential quote number is minted for a draft', () => {
  const q = draftQuoteFrom(draft(), 'wr_1795195448482_1wag8', NOW);
  // `mintQuoteNumber` claims Q-2026-NNNN against a unique index. Burning one
  // on a draft nobody sends leaves a gap that reads as a deleted quote.
  assert.equal(q.number, undefined);
  // And it is not the browser's invented placeholder either.
  assert.notEqual(q.quoteNumber, 'Q-2026-001');
  assert.match(q.quoteNumber, /^QT-\d{8}-\d{4}$/);
});

test('an absent tax rate stays absent rather than becoming 8%', () => {
  const q = draftQuoteFrom(draft(), 'wr', NOW);
  // The browser copy hard-coded 0.08. `customerPricingOf` treats a recorded
  // rate as a decision, so a guessed one silently prices the job.
  assert.equal(q.taxRate, undefined);
});

test('a real tax rate from the estimator is kept', () => {
  const d = draft();
  (d.quote as any).taxRate = 0.0625;
  assert.equal(draftQuoteFrom(d, 'wr', NOW).taxRate, 0.0625);
});

test('the lines are carried across under the names the editor reads', () => {
  const q = draftQuoteFrom(draft(), 'wr', NOW);
  assert.equal(q.materials.length, 1);
  assert.equal(q.labor.length, 1);
  assert.equal(q.processSteps.length, 1);
  assert.equal(q.materialsSubtotal, 900);
  assert.equal(q.laborSubtotal, 2070);
  assert.equal(q.totalCost, 3564);
  // `total` and `totalCost` are written together: they are the pair that went
  // out of step on two live quotes and left one of them $3,064.43 wrong.
  assert.equal(q.total, q.totalCost);
});

test('a draft with no lines is still a usable record', () => {
  const q = draftQuoteFrom({ quote: {} }, 'wr', NOW);
  assert.deepEqual(q.materials, []);
  assert.deepEqual(q.labor, []);
  assert.equal(q.totalCost, 0);
  assert.equal(q.pricingBasis, 'estimator');
});

test('a missing work request id does not produce an item keyed on undefined', () => {
  // `pipeline.tsx:322` records that an item with no id becomes the key
  // `pipeline_undefined`.
  const item = pipelineItemFrom({ client_name: 'X' }, null, null, NOW);
  assert.equal(item.id, '');
});
