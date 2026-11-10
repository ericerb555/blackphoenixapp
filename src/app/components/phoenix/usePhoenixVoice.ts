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
import {
  advance, decide, freshListen, worthAsking, pickAudioMimeType,
  isRepeat, remember, type AskedBefore,
} from './listen';

export type PhoenixVoice = 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer';

/**
 * Deep, and soft rather than firm.
 *
 * onyx is the lowest of the six and it is also the hardest — a newsreader
 * voice, all chest and no warmth. Pitching a WARMER voice down gets you
 * depth without the edge, and dropping pitch is itself a softening: it
 * moves energy out of the harsh 2-4kHz band where sibilance lives.
 *
 * fable at 0.90 lands lower than onyx does naturally, and keeps the
 * roundness. onyx is still one tap away for anyone who wants the
 * authority instead.
 */
export const DEFAULT_VOICE: PhoenixVoice = 'fable';

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
  /** Browser playback rate. Below 1 with preservesPitch off lowers pitch. */
  depth?: number;
  /**
   * Server-side pace, which OpenAI applies WITHOUT changing pitch.
   *
   * This is the half that was missing. Dropping the playback rate to 0.93
   * lowered the pitch — the point — and also made him seven percent slower,
   * which came out as a drawl. Asking the API to speak faster by the same
   * factor cancels the pace and leaves the pitch exactly where it was:
   * 1.12 x 0.93 is 1.04, so he lands marginally brisker than normal and a
   * semitone down.
   */
  speed?: number;
  hd?: boolean;
}

export const VOICES: VoiceSpec[] = [
  // Ordered by how much they sound like Phoenix, not alphabetically.
  { id: 'fable',   note: 'Deep and soft — the house voice', depth: 0.90, speed: 1.14, hd: true },
  { id: 'onyx',    note: 'Deep and firm',                   depth: DEEP, speed: 1.12, hd: true },
  { id: 'echo',    note: 'Measured, dry',                   depth: 0.94, speed: 1.08, hd: true },
  { id: 'shimmer', note: 'Soft and light',                  depth: 0.95, speed: 1.07 },
  { id: 'alloy',   note: 'Neutral, quick' },
  { id: 'nova',    note: 'Bright and direct' },
];

export const specFor = (id: PhoenixVoice): VoiceSpec =>
  VOICES.find((v) => v.id === id) ?? VOICES[0];

const AudioCtx: typeof AudioContext | undefined =
  typeof window !== 'undefined'
    ? (window.AudioContext || (window as any).webkitAudioContext)
    : undefined;

/**
 * Can this browser listen at all?
 *
 * MediaRecorder rather than SpeechRecognition, because the recording is
 * ours now and the transcription happens on the server. This is true in
 * every browser that matters, including the ones SpeechRecognition
 * silently refused to work in.
 */
