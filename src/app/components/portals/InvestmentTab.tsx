/**
 * InvestmentTab — shared "Investment" tab, reused across every portal.
 *
 * Gives any portal user a consistent investor-facing surface:
 *   - Their portfolio summary (invested / received / current value / ROI)
 *   - A live list of open investment opportunities (from the investments API)
 *   - The ability to express interest / commit to an opportunity
 *   - Their existing commitments and recent payout distributions
 *
 * Backed by the existing investments endpoints on the Supabase edge function:
 *   GET  /investments/opportunities
 *   GET  /investments/analytics/portfolio/:email
 *   POST /investments/commitments
 *
 * Everything degrades gracefully to a friendly empty state so the tab never
 * crashes a portal even if no opportunities have been published yet.
 */
import { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import {
  TrendingUp, DollarSign, Briefcase, Target, PieChart, Loader2,
  ArrowUpRight, CheckCircle, Users, Percent, Clock, X, Sparkles,
  Search, CreditCard, Crown, SlidersHorizontal,
} from 'lucide-react';
import { projectId, publicAnonKey } from '../../utils/supabase/info';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

const API = `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6/investments`;

// Mirrors the server-authoritative AI_TIER_PRICING (investments-kv.tsx). Display
// only — the server re-validates pricing on checkout.
const SUBSCRIPTION_TIERS: { id: string; name: string; price: string; blurb: string; featured?: boolean }[] = [
  { id: 'starter', name: 'Landlord', price: '$29/mo', blurb: 'Property intelligence for single owners & small portfolios.' },
  { id: 'professional', name: 'Pro Investor', price: '$79/mo', blurb: 'Deal analysis, feasibility studies & priority opportunity access.', featured: true },
  { id: 'enterprise', name: 'Association', price: '$199/mo', blurb: 'Full intelligence suite for condo associations & funds.' },
];

interface Opportunity {
  id: string;
  title?: string;
  category?: string;
  description?: string;
  minInvestment?: number;
  maxInvestment?: number;
  projectedROI?: number;
  term?: string;
  status?: string;
  investors?: number;
  funded?: number;
  targetRaise?: number;
  highlight?: string;
  benefits?: string[];
  location?: string;
  /**
   * A seeded demonstration listing, not an offer. The server only sends these
   * to staff, so anybody seeing one is in a position to do something about it.
   */
  isDemo?: boolean;
}

interface PortfolioSummary {
  totalInvested: number;
  totalReceived: number;
  currentValue: number;
  totalROI: string;
  activeInvestments: number;
  completedInvestments: number;
  totalPayouts: number;
}

interface Commitment {
  id: string;
  opportunity_id: string;
  commitment_amount: string | number;
  status: string;
  commitment_date?: string;
  total_received?: number;
  opportunity?: Opportunity;
}

interface Payout {
  id: string;
  amount: number;
  status: string;
  payout_date?: string;
  description?: string;
}

interface Props {
  /** Portal identifier — used to tag commitments with their source portal. */
  portalType: string;
  /** Optional display name of the current account holder. */
  ownerName?: string;
}

const money = (n: number | undefined) =>
  '$' + Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 0 });

const CATEGORY_COLORS: Record<string, string> = {
  'Company Equity': 'bg-purple-500/15 text-purple-300 border-purple-500/30',
  'Fractional Ownership': 'bg-blue-500/15 text-blue-300 border-blue-500/30',
  'Value-Add': 'bg-teal-500/15 text-teal-300 border-teal-500/30',
  REIT: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  Development: 'bg-orange-500/15 text-orange-300 border-orange-500/30',
  'Tax-Deferred': 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  Turnkey: 'bg-pink-500/15 text-pink-300 border-pink-500/30',
};

