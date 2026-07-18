/**
 * Customer Subscription Selection Modal
 * Allows customers to choose between free and premium subscription plans
 */

import { X, Check, Sparkles, Star, Zap, Shield, Clock, HeadphonesIcon } from 'lucide-react';

interface CustomerSubscriptionSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectFree: () => void;
  onSelectPaid: () => void;
}

export default function CustomerSubscriptionSelectionModal({
  isOpen,
  onClose,
  onSelectFree,
  onSelectPaid,
}: CustomerSubscriptionSelectionModalProps) {
  if (!isOpen) return null;

  const freePlanFeatures = [
    'Submit basic work requests',
    'Track project status',
    'View quotes and estimates',
    'Standard support (48hr response)',
    'Basic communication tools',
    'Access to vendor marketplace'
  ];

  const premiumPlanFeatures = [
    'All free features included',
    'Priority work request processing',
    'Advanced project management dashboard',
    'AI-powered floor plans & designs',
    'Dedicated account manager',
    'Priority support (4hr response)',
    'Detailed analytics & reporting',
    'Exclusive vendor discounts',
    'Custom branding options',
    'Advanced scheduling tools'
  ];

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#0F0F0F] border border-[#1a1a1a] rounded-lg max-w-5xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-[#0F0F0F] border-b border-[#1a1a1a] p-6 flex items-center justify-between z-10">
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <Star className="w-6 h-6 text-[#ea580c]" />
              Choose Your Plan
            </h2>
            <p className="text-sm text-gray-400 mt-1">
              Select the plan that best fits your property management needs
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-[#1a1a1a] rounded-lg transition"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div className="p-6">
          {/* Plans Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Free Plan */}
            <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-6 flex flex-col">
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="w-5 h-5 text-blue-400" />
                  <h3 className="text-xl font-bold text-white">Free Plan</h3>
                </div>
                <p className="text-gray-400 text-sm mb-4">
                  Perfect for homeowners with occasional maintenance needs
                </p>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold text-white">$0</span>
                  <span className="text-gray-400">/month</span>
                </div>
              </div>

              <div className="flex-1 mb-6">
                <div className="text-sm font-medium text-gray-300 mb-3">What's included:</div>
                <ul className="space-y-2.5">
                  {freePlanFeatures.map((feature, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm">
                      <Check className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-300">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <button
                onClick={onSelectFree}
                className="w-full px-6 py-3 bg-[#2a2a2a] hover:bg-[#333] border border-[#3a3a3a] text-white rounded-lg font-medium transition flex items-center justify-center gap-2"
              >
                Get Started Free
              </button>
            </div>

            {/* Premium Plan */}
            <div className="bg-gradient-to-br from-[#ea580c]/10 to-[#c2410c]/5 border-2 border-[#ea580c] rounded-lg p-6 flex flex-col relative overflow-hidden">
              {/* Popular Badge */}
              <div className="absolute -top-1 -right-1">
                <div className="bg-gradient-to-r from-[#ea580c] to-[#c2410c] text-white text-xs font-bold px-4 py-1.5 rounded-bl-lg flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  MOST POPULAR
                </div>
              </div>

              <div className="mb-6">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="w-5 h-5 text-[#ea580c]" />
                  <h3 className="text-xl font-bold text-white">Premium Plan</h3>
                </div>
                <p className="text-gray-400 text-sm mb-4">
                  For property managers and businesses requiring advanced features
                </p>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold text-white">$49</span>
                  <span className="text-gray-400">/month</span>
                </div>
                <p className="text-xs text-[#ea580c] mt-2 font-medium">
                  Save 20% with annual billing
                </p>
              </div>

              <div className="flex-1 mb-6">
                <div className="text-sm font-medium text-gray-300 mb-3">Everything in Free, plus:</div>
                <ul className="space-y-2.5">
                  {premiumPlanFeatures.slice(1).map((feature, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm">
                      <Check className="w-4 h-4 text-[#ea580c] flex-shrink-0 mt-0.5" />
                      <span className="text-gray-300">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <button
                onClick={onSelectPaid}
                className="w-full px-6 py-3 bg-gradient-to-r from-[#ea580c] to-[#c2410c] hover:from-[#c2410c] hover:to-[#9a3412] text-white rounded-lg font-medium transition flex items-center justify-center gap-2 shadow-lg shadow-[#ea580c]/20"
              >
                <Star className="w-4 h-4" />
                Start Premium Trial
              </button>
              <p className="text-xs text-gray-400 text-center mt-2">
                14-day free trial • No credit card required
              </p>
            </div>
          </div>

          {/* Feature Comparison Table */}
          <div className="mt-8 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg overflow-hidden">
            <div className="p-4 border-b border-[#2a2a2a]">
              <h4 className="text-lg font-semibold text-white">Feature Comparison</h4>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#2a2a2a] bg-[#0F0F0F]">
                    <th className="text-left px-4 py-3 text-sm font-medium text-gray-400">Feature</th>
                    <th className="text-center px-4 py-3 text-sm font-medium text-gray-400">Free</th>
                    <th className="text-center px-4 py-3 text-sm font-medium text-[#ea580c]">Premium</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2a2a2a]">
                  <tr>
                    <td className="px-4 py-3 text-sm text-gray-300">Work Requests</td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-gray-400">5/month</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-[#ea580c] font-medium">Unlimited</span>
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-sm text-gray-300">Support Response Time</td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-gray-400">48 hours</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-[#ea580c] font-medium">4 hours</span>
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-sm text-gray-300">AI Floor Plans</td>
                    <td className="px-4 py-3 text-center">
                      <X className="w-4 h-4 text-gray-600 mx-auto" />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Check className="w-4 h-4 text-[#ea580c] mx-auto" />
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-sm text-gray-300">Dedicated Account Manager</td>
                    <td className="px-4 py-3 text-center">
                      <X className="w-4 h-4 text-gray-600 mx-auto" />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Check className="w-4 h-4 text-[#ea580c] mx-auto" />
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-sm text-gray-300">Analytics & Reporting</td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-gray-400">Basic</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-[#ea580c] font-medium">Advanced</span>
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-sm text-gray-300">Vendor Discounts</td>
                    <td className="px-4 py-3 text-center">
                      <X className="w-4 h-4 text-gray-600 mx-auto" />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-[#ea580c] font-medium">Up to 15%</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Trust Indicators */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-4 flex items-center gap-3">
              <Shield className="w-8 h-8 text-green-400" />
              <div>
                <div className="text-sm font-medium text-white">Secure & Trusted</div>
                <div className="text-xs text-gray-400">Bank-level encryption</div>
              </div>
            </div>
            
            <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-4 flex items-center gap-3">
              <Clock className="w-8 h-8 text-blue-400" />
              <div>
                <div className="text-sm font-medium text-white">Cancel Anytime</div>
                <div className="text-xs text-gray-400">No long-term contracts</div>
              </div>
            </div>
            
            <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-4 flex items-center gap-3">
              <HeadphonesIcon className="w-8 h-8 text-purple-400" />
              <div>
                <div className="text-sm font-medium text-white">24/7 Support</div>
                <div className="text-xs text-gray-400">Always here to help</div>
              </div>
            </div>
          </div>

          {/* FAQ Note */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-400">
              Have questions? Contact our team at{' '}
              <a href="mailto:support@example.com" className="text-[#ea580c] hover:underline">
                support@example.com
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
