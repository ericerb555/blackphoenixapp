/**
 * StoreBoostersManager — admin panel for AOV-boosting merchandising features.
 * Lives in the Content Center. Reads/writes the shared booster config via the
 * /store-boosters server route. Saves require an authenticated admin session.
 */
import { useState, useEffect, useCallback } from 'react';
import { Rocket, Truck, Timer, Layers, PackageX, Gift, Save, RefreshCw, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { supabase } from '../lib/supabase';

const SERVER = `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6`;

interface BoosterConfig {
  freeShipping: { enabled: boolean; threshold: number; message: string; unlockedMessage: string };
  urgency: { enabled: boolean; minutes: number; message: string };
  cartUpsell: { enabled: boolean; heading: string; maxItems: number };
  stockScarcity: { enabled: boolean; threshold: number; message: string };
  freeGift: { enabled: boolean; threshold: number; productName: string; message: string };
}

const DEFAULTS: BoosterConfig = {
  freeShipping: { enabled: true, threshold: 500, message: 'Add {remaining} more for FREE shipping!', unlockedMessage: "🎉 You've unlocked FREE shipping!" },
  urgency: { enabled: false, minutes: 15, message: '⚡ Flash deal ends soon — prices go back up when the timer hits zero!' },
  cartUpsell: { enabled: true, heading: 'Frequently bought together', maxItems: 4 },
  stockScarcity: { enabled: true, threshold: 8, message: 'Only {count} left in stock' },
  freeGift: { enabled: false, threshold: 750, productName: '', message: 'Spend {remaining} more to get a FREE gift!' },
};

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!on)}
      className="relative w-12 h-6 rounded-full transition-colors flex-shrink-0"
      style={{ background: on ? '#ea580c' : 'rgba(255,255,255,0.15)' }}
    >
      <span className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform" style={{ transform: on ? 'translateX(24px)' : 'translateX(0)' }} />
    </button>
  );
}

