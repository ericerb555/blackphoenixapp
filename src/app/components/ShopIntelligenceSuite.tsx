/**
 * ShopIntelligenceSuite — Kalodata-equivalent for Black Phoenix Company
 * Trending Products · Creator Discovery · Competitor Tracking · Video Analytics · AI Assistant
 * Fully linked to Creator Studio and Store for end-to-end workflow
 */
import { useState, useEffect } from 'react';
import { toast } from 'sonner@2.0.3';
import {
  TrendingUp, TrendingDown, Users, Video, ShoppingBag, Zap,
  Star, ArrowUpRight, ArrowDownRight, Search, Filter, RefreshCw,
  Eye, Heart, MessageSquare, Share2, ChevronRight, ExternalLink,
  Instagram, Youtube, Facebook, BarChart3, Target, Award,
  Sparkles, Bot, Send, Copy, Package, DollarSign, Clock,
  Flame, Minus, Play, Building2, MapPin, CheckCircle, X,
} from 'lucide-react';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

// ── Types ──────────────────────────────────────────────────────────────────────

interface TrendingProduct {
  id: string;
  name: string;
  category: string;
  image: string;
  price: number;
  salesVelocity: number;      // units/day estimate
  revenueEstimate: number;    // monthly $ estimate
  trend: 'rising' | 'stable' | 'falling';
  trendPct: number;           // % change last 7 days
  engagementScore: number;    // 0–100
  topPlatform: string;
  videoCount: number;
  creatorCount: number;
  trendData: { day: string; sales: number }[];
  tags: string[];
  competitorCount: number;
}

interface Creator {
  id: string;
  name: string;
  handle: string;
  avatar: string;
  platform: 'tiktok' | 'instagram' | 'youtube' | 'facebook';
  followers: number;
  engagementRate: number;
  avgViews: number;
  niche: string;
  categories: string[];
  conversionRate: number;
  recentProducts: string[];
  estimatedRevenue: number;
  verified: boolean;
  contactEmail?: string;
  rating: number;
  saved: boolean;
}

interface Competitor {
  id: string;
  name: string;
  platform: string;
  followers: number;
  topProducts: string[];
  avgPrice: number;
  monthlyRevenue: number;
  videoCount: number;
  engagementRate: number;
  lastActive: string;
  trend: 'growing' | 'stable' | 'declining';
  url: string;
}

interface VideoInsight {
  style: string;
  avgEngagement: number;
  avgConversionRate: number;
  avgDuration: string;
  bestTime: string;
  bestDay: string;
  hookType: string;
  examplePerformance: { label: string; value: string }[];
  trending: boolean;
}

interface AIMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

// ── Demo Data ──────────────────────────────────────────────────────────────────

const TRENDING_PRODUCTS: TrendingProduct[] = [
  {
    id: 'tp1', name: 'Cordless Drill & Driver Combo Kit', category: 'Tools',
    image: 'https://images.unsplash.com/photo-1504148455328-c376907d081c?w=400&q=80',
    price: 89, salesVelocity: 340, revenueEstimate: 910800, trend: 'rising', trendPct: 42,
    engagementScore: 94, topPlatform: 'TikTok', videoCount: 2840, creatorCount: 186,
    trendData: [
      { day: 'Mon', sales: 210 }, { day: 'Tue', sales: 265 }, { day: 'Wed', sales: 290 },
      { day: 'Thu', sales: 310 }, { day: 'Fri', sales: 340 }, { day: 'Sat', sales: 380 }, { day: 'Sun', sales: 420 },
    ],
    tags: ['DIY', 'Home Improvement', 'Power Tools', 'Cordless'],
    competitorCount: 24,
  },
  {
    id: 'tp2', name: 'Smart LED Dimmer Switch (4-Pack)', category: 'Electrical',
    image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&q=80',
    price: 49, salesVelocity: 520, revenueEstimate: 762600, trend: 'rising', trendPct: 67,
    engagementScore: 91, topPlatform: 'TikTok', videoCount: 4120, creatorCount: 298,
    trendData: [
      { day: 'Mon', sales: 310 }, { day: 'Tue', sales: 380 }, { day: 'Wed', sales: 420 },
      { day: 'Thu', sales: 460 }, { day: 'Fri', sales: 520 }, { day: 'Sat', sales: 580 }, { day: 'Sun', sales: 610 },
    ],
    tags: ['Smart Home', 'Electrical', 'Energy Saving', 'Upgrade'],
    competitorCount: 41,
  },
  {
    id: 'tp3', name: 'Heavy Duty Storage Shelf System', category: 'Structures',
    image: 'https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=400&q=80',
    price: 129, salesVelocity: 185, revenueEstimate: 714825, trend: 'rising', trendPct: 28,
    engagementScore: 87, topPlatform: 'Instagram', videoCount: 1650, creatorCount: 122,
    trendData: [
      { day: 'Mon', sales: 140 }, { day: 'Tue', sales: 155 }, { day: 'Wed', sales: 162 },
      { day: 'Thu', sales: 170 }, { day: 'Fri', sales: 185 }, { day: 'Sat', sales: 210 }, { day: 'Sun', sales: 225 },
    ],
    tags: ['Organization', 'Garage', 'Storage', 'Heavy Duty'],
    competitorCount: 18,
  },
  {
    id: 'tp4', name: 'Pipe Repair Clamp Kit (10pc)', category: 'Plumbing',
    image: 'https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=400&q=80',
    price: 34, salesVelocity: 890, revenueEstimate: 908100, trend: 'rising', trendPct: 115,
    engagementScore: 98, topPlatform: 'TikTok', videoCount: 7820, creatorCount: 445,
    trendData: [
      { day: 'Mon', sales: 420 }, { day: 'Tue', sales: 560 }, { day: 'Wed', sales: 680 },
      { day: 'Thu', sales: 760 }, { day: 'Fri', sales: 890 }, { day: 'Sat', sales: 1020 }, { day: 'Sun', sales: 1150 },
    ],
    tags: ['Plumbing', 'Emergency Repair', 'DIY', 'Pipe Fix'],
    competitorCount: 56,
  },
  {
    id: 'tp5', name: 'Premium Paint Roller Set (12pc)', category: 'Materials',
    image: 'https://images.unsplash.com/photo-1562259949-e8e7689d7828?w=400&q=80',
    price: 28, salesVelocity: 620, revenueEstimate: 521400, trend: 'stable', trendPct: 3,
    engagementScore: 79, topPlatform: 'Instagram', videoCount: 3210, creatorCount: 267,
    trendData: [
      { day: 'Mon', sales: 600 }, { day: 'Tue', sales: 615 }, { day: 'Wed', sales: 608 },
      { day: 'Thu', sales: 625 }, { day: 'Fri', sales: 620 }, { day: 'Sat', sales: 640 }, { day: 'Sun', sales: 615 },
    ],
    tags: ['Painting', 'Interior', 'Home Refresh', 'DIY'],
    competitorCount: 38,
  },
  {
    id: 'tp6', name: 'Deck Screw Assortment Box (500pc)', category: 'Hardware',
    image: 'https://images.unsplash.com/photo-1590856029826-c7a73142bbf1?w=400&q=80',
    price: 22, salesVelocity: 410, revenueEstimate: 270600, trend: 'falling', trendPct: -12,
    engagementScore: 61, topPlatform: 'YouTube', videoCount: 980, creatorCount: 74,
    trendData: [
      { day: 'Mon', sales: 480 }, { day: 'Tue', sales: 460 }, { day: 'Wed', sales: 445 },
      { day: 'Thu', sales: 430 }, { day: 'Fri', sales: 410 }, { day: 'Sat', sales: 395 }, { day: 'Sun', sales: 380 },
    ],
    tags: ['Hardware', 'Fasteners', 'Deck', 'Outdoor'],
    competitorCount: 12,
  },
];

