/**
 * The conversation itself — transcript, approval queue, composer.
 *
 * WHY THIS IS SEPARATE FROM THE PANEL
 *
 * Phoenix now has two homes: the slide-over you can open from anywhere, and
 * its own page off the Owner's Control Center. Those are two pieces of
 * chrome around one conversation. Keeping the conversation here means a fix
 * to how a proposal is approved lands in both, rather than in whichever one
 * somebody remembered.
 *
 * It fills its container and brings no positioning of its own, so the parent
 * decides whether it is a 36rem panel or a full page.
 *
 * WHAT IT SHOWS THAT MOST CHAT UIS DO NOT
 *
 * Which tools answered. Every figure this thing quotes comes from a named
 * lookup, and the line under each answer says which ones ran. That is not
 * decoration: the one property that makes its numbers worth trusting is
 * that it cannot quote a figure it did not look up, and showing the lookups
 * is how a person checks that rather than taking it on faith.
 */
import { useState, useRef, useEffect } from 'react';
import {
  Send, Loader2, Bot, User, AlertTriangle, ShieldOff,
  Volume2, VolumeX, Square,
} from 'lucide-react';
import {
  usePhoenixVoice, VOICES, DEFAULT_VOICE,
  type PhoenixVoiceApi, type PhoenixVoice,
} from './phoenix/usePhoenixVoice';
import { speakableText, worthSpeaking } from './phoenix/speakableText';
import {
  askPhoenix, AiIsStopped, NotPermitted, TOOL_LABELS, type ChatTurn,
  fetchActionQueue, approveAction, rejectActionRequest, type ActionRequest,
  type OpenDirective,
} from '../lib/aiActivity';

/**
 * Openers, chosen to show the range rather than to be clever.
 *
 * One about the business, one about money, one about attention, one about
 * the AI itself — so the first thing somebody tries demonstrates that this
 * is not only a log reader.
 */
const SUGGESTIONS = [
  'How are we doing today?',
  "What's owed to us?",
  'What needs my attention?',
  'What has the AI done today, and what did it cost?',
  'Show me the work requests.',
];

export interface PhoenixConsoleProps {
  /**
   * Called whenever the pending count changes, so a parent can show a badge
   * without fetching the queue a second time.
   */
  onQueueCount?: (n: number) => void;
  /**
   * The page gives the transcript a reading width; the panel is already
   * narrow enough that capping it again would waste the space.
   */
  centered?: boolean;
  /** Focus the composer on mount. The panel does this when it opens. */
  autoFocus?: boolean;
  /**
   * Share a voice with the rest of the page.
   *
   * The command centre will want the same audio level that drives the
   * speech to drive the particle Phoenix, and two AudioContexts analysing
   * two copies of the same sound would be both wasteful and subtly out of
   * step. Supply one here and it is used; otherwise this makes its own.
   */
  voice?: PhoenixVoiceApi;
  /**
   * What to do when Phoenix asks to show a module.
   *
   * The page mounts it in the workspace alongside. The slide-over has no
   * workspace, so it navigates instead — which closes the panel, and is the
   * honest behaviour there rather than a button that appears to do nothing.
   */
  onOpenModule?: (d: OpenDirective) => void;
  /**
   * True while a question is in flight. The command centre uses this to put
   * the Phoenix into THINKING — which is the point of that state being a
   * real signal rather than a timer.
   */
  onThinkingChange?: (thinking: boolean) => void;
  /**
   * Lets something outside the transcript ask a question — an agent tile,
   * a suggestion chip. Set it to a string to send; the console calls
   * onAskHandled once the question is on its way.
   */
  pendingAsk?: string | null;
  onAskHandled?: () => void;
  /**
   * Float over the Phoenix rather than sit below him.
   *
   * The transcript goes transparent and caps its own height; the composer
   * becomes a bar across the bottom. That hands the whole stage to the
   * bird, which is the only way he gets substantially bigger — moving the
   * camera closer was the only other lever and it clips wingtips.
   */
  overlay?: boolean;
}

