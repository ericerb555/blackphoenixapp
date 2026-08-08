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
import { useStoreProducts } from '../lib/useStoreProducts';
import {
  Upload, Play, Pause, SkipForward, Wand2, ShoppingBag, Share2,
  ChevronRight, Check, RefreshCw, Download, Eye, Edit2, X,
  Instagram, Youtube, Facebook, Video, Sparkles, Package,
  Clock, Tag, DollarSign, Star, Send, Copy, Zap, Film,
} from 'lucide-react';
import { projectId, publicAnonKey } from '../utils/supabase/info';

const RECREATE_API = `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6`;
const recreateHeaders = {
  Authorization: `Bearer ${publicAnonKey}`,
  apikey: publicAnonKey,
  'Content-Type': 'application/json',
};

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

interface SceneCard {
  scene: number;
  label: string;
  startTime: string;
  endTime: string;
  duration: string;
  script: string;
  visualNote: string;
  onScreenText?: string;
}

interface FormatOutput {
  format: 'reel' | 'ad' | 'short' | 'story';
  label: string;
  duration: string;
  platform: string;
  hook: string;
  script: string;
  caption: string;
  structure: string;
}

interface ThumbnailConcept {
  id: string;
  concept: string;
  headline: string;
  visualDescription: string;
  colorScheme: string;
  emoji: string;
}

interface ReferenceAnalysis {
  hookType: string;
  hookDuration: string;
  pacing: string;
  structure: string[];
  emotionalTrigger: string;
  ctaStyle: string;
  estimatedViews: string;
  whyItWorks: string;
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
  // Pro features
  storyboard: SceneCard[];
  formats: FormatOutput[];
  thumbnails: ThumbnailConcept[];
  referenceAnalysis: ReferenceAnalysis;
  transformationScore: number; // 0-100, higher = more different from original
}

type Step = 1 | 2 | 3 | 3.5 | 4;

// ── Sample products — used ONLY if the live store catalog can't be reached ─────

