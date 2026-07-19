/**
 * routes.tsx — All page imports and route map.
 * To add a new page: import it here and add a key to pageMap.
 * App.tsx never needs to change.
 */

// Critical Pages - no lazy loading (avoids Suspense issues on first render)
import Login from "./pages/Login";
import SignUp from "./pages/SignUp";
import DirectoryLandingPage from "./pages/DirectoryLandingPage";
import BuildsLandingPage from "./pages/BuildsLandingPage";
import HandymanLandingPage from "./pages/HandymanLandingPage";
import PropertyManagementLandingPage from "./pages/PropertyManagementLandingPage";
import ContractorNetworkLandingPage from "./pages/ContractorNetworkLandingPage";
import TerritoryLandingPage from "./pages/TerritoryLandingPage";
import MarketingHubLandingPage from "./pages/MarketingHubLandingPage";
import SubcontractorApplication from "./pages/SubcontractorApplication";
import JoinUsHub from "./pages/JoinUsHub";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";

// App Pages
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
import RewardsPerksHub from "./pages/RewardsPerksHub";
import SubscribeAndSave from "./pages/SubscribeAndSave";
import ReviewsDashboard from "./pages/ReviewsDashboard";
import AbandonedCart from "./pages/AbandonedCart";
import CouponManager from "./pages/CouponManager";
import LeadCRM from "./pages/LeadCRM";
import AnalyticsDashboard from "./pages/AnalyticsDashboard";
import OrderManager from "./pages/OrderManager";
import JobTrackingHub from "./pages/JobTrackingHub";
import RevenueMonetizationHub from "./pages/RevenueMonetizationHub";
import CustomerRegistrationForm from "./pages/CustomerRegistrationForm";
import SupplierManagementHub from "./pages/SupplierManagementHub";
import CustomerQuoteApproval from "./pages/CustomerQuoteApproval";
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
import CompanyDataRestoration from "./pages/CompanyDataRestoration";
import CompanyRecovery from "./pages/CompanyRecovery";
import CompanySetup from "./pages/CompanySetup";
import NotificationSettings from "./pages/NotificationSettings";
import UnifiedPaymentCenter from "./pages/UnifiedPaymentCenter";
import CompanyPaymentRouting from "./pages/CompanyPaymentRouting";
import StripeCheckout from "./pages/StripeCheckout";
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
import LiveChatManager from "./pages/LiveChatManager";
import PhotoImporter from "./pages/PhotoImporter";
import MarketingAutomation from "./pages/MarketingAutomation";
import RetargetingPixelSetup from "./pages/RetargetingPixelSetup";
import BlogManager from "./pages/BlogManager";
import ReviewSurveyManager from "./pages/ReviewSurveyManager";
import InfluencerTracker from "./pages/InfluencerTracker";
import KeywordTracker from "./pages/KeywordTracker";
import CustomerPortal from "./pages/CustomerPortal";
import SubscriptionMaintenancePlans from "./pages/SubscriptionMaintenancePlans";
import MaintenancePlanAdmin from "./pages/MaintenancePlanAdmin";
import HREmployeeHub from "./pages/HREmployeeHub";
import BlueprintAnalysisPage from "./pages/BlueprintAnalysisPage";
import DobaIntegration from "./pages/DobaIntegration";
import ExitIntentManager from "./pages/ExitIntentManager";
import EmergencyServicesLandingPage from "./pages/EmergencyServicesLandingPage";

// ── Re-exports for auth pages (used directly in App.tsx renderPage) ──────────
export { Login, SignUp, ForgotPassword, ResetPassword, DirectoryLandingPage };

