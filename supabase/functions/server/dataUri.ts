/**
 * Splitting a `data:` URI into a media type and its base64.
 *
 * This is the fourth place that needed it. `bid-intake.tsx`,
 * `house-capture.tsx` and `trash-estimator.tsx` each carry a private copy, so
 * rather than add another, here it is once. The three copies are recorded on
 * `tasks/found-not-fixed.md` instead of being changed from here: they are route
 * modules other sessions are actively editing, and a mechanical edit across
 * three of them is a merge conflict for no behavioural gain.
 *
 * Returns null for anything that is not a data URI, which includes a
 * `storage://` ref and a plain URL. Callers skip rather than throw, because one
 * unusable frame out of twelve must not fail the read.
 */
export interface SplitDataUri {
  mediaType: string;
  base64: string;
}

export function splitDataUri(uri: string): SplitDataUri | null {
  const match = /^data:([^;,]+);base64,(.+)$/i.exec(String(uri || '').trim());
  if (!match) return null;
  const mediaType = match[1].toLowerCase();
  const base64 = match[2];
  if (!mediaType.startsWith('image/') || !base64) return null;
  return { mediaType, base64 };
}
