/**
 * What the assistant may look at, and the one thing it may ask for.
 *
 * SUPERVISED AUTONOMY, WHICH IS NOT THE SAME AS AUTONOMY
 *
 * Section 10 of the specification defines three levels and names Level 2 —
 * supervised — as the intended production mode. That is what this is.
 *
 * Every tool here is a read EXCEPT `propose_action`, and that one still
 * changes nothing: it writes a row into an approval queue and stops. The
 * action runs when a person taps approve, from the parameters as stored,
 * and `ai_action_request` refuses to let those parameters change after the
 * proposal is written. So the thing reviewed is the thing executed.
 *
 * The practical consequence, and the reason it is built this way round: the
 * worst a confused or manipulated model can do here is waste somebody's
 * attention. It cannot act by being persuasive.
 *
 * What it may ask for is bounded by the registry in `aiActions.ts`, which
 * is deliberately short and deliberately excludes money, credentials,
 * deletion and anything published outside the company.
 *
 * WHY THE SCHEMA LIVES HERE
 *
 * `phoenix-chat.tsx` imports Hono and cannot be loaded by `node --test`.
 * The tool definitions and the shape of their results are the part worth
 * pinning — a tool that quietly starts returning a customer's email is a
 * data leak, and that is a property of this file.
 */

/** The tools, in Anthropic's schema. Order is stable so caching holds. */
export const PHOENIX_TOOLS = [
  {
    name: 'ai_activity_summary',
    description:
      'Totals for AI model calls over a recent window: how many ran, how many '
      + 'succeeded, failed, were refused, or started and never finished; tokens '
      + 'used and estimated cost; and a per-agent breakdown. Use this for "what '
      + 'has the AI been doing", "what did it cost", "is anything wrong".',
    input_schema: {
      type: 'object',
      properties: {
        hours: {
          type: 'number',
          description: 'How many hours back to look. Defaults to 24, maximum 2160 (the 90-day retention).',
        },
      },
      required: [],
      additionalProperties: false,
    },
  },
  {
    name: 'recent_ai_calls',
    description:
      'The most recent individual AI calls, newest first — agent, what it was '
      + 'asked to do, outcome, model, duration and cost. Use when the summary '
      + 'is not enough and the specific calls matter, or to investigate failures.',
    input_schema: {
      type: 'object',
      properties: {
        hours: { type: 'number', description: 'How far back. Defaults to 24.' },
        limit: { type: 'number', description: 'How many rows. Defaults to 20, maximum 100.' },
        agent: { type: 'string', description: 'Optional: only this agent, e.g. quote-generator.' },
        outcome: {
          type: 'string',
          description: "Optional: only this outcome — 'ok', 'refused', 'error' or 'running'.",
        },
      },
      required: [],
      additionalProperties: false,
    },
  },
  {
    name: 'ai_stop_status',
    description:
      'Whether the AI emergency stop is engaged, globally or for a single '
      + 'agent, who engaged it and why. Use for "is anything stopped".',
    input_schema: { type: 'object', properties: {}, required: [], additionalProperties: false },
  },

  /* ── the business, not just the AI ─────────────────────────────────────── */

  {
    name: 'business_snapshot',
    description:
      'The headline numbers across the whole business in one call: open work '
      + 'requests, quotes and their value, unpaid invoices and what is owed, '
      + 'leads by intent, and unread alerts. Use this FIRST for broad questions '
      + 'like "how are we doing", "what needs attention", "catch me up".',
    input_schema: { type: 'object', properties: {}, required: [], additionalProperties: false },
  },
  {
    name: 'work_requests',
    description:
      'Incoming work: counts by status and the most recent requests with their '
      + 'trade, location and when they arrived. Use for "what work is coming in", '
      + '"what is unassigned", "what is pending approval".',
    input_schema: {
      type: 'object',
      properties: {
        status: { type: 'string', description: "Optional: pending, approved, assigned, in-progress, completed." },
        limit: { type: 'number', description: 'How many to list. Defaults to 10, maximum 50.' },
      },
      required: [], additionalProperties: false,
    },
  },
  {
    name: 'quotes_and_invoices',
    description:
      'Money out and money in: quotes by status with their totals, and invoices '
      + 'split into paid and outstanding with the amount owed. Use for "what have '
      + 'we quoted", "what is owed", "who has not paid".',
    input_schema: {
      type: 'object',
      properties: {
        limit: { type: 'number', description: 'How many of each to list. Defaults to 10, maximum 50.' },
      },
      required: [], additionalProperties: false,
    },
  },
  {
    name: 'leads',
    description:
      'Sales leads: how many, split by AI intent score (hot, warm, cold), how '
      + 'many have been contacted, and the most recent. Use for "how are leads '
      + 'looking", "who should we chase".',
    input_schema: {
      type: 'object',
      properties: {
        intent: { type: 'string', description: "Optional: hot, warm or cold." },
        limit: { type: 'number', description: 'Defaults to 10, maximum 50.' },
      },
      required: [], additionalProperties: false,
    },
  },
  {
    name: 'alerts',
    description:
      'Operational alerts raised for staff — unread first. Use for "what needs '
      + 'attention", "anything wrong".',
    input_schema: {
      type: 'object',
      properties: { limit: { type: 'number', description: 'Defaults to 15, maximum 50.' } },
      required: [], additionalProperties: false,
    },
  },

  /* ── proposing work, and spotting what should be automated ───────────── */

  {
    name: 'propose_action',
    description:
      'Propose something for the owner to approve. This does NOT do it — it '
      + 'puts a one-line proposal in their approval queue, and nothing happens '
      + 'until a person taps approve. Use when the answer to a question is an '
      + 'action rather than a fact. Always say what you have proposed and that '
      + 'it is waiting for them.',
    input_schema: {
      type: 'object',
      properties: {
        action: { type: 'string', description: 'The action name, from the list in your brief.' },
        params: { type: 'object', description: 'Arguments for that action.' },
        summary: {
          type: 'string',
          description: 'One line the owner will read before deciding. Say what will happen and to whom.',
        },
      },
      required: ['action', 'summary'],
      additionalProperties: false,
    },
  },
  {
    name: 'pending_actions',
    description:
      'Proposals already waiting for a decision, and recently decided ones. '
      + 'Use for "what is waiting on me" and to avoid proposing something twice.',
    input_schema: {
      type: 'object',
      properties: {
        status: { type: 'string', description: "pending, approved, executed, rejected, failed, expired or all. Defaults to pending." },
      },
      required: [], additionalProperties: false,
    },
  },
  {
    name: 'automation_opportunities',
    description:
      'What is piling up because nobody does it on a schedule, and what is '
      + 'already automated. Returns backlog counts with the age of the oldest '
      + 'item, plus the recurring jobs that already run. Use for "what should '
      + 'we automate", "where would a sub-agent help", "what keeps slipping".',
    input_schema: { type: 'object', properties: {}, required: [], additionalProperties: false },
  },
  {
    name: 'find_module',
    description:
      'Search the application for the module that does a job — "where do I '
      + 'manage subscriptions", "which screen has the schedule". Returns the '
      + 'modules the asker is allowed to be shown, each with an id and what it '
      + 'is for. Use when somebody asks where something lives, or before '
      + 'open_module when you are not certain of the id.',
    input_schema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'What they are looking for, in their own words.' },
      },
      required: ['query'], additionalProperties: false,
    },
  },
  {
    name: 'open_module',
    description:
      'Bring a module onto the screen beside this conversation, by its id from '
      + 'find_module. The browser loads it as the signed-in person, so it shows '
      + 'live data and only what they are permitted to see. Use when somebody '
      + 'asks to see, show, pull up or open part of the application.',
    input_schema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'The capability id, exactly as find_module returned it.' },
      },
      required: ['id'], additionalProperties: false,
    },
  }
] as const;

