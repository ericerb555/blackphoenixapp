/**
 * The content centre, as add-ons.
 *
 * Eric's ruling on 2026-09-28: the content centre is bought **on top of the
 * portal an account already has**, not as a portal of its own. So Solo, Studio
 * and Agency stop being `plan_tier:content:*` — which nobody could ever reach,
 * because no account can be on the `content` audience — and become add-ons in
 * each buying audience's catalogue.
 *
 * WHAT THE SUBSCRIPTION ACTUALLY SELLS
 *
 * Not access to the content centre screen: `EnterpriseContentCenter` is gated
 * by nothing and anybody signed in can open it. What these sell is METERED
 * CAPACITY — model calls, renders, reels and seats — enforced by `aiSpend`
 * against a free backstop of 300 calls and 10 renders a month. So the limits
 * below are the product, and they are the reason `effectiveLimits` had to be
 * written first: until that existed, an add-on's limits were read by nothing
 * and this would have been a charge for nothing.
 *
 * WHY AGENCY SAYS `reelsPerMonth: 0` WHERE THE TIER SAID NOTHING
 *
 * The Agency tier published no `reelsPerMonth` key at all and sold "unlimited
 * reels" in its feature list — which worked only because `withinLimit` treats
 * an absent key as unmetered. As a DELTA that reading inverts: a key the
 * add-on does not publish is one the add-on says nothing about, so the account
 * would fall back to its own plan's ceiling, or to the backstop. Unlimited has
 * to be said out loud, and `0` is how this system says it.
 */

export type ContentRungId = 'content-solo' | 'content-studio' | 'content-agency';

/** The ladder. `groupRank` is stated so the order cannot drift with a price. */
export const CONTENT_GROUP = 'content';

interface RungSpec {
  id: ContentRungId;
  name: string;
  blurb: string;
  priceCents: number;
  groupRank: number;
  sortOrder: number;
  features: string[];
  limits: Record<string, number>;
}

/**
 * Carried across from the three `plan_tier:content:*` records verbatim.
 * Nothing is repriced and no ceiling is invented — the same rule the cohort
 * migration followed, and for the same reason.
 */
export const CONTENT_RUNGS: RungSpec[] = [
  {
    id: 'content-solo',
    name: 'Content Centre — Solo',
    blurb: 'One brand, one person, posting properly.',
    priceCents: 7900,
    groupRank: 1,
    sortOrder: 1,
    features: [
      '600 model calls a month — copy, captions, photo analysis',
      '40 generated images a month',
      '5 reels a month',
      '1 seat, one brand',
    ],
    limits: { seats: 1, reelsPerMonth: 5, aiCallsPerMonth: 600, rendersPerMonth: 40 },
  },
  {
    id: 'content-studio',
    name: 'Content Centre — Studio',
    blurb: 'Everything you need to keep one brand posting, without hiring an agency.',
    priceCents: 19900,
    groupRank: 2,
    sortOrder: 2,
    features: [
      '1,500 model calls a month — copy, captions, photo analysis',
      '150 generated images a month',
      '20 reels a month',
      '3 seats',
      'SEO engine',
    ],
    limits: { seats: 3, reelsPerMonth: 20, aiCallsPerMonth: 1500, rendersPerMonth: 150 },
  },
  {
    id: 'content-agency',
    name: 'Content Centre — Agency',
    blurb: 'For a team running content for several brands at once.',
    priceCents: 49900,
    groupRank: 3,
    sortOrder: 3,
    features: [
      'Everything in Studio',
      '5,000 model calls a month',
      '600 generated images a month',
      'Unlimited reels',
      '15 seats',
      'SEO engine across multiple sites',
      'White label',
    ],
    // `reelsPerMonth: 0` is unlimited, said explicitly — see the note above.
    limits: { seats: 15, reelsPerMonth: 0, aiCallsPerMonth: 5000, rendersPerMonth: 600 },
  },
];

/**
 * Who may buy it. Eric's list, 2026-09-28.
 *
 * `customer` is deliberately absent: the content centre is sold to businesses
 * that market themselves, not to the homeowners who buy construction work.
 * Staff are absent for a different reason — `aiSpend` exempts them from
 * metering entirely, so they already have it and have nothing to buy.
 */
export const CONTENT_AUDIENCES = [
  'vendor', 'subcontractor', 'advertiser',
  'condo_association', 'property_manager', 'landlord',
] as const;

export type ContentAudience = typeof CONTENT_AUDIENCES[number];

/** The KV key an add-on record lives at. */
export const addOnKey = (audience: string, id: string) => `plan_addon:${audience}:${id}`;

/**
 * One rung's record for one audience.
 *
 * `active: false`, deliberately. An add-on with no Stripe price cannot be
 * bought, and the three content tiers already carried the same flag with a
 * note saying "NOT SELLABLE until a Stripe price is created" — so this follows
 * the precedent rather than inventing a second convention. It also means these
 * eighteen records can be written and read over before anything is offered to
 * anybody. Prices come next, then the flag.
 *
 * No Stripe price id is written, invented or guessed. `isPurchasable` fails
 * closed without one, which is the behaviour wanted here.
 */
export function contentAddOn(rung: RungSpec, audience: string): Record<string, unknown> {
  return {
    id: rung.id,
    audience,
    name: rung.name,
    blurb: rung.blurb,
    features: [...rung.features],
    limits: { ...rung.limits },
    priceCents: rung.priceCents,
    interval: 'month',
    group: CONTENT_GROUP,
    groupRank: rung.groupRank,
    sortOrder: rung.sortOrder,
    active: false,
    /** Where it came from, so the retired tiers can be reconciled later. */
    sourceTierId: rung.id.replace(/^content-/, ''),
  };
}

/** Every record the seed would write: three rungs across six audiences. */
export function contentAddOnPlan(
  audiences: readonly string[] = CONTENT_AUDIENCES,
): Array<{ key: string; audience: string; record: Record<string, unknown> }> {
  const out: Array<{ key: string; audience: string; record: Record<string, unknown> }> = [];
  for (const audience of audiences) {
    for (const rung of CONTENT_RUNGS) {
      out.push({ key: addOnKey(audience, rung.id), audience, record: contentAddOn(rung, audience) });
    }
  }
  return out;
}

/**
 * Has somebody edited this record since it was seeded?
 *
 * The seed must never overwrite a price a person has changed or a Stripe id
 * they have created — re-running it after the prices exist would wipe them and
 * leave three rungs that cannot be bought, which is the failure this whole
 * exercise started from. Anything carrying a Stripe linkage, or whose price
 * differs from the spec, is left exactly as it is.
 */
export function wouldOverwriteEdits(existing: Record<string, unknown> | null | undefined): boolean {
  if (!existing) return false;
  if (String(existing.stripePriceId ?? '').trim()) return true;
  if (String(existing.stripePriceIdTest ?? '').trim()) return true;

  const spec = CONTENT_RUNGS.find((r) => r.id === String(existing.id ?? ''));
  if (spec && Number(existing.priceCents) !== spec.priceCents) return true;

  return false;
}
