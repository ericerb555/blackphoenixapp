/**
 * Whether something a tenant published may be shown to other people yet.
 *
 * WHY ONE MODULE
 *
 * Three surfaces let a paying tenant put something in front of everybody else:
 * a reel, an advertisement and a portal offer. They had three different
 * answers, and they were backwards. A reel — a video — needed an
 * administrator's approval. An advertisement rendered across nineteen surfaces
 * and an offer carrying a price and a promo code needed nothing at all: the ad
 * route's default status on create was `active`.
 *
 * The rule is the same rule in all three cases, so it is written once, here,
 * where it can be checked by hand.
 *
 * THE RULE THAT GIVES APPROVAL ITS TEETH
 *
 * Editing an approved item sends it back to pending. Without that, approval
 * means nothing: somebody submits an inoffensive advertisement, waits for the
 * tick, and then rewrites the headline and the link to anything they like. The
 * thing that was reviewed and the thing being shown have to be the same thing.
 *
 * Only changes that a reader would SEE reset it. Switching an approved
 * advertisement off and on again, or correcting its schedule, is not new
 * content and should not queue for review — that would make the queue so noisy
 * nobody reads it, which is its own way of having no review.
 *
 * WHO IS EXEMPT
 *
 * An administrator publishing on the company's own behalf is not a tenant
 * submitting for review, so their work is approved as it is written. Every
 * other account queues. That is deliberately the narrow exemption: the check is
 * "is this person staff", never "did this person claim to be".
 */

export type Approval = 'pending' | 'approved' | 'rejected';

/** The fields a reader would notice. A change to any of these needs a new look. */
export const VISIBLE_FIELDS = [
  'title', 'content', 'description', 'name',
  'linkUrl', 'imageUrl', 'videoUrl', 'thumbnailUrl',
  'promoCode', 'discountType', 'discountValue', 'originalPrice',
  'targetPortals', 'placement',
] as const;

/**
 * What a newly written record starts as.
 *
 * Staff publish; everybody else queues.
 */
export function initialApproval(isAdmin: boolean): Approval {
  return isAdmin ? 'approved' : 'pending';
}

const normalise = (value: unknown): string => {
  if (value === null || value === undefined) return '';
  if (Array.isArray(value)) return value.map((v) => String(v ?? '').trim()).join('|');
  return String(value).trim();
};

/**
 * Whether the part of this record a reader sees has changed.
 *
 * Compared field by field rather than by serialising the whole record, because
 * `updatedAt` alone would otherwise count as a change and every save would
 * queue for review.
 */
export function visibleChange(existing: any, incoming: any): boolean {
  if (!existing) return false;
  for (const field of VISIBLE_FIELDS) {
    if (!(field in incoming)) continue;
    if (normalise(existing[field]) !== normalise(incoming[field])) return true;
  }
  return false;
}

/**
 * The approval state a save should produce.
 *
 * A first write takes `initialApproval`. A later write keeps what it had unless
 * the visible content moved, in which case it goes back to pending — including
 * from `rejected`, because an author addressing the reason they were refused
 * should be able to ask again without anybody reopening it for them.
 */
export function approvalAfterSave(
  existing: any,
  incoming: any,
  isAdmin: boolean,
): Approval {
  if (!existing) return initialApproval(isAdmin);
  if (isAdmin) return 'approved';

  const current: Approval =
    existing.approval === 'approved' || existing.approval === 'rejected'
      ? existing.approval
      : 'pending';

  return visibleChange(existing, incoming) ? 'pending' : current;
}

/**
 * Whether this record may be shown to somebody who did not write it.
 *
 * Both halves must hold: an administrator approved it, AND its author has it
 * switched on. Approval is not a promise to keep showing something, and being
 * switched on is not permission to show it in the first place.
 *
 * A record written before approval existed carries no `approval` field at all.
 * Those are treated as approved: they were already live, and turning every
 * existing advertisement off the moment this deploys would take a paying
 * advertiser's campaign down without telling them.
 */
export function isPublishable(record: any): boolean {
  if (!record) return false;

  const approval = record.approval === undefined || record.approval === null
    ? 'approved'
    : String(record.approval);
  if (approval !== 'approved') return false;

  // `isActive` is the advertising spelling, `active` the deals one.
  if (record.isActive === false) return false;
  if (record.active === false) return false;

  return true;
}

/** Apply an administrator's decision. */
export function decide(action: unknown): Approval | null {
  const a = String(action ?? '').toLowerCase();
  if (a === 'approve' || a === 'approved') return 'approved';
  if (a === 'reject' || a === 'rejected') return 'rejected';
  return null;
}
