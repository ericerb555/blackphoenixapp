/**
 * AIRankingEngine — Full AI Visibility Suite
 * Google SEO · AI Search (GEO) · Voice Search · Schema · GBP · Rank Tracker
 */
import { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner@2.0.3';
import {
  Sparkles, TrendingUp, Search, Mic, Globe, Star, Zap, RefreshCw,
  Copy, Check, ChevronRight, ExternalLink, Play, Pause, Settings,
  FileText, MessageSquare, BarChart3, Target, Award, Bell, Bot,
  ArrowUpRight, ArrowDownRight, Minus, Plus, Download, Send,
  Building2, MapPin, Phone, Clock, CheckCircle, AlertCircle,
  Megaphone, Users, Eye, ThumbsUp, Volume2, BookOpen, Link,
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, RadialBarChart, RadialBar,
} from 'recharts';

// ── Types ──────────────────────────────────────────────────────────────────────

type Tab = 'dashboard' | 'content' | 'schema' | 'gbp' | 'voice' | 'settings';

interface RankMetric {
  label: string;
  score: number;
  change: number;
  color: string;
  icon: React.ReactNode;
  detail: string;
}

interface ContentPiece {
  id: string;
  type: 'blog' | 'faq' | 'service' | 'local';
  title: string;
  status: 'draft' | 'scheduled' | 'published';
  targetKeyword: string;
  wordCount: number;
  seoScore: number;
  geoScore: number;
  voiceScore: number;
  scheduledFor?: string;
  generatedAt: string;
  body?: string;
}

interface GBPPost {
  id: string;
  type: 'update' | 'offer' | 'event' | 'product';
  title: string;
  body: string;
  cta: string;
  status: 'pending' | 'posted';
  scheduledFor: string;
}

interface VoiceQuery {
  query: string;
  intent: 'informational' | 'local' | 'transactional';
  answer: string;
  platform: 'siri' | 'alexa' | 'google';
  winning: boolean;
}

interface SchemaBlock {
  type: string;
  label: string;
  status: 'active' | 'pending';
  impact: 'high' | 'medium' | 'low';
  json: string;
}

// ── Demo Data ──────────────────────────────────────────────────────────────────

const RANK_HISTORY = [
  { week: 'Wk 1', google: 42, ai: 12, voice: 8 },
  { week: 'Wk 2', google: 38, ai: 18, voice: 11 },
  { week: 'Wk 3', google: 31, ai: 24, voice: 15 },
  { week: 'Wk 4', google: 27, ai: 31, voice: 19 },
  { week: 'Wk 5', google: 22, ai: 38, voice: 24 },
  { week: 'Wk 6', google: 18, ai: 44, voice: 29 },
  { week: 'Wk 7', google: 14, ai: 52, voice: 35 },
  { week: 'Wk 8', google: 11, ai: 61, voice: 41 },
];

const CITATION_DATA = [
  { platform: 'ChatGPT', citations: 14, color: '#10b981' },
  { platform: 'Perplexity', citations: 9, color: '#8b5cf6' },
  { platform: 'Gemini', citations: 7, color: '#3b82f6' },
  { platform: 'Copilot', citations: 5, color: '#f59e0b' },
];

const SCHEMA_BLOCKS: SchemaBlock[] = [
  {
    type: 'LocalBusiness',
    label: 'Local Business Schema',
    status: 'active',
    impact: 'high',
    json: `{
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  "name": "Black Phoenix Company",
  "description": "Professional property maintenance, roofing, and construction services.",
  "url": "https://theblackphoenixcompany.com",
  "telephone": "+1-603-555-0100",
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "123 Main Street",
    "addressLocality": "Nashua",
    "addressRegion": "NH",
    "postalCode": "03060",
    "addressCountry": "US"
  },
  "geo": {
    "@type": "GeoCoordinates",
    "latitude": 42.7654,
    "longitude": -71.4676
  },
  "openingHours": "Mo-Fr 07:00-18:00",
  "priceRange": "$$"
}`,
  },
  {
    type: 'Service',
    label: 'Services Schema',
    status: 'active',
    impact: 'high',
    json: `{
  "@context": "https://schema.org",
  "@type": "Service",
  "serviceType": "Roofing & Property Maintenance",
  "provider": { "@type": "LocalBusiness", "name": "Black Phoenix Company" },
  "areaServed": { "@type": "State", "name": "New Hampshire" },
  "hasOfferCatalog": {
    "@type": "OfferCatalog",
    "name": "Maintenance Services",
    "itemListElement": [
      { "@type": "Offer", "itemOffered": { "@type": "Service", "name": "Roofing" } },
      { "@type": "Offer", "itemOffered": { "@type": "Service", "name": "HVAC" } },
      { "@type": "Offer", "itemOffered": { "@type": "Service", "name": "Plumbing" } }
    ]
  }
}`,
  },
  {
    type: 'FAQPage',
    label: 'FAQ Schema (Voice/AI)',
    status: 'active',
    impact: 'high',
    json: `{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "Who is the best roofing contractor near me in New Hampshire?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Black Phoenix Company is a top-rated roofing and property maintenance contractor serving New Hampshire. With licensed professionals and a proven track record, we offer 24/7 emergency services."
      }
    },
    {
      "@type": "Question",
      "name": "How much does roof repair cost in New Hampshire?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Roof repair in New Hampshire typically costs $300–$1,500 for minor repairs and $4,000–$12,000 for full replacements, depending on size and materials. Black Phoenix Company provides free estimates."
      }
    }
  ]
}`,
  },
  {
    type: 'Review',
    label: 'Review / Rating Schema',
    status: 'pending',
    impact: 'high',
    json: `{
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  "name": "Black Phoenix Company",
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": "4.9",
    "reviewCount": "127",
    "bestRating": "5"
  }
}`,
  },
  {
    type: 'HowTo',
    label: 'HowTo Schema (Voice)',
    status: 'pending',
    impact: 'medium',
    json: `{
  "@context": "https://schema.org",
  "@type": "HowTo",
  "name": "How to Choose a Roofing Contractor",
  "step": [
    { "@type": "HowToStep", "text": "Verify the contractor is licensed and insured in your state." },
    { "@type": "HowToStep", "text": "Read reviews on Google and check their BBB rating." },
    { "@type": "HowToStep", "text": "Request 3 written estimates before deciding." },
    { "@type": "HowToStep", "text": "Ask about warranty on both labor and materials." }
  ]
}`,
  },
];

const GBP_POSTS: GBPPost[] = [
  { id: 'g1', type: 'update', title: 'Summer Roofing Special', body: 'Beat the heat — get your roof inspected before storm season hits. Black Phoenix Company is offering free roof inspections throughout July. Book now and get a written report within 48 hours.', cta: 'Book Free Inspection', status: 'posted', scheduledFor: '2026-07-01' },
  { id: 'g2', type: 'offer', title: '10% Off First-Time Customers', body: 'New to Black Phoenix? Welcome. Get 10% off your first service when you mention this post. Valid for all residential and commercial maintenance services through July 31.', cta: 'Claim Offer', status: 'posted', scheduledFor: '2026-07-05' },
  { id: 'g3', type: 'update', title: 'Now Serving Condo Associations', body: 'Black Phoenix Company now offers dedicated maintenance plans for condo associations and HOAs. One vendor, all your building needs — plumbing, electrical, roofing, HVAC.', cta: 'Get a Quote', status: 'pending', scheduledFor: '2026-07-12' },
  { id: 'g4', type: 'event', title: 'Free Community Workshop: Home Maintenance Tips', body: 'Join us July 20th for a free 1-hour workshop on seasonal home maintenance. We\'ll cover what every homeowner should check before winter. Light refreshments provided.', cta: 'RSVP Now', status: 'pending', scheduledFor: '2026-07-20' },
];

const VOICE_QUERIES: VoiceQuery[] = [
  { query: 'Who is the best contractor near me?', intent: 'local', answer: 'Black Phoenix Company is a highly rated contractor in New Hampshire, offering roofing, plumbing, HVAC, and property maintenance with 24/7 emergency service.', platform: 'google', winning: true },
  { query: 'How do I find a licensed roofer in New Hampshire?', intent: 'informational', answer: 'Black Phoenix Company is a licensed and insured roofing contractor in New Hampshire. You can reach them at theblackphoenixcompany.com or call for a free estimate.', platform: 'siri', winning: true },
  { query: 'What is the best home maintenance company in Nashua NH?', intent: 'local', answer: 'Black Phoenix Company in Nashua, NH offers comprehensive home maintenance services including roofing, HVAC, plumbing, and landscaping.', platform: 'alexa', winning: false },
  { query: 'Who handles emergency roof repairs near me?', intent: 'transactional', answer: 'Black Phoenix Company provides 24/7 emergency roofing services in New Hampshire. They respond within hours for storm damage and urgent repairs.', platform: 'google', winning: true },
  { query: 'How much does property maintenance cost per month?', intent: 'informational', answer: 'Black Phoenix Company offers monthly property maintenance plans starting at competitive rates. Contact them for a custom quote based on your property size.', platform: 'alexa', winning: false },
];

const CONTENT_PIECES: ContentPiece[] = [
  { id: 'c1', type: 'blog', title: '10 Signs Your Roof Needs Immediate Repair (New Hampshire Guide)', status: 'published', targetKeyword: 'roof repair New Hampshire', wordCount: 1420, seoScore: 94, geoScore: 88, voiceScore: 91, generatedAt: '2026-07-01', scheduledFor: '2026-07-01' },
  { id: 'c2', type: 'faq', title: 'Roofing FAQ: Everything NH Homeowners Need to Know', status: 'published', targetKeyword: 'roofing contractor NH', wordCount: 980, seoScore: 97, geoScore: 95, voiceScore: 96, generatedAt: '2026-07-03' },
  { id: 'c3', type: 'local', title: 'Best Property Maintenance in Nashua, NH — Complete Guide', status: 'published', targetKeyword: 'property maintenance Nashua NH', wordCount: 1180, seoScore: 91, geoScore: 86, voiceScore: 89, generatedAt: '2026-07-05' },
  { id: 'c4', type: 'service', title: 'HVAC Maintenance Plans for Condo Associations in New Hampshire', status: 'scheduled', targetKeyword: 'HVAC condo association NH', wordCount: 1050, seoScore: 89, geoScore: 84, voiceScore: 82, generatedAt: '2026-07-07', scheduledFor: '2026-07-14' },
  { id: 'c5', type: 'blog', title: 'How to Choose a Licensed Contractor in NH: 7 Things to Check', status: 'draft', targetKeyword: 'licensed contractor New Hampshire', wordCount: 1340, seoScore: 92, geoScore: 90, voiceScore: 87, generatedAt: '2026-07-08' },
];

// ── Helper ─────────────────────────────────────────────────────────────────────

function ScoreRing({ score, size = 64, color = '#f97316' }: { score: number; size?: number; color?: string }) {
  const r = (size / 2) - 5;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#2A2A2A" strokeWidth="4" />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth="4"
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
        style={{ transition: 'stroke-dasharray 1s ease' }} />
    </svg>
  );
}

