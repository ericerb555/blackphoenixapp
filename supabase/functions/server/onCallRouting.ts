/**
 * onCallRouting — what happens to one emergency, decided in one place.
 *
 * Pure, because this is the part that must be provable. It takes an account's
 * on-call record and a description of what has gone wrong, and returns a plan:
 * who is rung, in what order, and where the call goes when nobody answers. It
 * rings nobody itself and writes nothing — the caller does that, and can show
 * the plan to a person first.
 *
 * THE ORDER IS THE PRODUCT
 *
 * 1. **A contracted vendor wins outright.** If the account has somebody under
 *    contract for that trade and the arrangement is exclusive, the work goes to
 *    them and stops. Not to the account's own rota, not to Black Phoenix, and
 *    never out to the exchange. A condo association that has signed an
 *    agreement must not have it undercut by the platform it pays for, and a
 *    router that broadcasts first and checks afterwards has already done the
 *    damage.
 * 2. **The account's own rota**, for the service that covers this kind of
 *    emergency, if it is covering at this hour.
 * 3. **Escalation** — Black Phoenix, the exchange, or both, as the account has
 *    asked.
 *
 * THE OUTCOME THAT IS NOT AN ESCALATION
 *
 * `office-hours`. A service set to cover outside business hours is deliberately
 * NOT covering at eleven on a Tuesday, and that is not a failure — it means the
 * office is open and this is an ordinary work request. Treating it as an
 * unanswered emergency would page somebody's night engineer during the working
 * day, which is the exact mistake the hours exist to prevent. So it is its own
 * outcome, and the caller sends it down the normal path.
 */
import {
  contractedFor, heldByContract, serviceFor, isOnCallNow,
  ladderWithContacts, ladderMinutes, afterTheRota, extrasFor, calloutCents,
  type OnCallConfig, type OnCallService, type ContractedVendor, type OnCallContact,
  type CallExtras,
} from './onCallConfig.ts';

export type RouteOutcome =
  /** An exclusive contract takes it. Nothing else happens. */
  | 'contracted'
  /** The account's own people are rung, in the order given. */
  | 'rota'
  /** Inside the working day: an ordinary request, not a page. */
  | 'office-hours'
  /** Straight past the rota to Black Phoenix and/or the exchange. */
  | 'escalate'
  /** Nowhere to send it. The one outcome that must never pass quietly. */
  | 'nobody';

export interface RouteStep {
  waitMinutes: number;
  contacts: OnCallContact[];
}

export interface RoutePlan {
  outcome: RouteOutcome;
  /** One sentence, written for a person reading a call record months later. */
  reason: string;
  /** The trade this was routed on, as it was given. */
  trade: string;
  service: { id: string; name: string } | null;
  /** Contracted vendors for this trade — exclusive or not. */
  contracted: ContractedVendor[];
  /** Who is rung, in order. Empty for every outcome but `rota`. */
  steps: RouteStep[];
  /** How long the rota runs before it is exhausted. */
  rotaMinutes: number;
  /** Where it goes after the rota, or immediately when there is no rota. */
  next: { platform: boolean; exchange: boolean };
  /** Does Black Phoenix answer for this account, having been paid to? */
  weAnswer: boolean;
  /** Was the account's on-call covering at the moment this was routed? */
  coveringNow: boolean;
  /**
   * What the callout will cost, and whose rate card it came from.
   *
   * `chargedBy` matters on an invoice and in a dispute: "your contractor's
   * rate" and "our rate" are different conversations.
   */
  charges: {
    total: number;
    lines: Array<{ label: string; cents: number }>;
    chargedBy: 'platform' | 'account';
  };
}

export interface RouteRequest {
  /** "plumbing", "lockout" — whatever the person reporting it called it. */
  trade: string;
  /** When it came in. Passed rather than read, so this stays testable. */
  at?: Date;
  /**
   * Whether Black Phoenix has been paid to answer for this account.
   *
   * Resolved by the caller from the subscription, never from the record: a
   * stored copy of an entitlement keeps saying yes after somebody cancels.
   */
  weAnswer?: boolean;
  /** Billable hours, if they are already known. Usually they are not. */
  hours?: number;
  /**
   * Our rates, for when we are the ones answering.
   *
   * Passed in rather than read, because the account's own record must not
   * be able to decide what Black Phoenix charges — the customer edits that
   * record. Without this, a callout we attend is priced from a number the
   * person being charged it typed in.
   */
  platformRates?: CallExtras | null;
}

const summary = (service: OnCallService | null) =>
  (service ? { id: service.id, name: service.name } : null);

/**
 * Decide what happens to this emergency.
 *
 * Every return carries a reason in plain words. A call record that says
 * `outcome: "escalate"` and nothing else is unreadable three months later, when
 * somebody is trying to work out why a plumber was never rung.
 */
