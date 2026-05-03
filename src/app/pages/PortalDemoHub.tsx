import { useState, useEffect } from 'react';
import {
  Users, Store, Megaphone, Wrench, Briefcase, Home, Building2,
  Key, TrendingUp, Layout, ChevronRight, Monitor, ArrowLeft, Sparkles, LayoutGrid
} from 'lucide-react';

// Import all portal view components
import VendorPortalView from '../components/portals/VendorPortalView';
import CustomerPortalView from '../components/portals/CustomerPortalView';
import AdvertiserPortalView from '../components/portals/AdvertiserPortalView';
import CondoAssociationPortalView from '../components/portals/CondoAssociationPortalView';
import LandlordPortalView from '../components/portals/LandlordPortalView';
import InvestorPortalView from '../components/portals/InvestorPortalView';
import MobileOwnerPortalView from '../components/portals/MobileOwnerPortalView';
import OnCallEmergencyPortal from '../components/portals/OnCallEmergencyPortal';
import EmployeePortalView from '../components/portals/EmployeePortalView';
import SubcontractorPortal from '../components/portals/SubcontractorPortal';

// Portal configuration - easy to add new portals here
const PORTALS = [
  {
    id: 'customer',
    name: 'Customer Portal',
    description: 'For property owners and clients',
    icon: Users,
    component: CustomerPortalView,
    color: 'orange'
  },
  {
    id: 'vendor',
    name: 'Vendor Portal',
    description: 'For suppliers and vendors',
    icon: Store,
    component: VendorPortalView,
    color: 'blue'
  },
  {
    id: 'advertiser',
    name: 'Advertiser Portal',
    description: 'For marketing and advertising',
    icon: Megaphone,
    component: AdvertiserPortalView,
    color: 'purple'
  },
  {
    id: 'subcontractor',
    name: 'Subcontractor Portal',
    description: 'For subcontractors and workers',
    icon: Wrench,
    component: SubcontractorPortal,
    color: 'yellow'
  },
  {
    id: 'employee',
    name: 'Employee Portal',
    description: 'For internal staff members',
    icon: Briefcase,
    component: EmployeePortalView,
    color: 'green'
  },
  {
    id: 'owner',
    name: 'Property Owner Portal',
    description: 'For property owners',
    icon: Home,
    component: MobileOwnerPortalView,
    color: 'indigo'
  },
  {
    id: 'property-manager',
    name: 'Property Manager Portal',
    description: 'For property management',
    icon: Building2,
    component: LandlordPortalView,
    color: 'pink'
  },
  {
    id: 'landlord',
    name: 'Landlord Portal',
    description: 'For landlords and rental owners',
    icon: Key,
    component: LandlordPortalView,
    color: 'red'
  },
  {
    id: 'investor',
    name: 'Investor Portal',
    description: 'For investors and stakeholders',
    icon: TrendingUp,
    component: InvestorPortalView,
    color: 'emerald'
  },
  {
    id: 'condo',
    name: 'Condo Association Portal',
    description: 'For condo associations',
    icon: Layout,
    component: CondoAssociationPortalView,
    color: 'cyan'
  }
];

