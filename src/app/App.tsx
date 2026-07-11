// App.tsx - Main Application Entry Point with Navigation
// Updated: 2026-05-29 19:11 - Fixed UnifiedProjectPipeline icon issue

// CRITICAL: Import error suppression FIRST before anything else
import "./utils/suppressErrors";

// Bundled phoenix logo — always available, no server needed
import phoenixLogo from '../imports/BPB_phoenix_full_color_logo.png';

// Cleanup utility: Makes window.cleanupLocalStorage() available in console
import "./utils/cleanupLocalStorage";

// CRITICAL: Import data persistence system to prevent data loss
import "./utils/dataPersistence";

// CRITICAL: Sync localStorage data to Supabase for cross-browser persistence
import { initializeDataSync } from "./utils/syncToSupabase";

// CRITICAL: Start automatic backup system (every 10 seconds)
import "./utils/autoBackup";

// CRITICAL: Run migrations on app load
import { migrateUserProfiles } from "./utils/migrationHelper";

// CRITICAL: Initialize owner profile on app load
import { initializeOwnerProfile } from "./utils/initializeOwnerProfile";

// Pipeline data seeder - generates demo projects for pipeline
import { seedPipelineData } from "./utils/seedPipelineData";
// Company data verification and auto-recovery
import { verifyCompanyData } from "./utils/verifyCompanyData";
// CRITICAL: Ensure default company exists in database
import "./utils/ensureDefaultCompany";
// CRITICAL: Initialize branding profile on app load
import "./utils/initializeBrandingProfile";
// UTILITY: Sync branding from database (available globally)
import "./utils/syncBrandingFromDatabase";
// CRITICAL: Auto-sync branding on every page load
import "./utils/autoSyncBranding";
// UTILITY: Set public branding manually (available globally)
import "./utils/setPublicBranding";
// CRITICAL: Force upload logo - clears cache and uploads fresh
import "./utils/forceUploadLogo";
// UTILITY: Save permanent logo (available globally)
import "./utils/savePermanentLogo";

// Run migration immediately
if (typeof window !== 'undefined') {
  const migrated = migrateUserProfiles();
  if (migrated) {
    console.log('✅ User profile migration completed');
  }

  // Initialize owner profile
  initializeOwnerProfile();

  // Initialize data sync to Supabase
  initializeDataSync().catch(err => {
    // Silent fail - this is expected when offline or backend not configured
    console.log('ℹ️ [Sync] Running in local-only mode (sync disabled)');
  });

  // DISABLED: Auto-recovery was causing data loss
  // setTimeout(() => {
  //   console.log('🔍 [App] Running company data verification...');
  //   const result = verifyCompanyData();
  //   if (Object.keys(result.found).length === 0) {
  //     console.warn('🚨 [App] No company data found - auto-recovery completed');
  //   }
  // }, 1000);

  // Make utilities available globally for debugging
  (window as any).verifyCompanyData = verifyCompanyData;
  (window as any).seedPipelineData = seedPipelineData;
  console.log('✅ [App] Utilities available:');
  console.log('  • verifyCompanyData() - Check company data');
  console.log('  • seedPipelineData() - Load demo projects into pipeline');
}

import { useState, useEffect, Suspense, useTransition, useDeferredValue, createContext, startTransition } from "react";
import {
  Building2,
  Crown,
  LayoutDashboard,
  Users,
  DollarSign,
  Palette,
  Store,
  Wrench,
  MessageSquare,
  UserCog,
  Workflow,
  Shield,
  BarChart3,
  LogOut,
  Home,
  TrendingUp,
} from "lucide-react";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { CompanyContextProvider, useCompany } from "./contexts/CompanyContext";
import { ActiveCompanyProvider } from "./contexts/ActiveCompanyContext";
import { CompanySwitcher } from "./components/CompanySwitcher";
import { UserProvider, useUser } from "./lib/user-context";
import { UserRole } from "./lib/rbac";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { Toaster } from "./components/ui/sonner";
import WorkRequestWidget from "./components/WorkRequestWidget";
import StoreAccessButton from "./components/StoreAccessButton";
import { ThemeManager, ThemeProvider } from "./components/ThemeManager";
import { RoleSwitcher } from "./components/RoleSwitcher";
import DataInitializer from "./components/DataInitializer";
import "./utils/companyDataRecovery"; // Load recovery tools globally

// Simple loading component
const LoadingFallback = () => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      minHeight: "100vh",
      backgroundColor: "#0A0A0A",
      color: "#ffffff",
    }}
  >
    <div style={{ textAlign: "center" }}>
      <div
        style={{
          width: "48px",
          height: "48px",
          border: "4px solid #2A2A2A",
          borderTop: "4px solid #ea580c",
          borderRadius: "50%",
          animation: "spin 1s linear infinite",
          margin: "0 auto 16px",
        }}
      />
      <p style={{ color: "#9ca3af" }}>Loading...</p>
    </div>
    <style>{`
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `}</style>
  </div>
);

// Critical Pages - Immediate imports
import Login from "./pages/Login";
import SignUp from "./pages/SignUp";
import DirectoryLandingPage from "./pages/DirectoryLandingPage";
import BuildsLandingPage from "./pages/BuildsLandingPage";
import HandymanLandingPage from "./pages/HandymanLandingPage";
import DemoLandingPage from "./pages/DemoLandingPage";
import PropertyManagementLandingPage from "./pages/PropertyManagementLandingPage";
import ContractorNetworkLandingPage from "./pages/ContractorNetworkLandingPage";
import TerritoryLandingPage from "./pages/TerritoryLandingPage";
import EmergencyServicesLandingPage from "./pages/EmergencyServicesLandingPage";
import MarketingHubLandingPage from "./pages/MarketingHubLandingPage";
import SubcontractorApplication from "./pages/SubcontractorApplication";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";

