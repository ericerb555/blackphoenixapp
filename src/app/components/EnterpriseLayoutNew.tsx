import { useAuth } from '../contexts/AuthContext';
import { useCompany } from '../contexts/CompanyContext';
import { useUser } from '../lib/user-context';
import { UserRole } from '../lib/rbac';
import ExecutiveDashboardPanel from './ExecutiveDashboardPanel';
// Removed GlobalAdvertising - ads should be placed within each page content, not floating globally
import AdminNotificationBell from './AdminNotificationBell';

type ViewType = 'admin' | 'client' | 'technician' | 'subcontractor';

interface LayoutProps {
  children: ReactNode;
  currentPage: string;
  onNavigate: (page: string) => void;
  viewType: ViewType;
}

interface NavItem {
  name: string;
  href: string;
  icon: any;
  badge?: string | number;
  roles?: string[];
}

interface NavGroup {
  name: string;
  icon: any;
  items: NavItem[];
  badge?: string | number;
}

// Consolidated Main Navigation with Dropdowns
const mainNavGroups: (NavItem | NavGroup)[] = [
  { name: 'Landing Page', href: 'landing', icon: Home, roles: ['admin', 'client', 'technician', 'subcontractor'] },
  { name: 'Dashboard', href: 'dashboard', icon: LayoutDashboard, roles: ['admin', 'client', 'technician', 'subcontractor'] },
  { name: 'Admin Alerts', href: 'admin-alerts', icon: Bell, badge: 8, roles: ['admin'] },
  
  // Customers & Contacts Group
  {
    name: 'Customers & Contacts',
    icon: Users,
    items: [
      { name: 'Customers', href: 'customers', icon: Users, roles: ['admin'] },
      { name: 'CRM Management', href: 'crm-management', icon: Database, roles: ['admin'] },
      { name: 'Business Profiles', href: 'business-profiles', icon: Building2, roles: ['admin'] },
      { name: 'Company Management', href: 'company-management', icon: Building2, roles: ['admin'] },
    ]
  },

  // Projects & Work Group
  {
    name: 'Projects & Work',
    icon: Wrench,
    items: [
      { name: 'Projects', href: 'work-orders', icon: Wrench, roles: ['admin', 'technician'] },
      { name: 'Quote Workflow', href: 'enterprise-quote-workflow', icon: FileText, roles: ['admin'] },
      { name: 'Bid Room', href: 'bid-room', icon: Target, roles: ['admin'], badge: 'NEW' },
      { name: 'Contract Workflow', href: 'contract-workflow', icon: ShieldCheck, roles: ['admin'] },
      { name: 'Change Orders', href: 'change-orders', icon: FileText, roles: ['admin'] },
      { name: 'Change Order Camera', href: 'change-order-camera', icon: Camera, roles: ['admin', 'technician'], badge: 'NEW' },
      { name: 'Service Scheduling', href: 'service-scheduling', icon: Calendar, roles: ['admin'] },
      { name: 'Work Request Tracking', href: 'work-request-tracking', icon: Activity, roles: ['admin'] },
      { name: 'Waste & Disposal', href: 'waste-disposal-tracking', icon: Trash2, roles: ['admin'], badge: 'NEW' },
      { name: 'Weather Monitor', href: 'weather-job-site-monitor', icon: Cloud, roles: ['admin'], badge: 'NEW' },
    ]
  },

  // Team & HR Group
  {
    name: 'Team & HR',
    icon: UserCog,
    items: [
      { name: 'Employees', href: 'employee-management', icon: UserCog, roles: ['admin'] },
      { name: 'HR Management', href: 'enterprise-hr', icon: UserCheck, roles: ['admin'] },
      { name: 'Subcontractors', href: 'subcontractor-enterprise', icon: Building2, roles: ['admin'] },
      { name: 'Time Tracking', href: 'time-tracking', icon: Activity, roles: ['admin', 'technician'] },
      { name: 'Payroll', href: 'payroll', icon: DollarSign, roles: ['admin'] },
    ]
  },

  // Financial Group
  {
    name: 'Financial',
    icon: DollarSign,
    badge: 'NEW',
    items: [
      { name: 'Invoices', href: 'invoices', icon: Receipt, roles: ['admin'] },
      { name: 'Payments', href: 'unified-payment-center', icon: CreditCard, roles: ['admin'], badge: 'NEW' },
      { name: 'Financial Reconciliation', href: 'financial-reconciliation', icon: CheckCircle, roles: ['admin'], badge: 'NEW' },
      { name: 'Transaction History', href: 'transaction-history', icon: Receipt, roles: ['admin'] },
      { name: 'Subscription Hub', href: 'subscription-hub', icon: Crown, roles: ['admin'] },
      { name: 'Job Financial Tracker', href: 'job-financial-tracker', icon: TrendingUp, roles: ['admin'] },
    ]
  },

  { name: 'Calendar & Scheduling', href: 'master-scheduling', icon: CalendarClock, roles: ['admin'] },
  { name: 'Messages', href: 'messaging', icon: MessageSquare, badge: 3, roles: ['admin', 'client', 'technician'] },
];

