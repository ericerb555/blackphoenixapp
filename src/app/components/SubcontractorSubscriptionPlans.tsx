import { useState, useEffect } from 'react';
import {
  Crown,
  Zap,
  Shield,
  Check,
  X,
  Sparkles,
  Palette,
  Bot,
  Share2,
  TrendingUp,
  Users,
  BarChart3,
  Calendar,
  Mail,
  MessageSquare,
  Image,
  Video,
  Laptop,
  Smartphone,
  Clock,
  Award,
  ChevronRight,
  CreditCard,
  AlertCircle,
  CheckCircle,
  Star,
  Target,
  Megaphone,
  PenTool,
  Settings,
} from 'lucide-react';

interface SubscriptionPlan {
  id: string;
  name: string;
  tagline: string;
  price: number;
  billingCycle: 'monthly' | 'quarterly' | 'annual';
  icon: typeof Shield;
  color: string;
  popular?: boolean;
  features: {
    category: string;
    items: FeatureItem[];
  }[];
  limits: {
    designProjects: number | 'unlimited';
    aiAdCredits: number | 'unlimited';
    socialPosts: number | 'unlimited';
    storage: string;
    users: number;
  };
}

interface FeatureItem {
  name: string;
  included: boolean;
  tooltip?: string;
}

const SUBCONTRACTOR_PLANS: SubscriptionPlan[] = [
  {
    id: 'basic',
    name: 'Basic Builder',
    tagline: 'Perfect for getting started with professional design tools',
    price: 49,
    billingCycle: 'monthly',
    icon: Shield,
    color: 'from-gray-500 to-gray-700',
    features: [
      {
        category: 'Design Center Access',
        items: [
          { name: 'Full Design Center Access', included: true },
          { name: 'CAD Drawing Tools', included: true },
          { name: 'Material Library', included: true },
          { name: '2D Floor Plans', included: true },
          { name: '3D Visualizations', included: false },
          { name: 'Custom Templates', included: false },
        ],
      },
      {
        category: 'AI Ad Creation',
        items: [
          { name: 'AI Ad Generator', included: false },
          { name: 'Brand-Matched Designs', included: false },
          { name: 'Multi-Format Export', included: false },
          { name: 'A/B Testing Tools', included: false },
        ],
      },
      {
        category: 'Social Media Marketing',
        items: [
          { name: 'Social Media Scheduler', included: false },
          { name: 'Content Calendar', included: false },
          { name: 'Analytics Dashboard', included: false },
          { name: 'Automated Posting', included: false },
        ],
      },
    ],
    limits: {
      designProjects: 10,
      aiAdCredits: 0,
      socialPosts: 0,
      storage: '5 GB',
      users: 2,
    },
  },
  {
    id: 'pro',
    name: 'Pro Creator',
    tagline: 'Advanced design tools plus AI-powered advertising',
    price: 149,
    billingCycle: 'monthly',
    icon: Zap,
    color: 'from-orange-500 to-orange-700',
    popular: true,
    features: [
      {
        category: 'Design Center Access',
        items: [
          { name: 'Full Design Center Access', included: true },
          { name: 'CAD Drawing Tools', included: true },
          { name: 'Material Library', included: true },
          { name: '2D Floor Plans', included: true },
          { name: '3D Visualizations', included: true },
          { name: 'Custom Templates', included: true },
        ],
      },
      {
        category: 'AI Ad Creation',
        items: [
          { name: 'AI Ad Generator', included: true, tooltip: 'Create professional ads in minutes' },
          { name: 'Brand-Matched Designs', included: true, tooltip: 'Automatically matches your brand colors and style' },
          { name: 'Multi-Format Export', included: true, tooltip: 'Export for Facebook, Instagram, Google Ads, etc.' },
          { name: 'A/B Testing Tools', included: true },
          { name: 'Performance Insights', included: true },
          { name: 'Video Ad Creator', included: false },
        ],
      },
      {
        category: 'Social Media Marketing',
        items: [
          { name: 'Social Media Scheduler', included: false },
          { name: 'Content Calendar', included: false },
          { name: 'Analytics Dashboard', included: false },
          { name: 'Automated Posting', included: false },
        ],
      },
    ],
    limits: {
      designProjects: 50,
      aiAdCredits: 100,
      socialPosts: 0,
      storage: '25 GB',
      users: 5,
    },
  },
  {
    id: 'enterprise',
    name: 'Enterprise Suite',
    tagline: 'Complete marketing powerhouse with unlimited everything',
    price: 299,
    billingCycle: 'monthly',
    icon: Crown,
    color: 'from-purple-500 to-purple-700',
    features: [
      {
        category: 'Design Center Access',
        items: [
          { name: 'Full Design Center Access', included: true },
          { name: 'CAD Drawing Tools', included: true },
          { name: 'Material Library', included: true },
          { name: '2D Floor Plans', included: true },
          { name: '3D Visualizations', included: true },
          { name: 'Custom Templates', included: true },
          { name: 'Priority Rendering', included: true },
          { name: 'White-Label Exports', included: true },
        ],
      },
      {
        category: 'AI Ad Creation',
        items: [
          { name: 'AI Ad Generator', included: true },
          { name: 'Brand-Matched Designs', included: true },
          { name: 'Multi-Format Export', included: true },
          { name: 'A/B Testing Tools', included: true },
          { name: 'Performance Insights', included: true },
          { name: 'Video Ad Creator', included: true },
          { name: 'Custom AI Training', included: true },
        ],
      },
      {
        category: 'Social Media Marketing',
        items: [
          { name: 'Social Media Scheduler', included: true, tooltip: 'Schedule posts across all platforms' },
          { name: 'Content Calendar', included: true, tooltip: 'Visual content planning' },
          { name: 'Analytics Dashboard', included: true, tooltip: 'Track performance across all channels' },
          { name: 'Automated Posting', included: true, tooltip: 'Set it and forget it posting' },
          { name: 'Multi-Platform Publishing', included: true },
          { name: 'Engagement Tracking', included: true },
          { name: 'Competitor Analysis', included: true },
          { name: 'Influencer Outreach', included: true },
        ],
      },
      {
        category: 'Premium Support',
        items: [
          { name: 'Dedicated Account Manager', included: true },
          { name: 'Priority Support (24/7)', included: true },
          { name: 'Custom Onboarding', included: true },
          { name: 'Monthly Strategy Calls', included: true },
        ],
      },
    ],
    limits: {
      designProjects: 'unlimited',
      aiAdCredits: 'unlimited',
      socialPosts: 'unlimited',
      storage: 'Unlimited',
      users: 'unlimited' as any,
    },
  },
];

