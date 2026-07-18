/**
 * JoinUsHub — "Create an Account" chooser.
 *
 * Landing screen where prospective partners pick how they want to join:
 * Subcontractor, Vendor, Advertiser, Service Provider, Investor, or Customer.
 * Each card routes to the matching application / signup flow.
 *
 * Styled to match the futuristic CTA boxes on the Directory landing page,
 * but with a green "join / grow" accent.
 */
import { motion } from 'motion/react';
import {
  Briefcase, Store, Megaphone, Wrench, TrendingUp, UserPlus,
  ArrowRight, ArrowLeft, ShieldCheck,
} from 'lucide-react';

interface JoinUsHubProps {
  onNavigate?: (page: string) => void;
}

const OPTIONS = [
  {
    id: 'subcontractor',
    route: 'subcontractor-application',
    icon: Briefcase,
    label: 'Join as a Sub',
    tag: 'Subcontractors · Trades · Crews',
    desc: 'Get matched to jobs, submit bids, and get paid fast on projects in your area.',
    chips: ['Steady Work', 'Fast Pay', 'Local Jobs'],
  },
  {
    id: 'vendor',
    route: 'vendor-application',
    icon: Store,
    label: 'Become a Vendor',
    tag: 'Suppliers · Products · Materials',
    desc: 'List your products in our store and reach thousands of customers and pros.',
    chips: ['Sell More', 'Zero Setup', 'Reach Pros'],
  },
  {
    id: 'advertiser',
    route: 'advertiser-application',
    icon: Megaphone,
    label: 'Advertise With Us',
    tag: 'Brands · Local Business · Sponsors',
    desc: 'Put your brand in front of a high-intent local audience across our network.',
    chips: ['Targeted', 'Local Reach', 'Flexible'],
  },
  {
    id: 'service-provider',
    route: 'service-provider-application',
    icon: Wrench,
    label: 'Offer a Service',
    tag: 'Service Pros · Contractors · Specialists',
    desc: 'Join our contractor network and receive qualified leads and work requests.',
    chips: ['Qualified Leads', 'Grow', 'Trusted'],
  },
  {
    id: 'investor',
    route: 'investment-opportunities',
    icon: TrendingUp,
    label: 'Invest With Us',
    tag: 'Investors · Partners · Growth',
    desc: 'Explore investment opportunities and grow alongside The Black Phoenix Company.',
    chips: ['Opportunities', 'Growth', 'Partnership'],
  },
  {
    id: 'customer',
    route: 'signup',
    icon: UserPlus,
    label: 'Create a Customer Account',
    tag: 'Shoppers · Homeowners · Members',
    desc: 'Shop the store, request work, earn rewards, and track everything in one place.',
    chips: ['Rewards', 'Fast Checkout', 'Track Jobs'],
  },
];

const GREEN = '#22c55e';

