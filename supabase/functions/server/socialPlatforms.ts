/**
 * What each platform is, in one place.
 *
 * WHY THIS EXISTS
 *
 * Every platform was a branch in `connect`, another in the OAuth callback and
 * a third in the publisher. With three platforms that was readable. Going to
 * seven means twenty-one branches spread across one file, and the facts that
 * actually differ — whether a bare text post is allowed, how long a caption
 * may be, whether the account is a page or a person — end up implied by
 * control flow rather than written down.
 *
 * So the facts live here, as data, and the code asks. A platform that cannot
 * take a text-only post says so before the attempt rather than failing at the
 * API, which is the same principle the reel specification follows: refuse it
 * where the reason can be read, not three seconds later in somebody else's
 * error message.
 *
 * WHAT IS DELIBERATELY NOT HERE
 *
 * The publishing calls themselves. Those are genuinely different — Bluesky
 * speaks XRPC, Meta speaks Graph, TikTok wants a pull URL — and pretending
 * they share a shape would produce a worse abstraction than three functions.
 * This is the description, not the driver.
 */

export type PlatformId =
  | 'facebook' | 'instagram' | 'tiktok'
  | 'bluesky' | 'mastodon' | 'linkedin' | 'threads'
  | 'pinterest' | 'youtube' | 'google_business' | 'linkedin_company' | 'x';

export interface PlatformSpec {
  id: PlatformId;
  label: string;
  /** How the account is attached. Shapes the connect flow, not the publish. */
  auth: 'oauth' | 'app-password';
  /**
   * `none` — a text post is fine.
   * `image-or-video` — something visual is required.
   * `video` — only video, and only video.
   */
  media: 'none' | 'image-or-video' | 'video';
  /** Longest post body the platform accepts. */
  maxChars: number;
  /**
   * Mastodon's server is part of the account: the same handle on two
   * instances is two accounts, so the connect flow has to capture which one.
   */
  needsInstance?: boolean;
  /**
   * Pinterest pins belong to a board, so one has to be chosen before anything
   * can be posted. There is no "default board" to fall back on.
   */
  needsBoard?: boolean;
  /**
   * A Google Business Profile post belongs to a location, and a business with
   * two premises has two. Picking one for somebody would post to the wrong
   * shopfront half the time.
   */
  needsLocation?: boolean;
  /**
   * A LinkedIn company post is authored by an organization urn, and a person
   * may administer several pages. Guessing which would post as the wrong
   * company.
   */
  needsOrganization?: boolean;
  /**
   * What one post costs, in US cents, where the platform charges for it.
   *
   * X is the only one. It is recorded as data rather than left in a comment
   * so a screen can show the figure BEFORE the button is pressed — a cost
   * somebody discovers on an invoice is a cost they did not agree to.
   *
   * `withLink` is separate because X prices them very differently: a plain
   * post is 1.5 cents and a post carrying any link is twenty, and a store
   * post is always a link.
   */
  costCents?: { plain: number; withLink: number };
  /**
   * Said in the interface at connection time, where it changes what somebody
   * expects. Only set where there is something genuinely surprising.
   */
  caveat?: string;
}

export const PLATFORMS: Record<PlatformId, PlatformSpec> = {
  facebook: {
    id: 'facebook', label: 'Facebook', auth: 'oauth', media: 'none', maxChars: 63206,
  },
  instagram: {
    id: 'instagram', label: 'Instagram', auth: 'oauth', media: 'image-or-video', maxChars: 2200,
    caveat: 'Instagram will not take a post without an image or video.',
  },
  tiktok: {
    id: 'tiktok', label: 'TikTok', auth: 'oauth', media: 'video', maxChars: 2200,
    caveat: 'Until TikTok audits this app, posts are published privately.',
  },
  bluesky: {
    id: 'bluesky', label: 'Bluesky', auth: 'app-password', media: 'none', maxChars: 300,
    caveat: 'Bluesky uses an app password from your account settings, not a login.',
  },
  mastodon: {
    id: 'mastodon', label: 'Mastodon', auth: 'oauth', media: 'none', maxChars: 500,
    needsInstance: true,
    caveat: 'Your server is part of your account, so it is asked for when connecting.',
  },
  linkedin: {
    id: 'linkedin', label: 'LinkedIn', auth: 'oauth', media: 'none', maxChars: 3000,
    caveat: 'Posts go to your personal profile. Company pages need LinkedIn\'s partner approval.',
  },
  threads: {
    id: 'threads', label: 'Threads', auth: 'oauth', media: 'none', maxChars: 500,
  },
  /**
   * A SEPARATE platform from `linkedin`, not a setting on it.
   *
   * The two need different scopes, and that is the whole reason. Adding
   * `w_organization_social` to the self-serve connection would make LinkedIn
   * refuse the whole authorisation for any app it has not approved — so
   * asking for it by default would break the personal posting that works
   * today, in order to offer company posting that does not yet.
   *
   * Kept apart, both can be held at once: personal posting works now, and
   * company posting starts working when the partner approval lands, with
   * nothing to rewire.
   */
  linkedin_company: {
    id: 'linkedin_company', label: 'LinkedIn Page', auth: 'oauth', media: 'none', maxChars: 3000,
    needsOrganization: true,
    caveat: 'Company pages need LinkedIn\'s Community Management approval. Until it is granted, connecting fails.',
  },
  /**
   * X, the only platform here that charges per post.
   *
   * `media: 'none'` is a limitation rather than a preference. Posting text is
   * OAuth 2.0; attaching an image means the v1.1 upload endpoint, which
   * accepts only OAuth 1.0a — a second, incompatible credential set and a
   * three-step chunked upload. Text and a link is what a store post is
   * anyway, and the link preview usually carries the picture.
   */
  x: {
    id: 'x', label: 'X', auth: 'oauth', media: 'none', maxChars: 280,
    costCents: { plain: 1.5, withLink: 20 },
    caveat: 'X charges per post: about 1.5¢, or 20¢ for a post containing a link.',
  },
  pinterest: {
    id: 'pinterest', label: 'Pinterest', auth: 'oauth', media: 'image-or-video', maxChars: 500,
    needsBoard: true,
    caveat: 'On trial access, pins are visible only to you until Pinterest grants standard access.',
  },
  youtube: {
    id: 'youtube', label: 'YouTube', auth: 'oauth', media: 'video', maxChars: 100,
    caveat: 'The title is limited to 100 characters. Vertical video under 60 seconds posts as a Short.',
  },
  google_business: {
    id: 'google_business', label: 'Google Business Profile', auth: 'oauth', media: 'none', maxChars: 1500,
    needsLocation: true,
    caveat: 'Google grants zero quota until it approves the access request, so posting fails until then.',
  },
};

