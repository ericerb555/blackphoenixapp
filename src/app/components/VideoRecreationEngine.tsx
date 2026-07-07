/**
 * VideoRecreationEngine — Option C unified workflow
 * Upload reference video → AI recreates script with your product → push to store + social
 *
 * Step 1: Upload reference video + your product
 * Step 2: AI analyzes style/tone/structure → generates recreation script
 * Step 3: Preview & customize (swap brand, product, pricing)
 * Step 4: Export to store product page + social scheduler simultaneously
 */
import { useState, useRef, useCallback } from 'react';
import { toast } from 'sonner@2.0.3';
import {
  Upload, Play, Pause, SkipForward, Wand2, ShoppingBag, Share2,
  ChevronRight, Check, RefreshCw, Download, Eye, Edit2, X,
  Instagram, Youtube, Facebook, Video, Sparkles, Package,
  Clock, Tag, DollarSign, Star, Send, Copy, Zap, Film,
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

interface StoreProduct {
  id: string;
  name: string;
  description: string;
  price: number;
  originalPrice?: number;
  category: string;
  image: string;
  badge?: string;
}

interface RecreatedScript {
  hook: string;
  problemStatement: string;
  productIntro: string;
  keyBenefits: string[];
  socialProof: string;
  callToAction: string;
  hashtags: string[];
  captions: {
    instagram: string;
    tiktok: string;
    facebook: string;
    youtube: string;
  };
  title: string;
  description: string;
  estimatedDuration: string;
}

type Step = 1 | 2 | 3 | 4;

// ── Demo store products (mirrors PublicStore) ──────────────────────────────────

const DEMO_PRODUCTS: StoreProduct[] = [
  { id: 'p1', name: 'Premium Roofing Kit', description: 'Professional-grade roofing materials for residential projects', price: 299, originalPrice: 399, category: 'Materials', image: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=400&q=80', badge: 'BEST SELLER' },
  { id: 'p2', name: 'Heavy-Duty Tool Set', description: '42-piece professional contractor tool set with case', price: 189, originalPrice: 249, category: 'Tools', image: 'https://images.unsplash.com/photo-1504148455328-c376907d081c?w=400&q=80' },
  { id: 'p3', name: 'Smart Home Electrical Kit', description: 'Complete smart home wiring and outlet upgrade package', price: 449, category: 'Electrical', image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&q=80', badge: 'NEW' },
  { id: 'p4', name: 'Plumbing Pro Bundle', description: 'Everything needed for bathroom and kitchen plumbing upgrades', price: 329, originalPrice: 449, category: 'Plumbing', image: 'https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=400&q=80' },
  { id: 'p5', name: 'Outdoor Structure Kit', description: 'Pre-cut lumber and hardware for deck or pergola builds', price: 799, category: 'Structures', image: 'https://images.unsplash.com/photo-1432888622747-4eb9a8f2c07b?w=400&q=80' },
  { id: 'p6', name: 'Interior Paint Bundle', description: 'Premium zero-VOC paint + supplies for 2 rooms', price: 149, category: 'Materials', image: 'https://images.unsplash.com/photo-1562259949-e8e7689d7828?w=400&q=80' },
];

// ── AI Script Generator (simulated) ───────────────────────────────────────────

function generateScript(product: StoreProduct, videoStyle: string, targetPlatform: string): RecreatedScript {
  const discount = product.originalPrice
    ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
    : 0;

  const hooks: Record<string, string> = {
    'problem-solution': `Stop wasting money on inferior ${product.category.toLowerCase()} products that fail after one job.`,
    'transformation': `What if you could complete your ${product.category.toLowerCase()} project in half the time?`,
    'curiosity': `This is the ${product.name} that professional contractors don't want you to know about.`,
    'social-proof': `Over 10,000 homeowners and contractors trust this exact ${product.name}.`,
    'urgency': `Limited stock alert — the ${product.name} that's selling out everywhere.`,
  };

  const ctas: Record<string, string> = {
    instagram: `🛒 Link in bio to grab yours now — limited stock!`,
    tiktok: `Comment "WANT" and I'll send you the link! 🔥`,
    facebook: `Click Shop Now to get yours with free shipping this week only.`,
    youtube: `Link in the description below — use code BPBUILDS for 10% off!`,
  };

  return {
    hook: hooks[videoStyle] || hooks['problem-solution'],
    problemStatement: `Most people spend too much on ${product.category.toLowerCase()} that doesn't deliver professional results. The problem isn't the project — it's the product.`,
    productIntro: `Introducing the ${product.name} from Black Phoenix Company. ${product.description}.`,
    keyBenefits: [
      `Professional grade — same tools the pros use on $50K+ projects`,
      `${discount > 0 ? `${discount}% off retail — save $${product.originalPrice! - product.price} compared to big box stores` : `Priced at $${product.price} — unmatched value for professional quality`}`,
      `Ships in 24 hours — get your project started this weekend`,
      `Backed by our satisfaction guarantee — we stand behind every order`,
    ],
    socialProof: `Our customers consistently save 30–40% on their total project costs by starting with the right materials.`,
    callToAction: `Get the ${product.name} for just $${product.price}${product.originalPrice ? ` (was $${product.originalPrice})` : ''} — shop now at the link.`,
    hashtags: [
      `#BlackPhoenix`, `#HomeImprovement`, `#${product.category}`,
      `#DIY`, `#ContractorLife`, `#HomeRenovation`, `#BuildSmart`,
      `#${product.name.replace(/\s+/g, '')}`,
    ],
    captions: {
      instagram: `✨ Upgrade your ${product.category.toLowerCase()} game with the ${product.name}!\n\n${product.description}.\n\nOnly $${product.price}${product.originalPrice ? ` (save $${product.originalPrice - product.price}!)` : ''}.\n\n${ctas.instagram}\n\n${['#BlackPhoenix', '#HomeImprovement', `#${product.category}`, '#DIY', '#Contractor'].join(' ')}`,
      tiktok: `This ${product.name} just changed how I approach ${product.category.toLowerCase()} projects 🤯\n\n$${product.price} and ships in 24hrs 📦\n\n${ctas.tiktok}`,
      facebook: `🏠 Working on a ${product.category.toLowerCase()} project?\n\nThe ${product.name} is exactly what you need. ${product.description}.\n\n💰 Just $${product.price}${discount > 0 ? ` — that's ${discount}% off retail` : ''}.\n\n${ctas.facebook}`,
      youtube: `In this video I'm breaking down the ${product.name} and showing you exactly why it's the best value in ${product.category.toLowerCase()} right now.\n\n${product.description}.\n\n${ctas.youtube}\n\nTimestamps:\n0:00 - Intro\n0:30 - What makes this different\n1:15 - Full breakdown\n2:00 - Where to get it`,
    },
    title: `${product.name} — Honest Review & Why Pros Choose It`,
    description: `Full breakdown of the ${product.name}. ${product.description}. Available now at Black Phoenix Company for $${product.price}.`,
    estimatedDuration: targetPlatform === 'youtube' ? '2–4 min' : targetPlatform === 'instagram' ? '30–60 sec' : '15–30 sec',
  };
}

// ── Platform config ────────────────────────────────────────────────────────────

const PLATFORMS = [
  { id: 'instagram', label: 'Instagram', icon: Instagram, color: 'from-purple-500 to-pink-500', textColor: 'text-purple-400' },
  { id: 'tiktok', label: 'TikTok', icon: Video, color: 'from-black to-gray-800', textColor: 'text-white' },
  { id: 'facebook', label: 'Facebook', icon: Facebook, color: 'from-blue-600 to-blue-700', textColor: 'text-blue-400' },
  { id: 'youtube', label: 'YouTube', icon: Youtube, color: 'from-red-600 to-red-700', textColor: 'text-red-400' },
];

const VIDEO_STYLES = [
  { id: 'problem-solution', label: 'Problem → Solution', desc: 'Identify pain point, present your product as the fix' },
  { id: 'transformation', label: 'Before & After', desc: 'Show the transformation your product delivers' },
  { id: 'curiosity', label: 'Curiosity Hook', desc: 'Lead with intrigue, reveal value mid-video' },
  { id: 'social-proof', label: 'Social Proof', desc: 'Lead with numbers, reviews, and testimonials' },
  { id: 'urgency', label: 'Urgency / Scarcity', desc: 'Limited time offer or low stock messaging' },
];

// ── Main Component ─────────────────────────────────────────────────────────────

interface Props {
  onPushToScheduler?: (content: any) => void;
  onPushToStore?: (productId: string, content: any) => void;
}

export default function VideoRecreationEngine({ onPushToScheduler, onPushToStore }: Props) {
  const [step, setStep] = useState<Step>(1);
  const [referenceVideo, setReferenceVideo] = useState<{ file: File; url: string } | null>(null);
  const [referenceVideoUrl, setReferenceVideoUrl] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<StoreProduct | null>(null);
  const [videoStyle, setVideoStyle] = useState('problem-solution');
  const [targetPlatforms, setTargetPlatforms] = useState<string[]>(['instagram', 'tiktok']);
  const [isGenerating, setIsGenerating] = useState(false);
  const [script, setScript] = useState<RecreatedScript | null>(null);
  const [activePlatform, setActivePlatform] = useState('instagram');
  const [editingCaption, setEditingCaption] = useState<string | null>(null);
  const [customCaptions, setCustomCaptions] = useState<Record<string, string>>({});
  const [isPlaying, setIsPlaying] = useState(false);
  const [pushingTo, setPushingTo] = useState<string | null>(null);
  const [pushed, setPushed] = useState<string[]>([]);
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleVideoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('video/')) { toast.error('Please upload a video file'); return; }
    if (file.size > 500 * 1024 * 1024) { toast.error('Video must be under 500MB'); return; }
    const url = URL.createObjectURL(file);
    setReferenceVideo({ file, url });
    toast.success(`Reference video loaded: ${file.name}`);
  }

  function togglePlatform(id: string) {
    setTargetPlatforms(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  }

  async function handleGenerate() {
    if (!selectedProduct) { toast.error('Please select a product from your store first'); return; }
    if (!referenceVideo && !referenceVideoUrl) { toast.error('Please upload a reference video or paste a URL'); return; }
    setIsGenerating(true);
    // Simulate AI analysis delay
    await new Promise(r => setTimeout(r, 2500));
    const generated = generateScript(selectedProduct, videoStyle, targetPlatforms[0] || 'instagram');
    setScript(generated);
    setActivePlatform(targetPlatforms[0] || 'instagram');
    setIsGenerating(false);
    setStep(3);
    toast.success('Script recreated! Review and customize below.');
  }

  function getCaption(platform: string) {
    return customCaptions[platform] ?? script?.captions[platform as keyof typeof script.captions] ?? '';
  }

  async function pushToSocial() {
    if (!script) return;
    setPushingTo('social');
    await new Promise(r => setTimeout(r, 1200));

    const content = {
      title: script.title,
      description: script.description,
      platforms: targetPlatforms.map(p => ({
        platform: p,
        caption: getCaption(p),
        hashtags: script.hashtags,
      })),
      product: selectedProduct,
      script,
      createdAt: new Date().toISOString(),
    };

    onPushToScheduler?.(content);
    setPushed(prev => [...prev, 'social']);
    setPushingTo(null);
    toast.success(`Content queued for ${targetPlatforms.length} platform${targetPlatforms.length > 1 ? 's' : ''}! Go to Social Scheduler to set publish times.`);
  }

  async function pushToStore() {
    if (!script || !selectedProduct) return;
    setPushingTo('store');
    await new Promise(r => setTimeout(r, 1200));

    onPushToStore?.(selectedProduct.id, {
      title: script.title,
      description: script.description,
      videoScript: script,
    });

    setPushed(prev => [...prev, 'store']);
    setPushingTo(null);
    toast.success(`Product page content updated for ${selectedProduct.name}!`);
  }

  function copyToClipboard(text: string, label: string) {
    navigator.clipboard.writeText(text).catch(() => {});
    toast.success(`${label} copied to clipboard`);
  }

  function reset() {
    setStep(1);
    setReferenceVideo(null);
    setReferenceVideoUrl('');
    setSelectedProduct(null);
    setScript(null);
    setPushed([]);
    setCustomCaptions({});
  }

  // ── Step indicators ────────────────────────────────────────────────────────

  const steps = [
    { n: 1, label: 'Upload Reference' },
    { n: 2, label: 'Select Product & Style' },
    { n: 3, label: 'Review Script' },
    { n: 4, label: 'Publish' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Film className="w-6 h-6 text-orange-400" /> Video Recreation Engine
          </h2>
          <p className="text-gray-400 text-sm mt-0.5">
            Upload any reference video → AI recreates the script for your product → publish to store + all social channels
          </p>
        </div>
        {step > 1 && (
          <button onClick={reset} className="flex items-center gap-2 px-4 py-2 bg-[#2A2A2A] hover:bg-[#3A3A3A] text-gray-300 rounded-lg text-sm transition">
            <RefreshCw className="w-4 h-4" /> Start Over
          </button>
        )}
      </div>

      {/* Step progress bar */}
      <div className="flex items-center gap-2">
        {steps.map((s, i) => (
          <div key={s.n} className="flex items-center gap-2 flex-1">
            <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold transition flex-1 ${
              step === s.n ? 'bg-orange-600 text-white' :
              step > s.n ? 'bg-green-600/20 text-green-400 border border-green-500/30' :
              'bg-[#1A1A1A] text-gray-500 border border-[#2A2A2A]'
            }`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                step > s.n ? 'bg-green-500 text-white' : step === s.n ? 'bg-white text-orange-600' : 'bg-[#2A2A2A] text-gray-600'
              }`}>
                {step > s.n ? <Check className="w-3.5 h-3.5" /> : s.n}
              </div>
              <span className="hidden sm:block">{s.label}</span>
            </div>
            {i < steps.length - 1 && <ChevronRight className="w-4 h-4 text-gray-600 flex-shrink-0" />}
          </div>
        ))}
      </div>

      {/* ── STEP 1: Upload Reference Video ───────────────────────────────────── */}
      {step === 1 && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Upload box */}
            <div>
              <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                <Upload className="w-5 h-5 text-orange-400" /> Upload Reference Video
              </h3>
              <p className="text-sm text-gray-400 mb-4">Upload any video that sells well — a competitor ad, a trending TikTok, an Amazon product video. We'll analyze its structure and recreate it with your product.</p>

              {referenceVideo ? (
                <div className="bg-[#1A1A1A] border border-green-500/30 rounded-2xl p-4 space-y-3">
                  <video ref={videoRef} src={referenceVideo.url} className="w-full rounded-xl max-h-48 object-cover bg-black" controls />
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-white">{referenceVideo.file.name}</p>
                      <p className="text-xs text-gray-500">{(referenceVideo.file.size / 1024 / 1024).toFixed(1)} MB</p>
                    </div>
                    <button onClick={() => setReferenceVideo(null)} className="p-1.5 hover:bg-[#2A2A2A] rounded-lg text-gray-400 hover:text-white transition">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex items-center gap-2 p-2 bg-green-500/10 border border-green-500/20 rounded-lg">
                    <Check className="w-4 h-4 text-green-400 flex-shrink-0" />
                    <p className="text-xs text-green-300">Reference video ready for analysis</p>
                  </div>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center gap-4 w-full h-52 border-2 border-dashed border-[#3A3A3A] hover:border-orange-500/50 hover:bg-orange-500/5 rounded-2xl cursor-pointer transition group">
                  <div className="w-16 h-16 bg-orange-500/10 rounded-2xl flex items-center justify-center group-hover:bg-orange-500/20 transition">
                    <Video className="w-8 h-8 text-orange-400" />
                  </div>
                  <div className="text-center">
                    <p className="text-white font-semibold">Drop reference video here</p>
                    <p className="text-gray-500 text-sm mt-1">MP4, MOV, AVI · Up to 500MB</p>
                  </div>
                  <input ref={fileInputRef} type="file" accept="video/*" className="hidden" onChange={handleVideoUpload} />
                </label>
              )}

              <div className="flex items-center gap-3 my-4">
                <div className="flex-1 h-px bg-[#2A2A2A]" />
                <span className="text-xs text-gray-500">or paste URL</span>
                <div className="flex-1 h-px bg-[#2A2A2A]" />
              </div>

              <input
                value={referenceVideoUrl}
                onChange={e => setReferenceVideoUrl(e.target.value)}
                placeholder="https://www.tiktok.com/... or YouTube URL"
                className="w-full bg-[#0A0A0A] border border-[#2A2A2A] focus:border-orange-500 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-600 focus:outline-none"
              />
              {referenceVideoUrl && (
                <div className="flex items-center gap-2 p-2 bg-blue-500/10 border border-blue-500/20 rounded-lg mt-2">
                  <Check className="w-4 h-4 text-blue-400 flex-shrink-0" />
                  <p className="text-xs text-blue-300">URL will be analyzed for structure and style</p>
                </div>
              )}
            </div>

            {/* What AI will do */}
            <div>
              <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-400" /> What the AI Does
              </h3>
              <div className="space-y-3">
                {[
                  { icon: Eye, color: 'text-blue-400 bg-blue-500/10', label: 'Analyzes Structure', desc: 'Hook, problem setup, product reveal, benefits, CTA — the AI maps the exact flow.' },
                  { icon: Edit2, color: 'text-purple-400 bg-purple-500/10', label: 'Recreates the Script', desc: 'Rewrites every line with your product name, price, brand, and value proposition.' },
                  { icon: Package, color: 'text-orange-400 bg-orange-500/10', label: 'Links Your Product', desc: 'Pulls real data from your store — name, description, price, category.' },
                  { icon: Share2, color: 'text-green-400 bg-green-500/10', label: 'Formats for Every Platform', desc: 'Generates platform-specific captions, hashtags, and CTAs for Instagram, TikTok, Facebook, YouTube.' },
                  { icon: ShoppingBag, color: 'text-yellow-400 bg-yellow-500/10', label: 'Updates Your Store', desc: 'Pushes the new title, description, and script directly to the product page.' },
                ].map((item, i) => {
                  const Icon = item.icon;
                  return (
                    <div key={i} className="flex items-start gap-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-4">
                      <div className={`w-9 h-9 rounded-lg ${item.color} flex items-center justify-center flex-shrink-0`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white">{item.label}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{item.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={() => {
                if (!referenceVideo && !referenceVideoUrl) { toast.error('Upload a video or paste a URL first'); return; }
                setStep(2);
              }}
              className="flex items-center gap-2 px-6 py-3 bg-orange-600 hover:bg-orange-500 text-white rounded-xl font-semibold transition">
              Next: Select Product <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 2: Select Product & Style ───────────────────────────────────── */}
      {step === 2 && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Product selector */}
            <div>
              <h3 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-orange-400" /> Your Store Products
              </h3>
              <p className="text-xs text-gray-500 mb-3">Select the product you want this video to sell</p>
              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {DEMO_PRODUCTS.map(product => (
                  <button key={product.id} onClick={() => setSelectedProduct(product)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl border transition text-left ${
                      selectedProduct?.id === product.id
                        ? 'bg-orange-600/20 border-orange-500/50 ring-1 ring-orange-500/30'
                        : 'bg-[#1A1A1A] border-[#2A2A2A] hover:border-orange-500/30'
                    }`}>
                    <img src={product.image} alt={product.name} className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-white truncate">{product.name}</p>
                        {product.badge && <span className="px-1.5 py-0.5 bg-orange-500/20 text-orange-400 rounded text-xs font-bold">{product.badge}</span>}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-orange-400 font-bold text-sm">${product.price}</span>
                        {product.originalPrice && <span className="text-gray-600 text-xs line-through">${product.originalPrice}</span>}
                        <span className="text-gray-500 text-xs">· {product.category}</span>
                      </div>
                    </div>
                    {selectedProduct?.id === product.id && <Check className="w-5 h-5 text-orange-400 flex-shrink-0" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Style + Platform */}
            <div className="space-y-5">
              <div>
                <h3 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
                  <Wand2 className="w-5 h-5 text-purple-400" /> Video Style
                </h3>
                <p className="text-xs text-gray-500 mb-3">How do you want the recreated video to open and hook viewers?</p>
                <div className="space-y-2">
                  {VIDEO_STYLES.map(style => (
                    <button key={style.id} onClick={() => setVideoStyle(style.id)}
                      className={`w-full flex items-start gap-3 p-3 rounded-xl border transition text-left ${
                        videoStyle === style.id ? 'bg-purple-600/20 border-purple-500/50' : 'bg-[#1A1A1A] border-[#2A2A2A] hover:border-purple-500/30'
                      }`}>
                      <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 mt-0.5 flex items-center justify-center ${videoStyle === style.id ? 'border-purple-500 bg-purple-500' : 'border-gray-600'}`}>
                        {videoStyle === style.id && <div className="w-2 h-2 bg-white rounded-full" />}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white">{style.label}</p>
                        <p className="text-xs text-gray-400">{style.desc}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-base font-bold text-white mb-1 flex items-center gap-2">
                  <Share2 className="w-4 h-4 text-green-400" /> Target Platforms
                </h3>
                <p className="text-xs text-gray-500 mb-3">Select all platforms you want captions generated for</p>
                <div className="grid grid-cols-2 gap-2">
                  {PLATFORMS.map(p => {
                    const Icon = p.icon;
                    const selected = targetPlatforms.includes(p.id);
                    return (
                      <button key={p.id} onClick={() => togglePlatform(p.id)}
                        className={`flex items-center gap-2 p-3 rounded-xl border transition ${
                          selected ? `bg-gradient-to-r ${p.color} border-transparent text-white` : 'bg-[#1A1A1A] border-[#2A2A2A] text-gray-400 hover:border-gray-500'
                        }`}>
                        <Icon className="w-4 h-4" />
                        <span className="text-sm font-semibold">{p.label}</span>
                        {selected && <Check className="w-4 h-4 ml-auto" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-between">
            <button onClick={() => setStep(1)} className="px-5 py-2.5 bg-[#1A1A1A] border border-[#2A2A2A] text-gray-400 hover:text-white rounded-xl text-sm transition">
              ← Back
            </button>
            <button onClick={handleGenerate} disabled={isGenerating || !selectedProduct}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-600 to-purple-600 hover:from-orange-500 hover:to-purple-500 disabled:opacity-50 text-white rounded-xl font-semibold transition">
              {isGenerating ? (
                <><RefreshCw className="w-4 h-4 animate-spin" /> Analyzing & Recreating…</>
              ) : (
                <><Wand2 className="w-4 h-4" /> Generate Recreation</>
              )}
            </button>
          </div>

          {/* Generating overlay */}
          {isGenerating && (
            <div className="bg-[#1A1A1A] border border-orange-500/30 rounded-2xl p-6 text-center space-y-3">
              <div className="w-12 h-12 bg-orange-500/20 rounded-full flex items-center justify-center mx-auto">
                <Sparkles className="w-6 h-6 text-orange-400 animate-pulse" />
              </div>
              <p className="text-white font-semibold">AI is recreating your video script…</p>
              <div className="space-y-1 text-sm text-gray-400">
                <p>✓ Analyzing reference video structure</p>
                <p>✓ Mapping hook → benefits → CTA flow</p>
                <p className="text-orange-400 animate-pulse">⟳ Rewriting with your product details…</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── STEP 3: Review & Customize Script ────────────────────────────────── */}
      {step === 3 && script && selectedProduct && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Script breakdown */}
            <div className="lg:col-span-2 space-y-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Film className="w-5 h-5 text-orange-400" /> Recreated Script
                <span className="text-xs text-gray-500 font-normal ml-auto">{script.estimatedDuration} · {targetPlatforms.length} platform{targetPlatforms.length > 1 ? 's' : ''}</span>
              </h3>

              {/* Script sections */}
              {[
                { label: '🎣 Hook (Opening Line)', content: script.hook, color: 'border-red-500/30 bg-red-500/5' },
                { label: '⚡ Problem Statement', content: script.problemStatement, color: 'border-orange-500/30 bg-orange-500/5' },
                { label: '🎯 Product Introduction', content: script.productIntro, color: 'border-blue-500/30 bg-blue-500/5' },
                { label: '💪 Social Proof', content: script.socialProof, color: 'border-purple-500/30 bg-purple-500/5' },
                { label: '🛒 Call to Action', content: script.callToAction, color: 'border-green-500/30 bg-green-500/5' },
              ].map((section, i) => (
                <div key={i} className={`border rounded-xl p-4 ${section.color}`}>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">{section.label}</p>
                    <button onClick={() => copyToClipboard(section.content, section.label.split(' ').slice(1).join(' '))}
                      className="p-1 hover:bg-white/10 rounded text-gray-500 hover:text-white transition">
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <p className="text-sm text-white leading-relaxed">{section.content}</p>
                </div>
              ))}

              {/* Key benefits */}
              <div className="border border-yellow-500/30 bg-yellow-500/5 rounded-xl p-4">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">✅ Key Benefits (Bullet Points)</p>
                <ul className="space-y-2">
                  {script.keyBenefits.map((b, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-white">
                      <Check className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
                      {b}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Hashtags */}
              <div className="border border-[#2A2A2A] bg-[#1A1A1A] rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider"># Hashtags</p>
                  <button onClick={() => copyToClipboard(script.hashtags.join(' '), 'Hashtags')}
                    className="flex items-center gap-1 text-xs text-gray-500 hover:text-white transition">
                    <Copy className="w-3 h-3" /> Copy all
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {script.hashtags.map((tag, i) => (
                    <span key={i} className="px-2.5 py-1 bg-[#0A0A0A] border border-[#2A2A2A] rounded-full text-xs text-orange-400 font-medium">{tag}</span>
                  ))}
                </div>
              </div>
            </div>

            {/* Platform captions + product preview */}
            <div className="space-y-4">
              {/* Platform caption switcher */}
              <div>
                <h3 className="text-base font-bold text-white mb-3 flex items-center gap-2">
                  <Share2 className="w-4 h-4 text-green-400" /> Platform Captions
                </h3>
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {targetPlatforms.map(pid => {
                    const p = PLATFORMS.find(pl => pl.id === pid);
                    if (!p) return null;
                    const Icon = p.icon;
                    return (
                      <button key={pid} onClick={() => { setActivePlatform(pid); setEditingCaption(null); }}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                          activePlatform === pid ? `bg-gradient-to-r ${p.color} text-white` : 'bg-[#1A1A1A] border border-[#2A2A2A] text-gray-400 hover:text-white'
                        }`}>
                        <Icon className="w-3.5 h-3.5" /> {p.label}
                      </button>
                    );
                  })}
                </div>

                {editingCaption === activePlatform ? (
                  <div className="space-y-2">
                    <textarea
                      value={customCaptions[activePlatform] ?? getCaption(activePlatform)}
                      onChange={e => setCustomCaptions(prev => ({ ...prev, [activePlatform]: e.target.value }))}
                      rows={8}
                      className="w-full bg-[#0A0A0A] border border-orange-500/50 rounded-xl px-3 py-2 text-white text-xs focus:outline-none resize-none"
                    />
                    <div className="flex gap-2">
                      <button onClick={() => setEditingCaption(null)} className="flex-1 py-1.5 bg-orange-600 text-white rounded-lg text-xs font-semibold">Save</button>
                      <button onClick={() => { setCustomCaptions(prev => { const n = {...prev}; delete n[activePlatform]; return n; }); setEditingCaption(null); }}
                        className="px-3 py-1.5 bg-[#2A2A2A] text-gray-400 rounded-lg text-xs">Reset</button>
                    </div>
                  </div>
                ) : (
                  <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-3 relative group">
                    <pre className="text-xs text-gray-300 whitespace-pre-wrap leading-relaxed font-sans">{getCaption(activePlatform)}</pre>
                    <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition">
                      <button onClick={() => setEditingCaption(activePlatform)} className="p-1 bg-[#2A2A2A] hover:bg-[#3A3A3A] rounded text-gray-400 hover:text-white">
                        <Edit2 className="w-3 h-3" />
                      </button>
                      <button onClick={() => copyToClipboard(getCaption(activePlatform), 'Caption')} className="p-1 bg-[#2A2A2A] hover:bg-[#3A3A3A] rounded text-gray-400 hover:text-white">
                        <Copy className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Product preview card */}
              <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl overflow-hidden">
                <div className="flex items-center gap-2 px-3 py-2 bg-[#0A0A0A] border-b border-[#2A2A2A]">
                  <ShoppingBag className="w-4 h-4 text-orange-400" />
                  <p className="text-xs font-semibold text-gray-400">Store Product Preview</p>
                </div>
                <img src={selectedProduct.image} alt={selectedProduct.name} className="w-full h-32 object-cover" />
                <div className="p-3 space-y-1">
                  <p className="font-bold text-white text-sm">{script.title}</p>
                  <p className="text-xs text-gray-400 leading-relaxed">{script.description}</p>
                  <div className="flex items-center gap-2 pt-1">
                    <span className="text-orange-400 font-bold">${selectedProduct.price}</span>
                    {selectedProduct.originalPrice && <span className="text-gray-600 text-xs line-through">${selectedProduct.originalPrice}</span>}
                    <span className="px-2 py-0.5 bg-green-500/20 text-green-400 border border-green-500/30 rounded text-xs font-bold ml-auto">Ready to publish</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-between">
            <button onClick={() => setStep(2)} className="px-5 py-2.5 bg-[#1A1A1A] border border-[#2A2A2A] text-gray-400 hover:text-white rounded-xl text-sm transition">
              ← Back
            </button>
            <button onClick={() => setStep(4)} className="flex items-center gap-2 px-6 py-3 bg-orange-600 hover:bg-orange-500 text-white rounded-xl font-semibold transition">
              Next: Publish <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 4: Publish ──────────────────────────────────────────────────── */}
      {step === 4 && script && selectedProduct && (
        <div className="space-y-6">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Send className="w-5 h-5 text-green-400" /> Publish Your Recreation
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            {/* Push to Social */}
            <div className={`border-2 rounded-2xl p-6 transition ${pushed.includes('social') ? 'border-green-500/50 bg-green-500/5' : 'border-[#2A2A2A] bg-[#1A1A1A] hover:border-orange-500/30'}`}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl flex items-center justify-center">
                  <Share2 className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="font-bold text-white">Push to Social Scheduler</p>
                  <p className="text-xs text-gray-400">Queue for {targetPlatforms.length} platform{targetPlatforms.length > 1 ? 's' : ''}</p>
                </div>
                {pushed.includes('social') && <Check className="w-6 h-6 text-green-400 ml-auto" />}
              </div>
              <div className="flex flex-wrap gap-2 mb-4">
                {targetPlatforms.map(pid => {
                  const p = PLATFORMS.find(pl => pl.id === pid);
                  if (!p) return null;
                  const Icon = p.icon;
                  return (
                    <span key={pid} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-gradient-to-r ${p.color} text-white`}>
                      <Icon className="w-3.5 h-3.5" /> {p.label}
                    </span>
                  );
                })}
              </div>
              <p className="text-xs text-gray-500 mb-4">Platform-specific captions + hashtags are ready. You'll set publish times in the Social Scheduler tab.</p>
              <button onClick={pushToSocial} disabled={!!pushingTo || pushed.includes('social')}
                className={`w-full py-3 rounded-xl font-semibold text-sm transition flex items-center justify-center gap-2 ${
                  pushed.includes('social') ? 'bg-green-600/20 text-green-400 border border-green-500/30 cursor-default' :
                  'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white disabled:opacity-50'
                }`}>
                {pushingTo === 'social' ? <><RefreshCw className="w-4 h-4 animate-spin" /> Queuing…</> :
                 pushed.includes('social') ? <><Check className="w-4 h-4" /> Queued for Scheduling</> :
                 <><Send className="w-4 h-4" /> Push to Social Scheduler</>}
              </button>
            </div>

            {/* Push to Store */}
            <div className={`border-2 rounded-2xl p-6 transition ${pushed.includes('store') ? 'border-green-500/50 bg-green-500/5' : 'border-[#2A2A2A] bg-[#1A1A1A] hover:border-orange-500/30'}`}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-orange-600 to-orange-700 rounded-xl flex items-center justify-center">
                  <ShoppingBag className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="font-bold text-white">Update Store Product Page</p>
                  <p className="text-xs text-gray-400">{selectedProduct.name}</p>
                </div>
                {pushed.includes('store') && <Check className="w-6 h-6 text-green-400 ml-auto" />}
              </div>
              <div className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl p-3 mb-4 space-y-2">
                <div className="flex items-start gap-2">
                  <Check className="w-3.5 h-3.5 text-orange-400 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-gray-300">New SEO title: <span className="text-white italic">"{script.title}"</span></p>
                </div>
                <div className="flex items-start gap-2">
                  <Check className="w-3.5 h-3.5 text-orange-400 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-gray-300">Updated product description with benefits</p>
                </div>
                <div className="flex items-start gap-2">
                  <Check className="w-3.5 h-3.5 text-orange-400 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-gray-300">Video script linked to product listing</p>
                </div>
              </div>
              <button onClick={pushToStore} disabled={!!pushingTo || pushed.includes('store')}
                className={`w-full py-3 rounded-xl font-semibold text-sm transition flex items-center justify-center gap-2 ${
                  pushed.includes('store') ? 'bg-green-600/20 text-green-400 border border-green-500/30 cursor-default' :
                  'bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-500 hover:to-orange-600 text-white disabled:opacity-50'
                }`}>
                {pushingTo === 'store' ? <><RefreshCw className="w-4 h-4 animate-spin" /> Updating…</> :
                 pushed.includes('store') ? <><Check className="w-4 h-4" /> Store Page Updated</> :
                 <><ShoppingBag className="w-4 h-4" /> Push to Store</>}
              </button>
            </div>
          </div>

          {/* Success state */}
          {pushed.length === 2 && (
            <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/30 rounded-2xl p-6 text-center space-y-3">
              <div className="w-14 h-14 bg-green-500/20 rounded-full flex items-center justify-center mx-auto">
                <Zap className="w-7 h-7 text-green-400" />
              </div>
              <p className="text-xl font-bold text-white">All done! Your recreation is live.</p>
              <p className="text-gray-400 text-sm">
                Content is queued in Social Scheduler · Product page updated · Script saved to Content Library
              </p>
              <div className="flex gap-3 justify-center pt-2">
                <button onClick={reset} className="px-5 py-2.5 bg-orange-600 hover:bg-orange-500 text-white rounded-xl font-semibold text-sm transition">
                  Recreate Another Video
                </button>
              </div>
            </div>
          )}

          <div className="flex justify-start">
            <button onClick={() => setStep(3)} className="px-5 py-2.5 bg-[#1A1A1A] border border-[#2A2A2A] text-gray-400 hover:text-white rounded-xl text-sm transition">
              ← Back to Script
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
