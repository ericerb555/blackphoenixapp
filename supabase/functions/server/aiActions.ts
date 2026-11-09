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
};

export function knownAction(name: unknown): boolean {
  return Object.prototype.hasOwnProperty.call(ACTIONS, String(name));
}

export function riskOf(name: string): ActionRisk {
  return ACTIONS[name]?.risk ?? 'high';   // an unknown action is never low-risk
}

/** The catalogue, for the assistant's tool description and the UI. */
export function actionCatalogue(): { action: string; risk: ActionRisk; what: string }[] {
  return Object.entries(ACTIONS).map(([action, h]) => ({ action, risk: h.risk, what: h.what }));
}
