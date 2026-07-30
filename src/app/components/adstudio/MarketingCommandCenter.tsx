/**
 * MarketingCommandCenter — the single hub that makes the Content Center the
 * control panel for ALL marketing + ecommerce advertising.
 *
 * It surfaces every marketing/ad/ecommerce tool in one organized place. The
 * "Ad Studio" and other internal Content Center tabs open in-place via
 * `onOpenTab`; standalone pages are reached via `onNavigate`.
 *
 * Every `path` used here maps to an existing route in routes.tsx / nav.ts, so
 * this is purely a navigation surface — it adds no duplicate functionality.
 */
import {
  Megaphone, Sparkles, Share2, Calendar, ShoppingBag, Store, Tag,
  BarChart3, Mail, MessageSquare, Search, Users, FileText, Star,
  Zap, Target, Image as ImageIcon, TrendingUp, ArrowUpRight, Bot,
  Activity, Link2, Box, DollarSign, Package, ShoppingCart, AlertCircle,
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
    title: 'Create Ads & Creative',
    icon: Megaphone,
    tools: [
      { name: 'Ad Studio', desc: 'One-stop ad creation for products & services', icon: Megaphone, action: { kind: 'tab', tab: 'ad-studio' }, badge: 'NEW' },
      { name: 'AI Generator', desc: 'Generate blogs, social posts, emails & images', icon: Sparkles, action: { kind: 'tab', tab: 'create' } },
      { name: 'Templates', desc: 'Ready-made content templates', icon: FileText, action: { kind: 'tab', tab: 'templates' } },
      { name: 'Photo to Video', desc: 'Turn product photos into video reels', icon: ImageIcon, action: { kind: 'tab', tab: 'photo-video' } },
      { name: 'Creator Studio', desc: 'AI-powered creative production', icon: Bot, action: { kind: 'tab', tab: 'creator-studio' } },
    ],
  },
  {
    title: 'Publish & Schedule',
    icon: Share2,
    tools: [
      { name: 'Social Scheduler', desc: 'Schedule posts across platforms', icon: Calendar, action: { kind: 'tab', tab: 'social-scheduler' } },
      { name: 'Social Accounts', desc: 'Connect Facebook, Instagram, X & more', icon: Share2, action: { kind: 'tab', tab: 'social-accounts' } },
      { name: 'Content Calendar', desc: 'Plan your publishing timeline', icon: Calendar, action: { kind: 'tab', tab: 'calendar' } },
      { name: 'Social Media Hub', desc: 'Full multi-platform management', icon: Share2, action: { kind: 'nav', path: 'social-media-hub' } },
      { name: 'Blog Manager', desc: 'Write, schedule & publish posts', icon: FileText, action: { kind: 'nav', path: 'blog-manager' } },
    ],
  },
  {
    title: 'Campaigns & Engagement',
    icon: Zap,
    tools: [
      { name: 'Marketing Automation', desc: 'Workflows, triggers & sequences', icon: Zap, action: { kind: 'nav', path: 'marketing-automation' } },
      { name: 'Retargeting Pixels', desc: 'Facebook & Google retargeting', icon: Target, action: { kind: 'nav', path: 'retargeting-pixels' } },
      { name: 'Exit-Intent Popups', desc: 'Capture leaving visitors', icon: Target, action: { kind: 'nav', path: 'exit-intent' } },
      { name: 'Live Chat', desc: 'Engage visitors in real time', icon: MessageSquare, action: { kind: 'nav', path: 'live-chat' } },
      { name: 'Reviews & Surveys', desc: 'Collect reviews and feedback', icon: Star, action: { kind: 'nav', path: 'review-surveys' } },
      { name: 'Influencer Tracker', desc: 'Manage ambassadors & influencers', icon: Users, action: { kind: 'nav', path: 'influencer-tracker' } },
    ],
  },
  {
    title: 'Store & Promotions',
    icon: ShoppingBag,
    tools: [
      { name: 'Store Overview', desc: 'Storefront status & integration health', icon: Activity, action: { kind: 'tab', tab: 'store-overview' } },
      { name: 'Store Providers', desc: 'Manage dropshipper connections', icon: Link2, action: { kind: 'tab', tab: 'store-providers' } },
      { name: 'Store Catalog', desc: 'Browse & manage product catalog', icon: Box, action: { kind: 'tab', tab: 'store-catalog' } },
      { name: 'Store Pricing', desc: 'Product pricing & markup rules', icon: DollarSign, action: { kind: 'tab', tab: 'store-pricing' } },
      { name: 'Store Inventory', desc: 'Synced inventory & stock levels', icon: Package, action: { kind: 'tab', tab: 'store-inventory' } },
      { name: 'Store Orders', desc: 'Forwarded orders & fulfillment', icon: ShoppingCart, action: { kind: 'tab', tab: 'store-orders' } },
      { name: 'Store Error Logs', desc: 'Integration errors & diagnostics', icon: AlertCircle, action: { kind: 'tab', tab: 'store-errors' } },
      { name: 'Public Store', desc: 'View your live storefront', icon: ShoppingBag, action: { kind: 'nav', path: 'public-store' } },
      { name: 'Promotions Manager', desc: 'Deals, discounts & flash sales', icon: Tag, action: { kind: 'nav', path: 'promotions-manager' } },
      { name: 'Auto-Product Pilot', desc: 'Automated product importing', icon: Bot, action: { kind: 'nav', path: 'auto-product-pilot' }, badge: 'NEW' },
      { name: 'Photo Importer', desc: 'Bulk import media for campaigns', icon: ImageIcon, action: { kind: 'nav', path: 'photo-importer' } },
    ],
  },
  {
    title: 'Growth & Insights',
    icon: TrendingUp,
    tools: [
      { name: 'AI Ranking Engine', desc: 'SEO & visibility automation', icon: Search, action: { kind: 'nav', path: 'ai-ranking-engine' }, badge: 'NEW' },
      { name: 'Keyword Tracker', desc: 'Track search rankings', icon: Search, action: { kind: 'nav', path: 'keyword-tracker' } },
      { name: 'Content Analytics', desc: 'Performance across content', icon: BarChart3, action: { kind: 'tab', tab: 'analytics' } },
      { name: 'Shop Intelligence', desc: 'Ecommerce analytics & insights', icon: BarChart3, action: { kind: 'tab', tab: 'shop-intelligence' } },
      { name: 'Referral Rewards', desc: 'Grow through referrals', icon: Users, action: { kind: 'nav', path: 'referral-rewards' } },
    ],
  },
];

export default function MarketingCommandCenter({
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
            <Megaphone className="w-7 h-7 text-white" />
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-white">Marketing Command Center</h2>
            <p className="text-gray-400 mt-1 max-w-2xl">
              Your one-stop control panel for every marketing and ecommerce advertising tool — create ads,
              publish to social, run campaigns, and grow your store, all from here.
            </p>
            <button
              onClick={() => run({ kind: 'tab', tab: 'ad-studio' })}
              className="mt-4 inline-flex items-center gap-2 bg-[#ea580c] hover:bg-orange-600 text-white font-semibold px-5 py-2.5 rounded-xl transition"
            >
              <Sparkles className="w-4 h-4" /> Open Ad Studio
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
