/**
 * EcommerceStoreHub — the single, all-in-one eCommerce workspace.
 *
 * Everything for the store lives INSIDE this one tab: storefront & catalog,
 * suppliers & fulfillment, pricing & promotions, media, insights, and digital
 * products. Selecting a tool in the left rail swaps the panel in-place — nothing
 * navigates away to a separate page. Each panel renders the real feature
 * component (the same ones the Content Center used to render as separate tabs),
 * so this adds organization, not duplicate functionality.
 *
 * The store catalog family (overview, providers, catalog, pricing, inventory,
 * orders, error logs) is all served by DropshipperAdminPanel in `embedded` mode
 * with a different `initialTab`, so those all render in-place too.
 *
 * A handful of genuinely standalone full pages (Spocket, Zendrop, Auto-Product
 * Pilot, the public storefront, the Content Center, etc.) can still be opened in
 * full via `onNavigate`, surfaced under "Open full pages" at the bottom of the rail.
 */
import { useState } from 'react';
import {
  Store, ShoppingBag, ShoppingCart, Box, Link2, DollarSign, Package,
  AlertCircle, Activity, Rocket, Zap, Bot, RefreshCw, Star, Tag,
  BarChart3, TrendingUp, Flame, Download, BookOpen, Image as ImageIcon,
  ChevronRight, ExternalLink, LayoutGrid, LayoutDashboard,
  RotateCcw,
} from 'lucide-react';

import DropshipperAdminPanel, { StoreTab } from '../DropshipperAdminPanel';
import StoreContentStudio from '../StoreContentStudio';
import HotProductsRadar from '../HotProductsRadar';
import StoreBoostersManager from '../StoreBoostersManager';
import PromotionsEngineManager from '../PromotionsEngineManager';
import FulfillmentManager from '../FulfillmentManager';
import ShopIntelligenceSuite from '../ShopIntelligenceSuite';
import StoreAnalyticsDashboard from '../StoreAnalyticsDashboard';
import MediaLibraryManager from '../MediaLibraryManager';
import MarketplaceAdmin from '../../pages/MarketplaceAdmin';
import OrderManager from '../../pages/OrderManager';

/** A section that renders inline inside the hub. */
interface Section {
  id: string;
  name: string;
  desc: string;
  icon: any;
  badge?: string;
  /** Optional store sub-tab when the section is served by DropshipperAdminPanel. */
  storeTab?: StoreTab;
  render?: () => JSX.Element;
}

interface Group {
  title: string;
  icon: any;
  sections: Section[];
}

const GROUPS: Group[] = [
  {
    title: 'Storefront & Catalog',
    icon: Store,
    sections: [
      { id: 'overview', name: 'Online Store', desc: 'Storefront status & integration health', icon: Activity, storeTab: 'overview' },
      { id: 'catalog', name: 'Store Catalog', desc: 'Browse & manage products', icon: Box, storeTab: 'catalog' },
      { id: 'store-content', name: 'Store Content', desc: 'Product pages & descriptions', icon: Link2, render: () => <StoreContentStudio /> },
      { id: 'hot-products', name: 'Hot Products', desc: 'Trending discovery & fast import', icon: Flame, render: () => <HotProductsRadar /> },
    ],
  },
  {
    title: 'Suppliers & Fulfillment',
    icon: Package,
    sections: [
      { id: 'providers', name: 'Store Providers', desc: 'Manage dropshipper connections', icon: Link2, storeTab: 'providers' },
      { id: 'inventory', name: 'Store Inventory', desc: 'Synced inventory & stock levels', icon: Package, storeTab: 'inventory' },
      { id: 'customer-orders', name: 'Customer Orders', desc: 'Every paid order · recover · send to supplier', icon: ShoppingCart, badge: 'LIVE', render: () => <OrderManager /> },
      { id: 'orders', name: 'Forwarded Orders', desc: 'Orders already sent to dropshippers', icon: ShoppingCart, storeTab: 'orders' },
      { id: 'fulfillment', name: 'Fulfillment', desc: 'Order tracking, notifications, stock', icon: ShoppingCart, render: () => <FulfillmentManager /> },
    ],
  },
  {
    title: 'Pricing & Promotions',
    icon: Tag,
    sections: [
      { id: 'pricing', name: 'Store Pricing', desc: 'Product pricing & markup rules', icon: DollarSign, storeTab: 'pricing' },
      { id: 'returns', name: 'Returns', desc: 'Refunds, store credit & the review queue', icon: RotateCcw, badge: 'NEW', storeTab: 'returns' },
      { id: 'store-boosters', name: 'Store Boosters', desc: 'AOV-boosting merchandising', icon: Zap, render: () => <StoreBoostersManager /> },
      { id: 'promotions-engine', name: 'Promotions Engine', desc: 'Scheduled discounts & volume pricing', icon: Tag, render: () => <PromotionsEngineManager /> },
    ],
  },
  {
    title: 'Media',
    icon: ImageIcon,
    sections: [
      { id: 'media', name: 'Media Library', desc: 'Product photos & videos · upload & organize', icon: ImageIcon, badge: 'NEW', render: () => <MediaLibraryManager /> },
    ],
  },
  {
    title: 'Insights & Reviews',
    icon: TrendingUp,
    sections: [
      { id: 'shop-intelligence', name: 'Shop Intelligence', desc: 'Ecommerce analytics & insights', icon: BarChart3, render: () => <ShopIntelligenceSuite /> },
      { id: 'analytics', name: 'Store Analytics', desc: 'Storewide performance dashboard', icon: BarChart3, render: () => <StoreAnalyticsDashboard /> },
      { id: 'errors', name: 'Store Error Logs', desc: 'Integration errors & diagnostics', icon: AlertCircle, storeTab: 'errors' },
    ],
  },
  {
    title: 'Digital Products',
    icon: Download,
    sections: [
      { id: 'digital-products', name: 'Digital Products', desc: 'Create, price & organize ebooks, templates, calculators & bundles', icon: BookOpen, badge: 'NEW', render: () => <MarketplaceAdmin /> },
    ],
  },
];

