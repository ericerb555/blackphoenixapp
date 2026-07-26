/**
 * LocalLeadsLanding — public geo-targeted ad landing page.
 * URL: /local  (also /offer, /nearby)
 * Purpose: capture opt-in leads from Facebook/Google ads targeting 50-mile radius.
 * Leads auto-flow into the AI Email Lead Gen system via /leads/capture.
 */
import { useState } from 'react';
import { CheckCircle, MapPin, Star, Zap, Shield, Users, ArrowRight, ChevronDown } from 'lucide-react';
import { projectId } from '../utils/supabase/info';

const SERVER = `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6`;

import companyLogo from '../../imports/BPB_phoenix_full_color_logo.png';

const SERVICES = [
  { icon: '🔨', label: 'Construction & Remodeling' },
  { icon: '🏠', label: 'Home Maintenance' },
  { icon: '⚽', label: 'Sports Equipment' },
  { icon: '👕', label: 'Clothing & Apparel' },
  { icon: '💄', label: 'Beauty Supplies' },
  { icon: '⚡', label: 'Electronics' },
];

const REVIEWS = [
  { name: 'Marcus T.', location: 'Detroit, MI', stars: 5, text: 'Found exactly what I needed for my renovation. Fast delivery and great prices — will order again.' },
  { name: 'Priya S.', location: 'Warren, MI', stars: 5, text: 'Amazing customer service. They actually picked up the phone. Small business quality with big store selection.' },
  { name: 'James R.', location: 'Dearborn, MI', stars: 5, text: "The construction supplies saved my project timeline. Black Phoenix came through when the big box stores couldn't." },
];

const OFFER_PERKS = [
  'Exclusive 15% off your first order',
  'Early access to local deals & drops',
  'Priority service scheduling in your area',
  'Free shipping on orders over $75',
];

type Step = 'form' | 'success';

