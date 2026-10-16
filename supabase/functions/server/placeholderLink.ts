/**
 * Is this link a placeholder rather than a destination?
 *
 * WHY THIS EXISTS
 *
 * Two advertisements were serving on every portal marquee pointing at
 * `https://example.com/lumber` and `https://example.com/flooring`. Both were
 * approved by an administrator on 2026-09-27 and both were switched on, so
 * every check the serve route makes passed them: the approval was real, the
 * campaign was active, the scheme was https. They were seed rows written to
 * demonstrate the marquee, and nothing in the system could tell the difference
 * between a demonstration and a vendor.
 *
 * A visitor clicking one lands on an IANA holding page. That is worse than an
 * empty marquee, because an empty marquee says nothing is sold yet and a dead
 * link says the directory is broken.
 *
 * WHY A RULE RATHER THAN DELETING THE TWO ROWS
 *
 * Deleting them fixes today. Seed data gets written again — by a fixture, by a
 * demo, by somebody learning the admin screen — and the next time it will be
 * approved by the same route for the same reasons. `example.com` exists
 * precisely so that it can never be a real destination (RFC 2606 reserves it
 * for documentation), which makes "is this a placeholder" a decidable question
 * rather than a guess. Decidable questions belong in code.
 *
 * WHY IT IS SEPARATE FROM THE SCHEME CHECK
 *
 * `safeUrl` refuses `javascript:` and `data:` because they are attacks. This
 * refuses `example.com` because it is unfinished work. Same shape, opposite
 * intent: one is somebody trying something, the other is nobody having got
 * round to it yet. Keeping them apart keeps each comment honest about what it
 * is defending against.
 *
 * NOT THE SAME THING AS `safeFetch.ts`
 *
 * That module decides what this server is willing to *fetch*, and guards
 * against being pointed at a private address. This decides what link we are
 * willing to *show*, and a private address is not a placeholder while a public
 * `example.com` very much is. Neither list belongs in the other.
 */

/**
 * Host suffixes reserved by RFC 2606 and RFC 6761 — names guaranteed never to
 * resolve to anybody's real site. `.invalid` and `.test` are reserved for
 * exactly this; `.localhost` and `localhost` point at whoever is reading,
 * which for an outbound advertisement link is nonsense rather than a site.
 */
const RESERVED_SUFFIXES = [
  '.example',
  '.invalid',
  '.test',
  '.localhost',
] as const;

/** The four second-level names RFC 2606 set aside for documentation. */
const RESERVED_NAMES = [
  'example.com',
  'example.net',
  'example.org',
  'example.edu',
  'localhost',
] as const;

/**
 * Is `host` a reserved name, or a subdomain of one?
 *
 * Compared on label boundaries rather than with `endsWith` on the bare name,
 * because `notexample.com` is somebody's real domain and `shop.example.com` is
 * not. Getting that backwards would either serve the placeholder anyway or
 * refuse a legitimate advertiser, and the second is the one nobody would
 * report as a bug — they would just assume the ad was rejected for cause.
 */
export function isPlaceholderHost(host: unknown): boolean {
  const name = String(host ?? '').trim().toLowerCase().replace(/\.+$/, '');
  if (!name) return false;

  for (const reserved of RESERVED_NAMES) {
    if (name === reserved || name.endsWith(`.${reserved}`)) return true;
  }
  for (const suffix of RESERVED_SUFFIXES) {
    if (name.endsWith(suffix)) return true;
  }
  return false;
}

/**
 * Is this URL a placeholder?
 *
 * Anything unparseable is NOT called a placeholder. It is already refused by
 * `safeUrl` for not being a web address, and answering "yes" here would make
 * this function the reason an ad vanished while the comment above said it was
 * about seed data. One refusal, one reason.
 */
export function isPlaceholderLink(raw: unknown): boolean {
  const value = String(raw ?? '').trim();
  if (!value) return false;
  try {
    return isPlaceholderHost(new URL(value).hostname);
  } catch {
    return false;
  }
}
