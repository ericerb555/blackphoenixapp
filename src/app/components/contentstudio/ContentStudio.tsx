/**
 * ContentStudio — Brand Kit + Omnichannel Repurposer + AI Content Planner.
 * Fully wired to the content-studio backend (real OpenAI, KV-persisted).
 */
import { useEffect, useState } from 'react';
import {
  Palette, Repeat, CalendarDays, Loader2, Save, Sparkles, Copy, Trash2,
  Plus, X, Check, Send,
} from 'lucide-react';
import { publicAnonKey, projectId } from '../../utils/supabase/info';
import { sendDraftToScheduler, sendDraftsToScheduler, channelToPlatform } from '../../lib/contentHandoff';

const SERVER = `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6`;
const authHeaders = { Authorization: `Bearer ${publicAnonKey}`, apikey: publicAnonKey, 'Content-Type': 'application/json' };

interface BrandKit {
  brandName?: string; mission?: string; voice?: string; audience?: string;
  keywords?: string; primaryColor?: string; accentColor?: string;
  dos?: string[]; donts?: string[];
}
interface Pack { id: string; source: string; channels: string[]; content: any; createdAt: string }
interface PlanItem { day: number; date: string; channel: string; format: string; title: string; hook: string; notes: string }
interface Plan { goal: string; days: number; items: PlanItem[]; createdAt: string }

type Tab = 'brand' | 'repurpose' | 'planner';

const CHANNELS: { id: string; label: string }[] = [
  { id: 'x_thread', label: 'X Thread' },
  { id: 'linkedin', label: 'LinkedIn' },
  { id: 'instagram', label: 'Instagram' },
  { id: 'email', label: 'Email' },
  { id: 'youtube', label: 'YouTube' },
  { id: 'tiktok', label: 'TikTok' },
  { id: 'facebook', label: 'Facebook' },
];