export default function LocalLeadsLanding() {
  const [step, setStep] = useState<Step>('form');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [zip, setZip] = useState('');
  const [interest, setInterest] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showReviews, setShowReviews] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !email.trim()) { setError('Name and email are required.'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError('Please enter a valid email address.'); return; }
    setError('');
    setLoading(true);

    try {
      await fetch(`${SERVER}/leads/capture`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          name: name.trim(),
          source: 'geo_ad_local',
          metadata: { zip: zip.trim(), interest, page: 'local-landing' },
        }),
      });
      setStep('success');
    } catch {
      // Still show success — don't block user if server is slow
      setStep('success');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen text-white" style={{ background: '#080808' }}>

      {/* ── GRID BACKGROUND ───────────────────────────────────────────────────── */}
      <div className="fixed inset-0 pointer-events-none" style={{
        backgroundImage: 'linear-gradient(rgba(234,88,12,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(234,88,12,0.04) 1px, transparent 1px)',
        backgroundSize: '48px 48px',
      }} />
      <div className="fixed inset-0 pointer-events-none" style={{
        background: 'radial-gradient(ellipse 80% 50% at 50% 0%, rgba(234,88,12,0.12) 0%, transparent 60%)',
      }} />

      {/* ── HEADER BAR ────────────────────────────────────────────────────────── */}
      <header className="relative z-10 flex items-center justify-between px-5 py-4 border-b"
        style={{ borderColor: 'rgba(255,255,255,0.06)', background: 'rgba(8,8,8,0.9)', backdropFilter: 'blur(20px)' }}>
        <div className="flex items-center gap-3">
          <img src={companyLogo} alt="Black Phoenix" style={{ height: 40, width: 'auto', objectFit: 'contain', filter: 'drop-shadow(0 0 10px rgba(234,88,12,0.4))' }} />
          <div>
            <p className="font-black text-white text-sm leading-none">Black Phoenix</p>
            <p className="text-[10px] tracking-widest uppercase" style={{ color: '#ea580c' }}>Family Owned &amp; Operated</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold"
          style={{ background: 'rgba(234,88,12,0.12)', border: '1px solid rgba(234,88,12,0.3)', color: '#fb923c' }}>
          <MapPin className="w-3 h-3" /> Serving Your Area
        </div>
      </header>

      <div className="relative z-10 max-w-lg mx-auto px-5 py-8">

        {step === 'form' && (
          <>
            {/* ── HERO ──────────────────────────────────────────────────────────── */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-black tracking-widest uppercase mb-5"
                style={{ background: 'rgba(234,88,12,0.1)', border: '1px solid rgba(234,88,12,0.3)', color: '#fb923c' }}>
                <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse" />
                Local Neighbors — Special Offer
              </div>

              <h1 className="font-black leading-tight mb-3" style={{ fontSize: 'clamp(2rem, 8vw, 3.2rem)' }}>
                Your Neighborhood<br />
                <span style={{ background: 'linear-gradient(90deg, #ea580c, #fb923c)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                  Deserves Better
                </span>
              </h1>

              <p className="text-gray-400 leading-relaxed mb-6" style={{ fontSize: '1rem' }}>
                Black Phoenix serves families &amp; businesses within 50 miles.
                Join your neighbors getting exclusive local deals on construction, sports, clothing, beauty, and more.
              </p>

              {/* Star row */}
              <div className="flex items-center justify-center gap-2 mb-2">
                <div className="flex gap-0.5">
                  {[1,2,3,4,5].map(s => <Star key={s} className="w-4 h-4 fill-yellow-400 text-yellow-400" />)}
                </div>
                <span className="text-sm font-bold text-white">4.9</span>
                <span className="text-sm text-gray-500">· 200+ local reviews</span>
              </div>
            </div>

            {/* ── OFFER CARD ────────────────────────────────────────────────────── */}
            <div className="rounded-3xl overflow-hidden mb-6" style={{ border: '1px solid rgba(234,88,12,0.25)', background: 'rgba(234,88,12,0.05)' }}>
              <div className="px-6 py-4 border-b" style={{ borderColor: 'rgba(234,88,12,0.15)', background: 'rgba(234,88,12,0.08)' }}>
                <p className="text-center font-black text-white text-lg">🎁 Claim Your Local Offer</p>
                <p className="text-center text-xs text-gray-400 mt-0.5">Free to join · No spam · Unsubscribe anytime</p>
              </div>
              <div className="px-6 py-4">
                <ul className="space-y-2.5 mb-5">
                  {OFFER_PERKS.map((p, i) => (
                    <li key={i} className="flex items-center gap-2.5 text-sm text-gray-200">
                      <CheckCircle className="w-4 h-4 flex-shrink-0" style={{ color: '#ea580c' }} />
                      {p}
                    </li>
                  ))}
                </ul>

                {/* ── OPT-IN FORM ─────────────────────────────────────────────── */}
                <form onSubmit={handleSubmit} className="space-y-3">
                  <input
                    required
                    type="text"
                    placeholder="Your first name"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="w-full px-4 py-3.5 rounded-xl text-sm text-white placeholder-gray-600 focus:outline-none transition"
                    style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
                    onFocus={e => (e.target.style.borderColor = 'rgba(234,88,12,0.6)')}
                    onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')}
                  />
                  <input
                    required
                    type="email"
                    placeholder="Your email address"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full px-4 py-3.5 rounded-xl text-sm text-white placeholder-gray-600 focus:outline-none transition"
                    style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
                    onFocus={e => (e.target.style.borderColor = 'rgba(234,88,12,0.6)')}
                    onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')}
                  />
                  <input
                    type="text"
                    placeholder="Your ZIP code (optional)"
                    value={zip}
                    onChange={e => setZip(e.target.value)}
                    maxLength={5}
                    className="w-full px-4 py-3.5 rounded-xl text-sm text-white placeholder-gray-600 focus:outline-none transition"
                    style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
                    onFocus={e => (e.target.style.borderColor = 'rgba(234,88,12,0.6)')}
                    onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')}
                  />

                  {/* Interest selector */}
                  <div className="relative">
                    <select
                      value={interest}
                      onChange={e => setInterest(e.target.value)}
                      className="w-full px-4 py-3.5 rounded-xl text-sm text-white focus:outline-none transition appearance-none"
                      style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: interest ? '#fff' : '#6b7280' }}
                    >
                      <option value="" disabled>What are you most interested in?</option>
                      {SERVICES.map(s => (
                        <option key={s.label} value={s.label} style={{ background: '#1a1a1a' }}>{s.icon} {s.label}</option>
                      ))}
                      <option value="Everything" style={{ background: '#1a1a1a' }}>🛍️ Everything — show me it all</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                  </div>

                  {error && <p className="text-red-400 text-xs font-semibold">{error}</p>}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-4 rounded-2xl font-black text-white text-base transition-all hover:brightness-110 active:scale-98 disabled:opacity-60 flex items-center justify-center gap-2"
                    style={{ background: 'linear-gradient(135deg, #ea580c, #f97316)', boxShadow: '0 8px 32px rgba(234,88,12,0.35)', minHeight: 56 }}
                  >
                    {loading ? (
                      <span className="flex gap-1">
                        {[0,1,2].map(i => <span key={i} className="w-2 h-2 rounded-full bg-white animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />)}
                      </span>
                    ) : (
                      <><Zap className="w-5 h-5" /> Claim My Offer — It's Free</>
                    )}
                  </button>

                  <p className="text-center text-[10px] text-gray-600 leading-relaxed">
                    By submitting you agree to receive email offers from Black Phoenix. No spam ever. Unsubscribe anytime.
                  </p>
                </form>
              </div>
            </div>

            {/* ── TRUST STRIP ───────────────────────────────────────────────────── */}
            <div className="grid grid-cols-3 gap-3 mb-8">
              {[
                { icon: Shield, label: 'Secure &\nPrivate' },
                { icon: Users, label: 'Family\nOwned' },
                { icon: MapPin, label: '50-Mile\nService Area' },
              ].map(({ icon: Icon, label }, i) => (
                <div key={i} className="flex flex-col items-center gap-2 py-4 rounded-2xl text-center"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <Icon className="w-5 h-5" style={{ color: '#ea580c' }} />
                  <p className="text-[11px] font-bold text-gray-300 leading-tight whitespace-pre-line">{label}</p>
                </div>
              ))}
            </div>

            {/* ── WHAT WE OFFER ─────────────────────────────────────────────────── */}
            <div className="mb-8">
              <p className="text-xs font-black tracking-widest uppercase text-gray-500 mb-3">What You'll Get Access To</p>
              <div className="grid grid-cols-2 gap-2">
                {SERVICES.map(s => (
                  <div key={s.label} className="flex items-center gap-2.5 px-4 py-3 rounded-xl"
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <span className="text-xl">{s.icon}</span>
                    <span className="text-xs font-bold text-gray-300">{s.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* ── REVIEWS (collapsible) ─────────────────────────────────────────── */}
            <div>
              <button onClick={() => setShowReviews(v => !v)}
                className="w-full flex items-center justify-between px-4 py-3 rounded-2xl transition"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <div className="flex items-center gap-2">
                  <div className="flex gap-0.5">
                    {[1,2,3,4,5].map(s => <Star key={s} className="w-3 h-3 fill-yellow-400 text-yellow-400" />)}
                  </div>
                  <span className="text-xs font-bold text-white">What your neighbors say</span>
                </div>
                <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${showReviews ? 'rotate-180' : ''}`} />
              </button>

              {showReviews && (
                <div className="space-y-3 mt-3">
                  {REVIEWS.map((r, i) => (
                    <div key={i} className="rounded-2xl p-4"
                      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                      <div className="flex gap-0.5 mb-2">
                        {[1,2,3,4,5].map(s => <Star key={s} className="w-3 h-3 fill-yellow-400 text-yellow-400" />)}
                      </div>
                      <p className="text-xs text-gray-400 italic mb-3">"{r.text}"</p>
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-xl flex items-center justify-center font-black text-xs flex-shrink-0"
                          style={{ background: '#ea580c' }}>{r.name[0]}</div>
                        <div>
                          <p className="text-xs font-bold text-white">{r.name}</p>
                          <p className="text-[10px] text-gray-600">{r.location}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* ── SUCCESS SCREEN ──────────────────────────────────────────────────── */}
        {step === 'success' && (
          <div className="flex flex-col items-center justify-center min-h-[70vh] text-center gap-5 py-10">
            {/* Animated checkmark */}
            <div className="w-24 h-24 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(234,88,12,0.12)', border: '2px solid rgba(234,88,12,0.4)' }}>
              <CheckCircle className="w-12 h-12" style={{ color: '#ea580c' }} />
            </div>

            <div>
              <h2 className="text-3xl font-black text-white mb-2">You're In! 🎉</h2>
              <p className="text-gray-400 leading-relaxed max-w-xs">
                Welcome to the Black Phoenix family, {name.split(' ')[0]}.
                Check your inbox — your exclusive offer is on its way.
              </p>
            </div>

            {/* Discount code */}
            <div className="w-full rounded-2xl p-5 text-center"
              style={{ background: 'rgba(234,88,12,0.08)', border: '2px dashed rgba(234,88,12,0.3)' }}>
              <p className="text-xs font-bold text-gray-500 tracking-widest uppercase mb-2">Your Discount Code</p>
              <p className="text-3xl font-black tracking-widest" style={{ color: '#fb923c' }}>BPLOCAL15</p>
              <p className="text-xs text-gray-500 mt-1">15% off your first order · Valid 30 days</p>
            </div>

            <div className="space-y-2 w-full">
              <a href="/public-store"
                className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-black text-white text-base transition hover:brightness-110"
                style={{ background: 'linear-gradient(135deg, #ea580c, #f97316)', boxShadow: '0 8px 32px rgba(234,88,12,0.3)' }}>
                Shop Now <ArrowRight className="w-4 h-4" />
              </a>
              <p className="text-xs text-gray-600 text-center">
                We'll also send you a confirmation email at <span className="text-gray-400">{email}</span>
              </p>
            </div>

            <div className="flex items-center gap-2 mt-2">
              <img src={companyLogo} alt="Black Phoenix" style={{ height: 32, width: 'auto', objectFit: 'contain', opacity: 0.7 }} />
              <p className="text-xs text-gray-600">Black Phoenix · Family Owned &amp; Operated</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
