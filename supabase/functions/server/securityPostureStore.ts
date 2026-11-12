/**
 * Storage for the last probe result.
 *
 * Split from `securityPosture.ts` so the judgement in that file stays pure and
 * node-testable: `kv_store.tsx` reaches for Deno and npm specifiers that
 * `node --test` cannot load, and importing it from the module holding the
 * reasoning would have made the reasoning untestable. The decision about what
 * a stale or malformed result means is exactly the part that fails quietly, so
 * it is the part that must be covered.
 */

import * as kv from './kv_store.tsx';
import type { ProbeReport } from './securityPosture.ts';

const KEY = 'security:last-probe';

/** Store a run. Last one wins; this is a current-state record, not a history. */
export async function recordProbeReport(report: ProbeReport): Promise<void> {
  await kv.set(KEY, report);
}

/** The last stored run, or null. */
export async function lastProbeReport(): Promise<ProbeReport | null> {
  try {
    const row = await kv.get(KEY);
    return (row && typeof row === 'object') ? row as ProbeReport : null;
  } catch {
    // Storage trouble must read as "nothing reported", which assess() treats
    // as unknown — never as a pass.
    return null;
  }
}
