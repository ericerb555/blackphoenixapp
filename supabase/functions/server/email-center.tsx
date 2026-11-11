// Email Center API Routes
// Powers the "Emails" section of the User Management Hub:
//  - Editable, reusable email templates (subject + HTML body)
//  - A log of every email that has actually been sent out
//  - A send endpoint that delivers via Resend and records the send in the log
//
// Storage (KV, no schema changes required):
//   email_template:{key}   -> { key, name, subject, html, updatedAt }
//   email_log:{timestamp}  -> { id, to, subject, html, templateKey, status, provider, error, sentAt }
import { Hono } from 'npm:hono@4';
import * as kv from './kv_store.tsx';
import { REPLY_TO_EMAIL } from './emailIdentity.ts';

export const emailCenterRouter = new Hono();

const TEMPLATE_PREFIX = 'email_template:';
const LOG_PREFIX = 'email_log:';

const FROM_EMAIL =
  Deno.env.get('NOTIFICATION_FROM_EMAIL') || 'noreply@theblackphoenixcompany.com';
const COMPANY_NAME = Deno.env.get('COMPANY_NAME') || 'The Black Phoenix Company';
// REPLY_TO_EMAIL is imported from `emailIdentity.ts` at the top of this file.
// It was declared here, in `index.tsx` and in `fulfillment.tsx`, three times,
// with the same fallback written out three times.
//
// NOTE the sender above does NOT yet come from there. This file falls back to
// `noreply@theblackphoenixcompany.com` where the other two fall back to
// `onboarding@resend.dev`, so they have already drifted. Unifying them changes
// which address mail comes from when the secret is unset, which is a decision
// about deliverability rather than a tidy-up, so it is left alone and written
// down instead.

// ── Default templates (seeded on first read if none exist) ─────────────────
const DEFAULT_TEMPLATES = [
  {
    key: 'welcome',
    name: 'Welcome Email',
    subject: `Welcome to ${COMPANY_NAME}!`,
    html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
  <h1 style="color:#ea580c">Welcome{{name}}!</h1>
  <p>Thanks for joining ${COMPANY_NAME}. We're excited to have you on board.</p>
  <p>If you have any questions, just reply to this email.</p>
  <a href="https://www.theblackphoenixcompany.com" style="display:inline-block;margin-top:16px;padding:12px 24px;background:#ea580c;color:#fff;text-decoration:none;border-radius:8px;font-weight:bold">Visit Your Account →</a>
</div>`,
  },
  {
    key: 'portal-invite',
    name: 'Portal Invitation',
    subject: `You're invited to your ${COMPANY_NAME} portal`,
    html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
  <h1 style="color:#ea580c">You've been invited</h1>
  <p>Hi{{name}}, you now have access to your ${COMPANY_NAME} portal.</p>
  <p>Click below to set your password and sign in.</p>
  <a href="{{link}}" style="display:inline-block;margin-top:16px;padding:12px 24px;background:#ea580c;color:#fff;text-decoration:none;border-radius:8px;font-weight:bold">Accept Invitation →</a>
</div>`,
  },
  {
    key: 'work-request-ack',
    name: 'Work Request Received',
    subject: `We received your request — ${COMPANY_NAME}`,
    html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
  <h1 style="color:#ea580c">Thanks{{name}}!</h1>
  <p>We received your service request and a member of our team will reach out shortly.</p>
  <p>{{details}}</p>
</div>`,
  },
];

async function ensureSeeded() {
  const existing = (await kv.getByPrefix(TEMPLATE_PREFIX)) || [];
  if (existing.length > 0) return existing;
  const now = new Date().toISOString();
  const seeded = DEFAULT_TEMPLATES.map((t) => ({ ...t, updatedAt: now }));
  await kv.mset(seeded.map((t) => ({ key: `${TEMPLATE_PREFIX}${t.key}`, value: t })));
  return seeded;
}

// Shared helper so other routers can record sends in the same log.
export async function logSentEmail(entry: {
  to: string | string[];
  subject: string;
  html?: string;
  templateKey?: string;
  status?: 'sent' | 'failed';
  provider?: string;
  error?: string;
}) {
  const sentAt = new Date().toISOString();
  const id = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const record = {
    id,
    to: Array.isArray(entry.to) ? entry.to.join(', ') : entry.to,
    subject: entry.subject,
    html: entry.html || '',
    templateKey: entry.templateKey || null,
    status: entry.status || 'sent',
    provider: entry.provider || 'resend',
    error: entry.error || null,
    sentAt,
  };
  // Key sorts chronologically; newest read/sorted client-side.
  await kv.set(`${LOG_PREFIX}${sentAt}_${id}`, record);
  return record;
}

// ── Templates ──────────────────────────────────────────────────────────────
emailCenterRouter.get('/templates', async (c) => {
  try {
    const templates = await ensureSeeded();
    templates.sort((a: any, b: any) => (a.name || '').localeCompare(b.name || ''));
    return c.json({ templates });
  } catch (error) {
    console.error('[EmailCenter] Failed to list templates:', error);
    return c.json({ error: `Failed to list templates: ${error}` }, 500);
  }
});

