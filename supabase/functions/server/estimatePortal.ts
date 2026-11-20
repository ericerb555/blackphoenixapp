/**
 * A place for somebody with no account to watch their own junk job.
 *
 * Eric, 2026-11-20: *"give them a portal on confirmation a customer portal"*.
 *
 * WHO THIS IS FOR
 *
 * Somebody photographed a garage, got a price, and asked us to confirm it —
 * without ever making an account. Until now that was the end of the road for
 * them: a CRM row, an alert to the office, and nothing they could look at. If
 * they wanted to know whether we had seen it, their only move was to ring.
 *
 * WHY A TOKEN AND NOT AN ACCOUNT
 *
 * The contact details on one of these are UNVERIFIED and the rest of this
 * flow is careful about that — `confirm-anonymous` deliberately refuses to
 * write the address to `customerEmail`, because an unverified one would let
 * anybody claim somebody else's estimate by typing their email. Issuing a
 * login keyed on the same unverified detail would hand over exactly what that
 * refusal protects.
 *
 * So possession of the link is the authorisation, the way it already is for
 * `/junk-quote`, architect reviews, returns and quote signing. The token is
 * minted once, filed by HASH so a leak of the store is not a leak of the
 * links, and it expires. `shareToken.ts` already does all three and is
 * tested; this reuses it rather than growing a second one.
 *
 * WHAT IT DELIBERATELY DOES NOT DO
 *
 * It does not sign, approve, accept or schedule anything. It is a window. A
 * token that arrives by text can be forwarded, screenshotted and pasted into
 * a group chat — `junkLinks.ts` says so at length — and a window survives
 * that. A button that commits somebody to a thousand pounds of work does not.
 */
import { shareTokenRecord, shareTokenUsable, type ShareTokenRecord } from './shareToken.ts';

/** Where a token for an estimate is filed. The hash, never the token. */
export function estimateTokenKey(hash: string): string {
  return `estimate_token:${hash}`;
}

/** The record to file when somebody asks us to confirm a price. */
export function estimatePortalRecord(estimateId: string, nowIso: string): ShareTokenRecord {
  return shareTokenRecord(estimateId, nowIso, 'junk-confirm');
}

/** Is the link still good? Same three reasons, same single answer. */
export function estimatePortalUsable(record: ShareTokenRecord | null | undefined, nowMs: number): boolean {
  return shareTokenUsable(record, nowMs);
}

/** The link as the customer receives it. */
export function estimatePortalUrl(appUrl: string, token: string): string {
  const base = String(appUrl || '').replace(/\/+$/, '');
  return `${base}/my-estimate/${encodeURIComponent(token)}`;
}

/**
 * Where the job has got to, in words the customer asked in.
 *
 * `status` on the stored estimate is ours and changes as we work; this is the
 * two or three states that mean something to the person waiting. Anything
 * unrecognised reads as "with us", which is true of every state this flow can
 * reach and is the safe thing to say about one it cannot.
 */
export function customerStageOf(status: unknown): { stage: string; says: string } {
  switch (String(status || '')) {
    case 'confirmation-requested':
      return { stage: 'with-us', says: 'We have your pictures and your price. Somebody will call you.' };
    case 'needs-visit':
      return { stage: 'needs-visit', says: 'We want to see this one in person before we commit to a price.' };
    case 'confirmed':
      return { stage: 'confirmed', says: 'We have confirmed this price.' };
    case 'scheduled':
      return { stage: 'scheduled', says: 'This is booked in.' };
    case 'declined':
      return { stage: 'declined', says: 'We are not able to take this one on.' };
    default:
      return { stage: 'with-us', says: 'This is with us.' };
  }
}

/**
 * The estimate as the customer may see it.
 *
 * A NAMED LIST, NOT THE RECORD WITH SECRETS REMOVED.
 *
 * The stored estimate carries `userId`, the day-bucket it was metered in, the
 * storage paths of the photographs and whatever a later change adds to it.
 * Projecting a fixed set means a field added upstream is invisible here until
 * somebody decides it should be — the opposite of a denylist, which leaks by
 * default the moment anybody forgets.
 *
 * The figures ARE included, and that is not a slip: the customer has already
 * been shown the price, the range and the hourly rates on the page where they
 * asked us to confirm. Withholding them now would make the portal useless
 * without making anything private.
 */
export function customerEstimateView(estimate: any): Record<string, unknown> | null {
  if (!estimate?.id) return null;
  const { stage, says } = customerStageOf(estimate.status);

  return {
    id: String(estimate.id),
    stage,
    says,
    requestedAt: estimate.confirmationRequestedAt ?? null,
    createdAt: estimate.createdAt ?? null,
    validUntil: estimate.validUntil ?? null,

    /* What they told us, read back, so they can see we have it right. */
    scope: estimate.customerScope ?? null,
    access: estimate.customerNotes ?? null,
    message: estimate.customerMessage ?? null,
    name: estimate.anonContact?.name ?? null,

    /* The price, as already shown to them. */
    cost: estimate.cost ?? null,
    volumeCuYd: estimate.volumeCuYd ?? null,
    loads: estimate.loads ?? null,
    lines: Array.isArray(estimate.lines) ? estimate.lines : [],

    /* Why it is not a firm number, when it is not. */
    needsSiteVisit: Boolean(estimate.needsSiteVisit),
    siteVisitReasons: Array.isArray(estimate.siteVisitReasons) ? estimate.siteVisitReasons : [],
    excluded: Array.isArray(estimate.excluded) ? estimate.excluded : [],
    refused: Array.isArray(estimate.refused) ? estimate.refused : [],
    notes: Array.isArray(estimate.notes) ? estimate.notes : [],
  };
}

/**
 * The fields a customer view must never carry.
 *
 * Asserted in the tests rather than filtered here — the projection above is a
 * list of what IS sent, so this is a statement about that list being right,
 * not a second line of defence. A denylist as the only guard is what leaks.
 */
export const NEVER_IN_A_CUSTOMER_VIEW = [
  'userId', 'customerEmail', 'mediaRefs', 'anonContact', 'workRequestId', 'signupOffer',
] as const;
