/**
 * Keeping enormous inline payloads out of a response.
 *
 * WHY THIS EXISTS
 *
 * A base64 data URI for a photograph is hundreds of kilobytes of string. Edge
 * functions answer over a connection that does not survive several of them in
 * one body — the symptom is a "broken pipe / connection closed" from the
 * function rather than a clean error, so it reads as the platform being flaky
 * rather than as a payload being too big.
 *
 * WHY IT IS A MODULE NOW
 *
 * `stripBase64` is used 106 times in `index.tsx` and was defined in the middle
 * of it, so every block that sanitises a payload was pinned to that file.
 * Moving it is what lets those blocks move. The bodies are unchanged.
 */

/**
 * True only for a real remote URL.
 *
 * Deliberately `https://` and not merely "looks like a URL": a `data:` URI is
 * the thing being guarded against, and an `http://` one is both plaintext and
 * usually a mistake in this codebase.
 */
export function isUrl(v: any): boolean {
  return typeof v === 'string' && v.startsWith('https://');
}

/**
 * Recursively replace any base64 data URI in an object with null.
 *
 * Null rather than omitting the key, so a reader can tell the difference
 * between "there was no image" and "there was one and it is not coming back
 * inline".
 */
export function stripBase64(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'string') {
    return obj.startsWith('data:') ? null : obj;
  }
  if (Array.isArray(obj)) return obj.map(stripBase64);
  if (typeof obj === 'object') {
    const out: Record<string, any> = {};
    for (const k of Object.keys(obj)) out[k] = stripBase64(obj[k]);
    return out;
  }
  return obj;
}
