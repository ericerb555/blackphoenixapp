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
  const [activeTab, setActiveTab] = useState('operations');
  const [showAdminAlerts, setShowAdminAlerts] = useState(false);
  const [alertCount, setAlertCount] = useState(8);

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
    <div className="min-h-screen bg-[#0A0A0A] pb-20">
      {/* Mobile Header */}
      <div className="bg-[#0F0F0F] border-b border-[#2A2A2A] px-4 py-3 sticky top-0 z-40">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            {companyLogo ? (
              <img src={companyLogo} alt={companyName} className="w-10 h-10 rounded-lg object-cover" />
            ) : (
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-600 to-orange-700 flex items-center justify-center">
                <Building2 className="w-5 h-5 text-white" />
              </div>
            )}
            <div>
              <h2 className="text-sm font-bold text-white">{companyName}</h2>
              <p className="text-sm text-gray-500">Command Center</p>
            </div>
          </div>
          
          {isAdminOrHigher() && alertCount > 0 && (
            <button
              onClick={() => setShowAdminAlerts(!showAdminAlerts)}
              className="relative p-2 hover:bg-[#1A1A1A] rounded-lg transition-colors active:scale-95"
            >
              <Bell className="w-5 h-5 text-orange-400" />
              <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-bold">{alertCount}</span>
              </div>
            </button>
          )}
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search modules..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl text-white text-sm placeholder-gray-500 focus:outline-none focus:border-orange-500/50"
          />
        </div>
      </div>

      {/* Horizontal Scrolling Metrics */}
      <div className="px-4 py-3 bg-[#0A0A0A] border-b border-[#2A2A2A] overflow-x-auto scrollbar-hide">
        <div className="flex gap-3 pb-1" style={{ minWidth: 'max-content' }}>
          <div className="flex-shrink-0 w-48 p-4 bg-[#1A1A1A] border border-green-500/30 rounded-xl active:scale-95 transition-transform">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center">
                <DollarSign className="w-4 h-4 text-green-400" />
              </div>
              <span className="text-sm text-gray-400 font-medium">Revenue</span>
            </div>
            <div className="text-xl font-bold text-white">{formatCurrency(totalRevenue)}</div>
            <div className={`flex items-center gap-1 mt-1 text-sm ${getTrendColor(revenueTrend)}`}>
              {getTrendIcon(revenueTrend)}
              <span>{Math.abs(revenueTrend)}%</span>
            </div>
          </div>

          <div className="flex-shrink-0 w-48 p-4 bg-[#1A1A1A] border border-orange-500/30 rounded-xl active:scale-95 transition-transform">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center">
                <Briefcase className="w-4 h-4 text-orange-400" />
              </div>
              <span className="text-sm text-gray-400 font-medium">Active Jobs</span>
            </div>
            <div className="text-xl font-bold text-white">{activeJobsCount}</div>
            <div className={`flex items-center gap-1 mt-1 text-sm ${getTrendColor(jobsTrend)}`}>
              {getTrendIcon(jobsTrend)}
              <span>{Math.abs(jobsTrend)}%</span>
            </div>
          </div>

          <div className="flex-shrink-0 w-48 p-4 bg-[#1A1A1A] border border-blue-500/30 rounded-xl active:scale-95 transition-transform">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Users className="w-4 h-4 text-blue-400" />
              </div>
              <span className="text-sm text-gray-400 font-medium">Customers</span>
            </div>
            <div className="text-xl font-bold text-white">{customersCount}</div>
            <div className={`flex items-center gap-1 mt-1 text-sm ${getTrendColor(customersTrend)}`}>
              {getTrendIcon(customersTrend)}
              <span>{Math.abs(customersTrend)}%</span>
            </div>
          </div>

          <div className="flex-shrink-0 w-48 p-4 bg-[#1A1A1A] border border-purple-500/30 rounded-xl active:scale-95 transition-transform">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <UserCheck className="w-4 h-4 text-purple-400" />
              </div>
              <span className="text-sm text-gray-400 font-medium">Team</span>
            </div>
            <div className="text-xl font-bold text-white">{teamCount}</div>
            <div className="text-sm text-gray-500 mt-1">Employees</div>
          </div>
        </div>
      </div>

      {isAdminOrHigher() && showAdminAlerts && (
        <div className="bg-[#0A0A0A] border-b border-[#2A2A2A] p-4 animate-slide-down">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-600 to-red-700 flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Admin Alerts</h2>
                <p className="text-sm text-gray-400">Review pending tasks</p>
              </div>
            </div>
            <button
              onClick={() => setShowAdminAlerts(false)}
              className="p-2 hover:bg-[#1A1A1A] rounded-lg transition-colors text-gray-400 hover:text-white active:scale-95"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="bg-[#0F0F0F] rounded-xl border border-[#2A2A2A] overflow-hidden">
            <AdminAlertsPanel onNavigate={(route) => window.location.href = route} />
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'operations' && !searchQuery && (
          <div className="mb-4">
            <button
              onClick={() => handleNavigation('/enterprise-quote-workflow', 'quotes')}
              className="group relative w-full p-4 rounded-xl border-2 border-orange-500/50 bg-gradient-to-br from-orange-600/20 to-orange-700/10 active:scale-[0.98] transition-all duration-200"
            >
              <div className="relative flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="relative w-12 h-12 rounded-lg bg-gradient-to-br from-orange-600 to-orange-700 flex items-center justify-center flex-shrink-0 shadow-lg shadow-orange-500/50">
                    <FileText className="w-6 h-6 text-white" />
                  </div>
                  
                  <div className="text-left flex-1 min-w-0">
                    <h3 className="text-base font-bold text-white mb-0.5 group-active:text-orange-300 transition-colors">
                      Quote to Contract Workflow
                    </h3>
                    <p className="text-sm text-gray-300 line-clamp-2">
                      Convert approved quotes into contracts with AI
                    </p>
                  </div>
                </div>
                
                <ChevronRight className="w-6 h-6 text-orange-400 flex-shrink-0" />
              </div>
            </button>
          </div>
        )}

        {searchQuery && filteredModules.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Search className="w-12 h-12 text-gray-600 mb-4" />
            <h3 className="text-lg font-bold text-gray-400 mb-2">No modules found</h3>
            <p className="text-sm text-gray-500">Try a different search term</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {filteredModules.map((module, index) => {
              const Icon = module.icon;
              return (
                <button
                  key={index}
                  onClick={() => handleNavigation(module.path, module.tab)}
                  className="group relative p-4 rounded-xl border border-[#2A2A2A] bg-gradient-to-br from-[#1A1A1A]/40 to-[#0F0F0F]/40 active:scale-[0.98] transition-all duration-200 text-left min-h-[88px] flex items-center gap-3"
                >
                  <div className={`w-12 h-12 rounded-lg bg-gradient-to-br from-${module.color}-500/10 to-${module.color}-600/5 flex items-center justify-center flex-shrink-0`}>
                    <Icon className={`w-6 h-6 ${getIconColorClass(module.color)}`} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-bold text-white mb-1 group-active:text-orange-300 transition-colors line-clamp-1">
                      {module.label}
                    </h3>
                    {module.description && (
                      <p className="text-sm text-gray-400 line-clamp-2">
                        {module.description}
                      </p>
                    )}
                  </div>

                  <ChevronRight className="w-5 h-5 text-gray-600 group-active:text-orange-400 transition-colors flex-shrink-0" />
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-[#0F0F0F] border-t border-[#2A2A2A] px-2 py-2 z-50 safe-area-inset-bottom">
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
                    ? 'flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-all duration-200 min-w-[60px] active:scale-95 bg-orange-500/10 text-orange-400'
                    : 'flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-all duration-200 min-w-[60px] active:scale-95 text-gray-400'
                }
              >
                <Icon className={isActive ? 'w-5 h-5 scale-110 transition-transform duration-200' : 'w-5 h-5 transition-transform duration-200'} />
                <span className={isActive ? 'text-[10px] font-semibold line-clamp-1 text-orange-400' : 'text-[10px] font-semibold line-clamp-1 text-gray-500'}>
                  {category.label}
                </span>
                {isActive && (
                  <div className="w-1 h-1 rounded-full bg-orange-500 mt-0.5" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
