/**
 * Subscription Plans - Complete Pricing System
 * 
 * Features:
 * - 6 months free for ALL subscriptions
 * - 30% lifetime discount for founding members
 * - Multiple plan tiers for each user type
 * - Vendor, Subcontractor, and Advertiser plans
 */

import { useState } from 'react';
import {
  Crown, Zap, Rocket, Building2, Wrench, Megaphone, Star,
  Check, X, Sparkles, TrendingUp, Shield, Award, Target,
  Users, DollarSign, Calendar, Gift, Tag, ChevronRight, Flame, Home
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import {
  ALL_SUBSCRIPTION_PLANS,
  FOUNDING_SUBSCRIBER_CONFIG,
  getPlansByCategory,
  type SubscriptionPlan
} from '../config/subscriptionPlans';

type PlanCategory = 'customer' | 'vendor' | 'subcontractor' | 'advertiser';
type PricingDisplay = 'regular' | 'first12';

const subscriptionPlans: SubscriptionPlan[] = ALL_SUBSCRIPTION_PLANS;

interface SubscriptionPlansProps {
  onSelectPlan?: (planId: string) => void;
}

export function SubscriptionPlans({ onSelectPlan }: SubscriptionPlansProps) {
  const [activeCategory, setActiveCategory] = useState<PlanCategory>('customer');
  const [pricingDisplay, setPricingDisplay] = useState<PricingDisplay>('first12');
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

  const filteredPlans = getPlansByCategory(activeCategory);

  const getColorClasses = (color: string, variant: 'bg' | 'text' | 'border' | 'shadow') => {
    const colors: Record<string, Record<string, string>> = {
      green: {
        bg: 'bg-green-600/20',
        text: 'text-green-400',
        border: 'border-green-500/30',
        shadow: 'shadow-green-500/20',
      },
      blue: {
        bg: 'bg-blue-600/20',
        text: 'text-blue-400',
        border: 'border-blue-500/30',
        shadow: 'shadow-blue-500/20',
      },
      orange: {
        bg: 'bg-orange-600/20',
        text: 'text-orange-400',
        border: 'border-orange-500/30',
        shadow: 'shadow-orange-500/20',
      },
      pink: {
        bg: 'bg-pink-600/20',
        text: 'text-pink-400',
        border: 'border-pink-500/30',
        shadow: 'shadow-pink-500/20',
      },
    };
    return colors[color][variant];
  };

  const handleSelectPlan = (planId: string) => {
    setSelectedPlan(planId);
    if (onSelectPlan) {
      onSelectPlan(planId);
    }
    toast.success('Plan selected! Proceed to checkout.');
  };

  return (
    <div className="space-y-8">
      {/* First 12 Subscribers Banner */}
      <div className="bg-gradient-to-r from-yellow-600/20 via-orange-600/20 to-red-600/20 border border-yellow-500/30 rounded-xl p-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-yellow-500/20 rounded-full flex items-center justify-center">
            <Crown className="w-8 h-8 text-yellow-400" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-2xl font-bold text-white">🔥 First 12 Subscribers Only</h2>
              <span className="px-3 py-1 bg-red-500/20 text-red-400 text-sm font-bold rounded-full border border-red-500/30 flex items-center gap-1">
                <Flame className="w-4 h-4" />
                LIMITED SPOTS
              </span>
            </div>
            <p className="text-zinc-300 text-lg mb-3">
              Be one of the first 12 subscribers and receive <strong className="text-yellow-400">HALF PRICE PRESSURE WASHING</strong> + <strong className="text-green-400">15% OFF BLACK PHOENIX SERVICES FOR LIFE</strong>
            </p>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Tag className="w-5 h-5 text-yellow-400" />
                <span className="text-yellow-400 font-semibold">50% off pressure washing</span>
              </div>
              <div className="flex items-center gap-2">
                <Gift className="w-5 h-5 text-green-400" />
                <span className="text-green-400 font-semibold">15% off all services for life</span>
              </div>
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-purple-400" />
                <span className="text-purple-400 font-semibold">Founding Subscriber badge</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Pricing Toggle */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-bold text-white mb-2">Choose Your Plan</h3>
          <p className="text-zinc-400">Select the perfect subscription for your business</p>
        </div>
        
        <div className="flex items-center gap-3 bg-zinc-900 p-1 rounded-lg">
          <button
            onClick={() => setPricingDisplay('regular')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              pricingDisplay === 'regular'
                ? 'bg-zinc-700 text-white'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Regular Pricing
          </button>
          <button
            onClick={() => setPricingDisplay('first12')}
            className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
              pricingDisplay === 'first12'
                ? 'bg-gradient-to-r from-yellow-600 to-orange-600 text-white shadow-lg'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Crown className="w-4 h-4" />
            First 12 Subscribers
          </button>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex gap-3 bg-[#1A1A1A] border border-zinc-800 p-2 rounded-xl">
        <button
          onClick={() => setActiveCategory('customer')}
          className={`flex-1 py-3 px-6 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${
            activeCategory === 'customer'
              ? 'bg-green-600/20 text-green-400 border border-green-500/30'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
          }`}
        >
          <Home className="w-5 h-5" />
          Customer Plans
        </button>
        <button
          onClick={() => setActiveCategory('vendor')}
          className={`flex-1 py-3 px-6 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${
            activeCategory === 'vendor'
              ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
          }`}
        >
          <Building2 className="w-5 h-5" />
          Vendor Plans
        </button>
        <button
          onClick={() => setActiveCategory('subcontractor')}
          className={`flex-1 py-3 px-6 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${
            activeCategory === 'subcontractor'
              ? 'bg-orange-600/20 text-orange-400 border border-orange-500/30'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
          }`}
        >
          <Wrench className="w-5 h-5" />
          Subcontractor Plans
        </button>
        <button
          onClick={() => setActiveCategory('advertiser')}
          className={`flex-1 py-3 px-6 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${
            activeCategory === 'advertiser'
              ? 'bg-pink-600/20 text-pink-400 border border-pink-500/30'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
          }`}
        >
          <Megaphone className="w-5 h-5" />
          Advertiser Plans
        </button>
      </div>

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {filteredPlans.map((plan) => {
          // Dynamically select icon based on category
          const Icon = plan.category === 'customer' ? Home : plan.category === 'vendor' ? Building2 : plan.category === 'subcontractor' ? Wrench : Megaphone;
          const color = plan.category === 'customer' ? 'green' : plan.category === 'vendor' ? 'blue' : plan.category === 'subcontractor' ? 'orange' : 'pink';
          const isSelected = selectedPlan === plan.id;
          const displayPrice = plan.regularPrice;
          const isPremium = plan.id === 'customer-premium';
          const showFirst12Benefits = pricingDisplay === 'first12' && plan.category === 'customer';

          return (
            <div
              key={plan.id}
              className={`relative bg-[#1A1A1A] rounded-xl overflow-hidden transition-all ${
                plan.highlighted
                  ? `border-2 ${getColorClasses(color, 'border')} shadow-xl ${getColorClasses(color, 'shadow')}`
                  : 'border border-zinc-800 hover:border-zinc-700'
              } ${isSelected ? 'ring-2 ring-[#ea580c]' : ''}`}
            >
              {/* Popular Badge */}
              {plan.popular && (
                <div className="absolute top-4 right-4 z-10">
                  <div className="px-3 py-1 bg-[#ea580c] text-white text-xs font-bold rounded-full flex items-center gap-1">
                    <Star className="w-3 h-3" />
                    MOST POPULAR
                  </div>
                </div>
              )}

              {/* Highlighted Badge */}
              {plan.highlighted && (
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-yellow-500 via-orange-500 to-red-500" />
              )}

              <div className="p-6 space-y-6">
                {/* Header */}
                <div>
                  <div className={`w-14 h-14 ${getColorClasses(color, 'bg')} rounded-xl flex items-center justify-center mb-4`}>
                    <Icon className={`w-7 h-7 ${getColorClasses(color, 'text')}`} />
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-2">{plan.name}</h3>
                  <p className="text-zinc-400 text-sm">{plan.tagline}</p>
                </div>

                {/* Pricing */}
                <div>
                  <div className="flex items-baseline gap-2 mb-2">
                    <span className="text-4xl font-bold text-white">${displayPrice}</span>
                    <span className="text-zinc-400">/month</span>
                  </div>

                  {showFirst12Benefits && (
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm">
                        <Tag className="w-4 h-4 text-yellow-400" />
                        <span className="text-yellow-400 font-semibold">Half price pressure washing</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Gift className="w-4 h-4 text-green-400" />
                        <span className="text-green-400 font-semibold">15% off services for life</span>
                      </div>
                    </div>
                  )}

                  {isPremium && pricingDisplay === 'first12' && (
                    <div className="mt-2 flex items-center gap-2 text-sm">
                      <Star className="w-4 h-4 text-purple-400" />
                      <span className="text-purple-400 font-semibold">20% off for life + 5-year loyalty bonus</span>
                    </div>
                  )}
                </div>

                {/* Features */}
                <div className="space-y-3">
                  {plan.features.map((feature, idx) => (
                    <div key={idx} className="flex items-start gap-3">
                      <Check className={`w-5 h-5 ${getColorClasses(color, 'text')} flex-shrink-0 mt-0.5`} />
                      <span className="text-sm text-zinc-300">{feature}</span>
                    </div>
                  ))}
                </div>

                {/* Limits */}
                <div className="pt-4 border-t border-zinc-800 space-y-2">
                  {plan.limits.projects && (
                    <div className="flex justify-between text-sm">
                      <span className="text-zinc-400">Projects/month</span>
                      <span className="text-white font-medium">
                        {plan.limits.projects === 999999 ? 'Unlimited' : plan.limits.projects}
                      </span>
                    </div>
                  )}
                  {plan.limits.quotes && (
                    <div className="flex justify-between text-sm">
                      <span className="text-zinc-400">Quotes/month</span>
                      <span className="text-white font-medium">
                        {plan.limits.quotes === 999999 ? 'Unlimited' : plan.limits.quotes}
                      </span>
                    </div>
                  )}
                  {plan.limits.leads !== undefined && (
                    <div className="flex justify-between text-sm">
                      <span className="text-zinc-400">Monthly leads</span>
                      <span className="text-white font-medium">
                        {plan.limits.leads === 999999 ? 'Unlimited' : plan.limits.leads}
                      </span>
                    </div>
                  )}
                  {plan.limits.campaigns !== undefined && (
                    <div className="flex justify-between text-sm">
                      <span className="text-zinc-400">Active campaigns</span>
                      <span className="text-white font-medium">
                        {plan.limits.campaigns === 999999 ? 'Unlimited' : plan.limits.campaigns}
                      </span>
                    </div>
                  )}
                  {plan.limits.impressions !== undefined && (
                    <div className="flex justify-between text-sm">
                      <span className="text-zinc-400">Impressions/month</span>
                      <span className="text-white font-medium">
                        {plan.limits.impressions === 999999 ? 'Unlimited' : plan.limits.impressions.toLocaleString()}
                      </span>
                    </div>
                  )}
                  {plan.limits.storage && (
                    <div className="flex justify-between text-sm">
                      <span className="text-zinc-400">Storage</span>
                      <span className="text-white font-medium">{plan.limits.storage}</span>
                    </div>
                  )}
                  {plan.limits.teamMembers && (
                    <div className="flex justify-between text-sm">
                      <span className="text-zinc-400">Team members</span>
                      <span className="text-white font-medium">
                        {plan.limits.teamMembers === 999999 ? 'Unlimited' : plan.limits.teamMembers}
                      </span>
                    </div>
                  )}
                  {plan.limits.support && (
                    <div className="flex justify-between text-sm">
                      <span className="text-zinc-400">Support</span>
                      <span className="text-white font-medium text-right">{plan.limits.support}</span>
                    </div>
                  )}
                </div>

                {/* CTA Button */}
                <button
                  onClick={() => handleSelectPlan(plan.id)}
                  className={`w-full py-3 px-6 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 ${
                    plan.highlighted || plan.popular
                      ? 'bg-[#ea580c] hover:bg-[#c2410c] text-white shadow-lg shadow-[#ea580c]/20'
                      : 'bg-zinc-800 hover:bg-zinc-700 text-white'
                  }`}
                >
                  {pricingDisplay === 'first12' && plan.category === 'customer' ? 'Claim First 12 Spot' : 'Get Started'}
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer Notes */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
          <div>
            <Shield className="w-8 h-8 text-green-400 mx-auto mb-3" />
            <h4 className="font-semibold text-white mb-2">Cancel Anytime</h4>
            <p className="text-sm text-zinc-400">No long-term contracts. Cancel or change plans anytime.</p>
          </div>
          <div>
            <TrendingUp className="w-8 h-8 text-blue-400 mx-auto mb-3" />
            <h4 className="font-semibold text-white mb-2">Scale As You Grow</h4>
            <p className="text-sm text-zinc-400">Upgrade or downgrade plans based on your business needs.</p>
          </div>
          <div>
            <Users className="w-8 h-8 text-purple-400 mx-auto mb-3" />
            <h4 className="font-semibold text-white mb-2">Dedicated Support</h4>
            <p className="text-sm text-zinc-400">Expert support team ready to help you succeed.</p>
          </div>
        </div>
      </div>
    </div>
  );
}