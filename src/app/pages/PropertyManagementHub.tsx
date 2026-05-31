import { useState, useEffect } from 'react';
import { 
  Building2, Home, Users, Wrench, AlertCircle, Check, X, 
  ChevronRight, Search, Filter, MapPin, Calendar, Mail, Phone,
  FileText, Clock, DollarSign, Shield, Key, Layout, UserCog,
  TrendingUp, CheckCircle
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { BackToDashboard } from '../components/BackToDashboard';
import SendOfferModal from '../components/SendOfferModal';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface WorkRequest {
  id: string;
  propertyType: 'condo' | 'landlord' | 'property_manager';
  condoId?: string;
  landlordId?: string;
  managerId?: string;
  status: 'pending_approval' | 'approved' | 'assigned' | 'in-progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  title: string;
  description: string;
  category: string;
  unitNumber?: string;
  propertyName?: string;
  residentName?: string;
  requestedDate: string;
  approved_at?: string;
  approved_by?: string;
  estimatedCost?: number;
  created_at: string;
  updated_at: string;
}

interface PropertyStats {
  totalCondos: number;
  totalLandlords: number;
  totalPropertyManagers: number;
  totalProperties: number;
  pendingApproval: number;
  approved: number;
  inProgress: number;
  completed: number;
  totalWorkRequests: number;
}

export default function PropertyManagementHub() {
  const [activeTab, setActiveTab] = useState<'overview' | 'pending' | 'approved' | 'condos' | 'landlords' | 'managers'>('overview');
  const [stats, setStats] = useState<PropertyStats | null>(null);
  const [workRequests, setWorkRequests] = useState<WorkRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'condo' | 'landlord' | 'property_manager'>('all');
  const [filterPriority, setFilterPriority] = useState<'all' | 'low' | 'medium' | 'high' | 'urgent'>('all');
  const [selectedRequest, setSelectedRequest] = useState<WorkRequest | null>(null);

  const baseUrl = `https://${projectId}.supabase.co/functions/v1/make-server-57095a78/property-management`;

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load stats
      const statsRes = await fetch(`${baseUrl}/stats`, {
        headers: { 'Authorization': `Bearer ${publicAnonKey}` }
      });
      const statsData = await statsRes.json();
      if (statsData.success) {
        setStats(statsData.data);
      }

      // Load work requests based on tab
      if (activeTab === 'pending') {
        const res = await fetch(`${baseUrl}/work-requests/pending`, {
          headers: { 'Authorization': `Bearer ${publicAnonKey}` }
        });
        const data = await res.json();
        if (data.success) {
          setWorkRequests(data.data);
        }
      } else if (activeTab === 'approved') {
        const res = await fetch(`${baseUrl}/work-requests/approved`, {
          headers: { 'Authorization': `Bearer ${publicAnonKey}` }
        });
        const data = await res.json();
        if (data.success) {
          setWorkRequests(data.data);
        }
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load property management data');
    } finally {
      setLoading(false);
    }
  };

  const sendOfferEmail = async (request: WorkRequest) => {
    toast.success(`Offer email sent for ${request.title}`);
    // TODO: Integrate with email service
  };

  const assignToCrew = async (request: WorkRequest) => {
    toast.success(`Work request assigned to crew`);
    // TODO: Integrate with crew assignment
  };

  const filteredRequests = workRequests.filter(request => {
    if (searchQuery && !request.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !request.description.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    if (filterType !== 'all' && request.propertyType !== filterType) {
      return false;
    }
    if (filterPriority !== 'all' && request.priority !== filterPriority) {
      return false;
    }
    return true;
  });

  const getPropertyTypeColor = (type: string) => {
    switch (type) {
      case 'condo': return 'text-cyan-400 bg-cyan-500/10';
      case 'landlord': return 'text-purple-400 bg-purple-500/10';
      case 'property_manager': return 'text-blue-400 bg-blue-500/10';
      default: return 'text-gray-400 bg-gray-500/10';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'text-red-400 bg-red-500/10';
      case 'high': return 'text-orange-400 bg-orange-500/10';
      case 'medium': return 'text-yellow-400 bg-yellow-500/10';
      case 'low': return 'text-green-400 bg-green-500/10';
      default: return 'text-gray-400 bg-gray-500/10';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending_approval': return 'text-yellow-400 bg-yellow-500/10';
      case 'approved': return 'text-green-400 bg-green-500/10';
      case 'assigned': return 'text-blue-400 bg-blue-500/10';
      case 'in-progress': return 'text-purple-400 bg-purple-500/10';
      case 'completed': return 'text-emerald-400 bg-emerald-500/10';
      case 'cancelled': return 'text-red-400 bg-red-500/10';
      default: return 'text-gray-400 bg-gray-500/10';
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white p-6">
      <BackToDashboard />

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-orange-400 to-orange-600 bg-clip-text text-transparent">
          Property Management Hub
        </h1>
        <p className="text-gray-400">
          Manage all condo associations, landlords, and property managers with approval workflows
        </p>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-4">
            <div className="flex items-center gap-3 mb-2">
              <Layout className="w-5 h-5 text-cyan-400" />
              <span className="text-sm text-gray-400">Condo Associations</span>
            </div>
            <div className="text-2xl font-bold">{stats.totalCondos}</div>
          </div>
          
          <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-4">
            <div className="flex items-center gap-3 mb-2">
              <Key className="w-5 h-5 text-purple-400" />
              <span className="text-sm text-gray-400">Landlords</span>
            </div>
            <div className="text-2xl font-bold">{stats.totalLandlords}</div>
          </div>
          
          <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-4">
            <div className="flex items-center gap-3 mb-2">
              <Building2 className="w-5 h-5 text-blue-400" />
              <span className="text-sm text-gray-400">Property Managers</span>
            </div>
            <div className="text-2xl font-bold">{stats.totalPropertyManagers}</div>
          </div>
          
          <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-4">
            <div className="flex items-center gap-3 mb-2">
              <Clock className="w-5 h-5 text-yellow-400" />
              <span className="text-sm text-gray-400">Pending Approval</span>
            </div>
            <div className="text-2xl font-bold">{stats.pendingApproval}</div>
          </div>
          
          <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-4">
            <div className="flex items-center gap-3 mb-2">
              <CheckCircle className="w-5 h-5 text-green-400" />
              <span className="text-sm text-gray-400">Ready to Assign</span>
            </div>
            <div className="text-2xl font-bold">{stats.approved}</div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto">
        {[
          { id: 'overview', label: 'Overview', icon: TrendingUp },
          { id: 'pending', label: 'Pending Approval', icon: Clock, badge: stats?.pendingApproval },
          { id: 'approved', label: 'Ready to Assign', icon: CheckCircle, badge: stats?.approved },
          { id: 'condos', label: 'Condos', icon: Layout },
          { id: 'landlords', label: 'Landlords', icon: Key },
          { id: 'managers', label: 'Property Managers', icon: Building2 }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-orange-600 text-white'
                : 'bg-[#1A1A1A] border border-[#2A2A2A] text-gray-400 hover:text-white'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
            {tab.badge !== undefined && tab.badge > 0 && (
              <span className="bg-orange-500 text-white text-sm font-bold px-2 py-0.5 rounded-full">
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Filters */}
      {(activeTab === 'pending' || activeTab === 'approved') && (
        <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search work requests..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-orange-500"
              />
            </div>

            {/* Property Type Filter */}
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as any)}
              className="px-4 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white focus:outline-none focus:border-orange-500"
            >
              <option value="all">All Property Types</option>
              <option value="condo">Condo Associations</option>
              <option value="landlord">Landlords</option>
              <option value="property_manager">Property Managers</option>
            </select>

            {/* Priority Filter */}
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value as any)}
              className="px-4 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white focus:outline-none focus:border-orange-500"
            >
              <option value="all">All Priorities</option>
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold mb-4">Quick Stats Overview</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg p-4">
                <div className="text-sm text-gray-400 mb-2">Total Properties</div>
                <div className="text-3xl font-bold text-orange-400">{stats?.totalProperties || 0}</div>
              </div>
              
              <div className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg p-4">
                <div className="text-sm text-gray-400 mb-2">Total Work Requests</div>
                <div className="text-3xl font-bold text-blue-400">{stats?.totalWorkRequests || 0}</div>
              </div>
              
              <div className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg p-4">
                <div className="text-sm text-gray-400 mb-2">In Progress</div>
                <div className="text-3xl font-bold text-purple-400">{stats?.inProgress || 0}</div>
              </div>
            </div>

            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 mt-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-yellow-400 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-yellow-400 mb-1">Property Manager Approval Required</h3>
                  <p className="text-sm text-gray-300">
                    All work requests from condo associations, landlords, and property managers require approval before they appear in your work queue. 
                    Click "Pending Approval" tab to see requests awaiting property manager review.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {(activeTab === 'pending' || activeTab === 'approved') && (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">
                {activeTab === 'pending' ? 'Pending Property Manager Approval' : 'Ready to Assign to Crew'}
              </h2>
              <div className="text-sm text-gray-400">
                {filteredRequests.length} request{filteredRequests.length !== 1 ? 's' : ''}
              </div>
            </div>

            {loading ? (
              <div className="text-center py-12 text-gray-400">Loading...</div>
            ) : filteredRequests.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <Wrench className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p>No work requests found</p>
              </div>
            ) : (
              filteredRequests.map(request => (
                <div key={request.id} className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg p-4 hover:border-orange-500/50 transition-all">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className={`px-2 py-1 rounded text-sm font-semibold ${getPropertyTypeColor(request.propertyType)}`}>
                          {request.propertyType === 'condo' ? 'Condo Association' : request.propertyType === 'landlord' ? 'Landlord' : 'Property Manager'}
                        </span>
                        <span className={`px-2 py-1 rounded text-sm font-semibold ${getPriorityColor(request.priority)}`}>
                          {request.priority.toUpperCase()}
                        </span>
                        <span className={`px-2 py-1 rounded text-sm font-semibold ${getStatusColor(request.status)}`}>
                          {request.status.replace('_', ' ').toUpperCase()}
                        </span>
                      </div>
                      
                      <h3 className="text-lg font-semibold text-white mb-1">{request.title}</h3>
                      <p className="text-sm text-gray-400 mb-3">{request.description}</p>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        {request.propertyName && (
                          <div>
                            <span className="text-gray-500">Property:</span>
                            <span className="ml-2 text-white font-medium">{request.propertyName}</span>
                          </div>
                        )}
                        {request.unitNumber && (
                          <div>
                            <span className="text-gray-500">Unit:</span>
                            <span className="ml-2 text-white font-medium">{request.unitNumber}</span>
                          </div>
                        )}
                        {request.category && (
                          <div>
                            <span className="text-gray-500">Category:</span>
                            <span className="ml-2 text-white font-medium">{request.category}</span>
                          </div>
                        )}
                        {request.estimatedCost && (
                          <div>
                            <span className="text-gray-500">Est. Cost:</span>
                            <span className="ml-2 text-white font-medium">${request.estimatedCost.toLocaleString()}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {activeTab === 'approved' && (
                      <div className="flex flex-col gap-2">
                        <button
                          onClick={() => setSelectedRequest(request)}
                          className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-medium transition-all"
                        >
                          <Mail className="w-4 h-4" />
                          Send Offer
                        </button>
                        <button
                          onClick={() => assignToCrew(request)}
                          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-all"
                        >
                          <Users className="w-4 h-4" />
                          Assign Crew
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'condos' && (
          <div className="text-center py-12">
            <Layout className="w-16 h-16 mx-auto mb-4 text-cyan-400 opacity-50" />
            <h3 className="text-xl font-semibold mb-2">Condo Association CRM</h3>
            <p className="text-gray-400 mb-6">Manage all condo associations, units, and work requests</p>
            <button className="px-6 py-3 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg font-semibold transition-all">
              Open Condo CRM
            </button>
          </div>
        )}

        {activeTab === 'landlords' && (
          <div className="text-center py-12">
            <Key className="w-16 h-16 mx-auto mb-4 text-purple-400 opacity-50" />
            <h3 className="text-xl font-semibold mb-2">Landlord CRM</h3>
            <p className="text-gray-400 mb-6">Manage all landlords, properties, and maintenance requests</p>
            <button className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold transition-all">
              Open Landlord CRM
            </button>
          </div>
        )}

        {activeTab === 'managers' && (
          <div className="text-center py-12">
            <Building2 className="w-16 h-16 mx-auto mb-4 text-blue-400 opacity-50" />
            <h3 className="text-xl font-semibold mb-2">Property Manager CRM</h3>
            <p className="text-gray-400 mb-6">Manage all property managers and their portfolios</p>
            <button className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-all">
              Open Property Manager CRM
            </button>
          </div>
        )}
      </div>

      {/* Send Offer Modal */}
      {selectedRequest && (
        <SendOfferModal
          workRequest={selectedRequest}
          propertyType={selectedRequest.propertyType}
          onClose={() => setSelectedRequest(null)}
          onSuccess={() => {
            setSelectedRequest(null);
            loadData(); // Reload to update status
          }}
        />
      )}
    </div>
  );
}