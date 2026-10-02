/**
 * The conditions report record and its life.
 *
 * The behaviours that matter most here are about a document somebody is holding:
 *
 *   - findings FREEZE when the report leaves the landlord's hands, so a later
 *     edit to a checklist cannot change a statement already issued
 *   - the money does NOT freeze, because it does not exist yet at that moment
 *   - a report naming damage cannot be shared until the damage has a price
 *   - no total is ever stored; every figure is derived on read
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildReport, reportRefusal, reportView, deductionsFor, transitionRefusal,
  applyTransition, isFullyPriced, tenantCopy,
} from '../supabase/functions/server/conditionsReport.ts';

const area = (name: string, condition: string) => ({ name, condition, notes: '', media: [] });

const moveInForm = (condition = 'Good') => ({
  id: 'form_in', type: 'move-in', status: 'completed',
  tenantEmail: 'tenant@example.com', tenantName: 'A Tenant',
  propertyAddress: '12 Mill St', unit: '2B',
  data: { areas: [area('Flooring', condition), area('Kitchen', 'Good')] },
  tenantResponses: { areas: [area('Flooring', condition), area('Kitchen', 'Good')] },
  completedAt: '2025-03-12T00:00:00.000Z',
});

const moveOutForm = (condition = 'Damaged') => ({
  id: 'form_out', type: 'move-out', status: 'completed',
  tenantEmail: 'tenant@example.com', tenantName: 'A Tenant',
  propertyAddress: '12 Mill St', unit: '2B',
  data: { areas: [area('Flooring', condition), area('Kitchen', 'Good')] },
  tenantResponses: { areas: [area('Flooring', condition), area('Kitchen', 'Good')] },
  completedAt: '2026-09-28T00:00:00.000Z',
});

const make = (deposit = '$1,800', out = moveOutForm(), inForm: any = moveInForm()) =>
  buildReport({
    id: 'CR-1', landlordEmail: 'Landlord@Example.com', moveInForm: inForm,
    moveOutForm: out, depositRaw: deposit, now: '2026-10-02T00:00:00.000Z',
  });

/* ── building one ────────────────────────────────────────────────────────── */

test('a report takes its tenant and address from the move-out checklist', () => {
  const r = make();
  assert.equal(r.tenantEmail, 'tenant@example.com');
  assert.equal(r.propertyAddress, '12 Mill St');
  assert.equal(r.unit, '2B');
  assert.equal(r.moveInFormId, 'form_in');
  assert.equal(r.moveOutFormId, 'form_out');
  assert.equal(r.status, 'documented');
});

test('the landlord email is lowercased, since it is the isolation key', () => {
  assert.equal(make().landlordEmail, 'landlord@example.com');
});

test('the deposit is copied, not referenced', () => {
  // A lease can be edited or renewed. A statement that re-based itself on a new
  // deposit figure would be arithmetic nobody could reproduce.
  assert.equal(make('$1,800').depositRaw, '$1,800');
});

test('a report can be built with no move-in checklist', () => {
  const r = make('$1,800', moveOutForm(), null);
  assert.equal(r.moveInFormId, null);
  const view = reportView(r, null, moveOutForm());
  assert.equal(view.diff.noBaseline, true);
  assert.equal(view.diff.chargeableAreas, 0, 'worth having as a record, chargeable for nothing');
});

/* ── what is refused ─────────────────────────────────────────────────────── */

test('an incomplete move-out checklist cannot make a report', () => {
  const out = { ...moveOutForm(), status: 'sent' };
  assert.match(reportRefusal(moveInForm(), out)!, /not been completed/i);
});

test('an incomplete move-in checklist cannot be the baseline', () => {
  const inc = { ...moveInForm(), status: 'sent' };
  assert.match(reportRefusal(inc, moveOutForm())!, /never completed/i);
});

test('two checklists for different tenants are not a comparison', () => {
  const other = { ...moveInForm(), tenantEmail: 'someone@else.com' };
  assert.match(reportRefusal(other, moveOutForm())!, /different tenants/i);
});

test('the wrong form type is refused', () => {
  assert.match(reportRefusal(null, { ...moveOutForm(), type: 'pet-deposit' })!, /not a move-out/i);
  assert.match(reportRefusal({ ...moveInForm(), type: 'move-out' }, moveOutForm())!, /not a move-in/i);
});

test('a valid pair, and a valid move-out alone, are both accepted', () => {
  assert.equal(reportRefusal(moveInForm(), moveOutForm()), null);
  assert.equal(reportRefusal(null, moveOutForm()), null);
});

/* ── the money is derived, never stored ──────────────────────────────────── */

test('no total is kept on the record', () => {
  const r = make();
  for (const key of ['deductions', 'returnedToTenant', 'owedByTenant', 'total']) {
    assert.equal((r as any)[key], undefined, key + ' must not be stored');
  }
});

test('a chargeable area with no price keeps the settlement blank', () => {
  const view = reportView(make(), moveInForm(), moveOutForm());
  assert.equal(view.diff.chargeableAreas, 1, 'Good to Damaged');
  assert.equal(view.settlement.status, 'awaiting_pricing');
  assert.equal(view.settlement.deductions, null);
  assert.deepEqual(view.settlement.unpriced, ['Flooring']);
});

