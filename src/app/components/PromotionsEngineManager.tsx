/**
 * PromotionsEngineManager — admin panel for scheduled discounts + volume pricing.
 * Lives in the Content Center. Reads/writes via the /promotions-engine route.
 * Saves require an authenticated admin session.
 */
import { useState, useEffect, useCallback } from 'react';
import { Percent, CalendarClock, Layers3, Plus, Trash2, Save, RefreshCw, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { supabase } from '../lib/supabase';

const SERVER = `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6`;

interface ScheduledDiscount {
  id: string;
  name: string;
  scope: 'all' | 'category';
  category?: string;
  discountType: 'percent' | 'fixed';
  value: number;
  startsAt?: string;
  endsAt?: string;
  active: boolean;
}
interface VolumeTier { minQty: number; discountPercent: number }
interface PromoConfig {
  scheduledDiscounts: ScheduledDiscount[];
  volumePricing: { enabled: boolean; tiers: VolumeTier[] };
}

const DEFAULTS: PromoConfig = { scheduledDiscounts: [], volumePricing: { enabled: false, tiers: [] } };

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!on)} className="relative w-12 h-6 rounded-full transition-colors flex-shrink-0" style={{ background: on ? '#ea580c' : 'rgba(255,255,255,0.15)' }}>
      <span className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform" style={{ transform: on ? 'translateX(24px)' : 'translateX(0)' }} />
    </button>
  );
}

