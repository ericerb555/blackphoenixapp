/**
 * Phoenix Exchange — what a business covers, and whether a request falls in it.
 *
 * Pure functions, no database. Everything here is a rule that has to mean the
 * same thing in the routing engine, in search ranking, in the business portal
 * and in the nightly recruitment job, so it is written once and tested rather
 * than re-derived in four places with four slightly different answers.
 *
 * The three rules that matter:
 *
 *   COVERAGE IS CATEGORY × DISTANCE. A business declares which categories it
 *   does and how far it will travel. Matching is the intersection, and both
 *   halves have to be true.
 *
 *   A BUSINESS HOLDS CATEGORIES, A REQUEST NAMES A SERVICE. Holding "Roofing"
 *   brings every leaf under it — replacement, repair, gutters, skylights — so
 *   a request for `roof-repair` matches an org that holds `roofing`. This is
 *   the distinction that makes an allowance of five categories generous
 *   rather than absurd, and it is the easiest one to get wrong.
 *
 *   NO COORDINATES MEANS NO MATCH. A business with no location is not
 *   everywhere, it is unknown. Matching it into everything would bury
 *   customers in quotes from companies two states away and bury the business
 *   in work it cannot reach. Nothing is lost by failing closed: an
 *   unclassified or unmatched request in Black Phoenix's own territory
 *   reaches Black Phoenix as supplier of last resort, and every unmatched
 *   search is a row in the demand ledger, which is the recruitment list.
 */

/**
 * Five categories are included, five more can be bought, and nobody holds
 * eleven at any price — the ceiling exists to protect match quality, and an
 * upsell that defeats it is worse than no upsell.
 *
 * Mirrored by a check constraint on `organizations.category_allowance` and by
 * the `organization_category` trigger, because a limit that lives only in
 * application code is a limit until somebody is in a hurry.
 */
export const INCLUDED_CATEGORIES = 5;
export const MAX_CATEGORIES = 10;

/** Miles. Matches `bid_request_distance_miles()` in migration 011. */
const EARTH_RADIUS_MILES = 3958.7613;

export interface Coords {
  lat: number | null | undefined;
  lng: number | null | undefined;
}

export interface OrgCoverage {
  orgId: string;
  /** Category ids the business holds. Categories, never service leaves. */
  categoryIds: readonly string[];
  serviceLat: number | null | undefined;
  serviceLng: number | null | undefined;
  serviceRadiusMiles: number | null | undefined;
  /** 'operator' is Black Phoenix itself and is exempt from the allowance. */
  type?: string | null;
  categoryAllowance?: number | null;
}

export interface RequestTarget {
  /** The service leaf the request resolved to, where it resolved at all. */
  categoryId: string | null | undefined;
  /** That leaf's parent category. Null when the target IS a category. */
  parentCategoryId?: string | null;
  lat: number | null | undefined;
  lng: number | null | undefined;
}

// ── distance ─────────────────────────────────────────────────────────────────

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

/**
 * Great-circle miles between two points, or null when either is unknown.
 *
 * Null rather than Infinity on purpose: "we do not know how far" and "it is
 * very far" are different facts, and only one of them is worth telling
 * somebody about.
 */
export function distanceMiles(a: Coords, b: Coords): number | null {
  if (!isFiniteNumber(a?.lat) || !isFiniteNumber(a?.lng)) return null;
  if (!isFiniteNumber(b?.lat) || !isFiniteNumber(b?.lng)) return null;
  if (Math.abs(a.lat) > 90 || Math.abs(b.lat) > 90) return null;
  if (Math.abs(a.lng) > 180 || Math.abs(b.lng) > 180) return null;

  const toRad = (d: number) => (d * Math.PI) / 180;
  const cos = Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) *
    Math.cos(toRad(b.lng) - toRad(a.lng)) +
    Math.sin(toRad(a.lat)) * Math.sin(toRad(b.lat));

  // Floating point can push this a hair outside [-1, 1] for coincident
  // points, and acos would then return NaN for a distance of zero.
  const clamped = Math.min(1, Math.max(-1, cos));
  return Math.round(EARTH_RADIUS_MILES * Math.acos(clamped) * 10) / 10;
}

// ── coverage ─────────────────────────────────────────────────────────────────

/**
 * Does this business do this kind of work?
 *
 * True when it holds the request's own category, or the category that the
 * requested service sits under.
 */
export function coversCategory(org: OrgCoverage, target: RequestTarget): boolean {
  if (!target?.categoryId) return false;
  const held = new Set(org?.categoryIds ?? []);
  if (held.size === 0) return false;
  if (held.has(target.categoryId)) return true;
  return Boolean(target.parentCategoryId && held.has(target.parentCategoryId));
}

/**
 * Is this request inside the distance the business will travel?
 *
 * False when either end has no coordinates, and false when the business has
 * declared no radius — an undeclared radius is not an infinite one.
 */
export function coversDistance(org: OrgCoverage, target: RequestTarget): boolean {
  const radius = org?.serviceRadiusMiles;
  if (!isFiniteNumber(radius) || radius <= 0) return false;

  const miles = distanceMiles(
    { lat: org.serviceLat, lng: org.serviceLng },
    { lat: target?.lat, lng: target?.lng },
  );
  if (miles === null) return false;

  return miles <= radius;
}

