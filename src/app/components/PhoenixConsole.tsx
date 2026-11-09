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
import { Send, Loader2, Bot, User, AlertTriangle, ShieldOff } from 'lucide-react';
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
   * What to do when Phoenix asks to show a module.
   *
   * The page mounts it in the workspace alongside. The slide-over has no
   * workspace, so it navigates instead — which closes the panel, and is the
   * honest behaviour there rather than a button that appears to do nothing.
   */
  onOpenModule?: (d: OpenDirective) => void;
}

export default function PhoenixConsole({
  onQueueCount, centered, autoFocus, onOpenModule,
}: PhoenixConsoleProps) {
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [draft, setDraft] = useState('');
  const [thinking, setThinking] = useState(false);
  const [fatal, setFatal] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

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

  const inner = centered ? 'mx-auto w-full max-w-3xl' : 'w-full';

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Transcript */}
      <div className="flex-1 overflow-y-auto px-5 py-5">
        <div className={`${inner} space-y-4`}>
          {turns.length === 0 && !fatal && (
            <div className="pt-6">
              <p className="text-sm text-gray-400">Ask about the business or about the AI.</p>
              <p className="mt-1 text-xs text-gray-600">
                Every number comes from a live lookup, and the tools used are shown under each answer.
              </p>
              <div className="mt-5 space-y-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="block w-full rounded-lg border border-[#2A2A2A] bg-[#101010] px-4 py-2.5 text-left text-sm text-gray-300 transition hover:border-orange-500/40 hover:text-white"
                  >
                    {s}
                  </button>
                ))}
              </div>
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
                <div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
                  t.failed ? 'bg-rose-500/20' : 'bg-[#1A1A1A]'
                }`}>
                  {t.failed
                    ? <AlertTriangle className="h-3.5 w-3.5 text-rose-400" />
                    : <Bot className="h-3.5 w-3.5 text-orange-400" />}
                </div>
              )}
              <div className={`max-w-[85%] ${t.role === 'user' ? 'order-first' : ''}`}>
                <div className={`whitespace-pre-wrap rounded-xl px-4 py-2.5 text-sm leading-relaxed ${
                  t.role === 'user'
                    ? 'bg-orange-600 text-white'
                    : t.failed
                      ? 'border border-rose-500/30 bg-rose-500/10 text-rose-100'
                      : 'border border-[#2A2A2A] bg-[#101010] text-gray-200'
                }`}>
                  {t.content}
                </div>
                {/* How the answer was arrived at, so it can be checked. */}
                {t.toolsUsed && t.toolsUsed.length > 0 && (
                  <p className="mt-1.5 pl-1 text-[11px] text-gray-600">
                    checked: {t.toolsUsed.map((x) => TOOL_LABELS[x] || x).join(' · ')}
                  </p>
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
                        className="rounded-md border border-orange-500/30 bg-orange-500/5 px-2 py-0.5 text-[11px] text-orange-300 transition hover:border-orange-500/60 hover:text-orange-200"
                      >
                        {d.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {t.role === 'user' && (
                <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#1A1A1A]">
                  <User className="h-3.5 w-3.5 text-gray-400" />
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
              <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                Waiting on you
              </p>
              {queue.map((a) => (
                <div key={a.id} className="rounded-xl border border-orange-500/30 bg-orange-500/5 p-3.5">
                  <div className="flex items-start gap-2">
                    <span className={`mt-0.5 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                      a.risk === 'high' ? 'bg-rose-500/20 text-rose-300'
                        : a.risk === 'medium' ? 'bg-amber-500/20 text-amber-300'
                          : 'bg-gray-500/20 text-gray-400'
                    }`}>{a.risk}</span>
                    <p className="flex-1 text-sm text-gray-200">{a.summary}</p>
                  </div>
                  <p className="mt-1.5 pl-1 text-[11px] text-gray-600">{a.action}</p>

                  {!canApproveRisk(a.risk) ? (
                    <p className="mt-2.5 text-xs text-amber-400/90">
                      This one needs a platform owner to approve.
                    </p>
                  ) : (
                    <div className="mt-3 flex gap-2">
                      <button
                        onClick={() => decide(a, true)}
                        disabled={deciding === a.id}
                        className="rounded-lg bg-orange-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-orange-500 disabled:opacity-40"
                      >
                        {deciding === a.id ? 'Running…' : 'Approve & run'}
                      </button>
                      <button
                        onClick={() => decide(a, false)}
                        disabled={deciding === a.id}
                        className="rounded-lg border border-[#2A2A2A] px-3 py-1.5 text-xs text-gray-400 hover:text-white disabled:opacity-40"
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
            <div className="flex items-center gap-3 text-sm text-gray-500">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#1A1A1A]">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-orange-400" />
              </div>
              Looking it up…
            </div>
          )}
          <div ref={endRef} />
        </div>
      </div>

      {/* Composer */}
      <div className="border-t border-[#2A2A2A] p-4">
        <div className={inner}>
          <div className="flex items-end gap-2 rounded-xl border border-[#2A2A2A] bg-[#101010] px-3 py-2 focus-within:border-orange-500/50">
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
              className="max-h-32 flex-1 resize-none bg-transparent py-1.5 text-sm text-white placeholder:text-gray-600 focus:outline-none"
            />
            <button
              onClick={() => send(draft)}
              disabled={thinking || !draft.trim()}
              className="mb-0.5 rounded-lg bg-orange-600 p-2 text-white transition hover:bg-orange-500 disabled:opacity-40"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
          <p className="mt-2 text-center text-[11px] text-gray-600">
            Phoenix proposes, you approve. It never acts on its own.
          </p>
        </div>
      </div>
    </div>
  );
}
