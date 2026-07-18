/**
 * Contractor Network Landing Page
 * Sells the offering → Choose Your Path → Create Account
 */

import { useState } from 'react';
import { motion } from 'motion/react';
import {
  Users, ArrowRight, CheckCircle, Star, TrendingUp, DollarSign,
  HardHat, ShoppingBag, Briefcase, Megaphone, Shield, Clock,
  Zap, Award, BarChart3, Headphones, ChevronDown, MapPin
} from 'lucide-react';
import phoenixLogo from '../../imports/BPB_phoenix_full_color_logo.png';

interface Props { onNavigate?: (page: string) => void; }

export default function ContractorNetworkLandingPage({ onNavigate }: Props) {
  const [selectedPath, setSelectedPath] = useState<string | null>(null);

  const go = (page: string) => onNavigate ? onNavigate(page) : (window.location.href = `/${page}`);

  const PATHS = [
    {
      id: 'subcontractor',
      title: 'Subcontractor',
      subtitle: 'Skilled trade & construction',
      icon: HardHat,
      color: 'from-blue-600 to-cyan-600',
      border: 'border-blue-500',
      bg: 'bg-blue-500/10',
      textColor: 'text-blue-400',
      badge: 'Most Popular',
      desc: 'Electricians, plumbers, carpenters, HVAC techs — join our project pipeline and get steady, paid work.',
      apply: 'subcontractor-application',
    },
    {
      id: 'vendor',
      title: 'Vendor / Supplier',
      subtitle: 'Materials, tools & products',
      icon: ShoppingBag,
      color: 'from-green-600 to-emerald-600',
      border: 'border-green-500',
      bg: 'bg-green-500/10',
      textColor: 'text-green-400',
      badge: null,
      desc: 'Supply materials and products to Black Phoenix projects. Net-30 terms, volume orders, long-term partnerships.',
      apply: 'vendor-application',
    },
    {
      id: 'service-provider',
      title: 'Service Provider',
      subtitle: 'Design, consulting & expertise',
      icon: Briefcase,
      color: 'from-orange-600 to-amber-600',
      border: 'border-orange-500',
      bg: 'bg-orange-500/10',
      textColor: 'text-orange-400',
      badge: null,
      desc: 'Architects, designers, inspectors, permit specialists. Work on premium projects with guaranteed compensation.',
      apply: 'service-provider-application',
    },
    {
      id: 'advertiser',
      title: 'Advertiser',
      subtitle: 'Reach our active customer base',
      icon: Megaphone,
      color: 'from-purple-600 to-pink-600',
      border: 'border-purple-500',
      bg: 'bg-purple-500/10',
      textColor: 'text-purple-400',
      badge: '6 months FREE',
      desc: 'Promote your brand to our homeowners, investors and property managers. First 6 months completely free.',
      apply: 'advertiser-application',
    },
    {
      id: 'territory',
      title: 'Territory Partner',
      subtitle: 'Own your region',
      icon: MapPin,
      color: 'from-cyan-600 to-blue-600',
      border: 'border-cyan-500',
      bg: 'bg-cyan-500/10',
      textColor: 'text-cyan-400',
      badge: 'Own It',
      desc: 'Operate your own Black Phoenix territory. You manage your customers, subcontractors, and subscriptions — we handle the platform.',
      apply: 'territory-application',
    },
  ];

  const STATS = [
    { value: 'Early', label: 'Access to every new project', icon: Zap },
    { value: 'Net-30', label: 'Clear, reliable payment terms', icon: DollarSign },
    { value: 'Zero', label: 'Hidden fees or gotchas', icon: Shield },
    { value: 'Real', label: 'Human support — not bots', icon: Headphones },
  ];

  const WHY = [
    { icon: DollarSign, title: 'Clear Payment Terms', desc: 'Every project is invoiced with defined payment terms upfront. No surprises, no chasing.' },
    { icon: TrendingUp, title: 'Growing Opportunity', desc: "We're actively expanding our customer base. Partners who join early get first access to every new project that comes in." },
    { icon: Shield, title: 'Legitimate, Organized Jobs', desc: 'All work comes with proper scope, timeline, and documentation. We run a professional operation.' },
    { icon: Zap, title: 'Quick to Get Started', desc: 'Submit your application, we review it personally, and get you set up as fast as possible.' },
    { icon: Headphones, title: 'Real Communication', desc: 'You get a direct line to a real person on our team — not an automated ticket system.' },
    { icon: Award, title: 'Your Work Gets Seen', desc: "Completed projects are featured in our gallery and referenced in future bids. Your reputation grows with ours." },
  ];

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">

      {/* ── HERO ──────────────────────────────────────────────────────────── */}
      <section className="relative pt-28 pb-24 px-4 overflow-hidden flex justify-center">
        <div className="absolute inset-0">
          <img src="https://images.unsplash.com/photo-1521791136064-7986c2920216?w=1200&q=80" alt="" className="w-full h-full object-cover opacity-15" />
          <div className="absolute inset-0 bg-gradient-to-b from-[#0A0A0A]/80 via-[#0A0A0A]/90 to-[#0A0A0A]" />
        </div>

        <div className="relative z-10 w-full max-w-4xl text-center">
          <img src={phoenixLogo} alt="Black Phoenix" className="w-20 h-20 object-contain mx-auto mb-6 opacity-90" />

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <span className="inline-block px-4 py-1.5 bg-orange-600/20 border border-orange-500/40 text-orange-300 text-sm font-semibold rounded-full mb-5">
              🚀 Founding Member Spots — Limited Availability
            </span>
            <h1 className="text-5xl md:text-7xl font-black text-white mb-6 leading-tight">
              Get In Early.<br />
              <span className="bg-gradient-to-r from-orange-400 to-red-400 bg-clip-text text-transparent">Grow With Black Phoenix.</span>
            </h1>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto mb-6 leading-relaxed">
              We're building something big — and we're handpicking the partners who'll grow with us. Join as a subcontractor, vendor, service provider, advertiser, or <strong className="text-cyan-400">own your own territory</strong>.
            </p>
            <p className="text-gray-500 max-w-xl mx-auto mb-10 text-sm">
              No fabricated numbers. No hype. Just an honest opportunity to partner with a company that's committed to doing things right from day one.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => document.getElementById('choose-path')?.scrollIntoView({ behavior: 'smooth' })}
                className="flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white font-bold text-lg rounded-xl transition shadow-xl shadow-orange-500/20"
              >
                Choose Your Path <ArrowRight className="w-5 h-5" />
              </button>
              <button
                onClick={() => document.getElementById('why-us')?.scrollIntoView({ behavior: 'smooth' })}
                className="flex items-center justify-center gap-2 px-8 py-4 bg-white/5 hover:bg-white/10 border border-white/20 text-white font-semibold text-lg rounded-xl transition"
              >
                Why Black Phoenix <ChevronDown className="w-5 h-5" />
              </button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── STATS ─────────────────────────────────────────────────────────── */}
      <section className="py-12 px-4 flex justify-center border-y border-[#2A2A2A] bg-[#111]">
        <div className="w-full max-w-5xl grid grid-cols-2 md:grid-cols-4 gap-6">
          {STATS.map((s, i) => {
            const Icon = s.icon;
            return (
              <motion.div key={i} initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }} viewport={{ once: true }} className="text-center">
                <Icon className="w-6 h-6 text-orange-400 mx-auto mb-2" />
                <p className="text-3xl font-black text-white">{s.value}</p>
                <p className="text-sm text-gray-500 mt-1">{s.label}</p>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* ── WHY JOIN ──────────────────────────────────────────────────────── */}
      <section id="why-us" className="py-20 px-4 flex justify-center">
        <div className="w-full max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-white mb-3">What We're Building — And What You Get</h2>
            <p className="text-gray-400 text-lg">We're honest about where we are and serious about where we're going</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {WHY.map((w, i) => {
              const Icon = w.icon;
              return (
                <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }} viewport={{ once: true }}
                  className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-6 hover:border-orange-500/30 transition">
                  <div className="w-12 h-12 rounded-xl bg-orange-500/20 flex items-center justify-center mb-4">
                    <Icon className="w-6 h-6 text-orange-400" />
                  </div>
                  <h3 className="font-bold text-white text-lg mb-2">{w.title}</h3>
                  <p className="text-gray-400 text-sm leading-relaxed">{w.desc}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ──────────────────────────────────────────────────── */}
      {/* Early Adopter Value Pitch */}
      <section className="py-14 px-4 flex justify-center bg-[#111]">
        <div className="w-full max-w-5xl">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold text-white mb-3">Why Join Now — Before We Scale?</h2>
            <p className="text-gray-400 max-w-2xl mx-auto text-sm">The best time to partner with a growing company is before everyone else knows about it</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              {
                icon: '🥇',
                title: 'Founding Partner Status',
                desc: "Partners who join early get recognized as founding members. As we grow, that relationship matters — you'll have priority access to the best projects.",
              },
              {
                icon: '📉',
                title: 'Lower Competition Now',
                desc: "Right now there are fewer contractors in our network, which means more work per partner. As we grow the customer side, early partners benefit most.",
              },
              {
                icon: '🤝',
                title: 'Shape How We Work',
                desc: "Early partners have real influence over how we structure projects, payments, and processes. You're not just a vendor — you're helping build something.",
              },
              {
                icon: '🗺️',
                title: 'Own a Territory',
                desc: "Territory Partners get exclusive rights to manage their own region — their customers, their subcontractors, their subscriptions. The platform does the heavy lifting.",
              },
            ].map((c, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} viewport={{ once: true }}
                className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-6">
                <span className="text-3xl mb-4 block">{c.icon}</span>
                <h3 className="font-bold text-white mb-2">{c.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{c.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CHOOSE YOUR PATH ──────────────────────────────────────────────── */}
      <section id="choose-path" className="py-20 px-4 flex justify-center">
        <div className="w-full max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">Choose Your Path</h2>
            <p className="text-gray-400 text-lg">Select how you want to partner with us — then create your account</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-5 mb-10">
            {PATHS.map((path, i) => {
              const Icon = path.icon;
              const isSelected = selectedPath === path.id;
              return (
                <motion.button
                  key={path.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08 }}
                  viewport={{ once: true }}
                  onClick={() => setSelectedPath(isSelected ? null : path.id)}
                  className={`relative text-left p-6 rounded-2xl border-2 transition-all duration-200 flex flex-col ${
                    isSelected
                      ? `${path.bg} ${path.border} scale-[1.02] shadow-xl`
                      : 'bg-[#1A1A1A] border-[#2A2A2A] hover:border-gray-600'
                  }`}
                >
                  {path.badge && (
                    <span className={`absolute -top-3 left-4 px-3 py-0.5 bg-gradient-to-r ${path.color} text-white text-xs font-bold rounded-full`}>
                      {path.badge}
                    </span>
                  )}

                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${path.color} flex items-center justify-center mb-4 shadow-lg`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>

                  <h3 className="font-bold text-white text-lg mb-0.5">{path.title}</h3>
                  <p className={`text-xs font-semibold mb-3 ${path.textColor}`}>{path.subtitle}</p>
                  <p className="text-sm text-gray-400 leading-relaxed flex-1">{path.desc}</p>

                  {isSelected && (
                    <div className="mt-4 flex items-center gap-1.5 text-xs font-semibold text-green-400">
                      <CheckCircle className="w-4 h-4" /> Selected
                    </div>
                  )}
                </motion.button>
              );
            })}
          </div>

          {/* Create Account CTA */}
          <motion.div
            className={`rounded-2xl p-8 text-center transition-all duration-300 ${
              selectedPath
                ? 'bg-gradient-to-r from-orange-600/20 to-red-600/20 border-2 border-orange-500/50'
                : 'bg-[#1A1A1A] border-2 border-[#2A2A2A]'
            }`}
          >
            {selectedPath ? (
              <>
                <div className="flex items-center justify-center gap-2 mb-3">
                  <CheckCircle className="w-6 h-6 text-green-400" />
                  <span className="text-green-400 font-semibold">
                    {PATHS.find(p => p.id === selectedPath)?.title} selected
                  </span>
                </div>
                <h3 className="text-3xl font-bold text-white mb-3">Ready to Get Started?</h3>
                <p className="text-gray-400 mb-8 max-w-xl mx-auto">
                  Create your free account now. You'll be able to set up your profile, connect with projects, and start earning.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <button
                    onClick={() => go(PATHS.find(p => p.id === selectedPath)?.apply || 'signup')}
                    className="flex items-center justify-center gap-2 px-10 py-5 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white font-black text-xl rounded-xl transition shadow-2xl shadow-orange-500/30 hover:shadow-orange-500/50"
                  >
                    Create Your Free Account <ArrowRight className="w-6 h-6" />
                  </button>
                  <button
                    onClick={() => go('signup')}
                    className="flex items-center justify-center gap-2 px-8 py-5 bg-white/5 hover:bg-white/10 border border-white/20 text-white font-semibold text-lg rounded-xl transition"
                  >
                    Already have an account? Sign In
                  </button>
                </div>
                <p className="text-xs text-gray-600 mt-4">No credit card required · Free to join · Cancel anytime</p>
              </>
            ) : (
              <>
                <p className="text-gray-500 text-lg mb-2">← Select a path above to get started</p>
                <p className="text-gray-600 text-sm">Or create an account directly if you already know what you need</p>
                <button
                  onClick={() => go('signup')}
                  className="mt-5 flex items-center justify-center gap-2 px-8 py-4 bg-white/5 hover:bg-white/10 border border-white/20 text-white font-semibold rounded-xl transition mx-auto"
                >
                  Create Account <ArrowRight className="w-4 h-4" />
                </button>
              </>
            )}
          </motion.div>
        </div>
      </section>

      {/* ── FINAL CTA ─────────────────────────────────────────────────────── */}
      <section className="py-16 px-4 flex justify-center bg-gradient-to-b from-[#111] to-[#0A0A0A]">
        <div className="w-full max-w-3xl text-center">
          <h3 className="text-3xl font-bold text-white mb-4">We'd Rather Earn Your Trust Than Oversell</h3>
          <p className="text-gray-400 mb-6 max-w-xl mx-auto">If you have questions about what we can and can't offer right now, just ask. Honest answer guaranteed.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button onClick={() => go(PATHS.find(p => p.id === selectedPath)?.apply || 'subcontractor-application')} className="flex items-center justify-center gap-2 px-8 py-4 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-xl transition">
              Create Account <ArrowRight className="w-4 h-4" />
            </button>
            <a href="mailto:info@theblackphoenixcompany.com" className="flex items-center justify-center gap-2 px-8 py-4 bg-white/5 hover:bg-white/10 border border-white/20 text-white font-semibold rounded-xl transition">
              Contact Us
            </a>
          </div>
        </div>
      </section>

    </div>
  );
}
