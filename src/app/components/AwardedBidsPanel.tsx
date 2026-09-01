/**
 * The far end of the loop — a won bid coming back onto the scope.
 *
 * Our scope line became a package line, the package line was priced, that bid
 * won. So the money goes back onto the exact line it was quoted against, and
 * nothing has to be matched or guessed: the identity was carried the whole way
 * round. That is the entire reason the package was sent as rows rather than as
 * a paragraph.
 *
 * WHY IT IS STILL A BUTTON AND NOT AUTOMATIC
 *
 * Because these numbers go in front of a customer. Awarding in the bid room is
 * a decision about who does the work; putting his price on our quote is a
 * second decision, and doing it silently would mean a customer-facing figure
 * changing because somebody clicked Award on another screen. One click, with
 * the amounts shown first, costs a few seconds and keeps that visible.
 *
 * WHAT IT REFUSES TO LEAVE OUT
 *
 * The lines the winner never priced. His total is only a price for the job if
 * it covers the job, and a line he left blank is one somebody still has to pay
 * for — us, out of margin, unless it is noticed here.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Trophy, Loader2, AlertTriangle, Check, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../lib/supabase';
import { readAward, tradeLabel, type AwardReadback } from '../lib/bidPackageModel';
import type { Scope } from '../lib/scopeModel';

const card = 'rounded-2xl border border-[#2A2A2A] bg-[#111] p-4';

interface WonPackage {
  requestId: string;
  title: string;
  trade: string;
  providerName: string;
  readback: AwardReadback;
  lineCount: number;
}

export default function AwardedBidsPanel({ scope, designProjectId, onApply }: {
  scope: Scope;
  designProjectId?: string;
  /** Amounts keyed by our scope line id. Adds to what is there. */
  onApply: (amounts: Record<string, number>) => void;
}) {
  const [packages, setPackages] = useState<WonPackage[] | null>(null);
  const [busy, setBusy] = useState(false);

  const ourLineIds = useMemo(() => new Set(scope.lines.map(l => l.id)), [scope.lines]);
  const descriptionOf = useMemo(() => {
    const m = new Map<string, string>();
    for (const l of scope.lines) m.set(l.id, l.description);
    return m;
  }, [scope.lines]);

  const load = useCallback(async () => {
    if (!designProjectId) { setPackages([]); return; }
    setBusy(true);
    try {
      // Every query here is RLS-filtered. No org filter is applied on purpose —
      // adding one would imply the client is what decides whose bids these are.
      const { data: reqs, error: reqErr } = await supabase
        .from('bid_requests')
        .select('id, title, trade, status, awarded_bid_id')
        .eq('design_project_id', designProjectId);
      if (reqErr) { setPackages([]); return; }

      const awarded = (reqs || []).filter((r: any) => r.awarded_bid_id);
      if (!awarded.length) { setPackages([]); return; }

      const requestIds = awarded.map((r: any) => r.id);
      const bidIds = awarded.map((r: any) => r.awarded_bid_id);

      const [lineRes, priceRes, bidRes] = await Promise.all([
        supabase.from('bid_request_lines')
          .select('id, bid_request_id, source_line_id').in('bid_request_id', requestIds),
        supabase.from('bid_line_prices')
          .select('bid_request_line_id, amount, bid_id').in('bid_id', bidIds),
        supabase.from('bids').select('id, org_id').in('id', bidIds),
      ]);

      const allLines = (lineRes.data || []) as any[];
      const allPrices = (priceRes.data || []) as any[];
      const bidOrg = new Map((bidRes.data || []).map((b: any) => [b.id, b.org_id]));

      // A provider's name may legitimately not come back — RLS on
      // `organizations` only returns orgs we belong to. Fall back rather than
      // rendering a blank where a company name should be.
      const orgIds = Array.from(new Set([...bidOrg.values()].filter(Boolean)));
      const names = new Map<string, string>();
      if (orgIds.length) {
        const { data: orgs } = await supabase
          .from('organizations').select('id, name').in('id', orgIds as string[]);
        for (const o of (orgs || []) as any[]) names.set(o.id, o.name);
      }

      const built: WonPackage[] = [];
      for (const r of awarded) {
        const lines = allLines.filter(l => l.bid_request_id === r.id);
        const prices = allPrices.filter(p => p.bid_id === r.awarded_bid_id);
        if (!lines.length) continue;
        const readback = readAward(lines, prices, ourLineIds);
        if (!Object.keys(readback.amounts).length && !readback.unpricedSourceLineIds.length) continue;
        built.push({
          requestId: r.id,
          title: r.title,
          trade: r.trade || '',
          providerName: names.get(bidOrg.get(r.awarded_bid_id) as string) || 'the winning provider',
          readback,
          lineCount: lines.length,
        });
      }
      setPackages(built);
    } catch {
      setPackages([]);
    } finally {
      setBusy(false);
    }
  }, [designProjectId, ourLineIds]);

  useEffect(() => { load(); }, [load]);

  const apply = (pkg: WonPackage) => {
    const n = Object.keys(pkg.readback.amounts).length;
    if (!n) { toast.error('That award priced none of our lines.'); return; }
    onApply(pkg.readback.amounts);
    toast.success(
      `${n} line${n === 1 ? '' : 's'} priced from ${pkg.providerName}'s winning bid.`,
    );
  };

  if (!designProjectId || packages === null || packages.length === 0) return null;

  return (
    <div className={card}>
      <div className="flex items-start justify-between gap-2 mb-1">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Trophy className="w-4 h-4 text-[#a78bfa]" /> Awarded bids
        </h3>
        <button onClick={load} disabled={busy}
          className="text-[11px] text-gray-500 hover:text-white flex items-center gap-1 disabled:opacity-40">
          {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
          Refresh
        </button>
      </div>
      <p className="text-xs text-gray-500 mb-3">
        Work you awarded in the bid room, priced against these exact lines. Nothing
        has to be matched — his prices came from our scope and go straight back onto it.
      </p>

      <div className="space-y-2">
        {packages.map(pkg => {
          const priced = Object.keys(pkg.readback.amounts).length;
          const missing = pkg.readback.unpricedSourceLineIds;
          return (
            <div key={pkg.requestId} className="rounded-xl border border-[#2A2A2A] bg-[#0A0A0A] p-3">
              <div className="flex items-baseline justify-between gap-2 mb-1">
                <span className="text-sm font-bold text-white truncate">
                  {pkg.trade ? tradeLabel(pkg.trade) : pkg.title}
                </span>
                <span className="text-sm font-black text-[#a78bfa] shrink-0">
                  ${pkg.readback.total.toFixed(2)}
                </span>
              </div>
              <p className="text-[11px] text-gray-500 mb-2">
                {pkg.providerName} · {priced} of {pkg.lineCount} line
                {pkg.lineCount === 1 ? '' : 's'} priced
              </p>

              {missing.length > 0 && (
                <div className="rounded-lg border border-amber-500/25 bg-amber-500/[0.05] p-2 mb-2">
                  <p className="text-[11px] text-amber-200/90 flex items-start gap-1.5">
                    <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" />
                    <span>
                      He priced nothing against {missing.length} line
                      {missing.length === 1 ? '' : 's'} —{' '}
                      {missing.slice(0, 3).map(id => `“${descriptionOf.get(id) || id}”`).join(', ')}
                      {missing.length > 3 && ', and others'}. That work is still ours to
                      pay for unless it is settled with him.
                    </span>
                  </p>
                </div>
              )}

              <button onClick={() => apply(pkg)} disabled={priced === 0}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white flex items-center gap-1.5 disabled:opacity-40"
                style={{ background: 'rgba(167,139,250,0.9)' }}>
                <Check className="w-3.5 h-3.5" />
                Put {priced} price{priced === 1 ? '' : 's'} on the scope
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
