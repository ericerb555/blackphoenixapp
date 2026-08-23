/**
 * Ad Creator — Generate promotional ads for digital products.
 * Pick a product, choose a format (social post, email banner, promo card),
 * customize copy, pick a color theme, then export as PNG or copy as HTML.
 */
import { useState, useMemo, useRef, useEffect } from 'react';
import {
  Megaphone, Download, Copy, RefreshCw, Palette, Type,
  BookOpen, FileText, Calculator, BarChart3, Wrench, Layers,
  Star, CheckCircle, Shield, Zap, ChevronDown, ChevronUp,
  Package, Image, Layout, Smartphone, Monitor, Mail,
  ArrowRight, Gift, Clock, Tag, Home, TrendingUp, Bot,
  Eye, Share2, Sparkles, X, Plus,
} from 'lucide-react';
import { toast } from 'sonner';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { authedHeadersOrAnon } from "../utils/authHeaders";

const SERVER = `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6`;

// ─── Types ────────────────────────────────────────────────────────────────────

type ProductCategory = 'ebook' | 'template' | 'calculator' | 'ai_report' | 'maintenance' | 'bundle';
type AdFormat = 'social_square' | 'social_story' | 'email_banner' | 'promo_card' | 'wide_banner';
type AdTheme = 'dark' | 'orange' | 'violet' | 'teal' | 'green' | 'slate';

interface Product {
  id: string;
  category: ProductCategory;
  title: string;
  subtitle: string;
  price: number;
  originalPrice?: number;
  badge?: string;
  nhRelevant: boolean;
  popular?: boolean;
  fileTypes: string[];
  features: string[];
  audience: string[];
  visible: boolean;
  sortOrder: number;
}

const STORAGE_KEY = 'bp_mkt_products';

const CAT_ICON: Record<ProductCategory, any> = {
  ebook: BookOpen, template: FileText, calculator: Calculator,
  ai_report: BarChart3, maintenance: Wrench, bundle: Layers,
};

const CAT_LABEL: Record<ProductCategory, string> = {
  ebook: 'Ebook', template: 'Template Pack', calculator: 'Calculator',
  ai_report: 'AI Report', maintenance: 'Maintenance Kit', bundle: 'Bundle',
};

const FORMAT_OPTS: { id: AdFormat; label: string; icon: any; w: number; h: number; desc: string }[] = [
  { id: 'social_square', label: 'Social Square', icon: Image, w: 400, h: 400, desc: 'Instagram, Facebook post' },
  { id: 'social_story', label: 'Social Story', icon: Smartphone, w: 320, h: 568, desc: 'Instagram/FB Story' },
  { id: 'email_banner', label: 'Email Banner', icon: Mail, w: 600, h: 200, desc: 'Email header / newsletter' },
  { id: 'promo_card', label: 'Promo Card', icon: Layout, w: 400, h: 240, desc: 'Website, blog embed' },
  { id: 'wide_banner', label: 'Wide Banner', icon: Monitor, w: 728, h: 180, desc: 'Leaderboard ad, header' },
];

const THEMES: { id: AdTheme; label: string; bg: string; accent: string; text: string; sub: string; border: string }[] = [
  { id: 'dark',   label: 'Dark',   bg: '#0A0A0A', accent: '#ea580c', text: '#ffffff', sub: '#9ca3af', border: '#2A2A2A' },
  { id: 'orange', label: 'Orange', bg: '#ea580c', accent: '#fff',    text: '#ffffff', sub: '#fed7aa', border: '#c2410c' },
  { id: 'violet', label: 'Violet', bg: '#1e1b4b', accent: '#8b5cf6', text: '#ffffff', sub: '#a5b4fc', border: '#312e81' },
  { id: 'teal',   label: 'Teal',   bg: '#0f172a', accent: '#14b8a6', text: '#ffffff', sub: '#7dd3fc', border: '#1e293b' },
  { id: 'green',  label: 'Green',  bg: '#052e16', accent: '#22c55e', text: '#ffffff', sub: '#86efac', border: '#14532d' },
  { id: 'slate',  label: 'Slate',  bg: '#f8fafc', accent: '#ea580c', text: '#0f172a', sub: '#475569', border: '#e2e8f0' },
];