test('a price from Black Phoenix completes the arithmetic', () => {
  const r = { ...make(), costs: [{ area: 'Flooring', cost: 820, quoteId: 'QT-5' }] };
  const view = reportView(r, moveInForm(), moveOutForm());
  assert.equal(view.settlement.status, 'ready');
  assert.equal(view.settlement.deductions, 820);
  assert.equal(view.settlement.returnedToTenant, 980);
});

test('a typed deposit figure overrides an unreadable lease field', () => {
  const r = { ...make('one month'), costs: [{ area: 'Flooring', cost: 820, quoteId: 'QT-5' }] };
  assert.equal(reportView(r, moveInForm(), moveOutForm()).settlement.status, 'deposit_unreadable');

  const fixed = { ...r, depositOverride: '1800' };
  const view = reportView(fixed, moveInForm(), moveOutForm());
  assert.equal(view.settlement.status, 'ready');
  assert.equal(view.settlement.returnedToTenant, 980);
});

test('only chargeable areas become deductions', () => {
  const view = reportView(make(), moveInForm(), moveOutForm());
  const lines = deductionsFor(view.diff, []);
  assert.deepEqual(lines.map((l) => l.area), ['Flooring'], 'Kitchen was unchanged');
});

test('a cost for an area that is not chargeable is ignored', () => {
  const r = { ...make(), costs: [{ area: 'Kitchen', cost: 500, quoteId: 'q' }] };
  const view = reportView(r, moveInForm(), moveOutForm());
  assert.equal(view.settlement.lines.length, 1);
  assert.equal(view.settlement.lines[0].area, 'Flooring');
});

/* ── the freeze ──────────────────────────────────────────────────────────── */

test('findings move with the checklists while the report is live', () => {
  const r = make();
  assert.equal(reportView(r, moveInForm(), moveOutForm()).live, true);
  // Correct the move-out checklist: the live report follows it.
  const corrected = reportView(r, moveInForm(), moveOutForm('Fair'));
  assert.equal(corrected.diff.lines.find((l: any) => l.area === 'Flooring').classification, 'wear');
});

test('sending it freezes the findings', () => {
  const r = make();
  const view = reportView(r, moveInForm(), moveOutForm());
  assert.equal(transitionRefusal(r, 'sent', view), null);
  const sent = applyTransition(r, 'sent', view, '2026-10-02T09:00:00.000Z');
  assert.ok(sent.frozenDiff, 'the findings are now a record of a day');
  assert.equal(sent.frozenAt, '2026-10-02T09:00:00.000Z');
  assert.equal(sent.sentAt, '2026-10-02T09:00:00.000Z');
});

test('and a later edit to a checklist cannot change what was sent', () => {
  const r = make();
  const sent = applyTransition(r, 'sent', reportView(r, moveInForm(), moveOutForm()));
  // The move-out checklist is edited down to Fair afterwards.
  const after = reportView(sent, moveInForm(), moveOutForm('Fair'));
  assert.equal(after.live, false);
  assert.equal(after.diff.lines.find((l: any) => l.area === 'Flooring').classification, 'damage',
    'the statement in somebody\'s hand must not change underneath them');
});

test('but the money still moves, because it did not exist when it froze', () => {
  const r = make();
  const sent = applyTransition(r, 'sent', reportView(r, moveInForm(), moveOutForm()));
  assert.equal(reportView(sent, null, null).settlement.status, 'awaiting_pricing');

  const priced = { ...sent, costs: [{ area: 'Flooring', cost: 820, quoteId: 'QT-5' }] };
  const view = reportView(priced, null, null);
  assert.equal(view.settlement.status, 'ready', 'freezing both would freeze a report with no figures');
  assert.equal(view.settlement.deductions, 820);
});

test('a frozen report does not consult the forms at all', () => {
  const r = make();
  const sent = applyTransition(r, 'sent', reportView(r, moveInForm(), moveOutForm()));
  const withoutForms = reportView(sent, null, null);
  assert.equal(withoutForms.diff.chargeableAreas, 1, 'served from the freeze');
});

/* ── transitions ─────────────────────────────────────────────────────────── */

test('a report with nothing chargeable has nothing to price', () => {
  const r = make('$1,800', moveOutForm('Good'));
  const view = reportView(r, moveInForm(), moveOutForm('Good'));
  assert.match(transitionRefusal(r, 'sent', view)!, /nothing to price/i);
});

test('sending it again is a no-op, and does not move the date it was sent', () => {
  // A retried request should not surface an error, and it must not rewrite the
  // history of a document somebody is relying on.
  const r = make();
  const sent = applyTransition(r, 'sent', reportView(r, moveInForm(), moveOutForm()), '2026-10-02T09:00:00.000Z');
  assert.equal(transitionRefusal(sent, 'sent', reportView(sent, null, null)), null, 'not an error');

  const again = applyTransition(sent, 'sent', reportView(sent, null, null), '2026-10-09T09:00:00.000Z');
  assert.equal(again.sentAt, '2026-10-02T09:00:00.000Z', 'still the day it was actually sent');
  assert.equal(again.frozenAt, '2026-10-02T09:00:00.000Z', 'and the freeze is not redone');
});

