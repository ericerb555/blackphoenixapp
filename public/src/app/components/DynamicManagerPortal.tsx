import { useState } from 'react';
import {
  ArrowLeft, BarChart3, Users, Settings, FileText, Bell, Shield,
  TrendingUp, DollarSign, Activity, Clock, CheckCircle, AlertCircle,
  Package, Star, Target, Calendar, Eye, Edit, Plus
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';

interface DynamicManagerPortalProps {
  crmTemplate: {
    id: string;
    name: string;
    description: string;
    type: string;
    primaryColor: string;
    icon: string;
    tabs: Array<{
      id: string;
      name: string;
      label: string;
      icon: string;
    }>;
    stats: Array<{
      label: string;
      key: string;
      icon: string;
    }>;
    portalName?: string;
    portalDescription?: string;
    portalColor?: string;
    customerGroupName?: string;
  };
  onClose: () => void;
}

const iconMap: Record<string, any> = {
  BarChart3, Users, Settings, FileText, Bell, Shield,
  TrendingUp, DollarSign, Activity, Clock, CheckCircle,
  AlertCircle, Package, Star, Target, Calendar, Eye, Edit, Plus
};

export default function DynamicManagerPortal({ crmTemplate, onClose }: DynamicManagerPortalProps) {
  const [activeTab, setActiveTab] = useState(crmTemplate.tabs[0]?.id || 'overview');

  const portalColor = crmTemplate.portalColor || 'purple';
  const portalName = crmTemplate.portalName || `${crmTemplate.name} Manager Portal`;
  const portalDescription = crmTemplate.portalDescription || `Manager portal for ${crmTemplate.name}`;

  const colorGradients: Record<string, string> = {
    cyan: 'from-cyan-600 to-cyan-700',
    blue: 'from-blue-600 to-blue-700',
    purple: 'from-purple-600 to-purple-700',
    green: 'from-green-600 to-green-700',
    orange: 'from-orange-600 to-orange-700',
    red: 'from-red-600 to-red-700',
    pink: 'from-pink-600 to-pink-700',
    indigo: 'from-indigo-600 to-indigo-700'
  };

  const borderColors: Record<string, string> = {
    cyan: 'border-cyan-500',
    blue: 'border-blue-500',
    purple: 'border-purple-500',
    green: 'border-green-500',
    orange: 'border-orange-500',
    red: 'border-red-500',
    pink: 'border-pink-500',
    indigo: 'border-indigo-500'
  };

  const textColors: Record<string, string> = {
    cyan: 'text-cyan-400',
    blue: 'text-blue-400',
    purple: 'text-purple-400',
    green: 'text-green-400',
    orange: 'text-orange-400',
    red: 'text-red-400',
    pink: 'text-pink-400',
    indigo: 'text-indigo-400'
  };

  const gradient = colorGradients[portalColor] || colorGradients.purple;
  const borderColor = borderColors[portalColor] || borderColors.purple;
  const textColor = textColors[portalColor] || textColors.purple;

  // Sample metrics data
  const metricsData: Record<string, string> = {
    totalItems: '245',
    activeItems: '187',
    pendingItems: '42',
    completedItems: '612',
    totalRevenue: '$1.2M',
    monthlyRevenue: '$125K',
    totalCustomers: '156',
    activeCustomers: '142',
    totalProjects: '89',
    activeProjects: '34'
  };

  return (
    <div className="w-full min-h-screen bg-[#0A0A0A]">
      {/* Header */}
      <div className={`bg-gradient-to-r ${gradient} p-8 border-b-4 ${borderColor}`}>
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-sm flex items-center justify-center border-2 border-white/20">
                <Shield className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white mb-1">{portalName}</h1>
                <p className="text-white/80">{portalDescription}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="px-6 py-3 bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/20 rounded-xl text-white font-bold transition flex items-center gap-2"
            >
              <ArrowLeft className="w-5 h-5" />
              Back to Hub
            </button>
          </div>

          {/* Portal Stats */}
          <div className="grid grid-cols-4 gap-4">
            {crmTemplate.stats.slice(0, 4).map((stat, index) => {
              const IconComponent = iconMap[stat.icon] || Package;
              const value = metricsData[stat.key] || '--';
              
              return (
                <div key={index} className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-white/80 text-sm">{stat.label}</p>
                    <IconComponent className="w-5 h-5 text-white/60" />
                  </div>
                  <p className="text-2xl font-bold text-white">{value}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-[#1A1A1A] border-b border-[#2A2A2A]">
        <div className="max-w-7xl mx-auto px-8">
          <div className="flex gap-1">
            {crmTemplate.tabs.map((tab) => {
              const IconComponent = iconMap[tab.icon] || FileText;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-6 py-4 font-medium transition flex items-center gap-2 border-b-2 ${
                    activeTab === tab.id
                      ? `${textColor} ${borderColor} bg-${portalColor}-500/5`
                      : 'text-gray-400 border-transparent hover:text-white hover:bg-white/5'
                  }`}
                >
                  <IconComponent className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto p-8">
        <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-8">
          <div className="text-center py-12">
            <Package className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">
              {crmTemplate.tabs.find(t => t.id === activeTab)?.label || 'Content'}
            </h3>
            <p className="text-gray-400 mb-6">
              This is a dynamically generated portal for {crmTemplate.name}
            </p>
            <div className="max-w-md mx-auto space-y-3">
              <div className="p-4 bg-[#0A0A0A] rounded-xl border border-[#2A2A2A] text-left">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="w-5 h-5 text-green-400" />
                  <p className="text-sm font-bold text-white">Portal Auto-Generated</p>
                </div>
                <p className="text-xs text-gray-400">
                  This portal was automatically created when you built the CRM template
                </p>
              </div>
              <div className="p-4 bg-[#0A0A0A] rounded-xl border border-[#2A2A2A] text-left">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="w-5 h-5 text-blue-400" />
                  <p className="text-sm font-bold text-white">Customer Group Integration</p>
                </div>
                <p className="text-xs text-gray-400">
                  Customers from "{crmTemplate.customerGroupName || 'this CRM'}" can access this portal
                </p>
              </div>
              <div className="p-4 bg-[#0A0A0A] rounded-xl border border-[#2A2A2A] text-left">
                <div className="flex items-center gap-2 mb-2">
                  <BarChart3 className="w-5 h-5 text-purple-400" />
                  <p className="text-sm font-bold text-white">Separate Data Tracking</p>
                </div>
                <p className="text-xs text-gray-400">
                  All data is tracked separately and reports to the Reports tab
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
