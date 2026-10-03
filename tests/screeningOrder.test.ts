/**
 * Screening orders — the state machine, the consent gate, and who sees what.
 *
 * The properties pinned here, in the order they matter:
 *
 *   - nothing leaves a terminal state, so a complete report cannot be walked
 *     backwards by a late webhook or expired by a midnight sweep
 *   - `created` cannot jump to `complete`, because that would mean a report
 *     exists that nobody was invited to produce
 *   - a repeated status is a noop rather than an error, because providers resend
 *   - an application with no dated, worded consent cannot be screened at all
 *   - the landlord and applicant projections are allow-lists, so a field added
 *     to the record is invisible until somebody decides it should be visible
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  SCREENING_STATES,
  isTerminal,
  transition,
  consentRefusal,
  consentRefusalMessage,
  ownsOrder,
  landlordView,
  applicantView,
  reportReadable,
  type ScreeningState,
  type ScreeningOrderRecord,
  inviteDeadline,
  inviteLapsed,
  SCREENING_INVITE_DAYS,
  SCREENING_PURPOSES,
  SCREENING_PURPOSE_LABELS,
  SCREENING_PURPOSE_CERTIFICATION,
  purposeRefusal,
  purposeRefusalMessage,
  adverseActionRefusal,
  adverseActionNotice,
} from '../supabase/functions/server/screeningOrder.ts';

const EMAIL = 'landlord@example.com';

const order = (over: Partial<ScreeningOrderRecord> = {}): ScreeningOrderRecord => ({
  id: 'scr_1',
  landlordEmail: EMAIL,
  applicationId: 'app_1',
  provider: 'manual',
  status: 'created',
  createdAt: '2026-10-03T12:00:00.000Z',
  ...over,
});

/* ── the state machine ────────────────────────────────────────────────────── */

test('the terminal states are exactly the three finished ones', () => {
  assert.deepEqual(SCREENING_STATES.filter(isTerminal), ['complete', 'expired', 'failed']);
});

test('nothing leaves a terminal state', () => {
  for (const from of SCREENING_STATES.filter(isTerminal)) {
    for (const to of SCREENING_STATES) {
      if (from === to) continue;
      assert.equal(transition(from, to), 'refused', `${from} → ${to} must be refused`);
    }
  }
});

test('a complete order cannot be expired by a late sweep', () => {
  // The midnight-tick case, called out because it is the one that loses a report
  // somebody has already paid for.
  assert.equal(transition('complete', 'expired'), 'refused');
  assert.equal(transition('complete', 'failed'), 'refused');
});

test('created cannot jump to complete', () => {
  assert.equal(transition('created', 'complete'), 'refused');
  assert.equal(transition('created', 'verifying'), 'refused');
  assert.equal(transition('paid', 'complete'), 'refused');
});

test('the happy path is walkable one step at a time', () => {
  assert.equal(transition('created', 'paid'), 'ok');
  assert.equal(transition('paid', 'invited'), 'ok');
  assert.equal(transition('invited', 'verifying'), 'ok');
  assert.equal(transition('verifying', 'complete'), 'ok');
});

test('an order with nothing to pay goes straight from created to invited', () => {
  // How phase 1 runs, before a fee exists. Allowed explicitly, not by omission.
  assert.equal(transition('created', 'invited'), 'ok');
});

test('a repeat of the same status is a noop, not an error', () => {
  // Providers resend. A webhook delivered twice must be boring.
  for (const s of SCREENING_STATES) assert.equal(transition(s, s), 'noop');
});

test('anything can fail except something already finished', () => {
  assert.equal(transition('created', 'failed'), 'ok');
  assert.equal(transition('paid', 'failed'), 'ok');
  assert.equal(transition('invited', 'failed'), 'ok');
  assert.equal(transition('verifying', 'failed'), 'ok');
  assert.equal(transition('expired', 'failed'), 'refused');
});

test('only an invited order can expire', () => {
  // Expiry means an invitation went unused. Nothing else has an invitation.
  assert.equal(transition('invited', 'expired'), 'ok');
  assert.equal(transition('created', 'expired'), 'refused');
  assert.equal(transition('paid', 'expired'), 'refused');
  assert.equal(transition('verifying', 'expired'), 'refused');
});

/* ── the consent gate ─────────────────────────────────────────────────────── */

