/**
 * Leads: capture from the storefront, score them, and email them.
 *
 * WHY THIS IS ITS OWN FILE
 *
 * It was 262 lines in the middle of `index.tsx`, which is 22,858 lines holding
 * 510 inline handlers. The size is not the problem by itself — the problem is
 * that a route added to the middle of that file is a route nobody reviews,
 * because there is no boundary to review it against. Lifted out as the first
 * of those extractions, chosen because nothing outside the block referred to
 * anything inside it.
 *
 * WHAT CHANGED IN THE MOVE, AND WHY IT HAD TO
 *
 * The authorisation. Only `/leads/capture` was ever meant to be reachable by
 * the public, and it is listed in `PUBLIC_PREFIXES` as "the public store's
 * enquiry form". The other four routes were in no list at all, so they fell to
 * the auth wall's default of "signed in" — and every portal customer, tenant,
 * vendor and subcontractor on this platform is signed in.
 *
 * That meant any of them could:
 *
 *   GET    /leads              read the entire contact book — every lead's
 *                              email, phone, cart value and AI intent score
 *   POST   /leads/send-email   send mail to any lead from the company's own
 *                              verified sender
 *   POST   /leads/blast        do that to fifty of them at once
 *   DELETE /leads/:id          delete any of them
 *
 * This is the same hole, in the same shape, that `requireStaff.ts` was written
 * for and documents: "A route that manages the company's own marketing, media
 * and contact book needs to know the difference between a customer and the
 * company, and these did not." It was found by moving the routes, which is
 * exactly the argument that file makes for why mounting forces the question.
 *
 * HOW THE GUARD IS SCOPED
 *
 * This router spells its paths out in full and is therefore mounted at `/`,
 * which means a bare `use('*')` here would run on every request the whole
 * server receives, not merely the ones this file handles. Doing exactly that
 * once took the entire API staff-only for a deploy. So the middleware below
 * checks the path itself and stands aside for anything that is not ours.
 */
import { Hono } from "npm:hono@4";
import * as kv from "./kv_store.tsx";
import { requireStaff } from "./requireStaff.ts";
import { REPLY_TO_EMAIL, NOTIFICATION_FROM_EMAIL } from "./emailIdentity.ts";
import { leadPathNeedsStaff } from "./leadsAccess.ts";
import { recordedOpenAIFetch } from "./aiLedger.ts";
import { assertAiAllowed, AiStopped } from "./aiKillSwitch.ts";
import { allLeads, getLead, findLeadByEmail, putLead, deleteLead } from "./leadsStore.ts";

export const leadsRouter = new Hono();

/**
 * Company-only, except the public enquiry form.
 *
 * NOT `requireStaffOn([LEADS_BASE])`. That helper matches a base path *or
 * anything beneath it*, so it would have taken `/leads/capture` with
 * everything else and shut the storefront's enquiry form to the public — the
 * precise opposite of the intent, and silent, because a form that stops
 * submitting looks like a form nobody used.
 *
 * The rule lives in `leadsAccess.ts` so it can be tested without importing
 * Hono; see `tests/leadsAccess.test.ts`, which pins both that `/capture` stays
 * open and that anything added later does not.
 */
leadsRouter.use('*', async (c, next) => {
  if (!leadPathNeedsStaff(new URL(c.req.url).pathname)) return await next();
  return await requireStaff(c, next);
});


