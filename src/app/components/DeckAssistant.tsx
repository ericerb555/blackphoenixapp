/**
 * DeckAssistant — someone to ask, without leaving the design.
 *
 * It sees the whole design: the model, the site values, the takeoff, the
 * computed loads and footings, and every advisory already on screen. So it
 * answers about this deck rather than decks in general, and it quotes the same
 * numbers the panels beside it are showing.
 *
 * It proposes; it does not edit. When the answer implies a change, the change
 * arrives as a button with the reason attached, and nothing moves until it is
 * pressed. That is not caution for its own sake — a permit set has to be the
 * drawing that was reviewed, and an assistant that adjusted a joist size while
 * answering a question about stairs would make that impossible to guarantee.
 */
import { useCallback, useRef, useState } from 'react';
import {
  Sparkles, Loader2, Send, CornerDownLeft, AlertTriangle, Building2, Check,
  Wand2, Wrench,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../lib/supabase';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import type { DeckModel } from '../lib/deckModel';

const SERVER = `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6`;

interface Turn {
  role: 'user' | 'assistant';
  content: string;
  changes?: { field: string; value: any; why?: string }[];
  needsFromTown?: string[];
  engineerRequired?: boolean;
  applied?: boolean;
}

/** Openers worth having on a button, because they are what actually gets asked. */
const STARTERS = [
  'Is this framing right for the span?',
  'What size footings do I need here?',
  'How do I attach the ledger on this one?',
  'What will the inspector look for?',
];

interface Props {
  model: DeckModel;
  site: any;
  loads: any;
  takeoff: any;
  structural: any;
  advisories: { level: string; text: string }[];
  onApply: (patch: Partial<DeckModel>) => void;
  /** What the job folder gave up: the house read, and any drawing read. */
  findings?: { house?: any; sketch?: any };
}

/**
 * The two things worth a button rather than a typed question.
 *
 * Both are ordinary questions to the same endpoint and come back through the
 * same propose-then-apply path — no separate privileged route where the
 * assistant gets to edit the design directly. What the buttons buy is that the
 * question is well-formed: "design this deck" phrased carelessly gets a lecture
 * about decks, and "fix the problems" without naming them gets a guess at which
 * problems were meant.
 */
const GENERATE_Q =
  'Design this deck from everything you have been given — the drawing if there is one, '
  + 'the site photos, and the town\'s load figures. Where the drawing is dimensioned use those '
  + 'dimensions; where it is not, say what you are inferring and from what. Put every dimension '
  + 'and member size you settle on into "changes". If something you need is missing, say which '
  + 'and design around it conservatively rather than inventing it.';

const FIX_Q =
  'Go through the blocking problems and advisories currently showing and fix what can be fixed '
  + 'by changing the design. For each one, say what is wrong, what you changed, and why that '
  + 'resolves it. Put the changes in "changes". Anything that cannot be resolved by a design '
  + 'change — a missing site figure, or something needing an engineer — list plainly instead of '
  + 'working around it.';

export default function DeckAssistant({
  model, site, loads, takeoff, structural, advisories, onApply, findings,
}: Props) {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  const ask = useCallback(async (question: string) => {
    const text = question.trim();
    if (!text || busy) return;

    setQ('');
    setTurns(t => [...t, { role: 'user', content: text }]);
    setBusy(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${SERVER}/design-assistant/ask`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token || publicAnonKey}`,
          apikey: publicAnonKey,
        },
        body: JSON.stringify({
          question: text,
          // Only the text of prior turns; the design context is rebuilt fresh
          // each time so the assistant never answers against a stale model.
          history: turns.map(t => ({ role: t.role, content: t.content })),
          model, site, loads, takeoff, structural, advisories, findings,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || `The assistant failed (${res.status}).`);

      setTurns(t => [...t, {
        role: 'assistant',
        content: json.answer,
        changes: json.changes || [],
        needsFromTown: json.needsFromTown || [],
        engineerRequired: json.engineerRequired,
      }]);
      setTimeout(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }), 60);
    } catch (err: any) {
      toast.error(err?.message || 'The assistant could not answer.');
      setTurns(t => t.slice(0, -1));
      setQ(text);
    } finally {
      setBusy(false);
    }
  }, [busy, turns, model, site, loads, takeoff, structural, advisories, findings]);

  /** Something was read off the folder, so there is more than the form to go on. */
  const hasFindings = !!(findings?.house || findings?.sketch?.model);
  /** Something is actually wrong, so the fix button has a job to do. */
  const wrongCount = (structural?.failures?.length || 0) + advisories.length;

  const applyChanges = useCallback((i: number) => {
    const turn = turns[i];
    if (!turn?.changes?.length) return;
    const patch: any = {};
    for (const ch of turn.changes) patch[ch.field] = ch.value;
    onApply(patch);
    setTurns(t => t.map((x, k) => (k === i ? { ...x, applied: true } : x)));
    toast.success(`Applied ${turn.changes.length} change${turn.changes.length > 1 ? 's' : ''}.`);
  }, [turns, onApply]);

  return (
    <div className="rounded-2xl border border-[#2A2A2A] bg-[#111] p-4">
      <h2 className="text-sm font-bold text-white flex items-center gap-2 mb-1">
        <Sparkles className="w-4 h-4 text-[#ea580c]" /> Ask about this deck
      </h2>
      <p className="text-xs text-gray-500 mb-3">
        It can see the whole design — spans, loads, footings and every warning showing above. It
        suggests changes; you decide whether to take them.
      </p>

      {/* The two whole-design actions. Always available rather than only on an
          empty conversation: fixing what is wrong is most wanted after a few
          changes have been made, which is exactly when the starters are gone. */}
      <div className="grid sm:grid-cols-2 gap-2 mb-3">
        <button onClick={() => ask(GENERATE_Q)} disabled={busy}
          className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold text-white transition disabled:opacity-40"
          style={{ background: 'linear-gradient(135deg,#7c3aed,#ea580c)' }}
          title={hasFindings
            ? 'Design the deck from the drawing and photos in the job folder'
            : 'Nothing has been read off a folder yet — it will design from the form values and the address alone'}>
          <Wand2 className="w-4 h-4" />
          {hasFindings ? 'Design it from the folder' : 'Design it from what is here'}
        </button>
        <button onClick={() => ask(FIX_Q)} disabled={busy || wrongCount === 0}
          className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold text-white transition disabled:opacity-40"
          style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}
          title={wrongCount ? 'Work through everything flagged and propose fixes' : 'Nothing is currently flagged'}>
          <Wrench className="w-4 h-4" />
          {wrongCount ? `Fix what is wrong (${wrongCount})` : 'Nothing flagged'}
        </button>
      </div>

      {turns.length === 0 && (
        <div className="grid sm:grid-cols-2 gap-2 mb-3">
          {STARTERS.map(s => (
            <button key={s} onClick={() => ask(s)} disabled={busy}
              className="text-left text-xs text-gray-300 px-3 py-2 rounded-xl border border-[#2A2A2A] hover:border-[#ea580c] hover:text-white transition disabled:opacity-40">
              {s}
            </button>
          ))}
        </div>
      )}

      {turns.length > 0 && (
        <div className="space-y-3 mb-3 max-h-[26rem] overflow-y-auto pr-1">
          {turns.map((t, i) => t.role === 'user' ? (
            <div key={i} className="flex justify-end">
              <div className="max-w-[85%] rounded-2xl rounded-br-sm px-3 py-2 text-sm text-white"
                style={{ background: 'rgba(234,88,12,0.18)', border: '1px solid rgba(234,88,12,0.4)' }}>
                {t.content}
              </div>
            </div>
          ) : (
            <div key={i} className="space-y-2">
              <div className="rounded-2xl rounded-bl-sm px-3 py-2 text-sm text-gray-200 bg-[#0A0A0A] border border-[#2A2A2A] whitespace-pre-wrap">
                {t.content}
              </div>

              {!!t.needsFromTown?.length && (
                <p className="flex items-start gap-2 text-xs text-blue-300 px-1">
                  <Building2 className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                  Needs from the building department: {t.needsFromTown.join(', ')}.
                </p>
              )}

              {t.engineerRequired && (
                <p className="flex items-start gap-2 text-xs text-red-300 px-1">
                  <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                  This is past prescriptive tables — an engineer has to sign it.
                </p>
              )}

              {!!t.changes?.length && (
                <div className="rounded-xl p-3"
                  style={{ background: 'rgba(234,88,12,0.07)', border: '1px solid rgba(234,88,12,0.3)' }}>
                  <div className="text-[10px] uppercase tracking-wide text-gray-500 mb-1.5">
                    Suggested changes
                  </div>
                  <div className="space-y-1.5 mb-2">
                    {t.changes.map((ch, k) => (
                      <div key={k} className="text-sm">
                        <span className="flex items-baseline justify-between gap-2">
                          <span className="text-gray-400">{ch.field}</span>
                          <span className="text-right shrink-0">
                            <span className="text-gray-600 line-through mr-1.5">
                              {String((model as any)[ch.field])}
                            </span>
                            <span className="text-white font-semibold">{String(ch.value)}</span>
                          </span>
                        </span>
                        {ch.why && <span className="block text-[11px] text-gray-500">{ch.why}</span>}
                      </div>
                    ))}
                  </div>
                  {t.applied ? (
                    <p className="flex items-center gap-1.5 text-xs text-green-400">
                      <Check className="w-3.5 h-3.5" /> Applied
                    </p>
                  ) : (
                    <button onClick={() => applyChanges(i)}
                      className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold text-white"
                      style={{ background: '#ea580c' }}>
                      <Check className="w-4 h-4" /> Apply to the design
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
          {busy && (
            <p className="flex items-center gap-2 text-xs text-gray-500 px-1">
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Thinking about your deck…
            </p>
          )}
          <div ref={endRef} />
        </div>
      )}

      <div className="flex items-end gap-2">
        <textarea value={q} onChange={e => setQ(e.target.value)} rows={2}
          placeholder="Ask anything — spans, footings, fasteners, what the inspector wants"
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); ask(q); }
          }}
          className="flex-1 px-3 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white text-sm placeholder:text-gray-600 focus:outline-none focus:border-[#ea580c] resize-none" />
        <button onClick={() => ask(q)} disabled={busy || !q.trim()}
          className="p-2.5 rounded-xl text-white disabled:opacity-40 shrink-0"
          style={{ background: '#ea580c' }} aria-label="Send">
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </button>
      </div>
      <p className="flex items-center gap-1.5 text-[11px] text-gray-600 mt-1.5">
        <CornerDownLeft className="w-3 h-3" /> Enter to send, Shift+Enter for a new line
      </p>
    </div>
  );
}
