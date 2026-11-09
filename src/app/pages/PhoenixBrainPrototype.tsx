/**
 * The particle Phoenix, on its own, so it can be judged before it is
 * committed to.
 *
 * Deliberately not wired into the Agent page. The brief asks for a prototype
 * first, and there is a practical reason beyond following the instruction:
 * the states have to be seen side by side to know whether THINKING actually
 * reads as thinking, and you cannot get the command centre into seven states
 * on demand. Here they are buttons.
 *
 * The microphone is real — LISTENING is driven by an analyser on your voice,
 * not by a sine wave pretending to be one. SPEAKING is the honest gap: no
 * text-to-speech is connected to this application, so that state has nothing
 * feeding it. The slider underneath exists to show what it will look like
 * when something does, and it is labelled as a slider rather than dressed up
 * as the AI talking.
 */
import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Mic, MicOff, Gauge } from 'lucide-react';
import PhoenixParticleBrain, { type PhoenixState } from '../components/phoenix/PhoenixParticleBrain';
import { budgetFor } from '../components/phoenix/phoenixParticleSource';

const STATES: { id: PhoenixState; label: string; note: string }[] = [
  { id: 'idle',      label: 'Idle',      note: 'Breathing. Slow circulation through the shape.' },
  { id: 'listening', label: 'Listening', note: 'Driven by your microphone, if you allow it.' },
  { id: 'thinking',  label: 'Thinking',  note: 'Currents accelerate; the shape loosens and holds.' },
  { id: 'speaking',  label: 'Speaking',  note: 'Needs TTS. Use the slider to see the behaviour.' },
  { id: 'working',   label: 'Working',   note: 'A stream peels off toward the panel being worked on.' },
  { id: 'success',   label: 'Success',   note: 'One-shot bloom, then it reforms.' },
  { id: 'alert',     label: 'Alert',     note: 'Unrest and a colour shift. Nothing else moves faster.' },
];