// Capture a new lead
leadsRouter.post('/make-server-3eae23a6/leads/capture', async (c) => {
  try {
    const body = await c.req.json();
    const { email, name, source, page, cartValue, productsViewed, phone } = body;
    if (!email) return c.json({ error: 'Email required' }, 400);

    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY') || '';

    // Don't duplicate. One pointer lookup now, not a scan of every lead — and
    // the update touches only this lead's key, so two captures at once can no
    // longer overwrite each other the way a shared-array rewrite did.
    const existing = await findLeadByEmail(email);
    if (existing) {
      existing.lastSeen = new Date().toISOString();
      existing.pageViews = (existing.pageViews || 0) + 1;
      if (cartValue) existing.cartValue = cartValue;
      await putLead(existing);
      return c.json({ success: true, leadId: existing.id, existing: true });
    }

    // AI score the lead
    let score = 50;
    let intent = 'browsing';
    let aiSummary = '';

    /**
     * WHO IS ALLOWED TO SPEND MONEY HERE, AND WHEN.
     *
     * This endpoint is public and unauthenticated — it is the storefront
     * enquiry form — and it used to call a paid model on every new email with
     * no gate of any kind. Two holes fell out of that:
     *
     *  1. A script posting unique random emails drove an unbounded number of
     *     gpt-4o-mini calls. The dedup above only catches a REPEATED address;
     *     a fresh one each time sails past it. Anonymous cost DoS.
     *  2. The emergency stop could not halt it. `assertAiAllowed` was never
     *     called, so the one control that is supposed to cut all model spend
     *     did not cover the one model call a stranger can trigger at will.
     *
     * The fix is both of these. The model is only consulted for a lead that
     * carries real buying signal — a cart, or an explicit quote request —
     * because those are the leads whose score is worth paying to sharpen, and
     * they are exactly what a spam flood does not send. Everything else takes
     * the free rule-based path below, which was always the fallback. And the
     * call that remains is now behind the kill switch, so "stop all AI" means
     * it.
     */
    const worthScoringWithAI = Number(cartValue) > 0 || source === 'quote';

    if (OPENAI_API_KEY && worthScoringWithAI) {
      try {
        // The emergency stop decides before a cent is spent. On stop this
        // throws and the catch below drops to the free rule-based score, so a
        // halted model never blocks a lead from being captured.
        await assertAiAllowed('leads');
        const prompt = `Score this ecommerce lead from 0-100 and classify intent.
Lead data:
- Source: ${source || 'store'}
- Page: ${page || 'homepage'}
- Cart value: $${cartValue || 0}
- Products viewed: ${productsViewed || 0}
- Has phone: ${!!phone}

Return JSON only: {"score": number, "intent": "hot"|"warm"|"cold", "summary": "one sentence why", "recommendedAction": "what email to send first"}`;

        const res = await recordedOpenAIFetch({ agent: 'leads', operation: 'chat completion' }, 'https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [{ role: 'user', content: prompt }],
            response_format: { type: 'json_object' },
            max_tokens: 150,
          }),
        });
        const data = await res.json();
        const parsed = JSON.parse(data.choices?.[0]?.message?.content || '{}');
        score = parsed.score || 50;
        intent = parsed.intent || 'warm';
        aiSummary = parsed.summary || '';
      } catch {
        // Model refused, errored, or the kill switch is engaged. Fall through
        // to the free rule-based score below rather than failing the capture.
        score = 0;
      }
    }

    // Rule-based scoring: the default for every low-signal capture, and the
    // fallback whenever the AI path above was skipped or did not produce a
    // score. `score === 0` is the sentinel the catch sets for "AI gave us
    // nothing"; the AI success path always lands well above it.
    if (!worthScoringWithAI || !OPENAI_API_KEY || score === 0) {
      if (cartValue > 100) { score = 85; intent = 'hot'; }
      else if (cartValue > 0) { score = 70; intent = 'warm'; }
      else if (source === 'quote') { score = 90; intent = 'hot'; }
      else { score = 40; intent = 'cold'; }
    }

    const lead = {
      id: `lead_${Date.now()}`,
      email, name: name || '', phone: phone || '',
      source: source || 'store', page: page || '',
      cartValue: cartValue || 0, productsViewed: productsViewed || 0,
      score, intent, aiSummary,
      capturedAt: new Date().toISOString(),
      lastSeen: new Date().toISOString(),
      pageViews: 1,
      emailsSent: 0, emailsOpened: 0,
      status: 'new', tags: [],
      sequence: 'welcome',
      sequenceStep: 0,
    };

    await putLead(lead);
    return c.json({ success: true, leadId: lead.id, score, intent });
  } catch (e: any) { return c.json({ error: e.message }, 500); }
});

// Get all leads
leadsRouter.get('/make-server-3eae23a6/leads', async (c) => {
  try {
    const leads = await allLeads();
    const stats = {
      total: leads.length,
      hot: leads.filter((l: any) => l.intent === 'hot').length,
      warm: leads.filter((l: any) => l.intent === 'warm').length,
      cold: leads.filter((l: any) => l.intent === 'cold').length,
      emailsSent: leads.reduce((s: number, l: any) => s + (l.emailsSent || 0), 0),
      avgScore: leads.length ? Math.round(leads.reduce((s: number, l: any) => s + (l.score || 0), 0) / leads.length) : 0,
    };
    return c.json({ leads, stats });
  } catch (e: any) { return c.json({ error: e.message }, 500); }
});

/**
 * One flat shape rather than a discriminated union on `ok`.
 *
 * `tsconfig.server.json` runs with `strictNullChecks: false`, and without it
 * TypeScript will not narrow `{ok: true, ...} | {ok: false, ...}` on a check
 * of `result.ok` — every read of `.error` or `.status` is then reported as a
 * property that does not exist. The union is the better type and this config
 * cannot use it, so the fields are optional and the caller checks `ok`.
 */
