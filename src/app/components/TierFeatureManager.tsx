/**
 * TierFeatureManager — owner tool to control which features are ALLOWED in each
 * subscription tier (starter / professional / enterprise) for each plan category.
 *
 * The owner picks a category + tier, then checks the box next to every feature they
 * want allowed in that tier. They can allow any feature in any tier — including
 * turning a feature on across every tier. A "Allow in every tier" shortcut flips a
 * feature on for all three tiers at once.
 *
 * Feature catalog comes from subscriptionPlans.ts (the single source of truth).
 * The allow-map is persisted per (category, tier, feature) to the KV store via the
 * /tier-features server routes. An absent override falls back to the plan default
 * (whether that feature ships in that tier's plan out of the box).
 */
import { useEffect, useMemo, useState } from 'react';
import { Check, Loader2, Save, Sparkles, Layers, RotateCcw, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { supabase } from '../lib/supabase';
import {
  getPlansByCategory,
  type PlanCategory,
  type SubscriptionPlan,
} from '../config/subscriptionPlans';

const SERVER = `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6`;

type Tier = 'starter' | 'professional' | 'enterprise';
const TIERS: Tier[] = ['starter', 'professional', 'enterprise'];
const TIER_LABEL: Record<Tier, string> = {
  starter: 'Starter',
  professional: 'Professional',
  enterprise: 'Enterprise',
};

const CATEGORIES: { id: PlanCategory; label: string }[] = [
  { id: 'customer', label: 'Customer' },
  { id: 'construction', label: 'Construction' },
  { id: 'demolition', label: 'Demolition' },
  { id: 'property-management', label: 'Property Mgmt' },
  { id: 'vendor', label: 'Vendor' },
  { id: 'subcontractor', label: 'Subcontractor' },
  { id: 'advertiser', label: 'Advertiser' },
  { id: 'investor', label: 'Investor' },
  { id: 'territory-owner', label: 'Territory Owner' },
];

// overrides[category][tier][feature] = boolean
type OverrideMap = Record<string, Record<string, Record<string, boolean>>>;

async function adminToken(): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token || publicAnonKey;
}