// Import all pages directly instead of lazy loading to avoid suspension errors
import UnifiedDashboard from "./pages/UnifiedDashboard";
import CustomerPortalApp from "./components/portals/CustomerPortalView";
import AdminAlerts from "./pages/AdminAlerts";
import CustomersNew from "./pages/CustomersNew";
import InvoicesNew from "./pages/InvoicesNew";
import ProjectsNew from "./pages/ProjectsNew";
import DesignStudioPro from "./pages/DesignStudioPro";
import StructuralDesign from "./pages/StructuralDesign";
import VendorsAdminHub from "./pages/VendorsAdminHub";
import VendorApplication from "./pages/VendorApplication";
import InvestorApplication from "./pages/InvestorApplication";
import AdvertiserApplication from "./pages/AdvertiserApplication";
import ServiceProviderApplication from "./pages/ServiceProviderApplication";
import TerritoryApplication from "./pages/TerritoryApplication";
import InvestmentOpportunities from "./pages/InvestmentOpportunities";
import InvestmentManagement from "./pages/InvestmentManagement";
import DropshipperAdmin from "./components/DropshipperAdminPanel";
import PublicStore from "./pages/PublicStore";
import OrderTracking from "./components/OrderTracking";
import PromotionsManager from "./pages/PromotionsManager";
import AIRankingEngine from "./pages/AIRankingEngine";
import AutoProductPilot from "./pages/AutoProductPilot";
import SocialMediaHub from "./pages/SocialMediaHub";
import EmailLeadGen from "./pages/EmailLeadGen";
import LocalLeadsLanding from "./pages/LocalLeadsLanding";
import LoyaltyProgram from "./pages/LoyaltyProgram";
import QRCodeGenerator from "./pages/QRCodeGenerator";
import RevenueAnalytics from "./pages/RevenueAnalytics";
import SMSMarketing from "./pages/SMSMarketing";
import AffiliateProgram from "./pages/AffiliateProgram";
import ServiceBooking from "./pages/ServiceBooking";
import InvoiceBuilder from "./pages/InvoiceBuilder";
import FlashSaleManager from "./pages/FlashSaleManager";
import GiftCards from "./pages/GiftCards";
import SubscribeAndSave from "./pages/SubscribeAndSave";
import ReviewsDashboard from "./pages/ReviewsDashboard";
import AbandonedCart from "./pages/AbandonedCart";
import CouponManager from "./pages/CouponManager";
import LeadCRM from "./pages/LeadCRM";
import AnalyticsDashboard from "./pages/AnalyticsDashboard";
import OrderManager from "./pages/OrderManager";
// Hub Pages - Consolidated Navigation
import JobTrackingHub from "./pages/JobTrackingHub";
import RevenueMonetizationHub from "./pages/RevenueMonetizationHub";
import CustomerRegistrationForm from "./pages/CustomerRegistrationForm";
import SupplierManagementHub from "./pages/SupplierManagementHub";
import HREmployeeHub from "./pages/HREmployeeHub";
import DesignStructuralHub from "./pages/DesignStructuralHub";
import CustomerQuoteApproval from "./pages/CustomerQuoteApproval";
// Old portal apps removed - replaced by new PortalView-based portals
// Portal Creation and Management removed - now handled by PortalsHub
import UserManagementHub from "./pages/UserManagementHub";
import SubscriptionHub from "./pages/SubscriptionHub";
import CohortManagement from "./pages/CohortManagement";
import MasterAdminDashboard from "./pages/MasterAdminDashboard";
import UnifiedProjectPipeline from "./pages/UnifiedProjectPipeline";
import WorkOrderManager from "./components/WorkOrderManager";
import RequestServicePage from "./pages/RequestServicePage";
import MaterialsCenter from "./pages/MaterialsCenter";
import PricingSettings from "./pages/PricingSettings";
import LaborRatesConfig from "./components/LaborRatesConfig";
import BidRoomV2 from "./pages/BidRoomV2";
import ServiceScheduling from "./pages/ServiceScheduling";
import UnifiedCRMHub from "./pages/UnifiedCRMHub";
import PropertyManagementHub from "./pages/PropertyManagementHub";
import PropertyManagementTest from "./components/PropertyManagementTest";
import CalendarScheduleView from "./components/CalendarScheduleView";
// REMOVED: WorkRequestIntake, WorkRequestFormEditor - Use UnifiedProjectPipeline instead
import ApplicationSubmissions from "./pages/ApplicationSubmissions";
import BusinessProfilesHub from "./components/BusinessProfilesHub";
import OwnersDashboard from "./pages/OwnersDashboard";
import PortalsHub from "./pages/PortalsHub";
import SubcontractorPortal from "./components/portals/SubcontractorPortal";
import VendorPortalView from "./components/portals/VendorPortalView";
import AdvertiserPortalView from "./components/portals/AdvertiserPortalView";
import InvestorPortalView from "./components/portals/InvestorPortalView";
import PropertyManagerPortalView from "./components/portals/PropertyManagerPortalView";
import CondoManagerPortalView from "./components/portals/CondoManagerPortalView";
import LandlordPortalView from "./components/portals/LandlordPortalView";
import PortalDemoSelector from "./pages/PortalDemoSelector";
import TradesWorkerMarketing from "./pages/marketing/TradesWorkerMarketing";
import VendorMarketing from "./pages/marketing/VendorMarketing";
import SubcontractorMarketing from "./pages/marketing/SubcontractorMarketing";
// Additional pages from filesystem
import CompanyDataRestoration from "./pages/CompanyDataRestoration";
import CompanyRecovery from "./pages/CompanyRecovery";
import CompanySetup from "./pages/CompanySetup";
import NotificationSettings from "./pages/NotificationSettings";
import UnifiedPaymentCenter from "./pages/UnifiedPaymentCenter";
import JobFinancialTracker from "./pages/JobFinancialTracker";
import FinancialReconciliation from "./pages/FinancialReconciliation";
import EnterpriseReporting from "./pages/EnterpriseReporting";
import ChangeOrderCameraApp from "./pages/ChangeOrderCameraApp";
import WasteDisposalTracking from "./pages/WasteDisposalTracking";
import WeatherJobSiteMonitor from "./pages/WeatherJobSiteMonitor";
import CodeTracker from "./pages/CodeTracker";
import ProductDataSources from "./pages/ProductDataSources";
import PurchaseOrders from "./pages/PurchaseOrders";
import EnterpriseEmailManagement from "./pages/EnterpriseEmailManagement";
import LandingPageEditor from "./pages/LandingPageEditor";
import SocialMediaManager from "./pages/SocialMediaManager";
import ModuleManager from "./pages/ModuleManager";
import ReferralRewards from "./pages/ReferralRewards";
import AIDiagnostics from "./pages/AIDiagnostics";
import DiagnosticLogos from "./pages/DiagnosticLogos";
import DiagnosticLogosDebug from "./pages/DiagnosticLogosDebug";
import UploadMyLogo from "./pages/UploadMyLogo";
import CheckMyCompanies from "./pages/CheckMyCompanies";
import PublishMyBranding from "./pages/PublishMyBranding";
import FixMyLogo from "./pages/FixMyLogo";
import DobaIntegration from "./pages/DobaIntegration";
import SpocketIntegration from "./pages/SpocketIntegration";
import ZendropIntegration from "./pages/ZendropIntegration";
import PropertyRevenueHub from "./pages/PropertyRevenueHub";
import PropertyAIEnterprise from "./pages/PropertyAIEnterprise";
import OrderSuccess from "./pages/OrderSuccess";
import DigitalStorefront from "./pages/DigitalStorefront";
import AdCreator from "./pages/AdCreator";
import DocumentViewer from "./pages/DocumentViewer";
import PermitAI from "./pages/PermitAI";
import SubcontractorEnterprise from "./pages/SubcontractorEnterprise";
import Services from "./pages/Services";
import PortalDemoHub from "./pages/PortalDemoHub";
import PortalGlobalSettings from "./pages/PortalGlobalSettings";
import MasterScheduling from "./pages/MasterScheduling";
import EnterpriseContentCenter from "./pages/EnterpriseContentCenter";
import PortalCreation from "./pages/PortalCreation";
import PortalManagement from "./pages/PortalManagement";
import PortalAccess from "./pages/PortalAccess";
import QuoteResponseHub from "./pages/QuoteResponseHub";
import WorkRequestHub from "./pages/WorkRequestHub";
import WorkRequestIntake from "./pages/WorkRequestIntake";
import WorkRequestFormEditor from "./pages/WorkRequestFormEditor";
import EnterpriseQuoteWorkflow from "./pages/EnterpriseQuoteWorkflow";
import QuoteToContractWorkflow from "./pages/QuoteToContractWorkflow";
import WorkRequestTracking from "./pages/WorkRequestTracking";
import EmployeeMobileApp from "./pages/EmployeeMobileApp";
import MobileHub from "./pages/MobileHub";
import EmployeePortalView from "./components/portals/EmployeePortalView";
import OnCallEmergencyPortal from "./components/portals/OnCallEmergencyPortal";
import PricingPage from "./pages/PricingPage";
import CustomerDocs from "./pages/CustomerDocs";
import InvestmentCalculator from "./pages/InvestmentCalculator";
import AdminPortalView from "./components/portals/AdminPortalView";
import TerritoryPortalView from "./components/portals/TerritoryPortalView";
import WorkOrderCompletionReports from "./pages/WorkOrderCompletionReports";
import Messaging from "./pages/Messaging";
import ExitIntentManager from "./pages/ExitIntentManager";
import ExitIntentPopup from "./components/ExitIntentPopup";
import LiveChatManager from "./pages/LiveChatManager";
import LiveChatWidget from "./components/LiveChatWidget";
import PhotoImporter from "./pages/PhotoImporter";
import MarketingAutomation from "./pages/MarketingAutomation";
import RetargetingPixelSetup from "./pages/RetargetingPixelSetup";
import BlogManager from "./pages/BlogManager";
import ReviewSurveyManager from "./pages/ReviewSurveyManager";
import InfluencerTracker from "./pages/InfluencerTracker";
import KeywordTracker from "./pages/KeywordTracker";
import CustomerPortal from "./pages/CustomerPortal";

// Create Navigation Context
export const NavigationContext = createContext<{ navigate: (page: string) => void }>({
  navigate: () => {},
});

// Navigation menu structure
interface NavSection {
  name: string;
  icon: any;
  items: { name: string; path: string; badge?: string }[];
}

const navigationSections: NavSection[] = [
  {
    name: "Control Center",
    icon: LayoutDashboard,
    items: [
      { name: "Unified Dashboard", path: "unified-dashboard" },
    ],
  },
  {
    name: "Customers & Contacts",
    icon: Users,
    items: [{ name: "Customers", path: "customers" }],
  },
  {
    name: "Projects & Work",
    icon: Wrench,
    items: [
      { name: "Project Pipeline", path: "unified-project-pipeline" },
      { name: "Bid Room", path: "bid-room", badge: "NEW" },
      {
        name: "Change Order Camera",
        path: "change-order-camera",
        badge: "NEW",
      },
      {
        name: "Service Scheduling",
        path: "service-scheduling",
      },
      {
        name: "Waste & Disposal",
        path: "waste-disposal-tracking",
        badge: "NEW",
      },
      {
        name: "Weather Monitor",
        path: "weather-job-site-monitor",
        badge: "NEW",
      },
      { name: "Master Scheduling", path: "master-scheduling" },
      { name: "PermitAI", path: "permit-ai", badge: "NEW" },
      { name: "Unified Calendar", path: "unified-calendar" },
      { name: "Online Store", path: "dropshipper-admin" },
      { name: "Zendrop", path: "zendrop", badge: "NEW" },
      { name: "Auto-Product Pilot", path: "auto-product-pilot", badge: "NEW" },
      { name: "AI Ranking Engine", path: "ai-ranking-engine", badge: "NEW" },
      { name: "Social Media Hub", path: "social-media-hub", badge: "NEW" },
      { name: "Exit-Intent Popups", path: "exit-intent", badge: "NEW" },
      { name: "Live Chat", path: "live-chat", badge: "NEW" },
      { name: "Photo Importer", path: "photo-importer", badge: "NEW" },
      { name: "Marketing Automation", path: "marketing-automation", badge: "NEW" },
      { name: "Retargeting Pixels", path: "retargeting-pixels", badge: "NEW" },
      { name: "Blog Manager", path: "blog-manager", badge: "NEW" },
      { name: "Reviews & Surveys", path: "review-surveys", badge: "NEW" },
      { name: "Influencer & Ambassadors", path: "influencer-tracker", badge: "NEW" },
      { name: "Keyword Rank Tracker", path: "keyword-tracker", badge: "NEW" },
      { name: "Customer Portal", path: "customer-portal", badge: "NEW" },
    ],
  },
  {
    name: "Team & HR",
    icon: UserCog,
    items: [
      { name: "Employees", path: "employee-management" },
      { name: "HR Management", path: "enterprise-hr" },
      {
        name: "Subcontractors",
        path: "subcontractor-enterprise",
      },
      { name: "Time Tracking", path: "time-tracking" },
      { name: "Payroll", path: "payroll" },
    ],
  },
  {
    name: "Financial",
    icon: DollarSign,
    items: [
      { name: "Invoices", path: "invoices" },
      {
        name: "Payments",
        path: "unified-payment-center",
        badge: "NEW",
      },
      {
        name: "Job Financial Tracker",
        path: "job-financial-tracker",
      },
    ],
  },
  {
    name: "Operations",
    icon: Workflow,
    items: [
      {
        name: "Materials Center",
        path: "materials-center",
        badge: "NEW",
      },
      {
        name: "Purchase Orders",
        path: "purchase-orders",
        badge: "NEW",
      },
      {
        name: "Product Data Sources",
        path: "product-data-sources",
      },
      { name: "Services", path: "services" },
      { name: "Vendor Management", path: "vendor-management" },
      { name: "Vendor API Management", path: "vendor-api-management" },
    ],
  },
  {
    name: "Design & Content",
    icon: Palette,
    items: [
      {
        name: "Design Studio Pro",
        path: "design-studio-pro",
        badge: "NEW",
      },
      {
        name: "Structural Design",
        path: "structural-design",
        badge: "NEW",
      },
      {
        name: "Enterprise Content Center",
        path: "enterprise-content-center",
      },
      { name: "Social Media Manager", path: "social-media" },
      { name: "Module Manager", path: "module-manager" },
      { name: "Referral Rewards", path: "referral-rewards" },
    ],
  },
  {
    name: "Vendors & eCommerce",
    icon: Store,
    items: [
      {
        name: "Vendors Admin Hub",
        path: "vendors-admin-hub",
      },
      { name: "Dropshipper Admin", path: "dropshipper-admin" },
      { name: "Zendrop Integration", path: "zendrop" },
      { name: "Public Store", path: "public-store" },
      { name: "Order Tracking", path: "order-tracking", badge: "Track" },
      { name: "Promotions Manager", path: "promotions-manager", badge: "NEW" },
      // Portal routes - All individual portal pages deleted in Phase 1, use PortalAccess instead
      { name: "Customer App", path: "customer-app" },  // Redirect to new CustomerPortal
      { name: "Investor App", path: "investor-app" },  // Redirect to new InvestorPortal
      { name: "Advertiser App", path: "advertiser-app" },  // Redirect to new AdvertiserPortal
      { name: "Portal Creation", path: "portal-creation" },
      { name: "Portal Management", path: "portal-management" },
    ],
  },
  {
    name: "Communication",
    icon: MessageSquare,
    items: [
      { name: "Enterprise Email", path: "enterprise-email" },
    ],
  },
  {
    name: "Platform Management",
    icon: Shield,
    items: [
      { name: "User Management", path: "user-management-hub" },
      { name: "Role Management", path: "user-management-hub?tab=roles" },
      { name: "Module Manager", path: "module-manager" },
      {
        name: "Landing Page Editor",
        path: "landing-page-editor",
        badge: "NEW",
      },
      { name: "AI Diagnostics", path: "ai-diagnostics" },
    ],
  },
  {
    name: "Reports & Analytics",
    icon: BarChart3,
    items: [
      { name: "Analytics Dashboard", path: "reports" },
      {
        name: "Enterprise Reporting",
        path: "enterprise-reporting",
      },
    ],
  },
  {
    name: "Growth & Visibility",
    icon: TrendingUp,
    items: [
      { name: "AI Ranking Engine", path: "ai-ranking-engine", badge: "NEW" },
      { name: "Auto-Product Pilot", path: "auto-product-pilot", badge: "NEW" },
    ],
  },
];

