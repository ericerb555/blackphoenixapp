/**
 * ReelStudio — script to posted video, in one place.
 *
 * The pieces existed but were only reachable by API: /content-studio/reel
 * writes the script, /content-studio/reel/storyboard resolves every beat into a
 * picture and a voice track, and ReelRenderer records the result. This is the
 * surface that joins them.
 *
 * The flow is deliberately three steps rather than one button. Choosing the
 * hook and choosing the pictures are the two decisions that actually decide
 * whether a reel performs, and hiding them behind "generate" would hand both to
 * the model — including the choice to invent a picture of a product that has
 * twelve real photographs sitting in the catalog.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Sparkles, Loader2, Film, Image as ImageIcon, Check, ChevronRight,
  AlertTriangle, Wand2, Mic, RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../lib/supabase';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import ReelRenderer, { type ReelStoryboard } from './ReelRenderer';

const SERVER = `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6`;

const VOICES = [
  { id: 'onyx', label: 'Onyx — deep, steady' },
  { id: 'nova', label: 'Nova — bright, warm' },
  { id: 'echo', label: 'Echo — calm, male' },
  { id: 'shimmer', label: 'Shimmer — soft, female' },
  { id: 'fable', label: 'Fable — expressive' },
];

interface Hook { index: number; archetype: string; line: string; why: string; score: number; firstFrame: string }
interface Beat { label: string; startSec: number; endSec: number; voiceover: string; onScreenText: string; bRoll: string; missingOnScreenText?: boolean }
interface CatalogProduct { id: string; name: string; images: string[] }

async function authHeaders() {
  const { data: { session } } = await supabase.auth.getSession();
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${session?.access_token || publicAnonKey}`,
    apikey: publicAnonKey,
  };
}

function scoreColor(n: number) {
  return n >= 85 ? '#22c55e' : n >= 75 ? '#eab308' : '#f97316';
}

export default function ReelStudio() {
  const [subject, setSubject] = useState('');
  const [context, setContext] = useState('');
  const [platform, setPlatform] = useState<'tiktok' | 'instagram' | 'youtube'>('tiktok');
  const [seconds, setSeconds] = useState(30);
  const [voice, setVoice] = useState('onyx');
  const [narrate, setNarrate] = useState(true);

  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [productId, setProductId] = useState('');
  const [selectedImages, setSelectedImages] = useState<string[]>([]);

  const [hooks, setHooks] = useState<Hook[]>([]);
  const [beats, setBeats] = useState<Beat[]>([]);
  const [bestHook, setBestHook] = useState(0);
  const [chosenHook, setChosenHook] = useState(0);
  const [writtenBy, setWrittenBy] = useState<string | null>(null);
  const [fallbackReason, setFallbackReason] = useState<string | null>(null);

  const [storyboard, setStoryboard] = useState<ReelStoryboard | null>(null);
  const [sbSummary, setSbSummary] = useState<any>(null);

  const [writing, setWriting] = useState(false);
  const [building, setBuilding] = useState(false);

  const product = useMemo(() => products.find(p => p.id === productId), [products, productId]);

  /** Pull the catalog so real product photography can carry the beats. */
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${SERVER}/products?limit=500`, { headers: await authHeaders() });
        const data = await res.json().catch(() => null);
        if (!res.ok || !data?.products) return;
        setProducts(
          data.products
            .map((p: any) => ({
              id: p.id,
              name: p.name || 'Untitled',
              images: Array.from(new Set([p.primaryImage, ...(Array.isArray(p.images) ? p.images : [])]
                .filter((u: any) => typeof u === 'string' && u.trim()))),
            }))
            .filter((p: CatalogProduct) => p.images.length)
            .sort((a: CatalogProduct, b: CatalogProduct) => b.images.length - a.images.length),
        );
      } catch {
        // The studio still works without a catalog — visuals get generated.
      }
    })();
  }, []);

  /** Choosing a product pre-selects its photos, in catalog order. */
  const chooseProduct = useCallback((id: string) => {
    setProductId(id);
    const p = products.find(x => x.id === id);
    setSelectedImages(p ? p.images.slice(0, 8) : []);
    if (p && !subject.trim()) setSubject(p.name);
  }, [products, subject]);

  const toggleImage = useCallback((url: string) => {
    setSelectedImages(prev => prev.includes(url) ? prev.filter(u => u !== url) : [...prev, url]);
  }, []);

  const writeScript = useCallback(async () => {
    if (!subject.trim()) { toast.error('What is the reel about?'); return; }
    setWriting(true);
    setStoryboard(null);
    try {
      const res = await fetch(`${SERVER}/content-studio/reel`, {
        method: 'POST',
        headers: await authHeaders(),
        body: JSON.stringify({ subject, context, platform, seconds }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) { toast.error(data?.error || `Script failed (${res.status})`); return; }

      setHooks(data.hooks || []);
      setBeats(data.beats || []);
      setBestHook(data.bestHookIndex || 0);
      setChosenHook(data.bestHookIndex || 0);
      setWrittenBy(data.writtenBy || null);
      setFallbackReason(data.fallbackReason || null);
      toast.success(`${(data.hooks || []).length} hooks, ${(data.beats || []).length} beats.`);
    } catch (err: any) {
      toast.error(err?.message || 'Could not write the script.');
    } finally {
      setWriting(false);
    }
  }, [subject, context, platform, seconds]);

  const buildStoryboard = useCallback(async () => {
    if (!beats.length) return;
    setBuilding(true);
    try {
      const res = await fetch(`${SERVER}/content-studio/reel/storyboard`, {
        method: 'POST',
        headers: await authHeaders(),
        body: JSON.stringify({
          beats,
          hook: hooks[chosenHook]?.line || '',
          images: selectedImages,
          voice,
          narrate,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) { toast.error(data?.error || `Storyboard failed (${res.status})`); return; }

      setStoryboard({ width: data.width, height: data.height, totalSeconds: data.totalSeconds, slides: data.slides });
      setSbSummary(data.summary);
      if (data.note) toast.warning(data.note, { duration: 9000 });
      else toast.success(`Storyboard ready — ${data.summary.fromYourMedia} of yours, ${data.summary.generated} generated.`);
    } catch (err: any) {
      toast.error(err?.message || 'Could not build the storyboard.');
    } finally {
      setBuilding(false);
    }
  }, [beats, hooks, chosenHook, selectedImages, voice, narrate]);

  const card = 'rounded-2xl border border-[#2A2A2A] bg-[#111111] p-5';
  const input = 'w-full px-3 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white text-sm placeholder-gray-500 focus:outline-none focus:border-[#ea580c]';
  const step = (n: number, title: string, done: boolean) => (
    <div className="flex items-center gap-2 mb-4">
      <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
        style={{ background: done ? 'rgba(22,163,74,0.9)' : 'rgba(234,88,12,0.9)', color: '#fff' }}>
        {done ? <Check className="w-3.5 h-3.5" /> : n}
      </span>
      <h3 className="text-white font-bold">{title}</h3>
    </div>
  );

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Film className="w-5 h-5 text-[#ea580c]" /> Reel Studio
        </h2>
        <p className="text-sm text-gray-400 mt-1">
          Write the script, choose the pictures, render a video you can post. Rendering happens in
          this browser — nothing is uploaded.
        </p>
      </div>

      {/* 1 — the brief */}
      <div className={card}>
        {step(1, 'What is the reel about?', hooks.length > 0)}
        <div className="grid md:grid-cols-2 gap-3">
          <input className={input} value={subject} onChange={e => setSubject(e.target.value)}
            placeholder="Product or subject" />
          <select className={input} value={productId} onChange={e => chooseProduct(e.target.value)}>
            <option value="">Use a catalog product’s photos…</option>
            {products.map(p => (
              <option key={p.id} value={p.id}>{p.name} ({p.images.length} photos)</option>
            ))}
          </select>
        </div>
        <textarea className={`${input} mt-3 min-h-[70px]`} value={context} onChange={e => setContext(e.target.value)}
          placeholder="Anything the writer should know — price, materials, who it is for, what makes it different." />
        <div className="flex flex-wrap items-center gap-3 mt-3">
          <select className={`${input} w-auto`} value={platform} onChange={e => setPlatform(e.target.value as any)}>
            <option value="tiktok">TikTok</option>
            <option value="instagram">Instagram Reels</option>
            <option value="youtube">YouTube Shorts</option>
          </select>
          <select className={`${input} w-auto`} value={seconds} onChange={e => setSeconds(Number(e.target.value))}>
            {[15, 30, 45, 60].map(s => <option key={s} value={s}>{s} seconds</option>)}
          </select>
          <button onClick={writeScript} disabled={writing}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white disabled:opacity-40"
            style={{ background: 'linear-gradient(135deg,#7c3aed,#ea580c)' }}>
            {writing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {hooks.length ? 'Rewrite script' : 'Write script'}
          </button>
          {writtenBy && (
            <span className="text-xs text-gray-500">
              written by {writtenBy}
              {fallbackReason && <span className="text-yellow-500"> (fell back — {fallbackReason.slice(0, 60)}…)</span>}
            </span>
          )}
        </div>
      </div>

      {/* 2 — the hook, which is most of the reel */}
      {hooks.length > 0 && (
        <div className={card}>
          {step(2, 'Pick the hook', true)}
          <p className="text-xs text-gray-500 mb-3">
            The first two seconds decide whether the rest is watched. Scores are the writer’s own
            estimate of scroll-stopping power, not a prediction.
          </p>
          <div className="space-y-2">
            {hooks.map(h => (
              <button key={h.index} onClick={() => setChosenHook(h.index)}
                className="w-full text-left rounded-xl p-3 transition border"
                style={{
                  background: chosenHook === h.index ? 'rgba(234,88,12,0.10)' : '#0A0A0A',
                  borderColor: chosenHook === h.index ? '#ea580c' : '#2A2A2A',
                }}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] uppercase tracking-wide font-bold text-[#ea580c]">{h.archetype}</span>
                  {h.index === bestHook && (
                    <span className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded-full border border-[#ea580c] text-[#ea580c]">
                      picked
                    </span>
                  )}
                  <span className="ml-auto font-bold" style={{ color: scoreColor(h.score) }}>{h.score}</span>
                </div>
                <div className="text-white text-sm">“{h.line}”</div>
                <div className="text-xs text-gray-500 mt-1">{h.why}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 3 — pictures, then render */}
      {beats.length > 0 && (
        <div className={card}>
          {step(3, 'Choose the pictures', !!storyboard)}
          <p className="text-xs text-gray-500 mb-3">
            {beats.length} beats to fill. Photographs of the real thing beat generated ones — any
            beat left over gets an image generated from its b-roll note.
          </p>

          {product ? (
            <div className="grid grid-cols-4 md:grid-cols-8 gap-2 mb-4">
              {product.images.map(url => {
                const on = selectedImages.includes(url);
                const pos = selectedImages.indexOf(url);
                return (
                  <button key={url} onClick={() => toggleImage(url)}
                    className="relative aspect-square rounded-lg overflow-hidden border-2 transition"
                    style={{ borderColor: on ? '#ea580c' : '#2A2A2A' }}>
                    <img src={url} alt="" className="w-full h-full object-cover" />
                    {on && (
                      <span className="absolute top-1 left-1 w-5 h-5 rounded-full bg-[#ea580c] text-white text-[10px] font-bold flex items-center justify-center">
                        {pos + 1}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="flex items-start gap-2 text-sm text-gray-400 mb-4">
              <ImageIcon className="w-4 h-4 mt-0.5 shrink-0" />
              No product chosen — every beat will be generated. Pick a catalog product above to use
              real photographs instead.
            </p>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-gray-300">
              <input type="checkbox" checked={narrate} onChange={e => setNarrate(e.target.checked)}
                className="accent-[#ea580c]" />
              <Mic className="w-4 h-4" /> Narrate
            </label>
            <select className={`${input} w-auto`} value={voice} disabled={!narrate}
              onChange={e => setVoice(e.target.value)}>
              {VOICES.map(v => <option key={v.id} value={v.id}>{v.label}</option>)}
            </select>
            <button onClick={buildStoryboard} disabled={building}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white disabled:opacity-40"
              style={{ background: 'rgba(234,88,12,0.9)' }}>
              {building ? <Loader2 className="w-4 h-4 animate-spin" /> : storyboard ? <RefreshCw className="w-4 h-4" /> : <Wand2 className="w-4 h-4" />}
              {storyboard ? 'Rebuild storyboard' : 'Build storyboard'}
            </button>
            <span className="text-xs text-gray-500">
              {selectedImages.length} of {beats.length} beats covered by your photos
              {selectedImages.length < beats.length && ` · ${beats.length - selectedImages.length} generated`}
            </span>
          </div>

          {building && (
            <p className="text-xs text-gray-500 mt-3">
              Generating images and narration takes a minute or two — each one is a separate call.
            </p>
          )}

          {sbSummary && (
            <div className="flex flex-wrap gap-4 mt-4 text-xs text-gray-400">
              <span><b className="text-white">{sbSummary.fromYourMedia}</b> from your photos</span>
              <span><b className="text-white">{sbSummary.generated}</b> generated</span>
              <span><b className="text-white">{sbSummary.narrated}</b> narrated</span>
              {sbSummary.missingVisuals > 0 && (
                <span className="text-yellow-400 flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" /> {sbSummary.missingVisuals} with no visual
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* 4 — the video */}
      {storyboard && (
        <div className={card}>
          {step(4, 'Render and download', false)}
          <ReelRenderer
            storyboard={storyboard}
            filename={(subject || 'reel').toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 48)}
          />
        </div>
      )}

      {!hooks.length && !writing && (
        <p className="flex items-center gap-2 text-xs text-gray-600">
          <ChevronRight className="w-3.5 h-3.5" /> Start with a product — the catalog carries real
          photographs, and those make a better reel than anything generated from a description.
        </p>
      )}
    </div>
  );
}