const canListen =
  typeof window !== 'undefined' && typeof (window as any).MediaRecorder !== 'undefined';

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
  recState: 'off' | 'starting' | 'listening' | 'thinking' | 'error';
  /**
   * What the browser says about microphone permission for this origin.
   *
   * Worth asking directly. A site that was refused the microphone once
   * keeps being refused silently — SpeechRecognition just ends instantly
   * forever — and there is no way to tell that apart from a recogniser
   * that is working and hearing nothing. 'denied' is a specific thing a
   * person can fix in ten seconds if somebody tells them.
   */
  micPermission: 'granted' | 'denied' | 'prompt' | 'unknown';

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
  const [micPermission, setMicPermission] = useState<PhoenixVoiceApi['micPermission']>('unknown');
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
  const watchRef = useRef(0);
  /**
   * What to do with the clip the recorder is about to hand back.
   *
   * MediaRecorder.onstop carries no reason, so the decision has to be
   * parked here by whoever called stop(). Defaulting to 'discard' means a
   * stop from anywhere else — closing the microphone, a page unload —
   * never silently posts a clip nobody asked for.
   */
  const pendingVerdict = useRef<'send' | 'discard'>('discard');
  /**
   * The last thing we handed on as a question, and when.
   *
   * A transcriber given a quiet room returns a plausible sentence rather
   * than nothing, the same one every time — four identical transcripts in
   * one test session, each asked of the assistant as though somebody had
   * said it, each costing a model call and an answer read aloud. See
   * isRepeat in listen.ts.
   */
  const askedBefore = useRef<AskedBefore | null>(null);
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

  /**
   * Phrases waiting to be sent as one question.
   *
   * With continuous recognition a single spoken sentence arrives as
   * SEVERAL final results, one per pause — so "what needs my attention
   * today" could fire two or three separate questions, each getting its
   * own answer, all of them read aloud at once. They are collected here
   * and sent together once you have actually stopped talking.
   */
  const pending = useRef<string[]>([]);
  const settle = useRef<ReturnType<typeof setTimeout> | null>(null);

  const rafRef = useRef(0);
  const bufRef = useRef<Uint8Array | null>(null);
  /** A second buffer, so the silence detector never fights the visualiser. */
  const micBuf = useRef<Uint8Array | null>(null);

  /**
   * Which utterance is the current one.
   *
   * speak() stops whatever is playing and then AWAITS a fetch. Two calls
   * close together both get past the stop, both wait, and both start
   * playing — the second overwrites speechRef so the first is never
   * paused again and the two talk over each other. Bumping a token on
   * entry and checking it after every await is what makes the last
   * request win cleanly.
   */
  const utterance = useRef(0);

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
      micBuf.current = new Uint8Array(1024);
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

  /**
   * The microphone's own level, read straight from its analyser.
   *
   * Deliberately NOT levelRef. That one prefers HIS voice whenever he is
   * talking, because its job is to move the particles, and handing it to
   * the silence detector made his speech look like yours: the recorder
   * stopped at the end of his sentences and posted the clip, so he
   * transcribed himself and answered his own answer, for money, in a loop.
   * Echo cancellation runs before this analyser, so what is measured here
   * is you and not the speakers.
   */
  const micRms = useCallback(() => {
    const a = micAnalyser.current;
    const buf = micBuf.current;
    if (!a || !buf) return 0;
    a.getByteTimeDomainData(buf);
    let sum = 0;
    for (let i = 0; i < buf.length; i++) {
      const v = (buf[i] - 128) / 128;
      sum += v * v;
    }
    return Math.sqrt(sum / buf.length);
  }, []);

  /* ── understanding ───────────────────────────────────────────────── */

  /**
   * TRANSCRIPTION HAPPENS ON OUR SERVER, NOT IN THE BROWSER.
   *
   * The browser's SpeechRecognition was tried first and abandoned. It is
   * absent in Firefox, disabled in Brave, gated behind Google API keys in
   * unbranded Chromium — and its failure mode in all of those is to end
   * the session instantly and say nothing at all. Four rounds of "it
   * cannot hear me" went past without the browser ever explaining itself,
   * and I could not see which build was in front of it.
   *
   * MediaRecorder is everywhere, behaves the same everywhere, and errors
   * out loud. The clip goes to gpt-4o-mini-transcribe at three tenths of a
   * cent per minute — a five-second question costs a fortieth of a cent,
   * which is a fair price for a feature that works in every browser.
   *
   * Holding the stream is fine now. The conflict was only ever with
   * SpeechRecognition wanting the same device, and there is no
   * SpeechRecognition any more. So the analyser is back, which means the
   * ambient dust ripples to your actual waveform rather than to one ring
   * per word.
   */
  const sendClip = useCallback(async (blob: Blob, seconds: number) => {
    try {
      setRecState('thinking');
      const { API_BASE_URL } = await import('../../lib/apiConfig');
      const res = await fetch(`${API_BASE_URL}/make-server-3eae23a6/phoenix/transcribe`, {
        method: 'POST',
        headers: {
          ...(await authHeader()),
          'Content-Type': blob.type || 'audio/webm',
          'X-Audio-Seconds': String(Math.round(seconds)),
        },
        body: blob,
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || !body?.success) {
        throw new Error(body?.error || `Transcription failed (${res.status}).`);
      }
      const text = String(body.text || '').trim();
      setHeard(text);

      /*
       * Shown above whatever happens, asked only if it is new. Echoing it
       * on screen is how somebody can see that he heard the room rather
       * than them — silently dropping it would look like the microphone
       * had stopped working again.
       */
      const now = Date.now();
      if (worthAsking(text)) {
        const again = isRepeat(text, askedBefore.current, now);
        askedBefore.current = remember(text, now);
        if (!again) heardCb.current?.(text);
      }
      // Clear the echo after a moment so the next clip starts clean.
      setTimeout(() => setHeard((h) => (h === text ? '' : h)), 2500);
    } catch (e: any) {
      setMicError(e?.message || 'That could not be transcribed.');
    } finally {
      if (wantRec.current) setRecState('listening');
    }
  }, []);

  /* ── ears ──────────────────────────────────────────────────────────── */

  const stopMic = useCallback(() => {
    wantRec.current = false;
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = 0; }

    const rec = recRef.current;
    recRef.current = null;
    try { if (rec && rec.state !== 'inactive') rec.stop(); } catch { /* already stopped */ }

    const m = micRef.current;
    if (m) {
      m.node.disconnect();
      // Stopped explicitly, or the browser keeps its recording indicator
      // lit after you have navigated away.
      m.stream.getTracks().forEach((t) => t.stop());
      micRef.current = null;
    }

    setMicOn(false);
    setHeard('');
    setRecState('off');
    if (!speechRef.current) stopLoop();
  }, [stopLoop]);

  const startMic = useCallback(async () => {
    setMicError(null);

    const RecorderCtor: any = (window as any).MediaRecorder;
    if (!RecorderCtor) {
      setMicError('This browser cannot record audio, so it cannot listen. Chrome, Edge, Safari and Firefox all can.');
      return;
    }
    const mime = pickAudioMimeType((t) => RecorderCtor.isTypeSupported?.(t));
    if (!mime) {
      setMicError('This browser offers no audio format we can record.');
      return;
    }

    setRecState('starting');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          // On, so his own voice through the speakers does not come back.
          echoCancellation: true,
          // Off: it gates quiet speech to digital silence, and the
          // silence detector below would then think you had stopped.
          noiseSuppression: false,
          autoGainControl: true,
        },
      });

      const ctx = await context();
      const node = ctx.createMediaStreamSource(stream);
      node.connect(micAnalyser.current!);   // and nowhere near the speakers
      micRef.current = { stream, node };

      wantRec.current = true;
      setMicOn(true);
      setRecState('listening');
      runLoop();

      /*
       * One recorder, restarted per utterance. Chunks accumulate until the
       * silence detector says the sentence is over; then they are sent and
       * the next clip begins. A single long recording would mean waiting
       * until you pressed stop to hear anything back.
       */
      let chunks: BlobPart[] = [];
      let started = Date.now();
      let listen = freshListen();
      let last = performance.now();

      const recorder = new RecorderCtor(stream, { mimeType: mime });
      recRef.current = recorder;

      recorder.ondataavailable = (e: any) => {
        if (e.data && e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = () => {
        const parts = chunks;
        const seconds = (Date.now() - started) / 1000;
        chunks = [];
        const verdict = pendingVerdict.current;
        pendingVerdict.current = 'discard';

        if (verdict === 'send' && parts.length) {
          sendClip(new Blob(parts, { type: mime }), seconds);
        }

        // Straight back to listening unless the microphone was closed.
        if (wantRec.current && recRef.current === recorder) {
          started = Date.now();
          listen = freshListen();
          try { recorder.start(250); } catch { /* closing */ }
        }
      };

      recorder.onerror = (e: any) => {
        setMicError(`The recorder failed: ${e?.error?.name || 'unknown'}`);
        setRecState('error');
      };

      recorder.start(250);

      /*
       * The silence detector. Reads the same analyser that drives the
       * particles, so there is exactly one measurement of your voice on
       * this page and the visuals cannot disagree with the logic.
       */
      const watch = () => {
        if (!wantRec.current) return;
        const now = performance.now();
        const dt = Math.min(200, now - last);
        last = now;

        listen = advance(listen, micRms(), dt);
        const verdict = decide(listen);
        if (verdict !== 'keep-waiting' && recorder.state === 'recording') {
          pendingVerdict.current = verdict;
          try { recorder.stop(); } catch { /* closing */ }
        }
        watchRef.current = requestAnimationFrame(watch);
      };
      watchRef.current = requestAnimationFrame(watch);
    } catch (e: any) {
      const name = e?.name;
      setRecState('error');
      setMicOn(false);
      wantRec.current = false;
      setMicError(
        name === 'NotAllowedError' || name === 'SecurityError'
          ? 'Microphone permission was refused. Click the padlock in the address bar, set Microphone to Allow, then press talk again.'
          : name === 'NotFoundError' ? 'No microphone could be found on this machine.'
            : name === 'NotReadableError' ? 'Another application is holding the microphone.'
              : e?.message || 'The microphone could not be opened.',
      );
    }
  }, [context, runLoop, sendClip, micRms]);

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

    const mine = ++utterance.current;
    const stale = () => utterance.current !== mine;

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
          speed: spec.speed ?? 1,
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

      if (stale()) return;

      const blob = await res.blob();
      if (stale()) return;
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

      if (stale()) {
        // Superseded while the audio was being fetched. Release the blob
        // rather than leaving it to the garbage collector's mercy.
        URL.revokeObjectURL(url);
        return;
      }

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

  /*
   * Ask once on mount, and keep listening for changes — a person who
   * fixes the permission in the padlock menu should see the screen agree
   * with them without reloading.
   *
   * Firefox does not implement the 'microphone' permission name and
   * throws; that is an 'unknown', not a failure.
   */
  useEffect(() => {
    const perms = (navigator as any)?.permissions;
    if (!perms?.query) return;
    let status: any = null;
    const onChange = () => setMicPermission(status?.state || 'unknown');
    perms.query({ name: 'microphone' as PermissionName })
      .then((s: any) => { status = s; onChange(); s.addEventListener?.('change', onChange); })
      .catch(() => setMicPermission('unknown'));
    return () => status?.removeEventListener?.('change', onChange);
  }, []);

  /* Everything torn down on unmount, including the context itself. */
  useEffect(() => () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (settle.current) clearTimeout(settle.current);
    if (watchRef.current) cancelAnimationFrame(watchRef.current);
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
    heard, canListen, recState, pulseRef, micPermission,
    speaking, speakError, lastCostCents, lastModel, speak, stopSpeaking,
    contextState,
  };
}
