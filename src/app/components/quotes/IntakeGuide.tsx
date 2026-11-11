/**
 * The intake interview, for a job somebody is taking down over the phone.
 *
 * WHY THIS EXISTS SEPARATELY FROM THE CUSTOMER'S GUIDE
 *
 * Eric asked for the agent on "the work request / quote buttons" — two places,
 * and genuinely two different interviews. The customer's lives inside
 * `ClientWorkRequestForm`, woven through a 2,800-line multi-step form with its
 * own progress bar and quick replies. Lifting that out would have meant
 * rewriting the form that is currently working.
 *
 * So this is the same engine with a different front: one `POST /ai-guide-chat`
 * with `surface: 'staff'`, the same field list from `intakeFields.ts`, the same
 * server-side allowlist on what the model may write back. What differs is who
 * is answering. On this surface the person typing works here and is relaying a
 * phone call, so the agent tells them what to ASK rather than asking them.
 *
 * WHY IT TAKES AND RETURNS INTAKE NAMES
 *
 * `StartQuoteModal` calls its fields `customerName`, `customerEmail`,
 * `customerPhone` and `location`; the intake list calls them `clientName`,
 * `clientEmail`, `clientPhone` and `siteAddress`. Everything else — all
 * eighteen measurement and condition fields — matches exactly, which is why
 * this was worth doing at all.
 *
 * Rather than teach this component about either naming, it speaks only intake
 * names and the caller maps the four that differ. The mapping is then visible
 * in the file where the divergence actually lives, instead of hidden in a
 * component that would have to know about every form that ever uses it.
 */
import { useRef, useState } from 'react';
import { Brain, Loader2, Send, ChevronDown, ChevronRight, Check } from 'lucide-react';
import { authedHeaders } from '../../utils/authHeaders';
import { API_BASE_URL } from '../../lib/apiConfig';

export interface IntakeGuideProps {
  /** Current answers, keyed by `intakeFields.ts` names. */
  values: Record<string, unknown>;
  /** From `categoryForServiceType`. Empty means the trade is not chosen yet. */
  category: string;
  /** Counted from real attachments; the model may never assert these. */
  mediaCounts?: { photos: number; videos: number };
  /**
   * Applied to the caller's form, keyed by intake names. The server has already
   * allowlisted and coerced these, so a model cannot write a field nobody asked
   * it about — see `coerceUpdates`.
   */
  onApply: (updates: Record<string, string | number>) => void;
  surface?: 'staff' | 'customer';
  className?: string;
  /** Open on first render. Closed by default so it never gets in the way. */
  defaultOpen?: boolean;
}

interface Turn { role: 'ai' | 'user'; message: string }

const OPENING_STAFF =
  "Tell me what they have said so far and I will tell you what else to ask. "
  + "Paste the whole lot in one go if you like — I will sort it into the right fields.";

