/**
 * PlanBuilderTab
 *
 * A single reusable tab dropped into every portal. Its centerpiece is an
 * AI-powered plan builder: the user describes their needs in plain language and
 * the OpenAI-backed /plan-builder/generate route recommends a set of real
 * catalog services, a frequency, and a skill level. Pricing is computed locally
 * with the authoritative computePrice() helper so numbers always match the
 * visible catalog. The user can then tweak the selection, see live totals, save
 * the plan, or open the classic subscription-tier upgrade modal.
 */

import { useEffect, useMemo, useState } from 'react';
import { Sparkles, Wand2, Check, Plus, Minus, Save, Crown, Loader2, RefreshCw, Clock, Gift, Tag, Activity, Layers, PlusCircle, X } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import {
  ENTITY_TYPES,
  SKILL_LEVELS,
  FREQUENCY_TIERS,
  SERVICE_CATALOG,
  computePrice,
  getPresets,
  presetBaseMonthly,
  type EntityType,
  type PlanPreset,
} from '../../data/maintenancePlans';
import { projectId, publicAnonKey } from '../../utils/supabase/info';
import { createPlan, listPlans, bridgePlanGiftCards, type PlanRecord } from '../../utils/plansApi';
import PortalUpgradeModal from './PortalUpgradeModal';
import { useAuth } from '../../contexts/AuthContext';

type PortalType =
  | 'customer' | 'vendor' | 'subcontractor' | 'advertiser' | 'investor'
  | 'employee' | 'property_manager' | 'landlord' | 'condo_manager';

export interface ApplicationPlanDraft {
  planName: string;
  portalType: PortalType;
  entity: EntityType;
  skillId: string;
  frequencyId: string;
  serviceIds: string[];
  serviceNames: string[];
  monthlyTotal: number;
  annualTotal: number;
  needs: string;
  aiRationale?: string;
}

interface PlanBuilderTabProps {
  portalType: PortalType;
  ownerName?: string;
  currentTier?: string;
  /** Used by an application flow to persist a draft with the application, not activate billing. */
  onPlanDraftChange?: (draft: ApplicationPlanDraft | null) => void;
}

// Which entity catalogs each portal may build a plan from. The first entry is
// the default. Portals with a single entity hide the selector entirely.
const PORTAL_ENTITIES: Record<PortalType, EntityType[]> = {
  customer: ['homeowner', 'condo', 'landlord', 'commercial'],
  landlord: ['landlord'],
  condo_manager: ['condo'],
  property_manager: ['commercial', 'condo', 'landlord'],
  vendor: ['vendor'],
  advertiser: ['advertiser'],
  investor: ['investor'],
  subcontractor: ['subcontractor'],
  employee: ['homeowner'],
};

const DEFAULT_ENTITY: Record<PortalType, EntityType> = Object.fromEntries(
  Object.entries(PORTAL_ENTITIES).map(([portal, entities]) => [portal, entities[0]]),
) as Record<PortalType, EntityType>;

interface CustomItem {
  id: string;
  name: string;
  category: string;
  baseMonthlyPrice: number;
  unit: string;
}

