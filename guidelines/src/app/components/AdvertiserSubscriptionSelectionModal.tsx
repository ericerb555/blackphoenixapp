/**
 * Advertiser Subscription Selection Modal
 * Allows advertisers to choose between different advertising tier plans
 */

import { X, Check, Megaphone, Zap, TrendingUp, Crown, BarChart3, Target, Users, Sparkles } from 'lucide-react';

interface AdvertiserSubscriptionSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPlan: (plan: string) => void;
}

export default function AdvertiserSubscriptionSelectionModal({
  isOpen,
  onClose,
  onSelectPlan,
}: AdvertiserSubscriptionSelectionModalProps) {
  if (!isOpen) return null;

  const plans = [
    {
      id: 'basic',
      name: 'Basic Ads',
      price: '$299',
      icon: <Megaphone className="w-5 h-5 text-blue-400" />,
      color: 'blue',
      gradient: 'from-blue-600 to-blue-700',
      description: 'Perfect for small businesses testing the platform',
      features: [
        'Up to 5 active campaigns',
        'Basic analytics dashboard',
        'Standard ad placement',
        'Email support',
        'Monthly performance reports',
        'Access to vendor marketplace',
        'Basic targeting options'
      ]
    },
    {
      id: 'pro',
      name: 'Pro Analytics',
      price: '$799',
      icon: <BarChart3 className="w-5 h-5 text-purple-400" />,
      color: 'purple',
      gradient: 'from-purple-600 to-purple-700',
      popular: true,
      description: 'For growing businesses ready to scale',
      features: [
        'All Basic features included',
        'Up to 20 active campaigns',
        'Advanced analytics & reporting',
        'Priority ad placement',
        'A/B testing tools',
        'Dedicated account manager',
        'Priority support (4hr response)',
        'Custom audience targeting',
        'Conversion tracking',
        'Campaign optimization tools'
      ]
    },
    {
      id: 'enterprise',
      name: 'Enterprise Package',
      price: '$2,499',
      icon: <Crown className="w-5 h-5 text-orange-400" />,
      color: 'orange',
      gradient: 'from-orange-600 to-orange-700',
      description: 'Complete advertising solution for large organizations',
      features: [
        'All Pro features included',
        'Unlimited campaigns',
        'White-label advertising options',
        'API access for automation',
        'Custom integrations',
        'Dedicated success team',
        '24/7 premium support',
        'Advanced CRM integration',
        'Lead management system',
        'Custom reporting & BI tools',
        'Exclusive vendor partnerships',
        'Co-marketing opportunities',
        'Featured placement guarantees',
        'Quarterly business reviews'
      ]
    }
  ];

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
      <div className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-2xl max-w-7xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-orange-600/20 to-orange-700/20 border-b border-orange-500/30 p-6 flex items-center justify-between z-10">
          <div>
            <h2 className="text-3xl font-bold text-white flex items-center gap-3">
              <Sparkles className="w-8 h-8 text-orange-400" />
              Choose Your Advertising Plan
            </h2>
            <p className="text-orange-200 mt-1">
              Select the perfect tier to reach your target audience
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition"
          >
            <X className="w-6 h-6 text-gray-400" />
          </button>
        </div>

        <div className="p-8">
          {/* Plans Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {plans.map((plan, index) => (
              <div
                key={plan.id}
                className={`relative bg-[#1A1A1A] border ${
                  plan.popular ? 'border-orange-500/50' : 'border-[#2A2A2A]'
                } rounded-xl p-6 flex flex-col ${
                  plan.popular ? 'ring-2 ring-orange-500/20' : ''
                }`}
              >
                {/* Popular Badge */}
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="px-4 py-1 bg-gradient-to-r from-orange-600 to-orange-700 text-white text-xs font-bold rounded-full border border-orange-500/50 shadow-lg shadow-orange-500/20">
                      MOST POPULAR
                    </span>
                  </div>
                )}

                {/* Plan Header */}
                <div className="mb-6 mt-2">
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${plan.gradient} flex items-center justify-center`}>
                      {plan.icon}
                    </div>
                    <h3 className="text-2xl font-bold text-white">{plan.name}</h3>
                  </div>
                  <p className="text-gray-400 text-sm mb-4">
                    {plan.description}
                  </p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-bold text-white">{plan.price}</span>
                    <span className="text-gray-400">/month</span>
                  </div>
                </div>

                {/* Features List */}
                <div className="flex-1 mb-6">
                  <div className="text-sm font-medium text-gray-300 mb-3">What's included:</div>
                  <ul className="space-y-2.5">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm">
                        <Check className={`w-4 h-4 text-${plan.color}-400 flex-shrink-0 mt-0.5`} />
                        <span className="text-gray-300">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* CTA Button */}
                <button
                  onClick={() => onSelectPlan(plan.id)}
                  className={`w-full px-6 py-3 ${
                    plan.popular
                      ? 'bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 shadow-lg shadow-orange-500/20'
                      : 'bg-[#2A2A2A] hover:bg-[#333] border border-[#3A3A3A]'
                  } text-white rounded-lg font-semibold transition flex items-center justify-center gap-2`}
                >
                  Get Started
                  <Zap className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          {/* Additional Info */}
          <div className="mt-8 p-6 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-lg bg-orange-500/20 flex items-center justify-center text-orange-400 flex-shrink-0">
                <Target className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-white font-semibold mb-2">All plans include:</h4>
                <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-400">
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-orange-400" />
                    <span>No setup fees</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-orange-400" />
                    <span>Cancel anytime</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-orange-400" />
                    <span>Real-time dashboard</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-orange-400" />
                    <span>ROI tracking</span>
                  </li>
                </ul>
                <p className="text-sm text-gray-400 mt-3">
                  <strong className="text-white">Need a custom plan?</strong> Contact our sales team for enterprise solutions tailored to your needs.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-[#1A1A1A] border-t border-[#2A2A2A] p-6">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-400">
              All plans come with a 30-day money-back guarantee
            </p>
            <button
              onClick={onClose}
              className="px-6 py-2 bg-[#2A2A2A] hover:bg-[#3A3A3A] border border-[#3A3A3A] text-white rounded-lg font-semibold transition-all"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