export default function StoreBoostersManager() {
  const [config, setConfig] = useState<BoosterConfig>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${SERVER}/store-boosters`, {
        headers: { Authorization: `Bearer ${publicAnonKey}`, apikey: publicAnonKey },
      });
      const data = await res.json().catch(() => null);
      if (data?.success && data.config) setConfig({ ...DEFAULTS, ...data.config });
    } catch (err) {
      console.error('Failed to load store boosters config:', err);
      toast.error('Could not load booster settings.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        toast.error('You must be signed in as an admin to save booster settings.');
        return;
      }
      const res = await fetch(`${SERVER}/store-boosters`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ config }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) {
        throw new Error(data?.error || `Save failed (${res.status})`);
      }
      setConfig({ ...DEFAULTS, ...data.config });
      toast.success('Store boosters saved — live on the storefront.');
    } catch (err: any) {
      console.error('Failed to save store boosters config:', err);
      toast.error(err.message || 'Could not save booster settings.');
    } finally {
      setSaving(false);
    }
  };

  const set = <K extends keyof BoosterConfig>(section: K, patch: Partial<BoosterConfig[K]>) =>
    setConfig((c) => ({ ...c, [section]: { ...c[section], ...patch } }));

  const inputCls = 'w-full px-3 py-2 rounded-lg text-sm bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-orange-500/50';
  const labelCls = 'text-xs text-gray-400 mb-1 block';

  if (loading) {
    return <div className="flex items-center justify-center py-20 text-gray-400"><Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading booster settings…</div>;
  }

  const Section = ({ icon: Icon, title, desc, on, onToggle, children }: any) => (
    <div className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.035)', border: '1px solid rgba(255,255,255,0.08)' }}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(234,88,12,0.12)' }}>
            <Icon className="w-5 h-5 text-orange-400" />
          </div>
          <div>
            <h4 className="text-white font-bold text-sm">{title}</h4>
            <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
          </div>
        </div>
        <Toggle on={on} onChange={onToggle} />
      </div>
      {on && <div className="space-y-3 pl-1">{children}</div>}
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Rocket className="w-6 h-6 text-orange-400" />
          <div>
            <h3 className="text-lg font-black text-white">Store Boosters</h3>
            <p className="text-xs text-gray-500">AOV-boosting features for your storefront — live the moment you save.</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={load} disabled={saving} className="px-3 py-2 rounded-xl text-sm text-gray-300 bg-white/5 hover:bg-white/10 transition flex items-center gap-2">
            <RefreshCw className="w-4 h-4" /> Reload
          </button>
          <button onClick={save} disabled={saving} className="px-4 py-2 rounded-xl text-sm font-bold text-white transition flex items-center gap-2" style={{ background: '#ea580c' }}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save
          </button>
        </div>
      </div>

      <Section icon={Truck} title="Free-shipping bar" desc="Progress bar nudging shoppers to hit a spend threshold." on={config.freeShipping.enabled} onToggle={(v: boolean) => set('freeShipping', { enabled: v })}>
        <div>
          <label className={labelCls}>Free-shipping threshold ($)</label>
          <input type="number" className={inputCls} value={config.freeShipping.threshold} onChange={(e) => set('freeShipping', { threshold: Number(e.target.value) })} />
        </div>
        <div>
          <label className={labelCls}>Progress message (use {'{remaining}'} for the amount left)</label>
          <input className={inputCls} value={config.freeShipping.message} onChange={(e) => set('freeShipping', { message: e.target.value })} />
        </div>
        <div>
          <label className={labelCls}>Unlocked message</label>
          <input className={inputCls} value={config.freeShipping.unlockedMessage} onChange={(e) => set('freeShipping', { unlockedMessage: e.target.value })} />
        </div>
      </Section>

      <Section icon={Timer} title="Urgency countdown" desc="Rolling countdown timer in the cart to drive faster checkout." on={config.urgency.enabled} onToggle={(v: boolean) => set('urgency', { enabled: v })}>
        <div>
          <label className={labelCls}>Countdown length (minutes)</label>
          <input type="number" className={inputCls} value={config.urgency.minutes} onChange={(e) => set('urgency', { minutes: Number(e.target.value) })} />
        </div>
        <div>
          <label className={labelCls}>Message</label>
          <input className={inputCls} value={config.urgency.message} onChange={(e) => set('urgency', { message: e.target.value })} />
        </div>
      </Section>

      <Section icon={Layers} title="Cart upsells" desc="'Frequently bought together' suggestions inside the cart drawer." on={config.cartUpsell.enabled} onToggle={(v: boolean) => set('cartUpsell', { enabled: v })}>
        <div>
          <label className={labelCls}>Heading</label>
          <input className={inputCls} value={config.cartUpsell.heading} onChange={(e) => set('cartUpsell', { heading: e.target.value })} />
        </div>
        <div>
          <label className={labelCls}>Max items to suggest</label>
          <input type="number" className={inputCls} value={config.cartUpsell.maxItems} onChange={(e) => set('cartUpsell', { maxItems: Number(e.target.value) })} />
        </div>
      </Section>

      <Section icon={PackageX} title="Stock scarcity badges" desc="'Only N left' badges on low-inventory products." on={config.stockScarcity.enabled} onToggle={(v: boolean) => set('stockScarcity', { enabled: v })}>
        <div>
          <label className={labelCls}>Show when stock is at or below</label>
          <input type="number" className={inputCls} value={config.stockScarcity.threshold} onChange={(e) => set('stockScarcity', { threshold: Number(e.target.value) })} />
        </div>
        <div>
          <label className={labelCls}>Badge text (use {'{count}'} for the number)</label>
          <input className={inputCls} value={config.stockScarcity.message} onChange={(e) => set('stockScarcity', { message: e.target.value })} />
        </div>
      </Section>

      <Section icon={Gift} title="Free gift threshold" desc="Encourage a bigger order with a free-gift spend goal." on={config.freeGift.enabled} onToggle={(v: boolean) => set('freeGift', { enabled: v })}>
        <div>
          <label className={labelCls}>Spend threshold ($)</label>
          <input type="number" className={inputCls} value={config.freeGift.threshold} onChange={(e) => set('freeGift', { threshold: Number(e.target.value) })} />
        </div>
        <div>
          <label className={labelCls}>Gift product name</label>
          <input className={inputCls} value={config.freeGift.productName} onChange={(e) => set('freeGift', { productName: e.target.value })} placeholder="e.g. Free tote bag" />
        </div>
        <div>
          <label className={labelCls}>Message (use {'{remaining}'} for the amount left)</label>
          <input className={inputCls} value={config.freeGift.message} onChange={(e) => set('freeGift', { message: e.target.value })} />
        </div>
      </Section>
    </div>
  );
}
