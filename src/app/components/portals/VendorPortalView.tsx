import PortalFeatureGuide from './PortalFeatureGuide';
import { MessagesTab, MessagesBell, MessagesTabBadge, usePortalMessages } from './PortalMessagesSystem';
import SponsoredMarquee from '../SponsoredMarquee';
import PortalTrialBanner from './PortalTrialBanner';
import { useState, useEffect } from 'react';
import {
  Package, DollarSign, TrendingUp, ShoppingCart, FileText, Clock,
  CheckCircle, AlertTriangle, BarChart3, Users, Calendar, Star,
  ArrowUpRight, ArrowDownRight, Download, Upload, Search, Filter,
  Home, MessageSquare, Settings, Bell, ChevronRight, Tag, Box,
  Truck, Receipt, Award, Wrench, Zap, Code, Key, Link as LinkIcon,
  Globe, Info, Copy, RefreshCw, CheckCircle2, AlertCircle, Palette,
  Lock, Crown, ExternalLink, Eye, EyeOff, Save,
  Percent, BadgePercent, Video, Play, ToggleLeft, ToggleRight, PlusCircle, Pencil, Sparkles
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import LayoutManager from '../layout-editor/LayoutManager';
import { PrimaryButton } from '../ui/button/PrimaryButton';
import { ChartContainer } from '../ChartContainer';
import LogoMarquee from '../LogoMarquee';
import AdvertisingMarquee from '../AdvertisingMarquee';
import ReferralRewards from '../ReferralRewards';
import PortalUpgradeModal from './PortalUpgradeModal';
import { useUserData } from '../../lib/hooks/useUserData';
import SubmitReelForApproval from '../SubmitReelForApproval';
import DealsOffersSection from './DealsOffersSection';
import FeaturedDealsReels from './FeaturedDealsReels';
import MaintenancePlanTracker from './MaintenancePlanTracker';
import PlanBuilderTab from './PlanBuilderTab';
import InvestmentTab from './InvestmentTab';
import { PortalDocumentVault } from './PortalDocumentVault';
import { VendorInvoicesTab, VendorPaymentsTab, VendorPerformanceTab } from './VendorBilling';
import { useAuth } from '../../contexts/AuthContext';
import { projectId } from '../../utils/supabase/info';
import PortalSettings from './PortalSettings';

const VENDOR_API = `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6`;

interface Order {
  id: string;
  project: string;
  items: number;
  total: number;
  status: string;
  date: string;
  deliveryDate?: string;
}

interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  status: string;
}

