/**
 * PropertyAI Enterprise — Phase 1
 * Master hub: Property Health Score, expanded Building Systems profile,
 * Revenue Intelligence (links to PropertyRevenueHub), Capital Planning scaffold,
 * and locked previews for Phases 2–5.
 * NH-aware throughout (RSA 540, RSA 356-B, Eversource rebates).
 */
import { useState, useEffect, useMemo } from 'react';
import {
  Building2, TrendingUp, DollarSign, Zap, Plus, ChevronRight,
  X, CheckCircle, AlertTriangle, Info, Settings, BarChart3,
  FileText, Star, Clock, Wrench, Home, Shield, Search,
  Download, Bell, Eye, Target, ChevronDown, ChevronUp, RefreshCw,
  Bot, Lightbulb, Package, Car, Wifi, Sun, Users, MapPin,
  Edit2, Save, Trash2, Lock, BookOpen, ShoppingBag, Brain,
  ThumbsUp, Activity, Flame, Droplets, Wind, Gauge, Calendar,
  AlertCircle, TrendingDown, ArrowUpRight, HelpCircle, Layers, Sparkles, Megaphone,
} from 'lucide-react';
import PropertyDocuments from '../components/PropertyDocuments';
import PropertyKnowledgeCenter from '../components/PropertyKnowledgeCenter';
import PropertyMarketplace from '../components/PropertyMarketplace';
import MarketplaceAdmin from './MarketplaceAdmin';
import AdCreator from './AdCreator';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { saveDual, loadDual } from '../lib/database';
import {
  RadialBarChart, RadialBar, ResponsiveContainer,
  AreaChart, Area, XAxis, YAxis, Tooltip, BarChart, Bar, Cell,
} from 'recharts';

// ─── Types ────────────────────────────────────────────────────────────────────

type PropertyType = 'homeowner' | 'landlord' | 'condo' | 'commercial' | 'manager' | 'hoa';

type SystemCondition = 'excellent' | 'good' | 'fair' | 'poor' | 'unknown';

interface BuildingSystem {
  id: string;
  name: string;
  category: 'structural' | 'mechanical' | 'electrical' | 'plumbing' | 'exterior' | 'safety';
  icon: any;
  installedYear: number | null;
  expectedLifespan: number; // years
  lastServiceDate: string | null;
  condition: SystemCondition;
  warrantyExpiry: string | null;
  notes: string;
  replacementCost: [number, number]; // [min, max]
}

interface PropertyProfile {
  id: string;
  name: string;
  address: string;
  type: PropertyType;
  yearBuilt: number | null;
  units: number;
  sqft: number;
  lotSize: string;
  parkingSpaces: number;
  hasStorage: boolean;
  hasLaundry: boolean;
  hasRooftop: boolean;
  hasOutdoorSpace: boolean;
  hasBasement: boolean;
  hasSolar: boolean;
  hasEVReady: boolean;
  zoning: string;
  currentIncome: number;
  operatingExpenses: number;
  reserveFund: number;
  occupancyRate: number;
  avgUtilityCost: number;
  lastInspectionDate: string | null;
  systems: BuildingSystem[];
  notes: string;
  createdAt: string;
}

interface HealthFactor {
  id: string;
  label: string;
  score: number; // 0–100
  weight: number; // sum to 1.0
  status: 'good' | 'warning' | 'critical';
  detail: string;
  action?: string;
}

interface CapitalItem {
  id: string;
  systemName: string;
  description: string;
  estimatedYear: number;
  costMin: number;
  costMax: number;
  priority: 'high' | 'medium' | 'low';
  canDefer: boolean;
}

type Tab = 'dashboard' | 'profile' | 'health' | 'capital' | 'revenue' | 'documents' | 'knowledge' | 'marketplace' | 'admin' | 'ads';

// ─── Building system templates ────────────────────────────────────────────────

function defaultSystems(yearBuilt: number | null): BuildingSystem[] {
  const y = yearBuilt || 1995;
  const age = new Date().getFullYear() - y;
  function cond(lifespan: number): SystemCondition {
    const pct = age / lifespan;
    if (pct < 0.4) return 'excellent';
    if (pct < 0.65) return 'good';
    if (pct < 0.85) return 'fair';
    return 'poor';
  }
  return [
    { id: 'roof', name: 'Roof', category: 'structural', icon: Home, installedYear: y, expectedLifespan: 25, lastServiceDate: null, condition: cond(25), warrantyExpiry: null, notes: '', replacementCost: [8000, 22000] },
    { id: 'hvac', name: 'HVAC System', category: 'mechanical', icon: Wind, installedYear: y + 2, expectedLifespan: 18, lastServiceDate: null, condition: cond(18), warrantyExpiry: null, notes: '', replacementCost: [5000, 14000] },
    { id: 'water-heater', name: 'Water Heater', category: 'plumbing', icon: Droplets, installedYear: y + 5, expectedLifespan: 12, lastServiceDate: null, condition: cond(12), warrantyExpiry: null, notes: '', replacementCost: [800, 3500] },
    { id: 'electrical', name: 'Electrical Panel', category: 'electrical', icon: Zap, installedYear: y, expectedLifespan: 40, lastServiceDate: null, condition: cond(40), warrantyExpiry: null, notes: '', replacementCost: [2500, 8000] },
    { id: 'plumbing', name: 'Plumbing / Pipes', category: 'plumbing', icon: Droplets, installedYear: y, expectedLifespan: 50, lastServiceDate: null, condition: cond(50), warrantyExpiry: null, notes: '', replacementCost: [4000, 18000] },
    { id: 'foundation', name: 'Foundation', category: 'structural', icon: Building2, installedYear: y, expectedLifespan: 100, lastServiceDate: null, condition: 'good', warrantyExpiry: null, notes: '', replacementCost: [5000, 40000] },
    { id: 'windows', name: 'Windows & Doors', category: 'exterior', icon: Eye, installedYear: y + 10, expectedLifespan: 20, lastServiceDate: null, condition: cond(20), warrantyExpiry: null, notes: '', replacementCost: [3000, 15000] },
    { id: 'fire-safety', name: 'Fire Safety Systems', category: 'safety', icon: Flame, installedYear: y + 3, expectedLifespan: 10, lastServiceDate: null, condition: cond(10), warrantyExpiry: null, notes: '', replacementCost: [500, 5000] },
  ];
}

