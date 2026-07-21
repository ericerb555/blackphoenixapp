/**
 * Owner's Dashboard - Comprehensive Administrative Control Center
 * 
 * Full-featured executive dashboard with:
 * - Business metrics & KPIs
 * - Multi-company/business profile management with switching
 * - Role Management
 * - Admin Alerts System
 * - Transfer Approvals
 * - User Management
 * - System Settings
 * - Financial Controls
 * - Ad Performance Dashboard
 * - Gift Hours
 * - Quick access to ALL modules
 * - Advanced branding controls
 * 
 * Created: 2026-03-07
 */

import { useState, useEffect } from 'react';
import * as CompanyStore from '../lib/simpleCompanyStore';
import {
  Crown, TrendingUp, DollarSign, Users, Briefcase, Target,
  ArrowUp, ArrowDown, Activity, BarChart3, PieChart, Calendar,
  Building2, Wallet, Shield, Bell, Settings, ChevronRight,
  Clock, CheckCircle, AlertTriangle, Package, CreditCard,
  Home, ArrowLeft, Gift, Key, FileText, Zap, Globe, Palette,
  Database, MessageSquare, Phone, Mail, Video, Image, Award,
  UserCheck, Lock, Eye, Edit2, TrendingDown, UserPlus, Layers,
  Megaphone, Store, ShoppingCart, Truck, RefreshCw, Filter,
  LayoutDashboard, Network, HardDrive, Cpu, Server, Terminal,
  Camera, Cloud, Wrench, Smartphone
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import RoleManagementSystem from '../components/RoleManagementSystem';
import AdminAlertsPanel from '../components/AdminAlertsPanel';
import SimpleCompanyManager from '../components/SimpleCompanyManager';
import GiftHoursModal from '../components/GiftHoursModal';
import OwnerGiftManagement from '../components/OwnerGiftManagement';
import TransferApprovalPanel from '../components/TransferApprovalPanel';
import AdPerformanceDashboard from '../components/vendor/AdPerformanceDashboard';
import RevenueChart from '../components/RevenueChart';
import SupabaseDiagnostics from '../components/SupabaseDiagnostics';
import CompanyDataRecovery from '../components/CompanyDataRecovery';
import AccessRequestPanel from '../components/AccessRequestPanel';
import DataBackupControl from '../components/DataBackupControl';
import DataPersistenceDiagnostics from '../components/DataPersistenceDiagnostics';
import InvestmentDetailsManager from '../components/InvestmentDetailsManager';
import ServiceAreaSettings from '../components/ServiceAreaSettings';
import DataBackupRestore from '../components/DataBackupRestore';
import DatabaseMigrationTool from '../components/DatabaseMigrationTool';
import CompanyBrandingCenter from '../components/CompanyBrandingCenter';
import { CompanySwitcher } from '../components/CompanySwitcher';
import * as SupabaseData from '../lib/supabase-data';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface OwnersDashboardProps {
  onNavigate?: (page: string) => void;
}

type MainTab = 'overview' | 'companies' | 'roles' | 'alerts' | 'transfers' | 'users' | 'settings' | 'financials' | 'ads' | 'modules' | 'access-control';

export default function OwnersDashboard({ onNavigate }: OwnersDashboardProps) {
  const { user } = useAuth();

  // CRITICAL: Redirect unauthenticated users to login
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const currentUserProfile = localStorage.getItem('currentUserProfile');

      if (!session && !currentUserProfile) {
        console.log('🚨 [OwnersDashboard] No authenticated user detected - redirecting to login');
        toast.error('Please log in to access the Owner Dashboard');
        window.location.href = '/login';
      }
    };
    checkAuth();
  }, []);

  const [activeTab, setActiveTab] = useState<MainTab>('overview');
  const [selectedCompany, setSelectedCompany] = useState<string | null>(null);
  const [showGiftModal, setShowGiftModal] = useState(false);
  const [showGiftManagement, setShowGiftManagement] = useState(false);
  const [giftTargetSub, setGiftTargetSub] = useState<SupabaseData.Subscription | null>(null);
  const [subscriptions, setSubscriptions] = useState<SupabaseData.Subscription[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [pendingAccessRequests, setPendingAccessRequests] = useState(0);
  const [showFreePortalInvite, setShowFreePortalInvite] = useState(false);
  const [sendingFreePortalInvite, setSendingFreePortalInvite] = useState(false);
  const [freePortalInvite, setFreePortalInvite] = useState({ name: '', email: '', phone: '', portalType: 'customer' });

  // SIMPLE STORE: Get companies directly from localStorage
  const [userCompanies, setUserCompanies] = useState<CompanyStore.Company[]>([]);
  const [activeCompany, setActiveCompany] = useState<CompanyStore.Company | null>(null);

  useEffect(() => {
    if (user) {
      (async () => {
        const companies = await CompanyStore.getAllCompanies(user.id);
        setUserCompanies(companies);

        const active = await CompanyStore.getActiveCompany(user.id);
        setActiveCompany(active);

        console.log('[OwnersDashboard] Loaded:', companies.length, 'companies');
      })();
    }
  }, [user]);

  const switchCompany = async (companyId: string) => {
    CompanyStore.setActiveCompany(companyId, user?.id);
    const active = await CompanyStore.getActiveCompany(user?.id);
    setActiveCompany(active);
    return { success: true };
  };

  // Use real companies if available, otherwise show empty state
  const displayCompanies = userCompanies.length > 0
    ? userCompanies.map(c => ({
        id: c.id,
        name: c.name,
        logo: '🏢',
        revenue: c.annual_revenue ? `$${c.annual_revenue.toLocaleString()}` : '$0',
        profit: '$0',
        growth: '0%',
        employees: c.employee_count || 0,
        projects: 0,
        color: 'from-orange-500 to-red-600'
      }))
    : [];

  // Executive Metrics (Consolidated across all companies)
  const executiveMetrics = [
    {
      label: 'Total Revenue',
      value: '$1,250,000',
      change: '+21.7%',
      trend: 'up',
      icon: DollarSign,
      color: 'from-green-500/20 to-emerald-600/20',
      iconColor: 'text-green-500'
    },
    {
      label: 'Total Net Profit',
      value: '$612,000',
      change: '+19.4%',
      trend: 'up',
      icon: TrendingUp,
      color: 'from-blue-500/20 to-cyan-600/20',
      iconColor: 'text-blue-500'
    },
    {
      label: 'Total Employees',
      value: '97',
      change: '+8 this quarter',
      trend: 'up',
      icon: Users,
      color: 'from-purple-500/20 to-pink-600/20',
      iconColor: 'text-purple-500'
    },
    {
      label: 'Active Projects',
      value: '213',
      change: '+45 this month',
      trend: 'up',
      icon: Briefcase,
      color: 'from-orange-500/20 to-red-600/20',
      iconColor: 'text-orange-500'
    }
  ];

  // Revenue trend data (consolidated)
  const revenueData = [
    { id: 'jan-2026', month: 'Jan', revenue: 1245000, profit: 587000, expenses: 658000 },
    { id: 'feb-2026', month: 'Feb', revenue: 1310000, profit: 625000, expenses: 685000 },
    { id: 'mar-2026', month: 'Mar', revenue: 1456000, profit: 712000, expenses: 744000 },
  ];

  // Quick Action Modules - ALL MODULES
  const moduleCategories = [
    {
      name: 'Customer & Sales',
      icon: Users,
      modules: [
        { name: 'Customers', path: 'customers', icon: Users },
        { name: 'CRM', path: 'customers', icon: UserCheck },
        { name: 'Invoices', path: 'invoices', icon: FileText },
        { name: 'Quick Quote / Estimate', path: 'estimates', icon: FileText },
        { name: 'Quotes Workflow', path: 'quote-to-contract-workflow', icon: FileText },
        { name: 'Bid Room', path: 'bid-room', icon: Award }
      ]
    },
    {
      name: 'Projects & Work',
      icon: Briefcase,
      modules: [
        { name: 'Master Scheduling', path: 'master-scheduling', icon: Calendar },
        { name: 'Service Scheduling', path: 'service-scheduling', icon: Clock },
        { name: 'Change Orders', path: 'change-order-camera', icon: Camera },
        { name: 'Waste & Disposal', path: 'waste-disposal-tracking', icon: Truck },
        { name: 'Weather Monitor', path: 'weather-job-site-monitor', icon: Cloud }
      ]
    },
    {
      name: 'Financial',
      icon: DollarSign,
      modules: [
        { name: 'Payment Center', path: 'unified-payment-center', icon: CreditCard },
        { name: 'Reconciliation', path: 'financial-reconciliation', icon: CheckCircle },
        { name: 'Job Financial Tracker', path: 'job-financial-tracker', icon: BarChart3 },
        { name: 'Payroll', path: 'payroll', icon: Wallet },
        { name: 'Reports', path: 'enterprise-reporting', icon: PieChart }
      ]
    },
    {
      name: 'Team & HR',
      icon: UserCheck,
      modules: [
        { name: 'Employees', path: 'employee-management', icon: Users },
        { name: 'HR Management', path: 'enterprise-hr', icon: UserPlus },
        { name: 'Subcontractors', path: 'subcontractor-enterprise', icon: Users },
        { name: 'Time Tracking', path: 'time-tracking', icon: Clock },
        { name: 'User Management', path: 'user-management', icon: Shield }
      ]
    },
    {
      name: 'Operations',
      icon: Settings,
      modules: [
        { name: 'Materials Database', path: 'materials-database', icon: Database },
        { name: 'Materials Hub', path: 'materials-hub', icon: Package },
        { name: 'Purchase Orders', path: 'purchase-orders', icon: FileText },
        { name: 'Vendor Management', path: 'vendor-management', icon: Store },
        { name: 'Services', path: 'services', icon: Wrench }
      ]
    },
    {
      name: 'Design & Content',
      icon: Palette,
      modules: [
        { name: 'Design Studio Pro', path: 'design-studio-pro', icon: Palette },
        { name: 'Content Center', path: 'enterprise-content-center', icon: Image },
        { name: 'Social Media', path: 'social-media', icon: Megaphone },
        { name: 'Landing Page Editor', path: 'landing-page-editor', icon: Globe },
        { name: 'Module Manager', path: 'module-manager', icon: Layers }
      ]
    },
    {
      name: 'Vendors & eCommerce',
      icon: Store,
      modules: [
        { name: 'Vendor Ads Hub', path: 'vendor-advertising-hub', icon: Megaphone },
        { name: 'Vendor Super Portal', path: 'vendor-super-portal', icon: Crown },
        { name: 'Dropshipper Admin', path: 'dropshipper-admin', icon: Truck },
        { name: 'Public Store', path: 'public-store', icon: ShoppingCart },
        { name: 'Mobile App Hub', path: 'mobile-app-hub', icon: Smartphone }
      ]
    },
    {
      name: 'Communication',
      icon: MessageSquare,
      modules: [
        { name: 'Messaging', path: 'messaging', icon: MessageSquare },
        { name: 'Enterprise Email', path: 'enterprise-email', icon: Mail },
        { name: 'Notifications', path: 'unified-dashboard', icon: Bell }
      ]
    },
    {
      name: 'System & Admin',
      icon: Shield,
      modules: [
        { name: 'AI Diagnostics', path: 'ai-diagnostics', icon: Cpu },
        { name: 'Role Management', path: 'role-management', icon: Key },
        { name: 'Subscription Hub', path: 'subscription-hub', icon: CreditCard },
        { name: 'System Status', path: 'unified-dashboard', icon: Activity }
      ]
    }
  ];

  const loadSubscriptions = async () => {
    try {
      const subs = await SupabaseData.getSubscriptions();
      setSubscriptions(subs);
    } catch (error) {
      console.error('Failed to load subscriptions:', error);
    }
  };

  useEffect(() => {
    loadSubscriptions();
    setCompanies(displayCompanies);
  }, []);

  // Load pending access requests count
  useEffect(() => {
    const loadPendingRequests = async () => {
      try {
        // Prefer the server-backed store so the count reflects requests handled
        // on any device; fall back to the local cache if the server is unreachable.
        let accessRequests: any[] = [];
        try {
          const res = await fetch(
            `https://${projectId}.supabase.co/functions/v1/make-server-57095a78/access-requests`,
            { headers: { Authorization: `Bearer ${publicAnonKey}` } },
          );
          const json = await res.json();
          if (json.success && Array.isArray(json.requests)) {
            accessRequests = json.requests;
            localStorage.setItem('accessRequests', JSON.stringify(json.requests));
          } else {
            accessRequests = JSON.parse(localStorage.getItem('accessRequests') || '[]');
          }
        } catch {
          accessRequests = JSON.parse(localStorage.getItem('accessRequests') || '[]');
        }
        const pending = accessRequests.filter((req: any) => req.status === 'pending').length;
        setPendingAccessRequests(pending);
      } catch (e) {
        console.error('Error loading access requests:', e);
      }
    };
    
    loadPendingRequests();
    
    // Reload every 30 seconds to catch new requests
    const interval = setInterval(loadPendingRequests, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleNavigate = (page: string) => {
    if (onNavigate) {
      onNavigate(page);
    } else {
      // Fallback: Direct navigation using location.href
      window.location.href = `/${page}`;
    }
  };

  const handleCompanySwitch = (companyId: string) => {
    setSelectedCompany(companyId);
    toast.success(`Switched to ${mockCompanies.find(c => c.id === companyId)?.name}`);
  };

  const sendFreePortalInvite = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!freePortalInvite.name.trim() || !freePortalInvite.email.trim() || !freePortalInvite.phone.trim()) {
      toast.error('Name, email, and phone number are required.');
      return;
    }
    setSendingFreePortalInvite(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Sign in again before creating a portal invite.');
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-57095a78/owner-provisioning/invites`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify(freePortalInvite),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.success) throw new Error(payload.error || 'Could not create the free portal invite.');
      const delivery = payload.invite?.invitationSent ? 'Their secure account-setup email has been sent.' : 'Their portal record is ready; they can sign in with their existing account to finish setup.';
      toast.success(`Free ${String(freePortalInvite.portalType).replace(/_/g, ' ')} access created. ${delivery}`);
      setFreePortalInvite({ name: '', email: '', phone: '', portalType: 'customer' });
      setShowFreePortalInvite(false);
    } catch (error: any) { toast.error(error.message || 'Could not create the portal invite.'); }
    finally { setSendingFreePortalInvite(false); }
  };

  // Navigation tabs
  const tabs = [
    { id: 'overview' as MainTab, label: 'Overview', icon: LayoutDashboard },
    { id: 'companies' as MainTab, label: 'Companies', icon: Building2, badge: companies.length },
    { id: 'roles' as MainTab, label: 'Roles & Permissions', icon: Key },
    { id: 'alerts' as MainTab, label: 'Admin Alerts', icon: Bell, badge: '3' },
    { id: 'transfers' as MainTab, label: 'Transfer Approvals', icon: RefreshCw },
    { id: 'users' as MainTab, label: 'User Management', icon: Users },
    { id: 'financials' as MainTab, label: 'Financial Controls', icon: DollarSign },
    { id: 'ads' as MainTab, label: 'Ad Performance', icon: Megaphone },
    { id: 'modules' as MainTab, label: 'All Modules', icon: Layers },
    { id: 'settings' as MainTab, label: 'System Settings', icon: Settings },
    { id: 'access-control' as MainTab, label: 'Access Control', icon: Shield, badge: pendingAccessRequests }
  ];

  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#1A1A1A] via-[#2A2A2A] to-[#1A1A1A] border-b border-[#ea580c]/30 shadow-xl shadow-[#ea580c]/5">
        <div className="max-w-[1920px] mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => handleNavigate('unified-dashboard')}
                className="p-2 hover:bg-[#2A2A2A] rounded-lg transition-colors"
                title="Back to Unified Dashboard"
              >
                <ArrowLeft className="w-5 h-5 text-gray-400" />
              </button>
              <div className="flex items-center gap-4">
                <div className="p-4 bg-gradient-to-br from-[#ea580c] to-[#dc2626] rounded-xl shadow-lg shadow-[#ea580c]/20">
                  <Crown className="w-10 h-10 text-white" />
                </div>
                <div>
                  <h1 className="text-4xl font-bold text-white">Owner's Control Center</h1>
                  <p className="text-gray-400 mt-1">Complete administrative control & business management</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => handleNavigate('master-admin-dashboard')}
                className="px-5 py-2.5 bg-gradient-to-r from-red-600 to-red-700 border border-red-500/50 text-white rounded-lg hover:from-red-700 hover:to-red-800 transition-all flex items-center gap-2 shadow-lg shadow-red-500/30 font-semibold"
                title="Platform Owner God Mode"
              >
                <Shield className="w-5 h-5" />
                <span className="hidden lg:inline">Master Admin Dashboard</span>
                <span className="lg:hidden">God Mode</span>
              </button>
              <button
                onClick={() => setShowGiftManagement(true)}
                className="px-4 py-2 bg-gradient-to-r from-purple-600 to-purple-700 border border-purple-500/50 text-white rounded-lg hover:from-purple-700 hover:to-purple-800 transition-all flex items-center gap-2 shadow-lg shadow-purple-500/20"
              >
                <Gift className="w-4 h-4" />
                Gift Management
              </button>
              <button 
                onClick={() => setActiveTab('settings')}
                className="px-4 py-2 bg-[#1A1A1A] border border-[#2A2A2A] text-gray-300 rounded-lg hover:bg-[#2A2A2A] transition-colors flex items-center gap-2"
              >
                <Settings className="w-4 h-4" />
                Settings
              </button>
            </div>
          </div>

          {/* Company Switcher Bar */}
          <div className="mt-6 flex items-center gap-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-[#2A2A2A] scrollbar-track-transparent">
            <span className="text-sm text-gray-400 whitespace-nowrap">View Company:</span>
            <button
              onClick={() => setSelectedCompany(null)}
              className={`px-4 py-2 rounded-lg font-medium transition-all whitespace-nowrap ${
                selectedCompany === null
                  ? 'bg-gradient-to-r from-[#ea580c] to-[#dc2626] text-white shadow-lg shadow-[#ea580c]/20'
                  : 'bg-[#1A1A1A] text-gray-400 hover:bg-[#2A2A2A] border border-[#2A2A2A]'
              }`}
            >
              <Globe className="w-4 h-4 inline mr-2" />
              All Companies (Consolidated)
            </button>
            {displayCompanies.map((company) => (
              <button
                key={company.id}
                onClick={() => handleCompanySwitch(company.id)}
                className={`px-4 py-2 rounded-lg font-medium transition-all whitespace-nowrap ${
                  selectedCompany === company.id
                    ? 'bg-gradient-to-r from-[#ea580c] to-[#dc2626] text-white shadow-lg shadow-[#ea580c]/20'
                    : 'bg-[#1A1A1A] text-gray-400 hover:bg-[#2A2A2A] border border-[#2A2A2A]'
                }`}
              >
                <span className="mr-2">{company.logo}</span>
                {company.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-[#1A1A1A] border-b border-[#2A2A2A] sticky top-0 z-40">
        <div className="max-w-[1920px] mx-auto px-6">
          <div className="flex gap-1 overflow-x-auto scrollbar-thin scrollbar-thumb-[#2A2A2A] scrollbar-track-transparent">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-6 py-4 font-medium transition-all whitespace-nowrap relative flex items-center gap-2 ${
                    activeTab === tab.id
                      ? 'text-[#ea580c] border-b-2 border-[#ea580c]'
                      : 'text-gray-400 hover:text-gray-200 hover:bg-[#2A2A2A]/50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                  {tab.badge && (
                    <span className="px-2 py-0.5 text-sm font-bold bg-[#ea580c] text-white rounded-full">
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-[1920px] mx-auto px-6 py-8">
        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Executive Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {executiveMetrics.map((metric, index) => {
                const Icon = metric.icon;
                const isPositive = metric.trend === 'up';
                return (
                  <div
                    key={index}
                    className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6 hover:border-[#ea580c]/50 transition-all duration-300 hover:shadow-lg hover:shadow-[#ea580c]/10"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className={`p-3 rounded-lg bg-gradient-to-br ${metric.color}`}>
                        <Icon className={`w-6 h-6 ${metric.iconColor}`} />
                      </div>
                      <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-sm font-semibold ${
                        isPositive ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                      }`}>
                        {isPositive ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                        {metric.change}
                      </div>
                    </div>
                    <div className="text-2xl font-bold text-white mb-1">{metric.value}</div>
                    <div className="text-sm text-gray-400">{metric.label}</div>
                  </div>
                );
              })}
            </div>

            {/* Revenue & Profit Chart */}
            <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold text-white">Consolidated Financial Performance</h2>
                  <p className="text-sm text-gray-400 mt-1">Last 6 months - All companies combined</p>
                </div>
                <button
                  onClick={() => setActiveTab('financials')}
                  className="text-sm text-[#ea580c] hover:text-[#dc2626] flex items-center gap-1"
                >
                  View Details
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
              <RevenueChart data={revenueData} />
            </div>

            {/* Business Breakdown */}
            <div>
              <h2 className="text-2xl font-bold text-white mb-4">Business Portfolio Breakdown</h2>
              {userCompanies.length === 0 && (
                <div className="bg-gradient-to-r from-orange-500/20 via-orange-600/10 to-transparent border-2 border-orange-500/40 rounded-xl p-8 mb-6 cursor-pointer hover:border-orange-500/60 transition-all"
                     onClick={() => setActiveTab('companies')}>
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-600 to-orange-700 flex items-center justify-center flex-shrink-0">
                      <Building2 className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-orange-400 font-bold mb-2 text-lg">Create Your First Company Profile</h3>
                      <p className="text-gray-300 text-sm mb-3">You haven't created any companies yet. Click here to go to the Companies tab and set up your first business profile with all your company information.</p>
                      <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-600 to-orange-700 text-white rounded-lg text-sm font-semibold hover:from-orange-700 hover:to-orange-800 transition">
                        <ChevronRight className="w-4 h-4" />
                        Go to Companies Tab
                      </div>
                    </div>
                  </div>
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {displayCompanies.map((company) => (
                  <div
                    key={company.id}
                    className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6 hover:border-[#ea580c]/50 transition-all duration-300 cursor-pointer"
                    onClick={() => handleCompanySwitch(company.id)}
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <div className={`text-4xl`}>{company.logo}</div>
                      <div className="flex-1">
                        <h3 className="text-white font-bold">{company.name}</h3>
                        <p className="text-sm text-gray-400">{company.employees} employees • {company.projects} projects</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-400">Revenue</span>
                        <span className="text-white font-bold">{company.revenue}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-400">Profit</span>
                        <span className="text-green-400 font-bold">{company.profit}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-400">Growth</span>
                        <span className="text-[#ea580c] font-bold flex items-center gap-1">
                          <ArrowUp className="w-3 h-3" />
                          {company.growth}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* COMPANIES TAB */}
        {activeTab === 'companies' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-white">Company & Business Profile Management</h2>
                <p className="text-gray-400 mt-1">Manage all business entities, branding, documents, and settings</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-2">Active Company</p>
                <CompanySwitcher />
              </div>
            </div>
            <SimpleCompanyManager />
          </div>
        )}

        {/* ROLES TAB */}
        {activeTab === 'roles' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">Role & Permission Management</h2>
              <p className="text-gray-400">Configure roles, permissions, and access controls across all systems</p>
            </div>
            <RoleManagementSystem companyName="Enterprise System" />
          </div>
        )}

        {/* ALERTS TAB */}
        {activeTab === 'alerts' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">Administrative Alerts & Notifications</h2>
              <p className="text-gray-400">Monitor system alerts, issues, and critical notifications</p>
            </div>
            <AdminAlertsPanel onNavigate={(route) => window.location.href = route} />
          </div>
        )}

        {/* TRANSFERS TAB */}
        {activeTab === 'transfers' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">Transfer Approval Center</h2>
              <p className="text-gray-400">Review and approve service transfers, hour transfers, and resource allocations</p>
            </div>
            <TransferApprovalPanel />
          </div>
        )}

        {/* USERS TAB */}
        {activeTab === 'users' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-white mb-2">User Management</h2>
                <p className="text-gray-400">Manage all users across all companies and systems</p>
              </div>
              <button
                onClick={() => setShowFreePortalInvite((open) => !open)}
                className="px-4 py-2 bg-gradient-to-r from-[#ea580c] to-[#dc2626] text-white rounded-lg hover:opacity-90 transition-opacity flex items-center gap-2"
              >
                <UserPlus className="w-4 h-4" />
                Add Free Portal User
              </button>
            </div>
            {showFreePortalInvite && (
              <form onSubmit={sendFreePortalInvite} className="rounded-xl border border-orange-500/30 bg-orange-500/5 p-5 sm:p-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div><p className="flex items-center gap-2 text-base font-semibold text-white"><UserPlus className="h-4 w-4 text-orange-300" /> Free portal access</p><p className="mt-1 max-w-2xl text-sm text-gray-400">Creates their portal record at no charge. The invitee completes their profile at first sign-in, then can choose a subscription, maintenance plan, both, or decide later.</p></div>
                  <button type="button" onClick={() => setShowFreePortalInvite(false)} className="text-sm text-gray-400 hover:text-white">Close</button>
                </div>
                <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  {[['name', 'Full name', 'Jane Smith'], ['email', 'Email address', 'jane@example.com'], ['phone', 'Phone number', '(214) 555-0100']].map(([field, label, placeholder]) => <label key={field} className="block text-xs font-semibold uppercase tracking-[0.12em] text-gray-400">{label}<input required type={field === 'email' ? 'email' : 'text'} value={(freePortalInvite as any)[field]} onChange={(event) => setFreePortalInvite((current) => ({ ...current, [field]: event.target.value }))} placeholder={placeholder} className="mt-2 w-full rounded-lg border border-white/10 bg-[#101010] px-3 py-2.5 text-sm normal-case tracking-normal text-white outline-none transition focus:border-orange-400" /></label>)}
                  <label className="block text-xs font-semibold uppercase tracking-[0.12em] text-gray-400">Portal access<select value={freePortalInvite.portalType} onChange={(event) => setFreePortalInvite((current) => ({ ...current, portalType: event.target.value }))} className="mt-2 w-full rounded-lg border border-white/10 bg-[#101010] px-3 py-2.5 text-sm normal-case tracking-normal text-white outline-none transition focus:border-orange-400"><option value="customer">Customer</option><option value="vendor">Vendor</option><option value="subcontractor">Subcontractor</option><option value="employee">Employee</option><option value="advertiser">Advertiser</option><option value="investor">Investor</option><option value="property_manager">Property Manager</option><option value="condo_manager">Condo Manager</option><option value="landlord">Landlord</option><option value="territory_owner">Territory Owner</option></select></label>
                </div>
                <div className="mt-5 flex flex-wrap items-center gap-3"><button disabled={sendingFreePortalInvite} type="submit" className="rounded-lg bg-orange-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-500 disabled:cursor-not-allowed disabled:opacity-50">{sendingFreePortalInvite ? 'Creating access…' : 'Create free access & send invite'}</button><span className="text-xs text-gray-500">No subscription, maintenance plan, invoice, or payment is created here.</span></div>
              </form>
            )}
            <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6">
              <div className="text-center py-8">
                <Users className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400 mb-4">User management interface</p>
                <button
                  onClick={() => handleNavigate('user-management')}
                  className="px-6 py-3 bg-[#ea580c] text-white rounded-lg hover:bg-[#dc2626] transition-colors"
                >
                  Open Full User Management
                </button>
              </div>
            </div>
          </div>
        )}

        {/* FINANCIALS TAB */}
        {activeTab === 'financials' && (() => {
          // ── Pull real store data ───────────────────────────────────────────────
          const autoProducts: any[] = (() => { try { return JSON.parse(localStorage.getItem('bp_auto_products') || '[]'); } catch { return []; } })();
          const publishedCount = autoProducts.filter((p: any) => p.status === 'auto-published').length;

          // ── Aggregate across all real companies ────────────────────────────────
          const allBiz = userCompanies.length > 0 ? userCompanies : [];
          const totalAnnualRev = allBiz.reduce((s, c) => s + (c.annual_revenue || 0), 0);
          const totalEmployees = allBiz.reduce((s, c) => s + (c.employee_count || 0), 0);
          // Estimates where real data isn't stored yet
          const estExpenses = Math.round(totalAnnualRev * 0.41);
          const estProfit   = totalAnnualRev - estExpenses;
          const shopRev     = 12840;
          const shopProfit  = 5136;
          const combinedRev = totalAnnualRev + shopRev;
          const combinedProfit = estProfit + shopProfit;
          const marginPct = combinedRev > 0 ? ((combinedProfit / combinedRev) * 100).toFixed(1) : '0.0';

          const COMPANY_COLORS = [
            { accent: '#3b82f6', glow: 'rgba(59,130,246,0.12)' },
            { accent: '#ea580c', glow: 'rgba(234,88,12,0.12)' },
            { accent: '#8b5cf6', glow: 'rgba(139,92,246,0.12)' },
            { accent: '#10b981', glow: 'rgba(16,185,129,0.12)' },
            { accent: '#f59e0b', glow: 'rgba(245,158,11,0.12)' },
            { accent: '#ec4899', glow: 'rgba(236,72,153,0.12)' },
          ];

          return (
          <div className="space-y-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-white mb-1">All Business & Shop Financials</h2>
                <p className="text-gray-400 text-sm">
                  {allBiz.length > 0
                    ? `${allBiz.length} business${allBiz.length > 1 ? 'es' : ''} + online store — all financials in one place`
                    : 'Online store + add businesses in the Companies tab to see them here'}
                </p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => handleNavigate('financial-reconciliation')}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-gray-300 hover:text-white bg-[#1A1A1A] border border-[#2A2A2A] hover:border-[#ea580c]/40 transition">
                  <Wallet className="w-4 h-4" /> Reconciliation
                </button>
                <button onClick={() => handleNavigate('enterprise-reporting')}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-gray-300 hover:text-white bg-[#1A1A1A] border border-[#2A2A2A] hover:border-[#ea580c]/40 transition">
                  <FileText className="w-4 h-4" /> Full Reports
                </button>
              </div>
            </div>

            {/* ── COMBINED TOP KPIs ──────────────────────────────── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: 'Combined Revenue', value: combinedRev > 0 ? `$${combinedRev.toLocaleString()}` : '$0', sub: `${allBiz.length} businesses + store`, icon: DollarSign, color: '#10b981', glow: 'rgba(16,185,129,0.15)' },
                { label: 'Est. Net Profit', value: combinedProfit > 0 ? `$${combinedProfit.toLocaleString()}` : '$0', sub: `${marginPct}% margin`, icon: TrendingUp, color: '#3b82f6', glow: 'rgba(59,130,246,0.15)' },
                { label: 'Total Employees', value: totalEmployees.toString() || '0', sub: `Across all ${allBiz.length} business${allBiz.length !== 1 ? 'es' : ''}`, icon: Users, color: '#8b5cf6', glow: 'rgba(139,92,246,0.15)' },
                { label: 'Store Products Live', value: publishedCount.toString() || '0', sub: 'Auto-published items', icon: Store, color: '#ea580c', glow: 'rgba(234,88,12,0.15)' },
              ].map(k => (
                <div key={k.label} className="rounded-2xl p-5 border border-[#2A2A2A]"
                  style={{ background: `linear-gradient(135deg, ${k.glow}, #111)` }}>
                  <div className="flex items-center justify-between mb-3">
                    <k.icon className="w-5 h-5" style={{ color: k.color }} />
                    <ArrowUp className="w-4 h-4 text-green-400" />
                  </div>
                  <p className="text-2xl font-black text-white">{k.value}</p>
                  <p className="text-sm font-bold text-gray-300 mt-0.5">{k.label}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{k.sub}</p>
                </div>
              ))}
            </div>

            {/* ── ALL BUSINESSES — one card each ────────────────── */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-black text-white">All Businesses</h3>
                <button onClick={() => setActiveTab('companies')}
                  className="text-xs font-bold text-orange-400 hover:text-orange-300 flex items-center gap-1 transition">
                  Manage Companies <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {allBiz.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-[#2A2A2A] bg-[#111] p-10 text-center">
                  <Building2 className="w-10 h-10 text-gray-700 mx-auto mb-3" />
                  <p className="text-white font-bold mb-1">No businesses added yet</p>
                  <p className="text-gray-500 text-sm mb-4">Go to the Companies tab to add your businesses — they&apos;ll appear here automatically.</p>
                  <button onClick={() => setActiveTab('companies')}
                    className="px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-[#ea580c] hover:bg-orange-600 transition">
                    Add a Business
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                  {allBiz.map((biz, i) => {
                    const clr = COMPANY_COLORS[i % COMPANY_COLORS.length];
                    const rev = biz.annual_revenue || 0;
                    const expenses = Math.round(rev * 0.41);
                    const profit = rev - expenses;
                    const margin = rev > 0 ? ((profit / rev) * 100).toFixed(1) : '0.0';
                    const rows = [
                      { label: 'Annual Revenue', value: rev > 0 ? `$${rev.toLocaleString()}` : 'Not set', pct: 100, color: clr.accent },
                      { label: 'Est. Expenses (41%)', value: rev > 0 ? `$${expenses.toLocaleString()}` : '—', pct: 41, color: '#f59e0b' },
                      { label: 'Est. Net Profit', value: rev > 0 ? `$${profit.toLocaleString()}` : '—', pct: parseFloat(margin), color: '#10b981' },
                    ];
                    return (
                      <div key={biz.id} className="rounded-2xl border border-[#2A2A2A] bg-[#111] overflow-hidden">
                        {/* Card header */}
                        <div className="flex items-center gap-4 p-5 border-b border-[#2A2A2A]"
                          style={{ background: `linear-gradient(135deg, ${clr.glow}, #111)` }}>
                          <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl font-black flex-shrink-0"
                            style={{ background: `${clr.accent}20`, border: `1px solid ${clr.accent}40`, color: clr.accent }}>
                            {biz.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="font-black text-white truncate">{biz.name}</h4>
                              {biz.is_primary && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                                  style={{ background: `${clr.accent}20`, color: clr.accent, border: `1px solid ${clr.accent}40` }}>
                                  Primary
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-gray-500 mt-0.5">
                              {[biz.industry, biz.city && biz.state ? `${biz.city}, ${biz.state}` : (biz.city || biz.state)].filter(Boolean).join(' · ') || 'Business'}
                            </p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="text-xs text-gray-500">Margin</p>
                            <p className="font-black text-sm" style={{ color: '#10b981' }}>{margin}%</p>
                          </div>
                        </div>

                        {/* Revenue bars */}
                        <div className="p-5 space-y-3">
                          {rows.map(row => (
                            <div key={row.label}>
                              <div className="flex justify-between text-sm mb-1">
                                <span className="text-gray-400">{row.label}</span>
                                <span className="font-bold text-white">{row.value}</span>
                              </div>
                              <div className="h-1.5 rounded-full bg-[#2A2A2A]">
                                <div className="h-full rounded-full" style={{ width: `${Math.max(2, row.pct)}%`, background: row.color }} />
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Stat pills */}
                        <div className="grid grid-cols-3 divide-x divide-[#2A2A2A] border-t border-[#2A2A2A]">
                          {[
                            { label: 'Employees', value: biz.employee_count ? biz.employee_count.toString() : '—' },
                            { label: 'Founded', value: biz.founded_date ? biz.founded_date.slice(0, 4) : '—' },
                            { label: 'Industry', value: biz.industry ? biz.industry.split(' ')[0] : '—' },
                          ].map(s => (
                            <div key={s.label} className="p-3 text-center">
                              <p className="text-sm font-black text-white">{s.value}</p>
                              <p className="text-[10px] text-gray-500 mt-0.5">{s.label}</p>
                            </div>
                          ))}
                        </div>

                        {/* Contact / links row */}
                        {(biz.email || biz.phone || biz.website) && (
                          <div className="flex gap-2 px-5 py-3 border-t border-[#2A2A2A] flex-wrap">
                            {biz.email && <a href={`mailto:${biz.email}`} className="text-xs text-gray-500 hover:text-white flex items-center gap-1 transition"><Mail className="w-3 h-3" />{biz.email}</a>}
                            {biz.phone && <span className="text-xs text-gray-500 flex items-center gap-1"><Phone className="w-3 h-3" />{biz.phone}</span>}
                            {biz.website && <a href={biz.website} target="_blank" rel="noreferrer" className="text-xs text-gray-500 hover:text-white flex items-center gap-1 transition"><Globe className="w-3 h-3" />Website</a>}
                          </div>
                        )}

                        <div className="px-5 pb-4">
                          <button onClick={() => handleNavigate('invoices')}
                            className="w-full py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5"
                            style={{ color: clr.accent, border: `1px solid ${clr.accent}30`, background: `${clr.accent}08` }}>
                            View Invoices <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* ── ONLINE STORE PANEL ────────────────────────────── */}
            <div className="rounded-2xl border border-[#2A2A2A] bg-[#111] overflow-hidden">
              <div className="flex items-center gap-3 p-5 border-b border-[#2A2A2A]"
                style={{ background: 'linear-gradient(135deg, rgba(234,88,12,0.1), #111)' }}>
                <div className="w-10 h-10 rounded-xl bg-orange-500/20 border border-orange-500/30 flex items-center justify-center">
                  <Store className="w-5 h-5 text-orange-400" />
                </div>
                <div>
                  <h3 className="font-black text-white">Online Store</h3>
                  <p className="text-xs text-gray-500">Dropship + auto-imported products · {publishedCount} items live</p>
                </div>
                <span className="ml-auto text-xs font-bold text-orange-400 bg-orange-400/10 border border-orange-400/20 px-2.5 py-1 rounded-full">This Month</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2">
                <div className="p-5 space-y-3 border-b md:border-b-0 md:border-r border-[#2A2A2A]">
                  {[
                    { label: 'Gross Sales', value: `$${shopRev.toLocaleString()}`, pct: 100, color: '#ea580c' },
                    { label: 'Product Cost (COGS ~60%)', value: `$${Math.round(shopRev * 0.6).toLocaleString()}`, pct: 60, color: '#f59e0b' },
                    { label: 'Platform & Shipping Fees', value: `$${Math.round(shopRev * 0.03).toLocaleString()}`, pct: 3, color: '#8b5cf6' },
                    { label: 'Net Store Profit', value: `$${shopProfit.toLocaleString()}`, pct: 40, color: '#10b981' },
                  ].map(row => (
                    <div key={row.label}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-400">{row.label}</span>
                        <span className="font-bold text-white">{row.value}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-[#2A2A2A]">
                        <div className="h-full rounded-full" style={{ width: `${row.pct}%`, background: row.color }} />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-2 content-start gap-0 divide-x divide-[#2A2A2A] md:divide-x-0">
                  {[
                    { label: 'Orders', value: '47' },
                    { label: 'Avg Order', value: '$273' },
                    { label: 'Return Rate', value: '2.1%' },
                    { label: 'Auto-Published', value: publishedCount.toString() },
                  ].map(s => (
                    <div key={s.label} className="p-5 border-b border-[#2A2A2A]">
                      <p className="text-2xl font-black text-white">{s.value}</p>
                      <p className="text-xs text-gray-500 mt-1">{s.label}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="p-4 border-t border-[#2A2A2A] flex gap-3">
                <button onClick={() => handleNavigate('public-store')}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold text-orange-400 border border-orange-500/30 hover:bg-orange-500/10 transition">
                  View Store <ChevronRight className="w-4 h-4" />
                </button>
                <button onClick={() => handleNavigate('auto-product-pilot')}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold text-white border border-[#2A2A2A] hover:border-orange-500/30 hover:bg-orange-500/5 transition">
                  Auto-Pilot <Zap className="w-4 h-4 text-orange-400" />
                </button>
              </div>
            </div>

            {/* ── QUICK ACCESS TOOLS ────────────────────────────── */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Payment Center', path: 'unified-payment-center', icon: CreditCard, color: '#3b82f6' },
                { label: 'Reconciliation', path: 'financial-reconciliation', icon: Wallet, color: '#10b981' },
                { label: 'Full Reports', path: 'enterprise-reporting', icon: BarChart3, color: '#8b5cf6' },
                { label: 'Investments', path: 'investment-management', icon: TrendingUp, color: '#ea580c' },
              ].map(q => (
                <button key={q.label} onClick={() => handleNavigate(q.path)}
                  className="flex flex-col items-center gap-2 p-4 rounded-2xl border border-[#2A2A2A] hover:border-[#3A3A3A] bg-[#1A1A1A] hover:bg-[#222] transition">
                  <q.icon className="w-6 h-6" style={{ color: q.color }} />
                  <span className="text-xs font-bold text-gray-300">{q.label}</span>
                </button>
              ))}
            </div>

            {/* Investment Details Manager */}
            <div>
              <h3 className="text-lg font-bold text-white mb-4">Investment Details & Financial Documents</h3>
              <InvestmentDetailsManager />
            </div>
          </div>
          );
        })()}

        {/* ADS TAB */}
        {activeTab === 'ads' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">Advertising Performance Dashboard</h2>
              <p className="text-gray-400">Monitor vendor ads, campaigns, and revenue</p>
            </div>
            <AdPerformanceDashboard />
          </div>
        )}

        {/* MODULES TAB - ALL MODULES */}
        {activeTab === 'modules' && (
          <div className="space-y-8">
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">All System Modules</h2>
              <p className="text-gray-400">Quick access to every module in the enterprise system</p>
            </div>
            {moduleCategories.map((category) => {
              const CategoryIcon = category.icon;
              return (
                <div key={category.name}>
                  <div className="flex items-center gap-3 mb-4">
                    <CategoryIcon className="w-6 h-6 text-[#ea580c]" />
                    <h3 className="text-xl font-bold text-white">{category.name}</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                    {category.modules.map((module) => {
                      const ModuleIcon = module.icon;
                      return (
                        <button
                          key={`${module.path}-${module.name}`}
                          onClick={() => handleNavigate(module.path)}
                          className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg p-4 hover:border-[#ea580c]/50 hover:shadow-lg hover:shadow-[#ea580c]/10 transition-all text-left group"
                        >
                          <ModuleIcon className="w-6 h-6 text-[#ea580c] mb-2 group-hover:scale-110 transition-transform" />
                          <div className="text-white font-medium text-sm">{module.name}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* SETTINGS TAB */}
        {activeTab === 'settings' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">System Settings & Configuration</h2>
              <p className="text-gray-400">Global system settings, integrations, and preferences</p>
            </div>

            {/* Database Migration - ONE-TIME SETUP */}
            <DatabaseMigrationTool />

            {/* Data Backup & Restore - CRITICAL */}
            <DataBackupRestore />

            {/* Service Area Settings */}
            <ServiceAreaSettings />

            {/* Supabase Diagnostics */}
            <SupabaseDiagnostics />

            {/* Data Persistence Diagnostics */}
            <DataPersistenceDiagnostics />

            {/* Data Backup & Persistence */}
            <DataBackupControl />

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6">
                <Settings className="w-8 h-8 text-[#ea580c] mb-3" />
                <h3 className="text-white font-bold mb-2">General Settings</h3>
                <p className="text-sm text-gray-400 mb-4">System-wide configurations</p>
                <button className="text-sm text-[#ea580c] hover:text-[#dc2626]">Configure →</button>
              </div>
              <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6">
                <Shield className="w-8 h-8 text-[#ea580c] mb-3" />
                <h3 className="text-white font-bold mb-2">Security Settings</h3>
                <p className="text-sm text-gray-400 mb-4">Authentication & access control</p>
                <button className="text-sm text-[#ea580c] hover:text-[#dc2626]">Configure →</button>
              </div>
              <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6">
                <Database className="w-8 h-8 text-[#ea580c] mb-3" />
                <h3 className="text-white font-bold mb-2">Data Management</h3>
                <p className="text-sm text-gray-400 mb-4">Backup, export, and data tools</p>
                <button className="text-sm text-[#ea580c] hover:text-[#dc2626]">Configure →</button>
              </div>
            </div>
          </div>
        )}

        {/* ACCESS CONTROL TAB */}
        {activeTab === 'access-control' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">Access Control & Permissions</h2>
              <p className="text-gray-400">Review and manage user access requests from all portal users</p>
            </div>
            
            {/* Access Requests Panel - Inline */}
            <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6">
              <div className="flex items-center gap-3 mb-6">
                <Shield className="w-8 h-8 text-[#ea580c]" />
                <div>
                  <h3 className="text-white font-bold text-lg">Portal Access Requests</h3>
                  <p className="text-sm text-gray-400">Approve or deny access requests from customers, vendors, and other portal users</p>
                </div>
              </div>
              
              <AccessRequestPanel />
            </div>
          </div>
        )}
      </div>

      {/* Gift Hours Modal */}
      {showGiftModal && (
        <GiftHoursModal
          isOpen={showGiftModal}
          onClose={() => {
            setShowGiftModal(false);
            setGiftTargetSub(null);
          }}
          targetSubscription={giftTargetSub}
          onSuccess={() => {
            loadSubscriptions();
            setShowGiftModal(false);
            setGiftTargetSub(null);
          }}
          subscriptions={subscriptions}
          userRole="owner"
          userName="Owner"
        />
      )}

      {/* Gift Management Modal */}
      {showGiftManagement && (
        <OwnerGiftManagement
          onClose={() => setShowGiftManagement(false)}
        />
      )}
    </div>
  );
}