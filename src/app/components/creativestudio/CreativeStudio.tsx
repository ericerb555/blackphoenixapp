/**
 * CreativeStudio — Higgsfield-style AI creative suite tab for the Content Center.
 *
 * Image generation + viral presets + persistent gallery are fully wired to the
 * creative-studio backend (real OpenAI images stored in Supabase Storage).
 * Video / Audio tabs report real provider availability from /status and stay
 * gated (no mock output) until a provider key is added.
 */
import { useEffect, useState } from 'react';
import {
  Image as ImageIcon, Video, Music, LayoutGrid, Sparkles, Loader2, Download,
  Trash2, Wand2, Lock, RefreshCw, X, Check,
} from 'lucide-react';
import { publicAnonKey, projectId } from '../../utils/supabase/info';

const SERVER = `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6`;
const authHeaders = { Authorization: `Bearer ${publicAnonKey}`, apikey: publicAnonKey, 'Content-Type': 'application/json' };

interface Preset { id: string; name: string; emoji: string; category: string }
interface Asset {
  id: string; type: string; url: string; path: string; prompt: string;
  presetName?: string | null; size: string; createdAt: string;
}
interface Caps {
  image: { available: boolean; provider: string | null };
  video: { available: boolean; provider: string | null; needs: string };
  audio: { available: boolean; provider: string | null; needs: string };
}

type StudioTab = 'image' | 'video' | 'audio' | 'gallery';

