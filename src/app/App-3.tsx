// App.tsx - Main Application Entry Point with Navigation
// Updated: 2026-03-22 - Workflow cleanup complete: ALL workflow routes consolidated to UnifiedProjectPipeline

// CRITICAL: Import error suppression FIRST before anything else
import "./utils/suppressErrors";

// CRITICAL: Import data persistence system to prevent data loss
import "./utils/dataPersistence";

// CRITICAL: Run migrations on app load
import { migrateUserProfiles } from "./utils/migrationHelper";

// CRITICAL: Initialize owner profile on app load
import { initializeOwnerProfile } from "./utils/initializeOwnerProfile";

// Run migration immediately
if (typeof window !== 'undefined') {
  const migrated = migrateUserProfiles();
  if (migrated) {
    console.log('✅ User profile migration completed');
  }

  // Initialize owner profile
  initializeOwnerProfile();
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
} from "lucide-react";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { CompanyContextProvider, useCompany } from "./contexts/CompanyContext";
import { UserProvider, useUser } from "./lib/user-context";
import { UserRole } from "./lib/rbac";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { Toaster } from "./components/ui/sonner";
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
import LandingPage from "./pages/LandingPage";
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
// Hub Pages - Consolidated Navigation
import JobTrackingHub from "./pages/JobTrackingHub";
import RevenueMonetizationHub from "./pages/RevenueMonetizationHub";
import CustomerManagementHub from "./pages/CustomerManagementHub";
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
import MaterialsCenter from "./pages/MaterialsCenter";
import PricingSettings from "./pages/PricingSettings";
import LaborRatesConfig from "./components/LaborRatesConfig";
import BidRoomV2 from "./pages/BidRoomV2";
import ServiceScheduling from "./pages/ServiceScheduling";
import CRMHub from "./pages/CRMHub";
import PropertyManagementHub from "./pages/PropertyManagementHub";
import PropertyManagementTest from "./components/PropertyManagementTest";
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
      { name: "Unified Calendar", path: "unified-calendar" },
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
];