export default function JoinUsHub({ onNavigate }: JoinUsHubProps) {
  const go = (page: string) => {
    if (onNavigate) onNavigate(page);
    else window.location.href = `/${page}`;
  };

  return (
    <div className="min-h-screen w-full bg-[#050505] text-white">
      <style>{`
        @keyframes joinGridFloat {
          0%, 100% { opacity: 0.04; transform: translateY(0px); }
          50% { opacity: 0.09; transform: translateY(-6px); }
        }
        @keyframes joinCorner { 0%, 100% { opacity: 0.6; } 50% { opacity: 1; } }
        .join-grid { animation: joinGridFloat 4s ease-in-out infinite; }
        .join-corner { animation: joinCorner 2s ease-in-out infinite; }
      `}</style>

      <div className="max-w-6xl mx-auto px-4 py-10">
        {/* Back */}
        <button
          onClick={() => go('directory-landing-page')}
          className="mb-6 flex items-center gap-2 text-gray-400 hover:text-white transition"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        {/* Header */}
        <div className="text-center mb-10">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="h-px w-16 bg-gradient-to-r from-transparent to-green-500/40" />
            <span className="text-[10px] font-black tracking-[0.25em] uppercase" style={{ color: GREEN }}>
              Join The Network
            </span>
            <div className="h-px w-16 bg-gradient-to-l from-transparent to-green-500/40" />
          </div>
          <h1 className="text-4xl sm:text-5xl font-black text-white"
            style={{ textShadow: '0 0 40px rgba(34,197,94,0.35)' }}>
            Create an Account
          </h1>
          <p className="text-gray-400 mt-3 max-w-xl mx-auto">
            Choose how you want to join The Black Phoenix Company — subs, vendors,
            advertisers, service providers, investors, and customers all start here.
          </p>
        </div>

        {/* Option grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {OPTIONS.map((opt, i) => {
            const Icon = opt.icon;
            return (
              <motion.button
                key={opt.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: i * 0.07 }}
                onClick={() => go(opt.route)}
                className="group relative overflow-hidden text-left"
                style={{
                  borderRadius: '16px',
                  background: 'linear-gradient(135deg, #0a0a0a 0%, #021206 50%, #0a0a0a 100%)',
                  border: '1px solid rgba(34,197,94,0.35)',
                  boxShadow: 'inset 0 0 60px rgba(34,197,94,0.04)',
                  transition: 'box-shadow 0.4s ease',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.boxShadow =
                    '0 0 55px rgba(34,197,94,0.22), 0 0 110px rgba(34,197,94,0.08), inset 0 0 60px rgba(34,197,94,0.08)';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.boxShadow = 'inset 0 0 60px rgba(34,197,94,0.04)';
                }}
              >
                {/* Animated grid bg */}
                <div className="join-grid absolute inset-0 pointer-events-none"
                  style={{
                    backgroundImage:
                      'linear-gradient(rgba(34,197,94,1) 1px, transparent 1px), linear-gradient(90deg, rgba(34,197,94,1) 1px, transparent 1px)',
                    backgroundSize: '40px 40px',
                    opacity: 0.05,
                    animationDelay: `${i * 0.4}s`,
                  }} />

                {/* Corner brackets */}
                <div className="join-corner absolute top-3 left-3 w-4 h-4 pointer-events-none"
                  style={{ borderTop: `2px solid ${GREEN}`, borderLeft: `2px solid ${GREEN}` }} />
                <div className="join-corner absolute bottom-3 right-3 w-4 h-4 pointer-events-none"
                  style={{ borderBottom: `2px solid ${GREEN}`, borderRight: `2px solid ${GREEN}`, animationDelay: '1s' }} />

                {/* Diagonal accent slash */}
                <div className="absolute -right-8 top-0 bottom-0 w-32 pointer-events-none"
                  style={{
                    background:
                      'linear-gradient(135deg, transparent 40%, rgba(34,197,94,0.08) 40%, rgba(34,197,94,0.12) 60%, transparent 60%)',
                    transform: 'skewX(-8deg)',
                  }} />

                {/* Content */}
                <div className="relative z-10 p-6">
                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{
                        background: 'linear-gradient(135deg, rgba(34,197,94,0.2), rgba(34,197,94,0.05))',
                        border: '1px solid rgba(34,197,94,0.4)',
                      }}>
                      <Icon className="w-7 h-7 group-hover:scale-110 transition-transform duration-300"
                        style={{ color: GREEN }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h2 className="text-xl font-black text-white leading-tight">{opt.label}</h2>
                      <p className="text-[11px] font-mono tracking-widest uppercase mt-1"
                        style={{ color: 'rgba(34,197,94,0.8)' }}>
                        {opt.tag}
                      </p>
                    </div>
                  </div>

                  <p className="text-gray-300 text-sm leading-relaxed mb-4">{opt.desc}</p>

                  <div className="flex flex-wrap gap-2 mb-5">
                    {opt.chips.map(c => (
                      <span key={c} className="text-[11px] font-semibold px-2.5 py-1 rounded-md"
                        style={{
                          color: '#86efac',
                          background: 'rgba(34,197,94,0.1)',
                          border: '1px solid rgba(34,197,94,0.2)',
                        }}>
                        {c}
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center justify-between pt-3"
                    style={{ borderTop: '1px solid rgba(34,197,94,0.2)' }}>
                    <span className="text-xs font-mono tracking-widest" style={{ color: 'rgba(34,197,94,0.6)' }}>
                      [ GET STARTED ]
                    </span>
                    <div className="flex items-center gap-2 px-4 py-2 rounded-lg font-black text-sm text-black group-hover:gap-3 transition-all"
                      style={{ background: 'linear-gradient(90deg, #16a34a, #22c55e)' }}>
                      Continue
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </div>
              </motion.button>
            );
          })}
        </div>

        {/* Footer note */}
        <div className="mt-10 text-center">
          <div className="inline-flex items-center gap-2 text-sm text-gray-500">
            <ShieldCheck className="w-4 h-4" style={{ color: GREEN }} />
            <span>Free to apply · Secure onboarding · No commitment</span>
          </div>
        </div>
      </div>
    </div>
  );
}
