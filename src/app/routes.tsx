/**
 * routes.tsx — All page imports and route map.
 * To add a new page: import it here and add a key to pageMap.
 * App.tsx never needs to change.
 */

import { lazy } from "react";

// Critical Pages - no lazy loading (avoids Suspense issues on first render)
import Login from "./pages/Login";
import SignUp from "./pages/SignUp";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
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
const UnifiedDashboard = lazy(() => import("./pages/UnifiedDashboard"));
const CustomerPortalApp = lazy(() => import("./components/portals/CustomerPortalView"));
const AdminAlerts = lazy(() => import("./pages/AdminAlerts"));
const CustomersNew = lazy(() => import("./pages/CustomersNew"));
const InvoicesNew = lazy(() => import("./pages/InvoicesNew"));
const PaymentComplete = lazy(() => import("./pages/PaymentComplete"));
const ProjectsNew = lazy(() => import("./pages/ProjectsNew"));
const StructuralDesign = lazy(() => import("./pages/StructuralDesign"));
const VendorsAdminHub = lazy(() => import("./pages/VendorsAdminHub"));
const VendorApplication = lazy(() => import("./pages/VendorApplication"));
const InvestorApplication = lazy(() => import("./pages/InvestorApplication"));
const AdvertiserApplication = lazy(() => import("./pages/AdvertiserApplication"));
const ServiceProviderApplication = lazy(() => import("./pages/ServiceProviderApplication"));
const TerritoryApplication = lazy(() => import("./pages/TerritoryApplication"));
const InvestmentOpportunities = lazy(() => import("./pages/InvestmentOpportunities"));
const InvestmentManagement = lazy(() => import("./pages/InvestmentManagement"));
const DropshipperAdmin = lazy(() => import("./components/DropshipperAdminPanel"));
const PublicStore = lazy(() => import("./pages/PublicStore"));
const OrderTracking = lazy(() => import("./components/OrderTracking"));
const PromotionsManager = lazy(() => import("./pages/PromotionsManager"));
const AIRankingEngine = lazy(() => import("./pages/AIRankingEngine"));
const AutoProductPilot = lazy(() => import("./pages/AutoProductPilot"));
const SocialMediaHub = lazy(() => import("./pages/SocialMediaHub"));
const EmailLeadGen = lazy(() => import("./pages/EmailLeadGen"));
const LocalLeadsLanding = lazy(() => import("./pages/LocalLeadsLanding"));
const LoyaltyProgram = lazy(() => import("./pages/LoyaltyProgram"));
const QRCodeGenerator = lazy(() => import("./pages/QRCodeGenerator"));
const RevenueAnalytics = lazy(() => import("./pages/RevenueAnalytics"));
const SMSMarketing = lazy(() => import("./pages/SMSMarketing"));
const AffiliateProgram = lazy(() => import("./pages/AffiliateProgram"));
const ServiceBooking = lazy(() => import("./pages/ServiceBooking"));
const InvoiceBuilder = lazy(() => import("./pages/InvoiceBuilder"));
const FlashSaleManager = lazy(() => import("./pages/FlashSaleManager"));
const GiftCards = lazy(() => import("./pages/GiftCards"));
const RewardsPerksHub = lazy(() => import("./pages/RewardsPerksHub"));
const SubscribeAndSave = lazy(() => import("./pages/SubscribeAndSave"));
const ReviewsDashboard = lazy(() => import("./pages/ReviewsDashboard"));
const AbandonedCart = lazy(() => import("./pages/AbandonedCart"));
const CouponManager = lazy(() => import("./pages/CouponManager"));
const LeadCRM = lazy(() => import("./pages/LeadCRM"));
const AnalyticsDashboard = lazy(() => import("./pages/AnalyticsDashboard"));
const OrderManager = lazy(() => import("./pages/OrderManager"));
const JobTrackingHub = lazy(() => import("./pages/JobTrackingHub"));
const RevenueMonetizationHub = lazy(() => import("./pages/RevenueMonetizationHub"));
const CustomerRegistrationForm = lazy(() => import("./pages/CustomerRegistrationForm"));
const SupplierManagementHub = lazy(() => import("./pages/SupplierManagementHub"));
const CustomerQuoteApproval = lazy(() => import("./pages/CustomerQuoteApproval"));
const UserManagementHub = lazy(() => import("./pages/UserManagementHub"));
const SubscriptionHub = lazy(() => import("./pages/SubscriptionHub"));
const CohortManagement = lazy(() => import("./pages/CohortManagement"));
const MasterAdminDashboard = lazy(() => import("./pages/MasterAdminDashboard"));
const UnifiedProjectPipeline = lazy(() => import("./pages/UnifiedProjectPipeline"));
const WorkOrderManager = lazy(() => import("./components/WorkOrderManager"));
const RequestServicePage = lazy(() => import("./pages/RequestServicePage"));
const MaterialsCenter = lazy(() => import("./pages/MaterialsCenter"));
const PricingSettings = lazy(() => import("./pages/PricingSettings"));
const LaborRatesConfig = lazy(() => import("./components/LaborRatesConfig"));
const BidRoomV2 = lazy(() => import("./pages/BidRoomV2"));
const ServiceScheduling = lazy(() => import("./pages/ServiceScheduling"));
const UnifiedCRMHub = lazy(() => import("./pages/UnifiedCRMHub"));
const PropertyManagementHub = lazy(() => import("./pages/PropertyManagementHub"));
const PropertyManagementTest = lazy(() => import("./components/PropertyManagementTest"));
const CalendarScheduleView = lazy(() => import("./components/CalendarScheduleView"));
const ApplicationSubmissions = lazy(() => import("./pages/ApplicationSubmissions"));
const PortalOnboarding = lazy(() => import("./pages/PortalOnboarding"));
const BusinessProfilesHub = lazy(() => import("./components/BusinessProfilesHub"));
const OwnersDashboard = lazy(() => import("./pages/OwnersDashboard"));
const PortalsHub = lazy(() => import("./pages/PortalsHub"));
const SubcontractorPortal = lazy(() => import("./components/portals/SubcontractorPortal"));
const VendorPortalView = lazy(() => import("./components/portals/VendorPortalView"));
const AdvertiserPortalView = lazy(() => import("./components/portals/AdvertiserPortalView"));
const InvestorPortalView = lazy(() => import("./components/portals/InvestorPortalView"));
const PropertyManagerPortalView = lazy(() => import("./components/portals/PropertyManagerPortalView"));
const CondoManagerPortalView = lazy(() => import("./components/portals/CondoManagerPortalView"));
const LandlordPortalView = lazy(() => import("./components/portals/LandlordPortalView"));
const PortalDemoSelector = lazy(() => import("./pages/PortalDemoSelector"));
const TradesWorkerMarketing = lazy(() => import("./pages/marketing/TradesWorkerMarketing"));
const VendorMarketing = lazy(() => import("./pages/marketing/VendorMarketing"));
const SubcontractorMarketing = lazy(() => import("./pages/marketing/SubcontractorMarketing"));
const CompanyDataRestoration = lazy(() => import("./pages/CompanyDataRestoration"));
const CompanyRecovery = lazy(() => import("./pages/CompanyRecovery"));
const CompanySetup = lazy(() => import("./pages/CompanySetup"));
const NotificationSettings = lazy(() => import("./pages/NotificationSettings"));
const UnifiedPaymentCenter = lazy(() => import("./pages/UnifiedPaymentCenter"));
const CompanyPaymentRouting = lazy(() => import("./pages/CompanyPaymentRouting"));
const StripeCheckout = lazy(() => import("./pages/StripeCheckout"));
const JobFinancialTracker = lazy(() => import("./pages/JobFinancialTracker"));
const FinancialReconciliation = lazy(() => import("./pages/FinancialReconciliation"));
const EnterpriseReporting = lazy(() => import("./pages/EnterpriseReporting"));
const ChangeOrderCameraApp = lazy(() => import("./pages/ChangeOrderCameraApp"));
const WasteDisposalTracking = lazy(() => import("./pages/WasteDisposalTracking"));
const WeatherJobSiteMonitor = lazy(() => import("./pages/WeatherJobSiteMonitor"));
const CodeTracker = lazy(() => import("./pages/CodeTracker"));
const ProductDataSources = lazy(() => import("./pages/ProductDataSources"));
const PurchaseOrders = lazy(() => import("./pages/PurchaseOrders"));
const EnterpriseEmailManagement = lazy(() => import("./pages/EnterpriseEmailManagement"));
const SocialMediaManager = lazy(() => import("./pages/SocialMediaManager"));
const ModuleManager = lazy(() => import("./pages/ModuleManager"));
const ReferralRewards = lazy(() => import("./pages/ReferralRewards"));
const AIDiagnostics = lazy(() => import("./pages/AIDiagnostics"));
const DiagnosticLogos = lazy(() => import("./pages/DiagnosticLogos"));
const DiagnosticLogosDebug = lazy(() => import("./pages/DiagnosticLogosDebug"));
const UploadMyLogo = lazy(() => import("./pages/UploadMyLogo"));
const CheckMyCompanies = lazy(() => import("./pages/CheckMyCompanies"));
const PublishMyBranding = lazy(() => import("./pages/PublishMyBranding"));
const FixMyLogo = lazy(() => import("./pages/FixMyLogo"));
const SpocketIntegration = lazy(() => import("./pages/SpocketIntegration"));
const ZendropIntegration = lazy(() => import("./pages/ZendropIntegration"));
const PropertyRevenueHub = lazy(() => import("./pages/PropertyRevenueHub"));
const PropertyAIEnterprise = lazy(() => import("./pages/PropertyAIEnterprise"));
const OrderSuccess = lazy(() => import("./pages/OrderSuccess"));
const DigitalStorefront = lazy(() => import("./pages/DigitalStorefront"));
const AdCreator = lazy(() => import("./pages/AdCreator"));
const DocumentViewer = lazy(() => import("./pages/DocumentViewer"));
const PermitAI = lazy(() => import("./pages/PermitAI"));
const SubcontractorEnterprise = lazy(() => import("./pages/SubcontractorEnterprise"));
const Services = lazy(() => import("./pages/Services"));
const PortalDemoHub = lazy(() => import("./pages/PortalDemoHub"));
const PortalGlobalSettings = lazy(() => import("./pages/PortalGlobalSettings"));
const MasterScheduling = lazy(() => import("./pages/MasterScheduling"));
const EnterpriseContentCenter = lazy(() => import("./pages/EnterpriseContentCenter"));
const PortalCreation = lazy(() => import("./pages/PortalCreation"));
const PortalManagement = lazy(() => import("./pages/PortalManagement"));
const PortalAccess = lazy(() => import("./pages/PortalAccess"));
const EmployeeMobileApp = lazy(() => import("./pages/EmployeeMobileApp"));
const MobileHub = lazy(() => import("./pages/MobileHub"));
const EmployeePortalView = lazy(() => import("./components/portals/EmployeePortalView"));
const OnCallEmergencyPortal = lazy(() => import("./components/portals/OnCallEmergencyPortal"));
const PricingPage = lazy(() => import("./pages/PricingPage"));
const CustomerDocs = lazy(() => import("./pages/CustomerDocs"));
const InvestmentCalculator = lazy(() => import("./pages/InvestmentCalculator"));
const AdminPortalView = lazy(() => import("./components/portals/AdminPortalView"));
const TerritoryPortalView = lazy(() => import("./components/portals/TerritoryPortalView"));
const WorkOrderCompletionReports = lazy(() => import("./pages/WorkOrderCompletionReports"));
const Messaging = lazy(() => import("./pages/Messaging"));
const LiveChatManager = lazy(() => import("./pages/LiveChatManager"));
const PhotoImporter = lazy(() => import("./pages/PhotoImporter"));
const MarketingAutomation = lazy(() => import("./pages/MarketingAutomation"));
const RetargetingPixelSetup = lazy(() => import("./pages/RetargetingPixelSetup"));
const BlogManager = lazy(() => import("./pages/BlogManager"));
const ReviewSurveyManager = lazy(() => import("./pages/ReviewSurveyManager"));
const InfluencerTracker = lazy(() => import("./pages/InfluencerTracker"));
const KeywordTracker = lazy(() => import("./pages/KeywordTracker"));
const CustomerPortal = lazy(() => import("./pages/CustomerPortal"));
const SubscriptionMaintenancePlans = lazy(() => import("./pages/SubscriptionMaintenancePlans"));
const MaintenancePlanAdmin = lazy(() => import("./pages/MaintenancePlanAdmin"));
const HREmployeeHub = lazy(() => import("./pages/HREmployeeHub"));
const BlueprintAnalysisPage = lazy(() => import("./pages/BlueprintAnalysisPage"));
const DobaIntegration = lazy(() => import("./pages/DobaIntegration"));
const ExitIntentManager = lazy(() => import("./pages/ExitIntentManager"));
const EmergencyServicesLandingPage = lazy(() => import("./pages/EmergencyServicesLandingPage"));

// ── Re-exports for auth pages (used directly in App.tsx renderPage) ──────────
export { Login, SignUp, ForgotPassword, ResetPassword, DirectoryLandingPage };

// ── Route Map ─────────────────────────────────────────────────────────────────
// Key = URL path segment, Value = page component
export const pageMap: Record<string, React.ComponentType<any> | React.LazyExoticComponent<React.ComponentType<any>>> = {
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
  "payment-complete": PaymentComplete,
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
  "design-structural-hub":      StructuralDesign,
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
  "portal-onboarding": PortalOnboarding,
  "onboarding": PortalOnboarding,

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
  "design-studio-pro":        StructuralDesign,
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

  // Legal
  "privacy":           PrivacyPolicy,
  "privacy-policy":    PrivacyPolicy,
  "terms":             TermsOfService,
  "terms-of-service":  TermsOfService,

  // Legacy redirects (kept for backward compat)
  "condo-association-portal": PortalDemoHub,
  "vendor-portal-new":        VendorPortalView,
  "stakeholder-hub":          UnifiedDashboard,
  "mobile-app-hub":           PortalsHub,
};
