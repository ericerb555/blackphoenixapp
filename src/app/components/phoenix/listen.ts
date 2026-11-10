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

/** Below this RMS counts as silence. Room tone sits well under it. */
export const SILENCE_RMS = 0.012;

/** Quiet for this long after speech means the sentence is over. */
export const SILENCE_MS = 1100;

/** Never hold the recorder open longer than this. */
export const MAX_UTTERANCE_MS = 30_000;

/** Shorter than this is a cough, and not worth paying to transcribe. */
export const MIN_SPEECH_MS = 350;

export interface ListenState {
  /** Has the level been above the threshold at any point this clip? */
  spoke: boolean;
  /** Milliseconds of speech seen so far. */
  speechMs: number;
  /** Milliseconds since the level last dropped below the threshold. */
  quietMs: number;
  /** Milliseconds since the clip started. */
  elapsedMs: number;
}

export const freshListen = (): ListenState =>
  ({ spoke: false, speechMs: 0, quietMs: 0, elapsedMs: 0 });

/** Advance the state by one frame. Pure. */
export function advance(s: ListenState, rms: number, dtMs: number): ListenState {
  const loud = rms >= SILENCE_RMS;
  return {
    spoke: s.spoke || loud,
    speechMs: s.speechMs + (loud ? dtMs : 0),
    quietMs: loud ? 0 : s.quietMs + dtMs,
    elapsedMs: s.elapsedMs + dtMs,
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

  if (!ended && !overrun) return 'keep-waiting';
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
