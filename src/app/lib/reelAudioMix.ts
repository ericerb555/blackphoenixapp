/**
 * Music under a voice, without burying it.
 *
 * Eric: "connect the music".
 *
 * WHY THIS IS NOT JUST "PLAY A SECOND AUDIO FILE"
 *
 * A reel with a music bed at a flat volume is the single commonest way an
 * otherwise good video reads as amateur. Either the track is loud enough to
 * carry the video and the narration disappears under it, or it is quiet
 * enough to hear every word and it may as well not be there.
 *
 * What a professional edit does is DUCK: the bed plays at full level where
 * nobody is talking, drops several dB under every line of voiceover, and
 * comes back up in the gaps. It is the difference between a video with music
 * on it and a video that was mixed.
 *
 * This works out the gain automation for that — a list of (time, gain)
 * points to hand to a `GainNode`. It computes, so it can be tested; the
 * renderer schedules, because an AudioContext cannot be.
 *
 * WHY RAMPS AND NOT STEPS
 *
 * A gain that jumps discontinuously is audible as a click, and at the start
 * of every narration line that is worse than no ducking at all. Every change
 * here is a ramp with a stated duration, and the duck starts slightly BEFORE
 * the line it is making room for — a bed that drops on the first syllable
 * has already stepped on it.
 */

/** A stretch of the reel where somebody is speaking. */
export interface NarrationSpan {
  start: number;
  end: number;
}

export interface MusicMixOptions {
  /** How long the finished reel runs. */
  reelSeconds: number;
  /** Where the voiceover is. Empty means music carries the whole thing. */
  narration?: NarrationSpan[];
  /** Bed level with nobody talking, 0–1. */
  volume?: number;
  /** Level under narration, 0–1. Below `volume` or it is not ducking. */
  duckTo?: number;
  /** Seconds to come up at the top. */
  fadeIn?: number;
  /** Seconds to go out at the end. */
  fadeOut?: number;
}

/** One point on the automation curve. */
export interface GainPoint {
  /** Seconds from the start of the reel. */
  time: number;
  /** Linear gain, 0–1. */
  gain: number;
}

/** Bed level when nothing is competing with it. */
export const DEFAULT_MUSIC_VOLUME = 0.5;
/**
 * Level under narration. About -13 dB from the default bed, which is the
 * region broadcast ducking tends to sit in — far enough to be out of the way,
 * not so far that the music seems to drop out and come back.
 */
export const DEFAULT_DUCK_TO = 0.11;
/** How long the bed takes to get out of the way, and to come back. */
export const DUCK_DOWN_SECONDS = 0.25;
export const DUCK_UP_SECONDS = 0.45;
/**
 * The duck starts before the line does. A bed that drops on the first
 * syllable has already stepped on it.
 */
export const DUCK_LEAD_SECONDS = 0.18;

const clamp01 = (n: unknown): number => {
  const v = Number(n);
  if (!Number.isFinite(v)) return 0;
  return v < 0 ? 0 : v > 1 ? 1 : v;
};

const seconds = (n: unknown, fallback = 0): number => {
  const v = Number(n);
  return Number.isFinite(v) && v >= 0 ? v : fallback;
};

/**
 * Merge overlapping or touching narration spans.
 *
 * Two lines a tenth of a second apart are one stretch of talking, and
 * ducking back up between them produces an audible swell in the gap — the
 * exact artefact that makes a mix sound automated.
 */
export function mergeSpans(spans: NarrationSpan[], gap = DUCK_UP_SECONDS + DUCK_LEAD_SECONDS): NarrationSpan[] {
  const list = (Array.isArray(spans) ? spans : [])
    .map((s) => ({ start: seconds(s?.start), end: seconds(s?.end) }))
    .filter((s) => s.end > s.start)
    .sort((a, b) => a.start - b.start);

  const out: NarrationSpan[] = [];
  for (const span of list) {
    const last = out[out.length - 1];
    if (last && span.start - last.end <= gap) {
      last.end = Math.max(last.end, span.end);
    } else {
      out.push({ ...span });
    }
  }
  return out;
}

/**
 * The gain curve for the music bed.
 *
 * Always starts at 0 and ends at 0 — a reel that begins with music already
 * at level, or stops dead on the last frame, sounds like a clip of something
 * longer rather than a finished thing.
 */
