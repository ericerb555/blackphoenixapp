import { useState, useEffect } from 'react';
import {
  Users, Search, Filter, Download, Mail, Phone,
  MessageSquare, FileText, UserPlus, Grid, List, FolderOpen,
  Edit2, MoreVertical, DollarSign, Activity, Award, Target, Star, AlertCircle, Trash2, ArrowLeft
} from 'lucide-react';
import { DataTable, type DataTableColumn } from '../components/ui/table';
import CreateCustomerModal from '../components/customers/CreateCustomerModal';
import EditCustomerModal from '../components/customers/EditCustomerModal';
import DeleteConfirmationModal from '../components/ui/DeleteConfirmationModal';
import CustomerDetail from './CustomerDetail';
import { 
  getCustomers, 
  getCustomerStats,
  deleteCustomer,
  type Customer,
  type CustomerFilters 
} from '../lib/services/customerService';
import { toast } from 'sonner@2.0.3';

type ViewMode = 'grid' | 'list';
type TabType = 'all' | 'lead' | 'active' | 'vip' | 'inactive';

export default function CustomersNew() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [customerToEdit, setCustomerToEdit] = useState<Customer | null>(null);
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [viewingCustomer, setViewingCustomer] = useState<string | null>(null);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    leads: 0,
    vip: 0,
    inactive: 0,
    totalRevenue: 0,
    avgDeal: 0,
  });

  // Load customers
  useEffect(() => {
    loadCustomers();
    loadStats();
  }, []);

  // Read tab from URL on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab') as TabType;
    if (tab && ['all', 'lead', 'active', 'vip', 'inactive'].includes(tab)) {
      setActiveTab(tab);
    }
  }, []);

  // Update URL when tab changes
  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    const url = new URL(window.location.href);
    url.searchParams.set('tab', tab);
    window.history.pushState({}, '', url.toString());
  };

  const loadCustomers = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getCustomers();
      setCustomers(data);
    } catch (err: any) {
      // getCustomers already handles errors and returns mock data
      // No need to show error to user
      console.log('Using fallback customer data');
      setError(null);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const statsData = await getCustomerStats();
      setStats(statsData);
    } catch (err) {
      console.error('Error loading stats:', err);
    }
  };

  const handleCreateSuccess = () => {
    loadCustomers();
    loadStats();
  };

  const handleEditSuccess = () => {
    loadCustomers();
    loadStats();
  };

  const handleEditClick = (customer: Customer, e: React.MouseEvent) => {
    e.stopPropagation();
    setCustomerToEdit(customer);
    setShowEditModal(true);
  };

  const handleDeleteClick = (customer: Customer, e: React.MouseEvent) => {
    e.stopPropagation();
    setCustomerToDelete(customer);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!customerToDelete) return;

    setDeleteLoading(true);
    try {
      await deleteCustomer(customerToDelete.id);
      toast.success('Customer deleted successfully!');
      setShowDeleteModal(false);
      setCustomerToDelete(null);
      loadCustomers();
      loadStats();
    } catch (error: any) {
      console.error('Error deleting customer:', error);
      toast.error(error.message || 'Failed to delete customer');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleCustomerClick = (customer: Customer) => {
    setViewingCustomer(customer.id);
  };

  const handleBackFromDetail = () => {
    setViewingCustomer(null);
    loadCustomers();
    loadStats();
  };

  const handleEditFromDetail = (customer: Customer) => {
    setCustomerToEdit(customer);
    setShowEditModal(true);
  };

  // Show detail view if a customer is selected
  if (viewingCustomer) {
    return (
      <CustomerDetail
        customerId={viewingCustomer}
        onBack={handleBackFromDetail}
        onEdit={handleEditFromDetail}
      />
    );
  }

  const filteredCustomers = customers.filter(customer => {
    const matchesSearch = searchQuery === '' || 
      `${customer.first_name} ${customer.last_name}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customer.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customer.company?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesTab = activeTab === 'all' || customer.status === activeTab;
    
    return matchesSearch && matchesTab;
  });

  const statsDisplay = [
    { label: 'Total Customers', value: stats.total, change: '+12%', icon: Users },
    { label: 'Active', value: stats.active, change: '+8%', icon: Activity },
    { label: 'Leads', value: stats.leads, change: '+15%', icon: Target },
    { label: 'VIP', value: stats.vip, change: '+5%', icon: Star },
    { label: 'Total Revenue', value: `$${(stats.totalRevenue / 1000).toFixed(1)}k`, change: '+22%', icon: DollarSign },
    { label: 'Avg Deal', value: `$${Math.round(stats.avgDeal)}`, change: '+8%', icon: Award }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Loading customers...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <p className="text-red-400 mb-4">{error}</p>
          <button
            onClick={loadCustomers}
            className="px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-semibold transition"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-4 mb-2">
          <button
            onClick={() => {
              window.location.href = '/unified-dashboard';
            }}
            className="p-2 hover:bg-[#2A2A2A] rounded-lg transition-colors text-gray-400 hover:text-white"
            title="Back to Unified Dashboard"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-3xl font-bold text-white flex items-center gap-2">
            <Users className="w-8 h-8 text-orange-400" />
            Customer Management
          </h1>
        </div>
        <p className="text-gray-400 ml-14">Manage your customer relationships and track interactions</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {statsDisplay.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div key={i} className="bg-[#1A1A1A] rounded-2xl p-4 border border-[#2A2A2A] hover:border-orange-500/30 transition group">
              <div className="flex items-center justify-between mb-2">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-600/20 to-orange-700/20 flex items-center justify-center border border-orange-500/20">
                  <Icon className="w-5 h-5 text-orange-400" />
                </div>
                <span className="text-sm font-semibold text-green-400">{stat.change}</span>
              </div>
              <p className="text-2xl font-bold text-white">{stat.value}</p>
              <p className="text-sm text-gray-400">{stat.label}</p>
            </div>
          );
        })}
      </div>

      {/* Filters & Actions */}
      <div className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] p-6">
        <div className="flex items-center gap-4 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
            <input
              type="text"
              placeholder="Search customers by name, email, or company..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50"
            />
          </div>
          
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-3 border rounded-xl transition-colors ${
              showFilters ? 'bg-orange-600 text-white border-orange-600' : 'border-[#2A2A2A] text-gray-300 hover:bg-[#2A2A2A]'
            }`}
          >
            <Filter className="w-4 h-4" />
            Filters
          </button>

          <div className="flex items-center gap-2 p-1 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg ${viewMode === 'grid' ? 'bg-orange-600 text-white' : 'text-gray-400 hover:bg-[#2A2A2A]'}`}
            >
              <Grid className="w-5 h-5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg ${viewMode === 'list' ? 'bg-orange-600 text-white' : 'text-gray-400 hover:bg-[#2A2A2A]'}`}
            >
              <List className="w-5 h-5" />
            </button>
          </div>

          <button className="flex items-center gap-2 px-4 py-3 border border-[#2A2A2A] rounded-xl text-gray-300 hover:bg-[#2A2A2A] transition">
            <Download className="w-4 h-4" />
            Export
          </button>

          <button 
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-orange-600 to-orange-700 text-white rounded-xl hover:from-orange-700 hover:to-orange-800 transition shadow-lg shadow-orange-500/20"
          >
            <UserPlus className="w-4 h-4" />
            Add Customer
          </button>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleTabChange('all')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
              activeTab === 'all' ? 'bg-orange-600 text-white' : 'bg-[#0A0A0A] text-gray-400 hover:bg-[#2A2A2A]'
            }`}
          >
            All ({stats.total})
          </button>
          <button
            onClick={() => handleTabChange('lead')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
              activeTab === 'lead' ? 'bg-blue-600 text-white' : 'bg-[#0A0A0A] text-gray-400 hover:bg-[#2A2A2A]'
            }`}
          >
            Leads ({stats.leads})
          </button>
          <button
            onClick={() => handleTabChange('active')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
              activeTab === 'active' ? 'bg-green-600 text-white' : 'bg-[#0A0A0A] text-gray-400 hover:bg-[#2A2A2A]'
            }`}
          >
            Active ({stats.active})
          </button>
          <button
            onClick={() => handleTabChange('vip')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
              activeTab === 'vip' ? 'bg-orange-600 text-white' : 'bg-[#0A0A0A] text-gray-400 hover:bg-[#2A2A2A]'
            }`}
          >
            VIP ({stats.vip})
          </button>
        </div>
      </div>

      {/* Customer Grid */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCustomers.map((customer) => (
            <div
              key={customer.id}
              onClick={() => handleCustomerClick(customer)}
              className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] p-6 hover:border-orange-500/30 hover:bg-gradient-to-br hover:from-orange-600/5 hover:to-orange-700/5 transition cursor-pointer group"
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-orange-600 to-orange-700 rounded-xl flex items-center justify-center text-white font-semibold text-lg">
                    {customer.first_name.charAt(0)}{customer.last_name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-semibold text-white group-hover:text-orange-400 transition">
                      {customer.first_name} {customer.last_name}
                    </h3>
                    <p className="text-sm text-gray-400">{customer.company}</p>
                  </div>
                </div>
                <span className={`px-2 py-1 rounded-lg text-sm font-semibold ${
                  customer.status === 'vip' ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20' :
                  customer.status === 'active' ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
                  customer.status === 'lead' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                  'bg-gray-500/10 text-gray-400 border border-gray-500/20'
                }`}>
                  {customer.status.toUpperCase()}
                </span>
              </div>

              {/* Contact Info */}
              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <Mail className="w-4 h-4" />
                  <span className="truncate">{customer.email}</span>
                </div>
                {customer.phone && (
                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <Phone className="w-4 h-4" />
                    <span>{customer.phone}</span>
                  </div>
                )}
              </div>

              {/* Tags */}
              {customer.tags && customer.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {customer.tags.slice(0, 3).map((tag) => (
                    <span key={tag} className="px-2 py-1 text-sm font-semibold rounded-full bg-[#0A0A0A] text-gray-400 border border-[#2A2A2A]">
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Stats */}
              <div className="grid grid-cols-3 gap-2 pt-4 border-t border-[#2A2A2A]">
                <div className="text-center">
                  <p className="text-lg font-bold text-orange-400">${(customer.total_spent / 1000).toFixed(1)}k</p>
                  <p className="text-sm text-gray-500">Spent</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-white">{customer.project_count}</p>
                  <p className="text-sm text-gray-500">Projects</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-white">{customer.rating || 0}★</p>
                  <p className="text-sm text-gray-500">Rating</p>
                </div>
              </div>

              {/* Actions */}
              <div className="grid grid-cols-4 gap-2 mt-4">
                <button 
                  onClick={(e) => handleEditClick(customer, e)}
                  className="flex items-center justify-center gap-1 px-2 py-2 bg-blue-600/10 hover:bg-blue-600/20 rounded-lg text-blue-400 text-sm font-semibold transition border border-blue-500/20"
                >
                  <Edit2 className="w-3 h-3" />
                  Edit
                </button>
                <button 
                  onClick={(e) => {e.stopPropagation();}}
                  className="flex items-center justify-center gap-1 px-2 py-2 bg-orange-600/10 hover:bg-orange-600/20 rounded-lg text-orange-400 text-sm font-semibold transition border border-orange-500/20"
                >
                  <MessageSquare className="w-3 h-3" />
                  Message
                </button>
                <button 
                  onClick={(e) => {e.stopPropagation();}}
                  className="flex items-center justify-center gap-1 px-2 py-2 bg-[#0A0A0A] hover:bg-[#2A2A2A] rounded-lg text-gray-400 text-sm font-semibold transition border border-[#2A2A2A]"
                >
                  <FileText className="w-3 h-3" />
                  Quote
                </button>
                <button 
                  onClick={(e) => handleDeleteClick(customer, e)}
                  className="flex items-center justify-center gap-1 px-2 py-2 bg-red-600/10 hover:bg-red-600/20 rounded-lg text-red-400 text-sm font-semibold transition border border-red-500/20"
                >
                  <Trash2 className="w-3 h-3" />
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* List View */}
      {viewMode === 'list' && (
        <DataTable
          columns={[
            {
              key: 'customer',
              header: 'Customer',
              sortable: true,
              sortFn: (a, b) => `${a.last_name} ${a.first_name}`.localeCompare(`${b.last_name} ${b.first_name}`),
              render: (customer: Customer) => (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-orange-600 to-orange-700 rounded-lg flex items-center justify-center text-white font-semibold">
                    {customer.first_name.charAt(0)}{customer.last_name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-semibold text-white">{customer.first_name} {customer.last_name}</p>
                    <p className="text-sm text-gray-400">{customer.company}</p>
                  </div>
                </div>
              )
            },
            {
              key: 'contact',
              header: 'Contact',
              sortable: true,
              sortFn: (a, b) => a.email.localeCompare(b.email),
              render: (customer: Customer) => (
                <div>
                  <p className="text-sm text-gray-300">{customer.email}</p>
                  <p className="text-sm text-gray-400">{customer.phone}</p>
                </div>
              )
            },
            {
              key: 'status',
              header: 'Status',
              sortable: true,
              sortFn: (a, b) => {
                const priority = { vip: 1, active: 2, lead: 3, inactive: 4 };
                return (priority[a.status] || 5) - (priority[b.status] || 5);
              },
              render: (customer: Customer) => (
                <span className={`px-3 py-1 rounded-lg text-sm font-semibold ${
                  customer.status === 'vip' ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20' :
                  customer.status === 'active' ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
                  customer.status === 'lead' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                  'bg-gray-500/10 text-gray-400 border border-gray-500/20'
                }`}>
                  {customer.status.toUpperCase()}
                </span>
              )
            },
            {
              key: 'totalSpent',
              header: 'Spent',
              sortable: true,
              sortFn: (a, b) => a.total_spent - b.total_spent,
              render: (customer: Customer) => (
                <p className="font-semibold text-orange-400">${customer.total_spent.toLocaleString()}</p>
              ),
              align: 'right'
            },
            {
              key: 'projectCount',
              header: 'Projects',
              sortable: true,
              sortFn: (a, b) => a.project_count - b.project_count,
              render: (customer: Customer) => (
                <p className="font-semibold text-white">{customer.project_count}</p>
              ),
              align: 'center'
            },
            {
              key: 'actions',
              header: 'Actions',
              render: (customer: Customer) => (
                <div className="flex items-center gap-2">
                  <button 
                    onClick={(e) => {e.stopPropagation(); handleEditClick(customer, e);}}
                    className="p-2 hover:bg-blue-600/10 rounded-lg transition border border-transparent hover:border-blue-500/20"
                    title="Edit customer"
                  >
                    <Edit2 className="w-4 h-4 text-blue-400" />
                  </button>
                  <button 
                    onClick={(e) => {e.stopPropagation();}}
                    className="p-2 hover:bg-orange-600/10 rounded-lg transition border border-transparent hover:border-orange-500/20"
                    title="Send message"
                  >
                    <MessageSquare className="w-4 h-4 text-orange-400" />
                  </button>
                  <button 
                    onClick={(e) => {e.stopPropagation(); handleDeleteClick(customer, e);}}
                    className="p-2 hover:bg-red-600/10 rounded-lg transition border border-transparent hover:border-red-500/20"
                    title="Delete customer"
                  >
                    <Trash2 className="w-4 h-4 text-red-400" />
                  </button>
                </div>
              ),
              align: 'right'
            }
          ] as DataTableColumn<Customer>[]}
          data={filteredCustomers}
          emptyMessage="No customers found"
          rowHoverEffect={true}
          defaultSort={{ key: 'customer', direction: 'asc' }}
          pagination={true}
          pageSize={10}
          pageSizeOptions={[5, 10, 25, 50]}
        />
      )}

      {/* Create Customer Modal */}
      <CreateCustomerModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={handleCreateSuccess}
      />

      {/* Edit Customer Modal */}
      {customerToEdit && (
        <EditCustomerModal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setCustomerToEdit(null);
          }}
          onSuccess={handleEditSuccess}
          customer={customerToEdit}
        />
      )}

      {/* Delete Confirmation Modal */}
      {customerToDelete && (
        <DeleteConfirmationModal
          isOpen={showDeleteModal}
          onClose={() => {
            setShowDeleteModal(false);
            setCustomerToDelete(null);
          }}
          onConfirm={handleDeleteConfirm}
          title="Delete Customer"
          message="Are you sure you want to delete this customer? This will also delete all associated projects and data."
          itemName={`${customerToDelete.first_name} ${customerToDelete.last_name} (${customerToDelete.customer_number})`}
          loading={deleteLoading}
        />
      )}
    </div>
  );
}