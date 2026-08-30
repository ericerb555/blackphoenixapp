/**
 * Unified Dashboard - Responsive Command Center
 * 
 * Automatically switches between desktop (sidebar) and mobile (bottom nav) layouts
 * based on screen size for optimal user experience
 * 
 * Updated: 2026-03-18 - Added mobile/desktop component switching
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
  LayoutGrid, TrendingDown, AlertCircle, Plus, Home, LogIn,
  Camera, CloudRain, Monitor, Key, MapPin, Calculator, Tag, HardHat,
  Star, QrCode, Heart, Share2, ShoppingBag
} from 'lucide-react';
import { toast } from 'sonner';
import { LineChart, Line, AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';
import { isAdminOrHigher } from '../lib/utils/roleUtils';
import AdminAlertsPanel from '../components/AdminAlertsPanel';
import DealPublisher from '../components/DealPublisher';
import MaintenancePlanCreator from '../components/MaintenancePlanCreator';
import TechRosterManager from '../components/TechRosterManager';
import MultiDropshipperManager from '../components/MultiDropshipperManager';
import { ErrorBoundary } from '../components/ErrorBoundary';
import MasterScheduling from './MasterScheduling';
import UnifiedDashboardMobile from './UnifiedDashboardMobile';
import CommandCenterHome from './CommandCenterHome';
import { loadBrandingWithFallback } from '../utils/loadPublicBranding';
import ServerDeploymentGuide from '../components/ServerDeploymentGuide';
import OfflineModeBanner from '../components/OfflineModeBanner';
import { useCompany } from '../contexts/CompanyContext';
import { usePendingApprovals } from '../lib/hooks/usePendingApprovals';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { authedHeaders } from '../utils/authHeaders';
import { useUser } from '../lib/user-context';
import { UserRole } from '../lib/rbac';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { StartQuoteModal } from '../components/quotes/StartQuoteModal';

interface ModuleCard {
  label: string;
  path: string;
  icon: any;
  color: string;
  tab?: string;
  description?: string;
  badge?: string;
}

interface TabCategory {
  id: string;
  label: string;
  icon: any;
  modules: ModuleCard[];
}

export default function UnifiedDashboard({ onNavigate }: { onNavigate?: (page: string) => void }) {
  // `useUser` supports the view-only RoleSwitcher preview. Never let that
  // browser-only preview override the authenticated Supabase owner identity.
  const { user } = useUser();
  const { user: authUser, isOwner: authIsOwner, loading: authLoading } = useAuth();
  const authRole = String(authUser?.app_metadata?.role || authUser?.user_metadata?.role || authUser?.user_metadata?.accountType || '').toLowerCase().replace(/[\s-]+/g, '_');
  const isAuthenticatedOwner = authIsOwner || ['owner', 'platform_owner', 'business_owner', 'admin', 'master_admin', 'management'].includes(authRole) || String(authUser?.email || '').toLowerCase() === 'ericerb555@proton.me';

  // Sticky owner flag. The Supabase session can momentarily be null while it
  // rehydrates on load or after switching tabs. Without this, `currentRole`
  // flips to CUSTOMER for a beat, which used to (1) hide every owner-only
  // sidebar button (e.g. "Owner Dashboard" vanishing) and (2) fire the
  // full-screen black "Redirecting to your portal…" guard + a hard
  // window.location.replace — the "command center goes black" symptom.
  // Once we've confirmed the owner, we remember it and keep treating them as
  // owner until a *resolved* non-owner session proves otherwise.
  const rememberedOwner = typeof window !== 'undefined' && window.localStorage.getItem('bpc_is_owner') === '1';
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (isAuthenticatedOwner) {
      window.localStorage.setItem('bpc_is_owner', '1');
    } else if (authUser && !authLoading) {
      // A real, fully-resolved session that is NOT an owner → clear the flag.
      window.localStorage.removeItem('bpc_is_owner');
    }
  }, [isAuthenticatedOwner, authUser, authLoading]);

  // Treat as owner if confirmed now, or if we previously confirmed it. The
  // sticky flag is only cleared once a *fully-resolved* non-owner session
  // proves otherwise (see the effect above), so trusting it directly closes
  // the gap where authUser has loaded but its role field hasn't yet — the
  // window where the "Owner Dashboard" button would vanish or a click on it
  // would land on nothing.
  const treatAsOwner = isAuthenticatedOwner || rememberedOwner;
  const currentRole = treatAsOwner ? UserRole.PLATFORM_OWNER : (user?.role || UserRole.CUSTOMER);

  // ALL state hooks must be called before any conditional returns
  const [searchQuery, setSearchQuery] = useState('');
  // The search box starts read-only so Chrome/Opera password managers can't
  // autofill the saved sign-in email into it on load (which was filtering the
  // module grid to empty and hiding the Command Center). It becomes editable
  // the moment the user actually focuses it.
  const [searchReadOnly, setSearchReadOnly] = useState(true);
  const [activeTab, setActiveTab] = useState('operations');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Two figures the summary already returns that the old layout never read.
  // Both feed the new command center: what is owed, and what is waiting.
  const [openInvoiceTotal, setOpenInvoiceTotal] = useState(0);
  const [pendingWorkRequests, setPendingWorkRequests] = useState(0);

  /**
   * Escape hatch to the previous layout. `?classic=1` switches to it and is
   * remembered; `?classic=0` comes back. Read once on mount so a re-render
   * cannot flip the layout underneath somebody mid-task.
   */
  const [classicLayout] = useState(() => {
    try {
      const param = new URLSearchParams(window.location.search).get('classic');
      if (param === '1') { localStorage.setItem('command_center_classic', '1'); return true; }
      if (param === '0') { localStorage.removeItem('command_center_classic'); return false; }
      return localStorage.getItem('command_center_classic') === '1';
    } catch { return false; }
  });
  const [isMobile, setIsMobile] = useState(false);
  const [forceMobileView, setForceMobileView] = useState(false);
  const [companyLogo, setCompanyLogo] = useState<string | null>(null);
  /**
   * The company's own name, never a placeholder.
   *
   * This said "Your Company" at the top of the command centre, which is a
   * stand-in that reads as somebody else's product. It came from
   * `/business-profiles`, and there are no business profile records in this
   * project at all — so the placeholder was not a brief flash before the real
   * name arrived, it was permanent.
   *
   * The landing page has had this right all along through
   * `loadBrandingWithFallback`, which tries the server, then localStorage, and
   * refuses a base64 logo that would not survive being shown on another device.
   * Using the same loader here means one answer to "whose app is this" rather
   * than two, and the fallback is the real company rather than a blank.
   */
  const [companyName, setCompanyName] = useState('The Black Phoenix Company');
  const [showAdminAlerts, setShowAdminAlerts] = useState(false);
  const [alertCount, setAlertCount] = useState(8);
  const [showMasterSchedule, setShowMasterSchedule] = useState(false);
  const [showStartQuote, setShowStartQuote] = useState(false);
  const [serverDeployed, setServerDeployed] = useState<boolean | null>(null);
  const [zendropStatus, setZendropStatus] = useState<{ connected: boolean; products: number } | null>(null);

  // Metrics state - MUST be here before any conditional returns
  const [revenueData, setRevenueData] = useState<any[]>([]);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [revenueTrend, setRevenueTrend] = useState(0);
  const [activeJobsCount, setActiveJobsCount] = useState(0);
  const [jobsTrend, setJobsTrend] = useState(0);
  const [customersCount, setCustomersCount] = useState(0);
  const [customersTrend, setCustomersTrend] = useState(0);
  const [teamCount, setTeamCount] = useState(0);

  // Get company context
  const companyContext = useCompany();

  // Get pending approvals count - auto-refreshes every 30 seconds
  const { total: pendingApprovalsCount, loading: approvalsLoading } = usePendingApprovals(30000);

  // CRITICAL: Redirect unauthenticated users to login
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const currentUserProfile = localStorage.getItem('currentUserProfile');

      if (!session && !currentUserProfile) {
        console.log('🚨 [UnifiedDashboard] No authenticated user detected - redirecting to login');
        toast.error('Please log in to access the dashboard');
        window.location.href = '/login';
      }
    };
    checkAuth();
  }, []);

  // Metrics start at zero and are replaced with real values from the server.
  useEffect(() => {
    setRevenueData([]);
    setTotalRevenue(0);
    setRevenueTrend(0);
    setActiveJobsCount(0);
    setJobsTrend(0);
    setCustomersCount(0);
    setCustomersTrend(0);
    setTeamCount(0);
  }, []);

  // Fetch company branding
  useEffect(() => {
    const fetchCompanyBranding = async () => {
      try {
        const API_BASE = `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6`;
        const response = await fetch(`${API_BASE}/business-profiles`, {
          headers: await authedHeaders()
        });

        if (response.ok) {
          const profiles = await response.json();
          if (profiles && profiles.length > 0) {
            const profile = profiles[0];
            if (profile.name) setCompanyName(profile.name);
            if (profile.logo) setCompanyLogo(profile.logo);
          }
        }
      } catch (error) {
        // Silently fail and use defaults
      }

      // Then the loader the landing page uses, which reaches the branding the
      // business-profiles route does not. Only ever overwrites with something
      // real, so a missing branding record cannot blank out a name that the
      // first call already found.
      try {
        const branding = await loadBrandingWithFallback();
        const name = branding?.company_name;
        const logo = branding?.logo_url || branding?.logo_primary || branding?.logoPrimary;
        if (name) setCompanyName(name);
        if (logo) setCompanyLogo(logo);
      } catch { /* the defaults are the real company, so this is survivable */ }
    };

    fetchCompanyBranding();
  }, []);

  // Live Zendrop connection status for the dropshipping sidebar button.
  useEffect(() => {
    const fetchZendropStatus = async () => {
      try {
        const API_BASE = `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6`;
        const res = await fetch(`${API_BASE}/zendrop/status`, {
          headers: await authedHeaders(),
        });
        if (!res.ok) { setZendropStatus({ connected: false, products: 0 }); return; }
        const data = await res.json().catch(() => ({}));
        setZendropStatus({
          connected: !!data.connected,
          products: Number(data.productsInStore ?? data.productCount ?? 0),
        });
      } catch {
        setZendropStatus({ connected: false, products: 0 });
      }
    };
    fetchZendropStatus();
  }, []);

  // Command Center metrics are calculated from canonical invoices, payments,
  // applications, CRM contacts, and work requests—not browser demo data.
  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) return;
        const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6/command-center/summary`, { headers: { Authorization: `Bearer ${session.access_token}` } });
        const result = await response.json();
        if (!response.ok || !result.success) throw new Error(result.error || 'Unable to load Command Center metrics.');
        const summary = result.summary;
        setRevenueData(summary.chartData || []); setTotalRevenue(Number(summary.totalRevenue || 0));
        setActiveJobsCount(Number(summary.activeJobsCount || 0)); setCustomersCount(Number(summary.customersCount || 0)); setTeamCount(Number(summary.teamCount || 0));
        setOpenInvoiceTotal(Number(summary.openInvoiceTotal || 0)); setPendingWorkRequests(Number(summary.pendingWorkRequests || 0));
        setRevenueTrend(0); setJobsTrend(0); setCustomersTrend(0);
      } catch (error) { console.error('[Dashboard] Error fetching Command Center metrics:', error); }
    };
    fetchMetrics(); const interval = setInterval(fetchMetrics, 60000); return () => clearInterval(interval);
  }, []);

  // Restore sidebar preference
  useEffect(() => {
    const savedState = localStorage.getItem('unified-dashboard-sidebar');
    if (savedState) {
      setSidebarCollapsed(savedState === 'collapsed');
    }
  }, []);

  // Check server deployment status
  useEffect(() => {
    // DISABLED: Health check removed to prevent console 404 spam
    // Assume offline mode
    setServerDeployed(false);
    console.log('⚠️ Server check disabled, working in offline mode');
  }, []);

  // Detect screen size and set mobile state
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Redirect non-owners only after their real session is available. An owner
  // always stays in the Command Center even when a stale local preview role exists.
  useEffect(() => {
    // Never redirect while the session is still resolving, or if we still
    // consider them an owner — otherwise a transient session gap kicks the
    // owner out of the Command Center with a hard reload (the "black screen").
    if (authLoading) return;
    if (treatAsOwner) return;
    if (!authUser && !user) return;

    // Define portal routes for each role
    const portalRoutes: Partial<Record<UserRole, string>> = {
      [UserRole.PLATFORM_OWNER]: '/unified-dashboard',
      [UserRole.ADMIN]: '/admin-portal',
      [UserRole.TERRITORY_ADMIN]: '/territory-admin-portal',
      [UserRole.VENDOR]: '/vendor-portal',
      [UserRole.ADVERTISER]: '/advertiser-portal',
      [UserRole.SUBCONTRACTOR]: '/subcontractor-portal',
      [UserRole.CUSTOMER]: '/customer-portal-app',
      [UserRole.EMPLOYEE]: '/employee-portal',
      [UserRole.INVESTOR]: '/investor-portal',
      [UserRole.PROPERTY_MANAGER]: '/property-manager-portal',
      [UserRole.CONDO_MANAGER]: '/condo-manager-portal',
      [UserRole.LANDLORD]: '/landlord-portal',
    };

    const targetRoute = portalRoutes[currentRole];
    const currentPath = window.location.pathname;

    // If current role's portal doesn't match current page, redirect
    if (targetRoute && currentPath !== targetRoute) {
      console.log(`🔀 Role changed to ${currentRole}, redirecting from ${currentPath} to ${targetRoute}`);
      // Use replace to avoid back button issues
      window.location.replace(targetRoute);
    }
  }, [authUser, currentRole, treatAsOwner, authLoading, user]);

  // Generate mock revenue data
  const generateMockRevenueData = () => {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    return days.map((day, i) => ({
      day,
      revenue: 30000 + Math.random() * 15000 + (i * 2000)
    }));
  };

  // While the Supabase session is still rehydrating, show a neutral loader
  // instead of the "Redirecting…" screen — we don't yet know if this is an
  // owner, and bailing out here is exactly what made the Command Center go
  // black on owners whose session hadn't finished loading.
  if (authLoading && !treatAsOwner) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#2A2A2A] border-t-orange-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white">Loading your Command Center…</p>
        </div>
      </div>
    );
  }

  // Only redirect once auth has fully resolved and they are genuinely not an owner.
  if (currentRole !== UserRole.PLATFORM_OWNER) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#2A2A2A] border-t-orange-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white">Redirecting to your portal...</p>
        </div>
      </div>
    );
  }

  const handleNavigation = (path: string, tab?: string) => {
    try {
      console.log('🔵 handleNavigation called');
      console.log('🔵 Input path:', path);
      console.log('🔵 Input tab:', tab);

      // Ensure path always starts with /
      const normalizedPath = path.startsWith('/') ? path : `/${path}`;
      const url = tab ? `${normalizedPath}?tab=${tab}` : normalizedPath;
      console.log('🚀 Navigating to:', url);
      console.log('📍 Current path:', window.location.pathname);
      console.log('🎯 Target path:', normalizedPath);

      if (window.location.pathname === normalizedPath && !tab) {
        console.log('⚠️ Already on this page, skipping navigation');
        return;
      }

      console.log('✅ Executing navigation to:', url);

      // Prefer in-app SPA navigation. A full `window.location.href` reload
      // re-downloads the bundle and lazy-loads the target chunk fresh; if that
      // chunk's hash is stale (right after a deploy) or the Supabase session is
      // still rehydrating, the app gets stuck on the dark loading/blank screen —
      // which is the "goes black on any button" symptom. SPA navigation reuses
      // the already-running build (no hash mismatch) and renders inside the
      // existing ErrorBoundary/Suspense, so any page error is visible instead.
      const spaNavigate = (window as any).__navigateApp;
      if (typeof spaNavigate === 'function') {
        // navigate() strips a leading slash and handles the ?tab= query itself.
        spaNavigate(url.startsWith('/') ? url.slice(1) : url);
        console.log('✅ SPA navigation dispatched');
        return;
      }

      // Fallback: hard navigation if the SPA navigator isn't available.
      window.location.href = url;
      console.log('✅ Navigation command executed (hard nav fallback)');
    } catch (error) {
      console.error('❌ Navigation error:', error);
      toast.error(`Navigation error: ${error}`);
    }
  };

  // Save sidebar preference
  const toggleSidebar = () => {
    const newState = !sidebarCollapsed;
    setSidebarCollapsed(newState);
    localStorage.setItem('unified-dashboard-sidebar', newState ? 'collapsed' : 'expanded');
  };

  // Tab categories with modules
  const tabCategories: TabCategory[] = [
    {
      id: 'operations',
      label: 'Operations',
      icon: Briefcase,
      modules: [
        { label: 'eCommerce Store', path: '/enterprise-content-center', tab: 'ecommerce', icon: Store, color: 'orange', description: 'All store tools in one place — catalog, suppliers, orders, pricing & insights', badge: 'HUB' },
        { label: 'Active Jobs', path: '/job-tracking-hub', tab: 'active-jobs', icon: Briefcase, color: 'orange', description: 'Track active jobs and statuses' },
        { label: 'Projects', path: '/projects-new', icon: Building2, color: 'blue', description: 'Project management and tracking' },
        { label: 'Phoenix Exchange', path: '/bid-room', icon: Target, color: 'amber', description: 'Quick access to bidding center', badge: 'QUICK' },
        { label: 'Job Financials', path: '/job-tracking-hub', tab: 'job-financial', icon: DollarSign, color: 'green', description: 'Job costs and budgets' },
        { label: 'Master Schedule', path: '/job-tracking-hub', tab: 'master-schedule', icon: Calendar, color: 'purple', description: 'Company-wide scheduling' },
        { label: 'Service Schedule', path: '/job-tracking-hub', tab: 'service-schedule', icon: Clock, color: 'cyan', description: 'Service appointments' },
        { label: 'Change Orders', path: '/job-tracking-hub', tab: 'change-orders', icon: Edit2, color: 'yellow', description: 'Project change management' },
        { label: 'Change Order Camera', path: '/change-order-camera', icon: Camera, color: 'purple', description: 'Photo documentation app', badge: 'NEW' },
        { label: 'Weather Monitor', path: '/job-tracking-hub', tab: 'weather', icon: Cloud, color: 'blue', description: 'Real-time weather tracking' },
        { label: 'Weather Monitor (Standalone)', path: '/weather-job-site-monitor', icon: CloudRain, color: 'sky', description: 'Advanced weather tracking', badge: 'NEW' },
        { label: 'Work Request Intake', path: '/work-request-intake', icon: FileText, color: 'cyan', description: 'Customer work requests' },
        { label: 'Work Request Tracking', path: '/work-request-tracking', icon: ClipboardList, color: 'orange', description: 'Track all requests' },
        { label: 'Mobile App Hub', path: '/mobile-app-hub', icon: Smartphone, color: 'indigo', description: 'Mobile workforce management', badge: 'HOT' },
        { label: 'Materials Center', path: '/materials-center', icon: Package, color: 'blue', description: 'Search, manage & procure materials', badge: 'NEW' },
        { label: 'Purchase Orders', path: '/materials-center', tab: 'procurement', icon: Receipt, color: 'green', description: 'PO management' },
        { label: 'Supplier Connect', path: '/supplier-management-hub', tab: 'connect', icon: Truck, color: 'purple', description: 'Supplier relationships' },
        { label: 'Unified Calendar', path: '/unified-calendar', icon: Calendar, color: 'green', description: 'Company calendar' },
        { label: 'Service Scheduling', path: '/service-scheduling', icon: Clock, color: 'blue', description: 'Book & schedule services — the single booking system' },
        { label: 'Waste Disposal', path: '/waste-disposal-tracking', icon: Truck, color: 'red', description: 'Waste tracking' },
        { label: 'AI Diagnostics', path: '/ai-diagnostics', icon: Brain, color: 'purple', description: 'AI-powered diagnostics' },
      ]
    },
    {
      id: 'financial',
      label: 'Financial',
      icon: DollarSign,
      modules: [
        { label: 'Payment Dashboard', path: '/revenue-monetization-hub', tab: 'payments', icon: Wallet, color: 'green', description: 'Payment overview' },
        { label: 'Payment Center', path: '/payment-center', icon: Receipt, color: 'emerald', description: 'Process payments' },
        { label: 'Subscriptions Overview', path: '/subscription-hub', tab: 'overview', icon: Crown, color: 'purple', description: 'All subscriptions' },
        { label: 'Customer Subscriptions', path: '/subscription-hub', tab: 'customer-subs', icon: Users, color: 'blue', description: 'Customer plans' },
        { label: 'Vendor Subscriptions', path: '/subscription-hub', tab: 'vendor-subs', icon: Store, color: 'green', description: 'Vendor memberships' },
        { label: 'Advertising Hub', path: '/revenue-monetization-hub', tab: 'advertising', icon: Megaphone, color: 'fuchsia', description: 'Ad campaigns' },
        { label: 'Vendors Admin Hub', path: '/vendors-admin-hub', icon: Building2, color: 'purple', description: 'Vendor management & API integrations', badge: 'NEW' },
        { label: 'Vendor Ops', path: '/revenue-monetization-hub', tab: 'vendor-ops', icon: ShoppingCart, color: 'rose', description: 'Vendor operations' },
        { label: 'Subcontractor Ops', path: '/revenue-monetization-hub', tab: 'subcontractor-ops', icon: Wrench, color: 'orange', description: 'Sub management' },
        { label: 'Coupons & Promos', path: '/revenue-monetization-hub', tab: 'promotions', icon: Gift, color: 'pink', description: 'Promotional offers' },
        { label: 'Referrals', path: '/revenue-monetization-hub', tab: 'referrals', icon: Award, color: 'yellow', description: 'Referral program' },
        { label: 'Financial Recon', path: '/financial-reconciliation', icon: DollarSign, color: 'teal', description: 'Financial reconciliation' },
        { label: 'Completion Reports', path: '/completion-reports', icon: FileText, color: 'emerald', description: 'Final work order breakdowns', badge: 'NEW' },
        { label: 'Invoices', path: '/invoices-new', icon: Receipt, color: 'green', description: 'Invoice management' },
        { label: 'Quotes & Estimates', path: '/estimates', icon: FileText, color: 'purple', description: 'Create quotes (no customer needed) & assign later', badge: 'NEW' },
        { label: 'Public Store', path: '/public-store', icon: Store, color: 'cyan', description: 'Online storefront' },
        { label: 'Hour Banking', path: '/subscription-hub', tab: 'hour-banking', icon: Clock, color: 'cyan', description: 'Hour credits' },
        { label: 'Gift Cards', path: '/subscription-hub', tab: 'gift-cards', icon: Gift, color: 'pink', description: 'Gift card sales' },
        { label: 'Subscription Analytics', path: '/subscription-hub', tab: 'analytics', icon: TrendingUp, color: 'emerald', description: 'Revenue analytics' },
        { label: 'Investment Management', path: 'investment-management', icon: TrendingUp, color: 'orange', description: 'Manage investment opportunities & funding', badge: 'NEW' },
        { label: 'Investment Calculator', path: 'investment-calculator', icon: Calculator, color: 'indigo', description: 'Calculate investment returns & profit distribution', badge: 'NEW' },
        { label: 'Customer Documents', path: 'customer-docs', icon: FileText, color: 'blue', description: 'View all customer documents (Admin+)', badge: 'NEW' },
        { label: 'Admin Portal', path: 'admin-portal', icon: Shield, color: 'red', description: 'Platform owner dashboard with alerts & support', badge: 'NEW' },
        { label: 'Territory Portal', path: 'territory-portal', icon: MapPin, color: 'purple', description: 'Territory admin dashboard', badge: 'NEW' },
      ]
    },
    {
      id: 'people',
      label: 'People',
      icon: Users,
      modules: [
        { label: 'Property Management Hub', path: '/property-management-hub', icon: Key, color: 'orange', description: 'Manage condo, landlord & property manager work requests with approval workflows', badge: 'NEW' },
        { label: 'Customer Directory', path: '/customer-management-hub', tab: 'directory', icon: Users, color: 'blue', description: 'Customer database' },
        { label: 'Customer Registration', path: '/customer-management-hub', tab: 'registration', icon: UserCheck, color: 'green', description: 'New customers' },
        { label: 'Customer Detail', path: '/customer-management-hub', tab: 'detail', icon: Eye, color: 'purple', description: 'Customer profiles' },
        { label: 'Employee Directory', path: '/hr-employee-hub', tab: 'directory', icon: Users, color: 'indigo', description: 'Team roster' },
        { label: 'Mobile App', path: '/hr-employee-hub', tab: 'mobile', icon: Smartphone, color: 'purple', description: 'Mobile workforce' },
        { label: 'HR Dashboard', path: '/hr-employee-hub', tab: 'hr-dashboard', icon: UserCheck, color: 'violet', description: 'HR overview' },
        { label: 'Payroll', path: '/hr-employee-hub', tab: 'payroll', icon: DollarSign, color: 'green', description: 'Payroll processing' },
      ]
    },
    {
      id: 'marketing',
      label: 'Marketing',
      icon: Megaphone,
      modules: [
        { label: 'Quote Prep', path: '/quote-prep', icon: FileText, color: 'cyan', description: 'Prepare quotes' },
        { label: 'Quote Responses', path: '/quote-response-hub', tab: 'responses', icon: MessageSquare, color: 'blue', description: 'Quote tracking' },
        { label: 'Quote Workflow', path: '/enterprise-quote-workflow', icon: ChevronRight, color: 'purple', description: 'Quote automation' },
        { label: 'Unified Project Pipeline', path: '/unified-project-pipeline', icon: TrendingUp, color: 'orange', description: 'Work Request → Quote → Contract workflow', badge: 'NEW' },
        { label: 'Work Order Management', path: '/work-order-management', icon: ClipboardList, color: 'blue', description: 'Manage work requests & orders from intake to completion', badge: 'NEW' },
        { label: 'Application Submissions', path: '/application-submissions', icon: ClipboardList, color: 'orange', description: 'Applications' },
        { label: 'Marketing Hub', path: '/revenue-monetization-hub', tab: 'marketing', icon: Megaphone, color: 'fuchsia', description: 'Marketing central' },
        { label: 'Social Media', path: '/social-media', icon: Globe, color: 'blue', description: 'Social channels' },
        { label: 'Content Center', path: '/enterprise-content-center', icon: FileText, color: 'purple', description: 'Content management' },
        { label: 'Design Center', path: '/design-center', icon: Palette, color: 'pink', description: 'All design — structural, studio & renderings' },
        { label: 'Work Request Form Editor', path: '/work-request-form-editor', icon: Edit2, color: 'orange', description: 'Custom form builder', badge: 'NEW' },
        { label: 'Portals Hub', path: '/portals-hub', icon: Monitor, color: 'orange', description: 'Create, edit & manage portals', badge: 'NEW' },
        { label: 'Directory Landing Page', path: '/directory-landing-page', icon: LayoutGrid, color: 'orange', description: 'New directory-style landing page', badge: 'NEW' },
      ]
    },
    {
      id: 'deals',
      label: 'Deal Publisher',
      icon: Tag,
      modules: [],
    },
    {
      id: 'plan-creator',
      label: 'Plan Creator',
      icon: Clock,
      modules: [],
    },
    {
      id: 'tech-roster',
      label: 'Tech Roster',
      icon: HardHat,
      modules: [],
    },
    {
      id: 'dropshippers',
      label: 'Dropshippers',
      icon: Package,
      modules: [],
    },
    {
      id: 'systems',
      label: 'Systems',
      icon: Settings,
      modules: [
        { label: 'CRM Hub', path: '/unified-crm', icon: Users, color: 'blue', description: 'Search all contacts, manage groups, email & message', badge: 'NEW' },
        { label: 'Cohort Management', path: 'cohort-management', icon: Layers, color: 'purple', description: 'Advanced cohort & subscription management', badge: 'DIRECT' },
        { label: 'User Management', path: 'user-management', icon: Users, color: 'cyan', description: 'User accounts' },
        { label: 'Role Management', path: 'role-management', icon: Shield, color: 'red', description: 'Access control' },
        { label: 'Module Manager', path: '/module-manager', icon: Layers, color: 'purple', description: 'System modules' },
        { label: 'Module Access', path: '/module-access-control', icon: UserCheck, color: 'green', description: 'Module permissions' },
        { label: 'Admin Alerts', path: '/admin-alerts', icon: Bell, color: 'red', description: 'System alerts' },
        { label: 'Messaging', path: '/messaging', icon: MessageSquare, color: 'cyan', description: 'Internal messaging' },
        { label: 'Email Management', path: '/enterprise-email', icon: Mail, color: 'teal', description: 'Email system' },
        { label: 'Reports', path: '/reports', icon: BarChart3, color: 'amber', description: 'Reporting tools' },
        { label: 'Enterprise Reporting', path: '/enterprise-reporting', icon: TrendingUp, color: 'green', description: 'Advanced analytics' },
        { label: 'On-Call Portal', path: '/on-call-portal', icon: Bell, color: 'red', description: 'On-call management' },
        { label: 'Code Tracker', path: '/code-tracker', icon: Code, color: 'purple', description: 'Track work request → payment workflow', badge: 'NEW' },
        { label: 'Portal Global Settings', path: '/portal-global-settings', icon: Layers, color: 'purple', description: 'Global portal config' },
      ]
    }
  ];

  // Filter modules based on search
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

  // Get icon color class
  const getIconColorClass = (color: string) => {
    const colorMap: { [key: string]: string } = {
      orange: 'text-orange-400',
      green: 'text-green-400',
      blue: 'text-blue-400',
      cyan: 'text-cyan-400',
      purple: 'text-purple-400',
      pink: 'text-pink-400',
      amber: 'text-amber-400',
      yellow: 'text-yellow-400',
      red: 'text-red-400',
      violet: 'text-violet-400',
      fuchsia: 'text-fuchsia-400',
      indigo: 'text-indigo-400',
      teal: 'text-teal-400',
      emerald: 'text-emerald-400',
      rose: 'text-rose-400',
      zinc: 'text-zinc-400',
      slate: 'text-slate-400',
    };
    return colorMap[color] || 'text-orange-400';
  };

  const getGlowColorClass = (color: string) => {
    const colorMap: { [key: string]: string } = {
      orange: 'shadow-orange-500/50',
      green: 'shadow-green-500/50',
      blue: 'shadow-blue-500/50',
      cyan: 'shadow-cyan-500/50',
      purple: 'shadow-purple-500/50',
      pink: 'shadow-pink-500/50',
      amber: 'shadow-amber-500/50',
      yellow: 'shadow-yellow-500/50',
      red: 'shadow-red-500/50',
      violet: 'shadow-violet-500/50',
      fuchsia: 'shadow-fuchsia-500/50',
      indigo: 'shadow-indigo-500/50',
      teal: 'shadow-teal-500/50',
      emerald: 'shadow-emerald-500/50',
      rose: 'shadow-rose-500/50',
      zinc: 'shadow-zinc-500/50',
      slate: 'shadow-slate-500/50',
    };
    return colorMap[color] || 'shadow-orange-500/50';
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
    if (trend > 0) return <ArrowUpRight className="w-4 h-4" />;
    if (trend < 0) return <ArrowDownRight className="w-4 h-4" />;
    return <Minus className="w-4 h-4" />;
  };

  const getTrendColor = (trend: number) => {
    if (trend > 0) return 'text-green-400';
    if (trend < 0) return 'text-red-400';
    return 'text-gray-400';
  };

  // If mobile, render mobile component
  if (isMobile || forceMobileView) {
    return (
      <UnifiedDashboardMobile
        tabCategories={tabCategories}
        companyName={companyName}
        companyLogo={companyLogo}
        companyLogo={companyLogo}
        totalRevenue={totalRevenue}
        revenueTrend={revenueTrend}
        activeJobsCount={activeJobsCount}
        jobsTrend={jobsTrend}
        customersCount={customersCount}
        customersTrend={customersTrend}
        teamCount={teamCount}
      />
    );
  }

  /**
   * Desktop: the rebuilt command center.
   *
   * The old layout below is kept rather than deleted, reachable with
   * `?classic=1` (which is remembered afterwards, and cleared with
   * `?classic=0`). Two reasons. It is a large screen to replace in one go and
   * an instant way back costs nothing; and it means a problem found in the new
   * one does not need a deploy to escape from.
   */
  if (!classicLayout) {
    return (
      <CommandCenterHome
        tabCategories={tabCategories}
        companyName={companyName}
        companyLogo={companyLogo}
        onNavigate={handleNavigation}
        summary={{
          totalRevenue,
          openInvoiceTotal,
          activeJobsCount,
          customersCount,
          teamCount,
          pendingWorkRequests,
          chartData: revenueData,
        }}
      />
    );
  }

  // Desktop layout — the previous command center, kept behind ?classic=1
  return (
    <div className="min-h-screen bg-[#0A0A0A] flex">
      {/* Collapsible Sidebar */}
      <div 
        className={`${
          sidebarCollapsed ? 'w-16' : 'w-[280px]'
        } bg-[#0F0F0F] border-r border-[#2A2A2A] flex flex-col transition-all duration-300 flex-shrink-0`}
      >
        {/* Sidebar Header */}
        <div className="p-4 border-b border-[#2A2A2A]">
          <div className="flex items-center justify-between">
            {!sidebarCollapsed && (
              <div className="flex items-center gap-3">
                {companyLogo ? (
                  <img src={companyLogo} alt={companyName} className="w-10 h-10 rounded-lg object-cover" />
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-600 to-orange-700 flex items-center justify-center">
                    <Building2 className="w-6 h-6 text-white" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h2 className="text-sm font-bold text-white truncate">{companyName}</h2>
                  <p className="text-sm text-gray-500">Command Center</p>
                </div>
              </div>
            )}
            <button
              onClick={toggleSidebar}
              className="p-2 hover:bg-[#1A1A1A] rounded-lg transition-colors"
            >
              {sidebarCollapsed ? (
                <ChevronRight className="w-4 h-4 text-gray-400" />
              ) : (
                <ChevronLeft className="w-4 h-4 text-gray-400" />
              )}
            </button>
          </div>
        </div>

        {/* Metrics */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Revenue Metric */}
          <div className={`${
            sidebarCollapsed ? 'p-3' : 'p-4'
          } bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl hover:border-green-500/30 transition-all duration-300`}>
            {sidebarCollapsed ? (
              <div className="flex flex-col items-center">
                <DollarSign className="w-6 h-6 text-green-400 mb-1" />
                <span className="text-sm text-gray-400">$245K</span>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center">
                      <DollarSign className="w-4 h-4 text-green-400" />
                    </div>
                    <span className="text-sm text-gray-400">Total Revenue</span>
                  </div>
                  <div className={`flex items-center gap-1 text-sm ${getTrendColor(revenueTrend)}`}>
                    {getTrendIcon(revenueTrend)}
                    <span>{Math.abs(revenueTrend)}%</span>
                  </div>
                </div>
                <div className="text-xl font-bold text-white mb-3">{formatCurrency(totalRevenue)}</div>
                {revenueData.length > 0 && (
                  <div style={{ width: '100%', height: '48px' }}>
                    <ResponsiveContainer width="100%" height={48}>
                      <AreaChart data={revenueData}>
                        <defs>
                          <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#22c55e" stopOpacity={0.3}/>
                            <stop offset="100%" stopColor="#22c55e" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <Area 
                          type="monotone" 
                          dataKey="revenue" 
                          stroke="#22c55e" 
                          strokeWidth={2}
                          fill="url(#revenueGradient)" 
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )}
                <div className="text-sm text-gray-500 mt-2">Last 7 days</div>
              </>
            )}
          </div>

          {/* Active Jobs Metric */}
          <div className={`${
            sidebarCollapsed ? 'p-3' : 'p-4'
          } bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl hover:border-orange-500/30 transition-all duration-300`}>
            {sidebarCollapsed ? (
              <div className="flex flex-col items-center">
                <Briefcase className="w-6 h-6 text-orange-400 mb-1" />
                <span className="text-sm text-gray-400">{activeJobsCount}</span>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center">
                      <Briefcase className="w-4 h-4 text-orange-400" />
                    </div>
                    <span className="text-sm text-gray-400">Active Jobs</span>
                  </div>
                  <div className={`flex items-center gap-1 text-sm ${getTrendColor(jobsTrend)}`}>
                    {getTrendIcon(jobsTrend)}
                    <span>{Math.abs(jobsTrend)}%</span>
                  </div>
                </div>
                <div className="text-3xl font-bold text-white">{activeJobsCount}</div>
                <div className="text-sm text-gray-500 mt-2">In progress</div>
              </>
            )}
          </div>

          {/* Customers Metric */}
          <div className={`${
            sidebarCollapsed ? 'p-3' : 'p-4'
          } bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl hover:border-blue-500/30 transition-all duration-300`}>
            {sidebarCollapsed ? (
              <div className="flex flex-col items-center">
                <Users className="w-6 h-6 text-blue-400 mb-1" />
                <span className="text-sm text-gray-400">{customersCount}</span>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                      <Users className="w-4 h-4 text-blue-400" />
                    </div>
                    <span className="text-sm text-gray-400">Total Customers</span>
                  </div>
                  <div className={`flex items-center gap-1 text-sm ${getTrendColor(customersTrend)}`}>
                    {getTrendIcon(customersTrend)}
                    <span>{Math.abs(customersTrend)}%</span>
                  </div>
                </div>
                <div className="text-3xl font-bold text-white">{customersCount}</div>
                <div className="text-sm text-gray-500 mt-2">Active accounts</div>
              </>
            )}
          </div>

          {/* Team Members Metric */}
          <div className={`${
            sidebarCollapsed ? 'p-3' : 'p-4'
          } bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl hover:border-purple-500/30 transition-all duration-300`}>
            {sidebarCollapsed ? (
              <div className="flex flex-col items-center">
                <UserCheck className="w-6 h-6 text-purple-400 mb-1" />
                <span className="text-sm text-gray-400">{teamCount}</span>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
                    <UserCheck className="w-4 h-4 text-purple-400" />
                  </div>
                  <span className="text-sm text-gray-400">Team Members</span>
                </div>
                <div className="text-3xl font-bold text-white">{teamCount}</div>
                <div className="text-sm text-gray-500 mt-2">Employees</div>
              </>
            )}
          </div>

          {/* Admin Alerts Button - Only for Admins */}
          {isAdminOrHigher() && (
            <button
              onClick={() => setShowAdminAlerts(!showAdminAlerts)}
              className={`relative w-full p-4 rounded-xl border transition-all duration-300 ${
                showAdminAlerts
                  ? 'bg-red-600/20 border-red-500/50 shadow-lg shadow-red-500/30'
                  : 'bg-[#1A1A1A] border-[#2A2A2A] hover:border-red-500/50 hover:bg-red-600/10'
              }`}
            >
              {sidebarCollapsed ? (
                <div className="flex flex-col items-center">
                  <div className="relative">
                    <Bell className="w-6 h-6 text-red-400" />
                    {alertCount > 0 && (
                      <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                    )}
                  </div>
                  <span className="text-sm text-red-400 mt-1">{alertCount}</span>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="relative w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center">
                        <Bell className="w-5 h-5 text-red-400" />
                        {alertCount > 0 && (
                          <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                            <span className="text-white text-sm font-bold animate-pulse">{alertCount}</span>
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white">Admin Alerts</p>
                        <p className="text-sm text-gray-400">{alertCount} pending</p>
                      </div>
                    </div>
                    <ChevronRight className={`w-5 h-5 text-red-400 transition-transform duration-300 ${
                      showAdminAlerts ? 'rotate-90' : ''
                    }`} />
                  </div>
                </>
              )}
            </button>
          )}

          {/* Investment Management Button - Owner Only */}
          {currentRole === UserRole.PLATFORM_OWNER && (
            <button
              onClick={() => handleNavigation('/investment-management')}
              className="relative w-full p-4 rounded-xl border transition-all duration-300 bg-[#1A1A1A] border-[#2A2A2A] hover:border-orange-500/50 hover:bg-orange-600/10"
            >
              {sidebarCollapsed ? (
                <div className="flex flex-col items-center">
                  <TrendingUp className="w-6 h-6 text-orange-400" />
                  <span className="text-sm text-orange-400 mt-1">NEW</span>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
                      <TrendingUp className="w-5 h-5 text-orange-400" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">Investment Management</p>
                      <p className="text-sm text-gray-400">Manage opportunities</p>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-sm bg-orange-500/20 text-orange-300">NEW</span>
                </div>
              )}
            </button>
          )}

          {/* Owner Dashboard & Portal Invites - Owner Only */}
          {currentRole === UserRole.PLATFORM_OWNER && (
            <button
              onClick={() => onNavigate?.('owners-dashboard')}
              className="relative w-full p-4 rounded-xl border transition-all duration-300 bg-[#1A1A1A] border-[#2A2A2A] hover:border-amber-500/50 hover:bg-amber-600/10"
            >
              {sidebarCollapsed ? (
                <div className="flex flex-col items-center">
                  <Crown className="w-6 h-6 text-amber-400" />
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                      <Crown className="w-5 h-5 text-amber-400" />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-bold text-white">Owner Dashboard</p>
                      <p className="text-sm text-gray-400">Invite anyone to any portal</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-amber-400" />
                </div>
              )}
            </button>
          )}

          {/* Catalog Pricing - Owner Only */}
          {currentRole === UserRole.PLATFORM_OWNER && (
            <button
              onClick={() => onNavigate?.('product-catalog')}
              className="relative w-full p-4 rounded-xl border transition-all duration-300 bg-[#1A1A1A] border-[#2A2A2A] hover:border-orange-500/50 hover:bg-orange-600/10"
            >
              {sidebarCollapsed ? (
                <div className="flex flex-col items-center">
                  <Tag className="w-6 h-6 text-orange-400" />
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
                      <Tag className="w-5 h-5 text-orange-400" />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-bold text-white">Catalog Pricing</p>
                      <p className="text-sm text-gray-400">Edit prices & markup on any product</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-orange-400" />
                </div>
              )}
            </button>
          )}

          {/* Master Schedule Button */}
          <button
            onClick={() => setShowMasterSchedule(!showMasterSchedule)}
            className={`relative w-full p-4 rounded-xl border transition-all duration-300 ${
              showMasterSchedule
                ? 'bg-purple-600/20 border-purple-500/50 shadow-lg shadow-purple-500/30'
                : 'bg-[#1A1A1A] border-[#2A2A2A] hover:border-purple-500/50 hover:bg-purple-600/10'
            }`}
          >
            {sidebarCollapsed ? (
              <div className="flex flex-col items-center">
                <Calendar className="w-6 h-6 text-purple-400" />
                <span className="text-sm text-purple-400 mt-1">{activeJobsCount}</span>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                      <Calendar className="w-5 h-5 text-purple-400" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">Master Schedule</p>
                      <p className="text-sm text-gray-400">{activeJobsCount} active jobs</p>
                    </div>
                  </div>
                  <ChevronRight className={`w-5 h-5 text-purple-400 transition-transform duration-300 ${
                    showMasterSchedule ? 'rotate-90' : ''
                  }`} />
                </div>
              </>
            )}
          </button>

          {/* Business Analytics */}
          <button
            onClick={() => onNavigate?.('analytics')}
            className="relative w-full p-4 rounded-xl border transition-all duration-300 bg-[#1A1A1A] border-[#2A2A2A] hover:border-orange-500/50 hover:bg-orange-600/10"
          >
            {sidebarCollapsed ? (
              <div className="flex flex-col items-center"><BarChart3 className="w-6 h-6 text-orange-400" /></div>
            ) : (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
                    <BarChart3 className="w-5 h-5 text-orange-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-white">Analytics</p>
                      <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-orange-600 text-white">NEW</span>
                    </div>
                    <p className="text-sm text-gray-400">Revenue · Trends · AI Insights</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-orange-400" />
              </div>
            )}
          </button>

          {/* Lead CRM */}
          <button
            onClick={() => onNavigate?.('crm')}
            className="relative w-full p-4 rounded-xl border transition-all duration-300 bg-[#1A1A1A] border-[#2A2A2A] hover:border-blue-500/50 hover:bg-blue-600/10"
          >
            {sidebarCollapsed ? (
              <div className="flex flex-col items-center"><Users className="w-6 h-6 text-blue-400" /></div>
            ) : (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                    <Users className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-white">Lead CRM</p>
                      <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-blue-600 text-white">NEW</span>
                    </div>
                    <p className="text-sm text-gray-400">Pipeline · Scoring · Notes</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-blue-400" />
              </div>
            )}
          </button>

          {/* Coupon Manager */}
          <button
            onClick={() => onNavigate?.('coupons')}
            className="relative w-full p-4 rounded-xl border transition-all duration-300 bg-[#1A1A1A] border-[#2A2A2A] hover:border-emerald-500/50 hover:bg-emerald-600/10"
          >
            {sidebarCollapsed ? (
              <div className="flex flex-col items-center"><Tag className="w-6 h-6 text-emerald-400" /></div>
            ) : (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                    <Tag className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-white">Coupon Manager</p>
                      <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-emerald-600 text-white">NEW</span>
                    </div>
                    <p className="text-sm text-gray-400">Promo Codes · Discounts · Analytics</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-emerald-400" />
              </div>
            )}
          </button>

          {/* Abandoned Cart Recovery */}
          <button
            onClick={() => onNavigate?.('abandoned-carts')}
            className="relative w-full p-4 rounded-xl border transition-all duration-300 bg-[#1A1A1A] border-[#2A2A2A] hover:border-red-500/50 hover:bg-red-600/10"
          >
            {sidebarCollapsed ? (
              <div className="flex flex-col items-center"><ShoppingCart className="w-6 h-6 text-red-400" /></div>
            ) : (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center">
                    <ShoppingCart className="w-5 h-5 text-red-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-white">Cart Recovery</p>
                      <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-red-600 text-white">NEW</span>
                    </div>
                    <p className="text-sm text-gray-400">Win Back · Recovery Emails</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-red-400" />
              </div>
            )}
          </button>

          {/* Gift Cards */}
          <button
            onClick={() => onNavigate?.('gift-cards')}
            className="relative w-full p-4 rounded-xl border transition-all duration-300 bg-[#1A1A1A] border-[#2A2A2A] hover:border-pink-500/50 hover:bg-pink-600/10"
          >
            {sidebarCollapsed ? (
              <div className="flex flex-col items-center"><Gift className="w-6 h-6 text-pink-400" /></div>
            ) : (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-pink-500/10 flex items-center justify-center">
                    <Gift className="w-5 h-5 text-pink-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-white">Gift Cards</p>
                      <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-pink-600 text-white">NEW</span>
                    </div>
                    <p className="text-sm text-gray-400">Buy · Send · Redeem</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-pink-400" />
              </div>
            )}
          </button>

          {/* Flash Sale Manager */}
          <button
            onClick={() => onNavigate?.('flash-sales')}
            className="relative w-full p-4 rounded-xl border transition-all duration-300 bg-[#1A1A1A] border-[#2A2A2A] hover:border-yellow-500/50 hover:bg-yellow-600/10"
          >
            {sidebarCollapsed ? (
              <div className="flex flex-col items-center"><Zap className="w-6 h-6 text-yellow-400" /></div>
            ) : (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                    <Zap className="w-5 h-5 text-yellow-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-white">Flash Sales</p>
                      <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-yellow-600 text-white">NEW</span>
                    </div>
                    <p className="text-sm text-gray-400">Timed Promos · Live Banners</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-yellow-400" />
              </div>
            )}
          </button>

          {/* Invoice Builder */}
          <button
            onClick={() => onNavigate?.('invoices')}
            className="relative w-full p-4 rounded-xl border transition-all duration-300 bg-[#1A1A1A] border-[#2A2A2A] hover:border-emerald-500/50 hover:bg-emerald-600/10"
          >
            {sidebarCollapsed ? (
              <div className="flex flex-col items-center"><FileText className="w-6 h-6 text-emerald-400" /></div>
            ) : (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-white">Invoices & Estimates</p>
                      <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-emerald-600 text-white">NEW</span>
                    </div>
                    <p className="text-sm text-gray-400">Create · Send · Get Paid</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-emerald-400" />
              </div>
            )}
          </button>

          {/* Service Booking */}
          <button
            onClick={() => onNavigate?.('book')}
            className="relative w-full p-4 rounded-xl border transition-all duration-300 bg-[#1A1A1A] border-[#2A2A2A] hover:border-blue-500/50 hover:bg-blue-600/10"
          >
            {sidebarCollapsed ? (
              <div className="flex flex-col items-center"><Calendar className="w-6 h-6 text-blue-400" /></div>
            ) : (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-white">Service Booking</p>
                      <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-blue-600 text-white">NEW</span>
                    </div>
                    <p className="text-sm text-gray-400">Jobs · Quotes · Scheduling</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-blue-400" />
              </div>
            )}
          </button>

          {/* Affiliate Program */}
          <button
            onClick={() => onNavigate?.('affiliate')}
            className="relative w-full p-4 rounded-xl border transition-all duration-300 bg-[#1A1A1A] border-[#2A2A2A] hover:border-orange-500/50 hover:bg-orange-600/10"
          >
            {sidebarCollapsed ? (
              <div className="flex flex-col items-center"><Share2 className="w-6 h-6 text-orange-400" /></div>
            ) : (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
                    <Share2 className="w-5 h-5 text-orange-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-white">Affiliate Program</p>
                      <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-orange-600 text-white">NEW</span>
                    </div>
                    <p className="text-sm text-gray-400">Referrals · 10% Commission</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-orange-400" />
              </div>
            )}
          </button>

          {/* SMS Marketing */}
          <button
            onClick={() => onNavigate?.('sms-marketing')}
            className="relative w-full p-4 rounded-xl border transition-all duration-300 bg-[#1A1A1A] border-[#2A2A2A] hover:border-green-500/50 hover:bg-green-600/10"
          >
            {sidebarCollapsed ? (
              <div className="flex flex-col items-center"><Smartphone className="w-6 h-6 text-green-400" /></div>
            ) : (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                    <Smartphone className="w-5 h-5 text-green-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-white">SMS Marketing</p>
                      <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-green-600 text-white">NEW</span>
                    </div>
                    <p className="text-sm text-gray-400">Text Blasts · 98% Open Rate</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-green-400" />
              </div>
            )}
          </button>

          {/* AI Ranking Engine Button */}
          <button
            onClick={() => onNavigate?.('ai-ranking-engine')}
            className="relative w-full p-4 rounded-xl border transition-all duration-300 bg-[#1A1A1A] border-[#2A2A2A] hover:border-purple-500/50 hover:bg-purple-600/10"
          >
            {sidebarCollapsed ? (
              <div className="flex flex-col items-center">
                <TrendingUp className="w-6 h-6 text-purple-400" />
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-purple-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-white">AI Ranking Engine</p>
                      <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-purple-600 text-white">NEW</span>
                    </div>
                    <p className="text-sm text-gray-400">Google · AI · Voice SEO</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-purple-400" />
              </div>
            )}
          </button>

        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="bg-[#0F0F0F] border-b border-[#2A2A2A] px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 flex-1 min-w-0">
              <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-600 to-orange-700 flex items-center justify-center">
                  <LayoutGrid className="w-6 h-6 text-white" />
                </div>
                Command Center
              </h1>
              
              {/* Search Bar */}
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="search"
                  name="command-center-module-search"
                  placeholder="Search modules..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  // Read-only until focus is the reliable cross-browser way to stop
                  // Opera/Chrome password managers from autofilling the saved sign-in
                  // email here on load. Autofill was setting searchQuery, which hid
                  // the module grid and made the Command Center appear to "go black"
                  // until the user manually cleared the box. autoComplete="off" alone
                  // is ignored by Chromium browsers, so we combine both.
                  readOnly={searchReadOnly}
                  onFocus={() => setSearchReadOnly(false)}
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck={false}
                  data-form-type="other"
                  data-lpignore="true"
                  data-1p-ignore="true"
                  className="w-full pl-10 pr-4 py-2 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-orange-500/50"
                />
              </div>
            </div>

            <button
              onClick={() => window.location.reload()}
              className="ml-4 px-4 py-2 bg-[#1A1A1A] border border-[#2A2A2A] hover:border-orange-500/50 text-gray-300 hover:text-white rounded-lg transition-all duration-300 flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>

            <button
              onClick={() => setForceMobileView(!forceMobileView)}
              className="ml-2 px-4 py-2 bg-[#1A1A1A] border border-[#2A2A2A] hover:border-orange-500/50 text-gray-300 hover:text-white rounded-lg transition-all duration-300 flex items-center gap-2"
            >
              <Smartphone className="w-4 h-4" />
              {forceMobileView ? 'Desktop' : 'Mobile'}
            </button>
          </div>
        </div>

        {/* Offline Mode Banner */}
        <OfflineModeBanner show={serverDeployed === false} />

        {/* Tab Navigation */}
        <div className="bg-[#0F0F0F] border-b border-[#2A2A2A] px-6">
          <div className="flex gap-1">
            {tabCategories.map((category) => {
              const Icon = category.icon;
              const isActive = activeTab === category.id;

              return (
                <button
                  key={category.id}
                  onClick={() => setActiveTab(category.id)}
                  className={`px-6 py-3 flex items-center gap-2 border-b-2 transition-all duration-200 ${
                    isActive
                      ? 'border-orange-500 text-orange-400 bg-orange-500/5'
                      : 'border-transparent text-gray-400 hover:text-gray-300 hover:bg-[#1A1A1A]'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="font-semibold">{category.label}</span>
                  <span className={`px-2 py-0.5 rounded-full text-sm ${
                    isActive ? 'bg-orange-500/20 text-orange-300' : 'bg-[#1A1A1A] text-gray-500'
                  }`}>
                    {category.modules.length}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Admin Alerts Panel - Slides down when active */}
        {isAdminOrHigher() && showAdminAlerts && (
          <div className="bg-[#0A0A0A] border-b border-[#2A2A2A] p-6 animate-slide-down">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-600 to-red-700 flex items-center justify-center">
                  <AlertCircle className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">Admin Alerts</h2>
                  <p className="text-gray-400">Review and manage pending administrative tasks</p>
                </div>
              </div>
              <button
                onClick={() => setShowAdminAlerts(false)}
                className="p-2 hover:bg-[#1A1A1A] rounded-lg transition-colors text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Embedded Admin Alerts Panel */}
            <div className="bg-[#0F0F0F] rounded-2xl border border-[#2A2A2A] overflow-hidden">
              <AdminAlertsPanel onNavigate={(route) => handleNavigation(route)} />
            </div>
          </div>
        )}

        {/* Master Schedule Panel - Slides down when active */}
        {showMasterSchedule && (
          <div className="bg-[#0A0A0A] border-b border-[#2A2A2A] p-6 animate-slide-down">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-600 to-purple-700 flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">Master Schedule</h2>
                  <p className="text-gray-400">Company-wide scheduling and resource management</p>
                </div>
              </div>
              <button
                onClick={() => setShowMasterSchedule(false)}
                className="p-2 hover:bg-[#1A1A1A] rounded-lg transition-colors text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Embedded Master Scheduling Component */}
            <div className="bg-[#0F0F0F] rounded-2xl border border-[#2A2A2A] overflow-hidden">
              <MasterScheduling />
            </div>
          </div>
        )}

        {/* Module Grid */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Quote to Contract - Featured Button (Operations Tab Only) */}
          {activeTab === 'operations' && !searchQuery && (
            <div className="mb-6">
              <div className="group relative w-full p-6 rounded-2xl border-2 border-orange-500/50 bg-gradient-to-br from-orange-600/20 to-orange-700/10 backdrop-blur-sm transition-all duration-300">
                {/* Animated glow effect */}
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-orange-500/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-xl pointer-events-none" />

                <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex items-center gap-4">
                    {/* Icon with pulse animation */}
                    <div className="relative w-16 h-16 rounded-xl bg-gradient-to-br from-orange-600 to-orange-700 flex items-center justify-center shadow-lg shadow-orange-500/50 flex-shrink-0">
                      <FileText className="w-8 h-8 text-white" />
                    </div>

                    <div className="text-left">
                      <h3 className="text-xl font-bold text-white mb-1">
                        Quote to Contract Workflow
                      </h3>
                      <p className="text-sm text-gray-300">
                        Convert approved quotes into contracts with AI-powered generation and review capabilities
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <button
                      onClick={() => setShowStartQuote(true)}
                      className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-orange-500 hover:bg-orange-400 text-white font-bold text-sm transition-colors shadow-lg shadow-orange-500/30"
                    >
                      <Plus className="w-4 h-4" /> Create Quote
                    </button>
                    <button
                      onClick={() => handleNavigation('/enterprise-quote-workflow', 'quotes')}
                      className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#1A1A1A] border border-orange-500/40 text-orange-400 hover:border-orange-500 font-bold text-sm transition-colors"
                    >
                      Open Workflow <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Invoices — Featured Button (Operations Tab Only) */}
          {activeTab === 'operations' && !searchQuery && (
            <div className="mb-6">
              <div className="group relative w-full p-6 rounded-2xl border-2 border-emerald-500/50 bg-gradient-to-br from-emerald-600/20 to-emerald-700/10 backdrop-blur-sm transition-all duration-300">
                <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="relative w-16 h-16 rounded-xl bg-gradient-to-br from-emerald-600 to-emerald-700 flex items-center justify-center shadow-lg shadow-emerald-500/50 flex-shrink-0">
                      <Receipt className="w-8 h-8 text-white" />
                    </div>
                    <div className="text-left">
                      <h3 className="text-xl font-bold text-white mb-1">Invoices</h3>
                      <p className="text-sm text-gray-300">
                        Create a new invoice or look one up — fast access to your billing.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <button
                      onClick={() => handleNavigation('/invoices-new', 'new')}
                      className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-bold text-sm transition-colors shadow-lg shadow-emerald-500/30"
                    >
                      <Plus className="w-4 h-4" /> Create Invoice
                    </button>
                    <button
                      onClick={() => handleNavigation('/invoices-new')}
                      className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#1A1A1A] border border-emerald-500/40 text-emerald-400 hover:border-emerald-500 font-bold text-sm transition-colors"
                    >
                      <Search className="w-4 h-4" /> Look Up
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Deal Publisher — full-width panel, not a module grid */}
          {activeTab === 'deals' && !searchQuery && (
            <DealPublisher />
          )}

          {/* Maintenance Plan Creator — full-width panel */}
          {activeTab === 'plan-creator' && !searchQuery && (
            <MaintenancePlanCreator />
          )}

          {/* Tech Roster Manager — full-width panel */}
          {activeTab === 'tech-roster' && !searchQuery && (
            <TechRosterManager />
          )}

          {/* Multi-Dropshipper Manager — full-width panel.
              Wrapped in an ErrorBoundary so a render error surfaces the real
              message on screen instead of blanking the whole dashboard. */}
          {activeTab === 'dropshippers' && !searchQuery && (
            <ErrorBoundary>
              <MultiDropshipperManager />
            </ErrorBoundary>
          )}

          {activeTab !== 'deals' && activeTab !== 'plan-creator' && activeTab !== 'tech-roster' && activeTab !== 'dropshippers' && searchQuery && filteredModules.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Search className="w-16 h-16 text-gray-600 mb-4" />
              <h3 className="text-xl font-bold text-gray-400 mb-2">No modules found</h3>
              <p className="text-gray-500">Try a different search term</p>
            </div>
          ) : activeTab !== 'deals' && activeTab !== 'plan-creator' && activeTab !== 'tech-roster' && activeTab !== 'dropshippers' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredModules.map((module, index) => {
                const Icon = module.icon;
                // Check if this is the Property Management Hub and there are pending approvals
                const isPropertyManagement = module.path === '/property-management-hub';
                const showApprovalBadge = isPropertyManagement && pendingApprovalsCount > 0;
                
                return (
                  <button
                    key={index}
                    onClick={() => {
                      console.log('🔵 Module clicked:', module.label, '→', module.path);
                      handleNavigation(module.path, module.tab);
                    }}
                    className="group relative p-5 rounded-xl border border-[#2A2A2A] bg-gradient-to-br from-[#1A1A1A]/40 to-[#0F0F0F]/40 backdrop-blur-sm hover:border-orange-500/50 hover:shadow-lg hover:shadow-orange-500/20 hover:scale-[1.02] transition-all duration-300 text-left"
                    style={{
                      backdropFilter: 'blur(10px)',
                    }}
                  >
                    {/* Glass effect overlay */}
                    <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    
                    {/* Gradient border glow on hover */}
                    <div className={`absolute inset-0 rounded-xl bg-gradient-to-br from-orange-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${getGlowColorClass(module.color)}`} />
                    
                    {/* Pending Approvals Badge */}
                    {showApprovalBadge && (
                      <div className="absolute -top-2 -right-2 z-20">
                        <div className="relative">
                          <div className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center shadow-lg shadow-red-500/50 animate-pulse">
                            <span className="text-white text-sm font-bold">{pendingApprovalsCount}</span>
                          </div>
                          <div className="absolute inset-0 rounded-full bg-red-400 animate-ping opacity-75" />
                        </div>
                      </div>
                    )}
                    
                    <div className="relative">
                      {/* Icon with glow */}
                      <div className={`w-12 h-12 rounded-lg bg-gradient-to-br from-${module.color}-500/10 to-${module.color}-600/5 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-300`}>
                        <div className={`absolute inset-0 rounded-lg ${getGlowColorClass(module.color)} blur-md opacity-0 group-hover:opacity-50 transition-opacity duration-300`} />
                        <Icon className={`w-6 h-6 ${getIconColorClass(module.color)} relative z-10`} />
                      </div>

                      {/* Module Name */}
                      <h3 className="text-base font-bold text-white mb-1 group-hover:text-orange-300 transition-colors duration-200">
                        {module.label}
                        {showApprovalBadge && (
                          <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-sm font-medium bg-red-500/20 text-red-300 border border-red-500/30">
                            {pendingApprovalsCount} pending
                          </span>
                        )}
                      </h3>

                      {/* Description */}
                      {module.description && (
                        <p className="text-sm text-gray-400 line-clamp-2">
                          {module.description}
                        </p>
                      )}

                      {/* Arrow indicator */}
                      <div className="absolute top-5 right-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <ChevronRight className="w-5 h-5 text-orange-400" />
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>
      </div>

      {showStartQuote && <StartQuoteModal onClose={() => setShowStartQuote(false)} />}

    </div>
  );
}