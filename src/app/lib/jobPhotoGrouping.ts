/**
 * Job photographs, grouped by the job they are of.
 *
 * WHY A FILE AND NOT THREE LINES IN THE COMPONENT
 *
 * The same reason `invoiceLineSelection` and `quotePdfSelection` have one: it
 * decides what a person is shown, and the failure it guards against is silent.
 * A grouping that quietly drops photographs looks identical to a company that
 * has not taken many — which is exactly how the Before & After Creator spent
 * its whole life showing an empty library while reading the wrong key off the
 * gallery response. Nothing threw. The panel just said "nothing in it yet".
 *
 * THE RULE THAT MATTERS: A MISSING JOB NEVER HIDES A PHOTO
 *
 * Almost every photograph already in the library predates jobs being stamped
 * at upload, and plenty taken afterwards will have none either — the button
 * sits on three home screens where nobody has a job in hand. So "no job" is
 * the normal case, not an error, and it has to stay reachable. The unfiltered
 * list is the default and the ungrouped photos get a bucket of their own.
 *
 * WHERE A PHOTO'S ADDRESS LIVES
 *
 * Four different spellings, because this list is shared with JobPhotos and
 * assembled from records written by different paths at different times: an
 * uploaded gallery row keeps it in `image`, a linked one in `sourceUrl`, and
 * signed/plain URLs appear on rows that came from elsewhere. Reading only one
 * of them is the other half of the bug above.
 */

export interface JobPhoto {
  id?: string;
  url?: string;
  signedUrl?: string;
  image?: string;
  sourceUrl?: string;
  title?: string;
  published?: boolean;
  jobId?: string;
  jobTitle?: string;
}

export interface JobWithPhotos {
  id: string;
  label: string;
  count: number;
}

/** Every photo with no job on it belongs to this bucket. */
export const NO_JOB = '__none';

const clean = (v: unknown): string => String(v ?? '').trim();

/**
 * Wherever this particular record keeps its address, or '' when it has none.
 *
 * A row with no usable address is not a photograph as far as any caller is
 * concerned, and returning '' rather than undefined lets one falsy check do
 * the filtering.
 */
export function photoSrc(photo: JobPhoto | null | undefined): string {
  if (!photo) return '';
  return clean(photo.signedUrl) || clean(photo.image)
    || clean(photo.url) || clean(photo.sourceUrl);
}

/** Photographs that can actually be drawn. */
export function usablePhotos(
  photos: readonly JobPhoto[] | null | undefined,
): JobPhoto[] {
  return (photos ?? []).filter((p) => p && photoSrc(p));
}

/**
 * The jobs that have photographs, most photographed first.
 *
 * Derived from the photos themselves rather than from a job list, because the
 * only jobs worth offering are the ones with something to show — and every
 * job the company has ever opened would bury them. It also means a caller
 * needs no permission beyond the one that fetched the photos.
 *
 * The label is whatever was stamped at upload, falling back to the id: a job
 * whose title never made it across is still better offered as an opaque id
 * than silently dropped, because its photographs are real.
 */
export function jobsWithPhotos(
  photos: readonly JobPhoto[] | null | undefined,
): JobWithPhotos[] {
  const seen = new Map<string, JobWithPhotos>();

  for (const photo of photos ?? []) {
    const id = clean(photo?.jobId);
    if (!id) continue;
    const found = seen.get(id);
    if (found) {
      found.count += 1;
      // A later row may carry the title an earlier one lacked.
      if (found.label === found.id && clean(photo?.jobTitle)) {
        found.label = clean(photo.jobTitle).slice(0, 70);
      }
    } else {
      seen.set(id, {
        id,
        label: (clean(photo?.jobTitle) || id).slice(0, 70),
        count: 1,
      });
    }
  }

  return [...seen.values()].sort((a, b) =>
    b.count - a.count || a.label.localeCompare(b.label));
}

/**
 * The photographs to show for a filter.
 *
 * An empty filter means everything, which is the default and deliberately so.
 * An unknown job id returns nothing rather than everything — showing the whole
 * library when a filter matched nothing is how somebody puts another
 * customer's bathroom in an advertisement.
 */
export function photosForJob(
  photos: readonly JobPhoto[] | null | undefined,
  jobId: string,
): JobPhoto[] {
  const all = (photos ?? []).filter(Boolean) as JobPhoto[];
  const wanted = clean(jobId);
  if (!wanted) return all;
  if (wanted === NO_JOB) return all.filter((p) => !clean(p?.jobId));
  return all.filter((p) => clean(p?.jobId) === wanted);
}

/** How many photographs are not filed to any job. */
export function unfiledCount(
  photos: readonly JobPhoto[] | null | undefined,
): number {
  return (photos ?? []).filter((p) => p && !clean(p.jobId)).length;
}
