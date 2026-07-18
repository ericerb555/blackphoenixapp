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

// Page imports and route map live in routes.tsx — edit that file to add new pages
import { pageMap, Login, SignUp, ForgotPassword, ResetPassword, DirectoryLandingPage } from "./routes";
import ExitIntentPopup from "./components/ExitIntentPopup";
import LiveChatWidget from "./components/LiveChatWidget";

// Create Navigation Context
export const NavigationContext = createContext<{ navigate: (page: string) => void }>({
  navigate: () => {},
});

// Nav structure lives in nav.ts — edit that file to change the sidebar
import { navigationSections } from "./nav";

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

// Full-bleed pages render edge-to-edge (public marketing/landing + auth screens)
// and must NOT be constrained by the standard app content container.
const FULL_BLEED_PAGES = new Set<string>([
  "landing",
  "landing-page",
  "directory",
  "directory-landing-page",
  "builds-landing-page",
  "handyman-landing-page",
  "demo-landing-page",
  "property-management-landing-page",
  "contractor-network-landing-page",
  "territory-landing-page",
  "emergency-services-landing-page",
  "marketing-hub-landing-page",
  "login",
  "signup",
  "join-us",
  "join",
  "create-account",
  "get-started",
  "forgot-password",
  "reset-password",
]);

const isFullBleedPage = (page: string): boolean => FULL_BLEED_PAGES.has(page);

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
      let userProfiles: Record<string, any> = {};
      try {
        userProfiles = JSON.parse(localStorage.getItem('userProfiles') || '{}');
      } catch {
        userProfiles = {};
      }
      const ownerProfile = userProfiles[OWNER_EMAIL.toLowerCase()];

      // GUARD: Only ever attempt this reload ONCE per session. On mobile
      // (e.g. iOS Safari private mode) localStorage writes may not persist,
      // which would leave currentUserProfile null on every load and cause an
      // infinite reload loop (the "blinking" screen). The sessionStorage flag
      // breaks that loop.
      const alreadyAttempted = sessionStorage.getItem('owner_autologin_attempted') === 'true';

      if (ownerProfile && !alreadyAttempted) {
        console.log('👑 [APP INIT] Found owner profile - auto-logging in');
        try {
          ownerProfile.accountType = 'owner'; // Ensure correct type
          localStorage.setItem('currentUserProfile', JSON.stringify(ownerProfile));
          sessionStorage.setItem('owner_autologin_attempted', 'true');
          // Verify the write actually persisted before triggering a reload.
          if (localStorage.getItem('currentUserProfile')) {
            window.location.reload();
          } else {
            console.warn('👑 [APP INIT] Profile write did not persist (private mode?) - skipping reload to avoid blink loop');
          }
        } catch (err) {
          console.warn('👑 [APP INIT] Could not persist owner profile - skipping reload:', err);
        }
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

  // ── pageMap lives in routes.tsx — imported at top of this file ──────────────



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
      // Notify hub pages that share a base path (e.g. ?tab=) so they can
      // re-sync their active tab even when the component doesn't remount.
      try { window.dispatchEvent(new Event('app:navigate')); } catch { /* ignore */ }
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
                    {!isFullBleedPage(currentPage) && (
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
                        {isFullBleedPage(deferredPage) ? (
                          // Marketing / auth pages render edge-to-edge.
                          <div className="w-full flex justify-center">
                            {renderPage()}
                          </div>
                        ) : (
                          // Standard app pages share ONE responsive content width so
                          // every tab looks uniform on phone, tablet, laptop & desktop.
                          <div className="w-full flex justify-center">
                            <div className="w-full max-w-[1440px] px-3 sm:px-5 lg:px-8">
                              {renderPage()}
                            </div>
                          </div>
                        )}
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