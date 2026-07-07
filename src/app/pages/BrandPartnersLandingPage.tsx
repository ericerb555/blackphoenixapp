/**
 * Brand Partners Landing Page
 * Sells advertising partnership with Black Phoenix before pushing to sign up.
 */

import { useState } from 'react';
import { motion } from 'motion/react';
import {
  Megaphone, ArrowRight, CheckCircle, TrendingUp, Users, Eye,
  Play, BarChart3, Star, Zap, Target, Award, ChevronDown,
  ShoppingBag, Home, Building2, Wrench
} from 'lucide-react';
import phoenixLogo from '../../imports/BPB_phoenix_full_color_logo.png';

interface Props { onNavigate?: (page: string) => void; }

export default function BrandPartnersLandingPage({ onNavigate }: Props) {
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

  const go = (page: string) => onNavigate ? onNavigate(page) : (window.location.href = `/${page}`);

  const AUDIENCE = [
    { icon: Home, label: 'Homeowners', desc: 'Actively renovating or maintaining their homes', color: 'text-orange-400' },
    { icon: Building2, label: 'Property Managers', desc: 'Managing multiple rental units, always sourcing', color: 'text-blue-400' },
    { icon: Wrench, label: 'Contractors', desc: 'Looking for tools, materials, and services daily', color: 'text-purple-400' },
    { icon: ShoppingBag, label: 'Investors', desc: 'Funding renovation and construction projects', color: 'text-green-400' },
  ];

  const FORMATS = [
    { icon: Play, title: 'Video Reels', desc: 'Short-form video ads in our service reels feed. High engagement, mobile-first.', badge: 'Most Effective' },
    { icon: Eye, title: 'Banner Placements', desc: 'Prominent banner ads across all customer and contractor portal views.' },
    { icon: Star, title: 'Featured Listings', desc: 'Get featured in search results when customers look for your category.' },
    { icon: Megaphone, title: 'Newsletter Spots', desc: 'Dedicated placement in our weekly customer updates.' },
  ];

  const PLANS = [
    {
      id: 'starter',
      name: 'Starter',
      price: 'FREE',
      period: 'First 6 months',
      highlight: false,
      badge: 'Founding Offer',
      features: ['1 video reel per month', 'Banner on 1 portal', 'Basic analytics', 'Email support'],
      cta: 'Claim Free Spot',
    },
    {
      id: 'growth',
      name: 'Growth',
      price: '$149',
      period: 'per month after trial',
      highlight: true,
      badge: 'Most Popular',
      features: ['4 video reels per month', 'Banner on all portals', 'Priority placement', 'Advanced analytics', 'Dedicated account manager'],
      cta: 'Start Free Trial',
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      price: '$299',
      period: 'per month',
      highlight: false,
      badge: null,
      features: ['Unlimited reels', 'Homepage feature', 'Custom campaign builds', 'Full analytics suite', 'Same-day support'],
      cta: 'Contact Us',
    },
  ];

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">

      {/* ── HERO ──────────────────────────────────────────────────────────── */}
      <section className="relative pt-28 pb-24 px-4 overflow-hidden">
        <div className="absolute inset-0">
          <img src="https://images.unsplash.com/photo-1557804506-669a67965ba0?w=1200&q=80" alt="" className="w-full h-full object-cover opacity-10" />
          <div className="absolute inset-0 bg-gradient-to-b from-[#0A0A0A]/60 via-[#0A0A0A]/80 to-[#0A0A0A]" />
        </div>

        <div className="relative z-10 flex justify-center">
        <div className="w-full max-w-5xl text-center">
          <img src={phoenixLogo} alt="Black Phoenix" className="w-16 h-16 object-contain mx-auto mb-6 opacity-90" />

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <span className="inline-block px-4 py-1.5 bg-yellow-600/20 border border-yellow-500/40 text-yellow-300 text-sm font-semibold rounded-full mb-5">
              🔥 Founding Advertiser Spots — First 6 Months Free
            </span>

            <h1 className="text-5xl md:text-7xl font-black text-white mb-5 leading-tight">
              Put Your Brand<br />
              <span className="bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent">In Front of the Right People</span>
            </h1>

            <p className="text-xl text-gray-300 max-w-2xl mx-auto mb-4 leading-relaxed">
              Black Phoenix connects you to an audience of homeowners, contractors, property managers, and investors — people who are actively spending money on home improvement and construction right now.
            </p>
            <p className="text-gray-500 text-sm max-w-xl mx-auto mb-10">
              We're building our advertiser network from the ground up. Brands who join now lock in the best rates and first-mover visibility.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button onClick={() => document.getElementById('plans')?.scrollIntoView({ behavior: 'smooth' })}
                className="flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 text-white font-bold text-lg rounded-xl transition shadow-xl shadow-yellow-500/20">
                See Advertising Plans <ArrowRight className="w-5 h-5" />
              </button>
              <button onClick={() => document.getElementById('audience')?.scrollIntoView({ behavior: 'smooth' })}
                className="flex items-center justify-center gap-2 px-8 py-4 bg-white/5 hover:bg-white/10 border border-white/20 text-white font-semibold text-lg rounded-xl transition">
                Who Sees Your Ads <ChevronDown className="w-5 h-5" />
              </button>
            </div>
          </motion.div>
        </div>
        </div>
      </section>

      {/* ── AUDIENCE ──────────────────────────────────────────────────────── */}
      <section id="audience" className="py-16 px-4 flex justify-center bg-[#111]">
        <div className="w-full max-w-6xl">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-white mb-3">Who Sees Your Brand</h2>
            <p className="text-gray-400">A highly targeted audience of active buyers — not casual browsers</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
            {AUDIENCE.map((a, i) => {
              const Icon = a.icon;
              return (
                <motion.div key={i} initial={{ opacity: 0, y: 15 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }} viewport={{ once: true }}
                  className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-5 text-center">
                  <Icon className={`w-8 h-8 ${a.color} mx-auto mb-3`} />
                  <p className="font-bold text-white mb-1">{a.label}</p>
                  <p className="text-xs text-gray-500 leading-relaxed">{a.desc}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── WHY ADVERTISE HERE ────────────────────────────────────────────── */}
      <section className="py-16 px-4 flex justify-center">
        <div className="w-full max-w-6xl">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-white mb-3">Why Advertise on Black Phoenix</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              { icon: Target, title: 'Intent-Based Audience', desc: 'Every visitor is here because they need home or construction services. Your ad reaches people actively making purchase decisions.' },
              { icon: TrendingUp, title: 'First-Mover Advantage', desc: "We're building our advertiser network now. Early brands get the best placement and lowest rates — permanently locked in as we grow." },
              { icon: BarChart3, title: 'Real Performance Data', desc: 'See impressions, clicks, and engagement for every campaign. No black boxes.' },
              { icon: Zap, title: 'Fast Setup', desc: "Submit your assets, we handle placement. Your ad can be live within 24 hours of approval." },
              { icon: Users, title: 'Cross-Portal Reach', desc: 'Ads appear across customer dashboards, contractor portals, and our public landing pages — one campaign, maximum visibility.' },
              { icon: Award, title: 'Founding Partner Badge', desc: "Brands who join now get recognized as founding advertising partners on our platform — a permanent mark of your early commitment." },
            ].map((w, i) => {
              const Icon = w.icon;
              return (
                <motion.div key={i} initial={{ opacity: 0, y: 15 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }} viewport={{ once: true }}
                  className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-6 hover:border-yellow-500/30 transition">
                  <div className="w-10 h-10 rounded-xl bg-yellow-500/20 flex items-center justify-center mb-4">
                    <Icon className="w-5 h-5 text-yellow-400" />
                  </div>
                  <h3 className="font-bold text-white mb-2">{w.title}</h3>
                  <p className="text-gray-400 text-sm leading-relaxed">{w.desc}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── AD FORMATS ────────────────────────────────────────────────────── */}
      <section className="py-16 px-4 flex justify-center bg-[#111]">
        <div className="w-full max-w-5xl">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-white mb-3">Advertising Formats</h2>
            <p className="text-gray-400">Multiple ways to reach our audience — you choose what fits your brand</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {FORMATS.map((f, i) => {
              const Icon = f.icon;
              return (
                <motion.div key={i} initial={{ opacity: 0, x: i % 2 === 0 ? -15 : 15 }} whileInView={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }} viewport={{ once: true }}
                  className="flex gap-4 bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-5 hover:border-yellow-500/30 transition">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-yellow-500/20 to-orange-500/20 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-6 h-6 text-yellow-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-bold text-white">{f.title}</h3>
                      {f.badge && <span className="text-[10px] px-2 py-0.5 bg-yellow-500 text-black font-bold rounded-full">{f.badge}</span>}
                    </div>
                    <p className="text-sm text-gray-400 leading-relaxed">{f.desc}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── PLANS ─────────────────────────────────────────────────────────── */}
      <section id="plans" className="py-20 px-4 flex justify-center">
        <div className="w-full max-w-5xl">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-white mb-3">Advertising Plans</h2>
            <p className="text-gray-400 text-lg">Start free. Upgrade when you see results.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-10">
            {PLANS.map((plan, i) => (
              <motion.div key={plan.id} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} viewport={{ once: true }}
                onClick={() => setSelectedPlan(selectedPlan === plan.id ? null : plan.id)}
                className={`relative cursor-pointer rounded-2xl p-6 flex flex-col transition-all duration-200 border-2 ${
                  selectedPlan === plan.id
                    ? 'bg-yellow-500/10 border-yellow-500 scale-[1.02] shadow-xl shadow-yellow-500/20'
                    : plan.highlight
                    ? 'bg-[#1A1A1A] border-yellow-500/50 hover:border-yellow-500'
                    : 'bg-[#1A1A1A] border-[#2A2A2A] hover:border-gray-600'
                }`}
              >
                {plan.badge && (
                  <span className={`absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 text-xs font-bold rounded-full whitespace-nowrap ${plan.highlight ? 'bg-yellow-500 text-black' : 'bg-orange-600 text-white'}`}>
                    {plan.badge}
                  </span>
                )}

                <div className="mb-5">
                  <p className="font-bold text-white text-lg mb-1">{plan.name}</p>
                  <div className="flex items-baseline gap-1">
                    <span className={`text-4xl font-black ${plan.price === 'FREE' ? 'text-green-400' : 'text-white'}`}>{plan.price}</span>
                    <span className="text-gray-500 text-sm">{plan.period}</span>
                  </div>
                </div>

                <ul className="space-y-2 flex-1 mb-6">
                  {plan.features.map(f => (
                    <li key={f} className="flex items-center gap-2 text-sm text-gray-300">
                      <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>

                {selectedPlan === plan.id && (
                  <div className="flex items-center gap-1 text-xs text-yellow-400 font-semibold mb-3">
                    <CheckCircle className="w-3.5 h-3.5" /> Selected
                  </div>
                )}
              </motion.div>
            ))}
          </div>

          {/* CTA */}
          <motion.div className={`rounded-2xl p-8 text-center transition-all duration-300 ${selectedPlan ? 'bg-gradient-to-r from-yellow-600/20 to-orange-600/20 border-2 border-yellow-500/50' : 'bg-[#1A1A1A] border-2 border-[#2A2A2A]'}`}>
            {selectedPlan ? (
              <>
                <div className="flex items-center justify-center gap-2 mb-3">
                  <CheckCircle className="w-5 h-5 text-green-400" />
                  <span className="text-green-400 font-semibold">{PLANS.find(p => p.id === selectedPlan)?.name} plan selected</span>
                </div>
                <h3 className="text-2xl font-bold text-white mb-3">Ready to Start?</h3>
                <p className="text-gray-400 mb-7 max-w-lg mx-auto">Create your account to set up your advertiser profile. We'll walk you through the rest.</p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <button onClick={() => go('signup')}
                    className="flex items-center justify-center gap-2 px-10 py-5 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 text-white font-black text-xl rounded-xl transition shadow-2xl shadow-yellow-500/30">
                    Create Your Free Account <ArrowRight className="w-6 h-6" />
                  </button>
                  <button onClick={() => go('advertiser-application')}
                    className="flex items-center justify-center gap-2 px-8 py-5 bg-white/5 hover:bg-white/10 border border-white/20 text-white font-semibold text-lg rounded-xl transition">
                    Submit Application
                  </button>
                </div>
                <p className="text-xs text-gray-600 mt-4">No credit card required · Free trial available · Cancel anytime</p>
              </>
            ) : (
              <>
                <p className="text-gray-500 text-lg mb-2">← Select a plan above</p>
                <p className="text-gray-600 text-sm">Or create an account directly to explore</p>
                <button onClick={() => go('signup')} className="mt-4 flex items-center justify-center gap-2 px-8 py-3 bg-white/5 border border-white/20 text-white font-semibold rounded-xl transition hover:bg-white/10 mx-auto">
                  Get Started <ArrowRight className="w-4 h-4" />
                </button>
              </>
            )}
          </motion.div>
        </div>
      </section>

      {/* ── FOOTER CTA ────────────────────────────────────────────────────── */}
      <section className="py-14 px-4 flex justify-center bg-[#111]">
        <div className="w-full max-w-3xl text-center">
          <h3 className="text-2xl font-bold text-white mb-3">Questions About Advertising With Us?</h3>
          <p className="text-gray-400 mb-6 text-sm">We'd rather have an honest conversation than oversell. Reach out and we'll tell you exactly what to expect.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button onClick={() => go('signup')} className="flex items-center justify-center gap-2 px-7 py-3.5 bg-yellow-500 hover:bg-yellow-400 text-black font-bold rounded-xl transition">
              Create Account <ArrowRight className="w-4 h-4" />
            </button>
            <a href="mailto:advertise@theblackphoenixcompany.com" className="flex items-center justify-center gap-2 px-7 py-3.5 bg-white/5 border border-white/20 text-white font-semibold rounded-xl transition hover:bg-white/10">
              Email Us
            </a>
          </div>
        </div>
      </section>

    </div>
  );
}
