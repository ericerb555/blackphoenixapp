/**
 * Tipping with no bill attached.
 *
 * Eric chose two places for this: on an invoice, and a button always in the
 * portal. This is the second one — somebody whose job is already paid for, or
 * who simply wants to, and has nothing in front of them to add it to.
 *
 * WHY IT ASKS WHICH JOB
 *
 * Because the tip goes to the crew who did the work, and the only way this
 * platform knows who that was is the job record. Without a job the money is
 * still taken and still recorded — as UNATTRIBUTED, for the office to allocate
 * — but nobody can be named, which is a worse outcome for everyone. So the job
 * picker is the first thing, pre-selected to the most recent one, rather than
 * an afterthought at the bottom.
 */
import { useState } from 'react';
import { Heart, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../../lib/supabase';
import { publicAnonKey } from '../../utils/supabase/info';
import { API_BASE_URL } from '../../lib/apiConfig';
import TipControl from './TipControl';

interface Props {
  /** The customer's jobs, most recent first. */
  workRequests?: any[];
  customerEmail?: string;
}

export default function TipCrewCard({ workRequests = [], customerEmail }: Props) {
  const [open, setOpen] = useState(false);
  const [tip, setTip] = useState(0);
  const [jobId, setJobId] = useState<string>(() => String(workRequests[0]?.id || ''));
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const send = async () => {
    if (tip <= 0) { toast.error('Choose an amount first.'); return; }
    setBusy(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const tok = session?.access_token || publicAnonKey;
      const res = await fetch(`${API_BASE_URL}/make-server-3eae23a6/payments/create-checkout`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${tok}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // No amount: this is a tip and nothing else. The server allows a
          // payment of zero only when a tip is attached.
          amount: 0,
          tip,
          tipMessage: message,
          workRequestId: jobId || undefined,
          description: 'Tip for the crew',
          clientEmail: customerEmail,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (data.checkoutUrl) window.location.assign(data.checkoutUrl);
      else toast.error(data.error || 'Could not start that. Contact us and we will sort it out.');
    } catch (err: any) {
      toast.error(err?.message || 'Could not start that.');
    } finally {
      setBusy(false);
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full flex items-center justify-center gap-2 rounded-xl text-sm font-bold text-orange-300 transition-colors hover:text-orange-200"
        style={{ padding: '14px', background: 'rgba(234,88,12,0.06)', border: '1px solid rgba(234,88,12,0.2)' }}
      >
        <Heart className="w-4 h-4" /> Leave a tip for the crew
      </button>
    );
  }

  return (
    <div className="rounded-xl space-y-3" style={{ padding: '16px', background: '#0d0d0d', border: '1px solid rgba(234,88,12,0.25)' }}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-black text-white">Leave a tip for the crew</p>
          <p className="mt-0.5 text-xs text-gray-400">It reaches the people who did the work.</p>
        </div>
        <button onClick={() => setOpen(false)} className="text-xs font-bold text-gray-500">Close</button>
      </div>

      {workRequests.length > 0 ? (
        <label className="block">
          <span className="text-xs font-bold text-gray-400">Which job?</span>
          <select
            value={jobId} onChange={(e) => setJobId(e.target.value)}
            className="mt-1 w-full rounded-lg text-sm text-white"
            style={{ background: '#111', border: '1px solid rgba(255,255,255,0.15)', padding: '10px 12px' }}
          >
            {workRequests.slice(0, 20).map((wr: any) => (
              <option key={wr.id} value={wr.id}>
                {wr.project_name || wr.title || wr.serviceType || 'Job'}
                {wr.created_at ? ` — ${String(wr.created_at).slice(0, 10)}` : ''}
              </option>
            ))}
            <option value="">Not about a particular job</option>
          </select>
          <span className="mt-1 block text-[11px] text-gray-600">
            Telling us which job is how we know whose tip it is.
          </span>
        </label>
      ) : (
        <p className="text-xs text-gray-500">
          We will pass this on — tell us below who it is for if you know their name.
        </p>
      )}

      <TipControl value={tip} onChange={setTip} note="It goes to the people who did the work, not to the company." />

      <textarea
        value={message} onChange={(e) => setMessage(e.target.value)} rows={2}
        placeholder="A note for them, if you like"
        className="w-full rounded-lg text-sm text-white bg-transparent"
        style={{ border: '1px solid rgba(255,255,255,0.15)', padding: '10px 12px' }}
      />

      <button
        onClick={() => void send()} disabled={busy || tip <= 0}
        className="w-full rounded-xl text-sm font-black text-black disabled:opacity-40"
        style={{ background: 'linear-gradient(135deg,#f97316,#ea580c)', padding: '14px' }}
      >
        {busy ? (
          <span className="flex items-center justify-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Starting…</span>
        ) : tip > 0 ? `Send $${tip.toFixed(2)} to the crew` : 'Choose an amount'}
      </button>
    </div>
  );
}
