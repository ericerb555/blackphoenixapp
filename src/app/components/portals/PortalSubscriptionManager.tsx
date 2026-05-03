/**
 * Portal Subscription Manager
 * 
 * Manages subscription tiers for all business portals:
 * - Free: Basic access
 * - Basic: Export + Social Media
 * - Pro: Full branding + Advanced features
 * - Enterprise: Unlimited + Premium support
 */

import { useState } from 'react';
import {
  Crown, Check, X, Sparkles, Zap, Building2, Download,
  Palette, Upload, Globe, Share2, BarChart3, Users,
  MessageSquare, Headphones, Shield, Infinity
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';

interface SubscriptionTier {
  id: 'free' | 'basic' | 'pro' | 'enterprise';
  name: string;
  price: number;
  period: 'month' | 'year';
  description: string;
  features: {
    name: string;
    included: boolean;
    icon: any;
  }[];
  limits: {
    exports: number;
    storage: string;
    users: number;
  };
  popular?: boolean;
}

interface PortalSubscriptionManagerProps {
  portalType: 'employee' | 'subcontractor' | 'vendor' | 'professional';
  currentTier: 'free' | 'basic' | 'pro' | 'enterprise';
  onUpgrade?: (newTier: string) => void;
}

export default function PortalSubscriptionManager({
  portalType,
  currentTier,
  onUpgrade
}: PortalSubscriptionManagerProps) {
  const [billingPeriod, setBillingPeriod] = useState<'month' | 'year'>('month');
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [selectedTier, setSelectedTier] = useState<SubscriptionTier | null>(null);

  const tiers: SubscriptionTier[] = [
    {
      id: 'free',
      name: 'Free',
      price: 0,
      period: 'month',
      description: 'Get started with basic features',
      features: [
        { name: 'Basic Portal Access', included: true, icon: Building2 },
        { name: 'Company Information', included: true, icon: Building2 },
        { name: 'Default Branding', included: true, icon: Palette },
        { name: 'Social Media Export', included: false, icon: Download },
        { name: 'Custom Colors', included: false, icon: Palette },
        { name: 'Logo Upload', included: false, icon: Upload },
        { name: 'Advanced Analytics', included: false, icon: BarChart3 },
        { name: 'Priority Support', included: false, icon: Headphones }
      ],
      limits: {
        exports: 0,
        storage: '100MB',
        users: 1
      }
    },
    {
      id: 'basic',
      name: 'Basic',
      price: billingPeriod === 'month' ? 29 : 290,
      period: billingPeriod,
      description: 'Perfect for growing businesses',
      features: [
        { name: 'Everything in Free', included: true, icon: Check },
        { name: 'Social Media Export', included: true, icon: Download },
        { name: 'Social Media Links', included: true, icon: Share2 },
        { name: '10 Exports per Month', included: true, icon: Download },
        { name: 'Custom Colors', included: false, icon: Palette },
        { name: 'Logo Upload', included: false, icon: Upload },
        { name: 'Advanced Analytics', included: false, icon: BarChart3 },
        { name: 'Priority Support', included: false, icon: Headphones }
      ],
      limits: {
        exports: 10,
        storage: '1GB',
        users: 3
      }
    },
    {
      id: 'pro',
      name: 'Pro',
      price: billingPeriod === 'month' ? 79 : 790,
      period: billingPeriod,
      description: 'Full branding control',
      popular: true,
      features: [
        { name: 'Everything in Basic', included: true, icon: Check },
        { name: 'Custom Colors & Branding', included: true, icon: Palette },
        { name: 'Logo Upload', included: true, icon: Upload },
        { name: '50 Exports per Month', included: true, icon: Download },
        { name: 'Advanced Analytics', included: true, icon: BarChart3 },
        { name: 'White Label Options', included: true, icon: Building2 },
        { name: 'API Access', included: true, icon: Zap },
        { name: 'Priority Support', included: true, icon: Headphones }
      ],
      limits: {
        exports: 50,
        storage: '10GB',
        users: 10
      }
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      price: billingPeriod === 'month' ? 199 : 1990,
      period: billingPeriod,
      description: 'Unlimited power & support',
      features: [
        { name: 'Everything in Pro', included: true, icon: Check },
        { name: 'Unlimited Exports', included: true, icon: Infinity },
        { name: 'Unlimited Storage', included: true, icon: Infinity },
        { name: 'Unlimited Users', included: true, icon: Users },
        { name: 'Custom Integrations', included: true, icon: Zap },
        { name: 'Dedicated Support', included: true, icon: Headphones },
        { name: 'SLA Guarantee', included: true, icon: Shield },
        { name: 'Custom Development', included: true, icon: Sparkles }
      ],
      limits: {
        exports: -1,
        storage: 'Unlimited',
        users: -1
      }
    }
  ];

  const handleUpgrade = (tier: SubscriptionTier) => {
    if (tier.id === 'free') {
      toast.info('You are already on the Free plan');
      return;
    }

    setSelectedTier(tier);
    setShowUpgradeModal(true);
  };

  const confirmUpgrade = () => {
    if (!selectedTier) return;

    // In real app, process payment and update subscription
    if (onUpgrade) {
      onUpgrade(selectedTier.id);
    }

    toast.success(`Upgraded to ${selectedTier.name}!`, {
      description: 'Your new features are now active'
    });

    setShowUpgradeModal(false);
    setSelectedTier(null);
  };

  const getTierBadgeColor = (tierId: string) => {
    switch (tierId) {
      case 'basic': return 'from-blue-600 to-blue-700';
      case 'pro': return 'from-[#ea580c] to-[#c2410c]';
      case 'enterprise': return 'from-purple-600 to-purple-700';
      default: return 'from-gray-600 to-gray-700';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-white mb-3 flex items-center justify-center gap-3">
          <Crown className="w-10 h-10 text-[#ea580c]" />
          {portalType.charAt(0).toUpperCase() + portalType.slice(1)} Portal Plans
        </h1>
        <p className="text-xl text-gray-400 mb-6">
          Choose the perfect plan for your business needs
        </p>

        {/* Billing Toggle */}
        <div className="inline-flex items-center gap-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-2">
          <button
            onClick={() => setBillingPeriod('month')}
            className={`px-6 py-2 rounded-lg font-medium transition ${
              billingPeriod === 'month'
                ? 'bg-gradient-to-r from-[#ea580c] to-[#c2410c] text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setBillingPeriod('year')}
            className={`px-6 py-2 rounded-lg font-medium transition ${
              billingPeriod === 'year'
                ? 'bg-gradient-to-r from-[#ea580c] to-[#c2410c] text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Yearly
            <span className="ml-2 px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded font-bold">
              Save 17%
            </span>
          </button>
        </div>
      </div>

      {/* Current Plan Badge */}
      <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 border border-blue-500/30 rounded-xl p-4 text-center">
        <p className="text-white font-bold">
          Current Plan: <span className="text-[#ea580c]">{currentTier.charAt(0).toUpperCase() + currentTier.slice(1)}</span>
        </p>
      </div>

      {/* Pricing Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {tiers.map((tier) => {
          const isCurrentTier = tier.id === currentTier;
          
          return (
            <div
              key={tier.id}
              className={`relative bg-[#1A1A1A] rounded-2xl border-2 transition-all hover:scale-105 ${
                tier.popular
                  ? 'border-[#ea580c] shadow-xl shadow-[#ea580c]/20'
                  : isCurrentTier
                  ? 'border-green-500'
                  : 'border-[#2A2A2A]'
              }`}
            >
              {/* Popular Badge */}
              {tier.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <div className="px-4 py-2 bg-gradient-to-r from-[#ea580c] to-[#c2410c] rounded-full text-white text-sm font-bold shadow-lg">
                    Most Popular
                  </div>
                </div>
              )}

              {/* Current Tier Badge */}
              {isCurrentTier && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <div className="px-4 py-2 bg-gradient-to-r from-green-600 to-green-700 rounded-full text-white text-sm font-bold shadow-lg flex items-center gap-1">
                    <Check className="w-4 h-4" />
                    Current Plan
                  </div>
                </div>
              )}

              <div className="p-6 space-y-6">
                {/* Header */}
                <div className="text-center">
                  <h3 className="text-2xl font-bold text-white mb-2">{tier.name}</h3>
                  <p className="text-sm text-gray-400 mb-4">{tier.description}</p>
                  
                  <div className="flex items-baseline justify-center gap-2">
                    <span className="text-5xl font-bold text-white">${tier.price}</span>
                    <span className="text-gray-400">/{tier.period}</span>
                  </div>
                </div>

                {/* Features */}
                <div className="space-y-3">
                  {tier.features.map((feature, idx) => {
                    const Icon = feature.icon;
                    return (
                      <div key={idx} className="flex items-center gap-3">
                        {feature.included ? (
                          <Check className="w-5 h-5 text-green-400 flex-shrink-0" />
                        ) : (
                          <X className="w-5 h-5 text-gray-600 flex-shrink-0" />
                        )}
                        <span className={`text-sm ${feature.included ? 'text-gray-300' : 'text-gray-600'}`}>
                          {feature.name}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Limits */}
                <div className="pt-4 border-t border-[#2A2A2A] space-y-2 text-xs text-gray-400">
                  <div className="flex justify-between">
                    <span>Exports:</span>
                    <span className="font-medium text-white">
                      {tier.limits.exports === -1 ? 'Unlimited' : `${tier.limits.exports}/month`}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Storage:</span>
                    <span className="font-medium text-white">{tier.limits.storage}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Users:</span>
                    <span className="font-medium text-white">
                      {tier.limits.users === -1 ? 'Unlimited' : tier.limits.users}
                    </span>
                  </div>
                </div>

                {/* CTA Button */}
                <button
                  onClick={() => handleUpgrade(tier)}
                  disabled={isCurrentTier}
                  className={`w-full py-3 rounded-xl font-bold transition-all ${
                    isCurrentTier
                      ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                      : tier.popular
                      ? 'bg-gradient-to-r from-[#ea580c] to-[#c2410c] text-white hover:from-[#c2410c] hover:to-[#9a3412] shadow-lg shadow-[#ea580c]/20'
                      : 'bg-[#2A2A2A] text-white hover:bg-[#3A3A3A]'
                  }`}
                >
                  {isCurrentTier ? 'Current Plan' : tier.id === 'free' ? 'Get Started' : 'Upgrade Now'}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Feature Comparison Table */}
      <div className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] overflow-hidden mt-12">
        <div className="p-6 border-b border-[#2A2A2A]">
          <h2 className="text-2xl font-bold text-white">Feature Comparison</h2>
          <p className="text-gray-400 mt-1">Compare all features across plans</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[#0A0A0A] border-b border-[#2A2A2A]">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-bold text-white">Feature</th>
                {tiers.map(tier => (
                  <th key={tier.id} className="px-6 py-4 text-center text-sm font-bold text-white">
                    {tier.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2A2A2A]">
              {[
                'Portal Access',
                'Company Information',
                'Social Media Export',
                'Custom Branding',
                'Logo Upload',
                'Advanced Analytics',
                'Priority Support'
              ].map((feature, idx) => (
                <tr key={idx} className="hover:bg-[#0A0A0A]">
                  <td className="px-6 py-4 text-sm text-gray-300">{feature}</td>
                  {tiers.map(tier => {
                    const hasFeature = tier.features.some(f => 
                      f.name.toLowerCase().includes(feature.toLowerCase()) && f.included
                    );
                    return (
                      <td key={tier.id} className="px-6 py-4 text-center">
                        {hasFeature ? (
                          <Check className="w-5 h-5 text-green-400 mx-auto" />
                        ) : (
                          <X className="w-5 h-5 text-gray-600 mx-auto" />
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Upgrade Modal */}
      {showUpgradeModal && selectedTier && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <div className="bg-[#0A0A0A] rounded-2xl border border-[#2A2A2A] w-full max-w-lg">
            <div className="p-6 border-b border-[#2A2A2A]">
              <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                <Crown className="w-7 h-7 text-[#ea580c]" />
                Upgrade to {selectedTier.name}
              </h2>
            </div>

            <div className="p-6 space-y-6">
              <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-6">
                <div className="text-center mb-6">
                  <div className="flex items-baseline justify-center gap-2 mb-2">
                    <span className="text-5xl font-bold text-white">${selectedTier.price}</span>
                    <span className="text-gray-400">/{selectedTier.period}</span>
                  </div>
                  <p className="text-gray-400">{selectedTier.description}</p>
                </div>

                <div className="space-y-3">
                  <p className="text-sm font-bold text-white mb-3">You'll get:</p>
                  {selectedTier.features.filter(f => f.included).map((feature, idx) => (
                    <div key={idx} className="flex items-center gap-3">
                      <Check className="w-5 h-5 text-green-400 flex-shrink-0" />
                      <span className="text-sm text-gray-300">{feature.name}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowUpgradeModal(false)}
                  className="flex-1 px-6 py-3 bg-[#2A2A2A] hover:bg-[#3A3A3A] text-white rounded-lg transition font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmUpgrade}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-[#ea580c] to-[#c2410c] text-white rounded-lg hover:from-[#c2410c] hover:to-[#9a3412] transition font-bold shadow-lg shadow-[#ea580c]/20"
                >
                  Confirm Upgrade
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
