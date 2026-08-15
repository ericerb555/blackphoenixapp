/**
 * ContentPackageGenerator — the professional path in the Content Center.
 *
 * Calls /content-studio/package, which returns several genuinely different
 * angles on one brief, each written for every channel you asked for, plus SEO
 * fields and an optional hero image. You pick the angle you want and save it.
 *
 * The point of showing variants rather than one draft: the old generator
 * produced a single take and you either used it or regenerated blindly. Here
 * the model has to commit to distinct approaches — proof-led, pain-led,
 * story-led — score them honestly, and say which it would ship and why. That
 * turns "accept or reroll" into an actual editorial choice.
 */
import { useState } from 'react';
import {
  Sparkles, Loader2, Check, AlertTriangle, Copy, Search,
  Image as ImageIcon, Trophy, ChevronDown,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../lib/supabase';
import { projectId, publicAnonKey } from '../utils/supabase/info';

const SERVER = `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6`;

// Must match PLATFORM_SPEC on the server — anything else is silently ignored
// there, which would look like the platform simply produced nothing.
const PLATFORMS = [
  { id: 'instagram', label: 'Instagram' },
  { id: 'facebook', label: 'Facebook' },
  { id: 'linkedin', label: 'LinkedIn' },
  { id: 'twitter', label: 'X / Twitter' },
  { id: 'tiktok', label: 'TikTok' },
  { id: 'youtube', label: 'YouTube' },
  { id: 'blog', label: 'Blog article' },
  { id: 'email', label: 'Email' },
  { id: 'ad', label: 'Ad copy' },
] as const;

interface Channel { title: string; body: string; hashtags: string[]; missing?: boolean }
interface Variant {
  index: number; angle: string; rationale: string; score: number;
  issues: string[]; channels: Record<string, Channel>;
}
interface Pkg {
  variants: Variant[]; bestVariantIndex: number; bestVariantReason: string;
  platforms: string[];
  seo: { title: string; metaDescription: string; slug: string; keywords: string[] };
  imagePrompt: string; image: string | null; imageError: string | null;
}

const scoreColor = (n: number) =>
  n >= 90 ? '#34d399' : n >= 75 ? '#fbbf24' : '#f87171';

export default function ContentPackageGenerator({
  onSave,
}: {
  /** Called with the chosen variant so the parent can put it in the library. */
  onSave?: (piece: {
    title: string; body: string; hashtags: string[]; platform: string;
    angle: string; score: number; seo: Pkg['seo']; image: string | null;
  }) => void;
}) {
  const [topic, setTopic] = useState('');
  const [tone, setTone] = useState('professional and plain-spoken');
  const [audience, setAudience] = useState('');
  const [platforms, setPlatforms] = useState<string[]>(['instagram']);
  const [variantCount, setVariantCount] = useState(3);
  const [withImage, setWithImage] = useState(false);

  const [busy, setBusy] = useState(false);
  const [pkg, setPkg] = useState<Pkg | null>(null);
  const [chosen, setChosen] = useState<number | null>(null);
  const [activeChannel, setActiveChannel] = useState<string>('instagram');
  const [showSeo, setShowSeo] = useState(false);

  const togglePlatform = (id: string) =>
    setPlatforms(prev => (prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]));

  const generate = async () => {
    if (!topic.trim()) { toast.error('Describe what this is about first.'); return; }
    if (!platforms.length) { toast.error('Pick at least one channel.'); return; }

    setBusy(true);
    setPkg(null);
    setChosen(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${SERVER}/content-studio/package`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token || publicAnonKey}`,
        },
        body: JSON.stringify({
          topic: topic.trim(),
          platforms,
          variants: variantCount,
          tone,
          audience: audience.trim() || undefined,
          withImage,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) {
        throw new Error(data?.error || `Generation failed (${res.status})`);
      }

      setPkg(data);
      setChosen(data.bestVariantIndex ?? 0);
      setActiveChannel(data.platforms?.[0] || platforms[0]);

      // The image is a bonus and is allowed to fail without failing the copy —
      // say so rather than leaving an empty frame with no explanation.
      if (withImage && !data.image) {
        toast.error(`Copy is ready, but the image could not be generated: ${data.imageError || 'unknown reason'}`, { duration: 9000 });
      } else {
        toast.success(`${data.variants?.length || 0} angles ready`);
      }
    } catch (err: any) {
      console.error('[ContentPackage] generate:', err);
      toast.error(err?.message || 'Could not generate that package.');
    } finally {
      setBusy(false);
    }
  };

  const copy = (text: string) => {
    navigator.clipboard?.writeText(text)
      .then(() => toast.success('Copied'))
      .catch(() => toast.error('Could not copy — select and copy manually.'));
  };

  const save = () => {
    if (!pkg || chosen === null) return;
    const v = pkg.variants[chosen];
    const ch = v.channels[activeChannel];
    if (!ch || ch.missing) { toast.error('That channel came back empty — pick another.'); return; }
    onSave?.({
      title: ch.title || pkg.seo.title || topic,
      body: ch.body,
      hashtags: ch.hashtags,
      platform: activeChannel,
      angle: v.angle,
      score: v.score,
      seo: pkg.seo,
      image: pkg.image,
    });
  };

  const current = pkg && chosen !== null ? pkg.variants[chosen] : null;
  const currentChannel = current?.channels?.[activeChannel];

  return (
    <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-6">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center"
             style={{ background: 'linear-gradient(135deg,#7c3aed,#ea580c)' }}>
          <Sparkles className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="text-white font-bold">Content Package</h3>
          <p className="text-sm text-gray-400">
            Several angles on one brief, written for every channel, scored — you pick.
          </p>
        </div>
      </div>

      {/* brief */}
      <div className="space-y-4 mb-5">
        <div>
          <label className="block text-xs text-gray-400 mb-1.5 uppercase tracking-wide">What is this about?</label>
          <textarea
            value={topic} onChange={e => setTopic(e.target.value)} rows={2}
            placeholder="We just finished a 400 sq ft mahogany deck in Hollis with hidden fasteners and cable railing"
            className="w-full px-3 py-2.5 rounded-xl bg-[#0F0F0F] border border-[#2A2A2A] text-white outline-none focus:border-orange-500/50 resize-y"
          />
          <p className="text-xs text-gray-600 mt-1">
            Specifics beat adjectives. Real numbers, materials and places give the model something to work with.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-gray-400 mb-1.5 uppercase tracking-wide">Tone</label>
            <input value={tone} onChange={e => setTone(e.target.value)}
              placeholder="confident tradesman, no marketing fluff"
              className="w-full px-3 py-2.5 rounded-xl bg-[#0F0F0F] border border-[#2A2A2A] text-white outline-none focus:border-orange-500/50" />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1.5 uppercase tracking-wide">Audience (optional)</label>
            <input value={audience} onChange={e => setAudience(e.target.value)}
              placeholder="homeowners in southern NH"
              className="w-full px-3 py-2.5 rounded-xl bg-[#0F0F0F] border border-[#2A2A2A] text-white outline-none focus:border-orange-500/50" />
          </div>
        </div>

        <div>
          <label className="block text-xs text-gray-400 mb-2 uppercase tracking-wide">Channels</label>
          <div className="flex flex-wrap gap-2">
            {PLATFORMS.map(p => {
              const on = platforms.includes(p.id);
              return (
                <button key={p.id} onClick={() => togglePlatform(p.id)}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold transition-colors"
                  style={{
                    background: on ? 'rgba(234,88,12,0.15)' : 'rgba(255,255,255,0.04)',
                    border: `1px solid ${on ? 'rgba(234,88,12,0.5)' : '#2A2A2A'}`,
                    color: on ? '#fb923c' : '#9ca3af',
                  }}>
                  {p.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-xs text-gray-400 mb-1.5 uppercase tracking-wide">Angles</label>
            <select value={variantCount} onChange={e => setVariantCount(Number(e.target.value))}
              className="px-3 py-2.5 rounded-xl bg-[#0F0F0F] border border-[#2A2A2A] text-white outline-none">
              {[2, 3, 4, 5].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-300 pb-2.5 cursor-pointer">
            <input type="checkbox" checked={withImage} onChange={e => setWithImage(e.target.checked)}
              className="accent-orange-600 w-4 h-4" />
            Generate a hero image
            <span className="text-xs text-gray-600">(slower)</span>
          </label>
          <button onClick={generate} disabled={busy}
            className="ml-auto flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-40"
            style={{ background: '#ea580c' }}>
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {busy ? 'Writing…' : 'Generate'}
          </button>
        </div>
      </div>

      {/* results */}
      {pkg && (
        <div className="border-t border-[#2A2A2A] pt-5">
          {pkg.bestVariantReason && (
            <div className="flex items-start gap-2 mb-4 p-3 rounded-xl"
                 style={{ background: 'rgba(124,58,237,0.10)', border: '1px solid rgba(124,58,237,0.3)' }}>
              <Trophy className="w-4 h-4 mt-0.5 shrink-0" style={{ color: '#a78bfa' }} />
              <p className="text-sm text-gray-300">
                <span className="font-bold text-white">Recommended: {pkg.variants[pkg.bestVariantIndex]?.angle}</span>
                {' — '}{pkg.bestVariantReason}
              </p>
            </div>
          )}

          {/* angle picker */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
            {pkg.variants.map(v => {
              const on = chosen === v.index;
              return (
                <button key={v.index} onClick={() => setChosen(v.index)}
                  className="text-left p-3.5 rounded-xl transition-colors"
                  style={{
                    background: on ? 'rgba(234,88,12,0.10)' : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${on ? 'rgba(234,88,12,0.5)' : '#2A2A2A'}`,
                  }}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-bold text-white truncate">{v.angle}</span>
                    <span className="text-xs font-bold tabular-nums shrink-0 ml-2"
                          style={{ color: scoreColor(v.score) }}>{v.score}</span>
                  </div>
                  <p className="text-xs text-gray-500 line-clamp-2">{v.rationale}</p>
                  {v.issues?.length > 0 && (
                    <p className="text-xs mt-1.5 flex items-start gap-1" style={{ color: '#fbbf24' }}>
                      <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />
                      {v.issues.length} note{v.issues.length === 1 ? '' : 's'}
                    </p>
                  )}
                </button>
              );
            })}
          </div>

          {current && (
            <>
              {/* channel tabs */}
              <div className="flex items-center gap-1 mb-3 flex-wrap">
                {pkg.platforms.map(p => (
                  <button key={p} onClick={() => setActiveChannel(p)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
                      activeChannel === p ? 'text-white' : 'text-gray-500 hover:text-gray-300'
                    }`}
                    style={activeChannel === p
                      ? { background: 'rgba(255,255,255,0.08)', border: '1px solid #2A2A2A' }
                      : undefined}>
                    {PLATFORMS.find(x => x.id === p)?.label || p}
                    {current.channels[p]?.missing && ' ⚠'}
                  </button>
                ))}
              </div>

              {current.issues?.length > 0 && (
                <ul className="mb-3 space-y-1">
                  {current.issues.map((issue, i) => (
                    <li key={i} className="text-xs flex items-start gap-1.5" style={{ color: '#fbbf24' }}>
                      <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />{issue}
                    </li>
                  ))}
                </ul>
              )}

              {/* the copy */}
              {currentChannel?.missing ? (
                <div className="p-4 rounded-xl text-sm text-gray-400"
                     style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)' }}>
                  This angle came back empty for {activeChannel}. Pick another angle or channel, or generate again.
                </div>
              ) : (
                <div className="rounded-xl bg-[#0F0F0F] border border-[#2A2A2A] p-4">
                  {currentChannel?.title && (
                    <p className="text-white font-bold mb-2">{currentChannel.title}</p>
                  )}
                  <p className="text-sm text-gray-200 whitespace-pre-wrap">{currentChannel?.body}</p>
                  {currentChannel?.hashtags?.length > 0 && (
                    <p className="text-sm mt-3" style={{ color: '#38bdf8' }}>
                      {currentChannel.hashtags.map(h => `#${h}`).join(' ')}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-2 mt-4">
                    <button onClick={() => copy(
                      [currentChannel?.title, currentChannel?.body,
                       currentChannel?.hashtags?.length ? currentChannel.hashtags.map(h => `#${h}`).join(' ') : '']
                        .filter(Boolean).join('\n\n'),
                    )}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold text-gray-300 border border-[#2A2A2A]">
                      <Copy className="w-3.5 h-3.5" /> Copy
                    </button>
                    {onSave && (
                      <button onClick={save}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold text-white"
                        style={{ background: '#ea580c' }}>
                        <Check className="w-3.5 h-3.5" /> Save to library
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* image */}
              {(pkg.image || pkg.imageError) && (
                <div className="mt-4">
                  {pkg.image ? (
                    <img src={pkg.image} alt="Generated hero"
                         className="rounded-xl border border-[#2A2A2A] max-h-72 object-cover w-full" />
                  ) : (
                    <p className="text-xs flex items-start gap-1.5" style={{ color: '#f87171' }}>
                      <ImageIcon className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                      Image unavailable: {pkg.imageError}
                    </p>
                  )}
                </div>
              )}

              {/* SEO */}
              <button onClick={() => setShowSeo(v => !v)}
                className="mt-4 flex items-center gap-1.5 text-xs font-bold text-gray-400 hover:text-white">
                <Search className="w-3.5 h-3.5" /> SEO fields
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showSeo ? 'rotate-180' : ''}`} />
              </button>
              {showSeo && (
                <div className="mt-2 rounded-xl bg-[#0F0F0F] border border-[#2A2A2A] p-4 space-y-2 text-sm">
                  <Row label="Title" value={pkg.seo.title} hint={`${pkg.seo.title.length}/60`} onCopy={copy} />
                  <Row label="Meta" value={pkg.seo.metaDescription} hint={`${pkg.seo.metaDescription.length}/155`} onCopy={copy} />
                  <Row label="Slug" value={pkg.seo.slug} onCopy={copy} />
                  <Row label="Keywords" value={pkg.seo.keywords.join(', ')} onCopy={copy} />
                  {pkg.imagePrompt && <Row label="Art direction" value={pkg.imagePrompt} onCopy={copy} />}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function Row({ label, value, hint, onCopy }: {
  label: string; value: string; hint?: string; onCopy: (t: string) => void;
}) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3">
      <span className="text-xs text-gray-500 uppercase tracking-wide w-24 shrink-0 pt-0.5">{label}</span>
      <span className="text-gray-200 flex-1 break-words">{value}</span>
      {hint && <span className="text-xs text-gray-600 shrink-0">{hint}</span>}
      <button onClick={() => onCopy(value)} className="text-gray-600 hover:text-white shrink-0">
        <Copy className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
