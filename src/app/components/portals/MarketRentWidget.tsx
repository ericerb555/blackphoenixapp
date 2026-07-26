import { useState } from 'react';
import { toast } from 'sonner';
import {
  TrendingUp, MapPin, LoaderCircle, RefreshCw, Sparkles, Home, DollarSign,
} from 'lucide-react';
import { projectId } from '../../utils/supabase/info';

const SERVER = `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6`;

interface RentType { type: string; low: number; typical: number; high: number; }
interface Estimate {
  area?: string; currency?: string; byType?: RentType[]; pricePerSqFt?: number;
  yoyTrend?: string; demand?: string; summary?: string; tips?: string[];
  address?: string; generatedAt?: string; source?: string;
  live?: { rent?: number; rentRangeLow?: number; rentRangeHigh?: number; comparableCount?: number } | null;
}

function money(n: number) {
  if (!Number.isFinite(n)) return '—';
  return `$${Math.round(n).toLocaleString()}`;
}

function demandColor(d?: string) {
  const v = String(d || '').toLowerCase();
  if (v === 'high') return 'bg-green-500/10 text-green-400 border-green-500/20';
  if (v === 'low') return 'bg-red-500/10 text-red-400 border-red-500/20';
  return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
}

export default function MarketRentWidget({ session, initialAddress = '' }: { session: any; initialAddress?: string }) {
  const [address, setAddress] = useState(initialAddress);
  const [estimate, setEstimate] = useState<Estimate | null>(null);
  const [loading, setLoading] = useState(false);
  const [fromCache, setFromCache] = useState(false);

  const authHeaders = session?.access_token ? { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' } : undefined;

  const fetchRates = async (forceRefresh = false) => {
    if (!address.trim() || address.trim().length < 5) { toast.error('Enter a full property address.'); return; }
    if (!authHeaders) { toast.error('Sign in to view market rates.'); return; }
    setLoading(true);
    try {
      const res = await fetch(`${SERVER}/landlord/market-rent`, {
        method: 'POST', headers: authHeaders,
        body: JSON.stringify({ address, forceRefresh }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok || !payload?.success) throw new Error(payload?.error || 'Unable to fetch market rates.');
      setEstimate(payload.estimate);
      setFromCache(Boolean(payload.cached));
      toast.success(payload.cached ? 'Loaded latest saved rates.' : 'Fresh market rates generated.');
    } catch (error: any) { toast.error(error?.message || 'Unable to fetch market rates.'); }
    finally { setLoading(false); }
  };

  const inputClass = 'w-full rounded-lg border border-[#363636] bg-[#0A0A0A] px-3 py-2.5 text-sm text-white outline-none focus:border-teal-500';

  return (
    <div className="rounded-xl border border-teal-500/25 bg-[#151515] p-5 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-500/10"><TrendingUp className="h-5 w-5 text-teal-300" /></div>
          <div>
            <h3 className="text-sm font-bold text-white">Market Rent Finder</h3>
            <p className="text-xs text-gray-400">AI-estimated area rents — see what you can charge.</p>
          </div>
        </div>
        {estimate?.source === 'rentcast+ai'
          ? <span className="inline-flex items-center gap-1 rounded-full border border-green-500/30 bg-green-500/10 px-2.5 py-0.5 text-[10px] font-bold uppercase text-green-300"><TrendingUp className="h-3 w-3" /> Live data</span>
          : <span className="inline-flex items-center gap-1 rounded-full border border-teal-500/30 bg-teal-500/10 px-2.5 py-0.5 text-[10px] font-bold uppercase text-teal-300"><Sparkles className="h-3 w-3" /> AI</span>}
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[220px]">
          <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
          <input value={address} onChange={e => setAddress(e.target.value)} onKeyDown={e => e.key === 'Enter' && fetchRates(false)} placeholder="14 Oak St, Manchester, NH" className={`${inputClass} pl-9`} />
        </div>
        <button onClick={() => fetchRates(false)} disabled={loading} className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-teal-500 disabled:opacity-60">
          {loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <TrendingUp className="h-4 w-4" />} Get rates
        </button>
      </div>

      {estimate && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-white"><Home className="h-4 w-4 text-teal-300" /> {estimate.area || estimate.address}</div>
            <div className="flex items-center gap-2">
              {estimate.demand && <span className={`rounded border px-2 py-0.5 text-xs font-bold ${demandColor(estimate.demand)}`}>{estimate.demand} demand</span>}
              <button onClick={() => fetchRates(true)} disabled={loading} title="Refresh with latest AI estimate" className="inline-flex items-center gap-1 rounded-lg border border-[#3a3a3a] px-2.5 py-1 text-xs font-semibold text-gray-300 transition hover:text-white disabled:opacity-60"><RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh</button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {(estimate.byType || []).map(t => (
              <div key={t.type} className="rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] p-3">
                <p className="text-xs font-semibold text-gray-400">{t.type}</p>
                <p className="mt-1 text-lg font-bold text-teal-300">{money(t.typical)}<span className="text-xs font-normal text-gray-500">/mo</span></p>
                <p className="text-[11px] text-gray-500">{money(t.low)}–{money(t.high)}</p>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-4 text-xs text-gray-400">
            {Number.isFinite(estimate.pricePerSqFt as number) && (estimate.pricePerSqFt as number) > 0 && <span className="inline-flex items-center gap-1"><DollarSign className="h-3.5 w-3.5 text-teal-300" /> {estimate.pricePerSqFt}/sq ft</span>}
            {estimate.yoyTrend && <span className="inline-flex items-center gap-1"><TrendingUp className="h-3.5 w-3.5 text-teal-300" /> {estimate.yoyTrend}</span>}
          </div>

          {estimate.live && Number.isFinite(estimate.live.rent as number) && (
            <div className="rounded-lg border border-green-500/20 bg-green-500/5 p-3 text-sm text-gray-300">
              <span className="font-semibold text-green-300">Live estimate for this exact address: </span>
              {money(estimate.live.rent as number)}/mo
              {estimate.live.rentRangeLow && estimate.live.rentRangeHigh ? ` (range ${money(estimate.live.rentRangeLow)}–${money(estimate.live.rentRangeHigh)})` : ''}
              {estimate.live.comparableCount ? ` · ${estimate.live.comparableCount} comparable listings` : ''}
            </div>
          )}

          {estimate.summary && <p className="rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] p-3 text-sm text-gray-300">{estimate.summary}</p>}

          {estimate.tips && estimate.tips.length > 0 && (
            <ul className="space-y-1.5">
              {estimate.tips.map((tip, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-gray-400"><Sparkles className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-teal-300" /> {tip}</li>
              ))}
            </ul>
          )}

          <p className="text-[11px] text-gray-600">
            {estimate.generatedAt ? `Updated ${new Date(estimate.generatedAt).toLocaleDateString()} ${new Date(estimate.generatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}
            {fromCache ? ' · saved estimate (auto-refreshes weekly)' : ' · fresh estimate'}
            {estimate.source === 'rentcast+ai' ? ' · powered by live RentCast data.' : '. Figures are AI approximations — verify against local listings.'}
          </p>
        </div>
      )}
    </div>
  );
}
