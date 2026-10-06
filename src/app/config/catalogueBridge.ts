/**
 * catalogueBridge.ts — let the catalogue overrule the shipped price list.
 *
 * U6 of `tasks/plan-catalogue-unification.md`, and P8 of the marketing plan,
 * for the public pricing page. `subscriptionPlans.ts` ships a full ladder for
 * ten categories; the catalogue holds whatever an administrator has actually
 * published. Where both have an opinion the catalogue wins, because it is the
 * thing Stripe bills against.
 *
 * SAFE WHILE THE CATALOGUE IS EMPTY, WHICH IS TODAY
 *
 * A tier is only allowed to overrule when it exists AND carries a price above
 * zero. With nothing published, every plan comes back byte-identical to what it
 * ships as — so this can land before the catalogue is seeded without changing a
 * single figure on a public page.
 *
 * THE RUNG NAMES COLLIDE, AND THAT IS THE DANGEROUS PART
 *
 * The shipped plans are `starter | professional | enterprise`. The catalogue
 * ladder Eric approved is `basic | advanced | professional`. **"Professional"
 * exists in both and means different rungs** — the middle one in the catalogue,
 * the top one in the config. Mapping those by name would quietly price the top
 * plan at the middle rung's figure, on a public page, with nothing visibly
 * wrong. So the mapping is explicit, one-directional, and tested.
 */

/** Config tier → the catalogue rung that actually corresponds to it. */
export const RUNG_FOR_TIER: Record<string, 'basic' | 'advanced' | 'professional'> = {
  starter: 'basic',
  professional: 'advanced',
  enterprise: 'professional',
};

/**
 * Plan category → catalogue audience.
 *
 * Absent entries are deliberate rather than missing. `construction` and
 * `demolition` look like customer sub-categories rather than audiences — the
 * unification plan says that is Eric's call, not a mechanical one — and
 * `territory-owner` has no catalogue audience at all because no market
 * comparable was found for it, so no ladder was agreed. A category with no
 * audience keeps its shipped prices, which is the right answer for "nobody has
 * decided yet".
 */
export const AUDIENCE_FOR_CATEGORY: Record<string, string> = {
  customer: 'customer',
  vendor: 'vendor',
  subcontractor: 'subcontractor',
  advertiser: 'advertiser',
  investor: 'investor',
  'property-management': 'property_manager',
};

export interface CatalogueTier {
  id: string;
  priceCents?: number;
  name?: string;
  active?: boolean;
}

export interface PricedPlan {
  id: string;
  category: string;
  tier: string;
  regularPrice: number;
  foundingPrice: number;
  [key: string]: unknown;
}

/** What the catalogue said about one plan, for a caller that wants to show it. */
export interface Applied {
  plan: PricedPlan;
  /** True when a catalogue price replaced the shipped one. */
  fromCatalogue: boolean;
}

/**
 * The founding discount, preserved as a RATIO rather than recomputed at 30%.
 *
 * Several shipped plans are not exactly 30% off — rounding, and a few set
 * deliberately. Recomputing would silently re-price those; keeping each plan's
 * own ratio means a catalogue rise moves the founding price by the same
 * proportion the plan always had.
 */
export function foundingRatio(plan: PricedPlan): number {
  const regular = Number(plan.regularPrice) || 0;
  const founding = Number(plan.foundingPrice) || 0;
  if (regular <= 0 || founding <= 0) return 0.7;
  return Math.min(1, founding / regular);
}

/**
 * Apply the catalogue to one plan.
 *
 * Returns the plan untouched when there is nothing published for it, which is
 * the common case and must stay the cheap one.
 */
export function applyCatalogue(
  plan: PricedPlan,
  tiersByAudience: Record<string, CatalogueTier[]>,
): Applied {
  const audience = AUDIENCE_FOR_CATEGORY[String(plan.category)];
  const rung = RUNG_FOR_TIER[String(plan.tier)];
  if (!audience || !rung) return { plan, fromCatalogue: false };

  const tier = (tiersByAudience[audience] || []).find((t) => String(t?.id) === rung);
  const cents = Number(tier?.priceCents) || 0;
  // A withdrawn tier, or one with no price, has nothing to say about what this
  // plan costs — and treating zero as a price would publish a free plan.
  if (!tier || tier.active === false || cents <= 0) return { plan, fromCatalogue: false };

  const regularPrice = Math.round(cents / 100);
  return {
    plan: {
      ...plan,
      regularPrice,
      foundingPrice: Math.round(regularPrice * foundingRatio(plan)),
    },
    fromCatalogue: true,
  };
}

/** Apply it to a whole list, reporting how many figures the catalogue decided. */
export function applyCatalogueToAll(
  plans: PricedPlan[],
  tiersByAudience: Record<string, CatalogueTier[]>,
): { plans: PricedPlan[]; fromCatalogue: number } {
  let fromCatalogue = 0;
  const out = plans.map((plan) => {
    const applied = applyCatalogue(plan, tiersByAudience);
    if (applied.fromCatalogue) fromCatalogue += 1;
    return applied.plan;
  });
  return { plans: out, fromCatalogue };
}

/** The audiences worth fetching, so a page makes six requests rather than ten. */
export function audiencesFor(plans: PricedPlan[]): string[] {
  const wanted = new Set<string>();
  for (const plan of plans) {
    const audience = AUDIENCE_FOR_CATEGORY[String(plan.category)];
    if (audience) wanted.add(audience);
  }
  return [...wanted];
}
