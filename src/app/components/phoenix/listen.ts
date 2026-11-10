/**
 * Deciding when you have finished speaking.
 *
 * WHY THIS IS A FILE AND NOT THREE LINES IN THE HOOK
 *
 * Every rule here is a judgement that will be wrong for somebody: how
 * quiet counts as quiet, how long a pause means "done" rather than
 * "thinking", how short a clip is too short to pay to transcribe. They are
 * pure functions so `node --test` can hold them still, because the
 * alternative is tuning them by talking at a browser and guessing.
 *
 * Nothing here touches a microphone or a network.
 */

/**
 * The absolute floor. Nothing quieter than this is ever speech.
 *
 * It is only half the test, and on its own it was the wrong half. The
 * microphone runs with automatic gain control on, which exists to make a
 * quiet speaker audible and does so by AMPLIFYING THE ROOM when nobody is
 * talking. A fan, a fridge, a laptop under load — all of it gets pushed up
 * toward speech level, sat above this number continuously, and the detector
 * concluded that somebody had been talking for thirty seconds. Two clips in
 * one test session ran to the cap, and what came back was invented: the
 * transcriber returns a polite sentence for near-silence, the same 88
 * characters over and over, and each one cost a model call to answer.
 *
 * So the real test is relative to the room — see SPEECH_OVER_FLOOR.
 */
export const SILENCE_RMS = 0.016;

/**
 * How far above the room's own noise a sound must sit to be speech.
 *
 * Eight decibels, roughly. Speech in a normal room clears this easily; a
 * fan never does, however loud the fan is, because the floor rises to meet
 * it. That last part is the point: a fixed threshold can only be wrong in
 * one of two directions, and which one depends on the room.
 */
export const SPEECH_OVER_FLOOR = 2.5;

/**
 * The floor stops rising here.
 *
 * Without a ceiling, a genuinely loud room would set a floor so high that
 * no voice could clear it, and he would go quietly deaf in exactly the
 * place where somebody would be shouting at him. Past this the absolute
 * threshold takes over and some noise gets through — which is the better
 * failure, because a wrong transcription can be seen and a deaf assistant
 * cannot be told apart from a broken one.
 */
export const FLOOR_MAX = 0.05;

/**
 * How fast the estimate of the room follows the room, as time constants.
 *
 * Asymmetric on purpose, and the asymmetry is the only thing separating a
 * voice from a fan. A level that FALLS is believed almost at once, so the
 * gate re-arms between syllables. A level that RISES is believed slowly —
 * slowly enough that one sentence cannot lift the floor far, while the dips
 * between its own syllables keep dragging the floor back down. Speech is
 * modulated and noise is not, and in the end that is the whole difference.
 */
export const FLOOR_FALL_MS = 150;
export const FLOOR_RISE_MS = 4_000;

/**
 * Listen to the room before judging it.
 *
 * The floor has to start somewhere, and starting it at zero means the first
 * frames of every clip are measured against the absolute threshold alone.
 * In a room already above that threshold — which is exactly what automatic
 * gain control produces — those frames read as speech, "spoke" latches
 * true, and the clip is sent however quiet the rest of it turns out to be.
 * That is the thirty-second clip of nothing, and no amount of later
 * correction undoes it, because "spoke" does not un-latch.
 *
 * So the first fraction of a second of each clip is spent measuring rather
 * than deciding. The floor takes the QUIETEST level in the window, so a
 * click or a chair cannot set it high, and nothing in the window can count
 * as speech. A clip only ever begins after SILENCE_MS of quiet, so this is
 * three hundred milliseconds of a pause nobody is talking into.
 */
export const WARMUP_MS = 300;

/** Quiet for this long after speech means the sentence is over. */
export const SILENCE_MS = 1100;

/** Never hold the recorder open longer than this. */
export const MAX_UTTERANCE_MS = 30_000;

/** Shorter than this is a cough, and not worth paying to transcribe. */
export const MIN_SPEECH_MS = 350;