export const PLATFORM_IDS = Object.keys(PLATFORMS) as PlatformId[];

export const isPlatform = (value: unknown): value is PlatformId =>
  typeof value === 'string' && Object.prototype.hasOwnProperty.call(PLATFORMS, value);

/**
 * Can this post go to this platform at all?
 *
 * Asked before anything is sent, so the reason reaches the person composing
 * rather than arriving as a platform error afterwards. Returns the reason
 * rather than a boolean because the reason is the useful part — "Instagram
 * will not take a post without an image" tells somebody what to do next, and
 * `false` does not.
 */
export function refusalFor(
  platformId: PlatformId,
  post: { content?: string; imageUrl?: string; videoUrl?: string },
): string | null {
  const spec = PLATFORMS[platformId];
  if (!spec) return `${platformId} is not a platform this can post to.`;

  const content = String(post?.content ?? '');
  const hasImage = Boolean(post?.imageUrl);
  const hasVideo = Boolean(post?.videoUrl);

  if (spec.media === 'video' && !hasVideo) {
    return `${spec.label} only takes video.`;
  }
  if (spec.media === 'image-or-video' && !hasImage && !hasVideo) {
    return `${spec.label} needs an image or a video.`;
  }
  if (!content.trim() && spec.media === 'none' && !hasImage && !hasVideo) {
    return `${spec.label} needs something to post.`;
  }
  if (content.length > spec.maxChars) {
    return `${spec.label} allows ${spec.maxChars} characters; this is ${content.length}.`;
  }
  return null;
}

/**
 * What sending this post will cost, in cents, or zero.
 *
 * Only X charges, and it charges very differently depending on one thing:
 * whether the text carries a link. A plain post is about a penny and a half;
 * the same post with a URL in it is twenty cents — thirteen times more — and
 * a post promoting a product is always a link.
 *
 * Returned so a screen can say the figure before the button is pressed. A
 * cost somebody meets on an invoice is a cost they never agreed to, and at
 * three linked posts a day this is roughly eighteen dollars a month.
 */
export function costOfPost(platformId: PlatformId, content: string): number {
  const spec = PLATFORMS[platformId];
  if (!spec?.costCents) return 0;
  return containsLink(content) ? spec.costCents.withLink : spec.costCents.plain;
}

/**
 * Does this text carry a link?
 *
 * Deliberately generous: a bare `theblackphoenixcompany.com` counts, because
 * X will linkify it and charge for it whether or not it was written with a
 * scheme. Guessing low here would understate the bill.
 */
export function containsLink(content: string): boolean {
  const text = String(content ?? '');
  return /https?:\/\/\S+/i.test(text) || /\b[a-z0-9-]+\.(com|net|org|co|io|shop|us)\b/i.test(text);
}

/** The total for one post across several platforms, in cents. */
export function costOfPosts(platformIds: PlatformId[], content: string): number {
  return (platformIds || []).reduce((sum, id) => sum + costOfPost(id, content), 0);
}

/**
 * The same text, trimmed to fit.
 *
 * Bluesky's 300 characters is the binding constraint in practice: one caption
 * written for Instagram will not fit, and a post refused outright helps nobody
 * when the first three hundred characters would have been fine.
 *
 * Trimmed on a word boundary with an ellipsis, so it reads as shortened rather
 * than as having been cut off mid-thought.
 */
export function fitToPlatform(platformId: PlatformId, content: string): string {
  const spec = PLATFORMS[platformId];
  const text = String(content ?? '');
  if (!spec || text.length <= spec.maxChars) return text;

  const room = spec.maxChars - 1;
  const clipped = text.slice(0, room);
  const lastSpace = clipped.lastIndexOf(' ');
  const body = lastSpace > room * 0.6 ? clipped.slice(0, lastSpace) : clipped;
  return `${body.trimEnd()}…`;
}
