/**
 * Phoenix's ears, his voice, and his understanding of what you said.
 *
 * THREE THINGS, ONE HOOK, BECAUSE THEY SHARE AN AUDIO CONTEXT
 *
 *  - the microphone, analysed so the particles move while you talk
 *  - speech recognition, so talking actually asks him something
 *  - his own voice, analysed so the particles move while he answers
 *
 * WHY TWO ANALYSERS AND NOT ONE
 *
 * The first version shared a single analyser and connected it to the
 * speakers so his voice could be heard. That connection is permanent —
 * which meant that after he spoke once, THE MICROPHONE WAS WIRED TO THE
 * OUTPUT. You heard yourself, and on a laptop speaker that is a feedback
 * loop. The mic chain now ends at its analyser and goes nowhere else;
 * only the speech chain reaches the destination.
 *
 * WHY THE LEVEL IS A REF
 *
 * It changes sixty times a second and its only consumer is a WebGL
 * uniform. Routing that through React state re-renders the page and the
 * canvas on every frame to deliver one float, while competing for the main
 * thread with the frame it is animating. React is told ten times a second,
 * for the meter alone.
 *
 * WHAT THE MICROPHONE USED TO GET WRONG
 *
 *  1. The AudioContext was never resumed. Browsers construct it SUSPENDED
 *     outside a user gesture, and a suspended analyser returns silence
 *     forever — no error, no warning, just zeros.
 *  2. It measured the frequency domain. Spectral magnitude sits low for
 *     speech and barely moves; the amplitude envelope is the RMS of the
 *     TIME domain and swings across the full range as somebody talks.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { authHeader } from '../../lib/aiActivity';

export type PhoenixVoice = 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer';

/** Deep and level. Phoenix is a chief of staff, not a games console. */
export const DEFAULT_VOICE: PhoenixVoice = 'onyx';

/**
 * HOW THE DEPTH IS ACHIEVED, SINCE OPENAI HAS NO PITCH CONTROL.
 *
 *  1. onyx, the lowest of the six to begin with.
 *  2. tts-1-hd rather than tts-1 — same voice, richer rendering, the low
 *     harmonics survive. $30 per million characters against $15.
 *  3. preservesPitch = false with playbackRate below 1. Browsers default to
 *     time-stretching, which slows the words and keeps the pitch exactly
 *     where it was. Turning it off makes playback behave like tape, so the
 *     voice drops as it slows — the part that actually sounds deeper.
 */
export const DEEP = 0.93;

export interface VoiceSpec {
  id: PhoenixVoice;
  note: string;
  depth?: number;
  hd?: boolean;
}

export const VOICES: VoiceSpec[] = [
  { id: 'onyx',    note: 'Deep, considered — the house voice', depth: DEEP, hd: true },
  { id: 'echo',    note: 'Measured and dry',                   depth: 0.96, hd: true },
  { id: 'fable',   note: 'Warmer, more inflected' },
  { id: 'alloy',   note: 'Neutral, quick' },
  { id: 'nova',    note: 'Bright and direct' },
  { id: 'shimmer', note: 'Soft, airy' },
];

export const specFor = (id: PhoenixVoice): VoiceSpec =>
  VOICES.find((v) => v.id === id) ?? VOICES[0];

const AudioCtx: typeof AudioContext | undefined =
  typeof window !== 'undefined'
    ? (window.AudioContext || (window as any).webkitAudioContext)
    : undefined;

/** Chrome, Edge and Safari have this. Firefox does not, and is told so. */
const SpeechRec: any =
  typeof window !== 'undefined'
    ? ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)
    : undefined;

export interface PhoenixVoiceOptions {
  /**
   * Called with a finished sentence when speech recognition is running.
   * This is what turns the microphone from a visualiser into an input.
   */
  onHeard?: (text: string) => void;
}

export interface PhoenixVoiceApi {
  levelRef: React.MutableRefObject<number>;
  meter: number;

  micOn: boolean;
  micError: string | null;
  startMic: () => Promise<void>;
  stopMic: () => void;

  /** What you are saying right now, before the sentence is finished. */
  heard: string;
  /**
   * Spikes to 1 on every word the recogniser hears.
   *
   * The ambient field ripples from this rather than from an amplitude,
   * because the microphone stream had to go — it was stopping the
   * recogniser from acquiring the device. A word is a coarser impulse
   * than a waveform, but it is a REAL one: it fires when you actually
   * said something, not when a door closed near the laptop.
   */
  pulseRef: React.MutableRefObject<number>;
  /** False in Firefox, which has no SpeechRecognition. Say so, do not fake it. */
  canListen: boolean;
  /**
   * What the recogniser is doing, in one word, for the screen.
   *
   * Added because "it still cannot hear me" is unanswerable from here: a
   * recogniser that never starts, one that starts and closes instantly,
   * and one that is listening to a muted microphone all look identical.
   */
  recState: 'off' | 'starting' | 'listening' | 'restarting' | 'error';

