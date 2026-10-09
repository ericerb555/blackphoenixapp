/**
 * retiredAudiences.ts — audiences that may no longer hold a sellable tier.
 *
 * WHY THIS EXISTS
 *
 * `content` is still a full member of the `Audience` union, and it has to be:
 * three `plan_tier:content:*` records exist in the live catalogue, and the
 * types that read the catalogue must be able to describe what is in it.
 * Removing the union member would make the stored rows unreadable rather than
 * unsellable, which is the wrong direction.
 *
 * But Eric ruled on 2026-09-28 that the content centre is bought **on top of**
 * the portal an account already has, not as a portal of its own. That ruling
 * was carried out — `contentAddOns.ts` wrote eighteen `plan_addon` records,
 * three rungs across the six audiences he named, and they are in production.
 * What the ruling did not do is remove the three tiers it replaced.
 *
 * So the catalogue now holds the same product twice: once correctly as an
 * add-on, and once as a portal ladder nobody can be on. Solo $79, Studio $199
 * and Agency $499 sit there `active: false`, with no Stripe price, looking
 * exactly like three tiers waiting to be switched on. `POST /plan-tiers/content`
 * would accept an edit to any of them from any administrator, and the first
 * person to tidy the catalogue by setting `active: true` would publish a portal
 * subscription for a portal that does not exist.
 *
 * Leaving the rows and refusing the writes is deliberate. Deleting live
 * catalogue records is Eric's call, not a side effect of a guard; and the guard
 * is what makes the rows harmless either way, so it is worth having even after
 * they go.
 *
 * WHERE IT IS ENFORCED
 *
 * In the route handler, both halves:
 *
 *   - the admin write path refuses, naming the add-on to use instead;
 *   - the public read path returns nothing for a retired audience, so a row
 *     flipped to `active` by hand or by a future migration still reaches no
 *     pricing page.
 *
 * The second is the one that matters. A refusal on the write path alone would
 * leave the hazard one direct KV edit away, and the public route is what a
 * customer actually sees.
 */

/** Audience → why it may not hold a tier, in words a person can act on. */
export const RETIRED_TIER_AUDIENCES: Record<string, string> = {
  content:
    'The content centre is sold as an add-on bought on top of a portal the account '
    + 'already has, not as a portal of its own. Publish it as '
    + 'plan_addon:{audience}:content-solo, content-studio or content-agency instead — '
    + 'it is already seeded for vendor, subcontractor, advertiser, condo_association, '
    + 'property_manager and landlord.',
};

/**
 * May this audience hold a sellable tier?
 *
 * Flat `{ retired, reason }` rather than a discriminated union: this server
 * compiles without `strictNullChecks`, so narrowing on a tag does not actually
 * narrow and a caller would read `reason` off the allowed branch.
 */
export function retiredTierAudience(audience: unknown): { retired: boolean; reason: string } {
  const key = String(audience ?? '').trim();
  const reason = Object.prototype.hasOwnProperty.call(RETIRED_TIER_AUDIENCES, key)
    ? RETIRED_TIER_AUDIENCES[key]
    : '';
  return { retired: Boolean(reason), reason };
}

/** Audiences that still sell tiers, for a list shown to a person. */
export function sellableAudiences(all: readonly string[]): string[] {
  return (Array.isArray(all) ? all : []).filter((a) => !retiredTierAudience(a).retired);
}
