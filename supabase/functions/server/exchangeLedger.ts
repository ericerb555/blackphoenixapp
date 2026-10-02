/**
 * Phoenix Exchange — writing and reading the two ledgers.
 *
 * The schema and the reasoning are in `20261002132000_exchange_ledgers.sql`.
 * The short version: the lead ledger is what sells the subscription, and the
 * demand ledger is what turns the gaps in the directory into the list of
 * businesses to go after.
 *
 * TWO RULES THIS MODULE ENFORCES
 *
 * **Recording never breaks the thing being recorded.** Every writer swallows
 * its own failures. A search that works but is not counted is a lost row; a
 * search that fails because counting failed is a lost customer. The ledger is
 * the business model, but it is not worth a 500.
 *
 * **Counts go out, people never do.** `leadSummary` returns numbers. Nothing
 * here returns the identity of a resident to a business, and nothing should
 * be added that does — a non-member may be told how many people wanted them,
 * never who they were. That is a privacy line and it is also the conversion
 * lever: the count is free, the contact is what joining buys.
 */

export type LeadKind =
  | "viewed"
  | "revealed"
  | "called"
  | "website"
  | "messaged"
  | "requested"
  | "quoted"
  | "awarded";

export interface LeadEvent {
  orgId: string;
  kind: LeadKind;
  categoryId?: string | null;
  actorUserId?: string | null;
  requestRef?: string | null;
  /** 'search' · 'profile' · 'map' · 'category' · 'alert' · 'blog' */
  surface?: string | null;
  occurredAt?: string | null;
  meta?: Record<string, unknown>;
}

export interface DemandEvent {
  phrase?: string | null;
  categoryId?: string | null;
  sectionSlug?: string | null;
  territorySlug?: string | null;
  lat?: number | null;
  lng?: number | null;
  radiusMiles?: number | null;
  resultsCount?: number | null;
  /** 'contacted' · 'requested' · 'abandoned' · 'reported_missing' */
  outcome?: string | null;
  actorUserId?: string | null;
  occurredAt?: string | null;
  meta?: Record<string, unknown>;
}

function leadRow(event: LeadEvent) {
  return {
    org_id: event.orgId,
    kind: event.kind,
    category_id: event.categoryId ?? null,
    actor_user_id: event.actorUserId ?? null,
    request_ref: event.requestRef ?? null,
    surface: event.surface ?? null,
    ...(event.occurredAt ? { occurred_at: event.occurredAt } : {}),
    meta: event.meta ?? {},
  };
}

/**
 * Record one contact. Returns whether it landed, and never throws.
 *
 * Callers are welcome to ignore the result — most should, because there is
 * nothing useful to do about a lost row in the middle of serving somebody.
 */
export async function recordLead(sb: any, event: LeadEvent): Promise<boolean> {
  if (!sb || !event?.orgId || !event?.kind) return false;
  try {
    const { error } = await sb.from("exchange_lead_event").insert(leadRow(event));
    if (error) {
      console.error("[exchange] lead not recorded:", error.message);
      return false;
    }
    return true;
  } catch (e: any) {
    console.error("[exchange] lead not recorded:", e?.message || e);
    return false;
  }
}

/**
 * Record several at once — one request reaching five businesses is five
 * leads, and that is one insert rather than five round trips.
 */
export async function recordLeads(sb: any, events: readonly LeadEvent[]): Promise<number> {
  if (!sb || !Array.isArray(events)) return 0;
  const rows = events.filter((e) => e?.orgId && e?.kind).map(leadRow);
  if (rows.length === 0) return 0;
  try {
    const { error } = await sb.from("exchange_lead_event").insert(rows);
    if (error) {
      console.error("[exchange] leads not recorded:", error.message);
      return 0;
    }
    return rows.length;
  } catch (e: any) {
    console.error("[exchange] leads not recorded:", e?.message || e);
    return 0;
  }
}

/**
 * Record a search — including, and especially, one that found nothing.
 *
 * A zero-result search in a territory is the single most valuable row in the
 * system: it is a business that should exist here and does not, which is a
 * sales call with a real number attached.
 */
export async function recordDemand(sb: any, event: DemandEvent): Promise<boolean> {
  if (!sb || !event) return false;
  try {
    const { error } = await sb.from("exchange_demand_event").insert({
      phrase: event.phrase ?? null,
      category_id: event.categoryId ?? null,
      section_slug: event.sectionSlug ?? null,
      territory_slug: event.territorySlug ?? null,
      search_lat: event.lat ?? null,
      search_lng: event.lng ?? null,
      radius_miles: event.radiusMiles ?? null,
      results_count: Math.max(0, Math.trunc(event.resultsCount ?? 0) || 0),
      outcome: event.outcome ?? null,
      actor_user_id: event.actorUserId ?? null,
      ...(event.occurredAt ? { occurred_at: event.occurredAt } : {}),
      meta: event.meta ?? {},
    });
    if (error) {
      console.error("[exchange] demand not recorded:", error.message);
      return false;
    }
    return true;
  } catch (e: any) {
    console.error("[exchange] demand not recorded:", e?.message || e);
    return false;
  }
}

