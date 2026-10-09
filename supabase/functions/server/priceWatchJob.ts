/**
 * priceWatchJob.ts — the assistant that watches pricing and asks about it.
 *
 * Eric's words: *"ai assistant should be watching of of this and ping the owner
 * and admin if somehting needs to be changed and why."*
 *
 * HOW IT REPORTS, AND WHY IT IS NOT A NEW INBOX
 *
 * It registers as another job on the store autonomy clock and raises its
 * proposals as asks on the channel that already exists — the review screen and
 * the two-way ask/answer pair built for the store. A second place to look is a
 * place that stops being looked at (`automation-needs-a-report-and-a-way-to-ask`),
 * so there is deliberately no new one.
 *
 * WHAT IT MAY DO
 *
 * Read, and ask. It writes no price and could not: `priceWatchRules` returns
 * sentences, and this file turns them into questions. Whether the watcher may
 * ever move a price by itself once it has earned trust is question 3 in section
 * 15 of `tasks/price-ladders.md`, and it is Eric's to answer.
 *
 * WHAT IT WILL FIND TODAY
 *
 * Almost certainly nothing, and that is the correct result rather than a fault.
 * The catalogue holds one populated ladder, no cohort records exist, and the
 * sample thresholds in the rules refuse to read a signal out of three accounts.
 * It is built now so that it is already working when the numbers arrive, and
 * because the rules are the part worth getting right while nothing depends on
 * them.
 */
import * as kv from "./kv_store.tsx";
import { registerStoreJob, askForGuidance, withdrawAsk, type StoreJobContext, type StoreJobResult } from "./storeAutonomy.ts";
import { retiredTierAudience } from "./retiredAudiences.ts";
import {
  proposalsFor, summarise, DEFAULT_GUARDRAILS,
  type PriceSignals, type Proposal,
} from "./priceWatchRules.ts";

const TIER_PREFIX = "plan_tier:";
const GRANT_PREFIX = "feature_grant:";
const COHORT_PREFIX = "cohort_";
const FINDINGS_KEY = "price:watch:findings";

/** How a proposal is identified across ticks, so the same one is not asked twice. */
function dedupeKey(p: Proposal): string {
  return `price-watch:${p.id}:${p.kind}`;
}

/**
 * Trials and subscriptions per tier, counted from the grants.
 *
 * One pass over the grants rather than a query per tier: there is one record
 * per account and the alternative grows with the number of rungs multiplied by
 * the number of accounts, to answer a question about both.
 */
interface TierTally {
  subscribers: number;
  trialsEnded: number;
  trialsConverted: number;
}

async function tallyGrants(now: number): Promise<Map<string, TierTally>> {
  const out = new Map<string, TierTally>();
  const get = (key: string) => {
    if (!out.has(key)) out.set(key, { subscribers: 0, trialsEnded: 0, trialsConverted: 0 });
    return out.get(key)!;
  };

  let grants: any[] = [];
  try {
    grants = ((await kv.getByPrefix(GRANT_PREFIX)) as any[]) || [];
  } catch (err) {
    console.log("[price-watch] could not read the grants:", err);
    return out;
  }

  for (const grant of grants.filter(Boolean)) {
    const audience = String(grant?.portalType || "").trim();
    const tierId = String(grant?.tierId || "").trim();

    /**
     * A grant with a tierId is paying for that rung. A trial carries no tierId
     * at all — `subscription-shape-three-tiers-plus-addons` is explicit that a
     * trial is not a rung — so a trial can only be attributed to an audience,
     * not to a rung. Counted against the audience's entry rung, which is where
     * a trial lands when it converts, and left out entirely when the audience
     * is unknown rather than guessed at.
     */
    if (tierId && audience) {
      get(`${audience}:${tierId}`).subscribers += 1;
      // A grant that holds a tier and once held a trial is a conversion.
      if (grant?.trialEnd) get(`${audience}:${tierId}`).trialsConverted += 1;
      continue;
    }

    const trialEnd = Date.parse(String(grant?.trialEnd || ""));
    if (audience && Number.isFinite(trialEnd) && trialEnd < now) {
      // Ended, and never acquired a tier: a trial that did not convert.
      get(`${audience}:basic`).trialsEnded += 1;
    }
  }

  // trialsEnded has to include the ones that converted, or the rate is
  // computed against the failures alone and reads as zero per cent forever.
  for (const tally of out.values()) tally.trialsEnded += tally.trialsConverted;
  return out;
}