export default function PhoenixBrainPrototype({
  onNavigate,
}: { onNavigate?: (page: string) => void }) {
  const [state, setState] = useState<PhoenixState>('idle');
  const [fps, setFps] = useState(0);
  const [count, setCount] = useState(0);
  const [budget, setBudget] = useState<number>(() => budgetFor());
  const [manual, setManual] = useState(0);
  const [micOn, setMicOn] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);
  const [level, setLevel] = useState(0);

  const audio = useRef<{ ctx: AudioContext; stream: MediaStream; raf: number } | null>(null);

  /**
   * Microphone teardown matters more than it looks. Leaving the stream open
   * keeps the browser's recording indicator lit after you have navigated
   * away, which is alarming and fair enough.
   */
  const stopMic = () => {
    const a = audio.current;
    if (!a) return;
    cancelAnimationFrame(a.raf);
    a.stream.getTracks().forEach((t) => t.stop());
    a.ctx.close().catch(() => {});
    audio.current = null;
    setLevel(0);
  };

  useEffect(() => stopMic, []);

  async function startMic() {
    setMicError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const ctx = new AudioContext();
      const src = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      src.connect(analyser);
      const buf = new Uint8Array(analyser.frequencyBinCount);

      const tick = () => {
        analyser.getByteFrequencyData(buf);
        // RMS over the band where speech actually lives. A plain average
        // across all bins sits near zero and barely moves the particles.
        let sum = 0;
        const n = Math.floor(buf.length * 0.4);
        for (let i = 0; i < n; i++) sum += buf[i] * buf[i];
        const rms = Math.sqrt(sum / n) / 255;
        setLevel(Math.min(1, rms * 2.6));
        audio.current!.raf = requestAnimationFrame(tick);
      };

      audio.current = { ctx, stream, raf: 0 };
      audio.current.raf = requestAnimationFrame(tick);
      setMicOn(true);
      setState('listening');
    } catch (e: any) {
      setMicError(e?.name === 'NotAllowedError'
        ? 'Microphone permission refused.'
        : e?.message || 'No microphone available.');
    }
  }

  const toggleMic = () => {
    if (micOn) { stopMic(); setMicOn(false); setState('idle'); } else { startMic(); }
  };

  // Mic while listening; the slider stands in everywhere else.
  const audioLevel = micOn && state === 'listening' ? level : manual;
  const current = STATES.find((s) => s.id === state)!;

  return (
    <div className="flex h-screen flex-col bg-[#060606] text-white">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-[#1F1F1F] px-5 py-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => (onNavigate ? onNavigate('phoenix-ai') : window.history.back())}
            className="rounded-lg p-2 text-gray-400 transition hover:bg-[#1A1A1A] hover:text-white"
            aria-label="Back to Phoenix"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-lg font-semibold">Phoenix particle brain</h1>
            <p className="text-[11px] text-gray-500">
              Prototype — not wired into the Agent page
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-[11px] text-gray-500">
          <Gauge className="h-3.5 w-3.5" />
          <span className={fps && fps < 45 ? 'text-amber-400' : 'text-emerald-400'}>
            {fps || '—'} fps
          </span>
          <span className="text-gray-700">·</span>
          <span>{count.toLocaleString()} particles</span>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        {/* The Phoenix */}
        <div className="relative min-h-0 flex-1">
          {/* A faint ground glow, so the bird sits in space rather than on a void. */}
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                'radial-gradient(ellipse at 50% 55%, rgba(234,88,12,0.10), transparent 62%)',
            }}
          />
          <PhoenixParticleBrain
            state={state}
            audioLevel={audioLevel}
            particleCount={budget}
            onFps={setFps}
            onReady={setCount}
            className="h-full w-full"
          />
        </div>

        {/* Controls */}
        <div className="shrink-0 space-y-5 overflow-y-auto border-t border-[#1F1F1F] p-5 lg:w-80 lg:border-l lg:border-t-0">
          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
              State
            </p>
            <div className="grid grid-cols-2 gap-1.5">
              {STATES.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setState(s.id)}
                  className={`rounded-lg border px-2.5 py-2 text-xs font-medium transition ${
                    state === s.id
                      ? 'border-orange-500/60 bg-orange-500/15 text-orange-200'
                      : 'border-[#262626] bg-[#101010] text-gray-400 hover:border-[#3A3A3A] hover:text-white'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
            <p className="mt-2 text-[11px] leading-relaxed text-gray-500">{current.note}</p>
          </div>

          <div>
            <button
              onClick={toggleMic}
              className={`flex w-full items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-xs font-semibold transition ${
                micOn
                  ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-300'
                  : 'border-[#262626] bg-[#101010] text-gray-300 hover:border-[#3A3A3A]'
              }`}
            >
              {micOn ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
              {micOn ? 'Microphone live' : 'Use my microphone'}
            </button>
            {micError && <p className="mt-1.5 text-[11px] text-rose-400">{micError}</p>}
            {micOn && (
              <div className="mt-2 h-1 overflow-hidden rounded bg-[#1A1A1A]">
                <div
                  className="h-full bg-emerald-400 transition-[width] duration-75"
                  style={{ width: `${Math.round(level * 100)}%` }}
                />
              </div>
            )}
          </div>

          <div>
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-gray-500">
              Audio level (stand-in)
            </label>
            <input
              type="range" min={0} max={100} value={Math.round(manual * 100)}
              onChange={(e) => setManual(Number(e.target.value) / 100)}
              className="w-full accent-orange-500"
            />
            <p className="mt-1 text-[11px] leading-relaxed text-gray-600">
              There is no text-to-speech connected to this application, so SPEAKING
              has nothing real driving it. This slider is what that state will
              receive when something does.
            </p>
          </div>

          <div>
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-gray-500">
              Particles — {budget.toLocaleString()}
            </label>
            <input
              type="range" min={2000} max={60000} step={2000} value={budget}
              onChange={(e) => setBudget(Number(e.target.value))}
              className="w-full accent-orange-500"
            />
            <p className="mt-1 text-[11px] leading-relaxed text-gray-600">
              This machine was budgeted {budgetFor().toLocaleString()} automatically.
              Drag it until the frame rate drops to find the real ceiling here.
            </p>
          </div>

          <div className="rounded-lg border border-[#1F1F1F] bg-[#0C0C0C] p-3">
            <p className="text-[11px] leading-relaxed text-gray-500">
              Every particle sits on a pixel of your actual logo — the PNG's alpha
              channel is the silhouette and its orange outline is sampled
              separately so the edge stays crisp. The body is drawn as glowing
              ember rather than black, because a black hologram on a black screen
              is the bug we just fixed.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