export default function PromotionsEngineManager() {
  const [config, setConfig] = useState<PromoConfig>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${SERVER}/promotions-engine`, { headers: { Authorization: `Bearer ${publicAnonKey}`, apikey: publicAnonKey } });
      const data = await res.json().catch(() => null);
      if (data?.success && data.config) setConfig({ ...DEFAULTS, ...data.config });
    } catch (err) {
      console.error('Failed to load promotions engine config:', err);
      toast.error('Could not load promotions.');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) { toast.error('You must be signed in as an admin to save promotions.'); return; }
      const res = await fetch(`${SERVER}/promotions-engine`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ config }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) throw new Error(data?.error || `Save failed (${res.status})`);
      setConfig({ ...DEFAULTS, ...data.config });
      toast.success('Promotions saved — live on the storefront.');
    } catch (err: any) {
      console.error('Failed to save promotions engine config:', err);
      toast.error(err.message || 'Could not save promotions.');
    } finally { setSaving(false); }
  };

  const inputCls = 'px-3 py-2 rounded-lg text-sm bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-orange-500/50';
  const labelCls = 'text-xs text-gray-400 mb-1 block';

  const addDiscount = () => setConfig(c => ({
    ...c,
    scheduledDiscounts: [...c.scheduledDiscounts, {
      id: `disc_${Date.now()}`, name: 'New discount', scope: 'all', discountType: 'percent', value: 10, active: true, startsAt: '', endsAt: '',
    }],
  }));
  const updateDiscount = (id: string, patch: Partial<ScheduledDiscount>) =>
    setConfig(c => ({ ...c, scheduledDiscounts: c.scheduledDiscounts.map(d => d.id === id ? { ...d, ...patch } : d) }));
  const removeDiscount = (id: string) =>
    setConfig(c => ({ ...c, scheduledDiscounts: c.scheduledDiscounts.filter(d => d.id !== id) }));

  const addTier = () => setConfig(c => ({ ...c, volumePricing: { ...c.volumePricing, tiers: [...c.volumePricing.tiers, { minQty: 2, discountPercent: 5 }] } }));
  const updateTier = (i: number, patch: Partial<VolumeTier>) =>
    setConfig(c => ({ ...c, volumePricing: { ...c.volumePricing, tiers: c.volumePricing.tiers.map((t, idx) => idx === i ? { ...t, ...patch } : t) } }));
  const removeTier = (i: number) =>
    setConfig(c => ({ ...c, volumePricing: { ...c.volumePricing, tiers: c.volumePricing.tiers.filter((_, idx) => idx !== i) } }));

  if (loading) return <div className="flex items-center justify-center py-20 text-gray-400"><Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading promotions…</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Percent className="w-6 h-6 text-orange-400" />
          <div>
            <h3 className="text-lg font-black text-white">Promotions Engine</h3>
            <p className="text-xs text-gray-500">Scheduled discounts &amp; volume pricing — applied automatically at the storefront.</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={load} disabled={saving} className="px-3 py-2 rounded-xl text-sm text-gray-300 bg-white/5 hover:bg-white/10 transition flex items-center gap-2"><RefreshCw className="w-4 h-4" /> Reload</button>
          <button onClick={save} disabled={saving} className="px-4 py-2 rounded-xl text-sm font-bold text-white transition flex items-center gap-2" style={{ background: '#ea580c' }}>{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save</button>
        </div>
      </div>

      {/* Scheduled discounts */}
      <div className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.035)', border: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2"><CalendarClock className="w-5 h-5 text-orange-400" /><h4 className="text-white font-bold text-sm">Scheduled discounts</h4></div>
          <button onClick={addDiscount} className="px-3 py-1.5 rounded-lg text-xs font-bold text-white flex items-center gap-1.5" style={{ background: 'rgba(234,88,12,0.9)' }}><Plus className="w-3.5 h-3.5" /> Add</button>
        </div>
        {config.scheduledDiscounts.length === 0 ? (
          <p className="text-xs text-gray-500 py-4 text-center">No scheduled discounts. Add one to run a timed sale — it applies to prices automatically within its window.</p>
        ) : (
          <div className="space-y-4">
            {config.scheduledDiscounts.map(d => (
              <div key={d.id} className="rounded-xl p-4" style={{ background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="flex items-center justify-between mb-3 gap-3">
                  <input className={`${inputCls} flex-1`} value={d.name} onChange={e => updateDiscount(d.id, { name: e.target.value })} placeholder="Discount name" />
                  <div className="flex items-center gap-2"><span className="text-xs text-gray-400">Active</span><Toggle on={d.active} onChange={v => updateDiscount(d.id, { active: v })} /></div>
                  <button onClick={() => removeDiscount(d.id)} className="p-2 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition"><Trash2 className="w-4 h-4" /></button>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <div>
                    <label className={labelCls}>Applies to</label>
                    <select className={`${inputCls} w-full`} value={d.scope} onChange={e => updateDiscount(d.id, { scope: e.target.value as any })}>
                      <option value="all">All products</option>
                      <option value="category">A category</option>
                    </select>
                  </div>
                  {d.scope === 'category' && (
                    <div>
                      <label className={labelCls}>Category</label>
                      <input className={`${inputCls} w-full`} value={d.category || ''} onChange={e => updateDiscount(d.id, { category: e.target.value })} placeholder="e.g. Electronics" />
                    </div>
                  )}
                  <div>
                    <label className={labelCls}>Type</label>
                    <select className={`${inputCls} w-full`} value={d.discountType} onChange={e => updateDiscount(d.id, { discountType: e.target.value as any })}>
                      <option value="percent">% off</option>
                      <option value="fixed">$ off</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>{d.discountType === 'percent' ? 'Percent off' : 'Amount off ($)'}</label>
                    <input type="number" className={`${inputCls} w-full`} value={d.value} onChange={e => updateDiscount(d.id, { value: Number(e.target.value) })} />
                  </div>
                  <div>
                    <label className={labelCls}>Starts (optional)</label>
                    <input type="datetime-local" className={`${inputCls} w-full`} value={d.startsAt || ''} onChange={e => updateDiscount(d.id, { startsAt: e.target.value })} />
                  </div>
                  <div>
                    <label className={labelCls}>Ends (optional)</label>
                    <input type="datetime-local" className={`${inputCls} w-full`} value={d.endsAt || ''} onChange={e => updateDiscount(d.id, { endsAt: e.target.value })} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Volume pricing */}
      <div className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.035)', border: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2"><Layers3 className="w-5 h-5 text-orange-400" /><div><h4 className="text-white font-bold text-sm">Volume / tiered pricing</h4><p className="text-xs text-gray-500 mt-0.5">Per-unit price drops as cart quantity crosses each tier.</p></div></div>
          <Toggle on={config.volumePricing.enabled} onChange={v => setConfig(c => ({ ...c, volumePricing: { ...c.volumePricing, enabled: v } }))} />
        </div>
        {config.volumePricing.enabled && (
          <>
            <div className="space-y-2">
              {config.volumePricing.tiers.map((t, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-xs text-gray-400">Buy</span>
                  <input type="number" className={`${inputCls} w-20`} value={t.minQty} onChange={e => updateTier(i, { minQty: Number(e.target.value) })} />
                  <span className="text-xs text-gray-400">or more →</span>
                  <input type="number" className={`${inputCls} w-20`} value={t.discountPercent} onChange={e => updateTier(i, { discountPercent: Number(e.target.value) })} />
                  <span className="text-xs text-gray-400">% off each</span>
                  <button onClick={() => removeTier(i)} className="p-2 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition ml-auto"><Trash2 className="w-4 h-4" /></button>
                </div>
              ))}
            </div>
            <button onClick={addTier} className="mt-3 px-3 py-1.5 rounded-lg text-xs font-bold text-white flex items-center gap-1.5" style={{ background: 'rgba(234,88,12,0.9)' }}><Plus className="w-3.5 h-3.5" /> Add tier</button>
          </>
        )}
      </div>
    </div>
  );
}
