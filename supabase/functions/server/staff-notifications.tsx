/**
 * Staff Notification Engine
 *
 * One place that decides WHO on the team gets emailed when something important
 * happens in the platform, and actually sends it.
 *
 * Three events are supported today:
 *   signup       — someone registers for any portal
 *   payment      — any payment is captured (store, marketplace, invoice)
 *   work_request — a work request comes in
 *
 * Recipients live in the KV store so the owner can add or remove admins and
 * employees from the dashboard without a redeploy. Addresses in the
 * ADMIN_NOTIFICATION_EMAILS secret are always included and cannot be removed
 * from the UI — that is the owner's own safety net, so a misclick can never
 * silence every alert.
 *
 * Storage:
 *   staff_notification_recipients        -> Recipient[]
 *   staff_notification_log:{ts}_{rand}   -> delivery record
 */

import * as kv from './kv_store.tsx';

const RECIPIENTS_KEY = 'staff_notification_recipients';
const LOG_PREFIX = 'staff_notification_log:';

export const STAFF_NOTIFICATION_EVENTS = ['signup', 'payment', 'work_request'] as const;
export type StaffNotificationEvent = typeof STAFF_NOTIFICATION_EVENTS[number];

export const STAFF_NOTIFICATION_EVENT_LABELS: Record<StaffNotificationEvent, string> = {
  signup: 'New portal sign-ups',
  payment: 'Payments received',
  work_request: 'New work requests',
};

export const STAFF_NOTIFICATION_EVENT_DESCRIPTIONS: Record<StaffNotificationEvent, string> = {
  signup: 'Emailed whenever someone registers for any portal — customer, vendor, contractor, tenant or landlord.',
  payment: 'Emailed whenever a payment is captured, including which Stripe account received it.',
  work_request: 'Emailed whenever a client submits a work or service request.',
};

export interface StaffRecipient {
  id: string;
  email: string;
  name: string;
  role: 'owner' | 'admin' | 'employee';
  events: StaffNotificationEvent[];
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

function companyName() {
  return Deno.env.get('COMPANY_NAME') || 'The Black Phoenix Company';
}

function fromEmail() {
  return Deno.env.get('NOTIFICATION_FROM_EMAIL') || 'onboarding@resend.dev';
}

function replyToEmail() {
  return Deno.env.get('REPLY_TO_EMAIL') || 'blackphoenixbuilds@proton.me';
}

function appUrl() {
  return (Deno.env.get('APP_URL') || 'https://www.theblackphoenixcompany.com').replace(/\/$/, '');
}

/** Addresses from the secret. Always notified about everything. */
export function ownerEmailsFromEnv(): string[] {
  const raw = Deno.env.get('ADMIN_NOTIFICATION_EMAILS') || '';
  return raw.split(',').map(e => e.trim().toLowerCase()).filter(Boolean);
}

export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());
}

export async function loadStaffRecipients(): Promise<StaffRecipient[]> {
  const rows = await kv.get(RECIPIENTS_KEY);
  return Array.isArray(rows) ? rows : [];
}

export async function saveStaffRecipients(rows: StaffRecipient[]): Promise<void> {
  await kv.set(RECIPIENTS_KEY, rows);
}

/**
 * Everyone who should receive this event: the env owner addresses plus every
 * enabled recipient subscribed to it. De-duplicated, lowercased.
 */
export async function recipientsForEvent(event: StaffNotificationEvent): Promise<string[]> {
  const configured = await loadStaffRecipients();
  const subscribed = configured
    .filter(r => r?.enabled !== false && Array.isArray(r?.events) && r.events.includes(event))
    .map(r => String(r.email || '').toLowerCase().trim())
    .filter(isValidEmail);

  return [...new Set([...ownerEmailsFromEnv(), ...subscribed])];
}

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export interface StaffNotificationPayload {
  /** Short line shown as the email subject, without the company prefix. */
  subject: string;
  /** Big heading inside the email. */
  heading: string;
  /** Label/value pairs rendered as a table. */
  rows: Array<[string, unknown]>;
  /** Optional deep link button. */
  ctaLabel?: string;
  ctaPath?: string;
  /** Optional note under the table. */
  note?: string;
  /**
   * Stable key for this real-world occurrence (e.g. `work_request:wr_123`).
   * Several code paths can observe the same event — the intake form posts to
   * both /work-requests and /notifications/work-request — and without this the
   * team would get the same alert twice. A repeat within the dedupe window is
   * recorded and skipped.
   */
  dedupeKey?: string;
}

const DEDUPE_PREFIX = 'staff_notify_dedupe:';
const DEDUPE_WINDOW_MS = 10 * 60 * 1000;

async function alreadyNotified(dedupeKey: string): Promise<boolean> {
  try {
    const seen = await kv.get(`${DEDUPE_PREFIX}${dedupeKey}`) as any;
    if (!seen?.at) return false;
    return Date.now() - new Date(seen.at).getTime() < DEDUPE_WINDOW_MS;
  } catch {
    // If the dedupe lookup fails, prefer sending over staying silent.
    return false;
  }
}