function seedProfile(): PropertyProfile {
  const yearBuilt = 2001;
  return {
    id: 'prop-001',
    name: 'Maple Street Apartments',
    address: '44 Maple St, Concord, NH 03301',
    type: 'landlord',
    yearBuilt,
    units: 12,
    sqft: 11200,
    lotSize: '0.8 acres',
    parkingSpaces: 18,
    hasStorage: true,
    hasLaundry: true,
    hasRooftop: false,
    hasOutdoorSpace: true,
    hasBasement: true,
    hasSolar: false,
    hasEVReady: false,
    zoning: 'Residential Multi-Family',
    currentIncome: 18000,
    operatingExpenses: 7200,
    reserveFund: 45000,
    occupancyRate: 83,
    avgUtilityCost: 1800,
    lastInspectionDate: '2023-09-15',
    systems: defaultSystems(yearBuilt),
    notes: '',
    createdAt: new Date().toISOString(),
  };
}

// ─── Health Score engine ───────────────────────────────────────────────────────

function computeHealthFactors(p: PropertyProfile): HealthFactor[] {
  const now = new Date().getFullYear();

  // System condition factor
  const systemScores = p.systems.map(s => {
    const map: Record<SystemCondition, number> = { excellent: 100, good: 80, fair: 55, poor: 25, unknown: 50 };
    return map[s.condition];
  });
  const avgSystem = systemScores.length ? systemScores.reduce((a, b) => a + b, 0) / systemScores.length : 60;
  const poorSystems = p.systems.filter(s => s.condition === 'poor').length;

  // Occupancy factor
  const occupancyScore = p.type === 'homeowner' ? 100 : Math.min(100, p.occupancyRate * 1.1);

  // Reserve fund factor (months of expenses covered)
  const monthlyExp = p.operatingExpenses;
  const monthsCovered = monthlyExp > 0 ? p.reserveFund / monthlyExp : 0;
  const reserveScore = Math.min(100, (monthsCovered / 6) * 100);

  // Inspection recency
  let inspectionScore = 50;
  if (p.lastInspectionDate) {
    const monthsAgo = (Date.now() - new Date(p.lastInspectionDate).getTime()) / (1000 * 60 * 60 * 24 * 30);
    inspectionScore = monthsAgo < 12 ? 100 : monthsAgo < 24 ? 75 : monthsAgo < 36 ? 50 : 25;
  }

  // Energy / sustainability
  const energyScore = (p.hasSolar ? 30 : 0) + (p.hasEVReady ? 20 : 0) + (p.avgUtilityCost < 1500 ? 30 : p.avgUtilityCost < 2500 ? 20 : 10) + 20;

  // Financial health: NOI margin
  const noi = p.currentIncome - p.operatingExpenses;
  const noiMargin = p.currentIncome > 0 ? (noi / p.currentIncome) * 100 : 0;
  const financialScore = Math.min(100, Math.max(0, noiMargin * 2));

  return [
    {
      id: 'systems',
      label: 'Building Systems',
      score: Math.round(avgSystem),
      weight: 0.30,
      status: avgSystem >= 75 ? 'good' : avgSystem >= 50 ? 'warning' : 'critical',
      detail: `${p.systems.length} systems tracked. ${poorSystems > 0 ? `${poorSystems} in poor condition.` : 'No critical failures.'}`,
      action: poorSystems > 0 ? 'Schedule service for failing systems.' : undefined,
    },
    {
      id: 'occupancy',
      label: 'Occupancy & Utilization',
      score: Math.round(occupancyScore),
      weight: 0.20,
      status: occupancyScore >= 90 ? 'good' : occupancyScore >= 75 ? 'warning' : 'critical',
      detail: p.type === 'homeowner' ? 'Owner-occupied — full utilization.' : `${p.occupancyRate}% occupancy rate.`,
      action: occupancyScore < 80 ? 'Review pricing and marketing to improve vacancy.' : undefined,
    },
    {
      id: 'reserve',
      label: 'Financial Reserves',
      score: Math.round(reserveScore),
      weight: 0.20,
      status: reserveScore >= 80 ? 'good' : reserveScore >= 50 ? 'warning' : 'critical',
      detail: `Reserve fund covers ${monthsCovered.toFixed(1)} months of operating expenses. ${monthsCovered < 3 ? 'Below recommended 3–6 month minimum.' : 'Within healthy range.'}`,
      action: reserveScore < 60 ? 'Build reserve fund to at least 3 months of expenses.' : undefined,
    },
    {
      id: 'inspection',
      label: 'Inspection Currency',
      score: Math.round(inspectionScore),
      weight: 0.15,
      status: inspectionScore >= 75 ? 'good' : inspectionScore >= 50 ? 'warning' : 'critical',
      detail: p.lastInspectionDate ? `Last inspection: ${new Date(p.lastInspectionDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short' })}.` : 'No inspection date recorded.',
      action: inspectionScore < 75 ? 'Schedule a professional inspection. NH RSA 540 recommends annual property inspections for rental properties.' : undefined,
    },
    {
      id: 'energy',
      label: 'Energy & Sustainability',
      score: Math.round(energyScore),
      weight: 0.15,
      status: energyScore >= 70 ? 'good' : energyScore >= 45 ? 'warning' : 'critical',
      detail: `${p.hasSolar ? 'Solar installed. ' : 'No solar. '}${p.hasEVReady ? 'EV charging ready.' : 'No EV infrastructure.'}`,
      action: !p.hasSolar ? 'Eversource NH solar incentives + NH CDFA credits available.' : undefined,
    },
  ];
}

function computeHealthScore(factors: HealthFactor[]): number {
  return Math.round(factors.reduce((sum, f) => sum + f.score * f.weight, 0));
}

// ─── Capital Planning engine ───────────────────────────────────────────────────

