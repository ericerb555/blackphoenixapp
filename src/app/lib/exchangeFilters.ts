/**
 * Phoenix Exchange — the decisions behind what a person sees.
 *
 * Kept out of the page so they can be tested directly. Everything here is pure:
 * given the same requests and the same filter state it returns the same list,
 * with no clock, no network and no React. The one exception is a `now`
 * parameter, which is passed in rather than read, so a countdown can be tested
 * without waiting for time to pass.
 */

export type RequestStatus = 'draft' | 'open' | 'closed' | 'awarded' | 'cancelled';

export interface ExchangeRequest {
  id: string;
  org_id: string;
  title: string;
  description: string | null;
  trade: string | null;
  status: RequestStatus;
  site_address: string | null;
  budget_low: number | null;
  budget_high: number | null;
  due_at: string | null;
  created_at: string;
  // Added by migration 011. Optional throughout, because the page has to keep
  // working against a database where that migration has not been applied yet.
  is_emergency?: boolean | null;
  latitude?: number | null;
  longitude?: number | null;
  first_refusal_until?: string | null;
  first_refusal_org_id?: string | null;
}

export interface ExchangeBid {
  id: string;
  bid_request_id: string;
  org_id: string;
  status: string;
  amount: number | null;
}

export interface Coords { latitude: number; longitude: number }

export interface ExchangeFilters {
  query: string;
  trades: string[];
  statuses: RequestStatus[];
  budgetMin: number | null;
  budgetMax: number | null;
  /** Miles. Null means distance is not being filtered on. */
  radiusMiles: number | null;
  dueWithinDays: number | null;
  emergencyOnly: boolean;
  withMediaOnly: boolean;
}

export const EMPTY_FILTERS: ExchangeFilters = {
  query: '',
  trades: [],
  statuses: [],
  budgetMin: null,
  budgetMax: null,
  radiusMiles: null,
  dueWithinDays: null,
  emergencyOnly: false,
  withMediaOnly: false,
};

export type SortKey = 'newest' | 'due' | 'budget-high' | 'budget-low' | 'distance' | 'most-bids';

// ── distance ─────────────────────────────────────────────────────────────────

const EARTH_MILES = 3958.7613;
const rad = (d: number) => (d * Math.PI) / 180;

/**
 * Great-circle miles between two points, or null when either is unknown.
 *
 * Mirrors `bid_request_distance_miles()` in migration 011 so a radius means the
 * same thing whether it was applied in SQL or here.
 */
export function milesBetween(a: Partial<Coords> | null, b: Partial<Coords> | null): number | null {
  const aLat = a?.latitude, aLng = a?.longitude, bLat = b?.latitude, bLng = b?.longitude;
  if (!isFiniteNumber(aLat) || !isFiniteNumber(aLng) || !isFiniteNumber(bLat) || !isFiniteNumber(bLng)) {
    return null;
  }
  const cos =
    Math.cos(rad(aLat)) * Math.cos(rad(bLat)) * Math.cos(rad(bLng) - rad(aLng)) +
    Math.sin(rad(aLat)) * Math.sin(rad(bLat));
  // Floating point can push this a hair past 1 for identical points, and
  // Math.acos of 1.0000000002 is NaN.
  const clamped = Math.min(1, Math.max(-1, cos));
  return Math.round(EARTH_MILES * Math.acos(clamped) * 10) / 10;
}

function isFiniteNumber(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}

export function requestDistance(request: ExchangeRequest, origin: Coords | null): number | null {
  if (!origin) return null;
  return milesBetween(
    { latitude: request.latitude ?? undefined, longitude: request.longitude ?? undefined },
    origin,
  );
}

// ── deadlines ────────────────────────────────────────────────────────────────

export interface Countdown {
  text: string;
  urgent: boolean;
  expired: boolean;
  /** Hours remaining, or null when there is no deadline. */
  hoursLeft: number | null;
}

export function countdown(due: string | null | undefined, now: number = Date.now()): Countdown {
  if (!due) return { text: 'No deadline', urgent: false, expired: false, hoursLeft: null };
  const ms = new Date(due).getTime() - now;
  if (!Number.isFinite(ms)) return { text: 'No deadline', urgent: false, expired: false, hoursLeft: null };

  const hoursLeft = ms / 3_600_000;
  if (ms <= 0) return { text: 'Closed', urgent: true, expired: true, hoursLeft };

  if (hoursLeft < 1) {
    const mins = Math.max(1, Math.round(ms / 60_000));
    return { text: `${mins} min left`, urgent: true, expired: false, hoursLeft };
  }
  if (hoursLeft < 24) {
    return { text: `${Math.floor(hoursLeft)}h left`, urgent: true, expired: false, hoursLeft };
  }
  const days = Math.floor(hoursLeft / 24);
  return {
    text: days === 1 ? '1 day left' : `${days} days left`,
    urgent: days <= 3,
    expired: false,
    hoursLeft,
  };
}