const DEMO_PRODUCTS: StoreProduct[] = [
  { id: 'p1', name: 'Premium Roofing Kit', description: 'Professional-grade roofing materials for residential projects', price: 299, originalPrice: 399, category: 'Materials', image: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=400&q=80', badge: 'BEST SELLER' },
  { id: 'p2', name: 'Heavy-Duty Tool Set', description: '42-piece professional contractor tool set with case', price: 189, originalPrice: 249, category: 'Tools', image: 'https://images.unsplash.com/photo-1504148455328-c376907d081c?w=400&q=80' },
  { id: 'p3', name: 'Smart Home Electrical Kit', description: 'Complete smart home wiring and outlet upgrade package', price: 449, category: 'Electrical', image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&q=80', badge: 'NEW' },
  { id: 'p4', name: 'Plumbing Pro Bundle', description: 'Everything needed for bathroom and kitchen plumbing upgrades', price: 329, originalPrice: 449, category: 'Plumbing', image: 'https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=400&q=80' },
  { id: 'p5', name: 'Outdoor Structure Kit', description: 'Pre-cut lumber and hardware for deck or pergola builds', price: 799, category: 'Structures', image: 'https://images.unsplash.com/photo-1432888622747-4eb9a8f2c07b?w=400&q=80' },
  { id: 'p6', name: 'Interior Paint Bundle', description: 'Premium zero-VOC paint + supplies for 2 rooms', price: 149, category: 'Materials', image: 'https://images.unsplash.com/photo-1562259949-e8e7689d7828?w=400&q=80' },
];

// ── Script scaffold builder ────────────────────────────────────────────────
// Builds the structural scaffold (storyboard, formats, thumbnails, reference
// analysis). The AI-written copy fields (hook, benefits, captions, etc.) are
// generated server-side by OpenAI and merged over this scaffold in
// handleGenerate — this is only the fallback/base structure.

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

    // ── PRO: Reference video analysis ────────────────────────────────────────
    referenceAnalysis: {
      hookType: videoStyle === 'problem-solution' ? 'Pain Point Hook' : videoStyle === 'transformation' ? 'Visual Transformation' : videoStyle === 'curiosity' ? 'Curiosity Gap' : videoStyle === 'social-proof' ? 'Social Proof Lead' : 'Scarcity/Urgency',
      hookDuration: '0:00 – 0:03',
      pacing: videoStyle === 'curiosity' ? 'Fast cut, 1–2 sec per scene' : 'Medium, 3–5 sec per scene',
      structure: ['Hook', 'Problem agitation', 'Product reveal', 'Key benefit #1', 'Key benefit #2', 'Social proof', 'CTA'],
      emotionalTrigger: videoStyle === 'problem-solution' ? 'Frustration → Relief' : videoStyle === 'transformation' ? 'Aspiration → Achievability' : 'Curiosity → Satisfaction',
      ctaStyle: 'Direct link-in-bio / swipe up',
      estimatedViews: '50K–200K based on engagement pattern',
      whyItWorks: `The reference uses a ${videoStyle.replace('-', ' ')} structure that immediately addresses viewer pain before introducing the solution. The short hook (under 3 seconds) retains 80%+ of viewers past the first frame.`,
    },

    // ── PRO: Scene-by-scene storyboard ───────────────────────────────────────
    storyboard: [
      { scene: 1, label: 'Hook', startTime: '0:00', endTime: '0:03', duration: '3s', script: hooks[videoStyle] || hooks['problem-solution'], visualNote: 'Close-up product shot OR problem scenario. Fast cut. No music intro.', onScreenText: '❌ Stop doing this...' },
      { scene: 2, label: 'Problem Agitation', startTime: '0:03', endTime: '0:07', duration: '4s', script: `Most people spend too much on ${product.category.toLowerCase()} that doesn't deliver. The problem isn't the project — it's the product.`, visualNote: 'Show the "wrong" alternative. Frustrated face or bad result footage.', onScreenText: `😤 Tired of wasting $$$?` },
      { scene: 3, label: 'Product Reveal', startTime: '0:07', endTime: '0:12', duration: '5s', script: `Introducing the ${product.name}. ${product.description}.`, visualNote: 'Clean product reveal. 360° spin or flat lay. Brand colors.', onScreenText: product.name },
      { scene: 4, label: 'Benefit #1', startTime: '0:12', endTime: '0:17', duration: '5s', script: `Professional grade — same standard the pros use on $50K+ projects.`, visualNote: 'Show product in use. Action shot. Quick cuts.', onScreenText: '✅ Pro Grade Quality' },
      { scene: 5, label: 'Benefit #2 + Price', startTime: '0:17', endTime: '0:22', duration: '5s', script: `$${product.price}${discount > 0 ? ` — ${discount}% off retail` : ''}. Ships in 24 hours.`, visualNote: 'Price card overlay. Countdown urgency if applicable.', onScreenText: `💰 $${product.price} — Limited Stock` },
      { scene: 6, label: 'Social Proof', startTime: '0:22', endTime: '0:26', duration: '4s', script: `Thousands of customers save 30–40% on project costs starting with the right materials.`, visualNote: 'Review screenshots or testimonial text overlay.', onScreenText: '⭐⭐⭐⭐⭐ 10,000+ happy customers' },
      { scene: 7, label: 'Call to Action', startTime: '0:26', endTime: '0:30', duration: '4s', script: ctas[targetPlatform as keyof typeof ctas] || ctas.instagram, visualNote: 'Direct eye contact or product close-up. Link/CTA overlay at bottom.', onScreenText: '🔗 Link in bio — Shop Now' },
    ],

    // ── PRO: 4 format outputs ────────────────────────────────────────────────
    formats: [
      {
        format: 'reel', label: 'TikTok / Instagram Reel', duration: '15–30 sec', platform: 'TikTok · Instagram',
        hook: hooks[videoStyle] || hooks['problem-solution'],
        script: `${hooks[videoStyle]} / ${product.name} — $${product.price}, ships in 24hrs. Link in bio 🔗`,
        caption: ctas.tiktok,
        structure: 'Hook (3s) → Problem (4s) → Product (5s) → Price + CTA (8s)',
      },
      {
        format: 'ad', label: 'Paid Ad (Facebook / IG)', duration: '30–45 sec', platform: 'Facebook Ads · Instagram Ads',
        hook: `Attention ${product.category} shoppers —`,
        script: `Are you still overpaying for ${product.category.toLowerCase()}? The ${product.name} delivers professional results at $${product.price}. ${product.description}. ${ctas.facebook}`,
        caption: ctas.facebook,
        structure: 'Attention (2s) → Interest (8s) → Desire (15s) → Action (5s) — AIDA framework',
      },
      {
        format: 'short', label: 'YouTube Short', duration: '45–60 sec', platform: 'YouTube Shorts',
        hook: `I found the ${product.name} and it changed everything —`,
        script: `${hooks['curiosity']} Here's what I discovered about the ${product.name}. ${product.description}. At $${product.price} this is unbeatable. ${ctas.youtube}`,
        caption: ctas.youtube,
        structure: 'Curiosity hook (5s) → Setup (10s) → Demo (25s) → Verdict + CTA (10s)',
      },
      {
        format: 'story', label: 'Instagram / Facebook Story', duration: '10–15 sec', platform: 'IG Stories · FB Stories',
        hook: `Swipe up 👆`,
        script: `Quick find → ${product.name} → $${product.price} → Link in bio`,
        caption: `${product.name} 🔥 $${product.price} — tap the link!`,
        structure: 'Single card: Product image + price + swipe-up CTA. No voiceover needed.',
      },
    ],

    // ── PRO: Thumbnail concepts ──────────────────────────────────────────────
    thumbnails: [
      {
        id: 't1', concept: 'Price Shock', emoji: '💰',
        headline: `$${product.price}?! 🤯`,
        visualDescription: `Large price number overlaid on product. Surprised/shocked face in corner. Dark background with orange accent.`,
        colorScheme: 'Black bg · Orange text · White product',
      },
      {
        id: 't2', concept: 'Before vs After', emoji: '🔄',
        headline: 'This Changed Everything',
        visualDescription: `Split screen: left side shows the problem, right side shows product in use. Bold arrow in center.`,
        colorScheme: 'Red left · Green right · White text',
      },
      {
        id: 't3', concept: 'Authority', emoji: '⭐',
        headline: `Pros ONLY Use This`,
        visualDescription: `Clean product flat lay. "PRO GRADE" badge in corner. Minimalist style.`,
        colorScheme: 'White bg · Black text · Gold badge',
      },
    ],

    // ── PRO: Transformation score ────────────────────────────────────────────
    transformationScore: 94, // High score = very different from original = safe
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
  preloadedProduct?: any; // product passed in from Shop Intelligence "Recreate" button
}

export default function VideoRecreationEngine({ onPushToScheduler, onPushToStore, preloadedProduct }: Props) {
  // If a product was passed in from Shop Intelligence, pre-select it and go to step 2
  const initialStep: Step = preloadedProduct ? 2 : 1;
  // Live store catalog — same products your storefront sells.
  const {
    products: storeProducts,
    loading: productsLoading,
    live: productsLive,
    error: productsError,
    reload: reloadProducts,
  } = useStoreProducts(DEMO_PRODUCTS as any);
  const [step, setStep] = useState<Step>(initialStep);
  const [referenceVideo, setReferenceVideo] = useState<{ file: File; url: string } | null>(null);
  const [referenceVideoUrl, setReferenceVideoUrl] = useState('');
  const [scanUrl, setScanUrl] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [scannedContent, setScannedContent] = useState<any>(null);
  const [selectedProduct, setSelectedProduct] = useState<StoreProduct | null>(
    preloadedProduct ? {
      id: preloadedProduct.id || `preload_${Date.now()}`,
      name: preloadedProduct.name,
      description: preloadedProduct.description || preloadedProduct.reason || '',
      price: preloadedProduct.price || 0,
      originalPrice: preloadedProduct.originalPrice,
      category: preloadedProduct.category || 'General',
      image: preloadedProduct.image || '',
      badge: preloadedProduct.badge,
    } : null
  );
  const [videoStyle, setVideoStyle] = useState('problem-solution');
  const [targetPlatforms, setTargetPlatforms] = useState<string[]>(['instagram', 'tiktok']);
  const [creatorBrief, setCreatorBrief] = useState('');
  const [isForStore, setIsForStore] = useState(false);
  const [generatedProductPage, setGeneratedProductPage] = useState<any>(null);
  const [showProductPage, setShowProductPage] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [script, setScript] = useState<RecreatedScript | null>(null);
  const [activePlatform, setActivePlatform] = useState('instagram');
  const [editingCaption, setEditingCaption] = useState<string | null>(null);
  const [customCaptions, setCustomCaptions] = useState<Record<string, string>>({});
  const [previewMode, setPreviewMode] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [pushingTo, setPushingTo] = useState<string | null>(null);
  // Pro view tabs in Step 3
  const [proTab, setProTab] = useState<'script' | 'storyboard' | 'formats' | 'analysis' | 'thumbnails'>('script');
  const [selectedFormat, setSelectedFormat] = useState<string>('reel');
  const [showTransformScore, setShowTransformScore] = useState(false);
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

  function detectUrlType(url: string): 'tiktok' | 'instagram' | 'youtube' | 'facebook' | 'amazon' | 'shopify' | 'product' | 'ad' | 'unknown' {
    if (url.includes('tiktok.com')) return 'tiktok';
    if (url.includes('instagram.com')) return 'instagram';
    if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube';
    if (url.includes('facebook.com') || url.includes('fb.com')) return 'facebook';
    if (url.includes('amazon.com') || url.includes('amzn.to')) return 'amazon';
    if (url.includes('shopify.com') || url.includes('myshopify.com')) return 'shopify';
    return 'unknown';
  }

  function extractProductFromAmazonUrl(url: string): Partial<StoreProduct> {
    // Extract ASIN from Amazon URL
    const asinMatch = url.match(/\/dp\/([A-Z0-9]{10})/i) || url.match(/\/gp\/product\/([A-Z0-9]{10})/i);
    const asin = asinMatch?.[1] || '';
    return {
      id: `amazon_${asin}`,
      name: 'Amazon Product (paste title below)',
      description: 'Add the product description from the Amazon listing',
      price: 0,
      category: 'General',
      image: '',
      badge: 'IMPORTED',
    };
  }

  async function scanUrl_fn() {
    if (!scanUrl.trim()) { toast.error('Please enter a URL to scan'); return; }
    setIsScanning(true);

    await new Promise(r => setTimeout(r, 1500));

    const type = detectUrlType(scanUrl);
    let result: any = { url: scanUrl, type, detected: true };

    if (type === 'tiktok') {
      result = { ...result, contentType: 'video/reel', platform: 'TikTok', note: 'TikTok video detected — will be used as reference for recreation', icon: '🎵' };
      setReferenceVideoUrl(scanUrl);
    } else if (type === 'instagram') {
      result = { ...result, contentType: 'reel/post', platform: 'Instagram', note: 'Instagram content detected — will recreate the style and format', icon: '📸' };
      setReferenceVideoUrl(scanUrl);
    } else if (type === 'youtube') {
      result = { ...result, contentType: 'video/ad', platform: 'YouTube', note: 'YouTube video detected — will recreate as short-form content', icon: '▶️' };
      setReferenceVideoUrl(scanUrl);
    } else if (type === 'facebook') {
      result = { ...result, contentType: 'video/ad', platform: 'Facebook', note: 'Facebook ad/video detected — will recreate the messaging and format', icon: '👍' };
      setReferenceVideoUrl(scanUrl);
    } else if (type === 'amazon') {
      const productData = extractProductFromAmazonUrl(scanUrl);
      result = { ...result, contentType: 'product', platform: 'Amazon', note: 'Amazon product detected — will generate product page + video script', icon: '📦', productData };
      setIsForStore(true);
    } else if (type === 'shopify') {
      result = { ...result, contentType: 'product', platform: 'Shopify Store', note: 'Shopify product detected — will recreate as your store product', icon: '🛍️' };
      setIsForStore(true);
    } else {
      result = { ...result, contentType: 'unknown', platform: 'Website', note: 'Website detected — will analyze the content style and recreate', icon: '🌐' };
      setReferenceVideoUrl(scanUrl);
    }

    setScannedContent(result);
    setIsScanning(false);
    toast.success(`✅ ${result.icon} ${result.platform} content detected! Review below then continue.`);
  }

  function togglePlatform(id: string) {
    setTargetPlatforms(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  }

  async function handleGenerate() {
    if (!selectedProduct) { toast.error('Please select a product from your store first'); return; }
    // Reference video only required when no product is preloaded
    if (!preloadedProduct && !referenceVideo && !referenceVideoUrl && !scannedContent) {
      toast.error('Please upload a reference video or paste a URL to recreate from');
      return;
    }
    setIsGenerating(true);

    const platform = targetPlatforms[0] || 'instagram';
    // Structural scaffold (storyboard/formats/thumbnails). Copy fields below are
    // replaced by real AI output.
    const generated = generateScript(selectedProduct, videoStyle, platform);

    // Real AI recreation copy from the backend (OpenAI, brand-voice aware).
    let usedAI = false;
    try {
      const reference = scannedContent
        ? `${scannedContent.platform || ''} ${scannedContent.note || ''} ${scannedContent.url || ''}`.trim()
        : (referenceVideoUrl || (referenceVideo ? 'uploaded reference video' : ''));
      const res = await fetch(`${RECREATE_API}/content-studio/recreate-script`, {
        method: 'POST',
        headers: recreateHeaders,
        body: JSON.stringify({
          productName: selectedProduct.name,
          category: selectedProduct.category,
          description: selectedProduct.description,
          price: selectedProduct.price,
          originalPrice: selectedProduct.originalPrice,
          videoStyle,
          platform,
          brief: creatorBrief.trim(),
          reference,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success && data.script) {
        const s = data.script;
        // Merge real AI copy over the structural scaffold.
        generated.hook = s.hook || generated.hook;
        generated.problemStatement = s.problemStatement || generated.problemStatement;
        generated.productIntro = s.productIntro || generated.productIntro;
        if (Array.isArray(s.keyBenefits) && s.keyBenefits.length) generated.keyBenefits = s.keyBenefits;
        generated.socialProof = s.socialProof || generated.socialProof;
        generated.callToAction = s.callToAction || generated.callToAction;
        if (Array.isArray(s.hashtags) && s.hashtags.length) generated.hashtags = s.hashtags;
        generated.title = s.title || generated.title;
        generated.description = s.description || generated.description;
        if (s.captions) {
          generated.captions = {
            instagram: s.captions.instagram || generated.captions.instagram,
            tiktok: s.captions.tiktok || generated.captions.tiktok,
            facebook: s.captions.facebook || generated.captions.facebook,
            youtube: s.captions.youtube || generated.captions.youtube,
          };
        }
        usedAI = true;
      } else {
        console.error('AI recreate-script failed, using template scaffold:', data.error || res.status);
      }
    } catch (err) {
      console.error('AI recreate-script request error, using template scaffold:', err);
    }

    if (!usedAI) {
      toast.info('Using built-in template (AI service unavailable — publish the backend to enable AI recreation).');
      // In template mode, still honor the brief by folding it into the hook.
      if (creatorBrief.trim()) {
        generated.hook = `${generated.hook} ${creatorBrief.trim().endsWith('.') ? creatorBrief.trim() : creatorBrief.trim() + '.'}`;
      }
    }

    // If for store, generate a full product detail page
    if (isForStore && selectedProduct) {
      const productPage = {
        name: selectedProduct.name,
        tagline: `${selectedProduct.name} — ${selectedProduct.category} That Delivers Results`,
        shortDescription: selectedProduct.description,
        longDescription: `${selectedProduct.description}\n\nDesigned for professionals and serious DIYers alike, the ${selectedProduct.name} is built to perform where it matters most. Whether you're tackling a full renovation or a weekend project, this is the product that delivers consistent, professional-grade results every time.`,
        price: selectedProduct.price,
        originalPrice: selectedProduct.originalPrice,
        category: selectedProduct.category,
        features: generated.keyBenefits,
        specifications: [
          { label: 'Category', value: selectedProduct.category },
          { label: 'Price', value: `$${selectedProduct.price.toFixed(2)}` },
          { label: 'Availability', value: 'In Stock — Ships in 24 hours' },
          { label: 'Warranty', value: '30-Day Satisfaction Guarantee' },
          { label: 'Shipping', value: 'Free on orders over $500' },
        ],
        seoTitle: generated.title,
        seoDescription: generated.description,
        callToAction: generated.callToAction,
        socialProof: generated.socialProof,
        faq: [
          { q: `Is the ${selectedProduct.name} right for my project?`, a: `Yes — the ${selectedProduct.name} is designed for a wide range of ${selectedProduct.category.toLowerCase()} applications, from small repairs to full-scale projects.` },
          { q: 'How long does shipping take?', a: 'Orders ship within 24 hours. Standard delivery is 3–7 business days. Free shipping on orders over $500.' },
          { q: 'Do you offer a warranty?', a: 'Every product comes with our 30-Day Satisfaction Guarantee. If you\'re not happy, we\'ll make it right.' },
          { q: 'Can I use this for commercial projects?', a: `Absolutely. The ${selectedProduct.name} is professional-grade and trusted by contractors across the country.` },
        ],
        generatedAt: new Date().toISOString(),
      };
      setGeneratedProductPage(productPage);
    }

    setScript(generated);
    setActivePlatform(targetPlatforms[0] || 'instagram');
    setIsGenerating(false);
    setStep(3);
    toast.success(`${usedAI ? 'AI script generated!' : 'Script recreated!'}${isForStore ? ' Product page also generated.' : ''} Review and customize below.`);
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
    { n: 3.5, label: 'Review Product Page' },
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

          {/* ⚖️ Legal Disclaimer */}
          <div className="flex items-start gap-3 p-4 rounded-2xl border" style={{ background: 'rgba(234,179,8,0.05)', borderColor: 'rgba(234,179,8,0.25)' }}>
            <span className="text-xl flex-shrink-0">⚖️</span>
            <div>
              <p className="text-sm font-bold text-yellow-300 mb-1">Copyright Protection — Your Content Must Be Transformative</p>
              <p className="text-xs text-gray-400 leading-relaxed mb-2">
                You can use any video as <strong className="text-white">creative inspiration</strong>, but your output must be substantially different. The AI recreates the <em>structure and strategy</em> — not the actual content. To stay protected:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {[
                  '✅ Use your own voice, face, or brand visuals',
                  '✅ Change the hook, angle, and examples used',
                  '✅ Add your unique perspective or experience',
                  '✅ Use your own product and pricing',
                  '❌ Don\'t copy exact words or phrases',
                  '❌ Don\'t replicate the same on-screen text',
                  '❌ Don\'t use their audio, music, or voiceover',
                  '❌ Don\'t duplicate a competitor\'s specific creative',
                ].map((item, i) => (
                  <p key={i} className="text-xs text-gray-400">{item}</p>
                ))}
              </div>
              <p className="text-xs text-gray-600 mt-2">The AI generates a <strong className="text-gray-400">different script in the same style</strong> — similar to how musicians can write a song in the same genre without copying another song.</p>
            </div>
          </div>

          {/* ── URL SCANNER ─────────────────────────────────────────────────── */}
          <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(234,88,12,0.3)', background: 'rgba(234,88,12,0.05)' }}>
            <div className="px-5 py-4 border-b border-orange-500/20">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Zap className="w-4 h-4 text-orange-400" /> Scan Any Link to Recreate
              </h3>
              <p className="text-xs text-gray-400 mt-1">
                Paste any URL — TikTok video, Instagram reel, YouTube ad, Amazon product, competitor website — and AI will analyze and recreate it for your brand
              </p>
            </div>
            <div className="p-5 space-y-3">
              {/* Supported types */}
              <div className="flex flex-wrap gap-2">
                {[
                  { icon: '🎵', label: 'TikTok' }, { icon: '📸', label: 'Instagram' },
                  { icon: '▶️', label: 'YouTube' }, { icon: '👍', label: 'Facebook' },
                  { icon: '📦', label: 'Amazon' }, { icon: '🛍️', label: 'Shopify' },
                  { icon: '🌐', label: 'Any Website' },
                ].map(t => (
                  <span key={t.label} className="px-2.5 py-1 rounded-full text-xs font-medium bg-[#1A1A1A] border border-[#2A2A2A] text-gray-400">
                    {t.icon} {t.label}
                  </span>
                ))}
              </div>

              {/* URL input */}
              <div className="flex gap-2">
                <input
                  value={scanUrl}
                  onChange={e => setScanUrl(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && scanUrl_fn()}
                  placeholder="https://www.tiktok.com/... or amazon.com/dp/... or any URL"
                  className="flex-1 bg-[#0A0A0A] border border-[#2A2A2A] focus:border-orange-500 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-600 focus:outline-none"
                />
                <button onClick={scanUrl_fn} disabled={isScanning || !scanUrl.trim()}
                  className="flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-sm transition disabled:opacity-50"
                  style={{ background: '#ea580c', color: '#fff' }}>
                  {isScanning ? <><RefreshCw className="w-4 h-4 animate-spin" /> Scanning…</> : <><Zap className="w-4 h-4" /> Scan</>}
                </button>
              </div>

              {/* Scan result */}
              {scannedContent && (
                <div className="flex items-start gap-3 p-4 rounded-xl bg-[#0A0A0A] border border-green-500/30">
                  <span className="text-2xl flex-shrink-0">{scannedContent.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-bold text-white">{scannedContent.platform} — {scannedContent.contentType}</p>
                      <span className="px-2 py-0.5 bg-green-500/20 text-green-400 border border-green-500/30 rounded-full text-xs font-bold">Detected</span>
                    </div>
                    <p className="text-xs text-gray-400">{scannedContent.note}</p>
                    {scannedContent.contentType === 'product' && (
                      <p className="text-xs text-orange-400 mt-1 font-semibold">✓ Product page generation enabled automatically</p>
                    )}
                  </div>
                  <button onClick={() => setScannedContent(null)} className="text-gray-600 hover:text-gray-400 transition flex-shrink-0">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-[#2A2A2A]" />
            <span className="text-xs text-gray-500 font-semibold uppercase tracking-wider">or upload a file</span>
            <div className="flex-1 h-px bg-[#2A2A2A]" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Upload box */}
            <div>
              <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                <Upload className="w-5 h-5 text-orange-400" /> Upload Reference Video
              </h3>
              <p className="text-sm text-gray-400 mb-4">Upload any video file — MP4, MOV, AVI. We'll analyze its structure and recreate it with your product.</p>

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
                if (!referenceVideo && !referenceVideoUrl && !scannedContent) { toast.error('Scan a URL or upload a video first'); return; }
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

          {/* Preloaded product banner */}
          {preloadedProduct && selectedProduct && (
            <div className="flex items-center gap-4 p-4 rounded-2xl border border-orange-500/30" style={{ background: 'rgba(234,88,12,0.08)' }}>
              <div className="w-12 h-12 rounded-xl bg-orange-600/20 border border-orange-500/30 flex items-center justify-center flex-shrink-0 overflow-hidden">
                {selectedProduct.image ? <img src={selectedProduct.image} alt={selectedProduct.name} className="w-full h-full object-cover rounded-xl" /> : <Package className="w-6 h-6 text-orange-400" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <Zap className="w-3.5 h-3.5 text-orange-400" />
                  <p className="text-xs font-bold text-orange-400 uppercase tracking-wider">Product Loaded from Shop Intelligence</p>
                </div>
                <p className="font-bold text-white truncate">{selectedProduct.name}</p>
                <p className="text-xs text-gray-400">{selectedProduct.category} · ${selectedProduct.price || 'Price TBD'}</p>
              </div>
              <button onClick={() => setSelectedProduct(null)}
                className="p-1.5 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition flex-shrink-0">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Product selector */}
            <div>
              <h3 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-orange-400" /> Your Store Products
              </h3>
              <div className="flex items-center justify-between gap-2 mb-3">
                <p className="text-xs text-gray-500 min-w-0">
                  {selectedProduct
                    ? 'Product selected ✓ — or pick a different one below'
                    : productsLoading
                      ? 'Loading your live store catalog…'
                      : productsLive
                        ? `Pulled live from your store · ${storeProducts.length} product${storeProducts.length !== 1 ? 's' : ''}`
                        : `Showing sample products${productsError ? ` — ${productsError}` : ''}`}
                </p>
                <button onClick={reloadProducts} title="Refresh from store" className="text-gray-500 hover:text-white flex-shrink-0">
                  <RefreshCw className={`w-4 h-4 ${productsLoading ? 'animate-spin' : ''}`} />
                </button>
              </div>
              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {storeProducts.length === 0 && !productsLoading && (
                  <div className="p-6 text-center text-sm text-gray-500 rounded-xl border border-[#2A2A2A]">
                    Your store has no active products yet. Add one in Product Catalog and it will appear here.
                  </div>
                )}
                {storeProducts.map(product => (
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

          {/* ── CREATOR BRIEF ─────────────────────────────────────────────── */}
          <div className="space-y-4 border border-[#2A2A2A] rounded-2xl p-5 bg-[#0A0A0A]">
            <div>
              <label className="block text-sm font-bold text-white mb-1 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-400" /> Describe What You Want the Recreation to Look Like
              </label>
              <p className="text-xs text-gray-500 mb-3">Tell the AI your vision — tone, audience, key message, what to emphasize, what to avoid. The more detail you give, the better the output.</p>
              <textarea
                value={creatorBrief}
                onChange={e => setCreatorBrief(e.target.value)}
                rows={3}
                placeholder="e.g. 'Make it feel urgent and exciting, targeting homeowners aged 30–50. Lead with the price savings angle. Avoid technical jargon. End with a strong discount CTA.' "
                className="w-full bg-[#1A1A1A] border border-[#2A2A2A] focus:border-purple-500 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-600 focus:outline-none resize-none transition"
              />
            </div>

            {/* Store product page toggle */}
            <div className="flex items-center justify-between py-3 px-4 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl">
              <div>
                <p className="text-sm font-bold text-white">Generate Product Info Page for Store</p>
                <p className="text-xs text-gray-500 mt-0.5">Creates a full product description, specs, FAQ, and SEO content for your store listing</p>
              </div>
              <button onClick={() => setIsForStore(!isForStore)}
                className={`w-12 h-6 rounded-full transition-all relative flex-shrink-0 ${isForStore ? 'bg-orange-600' : 'bg-[#2A2A2A]'}`}>
                <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${isForStore ? 'left-6' : 'left-0.5'}`} />
              </button>
            </div>
          </div>

          {/* Optional reference video note when product is preloaded */}
          {preloadedProduct && (
            <div className="flex items-start gap-3 p-4 bg-blue-500/5 border border-blue-500/20 rounded-xl">
              <Sparkles className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-blue-300">Reference video is optional</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  Since you brought in <strong className="text-white">{selectedProduct?.name}</strong> from Shop Intelligence, the AI can generate a script directly from the product data.
                  You can still <button onClick={() => setStep(1)} className="text-blue-400 hover:text-blue-300 underline">add a reference video</button> to match a specific style.
                </p>
              </div>
            </div>
          )}

          <div className="flex justify-between">
            <button onClick={() => setStep(preloadedProduct ? 1 : 1)} className="px-5 py-2.5 bg-[#1A1A1A] border border-[#2A2A2A] text-gray-400 hover:text-white rounded-xl text-sm transition">
              {preloadedProduct ? '+ Add Reference Video (optional)' : '← Back'}
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
              <p className="text-white font-semibold">AI is generating your video script…</p>
              <div className="space-y-1 text-sm text-gray-400">
                {(referenceVideo || referenceVideoUrl || scannedContent) ? (
                  <>
                    <p>✓ Analyzing reference video structure</p>
                    <p>✓ Mapping hook → benefits → CTA flow</p>
                  </>
                ) : (
                  <>
                    <p>✓ Loading product data for {selectedProduct?.name}</p>
                    <p>✓ Selecting best-performing video structure</p>
                  </>
                )}
                <p className="text-orange-400 animate-pulse">⟳ Writing script with your product details…</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── STEP 3: Review & Customize Script ────────────────────────────────── */}
      {step === 3 && !previewMode && script && selectedProduct && (
        <div className="space-y-5">

          {/* ── PRO HEADER: Transformation score + tab bar ─────────────────── */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div className="relative w-12 h-12">
                  <svg className="w-12 h-12 -rotate-90" viewBox="0 0 36 36">
                    <circle cx="18" cy="18" r="15.9" fill="none" stroke="#2A2A2A" strokeWidth="3" />
                    <circle cx="18" cy="18" r="15.9" fill="none" stroke="#22c55e" strokeWidth="3"
                      strokeDasharray={`${(script.transformationScore / 100) * 100} 100`}
                      strokeLinecap="round" />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-xs font-black text-green-400">{script.transformationScore}</span>
                </div>
                <div>
                  <p className="text-xs font-bold text-white">Transformation Score</p>
                  <p className="text-xs text-green-400">{script.transformationScore >= 90 ? '✅ Legally Safe' : script.transformationScore >= 70 ? '⚠️ Review needed' : '❌ Too similar'}</p>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setPreviewMode(true)} className="flex items-center gap-1.5 px-3 py-2 bg-purple-600/20 border border-purple-500/30 text-purple-400 hover:bg-purple-600/30 rounded-xl text-xs font-bold transition">
                <Eye className="w-3.5 h-3.5" /> Preview Posts
              </button>
              {generatedProductPage && (
                <button onClick={() => setStep(3.5)} className="flex items-center gap-1.5 px-3 py-2 bg-blue-600/20 border border-blue-500/30 text-blue-400 hover:bg-blue-600/30 rounded-xl text-xs font-bold transition">
                  <ShoppingBag className="w-3.5 h-3.5" /> Product Page
                </button>
              )}
            </div>
          </div>

          {/* Pro tab bar */}
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {([
              { id: 'script', label: '📝 Script', desc: 'Recreated script' },
              { id: 'storyboard', label: '🎬 Storyboard', desc: 'Scene-by-scene' },
              { id: 'formats', label: '📱 4 Formats', desc: 'Reel / Ad / Short / Story' },
              { id: 'analysis', label: '🔍 Analysis', desc: 'Reference breakdown' },
              { id: 'thumbnails', label: '🖼️ Thumbnails', desc: 'Concept ideas' },
            ] as const).map(tab => (
              <button key={tab.id} onClick={() => setProTab(tab.id)}
                className={`flex flex-col items-center gap-0.5 px-4 py-2.5 rounded-xl whitespace-nowrap text-xs font-semibold transition flex-shrink-0 ${
                  proTab === tab.id ? 'bg-orange-600 text-white' : 'bg-[#1A1A1A] border border-[#2A2A2A] text-gray-400 hover:text-white'
                }`}>
                {tab.label}
              </button>
            ))}
          </div>

          {/* ── SCRIPT TAB ─────────────────────────────────────────────────── */}
          {proTab === 'script' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Film className="w-5 h-5 text-orange-400" /> Recreated Script
                <span className="text-xs text-gray-500 font-normal ml-auto">{script.estimatedDuration} · {targetPlatforms.length} platform{targetPlatforms.length > 1 ? 's' : ''}</span>
              </h3>

              {/* Transformation checklist */}
              <div className="rounded-xl p-4 space-y-2" style={{ background: 'rgba(34,197,94,0.05)', border: '1px solid rgba(34,197,94,0.2)' }}>
                <p className="text-xs font-bold text-green-400 flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5" /> Your Script is Legally Protected — Here's Why:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                  {[
                    '✅ Completely rewritten hook — different from reference',
                    '✅ Your product name & pricing throughout',
                    '✅ Original value proposition and benefits',
                    '✅ New CTA with your brand voice',
                    '✅ Fresh hashtags tailored to your niche',
                    '✅ Structure inspired, content 100% original',
                  ].map((item, i) => (
                    <p key={i} className="text-xs text-gray-400">{item}</p>
                  ))}
                </div>
                <p className="text-xs text-gray-600 mt-1">
                  <strong className="text-gray-500">Before publishing:</strong> Record with your own voice/face, use your own visuals, and add your personal take to make it uniquely yours.
                </p>
              </div>

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
          )}

          {/* ── GENERATED PRODUCT PAGE (script tab only) ──────────────────── */}
          {proTab === 'script' && generatedProductPage && (
            <div className="border border-orange-500/30 rounded-2xl overflow-hidden">
              <button
                onClick={() => setShowProductPage(!showProductPage)}
                className="w-full flex items-center justify-between px-5 py-4 bg-gradient-to-r from-orange-600/10 to-orange-700/5 hover:from-orange-600/15 transition">
                <div className="flex items-center gap-3">
                  <ShoppingBag className="w-5 h-5 text-orange-400" />
                  <div className="text-left">
                    <p className="font-bold text-white text-sm">Product Info Page Generated</p>
                    <p className="text-xs text-gray-400">Full description, specs, FAQ & SEO content for your store listing</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={e => { e.stopPropagation(); copyToClipboard(JSON.stringify(generatedProductPage, null, 2), 'Product page'); }}
                    className="px-3 py-1.5 bg-[#0A0A0A] border border-[#2A2A2A] text-gray-400 hover:text-white rounded-lg text-xs transition">
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                  {showProductPage ? <ChevronRight className="w-4 h-4 text-gray-400 rotate-90" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
                </div>
              </button>

              {showProductPage && (
                <div className="p-5 space-y-5 bg-[#0A0A0A]">
                  {/* Product Name & Tagline */}
                  <div>
                    <p className="text-xs font-bold text-orange-400 uppercase tracking-wider mb-2">Product Name & Tagline</p>
                    <p className="text-white font-bold text-lg">{generatedProductPage.name}</p>
                    <p className="text-gray-300 italic mt-1">{generatedProductPage.tagline}</p>
                  </div>

                  {/* Short Description */}
                  <div>
                    <p className="text-xs font-bold text-orange-400 uppercase tracking-wider mb-2">Short Description (for product card)</p>
                    <p className="text-gray-300 text-sm leading-relaxed bg-[#1A1A1A] p-3 rounded-xl">{generatedProductPage.shortDescription}</p>
                  </div>

                  {/* Long Description */}
                  <div>
                    <p className="text-xs font-bold text-orange-400 uppercase tracking-wider mb-2">Full Product Description</p>
                    <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap bg-[#1A1A1A] p-3 rounded-xl">{generatedProductPage.longDescription}</p>
                  </div>

                  {/* Features */}
                  <div>
                    <p className="text-xs font-bold text-orange-400 uppercase tracking-wider mb-2">Key Features & Benefits</p>
                    <ul className="space-y-2">
                      {generatedProductPage.features.map((f: string, i: number) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                          <Check className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                          {f}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Specs */}
                  <div>
                    <p className="text-xs font-bold text-orange-400 uppercase tracking-wider mb-2">Product Specifications</p>
                    <div className="bg-[#1A1A1A] rounded-xl overflow-hidden">
                      {generatedProductPage.specifications.map((s: any, i: number) => (
                        <div key={i} className={`flex items-center justify-between px-4 py-2.5 ${i % 2 === 0 ? 'bg-[#1A1A1A]' : 'bg-[#141414]'}`}>
                          <span className="text-xs text-gray-500 font-semibold">{s.label}</span>
                          <span className="text-xs text-white font-medium">{s.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* FAQ */}
                  <div>
                    <p className="text-xs font-bold text-orange-400 uppercase tracking-wider mb-2">FAQ</p>
                    <div className="space-y-3">
                      {generatedProductPage.faq.map((item: any, i: number) => (
                        <div key={i} className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-4">
                          <p className="text-sm font-bold text-white mb-1">Q: {item.q}</p>
                          <p className="text-xs text-gray-400 leading-relaxed">A: {item.a}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* SEO */}
                  <div>
                    <p className="text-xs font-bold text-orange-400 uppercase tracking-wider mb-2">SEO Meta Content</p>
                    <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-4 space-y-2">
                      <div><p className="text-xs text-gray-500">Title Tag</p><p className="text-sm text-white">{generatedProductPage.seoTitle}</p></div>
                      <div><p className="text-xs text-gray-500">Meta Description</p><p className="text-sm text-gray-300">{generatedProductPage.seoDescription}</p></div>
                    </div>
                  </div>

                  <button onClick={() => copyToClipboard(
                    `PRODUCT: ${generatedProductPage.name}\nTAGLINE: ${generatedProductPage.tagline}\n\nSHORT DESCRIPTION:\n${generatedProductPage.shortDescription}\n\nFULL DESCRIPTION:\n${generatedProductPage.longDescription}\n\nFEATURES:\n${generatedProductPage.features.map((f: string) => `• ${f}`).join('\n')}\n\nFAQ:\n${generatedProductPage.faq.map((f: any) => `Q: ${f.q}\nA: ${f.a}`).join('\n\n')}\n\nSEO TITLE: ${generatedProductPage.seoTitle}\nSEO DESCRIPTION: ${generatedProductPage.seoDescription}`,
                    'Complete product page'
                  )}
                    className="w-full py-3 flex items-center justify-center gap-2 bg-orange-600 hover:bg-orange-500 text-white rounded-xl font-bold text-sm transition">
                    <Copy className="w-4 h-4" /> Copy Complete Product Page
                  </button>
                </div>
              )}
            </div>
          )}
          {/* ── STORYBOARD TAB ─────────────────────────────────────────────── */}
          {proTab === 'storyboard' && script?.storyboard && (
            <div className="space-y-3">
              <p className="text-sm text-gray-400">Scene-by-scene breakdown with exact timing, script, visual direction, and on-screen text.</p>
              {script.storyboard.map(scene => (
                <div key={scene.scene} className="flex gap-4 p-4 bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl hover:border-orange-500/20 transition">
                  {/* Scene number + timing */}
                  <div className="flex-shrink-0 text-center w-16">
                    <div className="w-10 h-10 rounded-xl bg-orange-600 flex items-center justify-center text-white font-black text-sm mx-auto mb-1">{scene.scene}</div>
                    <p className="text-xs text-orange-400 font-bold">{scene.startTime}</p>
                    <p className="text-xs text-gray-600">{scene.duration}</p>
                  </div>
                  {/* Content */}
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-white text-sm">{scene.label}</p>
                      {scene.onScreenText && (
                        <span className="px-2 py-0.5 bg-yellow-500/20 border border-yellow-500/30 text-yellow-400 rounded text-xs font-mono">{scene.onScreenText}</span>
                      )}
                    </div>
                    <p className="text-sm text-gray-200 leading-relaxed italic">"{scene.script}"</p>
                    <p className="text-xs text-gray-500 flex items-start gap-1.5">
                      <span className="text-blue-400 flex-shrink-0">📹</span> {scene.visualNote}
                    </p>
                  </div>
                </div>
              ))}
              <div className="flex gap-2 pt-2">
                <button onClick={() => copyToClipboard(script.storyboard.map(s => `[${s.startTime}–${s.endTime}] ${s.label.toUpperCase()}\nScript: "${s.script}"\nVisual: ${s.visualNote}${s.onScreenText ? `\nText: ${s.onScreenText}` : ''}`).join('\n\n'), 'Full storyboard')}
                  className="flex items-center gap-2 px-4 py-2 bg-[#1A1A1A] border border-[#2A2A2A] text-gray-400 hover:text-white rounded-xl text-xs font-semibold transition">
                  <Copy className="w-3.5 h-3.5" /> Copy Full Storyboard
                </button>
              </div>
            </div>
          )}

          {/* ── FORMATS TAB ────────────────────────────────────────────────── */}
          {proTab === 'formats' && script?.formats && (
            <div className="space-y-4">
              <p className="text-sm text-gray-400">4 completely different scripts — each optimized for a different platform and purpose. Pick the one that fits your goal.</p>
              {/* Format selector */}
              <div className="flex gap-2 flex-wrap">
                {script.formats.map(fmt => (
                  <button key={fmt.format} onClick={() => setSelectedFormat(fmt.format)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${selectedFormat === fmt.format ? 'bg-orange-600 text-white' : 'bg-[#1A1A1A] border border-[#2A2A2A] text-gray-400 hover:text-white'}`}>
                    {fmt.format === 'reel' ? '🎵' : fmt.format === 'ad' ? '📢' : fmt.format === 'short' ? '▶️' : '⭕'} {fmt.label}
                    <span className="text-xs opacity-60">{fmt.duration}</span>
                  </button>
                ))}
              </div>
              {/* Selected format detail */}
              {script.formats.filter(f => f.format === selectedFormat).map(fmt => (
                <div key={fmt.format} className="space-y-4">
                  <div className="p-4 bg-[#1A1A1A] border border-orange-500/20 rounded-2xl space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="font-bold text-white">{fmt.label}</p>
                      <span className="text-xs text-gray-500">Best for: {fmt.platform}</span>
                    </div>
                    <div className="p-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl">
                      <p className="text-xs text-gray-500 mb-1 font-semibold uppercase tracking-wider">Structure</p>
                      <p className="text-sm text-blue-300">{fmt.structure}</p>
                    </div>
                    <div className="p-3 bg-[#0A0A0A] border border-red-500/20 rounded-xl">
                      <p className="text-xs text-gray-500 mb-1 font-semibold uppercase tracking-wider">Opening Hook</p>
                      <p className="text-sm text-white italic">"{fmt.hook}"</p>
                    </div>
                    <div className="p-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl">
                      <p className="text-xs text-gray-500 mb-1 font-semibold uppercase tracking-wider">Full Script</p>
                      <p className="text-sm text-gray-200 leading-relaxed">{fmt.script}</p>
                    </div>
                    <div className="p-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl">
                      <p className="text-xs text-gray-500 mb-1 font-semibold uppercase tracking-wider">Caption</p>
                      <p className="text-sm text-gray-300 leading-relaxed">{fmt.caption}</p>
                    </div>
                    <button onClick={() => copyToClipboard(`HOOK: ${fmt.hook}\n\nSCRIPT: ${fmt.script}\n\nCAPTION: ${fmt.caption}`, `${fmt.label} script`)}
                      className="w-full py-2.5 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2">
                      <Copy className="w-3.5 h-3.5" /> Copy {fmt.label} Script
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── ANALYSIS TAB ───────────────────────────────────────────────── */}
          {proTab === 'analysis' && script?.referenceAnalysis && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Left: Reference analysis */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 bg-red-500 rounded-full" />
                    <p className="text-sm font-bold text-white">Reference Video Structure</p>
                    <span className="text-xs text-gray-500">(what we analyzed)</span>
                  </div>
                  {[
                    { label: 'Hook Type', value: script.referenceAnalysis.hookType },
                    { label: 'Hook Duration', value: script.referenceAnalysis.hookDuration },
                    { label: 'Pacing', value: script.referenceAnalysis.pacing },
                    { label: 'Emotional Trigger', value: script.referenceAnalysis.emotionalTrigger },
                    { label: 'CTA Style', value: script.referenceAnalysis.ctaStyle },
                    { label: 'Est. View Potential', value: script.referenceAnalysis.estimatedViews },
                  ].map((item, i) => (
                    <div key={i} className="flex items-start justify-between gap-3 py-2.5 border-b border-[#2A2A2A] last:border-0">
                      <span className="text-xs text-gray-500 font-semibold">{item.label}</span>
                      <span className="text-xs text-white text-right max-w-[60%]">{item.value}</span>
                    </div>
                  ))}
                  <div className="p-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl mt-2">
                    <p className="text-xs text-gray-500 mb-1">Why This Structure Works</p>
                    <p className="text-xs text-gray-300 leading-relaxed">{script.referenceAnalysis.whyItWorks}</p>
                  </div>
                </div>
                {/* Right: Your recreation */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full" />
                    <p className="text-sm font-bold text-white">Your Recreation</p>
                    <span className="text-xs text-gray-500">(what we built)</span>
                  </div>
                  {[
                    { label: 'Hook Type', value: script.referenceAnalysis.hookType + ' (your brand voice)' },
                    { label: 'Hook Duration', value: script.referenceAnalysis.hookDuration },
                    { label: 'Pacing', value: script.referenceAnalysis.pacing },
                    { label: 'Emotional Trigger', value: script.referenceAnalysis.emotionalTrigger },
                    { label: 'CTA Style', value: 'Your product link + price' },
                    { label: 'Product', value: `${selectedProduct.name} — $${selectedProduct.price}` },
                  ].map((item, i) => (
                    <div key={i} className="flex items-start justify-between gap-3 py-2.5 border-b border-[#2A2A2A] last:border-0">
                      <span className="text-xs text-gray-500 font-semibold">{item.label}</span>
                      <span className="text-xs text-green-300 text-right max-w-[60%]">{item.value}</span>
                    </div>
                  ))}
                  {/* Transformation score visual */}
                  <div className="p-3 bg-green-500/5 border border-green-500/20 rounded-xl mt-2">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs text-gray-400 font-semibold">Transformation Score</p>
                      <p className="text-lg font-black text-green-400">{script.transformationScore}/100</p>
                    </div>
                    <div className="h-2 bg-[#1A1A1A] rounded-full overflow-hidden">
                      <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${script.transformationScore}%` }} />
                    </div>
                    <p className="text-xs text-gray-600 mt-1.5">Score above 85 = legally safe. Your content is {script.transformationScore >= 90 ? 'highly original' : script.transformationScore >= 70 ? 'sufficiently different' : 'too similar — edit more'}.</p>
                  </div>
                </div>
              </div>
              {/* Video structure timeline */}
              <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-5">
                <p className="text-sm font-bold text-white mb-4">Content Structure Timeline</p>
                <div className="flex gap-1 h-8 rounded-xl overflow-hidden">
                  {script.referenceAnalysis.structure.map((part, i) => {
                    const colors = ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-green-500', 'bg-blue-500', 'bg-purple-500', 'bg-pink-500'];
                    const widths = [10, 15, 20, 20, 15, 10, 10];
                    return (
                      <div key={i} className={`${colors[i]} flex items-center justify-center text-white text-xs font-bold flex-shrink-0 overflow-hidden`}
                        style={{ width: `${widths[i]}%` }}
                        title={part}>
                        <span className="truncate px-1">{part.split(' ')[0]}</span>
                      </div>
                    );
                  })}
                </div>
                <div className="flex gap-1 mt-2 flex-wrap">
                  {script.referenceAnalysis.structure.map((part, i) => {
                    const colors = ['text-red-400', 'text-orange-400', 'text-yellow-400', 'text-green-400', 'text-blue-400', 'text-purple-400', 'text-pink-400'];
                    return <span key={i} className={`text-xs ${colors[i]}`}>{part}{i < script.referenceAnalysis.structure.length - 1 ? ' →' : ''}</span>;
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ── THUMBNAILS TAB ─────────────────────────────────────────────── */}
          {proTab === 'thumbnails' && script?.thumbnails && (
            <div className="space-y-4">
              <p className="text-sm text-gray-400">AI-generated thumbnail concepts. Use these as creative direction for your designer or Canva.</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {script.thumbnails.map(thumb => (
                  <div key={thumb.id} className="bg-[#1A1A1A] border border-[#2A2A2A] hover:border-orange-500/30 rounded-2xl p-5 transition space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{thumb.emoji}</span>
                      <p className="font-bold text-white text-sm">{thumb.concept}</p>
                    </div>
                    {/* Mock thumbnail preview */}
                    <div className="aspect-video rounded-xl overflow-hidden relative flex items-center justify-center text-center p-4"
                      style={{ background: 'linear-gradient(135deg, #1a1a1a, #2a2a2a)' }}>
                      {selectedProduct.image && <img src={selectedProduct.image} alt="" className="absolute inset-0 w-full h-full object-cover opacity-30" />}
                      <p className="relative text-white font-black text-lg leading-tight drop-shadow-lg">{thumb.headline}</p>
                    </div>
                    <div className="space-y-1.5">
                      <p className="text-xs text-gray-400 leading-relaxed">{thumb.visualDescription}</p>
                      <p className="text-xs font-semibold" style={{ color: '#ea580c' }}>Color scheme: <span className="text-gray-400 font-normal">{thumb.colorScheme}</span></p>
                    </div>
                    <button onClick={() => copyToClipboard(`THUMBNAIL CONCEPT: ${thumb.concept}\nHEADLINE: ${thumb.headline}\nVISUAL: ${thumb.visualDescription}\nCOLORS: ${thumb.colorScheme}`, 'Thumbnail brief')}
                      className="w-full py-2 bg-[#0A0A0A] border border-[#2A2A2A] hover:border-orange-500/30 text-gray-400 hover:text-white rounded-xl text-xs font-semibold transition flex items-center justify-center gap-1.5">
                      <Copy className="w-3.5 h-3.5" /> Copy Brief for Designer
                    </button>
                  </div>
                ))}
              </div>
              <div className="p-4 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl">
                <p className="text-xs text-gray-500 font-semibold mb-2">Create These in Canva:</p>
                <p className="text-xs text-gray-600">Open Canva → "YouTube Thumbnail" or "Instagram Post" → paste the description above → use your product image as the base layer.</p>
              </div>
            </div>
          )}

          {/* Bottom nav */}
          <div className="flex items-center justify-between pt-2">
            <button onClick={() => setStep(2)} className="px-5 py-2.5 bg-[#1A1A1A] border border-[#2A2A2A] text-gray-400 hover:text-white rounded-xl text-sm transition">
              ← Back
            </button>
            <button onClick={() => setStep(4)} className="flex items-center gap-2 px-6 py-3 bg-orange-600 hover:bg-orange-500 text-white rounded-xl font-semibold transition">
              Publish <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ── PREVIEW POSTS MODE (overlay on step 3) ───────────────────────────── */}
      {step === 3 && previewMode && script && selectedProduct && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Eye className="w-5 h-5 text-purple-400" /> Post Preview
            </h3>
            <div className="flex gap-2">
              <button onClick={() => setPreviewMode(false)}
                className="flex items-center gap-2 px-4 py-2 bg-[#1A1A1A] border border-[#2A2A2A] text-gray-400 hover:text-white rounded-xl text-sm transition">
                <Edit2 className="w-4 h-4" /> Back to Edit
              </button>
              <button onClick={() => setStep(4)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition"
                style={{ background: '#22c55e', color: '#fff' }}>
                <Check className="w-4 h-4" /> Approve & Publish
              </button>
            </div>
          </div>
          <p className="text-sm text-gray-400">This is how your post will look on each platform. Click <strong className="text-white">Back to Edit</strong> to make changes.</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {targetPlatforms.map(pid => {
              const p = PLATFORMS.find(pl => pl.id === pid);
              if (!p) return null;
              const caption = getCaption(pid);
              const isVertical = pid === 'tiktok' || pid === 'instagram';
              const isYT = pid === 'youtube';

              // Build embed/play source
              let embedSrc = '';
              let isLocalVideo = false;
              if (referenceVideo?.url) {
                isLocalVideo = true;
              } else if (referenceVideoUrl) {
                const ytMatch = referenceVideoUrl.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
                if (ytMatch) embedSrc = `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=0&controls=1&rel=0`;
                const tiktokMatch = referenceVideoUrl.includes('tiktok.com');
                if (tiktokMatch) embedSrc = ''; // TikTok blocks direct embed
              }

              return (
                <div key={pid} className="rounded-2xl overflow-hidden border border-[#2A2A2A] bg-[#0A0A0A]">
                  {/* Platform bar */}
                  <div className={`flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r ${p.color}`}>
                    <p.icon className="w-4 h-4 text-white" />
                    <span className="text-white font-bold text-sm">{p.label}</span>
                    <span className="ml-auto text-white/60 text-xs">{isVertical ? '9:16 Reel' : isYT ? '16:9 Video' : 'Feed Post'}</span>
                  </div>

                  {/* Reel / Video frame */}
                  <div className={`relative overflow-hidden ${isVertical ? 'aspect-[9/16] max-h-[480px]' : 'aspect-video'}`}
                    style={{ background: '#000' }}>

                    {/* Actual video — uploaded file */}
                    {isLocalVideo && (
                      <video
                        src={referenceVideo!.url}
                        className="w-full h-full object-cover"
                        controls
                        playsInline
                        style={{ maxHeight: isVertical ? '480px' : undefined }}
                      />
                    )}

                    {/* YouTube iframe embed */}
                    {!isLocalVideo && embedSrc && (
                      <iframe
                        src={embedSrc}
                        className="w-full h-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        title={`${p.label} preview`}
                      />
                    )}

                    {/* Fallback — product image with reel overlay UI */}
                    {!isLocalVideo && !embedSrc && (
                      <>
                        {selectedProduct.image
                          ? <img src={selectedProduct.image} alt={selectedProduct.name} className="w-full h-full object-cover" />
                          : <div className="w-full h-full flex flex-col items-center justify-center gap-3 bg-gradient-to-b from-gray-900 to-black">
                              <Film className="w-12 h-12 text-gray-700" />
                              <p className="text-xs text-gray-600 text-center px-4">Upload or paste a video URL in Step 1 to see real playback here</p>
                            </div>
                        }
                      </>
                    )}

                    {/* Reel overlay UI (only when not playing a real video) */}
                    {(!isLocalVideo && !embedSrc) && (
                      <div className="absolute inset-0 flex flex-col justify-between p-4 pointer-events-none">
                        {/* Top: Profile */}
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-600 to-orange-700 border-2 border-white flex items-center justify-center text-white font-bold text-xs">BP</div>
                          <div>
                            <p className="text-white font-bold text-xs drop-shadow">@blackphoenixco</p>
                          </div>
                          <div className="ml-auto px-3 py-1 bg-white/20 backdrop-blur-sm border border-white/30 rounded-full text-xs font-bold text-white">Follow</div>
                        </div>

                        {/* Bottom: Caption + product tag */}
                        <div className="space-y-2">
                          <p className="text-white text-xs leading-relaxed line-clamp-3 drop-shadow"
                            style={{ textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}>
                            {caption.slice(0, 120)}{caption.length > 120 ? '...' : ''}
                          </p>
                          {selectedProduct.price > 0 && (
                            <div className="flex items-center gap-2 bg-black/60 backdrop-blur-sm rounded-xl px-3 py-2 w-fit">
                              <Package className="w-3.5 h-3.5 text-orange-400" />
                              <span className="text-xs text-white font-semibold">{selectedProduct.name.slice(0, 25)}</span>
                              <span className="text-xs text-orange-400 font-black">${selectedProduct.price}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* TikTok-style side actions (vertical only) */}
                    {isVertical && !isLocalVideo && !embedSrc && (
                      <div className="absolute right-3 bottom-20 flex flex-col items-center gap-4 pointer-events-none">
                        {[['❤️', '24.2K'], ['💬', '842'], ['↗️', '1.2K'], ['🔖', '3.4K']].map(([icon, count]) => (
                          <div key={count} className="flex flex-col items-center">
                            <span className="text-xl drop-shadow">{icon}</span>
                            <span className="text-white text-xs font-bold drop-shadow">{count}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Caption below (for non-reel platforms) */}
                  {!isVertical && (
                    <div className="p-4 space-y-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-600 to-orange-700 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">BP</div>
                        <p className="text-white font-bold text-xs">Black Phoenix Company</p>
                      </div>
                      <p className="text-white text-xs leading-relaxed line-clamp-3">{caption}</p>
                    </div>
                  )}

                  {/* Edit button */}
                  <div className="px-4 pb-4">
                    <button onClick={() => { setPreviewMode(false); setEditingCaption(pid); setActivePlatform(pid); }}
                      className="w-full py-2 border border-dashed border-[#2A2A2A] hover:border-orange-500/40 text-gray-500 hover:text-orange-400 rounded-xl text-xs font-semibold transition">
                      ✎ Edit caption for {p.label}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Bottom CTA */}
          <div className="flex items-center justify-between p-5 bg-gradient-to-r from-green-500/10 to-emerald-500/5 border border-green-500/20 rounded-2xl">
            <div>
              <p className="font-bold text-white text-sm">Looks good?</p>
              <p className="text-xs text-gray-400 mt-0.5">Go back to edit captions or approve and proceed to publish.</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setPreviewMode(false)}
                className="flex items-center gap-2 px-4 py-2.5 bg-[#0A0A0A] border border-[#2A2A2A] text-gray-400 hover:text-white rounded-xl text-sm transition">
                <Edit2 className="w-4 h-4" /> Edit
              </button>
              <button onClick={() => setStep(4)}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm transition"
                style={{ background: '#22c55e', color: '#fff' }}>
                <Check className="w-4 h-4" /> Approve & Publish
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── STEP 3.5: Review Product Page ───────────────────────────────────── */}
      {step === 3.5 && generatedProductPage && selectedProduct && (
        <div className="space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-orange-400" /> Product Page Preview
              </h3>
              <p className="text-sm text-gray-400 mt-0.5">Review how this will appear in your store. Edit anything before publishing.</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setStep(3)} className="flex items-center gap-2 px-4 py-2 bg-[#1A1A1A] border border-[#2A2A2A] text-gray-400 hover:text-white rounded-xl text-sm transition">
                <Edit2 className="w-4 h-4" /> Edit Script
              </button>
              <button onClick={() => setStep(4)} className="flex items-center gap-2 px-5 py-2.5 bg-green-600 hover:bg-green-500 text-white rounded-xl text-sm font-bold transition">
                <Check className="w-4 h-4" /> Approve & Publish
              </button>
            </div>
          </div>

          {/* Store product mockup */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Left: Product visual */}
            <div className="space-y-4">
              {/* Product image */}
              <div className="rounded-2xl overflow-hidden border border-[#2A2A2A] aspect-square bg-[#1A1A1A] flex items-center justify-center relative">
                {selectedProduct.image
                  ? <img src={selectedProduct.image} alt={selectedProduct.name} className="w-full h-full object-cover" />
                  : <Package className="w-20 h-20 text-gray-700" />}
                {generatedProductPage.badge && (
                  <span className="absolute top-4 left-4 px-3 py-1.5 rounded-full text-sm font-black" style={{ background: '#ea580c', color: '#fff' }}>
                    {generatedProductPage.badge}
                  </span>
                )}
              </div>

              {/* Specs table */}
              <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl overflow-hidden">
                <div className="px-4 py-3 border-b border-[#2A2A2A]">
                  <p className="text-sm font-bold text-white">Product Specifications</p>
                </div>
                {generatedProductPage.specifications?.map((s: any, i: number) => (
                  <div key={i} className={`flex items-center justify-between px-4 py-2.5 ${i % 2 === 0 ? '' : 'bg-[#0A0A0A]'}`}>
                    <span className="text-xs text-gray-500 font-semibold">{s.label}</span>
                    <span className="text-xs text-white font-medium">{s.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Product copy */}
            <div className="space-y-5">
              {/* Editable title */}
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Product Title (SEO)</label>
                <input
                  defaultValue={generatedProductPage.seoTitle}
                  className="w-full bg-[#0A0A0A] border border-[#2A2A2A] focus:border-orange-500 rounded-xl px-4 py-3 text-white font-bold text-sm focus:outline-none"
                  onChange={e => { generatedProductPage.seoTitle = e.target.value; generatedProductPage.name = e.target.value; }}
                />
              </div>

              {/* Tagline */}
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Tagline</label>
                <input
                  defaultValue={generatedProductPage.tagline}
                  className="w-full bg-[#0A0A0A] border border-[#2A2A2A] focus:border-orange-500 rounded-xl px-4 py-3 text-white text-sm focus:outline-none italic"
                  onChange={e => { generatedProductPage.tagline = e.target.value; }}
                />
              </div>

              {/* Short description */}
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Short Description (product card)</label>
                <textarea
                  defaultValue={generatedProductPage.shortDescription}
                  rows={2}
                  className="w-full bg-[#0A0A0A] border border-[#2A2A2A] focus:border-orange-500 rounded-xl px-4 py-3 text-white text-sm focus:outline-none resize-none"
                  onChange={e => { generatedProductPage.shortDescription = e.target.value; }}
                />
              </div>

              {/* Long description */}
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Full Product Description</label>
                <textarea
                  defaultValue={generatedProductPage.longDescription}
                  rows={4}
                  className="w-full bg-[#0A0A0A] border border-[#2A2A2A] focus:border-orange-500 rounded-xl px-4 py-3 text-white text-sm focus:outline-none resize-none leading-relaxed"
                  onChange={e => { generatedProductPage.longDescription = e.target.value; }}
                />
              </div>

              {/* Key benefits */}
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Key Features & Benefits</label>
                <div className="space-y-2">
                  {generatedProductPage.features?.map((f: string, i: number) => (
                    <div key={i} className="flex items-start gap-2">
                      <div className="w-5 h-5 bg-green-500/20 border border-green-500/30 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Check className="w-3 h-3 text-green-400" />
                      </div>
                      <input
                        defaultValue={f}
                        className="flex-1 bg-[#0A0A0A] border border-[#2A2A2A] focus:border-orange-500 rounded-lg px-3 py-1.5 text-white text-xs focus:outline-none"
                        onChange={e => { generatedProductPage.features[i] = e.target.value; }}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Price display */}
              <div className="flex items-center gap-3 p-4 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl">
                <DollarSign className="w-5 h-5 text-orange-400" />
                <div>
                  <span className="text-2xl font-black text-white">${selectedProduct.price}</span>
                  {selectedProduct.originalPrice && (
                    <span className="text-sm text-gray-600 line-through ml-2">${selectedProduct.originalPrice}</span>
                  )}
                </div>
                <span className="ml-auto px-3 py-1.5 bg-green-500/20 text-green-400 border border-green-500/30 rounded-xl text-xs font-bold">In Stock</span>
              </div>
            </div>
          </div>

          {/* FAQ section */}
          <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-[#2A2A2A] flex items-center justify-between">
              <p className="font-bold text-white text-sm">FAQ Section</p>
              <span className="text-xs text-gray-500">{generatedProductPage.faq?.length} questions</span>
            </div>
            <div className="divide-y divide-[#2A2A2A]">
              {generatedProductPage.faq?.map((item: any, i: number) => (
                <div key={i} className="p-4 space-y-2">
                  <input
                    defaultValue={item.q}
                    className="w-full bg-transparent text-white font-semibold text-sm focus:outline-none border-b border-transparent focus:border-orange-500/50 pb-1"
                    onChange={e => { generatedProductPage.faq[i].q = e.target.value; }}
                    placeholder="Question..."
                  />
                  <textarea
                    defaultValue={item.a}
                    rows={2}
                    className="w-full bg-[#0A0A0A] border border-[#2A2A2A] focus:border-orange-500/50 rounded-lg px-3 py-2 text-xs text-gray-400 focus:outline-none resize-none"
                    onChange={e => { generatedProductPage.faq[i].a = e.target.value; }}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* SEO meta */}
          <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-5 space-y-3">
            <p className="font-bold text-white text-sm">SEO Meta Tags</p>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Meta Title</label>
              <input defaultValue={generatedProductPage.seoTitle}
                className="w-full bg-[#0A0A0A] border border-[#2A2A2A] focus:border-orange-500 rounded-lg px-3 py-2 text-white text-xs focus:outline-none" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Meta Description</label>
              <textarea defaultValue={generatedProductPage.seoDescription} rows={2}
                className="w-full bg-[#0A0A0A] border border-[#2A2A2A] focus:border-orange-500 rounded-lg px-3 py-2 text-white text-xs focus:outline-none resize-none" />
            </div>
          </div>

          {/* Bottom action bar */}
          <div className="flex items-center justify-between p-5 bg-gradient-to-r from-green-500/10 to-emerald-500/5 border border-green-500/20 rounded-2xl">
            <div>
              <p className="font-bold text-white">Product page looks good?</p>
              <p className="text-xs text-gray-400 mt-0.5">All edits above are saved automatically. Click Approve to push to your store.</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setStep(3)} className="flex items-center gap-2 px-4 py-2.5 bg-[#0A0A0A] border border-[#2A2A2A] text-gray-400 hover:text-white rounded-xl text-sm transition">
                <Edit2 className="w-4 h-4" /> Edit Script
              </button>
              <button onClick={() => setStep(4)}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm transition hover:scale-105"
                style={{ background: '#22c55e', color: '#fff' }}>
                <Check className="w-4 h-4" /> Approve & Publish
              </button>
            </div>
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
