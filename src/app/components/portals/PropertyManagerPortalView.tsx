import { useState, useEffect } from 'react';
import {
  Building2, Home, Users, Wrench, DollarSign, TrendingUp, Calendar,
  FileText, Clock, CheckCircle, AlertTriangle, BarChart3, Settings,
  Bell, Search, Filter, MapPin, Phone, Mail, Key, Shield, Award,
  ArrowUpRight, ArrowDownRight, AlertCircle, ChevronRight, Tag,
  Zap, Lock, Crown, ExternalLink, Package, Layout, ChevronDown, Check, X
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import LayoutManager from '../layout-editor/LayoutManager';
import { PrimaryButton } from '../ui/button/PrimaryButton';
import { ChartContainer } from '../ChartContainer';
import ReferralRewards from '../ReferralRewards';
import { useUserData } from '../../lib/hooks/useUserData';
import { PropertyManagerService, CondoService } from '../../lib/services/propertyManagementService';

interface Association {
  id: string;
  name: string;
  type: 'condo' | 'landlord';
  address: string;
  totalUnits: number;
  buildings?: number;
  occupancy?: number;
  monthlyRevenue?: number;
}

interface WorkRequest {
  id: string;
  condoId?: string;
  landlordId?: string;
  propertyName: string;
  unitNumber: string;
  title: string;
  description: string;
  category: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending_approval' | 'approved' | 'in-progress' | 'completed' | 'rejected';
  residentName: string;
  estimatedCost?: number;
  created_at: string;
  updated_at: string;
}

export default function PropertyManagerPortalView() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'associations' | 'work-requests' | 'tenants' | 'financials' | 'reports' | 'referrals'>('dashboard');
  const [loading, setLoading] = useState(true);
  const [selectedAssociation, setSelectedAssociation] = useState<Association | null>(null);
  const [associations, setAssociations] = useState<Association[]>([]);
  const [workRequests, setWorkRequests] = useState<WorkRequest[]>([]);
  const [filteredWorkRequests, setFilteredWorkRequests] = useState<WorkRequest[]>([]);

  // Property Manager ID - would come from auth in production
  const pmId = localStorage.getItem('pm_id') || 'pm-demo-1';

  // Subscription tier - determines feature access
  const [subscriptionTier, setSubscriptionTier] = useUserData<string>('pm_subscription_tier', 'professional');

  // Check premium feature access
  const hasContentCenterAccess = ['premium', 'elite'].includes(subscriptionTier);
  const hasAdvancedReportsAccess = ['professional', 'premium', 'elite'].includes(subscriptionTier);

  useEffect(() => {
    loadData();
  }, [pmId]);

  useEffect(() => {
    // Filter work requests by selected association
    if (selectedAssociation) {
      const filtered = workRequests.filter(wr =>
        (selectedAssociation.type === 'condo' && wr.condoId === selectedAssociation.id) ||
        (selectedAssociation.type === 'landlord' && wr.landlordId === selectedAssociation.id)
      );
      setFilteredWorkRequests(filtered);
    } else {
      // Show all work requests if no association selected
      setFilteredWorkRequests(workRequests);
    }
  }, [selectedAssociation, workRequests]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load demo data immediately for now (will connect to backend later)
      loadDemoData();
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const loadDemoData = () => {
    // Create demo associations
    const demoAssociations: Association[] = [
      {
        id: 'condo-1',
        name: 'Harborview Condo Association',
        type: 'condo',
        address: '1250 Waterfront Drive, Miami, FL 33139',
        totalUnits: 240,
        buildings: 4,
        occupancy: 98,
        monthlyRevenue: 96000
      },
      {
        id: 'condo-2',
        name: 'Sunset Towers HOA',
        type: 'condo',
        address: '450 Beach Boulevard, Fort Lauderdale, FL 33301',
        totalUnits: 180,
        buildings: 2,
        occupancy: 96,
        monthlyRevenue: 72000
      },
      {
        id: 'condo-3',
        name: 'Oceanview Gardens',
        type: 'condo',
        address: '789 Coastal Highway, Boca Raton, FL 33432',
        totalUnits: 150,
        buildings: 3,
        occupancy: 100,
        monthlyRevenue: 60000
      }
    ];

    setAssociations(demoAssociations);
    setSelectedAssociation(demoAssociations[0]);

    // Create demo work requests
    const demoWorkRequests: WorkRequest[] = [
      {
        id: 'wr-1',
        condoId: 'condo-1',
        propertyName: 'Harborview Condo Association',
        unitNumber: 'Common Area - Pool',
        title: 'Pool heater malfunction',
        description: 'Main pool heater not maintaining temperature',
        category: 'HVAC',
        priority: 'high',
        status: 'pending_approval',
        residentName: 'Facility Manager',
        estimatedCost: 2400,
        created_at: '2026-05-03T10:00:00Z',
        updated_at: '2026-05-03T10:00:00Z'
      },
      {
        id: 'wr-2',
        condoId: 'condo-2',
        propertyName: 'Sunset Towers HOA',
        unitNumber: 'Elevator 1',
        title: 'Elevator annual inspection',
        description: 'Required safety inspection for Elevator 1',
        category: 'Elevator',
        priority: 'medium',
        status: 'pending_approval',
        residentName: 'Board President',
        estimatedCost: 1800,
        created_at: '2026-05-03T11:30:00Z',
        updated_at: '2026-05-03T11:30:00Z'
      },
      {
        id: 'wr-3',
        condoId: 'condo-1',
        propertyName: 'Harborview Condo Association',
        unitNumber: 'Building A - Unit 305',
        title: 'Water leak in ceiling',
        description: 'Resident reports water damage on ceiling, appears to be coming from unit above',
        category: 'Plumbing',
        priority: 'urgent',
        status: 'pending_approval',
        residentName: 'John Smith (Unit 305)',
        estimatedCost: 1200,
        created_at: '2026-05-04T14:15:00Z',
        updated_at: '2026-05-04T14:15:00Z'
      },
      {
        id: 'wr-4',
        condoId: 'condo-3',
        propertyName: 'Oceanview Gardens',
        unitNumber: 'Common Area - Lobby',
        title: 'Replace lobby chandelier',
        description: 'Main lobby chandelier needs new LED bulbs',
        category: 'Electrical',
        priority: 'low',
        status: 'approved',
        residentName: 'Property Manager',
        estimatedCost: 450,
        created_at: '2026-05-02T09:00:00Z',
        updated_at: '2026-05-03T16:00:00Z'
      },
      {
        id: 'wr-5',
        condoId: 'condo-2',
        propertyName: 'Sunset Towers HOA',
        unitNumber: 'Parking Garage',
        title: 'Security gate malfunction',
        description: 'Main entrance gate stuck in open position',
        category: 'Security',
        priority: 'high',
        status: 'in-progress',
        residentName: 'Security Team',
        estimatedCost: 950,
        created_at: '2026-05-01T08:30:00Z',
        updated_at: '2026-05-04T10:00:00Z'
      }
    ];

    setWorkRequests(demoWorkRequests);
  };

  const handleApproveRequest = (requestId: string) => {
    // Update status in state
    setWorkRequests(prev => prev.map(wr =>
      wr.id === requestId
        ? { ...wr, status: 'approved' as const }
        : wr
    ));
    toast.success('Work request approved');
  };

  const handleRejectRequest = (requestId: string) => {
    // Update status in state
    setWorkRequests(prev => prev.map(wr =>
      wr.id === requestId
        ? { ...wr, status: 'rejected' as const }
        : wr
    ));
    toast.success('Work request rejected');
  };

  const handleContentCenterClick = () => {
    if (hasContentCenterAccess) {
      window.location.href = '/enterprise-content-center';
    } else {
      toast.error('Upgrade to Premium or Elite to access Content Center');
    }
  };

  const handleAdvancedReportsClick = () => {
    if (hasAdvancedReportsAccess) {
      window.location.href = '/enterprise-reporting';
    } else {
      toast.error('Upgrade to Professional or higher to access Advanced Reports');
    }
  };

  // Property Manager info
  const pmInfo = {
    name: 'Metro Property Management',
    email: 'contact@metropm.com',
    phone: '(555) 123-4567',
    accountManager: 'Sarah Johnson',
    memberSince: 'January 2024',
    totalAssociations: associations.length,
    totalUnits: associations.reduce((sum, a) => sum + a.totalUnits, 0),
    rating: 4.9
  };

  // Calculate stats
  const totalMonthlyRevenue = associations.reduce((sum, a) => sum + (a.monthlyRevenue || 0), 0);
  const avgOccupancy = associations.length > 0
    ? Math.round(associations.reduce((sum, a) => sum + (a.occupancy || 0), 0) / associations.length)
    : 0;
  const pendingRequests = filteredWorkRequests.filter(r => r.status === 'pending_approval').length;
  const urgentRequests = filteredWorkRequests.filter(r => r.priority === 'urgent').length;

  const stats = [
    {
      label: 'Monthly Revenue',
      value: `$${totalMonthlyRevenue.toLocaleString()}`,
      change: '+8.2%',
      trend: 'up',
      icon: DollarSign,
      color: 'orange'
    },
    {
      label: 'Total Units',
      value: pmInfo.totalUnits.toString(),
      change: `${associations.length} properties`,
      trend: 'up',
      icon: Building2,
      color: 'blue'
    },
    {
      label: 'Avg Occupancy',
      value: `${avgOccupancy}%`,
      change: '+2.1%',
      trend: 'up',
      icon: Users,
      color: 'green'
    },
    {
      label: 'Work Requests',
      value: filteredWorkRequests.length.toString(),
      change: `${pendingRequests} pending`,
      trend: urgentRequests > 0 ? 'down' : 'neutral',
      icon: Wrench,
      color: urgentRequests > 0 ? 'red' : 'yellow'
    }
  ];

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-500/10 text-red-400 border-red-500/20';
      case 'high': return 'bg-orange-500/10 text-orange-400 border-orange-500/20';
      case 'medium': return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
      case 'low': return 'bg-green-500/10 text-green-400 border-green-500/20';
      default: return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500/10 text-green-400 border-green-500/20';
      case 'in-progress': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'approved': return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      case 'pending_approval': return 'bg-orange-500/10 text-orange-400 border-orange-500/20';
      case 'rejected': return 'bg-red-500/10 text-red-400 border-red-500/20';
      default: return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
    }
  };

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: Home },
    { id: 'associations', label: 'Associations', icon: Building2 },
    { id: 'work-requests', label: 'Work Requests', icon: Wrench },
    { id: 'tenants', label: 'Tenants', icon: Users },
    { id: 'financials', label: 'Financials', icon: DollarSign },
    { id: 'reports', label: 'Reports', icon: BarChart3 },
    { id: 'referrals', label: 'Referral Rewards', icon: Award }
  ];

  return (
    <LayoutManager pageName="Property Manager Portal" enableCustomization={true} showEditButton={true}>
      <div className="w-full min-h-screen bg-[#0A0A0A]">
        {/* Header */}
        <div className="bg-[#1A1A1A] border-b border-[#2A2A2A] sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-600 to-amber-700 flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-white" />
                  </div>
                  Property Manager Portal
                </h1>
                <p className="text-gray-400 mt-1">{pmInfo.name}</p>
              </div>
              <div className="flex items-center gap-3">
                {/* Association Switcher */}
                {associations.length > 0 && (
                  <div className="relative group">
                    <button className="flex items-center gap-2 px-4 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-gray-300 hover:text-white hover:border-amber-500/30 transition">
                      <Building2 className="w-4 h-4" />
                      <span className="text-sm font-medium">
                        {selectedAssociation ? selectedAssociation.name : 'All Associations'}
                      </span>
                      <ChevronDown className="w-4 h-4" />
                    </button>
                    <div className="absolute right-0 top-full mt-2 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all min-w-[300px] max-h-[400px] overflow-y-auto">
                      <button
                        onClick={() => setSelectedAssociation(null)}
                        className="w-full px-4 py-3 text-left text-white hover:bg-[#2A2A2A] transition flex items-center justify-between border-b border-[#2A2A2A]"
                      >
                        <span>All Associations</span>
                        {!selectedAssociation && <Check className="w-4 h-4 text-green-400" />}
                      </button>
                      {associations.map(assoc => (
                        <button
                          key={assoc.id}
                          onClick={() => setSelectedAssociation(assoc)}
                          className="w-full px-4 py-3 text-left text-white hover:bg-[#2A2A2A] transition flex items-center justify-between"
                        >
                          <div className="flex-1">
                            <div className="font-semibold">{assoc.name}</div>
                            <div className="text-xs text-gray-400">{assoc.totalUnits} units • {assoc.buildings} building(s)</div>
                          </div>
                          {selectedAssociation?.id === assoc.id && <Check className="w-4 h-4 text-green-400" />}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <button className="p-2 rounded-lg bg-[#0A0A0A] border border-[#2A2A2A] text-gray-400 hover:text-white hover:border-amber-500/30 transition relative">
                  <Bell className="w-5 h-5" />
                  {pendingRequests > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-xs text-white font-bold">
                      {pendingRequests}
                    </span>
                  )}
                </button>
                <button className="p-2 rounded-lg bg-[#0A0A0A] border border-[#2A2A2A] text-gray-400 hover:text-white hover:border-amber-500/30 transition">
                  <Settings className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Selected Association Info Banner */}
            {selectedAssociation && (
              <div className="mb-4 bg-amber-600/10 border border-amber-500/30 rounded-lg p-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Building2 className="w-5 h-5 text-amber-400" />
                  <div>
                    <p className="text-white font-semibold">{selectedAssociation.name}</p>
                    <p className="text-sm text-gray-400">{selectedAssociation.address}</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedAssociation(null)}
                  className="text-amber-400 hover:text-amber-300 text-sm font-semibold"
                >
                  View All
                </button>
              </div>
            )}

            {/* Tabs */}
            <div className="flex gap-1 overflow-x-auto pb-2">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition whitespace-nowrap relative ${
                    activeTab === tab.id
                      ? 'bg-amber-600 text-white'
                      : 'text-gray-400 hover:text-white hover:bg-[#2A2A2A]'
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                  {tab.id === 'work-requests' && pendingRequests > 0 && (
                    <span className="ml-1 px-2 py-0.5 bg-red-500 rounded-full text-xs text-white font-bold">
                      {pendingRequests}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-7xl mx-auto px-6 py-8">
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {stats.map((stat, idx) => (
                  <div key={idx} className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className={`w-10 h-10 rounded-lg bg-${stat.color}-500/10 flex items-center justify-center`}>
                        <stat.icon className={`w-5 h-5 text-${stat.color}-400`} />
                      </div>
                      <div className={`flex items-center gap-1 text-sm ${stat.trend === 'up' ? 'text-green-400' : stat.trend === 'down' ? 'text-red-400' : 'text-gray-400'}`}>
                        {stat.trend === 'up' && <ArrowUpRight className="w-4 h-4" />}
                        {stat.trend === 'down' && <ArrowDownRight className="w-4 h-4" />}
                        <span>{stat.change}</span>
                      </div>
                    </div>
                    <div className="text-2xl font-bold text-white mb-1">{stat.value}</div>
                    <div className="text-sm text-gray-400">{stat.label}</div>
                  </div>
                ))}
              </div>

              {/* Pending Approvals */}
              {pendingRequests > 0 && (
                <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-6">
                  <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-orange-400" />
                    Pending Approvals ({pendingRequests})
                  </h2>
                  <div className="space-y-4">
                    {filteredWorkRequests
                      .filter(wr => wr.status === 'pending_approval')
                      .slice(0, 3)
                      .map(request => (
                        <div key={request.id} className="bg-[#0A0A0A] rounded-lg border border-[#2A2A2A] p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <h3 className="text-white font-semibold">{request.title}</h3>
                                <span className={`px-3 py-1 rounded-lg text-xs font-semibold border ${getPriorityColor(request.priority)}`}>
                                  {request.priority.toUpperCase()}
                                </span>
                              </div>
                              <p className="text-sm text-gray-400 mb-2">{request.propertyName} - {request.unitNumber}</p>
                              <p className="text-sm text-white">{request.description}</p>
                            </div>
                          </div>
                          <div className="flex items-center justify-between pt-3 border-t border-[#2A2A2A]">
                            <div className="text-sm text-gray-400">
                              Est. Cost: <span className="text-white font-semibold">${request.estimatedCost?.toLocaleString() || 'TBD'}</span>
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleApproveRequest(request.id)}
                                className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg font-semibold transition flex items-center gap-2"
                              >
                                <Check className="w-4 h-4" />
                                Approve
                              </button>
                              <button
                                onClick={() => handleRejectRequest(request.id)}
                                className="px-4 py-2 bg-red-600/10 hover:bg-red-600/20 border border-red-500/30 text-red-400 rounded-lg font-semibold transition flex items-center gap-2"
                              >
                                <X className="w-4 h-4" />
                                Reject
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    {pendingRequests > 3 && (
                      <button
                        onClick={() => setActiveTab('work-requests')}
                        className="w-full py-3 border border-[#2A2A2A] rounded-lg text-amber-400 hover:text-amber-300 hover:border-amber-500/30 transition font-semibold"
                      >
                        View All {pendingRequests} Pending Requests
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Associations Overview */}
              <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-bold text-white">Managed Associations</h2>
                  <button
                    onClick={() => setActiveTab('associations')}
                    className="text-amber-400 hover:text-amber-300 text-sm font-semibold flex items-center gap-1"
                  >
                    View All
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {associations.slice(0, 4).map(assoc => (
                    <div
                      key={assoc.id}
                      onClick={() => setSelectedAssociation(assoc)}
                      className="bg-[#0A0A0A] rounded-lg border border-[#2A2A2A] p-4 hover:border-amber-500/30 transition cursor-pointer"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="font-semibold text-white mb-1">{assoc.name}</h3>
                          <p className="text-sm text-gray-400">{assoc.address}</p>
                        </div>
                        <span className="px-3 py-1 rounded-lg text-xs font-semibold bg-green-500/10 text-green-400 border border-green-500/20">
                          ACTIVE
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-gray-500">Total Units</p>
                          <p className="text-white font-semibold">{assoc.totalUnits}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Buildings</p>
                          <p className="text-white font-semibold">{assoc.buildings}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'associations' && (
            <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-6">
              <h2 className="text-lg font-bold text-white mb-6">All Managed Associations</h2>
              <div className="space-y-4">
                {associations.map(assoc => (
                  <div key={assoc.id} className="bg-[#0A0A0A] rounded-lg border border-[#2A2A2A] p-6 hover:border-amber-500/30 transition">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-xl font-semibold text-white mb-2">{assoc.name}</h3>
                        <p className="text-gray-400 flex items-center gap-2">
                          <MapPin className="w-4 h-4" />
                          {assoc.address}
                        </p>
                      </div>
                      <button
                        onClick={() => setSelectedAssociation(assoc)}
                        className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg font-semibold transition"
                      >
                        View Details
                      </button>
                    </div>
                    <div className="grid grid-cols-4 gap-4 pt-4 border-t border-[#2A2A2A]">
                      <div>
                        <p className="text-sm text-gray-400 mb-1">Total Units</p>
                        <p className="text-lg font-bold text-white">{assoc.totalUnits}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-400 mb-1">Buildings</p>
                        <p className="text-lg font-bold text-white">{assoc.buildings}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-400 mb-1">Occupancy</p>
                        <p className="text-lg font-bold text-green-400">{assoc.occupancy}%</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-400 mb-1">Monthly Revenue</p>
                        <p className="text-lg font-bold text-white">${assoc.monthlyRevenue?.toLocaleString()}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'work-requests' && (
            <div className="space-y-6">
              <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-6">
                <h2 className="text-lg font-bold text-white mb-6">
                  Work Requests
                  {selectedAssociation && ` - ${selectedAssociation.name}`}
                </h2>
                <div className="space-y-4">
                  {filteredWorkRequests.length === 0 ? (
                    <div className="text-center py-12">
                      <Wrench className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                      <p className="text-gray-400">No work requests found</p>
                    </div>
                  ) : (
                    filteredWorkRequests.map(request => (
                      <div key={request.id} className="bg-[#0A0A0A] rounded-lg border border-[#2A2A2A] p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="text-white font-semibold">{request.title}</h3>
                              <span className={`px-3 py-1 rounded-lg text-xs font-semibold border ${getPriorityColor(request.priority)}`}>
                                {request.priority.toUpperCase()}
                              </span>
                              <span className={`px-3 py-1 rounded-lg text-xs font-semibold border ${getStatusColor(request.status)}`}>
                                {request.status.replace('_', ' ').toUpperCase()}
                              </span>
                            </div>
                            <p className="text-sm text-gray-400 mb-2">{request.propertyName} - {request.unitNumber}</p>
                            <p className="text-sm text-white mb-3">{request.description}</p>
                            <div className="grid grid-cols-3 gap-4 text-sm">
                              <div>
                                <p className="text-gray-500">Category</p>
                                <p className="text-white font-semibold">{request.category}</p>
                              </div>
                              <div>
                                <p className="text-gray-500">Submitted By</p>
                                <p className="text-white font-semibold">{request.residentName}</p>
                              </div>
                              <div>
                                <p className="text-gray-500">Est. Cost</p>
                                <p className="text-white font-semibold">${request.estimatedCost?.toLocaleString() || 'TBD'}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                        {request.status === 'pending_approval' && (
                          <div className="flex gap-2 pt-3 border-t border-[#2A2A2A]">
                            <button
                              onClick={() => handleApproveRequest(request.id)}
                              className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg font-semibold transition flex items-center justify-center gap-2"
                            >
                              <Check className="w-4 h-4" />
                              Approve
                            </button>
                            <button
                              onClick={() => handleRejectRequest(request.id)}
                              className="flex-1 px-4 py-2 bg-red-600/10 hover:bg-red-600/20 border border-red-500/30 text-red-400 rounded-lg font-semibold transition flex items-center justify-center gap-2"
                            >
                              <X className="w-4 h-4" />
                              Reject
                            </button>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'tenants' && (
            <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-6">
              <h2 className="text-lg font-bold text-white mb-4">Tenant Management</h2>
              <p className="text-gray-400">Tenant directory and communication tools would be displayed here.</p>
            </div>
          )}

          {activeTab === 'financials' && (
            <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-6">
              <h2 className="text-lg font-bold text-white mb-4">Financial Management</h2>
              <p className="text-gray-400">Revenue tracking, expense management, and financial reports would be displayed here.</p>
            </div>
          )}

          {activeTab === 'reports' && (
            <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-6">
              <h2 className="text-lg font-bold text-white mb-4">Reports & Analytics</h2>
              <p className="text-gray-400">Performance metrics, occupancy reports, and custom analytics would be displayed here.</p>
            </div>
          )}

          {activeTab === 'referrals' && (
            <ReferralRewards />
          )}
        </div>
      </div>
    </LayoutManager>
  );
}