// ── first refusal ────────────────────────────────────────────────────────────

export interface FirstRefusal {
  /** True while the window is still running. */
  active: boolean;
  /** True when a window was set and has since passed. */
  lapsed: boolean;
  holderOrgId: string | null;
  text: string;
}

/**
 * Black Phoenix's exclusive window on a job before it reaches everyone else.
 *
 * Never claimed and expired are deliberately different answers. "Open to all
 * providers" and "was exclusive until Tuesday, now open" tell a subcontractor
 * different things about how long the work has been sitting there.
 */
export function firstRefusal(request: ExchangeRequest, now: number = Date.now()): FirstRefusal {
  const until = request.first_refusal_until;
  if (!until) {
    return { active: false, lapsed: false, holderOrgId: null, text: 'Open to all providers' };
  }
  const ms = new Date(until).getTime() - now;
  if (!Number.isFinite(ms)) {
    return { active: false, lapsed: false, holderOrgId: null, text: 'Open to all providers' };
  }
  if (ms > 0) {
    const hours = Math.ceil(ms / 3_600_000);
    return {
      active: true,
      lapsed: false,
      holderOrgId: request.first_refusal_org_id ?? null,
      text: hours < 24 ? `First refusal — ${hours}h remaining` : `First refusal — ${Math.ceil(hours / 24)} days remaining`,
    };
  }
  return {
    active: false,
    lapsed: true,
    holderOrgId: request.first_refusal_org_id ?? null,
    text: 'First refusal lapsed — open to all',
  };
}

// ── bid spread ───────────────────────────────────────────────────────────────

export interface BidSpread {
  count: number;
  low: number | null;
  high: number | null;
  median: number | null;
  /** High minus low, or null when fewer than two priced bids exist. */
  range: number | null;
}

/**
 * Only bids carrying a real number are counted.
 *
 * A declined bid has no amount by construction (see the check constraint in
 * migration 003), and a withdrawn one should not drag the low down after the
 * provider has walked away.
 */
export function bidSpread(bids: ExchangeBid[]): BidSpread {
  const priced = bids
    .filter(b => b.status !== 'withdrawn' && b.status !== 'declined')
    .map(b => b.amount)
    .filter(isFiniteNumber)
    .sort((a, b) => a - b);

  if (!priced.length) return { count: 0, low: null, high: null, median: null, range: null };

  const mid = Math.floor(priced.length / 2);
  const median = priced.length % 2 === 0 ? (priced[mid - 1] + priced[mid]) / 2 : priced[mid];

  return {
    count: priced.length,
    low: priced[0],
    high: priced[priced.length - 1],
    median,
    range: priced.length > 1 ? priced[priced.length - 1] - priced[0] : null,
  };
}

// ── search and filtering ─────────────────────────────────────────────────────

export function matchesQuery(request: ExchangeRequest, rawQuery: string): boolean {
  const q = rawQuery.trim().toLowerCase();
  if (!q) return true;
  // Every word must appear somewhere, so "roof salem" narrows rather than widens.
  const haystack = [request.title, request.trade, request.site_address, request.description]
    .filter(Boolean).join(' ').toLowerCase();
  return q.split(/\s+/).every(word => haystack.includes(word));
}

/**
 * Does this request's budget overlap the band being asked for?
 *
 * Overlap, not containment. A job budgeted $8k–$15k is a real answer to
 * "show me work over $10k", and requiring containment would hide it.
 */
function budgetOverlaps(request: ExchangeRequest, min: number | null, max: number | null): boolean {
  if (min == null && max == null) return true;
  const low = request.budget_low, high = request.budget_high;
  // A request with no budget stated cannot be excluded on budget — that would
  // silently bury every job posted without one.
  if (!isFiniteNumber(low) && !isFiniteNumber(high)) return true;
  const rLow = isFiniteNumber(low) ? low : (isFiniteNumber(high) ? high : 0);
  const rHigh = isFiniteNumber(high) ? high : (isFiniteNumber(low) ? low : 0);
  if (min != null && rHigh < min) return false;
  if (max != null && rLow > max) return false;
  return true;
}

