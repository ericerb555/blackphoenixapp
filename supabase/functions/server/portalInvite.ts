/**
 * Inviting somebody into a portal: the link, the account, the email and SMS.
 *
 * WHY THIS IS ITS OWN FILE
 *
 * `deliverPortalInvite` is how every portal account is created and told about
 * itself. It is called from six places and lived in the middle of
 * `index.tsx`, which is why `condo-associations.tsx` receives it as an
 * INJECTED DEPENDENCY rather than importing it — the same workaround that
 * `identity.ts` removed for `intakeActor`.
 *
 * Moved as the last prerequisite for lifting the rental and portal routes out
 * of `index.tsx`; see `tasks/phoenix-ai-audit.md`.
 *
 * WHAT IS GROUPED HERE AND WHY
 *
 * The four pieces are one job in sequence: work out where the invite should
 * land (`buildInviteRedirect`), make sure the account exists
 * (`ensureAuthUser`), mint a link that signs them in
 * (`generateInviteActionLink`), and send it (`deliverPortalInvite`). They were
 * already only used together, in that order.
 *
 * `generateInviteActionLink` and `ensureAuthUser` take the Supabase client as
 * an argument rather than reaching for one, which is how they were written
 * and is worth keeping: both mint credentials, and a caller passing the
 * client makes it obvious which key that is being done with.
 *
 * The bodies are unchanged.
 */
import * as kv from "./kv_store.tsx";
import { createClient } from "npm:@supabase/supabase-js@2";
import { APP_URL, resolveCompanyName, toE164 } from "./serverPrimitives.ts";
import { REPLY_TO_EMAIL } from "./emailIdentity.ts";
import { resolveTwilioCreds, describeTwilioError } from "./twilio.ts";
import {
  buildPortalInviteEmail, buildPortalInviteSms, effectiveInviteFields,
  type InviteFields,
} from "./portal-invite-email.ts";

/** Service-role client, built on first use. Same shape as `identity.ts`. */
let cached: any = null;
function supabaseAdmin() {
  if (!cached) {
    cached = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );
  }
  return cached;
}

export const INVITE_TEMPLATE_KEY = (portalType: string) => `portal_invite_template:${portalType}`;

export function buildInviteRedirect(appUrl: string, portalType: string): string {
  // Normalize APP_URL to its ORIGIN only. If someone sets APP_URL to a full path
  // (e.g. "https://site.com/portal-onboarding"), naively appending would produce
  // ".../portal-onboarding/portal-onboarding" and the link would 404. Strip any
  // path/query so we always build exactly one clean /portal-onboarding URL.
  let origin = appUrl.trim();
  try { origin = new URL(appUrl).origin; } catch { origin = appUrl.replace(/\/+$/, '').replace(/\/portal-onboarding.*$/i, ''); }
  // The live app is served at the WWW host. APP_URL has been set without the
  // "www." prefix, which sends invite recipients to a host that doesn't serve
  // the app (the "Access your portal" button appears to do nothing). Force the
  // canonical www host for our domain so the link always lands on the real app,
  // regardless of how the APP_URL env var is configured.
  origin = origin.replace(/^https?:\/\/theblackphoenixcompany\.com/i, 'https://www.theblackphoenixcompany.com');
  const base = `${origin}/portal-onboarding`;
  const route = PORTAL_APPLICATION_ROUTE[portalType];
  return route ? `${base}?apply=${encodeURIComponent(route)}` : base;
}

