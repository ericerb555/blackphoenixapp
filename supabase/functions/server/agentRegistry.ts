/**
 * Every AI agent this platform has, declared rather than observed.
 *
 * WHY A DECLARATION AND NOT A QUERY
 *
 * The Systems tab answers "which agents ran in the last 24 hours", which is a
 * different question and a worse one: an agent that never runs does not appear,
 * and never running is exactly the condition worth knowing about. On
 * 2026-11-11 twelve of the seventeen below had no ledger rows at all. Two were
 * broken — `marketing-assets` asked for a model OpenAI had retired and got a
 * 404, `vision-read` used JSON mode without the word "json" and got a 400 —
 * and both had been failing silently for as long as anyone had been calling
 * them. The other ten worked fine and simply had not been used. Nothing in the
 * application could tell those two groups apart, which is the hole this file
 * exists to close.
 *
 * So: this list is the truth about what SHOULD exist, `ai_call_log` is the
 * truth about what DID run, and `reconcile()` puts them side by side. An entry
 * here with no calls is a question. A ledger label with no entry here is drift
 * — somebody added an agent and told nobody, and it will be invisible to this
 * file the same way those twelve were invisible to the Systems tab.
 *
 * WHAT `delegable` MEANS, AND WHY MOST THINGS ARE NOT
 *
 * Phoenix can call a delegable agent on the owner's behalf. The line is drawn
 * at side effects, not at risk: a delegable route GENERATES or ANALYSES and
 * commits nothing. Drafting ad copy is delegable; capturing a lead, raising a
 * quote and sending anything are not, and they stay behind the approval queue
 * where a person taps approve.
 *
 * Every `example` below was sent to production on 2026-11-11 and came back
 * `200`. They are recorded because three of this file's routes rejected a
 * plausible-looking payload first time — an agent that gets a 400 for the
 * wrong reason looks identical to one that is broken, and that confusion is
 * what cost a day here already.
 */

export type AgentDomain =
  | 'assistant' | 'marketing' | 'store' | 'exchange' | 'quoting'
  | 'intake' | 'blueprints' | 'permits' | 'plans' | 'content'
  | 'sales' | 'bids';

export interface Delegation {
  /** Path under the edge function. Resolved from here, NEVER from the model. */
  route: string;
  /** What the body must carry, in words the model can act on. */
  input: string;
  /** A body known to return 200, so a failure is about the agent and not the call. */
  example: Record<string, unknown>;
}

export interface DeclaredAgent {
  /** The ledger label. This is the join key against `ai_call_log.agent`. */
  agent: string;
  domain: AgentDomain;
  /** One line: what it is for. */
  does: string;
  /** Where it lives. `null` when nothing reaches it. */
  route: string | null;
  /** Front-end components that call it, for tracing a dead agent back to a screen. */
  ui: string[];
  /**
   * `live` — reachable and proven to answer.
   * `unwired` — built on the server, nothing in the application calls it.
   */
  state: 'live' | 'unwired';
  /** Present only when Phoenix may invoke it himself. See the header. */
  delegable?: Delegation;
  note?: string;
}