export function IntakeGuide({
  values,
  category,
  mediaCounts,
  onApply,
  surface = 'staff',
  className = '',
  defaultOpen = false,
}: IntakeGuideProps) {
  const [open, setOpen] = useState(defaultOpen);
  const [turns, setTurns] = useState<Turn[]>([{ role: 'ai', message: OPENING_STAFF }]);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const [missingForQuote, setMissingForQuote] = useState<string[]>([]);
  const [quotable, setQuotable] = useState(false);
  const [asked, setAsked] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);

  const send = async (text: string) => {
    const message = text.trim();
    if (!message || thinking) return;

    const next = [...turns, { role: 'user' as const, message }];
    setTurns(next);
    setInput('');
    setThinking(true);

    try {
      const res = await fetch(`${API_BASE_URL}/make-server-3eae23a6/ai-guide-chat`, {
        method: 'POST',
        headers: await authedHeaders(),
        body: JSON.stringify({
          messages: next,
          // The modal keeps one flat form, so everything travels as formData
          // and the server sorts `form` from `brief` by the field definition.
          formData: values,
          estimatorBrief: {},
          mediaCounts: mediaCounts || { photos: 0, videos: 0 },
          projectCategory: category,
          surface,
        }),
      });

      if (!res.ok) {
        throw new Error(
          res.status === 401 || res.status === 403
            ? 'Your session has expired — sign in again and the guide will pick up where it left off.'
            : 'The guide could not be reached. Carry on filling the fields in by hand.',
        );
      }

      const data = await res.json();
      const updates = { ...(data.fieldUpdates || {}), ...(data.briefUpdates || {}) };
      if (Object.keys(updates).length > 0) onApply(updates);

      setMissingForQuote(data.missingForQuote || []);
      setQuotable(!!data.quotable);
      setAsked(true);
      setTurns((prev) => [...prev, { role: 'ai', message: data.message || '…' }]);
    } catch (err: any) {
      setTurns((prev) => [...prev, { role: 'ai', message: err?.message || 'Something went wrong.' }]);
    } finally {
      setThinking(false);
      // After the state settles, not before, or it scrolls to the old bottom.
      requestAnimationFrame(() => {
        if (scroller.current) scroller.current.scrollTop = scroller.current.scrollHeight;
      });
    }
  };

  return (
    <div className={`rounded-xl border border-[#2A2A2A] bg-[#0A0A0A] ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
      >
        <span className="flex items-center gap-2 text-sm font-semibold text-white">
          <Brain className="h-4 w-4 text-orange-400" />
          Ask me what to ask them
          {asked && quotable && (
            <span className="flex items-center gap-1 rounded-full bg-green-500/15 px-2 py-0.5 text-xs font-semibold text-green-300">
              <Check className="h-3 w-3" /> enough to price
            </span>
          )}
          {asked && !quotable && missingForQuote.length > 0 && (
            <span className="rounded-full bg-orange-500/15 px-2 py-0.5 text-xs font-semibold text-orange-300">
              {missingForQuote.length} still needed
            </span>
          )}
        </span>
        {open ? <ChevronDown className="h-4 w-4 text-gray-500" /> : <ChevronRight className="h-4 w-4 text-gray-500" />}
      </button>

      {open && (
        <div className="space-y-3 border-t border-[#2A2A2A] p-4">
          <p className="text-xs text-gray-500">
            Fills in the job details below as you go. It never discusses price — that stays with the estimator.
          </p>

          <div ref={scroller} className="max-h-56 space-y-2 overflow-y-auto">
            {turns.map((t, i) => (
              <div key={i} className={`flex ${t.role === 'ai' ? 'justify-start' : 'justify-end'}`}>
                <div
                  className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                    t.role === 'ai'
                      ? 'rounded-tl-none border border-[#2A2A2A] bg-[#050505] text-gray-200'
                      : 'rounded-tr-none border border-orange-500/30 bg-orange-600/25 text-white'
                  }`}
                >
                  {t.message}
                </div>
              </div>
            ))}
            {thinking && (
              <div className="flex items-center gap-2 px-1 text-xs text-gray-500">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> thinking…
              </div>
            )}
          </div>

          {missingForQuote.length > 0 && (
            <div className="rounded-lg border border-orange-500/30 bg-orange-500/5 p-2.5">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-orange-300">
                Still needed before this can be priced
              </p>
              <p className="mt-1 text-xs text-gray-300">{missingForQuote.join(' · ')}</p>
            </div>
          )}

          <div className="flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              // Enter sends. The modal around this has no form element, so
              // there is no submit to accidentally trigger.
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void send(input); } }}
              placeholder="e.g. 20x14 deck, second floor, stairs only, nobody home weekdays"
              className="min-h-11 flex-1 rounded-lg border border-[#2A2A2A] bg-[#050505] px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-orange-500/40"
            />
            <button
              type="button"
              onClick={() => void send(input)}
              disabled={thinking || !input.trim()}
              className="flex min-h-11 items-center gap-1.5 rounded-lg px-3 text-sm font-semibold text-white disabled:opacity-40"
              style={{ background: 'linear-gradient(135deg,#7c3aed,#ea580c)' }}
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default IntakeGuide;