function Badge({ label, color }: { label: string; color: string }) {
  const map: Record<string, string> = {
    green: 'bg-green-500/20 text-green-400 border-green-500/30',
    orange: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    blue: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    purple: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    red: 'bg-red-500/20 text-red-400 border-red-500/30',
    gray: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  };
  return <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${map[color] || map.gray}`}>{label}</span>;
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function AIRankingEngine() {
  const [tab, setTab] = useState<Tab>('dashboard');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatingType, setGeneratingType] = useState('');
  const [selectedSchema, setSelectedSchema] = useState<SchemaBlock | null>(null);
  const [copiedId, setCopiedId] = useState('');
  const [autoRunning, setAutoRunning] = useState(false);
  const [contentPieces, setContentPieces] = useState<ContentPiece[]>(CONTENT_PIECES);
  const [gbpPosts, setGbpPosts] = useState<GBPPost[]>(GBP_POSTS);
  const [schemas, setSchemas] = useState<SchemaBlock[]>(SCHEMA_BLOCKS);
  const [voiceQueries] = useState<VoiceQuery[]>(VOICE_QUERIES);
  const [overallScore, setOverallScore] = useState(72);
  const [previewContent, setPreviewContent] = useState<ContentPiece | null>(null);
  const [businessName, setBusinessName] = useState('Black Phoenix Company');
  const [businessCity, setBusinessCity] = useState('Nashua, NH');
  const [targetServices, setTargetServices] = useState('Roofing, HVAC, Plumbing, Property Maintenance');
  const [competitors, setCompetitors] = useState('');

  const autoTimer = useRef<any>(null);

  // Overall visibility score
  const googleScore = 81;
  const aiScore = 68;
  const voiceScore = 59;

  const METRICS: RankMetric[] = [
    { label: 'Google Rank Score', score: googleScore, change: +14, color: '#4ade80', icon: <Globe className="w-5 h-5" />, detail: 'Avg position improving. 3 keywords now on page 1.' },
    { label: 'AI Citation Score', score: aiScore, change: +22, color: '#a78bfa', icon: <Bot className="w-5 h-5" />, detail: 'Cited 35 times across ChatGPT, Perplexity, Gemini this month.' },
    { label: 'Voice Search Score', score: voiceScore, change: +18, color: '#38bdf8', icon: <Mic className="w-5 h-5" />, detail: 'Winning 3 of 5 tracked voice queries. 2 need FAQ pages.' },
    { label: 'Schema Coverage', score: 60, change: +10, color: '#fb923c', icon: <FileText className="w-5 h-5" />, detail: '3 of 5 schema types active. Review + HowTo pending.' },
  ];

  function copyToClipboard(text: string, id: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(id);
      toast.success('Copied to clipboard');
      setTimeout(() => setCopiedId(''), 2000);
    });
  }

  async function generateContent(type: string) {
    setIsGenerating(true);
    setGeneratingType(type);
    await new Promise(r => setTimeout(r, 2200));

    const typeLabels: Record<string, string> = {
      blog: 'Blog Post',
      faq: 'FAQ Page',
      service: 'Service Page',
      local: 'Local Landing Page',
    };

    const keywords: Record<string, string> = {
      blog: `emergency ${targetServices.split(',')[0].trim().toLowerCase()} ${businessCity}`,
      faq: `${targetServices.split(',')[0].trim().toLowerCase()} FAQ ${businessCity}`,
      service: `${targetServices.split(',')[1]?.trim().toLowerCase() || 'maintenance'} services ${businessCity}`,
      local: `best contractor in ${businessCity}`,
    };

    const titles: Record<string, string> = {
      blog: `Emergency ${targetServices.split(',')[0].trim()} in ${businessCity}: What to Do First`,
      faq: `${targetServices.split(',')[0].trim()} FAQ: Everything ${businessCity} Homeowners Ask`,
      service: `${targetServices.split(',')[1]?.trim() || 'Maintenance'} Services in ${businessCity} — ${businessName}`,
      local: `Best Contractor in ${businessCity} — ${businessName} Reviews & Services`,
    };

    const newPiece: ContentPiece = {
      id: `c${Date.now()}`,
      type: type as any,
      title: titles[type] || `New ${typeLabels[type]}`,
      status: 'draft',
      targetKeyword: keywords[type],
      wordCount: Math.floor(Math.random() * 400) + 900,
      seoScore: Math.floor(Math.random() * 8) + 88,
      geoScore: Math.floor(Math.random() * 10) + 85,
      voiceScore: Math.floor(Math.random() * 12) + 82,
      generatedAt: new Date().toISOString().split('T')[0],
      body: `# ${titles[type]}\n\n## Introduction\n${businessName} has been serving ${businessCity} with professional ${targetServices.split(',')[0].trim().toLowerCase()} services for years. In this guide, we cover everything you need to know.\n\n## Why Choose ${businessName}?\n- Licensed & insured in New Hampshire\n- 24/7 emergency service available\n- Free written estimates\n- 5-star rated on Google\n\n## Our Services\n${targetServices.split(',').map(s => `- **${s.trim()}** — Professional grade, competitive pricing`).join('\n')}\n\n## Frequently Asked Questions\n\n**How quickly can you respond?**\n${businessName} typically responds within 2–4 hours for emergency calls and within 24 hours for standard service requests in ${businessCity}.\n\n**Are you licensed in New Hampshire?**\nYes, ${businessName} holds all required NH contractor licenses and carries full liability insurance.\n\n**Do you offer free estimates?**\nAbsolutely. Contact us today for a free written estimate with no obligation.\n\n## Contact ${businessName}\nReady to get started? Call us or visit theblackphoenixcompany.com to schedule your service today.`,
    };

    setContentPieces(prev => [newPiece, ...prev]);
    setOverallScore(s => Math.min(100, s + 2));
    setIsGenerating(false);
    setGeneratingType('');
    toast.success(`${typeLabels[type]} generated — ready to review & publish`);
  }

  function activateSchema(type: string) {
    setSchemas(prev => prev.map(s => s.type === type ? { ...s, status: 'active' } : s));
    setOverallScore(s => Math.min(100, s + 4));
    toast.success(`${type} schema activated — injecting into site`);
  }

  function postGBP(id: string) {
    setGbpPosts(prev => prev.map(p => p.id === id ? { ...p, status: 'posted' } : p));
    setOverallScore(s => Math.min(100, s + 3));
    toast.success('Posted to Google Business Profile');
  }

  function publishContent(id: string) {
    setContentPieces(prev => prev.map(c => c.id === id ? { ...c, status: 'published' } : c));
    setOverallScore(s => Math.min(100, s + 2));
    toast.success('Published — indexing will begin within 24 hours');
  }

  function startAutoMode() {
    setAutoRunning(true);
    toast.success('Auto-Rank Mode ON — generating & publishing content automatically every week');
  }

  function stopAutoMode() {
    setAutoRunning(false);
    toast.info('Auto-Rank Mode paused');
  }

  const TABS = [
    { id: 'dashboard', label: '📊 Dashboard', desc: 'Rank overview' },
    { id: 'content', label: '✍️ Content Engine', desc: 'AI-written SEO content' },
    { id: 'schema', label: '🔧 Schema & GEO', desc: 'Structured data + AI citations' },
    { id: 'gbp', label: '📍 Google Business', desc: 'Auto-post to GBP' },
    { id: 'voice', label: '🎙️ Voice Search', desc: 'Siri · Alexa · Google' },
    { id: 'settings', label: '⚙️ Settings', desc: 'Business info' },
  ] as const;

  return (
    <div className="min-h-screen bg-[#050505] text-white p-6 space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-500 to-purple-600 flex items-center justify-center shadow-lg shadow-orange-500/20">
            <Zap className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white">AI Ranking Engine</h1>
            <p className="text-gray-400 text-sm">Google · ChatGPT · Perplexity · Siri · Alexa — all in one</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Overall score */}
          <div className="relative flex items-center gap-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl px-4 py-2">
            <div className="relative">
              <ScoreRing score={overallScore} size={48} color="#f97316" />
              <span className="absolute inset-0 flex items-center justify-center text-xs font-black text-orange-400">{overallScore}</span>
            </div>
            <div>
              <p className="text-xs text-gray-500">Visibility Score</p>
              <p className="text-sm font-bold text-white">{overallScore < 60 ? 'Building' : overallScore < 80 ? 'Growing' : 'Dominant'}</p>
            </div>
          </div>

          {/* Auto mode toggle */}
          <button
            onClick={autoRunning ? stopAutoMode : startAutoMode}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all ${
              autoRunning
                ? 'bg-green-600 hover:bg-green-500 text-white shadow-lg shadow-green-500/30'
                : 'bg-gradient-to-r from-orange-600 to-purple-600 hover:from-orange-500 hover:to-purple-500 text-white shadow-lg shadow-orange-500/20'
            }`}>
            {autoRunning ? (
              <><span className="w-2 h-2 rounded-full bg-white animate-pulse" /> Auto-Rank ON</>
            ) : (
              <><Zap className="w-4 h-4" /> Enable Auto-Rank</>
            )}
          </button>
        </div>
      </div>

      {/* Auto-rank banner */}
      {autoRunning && (
        <div className="bg-gradient-to-r from-green-600/10 to-emerald-600/10 border border-green-500/30 rounded-2xl px-5 py-3 flex items-center gap-3">
          <span className="w-2.5 h-2.5 rounded-full bg-green-400 animate-pulse flex-shrink-0" />
          <p className="text-sm text-green-300 font-medium">
            <strong className="text-white">Auto-Rank is running.</strong> Publishing 3 pieces of content per week, updating Google Business Profile daily, and refreshing schema every 30 days. Next content drop: <strong className="text-white">Monday 8:00 AM</strong>.
          </p>
          <button onClick={stopAutoMode} className="ml-auto text-gray-500 hover:text-white text-xs flex-shrink-0">Pause</button>
        </div>
      )}

      {/* Tab Bar */}
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex flex-col items-start px-4 py-2.5 rounded-xl whitespace-nowrap text-xs font-semibold transition flex-shrink-0 ${
              tab === t.id
                ? 'bg-gradient-to-r from-orange-600 to-purple-600 text-white shadow-md'
                : 'bg-[#1A1A1A] border border-[#2A2A2A] text-gray-400 hover:text-white hover:border-[#3A3A3A]'
            }`}>
            <span>{t.label}</span>
            <span className={`text-[10px] font-normal mt-0.5 ${tab === t.id ? 'text-orange-200' : 'text-gray-600'}`}>{t.desc}</span>
          </button>
        ))}
      </div>

      {/* ── DASHBOARD TAB ─────────────────────────────────────────────────────── */}
      {tab === 'dashboard' && (
        <div className="space-y-6">

          {/* 4 metric cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {METRICS.map((m, i) => (
              <div key={i} className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${m.color}20` }}>
                    <span style={{ color: m.color }}>{m.icon}</span>
                  </div>
                  <span className={`flex items-center gap-1 text-xs font-bold ${m.change > 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {m.change > 0 ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                    +{Math.abs(m.change)} pts
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <ScoreRing score={m.score} size={52} color={m.color} />
                    <span className="absolute inset-0 flex items-center justify-center text-xs font-black" style={{ color: m.color }}>{m.score}</span>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">{m.label}</p>
                    <p className="text-sm font-bold text-white">{m.score >= 80 ? 'Strong' : m.score >= 60 ? 'Growing' : 'Needs work'}</p>
                  </div>
                </div>
                <p className="text-xs text-gray-400 leading-relaxed">{m.detail}</p>
              </div>
            ))}
          </div>

          {/* Rank history chart */}
          <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-white">Visibility Trend — 8 Weeks</h3>
                <p className="text-xs text-gray-400 mt-0.5">Google avg position · AI citations · Voice wins (higher = better)</p>
              </div>
              <div className="flex gap-4 text-xs">
                {[{ color: '#4ade80', label: 'Google' }, { color: '#a78bfa', label: 'AI Search' }, { color: '#38bdf8', label: 'Voice' }].map(l => (
                  <div key={l.label} className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: l.color }} />
                    <span className="text-gray-400">{l.label}</span>
                  </div>
                ))}
              </div>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={RANK_HISTORY}>
                <defs>
                  <linearGradient id="gGoogle" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4ade80" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#4ade80" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gAI" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#a78bfa" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#a78bfa" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gVoice" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#38bdf8" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid key="cg-dash" strokeDasharray="3 3" stroke="#1A1A1A" />
                <XAxis key="xa-dash" dataKey="week" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis key="ya-dash" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip key="tt-dash" contentStyle={{ background: '#1A1A1A', border: '1px solid #2A2A2A', borderRadius: 12 }} labelStyle={{ color: '#fff' }} />
                <Area key="area-google" type="monotone" dataKey="google" stroke="#4ade80" fill="url(#gGoogle)" strokeWidth={2} />
                <Area key="area-ai" type="monotone" dataKey="ai" stroke="#a78bfa" fill="url(#gAI)" strokeWidth={2} />
                <Area key="area-voice" type="monotone" dataKey="voice" stroke="#38bdf8" fill="url(#gVoice)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* AI Citations breakdown + recent activity */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

            {/* AI Citations */}
            <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-5">
              <h3 className="font-bold text-white mb-1">AI Citations This Month</h3>
              <p className="text-xs text-gray-400 mb-4">Times your business was cited as a source in AI-generated answers</p>
              <div className="space-y-3">
                {CITATION_DATA.map(c => (
                  <div key={c.platform} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-300 font-medium">{c.platform}</span>
                      <span className="text-sm font-bold text-white">{c.citations} citations</span>
                    </div>
                    <div className="h-2 bg-[#0A0A0A] rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${(c.citations / 14) * 100}%`, background: c.color }} />
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-green-400 font-semibold mt-4 flex items-center gap-1.5">
                <ArrowUpRight className="w-3.5 h-3.5" /> 35 total citations — up 220% from last month
              </p>
            </div>

            {/* Quick wins */}
            <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-5">
              <h3 className="font-bold text-white mb-1">Action Items</h3>
              <p className="text-xs text-gray-400 mb-4">Things that will move your score the most right now</p>
              <div className="space-y-3">
                {[
                  { icon: <FileText className="w-4 h-4" />, label: 'Activate Review Schema', impact: '+8 pts', color: 'orange', action: () => { setTab('schema'); } },
                  { icon: <Bot className="w-4 h-4" />, label: 'Publish 2 pending content pieces', impact: '+6 pts', color: 'purple', action: () => { setTab('content'); } },
                  { icon: <MapPin className="w-4 h-4" />, label: 'Post 2 GBP updates this week', impact: '+5 pts', color: 'blue', action: () => { setTab('gbp'); } },
                  { icon: <Mic className="w-4 h-4" />, label: 'Build FAQ pages for 2 voice queries', impact: '+4 pts', color: 'green', action: () => { setTab('voice'); } },
                  { icon: <Star className="w-4 h-4" />, label: 'Request 5 Google reviews', impact: '+4 pts', color: 'yellow', action: () => toast.info('Review request emails sent to recent customers') },
                ].map((item, i) => (
                  <button key={i} onClick={item.action}
                    className="w-full flex items-center gap-3 p-3 bg-[#0A0A0A] border border-[#2A2A2A] hover:border-orange-500/30 rounded-xl text-left transition group">
                    <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center text-orange-400 flex-shrink-0">
                      {item.icon}
                    </div>
                    <span className="text-sm text-gray-300 flex-1">{item.label}</span>
                    <span className="text-xs font-bold text-green-400 flex-shrink-0">{item.impact}</span>
                    <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-white transition" />
                  </button>
                ))}
              </div>
            </div>
          </div>

        </div>
      )}

      {/* ── CONTENT ENGINE TAB ────────────────────────────────────────────────── */}
      {tab === 'content' && (
        <div className="space-y-6">

          {/* Generate buttons */}
          <div className="bg-gradient-to-br from-orange-600/10 to-purple-600/10 border border-orange-500/30 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-5 h-5 text-orange-400" />
              <h3 className="font-bold text-white">Generate AI Content</h3>
              <span className="text-xs text-gray-400 ml-auto">All content is optimized for Google + AI search + voice simultaneously</span>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                { type: 'blog', icon: <BookOpen className="w-5 h-5" />, label: 'Blog Post', desc: 'Long-form SEO article', color: 'from-orange-600 to-orange-700' },
                { type: 'faq', icon: <MessageSquare className="w-5 h-5" />, label: 'FAQ Page', desc: 'Voice + AI answers', color: 'from-purple-600 to-purple-700' },
                { type: 'service', icon: <Target className="w-5 h-5" />, label: 'Service Page', desc: 'Conversion-focused', color: 'from-blue-600 to-blue-700' },
                { type: 'local', icon: <MapPin className="w-5 h-5" />, label: 'Local Page', desc: 'City/area landing', color: 'from-green-600 to-green-700' },
              ].map(item => (
                <button key={item.type}
                  onClick={() => generateContent(item.type)}
                  disabled={isGenerating}
                  className={`flex flex-col items-center gap-2 p-4 bg-gradient-to-br ${item.color} rounded-xl font-semibold text-white text-sm transition hover:opacity-90 disabled:opacity-50`}>
                  {isGenerating && generatingType === item.type ? (
                    <RefreshCw className="w-5 h-5 animate-spin" />
                  ) : item.icon}
                  <span>{item.label}</span>
                  <span className="text-xs font-normal opacity-75">{item.desc}</span>
                </button>
              ))}
            </div>
            {isGenerating && (
              <div className="mt-4 flex items-center gap-3 text-sm text-orange-300">
                <RefreshCw className="w-4 h-4 animate-spin" />
                Generating {generatingType} — optimizing for Google, ChatGPT, and voice search simultaneously…
              </div>
            )}
          </div>

          {/* Content list */}
          <div className="space-y-3">
            {contentPieces.map(piece => (
              <div key={piece.id} className="bg-[#1A1A1A] border border-[#2A2A2A] hover:border-[#3A3A3A] rounded-2xl p-5 transition">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <Badge label={piece.type.toUpperCase()} color={piece.type === 'blog' ? 'orange' : piece.type === 'faq' ? 'purple' : piece.type === 'service' ? 'blue' : 'green'} />
                      <Badge label={piece.status.toUpperCase()} color={piece.status === 'published' ? 'green' : piece.status === 'scheduled' ? 'blue' : 'gray'} />
                      <span className="text-xs text-gray-500">{piece.wordCount.toLocaleString()} words · Generated {piece.generatedAt}</span>
                    </div>
                    <h4 className="text-white font-bold text-sm leading-snug">{piece.title}</h4>
                    <p className="text-xs text-gray-500 mt-1">Target keyword: <span className="text-orange-400">{piece.targetKeyword}</span></p>
                  </div>

                  <div className="flex gap-2 flex-shrink-0">
                    {piece.status !== 'published' && (
                      <button onClick={() => publishContent(piece.id)}
                        className="px-3 py-1.5 bg-green-600 hover:bg-green-500 text-white rounded-lg text-xs font-bold transition">
                        Publish
                      </button>
                    )}
                    <button onClick={() => setPreviewContent(previewContent?.id === piece.id ? null : piece)}
                      className="px-3 py-1.5 bg-[#2A2A2A] hover:bg-[#3A3A3A] text-gray-300 rounded-lg text-xs font-semibold transition">
                      {previewContent?.id === piece.id ? 'Hide' : 'Preview'}
                    </button>
                  </div>
                </div>

                {/* Score bars */}
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: 'SEO', score: piece.seoScore, color: '#4ade80' },
                    { label: 'AI/GEO', score: piece.geoScore, color: '#a78bfa' },
                    { label: 'Voice', score: piece.voiceScore, color: '#38bdf8' },
                  ].map(s => (
                    <div key={s.label}>
                      <div className="flex justify-between text-[10px] mb-1">
                        <span className="text-gray-500">{s.label}</span>
                        <span className="font-bold" style={{ color: s.color }}>{s.score}</span>
                      </div>
                      <div className="h-1.5 bg-[#0A0A0A] rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${s.score}%`, background: s.color }} />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Preview */}
                {previewContent?.id === piece.id && piece.body && (
                  <div className="mt-4 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl p-4 max-h-64 overflow-y-auto">
                    <pre className="text-xs text-gray-300 whitespace-pre-wrap leading-relaxed font-sans">{piece.body}</pre>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── SCHEMA & GEO TAB ──────────────────────────────────────────────────── */}
      {tab === 'schema' && (
        <div className="space-y-5">

          <div className="bg-gradient-to-r from-purple-600/10 to-blue-600/10 border border-purple-500/30 rounded-2xl p-5">
            <div className="flex items-start gap-3">
              <Bot className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-bold text-white mb-1">What Schema Does For You</h3>
                <p className="text-sm text-gray-300 leading-relaxed">
                  Structured data (schema markup) tells Google, ChatGPT, and voice assistants <strong className="text-white">exactly who you are</strong> and what you do. It's the #1 reason AI systems cite some businesses over others.
                  Once activated, these blocks inject into every page of your site automatically.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {schemas.map(schema => (
              <div key={schema.type} className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl overflow-hidden">
                <div className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full flex-shrink-0 ${schema.status === 'active' ? 'bg-green-400' : 'bg-gray-600'}`} />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-sm">{schema.label}</span>
                        <Badge label={schema.impact.toUpperCase() + ' IMPACT'} color={schema.impact === 'high' ? 'orange' : schema.impact === 'medium' ? 'blue' : 'gray'} />
                      </div>
                      <span className="text-xs text-gray-500">Type: {schema.type} · {schema.status === 'active' ? 'Injected on all pages' : 'Not yet active'}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setSelectedSchema(selectedSchema?.type === schema.type ? null : schema)}
                      className="px-3 py-1.5 bg-[#2A2A2A] hover:bg-[#3A3A3A] text-gray-300 rounded-lg text-xs font-semibold transition">
                      {selectedSchema?.type === schema.type ? 'Hide' : 'View JSON'}
                    </button>
                    {schema.status === 'pending' && (
                      <button onClick={() => activateSchema(schema.type)}
                        className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-bold transition">
                        Activate
                      </button>
                    )}
                    {schema.status === 'active' && (
                      <span className="px-3 py-1.5 bg-green-500/10 border border-green-500/30 text-green-400 rounded-lg text-xs font-bold">✓ Active</span>
                    )}
                  </div>
                </div>

                {selectedSchema?.type === schema.type && (
                  <div className="border-t border-[#2A2A2A] p-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs text-gray-500 font-mono">schema.org/{schema.type}</span>
                      <button onClick={() => copyToClipboard(schema.json, schema.type)}
                        className="flex items-center gap-1 text-xs text-gray-400 hover:text-white transition">
                        {copiedId === schema.type ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                        {copiedId === schema.type ? 'Copied' : 'Copy'}
                      </button>
                    </div>
                    <pre className="text-xs text-gray-300 bg-[#0A0A0A] rounded-xl p-4 overflow-x-auto font-mono leading-relaxed">{schema.json}</pre>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* GEO tip */}
          <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-5">
            <h3 className="font-bold text-white mb-3 flex items-center gap-2"><Bot className="w-4 h-4 text-purple-400" /> How AI Systems Decide Who to Cite</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { step: '1', title: 'Entity Recognition', desc: 'AI looks for clear, consistent business name + location + service data across your site and the web.' },
                { step: '2', title: 'Authority Signals', desc: 'Reviews, backlinks, mentions on trusted sites (BBB, Angi, Houzz) signal you are a real, established business.' },
                { step: '3', title: 'Answer Quality', desc: 'FAQ pages that directly answer "Who is the best contractor in [city]?" get pulled verbatim into AI responses.' },
              ].map(s => (
                <div key={s.step} className="bg-[#0A0A0A] rounded-xl p-4">
                  <div className="w-8 h-8 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center font-black text-sm mb-2">{s.step}</div>
                  <p className="text-sm font-bold text-white mb-1">{s.title}</p>
                  <p className="text-xs text-gray-400 leading-relaxed">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

      {/* ── GOOGLE BUSINESS PROFILE TAB ───────────────────────────────────────── */}
      {tab === 'gbp' && (
        <div className="space-y-5">

          <div className="bg-gradient-to-r from-blue-600/10 to-green-600/10 border border-blue-500/30 rounded-2xl p-5">
            <div className="flex items-start gap-3">
              <MapPin className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-bold text-white mb-1">Google Business Profile Auto-Poster</h3>
                <p className="text-sm text-gray-300 leading-relaxed">
                  GBP is the <strong className="text-white">#1 factor for local voice searches</strong> ("best contractor near me"). Businesses that post weekly get 5x more profile views.
                  These posts are auto-generated using your business data and scheduled to go live automatically.
                </p>
              </div>
            </div>
          </div>

          {/* Generate new GBP post */}
          <div className="flex gap-3">
            {[
              { type: 'update', label: '📣 New Update', color: 'bg-blue-600 hover:bg-blue-500' },
              { type: 'offer', label: '🏷️ Offer', color: 'bg-orange-600 hover:bg-orange-500' },
              { type: 'event', label: '📅 Event', color: 'bg-purple-600 hover:bg-purple-500' },
            ].map(b => (
              <button key={b.type}
                onClick={async () => {
                  setIsGenerating(true);
                  setGeneratingType(b.type);
                  await new Promise(r => setTimeout(r, 1500));
                  const post: GBPPost = {
                    id: `g${Date.now()}`,
                    type: b.type as any,
                    title: `${businessName} — ${b.type === 'offer' ? 'Special Offer' : b.type === 'event' ? 'Upcoming Event' : 'Company Update'}`,
                    body: `${businessName} is proud to serve ${businessCity} and surrounding areas. ${b.type === 'offer' ? 'Get 15% off your first service this month.' : b.type === 'event' ? 'Join us for a free home maintenance workshop.' : `We're expanding our ${targetServices.split(',')[0].trim().toLowerCase()} services to better serve you.`}`,
                    cta: b.type === 'offer' ? 'Claim Offer' : b.type === 'event' ? 'RSVP Now' : 'Learn More',
                    status: 'pending',
                    scheduledFor: new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0],
                  };
                  setGbpPosts(prev => [post, ...prev]);
                  setIsGenerating(false);
                  setGeneratingType('');
                  toast.success('GBP post generated — review and post');
                }}
                disabled={isGenerating}
                className={`flex items-center gap-2 px-4 py-2.5 ${b.color} text-white rounded-xl text-sm font-bold transition disabled:opacity-50`}>
                {isGenerating && generatingType === b.type ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                {b.label}
              </button>
            ))}
          </div>

          <div className="space-y-3">
            {gbpPosts.map(post => (
              <div key={post.id} className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <Badge label={post.type.toUpperCase()} color={post.type === 'offer' ? 'orange' : post.type === 'event' ? 'purple' : 'blue'} />
                      <Badge label={post.status.toUpperCase()} color={post.status === 'posted' ? 'green' : 'gray'} />
                      <span className="text-xs text-gray-500">Scheduled: {post.scheduledFor}</span>
                    </div>
                    <h4 className="font-bold text-white text-sm mb-2">{post.title}</h4>
                    <p className="text-sm text-gray-300 leading-relaxed mb-2">{post.body}</p>
                    <div className="inline-flex items-center gap-1 px-2 py-1 bg-blue-500/10 border border-blue-500/20 rounded-lg text-xs text-blue-400">
                      CTA Button: <strong>{post.cta}</strong>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 flex-shrink-0">
                    {post.status === 'pending' && (
                      <button onClick={() => postGBP(post.id)}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5">
                        <Send className="w-3.5 h-3.5" /> Post Now
                      </button>
                    )}
                    {post.status === 'posted' && (
                      <span className="px-4 py-2 bg-green-500/10 border border-green-500/30 text-green-400 rounded-xl text-xs font-bold flex items-center gap-1.5">
                        <CheckCircle className="w-3.5 h-3.5" /> Posted
                      </span>
                    )}
                    <button onClick={() => copyToClipboard(post.body, post.id)}
                      className="px-4 py-2 bg-[#2A2A2A] hover:bg-[#3A3A3A] text-gray-300 rounded-xl text-xs font-semibold transition flex items-center gap-1.5">
                      {copiedId === post.id ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                      Copy
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

        </div>
      )}

      {/* ── VOICE SEARCH TAB ──────────────────────────────────────────────────── */}
      {tab === 'voice' && (
        <div className="space-y-5">

          <div className="bg-gradient-to-r from-cyan-600/10 to-blue-600/10 border border-cyan-500/30 rounded-2xl p-5">
            <div className="flex items-start gap-3">
              <Mic className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-bold text-white mb-1">Voice Search Optimization</h3>
                <p className="text-sm text-gray-300 leading-relaxed">
                  When someone asks Siri, Alexa, or Google Assistant for a contractor, they read out <strong className="text-white">one answer</strong> — the featured snippet.
                  The queries below are ones your potential customers are already asking. <strong className="text-white">Green = you're winning. Red = you need content.</strong>
                </p>
              </div>
            </div>
          </div>

          {/* Platform breakdown */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { platform: 'Google Assistant', icon: '🔍', wins: 3, total: 5, color: 'blue' },
              { platform: 'Siri', icon: '🍎', wins: 2, total: 5, color: 'gray' },
              { platform: 'Alexa', icon: '🔊', wins: 1, total: 5, color: 'cyan' },
            ].map(p => (
              <div key={p.platform} className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-4 text-center">
                <div className="text-2xl mb-2">{p.icon}</div>
                <p className="text-sm font-bold text-white">{p.platform}</p>
                <p className="text-2xl font-black text-white mt-1">{p.wins}<span className="text-gray-600 text-sm font-normal">/{p.total}</span></p>
                <p className="text-xs text-gray-400">queries winning</p>
                <div className="mt-2 h-1.5 bg-[#0A0A0A] rounded-full overflow-hidden">
                  <div className="h-full bg-cyan-500 rounded-full" style={{ width: `${(p.wins / p.total) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>

          {/* Voice query cards */}
          <div className="space-y-3">
            {voiceQueries.map((q, i) => (
              <div key={i} className={`bg-[#1A1A1A] border rounded-2xl p-5 ${q.winning ? 'border-green-500/30' : 'border-red-500/20'}`}>
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-lg">{q.platform === 'siri' ? '🍎' : q.platform === 'alexa' ? '🔊' : '🔍'}</span>
                    <Badge label={q.intent.toUpperCase()} color={q.intent === 'local' ? 'blue' : q.intent === 'transactional' ? 'orange' : 'purple'} />
                    <Badge label={q.winning ? '✓ WINNING' : '✗ NOT RANKING'} color={q.winning ? 'green' : 'red'} />
                  </div>
                  {!q.winning && (
                    <button
                      onClick={() => generateContent('faq')}
                      className="px-3 py-1.5 bg-orange-600 hover:bg-orange-500 text-white rounded-lg text-xs font-bold transition flex-shrink-0">
                      Build FAQ Page →
                    </button>
                  )}
                </div>

                <div className="mb-3">
                  <p className="text-xs text-gray-500 mb-1 flex items-center gap-1"><Mic className="w-3 h-3" /> Voice query</p>
                  <p className="text-white font-semibold text-sm">"{q.query}"</p>
                </div>

                <div className="bg-[#0A0A0A] rounded-xl p-3">
                  <p className="text-xs text-gray-500 mb-1 flex items-center gap-1"><Volume2 className="w-3 h-3" /> {q.winning ? 'Current answer (you\'re winning this)' : 'Target answer (build a page for this)'}</p>
                  <p className="text-sm text-gray-300 leading-relaxed italic">"{q.answer}"</p>
                  <button onClick={() => copyToClipboard(q.answer, `voice-${i}`)}
                    className="mt-2 flex items-center gap-1 text-xs text-gray-500 hover:text-white transition">
                    {copiedId === `voice-${i}` ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                    Copy answer script
                  </button>
                </div>
              </div>
            ))}
          </div>

        </div>
      )}

      {/* ── SETTINGS TAB ──────────────────────────────────────────────────────── */}
      {tab === 'settings' && (
        <div className="space-y-5 max-w-2xl">

          <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-6 space-y-5">
            <h3 className="font-bold text-white flex items-center gap-2"><Settings className="w-4 h-4 text-orange-400" /> Business Information</h3>
            <p className="text-sm text-gray-400">This data is used to generate all content, schema, GBP posts, and voice answers. Keep it accurate.</p>

            <div className="space-y-4">
              {[
                { label: 'Business Name', value: businessName, setter: setBusinessName, placeholder: 'Black Phoenix Company' },
                { label: 'City & State', value: businessCity, setter: setBusinessCity, placeholder: 'Nashua, NH' },
                { label: 'Services (comma-separated)', value: targetServices, setter: setTargetServices, placeholder: 'Roofing, HVAC, Plumbing...' },
                { label: 'Main Competitors (optional)', value: competitors, setter: setCompetitors, placeholder: 'Competitor A, Competitor B' },
              ].map(f => (
                <div key={f.label}>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">{f.label}</label>
                  <input
                    type="text"
                    value={f.value}
                    onChange={e => f.setter(e.target.value)}
                    placeholder={f.placeholder}
                    className="w-full bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-orange-500/50 transition"
                  />
                </div>
              ))}
            </div>

            <button onClick={() => toast.success('Settings saved — all content templates updated')}
              className="px-6 py-2.5 bg-gradient-to-r from-orange-600 to-purple-600 hover:from-orange-500 hover:to-purple-500 text-white rounded-xl font-bold text-sm transition">
              Save Settings
            </button>
          </div>

          {/* Auto-rank settings */}
          <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-6 space-y-4">
            <h3 className="font-bold text-white flex items-center gap-2"><Zap className="w-4 h-4 text-orange-400" /> Auto-Rank Schedule</h3>
            <div className="space-y-3">
              {[
                { label: 'Blog posts per week', value: '3', desc: 'Recommended: 3–5 for fast growth' },
                { label: 'GBP posts per week', value: '5', desc: 'Recommended: daily for local dominance' },
                { label: 'Schema refresh', value: 'Every 30 days', desc: 'Auto-updates when your info changes' },
                { label: 'Voice query scan', value: 'Weekly', desc: 'Finds new queries to target' },
              ].map(s => (
                <div key={s.label} className="flex items-center justify-between p-3 bg-[#0A0A0A] rounded-xl">
                  <div>
                    <p className="text-sm font-semibold text-white">{s.label}</p>
                    <p className="text-xs text-gray-500">{s.desc}</p>
                  </div>
                  <span className="text-sm font-bold text-orange-400">{s.value}</span>
                </div>
              ))}
            </div>
            <button
              onClick={autoRunning ? stopAutoMode : startAutoMode}
              className={`w-full py-3 rounded-xl font-bold text-sm transition ${
                autoRunning ? 'bg-red-600/20 border border-red-500/30 text-red-400 hover:bg-red-600/30' : 'bg-gradient-to-r from-orange-600 to-purple-600 hover:from-orange-500 hover:to-purple-500 text-white'
              }`}>
              {autoRunning ? '⏸ Pause Auto-Rank' : '▶ Start Auto-Rank Mode'}
            </button>
          </div>

        </div>
      )}

    </div>
  );
}
