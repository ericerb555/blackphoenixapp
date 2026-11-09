/**
 * The assistant, as a panel you can open from anywhere on the page.
 *
 * WHY A SLIDE-OVER AND NOT A TAB
 *
 * Because the questions it answers are the ones you have while looking at
 * something else — "is that quote out yet", "what is owed". A tab means
 * leaving the screen you are on to ask about it, which is the friction that
 * stops people using an assistant at all.
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
import { Sparkles, X, Send, Loader2, Bot, User, AlertTriangle, ShieldOff } from 'lucide-react';
import {
  askPhoenix, AiIsStopped, NotPermitted, TOOL_LABELS, type ChatTurn,
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
];

export default function PhoenixAssistant() {
  const [open, setOpen] = useState(false);
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [draft, setDraft] = useState('');
  const [thinking, setThinking] = useState(false);
  const [fatal, setFatal] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (open) endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [turns, thinking, open]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

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
      }]);
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

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        title="Ask Phoenix"
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-full bg-gradient-to-br from-orange-600 to-orange-500 px-5 py-3.5 text-sm font-semibold text-white shadow-lg shadow-orange-900/40 transition hover:scale-105 hover:shadow-orange-900/60"
      >
        <Sparkles className="h-4 w-4" /> Ask Phoenix
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-sm" onClick={() => setOpen(false)}>
      <div
        className="flex h-full w-full max-w-xl flex-col border-l border-[#2A2A2A] bg-[#0A0A0A] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#2A2A2A] px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-orange-600 to-orange-500">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Phoenix</p>
              <p className="text-[11px] text-gray-500">Reads your operations. Cannot change anything.</p>
            </div>
          </div>
          <button onClick={() => setOpen(false)} className="rounded-lg p-2 text-gray-500 hover:bg-[#1A1A1A] hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Transcript */}
        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
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
              </div>
              {t.role === 'user' && (
                <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#1A1A1A]">
                  <User className="h-3.5 w-3.5 text-gray-400" />
                </div>
              )}
            </div>
          ))}

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

        {/* Composer */}
        <div className="border-t border-[#2A2A2A] p-4">
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
            Read-only. Phoenix reports; it does not send, change or spend.
          </p>
        </div>
      </div>
    </div>
  );
}