test('a report sent from documented cannot skip the freeze', () => {
  const r = make();
  const view = reportView(r, moveInForm(), moveOutForm());
  assert.equal(transitionRefusal(r, 'sent', view), null);
  assert.ok(applyTransition(r, 'sent', view).frozenDiff);
});

test('it cannot be marked priced before it was sent', () => {
  const r = make();
  assert.match(transitionRefusal(r, 'priced', reportView(r, moveInForm(), moveOutForm()))!,
    /not been sent/i);
});

test('reopening a sent report discards the freeze', () => {
  const r = make();
  const sent = applyTransition(r, 'sent', reportView(r, moveInForm(), moveOutForm()));
  assert.equal(transitionRefusal(sent, 'documented', reportView(sent, null, null)), null);
  const reopened = applyTransition(sent, 'documented', reportView(sent, null, null));
  assert.equal(reopened.frozenDiff, undefined);
  assert.equal(reopened.sentAt, undefined);
});

test('but a report the tenant is holding cannot be reopened', () => {
  const r = { ...make(), status: 'shared' as const, costs: [{ area: 'Flooring', cost: 820, quoteId: 'q' }] };
  const view = reportView(r, moveInForm(), moveOutForm());
  assert.match(transitionRefusal(r, 'documented', view)!, /already holding/i);
});

/* ── sharing ─────────────────────────────────────────────────────────────── */

test('a report naming damage cannot be shared before it is priced', () => {
  const view = reportView(make(), moveInForm(), moveOutForm());
  assert.equal(view.shareable, false);
  assert.match(view.shareBlockedBecause!, /priced/i);
  assert.match(view.shareBlockedBecause!, /cannot check/i);
});

test('once priced it can be shared', () => {
  const r = { ...make(), costs: [{ area: 'Flooring', cost: 820, quoteId: 'QT-5' }] };
  const view = reportView(r, moveInForm(), moveOutForm());
  assert.equal(view.shareable, true);
  assert.equal(transitionRefusal(r, 'shared', view), null);
});

test('a report with no damage is shareable straight away', () => {
  // It makes no claim, and it is the evidence the deposit is going back in full.
  const r = make('$1,800', moveOutForm('Good'));
  const view = reportView(r, moveInForm(), moveOutForm('Good'));
  assert.equal(view.diff.chargeableAreas, 0);
  assert.equal(view.shareable, true);
});

test('and is shareable even where the deposit field is unreadable', () => {
  const r = make('one month', moveOutForm('Good'));
  const view = reportView(r, moveInForm(), moveOutForm('Good'));
  assert.equal(view.shareable, true, 'nothing is being deducted, so there is no arithmetic to get wrong');
});

test('an unreadable deposit DOES block sharing a report that deducts', () => {
  const r = { ...make('one month'), costs: [{ area: 'Flooring', cost: 820, quoteId: 'q' }] };
  const view = reportView(r, moveInForm(), moveOutForm());
  assert.equal(view.shareable, false);
  assert.match(view.shareBlockedBecause!, /not an amount|could not be read/i);
});

/* ── pricing completeness ────────────────────────────────────────────────── */

test('fully priced means every chargeable area has a figure', () => {
  const unpriced = reportView(make(), moveInForm(), moveOutForm());
  assert.equal(isFullyPriced(unpriced), false);

  const r = { ...make(), costs: [{ area: 'Flooring', cost: 820, quoteId: 'q' }] };
  assert.equal(isFullyPriced(reportView(r, moveInForm(), moveOutForm())), true);
});

test('a report with nothing chargeable is not "fully priced"', () => {
  const r = make('$1,800', moveOutForm('Good'));
  assert.equal(isFullyPriced(reportView(r, moveInForm(), moveOutForm('Good'))), false,
    'there was never anything to price, so it should not auto-advance');
});

/* ── the tenant's copy ───────────────────────────────────────────────────── */

test('the tenant sees every line the landlord sees', () => {
  const r = { ...make(), costs: [{ area: 'Flooring', cost: 820, quoteId: 'QT-5' }] };
  const view = reportView(r, moveInForm(), moveOutForm());
  const copy = tenantCopy(view);
  assert.equal(copy.diff.lines.length, view.diff.lines.length,
    'an itemised statement with items removed is not one');
  assert.equal(copy.settlement.deductions, 820);
  assert.equal(copy.settlement.returnedToTenant, 980);
});

test('but not the landlord account identifiers', () => {
  const copy = tenantCopy(reportView(make(), moveInForm(), moveOutForm()));
  assert.equal((copy.record as any).landlordEmail, undefined);
  assert.equal((copy.record as any).landlordUserId, undefined);
  assert.equal(copy.record.propertyAddress, '12 Mill St', 'the statement itself is intact');
});