function generateCapitalPlan(p: PropertyProfile): CapitalItem[] {
  const now = new Date().getFullYear();
  const items: CapitalItem[] = [];

  p.systems.forEach(s => {
    if (!s.installedYear) return;
    const age = now - s.installedYear;
    const remaining = s.expectedLifespan - age;
    const replaceYear = now + Math.max(0, remaining);

    if (remaining <= 10) {
      items.push({
        id: s.id,
        systemName: s.name,
        description: `Replacement due — ${age} years old, ${s.expectedLifespan}-year lifespan.`,
        estimatedYear: replaceYear,
        costMin: s.replacementCost[0],
        costMax: s.replacementCost[1],
        priority: remaining <= 2 ? 'high' : remaining <= 5 ? 'medium' : 'low',
        canDefer: s.condition !== 'poor',
      });
    }
  });

  items.sort((a, b) => a.estimatedYear - b.estimatedYear);
  return items;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const CONDITION_COLOR: Record<SystemCondition, string> = {
  excellent: 'text-green-400 border-green-500/30 bg-green-500/10',
  good: 'text-blue-400 border-blue-500/30 bg-blue-500/10',
  fair: 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10',
  poor: 'text-red-400 border-red-500/30 bg-red-500/10',
  unknown: 'text-gray-400 border-gray-500/30 bg-gray-500/10',
};

const SCORE_COLOR = (s: number) => s >= 80 ? '#4ade80' : s >= 60 ? '#fbbf24' : '#f87171';

function fmt$(n: number) { return `$${n.toLocaleString()}`; }

const PHASE_TABS: { id: Tab; label: string; icon: any; phase: number; live: boolean }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: Home, phase: 1, live: true },
  { id: 'profile', label: 'Property Profile', icon: Building2, phase: 1, live: true },
  { id: 'health', label: 'Health Score', icon: Activity, phase: 1, live: true },
  { id: 'capital', label: 'Capital Planning', icon: Calendar, phase: 1, live: true },
  { id: 'revenue', label: 'Revenue AI', icon: TrendingUp, phase: 1, live: true },
  { id: 'documents', label: 'Documents', icon: FileText, phase: 2, live: true },
  { id: 'knowledge', label: 'Knowledge Center', icon: BookOpen, phase: 4, live: true },
  { id: 'marketplace', label: 'Marketplace', icon: ShoppingBag, phase: 5, live: true },
  { id: 'admin', label: 'Product Admin', icon: Settings, phase: 5, live: true },
  { id: 'ads', label: 'Ad Creator', icon: Sparkles, phase: 5, live: true },
];

const CATEGORY_ICON: Record<string, any> = {
  structural: Building2, mechanical: Wind, electrical: Zap,
  plumbing: Droplets, exterior: Eye, safety: Flame,
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function ScoreGauge({ score }: { score: number }) {
  const color = SCORE_COLOR(score);
  const data = [{ value: score, fill: color }, { value: 100 - score, fill: '#1f1f1f' }];
  return (
    <div className="relative w-48 h-48 mx-auto">
      <ResponsiveContainer width="100%" height="100%">
        <RadialBarChart innerRadius="70%" outerRadius="100%" data={[{ value: score }]} startAngle={220} endAngle={-40}>
          <RadialBar dataKey="value" cornerRadius={8} fill={color} background={{ fill: '#1f1f1f' }} />
        </RadialBarChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-5xl font-black" style={{ color }}>{score}</span>
        <span className="text-xs text-gray-500 font-semibold mt-1">out of 100</span>
      </div>
    </div>
  );
}

function FactorBar({ factor }: { factor: HealthFactor }) {
  const color = factor.status === 'good' ? '#4ade80' : factor.status === 'warning' ? '#fbbf24' : '#f87171';
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-300 font-medium">{factor.label}</span>
        <span className="font-bold" style={{ color }}>{factor.score}</span>
      </div>
      <div className="w-full h-2 rounded-full bg-[#2A2A2A]">
        <div className="h-2 rounded-full transition-all duration-700" style={{ width: `${factor.score}%`, background: color }} />
      </div>
      <p className="text-xs text-gray-500">{factor.detail}</p>
      {factor.action && (
        <p className="text-xs text-amber-400 flex items-start gap-1.5">
          <AlertTriangle className="w-3 h-3 flex-shrink-0 mt-0.5" /> {factor.action}
        </p>
      )}
    </div>
  );
}