/** Standalone full pages that still open outside the hub. */
const FULL_PAGES: { name: string; desc: string; icon: any; path: string; badge?: string }[] = [
  { name: 'Content Center', desc: 'Marketing, ads & content hub', icon: LayoutDashboard, path: 'enterprise-content-center' },
  { name: 'Spocket', desc: 'US/EU dropship supplier', icon: Rocket, path: 'spocket', badge: 'PRIMARY' },
  { name: 'Zendrop', desc: 'Auto-fulfillment · products live', icon: Zap, path: 'zendrop', badge: 'LIVE' },
  { name: 'Auto-Product Pilot', desc: 'AI product auto-import', icon: Bot, path: 'auto-product-pilot' },
  { name: 'Promotions Manager', desc: 'Deals, discounts & flash sales', icon: Tag, path: 'promotions-manager' },
  { name: 'Subscribe & Save', desc: 'Recurring orders · up to 15% off', icon: RefreshCw, path: 'subscribe' },
  { name: 'Revenue Analytics', desc: 'Products · channels · email', icon: TrendingUp, path: 'revenue-analytics' },
  { name: 'Product Reviews', desc: 'Ratings · moderation · insights', icon: Star, path: 'reviews' },
  { name: 'Public Store', desc: 'View your live storefront', icon: ShoppingBag, path: 'public-store' },
  { name: 'Digital Storefront', desc: 'View your live digital products store', icon: ShoppingBag, path: 'digital-store' },
];

const ALL_SECTIONS = GROUPS.flatMap((g) => g.sections);

