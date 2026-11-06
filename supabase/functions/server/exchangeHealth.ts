/**
 * Phoenix Exchange — is it running properly, and what needs doing?
 *
 * Eric: "a control page for the phoenix exchange where i can make sure its
 * running properly with all the functions and monitor what people are
 * looking for and an ai assistant to make sure its performing" — and then:
 * "i want it to tell me and the ai what needs to be done and the ai can fix
 * it and give me the option if needed to approve it there."
 *
 * ─────────────────────────────────────────────────────────────────────────
 * THE MODEL NEVER DECIDES WHAT TO EXECUTE
 * ─────────────────────────────────────────────────────────────────────────
 *
 * This file produces the findings and, where there is one, the fix. Every
 * fix is a member of a closed union written below, with its parameters
 * already filled in from real data. The assistant's job is to read this
 * list, explain it in plain language and say which to do first.
 *
 * That split is the whole safety design, and it is not a style preference.
 * A model that can name its own actions can name one that was never
 * reviewed — and this system publishes directories, creates territories
 * that are sold as exclusive, and writes rows about real businesses who
 * never asked to be listed. If the executable set is closed and comes from
 * code, a hallucination produces a wrong SENTENCE, which somebody notices,
 * rather than a wrong ACTION, which nobody does.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * WHAT MAY RUN WITHOUT ASKING
 * ─────────────────────────────────────────────────────────────────────────
 *
 * Only what is reversible, invisible to customers, and already happening on
 * a clock anyway. Compiling the next due town is exactly what the scheduler
 * does every hour, so doing it on demand changes nothing a customer sees.
 *
 * Everything that creates inventory, or puts something in front of a
 * customer, asks first — because those two are the ones that cost money or
 * reputation when they are wrong, and neither is undone by pressing the
 * button again.
 *
 * No imports: the rules that decide what an operator is told to do are worth
 * testing without a database.
 */

export type Severity = 'critical' | 'warning' | 'info';

/**
 * Every fix the control page can perform. CLOSED ON PURPOSE.
 *
 * Adding one is a deliberate act with a test, not something the assistant
 * can reach for. There is no 'run arbitrary query', no 'edit listing', and
 * there never will be from this surface.
 */
export type ActionKind =
  | 'run-upkeep-now'      // compile the next due town — what the clock does hourly
  | 'discover-county'     // ask OSM what towns exist; writes nothing
  | 'add-towns'           // create territories — INVENTORY
  | 'publish-town'        // hidden -> visible — CUSTOMER FACING
  | 'open-review-list';   // navigation only

export interface Action {
  kind: ActionKind;
  label: string;
  params: Record<string, unknown>;
  /** 'auto' may run on one press. 'ask' requires explicit approval first. */
  approval: 'auto' | 'ask';
  /** Shown beside the approval prompt. Absent for 'auto'. */
  whyApproval?: string;
}

export interface Finding {
  /** Stable across runs, so a dismissal or a note can be attached to it. */
  id: string;
  severity: Severity;
  title: string;
  detail: string;
  action?: Action;
}

/* ── thresholds, each with the reason it is that number ──────────────────── */

/**
 * Hours of silence before the clock is presumed stopped.
 *
 * It ticks hourly, and a tick with nothing due still records a run saying
 * so. Twenty-six hours is therefore about twenty-six missed ticks — long
 * past coincidence, and tolerant of one deploy or one slow night.
 */
export const CLOCK_SILENT_HOURS = 26;

/**
 * Listings a hidden town needs before it is worth showing anybody.
 *
 * `exchangeTerritoryRoutes` puts it plainly: "A town with nine businesses
 * reads as a broken product rather than a new one." Twenty is the first
 * number that looks like a directory rather than a sample.
 */
export const PUBLISH_MIN_LISTINGS = 20;

/** Searches for a thing we cannot supply before it is worth recruiting one. */
export const DEMAND_MIN_SEARCHES = 5;

/** Towns below this and the map is too small to sell territories from. */
export const COVERAGE_THIN_BELOW = 10;

