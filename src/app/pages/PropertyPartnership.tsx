import { useMemo, useState } from 'react';
import {
  Home, MapPin, DollarSign, TrendingUp, Ruler, Hammer, Building2,
  Target, Calendar, User, Mail, Phone, CheckCircle2, Sparkles, ArrowRight,
  Layers, Handshake, Info, Loader2,
} from 'lucide-react';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { authedHeadersOrAnon } from "../utils/authHeaders";
import {
  recommendStrategy, STRATEGY_LABELS,
  type PropertyInputs, type StrategyKey, type StrategyRecommendation,
} from '../lib/propertyStrategy';

const SERVER = `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6`;

const STRATEGY_ICON: Record<StrategyKey, typeof Home> = {
  'fix-flip': Hammer,
  'lease-hold': Home,
  'subdivide-build': Layers,
  'repurpose-sell': Building2,
  'sell-asis': DollarSign,
};

const STRATEGY_BLURB: Record<StrategyKey, string> = {
  'fix-flip': 'Renovate and resell for a lump-sum profit. We fund and manage the rehab, you share the upside.',
  'lease-hold': 'Hold and rent for steady monthly cash flow. We handle placement and management.',
  'subdivide-build': 'Split the lot or add units, then build. We take it through entitlement and construction.',
  'repurpose-sell': 'Change the use to unlock hidden value, then sell at the higher and better use.',
  'sell-asis': 'Fast, clean exit with no rehab. We line up a cash buyer and close quickly.',
};

const emptyInputs: PropertyInputs = {
  propertyType: 'single-family',
  condition: 'fair',
  currentUse: 'vacant',
  lotSizeAcres: 0,
  zoningSubdividable: 'unsure',
  estimatedValue: 0,
  afterRepairValue: 0,
  repairCost: 0,
  monthlyRentPotential: 0,
  ownership: 'free-clear',
  goal: 'unsure',
  timeline: 'flexible',
};

const inputClass =
  'w-full bg-[#0F0F0F] border border-[#2A2A2A] rounded-lg px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-orange-500/60 transition-colors';
const labelClass = 'flex items-center gap-2 text-sm font-medium text-gray-300 mb-2';

function scoreColor(score: number) {
  if (score >= 70) return 'text-emerald-400';
  if (score >= 45) return 'text-orange-400';
  return 'text-gray-500';
}
function scoreBar(score: number) {
  if (score >= 70) return 'bg-emerald-500';
  if (score >= 45) return 'bg-orange-500';
  return 'bg-gray-600';
}

