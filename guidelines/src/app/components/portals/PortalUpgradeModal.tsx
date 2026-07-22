/**
 * Portal Upgrade Modal
 *
 * Reusable modal for showing subscription and maintenance plan upgrades
 * Used across all portal types to upsell premium features
 */

import { useState } from 'react';
import { X, Check, Crown, Zap, Shield, Wrench, Clock, Star, Loader2 } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { projectId } from '../../utils/supabase/info';
import { supabase } from '../../lib/supabase';

const SERVER = `https://${projectId}.supabase.co/functions/v1/make-server-57095a78`;

interface SubscriptionTier {
  id: string;
  name: string;
  price: string;
  period: string;
  features: string[];
  recommended?: boolean;
  popular?: boolean;
}

interface MaintenancePlan {
  id: string;
  name: string;
  price: string;
  period: string;
  features: string[];
  responseTime: string;
  icon: any;
}

interface PortalUpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  portalType: 'customer' | 'vendor' | 'subcontractor' | 'advertiser' | 'investor' | 'employee' | 'property_manager' | 'landlord' | 'condo_manager';
  currentTier?: string;
  lockedFeature?: string; // The feature that triggered the modal
}

export default function PortalUpgradeModal({
  isOpen,
  onClose,
  portalType,
  currentTier = 'basic',
  lockedFeature
}: PortalUpgradeModalProps) {
  const [checkoutPlan, setCheckoutPlan] = useState<string | null>(null);
  if (!isOpen) return null;

  // Subscription tiers by portal type
  const subscriptionTiers: Record<string, SubscriptionTier[]> = {
    customer: [
      {
        id: 'basic',
        name: 'Basic',
        price: 'Free',
        period: 'forever',
        features: ['Submit work requests', 'View quotes', 'Track orders', 'Basic messaging']
      },
      {
        id: 'pro',
        name: 'Pro',
        price: '$29',
        period: '/month',
        features: ['Everything in Basic', 'Priority support', 'Project scheduling', 'Document storage', 'Mobile app access'],
        popular: true
      },
      {
        id: 'premium',
        name: 'Premium',
        price: '$79',
        period: '/month',
        features: ['Everything in Pro', 'Dedicated account manager', 'Advanced analytics', 'Custom integrations', '24/7 support'],
        recommended: true
      }
    ],
    vendor: [
      {
        id: 'basic',
        name: 'Basic',
        price: '$99',
        period: '/month',
        features: ['Product listings', 'Order management', 'Basic analytics', 'Email support']
      },
      {
        id: 'professional',
        name: 'Professional',
        price: '$199',
        period: '/month',
        features: ['Everything in Basic', 'API access', 'Advanced reporting', 'Priority listings', 'Phone support'],
        popular: true
      },
      {
        id: 'premium',
        name: 'Premium',
        price: '$399',
        period: '/month',
        features: ['Everything in Professional', 'Content Center access', 'Custom branding', 'Dedicated support', 'Marketing tools']
      },
      {
        id: 'elite',
        name: 'Elite',
        price: '$799',
        period: '/month',
        features: ['Everything in Premium', 'White-label solution', 'Custom development', 'Account manager', 'SLA guarantees'],
        recommended: true
      }
    ],
    subcontractor: [
      {
        id: 'basic',
        name: 'Basic',
        price: '$49',
        period: '/month',
        features: ['Job postings', 'Basic scheduling', 'Time tracking', 'Email notifications']
      },
      {
        id: 'pro',
        name: 'Pro',
        price: '$99',
        period: '/month',
        features: ['Everything in Basic', 'Advanced scheduling', 'Mobile crew app', 'GPS tracking', 'Priority support'],
        popular: true,
        recommended: true
      },
      {
        id: 'enterprise',
        name: 'Enterprise',
        price: '$199',
        period: '/month',
        features: ['Everything in Pro', 'Multi-crew management', 'Custom workflows', 'API access', 'Dedicated support']
      }
    ],
    advertiser: [
      {
        id: 'starter',
        name: 'Starter',
        price: '$199',
        period: '/month',
        features: ['Basic ad placement', '1000 impressions/mo', 'Email reporting', 'Standard targeting']
      },
      {
        id: 'growth',
        name: 'Growth',
        price: '$499',
        period: '/month',
        features: ['Everything in Starter', '5000 impressions/mo', 'Advanced targeting', 'A/B testing', 'Priority placement'],
        popular: true,
        recommended: true
      },
      {
        id: 'enterprise',
        name: 'Enterprise',
        price: '$999',
        period: '/month',
        features: ['Everything in Growth', 'Unlimited impressions', 'Custom campaigns', 'Dedicated manager', 'White-label options']
      }
    ],
    investor: [
      {
        id: 'basic',
        name: 'Basic',
        price: 'Free',
        period: 'forever',
        features: ['View opportunities', 'Basic analytics', 'Email updates']
      },
      {
        id: 'premium',
        name: 'Premium',
        price: '$299',
        period: '/month',
        features: ['Everything in Basic', 'Priority deal access', 'Advanced analytics', 'Direct messaging', 'Investment tools'],
        popular: true,
        recommended: true
      }
    ],
    employee: [
      {
        id: 'basic',
        name: 'Basic',
        price: 'Free',
        period: 'per employee',
        features: ['Time tracking', 'Schedule viewing', 'Basic mobile app', 'Email notifications']
      },
      {
        id: 'pro',
        name: 'Pro',
        price: '$5',
        period: '/employee/month',
        features: ['Everything in Basic', 'GPS tracking', 'Photo uploads', 'Offline mode', 'Advanced mobile features'],
        popular: true,
        recommended: true
      }
    ],
    property_manager: [
      {
        id: 'basic',
        name: 'Basic',
        price: '$149',
        period: '/month',
        features: ['Up to 50 units', 'Work order management', 'Tenant portal', 'Basic reporting']
      },
      {
        id: 'professional',
        name: 'Professional',
        price: '$299',
        period: '/month',
        features: ['Up to 200 units', 'Everything in Basic', 'Automated workflows', 'Advanced reporting', 'Mobile app'],
        popular: true,
        recommended: true
      },
      {
        id: 'enterprise',
        name: 'Enterprise',
        price: '$599',
        period: '/month',
        features: ['Unlimited units', 'Everything in Professional', 'Custom integrations', 'Multi-property management', 'Dedicated support']
      }
    ],
    landlord: [
      {
        id: 'basic',
        name: 'Basic',
        price: '$29',
        period: '/month',
        features: ['Up to 5 properties', 'Tenant requests', 'Basic scheduling', 'Email notifications']
      },
      {
        id: 'premium',
        name: 'Premium',
        price: '$79',
        period: '/month',
        features: ['Up to 20 properties', 'Everything in Basic', 'Maintenance tracking', 'Financial reports', 'Mobile app'],
        popular: true,
        recommended: true
      }
    ],
    condo_manager: [
      {
        id: 'basic',
        name: 'Basic',
        price: '$199',
        period: '/month',
        features: ['Up to 100 units', 'Work order system', 'Board communications', 'Document storage']
      },
      {
        id: 'premium',
        name: 'Premium',
        price: '$399',
        period: '/month',
        features: ['Up to 500 units', 'Everything in Basic', 'Automated compliance', 'Reserve fund tracking', 'Custom reports'],
        popular: true,
        recommended: true
      }
    ]
  };

  // Maintenance plans
  const maintenancePlans: MaintenancePlan[] = [
    {
      id: 'standard',
      name: 'Standard',
      price: '$99',
      period: '/month',
      responseTime: '24-48 hours',
      icon: Wrench,
      features: ['Email support', 'Business hours coverage', 'Standard priority', 'Monthly check-ins']
    },
    {
      id: 'priority',
      name: 'Priority',
      price: '$199',
      period: '/month',
      responseTime: '4-8 hours',
      icon: Zap,
      features: ['Phone & email support', 'Extended hours coverage', 'Priority queue', 'Weekly check-ins', 'Preventive maintenance']
    },
    {
      id: 'premium',
      name: 'Premium',
      price: '$399',
      period: '/month',
      responseTime: '1-2 hours',
      icon: Crown,
      features: ['24/7 phone & email', 'Emergency coverage', 'Highest priority', 'Daily monitoring', 'Preventive & predictive maintenance', 'Dedicated technician']
    }
  ];

  const tiers = subscriptionTiers[portalType] || subscriptionTiers.customer;

  const beginCheckout = async (planId: string, planName: string, price: string, type: string) => {
    const amount = Number(String(price).replace(/[^0-9.]/g, ''));
    if (!Number.isFinite(amount) || amount <= 0) { toast.info('This plan does not require payment.'); return; }
    setCheckoutPlan(planId);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Sign in before starting an upgrade checkout.');
      const response = await fetch(`${SERVER}/subscriptions/checkout`, { method: 'POST', headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ plan: planName, amount, type, billingCycle: 'monthly' }) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.success || !result.checkoutUrl) throw new Error(result.error || 'Unable to start secure checkout.');
      window.location.assign(result.checkoutUrl);
    } catch (error: any) { toast.error(error.message || 'Unable to start secure checkout.'); setCheckoutPlan(null); }
  };

  const handleUpgrade = (tier: SubscriptionTier) => beginCheckout(tier.id, `${portalType} ${tier.name}`, tier.price, portalType);
  const handleMaintenancePlan = (plan: MaintenancePlan) => beginCheckout(`maintenance-${plan.id}`, `${portalType} ${plan.name} maintenance`, plan.price, `${portalType}_maintenance`);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-[#0A0A0A] rounded-2xl border border-[#2A2A2A] max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-[#0A0A0A] border-b border-[#2A2A2A] p-6 flex items-center justify-between z-10">
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <Crown className="w-6 h-6 text-orange-500" />
              Upgrade Your Plan
            </h2>
            {lockedFeature && (
              <p className="text-gray-400 mt-1">
                Unlock <span className="text-orange-400 font-semibold">{lockedFeature}</span> with a premium plan
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-[#1A1A1A] border border-[#2A2A2A] text-gray-400 hover:text-white hover:border-red-500/30 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Subscription Tiers */}
        <div className="p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Subscription Plans</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {tiers.map(tier => (
              <div
                key={tier.id}
                className={`relative rounded-xl border p-6 transition-all ${
                  tier.recommended
                    ? 'bg-gradient-to-b from-orange-600/10 to-transparent border-orange-500/50 ring-2 ring-orange-500/20'
                    : 'bg-[#1A1A1A] border-[#2A2A2A] hover:border-orange-500/30'
                } ${currentTier === tier.id ? 'ring-2 ring-green-500/50' : ''}`}
              >
                {tier.recommended && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="px-3 py-1 bg-gradient-to-r from-orange-600 to-orange-700 text-white text-xs font-semibold rounded-full">
                      RECOMMENDED
                    </span>
                  </div>
                )}
                {tier.popular && !tier.recommended && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="px-3 py-1 bg-blue-600 text-white text-xs font-semibold rounded-full flex items-center gap-1">
                      <Star className="w-3 h-3" />
                      POPULAR
                    </span>
                  </div>
                )}
                {currentTier === tier.id && (
                  <div className="absolute top-4 right-4">
                    <div className="flex items-center gap-1 text-green-400 text-xs font-semibold">
                      <Check className="w-4 h-4" />
                      Current
                    </div>
                  </div>
                )}

                <div className="mb-4">
                  <h4 className="text-xl font-bold text-white mb-2">{tier.name}</h4>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold text-white">{tier.price}</span>
                    <span className="text-gray-400 text-sm">{tier.period}</span>
                  </div>
                </div>

                <ul className="space-y-2 mb-6">
                  {tier.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-gray-300">
                      <Check className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => handleUpgrade(tier)}
                  disabled={currentTier === tier.id || checkoutPlan !== null}
                  className={`w-full py-3 rounded-lg font-semibold transition-all ${
                    currentTier === tier.id
                      ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                      : tier.recommended
                      ? 'bg-gradient-to-r from-orange-600 to-orange-700 text-white hover:from-orange-700 hover:to-orange-800'
                      : 'bg-[#0A0A0A] border border-[#2A2A2A] text-white hover:border-orange-500/50'
                  }`}
                >
                  {currentTier === tier.id ? 'Current Plan' : checkoutPlan === tier.id ? <span className="inline-flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" />Secure checkout…</span> : 'Upgrade Now'}
                </button>
              </div>
            ))}
          </div>

          {/* Maintenance Plans */}
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-400" />
            Maintenance & Support Plans
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {maintenancePlans.map(plan => {
              const Icon = plan.icon;
              return (
                <div
                  key={plan.id}
                  className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-6 hover:border-orange-500/30 transition-all"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-lg bg-orange-500/10 border border-orange-500/30 flex items-center justify-center">
                      <Icon className="w-6 h-6 text-orange-400" />
                    </div>
                    <div>
                      <h4 className="text-lg font-bold text-white">{plan.name}</h4>
                      <div className="flex items-baseline gap-1">
                        <span className="text-xl font-bold text-white">{plan.price}</span>
                        <span className="text-gray-400 text-sm">{plan.period}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mb-4 p-3 rounded-lg bg-[#0A0A0A] border border-[#2A2A2A]">
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="w-4 h-4 text-blue-400" />
                      <span className="text-gray-400">Response time:</span>
                      <span className="text-white font-semibold">{plan.responseTime}</span>
                    </div>
                  </div>

                  <ul className="space-y-2 mb-6">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm text-gray-300">
                        <Check className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <button
                    onClick={() => handleMaintenancePlan(plan)}
                    disabled={checkoutPlan !== null}
                    className="w-full py-3 rounded-lg font-semibold bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800 transition-all disabled:opacity-60"
                  >
                    {checkoutPlan === `maintenance-${plan.id}` ? 'Opening secure checkout…' : 'Select Plan'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