// Consolidated Tools & Settings Groups
const toolsGroups: NavGroup[] = [
  {
    name: 'Lead Generation',
    icon: Sparkles,
    badge: 'NEW',
    items: [
      { name: 'Service Provider Admin', href: 'service-provider-admin', icon: Users, roles: ['admin'], badge: 'NEW' },
      { name: 'Provider Registration', href: 'service-provider-registration', icon: UserPlus, roles: ['admin'] },
    ]
  },
  {
    name: 'Design & Content',
    icon: Palette,
    items: [
      { name: 'Design Studio Pro', href: 'design-studio-pro', icon: BoxIcon, roles: ['admin'], badge: 'NEW' },
      { name: 'Enterprise Content Center', href: 'enterprise-content-center', icon: FileText, roles: ['admin'] },
      { name: 'Asset Management', href: 'asset-management', icon: BoxIcon, roles: ['admin'] },
      { name: 'Social Media Manager', href: 'social-media', icon: Megaphone, roles: ['admin'] },
      { name: 'Marketing Feed', href: 'marketing-feed', icon: TrendingUp, roles: ['admin'] },
      { name: 'AI Video Analysis', href: 'ai-video-analysis', icon: Video, roles: ['admin'], badge: 'NEW' },
    ]
  },
  {
    name: 'Operations',
    icon: Workflow,
    items: [
      { name: 'Workflow Manager', href: 'admin-workflow-manager', icon: Workflow, roles: ['admin'] },
      { name: 'Materials Database', href: 'materials-database', icon: Boxes, roles: ['admin'] },
      { name: 'Materials Hub', href: 'materials-hub', icon: Package, roles: ['admin'] },
      { name: 'Product Data Sources', href: 'product-data-sources', icon: Database, roles: ['admin'] },
      { name: 'Services', href: 'services', icon: Package, roles: ['admin'] },
      { name: 'Vendor Management', href: 'vendor-management', icon: Building2, roles: ['admin'] },
    ]
  },
  {
    name: 'Platform Management',
    icon: Settings2,
    items: [
      { name: 'AI Diagnostics', href: 'ai-diagnostics', icon: Brain, badge: 2, roles: ['admin'] },
      { name: 'User Management', href: 'user-management', icon: Shield, roles: ['admin'] },
      { name: 'Role Management', href: 'role-management', icon: Lock, roles: ['admin'] },
      { name: 'Module Manager', href: 'module-manager', icon: Layers, roles: ['admin'] },
      { name: 'Admin Access Control', href: 'admin-access-control', icon: ShieldCheck, roles: ['admin'] },
    ]
  },
  {
    name: 'Business Settings',
    icon: Briefcase,
    items: [
      { name: 'Company Profile', href: 'company-profile', icon: Building2, roles: ['admin'] },
      { name: 'Website Settings', href: 'website-settings', icon: Globe, roles: ['admin'] },
      { name: 'Domain Management', href: 'domain-management', icon: Globe, roles: ['admin'] },
      { name: 'Theme Manager', href: 'theme-manager', icon: Sparkles, roles: ['admin'] },
      { name: 'Referral Rewards', href: 'referral-rewards', icon: Gift, roles: ['admin'] },
    ]
  },
  {
    name: 'Integrations & Apps',
    icon: Smartphone,
    items: [
      { name: 'Mobile App Hub', href: 'mobile-app-hub', icon: Smartphone, roles: ['admin'] },
      { name: 'Email Management', href: 'enterprise-email', icon: Mail, roles: ['admin'] },
      { name: '24/7 On-Call Portal', href: 'on-call-portal', icon: Bell, roles: ['admin'], badge: 'NEW' },
      { name: 'Advertising Hub', href: 'vendor-advertising-hub', icon: Megaphone, roles: ['admin'], badge: 'NEW' },
    ]
  },
  {
    name: 'System & Admin',
    icon: Shield,
    items: [
      // { name: 'Control Center', href: 'control-center', icon: Zap, roles: ['admin'] }, // Temporarily disabled
      { name: 'Admin Alerts', href: 'admin-alerts', icon: Bell, roles: ['admin'] },
      { name: 'System Test Dashboard', href: 'system-test-dashboard', icon: TestTube, roles: ['admin'], badge: 'NEW' },
      { name: 'Data Management', href: 'data-management', icon: Database, roles: ['admin'] },
      { name: 'System Cleanup', href: 'system-cleanup', icon: Database, roles: ['admin'] },
      { name: 'Backup & Recovery', href: 'system-backup-recovery', icon: Archive, roles: ['admin'] },
      { name: 'Platform Observability', href: 'platform-observability', icon: Activity, roles: ['admin'] },
      { name: 'AI Diagnostics', href: 'ai-diagnostics', icon: Sparkles, roles: ['admin'] },
    ]
  },
  {
    name: 'Reports & Analytics',
    icon: BarChart3,
    items: [
      { name: 'Analytics Dashboard', href: 'reports', icon: BarChart3, roles: ['admin'] },
      { name: 'Enterprise Reporting', href: 'enterprise-reporting', icon: FileText, roles: ['admin'] },
      { name: 'Cohort Management', href: 'cohort-management', icon: Layers, roles: ['admin'] },
    ]
  },
];

