/**
 * Add-ons that are rungs of a ladder rather than separate extras.
 *
 * WHY THIS EXISTS
 *
 * `addOnIds` is a flat list. Nothing in it says two add-ons are alternatives,
 * so nothing stopped an account holding Solo *and* Studio *and* Agency and
 * being billed for all three — three recurring Stripe line items for one
 * product, each a real charge on a real card. And with no removal path, an
 * upgrade from Solo to Studio could not drop Solo either in our records or in
 * Stripe, so "upgrading" meant paying for both.
 *
 * A `group` says these are alternatives. `groupRank` says which way is up.
 *
 * WHY RANK IS EXPLICIT AND NOT INFERRED FROM PRICE
 *
 * Because price is not always the ladder. An annual rung can cost more than a
 * dearer monthly one, a promotional rung can undercut the one below it, and a
 * rung whose price is being changed in Stripe is momentarily whatever it is
 * mid-edit. Inferring the ladder from the price means the ladder reorders
 * itself when somebody edits a number, silently, and what it reorders is which
 * of a customer's subscriptions gets cancelled. So it is stated.
 */

export interface GroupedAddOn {
  id: string;
  group?: string;
  groupRank?: number;
  name?: string;
}

const idOf = (a: { id?: string } | null | undefined) => String(a?.id ?? '').trim();
const groupOf = (a: GroupedAddOn | null | undefined) => String(a?.group ?? '').trim();
const rankOf = (a: GroupedAddOn | null | undefined) => {
  const n = Number(a?.groupRank);
  return Number.isFinite(n) ? n : 0;
};

/**
 * Which add-ons buying this one replaces.
 *
 * Only ones actually BOUGHT are returned. An add-on the tier includes has no
 * subscription item behind it, so there is nothing to cancel — and trying to
 * "remove" it would be attempting to take away something the plan grants.
 *
 * Returns an empty list for an add-on in no group, which is every add-on in
 * production today, so this changes nothing until a ladder is authored.
 */
export function supersededIds(
  addOn: GroupedAddOn | null | undefined,
  catalogue: Array<GroupedAddOn | null | undefined>,
  boughtIds: string[] = [],
): string[] {
  const group = groupOf(addOn);
  const id = idOf(addOn);
  if (!group || !id) return [];

  const bought = new Set((boughtIds || []).map((x) => String(x ?? '').trim()).filter(Boolean));

  return (catalogue || [])
    .filter((a): a is GroupedAddOn => Boolean(a) && groupOf(a) === group && idOf(a) !== id)
    .map(idOf)
    .filter((other) => other && bought.has(other));
}

/**
 * The add-ons that actually count, with each ladder collapsed to one rung.
 *
 * Needed wherever held add-ons are totalled — limits especially. Without it an
 * account that had somehow ended up holding two rungs (bought one, granted the
 * other by a tier's `includedAddOns`) would have both their allowances summed,
 * which is not what a ladder means and would quietly hand out capacity nobody
 * sold.
 *
 * The highest rank wins. Ties keep the first seen, so the caller's order is the
 * tie-break and the result is stable rather than arbitrary.
 */
export function applicableAddOns<T extends GroupedAddOn>(
  addOns: Array<T | null | undefined>,
): T[] {
  const out: T[] = [];
  const bestInGroup = new Map<string, number>(); // group -> index into out

  for (const addOn of addOns || []) {
    if (!addOn || !idOf(addOn)) continue;
    const group = groupOf(addOn);

    if (!group) { out.push(addOn); continue; }

    const at = bestInGroup.get(group);
    if (at === undefined) {
      bestInGroup.set(group, out.push(addOn) - 1);
      continue;
    }
    if (rankOf(addOn) > rankOf(out[at])) out[at] = addOn;
  }
  return out;
}

/**
 * A sentence for the buyer saying what this replaces, or null.
 *
 * Worth saying out loud at the moment of purchase. Somebody moving from Solo
 * to Studio should be told Solo is ending and that they are credited for the
 * rest of the month, rather than discovering one line gone and another
 * appeared when the invoice arrives.
 */
export function supersedesMessage(
  addOn: GroupedAddOn | null | undefined,
  superseded: Array<GroupedAddOn | null | undefined>,
): string | null {
  const names = (superseded || [])
    .filter(Boolean)
    .map((a) => String(a!.name ?? idOf(a)).trim())
    .filter(Boolean);
  if (!names.length) return null;

  const list = names.length === 1
    ? names[0]
    : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;

  return `${String(addOn?.name ?? idOf(addOn))} replaces ${list}. `
    + `${names.length === 1 ? 'It is' : 'They are'} removed from your plan and `
    + `the unused part of the month is credited against your next invoice.`;
}
