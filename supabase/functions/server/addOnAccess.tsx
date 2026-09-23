/**
 * addOnAccess — does this account hold a given extra, right now?
 *
 * WHY THIS IS ITS OWN MODULE
 *
 * Because the answer decides whether we turn out at three in the morning, and
 * that question is going to be asked from several places: the on-call routing,
 * the screen that offers a rota, the paging step. One place that resolves it
 * means those cannot disagree, and it means the rule lives next to its reason
 * rather than being re-derived from a grant's fields each time.
 *
 * IT FAILS CLOSED, UNLIKE planLimits
 *
 * `planLimits` deliberately allows an account it cannot place, because refusing
 * would lock existing vendors out of catalogues they are already using. This is
 * the opposite case. Nobody has on-call today, so there is nothing to break by
 * saying no, and the failure modes are not symmetric: wrongly allowing it means
 * promising an emergency service that has not been paid for and has no rota
 * behind it, which is discovered by somebody standing in a flooded basement.
 *
 * So an account we cannot resolve does not hold the add-on, and the reason is
 * logged rather than guessed at.
 */
import * as kv from "./kv_store.tsx";
import {
  holdsAddOn, heldAddOnIds, holdsOnCallFeature,
  ON_CALL_ADD_ON_ID, ON_CALL_ANSWERED_ADD_ON_ID,
  type FeatureGrant, type PlanTier,
} from "./planTier.ts";

export interface AddOnVerdict {
  held: boolean;
  /** Every extra this account holds, bought or included. */
  addOnIds: string[];
  tierId: string | null;
  /** Why not, for the log rather than the customer. Null when held. */
  reason: string | null;
}

const NOT_HELD = (reason: string): AddOnVerdict => ({
  held: false, addOnIds: [], tierId: null, reason,
});

/**
 * The grant and the tier it names, read together.
 *
 * Both are needed because an extra can be held two ways — bought alongside the
 * subscription, or included in the tier at no charge — and reading only the
 * grant would make the dearest plan look like the one that had paid for least.
 */
async function grantAndTier(
  email: string,
): Promise<{ grant: FeatureGrant | null; tier: PlanTier | null }> {
  const key = String(email || "").trim().toLowerCase();
  if (!key) return { grant: null, tier: null };
  let grant: any = null;
  try {
    grant = await kv.get(`feature_grant:${key}`);
  } catch {
    return { grant: null, tier: null };
  }
  if (!grant?.tierId || !grant?.portalType) return { grant, tier: null };
  try {
    const tier = (await kv.get(`plan_tier:${grant.portalType}:${grant.tierId}`)) as PlanTier | null;
    return { grant, tier: tier || null };
  } catch {
    return { grant, tier: null };
  }
}

/** Does this account hold this extra? */
export async function checkAddOn(email: string, addOnId: string): Promise<AddOnVerdict> {
  const id = String(addOnId || "").trim();
  if (!id) return NOT_HELD("no add-on named");

  const address = String(email || "").trim().toLowerCase();
  if (!address) return NOT_HELD("no account resolved");

  const { grant, tier } = await grantAndTier(address);
  if (!grant) return NOT_HELD("no grant for this account");

  const held = holdsAddOn(id, grant, tier);
  return {
    held,
    addOnIds: held ? heldAddOnIds(grant, tier) : [],
    tierId: grant.tierId ? String(grant.tierId) : null,
    reason: held ? null : `${address} does not hold ${id}`,
  };
}

/**
 * Does BLACK PHOENIX answer for this account?
 *
 * Deliberately the answered product and not the plain one. An account can
 * buy the on-call software, set up its own people, and never want us near
 * the phone — asking the wrong id here would have us turning out for
 * somebody who never paid us to, and charging them for it.
 */
export async function runsOurOnCall(email: string): Promise<AddOnVerdict> {
  const verdict = await checkAddOn(email, ON_CALL_ANSWERED_ADD_ON_ID);
  if (!verdict.held) {
    console.log(`[OnCall] not ours to answer: ${verdict.reason}`);
  }
  return verdict;
}

/**
 * May this account use on-call at all?
 *
 * Either product. This is what gates the setup screen and the rota; only
 * `runsOurOnCall` decides whose people turn out.
 */
export async function hasOnCallFeature(email: string): Promise<AddOnVerdict> {
  const address = String(email || "").trim().toLowerCase();
  if (!address) return NOT_HELD("no account resolved");

  const { grant, tier } = await grantAndTier(address);
  if (!grant) return NOT_HELD("no grant for this account");

  const held = holdsOnCallFeature(grant, tier);
  return {
    held,
    addOnIds: held ? heldAddOnIds(grant, tier) : [],
    tierId: grant.tierId ? String(grant.tierId) : null,
    reason: held ? null : `${address} holds neither on-call product`,
  };
}

export { ON_CALL_ADD_ON_ID, ON_CALL_ANSWERED_ADD_ON_ID };