interface SubcontractorSubscriptionPlansProps {
  currentPlanId?: string;
  onSelectPlan?: (planId: string) => void;
}

export default function SubcontractorSubscriptionPlans({
  currentPlanId,
  onSelectPlan,
}: SubcontractorSubscriptionPlansProps) {
  const [selectedCycle, setSelectedCycle] = useState<'monthly' | 'annual'>('monthly');
  const [showComparison, setShowComparison] = useState(false);
  const [activePlanId, setActivePlanId] = useState<string | null>(null);

  useEffect(() => {
    // Load current subscription from localStorage
    const storedSubscriptions = localStorage.getItem('subcontractor_subscriptions');
    if (storedSubscriptions) {
      try {
        const subscriptions = JSON.parse(storedSubscriptions);
        const active = subscriptions.find((sub: any) => sub.status === 'active');
        if (active) {
          setActivePlanId(active.plan_id);
        }
      } catch (error) {
        console.error('Error loading subscriptions:', error);
      }
    }
  }, []);

  const handleSelectPlan = (planId: string) => {
    if (onSelectPlan) {
      onSelectPlan(planId);
    } else {
      // Save selection to localStorage and redirect to payment
      const plan = SUBCONTRACTOR_PLANS.find((p) => p.id === planId);
      if (plan) {
        localStorage.setItem('selected_subscription_plan', JSON.stringify({
          plan_id: planId,
          plan_name: plan.name,
          amount: selectedCycle === 'annual' ? plan.price * 10 : plan.price,
          billing_cycle: selectedCycle,
          selected_at: new Date().toISOString(),
        }));
        
        // Navigate to unified payment center
        window.location.href = '/unified-payment-center?type=subscription&plan=' + planId;
      }
    }
  };

  const getDiscountedPrice = (price: number) => {
    return selectedCycle === 'annual' ? Math.round(price * 10) : price;
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white p-6">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-12">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-orange-500 to-orange-700 bg-clip-text text-transparent">
            Subcontractor Subscription Plans
          </h1>
          <p className="text-xl text-gray-400 max-w-3xl mx-auto">
            Choose the perfect plan to grow your business with professional design tools, AI-powered advertising, and comprehensive social media marketing.
          </p>
        </div>

        {/* Billing Toggle */}
        <div className="flex items-center justify-center gap-4 mb-8">
          <button
            onClick={() => setSelectedCycle('monthly')}
            className={`px-6 py-3 rounded-lg font-semibold transition-all ${
              selectedCycle === 'monthly'
                ? 'bg-gradient-to-r from-orange-600 to-orange-700 text-white shadow-lg shadow-orange-500/50'
                : 'bg-[#1A1A1A] text-gray-400 hover:bg-[#252525]'
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setSelectedCycle('annual')}
            className={`px-6 py-3 rounded-lg font-semibold transition-all relative ${
              selectedCycle === 'annual'
                ? 'bg-gradient-to-r from-orange-600 to-orange-700 text-white shadow-lg shadow-orange-500/50'
                : 'bg-[#1A1A1A] text-gray-400 hover:bg-[#252525]'
            }`}
          >
            Annual
            <span className="absolute -top-2 -right-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full">
              Save 17%
            </span>
          </button>
        </div>

        {/* Quick Comparison Toggle */}
        <div className="flex justify-center mb-8">
          <button
            onClick={() => setShowComparison(!showComparison)}
            className="flex items-center gap-2 px-4 py-2 bg-[#1A1A1A] rounded-lg hover:bg-[#252525] transition-colors"
          >
            <BarChart3 className="w-4 h-4" />
            {showComparison ? 'Hide' : 'Show'} Feature Comparison
          </button>
        </div>

        {/* Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          {SUBCONTRACTOR_PLANS.map((plan) => {
            const Icon = plan.icon;
            const isActive = activePlanId === plan.id;
            const price = getDiscountedPrice(plan.price);

            return (
              <div
                key={plan.id}
                className={`relative bg-[#1A1A1A] rounded-2xl border-2 transition-all ${
                  plan.popular
                    ? 'border-orange-600 shadow-2xl shadow-orange-500/20 scale-105'
                    : isActive
                    ? 'border-green-500'
                    : 'border-[#2A2A2A] hover:border-orange-600/50'
                }`}
              >
                {/* Popular Badge */}
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <div className="bg-gradient-to-r from-orange-600 to-orange-700 text-white px-6 py-2 rounded-full text-sm font-bold shadow-lg">
                      🔥 MOST POPULAR
                    </div>
                  </div>
                )}

                {/* Active Badge */}
                {isActive && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <div className="bg-green-500 text-white px-6 py-2 rounded-full text-sm font-bold shadow-lg flex items-center gap-2">
                      <CheckCircle className="w-4 h-4" />
                      CURRENT PLAN
                    </div>
                  </div>
                )}

                <div className="p-8">
                  {/* Icon & Title */}
                  <div className="flex items-center gap-4 mb-4">
                    <div
                      className={`w-16 h-16 rounded-xl bg-gradient-to-br ${plan.color} flex items-center justify-center`}
                    >
                      <Icon className="w-8 h-8 text-white" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold">{plan.name}</h3>
                      <p className="text-sm text-gray-400">{plan.tagline}</p>
                    </div>
                  </div>

                  {/* Pricing */}
                  <div className="mb-6">
                    <div className="flex items-baseline gap-2">
                      <span className="text-5xl font-bold">${price}</span>
                      <span className="text-gray-400">
                        /{selectedCycle === 'monthly' ? 'mo' : 'yr'}
                      </span>
                    </div>
                    {selectedCycle === 'annual' && (
                      <p className="text-sm text-green-400 mt-1">
                        Save ${plan.price * 2}/year
                      </p>
                    )}
                  </div>

                  {/* Key Limits */}
                  <div className="bg-[#0A0A0A] rounded-lg p-4 mb-6 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Design Projects</span>
                      <span className="font-semibold text-orange-400">
                        {plan.limits.designProjects}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">AI Ad Credits</span>
                      <span className="font-semibold text-orange-400">
                        {plan.limits.aiAdCredits}/mo
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Social Posts</span>
                      <span className="font-semibold text-orange-400">
                        {plan.limits.socialPosts}/mo
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Storage</span>
                      <span className="font-semibold text-orange-400">
                        {plan.limits.storage}
                      </span>
                    </div>
                  </div>

                  {/* CTA Button */}
                  <button
                    onClick={() => handleSelectPlan(plan.id)}
                    disabled={isActive}
                    className={`w-full py-4 rounded-lg font-bold text-lg transition-all flex items-center justify-center gap-2 ${
                      isActive
                        ? 'bg-green-500/20 text-green-400 cursor-not-allowed'
                        : plan.popular
                        ? 'bg-gradient-to-r from-orange-600 to-orange-700 text-white hover:shadow-lg hover:shadow-orange-500/50'
                        : 'bg-[#2A2A2A] text-white hover:bg-[#353535]'
                    }`}
                  >
                    {isActive ? (
                      <>
                        <CheckCircle className="w-5 h-5" />
                        Active Plan
                      </>
                    ) : (
                      <>
                        Get Started
                        <ChevronRight className="w-5 h-5" />
                      </>
                    )}
                  </button>

                  {/* Top Features Preview */}
                  <div className="mt-6 space-y-2">
                    {plan.features
                      .flatMap((cat) => cat.items)
                      .filter((item) => item.included)
                      .slice(0, 5)
                      .map((feature, idx) => (
                        <div key={idx} className="flex items-start gap-2 text-sm">
                          <Check className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                          <span className="text-gray-300">{feature.name}</span>
                        </div>
                      ))}
                  </div>

                  {/* View All Features Link */}
                  <button
                    onClick={() => setShowComparison(true)}
                    className="mt-4 text-orange-400 text-sm hover:text-orange-300 flex items-center gap-1"
                  >
                    View all features
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Feature Comparison Table */}
        {showComparison && (
          <div className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] p-8 mb-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold">Complete Feature Comparison</h3>
              <button
                onClick={() => setShowComparison(false)}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#2A2A2A]">
                    <th className="text-left py-4 px-4 font-semibold">Feature</th>
                    {SUBCONTRACTOR_PLANS.map((plan) => (
                      <th key={plan.id} className="text-center py-4 px-4">
                        <div className="flex flex-col items-center gap-2">
                          <span className="font-bold">{plan.name}</span>
                          <span className="text-2xl font-bold text-orange-400">
                            ${getDiscountedPrice(plan.price)}
                          </span>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {SUBCONTRACTOR_PLANS[0].features.map((category) => (
                    <>
                      <tr key={category.category} className="bg-[#0A0A0A]">
                        <td
                          colSpan={4}
                          className="py-3 px-4 font-bold text-orange-400 text-sm uppercase tracking-wide"
                        >
                          {category.category}
                        </td>
                      </tr>
                      {category.items.map((feature) => (
                        <tr
                          key={feature.name}
                          className="border-b border-[#2A2A2A] hover:bg-[#151515]"
                        >
                          <td className="py-3 px-4 text-gray-300">{feature.name}</td>
                          {SUBCONTRACTOR_PLANS.map((plan) => {
                            const planFeature = plan.features
                              .find((cat) => cat.category === category.category)
                              ?.items.find((item) => item.name === feature.name);

                            return (
                              <td key={plan.id} className="text-center py-3 px-4">
                                {planFeature?.included ? (
                                  <Check className="w-5 h-5 text-green-400 mx-auto" />
                                ) : (
                                  <X className="w-5 h-5 text-gray-600 mx-auto" />
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Value Props */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-[#1A1A1A] rounded-xl p-6 border border-[#2A2A2A]">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center mb-4">
              <Palette className="w-6 h-6 text-white" />
            </div>
            <h4 className="text-lg font-bold mb-2">Professional Design Center</h4>
            <p className="text-gray-400 text-sm">
              Access enterprise-grade CAD tools, 3D visualizations, and a comprehensive material library to create stunning designs.
            </p>
          </div>

          <div className="bg-[#1A1A1A] rounded-xl p-6 border border-[#2A2A2A]">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center mb-4">
              <Bot className="w-6 h-6 text-white" />
            </div>
            <h4 className="text-lg font-bold mb-2">AI-Powered Ad Creation</h4>
            <p className="text-gray-400 text-sm">
              Generate professional advertising content in minutes with AI that understands your brand and creates scroll-stopping ads.
            </p>
          </div>

          <div className="bg-[#1A1A1A] rounded-xl p-6 border border-[#2A2A2A]">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-orange-500 to-orange-700 flex items-center justify-center mb-4">
              <Share2 className="w-6 h-6 text-white" />
            </div>
            <h4 className="text-lg font-bold mb-2">Social Media Marketing Suite</h4>
            <p className="text-gray-400 text-sm">
              Schedule posts, track analytics, and grow your presence across all major platforms with our comprehensive marketing tools.
            </p>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] p-8">
          <h3 className="text-2xl font-bold mb-6">Frequently Asked Questions</h3>
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold text-orange-400 mb-2">
                Can I upgrade or downgrade my plan?
              </h4>
              <p className="text-gray-400 text-sm">
                Yes! You can change your plan at any time. Upgrades take effect immediately, and downgrades take effect at the end of your current billing period.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-orange-400 mb-2">
                What happens to my unused AI ad credits?
              </h4>
              <p className="text-gray-400 text-sm">
                AI ad credits roll over for up to 3 months, so you never lose what you've paid for. Enterprise plans have unlimited credits.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-orange-400 mb-2">
                Do I need design experience to use these tools?
              </h4>
              <p className="text-gray-400 text-sm">
                Not at all! Our AI-powered tools and intuitive interfaces make it easy for anyone to create professional designs and marketing materials. We also provide templates and tutorials.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-orange-400 mb-2">
                Is there a free trial?
              </h4>
              <p className="text-gray-400 text-sm">
                Yes! All plans include a 14-day free trial with full access to all features. No credit card required to start.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Export plans for use in other components
export { SUBCONTRACTOR_PLANS };
export type { SubscriptionPlan };
