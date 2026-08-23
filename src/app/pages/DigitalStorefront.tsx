/**
 * Digital Storefront — Public-facing product store.
 * Accessible from main site nav at /store.
 * Reads products from localStorage (set by MarketplaceAdmin) or falls back to defaults.
 * Full cart, checkout flow, category filters, and search.
 */
import { useState, useMemo, useEffect } from 'react';
import {
  ShoppingCart, X, Search, Star, BookOpen, FileText, Calculator,
  BarChart3, Wrench, Layers, CheckCircle, ArrowRight, Download,
  Shield, CreditCard, Package, Sparkles, Home, Building2,
  Plus, Minus, Trash2, Bot, Gift, ChevronLeft, ChevronRight,
  Zap, Clock, Tag, Users, Eye, Lock, TrendingUp,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { authedHeadersOrAnon } from "../utils/authHeaders";
import { useStoreConfig, effectiveUnitPrice, volumeDiscountPercent, lineTotal } from '../hooks/useStoreConfig';
import UnifiedCheckout from '../components/UnifiedCheckout';
import { Truck } from 'lucide-react';

const SERVER = `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6`;
const STORAGE_KEY = 'bp_mkt_products';
const PURCHASED_KEY = 'bp_mkt_purchased';

// ─── Types ────────────────────────────────────────────────────────────────────

type ProductCategory = 'ebook' | 'template' | 'calculator' | 'ai_report' | 'maintenance' | 'bundle';

interface Product {
  id: string;
  category: ProductCategory;
  title: string;
  subtitle: string;
  description: string;
  features: string[];
  price: number;
  originalPrice?: number;
  pricingModel: 'one_time' | 'subscription';
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
  deliveryMethod: 'download' | 'generated' | 'interactive';
  visible: boolean;
  sortOrder: number;
  stock?: number; // physical/dropship items only — drives low-stock scarcity badges
}

interface CartItem { product: Product; quantity: number; }

const CAT_CONFIG: Record<ProductCategory, { label: string; icon: any; color: string; bg: string }> = {
  ebook:       { label: 'Ebooks',       icon: BookOpen,    color: 'text-blue-400',    bg: 'bg-blue-500/10 border-blue-500/20' },
  template:    { label: 'Templates',    icon: FileText,    color: 'text-green-400',   bg: 'bg-green-500/10 border-green-500/20' },
  calculator:  { label: 'Calculators',  icon: Calculator,  color: 'text-lime-400',    bg: 'bg-lime-500/10 border-lime-500/20' },
  ai_report:   { label: 'AI Reports',   icon: BarChart3,   color: 'text-violet-400',  bg: 'bg-violet-500/10 border-violet-500/20' },
  maintenance: { label: 'Maintenance',  icon: Wrench,      color: 'text-amber-400',   bg: 'bg-amber-500/10 border-amber-500/20' },
  bundle:      { label: 'Bundles',      icon: Layers,      color: 'text-orange-400',  bg: 'bg-orange-500/10 border-orange-500/20' },
};

function fmt(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

function Stars({ r }: { r: number }) {
  return (
    <span className="flex items-center gap-0.5">
      {[1,2,3,4,5].map(i => (
        <Star key={i} className={`w-3 h-3 ${i <= Math.round(r) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-600'}`} />
      ))}
    </span>
  );
}

// ─── Default catalog (mirrors MarketplaceAdmin defaults) ──────────────────────

const DEFAULT_PRODUCTS: Product[] = [
  { id: 'eb-landlord-ops', category: 'ebook', pricingModel: 'one_time', deliveryMethod: 'download', title: 'NH Landlord Operations Manual', subtitle: 'The complete legal and operational guide for NH landlords', description: 'A professionally authored 85-page guide covering every aspect of NH landlord operations — from RSA 540 compliance and tenant screening to lease drafting, habitability standards, and the eviction process.', features: ['RSA 540 and RSA 540-A compliance guide', 'NH-specific tenant screening framework', 'Sample lease clauses (NH-compliant)', 'Security deposit rules and timelines', 'Step-by-step eviction process flowchart', 'Habitability standards checklist', 'Vendor contract guidance'], price: 2900, audience: ['Landlords', 'Property Managers'], rating: 4.9, reviews: 142, color: 'text-teal-400', badge: 'BESTSELLER', nhRelevant: true, popular: true, fileTypes: ['PDF', 'EPUB'], pages: 85, visible: true, sortOrder: 1, preview: 'Chapter 1 covers RSA 540 in plain English — no law degree required. Every NH landlord should understand their rights and obligations before accepting a first tenant.' },
  { id: 'eb-condo-board', category: 'ebook', pricingModel: 'one_time', deliveryMethod: 'download', title: 'Condo Board Governance Handbook', subtitle: 'Run your NH association with legal confidence', description: 'A 72-page guide for NH condo and HOA board members. Covers RSA 356-B in detail, board meeting procedures, fiduciary duties, budget governance, reserve funds, vendor contracts, and owner communication.', features: ['RSA 356-B plain-English guide', 'Board meeting agenda and minute templates', 'Fiduciary duty explained', 'Special assessment procedures', 'Reserve fund adequacy framework', 'Vendor contract red flags', 'Owner dispute resolution'], price: 2400, audience: ['Condo Boards', 'HOA Boards', 'Property Managers'], rating: 4.8, reviews: 98, color: 'text-violet-400', nhRelevant: true, popular: true, fileTypes: ['PDF'], pages: 72, visible: true, sortOrder: 2 },
  { id: 'eb-homeowner-guide', category: 'ebook', pricingModel: 'one_time', deliveryMethod: 'download', title: 'First-Time Homeowner Complete Guide', subtitle: 'Your first year of ownership — done right', description: 'Everything a new NH homeowner needs to know — from day one orientation to seasonal maintenance, building systems, emergency preparedness, and smart budgeting.', features: ['First 30-day orientation checklist', 'NH seasonal maintenance calendar', 'Building systems life expectancy chart', 'Emergency preparedness plan template', 'Annual budget worksheet', 'Eversource NH rebate guide', 'Contractor hiring checklist'], price: 1400, audience: ['Homeowners', 'First-Time Buyers'], rating: 4.7, reviews: 215, color: 'text-blue-400', nhRelevant: true, fileTypes: ['PDF', 'EPUB'], pages: 58, visible: true, sortOrder: 3 },
  { id: 'eb-capital-planning', category: 'ebook', pricingModel: 'one_time', deliveryMethod: 'download', title: 'Capital Planning for Property Managers', subtitle: 'Forecast, fund, and execute large capital projects', description: 'A technical 45-page guide to 10-year capital planning for multi-family and commercial properties.', features: ['Reserve study interpretation guide', 'Straight-line vs. percent-funded models', 'Financing vs. special assessment analysis', 'NH CDFA financing overview', 'Project bidding and contractor selection', '10-year capital planning spreadsheet', 'Owner communication templates'], price: 3400, audience: ['Property Managers', 'Condo Boards', 'Commercial Owners'], rating: 4.8, reviews: 67, color: 'text-orange-400', nhRelevant: true, fileTypes: ['PDF', 'XLSX'], pages: 45, visible: true, sortOrder: 4 },
  { id: 'eb-diy-repair', category: 'ebook', pricingModel: 'one_time', deliveryMethod: 'download', title: 'DIY Home Repair Encyclopedia', subtitle: 'Fix it yourself — safely and correctly', description: 'An illustrated 120-page guide to the most common home repairs. Covers plumbing, electrical safety, drywall, painting, weatherproofing, and NH-specific winterization.', features: ['100+ repair procedures with photos', 'NH winterization deep-dive', 'When to DIY vs. hire a pro', 'Tools required for each repair', 'Material cost estimates', 'Safety checklist per category', 'Eversource NH weatherization rebates'], price: 2900, audience: ['Homeowners', 'DIY Enthusiasts'], rating: 4.6, reviews: 189, color: 'text-amber-400', nhRelevant: true, fileTypes: ['PDF'], pages: 120, visible: true, sortOrder: 5 },
  { id: 'tmpl-nh-lease', category: 'template', pricingModel: 'one_time', deliveryMethod: 'download', title: 'NH Lease Agreement Template Pack', subtitle: 'Attorney-reviewed, RSA 540-compliant lease templates', description: 'Three NH lease agreement formats: standard 12-month, month-to-month, and room rental. All reviewed for RSA 540 compliance.', features: ['Standard 12-month lease (RSA 540-compliant)', 'Month-to-month lease agreement', 'Room rental agreement', 'Pet addendum (NH law)', 'Move-in inspection checklist addendum', 'Security deposit receipt', 'Lead paint disclosure', 'Editable Word and PDF formats'], price: 4900, audience: ['Landlords'], rating: 4.9, reviews: 321, color: 'text-green-400', badge: 'TOP RATED', nhRelevant: true, popular: true, fileTypes: ['DOCX', 'PDF'], visible: true, sortOrder: 6 },
  { id: 'tmpl-inspection', category: 'template', pricingModel: 'one_time', deliveryMethod: 'download', title: 'Property Inspection Report Template', subtitle: 'Document every unit condition with professional precision', description: 'A comprehensive move-in/move-out inspection template with room-by-room checklists, condition ratings, and signature fields.', features: ['Room-by-room condition checklist (16 areas)', 'Numerical condition rating system', 'Photo documentation log', 'Dual-party signature section', 'Damage cost estimation worksheet', 'NH RSA 540-A compliance notes', 'Fillable PDF and Word formats'], price: 1900, audience: ['Landlords', 'Property Managers'], rating: 4.8, reviews: 178, color: 'text-indigo-400', nhRelevant: true, fileTypes: ['PDF', 'DOCX'], visible: true, sortOrder: 7 },
  { id: 'tmpl-vendor-contract', category: 'template', pricingModel: 'one_time', deliveryMethod: 'download', title: 'Vendor Contract Template Pack', subtitle: 'Professional contracts for every property service', description: 'Five vendor contract templates: HVAC, landscaping/snow removal, cleaning, general handyman, and management agreement.', features: ['HVAC maintenance agreement', 'Landscaping and snow removal contract', 'Cleaning services agreement', 'General handyman contract', 'Property management agreement', 'Certificate of insurance checklist', 'NH contractor license verification guide'], price: 5900, audience: ['Property Managers', 'Condo Boards', 'Landlords'], rating: 4.7, reviews: 94, color: 'text-amber-400', nhRelevant: true, fileTypes: ['DOCX', 'PDF'], visible: true, sortOrder: 8 },
  { id: 'tmpl-board-meeting', category: 'template', pricingModel: 'one_time', deliveryMethod: 'download', title: 'Board Meeting Package', subtitle: 'Everything your association needs to run meetings professionally', description: 'A complete meeting package for condo and HOA boards: agenda template, minutes, action item tracker, proxy form, and annual meeting package.', features: ['Board meeting agenda template', 'Meeting minutes template (RSA 356-B compliant)', 'Action item tracker spreadsheet', 'Owner notification letter templates', 'Proxy voting form', 'Annual meeting package', 'Executive session documentation guide'], price: 2400, audience: ['Condo Boards', 'HOA Boards'], rating: 4.8, reviews: 112, color: 'text-violet-400', nhRelevant: true, fileTypes: ['DOCX', 'XLSX', 'PDF'], visible: true, sortOrder: 9 },
  { id: 'calc-roi', category: 'calculator', pricingModel: 'one_time', deliveryMethod: 'download', title: 'Property ROI Calculator', subtitle: 'Analyze any investment in minutes', description: 'An interactive Excel-based calculator modeling cash-on-cash return, cap rate, NOI, debt service coverage, and 10-year equity growth.', features: ['Cash-on-cash return model', 'Cap rate and NOI calculator', 'Mortgage amortization table', 'Vacancy and expense scenario modeling', '10-year equity projection', 'Comparison tool for multiple properties', 'NH-specific tax rate inputs'], price: 3900, audience: ['Real Estate Investors', 'Landlords', 'Commercial Owners'], rating: 4.9, reviews: 267, color: 'text-lime-400', badge: 'INTERACTIVE', nhRelevant: true, popular: true, fileTypes: ['XLSX'], visible: true, sortOrder: 10 },
  { id: 'calc-reserve', category: 'calculator', pricingModel: 'one_time', deliveryMethod: 'download', title: 'Reserve Fund Adequacy Calculator', subtitle: 'Know exactly where your reserve fund stands', description: 'A spreadsheet calculator that inventories capital components and projects future funding under different contribution scenarios.', features: ['Component inventory worksheet (50 line items)', 'Current percent-funded score', '3 funding scenario models', 'Annual contribution optimizer', 'Special assessment probability estimator', '10-year projection chart', 'Board presentation chart pack'], price: 2900, audience: ['Condo Boards', 'HOA Boards', 'Property Managers'], rating: 4.8, reviews: 83, color: 'text-orange-400', nhRelevant: true, fileTypes: ['XLSX'], visible: true, sortOrder: 11 },
  { id: 'calc-ev-roi', category: 'calculator', pricingModel: 'one_time', deliveryMethod: 'download', title: 'EV Charging Revenue Calculator', subtitle: 'Model your EV charging ROI with Eversource NH rebates', description: 'Calculate exact ROI on EV charging station installation — Eversource NH rebates, installation costs, and annual revenue projections.', features: ['Eversource NH rebate calculator', 'Installation cost estimator', 'Revenue projection by port count', 'Payback period analysis', 'Pricing strategy comparison', 'NH net metering integration model', 'Residential vs. commercial comparison'], price: 1900, audience: ['Condo Boards', 'Property Managers', 'Commercial Owners'], rating: 4.7, reviews: 45, color: 'text-emerald-400', nhRelevant: true, fileTypes: ['XLSX'], visible: true, sortOrder: 12 },
  { id: 'calc-rental-pricing', category: 'calculator', pricingModel: 'one_time', deliveryMethod: 'download', title: 'Rental Pricing Optimizer', subtitle: 'Set the right rent for every unit', description: 'A market-driven rental pricing model factoring comparable rents, vacancy sensitivity, seasonal adjustment, and unit features.', features: ['Comparable rent analysis framework', 'Vacancy rate sensitivity model', 'Seasonal pricing adjustment table', 'Unit feature value matrix', 'Optimal rent recommendation engine', 'Revenue maximization scenario planner', 'NH market benchmark data (2026)'], price: 2400, audience: ['Landlords', 'Property Managers'], rating: 4.6, reviews: 61, color: 'text-cyan-400', nhRelevant: true, fileTypes: ['XLSX'], visible: true, sortOrder: 13 },
  { id: 'air-property-health', category: 'ai_report', pricingModel: 'one_time', deliveryMethod: 'generated', title: 'AI Property Health Report', subtitle: 'A personalized property assessment powered by AI', description: 'Submit your property details and receive a 12-page AI-generated health assessment covering maintenance status, risk flags, capital needs, and a 90-day action plan.', features: ['AI-generated maintenance health score', 'System-by-system risk assessment', '90-day action plan', 'Estimated capital needs (1-3 year horizon)', 'NH seasonal risk flags', 'Vendor recommendation list', 'Executive summary PDF'], price: 7900, audience: ['Homeowners', 'Landlords', 'Property Managers'], rating: 4.9, reviews: 38, color: 'text-violet-400', badge: 'AI-POWERED', nhRelevant: true, popular: true, fileTypes: ['PDF'], visible: true, sortOrder: 14 },
  { id: 'air-revenue-opp', category: 'ai_report', pricingModel: 'one_time', deliveryMethod: 'generated', title: 'Revenue Opportunity Analysis', subtitle: 'Uncover hidden revenue in your portfolio', description: 'A data-driven AI report identifying underperforming assets, pricing gaps, and revenue opportunities including ADU, EV charging, storage, and laundry.', features: ['Portfolio revenue gap analysis', 'Rent optimization recommendations', 'ADU feasibility assessment', 'Ancillary revenue opportunities', 'EV charging revenue model', 'Expense reduction targets', '12-month revenue growth roadmap'], price: 9900, audience: ['Landlords', 'Property Managers', 'Real Estate Investors'], rating: 4.8, reviews: 29, color: 'text-emerald-400', badge: 'AI-POWERED', nhRelevant: true, fileTypes: ['PDF'], visible: true, sortOrder: 15 },
  { id: 'air-capital-plan', category: 'ai_report', pricingModel: 'one_time', deliveryMethod: 'generated', title: 'AI 10-Year Capital Plan', subtitle: 'Your complete capital roadmap built by AI', description: 'A custom 10-year capital plan from your property inventory — modeling component lifespans, replacement costs, funding scenarios, and annual contribution schedules.', features: ['Full component lifecycle model', 'Annual contribution schedule', '3 funding scenario comparison', 'Special assessment risk score', 'NH contractor cost benchmarks', 'Reserve fund growth projections', 'Board-ready presentation deck'], price: 12900, audience: ['Condo Boards', 'Property Managers', 'HOA Boards'], rating: 4.9, reviews: 17, color: 'text-orange-400', badge: 'AI-POWERED', nhRelevant: true, fileTypes: ['PDF', 'XLSX'], visible: true, sortOrder: 16 },
  { id: 'maint-nh-winter', category: 'maintenance', pricingModel: 'one_time', deliveryMethod: 'download', title: 'NH Winter Prep Package', subtitle: 'Get your property ready for New Hampshire winters', description: "A complete NH winter preparation kit: 47-item winterization checklist, vendor call scheduling template, emergency contact log, and a storm response protocol.", features: ['47-item winterization checklist', 'System-by-system prep guide', 'Vendor call scheduling template', 'Emergency contact log', 'Storm response protocol', 'Pipe freeze prevention guide', 'Eversource weatherization rebate checklist'], price: 3400, audience: ['Homeowners', 'Landlords', 'Property Managers'], rating: 4.8, reviews: 156, color: 'text-blue-400', nhRelevant: true, popular: true, fileTypes: ['PDF', 'DOCX'], visible: true, sortOrder: 17 },
  { id: 'maint-annual-planner', category: 'maintenance', pricingModel: 'one_time', deliveryMethod: 'download', title: 'Annual Maintenance Planner', subtitle: '12-month property maintenance calendar', description: 'A complete 12-month property maintenance planning kit with month-by-month checklists, vendor scheduling templates, and budget tracking worksheets.', features: ['12-month maintenance calendar', 'Month-by-month task checklists', 'Vendor scheduling template', 'Maintenance budget tracker', 'System inspection schedules', 'NH seasonal timeline guide', 'Annual review worksheet'], price: 2400, audience: ['Homeowners', 'Landlords', 'Condo Boards'], rating: 4.7, reviews: 203, color: 'text-green-400', nhRelevant: true, fileTypes: ['PDF', 'XLSX'], visible: true, sortOrder: 18 },
  { id: 'bundle-landlord-starter', category: 'bundle', pricingModel: 'one_time', deliveryMethod: 'download', title: 'Landlord Starter Bundle', subtitle: 'Everything a new NH landlord needs — one price', description: 'The essential bundle for new NH landlords: NH Landlord Operations Manual + NH Lease Agreement Pack + Property Inspection Report Template. Saves $121 vs. buying separately.', features: ['NH Landlord Operations Manual (85 pages)', 'NH Lease Agreement Pack (3 leases + addenda)', 'Property Inspection Report Template', 'NH RSA 540 compliance guide included', 'Editable Word and PDF formats', 'Instant download', '30-day satisfaction guarantee'], price: 8900, originalPrice: 21000, audience: ['Landlords', 'First-Time Landlords'], rating: 4.9, reviews: 74, color: 'text-orange-400', badge: 'SAVE $121', nhRelevant: true, popular: true, fileTypes: ['PDF', 'DOCX', 'EPUB'], visible: true, sortOrder: 19 },
  { id: 'bundle-condo-complete', category: 'bundle', pricingModel: 'one_time', deliveryMethod: 'download', title: 'Condo Board Complete Bundle', subtitle: 'The full governance toolkit for NH condo boards', description: 'Everything a condo board needs: Condo Board Governance Handbook + Board Meeting Package + Reserve Fund Adequacy Calculator.', features: ['Condo Board Governance Handbook (72 pages)', 'Board Meeting Package (6 templates)', 'Reserve Fund Adequacy Calculator (Excel)', 'RSA 356-B compliance guide', 'Instant download', '30-day satisfaction guarantee'], price: 14900, originalPrice: 17700, audience: ['Condo Boards', 'HOA Boards'], rating: 4.8, reviews: 41, color: 'text-violet-400', badge: 'SAVE $28', nhRelevant: true, fileTypes: ['PDF', 'DOCX', 'XLSX', 'EPUB'], visible: true, sortOrder: 20 },
  { id: 'bundle-pm-pro', category: 'bundle', pricingModel: 'one_time', deliveryMethod: 'download', title: 'Property Manager Pro Bundle', subtitle: 'The complete toolkit for professional property managers', description: 'The ultimate bundle: Capital Planning Guide + Vendor Contract Pack + Property ROI Calculator + Annual Maintenance Planner. Saves $100 vs. buying separately.', features: ['Capital Planning for Property Managers (45 pages)', 'Vendor Contract Template Pack (5 contracts)', 'Property ROI Calculator (Excel)', 'Annual Maintenance Planner (12-month)', 'NH CDFA financing overview included', 'Instant download', '30-day satisfaction guarantee'], price: 19900, originalPrice: 29700, audience: ['Property Managers', 'Commercial Owners'], rating: 4.9, reviews: 33, color: 'text-orange-400', badge: 'SAVE $100', nhRelevant: true, fileTypes: ['PDF', 'DOCX', 'XLSX'], visible: true, sortOrder: 21 },
];

// ─── Main Component ───────────────────────────────────────────────────────────

export default function DigitalStorefront() {
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [selected, setSelected] = useState<Product | null>(null);
  const [purchased, setPurchased] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState<ProductCategory | 'all'>('all');
  const [checkoutStep, setCheckoutStep] = useState<'cart' | 'details' | 'processing' | 'success'>('cart');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');

  // Live merchandising config (boosters + promotions) from the admin panels.
  const { boosters, promotions, activeDiscounts } = useStoreConfig();

  // Rolling urgency countdown — seeded once per visit from the configured minutes.
  const [urgencyLeft, setUrgencyLeft] = useState<number>(0);
  useEffect(() => {
    if (!boosters.urgency.enabled) return;
    setUrgencyLeft(boosters.urgency.minutes * 60);
    const t = setInterval(() => setUrgencyLeft(s => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, [boosters.urgency.enabled, boosters.urgency.minutes]);

  // Effective (post-discount) unit price for display.
  const priceOf = (p: Product) => effectiveUnitPrice(p, activeDiscounts);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${SERVER}/marketplace/products`, {
          headers: await authedHeadersOrAnon(publicAnonKey),
        });
        if (res.ok) {
          const data = await res.json();
          const prods = (data.products || data) as Product[];
          if (prods.length > 0) {
            setProducts(prods);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(prods));
            return;
          }
        }
      } catch {}
      // Fallback: localStorage → defaults
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        setProducts(raw ? JSON.parse(raw) : DEFAULT_PRODUCTS);
      } catch { setProducts(DEFAULT_PRODUCTS); }
    })();
    try {
      const p = JSON.parse(localStorage.getItem(PURCHASED_KEY) || '[]');
      setPurchased(new Set(p));
    } catch {}
  }, []);

  // ── Return from Stripe ───────────────────────────────────────────────────
  // Stripe sends the shopper back to /store?checkout=success&session_id=…
  // We verify the session server-side before marking the order paid or
  // unlocking any downloads — the URL alone is never treated as proof.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const outcome = params.get('checkout');
    const sessionId = params.get('session_id');

    const clearQuery = () => {
      try { window.history.replaceState({}, '', window.location.pathname); } catch { /* ignore */ }
    };

    if (outcome === 'cancelled') {
      toast.info('Checkout cancelled — nothing was charged. Your cart is still here.');
      clearQuery();
      return;
    }
    if (outcome !== 'success' || !sessionId) return;

    (async () => {
      try {
        const res = await fetch(`${SERVER}/marketplace/checkout/complete`, {
          method: 'POST',
          headers: await authedHeadersOrAnon(publicAnonKey),
          body: JSON.stringify({ sessionId }),
        });
        const data = await res.json().catch(() => null);
        if (!res.ok || !data?.success) {
          const reason = data?.error || `Could not confirm your payment (${res.status}).`;
          console.error('[DigitalStorefront] checkout completion failed:', reason);
          toast.error(`${reason} If you were charged, contact support with your Stripe receipt.`);
          return;
        }
        // Payment confirmed by Stripe — unlock the purchased items.
        const ids: string[] = (data.order?.items || []).map((i: any) => String(i.id)).filter(Boolean);
        setPurchased(prev => {
          const next = new Set([...prev, ...ids]);
          try { localStorage.setItem(PURCHASED_KEY, JSON.stringify([...next])); } catch { /* ignore */ }
          return next;
        });
        setCart([]);
        toast.success(`Payment confirmed — order ${data.order?.id || ''} is complete. A receipt is on its way.`);
      } catch (err: any) {
        console.error('[DigitalStorefront] checkout completion threw:', err);
        toast.error('We could not reach the server to confirm your payment. If you were charged, contact support.');
      } finally {
        clearQuery();
      }
    })();
  }, []);

  const visible = useMemo(() =>
    products
      .filter(p => p.visible)
      .filter(p => filterCat === 'all' || p.category === filterCat)
      .filter(p => !search || p.title.toLowerCase().includes(search.toLowerCase()) || p.subtitle.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => a.sortOrder - b.sortOrder),
    [products, filterCat, search]
  );

  const featured = useMemo(() => products.filter(p => p.visible && p.popular).slice(0, 3), [products]);
  // List price (pre-promotion) vs. the effective total after scheduled + volume discounts.
  const cartListTotal = cart.reduce((a, i) => a + i.product.price * i.quantity, 0);
  const cartTotal = cart.reduce((a, i) => a + lineTotal(i.product, i.quantity, activeDiscounts, promotions), 0);
  const cartCount = cart.reduce((a, i) => a + i.quantity, 0);
  const promoSavings = cartListTotal - cartTotal;
  const bundleSavings = cart.reduce((a, i) => a + (i.product.originalPrice ? (i.product.originalPrice - i.product.price) * i.quantity : 0), 0);
  const cartSavings = bundleSavings + promoSavings;

  // Free-shipping progress (boosters). threshold stored in cents.
  const freeShip = boosters.freeShipping;
  const freeShipRemaining = Math.max(0, (freeShip.threshold || 0) - cartTotal);
  const freeShipUnlocked = freeShip.enabled && cartTotal >= (freeShip.threshold || 0);
  const freeShipPct = freeShip.threshold ? Math.min(100, Math.round((cartTotal / freeShip.threshold) * 100)) : 0;

  // Cart upsell — popular products not already in the cart.
  const upsellItems = useMemo(() => {
    if (!boosters.cartUpsell.enabled) return [] as Product[];
    const inCart = new Set(cart.map(i => i.product.id));
    return products
      .filter(p => p.visible && p.popular && !inCart.has(p.id))
      .slice(0, boosters.cartUpsell.maxItems || 4);
  }, [products, cart, boosters.cartUpsell]);

  const fmtTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  function addToCart(p: Product) {
    setCart(prev => {
      const ex = prev.find(i => i.product.id === p.id);
      if (ex) return prev.map(i => i.product.id === p.id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { product: p, quantity: 1 }];
    });
    toast.success(`"${p.title}" added to cart`);
  }

  function removeFromCart(id: string) { setCart(prev => prev.filter(i => i.product.id !== id)); }
  function updateQty(id: string, qty: number) {
    if (qty < 1) { removeFromCart(id); return; }
    setCart(prev => prev.map(i => i.product.id === id ? { ...i, quantity: qty } : i));
  }

  async function processCheckout() {
    if (!name.trim() || !email.trim()) { toast.error('Name and email are required'); return; }
    setCheckoutStep('processing');
    try {
      const res = await fetch(`${SERVER.replace('/make-server-3eae23a6', '')}/make-server-3eae23a6/marketplace/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${publicAnonKey}` },
        body: JSON.stringify({
          // Promotion-adjusted unit price, in DOLLARS — the server converts to
          // Stripe's cents itself. Catalog prices are stored in cents.
          items: cart.map(i => {
            const unitCents = Math.round(lineTotal(i.product, i.quantity, activeDiscounts, promotions) / i.quantity);
            return { id: i.product.id, title: i.product.title, price: unitCents / 100, qty: i.quantity };
          }),
          email,
          name,
          successUrl: `${window.location.origin}/store?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
          cancelUrl: `${window.location.origin}/store?checkout=cancelled`,
        }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.url) { window.location.href = data.url; return; }
      const reason = data?.error || `Checkout could not be started (${res.status}).`;
      console.error('[DigitalStorefront] checkout failed:', reason);
      toast.error(reason);
    } catch (err: any) {
      console.error('[DigitalStorefront] checkout request threw:', err);
      toast.error(err?.message || 'Could not reach the payment processor. Nothing was charged.');
    }
    // Never grant products without a confirmed Stripe payment — send the shopper
    // back to the cart so they can retry.
    setCheckoutStep('cart');
  }

  function openCart() { setShowCart(true); setCheckoutStep('cart'); }

  // Every product has its own shareable page at /digital-product?id=<id>. That
  // page is also where a buyer verifies their purchase and downloads the file.
  function openProductPage(p: Product) {
    (window as any).__navigateApp?.(`/digital-product?id=${encodeURIComponent(p.id)}`);
  }

  const CatIcon = ({ cat }: { cat: ProductCategory }) => {
    const Icon = CAT_CONFIG[cat].icon;
    return <Icon className={`w-4 h-4 ${CAT_CONFIG[cat].color}`} />;
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      {/* Cart Drawer */}
      <AnimatePresence>
        {showCart && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/70 z-[9999]" onClick={() => setShowCart(false)} />
            <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 350, damping: 35 }}
              className="fixed right-0 top-0 h-[100dvh] w-full max-w-md bg-[#111] border-l border-[#2A2A2A] z-[10000] flex flex-col">
              {/* Cart Header */}
              <div className="flex-shrink-0 flex items-center justify-between px-6 py-5 border-b border-[#2A2A2A]">
                <h2 className="font-bold text-lg text-white flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5 text-orange-400" />
                  {checkoutStep === 'success' ? 'Order Complete!' : checkoutStep === 'processing' ? 'Processing…' : checkoutStep === 'details' ? 'Checkout' : `Cart (${cartCount})`}
                </h2>
                <button onClick={() => setShowCart(false)} className="p-1.5 hover:bg-[#2A2A2A] rounded-lg text-gray-400 hover:text-white transition">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-6">
                {/* Success */}
                {checkoutStep === 'success' && (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 rounded-full bg-green-500/20 border border-green-500/30 flex items-center justify-center mx-auto mb-4">
                      <CheckCircle className="w-8 h-8 text-green-400" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">Thank you!</h3>
                    <p className="text-sm text-gray-400 mb-6">Your download links have been sent to <strong className="text-white">{email}</strong></p>
                    <button onClick={() => { setShowCart(false); setCheckoutStep('cart'); }}
                      className="px-6 py-2.5 bg-orange-600 hover:bg-orange-500 text-white rounded-lg text-sm font-semibold transition">
                      Continue Shopping
                    </button>
                  </div>
                )}

                {/* Processing */}
                {checkoutStep === 'processing' && (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 rounded-full bg-orange-500/20 border border-orange-500/30 flex items-center justify-center mx-auto mb-4 animate-spin">
                      <Zap className="w-8 h-8 text-orange-400" />
                    </div>
                    <p className="text-gray-400 text-sm">Securing your order…</p>
                  </div>
                )}

                {/* Checkout Details */}
                {checkoutStep === 'details' && (
                  <div className="space-y-5">
                    <button onClick={() => setCheckoutStep('cart')} className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition">
                      <ChevronLeft className="w-4 h-4" /> Back to cart
                    </button>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-semibold text-gray-400 mb-1.5">Full Name *</label>
                        <input value={name} onChange={e => setName(e.target.value)}
                          placeholder="Your name"
                          className="w-full bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500 placeholder-gray-600" />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-400 mb-1.5">Email Address *</label>
                        <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                          placeholder="your@email.com"
                          className="w-full bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500 placeholder-gray-600" />
                      </div>
                    </div>
                    <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-4 space-y-2">
                      {cart.map(i => (
                        <div key={i.product.id} className="flex justify-between text-sm">
                          <span className="text-gray-300 truncate flex-1 mr-3">{i.product.title} × {i.quantity}</span>
                          <span className="text-white font-medium">{fmt(lineTotal(i.product, i.quantity, activeDiscounts, promotions))}</span>
                        </div>
                      ))}
                      <div className="border-t border-[#2A2A2A] pt-2 flex justify-between font-bold">
                        <span className="text-white">Total</span>
                        <span className="text-orange-400">{fmt(cartTotal)}</span>
                      </div>
                    </div>
                    <div className="flex gap-2 text-xs text-gray-500">
                      <Shield className="w-3.5 h-3.5 text-green-400 flex-shrink-0 mt-0.5" />
                      <span>Secure checkout · Instant download · 30-day satisfaction guarantee</span>
                    </div>
                  </div>
                )}

                {/* Cart Items */}
                {checkoutStep === 'cart' && (
                  <>
                    {cart.length === 0 ? (
                      <div className="text-center py-16">
                        <ShoppingCart className="w-10 h-10 mx-auto mb-3 text-gray-600" />
                        <p className="text-gray-500 text-sm">Your cart is empty</p>
                        <button onClick={() => setShowCart(false)}
                          className="mt-4 px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-lg text-sm font-semibold transition">
                          Browse Products
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {cart.map(item => (
                          <div key={item.product.id} className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-4 flex gap-3">
                            <div className={`w-10 h-10 rounded-lg border flex items-center justify-center flex-shrink-0 ${CAT_CONFIG[item.product.category].bg}`}>
                              <CatIcon cat={item.product.category} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-white truncate">{item.product.title}</p>
                              <p className="text-xs text-gray-500">{item.product.fileTypes.join(', ')}</p>
                              <div className="flex items-center gap-2 mt-2">
                                <button onClick={() => updateQty(item.product.id, item.quantity - 1)}
                                  className="w-6 h-6 rounded bg-[#2A2A2A] flex items-center justify-center text-gray-400 hover:text-white transition">
                                  <Minus className="w-3 h-3" />
                                </button>
                                <span className="text-sm text-white font-medium w-4 text-center">{item.quantity}</span>
                                <button onClick={() => updateQty(item.product.id, item.quantity + 1)}
                                  className="w-6 h-6 rounded bg-[#2A2A2A] flex items-center justify-center text-gray-400 hover:text-white transition">
                                  <Plus className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <p className="text-sm font-bold text-white">{fmt(item.product.price * item.quantity)}</p>
                              <button onClick={() => removeFromCart(item.product.id)}
                                className="mt-2 text-gray-500 hover:text-red-400 transition">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                        {cartSavings > 0 && (
                          <div className="bg-green-500/10 border border-green-500/20 rounded-lg px-4 py-2.5 text-sm text-green-400 flex items-center gap-2">
                            <Gift className="w-4 h-4" /> You save {fmt(cartSavings)} on this order!
                          </div>
                        )}

                        {/* Cart upsell — "Frequently bought together" */}
                        {upsellItems.length > 0 && (
                          <div className="pt-2">
                            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">{boosters.cartUpsell.heading}</p>
                            <div className="space-y-2">
                              {upsellItems.map(u => {
                                const up = priceOf(u);
                                return (
                                  <div key={u.id} className="flex items-center gap-3 bg-[#141414] border border-[#2A2A2A] rounded-lg p-2.5">
                                    <div className={`w-8 h-8 rounded-lg border flex items-center justify-center flex-shrink-0 ${CAT_CONFIG[u.category].bg}`}>
                                      <CatIcon cat={u.category} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-xs font-medium text-white truncate">{u.title}</p>
                                      <p className="text-xs text-orange-400 font-semibold">{fmt(up.price)}</p>
                                    </div>
                                    <button onClick={() => addToCart(u)}
                                      className="px-2.5 py-1.5 bg-orange-600/20 hover:bg-orange-600 border border-orange-500/30 hover:border-orange-500 text-orange-300 hover:text-white text-xs font-semibold rounded-lg transition flex items-center gap-1">
                                      <Plus className="w-3 h-3" /> Add
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Cart Footer */}
              {checkoutStep === 'cart' && cart.length > 0 && (
                <div className="px-6 py-5 border-t border-[#2A2A2A] space-y-3">
                  {/* Urgency countdown */}
                  {boosters.urgency.enabled && urgencyLeft > 0 && (
                    <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 text-xs text-red-300">
                      <Clock className="w-3.5 h-3.5 flex-shrink-0" />
                      <span className="flex-1">{boosters.urgency.message}</span>
                      <span className="font-mono font-bold text-red-400">{fmtTime(urgencyLeft)}</span>
                    </div>
                  )}

                  {/* Free-shipping progress */}
                  {freeShip.enabled && (
                    <div className="bg-[#141414] border border-[#2A2A2A] rounded-lg px-3 py-2.5">
                      <div className="flex items-center gap-2 text-xs mb-1.5">
                        <Truck className={`w-3.5 h-3.5 flex-shrink-0 ${freeShipUnlocked ? 'text-green-400' : 'text-orange-400'}`} />
                        <span className={freeShipUnlocked ? 'text-green-400 font-medium' : 'text-gray-300'}>
                          {freeShipUnlocked
                            ? freeShip.unlockedMessage
                            : freeShip.message.replace('{remaining}', fmt(freeShipRemaining))}
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-[#2A2A2A] overflow-hidden">
                        <div className={`h-full rounded-full transition-all ${freeShipUnlocked ? 'bg-green-500' : 'bg-orange-500'}`}
                          style={{ width: `${freeShipPct}%` }} />
                      </div>
                    </div>
                  )}

                  {promoSavings > 0 && (
                    <div className="flex justify-between text-xs text-green-400">
                      <span>Promotions & volume discounts</span>
                      <span>−{fmt(promoSavings)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Subtotal ({cartCount} item{cartCount !== 1 ? 's' : ''})</span>
                    <span className="font-bold text-white">{fmt(cartTotal)}</span>
                  </div>
                  <button onClick={() => { setShowCart(false); setCheckoutOpen(true); }}
                    className="w-full py-3 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-sm font-bold transition flex items-center justify-center gap-2">
                    <CreditCard className="w-4 h-4" /> Proceed to Checkout
                  </button>
                </div>
              )}
              {checkoutStep === 'details' && (
                <div className="px-6 py-5 border-t border-[#2A2A2A]">
                  <button onClick={processCheckout}
                    className="w-full py-3 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-sm font-bold transition flex items-center justify-center gap-2">
                    <Lock className="w-4 h-4" /> Complete Purchase — {fmt(cartTotal)}
                  </button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Unified Checkout */}
      <UnifiedCheckout
        open={checkoutOpen}
        items={cart.map(i => ({
          id: String(i.product.id),
          name: i.product.title,
          price: Math.round(lineTotal(i.product, i.quantity, activeDiscounts, promotions) / i.quantity) / 100,
          quantity: i.quantity,
        }))}
        subtotal={cartTotal / 100}
        requireShipping={false}
        submitLabel={amt => `Complete Purchase — $${amt.toFixed(2)}`}
        initialCustomer={{ name, email }}
        onEditCart={() => { setCheckoutOpen(false); setShowCart(true); }}
        onClose={() => setCheckoutOpen(false)}
        onSubmit={async customer => {
          setName(customer.name);
          setEmail(customer.email);
          try {
            const res = await fetch(`${SERVER.replace('/make-server-3eae23a6', '')}/make-server-3eae23a6/marketplace/checkout`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${publicAnonKey}` },
              body: JSON.stringify({
                // The server multiplies by 100 to reach Stripe's cents, so this
                // must be DOLLARS. Catalog prices are stored in cents.
                items: cart.map(i => {
                  const unitCents = Math.round(lineTotal(i.product, i.quantity, activeDiscounts, promotions) / i.quantity);
                  return { id: i.product.id, title: i.product.title, price: unitCents / 100, qty: i.quantity };
                }),
                email: customer.email,
                name: customer.name,
                successUrl: `${window.location.origin}/store?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
                cancelUrl: `${window.location.origin}/store?checkout=cancelled`,
              }),
            });
            const data = await res.json().catch(() => null);
            if (res.ok && data?.url) return { url: data.url };
            // No silent "purchase complete" — an order is only real once Stripe
            // has actually taken the money.
            const reason = data?.error || `Checkout could not be started (${res.status}).`;
            console.error('[DigitalStorefront] checkout failed:', reason);
            return { error: reason };
          } catch (err: any) {
            console.error('[DigitalStorefront] checkout request threw:', err);
            return { error: err?.message || 'Could not reach the payment processor. Nothing was charged — please try again.' };
          }
        }}
      />

      {/* Product Detail Panel */}
      <AnimatePresence>
        {selected && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/70 z-[9999]" onClick={() => setSelected(null)} />
            <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 350, damping: 35 }}
              className="fixed right-0 top-0 h-full w-full max-w-lg bg-[#111] border-l border-[#2A2A2A] z-[10000] overflow-y-auto">
              <div className="sticky top-0 bg-[#111] border-b border-[#2A2A2A] px-6 py-4 flex items-center justify-between">
                <span className={`text-xs font-semibold ${CAT_CONFIG[selected.category].color}`}>{CAT_CONFIG[selected.category].label}</span>
                <button onClick={() => setSelected(null)} className="p-1.5 hover:bg-[#2A2A2A] rounded-lg text-gray-400 hover:text-white transition">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 space-y-6">
                <div>
                  <div className="flex items-start gap-3 mb-4">
                    <div className={`w-12 h-12 rounded-xl border flex items-center justify-center flex-shrink-0 ${CAT_CONFIG[selected.category].bg}`}>
                      <CatIcon cat={selected.category} />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-white leading-snug">{selected.title}</h2>
                      <p className="text-sm text-gray-400 mt-0.5">{selected.subtitle}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex items-center gap-1.5">
                      <Stars r={selected.rating} />
                      <span className="text-sm text-gray-400">{selected.rating} ({selected.reviews} reviews)</span>
                    </div>
                    {selected.badge && (
                      <span className="px-2 py-0.5 bg-orange-500/20 border border-orange-500/30 text-orange-300 text-xs font-bold rounded">
                        {selected.badge}
                      </span>
                    )}
                  </div>
                </div>

                {/* Price */}
                {(() => {
                  const ep = priceOf(selected);
                  const onSale = ep.price < selected.price;
                  return (
                    <div>
                      <div className="flex items-baseline gap-3 flex-wrap">
                        <span className="text-3xl font-bold text-white">{fmt(ep.price)}</span>
                        {(onSale || selected.originalPrice) && (
                          <span className="text-lg text-gray-500 line-through">{fmt(selected.originalPrice || selected.price)}</span>
                        )}
                        <span className="text-sm text-gray-500">{selected.pricingModel === 'subscription' ? '/month' : 'one-time'}</span>
                      </div>
                      {ep.promoName && (
                        <span className="inline-flex items-center gap-1 mt-2 px-2 py-0.5 bg-red-500/15 border border-red-500/30 text-red-300 text-xs font-bold rounded">
                          <Tag className="w-3 h-3" /> {ep.promoName}
                        </span>
                      )}
                    </div>
                  );
                })()}

                {/* Low-stock scarcity (physical/dropship items only) */}
                {boosters.stockScarcity.enabled && typeof selected.stock === 'number' && selected.stock > 0 && selected.stock <= boosters.stockScarcity.threshold && (
                  <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2 text-sm text-amber-300">
                    <Zap className="w-4 h-4" /> {boosters.stockScarcity.message.replace('{count}', String(selected.stock))}
                  </div>
                )}

                {/* Volume pricing tiers */}
                {promotions.volumePricing.enabled && promotions.volumePricing.tiers.length > 0 && (
                  <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-4">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5" /> Buy more, save more
                    </p>
                    <div className="space-y-1.5">
                      {[...promotions.volumePricing.tiers].sort((a, b) => a.minQty - b.minQty).map((t, i) => (
                        <div key={i} className="flex justify-between text-sm">
                          <span className="text-gray-300">Buy {t.minQty}+</span>
                          <span className="text-green-400 font-semibold">{t.discountPercent}% off</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* CTA */}
                <div className="space-y-2">
                  {purchased.has(selected.id) ? (
                    <button onClick={() => openProductPage(selected)}
                      className="w-full py-3 bg-green-600/20 hover:bg-green-600/40 border border-green-500/30 text-green-400 rounded-xl text-sm font-bold transition flex items-center justify-center gap-2">
                      <Download className="w-4 h-4" /> Download your files →
                    </button>
                  ) : (
                    <button onClick={() => { addToCart(selected); setSelected(null); }}
                      className="w-full py-3 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-sm font-bold transition flex items-center justify-center gap-2">
                      <ShoppingCart className="w-4 h-4" /> Add to Cart
                    </button>
                  )}
                  <button onClick={() => openProductPage(selected)}
                    className="w-full py-2.5 bg-[#1A1A1A] hover:bg-[#222] border border-[#2A2A2A] text-gray-300 rounded-xl text-sm font-semibold transition flex items-center justify-center gap-2">
                    <ArrowRight className="w-4 h-4" /> View full product page
                  </button>
                </div>

                {/* Description */}
                <div>
                  <h3 className="text-sm font-bold text-white mb-2">About this product</h3>
                  <p className="text-sm text-gray-400 leading-relaxed">{selected.description}</p>
                </div>

                {/* Preview */}
                {selected.preview && (
                  <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-4">
                    <p className="text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wide">Free Preview</p>
                    <p className="text-sm text-gray-300 italic leading-relaxed">"{selected.preview}"</p>
                  </div>
                )}

                {/* Features */}
                <div>
                  <h3 className="text-sm font-bold text-white mb-3">What's included</h3>
                  <ul className="space-y-2">
                    {selected.features.map((f, i) => (
                      <li key={i} className="flex items-start gap-2.5 text-sm text-gray-300">
                        <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" /> {f}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Metadata */}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {selected.pages && (
                    <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg p-3">
                      <p className="text-xs text-gray-500 mb-0.5">Length</p>
                      <p className="font-medium text-white">{selected.pages} pages</p>
                    </div>
                  )}
                  <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg p-3">
                    <p className="text-xs text-gray-500 mb-0.5">Format</p>
                    <p className="font-medium text-white">{selected.fileTypes.join(', ')}</p>
                  </div>
                  <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg p-3">
                    <p className="text-xs text-gray-500 mb-0.5">Delivery</p>
                    <p className="font-medium text-white capitalize">{selected.deliveryMethod}</p>
                  </div>
                  <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg p-3">
                    <p className="text-xs text-gray-500 mb-0.5">Audience</p>
                    <p className="font-medium text-white">{selected.audience.slice(0, 2).join(', ')}</p>
                  </div>
                </div>

                {/* Trust */}
                <div className="grid grid-cols-2 gap-3">
                  {[['Instant Access', 'Download immediately after purchase'],['30-Day Guarantee', 'Full refund if not satisfied'],['NH-Specific', 'Written for New Hampshire law & climate'],['Secure Checkout', 'Stripe-protected payment']].map(([t, d]) => (
                    <div key={t} className="flex items-start gap-2 text-xs text-gray-400">
                      <Shield className="w-3.5 h-3.5 text-green-400 flex-shrink-0 mt-0.5" />
                      <div><p className="text-white font-medium">{t}</p><p>{d}</p></div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Store Header / Hero */}
      <div className="relative border-b border-[#1A1A1A] bg-gradient-to-b from-[#111] to-[#0A0A0A]">
        <div className="max-w-6xl mx-auto px-6 py-12">
          <div className="flex items-start justify-between gap-6 flex-wrap">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-orange-600/20 border border-orange-500/30 flex items-center justify-center">
                  <Package className="w-4 h-4 text-orange-400" />
                </div>
                <span className="text-sm font-semibold text-orange-400">Black Phoenix Digital Store</span>
              </div>
              <h1 className="text-3xl md:text-4xl font-black text-white leading-tight mb-3">
                NH Property Resources<br />
                <span className="text-orange-400">Built for Real Owners</span>
              </h1>
              <p className="text-gray-400 max-w-md">
                Ebooks, templates, calculators, and AI-powered reports written specifically for New Hampshire property owners, landlords, and condo boards.
              </p>
              <div className="flex items-center gap-4 mt-4 flex-wrap">
                {[['Instant Download', Download],['NH-Specific', Shield],['30-Day Guarantee', CheckCircle]].map(([label, Icon]: any) => (
                  <div key={label} className="flex items-center gap-1.5 text-xs text-gray-400">
                    <Icon className="w-3.5 h-3.5 text-green-400" /> {label}
                  </div>
                ))}
              </div>
            </div>
            <button onClick={openCart}
              className="relative flex items-center gap-2 px-5 py-3 bg-orange-600 hover:bg-orange-500 text-white rounded-xl font-semibold transition">
              <ShoppingCart className="w-5 h-5" />
              Cart
              {cartCount > 0 && (
                <span className="absolute -top-2 -right-2 w-5 h-5 bg-white text-orange-600 text-xs font-bold rounded-full flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-10 space-y-12">
        {/* Featured */}
        {featured.length > 0 && (
          <section>
            <h2 className="text-lg font-bold text-white mb-5 flex items-center gap-2">
              <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" /> Most Popular
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {featured.map(p => {
                const Icon = CAT_CONFIG[p.category].icon;
                return (
                  <div key={p.id} onClick={() => openProductPage(p)}
                    className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-5 cursor-pointer hover:border-orange-500/40 transition group">
                    <div className="flex items-start gap-3 mb-4">
                      <div className={`w-10 h-10 rounded-xl border flex items-center justify-center flex-shrink-0 ${CAT_CONFIG[p.category].bg}`}>
                        <Icon className={`w-5 h-5 ${CAT_CONFIG[p.category].color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        {p.badge && <span className="text-xs font-bold text-orange-400">{p.badge}</span>}
                        <p className="text-sm font-bold text-white leading-snug">{p.title}</p>
                      </div>
                    </div>
                    <p className="text-xs text-gray-400 line-clamp-2 mb-4">{p.subtitle}</p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-lg font-bold text-white">{fmt(priceOf(p).price)}</span>
                        {priceOf(p).price < p.price && <span className="text-xs text-gray-500 line-through">{fmt(p.price)}</span>}
                      </div>
                      <button onClick={e => { e.stopPropagation(); addToCart(p); }}
                        className="px-3 py-1.5 bg-orange-600/20 hover:bg-orange-600 border border-orange-500/30 hover:border-orange-500 text-orange-300 hover:text-white text-xs font-semibold rounded-lg transition">
                        Add to Cart
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Search + Filters */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-56">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search products…"
              className="w-full bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl pl-9 pr-3 py-2.5 text-white text-sm focus:outline-none focus:border-orange-500 placeholder-gray-600" />
          </div>
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => setFilterCat('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition border ${filterCat === 'all' ? 'bg-orange-600 text-white border-orange-500' : 'bg-[#1A1A1A] border-[#2A2A2A] text-gray-400 hover:text-white'}`}>
              All
            </button>
            {Object.entries(CAT_CONFIG).map(([k, v]) => {
              const Icon = v.icon;
              return (
                <button key={k} onClick={() => setFilterCat(k as ProductCategory)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition border ${filterCat === k ? `bg-[#1A1A1A] border-orange-500 ${v.color}` : 'bg-[#1A1A1A] border-[#2A2A2A] text-gray-400 hover:text-white'}`}>
                  <Icon className="w-3.5 h-3.5" /> {v.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Product Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {visible.map(p => {
            const Icon = CAT_CONFIG[p.category].icon;
            const isPurchased = purchased.has(p.id);
            return (
              <div key={p.id}
                className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl overflow-hidden hover:border-[#3A3A3A] transition group cursor-pointer"
                onClick={() => openProductPage(p)}>
                {/* Top accent */}
                <div className={`h-1 ${p.popular ? 'bg-orange-500' : 'bg-[#2A2A2A]'}`} />
                {/* AI-generated cover art (shown when available) */}
                {(p as any).coverImage && (
                  <div className="aspect-[16/9] w-full overflow-hidden bg-[#0A0A0A]">
                    <img src={(p as any).coverImage} alt={p.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  </div>
                )}
                <div className="p-5">
                  <div className="flex items-start gap-3 mb-3">
                    <div className={`w-10 h-10 rounded-xl border flex items-center justify-center flex-shrink-0 ${CAT_CONFIG[p.category].bg}`}>
                      <Icon className={`w-5 h-5 ${CAT_CONFIG[p.category].color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                        {p.badge && <span className="text-xs font-bold text-orange-400">{p.badge}</span>}
                        {isPurchased && <span className="text-xs text-green-400 flex items-center gap-0.5"><CheckCircle className="w-3 h-3" /> Owned</span>}
                      </div>
                      <p className="text-sm font-bold text-white leading-snug">{p.title}</p>
                    </div>
                  </div>
                  <p className="text-xs text-gray-400 line-clamp-2 mb-4">{p.subtitle}</p>

                  {/* Meta row */}
                  <div className="flex items-center gap-2 mb-4">
                    <Stars r={p.rating} />
                    <span className="text-xs text-gray-500">({p.reviews})</span>
                    {p.pages && <span className="text-xs text-gray-600 ml-auto">{p.pages}pp</span>}
                    <span className="text-xs text-gray-600">{p.fileTypes[0]}</span>
                  </div>

                  {/* Low-stock scarcity */}
                  {boosters.stockScarcity.enabled && typeof p.stock === 'number' && p.stock > 0 && p.stock <= boosters.stockScarcity.threshold && (
                    <p className="text-xs text-amber-400 font-medium mb-3 flex items-center gap-1">
                      <Zap className="w-3 h-3" /> {boosters.stockScarcity.message.replace('{count}', String(p.stock))}
                    </p>
                  )}

                  {/* Price + CTA */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-lg font-bold text-white">{fmt(priceOf(p).price)}</span>
                      {priceOf(p).price < p.price ? (
                        <span className="text-xs text-gray-500 line-through">{fmt(p.price)}</span>
                      ) : p.originalPrice ? (
                        <span className="text-xs text-gray-500 line-through">{fmt(p.originalPrice)}</span>
                      ) : null}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button onClick={e => { e.stopPropagation(); setSelected(p); }}
                        className="px-2.5 py-1.5 border border-[#2A2A2A] text-gray-400 hover:text-white hover:border-[#3A3A3A] text-xs font-semibold rounded-lg transition">
                        Quick view
                      </button>
                      {isPurchased ? (
                        <button onClick={e => { e.stopPropagation(); openProductPage(p); }}
                          className="px-3 py-1.5 bg-green-500/10 border border-green-500/20 text-green-400 text-xs font-semibold rounded-lg flex items-center gap-1 hover:bg-green-500/20 transition">
                          <Download className="w-3 h-3" /> Download
                        </button>
                      ) : (
                        <button onClick={e => { e.stopPropagation(); addToCart(p); }}
                          className="px-3 py-1.5 bg-orange-600/20 hover:bg-orange-600 border border-orange-500/30 hover:border-orange-500 text-orange-300 hover:text-white text-xs font-semibold rounded-lg transition">
                          Add to Cart
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {visible.length === 0 && (
          <div className="text-center py-20 text-gray-500">
            <Package className="w-10 h-10 mx-auto mb-3 opacity-30" />
            {products.length === 0 ? (
              // An empty catalog and an over-filtered one are different problems;
              // telling the owner to "try a different search" hides the real one.
              <>
                <p className="font-bold text-gray-400">No digital products published yet.</p>
                <p className="text-sm mt-1">
                  Add one in{' '}
                  <a href="/digital-products-admin" className="text-violet-400 underline hover:text-violet-300">
                    Digital Products admin
                  </a>{' '}
                  and it will appear here and on the main store.
                </p>
              </>
            ) : (
              <p>No products found. Try a different search or category.</p>
            )}
          </div>
        )}

        {/* Trust Footer */}
        <div className="border-t border-[#1A1A1A] pt-10 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {[['Instant Download', Download, 'Access your files immediately after purchase'],['30-Day Guarantee', Shield, "Full refund if you're not satisfied"],['NH-Specific Content', Home, 'Written for New Hampshire laws and climate'],['Secure Checkout', CreditCard, 'Stripe-protected, encrypted payments']].map(([label, Icon, desc]: any) => (
            <div key={label}>
              <div className="w-10 h-10 rounded-xl bg-[#1A1A1A] border border-[#2A2A2A] flex items-center justify-center mx-auto mb-3">
                <Icon className="w-5 h-5 text-orange-400" />
              </div>
              <p className="text-sm font-semibold text-white mb-1">{label}</p>
              <p className="text-xs text-gray-500">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
