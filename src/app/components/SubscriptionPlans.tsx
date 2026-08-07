/**
 * Subscription Plans - Complete Pricing System
 * 
 * Features:
 * - 6 months free for ALL subscriptions
 * - 30% lifetime discount for founding members
 * - Multiple plan tiers for each user type
 * - Vendor, Subcontractor, and Advertiser plans
 */

import { useEffect, useMemo, useState } from 'react';
import {
  Crown, Zap, Rocket, Building2, Wrench, Megaphone, Star,
  Check, X, Sparkles, TrendingUp, Shield, Award, Target,
  Users, DollarSign, Calendar, Gift, Tag, ChevronRight, Flame, Home, Building, HardHat, Edit2,
  Bot, BookOpen, ShoppingBag, ExternalLink, Trash2, LineChart, MapPin, PlusCircle,
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import {
  ALL_SUBSCRIPTION_PLANS,
  FOUNDING_SUBSCRIBER_CONFIG,
  getPlansByCategory,
  type SubscriptionPlan,
  type PlanCategory,
} from '../config/subscriptionPlans';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import MaintenancePlanEditor from './MaintenancePlanEditor';
import { saveCustomerMembership, planTierLabel } from '../lib/subscriptionDiscount';
import { useAuth } from '../contexts/AuthContext';

type PricingDisplay = 'regular' | 'first12';

// Category tab config — one entry per portal type.
const CATEGORY_TABS: { id: PlanCategory; label: string; icon: any; color: string }[] = [
  { id: 'customer', label: 'Customer', icon: Home, color: 'green' },
  { id: 'construction', label: 'Construction', icon: HardHat, color: 'red' },
  { id: 'demolition', label: 'Demolition', icon: Trash2, color: 'amber' },
  { id: 'property-management', label: 'Property', icon: Building, color: 'indigo' },
  { id: 'vendor', label: 'Vendor', icon: Building2, color: 'blue' },
  { id: 'subcontractor', label: 'Contractor', icon: Wrench, color: 'orange' },
  { id: 'advertiser', label: 'Advertiser', icon: Megaphone, color: 'pink' },
  { id: 'investor', label: 'Investor', icon: LineChart, color: 'purple' },
  { id: 'territory-owner', label: 'Territory', icon: MapPin, color: 'cyan' },
];

const subscriptionPlans: SubscriptionPlan[] = ALL_SUBSCRIPTION_PLANS;

const SERVER = `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6`;

// overrides[category][tier][feature] = boolean (owner-defined; absent = plan default)
type TierOverrideMap = Record<string, Record<string, Record<string, boolean>>>;

interface SubscriptionPlansProps {
  onSelectPlan?: (planId: string) => void;
}

export function SubscriptionPlans({ onSelectPlan }: SubscriptionPlansProps) {
  const { user } = useAuth();
  const [activeCategory, setActiveCategory] = useState<PlanCategory>('customer');
  const [pricingDisplay, setPricingDisplay] = useState<PricingDisplay>('first12');
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [editingPlan, setEditingPlan] = useState<any | null>(null);
  const [tierOverrides, setTierOverrides] = useState<TierOverrideMap>({});
  // Owner edits to the code-defined plans, persisted server-side and merged
  // over the catalog so a saved change is still there after a reload.
  const [planOverrides, setPlanOverrides] = useState<Record<string, any>>({});
  const [savingPlan, setSavingPlan] = useState(false);

  const applyOverride = (plan: SubscriptionPlan): SubscriptionPlan => {
    const ov = planOverrides[plan.id];
    if (!ov) return plan;
    return {
      ...plan,
      name: typeof ov.name === 'string' && ov.name ? ov.name : plan.name,
      tagline: typeof ov.tagline === 'string' && ov.tagline ? ov.tagline : plan.tagline,
      regularPrice: Number.isFinite(Number(ov.regularPrice)) ? Number(ov.regularPrice) : plan.regularPrice,
      features: Array.isArray(ov.features) && ov.features.length ? ov.features : plan.features,
      popular: typeof ov.popular === 'boolean' ? ov.popular : plan.popular,
      highlighted: typeof ov.highlighted === 'boolean' ? ov.highlighted : plan.highlighted,
    };
  };

  const filteredPlans = useMemo(
    () => getPlansByCategory(activeCategory).map(applyOverride),
    [activeCategory, planOverrides],
  );

  // Load owner-defined per-tier feature entitlements once.
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${SERVER}/tier-features`, {
          headers: { Authorization: `Bearer ${publicAnonKey}`, apikey: publicAnonKey },
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok && data?.overrides) setTierOverrides(data.overrides);
      } catch (err) {
        console.error(`Failed to load tier feature overrides in SubscriptionPlans: ${err}`);
      }
      try {
        const res = await fetch(`${SERVER}/subscription-plan-overrides`, {
          headers: { Authorization: `Bearer ${publicAnonKey}`, apikey: publicAnonKey },
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok && data?.overrides) setPlanOverrides(data.overrides);
      } catch (err) {
        console.error(`Failed to load subscription plan overrides in SubscriptionPlans: ${err}`);
      }
    })();
  }, []);

  // Union of every feature across the tiers of the active category (preserves order).
  const categoryFeatureUnion = useMemo(() => {
    const seen = new Set<string>();
    const list: string[] = [];
    for (const plan of filteredPlans) {
      for (const f of plan.features) {
        if (!seen.has(f)) { seen.add(f); list.push(f); }
      }
    }
    return list;
  }, [filteredPlans]);

  // Features to display for a plan after applying owner overrides. An override
  // wins; otherwise the feature shows if it ships in that plan by default.
  const getEffectiveFeatures = (plan: SubscriptionPlan): string[] => {
    const tierMap = tierOverrides[plan.category]?.[plan.tier];
    if (!tierMap) return plan.features;
    return categoryFeatureUnion.filter((feature) => {
      const ov = tierMap[feature];
      return typeof ov === 'boolean' ? ov : plan.features.includes(feature);
    });
  };

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
      red: {
        bg: 'bg-red-600/20',
        text: 'text-red-400',
        border: 'border-red-500/30',
        shadow: 'shadow-red-500/20',
      },
      indigo: {
        bg: 'bg-indigo-600/20',
        text: 'text-indigo-400',
        border: 'border-indigo-500/30',
        shadow: 'shadow-indigo-500/20',
      },
      amber: {
        bg: 'bg-amber-600/20',
        text: 'text-amber-400',
        border: 'border-amber-500/30',
        shadow: 'shadow-amber-500/20',
      },
      purple: {
        bg: 'bg-purple-600/20',
        text: 'text-purple-400',
        border: 'border-purple-500/30',
        shadow: 'shadow-purple-500/20',
      },
      cyan: {
        bg: 'bg-cyan-600/20',
        text: 'text-cyan-400',
        border: 'border-cyan-500/30',
        shadow: 'shadow-cyan-500/20',
      },
    };
    return colors[color]?.[variant] ?? colors.green[variant];
  };

  const handleSelectPlan = (planId: string) => {
    setSelectedPlan(planId);
    if (onSelectPlan) {
      onSelectPlan(planId);
    }

    // Persist the customer's membership so it unlocks their contract-job discount.
    const plan = subscriptionPlans.find((p) => p.id === planId);
    const email = (user as any)?.email as string | undefined;
    if (plan && email) {
      saveCustomerMembership(email, {
        planId: plan.id,
        planName: plan.name,
        tier: plan.tier,
        status: 'active',
        source: 'subscription',
      }).catch((err) => console.error('Failed to persist customer membership:', err));

      const tierLabel = planTierLabel(plan.tier);
      const pct = plan.tier === 'starter' ? 5 : plan.tier === 'professional' ? 10 : 15;
      toast.success(`Plan selected! You now get ${pct}% off contract jobs${tierLabel ? ` (${tierLabel} tier)` : ''}.`);
    } else {
      toast.success('Plan selected! Proceed to checkout.');
    }
  };

  const handleEditPlan = (plan: SubscriptionPlan, e: React.MouseEvent) => {
    e.stopPropagation();
    // Convert SubscriptionPlan to MaintenancePlan format
    const maintenancePlan = {
      id: plan.id,
      name: plan.name,
      type: 'monthly',
      description: plan.tagline,
      targetType: 'both' as const,
      status: 'active',
      monthlyPrice: plan.regularPrice,
      annualPrice: plan.regularPrice * 12,
      quarterlyPrice: plan.regularPrice * 3,
      setupFee: 0,
      discountPercentage: 0,
      includedServices: plan.features.filter(f => !f.startsWith('🎁')),
      serviceFrequency: 'monthly',
      responseTime: plan.limits.support || '24 hours',
      inspectionSchedule: 'quarterly',
      maintenanceSchedule: 'as-needed',
      features: plan.features,
      benefits: plan.features.filter(f => f.startsWith('🎁')),
      limitations: [],
      attachedReels: [],
      attachedSocialPosts: [],
      colorTheme: 'cyan',
      icon: 'wrench',
      isPopular: plan.popular || false,
      isFeatured: plan.highlighted || false,
      isVisible: true,
      priority: 1,
      maxClients: 0,
      minUnits: 0,
      maxUnits: 0,
      coverageArea: [],
      propertyTypes: [],
      terms: '',
      cancellationPolicy: 'Cancel anytime',
      activeSubscriptions: 0,
      submittedBy: 'Admin',
      submittedAt: new Date().toISOString().split('T')[0]
    };
    setEditingPlan(maintenancePlan);
    setShowEditor(true);
  };

  // Persist only the fields that map back onto a SubscriptionPlan. Everything
  // else the maintenance editor collects has no home in the plan catalog, so
  // saving it would create the illusion that it took effect.
  const handleSavePlan = async (plan: any) => {
    if (!plan?.id) {
      toast.error('This plan has no id, so it can\'t be saved.');
      return;
    }
    setSavingPlan(true);
    try {
      const override = {
        name: String(plan.name || '').trim(),
        tagline: String(plan.description || '').trim(),
        regularPrice: Number(plan.monthlyPrice) || 0,
        features: Array.isArray(plan.features) ? plan.features : [],
        popular: !!plan.isPopular,
        highlighted: !!plan.isFeatured,
      };
      const res = await fetch(`${SERVER}/subscription-plan-overrides`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${publicAnonKey}`, apikey: publicAnonKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId: plan.id, override }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) throw new Error(data.error || `Server responded ${res.status}`);
      setPlanOverrides(data.overrides || {});
      toast.success('Plan updated');
      setShowEditor(false);
      setEditingPlan(null);
    } catch (err: any) {
      console.error('Failed to save subscription plan override:', err);
      toast.error(`Could not save this plan: ${err?.message || err}`);
    } finally {
      setSavingPlan(false);
    }
  };

  const handleResetPlan = async (planId: string) => {
    try {
      const res = await fetch(`${SERVER}/subscription-plan-overrides/${encodeURIComponent(planId)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${publicAnonKey}`, apikey: publicAnonKey },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) throw new Error(data.error || `Server responded ${res.status}`);
      setPlanOverrides(data.overrides || {});
      toast.success('Plan reset to its default');
    } catch (err: any) {
      console.error('Failed to reset subscription plan override:', err);
      toast.error(`Could not reset this plan: ${err?.message || err}`);
    }
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

      {/* Custom plans are built in each portal's Plan Builder (service catalog +
          presets + AI + custom pricing), keeping a single, consistent system. */}

      {/* Category Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 bg-[#1A1A1A] border border-zinc-800 p-2 rounded-xl">
        {CATEGORY_TABS.map((tab) => {
          const TabIcon = tab.icon;
          const isActive = activeCategory === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveCategory(tab.id)}
              className={`py-3 px-4 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${
                isActive
                  ? `${getColorClasses(tab.color, 'bg')} ${getColorClasses(tab.color, 'text')} border ${getColorClasses(tab.color, 'border')}`
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
              }`}
            >
              <TabIcon className="w-5 h-5" />
              <span className="hidden lg:inline">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* PropertyAI Digital Tools Banner — customer homeowner plans */}
      {activeCategory === 'customer' && (
        <div className="bg-gradient-to-r from-teal-900/30 to-emerald-900/20 border border-teal-500/30 rounded-xl p-5">
          <div className="flex items-start gap-4 flex-wrap">
            <div className="w-10 h-10 rounded-lg bg-teal-600/30 border border-teal-500/30 flex items-center justify-center flex-shrink-0">
              <Bot className="w-5 h-5 text-teal-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-teal-200 mb-1">All Homeowner Plans Include Digital Tools</p>
              <p className="text-xs text-teal-300/70 mb-3">
                AI-powered home tools, NH homeowner guides, Eversource rebate info, and downloadable resources come bundled with every plan — no extra cost.
              </p>
              <div className="flex flex-wrap gap-3">
                <div className="flex items-center gap-1.5 bg-violet-500/10 border border-violet-500/20 rounded-lg px-3 py-1.5">
                  <Bot className="w-3.5 h-3.5 text-violet-400" />
                  <span className="text-xs text-violet-300 font-medium">PropertyAI Tools</span>
                </div>
                <div className="flex items-center gap-1.5 bg-blue-500/10 border border-blue-500/20 rounded-lg px-3 py-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-blue-400" />
                  <span className="text-xs text-blue-300 font-medium">Knowledge Center</span>
                </div>
                <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-1.5">
                  <ShoppingBag className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-xs text-emerald-300 font-medium">Marketplace Resources</span>
                </div>
              </div>
            </div>
            <button
              onClick={() => (window as any).__navigateApp?.('/property-ai-enterprise')}
              className="flex items-center gap-1.5 px-4 py-2 bg-teal-600/30 hover:bg-teal-600/50 text-teal-200 text-xs font-semibold rounded-lg transition border border-teal-500/30 flex-shrink-0 self-start">
              <ExternalLink className="w-3.5 h-3.5" /> Explore Tools
            </button>
          </div>
        </div>
      )}

      {/* PropertyAI Digital Tools Banner — property-management only */}
      {activeCategory === 'property-management' && (
        <div className="bg-gradient-to-r from-violet-900/30 to-indigo-900/20 border border-violet-500/30 rounded-xl p-5">
          <div className="flex items-start gap-4 flex-wrap">
            <div className="w-10 h-10 rounded-lg bg-violet-600/30 border border-violet-500/30 flex items-center justify-center flex-shrink-0">
              <Bot className="w-5 h-5 text-violet-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-violet-200 mb-1">All Property Management Plans Include PropertyAI Digital Suite</p>
              <p className="text-xs text-violet-300/70 mb-3">
                NH-specific AI tools, legal knowledge base, and downloadable resources are bundled with every property management subscription — no extra cost.
              </p>
              <div className="flex flex-wrap gap-3">
                <div className="flex items-center gap-1.5 bg-violet-500/10 border border-violet-500/20 rounded-lg px-3 py-1.5">
                  <Bot className="w-3.5 h-3.5 text-violet-400" />
                  <span className="text-xs text-violet-300 font-medium">PropertyAI Enterprise</span>
                </div>
                <div className="flex items-center gap-1.5 bg-blue-500/10 border border-blue-500/20 rounded-lg px-3 py-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-blue-400" />
                  <span className="text-xs text-blue-300 font-medium">Knowledge Center</span>
                </div>
                <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-1.5">
                  <ShoppingBag className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-xs text-emerald-300 font-medium">Marketplace Bundle</span>
                </div>
              </div>
            </div>
            <button
              onClick={() => (window as any).__navigateApp?.('/property-ai-enterprise')}
              className="flex items-center gap-1.5 px-4 py-2 bg-violet-600/30 hover:bg-violet-600/50 text-violet-200 text-xs font-semibold rounded-lg transition border border-violet-500/30 flex-shrink-0 self-start">
              <ExternalLink className="w-3.5 h-3.5" /> Explore Tools
            </button>
          </div>
        </div>
      )}

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {filteredPlans.map((plan) => {
          // Dynamically select icon + color from the shared category config.
          const tabCfg = CATEGORY_TABS.find((t) => t.id === plan.category);
          const Icon = tabCfg?.icon ?? Home;
          const color = tabCfg?.color ?? 'green';
          const isSelected = selectedPlan === plan.id;
          const displayPrice = plan.regularPrice;
          const isPremium = plan.id === 'customer-premium' || plan.id === 'construction-enterprise' || plan.id === 'property-manager';
          const showFirst12Benefits = pricingDisplay === 'first12' && (plan.category === 'customer' || plan.category === 'construction' || plan.category === 'property-management');

          return (
            <div
              key={plan.id}
              className={`relative bg-[#1A1A1A] rounded-xl overflow-hidden transition-all ${
                plan.highlighted
                  ? `border-2 ${getColorClasses(color, 'border')} shadow-xl ${getColorClasses(color, 'shadow')}`
                  : 'border border-zinc-800 hover:border-zinc-700'
              } ${isSelected ? 'ring-2 ring-[#ea580c]' : ''}`}
            >
              {/* Edit Button */}
              <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
                <button
                  onClick={(e) => handleEditPlan(plan, e)}
                  className="p-2 bg-[#1A1A1A] hover:bg-[#2A2A2A] border border-[#2A2A2A] hover:border-orange-500/50 rounded-lg transition-all group"
                  title="Edit plan"
                >
                  <Edit2 className="w-4 h-4 text-gray-400 group-hover:text-orange-400" />
                </button>
                {planOverrides[plan.id] && (
                  <button
                    onClick={(e) => { e.stopPropagation(); void handleResetPlan(plan.id); }}
                    className="px-2 py-1 bg-orange-500/10 border border-orange-500/30 text-orange-400 hover:bg-orange-500/20 rounded-lg text-[10px] font-bold uppercase tracking-wide transition"
                    title="This plan has been edited — restore the default"
                  >
                    Edited · Reset
                  </button>
                )}
              </div>

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
                    {displayPrice === 0 ? (
                      <span className="text-4xl font-bold text-white">Free</span>
                    ) : (
                      <>
                        <span className="text-4xl font-bold text-white">${displayPrice.toLocaleString()}</span>
                        <span className="text-zinc-400">/month</span>
                      </>
                    )}
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
                  {getEffectiveFeatures(plan).map((feature, idx) => (
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

                {/* Portal-specific add-on options + universal custom request */}
                {(plan.portalOptions && plan.portalOptions.length > 0) && (
                  <div className="pt-4 border-t border-zinc-800">
                    <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-zinc-400 mb-3">
                      <Sparkles className={`w-3.5 h-3.5 ${getColorClasses(color, 'text')}`} />
                      Add-on options for this portal
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {plan.portalOptions.map((opt, i) => (
                        <span
                          key={i}
                          className={`inline-flex items-center gap-1 rounded-full border ${getColorClasses(color, 'border')} ${getColorClasses(color, 'bg')} px-2.5 py-1 text-xs ${getColorClasses(color, 'text')}`}
                        >
                          <PlusCircle className="w-3 h-3" /> {opt}
                        </span>
                      ))}
                    </div>
                    {plan.allowCustomRequest && (
                      <button
                        onClick={(e) => { e.stopPropagation(); toast.success("Custom request started — tell us what you need and we'll build it into your plan."); onSelectPlan?.(plan.id); }}
                        className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-zinc-600 px-3 py-2 text-xs font-medium text-zinc-300 transition hover:border-zinc-400 hover:text-white"
                      >
                        <PlusCircle className="w-4 h-4" /> Request something we don&apos;t offer yet
                      </button>
                    )}
                  </div>
                )}

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

      {/* Maintenance Plan Editor Modal */}
      {showEditor && editingPlan && (
        <MaintenancePlanEditor
          isOpen={showEditor}
          onClose={() => {
            setShowEditor(false);
            setEditingPlan(null);
          }}
          plan={editingPlan}
          mode="edit"
          onSave={(updated) => { if (!savingPlan) void handleSavePlan(updated); }}
        />
      )}
    </div>
  );
}