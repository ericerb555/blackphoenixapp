/**
 * The services we take first refusal on — 180 boxes, one decision.
 *
 * Eric: "i can check the boxes of what services i have right of first refusal."
 *
 * Everything in the bid-room routing forks on this list: a request in a ticked
 * category is held for Black Phoenix for 24 hours and then releases itself to
 * every paid subscriber in that trade within radius; an unticked one goes
 * straight out for bids.
 *
 * WHY IT OPENS PRE-TICKED
 *
 * Before this screen existed the question was answered by the `is_construction`
 * flag, which claims 71 of the 180 categories. Opening blank would mean
 * re-making 71 decisions somebody already made, and a list half-done is worse
 * than the heuristic — it routes some work deliberately and the rest by
 * accident. So an unconfigured list arrives with those 71 ticked and the
 * screen says so: this is the old behaviour, written down, for correcting.
 *
 * Saving is what makes it a decision. Until then the server is still using the
 * flag, and the banner says that too.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Check, Loader2, Save, Search, RotateCcw, AlertTriangle, Info, Clock,
} from 'lucide-react';
import { toast } from 'sonner';
import { authedHeaders } from '../utils/authHeaders';
import { API_BASE_URL } from '../lib/apiConfig';
import { BackToDashboard } from '../components/BackToDashboard';

const SERVER = `${API_BASE_URL}/make-server-3eae23a6`;

interface Category {
  slug: string;
  name: string;
  section: string;
  isConstruction: boolean;
  claimed: boolean;
}

/** The five real sections, in the order a builder thinks about them. */
const SECTION_ORDER = ['home-property', 'services', 'shops-retail', 'food', 'entertainment'];
const SECTION_NAME: Record<string, string> = {
  'home-property': 'Home & Property',
  services: 'Services',
  'shops-retail': 'Shops & Retail',
  food: 'Food & Drink',
  entertainment: 'Entertainment',
};

