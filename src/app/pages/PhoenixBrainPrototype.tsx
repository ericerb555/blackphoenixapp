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
 * Both the ears and the voice are real. LISTENING runs an analyser on your
 * microphone; SPEAKING runs the same analyser on Phoenix's own generated
 * speech, so the particles move to the actual waveform of the words rather
 * than to a plausible-looking envelope.
 *
 * The gap that remains is smaller and worth naming: Phoenix speaks text you
 * type here. Having it speak its own answers is a change to the chat page,
 * not to this prototype.
 */
import { useEffect, useState } from 'react';
import { ArrowLeft, Mic, MicOff, Gauge, Volume2, Square } from 'lucide-react';
import PhoenixParticleBrain, { type PhoenixState } from '../components/phoenix/PhoenixParticleBrain';
import { budgetFor } from '../components/phoenix/phoenixParticleSource';
import {
  usePhoenixVoice, VOICES, DEFAULT_VOICE, type PhoenixVoice,
} from '../components/phoenix/usePhoenixVoice';

const STATES: { id: PhoenixState; label: string; note: string }[] = [
  { id: 'idle',      label: 'Idle',      note: 'Breathing. Slow circulation through the shape.' },
  { id: 'listening', label: 'Listening', note: 'Driven by your microphone, if you allow it.' },
  { id: 'thinking',  label: 'Thinking',  note: 'Currents accelerate; the shape loosens and holds.' },
  { id: 'speaking',  label: 'Speaking',  note: "Driven by the waveform of Phoenix's own voice." },
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
  const [voice, setVoice] = useState<PhoenixVoice>(DEFAULT_VOICE);
  const [line, setLine] = useState(
    'Four quotes are out for eighteen thousand, and two invoices are overdue.',
  );

  const v = usePhoenixVoice();

  /*
   * The state follows the audio, not the other way round, so what you see is
   * always what is actually happening to the sound.
   */
  useEffect(() => {
    if (v.speaking) setState('speaking');
    else if (v.micOn) setState('listening');
  }, [v.speaking, v.micOn]);

  const current = STATES.find((s) => s.id === state)!;
  const pct = Math.round(v.meter * 100);

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
            <h1 className="text-lg font-semibold">Phoenix</h1>
            <p className="text-[11px] text-gray-500">
              Particle brain — prototype, not on the Agent page yet
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
          {/*
            The audio context's state, on screen. It is the thing that was
            silently wrong before — a suspended context reports silence
            forever without erroring, which looks like a broken feature.
          */}
          {v.contextState && (
            <>
              <span className="text-gray-700">·</span>
              <span className={v.contextState === 'running' ? 'text-emerald-400' : 'text-amber-400'}>
                audio {v.contextState}
              </span>
            </>
          )}
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        {/* Phoenix */}
        <div className="relative min-h-0 flex-1">
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background: 'linear-gradient(180deg, #070707 0%, #000000 100%)',
            }}
          />
          <PhoenixParticleBrain
            state={state}
            audioLevelRef={v.levelRef}
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

          {/* One meter, whichever source is live. */}
          <div>
            <div className="mb-1 flex items-center justify-between text-[11px] text-gray-500">
              <span>{v.speaking ? 'Phoenix speaking' : v.micOn ? 'Hearing you' : 'No audio'}</span>
              <span>{pct}%</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded bg-[#1A1A1A]">
              <div
                className={`h-full transition-[width] duration-100 ${
                  v.speaking ? 'bg-orange-400' : 'bg-emerald-400'
                }`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>

          <div>
            <button
              onClick={() => {
                if (v.micOn) { v.stopMic(); setState('idle'); } else { v.startMic(); }
              }}
              className={`flex w-full items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-xs font-semibold transition ${
                v.micOn
                  ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-300'
                  : 'border-[#262626] bg-[#101010] text-gray-300 hover:border-[#3A3A3A]'
              }`}
            >
              {v.micOn ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
              {v.micOn ? 'Microphone live' : 'Use my microphone'}
            </button>
            {v.micError && <p className="mt-1.5 text-[11px] text-rose-400">{v.micError}</p>}
          </div>

          {/* Voice */}
          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
              The voice
            </p>
            <div className="grid grid-cols-3 gap-1.5">
              {VOICES.map((x) => (
                <button
                  key={x.id}
                  onClick={() => setVoice(x.id)}
                  title={x.note}
                  className={`rounded-lg border px-2 py-1.5 text-[11px] font-medium capitalize transition ${
                    voice === x.id
                      ? 'border-orange-500/60 bg-orange-500/15 text-orange-200'
                      : 'border-[#262626] bg-[#101010] text-gray-400 hover:border-[#3A3A3A] hover:text-white'
                  }`}
                >
                  {x.id}
                </button>
              ))}
            </div>
            <p className="mt-1.5 text-[11px] text-gray-600">
              {VOICES.find((x) => x.id === voice)?.note}
            </p>

            <textarea
              rows={3}
              value={line}
              onChange={(e) => setLine(e.target.value)}
              className="mt-2 w-full resize-none rounded-lg border border-[#262626] bg-[#101010] px-3 py-2 text-xs text-white placeholder:text-gray-600 focus:border-orange-500/50 focus:outline-none"
              placeholder="Give Phoenix something to say…"
            />

            <div className="mt-2 flex gap-2">
              <button
                onClick={() => v.speak(line, voice)}
                disabled={v.speaking || !line.trim()}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-orange-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-orange-500 disabled:opacity-40"
              >
                <Volume2 className="h-4 w-4" />
                {v.speaking ? 'Speaking…' : 'Speak'}
              </button>
              {v.speaking && (
                <button
                  onClick={v.stopSpeaking}
                  className="rounded-lg border border-[#262626] px-3 py-2 text-xs text-gray-400 hover:text-white"
                  aria-label="Stop speaking"
                >
                  <Square className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {v.speakError && <p className="mt-1.5 text-[11px] text-rose-400">{v.speakError}</p>}
            <p className="mt-1.5 text-[11px] leading-relaxed text-gray-600">
              {v.lastCostCents !== null && `Last line cost ${v.lastCostCents.toFixed(4)}¢. `}
              tts-1 bills $15 per million characters — roughly a third of a cent
              per hundred words. Every line is on the ledger as{' '}
              <span className="text-gray-500">phoenix-voice</span>, and the
              emergency stop silences it like anything else.
            </p>
          </div>

          <div>
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-gray-500">
              Particles — {budget.toLocaleString()}
            </label>
            <input
              type="range" min={4000} max={110000} step={2000} value={budget}
              onChange={(e) => setBudget(Number(e.target.value))}
              className="w-full accent-orange-500"
            />
            <p className="mt-1 text-[11px] leading-relaxed text-gray-600">
              This machine was budgeted {budgetFor().toLocaleString()} automatically.
              Drag until the frame rate drops to find the real ceiling here.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