export default function EcommerceStoreHub({
  onNavigate,
}: {
  onNavigate?: (page: string) => void;
  onOpenTab?: (tab: string) => void;
}) {
  // `home` is the landing overview grid; any other value is a section id.
  const [active, setActive] = useState<string>('home');

  const activeSection = ALL_SECTIONS.find((s) => s.id === active);

  const renderPanel = () => {
    if (!activeSection) return null;
    if (activeSection.render) return activeSection.render();
    if (activeSection.storeTab) {
      // Keying by storeTab forces the embedded panel to re-mount on the right sub-tab.
      return <DropshipperAdminPanel key={activeSection.storeTab} embedded initialTab={activeSection.storeTab} />;
    }
    return null;
  };

  return (
    <div className="flex gap-6">
      {/* Left rail — all store tools */}
      <aside className="w-64 flex-shrink-0 space-y-6">
        <button
          onClick={() => setActive('home')}
          className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold transition ${
            active === 'home'
              ? 'bg-[#ea580c] text-white'
              : 'text-gray-300 hover:bg-[#1a1a1a]'
          }`}
        >
          <LayoutGrid className="w-4 h-4" /> Store Home
        </button>

        {GROUPS.map((group) => {
          const GroupIcon = group.icon;
          return (
            <div key={group.title}>
              <div className="flex items-center gap-2 px-3 mb-1.5">
                <GroupIcon className="w-3.5 h-3.5 text-[#ea580c]" />
                <span className="text-[11px] font-bold uppercase tracking-wide text-gray-500">{group.title}</span>
              </div>
              <div className="space-y-0.5">
                {group.sections.map((s) => {
                  const Icon = s.icon;
                  const isActive = active === s.id;
                  return (
                    <button
                      key={s.id}
                      onClick={() => setActive(s.id)}
                      className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition ${
                        isActive
                          ? 'bg-[#ea580c]/15 text-[#ea580c] font-semibold'
                          : 'text-gray-300 hover:bg-[#1a1a1a]'
                      }`}
                    >
                      <Icon className="w-4 h-4 flex-shrink-0" />
                      <span className="flex-1 text-left truncate">{s.name}</span>
                      {s.badge && (
                        <span className="text-[9px] font-bold text-[#ea580c] bg-[#ea580c]/15 px-1 py-0.5 rounded">{s.badge}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}

        {/* Standalone full pages */}
        <div>
          <div className="flex items-center gap-2 px-3 mb-1.5">
            <ExternalLink className="w-3.5 h-3.5 text-gray-500" />
            <span className="text-[11px] font-bold uppercase tracking-wide text-gray-500">Open full pages</span>
          </div>
          <div className="space-y-0.5">
            {FULL_PAGES.map((p) => {
              const Icon = p.icon;
              return (
                <button
                  key={p.path}
                  onClick={() => onNavigate?.(p.path)}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-400 hover:bg-[#1a1a1a] hover:text-white transition"
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <span className="flex-1 text-left truncate">{p.name}</span>
                  <ExternalLink className="w-3 h-3 opacity-50" />
                </button>
              );
            })}
          </div>
        </div>
      </aside>

      {/* Content panel */}
      <div className="flex-1 min-w-0">
        {active === 'home' ? (
          <div className="space-y-8">
            {/* Hero */}
            <div className="rounded-2xl border border-[#2A2A2A] bg-gradient-to-br from-[#1a1a1a] to-[#0A0A0A] p-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#ea580c] to-orange-700 flex items-center justify-center flex-shrink-0">
                  <Store className="w-7 h-7 text-white" />
                </div>
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-white">eCommerce Store</h2>
                  <p className="text-gray-400 mt-1 max-w-2xl">
                    Everything for your store, all in this one tab — manage your storefront and catalog,
                    connect suppliers, handle fulfillment and orders, run pricing and promotions, organize
                    media, sell digital products, and track performance. Pick a tool on the left to open it here.
                  </p>
                  <div className="mt-4 flex flex-wrap gap-3">
                    <button
                      onClick={() => setActive('overview')}
                      className="inline-flex items-center gap-2 bg-[#ea580c] hover:bg-orange-600 text-white font-semibold px-5 py-2.5 rounded-xl transition"
                    >
                      <Store className="w-4 h-4" /> Open Online Store
                    </button>
                    <button
                      onClick={() => onNavigate?.('enterprise-content-center')}
                      className="inline-flex items-center gap-2 border border-[#2A2A2A] hover:border-[#ea580c] text-gray-200 font-semibold px-5 py-2.5 rounded-xl transition"
                    >
                      <LayoutDashboard className="w-4 h-4" /> Content Center
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Tool groups */}
            {GROUPS.map((group) => {
              const GroupIcon = group.icon;
              return (
                <div key={group.title}>
                  <div className="flex items-center gap-2 mb-3">
                    <GroupIcon className="w-5 h-5 text-[#ea580c]" />
                    <h3 className="text-lg font-semibold text-white">{group.title}</h3>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {group.sections.map((s) => {
                      const Icon = s.icon;
                      return (
                        <button
                          key={s.id}
                          onClick={() => setActive(s.id)}
                          className="group text-left p-4 rounded-xl border border-[#2A2A2A] bg-[#141414] hover:border-[#ea580c] hover:bg-[#ea580c]/5 transition relative"
                        >
                          {s.badge && (
                            <span className="absolute top-3 right-3 text-[10px] font-bold text-[#ea580c] bg-[#ea580c]/15 px-1.5 py-0.5 rounded">
                              {s.badge}
                            </span>
                          )}
                          <div className="w-9 h-9 rounded-lg bg-[#0A0A0A] flex items-center justify-center mb-3 group-hover:bg-[#ea580c]/15">
                            <Icon className="w-5 h-5 text-gray-300 group-hover:text-[#ea580c]" />
                          </div>
                          <div className="flex items-center gap-1">
                            <p className="font-semibold text-white">{s.name}</p>
                            <ChevronRight className="w-3.5 h-3.5 text-gray-600 group-hover:text-[#ea580c] opacity-0 group-hover:opacity-100 transition" />
                          </div>
                          <p className="text-xs text-gray-400 mt-0.5 leading-snug">{s.desc}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div>
            {/* Breadcrumb / section header */}
            <div className="flex items-center gap-2 mb-4 text-sm">
              <button onClick={() => setActive('home')} className="text-gray-400 hover:text-white transition">
                Store Home
              </button>
              <ChevronRight className="w-4 h-4 text-gray-600" />
              <span className="text-white font-semibold">{activeSection?.name}</span>
            </div>
            {renderPanel()}
          </div>
        )}
      </div>
    </div>
  );
}