/**
 * Give up on a clip in which nobody has said anything.
 *
 * The recorder is restarted rather than left running to the thirty-second
 * cap. Nothing is sent either way — an empty clip is discarded — but a
 * machine left in a quiet room was holding half a megabyte of nothing in
 * memory and rewriting it every thirty seconds. Eight seconds is longer
 * than any gap between pressing talk and starting to speak.
 */
export const IDLE_RESET_MS = 8_000;

export interface ListenState {
  /** Has the level been above the threshold at any point this clip? */
  spoke: boolean;
  /** Milliseconds of speech seen so far. */
  speechMs: number;
  /** Milliseconds since the level last dropped below the threshold. */
  quietMs: number;
  /** Milliseconds since the clip started. */
  elapsedMs: number;
  /**
   * The running estimate of this room with nobody talking in it.
   *
   * Carried in the state rather than held in the hook, so the whole
   * decision stays one pure function of a sequence of levels. Negative
   * means not yet measured — see WARMUP_MS.
   */
  floor: number;
}

export const freshListen = (): ListenState =>
  ({ spoke: false, speechMs: 0, quietMs: 0, elapsedMs: 0, floor: -1 });

/** What a sound has to clear, right now, to count as speech. */
export const threshold = (s: ListenState): number =>
  (s.floor < 0
    ? SILENCE_RMS
    : Math.max(SILENCE_RMS, Math.min(s.floor, FLOOR_MAX) * SPEECH_OVER_FLOOR));

/**
 * Advance the state by one frame. Pure.
 *
 * The exponential steps are expressed with dt rather than per frame, so a
 * machine dropping frames reaches the same conclusion as one that is not —
 * and so a test can hand it one 500ms step instead of thirty of 16ms.
 */
export function advance(s: ListenState, rms: number, dtMs: number): ListenState {
  const level = Number.isFinite(rms) ? Math.max(0, rms) : 0;
  const dt = Math.max(0, dtMs);

  /*
   * Measuring, not deciding. See WARMUP_MS: the quietest level in the
   * window becomes the floor, and nothing here can latch "spoke".
   */
  if (s.elapsedMs < WARMUP_MS) {
    return {
      ...s,
      floor: s.floor < 0 ? level : Math.min(s.floor, level),
      quietMs: s.quietMs + dt,
      elapsedMs: s.elapsedMs + dt,
    };
  }

  const loud = level >= threshold(s);

  /*
   * Falls fast, rises slowly, and is never frozen.
   *
   * Freezing it whenever a frame looked loud was the first attempt, and it
   * contained the very bug it was meant to fix: a room ALREADY above the
   * absolute threshold makes every frame look loud, so the floor never
   * rose, so the room never stopped looking like speech. Rising slowly is
   * what makes speech safe instead — one sentence cannot lift the floor far
   * in four seconds, and the dips between its own syllables pull it back
   * down in a hundred and fifty milliseconds.
   */
  const tau = level < s.floor ? FLOOR_FALL_MS : FLOOR_RISE_MS;
  const floor = s.floor + (level - s.floor) * (1 - Math.exp(-dt / tau));

  return {
    spoke: s.spoke || loud,
    speechMs: s.speechMs + (loud ? dt : 0),
    quietMs: loud ? 0 : s.quietMs + dt,
    elapsedMs: s.elapsedMs + dt,
    floor,
  };
}

export type Decision = 'keep-waiting' | 'send' | 'discard';

/**
 * What to do with the clip so far.
 *
 * 'discard' matters as much as 'send': without it, every pause in an empty
 * room posts a second of silence to a paid endpoint and gets an empty
 * string back, forever, for money.
 */
export function decide(s: ListenState): Decision {
  const ended = s.spoke && s.quietMs >= SILENCE_MS;
  const overrun = s.elapsedMs >= MAX_UTTERANCE_MS;
  // Nobody has said anything for long enough that nobody is going to.
  const idle = !s.spoke && s.elapsedMs >= IDLE_RESET_MS;

  if (!ended && !overrun && !idle) return 'keep-waiting';
  if (!s.spoke) return 'discard';
  if (s.speechMs < MIN_SPEECH_MS) return 'discard';
  return 'send';
}

