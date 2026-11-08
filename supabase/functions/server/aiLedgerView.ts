/**
 * Turning ledger rows into the numbers Mission Control shows.
 *
 * WHY THIS IS ITS OWN FILE
 *
 * The same reason as `aiCeiling.ts`: the router imports Hono, so a node test
 * cannot reach anything defined beside it. These are the rules that decide
 * what the owner is told about their own system, and "the dashboard said it
 * was fine" is only worth anything if the rule behind it was checked.
 *
 * The one that matters most is `isStuck`. A row is written before the model is
 * called and closed after, so a row still saying `running` does not mean work
 * in progress — past a point it means the handler died without ever recording
 * an outcome. Getting that threshold wrong in one direction shows phantom
 * activity forever; in the other it reports a hung call as finished.
 */

export interface LedgerRow {
  id?: string;
  started_at: string;
  finished_at?: string | null;
  duration_ms?: number | null;
  agent: string;
  operation?: string;
  outcome: string;
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

/**
 * How long a call may say `running` before it is presumed dead.
 *
 * Ten minutes. The longest real call on this platform is a vision read over
 * several full-size blueprint sheets, which runs to a couple of minutes; a
 * render is faster. Ten gives that generous headroom while still surfacing a
 * dead handler within one sitting.
 *
 * Deliberately not tighter. A threshold that marks live work as stuck teaches
 * the owner to ignore the indicator, which is worse than not having it.
 */
export const STUCK_AFTER_MS = 10 * 60 * 1000;

/**
 * True when a row claims to be running but almost certainly is not.
 *
 * `now` is a parameter rather than read from the clock so this is testable
 * without waiting ten minutes.
 */
export function isStuck(row: LedgerRow, now: number = Date.now()): boolean {
  if (row.outcome !== 'running') return false;
  const started = Date.parse(row.started_at);
  if (!Number.isFinite(started)) return false;
  return now - started > STUCK_AFTER_MS;
}

/** What a row is really doing, once a stalled one stops counting as live. */
export function effectiveState(row: LedgerRow, now: number = Date.now()): string {
  if (row.outcome === 'running') return isStuck(row, now) ? 'abandoned' : 'running';
  return row.outcome;
}

export interface LedgerSummary {
  total: number;
  ok: number;
  refused: number;
  errors: number;
  running: number;
  abandoned: number;
  /** An ESTIMATE. Derived from published per-token prices, not a bill. */
  estimatedCostCents: number;
  tokensIn: number;
  tokensOut: number;
  /** Calls that changed something, as opposed to producing text. */
  actionsTaken: number;
  /** Median rather than mean: one slow blueprint read skews a mean badly. */
  medianDurationMs: number | null;
}

function median(values: number[]): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}

export function summarise(rows: LedgerRow[], now: number = Date.now()): LedgerSummary {
  const out: LedgerSummary = {
    total: rows.length,
    ok: 0, refused: 0, errors: 0, running: 0, abandoned: 0,
    estimatedCostCents: 0, tokensIn: 0, tokensOut: 0,
    actionsTaken: 0, medianDurationMs: null,
  };
  const durations: number[] = [];

  for (const row of rows) {
    switch (effectiveState(row, now)) {
      case 'ok': out.ok++; break;
      case 'refused': out.refused++; break;
      case 'error': out.errors++; break;
      case 'running': out.running++; break;
      case 'abandoned': out.abandoned++; break;
    }
    const cost = Number(row.cost_cents);
    if (Number.isFinite(cost)) out.estimatedCostCents += cost;
    if (Number.isFinite(row.tokens_in as number)) out.tokensIn += row.tokens_in as number;
    if (Number.isFinite(row.tokens_out as number)) out.tokensOut += row.tokens_out as number;
    if (row.action_taken) out.actionsTaken++;
    if (Number.isFinite(row.duration_ms as number)) durations.push(row.duration_ms as number);
  }

  out.estimatedCostCents = Math.round(out.estimatedCostCents * 10000) / 10000;
  out.medianDurationMs = median(durations);
  return out;
}

export interface AgentRollup extends LedgerSummary {
  agent: string;
  lastSeen: string | null;
}

/**
 * Per-agent rollup, busiest first.
 *
 * Sorted by call count rather than by name because the question the screen
 * answers is "what is this thing spending its time on", and an alphabetical
 * list buries that under whichever agent starts with an 'a'.
 */
export function byAgent(rows: LedgerRow[], now: number = Date.now()): AgentRollup[] {
  const groups = new Map<string, LedgerRow[]>();
  for (const row of rows) {
    const key = row.agent || 'unknown';
    const list = groups.get(key);
    if (list) list.push(row); else groups.set(key, [row]);
  }

  const rollups: AgentRollup[] = [];
  for (const [agent, list] of groups) {
    let lastSeen: string | null = null;
    for (const row of list) {
      if (!lastSeen || row.started_at > lastSeen) lastSeen = row.started_at;
    }
    rollups.push({ agent, lastSeen, ...summarise(list, now) });
  }
  return rollups.sort((a, b) => b.total - a.total || a.agent.localeCompare(b.agent));
}

/**
 * Is anything wrong enough to say so on the dashboard?
 *
 * Returns the reasons rather than a boolean, because "degraded" with no
 * explanation is the kind of indicator people learn to scroll past.
 *
 * An error RATE rather than a count: three failures out of four matters and
 * three out of six hundred does not, and a threshold on the raw count would
 * cry wolf on a busy day and stay silent on a broken quiet one. The floor of
 * five calls stops a single failure reading as 100%.
 */
export function concerns(summary: LedgerSummary): string[] {
  const reasons: string[] = [];
  if (summary.abandoned > 0) {
    reasons.push(
      `${summary.abandoned} call${summary.abandoned === 1 ? '' : 's'} started and never finished`,
    );
  }
  if (summary.total >= 5) {
    const rate = summary.errors / summary.total;
    if (rate >= 0.2) {
      reasons.push(`${Math.round(rate * 100)}% of calls failed`);
    }
  }
  return reasons;
}