const CTA_OPTIONS = [
  'Get Instant Access', 'Download Now', 'Buy Now', 'Start Today',
  'Claim Your Copy', 'Shop Now', 'Learn More', 'Get Started',
  'View Details', 'Save Today',
];

const HEADLINE_TEMPLATES = [
  (t: string) => t,
  (t: string) => `Introducing: ${t}`,
  (t: string) => `New from Black Phoenix: ${t}`,
  (t: string) => `NH Property Owners Need This: ${t}`,
  (t: string) => `Now Available: ${t}`,
];

const TAGLINE_TEMPLATES = [
  (s: string) => s,
  (_: string) => 'NH-specific resources for property owners, landlords & condo boards.',
  (_: string) => 'Instant download. 30-day guarantee. Built for New Hampshire.',
  (s: string) => `${s} — Instant download, NH-specific.`,
  (_: string) => 'Trusted by NH property professionals.',
];

function fmt(cents: number) { return `$${(cents / 100).toFixed(0)}`; }

// ─── Ad Preview ───────────────────────────────────────────────────────────────

function AdPreview({ product, format, theme, headline, tagline, cta, showBadge, showFeatures, discount }: {
  product: Product;
  format: typeof FORMAT_OPTS[0];
  theme: typeof THEMES[0];
  headline: string;
  tagline: string;
  cta: string;
  showBadge: boolean;
  showFeatures: boolean;
  discount: string;
}) {
  const Icon = CAT_ICON[product.category];
  const scale = Math.min(1, 560 / format.w);
  const isWide = format.w > format.h;
  const isStory = format.h > format.w;
  const isEmailBanner = format.id === 'email_banner';
  const isWideBanner = format.id === 'wide_banner';

  return (
    <div style={{ transform: `scale(${scale})`, transformOrigin: 'top center', width: format.w, height: format.h }} className="relative overflow-hidden rounded-2xl shadow-2xl flex-shrink-0">
      {/* Background */}
      <div style={{ background: theme.bg, borderColor: theme.border, width: format.w, height: format.h }}
        className="absolute inset-0 border-2 flex flex-col overflow-hidden">

        {/* Wide banner / email banner layout */}
        {(isEmailBanner || isWideBanner) ? (
          <div className="flex items-center h-full px-8 gap-8">
            {/* Icon */}
            <div style={{ background: theme.accent + '22', borderColor: theme.accent + '55', minWidth: 56, height: 56 }}
              className="rounded-2xl border-2 flex items-center justify-center flex-shrink-0">
              <Icon style={{ color: theme.accent }} className="w-7 h-7" />
            </div>
            {/* Content */}
            <div className="flex-1 min-w-0">
              {showBadge && product.badge && (
                <div style={{ background: theme.accent, color: theme.bg }} className="inline-block text-xs font-black px-2 py-0.5 rounded mb-1">
                  {product.badge}
                </div>
              )}
              <p style={{ color: theme.text, fontSize: Math.min(18, format.w / 22) }} className="font-black leading-tight truncate">{headline}</p>
              <p style={{ color: theme.sub, fontSize: Math.min(11, format.w / 38) }} className="mt-0.5 truncate">{tagline}</p>
            </div>
            {/* Price + CTA */}
            <div className="flex items-center gap-4 flex-shrink-0">
              <div className="text-right">
                <p style={{ color: theme.accent, fontSize: 22 }} className="font-black">{fmt(product.price)}</p>
                {product.originalPrice && <p style={{ color: theme.sub, fontSize: 11 }} className="line-through">{fmt(product.originalPrice)}</p>}
                {discount && <p style={{ color: '#22c55e', fontSize: 11 }} className="font-bold">{discount}</p>}
              </div>
              <div style={{ background: theme.accent, color: theme.id === 'orange' ? theme.bg : '#fff', fontSize: 12 }}
                className="px-4 py-2 rounded-xl font-bold flex items-center gap-1 whitespace-nowrap">
                {cta} <ArrowRight className="w-3 h-3" />
              </div>
            </div>
          </div>
        ) : (
          /* Square / Story / Promo Card layout */
          <div className="flex flex-col h-full p-6">
            {/* Top row */}
            <div className="flex items-start justify-between mb-4">
              <div style={{ background: theme.accent + '22', borderColor: theme.accent + '55', width: 48, height: 48 }}
                className="rounded-2xl border-2 flex items-center justify-center flex-shrink-0">
                <Icon style={{ color: theme.accent }} className="w-6 h-6" />
              </div>
              {showBadge && product.badge && (
                <div style={{ background: theme.accent, color: theme.id === 'orange' ? theme.bg : '#fff' }} className="text-xs font-black px-2.5 py-1 rounded-full">
                  {product.badge}
                </div>
              )}
            </div>

            {/* Headline */}
            <p style={{ color: theme.text, fontSize: isStory ? 20 : 16, lineHeight: 1.25 }} className="font-black mb-2 flex-shrink-0">
              {headline}
            </p>

            {/* Tagline */}
            <p style={{ color: theme.sub, fontSize: isStory ? 12 : 11 }} className="mb-4 leading-relaxed line-clamp-2 flex-shrink-0">
              {tagline}
            </p>

            {/* Features */}
            {showFeatures && !isEmailBanner && !isWideBanner && (
              <div className="flex-1 space-y-1.5 overflow-hidden mb-4">
                {product.features.slice(0, isStory ? 4 : 3).map((f, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <CheckCircle style={{ color: theme.accent, minWidth: 12 }} className="w-3 h-3 mt-0.5" />
                    <p style={{ color: theme.sub, fontSize: 10 }} className="leading-snug line-clamp-1">{f}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Bottom price + CTA */}
            <div className="flex items-center justify-between mt-auto">
              <div>
                <p style={{ color: theme.accent, fontSize: isStory ? 28 : 22 }} className="font-black">{fmt(product.price)}</p>
                {product.originalPrice && <p style={{ color: theme.sub, fontSize: 10 }} className="line-through">{fmt(product.originalPrice)}</p>}
                {discount && <p style={{ color: '#22c55e', fontSize: 10 }} className="font-bold">{discount}</p>}
              </div>
              <div style={{ background: theme.accent, color: theme.id === 'orange' ? theme.bg : '#fff', fontSize: isStory ? 13 : 11 }}
                className="px-4 py-2.5 rounded-xl font-bold flex items-center gap-1.5">
                {cta} <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </div>

            {/* Branding footer */}
            <div style={{ borderTopColor: theme.border }} className="border-t mt-3 pt-3 flex items-center justify-between">
              <p style={{ color: theme.sub, fontSize: 9 }} className="font-semibold uppercase tracking-wider">Black Phoenix Property Services · NH</p>
              <p style={{ color: theme.sub, fontSize: 9 }}>blackphoenixapp.com/store</p>
            </div>
          </div>
        )}

        {/* Email banner branding footer */}
        {(isEmailBanner || isWideBanner) && (
          <div style={{ background: theme.border, position: 'absolute', bottom: 0, left: 0, right: 0, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingLeft: 16, paddingRight: 16 }}>
            <p style={{ color: theme.sub, fontSize: 8 }} className="font-semibold uppercase tracking-wider">Black Phoenix Property Services · NH</p>
            <p style={{ color: theme.sub, fontSize: 8 }}>blackphoenixapp.com/store</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Generated Copy Panel ─────────────────────────────────────────────────────

function CopyPanel({ product, cta }: { product: Product; cta: string }) {
  function copy(text: string) {
    navigator.clipboard.writeText(text).then(() => toast.success('Copied!'));
  }

  const posts = [
    {
      label: 'Facebook/LinkedIn Post',
      text: `📋 New from Black Phoenix: "${product.title}"\n\n${product.subtitle}\n\nNH-specific content built for property owners, landlords, and condo boards.\n\n✅ ${product.features.slice(0, 3).join('\n✅ ')}\n\n💵 Only ${fmt(product.price)} — Instant download. 30-day guarantee.\n\n👉 ${cta}: blackphoenixapp.com/store`,
    },
    {
      label: 'Instagram Caption',
      text: `${product.title} is now available in our digital store 🏠\n\n${product.subtitle}\n\nBuilt specifically for New Hampshire property owners — this ${CAT_LABEL[product.category].toLowerCase()} covers everything you need to know.\n\n${fmt(product.price)} · Instant download · 30-day guarantee\n\nLink in bio → blackphoenixapp.com/store\n\n#NHrealestate #NewHampshire #PropertyManagement #Landlord #HomeOwner #BlackPhoenix`,
    },
    {
      label: 'Email Subject Lines',
      text: `Option 1: New: ${product.title} — Now Available\nOption 2: Your NH property toolkit just got bigger\nOption 3: [New Resource] ${product.subtitle}\nOption 4: ${fmt(product.price)} — Instant Access to ${product.title}`,
    },
    {
      label: 'Email Body Snippet',
      text: `Hi [First Name],\n\nWe just added a new resource to our digital store:\n\n📄 ${product.title}\n${product.subtitle}\n\nThis ${CAT_LABEL[product.category].toLowerCase()} is written specifically for New Hampshire and covers:\n• ${product.features.slice(0, 3).join('\n• ')}\n\nPrice: ${fmt(product.price)} — one-time purchase, instant download.\n\n${cta}: https://blackphoenixapp.com/store\n\nQuestions? Reply to this email.\n\n— The Black Phoenix Team`,
    },
    {
      label: 'SMS / Text Message',
      text: `New from Black Phoenix: ${product.title} — ${product.subtitle}. Only ${fmt(product.price)}, instant download. Shop now: blackphoenixapp.com/store`,
    },
  ];

  return (
    <div className="space-y-4">
      {posts.map(({ label, text }) => (
        <div key={label} className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#2A2A2A]">
            <p className="text-xs font-semibold text-gray-300">{label}</p>
            <button onClick={() => copy(text)}
              className="flex items-center gap-1.5 px-2.5 py-1 bg-[#2A2A2A] hover:bg-[#3A3A3A] rounded text-xs text-gray-400 hover:text-white transition">
              <Copy className="w-3 h-3" /> Copy
            </button>
          </div>
          <pre className="px-4 py-3 text-xs text-gray-400 whitespace-pre-wrap leading-relaxed font-sans">{text}</pre>
        </div>
      ))}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

const DEFAULT_PRODUCTS: Product[] = [
  { id: 'eb-landlord-ops', category: 'ebook', title: 'NH Landlord Operations Manual', subtitle: 'The complete legal and operational guide for NH landlords', price: 2900, badge: 'BESTSELLER', nhRelevant: true, popular: true, fileTypes: ['PDF', 'EPUB'], features: ['RSA 540 compliance guide', 'NH tenant screening framework', 'Sample lease clauses', 'Security deposit rules', 'Eviction process flowchart'], audience: ['Landlords'], visible: true, sortOrder: 1 },
  { id: 'eb-condo-board', category: 'ebook', title: 'Condo Board Governance Handbook', subtitle: 'Run your NH association with legal confidence', price: 2400, nhRelevant: true, popular: true, fileTypes: ['PDF'], features: ['RSA 356-B plain-English guide', 'Board meeting templates', 'Fiduciary duty explained', 'Special assessment procedures', 'Reserve fund framework'], audience: ['Condo Boards'], visible: true, sortOrder: 2 },
  { id: 'tmpl-nh-lease', category: 'template', title: 'NH Lease Agreement Template Pack', subtitle: 'Attorney-reviewed, RSA 540-compliant lease templates', price: 4900, badge: 'TOP RATED', nhRelevant: true, popular: true, fileTypes: ['DOCX', 'PDF'], features: ['Standard 12-month lease', 'Month-to-month lease', 'Room rental agreement', 'Pet addendum', 'Security deposit receipt'], audience: ['Landlords'], visible: true, sortOrder: 6 },
  { id: 'calc-roi', category: 'calculator', title: 'Property ROI Calculator', subtitle: 'Analyze any investment in minutes', price: 3900, badge: 'INTERACTIVE', nhRelevant: true, popular: true, fileTypes: ['XLSX'], features: ['Cash-on-cash return model', 'Cap rate and NOI calculator', 'Mortgage amortization table', '10-year equity projection', 'Comparison tool'], audience: ['Real Estate Investors'], visible: true, sortOrder: 10 },
  { id: 'air-property-health', category: 'ai_report', title: 'AI Property Health Report', subtitle: 'A personalized property assessment powered by AI', price: 7900, badge: 'AI-POWERED', nhRelevant: true, popular: true, fileTypes: ['PDF'], features: ['AI-generated health score', 'System-by-system risk assessment', '90-day action plan', 'NH seasonal risk flags', 'Vendor recommendations'], audience: ['Homeowners'], visible: true, sortOrder: 14 },
  { id: 'bundle-landlord-starter', category: 'bundle', title: 'Landlord Starter Bundle', subtitle: 'Everything a new NH landlord needs — one price', price: 8900, originalPrice: 21000, badge: 'SAVE $121', nhRelevant: true, popular: true, fileTypes: ['PDF', 'DOCX'], features: ['NH Landlord Operations Manual', 'NH Lease Agreement Pack', 'Property Inspection Report', 'RSA 540 compliance guide', 'Instant download'], audience: ['Landlords'], visible: true, sortOrder: 19 },
  { id: 'bundle-pm-pro', category: 'bundle', title: 'Property Manager Pro Bundle', subtitle: 'The complete toolkit for professional property managers', price: 19900, originalPrice: 29700, badge: 'SAVE $100', nhRelevant: true, fileTypes: ['PDF', 'DOCX', 'XLSX'], features: ['Capital Planning Guide', 'Vendor Contract Pack', 'Property ROI Calculator', 'Annual Maintenance Planner', 'Instant download'], audience: ['Property Managers'], visible: true, sortOrder: 21 },
  { id: 'maint-nh-winter', category: 'maintenance', title: 'NH Winter Prep Package', subtitle: 'Get your property ready for New Hampshire winters', price: 3400, nhRelevant: true, popular: true, fileTypes: ['PDF'], features: ['47-item winterization checklist', 'Vendor call scheduling template', 'Emergency contact log', 'Storm response protocol', 'Eversource rebate checklist'], audience: ['Homeowners'], visible: true, sortOrder: 17 },
];

export default function AdCreator() {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [format, setFormat] = useState(FORMAT_OPTS[0]);
  const [theme, setTheme] = useState(THEMES[0]);
  const [headline, setHeadline] = useState('');
  const [tagline, setTagline] = useState('');
  const [cta, setCta] = useState('Get Instant Access');
  const [discount, setDiscount] = useState('');
  const [showBadge, setShowBadge] = useState(true);
  const [showFeatures, setShowFeatures] = useState(true);
  const [headlineTmpl, setHeadlineTmpl] = useState(0);
  const [taglineTmpl, setTaglineTmpl] = useState(0);
  const [activeTab, setActiveTab] = useState<'visual' | 'copy'>('visual');

  useEffect(() => {
    // Load the shared product catalog from the server (source of truth managed
    // in Marketplace Admin), falling back to the local cache, then defaults.
    (async () => {
      try {
        const res = await fetch(`${SERVER}/marketplace/products`, {
          headers: await authedHeadersOrAnon(publicAnonKey),
        });
        const data = await res.json();
        if (Array.isArray(data.products) && data.products.length > 0) {
          try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data.products)); } catch {}
          setProducts(data.products.filter((p: Product) => p.visible));
          return;
        }
      } catch (err) {
        console.error('AdCreator: failed to load products from server, using cache:', err);
      }
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        const list: Product[] = raw ? JSON.parse(raw) : DEFAULT_PRODUCTS;
        setProducts(list.filter(p => p.visible));
      } catch { setProducts(DEFAULT_PRODUCTS); }
    })();
  }, []);

  useEffect(() => {
    if (!selectedProduct) return;
    setHeadline(HEADLINE_TEMPLATES[headlineTmpl](selectedProduct.title));
    setTagline(TAGLINE_TEMPLATES[taglineTmpl](selectedProduct.subtitle));
  }, [selectedProduct, headlineTmpl, taglineTmpl]);

  function randomize() {
    const hi = Math.floor(Math.random() * HEADLINE_TEMPLATES.length);
    const ti = Math.floor(Math.random() * TAGLINE_TEMPLATES.length);
    const ci = Math.floor(Math.random() * CTA_OPTIONS.length);
    const thmi = Math.floor(Math.random() * THEMES.length);
    setHeadlineTmpl(hi);
    setTaglineTmpl(ti);
    setCta(CTA_OPTIONS[ci]);
    setTheme(THEMES[thmi]);
    toast.success('Ad randomized!');
  }

  function copyAdHTML() {
    if (!selectedProduct) return;
    const th = theme;
    const html = `<div style="background:${th.bg};border:2px solid ${th.border};border-radius:16px;padding:24px;max-width:${format.w}px;font-family:sans-serif;">
  <p style="color:${th.accent};font-size:20px;font-weight:900;margin:0 0 8px">${headline}</p>
  <p style="color:${th.sub};font-size:13px;margin:0 0 16px">${tagline}</p>
  <p style="color:${th.accent};font-size:28px;font-weight:900;margin:0 0 12px">${fmt(selectedProduct.price)}</p>
  <a href="https://blackphoenixapp.com/store" style="display:inline-block;background:${th.accent};color:#fff;padding:10px 20px;border-radius:10px;font-weight:700;text-decoration:none;font-size:13px">${cta} →</a>
</div>`;
    navigator.clipboard.writeText(html).then(() => toast.success('HTML copied to clipboard!'));
  }

  const formatScale = Math.min(1, 560 / format.w);
  const previewH = format.h * formatScale + 40;

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      {/* Header */}
      <div className="border-b border-[#1A1A1A] bg-[#111] px-6 py-5">
        <div className="max-w-7xl mx-auto flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-black text-white flex items-center gap-2">
              <Megaphone className="w-5 h-5 text-orange-400" /> Ad Creator
            </h1>
            <p className="text-sm text-gray-400 mt-0.5">Generate promotional ads and copy for your digital products</p>
          </div>
          {selectedProduct && (
            <div className="flex items-center gap-2">
              <button onClick={randomize}
                className="flex items-center gap-1.5 px-3 py-2 bg-[#1A1A1A] border border-[#2A2A2A] text-gray-400 hover:text-white rounded-lg text-sm transition">
                <Sparkles className="w-3.5 h-3.5" /> Randomize
              </button>
              <button onClick={copyAdHTML}
                className="flex items-center gap-1.5 px-3 py-2 bg-[#1A1A1A] border border-[#2A2A2A] text-gray-400 hover:text-white rounded-lg text-sm transition">
                <Copy className="w-3.5 h-3.5" /> Copy HTML
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-8">
          {/* ── Controls Panel ─────────────────────────────────────────────── */}
          <div className="space-y-6">
            {/* Step 1: Pick Product */}
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">1. Select Product</p>
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {products.map(p => {
                  const Icon = CAT_ICON[p.category];
                  const isSelected = selectedProduct?.id === p.id;
                  return (
                    <button key={p.id} onClick={() => setSelectedProduct(p)}
                      className={`w-full text-left flex items-center gap-3 px-4 py-3 rounded-xl border transition ${isSelected ? 'border-orange-500 bg-orange-500/10' : 'border-[#2A2A2A] bg-[#1A1A1A] hover:border-[#3A3A3A]'}`}>
                      <Icon className={`w-4 h-4 flex-shrink-0 ${isSelected ? 'text-orange-400' : 'text-gray-400'}`} />
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-semibold truncate ${isSelected ? 'text-orange-300' : 'text-white'}`}>{p.title}</p>
                        <p className="text-xs text-gray-500">{fmt(p.price)} · {CAT_LABEL[p.category]}</p>
                      </div>
                      {isSelected && <CheckCircle className="w-4 h-4 text-orange-400 flex-shrink-0" />}
                    </button>
                  );
                })}
                {products.length === 0 && (
                  <p className="text-sm text-gray-500 text-center py-8">No products found. Add products in the Product Admin first.</p>
                )}
              </div>
            </div>

            {selectedProduct && (
              <>
                {/* Step 2: Format */}
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">2. Ad Format</p>
                  <div className="space-y-2">
                    {FORMAT_OPTS.map(f => {
                      const Icon = f.icon;
                      const isSelected = format.id === f.id;
                      return (
                        <button key={f.id} onClick={() => setFormat(f)}
                          className={`w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-lg border transition ${isSelected ? 'border-orange-500 bg-orange-500/10' : 'border-[#2A2A2A] bg-[#1A1A1A] hover:border-[#3A3A3A]'}`}>
                          <Icon className={`w-4 h-4 flex-shrink-0 ${isSelected ? 'text-orange-400' : 'text-gray-400'}`} />
                          <div className="flex-1">
                            <p className={`text-sm font-medium ${isSelected ? 'text-orange-300' : 'text-white'}`}>{f.label}</p>
                            <p className="text-xs text-gray-500">{f.desc} · {f.w}×{f.h}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Step 3: Theme */}
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">3. Color Theme</p>
                  <div className="grid grid-cols-3 gap-2">
                    {THEMES.map(t => (
                      <button key={t.id} onClick={() => setTheme(t)}
                        className={`flex flex-col items-center gap-1.5 p-2.5 rounded-lg border transition ${theme.id === t.id ? 'border-orange-500' : 'border-[#2A2A2A] hover:border-[#3A3A3A]'}`}>
                        <div className="w-full h-8 rounded-md" style={{ background: t.bg, border: `2px solid ${t.accent}` }} />
                        <p className="text-xs text-gray-400">{t.label}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Step 4: Copy */}
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">4. Customize Copy</p>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs text-gray-400 mb-1.5">Headline</label>
                      <div className="flex gap-2">
                        <input value={headline} onChange={e => setHeadline(e.target.value)}
                          className="flex-1 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500" />
                        <button onClick={() => setHeadlineTmpl((headlineTmpl + 1) % HEADLINE_TEMPLATES.length)}
                          className="px-2 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg text-gray-400 hover:text-white transition" title="Next template">
                          <RefreshCw className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1.5">Tagline</label>
                      <div className="flex gap-2">
                        <textarea value={tagline} onChange={e => setTagline(e.target.value)} rows={2}
                          className="flex-1 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500 resize-none" />
                        <button onClick={() => setTaglineTmpl((taglineTmpl + 1) % TAGLINE_TEMPLATES.length)}
                          className="px-2 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg text-gray-400 hover:text-white transition self-start mt-1" title="Next template">
                          <RefreshCw className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1.5">CTA Button</label>
                      <select value={cta} onChange={e => setCta(e.target.value)}
                        className="w-full bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500">
                        {CTA_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1.5">Promo Label (optional)</label>
                      <input value={discount} onChange={e => setDiscount(e.target.value)}
                        placeholder='e.g. "Use code NH20 for 20% off"'
                        className="w-full bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500 placeholder-gray-600" />
                    </div>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={showBadge} onChange={e => setShowBadge(e.target.checked)}
                          className="w-3.5 h-3.5 accent-orange-500" />
                        <span className="text-xs text-gray-300">Show badge</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={showFeatures} onChange={e => setShowFeatures(e.target.checked)}
                          className="w-3.5 h-3.5 accent-orange-500" />
                        <span className="text-xs text-gray-300">Show features</span>
                      </label>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* ── Preview + Output Panel ──────────────────────────────────────── */}
          <div className="space-y-6">
            {!selectedProduct ? (
              <div className="flex items-center justify-center h-96 bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl">
                <div className="text-center">
                  <Megaphone className="w-10 h-10 mx-auto mb-3 text-gray-600" />
                  <p className="text-gray-500 text-sm">Select a product to start designing your ad</p>
                </div>
              </div>
            ) : (
              <>
                {/* Tabs */}
                <div className="flex items-center gap-2 border-b border-[#2A2A2A] pb-0">
                  {(['visual', 'copy'] as const).map(tab => (
                    <button key={tab} onClick={() => setActiveTab(tab)}
                      className={`px-4 py-2.5 text-sm font-semibold transition border-b-2 -mb-px ${activeTab === tab ? 'border-orange-500 text-orange-400' : 'border-transparent text-gray-400 hover:text-white'}`}>
                      {tab === 'visual' ? '🎨 Visual Ad' : '✍️ Ad Copy'}
                    </button>
                  ))}
                </div>

                {activeTab === 'visual' && (
                  <div className="space-y-6">
                    {/* Preview */}
                    <div className="bg-[#111] border border-[#2A2A2A] rounded-2xl p-6 overflow-hidden">
                      <div className="flex items-center justify-between mb-4">
                        <p className="text-xs font-semibold text-gray-400">{format.label} Preview — {format.w}×{format.h}px</p>
                        <div className="flex items-center gap-1.5">
                          <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
                          <div className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
                          <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
                        </div>
                      </div>
                      <div style={{ height: previewH }} className="flex items-start justify-center overflow-hidden">
                        <AdPreview
                          product={selectedProduct}
                          format={format}
                          theme={theme}
                          headline={headline}
                          tagline={tagline}
                          cta={cta}
                          showBadge={showBadge}
                          showFeatures={showFeatures}
                          discount={discount}
                        />
                      </div>
                    </div>

                    {/* Export actions */}
                    <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-5">
                      <p className="text-sm font-semibold text-white mb-3">Export Options</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <button onClick={copyAdHTML}
                          className="flex items-center gap-2 px-4 py-3 bg-[#2A2A2A] hover:bg-[#3A3A3A] border border-[#3A3A3A] rounded-xl text-sm text-white font-medium transition">
                          <Copy className="w-4 h-4 text-orange-400" />
                          <div className="text-left">
                            <p className="font-semibold">Copy HTML</p>
                            <p className="text-xs text-gray-400">Paste into email or website</p>
                          </div>
                        </button>
                        <button onClick={() => { navigator.clipboard.writeText(`${headline}\n\n${tagline}\n\n${fmt(selectedProduct.price)} — ${cta}\n\nblackphoenixapp.com/store`); toast.success('Text copied!'); }}
                          className="flex items-center gap-2 px-4 py-3 bg-[#2A2A2A] hover:bg-[#3A3A3A] border border-[#3A3A3A] rounded-xl text-sm text-white font-medium transition">
                          <Type className="w-4 h-4 text-blue-400" />
                          <div className="text-left">
                            <p className="font-semibold">Copy Text</p>
                            <p className="text-xs text-gray-400">Headline + tagline + CTA</p>
                          </div>
                        </button>
                        <div className="flex items-center gap-2 px-4 py-3 bg-[#1A1A1A] border border-dashed border-[#2A2A2A] rounded-xl text-sm text-gray-500 col-span-full">
                          <Download className="w-4 h-4" />
                          <div>
                            <p className="font-medium text-gray-400">PNG Download</p>
                            <p className="text-xs">Coming soon — use browser screenshot for now</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* All format previews */}
                    <div>
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Preview All Formats</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        {FORMAT_OPTS.filter(f => f.id !== format.id).map(f => {
                          const sc = Math.min(0.45, 280 / f.w);
                          return (
                            <div key={f.id} onClick={() => setFormat(f)} className="cursor-pointer space-y-2">
                              <p className="text-xs text-gray-500">{f.label} ({f.w}×{f.h})</p>
                              <div style={{ height: f.h * sc + 10 }} className="overflow-hidden flex items-start">
                                <div style={{ transform: `scale(${sc})`, transformOrigin: 'top left', width: f.w, height: f.h }} className="flex-shrink-0">
                                  <AdPreview product={selectedProduct} format={f} theme={theme} headline={headline} tagline={tagline} cta={cta} showBadge={showBadge} showFeatures={showFeatures} discount={discount} />
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'copy' && (
                  <CopyPanel product={selectedProduct} cta={cta} />
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
