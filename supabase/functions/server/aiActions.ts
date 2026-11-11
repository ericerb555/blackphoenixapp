/**
 * The things the AI is allowed to ask to do, and the code that does them.
 *
 * HOW AN ACTION GETS HERE
 *
 * Deliberately awkwardly. Adding one means writing a handler, choosing its
 * risk, and describing it in a sentence somebody will read at the moment
 * they decide — three separate acts of judgement, in a file whose whole
 * purpose is to be short enough to read in one sitting.
 *
 * THE REGISTRY IS THE BOUNDARY
 *
 * A proposal names an action by string. If the string is not in here it can
 * be proposed, approved, and still never run — `execute` refuses an unknown
 * name. That is the safe direction: the failure of a typo or an invented
 * action name is nothing happening.
 *
 * RISK IS SET HERE, NOT BY THE PROPOSER
 *
 * The model writes the summary; the server writes the risk. Otherwise an
 * action could describe itself as harmless and route around the owner-only
 * gate on `high`.
 *
 * WHAT IS NOT HERE, ON PURPOSE
 *
 * Nothing that moves money, changes a price, touches a credential, deletes
 * anything, or publishes to a channel outside the company. Those are not
 * missing because they are hard; they are missing because the first version
 * of a write capability should be one where the worst outcome is an email
 * somebody did not want and a draft nobody reads.
 */
import * as kv from "./kv_store.tsx";
import { findLeadByEmail, putLead } from "./leadsStore.ts";
import type { ActionRisk } from "./actionQueueRules.ts";

export interface ActionContext {
  /** The person who approved it. Recorded by handlers that write a record. */
  approvedBy: string;
}

export interface ActionHandler {
  risk: ActionRisk;
  /** One line, shown in the queue above the proposal's own summary. */
  what: string;
  /**
   * The parameters, described for the model that has to supply them.
   *
   * Here rather than in the prompt. These were listed by hand in
   * PHOENIX_SYSTEM, which meant an action could exist, be catalogued, be
   * approvable — and be unusable, because the only description of its
   * arguments lived in another file that nobody thought to edit. The model
   * would guess a parameter name, validate() would refuse it, and the
   * refusal would look like the action being broken. The brief is built
   * from this now, so adding a handler is enough to make it usable.
   */
  params: string;
  /**
   * Check the params BEFORE anything is proposed, so a malformed proposal is
   * refused at the door rather than at approval time — by which point a
   * person has already spent attention on it.
   */
  validate(params: any): { ok: boolean; error?: string };
  run(params: any, ctx: ActionContext): Promise<string>;
}

const str = (v: unknown, max = 500) => String(v ?? '').trim().slice(0, max);

/**
 * IS THIS SOMEBODY WE ALREADY DEAL WITH?
 *
 * The gate on every outward message. An assistant that can email a typed
 * address can email anybody — a competitor, a journalist, a hallucinated
 * address at a real company — in the company's name, from the company's
 * domain, and the first anybody knows of it is the reply. So the recipient
 * has to already exist in the records: a lead, an invoice, a work request.
 *
 * It is not a permission check on the person approving; it is a limit on
 * where the assistant is able to point them. Somebody who needs to write to
 * a new address does it from the email screen, where a person types the
 * address themselves and owns having done so.
 */
async function knownContact(email: string): Promise<{ known: boolean; where?: string }> {
  const wanted = email.trim().toLowerCase();
  if (!wanted) return { known: false };

  if (await findLeadByEmail(wanted)) {
    return { known: true, where: 'a lead' };
  }

  const invoices = ((await kv.getByPrefix('invoice:')) as any[]) || [];
  if (invoices.some((i: any) => [i?.customerEmail, i?.customer_email, i?.clientEmail, i?.client_email]
    .some((e) => str(e, 160).toLowerCase() === wanted))) {
    return { known: true, where: 'an invoice' };
  }

  const wr = ((await kv.get('all_work_requests')) as any[])
    || ((await kv.get('work_requests')) as any[]) || [];
  if (wr.some((r: any) => [r?.email, r?.customerEmail, r?.customer_email, r?.clientEmail]
    .some((e) => str(e, 160).toLowerCase() === wanted))) {
    return { known: true, where: 'a work request' };
  }

  return { known: false };
}

