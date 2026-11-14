/**
 * Tips: who is owed, and whether it reached them.
 *
 * Eric, 2026-11-14: "yes add the owner panel for tips".
 *
 * WHAT THIS SCREEN IS RESPONSIBLE FOR
 *
 * Tips here go to the crew who did the job, which makes them the crew's money
 * passing through this business. So the screen has one job above all others:
 * make an unpaid obligation impossible to lose. Owed is the loud number at the
 * top, unattributed tips sort first because they are the ones that cannot move
 * without a decision, and nothing disappears from the list once it is settled —
 * it just stops being owed.
 *
 * WHAT IT DELIBERATELY DOES NOT DO
 *
 * It does not pay anybody. Marking a tip paid out records that it reached them
 * and who said so; it moves no money, because getting pay to an employee is
 * payroll and it is reportable, and a button here that claimed to have done it
 * would be a lie about tax. The screen says that out loud rather than leaving
 * somebody to assume either way.
 *
 * THE SPLIT IS THE SERVER'S OWN
 *
 * `splitTip` is imported from the server module rather than reimplemented, the
 * way `quoteToPdfDocument` imports `quoteCustomerPrice`. A second copy of the
 * rounding rule is a second answer to "what is each person owed", and the one
 * on screen would be the one somebody quotes.
 */
import { useEffect, useState } from 'react';
import { Loader2, Heart, AlertTriangle, Check, Users } from 'lucide-react';
import { toast } from 'sonner';
import { authedHeaders } from '../../utils/authHeaders';
import { API_BASE_URL } from '../../lib/apiConfig';
import { splitTip } from '../../../../supabase/functions/server/tips.ts';

const SERVER = `${API_BASE_URL}/make-server-3eae23a6`;
const money = (n: number) => `$${(Number(n) || 0).toFixed(2)}`;