const consented = {
  consentBackground: true,
  consentAt: '2026-10-03T11:00:00.000Z',
  consentText: 'I consent to a background and credit check as part of this application.',
};

test('a properly recorded consent is screenable', () => {
  assert.equal(consentRefusal(consented), null);
});

test('no application and no consent are refused differently', () => {
  assert.equal(consentRefusal(null), 'no_application');
  assert.equal(consentRefusal(undefined), 'no_application');
  assert.equal(consentRefusal({ consentBackground: false }), 'not_consented');
});

test('a consent from before we kept proof is refused, not accepted on the boolean', () => {
  // The pre-phase-0 record shape. Back-filling a date we never recorded would be
  // inventing evidence.
  assert.equal(consentRefusal({ consentBackground: true }), 'consent_undated');
  assert.equal(consentRefusal({ ...consented, consentAt: 'last tuesday' }), 'consent_undated');
  assert.equal(consentRefusal({ ...consented, consentText: '   ' }), 'consent_unrecorded');
  assert.equal(consentRefusal({ ...consented, consentText: null }), 'consent_unrecorded');
});

test('every refusal has something a landlord can act on', () => {
  for (const reason of ['no_application', 'not_consented', 'consent_undated', 'consent_unrecorded'] as const) {
    const message = consentRefusalMessage(reason);
    assert.ok(message.length > 20, `${reason} needs a real message`);
  }
});

/* ── ownership ────────────────────────────────────────────────────────────── */

test('an order belongs only to its own landlord', () => {
  assert.equal(ownsOrder(order(), EMAIL), true);
  assert.equal(ownsOrder(order(), 'someone@else.com'), false);
});

test('ownership is case and whitespace insensitive, because the key is', () => {
  assert.equal(ownsOrder(order({ landlordEmail: EMAIL }), '  Landlord@Example.com '), true);
});

test('an unidentifiable actor or owner owns nothing', () => {
  // Fails closed: an empty string must never match an empty string.
  assert.equal(ownsOrder(order({ landlordEmail: '' }), ''), false);
  assert.equal(ownsOrder(order(), ''), false);
  assert.equal(ownsOrder(order(), null), false);
  assert.equal(ownsOrder(null, EMAIL), false);
});

/* ── what each party sees ─────────────────────────────────────────────────── */

test('the landlord view cannot leak a field added to the record', () => {
  const view = landlordView(order({ creditScore: 801, reportBody: 'secret', ssn: '000-00-0000' } as any));
  assert.equal('creditScore' in view, false);
  assert.equal('reportBody' in view, false);
  assert.equal('ssn' in view, false);
  // And it does carry what a landlord needs to act.
  assert.equal(view.id, 'scr_1');
  assert.equal(view.status, 'created');
});

test('the landlord view never carries the provider reference', () => {
  // That string is the handle on the report itself.
  const view = landlordView(order({ providerRef: 'tu_12345' }));
  assert.equal('providerRef' in view, false);
});

test('the applicant view omits the landlord, the price and the reference', () => {
  const view = applicantView(order({ providerRef: 'tu_12345', priceCents: 4500 }));
  assert.equal('landlordEmail' in view, false);
  assert.equal('priceCents' in view, false);
  assert.equal('providerRef' in view, false);
  assert.equal('applicantEmail' in view, false);
  assert.equal(view.status, 'created');
});

/* ── when a report may be handed over ─────────────────────────────────────── */

test('only a complete order with a reference has a readable report', () => {
  assert.equal(reportReadable(order({ status: 'complete', providerRef: 'tu_1' })), true);
  assert.equal(reportReadable(order({ status: 'verifying', providerRef: 'tu_1' })), false);
  assert.equal(reportReadable(order({ status: 'complete', providerRef: null })), false);
  assert.equal(reportReadable(order({ status: 'complete', providerRef: '  ' })), false);
  assert.equal(reportReadable(null), false);
});

/* ── when an invitation has gone stale ────────────────────────────────────── */

test("the provider's own deadline wins when it gives one", () => {
  const theirs = '2026-10-10T00:00:00.000Z';
  const o = order({ status: 'invited', invitedAt: '2026-10-01T00:00:00.000Z', inviteExpiresAt: theirs });
  assert.equal(inviteDeadline(o), theirs);
});