interface SendOutcome {
  ok: boolean;
  subject?: string;
  to?: string;
  status?: 400 | 404 | 500;
  error?: string;
}

/**
 * Write one lead an email and send it.
 *
 * WHY THIS IS A FUNCTION AND NOT JUST THE ROUTE
 *
 * Because `/leads/blast` used to reach it by making an HTTP request to our own
 * server, and that request did not work:
 *
 *     fetch('https://<project>/functions/v1/.../leads/send-email', {
 *       headers: { Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
 *     })
 *
 * The anon key is not a session. `intakeActor` resolves no user from it, so
 * the auth wall — which has had `AUTH_ENFORCE = true` for some time — refused
 * every one of those calls before the handler ran. And because `fetch` only
 * throws on a network failure, a 401 came back as a perfectly good Response,
 * fell past the `catch`, and the loop counted `results.sent++` anyway.
 *
 * So the blast reported "sent: 50" and sent nothing, which is the worst
 * available outcome: the feature looks like it works, and the thing it is
 * supposed to do — contact fifty customers — silently does not happen. Nobody
 * would find that from the response.
 *
 * Calling in process removes the round trip, the second authorisation check on
 * a request we already authorised, and the false success. The caller is staff
 * by the time it gets here; that is settled once, by the middleware above.
 */
