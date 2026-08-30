/**
 * Who has a portal.
 *
 * WHAT QUESTION THIS ANSWERS
 *
 * "How do I know when someone creates a portal?" The records have been written
 * on every grant since portals existed and nothing ever read them back, so the
 * answer was that you did not. This is the reading.
 *
 * The default view is therefore newest first, because the question behind the
 * question is what has changed since you last looked — not how many there are
 * in total.
 *
 * WHY STATUS IS THE GROUPING THAT MATTERS
 *
 * A portal sitting at onboarding or waiting on requirements is somebody waiting
 * on us. Grouped that way the register stops being a count and becomes a list
 * of things to do, which is the only reason to open it twice.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Users, Search, Loader2, RefreshCw, AlertCircle, ExternalLink, Layers,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../lib/supabase';
import { projectId, publicAnonKey } from '../utils/supabase/info';

const SERVER = `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6`;

const PORTAL_LABELS: Record<string, string> = {
  customer: 'Customer',
  vendor: 'Vendor',
  subcontractor: 'Subcontractor',
  advertiser: 'Advertiser',
  property_manager: 'Property manager',
  territory_owner: 'Territory owner',
  employee: 'Employee',
  investor: 'Investor',
  landlord: 'Landlord',
  condo_manager: 'Condo manager',
  condo_association: 'Condo association',
  tenant: 'Tenant',
};

const STATUS_LABELS: Record<string, string> = {
  active: 'Active',
  onboarding: 'Onboarding',
  active_pending_requirements: 'Waiting on documents',
  pending_documents: 'Waiting on documents',
  suspended: 'Suspended',
};

const label = (map: Record<string, string>, key: string) =>
  map[key] || key.replace(/_/g, ' ').replace(/^\w/, c => c.toUpperCase());

const card = 'rounded-2xl border border-[#2A2A2A] bg-[#111] p-4';

type GroupBy = 'none' | 'portalType' | 'status';

export default function PortalRegister({ onOpenCustomer }: {
  /** Opens this person in the CRM, when the register is embedded somewhere that can. */
  onOpenCustomer?: (customerId: string, email: string) => void;
} = {}) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [groupBy, setGroupBy] = useState<GroupBy>('none');
  const [attentionOnly, setAttentionOnly] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${SERVER}/portal-access`, {
        headers: { Authorization: `Bearer ${session?.access_token || publicAnonKey}` },
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) throw new Error(json?.error || `Could not load the register (${res.status}).`);
      setData(json);
    } catch (err: any) {
      setError(err?.message || 'Could not load the register.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const rows = useMemo(() => {
    const all: any[] = data?.records || [];
    const q = query.trim().toLowerCase();
    return all.filter(r => {
      if (attentionOnly && !r.needsAttention) return false;
      if (!q) return true;
      // One box over the things somebody would actually type: a name, an
      // address, a company. Not a form with a field per column.
      return [r.name, r.email, r.company, label(PORTAL_LABELS, r.portalType)]
        .some(v => String(v || '').toLowerCase().includes(q));
    });
  }, [data, query, attentionOnly]);

  const groups = useMemo(() => {
    if (groupBy === 'none') return [{ key: '', label: '', rows }];
    const by = new Map<string, any[]>();
    for (const r of rows) {
      const k = String(r[groupBy] || 'unknown');
      by.set(k, [...(by.get(k) || []), r]);
    }
    return [...by.entries()]
      .map(([key, list]) => ({
        key,
        label: label(groupBy === 'portalType' ? PORTAL_LABELS : STATUS_LABELS, key),
        rows: list,
      }))
      .sort((a, b) => b.rows.length - a.rows.length);
  }, [rows, groupBy]);

  if (loading) {
    return (
      <div className={`${card} flex items-center gap-2 text-sm text-gray-400`}>
        <Loader2 className="h-4 w-4 animate-spin" /> Loading the portal register…
      </div>
    );
  }

  if (error) {
    return (
      <div className={card}>
        <p className="flex items-start gap-2 text-sm text-red-400">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
        </p>
        <button onClick={load} className="mt-3 rounded-lg border border-white/10 px-3 py-1.5 text-xs font-semibold text-gray-300 hover:bg-white/5">
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className={card}>
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <h2 className="flex items-center gap-2 text-sm font-bold text-white">
            <Users className="h-4 w-4 text-[#ea580c]" /> Portal register
          </h2>
          <span className="text-xs text-gray-500">
            {data?.total || 0} {data?.total === 1 ? 'portal' : 'portals'}
          </span>
          {data?.needsAttention > 0 && (
            <button onClick={() => setAttentionOnly(a => !a)}
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold transition ${
                attentionOnly ? 'bg-amber-500 text-black' : 'border border-amber-500/40 text-amber-400 hover:bg-amber-500/10'
              }`}>
              <AlertCircle className="h-3.5 w-3.5" />
              {data.needsAttention} waiting on us
            </button>
          )}
          <div className="grow" />
          <button onClick={load} title="Refresh"
            className="rounded-lg border border-white/10 p-1.5 text-gray-400 hover:bg-white/5 hover:text-white">
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[14rem] flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-600" />
            <input value={query} onChange={e => setQuery(e.target.value)}
              placeholder="Search a name, an email, a company"
              className="w-full rounded-lg border border-[#2a2a2a] bg-[#0a0a0a] py-2 pl-8 pr-3 text-sm text-white placeholder-gray-600 focus:border-[#ea580c] focus:outline-none" />
          </div>

          <div className="flex items-center gap-1">
            <Layers className="h-3.5 w-3.5 text-gray-600" />
            {([['none', 'Flat'], ['portalType', 'By portal'], ['status', 'By status']] as const).map(([id, text]) => (
              <button key={id} onClick={() => setGroupBy(id)}
                className={`rounded-lg px-2.5 py-1.5 text-xs font-bold transition ${
                  groupBy === id ? 'bg-[#ea580c] text-white' : 'border border-white/10 text-gray-400 hover:bg-white/5'
                }`}>
                {text}
              </button>
            ))}
          </div>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className={card}>
          <p className="text-sm text-gray-400">
            {data?.total === 0
              ? 'No portals have been granted yet. One appears here the moment somebody is given access.'
              : 'Nothing matches that.'}
          </p>
        </div>
      ) : (
        groups.map(g => (
          <div key={g.key} className={card}>
            {g.label && (
              <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-500">
                {g.label} · {g.rows.length}
              </h3>
            )}
            <div className="space-y-1">
              {g.rows.map((r: any) => (
                <div key={r.id}
                  className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-white/5 py-2 last:border-0">
                  <div className="min-w-[12rem] flex-1">
                    <p className="truncate text-sm font-semibold text-white">
                      {r.name || r.email}
                    </p>
                    <p className="truncate text-[11px] text-gray-600">
                      {r.email}{r.company ? ` · ${r.company}` : ''}
                    </p>
                  </div>

                  <span className="rounded-md border border-white/10 px-2 py-0.5 text-[11px] text-gray-300">
                    {label(PORTAL_LABELS, r.portalType)}
                  </span>

                  <span className={`rounded-md px-2 py-0.5 text-[11px] font-semibold ${
                    r.needsAttention
                      ? 'bg-amber-500/10 text-amber-400'
                      : r.status === 'active' ? 'bg-emerald-500/10 text-emerald-400' : 'text-gray-500'
                  }`}>
                    {label(STATUS_LABELS, r.status)}
                  </span>

                  <span className="w-24 text-right text-[11px] text-gray-600">
                    {r.createdAt ? String(r.createdAt).slice(0, 10) : ''}
                  </span>

                  {onOpenCustomer && r.customerId && (
                    <button onClick={() => onOpenCustomer(r.customerId, r.email)}
                      title="Open in the CRM"
                      className="text-gray-600 hover:text-[#ea580c]">
                      <ExternalLink className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
