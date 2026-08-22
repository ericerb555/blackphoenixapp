/**
 * Unified Dashboard Mobile - Mobile-First Bottom Navigation
 * 
 * Optimized mobile experience with bottom tab navigation,
 * horizontal scrolling metrics, and touch-friendly interface
 * 
 * Created: 2026-03-18
 */

import { useState, useEffect } from 'react';
import { 
  Shield, Bell, Zap, RefreshCw, Search, 
  Briefcase, DollarSign, Users, Package, FileText, 
  Wrench, Calendar, Building2, Smartphone, Megaphone,
  Settings, BarChart3, MessageSquare, Globe, Award,
  Wallet, Receipt, ShoppingCart, Target, Palette,
  UserCheck, Database, Mail, Layers, Video,
  ChevronRight, Clock, TrendingUp, Truck, Store,
  Eye, Edit2, ClipboardList, Gift, Brain, Folder,
  Crown, Code, Cloud, BookOpen, Menu, X, Activity,
  ArrowUpRight, ArrowDownRight, Minus, ChevronLeft,
  LayoutGrid, TrendingDown, AlertCircle, Plus, Home
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { isAdminOrHigher } from '../lib/utils/roleUtils';
import AdminAlertsPanel from '../components/AdminAlertsPanel';
import { StartQuoteModal } from '../components/quotes/StartQuoteModal';

interface ModuleCard {
  label: string;
  path: string;
  icon: any;
  color: string;
  tab?: string;
  description?: string;
}

interface TabCategory {
  id: string;
  label: string;
  icon: any;
  modules: ModuleCard[];
}

interface UnifiedDashboardMobileProps {
  tabCategories: TabCategory[];
  companyName: string;
  companyLogo: string | null;
  totalRevenue: number;
  revenueTrend: number;
  activeJobsCount: number;
  jobsTrend: number;
  customersCount: number;
  customersTrend: number;
  teamCount: number;
}

export default function UnifiedDashboardMobile({
  tabCategories,
  companyName,
  companyLogo,
  totalRevenue,
  revenueTrend,
  activeJobsCount,
  jobsTrend,
  customersCount,
  customersTrend,
  teamCount
}: UnifiedDashboardMobileProps) {
  const [searchQuery, setSearchQuery] = useState('');
  // Read-only until focus blocks password-manager autofill of the sign-in email
  // into the module search (which hid the grid until manually cleared).
  const [searchReadOnly, setSearchReadOnly] = useState(true);
  const [activeTab, setActiveTab] = useState('operations');
  const [showAdminAlerts, setShowAdminAlerts] = useState(false);
  const [alertCount, setAlertCount] = useState(8);
  const [showStartQuote, setShowStartQuote] = useState(false);

  const handleNavigation = (path: string, tab?: string) => {
    try {
      const url = tab ? `${path}?tab=${tab}` : path;
      window.location.href = url;
    } catch (error) {
      console.error('Navigation error:', error);
      toast.error(`Navigation error: ${error}`);
    }
  };

  const getFilteredModules = (modules: ModuleCard[]) => {
    if (!searchQuery) return modules;
    const query = searchQuery.toLowerCase();
    return modules.filter(module => 
      module.label.toLowerCase().includes(query) ||
      module.description?.toLowerCase().includes(query)
    );
  };

  const activeCategory = tabCategories.find(cat => cat.id === activeTab);
  const filteredModules = activeCategory ? getFilteredModules(activeCategory.modules) : [];

  const getIconColorClass = (color: string) => {
    const colorMap: { [key: string]: string } = {
      orange: 'text-orange-400', green: 'text-green-400', blue: 'text-blue-400',
      cyan: 'text-cyan-400', purple: 'text-purple-400', pink: 'text-pink-400',
      amber: 'text-amber-400', yellow: 'text-yellow-400', red: 'text-red-400',
      violet: 'text-violet-400', fuchsia: 'text-fuchsia-400', indigo: 'text-indigo-400',
      teal: 'text-teal-400', emerald: 'text-emerald-400', rose: 'text-rose-400',
      zinc: 'text-zinc-400', slate: 'text-slate-400',
    };
    return colorMap[color] || 'text-orange-400';
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const getTrendIcon = (trend: number) => {
    if (trend > 0) return <ArrowUpRight className="w-3 h-3" />;
    if (trend < 0) return <ArrowDownRight className="w-3 h-3" />;
    return <Minus className="w-3 h-3" />;
  };

  const getTrendColor = (trend: number) => {
    if (trend > 0) return 'text-green-400';
    if (trend < 0) return 'text-red-400';
    return 'text-gray-400';
  };

  return (
    <div className="bp-command-center min-h-screen bg-[#0A0A0A] pb-24 w-full overflow-x-hidden">
      {/*
        Spacing, tap targets and text size for this screen only.

        WHY THIS EXISTS RATHER THAN A FIX IN globals.css

        Every padding and margin utility in this application currently computes
        to 0px. The cause is global: `* { margin: 0; padding: 0 }` sits outside
        any @layer, and unlayered CSS beats layered CSS outright, so it wins
        against every Tailwind utility. Measured on this screen: `p-4`, `p-3`
        and `pb-24` all resolve to 0, while `gap-3` gives 12px — gap survives
        only because the reset never mentions it.

        That was fixed globally once and reverted, because fixing it changes
        every screen in the product at once and that is not a change to make
        as a side effect. So this block does the same job inside one wrapper
        class and touches nothing else.

        `revert-layer` is what does the work: on an unlayered declaration it
        rolls the value back to the previous cascade layer, which is Tailwind's
        utilities layer. The markup already asks for the right spacing — this
        simply lets it through again, here.
      */}
      <style>{`
        .bp-command-center, .bp-command-center * {
          padding: revert-layer;
          margin: revert-layer;
        }
        /* A floor on anything pressed with a thumb. Apple put the minimum at
           44pt because a fingertip is about 10mm across and cannot be aimed. */
        .bp-command-center button,
        .bp-command-center a,
        .bp-command-center [role='button'] {
          min-height: 44px;
        }
        /* Width matters as much as height for an icon-only control. Applied to
           every button rather than trying to detect which ones are icon-only:
           anything carrying a word is already past 44px, so this only reaches
           the ones that need it. */
        .bp-command-center button,
        .bp-command-center [role='button'] {
          min-width: 44px;
        }
        /* Nothing on a phone should be smaller than this and still be read.
           Named classes, not a blanket rule on every element: these
           declarations are unlayered and so beat every Tailwind text utility.
           A universal font-size here flattened text-xl, text-sm and text-xs to
           one size and destroyed the type hierarchy — measured, every piece of
           text came out at 16px. Only the too-small classes are touched. */
        .bp-command-center [class*="text-[10px]"],
        .bp-command-center [class*="text-[11px]"] { font-size: 12px; }
        /* Cards in the horizontal rails were sized from the viewport and came
           out wider than it, so their right-hand edge was clipped away by the
           overflow guard on the root. Keep them inside the screen. */
        .bp-command-center [class*='w-[calc(100vw'] { max-width: min(270px, calc(100vw - 2.5rem)); }
      `}</style>

      {/* Mobile Header - Fixed with safe area */}
      <div className="bg-[#0F0F0F] border-b border-[#2A2A2A] px-4 py-3 sticky top-0 z-40 w-full">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {companyLogo ? (
              <img src={companyLogo} alt={companyName} className="w-10 h-10 rounded-xl object-cover flex-shrink-0" />
            ) : (
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-600 to-orange-700 flex items-center justify-center flex-shrink-0">
                <Building2 className="w-5 h-5 text-white" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h2 className="text-sm font-bold text-white truncate">{companyName}</h2>
              <p className="text-xs text-gray-500">Command Center</p>
            </div>
          </div>

          {isAdminOrHigher() && alertCount > 0 && (
            <button
              onClick={() => setShowAdminAlerts(!showAdminAlerts)}
              className="relative p-2.5 hover:bg-[#1A1A1A] rounded-xl transition-colors active:scale-95 flex-shrink-0"
            >
              <Bell className="w-5 h-5 text-orange-400" />
              <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                <span className="text-white text-[10px] font-bold">{alertCount}</span>
              </div>
            </button>
          )}
        </div>

        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <input
            type="search"
            name="command-center-module-search"
            placeholder="Search modules..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            // Prevent password managers from autofilling the saved email here.
            // Read-only until focus is the reliable stopper (Chromium ignores
            // autoComplete="off"); it flips editable the instant the user taps in.
            readOnly={searchReadOnly}
            onFocus={() => setSearchReadOnly(false)}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            data-form-type="other"
            data-lpignore="true"
            data-1p-ignore="true"
            className="w-full pl-11 pr-4 py-2.5 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl text-white text-sm placeholder-gray-500 focus:outline-none focus:border-orange-500/50"
          />
        </div>
      </div>

      {/* Horizontal Scrolling Metrics */}
      <div className="w-full overflow-x-auto bg-[#0A0A0A] border-b border-[#2A2A2A]">
        <div className="flex gap-3 px-4 py-3 min-w-max">
          <div className="flex-shrink-0 w-[calc(100vw-120px)] min-w-[210px] max-w-[270px] p-4 bg-[#1A1A1A] border-2 border-green-500/30 rounded-2xl active:scale-95 transition-transform">
            <div className="flex items-center gap-2.5 mb-2">
              <div className="w-9 h-9 rounded-xl bg-green-500/10 flex items-center justify-center">
                <DollarSign className="w-4 h-4 text-green-400" />
              </div>
              <span className="text-sm text-gray-400 font-semibold">Revenue</span>
            </div>
            <div className="text-xl font-bold text-white mb-1.5">{formatCurrency(totalRevenue)}</div>
            <div className={`flex items-center gap-2 text-sm ${getTrendColor(revenueTrend)}`}>
              {getTrendIcon(revenueTrend)}
              <span className="font-semibold">{Math.abs(revenueTrend)}%</span>
            </div>
          </div>

          <div className="flex-shrink-0 w-[calc(100vw-120px)] min-w-[210px] max-w-[270px] p-4 bg-[#1A1A1A] border-2 border-orange-500/30 rounded-2xl active:scale-95 transition-transform">
            <div className="flex items-center gap-2.5 mb-2">
              <div className="w-9 h-9 rounded-xl bg-orange-500/10 flex items-center justify-center">
                <Briefcase className="w-4 h-4 text-orange-400" />
              </div>
              <span className="text-sm text-gray-400 font-semibold">Active Jobs</span>
            </div>
            <div className="text-xl font-bold text-white mb-1.5">{activeJobsCount}</div>
            <div className={`flex items-center gap-2 text-sm ${getTrendColor(jobsTrend)}`}>
              {getTrendIcon(jobsTrend)}
              <span className="font-semibold">{Math.abs(jobsTrend)}%</span>
            </div>
          </div>

          <div className="flex-shrink-0 w-[calc(100vw-120px)] min-w-[210px] max-w-[270px] p-4 bg-[#1A1A1A] border-2 border-blue-500/30 rounded-2xl active:scale-95 transition-transform">
            <div className="flex items-center gap-2.5 mb-2">
              <div className="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center">
                <Users className="w-4 h-4 text-blue-400" />
              </div>
              <span className="text-sm text-gray-400 font-semibold">Customers</span>
            </div>
            <div className="text-xl font-bold text-white mb-1.5">{customersCount}</div>
            <div className={`flex items-center gap-2 text-sm ${getTrendColor(customersTrend)}`}>
              {getTrendIcon(customersTrend)}
              <span className="font-semibold">{Math.abs(customersTrend)}%</span>
            </div>
          </div>

          <div className="flex-shrink-0 w-[calc(100vw-120px)] min-w-[210px] max-w-[270px] p-4 bg-[#1A1A1A] border-2 border-purple-500/30 rounded-2xl active:scale-95 transition-transform">
            <div className="flex items-center gap-2.5 mb-2">
              <div className="w-9 h-9 rounded-xl bg-purple-500/10 flex items-center justify-center">
                <UserCheck className="w-4 h-4 text-purple-400" />
              </div>
              <span className="text-sm text-gray-400 font-semibold">Team</span>
            </div>
            <div className="text-xl font-bold text-white mb-1.5">{teamCount}</div>
            <div className="text-sm text-gray-500 font-medium">Employees</div>
          </div>
        </div>
      </div>

      {isAdminOrHigher() && showAdminAlerts && (
        <div className="bg-[#0A0A0A] border-b border-[#2A2A2A] p-4 animate-slide-down w-full">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-4 flex-1 min-w-0">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-600 to-red-700 flex items-center justify-center flex-shrink-0">
                <AlertCircle className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-bold text-white">Admin Alerts</h2>
                <p className="text-sm text-gray-400">Review pending tasks</p>
              </div>
            </div>
            <button
              onClick={() => setShowAdminAlerts(false)}
              className="p-3 hover:bg-[#1A1A1A] rounded-xl transition-colors text-gray-400 hover:text-white active:scale-95 flex-shrink-0"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="bg-[#0F0F0F] rounded-xl border-2 border-[#2A2A2A] overflow-hidden">
            <AdminAlertsPanel onNavigate={(route) => window.location.href = route} />
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-4 w-full">

        {/* ── QUICK ACCESS — always visible, all tabs ── */}
        {!searchQuery && (
          <div className="mb-5">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 px-1">Quick Access</p>
            <div className="grid grid-cols-2 gap-3 mb-3">
              {/* Admin Alerts */}
              <button
                onClick={() => handleNavigation('/admin-alerts')}
                className="flex items-center gap-3 p-4 rounded-2xl bg-red-500/10 border-2 border-red-500/30 active:scale-[0.97] transition-all"
              >
                <div className="w-9 h-9 rounded-xl bg-red-500/20 flex items-center justify-center flex-shrink-0">
                  <Bell className="w-4 h-4 text-red-400" />
                </div>
                <div className="text-left min-w-0">
                  <p className="text-sm font-bold text-white leading-tight">Admin Alerts</p>
                  <p className="text-xs text-gray-500">Notifications</p>
                </div>
              </button>

              {/* Investment Management */}
              <button
                onClick={() => handleNavigation('/investment-management')}
                className="flex items-center gap-3 p-4 rounded-2xl bg-orange-500/10 border-2 border-orange-500/30 active:scale-[0.97] transition-all"
              >
                <div className="w-9 h-9 rounded-xl bg-orange-500/20 flex items-center justify-center flex-shrink-0">
                  <TrendingUp className="w-4 h-4 text-orange-400" />
                </div>
                <div className="text-left min-w-0">
                  <p className="text-sm font-bold text-white leading-tight">Investments</p>
                  <p className="text-xs text-gray-500">Manage</p>
                </div>
              </button>

              {/* Project Pipeline */}
              <button
                onClick={() => handleNavigation('/unified-project-pipeline')}
                className="flex items-center gap-3 p-4 rounded-2xl bg-blue-500/10 border-2 border-blue-500/30 active:scale-[0.97] transition-all"
              >
                <div className="w-9 h-9 rounded-xl bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                  <Briefcase className="w-4 h-4 text-blue-400" />
                </div>
                <div className="text-left min-w-0">
                  <p className="text-sm font-bold text-white leading-tight">Pipeline</p>
                  <p className="text-xs text-gray-500">Projects</p>
                </div>
              </button>

              {/* CRM */}
              <button
                onClick={() => handleNavigation('/crm')}
                className="flex items-center gap-3 p-4 rounded-2xl bg-purple-500/10 border-2 border-purple-500/30 active:scale-[0.97] transition-all"
              >
                <div className="w-9 h-9 rounded-xl bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                  <Users className="w-4 h-4 text-purple-400" />
                </div>
                <div className="text-left min-w-0">
                  <p className="text-sm font-bold text-white leading-tight">CRM</p>
                  <p className="text-xs text-gray-500">Customers</p>
                </div>
              </button>
            </div>

            {/* Second row — more quick links */}
            <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide">
              {[
                { label: 'Applications', icon: UserCheck, color: 'green', path: '/admin-alerts' },
                { label: 'Work Requests', icon: ClipboardList, color: 'yellow', path: '/admin-alerts' },
                { label: 'Payments', icon: DollarSign, color: 'emerald', path: '/unified-payment-center' },
                { label: 'Schedule', icon: Calendar, color: 'cyan', path: '/service-scheduling' },
                { label: 'Reports', icon: BarChart3, color: 'indigo', path: '/reporting-analytics' },
                { label: 'Settings', icon: Settings, color: 'zinc', path: '/settings' },
              ].map(({ label, icon: Icon, color, path }) => (
                <button
                  key={label}
                  onClick={() => handleNavigation(path)}
                  className="flex-shrink-0 flex flex-col items-center gap-1.5 px-4 py-3 rounded-xl bg-[#1A1A1A] border border-[#2A2A2A] active:scale-[0.96] transition-all min-w-[72px]"
                >
                  <Icon className={`w-5 h-5 text-${color}-400`} />
                  <span className="text-xs font-semibold text-gray-400 whitespace-nowrap">{label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'operations' && !searchQuery && (
          <div className="mb-5">
            <button
              onClick={() => handleNavigation('/enterprise-quote-workflow', 'quotes')}
              className="group relative w-full p-5 rounded-2xl border-2 border-orange-500/50 bg-gradient-to-br from-orange-600/20 to-orange-700/10 active:scale-[0.98] transition-all duration-200 shadow-lg"
            >
              <div className="relative flex items-center gap-4">
                <div className="relative w-14 h-14 rounded-xl bg-gradient-to-br from-orange-600 to-orange-700 flex items-center justify-center flex-shrink-0 shadow-lg shadow-orange-500/50">
                  <FileText className="w-7 h-7 text-white" />
                </div>

                <div className="text-left flex-1 min-w-0">
                  <h3 className="text-base font-bold text-white mb-1 group-active:text-orange-300 transition-colors">
                    Quote to Contract Workflow
                  </h3>
                  <p className="text-xs text-gray-300 line-clamp-2">
                    Convert approved quotes into contracts with AI
                  </p>
                </div>

                <ChevronRight className="w-7 h-7 text-orange-400 flex-shrink-0" />
              </div>
            </button>

            {/* Create a brand-new quote directly from mobile */}
            <button
              onClick={() => setShowStartQuote(true)}
              className="mt-3 w-full flex items-center justify-center gap-2 px-5 py-4 rounded-2xl bg-orange-500 active:bg-orange-400 active:scale-[0.98] text-white font-bold text-sm transition-all shadow-lg shadow-orange-500/30"
            >
              <Plus className="w-5 h-5" /> Create Quote
            </button>
          </div>
        )}

        {/* Invoices — quick access to create a new invoice or look one up */}
        {activeTab === 'operations' && !searchQuery && (
          <div className="mb-5">
            <div className="rounded-2xl border-2 border-emerald-500/40 bg-gradient-to-br from-emerald-600/15 to-emerald-700/5 p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-600 to-emerald-700 flex items-center justify-center flex-shrink-0 shadow-lg shadow-emerald-500/40">
                  <Receipt className="w-6 h-6 text-white" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-base font-bold text-white leading-tight">Invoices</h3>
                  <p className="text-xs text-gray-400">Create a new invoice or look one up</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => handleNavigation('/invoices', 'new')}
                  className="flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-500 text-white font-bold text-sm active:scale-[0.97] transition-all shadow-lg shadow-emerald-500/30"
                >
                  <Plus className="w-4 h-4" /> Create Invoice
                </button>
                <button
                  onClick={() => handleNavigation('/invoices')}
                  className="flex items-center justify-center gap-2 py-3 rounded-xl bg-[#1A1A1A] border border-emerald-500/30 text-emerald-400 font-bold text-sm active:scale-[0.97] transition-all"
                >
                  <Search className="w-4 h-4" /> Look Up
                </button>
              </div>
            </div>
          </div>
        )}

        {searchQuery && filteredModules.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Search className="w-16 h-16 text-gray-600 mb-4" />
            <h3 className="text-xl font-bold text-gray-400 mb-2">No modules found</h3>
            <p className="text-base text-gray-500">Try a different search term</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 w-full">
            {filteredModules.map((module, index) => {
              const Icon = module.icon;
              return (
                <button
                  key={index}
                  onClick={() => handleNavigation(module.path, module.tab)}
                  className="group relative p-4 rounded-2xl border-2 border-[#2A2A2A] bg-gradient-to-br from-[#1A1A1A]/80 to-[#0F0F0F]/60 active:scale-[0.97] transition-all duration-200 text-left min-h-[84px] flex items-center gap-3 shadow-lg hover:border-orange-500/30 w-full"
                >
                  <div className={`w-14 h-14 rounded-xl bg-gradient-to-br from-${module.color}-500/10 to-${module.color}-600/5 flex items-center justify-center flex-shrink-0 border border-${module.color}-500/20`}>
                    <Icon className={`w-7 h-7 ${getIconColorClass(module.color)}`} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-bold text-white mb-1 group-active:text-orange-300 transition-colors line-clamp-1">
                      {module.label}
                    </h3>
                    {module.description && (
                      <p className="text-xs text-gray-400 line-clamp-2 leading-relaxed">
                        {module.description}
                      </p>
                    )}
                  </div>

                  <ChevronRight className="w-6 h-6 text-gray-600 group-active:text-orange-400 transition-colors flex-shrink-0" />
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Bottom Navigation - Fixed with larger touch targets */}
      <div className="fixed bottom-0 left-0 right-0 bg-[#0F0F0F] border-t-2 border-[#2A2A2A] px-2 py-2 z-50 safe-area-inset-bottom shadow-2xl">
        <div className="flex justify-around items-center max-w-screen-sm mx-auto">
          {tabCategories.map((category) => {
            const Icon = category.icon;
            const isActive = activeTab === category.id;
            return (
              <button
                key={category.id}
                onClick={() => setActiveTab(category.id)}
                className={
                  isActive
                    ? 'flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all duration-200 min-w-[64px] active:scale-95 bg-orange-500/15 text-orange-400 border-2 border-orange-500/30'
                    : 'flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all duration-200 min-w-[64px] active:scale-95 text-gray-400 border-2 border-transparent'
                }
              >
                <Icon className={isActive ? 'w-5 h-5 scale-110 transition-transform duration-200' : 'w-5 h-5 transition-transform duration-200'} />
                <span className={isActive ? 'text-[11px] font-bold line-clamp-1 text-orange-400' : 'text-[11px] font-semibold line-clamp-1 text-gray-500'}>
                  {category.label}
                </span>
                {isActive && (
                  <div className="w-1.5 h-1.5 rounded-full bg-orange-500 mt-0.5" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {showStartQuote && <StartQuoteModal onClose={() => setShowStartQuote(false)} />}
    </div>
  );
}