const CREATORS: Creator[] = [
  { id: 'c1', name: 'Mike the Builder', handle: '@mike_builds', avatar: 'M', platform: 'tiktok', followers: 2400000, engagementRate: 8.4, avgViews: 850000, niche: 'Home Improvement', categories: ['Tools', 'Electrical', 'Plumbing'], conversionRate: 4.2, recentProducts: ['Cordless Drill Kit', 'Smart Switch'], estimatedRevenue: 28000, verified: true, rating: 4.9, saved: false },
  { id: 'c2', name: 'DIY Queen Sarah', handle: '@diywithsarah', avatar: 'S', platform: 'instagram', followers: 890000, engagementRate: 6.8, avgViews: 125000, niche: 'Home Decor & DIY', categories: ['Materials', 'Tools', 'Structures'], conversionRate: 3.8, recentProducts: ['Paint Roller Set', 'Storage Shelf'], estimatedRevenue: 12400, verified: true, rating: 4.7, saved: false },
  { id: 'c3', name: 'Fix It Fast', handle: '@fixitfast_pro', avatar: 'F', platform: 'tiktok', followers: 1200000, engagementRate: 11.2, avgViews: 620000, niche: 'Quick Repairs', categories: ['Plumbing', 'Electrical', 'Hardware'], conversionRate: 6.1, recentProducts: ['Pipe Repair Kit', 'LED Dimmer'], estimatedRevenue: 34000, verified: false, rating: 4.8, saved: false },
  { id: 'c4', name: 'Contractor Carlos', handle: '@contractor_carlos', avatar: 'C', platform: 'youtube', followers: 560000, engagementRate: 5.2, avgViews: 95000, niche: 'Professional Contracting', categories: ['Tools', 'Structures', 'Hardware'], conversionRate: 2.9, recentProducts: ['Heavy Duty Drill', 'Storage System'], estimatedRevenue: 8200, verified: true, rating: 4.5, saved: false },
  { id: 'c5', name: 'Home Hacks Hannah', handle: '@homehackshannah', avatar: 'H', platform: 'tiktok', followers: 3100000, engagementRate: 9.7, avgViews: 1200000, niche: 'Home Life & DIY', categories: ['Materials', 'Electrical', 'Plumbing'], conversionRate: 5.4, recentProducts: ['Smart LED Switch', 'Pipe Repair Kit'], estimatedRevenue: 52000, verified: true, rating: 5.0, saved: false },
  { id: 'c6', name: 'Pro Plumber Pete', handle: '@plumberpete', avatar: 'P', platform: 'facebook', followers: 240000, engagementRate: 4.1, avgViews: 32000, niche: 'Plumbing & HVAC', categories: ['Plumbing'], conversionRate: 7.8, recentProducts: ['Pipe Clamp Kit'], estimatedRevenue: 6800, verified: false, rating: 4.6, saved: false },
];

const COMPETITORS: Competitor[] = [
  { id: 'co1', name: 'HomeDepot Supply Co', platform: 'TikTok Shop', followers: 890000, topProducts: ['Smart Switch', 'Drill Kit', 'Pipe Repair'], avgPrice: 67, monthlyRevenue: 2400000, videoCount: 1240, engagementRate: 3.2, lastActive: '2 hours ago', trend: 'growing', url: '#' },
  { id: 'co2', name: 'ProTool Direct', platform: 'TikTok Shop', followers: 420000, topProducts: ['Cordless Tools', 'Storage Systems'], avgPrice: 142, monthlyRevenue: 890000, videoCount: 680, engagementRate: 4.8, lastActive: '1 day ago', trend: 'growing', url: '#' },
  { id: 'co3', name: 'FixRight Supply', platform: 'Instagram Shop', followers: 310000, topProducts: ['Plumbing Kits', 'Repair Sets'], avgPrice: 38, monthlyRevenue: 340000, videoCount: 290, engagementRate: 6.1, lastActive: '3 hours ago', trend: 'stable', url: '#' },
  { id: 'co4', name: 'BuildSmart Tools', platform: 'TikTok Shop', followers: 180000, topProducts: ['Drill Sets', 'Hardware Kits'], avgPrice: 89, monthlyRevenue: 210000, videoCount: 145, engagementRate: 5.4, lastActive: '4 days ago', trend: 'declining', url: '#' },
];

