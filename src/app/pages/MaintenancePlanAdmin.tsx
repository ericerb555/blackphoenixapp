/**
 * Maintenance Plan Admin
 * In-app editor for the maintenance plan builder's configuration:
 * service catalog, technician (skill) levels, frequency tiers, and pricing
 * regions. Changes are saved to the server and picked up by the builder.
 */
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import {
  Save, RotateCcw, Plus, Trash2, Wrench, Users, CalendarClock, MapPin,
  ArrowLeft, Loader2, Star, BadgeCheck, ClipboardCheck, Check, X, RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  fetchMaintenanceConfig,
  saveMaintenanceConfig,
  getDefaultConfig,
  type MaintenanceConfig,
  type EntityType,
  type ServiceItem,
  type SkillLevel,
  type FrequencyTier,
  type Region,
} from '../data/maintenanceConfig';

type TabId = 'services' | 'skills' | 'frequency' | 'regions' | 'requests';
type CustomPlanItem = { id: string; name: string; details?: string; frequency?: string; status: 'pending_pricing' | 'approved' | 'rejected'; price?: number; reviewNote?: string };
type PlanDraft = { ownerEmail: string; updatedAt?: string; customItems?: CustomPlanItem[]; selectedItems?: unknown[]; planName?: string };

const TABS: { id: TabId; label: string; icon: any }[] = [
  { id: 'services',  label: 'Services',          icon: Wrench },
  { id: 'skills',    label: 'Technician Levels', icon: Users },
  { id: 'frequency', label: 'Frequency Tiers',   icon: CalendarClock },
  { id: 'regions',   label: 'Pricing Regions',   icon: MapPin },
  { id: 'requests',  label: 'Custom Requests',   icon: ClipboardCheck },
];

const CARD = { background: '#111', border: '1px solid rgba(255,255,255,0.07)' } as const;
const INPUT = 'px-3 py-2 rounded-lg text-sm text-white bg-black/40 border border-white/10 focus:outline-none focus:border-orange-500/50';