export default function VendorPortalView() {
  const { session } = useAuth();

  // Messages system
  const { unread: unreadMessages, clearUnread } = usePortalMessages('', '');
  const [activeTab, setActiveTab] = useState<'dashboard' | 'orders' | 'products' | 'promotions' | 'invoices' | 'payments' | 'plan-tracker' | 'plan-builder' | 'performance' | 'referrals' | 'api-settings' | 'investments' | 'messages' | 'documents' | 'guide'>('dashboard');
  const [showPortalSettings, setShowPortalSettings] = useState(false);
  const [settingsSection, setSettingsSection] = useState<'account' | 'notifications'>('account');
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [lockedFeature, setLockedFeature] = useState<string>('');

  // ---------------------------------------------------------------------------
  // Who is this vendor, and what has actually been ordered from them?
  //
  // Two things were wrong here. The portal had no way to know which vendor was
  // signed in — every vendor route takes an id in the path and nothing told it
  // its own — so orders were kept in localStorage, meaning a vendor's order
  // history lived in one browser and did not exist on any other device.
  //
  // And the orders in question are NOT store orders. A vendor's orders are the
  // purchase orders the construction company raises against them — stock lists
  // coming off a customer's material selection. The ecommerce order routes look
  // superficially right and are the wrong system entirely.
  // ---------------------------------------------------------------------------
  const authHeadersV = () => ({ Authorization: `Bearer ${session?.access_token || ''}`, 'Content-Type': 'application/json' });
  const [vendorId, setVendorId] = useState<string | null>(null);
  const [vendorLinked, setVendorLinked] = useState<boolean | null>(null);
  const [linkReason, setLinkReason] = useState('');
  const [purchaseOrders, setPurchaseOrders] = useState<any[]>([]);
  const [vendorLoading, setVendorLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!session?.access_token) { setVendorLoading(false); setVendorLinked(false); return; }
      const headers = { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' };
      try {
        const meRes = await fetch(`${VENDOR_API}/vendor/me`, { headers });
        const me = await meRes.json().catch(() => ({}));
        if (cancelled) return;
        setVendorLinked(Boolean(me?.linked));
        setLinkReason(String(me?.reason || ''));
        setVendorId(me?.vendorId || null);

        // The server scopes this to the caller, so no id is passed — asking for
        // "all purchase orders" as a vendor returns only that vendor's.
        const poRes = await fetch(`${VENDOR_API}/purchase-orders`, { headers });
        const po = await poRes.json().catch(() => ({}));
        if (!cancelled) setPurchaseOrders(Array.isArray(po?.orders) ? po.orders : []);
      } catch {
        if (!cancelled) { setVendorLinked(false); setLinkReason('Could not reach the server.'); }
      } finally {
        if (!cancelled) setVendorLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [session?.access_token]);

  // ---------------------------------------------------------------------------
  // The vendor's catalogue — what they supply and at what price.
  //
  // This is the piece the materials hub is built around: a customer picks from
  // real vendor lines, so the quote is accurate, and the stock list that goes
  // back to the vendor is something they can actually fulfil.
  //
  // Until now there was no catalogue anywhere, which is why vendor pricing was
  // being invented with a hash. Every line published here is a line that stops
  // being invented.
  // ---------------------------------------------------------------------------
  const [catalog, setCatalog] = useState<any[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [savingItem, setSavingItem] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const emptyItem = { id: '', name: '', sku: '', category: '', unit: 'each', price: '', availability: 'In stock' };
  const [itemForm, setItemForm] = useState<any>(emptyItem);

  const loadCatalog = async (id: string) => {
    if (!id || !session?.access_token) return;
    setCatalogLoading(true);
    try {
      const res = await fetch(`${VENDOR_API}/vendor-catalog/${encodeURIComponent(id)}`, { headers: authHeadersV() });
      const j = await res.json().catch(() => ({}));
      setCatalog(Array.isArray(j?.items) ? j.items : []);
    } catch { setCatalog([]); }
    finally { setCatalogLoading(false); }
  };
  useEffect(() => { if (vendorId) void loadCatalog(vendorId); }, [vendorId, session?.access_token]);

  const saveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vendorId || savingItem) return;
    const price = Number(itemForm.price);
    if (!itemForm.name.trim()) { toast.error('Give the line a name.'); return; }
    if (!Number.isFinite(price) || price < 0) { toast.error('Give the line a price.'); return; }
    setSavingItem(true);
    try {
      const res = await fetch(`${VENDOR_API}/vendor-catalog/${encodeURIComponent(vendorId)}/items`, {
        method: 'POST', headers: authHeadersV(),
        body: JSON.stringify({ ...itemForm, id: itemForm.id || undefined, price }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || !j?.success) throw new Error(j?.error || 'Could not save the line.');
      toast.success(itemForm.id ? 'Line updated.' : 'Line added to your catalogue.');
      setItemForm(emptyItem); setEditingItem(null);
      await loadCatalog(vendorId);
    } catch (err: any) { toast.error(err?.message || 'Could not save the line.'); }
    finally { setSavingItem(false); }
  };

  const deleteItem = async (itemId: string) => {
    if (!vendorId) return;
    try {
      const res = await fetch(`${VENDOR_API}/vendor-catalog/${encodeURIComponent(vendorId)}/items/${encodeURIComponent(itemId)}`, {
        method: 'DELETE', headers: authHeadersV(),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || !j?.success) throw new Error(j?.error || 'Could not remove the line.');
      toast.success('Line removed.');
      await loadCatalog(vendorId);
    } catch (err: any) { toast.error(err?.message || 'Could not remove the line.'); }
  };

  /** A purchase order as this screen's existing Order shape. */
  const recentOrders: Order[] = purchaseOrders.map((o: any) => ({
    id: String(o.poNumber || o.id || ''),
    // There is no job name on a purchase order, so the PO number is what a
    // vendor would actually quote back at us.
    project: String(o.poNumber || o.id || '—'),
    items: Array.isArray(o.lineItems) ? o.lineItems.length : Number(o.items || 0),
    total: Number(o.total || 0),
    status: String(o.status || 'draft'),
    date: String(o.orderDate || o.createdAt || '').slice(0, 10),
    deliveryDate: o.expectedDate || o.expectedDelivery || undefined,
  }));
  const [apiSettings, setApiSettings] = useUserData('vendor_api_settings', {
    hasApiIntegration: false,
    apiEndpoint: '',
    apiKey: '',
    apiDocumentationUrl: '',
    webhookUrl: '',
    apiNotes: ''
  });
  const [showApiKey, setShowApiKey] = useState(false);
  const [apiTestStatus, setApiTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');

  // Promotions & Reels state
  const [vendorDeals, setVendorDeals] = useUserData<any[]>('vendor_deals', []);
  const [vendorReels, setVendorReels] = useUserData<any[]>('vendor_reels', []);
  const [showDealModal, setShowDealModal] = useState(false);
  const [showReelModal, setShowReelModal] = useState(false);
  const [editingDeal, setEditingDeal] = useState<any>(null);
  const [dealForm, setDealForm] = useState({ title: '', description: '', discountType: 'percent', discountValue: '', originalPrice: '', promoCode: '', expiresAt: '', imageUrl: '', active: true });
  const [reelForm, setReelForm] = useState({ url: '', title: '', description: '', featured: false });
  const [reelPreviewPlatform, setReelPreviewPlatform] = useState('');

  // Subscription tier - determines feature access
  // Tiers: 'basic', 'professional', 'premium', 'elite'
  const [subscriptionTier, setSubscriptionTier] = useUserData<string>('vendor_subscription_tier', 'basic');

  // Check if premium features are accessible based on subscription
  const hasContentCenterAccess = ['premium', 'elite'].includes(subscriptionTier);
  const hasAPIAccess = ['professional', 'premium', 'elite'].includes(subscriptionTier);
  const hasAdvancedReporting = ['professional', 'premium', 'elite'].includes(subscriptionTier);
  const hasCustomBranding = ['premium', 'elite'].includes(subscriptionTier);
  const hasMarketingTools = ['premium', 'elite'].includes(subscriptionTier);

  // Handle Content Center access
  const handleContentCenterClick = () => {
    if (hasContentCenterAccess) {
      window.location.href = '/enterprise-content-center';
    } else {
      setLockedFeature('Content Center');
      setShowUpgradeModal(true);
    }
  };

  // Handle API Settings access
  const handleAPISettingsClick = () => {
    if (hasAPIAccess) {
      setActiveTab('api-settings');
    } else {
      setLockedFeature('API Integration');
      setShowUpgradeModal(true);
    }
  };

  // Handle Advanced Reporting access
  const handleAdvancedReportingClick = () => {
    if (hasAdvancedReporting) {
      window.location.href = '/enterprise-reporting';
    } else {
      setLockedFeature('Advanced Reporting');
      setShowUpgradeModal(true);
    }
  };

  // Mock vendor data — pulled from RoleSwitcher demo profile if present
  const _demoProfile = (() => { try { const r = localStorage.getItem('demo_role_profile'); return r ? JSON.parse(r) : null; } catch { return null; } })();
  const vendorInfo = {
    name: _demoProfile?.company || 'Premier Building Supplies Co.',
    email: _demoProfile?.email || 'sandra@premierbuild.com',
    phone: _demoProfile?.phone || '(972) 555-0142',
    accountManager: _demoProfile?.name || 'Sandra Lee',
    memberSince: 'March 2022',
    totalOrders: 342,
    activeOrders: 15,
    rating: 4.8
  };

  // Revenue data
  // Revenue by month, from the purchase orders actually raised against this
  // vendor. The seven-month curve that used to sit here — 45k rising to 68k —
  // was drawn, not measured. No orders means no chart, which is the truth.
  const revenueData = (() => {
    const byMonth = new Map<string, { month: string; revenue: number; orders: number; sort: string }>();
    for (const o of purchaseOrders) {
      const raw = String(o.orderDate || o.createdAt || '');
      if (!raw) continue;
      const d = new Date(raw);
      if (Number.isNaN(d.getTime())) continue;
      const sort = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString(undefined, { month: 'short' });
      const row = byMonth.get(sort) || { month: label, revenue: 0, orders: 0, sort };
      row.revenue += Number(o.total || 0);
      row.orders += 1;
      byMonth.set(sort, row);
    }
    return [...byMonth.values()].sort((a, b) => a.sort.localeCompare(b.sort)).slice(-12);
  })();

  const totalOrderValue = purchaseOrders.reduce((sum: number, o: any) => sum + Number(o.total || 0), 0);
  const openOrders = purchaseOrders.filter((o: any) => !['delivered', 'cancelled', 'complete', 'completed'].includes(String(o.status || '').toLowerCase()));
  const awaitingApproval = purchaseOrders.filter((o: any) => ['draft', 'pending', 'pending_approval'].includes(String(o.status || '').toLowerCase()));
  const money = (n: number) => `$${Math.round(Number(n) || 0).toLocaleString()}`;
  /** A unit price, to the cent. Rounding a price list to whole dollars misstates it. */
  const unitPrice = (n: number) =>
    `$${(Number(n) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  // Every figure here is counted from real purchase orders. The previous set —
  // $68,420 revenue, 8 pending invoices, a 4.8 rating — was invented, and a
  // rating in particular is a claim about a real company that nothing measures.
  const stats = [
    { label: 'Order Value', value: money(totalOrderValue), change: purchaseOrders.length ? `across ${purchaseOrders.length} order${purchaseOrders.length === 1 ? '' : 's'}` : 'No orders yet', trend: 'up', icon: DollarSign, color: 'orange' },
    { label: 'Open Orders', value: openOrders.length.toString(), change: openOrders.length ? money(openOrders.reduce((s: number, o: any) => s + Number(o.total || 0), 0)) : 'Nothing outstanding', trend: 'up', icon: ShoppingCart, color: 'blue' },
    { label: 'Awaiting Approval', value: awaitingApproval.length.toString(), change: awaitingApproval.length ? 'needs a decision' : 'All clear', trend: 'neutral', icon: FileText, color: 'yellow' },
    { label: 'Total Orders', value: purchaseOrders.length.toString(), change: purchaseOrders.length ? `latest ${recentOrders[0]?.date || ''}` : 'None received', trend: 'up', icon: Package, color: 'green' },
  ];

  // What has actually been ordered, grouped by category, from the line items on
  // this vendor's purchase orders.
  //
  // This replaces four invented rows — "Lumber & Wood, 156 products, $28,400"
  // and three more — which rendered even for a vendor with no link and no
  // orders, so an empty account was showing $84,400 of trade it had never done.
  const CATEGORY_ICONS: Record<string, any> = { lumber: Box, wood: Box, hardware: Tag, electrical: Zap, plumbing: Wrench };
  const productCategories = (() => {
    const byCategory = new Map<string, { name: string; items: number; revenue: number; icon: any }>();
    for (const o of purchaseOrders) {
      for (const li of (Array.isArray(o.lineItems) ? o.lineItems : [])) {
        const name = String(li?.category || 'Uncategorised').trim() || 'Uncategorised';
        const key = name.toLowerCase();
        const icon = Object.entries(CATEGORY_ICONS).find(([k]) => key.includes(k))?.[1] || Box;
        const row = byCategory.get(key) || { name, items: 0, revenue: 0, icon };
        row.items += 1;
        row.revenue += (Number(li?.quantity) || 0) * (Number(li?.unitPrice) || 0);
        byCategory.set(key, row);
      }
    }
    return [...byCategory.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 8);
  })();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'delivered': return 'bg-green-500/10 text-green-400 border-green-500/20';
      case 'shipped': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'processing': return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
      case 'pending': return 'bg-orange-500/10 text-orange-400 border-orange-500/20';
      default: return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
    }
  };

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: Home },
    { id: 'orders', label: 'Orders', icon: ShoppingCart },
    { id: 'products', label: 'Products', icon: Package },
    { id: 'promotions', label: 'Promotions', icon: BadgePercent },
    { id: 'invoices', label: 'Invoices', icon: FileText },
    { id: 'payments', label: 'Payments', icon: DollarSign },
    { id: 'plan-tracker', label: 'Plan Tracker', icon: BarChart3 },
    { id: 'plan-builder', label: 'Plans & Add-ons', icon: Sparkles },
    { id: 'performance', label: 'Performance', icon: BarChart3 },
    { id: 'investments', label: 'Investments', icon: DollarSign },
    { id: 'referrals', label: 'Referral Rewards', icon: Award },
    { id: 'api-settings', label: 'API Settings', icon: Code },
    { id: 'messages', label: 'Messages', icon: MessageSquare },
    { id: 'documents', label: 'Documents', icon: FileText },
    { id: 'guide', label: 'Portal Guide', icon: FileText },
  ];

  return (
    <LayoutManager pageName="Vendor Portal" enableCustomization={true} showEditButton={true}>
      <div className="w-full min-h-screen bg-[#0A0A0A]">
      <SponsoredMarquee />
      <PortalTrialBanner />
      <AdvertisingMarquee placement="portal-header" dismissible />
        {/* Header */}
        <div className="bg-[#1A1A1A] border-b border-[#2A2A2A] sticky top-16 z-30">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-600 to-orange-700 flex items-center justify-center">
                  <Package className="w-5 h-5 text-white" />
                </div>
                Vendor Portal
              </h1>
              <p className="text-gray-400 mt-1">{vendorInfo.name} · {vendorInfo.accountManager} · {vendorInfo.email}</p>
            </div>
            <div className="flex items-center gap-3">
              <button aria-label="Notifications" onClick={() => { setSettingsSection('notifications'); setShowPortalSettings(true); }} className="p-2 rounded-lg bg-[#0A0A0A] border border-[#2A2A2A] text-gray-400 hover:text-white hover:border-orange-500/30 transition">
                <Bell className="w-5 h-5" />
              </button>
              <button aria-label="Settings" onClick={() => { setSettingsSection('account'); setShowPortalSettings(true); }} className="p-2 rounded-lg bg-[#0A0A0A] border border-[#2A2A2A] text-gray-400 hover:text-white hover:border-orange-500/30 transition">
                <Settings className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 overflow-x-auto pb-2">
            {tabs.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg whitespace-nowrap transition ${
                    activeTab === tab.id
                      ? 'bg-orange-600 text-white'
                      : 'bg-[#0A0A0A] text-gray-400 hover:text-white border border-[#2A2A2A] hover:border-orange-500/30'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Logo Marquee */}
      <LogoMarquee />

      {/* Advertising Text Banner */}
      <AdvertisingMarquee placement="portal-header" dismissible />

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        {activeTab === 'documents' && <PortalDocumentVault session={session} accent="orange" />}
        {activeTab === 'guide' && <PortalFeatureGuide portal="vendor" />}

        {activeTab === 'dashboard' && (
          <>
            {/* Without this the tiles below read $0 / 0 / 0 with nothing to say
                why, which looks like a vendor nobody orders from rather than an
                account that has not been attached to its vendor record. */}
            {!vendorLoading && vendorLinked === false && (
              <div className="flex items-start gap-3 rounded-xl border border-yellow-500/20 bg-yellow-500/5 p-4">
                <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-yellow-400" />
                <div>
                  <p className="font-semibold text-white">This account is not linked to a vendor record</p>
                  <p className="mt-1 text-sm text-gray-400">
                    {linkReason || 'The figures below will stay empty until your login is attached to your vendor.'}
                  </p>
                </div>
              </div>
            )}
            {!vendorLoading && vendorLinked && vendorId && (
              <p className="text-xs text-gray-500">Signed in as vendor <span className="text-gray-300">{vendorId}</span></p>
            )}

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {stats.map((stat, i) => {
                const Icon = stat.icon;
                return (
                  <div key={i} className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-6 hover:border-orange-500/30 transition">
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-10 h-10 rounded-lg bg-orange-600/10 border border-orange-500/20 flex items-center justify-center">
                        <Icon className="w-5 h-5 text-orange-400" />
                      </div>
                      <div className={`flex items-center gap-1 text-sm ${
                        stat.trend === 'up' ? 'text-green-400' : stat.trend === 'down' ? 'text-red-400' : 'text-gray-400'
                      }`}>
                        {stat.trend === 'up' ? <ArrowUpRight className="w-4 h-4" /> : stat.trend === 'down' ? <ArrowDownRight className="w-4 h-4" /> : null}
                        {stat.change}
                      </div>
                    </div>
                    <p className="text-2xl font-bold text-white mb-1">{stat.value}</p>
                    <p className="text-sm text-gray-400">{stat.label}</p>
                  </div>
                );
              })}
            </div>

            {/* Revenue Chart */}
            <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-lg font-bold text-white">Revenue Trends</h2>
                  <p className="text-sm text-gray-400">Monthly revenue and order volume</p>
                </div>
                <PrimaryButton
                  onClick={() => toast.success('Downloading report...')}
                  className="flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Export
                </PrimaryButton>
              </div>
              <ChartContainer height={256} minHeight={256} dependencies={[activeTab]}>
                <AreaChart data={revenueData} width={800} height={256}>
                  <defs>
                    <linearGradient id="vendorRevenueGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop key="vendor-stop1" offset="5%" stopColor="#ea580c" stopOpacity={0.3}/>
                      <stop key="vendor-stop2" offset="95%" stopColor="#ea580c" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid key="vendor-grid" strokeDasharray="3 3" stroke="#2A2A2A" />
                  <XAxis key="vendor-xaxis" dataKey="month" stroke="#6B7280" />
                  <YAxis key="vendor-yaxis" stroke="#6B7280" />
                  <Tooltip
                    key="vendor-tooltip"
                    contentStyle={{ backgroundColor: '#1A1A1A', border: '1px solid #2A2A2A', borderRadius: '8px' }}
                    labelStyle={{ color: '#fff' }}
                  />
                  <Area key="vendor-area" type="monotone" dataKey="revenue" stroke="#ea580c" fillOpacity={1} fill="url(#vendorRevenueGradient)" strokeWidth={2} isAnimationActive={false} />
                </AreaChart>
              </ChartContainer>
            </div>

            {/* Recent Orders */}
            <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-white">Recent Orders</h2>
                <button
                  onClick={() => setActiveTab('orders')}
                  className="text-orange-400 hover:text-orange-300 text-sm font-semibold flex items-center gap-1"
                >
                  View All
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-3">
                {recentOrders.map(order => (
                  <div key={order.id} className="bg-[#0A0A0A] rounded-lg border border-[#2A2A2A] p-4 hover:border-orange-500/30 transition">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="font-semibold text-white mb-1">{order.id}</p>
                        <p className="text-sm text-gray-400">{order.project}</p>
                      </div>
                      <span className={`px-3 py-1 rounded-lg text-xs font-semibold border ${getStatusColor(order.status)}`}>
                        {order.status.toUpperCase()}
                      </span>
                    </div>
                    <div className="grid grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-gray-500">Items</p>
                        <p className="text-white font-semibold">{order.items}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Total</p>
                        <p className="text-white font-semibold">${order.total.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Order Date</p>
                        <p className="text-white font-semibold">{order.date}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Delivery</p>
                        <p className="text-white font-semibold">{order.deliveryDate}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Product Categories — hidden entirely when there is nothing to
                show, rather than rendering an empty row of tiles. */}
            {productCategories.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {productCategories.map((category, i) => {
                const Icon = category.icon;
                return (
                  <div key={i} className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-6 hover:border-orange-500/30 transition">
                    <div className="w-10 h-10 rounded-lg bg-orange-600/10 border border-orange-500/20 flex items-center justify-center mb-4">
                      <Icon className="w-5 h-5 text-orange-400" />
                    </div>
                    <h3 className="font-semibold text-white mb-2">{category.name}</h3>
                    <p className="text-sm text-gray-400 mb-1">{category.items} products</p>
                    <p className="text-lg font-bold text-orange-400">${category.revenue.toLocaleString()}</p>
                  </div>
                );
              })}
            </div>
            )}

            {/* Active Promotions & Reels Preview */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Active Deals */}
              <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <BadgePercent className="w-4 h-4 text-orange-400" />
                    Active Deals
                  </h3>
                  <button
                    onClick={() => setActiveTab('promotions')}
                    className="text-orange-400 hover:text-orange-300 text-sm font-semibold flex items-center gap-1"
                  >
                    Manage <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
                {vendorDeals.filter((d: any) => d.active).length === 0 ? (
                  <p className="text-sm text-gray-500 italic">No active deals — create one in the Promotions tab.</p>
                ) : (
                  <div className="space-y-2">
                    {vendorDeals.filter((d: any) => d.active).slice(0, 3).map((deal: any) => (
                      <div key={deal.id} className="bg-[#0A0A0A] rounded-lg border border-orange-500/20 p-3 flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold text-white">{deal.title}</p>
                          {deal.promoCode && <p className="text-xs text-gray-400 mt-0.5">Code: <span className="text-orange-400 font-mono">{deal.promoCode}</span></p>}
                          {deal.expiresAt && <p className="text-xs text-gray-500 mt-0.5">Expires {deal.expiresAt}</p>}
                        </div>
                        <span className="ml-3 px-2 py-1 rounded-lg bg-orange-600/20 border border-orange-500/30 text-orange-300 text-xs font-bold whitespace-nowrap">
                          {deal.discountValue}{deal.discountType === 'percent' ? '%' : '$'} OFF
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Active Reels */}
              <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Video className="w-4 h-4 text-orange-400" />
                    Video Reels
                  </h3>
                  <button
                    onClick={() => setActiveTab('promotions')}
                    className="text-orange-400 hover:text-orange-300 text-sm font-semibold flex items-center gap-1"
                  >
                    Manage <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
                {vendorReels.length === 0 ? (
                  <p className="text-sm text-gray-500 italic">No reels yet — add one in the Promotions tab.</p>
                ) : (
                  <div className="space-y-2">
                    {vendorReels.slice(0, 3).map((reel: any) => {
                      const ytMatch = reel.url?.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
                      return (
                        <div key={reel.id} className="bg-[#0A0A0A] rounded-lg border border-[#2A2A2A] p-3 flex items-center gap-3">
                          {ytMatch ? (
                            <img src={`https://img.youtube.com/vi/${ytMatch[1]}/mqdefault.jpg`} alt={reel.title} className="w-16 h-10 object-cover rounded" />
                          ) : (
                            <div className="w-16 h-10 rounded bg-[#2A2A2A] flex items-center justify-center flex-shrink-0">
                              <Play className="w-4 h-4 text-gray-400" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-white truncate">{reel.title || 'Untitled'}</p>
                            {reel.featured && (
                              <span className="text-xs px-1.5 py-0.5 rounded bg-orange-600/20 border border-orange-500/30 text-orange-300 font-semibold">Featured</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Content Center Access - Premium Feature */}
            <div className="bg-gradient-to-br from-[#1A1A1A] to-[#0F0F0F] rounded-xl border border-[#2A2A2A] p-6 relative overflow-hidden">
              {/* Background decoration */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-purple-600/10 to-transparent rounded-full blur-3xl" />

              <div className="relative">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <div className={`w-14 h-14 rounded-xl ${
                      hasContentCenterAccess
                        ? 'bg-gradient-to-br from-purple-600 to-purple-700'
                        : 'bg-[#2A2A2A]'
                    } flex items-center justify-center`}>
                      {hasContentCenterAccess ? (
                        <Palette className="w-7 h-7 text-white" />
                      ) : (
                        <Lock className="w-7 h-7 text-gray-400" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h2 className="text-xl font-bold text-white">Enterprise Content Center</h2>
                        {!hasContentCenterAccess && (
                          <span className="px-2 py-1 rounded-lg bg-purple-600/20 border border-purple-500/30 text-purple-300 text-xs font-semibold flex items-center gap-1">
                            <Crown className="w-3 h-3" />
                            PREMIUM
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-400">
                        {hasContentCenterAccess
                          ? 'Create and manage marketing content, social media posts, and promotional materials'
                          : 'Upgrade to Premium or Elite to access professional content creation tools'
                        }
                      </p>
                    </div>
                  </div>
                </div>

                {hasContentCenterAccess ? (
                  <button
                    onClick={handleContentCenterClick}
                    className="w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 text-white font-semibold py-3 px-6 rounded-lg transition flex items-center justify-center gap-2 group"
                  >
                    <Palette className="w-5 h-5" />
                    Open Content Center
                    <ExternalLink className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                  </button>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <button
                      onClick={() => toast.info('View subscription plans to upgrade')}
                      className="bg-purple-600/10 hover:bg-purple-600/20 border border-purple-500/30 text-purple-300 font-semibold py-3 px-6 rounded-lg transition flex items-center justify-center gap-2"
                    >
                      <Crown className="w-5 h-5" />
                      Upgrade to Premium
                    </button>
                    <button
                      onClick={handleContentCenterClick}
                      className="bg-[#2A2A2A] hover:bg-[#3A3A3A] border border-[#4A4A4A] text-gray-300 font-semibold py-3 px-6 rounded-lg transition flex items-center justify-center gap-2"
                    >
                      <Lock className="w-5 h-5" />
                      Preview (Locked)
                    </button>
                  </div>
                )}

                {!hasContentCenterAccess && (
                  <div className="mt-4 p-4 bg-[#0A0A0A] rounded-lg border border-purple-500/20">
                    <p className="text-sm text-gray-400 mb-2">
                      <span className="font-semibold text-purple-300">Premium features include:</span>
                    </p>
                    <ul className="text-sm text-gray-400 space-y-1">
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-purple-400" />
                        Professional content creation tools
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-purple-400" />
                        Social media scheduling & management
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-purple-400" />
                        Marketing asset library
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-purple-400" />
                        Brand templates & presets
                      </li>
                    </ul>
                  </div>
                )}

                {/* Current subscription tier indicator */}
                <div className="mt-4 flex items-center justify-between text-sm">
                  <span className="text-gray-500">Current Plan:</span>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-white capitalize">{subscriptionTier}</span>
                    <button
                      onClick={() => {
                        // Cycle through tiers for demo
                        const tiers = ['basic', 'professional', 'premium', 'elite'];
                        const currentIndex = tiers.indexOf(subscriptionTier);
                        const nextTier = tiers[(currentIndex + 1) % tiers.length];
                        setSubscriptionTier(nextTier);
                        toast.success(`Subscription changed to ${nextTier.toUpperCase()}`);
                      }}
                      className="text-xs text-orange-400 hover:text-orange-300 underline"
                    >
                      Change (Demo)
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {activeTab === 'orders' && (
          <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-6">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-white">Purchase Orders</h2>
                <p className="mt-1 text-sm text-gray-400">
                  Stock lists raised against you by Black Phoenix, newest first.
                </p>
              </div>
              {purchaseOrders.length > 0 && (
                <span className="rounded-lg border border-[#2A2A2A] bg-[#0A0A0A] px-3 py-1.5 text-sm text-gray-300">
                  {purchaseOrders.length} order{purchaseOrders.length === 1 ? '' : 's'} · {money(totalOrderValue)}
                </span>
              )}
            </div>

            {vendorLoading ? (
              <div className="flex items-center justify-center gap-2 py-12 text-sm text-gray-400">
                <Clock className="h-4 w-4 animate-spin" /> Loading your orders…
              </div>
            ) : vendorLinked === false ? (
              // Not an error. The account simply is not attached to a vendor
              // record yet, and saying so beats showing an empty table that
              // reads as "nobody has ordered from you".
              <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/5 p-8 text-center">
                <AlertCircle className="mx-auto mb-3 h-7 w-7 text-yellow-400" />
                <p className="font-semibold text-white">This account is not linked to a vendor yet</p>
                <p className="mx-auto mt-2 max-w-md text-sm text-gray-400">
                  {linkReason || 'Once your login is attached to your vendor record, the purchase orders raised against you appear here.'}
                </p>
              </div>
            ) : recentOrders.length === 0 ? (
              <div className="rounded-lg border border-[#2A2A2A] bg-[#0A0A0A] p-10 text-center">
                <ShoppingCart className="mx-auto mb-3 h-8 w-8 text-gray-600" />
                <p className="font-semibold text-white">No purchase orders yet</p>
                <p className="mx-auto mt-2 max-w-md text-sm text-gray-400">
                  When a job's material list is sent to you for pickup or delivery, the order shows up here.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-sm">
                  <thead>
                    <tr className="border-b border-[#2A2A2A] text-left text-xs uppercase tracking-wide text-gray-500">
                      <th className="pb-3 pr-4 font-semibold">PO</th>
                      <th className="pb-3 pr-4 font-semibold">Ordered</th>
                      <th className="pb-3 pr-4 font-semibold">Needed by</th>
                      <th className="pb-3 pr-4 text-right font-semibold">Lines</th>
                      <th className="pb-3 pr-4 text-right font-semibold tabular-nums">Total</th>
                      <th className="pb-3 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#2A2A2A]">
                    {recentOrders.map(order => (
                      <tr key={order.id} className="text-gray-300">
                        <td className="py-3 pr-4 font-semibold text-white">{order.project}</td>
                        <td className="py-3 pr-4">{order.date || '—'}</td>
                        <td className="py-3 pr-4">{order.deliveryDate || '—'}</td>
                        <td className="py-3 pr-4 text-right tabular-nums">{order.items}</td>
                        <td className="py-3 pr-4 text-right font-semibold tabular-nums text-white">{money(order.total)}</td>
                        <td className="py-3">
                          <span className={`rounded border px-2 py-0.5 text-xs font-semibold ${getStatusColor(order.status)}`}>
                            {order.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'products' && (
          <div className="space-y-4">
            <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-6">
              <h2 className="text-lg font-bold text-white">Your catalogue</h2>
              <p className="mt-1 text-sm text-gray-400">
                What you supply and what it costs. These are the lines Black Phoenix quotes from — publishing
                a price here is what makes a customer's quote accurate and a stock list something you can fulfil.
              </p>

              {vendorLinked === false ? (
                <div className="mt-5 rounded-lg border border-yellow-500/20 bg-yellow-500/5 p-8 text-center">
                  <AlertCircle className="mx-auto mb-3 h-7 w-7 text-yellow-400" />
                  <p className="font-semibold text-white">This account is not linked to a vendor yet</p>
                  <p className="mx-auto mt-2 max-w-md text-sm text-gray-400">{linkReason || 'Once linked, your catalogue lives here.'}</p>
                </div>
              ) : (
                <>
                  {/* Add or edit a line */}
                  <form onSubmit={saveItem} className="mt-5 grid grid-cols-1 gap-2 md:grid-cols-12">
                    <input
                      value={itemForm.name}
                      onChange={(e) => setItemForm((f: any) => ({ ...f, name: e.target.value }))}
                      placeholder="Material or product name"
                      className="md:col-span-4 rounded-lg border border-[#2A2A2A] bg-[#0A0A0A] px-3 py-2 text-sm text-white"
                    />
                    <input
                      value={itemForm.sku}
                      onChange={(e) => setItemForm((f: any) => ({ ...f, sku: e.target.value }))}
                      placeholder="Your SKU"
                      title="Your own SKU. Never generated — a made-up SKU on a purchase order causes real trouble."
                      className="md:col-span-2 rounded-lg border border-[#2A2A2A] bg-[#0A0A0A] px-3 py-2 text-sm text-white"
                    />
                    <input
                      value={itemForm.category}
                      onChange={(e) => setItemForm((f: any) => ({ ...f, category: e.target.value }))}
                      placeholder="Category"
                      className="md:col-span-2 rounded-lg border border-[#2A2A2A] bg-[#0A0A0A] px-3 py-2 text-sm text-white"
                    />
                    <input
                      value={itemForm.unit}
                      onChange={(e) => setItemForm((f: any) => ({ ...f, unit: e.target.value }))}
                      placeholder="Unit"
                      className="md:col-span-1 rounded-lg border border-[#2A2A2A] bg-[#0A0A0A] px-3 py-2 text-sm text-white"
                    />
                    <input
                      type="number" step="0.01" min="0" inputMode="decimal"
                      value={itemForm.price}
                      onChange={(e) => setItemForm((f: any) => ({ ...f, price: e.target.value }))}
                      placeholder="Price"
                      className="md:col-span-1 rounded-lg border border-[#2A2A2A] bg-[#0A0A0A] px-3 py-2 text-right text-sm text-white tabular-nums"
                    />
                    <div className="md:col-span-2 flex gap-2">
                      <PrimaryButton type="submit" disabled={savingItem} className="flex-1">
                        {savingItem ? 'Saving…' : editingItem ? 'Update' : 'Add line'}
                      </PrimaryButton>
                      {editingItem && (
                        <button type="button" onClick={() => { setEditingItem(null); setItemForm(emptyItem); }}
                          className="rounded-lg border border-[#2A2A2A] px-3 text-sm text-gray-400 hover:text-white">
                          Cancel
                        </button>
                      )}
                    </div>
                  </form>

                  {catalogLoading ? (
                    <div className="flex items-center justify-center gap-2 py-10 text-sm text-gray-400">
                      <Clock className="h-4 w-4 animate-spin" /> Loading your catalogue…
                    </div>
                  ) : catalog.length === 0 ? (
                    <div className="mt-5 rounded-lg border border-[#2A2A2A] bg-[#0A0A0A] p-10 text-center">
                      <Package className="mx-auto mb-3 h-8 w-8 text-gray-600" />
                      <p className="font-semibold text-white">Nothing published yet</p>
                      <p className="mx-auto mt-2 max-w-md text-sm text-gray-400">
                        Until a line is published here, Black Phoenix has no price from you to quote — which is
                        exactly the gap that used to be filled with an estimate.
                      </p>
                    </div>
                  ) : (
                    <div className="mt-5 overflow-x-auto">
                      <table className="w-full min-w-[640px] text-sm">
                        <thead>
                          <tr className="border-b border-[#2A2A2A] text-left text-xs uppercase tracking-wide text-gray-500">
                            <th className="pb-3 pr-4 font-semibold">Item</th>
                            <th className="pb-3 pr-4 font-semibold">SKU</th>
                            <th className="pb-3 pr-4 font-semibold">Category</th>
                            <th className="pb-3 pr-4 text-right font-semibold">Price</th>
                            <th className="pb-3 pr-4 font-semibold">Availability</th>
                            <th className="pb-3 font-semibold" />
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#2A2A2A]">
                          {catalog.map((item: any) => (
                            <tr key={item.id} className="text-gray-300">
                              <td className="py-3 pr-4 font-semibold text-white">{item.name}</td>
                              <td className="py-3 pr-4 font-mono text-xs">{item.sku || <span className="text-gray-600">—</span>}</td>
                              <td className="py-3 pr-4">{item.category || '—'}</td>
                              {/* Cents, not whole dollars. money() rounds, which is
                                  right for an order total and wrong on a price
                                  list — it rendered $8.74 as $9. */}
                              <td className="py-3 pr-4 text-right font-semibold tabular-nums text-white">
                                {unitPrice(item.price)}<span className="text-xs text-gray-500">/{item.unit || 'each'}</span>
                              </td>
                              <td className="py-3 pr-4">{item.availability || '—'}</td>
                              <td className="py-3 text-right">
                                <button type="button"
                                  onClick={() => { setEditingItem(item); setItemForm({ ...item, price: String(item.price ?? '') }); }}
                                  className="mr-3 text-xs font-bold text-orange-400 hover:text-orange-300">Edit</button>
                                <button type="button" onClick={() => deleteItem(item.id)}
                                  className="text-xs font-bold text-gray-500 hover:text-red-400">Remove</button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}

                {activeTab === 'promotions' && (
          <div className="p-6">
            <FeaturedDealsReels portalType="vendor" />
          <DealsOffersSection portalType="vendor" storageKey="vendor_deals_offers" />
          </div>
        )}

        {activeTab === 'invoices' && (
          <VendorInvoicesTab
            session={session}
            vendorId={vendorId}
            vendorLinked={vendorLinked}
            linkReason={linkReason}
            mode="vendor"
          />
        )}

        {activeTab === 'payments' && (
          <VendorPaymentsTab
            session={session}
            vendorId={vendorId}
            vendorLinked={vendorLinked}
            linkReason={linkReason}
          />
        )}

        {activeTab === 'plan-tracker' && <MaintenancePlanTracker portalRole="vendor" ownerName={vendorInfo.accountManager} />}
        {activeTab === 'plan-builder' && <PlanBuilderTab portalType="vendor" ownerName={vendorInfo.name} currentTier={subscriptionTier} />}
        {activeTab === 'investments' && <InvestmentTab portalType="vendor" ownerName={vendorInfo.name} />}
        {activeTab === 'performance' && (
          <div className="space-y-6">
            <SubmitReelForApproval submitterName={vendorInfo?.name || 'Vendor'} submitterType="vendor" />
            <VendorPerformanceTab
              session={session}
              vendorId={vendorId}
              vendorLinked={vendorLinked}
              linkReason={linkReason}
              purchaseOrders={purchaseOrders}
              catalog={catalog}
            />
          </div>
        )}

        {activeTab === 'referrals' && (
          <ReferralRewards />
        )}


        {activeTab === 'messages' && (
          <div className="p-6">
            <MessagesTab userId="" userEmail="" userName="Portal User" onTabOpen={clearUnread} />
          </div>
        )}

                {activeTab === 'api-settings' && (
          <div className="space-y-6">
            {/* Info Banner */}
            <div className="flex items-start gap-3 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
              <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-semibold text-blue-400 mb-1">API Integration</h3>
                <p className="text-sm text-gray-300">
                  Connect your inventory system or API to enable automated order processing, real-time inventory updates, 
                  and seamless data synchronization with our platform.
                </p>
              </div>
            </div>

            {/* API Status Card */}
            <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-lg font-bold text-white mb-1">Integration Status</h2>
                  <p className="text-sm text-gray-400">Configure your API connection settings</p>
                </div>
                <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
                  apiSettings.hasApiIntegration 
                    ? 'bg-green-500/10 border border-green-500/20 text-green-400' 
                    : 'bg-gray-500/10 border border-gray-500/20 text-gray-400'
                }`}>
                  {apiSettings.hasApiIntegration ? (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span className="text-sm font-semibold">Connected</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-4 h-4" />
                      <span className="text-sm font-semibold">Not Connected</span>
                    </>
                  )}
                </div>
              </div>

              {/* Enable Toggle */}
              <label className="flex items-center gap-3 p-4 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg cursor-pointer hover:border-orange-500/30 transition">
                <input
                  type="checkbox"
                  checked={apiSettings.hasApiIntegration}
                  onChange={(e) => {
                    setApiSettings({ ...apiSettings, hasApiIntegration: e.target.checked });
                    toast.success(e.target.checked ? 'API integration enabled' : 'API integration disabled');
                  }}
                  className="w-5 h-5 rounded border-[#2A2A2A] bg-[#1A1A1A] text-orange-600 focus:ring-orange-500"
                />
                <Zap className="w-5 h-5 text-orange-500" />
                <div>
                  <span className="text-white font-medium block">Enable API Integration</span>
                  <span className="text-sm text-gray-400">Allow automated data exchange with your systems</span>
                </div>
              </label>
            </div>

            {/* API Configuration */}
            {apiSettings.hasApiIntegration && (
              <>
                <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-6">
                  <h3 className="text-lg font-semibold text-white mb-4">API Configuration</h3>
                  
                  <div className="space-y-6">
                    {/* API Endpoint */}
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        <LinkIcon className="w-4 h-4 inline mr-2" />
                        API Endpoint URL
                      </label>
                      <input
                        type="url"
                        value={apiSettings.apiEndpoint}
                        onChange={(e) => setApiSettings({ ...apiSettings, apiEndpoint: e.target.value })}
                        className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white focus:outline-none focus:border-orange-500"
                        placeholder="https://api.yourcompany.com/v1"
                      />
                      <p className="text-xs text-gray-500 mt-1">The base URL for your API endpoint</p>
                    </div>

                    {/* API Key */}
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        <Key className="w-4 h-4 inline mr-2" />
                        API Key / Authentication Token
                      </label>
                      <div className="relative">
                        <input
                          type={showApiKey ? 'text' : 'password'}
                          value={apiSettings.apiKey}
                          onChange={(e) => setApiSettings({ ...apiSettings, apiKey: e.target.value })}
                          className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white focus:outline-none focus:border-orange-500 font-mono pr-24"
                          placeholder="sk_live_••••••••••••••••"
                        />
                        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
                          <button
                            onClick={() => {
                              if (apiSettings.apiKey) {
                                navigator.clipboard.writeText(apiSettings.apiKey);
                                toast.success('API key copied to clipboard');
                              }
                            }}
                            className="p-2 text-gray-400 hover:text-white transition"
                            title="Copy API Key"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setShowApiKey(!showApiKey)}
                            className="p-2 text-gray-400 hover:text-white transition"
                            title={showApiKey ? 'Hide key' : 'Show key'}
                          >
                            {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">Your API authentication credentials (stored securely and encrypted)</p>
                    </div>

                    {/* API Documentation URL */}
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        <Globe className="w-4 h-4 inline mr-2" />
                        API Documentation URL
                      </label>
                      <input
                        type="url"
                        value={apiSettings.apiDocumentationUrl}
                        onChange={(e) => setApiSettings({ ...apiSettings, apiDocumentationUrl: e.target.value })}
                        className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white focus:outline-none focus:border-orange-500"
                        placeholder="https://docs.yourcompany.com/api"
                      />
                      <p className="text-xs text-gray-500 mt-1">Link to your API documentation for our developers</p>
                    </div>

                    {/* Webhook URL */}
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        <Zap className="w-4 h-4 inline mr-2" />
                        Webhook URL (for notifications)
                      </label>
                      <input
                        type="url"
                        value={apiSettings.webhookUrl}
                        onChange={(e) => setApiSettings({ ...apiSettings, webhookUrl: e.target.value })}
                        className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white focus:outline-none focus:border-orange-500"
                        placeholder="https://yourcompany.com/webhooks/orders"
                      />
                      <p className="text-xs text-gray-500 mt-1">Where we'll send order notifications and updates</p>
                    </div>

                    {/* API Notes */}
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Additional Notes
                      </label>
                      <textarea
                        value={apiSettings.apiNotes}
                        onChange={(e) => setApiSettings({ ...apiSettings, apiNotes: e.target.value })}
                        rows={4}
                        className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white focus:outline-none focus:border-orange-500 resize-none"
                        placeholder="Any special requirements, authentication methods, rate limits, or other important details..."
                      />
                    </div>
                  </div>
                </div>

                {/* Test Connection */}
                <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-6">
                  <h3 className="text-lg font-semibold text-white mb-4">Test Connection</h3>
                  <p className="text-sm text-gray-400 mb-4">
                    Test your API connection to verify that all settings are configured correctly.
                  </p>
                  
                  <div className="flex items-center gap-4">
                    <PrimaryButton
                      onClick={async () => {
                        if (!apiSettings.apiEndpoint) {
                          toast.error('Enter an API endpoint URL first.');
                          return;
                        }
                        setApiTestStatus('testing');
                        try {
                          const headers: Record<string, string> = { 'Content-Type': 'application/json' };
                          if (apiSettings.apiKey) headers['Authorization'] = `Bearer ${apiSettings.apiKey}`;
                          const res = await fetch(apiSettings.apiEndpoint, { method: 'GET', headers, signal: AbortSignal.timeout(8000) });
                          if (res.ok || res.status === 401 || res.status === 403) {
                            // 401/403 means endpoint exists but auth failed — still "reachable"
                            setApiTestStatus('success');
                            toast.success(res.ok ? 'API connection successful! Endpoint is reachable.' : `Endpoint reachable (HTTP ${res.status} — check your API key).`);
                          } else {
                            setApiTestStatus('error');
                            toast.error(`API returned HTTP ${res.status}. Check your endpoint URL.`);
                          }
                        } catch (err: any) {
                          setApiTestStatus('error');
                          const msg = err?.name === 'TimeoutError' ? 'Connection timed out after 8 seconds.' : 'Could not reach endpoint. Check the URL and CORS settings.';
                          toast.error(msg);
                        }
                      }}
                      disabled={apiTestStatus === 'testing'}
                      className="flex items-center gap-2"
                    >
                      <RefreshCw className={`w-4 h-4 ${apiTestStatus === 'testing' ? 'animate-spin' : ''}`} />
                      {apiTestStatus === 'testing' ? 'Testing...' : 'Test Connection'}
                    </PrimaryButton>

                    {apiTestStatus === 'success' && (
                      <div className="flex items-center gap-2 text-green-400">
                        <CheckCircle2 className="w-5 h-5" />
                        <span className="font-medium">Connection Successful</span>
                      </div>
                    )}

                    {apiTestStatus === 'error' && (
                      <div className="flex items-center gap-2 text-red-400">
                        <AlertTriangle className="w-5 h-5" />
                        <span className="font-medium">Connection Failed</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Save Changes */}
                <div className="flex items-center justify-between bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-6">
                  <div>
                    <p className="text-white font-medium">Save API Settings</p>
                    <p className="text-sm text-gray-400">Your changes will be saved securely</p>
                  </div>
                  <PrimaryButton
                    onClick={() => {
                      // Force a write by spreading the current value — triggers useUserData's save effect
                      setApiSettings({ ...apiSettings });
                      toast.success('API settings saved!');
                    }}
                    className="flex items-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    Save Settings
                  </PrimaryButton>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Upgrade Modal */}
      <PortalUpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        portalType="vendor"
        currentTier={subscriptionTier}
        lockedFeature={lockedFeature}
      />
    </div>
      <PortalSettings
        open={showPortalSettings}
        onClose={() => setShowPortalSettings(false)}
        initialSection={settingsSection}
        portalName="Vendor portal"
      />
    </LayoutManager>
  );
}