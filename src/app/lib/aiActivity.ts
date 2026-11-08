/**
 * Reading the AI ledger, for the screen that is supposed to show it.
 *
 * WHY THIS EXISTS
 *
 * `AIDiagnosticsCenter.tsx` is 1,676 lines of activity log, health monitoring
 * and agent controls, and until now it made no network calls at all — every
 * number in it was a hardcoded array. It looked like a dashboard and had never
 * shown anything that happened.
 *
 * The server side is `ai-activity.tsx` and the table behind it is
 * `ai_call_log`. This is the client half: the fetches, and the mapping from
 * what the ledger records to the shapes that screen already renders.
 *
 * WHY THE MAPPING IS HERE AND NOT IN THE COMPONENT
 *
 * So it can be tested without rendering anything. The mapping is where the
 * lying would happen if this screen went back to lying — an agent with no
 * calls has to come out as "idle" rather than "healthy", and a cost has to
 * stay labelled an estimate. Those are rules, and rules belong somewhere a
 * test can reach them.
 */
/**
 * The base URL is resolved lazily, inside the fetchers.
 *
 * A top-level `import { API_BASE_URL } from './apiConfig'` is fine for Vite,
 * which resolves extensionless paths, and fatal for `node --test`, which does
 * not — the whole module fails to load and every mapping test dies at import
 * before asserting anything.
 *
 * The mappings below are the part worth testing and they need no config at
 * all, so the config stays on the side that does. Nothing here runs in a test;
 * the dynamic imports are only reached from the browser.
 */
async function base(): Promise<string> {
  const { API_BASE_URL } = await import('./apiConfig');
  return `${API_BASE_URL}/make-server-3eae23a6/ai-activity`;
}

/** One row of the ledger, as the server sends it. */
export interface LedgerCall {
  id: string;
  started_at: string;
  finished_at?: string | null;
  duration_ms?: number | null;
  agent: string;
  operation?: string;
  outcome: string;
  /** `effectiveState` from the server: running, abandoned, ok, refused, error. */
  state?: string;
  authority?: string;
  actor_email?: string | null;
  model?: string | null;
  cost_cents?: number | string | null;
  tokens_in?: number | null;
  tokens_out?: number | null;
  action_taken?: string | null;
  error?: string | null;
  summary?: string | null;
}

export interface AgentRollup {
  agent: string;
  lastSeen: string | null;
  total: number;
  ok: number;
  refused: number;
  errors: number;
  running: number;
  abandoned: number;
  estimatedCostCents: number;
  tokensIn: number;
  tokensOut: number;
  actionsTaken: number;
  medianDurationMs: number | null;
}

export interface ActivitySummary {
  windowHours: number;
  truncated: boolean;
  summary: AgentRollup;
  agents: AgentRollup[];
  concerns: string[];
  costIsEstimate: boolean;
  /** Models whose price is from an unchecked rate. Shown beside the cost. */
  unverifiedPricing?: string[];
}

async function authHeader(): Promise<Record<string, string>> {
  // Imported lazily so this module can be unit-tested without the Supabase
  // client, which reaches for browser storage at import time.
  const { supabase } = await import('./supabase');
  const { publicAnonKey } = await import('../utils/supabase/info');
  const { data: { session } } = await supabase.auth.getSession();
  return { Authorization: `Bearer ${session?.access_token || publicAnonKey}` };
}

/**
 * These routes are staff-only, and a non-staff account gets a 403.
 *
 * That is reported as a distinct state rather than as an empty list, because
 * "you may not see this" and "nothing has happened" look identical on a
 * dashboard and mean completely different things.
 */
export class NotPermitted extends Error {}

export async function fetchSummary(hours = 24): Promise<ActivitySummary> {
  const res = await fetch(`${await base()}/summary?hours=${hours}`, { headers: await authHeader() });
  if (res.status === 403) throw new NotPermitted('Company access is required for this.');
  if (!res.ok) throw new Error(`Could not load AI activity (HTTP ${res.status}).`);
  const body = await res.json();
  if (!body?.success) throw new Error(body?.error || 'Could not load AI activity.');
  return body as ActivitySummary;
}

export async function fetchCalls(hours = 24, limit = 100): Promise<LedgerCall[]> {
  const res = await fetch(`${await base()}/calls?hours=${hours}&limit=${limit}`, { headers: await authHeader() });
  if (res.status === 403) throw new NotPermitted('Company access is required for this.');
  if (!res.ok) throw new Error(`Could not load AI activity (HTTP ${res.status}).`);
  const body = await res.json();
  if (!body?.success) throw new Error(body?.error || 'Could not load AI activity.');
  return (body.calls || []) as LedgerCall[];
}

/* ── mapping into the shapes the screen already renders ──────────────────── */

/**
 * How a ledger outcome reads in the activity feed.
 *
 * `abandoned` maps to a failure rather than to pending, which is the whole
 * point of the server computing it: a call that never closed is not still
 * working, and showing it as pending forever is the dashboard lying quietly.
 */