export type PhoenixToolName = typeof PHOENIX_TOOLS[number]['name'];

/** Tool names, for checking a model's request before dispatching it. */
export const TOOL_NAMES: readonly string[] = PHOENIX_TOOLS.map((t) => t.name);

export function isKnownTool(name: unknown): boolean {
  return TOOL_NAMES.includes(String(name));
}

/**
 * Clamp the window a tool may ask for.
 *
 * The model picks these numbers from a sentence a person typed, so they
 * arrive as whatever it inferred — occasionally a year, occasionally
 * nonsense. The ledger keeps ninety days, so anything beyond that is a
 * slower query returning the same rows.
 */
export function clampHours(value: unknown, fallback = 24): number {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.min(Math.floor(n), 24 * 90);
}

export function clampLimit(value: unknown, fallback = 20, max = 100): number {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.min(Math.floor(n), max);
}

/**
 * The columns a call row may expose to the assistant.
 *
 * An allowlist rather than a redaction list, so a column added to
 * `ai_call_log` later is private until somebody names it here. The ledger
 * already holds no prompts, but it does hold `actor_email` — which is a
 * person, and which the assistant has no reason to see when answering
 * "what has the AI been doing".
 */
export const CALL_FIELDS: readonly string[] = [
  'started_at', 'agent', 'operation', 'outcome', 'model',
  'duration_ms', 'tokens_in', 'tokens_out', 'cost_cents',
  'action_taken', 'summary', 'error',
];