/**
 * Cancellations in the last month, per rung.
 *
 * Reads `subscription_cancellation:{iso}:{email}`, written by the Stripe
 * webhook when a subscription ends. Those rows exist because the grant could
 * not answer the question: it holds one state and is overwritten by the next
 * subscription, so a cancellation recorded only there disappears the moment the
 * account comes back.
 *
 * Keyed by ISO timestamp, so the month is readable from the key and a row that
 * is too old costs one string comparison rather than a parse.
 */
async function cancellationsLastMonth(now: number): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  const since = new Date(now - 30 * 86400000).toISOString();
  let rows: any[] = [];
  try {
    rows = ((await kv.getByPrefix("subscription_cancellation:")) as any[]) || [];
  } catch (err) {
    console.log("[price-watch] could not read the cancellations:", err);
    return out;
  }
  for (const row of rows.filter(Boolean)) {
    const at = String(row?.cancelledAt || "");
    if (!at || at < since) continue;
    const audience = String(row?.audience || "").trim();
    const tierId = String(row?.tierId || "").trim();
    if (!audience || !tierId) continue;
    const key = `${audience}:${tierId}`;
    out.set(key, (out.get(key) || 0) + 1);
  }
  return out;
}

/** Capacity, from the cohort that owns this rung if one exists. */
async function capacityFor(audience: string): Promise<{ total?: number; taken?: number }> {
  try {
    const cohorts = ((await kv.getByPrefix(COHORT_PREFIX)) as any[]) || [];
    const mine = cohorts.filter(Boolean).find((c: any) => String(c?.audience || "") === audience);
    if (!mine) return {};
    const total = Math.floor(Number(mine.totalSpots ?? mine.capacity ?? 0)) || 0;
    const remaining = Math.floor(Number(mine.spotsRemaining ?? NaN));
    if (!total) return {};
    return {
      total,
      taken: Number.isFinite(remaining) ? Math.max(0, total - remaining) : undefined,
    };
  } catch (err) {
    console.log("[price-watch] could not read the cohorts:", err);
    return {};
  }
}

