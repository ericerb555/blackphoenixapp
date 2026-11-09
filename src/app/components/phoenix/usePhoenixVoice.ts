/**
 * Phoenix's ears and voice, as one thing.
 *
 * They are one hook because they share a problem: both produce an audio
 * level sixty times a second, and that level has to reach a WebGL shader
 * without going through React.
 *
 * WHY THE LEVEL IS A REF AND NOT STATE
 *
 * The first version called setLevel() every animation frame. That re-renders
 * the page, the canvas component and everything under it sixty times a
 * second, to deliver one float — and it competes for the main thread with
 * the frame it is trying to animate. The particle loop reads `levelRef`
 * directly inside useFrame; React is told about the level ten times a
 * second, purely so the meter in the UI can move.
 *
 * WHY THE MICROPHONE DID NOT WORK
 *
 * Two reasons, and the first is the one that made it dead rather than
 * merely bad:
 *
 *  1. The AudioContext was never resumed. Browsers create it SUSPENDED
 *     unless construction happens inside a user gesture, and a suspended
 *     context's analyser returns a buffer of silence forever. No error, no
 *     warning — getByteFrequencyData just keeps writing zeros.
 *  2. It measured the frequency domain. getByteFrequencyData returns
 *     spectral magnitude in dB-ish bytes, which for speech sits low and
 *     moves little. The amplitude envelope — what you actually want when
 *     you are asking "how loud is this right now" — is the RMS of the TIME
 *     domain, and it swings across the full range as somebody talks.
 *
 * Both are fixed below, and `contextState` is reported so a future failure
 * says which of the two it is instead of looking like a broken feature.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { authHeader } from '../../lib/aiActivity';

export type PhoenixVoice = 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer';

/** Deep and level. Phoenix is a chief of staff, not a games console. */
export const DEFAULT_VOICE: PhoenixVoice = 'onyx';

export const VOICES: { id: PhoenixVoice; note: string }[] = [
  { id: 'onyx',    note: 'Deep, level, unhurried' },
  { id: 'echo',    note: 'Measured and dry' },
  { id: 'fable',   note: 'Warmer, more inflected' },
  { id: 'alloy',   note: 'Neutral, quick' },
  { id: 'nova',    note: 'Bright and direct' },
  { id: 'shimmer', note: 'Soft, airy' },
];

type Ctor = typeof AudioContext;
const AudioCtx: Ctor | undefined =
  typeof window !== 'undefined'
    ? (window.AudioContext || (window as any).webkitAudioContext)
    : undefined;

export interface PhoenixVoiceApi {
  /** Live 0..1 amplitude. Read this in a render loop, not in React. */
  levelRef: React.MutableRefObject<number>;
  /** The same number, updated ~10×/s, for anything that must re-render. */
  meter: number;

  micOn: boolean;
  micError: string | null;
  startMic: () => Promise<void>;
  stopMic: () => void;

  speaking: boolean;
  speakError: string | null;
  /** Cost of the last utterance in cents, as the server reported it. */
  lastCostCents: number | null;
  speak: (text: string, voice?: PhoenixVoice) => Promise<void>;
  stopSpeaking: () => void;

  /** 'running' | 'suspended' | 'closed' | null. Diagnostic, shown in the UI. */
  contextState: string | null;
}