function SystemCard({
  sys, onEdit,
}: { sys: BuildingSystem; onEdit: (s: BuildingSystem) => void }) {
  const Icon = sys.icon || Building2;
  const now = new Date().getFullYear();
  const age = sys.installedYear ? now - sys.installedYear : null;
  const remaining = age !== null ? sys.expectedLifespan - age : null;
  const pct = remaining !== null ? Math.max(0, Math.min(100, (remaining / sys.expectedLifespan) * 100)) : 50;

  return (
    <div className="bg-[#111] border border-[#2A2A2A] rounded-xl p-4 hover:border-[#3A3A3A] transition space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#1A1A1A] border border-[#2A2A2A] flex items-center justify-center flex-shrink-0">
            <Icon className="w-4.5 h-4.5 text-gray-300" style={{ width: 18, height: 18 }} />
          </div>
          <div>
            <p className="font-semibold text-sm text-white">{sys.name}</p>
            <p className="text-xs text-gray-500 capitalize">{sys.category}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border capitalize ${CONDITION_COLOR[sys.condition]}`}>
            {sys.condition}
          </span>
          <button onClick={() => onEdit(sys)} className="p-1.5 rounded-lg hover:bg-[#2A2A2A] text-gray-500 hover:text-white transition">
            <Edit2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>{age !== null ? `${age} yrs old` : 'Age unknown'}</span>
          <span>{remaining !== null && remaining > 0 ? `~${remaining} yrs left` : remaining !== null ? 'Past lifespan' : '—'}</span>
        </div>
        <div className="w-full h-1.5 rounded-full bg-[#2A2A2A]">
          <div className="h-1.5 rounded-full transition-all" style={{
            width: `${pct}%`,
            background: pct > 50 ? '#4ade80' : pct > 25 ? '#fbbf24' : '#f87171',
          }} />
        </div>
      </div>

      <div className="flex items-center justify-between text-xs">
        <span className="text-gray-500">Replacement est.</span>
        <span className="text-gray-300 font-medium">{fmt$(sys.replacementCost[0])}–{fmt$(sys.replacementCost[1])}</span>
      </div>
    </div>
  );
}

function LockedTab({ tab }: { tab: typeof PHASE_TABS[0] }) {
  const Icon = tab.icon;
  return (
    <div className="flex flex-col items-center justify-center py-24 space-y-5 text-center">
      <div className="w-16 h-16 rounded-2xl bg-[#1A1A1A] border border-[#2A2A2A] flex items-center justify-center">
        <Lock className="w-7 h-7 text-gray-600" />
      </div>
      <div>
        <p className="text-lg font-bold text-white">{tab.label}</p>
        <p className="text-sm text-gray-500 mt-1">Coming in Phase {tab.phase}</p>
      </div>
      <div className="max-w-sm text-xs text-gray-600 leading-relaxed">
        {tab.id === 'documents' && 'Upload photos, PDFs, inspection reports, warranties, and manuals. The AI organizes everything, extracts key data, and builds a searchable property history.'}
        {tab.id === 'knowledge' && 'A premium digital library of guides, ebooks, checklists, and calculators for every property type — each with an AI companion trained specifically on that content.'}
        {tab.id === 'marketplace' && 'Buy and sell ebooks, templates, maintenance planners, AI-generated reports, and premium calculators. Supports subscriptions, one-time purchases, and licensing.'}
      </div>
      <span className="px-3 py-1.5 rounded-full text-xs font-bold border border-amber-500/30 text-amber-400 bg-amber-500/10">
        Phase {tab.phase} — Roadmap
      </span>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function PropertyAIEnterprise() {
  const [tab, setTab] = useState<Tab>('dashboard');
  const [profile, setProfile] = useState<PropertyProfile>(() => {
    try {
      const stored = localStorage.getItem('bp_pai_profile');
      return stored ? JSON.parse(stored) : seedProfile();
    } catch { return seedProfile(); }
  });
  const [editingSystem, setEditingSystem] = useState<BuildingSystem | null>(null);
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileDraft, setProfileDraft] = useState<PropertyProfile>(profile);
  const [showAddProperty, setShowAddProperty] = useState(false);

  const factors = useMemo(() => computeHealthFactors(profile), [profile]);
  const healthScore = useMemo(() => computeHealthScore(factors), [factors]);
  const capitalPlan = useMemo(() => generateCapitalPlan(profile), [profile]);

  const criticalCount = factors.filter(f => f.status === 'critical').length;
  const warningCount = factors.filter(f => f.status === 'warning').length;
  const poorSystems = profile.systems.filter(s => s.condition === 'poor');
  const urgentCapital = capitalPlan.filter(c => c.priority === 'high');
  const totalCapital5yr = capitalPlan.filter(c => c.estimatedYear <= new Date().getFullYear() + 5)
    .reduce((sum, c) => sum + (c.costMin + c.costMax) / 2, 0);

  // Hydrate from the server on mount (falls back to the localStorage-seeded
  // initial state above if nothing is stored server-side yet).
  useEffect(() => {
    (async () => {
      const saved = await loadDual('bp_pai_profile');
      if (saved && typeof saved === 'object') setProfile(saved);
    })();
  }, []);

  useEffect(() => {
    saveDual('bp_pai_profile', profile);
  }, [profile]);

  function saveProfileDraft() {
    setProfile(profileDraft);
    setEditingProfile(false);
    toast.success('Profile updated.');
  }

  function saveSystem(updated: BuildingSystem) {
    setProfile(prev => ({
      ...prev,
      systems: prev.systems.map(s => s.id === updated.id ? updated : s),
    }));
    setEditingSystem(null);
    toast.success(`${updated.name} updated.`);
  }

  const scoreColor = SCORE_COLOR(healthScore);
  const scoreLabel = healthScore >= 85 ? 'Excellent' : healthScore >= 70 ? 'Good' : healthScore >= 55 ? 'Fair' : 'Needs Attention';

  // ─── Trend data (simulated) ──────────────────────────────────────────────────
  const trendData = useMemo(() => {
    const base = healthScore;
    return ['Jan', 'Mar', 'May', 'Jul', 'Sep', 'Nov'].map((m, i) => ({
      month: m,
      score: Math.max(30, Math.min(100, base - 8 + i * 2 + (Math.random() * 4 - 2) | 0)),
    }));
  }, [healthScore]);

  // ─── Capital chart data ──────────────────────────────────────────────────────
  const capitalChartData = useMemo(() => {
    const now = new Date().getFullYear();
    const byYear: Record<number, number> = {};
    capitalPlan.forEach(c => {
      byYear[c.estimatedYear] = (byYear[c.estimatedYear] || 0) + (c.costMin + c.costMax) / 2;
    });
    return Array.from({ length: 10 }, (_, i) => ({
      year: String(now + i),
      cost: Math.round((byYear[now + i] || 0) / 1000),
    }));
  }, [capitalPlan]);

  return (
    <div style={{ width: '100%', minHeight: '100vh', background: '#0A0A0A', color: '#fff' }}>

      {/* Header */}
      <div style={{ background: '#111', borderBottom: '1px solid #1f1f1f', position: 'sticky', top: 0, zIndex: 40 }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-700 flex items-center justify-center">
                <Brain className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-black tracking-tight text-white">PropertyAI <span className="text-violet-400">Enterprise</span></h1>
                <p className="text-xs text-gray-500 font-medium">{profile.name} · {profile.address}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {(criticalCount > 0 || urgentCapital.length > 0) && (
                <div className="px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {criticalCount + urgentCapital.length} Alert{criticalCount + urgentCapital.length !== 1 ? 's' : ''}
                </div>
              )}
              <button onClick={() => setTab('dashboard')} className="p-2 rounded-lg bg-[#1A1A1A] border border-[#2A2A2A] text-gray-400 hover:text-white transition">
                <Bell className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Tab bar */}
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {PHASE_TABS.map(t => {
              const Icon = t.icon;
              const active = tab === t.id;
              return (
                <button key={t.id} onClick={() => setTab(t.id)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-lg whitespace-nowrap text-xs font-semibold transition flex-shrink-0 ${
                    active
                      ? 'bg-violet-600 text-white'
                      : t.live
                        ? 'bg-[#1A1A1A] border border-[#2A2A2A] text-gray-400 hover:text-white hover:border-violet-500/30'
                        : 'bg-[#0d0d0d] border border-[#1f1f1f] text-gray-600 cursor-pointer'
                  }`}>
                  {!t.live && <Lock className="w-3 h-3" />}
                  <Icon className="w-3.5 h-3.5" />{t.label}
                  {!t.live && <span className="ml-0.5 text-[9px] text-gray-600 font-bold">P{t.phase}</span>}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">

        {/* ── DASHBOARD ─────────────────────────────────────────────────────── */}
        {tab === 'dashboard' && (
          <div className="space-y-6">

            {/* KPI row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: 'Health Score', value: String(healthScore), sub: scoreLabel, icon: Activity, color: scoreColor, bg: 'bg-violet-500/10 border-violet-500/20' },
                { label: 'Capital Needed (5yr)', value: fmt$(Math.round(totalCapital5yr)), sub: `${capitalPlan.filter(c => c.estimatedYear <= new Date().getFullYear() + 5).length} items`, icon: Calendar, color: '#fbbf24', bg: 'bg-amber-500/10 border-amber-500/20' },
                { label: 'Systems Tracked', value: String(profile.systems.length), sub: `${poorSystems.length} need attention`, icon: Wrench, color: poorSystems.length > 0 ? '#f87171' : '#4ade80', bg: poorSystems.length > 0 ? 'bg-red-500/10 border-red-500/20' : 'bg-green-500/10 border-green-500/20' },
                { label: 'Monthly NOI', value: fmt$(profile.currentIncome - profile.operatingExpenses), sub: `${Math.round(((profile.currentIncome - profile.operatingExpenses) / (profile.currentIncome || 1)) * 100)}% margin`, icon: DollarSign, color: '#4ade80', bg: 'bg-green-500/10 border-green-500/20' },
              ].map((k, i) => {
                const Icon = k.icon;
                return (
                  <div key={i} className={`bg-[#111] rounded-xl border p-5 ${k.bg}`}>
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide">{k.label}</p>
                      <Icon className="w-4 h-4" style={{ color: k.color }} />
                    </div>
                    <p className="text-2xl font-black" style={{ color: k.color }}>{k.value}</p>
                    <p className="text-xs text-gray-500 mt-1">{k.sub}</p>
                  </div>
                );
              })}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

              {/* Health score center */}
              <div className="lg:col-span-1 bg-[#111] border border-[#2A2A2A] rounded-2xl p-6 flex flex-col items-center text-center space-y-4">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Property Health Score</p>
                <ScoreGauge score={healthScore} />
                <div>
                  <p className="text-xl font-black" style={{ color: scoreColor }}>{scoreLabel}</p>
                  <p className="text-xs text-gray-500 mt-1">{criticalCount} critical · {warningCount} warnings</p>
                </div>
                <button onClick={() => setTab('health')} className="w-full py-2.5 rounded-xl border border-violet-500/30 text-violet-400 hover:bg-violet-500/10 text-xs font-semibold transition flex items-center justify-center gap-1.5">
                  View Full Analysis <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Score trend */}
              <div className="lg:col-span-2 bg-[#111] border border-[#2A2A2A] rounded-2xl p-6 space-y-4">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Health Score Trend — 2025</p>
                <ResponsiveContainer width="100%" height={160}>
                  <AreaChart data={trendData}>
                    <defs>
                      <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="month" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis domain={[0, 100]} tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} width={30} />
                    <Tooltip contentStyle={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 8, color: '#fff', fontSize: 12 }} />
                    <Area type="monotone" dataKey="score" stroke="#7c3aed" strokeWidth={2.5} fill="url(#scoreGrad)" dot={{ fill: '#7c3aed', strokeWidth: 0, r: 4 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Alerts */}
            {(poorSystems.length > 0 || criticalCount > 0 || urgentCapital.length > 0) && (
              <div className="space-y-2">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Action Required</p>
                {poorSystems.map(s => (
                  <div key={s.id} className="flex items-start gap-3 p-4 bg-red-500/5 border border-red-500/20 rounded-xl">
                    <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-white">{s.name} — Poor Condition</p>
                      <p className="text-xs text-gray-400 mt-0.5">Estimated replacement: {fmt$(s.replacementCost[0])}–{fmt$(s.replacementCost[1])}. Schedule service before further deterioration.</p>
                    </div>
                    <button onClick={() => setTab('health')} className="ml-auto text-xs text-red-400 hover:underline whitespace-nowrap flex-shrink-0">View →</button>
                  </div>
                ))}
                {factors.filter(f => f.status === 'critical' && f.action).map(f => (
                  <div key={f.id} className="flex items-start gap-3 p-4 bg-amber-500/5 border border-amber-500/20 rounded-xl">
                    <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-white">{f.label}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{f.action}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Quick actions */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Health Score', desc: 'View full analysis', icon: Activity, target: 'health' as Tab },
                { label: 'Capital Plan', desc: '10-year forecast', icon: Calendar, target: 'capital' as Tab },
                { label: 'Revenue AI', desc: 'Identify opportunities', icon: TrendingUp, target: 'revenue' as Tab },
                { label: 'Edit Profile', desc: 'Update property info', icon: Edit2, target: 'profile' as Tab },
              ].map((a, i) => {
                const Icon = a.icon;
                return (
                  <button key={i} onClick={() => setTab(a.target)}
                    className="bg-[#111] border border-[#2A2A2A] hover:border-violet-500/30 rounded-xl p-4 text-left transition group">
                    <Icon className="w-5 h-5 text-violet-400 mb-3 group-hover:scale-110 transition-transform" />
                    <p className="text-sm font-semibold text-white">{a.label}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{a.desc}</p>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ── PROPERTY PROFILE ──────────────────────────────────────────────── */}
        {tab === 'profile' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">Property Profile</h2>
              {!editingProfile ? (
                <button onClick={() => { setProfileDraft(profile); setEditingProfile(true); }}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold transition">
                  <Edit2 className="w-4 h-4" /> Edit Profile
                </button>
              ) : (
                <div className="flex gap-2">
                  <button onClick={() => setEditingProfile(false)} className="px-4 py-2 rounded-xl bg-[#1A1A1A] border border-[#2A2A2A] text-gray-400 hover:text-white text-sm font-semibold transition">Cancel</button>
                  <button onClick={saveProfileDraft} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold transition">
                    <Save className="w-4 h-4" /> Save
                  </button>
                </div>
              )}
            </div>

            {/* Basic info */}
            <div className="bg-[#111] border border-[#2A2A2A] rounded-2xl p-6 space-y-4">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Basic Information</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { label: 'Property Name', key: 'name' as keyof PropertyProfile, type: 'text' },
                  { label: 'Address', key: 'address' as keyof PropertyProfile, type: 'text' },
                  { label: 'Year Built', key: 'yearBuilt' as keyof PropertyProfile, type: 'number' },
                  { label: 'Total Units', key: 'units' as keyof PropertyProfile, type: 'number' },
                  { label: 'Square Footage', key: 'sqft' as keyof PropertyProfile, type: 'number' },
                  { label: 'Lot Size', key: 'lotSize' as keyof PropertyProfile, type: 'text' },
                  { label: 'Parking Spaces', key: 'parkingSpaces' as keyof PropertyProfile, type: 'number' },
                  { label: 'Zoning', key: 'zoning' as keyof PropertyProfile, type: 'text' },
                ].map(field => (
                  <div key={field.key}>
                    <label className="block text-xs font-semibold text-gray-400 mb-1.5">{field.label}</label>
                    {editingProfile ? (
                      <input
                        type={field.type}
                        value={String(profileDraft[field.key] ?? '')}
                        onChange={e => setProfileDraft(prev => ({ ...prev, [field.key]: field.type === 'number' ? Number(e.target.value) : e.target.value }))}
                        className="w-full bg-[#0d0d0d] border border-[#2A2A2A] focus:border-violet-500 rounded-lg px-3 py-2.5 text-white text-sm outline-none transition"
                      />
                    ) : (
                      <p className="text-sm text-white bg-[#0d0d0d] rounded-lg px-3 py-2.5 border border-[#1f1f1f]">{String(profile[field.key] ?? '—')}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Financial */}
            <div className="bg-[#111] border border-[#2A2A2A] rounded-2xl p-6 space-y-4">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Financials</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: 'Monthly Income', key: 'currentIncome' as keyof PropertyProfile },
                  { label: 'Monthly Expenses', key: 'operatingExpenses' as keyof PropertyProfile },
                  { label: 'Reserve Fund', key: 'reserveFund' as keyof PropertyProfile },
                  { label: 'Avg Utility Cost', key: 'avgUtilityCost' as keyof PropertyProfile },
                ].map(field => (
                  <div key={field.key}>
                    <label className="block text-xs font-semibold text-gray-400 mb-1.5">{field.label}</label>
                    {editingProfile ? (
                      <input type="number" value={String(profileDraft[field.key] ?? '')}
                        onChange={e => setProfileDraft(prev => ({ ...prev, [field.key]: Number(e.target.value) }))}
                        className="w-full bg-[#0d0d0d] border border-[#2A2A2A] focus:border-violet-500 rounded-lg px-3 py-2.5 text-white text-sm outline-none transition" />
                    ) : (
                      <p className="text-sm text-white bg-[#0d0d0d] rounded-lg px-3 py-2.5 border border-[#1f1f1f]">{fmt$(profile[field.key] as number)}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Amenities toggles */}
            <div className="bg-[#111] border border-[#2A2A2A] rounded-2xl p-6 space-y-4">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Amenities & Features</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {([
                  ['hasStorage', 'Storage Units'],
                  ['hasLaundry', 'Laundry'],
                  ['hasRooftop', 'Rooftop Access'],
                  ['hasOutdoorSpace', 'Outdoor Space'],
                  ['hasBasement', 'Basement'],
                  ['hasSolar', 'Solar Panels'],
                  ['hasEVReady', 'EV Charging'],
                ] as [keyof PropertyProfile, string][]).map(([key, label]) => {
                  const val = editingProfile ? profileDraft[key] : profile[key];
                  return (
                    <button key={key}
                      onClick={() => editingProfile && setProfileDraft(prev => ({ ...prev, [key]: !prev[key] }))}
                      className={`flex items-center gap-2 p-3 rounded-xl border text-sm font-medium transition ${val ? 'border-violet-500/30 bg-violet-500/10 text-violet-300' : 'border-[#2A2A2A] bg-[#0d0d0d] text-gray-500'} ${editingProfile ? 'cursor-pointer hover:border-violet-500/50' : 'cursor-default'}`}>
                      <CheckCircle className={`w-4 h-4 flex-shrink-0 ${val ? 'text-violet-400' : 'text-gray-700'}`} />
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Building systems */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Building Systems</p>
                <span className="text-xs text-gray-500">{profile.systems.length} tracked</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {profile.systems.map(sys => (
                  <SystemCard key={sys.id} sys={sys} onEdit={setEditingSystem} />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── HEALTH SCORE ─────────────────────────────────────────────────── */}
        {tab === 'health' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Activity className="w-5 h-5 text-violet-400" /> Property Health Score
              </h2>
              <button onClick={() => toast.success('Health score recalculated.')} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#1A1A1A] border border-[#2A2A2A] hover:border-violet-500/30 text-gray-400 hover:text-white text-sm font-medium transition">
                <RefreshCw className="w-3.5 h-3.5" /> Recalculate
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Score */}
              <div className="bg-[#111] border border-[#2A2A2A] rounded-2xl p-8 flex flex-col items-center text-center space-y-4">
                <ScoreGauge score={healthScore} />
                <div>
                  <p className="text-2xl font-black" style={{ color: scoreColor }}>{scoreLabel}</p>
                  <p className="text-xs text-gray-500 mt-1">Updated {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                </div>
                <div className="w-full space-y-2 pt-2 border-t border-[#2A2A2A]">
                  {[
                    { label: 'Good', count: factors.filter(f => f.status === 'good').length, color: 'bg-green-400' },
                    { label: 'Warning', count: factors.filter(f => f.status === 'warning').length, color: 'bg-yellow-400' },
                    { label: 'Critical', count: factors.filter(f => f.status === 'critical').length, color: 'bg-red-400' },
                  ].map(item => (
                    <div key={item.label} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${item.color}`} />
                        <span className="text-gray-400">{item.label}</span>
                      </div>
                      <span className="font-bold text-white">{item.count}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Factors */}
              <div className="lg:col-span-2 bg-[#111] border border-[#2A2A2A] rounded-2xl p-6 space-y-6">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Score Breakdown</p>
                {factors.map(f => <FactorBar key={f.id} factor={f} />)}
              </div>
            </div>

            {/* System-level breakdown */}
            <div className="bg-[#111] border border-[#2A2A2A] rounded-2xl p-6 space-y-4">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Building System Health</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {profile.systems.map(sys => {
                  const score = { excellent: 100, good: 80, fair: 55, poor: 25, unknown: 50 }[sys.condition];
                  const color = SCORE_COLOR(score);
                  const Icon = sys.icon || Building2;
                  return (
                    <div key={sys.id} className="bg-[#0d0d0d] border border-[#1f1f1f] rounded-xl p-4 space-y-3">
                      <div className="flex items-center gap-2">
                        <Icon className="w-4 h-4 text-gray-400" />
                        <span className="text-sm font-semibold text-white">{sys.name}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-2xl font-black" style={{ color }}>{score}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border capitalize ${CONDITION_COLOR[sys.condition]}`}>{sys.condition}</span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-[#2A2A2A]">
                        <div className="h-1.5 rounded-full" style={{ width: `${score}%`, background: color }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* NH note */}
            <div className="bg-violet-500/5 border border-violet-500/20 rounded-xl p-5">
              <p className="text-sm font-semibold text-violet-400 mb-1">NH Property Intelligence Note</p>
              <p className="text-sm text-gray-300">NH RSA 540 requires rental properties to meet minimum habitability standards. Maintaining a Health Score above 70 indicates your property is well-managed from a maintenance and safety perspective. Low scores in Building Systems or Inspection Currency may create RSA 540 exposure — prioritize those factors first.</p>
            </div>
          </div>
        )}

        {/* ── CAPITAL PLANNING ─────────────────────────────────────────────── */}
        {tab === 'capital' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Calendar className="w-5 h-5 text-amber-400" /> Capital Planning — 10-Year Forecast
              </h2>
              <button onClick={() => toast.success('Capital plan exported.')} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#1A1A1A] border border-[#2A2A2A] hover:border-amber-500/30 text-gray-400 hover:text-white text-sm font-medium transition">
                <Download className="w-3.5 h-3.5" /> Export
              </button>
            </div>

            {/* Summary KPIs */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: 'Total 10-yr Capital', value: fmt$(Math.round(capitalPlan.reduce((s, c) => s + (c.costMin + c.costMax) / 2, 0))), color: '#fbbf24' },
                { label: 'Next 5 Years', value: fmt$(Math.round(totalCapital5yr)), color: '#f87171' },
                { label: 'High Priority Items', value: String(urgentCapital.length), color: '#f87171' },
                { label: 'Can Be Deferred', value: String(capitalPlan.filter(c => c.canDefer).length), color: '#4ade80' },
              ].map((k, i) => (
                <div key={i} className="bg-[#111] border border-[#2A2A2A] rounded-xl p-5">
                  <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide mb-2">{k.label}</p>
                  <p className="text-2xl font-black" style={{ color: k.color }}>{k.value}</p>
                </div>
              ))}
            </div>

            {/* Chart */}
            <div className="bg-[#111] border border-[#2A2A2A] rounded-2xl p-6 space-y-4">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Projected Capital Expenditure by Year ($K)</p>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={capitalChartData} barSize={28}>
                  <XAxis dataKey="year" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} width={35} />
                  <Tooltip contentStyle={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 8, color: '#fff', fontSize: 12 }} formatter={(v: any) => [`$${v}K`, 'Est. Cost']} />
                  <Bar dataKey="cost" radius={[4, 4, 0, 0]}>
                    {capitalChartData.map((entry, i) => (
                      <Cell key={i} fill={entry.cost > 20 ? '#f87171' : entry.cost > 8 ? '#fbbf24' : '#4ade80'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Item list */}
            {capitalPlan.length > 0 ? (
              <div className="space-y-3">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Replacement Timeline</p>
                {capitalPlan.map(item => {
                  const yearsOut = item.estimatedYear - new Date().getFullYear();
                  return (
                    <div key={item.id} className={`bg-[#111] border rounded-xl p-5 flex flex-wrap items-start justify-between gap-4 ${item.priority === 'high' ? 'border-red-500/20' : item.priority === 'medium' ? 'border-amber-500/20' : 'border-[#2A2A2A]'}`}>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-white">{item.systemName}</p>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${item.priority === 'high' ? 'border-red-500/30 text-red-400 bg-red-500/10' : item.priority === 'medium' ? 'border-amber-500/30 text-amber-400 bg-amber-500/10' : 'border-green-500/30 text-green-400 bg-green-500/10'}`}>
                            {item.priority.toUpperCase()}
                          </span>
                          {item.canDefer && <span className="px-2 py-0.5 rounded text-[10px] font-bold border border-blue-500/30 text-blue-400 bg-blue-500/10">Deferrable</span>}
                        </div>
                        <p className="text-xs text-gray-400">{item.description}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="font-black text-white text-lg">{item.estimatedYear}</p>
                        <p className="text-xs text-gray-500">{yearsOut <= 0 ? 'Due now' : `In ${yearsOut} yr${yearsOut !== 1 ? 's' : ''}`}</p>
                        <p className="text-xs text-amber-400 mt-1">{fmt$(item.costMin)}–{fmt$(item.costMax)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="bg-[#111] border border-[#2A2A2A] rounded-2xl p-10 text-center">
                <CheckCircle className="w-10 h-10 text-green-400 mx-auto mb-3" />
                <p className="font-semibold text-white">No major capital items in the next 10 years</p>
                <p className="text-sm text-gray-500 mt-1">Your building systems are in good shape. Keep up with regular maintenance to extend system lifespans.</p>
              </div>
            )}

            <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-5">
              <p className="text-sm font-semibold text-amber-400 mb-1">NH Capital Planning Note</p>
              <p className="text-sm text-gray-300">NH condo associations (RSA 356-B) are required to maintain a reserve fund adequate for anticipated capital expenditures. Use this plan as the basis for your annual reserve study update. NH CDFA offers low-interest financing for energy-related capital improvements.</p>
            </div>
          </div>
        )}

        {/* ── REVENUE AI ───────────────────────────────────────────────────── */}
        {tab === 'revenue' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-green-400" /> Revenue Intelligence
              </h2>
              <button
                onClick={() => { try { (window as any).__navigateApp('property-revenue'); } catch { toast.success('Navigate to Revenue Hub'); } }}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-green-600 hover:bg-green-500 text-white text-sm font-semibold transition">
                Open Full Revenue Hub <ArrowUpRight className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-green-500/5 border border-green-500/20 rounded-xl p-5">
              <p className="text-sm font-semibold text-green-400 mb-1">Integrated with PropertyRevenueHub</p>
              <p className="text-sm text-gray-300">Revenue AI is powered by a dedicated rules-based engine that evaluates your property profile against 14+ revenue opportunity categories. Open the full hub for detailed opportunity rankings, scenario modeling, and board-ready proposals.</p>
            </div>

            {/* Quick opportunity preview */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                { icon: Package, color: 'text-amber-400', bg: 'border-amber-500/20 bg-amber-500/5', name: 'Storage Locker Rentals', rev: '$3,600–$7,200/yr', match: profile.hasStorage || profile.hasBasement },
                { icon: Car, color: 'text-blue-400', bg: 'border-blue-500/20 bg-blue-500/5', name: 'Reserved Parking', rev: '$2,400–$6,000/yr', match: profile.parkingSpaces > (profile.units || 0) },
                { icon: Zap, color: 'text-green-400', bg: 'border-green-500/20 bg-green-500/5', name: 'EV Charging Stations', rev: '$1,800–$5,400/yr', match: !profile.hasEVReady },
                { icon: Wifi, color: 'text-purple-400', bg: 'border-purple-500/20 bg-purple-500/5', name: 'Bulk Internet Resale', rev: '$1,200–$3,600/yr', match: (profile.units || 0) >= 6 },
                { icon: Sun, color: 'text-yellow-400', bg: 'border-yellow-500/20 bg-yellow-500/5', name: 'Solar Installation', rev: '$2,400–$8,400/yr savings', match: !profile.hasSolar },
                { icon: Star, color: 'text-orange-400', bg: 'border-orange-500/20 bg-orange-500/5', name: 'Maintenance Subscriptions', rev: '$240–$720/yr per unit', match: true },
              ].filter(o => o.match).slice(0, 6).map((opp, i) => {
                const Icon = opp.icon;
                return (
                  <div key={i} className={`border rounded-xl p-5 ${opp.bg} space-y-3`}>
                    <div className="flex items-center gap-3">
                      <Icon className={`w-5 h-5 ${opp.color}`} />
                      <p className="font-semibold text-sm text-white">{opp.name}</p>
                    </div>
                    <p className="text-xs text-gray-400">{opp.rev}</p>
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-green-400">
                      <CheckCircle className="w-3 h-3" /> Matches your property
                    </span>
                  </div>
                );
              })}
            </div>

            <button
              onClick={() => { try { (window as any).__navigateApp('property-revenue'); } catch { toast.success('Navigate to Revenue Hub'); } }}
              className="w-full py-4 rounded-xl border border-green-500/30 text-green-400 hover:bg-green-500/10 transition text-sm font-semibold flex items-center justify-center gap-2">
              <ArrowUpRight className="w-4 h-4" /> View All Opportunities, Scenario Modeler & Proposals →
            </button>
          </div>
        )}

        {/* ── DOCUMENTS (Phase 2) ───────────────────────────────────────────── */}
        {tab === 'documents' && (
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-bold flex items-center gap-2">
                <FileText className="w-5 h-5 text-violet-400" /> Document Intelligence
              </h2>
              <p className="text-sm text-gray-400 mt-1">Upload documents and let AI organize, extract, and flag what's missing — all searchable and versioned.</p>
            </div>
            <PropertyDocuments />
          </div>
        )}

        {/* ── KNOWLEDGE CENTER (Phase 4) ────────────────────────────────────── */}
        {tab === 'knowledge' && (
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-bold flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-violet-400" /> Knowledge Center
              </h2>
              <p className="text-sm text-gray-400 mt-1">Professional guides with an AI learning companion — for every property type.</p>
            </div>
            <PropertyKnowledgeCenter />
          </div>
        )}

        {/* ── LOCKED PHASES ─────────────────────────────────────────────────── */}
        {tab === 'marketplace' && <PropertyMarketplace />}

        {/* ── PRODUCT ADMIN ─────────────────────────────────────────────────── */}
        {tab === 'admin' && <MarketplaceAdmin />}

        {/* ── AD CREATOR ────────────────────────────────────────────────────── */}
        {tab === 'ads' && <AdCreator />}

      </div>

      {/* System edit modal */}
      <AnimatePresence>
        {editingSystem && (
          <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setEditingSystem(null)} />
            <motion.div className="relative bg-[#111] border border-[#2A2A2A] rounded-2xl p-6 w-full max-w-md space-y-4 z-10"
              initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}>
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-lg">Edit — {editingSystem.name}</h3>
                <button onClick={() => setEditingSystem(null)} className="p-1.5 rounded-lg hover:bg-[#2A2A2A] text-gray-400"><X className="w-4 h-4" /></button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1.5">Year Installed</label>
                  <input type="number" value={editingSystem.installedYear ?? ''}
                    onChange={e => setEditingSystem(prev => prev ? { ...prev, installedYear: Number(e.target.value) } : prev)}
                    className="w-full bg-[#0d0d0d] border border-[#2A2A2A] focus:border-violet-500 rounded-lg px-3 py-2.5 text-white text-sm outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1.5">Condition</label>
                  <select value={editingSystem.condition}
                    onChange={e => setEditingSystem(prev => prev ? { ...prev, condition: e.target.value as SystemCondition } : prev)}
                    className="w-full bg-[#0d0d0d] border border-[#2A2A2A] focus:border-violet-500 rounded-lg px-3 py-2.5 text-white text-sm outline-none">
                    {(['excellent', 'good', 'fair', 'poor', 'unknown'] as SystemCondition[]).map(c => (
                      <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1.5">Last Service Date</label>
                  <input type="date" value={editingSystem.lastServiceDate ?? ''}
                    onChange={e => setEditingSystem(prev => prev ? { ...prev, lastServiceDate: e.target.value } : prev)}
                    className="w-full bg-[#0d0d0d] border border-[#2A2A2A] focus:border-violet-500 rounded-lg px-3 py-2.5 text-white text-sm outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1.5">Warranty Expiry</label>
                  <input type="date" value={editingSystem.warrantyExpiry ?? ''}
                    onChange={e => setEditingSystem(prev => prev ? { ...prev, warrantyExpiry: e.target.value } : prev)}
                    className="w-full bg-[#0d0d0d] border border-[#2A2A2A] focus:border-violet-500 rounded-lg px-3 py-2.5 text-white text-sm outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1.5">Notes</label>
                  <textarea value={editingSystem.notes}
                    onChange={e => setEditingSystem(prev => prev ? { ...prev, notes: e.target.value } : prev)}
                    rows={3}
                    className="w-full bg-[#0d0d0d] border border-[#2A2A2A] focus:border-violet-500 rounded-lg px-3 py-2.5 text-white text-sm outline-none resize-none" />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button onClick={() => setEditingSystem(null)} className="flex-1 py-2.5 rounded-xl bg-[#1A1A1A] border border-[#2A2A2A] text-gray-400 text-sm font-semibold">Cancel</button>
                <button onClick={() => editingSystem && saveSystem(editingSystem)} className="flex-1 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold transition">Save Changes</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