const EMAIL_SHAPE = /^\S+@\S+\.\S+$/;

export const ACTIONS: Record<string, ActionHandler> = {
  /**
   * Mark alerts as read.
   *
   * The smallest real write on the platform, and the one worth having first:
   * it proves the whole path — propose, approve, execute, record — with an
   * outcome nobody minds being wrong.
   */
  mark_alerts_read: {
    risk: 'low',
    what: 'Marks operational alerts as read.',
    params: 'alertTitles (array of alert titles, up to 50)',
    validate(p) {
      const ids = Array.isArray(p?.alertTitles) ? p.alertTitles : null;
      if (!ids || !ids.length) return { ok: false, error: 'Name at least one alert.' };
      if (ids.length > 50) return { ok: false, error: 'Too many at once — fifty is the limit.' };
      return { ok: true };
    },
    async run(p) {
      const titles = new Set((p.alertTitles as string[]).map((t) => str(t, 140)));
      const alerts = ((await kv.get('admin_alerts')) as any[]) || [];
      let changed = 0;
      const next = alerts.map((a) => {
        if (titles.has(str(a?.title, 140)) && String(a?.status) !== 'read') {
          changed += 1;
          return { ...a, status: 'read' };
        }
        return a;
      });
      await kv.set('admin_alerts', next);
      return `Marked ${changed} alert${changed === 1 ? '' : 's'} as read.`;
    },
  },

  /**
   * Write an internal note onto a work request.
   *
   * Reversible, private, and genuinely useful — "chase the customer about
   * access" is the kind of thing that gets said in a conversation and then
   * lost. It writes through the same store every other note does.
   */
  add_work_request_note: {
    risk: 'low',
    what: 'Adds an internal note to a work request. Staff-visible only.',
    params: 'workRequestId, note (under 1000 characters)',
    validate(p) {
      if (!str(p?.workRequestId)) return { ok: false, error: 'Which work request?' };
      if (!str(p?.note)) return { ok: false, error: 'The note is empty.' };
      if (str(p?.note, 2000).length > 1000) return { ok: false, error: 'Keep the note under 1000 characters.' };
      return { ok: true };
    },
    async run(p, ctx) {
      const id = str(p.workRequestId, 100);
      const record = (await kv.get(`wr:${id}`)) as any;
      if (!record) throw new Error(`No work request ${id}.`);
      const log = Array.isArray(record.internalNotesLog) ? record.internalNotesLog : [];
      log.unshift({
        id: `note_${Date.now()}`,
        body: str(p.note, 1000),
        // Attributed to the approver, not to the AI. A note nobody owns is a
        // note nobody follows up, and the person who approved it owns it.
        authorEmail: ctx.approvedBy,
        viaAssistant: true,
        createdAt: new Date().toISOString(),
      });
      await kv.set(`wr:${id}`, { ...record, internalNotesLog: log, updated_at: new Date().toISOString() });
      return `Note added to work request ${id}.`;
    },
  },

  /**
   * Email one lead, using the existing templates.
   *
   * The first action here that reaches somebody outside the company, which
   * is exactly why it is `medium` and why it is one lead rather than a
   * blast. `/leads/blast` exists and sends to fifty; proposing that through
   * this queue would mean one tap sending fifty emails, and the review
   * would be of a number rather than of a message.
   */
  send_lead_email: {
    risk: 'medium',
    what: 'Sends one templated email to one lead, from the company address.',
    params: 'leadEmail, emailType (welcome, cart_abandon, hot_follow_up, promo, review_request)',
    validate(p) {
      const email = str(p?.leadEmail, 160).toLowerCase();
      if (!/^\S+@\S+\.\S+$/.test(email)) return { ok: false, error: 'A valid lead email is required.' };
      const type = str(p?.emailType, 40);
      const allowed = ['welcome', 'cart_abandon', 'hot_follow_up', 'promo', 'review_request'];
      if (!allowed.includes(type)) {
        return { ok: false, error: `emailType must be one of: ${allowed.join(', ')}.` };
      }
      return { ok: true };
    },
    async run(p) {
      const email = str(p.leadEmail, 160).toLowerCase();
      const lead = await findLeadByEmail(email);
      if (!lead) throw new Error(`No lead with that address.`);

      // Imported here rather than at module scope: `leads.tsx` builds a Hono
      // router, and pulling that in for every action would make this module
      // unloadable by anything that only wants the registry.
      const { sendLeadEmail } = await import('./leads.tsx');
      const result = await sendLeadEmail(lead.id, str(p.emailType, 40));
      if (!result.ok) throw new Error(result.error || 'The email did not send.');
      return `Sent the ${str(p.emailType, 40)} email to ${email}.`;
    },
  },
  /**
   * Put keywords into the tracker the SEO engine already reads.
   *
   * The marketing gap on this platform is not ideas, it is that the
   * article generator has nothing to generate from: thirty-five
   * photographs in the gallery, no articles, and an empty keyword list.
   * This is the smallest write that unblocks a tool which already exists —
   * which is the whole reason it is this rather than a second article
   * writer. Reversible, internal, and visible on the growth screen.
   */
  track_keywords: {
    risk: 'low',
    what: 'Adds keywords to the tracker the SEO article generator works from.',
    params: 'keywords (array of phrases, up to 25)',
    validate(p) {
      const list = Array.isArray(p?.keywords) ? p.keywords : null;
      if (!list || !list.length) return { ok: false, error: 'Name at least one keyword.' };
      if (list.length > 25) return { ok: false, error: 'Twenty-five at a time is the limit.' };
      if (list.some((k: unknown) => !str(k, 80))) return { ok: false, error: 'One of those keywords is empty.' };
      return { ok: true };
    },
    async run(p) {
      const wanted = (p.keywords as unknown[]).map((k) => str(k, 80).toLowerCase());
      const existing = ((await kv.get('keyword_tracker:default')) as any) || [];
      const rows: any[] = Array.isArray(existing) ? existing
        : Array.isArray(existing?.keywords) ? existing.keywords : [];
      // Matched on the phrase, so proposing the same keyword twice is a
      // no-op rather than a duplicate row in somebody's report.
      const have = new Set(rows.map((r: any) => str(r?.keyword ?? r, 80).toLowerCase()));
      const fresh = wanted.filter((k) => !have.has(k));
      const now = new Date().toISOString();
      const next = [
        ...rows,
        ...fresh.map((keyword) => ({ keyword, addedAt: now, addedBy: 'assistant', position: null })),
      ];
      await kv.set('keyword_tracker:default', next);
      return fresh.length
        ? `Tracking ${fresh.length} new keyword(s): ${fresh.join(', ')}.`
        : 'All of those were already tracked. Nothing changed.';
    },
  },

  /**
   * Move one lead along the pipeline.
   *
   * The status is what every lead view sorts and filters by, and it is
   * currently only ever changed by hand on a screen somebody has to find.
   * One lead at a time, by email, and a closed set of statuses — a free
   * text status would quietly create a fourth column nothing else knows
   * how to read.
   */
  set_lead_status: {
    risk: 'low',
    what: 'Changes the pipeline status of one lead.',
    params: 'leadEmail, status (new, contacted, qualified, quoted, won, lost), note (optional)',
    validate(p) {
      const email = str(p?.leadEmail, 160).toLowerCase();
      if (!/^\S+@\S+\.\S+$/.test(email)) return { ok: false, error: 'A valid lead email is required.' };
      const allowed = ['new', 'contacted', 'qualified', 'quoted', 'won', 'lost'];
      if (!allowed.includes(str(p?.status, 20).toLowerCase())) {
        return { ok: false, error: `status must be one of: ${allowed.join(', ')}.` };
      }
      return { ok: true };
    },
    async run(p, ctx) {
      const email = str(p.leadEmail, 160).toLowerCase();
      const status = str(p.status, 20).toLowerCase();
      const lead = await findLeadByEmail(email);
      if (!lead) throw new Error(`No lead with the address ${email}.`);
      const was = str(lead?.status, 20) || 'unknown';
      const trail = Array.isArray(lead?.statusLog) ? lead.statusLog : [];
      await putLead({
        ...lead,
        status,
        statusLog: [
          // Attributed to the approver. A pipeline that changed itself is
          // one nobody can ask a question about afterwards.
          { from: was, to: status, at: new Date().toISOString(), by: ctx.approvedBy, note: str(p?.note, 300) || null },
          ...trail,
        ].slice(0, 50),
      });
      return `${email} moved from ${was} to ${status}.`;
    },
  },

  /**
   * Write to a customer, in the company's name.
   *
   * HIGH, and the risk tier is the smallest part of why.
   *
   * This is the first action here whose content is composed by the model
   * rather than chosen from templates, and it leaves the building. A wrong
   * price in a sentence is a quoted price; a wrong date is a commitment; an
   * apology nobody authorised is an admission. None of that can be recalled
   * once it is in somebody's inbox, which is why it needs an owner and why
   * the approval queue now renders the body as text — approving a message
   * you cannot read is not consent to send it.
   *
   * Three limits, none of them removable by the model:
   *
   *   - the recipient must already be a lead, an invoice or a work request
   *     contact. See knownContact.
   *   - one recipient. A list is a campaign and belongs on the email screen
   *     where somebody sees the number before they send it.
   *   - it goes through sendCompanyEmail, so it lands in the same sent log
   *     as everything else. An email nobody can find afterwards is worse
   *     than an email nobody sent.
   */
  send_customer_email: {
    risk: 'high',
    what: 'Sends one email you have read, in the company name, to one existing contact.',
    params: 'to (an existing lead, invoice or work request contact), subject, html (the body)',
    validate(p) {
      const to = str(p?.to, 160).toLowerCase();
      if (!EMAIL_SHAPE.test(to)) return { ok: false, error: 'A single valid recipient address is required.' };
      if (Array.isArray(p?.to)) return { ok: false, error: 'One recipient at a time. A list is a campaign.' };
      const subject = str(p?.subject, 200);
      if (!subject) return { ok: false, error: 'The subject is empty.' };
      if (subject.length > 150) return { ok: false, error: 'Keep the subject under 150 characters.' };
      const html = str(p?.html ?? p?.body, 20_000);
      if (!html) return { ok: false, error: 'The body is empty.' };
      if (html.length > 15_000) return { ok: false, error: 'That body is too long to review properly — under 15,000 characters.' };
      return { ok: true };
    },
    async run(p, ctx) {
      const to = str(p.to, 160).toLowerCase();

      // Checked at RUN time as well as at propose time. A proposal can sit in
      // the queue for hours, and a contact can be deleted in between.
      const contact = await knownContact(to);
      if (!contact.known) {
        throw new Error(`${to} is not a lead, invoice or work request contact on this platform. Send it from the email screen instead.`);
      }

      const { sendCompanyEmail } = await import('./email-center.tsx');
      const result = await sendCompanyEmail({
        to,
        subject: str(p.subject, 150),
        html: str(p.html ?? p.body, 15_000),
        // Stamped so the sent log can separate what the assistant proposed
        // from what somebody wrote by hand.
        templateKey: 'assistant',
      });
      if (!result.ok) throw new Error(result.error || 'The email did not send.');
      return `Sent to ${to} (${contact.where}), approved by ${ctx.approvedBy}.`;
    },
  },

  /**
   * Raise a DRAFT invoice.
   *
   * A draft, always, and that is the design rather than a limitation. An
   * issued invoice is a demand for money with a number on it that appears in
   * the customer's portal and in the chase-the-customer pile; a draft is a
   * document somebody opens, checks against the work, and issues from the
   * invoice screen. The assistant does the typing, a person does the issuing.
   *
   * The arithmetic is `invoiceDraft.ts` — the same module the invoice route
   * now uses, with tests over it. The line items decide the total; a total
   * supplied in the parameters is ignored, because the alternative is an
   * invoice reading one number and showing another.
   */
  create_invoice: {
    risk: 'high',
    what: 'Creates a DRAFT invoice. Nothing is sent and no number is issued until a person issues it.',
    params: 'customerEmail, customerName, lineItems (each: description, quantity, unitPrice), taxRate (optional, percent), quoteId or workRequestId (optional, to link it)',
    validate(p) {
      const email = str(p?.customerEmail, 160).toLowerCase();
      if (!EMAIL_SHAPE.test(email)) return { ok: false, error: 'A valid customer email is required.' };
      const items = Array.isArray(p?.lineItems) ? p.lineItems : null;
      if (!items || !items.length) return { ok: false, error: 'An invoice needs at least one line.' };
      if (items.length > 50) return { ok: false, error: 'Fifty lines is the limit.' };
      for (const item of items) {
        if (!str(item?.description, 200)) return { ok: false, error: 'Every line needs a description.' };
        const q = Number(item?.quantity);
        const price = Number(item?.unitPrice ?? item?.unit_price);
        if (!Number.isFinite(q) || q <= 0) return { ok: false, error: `The quantity on "${str(item?.description, 40)}" is not a positive number.` };
        if (!Number.isFinite(price) || price < 0) return { ok: false, error: `The unit price on "${str(item?.description, 40)}" is not a number.` };
        if (q * price > 1_000_000) return { ok: false, error: 'A single line over a million dollars needs doing by hand.' };
      }
      const taxRate = p?.taxRate === undefined ? 0 : Number(p.taxRate);
      if (!Number.isFinite(taxRate) || taxRate < 0 || taxRate > 25) {
        return { ok: false, error: 'The tax rate must be a percentage between 0 and 25.' };
      }
      return { ok: true };
    },
    async run(p, ctx) {
      const { buildInvoiceRecord } = await import('./invoiceDraft.ts');
      const email = str(p.customerEmail, 160).toLowerCase();

      const lineItems = (p.lineItems as any[]).map((item) => ({
        description: str(item?.description, 200),
        quantity: Number(item?.quantity),
        unit_price: Number(item?.unitPrice ?? item?.unit_price),
      }));

      /*
       * The job, copied from whatever this bills for.
       *
       * The invoice route opens a job for an orphan document; that machinery
       * lives in index.tsx and is not reachable from here, so this links to
       * an existing job when the parent has one and leaves it null when it
       * does not — null being honest, where a fabricated id would quietly
       * attach the money to the wrong piece of work.
       */
      const parentId = str(p?.quoteId, 100) || str(p?.workRequestId, 100);
      let jobId: string | null = null;
      if (parentId) {
        const parent = (await kv.get(`quote:${parentId}`)) as any
          || (await kv.get(`wr:${parentId}`)) as any;
        jobId = parent?.jobId ? String(parent.jobId) : null;
      }

      const built = buildInvoiceRecord({
        customerEmail: email,
        customerName: str(p?.customerName, 120),
        line_items: lineItems,
        tax_rate: Number(p?.taxRate || 0),
        is_draft: true,
        status: 'draft',
        quoteId: str(p?.quoteId, 100) || undefined,
        workRequestId: str(p?.workRequestId, 100) || undefined,
        jobId: jobId || undefined,
        notes: str(p?.notes, 1000) || undefined,
        createdVia: 'assistant',
      }, {
        recipient: {
          customerEmail: email,
          customerName: str(p?.customerName, 120),
          recipientPortal: null,
          paymentRail: 'services',
        },
        // The approver owns it, the same as every other write here.
        createdBy: ctx.approvedBy,
      });

      await kv.set(`invoice:${built.record.id}`, built.record);
      return `Draft invoice ${built.record.invoice_number} for ${email}, ${lineItems.length} line(s), total ${built.record.total_amount}. Nothing has been sent — issue it from the invoice screen.`;
    },
  },

  /**
   * Turn the estimate a work request already has into a draft quote.
   *
   * WHY IT DOES NOT RUN THE ESTIMATOR.
   *
   * Opening a work request already generates a full takeoff and caches it
   * under `quote_draft:{id}` precisely so that looking twice does not cost
   * twice. Estimating again from here would spend a second gpt-4o takeoff to
   * produce a slightly different set of numbers for the same job — and then
   * two documents would disagree about one piece of work. So this PROMOTES
   * the cached estimate and refuses when there is none, which is also the
   * honest answer: the estimate is a thing somebody asked for by opening the
   * request.
   *
   * The total comes from that estimate, which got it from applyMargins — the
   * company's own overhead, profit and tax. It is not a number this action
   * invents, and a quote carrying one is the whole point: every quote on the
   * platform today has no total at all, so nothing can say what has been
   * quoted this month.
   */
  draft_quote_for_work_request: {
    risk: 'medium',
    what: 'Creates a draft quote from the estimate a work request already has.',
    params: 'workRequestId',
    validate(p) {
      if (!str(p?.workRequestId, 100)) return { ok: false, error: 'Which work request?' };
      return { ok: true };
    },
    async run(p, ctx) {
      const wrId = str(p.workRequestId, 100);
      const cached = (await kv.get(`quote_draft:${wrId}`)) as any;
      if (!cached?.quote) {
        throw new Error(`Work request ${wrId} has no estimate yet. Open it once so the estimator runs, then approve this again.`);
      }

      const all = ((await kv.get('all_work_requests')) as any[])
        || ((await kv.get('work_requests')) as any[]) || [];
      const wr = all.find((r: any) => str(r?.id, 100) === wrId);
      if (!wr) throw new Error(`No work request ${wrId}.`);

      const existing = ((await kv.getByPrefix('quote:')) as any[]) || [];
      const already = existing.find((q: any) => str(q?.workRequestId, 100) === wrId);
      if (already) {
        throw new Error(`Work request ${wrId} already has quote ${str(already?.id, 100)}. Edit that one rather than raising a second.`);
      }

      const now = new Date().toISOString();
      const id = `qt-${Date.now()}`;
      const total = Number(cached.quote.total);
      const quote = {
        id,
        number: `QT-${String(Date.now()).slice(-8)}`,
        status: 'draft',
        workRequestId: wrId,
        jobId: wr?.jobId || null,
        clientName: str(wr?.customerName || wr?.name || wr?.clientName, 120),
        clientEmail: str(wr?.email || wr?.customerEmail || wr?.clientEmail, 160).toLowerCase(),
        clientPhone: str(wr?.phone || wr?.customerPhone, 40),
        clientAddress: str(wr?.address || wr?.location, 250),
        title: str(wr?.title, 160),
        serviceType: str(wr?.serviceType, 80),
        // The customer total, from the company's margins. See the note above.
        total: Number.isFinite(total) ? Math.round(total * 100) / 100 : 0,
        subtotals: cached.quote.subtotals || null,
        materialItems: cached.quote.materialItems || [],
        laborItems: cached.quote.laborItems || [],
        processSteps: cached.quote.processSteps || [],
        confidence: cached.confidence ?? null,
        assumptions: cached.assumptions ?? null,
        estimatedAt: cached.generatedAt || null,
        usedAI: Boolean(cached.usedAI),
        createdAt: now,
        updatedAt: now,
        createdBy: ctx.approvedBy,
        createdVia: 'assistant',
      };
      await kv.set(`quote:${id}`, quote);
      return `Draft quote ${quote.number} for ${quote.clientName || wrId} at ${quote.total}, from the estimate generated ${cached.generatedAt || 'earlier'}. It is a draft — review and send it from the quote screen.`;
    },
  },
};

export function knownAction(name: unknown): boolean {
  return Object.prototype.hasOwnProperty.call(ACTIONS, String(name));
}

export function riskOf(name: string): ActionRisk {
  return ACTIONS[name]?.risk ?? 'high';   // an unknown action is never low-risk
}

/** The catalogue, for the assistant's tool description and the UI. */
export function actionCatalogue():
  { action: string; risk: ActionRisk; what: string; params: string }[] {
  return Object.entries(ACTIONS)
    .map(([action, h]) => ({ action, risk: h.risk, what: h.what, params: h.params }));
}
