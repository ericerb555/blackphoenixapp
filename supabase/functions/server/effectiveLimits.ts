/**
 * What an account's ceilings actually are, once its add-ons are counted.
 *
 * WHY THIS EXISTS
 *
 * `PlanAddOn.limits` has always been documented as *"the ceilings this raises
 * when it is on. Merged over the tier's own limits, so an add-on that grants
 * 500 more products is `{ products: 500 }` as a delta, not an absolute."*
 *
 * Nothing merged them. `aiSpend` read `tier.limits[key]` and `planLimits` read
 * `tier.limits`, and neither looked at a held add-on at all. Every add-on in
 * production carries `limits: {}`, which is why it had never mattered — but it
 * matters the moment anything is sold on its capacity rather than its access,
 * because without this an add-on is a charge that grants nothing.
 *
 * ZERO MEANS UNLIMITED, AND THAT IS THE WHOLE DIFFICULTY
 *
 * It is the convention the rest of the system already uses: the tier editor
 * says so under the limits box, and Stocked and Preferred both carry
 * `products: 0` while selling themselves as "unlimited catalogue products".
 *
 * So a plain `a + b` is wrong, and so is `Math.max`. Either would turn an
 * unlimited ceiling into a finite one the moment an account bought an extra —
 * a customer paying MORE and getting LESS, which is the worst direction for
 * this kind of bug because it looks like the purchase worked.
 */

/** A limits map as a tier or an add-on publishes it. */
export type Limits = Record<string, number>;

/** Zero, or anything below it, is the system's spelling for "no ceiling". */
export const isUnlimited = (value: unknown): boolean => {
  const n = Number(value);
  return Number.isFinite(n) && n <= 0;
};

/**
 * Merge one add-on's limits over a base.
 *
 * Per key:
 *
 *   - either side unlimited  -> unlimited. An add-on cannot take away a
 *                               ceiling the tier had already lifted, and an
 *                               add-on that grants unlimited grants it.
 *   - only one side names it -> that side's value. A key the tier never
 *                               published is not "zero of them", it is a key
 *                               the tier said nothing about, so the add-on
 *                               becomes what publishes it.
 *   - both finite            -> the SUM, because an add-on's figure is a delta.
 *                               That is what the type has always promised.
 *
 * Anything unreadable on the add-on side is ignored rather than guessed at:
 * a limits map that went round the editor should not be able to silently
 * widen or narrow an account.
 */
const mergeOne = (base: Limits, extra: Limits | null | undefined): Limits => {
  const out: Limits = { ...base };
  for (const [key, raw] of Object.entries(extra || {})) {
    const add = Number(raw);
    if (!Number.isFinite(add)) continue;

    if (isUnlimited(add)) { out[key] = 0; continue; }

    const current = out[key];
    if (current === undefined || current === null) { out[key] = add; continue; }
    if (isUnlimited(current)) continue; // already unlimited; leave it

    const now = Number(current);
    out[key] = Number.isFinite(now) ? now + add : add;
  }
  return out;
};

/**
 * The tier's ceilings raised by every add-on the account actually holds.
 *
 * The caller decides what "holds" means — `holdsAddOn` for access, or
 * `paysForAddOn` where it has to be something bought rather than borrowed for
 * the length of a trial. This function only does the arithmetic, so that the
 * entitlement question stays in one place and this stays testable.
 */
export function effectiveLimits(
  tierLimits: Limits | null | undefined,
  heldAddOns: Array<{ limits?: Limits | null } | null | undefined> = [],
): Limits {
  let out: Limits = {};
  for (const [key, raw] of Object.entries(tierLimits || {})) {
    const n = Number(raw);
    if (Number.isFinite(n)) out[key] = n;
  }
  for (const addOn of heldAddOns || []) {
    if (addOn) out = mergeOne(out, addOn.limits);
  }
  return out;
}

/**
 * One key's ceiling, in the shape `pickCeiling` takes.
 *
 * Returns `undefined` for a key nobody published, which is the distinction
 * that matters to it: absent means "fall back to the built-in backstop",
 * whereas zero means unlimited. Collapsing the two would either uncap an
 * account nobody meant to uncap or cap one that had bought its way out.
 */
export const effectiveLimit = (
  tierLimits: Limits | null | undefined,
  heldAddOns: Array<{ limits?: Limits | null } | null | undefined>,
  key: string,
): number | undefined => effectiveLimits(tierLimits, heldAddOns)[key];