export default function ExchangeServicesClaim() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [claimed, setClaimed] = useState<Set<string>>(new Set());
  const [suggested, setSuggested] = useState<string[]>([]);
  const [configured, setConfigured] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [updatedBy, setUpdatedBy] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [filter, setFilter] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${SERVER}/exchange/services`, { headers: await authedHeaders() });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.success) throw new Error(data?.error || 'Could not load the categories.');

      const rows: Category[] = data.categories || [];
      setCategories(rows);
      setSuggested(data.suggested || []);
      setConfigured(Boolean(data.configured));
      setUpdatedAt(data.updatedAt || null);
      setUpdatedBy(data.updatedBy || null);
      /* Unconfigured opens on the fallback's answer — see the file header. */
      setClaimed(new Set(
        data.configured
          ? rows.filter((r) => r.claimed).map((r) => r.slug)
          : (data.suggested || []),
      ));
      setDirty(false);
    } catch (err: any) {
      toast.error(err?.message || 'Could not load the categories.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const toggle = (slug: string) => {
    setClaimed((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug); else next.add(slug);
      return next;
    });
    setDirty(true);
  };

  const setMany = (slugs: string[], on: boolean) => {
    setClaimed((prev) => {
      const next = new Set(prev);
      for (const s of slugs) { if (on) next.add(s); else next.delete(s); }
      return next;
    });
    setDirty(true);
  };

  const save = useCallback(async () => {
    setSaving(true);
    try {
      const res = await fetch(`${SERVER}/exchange/services`, {
        method: 'PUT',
        headers: await authedHeaders(),
        body: JSON.stringify({ slugs: [...claimed] }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.success) throw new Error(data?.error || 'Could not save.');
      if (data.dropped?.length) {
        toast.warning(`${data.dropped.length} unknown categories were dropped.`);
      }
      toast.success(
        data.claimed === 0
          ? 'Saved. Nothing is claimed, so every request goes straight to the exchange.'
          : `Saved. ${data.claimed} categories come to you first.`,
      );
      setConfigured(true);
      setDirty(false);
      setUpdatedAt(new Date().toISOString());
    } catch (err: any) {
      toast.error(err?.message || 'Could not save.');
    } finally {
      setSaving(false);
    }
  }, [claimed]);

  const bySection = useMemo(() => {
    const needle = filter.trim().toLowerCase();
    const groups = new Map<string, Category[]>();
    for (const c of categories) {
      if (needle && !c.name.toLowerCase().includes(needle) && !c.slug.includes(needle)) continue;
      const key = c.section || 'other';
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(c);
    }
    return [...groups.entries()].sort(
      (a, b) => (SECTION_ORDER.indexOf(a[0]) + 99) % 99 - (SECTION_ORDER.indexOf(b[0]) + 99) % 99,
    );
  }, [categories, filter]);

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white p-6">
      <BackToDashboard />

      <div className="max-w-5xl mx-auto space-y-5">
        <div>
          <h1 className="text-2xl font-bold">Right of first refusal</h1>
          <p className="text-sm text-gray-500 mt-1">
            Tick the work you want offered to you before it reaches the exchange. A request in a
            ticked category is yours for 24 hours; everything else goes straight out for bids.
          </p>
        </div>

        {!loading && !configured && (
          <div className="flex gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
            <Info className="w-5 h-5 shrink-0 text-amber-400 mt-0.5" />
            <div className="text-sm text-amber-200/90">
              <p className="font-semibold">Nothing has been decided yet.</p>
              <p className="mt-1 text-amber-200/70">
                Until you save, requests are routed by whether a category is flagged as
                construction work — {suggested.length} of {categories.length} categories. Those are
                ticked below so you can correct them rather than start from blank. Saving is what
                turns it into your decision.
              </p>
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" />
            <input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Find a category"
              className="w-full pl-9 pr-3 py-2 bg-black border border-gray-700 rounded-lg text-white text-sm"
            />
          </div>
          <span className="text-sm text-gray-400">
            <Check className="w-4 h-4 inline mr-1 text-emerald-400" />
            {claimed.size} of {categories.length} claimed
          </span>
          <button
            onClick={() => { setClaimed(new Set(suggested)); setDirty(true); }}
            className="px-3 py-2 rounded-lg border border-gray-700 text-xs text-gray-300 hover:bg-white/5"
            title="Tick exactly the categories flagged as construction work"
          >
            <RotateCcw className="w-3.5 h-3.5 inline mr-1" />Reset to construction trades
          </button>
          <button
            disabled={!dirty || saving}
            onClick={() => void save()}
            className="px-4 py-2 rounded-lg bg-[#ea580c] text-white text-sm font-semibold disabled:opacity-40 hover:bg-[#f97316]"
          >
            {saving ? <Loader2 className="w-4 h-4 inline animate-spin mr-1" /> : <Save className="w-4 h-4 inline mr-1" />}
            Save
          </button>
        </div>

        {claimed.size === 0 && dirty && (
          <div className="flex gap-2 rounded-lg border border-gray-700 bg-black/40 p-3 text-xs text-gray-400">
            <AlertTriangle className="w-4 h-4 shrink-0 text-amber-500/80" />
            Nothing is ticked. Saving this means every request goes straight to the exchange —
            which is a real choice, and not the same as never having decided.
          </div>
        )}

        {updatedAt && (
          <p className="text-xs text-gray-600 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            Last saved {new Date(updatedAt).toLocaleString()}{updatedBy ? ` by ${updatedBy}` : ''}
          </p>
        )}

        {loading ? (
          <div className="text-gray-500 text-sm p-8">
            <Loader2 className="w-4 h-4 inline animate-spin mr-2" />Loading your categories…
          </div>
        ) : bySection.map(([section, rows]) => {
          const slugs = rows.map((r) => r.slug);
          const on = slugs.filter((s) => claimed.has(s)).length;
          return (
            <div key={section} className="bg-[#111] border border-gray-700 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold text-white">
                  {SECTION_NAME[section] || section}
                  <span className="ml-2 text-xs font-normal text-gray-500">{on} of {rows.length}</span>
                </h2>
                <div className="flex gap-2">
                  <button onClick={() => setMany(slugs, true)} className="text-xs text-gray-500 hover:text-gray-300">All</button>
                  <button onClick={() => setMany(slugs, false)} className="text-xs text-gray-500 hover:text-gray-300">None</button>
                </div>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-1.5">
                {rows.map((c) => {
                  const ticked = claimed.has(c.slug);
                  return (
                    <label
                      key={c.slug}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer text-sm ${
                        ticked ? 'border-[#ea580c]/50 bg-[#ea580c]/10 text-white' : 'border-gray-800 text-gray-400 hover:bg-white/5'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={ticked}
                        onChange={() => toggle(c.slug)}
                        className="accent-[#ea580c]"
                      />
                      <span className="flex-1">{c.name}</span>
                      {c.isConstruction && (
                        <span className="text-[10px] text-gray-600" title="Flagged as construction work">trade</span>
                      )}
                    </label>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