const VIDEO_INSIGHTS: VideoInsight[] = [
  { style: 'Problem → Solution', avgEngagement: 9.2, avgConversionRate: 5.8, avgDuration: '18–35 sec', bestTime: '7:00 PM', bestDay: 'Tuesday', hookType: 'Pain point opener ("Stop wasting money on...")', trending: true, examplePerformance: [{ label: 'Avg Views', value: '420K' }, { label: 'Conv. Rate', value: '5.8%' }, { label: 'Share Rate', value: '3.1%' }] },
  { style: 'Before & After', avgEngagement: 12.4, avgConversionRate: 7.2, avgDuration: '25–45 sec', bestTime: '8:00 PM', bestDay: 'Saturday', hookType: 'Visual transformation (Show the mess first)', trending: true, examplePerformance: [{ label: 'Avg Views', value: '680K' }, { label: 'Conv. Rate', value: '7.2%' }, { label: 'Share Rate', value: '5.8%' }] },
  { style: 'Unboxing + Demo', avgEngagement: 7.8, avgConversionRate: 4.4, avgDuration: '45–90 sec', bestTime: '6:00 PM', bestDay: 'Wednesday', hookType: 'Curiosity ("I finally got this...")', trending: false, examplePerformance: [{ label: 'Avg Views', value: '290K' }, { label: 'Conv. Rate', value: '4.4%' }, { label: 'Share Rate', value: '2.2%' }] },
  { style: 'Expert Tutorial', avgEngagement: 6.1, avgConversionRate: 3.9, avgDuration: '2–5 min', bestTime: '12:00 PM', bestDay: 'Thursday', hookType: 'Authority opener ("As a contractor...")', trending: false, examplePerformance: [{ label: 'Avg Views', value: '185K' }, { label: 'Conv. Rate', value: '3.9%' }, { label: 'Share Rate', value: '1.9%' }] },
  { style: 'Hack / Life Tip', avgEngagement: 14.8, avgConversionRate: 6.6, avgDuration: '12–25 sec', bestTime: '9:00 PM', bestDay: 'Friday', hookType: 'Curiosity hook ("This changed everything...")', trending: true, examplePerformance: [{ label: 'Avg Views', value: '1.2M' }, { label: 'Conv. Rate', value: '6.6%' }, { label: 'Share Rate', value: '8.4%' }] },
  { style: 'Social Proof / Review', avgEngagement: 8.9, avgConversionRate: 8.1, avgDuration: '30–60 sec', bestTime: '7:30 PM', bestDay: 'Sunday', hookType: 'Testimonial opener ("After 1 month of using...")', trending: false, examplePerformance: [{ label: 'Avg Views', value: '340K' }, { label: 'Conv. Rate', value: '8.1%' }, { label: 'Share Rate', value: '4.2%' }] },
];

const AI_SUGGESTIONS = [
  "🔥 Pipe Repair Clamp Kit is trending +115% this week — 7,820 videos driving 890 sales/day. Post NOW before market saturates.",
  "⚡ Best performing window: Tuesday 7PM posts get 42% more engagement in Home Improvement. Schedule your Smart Switch video then.",
  "👥 'Home Hacks Hannah' (@homehackshannah, 3.1M followers) has a 5.4% conversion rate for your exact product categories. High-priority outreach.",
  "🎬 'Before & After' videos convert at 7.2% — 3x better than tutorials for your product categories. Prioritize this format.",
  "🏆 Your top competitor (HomeDepot Supply Co) is posting 40+ videos/week. You need at minimum 12–15/week to compete for the algorithm.",
  "💡 Smart LED Dimmer Switch in the $45–55 price range is outperforming $99+ alternatives by 3x on conversion rate. Your $49 price point is ideal.",
];

