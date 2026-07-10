import { useState } from 'react';
import { 
  ChevronDown, 
  ChevronRight,
  DollarSign,
  Briefcase,
  CreditCard,
  Users,
  Megaphone,
  BarChart3,
  Settings,
  Building2,
  Target,
  Palette,
  Crown,
  UserCheck,
  Brain,
  Globe,
  ExternalLink,
  Wrench,
  Mail,
  Clock
} from 'lucide-react';
import { useUser } from '../lib/user-context';
import { UserRole } from '../lib/rbac';

interface Workflow {
  name: string;
  path: string;
}

interface Module {
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  workflows: Workflow[];
}

const modules: Module[] = [
  {
    name: 'Owners Portal',
    icon: Crown,
    color: 'text-purple-600',
    workflows: [
      { name: 'Executive Dashboard', path: '/owners-dashboard' },
      { name: 'Owner Portal (Approvals)', path: '/owner-portal' },
      { name: 'Role Hierarchy', path: '/owners-portal?tab=roles' },
      { name: 'User Management', path: '/owners-portal?tab=users' },
      { name: 'Permissions', path: '/owners-portal?tab=permissions' },
      { name: 'Access Logs', path: '/owners-portal?tab=logs' },
      { name: 'Emergency Controls', path: '/owners-portal?tab=emergency' }
    ]
  },
  {
    name: 'Sales & Quotes',
    icon: DollarSign,
    color: 'text-blue-600',
    workflows: [
      { name: 'CRM Management', path: '/crm' },
      { name: 'Quote Workflow', path: '/enterprise-quote-workflow' },
      { name: 'Quote Responses', path: '/quote-responses' },
      { name: 'Change Orders', path: '/change-orders' },
      { name: 'Customers', path: '/customers' }
    ]
  },
  {
    name: 'Multi-Business Management',
    icon: Building2,
    color: 'text-indigo-600',
    workflows: [
      { name: 'Business Profiles', path: '/business-profiles' },
      { name: 'Work Requests', path: '/work-request-tracking' },
      { name: 'AI Matching', path: '/work-request-tracking' }
    ]
  },
  {
    name: 'Operations',
    icon: Briefcase,
    color: 'text-emerald-600',
    workflows: [
      { name: 'Work Orders', path: '/work-orders' },
      { name: 'Master Schedule', path: '/master-scheduling' },
      { name: 'Service Transfers', path: '/service-transfers' }
    ]
  },
  {
    name: 'Billing & Payments',
    icon: CreditCard,
    color: 'text-green-600',
    workflows: [
      { name: 'Invoices', path: '/invoices' },
      { name: 'Transaction History', path: '/transaction-history' },
      { name: 'Subscriptions', path: '/subscriptions' }
    ]
  },
  {
    name: 'HR Management',
    icon: UserCheck,
    color: 'text-indigo-600',
    workflows: [
      { name: 'HR Dashboard', path: '/enterprise-hr' },
      { name: 'AI Setup Wizard', path: '/hr-configuration-wizard' },
      { name: 'Employee Directory', path: '/enterprise-hr?tab=employees' },
      { name: 'Recruitment & Hiring', path: '/enterprise-hr?tab=recruitment' },
      { name: 'Performance Reviews', path: '/enterprise-hr?tab=performance' },
      { name: 'Time Off & Attendance', path: '/enterprise-hr?tab=time-off' },
      { name: 'Payroll Management', path: '/enterprise-hr?tab=payroll' },
      { name: 'Onboarding', path: '/enterprise-hr?tab=onboarding' },
      { name: 'Training & Development', path: '/enterprise-hr?tab=training' },
      { name: 'Compliance & Documents', path: '/enterprise-hr?tab=compliance' },
      { name: 'AI HR Assistant', path: '/enterprise-hr?tab=ai-assistant' }
    ]
  },
  {
    name: 'Team Management',
    icon: Users,
    color: 'text-purple-600',
    workflows: [
      { name: 'User Management', path: '/user-management' },
      { name: 'Role Management', path: '/role-management' },
      { name: 'Subcontractor Management', path: '/subcontractor-management' }
    ]
  },
  {
    name: 'External Portal Access',
    icon: Globe,
    color: 'text-cyan-600',
    workflows: [
      { name: 'Portal Login (Public)', path: '/portal' },
      { name: 'Subcontractor Portal', path: '/portal?role=subcontractor' },
      { name: 'Investor Portal', path: '/portal?role=investor' },
      { name: 'Vendor Portal', path: '/portal?role=vendor' },
      { name: 'Employee Portal', path: '/employee-portal' },
      { name: 'Handyman Portal', path: '/handyman-portal' },
      { name: 'Emergency On-Call Management', path: '/admin-on-call-management' },
      { name: 'Emergency On-Call v2.0 (Multi-Tenant)', path: '/admin-on-call-management-v2' },
      { name: '🎯 Emergency Scoping Demo', path: '/emergency-scoping-demo' },
      { name: 'Portal Control Panel', path: '/mobile-hub?view=control-panel' },
      { name: 'Manage Permissions', path: '/mobile-hub?view=control-panel&tab=active' }
    ]
  },
  {
    name: 'Design & Content',
    icon: Palette,
    color: 'text-orange-600',
    workflows: [
      { name: 'Design Studio Pro', path: '/design-studio-pro' },
      { name: 'Camera & Video Capture', path: '/door-window-measurement' },
      { name: 'AI Video Analysis', path: '/ai-video-analysis-studio' },
      { name: 'Materials Database', path: '/materials-database' }
    ]
  },
  {
    name: 'Business Tools',
    icon: Wrench,
    color: 'text-teal-600',
    workflows: [
      { name: 'Enterprise Email Management', path: '/enterprise-email' },
      { name: 'Time Tracking Dashboard', path: '/time-tracking' },
      { name: 'Time Entries', path: '/time-tracking?tab=entries' },
      { name: 'Team Time View', path: '/time-tracking?tab=team' },
      { name: 'GPS & Live Tracking', path: '/time-tracking?tab=gps' },
      { name: 'Time Reports', path: '/time-tracking?tab=reports' },
      { name: 'Settings & Configuration', path: '/time-tracking?tab=settings' }
    ]
  },
  {
    name: 'Marketing & Content',
    icon: Megaphone,
    color: 'text-pink-600',
    workflows: [
      { name: 'Marketing Feed', path: '/marketing-feed' },
      { name: 'Reel Ads', path: '/reel-ads' },
      { name: 'Referral Rewards', path: '/referral-rewards' },
      { name: 'Customer Reviews', path: '/customer-reviews' }
    ]
  },
  {
    name: 'Reports & Analytics',
    icon: BarChart3,
    color: 'text-orange-600',
    workflows: [
      { name: 'Admin Alerts & Tracking', path: '/admin-alerts-tracking' },
      { name: 'Enterprise Reporting', path: '/reporting' },
      { name: 'Platform Observability', path: '/platform-observability' },
      { name: 'AI Diagnostics', path: '/ai-diagnostics' }
    ]
  },
  {
    name: 'System Settings',
    icon: Settings,
    color: 'text-slate-600',
    workflows: [
      { name: 'Database Admin', path: '/database-admin' },
      { name: 'Supabase Connection', path: '/supabase-connection' },
      { name: 'Domain Management', path: '/domain-management' },
      { name: 'Admin Access Control', path: '/admin-access-control' },
      { name: 'Data Backup', path: '/data-backup' }
    ]
  }
];