/**
 * Whether Phoenix reads his answers aloud.
 *
 * Remembered, because this is a preference about the room you are in — an
 * open-plan office or a van — not about the question you just asked. It
 * defaults ON: the voice exists to be used, and one tap turns it off
 * permanently.
 */
const VOICE_PREF = 'phoenix.speakAnswers';

/**
 * Which voice. Remembered separately from whether the voice is on, because
 * turning him off for a meeting should not forget who he sounds like.
 */
const VOICE_NAME_PREF = 'phoenix.voice';

function savedVoice(): PhoenixVoice {
  try {
    const v = localStorage.getItem(VOICE_NAME_PREF) as PhoenixVoice | null;
    // Validated against the list rather than trusted: an old or hand-edited
    // value would otherwise reach the API and come back a 400.
    if (v && VOICES.some((x) => x.id === v)) return v;
  } catch { /* private mode */ }
  return DEFAULT_VOICE;
}

export default function PhoenixConsole({
  onQueueCount, centered, autoFocus, onOpenModule, voice,
  onThinkingChange, pendingAsk, onAskHandled, overlay,
}: PhoenixConsoleProps) {
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [draft, setDraft] = useState('');
  const [thinking, setThinking] = useState(false);
  const [fatal, setFatal] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  /*
   * The hook runs unconditionally — hooks must — and its result is ignored
   * when a parent supplied one. The cost of the spare is a few bytes of
   * state; no AudioContext is created until something actually speaks.
   */
  const ownVoice = usePhoenixVoice();
  const v = voice ?? ownVoice;

  const [speakAnswers, setSpeakAnswers] = useState(() => {
    try { return localStorage.getItem(VOICE_PREF) !== 'off'; } catch { return true; }
  });
  const [picked, setPicked] = useState<PhoenixVoice>(savedVoice);

  const chooseVoice = (id: PhoenixVoice) => {
    setPicked(id);
    try { localStorage.setItem(VOICE_NAME_PREF, id); } catch { /* private mode */ }
    // Say something in it immediately. Picking a voice from a list of six
    // names is guesswork until you have heard one.
    v.speak('This is how I sound.', id);
  };

  const toggleVoice = () => {
    setSpeakAnswers((on) => {
      const next = !on;
      try { localStorage.setItem(VOICE_PREF, next ? 'on' : 'off'); } catch { /* private mode */ }
      if (!next) v.stopSpeaking();
      return next;
    });
  };

  /** Read one answer aloud, now. Used by the replay button on each turn. */
  const say = (text: string) => {
    if (!worthSpeaking(text)) return;
    v.speak(speakableText(text), picked);
  };

  const [queue, setQueue] = useState<ActionRequest[]>([]);
  const [canApprove, setCanApprove] = useState({ low: true, medium: true, high: false });
  const [deciding, setDeciding] = useState<string | null>(null);

  const canApproveRisk = (risk: 'low' | 'medium' | 'high') => canApprove[risk];

  async function refreshQueue() {
    try {
      const q = await fetchActionQueue('pending');
      setQueue(q.actions);
      setCanApprove(q.youCanApprove);
      onQueueCount?.(q.actions.length);
    } catch {
      // A portal user gets a 403. The console already reports that once on
      // the first question; a second copy under the transcript is noise.
    }
  }

  /**
   * Approve runs it. The button says so, because the tap that approves is
   * the tap that sends the email — there is no later confirmation.
   */
  async function decide(action: ActionRequest, approve: boolean) {
    setDeciding(action.id);
    try {
      if (approve) {
        const result = await approveAction(action.id);
        setTurns((t) => [...t, { role: 'assistant', content: `Done — ${result}` }]);
      } else {
        await rejectActionRequest(action.id);
        setTurns((t) => [...t, { role: 'assistant', content: `Declined: ${action.summary}` }]);
      }
    } catch (err: any) {
      setTurns((t) => [...t, {
        role: 'assistant', failed: true,
        content: err?.message || 'That did not go through.',
      }]);
    } finally {
      setDeciding(null);
      await refreshQueue();
    }
  }

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [turns, thinking]);

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  useEffect(() => { refreshQueue(); }, []);

  // Reported rather than inferred, so the animation follows the request.
  useEffect(() => { onThinkingChange?.(thinking); }, [thinking]);

  async function send(text: string) {
    const question = text.trim();
    if (!question || thinking) return;

    // The question goes in immediately. Waiting for the answer to render the
    // question makes a slow reply feel like a dropped one.
    const asked: ChatTurn = { role: 'user', content: question };
    const history = turns;
    setTurns((t) => [...t, asked]);
    setDraft('');
    setThinking(true);
    setFatal(null);

    try {
      const reply = await askPhoenix(question, history);
      setTurns((t) => [...t, {
        role: 'assistant', content: reply.answer, toolsUsed: reply.toolsUsed,
        opened: reply.open,
      }]);
      /*
       * Spoken here rather than in an effect watching the transcript.
       *
       * An effect would also fire for the approve/decline confirmations and
       * for every error, and it would re-fire on any unrelated re-render
       * that happened to change the array identity. This speaks exactly
       * the answers to questions, exactly once.
       */
      if (speakAnswers) say(reply.answer);
      // One module. If the model asked for several, the last wins — the
      // workspace shows one thing, and silently dropping the others would
      // leave the answer describing a screen that is not there.
      const last = reply.open[reply.open.length - 1];
      if (last) onOpenModule?.(last);
      await refreshQueue();
    } catch (err: any) {
      if (err instanceof NotPermitted) {
        setFatal('The assistant is for company accounts. Sign in with a staff account.');
      } else if (err instanceof AiIsStopped) {
        // Not an error. Somebody pressed the stop, and saying so by name is
        // more useful than "request failed".
        setTurns((t) => [...t, {
          role: 'assistant', failed: true,
          content: `${err.message}\n\nRelease it on the AI Diagnostics screen and ask again.`,
        }]);
      } else {
        setTurns((t) => [...t, {
          role: 'assistant', failed: true,
          content: err?.message || 'That did not work. Try again.',
        }]);
      }
    } finally {
      setThinking(false);
    }
  }

  /*
   * A question asked from outside the console.
   *
   * Guarded on "thinking" as well as on the value, because a tile tapped
   * twice while the first answer is still coming would otherwise queue a
   * second question the model has no context for yet.
   */
  useEffect(() => {
    if (pendingAsk && !thinking) {
      send(pendingAsk);
      onAskHandled?.();
    }
  }, [pendingAsk, thinking]);

  const inner = centered ? 'mx-auto w-full max-w-3xl' : 'w-full';

  return (
    <div className={`flex h-full min-h-0 flex-col ${overlay ? 'justify-end' : ''}`}>
      {/* Transcript */}
      <div
        className={`overflow-y-auto px-5 ${overlay ? 'max-h-[52%] py-3' : 'flex-1 py-5'}`}
        style={overlay ? {
          // Fades in at the top rather than starting with a hard edge, so
          // the text sits over him without a panel between you and him.
          maskImage: 'linear-gradient(to bottom, transparent 0, black 38px)',
          WebkitMaskImage: 'linear-gradient(to bottom, transparent 0, black 38px)',
        } : undefined}
      >
        <div className={`${inner} space-y-4`}>
          {turns.length === 0 && !fatal && (
            <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5">
              {/*
                Transparent, on one line. This was four filled tiles taking a
                third of the screen before you had asked anything —
                furniture standing in front of the thing you came to see.
                They are hints now, not buttons.
              */}
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="font-mono text-[10px] uppercase tracking-[0.1em] text-gray-600 transition hover:text-orange-300"
                >
                  {s.replace(/[?.]$/, '')}
                </button>
              ))}
            </div>
          )}

          {fatal && (
            <div className="flex items-start gap-3 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3">
              <ShieldOff className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
              <p className="text-sm text-rose-200">{fatal}</p>
            </div>
          )}

          {turns.map((t, i) => (
            <div key={i} className={`flex gap-3 ${t.role === 'user' ? 'justify-end' : ''}`}>
              {t.role === 'assistant' && (
                <div className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-sm border ${
                  t.failed ? 'border-rose-500/40 bg-rose-500/10' : 'border-orange-500/25 bg-black/50'
                }`}>
                  {t.failed
                    ? <AlertTriangle className="h-3.5 w-3.5 text-rose-400" />
                    : <Bot className="h-3.5 w-3.5 text-orange-400" />}
                </div>
              )}
              <div className={`max-w-[85%] ${t.role === 'user' ? 'order-first' : ''}`}>
                <div className={`whitespace-pre-wrap rounded-sm px-3.5 py-2.5 text-[13px] leading-relaxed ${
                  t.role === 'user'
                    ? 'border-r-2 border-orange-500 bg-orange-500/10 text-orange-50'
                    : t.failed
                      ? 'border-l-2 border-rose-500/70 bg-rose-500/[0.07] text-rose-100'
                      : 'border-l-2 border-orange-500/35 bg-white/[0.025] text-gray-200'
                }`}>
                  {t.content}
                </div>
                {/* How the answer was arrived at, so it can be checked. */}
                {t.toolsUsed && t.toolsUsed.length > 0 && (
                  <p className="mt-1.5 pl-1 font-mono text-[9px] uppercase tracking-[0.12em] text-gray-600">
                    checked · {t.toolsUsed.map((x) => TOOL_LABELS[x] || x).join(' · ')}
                  </p>
                )}
                {/* Hear it again, whether or not auto-speak is on. */}
                {t.role === 'assistant' && !t.failed && worthSpeaking(t.content) && (
                  <button
                    onClick={() => say(t.content)}
                    className="mt-1 pl-1 font-mono text-[9px] uppercase tracking-[0.12em] text-gray-600 transition hover:text-orange-400"
                    aria-label="Read this answer aloud"
                  >
                    <Volume2 className="inline h-3 w-3" /> hear it
                  </button>
                )}
                {/*
                  Named, and clickable again. The module is already on screen;
                  this is for after you have clicked away from it.
                */}
                {t.opened && t.opened.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1.5 pl-1">
                    {t.opened.map((d) => (
                      <button
                        key={d.id}
                        onClick={() => onOpenModule?.(d)}
                        className="rounded-sm border border-orange-500/30 bg-orange-500/5 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.1em] text-orange-300 transition hover:border-orange-500/60 hover:text-orange-200"
                      >
                        {d.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {t.role === 'user' && (
                <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-sm border border-[#262626] bg-black/50">
                  <User className="h-3 w-3 text-gray-500" />
                </div>
              )}
            </div>
          ))}

          {/*
            Proposals sit in the transcript, under the answer that produced
            them. Putting them on a separate screen would mean the decision
            is made away from the reasoning that argued for it, which is
            how somebody approves a thing they have not read.
          */}
          {queue.length > 0 && (
            <div className="space-y-2 pt-1">
              <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-orange-400/70">
                Waiting on you
              </p>
              {queue.map((a) => (
                <div key={a.id} className="rounded-sm border-l-2 border-orange-500 bg-orange-500/[0.06] p-3.5">
                  <div className="flex items-start gap-2">
                    <span className={`mt-0.5 rounded-sm border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.12em] ${
                      a.risk === 'high' ? 'border-rose-500/50 text-rose-300'
                        : a.risk === 'medium' ? 'border-amber-500/50 text-amber-300'
                          : 'border-gray-600 text-gray-400'
                    }`}>{a.risk}</span>
                    <p className="flex-1 text-sm text-gray-200">{a.summary}</p>
                  </div>
                  <p className="mt-1.5 pl-1 font-mono text-[9px] uppercase tracking-[0.12em] text-gray-600">{a.action}</p>

                  {!canApproveRisk(a.risk) ? (
                    <p className="mt-2.5 text-xs text-amber-400/90">
                      This one needs a platform owner to approve.
                    </p>
                  ) : (
                    <div className="mt-3 flex gap-2">
                      <button
                        onClick={() => decide(a, true)}
                        disabled={deciding === a.id}
                        className="rounded-sm bg-orange-600 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-white transition hover:bg-orange-500 disabled:opacity-40"
                      >
                        {deciding === a.id ? 'Running…' : 'Approve & run'}
                      </button>
                      <button
                        onClick={() => decide(a, false)}
                        disabled={deciding === a.id}
                        className="rounded-sm border border-[#2A2A2A] px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-gray-400 transition hover:border-gray-500 hover:text-white disabled:opacity-40"
                      >
                        Decline
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {thinking && (
            <div className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.22em] text-orange-400/70">
              <div className="flex h-6 w-6 items-center justify-center rounded-sm border border-orange-500/25 bg-black/50">
                <Loader2 className="h-3 w-3 animate-spin text-orange-400" />
              </div>
              querying
            </div>
          )}
          <div ref={endRef} />
        </div>
      </div>

      {/* Composer */}
      <div
        className={`border-t border-orange-500/15 px-4 py-3 ${
          overlay ? 'bg-black/70 backdrop-blur-sm' : ''
        }`}
      >
        {/* The bar spans the width; its contents are centred. */}
        <div className={overlay ? 'mx-auto w-full max-w-4xl' : inner}>
          <div className="relative flex items-end gap-2 rounded-sm border border-[#1F1F1F] bg-black/60 px-3 py-2 transition focus-within:border-orange-500/50">
            {/* Corner brackets, the same language as the panels elsewhere. */}
            <span className="pointer-events-none absolute -left-px -top-px h-2 w-2 border-l border-t border-orange-500/50" />
            <span className="pointer-events-none absolute -bottom-px -right-px h-2 w-2 border-b border-r border-orange-500/50" />
            <textarea
              ref={inputRef}
              rows={1}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                // Enter sends; Shift+Enter is a newline. A chat box that
                // needs a mouse to send is one people stop using.
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(draft); }
              }}
              placeholder="Ask about work, money, leads or the AI…"
              className="max-h-32 flex-1 resize-none bg-transparent py-1.5 text-[13px] text-white placeholder:font-mono placeholder:text-[11px] placeholder:uppercase placeholder:tracking-[0.1em] placeholder:text-gray-700 focus:outline-none"
            />
            <button
              onClick={() => send(draft)}
              disabled={thinking || !draft.trim()}
              className="mb-0.5 rounded-sm bg-orange-600 p-2 text-white transition hover:bg-orange-500 disabled:opacity-40"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-2 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 font-mono text-[9px] uppercase tracking-[0.12em] text-gray-700">
            <span>Proposes · you approve · never acts alone</span>
            <span className="text-gray-800">·</span>
            <button
              onClick={toggleVoice}
              className={`flex items-center gap-1 uppercase tracking-[0.12em] transition ${
                speakAnswers ? 'text-orange-400 hover:text-orange-300' : 'hover:text-gray-400'
              }`}
              title={speakAnswers ? 'Stop reading answers aloud' : 'Read answers aloud'}
              aria-pressed={speakAnswers}
            >
              {speakAnswers ? <Volume2 className="h-3 w-3" /> : <VolumeX className="h-3 w-3" />}
              voice {speakAnswers ? 'on' : 'off'}
            </button>
            {speakAnswers && (
              <select
                value={picked}
                onChange={(e) => chooseVoice(e.target.value as PhoenixVoice)}
                aria-label="Which voice Phoenix speaks in"
                className="cursor-pointer rounded-sm border border-[#1F1F1F] bg-black/60 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.1em] text-gray-500 transition hover:border-orange-500/40 hover:text-white focus:border-orange-500/60 focus:outline-none"
              >
                {VOICES.map((x) => (
                  <option key={x.id} value={x.id} className="capitalize">
                    {x.id} — {x.note.toLowerCase()}
                  </option>
                ))}
              </select>
            )}
            {v.speaking && (
              <button
                onClick={v.stopSpeaking}
                className="flex items-center gap-1 text-orange-400 transition hover:text-orange-300"
              >
                <Square className="h-2.5 w-2.5" /> stop
              </button>
            )}
          </div>
          {v.speakError && (
            <p className="mt-1 text-center text-[11px] text-rose-400">{v.speakError}</p>
          )}
        </div>
      </div>
    </div>
  );
}