export default function InvestmentTab({ portalType, ownerName }: Props) {
  const { user } = useAuth();
  const email = user?.email || '';

  const [loading, setLoading] = useState(true);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [summary, setSummary] = useState<PortfolioSummary | null>(null);
  const [commitments, setCommitments] = useState<Commitment[]>([]);
  const [payouts, setPayouts] = useState<Payout[]>([]);

  const [selected, setSelected] = useState<Opportunity | null>(null);
  const [amount, setAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Search + category filter over opportunities.
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<string>('all');

  // Subscription (Property Intelligence) state.
  const [subActive, setSubActive] = useState(false);
  const [subPlan, setSubPlan] = useState<string>('');
  const [subBusyTier, setSubBusyTier] = useState<string>('');
  const [showPlans, setShowPlans] = useState(false);

  /**
   * The signed-in person's token, not the publishable key.
   *
   * WHY THIS IS THE WHOLE BUG
   *
   * This tab is mounted in eleven portals and every one of them showed an empty
   * investments screen, because it sent `publicAnonKey` — which identifies the
   * project and nobody in particular. The server's auth wall defaults unlisted
   * routes to "signed in", and `/investments/opportunities` is on neither the
   * public nor the admin list, so every call came back 401. The tab caught the
   * status, logged it to the console and rendered its friendly empty state, so
   * it looked like nobody had published any opportunities rather than like a
   * request that was refused.
   *
   * The commitment POST used the same headers, so pledging money failed the
   * same way — and that route reads the investor's identity from the token, so
   * it could never have worked with an anonymous one.
   */
  const authedHeaders = useCallback(async (): Promise<Record<string, string>> => {
    const { data } = await supabase.auth.getSession();
    const token = data?.session?.access_token;
    return {
      // Falls back rather than throwing: a signed-out visitor should get a
      // clean 401 from the server, not an exception inside a portal tab.
      Authorization: `Bearer ${token || publicAnonKey}`,
      'Content-Type': 'application/json',
    };
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const headers = await authedHeaders();
      const oppRes = await fetch(`${API}/opportunities`, { headers });
      if (oppRes.ok) {
        const data = await oppRes.json().catch(() => ({}));
        setOpportunities(Array.isArray(data.opportunities) ? data.opportunities : []);
      } else {
        console.log(`InvestmentTab: opportunities request returned ${oppRes.status}`);
        setOpportunities([]);
      }

      if (email) {
        const portRes = await fetch(`${API}/analytics/portfolio/${encodeURIComponent(email)}`, { headers });
        if (portRes.ok) {
          const data = await portRes.json().catch(() => ({}));
          setSummary(data.summary || null);
          setCommitments(Array.isArray(data.commitments) ? data.commitments : []);
          setPayouts(Array.isArray(data.recentPayouts) ? data.recentPayouts : []);
        } else {
          console.log(`InvestmentTab: portfolio request returned ${portRes.status}`);
        }

        const subRes = await fetch(`${API}/ai-subscription/${encodeURIComponent(email)}`, { headers });
        if (subRes.ok) {
          const data = await subRes.json().catch(() => ({}));
          setSubActive(!!data.active);
          setSubPlan(data.subscription?.plan || (data.privileged ? 'Team access' : ''));
        } else {
          console.log(`InvestmentTab: subscription request returned ${subRes.status}`);
        }
      }
    } catch (error: any) {
      console.error(`InvestmentTab: failed to load investment data for ${portalType}:`, error);
    } finally {
      setLoading(false);
    }
  }, [email, portalType]);

  useEffect(() => { load(); }, [load]);

  async function submitCommitment() {
    if (!selected) return;
    if (!email) {
      toast.error('Please sign in to commit to an investment.');
      return;
    }
    const value = Number(amount);
    if (!value || value <= 0) {
      toast.error('Enter a valid investment amount.');
      return;
    }
    if (selected.minInvestment && value < selected.minInvestment) {
      toast.error(`Minimum investment for this opportunity is ${money(selected.minInvestment)}.`);
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`${API}/commitments`, {
        method: 'POST',
        headers: await authedHeaders(),
        body: JSON.stringify({
          investor_email: email,
          investor_name: ownerName || '',
          opportunity_id: selected.id,
          commitment_amount: value,
          status: 'pending',
          source_portal: portalType,
          commitment_date: new Date().toISOString(),
        }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload.error || `Request failed (${res.status})`);
      toast.success('Investment interest submitted! Our team will follow up shortly.');
      setSelected(null);
      setAmount('');
      load();
    } catch (error: any) {
      console.error('InvestmentTab: failed to submit commitment:', error);
      toast.error(`Could not submit investment: ${error.message}`);
    } finally {
      setSubmitting(false);
    }
  }

  // Kick off a Stripe Checkout subscription for the chosen tier.
  async function startSubscription(tier: string) {
    if (!email) {
      toast.error('Please sign in to join the subscription.');
      return;
    }
    setSubBusyTier(tier);
    try {
      const res = await fetch(`${API}/ai-subscription/checkout`, {
        method: 'POST',
        headers: await authedHeaders(),
        body: JSON.stringify({ email, tier, audience: portalType, origin: window.location.origin }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok || !payload.url) throw new Error(payload.error || `Request failed (${res.status})`);
      window.location.assign(payload.url);
    } catch (error: any) {
      console.error('InvestmentTab: failed to start subscription checkout:', error);
      toast.error(`Could not start subscription: ${error.message}`);
      setSubBusyTier('');
    }
  }

  // Category list for the filter, derived from the live opportunities.
  const categories = Array.from(new Set(opportunities.map(o => o.category).filter(Boolean))) as string[];

  // Apply the search query + category filter.
  const q = query.trim().toLowerCase();
  const filteredOpportunities = opportunities.filter(o => {
    if (category !== 'all' && o.category !== category) return false;
    if (!q) return true;
    return [o.title, o.description, o.category, o.location, o.highlight]
      .some(v => typeof v === 'string' && v.toLowerCase().includes(q));
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-400">
        <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading investment opportunities…
      </div>
    );
  }

  const stats = [
    { label: 'Total Invested', value: money(summary?.totalInvested), icon: DollarSign, color: 'text-emerald-400' },
    { label: 'Current Value', value: money(summary?.currentValue), icon: TrendingUp, color: 'text-teal-400' },
    { label: 'Total Received', value: money(summary?.totalReceived), icon: ArrowUpRight, color: 'text-green-400' },
    { label: 'Portfolio ROI', value: summary?.totalROI ? `${summary.totalROI}%` : '—', icon: Percent, color: 'text-purple-400' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-emerald-400" /> Investments
          </h2>
          <p className="text-sm text-gray-400 mt-1">
            Grow your capital alongside {ownerName ? ownerName + "'s" : 'your'} portfolio — review live opportunities and track your positions.
          </p>
        </div>
        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
          <Sparkles className="w-3.5 h-3.5" /> Investor Access
        </span>
      </div>

      {/* Subscription (Property Intelligence) */}
      <div className="rounded-xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 to-orange-500/5 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/20 text-amber-300"><Crown className="h-5 w-5" /></div>
            <div>
              <p className="text-sm font-bold text-white">Investor Intelligence Subscription</p>
              {subActive ? (
                <p className="text-xs text-emerald-300 flex items-center gap-1"><CheckCircle className="h-3.5 w-3.5" /> Active{subPlan ? ` · ${subPlan}` : ''}</p>
              ) : (
                <p className="text-xs text-gray-400">Deal analysis, feasibility studies & priority access to new opportunities.</p>
              )}
            </div>
          </div>
          {subActive ? (
            <span className="rounded-full border border-emerald-500/30 bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-300">Subscribed</span>
          ) : (
            <button onClick={() => setShowPlans(v => !v)} className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500 px-4 py-2 text-sm font-bold text-black transition hover:bg-amber-400">
              <CreditCard className="h-4 w-4" /> Join subscription
            </button>
          )}
        </div>
        {!subActive && showPlans && (
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {SUBSCRIPTION_TIERS.map(t => (
              <div key={t.id} className={`rounded-xl border p-4 ${t.featured ? 'border-amber-500/50 bg-amber-500/10' : 'border-[#2A2A2A] bg-[#0A0A0A]'}`}>
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold text-white">{t.name}</p>
                  {t.featured && <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-300">POPULAR</span>}
                </div>
                <p className="mt-1 text-lg font-bold text-amber-300">{t.price}</p>
                <p className="mt-1 text-xs text-gray-400">{t.blurb}</p>
                <button
                  onClick={() => startSubscription(t.id)}
                  disabled={!!subBusyTier}
                  className="mt-3 w-full rounded-lg bg-amber-500 py-2 text-sm font-bold text-black transition hover:bg-amber-400 disabled:opacity-60 flex items-center justify-center gap-1.5"
                >
                  {subBusyTier === t.id ? <><Loader2 className="h-4 w-4 animate-spin" /> Redirecting…</> : <>Subscribe</>}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Portfolio summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">{s.label}</span>
                <Icon className={`w-4 h-4 ${s.color}`} />
              </div>
              <p className="text-lg font-bold text-white mt-2">{s.value}</p>
            </div>
          );
        })}
      </div>

      {(summary && (summary.activeInvestments || summary.completedInvestments)) ? (
        <div className="flex gap-3 flex-wrap text-xs text-gray-400">
          <span className="flex items-center gap-1"><PieChart className="w-3.5 h-3.5 text-teal-400" /> {summary.activeInvestments} active</span>
          <span className="flex items-center gap-1"><CheckCircle className="w-3.5 h-3.5 text-green-400" /> {summary.completedInvestments} completed</span>
          <span className="flex items-center gap-1"><DollarSign className="w-3.5 h-3.5 text-emerald-400" /> {summary.totalPayouts} payouts</span>
        </div>
      ) : null}

      {/* Opportunities */}
      <div>
        <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <Target className="w-4 h-4 text-emerald-400" /> All Opportunities
            <span className="text-xs font-normal text-gray-500">({filteredOpportunities.length})</span>
          </h3>
        </div>

        {/* Search + category filter */}
        {opportunities.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap mb-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search opportunities by name, location, category…"
                className="w-full pl-9 pr-3 py-2 rounded-lg bg-[#0A0A0A] border border-[#2A2A2A] text-white text-sm focus:border-emerald-500 outline-none"
              />
            </div>
            {categories.length > 0 && (
              <div className="relative">
                <SlidersHorizontal className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="appearance-none pl-9 pr-8 py-2 rounded-lg bg-[#0A0A0A] border border-[#2A2A2A] text-white text-sm focus:border-emerald-500 outline-none cursor-pointer"
                >
                  <option value="all">All categories</option>
                  {categories.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            )}
          </div>
        )}

        {opportunities.length === 0 ? (
          <div className="bg-[#0A0A0A] border border-dashed border-[#2A2A2A] rounded-xl p-8 text-center">
            <Briefcase className="w-8 h-8 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400 text-sm">No investment opportunities are open right now.</p>
            <p className="text-gray-600 text-xs mt-1">Check back soon — new opportunities are added regularly.</p>
          </div>
        ) : filteredOpportunities.length === 0 ? (
          <div className="bg-[#0A0A0A] border border-dashed border-[#2A2A2A] rounded-xl p-8 text-center">
            <Search className="w-8 h-8 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400 text-sm">No opportunities match your search.</p>
            <button onClick={() => { setQuery(''); setCategory('all'); }} className="text-emerald-400 text-xs mt-2 hover:underline">Clear filters</button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {filteredOpportunities.map((o) => {
              const catColor = CATEGORY_COLORS[o.category || ''] || 'bg-gray-500/15 text-gray-300 border-gray-500/30';
              return (
                <div key={o.id} className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl p-5 hover:border-emerald-500/40 transition">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h4 className="font-semibold text-white">
                        {o.title || 'Investment Opportunity'}
                        {/* Only staff are sent these at all. Labelled so the sample
                            data is obvious to whoever has to clear it out. */}
                        {o.isDemo && (
                          <span className="ml-2 rounded border border-yellow-500/30 bg-yellow-500/10 px-1.5 py-0.5 align-middle text-[10px] font-bold text-yellow-400">
                            SAMPLE — not a real offer
                          </span>
                        )}
                      </h4>
                      {o.location && <p className="text-xs text-gray-500 mt-0.5">{o.location}</p>}
                    </div>
                    {o.category && (
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${catColor}`}>{o.category}</span>
                    )}
                  </div>
                  {o.description && <p className="text-sm text-gray-400 mt-2 line-clamp-2">{o.description}</p>}

                  <div className="grid grid-cols-3 gap-2 mt-4 text-center">
                    <div>
                      <p className="text-[10px] text-gray-500 uppercase">Proj. ROI</p>
                      <p className="text-sm font-bold text-emerald-400">{o.projectedROI ? `${o.projectedROI}%` : '—'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-500 uppercase">Min</p>
                      <p className="text-sm font-bold text-white">{o.minInvestment ? money(o.minInvestment) : '—'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-500 uppercase">Term</p>
                      <p className="text-sm font-bold text-white">{o.term || '—'}</p>
                    </div>
                  </div>

                  {typeof o.funded === 'number' && (
                    <div className="mt-4">
                      <div className="flex justify-between text-[10px] text-gray-500 mb-1">
                        <span>{o.funded}% funded</span>
                        {typeof o.investors === 'number' && (
                          <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {o.investors}</span>
                        )}
                      </div>
                      <div className="h-1.5 bg-[#1A1A1A] rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-400" style={{ width: `${Math.min(100, o.funded)}%` }} />
                      </div>
                    </div>
                  )}

                  <button
                    onClick={() => { setSelected(o); setAmount(o.minInvestment ? String(o.minInvestment) : ''); }}
                    className="mt-4 w-full py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold transition flex items-center justify-center gap-1"
                  >
                    Invest Now <ArrowUpRight className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* My commitments */}
      {commitments.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-teal-400" /> My Investments
          </h3>
          <div className="space-y-2">
            {commitments.map((c) => (
              <div key={c.id} className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg p-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-white">{c.opportunity?.title || 'Investment'}</p>
                  <p className="text-xs text-gray-500">{money(Number(c.commitment_amount))} committed</p>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                  c.status === 'active' ? 'bg-green-500/15 text-green-300 border-green-500/30'
                  : c.status === 'completed' ? 'bg-blue-500/15 text-blue-300 border-blue-500/30'
                  : c.status === 'cancelled' ? 'bg-red-500/15 text-red-300 border-red-500/30'
                  : 'bg-yellow-500/15 text-yellow-300 border-yellow-500/30'
                }`}>{c.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent payouts */}
      {payouts.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-emerald-400" /> Recent Distributions
          </h3>
          <div className="space-y-2">
            {payouts.map((p) => (
              <div key={p.id} className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg p-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-gray-500" />
                  <span className="text-xs text-gray-400">{p.description || 'Distribution'}{p.payout_date ? ` · ${new Date(p.payout_date).toLocaleDateString()}` : ''}</span>
                </div>
                <span className="text-sm font-semibold text-emerald-400">{money(p.amount)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Invest modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => !submitting && setSelected(null)}>
          <div className="bg-[#111] border border-[#2A2A2A] rounded-2xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold text-white">{selected.title}</h3>
                {selected.category && <p className="text-xs text-gray-500 mt-0.5">{selected.category}</p>}
              </div>
              <button onClick={() => !submitting && setSelected(null)} className="text-gray-500 hover:text-white"><X className="w-5 h-5" /></button>
            </div>

            {selected.description && <p className="text-sm text-gray-400 mt-3">{selected.description}</p>}

            <div className="grid grid-cols-3 gap-2 mt-4 text-center">
              <div className="bg-[#0A0A0A] rounded-lg p-2 border border-[#2A2A2A]">
                <p className="text-[10px] text-gray-500 uppercase">Proj. ROI</p>
                <p className="text-sm font-bold text-emerald-400">{selected.projectedROI ? `${selected.projectedROI}%` : '—'}</p>
              </div>
              <div className="bg-[#0A0A0A] rounded-lg p-2 border border-[#2A2A2A]">
                <p className="text-[10px] text-gray-500 uppercase">Min</p>
                <p className="text-sm font-bold text-white">{selected.minInvestment ? money(selected.minInvestment) : '—'}</p>
              </div>
              <div className="bg-[#0A0A0A] rounded-lg p-2 border border-[#2A2A2A]">
                <p className="text-[10px] text-gray-500 uppercase">Term</p>
                <p className="text-sm font-bold text-white">{selected.term || '—'}</p>
              </div>
            </div>

            <label className="block text-xs text-gray-400 mt-5 mb-1">Investment amount (USD)</label>
            <div className="relative">
              <DollarSign className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                min={selected.minInvestment || 0}
                placeholder={selected.minInvestment ? String(selected.minInvestment) : '10000'}
                className="w-full pl-9 pr-3 py-2 rounded-lg bg-[#0A0A0A] border border-[#2A2A2A] text-white text-sm focus:border-emerald-500 outline-none"
              />
            </div>

            <button
              onClick={submitCommitment}
              disabled={submitting}
              className="mt-5 w-full py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white text-sm font-semibold transition flex items-center justify-center gap-2"
            >
              {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting…</> : <>Submit Investment Interest <ArrowUpRight className="w-4 h-4" /></>}
            </button>
            <p className="text-[11px] text-gray-600 text-center mt-3">
              Submitting expresses non-binding interest. Our investment team will contact you to complete documentation.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
