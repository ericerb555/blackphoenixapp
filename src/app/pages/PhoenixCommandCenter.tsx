/**
 * Phoenix. The command centre.
 *
 * THE PHOENIX IN THE MIDDLE IS NOT A LOADING SPINNER.
 *
 * Every state it shows is a real signal from this page:
 *
 *   THINKING   a question is in flight right now
 *   WORKING    ai_call_log has an open call from some other agent
 *   SPEAKING   driven by the waveform of his own generated voice
 *   LISTENING  the microphone is open
 *   ALERT      something is waiting on your approval
 *   IDLE       none of the above
 *
 * That ordering is the design, not an implementation detail: the most
 * specific truth wins. An animation on a timer would be a screensaver, and
 * the one thing this screen cannot afford is to look busy while nothing is
 * happening — that is how somebody stops believing the other numbers on it.
 *
 * WHY IT IS SPARSE
 *
 * Interfaces of this kind read as precise because they are mostly empty:
 * black, a few luminous elements, small technical type, brackets instead of
 * boxes. The temptation is to fill the space with readouts. Resisting that
 * is what keeps the bird the subject.
 *
 * The conversation and the workspace are the same components the slide-over
 * uses. Nothing here is a second implementation of the chat.
 */
import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft, ShieldCheck, Mic, MicOff, PanelLeftClose, PanelLeft,
} from 'lucide-react';
import PhoenixConsole from '../components/PhoenixConsole';
import PhoenixWorkspace from '../components/PhoenixWorkspace';
import PhoenixParticleBrain, { type PhoenixState } from '../components/phoenix/PhoenixParticleBrain';
import AgentRail from '../components/phoenix/AgentRail';
import { HoloBackdrop, StatusDot } from '../components/phoenix/HoloFrame';
import PanelErrorBoundary from '../components/PanelErrorBoundary';
import { usePhoenixVoice } from '../components/phoenix/usePhoenixVoice';
import type { OpenDirective } from '../lib/aiActivity';

interface PhoenixCommandCenterProps {
  onNavigate?: (page: string) => void;
}

/** What the line under the mark says. Plain words, not jargon. */
const SAYS: Record<PhoenixState, string> = {
  idle: 'Standing by',
  listening: 'Listening',
  thinking: 'Working it out',
  speaking: 'Speaking',
  working: 'Agents running',
  success: 'Done',
  alert: 'Needs you',
};