export interface HealthInput {
  secretConfigured: boolean;
  refusedRecently: number;
  failedRecently: number;
  /** Most recent run, or null if there has never been one. */
  lastRunAt: string | null;
  territories: Array<{
    slug: string;
    name: string;
    status?: string | null;
    listings?: number | null;
    lastCompiledAt?: string | null;
  }>;
  demand: Array<{ category: string | null; town: string | null; searches: number }>;
  /** Listings flagged by the liveness check as missing for several runs. */
  needsReview: number;
  now?: string;
}

const hoursSince = (iso: string | null | undefined, now: number): number | null => {
  if (!iso) return null;
  const t = Date.parse(String(iso));
  return Number.isFinite(t) ? (now - t) / 3_600_000 : null;
};

/**
 * Everything wrong, everything worth doing, worst first.
 *
 * Ordered by severity and then by the order the checks are written, which
 * is deliberate: a stopped clock is read before a thin directory, because a
 * thin directory is a consequence and the clock is a cause.
 */
export function assessExchange(input: HealthInput): Finding[] {
  const now = Date.parse(input?.now || new Date().toISOString());
  const out: Finding[] = [];
  const towns = Array.isArray(input?.territories) ? input.territories : [];

  /* ── the clock ─────────────────────────────────────────────────────── */

  if (!input?.secretConfigured) {
    out.push({
      id: 'clock.no-secret',
      severity: 'critical',
      title: 'The upkeep clock has no secret, so every tick is refused',
      detail: 'Nothing is being compiled and nothing will be. pg_cron records each refused tick as '
        + '"succeeded" because it got an HTTP response, so this fails silently. Create the secret: '
        + "insert into private_cron_config (key, value) values ('exchange_cron_secret', "
        + "encode(gen_random_bytes(32), 'hex'));",
      // No action. This is a database secret and nothing reachable from a web
      // page should be able to mint or change the credential that guards a
      // route which rewrites the directory.
    });
  } else if ((Number(input.refusedRecently) || 0) > 0) {
    out.push({
      id: 'clock.refused',
      severity: 'critical',
      title: `${input.refusedRecently} tick(s) were refused`,
      detail: 'A secret exists but the one the scheduler sends does not match it, so the clock is '
        + 'running and being turned away every time. Re-create the secret and re-apply the schedule '
        + 'migration so both sides hold the same value.',
    });
  }

  const silent = hoursSince(input?.lastRunAt, now);
  if (silent === null) {
    out.push({
      id: 'clock.never-run',
      severity: 'critical',
      title: 'The upkeep clock has never run',
      detail: 'There is no record of a single tick. Either the schedule was never applied to the '
        + 'database, or every tick is being refused before it can record anything.',
    });
  } else if (silent > CLOCK_SILENT_HOURS) {
    out.push({
      id: 'clock.silent',
      severity: 'critical',
      title: `Nothing has run for ${Math.floor(silent)} hours`,
      detail: 'The clock ticks hourly and records a run even when nothing is due, so this long a '
        + 'silence means it is not firing at all.',
      action: {
        kind: 'run-upkeep-now',
        label: 'Run one tick now',
        params: {},
        approval: 'auto',
      },
    });
  }

  if ((Number(input?.failedRecently) || 0) >= 3) {
    out.push({
      id: 'clock.failing',
      severity: 'warning',
      title: `${input.failedRecently} recent runs failed`,
      detail: 'Usually OpenStreetMap refusing under load, which is expected and self-correcting — a '
        + 'failed town keeps its place at the front of the queue. Worth a look only if it persists '
        + 'for days.',
      action: { kind: 'run-upkeep-now', label: 'Try one now', params: {}, approval: 'auto' },
    });
  }

  /* ── the map ───────────────────────────────────────────────────────── */

  const uncompiled = towns.filter((t) => !t.lastCompiledAt);
  if (uncompiled.length) {
    out.push({
      id: 'map.uncompiled',
      severity: 'info',
      title: `${uncompiled.length} town(s) have never been compiled`,
      detail: `${uncompiled.slice(0, 5).map((t) => t.name).join(', ')}`
        + `${uncompiled.length > 5 ? ` and ${uncompiled.length - 5} more` : ''}. `
        + 'The clock takes a never-compiled town ahead of every stale one, so these fill first — '
        + 'one per hour.',
      action: { kind: 'run-upkeep-now', label: 'Fill one now', params: {}, approval: 'auto' },
    });
  }

  if (towns.length < COVERAGE_THIN_BELOW) {
    out.push({
      id: 'map.thin',
      severity: 'warning',
      title: `Only ${towns.length} town(s) on the map`,
      detail: 'Territories are sold by town, so coverage is the inventory. Pulling a county lists '
        + 'every municipality in it in one call; nothing is created until you choose.',
      action: {
        kind: 'discover-county',
        label: 'Find the towns in a county',
        params: { state: 'NH' },
        // Writes nothing at all — it is a read against OpenStreetMap.
        approval: 'auto',
      },
    });
  }

  const ready = towns.filter(
    (t) => String(t.status || '') === 'hidden' && (Number(t.listings) || 0) >= PUBLISH_MIN_LISTINGS,
  );
  for (const town of ready) {
    out.push({
      id: `map.publish.${town.slug}`,
      severity: 'info',
      title: `${town.name} has ${town.listings} listings and is still hidden`,
      detail: 'It holds enough to read as a directory rather than a sample. Publishing puts it in '
        + 'front of the public.',
      action: {
        kind: 'publish-town',
        label: `Publish ${town.name}`,
        params: { slug: town.slug },
        approval: 'ask',
        whyApproval: 'This makes the town visible to the public, including every business compiled '
          + 'into it who never asked to be listed. Whether it is ready is a judgement, not a count.',
      },
    });
  }

  /* ── what the listings are worth ───────────────────────────────────── */

  if ((Number(input?.needsReview) || 0) > 0) {
    out.push({
      id: 'listings.review',
      severity: 'warning',
      title: `${input.needsReview} listing(s) may have closed`,
      detail: 'Each has been absent from several complete runs of its town. Nothing has been deleted '
        + 'or hidden — they are flagged for somebody to look at, because a business missing from '
        + 'OpenStreetMap has not necessarily shut.',
      action: {
        kind: 'open-review-list',
        label: 'Review them',
        params: {},
        approval: 'auto',
      },
    });
  }

  /* ── what people are looking for and not finding ───────────────────── */

  const gaps = (Array.isArray(input?.demand) ? input.demand : [])
    .filter((g) => (Number(g?.searches) || 0) >= DEMAND_MIN_SEARCHES)
    .sort((a, b) => (Number(b.searches) || 0) - (Number(a.searches) || 0));

  for (const gap of gaps.slice(0, 5)) {
    const what = gap.category || 'something we could not classify';
    const where = gap.town ? ` in ${gap.town}` : '';
    out.push({
      /* Keyed on the pair, so the same gap is the same finding next week and
         a note attached to it survives. */
      id: `demand.${(gap.category || 'unclassified')}.${gap.town || 'anywhere'}`
        .toLowerCase().replace(/[^a-z0-9.]+/g, '-'),
      severity: 'info',
      title: `${gap.searches} searches for ${what}${where} found nothing`,
      detail: 'Real residents looked for this and the directory had no answer. This is the '
        + 'recruitment list — every one is a business worth signing up, and a territory worth more '
        + 'once it is.',
      // No action: recruiting somebody is not something software does.
    });
  }

  const order: Record<Severity, number> = { critical: 0, warning: 1, info: 2 };
  return out.sort((a, b) => order[a.severity] - order[b.severity]);
}

/** One line for the top of the page. */
export function describeHealth(findings: Finding[]): string {
  const all = Array.isArray(findings) ? findings : [];
  const critical = all.filter((f) => f.severity === 'critical').length;
  const warning = all.filter((f) => f.severity === 'warning').length;
  if (critical) return `${critical} thing(s) stopping the Exchange working.`;
  if (warning) return `Running, with ${warning} thing(s) worth attention.`;
  if (all.length) return `Running. ${all.length} suggestion(s).`;
  return 'Running, with nothing outstanding.';
}

/** The fixes that may be applied without asking, in the order to do them. */
export function autoActions(findings: Finding[]): Finding[] {
  return (Array.isArray(findings) ? findings : [])
    .filter((f) => f.action && f.action.approval === 'auto');
}

/** The fixes that need a person to say yes. */
export function approvalActions(findings: Finding[]): Finding[] {
  return (Array.isArray(findings) ? findings : [])
    .filter((f) => f.action && f.action.approval === 'ask');
}
