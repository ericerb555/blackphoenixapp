/**
 * Deciding what a product post should actually do, and recording what it did.
 *
 * WHAT WAS WRONG
 *
 * The Content Centre's product composer saved a record with
 * `channels: ['social']` and `status: 'ready'`, and told the user "Saved as a
 * social post — ready to schedule." Nothing in the entire server ever read a
 * `store_post:` record again. There is no scheduler for them, so "ready to
 * schedule" meant "will never be scheduled" — a post composed from live store
 * products sat in the key-value store forever and never reached a page.
 *
 * The wording was almost honest, which is what made it survive: it never
 * claimed to have posted. It just described a queue that does not exist.
 *
 * WHY THE DECISION LIVES HERE AND NOT IN THE ROUTE
 *
 * `store-content.tsx` is a `.tsx` file and the node test runner cannot load
 * one, so anything written inside it cannot be tested — the same reason the
 * application helpers and `monthlyFigure` were pulled out. This decides
 * whether something is sent to a live business page, so it is worth testing.
 */

/** The only platforms `/social/publish` can actually post to today. */
export const SOCIAL_PLATFORMS = ['facebook', 'instagram'] as const;
export type SocialPlatform = typeof SOCIAL_PLATFORMS[number];

export interface PublishResult {
  platform: string;
  success: boolean;
  id?: string;
  error?: string;
}

/**
 * Which platforms a post is actually asking for.
 *
 * `channels` has historically carried the bare string `'social'`, which names
 * no platform at all. It is expanded to every supported platform rather than
 * dropped, because a post saved as "social" plainly meant "the socials" — and
 * silently posting nowhere is the behaviour being fixed.
 *
 * Anything unrecognised (`email`, a future `tiktok`) is returned separately
 * rather than quietly discarded, so a caller can say what it did not attempt.
 */
export function platformsFor(channels: unknown): {
  platforms: SocialPlatform[];
  unsupported: string[];
} {
  const raw = Array.isArray(channels)
    ? channels.map((c) => String(c ?? '').trim().toLowerCase()).filter(Boolean)
    : [];

  const platforms = new Set<SocialPlatform>();
  const unsupported: string[] = [];

  for (const channel of raw) {
    if (channel === 'social') {
      for (const p of SOCIAL_PLATFORMS) platforms.add(p);
    } else if ((SOCIAL_PLATFORMS as readonly string[]).includes(channel)) {
      platforms.add(channel as SocialPlatform);
    } else if (!unsupported.includes(channel)) {
      unsupported.push(channel);
    }
  }

  return { platforms: [...platforms], unsupported };
}

/**
 * Should saving this post send it to a page right now?
 *
 * Deliberately narrow. Publishing is the side effect that cannot be undone —
 * a post on a business page has been seen — so it happens only when the caller
 * asked for it in as many words, and never as a default. A draft, a save with
 * no channels, or anything that does not name the intent, publishes nothing.
 */
export function shouldPublishNow(body: {
  publishNow?: unknown;
  status?: unknown;
  channels?: unknown;
}): boolean {
  if (body?.publishNow !== true) return false;
  const status = String(body?.status ?? '').trim().toLowerCase();
  if (status === 'draft') return false;
  return platformsFor(body?.channels).platforms.length > 0;
}

/**
 * What the record should say afterwards.
 *
 * `published` only when a page actually took it. If every platform refused,
 * the record says `failed` and keeps the reasons, because a post that reads
 * "published" while Facebook rejected it is the exact failure this work exists
 * to remove — and the reasons are the only way anybody finds out why.
 *
 * A partial success is still `published`: something is live and the record has
 * to reflect that, with the failures listed beside it.
 */
export function statusFromResults(results: PublishResult[]): 'published' | 'failed' {
  return (results || []).some((r) => r?.success) ? 'published' : 'failed';
}

/** A short line a human can read, rather than a results array. */
export function describeResults(results: PublishResult[]): string {
  const list = results || [];
  if (list.length === 0) return 'Nothing was sent.';
  const ok = list.filter((r) => r?.success).map((r) => r.platform);
  const bad = list.filter((r) => !r?.success);
  const parts: string[] = [];
  if (ok.length) parts.push(`Posted to ${ok.join(' and ')}.`);
  for (const r of bad) parts.push(`${r.platform} refused it: ${r.error || 'no reason given'}.`);
  return parts.join(' ');
}