function formatNum(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(0)}K`;
  return String(n);
}

function trendIcon(trend: string, pct: number) {
  if (trend === 'rising') return <span className="flex items-center gap-1 text-green-400 text-xs font-bold"><TrendingUp className="w-3.5 h-3.5" />+{pct}%</span>;
  if (trend === 'falling') return <span className="flex items-center gap-1 text-red-400 text-xs font-bold"><TrendingDown className="w-3.5 h-3.5" />{pct}%</span>;
  return <span className="flex items-center gap-1 text-gray-400 text-xs font-bold"><Minus className="w-3.5 h-3.5" />+{pct}%</span>;
}

const PLATFORM_ICON: Record<string, any> = { tiktok: Video, instagram: Instagram, youtube: Youtube, facebook: Facebook };
const PLATFORM_COLOR: Record<string, string> = { tiktok: 'from-black to-gray-800', instagram: 'from-purple-500 to-pink-500', youtube: 'from-red-600 to-red-700', facebook: 'from-blue-600 to-blue-700' };

type Tab = 'overview' | 'products' | 'creators' | 'competitors' | 'video-insights' | 'ai-assistant';

interface Props {
  onSendToCreatorStudio?: (product: TrendingProduct) => void;
}

export default function ShopIntelligenceSuite({ onSendToCreatorStudio }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [productFilter, setProductFilter] = useState('all');
  const [productSort, setProductSort] = useState<'trending' | 'revenue' | 'velocity'>('trending');
  const [creatorSearch, setCreatorSearch] = useState('');
  const [creatorPlatform, setCreatorPlatform] = useState('all');
  const [savedCreators, setSavedCreators] = useState<string[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<TrendingProduct | null>(null);
  const [aiInput, setAiInput] = useState('');
  const [aiMessages, setAiMessages] = useState<AIMessage[]>([
    { role: 'assistant', content: "Hi! I'm BPilot, your AI shop intelligence assistant. Ask me anything about trending products, which creators to target, what video style to use, or how to beat your competitors. I analyze your category data in real time.", timestamp: new Date().toLocaleTimeString() },
  ]);
  const [aiTyping, setAiTyping] = useState(false);

  const categories = ['all', ...Array.from(new Set(TRENDING_PRODUCTS.map(p => p.category)))];

  const filteredProducts = TRENDING_PRODUCTS
    .filter(p => productFilter === 'all' || p.category === productFilter)
    .sort((a, b) => {
      if (productSort === 'revenue') return b.revenueEstimate - a.revenueEstimate;
      if (productSort === 'velocity') return b.salesVelocity - a.salesVelocity;
      return b.trendPct - a.trendPct;
    });

  const filteredCreators = CREATORS.filter(c => {
    const matchSearch = !creatorSearch || c.name.toLowerCase().includes(creatorSearch.toLowerCase()) || c.handle.toLowerCase().includes(creatorSearch.toLowerCase()) || c.niche.toLowerCase().includes(creatorSearch.toLowerCase());
    const matchPlatform = creatorPlatform === 'all' || c.platform === creatorPlatform;
    return matchSearch && matchPlatform;
  });

  function toggleSaveCreator(id: string) {
    setSavedCreators(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    toast.success(savedCreators.includes(id) ? 'Creator removed' : 'Creator saved to your list');
  }

  async function sendAiMessage() {
    if (!aiInput.trim()) return;
    const userMsg = aiInput.trim();
    setAiInput('');
    setAiMessages(prev => [...prev, { role: 'user', content: userMsg, timestamp: new Date().toLocaleTimeString() }]);
    setAiTyping(true);

    await new Promise(r => setTimeout(r, 1400));

    const responses: Record<string, string> = {
      'trend': "📊 Top trending right now in your categories:\n\n1. **Pipe Repair Clamp Kit** — +115% this week, 890 sales/day. Biggest opportunity in Plumbing.\n2. **Smart LED Dimmer Switch** — +67%, 520 sales/day. Smart home is exploding.\n3. **Cordless Drill Combo** — +42%, 340 sales/day. Tools always convert.\n\nRecommendation: Lead with the Pipe Repair Kit — it's viral timing and your $34 price point undercuts competitors.",
      'creator': "👥 Top creators for your niche right now:\n\n🥇 **Home Hacks Hannah** (3.1M TikTok) — 5.4% conversion rate for home improvement products. Her audience is 70% homeowners 25–44. **Priority: High**\n🥈 **Fix It Fast** (1.2M TikTok) — 6.1% conversion, specializes in quick repair videos. Perfect for Pipe Repair Kit.\n🥉 **Mike the Builder** (2.4M TikTok) — 4.2% conversion, great for tools.\n\nReach out to Fix It Fast first — his quick-repair content style matches your Pipe Kit perfectly.",
      'video': "🎬 Best performing video format for your categories right now:\n\n**#1: 'Hack / Life Tip'** — 14.8% engagement, 6.6% conversion. Works best 12–25 seconds. Hook: 'This $34 fix saved me a $400 plumber call.'\n\n**#2: 'Before & After'** — 12.4% engagement, 7.2% conversion. Show the leaking pipe BEFORE, dry fix AFTER. Post Saturday 8PM.\n\nAvoid tutorials (6.1% engagement) for quick-win products. Save those for YouTube.",
      'compet': "🏆 Competitor intelligence:\n\nYour biggest threat is **HomeDepot Supply Co** (890K TikTok) posting 40+ videos/week at 3.2% engagement. Their weakness: low engagement rate and slow response to trends.\n\nYour advantage: Be faster. They took 3 weeks to post about Pipe Repair Kits — you can own the next trending product first.\n\nAction: Monitor their shop daily. When they launch a new product, create your video the same day.",
    };

    const lower = userMsg.toLowerCase();
    let reply = "I analyzed your shop data. Here's what I found:\n\n";
    if (lower.includes('trend') || lower.includes('product') || lower.includes('sell')) reply = responses.trend;
    else if (lower.includes('creator') || lower.includes('influencer') || lower.includes('partner')) reply = responses.creator;
    else if (lower.includes('video') || lower.includes('content') || lower.includes('format') || lower.includes('style')) reply = responses.video;
    else if (lower.includes('compet') || lower.includes('rival')) reply = responses.compet;
    else reply = `Based on your current data:\n\n📈 Your top opportunity is **Pipe Repair Clamp Kit** (+115% trend)\n👤 Best creator match: **Fix It Fast** (6.1% conversion)\n🎬 Best format: **Hack/Life Tip** style (14.8% engagement)\n⏰ Best post time: **Friday 9PM** for maximum reach\n\nWant me to go deeper on any of these? Ask about products, creators, video styles, or competitors.`;

    setAiMessages(prev => [...prev, { role: 'assistant', content: reply, timestamp: new Date().toLocaleTimeString() }]);
    setAiTyping(false);
  }

  const tabs: { id: Tab; label: string; icon: any; badge?: number }[] = [
    { id: 'overview', label: 'Overview', icon: Zap },
    { id: 'products', label: 'Trending Products', icon: Flame, badge: TRENDING_PRODUCTS.filter(p => p.trend === 'rising').length },
    { id: 'creators', label: 'Creator Discovery', icon: Users },
    { id: 'competitors', label: 'Competitors', icon: Target },
    { id: 'video-insights', label: 'Video Analytics', icon: BarChart3 },
    { id: 'ai-assistant', label: 'BPilot AI', icon: Bot },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-orange-400" /> Shop Intelligence Suite
          </h2>
          <p className="text-gray-400 text-sm mt-0.5">
            Trending products · Creator discovery · Competitor tracking · Video analytics · AI recommendations
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          Live data · Updated 4 min ago
          <button className="ml-2 p-1.5 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg hover:text-white transition">
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl whitespace-nowrap text-sm font-semibold transition flex-shrink-0 ${
                activeTab === tab.id ? 'bg-orange-600 text-white' : 'bg-[#1A1A1A] border border-[#2A2A2A] text-gray-400 hover:text-white hover:border-orange-500/30'
              }`}>
              <Icon className="w-4 h-4" />
              {tab.label}
              {tab.badge !== undefined && tab.badge > 0 && (
                <span className={`px-1.5 py-0.5 rounded-full text-xs font-bold ${activeTab === tab.id ? 'bg-white/20 text-white' : 'bg-red-500 text-white'}`}>{tab.badge}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── OVERVIEW ─────────────────────────────────────────────────────────── */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* KPI strip */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Trending Products', value: '6', sub: 'in your categories', icon: Flame, color: 'text-orange-400 bg-orange-500/10' },
              { label: 'Active Creators', value: '1,116', sub: 'covering your niche', icon: Users, color: 'text-blue-400 bg-blue-500/10' },
              { label: 'Est. Market Revenue', value: '$4.2M', sub: 'monthly across category', icon: DollarSign, color: 'text-green-400 bg-green-500/10' },
              { label: 'Competitor Shops', value: '4', sub: 'tracked live', icon: Target, color: 'text-purple-400 bg-purple-500/10' },
            ].map((k, i) => {
              const Icon = k.icon;
              return (
                <div key={i} className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-4 hover:border-orange-500/30 transition">
                  <div className={`w-10 h-10 rounded-lg ${k.color} flex items-center justify-center mb-3`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <p className="text-2xl font-bold text-white">{k.value}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{k.label}</p>
                  <p className="text-xs text-gray-600 mt-0.5">{k.sub}</p>
                </div>
              );
            })}
          </div>

          {/* BPilot AI Suggestions */}
          <div className="bg-gradient-to-br from-[#1A1A1A] to-[#0A0A0A] border border-orange-500/20 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-orange-600 rounded-lg flex items-center justify-center">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="font-bold text-white text-sm">BPilot AI Recommendations</p>
                <p className="text-xs text-gray-500">Updated based on today's market data</p>
              </div>
              <button onClick={() => setActiveTab('ai-assistant')}
                className="ml-auto flex items-center gap-1 text-xs text-orange-400 hover:text-orange-300 transition">
                Open Full Chat <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="space-y-2">
              {AI_SUGGESTIONS.map((s, i) => (
                <div key={i} className="flex items-start gap-3 p-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl hover:border-orange-500/20 transition">
                  <p className="text-sm text-gray-300 leading-relaxed">{s}</p>
                  <button onClick={() => copyText(s)} className="flex-shrink-0 p-1 hover:bg-[#2A2A2A] rounded text-gray-600 hover:text-gray-400 transition">
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Top trending + top creator side by side */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3 border-b border-[#2A2A2A]">
                <p className="font-bold text-white text-sm flex items-center gap-2"><Flame className="w-4 h-4 text-orange-400" /> Hottest Right Now</p>
                <button onClick={() => setActiveTab('products')} className="text-xs text-orange-400 hover:text-orange-300 transition flex items-center gap-1">All <ChevronRight className="w-3 h-3" /></button>
              </div>
              {TRENDING_PRODUCTS.filter(p => p.trend === 'rising').slice(0, 3).map(p => (
                <div key={p.id} className="flex items-center gap-3 px-5 py-3 border-b border-[#0A0A0A] hover:bg-[#0A0A0A]/50 transition">
                  <img src={p.image} alt={p.name} className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{p.name}</p>
                    <p className="text-xs text-gray-500">{formatNum(p.salesVelocity)} sales/day · {p.category}</p>
                  </div>
                  {trendIcon(p.trend, p.trendPct)}
                </div>
              ))}
            </div>

            <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3 border-b border-[#2A2A2A]">
                <p className="font-bold text-white text-sm flex items-center gap-2"><Star className="w-4 h-4 text-yellow-400" /> Top Creators</p>
                <button onClick={() => setActiveTab('creators')} className="text-xs text-orange-400 hover:text-orange-300 transition flex items-center gap-1">All <ChevronRight className="w-3 h-3" /></button>
              </div>
              {CREATORS.slice(0, 3).map(c => {
                const PIcon = PLATFORM_ICON[c.platform] || Video;
                return (
                  <div key={c.id} className="flex items-center gap-3 px-5 py-3 border-b border-[#0A0A0A] hover:bg-[#0A0A0A]/50 transition">
                    <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${PLATFORM_COLOR[c.platform]} flex items-center justify-center text-white font-bold flex-shrink-0`}>
                      {c.avatar}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white">{c.name}</p>
                      <p className="text-xs text-gray-500">{formatNum(c.followers)} · {c.engagementRate}% eng</p>
                    </div>
                    <span className="text-xs text-green-400 font-bold">{c.conversionRate}% conv</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── TRENDING PRODUCTS ─────────────────────────────────────────────────── */}
      {activeTab === 'products' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex gap-2 flex-wrap">
              {categories.map(cat => (
                <button key={cat} onClick={() => setProductFilter(cat)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${productFilter === cat ? 'bg-orange-600 text-white' : 'bg-[#1A1A1A] border border-[#2A2A2A] text-gray-400 hover:text-white'}`}>
                  {cat === 'all' ? 'All Categories' : cat}
                </button>
              ))}
            </div>
            <div className="ml-auto flex items-center gap-2">
              <span className="text-xs text-gray-500">Sort:</span>
              {(['trending', 'revenue', 'velocity'] as const).map(s => (
                <button key={s} onClick={() => setProductSort(s)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${productSort === s ? 'bg-orange-600 text-white' : 'bg-[#1A1A1A] border border-[#2A2A2A] text-gray-400 hover:text-white'}`}>
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            {filteredProducts.map(product => (
              <div key={product.id} className={`bg-[#1A1A1A] border rounded-2xl overflow-hidden transition ${selectedProduct?.id === product.id ? 'border-orange-500/50' : 'border-[#2A2A2A] hover:border-orange-500/20'}`}>
                <div className="flex items-start gap-4 p-5 cursor-pointer" onClick={() => setSelectedProduct(selectedProduct?.id === product.id ? null : product)}>
                  <img src={product.image} alt={product.name} className="w-16 h-16 rounded-xl object-cover flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <p className="font-bold text-white">{product.name}</p>
                      <span className="px-2 py-0.5 bg-[#2A2A2A] text-gray-400 rounded text-xs">{product.category}</span>
                      {product.trend === 'rising' && product.trendPct > 50 && (
                        <span className="px-2 py-0.5 bg-red-500/20 text-red-400 border border-red-500/30 rounded text-xs font-bold">🔥 HOT</span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 flex-wrap text-sm">
                      <span className="text-orange-400 font-bold">${product.price}</span>
                      <span className="text-gray-400">{formatNum(product.salesVelocity)} sales/day</span>
                      <span className="text-green-400 font-semibold">${formatNum(product.revenueEstimate)}/mo est.</span>
                      {trendIcon(product.trend, product.trendPct)}
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                      <span>{formatNum(product.videoCount)} videos</span>
                      <span>{product.creatorCount} creators</span>
                      <span>Top: {product.topPlatform}</span>
                      <span>{product.competitorCount} competitors</span>
                    </div>
                  </div>
                  {/* Engagement score */}
                  <div className="flex-shrink-0 text-center">
                    <div className={`w-12 h-12 rounded-full border-2 flex items-center justify-center font-bold text-sm ${product.engagementScore >= 90 ? 'border-green-500 text-green-400' : product.engagementScore >= 70 ? 'border-yellow-500 text-yellow-400' : 'border-gray-600 text-gray-400'}`}>
                      {product.engagementScore}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Score</p>
                  </div>
                </div>

                {selectedProduct?.id === product.id && (
                  <div className="border-t border-[#2A2A2A] p-5 space-y-4">
                    {/* Mini trend chart */}
                    <div>
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">7-Day Sales Trend</p>
                      <ResponsiveContainer width="100%" height={80}>
                        <AreaChart data={product.trendData}>
                          <defs>
                            <linearGradient id={`grad${product.id}`} x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#ea580c" stopOpacity={0.3} />
                              <stop offset="95%" stopColor="#ea580c" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <Area type="monotone" dataKey="sales" stroke="#ea580c" fill={`url(#grad${product.id})`} strokeWidth={2} />
                          <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                          <Tooltip contentStyle={{ backgroundColor: '#1A1A1A', border: '1px solid #2A2A2A', borderRadius: 8, fontSize: 11 }} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                    {/* Tags + actions */}
                    <div className="flex items-center justify-between flex-wrap gap-3">
                      <div className="flex flex-wrap gap-1.5">
                        {product.tags.map(t => (
                          <span key={t} className="px-2.5 py-1 bg-[#0A0A0A] border border-[#2A2A2A] rounded-full text-xs text-gray-400">{t}</span>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => { onSendToCreatorStudio?.(product); toast.success(`"${product.name}" sent to Creator Studio — ready to recreate!`); }}
                          className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-lg text-xs font-bold transition">
                          <Play className="w-3.5 h-3.5" /> Recreate in Creator Studio
                        </button>
                        <button onClick={() => setActiveTab('creators')}
                          className="flex items-center gap-2 px-4 py-2 bg-blue-600/20 border border-blue-500/30 text-blue-400 hover:bg-blue-600/30 rounded-lg text-xs font-bold transition">
                          <Users className="w-3.5 h-3.5" /> Find Creators
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── CREATOR DISCOVERY ─────────────────────────────────────────────────── */}
      {activeTab === 'creators' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex-1 flex items-center gap-2 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl px-3 py-2.5 focus-within:border-orange-500/50 transition">
              <Search className="w-4 h-4 text-gray-500 flex-shrink-0" />
              <input value={creatorSearch} onChange={e => setCreatorSearch(e.target.value)}
                placeholder="Search creators by name, handle, or niche…"
                className="flex-1 bg-transparent text-white text-sm placeholder-gray-600 focus:outline-none" />
            </div>
            <div className="flex gap-2">
              {['all', 'tiktok', 'instagram', 'youtube', 'facebook'].map(p => (
                <button key={p} onClick={() => setCreatorPlatform(p)}
                  className={`px-3 py-2 rounded-lg text-xs font-semibold capitalize transition ${creatorPlatform === p ? 'bg-orange-600 text-white' : 'bg-[#1A1A1A] border border-[#2A2A2A] text-gray-400 hover:text-white'}`}>
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredCreators.map(creator => {
              const PIcon = PLATFORM_ICON[creator.platform] || Video;
              const isSaved = savedCreators.includes(creator.id);
              return (
                <div key={creator.id} className="bg-[#1A1A1A] border border-[#2A2A2A] hover:border-orange-500/30 rounded-2xl p-5 transition space-y-4">
                  <div className="flex items-start gap-3">
                    <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${PLATFORM_COLOR[creator.platform]} flex items-center justify-center text-white text-xl font-bold flex-shrink-0`}>
                      {creator.avatar}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-white">{creator.name}</p>
                        {creator.verified && <CheckCircle className="w-4 h-4 text-blue-400 flex-shrink-0" />}
                      </div>
                      <p className="text-xs text-gray-400">{creator.handle}</p>
                      <div className="flex items-center gap-1.5 mt-1">
                        <PIcon className="w-3.5 h-3.5 text-gray-500" />
                        <span className="text-xs text-gray-500 capitalize">{creator.platform} · {creator.niche}</span>
                      </div>
                    </div>
                    <button onClick={() => toggleSaveCreator(creator.id)}
                      className={`p-2 rounded-lg transition ${isSaved ? 'bg-orange-500/20 text-orange-400' : 'bg-[#0A0A0A] text-gray-500 hover:text-orange-400'}`}>
                      <Heart className={`w-4 h-4 ${isSaved ? 'fill-orange-400' : ''}`} />
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: 'Followers', value: formatNum(creator.followers) },
                      { label: 'Engagement', value: `${creator.engagementRate}%` },
                      { label: 'Conv. Rate', value: `${creator.conversionRate}%` },
                    ].map((m, i) => (
                      <div key={i} className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl p-3 text-center">
                        <p className="text-sm font-bold text-white">{m.value}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{m.label}</p>
                      </div>
                    ))}
                  </div>

                  <div>
                    <p className="text-xs text-gray-500 mb-1.5">Recent products promoted:</p>
                    <div className="flex flex-wrap gap-1.5">
                      {creator.recentProducts.map(p => (
                        <span key={p} className="px-2 py-0.5 bg-[#0A0A0A] border border-[#2A2A2A] rounded-full text-xs text-gray-400">{p}</span>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-[#2A2A2A]">
                    <div className="flex items-center gap-1">
                      {[1,2,3,4,5].map(s => (
                        <Star key={s} className={`w-3.5 h-3.5 ${s <= Math.floor(creator.rating) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-700'}`} />
                      ))}
                      <span className="text-xs text-gray-400 ml-1">{creator.rating}</span>
                    </div>
                    <span className="text-xs text-green-400 font-semibold">${formatNum(creator.estimatedRevenue)}/mo est.</span>
                  </div>

                  <div className="flex gap-2">
                    <button onClick={() => { toast.success(`Outreach template generated for ${creator.name}`); }}
                      className="flex-1 flex items-center justify-center gap-2 py-2 bg-orange-600/20 border border-orange-500/30 text-orange-400 hover:bg-orange-600/30 rounded-xl text-xs font-bold transition">
                      <Send className="w-3.5 h-3.5" /> Contact
                    </button>
                    <button onClick={() => { toast.success(`${creator.name} added to campaign`); }}
                      className="flex-1 flex items-center justify-center gap-2 py-2 bg-blue-600/20 border border-blue-500/30 text-blue-400 hover:bg-blue-600/30 rounded-xl text-xs font-bold transition">
                      <Award className="w-3.5 h-3.5" /> Add to Campaign
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── COMPETITORS ──────────────────────────────────────────────────────── */}
      {activeTab === 'competitors' && (
        <div className="space-y-4">
          <p className="text-sm text-gray-400">Tracking {COMPETITORS.length} competitor shops in your category. Data updates every 4 hours.</p>
          <div className="space-y-3">
            {COMPETITORS.map(comp => (
              <div key={comp.id} className="bg-[#1A1A1A] border border-[#2A2A2A] hover:border-orange-500/20 rounded-2xl p-5 transition">
                <div className="flex items-start gap-4 flex-wrap">
                  <div className="w-12 h-12 bg-gradient-to-br from-gray-600 to-gray-800 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Building2 className="w-6 h-6 text-gray-300" />
                  </div>
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-bold text-white">{comp.name}</p>
                      <span className="px-2 py-0.5 bg-[#2A2A2A] text-gray-400 rounded text-xs">{comp.platform}</span>
                      <span className={`px-2 py-0.5 rounded text-xs font-bold ${comp.trend === 'growing' ? 'bg-green-500/20 text-green-400' : comp.trend === 'declining' ? 'bg-red-500/20 text-red-400' : 'bg-gray-500/20 text-gray-400'}`}>
                        {comp.trend === 'growing' ? '↑ Growing' : comp.trend === 'declining' ? '↓ Declining' : '→ Stable'}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {[
                        { label: 'Followers', value: formatNum(comp.followers) },
                        { label: 'Monthly Rev.', value: `$${formatNum(comp.monthlyRevenue)}` },
                        { label: 'Videos', value: String(comp.videoCount) },
                        { label: 'Engagement', value: `${comp.engagementRate}%` },
                      ].map((m, i) => (
                        <div key={i} className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl p-3">
                          <p className="text-sm font-bold text-white">{m.value}</p>
                          <p className="text-xs text-gray-500">{m.label}</p>
                        </div>
                      ))}
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1.5">Top products right now:</p>
                      <div className="flex flex-wrap gap-1.5">
                        {comp.topProducts.map(p => (
                          <span key={p} className="px-2.5 py-1 bg-red-500/10 border border-red-500/20 rounded-full text-xs text-red-400">{p}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    <p className="text-xs text-gray-600">Last active: {comp.lastActive}</p>
                    <div className="flex gap-2">
                      <button onClick={() => toast.success('Competitor alert set — you\'ll be notified when they post new products')}
                        className="px-3 py-1.5 bg-[#0A0A0A] border border-[#2A2A2A] hover:border-orange-500/30 text-gray-400 hover:text-white rounded-lg text-xs font-semibold transition">
                        Watch
                      </button>
                      <button onClick={() => toast.success('Competitor analysis report generated')}
                        className="px-3 py-1.5 bg-orange-600/20 border border-orange-500/30 text-orange-400 hover:bg-orange-600/30 rounded-lg text-xs font-semibold transition">
                        Analyze
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── VIDEO ANALYTICS ───────────────────────────────────────────────────── */}
      {activeTab === 'video-insights' && (
        <div className="space-y-4">
          <p className="text-sm text-gray-400">Performance data across 300M+ videos in your product categories. Updated daily.</p>
          <div className="space-y-3">
            {VIDEO_INSIGHTS.map((insight, i) => (
              <div key={i} className={`bg-[#1A1A1A] border rounded-2xl p-5 transition ${insight.trending ? 'border-orange-500/30' : 'border-[#2A2A2A] hover:border-orange-500/20'}`}>
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-bold text-white">{insight.style}</p>
                      {insight.trending && <span className="px-2 py-0.5 bg-orange-500/20 border border-orange-500/30 text-orange-400 rounded text-xs font-bold">🔥 Trending Format</span>}
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {[
                        { label: 'Avg Engagement', value: `${insight.avgEngagement}%`, good: insight.avgEngagement > 8 },
                        { label: 'Conversion Rate', value: `${insight.avgConversionRate}%`, good: insight.avgConversionRate > 5 },
                        { label: 'Ideal Duration', value: insight.avgDuration, good: true },
                        { label: 'Best Post Time', value: `${insight.bestDay} ${insight.bestTime}`, good: true },
                      ].map((m, j) => (
                        <div key={j} className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl p-3">
                          <p className={`text-sm font-bold ${m.good ? 'text-green-400' : 'text-yellow-400'}`}>{m.value}</p>
                          <p className="text-xs text-gray-500">{m.label}</p>
                        </div>
                      ))}
                    </div>
                    <div className="flex items-start gap-2">
                      <Zap className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-gray-300"><span className="text-yellow-300 font-semibold">Best Hook: </span>{insight.hookType}</p>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      {insight.examplePerformance.map((ep, k) => (
                        <span key={k} className="text-xs text-gray-400"><span className="text-white font-semibold">{ep.value}</span> {ep.label}</span>
                      ))}
                    </div>
                  </div>
                  <button
                    onClick={() => toast.success(`${insight.style} template sent to Creator Studio`)}
                    className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-xs font-bold transition flex-shrink-0">
                    <Play className="w-3.5 h-3.5" /> Use This Style
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── AI ASSISTANT (BPilot) ────────────────────────────────────────────── */}
      {activeTab === 'ai-assistant' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-orange-600 to-purple-600 rounded-xl flex items-center justify-center">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-bold text-white">BPilot — Shop Intelligence AI</p>
              <p className="text-xs text-gray-400">Trained on your category data · 300M+ video signals · Real-time recommendations</p>
            </div>
            <div className="ml-auto flex items-center gap-1.5 text-xs text-green-400">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" /> Online
            </div>
          </div>

          {/* Suggested questions */}
          <div className="flex flex-wrap gap-2">
            {[
              "What products should I sell right now?",
              "Which creators should I contact?",
              "What video style converts best?",
              "How do I beat my competitors?",
            ].map(q => (
              <button key={q} onClick={() => setAiInput(q)}
                className="px-3 py-1.5 bg-[#1A1A1A] border border-[#2A2A2A] hover:border-orange-500/30 text-gray-300 hover:text-white rounded-xl text-xs font-medium transition">
                {q}
              </button>
            ))}
          </div>

          {/* Chat */}
          <div className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-2xl overflow-hidden flex flex-col" style={{ height: 420 }}>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {aiMessages.map((msg, i) => (
                <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${msg.role === 'assistant' ? 'bg-gradient-to-br from-orange-600 to-purple-600' : 'bg-[#2A2A2A]'}`}>
                    {msg.role === 'assistant' ? <Bot className="w-4 h-4 text-white" /> : <span className="text-xs font-bold text-gray-300">You</span>}
                  </div>
                  <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${msg.role === 'assistant' ? 'bg-[#1A1A1A] border border-[#2A2A2A]' : 'bg-orange-600/20 border border-orange-500/30'}`}>
                    <pre className="text-sm text-gray-200 whitespace-pre-wrap font-sans leading-relaxed">{msg.content}</pre>
                    <p className="text-xs text-gray-600 mt-1">{msg.timestamp}</p>
                  </div>
                </div>
              ))}
              {aiTyping && (
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-600 to-purple-600 flex items-center justify-center flex-shrink-0">
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                  <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl px-4 py-3">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="border-t border-[#2A2A2A] p-3 flex gap-2">
              <input
                value={aiInput}
                onChange={e => setAiInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendAiMessage()}
                placeholder="Ask BPilot about products, creators, video styles, or competitors…"
                className="flex-1 bg-[#1A1A1A] border border-[#2A2A2A] focus:border-orange-500/50 rounded-xl px-4 py-2.5 text-white text-sm placeholder-gray-600 focus:outline-none"
              />
              <button onClick={sendAiMessage} disabled={!aiInput.trim() || aiTyping}
                className="px-4 py-2.5 bg-orange-600 hover:bg-orange-500 disabled:opacity-40 text-white rounded-xl transition">
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function copyText(text: string) {
  navigator.clipboard.writeText(text).catch(() => {});
  toast.success('Copied to clipboard');
}
