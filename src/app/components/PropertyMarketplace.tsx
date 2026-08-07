/**
 * PropertyAI Enterprise — Phase 5: Marketplace
 * Digital product storefront for ebooks, templates, calculators,
 * AI-generated reports, maintenance packages, and bundles.
 * Cart → checkout flow with Stripe stub and purchase state via localStorage.
 */
import { useState, useMemo, useEffect } from 'react';
import {
  ShoppingBag, ShoppingCart, X, Search, Star,
  FileText, BookOpen, Calculator, BarChart3, Wrench,
  Layers, CheckCircle, ArrowRight, Download, ChevronRight,
  Zap, Shield, Lock, CreditCard, Package, Sparkles,
  TrendingUp, Home, Building2, DollarSign, Clock, Eye,
  Plus, Minus, Trash2, AlertCircle, Bot, Gift,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { projectId, publicAnonKey } from '../utils/supabase/info';

const SERVER = `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6`;

// ─── Types ────────────────────────────────────────────────────────────────────

type ProductCategory = 'ebook' | 'template' | 'calculator' | 'ai_report' | 'maintenance' | 'bundle';
type PricingModel = 'one_time' | 'subscription';

interface Product {
  id: string;
  category: ProductCategory;
  title: string;
  subtitle: string;
  description: string;
  features: string[];
  price: number; // cents
  originalPrice?: number; // for sale items
  pricingModel: PricingModel;
  audience: string[];
  rating: number;
  reviews: number;
  icon: any;
  color: string;
  bg: string;
  badge?: string;
  nhRelevant: boolean;
  popular?: boolean;
  preview?: string; // free preview text
  fileTypes?: string[]; // PDF, XLSX, etc.
  pages?: number;
  deliveryMethod: 'download' | 'generated' | 'interactive';
}

interface CartItem { product: Product; quantity: number; }

// ─── Product catalog ──────────────────────────────────────────────────────────

const PRODUCTS: Product[] = [
  // ── Ebooks ──────────────────────────────────────────────────────────────────
  {
    id: 'eb-landlord-ops',
    category: 'ebook', pricingModel: 'one_time',
    title: 'NH Landlord Operations Manual',
    subtitle: 'The complete legal and operational guide for NH landlords',
    description: 'A professionally authored 85-page guide covering every aspect of NH landlord operations — from RSA 540 compliance and tenant screening to lease drafting, habitability standards, and the eviction process. Written specifically for New Hampshire law.',
    features: ['RSA 540 and RSA 540-A compliance guide', 'NH-specific tenant screening framework', 'Sample lease clauses (NH-compliant)', 'Security deposit rules and timelines', 'Step-by-step eviction process flowchart', 'Habitability standards checklist', 'Vendor contract guidance'],
    price: 2900, audience: ['Landlords', 'Property Managers'],
    rating: 4.9, reviews: 142, icon: BookOpen, color: 'text-teal-400', bg: 'bg-teal-500/10 border-teal-500/20',
    badge: 'BESTSELLER', nhRelevant: true, popular: true,
    fileTypes: ['PDF', 'EPUB'], pages: 85, deliveryMethod: 'download',
    preview: 'Chapter 1 covers RSA 540 in plain English — no law degree required. Every NH landlord should understand their rights and obligations before accepting a first tenant.',
  },
  {
    id: 'eb-condo-board',
    category: 'ebook', pricingModel: 'one_time',
    title: 'Condo Board Governance Handbook',
    subtitle: 'Run your NH association with legal confidence',
    description: 'A 72-page guide for NH condo and HOA board members. Covers RSA 356-B in detail, board meeting procedures, fiduciary duties, budget governance, reserve funds, vendor contracts, and owner communication best practices.',
    features: ['RSA 356-B plain-English guide', 'Board meeting agenda and minute templates', 'Fiduciary duty explained', 'Special assessment procedures', 'Reserve fund adequacy framework', 'Vendor contract red flags', 'Owner dispute resolution'],
    price: 2400, audience: ['Condo Boards', 'HOA Boards', 'Property Managers'],
    rating: 4.8, reviews: 98, icon: Shield, color: 'text-violet-400', bg: 'bg-violet-500/10 border-violet-500/20',
    nhRelevant: true, popular: true,
    fileTypes: ['PDF'], pages: 72, deliveryMethod: 'download',
  },
  {
    id: 'eb-homeowner-guide',
    category: 'ebook', pricingModel: 'one_time',
    title: 'First-Time Homeowner Complete Guide',
    subtitle: 'Your first year of ownership — done right',
    description: 'Everything a new NH homeowner needs to know — from day one orientation to seasonal maintenance, building system understanding, emergency preparedness, and smart budgeting for the long term.',
    features: ['First 30-day orientation checklist', 'NH seasonal maintenance calendar', 'Building systems life expectancy chart', 'Emergency preparedness plan template', 'Annual budget worksheet', 'Eversource NH rebate guide', 'Contractor hiring checklist'],
    price: 1400, audience: ['Homeowners', 'First-Time Buyers'],
    rating: 4.7, reviews: 215, icon: Home, color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20',
    nhRelevant: true,
    fileTypes: ['PDF', 'EPUB'], pages: 58, deliveryMethod: 'download',
  },
  {
    id: 'eb-capital-planning',
    category: 'ebook', pricingModel: 'one_time',
    title: 'Capital Planning for Property Managers',
    subtitle: 'Forecast, fund, and execute large capital projects',
    description: 'A technical 45-page guide to 10-year capital planning for multi-family and commercial properties. Covers reserve study interpretation, funding models, project financing options, and special assessment management.',
    features: ['Reserve study interpretation guide', 'Straight-line vs. percent-funded models', 'Financing vs. special assessment analysis', 'NH CDFA financing overview', 'Project bidding and contractor selection', '10-year capital planning spreadsheet (Excel)', 'Owner communication templates'],
    price: 3400, audience: ['Property Managers', 'Condo Boards', 'Commercial Owners'],
    rating: 4.8, reviews: 67, icon: TrendingUp, color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/20',
    nhRelevant: true,
    fileTypes: ['PDF', 'XLSX'], pages: 45, deliveryMethod: 'download',
  },
  {
    id: 'eb-diy-repair',
    category: 'ebook', pricingModel: 'one_time',
    title: 'DIY Home Repair Encyclopedia',
    subtitle: 'Fix it yourself — safely and correctly',
    description: 'An illustrated 120-page guide to the most common home repairs. Covers plumbing basics, electrical safety, drywall, painting, weatherproofing, and NH-specific winterization — with clear step-by-step instructions.',
    features: ['100+ repair procedures with photos', 'NH winterization deep-dive', 'When to DIY vs. hire a pro (NH rules)', 'Tools required for each repair', 'Material cost estimates', 'Safety checklist for each category', 'Eversource NH weatherization rebates'],
    price: 2900, audience: ['Homeowners', 'DIY Enthusiasts'],
    rating: 4.6, reviews: 189, icon: Wrench, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20',
    nhRelevant: true,
    fileTypes: ['PDF'], pages: 120, deliveryMethod: 'download',
  },
  // ── Templates ────────────────────────────────────────────────────────────────
  {
    id: 'tmpl-nh-lease',
    category: 'template', pricingModel: 'one_time',
    title: 'NH Lease Agreement Template Pack',
    subtitle: 'Attorney-reviewed, RSA 540-compliant lease templates',
    description: 'A comprehensive template pack with three NH lease agreement formats: standard 12-month lease, month-to-month lease, and room rental agreement. All reviewed for RSA 540 compliance and including common NH-specific clauses.',
    features: ['Standard 12-month lease (RSA 540-compliant)', 'Month-to-month lease agreement', 'Room rental agreement', 'Pet addendum (NH law)', 'Move-in inspection checklist addendum', 'Security deposit receipt', 'Lead paint disclosure (pre-1978 properties)', 'Editable Word and PDF formats'],
    price: 4900, audience: ['Landlords'],
    rating: 4.9, reviews: 321, icon: FileText, color: 'text-green-400', bg: 'bg-green-500/10 border-green-500/20',
    badge: 'TOP RATED', nhRelevant: true, popular: true,
    fileTypes: ['DOCX', 'PDF'], deliveryMethod: 'download',
  },
  {
    id: 'tmpl-inspection',
    category: 'template', pricingModel: 'one_time',
    title: 'Property Inspection Report Template',
    subtitle: 'Document every unit condition with professional precision',
    description: 'A comprehensive move-in/move-out inspection template with room-by-room checklists, condition ratings, photo attachment slots, and signature fields. Designed specifically for NH landlord-tenant documentation requirements.',
    features: ['Room-by-room condition checklist (16 rooms/areas)', 'Numerical condition rating system', 'Photo documentation log', 'Dual-party signature section', 'Damage cost estimation worksheet', 'NH RSA 540-A compliance notes', 'Fillable PDF and Word formats'],
    price: 1900, audience: ['Landlords', 'Property Managers'],
    rating: 4.8, reviews: 178, icon: Eye, color: 'text-indigo-400', bg: 'bg-indigo-500/10 border-indigo-500/20',
    nhRelevant: true,
    fileTypes: ['PDF', 'DOCX'], deliveryMethod: 'download',
  },
  {
    id: 'tmpl-vendor-contract',
    category: 'template', pricingModel: 'one_time',
    title: 'Vendor Contract Template Pack',
    subtitle: 'Professional contracts for every property service',
    description: 'Five vendor contract templates for the most common property services: HVAC maintenance, landscaping/snow removal, cleaning, general handyman, and management agreement. Each includes insurance requirements, scope of work, and termination clauses.',
    features: ['HVAC maintenance agreement', 'Landscaping and snow removal contract', 'Cleaning services agreement', 'General handyman contract', 'Property management agreement', 'Certificate of insurance checklist', 'NH contractor license verification guide'],
    price: 5900, audience: ['Property Managers', 'Condo Boards', 'Landlords'],
    rating: 4.7, reviews: 94, icon: FileText, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20',
    nhRelevant: true,
    fileTypes: ['DOCX', 'PDF'], deliveryMethod: 'download',
  },
  {
    id: 'tmpl-board-meeting',
    category: 'template', pricingModel: 'one_time',
    title: 'Board Meeting Package',
    subtitle: 'Everything your association needs to run meetings professionally',
    description: 'A complete meeting package for condo and HOA boards: agenda template, minutes template, action item tracker, owner notification letter, proxy form, and annual meeting package.',
    features: ['Board meeting agenda template', 'Meeting minutes template (RSA 356-B compliant)', 'Action item tracker spreadsheet', 'Owner notification letter templates', 'Proxy voting form', 'Annual meeting package', 'Executive session documentation guide'],
    price: 2400, audience: ['Condo Boards', 'HOA Boards'],
    rating: 4.8, reviews: 112, icon: Layers, color: 'text-violet-400', bg: 'bg-violet-500/10 border-violet-500/20',
    nhRelevant: true,
    fileTypes: ['DOCX', 'XLSX', 'PDF'], deliveryMethod: 'download',
  },
  // ── Calculators ──────────────────────────────────────────────────────────────
  {
    id: 'calc-roi',
    category: 'calculator', pricingModel: 'one_time',
    title: 'Property ROI Calculator',
    subtitle: 'Analyze any investment in minutes',
    description: 'An interactive Excel-based calculator that models cash-on-cash return, cap rate, net operating income, debt service coverage, and 10-year equity growth for any residential or commercial property.',
    features: ['Cash-on-cash return model', 'Cap rate and NOI calculator', 'Mortgage amortization table', 'Vacancy and expense scenario modeling', '10-year equity projection', 'Comparison tool for multiple properties', 'NH-specific tax rate inputs'],
    price: 3900, audience: ['Real Estate Investors', 'Landlords', 'Commercial Owners'],
    rating: 4.9, reviews: 267, icon: Calculator, color: 'text-lime-400', bg: 'bg-lime-500/10 border-lime-500/20',
    badge: 'INTERACTIVE', nhRelevant: true, popular: true,
    fileTypes: ['XLSX'], deliveryMethod: 'download',
  },
  {
    id: 'calc-reserve',
    category: 'calculator', pricingModel: 'one_time',
    title: 'Reserve Fund Adequacy Calculator',
    subtitle: 'Know exactly where your reserve fund stands',
    description: 'A spreadsheet calculator that inventories your association\'s capital components, calculates current funding percentage, projects future funding under different contribution scenarios, and identifies the annual contribution needed to reach 100% funded.',
    features: ['Component inventory worksheet (50 line items)', 'Current percent-funded score', '3 funding scenario models', 'Annual contribution optimizer', 'Special assessment probability estimator', '10-year projection chart', 'Board presentation chart pack'],
    price: 2900, audience: ['Condo Boards', 'HOA Boards', 'Property Managers'],
    rating: 4.8, reviews: 83, icon: BarChart3, color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/20',
    nhRelevant: true,
    fileTypes: ['XLSX'], deliveryMethod: 'download',
  },
  {
    id: 'calc-ev-roi',
    category: 'calculator', pricingModel: 'one_time',
    title: 'EV Charging Revenue Calculator',
    subtitle: 'Model your EV charging ROI with Eversource NH rebates',
    description: 'Calculate the exact ROI on EV charging station installation for your property — accounting for Eversource NH rebates (up to $500/port), installation costs, usage rates, and annual revenue projections.',
    features: ['Eversource NH rebate calculator', 'Installation cost estimator', 'Revenue projection by port count', 'Payback period analysis', 'Pricing strategy comparison (flat/per-kWh/subscription)', 'NH net metering integration model', 'Comparison: residential vs. commercial chargers'],
    price: 1900, audience: ['Landlords', 'Condo Boards', 'Commercial Owners'],
    rating: 4.7, reviews: 56, icon: Zap, color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/20',
    nhRelevant: true,
    fileTypes: ['XLSX'], deliveryMethod: 'download',
  },
  {
    id: 'calc-rent-optimizer',
    category: 'calculator', pricingModel: 'one_time',
    title: 'Rental Pricing Optimizer',
    subtitle: 'Find the rent that maximizes NOI, not just revenue',
    description: 'A pricing model that helps landlords find the optimal rent by balancing vacancy risk against revenue maximization. Includes local NH market data inputs, seasonal adjustment factors, and unit-by-unit comparison.',
    features: ['Market rent comparison worksheet', 'Vacancy risk vs. revenue model', 'Seasonal adjustment factors', 'Unit-by-unit pricing matrix', 'Renewal vs. re-let decision tool', 'Concession value calculator', 'NH market benchmark inputs'],
    price: 2400, audience: ['Landlords', 'Property Managers'],
    rating: 4.6, reviews: 74, icon: DollarSign, color: 'text-green-400', bg: 'bg-green-500/10 border-green-500/20',
    nhRelevant: true,
    fileTypes: ['XLSX'], deliveryMethod: 'download',
  },
  // ── AI Reports ───────────────────────────────────────────────────────────────
  {
    id: 'rpt-health',
    category: 'ai_report', pricingModel: 'one_time',
    title: 'Custom Property Health Report',
    subtitle: 'AI-generated health analysis for your specific property',
    description: 'A personalized 20-page property health report generated from your PropertyAI profile data. Includes health score breakdown, system-by-system analysis, risk factors, priority action plan, and NH-specific recommendations.',
    features: ['Personalized health score analysis', 'System-by-system condition assessment', 'Risk factor prioritization', '90-day action plan', 'NH regulatory compliance checklist', 'Estimated cost of deferred maintenance', 'Comparable property benchmarks'],
    price: 7900, audience: ['All Property Types'],
    rating: 4.9, reviews: 38, icon: Bot, color: 'text-violet-400', bg: 'bg-violet-500/10 border-violet-500/20',
    badge: 'AI GENERATED', nhRelevant: true,
    fileTypes: ['PDF'], pages: 20, deliveryMethod: 'generated',
  },
  {
    id: 'rpt-revenue',
    category: 'ai_report', pricingModel: 'one_time',
    title: 'Revenue Opportunity Analysis Report',
    subtitle: 'Every revenue opportunity for your property, ranked',
    description: 'A custom 25-page revenue analysis generated from your property profile. Every opportunity is scored, ranked, and presented with implementation cost, payback period, confidence level, and NH-specific execution notes.',
    features: ['Full opportunity inventory (14+ categories)', 'ROI ranking with payback periods', 'Startup cost estimates', 'NH regulatory and incentive notes', 'Quick-win action plan (90 days)', 'Scenario modeling for top 3 opportunities', 'Board-ready executive summary'],
    price: 9900, audience: ['Landlords', 'Condo Boards', 'Commercial Owners', 'Property Managers'],
    rating: 4.9, reviews: 29, icon: TrendingUp, color: 'text-green-400', bg: 'bg-green-500/10 border-green-500/20',
    badge: 'AI GENERATED', nhRelevant: true, popular: true,
    fileTypes: ['PDF'], pages: 25, deliveryMethod: 'generated',
  },
  {
    id: 'rpt-capital',
    category: 'ai_report', pricingModel: 'one_time',
    title: '10-Year Capital Plan Report',
    subtitle: 'Your property\'s complete capital expenditure forecast',
    description: 'A custom 30-page capital planning report generated from your building systems data. Includes year-by-year expenditure forecast, funding gap analysis, recommended reserve contribution rate, and financing options.',
    features: ['10-year expenditure forecast by system', 'Funding gap analysis', 'Recommended annual reserve contribution', 'Three funding scenario models', 'NH CDFA financing options', 'Contingency planning framework', 'Board-ready presentation charts'],
    price: 12900, audience: ['Condo Boards', 'Commercial Owners', 'Property Managers'],
    rating: 4.8, reviews: 22, icon: BarChart3, color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/20',
    badge: 'AI GENERATED', nhRelevant: true,
    fileTypes: ['PDF'], pages: 30, deliveryMethod: 'generated',
  },
  // ── Maintenance Packages ─────────────────────────────────────────────────────
  {
    id: 'maint-winter',
    category: 'maintenance', pricingModel: 'one_time',
    title: 'NH Winter Prep Package',
    subtitle: 'The complete NH winterization system',
    description: 'Everything you need to prepare your NH property for winter — a 40-item winterization checklist, detailed guide for each task, contractor hiring checklist, emergency response plan, and Eversource NH rebate guide.',
    features: ['40-item winterization checklist', 'Task-by-task instruction guide', 'Heating system prep protocol', 'Pipe freeze prevention plan', 'Emergency contact and response plan', 'Eversource NH rebate guide', 'Ice dam prevention and response'],
    price: 3400, audience: ['Homeowners', 'Landlords', 'Property Managers'],
    rating: 4.9, reviews: 156, icon: Wrench, color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20',
    badge: 'NH ESSENTIAL', nhRelevant: true, popular: true,
    fileTypes: ['PDF', 'XLSX'], deliveryMethod: 'download',
  },
  {
    id: 'maint-annual',
    category: 'maintenance', pricingModel: 'one_time',
    title: 'Annual Property Maintenance Planner',
    subtitle: '12-month, task-by-task maintenance system',
    description: 'A comprehensive 12-month maintenance planner with monthly task checklists, contractor scheduling templates, budget tracking, and seasonal preparation guides — all tailored to NH\'s climate.',
    features: ['12-month task calendar (NH seasonal)', 'Monthly contractor scheduling templates', 'Maintenance budget tracker', 'Vendor contact log', 'System service history tracker', 'Emergency maintenance protocol', 'Annual summary report template'],
    price: 2400, audience: ['Homeowners', 'Landlords', 'Property Managers'],
    rating: 4.8, reviews: 203, icon: Clock, color: 'text-teal-400', bg: 'bg-teal-500/10 border-teal-500/20',
    nhRelevant: true,
    fileTypes: ['PDF', 'XLSX'], deliveryMethod: 'download',
  },
  // ── Bundles ──────────────────────────────────────────────────────────────────
  {
    id: 'bundle-landlord',
    category: 'bundle', pricingModel: 'one_time',
    title: 'NH Landlord Starter Bundle',
    subtitle: 'Everything a new NH landlord needs to get started right',
    description: 'The most comprehensive bundle for new NH landlords. Includes the Operations Manual ebook, NH Lease Agreement Template Pack, Property Inspection Report Template, and the Annual Maintenance Planner — everything you need before you accept your first tenant.',
    features: ['NH Landlord Operations Manual (ebook, $29)', 'NH Lease Agreement Template Pack ($49)', 'Property Inspection Report Template ($19)', 'Annual Property Maintenance Planner ($24)', 'Free 30-min PropertyAI onboarding session', 'NH RSA 540 quick-reference card (bonus)'],
    price: 8900, originalPrice: 12100, audience: ['Landlords'],
    rating: 4.9, reviews: 88, icon: Package, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20',
    badge: 'SAVE 27%', nhRelevant: true, popular: true,
    fileTypes: ['PDF', 'DOCX', 'XLSX'], deliveryMethod: 'download',
  },
  {
    id: 'bundle-condo',
    category: 'bundle', pricingModel: 'one_time',
    title: 'Condo Board Complete Package',
    subtitle: 'The full governance and financial toolkit for NH associations',
    description: 'The definitive bundle for NH condo and HOA boards. Includes the Board Handbook ebook, Board Meeting Package templates, Reserve Fund Adequacy Calculator, Reserve Planning Guide ebook, and Vendor Contract Template Pack.',
    features: ['Condo Board Governance Handbook (ebook, $24)', 'Board Meeting Package templates ($24)', 'Reserve Fund Adequacy Calculator ($29)', 'Reserve Planning Guide (ebook, $34)', 'Vendor Contract Template Pack ($59)', 'Capital Planning Guide (ebook, $34)'],
    price: 14900, originalPrice: 20400, audience: ['Condo Boards', 'HOA Boards'],
    rating: 4.9, reviews: 54, icon: Gift, color: 'text-violet-400', bg: 'bg-violet-500/10 border-violet-500/20',
    badge: 'SAVE 27%', nhRelevant: true,
    fileTypes: ['PDF', 'DOCX', 'XLSX'], deliveryMethod: 'download',
  },
  {
    id: 'bundle-pm-pro',
    category: 'bundle', pricingModel: 'one_time',
    title: 'Property Manager Pro Bundle',
    subtitle: 'The complete operating system for professional property managers',
    description: 'The most complete bundle available — designed for professional property managers who need legal templates, financial calculators, maintenance systems, and governance documents to run a multi-property portfolio at scale.',
    features: ['NH Landlord Operations Manual', 'NH Lease Agreement Template Pack', 'Vendor Contract Template Pack', 'Rental Pricing Optimizer calculator', 'Property ROI Calculator', 'Annual Maintenance Planner', 'Condo Board Governance Handbook', 'Capital Planning Guide', 'Revenue Opportunity Analysis Report (AI-generated)'],
    price: 19900, originalPrice: 29900, audience: ['Property Managers', 'Multi-Family Owners'],
    rating: 5.0, reviews: 31, icon: Sparkles, color: 'text-indigo-400', bg: 'bg-indigo-500/10 border-indigo-500/20',
    badge: 'BEST VALUE', nhRelevant: true, popular: true,
    fileTypes: ['PDF', 'DOCX', 'XLSX'], deliveryMethod: 'download',
  },
];

// ─── Config ────────────────────────────────────────────────────────────────────

const CAT_CONFIG: Record<ProductCategory, { label: string; icon: any; color: string }> = {
  ebook:       { label: 'Ebooks',           icon: BookOpen,    color: 'text-blue-400' },
  template:    { label: 'Templates',         icon: FileText,    color: 'text-green-400' },
  calculator:  { label: 'Calculators',       icon: Calculator,  color: 'text-lime-400' },
  ai_report:   { label: 'AI Reports',        icon: Bot,         color: 'text-violet-400' },
  maintenance: { label: 'Maintenance Packs', icon: Wrench,      color: 'text-teal-400' },
  bundle:      { label: 'Bundles',           icon: Package,     color: 'text-amber-400' },
};

const DELIVERY_LABEL: Record<string, string> = {
  download: 'Instant Download',
  generated: 'AI Generated (24hr)',
  interactive: 'Interactive Tool',
};

function fmt$(cents: number) {
  return `$${(cents / 100).toFixed(2).replace('.00', '')}`;
}

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1,2,3,4,5].map(i => (
        <Star key={i} className={`w-3 h-3 ${i <= Math.round(rating) ? 'text-amber-400 fill-amber-400' : 'text-gray-600'}`} />
      ))}
    </div>
  );
}