export async function sendLeadEmail(
  leadId: string, emailType: string, customMessage?: string,
): Promise<SendOutcome> {
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') || '';
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY') || '';
    const COMPANY_NAME = 'The Black Phoenix Company';
    const FROM_EMAIL = NOTIFICATION_FROM_EMAIL;
    const STORE_URL = 'https://theblackphoenixcompany.com/shop';

    if (!RESEND_API_KEY) return { ok: false, status: 400, error: 'RESEND_API_KEY not configured' };

    const lead = await getLead(leadId);
    if (!lead) return { ok: false, status: 404, error: 'Lead not found' };

    // AI writes the email
    let subject = '';
    let htmlBody = '';
    let textBody = '';

    const emailTemplates: Record<string, { subject: string; prompt: string }> = {
      welcome: {
        subject: `Welcome to ${COMPANY_NAME} — Here's What We Have For You`,
        prompt: `Write a warm welcome email for a new store visitor named "${lead.name || 'Friend'}". They visited our store page: ${lead.page}. Company: ${COMPANY_NAME}. Store: ${STORE_URL}. Keep it friendly, 3 short paragraphs, end with a CTA to browse the store.`,
      },
      cart_abandon: {
        subject: `Hey${lead.name ? ' ' + lead.name : ''}, you left something behind 🛒`,
        prompt: `Write a cart abandonment recovery email. Customer left $${lead.cartValue} in their cart. Company: ${COMPANY_NAME}. Store: ${STORE_URL}. Be friendly, create urgency, offer help. 2-3 short paragraphs.`,
      },
      hot_follow_up: {
        subject: `${lead.name ? lead.name + ', we' : 'We'} noticed you were interested — can we help?`,
        prompt: `Write a follow-up email for a high-intent lead (score: ${lead.score}/100). They browsed ${lead.productsViewed} products. Company: ${COMPANY_NAME}. Store: ${STORE_URL}. Be direct, helpful, and offer to answer questions. Short and friendly.`,
      },
      promo: {
        subject: `Exclusive offer just for you — 10% off your first order`,
        prompt: `Write a promotional email offering 10% off with code BPBUILDS10. Company: ${COMPANY_NAME}. Store: ${STORE_URL}. Mention free shipping over $500. Upbeat, exciting tone. 2 paragraphs + CTA.`,
      },
      review_request: {
        subject: `${lead.name ? lead.name + ', h' : 'H'}ow was your experience with ${COMPANY_NAME}? ⭐`,
        prompt: `Write a short, warm post-purchase review request email for ${lead.name || 'a customer'} who just ordered from ${COMPANY_NAME}. Thank them sincerely for their order. Ask them to leave a Google review with this direct link: https://g.page/r/your-google-review-link/review — explain it takes less than 60 seconds and means the world to a family-owned business. Keep it personal, 2 short paragraphs. Do NOT be pushy.`,
      },
      custom: {
        subject: `A message from ${COMPANY_NAME}`,
        prompt: customMessage || 'Write a friendly outreach email.',
      },
    };

    const template = emailTemplates[emailType] || emailTemplates.welcome;

    if (OPENAI_API_KEY) {
      try {
        const res = await recordedOpenAIFetch({ agent: 'leads', operation: 'chat completion' }, 'https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
              { role: 'system', content: 'You are an email marketing expert. Write concise, high-converting emails. Return JSON with keys: subject, html, text' },
              { role: 'user', content: template.prompt + '\n\nReturn JSON: {"subject": "...", "html": "<html email body>", "text": "plain text version"}' },
            ],
            response_format: { type: 'json_object' },
            max_tokens: 800,
          }),
        });
        const data = await res.json();
        const parsed = JSON.parse(data.choices?.[0]?.message?.content || '{}');
        subject = parsed.subject || template.subject;
        htmlBody = parsed.html || `<p>${parsed.text || ''}</p>`;
        textBody = parsed.text || '';
      } catch { subject = template.subject; }
    } else {
      subject = template.subject;
    }

    // Wrap in branded template
    const brandedHtml = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#fff">
        <div style="background:#0a0a0a;padding:24px;text-align:center">
          <h1 style="color:#ea580c;margin:0;font-size:22px">${COMPANY_NAME}</h1>
          <p style="color:#888;margin:4px 0 0;font-size:13px">theblackphoenixcompany.com</p>
        </div>
        <div style="padding:32px 24px;color:#222;line-height:1.7">
          ${htmlBody}
        </div>
        <div style="background:#f5f5f5;padding:20px 24px;text-align:center;border-top:1px solid #eee">
          <a href="${STORE_URL}" style="display:inline-block;padding:12px 28px;background:#ea580c;color:#fff;text-decoration:none;border-radius:8px;font-weight:bold;font-size:15px">Visit the Store →</a>
          <p style="color:#aaa;font-size:11px;margin:16px 0 0">© ${new Date().getFullYear()} ${COMPANY_NAME} · <a href="${STORE_URL}" style="color:#aaa">Unsubscribe</a></p>
        </div>
      </div>`;

    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: `${COMPANY_NAME} <${FROM_EMAIL}>`,
        reply_to: REPLY_TO_EMAIL,
        to: [lead.email],
        subject,
        html: brandedHtml,
        text: textBody || subject,
      }),
    });

    if (!emailRes.ok) {
      const err = await emailRes.json().catch(() => ({}));
      return { ok: false, status: 500, error: err.message || 'Email send failed' };
    }

    // Update lead record
    lead.emailsSent = (lead.emailsSent || 0) + 1;
    lead.lastEmailSent = new Date().toISOString();
    lead.lastEmailType = emailType;
    lead.status = 'contacted';
    await putLead(lead);

    return { ok: true, subject, to: lead.email };
}

// Send AI-written email to a lead
leadsRouter.post('/make-server-3eae23a6/leads/send-email', async (c) => {
  try {
    const { leadId, emailType, customMessage } = await c.req.json();
    const result = await sendLeadEmail(leadId, emailType, customMessage);
    if (!result.ok) return c.json({ error: result.error }, result.status || 500);
    return c.json({ success: true, subject: result.subject, to: result.to });
  } catch (e: any) { return c.json({ error: e.message }, 500); }
});

// Blast email to all leads (or by intent filter)
leadsRouter.post('/make-server-3eae23a6/leads/blast', async (c) => {
  try {
    const body = await c.req.json();
    const { emailType, intentFilter, customMessage } = body;
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') || '';
    if (!RESEND_API_KEY) return c.json({ error: 'RESEND_API_KEY not configured' }, 400);

    const leads = await allLeads();
    const targets = intentFilter && intentFilter !== 'all'
      ? leads.filter((l: any) => l.intent === intentFilter)
      : leads;

    const results = { sent: 0, failed: 0, total: targets.length, errors: [] as string[] };

    /**
     * Still capped at fifty, which is a rate limit rather than a page size —
     * the other targets are not sent later, they are not sent at all. Left as
     * it was because changing it is a decision about Resend's limits, but the
     * count is now honest about it: `total` is how many matched, `sent` and
     * `failed` add up to at most fifty.
     */
    for (const lead of targets.slice(0, 50)) {
      try {
        const result = await sendLeadEmail(lead.id, emailType, customMessage);
        if (result.ok) {
          results.sent++;
        } else {
          results.failed++;
          if (results.errors.length < 5) results.errors.push(`${lead.email}: ${result.error}`);
        }
      } catch (e: any) {
        results.failed++;
        if (results.errors.length < 5) results.errors.push(`${lead.email}: ${e.message}`);
      }
    }

    return c.json({ success: true, ...results });
  } catch (e: any) { return c.json({ error: e.message }, 500); }
});

// Delete a lead
leadsRouter.delete('/make-server-3eae23a6/leads/:id', async (c) => {
  try {
    const id = c.req.param('id');
    await deleteLead(id);
    return c.json({ success: true });
  } catch (e: any) { return c.json({ error: e.message }, 500); }
});