// Sign Out Button Component
function SignOutButton() {
  const { signOut, user, isDemoMode } = useAuth();

  const handleSignOut = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    console.log('🔴 Sign out clicked!');

    try {
      // Clear ALL localStorage to force fresh login
      console.log('🔴 Clearing ALL localStorage...');
      localStorage.clear();
      sessionStorage.clear();

      console.log('🔴 Calling signOut...');
      signOut();

      console.log('🔴 Force redirecting to login...');
      // Use replace instead of href to prevent back button issues
      window.location.replace('/login');
    } catch (error) {
      console.error('Sign out error:', error);
      // Force redirect anyway
      localStorage.clear();
      sessionStorage.clear();
      window.location.replace('/login');
    }
  };

  // Always show sign out button if there's any user data
  const hasProfile = localStorage.getItem('currentUserProfile');

  console.log('SignOutButton render - user:', !!user, 'isDemoMode:', isDemoMode, 'hasProfile:', !!hasProfile);

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

  // Handle case where context is still loading
  if (!companyContext) {
    return (
      <div className="flex items-center gap-2 px-3 py-2">
        <div className="w-8 h-8 bg-gradient-to-br from-orange-600 to-orange-700 rounded-lg flex items-center justify-center">
          <Building2 className="w-4 h-4 text-white" />
        </div>
        <span className="font-semibold hidden md:inline text-white">Black Phoenix Builds</span>
      </div>
    );
  }

  const { activeCompany, userCompanies = [], switchCompany } = companyContext;
  const [isOpen, setIsOpen] = useState(false);

  // Show app branding if no company is selected
  if (!activeCompany || !userCompanies || userCompanies.length === 0) {
    return (
      <div className="flex items-center gap-2 px-3 py-2">
        <div className="w-8 h-8 bg-gradient-to-br from-orange-600 to-orange-700 rounded-lg flex items-center justify-center">
          <Building2 className="w-4 h-4 text-white" />
        </div>
        <span className="font-semibold hidden md:inline text-white">Black Phoenix Builds</span>
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
        <div className="w-8 h-8 bg-gradient-to-br from-orange-600 to-orange-700 rounded-lg flex items-center justify-center">
          <Building2 className="w-4 h-4 text-white" />
        </div>
        <span className="font-semibold hidden md:inline">{activeCompany.name}</span>
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
                  <div className="w-8 h-8 bg-gradient-to-br from-orange-600 to-orange-700 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Building2 className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex-1 text-left">
                    <div className="font-medium">{company.name}</div>
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
  return pathname.slice(1) || "landing";
};

// Protected Route Wrapper Component
function ProtectedRoutes({ children }: { children: React.ReactNode }) {
  const { user, loading, isDemoMode, userRole } = useAuth();
  const currentPath = window.location.pathname.slice(1) || 'landing';
  const publicRoutes = [
    'landing',
    'landing-page',
    'home',
    'login',
    'signup',
    'forgot-password',
    'reset-password',
    'pricing',
    'plans',
    'investment-opportunities',
    'customer-portal-app',
    'portal-access',
    // Application forms - should be publicly accessible
    'vendor-application',
    'investor-application',
    'advertiser-application',
    'service-provider-application',
    'territory-application',
    'customer-registration',
    // Public store and tracking
    'public-store',
    'order-tracking',
    // Quote approval
    'customer-quote-approval',
    // Pricing and plans - publicly viewable
    'cohort-management',
    // Command Center - Allow demo/unauthenticated access
    'unified-dashboard',
    // Portal demos - publicly viewable
    'landlord-portal',
    'property-manager-portal',
    'condo-manager-portal',
    'portal-demo-selector',
    'on-call-portal',
    // Marketing pages - publicly viewable
    'marketing-trades-worker',
    'marketing-vendor',
    'marketing-subcontractor',
    ''
  ];
  
  // Customer-only accessible routes
  const customerAllowedRoutes = [
    'customer-portal-app',
    'customer-app',
    'customer-portal',
    'materials-center',
    'materials-hub',
    'public-store',
    'order-tracking',
    'customer-quote-approval',
  ];
  
  const [redirecting, setRedirecting] = useState(false);

  console.log('🔒 [ProtectedRoutes] Rendering - loading:', loading, 'user:', !!user, 'isDemoMode:', isDemoMode, 'currentPath:', currentPath);

  // Handle redirects in useEffect to avoid render issues
  useEffect(() => {
    console.log('🔒 [ProtectedRoutes] useEffect running');
    console.log('🔒 [ProtectedRoutes] redirecting:', redirecting);
    console.log('🔒 [ProtectedRoutes] loading:', loading);
    console.log('🔒 [ProtectedRoutes] user:', !!user);
    console.log('🔒 [ProtectedRoutes] isDemoMode:', isDemoMode);
    console.log('🔒 [ProtectedRoutes] currentPath:', currentPath);
    
    // Skip if already redirecting
    if (redirecting) {
      console.log('🔒 [ProtectedRoutes] Already redirecting, skipping...');
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

    // Check if user is authenticated (either real user or demo user)
    const isAuthenticated = user || isDemoMode;
    console.log('🔐 [ProtectedRoutes] Auth check - Real user:', !!user, 'Demo mode:', isDemoMode, 'Authenticated:', isAuthenticated);
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
    if (!loading && isAuthenticated && (currentPath === 'login' || currentPath === 'signup')) {
      if (isPlatformOwner || isElevated) {
        // Elevated users (admin, owner, master_admin, management) go to command center
        console.log("✅ [ProtectedRoutes] REDIRECTING TO COMMAND CENTER - elevated user");
        setRedirecting(true);
        window.location.href = '/unified-dashboard';
      } else {
        const portalHome = portalHomePages[accountType] || 'customer-portal-app';
        console.log(`👤 [ProtectedRoutes] REDIRECTING TO PORTAL - ${accountType} → ${portalHome}`);
        setRedirecting(true);
        window.location.href = `/${portalHome}`;
      }
      return;
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

    // Check CRM access - only management, admin, owner can access CRM routes
    const crmRoutes = ['crm', 'customer-management-hub', 'property-management-hub'];
    if (crmRoutes.includes(currentPath) && !hasCRMAccess(accountType)) {
      console.log(`🔒 [ProtectedRoutes] REDIRECTING - CRM access denied for ${accountType}`);
      const portalHome = portalHomePages[accountType] || 'customer-portal-app';
      setRedirecting(true);
      window.location.href = `/${portalHome}`;
      return;
    }

    // Get user's allowed routes (base + granted)
    const baseRoutes = portalAllowedRoutes[accountType] || [];
    const grantedRoutes = getGrantedAccess(userEmail);
    const allowedRoutes = [...baseRoutes, ...grantedRoutes];

    console.log('📋 [ProtectedRoutes] Allowed routes:', allowedRoutes);
    console.log('📋 [ProtectedRoutes] Granted routes:', grantedRoutes);

    // Check if user has access to current route
    if (!loading && isAuthenticated && !allowedRoutes.includes(currentPath)) {
      const portalHome = portalHomePages[accountType] || 'customer-portal-app';
      console.log(`🔒 [ProtectedRoutes] REDIRECTING TO PORTAL - ${accountType} access restricted to current route: ${currentPath}`);
      setRedirecting(true);
      window.location.href = `/${portalHome}`;
      return;
    }
    
    console.log('🔒 [ProtectedRoutes] No redirect needed, rendering children');
  }, [user, loading, currentPath, redirecting, isDemoMode]);

  // Show loading while checking auth
  if (loading) {
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

  // Check if user is authenticated (either real user or demo user)
  const isAuthenticated = user || isDemoMode;

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
        localStorage.setItem('demo_mode', 'true');
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
  
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-[#1A1A1A] border-b border-[#2A2A2A]">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-4">
          {/* Company Logo/Selector */}
          <CompanySelector />
  
          {/* Owner's Dashboard Button - Only visible to Platform Owners */}
          {user?.role === UserRole.PLATFORM_OWNER && (
            <button
              onClick={() => navigate("owners-dashboard")}
              className="flex items-center gap-2 hover:opacity-80 transition-opacity"
            >
              <Crown className="w-5 h-5 text-[#ea580c]" />
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
    "customer-management-hub": CustomerManagementHub,
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
    "investor-application": InvestorApplication, // NEW: Investor application/signup form
    "advertiser-application": AdvertiserApplication, // NEW: Advertiser application/signup form
    "service-provider-application": ServiceProviderApplication, // NEW: Service Provider application/signup form
    "territory-application": TerritoryApplication, // NEW: Territory application/signup form
    "dropshipper-admin": DropshipperAdmin,
    "public-store": PublicStore,
    "order-tracking": OrderTracking,
    "promotions-manager": PromotionsManager,
    
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

    // UNIFIED PROJECT PIPELINE - The ONE workflow for everything
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
    "application-submissions": ApplicationSubmissions,

    // Phase 1: Financial & Payroll Systems
    "unified-payment-center": UnifiedPaymentCenter,
    "payment-center": UnifiedPaymentCenter, // Alias for unified-payment-center
    "job-financial-tracker": JobFinancialTracker,
    reports: EnterpriseReporting, // Using EnterpriseReporting instead of deleted Reports.tsx

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
    // messaging: Messaging, // TODO: Create this page
    "enterprise-email": EnterpriseEmailManagement,

    // Company & System Management
    // "enterprise-invoicing": EnterpriseInvoicing, // TODO: Create this page
    "company-profile": BusinessProfilesHub,
    "landing-page-editor": LandingPageEditor,
    "website-settings": LandingPageEditor, // Alias
    "domain-management": LandingPageEditor, // Alias - domain management can be in landing page editor
    "theme-manager": LandingPageEditor, // Alias - theme manager can be in landing page editor
    "diagnostic-logos": DiagnosticLogos, // Logo diagnostic tool

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
    "crm": CRMHub,
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
    const path = page.startsWith('/') ? page.slice(1) : page;
    console.log("🧭 Normalized path:", path);
    console.log("🧭 Route exists in pageMap?", path in pageMap);
    console.log("🧭 About to set currentPage to:", path);
    console.log("🧭 Current currentPage value:", currentPage);
    startPageTransition(() => {
      console.log("🧭 Inside startTransition - setting state");
      setCurrentPage(path);
      window.history.pushState({}, '', `/${path}`);
      window.scrollTo(0, 0);
      console.log("🧭 State set complete");
    });
    console.log("🧭 Navigate function complete");
  };

  const toggleSection = (sectionName: string) => {
    setExpandedSection(
      expandedSection === sectionName ? null : sectionName,
    );
  };

  const renderPage = () => {
    // Use deferredPage instead of currentPage to prevent suspension
    const pageToRender = deferredPage;
    console.log("🎨 Rendering page:", pageToRender);
    console.log("🎨 PageMap keys:", Object.keys(pageMap).length);
    console.log("🎨 Page exists in map?", pageToRender in pageMap);

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
      return <LandingPage onNavigate={navigate} />;
    }
    if (pageToRender === "landing-page") {
      return <LandingPage onNavigate={navigate} />;
    }
    if (pageToRender === "home") {
      return <LandingPage onNavigate={navigate} />;
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
    console.log(
      "🔍 Available routes:",
      Object.keys(pageMap).join(", "),
    );
    console.log("🔍 Settings route exists?", "settings" in pageMap);
    console.log("🔍 Settings maps to:", pageMap["settings"]);

    const PageComponent = pageMap[pageToRender];

    if (!PageComponent) {
      console.error(
        "❌ Page component not found for:",
        pageToRender,
      );
      
      // Auto-redirect common mistakes
      const commonRedirects: { [key: string]: string } = {
        "business-profiles": "company-profile",
        "companies": "company-profile",
        "business-profile": "company-profile",
        "dashboard": "unified-dashboard",
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
                  <NavigationContext.Provider value={{ navigate }}>
                  <DataInitializer />
                  <div className="min-h-screen bg-[#0A0A0A]">
                    {/* Fixed Navigation Header */}
                    {currentPage !== "landing" &&
                      currentPage !== "landing-page" &&
                      currentPage !== "login" &&
                      currentPage !== "signup" &&
                      currentPage !== "forgot-password" &&
                      currentPage !== "reset-password" && (
                        <NavigationHeader currentPage={currentPage} navigate={navigate} />
                      )}

                    {/* Main content */}
                    <div
                      className={`${currentPage !== "landing" && currentPage !== "landing-page" && currentPage !== "login" && currentPage !== "signup" ? "" : ""}`}
                    >
                      {/* Header Spacer */}
                      {currentPage !== "landing" &&
                        currentPage !== "landing-page" &&
                        currentPage !== "login" &&
                        currentPage !== "signup" && (
                          <div className="h-16" />
                        )}
                      {/* Wrap page rendering in additional Suspense to handle lazy loading during navigation */}
                      <Suspense fallback={<LoadingFallback />}>
                        {renderPage()}
                      </Suspense>
                    </div>

                    {/* Toast Notifications */}
                    <Toaster />
                    
                    {/* Theme Manager */}
                    <ThemeManager />
                  </div>
                </NavigationContext.Provider>
              </CompanyContextProvider>
            </ProtectedRoutes>
            </UserProvider>
          </AuthProvider>
        </ThemeProvider>
      </Suspense>
    </ErrorBoundary>
  );
}