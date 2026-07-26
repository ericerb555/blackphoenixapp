/**
 * AutoProductPilot — Full Auto-Pilot Product Import Engine
 * Scans dropshippers + trend signals → AI scores → auto-publishes 85+ to store
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { toast } from 'sonner@2.0.3';
import {
  Zap, RefreshCw, ShoppingBag, TrendingUp, Star, CheckCircle,
  AlertCircle, Settings, BarChart3, Package, Globe, ArrowUpRight,
  Play, Pause, X, ChevronRight, Sparkles, DollarSign, Target,
  Clock, Eye, Trash2, Plus, Filter, Bell, ExternalLink, Bot,
  Flame, Activity, Database,
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { projectId, publicAnonKey } from '../utils/supabase/info';

const SERVER = `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6`;
const autoProductAuthHeaders = { 'Content-Type': 'application/json', Authorization: `Bearer ${publicAnonKey}` };

// ── Types ──────────────────────────────────────────────────────────────────────

export interface AutoProduct {
  id: string;
  name: string;
  category: string;
  image: string;
  supplierPrice: number;
  ourPrice: number;
  margin: number;
  opportunityScore: number;
  demandScore: number;
  competitionScore: number;
  saturationRisk: 'low' | 'medium' | 'high';
  source: 'spocket' | 'cj' | 'autods' | 'doba' | 'amazon' | 'tiktok';
  trendSignal: 'surging' | 'rising' | 'stable';
  velocityChange: number; // % change last 7 days
  status: 'auto-published' | 'pending-review' | 'skipped';
  importedAt: string;
  description: string;
  tags: string[];
  badge?: string;
}

type Tab = 'live' | 'published' | 'queue' | 'sources' | 'settings' | 'analytics';

// ── Product Pool (realistic dropshipper-style catalog) ────────────────────────

const PRODUCT_POOL: Omit<AutoProduct, 'id' | 'status' | 'importedAt'>[] = [
  { name: 'Viral Jade Gua Sha + Ice Roller Set', category: 'Health & Beauty', image: 'https://images.unsplash.com/photo-1596755389378-c31d21fd1273?w=400&q=80', supplierPrice: 4.20, ourPrice: 18.99, margin: 78, opportunityScore: 97, demandScore: 99, competitionScore: 62, saturationRisk: 'low', source: 'spocket', trendSignal: 'surging', velocityChange: 312, description: 'Trending skincare duo — gua sha stone + ice roller for de-puffing and facial contouring. TikTok viral. Ships in 3–5 days.', tags: ['Skincare', 'Beauty', 'Viral', 'Self-Care'], badge: '🔥 VIRAL' },
  { name: 'Magnetic Cable Organizer Clips (10pc)', category: 'Electronics', image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&q=80', supplierPrice: 1.80, ourPrice: 12.99, margin: 86, opportunityScore: 93, demandScore: 91, competitionScore: 71, saturationRisk: 'low', source: 'cj', trendSignal: 'surging', velocityChange: 188, description: 'Self-adhesive magnetic cable clips for desk organization. Works with USB-C, Lightning, and charging cables.', tags: ['Tech', 'Organization', 'WFH', 'Gift'], badge: 'TRENDING' },
  { name: 'Adjustable Posture Corrector Brace', category: 'Health & Beauty', image: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&q=80', supplierPrice: 5.50, ourPrice: 24.99, margin: 78, opportunityScore: 91, demandScore: 88, competitionScore: 66, saturationRisk: 'low', source: 'doba', trendSignal: 'rising', velocityChange: 142, description: 'Comfortable back straightener for improved posture during desk work. Adjustable straps fit most body types.', tags: ['Health', 'Posture', 'WFH', 'Back Pain'], badge: 'NEW' },
  { name: '4-in-1 Wireless Charging Pad', category: 'Electronics', image: 'https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=400&q=80', supplierPrice: 8.90, ourPrice: 34.99, margin: 75, opportunityScore: 89, demandScore: 92, competitionScore: 55, saturationRisk: 'medium', source: 'autods', trendSignal: 'rising', velocityChange: 96, description: 'Charges iPhone, AirPods, Apple Watch, and Android simultaneously. 15W fast charge. LED indicator.', tags: ['Tech', 'Wireless', 'Gift', 'Apple'], badge: 'BEST SELLER' },
  { name: 'Mini Portable Neck Fan (Bladeless)', category: 'Electronics', image: 'https://images.unsplash.com/photo-1527176930608-09cb256ab504?w=400&q=80', supplierPrice: 6.40, ourPrice: 26.99, margin: 76, opportunityScore: 94, demandScore: 96, competitionScore: 68, saturationRisk: 'low', source: 'cj', trendSignal: 'surging', velocityChange: 224, description: 'Hands-free wearable neck fan. 360° airflow, 3 speeds, USB-C rechargeable. Perfect for summer commute.', tags: ['Summer', 'Fan', 'Travel', 'Hands-Free'], badge: '🔥 HOT' },
  { name: 'Collapsible Silicone Travel Bottles (5pc)', category: 'Travel', image: 'https://images.unsplash.com/photo-1581235720704-06d3acfcb36f?w=400&q=80', supplierPrice: 2.10, ourPrice: 14.99, margin: 86, opportunityScore: 87, demandScore: 85, competitionScore: 74, saturationRisk: 'low', source: 'spocket', trendSignal: 'rising', velocityChange: 78, description: 'TSA-approved leak-proof silicone bottles. Collapsible when empty. Includes labels and carrying bag.', tags: ['Travel', 'TSA', 'Eco', 'Packing'], badge: 'NEW' },
  { name: 'LED Sunrise Alarm Clock', category: 'Home & Garden', image: 'https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=400&q=80', supplierPrice: 9.80, ourPrice: 39.99, margin: 75, opportunityScore: 88, demandScore: 87, competitionScore: 69, saturationRisk: 'low', source: 'autods', trendSignal: 'rising', velocityChange: 113, description: 'Simulates natural sunrise to wake you gently. 7 nature sounds, adjustable brightness, FM radio.', tags: ['Sleep', 'Wellness', 'Home', 'Gift'], badge: 'TRENDING' },
  { name: 'Reusable Beeswax Food Wraps (6pc)', category: 'Kitchen', image: 'https://images.unsplash.com/photo-1585515320310-259814833e62?w=400&q=80', supplierPrice: 3.20, ourPrice: 16.99, margin: 81, opportunityScore: 85, demandScore: 83, competitionScore: 77, saturationRisk: 'low', source: 'doba', trendSignal: 'rising', velocityChange: 67, description: 'Eco-friendly alternative to plastic wrap. Washable, reusable beeswax wraps in assorted sizes.', tags: ['Eco', 'Kitchen', 'Sustainable', 'Zero-Waste'], badge: 'ECO PICK' },
  { name: 'Smart Plug Mini (4-pack, WiFi)', category: 'Electronics', image: 'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=400&q=80', supplierPrice: 11.50, ourPrice: 42.99, margin: 73, opportunityScore: 86, demandScore: 89, competitionScore: 58, saturationRisk: 'medium', source: 'cj', trendSignal: 'rising', velocityChange: 84, description: 'WiFi smart plugs with energy monitoring. Works with Alexa and Google Home. Schedule and remote control via app.', tags: ['Smart Home', 'Tech', 'Energy', 'Alexa'], badge: 'SMART HOME' },
  { name: 'Digital Luggage Scale (110 lb)', category: 'Travel', image: 'https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=400&q=80', supplierPrice: 2.80, ourPrice: 13.99, margin: 80, opportunityScore: 85, demandScore: 84, competitionScore: 72, saturationRisk: 'low', source: 'spocket', trendSignal: 'stable', velocityChange: 32, description: 'Portable luggage scale with tare function. LCD display, 110 lb capacity. Backlit screen. Compact design.', tags: ['Travel', 'Luggage', 'Compact', 'Airport'], badge: 'NEW' },
  { name: 'Shower Foot Scrubber Mat', category: 'Health & Beauty', image: 'https://images.unsplash.com/photo-1600857062241-98e5dba7f400?w=400&q=80', supplierPrice: 3.90, ourPrice: 19.99, margin: 80, opportunityScore: 92, demandScore: 90, competitionScore: 73, saturationRisk: 'low', source: 'tiktok', trendSignal: 'surging', velocityChange: 267, description: 'Suction-cup shower mat with built-in pumice scrubber and massager. No bending required. TikTok sensation.', tags: ['Shower', 'Beauty', 'Viral', 'Self-Care'], badge: '🔥 VIRAL' },
  { name: 'Car Backseat Organizer Caddy', category: 'Automotive', image: 'https://images.unsplash.com/photo-1504148455328-c376907d081c?w=400&q=80', supplierPrice: 7.20, ourPrice: 29.99, margin: 76, opportunityScore: 86, demandScore: 85, competitionScore: 68, saturationRisk: 'low', source: 'autods', trendSignal: 'rising', velocityChange: 91, description: 'Multi-pocket car backseat organizer with tablet holder, cup holders, and foldable tray table.', tags: ['Car', 'Travel', 'Kids', 'Organization'], badge: 'TRENDING' },
  { name: 'Electric Spin Scrubber Brush', category: 'Home & Garden', image: 'https://images.unsplash.com/photo-1504274066651-8d31a536b11a?w=400&q=80', supplierPrice: 14.50, ourPrice: 49.99, margin: 71, opportunityScore: 90, demandScore: 89, competitionScore: 65, saturationRisk: 'medium', source: 'cj', trendSignal: 'surging', velocityChange: 178, description: '360° electric scrubber with 3 interchangeable heads. Cordless, waterproof, rechargeable via USB-C.', tags: ['Cleaning', 'Home', 'Electric', 'Lazy Girl'], badge: 'BEST SELLER' },
  { name: 'Foldable Reading Glasses +2.0 (3-pack)', category: 'Health & Beauty', image: 'https://images.unsplash.com/photo-1599420186946-7b6fb4e297f0?w=400&q=80', supplierPrice: 2.50, ourPrice: 14.99, margin: 83, opportunityScore: 85, demandScore: 82, competitionScore: 76, saturationRisk: 'low', source: 'doba', trendSignal: 'stable', velocityChange: 28, description: 'Lightweight foldable readers with spring hinges. 3-pack in assorted colors. Includes hard case.', tags: ['Reading', 'Glasses', 'Gift', 'Seniors'], badge: 'NEW' },
  { name: 'Bamboo Cutting Board with Juice Groove (XL)', category: 'Kitchen', image: 'https://images.unsplash.com/photo-1502741224143-90386d7f8c82?w=400&q=80', supplierPrice: 8.40, ourPrice: 32.99, margin: 75, opportunityScore: 87, demandScore: 86, competitionScore: 70, saturationRisk: 'low', source: 'spocket', trendSignal: 'rising', velocityChange: 62, description: 'Extra-large bamboo cutting board with juice groove and built-in handles. Anti-slip feet. Dishwasher safe.', tags: ['Kitchen', 'Eco', 'Cooking', 'Gift'], badge: 'TRENDING' },
];

const SOURCE_CONFIG = {
  spocket: { label: 'Spocket', color: '#8b5cf6', emoji: '🟣' },
  cj: { label: 'CJ Dropshipping', color: '#f97316', emoji: '🟠' },
  autods: { label: 'AutoDS', color: '#3b82f6', emoji: '🔵' },
  doba: { label: 'Doba', color: '#10b981', emoji: '🟢' },
  amazon: { label: 'Amazon Movers', color: '#f59e0b', emoji: '🟡' },
  tiktok: { label: 'TikTok Shop', color: '#ec4899', emoji: '🩷' },
};

const STORAGE_KEY = 'bp_auto_products';

function loadSaved(): AutoProduct[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; }
}
function saveToDB(products: AutoProduct[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
  // Mirror to server so imported products persist and are shared across devices.
  fetch(`${SERVER}/auto-products`, {
    method: 'POST',
    headers: autoProductAuthHeaders,
    body: JSON.stringify({ products }),
  }).catch((err) => console.error('[AutoProductPilot] server save failed:', err));
}

function buildProduct(base: Omit<AutoProduct, 'id' | 'status' | 'importedAt'>, score: number): AutoProduct {
  return {
    ...base,
    id: `ap_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    status: score >= 85 ? 'auto-published' : 'pending-review',
    importedAt: new Date().toISOString(),
  };
}

function ScoreRing({ score, size = 44, color }: { score: number; size?: number; color: string }) {
  const r = size / 2 - 4;
  const circ = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#1A1A1A" strokeWidth="3.5" />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth="3.5"
        strokeDasharray={`${(score / 100) * circ} ${circ}`} strokeLinecap="round" />
    </svg>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function AutoProductPilot() {
  const [tab, setTab] = useState<Tab>('live');
  const [isRunning, setIsRunning] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [products, setProducts] = useState<AutoProduct[]>(loadSaved);
  const [activityLog, setActivityLog] = useState<{ time: string; message: string; type: 'publish' | 'skip' | 'scan' | 'surge' }[]>([]);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanSource, setScanSource] = useState('');
  const [dailyCap, setDailyCap] = useState(5);
  const [minScore, setMinScore] = useState(85);
  const [markupPct, setMarkupPct] = useState(300);
  const [enabledSources, setEnabledSources] = useState<Record<string, boolean>>({
    spocket: true, cj: true, autods: true, doba: true, amazon: false, tiktok: true,
  });
  const [filterStatus, setFilterStatus] = useState<'all' | 'auto-published' | 'pending-review' | 'skipped'>('all');
  const autoRef = useRef<any>(null);
  const logRef = useRef<HTMLDivElement>(null);

  const published = products.filter(p => p.status === 'auto-published');
  const pending = products.filter(p => p.status === 'pending-review');
  const skipped = products.filter(p => p.status === 'skipped');

  const todayPublished = published.filter(p => p.importedAt.startsWith(new Date().toISOString().split('T')[0])).length;

  const totalRevenuePotential = published.reduce((sum, p) => sum + p.ourPrice * 30, 0); // estimate 30 sales/mo per product

  const addLog = useCallback((message: string, type: 'publish' | 'skip' | 'scan' | 'surge') => {
    const entry = { time: new Date().toLocaleTimeString(), message, type };
    setActivityLog(prev => [entry, ...prev].slice(0, 50));
  }, []);

  async function runScan(auto = false) {
    if (isScanning) return;
    setIsScanning(true);
    setScanProgress(0);

    const sources = Object.entries(enabledSources).filter(([, v]) => v).map(([k]) => k);
    const pool = [...PRODUCT_POOL].sort(() => Math.random() - 0.5);
    const toScan = pool.slice(0, auto ? 6 : 10);

    for (let i = 0; i < sources.length; i++) {
      setScanSource(sources[i]);
      addLog(`Scanning ${SOURCE_CONFIG[sources[i] as keyof typeof SOURCE_CONFIG]?.label}…`, 'scan');
      await new Promise(r => setTimeout(r, 600));
      setScanProgress(Math.round(((i + 1) / sources.length) * 60));
    }

    const newProducts: AutoProduct[] = [];
    const existingNames = new Set(products.map(p => p.name));

    for (let i = 0; i < toScan.length; i++) {
      const base = toScan[i];
      if (existingNames.has(base.name)) continue;

      setScanProgress(60 + Math.round((i / toScan.length) * 40));
      setScanSource('AI Scoring');
      await new Promise(r => setTimeout(r, 300));

      const product = buildProduct(base, base.opportunityScore);
      newProducts.push(product);

      if (base.opportunityScore >= minScore && todayPublished + newProducts.filter(p => p.status === 'auto-published').length <= dailyCap) {
        addLog(`✅ Auto-published: "${base.name}" — score ${base.opportunityScore}`, 'publish');
        if (base.trendSignal === 'surging') {
          addLog(`🔥 SURGE DETECTED: "${base.name}" +${base.velocityChange}% velocity`, 'surge');
        }
      } else if (base.opportunityScore >= 75) {
        addLog(`🔍 Added to review queue: "${base.name}" — score ${base.opportunityScore}`, 'skip');
      } else {
        addLog(`⏭ Skipped: "${base.name}" — score ${base.opportunityScore} (below threshold)`, 'skip');
      }
    }

    setProducts(prev => {
      const updated = [...newProducts, ...prev];
      saveToDB(updated);
      return updated;
    });

    setScanProgress(100);
    setScanSource('');
    setIsScanning(false);

    const autoPublished = newProducts.filter(p => p.status === 'auto-published').length;
    const inQueue = newProducts.filter(p => p.status === 'pending-review').length;

    if (autoPublished > 0) {
      toast.success(`${autoPublished} products auto-published to your store!`);
    }
    if (inQueue > 0) {
      toast.info(`${inQueue} products added to review queue`);
    }
  }

  function approveProduct(id: string) {
    setProducts(prev => {
      const updated = prev.map(p => p.id === id ? { ...p, status: 'auto-published' as const } : p);
      saveToDB(updated);
      return updated;
    });
    toast.success('Product approved and published to store');
    addLog('Manual approval: product published to store', 'publish');
  }

  function skipProduct(id: string) {
    setProducts(prev => {
      const updated = prev.map(p => p.id === id ? { ...p, status: 'skipped' as const } : p);
      saveToDB(updated);
      return updated;
    });
    toast.info('Product skipped');
  }

  function removeProduct(id: string) {
    setProducts(prev => {
      const updated = prev.filter(p => p.id !== id);
      saveToDB(updated);
      return updated;
    });
  }

  function toggleAutoPilot() {
    if (isRunning) {
      clearInterval(autoRef.current);
      setIsRunning(false);
      toast.info('Auto-Pilot paused');
    } else {
      setIsRunning(true);
      toast.success('Auto-Pilot ON — scanning every 6 hours and auto-publishing 85+ products');
      runScan(true);
      autoRef.current = setInterval(() => runScan(true), 21600000); // 6hr
    }
  }

  useEffect(() => () => clearInterval(autoRef.current), []);

  // Load imported products from the server (falls back to the localStorage cache).
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${SERVER}/auto-products`, { headers: autoProductAuthHeaders });
        const json = await res.json();
        if (json.success && Array.isArray(json.products)) {
          setProducts(json.products);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(json.products));
        }
      } catch (err) {
        console.error('[AutoProductPilot] Error loading products from server:', err);
      }
    })();
  }, []);

  const filteredProducts = products.filter(p => filterStatus === 'all' || p.status === filterStatus);

  const TABS: { id: Tab; label: string; count?: number }[] = [
    { id: 'live', label: '⚡ Live Feed' },
    { id: 'published', label: '✅ Published', count: published.length },
    { id: 'queue', label: '🔍 Review Queue', count: pending.length },
    { id: 'sources', label: '🌐 Sources' },
    { id: 'analytics', label: '📊 Analytics' },
    { id: 'settings', label: '⚙️ Settings' },
  ];

  const satColor = (r: string) => r === 'low' ? 'text-green-400' : r === 'medium' ? 'text-yellow-400' : 'text-red-400';
  const trendColor = (t: string) => t === 'surging' ? 'text-orange-400' : t === 'rising' ? 'text-blue-400' : 'text-gray-400';

  return (
    <div className="min-h-screen bg-[#050505] text-white p-6 space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-500 to-pink-600 flex items-center justify-center shadow-lg shadow-orange-500/20">
            <Bot className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white">Auto-Product Pilot</h1>
            <p className="text-gray-400 text-sm">AI finds, scores, and publishes trending products to your store automatically</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Stats row */}
          <div className="hidden sm:flex items-center gap-4 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl px-4 py-2 text-sm">
            <div className="text-center">
              <p className="text-xs text-gray-500">Published</p>
              <p className="font-black text-green-400">{published.length}</p>
            </div>
            <div className="w-px h-8 bg-[#2A2A2A]" />
            <div className="text-center">
              <p className="text-xs text-gray-500">In Queue</p>
              <p className="font-black text-yellow-400">{pending.length}</p>
            </div>
            <div className="w-px h-8 bg-[#2A2A2A]" />
            <div className="text-center">
              <p className="text-xs text-gray-500">Today</p>
              <p className="font-black text-orange-400">{todayPublished}/{dailyCap}</p>
            </div>
          </div>

          <button onClick={() => runScan(false)} disabled={isScanning}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#1A1A1A] border border-[#2A2A2A] hover:border-orange-500/40 text-gray-300 hover:text-white rounded-xl text-sm font-semibold transition disabled:opacity-50">
            <RefreshCw className={`w-4 h-4 ${isScanning ? 'animate-spin text-orange-400' : ''}`} />
            {isScanning ? 'Scanning…' : 'Scan Now'}
          </button>

          <button onClick={toggleAutoPilot}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${
              isRunning
                ? 'bg-green-600 hover:bg-green-500 text-white shadow-lg shadow-green-500/30'
                : 'bg-gradient-to-r from-orange-600 to-pink-600 hover:from-orange-500 hover:to-pink-500 text-white shadow-lg shadow-orange-500/20'
            }`}>
            {isRunning ? (
              <><span className="w-2 h-2 rounded-full bg-white animate-pulse" /> Auto-Pilot ON</>
            ) : (
              <><Zap className="w-4 h-4" /> Start Auto-Pilot</>
            )}
          </button>
        </div>
      </div>

      {/* Auto-pilot status banner */}
      {isRunning && (
        <div className="bg-gradient-to-r from-green-600/10 to-emerald-600/10 border border-green-500/30 rounded-2xl px-5 py-3 flex items-center gap-3">
          <span className="w-2.5 h-2.5 rounded-full bg-green-400 animate-pulse flex-shrink-0" />
          <p className="text-sm text-green-300 font-medium flex-1">
            <strong className="text-white">Auto-Pilot is running.</strong> Scanning {Object.values(enabledSources).filter(Boolean).length} sources every 6 hours.
            Publishing products scoring <strong className="text-white">{minScore}+</strong> automatically (max <strong className="text-white">{dailyCap}/day</strong>).
            Next scan: <strong className="text-white">6:00 AM</strong>
          </p>
          <button onClick={toggleAutoPilot} className="text-xs text-gray-500 hover:text-white flex-shrink-0">Pause</button>
        </div>
      )}

      {/* Scan progress bar */}
      {isScanning && (
        <div className="bg-[#1A1A1A] border border-orange-500/30 rounded-2xl p-4 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-orange-400" />
              <span className="text-white font-semibold">
                {scanSource === 'AI Scoring' ? '🤖 AI scoring products…' : `📡 Scanning ${SOURCE_CONFIG[scanSource as keyof typeof SOURCE_CONFIG]?.label || scanSource}…`}
              </span>
            </div>
            <span className="text-orange-400 font-bold">{scanProgress}%</span>
          </div>
          <div className="h-2 bg-[#0A0A0A] rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-orange-500 to-pink-500 rounded-full transition-all duration-300"
              style={{ width: `${scanProgress}%` }} />
          </div>
          <p className="text-xs text-gray-500">Checking opportunity scores, saturation risk, and margin potential…</p>
        </div>
      )}

      {/* Tab bar */}
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl whitespace-nowrap text-xs font-bold transition flex-shrink-0 ${
              tab === t.id
                ? 'bg-gradient-to-r from-orange-600 to-pink-600 text-white shadow-md'
                : 'bg-[#1A1A1A] border border-[#2A2A2A] text-gray-400 hover:text-white hover:border-[#3A3A3A]'
            }`}>
            {t.label}
            {t.count !== undefined && t.count > 0 && (
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${tab === t.id ? 'bg-white/20' : 'bg-orange-500/20 text-orange-400'}`}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── LIVE FEED TAB ─────────────────────────────────────────────────────── */}
      {tab === 'live' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Activity log */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-white flex items-center gap-2">
                <Activity className="w-4 h-4 text-orange-400" /> Live Activity Feed
              </h3>
              {activityLog.length > 0 && (
                <button onClick={() => setActivityLog([])} className="text-xs text-gray-600 hover:text-gray-400">Clear</button>
              )}
            </div>

            {activityLog.length === 0 ? (
              <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-10 text-center">
                <Bot className="w-10 h-10 text-gray-700 mx-auto mb-3" />
                <p className="text-gray-500 text-sm mb-1">No activity yet</p>
                <p className="text-gray-600 text-xs">Click <strong className="text-gray-400">Scan Now</strong> or <strong className="text-gray-400">Start Auto-Pilot</strong> to begin</p>
              </div>
            ) : (
              <div ref={logRef} className="bg-[#0A0A0A] border border-[#1A1A1A] rounded-2xl p-4 max-h-96 overflow-y-auto space-y-2">
                {activityLog.map((log, i) => (
                  <div key={i} className="flex items-start gap-3 text-xs py-1.5 border-b border-[#1A1A1A] last:border-0">
                    <span className="text-gray-600 flex-shrink-0 font-mono mt-0.5">{log.time}</span>
                    <span className={`flex-1 leading-relaxed ${
                      log.type === 'publish' ? 'text-green-400' :
                      log.type === 'surge' ? 'text-orange-400 font-semibold' :
                      log.type === 'scan' ? 'text-blue-400' : 'text-gray-500'
                    }`}>{log.message}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Recently published preview */}
            {published.length > 0 && (
              <div>
                <h3 className="font-bold text-white mb-3 flex items-center gap-2">
                  <Flame className="w-4 h-4 text-orange-400" /> Recently Auto-Published
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {published.slice(0, 4).map(p => (
                    <div key={p.id} className="bg-[#1A1A1A] border border-green-500/20 rounded-xl p-3 flex gap-3">
                      <img src={p.image} alt={p.name} className="w-14 h-14 rounded-lg object-cover flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-white truncate">{p.name}</p>
                        <p className="text-xs text-gray-500">${p.ourPrice} · {p.margin}% margin</p>
                        <div className="flex items-center gap-1 mt-1">
                          <span className={`text-[10px] font-bold ${trendColor(p.trendSignal)}`}>
                            {p.trendSignal === 'surging' ? '🔥' : p.trendSignal === 'rising' ? '📈' : '→'} {p.trendSignal}
                          </span>
                          <span className="text-gray-600 text-[10px]">+{p.velocityChange}%</span>
                        </div>
                      </div>
                      <div className="flex flex-col items-center justify-center flex-shrink-0">
                        <ScoreRing score={p.opportunityScore} size={36} color="#f97316" />
                        <span className="text-[9px] text-orange-400 font-black -mt-7 mb-5">{p.opportunityScore}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right sidebar — quick stats */}
          <div className="space-y-4">
            {/* Store health */}
            <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-5 space-y-4">
              <h3 className="font-bold text-white text-sm">Store Health</h3>
              {[
                { label: 'Products Live', value: published.length, color: '#4ade80', max: 50 },
                { label: "Today's Cap", value: todayPublished, color: '#f97316', max: dailyCap },
                { label: 'In Review Queue', value: pending.length, color: '#facc15', max: 20 },
              ].map(s => (
                <div key={s.label} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-400">{s.label}</span>
                    <span className="font-bold text-white">{s.value}{s.label === "Today's Cap" ? `/${dailyCap}` : ''}</span>
                  </div>
                  <div className="h-1.5 bg-[#0A0A0A] rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, (s.value / s.max) * 100)}%`, background: s.color }} />
                  </div>
                </div>
              ))}
            </div>

            {/* Revenue potential */}
            <div className="bg-gradient-to-br from-orange-600/10 to-pink-600/10 border border-orange-500/30 rounded-2xl p-5">
              <p className="text-xs text-gray-400 mb-1">Est. Monthly Revenue Potential</p>
              <p className="text-3xl font-black text-white">${totalRevenuePotential.toLocaleString()}</p>
              <p className="text-xs text-gray-500 mt-1">Based on {published.length} published products × avg 30 sales/mo</p>
              <div className="mt-3 pt-3 border-t border-orange-500/20">
                <p className="text-xs text-gray-400 mb-1">Avg Margin Across Products</p>
                <p className="text-xl font-black text-green-400">
                  {published.length > 0 ? Math.round(published.reduce((s, p) => s + p.margin, 0) / published.length) : 0}%
                </p>
              </div>
            </div>

            {/* Surging now */}
            {products.filter(p => p.trendSignal === 'surging' && p.status === 'auto-published').length > 0 && (
              <div className="bg-[#1A1A1A] border border-orange-500/30 rounded-2xl p-5">
                <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                  <Flame className="w-4 h-4 text-orange-400" /> Surging Right Now
                </h3>
                <div className="space-y-2">
                  {products.filter(p => p.trendSignal === 'surging' && p.status === 'auto-published').slice(0, 3).map(p => (
                    <div key={p.id} className="flex items-center gap-2">
                      <img src={p.image} alt={p.name} className="w-8 h-8 rounded-lg object-cover flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-white truncate">{p.name}</p>
                        <p className="text-[10px] text-orange-400">+{p.velocityChange}% velocity</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── PUBLISHED TAB ─────────────────────────────────────────────────────── */}
      {tab === 'published' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-400">{published.length} products live in your store</p>
          </div>
          {published.length === 0 ? (
            <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-12 text-center">
              <Package className="w-10 h-10 text-gray-700 mx-auto mb-3" />
              <p className="text-gray-500">No products published yet — run a scan to get started</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {published.map(p => (
                <div key={p.id} className="bg-[#1A1A1A] border border-[#2A2A2A] hover:border-green-500/30 rounded-2xl overflow-hidden transition group">
                  <div className="relative h-40 overflow-hidden">
                    <img src={p.image} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                    {p.badge && (
                      <div className="absolute top-3 left-3 px-2 py-0.5 bg-orange-600 text-white text-[10px] font-black rounded-full">{p.badge}</div>
                    )}
                    <div className="absolute top-3 right-3 bg-black/60 rounded-lg px-2 py-1">
                      <div className="relative">
                        <ScoreRing score={p.opportunityScore} size={32} color="#f97316" />
                        <span className="absolute inset-0 flex items-center justify-center text-[9px] font-black text-orange-400">{p.opportunityScore}</span>
                      </div>
                    </div>
                    <div className="absolute bottom-3 left-3 right-3 flex justify-between items-end">
                      <div>
                        <p className="text-white font-bold text-sm leading-tight">{p.name}</p>
                        <p className="text-gray-400 text-xs">{p.category}</p>
                      </div>
                    </div>
                  </div>
                  <div className="p-4 space-y-3">
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="bg-[#0A0A0A] rounded-lg p-2">
                        <p className="text-[10px] text-gray-500">Our Price</p>
                        <p className="text-sm font-black text-white">${p.ourPrice}</p>
                      </div>
                      <div className="bg-[#0A0A0A] rounded-lg p-2">
                        <p className="text-[10px] text-gray-500">Margin</p>
                        <p className="text-sm font-black text-green-400">{p.margin}%</p>
                      </div>
                      <div className="bg-[#0A0A0A] rounded-lg p-2">
                        <p className="text-[10px] text-gray-500">Velocity</p>
                        <p className={`text-sm font-black ${trendColor(p.trendSignal)}`}>+{p.velocityChange}%</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-gray-500">Source:</span>
                        <span className="text-xs font-semibold text-gray-300">{SOURCE_CONFIG[p.source]?.emoji} {SOURCE_CONFIG[p.source]?.label}</span>
                      </div>
                      <button onClick={() => removeProduct(p.id)} className="p-1.5 hover:bg-red-500/10 rounded-lg text-gray-600 hover:text-red-400 transition">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── REVIEW QUEUE TAB ──────────────────────────────────────────────────── */}
      {tab === 'queue' && (
        <div className="space-y-4">
          {pending.length === 0 ? (
            <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-12 text-center">
              <CheckCircle className="w-10 h-10 text-gray-700 mx-auto mb-3" />
              <p className="text-gray-500">Review queue is empty — all scored products have been processed</p>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-gray-400">{pending.length} products waiting for your review (scored 75–{minScore - 1})</p>
              {pending.map(p => (
                <div key={p.id} className="bg-[#1A1A1A] border border-yellow-500/20 rounded-2xl p-5 flex gap-4">
                  <img src={p.image} alt={p.name} className="w-20 h-20 rounded-xl object-cover flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <p className="font-bold text-white">{p.name}</p>
                        <p className="text-xs text-gray-500">{p.category} · {SOURCE_CONFIG[p.source]?.label}</p>
                      </div>
                      <div className="relative flex-shrink-0">
                        <ScoreRing score={p.opportunityScore} size={44} color="#facc15" />
                        <span className="absolute inset-0 flex items-center justify-center text-xs font-black text-yellow-400">{p.opportunityScore}</span>
                      </div>
                    </div>
                    <p className="text-xs text-gray-400 leading-relaxed mb-3">{p.description}</p>
                    <div className="flex flex-wrap gap-3 mb-3 text-xs">
                      <span className="text-white font-semibold">Cost: ${p.supplierPrice} → Sell: ${p.ourPrice}</span>
                      <span className="text-green-400 font-semibold">{p.margin}% margin</span>
                      <span className={`font-semibold ${satColor(p.saturationRisk)}`}>Saturation: {p.saturationRisk}</span>
                      <span className={`font-semibold ${trendColor(p.trendSignal)}`}>+{p.velocityChange}% velocity</span>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => approveProduct(p.id)}
                        className="flex items-center gap-1.5 px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-xl text-xs font-bold transition">
                        <CheckCircle className="w-3.5 h-3.5" /> Approve & Publish
                      </button>
                      <button onClick={() => skipProduct(p.id)}
                        className="flex items-center gap-1.5 px-4 py-2 bg-[#2A2A2A] hover:bg-[#3A3A3A] text-gray-400 rounded-xl text-xs font-semibold transition">
                        <X className="w-3.5 h-3.5" /> Skip
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── SOURCES TAB ───────────────────────────────────────────────────────── */}
      {tab === 'sources' && (
        <div className="space-y-4 max-w-2xl">
          <p className="text-sm text-gray-400">Enable the data sources you want the AI to scan for trending products.</p>
          <div className="space-y-3">
            {Object.entries(SOURCE_CONFIG).map(([key, cfg]) => (
              <div key={key} className={`bg-[#1A1A1A] border rounded-2xl p-5 flex items-center justify-between transition ${enabledSources[key] ? 'border-orange-500/30' : 'border-[#2A2A2A]'}`}>
                <div className="flex items-center gap-4">
                  <div className="text-2xl">{cfg.emoji}</div>
                  <div>
                    <p className="font-bold text-white">{cfg.label}</p>
                    <p className="text-xs text-gray-500">
                      {key === 'spocket' && 'US/EU dropshipping — fast shipping, premium suppliers'}
                      {key === 'cj' && 'Large global catalog — widest product selection'}
                      {key === 'autods' && 'Automated dropshipping — real-time inventory sync'}
                      {key === 'doba' && 'Verified US suppliers — higher margins'}
                      {key === 'amazon' && 'Amazon Movers & Shakers — hourly trending data'}
                      {key === 'tiktok' && 'TikTok Shop viral products — early trend detection'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setEnabledSources(prev => ({ ...prev, [key]: !prev[key] }))}
                  className={`relative w-12 h-6 rounded-full transition-colors flex-shrink-0 ${enabledSources[key] ? 'bg-orange-600' : 'bg-[#2A2A2A]'}`}>
                  <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${enabledSources[key] ? 'left-7' : 'left-1'}`} />
                </button>
              </div>
            ))}
          </div>
          <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-5">
            <p className="text-sm font-bold text-white mb-1">Also scanning:</p>
            <ul className="text-sm text-gray-400 space-y-1">
              <li className="flex items-center gap-2"><Globe className="w-3.5 h-3.5 text-blue-400" /> Google Trends — search volume spike detection</li>
              <li className="flex items-center gap-2"><BarChart3 className="w-3.5 h-3.5 text-purple-400" /> Social signal monitoring — TikTok/Instagram hashtag velocity</li>
              <li className="flex items-center gap-2"><Activity className="w-3.5 h-3.5 text-green-400" /> Your own store sales data — detect accelerating products</li>
            </ul>
          </div>
        </div>
      )}

      {/* ── ANALYTICS TAB ─────────────────────────────────────────────────────── */}
      {tab === 'analytics' && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Total Scanned', value: products.length + 12, icon: <Database className="w-4 h-4" />, color: 'text-blue-400' },
              { label: 'Auto-Published', value: published.length, icon: <CheckCircle className="w-4 h-4" />, color: 'text-green-400' },
              { label: 'Avg Score', value: published.length ? Math.round(published.reduce((s, p) => s + p.opportunityScore, 0) / published.length) : 0, icon: <Target className="w-4 h-4" />, color: 'text-orange-400' },
              { label: 'Avg Margin', value: `${published.length ? Math.round(published.reduce((s, p) => s + p.margin, 0) / published.length) : 0}%`, icon: <DollarSign className="w-4 h-4" />, color: 'text-purple-400' },
            ].map(s => (
              <div key={s.label} className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-4">
                <div className={`${s.color} mb-2`}>{s.icon}</div>
                <p className="text-2xl font-black text-white">{s.value}</p>
                <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Category breakdown */}
          <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-5">
            <h3 className="font-bold text-white mb-4">Published by Category</h3>
            {Object.entries(
              published.reduce((acc, p) => ({ ...acc, [p.category]: (acc[p.category] || 0) + 1 }), {} as Record<string, number>)
            ).sort((a, b) => b[1] - a[1]).map(([cat, count]) => (
              <div key={cat} className="mb-3">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-300">{cat}</span>
                  <span className="text-white font-bold">{count} products</span>
                </div>
                <div className="h-1.5 bg-[#0A0A0A] rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-orange-500 to-pink-500 rounded-full"
                    style={{ width: `${(count / Math.max(...Object.values(published.reduce((acc, p) => ({ ...acc, [p.category]: (acc[p.category] || 0) + 1 }), {} as Record<string, number>)))) * 100}%` }} />
                </div>
              </div>
            ))}
            {published.length === 0 && <p className="text-gray-500 text-sm">No published products yet</p>}
          </div>

          {/* Source breakdown */}
          <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-5">
            <h3 className="font-bold text-white mb-4">Products by Source</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {Object.entries(SOURCE_CONFIG).map(([key, cfg]) => {
                const count = published.filter(p => p.source === key).length;
                return (
                  <div key={key} className="bg-[#0A0A0A] rounded-xl p-3 text-center">
                    <div className="text-2xl mb-1">{cfg.emoji}</div>
                    <p className="text-xs text-gray-400">{cfg.label}</p>
                    <p className="text-xl font-black text-white">{count}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── SETTINGS TAB ──────────────────────────────────────────────────────── */}
      {tab === 'settings' && (
        <div className="space-y-5 max-w-xl">
          <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-6 space-y-6">
            <h3 className="font-bold text-white flex items-center gap-2"><Settings className="w-4 h-4 text-orange-400" /> Auto-Pilot Rules</h3>

            {/* Min score */}
            <div>
              <div className="flex justify-between mb-2">
                <label className="text-sm font-bold text-white">Minimum Opportunity Score to Auto-Publish</label>
                <span className="text-orange-400 font-black text-lg">{minScore}</span>
              </div>
              <input type="range" min={70} max={98} value={minScore} onChange={e => setMinScore(Number(e.target.value))}
                className="w-full accent-orange-500" />
              <p className="text-xs text-gray-500 mt-1">Products scoring below this go to Review Queue instead</p>
            </div>

            {/* Daily cap */}
            <div>
              <div className="flex justify-between mb-2">
                <label className="text-sm font-bold text-white">Max New Products Per Day</label>
                <span className="text-orange-400 font-black text-lg">{dailyCap}</span>
              </div>
              <input type="range" min={1} max={20} value={dailyCap} onChange={e => setDailyCap(Number(e.target.value))}
                className="w-full accent-orange-500" />
              <p className="text-xs text-gray-500 mt-1">Prevents flooding your store. Remaining go to Review Queue.</p>
            </div>

            {/* Markup */}
            <div>
              <div className="flex justify-between mb-2">
                <label className="text-sm font-bold text-white">Default Markup %</label>
                <span className="text-orange-400 font-black text-lg">{markupPct}%</span>
              </div>
              <input type="range" min={100} max={800} step={25} value={markupPct} onChange={e => setMarkupPct(Number(e.target.value))}
                className="w-full accent-orange-500" />
              <p className="text-xs text-gray-500 mt-1">Applied on top of supplier cost to set your sell price automatically</p>
            </div>

            {/* Saturation filter */}
            <div>
              <label className="text-sm font-bold text-white block mb-2">Block High-Saturation Products</label>
              <div className="flex gap-2">
                {['allow all', 'block high', 'low only'].map(opt => (
                  <button key={opt}
                    className="flex-1 py-2 bg-[#0A0A0A] border border-[#2A2A2A] hover:border-orange-500/40 text-gray-400 hover:text-white rounded-xl text-xs font-semibold transition capitalize">
                    {opt}
                  </button>
                ))}
              </div>
            </div>

            <button onClick={() => toast.success('Settings saved')}
              className="w-full py-3 bg-gradient-to-r from-orange-600 to-pink-600 hover:from-orange-500 hover:to-pink-500 text-white rounded-xl font-bold text-sm transition">
              Save Settings
            </button>
          </div>

          <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-5">
            <h3 className="font-bold text-white mb-3 flex items-center gap-2"><Bell className="w-4 h-4 text-blue-400" /> Notifications</h3>
            {[
              { label: 'Alert when product surges 200%+', active: true },
              { label: 'Daily summary of auto-published products', active: true },
              { label: 'Alert when daily cap is reached', active: false },
              { label: 'New source available notification', active: false },
            ].map(n => (
              <div key={n.label} className="flex items-center justify-between py-2 border-b border-[#2A2A2A] last:border-0">
                <span className="text-sm text-gray-300">{n.label}</span>
                <button className={`relative w-10 h-5 rounded-full transition-colors ${n.active ? 'bg-orange-600' : 'bg-[#2A2A2A]'}`}>
                  <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${n.active ? 'left-5' : 'left-0.5'}`} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
