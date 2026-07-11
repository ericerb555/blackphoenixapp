import SponsoredMarquee from '../SponsoredMarquee';
import DealsOffersSection from './DealsOffersSection';
import FeaturedDealsReels from './FeaturedDealsReels';
import { useState, useEffect } from 'react';
import {
  Building2, Users, DollarSign, Clipboard, Calendar, FileText,
  Wrench, AlertCircle, TrendingUp, Home, MessageSquare, Settings,
  Bell, ChevronRight, CheckCircle, Shield, Tool, Package, Vote, Award,
  Check, X, UserCheck, Key, Clock, AlertTriangle, ArrowUpRight,
  Zap, Star, Megaphone, Car,
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import LayoutManager from '../layout-editor/LayoutManager';
import { ChartContainer } from '../ChartContainer';
import LogoMarquee from '../LogoMarquee';
import AdvertisingMarquee from '../AdvertisingMarquee';
import AdvertisingVideoReel from '../AdvertisingVideoReel';
import ReferralRewards from '../ReferralRewards';
import { CondoService } from '../../lib/services/propertyManagementService';

// Role types for the condo association
type UserRole = 'board_president' | 'board_member' | 'property_manager' | 'resident';

interface CondoUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  unitNumber?: string;
}

export default function CondoAssociationPortalView() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'units' | 'maintenance' | 'financials' | 'vendors' | 'documents' | 'approvals' | 'team' | 'referrals'>('dashboard');
  const [loading, setLoading] = useState(false);
  const [condoData, setCondoData] = useState<any>(null);
  const [workRequests, setWorkRequests] = useState<any[]>([]);
  const [units, setUnits] = useState<any[]>([]);

  // User role - would come from auth system in production
  const [currentUser, setCurrentUser] = useState<CondoUser>({
    id: 'user-1',
    name: 'Robert Martinez',
    email: 'robert@harborview.com',
    role: localStorage.getItem('condo_user_role') as UserRole || 'board_president'
  });

  // Get condo ID from localStorage or URL params
  const condoId = localStorage.getItem('current_condo_id') || 'demo-condo';

  useEffect(() => {
    loadCondoData();
  }, [condoId]);

  const loadCondoData = () => {
    setLoading(true);
    try {
      // Load demo data immediately
      loadDemoData();
    } catch (error) {
      console.error('Error loading condo data:', error);
      toast.error('Failed to load condo data');
    } finally {
      setLoading(false);
    }
  };

  const loadDemoData = () => {
    // Set demo condo association data
    const demoCondo = {
      id: 'demo-condo',
      name: 'Harborview Condo Association',
      address: '1250 Waterfront Drive, Miami, FL 33139',
      totalUnits: 240,
      buildings: 4,
      president: 'Robert Martinez',
      manager: 'Lisa Anderson',
      phone: '(305) 555-7890',
      email: 'info@harborviewcondo.com'
    };

    setCondoData(demoCondo);

    // Create demo work requests
    const demoRequests = [
      {
        id: 'wr-condo-1',
        condoId: 'demo-condo',
        title: 'Pool heater malfunction',
        description: 'Main pool heater not maintaining temperature',
        category: 'HVAC',
        priority: 'high',
        unitNumber: 'Common Area - Pool',
        propertyName: 'Harborview Condo Association',
        residentName: 'Property Manager',
        status: 'pending_approval',
        estimatedCost: 2400,
        created_at: '2026-05-03T10:00:00Z'
      },
      {
        id: 'wr-condo-2',
        condoId: 'demo-condo',
        title: 'Annual elevator inspection',
        description: 'Required annual safety inspection for Elevator 2',
        category: 'Elevator',
        priority: 'medium',
        unitNumber: 'Elevator 2',
        propertyName: 'Harborview Condo Association',
        residentName: 'Property Manager',
        status: 'pending_approval',
        estimatedCost: 1800,
        created_at: '2026-05-03T11:30:00Z'
      },
      {
        id: 'wr-condo-3',
        condoId: 'demo-condo',
        title: 'Parking gate repair',
        description: 'Main entrance gate stuck in open position',
        category: 'Security',
        priority: 'high',
        unitNumber: 'Parking Garage',
        propertyName: 'Harborview Condo Association',
        residentName: 'Security Team',
        status: 'pending_approval',
        estimatedCost: 1200,
        created_at: '2026-05-04T08:00:00Z'
      },
      {
        id: 'wr-condo-4',
        condoId: 'demo-condo',
        title: 'Lobby light fixture replacement',
        description: 'Chandelier in main lobby needs replacement bulbs',
        category: 'Electrical',
        priority: 'low',
        unitNumber: 'Building A - Lobby',
        propertyName: 'Harborview Condo Association',
        residentName: 'Resident A301',
        status: 'approved',
        estimatedCost: 250,
        created_at: '2026-05-02T09:00:00Z'
      },
      {
        id: 'wr-condo-5',
        condoId: 'demo-condo',
        title: 'Water leak in Unit B207',
        description: 'Ceiling water damage from unit above',
        category: 'Plumbing',
        priority: 'urgent',
        unitNumber: 'Building B - Unit 207',
        propertyName: 'Harborview Condo Association',
        residentName: 'Sarah Chen (Unit B207)',
        status: 'pending_approval',
        estimatedCost: 1500,
        created_at: '2026-05-05T07:30:00Z'
      }
    ];

    setWorkRequests(demoRequests);

    // Create sample units (just a few for demo)
    const demoUnits = [
      {
        id: 'unit-1',
        condoId: 'demo-condo',
        unitNumber: 'A101',
        building: 'Building A',
        floor: 1,
        squareFeet: 1200,
        bedrooms: 2,
        bathrooms: 2,
        ownerName: 'John Doe',
        monthlyHOA: 425,
        occupancyStatus: 'occupied'
      },
      {
        id: 'unit-2',
        condoId: 'demo-condo',
        unitNumber: 'A102',
        building: 'Building A',
        floor: 1,
        squareFeet: 1350,
        bedrooms: 2,
        bathrooms: 2,
        ownerName: 'Jane Smith',
        monthlyHOA: 450,
        occupancyStatus: 'occupied'
      },
      {
        id: 'unit-3',
        condoId: 'demo-condo',
        unitNumber: 'B207',
        building: 'Building B',
        floor: 2,
        squareFeet: 1500,
        bedrooms: 3,
        bathrooms: 2,
        ownerName: 'Sarah Chen',
        monthlyHOA: 475,
        occupancyStatus: 'occupied'
      }
    ];

    setUnits(demoUnits);
  };

  const submitWorkRequest = (requestData: any) => {
    try {
      const newRequest = {
        id: `wr-condo-${Date.now()}`,
        condoId: condoId,
        ...requestData,
        propertyName: condoData?.name || 'Harborview Condo Association',
        status: currentUser.role === 'resident' ? 'pending_approval' : 'approved',
        residentName: currentUser.name,
        created_at: new Date().toISOString()
      };

      setWorkRequests(prev => [...prev, newRequest]);

      if (currentUser.role === 'resident') {
        toast.success('Work request submitted for approval');
      } else {
        toast.success('Work request created and approved');
      }
    } catch (error) {
      console.error('Error submitting work request:', error);
      toast.error('Failed to submit work request');
    }
  };

  const handleApproval = (requestId: string, approved: boolean) => {
    try {
      // Update work request status in state
      const newStatus = approved ? 'approved' : 'rejected';
      setWorkRequests(prev => prev.map(wr =>
        wr.id === requestId
          ? { ...wr, status: newStatus }
          : wr
      ));
      toast.success(`Work request ${approved ? 'approved' : 'rejected'}`);
    } catch (error) {
      console.error('Error updating approval:', error);
      toast.error('Failed to update approval');
    }
  };

  // Role-based permissions
  const canApproveExpenses = currentUser.role === 'board_president' || currentUser.role === 'board_member';
  const canManageWorkRequests = currentUser.role === 'property_manager' || canApproveExpenses;
  const canManageBudget = currentUser.role === 'property_manager' || canApproveExpenses;
  const canManageVendors = currentUser.role === 'property_manager' || canApproveExpenses;
  const canViewFinancials = currentUser.role !== 'resident';
  const canSubmitRequests = true; // All roles can submit

  // Mock association data - use loaded data or defaults
  const associationInfo = condoData || {
    name: 'Harborview Condo Association',
    address: '1250 Waterfront Drive, Miami, FL 33139',
    totalUnits: 240,
    buildings: 4,
    president: 'Robert Martinez',
    manager: 'Lisa Anderson',
    phone: '(305) 555-7890',
    email: 'info@harborviewcondo.com'
  };

  // Budget allocation data
  const budgetData = [
    { name: 'Maintenance', value: 45000, color: '#ea580c' },
    { name: 'Utilities', value: 28000, color: '#3b82f6' },
    { name: 'Insurance', value: 22000, color: '#22c55e' },
    { name: 'Landscaping', value: 15000, color: '#eab308' },
    { name: 'Reserve Fund', value: 30000, color: '#8b5cf6' }
  ];

  // Pending approvals (for board members)
  const pendingApprovals = workRequests.filter(req => req.status === 'pending_approval');

  // Stats - role-based visibility
  const getStatsForRole = () => {
    const baseStats = [
      { label: 'Total Units', value: '240', change: '4 buildings', trend: 'neutral', icon: Building2, color: 'orange' },
      { label: 'Active Work Orders', value: workRequests.filter(r => r.status === 'approved').length.toString(), change: `${pendingApprovals.length} pending`, trend: 'attention', icon: Wrench, color: 'yellow' },
    ];

    if (canViewFinancials) {
      baseStats.push(
        { label: 'Monthly HOA Fees', value: '$96K', change: '+2.1%', trend: 'up', icon: DollarSign, color: 'green' },
        { label: 'Reserve Balance', value: '$340K', change: '+$15K', trend: 'up', icon: Shield, color: 'blue' }
      );
    }

    if (canApproveExpenses) {
      baseStats.splice(1, 0, {
        label: 'Pending Approvals',
        value: pendingApprovals.length.toString(),
        change: 'Needs review',
        trend: 'attention',
        icon: AlertCircle,
        color: 'red'
      });
    }

    return baseStats;
  };

  const stats = getStatsForRole();

  // Buildings data
  const buildings = [
    {
      id: 'BLDG-A',
      name: 'Building A (North Tower)',
      units: 60,
      floors: 15,
      occupancy: 98.3,
      avgHOA: 425,
      lastInspection: '2024-01-10',
      status: 'excellent'
    },
    {
      id: 'BLDG-B',
      name: 'Building B (South Tower)',
      units: 60,
      floors: 15,
      occupancy: 96.7,
      avgHOA: 425,
      lastInspection: '2024-01-05',
      status: 'good'
    },
    {
      id: 'BLDG-C',
      name: 'Building C (East Wing)',
      units: 60,
      floors: 12,
      occupancy: 100,
      avgHOA: 385,
      lastInspection: '2024-01-15',
      status: 'excellent'
    },
    {
      id: 'BLDG-D',
      name: 'Building D (West Wing)',
      units: 60,
      floors: 12,
      occupancy: 95,
      avgHOA: 385,
      lastInspection: '2023-12-28',
      status: 'attention'
    }
  ];

  // Maintenance work orders
  const workOrders = workRequests.filter(req => req.status === 'approved').slice(0, 3).map(req => ({
    id: req.id || 'WO-000',
    building: req.unitNumber?.includes('Building') ? req.unitNumber.split(' - ')[0] : 'Common Area',
    unit: req.unitNumber || 'N/A',
    issue: req.title || req.description,
    priority: req.priority,
    status: 'in-progress',
    vendor: 'Assigned Vendor',
    submitted: new Date(req.created_at || Date.now()).toISOString().split('T')[0],
    cost: req.estimatedCost || 0
  }));

  // Vendor contracts
  const vendors = [
    {
      name: 'Green Lawn Care',
      service: 'Landscaping',
      monthlyFee: 4500,
      contractEnd: '2024-12-31',
      rating: 4.8,
      status: 'active'
    },
    {
      name: 'CleanPro Services',
      service: 'Janitorial',
      monthlyFee: 6200,
      contractEnd: '2024-09-30',
      rating: 4.9,
      status: 'active'
    },
    {
      name: 'SecureWatch',
      service: 'Security',
      monthlyFee: 8500,
      contractEnd: '2025-03-31',
      rating: 4.7,
      status: 'active'
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'excellent': return 'bg-green-500/10 text-green-400 border-green-500/20';
      case 'good': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'attention': return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
      case 'active': return 'bg-green-500/10 text-green-400 border-green-500/20';
      case 'in-progress': return 'bg-orange-500/10 text-orange-400 border-orange-500/20';
      case 'scheduled': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'assigned': return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      case 'pending_approval': return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
      case 'approved': return 'bg-green-500/10 text-green-400 border-green-500/20';
      case 'rejected': return 'bg-red-500/10 text-red-400 border-red-500/20';
      default: return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-400';
      case 'medium': return 'text-yellow-400';
      case 'low': return 'text-green-400';
      default: return 'text-gray-400';
    }
  };

  const getRoleBadgeColor = (role: UserRole) => {
    switch (role) {
      case 'board_president': return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      case 'board_member': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'property_manager': return 'bg-orange-500/10 text-orange-400 border-orange-500/20';
      case 'resident': return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
      default: return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
    }
  };

  const getRoleDisplayName = (role: UserRole) => {
    switch (role) {
      case 'board_president': return 'Board President';
      case 'board_member': return 'Board Member';
      case 'property_manager': return 'Property Manager';
      case 'resident': return 'Resident';
      default: return 'User';
    }
  };

  // Role switcher for demo purposes
  const switchRole = (role: UserRole) => {
    setCurrentUser({ ...currentUser, role });
    localStorage.setItem('condo_user_role', role);
    toast.success(`Switched to ${getRoleDisplayName(role)} view`);
  };

  // Build tabs based on role permissions
  const getTabsForRole = () => {
    const baseTabs = [
      { id: 'dashboard', label: 'Dashboard', icon: Home, visible: true },
      { id: 'maintenance', label: 'Maintenance', icon: Wrench, visible: true },
    ];

    if (canApproveExpenses) {
      baseTabs.push({ id: 'approvals', label: 'Approvals', icon: CheckCircle, visible: true });
    }

    if (canViewFinancials) {
      baseTabs.push({ id: 'financials', label: 'Financials', icon: DollarSign, visible: true });
    }

    if (canManageVendors) {
      baseTabs.push({ id: 'vendors', label: 'Vendors', icon: Users, visible: true });
    }

    baseTabs.push(
      { id: 'units', label: 'Units & Buildings', icon: Building2, visible: canViewFinancials },
      { id: 'documents', label: 'Documents', icon: FileText, visible: true },
      { id: 'team', label: 'Team', icon: UserCheck, visible: canApproveExpenses },
      { id: 'deals', label: 'Deals & Reels', icon: Megaphone },
      { id: 'revenue-ai', label: '💡 Revenue AI', icon: TrendingUp, visible: canViewFinancials },
      { id: 'referrals', label: 'Referral Rewards', icon: Award, visible: true }
    );

    return baseTabs.filter(tab => tab.visible);
  };

  const tabs = getTabsForRole();

  return (
    <LayoutManager pageName="Condo Association Portal" enableCustomization={true} showEditButton={true}>
      <div className="w-full min-h-screen bg-[#0A0A0A]">
        <SponsoredMarquee />
        {/* Header */}
      <div className="bg-[#1A1A1A] border-b border-[#2A2A2A] sticky top-16 z-30">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-600 to-orange-700 flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-white" />
                </div>
                Condo Association Portal
              </h1>
              <div className="flex items-center gap-3 mt-1">
                <p className="text-gray-400">{associationInfo.name}</p>
                <span className={`px-3 py-1 rounded-lg text-xs font-semibold border ${getRoleBadgeColor(currentUser.role)}`}>
                  {getRoleDisplayName(currentUser.role)}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {/* Role Switcher (Demo only) */}
              <div className="relative group">
                <button className="p-2 rounded-lg bg-[#0A0A0A] border border-[#2A2A2A] text-gray-400 hover:text-white hover:border-orange-500/30 transition flex items-center gap-2">
                  <Key className="w-5 h-5" />
                  <span className="text-sm">Switch Role</span>
                </button>
                <div className="absolute right-0 top-full mt-2 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all min-w-[200px]">
                  <button onClick={() => switchRole('board_president')} className="w-full px-4 py-2 text-left text-white hover:bg-[#2A2A2A] transition flex items-center justify-between">
                    Board President
                    {currentUser.role === 'board_president' && <Check className="w-4 h-4 text-green-400" />}
                  </button>
                  <button onClick={() => switchRole('board_member')} className="w-full px-4 py-2 text-left text-white hover:bg-[#2A2A2A] transition flex items-center justify-between">
                    Board Member
                    {currentUser.role === 'board_member' && <Check className="w-4 h-4 text-green-400" />}
                  </button>
                  <button onClick={() => switchRole('property_manager')} className="w-full px-4 py-2 text-left text-white hover:bg-[#2A2A2A] transition flex items-center justify-between">
                    Property Manager
                    {currentUser.role === 'property_manager' && <Check className="w-4 h-4 text-green-400" />}
                  </button>
                  <button onClick={() => switchRole('resident')} className="w-full px-4 py-2 text-left text-white hover:bg-[#2A2A2A] transition flex items-center justify-between rounded-b-lg">
                    Resident
                    {currentUser.role === 'resident' && <Check className="w-4 h-4 text-green-400" />}
                  </button>
                </div>
              </div>

              <button className="p-2 rounded-lg bg-[#0A0A0A] border border-[#2A2A2A] text-gray-400 hover:text-white hover:border-orange-500/30 transition relative">
                <Bell className="w-5 h-5" />
                {pendingApprovals.length > 0 && canApproveExpenses && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-xs text-white font-bold">
                    {pendingApprovals.length}
                  </span>
                )}
              </button>
              <button className="p-2 rounded-lg bg-[#0A0A0A] border border-[#2A2A2A] text-gray-400 hover:text-white hover:border-orange-500/30 transition">
                <Settings className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 overflow-x-auto pb-2">
            {tabs.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg whitespace-nowrap transition relative ${
                    activeTab === tab.id
                      ? 'bg-orange-600 text-white'
                      : 'bg-[#0A0A0A] text-gray-400 hover:text-white border border-[#2A2A2A] hover:border-orange-500/30'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                  {tab.id === 'approvals' && pendingApprovals.length > 0 && (
                    <span className="ml-1 px-2 py-0.5 bg-red-500 rounded-full text-xs text-white font-bold">
                      {pendingApprovals.length}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Logo Marquee */}
      <LogoMarquee />

      {/* Advertising Text Banner */}
      <AdvertisingMarquee placement="portal-header" dismissible />

      {/* Advertising Video Reel - Floating Widget */}
      <AdvertisingVideoReel placement="condo-portal" maxVideos={5} autoPlay={false} />

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        {activeTab === 'dashboard' && (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {stats.map((stat, i) => {
                const Icon = stat.icon;
                return (
                  <div key={i} className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-6 hover:border-orange-500/30 transition">
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-10 h-10 rounded-lg bg-orange-600/10 border border-orange-500/20 flex items-center justify-center">
                        <Icon className="w-5 h-5 text-orange-400" />
                      </div>
                      <div className={`text-sm ${
                        stat.trend === 'up' ? 'text-green-400' : stat.trend === 'attention' ? 'text-yellow-400' : 'text-gray-400'
                      }`}>
                        {stat.change}
                      </div>
                    </div>
                    <p className="text-2xl font-bold text-white mb-1">{stat.value}</p>
                    <p className="text-sm text-gray-400">{stat.label}</p>
                  </div>
                );
              })}
            </div>

            {/* Role-specific alerts */}
            {currentUser.role === 'resident' && (
              <div className="bg-blue-600/10 border border-blue-500/30 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-blue-300 font-semibold mb-1">Resident Portal</h3>
                    <p className="text-sm text-blue-200">
                      You can submit maintenance requests and view your unit information. All requests require approval from the property manager or board.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {currentUser.role === 'property_manager' && pendingApprovals.length > 0 && (
              <div className="bg-orange-600/10 border border-orange-500/30 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-orange-300 font-semibold mb-1">Property Manager Notice</h3>
                    <p className="text-sm text-orange-200">
                      You have {pendingApprovals.length} work request{pendingApprovals.length !== 1 ? 's' : ''} waiting for board approval.
                      <button
                        onClick={() => setActiveTab('approvals')}
                        className="ml-2 text-orange-300 underline hover:text-orange-200"
                      >
                        Review now
                      </button>
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Budget Allocation - Hidden for residents */}
              {canViewFinancials && (
                <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-6">
                  <h2 className="text-lg font-bold text-white mb-6">Monthly Budget Allocation</h2>
                  <ChartContainer height={256} minHeight={256} dependencies={[activeTab]}>
                    <PieChart width={800} height={256}>
                      <Pie
                        data={budgetData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {budgetData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ backgroundColor: '#1A1A1A', border: '1px solid #2A2A2A', borderRadius: '8px' }}
                        labelStyle={{ color: '#fff' }}
                      />
                    </PieChart>
                  </ChartContainer>
                  <div className="grid grid-cols-2 gap-3 mt-4">
                    {budgetData.map((item, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                        <div>
                          <p className="text-xs text-gray-400">{item.name}</p>
                          <p className="text-sm font-semibold text-white">${item.value.toLocaleString()}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Buildings Status */}
              <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-bold text-white">Buildings Status</h2>
                  {canViewFinancials && (
                    <button
                      onClick={() => setActiveTab('units')}
                      className="text-orange-400 hover:text-orange-300 text-sm font-semibold flex items-center gap-1"
                    >
                      View All
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <div className="space-y-3">
                  {buildings.slice(0, 2).map(building => (
                    <div key={building.id} className="bg-[#0A0A0A] rounded-lg border border-[#2A2A2A] p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="font-semibold text-white mb-1">{building.name}</h3>
                          <p className="text-sm text-gray-400">{building.units} units • {building.floors} floors</p>
                        </div>
                        <span className={`px-3 py-1 rounded-lg text-xs font-semibold border ${getStatusColor(building.status)}`}>
                          {building.status.toUpperCase()}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-gray-500">Occupancy</p>
                          <p className="text-white font-semibold">{building.occupancy}%</p>
                        </div>
                        {canViewFinancials && (
                          <div>
                            <p className="text-gray-500">Avg HOA Fee</p>
                            <p className="text-white font-semibold">${building.avgHOA}/mo</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Work Orders */}
            {workOrders.length > 0 && (
              <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-bold text-white">Active Work Orders</h2>
                  <button
                    onClick={() => setActiveTab('maintenance')}
                    className="text-orange-400 hover:text-orange-300 text-sm font-semibold flex items-center gap-1"
                  >
                    View All
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
                <div className="space-y-3">
                  {workOrders.map(order => (
                    <div key={order.id} className="bg-[#0A0A0A] rounded-lg border border-[#2A2A2A] p-4 hover:border-orange-500/30 transition">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-white">{order.id}</h3>
                            <span className={`text-xs font-semibold ${getPriorityColor(order.priority)}`}>
                              {order.priority.toUpperCase()}
                            </span>
                          </div>
                          <p className="text-sm text-gray-400 mb-2">{order.building} - {order.unit}</p>
                          <p className="text-sm text-white">{order.issue}</p>
                        </div>
                        <span className={`px-3 py-1 rounded-lg text-xs font-semibold border ${getStatusColor(order.status)}`}>
                          {order.status.replace('-', ' ').toUpperCase()}
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-sm pt-3 border-t border-[#2A2A2A]">
                        <div>
                          <p className="text-gray-500">Vendor</p>
                          <p className="text-white font-semibold">{order.vendor}</p>
                        </div>
                        {canViewFinancials && (
                          <div>
                            <p className="text-gray-500">Est. Cost</p>
                            <p className="text-white font-semibold">${order.cost.toLocaleString()}</p>
                          </div>
                        )}
                        <div>
                          <p className="text-gray-500">Submitted</p>
                          <p className="text-white font-semibold">{order.submitted}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Active Vendors - Hidden for residents */}
            {canViewFinancials && (
              <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-bold text-white">Active Vendor Contracts</h2>
                  <button
                    onClick={() => setActiveTab('vendors')}
                    className="text-orange-400 hover:text-orange-300 text-sm font-semibold flex items-center gap-1"
                  >
                    View All
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {vendors.map((vendor, i) => (
                    <div key={i} className="bg-[#0A0A0A] rounded-lg border border-[#2A2A2A] p-4 hover:border-orange-500/30 transition">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="font-semibold text-white mb-1">{vendor.name}</h3>
                          <p className="text-sm text-gray-400">{vendor.service}</p>
                        </div>
                        <span className={`px-2 py-1 rounded text-xs font-semibold border ${getStatusColor(vendor.status)}`}>
                          ACTIVE
                        </span>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-400">Monthly Fee</span>
                          <span className="text-white font-semibold">${vendor.monthlyFee.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-400">Contract Ends</span>
                          <span className="text-white font-semibold">{vendor.contractEnd}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-400">Rating</span>
                          <span className="text-yellow-400 font-semibold">★ {vendor.rating}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {activeTab === 'approvals' && canApproveExpenses && (
          <div className="space-y-6">
            <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-6">
              <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-orange-400" />
                Pending Approvals ({pendingApprovals.length})
              </h2>

              {pendingApprovals.length === 0 ? (
                <div className="text-center py-12">
                  <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-4" />
                  <p className="text-gray-400">No pending approvals at this time</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {pendingApprovals.map(request => (
                    <div key={request.id} className="bg-[#0A0A0A] rounded-lg border border-[#2A2A2A] p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-semibold text-white">{request.title}</h3>
                            <span className={`px-3 py-1 rounded-lg text-xs font-semibold border ${getStatusColor(request.status)}`}>
                              PENDING APPROVAL
                            </span>
                            <span className={`text-sm font-semibold ${getPriorityColor(request.priority)}`}>
                              {request.priority.toUpperCase()} PRIORITY
                            </span>
                          </div>
                          <p className="text-sm text-gray-400 mb-3">{request.unitNumber}</p>
                          <p className="text-white mb-3">{request.description}</p>

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
                              <p className="text-gray-500">Estimated Cost</p>
                              <p className="text-white font-semibold">${request.estimatedCost?.toLocaleString() || 'TBD'}</p>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-3 pt-4 border-t border-[#2A2A2A]">
                        <button
                          onClick={() => handleApproval(request.id, true)}
                          className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg font-semibold transition flex items-center justify-center gap-2"
                        >
                          <Check className="w-5 h-5" />
                          Approve
                        </button>
                        <button
                          onClick={() => handleApproval(request.id, false)}
                          className="flex-1 px-4 py-2 bg-red-600/10 hover:bg-red-600/20 border border-red-500/30 text-red-400 rounded-lg font-semibold transition flex items-center justify-center gap-2"
                        >
                          <X className="w-5 h-5" />
                          Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'units' && (
          <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-6">
            <h2 className="text-lg font-bold text-white mb-4">Units & Buildings Management</h2>
            <p className="text-gray-400">Detailed unit and building management would be displayed here.</p>
          </div>
        )}

        {activeTab === 'maintenance' && (
          <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-6">
            <h2 className="text-lg font-bold text-white mb-4">Maintenance Management</h2>
            <p className="text-gray-400">
              {currentUser.role === 'resident'
                ? 'View your submitted work requests and their status here.'
                : 'Full maintenance and work order system would be displayed here.'}
            </p>
          </div>
        )}

        {activeTab === 'financials' && canViewFinancials && (
          <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-6">
            <h2 className="text-lg font-bold text-white mb-4">Financial Management</h2>
            <p className="text-gray-400">Budget tracking, HOA fees, and financial reports would be displayed here.</p>
          </div>
        )}

        {activeTab === 'vendors' && canManageVendors && (
          <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-6">
            <h2 className="text-lg font-bold text-white mb-4">Vendor Management</h2>
            <p className="text-gray-400">Complete vendor contract and performance tracking would be displayed here.</p>
          </div>
        )}

        {activeTab === 'documents' && (
          <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-6">
            <h2 className="text-lg font-bold text-white mb-4">Documents & Records</h2>
            <p className="text-gray-400">Association documents, bylaws, and records would be displayed here.</p>
          </div>
        )}

        {activeTab === 'team' && canApproveExpenses && (
          <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-6">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-orange-400" />
              Team Management
            </h2>
            <p className="text-gray-400 mb-6">Manage board members, property manager, and resident access.</p>

            <div className="space-y-4">
              <div className="bg-[#0A0A0A] rounded-lg border border-[#2A2A2A] p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-white font-semibold">Robert Martinez</h3>
                    <p className="text-sm text-gray-400">robert@harborview.com</p>
                  </div>
                  <span className={`px-3 py-1 rounded-lg text-xs font-semibold border ${getRoleBadgeColor('board_president')}`}>
                    Board President
                  </span>
                </div>
              </div>

              <div className="bg-[#0A0A0A] rounded-lg border border-[#2A2A2A] p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-white font-semibold">Lisa Anderson</h3>
                    <p className="text-sm text-gray-400">lisa@propertymanagement.com</p>
                  </div>
                  <span className={`px-3 py-1 rounded-lg text-xs font-semibold border ${getRoleBadgeColor('property_manager')}`}>
                    Property Manager
                  </span>
                </div>
              </div>

              <button className="w-full py-3 border-2 border-dashed border-[#2A2A2A] rounded-lg text-gray-400 hover:text-white hover:border-orange-500/30 transition font-semibold">
                + Invite Team Member
              </button>
            </div>
          </div>
        )}

        
        {activeTab === 'deals' && (
          <>
          <FeaturedDealsReels portalType="condo_manager" />
          <DealsOffersSection portalType="advertiser" storageKey="condo_assoc_deals" />
          </>
        )}

        {activeTab === 'revenue-ai' && (
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)' }}>
                  <TrendingUp className="w-5 h-5 text-yellow-400" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Condo Revenue Intelligence</h2>
                  <p className="text-xs text-gray-500">AI opportunities to offset condo fees and strengthen reserves</p>
                </div>
              </div>
              <button
                onClick={() => { const ctx = (window as any).__navigateApp; if (ctx) ctx('property-revenue'); else window.location.hash = '#property-revenue'; }}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white hover:brightness-110 transition"
                style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>
                Full Analysis <ArrowUpRight className="w-4 h-4" />
              </button>
            </div>

            {/* RSA 356-B note */}
            <div className="rounded-xl p-4 flex items-start gap-3" style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)' }}>
              <span className="text-xl flex-shrink-0">🏔</span>
              <div>
                <p className="text-xs font-black text-indigo-400">New Hampshire — RSA 356-B (Condominium Act)</p>
                <p className="text-xs text-gray-400 mt-0.5">Common-area revenue programs require board approval and must comply with your Declaration. These opportunities are legal in NH when properly authorized — they do not require a unit owner vote unless your bylaws specify otherwise. Always verify with your association attorney.</p>
              </div>
            </div>

            {/* Fee reduction calculator */}
            <div className="rounded-xl p-5" style={{ background: '#1A1A1A', border: '1px solid #2A2A2A' }}>
              <p className="text-sm font-bold text-white mb-3">Condo Fee Impact Estimator</p>
              <p className="text-xs text-gray-400 mb-4">How new income reduces pressure on monthly assessments</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { source: 'Storage lockers (10 units)', annual: 7200 },
                  { source: 'Clubhouse rentals (8/mo)', annual: 4800 },
                  { source: 'Vendor sponsorships (3)', annual: 5400 },
                ].map((s, i) => {
                  const units = condoData?.totalUnits || 24;
                  const perUnitMonthly = (s.annual / units / 12).toFixed(2);
                  return (
                    <div key={i} className="rounded-lg p-3 text-center" style={{ background: '#0A0A0A' }}>
                      <p className="text-sm font-black text-green-400">-${perUnitMonthly}/mo</p>
                      <p className="text-[9px] text-gray-500 mt-0.5">per unit assessment</p>
                      <p className="text-[10px] text-gray-600 mt-1">{s.source}</p>
                    </div>
                  );
                })}
              </div>
              <p className="text-xs text-green-400 font-black mt-3 text-center">Combined: potential to reduce monthly fees by $14–28/unit</p>
              <p className="text-[10px] text-gray-600 text-center mt-1">Estimates based on {condoData?.totalUnits || 24} units. Open Full Analysis for your actual numbers.</p>
            </div>

            {/* Opportunity cards */}
            <div>
              <p className="text-sm font-bold text-white mb-3">Top Opportunities for Your Association</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { icon: Package, color: '#fbbf24', name: 'Storage Locker Rentals', rev: '$420–$900/yr per locker', diff: 'Easy', boardRequired: true, nhNote: 'Board vote required. Check Declaration for restrictions.' },
                  { icon: Users, color: '#60a5fa', name: 'Clubhouse / Meeting Room Rentals', rev: '$1,200–$7,200/yr', diff: 'Easy', boardRequired: true, nhNote: 'Popular NH association income source. Board approval needed.' },
                  { icon: Star, color: '#fbbf24', name: 'Vendor Sponsorship Program', rev: '$1,800–$10,800/yr', diff: 'Easy', boardRequired: true, nhNote: 'No RSA 356-B restrictions on sponsorship income when board-approved.' },
                  { icon: Car, color: '#34d399', name: 'Parking Space Rentals', rev: '$480–$1,440/yr per space', diff: 'Easy', boardRequired: true, nhNote: 'Verify Declaration does not grant free parking rights to all unit owners.' },
                  { icon: Zap, color: '#a78bfa', name: 'EV Charging Stations', rev: '$1,920–$9,600/yr', diff: 'Medium', boardRequired: true, nhNote: 'Eversource NH rebates available. NH does not prohibit condo EV programs.' },
                  { icon: Megaphone, color: '#f87171', name: 'Resident Maintenance Plans', rev: '$8–$25/unit/mo', diff: 'Easy', boardRequired: false, nhNote: 'Black Phoenix service integration. Optional resident enrollment.' },
                ].map((o, i) => (
                  <div key={i} className="rounded-xl p-4" style={{ background: '#1A1A1A', border: '1px solid #2A2A2A' }}>
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: o.color + '18' }}>
                        <o.icon className="w-4 h-4" style={{ color: o.color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-white">{o.name}</p>
                        <p className="text-xs font-black mt-0.5" style={{ color: '#4ade80' }}>{o.rev}</p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(74,222,128,0.1)', color: '#4ade80' }}>{o.diff}</span>
                          {o.boardRequired && <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(99,102,241,0.15)', color: '#818cf8' }}>Board Vote</span>}
                        </div>
                        <p className="text-[10px] text-indigo-400 mt-1.5">🏔 {o.nhNote}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Reserve fund teaser */}
            <div className="rounded-xl p-5" style={{ background: 'rgba(74,222,128,0.06)', border: '1px solid rgba(74,222,128,0.2)' }}>
              <p className="text-sm font-bold text-green-400 mb-2">Reserve Fund Impact</p>
              <p className="text-xs text-gray-400">If your association implements 3 revenue programs generating $15,000/year, contributing 50% to reserves adds $7,500/year without any assessment increase. Over 10 years, that is $75,000 in additional reserve strength.</p>
              <p className="text-[10px] text-gray-600 mt-2">Consult your reserve study professional and association attorney before committing revenue to reserves. NH RSA 356-B:45 governs reserve fund requirements.</p>
            </div>

            <button
              onClick={() => { const ctx = (window as any).__navigateApp; if (ctx) ctx('property-revenue'); else window.location.hash = '#property-revenue'; }}
              className="w-full py-4 rounded-xl font-black text-sm text-white hover:brightness-110 transition flex items-center justify-center gap-2"
              style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>
              <TrendingUp className="w-4 h-4" /> Open Full AI Revenue Analysis →
            </button>
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