/** Both halves, which is what "covers" means. */
export function covers(org: OrgCoverage, target: RequestTarget): boolean {
  return coversCategory(org, target) && coversDistance(org, target);
}

/**
 * Why a business did not match, for the audit trail.
 *
 * The first time a member asks "why did I never see that job", the answer has
 * to exist and be specific. "Out of range" and "you do not hold that
 * category" are different conversations, and "we do not know where you are"
 * is a third one that is fixable in thirty seconds.
 */
export type CoverageMiss =
  | "covered"
  | "category"
  | "no_location"
  | "no_radius"
  | "out_of_range"
  | "unresolved_request";

export function explainCoverage(org: OrgCoverage, target: RequestTarget): CoverageMiss {
  if (!target?.categoryId) return "unresolved_request";
  if (!coversCategory(org, target)) return "category";

  const radius = org?.serviceRadiusMiles;
  if (!isFiniteNumber(radius) || radius <= 0) return "no_radius";

  const miles = distanceMiles(
    { lat: org.serviceLat, lng: org.serviceLng },
    { lat: target.lat, lng: target.lng },
  );
  if (miles === null) return "no_location";

  return miles <= radius ? "covered" : "out_of_range";
}

/** Everyone who covers it, nearest first. Ties keep their input order. */
export function matchingOrgs<T extends OrgCoverage>(
  orgs: readonly T[],
  target: RequestTarget,
): T[] {
  return orgs
    .filter((org) => covers(org, target))
    .map((org, index) => ({
      org,
      index,
      miles: distanceMiles(
        { lat: org.serviceLat, lng: org.serviceLng },
        { lat: target.lat, lng: target.lng },
      ) ?? Number.POSITIVE_INFINITY,
    }))
    .sort((a, b) => (a.miles - b.miles) || (a.index - b.index))
    .map((row) => row.org);
}

// ── the category allowance ───────────────────────────────────────────────────

/**
 * How many categories this business may hold.
 *
 * Black Phoenix's own service catalogue is the same `organization_category`
 * rows — one object, so routing and first refusal can never disagree about
 * what the company does — and it is not a purchased allowance, so the
 * operator is exempt. Only the operator.
 */
export function allowanceFor(org: Pick<OrgCoverage, "type" | "categoryAllowance">): number {
  if (org?.type === "operator") return Number.POSITIVE_INFINITY;
  const declared = org?.categoryAllowance;
  if (!isFiniteNumber(declared)) return INCLUDED_CATEGORIES;
  return Math.min(Math.max(Math.trunc(declared), 0), MAX_CATEGORIES);
}

export interface AllowanceState {
  held: number;
  allowance: number;
  /** Still free within what they are entitled to. */
  remaining: number;
  /** More they could buy before hitting the ceiling. */
  purchasable: number;
  atCeiling: boolean;
}

/**
 * What the portal shows all the way through the trial — "12 of 5 included ·
 * 10 maximum" — rather than springing it at conversion.
 *
 * The trial includes everything, so a general contractor may hold fifteen
 * categories for six months and then have to come down. Saying so from the
 * first day is the difference between a trial ending as advertised and a
 * capability being taken away, and the second one is how a populated platform
 * turns into a revolt.
 */
export function allowanceState(
  org: Pick<OrgCoverage, "type" | "categoryAllowance">,
  held: number,
): AllowanceState {
  const allowance = allowanceFor(org);
  const count = Math.max(0, Math.trunc(held) || 0);

  if (!Number.isFinite(allowance)) {
    return {
      held: count,
      allowance: Number.POSITIVE_INFINITY,
      remaining: Number.POSITIVE_INFINITY,
      purchasable: 0,
      atCeiling: false,
    };
  }

  return {
    held: count,
    allowance,
    remaining: Math.max(0, allowance - count),
    purchasable: Math.max(0, MAX_CATEGORIES - allowance),
    atCeiling: allowance >= MAX_CATEGORIES,
  };
}

export type AllowanceRefusal = "ok" | "allowance_reached" | "ceiling_reached" | "not_a_category";

/**
 * May this business add one more?
 *
 * `isLeaf` is passed in rather than looked up because this module does not
 * touch the database; the caller knows it from the category row it already
 * read. A leaf is refused outright — a business holds categories and gets
 * every service under them for nothing.
 */
export function canAddCategory(
  org: Pick<OrgCoverage, "type" | "categoryAllowance">,
  held: number,
  isLeaf: boolean,
): AllowanceRefusal {
  if (isLeaf) return "not_a_category";

  const allowance = allowanceFor(org);
  if (!Number.isFinite(allowance)) return "ok";

  const count = Math.max(0, Math.trunc(held) || 0);
  if (count < allowance) return "ok";
  return allowance >= MAX_CATEGORIES ? "ceiling_reached" : "allowance_reached";
}

// ── phrases ──────────────────────────────────────────────────────────────────

/**
 * The normalised form of a search phrase.
 *
 * MUST agree with `exchange_normalise_phrase()` in the taxonomy migration,
 * because the unique index on aliases is built on the SQL version. If these
 * two ever disagree, a phrase looked up here misses an alias that is sitting
 * right there in the table, and the only symptom is a model call that did not
 * need to happen and a search that feels worse.
 */
export function normalisePhrase(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const out = input.toLowerCase().replace(/\s+/g, " ").trim();
  return out === "" ? null : out;
}
