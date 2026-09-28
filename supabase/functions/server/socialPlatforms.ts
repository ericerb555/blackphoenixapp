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
  | 'pinterest' | 'youtube' | 'google_business' | 'linkedin_company';

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
