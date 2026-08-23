import { useEffect, useMemo, useState } from 'react';
import {
  Sparkles, MapPin, Loader2, Building2, Landmark, TrendingUp, Layers, Hammer,
  ArrowUpNarrowWide, Compass, Clock, DollarSign, AlertTriangle, CheckCircle2,
  Crown, Lock, Zap, History, FileText, ChevronRight, ShieldCheck,
} from 'lucide-react';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { authedHeadersOrAnon } from "../utils/authHeaders";
import { supabase } from '../lib/supabase';

const SERVER = `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6`;

const CATEGORY_ICON: Record<string, typeof Hammer> = {
  rezone: Landmark,
  subdivide: Layers,
  'build-up': ArrowUpNarrowWide,
  rehab: Hammer,
  other: Compass,
};

const RISK_STYLE: Record<string, string> = {
  low: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  medium: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
  high: 'bg-red-500/15 text-red-400 border-red-500/30',
};

const PLANS = [
  {
    tier: 'starter', name: 'Landlord', audience: 'landlord', price: '$29', period: '/mo',
    icon: Building2,
    features: ['Unlimited property analyses', 'Zoning & market scans', 'Rehab & value-add plans', 'Save & revisit reports'],
  },
  {
    tier: 'professional', name: 'Pro Investor', audience: 'landlord', price: '$79', period: '/mo',
    icon: Zap, highlight: true,
    features: ['Everything in Landlord', 'Subdivide & build-up modeling', 'Rezone feasibility & processes', 'Detailed timelines & permits', 'Priority AI generation'],
  },
  {
    tier: 'enterprise', name: 'Condo Association', audience: 'condo-association', price: '$199', period: '/mo',
    icon: Landmark,
    features: ['Everything in Pro', 'Multi-property portfolio scans', 'Common-area income ideas', 'Board-ready plan exports', 'Shared association workspace'],
  },
];

interface SubState {
  active: boolean;
  privileged: boolean;
  freeRemaining: number;
  freeLimit: number;
  loaded: boolean;
}

