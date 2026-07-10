import { useState, useEffect } from 'react';
import {
  ArrowLeft, Building, Users, Wrench, DollarSign, Calendar, FileText,
  TrendingUp, AlertCircle, CheckCircle, Clock, Settings, Bell, Home,
  Package, Shield, Target, BarChart3, Activity, MessageSquare, Phone,
  Mail, MapPin, Edit, Plus, Search, Filter, Download, Upload, Eye,
  ClipboardList, Zap, Tag, Star
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { PropertyManagerService } from '../lib/services/propertyManagementService';

interface PropertyManagerPortalProps {
  associationInfo: {
    name: string;
    propertyManager: string;
    totalUnits: number;
    phone: string;
    email: string;
    website: string;
  };
  onClose: () => void;
}

export default function PropertyManagerPortal({ associationInfo, onClose }: PropertyManagerPortalProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'units' | 'maintenance' | 'financials' | 'communications' | 'reports'>('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [managerData, setManagerData] = useState<any>(null);
  const [workRequests, setWorkRequests] = useState<any[]>([]);
  const [pendingApprovals, setPendingApprovals] = useState<any[]>([]);

  // Get property manager ID from localStorage or URL params
  const managerId = localStorage.getItem('current_property_manager_id') || 'demo-property-manager';

  useEffect(() => {
    loadPropertyManagerData();
  }, [managerId]);

  const loadPropertyManagerData = async () => {
    setLoading(true);
    try {
      // Try to load existing property manager, or create demo manager
      let managerResponse = await PropertyManagerService.getById(managerId);
      
      if (!managerResponse.success || !managerResponse.data) {
        // Create demo property manager if it doesn't exist
        const demoManagerResponse = await PropertyManagerService.create({
          name: associationInfo.propertyManager || 'Lisa Anderson',
          email: associationInfo.email || 'lisa@pmservices.com',
          phone: associationInfo.phone || '(305) 555-7890',
          company: 'PM Services LLC',
          associationName: associationInfo.name,
          totalUnits: associationInfo.totalUnits,
          activeRequests: 12,
          completedThisMonth: 48,
          monthlyRevenue: 285000,
          monthlyExpenses: 142000,
          occupancyRate: 94.2,
          avgResponseTime: 3.2,
          residentSatisfaction: 4.6
        });
        
        if (demoManagerResponse.success) {
          setManagerData(demoManagerResponse.data);
          localStorage.setItem('current_property_manager_id', demoManagerResponse.data.id);
          
          // Create demo work requests
          await createDemoWorkRequests(demoManagerResponse.data.id);
        }
      } else {
        setManagerData(managerResponse.data);
      }

      // Load all work requests
      const workRequestsResponse = await PropertyManagerService.getWorkRequests(managerId);
      if (workRequestsResponse.success) {
        setWorkRequests(workRequestsResponse.data);
        
        // Filter pending approvals
        const pending = workRequestsResponse.data.filter((req: any) => req.status === 'pending_approval');
        setPendingApprovals(pending);
      }
    } catch (error) {
      console.error('Error loading property manager data:', error);
      toast.error('Failed to load property manager data');
    } finally {
      setLoading(false);
    }
  };

  const createDemoWorkRequests = async (managerId: string) => {
    const demoRequests = [
      {
        title: 'Pool pump replacement',
        description: 'Main pool pump motor failed, needs replacement',
        category: 'Pool/Spa',
        priority: 'high',
        unitNumber: 'Common Area',
        propertyName: associationInfo.name,
        residentName: 'Maintenance Team',
        estimatedCost: 3500,
        status: 'pending_approval'
      },
      {
        title: 'Gym equipment service',
        description: 'Annual maintenance service for fitness equipment',
        category: 'Amenities',
        priority: 'medium',
        unitNumber: 'Fitness Center',
        propertyName: associationInfo.name,
        residentName: 'Amenities Manager',
        estimatedCost: 1200,
        status: 'pending_approval'
      }
    ];

    for (const request of demoRequests) {
      await PropertyManagerService.createWorkRequest(managerId, request);
    }
  };

  const approveWorkRequest = async (requestId: string) => {
    try {
      const response = await PropertyManagerService.updateWorkRequest(managerId, requestId, {
        status: 'approved',
        approved_by: managerData?.name || 'Property Manager'
      });
      
      if (response.success) {
        toast.success('Work request approved! Contractor will be notified.');
        loadPropertyManagerData(); // Reload data
      } else {
        toast.error('Failed to approve work request');
      }
    } catch (error) {
      console.error('Error approving work request:', error);
      toast.error('Failed to approve work request');
    }
  };

  const denyWorkRequest = async (requestId: string) => {
    try {
      const response = await PropertyManagerService.updateWorkRequest(managerId, requestId, {
        status: 'denied',
        approved_by: managerData?.name || 'Property Manager'
      });
      
      if (response.success) {
        toast.success('Work request denied');
        loadPropertyManagerData(); // Reload data
      } else {
        toast.error('Failed to deny work request');
      }
    } catch (error) {
      console.error('Error denying work request:', error);
      toast.error('Failed to deny work request');
    }
  };

  // Property Manager specific data - use loaded data or defaults
  const managerStats = managerData || {
    totalUnits: associationInfo.totalUnits,
    activeRequests: 12,
    completedThisMonth: 48,
    monthlyRevenue: 285000,
    monthlyExpenses: 142000,
    occupancyRate: 94.2,
    avgResponseTime: 3.2,
    residentSatisfaction: 4.6,
    pendingApprovals: pendingApprovals.length || 5,
    scheduledMaintenance: 8,
    budgetUtilization: 67,
    outstandingInvoices: 15000
  };

  const recentActivity = [
    {
      id: 1,
      type: 'maintenance',
      title: 'HVAC Repair - Unit 305',
      description: 'Emergency repair completed',
      status: 'completed',
      date: '2 hours ago',
      icon: Wrench,
      color: 'green'
    },
    {
      id: 2,
      type: 'financial',
      title: 'Monthly HOA Fees Collected',
      description: '$285,000 collected for March',
      status: 'completed',
      date: '5 hours ago',
      icon: DollarSign,
      color: 'blue'
    },
    {
      id: 3,
      type: 'communication',
      title: 'Board Meeting Scheduled',
      description: 'Next meeting on March 20th',
      status: 'scheduled',
      date: '1 day ago',
      icon: Calendar,
      color: 'purple'
    },
    {
      id: 4,
      type: 'alert',
      title: 'Pool Inspection Due',
      description: 'Annual inspection required',
      status: 'pending',
      date: '2 days ago',
      icon: AlertCircle,
      color: 'orange'
    }
  ];

  const upcomingMaintenance = [
    {
      id: 1,
      task: 'Elevator Annual Inspection',
      unit: 'Building A',
      date: 'March 18, 2024',
      priority: 'high',
      vendor: 'Otis Elevator'
    },
    {
      id: 2,
      task: 'Pool Chemical Balance Check',
      unit: 'Amenities',
      date: 'March 20, 2024',
      priority: 'medium',
      vendor: 'Pool Services Inc'
    },
    {
      id: 3,
      task: 'Fire Alarm System Test',
      unit: 'All Buildings',
      date: 'March 22, 2024',
      priority: 'high',
      vendor: 'Safety First Inc'
    }
  ];

  const financialOverview = [
    { category: 'HOA Fees', amount: 285000, percentage: 92, trend: 'up' },
    { category: 'Parking Revenue', amount: 12000, percentage: 4, trend: 'stable' },
    { category: 'Amenity Fees', amount: 8500, percentage: 3, trend: 'up' },
    { category: 'Other Income', amount: 3200, percentage: 1, trend: 'down' }
  ];

  return (
    <div className="w-full min-h-screen bg-[#0A0A0A] text-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-purple-700 p-8 shadow-2xl">
        <div className="max-w-[1800px] mx-auto">
          <button
            onClick={onClose}
            className="flex items-center gap-2 text-white/90 hover:text-white mb-6 transition group"
          >
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            Back to Association
          </button>

          <div className="flex items-center gap-6">
            <div className="w-20 h-20 rounded-2xl bg-white/20 flex items-center justify-center backdrop-blur-sm">
              <Building className="w-10 h-10 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-white mb-2">Property Manager Portal</h1>
              <p className="text-white/90 text-lg">{associationInfo.name}</p>
              <div className="flex items-center gap-4 mt-2 text-white/80 text-sm">
                <span className="flex items-center gap-1">
                  <Phone className="w-4 h-4" />
                  {associationInfo.phone}
                </span>
                <span className="flex items-center gap-1">
                  <Mail className="w-4 h-4" />
                  {associationInfo.email}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-[#0F0F0F] border-b border-[#2A2A2A] sticky top-0 z-40">
        <div className="max-w-[1800px] mx-auto px-8">
          <div className="flex gap-1 overflow-x-auto">
            {[
              { id: 'overview', label: 'Overview', icon: Home },
              { id: 'units', label: 'Units', icon: Building },
              { id: 'maintenance', label: 'Maintenance', icon: Wrench },
              { id: 'financials', label: 'Financials', icon: DollarSign },
              { id: 'communications', label: 'Communications', icon: MessageSquare },
              { id: 'reports', label: 'Reports', icon: BarChart3 }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-6 py-4 font-semibold border-b-2 transition whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-purple-500 text-white'
                    : 'border-transparent text-gray-400 hover:text-white'
                }`}
              >
                <tab.icon className="w-5 h-5" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-[1800px] mx-auto p-8">
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="p-6 rounded-2xl border border-[#2A2A2A] bg-gradient-to-br from-[#1A1A1A] to-[#0F0F0F]">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
                    <Building className="w-6 h-6 text-blue-400" />
                  </div>
                  <span className="text-2xl font-bold text-white">{managerStats.totalUnits}</span>
                </div>
                <p className="text-gray-400 text-sm">Total Units</p>
                <div className="mt-2 flex items-center gap-2 text-blue-400 text-sm">
                  <TrendingUp className="w-4 h-4" />
                  {managerStats.occupancyRate}% Occupied
                </div>
              </div>

              <div className="p-6 rounded-2xl border border-[#2A2A2A] bg-gradient-to-br from-[#1A1A1A] to-[#0F0F0F]">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center">
                    <DollarSign className="w-6 h-6 text-green-400" />
                  </div>
                  <span className="text-2xl font-bold text-white">${(managerStats.monthlyRevenue / 1000).toFixed(0)}K</span>
                </div>
                <p className="text-gray-400 text-sm">Monthly Revenue</p>
                <div className="mt-2 flex items-center gap-2 text-green-400 text-sm">
                  <TrendingUp className="w-4 h-4" />
                  +8.2% vs last month
                </div>
              </div>

              <div className="p-6 rounded-2xl border border-[#2A2A2A] bg-gradient-to-br from-[#1A1A1A] to-[#0F0F0F]">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-orange-500/20 flex items-center justify-center">
                    <Wrench className="w-6 h-6 text-orange-400" />
                  </div>
                  <span className="text-2xl font-bold text-white">{managerStats.activeRequests}</span>
                </div>
                <p className="text-gray-400 text-sm">Active Requests</p>
                <div className="mt-2 flex items-center gap-2 text-orange-400 text-sm">
                  <Clock className="w-4 h-4" />
                  {managerStats.avgResponseTime}h avg response
                </div>
              </div>

              <div className="p-6 rounded-2xl border border-[#2A2A2A] bg-gradient-to-br from-[#1A1A1A] to-[#0F0F0F]">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
                    <Star className="w-6 h-6 text-purple-400" />
                  </div>
                  <span className="text-2xl font-bold text-white">{managerStats.residentSatisfaction}</span>
                </div>
                <p className="text-gray-400 text-sm">Satisfaction Score</p>
                <div className="mt-2 flex items-center gap-2 text-purple-400 text-sm">
                  <TrendingUp className="w-4 h-4" />
                  Excellent rating
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="p-6 rounded-2xl border border-[#2A2A2A] bg-gradient-to-br from-[#1A1A1A] to-[#0F0F0F]">
              <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                <Activity className="w-6 h-6 text-purple-400" />
                Recent Activity
              </h3>
              <div className="space-y-4">
                {recentActivity.map(activity => (
                  <div key={activity.id} className="flex items-center gap-4 p-4 rounded-xl bg-[#0A0A0A] border border-[#2A2A2A] hover:border-purple-500/50 transition">
                    <div className={`w-12 h-12 rounded-xl bg-${activity.color}-500/20 flex items-center justify-center flex-shrink-0`}>
                      <activity.icon className={`w-6 h-6 text-${activity.color}-400`} />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-white">{activity.title}</h4>
                      <p className="text-gray-400 text-sm">{activity.description}</p>
                    </div>
                    <span className="text-gray-500 text-sm whitespace-nowrap">{activity.date}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Upcoming Maintenance */}
            <div className="p-6 rounded-2xl border border-[#2A2A2A] bg-gradient-to-br from-[#1A1A1A] to-[#0F0F0F]">
              <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                <Calendar className="w-6 h-6 text-purple-400" />
                Upcoming Maintenance
              </h3>
              <div className="space-y-3">
                {upcomingMaintenance.map(item => (
                  <div key={item.id} className="flex items-center justify-between p-4 rounded-xl bg-[#0A0A0A] border border-[#2A2A2A]">
                    <div className="flex-1">
                      <h4 className="font-semibold text-white">{item.task}</h4>
                      <p className="text-gray-400 text-sm">{item.unit} • {item.vendor}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                        item.priority === 'high' ? 'bg-red-500/20 text-red-400' : 'bg-yellow-500/20 text-yellow-400'
                      }`}>
                        {item.priority.toUpperCase()}
                      </span>
                      <span className="text-gray-400 text-sm whitespace-nowrap">{item.date}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab !== 'overview' && (
          <div className="text-center py-20">
            <div className="w-20 h-20 rounded-2xl bg-purple-500/20 flex items-center justify-center mx-auto mb-6">
              <Settings className="w-10 h-10 text-purple-400" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">
              {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Section
            </h3>
            <p className="text-gray-400">
              This section contains detailed {activeTab} management features
            </p>
          </div>
        )}
      </div>
    </div>
  );
}