import { useState, useEffect } from 'react';
import {
  Building2, Users, DollarSign, Clipboard, Calendar, FileText,
  Wrench, AlertCircle, TrendingUp, Home, MessageSquare, Settings,
  Bell, ChevronRight, CheckCircle, Shield, Tool, Package, Vote, Award
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import LayoutManager from '../layout-editor/LayoutManager';
import { ChartContainer } from '../ChartContainer';
import LogoMarquee from '../LogoMarquee';
import AdvertisingMarquee from '../AdvertisingMarquee';
import ReferralRewards from '../ReferralRewards';
import { CondoService } from '../../lib/services/propertyManagementService';

export default function CondoAssociationPortalView() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'units' | 'maintenance' | 'financials' | 'vendors' | 'documents' | 'referrals'>('dashboard');
  const [loading, setLoading] = useState(true);
  const [condoData, setCondoData] = useState<any>(null);
  const [workRequests, setWorkRequests] = useState<any[]>([]);
  const [units, setUnits] = useState<any[]>([]);

  // Get condo ID from localStorage or URL params
  const condoId = localStorage.getItem('current_condo_id') || 'demo-condo';

  useEffect(() => {
    loadCondoData();
  }, [condoId]);

  const loadCondoData = async () => {
    setLoading(true);
    try {
      // Try to load existing condo, or create demo condo
      let condoResponse = await CondoService.getById(condoId);
      
      if (!condoResponse.success || !condoResponse.data) {
        // Create demo condo if it doesn't exist
        const demoCondoResponse = await CondoService.create({
          name: 'Harborview Condo Association',
          address: '1250 Waterfront Drive, Miami, FL 33139',
          totalUnits: 240,
          buildings: 4,
          president: 'Robert Martinez',
          manager: 'Lisa Anderson',
          phone: '(305) 555-7890',
          email: 'info@harborviewcondo.com'
        });
        
        if (demoCondoResponse.success) {
          setCondoData(demoCondoResponse.data);
          localStorage.setItem('current_condo_id', demoCondoResponse.data.id);
          
          // Create demo units
          await createDemoUnits(demoCondoResponse.data.id);
          // Create demo work requests
          await createDemoWorkRequests(demoCondoResponse.data.id);
        }
      } else {
        setCondoData(condoResponse.data);
      }

      // Load work requests
      const workRequestsResponse = await CondoService.getWorkRequests(condoId);
      if (workRequestsResponse.success) {
        setWorkRequests(workRequestsResponse.data);
      }

      // Load units
      const unitsResponse = await CondoService.getUnits(condoId);
      if (unitsResponse.success) {
        setUnits(unitsResponse.data);
      }
    } catch (error) {
      console.error('Error loading condo data:', error);
      toast.error('Failed to load condo data');
    } finally {
      setLoading(false);
    }
  };

  const createDemoUnits = async (condoId: string) => {
    const buildings = ['A', 'B', 'C', 'D'];
    for (const building of buildings) {
      for (let floor = 1; floor <= 15; floor++) {
        for (let unit = 1; unit <= 4; unit++) {
          await CondoService.createUnit(condoId, {
            unitNumber: `${building}${floor}${unit.toString().padStart(2, '0')}`,
            building: `Building ${building}`,
            floor,
            squareFeet: 1200 + Math.floor(Math.random() * 800),
            bedrooms: 2 + Math.floor(Math.random() * 2),
            bathrooms: 2,
            ownerName: `Owner ${building}${floor}${unit}`,
            monthlyHOA: 385 + Math.floor(Math.random() * 100),
            occupancyStatus: Math.random() > 0.05 ? 'occupied' : 'vacant'
          });
        }
      }
    }
  };

  const createDemoWorkRequests = async (condoId: string) => {
    const demoRequests = [
      {
        title: 'Pool heater malfunction',
        description: 'Main pool heater not maintaining temperature',
        category: 'HVAC',
        priority: 'high',
        unitNumber: 'Common Area - Pool',
        propertyName: 'Harborview Condo Association',
        residentName: 'Property Manager',
        status: 'pending_approval'
      },
      {
        title: 'Annual elevator inspection',
        description: 'Required annual safety inspection for Elevator 2',
        category: 'Elevator',
        priority: 'medium',
        unitNumber: 'Elevator 2',
        propertyName: 'Harborview Condo Association',
        residentName: 'Property Manager',
        status: 'pending_approval'
      },
      {
        title: 'Parking gate repair',
        description: 'Main entrance gate stuck in open position',
        category: 'Security',
        priority: 'high',
        unitNumber: 'Parking Garage',
        propertyName: 'Harborview Condo Association',
        residentName: 'Security Team',
        status: 'pending_approval'
      }
    ];

    for (const request of demoRequests) {
      await CondoService.createWorkRequest(condoId, request);
    }
  };

  const submitWorkRequest = async (requestData: any) => {
    try {
      const response = await CondoService.createWorkRequest(condoId, {
        ...requestData,
        propertyName: condoData?.name || 'Harborview Condo Association',
        status: 'pending_approval'
      });
      
      if (response.success) {
        toast.success('Work request submitted for property manager approval');
        loadCondoData(); // Reload data
      } else {
        toast.error('Failed to submit work request');
      }
    } catch (error) {
      console.error('Error submitting work request:', error);
      toast.error('Failed to submit work request');
    }
  };

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

  // Stats
  const stats = [
    { label: 'Total Units', value: '240', change: '4 buildings', trend: 'neutral', icon: Building2, color: 'orange' },
    { label: 'Monthly HOA Fees', value: '$96K', change: '+2.1%', trend: 'up', icon: DollarSign, color: 'green' },
    { label: 'Active Work Orders', value: '12', change: '3 urgent', trend: 'attention', icon: Wrench, color: 'yellow' },
    { label: 'Reserve Balance', value: '$340K', change: '+$15K', trend: 'up', icon: Shield, color: 'blue' }
  ];

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
  const workOrders = [
    {
      id: 'WO-458',
      building: 'Building A',
      unit: 'Common Area - Pool',
      issue: 'Pool heater malfunction',
      priority: 'high',
      status: 'in-progress',
      vendor: 'Aqua Pool Services',
      submitted: '2024-01-23',
      cost: 2400
    },
    {
      id: 'WO-459',
      building: 'Building C',
      unit: 'Elevator 2',
      issue: 'Annual elevator inspection',
      priority: 'medium',
      status: 'scheduled',
      vendor: 'Elite Elevator Co.',
      submitted: '2024-01-22',
      cost: 1800
    },
    {
      id: 'WO-460',
      building: 'Building D',
      unit: 'Parking Garage',
      issue: 'Gate repair needed',
      priority: 'high',
      status: 'assigned',
      vendor: 'SecureGate Systems',
      submitted: '2024-01-24',
      cost: 1200
    }
  ];

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

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: Home },
    { id: 'units', label: 'Units & Buildings', icon: Building2 },
    { id: 'maintenance', label: 'Maintenance', icon: Wrench },
    { id: 'financials', label: 'Financials', icon: DollarSign },
    { id: 'vendors', label: 'Vendors', icon: Users },
    { id: 'documents', label: 'Documents', icon: FileText },
    { id: 'referrals', label: 'Referral Rewards', icon: Award }
  ];

  return (
    <LayoutManager pageName="Condo Association Portal" enableCustomization={true} showEditButton={true}>
      <div className="min-h-screen bg-[#0A0A0A]">
        {/* Header */}
      <div className="bg-[#1A1A1A] border-b border-[#2A2A2A] sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-600 to-orange-700 flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-white" />
                </div>
                Condo Association Portal
              </h1>
              <p className="text-gray-400 mt-1">{associationInfo.name}</p>
            </div>
            <div className="flex items-center gap-3">
              <button className="p-2 rounded-lg bg-[#0A0A0A] border border-[#2A2A2A] text-gray-400 hover:text-white hover:border-orange-500/30 transition">
                <Bell className="w-5 h-5" />
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
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg whitespace-nowrap transition ${
                    activeTab === tab.id
                      ? 'bg-orange-600 text-white'
                      : 'bg-[#0A0A0A] text-gray-400 hover:text-white border border-[#2A2A2A] hover:border-orange-500/30'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
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

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Budget Allocation */}
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

              {/* Buildings Status */}
              <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-bold text-white">Buildings Status</h2>
                  <button
                    onClick={() => setActiveTab('units')}
                    className="text-orange-400 hover:text-orange-300 text-sm font-semibold flex items-center gap-1"
                  >
                    View All
                    <ChevronRight className="w-4 h-4" />
                  </button>
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
                        <div>
                          <p className="text-gray-500">Avg HOA Fee</p>
                          <p className="text-white font-semibold">${building.avgHOA}/mo</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Work Orders */}
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
                      <div>
                        <p className="text-gray-500">Est. Cost</p>
                        <p className="text-white font-semibold">${order.cost.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Submitted</p>
                        <p className="text-white font-semibold">{order.submitted}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Active Vendors */}
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
          </>
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
            <p className="text-gray-400">Full maintenance and work order system would be displayed here.</p>
          </div>
        )}

        {activeTab === 'financials' && (
          <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-6">
            <h2 className="text-lg font-bold text-white mb-4">Financial Management</h2>
            <p className="text-gray-400">Budget tracking, HOA fees, and financial reports would be displayed here.</p>
          </div>
        )}

        {activeTab === 'vendors' && (
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

        {activeTab === 'referrals' && (
          <ReferralRewards />
        )}
      </div>
    </div>
    </LayoutManager>
  );
}