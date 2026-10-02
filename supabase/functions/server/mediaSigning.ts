/**
 * Customer job media is private. This is how it gets read.
 *
 * WHY THIS EXISTS
 *
 * `project-photos`, `project-videos` and `project-blueprints` were created as
 * PUBLIC buckets, and the upload helpers handed out `getPublicUrl` links. That
 * meant anyone holding a URL could open a customer's job-site photographs,
 * their blueprints, and — once walkthrough video arrives — the inside of their
 * house, whether or not they had any business seeing it. There was no size
 * limit and no file-type restriction either.
 *
 * It was survivable while the audience was a handful of invited
 * subcontractors. Phoenix Exchange broadcasts work to a marketplace and asks
 * customers for video walkthroughs of their homes, which makes it not
 * survivable at all. So the buckets become private and every read is signed.
 *
 * THE DESIGN, AND WHY IT IS THIS SHAPE
 *
 * Records already in the store hold full public URLs — thousands of them,
 * written over months. Rewriting that data would be a migration with a long
 * tail and no way to be sure it caught everything.
 *
 * So nothing is migrated. A stored value is treated as an *identifier* rather
 * than a working link: the bucket and path are parsed back out of whatever
 * shape it is in, and a fresh short-lived signed URL is minted at read time.
 * A public URL, a stale signed URL and an explicit `storage://` reference all
 * resolve to the same object, so old and new records work side by side and
 * the public URLs stop functioning the moment the bucket is flipped — which
 * is the point.
 *
 * FAIL-SAFE DIRECTION
 *
 * Only the three known private buckets are ever rewritten. Anything else — an
 * external link, a company logo in a genuinely public bucket, a data URI, an
 * empty string — passes through untouched. The failure mode is therefore "a
 * link we do not manage is left alone", never "a link is broken because it was
 * not recognised".
 */

/**
 * The buckets holding customer job media. Membership of this set is what makes
 * a value eligible for signing; anything outside it is somebody else's link.
 */
export const PRIVATE_MEDIA_BUCKETS = [
  "project-photos",
  "project-videos",
  "project-blueprints",
] as const;

const PRIVATE_SET: ReadonlySet<string> = new Set(PRIVATE_MEDIA_BUCKETS);

/**
 * How long a signed media link lives.
 *
 * One hour. Long enough that a page open while somebody reads through a job
 * does not break under them, short enough that a URL copied out of the network
 * tab and pasted somewhere is worthless by the time it travels. Elsewhere in
 * this codebase property media is signed for seven days; that is too generous
 * for the inside of a customer's house.
 */
export const MEDIA_URL_TTL_SECONDS = 60 * 60;

export interface MediaRef {
  bucket: string;
  path: string;
}

/**
 * Pull the bucket and object path back out of a stored media value.
 *
 * Returns null for anything that is not a reference to one of the private
 * buckets, which is the signal to leave the value exactly as it is.
 */