export default function TierFeatureManager() {
  const [category, setCategory] = useState<PlanCategory>('vendor');
  const [tier, setTier] = useState<Tier>('starter');
  const [overrides, setOverrides] = useState<OverrideMap>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Load persisted overrides once.
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${SERVER}/tier-features`, {
          headers: { Authorization: `Bearer ${publicAnonKey}`, apikey: publicAnonKey },
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok && data?.overrides) setOverrides(data.overrides);
      } catch (err) {
        console.error(`Failed to load tier feature overrides in TierFeatureManager: ${err}`);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Plans for the selected category, keyed by tier.
  const plansByTier = useMemo(() => {
    const map: Partial<Record<Tier, SubscriptionPlan>> = {};
    for (const plan of getPlansByCategory(category)) {
      map[plan.tier as Tier] = plan;
    }
    return map;
  }, [category]);

  // Union of every feature offered across the three tiers for this category.
  const allFeatures = useMemo(() => {
    const seen = new Set<string>();
    const list: string[] = [];
    for (const t of TIERS) {
      for (const f of plansByTier[t]?.features ?? []) {
        if (!seen.has(f)) { seen.add(f); list.push(f); }
      }
    }
    return list;
  }, [plansByTier]);

  /** Whether a feature ships in a tier's plan by default (no override applied). */
  const planDefault = (t: Tier, feature: string) =>
    (plansByTier[t]?.features ?? []).includes(feature);

  /** Effective allowed state for a (tier, feature): override wins, else plan default. */
  const isAllowed = (t: Tier, feature: string) => {
    const ov = overrides[category]?.[t]?.[feature];
    return typeof ov === 'boolean' ? ov : planDefault(t, feature);
  };

  const setAllowed = (t: Tier, feature: string, allowed: boolean) => {
    setOverrides((prev) => {
      const next: OverrideMap = JSON.parse(JSON.stringify(prev));
      next[category] = next[category] || {};
      next[category][t] = next[category][t] || {};
      next[category][t][feature] = allowed;
      return next;
    });
  };

  const toggle = (feature: string) => setAllowed(tier, feature, !isAllowed(tier, feature));

  const allowEveryTier = (feature: string) => {
    setOverrides((prev) => {
      const next: OverrideMap = JSON.parse(JSON.stringify(prev));
      next[category] = next[category] || {};
      for (const t of TIERS) {
        next[category][t] = next[category][t] || {};
        next[category][t][feature] = true;
      }
      return next;
    });
    toast.success('Allowed in every tier');
  };

  /** Copy the effective allow-list of `from` tier onto the currently selected tier. */
  const copyFromTier = (from: Tier) => {
    setOverrides((prev) => {
      const next: OverrideMap = JSON.parse(JSON.stringify(prev));
      next[category] = next[category] || {};
      next[category][tier] = next[category][tier] || {};
      for (const feature of allFeatures) {
        next[category][tier][feature] = isAllowed(from, feature);
      }
      return next;
    });
    toast.success(`Copied ${TIER_LABEL[from]} → ${TIER_LABEL[tier]}`);
  };

  const resetCategory = () => {
    setOverrides((prev) => {
      const next: OverrideMap = JSON.parse(JSON.stringify(prev));
      delete next[category];
      return next;
    });
    toast.message('Reset to plan defaults — remember to save');
  };

  const save = async () => {
    setSaving(true);
    try {
      const token = await adminToken();
      const res = await fetch(`${SERVER}/tier-features`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, apikey: publicAnonKey },
        body: JSON.stringify({ overrides }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.success) throw new Error(data?.error || `HTTP ${res.status}`);
      toast.success('Tier feature entitlements saved');
    } catch (err: any) {
      console.error(`Failed to save tier feature overrides in TierFeatureManager: ${err}`);
      toast.error(`Could not save: ${err?.message || err}`);
    } finally {
      setSaving(false);
    }
  };

  const allowedCount = allFeatures.filter((f) => isAllowed(tier, f)).length;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
            <Layers className="w-6 h-6 text-orange-400" /> Tier Feature Entitlements
          </h2>
          <p className="text-gray-400 max-w-2xl">
            Pick a category and tier, then check the features allowed in that tier. You can allow any feature in every tier.
          </p>
        </div>
        <button
          onClick={save}
          disabled={saving}
          className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-[#ea580c] to-[#dc2626] text-white font-semibold shadow-lg disabled:opacity-60"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save changes
        </button>
      </div>

      {/* Category selector */}
      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map((c) => (
          <button
            key={c.id}
            onClick={() => setCategory(c.id)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold border transition-all ${
              category === c.id
                ? 'bg-orange-600/20 border-orange-500/50 text-orange-300'
                : 'bg-[#141414] border-[#2A2A2A] text-gray-400 hover:text-white hover:border-[#3A3A3A]'
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* Tier selector */}
      <div className="flex items-center gap-2 border-b border-[#2A2A2A] pb-3">
        {TIERS.map((t) => {
          const plan = plansByTier[t];
          return (
            <button
              key={t}
              onClick={() => setTier(t)}
              disabled={!plan}
              className={`px-4 py-2 rounded-lg text-sm font-semibold border transition-all disabled:opacity-40 ${
                tier === t
                  ? 'bg-white/10 border-white/30 text-white'
                  : 'bg-transparent border-transparent text-gray-400 hover:text-white'
              }`}
            >
              {TIER_LABEL[t]}
              {plan && <span className="ml-2 text-xs text-gray-500">{plan.name}</span>}
            </button>
          );
        })}
        <div className="ml-auto flex items-center gap-3 flex-wrap">
          <span className="text-xs text-gray-500">{allowedCount} of {allFeatures.length} allowed</span>
          {TIERS.filter((t) => t !== tier && plansByTier[t]).map((t) => (
            <button
              key={t}
              onClick={() => copyFromTier(t)}
              className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-white px-3 py-1.5 rounded-lg border border-[#2A2A2A] hover:border-[#3A3A3A]"
            >
              <Copy className="w-3.5 h-3.5" /> Copy from {TIER_LABEL[t]}
            </button>
          ))}
          <button
            onClick={resetCategory}
            className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-white px-3 py-1.5 rounded-lg border border-[#2A2A2A] hover:border-[#3A3A3A]"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Reset category
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-gray-400 py-12 justify-center">
          <Loader2 className="w-5 h-5 animate-spin" /> Loading entitlements…
        </div>
      ) : allFeatures.length === 0 ? (
        <div className="text-gray-500 py-12 text-center">No features defined for this category.</div>
      ) : (
        <div className="space-y-2">
          {allFeatures.map((feature) => {
            const allowed = isAllowed(tier, feature);
            const isDefault = planDefault(tier, feature);
            const allTiers = TIERS.every((t) => isAllowed(t, feature));
            return (
              <div
                key={feature}
                className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                  allowed ? 'bg-[#141414] border-orange-500/30' : 'bg-[#0F0F0F] border-[#2A2A2A]'
                }`}
              >
                <button
                  onClick={() => toggle(feature)}
                  className={`shrink-0 w-6 h-6 rounded-md border flex items-center justify-center transition-all ${
                    allowed
                      ? 'bg-gradient-to-br from-[#ea580c] to-[#dc2626] border-transparent'
                      : 'bg-transparent border-[#3A3A3A] hover:border-orange-500/50'
                  }`}
                  aria-label={allowed ? 'Disable feature' : 'Enable feature'}
                >
                  {allowed && <Check className="w-4 h-4 text-white" />}
                </button>
                <span className={`flex-1 text-sm ${allowed ? 'text-white' : 'text-gray-400'}`}>
                  {feature}
                  {!isDefault && (
                    <span className="ml-2 text-[10px] uppercase tracking-wide text-gray-500">not in base plan</span>
                  )}
                </span>
                <button
                  onClick={() => allowEveryTier(feature)}
                  disabled={allTiers}
                  className="shrink-0 inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border border-[#2A2A2A] text-gray-300 hover:text-white hover:border-orange-500/40 disabled:opacity-40 disabled:hover:border-[#2A2A2A]"
                >
                  <Sparkles className="w-3.5 h-3.5 text-orange-400" />
                  {allTiers ? 'In every tier' : 'Allow in every tier'}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