  speaking: boolean;
  speakError: string | null;
  lastCostCents: number | null;
  lastModel: string | null;
  speak: (text: string, voice?: PhoenixVoice) => Promise<void>;
  stopSpeaking: () => void;

  contextState: string | null;
}

export function usePhoenixVoice(opts: PhoenixVoiceOptions = {}): PhoenixVoiceApi {
  const { onHeard } = opts;
  // Held in a ref so the recognition handlers always call the current one
  // without having to tear the recogniser down and rebuild it each render.
  const heardCb = useRef(onHeard);
  heardCb.current = onHeard;

  const levelRef = useRef(0);
  const pulseRef = useRef(0);
  const [meter, setMeter] = useState(0);
  const [micOn, setMicOn] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);
  const [heard, setHeard] = useState('');
  const [recState, setRecState] = useState<PhoenixVoiceApi['recState']>('off');
  const [speaking, setSpeaking] = useState(false);
  const [speakError, setSpeakError] = useState<string | null>(null);
  const [lastCostCents, setLastCostCents] = useState<number | null>(null);
  const [lastModel, setLastModel] = useState<string | null>(null);
  const [contextState, setContextState] = useState<string | null>(null);

  const ctxRef = useRef<AudioContext | null>(null);
  /** Mic chain. Ends here — deliberately never reaches the destination. */
  const micAnalyser = useRef<AnalyserNode | null>(null);
  /** Speech chain. This one does reach the speakers. */
  const voiceAnalyser = useRef<AnalyserNode | null>(null);

  const micRef = useRef<{ stream: MediaStream; node: MediaStreamAudioSourceNode } | null>(null);
  const speechRef = useRef<{ el: HTMLAudioElement; node: MediaElementAudioSourceNode; url: string } | null>(null);
  const recRef = useRef<any>(null);
  const wantRec = useRef(false);
  /**
   * Consecutive sessions that ended without producing a word.
   *
   * Chrome closes a recognition session after a pause, which is normal and
   * is why onend restarts it. But a session that ends INSTANTLY, over and
   * over, is a different thing — usually the microphone being held
   * elsewhere — and restarting it forever is a silent infinite loop that
   * looks exactly like a feature that does not work.
   */
  const emptyEnds = useRef(0);
  const sessionHeard = useRef(false);

  const rafRef = useRef(0);
  const bufRef = useRef<Uint8Array | null>(null);

  const makeAnalyser = (ctx: AudioContext) => {
    const a = ctx.createAnalyser();
    a.fftSize = 1024;
    // Low, because this drives motion. The browser default of 0.8 smears a
    // consonant across a third of a second and the particles lag the voice.
    a.smoothingTimeConstant = 0.45;
    return a;
  };

  /** One context for everything; two analysers hanging off it. */
  const context = useCallback(async () => {
    if (!AudioCtx) throw new Error('This browser has no Web Audio support.');
    if (!ctxRef.current || ctxRef.current.state === 'closed') {
      const ctx = new AudioCtx();
      ctxRef.current = ctx;
      micAnalyser.current = makeAnalyser(ctx);
      voiceAnalyser.current = makeAnalyser(ctx);
      // Only the speech chain is audible. Connected once, here, rather than
      // on every utterance — repeating it stacks duplicate edges.
      voiceAnalyser.current.connect(ctx.destination);
      bufRef.current = new Uint8Array(1024);
    }
    // A context built outside a gesture starts suspended, and a suspended
    // analyser reports silence indefinitely without erroring.
    if (ctxRef.current.state === 'suspended') await ctxRef.current.resume();
    setContextState(ctxRef.current.state);
    return ctxRef.current;
  }, []);

  const stopLoop = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = 0;
    levelRef.current = 0;
    setMeter(0);
  }, []);

  /**
   * One loop. It reads whichever analyser is live, preferring his voice —
   * if he is talking, that is what the particles should be moving to, even
   * if the microphone happens to be open at the same time.
   */
  const runLoop = useCallback(() => {
    if (rafRef.current) return;
    let lastPush = 0;

    const tick = (now: number) => {
      const a = speechRef.current ? voiceAnalyser.current : micAnalyser.current;
      const buf = bufRef.current;
      if (a && buf) {
        // Time domain: an amplitude envelope. 128 is silence; the deviation
        // from it is the waveform.
        a.getByteTimeDomainData(buf);
        let sum = 0;
        for (let i = 0; i < buf.length; i++) {
          const v = (buf[i] - 128) / 128;
          sum += v * v;
        }
        const rms = Math.sqrt(sum / buf.length);
        // Speech RMS rarely exceeds ~0.25, so scale into a usable range and
        // clamp rather than letting a cough saturate everything.
        levelRef.current = Math.min(1, rms * 3.6);
        if (now - lastPush > 100) { lastPush = now; setMeter(levelRef.current); }
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
  }, []);

  /* ── understanding ─────────────────────────────────────────────────── */

  const startRecognition = useCallback(() => {
    if (!SpeechRec) return;
    if (recRef.current) return;

    const rec = new SpeechRec();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = 'en-US';

    rec.onresult = (e: any) => {
      // Every word throws a ring outward through the dust.
      pulseRef.current = 1;
      sessionHeard.current = true;
      emptyEnds.current = 0;
      setRecState('listening');
      let interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        const text = String(r[0]?.transcript || '').trim();
        if (!text) continue;
        if (r.isFinal) {
          setHeard('');
          // A finished sentence is a question. Two words is a cough or the
          // tail of somebody else's conversation, and asking the model
          // about it costs money and interrupts whatever is on screen.
          if (text.split(/\s+/).length >= 2) heardCb.current?.(text);
        } else {
          interim += ` ${text}`;
        }
      }
      if (interim.trim()) setHeard(interim.trim());
    };

    rec.onerror = (e: any) => {
      // 'no-speech' is ordinary — a pause. Everything else gets named,
      // including 'aborted', which used to be swallowed and is exactly
      // what a microphone held by another process looks like.
      if (!e?.error || e.error === 'no-speech') return;
      setRecState('error');
      setMicError(
        e.error === 'not-allowed'
          ? 'Microphone permission was refused. Allow it in the padlock menu, then press talk again.'
          : e.error === 'audio-capture'
            ? 'No microphone could be opened. Another application or tab may be holding it.'
            : e.error === 'network'
              ? 'Speech recognition needs a network connection and could not reach it.'
              : `Speech recognition stopped: ${e.error}`,
      );
    };

    // Chrome ends the session on its own after a pause. Restart while the
    // microphone is meant to be open, or it listens once and gives up.
    rec.onend = () => {
      recRef.current = null;
      if (!wantRec.current) { setRecState('off'); return; }

      // A session that produced nothing is suspicious; several in a row is
      // a loop. Stop and say why rather than spin silently.
      if (!sessionHeard.current) emptyEnds.current += 1; else emptyEnds.current = 0;
      if (emptyEnds.current >= 6) {
        wantRec.current = false;
        setRecState('error');
        setMicError('The recogniser keeps closing straight away. Another tab or application is probably holding the microphone.');
        return;
      }

      setRecState('restarting');
      try { startRecognition(); } catch { setRecState('error'); }
    };

    rec.onstart = () => { setRecState('listening'); };
    rec.onaudiostart = () => { setRecState('listening'); };

    sessionHeard.current = false;
    recRef.current = rec;
    setRecState('starting');
    try {
      rec.start();
    } catch (err: any) {
      // InvalidStateError means one is already running; anything else is
      // worth showing.
      recRef.current = null;
      if (err?.name !== 'InvalidStateError') {
        setRecState('error');
        setMicError(err?.message || 'Speech recognition would not start.');
      }
    }
  }, []);

  const stopRecognition = useCallback(() => {
    wantRec.current = false;
    emptyEnds.current = 0;
    const rec = recRef.current;
    recRef.current = null;
    setHeard('');
    setRecState('off');
    try { rec?.abort?.(); rec?.stop(); } catch { /* already stopped */ }
  }, []);

  /* ── ears ──────────────────────────────────────────────────────────── */

  const stopMic = useCallback(() => {
    stopRecognition();
    const m = micRef.current;
    if (m) {
      m.node.disconnect();
      // Tracks must be stopped explicitly or the browser keeps its
      // recording indicator lit after you have navigated away.
      m.stream.getTracks().forEach((t) => t.stop());
      micRef.current = null;
    }
    setMicOn(false);
    if (!speechRef.current) stopLoop();
  }, [stopLoop, stopRecognition]);

  /**
   * NO getUserMedia HERE, DELIBERATELY.
   *
   * The first version opened a microphone stream for the analyser and then
   * started the recogniser on top of it. In Chrome the recogniser opens
   * its OWN capture, and a page already holding the device frequently
   * stops it acquiring one — it fires onend immediately, forever, and the
   * old code restarted it silently. That is what "it still cannot hear me"
   * was: a loop, running perfectly, producing nothing.
   *
   * Dropping the stream costs nothing real. The mic analyser drove the
   * particles, and the particles are deliberately deaf while listening —
   * audio gain is zero in every state but SPEAKING, because watching him
   * twitch while you talk read as nervousness. So the stream was powering
   * a meter and blocking the feature it was supposed to support.
   *
   * The live transcript under the mark is better feedback than a meter
   * ever was: it shows the actual words, not that sound exists.
   */
  const startMic = useCallback(async () => {
    setMicError(null);
    if (!SpeechRec) {
      setMicError('This browser cannot transcribe speech. Chrome, Edge or Safari can; Firefox cannot. Type the question instead.');
      return;
    }
    setMicOn(true);
    wantRec.current = true;
    emptyEnds.current = 0;
    startRecognition();
  }, [startRecognition]);

  /* ── voice ─────────────────────────────────────────────────────────── */

  const stopSpeaking = useCallback(() => {
    const s = speechRef.current;
    speechRef.current = null;
    if (s) {
      s.el.pause();
      s.node.disconnect();
      // Each utterance is a blob held in memory until this is called.
      URL.revokeObjectURL(s.url);
    }
    setSpeaking(false);
    if (!micRef.current) stopLoop();
  }, [stopLoop]);

  const speak = useCallback(async (text: string, voice: PhoenixVoice = DEFAULT_VOICE) => {
    setSpeakError(null);
    stopSpeaking();
    const said = String(text || '').trim();
    if (!said) return;

    try {
      const spec = specFor(voice);
      const { API_BASE_URL } = await import('../../lib/apiConfig');
      const res = await fetch(`${API_BASE_URL}/make-server-3eae23a6/phoenix/speak`, {
        method: 'POST',
        headers: { ...(await authHeader()), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: said,
          voice,
          model: spec.hd ? 'tts-1-hd' : 'tts-1',
          speed: 1,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(
          body?.stopped ? `${body.error} (the emergency stop is engaged)`
            : body?.error || `The voice service returned ${res.status}.`,
        );
      }

      const cents = Number(res.headers.get('X-Phoenix-Cost-Cents'));
      setLastCostCents(Number.isFinite(cents) ? cents : null);
      setLastModel(res.headers.get('X-Phoenix-Model'));

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const el = new Audio(url);
      el.crossOrigin = 'anonymous';

      /*
       * The depth. preservesPitch defaults to TRUE, which time-stretches —
       * slower words at the same pitch, which sounds tired rather than
       * deep. Three spellings because Safari and older Firefox each
       * shipped their own before it was standardised.
       */
      if (spec.depth && spec.depth !== 1) {
        (el as any).preservesPitch = false;
        (el as any).mozPreservesPitch = false;
        (el as any).webkitPreservesPitch = false;
        el.playbackRate = spec.depth;
      }

      const ctx = await context();
      const node = ctx.createMediaElementSource(el);
      // Into the speech analyser, which is the one wired to the speakers.
      node.connect(voiceAnalyser.current!);

      speechRef.current = { el, node, url };
      setSpeaking(true);
      runLoop();

      el.onended = () => stopSpeaking();
      el.onerror = () => { setSpeakError('The audio could not be played.'); stopSpeaking(); };
      await el.play();
    } catch (e: any) {
      // NotAllowedError here is the autoplay policy, which is worth naming:
      // "could not speak" sends somebody looking for a broken API key.
      setSpeakError(
        e?.name === 'NotAllowedError'
          ? 'The browser blocked the audio. Click anywhere on the page and ask again.'
          : e?.message || 'Phoenix could not speak.',
      );
      setSpeaking(false);
    }
  }, [context, runLoop, stopSpeaking]);

  /* Everything torn down on unmount, including the context itself. */
  useEffect(() => () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    wantRec.current = false;
    try { recRef.current?.stop(); } catch { /* already stopped */ }
    micRef.current?.stream.getTracks().forEach((t) => t.stop());
    if (speechRef.current) {
      speechRef.current.el.pause();
      URL.revokeObjectURL(speechRef.current.url);
    }
    ctxRef.current?.close().catch(() => {});
  }, []);

  return {
    levelRef, meter,
    micOn, micError, startMic, stopMic,
    heard, canListen: !!SpeechRec, recState, pulseRef,
    speaking, speakError, lastCostCents, lastModel, speak, stopSpeaking,
    contextState,
  };
}