export function parseStoredMedia(value: unknown): MediaRef | null {
  if (typeof value !== "string") return null;
  const raw = value.trim();
  if (!raw) return null;

  // Explicit form, written by uploads from here on: storage://bucket/path
  if (raw.startsWith("storage://")) {
    return splitBucketPath(raw.slice("storage://".length));
  }

  // Supabase storage URLs. Both the public and the signed shapes carry
  // /storage/v1/object/<kind>/<bucket>/<path>, so one parse covers:
  //
  //   .../storage/v1/object/public/project-photos/admin-upload/x.jpg
  //   .../storage/v1/object/sign/project-photos/admin-upload/x.jpg?token=…
  //
  // A stale signed URL is as good an identifier as a public one — the token is
  // discarded and a fresh link is minted.
  const marker = "/storage/v1/object/";
  const at = raw.indexOf(marker);
  if (at === -1) return null;

  let rest = raw.slice(at + marker.length);

  // Drop the query string and fragment; the token in a signed URL is noise.
  const cut = rest.search(/[?#]/);
  if (cut !== -1) rest = rest.slice(0, cut);

  // Strip the access kind if present. `authenticated` and `upload` appear in
  // other Supabase URL shapes and are handled for the same reason.
  for (const kind of ["public/", "sign/", "authenticated/", "upload/sign/"]) {
    if (rest.startsWith(kind)) {
      rest = rest.slice(kind.length);
      break;
    }
  }

  return splitBucketPath(rest);
}

function splitBucketPath(input: string): MediaRef | null {
  const slash = input.indexOf("/");
  if (slash <= 0) return null;

  const bucket = input.slice(0, slash);
  if (!PRIVATE_SET.has(bucket)) return null;

  // Percent-escapes survive a round trip through a URL; the storage API wants
  // the real key.
  let path: string;
  try {
    path = decodeURIComponent(input.slice(slash + 1));
  } catch {
    path = input.slice(slash + 1);
  }

  // A traversal segment in a stored path should never reach the storage API.
  if (!path || path.split("/").some((seg) => seg === "." || seg === "..")) {
    return null;
  }

  return { bucket, path };
}

/**
 * The reference an upload should store from now on, so a record no longer
 * carries a URL that only happened to work because the bucket was open.
 */
export function storageRef(bucket: string, path: string): string {
  return `storage://${bucket}/${path}`;
}

/**
 * Sign every private-bucket reference in a list of values, in as few calls as
 * the storage API allows: one per bucket, not one per file.
 *
 * Values that are not private-bucket references come back untouched and in
 * their original positions. A signing failure also leaves the value untouched
 * rather than dropping it — a broken image is a better outcome than a silently
 * disappeared one, because somebody notices it.
 */
export async function signMediaValues(
  sb: any,
  values: unknown[],
  ttlSeconds: number = MEDIA_URL_TTL_SECONDS,
): Promise<unknown[]> {
  if (!sb || !Array.isArray(values) || values.length === 0) return values;

  // Group the work by bucket, remembering where each path came from.
  const byBucket = new Map<string, { index: number; path: string }[]>();
  values.forEach((value, index) => {
    const ref = parseStoredMedia(value);
    if (!ref) return;
    const list = byBucket.get(ref.bucket) || [];
    list.push({ index, path: ref.path });
    byBucket.set(ref.bucket, list);
  });

  if (byBucket.size === 0) return values;

  const out = [...values];

  for (const [bucket, entries] of byBucket) {
    try {
      const { data, error } = await sb.storage
        .from(bucket)
        .createSignedUrls(entries.map((e) => e.path), ttlSeconds);
      if (error || !Array.isArray(data)) continue;

      // createSignedUrls answers in request order, and reports per-item
      // failure in the row rather than by throwing.
      data.forEach((row: any, i: number) => {
        const target = entries[i];
        if (!target) return;
        const signed = row?.signedUrl ?? row?.signedURL;
        if (typeof signed === "string" && signed) out[target.index] = signed;
      });
    } catch {
      // Leave this bucket's values as they were.
    }
  }

  return out;
}

/**
 * Sign the photos, videos and blueprints on a `media_attachments` object.
 *
 * Returns a new object; the input is not modified, because these records are
 * read from a shared cache and mutating one would poison every other reader.
 */
export async function signMediaAttachments(
  sb: any,
  media: any,
  ttlSeconds: number = MEDIA_URL_TTL_SECONDS,
): Promise<any> {
  if (!sb || !media || typeof media !== "object") return media;

  const keys = ["photos", "videos", "blueprints", "documents"];
  let changed = false;
  const next: any = { ...media };

  for (const key of keys) {
    const list = (media as any)[key];
    if (!Array.isArray(list) || list.length === 0) continue;
    const signed = await signMediaValues(sb, list, ttlSeconds);
    if (signed !== list) {
      next[key] = signed;
      changed = true;
    }
  }

  return changed ? next : media;
}

/**
 * Sign the media hanging off a work request, wherever it hangs.
 *
 * The field names are inconsistent across this app's history — some records
 * carry `media_attachments`, some `media`, some bare `photos` and `videos` at
 * the top level — so all of them are covered. Returns a new record only when
 * something actually changed, so records without media cost nothing.
 */
export async function signWorkRequestMedia(
  sb: any,
  record: any,
  ttlSeconds: number = MEDIA_URL_TTL_SECONDS,
): Promise<any> {
  if (!sb || !record || typeof record !== "object") return record;

  let next = record;
  const replace = (key: string, value: any) => {
    if (next === record) next = { ...record };
    next[key] = value;
  };

  for (const key of ["media_attachments", "media"]) {
    const media = record[key];
    if (!media || typeof media !== "object") continue;
    const signed = await signMediaAttachments(sb, media, ttlSeconds);
    if (signed !== media) replace(key, signed);
  }

  for (const key of ["photos", "videos", "blueprints"]) {
    const list = record[key];
    if (!Array.isArray(list) || list.length === 0) continue;
    const signed = await signMediaValues(sb, list, ttlSeconds);
    if (signed !== list) replace(key, signed);
  }

  return next;
}

/**
 * Sign the media on a list of work requests.
 *
 * Done per record rather than as one giant batch on purpose: a single list of
 * five hundred records could carry thousands of paths, and one storage call
 * carrying all of them is slower to fail and harder to reason about than many
 * small ones. Records with no media make no calls at all, which is most of
 * them.
 */
export async function signWorkRequestsMedia(
  sb: any,
  records: any[],
  ttlSeconds: number = MEDIA_URL_TTL_SECONDS,
): Promise<any[]> {
  if (!sb || !Array.isArray(records) || records.length === 0) return records;
  return await Promise.all(
    records.map((record) => signWorkRequestMedia(sb, record, ttlSeconds)),
  );
}
