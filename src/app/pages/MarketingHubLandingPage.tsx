/**
 * Marketing Hub Landing Page
 * Promotions, Subscriptions, Special Offers & Giveaways
 */

import { useState } from 'react';
import { motion } from 'motion/react';
import {
  Gift, ArrowRight, CheckCircle, Sparkles, Tag, Package,
  Users, TrendingUp, Megaphone, Calendar, Star, Percent,
  Zap, Crown, Target, Trophy, Phone, Mail, User, Building2,
  Wrench, Building, Home, X
} from 'lucide-react';

interface MarketingHubLandingPageProps {
  onNavigate?: (page: string) => void;
}

interface SelectedPlan {
  name: string;
  price: string;
  hours?: string;
  cohortId: string;
  features: string[];
  gradient: string;
  category: string;
}

export default function MarketingHubLandingPage({ onNavigate }: MarketingHubLandingPageProps) {
  console.log('📢 [MarketingHubLandingPage] Component mounting/rendering');
  console.log('📢 [MarketingHubLandingPage] onNavigate prop:', typeof onNavigate, onNavigate ? '✓ present' : '✗ missing');
  const [selectedPlan, setSelectedPlan] = useState<SelectedPlan | null>(null);

  const handleNavigate = (page: string) => {
    console.log('🔄 [MarketingHubLandingPage] handleNavigate called with page:', page);
    if (onNavigate) {
      console.log('✓ [MarketingHubLandingPage] Calling onNavigate prop');
      onNavigate(page);
    } else {
      console.error('✗ [MarketingHubLandingPage] onNavigate prop is missing!');
      // Fallback to window.location if onNavigate is not provided
      window.location.href = `/${page}`;
    }
  };

  const handleGetStarted = () => {
    console.log('💰 [MarketingHubLandingPage] Get Started button clicked');
    handleNavigate('advertiser-application');
  };

  const handleViewPlanDetails = (plan: SelectedPlan) => {
    setSelectedPlan(plan);
  };

  const handleSignUp = (cohortId: string) => {
    // Store the selected cohort for signup
    localStorage.setItem('selected_cohort', cohortId);
    setSelectedPlan(null);
    handleNavigate('signup');
  };

  const handleSignIn = (cohortId: string) => {
    // Store the selected cohort for login
    localStorage.setItem('selected_cohort', cohortId);
    setSelectedPlan(null);
    handleNavigate('login');
  };

  // Construction Subscription Plans
  const constructionPlans = [
    {
      name: 'Basic Build',
      hours: '10 hrs/mo',
      price: '$999',
      cohortId: 'construction-basic',
      features: ['10 Build Hours/Month', 'Project Management', 'Material Sourcing', 'Progress Reports'],
      gradient: 'from-orange-600 to-red-600',
      popular: false
    },
    {
      name: 'Pro Build',
      hours: '25 hrs/mo',
      price: '$2,199',
      cohortId: 'construction-pro',
      features: ['25 Build Hours/Month', 'Priority Scheduling', 'Dedicated PM', 'Design Consultation', 'Material Discounts'],
      gradient: 'from-orange-600 to-red-600',
      popular: true
    },
    {
      name: 'Enterprise Build',
      hours: '50 hrs/mo',
      price: '$3,999',
      cohortId: 'construction-enterprise',
      features: ['50 Build Hours/Month', 'Fastest Response', 'Senior PM Team', 'Custom Design Services', 'Premium Materials', 'Warranty Extension'],
      gradient: 'from-orange-600 to-red-600',
      popular: false
    }
  ];

  // Handyman Maintenance Plans
  const handymanPlans = [
    {
      name: 'Basic Maintenance',
      hours: '4 hrs/mo',
      price: '$149',
      cohortId: 'customer-basic',
      features: ['4 Service Hours/Month', 'General Repairs', 'Priority Booking', 'No Trip Fees'],
      gradient: 'from-blue-600 to-cyan-600',
      popular: false
    },
    {
      name: 'Standard Maintenance',
      hours: '8 hrs/mo',
      price: '$299',
      cohortId: 'customer-standard',
      features: ['8 Service Hours/Month', 'All Repairs', 'Emergency Response', 'Preventive Checks', 'Parts Discount'],
      gradient: 'from-blue-600 to-cyan-600',
      popular: true
    },
    {
      name: 'Premium Maintenance',
      hours: '8+ hrs/mo',
      price: '$439',
      cohortId: 'customer-premium',
      features: ['Unlimited Small Jobs', '24/7 Emergency', 'Quarterly Inspection', 'Priority Response', 'Free Parts (under $100)', 'Annual Deep Clean'],
      gradient: 'from-blue-600 to-cyan-600',
      popular: false
    }
  ];

  // Property Management Plans
  const propertyPlans = [
    {
      name: 'Condo Association',
      price: '$399/mo',
      cohortId: 'condo-manager',
      features: ['Common Area Maintenance', 'Emergency Response 24/7', 'Board Meeting Support', 'Unit Owner Portal', 'Capital Project Planning', 'Vendor Management'],
      gradient: 'from-indigo-600 to-blue-600',
      icon: Building
    },
    {
      name: 'Landlord Services',
      price: '$249/mo',
      cohortId: 'landlord',
      features: ['Turnover Services', 'Tenant Request Management', 'Preventive Maintenance', 'Move-In/Out Inspections', 'Same-Day Response', 'Transparent Pricing'],
      gradient: 'from-green-600 to-emerald-600',
      icon: Home
    },
    {
      name: 'Property Manager Pro',
      price: '$599/mo',
      cohortId: 'property-manager',
      features: ['Multi-Property Dashboard', 'Volume Discounts', 'Detailed Reporting', 'Dedicated Account Manager', 'API Integration', 'White Label Portal'],
      gradient: 'from-purple-600 to-indigo-600',
      icon: Building2
    }
  ];

  const packages = [
    {
      icon: Megaphone,
      title: 'Advertising Packages',
      description: 'Premium ad placements across our platform reaching contractors, property managers, and homeowners',
      color: 'from-orange-600 to-red-600',
      features: ['Banner Ads', 'Video Spots', 'Sponsored Content', 'Newsletter Features'],
      pricing: 'From $299/mo'
    },
    {
      icon: Package,
      title: 'Subscription Plans',
      description: 'Recurring revenue packages for monthly services, maintenance plans, and ongoing support contracts',
      color: 'from-blue-600 to-cyan-600',
      features: ['Custom Tiers', 'Auto-Renewal', 'Member Benefits', 'Usage Tracking'],
      pricing: 'From $149/mo'
    },
    {
      icon: Sparkles,
      title: 'Promotional Campaigns',
      description: 'Limited-time offers, flash sales, seasonal promotions, and exclusive deals for your products or services',
      color: 'from-purple-600 to-indigo-600',
      features: ['Campaign Design', 'Landing Pages', 'Email Marketing', 'Social Integration'],
      pricing: 'From $499/campaign'
    },
    {
      icon: Tag,
      title: 'Special Offers',
      description: 'Create compelling discounts, bundle deals, early bird specials, and loyalty rewards programs',
      color: 'from-green-600 to-emerald-600',
      features: ['Discount Codes', 'Bundle Pricing', 'Early Bird Deals', 'Referral Rewards'],
      pricing: 'From $199/mo'
    },
    {
      icon: Gift,
      title: 'Giveaway Campaigns',
      description: 'Engage your audience with contests, sweepstakes, product giveaways, and prize promotions',
      color: 'from-pink-600 to-rose-600',
      features: ['Contest Setup', 'Entry Management', 'Winner Selection', 'Prize Fulfillment'],
      pricing: 'From $399/campaign'
    },
    {
      icon: Crown,
      title: 'Premium Content',
      description: 'Custom landing pages, video production, graphic design, and professional content creation services',
      color: 'from-yellow-600 to-orange-600',
      features: ['Landing Pages', 'Video Production', 'Graphic Design', 'Copywriting'],
      pricing: 'From $799/project'
    }
  ];

  const benefits = [
    {
      icon: Users,
      title: 'Targeted Audience',
      description: 'Reach contractors, homeowners, property managers, and industry professionals actively seeking services'
    },
    {
      icon: TrendingUp,
      title: 'Performance Tracking',
      description: 'Real-time analytics, conversion tracking, ROI measurement, and detailed campaign reports'
    },
    {
      icon: Zap,
      title: 'Quick Launch',
      description: 'Get your campaigns live fast with our streamlined approval process and dedicated support'
    },
    {
      icon: Target,
      title: 'Custom Solutions',
      description: 'Tailored packages designed for your specific goals, budget, and target market'
    }
  ];

  const stats = [
    { label: 'Active Users', value: '12K+', subtext: 'Monthly Reach' },
    { label: 'Conversion Rate', value: '8.4%', subtext: 'Average CTR' },
    { label: 'Client Satisfaction', value: '4.8/5', subtext: 'Advertiser Rating' },
    { label: 'Campaign Success', value: '94%', subtext: 'Goal Achievement' }
  ];

  const testimonials = [
    {
      name: 'Marcus Anderson',
      company: 'ProTools Supply Co.',
      quote: 'Our subscription package generated 45% more leads in the first quarter. The ROI has been incredible and the platform is easy to manage.',
      avatar: 'MA',
      rating: 5
    },
    {
      name: 'Emily Rodriguez',
      company: 'HomeGuard Services',
      quote: 'The promotional campaign they designed increased our conversion rate by 60%. Professional team that delivers real results.',
      avatar: 'ER',
      rating: 5
    },
    {
      name: 'David Kim',
      company: 'BuildRight Materials',
      quote: 'Our giveaway campaign reached over 5,000 contractors. Best marketing investment we\'ve made this year.',
      avatar: 'DK',
      rating: 5
    }
  ];

  const features = [
    { title: 'Custom Landing Pages', description: 'Professional design & development' },
    { title: 'Video Production', description: 'High-quality promotional videos' },
    { title: 'Email Campaigns', description: 'Automated drip sequences' },
    { title: 'Social Media Integration', description: 'Cross-platform promotion' },
    { title: 'Analytics Dashboard', description: 'Real-time performance metrics' },
    { title: 'A/B Testing', description: 'Optimize campaign performance' }
  ];

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-4 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img
            src="https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=800&q=80"
            alt="Marketing Hub"
            className="w-full h-full object-cover opacity-20"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#0A0A0A] via-[#0A0A0A]/95 to-[#0A0A0A]" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-pink-600 to-rose-600 mb-6">
                <Gift className="w-10 h-10 text-white" />
              </div>

              <h1 className="text-5xl md:text-6xl font-bold mb-4 bg-gradient-to-r from-pink-400 to-rose-400 bg-clip-text text-transparent">
                Marketing Hub
              </h1>
              <p className="text-xl text-gray-300 mb-6">
                Promotions, Subscriptions & Special Offers
              </p>
              <p className="text-gray-400 leading-relaxed mb-8">
                Amplify your brand and grow your business with our comprehensive marketing solutions. From advertising packages to promotional campaigns, we provide everything you need to reach your target audience and drive results.
              </p>

              <div className="grid grid-cols-2 gap-4 mb-8">
                {benefits.map((benefit, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-pink-400 flex-shrink-0" />
                    <span className="text-sm text-gray-300">{benefit.title}</span>
                  </div>
                ))}
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  onClick={handleGetStarted}
                  className="flex-1 px-8 py-4 rounded-xl font-bold text-white bg-gradient-to-r from-pink-600 to-rose-600 hover:shadow-lg hover:shadow-pink-500/50 transition-all flex items-center justify-center gap-2 group"
                >
                  Get Started
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </button>
                <button
                  onClick={() => handleNavigate('advertiser-portal')}
                  className="flex-1 px-8 py-4 rounded-xl font-bold text-white bg-white/10 hover:bg-white/20 border border-white/20 transition-all flex items-center justify-center gap-2"
                >
                  <User className="w-5 h-5" />
                  View Portal
                </button>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-4">
              {stats.map((stat, index) => (
                <div key={index} className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-6 hover:border-pink-500/50 transition-all">
                  <div className="text-3xl font-bold text-pink-400 mb-2">{stat.value}</div>
                  <div className="text-white font-semibold mb-1">{stat.label}</div>
                  <div className="text-sm text-gray-400">{stat.subtext}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Construction Subscription Plans */}
      <section className="py-20 px-4 bg-[#0A0A0A]">
        <div className="max-w-7xl mx-auto">
          <div className="mb-16 flex justify-center">
            <div className="w-full max-w-3xl text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-600 to-red-600 mb-6">
                <Building2 className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">Construction Subscription Plans</h2>
              <p className="text-xl text-gray-400">
                Monthly build hours for your construction and renovation projects
              </p>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {constructionPlans.map((plan, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className={`relative bg-[#1A1A1A] border-2 ${plan.popular ? 'border-orange-500' : 'border-[#2A2A2A]'} rounded-2xl p-8 hover:border-orange-500/70 transition-all`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <div className="px-4 py-1 bg-gradient-to-r from-orange-600 to-red-600 rounded-full text-white text-sm font-bold">
                      MOST POPULAR
                    </div>
                  </div>
                )}

                <div className="text-center mb-6">
                  <h3 className="text-2xl font-bold text-white mb-2">{plan.name}</h3>
                  <div className="text-gray-400 mb-4">{plan.hours}</div>
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-4xl font-bold text-orange-400">{plan.price}</span>
                    <span className="text-gray-400">/month</span>
                  </div>
                </div>

                <div className="space-y-3 mb-8">
                  {plan.features.map((feature, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-gray-300">
                      <CheckCircle className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" />
                      <span className="text-sm">{feature}</span>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => handleViewPlanDetails({
                    ...plan,
                    category: 'Construction'
                  })}
                  className={`w-full px-6 py-4 rounded-xl font-bold text-white bg-gradient-to-r ${plan.gradient} hover:shadow-lg hover:shadow-orange-500/50 transition-all flex items-center justify-center gap-2 group`}
                >
                  Sign Up Now
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </button>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Handyman Maintenance Plans */}
      <section className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="mb-16 flex justify-center">
            <div className="w-full max-w-3xl text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-600 mb-6">
                <Wrench className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">Handyman Maintenance Plans</h2>
              <p className="text-xl text-gray-400">
                Monthly service hours for all your repair and maintenance needs
              </p>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {handymanPlans.map((plan, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className={`relative bg-[#1A1A1A] border-2 ${plan.popular ? 'border-blue-500' : 'border-[#2A2A2A]'} rounded-2xl p-8 hover:border-blue-500/70 transition-all`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <div className="px-4 py-1 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-full text-white text-sm font-bold">
                      MOST POPULAR
                    </div>
                  </div>
                )}

                <div className="text-center mb-6">
                  <h3 className="text-2xl font-bold text-white mb-2">{plan.name}</h3>
                  <div className="text-gray-400 mb-4">{plan.hours}</div>
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-4xl font-bold text-blue-400">{plan.price}</span>
                    <span className="text-gray-400">/month</span>
                  </div>
                </div>

                <div className="space-y-3 mb-8">
                  {plan.features.map((feature, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-gray-300">
                      <CheckCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                      <span className="text-sm">{feature}</span>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => handleViewPlanDetails({
                    ...plan,
                    category: 'Handyman'
                  })}
                  className={`w-full px-6 py-4 rounded-xl font-bold text-white bg-gradient-to-r ${plan.gradient} hover:shadow-lg hover:shadow-blue-500/50 transition-all flex items-center justify-center gap-2 group`}
                >
                  Sign Up Now
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </button>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Property Management Plans */}
      <section className="py-20 px-4 bg-[#0A0A0A]">
        <div className="max-w-7xl mx-auto">
          <div className="mb-16 flex justify-center">
            <div className="w-full max-w-3xl text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-600 mb-6">
                <Building className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">Property Management Plans</h2>
              <p className="text-xl text-gray-400">
                Specialized plans for condos, landlords, and property managers
              </p>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {propertyPlans.map((plan, index) => {
              const Icon = plan.icon;
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  className="bg-[#1A1A1A] border-2 border-[#2A2A2A] rounded-2xl p-8 hover:border-purple-500/70 transition-all"
                >
                  <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${plan.gradient} flex items-center justify-center mb-6`}>
                    <Icon className="w-7 h-7 text-white" />
                  </div>

                  <div className="text-center mb-6">
                    <h3 className="text-2xl font-bold text-white mb-2">{plan.name}</h3>
                    <div className="flex items-baseline justify-center gap-1 mt-4">
                      <span className="text-4xl font-bold text-purple-400">{plan.price}</span>
                    </div>
                  </div>

                  <div className="space-y-3 mb-8">
                    {plan.features.map((feature, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-gray-300">
                        <CheckCircle className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" />
                        <span className="text-sm">{feature}</span>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={() => handleViewPlanDetails({
                      name: plan.name,
                      price: plan.price,
                      cohortId: plan.cohortId,
                      features: plan.features,
                      gradient: plan.gradient,
                      category: 'Property Management'
                    })}
                    className={`w-full px-6 py-4 rounded-xl font-bold text-white bg-gradient-to-r ${plan.gradient} hover:shadow-lg hover:shadow-purple-500/50 transition-all flex items-center justify-center gap-2 group`}
                  >
                    Sign Up Now
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </button>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Limited Time Offers - Giveaways & Deals */}
      <section className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="mb-16 flex justify-center">
            <div className="w-full max-w-3xl text-center">
              <div className="inline-flex items-center justify-center px-4 py-2 bg-gradient-to-r from-yellow-600 to-orange-600 rounded-full text-white text-sm font-bold mb-6">
                🔥 LIMITED TIME OFFERS
              </div>
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">Exclusive Deals & Giveaways</h2>
              <p className="text-xl text-gray-400">
                Special promotions for our community of contractors, vendors, and customers
              </p>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Giveaway Campaign */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="bg-gradient-to-br from-yellow-600/10 via-orange-600/10 to-red-600/10 border-2 border-yellow-500/30 rounded-2xl p-8 hover:border-yellow-500/50 transition-all relative overflow-hidden"
            >
              <div className="absolute top-4 right-4">
                <div className="px-3 py-1 bg-yellow-500 text-black text-sm font-bold rounded-full">
                  ACTIVE NOW
                </div>
              </div>

              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-yellow-600 to-orange-600 flex items-center justify-center mb-6">
                <Gift className="w-8 h-8 text-white" />
              </div>

              <h3 className="text-2xl font-bold text-white mb-3">Monthly Giveaway</h3>
              <p className="text-gray-400 mb-6">
                Win premium tools, equipment, or service credits every month. Open to all subscribers.
              </p>

              <div className="space-y-3 mb-6">
                <div className="flex items-center gap-2 text-sm text-gray-300">
                  <CheckCircle className="w-5 h-5 text-yellow-400" />
                  <span>$5,000+ prize value</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-300">
                  <CheckCircle className="w-5 h-5 text-yellow-400" />
                  <span>Automatic entry for subscribers</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-300">
                  <CheckCircle className="w-5 h-5 text-yellow-400" />
                  <span>Winner announced monthly</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-300">
                  <CheckCircle className="w-5 h-5 text-yellow-400" />
                  <span>Tools, materials, or credits</span>
                </div>
              </div>

              <button
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                className="w-full px-6 py-3 bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-500 hover:to-orange-500 rounded-xl text-white font-bold transition-all flex items-center justify-center gap-2 group"
              >
                Subscribe to Enter
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
            </motion.div>

            {/* Subcontractor Deals */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="bg-gradient-to-br from-orange-600/10 via-red-600/10 to-orange-600/10 border-2 border-orange-500/30 rounded-2xl p-8 hover:border-orange-500/50 transition-all relative overflow-hidden"
            >
              <div className="absolute top-4 right-4">
                <div className="px-3 py-1 bg-orange-500 text-white text-sm font-bold rounded-full">
                  30% OFF
                </div>
              </div>

              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-600 to-red-600 flex items-center justify-center mb-6">
                <Wrench className="w-8 h-8 text-white" />
              </div>

              <h3 className="text-2xl font-bold text-white mb-3">Contractor Network</h3>
              <p className="text-gray-400 mb-6">
                Join our subcontractor network with special launch pricing. Limited spots available.
              </p>

              <div className="space-y-3 mb-6">
                <div className="flex items-center gap-2 text-sm text-gray-300">
                  <CheckCircle className="w-5 h-5 text-orange-400" />
                  <span>30% off first 3 months</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-300">
                  <CheckCircle className="w-5 h-5 text-orange-400" />
                  <span>Priority lead placement</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-300">
                  <CheckCircle className="w-5 h-5 text-orange-400" />
                  <span>Project bidding access</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-300">
                  <CheckCircle className="w-5 h-5 text-orange-400" />
                  <span>Verified badge included</span>
                </div>
              </div>

              <button
                onClick={() => {
                  localStorage.setItem('selected_cohort', 'sub-professional');
                  handleNavigate('signup');
                }}
                className="w-full px-6 py-3 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 rounded-xl text-white font-bold transition-all flex items-center justify-center gap-2 group"
              >
                Claim Contractor Deal
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
            </motion.div>

            {/* Vendor Product Deals */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="bg-gradient-to-br from-blue-600/10 via-cyan-600/10 to-blue-600/10 border-2 border-blue-500/30 rounded-2xl p-8 hover:border-blue-500/50 transition-all relative overflow-hidden"
            >
              <div className="absolute top-4 right-4">
                <div className="px-3 py-1 bg-blue-500 text-white text-sm font-bold rounded-full">
                  UP TO 40% OFF
                </div>
              </div>

              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-600 flex items-center justify-center mb-6">
                <Package className="w-8 h-8 text-white" />
              </div>

              <h3 className="text-2xl font-bold text-white mb-3">Vendor Marketplace</h3>
              <p className="text-gray-400 mb-6">
                Exclusive product deals and bulk pricing for materials, tools, and equipment.
              </p>

              <div className="space-y-3 mb-6">
                <div className="flex items-center gap-2 text-sm text-gray-300">
                  <CheckCircle className="w-5 h-5 text-blue-400" />
                  <span>Up to 40% off materials</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-300">
                  <CheckCircle className="w-5 h-5 text-blue-400" />
                  <span>Bulk pricing available</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-300">
                  <CheckCircle className="w-5 h-5 text-blue-400" />
                  <span>Same-day delivery options</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-300">
                  <CheckCircle className="w-5 h-5 text-blue-400" />
                  <span>Verified vendor network</span>
                </div>
              </div>

              <button
                onClick={() => handleNavigate('public-store')}
                className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 rounded-xl text-white font-bold transition-all flex items-center justify-center gap-2 group"
              >
                Browse Deals
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
            </motion.div>
          </div>

          {/* Additional Promotions */}
          <div className="mt-12 grid md:grid-cols-2 gap-6">
            {/* Flash Sale Banner */}
            <div className="bg-gradient-to-r from-red-600/20 to-orange-600/20 border-2 border-red-500/30 rounded-xl p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-red-600/20 flex items-center justify-center">
                  <Zap className="w-6 h-6 text-red-400" />
                </div>
                <div className="flex-1">
                  <h4 className="text-xl font-bold text-white mb-1">Flash Sale Alert</h4>
                  <p className="text-gray-400 text-sm">
                    Subscribe now and get your first month at 50% off on any plan
                  </p>
                </div>
                <button
                  onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                  className="px-6 py-2 bg-red-600 hover:bg-red-500 rounded-lg text-white font-bold transition"
                >
                  Claim
                </button>
              </div>
            </div>

            {/* Referral Bonus */}
            <div className="bg-gradient-to-r from-green-600/20 to-emerald-600/20 border-2 border-green-500/30 rounded-xl p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-green-600/20 flex items-center justify-center">
                  <Users className="w-6 h-6 text-green-400" />
                </div>
                <div className="flex-1">
                  <h4 className="text-xl font-bold text-white mb-1">Referral Program</h4>
                  <p className="text-gray-400 text-sm">
                    Refer a friend and both get $100 credit toward services or products
                  </p>
                </div>
                <button
                  onClick={() => handleNavigate('customer-portal')}
                  className="px-6 py-2 bg-green-600 hover:bg-green-500 rounded-lg text-white font-bold transition"
                >
                  Refer
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Deals & Offers Marketplace */}
      <section className="py-20 px-4 bg-[#0A0A0A]">
        <div className="max-w-7xl mx-auto">
          <div className="mb-16 flex justify-center">
            <div className="w-full max-w-3xl text-center">
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">Deals & Offers Marketplace</h2>
              <p className="text-xl text-gray-400">
                Exclusive deals from our network of vendors, service providers, and partners
              </p>
            </div>
          </div>

          {/* Giveaways Section */}
          <div className="mb-16">
            <div className="flex items-center gap-3 mb-8">
              <Gift className="w-8 h-8 text-yellow-400" />
              <h3 className="text-3xl font-bold text-white">Active Giveaways</h3>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Giveaway 1 */}
              <div className="bg-gradient-to-br from-yellow-600/10 to-orange-600/10 border-2 border-yellow-500/30 rounded-xl p-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-yellow-500/10 rounded-full -mr-12 -mt-12"></div>

                <div className="relative">
                  <div className="flex items-center justify-between mb-4">
                    <span className="px-3 py-1 bg-yellow-500 text-black text-sm font-bold rounded-full">
                      ENDS MAY 31
                    </span>
                    <Trophy className="w-8 h-8 text-yellow-400" />
                  </div>

                  <h4 className="text-xl font-bold text-white mb-3">Power Tool Package Giveaway</h4>
                  <p className="text-gray-400 text-sm mb-4">
                    Win a complete DeWalt power tool set valued at $2,500. Includes drill, impact driver, circular saw, and more.
                  </p>

                  <div className="space-y-2 mb-6">
                    <div className="flex items-center gap-2 text-sm text-gray-300">
                      <CheckCircle className="w-4 h-4 text-yellow-400" />
                      <span>$2,500 prize value</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-300">
                      <CheckCircle className="w-4 h-4 text-yellow-400" />
                      <span>Auto-entry for subscribers</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-300">
                      <CheckCircle className="w-4 h-4 text-yellow-400" />
                      <span>Winner announced June 1st</span>
                    </div>
                  </div>

                  <button
                    onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                    className="w-full px-4 py-3 bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-500 hover:to-orange-500 rounded-lg text-white font-bold transition flex items-center justify-center gap-2"
                  >
                    Subscribe to Enter
                    <ArrowRight className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Giveaway 2 */}
              <div className="bg-gradient-to-br from-blue-600/10 to-cyan-600/10 border-2 border-blue-500/30 rounded-xl p-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 rounded-full -mr-12 -mt-12"></div>

                <div className="relative">
                  <div className="flex items-center justify-between mb-4">
                    <span className="px-3 py-1 bg-blue-500 text-white text-sm font-bold rounded-full">
                      ENDS JUNE 15
                    </span>
                    <Trophy className="w-8 h-8 text-blue-400" />
                  </div>

                  <h4 className="text-xl font-bold text-white mb-3">$1,000 Material Credit</h4>
                  <p className="text-gray-400 text-sm mb-4">
                    Win $1,000 in material credits to use at any participating vendor in our marketplace.
                  </p>

                  <div className="space-y-2 mb-6">
                    <div className="flex items-center gap-2 text-sm text-gray-300">
                      <CheckCircle className="w-4 h-4 text-blue-400" />
                      <span>$1,000 credit value</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-300">
                      <CheckCircle className="w-4 h-4 text-blue-400" />
                      <span>Use at any vendor</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-300">
                      <CheckCircle className="w-4 h-4 text-blue-400" />
                      <span>Winner announced June 16th</span>
                    </div>
                  </div>

                  <button
                    onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                    className="w-full px-4 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 rounded-lg text-white font-bold transition flex items-center justify-center gap-2"
                  >
                    Subscribe to Enter
                    <ArrowRight className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Giveaway 3 */}
              <div className="bg-gradient-to-br from-green-600/10 to-emerald-600/10 border-2 border-green-500/30 rounded-xl p-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-green-500/10 rounded-full -mr-12 -mt-12"></div>

                <div className="relative">
                  <div className="flex items-center justify-between mb-4">
                    <span className="px-3 py-1 bg-green-500 text-white text-sm font-bold rounded-full">
                      MONTHLY
                    </span>
                    <Trophy className="w-8 h-8 text-green-400" />
                  </div>

                  <h4 className="text-xl font-bold text-white mb-3">Free Service Month</h4>
                  <p className="text-gray-400 text-sm mb-4">
                    Win a free month of any subscription service - handyman, construction, or property management.
                  </p>

                  <div className="space-y-2 mb-6">
                    <div className="flex items-center gap-2 text-sm text-gray-300">
                      <CheckCircle className="w-4 h-4 text-green-400" />
                      <span>Up to $3,999 value</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-300">
                      <CheckCircle className="w-4 h-4 text-green-400" />
                      <span>Choose any plan</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-300">
                      <CheckCircle className="w-4 h-4 text-green-400" />
                      <span>New winner each month</span>
                    </div>
                  </div>

                  <button
                    onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                    className="w-full px-4 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 rounded-lg text-white font-bold transition flex items-center justify-center gap-2"
                  >
                    Subscribe to Enter
                    <ArrowRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Product Deals Section */}
          <div className="mb-16">
            <div className="flex items-center gap-3 mb-8">
              <Package className="w-8 h-8 text-blue-400" />
              <h3 className="text-3xl font-bold text-white">Featured Product Deals</h3>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Product Deal 1 */}
              <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6 hover:border-blue-500/50 transition-all">
                <div className="mb-4">
                  <span className="px-3 py-1 bg-red-600 text-white text-sm font-bold rounded">
                    40% OFF
                  </span>
                </div>
                <h4 className="text-lg font-bold text-white mb-2">Premium Lumber Bundle</h4>
                <p className="text-gray-400 text-sm mb-4">Bulk 2x4s, 2x6s, and plywood sheets</p>
                <div className="flex items-baseline gap-2 mb-4">
                  <span className="text-2xl font-bold text-blue-400">$599</span>
                  <span className="text-gray-500 line-through">$999</span>
                </div>
                <button
                  onClick={() => handleNavigate('public-store')}
                  className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-white font-semibold transition"
                >
                  Shop Now
                </button>
              </div>

              {/* Product Deal 2 */}
              <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6 hover:border-blue-500/50 transition-all">
                <div className="mb-4">
                  <span className="px-3 py-1 bg-red-600 text-white text-sm font-bold rounded">
                    35% OFF
                  </span>
                </div>
                <h4 className="text-lg font-bold text-white mb-2">Professional Paint Set</h4>
                <p className="text-gray-400 text-sm mb-4">Premium interior/exterior paint + supplies</p>
                <div className="flex items-baseline gap-2 mb-4">
                  <span className="text-2xl font-bold text-blue-400">$259</span>
                  <span className="text-gray-500 line-through">$399</span>
                </div>
                <button
                  onClick={() => handleNavigate('public-store')}
                  className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-white font-semibold transition"
                >
                  Shop Now
                </button>
              </div>

              {/* Product Deal 3 */}
              <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6 hover:border-blue-500/50 transition-all">
                <div className="mb-4">
                  <span className="px-3 py-1 bg-red-600 text-white text-sm font-bold rounded">
                    50% OFF
                  </span>
                </div>
                <h4 className="text-lg font-bold text-white mb-2">Electrical Supplies Kit</h4>
                <p className="text-gray-400 text-sm mb-4">Wiring, outlets, switches, and boxes</p>
                <div className="flex items-baseline gap-2 mb-4">
                  <span className="text-2xl font-bold text-blue-400">$149</span>
                  <span className="text-gray-500 line-through">$299</span>
                </div>
                <button
                  onClick={() => handleNavigate('public-store')}
                  className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-white font-semibold transition"
                >
                  Shop Now
                </button>
              </div>

              {/* Product Deal 4 */}
              <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6 hover:border-blue-500/50 transition-all">
                <div className="mb-4">
                  <span className="px-3 py-1 bg-red-600 text-white text-sm font-bold rounded">
                    30% OFF
                  </span>
                </div>
                <h4 className="text-lg font-bold text-white mb-2">Plumbing Fixtures Set</h4>
                <p className="text-gray-400 text-sm mb-4">Faucets, valves, and pipe fittings</p>
                <div className="flex items-baseline gap-2 mb-4">
                  <span className="text-2xl font-bold text-blue-400">$349</span>
                  <span className="text-gray-500 line-through">$499</span>
                </div>
                <button
                  onClick={() => handleNavigate('public-store')}
                  className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-white font-semibold transition"
                >
                  Shop Now
                </button>
              </div>
            </div>
          </div>

          {/* Vendor/Subcontractor/Service Provider Deals */}
          <div>
            <div className="flex items-center gap-3 mb-8">
              <Users className="w-8 h-8 text-orange-400" />
              <h3 className="text-3xl font-bold text-white">Partner & Service Provider Deals</h3>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {/* Vendor Deal */}
              <div className="bg-gradient-to-br from-purple-600/10 to-indigo-600/10 border-2 border-purple-500/30 rounded-xl p-8">
                <div className="flex items-center justify-between mb-6">
                  <Building2 className="w-12 h-12 text-purple-400" />
                  <span className="px-4 py-2 bg-purple-600 text-white text-sm font-bold rounded-full">
                    VENDOR DEAL
                  </span>
                </div>

                <h4 className="text-2xl font-bold text-white mb-3">First Month Free</h4>
                <p className="text-gray-400 mb-6">
                  New vendors get their first month completely free on any Vendor Professional or Enterprise plan
                </p>

                <div className="space-y-3 mb-6">
                  <div className="flex items-center gap-2 text-sm text-gray-300">
                    <CheckCircle className="w-5 h-5 text-purple-400" />
                    <span>No setup fees</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-300">
                    <CheckCircle className="w-5 h-5 text-purple-400" />
                    <span>Full platform access</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-300">
                    <CheckCircle className="w-5 h-5 text-purple-400" />
                    <span>Premium vendor placement</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-300">
                    <CheckCircle className="w-5 h-5 text-purple-400" />
                    <span>Cancel anytime</span>
                  </div>
                </div>

                <button
                  onClick={() => {
                    localStorage.setItem('selected_cohort', 'vendor-professional');
                    handleNavigate('signup');
                  }}
                  className="w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 rounded-xl text-white font-bold transition flex items-center justify-center gap-2"
                >
                  Claim Vendor Deal
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>

              {/* Subcontractor Deal */}
              <div className="bg-gradient-to-br from-orange-600/10 to-red-600/10 border-2 border-orange-500/30 rounded-xl p-8">
                <div className="flex items-center justify-between mb-6">
                  <Wrench className="w-12 h-12 text-orange-400" />
                  <span className="px-4 py-2 bg-orange-600 text-white text-sm font-bold rounded-full">
                    CONTRACTOR DEAL
                  </span>
                </div>

                <h4 className="text-2xl font-bold text-white mb-3">3 Months Half Price</h4>
                <p className="text-gray-400 mb-6">
                  Subcontractors save 50% for the first 3 months on Pro or Elite plans with priority lead access
                </p>

                <div className="space-y-3 mb-6">
                  <div className="flex items-center gap-2 text-sm text-gray-300">
                    <CheckCircle className="w-5 h-5 text-orange-400" />
                    <span>50% off 3 months</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-300">
                    <CheckCircle className="w-5 h-5 text-orange-400" />
                    <span>Priority lead placement</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-300">
                    <CheckCircle className="w-5 h-5 text-orange-400" />
                    <span>Project bidding access</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-300">
                    <CheckCircle className="w-5 h-5 text-orange-400" />
                    <span>Verified badge included</span>
                  </div>
                </div>

                <button
                  onClick={() => {
                    localStorage.setItem('selected_cohort', 'sub-professional');
                    handleNavigate('signup');
                  }}
                  className="w-full px-6 py-3 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 rounded-xl text-white font-bold transition flex items-center justify-center gap-2"
                >
                  Claim Contractor Deal
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>

              {/* Service Provider Deal */}
              <div className="bg-gradient-to-br from-cyan-600/10 to-blue-600/10 border-2 border-cyan-500/30 rounded-xl p-8">
                <div className="flex items-center justify-between mb-6">
                  <Star className="w-12 h-12 text-cyan-400" />
                  <span className="px-4 py-2 bg-cyan-600 text-white text-sm font-bold rounded-full">
                    SERVICE DEAL
                  </span>
                </div>

                <h4 className="text-2xl font-bold text-white mb-3">Bundle & Save 25%</h4>
                <p className="text-gray-400 mb-6">
                  Service providers who offer multiple services get 25% off when bundling handyman, construction, or specialty services
                </p>

                <div className="space-y-3 mb-6">
                  <div className="flex items-center gap-2 text-sm text-gray-300">
                    <CheckCircle className="w-5 h-5 text-cyan-400" />
                    <span>25% off bundle plans</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-300">
                    <CheckCircle className="w-5 h-5 text-cyan-400" />
                    <span>Multiple service listings</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-300">
                    <CheckCircle className="w-5 h-5 text-cyan-400" />
                    <span>Cross-promotion benefits</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-300">
                    <CheckCircle className="w-5 h-5 text-cyan-400" />
                    <span>Dedicated account manager</span>
                  </div>
                </div>

                <button
                  onClick={() => {
                    localStorage.setItem('selected_cohort', 'sub-enterprise');
                    handleNavigate('signup');
                  }}
                  className="w-full px-6 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 rounded-xl text-white font-bold transition flex items-center justify-center gap-2"
                >
                  Claim Service Deal
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Additional Services & Features */}
      <section className="py-20 px-4 bg-[#0A0A0A]">
        <div className="max-w-7xl mx-auto">
          <div className="mb-16 flex justify-center">
            <div className="w-full max-w-3xl text-center">
              <h2 className="text-4xl font-bold text-white mb-4">Additional Marketing Services</h2>
              <p className="text-xl text-gray-400">Professional content and design services available</p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <div key={index} className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6 hover:border-pink-500/50 transition-all">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-pink-600/20 flex items-center justify-center flex-shrink-0">
                    <Star className="w-5 h-5 text-pink-400" />
                  </div>
                  <div>
                    <h4 className="font-bold text-white mb-2">{feature.title}</h4>
                    <p className="text-sm text-gray-400">{feature.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="mb-16 flex justify-center">
            <div className="w-full max-w-3xl text-center">
              <h2 className="text-4xl font-bold text-white mb-4">Member Success Stories</h2>
              <p className="text-xl text-gray-400">Real results from our subscription members</p>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-6 hover:border-pink-500/50 transition-all"
              >
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 fill-pink-400 text-pink-400" />
                  ))}
                </div>

                <p className="text-gray-300 mb-6">"{testimonial.quote}"</p>

                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-pink-600 to-rose-600 flex items-center justify-center">
                    <span className="text-white font-bold">{testimonial.avatar}</span>
                  </div>
                  <div>
                    <div className="text-white font-semibold">{testimonial.name}</div>
                    <div className="text-gray-400 text-sm">{testimonial.company}</div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 flex justify-center">
        <div className="w-full max-w-4xl">
          <div className="bg-gradient-to-r from-pink-600/20 via-rose-600/20 to-pink-600/20 border-2 border-pink-500/30 rounded-2xl p-12 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-pink-600/20 border-2 border-pink-500 mb-6">
              <Trophy className="w-8 h-8 text-pink-400" />
            </div>

            <h3 className="text-3xl md:text-4xl font-bold text-white mb-4">Ready to Subscribe?</h3>
            <p className="text-xl text-gray-300 mb-8">Choose your plan and start saving today</p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
              <button
                onClick={() => handleNavigate('pricing')}
                className="px-12 py-5 bg-gradient-to-r from-pink-600 to-rose-600 text-white rounded-xl font-bold text-xl hover:from-pink-500 hover:to-rose-500 transition-all shadow-2xl shadow-pink-500/30 hover:shadow-pink-500/50 flex items-center justify-center gap-3 group"
              >
                View All Plans
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
                <span>marketing@blackphoenix.com</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Plan Detail Modal */}
      {selectedPlan && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-[#1A1A1A] border-2 border-[#2A2A2A] rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
          >
            {/* Header */}
            <div className={`bg-gradient-to-r ${selectedPlan.gradient} p-6 relative`}>
              <button
                onClick={() => setSelectedPlan(null)}
                className="absolute top-4 right-4 w-10 h-10 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition"
              >
                <X className="w-6 h-6 text-white" />
              </button>

              <div className="text-center text-white">
                <div className="inline-flex items-center justify-center px-4 py-1 bg-white/20 rounded-full text-sm font-semibold mb-4">
                  {selectedPlan.category}
                </div>
                <h2 className="text-3xl font-bold mb-2">{selectedPlan.name}</h2>
                {selectedPlan.hours && (
                  <p className="text-white/90 text-lg mb-4">{selectedPlan.hours}</p>
                )}
                <div className="flex items-baseline justify-center gap-2">
                  <span className="text-5xl font-bold">{selectedPlan.price}</span>
                  {selectedPlan.price.includes('/') === false && <span className="text-xl">/month</span>}
                </div>
              </div>
            </div>

            {/* Plan Details */}
            <div className="p-8">
              <h3 className="text-xl font-bold text-white mb-6">Plan Includes:</h3>
              <div className="space-y-4 mb-8">
                {selectedPlan.features.map((feature, idx) => (
                  <div key={idx} className="flex items-start gap-3">
                    <CheckCircle className="w-6 h-6 text-green-400 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-300">{feature}</span>
                  </div>
                ))}
              </div>

              {/* Benefits */}
              <div className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl p-6 mb-8">
                <h4 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-yellow-400" />
                  What You Get
                </h4>
                <ul className="space-y-2 text-gray-300 text-sm">
                  <li>✓ Instant access upon subscription activation</li>
                  <li>✓ Cancel or change plans anytime</li>
                  <li>✓ 24/7 customer support</li>
                  <li>✓ Monthly usage reports and analytics</li>
                  <li>✓ Priority scheduling for subscribers</li>
                </ul>
              </div>

              {/* Action Buttons */}
              <div className="space-y-4">
                <div className="text-center mb-4">
                  <p className="text-gray-400 text-sm">Ready to get started?</p>
                </div>

                <button
                  onClick={() => handleSignUp(selectedPlan.cohortId)}
                  className={`w-full px-6 py-4 rounded-xl font-bold text-white bg-gradient-to-r ${selectedPlan.gradient} hover:shadow-lg transition-all flex items-center justify-center gap-2 group`}
                >
                  <User className="w-5 h-5" />
                  Create New Account & Subscribe
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </button>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-[#2A2A2A]"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-4 bg-[#1A1A1A] text-gray-500">Already have an account?</span>
                  </div>
                </div>

                <button
                  onClick={() => handleSignIn(selectedPlan.cohortId)}
                  className="w-full px-6 py-4 bg-[#0A0A0A] border-2 border-[#2A2A2A] hover:border-white/20 rounded-xl text-white font-bold transition-all flex items-center justify-center gap-2 group"
                >
                  Sign In & Add to Account
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