test('our own fallback is used when the provider says nothing', () => {
  const o = order({ status: 'invited', invitedAt: '2026-10-01T00:00:00.000Z' });
  const deadline = Date.parse(String(inviteDeadline(o)));
  assert.equal(deadline - Date.parse('2026-10-01T00:00:00.000Z'), SCREENING_INVITE_DAYS * 24 * 60 * 60 * 1000);
});

test('an unreadable provider deadline falls back rather than being trusted', () => {
  const o = order({ status: 'invited', invitedAt: '2026-10-01T00:00:00.000Z', inviteExpiresAt: 'soon' });
  assert.equal(inviteDeadline(o), '2026-10-15T00:00:00.000Z');
});

test('an order with no invitation date has no deadline, and is left alone', () => {
  // Expiring it would destroy the only evidence of what went wrong.
  const o = order({ status: 'invited' });
  assert.equal(inviteDeadline(o), null);
  assert.equal(inviteLapsed(o, Date.parse('2030-01-01T00:00:00.000Z')), false);
});

test('an invitation lapses only once its deadline has passed', () => {
  const o = order({ status: 'invited', invitedAt: '2026-10-01T00:00:00.000Z' });
  assert.equal(inviteLapsed(o, Date.parse('2026-10-14T23:59:00.000Z')), false);
  assert.equal(inviteLapsed(o, Date.parse('2026-10-15T00:00:01.000Z')), true);
});

test('ONLY an invited order can lapse', () => {
  // The sweep must never ask for a transition the machine would refuse, or it
  // logs a refusal every night for ever. This is the same rule as the machine's,
  // stated twice on purpose.
  const long = Date.parse('2030-01-01T00:00:00.000Z');
  for (const status of SCREENING_STATES) {
    const o = order({ status, invitedAt: '2026-10-01T00:00:00.000Z' });
    assert.equal(inviteLapsed(o, long), status === 'invited', `${status} must${status === 'invited' ? '' : ' not'} lapse`);
  }
});

test('a complete order is never swept, however old its invitation', () => {
  // The midnight-tick accident this design exists to prevent, asserted from the
  // sweep's side as well as the machine's.
  const o = order({ status: 'complete', invitedAt: '2020-01-01T00:00:00.000Z', providerRef: 'tu_1' });
  assert.equal(inviteLapsed(o, Date.now()), false);
  assert.equal(transition('complete', 'expired'), 'refused');
});

test('nothing lapses on a missing order', () => {
  assert.equal(inviteLapsed(null, Date.now()), false);
  assert.equal(inviteLapsed(undefined, Date.now()), false);
});

/* ── why the report is being pulled ───────────────────────────────────────── */

test('a selected purpose with a certification is allowed', () => {
  assert.equal(purposeRefusal('tenancy_application', true), null);
  assert.equal(purposeRefusal('lease_renewal', true), null);
});

test('no purpose and an unknown purpose are refused differently', () => {
  assert.equal(purposeRefusal('', true), 'missing');
  assert.equal(purposeRefusal(null, true), 'missing');
  assert.equal(purposeRefusal(undefined, true), 'missing');
  assert.equal(purposeRefusal('curiosity', true), 'unknown');
  assert.equal(purposeRefusal('employment', true), 'unknown');
});

test('certification must be an affirmative act, not a truthy value', () => {
  // An absent field, a string, or a 1 are all things a sloppy client sends. None
  // of them is somebody certifying anything.
  assert.equal(purposeRefusal('tenancy_application', undefined), 'uncertified');
  assert.equal(purposeRefusal('tenancy_application', false), 'uncertified');
  assert.equal(purposeRefusal('tenancy_application', 'true'), 'uncertified');
  assert.equal(purposeRefusal('tenancy_application', 1), 'uncertified');
  assert.equal(purposeRefusal('tenancy_application', 'yes'), 'uncertified');
});

test('the purpose is checked before the certification', () => {
  // Otherwise an uncertified request for an impermissible purpose would be
  // reported as merely uncertified, and somebody would tick the box and retry.
  assert.equal(purposeRefusal('employment', false), 'unknown');
});

test('every purpose has a label a person can read', () => {
  for (const id of SCREENING_PURPOSES) {
    assert.ok(SCREENING_PURPOSE_LABELS[id]?.length > 20, `${id} needs a real label`);
  }
});

test('the certification wording is not empty', () => {
  // An uncertified order is the thing to prevent; an empty certification would
  // be a tickbox agreeing to nothing.
  assert.ok(SCREENING_PURPOSE_CERTIFICATION.length > 40);
});

