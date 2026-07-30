/**
 * EcommerceStoreHub — a single place that gathers EVERY ecommerce store tab and
 * feature that used to be scattered across the Content Center tab bar, the
 * Marketing Command Center groups, and the left navigation.
 *
 * In-hub areas (the Online Store panel, boosters, promotions engine, fulfillment,
 * hot products, store content, shop intelligence, store analytics, and the
 * Online Store sub-tabs) open in-place via `onOpenTab`. Standalone pages
 * (Spocket, Zendrop, Orders, Reviews, etc.) are reached via `onNavigate`. Every
 * `path`/`tab` here maps to an existing route or Content Center tab, so this is a
 * pure organizing surface — it adds no duplicate functionality.
 */
import {
  Store, ShoppingBag, ShoppingCart, Box, Link2, DollarSign, Package,
  AlertCircle, Activity, Rocket, Zap, Bot, RefreshCw, Star, Tag,
  BarChart3, TrendingUp, Flame, ArrowUpRight,
} from 'lucide-react';

type Action =
  | { kind: 'tab'; tab: string }
  | { kind: 'nav'; path: string };

interface Tool {
  name: string;
  desc: string;
  icon: any;
  action: Action;
  badge?: string;
}

interface Group {
  title: string;
  icon: any;
  tools: Tool[];
}

const GROUPS: Group[] = [
  {
    title: 'Storefront & Catalog',
    icon: Store,
    tools: [
      { name: 'Online Store', desc: 'Storefront status & integration health', icon: Activity, action: { kind: 'tab', tab: 'store-overview' } },
      { name: 'Store Catalog', desc: 'Browse & manage products', icon: Box, action: { kind: 'tab', tab: 'store-catalog' } },
      { name: 'Store Content', desc: 'Product pages & descriptions', icon: Link2, action: { kind: 'tab', tab: 'store-content' } },
      { name: 'Hot Products', desc: 'Trending discovery & fast import', icon: Flame, action: { kind: 'tab', tab: 'hot-products' } },
      { name: 'Public Store', desc: 'View your live storefront', icon: ShoppingBag, action: { kind: 'nav', path: 'public-store' } },
    ],
  },
  {
    title: 'Suppliers & Fulfillment',
    icon: Package,
    tools: [
      { name: 'Spocket', desc: 'US/EU dropship supplier', icon: Rocket, action: { kind: 'nav', path: 'spocket' }, badge: 'PRIMARY' },
      { name: 'Zendrop', desc: 'Auto-fulfillment · products live', icon: Zap, action: { kind: 'nav', path: 'zendrop' }, badge: 'LIVE' },
      { name: 'Auto-Product Pilot', desc: 'AI product auto-import', icon: Bot, action: { kind: 'nav', path: 'auto-product-pilot' }, badge: 'NEW' },
      { name: 'Store Providers', desc: 'Manage dropshipper connections', icon: Link2, action: { kind: 'tab', tab: 'store-providers' } },
      { name: 'Store Inventory', desc: 'Synced inventory & stock levels', icon: Package, action: { kind: 'tab', tab: 'store-inventory' } },
      { name: 'Fulfillment', desc: 'Order tracking, notifications, stock', icon: ShoppingCart, action: { kind: 'tab', tab: 'fulfillment' } },
      { name: 'Orders', desc: 'Stripe payments · fulfillment', icon: ShoppingCart, action: { kind: 'nav', path: 'orders' }, badge: 'LIVE' },
    ],
  },
  {
    title: 'Pricing & Promotions',
    icon: Tag,
    tools: [
      { name: 'Store Pricing', desc: 'Product pricing & markup rules', icon: DollarSign, action: { kind: 'tab', tab: 'store-pricing' } },
      { name: 'Store Boosters', desc: 'AOV-boosting merchandising', icon: Zap, action: { kind: 'tab', tab: 'store-boosters' } },
      { name: 'Promotions Engine', desc: 'Scheduled discounts & volume pricing', icon: Tag, action: { kind: 'tab', tab: 'promotions-engine' } },
      { name: 'Promotions Manager', desc: 'Deals, discounts & flash sales', icon: Tag, action: { kind: 'nav', path: 'promotions-manager' } },
      { name: 'Subscribe & Save', desc: 'Recurring orders · up to 15% off', icon: RefreshCw, action: { kind: 'nav', path: 'subscribe' }, badge: 'NEW' },
    ],
  },
  {
    title: 'Insights & Reviews',
    icon: TrendingUp,
    tools: [
      { name: 'Shop Intelligence', desc: 'Ecommerce analytics & insights', icon: BarChart3, action: { kind: 'tab', tab: 'shop-intelligence' } },
      { name: 'Store Analytics', desc: 'Storewide performance dashboard', icon: BarChart3, action: { kind: 'tab', tab: 'creator-vetting' } },
      { name: 'Revenue Analytics', desc: 'Products · channels · email', icon: TrendingUp, action: { kind: 'nav', path: 'revenue-analytics' }, badge: 'NEW' },
      { name: 'Product Reviews', desc: 'Ratings · moderation · insights', icon: Star, action: { kind: 'nav', path: 'reviews' }, badge: 'NEW' },
      { name: 'Store Error Logs', desc: 'Integration errors & diagnostics', icon: AlertCircle, action: { kind: 'tab', tab: 'store-errors' } },
    ],
  },
];

