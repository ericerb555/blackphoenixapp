import { useEffect, useState } from 'react';
import {
  Users, RefreshCw, Loader2, DollarSign, CheckCircle2, XCircle, Inbox, Crown,
} from 'lucide-react';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { supabase } from '../lib/supabase';

const SERVER = `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6`;

interface Subscriber {
  email: string;
  active: boolean;
  tier: string;
  plan: string;
  audience: string;
  priceMonthly: number;
  started_at: string;
  updated_at: string;
  status_note: string | null;
  stripe_subscription: string | null;
}
interface Stats { total: number; active: number; mrr: number; }

const AUDIENCE_LABEL: Record<string, string> = {
  landlord: 'Landlord',
  'condo-association': 'Condo Association',
};

export default function AISubscribersPanel() {
  const [subs, setSubs] = useState<Subscriber[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, active: 0, mrr: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${SERVER}/investments/ai-subscribers`, {
        headers: { Authorization: `Bearer ${session?.access_token || publicAnonKey}` },
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 403) throw new Error('Administrator access is required to view subscribers.');
      if (!res.ok || data.error) throw new Error(data.error || `Server returned ${res.status}`);
      setSubs(data.subscribers || []);
      setStats(data.stats || { total: 0, active: 0, mrr: 0 });
    } catch (err: any) {
      console.error('AISubscribersPanel: failed to load subscribers:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const fmtDate = (d: string) => (d ? new Date(d).toLocaleDateString() : '—');

  return (
    <div className="bg-[#141414] border border-[#2A2A2A] rounded-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-bold text-white"><Users className="w-6 h-6 text-orange-400" /> AI Property Studio Subscribers</h2>
          <p className="text-sm text-gray-400 mt-1">Landlords and condo associations subscribed to Property Intelligence.</p>
        </div>
        <button onClick={load} className="flex items-center gap-2 px-4 py-2 bg-[#0F0F0F] border border-[#2A2A2A] rounded-lg text-gray-300 hover:text-white hover:border-orange-500/50 transition-all">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <Stat icon={Users} label="Total" value={String(stats.total)} />
        <Stat icon={CheckCircle2} label="Active" value={String(stats.active)} accent="text-emerald-400" />
        <Stat icon={DollarSign} label="MRR" value={`$${stats.mrr.toLocaleString()}`} accent="text-orange-400" />
      </div>

      {error && <div className="mb-4 bg-red-500/10 border border-red-500/40 rounded-lg p-3 text-sm text-red-300">{error}</div>}

      {loading ? (
        <div className="flex items-center justify-center py-16 text-gray-500"><Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading…</div>
      ) : subs.length === 0 ? (
        <div className="text-center py-16">
          <Inbox className="w-10 h-10 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400">No subscribers yet.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b border-[#2A2A2A]">
                <th className="pb-3 font-medium">Subscriber</th>
                <th className="pb-3 font-medium">Plan</th>
                <th className="pb-3 font-medium">Audience</th>
                <th className="pb-3 font-medium">Price</th>
                <th className="pb-3 font-medium">Status</th>
                <th className="pb-3 font-medium">Since</th>
              </tr>
            </thead>
            <tbody>
              {subs.map((s) => (
                <tr key={s.email} className="border-b border-[#1F1F1F] hover:bg-[#1A1A1A]">
                  <td className="py-3 text-white">{s.email}</td>
                  <td className="py-3 text-gray-300">{s.plan || s.tier}</td>
                  <td className="py-3 text-gray-400">{AUDIENCE_LABEL[s.audience] || s.audience || '—'}</td>
                  <td className="py-3 text-gray-300">${s.priceMonthly.toLocaleString()}/mo</td>
                  <td className="py-3">
                    {s.active ? (
                      <span className="inline-flex items-center gap-1 text-emerald-400"><CheckCircle2 className="w-4 h-4" /> Active</span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-gray-500" title={s.status_note || ''}><XCircle className="w-4 h-4" /> Inactive</span>
                    )}
                    {!s.stripe_subscription && s.active && (
                      <span className="ml-2 inline-flex items-center gap-1 text-[10px] text-orange-400" title="Activated without Stripe (owner grant / legacy)"><Crown className="w-3 h-3" /> comp</span>
                    )}
                  </td>
                  <td className="py-3 text-gray-400">{fmtDate(s.started_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Stat({ icon: Icon, label, value, accent = 'text-white' }: { icon: typeof Users; label: string; value: string; accent?: string }) {
  return (
    <div className="bg-[#0F0F0F] border border-[#2A2A2A] rounded-xl p-4">
      <div className="flex items-center gap-2 text-gray-500 text-xs uppercase tracking-wide mb-1"><Icon className="w-4 h-4" /> {label}</div>
      <p className={`text-2xl font-bold ${accent}`}>{value}</p>
    </div>
  );
}