export function usePhoenixVoice(): PhoenixVoiceApi {
  const levelRef = useRef(0);
  const [meter, setMeter] = useState(0);
  const [micOn, setMicOn] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);
  const [speaking, setSpeaking] = useState(false);
  const [speakError, setSpeakError] = useState<string | null>(null);
  const [lastCostCents, setLastCostCents] = useState<number | null>(null);
  const [contextState, setContextState] = useState<string | null>(null);

  const ctxRef = useRef<AudioContext | null>(null);
  const micRef = useRef<{ stream: MediaStream; node: MediaStreamAudioSourceNode } | null>(null);
  const speechRef = useRef<{ el: HTMLAudioElement; node: MediaElementAudioSourceNode; url: string } | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef(0);
  const bufRef = useRef<Uint8Array | null>(null);

  /** One context for everything. Creating one per utterance leaks them. */
  const context = useCallback(async () => {
    if (!AudioCtx) throw new Error('This browser has no Web Audio support.');
    if (!ctxRef.current || ctxRef.current.state === 'closed') {
      ctxRef.current = new AudioCtx();
      const a = ctxRef.current.createAnalyser();
      a.fftSize = 1024;
      // Low, because this drives motion. The browser default of 0.8 smears
      // a consonant across a third of a second and the particles lag the voice.
      a.smoothingTimeConstant = 0.45;
      analyserRef.current = a;
      bufRef.current = new Uint8Array(a.fftSize);
    }
    // THE FIX. A context built outside a gesture starts suspended, and a
    // suspended analyser reports silence indefinitely without erroring.
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

  /** One loop, whichever source is feeding the analyser. */
  const runLoop = useCallback(() => {
    if (rafRef.current) return;
    let lastPush = 0;

    const tick = (now: number) => {
      const a = analyserRef.current;
      const buf = bufRef.current;
      if (a && buf) {
        // Time domain, not frequency: this is an amplitude envelope.
        // 128 is silence; the deviation from it is the waveform.
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

        // React hears about it ten times a second, for the meter only.
        if (now - lastPush > 100) {
          lastPush = now;
          setMeter(levelRef.current);
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
  }, []);

  /* ── ears ──────────────────────────────────────────────────────────── */

  const stopMic = useCallback(() => {
    const m = micRef.current;
    if (m) {
      m.node.disconnect();
      // Tracks must be stopped explicitly or the browser keeps its recording
      // indicator lit after you have navigated away, which is alarming.
      m.stream.getTracks().forEach((t) => t.stop());
      micRef.current = null;
    }
    setMicOn(false);
    if (!speechRef.current) stopLoop();
  }, [stopLoop]);

  const startMic = useCallback(async () => {
    setMicError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          // Echo cancellation on, so Phoenix's own voice through the speakers
          // does not come back in and make it appear to hear itself.
          echoCancellation: true,
          // Noise suppression OFF: it gates quiet speech to digital silence,
          // and quiet speech is exactly when you want to see it being heard.
          noiseSuppression: false,
          autoGainControl: true,
        },
      });
      const ctx = await context();
      const node = ctx.createMediaStreamSource(stream);
      node.connect(analyserRef.current!);
      micRef.current = { stream, node };
      setMicOn(true);
      runLoop();
    } catch (e: any) {
      const name = e?.name;
      setMicError(
        name === 'NotAllowedError' ? 'Microphone permission was refused. Allow it in the padlock menu.'
          : name === 'NotFoundError' ? 'No microphone is attached.'
            : name === 'NotReadableError' ? 'Another application is holding the microphone.'
              : e?.message || 'The microphone could not be opened.',
      );
      setMicOn(false);
    }
  }, [context, runLoop]);

  /* ── voice ─────────────────────────────────────────────────────────── */

  const stopSpeaking = useCallback(() => {
    const s = speechRef.current;
    if (s) {
      s.el.pause();
      s.node.disconnect();
      // Revoking matters: each utterance is a blob held in memory until it is.
      URL.revokeObjectURL(s.url);
      speechRef.current = null;
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
      const { API_BASE_URL } = await import('../../lib/apiConfig');
      const res = await fetch(`${API_BASE_URL}/make-server-3eae23a6/phoenix/speak`, {
        method: 'POST',
        headers: { ...(await authHeader()), 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: said, voice }),
      });

      if (!res.ok) {
        // The failure body is JSON even though success is audio.
        const body = await res.json().catch(() => ({}));
        throw new Error(
          body?.stopped ? `${body.error} (the emergency stop is engaged)`
            : body?.error || `The voice service returned ${res.status}.`,
        );
      }

      const cents = Number(res.headers.get('X-Phoenix-Cost-Cents'));
      setLastCostCents(Number.isFinite(cents) ? cents : null);

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const el = new Audio(url);
      el.crossOrigin = 'anonymous';

      const ctx = await context();
      const node = ctx.createMediaElementSource(el);
      node.connect(analyserRef.current!);
      // Also to the speakers. An analyser is a sink: connect only to it and
      // the audio is measured perfectly and heard by nobody.
      analyserRef.current!.connect(ctx.destination);

      speechRef.current = { el, node, url };
      setSpeaking(true);
      runLoop();

      el.onended = () => stopSpeaking();
      el.onerror = () => { setSpeakError('The audio could not be played.'); stopSpeaking(); };
      await el.play();
    } catch (e: any) {
      setSpeakError(e?.message || 'Phoenix could not speak.');
      setSpeaking(false);
    }
  }, [context, runLoop, stopSpeaking]);

  /* Everything torn down on unmount, including the context itself. */
  useEffect(() => () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
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
    speaking, speakError, lastCostCents, speak, stopSpeaking,
    contextState,
  };
}