export default function TipsPanel() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tips, setTips] = useState<any[]>([]);
  const [owedTotal, setOwedTotal] = useState(0);
  const [busyId, setBusyId] = useState('');
  /** Names typed against an unattributed tip, before it is settled. */
  const [naming, setNaming] = useState<Record<string, string>>({});

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${SERVER}/tips`, { headers: await authedHeaders() });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) throw new Error(data?.error || `Could not read the tips (${res.status}).`);
      /*
       * Unattributed and owed first. They are the only ones that cannot move
       * without somebody deciding something, so they are the only ones worth
       * putting at the top of a list that will get long.
       */
      const rows = (data.tips || []).slice().sort((a: any, b: any) => {
        const stuck = (t: any) => (t.status === 'owed' && t.unattributed ? 0 : t.status === 'owed' ? 1 : 2);
        return stuck(a) - stuck(b) || String(b.createdAt || '').localeCompare(String(a.createdAt || ''));
      });
      setTips(rows);
      setOwedTotal(Number(data.owedTotal) || 0);
    } catch (err: any) {
      setError(err?.message || 'Could not read the tips.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const markPaid = async (tip: any) => {
    const typed = (naming[tip.id] || '').trim();
    const crew = typed
      ? typed.split(',').map((part) => {
          const name = part.trim();
          return { name, email: name.includes('@') ? name.toLowerCase() : '' };
        }).filter((m) => m.name)
      : undefined;

    if (tip.unattributed && !crew?.length) {
      toast.error('Say who it went to first — that is the whole point of the record.');
      return;
    }

    setBusyId(tip.id);
    try {
      const res = await fetch(`${SERVER}/tips/${tip.id}/paid-out`, {
        method: 'POST',
        headers: await authedHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(crew ? { crew } : {}),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) throw new Error(data?.error || `That did not save (${res.status}).`);
      setTips((rows) => rows.map((t) => (t.id === tip.id ? data.tip : t)));
      setOwedTotal((n) => Math.round((n - (Number(tip.amount) || 0)) * 100) / 100);
      toast.success('Marked as paid out', { description: 'Recorded against you and the date. No money moved.' });
    } catch (err: any) {
      toast.error(err?.message || 'Could not update that tip.');
    } finally {
      setBusyId('');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-400" style={{ padding: '24px' }}>
        <Loader2 className="w-4 h-4 animate-spin" /> Reading the tips…
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl" style={{ padding: '20px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)' }}>
        <p className="text-sm font-bold text-red-400">{error}</p>
        <button onClick={() => void load()} className="mt-3 text-xs font-bold text-orange-400">Try again</button>
      </div>
    );
  }

  const stuck = tips.filter((t) => t.status === 'owed' && t.unattributed);

  return (
    <div className="space-y-5">
      <div className="rounded-2xl" style={{ padding: '20px', background: '#0d0d0d', border: '1px solid rgba(255,255,255,0.08)' }}>
        <h2 className="flex items-center gap-2 text-lg font-black text-white">
          <Heart className="w-5 h-5 text-orange-400" /> Tips for the crew
        </h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl" style={{ padding: '16px', background: owedTotal > 0 ? 'rgba(234,88,12,0.08)' : 'rgba(255,255,255,0.03)', border: `1px solid ${owedTotal > 0 ? 'rgba(234,88,12,0.3)' : 'rgba(255,255,255,0.08)'}` }}>
            <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Owed to crew</p>
            <p className="mt-1 text-3xl font-black text-white tabular-nums">{money(owedTotal)}</p>
          </div>
          <div className="rounded-xl" style={{ padding: '16px', background: stuck.length ? 'rgba(234,179,8,0.08)' : 'rgba(255,255,255,0.03)', border: `1px solid ${stuck.length ? 'rgba(234,179,8,0.3)' : 'rgba(255,255,255,0.08)'}` }}>
            <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Waiting on you</p>
            <p className="mt-1 text-3xl font-black text-white tabular-nums">{stuck.length}</p>
            <p className="text-[11px] text-gray-500">with nobody recorded on the job</p>
          </div>
        </div>

        <p className="mt-3 text-xs leading-relaxed text-gray-500">
          This is money customers gave to the people who did the work. Marking one paid out is a
          <strong className="text-gray-300"> record that it reached them</strong> — it moves no money and
          runs no payroll. These are reportable pay; whoever does your books needs to see this list.
        </p>
      </div>

      {tips.length === 0 && (
        <div className="rounded-2xl text-center" style={{ padding: '32px', background: '#0d0d0d', border: '1px solid rgba(255,255,255,0.08)' }}>
          <p className="text-sm text-gray-400">No tips yet.</p>
          <p className="mt-1 text-xs text-gray-600">
            Customers can leave one when they pay an invoice, or any time from their Payments tab.
          </p>
        </div>
      )}

      <div className="space-y-3">
        {tips.map((tip) => {
          const parts = splitTip(Number(tip.amount) || 0, tip.crew || []);
          const owed = tip.status === 'owed';
          return (
            <div key={tip.id} className="rounded-2xl" style={{
              padding: '18px',
              background: '#0d0d0d',
              border: `1px solid ${owed && tip.unattributed ? 'rgba(234,179,8,0.35)' : owed ? 'rgba(234,88,12,0.25)' : 'rgba(255,255,255,0.08)'}`,
            }}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-2xl font-black text-white tabular-nums">{money(tip.amount)}</p>
                  <p className="mt-0.5 text-xs text-gray-500">
                    from {tip.customerEmail} · {String(tip.createdAt || '').slice(0, 10)}
                    {tip.invoiceId ? ' · with an invoice payment' : ''}
                  </p>
                </div>
                <span className="text-[10px] font-black uppercase tracking-wide rounded-full" style={{
                  padding: '6px 12px',
                  background: owed ? 'rgba(234,88,12,0.15)' : 'rgba(34,197,94,0.12)',
                  color: owed ? '#fb923c' : '#4ade80',
                }}>
                  {owed ? 'owed' : 'paid out'}
                </span>
              </div>

              {tip.message && (
                <p className="mt-3 text-sm italic text-gray-300" style={{ padding: '10px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
                  “{tip.message}”
                </p>
              )}

              {tip.unattributed ? (
                <div className="mt-3 rounded-xl" style={{ padding: '14px', background: 'rgba(234,179,8,0.06)', border: '1px solid rgba(234,179,8,0.25)' }}>
                  <p className="flex items-center gap-2 text-xs font-black text-yellow-400">
                    <AlertTriangle className="w-3.5 h-3.5" /> Nobody was recorded on that job
                  </p>
                  <p className="mt-1 text-[11px] text-yellow-200/70">
                    Name who it went to. Assigning crew to the job when you schedule it means this
                    fills itself in next time.
                  </p>
                  {owed && (
                    <input
                      value={naming[tip.id] || ''}
                      onChange={(e) => setNaming((n) => ({ ...n, [tip.id]: e.target.value }))}
                      placeholder="Who it went to, comma separated"
                      className="mt-2 w-full rounded-lg text-sm text-white bg-transparent"
                      style={{ border: '1px solid rgba(255,255,255,0.15)', padding: '10px 12px' }}
                    />
                  )}
                </div>
              ) : (
                <div className="mt-3">
                  <p className="flex items-center gap-2 text-xs font-bold text-gray-400">
                    <Users className="w-3.5 h-3.5" /> {parts.length === 1 ? 'For' : `Split ${parts.length} ways`}
                  </p>
                  <div className="mt-2 space-y-1">
                    {parts.map((p, i) => (
                      <div key={i} className="flex items-center justify-between text-sm">
                        <span className="text-gray-300">{p.member.name}</span>
                        <span className="font-bold text-white tabular-nums">{money(p.amount)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {owed ? (
                <button
                  onClick={() => void markPaid(tip)}
                  disabled={busyId === tip.id}
                  className="mt-4 w-full flex items-center justify-center gap-2 rounded-xl text-sm font-black text-black disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg,#f97316,#ea580c)', padding: '12px' }}
                >
                  {busyId === tip.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  I have paid this to them
                </button>
              ) : (
                <p className="mt-3 text-[11px] text-gray-600">
                  Marked paid out by {tip.paidOutBy} on {String(tip.paidOutAt || '').slice(0, 10)}.
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