export default function PropertyPartnership() {
  const [inputs, setInputs] = useState<PropertyInputs>(emptyInputs);
  const [contact, setContact] = useState({ name: '', email: '', phone: '', address: '', notes: '' });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const recommendation: StrategyRecommendation = useMemo(() => recommendStrategy(inputs), [inputs]);
  const hasData = inputs.estimatedValue > 0 || inputs.monthlyRentPotential > 0 || inputs.lotSizeAcres > 0;

  const setNum = (key: keyof PropertyInputs) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setInputs((p) => ({ ...p, [key]: Number(e.target.value) || 0 }));
  const setSel = (key: keyof PropertyInputs) => (e: React.ChangeEvent<HTMLSelectElement>) =>
    setInputs((p) => ({ ...p, [key]: e.target.value as never }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!contact.name || !contact.email) {
      setError('Please add your name and email so we can follow up.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`${SERVER}/investments/partner-properties`, {
        method: 'POST',
        headers: await authedHeadersOrAnon(publicAnonKey),
        body: JSON.stringify({
          contact,
          property: inputs,
          recommendation,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.error) {
        throw new Error(data.error || `Server returned ${res.status}`);
      }
      setSubmitted(true);
    } catch (err: any) {
      console.error('PropertyPartnership: failed to submit partnership request:', err);
      setError(`We couldn't submit your property right now: ${err.message}. Please try again.`);
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    const PrimaryIcon = STRATEGY_ICON[recommendation.primary.key];
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center p-6">
        <div className="max-w-lg w-full bg-[#141414] border border-[#2A2A2A] rounded-2xl p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-500/15 flex items-center justify-center mx-auto mb-5">
            <CheckCircle2 className="w-8 h-8 text-emerald-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Property submitted!</h1>
          <p className="text-gray-400 mb-6">
            Thanks, {contact.name.split(' ')[0] || 'partner'}. Our investment team will review your property and reach out to
            discuss a partnership.
          </p>
          <div className="bg-[#0F0F0F] border border-orange-500/30 rounded-xl p-5 text-left flex items-start gap-3">
            <PrimaryIcon className="w-6 h-6 text-orange-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs uppercase tracking-wide text-orange-400 font-semibold mb-1">Our recommended strategy</p>
              <p className="text-white font-semibold">{recommendation.primary.label}</p>
              {recommendation.primary.projection && (
                <p className="text-sm text-gray-400 mt-1">{recommendation.primary.projection}</p>
              )}
            </div>
          </div>
          <button
            onClick={() => { setSubmitted(false); setInputs(emptyInputs); setContact({ name: '', email: '', phone: '', address: '', notes: '' }); }}
            className="mt-6 text-sm text-gray-400 hover:text-white transition-colors"
          >
            Submit another property
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      {/* Hero */}
      <div className="bg-gradient-to-b from-orange-600/15 to-transparent border-b border-[#2A2A2A]">
        <div className="max-w-6xl mx-auto px-6 py-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/15 border border-orange-500/30 text-orange-400 text-sm font-medium mb-4">
            <Handshake className="w-4 h-4" /> Partner With Us
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">Already own a property? Let's find its best move.</h1>
          <p className="text-gray-400 max-w-2xl">
            Tell us about your property and what you want out of it. We'll instantly score the smartest strategy —
            fix &amp; flip, lease, subdivide &amp; build, repurpose, or a quick sale — then partner with you to execute it.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="max-w-6xl mx-auto px-6 py-10 grid lg:grid-cols-5 gap-8">
        {/* Left: inputs */}
        <div className="lg:col-span-3 space-y-8">
          {/* Property basics */}
          <section className="bg-[#141414] border border-[#2A2A2A] rounded-2xl p-6">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-white mb-5"><Home className="w-5 h-5 text-orange-400" /> Property basics</h2>
            <div className="grid sm:grid-cols-2 gap-5">
              <div>
                <label className={labelClass}><Building2 className="w-4 h-4" /> Property type</label>
                <select className={inputClass} value={inputs.propertyType} onChange={setSel('propertyType')}>
                  <option value="single-family">Single-family home</option>
                  <option value="multi-family">Multi-family (2+ units)</option>
                  <option value="commercial">Commercial</option>
                  <option value="mixed-use">Mixed-use</option>
                  <option value="land">Land / lot</option>
                </select>
              </div>
              <div>
                <label className={labelClass}><Hammer className="w-4 h-4" /> Condition</label>
                <select className={inputClass} value={inputs.condition} onChange={setSel('condition')}>
                  <option value="excellent">Excellent / renovated</option>
                  <option value="good">Good</option>
                  <option value="fair">Fair — needs cosmetics</option>
                  <option value="poor">Poor — major rehab</option>
                  <option value="tear-down">Tear-down</option>
                </select>
              </div>
              <div>
                <label className={labelClass}><Home className="w-4 h-4" /> Current use</label>
                <select className={inputClass} value={inputs.currentUse} onChange={setSel('currentUse')}>
                  <option value="vacant">Vacant</option>
                  <option value="rented">Rented / tenanted</option>
                  <option value="owner-occupied">Owner-occupied</option>
                  <option value="commercial-operating">Operating commercial</option>
                </select>
              </div>
              <div>
                <label className={labelClass}><Ruler className="w-4 h-4" /> Lot size (acres)</label>
                <input type="number" min="0" step="0.05" className={inputClass} placeholder="0.25" value={inputs.lotSizeAcres || ''} onChange={setNum('lotSizeAcres')} />
              </div>
              <div className="sm:col-span-2">
                <label className={labelClass}><Layers className="w-4 h-4" /> Does zoning allow subdivision / added units?</label>
                <select className={inputClass} value={inputs.zoningSubdividable} onChange={setSel('zoningSubdividable')}>
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                  <option value="unsure">Not sure</option>
                </select>
              </div>
            </div>
          </section>

          {/* Financials */}
          <section className="bg-[#141414] border border-[#2A2A2A] rounded-2xl p-6">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-white mb-1"><DollarSign className="w-5 h-5 text-orange-400" /> The numbers</h2>
            <p className="text-sm text-gray-500 mb-5">Estimates are fine — they only sharpen the recommendation.</p>
            <div className="grid sm:grid-cols-2 gap-5">
              <div>
                <label className={labelClass}>Current as-is value</label>
                <input type="number" min="0" className={inputClass} placeholder="250000" value={inputs.estimatedValue || ''} onChange={setNum('estimatedValue')} />
              </div>
              <div>
                <label className={labelClass}>After-repair value (ARV)</label>
                <input type="number" min="0" className={inputClass} placeholder="360000" value={inputs.afterRepairValue || ''} onChange={setNum('afterRepairValue')} />
              </div>
              <div>
                <label className={labelClass}>Estimated repair cost</label>
                <input type="number" min="0" className={inputClass} placeholder="60000" value={inputs.repairCost || ''} onChange={setNum('repairCost')} />
              </div>
              <div>
                <label className={labelClass}>Potential monthly rent</label>
                <input type="number" min="0" className={inputClass} placeholder="2200" value={inputs.monthlyRentPotential || ''} onChange={setNum('monthlyRentPotential')} />
              </div>
              <div>
                <label className={labelClass}>Ownership</label>
                <select className={inputClass} value={inputs.ownership} onChange={setSel('ownership')}>
                  <option value="free-clear">Owned free &amp; clear</option>
                  <option value="mortgaged">Has a mortgage</option>
                </select>
              </div>
            </div>
          </section>

          {/* Goals */}
          <section className="bg-[#141414] border border-[#2A2A2A] rounded-2xl p-6">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-white mb-5"><Target className="w-5 h-5 text-orange-400" /> Your goal</h2>
            <div className="grid sm:grid-cols-2 gap-5">
              <div>
                <label className={labelClass}><TrendingUp className="w-4 h-4" /> What matters most?</label>
                <select className={inputClass} value={inputs.goal} onChange={setSel('goal')}>
                  <option value="unsure">Not sure — advise me</option>
                  <option value="fast-profit">Fast lump-sum profit</option>
                  <option value="passive-income">Ongoing passive income</option>
                  <option value="long-term-growth">Long-term growth &amp; equity</option>
                </select>
              </div>
              <div>
                <label className={labelClass}><Calendar className="w-4 h-4" /> Timeline</label>
                <select className={inputClass} value={inputs.timeline} onChange={setSel('timeline')}>
                  <option value="asap">As soon as possible</option>
                  <option value="3-6mo">3–6 months</option>
                  <option value="6-12mo">6–12 months</option>
                  <option value="flexible">Flexible</option>
                </select>
              </div>
            </div>
          </section>

          {/* Contact */}
          <section className="bg-[#141414] border border-[#2A2A2A] rounded-2xl p-6">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-white mb-5"><User className="w-5 h-5 text-orange-400" /> How do we reach you?</h2>
            <div className="grid sm:grid-cols-2 gap-5">
              <div>
                <label className={labelClass}><User className="w-4 h-4" /> Full name *</label>
                <input className={inputClass} placeholder="Jordan Smith" value={contact.name} onChange={(e) => setContact((c) => ({ ...c, name: e.target.value }))} />
              </div>
              <div>
                <label className={labelClass}><Mail className="w-4 h-4" /> Email *</label>
                <input type="email" className={inputClass} placeholder="jordan@email.com" value={contact.email} onChange={(e) => setContact((c) => ({ ...c, email: e.target.value }))} />
              </div>
              <div>
                <label className={labelClass}><Phone className="w-4 h-4" /> Phone</label>
                <input type="tel" className={inputClass} placeholder="(603) 555-0123" value={contact.phone} onChange={(e) => setContact((c) => ({ ...c, phone: e.target.value }))} />
              </div>
              <div>
                <label className={labelClass}><MapPin className="w-4 h-4" /> Property address</label>
                <input className={inputClass} placeholder="123 Main St, Nashua NH" value={contact.address} onChange={(e) => setContact((c) => ({ ...c, address: e.target.value }))} />
              </div>
              <div className="sm:col-span-2">
                <label className={labelClass}><Info className="w-4 h-4" /> Anything else we should know?</label>
                <textarea className={`${inputClass} min-h-[90px]`} placeholder="Liens, tenants, timeline constraints, your ideal partnership terms…" value={contact.notes} onChange={(e) => setContact((c) => ({ ...c, notes: e.target.value }))} />
              </div>
            </div>
          </section>
        </div>

        {/* Right: live recommendation */}
        <div className="lg:col-span-2">
          <div className="lg:sticky lg:top-6 space-y-4">
            <div className="bg-gradient-to-b from-orange-600/15 to-[#141414] border border-orange-500/30 rounded-2xl p-6">
              <div className="flex items-center gap-2 text-orange-400 text-sm font-semibold mb-4">
                <Sparkles className="w-4 h-4" /> Live recommendation
              </div>

              {!hasData ? (
                <p className="text-sm text-gray-500">Fill in a few property details and we'll rank the best strategies here in real time.</p>
              ) : (
                <>
                  {(() => {
                    const PrimaryIcon = STRATEGY_ICON[recommendation.primary.key];
                    return (
                      <div className="bg-[#0F0F0F] border border-[#2A2A2A] rounded-xl p-4 mb-4">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="w-10 h-10 rounded-lg bg-orange-500/15 flex items-center justify-center">
                            <PrimaryIcon className="w-5 h-5 text-orange-400" />
                          </div>
                          <div>
                            <p className="text-xs uppercase tracking-wide text-gray-500">Best move</p>
                            <p className="text-white font-bold">{recommendation.primary.label}</p>
                          </div>
                          <span className={`ml-auto text-2xl font-bold ${scoreColor(recommendation.primary.score)}`}>{recommendation.primary.score}</span>
                        </div>
                        <p className="text-sm text-gray-400 mb-2">{STRATEGY_BLURB[recommendation.primary.key]}</p>
                        {recommendation.primary.projection && (
                          <p className="text-sm font-semibold text-emerald-400">{recommendation.primary.projection}</p>
                        )}
                        {recommendation.primary.reasons.length > 0 && (
                          <ul className="mt-3 space-y-1">
                            {recommendation.primary.reasons.slice(0, 3).map((r, i) => (
                              <li key={i} className="flex items-start gap-2 text-xs text-gray-400">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 mt-0.5" /> {r}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    );
                  })()}

                  {/* All strategies ranked */}
                  <div className="space-y-2 mb-4">
                    {recommendation.scores.map((s) => {
                      const Icon = STRATEGY_ICON[s.key];
                      return (
                        <div key={s.key} className="flex items-center gap-3">
                          <Icon className="w-4 h-4 text-gray-500 flex-shrink-0" />
                          <span className="text-sm text-gray-300 w-32 flex-shrink-0">{s.label}</span>
                          <div className="flex-1 h-2 rounded-full bg-[#2A2A2A] overflow-hidden">
                            <div className={`h-full rounded-full ${scoreBar(s.score)}`} style={{ width: `${s.score}%` }} />
                          </div>
                          <span className={`text-xs font-semibold w-6 text-right ${scoreColor(s.score)}`}>{s.score}</span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Key metrics */}
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-[#0F0F0F] rounded-lg py-2">
                      <p className="text-xs text-gray-500">Cap rate</p>
                      <p className="text-sm font-semibold text-white">{recommendation.metrics.capRate}%</p>
                    </div>
                    <div className="bg-[#0F0F0F] rounded-lg py-2">
                      <p className="text-xs text-gray-500">Flip margin</p>
                      <p className="text-sm font-semibold text-white">{recommendation.metrics.flipMarginPct}%</p>
                    </div>
                    <div className="bg-[#0F0F0F] rounded-lg py-2">
                      <p className="text-xs text-gray-500">Gross yield</p>
                      <p className="text-sm font-semibold text-white">{recommendation.metrics.grossYield}%</p>
                    </div>
                  </div>
                </>
              )}
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/40 rounded-lg p-3 text-sm text-red-300">{error}</div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-gradient-to-r from-[#ea580c] to-[#dc2626] text-white font-semibold hover:opacity-90 transition-opacity disabled:opacity-60"
            >
              {submitting ? <><Loader2 className="w-5 h-5 animate-spin" /> Submitting…</> : <>Submit for a partnership review <ArrowRight className="w-5 h-5" /></>}
            </button>
            <p className="text-xs text-gray-600 text-center">No obligation. Our team reviews every property and follows up personally.</p>
          </div>
        </div>
      </form>
    </div>
  );
}