// ── Route Map ─────────────────────────────────────────────────────────────────
// Key = URL path segment, Value = page component
export const pageMap: Record<string, React.ComponentType<any>> = {
  // Landing Pages
  "landing":                       DirectoryLandingPage,
  "landing-page":                  DirectoryLandingPage,
  "directory":                     DirectoryLandingPage,
  "directory-landing-page":        DirectoryLandingPage,

  // Section Landing Pages
  "builds-landing-page":                    BuildsLandingPage,
  "handyman-landing-page":                  HandymanLandingPage,
  "demo-landing-page":                      DirectoryLandingPage,
  "property-management-landing-page":       PropertyManagementLandingPage,
  "territory-landing-page":                 TerritoryLandingPage,
  "emergency-services-landing-page":        EmergencyServicesLandingPage,
  "marketing-hub-landing-page":             MarketingHubLandingPage,
  "contractor-network-landing-page":        ContractorNetworkLandingPage,

  // Auth (handled inline in renderPage, listed here as fallback)
  "sign-up":  SignUp,
  "signup":   SignUp,
  "join-us":        JoinUsHub,
  "join":           JoinUsHub,
  "create-account": JoinUsHub,
  "get-started":    JoinUsHub,

  // Dashboards
  "dashboard":                  UnifiedDashboard,
  "unified-dashboard":          UnifiedDashboard,
  "master-admin-dashboard":     MasterAdminDashboard,
  "admin-dashboard":            OwnersDashboard,
  "admin-advanced-dashboard":   OwnersDashboard,
  "owners-dashboard":           OwnersDashboard,
  "company-data-restoration":   CompanyDataRestoration,
  "company-recovery":           CompanyRecovery,
  "company-setup":              CompanySetup,
  "settings":                   OwnersDashboard,
  "admin-alerts":               AdminAlerts,
  "notification-settings":      NotificationSettings,

  // Core Business
  "customers":    CustomersNew,
  "invoices":     InvoicesNew,
  "invoices-new": InvoicesNew,
  "projects":     ProjectsNew,
  "projects-new": ProjectsNew,
  "payroll":      HREmployeeHub,

  // Hub Pages
  "job-tracking-hub":           JobTrackingHub,
  "revenue-monetization-hub":   RevenueMonetizationHub,
  "customer-management-hub":    UnifiedCRMHub,
  "customer-registration":      CustomerRegistrationForm,
  "materials-estimating-hub":   MaterialsCenter,
  "supplier-management-hub":    SupplierManagementHub,
  "hr-employee-hub":            HREmployeeHub,
  "design-structural-hub":      DesignStudioPro,
  "customer-quote-approval":    CustomerQuoteApproval,

  // Vendors & eCommerce
  "vendors-admin-hub":          VendorsAdminHub,
  "vendor-advertising-hub":     VendorsAdminHub,
  "vendor-management":          VendorsAdminHub,
  "vendor-api-management":      VendorsAdminHub,
  "vendor-application":         VendorApplication,
  "subcontractor-application":  SubcontractorApplication,
  "investor-application":       InvestorApplication,
  "advertiser-application":     AdvertiserApplication,
  "service-provider-application": ServiceProviderApplication,
  "territory-application":      TerritoryApplication,
  "dropshipper-admin":          DropshipperAdmin,
  "public-store":               PublicStore,
  "order-tracking":             OrderTracking,
  "promotions-manager":         PromotionsManager,
  "exit-intent":                ExitIntentManager,
  "exit-intent-manager":        ExitIntentManager,
  "live-chat":                  LiveChatManager,
  "live-chat-manager":          LiveChatManager,

  // Marketing Tools
  "photo-importer":       PhotoImporter,
  "marketing-automation": MarketingAutomation,
  "retargeting-pixels":   RetargetingPixelSetup,
  "blog-manager":         BlogManager,
  "review-surveys":       ReviewSurveyManager,
  "influencer-tracker":   InfluencerTracker,
  "keyword-tracker":      KeywordTracker,
  "customer-portal":      CustomerPortal,
  "ai-ranking-engine":    AIRankingEngine,
  "auto-product-pilot":   AutoProductPilot,
  "social-media-hub":     SocialMediaHub,
  "email-lead-gen":       EmailLeadGen,

  // Geo-targeted landing
  "local":  LocalLeadsLanding,
  "offer":  LocalLeadsLanding,
  "nearby": LocalLeadsLanding,

  // Loyalty & Rewards
  "loyalty":  LoyaltyProgram,
  "rewards":  LoyaltyProgram,

  // QR Code
  "qr-codes":     QRCodeGenerator,
  "qr-generator": QRCodeGenerator,

  // Revenue Analytics
  "revenue-analytics": RevenueAnalytics,
  "analytics":         AnalyticsDashboard,

  // SMS Marketing
  "sms-marketing":  SMSMarketing,
  "text-marketing": SMSMarketing,

  // Subscribe & Save
  "subscribe":         SubscribeAndSave,
  "subscribe-and-save": SubscribeAndSave,
  "subscriptions":     SubscribeAndSave,

  // Gift Cards
  "gift-cards": GiftCards,
  "gift-card":  GiftCards,
  "gifts":      GiftCards,

  // Rewards & Perks Hub — loyalty, affiliate, referrals, gift cards, gift hours
  "rewards-perks":     RewardsPerksHub,
  "rewards-hub":       RewardsPerksHub,
  "perks":             RewardsPerksHub,

  // Reviews
  "reviews":         ReviewsDashboard,
  "product-reviews": ReviewsDashboard,

  // Abandoned Cart
  "abandoned-carts": AbandonedCart,
  "abandoned-cart":  AbandonedCart,
  "cart-recovery":   AbandonedCart,

  // Coupons
  "coupons":       CouponManager,
  "coupon-manager": CouponManager,
  "promo-codes":   CouponManager,

  // Lead CRM
  "crm":      UnifiedCRMHub,
  "leads":    LeadCRM,
  "lead-crm": LeadCRM,

  // Analytics
  "business-analytics": AnalyticsDashboard,
  "insights":           AnalyticsDashboard,

  // Orders
  "orders":        OrderManager,
  "order-manager": OrderManager,
  "order-history": OrderManager,

  // Flash Sales
  "flash-sales": FlashSaleManager,
  "flash-sale":  FlashSaleManager,
  "promotions":  FlashSaleManager,

  // Invoice Builder
  "invoice":    InvoiceBuilder,
  "estimates":  InvoiceBuilder,

  // Service Booking
  "book":     ServiceBooking,
  "booking":  ServiceBooking,
  "services": ServiceBooking,
  "quote":    ServiceBooking,

  // Affiliate
  "affiliate": AffiliateProgram,
  "referral":  AffiliateProgram,
  "refer":     AffiliateProgram,

  // Customer Portal (app view)
  "customer-app":                  CustomerPortalApp,
  "customer-portal-app":           CustomerPortalApp,
  "customer-subscription-portal":  CustomerPortalApp,

  // App aliases used in nav (Vendors & eCommerce section)
  "investor-app":                  InvestorPortalView,
  "advertiser-app":                AdvertiserPortalView,
  "time-tracking":                 HREmployeeHub,

  // System Management
  "user-management-hub":     UserManagementHub,
  "user-management":         UserManagementHub,
  "user-management-admin":   UserManagementHub,
  "role-management":         UserManagementHub,
  "subscription-hub":        SubscriptionHub,
  "cohort-management":       CohortManagement,
  "pricing":                 PricingPage,
  "plans":                   PricingPage,
  "investment-opportunities": InvestmentOpportunities,
  "investment-management":   InvestmentManagement,
  "investment-calculator":   InvestmentCalculator,

  // Unified Project Pipeline (all workflow aliases → single page)
  "work-order-management":      WorkOrderManager,
  "unified-project-pipeline":   UnifiedProjectPipeline,
  "enterprise-quote-workflow":  UnifiedProjectPipeline,
  "quote-to-contract-workflow": UnifiedProjectPipeline,
  "work-request-tracking":      UnifiedProjectPipeline,
  "quote-response-hub":         UnifiedProjectPipeline,
  "work-request-hub":           UnifiedProjectPipeline,
  "work-request-intake":        UnifiedProjectPipeline,
  "work-request-form-editor":   UnifiedProjectPipeline,
  "quote-prep":                 UnifiedProjectPipeline,
  "project-pipeline":           UnifiedProjectPipeline,
  "workflow":                   UnifiedProjectPipeline,
  "pipeline":                   UnifiedProjectPipeline,

  // Request Service
  "request-service": RequestServicePage,
  "get-quote":        RequestServicePage,

  // Materials Center
  "materials-center":          MaterialsCenter,
  "materials-hub":             MaterialsCenter,
  "materials-database":        MaterialsCenter,
  "materials-procurement-hub": MaterialsCenter,
  "material-estimating":       MaterialsCenter,

  // Field / Job Tools
  "pricing-settings":    PricingSettings,
  "labor-rates-config":  LaborRatesConfig,
  "bid-room":            BidRoomV2,
  "service-scheduling":  ServiceScheduling,
  "unified-calendar":    CalendarScheduleView,
  "application-submissions": ApplicationSubmissions,

  // Financial & Payroll
  "unified-payment-center":     UnifiedPaymentCenter,
  "payment-center":             UnifiedPaymentCenter,
  "company-payment-routing":    CompanyPaymentRouting,
  "stripe-connect":             CompanyPaymentRouting,
  "bank-accounts":              CompanyPaymentRouting,
  "stripe-checkout":            StripeCheckout,
  "checkout":                   StripeCheckout,
  "financial-reconciliation":   FinancialReconciliation,
  "job-financial-tracker":      JobFinancialTracker,
  "work-order-completion-reports": WorkOrderCompletionReports,
  "completion-reports":         WorkOrderCompletionReports,
  "customer-docs":              CustomerDocs,
  "customer-documents":         CustomerDocs,
  "reports":                    EnterpriseReporting,

  // Project & Work Management
  "change-order-camera":    ChangeOrderCameraApp,
  "waste-disposal-tracking": WasteDisposalTracking,
  "weather-job-site-monitor": WeatherJobSiteMonitor,
  "code-tracker":            CodeTracker,
  "enterprise-coding-tracking": CodeTracker,
  "master-scheduling":       MasterScheduling,
  "master-schedule":         MasterScheduling,

  // Operations & Tools
  "product-data-sources": ProductDataSources,
  "purchase-orders":      PurchaseOrders,

  // Communication
  "messaging":        Messaging,
  "messages":         Messaging,
  "enterprise-email": EnterpriseEmailManagement,

  // Company & System
  "enterprise-invoicing":  InvoicesNew,
  "company-profile":       BusinessProfilesHub,
  "diagnostic-logos":      DiagnosticLogos,
  "diagnostic-logos-debug": DiagnosticLogosDebug,
  "upload-my-logo":        UploadMyLogo,
  "check-my-companies":    CheckMyCompanies,
  "publish-my-branding":   PublishMyBranding,
  "fix-my-logo":           FixMyLogo,
  "doba-integration":      DobaIntegration,
  "spocket":               SpocketIntegration,
  "spocket-integration":   SpocketIntegration,
  "zendrop":               ZendropIntegration,
  "zendrop-integration":   ZendropIntegration,
  "property-revenue":      PropertyRevenueHub,
  "property-revenue-intel": PropertyRevenueHub,
  "revenue-intel":         PropertyRevenueHub,
  "property-ai-enterprise": PropertyAIEnterprise,
  "property-ai":           PropertyAIEnterprise,
  "pai":                   PropertyAIEnterprise,
  "order-success":         OrderSuccess,
  "store":                 DigitalStorefront,
  "digital-store":         DigitalStorefront,
  "shop":                  DigitalStorefront,
  "digital-products":      DigitalStorefront,
  "ad-creator":            AdCreator,
  "ads":                   AdCreator,
  "promotions-creator":    AdCreator,
  "document":              DocumentViewer,
  "doc":                   DocumentViewer,
  "permit-ai":             PermitAI,
  "permits":               PermitAI,
  "building-codes":        PermitAI,

  // Design & Content
  "design-studio-pro":        DesignStudioPro,
  "structural-design":        StructuralDesign,
  "social-media":             SocialMediaManager,
  "social-media-manager":     SocialMediaManager,
  "module-manager":           ModuleManager,
  "module-access-control":    ModuleManager,
  "referral-rewards":         ReferralRewards,
  "employee-management":      UserManagementHub,
  "ai-diagnostics":           AIDiagnostics,
  "unified-crm":              UnifiedCRMHub,
  "customer-management":      UnifiedCRMHub,
  "property-management-hub":  PropertyManagementHub,
  "property-management-test": PropertyManagementTest,
  "enterprise-hr":            HREmployeeHub,
  "subcontractor-enterprise": SubcontractorEnterprise,
  "enterprise-reporting":     EnterpriseReporting,

  // Portals
  "portal-demo-hub":          PortalDemoHub,
  "mobile-hub":               MobileHub,
  "employee-portal":          EmployeePortalView,
  "on-call-portal":           OnCallEmergencyPortal,
  "vendor-portal":            VendorPortalView,
  "advertiser-portal":        AdvertiserPortalView,
  "subcontractor-portal":     SubcontractorPortal,
  "investor-portal":          InvestorPortalView,
  "admin-portal":             AdminPortalView,
  "enterprise-content-center": EnterpriseContentCenter,
  "content-center":            EnterpriseContentCenter,
  "ad-studio":                 EnterpriseContentCenter,
  "marketing-command":         EnterpriseContentCenter,
  "territory-portal":         TerritoryPortalView,
  "territory-admin-portal":   PortalsHub,
  "property-manager-portal":  PropertyManagerPortalView,
  "condo-manager-portal":     CondoManagerPortalView,
  "landlord-portal":          LandlordPortalView,
  "portal-demo-selector":     PortalDemoSelector,
  "marketing-trades-worker":  TradesWorkerMarketing,
  "marketing-vendor":         VendorMarketing,
  "marketing-subcontractor":  SubcontractorMarketing,
  "employee-mobile-app":      EmployeeMobileApp,
  "owners-portal-v2":         PortalDemoHub,
  "portal-access":            PortalsHub,
  "portals-hub":              PortalsHub,
  "portal-global-settings":   PortalGlobalSettings,
  "portal-creation":          PortalCreation,
  "portal-management":        PortalManagement,

  // AI Tools
  "blueprint-analyzer":   BlueprintAnalysisPage,
  "blueprint-analysis":   BlueprintAnalysisPage,
  "ai-blueprint":         BlueprintAnalysisPage,

  // Maintenance Plans
  "maintenance-plans":              SubscriptionMaintenancePlans,
  "subscription-maintenance":       SubscriptionMaintenancePlans,
  "maintenance-subscriptions":      SubscriptionMaintenancePlans,
  "maintenance-admin":              MaintenancePlanAdmin,
  "maintenance-plan-admin":         MaintenancePlanAdmin,

  // Legacy redirects (kept for backward compat)
  "condo-association-portal": PortalDemoHub,
  "vendor-portal-new":        VendorPortalView,
  "stakeholder-hub":          UnifiedDashboard,
  "mobile-app-hub":           PortalsHub,
};
