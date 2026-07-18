/**
 * Subscription & Maintenance Plans
 * Entity-aware service catalog with dynamic pricing engine.
 * All service data lives in src/app/data/maintenancePlans.ts
 */
import { useState, useMemo } from 'react';
import {
  ChevronDown, ChevronUp, CheckCircle, Circle, Star, Zap, Shield,
  ShoppingCart, X, Download, RefreshCw, Info, BadgeCheck, Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  ENTITY_TYPES, SKILL_LEVELS, FREQUENCY_TIERS, SERVICE_CATALOG,
  computePrice, getCategories,
  type EntityType, type ServiceItem,
} from '../data/maintenancePlans';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ServiceSelection {
  serviceId: string;
  skillId: string;
  frequencyId: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const SKILL_BADGE_STYLE: Record<string, string> = {
  apprentice: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  journeyman: 'text-green-400 bg-green-500/10 border-green-500/20',
  master:     'text-amber-400 bg-amber-500/10 border-amber-500/20',
};

const FREQ_BADGE_STYLE: Record<string, string> = {
  monthly:   'text-gray-400 bg-gray-500/10 border-gray-500/20',
  quarterly: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
  annual:    'text-orange-400 bg-orange-500/10 border-orange-500/20',
};

function formatPrice(n: number) {
  return '$' + n.toLocaleString();
}

// ─── ServiceCard ──────────────────────────────────────────────────────────────

function ServiceCard({
  service,
  selection,
  accentColor,
  onToggle,
  onSkillChange,
  onFreqChange,
}: {
  service: ServiceItem;
  selection: ServiceSelection | undefined;
  accentColor: string;
  onToggle: (id: string) => void;
  onSkillChange: (id: string, skill: string) => void;
  onFreqChange: (id: string, freq: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const selected = !!selection;

  const skillLevel = SKILL_LEVELS.find(s => s.id === (selection?.skillId ?? 'journeyman'))!;
  const freqTier   = FREQUENCY_TIERS.find(f => f.id === (selection?.frequencyId ?? 'monthly'))!;
  const price      = computePrice(service.baseMonthlyPrice, skillLevel.multiplier, freqTier.multiplier);

  return (
    <div
      className="rounded-2xl overflow-hidden transition-all duration-200"
      style={{
        background: selected ? `rgba(${hexToRgb(accentColor)}, 0.06)` : '#111',
        border: `1px solid ${selected ? accentColor + '40' : 'rgba(255,255,255,0.07)'}`,
      }}
    >
      {/* Header row */}
      <div className="flex items-start gap-3 p-4">
        <button
          onClick={() => onToggle(service.id)}
          className="mt-0.5 flex-shrink-0 transition"
        >
          {selected
            ? <CheckCircle className="w-5 h-5" style={{ color: accentColor }} />
            : <Circle className="w-5 h-5 text-gray-600" />}
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className={`font-bold text-sm ${selected ? 'text-white' : 'text-gray-300'}`}>
              {service.name}
            </p>
            {service.recommended && (
              <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full"
                style={{ background: `${accentColor}22`, color: accentColor, border: `1px solid ${accentColor}33` }}>
                RECOMMENDED
              </span>
            )}
            {service.nhSpecific && (
              <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full text-sky-400 bg-sky-500/10 border border-sky-500/20">
                NH
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{service.description}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <p className="text-base font-black" style={{ color: selected ? accentColor : '#6b7280' }}>
            {formatPrice(price)}
          </p>
          <button onClick={() => setExpanded(e => !e)} className="text-gray-600 hover:text-gray-400 transition">
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Expanded controls */}
      {(expanded || selected) && (
        <div className="px-4 pb-4 space-y-3 border-t" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
          <div className="pt-3 grid grid-cols-2 gap-3">
            {/* Skill Level */}
            <div>
              <p className="text-[10px] font-black text-gray-600 uppercase tracking-wide mb-1.5">Technician Level</p>
              <div className="flex flex-col gap-1">
                {SKILL_LEVELS.map(skill => (
                  <button
                    key={skill.id}
                    onClick={() => { onSkillChange(service.id, skill.id); if (!selected) onToggle(service.id); }}
                    className={`flex items-center justify-between px-3 py-1.5 rounded-xl text-xs font-bold transition border ${
                      (selection?.skillId ?? 'journeyman') === skill.id
                        ? SKILL_BADGE_STYLE[skill.id]
                        : 'text-gray-600 border-gray-800 hover:border-gray-700'
                    }`}
                  >
                    <span>{skill.label}</span>
                    <span className="opacity-70">{skill.multiplier < 1 ? '↓' : skill.multiplier > 1 ? '↑' : ''}
                      {Math.round(Math.abs(1 - skill.multiplier) * 100)}%
                    </span>
                  </button>
                ))}
              </div>
            </div>
            {/* Frequency */}
            <div>
              <p className="text-[10px] font-black text-gray-600 uppercase tracking-wide mb-1.5">Frequency</p>
              <div className="flex flex-col gap-1">
                {FREQUENCY_TIERS.map(freq => (
                  <button
                    key={freq.id}
                    onClick={() => { onFreqChange(service.id, freq.id); if (!selected) onToggle(service.id); }}
                    className={`flex items-center justify-between px-3 py-1.5 rounded-xl text-xs font-bold transition border ${
                      (selection?.frequencyId ?? 'monthly') === freq.id
                        ? FREQ_BADGE_STYLE[freq.id]
                        : 'text-gray-600 border-gray-800 hover:border-gray-700'
                    }`}
                  >
                    <span>{freq.label}</span>
                    {freq.savingsLabel
                      ? <span className="text-green-400">{freq.savingsLabel}</span>
                      : <span className="opacity-40">base</span>}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between rounded-xl px-3 py-2"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
            <p className="text-xs text-gray-500">
              {skillLevel.label} · {freqTier.label} · {service.unit}
            </p>
            <p className="text-sm font-black" style={{ color: accentColor }}>
              {formatPrice(price)}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Summary Panel ─────────────────────────────────────────────────────────────

function SummaryPanel({
  selections,
  entityId,
  accentColor,
  onRemove,
  onClear,
  onCheckout,
}: {
  selections: Map<string, ServiceSelection>;
  entityId: EntityType;
  accentColor: string;
  onRemove: (id: string) => void;
  onClear: () => void;
  onCheckout: () => void;
}) {
  const services = SERVICE_CATALOG[entityId];

  const lineItems = useMemo(() => {
    return Array.from(selections.entries()).map(([serviceId, sel]) => {
      const service = services.find(s => s.id === serviceId)!;
      const skill   = SKILL_LEVELS.find(s => s.id === sel.skillId)!;
      const freq    = FREQUENCY_TIERS.find(f => f.id === sel.frequencyId)!;
      const price   = computePrice(service.baseMonthlyPrice, skill.multiplier, freq.multiplier);
      return { service, skill, freq, price };
    });
  }, [selections, services]);

  const monthlyTotal  = lineItems.reduce((s, l) => {
    const monthly = computePrice(l.service.baseMonthlyPrice, l.skill.multiplier, 1.0);
    return s + monthly;
  }, 0);
  const actualTotal   = lineItems.reduce((s, l) => s + l.price, 0);
  const totalSavings  = monthlyTotal - actualTotal;
  const annualTotal   = lineItems.reduce((s, l) => {
    const freq = l.freq.id === 'monthly' ? 12 : l.freq.id === 'quarterly' ? 4 : 1;
    return s + l.price * freq;
  }, 0);

  if (lineItems.length === 0) {
    return (
      <div className="rounded-2xl p-6 flex flex-col items-center justify-center text-center gap-3"
        style={{ background: '#111', border: '1px solid rgba(255,255,255,0.07)', minHeight: 220 }}>
        <ShoppingCart className="w-10 h-10 text-gray-700" />
        <p className="text-gray-600 text-sm">No services selected yet.<br />Check services from the catalog to build your plan.</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl overflow-hidden"
      style={{ background: '#111', border: `1px solid ${accentColor}30` }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b"
        style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
        <div className="flex items-center gap-2">
          <ShoppingCart className="w-4 h-4" style={{ color: accentColor }} />
          <p className="font-black text-white text-sm">Your Plan ({lineItems.length} services)</p>
        </div>
        <button onClick={onClear} className="text-xs text-gray-600 hover:text-red-400 transition flex items-center gap-1">
          <X className="w-3 h-3" /> Clear all
        </button>
      </div>

      {/* Line items */}
      <div className="max-h-72 overflow-y-auto divide-y" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
        {lineItems.map(({ service, skill, freq, price }) => (
          <div key={service.id} className="flex items-start gap-2 px-4 py-3">
            <button onClick={() => onRemove(service.id)} className="mt-0.5 flex-shrink-0 text-gray-700 hover:text-red-400 transition">
              <X className="w-3.5 h-3.5" />
            </button>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-gray-200 truncate">{service.name}</p>
              <p className="text-[10px] text-gray-600 mt-0.5">{skill.label} · {freq.label}</p>
            </div>
            <p className="text-xs font-black flex-shrink-0" style={{ color: accentColor }}>
              {formatPrice(price)}
            </p>
          </div>
        ))}
      </div>

      {/* Totals */}
      <div className="border-t px-4 py-3 space-y-1.5" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
        {totalSavings > 0 && (
          <div className="flex justify-between text-xs">
            <span className="text-gray-500">Frequency savings</span>
            <span className="text-green-400 font-bold">−{formatPrice(totalSavings)}/mo</span>
          </div>
        )}
        <div className="flex justify-between text-sm font-bold">
          <span className="text-gray-400">Monthly total</span>
          <span className="text-white">{formatPrice(actualTotal)}/mo</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-gray-600">Est. annual spend</span>
          <span className="text-gray-400">{formatPrice(annualTotal)}/yr</span>
        </div>
      </div>

      {/* CTA */}
      <div className="px-4 pb-4">
        <button
          onClick={onCheckout}
          className="w-full py-3 rounded-xl text-sm font-black text-white transition hover:brightness-110"
          style={{ background: `linear-gradient(135deg, ${accentColor}, ${accentColor}cc)` }}
        >
          Get This Plan — {formatPrice(actualTotal)}/mo
        </button>
      </div>
    </div>
  );
}

// ─── Tiny hex → rgb helper ────────────────────────────────────────────────────

function hexToRgb(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r}, ${g}, ${b}`;
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function SubscriptionMaintenancePlans({
  onNavigate,
}: {
  onNavigate?: (p: string) => void;
}) {
  const [entityId, setEntityId] = useState<EntityType | null>(null);
  const [selections, setSelections] = useState<Map<string, ServiceSelection>>(new Map());
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [search, setSearch] = useState('');
  const [showRecommended, setShowRecommended] = useState(false);

  const entity = ENTITY_TYPES.find(e => e.id === entityId);
  const accentColor = entity?.accentColor ?? '#ea580c';

  const categories = useMemo(() =>
    entityId ? ['All', ...getCategories(entityId)] : [],
  [entityId]);

  const filteredServices = useMemo(() => {
    if (!entityId) return [];
    return SERVICE_CATALOG[entityId].filter(s => {
      if (activeCategory !== 'All' && s.category !== activeCategory) return false;
      if (showRecommended && !s.recommended) return false;
      if (search && !s.name.toLowerCase().includes(search.toLowerCase()) &&
          !s.description.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [entityId, activeCategory, search, showRecommended]);

  function toggleService(id: string) {
    setSelections(prev => {
      const next = new Map(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.set(id, { serviceId: id, skillId: 'journeyman', frequencyId: 'monthly' });
      }
      return next;
    });
  }

  function updateSkill(id: string, skillId: string) {
    setSelections(prev => {
      const next = new Map(prev);
      const existing = next.get(id) ?? { serviceId: id, skillId, frequencyId: 'monthly' };
      next.set(id, { ...existing, skillId });
      return next;
    });
  }

  function updateFreq(id: string, frequencyId: string) {
    setSelections(prev => {
      const next = new Map(prev);
      const existing = next.get(id) ?? { serviceId: id, skillId: 'journeyman', frequencyId };
      next.set(id, { ...existing, frequencyId });
      return next;
    });
  }

  function handleEntityChange(id: EntityType) {
    setEntityId(id);
    setSelections(new Map());
    setActiveCategory('All');
    setSearch('');
    setShowRecommended(false);
  }

  function handleCheckout() {
    const total = Array.from(selections.entries()).reduce((s, [sid, sel]) => {
      const service = SERVICE_CATALOG[entityId!].find(x => x.id === sid)!;
      const skill   = SKILL_LEVELS.find(x => x.id === sel.skillId)!;
      const freq    = FREQUENCY_TIERS.find(x => x.id === sel.frequencyId)!;
      return s + computePrice(service.baseMonthlyPrice, skill.multiplier, freq.multiplier);
    }, 0);
    // Save to localStorage for future integration
    localStorage.setItem('bp_maintenance_plan_draft', JSON.stringify({
      entity: entityId,
      selections: Object.fromEntries(selections),
      totalMonthly: total,
      createdAt: new Date().toISOString(),
    }));
    toast.success(`Plan saved — ${formatPrice(total)}/mo. Your team will follow up to confirm details.`);
  }

  function exportPlan() {
    if (!entityId) return;
    const lines = Array.from(selections.entries()).map(([sid, sel]) => {
      const service = SERVICE_CATALOG[entityId].find(x => x.id === sid)!;
      const skill   = SKILL_LEVELS.find(x => x.id === sel.skillId)!;
      const freq    = FREQUENCY_TIERS.find(x => x.id === sel.frequencyId)!;
      const price   = computePrice(service.baseMonthlyPrice, skill.multiplier, freq.multiplier);
      return `${service.name} | ${skill.label} | ${freq.label} | $${price}/visit`;
    });
    const blob = new Blob([
      `BLACK PHOENIX BUILDS — MAINTENANCE PLAN\n`,
      `Entity: ${entity?.label}\n`,
      `Generated: ${new Date().toLocaleDateString()}\n\n`,
      lines.join('\n'),
    ], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `maintenance-plan-${entityId}-${Date.now()}.txt`;
    a.click();
    toast.success('Plan exported');
  }

  // ── Step 1: Entity Selection ───────────────────────────────────────────────
  if (!entityId) {
    return (
      <div className="min-h-screen p-4 sm:p-8" style={{ background: '#0a0a0a', color: 'white' }}>
        <div className="max-w-3xl mx-auto space-y-8">
          <div className="text-center space-y-2 pt-6">
            <div className="flex justify-center">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
                style={{ background: 'rgba(234,88,12,0.12)', border: '1px solid rgba(234,88,12,0.25)' }}>
                <Shield className="w-8 h-8 text-orange-400" />
              </div>
            </div>
            <h1 className="text-4xl font-black text-white pt-2">Maintenance Plans</h1>
            <p className="text-gray-500 text-base max-w-md mx-auto">
              Build a custom subscription plan tailored to your property type. Choose services, skill levels, and frequency.
            </p>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-black text-gray-600 uppercase tracking-widest text-center">
              Select your property type to get started
            </p>
            <div className="grid grid-cols-2 gap-4">
              {ENTITY_TYPES.map(e => (
                <button
                  key={e.id}
                  onClick={() => handleEntityChange(e.id)}
                  className="group relative rounded-2xl p-6 text-left transition-all duration-200 hover:scale-[1.02]"
                  style={{ background: '#111', border: `1px solid rgba(255,255,255,0.07)` }}
                >
                  <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition"
                    style={{ background: `radial-gradient(ellipse at top left, ${e.accentColor}15, transparent)` }} />
                  <p className="text-4xl mb-3">{e.icon}</p>
                  <p className="font-black text-white text-lg">{e.label}</p>
                  <p className="text-gray-500 text-xs mt-1">{e.description}</p>
                  <div className="mt-4 text-xs font-bold" style={{ color: e.accentColor }}>
                    {SERVICE_CATALOG[e.id].length} services available →
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-xl p-4 flex gap-3"
            style={{ background: 'rgba(234,88,12,0.05)', border: '1px solid rgba(234,88,12,0.15)' }}>
            <Info className="w-4 h-4 text-orange-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-gray-400">
              All plans are licensed and insured. Services marked <span className="text-sky-400 font-bold">NH</span> include
              New Hampshire-specific code compliance and seasonal considerations. Pricing shown before taxes and applicable permits.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ── Step 2: Service Catalog + Summary ─────────────────────────────────────
  return (
    <div className="min-h-screen" style={{ background: '#0a0a0a', color: 'white' }}>

      {/* Sticky top bar */}
      <div className="sticky top-0 z-20 border-b" style={{ background: '#0d0d0d', borderColor: 'rgba(255,255,255,0.07)' }}>
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3 flex-wrap">
          <button
            onClick={() => setEntityId(null)}
            className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-white transition"
          >
            ← Change type
          </button>
          <div className="flex items-center gap-2 flex-1">
            <span className="text-xl">{entity!.icon}</span>
            <span className="font-black text-white">{entity!.label}</span>
            <span className="text-xs text-gray-600">Maintenance Plan Builder</span>
          </div>
          <div className="flex gap-2">
            {selections.size > 0 && (
              <button onClick={exportPlan}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition"
                style={{ background: 'rgba(255,255,255,0.04)', color: '#9ca3af', border: '1px solid rgba(255,255,255,0.07)' }}>
                <Download className="w-3.5 h-3.5" /> Export
              </button>
            )}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold"
              style={{ background: `${accentColor}18`, color: accentColor, border: `1px solid ${accentColor}30` }}>
              <ShoppingCart className="w-3.5 h-3.5" />
              {selections.size} selected
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-5">
        <div className="flex gap-6 flex-col lg:flex-row">

          {/* Left: catalog */}
          <div className="flex-1 min-w-0 space-y-4">

            {/* Filters row */}
            <div className="flex gap-2 flex-wrap items-center">
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search services…"
                className="px-3 py-2 rounded-xl text-sm text-white focus:outline-none flex-1 min-w-40"
                style={{ background: '#111', border: '1px solid rgba(255,255,255,0.08)' }}
              />
              <button
                onClick={() => setShowRecommended(r => !r)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition border ${
                  showRecommended
                    ? 'text-amber-400 bg-amber-500/10 border-amber-500/20'
                    : 'text-gray-600 border-gray-800 hover:border-gray-700'
                }`}
              >
                <Star className="w-3.5 h-3.5" /> Recommended
              </button>
              <button
                onClick={() => {
                  // Select all recommended services
                  const recs = SERVICE_CATALOG[entityId].filter(s => s.recommended);
                  const next = new Map(selections);
                  recs.forEach(s => {
                    if (!next.has(s.id)) next.set(s.id, { serviceId: s.id, skillId: 'journeyman', frequencyId: 'quarterly' });
                  });
                  setSelections(next);
                  toast.success(`Added ${recs.filter(s => !selections.has(s.id)).length} recommended services`);
                }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition"
                style={{ background: `${accentColor}12`, color: accentColor, border: `1px solid ${accentColor}25` }}
              >
                <Sparkles className="w-3.5 h-3.5" /> Quick Start
              </button>
            </div>

            {/* Category tabs */}
            <div className="flex gap-1.5 flex-wrap">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold transition"
                  style={activeCategory === cat
                    ? { background: accentColor, color: 'white' }
                    : { background: '#111', color: '#6b7280', border: '1px solid rgba(255,255,255,0.07)' }}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Results count */}
            <p className="text-xs text-gray-600">
              {filteredServices.length} service{filteredServices.length !== 1 ? 's' : ''}
              {activeCategory !== 'All' ? ` in ${activeCategory}` : ''}
              {showRecommended ? ' (recommended only)' : ''}
            </p>

            {/* Service cards */}
            <div className="space-y-2">
              {filteredServices.map(service => (
                <ServiceCard
                  key={service.id}
                  service={service}
                  selection={selections.get(service.id)}
                  accentColor={accentColor}
                  onToggle={toggleService}
                  onSkillChange={updateSkill}
                  onFreqChange={updateFreq}
                />
              ))}
              {filteredServices.length === 0 && (
                <div className="text-center py-12 text-gray-600">
                  <p>No services match your filters.</p>
                </div>
              )}
            </div>
          </div>

          {/* Right: summary */}
          <div className="lg:w-80 xl:w-96 flex-shrink-0">
            <div className="sticky top-20 space-y-4">
              <SummaryPanel
                selections={selections}
                entityId={entityId}
                accentColor={accentColor}
                onRemove={id => toggleService(id)}
                onClear={() => setSelections(new Map())}
                onCheckout={handleCheckout}
              />

              {/* Skill level legend */}
              <div className="rounded-2xl p-4 space-y-2"
                style={{ background: '#111', border: '1px solid rgba(255,255,255,0.07)' }}>
                <p className="text-xs font-black text-gray-600 uppercase tracking-wide">Skill Level Guide</p>
                {SKILL_LEVELS.map(s => (
                  <div key={s.id} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-black px-1.5 py-0.5 rounded border ${SKILL_BADGE_STYLE[s.id]}`}>
                        {s.badge}
                      </span>
                      <span className="text-gray-400">{s.description}</span>
                    </div>
                    <span className="text-gray-500">{Math.round(s.multiplier * 100)}%</span>
                  </div>
                ))}
              </div>

              {/* NH notice */}
              <div className="rounded-xl p-3 flex gap-2"
                style={{ background: 'rgba(14,165,233,0.05)', border: '1px solid rgba(14,165,233,0.15)' }}>
                <BadgeCheck className="w-4 h-4 text-sky-400 flex-shrink-0 mt-0.5" />
                <p className="text-[11px] text-gray-500">
                  Services marked <span className="text-sky-400 font-bold">NH</span> are aligned with New Hampshire RSA codes,
                  seasonal requirements, and local licensing standards.
                </p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
