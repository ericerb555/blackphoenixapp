/**
 * What the assistant is allowed to look at, and nothing it can change.
 *
 * WHY READ-ONLY, DELIBERATELY
 *
 * Section 10 of the specification defines three autonomy levels and says
 * Level 2 is the eventual production mode. This is Level 1 — observe,
 * analyse, recommend, change nothing — and it starts there on purpose.
 *
 * The audit's argument for the ledger applies doubly here: an agent you
 * cannot audit is one you cannot safely give authority to. The ledger has
 * existed for a few hours. In that time it surfaced two real defects nobody
 * had noticed. Giving this thing write access before that record has been
 * read for a while would be building the second storey first.
 *
 * So every tool below is a SELECT. There is no tool that writes, sends,
 * publishes, charges or deletes, and adding one should be a deliberate
 * commit of its own with an approval gate in front of it — not a line
 * appended to this array.
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
  'You are talking to the owner or a member of staff about how the business\'s AI is behaving.',
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
  'WHAT YOU CANNOT DO',
  '',
  'You can only read. You cannot send anything, change anything, stop anything or',
  'spend anything. If asked to act, say plainly that you can only report, and',
  'name where the control actually is — the emergency stop is on the AI',
  'Diagnostics screen.',
].join('\n');