test('every purpose refusal has something the landlord can act on', () => {
  for (const reason of ['missing', 'unknown', 'uncertified'] as const) {
    assert.ok(purposeRefusalMessage(reason).length > 20, `${reason} needs a real message`);
  }
});

test('the landlord view shows the purpose and when it was certified', () => {
  const view = landlordView(order({ permissiblePurpose: 'tenancy_application', certifiedAt: '2026-10-03T12:00:00.000Z' }));
  assert.equal(view.permissiblePurpose, 'tenancy_application');
  assert.equal(view.certifiedAt, '2026-10-03T12:00:00.000Z');
});

test('the APPLICANT view does not carry the certification', () => {
  // Who certified what, and in which words, is between the landlord and the
  // agency. The applicant's own authorisation is a separate record.
  const view = applicantView(order({ permissiblePurpose: 'tenancy_application', certifiedBy: EMAIL, certificationText: 'x' }));
  assert.equal('permissiblePurpose' in view, false);
  assert.equal('certifiedBy' in view, false);
  assert.equal('certificationText' in view, false);
});

/* ── turning somebody down ────────────────────────────────────────────────── */

const agency = { legalName: 'Example Screening Inc.', address: '1 Example Way, Boston MA', phone: '1-800-555-0100' };
const completed = order({ status: 'complete', providerRef: 'x_1', applicantName: 'Jo Smith' });

test('a notice is owed when a complete report counted against a rejection', () => {
  assert.equal(adverseActionRefusal(completed, 'rejected', true, agency), null);
});

test('an approval owes nothing', () => {
  assert.equal(adverseActionRefusal(completed, 'approved', true, agency), 'not_declined');
});

test('a rejection with no completed report owes nothing', () => {
  assert.equal(adverseActionRefusal(order({ status: 'invited' }), 'rejected', true, agency), 'no_screening');
  assert.equal(adverseActionRefusal(order({ status: 'expired' }), 'rejected', true, agency), 'no_screening');
  assert.equal(adverseActionRefusal(null, 'rejected', true, agency), 'no_screening');
});

test('a rejection the report did not bear on owes nothing', () => {
  // The obligation attaches to a decision made BECAUSE OF the report. Producing
  // a notice anyway would put words in the landlord's mouth about why they
  // declined.
  assert.equal(adverseActionRefusal(completed, 'rejected', false, agency), 'report_not_used');
  assert.equal(adverseActionRefusal(completed, 'rejected', undefined, agency), 'report_not_used');
  // And a truthy accident is not an answer about somebody's own reasoning.
  assert.equal(adverseActionRefusal(completed, 'rejected', 'yes', agency), 'report_not_used');
  assert.equal(adverseActionRefusal(completed, 'rejected', 1, agency), 'report_not_used');
});

test('an unknown agency refuses the notice rather than issuing a blank one', () => {
  // A notice naming no agency cannot tell somebody where their file is, which is
  // the only thing it is for.
  assert.equal(adverseActionRefusal(completed, 'rejected', true, null), 'agency_unknown');
  assert.equal(adverseActionRefusal(completed, 'rejected', true, { ...agency, legalName: '  ' }), 'agency_unknown');
  assert.equal(adverseActionRefusal(completed, 'rejected', true, { ...agency, phone: '' }), 'agency_unknown');
});

test('the decision is read case-insensitively', () => {
  assert.equal(adverseActionRefusal(completed, 'REJECTED', true, agency), null);
});

test('the notice names the agency in every statement that needs it', () => {
  const n = adverseActionNotice({ applicantName: 'Jo Smith', decidedAt: '2026-10-03T12:00:00.000Z', agency });
  assert.equal(n.draft, true);
  assert.equal(n.agency.legalName, agency.legalName);
  assert.equal(n.statements.length, 5);
  // The three statements that send somebody somewhere must say where.
  const naming = n.statements.filter((s) => s.includes(agency.legalName));
  assert.equal(naming.length, 4);
  assert.ok(n.statements.some((s) => s.includes('60 days')));
  assert.ok(n.statements.some((s) => s.toLowerCase().includes('dispute')));
  assert.ok(n.statements.some((s) => s.includes(agency.phone)));
});

test('the notice is always marked a draft', () => {
  // Until a lawyer has read it, nothing produced here may look final.
  assert.equal(adverseActionNotice({ applicantName: 'A', decidedAt: 'x', agency }).draft, true);
});