export async function ensureAuthUser(supabase: any, email: string, metadata: Record<string, unknown>): Promise<string | null> {
  try {
    const tempPassword = `Bpx-${crypto.randomUUID()}`;
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password: tempPassword,
      user_metadata: metadata,
      // Authority is read from app_metadata only, because the browser can write
      // user_metadata and an account that names its own role is not a check.
      // Both callers pass a `role`; anything else lands with no role at all,
      // which is the safe direction.
      app_metadata: metadata.role ? { role: metadata.role } : {},
      // Confirm immediately — no email server round-trip needed; they set their
      // real password via our invite-token flow.
      email_confirm: true,
    });
    if (!error && data?.user?.id) return data.user.id;
  } catch (_) { /* fall through to lookup */ }
  // Already exists — recover the user id via generateLink (returns the user
  // record without sending an email).
  try {
    const { data } = await supabase.auth.admin.generateLink({ type: 'recovery', email });
    if (data?.user?.id) {
      // Re-invite of an account that already existed. If it has no role in the
      // trustworthy bag it would come back from this with no authority at all,
      // so stamp the one this invitation grants. Only ever fills a blank —
      // never overwrites a role somebody was already given.
      if (metadata.role && !data.user.app_metadata?.role) {
        try {
          await supabase.auth.admin.updateUserById(data.user.id, { app_metadata: { role: metadata.role } });
        } catch (_) { /* the invite still stands; the role can be set by hand */ }
      }
      /**
       * Confirm the address, exactly as the `createUser` call above does for a
       * brand-new invitee.
       *
       * Without this, re-inviting somebody could never rescue them. This
       * project has `mailer_autoconfirm: false`, so an unconfirmed account is
       * refused at sign-in whatever its password — and every account left over
       * from the old `inviteUserByEmail` path is unconfirmed, because that
       * invitation went over Supabase Auth's SMTP, which answers
       * `535 "Invalid username"` and delivers nothing. Five accounts on this
       * project are in that state, four of them real people. Resending the
       * invite is the obvious thing an administrator would try, and it would
       * have quietly left them just as locked out as before.
       *
       * The same reasoning as a new invitee applies: an administrator is
       * deliberately inviting this address and the invitation is being emailed
       * to it. Only ever fills a blank — an already-confirmed account is left
       * alone.
       */
      if (!data.user.email_confirmed_at) {
        try {
          await supabase.auth.admin.updateUserById(data.user.id, { email_confirm: true });
        } catch (_) { /* the invite still stands; they can confirm via reset */ }
      }
      return data.user.id;
    }
  } catch (_) { /* ignore */ }
  return null;
}

export async function generateInviteActionLink(
  supabase: any,
  email: string,
  metadata: Record<string, unknown>,
  redirectTo: string,
): Promise<string> {
  const attempts: Array<{ type: string; options: Record<string, unknown> }> = [
    { type: 'invite',    options: { data: metadata, redirectTo } },
    { type: 'magiclink', options: { redirectTo } },
    { type: 'recovery',  options: { redirectTo } },
  ];
  for (const attempt of attempts) {
    try {
      const { data, error } = await supabase.auth.admin.generateLink({ type: attempt.type, email, options: attempt.options });
      const link = data?.properties?.action_link || data?.action_link;
      if (!error && link) return link;
      if (error) console.log(`ℹ️ [PortalInvite] generateLink(${attempt.type}) failed: ${error.message}`);
    } catch (e: any) {
      console.log(`ℹ️ [PortalInvite] generateLink(${attempt.type}) threw: ${e?.message || e}`);
    }
  }
  // Last resort: send them straight to the app's onboarding page.
  console.log('ℹ️ [PortalInvite] All Supabase link types failed; using direct onboarding URL.');
  return redirectTo;
}

