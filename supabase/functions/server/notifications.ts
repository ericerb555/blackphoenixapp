/**
 * Telling one person that something happened, on the channels they asked for.
 *
 * WHY THIS IS ITS OWN FILE
 *
 * `notifyRecipient` is called from 18 places in the rental and portal routes
 * alone, and it lived in the middle of `index.tsx`, so none of those routes
 * could be lifted out while it stayed there. Moved as a prerequisite for that
 * split; see `tasks/phoenix-ai-audit.md`.
 *
 * WHAT IT GUARANTEES, AND WHAT IT DELIBERATELY DOES NOT
 *
 * Best effort, and silent about its own failures by design. Every channel is
 * wrapped and the whole thing is wrapped again, because this is called from
 * inside request handlers that are doing something more important than
 * notifying — saving a work request, signing a lease, recording a payment.
 * Losing the notification is bad; failing the write because the notification
 * failed is worse.
 *
 * That trade is only acceptable because failures are logged rather than
 * swallowed. A notification nobody receives and nobody can see failing is the
 * thing this system was already guilty of once: the inbox, preferences, email
 * and SMS all worked and simply were never called for vendors and
 * subcontractors, so a vendor found out about a purchase order by opening
 * their portal and noticing.
 *
 * The in-app record is written first and is not conditional on the others,
 * so there is always somewhere the recipient can see what they were sent.
 *
 * The bodies are unchanged from `index.tsx`.
 */
import * as kv from "./kv_store.tsx";
import { toE164, resolveCompanyName } from "./serverPrimitives.ts";
import { sendTextMessage } from "./sendSms.ts";
import { REPLY_TO_EMAIL, NOTIFICATION_FROM_EMAIL } from "./emailIdentity.ts";

export const NOTIF_EVENTS = [
  'work_request', 'lease_signed', 'landlord_form', 'form_completed', 'message', 'payment',
  'purchase_order', 'bid',
] as const;
export type NotifEvent = typeof NOTIF_EVENTS[number];
// Human labels for the preferences UI (sent to the client alongside prefs).
export const NOTIF_EVENT_LABELS: Record<string, string> = {
  work_request: 'New maintenance / work requests',
  lease_signed: 'Lease signed by tenant',
  landlord_form: 'New form to complete',
  form_completed: 'Form completed by tenant',
  message: 'New portal messages',
  payment: 'Rent & payment activity',
  purchase_order: 'Purchase orders sent to you',
  bid: 'Bid invitations and results',
};

export function notifPrefsKey(email: string) { return `notif_prefs:${String(email).toLowerCase()}`; }
export function notifInboxKey(email: string) { return `notif_inbox:${String(email).toLowerCase()}`; }

export function defaultNotifPrefs(email: string, phone = '') {
  const events: Record<string, { email: boolean; sms: boolean; inApp: boolean }> = {};
  for (const e of NOTIF_EVENTS) events[e] = { email: true, sms: true, inApp: true };
  return { email: String(email || '').toLowerCase(), phone: phone || '', events, updatedAt: null as string | null };
}

export async function loadNotifPrefs(email: string) {
  const lower = String(email || '').toLowerCase();
  if (!lower) return null;
  const saved = await kv.get(notifPrefsKey(lower)) as any;
  if (!saved) return defaultNotifPrefs(lower);
  const base = defaultNotifPrefs(lower, saved.phone);
  const mergedEvents: Record<string, any> = { ...base.events };
  for (const e of NOTIF_EVENTS) mergedEvents[e] = { ...base.events[e], ...(saved.events?.[e] || {}) };
  return { ...base, ...saved, events: mergedEvents };
}

// Persist an in-app notification to the recipient's inbox (capped, newest-first).
export async function pushInAppNotification(email: string, event: string, title: string, body: string) {
  const lower = String(email || '').toLowerCase();
  if (!lower) return;
  try {
    const inbox = (await kv.get(notifInboxKey(lower)) as any[]) || [];
    const record = { id: `ntf_${Date.now()}_${crypto.randomUUID().slice(0, 6)}`, event, title, body, read: false, createdAt: new Date().toISOString() };
    await kv.set(notifInboxKey(lower), [record, ...inbox].slice(0, 100));
  } catch (e) { console.error(`[pushInAppNotification] failed for ${lower}:`, e); }
}

// Best-effort fan-out to one recipient honoring their saved channel prefs.
export async function notifyRecipient(email: string, event: NotifEvent, opts: { subject: string; text: string; html?: string; sms?: string }) {
  try {
    const lower = String(email || '').toLowerCase();
    if (!lower) return;
    const prefs = await loadNotifPrefs(lower);
    const evt = (prefs?.events?.[event]) || { email: true, sms: true, inApp: true };
    const COMPANY_NAME = resolveCompanyName();

    // Always record an in-app notification (unless the user muted this event in-app).
    if (evt.inApp !== false) { await pushInAppNotification(lower, event, opts.subject, opts.text); }

    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') || '';
    if (evt.email && RESEND_API_KEY) {
      try {
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: `${COMPANY_NAME} <${NOTIFICATION_FROM_EMAIL}>`,
            reply_to: REPLY_TO_EMAIL,
            to: [lower], subject: opts.subject, text: opts.text,
            html: opts.html || `<div style="font-family:sans-serif;max-width:600px;padding:24px;line-height:1.5">${opts.text.replace(/\n/g, '<br/>')}</div>`,
          }),
        });
        if (!res.ok) console.error(`[notifyRecipient] email error for ${lower} (${event}):`, await res.text());
      } catch (e) { console.error(`[notifyRecipient] email exception for ${lower} (${event}):`, e); }
    }

    const phone = String(prefs?.phone || '').trim();
    if (evt.sms && phone) {
      try {
        // 'service' — these are operational notices about something the
        // recipient already has with us, not receipts and not marketing.
        const result = await sendTextMessage(toE164(phone), (opts.sms || opts.text).slice(0, 320), 'service');
        if (!result.ok) console.error(`[notifyRecipient] sms error for ${lower} (${event}):`, result.error);
      } catch (e) { console.error(`[notifyRecipient] sms exception for ${lower} (${event}):`, e); }
    }
  } catch (e) { console.error(`[notifyRecipient] fatal for ${email} (${event}):`, e); }
}