export default function EnterpriseLayoutNew({ children, currentPage, onNavigate, viewType }: LayoutProps) {
  const { user, userRole, signOut, isDemoMode } = useAuth();
  const { user: currentUser } = useUser();
  const companyContext = useCompany();
  const activeCompany = companyContext?.activeCompany || null;
  const userCompanies = companyContext?.userCompanies || [];
  const switchCompany = companyContext?.switchCompany || (async () => ({ success: false }));
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [companySwitcherOpen, setCompanySwitcherOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<string[]>([]);
  const [toolsExpanded, setToolsExpanded] = useState(false);
  const [expandedToolGroups, setExpandedToolGroups] = useState<string[]>([]);

  const handleSignOut = async () => {
    await signOut();
    window.location.href = '/login';
  };

  const handleNavigate = (href: string) => {
    onNavigate(href);
    setMobileMenuOpen(false);
  };

  const toggleGroup = (groupName: string) => {
    setExpandedGroups(prev =>
      prev.includes(groupName)
        ? prev.filter(g => g !== groupName)
        : [...prev, groupName]
    );
  };

  const toggleToolGroup = (groupName: string) => {
    setExpandedToolGroups(prev =>
      prev.includes(groupName)
        ? prev.filter(g => g !== groupName)
        : [...prev, groupName]
    );
  };

  const notifications = [
    { id: 1, title: 'New quote request', message: 'Customer requested a quote', time: '5m ago', unread: true },
    { id: 2, title: 'Payment received', message: 'Invoice paid successfully', time: '1h ago', unread: true },
    { id: 3, title: 'Work order completed', message: 'Project marked as complete', time: '2h ago', unread: false },
  ];

  const renderNavItem = (item: NavItem, isActive: boolean, inDropdown: boolean = false) => {
    const Icon = item.icon;
    const isAdminAlerts = item.href === 'admin-alerts';
    
    return (
      <button
        key={item.href}
        onClick={() => handleNavigate(item.href)}
        className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 relative ${
          inDropdown 
            ? isActive
              ? 'bg-orange-600/20 text-white border-l-4 border-orange-500'
              : 'text-gray-400 hover:bg-[#2A2A2A] hover:text-white'
            : isActive
              ? 'bg-gradient-to-r from-orange-600/20 to-orange-500/10 text-white border-l-4 border-orange-500'
              : 'text-gray-400 hover:bg-[#2A2A2A] hover:text-white'
        }`}
        title={!sidebarOpen ? item.name : undefined}
      >
        <Icon className={`w-5 h-5 relative z-10 ${isActive ? 'text-orange-400' : isAdminAlerts && item.badge ? 'text-red-400' : ''}`} />
        {sidebarOpen && <span className="relative z-10">{item.name}</span>}
        {item.badge && sidebarOpen && (
          <span className={`ml-auto px-2 py-0.5 ${
            isAdminAlerts 
              ? 'bg-gradient-to-r from-red-500 to-red-600 shadow-lg shadow-red-500/50' 
              : 'bg-gradient-to-r from-orange-500 to-orange-600'
          } text-white text-xs font-bold rounded-full relative z-10`}>
            {item.badge}
          </span>
        )}
      </button>
    );
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      {isDemoMode && (
        <div className="bg-gradient-to-r from-orange-600 to-orange-700 text-white px-4 py-2 text-center text-sm flex items-center justify-center gap-2">
          <Sparkles className="w-4 h-4" />
          <span><strong>Demo Mode</strong> - Full admin access enabled</span>
        </div>
      )}

      <div className="flex h-screen">
        {/* Sidebar Navigation */}
        <aside className={`hidden lg:flex flex-col transition-all duration-300 ${
          sidebarOpen ? 'w-72' : 'w-20'
        }`}>
          {/* Orange Header Section */}
          <div className="w-full bg-gradient-to-br from-orange-600 via-orange-600 to-orange-700">
            <div className="h-16 flex items-center justify-between px-4 gap-3">
              {/* Logo/Brand Section */}
              <div className="flex-1 min-w-0">
                {currentUser?.role === UserRole.PLATFORM_OWNER ? (
                  sidebarOpen ? (
                    <button
                      onClick={() => {
                        window.location.href = '/owners-dashboard';
                      }}
                      className="flex items-center gap-3 w-full hover:bg-white/10 rounded-xl p-2 transition group"
                    >
                      <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center border border-white/30 group-hover:bg-white/30 group-hover:border-white/50 transition flex-shrink-0">
                        <Crown className="w-5 h-5 text-white" />
                      </div>
                      <div className="text-left min-w-0">
                        <h1 className="text-sm font-bold text-white truncate">{activeCompany?.name || 'Company'}</h1>
                        <p className="text-xs text-white/70">Owner Controls</p>
                      </div>
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        window.location.href = '/owners-dashboard';
                      }}
                      className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center border border-white/30 hover:bg-white/30 hover:border-white/50 transition"
                    >
                      <Crown className="w-5 h-5 text-white" />
                    </button>
                  )
                ) : (
                  <div className="flex items-center gap-3 p-2">
                    {sidebarOpen ? (
                      <div className="text-left min-w-0">
                        <h1 className="text-sm font-bold text-white truncate">{activeCompany?.name || 'Company'}</h1>
                        <p className="text-xs text-white/70">Portal</p>
                      </div>
                    ) : (
                      <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center border border-white/30">
                        <Building2 className="w-5 h-5 text-white" />
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Notification Bell - Always visible */}
              <div className="flex-shrink-0">
                <AdminNotificationBell 
                  onNavigate={onNavigate}
                  onClick={() => {
                    // Optional: Additional action when bell is clicked
                    console.log('Admin notification bell clicked');
                  }}
                />
              </div>
            </div>

            {/* Company Switcher */}
            {userCompanies && userCompanies.length > 0 && sidebarOpen && (
              <div className="px-3 pb-4">
                <div className="relative">
                  <button
                    onClick={() => setCompanySwitcherOpen(!companySwitcherOpen)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-xl text-sm transition border border-white/20"
                  >
                    <div className="w-8 h-8 bg-white/30 rounded-lg flex items-center justify-center text-white font-semibold text-xs backdrop-blur-sm">
                      {activeCompany?.name.charAt(0).toUpperCase() || 'C'}
                    </div>
                    <div className="flex-1 text-left min-w-0">
                      <p className="text-white font-medium text-sm truncate">{activeCompany?.name || 'Select Company'}</p>
                      <p className="text-xs text-white/70">Active workspace</p>
                    </div>
                    <ChevronDown className="w-4 h-4 text-white/70" />
                  </button>

                  {companySwitcherOpen && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setCompanySwitcherOpen(false)} />
                      <div className="absolute top-full left-0 right-0 mt-2 bg-[#1A1A1A] rounded-2xl shadow-2xl border border-[#2A2A2A] py-2 z-20 max-h-80 overflow-y-auto">
                        {userCompanies.map((company) => (
                          <button
                            key={company.id}
                            onClick={() => {
                              switchCompany(company.id);
                              setCompanySwitcherOpen(false);
                            }}
                            className={`w-full px-3 py-2.5 text-left hover:bg-[#2A2A2A] transition flex items-center gap-3 ${
                              activeCompany?.id === company.id ? 'bg-[#2A2A2A]' : ''
                            }`}
                          >
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white font-semibold text-xs ${
                              activeCompany?.id === company.id 
                                ? 'bg-gradient-to-br from-orange-600 to-orange-700' 
                                : 'bg-[#3A3A3A]'
                            }`}>
                              {company.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={`font-medium truncate text-sm ${
                                activeCompany?.id === company.id ? 'text-white' : 'text-gray-300'
                              }`}>
                                {company.name}
                              </p>
                            </div>
                            {activeCompany?.id === company.id && (
                              <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                            )}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Dark Section - Navigation */}
          <div className="flex-1 bg-[#1A1A1A] overflow-y-auto">
            <nav className="py-4 px-3 space-y-2">
              {/* Main Navigation */}
              {sidebarOpen && (
                <p className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Main Menu</p>
              )}
              
              {mainNavGroups.map((item) => {
                // Single item
                if ('href' in item) {
                  const isActive = currentPage === item.href;
                  return renderNavItem(item, isActive);
                }
                
                // Group with subitems
                const group = item as NavGroup;
                const isExpanded = expandedGroups.includes(group.name);
                const hasActiveItem = group.items.some(subItem => currentPage === subItem.href);
                const GroupIcon = group.icon;

                return (
                  <div key={group.name}>
                    <button
                      onClick={() => toggleGroup(group.name)}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
                        hasActiveItem
                          ? 'bg-gradient-to-r from-orange-600/20 to-orange-500/10 text-white border-l-4 border-orange-500'
                          : 'text-gray-400 hover:bg-[#2A2A2A] hover:text-white'
                      }`}
                    >
                      <GroupIcon className={`w-5 h-5 ${hasActiveItem ? 'text-orange-400' : ''}`} />
                      {sidebarOpen && (
                        <>
                          <span className="flex-1 text-left">{group.name}</span>
                          {group.badge && (
                            <span className="px-2 py-0.5 bg-gradient-to-r from-orange-500 to-orange-600 text-white text-xs font-bold rounded-full mr-1">
                              {group.badge}
                            </span>
                          )}
                          <ChevronRight className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                        </>
                      )}
                    </button>
                    
                    {sidebarOpen && isExpanded && (
                      <div className="mt-1 ml-4 space-y-1 border-l-2 border-orange-500/30 pl-2">
                        {group.items.map((subItem) => {
                          const isActive = currentPage === subItem.href;
                          return renderNavItem(subItem, isActive, true);
                        })}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Tools & Settings Section */}
              {sidebarOpen && (
                <>
                  <p className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 mt-6">Quick Access</p>
                  
                  <button
                    onClick={() => setToolsExpanded(!toolsExpanded)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 text-gray-400 hover:bg-[#2A2A2A] hover:text-white"
                  >
                    <Settings className="w-5 h-5" />
                    <span className="flex-1 text-left">Tools & Settings</span>
                    <ChevronRight className={`w-4 h-4 transition-transform ${toolsExpanded ? 'rotate-90' : ''}`} />
                  </button>

                  {toolsExpanded && (
                    <div className="mt-1 ml-2 space-y-1">
                      {toolsGroups.map((group) => {
                        const isExpanded = expandedToolGroups.includes(group.name);
                        const hasActiveItem = group.items.some(item => currentPage === item.href);
                        const GroupIcon = group.icon;

                        return (
                          <div key={group.name}>
                            <button
                              onClick={() => toggleToolGroup(group.name)}
                              className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg text-sm font-medium transition ${
                                hasActiveItem ? 'bg-orange-600/20 text-white' : 'text-gray-400 hover:bg-[#2A2A2A] hover:text-white'
                              }`}
                            >
                              <GroupIcon className={`w-4 h-4 ${hasActiveItem ? 'text-orange-400' : ''}`} />
                              <span className="flex-1 text-left">{group.name}</span>
                              {group.badge && (
                                <span className="px-1.5 py-0.5 bg-orange-500 text-white text-xs font-bold rounded-full mr-1">
                                  {group.badge}
                                </span>
                              )}
                              <ChevronRight className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                            </button>
                            
                            {isExpanded && (
                              <div className="mt-1 ml-6 space-y-1">
                                {group.items.map((item) => {
                                  const isActive = currentPage === item.href;
                                  return renderNavItem(item, isActive, true);
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              )}
            </nav>
          </div>

          {/* User Profile at Bottom */}
          <div className="bg-[#1A1A1A] border-t border-[#2A2A2A] p-3">
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-[#2A2A2A] rounded-xl transition"
              >
                {sidebarOpen ? (
                  <>
                    <div className="w-10 h-10 bg-gradient-to-br from-orange-600 to-orange-700 rounded-full flex items-center justify-center text-white font-semibold">
                      {user?.email?.charAt(0).toUpperCase() || 'U'}
                    </div>
                    <div className="flex-1 text-left min-w-0">
                      <p className="text-sm font-semibold text-white truncate">{user?.email || 'User'}</p>
                      <p className="text-xs text-gray-400 capitalize">{userRole?.role_name || 'Admin'}</p>
                    </div>
                    <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
                  </>
                ) : (
                  <div className="w-10 h-10 bg-gradient-to-br from-orange-600 to-orange-700 rounded-full flex items-center justify-center text-white font-semibold">
                    {user?.email?.charAt(0).toUpperCase() || 'U'}
                  </div>
                )}
              </button>

              {userMenuOpen && sidebarOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setUserMenuOpen(false)} />
                  <div className="absolute bottom-full left-0 right-0 mb-2 bg-[#0A0A0A] rounded-xl shadow-2xl border border-[#2A2A2A] py-2 z-20">
                    <button
                      onClick={handleSignOut}
                      className="w-full px-4 py-2.5 text-left text-sm text-gray-300 hover:bg-[#2A2A2A] hover:text-white transition flex items-center gap-3"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Sidebar Toggle */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="absolute -right-3 top-20 w-6 h-6 bg-orange-600 hover:bg-orange-700 rounded-full flex items-center justify-center text-white shadow-lg transition z-50"
          >
            <ChevronRight className={`w-4 h-4 transition-transform ${sidebarOpen ? 'rotate-180' : ''}`} />
          </button>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}