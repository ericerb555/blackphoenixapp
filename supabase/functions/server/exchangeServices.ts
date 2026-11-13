/**
 * The services we claim — and what happens to a request because of it.
 *
 * Eric: "if some is looking for services i offer then the requests will come
 * through me first then if i dont want it i will kick it to the open exchange.
 * if its not on the list for things i do then it will just go to the exchange
 * for bids."
 *
 * Every rule in that sentence forks on one thing — the list — and until this
 * file there was no list. `exchangeAssistant.weOfferSomething()` answered the
 * same question with a heuristic:
 *
 *     OWN_OFFER_SECTIONS = ["home-construction", "construction", "trades"]
 *
 * MEASURED 2026-11-13: not one of those three is a section slug in this
 * database. The real five are home-property (91 categories), services (41),
 * shops-retail (21), food (15) and entertainment (12). So that test has never
 * once returned true, and "do we offer this" has been decided entirely by the
 * `is_construction` flag — 71 of 180 categories. Every category under
 * `services` reads as not ours, including the ones Black Phoenix does.
 *
 * WHY THIS IS NOT `services-catalog.tsx`
 *
 * That file is a real, built, empty company service catalogue: name,
 * description, pricing type, base price. It is a SALES list — the things we
 * sell and what they cost — and its `category` is free text.
 *
 * This is a different question with a different key: which of the Exchange's
 * own 180 category SLUGS do we want first refusal on. Routing has to fork on a
 * slug, because that is what a resident's request resolves to. Storing that
 * answer in a priced catalogue would mean inventing a price for a box somebody
 * only wanted to tick, and reading it back through a free-text field that
 * nothing constrains to a real category.
 *
 * Two lists is a cost, and it is the right one. If they ever need to meet, the
 * meeting point is a slug on a catalogue entry, not this file reading prices.
 *
 * NOTHING CHANGES UNTIL SOMEBODY TICKS A BOX. An unconfigured list falls back
 * to the construction flag, so today's behaviour is exactly today's behaviour
 * until a decision is recorded. The same property the labour burden has, for
 * the same reason: a default that looks plausible is how a system starts
 * routing work nobody asked it to route.
 */

/** How long a request we claim is held before it opens to the exchange. */
export const FIRST_REFUSAL_HOURS = 24;

export interface ClaimRecord {
  /** Exchange category slugs we take first refusal on. */
  slugs?: unknown;
  /**
   * True once somebody has actually saved a decision.
   *
   * Distinguishes "nobody has been to the screen" from "somebody went and
   * ticked nothing". The first inherits the old behaviour; the second is a
   * decision that every request goes straight to the exchange, and must not
   * be quietly overridden by a fallback.
   */
  configured?: boolean;
  updatedAt?: string;
  updatedBy?: string;
}

export interface CategoryFacts {
  slug: string;
  /** The database's own flag, used only when no list has been saved. */
  isConstruction?: boolean | null;
}

const clean = (raw: unknown): string => String(raw ?? '').trim().toLowerCase();

/** The claimed slugs, normalised and de-duplicated. */
export function claimedSlugs(record: ClaimRecord | null | undefined): Set<string> {
  const raw = Array.isArray(record?.slugs) ? record!.slugs : [];
  const out = new Set<string>();
  for (const entry of raw) {
    const slug = clean(entry);
    if (slug) out.add(slug);
  }
  return out;
}

/** Has anybody actually decided, as opposed to never having looked? */
export function isConfigured(record: ClaimRecord | null | undefined): boolean {
  if (!record) return false;
  if (record.configured === true) return true;
  // A record carrying slugs is a decision whatever the flag says — a list that
  // arrived from an older writer should not be ignored for want of a boolean.
  return claimedSlugs(record).size > 0;
}

/**
 * Do we offer this?
 *
 * The saved list is the authority. Before there is one, the construction flag
 * stands in — which is exactly what the system does today, so switching this
 * on changes nothing until a box is ticked.
 */
export function weOffer(
  category: CategoryFacts | null | undefined,
  record: ClaimRecord | null | undefined,
): boolean {
  const slug = clean(category?.slug);
  if (!slug) return false;
  if (isConfigured(record)) return claimedSlugs(record).has(slug);
  return category?.isConstruction === true;
}

export type Route = 'first-refusal' | 'open-exchange';

export interface RoutingDecision {
  route: Route;
  /** Hours Black Phoenix holds it before it releases itself. Zero when open. */
  holdHours: number;
  /** Why, in a sentence a person can read on a screen. */
  reason: string;
  /** True when the answer came from the saved list rather than the fallback. */
  fromList: boolean;
}

/**
 * Where a request goes the moment it arrives.
 *
 * ON THE LIST means it is held for Black Phoenix for 24 hours and then
 * releases ITSELF. The timer is the part worth defending: a request nobody
 * opened is a customer who hears nothing, which is worse than a job going to a
 * competitor — so the absence of a decision is itself a decision.
 *
 * OFF THE LIST goes straight out. Holding work we do not do helps nobody and
 * costs a day.
 *
 * This decides only the FORK. Who sees it on release — every paid subscriber
 * in that trade within radius — is the bid room's business, and the radius is
 * the service-area setting that already exists.
 */
export function routeFor(
  category: CategoryFacts | null | undefined,
  record: ClaimRecord | null | undefined,
): RoutingDecision {
  const fromList = isConfigured(record);
  if (weOffer(category, record)) {
    return {
      route: 'first-refusal',
      holdHours: FIRST_REFUSAL_HOURS,
      reason: fromList
        ? `On your list, so it is yours for ${FIRST_REFUSAL_HOURS} hours before it opens to the exchange.`
        : `Flagged as construction work, so it is yours for ${FIRST_REFUSAL_HOURS} hours. Tick the categories you want to make this deliberate.`,
      fromList,
    };
  }
  return {
    route: 'open-exchange',
    holdHours: 0,
    reason: fromList
      ? 'Not on your list, so it goes straight out for bids.'
      : 'Not flagged as construction work, so it goes straight out for bids.',
    fromList,
  };
}

/**
 * When a held request releases itself.
 *
 * Returned as an instant rather than a duration so a caller stores a deadline
 * and not a countdown — a countdown has to be recomputed by whoever reads it,
 * and two readers disagreeing about when a job opened is the kind of argument
 * that ends with a customer being told two different things.
 */
export function releasesAt(heldFrom: string | number | Date, hours = FIRST_REFUSAL_HOURS): string {
  const start = heldFrom instanceof Date ? heldFrom.getTime() : new Date(heldFrom).getTime();
  const base = Number.isFinite(start) ? start : Date.now();
  return new Date(base + hours * 3600_000).toISOString();
}

/** Has a held request run out of time? */
export function hasReleased(releaseAt: string | number | Date, now: Date = new Date()): boolean {
  const due = releaseAt instanceof Date ? releaseAt.getTime() : new Date(releaseAt).getTime();
  if (!Number.isFinite(due)) return false;   // an unreadable deadline is not an expiry
  return now.getTime() >= due;
}
