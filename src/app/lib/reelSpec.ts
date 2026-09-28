/**
 * What the platforms will actually accept, decided before a minute of
 * rendering is spent on a file they will refuse.
 *
 * WHY THIS EXISTS
 *
 * The Video Studio exported WebM/VP9 and handed it to the browser as a
 * download. Instagram, Facebook Reels and TikTok all refuse WebM — Meta's API
 * does not even say so usefully:
 *
 *   "only MP4/MOV with H.264 codec work — other formats silently fail with
 *    error code 24"
 *
 * A silent failure after a long upload and a transcode queue is the worst
 * possible way to learn that the format was wrong, so the check happens here,
 * in front, where it can be said in a sentence.
 *
 * NOTHING HERE TALKS TO A PLATFORM. These are pure rules, so they can be
 * tested — the publishing code itself cannot be, without a connected account.
 */

/**
 * The MIME types worth recording, best first.
 *
 * H.264 in MP4 is the only combination all three platforms take. The AAC audio
 * profile is named explicitly (`mp4a.40.2`) because a recorder that produces
 * MP4 with Opus audio is still refused, and that is a confusing way to fail.
 *
 * The bare `video/mp4` fallback is last and deliberate: a browser that accepts
 * it without a codec string will pick its own, which is usually H.264, and a
 * probably-right MP4 beats a certainly-wrong WebM.
 */
export const REEL_MIME_CANDIDATES = [
  'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
  'video/mp4;codecs=avc1.4D401E,mp4a.40.2',
  'video/mp4;codecs=avc1,mp4a.40.2',
  'video/mp4',
] as const;

export interface RecordingFormat {
  mimeType: string;
  /** `mp4` can be posted. `webm` can only be downloaded. */
  container: 'mp4' | 'webm';
  extension: 'mp4' | 'webm';
  postable: boolean;
}

/**
 * The best format this browser can actually record.
 *
 * `isTypeSupported` is asked rather than assumed because Chromium builds ship
 * without H.264 and AAC for licensing reasons even where the hardware has
 * them. So "Chrome supports MP4 recording" is true of Chrome and not of every
 * browser calling itself Chromium, and guessing produces a file that fails
 * much later with error code 24.
 *
 * Falling back to WebM is right — an export somebody can download and edit is
 * better than no export — but it is returned marked `postable: false` so the
 * caller must decide what to say rather than quietly offering to publish it.
 */
export function pickRecordingFormat(
  isSupported: (mime: string) => boolean = (mime) =>
    typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(mime),
): RecordingFormat {
  for (const mimeType of REEL_MIME_CANDIDATES) {
    try {
      if (isSupported(mimeType)) {
        return { mimeType, container: 'mp4', extension: 'mp4', postable: true };
      }
    } catch {
      // A browser that throws on a codec string it dislikes is saying no.
    }
  }

  for (const mimeType of ['video/webm;codecs=vp9,opus', 'video/webm']) {
    try {
      if (isSupported(mimeType)) {
        return { mimeType, container: 'webm', extension: 'webm', postable: false };
      }
    } catch { /* keep trying */ }
  }

  // Nothing matched. Say WebM and let the recorder itself refuse, rather than
  // claiming a postable format we have no evidence for.
  return { mimeType: 'video/webm', container: 'webm', extension: 'webm', postable: false };
}

/**
 * The reel rules, from Meta's own API specification for programmatic posting,
 * which is stricter than what the app will let a human upload by hand:
 * 9:16 only, 3 to 90 seconds, 24–60 fps.
 *
 * TikTok and Facebook Reels are not more permissive in the ways that matter
 * here, so one set of rules covers all three rather than three that differ by
 * a second and invite a post that passes one check and fails another.
 */
export const REEL_RULES = {
  aspect: 9 / 16,
  /** Half a percent, so 1080×1920 passes and 1080×1900 does not. */
  aspectTolerance: 0.005,
  minSeconds: 3,
  maxSeconds: 90,
  minFps: 24,
  maxFps: 60,
} as const;

export interface ReelCheck {
  ok: boolean;
  /** Every reason it would be refused, so they are fixed in one pass. */
  problems: string[];
}

/**
 * Would the platforms take this?
 *
 * Every problem is collected rather than returning at the first, because
 * finding out about the aspect ratio, then the length, then the frame rate on
 * three separate attempts is three renders wasted.
 */
export function checkReel(input: {
  width: number;
  height: number;
  seconds: number;
  fps: number;
  container?: string;
}): ReelCheck {
  const problems: string[] = [];
  const { width, height, seconds, fps, container } = input;

  if (!(width > 0) || !(height > 0)) {
    problems.push('The video has no size.');
  } else {
    const ratio = width / height;
    if (Math.abs(ratio - REEL_RULES.aspect) > REEL_RULES.aspectTolerance) {
      problems.push(
        `Reels must be 9:16 — this is ${width}×${height}. Choose the 9:16 Reels/Shorts size.`,
      );
    }
  }

  if (!Number.isFinite(seconds) || seconds < REEL_RULES.minSeconds) {
    problems.push(`Reels must run at least ${REEL_RULES.minSeconds} seconds — this is ${Math.round(seconds || 0)}.`);
  } else if (seconds > REEL_RULES.maxSeconds) {
    problems.push(`Reels can run at most ${REEL_RULES.maxSeconds} seconds — this is ${Math.round(seconds)}.`);
  }

  if (!Number.isFinite(fps) || fps < REEL_RULES.minFps || fps > REEL_RULES.maxFps) {
    problems.push(`Reels need ${REEL_RULES.minFps}–${REEL_RULES.maxFps} frames per second — this is ${fps || 0}.`);
  }

  if (container && container !== 'mp4') {
    problems.push('Reels must be MP4 with H.264 video. This browser recorded WebM, which every platform refuses.');
  }

  return { ok: problems.length === 0, problems };
}

/** The total running time of a set of scenes, which is what gets checked. */
export function totalSeconds(scenes: Array<{ seconds?: number }>): number {
  return (scenes || []).reduce((sum, s) => sum + Math.max(0, Number(s?.seconds) || 0), 0);
}