export default function MaintenancePlanAdmin({
  onNavigate,
}: {
  onNavigate?: (p: string) => void;
}) {
  const [config, setConfig] = useState<MaintenanceConfig>(() => getDefaultConfig());
  const [tab, setTab] = useState<TabId>('services');
  const [entityTab, setEntityTab] = useState<EntityType>('homeowner');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [drafts, setDrafts] = useState<PlanDraft[]>([]);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [prices, setPrices] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});

  useEffect(() => {
    (async () => {
      const cfg = await fetchMaintenanceConfig();
      setConfig(cfg);
      const firstEntity = cfg.entityTypes[0]?.id as EntityType | undefined;
      if (firstEntity) setEntityTab(firstEntity);
      setLoading(false);
    })();
  }, []);

  useEffect(() => { if (tab === 'requests') void loadCustomRequests(); }, [tab]);

  function mutate(fn: (draft: MaintenanceConfig) => void) {
    setConfig(prev => {
      const next: MaintenanceConfig = JSON.parse(JSON.stringify(prev));
      fn(next);
      return next;
    });
    setDirty(true);
  }

  async function handleSave() {
    setSaving(true);
    const ok = await saveMaintenanceConfig(config);
    setSaving(false);
    if (ok) {
      setDirty(false);
      toast.success('Configuration saved. The builder now uses your updated pricing.');
    } else {
      toast.error('Failed to save configuration. Check your connection and try again.');
    }
  }

  async function handleReset() {
    setLoading(true);
    const cfg = await fetchMaintenanceConfig();
    setConfig(cfg);
    setDirty(false);
    setLoading(false);
    toast.info('Reverted to last saved configuration.');
  }

  const adminHeaders = async (contentType = false) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) throw new Error('Sign in with an administrator account to review custom requests.');
    return { Authorization: `Bearer ${session.access_token || publicAnonKey}`, ...(contentType ? { 'Content-Type': 'application/json' } : {}) };
  };

  const loadCustomRequests = async () => {
    setRequestsLoading(true);
    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6/maintenance-drafts`, { headers: await adminHeaders() });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || 'Could not load custom plan requests.');
      setDrafts(result.drafts || []);
    } catch (error: any) {
      toast.error(error.message || 'Could not load custom plan requests.');
    } finally { setRequestsLoading(false); }
  };

  const reviewCustomItem = async (email: string, item: CustomPlanItem, status: CustomPlanItem['status']) => {
    const key = `${email}:${item.id}`;
    const priceInput = prices[key] ?? (item.price !== undefined ? String(item.price) : '');
    const price = Number(priceInput);
    if (status === 'approved' && (priceInput.trim() === '' || !Number.isFinite(price) || price < 0)) { toast.error('Enter a valid price before approving this item.'); return; }
    setReviewingId(key);
    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6/maintenance-drafts/${encodeURIComponent(email)}/custom-items/${encodeURIComponent(item.id)}`, {
        method: 'PATCH', headers: await adminHeaders(true), body: JSON.stringify({ status, price, reviewNote: notes[key] || '' }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || 'Could not update this request.');
      setDrafts(current => current.map(draft => draft.ownerEmail === email ? result.draft : draft));
      toast.success(status === 'approved' ? 'Custom item approved and priced.' : status === 'rejected' ? 'Custom item declined.' : 'Custom item returned to pricing review.');
    } catch (error: any) { toast.error(error.message || 'Could not update this request.'); }
    finally { setReviewingId(null); }
  };

  function restoreDefaults() {
    setConfig(getDefaultConfig());
    setDirty(true);
    toast.info('Loaded code defaults. Click Save to apply them.');
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0a0a0a' }}>
        <Loader2 className="w-6 h-6 text-orange-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: '#0a0a0a', color: 'white' }}>
      {/* Header */}
      <div className="sticky top-0 z-20 border-b" style={{ background: '#0d0d0d', borderColor: 'rgba(255,255,255,0.07)' }}>
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3 flex-wrap">
          {onNavigate && (
            <button
              onClick={() => onNavigate('maintenance-plans')}
              className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-white transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to builder
            </button>
          )}
          <div className="flex-1">
            <h1 className="font-black text-white text-lg leading-tight">Maintenance Plan Admin</h1>
            <p className="text-xs text-gray-600">Edit services, technician levels, frequency tiers & regional pricing</p>
          </div>
          <button
            onClick={restoreDefaults}
            className="px-3 py-2 rounded-xl text-xs font-bold text-gray-400 border border-white/10 hover:border-white/20 transition"
          >
            Load defaults
          </button>
          <button
            onClick={handleReset}
            disabled={!dirty}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-gray-400 border border-white/10 hover:border-white/20 transition disabled:opacity-40"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Revert
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !dirty}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black text-white transition disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #ea580c, #ea580ccc)' }}
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            {dirty ? 'Save changes' : 'Saved'}
          </button>
        </div>

        {/* Tabs */}
        <div className="max-w-6xl mx-auto px-4 pb-2 flex gap-1.5 flex-wrap">
          {TABS.map(t => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                  tab === t.id
                    ? 'text-orange-400 bg-orange-500/10 border border-orange-500/30'
                    : 'text-gray-500 border border-transparent hover:text-gray-300'
                }`}
              >
                <Icon className="w-3.5 h-3.5" /> {t.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-5">
        {tab === 'services'  && <ServicesTab config={config} entityTab={entityTab} setEntityTab={setEntityTab} mutate={mutate} />}
        {tab === 'skills'    && <SkillsTab config={config} mutate={mutate} />}
        {tab === 'frequency' && <FrequencyTab config={config} mutate={mutate} />}
        {tab === 'regions'   && <RegionsTab config={config} mutate={mutate} />}
        {tab === 'requests'  && <CustomRequestsTab drafts={drafts} loading={requestsLoading} onRefresh={loadCustomRequests} prices={prices} setPrices={setPrices} notes={notes} setNotes={setNotes} reviewingId={reviewingId} onReview={reviewCustomItem} />}
      </div>
    </div>
  );
}

// ─── Services Tab ───────────────────────────────────────────────────────────────

function ServicesTab({
  config, entityTab, setEntityTab, mutate,
}: {
  config: MaintenanceConfig;
  entityTab: EntityType;
  setEntityTab: (e: EntityType) => void;
  mutate: (fn: (d: MaintenanceConfig) => void) => void;
}) {
  const services = config.catalog[entityTab] || [];

  function addService() {
    mutate(d => {
      const list = d.catalog[entityTab] || (d.catalog[entityTab] = []);
      list.push({
        id: `svc-${Date.now()}`,
        category: 'General',
        name: 'New Service',
        description: '',
        baseMonthlyPrice: 100,
        unit: 'per visit',
      });
    });
  }

  function updateService(id: string, patch: Partial<ServiceItem>) {
    mutate(d => {
      const list = d.catalog[entityTab] || [];
      const idx = list.findIndex(s => s.id === id);
      if (idx >= 0) list[idx] = { ...list[idx], ...patch };
    });
  }

  function removeService(id: string) {
    mutate(d => {
      d.catalog[entityTab] = (d.catalog[entityTab] || []).filter(s => s.id !== id);
    });
  }

  return (
    <div className="space-y-4">
      {/* Entity selector */}
      <div className="flex gap-1.5 flex-wrap">
        {config.entityTypes.map(e => (
          <button
            key={e.id}
            onClick={() => setEntityTab(e.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition border ${
              entityTab === e.id
                ? 'text-white'
                : 'text-gray-500 border-white/10 hover:border-white/20'
            }`}
            style={entityTab === e.id ? { background: `${e.accentColor}22`, borderColor: `${e.accentColor}55`, color: e.accentColor } : undefined}
          >
            <span>{e.icon}</span> {e.label}
            <span className="opacity-60">({(config.catalog[e.id] || []).length})</span>
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-600">{services.length} services in {entityTab}</p>
        <button onClick={addService}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-orange-400 bg-orange-500/10 border border-orange-500/25 transition hover:bg-orange-500/20">
          <Plus className="w-3.5 h-3.5" /> Add service
        </button>
      </div>

      <div className="space-y-3">
        {services.map(s => (
          <div key={s.id} className="rounded-2xl p-4 space-y-3" style={CARD}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Name">
                <input className={INPUT + ' w-full'} value={s.name}
                  onChange={e => updateService(s.id, { name: e.target.value })} />
              </Field>
              <Field label="Category">
                <input className={INPUT + ' w-full'} value={s.category}
                  onChange={e => updateService(s.id, { category: e.target.value })} />
              </Field>
            </div>
            <Field label="Description">
              <input className={INPUT + ' w-full'} value={s.description}
                onChange={e => updateService(s.id, { description: e.target.value })} />
            </Field>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 items-end">
              <Field label="Base $/mo">
                <input type="number" className={INPUT + ' w-full'} value={s.baseMonthlyPrice}
                  onChange={e => updateService(s.id, { baseMonthlyPrice: Number(e.target.value) || 0 })} />
              </Field>
              <Field label="Unit">
                <input className={INPUT + ' w-full'} value={s.unit}
                  onChange={e => updateService(s.id, { unit: e.target.value })} />
              </Field>
              <label className="flex items-center gap-2 text-xs text-gray-400 font-bold cursor-pointer pb-2">
                <input type="checkbox" checked={!!s.recommended}
                  onChange={e => updateService(s.id, { recommended: e.target.checked })} />
                <Star className="w-3.5 h-3.5 text-amber-400" /> Recommended
              </label>
              <label className="flex items-center gap-2 text-xs text-gray-400 font-bold cursor-pointer pb-2">
                <input type="checkbox" checked={!!s.nhSpecific}
                  onChange={e => updateService(s.id, { nhSpecific: e.target.checked })} />
                <BadgeCheck className="w-3.5 h-3.5 text-sky-400" /> NH-specific
              </label>
            </div>
            <div className="flex justify-end">
              <button onClick={() => removeService(s.id)}
                className="flex items-center gap-1.5 text-xs text-gray-600 hover:text-red-400 transition">
                <Trash2 className="w-3.5 h-3.5" /> Remove
              </button>
            </div>
          </div>
        ))}
        {services.length === 0 && (
          <p className="text-center py-10 text-gray-600 text-sm">No services yet. Click “Add service”.</p>
        )}
      </div>
    </div>
  );
}