/**
 * Is the transcript worth sending on as a question?
 *
 * Whisper-family models hallucinate politely on near-silence — "Thank
 * you.", "you", a lone full stop are the common ones, and they arrive
 * looking exactly like something a person said. Asking the assistant about
 * them costs a model call and takes over the screen.
 */
const JUNK = new Set([
  'you', 'thank you', 'thanks', 'thank you.', 'bye', 'bye.', 'okay', 'ok',
  '.', '..', '...', 'uh', 'um', 'hm', 'hmm', 'mm', 'yeah',
]);

export function worthAsking(text: unknown): boolean {
  const t = String(text ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
  if (!t) return false;
  if (JUNK.has(t.replace(/[.!?]+$/, ''))) return false;
  // Two words, or one long one — "invoices" is a fair question, "um" is not.
  const words = t.split(' ').filter(Boolean);
  if (words.length >= 2) return true;
  return words[0].length >= 5;
}

/**
 * The audio formats worth asking a MediaRecorder for, best first.
 *
 * Opus is small and OpenAI accepts it. Safari records mp4/aac instead and
 * will claim support for nothing else, so it has to be in the list — the
 * video recorder in this app learned the same lesson, see
 * `pickRecorderMimeType` in videoCapture.ts.
 */
export const AUDIO_CANDIDATES = [
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/ogg;codecs=opus',
  'audio/mp4',
  'audio/mpeg',
] as const;

export type SupportOracle = (type: string) => boolean;

/** The first candidate this browser admits to supporting, or null. */
export function pickAudioMimeType(oracle?: SupportOracle | null): string | null {
  if (typeof oracle !== 'function') return null;
  for (const type of AUDIO_CANDIDATES) {
    try {
      if (oracle(type)) return type;
    } catch {
      // An oracle that throws is a no, not a crash.
    }
  }
  return null;
}

/* ── the same sentence, again ─────────────────────────────────────────── */

/**
 * How long a question stays "already asked".
 *
 * Long enough to cover a transcriber stuck in a loop, short enough that
 * genuinely repeating yourself still works — which people do, because the
 * commonest reason to say a thing twice is that it did not work the first
 * time.
 */
export const REPEAT_WINDOW_MS = 60_000;

export interface AskedBefore {
  /** Normalised, so punctuation and casing cannot defeat the comparison. */
  text: string;
  at: number;
}

const normalise = (text: unknown): string =>
  String(text ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

/**
 * Is this the same question we just asked?
 *
 * WHY THIS COSTS MONEY WITHOUT IT
 *
 * A transcriber handed near-silence does not return nothing. It returns a
 * plausible sentence — the same one each time, because the same model given
 * the same shaped noise lands in the same place. In one five-minute test
 * session the identical 88 characters came back four times, and each one
 * was handed to the assistant as a fresh question: four Opus calls, four
 * answers, four of them read aloud, none of them asked by a person.
 *
 * Suppressing the repeat is the only one of the three defences that works
 * on a hallucination which READS correctly: `worthAsking` cannot reject it,
 * because a well-formed sentence is exactly what it is looking for.
 */
export function isRepeat(
  text: unknown, last: AskedBefore | null | undefined, now: number,
): boolean {
  if (!last) return false;
  const t = normalise(text);
  if (!t || t !== last.text) return false;
  return now - last.at < REPEAT_WINDOW_MS;
}

/**
 * The record to keep after seeing a transcript.
 *
 * The window SLIDES: a repeat refreshes the timestamp rather than ageing
 * out, so a transcriber returning the same sentence every four seconds is
 * refused indefinitely instead of getting through once a minute.
 */
export const remember = (text: unknown, now: number): AskedBefore =>
  ({ text: normalise(text), at: now });