export function musicGainPlan(options: MusicMixOptions): GainPoint[] {
  const total = seconds(options?.reelSeconds);
  if (!(total > 0)) return [];

  const bed = clamp01(options?.volume ?? DEFAULT_MUSIC_VOLUME);
  // Ducking to a level at or above the bed is not ducking. Treated as a
  // mistake rather than honoured, because the audible result is a bed that
  // gets LOUDER under the voice.
  const ducked = Math.min(clamp01(options?.duckTo ?? DEFAULT_DUCK_TO), bed);

  let fadeIn = Math.min(seconds(options?.fadeIn, 0.8), total / 2);
  let fadeOut = Math.min(seconds(options?.fadeOut, 1.2), total / 2);
  if (fadeIn + fadeOut > total) { fadeIn = total / 2; fadeOut = total / 2; }

  /**
   * TWO LAYERS, NOT ONE LIST OF ANCHORS.
   *
   * The first version wrote fade and duck anchors into a single list, and
   * they fought: the fade-out anchor set the level back to full bed, so a
   * reel narrated end to end had its music ramp up over the voice for the
   * last several seconds. A test caught it, which is the only reason this
   * is two layers.
   *
   * So the DUCK is a base level over time, the FADE is an envelope
   * multiplied over it, and neither can overwrite the other.
   */
  const base: GainPoint[] = [{ time: 0, gain: bed }];
  for (const span of mergeSpans(options?.narration || [])) {
    const downAt = Math.max(0, span.start - DUCK_LEAD_SECONDS);
    base.push({ time: downAt, gain: bed });
    base.push({ time: Math.min(downAt + DUCK_DOWN_SECONDS, total), gain: ducked });
    base.push({ time: Math.min(span.end, total), gain: ducked });
    base.push({ time: Math.min(span.end + DUCK_UP_SECONDS, total), gain: bed });
  }
  base.push({ time: total, gain: bed });

  const ordered = base
    .filter((p) => Number.isFinite(p.time) && p.time >= 0 && p.time <= total)
    .sort((a, b) => a.time - b.time);

  const levelAt = (t: number): number => {
    if (t <= ordered[0].time) return ordered[0].gain;
    for (let i = 1; i < ordered.length; i++) {
      const a = ordered[i - 1];
      const b = ordered[i];
      if (t <= b.time) {
        const width = b.time - a.time;
        return width <= 0 ? b.gain : a.gain + ((b.gain - a.gain) * (t - a.time)) / width;
      }
    }
    return ordered[ordered.length - 1].gain;
  };

  /** Up at the top, down at the end. Multiplied over whatever the duck says. */
  const envelope = (t: number): number => {
    const up = fadeIn > 0 ? Math.min(t / fadeIn, 1) : 1;
    const down = fadeOut > 0 ? Math.min((total - t) / fadeOut, 1) : 1;
    return Math.max(0, Math.min(up, down));
  };

  // Every moment either layer changes direction has to be sampled, or a ramp
  // straight through it would cut the corner off.
  const times = new Set<number>([0, total]);
  for (const p of ordered) times.add(p.time);
  if (fadeIn > 0) times.add(fadeIn);
  if (fadeOut > 0) times.add(total - fadeOut);

  const plan: GainPoint[] = [];
  for (const time of [...times].sort((a, b) => a - b)) {
    if (time < 0 || time > total) continue;
    const gain = clamp01(levelAt(time) * envelope(time));
    const last = plan[plan.length - 1];
    /*
     * Strictly increasing time, always. `linearRampToValueAtTime` on a time
     * that is not after the previous one is undefined behaviour in the Web
     * Audio API, and the symptom is silence rather than an error — a reel
     * that renders with no music and no message.
     */
    if (last && time - last.time < 1e-3) { last.gain = gain; continue; }
    plan.push({ time, gain });
  }
  return plan;
}

/**
 * Narration spans read off the storyboard.
 *
 * A beat that carries a voice track is assumed to be talking for its whole
 * window. The alternative is decoding every clip to find its true length
 * before the curve can be built, which costs a round of decoding to gain
 * about a tenth of a second of accuracy at each end — and erring long is the
 * safe direction, because the cost of ducking slightly too much is nothing
 * and the cost of ducking slightly too little is a word lost under a snare.
 */
export function narrationSpansOf(
  slides: Array<{ duration?: number; audioUrl?: string | null }>,
): NarrationSpan[] {
  const spans: NarrationSpan[] = [];
  let at = 0;
  for (const slide of Array.isArray(slides) ? slides : []) {
    const length = seconds(slide?.duration);
    if (slide?.audioUrl && length > 0) spans.push({ start: at, end: at + length });
    at += length;
  }
  return spans;
}