function renderEmail(payload: StaffNotificationPayload): { html: string; text: string } {
  const rowsHtml = payload.rows
    .filter(([, value]) => value !== undefined && value !== null && String(value).trim() !== '')
    .map(([label, value]) => `
      <tr>
        <td style="padding:8px 12px;color:#777;font-size:13px;border-bottom:1px solid #eee;white-space:nowrap">${escapeHtml(label)}</td>
        <td style="padding:8px 12px;color:#111;font-size:14px;font-weight:600;border-bottom:1px solid #eee">${escapeHtml(value)}</td>
      </tr>`)
    .join('');

  const cta = payload.ctaPath
    ? `<a href="${appUrl()}${payload.ctaPath}" style="display:inline-block;margin-top:20px;padding:12px 24px;background:#ea580c;color:#fff;text-decoration:none;border-radius:8px;font-weight:bold;font-size:14px">${escapeHtml(payload.ctaLabel || 'Open the dashboard')} →</a>`
    : '';

  const note = payload.note
    ? `<p style="margin-top:16px;color:#777;font-size:12px;line-height:1.5">${escapeHtml(payload.note)}</p>`
    : '';

  const html = `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#fff">
  <h2 style="color:#ea580c;margin:0 0 4px">${escapeHtml(payload.heading)}</h2>
  <p style="margin:0 0 20px;color:#777;font-size:13px">${escapeHtml(companyName())}</p>
  <table style="width:100%;border-collapse:collapse;border:1px solid #eee;border-radius:8px;overflow:hidden">${rowsHtml}</table>
  ${cta}
  ${note}
  <p style="margin-top:28px;padding-top:16px;border-top:1px solid #eee;color:#999;font-size:11px">
    You are receiving this because your address is on the staff notification list.
    An owner can change who gets these in the Owner Dashboard → Notification Recipients.
  </p>
</div>`;

  const text = [
    payload.heading,
    '',
    ...payload.rows
      .filter(([, value]) => value !== undefined && value !== null && String(value).trim() !== '')
      .map(([label, value]) => `${label}: ${value}`),
    payload.ctaPath ? `\n${appUrl()}${payload.ctaPath}` : '',
    payload.note ? `\n${payload.note}` : '',
  ].join('\n');

  return { html, text };
}

export interface StaffNotificationResult {
  sent: boolean;
  recipients: string[];
  error?: string;
}

/**
 * Send an event email to everyone subscribed. Never throws — a notification
 * failure must not roll back the signup, payment or work request that
 * triggered it. Every attempt is logged so the owner can audit delivery.
 */
export async function notifyStaff(
  event: StaffNotificationEvent,
  payload: StaffNotificationPayload,
): Promise<StaffNotificationResult> {
  const logId = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  let recipients: string[] = [];

  try {
    if (payload.dedupeKey && await alreadyNotified(payload.dedupeKey)) {
      console.log(`[StaffNotify:${event}] Skipped duplicate for ${payload.dedupeKey}.`);
      return { sent: false, recipients: [], error: 'Duplicate notification suppressed.' };
    }

    recipients = await recipientsForEvent(event);

    if (recipients.length === 0) {
      const error = 'No recipients are subscribed to this event, so no email was sent.';
      console.log(`[StaffNotify:${event}] ${error}`);
      await kv.set(`${LOG_PREFIX}${logId}`, {
        id: logId, event, subject: payload.subject, recipients: [], status: 'skipped', error, sentAt: new Date().toISOString(),
      });
      return { sent: false, recipients: [], error };
    }

    const apiKey = Deno.env.get('RESEND_API_KEY') || '';
    if (!apiKey) {
      const error = 'RESEND_API_KEY is not set in the edge function secrets, so no email could be sent.';
      console.log(`[StaffNotify:${event}] ${error}`);
      await kv.set(`${LOG_PREFIX}${logId}`, {
        id: logId, event, subject: payload.subject, recipients, status: 'failed', error, sentAt: new Date().toISOString(),
      });
      return { sent: false, recipients, error };
    }

    const { html, text } = renderEmail(payload);
    const subject = `[${companyName()}] ${payload.subject}`;

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: `${companyName()} <${fromEmail()}>`,
        reply_to: replyToEmail(),
        to: recipients,
        subject,
        html,
        text,
      }),
    });

    const body = await response.text();
    if (!response.ok) {
      const error = `Resend rejected the notification (${response.status}): ${body}`;
      console.log(`[StaffNotify:${event}] ${error}`);
      await kv.set(`${LOG_PREFIX}${logId}`, {
        id: logId, event, subject, recipients, status: 'failed', error, sentAt: new Date().toISOString(),
      });
      return { sent: false, recipients, error };
    }

    if (payload.dedupeKey) {
      await kv.set(`${DEDUPE_PREFIX}${payload.dedupeKey}`, { key: payload.dedupeKey, at: new Date().toISOString() });
    }

    console.log(`[StaffNotify:${event}] Sent to ${recipients.length} recipient(s).`);
    await kv.set(`${LOG_PREFIX}${logId}`, {
      id: logId, event, subject, recipients, status: 'sent', providerResponse: body.slice(0, 500), sentAt: new Date().toISOString(),
    });
    return { sent: true, recipients };
  } catch (err: any) {
    const error = err?.message || String(err);
    console.log(`[StaffNotify:${event}] Unexpected failure: ${error}`);
    try {
      await kv.set(`${LOG_PREFIX}${logId}`, {
        id: logId, event, subject: payload.subject, recipients, status: 'failed', error, sentAt: new Date().toISOString(),
      });
    } catch { /* logging must never throw either */ }
    return { sent: false, recipients, error };
  }
}

/** Fire-and-forget wrapper for use inside request handlers that must not block. */
export function notifyStaffInBackground(event: StaffNotificationEvent, payload: StaffNotificationPayload): void {
  notifyStaff(event, payload).catch(err =>
    console.log(`[StaffNotify:${event}] Background send failed: ${err?.message || err}`));
}

export async function loadStaffNotificationLog(limit = 50): Promise<any[]> {
  const rows = (await kv.getByPrefix(LOG_PREFIX)) || [];
  return rows
    .filter(Boolean)
    .sort((a: any, b: any) => String(b?.sentAt || '').localeCompare(String(a?.sentAt || '')))
    .slice(0, limit);
}
