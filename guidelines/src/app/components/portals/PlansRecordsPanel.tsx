/**
 * PlansRecordsPanel — command-center searchable records for maintenance/subscription plans.
 *
 * Lists every persisted plan with live-polling, full-text search (name, owner,
 * portal, service, gift-card code, promo code, offer), and header stats. Shows how
 * each plan is tied to hours, gift cards, promotions, and offers.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { Search, RefreshCw, Clock, Gift, Tag, Sparkles, DollarSign, Layers } from 'lucide-react';
import { listPlans, getPlanStats, type PlanRecord } from '../../utils/plansApi';

export default function PlansRecordsPanel() {
  const [plans, setPlans] = useState<PlanRecord[]>([]);
  const [stats, setStats] = useState<{ total: number; active: number; mrr: number; giftIssued: number; hoursIncluded: number; hoursUsed: number } | null>(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = async () => {
    try {
      const [p, s] = await Promise.all([listPlans(), getPlanStats().catch(() => null)]);
      setPlans(p);
      if (s) setStats(s);
    } catch (err) {
      console.error('[PlansRecordsPanel] Failed to load plans:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const interval = setInterval(load, 15000);
    return () => clearInterval(interval);
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return plans;
    return plans.filter(p =>
      [
        p.id, p.planName, p.owner, p.portalType, p.entity, p.status,
        ...(p.serviceNames || []),
        ...(p.giftCards || []).map(g => g.code),
        ...(p.promotions || []).map(x => x.code),
        ...(p.offers || []).map(x => x.code + ' ' + x.title),
      ].filter(Boolean).join(' ').toLowerCase().includes(q),
    );
  }, [plans, search]);

  const statCards = [
    { label: 'Total Plans', value: stats?.total ?? plans.length, icon: Layers },
    { label: 'Active', value: stats?.active ?? plans.filter(p => p.status === 'active').length, icon: Sparkles },
    { label: 'MRR', value: `$${(stats?.mrr ?? 0).toLocaleString()}`, icon: DollarSign },
    { label: 'Gift Cards Issued', value: `$${(stats?.giftIssued ?? 0).toLocaleString()}`, icon: Gift },
    { label: 'Hours Used', value: `${stats?.hoursUsed ?? 0}/${stats?.hoursIncluded ?? 0}`, icon: Clock },
  ];

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {statCards.map(s => (
          <div key={s.label} className="rounded-xl border border-gray-200 bg-white p-4">
            <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">
              <s.icon className="w-4 h-4" /> {s.label}
            </div>
            <div className="text-xl font-bold text-gray-900">{s.value}</div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search plans, owners, service, gift code, promo…"
            className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg w-full"
          />
        </div>
        <button
          onClick={load}
          className="inline-flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
        >
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
        <span className="text-sm text-gray-500">{filtered.length} record{filtered.length === 1 ? '' : 's'}</span>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-left">
              <tr>
                <th className="px-4 py-3 font-medium">Plan</th>
                <th className="px-4 py-3 font-medium">Owner</th>
                <th className="px-4 py-3 font-medium">Portal</th>
                <th className="px-4 py-3 font-medium">Monthly</th>
                <th className="px-4 py-3 font-medium">Hours</th>
                <th className="px-4 py-3 font-medium">Links</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading && plans.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">Loading plans…</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">No plans found.</td></tr>
              ) : filtered.map(p => (
                <React.Fragment key={p.id}>
                  <tr
                    onClick={() => setExpanded(expanded === p.id ? null : p.id)}
                    className="cursor-pointer hover:bg-gray-50"
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{p.planName}</div>
                      <div className="text-xs text-gray-400">{p.id}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-700">{p.owner || '—'}</td>
                    <td className="px-4 py-3 text-gray-700 capitalize">{p.portalType?.replace('_', ' ')}</td>
                    <td className="px-4 py-3 text-gray-900">${p.monthlyTotal.toLocaleString()}</td>
                    <td className="px-4 py-3 text-gray-700">{p.hours?.used || 0}/{p.hours?.included || 0}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 text-gray-500">
                        <span className="inline-flex items-center gap-0.5"><Gift className="w-3.5 h-3.5" />{(p.giftCards || []).length}</span>
                        <span className="inline-flex items-center gap-0.5"><Tag className="w-3.5 h-3.5" />{(p.promotions || []).length}</span>
                        <span className="inline-flex items-center gap-0.5"><Sparkles className="w-3.5 h-3.5" />{(p.offers || []).length}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        p.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                      }`}>{p.status}</span>
                    </td>
                  </tr>
                  {expanded === p.id && (
                    <tr className="bg-gray-50">
                      <td colSpan={7} className="px-4 py-4">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <div className="text-gray-500 font-medium mb-1">Services ({p.serviceNames?.length || 0})</div>
                            <ul className="text-gray-700 space-y-0.5">
                              {(p.serviceNames || []).map(n => <li key={n}>• {n}</li>)}
                            </ul>
                          </div>
                          <div>
                            <div className="text-gray-500 font-medium mb-1">Gift Cards</div>
                            {(p.giftCards || []).map(g => (
                              <div key={g.code} className="text-gray-700">${g.balance} · <span className="font-mono">{g.code}</span></div>
                            )) || <span className="text-gray-400">None</span>}
                          </div>
                          <div>
                            <div className="text-gray-500 font-medium mb-1">Promotions</div>
                            {(p.promotions || []).map(pr => (
                              <div key={pr.code} className="text-gray-700"><span className="font-mono">{pr.code}</span> — {pr.discount}</div>
                            ))}
                          </div>
                          <div>
                            <div className="text-gray-500 font-medium mb-1">Offers</div>
                            {(p.offers || []).map(o => (
                              <div key={o.code} className="text-gray-700">{o.title}</div>
                            ))}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