export function applyFilters(
  requests: ExchangeRequest[],
  filters: ExchangeFilters,
  options: { origin?: Coords | null; mediaCounts?: Record<string, number>; now?: number } = {},
): ExchangeRequest[] {
  const { origin = null, mediaCounts = {}, now = Date.now() } = options;

  return requests.filter(r => {
    if (!matchesQuery(r, filters.query)) return false;
    if (filters.trades.length && !filters.trades.includes(String(r.trade || '').toLowerCase())) return false;
    if (filters.statuses.length && !filters.statuses.includes(r.status)) return false;
    if (!budgetOverlaps(r, filters.budgetMin, filters.budgetMax)) return false;
    if (filters.emergencyOnly && !r.is_emergency) return false;
    if (filters.withMediaOnly && !(mediaCounts[r.id] > 0)) return false;

    if (filters.dueWithinDays != null) {
      const c = countdown(r.due_at, now);
      // No deadline is not "due within 7 days", and neither is an expired one.
      if (c.hoursLeft == null || c.expired) return false;
      if (c.hoursLeft > filters.dueWithinDays * 24) return false;
    }

    if (filters.radiusMiles != null) {
      const miles = requestDistance(r, origin);
      // A request with no coordinates cannot be shown to satisfy a radius.
      // Including it would claim a job is nearby when nobody knows where it is.
      if (miles == null || miles > filters.radiusMiles) return false;
    }

    return true;
  });
}

export function sortRequests(
  requests: ExchangeRequest[],
  key: SortKey,
  options: { origin?: Coords | null; bidCounts?: Record<string, number> } = {},
): ExchangeRequest[] {
  const { origin = null, bidCounts = {} } = options;
  const list = [...requests];

  // Emergencies lead every ordering. That is the point of an emergency lane —
  // a sort by budget must not bury a burst pipe under a kitchen remodel.
  const emergencyFirst = (a: ExchangeRequest, b: ExchangeRequest) =>
    Number(!!b.is_emergency) - Number(!!a.is_emergency);

  const byKey: Record<SortKey, (a: ExchangeRequest, b: ExchangeRequest) => number> = {
    newest: (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    due: (a, b) => {
      // Requests with no deadline sink, rather than sorting as though due now.
      const av = a.due_at ? new Date(a.due_at).getTime() : Infinity;
      const bv = b.due_at ? new Date(b.due_at).getTime() : Infinity;
      return av - bv;
    },
    'budget-high': (a, b) => (b.budget_high ?? b.budget_low ?? -Infinity) - (a.budget_high ?? a.budget_low ?? -Infinity),
    'budget-low': (a, b) => (a.budget_low ?? a.budget_high ?? Infinity) - (b.budget_low ?? b.budget_high ?? Infinity),
    distance: (a, b) => {
      const av = requestDistance(a, origin) ?? Infinity;
      const bv = requestDistance(b, origin) ?? Infinity;
      return av - bv;
    },
    'most-bids': (a, b) => (bidCounts[b.id] || 0) - (bidCounts[a.id] || 0),
  };

  return list.sort((a, b) => emergencyFirst(a, b) || byKey[key](a, b));
}

// ── presets ──────────────────────────────────────────────────────────────────

export interface FilterPreset {
  id: string;
  label: string;
  description: string;
  filters: Partial<ExchangeFilters>;
  sort?: SortKey;
}

/**
 * The searches worth one click.
 *
 * Each is a real question somebody asks on this screen, not a demonstration of
 * the filter system.
 */
export const BUILT_IN_PRESETS: FilterPreset[] = [
  {
    id: 'emergency',
    label: 'Emergency',
    description: 'Work that cannot wait',
    filters: { emergencyOnly: true, statuses: ['open'] },
    sort: 'due',
  },
  {
    id: 'closing-soon',
    label: 'Closing soon',
    description: 'Bids due within three days',
    filters: { dueWithinDays: 3, statuses: ['open'] },
    sort: 'due',
  },
  {
    id: 'nearby',
    label: 'Within 50 miles',
    description: 'Inside the home radius',
    filters: { radiusMiles: 50, statuses: ['open'] },
    sort: 'distance',
  },
  {
    id: 'big-jobs',
    label: 'Over $25k',
    description: 'The work worth clearing a week for',
    filters: { budgetMin: 25000, statuses: ['open'] },
    sort: 'budget-high',
  },
  {
    id: 'has-media',
    label: 'Has photos',
    description: 'Enough detail to price properly',
    filters: { withMediaOnly: true, statuses: ['open'] },
    sort: 'newest',
  },
];

export function applyPreset(preset: FilterPreset): ExchangeFilters {
  return { ...EMPTY_FILTERS, ...preset.filters };
}

/** How many filters are actually narrowing the list — drives the "3" on the button. */
export function activeFilterCount(f: ExchangeFilters): number {
  let n = 0;
  if (f.trades.length) n++;
  if (f.statuses.length) n++;
  if (f.budgetMin != null || f.budgetMax != null) n++;
  if (f.radiusMiles != null) n++;
  if (f.dueWithinDays != null) n++;
  if (f.emergencyOnly) n++;
  if (f.withMediaOnly) n++;
  // The search box is visible on its own and is not counted here — showing
  // "1 filter" because somebody typed a word reads as a bug.
  return n;
}
