/**
 * Choosing a video format the browser in front of you can actually record.
 *
 * WHY THIS IS A .ts AND NOT INLINE IN THE TWO COMPONENTS
 *
 * It was inline in both, identically wrong in both, and the test runner strips
 * types from `.ts` only — so the rule that decides whether a customer can
 * record at all could not be checked by hand. One copy, tested.
 *
 * WHAT WAS WRONG
 *
 * `InlineVideoCapture` and `AdvancedVideoCapture` each did this:
 *
 *     const options = { mimeType: 'video/webm;codecs=vp9' };
 *     if (!MediaRecorder.isTypeSupported(options.mimeType)) {
 *       options.mimeType = 'video/webm';
 *     }
 *     const mediaRecorder = new MediaRecorder(stream, options);
 *
 * iOS Safari's MediaRecorder supports **`video/mp4` only** —
 * `isTypeSupported('video/webm')` is false there. So the fallback was to a
 * second unsupported type and the constructor threw: a customer on an iPhone
 * tapped record and got an error. Every iPhone, every time.
 *
 * And where it did record, the type was hard-coded twice more — `new Blob(...,
 * { type: 'video/webm' })` and an upload filename ending `.webm` — so even an
 * Android clip was stored under a type nothing had checked.
 *
 * WHY MP4 IS TRIED FIRST
 *
 * Not because iOS needs it first — the list is tried in order and iOS would
 * reach it anyway. Because a webm recorded on Chrome **will not play in
 * Safari**, and the people reviewing a customer's walkthrough do it on
 * whatever phone is in their hand. An mp4 plays everywhere. Chrome has
 * supported recording h264 in mp4 for years, so preferring it costs Chrome
 * nothing and makes the file universally viewable.
 *
 * The server already accepts all three: `VIDEO_TYPES` in `design-projects.tsx`
 * maps mp4, mov and webm.
 */

/**
 * In preference order. Each is a complete `isTypeSupported` string, because a
 * bare `video/mp4` can be supported while `video/mp4;codecs=avc1` is not, and
 * the reverse — asking for exactly what we will record is the only reliable
 * question.
 */
export const RECORDER_CANDIDATES = [
  'video/mp4;codecs=avc1',
  'video/mp4',
  'video/webm;codecs=vp9',
  'video/webm;codecs=vp8',
  'video/webm',
] as const;

/** Just enough of MediaRecorder to ask the question, so this can be tested. */
export interface TypeSupportOracle {
  isTypeSupported?: (type: string) => boolean;
}

/**
 * The best type this browser will record, or null to let MediaRecorder choose.
 *
 * NULL IS A REAL ANSWER AND MUST NOT BE TREATED AS FAILURE. A `MediaRecorder`
 * constructed with no options records in whatever the browser's own default
 * is, which is exactly what we want when none of the candidates is recognised.
 * The old code's mistake was the opposite: it insisted on a type it had just
 * been told was unsupported.
 */
export function pickRecorderMimeType(oracle?: TypeSupportOracle | null): string | null {
  const supported = oracle?.isTypeSupported;
  // No oracle at all — an old browser, or a test. Let the recorder decide
  // rather than asserting a format nothing has confirmed.
  if (typeof supported !== 'function') return null;

  for (const candidate of RECORDER_CANDIDATES) {
    try {
      if (supported.call(oracle, candidate)) return candidate;
    } catch {
      // A browser that throws on the question has answered it.
    }
  }
  return null;
}

/**
 * The file extension for a recorded blob's type.
 *
 * Read from what the recorder SAYS it produced — `mediaRecorder.mimeType`
 * after construction — never from what we asked for. A browser is free to
 * honour the request approximately, and the stored file should be named after
 * what is in it.
 *
 * Defaults to `mp4` rather than `webm` when the type is unreadable: an unknown
 * video off a phone is far more likely to be mp4, and the previous default of
 * webm is what mislabelled the Android uploads.
 */
export function extensionForMimeType(mimeType?: string | null): string {
  const type = String(mimeType || '').toLowerCase();
  if (type.includes('webm')) return 'webm';
  if (type.includes('quicktime') || type.includes('/mov')) return 'mov';
  if (type.includes('mp4')) return 'mp4';
  return 'mp4';
}

/**
 * A sentence for somebody whose browser cannot record at all.
 *
 * Reached when `MediaRecorder` is missing entirely, which is the honest case
 * for an old in-app webview. It names the way out rather than only the
 * problem, because the photo path works on everything and is the better
 * evidence for a cleanout estimate anyway.
 */
export const NO_RECORDER_MESSAGE =
  'This browser cannot record video. Use "Take a video" to open your phone\'s own '
  + 'camera instead, or send photos — several photos are usually clearer than a clip.';

/** Is in-page recording available at all? */
export function canRecordInPage(scope: { MediaRecorder?: unknown } = globalThis as any): boolean {
  return typeof (scope as any)?.MediaRecorder === 'function';
}
