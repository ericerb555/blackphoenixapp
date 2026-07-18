/**
 * Marketplace Admin — Owner-facing product management panel.
 * Create, edit, price, toggle visibility, and organize all digital products.
 * Products saved to localStorage under bp_mkt_products (overrides catalog defaults).
 */
import { useState, useEffect, useMemo } from 'react';
import {
  Plus, Edit2, Trash2, Eye, EyeOff, Save, X, Search,
  Package, BookOpen, FileText, Calculator, BarChart3, Wrench,
  Layers, CheckCircle, AlertCircle, DollarSign, Tag, Star,
  ChevronDown, ChevronUp, ToggleLeft, ToggleRight, Copy,
  ArrowUp, ArrowDown, Shield, Upload, Grid, List,
  TrendingUp, Zap, Gift, RefreshCw, Home,
} from 'lucide-react';
import { toast } from 'sonner';
import { projectId, publicAnonKey } from '../utils/supabase/info';

const API = `https://${projectId}.supabase.co/functions/v1/make-server-57095a78`;
const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${publicAnonKey}` };

// ─── Types ────────────────────────────────────────────────────────────────────

type ProductCategory = 'ebook' | 'template' | 'calculator' | 'ai_report' | 'maintenance' | 'bundle';
type PricingModel = 'one_time' | 'subscription';
type DeliveryMethod = 'download' | 'generated' | 'interactive';

interface AdminProduct {
  id: string;
  category: ProductCategory;
  title: string;
  subtitle: string;
  description: string;
  features: string[];
  price: number; // cents
  originalPrice?: number;
  pricingModel: PricingModel;
  audience: string[];
  rating: number;
  reviews: number;
  color: string;
  badge?: string;
  nhRelevant: boolean;
  popular?: boolean;
  preview?: string;
  fileTypes: string[];
  pages?: number;
  deliveryMethod: DeliveryMethod;
  visible: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

const STORAGE_KEY = 'bp_mkt_products';
const CATEGORY_META: Record<ProductCategory, { label: string; icon: any; color: string; bg: string }> = {
  ebook:       { label: 'Ebook',        icon: BookOpen,    color: 'text-blue-400',    bg: 'bg-blue-500/10 border-blue-500/20' },
  template:    { label: 'Template',     icon: FileText,    color: 'text-green-400',   bg: 'bg-green-500/10 border-green-500/20' },
  calculator:  { label: 'Calculator',   icon: Calculator,  color: 'text-lime-400',    bg: 'bg-lime-500/10 border-lime-500/20' },
  ai_report:   { label: 'AI Report',    icon: BarChart3,   color: 'text-violet-400',  bg: 'bg-violet-500/10 border-violet-500/20' },
  maintenance: { label: 'Maintenance',  icon: Wrench,      color: 'text-amber-400',   bg: 'bg-amber-500/10 border-amber-500/20' },
  bundle:      { label: 'Bundle',       icon: Layers,      color: 'text-orange-400',  bg: 'bg-orange-500/10 border-orange-500/20' },
};

const DEFAULT_PRODUCTS: AdminProduct[] = [
  {
    id: 'eb-landlord-ops', category: 'ebook', pricingModel: 'one_time', deliveryMethod: 'download',
    title: 'NH Landlord Operations Manual', subtitle: 'The complete legal and operational guide for NH landlords',
    description: 'A professionally authored 85-page guide covering every aspect of NH landlord operations — from RSA 540 compliance and tenant screening to lease drafting, habitability standards, and the eviction process.',
    features: ['RSA 540 and RSA 540-A compliance guide', 'NH-specific tenant screening framework', 'Sample lease clauses (NH-compliant)', 'Security deposit rules and timelines', 'Step-by-step eviction process flowchart', 'Habitability standards checklist', 'Vendor contract guidance'],
    price: 2900, audience: ['Landlords', 'Property Managers'], rating: 4.9, reviews: 142,
    color: 'text-teal-400', badge: 'BESTSELLER', nhRelevant: true, popular: true,
    fileTypes: ['PDF', 'EPUB'], pages: 85, visible: true, sortOrder: 1,
    createdAt: '2026-01-01', updatedAt: '2026-07-01',
  },
  {
    id: 'eb-condo-board', category: 'ebook', pricingModel: 'one_time', deliveryMethod: 'download',
    title: 'Condo Board Governance Handbook', subtitle: 'Run your NH association with legal confidence',
    description: 'A 72-page guide for NH condo and HOA board members. Covers RSA 356-B in detail, board meeting procedures, fiduciary duties, budget governance, reserve funds, vendor contracts, and owner communication.',
    features: ['RSA 356-B plain-English guide', 'Board meeting agenda and minute templates', 'Fiduciary duty explained', 'Special assessment procedures', 'Reserve fund adequacy framework', 'Vendor contract red flags', 'Owner dispute resolution'],
    price: 2400, audience: ['Condo Boards', 'HOA Boards', 'Property Managers'], rating: 4.8, reviews: 98,
    color: 'text-violet-400', nhRelevant: true, popular: true,
    fileTypes: ['PDF'], pages: 72, visible: true, sortOrder: 2,
    createdAt: '2026-01-01', updatedAt: '2026-07-01',
  },
  {
    id: 'eb-homeowner-guide', category: 'ebook', pricingModel: 'one_time', deliveryMethod: 'download',
    title: 'First-Time Homeowner Complete Guide', subtitle: 'Your first year of ownership — done right',
    description: 'Everything a new NH homeowner needs to know — from day one orientation to seasonal maintenance, building systems, emergency preparedness, and smart budgeting.',
    features: ['First 30-day orientation checklist', 'NH seasonal maintenance calendar', 'Building systems life expectancy chart', 'Emergency preparedness plan template', 'Annual budget worksheet', 'Eversource NH rebate guide', 'Contractor hiring checklist'],
    price: 1400, audience: ['Homeowners', 'First-Time Buyers'], rating: 4.7, reviews: 215,
    color: 'text-blue-400', nhRelevant: true,
    fileTypes: ['PDF', 'EPUB'], pages: 58, visible: true, sortOrder: 3,
    createdAt: '2026-01-01', updatedAt: '2026-07-01',
  },
  {
    id: 'eb-capital-planning', category: 'ebook', pricingModel: 'one_time', deliveryMethod: 'download',
    title: 'Capital Planning for Property Managers', subtitle: 'Forecast, fund, and execute large capital projects',
    description: 'A technical 45-page guide to 10-year capital planning for multi-family and commercial properties. Covers reserve study interpretation, funding models, project financing, and special assessment management.',
    features: ['Reserve study interpretation guide', 'Straight-line vs. percent-funded models', 'Financing vs. special assessment analysis', 'NH CDFA financing overview', 'Project bidding and contractor selection', '10-year capital planning spreadsheet', 'Owner communication templates'],
    price: 3400, audience: ['Property Managers', 'Condo Boards', 'Commercial Owners'], rating: 4.8, reviews: 67,
    color: 'text-orange-400', nhRelevant: true,
    fileTypes: ['PDF', 'XLSX'], pages: 45, visible: true, sortOrder: 4,
    createdAt: '2026-01-01', updatedAt: '2026-07-01',
  },
  {
    id: 'eb-diy-repair', category: 'ebook', pricingModel: 'one_time', deliveryMethod: 'download',
    title: 'DIY Home Repair Encyclopedia', subtitle: 'Fix it yourself — safely and correctly',
    description: 'An illustrated 120-page guide to the most common home repairs. Covers plumbing basics, electrical safety, drywall, painting, weatherproofing, and NH-specific winterization.',
    features: ['100+ repair procedures with photos', 'NH winterization deep-dive', 'When to DIY vs. hire a pro', 'Tools required for each repair', 'Material cost estimates', 'Safety checklist per category', 'Eversource NH weatherization rebates'],
    price: 2900, audience: ['Homeowners', 'DIY Enthusiasts'], rating: 4.6, reviews: 189,
    color: 'text-amber-400', nhRelevant: true,
    fileTypes: ['PDF'], pages: 120, visible: true, sortOrder: 5,
    createdAt: '2026-01-01', updatedAt: '2026-07-01',
  },
  {
    id: 'tmpl-nh-lease', category: 'template', pricingModel: 'one_time', deliveryMethod: 'download',
    title: 'NH Lease Agreement Template Pack', subtitle: 'Attorney-reviewed, RSA 540-compliant lease templates',
    description: 'A comprehensive template pack with three NH lease agreement formats: standard 12-month lease, month-to-month lease, and room rental agreement. All reviewed for RSA 540 compliance.',
    features: ['Standard 12-month lease (RSA 540-compliant)', 'Month-to-month lease agreement', 'Room rental agreement', 'Pet addendum (NH law)', 'Move-in inspection checklist addendum', 'Security deposit receipt', 'Lead paint disclosure', 'Editable Word and PDF formats'],
    price: 4900, audience: ['Landlords'], rating: 4.9, reviews: 321,
    color: 'text-green-400', badge: 'TOP RATED', nhRelevant: true, popular: true,
    fileTypes: ['DOCX', 'PDF'], visible: true, sortOrder: 6,
    createdAt: '2026-01-01', updatedAt: '2026-07-01',
  },
  {
    id: 'tmpl-inspection', category: 'template', pricingModel: 'one_time', deliveryMethod: 'download',
    title: 'Property Inspection Report Template', subtitle: 'Document every unit condition with professional precision',
    description: 'A comprehensive move-in/move-out inspection template with room-by-room checklists, condition ratings, photo attachment slots, and signature fields.',
    features: ['Room-by-room condition checklist (16 areas)', 'Numerical condition rating system', 'Photo documentation log', 'Dual-party signature section', 'Damage cost estimation worksheet', 'NH RSA 540-A compliance notes', 'Fillable PDF and Word formats'],
    price: 1900, audience: ['Landlords', 'Property Managers'], rating: 4.8, reviews: 178,
    color: 'text-indigo-400', nhRelevant: true,
    fileTypes: ['PDF', 'DOCX'], visible: true, sortOrder: 7,
    createdAt: '2026-01-01', updatedAt: '2026-07-01',
  },
  {
    id: 'tmpl-vendor-contract', category: 'template', pricingModel: 'one_time', deliveryMethod: 'download',
    title: 'Vendor Contract Template Pack', subtitle: 'Professional contracts for every property service',
    description: 'Five vendor contract templates for the most common property services: HVAC, landscaping/snow removal, cleaning, general handyman, and management agreement.',
    features: ['HVAC maintenance agreement', 'Landscaping and snow removal contract', 'Cleaning services agreement', 'General handyman contract', 'Property management agreement', 'Certificate of insurance checklist', 'NH contractor license verification guide'],
    price: 5900, audience: ['Property Managers', 'Condo Boards', 'Landlords'], rating: 4.7, reviews: 94,
    color: 'text-amber-400', nhRelevant: true,
    fileTypes: ['DOCX', 'PDF'], visible: true, sortOrder: 8,
    createdAt: '2026-01-01', updatedAt: '2026-07-01',
  },
  {
    id: 'tmpl-board-meeting', category: 'template', pricingModel: 'one_time', deliveryMethod: 'download',
    title: 'Board Meeting Package', subtitle: 'Everything your association needs to run meetings professionally',
    description: 'A complete meeting package for condo and HOA boards: agenda template, minutes template, action item tracker, owner notification letter, proxy form, and annual meeting package.',
    features: ['Board meeting agenda template', 'Meeting minutes template (RSA 356-B compliant)', 'Action item tracker spreadsheet', 'Owner notification letter templates', 'Proxy voting form', 'Annual meeting package', 'Executive session documentation guide'],
    price: 2400, audience: ['Condo Boards', 'HOA Boards'], rating: 4.8, reviews: 112,
    color: 'text-violet-400', nhRelevant: true,
    fileTypes: ['DOCX', 'XLSX', 'PDF'], visible: true, sortOrder: 9,
    createdAt: '2026-01-01', updatedAt: '2026-07-01',
  },
  {
    id: 'calc-roi', category: 'calculator', pricingModel: 'one_time', deliveryMethod: 'download',
    title: 'Property ROI Calculator', subtitle: 'Analyze any investment in minutes',
    description: 'An interactive Excel-based calculator that models cash-on-cash return, cap rate, net operating income, debt service coverage, and 10-year equity growth for any residential or commercial property.',
    features: ['Cash-on-cash return model', 'Cap rate and NOI calculator', 'Mortgage amortization table', 'Vacancy and expense scenario modeling', '10-year equity projection', 'Comparison tool for multiple properties', 'NH-specific tax rate inputs'],
    price: 3900, audience: ['Real Estate Investors', 'Landlords', 'Commercial Owners'], rating: 4.9, reviews: 267,
    color: 'text-lime-400', badge: 'INTERACTIVE', nhRelevant: true, popular: true,
    fileTypes: ['XLSX'], visible: true, sortOrder: 10,
    createdAt: '2026-01-01', updatedAt: '2026-07-01',
  },
  {
    id: 'calc-reserve', category: 'calculator', pricingModel: 'one_time', deliveryMethod: 'download',
    title: 'Reserve Fund Adequacy Calculator', subtitle: 'Know exactly where your reserve fund stands',
    description: 'A spreadsheet calculator that inventories capital components, calculates current funding percentage, and projects future funding under different contribution scenarios.',
    features: ['Component inventory worksheet (50 line items)', 'Current percent-funded score', '3 funding scenario models', 'Annual contribution optimizer', 'Special assessment probability estimator', '10-year projection chart', 'Board presentation chart pack'],
    price: 2900, audience: ['Condo Boards', 'HOA Boards', 'Property Managers'], rating: 4.8, reviews: 83,
    color: 'text-orange-400', nhRelevant: true,
    fileTypes: ['XLSX'], visible: true, sortOrder: 11,
    createdAt: '2026-01-01', updatedAt: '2026-07-01',
  },
  {
    id: 'calc-ev-roi', category: 'calculator', pricingModel: 'one_time', deliveryMethod: 'download',
    title: 'EV Charging Revenue Calculator', subtitle: 'Model your EV charging ROI with Eversource NH rebates',
    description: 'Calculate the exact ROI on EV charging station installation — accounting for Eversource NH rebates (up to $500/port), installation costs, usage rates, and annual revenue projections.',
    features: ['Eversource NH rebate calculator', 'Installation cost estimator', 'Revenue projection by port count', 'Payback period analysis', 'Pricing strategy comparison', 'NH net metering integration model', 'Residential vs. commercial comparison'],
    price: 1900, audience: ['Condo Boards', 'Property Managers', 'Commercial Owners'], rating: 4.7, reviews: 45,
    color: 'text-emerald-400', nhRelevant: true,
    fileTypes: ['XLSX'], visible: true, sortOrder: 12,
    createdAt: '2026-01-01', updatedAt: '2026-07-01',
  },
  {
    id: 'calc-rental-pricing', category: 'calculator', pricingModel: 'one_time', deliveryMethod: 'download',
    title: 'Rental Pricing Optimizer', subtitle: 'Set the right rent for every unit',
    description: 'A market-driven rental pricing model that factors in comparable rents, vacancy sensitivity, seasonal adjustment, and unit-level features to recommend the optimal rent for each unit.',
    features: ['Comparable rent analysis framework', 'Vacancy rate sensitivity model', 'Seasonal pricing adjustment table', 'Unit feature value matrix', 'Optimal rent recommendation engine', 'Revenue maximization scenario planner', 'NH market benchmark data (2026)'],
    price: 2400, audience: ['Landlords', 'Property Managers'], rating: 4.6, reviews: 61,
    color: 'text-cyan-400', nhRelevant: true,
    fileTypes: ['XLSX'], visible: true, sortOrder: 13,
    createdAt: '2026-01-01', updatedAt: '2026-07-01',
  },
  {
    id: 'air-property-health', category: 'ai_report', pricingModel: 'one_time', deliveryMethod: 'generated',
    title: 'AI Property Health Report', subtitle: 'A personalized property assessment powered by AI',
    description: 'Submit your property details and receive a 12-page AI-generated health assessment covering maintenance status, risk flags, capital needs, and a 90-day action plan specific to your property type and NH climate.',
    features: ['AI-generated maintenance health score', 'System-by-system risk assessment', '90-day action plan', 'Estimated capital needs (1-3 year horizon)', 'NH seasonal risk flags', 'Vendor recommendation list', 'Executive summary PDF'],
    price: 7900, audience: ['Homeowners', 'Landlords', 'Property Managers'], rating: 4.9, reviews: 38,
    color: 'text-violet-400', badge: 'AI-POWERED', nhRelevant: true, popular: true,
    deliveryMethod: 'generated', fileTypes: ['PDF'], visible: true, sortOrder: 14,
    createdAt: '2026-01-01', updatedAt: '2026-07-01',
  },
  {
    id: 'air-revenue-opp', category: 'ai_report', pricingModel: 'one_time', deliveryMethod: 'generated',
    title: 'Revenue Opportunity Analysis', subtitle: 'Uncover hidden revenue in your property portfolio',
    description: 'A data-driven AI report identifying underperforming assets, pricing gaps, and revenue opportunities across your portfolio — including ADU potential, EV charging, storage, and laundry.',
    features: ['Portfolio revenue gap analysis', 'Rent optimization recommendations', 'ADU feasibility assessment', 'Ancillary revenue opportunities', 'EV charging revenue model', 'Expense reduction targets', '12-month revenue growth roadmap'],
    price: 9900, audience: ['Landlords', 'Property Managers', 'Real Estate Investors'], rating: 4.8, reviews: 29,
    color: 'text-emerald-400', badge: 'AI-POWERED', nhRelevant: true,
    deliveryMethod: 'generated', fileTypes: ['PDF'], visible: true, sortOrder: 15,
    createdAt: '2026-01-01', updatedAt: '2026-07-01',
  },
  {
    id: 'air-capital-plan', category: 'ai_report', pricingModel: 'one_time', deliveryMethod: 'generated',
    title: 'AI 10-Year Capital Plan', subtitle: 'Your complete capital roadmap built by AI',
    description: 'A custom 10-year capital plan generated from your property inventory — modeling component lifespans, replacement costs, funding scenarios, and annual contribution schedules.',
    features: ['Full component lifecycle model', 'Annual contribution schedule', '3 funding scenario comparison', 'Special assessment risk score', 'NH contractor cost benchmarks', 'Reserve fund growth projections', 'Board-ready presentation deck'],
    price: 12900, audience: ['Condo Boards', 'Property Managers', 'HOA Boards'], rating: 4.9, reviews: 17,
    color: 'text-orange-400', badge: 'AI-POWERED', nhRelevant: true,
    deliveryMethod: 'generated', fileTypes: ['PDF', 'XLSX'], visible: true, sortOrder: 16,
    createdAt: '2026-01-01', updatedAt: '2026-07-01',
  },
  {
    id: 'maint-nh-winter', category: 'maintenance', pricingModel: 'one_time', deliveryMethod: 'download',
    title: 'NH Winter Prep Package', subtitle: 'Get your property ready for New Hampshire winters',
    description: 'A complete NH winter preparation kit: 47-item winterization checklist, vendor call scheduling template, emergency contact log, and a storm response protocol designed for NH\'s freeze-thaw climate.',
    features: ['47-item winterization checklist', 'System-by-system prep guide', 'Vendor call scheduling template', 'Emergency contact log', 'Storm response protocol', 'Pipe freeze prevention guide', 'Eversource weatherization rebate checklist'],
    price: 3400, audience: ['Homeowners', 'Landlords', 'Property Managers'], rating: 4.8, reviews: 156,
    color: 'text-blue-400', nhRelevant: true, popular: true,
    fileTypes: ['PDF', 'DOCX'], visible: true, sortOrder: 17,
    createdAt: '2026-01-01', updatedAt: '2026-07-01',
  },
  {
    id: 'maint-annual-planner', category: 'maintenance', pricingModel: 'one_time', deliveryMethod: 'download',
    title: 'Annual Maintenance Planner', subtitle: '12-month property maintenance calendar',
    description: 'A complete 12-month property maintenance planning kit with month-by-month checklists, vendor scheduling templates, budget tracking worksheets, and NH-specific seasonal timelines.',
    features: ['12-month maintenance calendar', 'Month-by-month task checklists', 'Vendor scheduling template', 'Maintenance budget tracker', 'System inspection schedules', 'NH seasonal timeline guide', 'Annual review worksheet'],
    price: 2400, audience: ['Homeowners', 'Landlords', 'Condo Boards'], rating: 4.7, reviews: 203,
    color: 'text-green-400', nhRelevant: true,
    fileTypes: ['PDF', 'XLSX'], visible: true, sortOrder: 18,
    createdAt: '2026-01-01', updatedAt: '2026-07-01',
  },
  {
    id: 'bundle-landlord-starter', category: 'bundle', pricingModel: 'one_time', deliveryMethod: 'download',
    title: 'Landlord Starter Bundle', subtitle: 'Everything a new NH landlord needs — one price',
    description: 'The essential bundle for new NH landlords: NH Landlord Operations Manual + NH Lease Agreement Pack + Property Inspection Report Template. Saves $121 vs. buying separately.',
    features: ['NH Landlord Operations Manual (85 pages)', 'NH Lease Agreement Pack (3 leases + addenda)', 'Property Inspection Report Template', 'NH RSA 540 compliance guide included', 'Editable Word and PDF formats', 'Instant download', '30-day satisfaction guarantee'],
    price: 8900, originalPrice: 21000, audience: ['Landlords', 'First-Time Landlords'], rating: 4.9, reviews: 74,
    color: 'text-orange-400', badge: 'SAVE $121', nhRelevant: true, popular: true,
    fileTypes: ['PDF', 'DOCX', 'EPUB'], visible: true, sortOrder: 19,
    createdAt: '2026-01-01', updatedAt: '2026-07-01',
  },
  {
    id: 'bundle-condo-complete', category: 'bundle', pricingModel: 'one_time', deliveryMethod: 'download',
    title: 'Condo Board Complete Bundle', subtitle: 'The full governance toolkit for NH condo boards',
    description: 'Everything a condo board needs to operate professionally: Condo Board Governance Handbook + Board Meeting Package + Reserve Fund Adequacy Calculator. Saves $55 vs. buying separately.',
    features: ['Condo Board Governance Handbook (72 pages)', 'Board Meeting Package (6 templates)', 'Reserve Fund Adequacy Calculator (Excel)', 'RSA 356-B compliance guide', 'Instant download', '30-day satisfaction guarantee'],
    price: 14900, originalPrice: 17700, audience: ['Condo Boards', 'HOA Boards'], rating: 4.8, reviews: 41,
    color: 'text-violet-400', badge: 'SAVE $28', nhRelevant: true,
    fileTypes: ['PDF', 'DOCX', 'XLSX', 'EPUB'], visible: true, sortOrder: 20,
    createdAt: '2026-01-01', updatedAt: '2026-07-01',
  },
  {
    id: 'bundle-pm-pro', category: 'bundle', pricingModel: 'one_time', deliveryMethod: 'download',
    title: 'Property Manager Pro Bundle', subtitle: 'The complete toolkit for professional property managers',
    description: 'The ultimate bundle for property managers: Capital Planning Guide + Vendor Contract Pack + Property ROI Calculator + Annual Maintenance Planner. Saves $100 vs. buying separately.',
    features: ['Capital Planning for Property Managers (45 pages)', 'Vendor Contract Template Pack (5 contracts)', 'Property ROI Calculator (Excel)', 'Annual Maintenance Planner (12-month)', 'NH CDFA financing overview included', 'Instant download', '30-day satisfaction guarantee'],
    price: 19900, originalPrice: 29700, audience: ['Property Managers', 'Commercial Owners'], rating: 4.9, reviews: 33,
    color: 'text-orange-400', badge: 'SAVE $100', nhRelevant: true,
    fileTypes: ['PDF', 'DOCX', 'XLSX'], visible: true, sortOrder: 21,
    createdAt: '2026-01-01', updatedAt: '2026-07-01',
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

function cacheProducts(products: AdminProduct[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(products)); } catch {}
}

function cachedProducts(): AdminProduct[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return DEFAULT_PRODUCTS;
}

function newProduct(): AdminProduct {
  return {
    id: `prod-${Date.now()}`,
    category: 'ebook',
    title: '',
    subtitle: '',
    description: '',
    features: [''],
    price: 2900,
    pricingModel: 'one_time',
    audience: [''],
    rating: 5.0,
    reviews: 0,
    color: 'text-blue-400',
    nhRelevant: true,
    fileTypes: ['PDF'],
    deliveryMethod: 'download',
    visible: true,
    sortOrder: 999,
    createdAt: new Date().toISOString().slice(0, 10),
    updatedAt: new Date().toISOString().slice(0, 10),
  };
}

// ─── Product Form ─────────────────────────────────────────────────────────────

function ProductForm({ product, onSave, onCancel }: {
  product: AdminProduct;
  onSave: (p: AdminProduct) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<AdminProduct>({ ...product });
  const [featuresText, setFeaturesText] = useState(product.features.join('\n'));
  const [audienceText, setAudienceText] = useState(product.audience.join(', '));
  const [fileTypesText, setFileTypesText] = useState(product.fileTypes.join(', '));
  const [priceInput, setPriceInput] = useState((product.price / 100).toFixed(2));
  const [origPriceInput, setOrigPriceInput] = useState(product.originalPrice ? (product.originalPrice / 100).toFixed(2) : '');

  function set<K extends keyof AdminProduct>(k: K, v: AdminProduct[K]) {
    setForm(f => ({ ...f, [k]: v }));
  }

  function submit() {
    if (!form.title.trim()) { toast.error('Title is required'); return; }
    if (!form.subtitle.trim()) { toast.error('Subtitle is required'); return; }
    const price = Math.round(parseFloat(priceInput) * 100);
    if (isNaN(price) || price <= 0) { toast.error('Enter a valid price'); return; }
    const origPrice = origPriceInput ? Math.round(parseFloat(origPriceInput) * 100) : undefined;
    const updated: AdminProduct = {
      ...form,
      price,
      originalPrice: origPrice,
      features: featuresText.split('\n').map(f => f.trim()).filter(Boolean),
      audience: audienceText.split(',').map(a => a.trim()).filter(Boolean),
      fileTypes: fileTypesText.split(',').map(f => f.trim()).filter(Boolean),
      updatedAt: new Date().toISOString().slice(0, 10),
    };
    onSave(updated);
  }

  const inputCls = 'w-full bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500 placeholder-gray-600';
  const labelCls = 'block text-xs font-semibold text-gray-400 mb-1.5';

  return (
    <div className="fixed inset-0 bg-black/80 z-50 overflow-y-auto p-4 flex items-start justify-center">
      <div className="bg-[#111] border border-[#2A2A2A] rounded-2xl w-full max-w-2xl my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[#2A2A2A]">
          <h2 className="text-lg font-bold text-white">{product.id.startsWith('prod-') ? 'New Product' : 'Edit Product'}</h2>
          <button onClick={onCancel} className="p-1.5 hover:bg-[#2A2A2A] rounded-lg text-gray-400 hover:text-white transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Category + Visibility */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Category *</label>
              <select value={form.category} onChange={e => set('category', e.target.value as ProductCategory)}
                className={inputCls}>
                {Object.entries(CATEGORY_META).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Delivery Method *</label>
              <select value={form.deliveryMethod} onChange={e => set('deliveryMethod', e.target.value as DeliveryMethod)}
                className={inputCls}>
                <option value="download">Download</option>
                <option value="generated">AI Generated</option>
                <option value="interactive">Interactive</option>
              </select>
            </div>
          </div>

          {/* Title */}
          <div>
            <label className={labelCls}>Title *</label>
            <input value={form.title} onChange={e => set('title', e.target.value)}
              placeholder="e.g. NH Landlord Operations Manual"
              className={inputCls} />
          </div>

          {/* Subtitle */}
          <div>
            <label className={labelCls}>Subtitle *</label>
            <input value={form.subtitle} onChange={e => set('subtitle', e.target.value)}
              placeholder="One-line value statement"
              className={inputCls} />
          </div>

          {/* Description */}
          <div>
            <label className={labelCls}>Description</label>
            <textarea value={form.description} onChange={e => set('description', e.target.value)}
              rows={4} placeholder="Full product description..."
              className={`${inputCls} resize-none`} />
          </div>

          {/* Price + Original Price */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Price ($) *</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                <input type="number" step="0.01" min="0" value={priceInput}
                  onChange={e => setPriceInput(e.target.value)}
                  className={`${inputCls} pl-7`} />
              </div>
            </div>
            <div>
              <label className={labelCls}>Original Price ($ — for bundles/sale)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                <input type="number" step="0.01" min="0" value={origPriceInput}
                  onChange={e => setOrigPriceInput(e.target.value)}
                  placeholder="Leave blank if no discount"
                  className={`${inputCls} pl-7`} />
              </div>
            </div>
          </div>

          {/* Features */}
          <div>
            <label className={labelCls}>Features (one per line)</label>
            <textarea value={featuresText} onChange={e => setFeaturesText(e.target.value)}
              rows={6} placeholder="RSA 540 compliance guide&#10;NH-specific screening framework&#10;..."
              className={`${inputCls} resize-none font-mono text-xs`} />
          </div>

          {/* Audience + File Types */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Audience (comma-separated)</label>
              <input value={audienceText} onChange={e => setAudienceText(e.target.value)}
                placeholder="Landlords, Property Managers"
                className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>File Types (comma-separated)</label>
              <input value={fileTypesText} onChange={e => setFileTypesText(e.target.value)}
                placeholder="PDF, DOCX, XLSX"
                className={inputCls} />
            </div>
          </div>

          {/* Badge + Pages */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Badge Label (optional)</label>
              <input value={form.badge || ''} onChange={e => set('badge', e.target.value || undefined)}
                placeholder="BESTSELLER, NEW, AI-POWERED..."
                className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Pages (ebooks only)</label>
              <input type="number" value={form.pages || ''} onChange={e => set('pages', e.target.value ? parseInt(e.target.value) : undefined)}
                placeholder="85"
                className={inputCls} />
            </div>
          </div>

          {/* Pricing model + Toggles */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Pricing Model</label>
              <select value={form.pricingModel} onChange={e => set('pricingModel', e.target.value as PricingModel)}
                className={inputCls}>
                <option value="one_time">One-Time Purchase</option>
                <option value="subscription">Subscription</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Accent Color Class</label>
              <select value={form.color} onChange={e => set('color', e.target.value)}
                className={inputCls}>
                {['text-teal-400','text-violet-400','text-blue-400','text-orange-400','text-amber-400',
                  'text-green-400','text-lime-400','text-emerald-400','text-indigo-400','text-cyan-400',
                  'text-pink-400','text-red-400'].map(c => (
                  <option key={c} value={c}>{c.replace('text-','').replace('-400','')}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Preview text */}
          <div>
            <label className={labelCls}>Free Preview Snippet (shown to non-buyers)</label>
            <textarea value={form.preview || ''} onChange={e => set('preview', e.target.value || undefined)}
              rows={2} placeholder="A short teaser excerpt to hook potential buyers..."
              className={`${inputCls} resize-none`} />
          </div>

          {/* Checkboxes */}
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.nhRelevant} onChange={e => set('nhRelevant', e.target.checked)}
                className="w-4 h-4 accent-orange-500" />
              <span className="text-sm text-gray-300">NH-Relevant</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.popular || false} onChange={e => set('popular', e.target.checked)}
                className="w-4 h-4 accent-orange-500" />
              <span className="text-sm text-gray-300">Mark as Popular</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.visible} onChange={e => set('visible', e.target.checked)}
                className="w-4 h-4 accent-orange-500" />
              <span className="text-sm text-gray-300">Visible in Store</span>
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#2A2A2A] flex gap-3">
          <button onClick={submit}
            className="flex-1 py-2.5 bg-orange-600 hover:bg-orange-500 text-white rounded-lg text-sm font-semibold transition flex items-center justify-center gap-2">
            <Save className="w-4 h-4" /> Save Product
          </button>
          <button onClick={onCancel}
            className="px-5 py-2.5 bg-[#1A1A1A] border border-[#2A2A2A] text-gray-400 hover:text-white rounded-lg text-sm transition">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function MarketplaceAdmin() {
  const [products, setProducts] = useState<AdminProduct[]>(cachedProducts);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [dbReady, setDbReady] = useState(false);
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState<ProductCategory | 'all'>('all');
  const [filterVis, setFilterVis] = useState<'all' | 'visible' | 'hidden'>('all');
  const [editing, setEditing] = useState<AdminProduct | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [showStats, setShowStats] = useState(true);
  const [showOrders, setShowOrders] = useState(false);
  const [orders, setOrders] = useState<any[]>([]);

  // Load from Supabase on mount, fall back to localStorage cache
  useEffect(() => {
    fetch(`${API}/marketplace/products?admin=true`, { headers })
      .then(r => r.json())
      .then(data => {
        if (data.products && data.products.length > 0) {
          setProducts(data.products);
          cacheProducts(data.products);
          setDbReady(true);
        } else if (data.products && data.products.length === 0) {
          // Table exists but empty — seed it
          setDbReady(true);
        }
      })
      .catch(() => { /* stay on localStorage cache */ })
      .finally(() => setLoading(false));
  }, []);

  async function loadOrders() {
    try {
      const r = await fetch(`${API}/marketplace/orders`, { headers });
      const data = await r.json();
      if (data.orders) setOrders(data.orders);
    } catch {}
  }

  async function seedToSupabase() {
    setSyncing(true);
    try {
      const r = await fetch(`${API}/marketplace/products/seed`, {
        method: 'POST', headers,
        body: JSON.stringify({ products }),
      });
      const data = await r.json();
      if (data.seeded !== undefined) {
        toast.success(`✅ ${data.seeded} products synced to database`);
        setDbReady(true);
      } else {
        toast.error(data.error || 'Seed failed — check that the marketplace_products table exists in Supabase');
      }
    } catch (e: any) {
      toast.error('Could not reach Supabase. Check your connection.');
    }
    setSyncing(false);
  }

  const filtered = useMemo(() => {
    return products
      .filter(p => filterCat === 'all' || p.category === filterCat)
      .filter(p => filterVis === 'all' || (filterVis === 'visible' ? p.visible : !p.visible))
      .filter(p => !search || p.title.toLowerCase().includes(search.toLowerCase()) || p.subtitle.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }, [products, filterCat, filterVis, search]);

  const stats = useMemo(() => ({
    total: products.length,
    visible: products.filter(p => p.visible).length,
    hidden: products.filter(p => !p.visible).length,
    totalValue: products.filter(p => p.visible).reduce((a, p) => a + p.price, 0),
    byCategory: Object.fromEntries(
      Object.keys(CATEGORY_META).map(k => [k, products.filter(p => p.category === k).length])
    ),
  }), [products]);

  async function handleSave(p: AdminProduct) {
    const isNew = !products.find(x => x.id === p.id);
    // Optimistic update
    setProducts(prev => {
      const idx = prev.findIndex(x => x.id === p.id);
      if (idx >= 0) { const next = [...prev]; next[idx] = p; return next; }
      return [...prev, { ...p, sortOrder: prev.length + 1 }];
    });
    setEditing(null);
    toast.success(`"${p.title}" saved`);

    // Sync to Supabase
    if (dbReady) {
      try {
        const url = isNew ? `${API}/marketplace/products` : `${API}/marketplace/products/${p.id}`;
        const method = isNew ? 'POST' : 'PUT';
        const r = await fetch(url, { method, headers, body: JSON.stringify(p) });
        const data = await r.json();
        if (data.error) toast.error(`DB sync: ${data.error}`);
      } catch { toast.error('Could not sync to database'); }
    }
    cacheProducts(products);
  }

  async function handleDelete(id: string) {
    const p = products.find(x => x.id === id);
    if (!p) return;
    if (!confirm(`Delete "${p.title}"? This cannot be undone.`)) return;
    setProducts(prev => prev.filter(x => x.id !== id));
    toast.success('Product deleted');

    if (dbReady) {
      try {
        await fetch(`${API}/marketplace/products/${id}`, { method: 'DELETE', headers });
      } catch { toast.error('Could not delete from database'); }
    }
  }

  async function toggleVisible(id: string) {
    const p = products.find(x => x.id === id);
    if (!p) return;
    const updated = { ...p, visible: !p.visible, updatedAt: new Date().toISOString().slice(0, 10) };
    setProducts(prev => prev.map(x => x.id === id ? updated : x));

    if (dbReady) {
      try {
        await fetch(`${API}/marketplace/products/${id}`, {
          method: 'PUT', headers,
          body: JSON.stringify({ visible: updated.visible, updated_at: updated.updatedAt }),
        });
      } catch {}
    }
  }

  function handleDuplicate(p: AdminProduct) {
    const copy: AdminProduct = {
      ...p,
      id: `prod-${Date.now()}`,
      title: `${p.title} (Copy)`,
      sortOrder: products.length + 1,
      createdAt: new Date().toISOString().slice(0, 10),
      updatedAt: new Date().toISOString().slice(0, 10),
    };
    setProducts(prev => [...prev, copy]);
    toast.success('Product duplicated');
  }

  function moveOrder(id: string, dir: 'up' | 'down') {
    setProducts(prev => {
      const sorted = [...prev].sort((a, b) => a.sortOrder - b.sortOrder);
      const idx = sorted.findIndex(p => p.id === id);
      const swapIdx = dir === 'up' ? idx - 1 : idx + 1;
      if (swapIdx < 0 || swapIdx >= sorted.length) return prev;
      const a = sorted[idx].sortOrder;
      const b = sorted[swapIdx].sortOrder;
      return prev.map(p => p.id === id ? { ...p, sortOrder: b } : p.id === sorted[swapIdx].id ? { ...p, sortOrder: a } : p);
    });
  }

  async function resetToDefaults() {
    if (!confirm('Reset all products to defaults? Your edits will be lost.')) return;
    setProducts(DEFAULT_PRODUCTS);
    cacheProducts(DEFAULT_PRODUCTS);
    toast.success('Products reset to defaults');
    if (dbReady) {
      setSyncing(true);
      try {
        const r = await fetch(`${API}/marketplace/products/seed`, {
          method: 'POST', headers, body: JSON.stringify({ products: DEFAULT_PRODUCTS }),
        });
        const data = await r.json();
        if (data.seeded !== undefined) toast.success(`Synced ${data.seeded} defaults to database`);
      } catch {}
      setSyncing(false);
    }
  }

  const CatIcon = ({ cat }: { cat: ProductCategory }) => {
    const Icon = CATEGORY_META[cat].icon;
    return <Icon className={`w-4 h-4 ${CATEGORY_META[cat].color}`} />;
  };

  return (
    <div className="space-y-6">
      {editing && (
        <ProductForm product={editing} onSave={handleSave} onCancel={() => setEditing(null)} />
      )}

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Package className="w-5 h-5 text-orange-400" /> Product Manager
          </h2>
          <p className="text-sm text-gray-400 mt-0.5">Add, edit, price, and organize your digital products</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* DB status pill */}
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${dbReady ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400'}`}>
            <div className={`w-1.5 h-1.5 rounded-full ${dbReady ? 'bg-green-400' : 'bg-yellow-400'}`} />
            {loading ? 'Connecting…' : dbReady ? 'Synced to DB' : 'Local only'}
          </div>
          {!dbReady && !loading && (
            <button onClick={seedToSupabase} disabled={syncing}
              className="flex items-center gap-1.5 px-3 py-2 bg-violet-600/20 border border-violet-500/30 text-violet-300 hover:text-white rounded-lg text-xs transition disabled:opacity-50">
              {syncing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
              {syncing ? 'Syncing…' : 'Push to DB'}
            </button>
          )}
          <button onClick={() => { setShowOrders(s => !s); if (!showOrders) loadOrders(); }}
            className="flex items-center gap-1.5 px-3 py-2 bg-[#1A1A1A] border border-[#2A2A2A] text-gray-400 hover:text-white rounded-lg text-xs transition">
            <BarChart3 className="w-3.5 h-3.5" /> Orders
          </button>
          <button onClick={resetToDefaults}
            className="flex items-center gap-1.5 px-3 py-2 bg-[#1A1A1A] border border-[#2A2A2A] text-gray-400 hover:text-white rounded-lg text-xs transition">
            <RefreshCw className="w-3.5 h-3.5" /> Defaults
          </button>
          <button onClick={() => setEditing(newProduct())}
            className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-lg text-sm font-semibold transition">
            <Plus className="w-4 h-4" /> Add Product
          </button>
        </div>
      </div>

      {/* Orders Panel */}
      {showOrders && (
        <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-[#2A2A2A] flex items-center justify-between">
            <p className="text-sm font-bold text-white flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-green-400" /> Marketplace Orders
              <span className="px-2 py-0.5 bg-[#2A2A2A] rounded text-xs text-gray-400">{orders.length}</span>
            </p>
            <button onClick={loadOrders} className="text-gray-500 hover:text-white transition">
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
          {orders.length === 0 ? (
            <p className="text-center text-gray-500 text-sm py-8">No orders yet — or run SQL migration first</p>
          ) : (
            <div className="divide-y divide-[#2A2A2A] max-h-80 overflow-y-auto">
              {orders.map(o => (
                <div key={o.id} className="px-5 py-3 flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white">{o.customer_name || o.customer_email}</p>
                    <p className="text-xs text-gray-500">{o.customer_email} · {new Date(o.created_at).toLocaleDateString()}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{(o.items || []).map((i: any) => i.title).join(', ')}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-bold text-white">${((o.total || 0) / 100).toFixed(2)}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full border font-semibold ${o.status === 'paid' ? 'bg-green-500/20 text-green-400 border-green-500/30' : 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'}`}>
                      {o.status}
                    </span>
                  </div>
                  <div className="flex-shrink-0 text-xs text-gray-600">
                    {o.download_sent ? <CheckCircle className="w-4 h-4 text-green-400" title="Email sent" /> : <AlertCircle className="w-4 h-4 text-yellow-500" title="Email pending" />}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Stats */}
      <button onClick={() => setShowStats(s => !s)}
        className="w-full flex items-center justify-between px-4 py-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl hover:bg-[#1A1A1A]/80 transition text-sm">
        <span className="font-semibold text-white flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-orange-400" /> Catalog Overview
        </span>
        {showStats ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
      </button>

      {showStats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-white">{stats.total}</p>
            <p className="text-xs text-gray-400 mt-0.5">Total Products</p>
          </div>
          <div className="bg-[#1A1A1A] border border-green-500/20 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-green-400">{stats.visible}</p>
            <p className="text-xs text-gray-400 mt-0.5">Live in Store</p>
          </div>
          <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-gray-400">{stats.hidden}</p>
            <p className="text-xs text-gray-400 mt-0.5">Hidden</p>
          </div>
          <div className="bg-[#1A1A1A] border border-orange-500/20 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-orange-400">{fmt(stats.totalValue)}</p>
            <p className="text-xs text-gray-400 mt-0.5">Total Catalog Value</p>
          </div>
          {Object.entries(CATEGORY_META).map(([k, v]) => {
            const Icon = v.icon;
            const count = (stats.byCategory as any)[k] || 0;
            return (
              <div key={k} className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-4 flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center border ${v.bg}`}>
                  <Icon className={`w-4 h-4 ${v.color}`} />
                </div>
                <div>
                  <p className="text-sm font-bold text-white">{count}</p>
                  <p className="text-xs text-gray-400">{v.label}s</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search products..."
            className="w-full bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg pl-9 pr-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500 placeholder-gray-600" />
        </div>
        <select value={filterCat} onChange={e => setFilterCat(e.target.value as any)}
          className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500">
          <option value="all">All Categories</option>
          {Object.entries(CATEGORY_META).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
        <select value={filterVis} onChange={e => setFilterVis(e.target.value as any)}
          className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500">
          <option value="all">All Visibility</option>
          <option value="visible">Visible</option>
          <option value="hidden">Hidden</option>
        </select>
        <div className="flex rounded-lg border border-[#2A2A2A] overflow-hidden">
          <button onClick={() => setViewMode('list')}
            className={`px-3 py-2 text-sm transition ${viewMode === 'list' ? 'bg-orange-600 text-white' : 'bg-[#1A1A1A] text-gray-400 hover:text-white'}`}>
            <List className="w-4 h-4" />
          </button>
          <button onClick={() => setViewMode('grid')}
            className={`px-3 py-2 text-sm transition ${viewMode === 'grid' ? 'bg-orange-600 text-white' : 'bg-[#1A1A1A] text-gray-400 hover:text-white'}`}>
            <Grid className="w-4 h-4" />
          </button>
        </div>
      </div>

      <p className="text-xs text-gray-500">{filtered.length} product{filtered.length !== 1 ? 's' : ''} shown</p>

      {/* Product List */}
      {viewMode === 'list' ? (
        <div className="space-y-2">
          {filtered.map((p, i) => {
            const meta = CATEGORY_META[p.category];
            const Icon = meta.icon;
            return (
              <div key={p.id} className={`bg-[#1A1A1A] border rounded-xl px-5 py-4 flex items-center gap-4 transition ${p.visible ? 'border-[#2A2A2A]' : 'border-[#2A2A2A] opacity-60'}`}>
                {/* Sort arrows */}
                <div className="flex flex-col gap-0.5 flex-shrink-0">
                  <button onClick={() => moveOrder(p.id, 'up')} disabled={i === 0}
                    className="p-0.5 text-gray-600 hover:text-gray-300 disabled:opacity-20 transition">
                    <ArrowUp className="w-3 h-3" />
                  </button>
                  <button onClick={() => moveOrder(p.id, 'down')} disabled={i === filtered.length - 1}
                    className="p-0.5 text-gray-600 hover:text-gray-300 disabled:opacity-20 transition">
                    <ArrowDown className="w-3 h-3" />
                  </button>
                </div>

                {/* Icon */}
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 border ${meta.bg}`}>
                  <Icon className={`w-5 h-5 ${meta.color}`} />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-white truncate">{p.title}</p>
                    {p.badge && (
                      <span className="px-1.5 py-0.5 bg-orange-500/20 border border-orange-500/30 text-orange-300 text-xs font-bold rounded">
                        {p.badge}
                      </span>
                    )}
                    {p.popular && (
                      <span className="px-1.5 py-0.5 bg-yellow-500/20 border border-yellow-500/30 text-yellow-300 text-xs rounded">
                        Popular
                      </span>
                    )}
                    {!p.visible && (
                      <span className="px-1.5 py-0.5 bg-gray-500/20 border border-gray-500/30 text-gray-400 text-xs rounded">
                        Hidden
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className={`text-xs ${meta.color}`}>{meta.label}</span>
                    <span className="text-xs text-gray-500">{p.fileTypes.join(', ')}</span>
                    {p.pages && <span className="text-xs text-gray-500">{p.pages}pp</span>}
                    <span className="text-xs text-gray-500 flex items-center gap-1">
                      <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" /> {p.rating} ({p.reviews})
                    </span>
                  </div>
                </div>

                {/* Price */}
                <div className="text-right flex-shrink-0">
                  <p className="text-base font-bold text-white">{fmt(p.price)}</p>
                  {p.originalPrice && (
                    <p className="text-xs text-gray-500 line-through">{fmt(p.originalPrice)}</p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button onClick={() => toggleVisible(p.id)}
                    title={p.visible ? 'Hide from store' : 'Show in store'}
                    className={`p-2 rounded-lg transition ${p.visible ? 'text-green-400 hover:bg-green-500/10' : 'text-gray-500 hover:text-gray-300 hover:bg-[#2A2A2A]'}`}>
                    {p.visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </button>
                  <button onClick={() => handleDuplicate(p)} title="Duplicate"
                    className="p-2 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-[#2A2A2A] transition">
                    <Copy className="w-4 h-4" />
                  </button>
                  <button onClick={() => setEditing(p)} title="Edit"
                    className="p-2 rounded-lg text-gray-400 hover:text-orange-400 hover:bg-orange-500/10 transition">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(p.id)} title="Delete"
                    className="p-2 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(p => {
            const meta = CATEGORY_META[p.category];
            const Icon = meta.icon;
            return (
              <div key={p.id} className={`bg-[#1A1A1A] border rounded-xl p-5 space-y-3 transition ${p.visible ? 'border-[#2A2A2A]' : 'border-[#2A2A2A] opacity-60'}`}>
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 border ${meta.bg}`}>
                    <Icon className={`w-5 h-5 ${meta.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white leading-snug">{p.title}</p>
                    <p className={`text-xs ${meta.color} mt-0.5`}>{meta.label}</p>
                  </div>
                  <p className="text-sm font-bold text-white flex-shrink-0">{fmt(p.price)}</p>
                </div>
                <p className="text-xs text-gray-400 line-clamp-2">{p.subtitle}</p>
                <div className="flex items-center justify-between pt-1 border-t border-[#2A2A2A]">
                  <div className="flex items-center gap-1">
                    <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                    <span className="text-xs text-gray-400">{p.rating} · {p.reviews} reviews</span>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => toggleVisible(p.id)}
                      className={`p-1.5 rounded-lg transition ${p.visible ? 'text-green-400' : 'text-gray-500'}`}>
                      {p.visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                    </button>
                    <button onClick={() => setEditing(p)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-orange-400 transition">
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => handleDelete(p.id)}
                      className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 transition">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {filtered.length === 0 && (
        <div className="text-center py-16 text-gray-500">
          <Package className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No products match your filters</p>
          <button onClick={() => setEditing(newProduct())}
            className="mt-4 px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-lg text-sm font-semibold transition">
            Add Your First Product
          </button>
        </div>
      )}
    </div>
  );
}