// ── reading it back ──────────────────────────────────────────────────────────

export type LeadTotals = Record<LeadKind, number> & { total: number };

const EMPTY_TOTALS: LeadTotals = {
  viewed: 0, revealed: 0, called: 0, website: 0,
  messaged: 0, requested: 0, quoted: 0, awarded: 0,
  total: 0,
};

/**
 * Count the rows. Pure, so the arithmetic that a business will check against
 * their own phone log is testable without a database.
 */
export function tallyLeads(rows: readonly { kind?: string }[] | null | undefined): LeadTotals {
  const totals: LeadTotals = { ...EMPTY_TOTALS };
  for (const row of rows ?? []) {
    const kind = row?.kind as LeadKind | undefined;
    if (kind && kind in totals) {
      totals[kind] += 1;
      totals.total += 1;
    }
  }
  return totals;
}

/**
 * The sentence that converts a trial.
 *
 * Nobody buys software. They buy *"you received 34 enquiries here last month
 * and won nine of them."* It is written from the ledger rather than from
 * marketing copy, which is why it has to be true — a business can check the
 * website clicks against their own analytics and the calls against their own
 * phone, and once one number checks out they believe the rest.
 *
 * Returns null when there is nothing worth claiming. Silence is better than
 * "you received 0 enquiries", and far better than rounding one view up into
 * an achievement.
 */
export function conversionSentence(totals: LeadTotals, period = "last month"): string | null {
  const enquiries = totals.messaged + totals.requested + totals.called;
  const reach = totals.viewed + totals.revealed + totals.website;

  const parts: string[] = [];
  if (enquiries > 0) {
    parts.push(`${enquiries} ${enquiries === 1 ? "enquiry" : "enquiries"}`);
  } else if (reach > 0) {
    parts.push(`${reach} ${reach === 1 ? "person" : "people"} looked you up`);
  } else {
    return null;
  }

  if (totals.awarded > 0) {
    parts.push(`won ${totals.awarded} ${totals.awarded === 1 ? "job" : "jobs"}`);
  } else if (totals.quoted > 0) {
    parts.push(`quoted on ${totals.quoted}`);
  }

  return `${parts.join(", ")} ${period}.`;
}

/**
 * What one business got, over a window. Numbers only.
 */
export async function leadSummary(
  sb: any,
  orgId: string,
  since: string,
): Promise<LeadTotals> {
  if (!sb || !orgId) return { ...EMPTY_TOTALS };
  try {
    const { data, error } = await sb
      .from("exchange_lead_event")
      .select("kind")
      .eq("org_id", orgId)
      .gte("occurred_at", since);
    if (error) {
      console.error("[exchange] lead summary failed:", error.message);
      return { ...EMPTY_TOTALS };
    }
    return tallyLeads(data);
  } catch (e: any) {
    console.error("[exchange] lead summary failed:", e?.message || e);
    return { ...EMPTY_TOTALS };
  }
}

export interface DemandGap {
  categoryId: string | null;
  territorySlug: string | null;
  searches: number;
  phrases: string[];
}

/**
 * The nightly recruitment worklist: what people asked for here and did not
 * find, most wanted first.
 *
 * Grouped in code rather than in SQL because the grouping will change as the
 * product learns what makes a good sales call, and a view is a migration
 * every time it does.
 */
export function rankDemandGaps(
  rows: readonly {
    category_id?: string | null;
    territory_slug?: string | null;
    phrase?: string | null;
  }[] | null | undefined,
  limit = 25,
): DemandGap[] {
  const byKey = new Map<string, DemandGap>();

  for (const row of rows ?? []) {
    const categoryId = row?.category_id ?? null;
    const territorySlug = row?.territory_slug ?? null;
    const key = `${territorySlug ?? "-"}::${categoryId ?? "-"}`;

    const gap = byKey.get(key) ?? { categoryId, territorySlug, searches: 0, phrases: [] };
    gap.searches += 1;
    // A handful of the actual words, because "47 people asked for this" lands
    // harder with two of their phrases beside it.
    if (row?.phrase && gap.phrases.length < 5 && !gap.phrases.includes(row.phrase)) {
      gap.phrases.push(row.phrase);
    }
    byKey.set(key, gap);
  }

  return [...byKey.values()]
    .sort((a, b) => b.searches - a.searches)
    .slice(0, Math.max(0, limit));
}

export async function demandGaps(
  sb: any,
  options: { territorySlug?: string | null; since: string; limit?: number },
): Promise<DemandGap[]> {
  if (!sb) return [];
  try {
    let query = sb
      .from("exchange_demand_event")
      .select("category_id, territory_slug, phrase")
      .eq("results_count", 0)
      .gte("occurred_at", options.since);

    if (options.territorySlug) query = query.eq("territory_slug", options.territorySlug);

    const { data, error } = await query.limit(5000);
    if (error) {
      console.error("[exchange] demand gaps failed:", error.message);
      return [];
    }
    return rankDemandGaps(data, options.limit ?? 25);
  } catch (e: any) {
    console.error("[exchange] demand gaps failed:", e?.message || e);
    return [];
  }
}
