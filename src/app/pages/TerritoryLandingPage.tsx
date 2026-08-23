/**
 * Territory Partners Landing Page
 * Franchise & Expansion Opportunities
 */

import { motion } from 'motion/react';
import {
  Map, ArrowRight, CheckCircle, DollarSign, Users, TrendingUp,
  Building2, Award, BookOpen, HeartHandshake, Target, Zap,
  Phone, Mail, Calendar, Star, Shield, Briefcase, Home,
  LayoutDashboard, ClipboardList, Wrench, BarChart3, MessageSquare,
  Bell, Package, Megaphone, FileText, CreditCard, Globe, Settings
} from 'lucide-react';

interface TerritoryLandingPageProps {
  onNavigate?: (page: string) => void;
}

export default function TerritoryLandingPage({ onNavigate }: TerritoryLandingPageProps) {
  console.log('🗺️ [TerritoryLandingPage] Component mounting/rendering');
  console.log('🗺️ [TerritoryLandingPage] onNavigate prop:', typeof onNavigate, onNavigate ? '✓ present' : '✗ missing');

  const handleNavigate = (page: string) => {
    console.log('🔄 [TerritoryLandingPage] handleNavigate called with page:', page);
    if (onNavigate) {
      console.log('✓ [TerritoryLandingPage] Calling onNavigate prop');
      onNavigate(page);
    } else {
      console.error('✗ [TerritoryLandingPage] onNavigate prop is missing!');
      // Fallback to window.location if onNavigate is not provided
      window.location.href = `/${page}`;
    }
  };

  const handleApply = () => {
    console.log('💰 [TerritoryLandingPage] Apply button clicked');
    handleNavigate('territory-application');
  };

  const benefits = [
    {
      icon: DollarSign,
      title: 'Proven Revenue Model',
      description: 'Our franchise partners average $500K-$2M in annual revenue with established territories',
      color: 'from-green-600 to-emerald-600'
    },
    {
      icon: Users,
      title: 'Exclusive Territory Rights',
      description: 'Protected geographic area with no competition from other Black Phoenix franchises',
      color: 'from-blue-600 to-cyan-600'
    },
    {
      icon: BookOpen,
      title: 'Comprehensive Training',
      description: 'Complete business training, operational systems, and ongoing support from day one',
      color: 'from-purple-600 to-indigo-600'
    },
    {
      icon: Zap,
      title: 'Turnkey Operations',
      description: 'Ready-to-go systems, software, branding, and marketing materials included',
      color: 'from-orange-600 to-red-600'
    },
    {
      icon: TrendingUp,
      title: 'Growth Support',
      description: 'Marketing, lead generation, and business development assistance from corporate',
      color: 'from-teal-600 to-green-600'
    },
    {
      icon: HeartHandshake,
      title: 'Partner Network',
      description: 'Join a community of successful territory owners sharing best practices',
      color: 'from-pink-600 to-rose-600'
    }
  ];

  const investmentBreakdown = [
    { item: 'Initial Franchise Fee', amount: '$50,000', description: 'One-time territory rights fee' },
    { item: 'Equipment & Tools', amount: '$30,000 - $50,000', description: 'Vehicles, tools, and initial inventory' },
    { item: 'Working Capital', amount: '$20,000 - $40,000', description: 'Operating expenses for first 3 months' },
    { item: 'Marketing Launch', amount: '$10,000 - $15,000', description: 'Grand opening and local marketing' }
  ];

  const supportServices = [
    { icon: Building2, title: 'Site Selection', description: 'Help choosing optimal territory location' },
    { icon: BookOpen, title: 'Training Program', description: '4-week comprehensive training' },
    { icon: Award, title: 'Brand Materials', description: 'Complete branding package included' },
    { icon: Target, title: 'Marketing Support', description: 'National and local marketing campaigns' },
    { icon: Phone, title: 'Dedicated Support', description: '24/7 franchise support hotline' },
    { icon: Briefcase, title: 'Business Software', description: 'CRM, scheduling, and management tools' }
  ];

  const stats = [
    { label: 'Average Revenue', value: '$850K', subtext: 'First Year' },
    { label: 'Territories Available', value: '47', subtext: 'Across 8 States' },
    { label: 'Partner Satisfaction', value: '96%', subtext: 'Would Recommend' },
    { label: 'ROI Timeline', value: '18-24', subtext: 'Months Average' }
  ];

  const testimonials = [
    {
      name: 'Michael Rodriguez',
      location: 'Portland Territory',
      quote: 'Best business decision I ever made. Corporate support is incredible and the systems are proven. Hit $1.2M in year two.',
      avatar: 'MR',
      rating: 5
    },
    {
      name: 'Sarah Chen',
      location: 'Austin Territory',
      quote: 'Coming from corporate America, I wanted to own my own business but with support. Black Phoenix delivered exactly that.',
      avatar: 'SC',
      rating: 5
    },
    {
      name: 'James Thompson',
      location: 'Denver Territory',
      quote: 'The training was thorough, the territory is protected, and the revenue potential exceeded my expectations.',
      avatar: 'JT',
      rating: 5
    }
  ];

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-4 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img
            src="https://images.unsplash.com/photo-1524661135-423995f22d0b?w=800&q=80"
            alt="Territory Partnership"
            className="w-full h-full object-cover opacity-20"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#0A0A0A] via-[#0A0A0A]/95 to-[#0A0A0A]" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-cyan-600 to-blue-600 mb-6">
                <Map className="w-10 h-10 text-white" />
              </div>

              <h1 className="text-5xl md:text-6xl font-bold mb-4 bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                Own Your Territory
              </h1>
              <p className="text-xl text-gray-300 mb-6">
                Franchise Opportunity with Black Phoenix
              </p>
              <p className="text-gray-400 leading-relaxed mb-8">
                Join our growing network of successful territory partners. Build your own construction and home services empire with our proven business model, comprehensive training, and ongoing support.
              </p>

              <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-cyan-400 flex-shrink-0" />
                  <span className="text-sm text-gray-300">Protected Territory</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-cyan-400 flex-shrink-0" />
                  <span className="text-sm text-gray-300">Proven Business Model</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-cyan-400 flex-shrink-0" />
                  <span className="text-sm text-gray-300">Complete Training</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-cyan-400 flex-shrink-0" />
                  <span className="text-sm text-gray-300">Ongoing Support</span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  onClick={handleApply}
                  className="flex-1 px-8 py-4 rounded-xl font-bold text-white bg-gradient-to-r from-cyan-600 to-blue-600 hover:shadow-lg hover:shadow-cyan-500/50 transition-all flex items-center justify-center gap-2 group"
                >
                  Apply Now
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </button>
                <button
                  onClick={() => handleNavigate('territory-portal')}
                  className="flex-1 px-8 py-4 rounded-xl font-bold text-white bg-white/10 hover:bg-white/20 border border-white/20 transition-all flex items-center justify-center gap-2"
                >
                  <Home className="w-5 h-5" />
                  Partner Portal
                </button>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-4">
              {stats.map((stat, index) => (
                <div key={index} className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-6 hover:border-cyan-500/50 transition-all">
                  <div className="text-3xl font-bold text-cyan-400 mb-2">{stat.value}</div>
                  <div className="text-white font-semibold mb-1">{stat.label}</div>
                  <div className="text-sm text-gray-400">{stat.subtext}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 px-4 bg-[#0A0A0A]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">Why Partner With Us?</h2>
            <p className="text-xl text-gray-400 max-w-3xl mx-auto">
              Everything you need to build a thriving construction and home services business
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {benefits.map((benefit, index) => {
              const Icon = benefit.icon;
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-8 hover:border-cyan-500/50 transition-all"
                >
                  <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${benefit.color} flex items-center justify-center mb-6`}>
                    <Icon className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-3">{benefit.title}</h3>
                  <p className="text-gray-400 leading-relaxed">{benefit.description}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Investment Breakdown */}
      <section className="py-20 px-4 flex justify-center">
        <div className="w-full max-w-5xl">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-white mb-4">Investment Overview</h2>
            <p className="text-gray-400 text-lg">Total investment range: $110,000 - $155,000</p>
          </div>

          <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-8 mx-auto">
            <div className="space-y-6">
              {investmentBreakdown.map((item, index) => (
                <div key={index} className="flex items-center justify-between pb-6 border-b border-[#2A2A2A] last:border-0 last:pb-0">
                  <div className="text-center flex-1">
                    <h4 className="text-lg font-bold text-white mb-1">{item.item}</h4>
                    <p className="text-sm text-gray-400">{item.description}</p>
                  </div>
                  <div className="text-xl font-bold text-cyan-400 whitespace-nowrap ml-8">{item.amount}</div>
                </div>
              ))}
            </div>

            <div className="mt-8 p-6 bg-cyan-600/10 border border-cyan-500/30 rounded-xl">
              <div className="flex items-start gap-4 justify-center">
                <DollarSign className="w-6 h-6 text-cyan-400 flex-shrink-0 mt-1" />
                <div className="text-center">
                  <h4 className="font-bold text-white mb-2">Investment & Payment Plans</h4>
                  <p className="text-sm text-gray-300">
                    We work directly with territory partners on flexible payment structures. Reach out to discuss options that fit your situation — we'd rather find a way to make it work than lose a great partner over upfront costs.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Support Services */}
      <section className="py-20 px-4 bg-[#0A0A0A]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">What You Get</h2>
            <p className="text-xl text-gray-400">Comprehensive support from day one</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {supportServices.map((service, index) => {
              const Icon = service.icon;
              return (
                <div key={index} className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6 hover:border-cyan-500/50 transition-all">
                  <Icon className="w-10 h-10 text-cyan-400 mb-4" />
                  <h4 className="font-bold text-white mb-2">{service.title}</h4>
                  <p className="text-sm text-gray-400">{service.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">Success Stories</h2>
            <p className="text-xl text-gray-400">Hear from our territory partners</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-6 hover:border-cyan-500/50 transition-all"
              >
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 fill-cyan-400 text-cyan-400" />
                  ))}
                </div>

                <p className="text-gray-300 mb-6">"{testimonial.quote}"</p>

                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-600 to-blue-600 flex items-center justify-center">
                    <span className="text-white font-bold">{testimonial.avatar}</span>
                  </div>
                  <div>
                    <div className="text-white font-semibold">{testimonial.name}</div>
                    <div className="text-gray-400 text-sm">{testimonial.location}</div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PLATFORM CAPABILITIES ─────────────────────────────────────────── */}
      <section className="py-20 px-4 flex justify-center bg-[#0A0A0A]">
        <div className="w-full max-w-6xl">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-500/10 border border-cyan-500/30 rounded-full mb-5">
              <Zap className="w-4 h-4 text-cyan-400" />
              <span className="text-cyan-300 text-sm font-bold uppercase tracking-widest">Inside the Platform</span>
            </div>
            <h2 className="text-4xl font-bold text-white mb-4">Everything a Territory Owner Can Do</h2>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">Your territory portal gives you real tools to run, grow, and manage your entire operation from one dashboard.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              {
                icon: LayoutDashboard,
                color: 'from-cyan-600 to-blue-600',
                title: 'Territory Command Center',
                items: ['Live revenue dashboard for your territory', 'Active jobs and project overview', 'Team performance at a glance', 'Real-time KPIs and growth metrics'],
              },
              {
                icon: Users,
                color: 'from-purple-600 to-indigo-600',
                title: 'Team & Crew Management',
                items: ['Add employees, assign roles and permissions', 'Schedule crews across multiple jobs', 'Track hours, overtime, and payroll data', 'Employee portal access for your whole team'],
              },
              {
                icon: ClipboardList,
                color: 'from-orange-600 to-red-600',
                title: 'Work Request Pipeline',
                items: ['Receive customer work requests instantly', 'Auto-generate AI quotes from requests', 'Drag-and-drop pipeline stages', 'Full before/after photo documentation'],
              },
              {
                icon: FileText,
                color: 'from-green-600 to-emerald-600',
                title: 'Quotes & Contracts',
                items: ['AI-powered quote generation with your labor rates', 'Send quotes via email with e-signature', 'Convert approved quotes to contracts', 'Automated 3-day and 7-day follow-up sequences'],
              },
              {
                icon: CreditCard,
                color: 'from-yellow-600 to-orange-600',
                title: 'Payments & Invoicing',
                items: ['Stripe-powered online payments and deposits', 'Invoice management and tracking', 'Payment history and reporting', 'Auto-trigger review requests after payment'],
              },
              {
                icon: Wrench,
                color: 'from-blue-600 to-cyan-600',
                title: 'Subcontractor Network',
                items: ['Build your own sub network under your territory', 'Assign jobs to subs and track progress', 'Manage sub applications and approvals', 'Shared Phoenix Exchange for project opportunities'],
              },
              {
                icon: Building2,
                color: 'from-teal-600 to-green-600',
                title: 'Vendor & Materials',
                items: ['Connect local vendors to your territory', 'Materials center with catalog management', 'Order tracking and supplier coordination', 'Integrate your own ecommerce store'],
              },
              {
                icon: BarChart3,
                color: 'from-rose-600 to-pink-600',
                title: 'Reporting & Analytics',
                items: ['Revenue trends by week, month, year', 'Job category performance breakdown', 'Customer acquisition and retention data', 'Export reports for accounting'],
              },
              {
                icon: MessageSquare,
                color: 'from-violet-600 to-purple-600',
                title: 'Customer Communication',
                items: ['In-app messaging with every customer', 'SMS and email notifications', 'Customer portal for work request status', 'Review management and response tools'],
              },
              {
                icon: Bell,
                color: 'from-red-600 to-orange-600',
                title: 'Admin Alerts & Approvals',
                items: ['Real-time push notifications for new requests', 'Tiered alerts: Work Requests → Applications → System', 'Approve/reject applications with one click', 'SMS alerts to your phone for urgent items'],
              },
              {
                icon: Megaphone,
                color: 'from-pink-600 to-rose-600',
                title: 'Marketing & Advertising',
                items: ['Post deals and promotions for your territory', 'Submit reels to the Black Phoenix landing page', 'Sponsor placement on the platform network', 'Before/after gallery for social proof'],
              },
              {
                icon: Globe,
                color: 'from-indigo-600 to-blue-600',
                title: 'Territory Growth Tools',
                items: ['Referral rewards program for your customers', 'Investment opportunity listings', 'Property manager partnerships', 'Emergency services on-call management'],
              },
            ].map(({ icon: Icon, color, title, items }) => (
              <motion.div
                key={title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4 }}
                className="bg-[#1A1A1A] border border-[#2A2A2A] hover:border-cyan-500/30 rounded-2xl p-6 transition-all"
              >
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center mb-4`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <h4 className="text-white font-bold text-base mb-3">{title}</h4>
                <ul className="space-y-1.5">
                  {items.map(item => (
                    <li key={item} className="flex items-start gap-2 text-sm text-gray-400">
                      <CheckCircle className="w-3.5 h-3.5 text-cyan-500 flex-shrink-0 mt-0.5" />
                      {item}
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>

          <div className="mt-10 text-center p-6 bg-cyan-600/5 border border-cyan-500/20 rounded-2xl">
            <p className="text-gray-400 text-sm">
              <span className="text-white font-semibold">Every tool listed above is live inside the platform today.</span> When you become a Territory Partner, you get full access from day one — no waiting, no hidden costs, no paying extra for features that should be standard.
            </p>
          </div>
        </div>
      </section>
      {/* ── END CAPABILITIES ──────────────────────────────────────────────── */}

      {/* CTA Section */}
      <section className="py-20 px-4 flex justify-center">
        <div className="w-full max-w-4xl">
          <div className="bg-gradient-to-r from-cyan-600/20 via-blue-600/20 to-indigo-600/20 border-2 border-cyan-500/30 rounded-2xl p-12 text-center">
            <h3 className="text-3xl md:text-4xl font-bold text-white mb-4">Ready to Own Your Territory?</h3>
            <p className="text-xl text-gray-300 mb-8">Join our network of successful franchise partners</p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
              <button
                onClick={handleApply}
                className="px-12 py-5 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-xl font-bold text-xl hover:from-cyan-500 hover:to-blue-500 transition-all shadow-2xl shadow-cyan-500/30 hover:shadow-cyan-500/50 flex items-center justify-center gap-3 group"
              >
                Apply for Territory
                <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>

            <div className="flex items-center justify-center gap-6 text-sm text-gray-400">
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4" />
                <span>(555) 123-4567</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4" />
                <span>territories@blackphoenix.com</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}