export const AGENTS: readonly DeclaredAgent[] = [
  /* ── Phoenix himself. Not delegable: he would be calling himself. ──────── */
  {
    agent: 'phoenix-chat', domain: 'assistant',
    does: 'The owner-facing assistant: reads the business and proposes actions.',
    route: '/phoenix/chat', ui: ['PhoenixConsole', 'PhoenixAssistant'], state: 'live',
  },
  {
    agent: 'phoenix-ears', domain: 'assistant',
    does: 'Transcribes what the owner says into the console.',
    route: '/phoenix/transcribe', ui: ['PhoenixConsole'], state: 'live',
  },
  {
    agent: 'phoenix-voice', domain: 'assistant',
    does: 'Speaks his replies aloud.',
    route: '/phoenix/speak', ui: ['PhoenixConsole'], state: 'live',
  },

  /* ── Commit something, so they stay behind the approval queue. ─────────── */
  {
    agent: 'leads', domain: 'sales',
    does: 'Reads an inbound enquiry and files it as a lead.',
    route: '/leads/capture', ui: ['LeadsHub'], state: 'live',
    note: 'Writes a lead record. Propose, do not call.',
  },
  {
    agent: 'quote-generator', domain: 'quoting',
    does: 'Drafts a quote from a description of the work.',
    route: '/auto-generate-quote', ui: ['QuoteBuilder'], state: 'live',
    note: 'A quote becomes a contract and then an invoice. Staff act, never an agent acting alone.',
  },
  {
    agent: 'ai-guide', domain: 'intake',
    does: 'Interviews a customer until their work request is quotable.',
    route: '/ai-guide-chat', ui: ['ClientWorkRequestForm', 'IntakeGuide'], state: 'live',
    note: 'Signed-in only, by Eric\'s decision on 2026-11-10. Conversational and tied to one '
      + 'in-flight form, so there is nothing for Phoenix to usefully call.',
  },

  /* ── Generate or analyse, commit nothing. Phoenix may call these. ──────── */
  {
    agent: 'marketing-assets', domain: 'marketing',
    does: 'Writes ad copy, product descriptions and SEO text.',
    route: '/marketing-assets/generate-description', ui: ['AdStudio'], state: 'live',
    delegable: {
      route: '/marketing-assets/generate-description',
      input: 'productName, productDescription, tone, context',
      example: {
        productName: 'Composite Deck Build',
        productDescription: 'Pressure-treated 12x16 deck',
        tone: 'persuasive', context: 'service_promo',
      },
    },
    note: 'Asked for the retired model `gpt-4` until 2026-11-11 and 404ed on every call.',
  },
  {
    agent: 'social-media', domain: 'marketing',
    does: 'Rewrites a post for a different platform.',
    route: '/social/ai-repurpose', ui: ['SocialMediaHub'], state: 'live',
    delegable: {
      route: '/social/ai-repurpose',
      input: 'originalContent, sourcePlatform, targetPlatform',
      example: {
        originalContent: 'We just finished a kitchen remodel in Salem NH.',
        sourcePlatform: 'instagram', targetPlatform: 'linkedin',
      },
    },
    note: 'Returns a caption. Publishing it is a separate, approved act.',
  },
  {
    agent: 'dropshipper', domain: 'store',
    does: 'Suggests retail prices for stock against a target margin.',
    route: '/dropshipper/inventory/suggest-pricing', ui: ['MultiDropshipperManager'], state: 'live',
    delegable: {
      route: '/dropshipper/inventory/suggest-pricing',
      input: 'items (each needs sku and cost > 0), minMarginPct',
      example: { items: [{ sku: 'TEST-1', name: 'Widget', cost: 10 }], minMarginPct: 20 },
    },
    note: 'Suggests only. Applying a price is a separate act. An item without a sku is refused.',
  },
  {
    agent: 'exchangeAssistantRoutes', domain: 'exchange',
    does: 'Answers questions about Exchange listings and territories.',
    route: '/exchange/assistant', ui: ['ExchangePlaces'], state: 'live',
    delegable: {
      route: '/exchange/assistant',
      input: 'ask (2-500 chars), optional territory',
      example: { ask: 'Which towns are covered?' },
    },
    note: 'Drops any listing id the model did not retrieve — the output allowlist the rest should copy.',
  },
  {
    agent: 'permit-ai', domain: 'permits',
    does: 'Answers New Hampshire permitting and code questions.',
    route: '/permit-ai/chat', ui: ['PermitAI', 'MaterialsCenter'], state: 'live',
    delegable: {
      route: '/permit-ai/chat',
      input: 'message, optional workType, address, history',
      example: { message: 'Do I need a permit for a deck in Salem NH?' },
    },
  },
  {
    agent: 'plan-builder', domain: 'plans',
    does: 'Assembles a maintenance plan from the service catalogue.',
    route: '/plan-builder/generate', ui: ['PlanBuilderTab'], state: 'live',
    delegable: {
      route: '/plan-builder/generate',
      input: 'needs, catalog (non-empty), frequencies, skillLevels',
      example: {
        needs: 'quarterly gutter and roof upkeep',
        catalog: [{ id: 's1', name: 'Gutter cleaning', price: 150 }],
        frequencies: ['quarterly'], skillLevels: ['standard'],
      },
    },
    note: 'An empty catalog is refused with "No services are available" — that is the payload, not a fault.',
  },
  {
    agent: 'video-studio', domain: 'content',
    does: 'Suggests trims and an aspect ratio for a clip.',
    route: '/video/ai-edit', ui: ['EnterpriseContentCenter'], state: 'live',
    delegable: { route: '/video/ai-edit', input: 'duration in seconds', example: { duration: 60 } },
  },
  {
    agent: 'blueprint-analysis', domain: 'blueprints',
    does: 'Reads blueprints for rooms, square footage and linear footage.',
    route: '/ai/analyze-blueprints', ui: ['BlueprintImport', 'ClientWorkRequestForm'], state: 'live',
    delegable: {
      route: '/ai/analyze-blueprints',
      input: 'blueprints: [{ filename, base64 }] — the key is base64 or url, NOT data',
      example: { blueprints: [{ filename: 'plan.png', base64: '<base64>' }], analysisType: 'comprehensive' },
    },
  },
  {
    agent: 'ai-floorplan', domain: 'blueprints',
    does: 'Reads a floor plan image or video into rooms and dimensions.',
    route: '/ai-floorplan/analyze-image', ui: ['AIVideoUpload'], state: 'live',
    delegable: {
      route: '/ai-floorplan/analyze-image',
      input: 'imageBase64 or imageUrl, analysisType',
      example: { imageBase64: '<base64>', analysisType: 'full-analysis' },
    },
    note: 'Returns 500 "Failed to parse AI analysis" when the model declines an unreadable image.',
  },
  {
    agent: 'vision-read', domain: 'blueprints',
    does: 'Reads any supplied image and answers a question about it.',
    route: '/ai/vision', ui: ['AIBlueprintAnalyzer'], state: 'live',
    delegable: {
      route: '/ai/vision',
      input: 'messages: [{ content: [{type:text,...},{type:image,source:{media_type,data}}] }]',
      example: {
        messages: [{
          content: [
            { type: 'text', text: 'What is in this image?' },
            { type: 'image', source: { media_type: 'image/png', data: '<base64>' } },
          ],
        }],
      },
    },
    note: 'CONFABULATES on an unreadable image rather than refusing — a 1x1 blank PNG came back '
      + 'described in confident detail as a snack packet. Treat a reading of a poor scan as a '
      + 'claim to check, never as a measurement.',
  },

  /* ── Built, and nothing calls it. ──────────────────────────────────────── */
  {
    agent: 'bid-router', domain: 'bids',
    does: 'Analyses an incoming bid request and routes it.',
    route: '/bid-router/ai-analyze', ui: [], state: 'unwired',
    note: 'Three routes exist and BidRoom.tsx reaches none of them. Unfinished, not abandoned — '
      + 'see tasks/bid-room-marketplace-plan.md.',
  },
] as const;