export default function PropertyAIStudio() {
  const [email, setEmail] = useState('');
  const [token, setToken] = useState<string | null>(null);
  const [address, setAddress] = useState('');
  const [propertyType, setPropertyType] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<any | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [openStrategy, setOpenStrategy] = useState<number | null>(0);
  const [sub, setSub] = useState<SubState>({ active: false, privileged: false, freeRemaining: 2, freeLimit: 2, loaded: false });
  const [subscribing, setSubscribing] = useState<string | null>(null);
  const [showPlans, setShowPlans] = useState(false);

  const authHeaders = useMemo(
    () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${token || publicAnonKey}` }),
    [token],
  );

  // Resolve the signed-in user (email + token) so we can gate + attribute reports.
  useEffect(() => {
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) setToken(session.access_token);
        let e = session?.user?.email || '';
        if (!e) {
          const stored = localStorage.getItem('currentUserProfile');
          if (stored) { try { e = JSON.parse(stored).email || ''; } catch { /* ignore */ } }
        }
        if (e) setEmail(e.toLowerCase());
      } catch (err) {
        console.error('PropertyAIStudio: failed to resolve session:', err);
      }
    })();
  }, []);

  const loadSubscription = async (e: string, t: string | null) => {
    try {
      const res = await fetch(`${SERVER}/investments/ai-subscription/${encodeURIComponent(e)}`, {
        headers: { Authorization: `Bearer ${t || publicAnonKey}` },
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setSub({
          active: !!data.active, privileged: !!data.privileged,
          freeRemaining: data.freeRemaining ?? 0, freeLimit: data.freeLimit ?? 2, loaded: true,
        });
      } else {
        setSub((s) => ({ ...s, loaded: true }));
      }
    } catch (err) {
      console.error('PropertyAIStudio: failed to load subscription:', err);
      setSub((s) => ({ ...s, loaded: true }));
    }
  };

  const loadHistory = async (e: string, t: string | null) => {
    try {
      const res = await fetch(`${SERVER}/investments/ai-reports/${encodeURIComponent(e)}`, {
        headers: { Authorization: `Bearer ${t || publicAnonKey}` },
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && Array.isArray(data.reports)) setHistory(data.reports);
    } catch (err) {
      console.error('PropertyAIStudio: failed to load report history:', err);
    }
  };

  useEffect(() => {
    if (!email) { setSub((s) => ({ ...s, loaded: true })); return; }
    loadSubscription(email, token);
    loadHistory(email, token);
  }, [email, token]);

  const canRun = sub.privileged || sub.active || sub.freeRemaining > 0;

  const generate = async () => {
    setError(null);
    if (!address.trim()) { setError('Enter a property address to analyze.'); return; }
    if (!canRun) { setShowPlans(true); return; }
    setLoading(true);
    setReport(null);
    try {
      const res = await fetch(`${SERVER}/investments/ai-property-analysis`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ address, email, propertyType, notes }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 402 || data.needsSubscription) {
        setShowPlans(true);
        setError('You have used all of your free feasibility studies. Subscribe to keep going.');
        return;
      }
      if (!res.ok || data.error) throw new Error(data.error || `Server returned ${res.status}`);
      setReport(data.report);
      setOpenStrategy(0);
      if (typeof data.freeRemaining === 'number') setSub((s) => ({ ...s, freeRemaining: data.freeRemaining }));
      loadHistory(email, token);
    } catch (err: any) {
      console.error('PropertyAIStudio: analysis failed:', err);
      setError(`Analysis failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const subscribe = async (plan: typeof PLANS[number]) => {
    if (!email) { setError('Please sign in with an email to subscribe.'); return; }
    setSubscribing(plan.tier);
    try {
      const res = await fetch(`${SERVER}/investments/ai-subscription/checkout`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ email, tier: plan.tier, plan: plan.name, audience: plan.audience, origin: window.location.origin }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.error || !data.url) throw new Error(data.error || `Server returned ${res.status}`);
      // Hand off to Stripe Checkout; we confirm + activate on the return trip.
      window.location.href = data.url;
    } catch (err: any) {
      console.error('PropertyAIStudio: subscribe failed:', err);
      setError(`Couldn't start checkout: ${err.message}`);
      setSubscribing(null);
    }
  };

  // Handle the return from Stripe Checkout: confirm the session, then activate.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('ai_sub') !== 'success') return;
    const sessionId = params.get('session_id');
    const clean = () => window.history.replaceState({}, '', window.location.pathname);
    if (!sessionId) { clean(); return; }
    (async () => {
      try {
        const res = await fetch(`${SERVER}/investments/ai-subscription/confirm`, {
          method: 'POST',
          headers: await authedHeadersOrAnon(publicAnonKey),
          body: JSON.stringify({ session_id: sessionId }),
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.active) setSub((s) => ({ ...s, active: true, loaded: true }));
      } catch (err) {
        console.error('PropertyAIStudio: failed to confirm subscription:', err);
      } finally {
        clean();
      }
    })();
  }, []);

  const analysis = report?.analysis;

  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      {/* Hero */}
      <div className="bg-gradient-to-b from-orange-600/15 to-transparent border-b border-[#2A2A2A]">
        <div className="max-w-6xl mx-auto px-6 py-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/15 border border-orange-500/30 text-orange-400 text-sm font-medium mb-4">
            <Sparkles className="w-4 h-4" /> AI Property Intelligence
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">Turn any address into a development playbook.</h1>
          <p className="text-gray-400 max-w-2xl">
            Enter a property address and our AI scans likely zoning, lot characteristics, and the local market to generate
            detailed strategies — rezone, subdivide, build up, or rehab — each with step-by-step plans, permits, timelines,
            and projected returns.
          </p>
          {/* Entitlement badge */}
          {sub.loaded && (
            <div className="mt-5 inline-flex items-center gap-2 text-sm">
              {sub.privileged ? (
                <span className="inline-flex items-center gap-1.5 text-emerald-400"><Crown className="w-4 h-4" /> Owner access — unlimited</span>
              ) : sub.active ? (
                <span className="inline-flex items-center gap-1.5 text-emerald-400"><CheckCircle2 className="w-4 h-4" /> Subscribed — unlimited analyses</span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-gray-400">
                  <Zap className="w-4 h-4 text-orange-400" /> {sub.freeRemaining} of {sub.freeLimit} free studies remaining ·{' '}
                  <button onClick={() => setShowPlans(true)} className="text-orange-400 hover:underline">See plans</button>
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8 grid lg:grid-cols-3 gap-8">
        {/* Input */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-[#141414] border border-[#2A2A2A] rounded-2xl p-6 lg:sticky lg:top-6">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-2"><MapPin className="w-4 h-4" /> Property address</label>
            <input
              className="w-full bg-[#0F0F0F] border border-[#2A2A2A] rounded-lg px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-orange-500/60 mb-4"
              placeholder="123 Main St, Nashua NH 03060"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
            <label className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-2"><Building2 className="w-4 h-4" /> Property type (optional)</label>
            <select
              className="w-full bg-[#0F0F0F] border border-[#2A2A2A] rounded-lg px-4 py-3 text-white mb-4 focus:outline-none focus:border-orange-500/60"
              value={propertyType}
              onChange={(e) => setPropertyType(e.target.value)}
            >
              <option value="">Let AI infer it</option>
              <option value="single-family">Single-family</option>
              <option value="multi-family">Multi-family</option>
              <option value="commercial">Commercial</option>
              <option value="mixed-use">Mixed-use</option>
              <option value="land">Land / lot</option>
              <option value="condo">Condo / association</option>
            </select>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-2"><FileText className="w-4 h-4" /> Context (optional)</label>
            <textarea
              className="w-full bg-[#0F0F0F] border border-[#2A2A2A] rounded-lg px-4 py-3 text-white placeholder-gray-600 min-h-[90px] focus:outline-none focus:border-orange-500/60 mb-4"
              placeholder="Lot size, current use, budget, constraints, goals…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
            {error && <div className="mb-3 bg-red-500/10 border border-red-500/40 rounded-lg p-3 text-sm text-red-300">{error}</div>}
            <button
              onClick={generate}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-gradient-to-r from-[#ea580c] to-[#dc2626] text-white font-semibold hover:opacity-90 transition-opacity disabled:opacity-60"
            >
              {loading ? <><Loader2 className="w-5 h-5 animate-spin" /> Analyzing…</> : <><Sparkles className="w-5 h-5" /> Generate development plan</>}
            </button>
          </div>

          {/* History */}
          {history.length > 0 && (
            <div className="bg-[#141414] border border-[#2A2A2A] rounded-2xl p-4">
              <p className="flex items-center gap-2 text-sm font-semibold text-gray-300 mb-3"><History className="w-4 h-4" /> Past studies</p>
              <div className="space-y-1">
                {history.slice(0, 8).map((r) => (
                  <button
                    key={r.id}
                    onClick={() => { setReport(r); setOpenStrategy(0); }}
                    className="w-full flex items-center gap-2 text-left px-3 py-2 rounded-lg hover:bg-[#1A1A1A] transition-colors"
                  >
                    <MapPin className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
                    <span className="text-sm text-gray-300 truncate">{r.address}</span>
                    <ChevronRight className="w-4 h-4 text-gray-600 ml-auto flex-shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Report */}
        <div className="lg:col-span-2">
          {!analysis && !loading && (
            <div className="h-full flex flex-col items-center justify-center text-center border border-dashed border-[#2A2A2A] rounded-2xl py-20 px-6">
              <Compass className="w-12 h-12 text-gray-700 mb-4" />
              <p className="text-gray-400 font-medium">Your development playbook will appear here.</p>
              <p className="text-sm text-gray-600 mt-1 max-w-sm">Enter an address and generate a plan to see zoning, market analysis, and ranked strategies with timelines.</p>
            </div>
          )}

          {loading && (
            <div className="h-full flex flex-col items-center justify-center border border-[#2A2A2A] rounded-2xl py-20">
              <Loader2 className="w-10 h-10 text-orange-400 animate-spin mb-4" />
              <p className="text-gray-300 font-medium">Scanning zoning, lot data &amp; the local market…</p>
              <p className="text-sm text-gray-600 mt-1">This usually takes 15–30 seconds.</p>
            </div>
          )}

          {analysis && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2"><MapPin className="w-5 h-5 text-orange-400" /> {report.address}</h2>
              </div>

              {/* Verified parcel data (Regrid) */}
              {report.parcel && (
                <section className="bg-[#141414] border border-emerald-500/30 rounded-2xl p-6">
                  <h3 className="flex items-center gap-2 font-semibold text-white mb-3">
                    <ShieldCheck className="w-5 h-5 text-emerald-400" /> Verified parcel record
                    <span className="ml-auto text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                      {report.parcel.sourceLabel
                        || (report.parcel.source === 'massgis' ? 'MassGIS (free)'
                          : report.parcel.source === 'nh-granit' ? 'NH GRANIT (free)'
                          : 'Regrid')}
                    </span>
                  </h3>
                  <div className="grid sm:grid-cols-3 gap-3 text-sm">
                    <Fact label="Official zoning" value={report.parcel.zoning || report.parcel.zoningDescription} />
                    <Fact label="Zoning type" value={report.parcel.zoningType} />
                    <Fact label="Land use" value={report.parcel.landUse} />
                    <Fact label="Lot size" value={report.parcel.acreage ? `${report.parcel.acreage} ac` : undefined} />
                    <Fact label="Year built" value={report.parcel.yearBuilt} />
                    <Fact label="Building footprint" value={report.parcel.buildingSqft ? `${Number(report.parcel.buildingSqft).toLocaleString()} sqft` : undefined} />
                    <Fact label="Assessed value" value={report.parcel.parcelValue ? `$${Number(report.parcel.parcelValue).toLocaleString()}` : undefined} />
                    <Fact label="County" value={report.parcel.county} />
                    <Fact label="Owner of record" value={report.parcel.owner} />
                  </div>
                </section>
              )}

              {/* Verified valuation (ATTOM) */}
              {report.valuation && (
                <section className="bg-[#141414] border border-blue-500/30 rounded-2xl p-6">
                  <h3 className="flex items-center gap-2 font-semibold text-white mb-3">
                    <TrendingUp className="w-5 h-5 text-blue-400" /> Verified valuation
                    <span className="ml-auto text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/30">ATTOM</span>
                  </h3>
                  {report.valuation.avmValue && (
                    <div className="mb-4">
                      <p className="text-3xl font-bold text-white">${Number(report.valuation.avmValue).toLocaleString()}</p>
                      <p className="text-sm text-gray-400">
                        AVM estimate
                        {report.valuation.avmLow && report.valuation.avmHigh && (
                          <> · range ${Number(report.valuation.avmLow).toLocaleString()} – ${Number(report.valuation.avmHigh).toLocaleString()}</>
                        )}
                        {report.valuation.confidence ? <> · confidence {report.valuation.confidence}</> : null}
                      </p>
                    </div>
                  )}
                  <div className="grid sm:grid-cols-3 gap-3 text-sm">
                    <Fact label="Beds" value={report.valuation.beds} />
                    <Fact label="Baths" value={report.valuation.baths} />
                    <Fact label="Living area" value={report.valuation.livingSqft ? `${Number(report.valuation.livingSqft).toLocaleString()} sqft` : undefined} />
                    <Fact label="Lot size" value={report.valuation.lotSqft ? `${Number(report.valuation.lotSqft).toLocaleString()} sqft` : undefined} />
                    <Fact label="Last sale" value={report.valuation.lastSalePrice ? `$${Number(report.valuation.lastSalePrice).toLocaleString()}` : undefined} />
                    <Fact label="Last sale date" value={report.valuation.lastSaleDate} />
                  </div>
                </section>
              )}

              {/* Overview */}
              {analysis.propertyOverview && (
                <section className="bg-[#141414] border border-[#2A2A2A] rounded-2xl p-6">
                  <h3 className="flex items-center gap-2 font-semibold text-white mb-3"><Building2 className="w-5 h-5 text-orange-400" /> Property overview</h3>
                  <p className="text-gray-300 text-sm mb-4">{analysis.propertyOverview.summary}</p>
                  <div className="grid sm:grid-cols-2 gap-3 text-sm">
                    <Fact label="Estimated type" value={analysis.propertyOverview.estimatedType} />
                    <Fact label="Value range" value={analysis.propertyOverview.estimatedValueRange} />
                    <Fact label="Lot size" value={analysis.propertyOverview.lotSizeEstimate} />
                    <Fact label="Year built" value={analysis.propertyOverview.yearBuiltEstimate} />
                  </div>
                  {Array.isArray(analysis.propertyOverview.keyFacts) && analysis.propertyOverview.keyFacts.length > 0 && (
                    <ul className="mt-4 grid sm:grid-cols-2 gap-1.5">
                      {analysis.propertyOverview.keyFacts.map((f: string, i: number) => (
                        <li key={i} className="flex items-start gap-2 text-xs text-gray-400"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 mt-0.5" /> {f}</li>
                      ))}
                    </ul>
                  )}
                </section>
              )}

              {/* Zoning + Market */}
              <div className="grid md:grid-cols-2 gap-6">
                {analysis.zoning && (
                  <section className="bg-[#141414] border border-[#2A2A2A] rounded-2xl p-6">
                    <h3 className="flex items-center gap-2 font-semibold text-white mb-3"><Landmark className="w-5 h-5 text-orange-400" /> Zoning</h3>
                    <p className="text-sm text-gray-300 mb-2"><span className="text-gray-500">Likely designation:</span> {analysis.zoning.likelyDesignation}</p>
                    <TagList label="Allowed uses" items={analysis.zoning.allowedUses} />
                    <TagList label="Constraints" items={analysis.zoning.constraints} />
                    {analysis.zoning.rezonePotential && <p className="text-xs text-gray-400 mt-3"><span className="text-orange-400 font-medium">Rezone potential:</span> {analysis.zoning.rezonePotential}</p>}
                  </section>
                )}
                {analysis.marketSnapshot && (
                  <section className="bg-[#141414] border border-[#2A2A2A] rounded-2xl p-6">
                    <h3 className="flex items-center gap-2 font-semibold text-white mb-3"><TrendingUp className="w-5 h-5 text-orange-400" /> Local market</h3>
                    <p className="text-sm text-gray-300 mb-3">{analysis.marketSnapshot.summary}</p>
                    <div className="grid grid-cols-3 gap-2 text-center mb-3">
                      <Mini label="Median value" value={analysis.marketSnapshot.medianValue} />
                      <Mini label="Rent trend" value={analysis.marketSnapshot.rentTrend} />
                      <Mini label="Demand" value={analysis.marketSnapshot.demandLevel} />
                    </div>
                    <TagList label="Notable factors" items={analysis.marketSnapshot.notableFactors} />
                  </section>
                )}
              </div>

              {/* Strategies */}
              {Array.isArray(analysis.strategies) && (
                <section>
                  <h3 className="flex items-center gap-2 font-semibold text-white mb-4"><Layers className="w-5 h-5 text-orange-400" /> Strategies &amp; plans</h3>
                  {analysis.recommendedStrategy && (
                    <div className="mb-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-sm">
                      <CheckCircle2 className="w-4 h-4" /> Recommended: {analysis.recommendedStrategy}
                    </div>
                  )}
                  <div className="space-y-3">
                    {analysis.strategies.map((s: any, i: number) => {
                      const Icon = CATEGORY_ICON[s.category] || Compass;
                      const open = openStrategy === i;
                      return (
                        <div key={i} className="bg-[#141414] border border-[#2A2A2A] rounded-2xl overflow-hidden">
                          <button onClick={() => setOpenStrategy(open ? null : i)} className="w-full flex items-center gap-3 p-5 text-left hover:bg-[#1A1A1A] transition-colors">
                            <div className="w-10 h-10 rounded-lg bg-orange-500/15 flex items-center justify-center flex-shrink-0"><Icon className="w-5 h-5 text-orange-400" /></div>
                            <div className="min-w-0 flex-1">
                              <p className="font-semibold text-white truncate">{s.name}</p>
                              <p className="text-xs text-gray-500 truncate">{s.summary}</p>
                            </div>
                            <div className="hidden sm:flex items-center gap-2 flex-shrink-0">
                              {s.riskLevel && <span className={`text-[10px] uppercase px-2 py-0.5 rounded-full border ${RISK_STYLE[s.riskLevel] || RISK_STYLE.medium}`}>{s.riskLevel} risk</span>}
                              {typeof s.fitScore === 'number' && <span className="text-lg font-bold text-orange-400">{s.fitScore}</span>}
                            </div>
                            <ChevronRight className={`w-5 h-5 text-gray-500 flex-shrink-0 transition-transform ${open ? 'rotate-90' : ''}`} />
                          </button>
                          {open && (
                            <div className="px-5 pb-5 space-y-4 border-t border-[#2A2A2A] pt-4">
                              <div className="grid sm:grid-cols-3 gap-2 text-center">
                                <Mini label="Est. cost" value={s.estimatedCost} icon={DollarSign} />
                                <Mini label="Projected return" value={s.projectedReturn} icon={TrendingUp} />
                                <Mini label="Timeline" value={s.timeline} icon={Clock} />
                              </div>
                              {Array.isArray(s.steps) && s.steps.length > 0 && (
                                <div>
                                  <p className="text-xs uppercase tracking-wide text-gray-500 mb-2">Plan &amp; timeline</p>
                                  <ol className="space-y-2">
                                    {s.steps.map((st: any, j: number) => (
                                      <li key={j} className="flex gap-3">
                                        <div className="flex flex-col items-center">
                                          <span className="w-6 h-6 rounded-full bg-orange-500/15 text-orange-400 text-xs font-bold flex items-center justify-center flex-shrink-0">{j + 1}</span>
                                          {j < s.steps.length - 1 && <span className="w-px flex-1 bg-[#2A2A2A] my-1" />}
                                        </div>
                                        <div className="pb-1">
                                          <p className="text-sm text-white font-medium">{st.phase} {st.duration && <span className="text-xs text-gray-500 font-normal">· {st.duration}</span>}</p>
                                          <p className="text-sm text-gray-400">{st.description}</p>
                                        </div>
                                      </li>
                                    ))}
                                  </ol>
                                </div>
                              )}
                              <div className="grid sm:grid-cols-2 gap-4">
                                <TagList label="Permits & processes" items={s.permitsAndProcesses} />
                                <TagList label="Key considerations" items={s.keyConsiderations} />
                              </div>
                              {Array.isArray(s.risks) && s.risks.length > 0 && (
                                <div>
                                  <p className="text-xs uppercase tracking-wide text-gray-500 mb-2 flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5 text-orange-400" /> Risks</p>
                                  <ul className="space-y-1">
                                    {s.risks.map((r: string, k: number) => <li key={k} className="text-xs text-gray-400">• {r}</li>)}
                                  </ul>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}

              {analysis.disclaimer && (
                <p className="text-xs text-gray-600 border-t border-[#2A2A2A] pt-4">{analysis.disclaimer}</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Plans modal */}
      {showPlans && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 overflow-y-auto" onClick={() => setShowPlans(false)}>
          <div className="bg-[#0F0F0F] border border-[#2A2A2A] rounded-2xl max-w-4xl w-full p-8 my-8" onClick={(e) => e.stopPropagation()}>
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/15 border border-orange-500/30 text-orange-400 text-sm font-medium mb-3"><Lock className="w-4 h-4" /> Property Intelligence Subscription</div>
              <h2 className="text-2xl font-bold text-white">Unlimited AI development plans</h2>
              <p className="text-gray-400 mt-2">Built for landlords and condo associations to find more income in the property they already own.</p>
            </div>
            <div className="grid md:grid-cols-3 gap-4">
              {PLANS.map((plan) => {
                const Icon = plan.icon;
                return (
                  <div key={plan.tier} className={`rounded-2xl p-6 border ${plan.highlight ? 'border-orange-500/60 bg-gradient-to-b from-orange-600/15 to-[#141414]' : 'border-[#2A2A2A] bg-[#141414]'}`}>
                    {plan.highlight && <div className="text-[10px] uppercase tracking-wide text-orange-400 font-bold mb-2">Most popular</div>}
                    <div className="w-10 h-10 rounded-lg bg-orange-500/15 flex items-center justify-center mb-3"><Icon className="w-5 h-5 text-orange-400" /></div>
                    <p className="font-semibold text-white">{plan.name}</p>
                    <p className="text-2xl font-bold text-white mt-1">{plan.price}<span className="text-sm text-gray-500 font-normal">{plan.period}</span></p>
                    <ul className="mt-4 space-y-2">
                      {plan.features.map((f, i) => <li key={i} className="flex items-start gap-2 text-sm text-gray-300"><CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" /> {f}</li>)}
                    </ul>
                    <button
                      onClick={() => subscribe(plan)}
                      disabled={subscribing === plan.tier}
                      className={`w-full mt-5 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold transition-opacity disabled:opacity-60 ${plan.highlight ? 'bg-gradient-to-r from-[#ea580c] to-[#dc2626] text-white hover:opacity-90' : 'bg-[#2A2A2A] text-white hover:bg-[#3A3A3A]'}`}
                    >
                      {subscribing === plan.tier ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Subscribe'}
                    </button>
                  </div>
                );
              })}
            </div>
            <button onClick={() => setShowPlans(false)} className="block mx-auto mt-6 text-sm text-gray-500 hover:text-white">Maybe later</button>
          </div>
        </div>
      )}
    </div>
  );
}

function Fact({ label, value }: { label: string; value: any }) {
  return (
    <div className="bg-[#0F0F0F] rounded-lg px-3 py-2">
      <p className="text-[10px] uppercase tracking-wide text-gray-500">{label}</p>
      <p className="text-white text-sm">{value || '—'}</p>
    </div>
  );
}

function Mini({ label, value, icon: Icon }: { label: string; value: any; icon?: typeof Clock }) {
  return (
    <div className="bg-[#0F0F0F] rounded-lg py-2 px-2">
      <p className="text-[10px] uppercase tracking-wide text-gray-500 flex items-center justify-center gap-1">{Icon && <Icon className="w-3 h-3" />} {label}</p>
      <p className="text-white text-sm font-semibold capitalize mt-0.5 break-words">{value || '—'}</p>
    </div>
  );
}

function TagList({ label, items }: { label: string; items?: string[] }) {
  if (!Array.isArray(items) || items.length === 0) return null;
  return (
    <div className="mb-2">
      <p className="text-[10px] uppercase tracking-wide text-gray-500 mb-1.5">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {items.map((it, i) => <span key={i} className="text-xs px-2 py-1 rounded-md bg-[#0F0F0F] border border-[#2A2A2A] text-gray-300">{it}</span>)}
      </div>
    </div>
  );
}