/** Strip a row to the allowlist. */
export function publicCallRow(row: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of CALL_FIELDS) if (key in row) out[key] = row[key];
  return out;
}

/**
 * The assistant's brief.
 *
 * Short on purpose. The long version of this is a prompt that reads like a
 * policy document and gets ignored in the middle; the rules that matter are
 * the ones about not inventing figures, because every number it can quote
 * comes from a tool and is checkable.
 */
export const PHOENIX_SYSTEM = [
  'You are the operations assistant for Black Phoenix, a construction and property services company.',
  'You are talking to the owner or a member of staff about how the business is running.',
  '',
  'WHAT YOU CAN SEE',
  '',
  'Incoming work requests, quotes and their value, invoices and what is owed,',
  'sales leads and their intent, operational alerts, and everything the AI on',
  'this platform has done. Use business_snapshot first for a broad question —',
  'it answers "how are we doing" in one call — then a specific tool when the',
  'detail matters.',
  '',
  'Lead with the thing that needs a decision. "Four quotes out, $18k, and two',
  'invoices overdue" is an answer; a list of every status is a report nobody',
  'asked for.',
  '',
  'HOW YOU ANSWER',
  '',
  'Every number you give must come from a tool call in this conversation. Never',
  'estimate, extrapolate, or recall a figure. If a tool did not return it, say',
  'you do not have it and name the tool that would.',
  '',
  'Costs are ESTIMATES derived from published per-token prices. Say so the first',
  'time you quote one in a conversation. Two models — gpt-image-1 and dall-e-3 —',
  'have no verified price and will show no cost at all; that is missing data, not',
  'a free call.',
  '',
  'A call recorded as "running" long after it started did not finish; it means a',
  'handler died, not that work is in progress.',
  '',
  'Be brief. The person asking is busy and usually wants one number or one',
  'sentence. Offer detail rather than leading with it.',
  '',
  'WHEN THEY WANT TO SEE SOMETHING',
  '',
  'You can put part of the application on the screen beside this conversation.',
  'find_module searches it; open_module brings one up by id. "Show me", "pull',
  'up", "open" and "where is" are all requests to do that.',
  '',
  'When a module is open, the person is looking at the live screen. Say what',
  'you have put in front of them and what to look at on it — do not read its',
  'contents back. You cannot see what it shows; only they can.',
  '',
  'Open one thing at a time, and only when they asked to see something. A',
  'module that appears uninvited takes over the screen they were using.',
  '',
  'If find_module returns nothing, say the application has no such module.',
  'Do not offer the nearest-sounding one as if it were the thing they asked',
  'for — that sends somebody to the wrong screen with confidence.',
  '',
  'WHEN THE ANSWER IS AN ACTION',
  '',
  'You cannot do anything yourself. You can PROPOSE, and a person decides.',
  'propose_action puts a one-line proposal in the owner\'s queue and nothing',
  'happens until they tap approve.',
  '',
  'The actions available are:',
  '  mark_alerts_read      — clear alerts. params: alertTitles (array of titles)',
  '  add_work_request_note — an internal note. params: workRequestId, note',
  '  send_lead_email       — one templated email to one lead. params: leadEmail,',
  '                          emailType (welcome, cart_abandon, hot_follow_up,',
  '                          promo, review_request)',
  '',
  'Propose ONE thing at a time, and write the summary for the person deciding:',
  'say what will happen and to whom. "Send the hot_follow_up email to',
  'j.smith@example.com, a hot lead captured 9 days ago and never contacted" is',
  'a summary. "Follow up leads" is not.',
  '',
  'After proposing, say what you proposed and that it is waiting on them. Never',
  'imply it is done. Check pending_actions first so you do not propose the same',
  'thing twice.',
  '',
  'WHAT YOU STILL CANNOT DO',
  '',
  'Anything outside that list — no money, no credentials, no deleting, nothing',
  'published outside the company, and no bulk sends. If asked for one of those,',
  'say so plainly and name where the control actually is. The emergency stop is',
  'on the AI Diagnostics screen.',
  '',
  'ON AUTOMATING THINGS',
  '',
  'automation_opportunities shows what is piling up and what already runs on a',
  'schedule. When you suggest automating something, ground it in the backlog and',
  'its age, say which existing scheduled job it would sit beside, and be honest',
  'that it is a build rather than something you can switch on.',
].join('\n');

