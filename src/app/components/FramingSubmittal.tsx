/**
 * Building a framing submittal and getting it in front of an architect.
 *
 * The schedule is assembled from calculations that already exist rather than
 * retyped, because a number typed twice is a number that will disagree with
 * itself. What this screen adds is the part a calculation cannot produce: what
 * we could not determine and want a ruling on.
 *
 * WHY THE LINK IS SHOWN EXACTLY ONCE
 *
 * Only a hash of it is stored, so there is nothing to show later. That is
 * deliberate — a link recoverable from our own records is a link recoverable by
 * anyone who reaches those records. The screen says so plainly at the moment it
 * matters rather than letting somebody navigate away and find out.
 */
import { useCallback, useMemo, useState } from 'react';
import {
  FileCheck2, Loader2, Send, AlertTriangle, Copy, Check, Plus, Trash2,
  ShieldCheck, HelpCircle, Ban,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../lib/supabase';
import { projectId as supabaseProjectId } from '../utils/supabase/info';
import {
  type FramingSubmittal as Submittal, type MemberRow, type OpenQuestion,
  STATE_LABEL, assumptionLines, memberPasses, submittalGaps, submittalNote,
  isSendable, architectView, reviseFor,
} from '../lib/framingModel';

const SERVER = `https://${supabaseProjectId}.supabase.co/functions/v1/make-server-3eae23a6`;
const card = 'rounded-2xl border border-[#2A2A2A] bg-[#111] p-4';
const tiny = 'px-2 py-1 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white text-xs focus:outline-none focus:border-[#ea580c]';

export default function FramingSubmittalPanel({ submittal, onChange, designProjectId }: {
  submittal: Submittal;
  onChange: (s: Submittal) => void;
  designProjectId?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [issued, setIssued] = useState<{ link: string; expiresAt: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [newQuestion, setNewQuestion] = useState('');

  const gaps = useMemo(() => submittalGaps(submittal), [submittal]);
  const blocking = gaps.filter(g => g.severity === 'blocking');
  const assumptions = useMemo(() => assumptionLines(submittal.assumptions), [submittal.assumptions]);

  const addQuestion = () => {
    if (!newQuestion.trim()) return;
    const q: OpenQuestion = {
      id: `q_${Date.now().toString(36)}`,
      question: newQuestion.trim(),
    };
    onChange({ ...submittal, questions: [...submittal.questions, q] });
    setNewQuestion('');
  };

  const patchQuestion = (id: string, p: Partial<OpenQuestion>) =>
    onChange({
      ...submittal,
      questions: submittal.questions.map(q => (q.id === id ? { ...q, ...p } : q)),
    });

  const send = useCallback(async () => {
    if (!designProjectId) {
      toast.error('Save the project first — a link has to belong to something.');
      return;
    }
    if (!isSendable(submittal)) {
      toast.error('Fix what is blocking this before an architect spends time on it.');
      return;
    }
    setBusy(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${SERVER}/architect-review/links`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token || ''}`,
        },
        body: JSON.stringify({
          designProjectId,
          submittalId: submittal.id,
          // Filtered here, and filtered again on arrival. Two independent
          // filters are what stops one careless edit from mattering.
          view: architectView(submittal),
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) { toast.error(data?.error || 'That link could not be issued.'); return; }

      setIssued({ link: data.link, expiresAt: data.expiresAt });
      onChange({ ...submittal, state: 'sent', sentOn: new Date().toISOString().slice(0, 10) });
      toast.success('Link issued. Copy it now — it cannot be shown again.');
    } catch (err: any) {
      toast.error(err?.message || 'That link could not be issued.');
    } finally {
      setBusy(false);
    }
  }, [designProjectId, submittal, onChange]);

  const copy = async () => {
    if (!issued) return;
    try {
      await navigator.clipboard.writeText(issued.link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Copy it by hand — the clipboard was refused.');
    }
  };

  if (!submittal.members.length && submittal.state === 'draft') return null;

  return (
    <div className="space-y-4">
      <div className={card}>
        <div className="flex items-start justify-between gap-2 mb-1">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <FileCheck2 className="w-4 h-4 text-[#ea580c]" /> Framing submittal
          </h2>
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-lg border shrink-0 ${
            submittal.state === 'approved' ? 'border-emerald-500/40 text-emerald-300 bg-emerald-500/10'
              : submittal.state === 'changes-requested' ? 'border-amber-500/40 text-amber-200 bg-amber-500/10'
              : submittal.state === 'sent' ? 'border-sky-500/40 text-sky-300 bg-sky-500/10'
              : 'border-[#2A2A2A] text-gray-400'}`}>
            {STATE_LABEL[submittal.state]} · rev {submittal.revision}
          </span>
        </div>
        <p className="text-xs text-gray-500">{submittalNote(submittal)}</p>
      </div>

      {/* ── what the numbers assumed ── */}
      <div className={card}>
        <h3 className="text-sm font-bold text-white mb-1">What these numbers assumed</h3>
        <p className="text-xs text-gray-500 mb-3">
          Stated first, because nobody can check a span without them. Anything not set is
          named as unstated rather than left blank — a reviewer cannot tell the difference
          between an assumption we omitted and one we never considered.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {assumptions.map(a => (
            <div key={a.label} className={`rounded-xl border p-2 ${
              a.missing ? 'border-amber-500/30 bg-amber-500/[0.05]' : 'border-[#2A2A2A] bg-[#0A0A0A]'}`}>
              <p className="text-[10px] text-gray-500 uppercase tracking-wide truncate">{a.label}</p>
              <p className={`text-xs font-semibold mt-0.5 ${a.missing ? 'text-amber-300/90' : 'text-white'}`}>
                {a.value}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* ── the schedule ── */}
      <div className={card}>
        <h3 className="text-sm font-bold text-white mb-1">Member schedule</h3>
        <p className="text-xs text-gray-500 mb-3">
          Every member carries the check behind it. Utilisation is the worse of bending and
          deflection as a fraction of allowable — over 1.00 fails, and is shown failing.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-gray-600 border-b border-[#2A2A2A]">
                <th className="py-1 font-semibold">Where</th>
                <th className="py-1 font-semibold">Size</th>
                <th className="py-1 font-semibold text-right">Span</th>
                <th className="py-1 font-semibold text-right">Load</th>
                <th className="py-1 font-semibold text-right">Util.</th>
                <th className="py-1 font-semibold text-right">Defl.</th>
              </tr>
            </thead>
            <tbody>
              {submittal.members.map(m => {
                const passes = memberPasses(m);
                return (
                  <tr key={m.id} className="border-b border-[#1A1A1A]">
                    <td className="py-1 text-gray-300">
                      {m.location}
                      {m.spacingIn && <span className="text-gray-600"> @ {m.spacingIn}in</span>}
                    </td>
                    <td className="py-1 text-white font-semibold">
                      {m.count && m.count > 1 ? `${m.count}× ` : ''}{m.size}
                    </td>
                    <td className="py-1 text-right text-gray-400">
                      {m.spanFt !== undefined ? `${m.spanFt} ft` : '—'}
                    </td>
                    <td className="py-1 text-right text-gray-400">
                      {m.loadPlf !== undefined ? `${m.loadPlf} plf` : '—'}
                    </td>
                    <td className={`py-1 text-right font-semibold ${
                      passes === false ? 'text-red-400' : passes === true ? 'text-emerald-400' : 'text-gray-600'}`}>
                      {m.utilisation !== undefined ? m.utilisation.toFixed(2) : 'not calculated'}
                    </td>
                    <td className="py-1 text-right text-gray-400">
                      {m.deflectionRatio !== undefined ? `L/${m.deflectionRatio}` : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── how we build ── */}
      <div className={card}>
        <h3 className="text-sm font-bold text-white mb-1 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-[#ea580c]" /> How we build
        </h3>
        <p className="text-xs text-gray-500 mb-2">
          Ours rather than the code's, so nobody assumes the usual thing and sends back a
          detail we do not build.
        </p>
        <ul className="space-y-1.5">
          {submittal.standingDetails.map((d, i) => (
            <li key={i} className="text-[11px] text-gray-400 flex items-start gap-1.5">
              <Check className="w-3 h-3 shrink-0 mt-0.5 text-emerald-500/70" />{d}
            </li>
          ))}
        </ul>
      </div>

      {/* ── the questions ── */}
      <div className={card}>
        <h3 className="text-sm font-bold text-white mb-1 flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-[#ea580c]" /> What we want a ruling on
        </h3>
        <p className="text-xs text-gray-500 mb-3">
          A submittal with nothing to ask is a brochure. What we could not determine is the
          reason a reviewer is being paid — say what we assumed in the meantime and what
          changes if the assumption is wrong.
        </p>

        <ul className="space-y-2 mb-3">
          {submittal.questions.map(q => (
            <li key={q.id} className="rounded-xl border border-[#2A2A2A] bg-[#0A0A0A] p-2.5">
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <p className="text-xs text-gray-300">{q.question}</p>
                <button
                  onClick={() => onChange({
                    ...submittal,
                    questions: submittal.questions.filter(x => x.id !== q.id),
                  })}
                  className="text-gray-600 hover:text-red-400 shrink-0">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
              <input value={q.assumedAnswer || ''} placeholder="What we assumed in the meantime…"
                onChange={e => patchQuestion(q.id, { assumedAnswer: e.target.value })}
                className={`${tiny} w-full mb-1`} />
              <input value={q.ifWrong || ''} placeholder="What changes if that is wrong…"
                onChange={e => patchQuestion(q.id, { ifWrong: e.target.value })}
                className={`${tiny} w-full`} />
            </li>
          ))}
        </ul>

        <div className="flex gap-1.5">
          <input value={newQuestion} onChange={e => setNewQuestion(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addQuestion()}
            placeholder="Is the rear wall bearing?" className={`${tiny} flex-1`} />
          <button onClick={addQuestion}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white flex items-center gap-1.5"
            style={{ background: '#ea580c' }}>
            <Plus className="w-3.5 h-3.5" /> Add
          </button>
        </div>
      </div>

      {/* ── what stops it ── */}
      {gaps.length > 0 && submittal.state === 'draft' && (
        <div className={card}>
          <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" /> Before an architect sees this
          </h3>
          <div className="space-y-1.5">
            {gaps.map((g, i) => (
              <p key={i} className={`text-[11px] flex items-start gap-1.5 ${
                g.severity === 'blocking' ? 'text-red-300' : 'text-amber-200/85'}`}>
                <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" />{g.message}
              </p>
            ))}
          </div>
        </div>
      )}

      {/* ── their answer ── */}
      {submittal.response && (
        <div className={`rounded-2xl border p-4 ${
          submittal.response.verdict === 'approved'
            ? 'border-emerald-500/30 bg-emerald-500/[0.06]'
            : 'border-amber-500/30 bg-amber-500/[0.06]'}`}>
          <h3 className={`text-sm font-bold mb-1 ${
            submittal.response.verdict === 'approved' ? 'text-emerald-300' : 'text-amber-200'}`}>
            {submittal.response.verdict === 'approved' ? 'Approved' : 'Changes requested'}
          </h3>
          <p className="text-[11px] text-gray-400 mb-2">
            {submittal.response.reviewer}
            {submittal.response.credential && `, ${submittal.response.credential}`}
            {' · '}{new Date(submittal.response.respondedAt).toLocaleDateString()}
          </p>
          {submittal.response.comments && (
            <p className="text-xs text-gray-300 whitespace-pre-wrap">{submittal.response.comments}</p>
          )}
          {submittal.response.verdict === 'changes-requested' && (
            <button onClick={() => onChange(reviseFor(submittal))}
              className="mt-3 px-3 py-1.5 rounded-lg text-xs font-semibold text-white"
              style={{ background: '#ea580c' }}>
              Start revision {submittal.revision + 1}
            </button>
          )}
        </div>
      )}

      {/* ── the link ── */}
      {issued ? (
        <div className="rounded-2xl border border-[#ea580c]/40 bg-[#ea580c]/[0.06] p-4">
          <h3 className="text-sm font-bold text-white mb-1">Copy this now</h3>
          <p className="text-xs text-amber-200/90 mb-2">
            Only a hash of this link is stored, so it cannot be shown again — not to you, and
            not to anybody who reaches our records. If it is lost, issue a new one.
            It stops working on {new Date(issued.expiresAt).toLocaleDateString()}.
          </p>
          <div className="flex gap-1.5">
            <input readOnly value={issued.link} onFocus={e => e.currentTarget.select()}
              className={`${tiny} flex-1 font-mono`} />
            <button onClick={copy}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white flex items-center gap-1.5"
              style={{ background: '#ea580c' }}>
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
        </div>
      ) : submittal.state === 'draft' ? (
        <button onClick={send} disabled={busy || blocking.length > 0}
          className="w-full px-3 py-2.5 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-40"
          style={{ background: '#ea580c' }}>
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          {busy ? 'Issuing…' : 'Issue a review link for the architect'}
        </button>
      ) : submittal.state === 'sent' ? (
        <p className="text-[11px] text-gray-500 flex items-center gap-1.5">
          <Ban className="w-3.5 h-3.5" />
          A link is out for revision {submittal.revision}. Issue another only if that one was lost —
          each is independent and any of them can answer.
        </p>
      ) : null}
    </div>
  );
}
