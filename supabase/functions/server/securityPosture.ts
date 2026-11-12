/**
 * The last security probe result, kept where the assistant can read it.
 *
 * WHY THIS EXISTS
 *
 * `scripts/security-probe.mjs` is the October assessment rewritten as an
 * executable check. It runs in CI and weekly on a schedule, prints a table and
 * exits with a code. That is the right shape for a pipeline and useless to
 * anybody who is not reading a workflow log: asked "are we secure", Phoenix
 * could see errors and model spend and nothing whatsoever about whether the
 * controls still hold.
 *
 * So the probe posts its result and the assistant reads the latest one. The
 * judgement lives here and is pure; the storage lives in
 * `securityPostureStore.ts`, because `kv_store.tsx` cannot be loaded by
 * `node --test` and this file's reasoning is the part worth testing.
 *
 * WHAT THIS DELIBERATELY IS NOT
 *
 * Not a second probe. Nothing in this file tests anything — it stores what the
 * real probe found and reports it back with its age. A control re-checked by
 * the thing that reports on it is a control that reports on itself.
 *
 * AGE IS HALF THE ANSWER
 *
 * A probe that stopped running looks exactly like a probe that keeps passing:
 * both leave a clean last result. The weekly schedule means anything older
 * than about eight days is a failure of the pipeline rather than a pass of the
 * platform, and `assess()` says so in those words. That distinction is the
 * whole reason staleness is computed rather than left for a reader to notice.
 */


/** One check the probe ran. */
export interface ProbeFinding {
  id: string;
  title: string;
  detail?: string;
}

/** What the probe posts after a run. */
export interface ProbeReport {
  /** ISO timestamp of the run. */
  at: string;
  passed: number;
  failed: number;
  warnings: number;
  skipped: number;
  /** Checks that failed — a control that should be in place and is not. */
  failures: ProbeFinding[];
  /** Checks that warned — worth knowing, not yet a breach of a control. */
  warned: ProbeFinding[];
  /** 'quick' or 'full'. A quick run skips the slow checks and proves less. */
  mode?: string;
  /** The commit the probe ran against, when CI supplies it. */
  commit?: string;
}



/**
 * How old a result may be before it stops meaning anything.
 *
 * The schedule is weekly, so eight days allows a late run without allowing a
 * silently dead one.
 */
export const STALE_AFTER_HOURS = 8 * 24;

export interface Assessment {
  /** null when the probe has never reported. */
  report: ProbeReport | null;
  ageHours: number | null;
  stale: boolean;
  /** One line, written so it can be repeated verbatim without overclaiming. */
  verdict: string;
}

/**
 * The stored result, judged against the clock.
 *
 * Pure, so the judgement is testable without a database — and the judgement is
 * the part that can be wrong in a way nobody notices.
 */
export function assess(report: ProbeReport | null, now: number): Assessment {
  if (!report) {
    return {
      report: null, ageHours: null, stale: true,
      verdict: 'The security probe has never reported here. That is a gap in '
        + 'reporting, not a finding about the platform — run `npm run security`.',
    };
  }

  const at = Date.parse(report.at);
  const ageHours = Number.isFinite(at) ? Math.max(0, (now - at) / 3600_000) : null;
  const stale = ageHours === null || ageHours > STALE_AFTER_HOURS;
  const days = ageHours === null ? null : Math.floor(ageHours / 24);

  if (stale) {
    return {
      report, ageHours, stale: true,
      verdict: `The last probe result is ${days === null ? 'of unknown age' : `${days} days old`}, `
        + 'and the probe is meant to run weekly. Treat it as unknown rather than as a pass — '
        + 'a probe that stopped running leaves the same clean result as one that keeps passing.',
    };
  }

  if (report.failed > 0) {
    const names = report.failures.map((f) => f.id).join(', ');
    return {
      report, ageHours, stale: false,
      verdict: `${report.failed} control${report.failed === 1 ? '' : 's'} that should be in place `
        + `${report.failed === 1 ? 'is' : 'are'} not: ${names}. Checked ${days === 0 ? 'today' : `${days} day(s) ago`}.`,
    };
  }

  const quick = report.mode === 'quick' ? ' This was a quick run, which skips the slow checks.' : '';
  return {
    report, ageHours, stale: false,
    verdict: `All ${report.passed} checks passed${report.warnings ? `, with ${report.warnings} warning(s)` : ''}, `
      + `checked ${days === 0 ? 'today' : `${days} day(s) ago`}.${quick} `
      + 'This covers the exposed surface the probe can reach with a public key, not the source.',
  };
}

/**
 * Coerce whatever was posted into a report, or null.
 *
 * The body arrives from CI over the network. A malformed post must not be
 * stored as a result, because a stored result is what the assistant will
 * repeat as fact — and "0 failed" assembled out of missing fields is the one
 * wrong answer that would never be questioned.
 */
export function parseProbeReport(body: unknown): ProbeReport | null {
  if (!body || typeof body !== 'object') return null;
  const b = body as Record<string, unknown>;

  const count = (v: unknown): number | null => {
    const n = Number(v);
    return Number.isFinite(n) && n >= 0 ? Math.floor(n) : null;
  };
  const passed = count(b.passed);
  const failed = count(b.failed);
  if (passed === null || failed === null) return null;

  const findings = (v: unknown): ProbeFinding[] => (Array.isArray(v) ? v : [])
    .map((f) => {
      const o = (f && typeof f === 'object') ? f as Record<string, unknown> : {};
      const id = String(o.id ?? '').trim();
      return id ? { id: id.slice(0, 40), title: String(o.title ?? '').slice(0, 200),
        detail: o.detail ? String(o.detail).slice(0, 500) : undefined } : null;
    })
    .filter(Boolean)
    .slice(0, 50) as ProbeFinding[];

  const at = String(b.at ?? '').trim();
  return {
    at: Number.isFinite(Date.parse(at)) ? at : new Date().toISOString(),
    passed, failed,
    warnings: count(b.warnings) ?? 0,
    skipped: count(b.skipped) ?? 0,
    failures: findings(b.failures),
    warned: findings(b.warned),
    mode: b.mode ? String(b.mode).slice(0, 20) : undefined,
    commit: b.commit ? String(b.commit).slice(0, 60) : undefined,
  };
}
