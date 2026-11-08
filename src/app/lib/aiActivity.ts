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
import { API_BASE_URL } from './apiConfig';

const BASE = `${API_BASE_URL}/make-server-3eae23a6/ai-activity`;

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
  const res = await fetch(`${BASE}/summary?hours=${hours}`, { headers: await authHeader() });
  if (res.status === 403) throw new NotPermitted('Company access is required for this.');
  if (!res.ok) throw new Error(`Could not load AI activity (HTTP ${res.status}).`);
  const body = await res.json();
  if (!body?.success) throw new Error(body?.error || 'Could not load AI activity.');
  return body as ActivitySummary;
}

export async function fetchCalls(hours = 24, limit = 100): Promise<LedgerCall[]> {
  const res = await fetch(`${BASE}/calls?hours=${hours}&limit=${limit}`, { headers: await authHeader() });
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