export default function PlanBuilderTab({ portalType, ownerName, currentTier = 'basic', onPlanDraftChange }: PlanBuilderTabProps) {
  const { user } = useAuth();
  const [entity, setEntity] = useState<EntityType>(DEFAULT_ENTITY[portalType] || 'homeowner');
  const [needs, setNeeds] = useState('');
  const [loading, setLoading] = useState(false);
  const [aiRationale, setAiRationale] = useState('');
  const [followUp, setFollowUp] = useState('');
  const [planName, setPlanName] = useState('My Custom Plan');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [skillId, setSkillId] = useState('journeyman');
  const [frequencyId, setFrequencyId] = useState('monthly');
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activePresetId, setActivePresetId] = useState<string | null>(null);

  // Custom "price out your own" requests, added as line items alongside catalog picks.
  const [customItems, setCustomItems] = useState<CustomItem[]>([]);
  const [customRequest, setCustomRequest] = useState('');
  const [pricingCustom, setPricingCustom] = useState(false);

  const availableEntities = (PORTAL_ENTITIES[portalType] || ['homeowner']);
  const entityConfigs = ENTITY_TYPES.filter(e => availableEntities.includes(e.id));
  const presets = getPresets(entity);

  // Live-tracked active plans for this owner/portal (polled every 15s).
  const [activePlans, setActivePlans] = useState<PlanRecord[]>([]);

  const catalog = SERVICE_CATALOG[entity];
  const skill = SKILL_LEVELS.find(s => s.id === skillId) || SKILL_LEVELS[1];
  const frequency = FREQUENCY_TIERS.find(f => f.id === frequencyId) || FREQUENCY_TIERS[0];

  const selectedServices = useMemo(
    () => catalog.filter(s => selectedIds.has(s.id)),
    [catalog, selectedIds],
  );

  const monthlyTotal = useMemo(
    () => [...selectedServices, ...customItems].reduce(
      (sum, s) => sum + computePrice(s.baseMonthlyPrice, skill.multiplier, frequency.multiplier),
      0,
    ),
    [selectedServices, customItems, skill, frequency],
  );

  const allSelectedNames = useMemo(
    () => [...selectedServices.map(s => s.name), ...customItems.map(c => c.name)],
    [selectedServices, customItems],
  );
  const allSelectedIds = useMemo(
    () => [...Array.from(selectedIds), ...customItems.map(c => c.id)],
    [selectedIds, customItems],
  );

  // Application flows receive a live draft. They never activate a subscription
  // or issue entitlements before the application is reviewed and approved.
  useEffect(() => {
    if (!onPlanDraftChange) return;
    if (!selectedServices.length && !customItems.length) { onPlanDraftChange(null); return; }
    onPlanDraftChange({ planName, portalType, entity, skillId, frequencyId, serviceIds: allSelectedIds, serviceNames: allSelectedNames, monthlyTotal, annualTotal: monthlyTotal * 12, needs: needs.trim(), aiRationale: aiRationale || undefined });
  }, [onPlanDraftChange, planName, portalType, entity, skillId, frequencyId, allSelectedIds, allSelectedNames, selectedServices, customItems, monthlyTotal, needs, aiRationale]);

  const toggleService = (id: string) => {
    setActivePresetId(null);
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const applyPreset = (preset: PlanPreset) => {
    setSelectedIds(new Set(preset.serviceIds));
    setActivePresetId(preset.id);
    setPlanName(preset.name);
    setAiRationale('');
    setFollowUp('');
    toast.success(`${preset.name} loaded — add or remove anything you like.`);
  };

  const priceCustom = async () => {
    if (!customRequest.trim()) {
      toast.error('Describe the service you want us to price out.');
      return;
    }
    setPricingCustom(true);
    try {
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6/plan-builder/price-custom`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${publicAnonKey}` },
          body: JSON.stringify({
            entityType: entity,
            portalRole: portalType,
            request: customRequest.trim(),
            catalog: catalog.map(s => ({ name: s.name, category: s.category, baseMonthlyPrice: s.baseMonthlyPrice, unit: s.unit })),
          }),
        },
      );
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data?.error || `Pricing failed (${res.status})`);
      const item: CustomItem = {
        id: `custom-${Date.now()}`,
        name: data.item.name,
        category: data.item.category || 'Custom Request',
        baseMonthlyPrice: data.item.baseMonthlyPrice,
        unit: data.item.unit || 'per month',
      };
      setCustomItems(prev => [...prev, item]);
      setActivePresetId(null);
      setCustomRequest('');
      toast.success(`Added “${item.name}” at $${item.baseMonthlyPrice}/${item.unit}.`);
    } catch (err: any) {
      console.error('[PlanBuilderTab] Custom pricing error:', err);
      toast.error(err?.message || 'Could not price that request. Add more detail and try again.');
    } finally {
      setPricingCustom(false);
    }
  };

  const removeCustom = (id: string) => setCustomItems(prev => prev.filter(c => c.id !== id));

  // Poll the server so newly-created plans (and their hours/gift/promo links)
  // show up and update in real time within the portal.
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const plans = await listPlans({ portalType, ...(user?.email ? { owner: user.email } : {}) });
        if (!cancelled) setActivePlans(plans);
      } catch (err) {
        console.error('[PlanBuilderTab] Failed to load active plans:', err);
      }
    };
    load();
    const interval = setInterval(load, 15000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [portalType, ownerName, user?.email]);

  const runAI = async () => {
    if (!needs.trim()) {
      toast.error('Describe what you need so the AI can build your plan.');
      return;
    }
    setLoading(true);
    setFollowUp('');
    try {
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6/plan-builder/generate`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({
            entityType: entity,
            portalRole: portalType,
            needs: needs.trim(),
            catalog: catalog.map(s => ({
              id: s.id, name: s.name, category: s.category,
              baseMonthlyPrice: s.baseMonthlyPrice, unit: s.unit, nhSpecific: s.nhSpecific,
            })),
            frequencies: FREQUENCY_TIERS.map(f => f.id),
            skillLevels: SKILL_LEVELS.map(s => s.id),
          }),
        },
      );
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data?.error || `Plan builder failed (${res.status})`);
      }
      const plan = data.plan;
      setActivePresetId(null);
      setSelectedIds(new Set<string>(plan.serviceIds || []));
      if (plan.skillLevel) setSkillId(plan.skillLevel);
      if (plan.frequency) setFrequencyId(plan.frequency);
      if (plan.planName) setPlanName(plan.planName);
      setAiRationale(plan.rationale || '');
      setFollowUp(plan.followUpQuestion || '');
      toast.success('Your custom plan is ready — tweak it below.');
    } catch (err: any) {
      console.error('[PlanBuilderTab] AI plan generation error:', err);
      toast.error(err?.message || 'Could not build your plan. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const savePlan = async () => {
    if (selectedServices.length === 0 && customItems.length === 0) {
      toast.error('Add at least one service to save your plan.');
      return;
    }
    if (!user?.email) {
      if (onPlanDraftChange) {
        onPlanDraftChange({ planName, portalType, entity, skillId, frequencyId, serviceIds: allSelectedIds, serviceNames: allSelectedNames, monthlyTotal, annualTotal: monthlyTotal * 12, needs: needs.trim(), aiRationale: aiRationale || undefined });
        toast.success('Your plan preference will be included with this application for review.');
        return;
      }
      toast.error('Sign in before activating a plan. Your selections stay on this device until your account is ready.');
      return;
    }
    setSaving(true);
    const payload = {
      planName,
      portalType,
      entity,
      skillId,
      frequencyId,
      serviceIds: allSelectedIds,
      serviceNames: allSelectedNames,
      monthlyTotal,
      annualTotal: monthlyTotal * 12,
      owner: ownerName || user.user_metadata?.full_name || user.email,
      ownerEmail: user.email,
    };
    // Keep a local copy for offline resilience.
    try { localStorage.setItem(`bp_plan_${portalType}`, JSON.stringify({ ...payload, savedAt: new Date().toISOString() })); } catch {}

    try {
      const created = await createPlan(payload);
      setActivePlans(prev => [created, ...prev.filter(p => p.id !== created.id)]);
      // Bridge the welcome gift card into the Gift Cards page store so it's redeemable there.
      bridgePlanGiftCards(created);
      const gift = created.giftCards?.[0];
      toast.success(
        gift
          ? `Plan activated! ${created.hours.included} service hours added and a $${gift.amount} welcome gift card added to your Gift Cards.`
          : 'Plan activated and now tracked in your portal.',
      );
    } catch (err: any) {
      console.error('[PlanBuilderTab] Failed to save plan to server:', err);
      toast.error(err?.message || 'Saved locally, but could not sync to your portal. Try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Live-tracked active plans */}
      {activePlans.length > 0 && (
        <div className="rounded-2xl border border-[#1f1f1f] bg-[#0d0d0d] p-5">
          <div className="flex items-center gap-2 mb-3">
            <Activity className="w-4 h-4 text-green-400" />
            <h3 className="text-sm font-semibold text-white">Your Active Plans</h3>
            <span className="flex items-center gap-1 text-[11px] text-green-400">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" /> live
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {activePlans.map(p => {
              const hoursPct = p.hours?.included ? Math.min(100, Math.round((p.hours.used / p.hours.included) * 100)) : 0;
              return (
                <div key={p.id} className="rounded-xl border border-[#1f1f1f] bg-[#0a0a0a] p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-white font-semibold truncate">{p.planName}</p>
                      <p className="text-xs text-gray-500">{p.id} · ${p.monthlyTotal.toLocaleString()}/mo</p>
                    </div>
                    <span className={`shrink-0 text-[11px] px-2 py-0.5 rounded-full ${
                      p.status === 'active' ? 'bg-green-500/15 text-green-400' : 'bg-gray-500/15 text-gray-400'
                    }`}>{p.status}</span>
                  </div>

                  {/* Hours */}
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
                      <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> Service hours</span>
                      <span>{p.hours?.used || 0} / {p.hours?.included || 0} hrs</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-[#1a1a1a] overflow-hidden">
                      <div className="h-full bg-orange-500" style={{ width: `${hoursPct}%` }} />
                    </div>
                  </div>

                  {/* Linked rewards */}
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {(p.giftCards || []).map(g => (
                      <span key={g.code} className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded bg-purple-500/15 text-purple-300">
                        <Gift className="w-3 h-3" /> ${g.balance} · {g.code}
                      </span>
                    ))}
                    {(p.promotions || []).map(pr => (
                      <span key={pr.code} className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded bg-blue-500/15 text-blue-300">
                        <Tag className="w-3 h-3" /> {pr.code}
                      </span>
                    ))}
                    {(p.offers || []).map(o => (
                      <span key={o.code} className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded bg-green-500/15 text-green-300">
                        <Sparkles className="w-3 h-3" /> {o.title}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Hero / AI builder */}
      <div className="relative overflow-hidden rounded-2xl border border-orange-500/30 bg-gradient-to-br from-orange-600/10 via-[#0d0d0d] to-[#0a0a0a] p-6">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="w-5 h-5 text-orange-400" />
          <h3 className="text-xl font-bold text-white">Build Your Own Plan with AI</h3>
        </div>
        <p className="text-sm text-gray-400 mb-4 max-w-2xl">
          Describe your property and what you want covered. Our AI advisor builds a custom subscription &amp;
          maintenance plan from our service catalog — then you fine-tune it below.
        </p>

        {/* Property / account type selector (hidden when a portal has only one) */}
        {entityConfigs.length > 1 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {entityConfigs.map(e => (
              <button
                key={e.id}
                onClick={() => { setEntity(e.id); setSelectedIds(new Set()); setCustomItems([]); setActivePresetId(null); }}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition ${
                  entity === e.id
                    ? 'bg-orange-600 text-white border-orange-500'
                    : 'bg-[#0d0d0d] text-gray-400 border-[#1f1f1f] hover:text-gray-200'
                }`}
              >
                <span className="mr-1">{e.icon}</span>{e.label}
              </button>
            ))}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-2">
          <textarea
            value={needs}
            onChange={e => setNeeds(e.target.value)}
            placeholder="e.g. I own a 3-unit rental in Manchester. I want winter snow removal, furnace tune-ups, and smoke detector checks on a budget."
            rows={2}
            className="flex-1 resize-none rounded-xl bg-[#0a0a0a] border border-[#1f1f1f] px-4 py-3 text-sm text-white placeholder-gray-600 focus:border-orange-500/50 focus:outline-none"
          />
          <button
            onClick={runAI}
            disabled={loading}
            className="shrink-0 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-semibold bg-gradient-to-r from-orange-600 to-orange-700 text-white hover:from-orange-700 hover:to-orange-800 disabled:opacity-60 transition"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
            {loading ? 'Building…' : 'Build Plan'}
          </button>
        </div>

        {aiRationale && (
          <div className="mt-4 rounded-xl bg-[#0a0a0a] border border-[#1f1f1f] p-4">
            <p className="text-sm text-gray-300">{aiRationale}</p>
            {followUp && <p className="text-sm text-orange-400 mt-2">{followUp}</p>}
          </div>
        )}
      </div>

      {/* Three set options (presets built from the same catalog) */}
      {presets.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Layers className="w-4 h-4 text-orange-400" />
            <h3 className="text-sm font-semibold text-white">Start with a set plan</h3>
            <span className="text-xs text-gray-500">— then add anything you like</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {presets.map(preset => {
              const base = presetBaseMonthly(entity, preset);
              const price = computePrice(base, skill.multiplier, frequency.multiplier);
              const active = activePresetId === preset.id;
              return (
                <button
                  key={preset.id}
                  onClick={() => applyPreset(preset)}
                  className={`relative text-left rounded-xl border p-4 transition ${
                    active
                      ? 'border-orange-500 bg-orange-600/10 ring-1 ring-orange-500/40'
                      : 'border-[#1f1f1f] bg-[#0d0d0d] hover:border-orange-500/40'
                  }`}
                >
                  {preset.recommended && (
                    <span className="absolute top-3 right-3 text-[10px] px-1.5 py-0.5 rounded bg-green-500/15 text-green-400">Most popular</span>
                  )}
                  <p className="text-white font-semibold">{preset.name}</p>
                  <p className="text-xs text-gray-500 mb-3 pr-16">{preset.tagline}</p>
                  <p className="text-2xl font-bold text-white">${price.toLocaleString()}<span className="text-sm text-gray-500 font-normal">/mo</span></p>
                  <p className="text-[11px] text-gray-600 mb-3">{preset.serviceIds.length} services included</p>
                  <span className={`inline-flex items-center gap-1 text-xs font-medium ${active ? 'text-orange-400' : 'text-gray-400'}`}>
                    {active ? <><Check className="w-3.5 h-3.5" /> Selected</> : <><Plus className="w-3.5 h-3.5" /> Use this plan</>}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Plan config + summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
        {/* Left: service selection */}
        <div className="lg:col-span-2 space-y-4">
          {/* Skill + frequency controls */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="rounded-xl border border-[#1f1f1f] bg-[#0d0d0d] p-3">
              <p className="text-xs uppercase tracking-wide text-gray-500 mb-2">Technician Level</p>
              <div className="flex gap-1">
                {SKILL_LEVELS.map(s => (
                  <button
                    key={s.id}
                    onClick={() => setSkillId(s.id)}
                    className={`flex-1 px-2 py-1.5 rounded-lg text-xs font-medium transition ${
                      skillId === s.id ? 'bg-orange-600 text-white' : 'bg-[#161616] text-gray-400 hover:text-gray-200'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="rounded-xl border border-[#1f1f1f] bg-[#0d0d0d] p-3">
              <p className="text-xs uppercase tracking-wide text-gray-500 mb-2">Billing Frequency</p>
              <div className="flex gap-1">
                {FREQUENCY_TIERS.map(f => (
                  <button
                    key={f.id}
                    onClick={() => setFrequencyId(f.id)}
                    className={`flex-1 px-2 py-1.5 rounded-lg text-xs font-medium transition ${
                      frequencyId === f.id ? 'bg-orange-600 text-white' : 'bg-[#161616] text-gray-400 hover:text-gray-200'
                    }`}
                  >
                    {f.label}
                    {f.savingsLabel && <span className="block text-[10px] text-green-400">{f.savingsLabel}</span>}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Service catalog */}
          <div className="rounded-xl border border-[#1f1f1f] bg-[#0d0d0d] p-4">
            <p className="text-sm font-semibold text-white mb-3">Services ({selectedServices.length} selected)</p>
            <div className="space-y-1.5 max-h-[420px] overflow-y-auto pr-1">
              {catalog.map(s => {
                const active = selectedIds.has(s.id);
                const price = computePrice(s.baseMonthlyPrice, skill.multiplier, frequency.multiplier);
                return (
                  <button
                    key={s.id}
                    onClick={() => toggleService(s.id)}
                    className={`w-full text-left flex items-center gap-3 rounded-lg border p-2.5 transition ${
                      active
                        ? 'border-orange-500/50 bg-orange-600/10'
                        : 'border-[#1a1a1a] bg-[#0a0a0a] hover:border-[#2a2a2a]'
                    }`}
                  >
                    <span className={`shrink-0 w-6 h-6 rounded-md flex items-center justify-center ${
                      active ? 'bg-orange-600 text-white' : 'bg-[#161616] text-gray-500'
                    }`}>
                      {active ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="flex items-center gap-2">
                        <span className="text-sm text-white truncate">{s.name}</span>
                        {s.recommended && <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-500/15 text-green-400">Recommended</span>}
                        {s.nhSpecific && <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-400">NH</span>}
                      </span>
                      <span className="text-xs text-gray-500">{s.category} · {s.unit}</span>
                    </span>
                    <span className="shrink-0 text-sm font-semibold text-white">${price}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Price out your own custom request */}
          <div className="rounded-xl border border-dashed border-orange-500/30 bg-[#0d0d0d] p-4">
            <div className="flex items-center gap-2 mb-2">
              <PlusCircle className="w-4 h-4 text-orange-400" />
              <p className="text-sm font-semibold text-white">Need something we don't list?</p>
            </div>
            <p className="text-xs text-gray-500 mb-3">
              Describe any service you want and we'll price it out at fair local rates, then add it to your plan.
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                value={customRequest}
                onChange={e => setCustomRequest(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') priceCustom(); }}
                placeholder="e.g. Weekly pool servicing, or dedicated account manager…"
                className="flex-1 rounded-lg bg-[#0a0a0a] border border-[#1f1f1f] px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:border-orange-500/50 focus:outline-none"
              />
              <button
                onClick={priceCustom}
                disabled={pricingCustom}
                className="shrink-0 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold bg-[#161616] border border-orange-500/40 text-orange-300 hover:bg-orange-600/10 disabled:opacity-60 transition"
              >
                {pricingCustom ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                {pricingCustom ? 'Pricing…' : 'Price it out'}
              </button>
            </div>
          </div>
        </div>

        {/* Right: summary */}
        <div className="rounded-xl border border-[#1f1f1f] bg-[#0d0d0d] p-4 lg:sticky lg:top-4 space-y-4">
          <input
            value={planName}
            onChange={e => setPlanName(e.target.value)}
            className="w-full bg-transparent text-lg font-bold text-white border-b border-[#1f1f1f] pb-2 focus:border-orange-500/50 focus:outline-none"
          />
          <div className="space-y-1.5 max-h-56 overflow-y-auto">
            {selectedServices.length === 0 && customItems.length === 0 ? (
              <p className="text-sm text-gray-500">No services yet. Pick a set plan, use the AI builder, or choose from the list.</p>
            ) : (
              <>
                {selectedServices.map(s => {
                  const price = computePrice(s.baseMonthlyPrice, skill.multiplier, frequency.multiplier);
                  return (
                    <div key={s.id} className="flex items-center justify-between gap-2 text-sm">
                      <span className="text-gray-300 truncate">{s.name}</span>
                      <span className="flex items-center gap-2 shrink-0">
                        <span className="text-white">${price}</span>
                        <button onClick={() => toggleService(s.id)} className="text-gray-600 hover:text-red-400">
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                      </span>
                    </div>
                  );
                })}
                {customItems.map(c => {
                  const price = computePrice(c.baseMonthlyPrice, skill.multiplier, frequency.multiplier);
                  return (
                    <div key={c.id} className="flex items-center justify-between gap-2 text-sm">
                      <span className="flex items-center gap-1.5 text-gray-300 truncate">
                        <span className="text-[9px] px-1 py-0.5 rounded bg-orange-500/15 text-orange-400 shrink-0">CUSTOM</span>
                        <span className="truncate">{c.name}</span>
                      </span>
                      <span className="flex items-center gap-2 shrink-0">
                        <span className="text-white">${price}</span>
                        <button onClick={() => removeCustom(c.id)} className="text-gray-600 hover:text-red-400">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </span>
                    </div>
                  );
                })}
              </>
            )}
          </div>

          <div className="border-t border-[#1f1f1f] pt-3 space-y-1">
            <div className="flex items-center justify-between text-sm text-gray-400">
              <span>{skill.label} · {frequency.label}</span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-gray-400 text-sm">Est. total</span>
              <span className="text-2xl font-bold text-white">${monthlyTotal.toLocaleString()}<span className="text-sm text-gray-500 font-normal">/mo</span></span>
            </div>
            <p className="text-xs text-gray-600 text-right">≈ ${(monthlyTotal * 12).toLocaleString()}/yr</p>
          </div>

          <button
            onClick={savePlan}
            disabled={saving}
            className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-lg font-semibold bg-gradient-to-r from-orange-600 to-orange-700 text-white hover:from-orange-700 hover:to-orange-800 disabled:opacity-60 transition"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? 'Activating…' : 'Save My Plan'}
          </button>
          <button
            onClick={() => { setSelectedIds(new Set()); setCustomItems([]); setActivePresetId(null); setAiRationale(''); setFollowUp(''); }}
            className="w-full inline-flex items-center justify-center gap-2 py-2 rounded-lg text-sm text-gray-400 hover:text-white transition"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Start over
          </button>
          <button
            onClick={() => setShowUpgrade(true)}
            className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium bg-[#0a0a0a] border border-[#2a2a2a] text-white hover:border-orange-500/50 transition"
          >
            <Crown className="w-4 h-4 text-orange-400" /> View subscription tiers
          </button>
        </div>
      </div>

      <PortalUpgradeModal
        isOpen={showUpgrade}
        onClose={() => setShowUpgrade(false)}
        portalType={portalType}
        currentTier={currentTier}
      />
    </div>
  );
}