/** The subset Phoenix may invoke, by name. */
export function delegableAgents(): DeclaredAgent[] {
  return AGENTS.filter((a) => !!a.delegable);
}

/** One declared agent by its ledger label, or null. Never trust a model for the route. */
export function findAgent(name: unknown): DeclaredAgent | null {
  const key = String(name ?? '').trim();
  return AGENTS.find((a) => a.agent === key) ?? null;
}

export interface LedgerFact { agent: string; outcome?: string | null; started_at?: string | null }

export interface AgentStatus extends DeclaredAgent {
  calls: number;
  failures: number;
  lastUsed: string | null;
}

export interface Reconciliation {
  windowHours: number;
  agents: AgentStatus[];
  /** Declared, reachable, and silent for the whole window. The question worth asking. */
  silent: string[];
  /** On the ledger and not declared here. Somebody shipped an agent and told nobody. */
  undeclared: string[];
  /** Declared with nothing calling them. Unfinished work, not failure. */
  unwired: string[];
}

/**
 * The declaration against the ledger.
 *
 * Pure, so the interesting part is testable without a database. Counting
 * failures separately from calls matters: an agent with calls and no failures
 * is healthy, one with failures and no successes is the `marketing-assets`
 * case, and those must not average into the same number.
 */
export function reconcile(
  rows: readonly LedgerFact[],
  windowHours: number,
  declared: readonly DeclaredAgent[] = AGENTS,
): Reconciliation {
  const seen = new Map<string, { calls: number; failures: number; last: string | null }>();
  for (const row of rows) {
    const key = String(row?.agent ?? '').trim();
    if (!key) continue;
    const at = row?.started_at ?? null;
    const cur = seen.get(key) ?? { calls: 0, failures: 0, last: null };
    cur.calls += 1;
    if (row?.outcome && row.outcome !== 'ok') cur.failures += 1;
    if (at && (!cur.last || at > cur.last)) cur.last = at;
    seen.set(key, cur);
  }

  const agents: AgentStatus[] = declared.map((a) => {
    const hit = seen.get(a.agent);
    return { ...a, calls: hit?.calls ?? 0, failures: hit?.failures ?? 0, lastUsed: hit?.last ?? null };
  });

  const declaredNames = new Set(declared.map((a) => a.agent));
  return {
    windowHours,
    agents,
    silent: agents.filter((a) => a.state === 'live' && a.calls === 0).map((a) => a.agent),
    undeclared: [...seen.keys()].filter((k) => !declaredNames.has(k)).sort(),
    unwired: declared.filter((a) => a.state === 'unwired').map((a) => a.agent),
  };
}