export default function CreativeStudio() {
  const [tab, setTab] = useState<StudioTab>('image');
  const [presets, setPresets] = useState<Preset[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [caps, setCaps] = useState<Caps | null>(null);

  const [prompt, setPrompt] = useState('');
  const [presetId, setPresetId] = useState<string>('');
  const [size, setSize] = useState('1024x1024');
  const [quality, setQuality] = useState<'standard' | 'hd'>('standard');
  const [useBrandKit, setUseBrandKit] = useState(true);
  const [brandConfigured, setBrandConfigured] = useState<boolean | null>(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState('');
  const [zoom, setZoom] = useState<Asset | null>(null);

  async function loadAll() {
    try {
      const [pr, as, st, bk] = await Promise.all([
        fetch(`${SERVER}/creative-studio/presets`, { headers: authHeaders }),
        fetch(`${SERVER}/creative-studio/assets`, { headers: authHeaders }),
        fetch(`${SERVER}/creative-studio/status`, { headers: authHeaders }),
        fetch(`${SERVER}/content-studio/brand-kit`, { headers: authHeaders }),
      ]);
      if (pr.ok) setPresets((await pr.json()).presets || []);
      if (as.ok) setAssets((await as.json()).assets || []);
      if (st.ok) setCaps((await st.json()).capabilities || null);
      if (bk.ok) {
        const kit = (await bk.json()).brandKit || {};
        setBrandConfigured(Object.keys(kit).some((k) => k !== 'updatedAt' && kit[k] && (!Array.isArray(kit[k]) || kit[k].length)));
      }
    } catch (e) {
      console.error('[CreativeStudio] load error', e);
      setError(`Failed to load studio: ${e}`);
    }
  }
  useEffect(() => { loadAll(); }, []);

  async function generate() {
    if (!prompt.trim()) return;
    setGenerating(true); setError('');
    try {
      const res = await fetch(`${SERVER}/creative-studio/generate`, {
        method: 'POST', headers: authHeaders,
        body: JSON.stringify({ prompt, presetId: presetId || undefined, size, quality, useBrandKit }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Generation failed');
      setAssets((prev) => [data.asset, ...prev]);
    } catch (e) {
      setError(`Image generation failed: ${(e as any)?.message || e}`);
    } finally {
      setGenerating(false);
    }
  }

  async function del(id: string) {
    setBusyId(id);
    try {
      await fetch(`${SERVER}/creative-studio/assets/${id}`, { method: 'DELETE', headers: authHeaders });
      setAssets((prev) => prev.filter((a) => a.id !== id));
    } finally { setBusyId(''); }
  }

  const STUDIO_TABS: { id: StudioTab; label: string; icon: any }[] = [
    { id: 'image', label: 'Image', icon: ImageIcon },
    { id: 'video', label: 'Video', icon: Video },
    { id: 'audio', label: 'Audio', icon: Music },
    { id: 'gallery', label: 'Gallery', icon: LayoutGrid },
  ];

  return (
    <div>
      {/* Sub-tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 rounded-xl p-1 w-fit">
        {STUDIO_TABS.map((t) => {
          const Icon = t.icon;
          const gated = (t.id === 'video' && !caps?.video.available) || (t.id === 'audio' && !caps?.audio.available);
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
                tab === t.id ? 'bg-white shadow-sm text-orange-600' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Icon className="w-4 h-4" /> {t.label}
              {gated && <Lock className="w-3 h-3 text-gray-400" />}
            </button>
          );
        })}
        <button onClick={loadAll} className="ml-1 px-3 py-2 text-gray-400 hover:text-gray-700"><RefreshCw className="w-4 h-4" /></button>
      </div>

      {error && (
        <div className="mb-4 flex items-start gap-2 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 text-sm">
          <X className="w-4 h-4 mt-0.5 shrink-0" /> <span>{error}</span>
        </div>
      )}

      {/* IMAGE */}
      {tab === 'image' && (
        <div className="grid lg:grid-cols-[1fr_320px] gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Describe your image</label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={4}
              placeholder="A sports car drifting through a neon city at night…"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
            />

            <div className="mt-4">
              <div className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2"><Wand2 className="w-4 h-4 text-orange-500" /> Viral presets</div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {presets.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setPresetId(presetId === p.id ? '' : p.id)}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm text-left transition ${
                      presetId === p.id ? 'border-orange-500 bg-orange-50 text-orange-700' : 'border-gray-200 hover:border-gray-300 text-gray-700'
                    }`}
                  >
                    <span className="text-lg">{p.emoji}</span>
                    <span className="min-w-0"><span className="block font-medium truncate">{p.name}</span><span className="block text-xs text-gray-400">{p.category}</span></span>
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-4 flex items-center gap-3">
              <select value={size} onChange={(e) => setSize(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm">
                <option value="1024x1024">Square 1024²</option>
                <option value="1792x1024">Wide 16:9</option>
                <option value="1024x1792">Tall 9:16</option>
              </select>
              <select value={quality} onChange={(e) => setQuality(e.target.value as any)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm">
                <option value="standard">Standard</option>
                <option value="hd">HD</option>
              </select>
              <button
                type="button"
                onClick={() => setUseBrandKit((v) => !v)}
                title="Use your Brand Kit palette & mood"
                className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm border transition ${useBrandKit ? 'border-orange-500 bg-orange-50 text-orange-700' : 'border-gray-200 text-gray-500'}`}
              >
                <span className={`w-3.5 h-3.5 rounded-sm border flex items-center justify-center ${useBrandKit ? 'bg-orange-500 border-orange-500' : 'border-gray-300'}`}>
                  {useBrandKit && <Check className="w-3 h-3 text-white" />}
                </span>
                Brand Kit
              </button>
              <button
                onClick={generate}
                disabled={generating || !prompt.trim() || !caps?.image.available}
                className="ml-auto inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white rounded-lg px-5 py-2.5 text-sm font-semibold"
              >
                {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />} Generate
              </button>
            </div>
            {caps && !caps.image.available && (
              <p className="mt-2 text-xs text-rose-500">Image generation needs OPENAI_API_KEY configured.</p>
            )}
            {useBrandKit && brandConfigured === false && (
              <p className="mt-2 text-xs text-amber-600">Brand Kit is empty — set your palette & mood in Content Studio → Brand Kit for on-brand imagery.</p>
            )}
          </div>

          {/* Recent strip */}
          <div>
            <div className="text-sm font-medium text-gray-700 mb-2">Recent</div>
            <div className="grid grid-cols-2 gap-2">
              {assets.slice(0, 6).map((a) => (
                <button key={a.id} onClick={() => setZoom(a)} className="aspect-square rounded-lg overflow-hidden bg-gray-100 border border-gray-200">
                  {a.url ? <img src={a.url} alt={a.prompt} className="w-full h-full object-cover" /> : null}
                </button>
              ))}
              {assets.length === 0 && <div className="col-span-2 text-xs text-gray-400 py-8 text-center">No images yet.</div>}
            </div>
          </div>
        </div>
      )}

      {/* VIDEO / AUDIO gated */}
      {(tab === 'video' || tab === 'audio') && (
        <GatedProvider
          kind={tab}
          cap={tab === 'video' ? caps?.video : caps?.audio}
        />
      )}

      {/* GALLERY */}
      {tab === 'gallery' && (
        <div>
          {assets.length === 0 ? (
            <div className="bg-white rounded-xl border border-dashed border-gray-200 p-12 text-center text-sm text-gray-400">
              No assets yet. Generate an image to start your gallery.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {assets.map((a) => (
                <div key={a.id} className="group relative rounded-xl overflow-hidden bg-gray-100 border border-gray-200">
                  <button onClick={() => setZoom(a)} className="block w-full aspect-square">
                    {a.url ? <img src={a.url} alt={a.prompt} className="w-full h-full object-cover" /> : null}
                  </button>
                  <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition flex items-center gap-2">
                    {a.presetName && <span className="text-[10px] text-white/90 bg-white/20 rounded px-1.5 py-0.5">{a.presetName}</span>}
                    <a href={a.url} download target="_blank" rel="noreferrer" className="ml-auto text-white/90 hover:text-white p-1"><Download className="w-4 h-4" /></a>
                    <button onClick={() => del(a.id)} disabled={busyId === a.id} className="text-white/90 hover:text-rose-300 p-1">
                      {busyId === a.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Zoom modal */}
      {zoom && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={() => setZoom(null)}>
          <div className="max-w-3xl w-full" onClick={(e) => e.stopPropagation()}>
            <img src={zoom.url} alt={zoom.prompt} className="w-full rounded-xl" />
            <div className="mt-3 flex items-center gap-3">
              <p className="text-sm text-white/80 flex-1">{zoom.prompt}{zoom.presetName ? ` · ${zoom.presetName}` : ''}</p>
              <a href={zoom.url} download target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 bg-white/15 hover:bg-white/25 text-white rounded-lg px-3 py-2 text-sm"><Download className="w-4 h-4" /> Download</a>
              <button onClick={() => setZoom(null)} className="text-white/70 hover:text-white p-2"><X className="w-5 h-5" /></button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function GatedProvider({ kind, cap }: { kind: 'video' | 'audio'; cap?: { available: boolean; needs: string } }) {
  const label = kind === 'video' ? 'Video generation' : 'Audio generation';
  if (cap?.available) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-sm text-gray-500">
        {label} provider is connected. (Generation UI coming next.)
      </div>
    );
  }
  return (
    <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border border-gray-200 p-10 text-center">
      <div className="w-12 h-12 rounded-xl bg-white shadow-sm flex items-center justify-center mx-auto mb-4">
        <Lock className="w-6 h-6 text-gray-400" />
      </div>
      <h3 className="font-semibold text-gray-900 mb-1">{label} needs a provider</h3>
      <p className="text-sm text-gray-500 max-w-md mx-auto">
        OpenAI can't generate {kind}. Add one of these API keys to your Supabase secrets to unlock it:
        <span className="block mt-2 font-mono text-xs text-gray-700">{cap?.needs}</span>
      </p>
    </div>
  );
}
