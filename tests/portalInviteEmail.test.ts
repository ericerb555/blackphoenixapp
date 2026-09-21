/**
 * The portal invitation email, and the plan block in particular.
 *
 * WHY THIS IS WORTH TESTING
 *
 * This is the one file in the codebase whose output lands in somebody else's
 * inbox with the company's name on it. A broken template is not a rendering
 * glitch, it is a customer reading "keeps everything switched on for
 * {planPrice}" and forming a view about who they are dealing with.
 *
 * The half-rendered case is the realistic one. A caller that knows the plan
 * name but not the price — because the tier has no price set yet — is exactly
 * what the catalogue allows, so the email has to decide what to do about it
 * rather than interpolating a blank.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildPortalInviteEmail, buildPortalInviteSms,
  defaultInviteFields, effectiveInviteFields, INVITE_FIELD_DEFS,
} from '../supabase/functions/server/portal-invite-email.ts';

const base = {
  name: 'Wanda Atherton',
  portalType: 'vendor',
  signInUrl: 'https://example.com/portal-onboarding?token=abc',
  companyName: 'Black Phoenix',
  fullAccess: true,
  trialMonths: 3,
};

// ── the plan block appears only when it is complete ────────────────────────

test('a plan with a name and a price is offered', () => {
  const { html, text: _t } = buildPortalInviteEmail({
    ...base, planName: 'Listed', planPrice: '$29/month',
  });
  assert.match(html, /Listed/);
  assert.match(html, /\$29\/month/);
});

test('a plan name with no price renders NOTHING, not a half sentence', () => {
  const { html } = buildPortalInviteEmail({ ...base, planName: 'Listed' });
  assert.ok(!html.includes('Listed'), 'the block must not render at all');
  assert.ok(!html.includes('{planPrice}'), 'and must never leak a raw token');
});

test('a price with no plan name renders nothing either', () => {
  const { html } = buildPortalInviteEmail({ ...base, planPrice: '$29/month' });
  assert.ok(!html.includes('$29/month'));
  assert.ok(!html.includes('{planName}'));
});

test('no plan at all is a clean invite', () => {
  const { html } = buildPortalInviteEmail(base);
  assert.ok(!html.includes('{planName}'));
  assert.ok(!html.includes('{planPrice}'));
  assert.ok(!html.includes('keeps everything switched on'));
});

test('whitespace is not a plan', () => {
  const { html } = buildPortalInviteEmail({ ...base, planName: '  ', planPrice: '$29/month' });
  assert.ok(!html.includes('$29/month'));
});

// ── no raw tokens ever reach a recipient ───────────────────────────────────

test('no unreplaced token survives into the email, whatever is supplied', () => {
  for (const input of [
    base,
    { ...base, planName: 'Listed', planPrice: '$29/month' },
    { ...base, fullAccess: false },
    { ...base, name: '', companyName: '' },
  ]) {
    const { html, subject, text } = buildPortalInviteEmail(input as any);
    for (const out of [html, subject, text]) {
      assert.ok(!/\{(firstName|company|label|trialPeriod|trialMonths|planName|planPrice)\}/.test(out),
        `a raw token reached the recipient: ${out.match(/\{\w+\}/)?.[0]}`);
    }
  }
});

// ── the SMS stays in step with the email ───────────────────────────────────

test('the text message offers the plan on the same terms', () => {
  const sms = buildPortalInviteSms({ ...base, planName: 'Listed', planPrice: '$29/month' });
  assert.match(sms, /Listed/);
  assert.match(sms, /\$29\/month/);
});

test('the text message also refuses a half plan', () => {
  const sms = buildPortalInviteSms({ ...base, planName: 'Listed' });
  assert.ok(!sms.includes('Listed'));
  assert.ok(!sms.includes('{planPrice}'));
});

test('the text message stays inside its length cap', () => {
  const sms = buildPortalInviteSms({
    ...base,
    planName: 'A'.repeat(200), planPrice: 'B'.repeat(200),
    overrides: { intro: 'C'.repeat(400), blurb: 'D'.repeat(400) },
  });
  assert.ok(sms.length <= 480, `an SMS of ${sms.length} would be split into many segments`);
});

// ── the editor and the template agree ──────────────────────────────────────

test('every editable field the editor lists actually exists in the defaults', () => {
  const defaults = defaultInviteFields('vendor');
  for (const def of INVITE_FIELD_DEFS) {
    assert.ok(def.key in defaults, `${def.key} is offered for editing but has no default`);
  }
});

test('the plan line is editable, so the offer can be worded per portal', () => {
  assert.ok(INVITE_FIELD_DEFS.some(d => d.key === 'planLine'));
});

test('an override replaces the default, and a blank one does not', () => {
  const custom = effectiveInviteFields('vendor', { planLine: 'Then it is {planPrice}.' });
  assert.equal(custom.planLine, 'Then it is {planPrice}.');
  const blank = effectiveInviteFields('vendor', { planLine: '   ' });
  assert.equal(blank.planLine, defaultInviteFields('vendor').planLine, 'whitespace must not erase the copy');
});

test('a custom plan line still gets its tokens filled', () => {
  const { html } = buildPortalInviteEmail({
    ...base, planName: 'Stocked', planPrice: '$69/month',
    overrides: { planLine: 'After the trial: {planName} at {planPrice}.' },
  });
  assert.match(html, /After the trial: Stocked at \$69\/month\./);
});

// ── escaping, because this is HTML going to a stranger ─────────────────────

test('a plan name with markup in it cannot inject into the email', () => {
  const { html } = buildPortalInviteEmail({
    ...base,
    planName: '<script>alert(1)</script>',
    planPrice: '$29/month',
  });
  assert.ok(!html.includes('<script>'), 'markup in a vendor-supplied name must be escaped');
  assert.match(html, /&lt;script&gt;/);
});
