import { useState } from 'react';
import {
  Building, Wrench, AlertCircle, CheckCircle, Clock, Users, DollarSign,
  Settings, Bell, Calendar, FileText, MessageSquare, Phone, Mail,
  MapPin, Plus, Search, Filter, Eye, Edit, Trash2, Download, Upload,
  TrendingUp, BarChart3, PieChart, Activity, Tag, Star, Shield,
  Home, Zap, Package, CreditCard, Gift, Target, User, UserCheck,
  ClipboardList, PlayCircle, Image, Video, Share2, ExternalLink, ArrowRight
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import PropertyManagerPortal from './PropertyManagerPortal';

interface WorkRequest {
  id: string;
  unitNumber: string;
  residentName: string;
  category: 'plumbing' | 'electrical' | 'hvac' | 'general' | 'emergency' | 'renovation';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'assigned' | 'in-progress' | 'completed' | 'cancelled';
  title: string;
  description: string;
  requestedDate: string;
  scheduledDate?: string;
  completedDate?: string;
  assignedTo?: string;
  estimatedCost?: number;
  actualCost?: number;
  photos: string[];
  notes: string[];
  isRecurring?: boolean;
  recurringSchedule?: string;
}

interface RenovationDeal {
  id: string;
  title: string;
  description: string;
  category: string;
  discount: number;
  validUntil: string;
  termsAndConditions: string;
  minimumSpend?: number;
  image: string;
  featured: boolean;
  claimedBy: string[];
}

interface CondoUnit {
  id: string;
  unitNumber: string;
  building: string;
  floor: number;
  ownerName: string;
  ownerEmail: string;
  ownerPhone: string;
  tenantName?: string;
  tenantEmail?: string;
  tenantPhone?: string;
  squareFeet: number;
  bedrooms: number;
  bathrooms: number;
  status: 'owner-occupied' | 'rented' | 'vacant';
  maintenancePlanActive: boolean;
  outstandingRequests: number;
}

export default function CondoAssociationCRM() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'requests' | 'units' | 'deals' | 'property-manager' | 'reports' | 'settings'>('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<WorkRequest | null>(null);
  const [showPropertyManagerPortal, setShowPropertyManagerPortal] = useState(false);

  // Association Info
  const associationInfo = {
    name: 'Sunset Towers Condo Association',
    address: '123 Oceanview Drive, Miami, FL 33139',
    totalUnits: 156,
    buildings: 3,
    propertyManager: 'Jane Smith',
    phone: '(305) 555-0100',
    email: 'info@sunsettowers.com'
  };

  // Mock work requests
  const [workRequests, setWorkRequests] = useState<WorkRequest[]>([
    {
      id: 'WR-001',
      unitNumber: '12B',
      residentName: 'John Doe',
      category: 'plumbing',
      priority: 'high',
      status: 'pending',
      title: 'Kitchen Sink Leaking',
      description: 'Water is dripping from under the kitchen sink. Appears to be coming from the drain pipe.',
      requestedDate: '2024-01-25T09:30:00Z',
      photos: ['https://images.unsplash.com/photo-1585704032915-c3400ca199e7?w=400'],
      notes: [],
      estimatedCost: 150
    },
    {
      id: 'WR-002',
      unitNumber: '8A',
      residentName: 'Sarah Johnson',
      category: 'hvac',
      priority: 'urgent',
      status: 'assigned',
      title: 'AC Not Working',
      description: 'Air conditioning unit stopped working completely. Temperature rising in unit.',
      requestedDate: '2024-01-24T14:00:00Z',
      scheduledDate: '2024-01-25T16:00:00Z',
      assignedTo: 'Mike Wilson - HVAC Tech',
      photos: ['https://images.unsplash.com/photo-1631545806609-4c0d0e1b0a0b?w=400'],
      notes: ['Technician scheduled for this afternoon', 'May need new compressor'],
      estimatedCost: 850
    },
    {
      id: 'WR-003',
      unitNumber: '15C',
      residentName: 'Michael Chen',
      category: 'electrical',
      priority: 'medium',
      status: 'in-progress',
      title: 'Bathroom Light Fixture',
      description: 'Light fixture in master bathroom flickering and buzzing.',
      requestedDate: '2024-01-23T10:15:00Z',
      scheduledDate: '2024-01-25T10:00:00Z',
      assignedTo: 'Tom Martinez - Electrician',
      photos: [],
      notes: ['Electrician on-site now', 'Replacing light fixture'],
      estimatedCost: 200,
      actualCost: 175
    }
  ]);

  // Mock renovation deals
  const [renovationDeals, setRenovationDeals] = useState<RenovationDeal[]>([
    {
      id: 'DEAL-001',
      title: 'Kitchen Remodel Package',
      description: 'Complete kitchen renovation including cabinets, countertops, and appliances. Exclusive 20% discount for condo association members.',
      category: 'Kitchen',
      discount: 20,
      validUntil: '2024-03-31',
      termsAndConditions: 'Valid for bookings made before March 31, 2024. Minimum spend $15,000. Cannot be combined with other offers.',
      minimumSpend: 15000,
      image: 'https://images.unsplash.com/photo-1556912173-3bb406ef7e77?w=800',
      featured: true,
      claimedBy: ['12B', '8A']
    },
    {
      id: 'DEAL-002',
      title: 'Bathroom Upgrade Special',
      description: 'Modernize your bathroom with new fixtures, tiles, and vanity. 15% off for association members.',
      category: 'Bathroom',
      discount: 15,
      validUntil: '2024-04-30',
      termsAndConditions: 'Valid through April 2024. Minimum spend $8,000.',
      minimumSpend: 8000,
      image: 'https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?w=800',
      featured: true,
      claimedBy: []
    },
    {
      id: 'DEAL-003',
      title: 'Flooring Replacement Deal',
      description: 'Premium hardwood or luxury vinyl flooring installation. Special 25% discount for multiple units.',
      category: 'Flooring',
      discount: 25,
      validUntil: '2024-02-29',
      termsAndConditions: 'Book 3+ units for 25% off. Book 1-2 units for 15% off. Valid February 2024 only.',
      minimumSpend: 5000,
      image: 'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=800',
      featured: false,
      claimedBy: ['15C', '22A', '9B']
    }
  ]);

  // Mock condo units
  const [condoUnits, setCondoUnits] = useState<CondoUnit[]>([
    {
      id: 'UNIT-001',
      unitNumber: '12B',
      building: 'Tower A',
      floor: 12,
      ownerName: 'John Doe',
      ownerEmail: 'john.doe@email.com',
      ownerPhone: '(305) 555-1234',
      squareFeet: 1200,
      bedrooms: 2,
      bathrooms: 2,
      status: 'owner-occupied',
      maintenancePlanActive: true,
      outstandingRequests: 1
    },
    {
      id: 'UNIT-002',
      unitNumber: '8A',
      building: 'Tower A',
      floor: 8,
      ownerName: 'Sarah Johnson',
      ownerEmail: 'sarah.j@email.com',
      ownerPhone: '(305) 555-5678',
      tenantName: 'Mike Roberts',
      tenantEmail: 'mike.r@email.com',
      tenantPhone: '(305) 555-9012',
      squareFeet: 950,
      bedrooms: 1,
      bathrooms: 1,
      status: 'rented',
      maintenancePlanActive: true,
      outstandingRequests: 1
    }
  ]);

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'plumbing': return Wrench;
      case 'electrical': return Zap;
      case 'hvac': return Wrench;
      case 'general': return ClipboardList;
      case 'emergency': return AlertCircle;
      case 'renovation': return Home;
      default: return Wrench;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'from-red-600 to-red-700';
      case 'high': return 'from-orange-600 to-orange-700';
      case 'medium': return 'from-yellow-600 to-yellow-700';
      case 'low': return 'from-green-600 to-green-700';
      default: return 'from-gray-600 to-gray-700';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-600/20 text-green-400 border-green-500/30';
      case 'in-progress': return 'bg-blue-600/20 text-blue-400 border-blue-500/30';
      case 'assigned': return 'bg-purple-600/20 text-purple-400 border-purple-500/30';
      case 'pending': return 'bg-yellow-600/20 text-yellow-400 border-yellow-500/30';
      case 'cancelled': return 'bg-red-600/20 text-red-400 border-red-500/30';
      default: return 'bg-gray-600/20 text-gray-400 border-gray-500/30';
    }
  };

  const handleCreateRequest = () => {
    toast.success('Work request created successfully!');
    setShowRequestModal(false);
  };

  const handleAssignRequest = (requestId: string) => {
    setWorkRequests(workRequests.map(req =>
      req.id === requestId ? { ...req, status: 'assigned', assignedTo: 'Tech Team' } : req
    ));
    toast.success('Request assigned to technician');
  };

  const handleCompleteRequest = (requestId: string) => {
    setWorkRequests(workRequests.map(req =>
      req.id === requestId ? { ...req, status: 'completed', completedDate: new Date().toISOString() } : req
    ));
    toast.success('Request marked as completed');
  };

  if (showPropertyManagerPortal) {
    return (
      <PropertyManagerPortal
        associationInfo={associationInfo}
        onClose={() => setShowPropertyManagerPortal(false)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-600 to-cyan-700 flex items-center justify-center shadow-lg shadow-cyan-500/20">
                <Building className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white mb-1">{associationInfo.name}</h1>
                <p className="text-gray-400">Condo Association Management Portal</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowPropertyManagerPortal(true)}
                className="px-6 py-3 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-xl hover:from-purple-700 hover:to-purple-800 transition font-bold flex items-center gap-2 shadow-lg shadow-purple-500/20"
              >
                <UserCheck className="w-5 h-5" />
                Property Manager Portal
              </button>
              <button className="px-6 py-3 bg-gradient-to-r from-cyan-600 to-cyan-700 text-white rounded-xl hover:from-cyan-700 hover:to-cyan-800 transition font-bold flex items-center gap-2 shadow-lg shadow-cyan-500/20">
                <Bell className="w-5 h-5" />
                Notifications
              </button>
            </div>
          </div>

          {/* Association Info Bar */}
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-4">
              <div className="flex items-center gap-3">
                <Building className="w-10 h-10 text-cyan-400" />
                <div>
                  <p className="text-2xl font-bold text-white">{associationInfo.totalUnits}</p>
                  <p className="text-sm text-gray-400">Total Units</p>
                </div>
              </div>
            </div>
            <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-4">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-10 h-10 text-orange-400" />
                <div>
                  <p className="text-2xl font-bold text-white">{workRequests.filter(r => r.status === 'pending').length}</p>
                  <p className="text-sm text-gray-400">Pending Requests</p>
                </div>
              </div>
            </div>
            <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-4">
              <div className="flex items-center gap-3">
                <Wrench className="w-10 h-10 text-blue-400" />
                <div>
                  <p className="text-2xl font-bold text-white">{workRequests.filter(r => r.status === 'in-progress').length}</p>
                  <p className="text-sm text-gray-400">In Progress</p>
                </div>
              </div>
            </div>
            <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-4">
              <div className="flex items-center gap-3">
                <Gift className="w-10 h-10 text-green-400" />
                <div>
                  <p className="text-2xl font-bold text-white">{renovationDeals.length}</p>
                  <p className="text-sm text-gray-400">Active Deals</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6 flex gap-2 overflow-x-auto pb-2">
          {[
            { id: 'dashboard' as const, label: 'Dashboard', icon: Home },
            { id: 'requests' as const, label: 'Work Requests', icon: ClipboardList, badge: workRequests.filter(r => r.status === 'pending').length },
            { id: 'units' as const, label: 'Units', icon: Building },
            { id: 'deals' as const, label: 'Renovation Deals', icon: Gift },
            { id: 'property-manager' as const, label: 'Property Manager', icon: UserCheck },
            { id: 'reports' as const, label: 'Reports', icon: BarChart3 },
            { id: 'settings' as const, label: 'Settings', icon: Settings }
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-6 py-3 rounded-xl font-semibold transition whitespace-nowrap flex items-center gap-2 relative ${
                  activeTab === tab.id
                    ? 'bg-gradient-to-r from-cyan-600 to-cyan-700 text-white shadow-lg shadow-cyan-500/20'
                    : 'bg-[#1A1A1A] text-gray-400 hover:bg-[#2A2A2A] border border-[#2A2A2A]'
                }`}
              >
                <Icon className="w-5 h-5" />
                {tab.label}
                {tab.badge && tab.badge > 0 && (
                  <span className="absolute -top-2 -right-2 w-6 h-6 bg-red-600 text-white rounded-full text-xs flex items-center justify-center font-bold">
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-6">
              <div className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] p-6">
                <h3 className="text-lg font-bold text-white mb-4">Recent Requests</h3>
                <div className="space-y-3">
                  {workRequests.slice(0, 3).map(request => {
                    const Icon = getCategoryIcon(request.category);
                    return (
                      <div key={request.id} className="flex items-center gap-3 p-3 bg-[#0A0A0A] rounded-xl">
                        <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${getPriorityColor(request.priority)} flex items-center justify-center`}>
                          <Icon className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-white text-sm">{request.title}</p>
                          <p className="text-xs text-gray-400">Unit {request.unitNumber}</p>
                        </div>
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${getStatusColor(request.status)}`}>
                          {request.status}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] p-6">
                <h3 className="text-lg font-bold text-white mb-4">Featured Deals</h3>
                <div className="space-y-3">
                  {renovationDeals.filter(d => d.featured).slice(0, 2).map(deal => (
                    <div key={deal.id} className="p-4 bg-[#0A0A0A] rounded-xl border border-green-500/30">
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-bold text-white text-sm">{deal.title}</h4>
                        <span className="px-2 py-1 bg-green-600 text-white rounded text-xs font-bold">
                          {deal.discount}% OFF
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 mb-2">{deal.category}</p>
                      <p className="text-xs text-green-400">Valid until {new Date(deal.validUntil).toLocaleDateString()}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] p-6">
                <h3 className="text-lg font-bold text-white mb-4">Maintenance Stats</h3>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-gray-400">Completion Rate</span>
                      <span className="font-bold text-green-400">94%</span>
                    </div>
                    <div className="w-full h-2 bg-[#0A0A0A] rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-green-600 to-green-400" style={{ width: '94%' }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-gray-400">Avg Response Time</span>
                      <span className="font-bold text-blue-400">2.5 hrs</span>
                    </div>
                    <div className="w-full h-2 bg-[#0A0A0A] rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-blue-600 to-blue-400" style={{ width: '85%' }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-gray-400">Satisfaction Score</span>
                      <span className="font-bold text-purple-400">4.8/5</span>
                    </div>
                    <div className="w-full h-2 bg-[#0A0A0A] rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-purple-600 to-purple-400" style={{ width: '96%' }} />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-4 gap-4">
              <button
                onClick={() => setShowRequestModal(true)}
                className="p-6 bg-gradient-to-br from-cyan-600 to-cyan-700 rounded-2xl hover:from-cyan-700 hover:to-cyan-800 transition group"
              >
                <Plus className="w-10 h-10 text-white mb-3 group-hover:scale-110 transition" />
                <p className="font-bold text-white text-lg">New Request</p>
                <p className="text-sm text-cyan-100 mt-1">Submit work order</p>
              </button>

              <button className="p-6 bg-gradient-to-br from-purple-600 to-purple-700 rounded-2xl hover:from-purple-700 hover:to-purple-800 transition group">
                <Calendar className="w-10 h-10 text-white mb-3 group-hover:scale-110 transition" />
                <p className="font-bold text-white text-lg">Schedule</p>
                <p className="text-sm text-purple-100 mt-1">View calendar</p>
              </button>

              <button className="p-6 bg-gradient-to-br from-green-600 to-green-700 rounded-2xl hover:from-green-700 hover:to-green-800 transition group">
                <Gift className="w-10 h-10 text-white mb-3 group-hover:scale-110 transition" />
                <p className="font-bold text-white text-lg">View Deals</p>
                <p className="text-sm text-green-100 mt-1">Special offers</p>
              </button>

              <button className="p-6 bg-gradient-to-br from-orange-600 to-orange-700 rounded-2xl hover:from-orange-700 hover:to-orange-800 transition group">
                <BarChart3 className="w-10 h-10 text-white mb-3 group-hover:scale-110 transition" />
                <p className="font-bold text-white text-lg">Reports</p>
                <p className="text-sm text-orange-100 mt-1">Analytics</p>
              </button>
            </div>
          </div>
        )}

        {/* Work Requests Tab */}
        {activeTab === 'requests' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-6">
              <div className="flex gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search requests..."
                    className="w-full pl-12 pr-4 py-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl text-white placeholder-gray-500 focus:border-cyan-500 focus:outline-none transition"
                  />
                </div>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-4 py-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl text-white focus:border-cyan-500 focus:outline-none transition"
                >
                  <option value="all">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="assigned">Assigned</option>
                  <option value="in-progress">In Progress</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
              <button
                onClick={() => setShowRequestModal(true)}
                className="px-6 py-3 bg-gradient-to-r from-cyan-600 to-cyan-700 text-white rounded-xl hover:from-cyan-700 hover:to-cyan-800 transition font-bold flex items-center gap-2"
              >
                <Plus className="w-5 h-5" />
                New Request
              </button>
            </div>

            <div className="space-y-3">
              {workRequests.map(request => {
                const Icon = getCategoryIcon(request.category);
                return (
                  <div key={request.id} className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] p-6 hover:border-cyan-500/30 transition">
                    <div className="flex items-start gap-4">
                      <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${getPriorityColor(request.priority)} flex items-center justify-center flex-shrink-0`}>
                        <Icon className="w-7 h-7 text-white" />
                      </div>

                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h3 className="text-lg font-bold text-white">{request.title}</h3>
                            <p className="text-sm text-gray-400">Unit {request.unitNumber} - {request.residentName}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`px-3 py-1 rounded-lg text-sm font-semibold border ${getStatusColor(request.status)}`}>
                              {request.status.replace('-', ' ')}
                            </span>
                            <span className="px-3 py-1 rounded-lg text-sm font-bold bg-gradient-to-r from-orange-600/20 to-orange-700/20 text-orange-400 border border-orange-500/30">
                              {request.priority}
                            </span>
                          </div>
                        </div>

                        <p className="text-gray-300 mb-3">{request.description}</p>

                        <div className="grid grid-cols-4 gap-4 mb-4">
                          <div>
                            <p className="text-xs text-gray-500">Requested</p>
                            <p className="text-sm text-white">{new Date(request.requestedDate).toLocaleDateString()}</p>
                          </div>
                          {request.scheduledDate && (
                            <div>
                              <p className="text-xs text-gray-500">Scheduled</p>
                              <p className="text-sm text-white">{new Date(request.scheduledDate).toLocaleDateString()}</p>
                            </div>
                          )}
                          {request.assignedTo && (
                            <div>
                              <p className="text-xs text-gray-500">Assigned To</p>
                              <p className="text-sm text-white">{request.assignedTo}</p>
                            </div>
                          )}
                          <div>
                            <p className="text-xs text-gray-500">Estimated Cost</p>
                            <p className="text-sm font-bold text-green-400">${request.estimatedCost}</p>
                          </div>
                        </div>

                        <div className="flex gap-2">
                          {request.status === 'pending' && (
                            <button
                              onClick={() => handleAssignRequest(request.id)}
                              className="px-4 py-2 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 rounded-lg transition font-semibold text-sm border border-blue-500/30"
                            >
                              Assign Technician
                            </button>
                          )}
                          {request.status === 'in-progress' && (
                            <button
                              onClick={() => handleCompleteRequest(request.id)}
                              className="px-4 py-2 bg-green-600/20 hover:bg-green-600/30 text-green-400 rounded-lg transition font-semibold text-sm border border-green-500/30"
                            >
                              Mark Complete
                            </button>
                          )}
                          <button className="px-4 py-2 bg-purple-600/20 hover:bg-purple-600/30 text-purple-400 rounded-lg transition font-semibold text-sm border border-purple-500/30">
                            View Details
                          </button>
                          <button className="px-4 py-2 bg-gray-600/20 hover:bg-gray-600/30 text-gray-400 rounded-lg transition font-semibold text-sm border border-gray-500/30">
                            Add Note
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Renovation Deals Tab */}
        {activeTab === 'deals' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">Exclusive Renovation Deals for Residents</h2>
              <button className="px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-xl hover:from-green-700 hover:to-green-800 transition font-bold">
                Add New Deal
              </button>
            </div>

            <div className="grid grid-cols-2 gap-6">
              {renovationDeals.map(deal => (
                <div key={deal.id} className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] overflow-hidden hover:border-green-500/30 transition group">
                  <div className="relative h-48">
                    <img src={deal.image} alt={deal.title} className="w-full h-full object-cover" />
                    <div className="absolute top-4 right-4 px-4 py-2 bg-green-600 rounded-xl">
                      <p className="text-2xl font-bold text-white">{deal.discount}% OFF</p>
                    </div>
                    {deal.featured && (
                      <div className="absolute top-4 left-4 px-3 py-1 bg-orange-600 rounded-lg flex items-center gap-1">
                        <Star className="w-4 h-4 text-white" />
                        <span className="text-sm font-bold text-white">Featured</span>
                      </div>
                    )}
                  </div>

                  <div className="p-6">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="text-xl font-bold text-white mb-1">{deal.title}</h3>
                        <span className="px-2 py-1 bg-cyan-600/20 text-cyan-400 rounded text-xs font-semibold border border-cyan-500/30">
                          {deal.category}
                        </span>
                      </div>
                    </div>

                    <p className="text-gray-300 text-sm mb-4">{deal.description}</p>

                    <div className="space-y-2 mb-4">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-400">Minimum Spend:</span>
                        <span className="font-bold text-white">${deal.minimumSpend?.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-400">Valid Until:</span>
                        <span className="font-bold text-green-400">{new Date(deal.validUntil).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-400">Units Claimed:</span>
                        <span className="font-bold text-purple-400">{deal.claimedBy.length}</span>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button className="flex-1 px-4 py-2 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-xl hover:from-green-700 hover:to-green-800 transition font-bold">
                        Claim Deal
                      </button>
                      <button className="px-4 py-2 bg-[#0A0A0A] border border-[#2A2A2A] text-gray-300 rounded-xl hover:bg-[#1A1A1A] transition">
                        Details
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Other tabs placeholder */}
        {(activeTab === 'units' || activeTab === 'property-manager' || activeTab === 'reports' || activeTab === 'settings') && (
          <div className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] p-12 text-center">
            <Building className="w-16 h-16 text-gray-500 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">{activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Section</h3>
            <p className="text-gray-400">Content for this section coming soon...</p>
          </div>
        )}
      </div>
    </div>
  );
}