// Sign Out Button Component
function SignOutButton() {
  const { signOut, user } = useAuth();

  const handleSignOut = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    console.log('🔴 Sign out clicked!');

    try {
      // CRITICAL: DO NOT clear company data - only clear user session data
      console.log('🔴 Clearing user session data (preserving company data)...');

      // Preserve company data during sign out
      const companyDataKeys = [
        'companies_offline',
        'companies_global_backup',
        'companies_latest',
        'company_blackphoenix_primary',
        'company_branding_profile',
        'company_branding_profile_backup',
        'company_logo_variants',
        'company_documents',
        'investmentOpportunities',
      ];

      const preservedData: Record<string, string | null> = {};
      companyDataKeys.forEach(key => {
        const value = localStorage.getItem(key);
        if (value) {
          preservedData[key] = value;
          console.log(`  ✅ Preserving: ${key}`);
        }
      });

      // Clear all localStorage
      localStorage.clear();
      sessionStorage.clear();

      // Restore company data immediately
      Object.entries(preservedData).forEach(([key, value]) => {
        if (value) {
          localStorage.setItem(key, value);
          console.log(`  ♻️ Restored: ${key}`);
        }
      });

      console.log('🔴 Calling signOut...');
      signOut();

      console.log('🔴 Force redirecting to login...');
      // Use replace instead of href to prevent back button issues
      window.location.replace('/login');
    } catch (error) {
      console.error('Sign out error:', error);
      // Don't clear localStorage on error - might lose data
      window.location.replace('/login');
    }
  };

  // Always show sign out button if there's any user data
  const hasProfile = localStorage.getItem('currentUserProfile');

  console.log('SignOutButton render - user:', !!user, 'hasProfile:', !!hasProfile);

  return (
    <button
      onClick={handleSignOut}
      className="flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:text-white hover:bg-[#2A2A2A] rounded-lg transition-colors"
      title="Sign Out"
      type="button"
    >
      <LogOut className="w-4 h-4" />
      <span className="hidden sm:inline">Sign Out</span>
    </button>
  );
}

