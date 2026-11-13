/**
 * The directory's own advertisement, mixed in with the paid ones.
 *
 * Eric: "can we add a ad and reel of my company for now — it should always mix
 * mine into the mix of the paid ones."
 *
 * THE LABEL IS THE PART THAT MATTERS
 *
 * `ExchangeSponsored` renders its block under "Advertisement — paid for", and
 * its header is emphatic about why: the label "is the whole basis on which
 * this is allowed to exist". The house ad is not paid for. Carrying it under
 * that heading would make the one true thing on the block false, and a
 * directory that misdescribes its own promotion has given up the thing that
 * made its listings worth reading.
 *
 * So a house ad travels with `house: true` and the client labels it as the
 * directory's own. Mixed into the same block, told apart in the one way that
 * matters to a reader.
 *
 * WHY IT GETS A RESERVED SLOT RATHER THAN A PLACE IN THE QUEUE
 *
 * The Exchange asks for two ads. Appending the house ad to a full list would
 * drop it exactly when there is most to be seen beside, which is the opposite
 * of "always". So one slot is held for it and the paid ads fill the rest.
 *
 * It is held at the END. An advertiser paying for a space beside the listings
 * is paying for the top of it, and the owner of the directory taking that
 * position for free is the sort of thing that is never noticed until it is
 * noticed all at once.
 */

export interface AdLike {
  id: string;
  title?: string;
  content?: string;
  linkUrl?: string | null;
  imageUrl?: string | null;
  videoUrl?: string | null;
  [key: string]: unknown;
}

export interface HouseAd extends AdLike {
  isActive?: boolean;
}

/** The stored house ad for a placement. */
export const HOUSE_KEY = (placement: string) => `ad_house:${String(placement || 'marquee')}`;

/**
 * Paid ads and the house ad, in the order they should be shown.
 *
 * Pure, because the ordering rule is the whole decision here and it should be
 * checkable without a database: that the house ad is always present when it is
 * active, that it never displaces a paying advertiser from the top, and that
 * it is marked so the label can be honest.
 */
export function mixHouseAd<T extends AdLike>(
  paid: readonly T[],
  house: HouseAd | null | undefined,
  limit: number,
): Array<T | (HouseAd & { house: true })> {
  const cap = Math.max(0, Math.floor(limit) || 0);
  if (cap === 0) return [];

  const usable = house && house.isActive !== false && String(house.id || '').trim()
    ? { ...house, house: true as const }
    : null;

  if (!usable) return paid.slice(0, cap) as T[];

  // One slot reserved, paid ads take the rest, house ad last.
  const paidRoom = Math.max(0, cap - 1);
  return [...paid.slice(0, paidRoom), usable];
}

/**
 * Whether what is stored is complete enough to show.
 *
 * An advertisement with no destination is a picture that does nothing, and one
 * with no title is a blank row. Both look like the directory is broken rather
 * than like it is promoting itself, so an incomplete house ad shows nothing at
 * all — the same choice `ExchangeSponsored` makes about an empty block.
 */
export function houseAdIsShowable(house: HouseAd | null | undefined): boolean {
  if (!house || house.isActive === false) return false;
  if (!String(house.id || '').trim()) return false;
  if (!String(house.title || '').trim()) return false;
  return Boolean(String(house.linkUrl || '').trim());
}