export default function GlobalNavigationPanel() {
  const { user } = useUser();
  const [expandedModules, setExpandedModules] = useState<string[]>([]);

  const toggleModule = (moduleName: string) => {
    setExpandedModules(prev =>
      prev.includes(moduleName)
        ? prev.filter(m => m !== moduleName)
        : [...prev, moduleName]
    );
  };

  const handleNavigation = (path: string) => {
    window.location.href = path;
  };

  // Filter modules based on user role
  const filteredModules = modules.filter(module => {
    // Owner's Portal only visible to Platform Owners
    if (module.name === 'Owners Portal' && user?.role !== UserRole.PLATFORM_OWNER) {
      return false;
    }
    return true;
  });

  return (
    <div className="bg-slate-100 rounded-xl border-2 border-slate-300 p-6 shadow-lg">
      <h2 className="font-bold text-black mb-4">Global Navigation</h2>
      
      <div className="space-y-2">
        {filteredModules.map((module) => {
          const Icon = module.icon;
          const isExpanded = expandedModules.includes(module.name);
          
          return (
            <div key={module.name} className="border-2 border-slate-300 rounded-lg overflow-hidden bg-white">
              <button
                onClick={() => toggleModule(module.name)}
                className="w-full flex items-center justify-between p-3 hover:bg-orange-50 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <Icon className={`w-5 h-5 ${module.color}`} />
                  <span className="font-bold text-black">{module.name}</span>
                  {module.name === 'HR Management' && (
                    <span className="px-2 py-0.5 bg-purple-600 text-white text-xs font-bold rounded-full flex items-center gap-1">
                      <Brain className="w-3 h-3" />
                      AI
                    </span>
                  )}
                </div>
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4 text-black" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-black" />
                )}
              </button>
              
              {isExpanded && (
                <div className="bg-slate-50 border-t-2 border-slate-300">
                  {module.workflows.map((workflow) => (
                    <button
                      key={workflow.path}
                      onClick={() => handleNavigation(workflow.path)}
                      className="w-full text-left px-3 py-2 pl-11 text-sm text-black font-semibold hover:bg-orange-100 hover:text-black transition-colors"
                    >
                      {workflow.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}