export default function PortalDemoHub() {
  // Get active portal from URL or default to null (show grid)
  const [activePortalId, setActivePortalId] = useState<string | null>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('portal');
  });
  
  const activePortal = PORTALS.find(p => p.id === activePortalId);

  const selectPortal = (portalId: string) => {
    const newUrl = `${window.location.pathname}?portal=${portalId}`;
    window.history.pushState({}, '', newUrl);
    setActivePortalId(portalId);
  };

  const goBack = () => {
    window.history.pushState({}, '', window.location.pathname);
    setActivePortalId(null);
  };

  const navigateToDashboard = () => {
    window.location.href = '/unified-dashboard';
  };

  // Listen for browser back/forward buttons
  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      setActivePortalId(params.get('portal'));
    };
    
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Get icon color class matching UnifiedDashboard
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
      indigo: 'text-indigo-400',
      emerald: 'text-emerald-400',
    };
    return colorMap[color] || 'text-orange-400';
  };

  // Get glow color class matching UnifiedDashboard
  const getGlowColorClass = (color: string) => {
    const colorMap: { [key: string]: string } = {
      orange: 'from-orange-500/20',
      green: 'from-green-500/20',
      blue: 'from-blue-500/20',
      cyan: 'from-cyan-500/20',
      purple: 'from-purple-500/20',
      pink: 'from-pink-500/20',
      amber: 'from-amber-500/20',
      yellow: 'from-yellow-500/20',
      red: 'from-red-500/20',
      violet: 'from-violet-500/20',
      indigo: 'from-indigo-500/20',
      emerald: 'from-emerald-500/20',
    };
    return colorMap[color] || 'from-orange-500/20';
  };

  // If a portal is selected, render it
  if (activePortal) {
    const PortalComponent = activePortal.component;
    return (
      <div className="min-h-screen bg-[#0A0A0A]">
        {/* Header with back button - Matching UnifiedDashboard style */}
        <div className="sticky top-0 z-50 bg-[#0F0F0F] border-b border-[#2A2A2A]">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={goBack}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#1A1A1A] border border-[#2A2A2A] text-white hover:border-orange-500/50 hover:bg-[#1A1A1A]/80 transition-all duration-200"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back to Hub</span>
                </button>
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br from-${activePortal.color}-500/10 to-${activePortal.color}-600/5 flex items-center justify-center`}>
                    <activePortal.icon className={`w-5 h-5 ${getIconColorClass(activePortal.color)}`} />
                  </div>
                  <div>
                    <h1 className="text-xl font-bold text-white">{activePortal.name}</h1>
                    <p className="text-sm text-gray-400">{activePortal.description}</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 bg-orange-600/20 border border-orange-500/50 rounded-lg">
                <Monitor className="w-4 h-4 text-orange-400" />
                <span className="text-xs font-semibold text-orange-300">DEMO MODE</span>
              </div>
            </div>
          </div>
        </div>

        {/* Portal content */}
        <PortalComponent />
      </div>
    );
  }

  // Show portal grid - Matching UnifiedDashboard style
  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      {/* Header - Matching UnifiedDashboard style */}
      <div className="bg-[#0F0F0F] border-b border-[#2A2A2A] px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={navigateToDashboard}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#1A1A1A] border border-[#2A2A2A] text-white hover:border-orange-500/50 hover:bg-[#1A1A1A]/80 transition-all duration-200"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Dashboard</span>
            </button>
            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-600 to-orange-700 flex items-center justify-center">
                <Monitor className="w-6 h-6 text-white" />
              </div>
              Portal Demo Hub
            </h1>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          {/* Stats Bar - Matching UnifiedDashboard metric cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="p-4 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl hover:border-orange-500/30 transition-all duration-300">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-orange-400" />
                </div>
                <span className="text-xs text-gray-400">Portal Types</span>
              </div>
              <div className="text-3xl font-bold text-white">{PORTALS.length}</div>
              <div className="text-xs text-gray-500 mt-2">Available for demo</div>
            </div>
            
            <div className="p-4 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl hover:border-orange-500/30 transition-all duration-300">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center">
                  <Monitor className="w-4 h-4 text-orange-400" />
                </div>
                <span className="text-xs text-gray-400">Demo Status</span>
              </div>
              <div className="text-3xl font-bold text-white">Live</div>
              <div className="text-xs text-gray-500 mt-2">Fully interactive</div>
            </div>
            
            <div className="p-4 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl hover:border-orange-500/30 transition-all duration-300">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center">
                  <Layout className="w-4 h-4 text-orange-400" />
                </div>
                <span className="text-xs text-gray-400">Features</span>
              </div>
              <div className="text-3xl font-bold text-white">100%</div>
              <div className="text-xs text-gray-500 mt-2">Preserved functionality</div>
            </div>
          </div>

          {/* Portal Grid - Matching UnifiedDashboard module cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {PORTALS.map((portal) => {
              const Icon = portal.icon;
              return (
                <button
                  key={portal.id}
                  onClick={() => selectPortal(portal.id)}
                  className="group relative p-5 rounded-xl border border-[#2A2A2A] bg-gradient-to-br from-[#1A1A1A]/40 to-[#0F0F0F]/40 backdrop-blur-sm hover:border-orange-500/50 hover:shadow-lg hover:shadow-orange-500/20 hover:scale-[1.02] transition-all duration-300 text-left"
                  style={{
                    backdropFilter: 'blur(10px)',
                  }}
                >
                  {/* Glass effect overlay */}
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  
                  {/* Gradient border glow on hover */}
                  <div className={`absolute inset-0 rounded-xl bg-gradient-to-br ${getGlowColorClass(portal.color)} to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
                  
                  <div className="relative">
                    {/* Icon with glow */}
                    <div className={`w-12 h-12 rounded-lg bg-gradient-to-br from-${portal.color}-500/10 to-${portal.color}-600/5 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-300`}>
                      <div className={`absolute inset-0 rounded-lg ${getGlowColorClass(portal.color)} blur-md opacity-0 group-hover:opacity-50 transition-opacity duration-300`} />
                      <Icon className={`w-6 h-6 ${getIconColorClass(portal.color)} relative z-10`} />
                    </div>

                    {/* Portal Name */}
                    <h3 className="text-base font-bold text-white mb-1 group-hover:text-orange-300 transition-colors duration-200">
                      {portal.name}
                    </h3>

                    {/* Description */}
                    <p className="text-sm text-gray-400 line-clamp-2">
                      {portal.description}
                    </p>

                    {/* Arrow indicator */}
                    <div className="absolute top-5 right-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <ChevronRight className="w-5 h-5 text-orange-400" />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Info Cards - Matching UnifiedDashboard style */}
          <div className="mt-6 space-y-4">
            <div className="p-6 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-5 h-5 text-orange-400" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white mb-2">How to Use This Hub</h3>
                  <ul className="space-y-2 text-sm text-gray-400">
                    <li className="flex items-start gap-2">
                      <ChevronRight className="w-4 h-4 text-orange-400 mt-0.5 flex-shrink-0" />
                      <span>Click any portal card to launch the interactive demo</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <ChevronRight className="w-4 h-4 text-orange-400 mt-0.5 flex-shrink-0" />
                      <span>All portal functionality is preserved - you can test features live</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <ChevronRight className="w-4 h-4 text-orange-400 mt-0.5 flex-shrink-0" />
                      <span>Use the "Back to Hub" button to return and try another portal</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <ChevronRight className="w-4 h-4 text-orange-400 mt-0.5 flex-shrink-0" />
                      <span>Perfect for demos - show clients all portal types from one place</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="p-6 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                  <Layout className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white mb-2">Adding New Portals</h3>
                  <p className="text-sm text-gray-400">
                    To add a new portal: Create the portal view component in <code className="px-2 py-0.5 bg-[#0F0F0F] border border-[#2A2A2A] rounded text-orange-400">/components/portals/</code>, 
                    then add it to the <code className="px-2 py-0.5 bg-[#0F0F0F] border border-[#2A2A2A] rounded text-orange-400">PORTALS</code> array in this file. 
                    It will automatically appear in the grid!
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}