emailCenterRouter.put('/templates/:key', async (c) => {
  try {
    const key = c.req.param('key');
    const body = await c.req.json();
    const { name, subject, html } = body || {};
    if (!subject || !html) {
      return c.json({ error: 'subject and html are required' }, 400);
    }
    const record = {
      key,
      name: name || key,
      subject,
      html,
      updatedAt: new Date().toISOString(),
    };
    await kv.set(`${TEMPLATE_PREFIX}${key}`, record);
    return c.json({ template: record });
  } catch (error) {
    console.error('[EmailCenter] Failed to save template:', error);
    return c.json({ error: `Failed to save template: ${error}` }, 500);
  }
});

emailCenterRouter.delete('/templates/:key', async (c) => {
  try {
    const key = c.req.param('key');
    await kv.del(`${TEMPLATE_PREFIX}${key}`);
    return c.json({ success: true });
  } catch (error) {
    console.error('[EmailCenter] Failed to delete template:', error);
    return c.json({ error: `Failed to delete template: ${error}` }, 500);
  }
});

// ── Sent log ─────────────────────────────────────────────────────────────
emailCenterRouter.get('/log', async (c) => {
  try {
    const logs = (await kv.getByPrefix(LOG_PREFIX)) || [];
    logs.sort((a: any, b: any) => (b.sentAt || '').localeCompare(a.sentAt || ''));
    return c.json({ emails: logs.slice(0, 200) });
  } catch (error) {
    console.error('[EmailCenter] Failed to list sent log:', error);
    return c.json({ error: `Failed to list sent emails: ${error}` }, 500);
  }
});

/**
 * SENDING, AS A FUNCTION RATHER THAN A ROUTE.
 *
 * This was the body of `POST /send` and nothing else could reach it. The
 * assistant now proposes customer emails, and the alternative to exporting
 * this was a second copy of the Resend call — which would also have been a
 * second place to remember the sent log, so half the company's email would
 * have stopped appearing in the one screen that claims to show all of it.
 *
 * It returns rather than throws, because both callers want to RECORD a
 * failure: the route turns it into a 502, the action turns it into a failed
 * row in the approval queue, and in both cases the attempt is already in the
 * log before anybody is told.
 */
export async function sendCompanyEmail(input: {
  to: string | string[];
  subject: string;
  html: string;
  templateKey?: string;
  attachments?: { filename: string; content: string }[];
}): Promise<{ ok: boolean; logEntry?: any; error?: string }> {
  const recipients = Array.isArray(input.to) ? input.to : [input.to];
  const { subject, html, templateKey } = input;

  /*
   * Resend requires PURE base64 for attachment content. Any
   * "data:...;base64," prefix is stripped defensively, because a delivered
   * PDF with the prefix still on it is one the recipient cannot open.
   */
  const stripDataUri = (content: string): string => {
    const marker = 'base64,';
    const idx = content.indexOf(marker);
    return idx >= 0 ? content.slice(idx + marker.length) : content;
  };
  const normalizedAttachments = Array.isArray(input.attachments)
    ? input.attachments
      .filter((a: any) => a && a.filename && a.content)
      .map((a: any) => ({ filename: String(a.filename), content: stripDataUri(String(a.content)) }))
    : undefined;

  const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') || '';
  if (!RESEND_API_KEY) {
    // No provider configured — still record the attempt so it is visible.
    const rec = await logSentEmail({
      to: recipients, subject, html, templateKey,
      status: 'failed',
      error: 'RESEND_API_KEY is not configured on the server.',
    });
    return { ok: false, logEntry: rec, error: 'Email provider not configured (RESEND_API_KEY missing).' };
  }

  let status: 'sent' | 'failed' = 'sent';
  let errorMsg: string | undefined;
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `${COMPANY_NAME} <${FROM_EMAIL}>`,
        reply_to: REPLY_TO_EMAIL,
        to: recipients,
        subject,
        html,
        ...(normalizedAttachments && normalizedAttachments.length
          ? { attachments: normalizedAttachments }
          : {}),
      }),
    });
    if (!res.ok) {
      status = 'failed';
      const e = await res.text();
      errorMsg = `Resend responded ${res.status}: ${e}`;
      console.error('[EmailCenter] Resend error:', errorMsg);
    }
  } catch (e) {
    status = 'failed';
    errorMsg = `Resend request failed: ${e}`;
    console.error('[EmailCenter] Resend exception:', errorMsg);
  }

  const logEntry = await logSentEmail({
    to: recipients, subject, html, templateKey, status, error: errorMsg,
  });

  return status === 'sent' ? { ok: true, logEntry } : { ok: false, logEntry, error: errorMsg };
}

// ── Send + record ────────────────────────────────────────────────────────
emailCenterRouter.post('/send', async (c) => {
  try {
    const body = await c.req.json();
    const { to, subject, html, templateKey, attachments } = body || {};
    if (!to || !subject || !html) {
      return c.json({ error: 'to, subject, and html are required' }, 400);
    }

    const result = await sendCompanyEmail({ to, subject, html, templateKey, attachments });
    if (!result.ok) return c.json({ error: result.error, logEntry: result.logEntry }, 502);
    return c.json({ success: true, logEntry: result.logEntry });
  } catch (error) {
    console.error('[EmailCenter] Send failed:', error);
    return c.json({ error: `Failed to send email: ${error}` }, 500);
  }
});
