import { useState } from 'react';
import {
  Users, Search, Filter, Plus, Download, Edit, Trash2, Eye, Check, X,
  Building, Mail, Phone, MapPin, Calendar, Tag, DollarSign, AlertCircle,
  CheckCircle, Clock, Star, TrendingUp, BarChart3, Grid, List, Settings,
  UserCheck, UserX, RefreshCw, ArrowRight, User
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';

interface CustomerGroup {
  id: string;
  name: string;
  crmId: string;
  crmName: string;
  crmColor: string;
  customerCount: number;
  activeCustomers: number;
  pendingApprovals: number;
  totalRevenue: number;
  averageLifetimeValue: number;
  requiresApproval: boolean;
  autoAssign: boolean;
  createdDate: string;
}

interface GroupCustomer {
  id: string;
  groupId: string;
  groupName: string;
  name: string;
  email: string;
  phone: string;
  status: 'active' | 'pending' | 'inactive';
  joinDate: string;
  lastActivity: string;
  lifetimeValue: number;
  projects: number;
  customFields: Record<string, string>;
}

interface CustomerGroupManagementProps {
  crmTemplates?: Array<{
    id: string;
    name: string;
    primaryColor: string;
    hasCustomerGroup: boolean;
    customerGroupName?: string;
    customerGroupSettings?: {
      requireApproval: boolean;
      autoAssignToGroup: boolean;
    };
  }>;
}

export default function CustomerGroupManagement({ crmTemplates = [] }: CustomerGroupManagementProps) {
  const [activeView, setActiveView] = useState<'overview' | 'groups' | 'customers' | 'settings'>('overview');
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Sample customer groups data
  const [customerGroups] = useState<CustomerGroup[]>([
    {
      id: 'GROUP-001',
      name: 'Condo Residents',
      crmId: 'CRM-001',
      crmName: 'Condo Association CRM',
      crmColor: 'cyan',
      customerCount: 156,
      activeCustomers: 142,
      pendingApprovals: 8,
      totalRevenue: 2450000,
      averageLifetimeValue: 15700,
      requiresApproval: true,
      autoAssign: true,
      createdDate: '2024-01-15'
    },
    {
      id: 'GROUP-002',
      name: 'Portfolio Investors',
      crmId: 'CRM-002',
      crmName: 'Portfolio Management CRM',
      crmColor: 'purple',
      customerCount: 52,
      activeCustomers: 41,
      pendingApprovals: 3,
      totalRevenue: 12500000,
      averageLifetimeValue: 240380,
      requiresApproval: true,
      autoAssign: true,
      createdDate: '2024-01-20'
    }
  ]);

  // Sample group customers
  const [groupCustomers] = useState<GroupCustomer[]>([
    {
      id: 'CUST-001',
      groupId: 'GROUP-001',
      groupName: 'Condo Residents',
      name: 'John Smith',
      email: 'john.smith@email.com',
      phone: '(305) 555-1111',
      status: 'active',
      joinDate: '2023-06-15',
      lastActivity: '2 hours ago',
      lifetimeValue: 24500,
      projects: 12,
      customFields: {
        unitNumber: '12B',
        buildingName: 'Tower A',
        ownershipType: 'Owner'
      }
    },
    {
      id: 'CUST-002',
      groupId: 'GROUP-001',
      groupName: 'Condo Residents',
      name: 'Sarah Johnson',
      email: 'sarah.j@email.com',
      phone: '(305) 555-2222',
      status: 'pending',
      joinDate: '2024-01-24',
      lastActivity: '1 day ago',
      lifetimeValue: 0,
      projects: 0,
      customFields: {
        unitNumber: '15C',
        buildingName: 'Tower B',
        ownershipType: 'Renter'
      }
    },
    {
      id: 'CUST-003',
      groupId: 'GROUP-002',
      groupName: 'Portfolio Investors',
      name: 'Michael Anderson',
      email: 'michael.a@investment.com',
      phone: '(305) 555-3333',
      status: 'active',
      joinDate: '2023-03-10',
      lastActivity: '5 hours ago',
      lifetimeValue: 450000,
      projects: 3,
      customFields: {
        investorType: 'Accredited',
        investmentAmount: '$450,000',
        riskTolerance: 'Moderate'
      }
    }
  ]);

  const filteredGroups = customerGroups.filter(group =>
    group.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    group.crmName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredCustomers = selectedGroup
    ? groupCustomers.filter(c => c.groupId === selectedGroup)
    : groupCustomers;

  const handleApproveCustomer = (customerId: string) => {
    toast.success('Customer approved and added to group');
  };

  const handleRejectCustomer = (customerId: string) => {
    toast.success('Customer signup rejected');
  };

  const colorMap: Record<string, { bg: string; border: string; text: string; gradient: string }> = {
    cyan: { bg: 'bg-cyan-500/10', border: 'border-cyan-500/20', text: 'text-cyan-400', gradient: 'from-cyan-600 to-cyan-700' },
    purple: { bg: 'bg-purple-500/10', border: 'border-purple-500/20', text: 'text-purple-400', gradient: 'from-purple-600 to-purple-700' },
    blue: { bg: 'bg-blue-500/10', border: 'border-blue-500/20', text: 'text-blue-400', gradient: 'from-blue-600 to-blue-700' },
    green: { bg: 'bg-green-500/10', border: 'border-green-500/20', text: 'text-green-400', gradient: 'from-green-600 to-green-700' },
    orange: { bg: 'bg-orange-500/10', border: 'border-orange-500/20', text: 'text-orange-400', gradient: 'from-orange-600 to-orange-700' }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Customer Group Management</h1>
          <p className="text-gray-400">Manage customer assignments and track group-specific data</p>
        </div>
        <button className="px-6 py-3 bg-gradient-to-r from-cyan-600 to-cyan-700 text-white rounded-xl hover:from-cyan-700 hover:to-cyan-800 transition font-bold flex items-center gap-2">
          <Plus className="w-5 h-5" />
          Create Group
        </button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-4 gap-6">
        <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-600/20 to-cyan-700/20 flex items-center justify-center border border-cyan-500/30">
              <Users className="w-6 h-6 text-cyan-400" />
            </div>
            <span className="text-xs px-2 py-1 bg-cyan-500/10 text-cyan-400 rounded-lg border border-cyan-500/20">
              {customerGroups.length} Groups
            </span>
          </div>
          <p className="text-sm text-gray-400 mb-1">Total Customers</p>
          <p className="text-2xl font-bold text-white">
            {customerGroups.reduce((sum, g) => sum + g.customerCount, 0)}
          </p>
        </div>

        <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-600/20 to-green-700/20 flex items-center justify-center border border-green-500/30">
              <CheckCircle className="w-6 h-6 text-green-400" />
            </div>
            <span className="text-xs px-2 py-1 bg-green-500/10 text-green-400 rounded-lg border border-green-500/20">
              Active
            </span>
          </div>
          <p className="text-sm text-gray-400 mb-1">Active Customers</p>
          <p className="text-2xl font-bold text-white">
            {customerGroups.reduce((sum, g) => sum + g.activeCustomers, 0)}
          </p>
        </div>

        <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-yellow-600/20 to-yellow-700/20 flex items-center justify-center border border-yellow-500/30">
              <Clock className="w-6 h-6 text-yellow-400" />
            </div>
            <span className="text-xs px-2 py-1 bg-yellow-500/10 text-yellow-400 rounded-lg border border-yellow-500/20">
              Pending
            </span>
          </div>
          <p className="text-sm text-gray-400 mb-1">Pending Approvals</p>
          <p className="text-2xl font-bold text-white">
            {customerGroups.reduce((sum, g) => sum + g.pendingApprovals, 0)}
          </p>
        </div>

        <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-600/20 to-purple-700/20 flex items-center justify-center border border-purple-500/30">
              <DollarSign className="w-6 h-6 text-purple-400" />
            </div>
            <span className="text-xs px-2 py-1 bg-purple-500/10 text-purple-400 rounded-lg border border-purple-500/20">
              Total
            </span>
          </div>
          <p className="text-sm text-gray-400 mb-1">Total Revenue</p>
          <p className="text-2xl font-bold text-white">
            ${(customerGroups.reduce((sum, g) => sum + g.totalRevenue, 0) / 1000000).toFixed(1)}M
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-[#2A2A2A]">
        <div className="flex gap-1">
          {[
            { id: 'overview', label: 'Overview', icon: BarChart3 },
            { id: 'groups', label: 'Customer Groups', icon: Users },
            { id: 'customers', label: 'All Customers', icon: User },
            { id: 'settings', label: 'Settings', icon: Settings }
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveView(tab.id as any)}
                className={`px-6 py-4 font-medium transition flex items-center gap-2 border-b-2 ${
                  activeView === tab.id
                    ? 'text-cyan-400 border-cyan-500 bg-cyan-500/5'
                    : 'text-gray-400 border-transparent hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      {activeView === 'overview' && (
        <div className="space-y-6">
          {/* Customer Groups Grid */}
          <div>
            <h2 className="text-xl font-bold text-white mb-4">Customer Groups by CRM</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredGroups.map((group) => {
                const colors = colorMap[group.crmColor] || colorMap.cyan;
                return (
                  <div key={group.id} className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-bold text-white mb-2">{group.name}</h3>
                        <span className={`px-3 py-1 ${colors.bg} ${colors.text} rounded-lg text-sm font-semibold border ${colors.border}`}>
                          {group.crmName}
                        </span>
                      </div>
                      <button className="p-2 hover:bg-[#2A2A2A] rounded-lg transition">
                        <Settings className="w-5 h-5 text-gray-400" />
                      </button>
                    </div>

                    <div className="grid grid-cols-3 gap-4 mb-4">
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Total</p>
                        <p className="text-xl font-bold text-white">{group.customerCount}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Active</p>
                        <p className="text-xl font-bold text-green-400">{group.activeCustomers}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Pending</p>
                        <p className="text-xl font-bold text-yellow-400">{group.pendingApprovals}</p>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-[#2A2A2A]">
                      <div className="flex items-center justify-between text-sm mb-2">
                        <span className="text-gray-400">Total Revenue</span>
                        <span className="text-white font-bold">${(group.totalRevenue / 1000).toFixed(0)}K</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-400">Avg Lifetime Value</span>
                        <span className="text-white font-bold">${group.averageLifetimeValue.toLocaleString()}</span>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        setSelectedGroup(group.id);
                        setActiveView('customers');
                      }}
                      className={`w-full mt-4 py-3 bg-gradient-to-r ${colors.gradient} text-white rounded-xl hover:opacity-90 transition font-bold flex items-center justify-center gap-2`}
                    >
                      View Customers
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Pending Approvals */}
          {groupCustomers.filter(c => c.status === 'pending').length > 0 && (
            <div>
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <AlertCircle className="w-6 h-6 text-yellow-400" />
                Pending Approvals
              </h2>
              <div className="space-y-3">
                {groupCustomers.filter(c => c.status === 'pending').map((customer) => (
                  <div key={customer.id} className="bg-[#1A1A1A] rounded-xl border border-yellow-500/20 p-4 flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="text-white font-bold">{customer.name}</h4>
                        <span className="px-2 py-1 bg-yellow-500/10 text-yellow-400 rounded text-xs font-semibold border border-yellow-500/20">
                          {customer.groupName}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-400">
                        <span className="flex items-center gap-1">
                          <Mail className="w-4 h-4" />
                          {customer.email}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          Applied: {customer.joinDate}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleApproveCustomer(customer.id)}
                        className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl transition flex items-center gap-2"
                      >
                        <Check className="w-4 h-4" />
                        Approve
                      </button>
                      <button
                        onClick={() => handleRejectCustomer(customer.id)}
                        className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl transition flex items-center gap-2"
                      >
                        <X className="w-4 h-4" />
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {activeView === 'customers' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white">
              {selectedGroup ? customerGroups.find(g => g.id === selectedGroup)?.name : 'All Customers'}
            </h2>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search customers..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl text-white placeholder-gray-500 focus:border-cyan-500 focus:outline-none"
                />
              </div>
              {selectedGroup && (
                <button
                  onClick={() => setSelectedGroup(null)}
                  className="px-4 py-2 bg-[#2A2A2A] hover:bg-[#3A3A3A] text-white rounded-xl transition"
                >
                  View All Groups
                </button>
              )}
            </div>
          </div>

          <div className="space-y-3">
            {filteredCustomers.map((customer) => {
              const group = customerGroups.find(g => g.id === customer.groupId);
              const colors = group ? (colorMap[group.crmColor] || colorMap.cyan) : colorMap.cyan;
              
              return (
                <div key={customer.id} className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-bold text-white">{customer.name}</h3>
                        <span className={`px-2 py-1 ${colors.bg} ${colors.text} rounded text-xs font-semibold border ${colors.border}`}>
                          {customer.groupName}
                        </span>
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${
                          customer.status === 'active' ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
                          customer.status === 'pending' ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20' :
                          'bg-gray-500/10 text-gray-400 border border-gray-500/20'
                        }`}>
                          {customer.status.toUpperCase()}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-4 gap-4 mb-3">
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Email</p>
                          <p className="text-sm text-white">{customer.email}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Phone</p>
                          <p className="text-sm text-white">{customer.phone}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Lifetime Value</p>
                          <p className="text-sm font-bold text-green-400">${customer.lifetimeValue.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Projects</p>
                          <p className="text-sm font-bold text-white">{customer.projects}</p>
                        </div>
                      </div>

                      {Object.keys(customer.customFields).length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {Object.entries(customer.customFields).map(([key, value]) => (
                            <span key={key} className="px-2 py-1 bg-[#0A0A0A] border border-[#2A2A2A] rounded text-xs text-gray-400">
                              <span className="text-gray-500">{key}:</span> <span className="text-white">{value}</span>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <button className="p-2 bg-[#2A2A2A] hover:bg-[#3A3A3A] rounded-xl text-white transition">
                        <Eye className="w-4 h-4" />
                      </button>
                      <button className="p-2 bg-[#2A2A2A] hover:bg-[#3A3A3A] rounded-xl text-white transition">
                        <Edit className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {activeView === 'settings' && (
        <div className="text-center py-12">
          <Settings className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">Group Settings</h3>
          <p className="text-gray-400">Configure customer group preferences and automation rules</p>
        </div>
      )}
    </div>
  );
}