export function routeEmergency(config: OnCallConfig, req: RouteRequest): RoutePlan {
  const trade = String(req.trade || '').trim();
  const at = req.at || new Date();
  const weAnswer = req.weAnswer === true;

  const contracted = contractedFor(config, trade);
  const service = serviceFor(config, trade);
  const coveringNow = isOnCallNow(config, service, at);
  const charges = calloutCents(config, {
    service,
    hours: req.hours,
    // Out-of-hours money follows the same judgement as out-of-hours paging: if
    // the rota is covering, this is out of hours.
    afterHours: coveringNow,
    // Ours when we answer, theirs otherwise — decided once, in ratesFor.
    weAnswer,
    platform: req.platformRates || null,
  });

  const base = {
    trade,
    service: summary(service),
    contracted,
    steps: [] as RouteStep[],
    rotaMinutes: 0,
    weAnswer,
    coveringNow,
    charges,
  };

  /* 1 ─ an exclusive contract, before anything is broadcast anywhere */
  if (heldByContract(config, trade)) {
    const holders = contracted.filter((v) => v.exclusive).map((v) => v.name).join(', ');
    return {
      ...base,
      outcome: 'contracted',
      // Nothing after this runs, which is the point of the arrangement.
      next: { platform: false, exchange: false },
      reason: `${holders} ${contracted.filter(v => v.exclusive).length === 1 ? 'holds' : 'hold'} `
        + `an exclusive contract for ${trade || 'this work'}, so it goes to them and nowhere else.`,
    };
  }

  /* 2 ─ the account's own rota */
  const fallback = {
    platform: config.escalateToPlatform !== false,
    exchange: service?.sendToExchange === true,
  };

  if (!config.enabled) {
    return {
      ...base,
      outcome: fallback.platform || fallback.exchange ? 'escalate' : 'nobody',
      next: fallback,
      reason: fallback.platform || fallback.exchange
        ? 'On-call is switched off for this account, so it goes straight to escalation.'
        : 'On-call is switched off and escalation is off, so there is nobody to send this to.',
    };
  }

  if (!service) {
    return {
      ...base,
      outcome: fallback.platform ? 'escalate' : 'nobody',
      next: { platform: fallback.platform, exchange: false },
      reason: fallback.platform
        ? `No on-call service covers ${trade || 'this trade'} and there is no catch-all, `
          + 'so it escalates to Black Phoenix.'
        : `No on-call service covers ${trade || 'this trade'}, there is no catch-all, and `
          + 'escalation is off — this would reach nobody.',
    };
  }

  /**
   * Inside the working day. Not an escalation and not a failure.
   *
   * Returned before the rota is read, because the rota is irrelevant: nobody
   * is on call, by arrangement, and the office is open.
   */
  if (!coveringNow) {
    return {
      ...base,
      outcome: 'office-hours',
      next: { platform: false, exchange: false },
      reason: `${service.name} is not covering at this hour by arrangement, so this is an `
        + 'ordinary request for whoever is at a desk rather than a callout.',
    };
  }

  const steps = ladderWithContacts(config, service);
  const reachable = steps.filter((s) => s.contacts.some((c) => c.phone));

  if (reachable.length === 0) {
    /**
     * A rota that cannot be rung.
     *
     * Either nobody is on it, or nobody on it has a phone number. Both look
     * identical from here and both mean the same thing: escalate now rather
     * than spending the rota's minutes ringing nothing while somebody waits.
     */
    return {
      ...base,
      outcome: fallback.platform || fallback.exchange ? 'escalate' : 'nobody',
      next: fallback,
      reason: fallback.platform || fallback.exchange
        ? `${service.name} has nobody reachable on its rota, so it escalates immediately `
          + 'rather than ringing nothing first.'
        : `${service.name} has nobody reachable on its rota and no escalation is set — `
          + 'this would reach nobody.',
    };
  }

  return {
    ...base,
    outcome: 'rota',
    steps: reachable,
    rotaMinutes: ladderMinutes(service),
    next: afterTheRota(config, service),
    reason: `${service.name} is covering. ${reachable[0].contacts.map((c) => c.name).join(', ')} `
      + `${reachable[0].contacts.length === 1 ? 'is' : 'are'} rung first`
      + (reachable.length > 1 ? `, then ${reachable.length - 1} more step${reachable.length > 2 ? 's' : ''}` : '')
      + '.',
  };
}

/**
 * Should this plan produce a bid request on Phoenix Exchange?
 *
 * Separated from the plan because it is a different question with a different
 * answer at a different time: the plan says what the account asked for, this
 * says whether the exchange is the right destination *now*. An exclusive
 * contract makes it false whatever else is set, which is the rule worth having
 * in one function rather than re-derived at each call site.
 */
export function goesToExchange(plan: RoutePlan): boolean {
  if (plan.outcome === 'contracted') return false;
  if (plan.outcome === 'office-hours') return false;
  return plan.next.exchange === true;
}

/**
 * How long before the exchange or Black Phoenix should take over.
 *
 * Zero when there is no rota to wait for — an emergency that already has
 * nobody to ring should not sit for twenty-five minutes proving it.
 */
export function escalateAfterMinutes(plan: RoutePlan): number {
  return plan.outcome === 'rota' ? plan.rotaMinutes : 0;
}

/** The rates that applied, for a record that has to be explainable later. */
export function ratesUsed(config: OnCallConfig, plan: RoutePlan) {
  const service = (config.services || []).find((s) => s.id === plan.service?.id) || null;
  return extrasFor(config, service);
}
