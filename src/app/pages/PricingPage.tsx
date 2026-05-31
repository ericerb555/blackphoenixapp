/**
 * Pricing Page - Customer-Facing Subscription Plans
 *
 * Public page that displays all available subscription plans
 * for customers, vendors, subcontractors, and advertisers
 */

import { SubscriptionPlans } from '../components/SubscriptionPlans';
import { ArrowLeft, Sparkles } from 'lucide-react';

interface PricingPageProps {
  onNavigate?: (page: string) => void;
}

export default function PricingPage({ onNavigate }: PricingPageProps) {
  const handleSelectPlan = (planId: string) => {
    console.log('Selected plan:', planId);
    // Navigate to sign up with the selected plan
    if (onNavigate) {
      onNavigate('signup');
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] py-12 px-6 flex flex-col items-center">
      <div className="w-full max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500/10 border border-orange-500/30 rounded-full mb-6">
            <Sparkles className="w-4 h-4 text-orange-400" />
            <span className="text-sm font-semibold text-orange-400">Founding Member Pricing</span>
          </div>

          <h1 className="text-5xl font-bold text-white mb-4">
            Choose Your Plan
          </h1>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-8">
            Get started with 6 months free and lock in exclusive founding member pricing
          </p>

          {/* Back to Home Button */}
          <button
            onClick={() => onNavigate?.('landing')}
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#1A1A1A] border border-[#2A2A2A] hover:border-orange-500/30 rounded-xl text-gray-300 hover:text-white font-semibold transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </button>
        </div>

        {/* Subscription Plans Component */}
        <div className="w-full">
          <SubscriptionPlans onSelectPlan={handleSelectPlan} />
        </div>

        {/* Footer CTA */}
        <div className="mt-16 text-center w-full">
          <div className="bg-gradient-to-r from-orange-600/20 via-red-600/20 to-pink-600/20 border border-orange-500/30 rounded-2xl p-8">
            <h3 className="text-2xl font-bold text-white mb-3">
              Need Help Choosing?
            </h3>
            <p className="text-gray-300 mb-6 max-w-2xl mx-auto">
              Our team is here to help you find the perfect plan for your needs.
              Contact us for a personalized consultation.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                onClick={() => onNavigate?.('signup')}
                className="px-8 py-4 bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 text-white font-bold rounded-xl shadow-lg transition-all"
              >
                Create Free Account
              </button>
              <button
                onClick={() => onNavigate?.('landing')}
                className="px-8 py-4 bg-[#1A1A1A] border border-[#2A2A2A] hover:border-orange-500/30 text-white font-semibold rounded-xl transition-all"
              >
                Contact Sales
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