// Company Selector Component
function CompanySelector() {
  // Use optional chaining and provide default values to handle loading state
  const companyContext = useCompany();
  const [logo, setLogo] = useState<string>(phoenixLogo);
  const [dbaName, setDbaName] = useState<string>('Black Phoenix Builds');

  // Load company branding and logo
  useEffect(() => {
    const loadBranding = () => {
      try {
        let foundLogo = null;

        // Try 1: Load logo from logo variants
        const logoVariants = localStorage.getItem('company_logo_variants');
        console.log('🔍 [CompanySelector] Logo variants raw:', logoVariants);
        if (logoVariants && logoVariants !== 'undefined' && logoVariants !== 'null') {
          const logos = JSON.parse(logoVariants);
          console.log('🔍 [CompanySelector] Logo variants parsed:', logos);
          foundLogo = logos.logo_primary || logos.logo_horizontal || logos.logo_square || logos.logo_icon;
          console.log('🔍 [CompanySelector] Selected logo from variants:', foundLogo);
        }

        // Try 2: Fallback to branding profile logo_url
        if (!foundLogo) {
          const branding = localStorage.getItem('company_branding_profile');
          if (branding && branding !== 'undefined' && branding !== 'null') {
            const data = JSON.parse(branding);
            foundLogo = data.logo_url || data.primaryLogo;
            console.log('🔍 [CompanySelector] Logo from branding profile:', foundLogo);
          }
        }

        // Only upgrade to a Storage URL — never replace the bundled phoenix default with null/base64
        if (foundLogo && typeof foundLogo === 'string' && foundLogo.startsWith('https://')) {
          setLogo(foundLogo);
        }

        // Load DBA name from branding profile
        const branding = localStorage.getItem('company_branding_profile');
        if (branding && branding !== 'undefined' && branding !== 'null') {
          const data = JSON.parse(branding);
          console.log('🔍 [CompanySelector] DBA name:', data.dbaName);
          setDbaName(data.dbaName || data.businessName || 'Black Phoenix Builds');
        }
      } catch (error) {
        console.error('❌ [CompanySelector] Error loading branding:', error);
      }
    };
    loadBranding();

    // Also listen for storage events in case logo is uploaded while app is running
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'company_logo_variants' || e.key === 'company_branding_profile') {
        console.log('🔄 [CompanySelector] Storage changed, reloading branding');
        loadBranding();
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Handle case where context is still loading
  if (!companyContext) {
    return (
      <div className="flex items-center gap-2 px-3 py-2">
        {logo ? (
          <img
            src={logo}
            alt="Logo"
            className="w-8 h-8 object-contain rounded-lg relative z-[9999]"
            onError={(e) => {
              console.error('❌ Logo failed to load:', logo);
              e.currentTarget.style.display = 'none';
            }}
          />
        ) : (
          <div className="w-8 h-8 bg-gradient-to-br from-orange-600 to-orange-700 rounded-lg flex items-center justify-center relative z-[9999]">
            <Building2 className="w-4 h-4 text-white" />
          </div>
        )}
        <span className="font-semibold hidden md:inline text-white">
          {dbaName}
        </span>
      </div>
    );
  }

  const { activeCompany, userCompanies = [], switchCompany } = companyContext;
  const [isOpen, setIsOpen] = useState(false);

  // Show app branding if no company is selected
  if (!activeCompany || !userCompanies || userCompanies.length === 0) {
    return (
      <div className="flex items-center gap-2 px-3 py-2">
        {logo ? (
          <img src={logo} alt="Logo" className="w-8 h-8 object-contain rounded-lg relative z-[9999]" />
        ) : (
          <div className="w-8 h-8 bg-gradient-to-br from-orange-600 to-orange-700 rounded-lg flex items-center justify-center relative z-[9999]">
            <Building2 className="w-4 h-4 text-white" />
          </div>
        )}
        <span className="font-semibold hidden md:inline text-white">
          {dbaName}
        </span>
      </div>
    );
  }

  const handleSwitch = async (companyId: string) => {
    const result = await switchCompany(companyId);
    if (result.success) {
      setIsOpen(false);
      window.location.reload(); // Reload to apply new company context
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 text-sm text-white hover:bg-[#2A2A2A] rounded-lg transition-colors"
      >
        {logo ? (
          <img src={logo} alt="Logo" className="w-8 h-8 object-contain rounded-lg" />
        ) : (
          <div className="w-8 h-8 bg-gradient-to-br from-orange-600 to-orange-700 rounded-lg flex items-center justify-center">
            <Building2 className="w-4 h-4 text-white" />
          </div>
        )}
        <span className="font-semibold hidden md:inline">
          {dbaName}
        </span>
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && userCompanies.length > 1 && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-64 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg shadow-xl z-50">
            <div className="p-2">
              <div className="text-xs text-gray-400 px-3 py-2 font-semibold">
                Switch Company
              </div>
              {userCompanies.map((company) => (
                <button
                  key={company.id}
                  onClick={() => handleSwitch(company.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                    company.id === activeCompany.id
                      ? 'bg-[#ea580c]/20 text-[#ea580c]'
                      : 'text-gray-300 hover:bg-[#2A2A2A]'
                  }`}
                >
                  {logo ? (
                    <img src={logo} alt="Logo" className="w-8 h-8 object-contain rounded-lg flex-shrink-0" />
                  ) : (
                    <div className="w-8 h-8 bg-gradient-to-br from-orange-600 to-orange-700 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Building2 className="w-4 h-4 text-white" />
                    </div>
                  )}
                  <div className="flex-1 text-left">
                    <div className="font-medium">{dbaName}</div>
                    <div className="text-xs text-gray-500">{company.role}</div>
                  </div>
                  {company.id === activeCompany.id && (
                    <svg className="w-5 h-5 text-[#ea580c]" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// Helper function to extract page name from path
const getPageFromPath = (pathname: string): string => {
  // Strip query parameters and hash fragments from the pathname
  const pathWithoutQuery = pathname.split('?')[0].split('#')[0];
  return pathWithoutQuery.slice(1) || "landing";
};

// Protected Route Wrapper Component
function ProtectedRoutes({ children }: { children: React.ReactNode }) {
  const { user, loading, userRole } = useAuth();
  const currentPath = window.location.pathname.slice(1) || 'landing';
  // STRICT: Only landing pages and authentication pages are public
  // Everything else requires authentication
  const publicRoutes = [
    // Main landing pages
    'landing',
    'landing-page',
    'directory',
    'directory-landing-page',
    'home',
    '',

    // Section landing pages (marketing/info pages)
    'builds-landing-page',
    'handyman-landing-page',
    'demo-landing-page',
    'property-management-landing-page',
    'contractor-network-landing-page',
    'territory-landing-page',
    'emergency-services-landing-page',
    'marketing-hub-landing-page',

    // Marketing pages (public marketing materials)
    'marketing-trades-worker',
    'marketing-vendor',
    'marketing-subcontractor',

    // Authentication pages
    'login',
    'signup',
    'forgot-password',
    'reset-password',

    // Pricing page (so visitors can see plans before signing up)
    'pricing',
    'plans',

    // Investment pages (public - anyone can view opportunities)
    'investment-opportunities',
    'investment-calculator',

    // Store and tracking (public - anyone can browse and track)
    'public-store',
    'shop',
    'store',
    'order-tracking',
    'order-success',

    // Geo-targeted ad landing page (public opt-in)
    'local',
    'offer',
    'nearby',

    // Loyalty program (public — customers check their points)
    'loyalty',
    'rewards',

    // Affiliate program (public — anyone can join and share)
    'affiliate',
    'referral',
    'refer',

    // Subscribe & Save (public — customers sign up for recurring orders)
    'subscribe',
    'subscribe-and-save',
    'subscriptions',

    // Gift cards (public — customers buy and redeem)
    'gift-cards',
    'gift-card',
    'gifts',

    // Service booking (public — customers book jobs)
    'book',
    'booking',
    'services',
    'quote',

    // Application forms (lead generation - people apply then get login)
    'vendor-application',
    'subcontractor-application',
    'investor-application',
    'advertiser-application',
    'service-provider-application',
    'territory-application',
    'customer-registration',

    // Service request forms (lead generation)
    'request-service',
    'get-quote',

    // Customer portal (public view - allow visitors to explore features)
    'customer-portal',
    'customer-portal-app',

    // PermitAI (public - useful for anyone researching permits)
    'permit-ai',
    'permits',
    'building-codes',

    // Diagnostic pages (public - for debugging)
    'diagnostic-logos',
    'diagnostic-logos-debug',
    'upload-my-logo',
    'check-my-companies',
    'publish-my-branding',
    'fix-my-logo',
  ];

  const [redirecting, setRedirecting] = useState(false);

  console.log('🔒 [ProtectedRoutes] Rendering - loading:', loading, 'user:', !!user, 'currentPath:', currentPath);

  // Handle redirects in useEffect to avoid render issues
  useEffect(() => {
    console.log('🔒 [ProtectedRoutes] useEffect running');
    console.log('🔒 [ProtectedRoutes] redirecting:', redirecting);
    console.log('🔒 [ProtectedRoutes] loading:', loading);
    console.log('🔒 [ProtectedRoutes] user:', !!user);
    console.log('🔒 [ProtectedRoutes] currentPath:', currentPath);

    // Skip if already redirecting
    if (redirecting) {
      console.log('🔒 [ProtectedRoutes] Already redirecting, skipping...');
      return;
    }

    // Skip redirect logic if we're in the middle of a role switch
    const isRoleSwitching = sessionStorage.getItem('role_switching') === 'true';
    if (isRoleSwitching) {
      console.log('🔄 [ProtectedRoutes] Role switch in progress, skipping redirect logic');
      sessionStorage.removeItem('role_switching');
      return;
    }

    // Define portal pages list (used for owner redirect check)
    const portalPages = [
      'customer-portal-app',
      'investor-portal',
      'advertiser-portal',
      'vendor-portal',
      'subcontractor-portal',
      'employee-portal',
      'customer-portal',
      'property-manager-portal',
      'condo-manager-portal',
      'landlord-portal'
    ];

    // Check if user is authenticated
    const isAuthenticated = !!user;
    console.log('🔐 [ProtectedRoutes] Auth check - User:', !!user, 'Authenticated:', isAuthenticated);
    console.log('📍 [ProtectedRoutes] Current path:', currentPath, 'Is public:', publicRoutes.includes(currentPath));

    // Redirect to login if not authenticated and trying to access protected route
    if (!loading && !isAuthenticated && !publicRoutes.includes(currentPath)) {
      console.log("🔒 [ProtectedRoutes] REDIRECTING TO LOGIN - user not authenticated");
      setRedirecting(true);
      window.location.href = '/login';
      return;
    }

    // Get user profile and account type
    const currentUserProfile = localStorage.getItem('currentUserProfile');
    let accountType = 'customer'; // Default
    let userEmail = '';

    // CRITICAL: Also check user object from auth context for email
    if (user && user.email) {
      userEmail = user.email;
    }

    if (currentUserProfile) {
      try {
        const profile = JSON.parse(currentUserProfile);
        accountType = profile.accountType || 'customer';
        // Prefer email from profile, but fallback to user object
        if (profile.email) {
          userEmail = profile.email;
        }

        console.log('👤 [ProtectedRoutes] RAW profile from localStorage:', profile);
        console.log('👤 [ProtectedRoutes] Extracted - accountType:', accountType, 'userEmail:', userEmail);

        // CRITICAL: Force owner email to always be treated as owner
        const OWNER_EMAIL = 'ericerb555@proton.me';
        if (userEmail.toLowerCase() === OWNER_EMAIL.toLowerCase()) {
          console.log('👑 [ProtectedRoutes] OWNER EMAIL DETECTED!');
          if (accountType !== 'owner') {
            console.log('👑 [ProtectedRoutes] FORCE: Setting accountType to owner');
            accountType = 'owner';
            // Update the stored profile
            profile.accountType = 'owner';
            localStorage.setItem('currentUserProfile', JSON.stringify(profile));
            const userProfiles = JSON.parse(localStorage.getItem('userProfiles') || '{}');
            userProfiles[userEmail.toLowerCase()] = profile;
            localStorage.setItem('userProfiles', JSON.stringify(userProfiles));
          }
        }

        console.log('👤 [ProtectedRoutes] FINAL - accountType:', accountType, 'userEmail:', userEmail);
      } catch (e) {
        console.error('Error parsing user profile:', e);
      }
    }

    // Define portal home pages for each account type
    const portalHomePages: Record<string, string> = {
      'customer': 'customer-portal-app',
      'investor': 'investor-portal',
      'advertiser': 'advertiser-portal',
      'vendor': 'vendor-portal',
      'subcontractor': 'subcontractor-portal',
      'employee': 'employee-portal',
      'property_manager': 'property-management-hub',
      'condo_manager': 'condo-manager-portal',
      'landlord': 'landlord-portal',
    };

    // Admin/Owner routes that should be accessible to elevated users
    const adminRoutes = [
      'unified-dashboard',
      'owners-dashboard',
      'master-admin-dashboard',
      'admin-dashboard',
      'admin-advanced-dashboard',
      'company-setup',
      'company-recovery',
      'company-data-restoration',
      'user-management-hub',
      'subscription-hub',
      'cohort-management',
      'investment-management',
      'module-manager',
      'settings',
      'admin-alerts',
    ];

    // Define allowed routes for each portal type (base access without subscriptions)
    const portalAllowedRoutes: Record<string, string[]> = {
      'customer': [
        'customer-portal-app',
        'customer-app',
        'customer-portal',
        'materials-center',
        'materials-hub',
        'public-store',
        'order-tracking',
        'customer-quote-approval',
      ],
      'investor': [
        'investor-portal',
        'investor-app',
        'public-store',
        'order-tracking',
      ],
      'advertiser': [
        'advertiser-portal',
        'advertiser-app',
        'public-store',
        'order-tracking',
      ],
      'vendor': [
        'vendor-portal',
        'public-store',
        'order-tracking',
        'materials-center',
      ],
      'subcontractor': [
        'subcontractor-portal',
        'public-store',
        'order-tracking',
        'materials-center',
        'service-scheduling',
      ],
      'employee': [
        'employee-portal',
        'employee-mobile-app',
        'mobile-hub',
        'service-scheduling',
        'time-tracking',
        'change-order-camera',
      ],
      'property_manager': [
        'property-management-hub',
        'crm',
        'service-scheduling',
        'materials-center',
        'public-store',
        'order-tracking',
      ],
      'condo_manager': [
        'condo-manager-portal',
        'property-management-hub',
        'crm',
        'service-scheduling',
        'materials-center',
        'public-store',
        'order-tracking',
      ],
      'landlord': [
        'landlord-portal',
        'property-management-hub',
        'crm',
        'service-scheduling',
        'materials-center',
        'public-store',
        'order-tracking',
      ],
    };

    // Helper function to check if user has elevated permissions
    const hasElevatedPermissions = (accountType: string): boolean => {
      const elevatedRoles = ['admin', 'owner', 'master_admin', 'management'];
      return elevatedRoles.includes(accountType);
    };

    // Helper function to check if user has CRM access
    const hasCRMAccess = (accountType: string): boolean => {
      const crmRoles = ['admin', 'owner', 'master_admin', 'management', 'property_manager'];
      return crmRoles.includes(accountType);
    };

    // Helper function to get user's subscription/granted access
    const getGrantedAccess = (userEmail: string): string[] => {
      try {
        const subscriptions = JSON.parse(localStorage.getItem('userSubscriptions') || '{}');
        const userSub = subscriptions[userEmail.toLowerCase()];
        if (userSub && userSub.grantedRoutes) {
          return userSub.grantedRoutes;
        }
      } catch (e) {
        console.error('Error getting granted access:', e);
      }
      return [];
    };

    // Check if user has elevated permissions (admin, owner, management)
    const isElevated = hasElevatedPermissions(accountType);
    console.log('👑 [ProtectedRoutes] Elevated permissions:', isElevated);

    // CRITICAL: Owner email ALWAYS goes to command center
    const PLATFORM_OWNER_EMAIL = 'ericerb555@proton.me';
    const isPlatformOwner = userEmail.toLowerCase() === PLATFORM_OWNER_EMAIL.toLowerCase();

    console.log('🔍 [ProtectedRoutes] isPlatformOwner:', isPlatformOwner, 'userEmail:', userEmail);
    console.log('🔍 [ProtectedRoutes] currentPath:', currentPath);
    console.log('🔍 [ProtectedRoutes] accountType:', accountType);

    // Redirect authenticated users away from login/signup to their portal or dashboard
    // UNLESS they're trying to subscribe to a new plan (selected_cohort in localStorage)
    const hasSelectedCohort = localStorage.getItem('selected_cohort');

    if (!loading && isAuthenticated && (currentPath === 'login' || currentPath === 'signup') && currentPath !== '' && currentPath !== 'landing') {
      // Allow signup if user is subscribing to a new plan
      if (currentPath === 'signup' && hasSelectedCohort) {
        console.log("✅ [ProtectedRoutes] Allowing signup - user subscribing to plan:", hasSelectedCohort);
        // Don't redirect - let them proceed to signup/subscription page
      } else if (isPlatformOwner || isElevated) {
        // Elevated users (admin, owner, master_admin, management) go to command center
        console.log("✅ [ProtectedRoutes] REDIRECTING TO COMMAND CENTER - elevated user");
        setRedirecting(true);
        setTimeout(() => {
          window.location.href = '/unified-dashboard';
        }, 100);
        return;
      } else {
        const portalHome = portalHomePages[accountType] || 'customer-portal-app';
        console.log(`👤 [ProtectedRoutes] REDIRECTING TO PORTAL - ${accountType} → ${portalHome}`);
        setRedirecting(true);
        setTimeout(() => {
          window.location.href = `/${portalHome}`;
        }, 100);
        return;
      }
    }

    // CRITICAL: Platform owner gets full access to admin routes
    if (isPlatformOwner && !publicRoutes.includes(currentPath) && !portalPages.includes(currentPath)) {
      // Platform owner is trying to access a route - allow it (they have full access)
      console.log('👑 [ProtectedRoutes] Platform owner - full access to all routes');
      return;
    }

    // Allow anyone to view unified-dashboard (command center)
    // Non-elevated users will see limited/demo version
    // Removed redirect to portal for unified-dashboard access

    // Skip route checks for public routes
    if (publicRoutes.includes(currentPath)) {
      console.log('🔒 [ProtectedRoutes] Public route, no restrictions');
      return;
    }

    // CRITICAL: Platform owner OR elevated users get full access - skip ALL checks
    // Also allow access to admin routes for elevated users
    if (isPlatformOwner || isElevated || adminRoutes.includes(currentPath)) {
      console.log('👑 [ProtectedRoutes] Platform owner, elevated user, or admin route - FULL ACCESS GRANTED to:', currentPath);
      console.log('👑 isPlatformOwner:', isPlatformOwner, 'isElevated:', isElevated, 'isAdminRoute:', adminRoutes.includes(currentPath));
      return;
    }

    // DISABLED: CRM and route restrictions for portals - portals handle their own access
    // This prevents the blinking/redirect loop when switching roles
    console.log('✅ [ProtectedRoutes] All portal access allowed - portals handle their own permissions');
    
    console.log('🔒 [ProtectedRoutes] No redirect needed, rendering children');
  }, [user, loading, currentPath, redirecting]);

  // Show loading while checking auth ONLY on initial load (no user yet)
  // If user is already set, skip the loading screen to prevent post-login blink
  if (loading && !user) {
    console.log('🔒 [ProtectedRoutes] Showing loading state');
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  // Show redirecting state
  if (redirecting) {
    console.log('🔒 [ProtectedRoutes] Showing redirecting state');
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="text-white">Redirecting...</div>
      </div>
    );
  }

  // Check if user is authenticated
  const isAuthenticated = !!user;

  // Don't render protected content if not authenticated
  if (!isAuthenticated && !publicRoutes.includes(currentPath)) {
    console.log('🔒 [ProtectedRoutes] Not authenticated, showing login prompt');
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="text-white">Please log in to continue...</div>
      </div>
    );
  }

  console.log('🔒 [ProtectedRoutes] Rendering children');
  return <>{children}</>;
}

export default function App() {
  console.log("🚀 App component initializing...");
  console.log("🚀 Current URL:", window.location.href);
  console.log("🚀 Current pathname:", window.location.pathname);

  const [isPageReady, setIsPageReady] = useState(true); // Start ready to avoid loading delays

  // ULTRA-CRITICAL: Fix owner email account type on EVERY app load
  useEffect(() => {
    const OWNER_EMAIL = 'ericerb555@proton.me';
    const currentUserProfile = localStorage.getItem('currentUserProfile');

    // Define portal pages array (used in multiple places)
    const portalPages = [
      '/customer-portal-app',
      '/investor-portal',
      '/advertiser-portal',
      '/vendor-portal',
      '/subcontractor-portal',
      '/employee-portal',
      '/customer-portal',
      '/property-manager-portal',
      '/condo-manager-portal',
      '/landlord-portal'
    ];

    // CRITICAL: If no one is logged in, auto-login the owner
    if (!currentUserProfile) {
      console.log('👑 [APP INIT] No user logged in - checking for owner profile');
      const userProfiles = JSON.parse(localStorage.getItem('userProfiles') || '{}');
      const ownerProfile = userProfiles[OWNER_EMAIL.toLowerCase()];

      if (ownerProfile) {
        console.log('👑 [APP INIT] Found owner profile - auto-logging in');
        ownerProfile.accountType = 'owner'; // Ensure correct type
        localStorage.setItem('currentUserProfile', JSON.stringify(ownerProfile));
        // Reload to apply the new profile
        window.location.reload();
        return;
      }
    }

    if (currentUserProfile) {
      try {
        const profile = JSON.parse(currentUserProfile);
        const userEmail = profile.email || '';
        const currentPath = window.location.pathname;

        if (userEmail.toLowerCase() === OWNER_EMAIL.toLowerCase()) {
          console.log('👑 [APP INIT] Owner email detected:', userEmail);
          console.log('👑 [APP INIT] Current accountType:', profile.accountType);
          console.log('👑 [APP INIT] Current path:', currentPath);

          let needsUpdate = false;

          // Fix accountType if wrong
          if (profile.accountType !== 'owner') {
            console.log('👑🚨 [APP INIT] WRONG accountType - fixing...');
            profile.accountType = 'owner';
            profile.fullName = 'Eric Erb';
            profile.phone = '6177100058';
            needsUpdate = true;
          }

          // Save profile if it was updated
          if (needsUpdate) {
            localStorage.setItem('currentUserProfile', JSON.stringify(profile));
            const userProfiles = JSON.parse(localStorage.getItem('userProfiles') || '{}');
            userProfiles[userEmail.toLowerCase()] = profile;
            localStorage.setItem('userProfiles', JSON.stringify(userProfiles));
            console.log('👑✅ [APP INIT] Profile corrected');
          }

          // If owner is on a portal page, redirect to unified dashboard
          if (portalPages.some(p => currentPath.startsWith(p))) {
            console.log('👑🚨 [APP INIT] OWNER ON PORTAL PAGE - REDIRECTING TO COMMAND CENTER');
            window.location.replace('/unified-dashboard');
            return;
          }
        }
      } catch (e) {
        console.error('Error checking owner profile:', e);
      }
    }
  }, []); // Run once on mount

  // Suppress html2canvas iframe errors and fetch errors
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      // Suppress html2canvas iframe message abort errors
      if (event.message?.includes('IframeMessageAbortError') ||
          event.message?.includes('message port was destroyed')) {
        console.warn('⚠️ Suppressed html2canvas iframe error (non-critical)');
        event.preventDefault();
        return;
      }

      // Suppress Failed to fetch errors (already handled by components)
      if (event.message?.includes('Failed to fetch') ||
          event.message?.includes('NetworkError') ||
          event.message?.includes('fetch')) {
        console.warn('⚠️ Network fetch error (handled by component)');
        event.preventDefault();
        return;
      }

      // Log ANY other error so we can debug black screen issues
      console.error('🔴 CRITICAL ERROR:', event.message, event.error);
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      // Suppress fetch-related promise rejections
      const reason = event.reason?.message || event.reason?.toString() || '';
      if (reason.includes('Failed to fetch') ||
          reason.includes('NetworkError') ||
          reason.includes('fetch') ||
          reason.includes('Network request failed')) {
        console.warn('⚠️ Unhandled network promise rejection (suppressed):', reason);
        event.preventDefault();
        return;
      }

      // Log other unhandled rejections
      console.error('🔴 Unhandled Promise Rejection:', event.reason);
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  // Set page ready after initial mount
  useEffect(() => {
    console.log("📍 Setting page ready");
    // Use setTimeout to ensure this happens after the initial render completes
    // This prevents suspension errors during the first render cycle
    const timer = setTimeout(() => {
      console.log("✅ Page is now ready!");
      setIsPageReady(true);
    }, 10); // Small delay to ensure everything is mounted
    
    // Emergency fallback - force page ready after 2 seconds max
    const emergencyTimer = setTimeout(() => {
      console.log("⚠️ Emergency timeout - forcing page ready");
      setIsPageReady(true);
    }, 2000);
    
    return () => {
      clearTimeout(timer);
      clearTimeout(emergencyTimer);
    };
  }, []);

  console.log("🔄 Rendering App component...");
  console.log("🔄 isPageReady:", isPageReady);

  // Show loading fallback until page is ready - DO THIS BEFORE ANYTHING ELSE
  if (!isPageReady) {
    console.log("⏳ Page not ready yet, showing loading fallback");
    return <LoadingFallback />;
  }

  // Only render the main app content when ready
  return <AppContent />;
}

// Navigation Header Component - Must be inside UserProvider
function NavigationHeader({ currentPage, navigate }: { currentPage: string; navigate: (page: string) => void }) {
  const { user } = useUser();
  const [logo, setLogo] = useState<string>(phoenixLogo);

  // Load company logo
  useEffect(() => {
    const loadLogo = () => {
      try {
        const logoVariants = localStorage.getItem('company_logo_variants');
        if (logoVariants && logoVariants !== 'undefined' && logoVariants !== 'null') {
          const logos = JSON.parse(logoVariants);
          setLogo(logos.logo_primary || logos.logo_horizontal || null);
        }
      } catch (error) {
        console.error('Error loading logo:', error);
      }
    };
    loadLogo();
  }, []);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-[#1A1A1A] border-b border-[#2A2A2A]">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-4">
          {/* Company Logo/Name */}
          <CompanySelector />

          {/* Owner's Dashboard Button - Only visible to Platform Owners */}
          {user?.role === UserRole.PLATFORM_OWNER && (
            <button
              onClick={() => navigate("owners-dashboard")}
              className="flex items-center gap-2 hover:opacity-80 transition-opacity"
            >
              {logo ? (
                <img src={logo} alt="Logo" className="w-5 h-5 object-contain" />
              ) : (
                <Crown className="w-5 h-5 text-[#ea580c]" />
              )}
              <span className="text-white font-semibold hidden lg:inline">
                Owner's Dashboard
              </span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-400 hidden md:inline">
            {currentPage
              .split("-")
              .map(
                (word) =>
                  word.charAt(0).toUpperCase() +
                  word.slice(1),
              )
              .join(" ")}
          </span>
          
          {/* Role Switcher - Demo/Testing */}
          <RoleSwitcher />
          
          {/* Sign Out Button */}
          <SignOutButton />
        </div>
      </div>
    </header>
  );
}

// Separate component for the main app content - only instantiated when ready
function AppContent() {
  console.log("🎬 AppContent component starting...");
  
  const [currentPage, setCurrentPage] = useState(() => {
    // Initialize with the actual current path to avoid unnecessary state changes
    const path = getPageFromPath(window.location.pathname);
    console.log("🚀 Initial page state:", path);
    return path;
  });
  const [isPending, startPageTransition] = useTransition();
  
  console.log("📊 AppContent state initialized successfully");
  
  // Use deferred value to prevent suspension during navigation
  const deferredPage = useDeferredValue(currentPage);

  // FORCE CLEAR ALL SERVICE WORKERS AND CACHES ON STARTUP
  useEffect(() => {
    const clearAllCachesAndServiceWorkers = async () => {
      try {
        // Unregister ALL service workers
        if ("serviceWorker" in navigator) {
          const registrations =
            await navigator.serviceWorker.getRegistrations();
          for (const registration of registrations) {
            await registration.unregister();
            console.log("🗑️ Service worker unregistered");
          }
        }

        // Clear ALL caches
        if ("caches" in window) {
          const cacheNames = await caches.keys();
          for (const cacheName of cacheNames) {
            await caches.delete(cacheName);
            console.log("🗑️ Cache deleted:", cacheName);
          }
        }

        console.log(
          "✅ All service workers and caches cleared",
        );
      } catch (error) {
        // Silent - this is cleanup
      }
    };

    clearAllCachesAndServiceWorkers();
  }, []);

  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [menuOpen, setMenuOpen] = useState(false);
  const [expandedSection, setExpandedSection] = useState<
    string | null
  >(null);

  // Setup online/offline detection
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      console.log("✅ Back online");
    };

    const handleOffline = () => {
      setIsOnline(false);
      console.log("⚠️ Gone offline");
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Handle browser back/forward buttons
    const handlePopState = () => {
      startTransition(() => {
        setCurrentPage(getPageFromPath(window.location.pathname));
      });
    };
    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);

  console.log("📄 Current page:", currentPage);
  console.log("🌐 Online status:", isOnline);

  // Define page mapping once at top level so it can be accessed by navigate
  const pageMap: Record<string, any> = {
    // Landing Pages
    "landing": DirectoryLandingPage,
    "landing-page": DirectoryLandingPage,
    "directory": DirectoryLandingPage,
    "directory-landing-page": DirectoryLandingPage,

    // Section Landing Pages
    "builds-landing-page": BuildsLandingPage,
    "handyman-landing-page": HandymanLandingPage,
    "demo-landing-page": DemoLandingPage,
    "property-management-landing-page": PropertyManagementLandingPage,
    "territory-landing-page": TerritoryLandingPage,
    "emergency-services-landing-page": EmergencyServicesLandingPage,
    "marketing-hub-landing-page": MarketingHubLandingPage,

    // Authentication pages
    "sign-up": SignUp,
    signup: SignUp,

    // Dashboards
    dashboard: UnifiedDashboard,
    "unified-dashboard": UnifiedDashboard,
    "master-admin-dashboard": MasterAdminDashboard,
    "admin-dashboard": OwnersDashboard,
    "admin-advanced-dashboard": OwnersDashboard,
    "owners-dashboard": OwnersDashboard,
    "company-data-restoration": CompanyDataRestoration,
    "company-recovery": CompanyRecovery,
    "company-setup": CompanySetup,
    settings: OwnersDashboard, // Settings page routes to Owner's Dashboard
    "admin-alerts": AdminAlerts,
    "notification-settings": NotificationSettings,

    // Business Management
    customers: CustomersNew,
    invoices: InvoicesNew,
    "invoices-new": InvoicesNew, // Alias for invoices
    projects: ProjectsNew,
    "projects-new": ProjectsNew,

    // Production
    payroll: HREmployeeHub, // Payroll features are in HREmployeeHub

    // Hub Pages - Consolidated Views
    "job-tracking-hub": JobTrackingHub,
    "revenue-monetization-hub": RevenueMonetizationHub,
    "customer-management-hub": UnifiedCRMHub, // Redirect to new CRM Hub
    "customer-registration": CustomerRegistrationForm,
    "materials-estimating-hub": MaterialsCenter,
    "supplier-management-hub": SupplierManagementHub,
    "hr-employee-hub": HREmployeeHub,
    // REMOVED: DesignStructuralHub - file deleted, redirecting to DesignStudioPro
    "design-structural-hub": DesignStudioPro,
    "customer-quote-approval": CustomerQuoteApproval,

    // Vendors & eCommerce
    "vendors-admin-hub": VendorsAdminHub, // NEW: Consolidated vendor admin management
    "vendor-advertising-hub": VendorsAdminHub, // Legacy redirect to Vendors Admin Hub
    "vendor-management": VendorsAdminHub, // Legacy redirect to Vendors Admin Hub
    "vendor-api-management": VendorsAdminHub, // Legacy redirect to Vendors Admin Hub
    "vendor-application": VendorApplication, // NEW: Vendor application/signup form
    "subcontractor-application": SubcontractorApplication, // NEW: Subcontractor application/signup form
    "investor-application": InvestorApplication, // NEW: Investor application/signup form
    "advertiser-application": AdvertiserApplication, // NEW: Advertiser application/signup form
    "service-provider-application": ServiceProviderApplication, // NEW: Service Provider application/signup form
    "territory-application": TerritoryApplication, // NEW: Territory application/signup form
    "contractor-network-landing-page": ContractorNetworkLandingPage, // NEW: Contractor network landing page
    "dropshipper-admin": DropshipperAdmin,
    "public-store": PublicStore,
    "order-tracking": OrderTracking,
    "promotions-manager": PromotionsManager,
    "exit-intent": ExitIntentManager,
    "exit-intent-manager": ExitIntentManager,
    "live-chat": LiveChatManager,
    "live-chat-manager": LiveChatManager,
    "photo-importer": PhotoImporter,
    "marketing-automation": MarketingAutomation,
    "retargeting-pixels": RetargetingPixelSetup,
    "blog-manager": BlogManager,
    "review-surveys": ReviewSurveyManager,
    "influencer-tracker": InfluencerTracker,
    "keyword-tracker": KeywordTracker,
    "customer-portal": CustomerPortal,
    "ai-ranking-engine": AIRankingEngine,
    "auto-product-pilot": AutoProductPilot,
    "social-media-hub": SocialMediaHub,
    "email-lead-gen": EmailLeadGen,

    // Geo-targeted ad landing page
    "local": LocalLeadsLanding,
    "offer": LocalLeadsLanding,
    "nearby": LocalLeadsLanding,

    // Loyalty & Rewards
    "loyalty": LoyaltyProgram,
    "rewards": LoyaltyProgram,

    // QR Code Generator
    "qr-codes": QRCodeGenerator,
    "qr-generator": QRCodeGenerator,

    // Revenue Analytics
    "revenue-analytics": RevenueAnalytics,
    "analytics": RevenueAnalytics,

    // SMS Marketing
    "sms-marketing": SMSMarketing,
    "text-marketing": SMSMarketing,

    // Subscribe & Save
    "subscribe": SubscribeAndSave,
    "subscribe-and-save": SubscribeAndSave,
    "subscriptions": SubscribeAndSave,

    // Gift Cards
    "gift-cards": GiftCards,
    "gift-card": GiftCards,
    "gifts": GiftCards,

    // Product Reviews
    "reviews": ReviewsDashboard,
    "product-reviews": ReviewsDashboard,

    // Abandoned Cart Recovery
    "abandoned-carts": AbandonedCart,
    "abandoned-cart": AbandonedCart,
    "cart-recovery": AbandonedCart,

    // Coupon Manager
    "coupons": CouponManager,
    "coupon-manager": CouponManager,
    "promo-codes": CouponManager,

    // Lead CRM
    "crm": LeadCRM,
    "leads": LeadCRM,
    "lead-crm": LeadCRM,
    "pipeline": LeadCRM,

    // Analytics Dashboard
    "analytics": AnalyticsDashboard,
    "business-analytics": AnalyticsDashboard,
    "insights": AnalyticsDashboard,

    // Order Manager
    "orders": OrderManager,
    "order-manager": OrderManager,
    "order-history": OrderManager,

    // Flash Sale Manager
    "flash-sales": FlashSaleManager,
    "flash-sale": FlashSaleManager,
    "promotions": FlashSaleManager,

    // Invoice & Estimate Builder
    "invoices": InvoiceBuilder,
    "invoice": InvoiceBuilder,
    "estimates": InvoiceBuilder,

    // Service Booking
    "book": ServiceBooking,
    "booking": ServiceBooking,
    "services": ServiceBooking,
    "quote": ServiceBooking,

    // Affiliate Program
    "affiliate": AffiliateProgram,
    "referral": AffiliateProgram,
    "refer": AffiliateProgram,

    // CUSTOMER PORTAL - All customer interactions consolidated into single CustomerPortalView
    "customer-app": CustomerPortalApp,
    "customer-portal": CustomerPortalApp,
    "customer-portal-app": CustomerPortalApp,
    "customer-subscription-portal": CustomerPortalApp, // Subscription features built into main portal
    
    // System Management
    "user-management-hub": UserManagementHub,
    "user-management": UserManagementHub, // Redirect to hub with users tab
    "user-management-admin": UserManagementHub, // Redirect to hub with admin-users tab
    "role-management": UserManagementHub, // Redirect to hub with roles tab
    "subscription-hub": SubscriptionHub,
    "cohort-management": CohortManagement, // Direct access to Advanced Cohort Management
    "pricing": PricingPage, // Customer-facing pricing page
    "plans": PricingPage, // Alias for pricing page
    "investment-opportunities": InvestmentOpportunities, // Public investment opportunities browsing (everyone can view)
    "investment-management": InvestmentManagement, // Owner-only investment management dashboard
    "investment-calculator": InvestmentCalculator, // Detailed investment calculator with ROI breakdown

    // UNIFIED PROJECT PIPELINE - The ONE workflow for everything
    "work-order-management": WorkOrderManager,
    "unified-project-pipeline": UnifiedProjectPipeline,
    "enterprise-quote-workflow": UnifiedProjectPipeline, // REDIRECT to unified pipeline
    "quote-to-contract-workflow": UnifiedProjectPipeline, // REDIRECT to unified pipeline
    "work-request-tracking": UnifiedProjectPipeline, // REDIRECT to unified pipeline
    "quote-response-hub": UnifiedProjectPipeline, // REDIRECT to unified pipeline
    "work-request-hub": UnifiedProjectPipeline, // REDIRECT to unified pipeline
    "work-request-intake": UnifiedProjectPipeline, // REDIRECT to unified pipeline
    "work-request-form-editor": UnifiedProjectPipeline, // REDIRECT to unified pipeline
    "quote-prep": UnifiedProjectPipeline, // REDIRECT to unified pipeline - Quote preparation
    "project-pipeline": UnifiedProjectPipeline, // Alias
    "workflow": UnifiedProjectPipeline, // Alias
    "pipeline": UnifiedProjectPipeline, // Alias

    // REQUEST SERVICE - Combined Signup + Work Request Form for new customers
    "request-service": RequestServicePage,
    "get-quote": RequestServicePage, // Alias for "Get a Free Quote" buttons
    
    // MATERIALS CENTER - New unified materials management hub (Option 3)
    "materials-center": MaterialsCenter,
    "materials-hub": MaterialsCenter, // Redirect to new Materials Center
    "materials-database": MaterialsCenter, // Redirect with ?tab=database
    "materials-procurement-hub": MaterialsCenter, // Redirect with ?tab=procurement
    "material-estimating": MaterialsCenter, // Redirect with ?tab=estimating
    
    "pricing-settings": PricingSettings,
    "labor-rates-config": LaborRatesConfig,
    "bid-room": BidRoomV2,
    "service-scheduling": ServiceScheduling,
    "unified-calendar": CalendarScheduleView,
    "application-submissions": ApplicationSubmissions,

    // Phase 1: Financial & Payroll Systems
    "unified-payment-center": UnifiedPaymentCenter,
    "payment-center": UnifiedPaymentCenter, // Alias for unified-payment-center
    "financial-reconciliation": FinancialReconciliation,
    "job-financial-tracker": JobFinancialTracker,
    "work-order-completion-reports": WorkOrderCompletionReports,
    "completion-reports": WorkOrderCompletionReports, // Alias
    "customer-docs": CustomerDocs,
    "customer-documents": CustomerDocs,
    reports: EnterpriseReporting,

    // Phase 3: Project & Work Management
    "change-order-camera": ChangeOrderCameraApp,
    "waste-disposal-tracking": WasteDisposalTracking,
    "weather-job-site-monitor": WeatherJobSiteMonitor,
    "code-tracker": CodeTracker,
    "enterprise-coding-tracking": CodeTracker, // Legacy redirect to Code Tracker
    "master-scheduling": MasterScheduling,
    "master-schedule": MasterScheduling, // Alias for master-scheduling

    // Phase 4: Operations & Tools
    "product-data-sources": ProductDataSources,
    "purchase-orders": PurchaseOrders,

    // Communication & Collaboration
    messaging: Messaging,
    messages: Messaging,
    "enterprise-email": EnterpriseEmailManagement,

    // Company & System Management
    "enterprise-invoicing": InvoicesNew,
    "company-profile": BusinessProfilesHub,
    "landing-page-editor": LandingPageEditor,
    "website-settings": LandingPageEditor, // Alias
    "domain-management": LandingPageEditor, // Alias - domain management can be in landing page editor
    "theme-manager": LandingPageEditor, // Alias - theme manager can be in landing page editor
    "diagnostic-logos": DiagnosticLogos, // Logo diagnostic tool
    "diagnostic-logos-debug": DiagnosticLogosDebug, // Logo debug diagnostic tool
    "upload-my-logo": UploadMyLogo, // Simple logo uploader
    "check-my-companies": CheckMyCompanies, // Database company checker
    "publish-my-branding": PublishMyBranding, // Publish branding for public visitors
    "fix-my-logo": FixMyLogo, // One-click logo sync fix
    "doba-integration": DobaIntegration, // Doba dropshipping integration
    "spocket": SpocketIntegration,
    "spocket-integration": SpocketIntegration,
    "zendrop": ZendropIntegration,
    "zendrop-integration": ZendropIntegration,
    "property-revenue": PropertyRevenueHub,
    "property-revenue-intel": PropertyRevenueHub,
    "revenue-intel": PropertyRevenueHub,
    "property-ai-enterprise": PropertyAIEnterprise,
    "property-ai": PropertyAIEnterprise,
    "pai": PropertyAIEnterprise,
    "order-success": OrderSuccess,
    "store": DigitalStorefront,
    "digital-store": DigitalStorefront,
    "shop": DigitalStorefront,
    "digital-products": DigitalStorefront,
    "ad-creator": AdCreator,
    "ads": AdCreator,
    "promotions-creator": AdCreator,
    "document": DocumentViewer,
    "doc": DocumentViewer,
    "permit-ai": PermitAI,
    "permits": PermitAI,
    "building-codes": PermitAI,

    // Phase 5: Design & Content + Platform Management (FINAL)
    "design-studio-pro": DesignStudioPro,
    "structural-design": StructuralDesign,
    "social-media": SocialMediaManager,
    "social-media-manager": SocialMediaManager,
    "module-manager": ModuleManager,
    "module-access-control": ModuleManager,
    "referral-rewards": ReferralRewards,
    "employee-management": UserManagementHub,
    "ai-diagnostics": AIDiagnostics,
    "crm": UnifiedCRMHub, // Redirect to new CRM Hub
    "unified-crm": UnifiedCRMHub,
    "customer-management": UnifiedCRMHub, // Alias for unified CRM
    "property-management-hub": PropertyManagementHub,
    "property-management-test": PropertyManagementTest,
    "enterprise-hr": HREmployeeHub,
    "subcontractor-enterprise": SubcontractorEnterprise,
    "enterprise-reporting": EnterpriseReporting,
    services: Services,

    // Portal Pages - Role-specific portal views
    "portal-demo-hub": PortalDemoHub,
    "mobile-hub": MobileHub, // Mobile Hub - Portal Control Panel
    "employee-portal": EmployeePortalView, // Employee Portal - Direct access to employee features
    "on-call-portal": OnCallEmergencyPortal, // On-Call Emergency Portal - 24/7 emergency management

    // Role-specific portals with access-controlled features
    "vendor-portal": VendorPortalView,
    "advertiser-portal": AdvertiserPortalView,
    "subcontractor-portal": SubcontractorPortal,
    "investor-portal": InvestorPortalView,
    "admin-portal": AdminPortalView, // Platform Owner Admin Portal
    "enterprise-content-center": EnterpriseContentCenter,
    "territory-portal": TerritoryPortalView, // Territory Admin Portal
    "territory-admin-portal": PortalsHub,

    "property-manager-portal": PropertyManagerPortalView,
    "condo-manager-portal": CondoManagerPortalView,
    "landlord-portal": LandlordPortalView,
    "portal-demo-selector": PortalDemoSelector,
    "marketing-trades-worker": TradesWorkerMarketing,
    "marketing-vendor": VendorMarketing,
    "marketing-subcontractor": SubcontractorMarketing,
    "employee-mobile-app": EmployeeMobileApp,
    "owners-portal-v2": PortalDemoHub,
    "portal-access": PortalsHub,
    "portals-hub": PortalsHub,
    "portal-global-settings": PortalGlobalSettings,

    // Legacy portal routes - redirect to modern portals
    "condo-association-portal": PortalDemoHub,
    "vendor-portal-new": VendorPortalView,
    "stakeholder-hub": UnifiedDashboard,
    "mobile-app-hub": PortalsHub,
  };

  const navigate = (page: string) => {
    console.log("🧭 Navigating to:", page);
    // Use startTransition to avoid suspense errors during navigation
    // Update state and URL without full page reload
    const fullPath = page.startsWith('/') ? page.slice(1) : page;

    // Split the path from query parameters
    // For example: "investor-application?opportunity=PROP-025" -> ["investor-application", "opportunity=PROP-025"]
    const [basePath, ...queryParts] = fullPath.split('?');
    const queryString = queryParts.length > 0 ? '?' + queryParts.join('?') : '';

    console.log("🧭 Full path:", fullPath);
    console.log("🧭 Base path (for routing):", basePath);
    console.log("🧭 Query string:", queryString);
    console.log("🧭 Route exists in pageMap?", basePath in pageMap);

    startPageTransition(() => {
      console.log("🧭 Inside startTransition - setting state to:", basePath);
      // Set currentPage to just the base path (without query params) for routing
      setCurrentPage(basePath);
      // But push the full URL with query params to history
      window.history.pushState({}, '', `/${basePath}${queryString}`);
      window.scrollTo(0, 0);
      console.log("🧭 State set complete");
    });
    console.log("🧭 Navigate function complete");
  };

  // Expose navigate globally so portal components can jump to hub pages
  (window as any).__navigateApp = navigate;

  const toggleSection = (sectionName: string) => {
    setExpandedSection(
      expandedSection === sectionName ? null : sectionName,
    );
  };

  const renderPage = () => {
    // Use deferredPage instead of currentPage to prevent suspension
    const pageToRender = deferredPage;
    console.log("🎨 Rendering page:", pageToRender);
    console.log("🎨 pageToRender === 'directory-landing-page'?", pageToRender === 'directory-landing-page');
    console.log("🎨 pageToRender === 'directory'?", pageToRender === 'directory');

    // Handle deprecated routes with redirects FIRST - before any error logging
    const deprecatedRoutes: { [key: string]: string } = {
      "home": "landing",
      "customer-dashboard": "customer-app",
      "supplier-respond": "supplier-management-hub?tab=respond",
      "supplier-connect": "supplier-management-hub?tab=connect",
      "supplier-audit": "supplier-management-hub?tab=audit",
    };

    if (deprecatedRoutes[pageToRender]) {
      console.log(`🔄 Redirecting deprecated route ${pageToRender} to ${deprecatedRoutes[pageToRender]}`);
      window.location.href = `/${deprecatedRoutes[pageToRender]}`;
      return (
        <div style={{ padding: "40px", color: "#ffffff", backgroundColor: "#0A0A0A", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <p>Redirecting...</p>
        </div>
      );
    }

    // Handle non-lazy pages separately
    if (pageToRender === "landing") {
      console.log("✅ Rendering DirectoryLandingPage");
      return <DirectoryLandingPage onNavigate={navigate} />;
    }
    if (pageToRender === "landing-page") {
      console.log("✅ Rendering DirectoryLandingPage (landing-page)");
      return <DirectoryLandingPage onNavigate={navigate} />;
    }
    if (pageToRender === "home") {
      console.log("✅ Rendering DirectoryLandingPage (home)");
      return <DirectoryLandingPage onNavigate={navigate} />;
    }
    if (pageToRender === "directory" || pageToRender === "directory-landing-page") {
      console.log("✅ Rendering DirectoryLandingPage - early return!");
      console.log("✅ DirectoryLandingPage component:", DirectoryLandingPage);
      return <DirectoryLandingPage onNavigate={navigate} />;
    }
    if (pageToRender === "login") {
      return <Login onNavigate={navigate} />;
    }
    if (pageToRender === "signup") {
      return <SignUp onNavigate={navigate} />;
    }
    if (pageToRender === "forgot-password") {
      return <ForgotPassword onNavigate={navigate} />;
    }
    if (pageToRender === "reset-password") {
      return <ResetPassword onNavigate={navigate} />;
    }

    console.log("🔍 Looking for:", pageToRender);
    console.log("🔍 Route exists in pageMap?", pageToRender in pageMap);
    console.log("🔍 Component type:", typeof pageMap[pageToRender]);
    console.log("🔍 DirectoryLandingPage import:", typeof DirectoryLandingPage);
    console.log("🔍 pageMap['directory-landing-page']:", typeof pageMap['directory-landing-page']);

    const PageComponent = pageMap[pageToRender];

    if (!PageComponent) {
      console.error(
        "❌ Page component not found for:",
        pageToRender,
      );
      console.error("❌ Available routes:", Object.keys(pageMap).join(', '));
      
      // Auto-redirect common mistakes
      const commonRedirects: { [key: string]: string } = {
        "business-profiles": "company-profile",
        "companies": "company-profile",
        "business-profile": "company-profile",
        "dashboard": "unified-dashboard",
        "shop": "public-store",
        "store": "public-store",
        "": "landing",
      };
      
      if (commonRedirects[pageToRender]) {
        console.log(`🔄 Auto-redirecting ${pageToRender} to ${commonRedirects[pageToRender]}`);
        setTimeout(() => navigate(commonRedirects[pageToRender]), 100);
      }
      
      return (
        <div
          style={{
            padding: "40px",
            color: "#ffffff",
            backgroundColor: "#0A0A0A",
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "column",
          }}
        >
          <h1
            style={{
              color: "#ea580c",
              fontSize: "24px",
              marginBottom: "16px",
            }}
          >
            Page not found: {pageToRender || "(empty)"}
          </h1>
          <p style={{ color: "#888", marginBottom: "24px" }}>
            Looking for Business Profiles? Try the Company Profile page.
          </p>
          <div style={{ display: "flex", gap: "12px" }}>
            <button
              onClick={() => navigate("company-profile")}
              style={{
                padding: "12px 24px",
                backgroundColor: "#ea580c",
                color: "white",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer",
                fontSize: "16px"
              }}
            >
              Go to Business Profiles
            </button>
            <button
              onClick={() => navigate("unified-dashboard")}
              style={{
                padding: "12px 24px",
                backgroundColor: "#2A2A2A",
                color: "white",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer",
                fontSize: "16px"
              }}
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      );
    }

    console.log(
      "✅ Page component found:",
      pageToRender,
      typeof PageComponent,
    );

    // Wrap in error boundary
    try {
      // CustomerPortalApp doesn't need onNavigate prop - it handles its own navigation
      const shouldPassNavigate = pageToRender !== 'customer-portal-app';

      // PermitAI: pass address/workType from URL query params
      if (pageToRender === 'permit-ai' || pageToRender === 'permits' || pageToRender === 'building-codes') {
        const qp = new URLSearchParams(window.location.search);
        return <PageComponent
          onNavigate={navigate}
          initialAddress={qp.get('address') || ''}
          initialWorkType={qp.get('workType') || ''}
          initialWorkOrderId={qp.get('workOrderId') || undefined}
        />;
      }

      return shouldPassNavigate ? (
        <PageComponent onNavigate={navigate} />
      ) : (
        <PageComponent />
      );
    } catch (error) {
      console.error(
        "❌ Error rendering page:",
        pageToRender,
        error,
      );
      return (
        <div
          style={{
            padding: "40px",
            color: "#ffffff",
            backgroundColor: "#0A0A0A",
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "column",
          }}
        >
          <h1
            style={{
              color: "#ea580c",
              fontSize: "24px",
              marginBottom: "16px",
            }}
          >
            Error loading page: {pageToRender}
          </h1>
          <p style={{ color: "#9ca3af", marginBottom: "24px" }}>
            {String(error)}
          </p>
          <button
            onClick={() => navigate("unified-dashboard")}
            style={{
              padding: "12px 24px",
              backgroundColor: "#ea580c",
              color: "#ffffff",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
              fontSize: "16px",
            }}
          >
            Go to Dashboard
          </button>
        </div>
      );
    }
  };

  console.log("🎨 About to render AppContent JSX...");
  console.log("🎨 Current page before render:", currentPage);

  return (
    <ErrorBoundary>
      <Suspense fallback={<LoadingFallback />}>
        <ThemeProvider>
          <AuthProvider>
            <UserProvider>
              <ProtectedRoutes>
                <CompanyContextProvider>
                  <ActiveCompanyProvider>
                    <NavigationContext.Provider value={{ navigate }}>
                  <DataInitializer />
                  <div className="min-h-screen bg-[#0A0A0A]" style={{ display: 'flex', flexDirection: 'column', width: '100vw', margin: 0, padding: 0 }}>
                    {/* Fixed Navigation Header */}
                    {currentPage !== "landing" &&
                      currentPage !== "landing-page" &&
                      currentPage !== "directory" &&
                      currentPage !== "directory-landing-page" &&
                      currentPage !== "builds-landing-page" &&
                      currentPage !== "handyman-landing-page" &&
                      currentPage !== "demo-landing-page" &&
                      currentPage !== "property-management-landing-page" &&
                      currentPage !== "contractor-network-landing-page" &&
                      currentPage !== "territory-landing-page" &&
                      currentPage !== "emergency-services-landing-page" &&
                      currentPage !== "marketing-hub-landing-page" &&
                      currentPage !== "login" &&
                      currentPage !== "signup" &&
                      currentPage !== "forgot-password" &&
                      currentPage !== "reset-password" && (
                        <NavigationHeader currentPage={currentPage} navigate={navigate} />
                      )}

                    {/* Main content */}
                    <div className="w-full" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>

                      {/* Header Spacer */}
                      {currentPage !== "landing" &&
                        currentPage !== "landing-page" &&
                        currentPage !== "directory" &&
                        currentPage !== "directory-landing-page" &&
                        currentPage !== "builds-landing-page" &&
                        currentPage !== "handyman-landing-page" &&
                        currentPage !== "demo-landing-page" &&
                        currentPage !== "property-management-landing-page" &&
                        currentPage !== "contractor-network-landing-page" &&
                        currentPage !== "territory-landing-page" &&
                        currentPage !== "emergency-services-landing-page" &&
                        currentPage !== "marketing-hub-landing-page" &&
                        currentPage !== "login" &&
                        currentPage !== "signup" && (
                          <div className="h-16 w-full" />
                        )}
                      {/* Wrap page rendering in additional Suspense to handle lazy loading during navigation */}
                      <Suspense fallback={<LoadingFallback />}>
                        <div className="w-full flex justify-center">
                          {renderPage()}
                        </div>
                      </Suspense>

                      {/* Return to Landing Page Footer */}
                      {currentPage !== "landing" &&
                        currentPage !== "landing-page" &&
                        currentPage !== "directory" &&
                        currentPage !== "directory-landing-page" && (
                          <div className="w-full flex justify-center py-12 px-4 border-t border-[#2A2A2A] bg-[#0A0A0A] mt-12">
                            <button
                              onClick={() => navigate("directory-landing-page")}
                              className="flex items-center gap-2 px-6 py-3 bg-[#1A1A1A] hover:bg-[#2A2A2A] border border-[#2A2A2A] rounded-xl text-gray-300 hover:text-white transition-all"
                            >
                              <Home className="w-5 h-5" />
                              <span>Return to Landing Page</span>
                            </button>
                          </div>
                        )}
                    </div>

                    {/* Toast Notifications */}
                    <Toaster />

                    {/* Exit-Intent Popup — global, config-driven */}
                    <ExitIntentPopup />

                    {/* Live Chat Widget — global, config-driven */}
                    <LiveChatWidget />

                    {/* Global Work Request Widget — visible on every page */}
                    <WorkRequestWidget />

                    {/* Global Store Access Button — visible on every page */}
                    <StoreAccessButton />

                    {/* Theme Manager */}
                    <ThemeManager />
                  </div>
                </NavigationContext.Provider>
                  </ActiveCompanyProvider>
              </CompanyContextProvider>
            </ProtectedRoutes>
            </UserProvider>
          </AuthProvider>
        </ThemeProvider>
      </Suspense>
    </ErrorBoundary>
  );
}