export async function deliverPortalInvite(opts: { name: string; email: string; phone: string; portalType: string; grantFullAccess: boolean; trialMonths: number; sendEmail: boolean; sendSms: boolean; wantQr: boolean; }) {
  const { name, email, phone, portalType, grantFullAccess, trialMonths, sendEmail, sendSms, wantQr } = opts;
  let invitationSent = false; let inviteNotice = ''; let emailProvider = '';
  let smsSent = false; let smsNotice = ''; let qrDataUrl: string | null = null; let inviteLink: string | null = null;
  const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') || '';
  const COMPANY_NAME = resolveCompanyName();
  const FROM_EMAIL = Deno.env.get('NOTIFICATION_FROM_EMAIL') || 'onboarding@resend.dev';
  const LOGO_URL = Deno.env.get('COMPANY_LOGO_URL') || `${APP_URL.replace(/\/$/, '')}/bpb-phoenix-logo.png`;
  const metadata = { full_name: name, phone, role: portalType, accountType: portalType };
  const inviteOverrides = (await kv.get(INVITE_TEMPLATE_KEY(portalType))) as InviteFields | null;
  const inviteRedirectTo = buildInviteRedirect(APP_URL, portalType);
  inviteLink = await generateInviteActionLink(supabaseAdmin(), email, metadata, inviteRedirectTo);
  // Account-setup: ensure account exists + mint a one-time token so the button
  // takes the recipient straight to the "create your password" step.
  const resendApplicationId = (await kv.get(`intake:email:${email}`) as string | null) || `OWNER-INVITE-${crypto.randomUUID()}`;
  const provisionedUserId = await ensureAuthUser(supabaseAdmin(), email, metadata);
  const inviteToken = await mintInviteToken(email, provisionedUserId, resendApplicationId, portalType);
  const buttonLink = buildDirectOnboardingLink(APP_URL, portalType, email, inviteToken);
  if (sendEmail) {
    try {
      if (RESEND_API_KEY) {
        const { subject, html, text } = buildPortalInviteEmail({ name, portalType, signInUrl: buttonLink, companyName: COMPANY_NAME, logoUrl: LOGO_URL, fullAccess: grantFullAccess, trialMonths, overrides: inviteOverrides || undefined });
        const res = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ from: `${COMPANY_NAME} <${FROM_EMAIL}>`, reply_to: REPLY_TO_EMAIL, to: [email], subject, html, text }) });
        if (!res.ok) { const errBody = await res.text().catch(() => ''); throw new Error(`Resend send failed (${res.status}): ${errBody}`); }
        invitationSent = true; emailProvider = 'resend';
      } else { throw new Error('RESEND_API_KEY not configured — using Supabase invite.'); }
    } catch (brandedError: any) {
      // NO Supabase fallback — see note in the primary invite route. Surface the real error.
      inviteNotice = `Invite email could NOT be sent from ${FROM_EMAIL}. Resend error: ${brandedError?.message || brandedError}`;
      invitationSent = false; emailProvider = '';
      console.log(`❌ [PortalInvite:resend] Branded Resend send failed (NO numbered fallback): ${brandedError?.message || brandedError}`);
    }
  }
  if (sendSms) {
    const twilio = resolveTwilioCreds();
    if (twilio.error) { smsNotice = twilio.error; }
    else if (!phone) { smsNotice = 'No phone number provided for SMS.'; }
    else if (!toE164(phone)) { smsNotice = `The phone number "${phone}" is not a valid number for SMS.`; }
    else {
      try {
        const toNumber = toE164(phone);
        const smsBody = buildPortalInviteSms({ name, portalType, signInUrl: buttonLink, companyName: COMPANY_NAME, fullAccess: grantFullAccess, trialMonths, overrides: inviteOverrides || undefined });
        const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${twilio.accountSid}/Messages.json`, { method: 'POST', headers: { Authorization: `Basic ${btoa(`${twilio.authUser}:${twilio.authPass}`)}`, 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ From: twilio.from, To: toNumber, Body: smsBody }) });
        if (!res.ok) { const err = await res.text().catch(() => ''); smsNotice = describeTwilioError(res.status, err, twilio); } else { smsSent = true; }
      } catch (e: any) { smsNotice = e?.message || 'SMS could not be sent.'; }
    }
  }
  if (wantQr && inviteLink) {
    try { const QRCode = (await import('npm:qrcode')).default; qrDataUrl = await QRCode.toDataURL(inviteLink, { width: 512, margin: 2 }); }
    catch (e: any) { console.log(`ℹ️ [PortalInvite:resend] QR generation failed: ${e?.message || e}`); }
  }
  return { invitationSent, inviteNotice, emailProvider, smsSent, smsNotice, qrDataUrl, inviteLink };
}
// Maps a portal type to the in-app application page the invitee should land on.
// Portal types without a dedicated application form fall through to the standard
// onboarding checklist. Used to deep-link the invite so recipients open the
// application for the exact portal they were invited to.
export const PORTAL_APPLICATION_ROUTE: Record<string, string> = {
  vendor: 'vendor-application',
  subcontractor: 'subcontractor-application',
  investor: 'investor-application',
  advertiser: 'advertiser-application',
  territory_owner: 'territory-application',
  // The tenant form is registered under 'apply' rather than a route named
  // after itself, so it has to be spelled out here.
  tenant: 'apply',
};
// Builds the invite redirect URL. Keeps the allowlisted /portal-onboarding path
// (so Supabase's Redirect URL allowlist still matches) and passes the target
// application route as a query param the app reads on load to deep-link there.

// Build the link that goes in the invite email/SMS button. Points DIRECTLY at
// the app's onboarding page (not a Supabase verify link) with the recipient's
// email prefilled and a one-time invite TOKEN, so the button always lands on
// the real app and the recipient can immediately create their password —
// regardless of any Supabase redirect-allowlist configuration.
export function buildDirectOnboardingLink(appUrl: string, portalType: string, email: string, token: string): string {
  const redirect = buildInviteRedirect(appUrl, portalType);
  const sep = redirect.includes('?') ? '&' : '?';
  return `${redirect}${sep}email=${encodeURIComponent(email)}&token=${encodeURIComponent(token)}`;
}

// Ensure a Supabase auth user exists for this email and return its id. Works
// whether the account is brand-new or already exists (re-invite). Does NOT send
// any email — account-setup email is sent by us via Resend.

// Mint and store a one-time invite token the recipient exchanges for a password.
export async function mintInviteToken(email: string, userId: string | null, applicationId: string, portalType: string): Promise<string> {
  const token = `invtok_${crypto.randomUUID().replace(/-/g, '')}${crypto.randomUUID().replace(/-/g, '')}`;
  const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(); // 14 days
  await kv.set(`invite_token:${token}`, { token, email, userId, applicationId, portalType, used: false, createdAt: new Date().toISOString(), expiresAt });
  return token;
}