export default function ContentStudio() {
  const [tab, setTab] = useState<Tab>('brand');
  const [error, setError] = useState('');

  // Brand kit
  const [brand, setBrand] = useState<BrandKit>({ dos: [], donts: [] });
  const [savingBrand, setSavingBrand] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);

  // Repurpose
  const [source, setSource] = useState('');
  const [selChannels, setSelChannels] = useState<string[]>(CHANNELS.map((c) => c.id));
  const [repurposing, setRepurposing] = useState(false);
  const [packs, setPacks] = useState<Pack[]>([]);
  const [copied, setCopied] = useState('');

  // Planner
  const [goal, setGoal] = useState('');
  const [days, setDays] = useState(30);
  const [planning, setPlanning] = useState(false);
  const [plan, setPlan] = useState<Plan | null>(null);

  async function loadAll() {
    try {
      const [bk, pk, pl] = await Promise.all([
        fetch(`${SERVER}/content-studio/brand-kit`, { headers: authHeaders }),
        fetch(`${SERVER}/content-studio/packs`, { headers: authHeaders }),
        fetch(`${SERVER}/content-studio/plan`, { headers: authHeaders }),
      ]);
      if (bk.ok) { const d = await bk.json(); setBrand({ dos: [], donts: [], ...(d.brandKit || {}) }); }
      if (pk.ok) setPacks((await pk.json()).packs || []);
      if (pl.ok) setPlan((await pl.json()).plan || null);
    } catch (e) {
      console.error('[ContentStudio] load error', e);
    }
  }
  useEffect(() => { loadAll(); }, []);

  async function saveBrand() {
    setSavingBrand(true); setError('');
    try {
      const res = await fetch(`${SERVER}/content-studio/brand-kit`, { method: 'PUT', headers: authHeaders, body: JSON.stringify(brand) });
      if (!res.ok) throw new Error((await res.json()).error || 'Save failed');
      setSavedFlash(true); setTimeout(() => setSavedFlash(false), 2000);
    } catch (e) { setError(`Could not save brand kit: ${(e as any)?.message || e}`); }
    finally { setSavingBrand(false); }
  }

  async function repurpose() {
    if (!source.trim()) return;
    setRepurposing(true); setError('');
    try {
      const res = await fetch(`${SERVER}/content-studio/repurpose`, {
        method: 'POST', headers: authHeaders, body: JSON.stringify({ source, channels: selChannels }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Repurpose failed');
      setPacks((prev) => [data.pack, ...prev]);
      setSource('');
    } catch (e) { setError(`Repurpose failed: ${(e as any)?.message || e}`); }
    finally { setRepurposing(false); }
  }

  async function deletePack(pid: string) {
    await fetch(`${SERVER}/content-studio/packs/${pid}`, { method: 'DELETE', headers: authHeaders });
    setPacks((prev) => prev.filter((p) => p.id !== pid));
  }

  async function makePlan() {
    if (!goal.trim()) return;
    setPlanning(true); setError('');
    try {
      const res = await fetch(`${SERVER}/content-studio/plan`, {
        method: 'POST', headers: authHeaders, body: JSON.stringify({ goal, days }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Planning failed');
      setPlan(data.plan);
    } catch (e) { setError(`Planning failed: ${(e as any)?.message || e}`); }
    finally { setPlanning(false); }
  }

  function copyText(key: string, text: string) {
    navigator.clipboard?.writeText(text).then(() => { setCopied(key); setTimeout(() => setCopied(''), 1500); });
  }

  function renderChannelContent(ch: string, value: any): { text: string; node: any } {
    if (ch === 'x_thread' && Array.isArray(value)) {
      const text = value.join('\n\n');
      return { text, node: <div className="space-y-2">{value.map((t: string, i: number) => <p key={i} className="text-sm text-gray-700 border-l-2 border-orange-300 pl-3">{t}</p>)}</div> };
    }
    if (ch === 'email' && value && typeof value === 'object') {
      const text = `Subject: ${value.subject}\n\n${value.body}`;
      return { text, node: <div><p className="text-sm font-semibold text-gray-900">Subject: {value.subject}</p><p className="text-sm text-gray-700 whitespace-pre-wrap mt-1">{value.body}</p></div> };
    }
    const text = String(value ?? '');
    return { text, node: <p className="text-sm text-gray-700 whitespace-pre-wrap">{text}</p> };
  }

  const TABS: { id: Tab; label: string; icon: any }[] = [
    { id: 'brand', label: 'Brand Kit', icon: Palette },
    { id: 'repurpose', label: 'Omnichannel Repurposer', icon: Repeat },
    { id: 'planner', label: 'Content Planner', icon: CalendarDays },
  ];

  return (
    <div>
      <div className="flex gap-1 mb-6 bg-gray-100 rounded-xl p-1 w-fit">
        {TABS.map((t) => {
          const Icon = t.icon;
          return (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${tab === t.id ? 'bg-white shadow-sm text-orange-600' : 'text-gray-600 hover:text-gray-900'}`}>
              <Icon className="w-4 h-4" /> {t.label}
            </button>
          );
        })}
      </div>

      {error && (
        <div className="mb-4 flex items-start gap-2 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 text-sm">
          <X className="w-4 h-4 mt-0.5 shrink-0" /> <span>{error}</span>
        </div>
      )}

      {/* BRAND KIT */}
      {tab === 'brand' && (
        <div className="max-w-2xl grid gap-4">
          <p className="text-sm text-gray-500">Your Brand Kit powers every AI generator in the studio — repurposing, planning, and articles all read this so everything sounds like one brand.</p>
          <TextField label="Brand name" value={brand.brandName || ''} onChange={(v) => setBrand({ ...brand, brandName: v })} />
          <TextArea label="Mission / what you do" value={brand.mission || ''} onChange={(v) => setBrand({ ...brand, mission: v })} />
          <TextArea label="Voice & tone" value={brand.voice || ''} onChange={(v) => setBrand({ ...brand, voice: v })} placeholder="e.g. confident, plain-spoken, no jargon, a little witty" />
          <TextField label="Target audience" value={brand.audience || ''} onChange={(v) => setBrand({ ...brand, audience: v })} />
          <TextField label="Core themes / keywords" value={brand.keywords || ''} onChange={(v) => setBrand({ ...brand, keywords: v })} />
          <div className="grid grid-cols-2 gap-4">
            <ColorField label="Primary color" value={brand.primaryColor || '#ea580c'} onChange={(v) => setBrand({ ...brand, primaryColor: v })} />
            <ColorField label="Accent color" value={brand.accentColor || '#7c3aed'} onChange={(v) => setBrand({ ...brand, accentColor: v })} />
          </div>
          <ChipList label="Always do" items={brand.dos || []} onChange={(items) => setBrand({ ...brand, dos: items })} />
          <ChipList label="Never do" items={brand.donts || []} onChange={(items) => setBrand({ ...brand, donts: items })} />
          <button onClick={saveBrand} disabled={savingBrand}
            className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white rounded-lg px-5 py-2.5 text-sm font-semibold w-fit">
            {savingBrand ? <Loader2 className="w-4 h-4 animate-spin" /> : savedFlash ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
            {savedFlash ? 'Saved' : 'Save Brand Kit'}
          </button>
        </div>
      )}

      {/* REPURPOSER */}
      {tab === 'repurpose' && (
        <div className="grid gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Source content</label>
            <textarea value={source} onChange={(e) => setSource(e.target.value)} rows={5}
              placeholder="Paste a blog post, product description, announcement, or a rough idea…"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
            <div className="mt-3 flex flex-wrap gap-2">
              {CHANNELS.map((ch) => {
                const on = selChannels.includes(ch.id);
                return (
                  <button key={ch.id} onClick={() => setSelChannels((prev) => on ? prev.filter((x) => x !== ch.id) : [...prev, ch.id])}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition ${on ? 'border-orange-500 bg-orange-50 text-orange-700' : 'border-gray-200 text-gray-500'}`}>
                    {ch.label}
                  </button>
                );
              })}
            </div>
            <button onClick={repurpose} disabled={repurposing || !source.trim() || selChannels.length === 0}
              className="mt-4 inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white rounded-lg px-5 py-2.5 text-sm font-semibold">
              {repurposing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />} Repurpose into {selChannels.length} channels
            </button>
          </div>

          {packs.map((pack) => (
            <div key={pack.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center justify-between mb-3 gap-2">
                <p className="text-xs text-gray-400 truncate flex-1">From: {pack.source}</p>
                <button
                  onClick={() => {
                    const drafts = pack.channels
                      .map((ch) => {
                        const platform = channelToPlatform(ch);
                        if (!platform) return null; // skip email/youtube/tiktok
                        const { text } = renderChannelContent(ch, pack.content?.[ch]);
                        return text ? { content: text, platforms: [platform], source: 'Content Studio · Repurposer' } : null;
                      })
                      .filter(Boolean) as { content: string; platforms: any; source: string }[];
                    if (drafts.length) sendDraftsToScheduler(drafts);
                  }}
                  title="Queue every publishable channel as a scheduler draft"
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-orange-600 hover:text-orange-700 border border-orange-200 hover:bg-orange-50 rounded-lg px-2.5 py-1.5 whitespace-nowrap">
                  <Send className="w-3.5 h-3.5" /> Send whole pack
                </button>
                <button onClick={() => deletePack(pack.id)} className="text-gray-400 hover:text-rose-600 p-1"><Trash2 className="w-4 h-4" /></button>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                {pack.channels.map((ch) => {
                  const { text, node } = renderChannelContent(ch, pack.content?.[ch]);
                  const key = `${pack.id}:${ch}`;
                  return (
                    <div key={ch} className="border border-gray-100 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-gray-500 uppercase">{CHANNELS.find((x) => x.id === ch)?.label || ch}</span>
                        <div className="flex items-center gap-1">
                          {channelToPlatform(ch) && (
                            <button
                              onClick={() => sendDraftToScheduler({ content: text, platforms: [channelToPlatform(ch)!], source: 'Content Studio · Repurposer' })}
                              title="Schedule this post"
                              className="text-gray-400 hover:text-orange-600 inline-flex items-center gap-1 text-xs">
                              <Send className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button onClick={() => copyText(key, text)} className="text-gray-400 hover:text-gray-700 inline-flex items-center gap-1 text-xs">
                            {copied === key ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>
                      {node}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* PLANNER */}
      {tab === 'planner' && (
        <div className="grid gap-6">
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[240px]">
              <label className="block text-sm font-medium text-gray-700 mb-2">Campaign goal</label>
              <input value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="e.g. drive 500 new store signups this month"
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Days</label>
              <input type="number" min={7} max={60} value={days} onChange={(e) => setDays(Number(e.target.value) || 30)}
                className="w-24 border border-gray-200 rounded-lg px-3 py-2.5 text-sm" />
            </div>
            <button onClick={makePlan} disabled={planning || !goal.trim()}
              className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white rounded-lg px-5 py-2.5 text-sm font-semibold">
              {planning ? <Loader2 className="w-4 h-4 animate-spin" /> : <CalendarDays className="w-4 h-4" />} Build plan
            </button>
          </div>

          {plan && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100 text-sm text-gray-500">{plan.items.length}-item plan for: <span className="font-medium text-gray-800">{plan.goal}</span></div>
              <div className="divide-y divide-gray-100 max-h-[560px] overflow-y-auto">
                {plan.items.map((it, i) => (
                  <div key={i} className="px-5 py-3 flex gap-4 hover:bg-gray-50">
                    <div className="w-16 shrink-0 text-center">
                      <div className="text-xs text-gray-400">Day {it.day}</div>
                      <div className="text-xs font-medium text-gray-600">{it.date.slice(5)}</div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] uppercase font-semibold bg-orange-50 text-orange-600 rounded px-1.5 py-0.5">{it.channel}</span>
                        <span className="text-[10px] text-gray-400">{it.format}</span>
                      </div>
                      <div className="font-medium text-gray-900 text-sm mt-0.5">{it.title}</div>
                      {it.hook && <div className="text-xs text-gray-500 italic">“{it.hook}”</div>}
                      {it.notes && <div className="text-xs text-gray-400 mt-0.5">{it.notes}</div>}
                    </div>
                    <button
                      onClick={() => {
                        const norm = String(it.channel).toLowerCase().replace(/\s+/g, '_').replace('twitter', 'x_thread').replace(/^x$/, 'x_thread');
                        const p = channelToPlatform(norm);
                        sendDraftToScheduler({
                          content: [it.title, it.hook ? `\n${it.hook}` : '', it.notes ? `\n\n${it.notes}` : ''].join(''),
                          platforms: p ? [p] : undefined,
                          scheduled_date: `${it.date}T09:00`,
                          source: 'Content Studio · Planner',
                        });
                      }}
                      title="Send to Social Scheduler"
                      className="self-center shrink-0 text-gray-400 hover:text-orange-600 p-1.5 rounded-lg hover:bg-orange-50">
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function TextField({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <label className="block text-sm text-gray-600 mb-1">{label}</label>
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
    </div>
  );
}
function TextArea({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <label className="block text-sm text-gray-600 mb-1">{label}</label>
      <textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} rows={2}
        className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
    </div>
  );
}
function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="block text-sm text-gray-600 mb-1">{label}</label>
      <div className="flex items-center gap-2">
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="w-10 h-10 rounded border border-gray-200 p-0.5" />
        <input value={value} onChange={(e) => onChange(e.target.value)} className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono" />
      </div>
    </div>
  );
}
function ChipList({ label, items, onChange }: { label: string; items: string[]; onChange: (items: string[]) => void }) {
  const [draft, setDraft] = useState('');
  return (
    <div>
      <label className="block text-sm text-gray-600 mb-1">{label}</label>
      <div className="flex flex-wrap gap-2 mb-2">
        {items.map((it, i) => (
          <span key={i} className="inline-flex items-center gap-1 bg-gray-100 text-gray-700 rounded-full px-2.5 py-1 text-xs">
            {it}
            <button onClick={() => onChange(items.filter((_, j) => j !== i))} className="text-gray-400 hover:text-rose-500"><X className="w-3 h-3" /></button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input value={draft} onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && draft.trim()) { onChange([...items, draft.trim()]); setDraft(''); } }}
          placeholder="Type and press Enter" className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm" />
        <button onClick={() => { if (draft.trim()) { onChange([...items, draft.trim()]); setDraft(''); } }}
          className="border border-gray-200 rounded-lg px-3 text-gray-500 hover:bg-gray-50"><Plus className="w-4 h-4" /></button>
      </div>
    </div>
  );
}