// ─── Checkout flow ─────────────────────────────────────────────────────────────

async function processCheckout(items: CartItem[], email: string, name: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const CHECKOUT_URL = `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6/marketplace/checkout`;
    const res = await fetch(CHECKOUT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${publicAnonKey}` },
      body: JSON.stringify({
        items: items.map(i => ({ id: i.product.id, title: i.product.title, price: i.product.price, qty: i.quantity })),
        email,
        name,
        successUrl: `${window.location.origin}/store?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
        cancelUrl: window.location.href,
      }),
    });
    const data = await res.json().catch(() => null);
    if (res.ok && data?.url) { window.location.href = data.url; return { ok: true }; }
    const error = data?.error || `Checkout could not be started (${res.status}).`;
    console.error('[PropertyMarketplace] checkout failed:', error);
    return { ok: false, error };
  } catch (err: any) {
    console.error('[PropertyMarketplace] checkout request threw:', err);
    return { ok: false, error: err?.message || 'Could not reach the payment processor.' };
  }
}

// ─── Main component ────────────────────────────────────────────────────────────

export default function PropertyMarketplace() {
  const [products, setProducts] = useState<Product[]>(PRODUCTS);
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState<ProductCategory | 'all'>('all');
  const [sortBy, setSortBy] = useState<'popular' | 'price_asc' | 'price_desc' | 'rating'>('popular');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [selected, setSelected] = useState<Product | null>(null);
  const [purchased, setPurchased] = useState<Set<string>>(() => {
    try { const r = localStorage.getItem('bp_mkt_purchased'); return r ? new Set(JSON.parse(r)) : new Set(); } catch { return new Set(); }
  });
  const [checkoutStep, setCheckoutStep] = useState<'cart' | 'details' | 'processing' | 'success'>('cart');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${SERVER}/marketplace/products`, {
          headers: { Authorization: `Bearer ${publicAnonKey}` },
        });
        if (res.ok) {
          const data = await res.json();
          const remote = (data.products || data) as any[];
          if (remote.length > 0) {
            // Map DB fields (snake_case) back to component shape, reuse icon from PRODUCTS fallback
            const mapped: Product[] = remote.map((r: any) => {
              const fallback = PRODUCTS.find(p => p.id === r.id);
              return {
                id: r.id,
                category: r.category,
                title: r.title,
                subtitle: r.subtitle || '',
                description: r.description || '',
                features: r.features || [],
                price: r.price,
                originalPrice: r.original_price,
                pricingModel: (r.pricing_model || 'one_time') as PricingModel,
                audience: r.audience || [],
                rating: parseFloat(r.rating) || 4.8,
                reviews: r.reviews || 0,
                icon: fallback?.icon || BookOpen,
                color: r.color || fallback?.color || 'text-orange-400',
                bg: fallback?.bg || 'bg-orange-500/10',
                badge: r.badge,
                nhRelevant: r.nh_relevant ?? true,
                popular: r.popular ?? false,
                preview: r.preview,
                fileTypes: r.file_types,
                pages: r.pages,
                deliveryMethod: (r.delivery_method || 'download') as Product['deliveryMethod'],
              };
            });
            setProducts(mapped);
            return;
          }
        }
      } catch {}
      // Fallback: try localStorage cache
      try {
        const cached = localStorage.getItem('bp_mkt_products');
        if (cached) setProducts(JSON.parse(cached));
      } catch {}
    })();
  }, []);

  // ── Cart helpers ─────────────────────────────────────────────────────────────
  function addToCart(product: Product) {
    if (purchased.has(product.id)) { toast.success('Already purchased — check your downloads.'); return; }
    setCart(prev => {
      const existing = prev.find(i => i.product.id === product.id);
      if (existing) return prev.map(i => i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { product, quantity: 1 }];
    });
    toast.success(`"${product.title}" added to cart.`);
    setShowCart(true);
  }

  function removeFromCart(id: string) { setCart(prev => prev.filter(i => i.product.id !== id)); }
  function updateQty(id: string, qty: number) {
    if (qty <= 0) { removeFromCart(id); return; }
    setCart(prev => prev.map(i => i.product.id === id ? { ...i, quantity: qty } : i));
  }

  const cartTotal = cart.reduce((s, i) => s + i.product.price * i.quantity, 0);
  const cartCount = cart.reduce((s, i) => s + i.quantity, 0);
  const cartSavings = cart.reduce((s, i) => s + ((i.product.originalPrice || i.product.price) - i.product.price) * i.quantity, 0);

  async function handleCheckout() {
    if (!email.trim() || !name.trim()) { toast.error('Please enter your name and email.'); return; }
    setCheckoutStep('processing');
    const result = await processCheckout(cart, email, name);
    if (!result.ok) {
      // Never grant products without a real payment — surface the failure and
      // return the shopper to their cart with everything intact.
      toast.error(`${result.error || 'Checkout failed.'} Nothing was charged — please try again.`);
      setCheckoutStep('cart');
    }
  }

  // ── Filtered catalog ─────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let list = products;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(p => p.title.toLowerCase().includes(q) || p.description.toLowerCase().includes(q) || p.features.some(f => f.toLowerCase().includes(q)));
    }
    if (catFilter !== 'all') list = list.filter(p => p.category === catFilter);
    return [...list].sort((a, b) => {
      if (sortBy === 'popular') return (b.popular ? 1 : 0) - (a.popular ? 1 : 0) || b.reviews - a.reviews;
      if (sortBy === 'price_asc') return a.price - b.price;
      if (sortBy === 'price_desc') return b.price - a.price;
      if (sortBy === 'rating') return b.rating - a.rating;
      return 0;
    });
  }, [products, search, catFilter, sortBy]);

  const featuredProducts = products.filter(p => p.popular).slice(0, 3);

  // ─── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search products…"
              className="bg-[#1A1A1A] border border-[#2A2A2A] focus:border-violet-500 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white outline-none transition w-56" />
          </div>
          <select value={sortBy} onChange={e => setSortBy(e.target.value as any)}
            className="bg-[#1A1A1A] border border-[#2A2A2A] text-sm text-gray-300 rounded-xl px-3 py-2.5 outline-none">
            <option value="popular">Most Popular</option>
            <option value="rating">Highest Rated</option>
            <option value="price_asc">Price: Low to High</option>
            <option value="price_desc">Price: High to Low</option>
          </select>
        </div>
        <button onClick={() => setShowCart(true)} className="relative flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold transition">
          <ShoppingCart className="w-4 h-4" />
          Cart
          {cartCount > 0 && (
            <span className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-amber-500 text-[10px] font-black text-black flex items-center justify-center">{cartCount}</span>
          )}
        </button>
      </div>

      {/* Category pills */}
      <div className="flex gap-2 flex-wrap">
        {([['all', 'All Products', ShoppingBag], ...Object.entries(CAT_CONFIG).map(([k, v]) => [k, v.label, v.icon])] as [string, string, any][]).map(([val, label, Icon]) => (
          <button key={val} onClick={() => setCatFilter(val as any)}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition border ${catFilter === val ? 'bg-violet-600 text-white border-violet-600' : 'bg-[#1A1A1A] border-[#2A2A2A] text-gray-400 hover:text-white'}`}>
            <Icon className="w-3.5 h-3.5" />{label}
          </button>
        ))}
      </div>

      {/* Featured strip (shown when no filter) */}
      {catFilter === 'all' && !search && (
        <div className="space-y-3">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Featured Products</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {featuredProducts.map(p => {
              const Icon = p.icon;
              const isPurchased = purchased.has(p.id);
              return (
                <div key={p.id} className={`relative bg-[#111] border rounded-2xl p-5 space-y-3 cursor-pointer hover:border-violet-500/40 transition ${p.bg}`}
                  onClick={() => setSelected(p)}>
                  {p.badge && <span className="absolute top-3 right-3 px-2 py-0.5 rounded-full text-[9px] font-black bg-amber-500 text-black">{p.badge}</span>}
                  <div className={`w-10 h-10 rounded-xl border flex items-center justify-center ${p.bg}`}>
                    <Icon className={`w-5 h-5 ${p.color}`} />
                  </div>
                  <div>
                    <p className="font-bold text-sm text-white leading-snug">{p.title}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{p.subtitle}</p>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-lg font-black text-white">{fmt$(p.price)}</span>
                      {p.originalPrice && <span className="text-xs text-gray-500 line-through ml-2">{fmt$(p.originalPrice)}</span>}
                    </div>
                    <button onClick={e => { e.stopPropagation(); isPurchased ? toast.success('Already purchased.') : addToCart(p); }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${isPurchased ? 'bg-green-500/10 border border-green-500/20 text-green-400' : 'bg-violet-600 hover:bg-violet-500 text-white'}`}>
                      {isPurchased ? <><CheckCircle className="w-3.5 h-3.5 inline mr-1" />Owned</> : 'Add to Cart'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Stats bar */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
        {[
          { label: 'Products', value: products.length },
          { label: 'Ebooks', value: products.filter(p => p.category === 'ebook').length },
          { label: 'Templates', value: products.filter(p => p.category === 'template').length },
          { label: 'Calculators', value: products.filter(p => p.category === 'calculator').length },
          { label: 'AI Reports', value: products.filter(p => p.category === 'ai_report').length },
          { label: 'Purchased', value: purchased.size },
        ].map((s, i) => (
          <div key={i} className="bg-[#111] border border-[#2A2A2A] rounded-xl px-3 py-3 text-center">
            <p className="text-lg font-black text-violet-400">{s.value}</p>
            <p className="text-[10px] text-gray-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Product grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.map(p => {
          const Icon = p.icon;
          const CatIcon = CAT_CONFIG[p.category].icon;
          const isPurchased = purchased.has(p.id);
          return (
            <div key={p.id}
              className={`relative bg-[#111] border rounded-2xl overflow-hidden hover:border-violet-500/30 transition flex flex-col group ${p.bg}`}>
              {p.badge && (
                <span className="absolute top-3 right-3 px-2 py-0.5 rounded-full text-[9px] font-black bg-amber-500 text-black z-10">{p.badge}</span>
              )}
              {isPurchased && (
                <span className="absolute top-3 left-3 flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black bg-green-500 text-black z-10">
                  <CheckCircle className="w-2.5 h-2.5" /> OWNED
                </span>
              )}

              <div className="p-5 flex-1 cursor-pointer" onClick={() => setSelected(p)}>
                <div className="flex items-start gap-3 mb-3">
                  <div className={`w-10 h-10 rounded-xl border flex items-center justify-center flex-shrink-0 ${p.bg}`}>
                    <Icon className={`w-5 h-5 ${p.color}`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <CatIcon className={`w-3 h-3 ${CAT_CONFIG[p.category].color}`} />
                      <span className={`text-[10px] font-bold uppercase tracking-wide ${CAT_CONFIG[p.category].color}`}>{CAT_CONFIG[p.category].label}</span>
                    </div>
                    <p className="font-bold text-sm text-white leading-snug">{p.title}</p>
                  </div>
                </div>

                <p className="text-xs text-gray-400 leading-relaxed mb-3 line-clamp-2">{p.subtitle}</p>

                <div className="flex items-center gap-3 mb-3">
                  <Stars rating={p.rating} />
                  <span className="text-xs text-gray-500">{p.rating} ({p.reviews})</span>
                </div>

                <div className="flex items-center gap-2 flex-wrap text-[10px] text-gray-500">
                  <span className="flex items-center gap-1"><Download className="w-3 h-3" />{DELIVERY_LABEL[p.deliveryMethod]}</span>
                  {p.fileTypes && <span className="flex items-center gap-1"><FileText className="w-3 h-3" />{p.fileTypes.join(' · ')}</span>}
                  {p.pages && <span>{p.pages} pages</span>}
                  {p.nhRelevant && <span className="text-violet-400 font-bold">NH-Specific</span>}
                </div>
              </div>

              <div className="px-5 pb-5 pt-0">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xl font-black text-white">{fmt$(p.price)}</span>
                    {p.originalPrice && (
                      <>
                        <span className="text-xs text-gray-500 line-through ml-2">{fmt$(p.originalPrice)}</span>
                        <span className="ml-2 text-[10px] font-bold text-green-400">Save {fmt$(p.originalPrice - p.price)}</span>
                      </>
                    )}
                  </div>
                  <button
                    onClick={() => isPurchased ? toast.success('Already purchased — check your downloads.') : addToCart(p)}
                    className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition ${isPurchased ? 'bg-green-500/10 border border-green-500/20 text-green-400' : 'bg-violet-600 hover:bg-violet-500 text-white'}`}>
                    {isPurchased ? <><CheckCircle className="w-3.5 h-3.5" />Owned</> : <><ShoppingCart className="w-3.5 h-3.5" />Add</>}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="bg-[#111] border border-[#2A2A2A] rounded-2xl p-10 text-center">
          <ShoppingBag className="w-10 h-10 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400 font-medium">No products match your search</p>
        </div>
      )}

      {/* Trust badges */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { icon: Lock, label: 'Secure Checkout', sub: 'Stripe-encrypted payments' },
          { icon: Download, label: 'Instant Delivery', sub: 'Downloads available immediately' },
          { icon: Shield, label: 'Satisfaction Guarantee', sub: '30-day money-back guarantee' },
          { icon: Bot, label: 'AI-Enhanced', sub: 'Reports generated for your property' },
        ].map((b, i) => {
          const Icon = b.icon;
          return (
            <div key={i} className="bg-[#111] border border-[#2A2A2A] rounded-xl p-4 flex items-center gap-3">
              <Icon className="w-5 h-5 text-violet-400 flex-shrink-0" />
              <div>
                <p className="text-xs font-semibold text-white">{b.label}</p>
                <p className="text-[10px] text-gray-500 mt-0.5">{b.sub}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Product detail panel */}
      <AnimatePresence>
        {selected && (
          <motion.div className="fixed inset-0 z-50 flex justify-end"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setSelected(null)} />
            <motion.div className="relative bg-[#111] border-l border-[#2A2A2A] w-full max-w-lg h-full overflow-y-auto z-10"
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 280 }}>

              <div className="sticky top-0 bg-[#111] border-b border-[#2A2A2A] px-6 py-4 flex items-center justify-between z-10">
                <span className={`text-xs font-bold uppercase tracking-wide ${CAT_CONFIG[selected.category].color}`}>{CAT_CONFIG[selected.category].label}</span>
                <button onClick={() => setSelected(null)} className="p-1.5 rounded-lg hover:bg-[#2A2A2A] text-gray-400"><X className="w-4 h-4" /></button>
              </div>

              <div className="px-6 py-6 space-y-6">
                {/* Hero */}
                <div className="space-y-3">
                  {selected.badge && <span className="inline-block px-2.5 py-1 rounded-full text-[10px] font-black bg-amber-500 text-black">{selected.badge}</span>}
                  <h2 className="text-xl font-black text-white leading-tight">{selected.title}</h2>
                  <p className="text-sm text-gray-400">{selected.subtitle}</p>
                  <div className="flex items-center gap-3">
                    <Stars rating={selected.rating} />
                    <span className="text-sm text-gray-400">{selected.rating} · {selected.reviews} reviews</span>
                  </div>
                </div>

                {/* Price block */}
                <div className="bg-[#0d0d0d] border border-[#2A2A2A] rounded-xl p-5 space-y-4">
                  <div className="flex items-end gap-3">
                    <span className="text-3xl font-black text-white">{fmt$(selected.price)}</span>
                    {selected.originalPrice && (
                      <>
                        <span className="text-lg text-gray-500 line-through">{fmt$(selected.originalPrice)}</span>
                        <span className="text-sm font-bold text-green-400">Save {fmt$(selected.originalPrice - selected.price)}</span>
                      </>
                    )}
                  </div>
                  <button
                    onClick={() => { addToCart(selected); setSelected(null); }}
                    disabled={purchased.has(selected.id)}
                    className={`w-full py-3.5 rounded-xl font-bold text-sm transition flex items-center justify-center gap-2 ${purchased.has(selected.id) ? 'bg-green-500/10 border border-green-500/20 text-green-400 cursor-default' : 'bg-violet-600 hover:bg-violet-500 text-white'}`}>
                    {purchased.has(selected.id)
                      ? <><CheckCircle className="w-4 h-4" />Already Purchased — Download Ready</>
                      : <><ShoppingCart className="w-4 h-4" />Add to Cart</>}
                  </button>
                  <div className="flex items-center justify-center gap-4 text-[10px] text-gray-500">
                    <span className="flex items-center gap-1"><Lock className="w-3 h-3" />Secure checkout</span>
                    <span className="flex items-center gap-1"><Download className="w-3 h-3" />{DELIVERY_LABEL[selected.deliveryMethod]}</span>
                    <span className="flex items-center gap-1"><Shield className="w-3 h-3" />30-day guarantee</span>
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Description</p>
                  <p className="text-sm text-gray-300 leading-relaxed">{selected.description}</p>
                </div>

                {/* Preview */}
                {selected.preview && (
                  <div className="bg-violet-500/5 border border-violet-500/20 rounded-xl p-4">
                    <p className="text-xs font-bold text-violet-400 mb-1.5">Free Preview</p>
                    <p className="text-xs text-gray-300 leading-relaxed italic">{selected.preview}</p>
                  </div>
                )}

                {/* What's included */}
                <div className="space-y-3">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">What's Included</p>
                  {selected.features.map((f, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-gray-300">{f}</p>
                    </div>
                  ))}
                </div>

                {/* Metadata */}
                <div className="bg-[#0d0d0d] border border-[#2A2A2A] rounded-xl p-4 space-y-2">
                  {[
                    { label: 'Format', value: selected.fileTypes?.join(', ') || '—' },
                    { label: 'Delivery', value: DELIVERY_LABEL[selected.deliveryMethod] },
                    ...(selected.pages ? [{ label: 'Pages', value: String(selected.pages) }] : []),
                    { label: 'Best for', value: selected.audience.join(', ') },
                    { label: 'NH-Specific', value: selected.nhRelevant ? 'Yes — includes NH law references' : 'General guidance' },
                  ].map((row, i) => (
                    <div key={i} className="flex justify-between text-xs">
                      <span className="text-gray-500">{row.label}</span>
                      <span className="text-gray-300 font-medium text-right max-w-[60%]">{row.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cart / Checkout panel */}
      <AnimatePresence>
        {showCart && (
          <motion.div className="fixed inset-0 z-50 flex justify-end"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => { setShowCart(false); setCheckoutStep('cart'); }} />
            <motion.div className="relative bg-[#111] border-l border-[#2A2A2A] w-full max-w-md h-full overflow-y-auto z-10 flex flex-col"
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 280 }}>

              <div className="sticky top-0 bg-[#111] border-b border-[#2A2A2A] px-5 py-4 flex items-center justify-between z-10 flex-shrink-0">
                <h3 className="font-bold text-white flex items-center gap-2">
                  <ShoppingCart className="w-4 h-4 text-violet-400" />
                  {checkoutStep === 'cart' ? `Cart (${cartCount})` : checkoutStep === 'details' ? 'Checkout' : checkoutStep === 'processing' ? 'Processing…' : 'Order Complete!'}
                </h3>
                <button onClick={() => { setShowCart(false); setCheckoutStep('cart'); }} className="p-1.5 rounded-lg hover:bg-[#2A2A2A] text-gray-400"><X className="w-4 h-4" /></button>
              </div>

              <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">

                {/* ── Cart step ────────────────────────────────────────────── */}
                {checkoutStep === 'cart' && (
                  <>
                    {cart.length === 0 ? (
                      <div className="text-center py-16 space-y-3">
                        <ShoppingCart className="w-12 h-12 text-gray-600 mx-auto" />
                        <p className="text-gray-400 font-medium">Your cart is empty</p>
                        <button onClick={() => setShowCart(false)} className="text-violet-400 text-sm hover:underline">Browse products</button>
                      </div>
                    ) : (
                      <>
                        {cart.map(item => (
                          <div key={item.product.id} className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-4 flex items-start gap-4">
                            <div className={`w-10 h-10 rounded-xl border flex items-center justify-center flex-shrink-0 ${item.product.bg}`}>
                              {(() => { const Icon = item.product.icon; return <Icon className={`w-5 h-5 ${item.product.color}`} />; })()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-sm text-white leading-snug">{item.product.title}</p>
                              <p className="text-xs text-gray-500 mt-0.5">{CAT_CONFIG[item.product.category].label}</p>
                              <div className="flex items-center gap-3 mt-2">
                                <div className="flex items-center gap-2 bg-[#0d0d0d] border border-[#2A2A2A] rounded-lg">
                                  <button onClick={() => updateQty(item.product.id, item.quantity - 1)} className="p-1.5 hover:text-white text-gray-500 transition"><Minus className="w-3 h-3" /></button>
                                  <span className="text-sm text-white font-medium w-5 text-center">{item.quantity}</span>
                                  <button onClick={() => updateQty(item.product.id, item.quantity + 1)} className="p-1.5 hover:text-white text-gray-500 transition"><Plus className="w-3 h-3" /></button>
                                </div>
                                <button onClick={() => removeFromCart(item.product.id)} className="text-gray-600 hover:text-red-400 transition"><Trash2 className="w-3.5 h-3.5" /></button>
                              </div>
                            </div>
                            <span className="font-bold text-white text-sm flex-shrink-0">{fmt$(item.product.price * item.quantity)}</span>
                          </div>
                        ))}

                        {cartSavings > 0 && (
                          <div className="bg-green-500/5 border border-green-500/20 rounded-xl px-4 py-3 text-sm text-green-400 flex items-center justify-between">
                            <span className="font-medium">Bundle savings</span>
                            <span className="font-bold">−{fmt$(cartSavings)}</span>
                          </div>
                        )}

                        <div className="bg-[#0d0d0d] border border-[#2A2A2A] rounded-xl px-4 py-3 space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-400">Subtotal</span>
                            <span className="text-white font-semibold">{fmt$(cartTotal)}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-400">Digital delivery</span>
                            <span className="text-green-400 font-semibold">Free</span>
                          </div>
                          <div className="border-t border-[#2A2A2A] pt-2 flex justify-between font-bold">
                            <span className="text-white">Total</span>
                            <span className="text-white text-lg">{fmt$(cartTotal)}</span>
                          </div>
                        </div>
                      </>
                    )}
                  </>
                )}

                {/* ── Details step ─────────────────────────────────────────── */}
                {checkoutStep === 'details' && (
                  <div className="space-y-4">
                    <p className="text-xs text-gray-500">Enter your details to complete your purchase. Downloads will be emailed to you.</p>
                    <div>
                      <label className="block text-xs font-semibold text-gray-400 mb-1.5">Full Name</label>
                      <input value={name} onChange={e => setName(e.target.value)} placeholder="Your name"
                        className="w-full bg-[#0d0d0d] border border-[#2A2A2A] focus:border-violet-500 rounded-xl px-4 py-3 text-white text-sm outline-none transition" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-400 mb-1.5">Email Address</label>
                      <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com"
                        className="w-full bg-[#0d0d0d] border border-[#2A2A2A] focus:border-violet-500 rounded-xl px-4 py-3 text-white text-sm outline-none transition" />
                    </div>
                    <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4 flex items-start gap-3">
                      <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-gray-300">Payment is processed securely via Stripe. Your card details never touch our servers. Downloads are delivered instantly after payment.</p>
                    </div>
                    <div className="bg-[#0d0d0d] border border-[#2A2A2A] rounded-xl px-4 py-3 flex items-center justify-between">
                      <span className="text-sm text-gray-400 font-medium">Order Total</span>
                      <span className="text-xl font-black text-white">{fmt$(cartTotal)}</span>
                    </div>
                  </div>
                )}

                {/* ── Processing step ──────────────────────────────────────── */}
                {checkoutStep === 'processing' && (
                  <div className="flex flex-col items-center justify-center py-16 space-y-5">
                    <div className="w-16 h-16 rounded-2xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center">
                      <CreditCard className="w-8 h-8 text-violet-400 animate-pulse" />
                    </div>
                    <div className="text-center">
                      <p className="font-bold text-white text-lg">Processing Payment…</p>
                      <p className="text-sm text-gray-400 mt-1">Please wait — do not close this window.</p>
                    </div>
                    <div className="flex gap-1.5">
                      {[0,1,2].map(i => (
                        <div key={i} className="w-2 h-2 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                      ))}
                    </div>
                  </div>
                )}

                {/* ── Success step ─────────────────────────────────────────── */}
                {checkoutStep === 'success' && (
                  <div className="flex flex-col items-center justify-center py-10 space-y-5 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-green-500/15 border border-green-500/30 flex items-center justify-center">
                      <CheckCircle className="w-8 h-8 text-green-400" />
                    </div>
                    <div>
                      <p className="font-black text-white text-xl">Order Complete!</p>
                      <p className="text-sm text-gray-400 mt-1">Your downloads are ready. A receipt has been sent to {email || 'your email'}.</p>
                    </div>
                    <div className="w-full space-y-2">
                      <button onClick={() => { setShowCart(false); setCheckoutStep('cart'); }}
                        className="w-full py-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-sm transition">
                        Continue Shopping
                      </button>
                      <p className="text-xs text-gray-600 mt-2">All purchased products appear with a green "OWNED" badge in the catalog.</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Cart footer CTAs */}
              {cart.length > 0 && (checkoutStep === 'cart' || checkoutStep === 'details') && (
                <div className="border-t border-[#2A2A2A] px-5 py-4 space-y-2 flex-shrink-0">
                  {checkoutStep === 'cart' && (
                    <button onClick={() => setCheckoutStep('details')}
                      className="w-full py-3.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold text-sm transition flex items-center justify-center gap-2">
                      Checkout — {fmt$(cartTotal)} <ArrowRight className="w-4 h-4" />
                    </button>
                  )}
                  {checkoutStep === 'details' && (
                    <>
                      <button onClick={handleCheckout}
                        className="w-full py-3.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold text-sm transition flex items-center justify-center gap-2">
                        <Lock className="w-4 h-4" /> Pay {fmt$(cartTotal)} Securely
                      </button>
                      <button onClick={() => setCheckoutStep('cart')} className="w-full py-2.5 text-gray-500 hover:text-white text-sm transition">
                        ← Back to Cart
                      </button>
                    </>
                  )}
                  <div className="flex items-center justify-center gap-1.5 text-[10px] text-gray-600">
                    <Lock className="w-3 h-3" /> SSL encrypted · Powered by Stripe · 30-day guarantee
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