/* ── shaping business records for the model ──────────────────────────────── */

/**
 * Why every business tool returns counts plus a SMALL sample.
 *
 * Two reasons, and the second is the one people forget.
 *
 * Tokens. Handing the model 400 work requests to answer "how many are open"
 * costs real money per question and makes the assistant slower than reading
 * the screen. The counting happens here, in code, and the model is given the
 * answer plus enough examples to talk about.
 *
 * Exposure. These records carry customer names, emails, phone numbers and
 * addresses. A staff member may see those on the screen; that is not the
 * same as shipping them into a prompt on every question. So the samples are
 * trimmed to what an answer actually needs, and anything identifying is
 * dropped unless the question could not be answered without it.
 */

/** Money, as a number, from the several shapes these records use. */
export function amountOf(record: any): number {
  const raw = record?.total ?? record?.amount ?? record?.totalAmount
    ?? record?.grandTotal ?? record?.estimatedValue ?? 0;
  const n = Number(raw);
  return Number.isFinite(n) ? n : 0;
}

export function statusOf(record: any): string {
  return String(record?.status || 'unknown').toLowerCase();
}

/** Count records by status, newest-first order preserved by the caller. */
export function countByStatus(rows: any[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const r of rows) {
    const s = statusOf(r);
    out[s] = (out[s] || 0) + 1;
  }
  return out;
}

/**
 * A work request, trimmed.
 *
 * The customer's name, email and phone are deliberately absent: "what work
 * is coming in" is answerable without them, and a question that genuinely
 * needs a customer's contact details is one a person should answer from the
 * screen where the access is logged against them.
 */
export function publicWorkRequest(r: any): Record<string, unknown> {
  return {
    id: String(r?.id || ''),
    title: String(r?.title || r?.project_name || r?.projectName || '').slice(0, 120),
    trade: r?.serviceType || r?.service_type || r?.project_type || null,
    status: statusOf(r),
    // Town-level only. Enough to talk about coverage, not a doorstep.
    area: String(r?.city || r?.town || '').slice(0, 60) || null,
    createdAt: r?.created_at || r?.createdAt || null,
    estimatedValue: amountOf(r) || null,
  };
}

export function publicQuote(r: any): Record<string, unknown> {
  return {
    id: String(r?.id || ''),
    title: String(r?.title || r?.projectName || '').slice(0, 120),
    status: statusOf(r),
    total: amountOf(r),
    createdAt: r?.created_at || r?.createdAt || null,
  };
}

export function publicInvoice(r: any): Record<string, unknown> {
  return {
    id: String(r?.id || r?.number || ''),
    status: statusOf(r),
    total: amountOf(r),
    dueDate: r?.dueDate || r?.due_date || null,
    createdAt: r?.created_at || r?.createdAt || null,
  };
}

/**
 * A lead, trimmed to the pipeline question.
 *
 * The email is the lead — there is no useful way to say "chase this one"
 * without it — so it stays, and the assistant is staff-only. The phone,
 * page history and cart value do not survive.
 */
export function publicLead(r: any): Record<string, unknown> {
  return {
    email: String(r?.email || '').slice(0, 120),
    name: String(r?.name || '').slice(0, 80) || null,
    intent: r?.intent || null,
    score: Number(r?.score) || null,
    status: statusOf(r),
    emailsSent: Number(r?.emailsSent) || 0,
    capturedAt: r?.capturedAt || null,
  };
}

export function publicAlert(r: any): Record<string, unknown> {
  return {
    title: String(r?.title || '').slice(0, 140),
    category: r?.category || null,
    type: r?.type || null,
    status: statusOf(r),
    timestamp: r?.timestamp || null,
  };
}

/** Outstanding money: everything not settled. */
export function isUnpaid(invoice: any): boolean {
  const s = statusOf(invoice);
  return s !== 'paid' && s !== 'void' && s !== 'cancelled' && s !== 'refunded';
}

export function sumAmounts(rows: any[]): number {
  return Math.round(rows.reduce((t, r) => t + amountOf(r), 0) * 100) / 100;
}