export default function PhoenixCommandCenter({ onNavigate }: PhoenixCommandCenterProps) {
  const [pending, setPending] = useState(0);
  const [thinking, setThinking] = useState(false);
  const [running, setRunning] = useState(0);
  const [module, setModule] = useState<OpenDirective | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [railOpen, setRailOpen] = useState(true);
  const [ask, setAsk] = useState<string | null>(null);
  /*
   * Particle count and frame rate, on screen.
   *
   * Not telemetry — a discriminator. "Nothing is there" has at least three
   * causes that look identical from the outside: the box has no size, the
   * field never built, or it built and rendered too dim to see. These two
   * numbers separate all three in one glance, and their absence is as
   * informative as their value.
   */
  const [particles, setParticles] = useState(0);
  const [fps, setFps] = useState(0);

  /*
   * One voice for the page. The console speaks through it and the Phoenix
   * is animated from the same analyser, so the particles move to the exact
   * audio you are hearing rather than to a second measurement of it.
   */
  const voice = usePhoenixVoice();

  /** Most specific truth first. See the header. */
  const state: PhoenixState = useMemo(() => {
    if (voice.speaking) return 'speaking';
    if (thinking) return 'thinking';
    if (voice.micOn) return 'listening';
    if (running > 0) return 'working';
    if (pending > 0) return 'alert';
    return 'idle';
  }, [voice.speaking, voice.micOn, thinking, running, pending]);

  // A live data table and a glowing bird cannot both be the subject, so
  // when a module opens the Phoenix steps back rather than competing.
  useEffect(() => { if (module) setRailOpen(false); }, [module]);

  const back = () => {
    if (onNavigate) onNavigate('owners-dashboard');
    else window.location.href = '/owners-dashboard';
  };

  return (
    <div className="relative flex h-screen flex-col overflow-hidden bg-[#050505] text-white">
      <HoloBackdrop alert={state === 'alert'} />

      {/* ── header ─────────────────────────────────────────────────── */}
      <div className="relative z-10 flex shrink-0 items-center justify-between gap-3 border-b border-orange-500/15 px-4 py-2.5">
        <div className="flex min-w-0 items-center gap-3">
          <button
            onClick={back}
            className="rounded p-1.5 text-gray-500 transition hover:bg-white/5 hover:text-white"
            aria-label="Back to Owner's Control Center"
            title="Back to Owner's Control Center"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="min-w-0">
            <h1 className="font-mono text-sm uppercase tracking-[0.3em] text-white">Phoenix</h1>
            <p className="truncate font-mono text-[9px] uppercase tracking-[0.18em] text-orange-400/60">
              Black Phoenix · Command
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <button
            onClick={() => setRailOpen((o) => !o)}
            className="hidden rounded p-1.5 text-gray-600 transition hover:bg-white/5 hover:text-white lg:block"
            aria-label={railOpen ? 'Hide the agent rail' : 'Show the agent rail'}
            title={railOpen ? 'Hide agents' : 'Show agents'}
          >
            {railOpen ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeft className="h-4 w-4" />}
          </button>

          <button
            onClick={() => (voice.micOn ? voice.stopMic() : voice.startMic())}
            className={`flex items-center gap-1.5 rounded border px-2.5 py-1.5 font-mono text-[9px] uppercase tracking-[0.16em] transition ${
              voice.micOn
                ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-300'
                : 'border-[#262626] text-gray-500 hover:border-orange-500/40 hover:text-white'
            }`}
            title={voice.micOn ? 'Close the microphone' : 'Open the microphone'}
          >
            {voice.micOn ? <Mic className="h-3 w-3" /> : <MicOff className="h-3 w-3" />}
            {voice.micOn ? 'live' : 'mic'}
          </button>

          {pending > 0 && (
            <span className="flex items-center gap-1.5 rounded border border-orange-500/40 bg-orange-500/10 px-2.5 py-1.5 font-mono text-[9px] uppercase tracking-[0.16em] text-orange-300">
              <StatusDot tone="warn" />
              {pending} waiting
            </span>
          )}

          <span className="hidden items-center gap-1.5 rounded border border-[#1C1C1C] px-2.5 py-1.5 font-mono text-[9px] uppercase tracking-[0.16em] text-gray-600 xl:flex">
            <ShieldCheck className="h-3 w-3 text-emerald-500/70" />
            read-only until approved
          </span>
        </div>
      </div>

      {/* ── body ───────────────────────────────────────────────────── */}
      <div className="relative z-10 flex min-h-0 flex-1">

        {/* Agents */}
        {railOpen && !expanded && (
          <div className="hidden w-60 shrink-0 overflow-y-auto border-r border-orange-500/10 p-2 lg:block">
            <AgentRail onAsk={setAsk} onRunningChange={setRunning} />
          </div>
        )}

        {/* Phoenix and the conversation */}
        <div
          className={`flex min-h-0 min-w-0 flex-col ${
            expanded ? 'hidden'
              : module ? 'hidden xl:flex xl:w-[27rem] xl:shrink-0'
                : 'flex-1'
          }`}
        >
          {/*
            VIEWPORT UNITS, NOT A PERCENTAGE.
            h-[46%] resolves against the parent's content height, and inside
            a nested flex column that height is not always definite — so it
            collapsed to nothing and the Phoenix was simply not there. vh is
            definite everywhere, and min-h stops him disappearing on a short
            laptop screen.

            The boundary is the other half of the same lesson: a WebGL
            failure must cost you the bird, not the conversation. Without
            it a thrown shader takes the whole column down and the chat
            stops answering, which is precisely what happened.
          */}
          <div
            /*
             * INLINE HEIGHT, NOT A TAILWIND CLASS.
             *
             * This element has now failed to have a height twice — first as
             * h-[46%], which cannot resolve inside a nested flex column, and
             * then as h-[54vh], which depends on Tailwind having generated
             * that arbitrary class. An inline style depends on nothing: it
             * is in the DOM whatever the build did.
             *
             * A canvas with no height draws nothing and reports no error,
             * which is the worst failure mode there is, so this one is not
             * worth being clever about.
             */
            style={{
              height: module ? '8rem' : 'min(54vh, 620px)',
              minHeight: module ? undefined : 300,
            }}
            className={`relative w-full shrink-0 transition-opacity duration-700 ${
              module ? 'opacity-40' : 'opacity-100'
            }`}
          >
            <PanelErrorBoundary name="Phoenix">
              <PhoenixParticleBrain
                state={state}
                audioLevelRef={voice.levelRef}
                onReady={setParticles}
                onFps={setFps}
                className="h-full w-full"
              />
            </PanelErrorBoundary>
            {/* What he is doing, in words, under the mark. */}
            <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center">
              <span
                className={`font-mono text-[9px] uppercase tracking-[0.3em] ${
                  state === 'alert' ? 'text-rose-300/80' : 'text-orange-400/60'
                }`}
              >
                {SAYS[state]}
              </span>
            </div>
          </div>

          <div className="min-h-0 flex-1 border-t border-orange-500/10">
            <PhoenixConsole
              centered={!module}
              autoFocus
              voice={voice}
              onQueueCount={setPending}
              onThinkingChange={setThinking}
              pendingAsk={ask}
              onAskHandled={() => setAsk(null)}
              onOpenModule={(d) => { setModule(d); setExpanded(false); }}
            />
          </div>
        </div>

        {/* Workspace */}
        {module && (
          <div className="min-h-0 flex-1">
            <PhoenixWorkspace
              module={module}
              expanded={expanded}
              onToggleExpand={() => setExpanded((v) => !v)}
              onClose={() => { setModule(null); setExpanded(false); }}
              onNavigate={onNavigate}
            />
          </div>
        )}
      </div>

      {/* ── footer readout ─────────────────────────────────────────── */}
      <div className="relative z-10 flex shrink-0 items-center justify-between gap-3 border-t border-orange-500/10 px-4 py-1.5 font-mono text-[9px] uppercase tracking-[0.16em] text-gray-700">
        <span className="flex items-center gap-2">
          <StatusDot tone={state === 'alert' ? 'warn' : state === 'idle' ? 'idle' : 'live'} />
          {SAYS[state]}
          {running > 0 && (
            <span className="text-orange-400/70">
              · {running} call{running === 1 ? '' : 's'} in flight
            </span>
          )}
        </span>
        <span className="flex items-center gap-2">
          <span title="Particles forming the mark. Zero means the field never built.">
            {particles ? `${particles.toLocaleString()} particles` : 'no particles'}
          </span>
          <span className="text-gray-800">│</span>
          <span title="Frames per second. Zero means the canvas is not drawing.">
            {fps ? `${fps} fps` : 'no frames'}
          </span>
          <span className="text-gray-800">│</span>
          <button
            onClick={() => onNavigate?.('phoenix-prototype')}
            className="transition hover:text-orange-400"
            title="The particle brain on its own, with every state as a button"
          >
            particle lab
          </button>
        </span>
      </div>
    </div>
  );
}
