/**
 * DesignAssistant — someone to ask, without leaving the design.
 *
 * It sees what is on screen: the model, the site values, the takeoff, the
 * computed loads and footings, every advisory already showing, and the building
 * itself — elevations and rooms, each number carrying whether it was measured
 * or read off a photograph. So it answers about this job rather than about
 * construction in general, and it quotes the same figures the panels beside it
 * are showing.
 *
 * IT USED TO BE THE DECK ASSISTANT, AND ONLY THAT
 *
 * Its prompt opened "You are sitting with a deck builder" and reasoned in DCA 6
 * span tables, and the designer rendered it only when the deck section was
 * open. Seven of the eight trades had no assistant at all, and the comment
 * above the gate in `DeckDesigner` claimed the opposite. Now the section it is
 * in travels with the question, the server assembles the prompt from that
 * trade's knowledge, and the openers below match where you are standing.
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

/**
 * Openers worth having on a button, because they are what actually gets asked.
 *
 * Per trade, because the deck set was on screen in every section and a row of
 * buttons offering to check your joist spans while you lay out a bathroom is a
 * clear signal that the thing has not understood where it is. Four is the
 * limit: these are a way in for somebody who does not know what to ask, not a
 * menu of what it can do.
 */
const STARTERS: Record<string, string[]> = {
  deck: [
    'Is this framing right for the span?',
    'What size footings do I need here?',
    'How do I attach the ledger on this one?',
    'What will the inspector look for?',
  ],
  addition: [
    'Can this wall come out?',
    'What does tying into the existing roof involve?',
    'Does this new bedroom meet egress?',
    'Will the existing heating cover this?',
  ],
  structures: [
    'What size rafters for this span?',
    'How does this attach to the house?',
    'Does this need lateral bracing?',
    'What does the snow load do to this?',
  ],
  hardscape: [
    'How deep should the base be?',
    'Which way should this drain?',
    'Does this wall need engineering?',
    'What edge restraint does this need?',
  ],
  siding: [
    'What goes behind this before the siding?',
    'Where do I need kick-out flashing?',
    'How much clearance to grade?',
    'Can I side over what is there?',
  ],
  openings: [
    'What header does this opening need?',
    'How do I flash this sill properly?',
    'Does this window meet egress?',
    'What rough opening should I frame?',
  ],
  kitchen: [
    'Is there enough room between these runs?',
    'Where should the hood vent to?',
    'Does this layout work for two cooks?',
    'What landing space am I missing?',
  ],
  bathroom: [
    'Are these fixture clearances legal?',
    'What ventilation does this need?',
    'Can I move the toilet here?',
    'What goes behind the tile in the shower?',
  ],
  flooring: [
    'Will this go over what is down now?',
    'How flat does the subfloor need to be?',
    'What expansion gap do I need?',
    'How do I handle the transitions?',
  ],
  roofing: [
    'What underlayment does this need?',
    'How much ventilation should this roof have?',
    'What flashing does this valley need?',
    'Can this go over the existing layer?',
  ],
};

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
  /**
   * Which section of the design centre is open.
   *
   * Decides which trade's knowledge the server assembles its prompt from, and
   * which openers appear here. Defaulted rather than required so an older
   * caller still gets the behaviour it had.
   */
  trade?: string;
  /**
   * The building — elevations and rooms, each field carrying where its number
   * came from. Every trade works on this; only the deck has a model of its own.
   */
  house?: any;
  /**
   * The floor plan. Sent for every trade, not only additions: "can this wall
   * come out" gets asked while laying out a kitchen at least as often.
   */
  plan?: any;
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

export default function DesignAssistant({
  model, site, loads, takeoff, structural, advisories, onApply, findings, trade, house, plan,
}: Props) {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  /** The deck is the only trade with a model this panel can patch. */
  const isDeck = (trade || 'deck') === 'deck';

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
          // The section they are in, and the building itself. Without the first
          // the assistant answered every question as a deck question; without
          // the second it knew the deck's dimensions and nothing about the
          // house every other trade is working on.
          trade, house, plan,
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
        {isDeck
          ? 'It can see the whole design — spans, loads, footings and every warning showing '
            + 'above. It suggests changes; you decide whether to take them.'
          : 'It can see the rooms and elevations captured so far, and whether each number was '
            + 'measured or read off a photograph. It answers; it does not change anything here.'}
      </p>

      {/* The two whole-design actions. Always available rather than only on an
          empty conversation: fixing what is wrong is most wanted after a few
          changes have been made, which is exactly when the starters are gone.

          Deck only, because both produce a patch for the deck model and there
          is nothing else wired up to apply one. Offering "Design it from what
          is here" on the bathroom section would return sound advice and then
          have no button to press, which reads as broken rather than as
          unfinished. */}
      <div className={`grid sm:grid-cols-2 gap-2 mb-3 ${isDeck ? '' : 'hidden'}`}>
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
          {(STARTERS[trade || 'deck'] || STARTERS.deck).map(s => (
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
