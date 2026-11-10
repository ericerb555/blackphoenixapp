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
      const leads = ((await kv.get('leads:all')) as any[]) || [];
      const lead = leads.find((l: any) => String(l?.email || '').toLowerCase() === email);
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
      const leads = ((await kv.get('leads:all')) as any[]) || [];
      const i = leads.findIndex((l: any) => str(l?.email, 160).toLowerCase() === email);
      if (i === -1) throw new Error(`No lead with the address ${email}.`);
      const was = str(leads[i]?.status, 20) || 'unknown';
      const trail = Array.isArray(leads[i]?.statusLog) ? leads[i].statusLog : [];
      leads[i] = {
        ...leads[i],
        status,
        statusLog: [
          // Attributed to the approver. A pipeline that changed itself is
          // one nobody can ask a question about afterwards.
          { from: was, to: status, at: new Date().toISOString(), by: ctx.approvedBy, note: str(p?.note, 300) || null },
          ...trail,
        ].slice(0, 50),
      };
      await kv.set('leads:all', leads);
      return `${email} moved from ${was} to ${status}.`;
    },
  },

  /**
   * Write the customer total onto a quote that has none.
   *
   * Quotes on this platform record no total. The line items beneath them
   * are supplier costs — unitCost, totalCost, a waste factor — so every
   * figure the assistant can give about quoted work is currently "not
   * recorded", and so is every average and win value derived from it.
   *
   * MEDIUM, not low, and not because it is hard to undo. It is a PRICE: the
   * number a customer is asked to pay, and the one every later report will
   * treat as fact. A model should never set one without a person reading it
   * first, which is exactly what the approval queue is for. It also refuses
   * to overwrite a total that already exists — correcting a price is a
   * different decision from recording a missing one, and it belongs on the
   * quote screen where the line items are visible.
   */
  record_quote_total: {
    risk: 'medium',
    what: 'Records the customer total on a quote that has none. Will not overwrite an existing total.',
    params: 'quoteId, total (a positive number, the price the customer is asked to pay)',
    validate(p) {
      if (!str(p?.quoteId, 100)) return { ok: false, error: 'Which quote?' };
      const n = Number(p?.total);
      if (!Number.isFinite(n) || n <= 0) return { ok: false, error: 'The total must be a positive number.' };
      if (n > 10_000_000) return { ok: false, error: 'That total is implausible — check it by hand.' };
      return { ok: true };
    },
    async run(p, ctx) {
      const id = str(p.quoteId, 100);
      const key = id.startsWith('quote:') ? id : `quote:${id}`;
      const quote = (await kv.get(key)) as any;
      if (!quote) throw new Error(`No quote ${id}.`);
      const already = Number(quote?.total ?? quote?.total_amount ?? quote?.totalAmount);
      if (Number.isFinite(already) && already > 0) {
        throw new Error(`Quote ${id} already has a total of ${already}. Change it on the quote screen.`);
      }
      const total = Math.round(Number(p.total) * 100) / 100;
      await kv.set(key, {
        ...quote,
        total,
        totalRecordedBy: ctx.approvedBy,
        totalRecordedVia: 'assistant',
        updatedAt: new Date().toISOString(),
      });
      return `Quote ${id} recorded at ${total}.`;
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