export default function EcommerceStoreHub({
  onNavigate,
  onOpenTab,
}: {
  onNavigate?: (page: string) => void;
  onOpenTab?: (tab: string) => void;
}) {
  const run = (action: Action) => {
    if (action.kind === 'tab') {
      if (onOpenTab) onOpenTab(action.tab);
    } else if (onNavigate) {
      onNavigate(action.path);
    }
  };

  return (
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
              Every store tool in one place — manage your storefront and catalog, connect suppliers,
              handle fulfillment and orders, run pricing and promotions, and track performance.
            </p>
            <button
              onClick={() => run({ kind: 'tab', tab: 'store-overview' })}
              className="mt-4 inline-flex items-center gap-2 bg-[#ea580c] hover:bg-orange-600 text-white font-semibold px-5 py-2.5 rounded-xl transition"
            >
              <Store className="w-4 h-4" /> Open Online Store
            </button>
          </div>
        </div>
      </div>

      {/* Tool groups */}
      {GROUPS.map(group => {
        const GroupIcon = group.icon;
        return (
          <div key={group.title}>
            <div className="flex items-center gap-2 mb-3">
              <GroupIcon className="w-5 h-5 text-[#ea580c]" />
              <h3 className="text-lg font-semibold text-white">{group.title}</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {group.tools.map(tool => {
                const Icon = tool.icon;
                return (
                  <button
                    key={tool.name}
                    onClick={() => run(tool.action)}
                    className="group text-left p-4 rounded-xl border border-[#2A2A2A] bg-[#141414] hover:border-[#ea580c] hover:bg-[#ea580c]/5 transition relative"
                  >
                    {tool.badge && (
                      <span className="absolute top-3 right-3 text-[10px] font-bold text-[#ea580c] bg-[#ea580c]/15 px-1.5 py-0.5 rounded">
                        {tool.badge}
                      </span>
                    )}
                    <div className="w-9 h-9 rounded-lg bg-[#0A0A0A] flex items-center justify-center mb-3 group-hover:bg-[#ea580c]/15">
                      <Icon className="w-5 h-5 text-gray-300 group-hover:text-[#ea580c]" />
                    </div>
                    <div className="flex items-center gap-1">
                      <p className="font-semibold text-white">{tool.name}</p>
                      <ArrowUpRight className="w-3.5 h-3.5 text-gray-600 group-hover:text-[#ea580c] opacity-0 group-hover:opacity-100 transition" />
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5 leading-snug">{tool.desc}</p>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