async function priceWatchJob(ctx: StoreJobContext): Promise<StoreJobResult> {
  const now = Date.now();

  let tiers: any[] = [];
  try {
    tiers = (((await kv.getByPrefix(TIER_PREFIX)) as any[]) || []).filter(Boolean);
  } catch (err) {
    return { ran: false, detail: "could not read the plan catalogue", error: String(err) };
  }
  if (tiers.length === 0) {
    return { ran: false, detail: "the plan catalogue is empty, so there are no prices to watch" };
  }

  const tally = await tallyGrants(now);
  const cancellations = await cancellationsLastMonth(now);
  const capacityByAudience = new Map<string, { total?: number; taken?: number }>();

  const proposals: Proposal[] = [];
  for (const tier of tiers) {
    const audience = String(tier?.audience || "").trim();
    const id = String(tier?.id || "").trim();
    if (!audience || !id) continue;
    // A rung nobody can buy is not worth an opinion about its price.
    if (!(Number(tier?.priceCents) > 0)) continue;
    /**
     * Nor is a ladder that has been retired as a portal.
     *
     * The three `plan_tier:content:*` records still carry $79, $199 and $499,
     * so without this the watcher would treat a withdrawn product as a live
     * rung and could propose moving a price that sells nothing — and the ask
     * would arrive in the queue reading exactly like a real one.
     */
    if (retiredTierAudience(audience).retired) continue;

    if (!capacityByAudience.has(audience)) capacityByAudience.set(audience, await capacityFor(audience));
    const capacity = capacityByAudience.get(audience) || {};
    const counts = tally.get(`${audience}:${id}`);

    const signals: PriceSignals = {
      id: `plan_tier:${audience}:${id}`,
      audience,
      rung: String(tier?.name || id),
      priceCents: Math.round(Number(tier.priceCents) || 0),
      lastChangedAt: tier?.priceChangedAt || tier?.updatedAt || tier?.createdAt || null,
      spotsTotal: capacity.total,
      spotsTaken: capacity.taken,
      subscribers: counts?.subscribers,
      cancelledLastMonth: cancellations.get(`${audience}:${id}`),
      trialsEnded: counts?.trialsEnded,
      trialsConverted: counts?.trialsConverted,
      /**
       * Deliberately unset: add-on attach, and the labour floor.
       *
       * Add-ons are not purchasable yet, so nothing can have been attached, and
       * the labour floor needs quoted hours per rung which do not exist. The
       * rules skip a signal they were not given, so these stay absent rather
       * than estimated — an invented figure would be the most confident wrong
       * number on the screen.
       *
       * Churn used to be in this list. It is read now, because the webhook
       * records what was cancelled instead of only that something was.
       */
    };

    proposals.push(...proposalsFor(signals, DEFAULT_GUARDRAILS, now));
  }

  /**
   * Raise one ask per proposal, and withdraw the ones that no longer hold.
   *
   * A proposal that has stopped being true has to disappear by itself. A band
   * that filled up and then emptied again would otherwise leave "raise this
   * price, it is 90% full" sitting in the queue, and an ask that is wrong by
   * the time it is read is worse than no ask: it teaches somebody to ignore the
   * screen.
   */
  const live = new Set(proposals.map(dedupeKey));
  let previous: string[] = [];
  try {
    previous = ((await kv.get(FINDINGS_KEY)) as string[]) || [];
  } catch { previous = []; }

  for (const stale of previous.filter((k) => !live.has(k))) {
    try { await withdrawAsk("price-watch", stale); } catch (err) { console.log("[price-watch] could not withdraw", stale, err); }
  }

  for (const p of proposals) {
    const money = (cents: number) => `$${(cents / 100).toFixed(2)}`;
    const change = p.toCents === null
      ? `Look at the ${p.rung} rung for ${p.audience}`
      : `Change the ${p.audience} ${p.rung} rung from ${money(p.fromCents)} to ${money(p.toCents)} a month`;

    try {
      await askForGuidance({
        job: "price-watch",
        dedupeKey: dedupeKey(p),
        question: `${change}?`,
        because: p.because,
        wouldHaveDone: "nothing — a price only moves when you say so",
        choices: p.toCents === null
          ? [
            { key: "noted", label: "Noted, leave the price alone", consequence: "the add-on stays as it is and this is asked again if nothing changes" },
            { key: "ignore", label: "Stop asking about this", consequence: "this rung is left out of the watch" },
          ]
          : [
            { key: "apply", label: `Yes, make it ${money(p.toCents)}`, consequence: "new subscriptions pay the new price; everybody already on it keeps theirs until migrated deliberately" },
            { key: "no", label: "No, leave it", consequence: "nothing changes and this is asked again if the figure still holds in 90 days" },
          ],
        detail: [
          ["Audience", p.audience],
          ["Rung", p.rung],
          ["Now", money(p.fromCents)],
          ["Proposed", p.toCents === null ? "no change — a question" : money(p.toCents)],
          ["Why", p.because],
          ["Expected effect", p.expect],
        ],
        subject: { kind: "plan_tier", id: p.id },
      });
    } catch (err) {
      console.log("[price-watch] could not raise an ask:", err);
    }
  }

  try { await kv.set(FINDINGS_KEY, [...live]); } catch (err) { console.log("[price-watch] could not record findings:", err); }

  return {
    ran: proposals.length > 0,
    detail: `${tiers.length} priced rung${tiers.length === 1 ? "" : "s"} checked — ${summarise(proposals)}`,
    counts: { rungs: tiers.length, proposals: proposals.length, withdrawn: previous.filter((k) => !live.has(k)).length },
  };
}

export function registerPriceWatchJob(): void {
  registerStoreJob("price-watch", priceWatchJob);
}