export function activityStatus(state: string): 'success' | 'failure' | 'pending' {
  switch (state) {
    case 'ok': return 'success';
    case 'running': return 'pending';
    case 'refused':
    case 'error':
    case 'abandoned': return 'failure';
    default: return 'pending';
  }
}

export function activityType(state: string): 'execution' | 'error' | 'config' | 'alert' | 'resolution' {
  if (state === 'error' || state === 'abandoned') return 'error';
  if (state === 'refused') return 'alert';
  return 'execution';
}

/** A readable name for an agent slug, without inventing one it does not have. */
export function agentLabel(agent: string): string {
  if (!agent) return 'Unattributed';
  return agent
    .split(/[-_]/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export interface MappedActivity {
  id: string;
  systemId: string;
  systemName: string;
  type: 'execution' | 'error' | 'config' | 'alert' | 'resolution';
  action: string;
  details: string;
  timestamp: string;
  user?: string;
  status: 'success' | 'failure' | 'pending';
}

export function toActivity(call: LedgerCall): MappedActivity {
  const state = call.state || call.outcome;
  return {
    id: call.id,
    systemId: call.agent,
    systemName: agentLabel(call.agent),
    type: activityType(state),
    action: call.operation || state,
    /**
     * The summary the caller wrote, else the error, else a plain statement of
     * the state. Never a cheerful default — an empty details field that reads
     * "Completed successfully" is how a dashboard starts lying again.
     */
    details: call.summary
      || call.error
      || (state === 'abandoned' ? 'Started and never finished' : `Outcome: ${state}`),
    timestamp: call.started_at,
    user: call.actor_email || undefined,
    status: activityStatus(state),
  };
}

/**
 * An agent's health, from its own numbers.
 *
 * NO CALLS MEANS IDLE, NOT HEALTHY. An agent nobody has used is not working
 * correctly — nothing is known about it either way, and claiming a green tick
 * for a capability that has never run in the window is exactly the kind of
 * reassurance this screen used to manufacture.
 */
export function agentStatus(a: AgentRollup): 'healthy' | 'degraded' | 'critical' | 'offline' {
  if (!a.total) return 'offline';
  if (a.abandoned > 0) return 'critical';
  const errorRate = a.errors / a.total;
  if (errorRate >= 0.5) return 'critical';
  if (errorRate >= 0.2) return 'degraded';
  return 'healthy';
}

export function errorRatePercent(a: AgentRollup): number {
  if (!a.total) return 0;
  return Math.round((a.errors / a.total) * 1000) / 10;
}

/** Cents to a display string. Always shown next to the word "estimated". */
export function formatCost(cents: number): string {
  const dollars = (Number(cents) || 0) / 100;
  if (dollars === 0) return '$0.00';
  if (dollars < 0.01) return '<$0.01';
  return `$${dollars.toFixed(2)}`;
}

/* ── the systems and alerts views ────────────────────────────────────────── */

/**
 * An agent, in the shape the Systems tab renders.
 *
 * WHAT IS REAL AND WHAT IS LEFT EMPTY
 *
 * Everything here comes from counted rows: calls, tokens, errors, median
 * duration, estimated cost. The fields the old mock carried that have NO
 * source are deliberately left empty rather than filled with a plausible
 * number — `features`, `version`, `latestVersion`, `updateAvailable`.
 *
 * An agent is a function in this codebase. It does not have a version, it
 * does not have an upgrade available, and inventing "2.1.0 → 2.3.0" is what
 * the page did before. The component hides those sections when they are
 * empty, so the screen is shorter and true rather than longer and false.
 *
 * `uptime` is NOT uptime. There is no uptime for a function that only exists
 * while a request is in flight. The field keeps its name because the
 * component's type uses it, and the component now LABELS IT "Success rate",
 * which is what the number actually is: ok ÷ total.
 */
export interface MappedSystem {
  id: string;
  name: string;
  category: 'content' | 'analytics' | 'automation' | 'assistant' | 'vision';
  status: 'healthy' | 'degraded' | 'critical' | 'offline';
  /** Success rate as a percentage. Labelled as such in the UI, not as uptime. */
  uptime: number;
  lastCheck: string;
  /** Median, not mean — one slow blueprint read would set a mean on its own. */
  responseTime: number;
  apiCalls: number;
  tokensUsed: number;
  /** Dollars. An estimate, and shown next to that word. */
  cost: number;
  errorRate: number;
  features: string[];
  color: string;
  enabled: boolean;
  version: string;
}

/** Cosmetic only. An agent with no entry gets the neutral default. */
const AGENT_LOOK: Record<string, { category: MappedSystem['category']; color: string }> = {
  'quote-generator': { category: 'assistant', color: 'text-blue-400' },
  'design-assistant': { category: 'assistant', color: 'text-purple-400' },
  'house-capture': { category: 'vision', color: 'text-green-400' },
  'content-studio': { category: 'content', color: 'text-orange-400' },
  'lead-scoring': { category: 'analytics', color: 'text-cyan-400' },
};

export function toSystem(a: AgentRollup): MappedSystem {
  const look = AGENT_LOOK[a.agent] || { category: 'automation' as const, color: 'text-gray-400' };
  return {
    id: a.agent,
    name: agentLabel(a.agent),
    category: look.category,
    status: agentStatus(a),
    uptime: a.total ? Math.round((a.ok / a.total) * 1000) / 10 : 0,
    lastCheck: a.lastSeen || '',
    responseTime: a.medianDurationMs ?? 0,
    apiCalls: a.total,
    tokensUsed: (a.tokensIn || 0) + (a.tokensOut || 0),
    cost: (Number(a.estimatedCostCents) || 0) / 100,
    errorRate: errorRatePercent(a),
    features: [],
    color: look.color,
    // No pause mechanism exists on the server, so nothing here can be
    // disabled. Reported as enabled because that is the truth; the controls
    // are disabled in the UI rather than pretending to work.
    enabled: true,
    version: '',
  };
}

export interface MappedAlert {
  id: string;
  systemId: string;
  systemName: string;
  severity: 'critical' | 'warning' | 'info';
  title: string;
  message: string;
  timestamp: string;
  resolved: boolean;
  autoResolvable: boolean;
}

/**
 * Alerts derived from what the ledger actually recorded.
 *
 * There is no alerting system on this platform, and the old page pretended
 * there was — eight invented alerts with recommendations and auto-resolve
 * flags. These are not that. They are a restatement of counted facts, and
 * `autoResolvable` is false on every one because nothing here can resolve
 * anything.
 *
 * Only two conditions qualify, both from `concerns` on the server plus the
 * per-agent rollup: work that started and never finished, and an agent
 * failing a fifth or more of its calls. Anything weaker is noise, and a list
 * of weak alerts is a list nobody reads.
 */
export function deriveAlerts(summary: ActivitySummary, now: number = Date.now()): MappedAlert[] {
  const alerts: MappedAlert[] = [];
  const stamp = new Date(now).toISOString();

  for (const a of summary.agents) {
    if (a.abandoned > 0) {
      alerts.push({
        id: `abandoned-${a.agent}`,
        systemId: a.agent,
        systemName: agentLabel(a.agent),
        severity: 'critical',
        title: 'Calls started and never finished',
        message: `${a.abandoned} call${a.abandoned === 1 ? '' : 's'} opened a ledger row and never recorded an outcome. `
          + 'That usually means the handler threw somewhere it does not catch.',
        timestamp: a.lastSeen || stamp,
        resolved: false,
        autoResolvable: false,
      });
    }
    if (a.total >= 5 && a.errors / a.total >= 0.2) {
      alerts.push({
        id: `errors-${a.agent}`,
        systemId: a.agent,
        systemName: agentLabel(a.agent),
        severity: a.errors / a.total >= 0.5 ? 'critical' : 'warning',
        title: `${errorRatePercent(a)}% of calls failed`,
        message: `${a.errors} of ${a.total} calls returned an error in this window.`,
        timestamp: a.lastSeen || stamp,
        resolved: false,
        autoResolvable: false,
      });
    }
  }
  return alerts;
}

/* ── the emergency stop ──────────────────────────────────────────────────── */

export interface StopState {
  scope: string;
  engagedAt: string;
  engagedBy: string;
  reason: string | null;
}

export interface StopStatus {
  stops: StopState[];
  /**
   * The honest upper bound on "how long after I press stop does it stop".
   *
   * Comes from the server rather than being typed in here, so the number
   * shown and the number enforced cannot drift apart.
   */
  takesEffectWithinSeconds: number;
}

export const GLOBAL_SCOPE = 'global';

export async function fetchStops(): Promise<StopStatus> {
  const res = await fetch(`${await base()}/stop`, { headers: await authHeader() });
  if (res.status === 403) throw new NotPermitted('Company access is required for this.');
  if (!res.ok) throw new Error(`Could not read the AI stop (HTTP ${res.status}).`);
  const body = await res.json();
  if (!body?.success) throw new Error(body?.error || 'Could not read the AI stop.');
  return { stops: body.stops || [], takesEffectWithinSeconds: body.takesEffectWithinSeconds ?? 15 };
}

export async function engageStop(scope: string, reason: string): Promise<string> {
  const res = await fetch(`${await base()}/stop`, {
    method: 'POST',
    headers: { ...(await authHeader()), 'Content-Type': 'application/json' },
    body: JSON.stringify({ scope, reason }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body?.success) {
    throw new Error(body?.error || `Could not engage the stop (HTTP ${res.status}).`);
  }
  return body.message || 'Stopped.';
}

/**
 * Release. Owner-only on the server, and the 403 it returns is worth showing
 * verbatim — it explains the asymmetry rather than just refusing.
 */
export async function releaseStop(scope: string): Promise<string> {
  const res = await fetch(`${await base()}/stop?scope=${encodeURIComponent(scope)}`, {
    method: 'DELETE',
    headers: await authHeader(),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body?.success) {
    throw new Error(body?.error || `Could not release the stop (HTTP ${res.status}).`);
  }
  return body.message || 'Released.';
}