// ─── Skills Tab ─────────────────────────────────────────────────────────────────

function SkillsTab({
  config, mutate,
}: {
  config: MaintenanceConfig;
  mutate: (fn: (d: MaintenanceConfig) => void) => void;
}) {
  function add() {
    mutate(d => {
      d.skillLevels.push({ id: `skill-${Date.now()}`, label: 'New Level', description: '', multiplier: 1, badge: 'NEW' });
    });
  }
  function update(id: string, patch: Partial<SkillLevel>) {
    mutate(d => {
      const idx = d.skillLevels.findIndex(s => s.id === id);
      if (idx >= 0) d.skillLevels[idx] = { ...d.skillLevels[idx], ...patch };
    });
  }
  function remove(id: string) {
    mutate(d => { d.skillLevels = d.skillLevels.filter(s => s.id !== id); });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-600">
          The multiplier scales every service's base price for this technician level (e.g. 1.30 = +30%).
        </p>
        <button onClick={add}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-orange-400 bg-orange-500/10 border border-orange-500/25 transition hover:bg-orange-500/20">
          <Plus className="w-3.5 h-3.5" /> Add level
        </button>
      </div>
      <div className="space-y-3">
        {config.skillLevels.map(s => (
          <div key={s.id} className="rounded-2xl p-4 grid grid-cols-2 sm:grid-cols-5 gap-3 items-end" style={CARD}>
            <Field label="Label">
              <input className={INPUT + ' w-full'} value={s.label}
                onChange={e => update(s.id, { label: e.target.value })} />
            </Field>
            <Field label="Badge">
              <input className={INPUT + ' w-full'} value={s.badge}
                onChange={e => update(s.id, { badge: e.target.value })} />
            </Field>
            <Field label="Multiplier">
              <input type="number" step="0.01" className={INPUT + ' w-full'} value={s.multiplier}
                onChange={e => update(s.id, { multiplier: Number(e.target.value) || 0 })} />
            </Field>
            <div className="col-span-2">
              <Field label="Description">
                <input className={INPUT + ' w-full'} value={s.description}
                  onChange={e => update(s.id, { description: e.target.value })} />
              </Field>
            </div>
            <div className="col-span-2 sm:col-span-5 flex justify-end">
              <button onClick={() => remove(s.id)}
                className="flex items-center gap-1.5 text-xs text-gray-600 hover:text-red-400 transition">
                <Trash2 className="w-3.5 h-3.5" /> Remove
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Frequency Tab ──────────────────────────────────────────────────────────────

function FrequencyTab({
  config, mutate,
}: {
  config: MaintenanceConfig;
  mutate: (fn: (d: MaintenanceConfig) => void) => void;
}) {
  function add() {
    mutate(d => {
      d.frequencyTiers.push({ id: `freq-${Date.now()}`, label: 'New Tier', description: '', multiplier: 1 });
    });
  }
  function update(id: string, patch: Partial<FrequencyTier>) {
    mutate(d => {
      const idx = d.frequencyTiers.findIndex(f => f.id === id);
      if (idx >= 0) d.frequencyTiers[idx] = { ...d.frequencyTiers[idx], ...patch };
    });
  }
  function remove(id: string) {
    mutate(d => { d.frequencyTiers = d.frequencyTiers.filter(f => f.id !== id); });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-600">
          Multiplier discounts price for less-frequent commitments (e.g. 0.72 = 28% off). Savings label is optional.
        </p>
        <button onClick={add}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-orange-400 bg-orange-500/10 border border-orange-500/25 transition hover:bg-orange-500/20">
          <Plus className="w-3.5 h-3.5" /> Add tier
        </button>
      </div>
      <div className="space-y-3">
        {config.frequencyTiers.map(f => (
          <div key={f.id} className="rounded-2xl p-4 grid grid-cols-2 sm:grid-cols-5 gap-3 items-end" style={CARD}>
            <Field label="Label">
              <input className={INPUT + ' w-full'} value={f.label}
                onChange={e => update(f.id, { label: e.target.value })} />
            </Field>
            <Field label="Multiplier">
              <input type="number" step="0.01" className={INPUT + ' w-full'} value={f.multiplier}
                onChange={e => update(f.id, { multiplier: Number(e.target.value) || 0 })} />
            </Field>
            <Field label="Savings label">
              <input className={INPUT + ' w-full'} value={f.savingsLabel ?? ''}
                placeholder="e.g. Save 10%"
                onChange={e => update(f.id, { savingsLabel: e.target.value || undefined })} />
            </Field>
            <div className="col-span-2">
              <Field label="Description">
                <input className={INPUT + ' w-full'} value={f.description}
                  onChange={e => update(f.id, { description: e.target.value })} />
              </Field>
            </div>
            <div className="col-span-2 sm:col-span-5 flex justify-end">
              <button onClick={() => remove(f.id)}
                className="flex items-center gap-1.5 text-xs text-gray-600 hover:text-red-400 transition">
                <Trash2 className="w-3.5 h-3.5" /> Remove
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Regions Tab ────────────────────────────────────────────────────────────────

function RegionsTab({
  config, mutate,
}: {
  config: MaintenanceConfig;
  mutate: (fn: (d: MaintenanceConfig) => void) => void;
}) {
  function add() {
    mutate(d => {
      d.regions.push({ id: `region-${Date.now()}`, label: 'New Region', description: '', priceMultiplier: 1 });
    });
  }
  function update(id: string, patch: Partial<Region>) {
    mutate(d => {
      const idx = d.regions.findIndex(r => r.id === id);
      if (idx >= 0) d.regions[idx] = { ...d.regions[idx], ...patch };
    });
  }
  function remove(id: string) {
    mutate(d => { d.regions = d.regions.filter(r => r.id !== id); });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-600">
          The price multiplier adjusts all pricing for a region (e.g. New Hampshire at 1.10 = +10% over national base).
        </p>
        <button onClick={add}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-orange-400 bg-orange-500/10 border border-orange-500/25 transition hover:bg-orange-500/20">
          <Plus className="w-3.5 h-3.5" /> Add region
        </button>
      </div>
      <div className="space-y-3">
        {config.regions.map(r => (
          <div key={r.id} className="rounded-2xl p-4 grid grid-cols-2 sm:grid-cols-4 gap-3 items-end" style={CARD}>
            <Field label="Label">
              <input className={INPUT + ' w-full'} value={r.label}
                onChange={e => update(r.id, { label: e.target.value })} />
            </Field>
            <Field label="Price multiplier">
              <input type="number" step="0.01" className={INPUT + ' w-full'} value={r.priceMultiplier}
                onChange={e => update(r.id, { priceMultiplier: Number(e.target.value) || 0 })} />
            </Field>
            <div className="col-span-2">
              <Field label="Description">
                <input className={INPUT + ' w-full'} value={r.description}
                  onChange={e => update(r.id, { description: e.target.value })} />
              </Field>
            </div>
            <div className="col-span-2 sm:col-span-4 flex items-center justify-between">
              <span className="text-[11px] text-gray-600">
                Example: a $100/mo base becomes <span className="text-gray-300 font-bold">${Math.round(100 * r.priceMultiplier)}</span>/mo in this region.
              </span>
              <button onClick={() => remove(r.id)}
                className="flex items-center gap-1.5 text-xs text-gray-600 hover:text-red-400 transition">
                <Trash2 className="w-3.5 h-3.5" /> Remove
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Field wrapper ──────────────────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[10px] font-black text-gray-600 uppercase tracking-wide block mb-1">{label}</span>
      {children}
    </label>
  );
}


function CustomRequestsTab({ drafts, loading, onRefresh, prices, setPrices, notes, setNotes, reviewingId, onReview }: {
  drafts: PlanDraft[]; loading: boolean; onRefresh: () => void; prices: Record<string, string>; setPrices: React.Dispatch<React.SetStateAction<Record<string, string>>>; notes: Record<string, string>; setNotes: React.Dispatch<React.SetStateAction<Record<string, string>>>; reviewingId: string | null; onReview: (email: string, item: CustomPlanItem, status: CustomPlanItem["status"]) => void;
}) {
  const requests = drafts.flatMap(draft => (draft.customItems || []).map(item => ({ email: draft.ownerEmail, item, updatedAt: draft.updatedAt, planName: draft.planName })));
  return <section className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4"><div><h2 className="font-bold text-white">Customer custom plan requests</h2><p className="mt-1 text-sm text-gray-500">Set a price, approve it, or decline it. The customer sees the decision immediately in their plan builder.</p></div><button onClick={onRefresh} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-sm font-semibold text-gray-200 hover:border-orange-400 disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh</button></div>
    {loading ? <div className="grid min-h-48 place-items-center text-gray-400"><Loader2 className="h-6 w-6 animate-spin text-orange-400" /></div> : requests.length === 0 ? <div className="rounded-2xl border border-dashed border-white/10 p-10 text-center text-gray-500">No customer-added plan items are waiting for review.</div> : <div className="space-y-3">{requests.map(({ email, item, updatedAt, planName }) => { const key = `${email}:${item.id}`; const busy = reviewingId === key; const statusClass = item.status === 'approved' ? 'text-emerald-300 bg-emerald-500/10 border-emerald-500/20' : item.status === 'rejected' ? 'text-red-300 bg-red-500/10 border-red-500/20' : 'text-amber-300 bg-amber-500/10 border-amber-500/20'; return <article key={key} className="rounded-2xl border border-white/10 bg-[#111] p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-semibold text-white">{item.name}</p><p className="mt-1 text-sm text-gray-400">{item.details || 'No additional details.'}</p><p className="mt-2 text-xs text-gray-600">{email} · {planName || 'Custom plan'} · {item.frequency || 'monthly'}{updatedAt ? ` · updated ${new Date(updatedAt).toLocaleDateString()}` : ''}</p></div><span className={`rounded-full border px-2.5 py-1 text-xs font-bold capitalize ${statusClass}`}>{item.status.replace('_', ' ')}</span></div><div className="mt-4 grid gap-3 md:grid-cols-[150px_1fr_auto]"><input inputMode="decimal" value={prices[key] ?? (item.price?.toString() || '')} onChange={e => setPrices(current => ({ ...current, [key]: e.target.value }))} placeholder="Price ($)" className={INPUT} disabled={busy} /><input value={notes[key] ?? item.reviewNote ?? ''} onChange={e => setNotes(current => ({ ...current, [key]: e.target.value }))} placeholder="Optional note to customer" className={INPUT} disabled={busy} /><div className="flex gap-2"><button onClick={() => onReview(email, item, 'approved')} disabled={busy} className="inline-flex items-center gap-1 rounded-lg bg-emerald-500 px-3 py-2 text-sm font-bold text-black disabled:opacity-50"><Check className="h-4 w-4" /> Approve</button><button onClick={() => onReview(email, item, 'rejected')} disabled={busy} className="inline-flex items-center gap-1 rounded-lg border border-red-400/40 px-3 py-2 text-sm font-bold text-red-300 disabled:opacity-50"><X className="h-4 w-4" /> Decline</button></div></div></article>; })}</div>}
  </section>;
}
