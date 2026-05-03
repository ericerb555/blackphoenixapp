/**
 * Customer Management Hub - Consolidated Customer Management
 * 
 * Central hub for customer relationships, directory, registration, and portal access
 * Tabs: Directory | Registration | Customer Detail | Portal Preview
 */

import { useState, useEffect } from 'react';
import { 
  ArrowLeft, Users, UserCheck, Eye, Globe, Plus, Search, 
  Filter, Mail, Phone, MapPin, Star, Calendar, DollarSign,
  FileText, MessageSquare, Edit2, Trash2, Download, Settings
} from 'lucide-react';
import { PageHeader } from '../components/PageHeader';

type TabType = 'directory' | 'registration' | 'detail' | 'portal';

export default function CustomerManagementHub() {
  const [activeTab, setActiveTab] = useState<TabType>('directory');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<string | null>(null);

  // Read tab from URL on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab') as TabType;
    if (tab) {
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

  const tabs = [
    { id: 'directory', label: 'Directory', icon: Users },
    { id: 'registration', label: 'Registration', icon: UserCheck },
    { id: 'detail', label: 'Customer Detail', icon: Eye },
    { id: 'portal', label: 'Portal Preview', icon: Globe }
  ];

  const mockCustomers = [
    { 
      id: 'C-001', 
      name: 'John Smith', 
      email: 'john.smith@email.com', 
      phone: '(555) 123-4567',
      address: '123 Main St, Anytown, ST 12345',
      status: 'active',
      totalSpent: 25000,
      jobs: 8,
      rating: 4.9,
      joinDate: '2025-06-15'
    },
    { 
      id: 'C-002', 
      name: 'Sarah Johnson', 
      email: 'sarah.j@email.com', 
      phone: '(555) 234-5678',
      address: '456 Oak Ave, Springfield, ST 67890',
      status: 'active',
      totalSpent: 18500,
      jobs: 5,
      rating: 5.0,
      joinDate: '2025-08-22'
    },
    { 
      id: 'C-003', 
      name: 'Acme Corporation', 
      email: 'contact@acme.com', 
      phone: '(555) 345-6789',
      address: '789 Business Blvd, Commerce City, ST 45678',
      status: 'active',
      totalSpent: 125000,
      jobs: 23,
      rating: 4.8,
      joinDate: '2024-11-10'
    }
  ];

  const filteredCustomers = mockCustomers.filter(customer => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      customer.name.toLowerCase().includes(query) ||
      customer.email.toLowerCase().includes(query) ||
      customer.phone.includes(query)
    );
  });

  const customerDetail = selectedCustomer 
    ? mockCustomers.find(c => c.id === selectedCustomer) || mockCustomers[0]
    : mockCustomers[0];

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      <PageHeader 
        title="Customer Management Hub"
        description="Comprehensive customer relationship management and portal access"
        onBack={() => window.location.href = '/unified-dashboard'}
      />

      <div className="max-w-[1800px] mx-auto p-6 space-y-6">
        {/* Tab Navigation */}
        <div className="bg-[#1A1A1A] border border-zinc-800 rounded-lg p-2 flex flex-wrap gap-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id as TabType)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-semibold transition-all ${
                  isActive
                    ? 'bg-orange-600 text-white shadow-lg shadow-orange-600/30'
                    : 'bg-[#0A0A0A] text-gray-400 hover:text-white hover:bg-[#2A2A2A]'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        {activeTab === 'directory' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search customers..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-[#1A1A1A] border border-zinc-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-orange-500/50"
                />
              </div>
              <button className="px-4 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-semibold flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Add Customer
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredCustomers.map((customer) => (
                <div 
                  key={customer.id} 
                  className="bg-[#1A1A1A] border border-zinc-800 rounded-lg p-6 hover:border-orange-500/30 transition-all cursor-pointer"
                  onClick={() => {
                    setSelectedCustomer(customer.id);
                    handleTabChange('detail');
                  }}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-bold mb-1">{customer.name}</h3>
                      <div className="flex items-center gap-1 mb-2">
                        <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                        <span className="text-sm text-yellow-400">{customer.rating}</span>
                      </div>
                      <span className="px-2 py-1 bg-green-600/20 text-green-400 text-xs font-semibold rounded">
                        {customer.status}
                      </span>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-zinc-400 mb-1">Total Spent</p>
                      <p className="text-lg font-bold text-green-400">${customer.totalSpent.toLocaleString()}</p>
                    </div>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-zinc-400">
                      <Mail className="w-4 h-4" />
                      <span>{customer.email}</span>
                    </div>
                    <div className="flex items-center gap-2 text-zinc-400">
                      <Phone className="w-4 h-4" />
                      <span>{customer.phone}</span>
                    </div>
                    <div className="flex items-center gap-2 text-zinc-400">
                      <MapPin className="w-4 h-4" />
                      <span className="line-clamp-1">{customer.address}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-zinc-800">
                    <span className="text-sm text-zinc-400">{customer.jobs} jobs</span>
                    <span className="text-sm text-zinc-400">Since {customer.joinDate}</span>
                  </div>
                </div>
              ))}
            </div>

            {filteredCustomers.length === 0 && (
              <div className="text-center py-12 bg-[#1A1A1A] border border-zinc-800 rounded-lg">
                <Users className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
                <p className="text-zinc-400">No customers found matching "{searchQuery}"</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'registration' && (
          <div className="bg-[#1A1A1A] border border-zinc-800 rounded-lg p-8">
            <div className="max-w-2xl mx-auto">
              <div className="text-center mb-8">
                <UserCheck className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <h3 className="text-2xl font-bold mb-2">Customer Registration</h3>
                <p className="text-zinc-400">Register new customers and manage onboarding</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-zinc-300 mb-2">Full Name</label>
                  <input 
                    type="text" 
                    placeholder="Enter customer name"
                    className="w-full px-4 py-2.5 bg-[#0A0A0A] border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500/50"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-zinc-300 mb-2">Email</label>
                    <input 
                      type="email" 
                      placeholder="email@example.com"
                      className="w-full px-4 py-2.5 bg-[#0A0A0A] border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500/50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-zinc-300 mb-2">Phone</label>
                    <input 
                      type="tel" 
                      placeholder="(555) 123-4567"
                      className="w-full px-4 py-2.5 bg-[#0A0A0A] border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500/50"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-zinc-300 mb-2">Address</label>
                  <input 
                    type="text" 
                    placeholder="Street address"
                    className="w-full px-4 py-2.5 bg-[#0A0A0A] border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500/50"
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-zinc-300 mb-2">City</label>
                    <input 
                      type="text" 
                      placeholder="City"
                      className="w-full px-4 py-2.5 bg-[#0A0A0A] border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500/50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-zinc-300 mb-2">State</label>
                    <input 
                      type="text" 
                      placeholder="ST"
                      className="w-full px-4 py-2.5 bg-[#0A0A0A] border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500/50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-zinc-300 mb-2">ZIP</label>
                    <input 
                      type="text" 
                      placeholder="12345"
                      className="w-full px-4 py-2.5 bg-[#0A0A0A] border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500/50"
                    />
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <button className="flex-1 px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-semibold">
                    Register Customer
                  </button>
                  <button className="px-6 py-3 bg-[#2A2A2A] hover:bg-[#3A3A3A] text-white rounded-lg font-semibold">
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'detail' && (
          <div className="space-y-4">
            <div className="bg-[#1A1A1A] border border-zinc-800 rounded-lg p-6">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold mb-2">{customerDetail.name}</h2>
                  <div className="flex items-center gap-3">
                    <span className="px-3 py-1 bg-green-600/20 text-green-400 text-sm font-semibold rounded">
                      {customerDetail.status}
                    </span>
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                      <span className="text-sm text-yellow-400 font-semibold">{customerDetail.rating} Rating</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button className="px-4 py-2 bg-[#2A2A2A] hover:bg-[#3A3A3A] text-white rounded-lg font-semibold flex items-center gap-2">
                    <Edit2 className="w-4 h-4" />
                    Edit
                  </button>
                  <button className="px-4 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-lg font-semibold flex items-center gap-2">
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-[#0A0A0A] border border-zinc-800 rounded-lg p-4">
                  <p className="text-sm text-zinc-400 mb-1">Total Spent</p>
                  <p className="text-2xl font-bold text-green-400">${customerDetail.totalSpent.toLocaleString()}</p>
                </div>
                <div className="bg-[#0A0A0A] border border-zinc-800 rounded-lg p-4">
                  <p className="text-sm text-zinc-400 mb-1">Total Jobs</p>
                  <p className="text-2xl font-bold text-blue-400">{customerDetail.jobs}</p>
                </div>
                <div className="bg-[#0A0A0A] border border-zinc-800 rounded-lg p-4">
                  <p className="text-sm text-zinc-400 mb-1">Avg Job Value</p>
                  <p className="text-2xl font-bold text-purple-400">${Math.round(customerDetail.totalSpent / customerDetail.jobs).toLocaleString()}</p>
                </div>
                <div className="bg-[#0A0A0A] border border-zinc-800 rounded-lg p-4">
                  <p className="text-sm text-zinc-400 mb-1">Customer Since</p>
                  <p className="text-lg font-bold text-white">{customerDetail.joinDate}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-bold mb-3">Contact Information</h3>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <Mail className="w-5 h-5 text-zinc-400" />
                      <span>{customerDetail.email}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Phone className="w-5 h-5 text-zinc-400" />
                      <span>{customerDetail.phone}</span>
                    </div>
                    <div className="flex items-start gap-3">
                      <MapPin className="w-5 h-5 text-zinc-400 flex-shrink-0 mt-0.5" />
                      <span>{customerDetail.address}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-bold mb-3">Quick Actions</h3>
                  <div className="space-y-2">
                    <button className="w-full px-4 py-2.5 bg-orange-600/20 hover:bg-orange-600/30 text-orange-400 rounded-lg font-semibold flex items-center justify-center gap-2">
                      <MessageSquare className="w-4 h-4" />
                      Send Message
                    </button>
                    <button className="w-full px-4 py-2.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 rounded-lg font-semibold flex items-center justify-center gap-2">
                      <FileText className="w-4 h-4" />
                      Create Invoice
                    </button>
                    <button className="w-full px-4 py-2.5 bg-green-600/20 hover:bg-green-600/30 text-green-400 rounded-lg font-semibold flex items-center justify-center gap-2">
                      <Plus className="w-4 h-4" />
                      New Job
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'portal' && (
          <div className="bg-[#1A1A1A] border border-zinc-800 rounded-lg p-8 text-center">
            <Globe className="w-16 h-16 text-purple-500 mx-auto mb-4" />
            <h3 className="text-xl font-bold mb-2">Customer Portal Preview</h3>
            <p className="text-zinc-400 mb-6">View the customer-facing dashboard and portal experience</p>
            <div className="flex gap-4 justify-center">
              <button 
                onClick={() => window.location.href = '/customer-dashboard'}
                className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold"
              >
                View Customer Dashboard
              </button>
              <button 
                onClick={() => window.location.href = '/customer-app'}
                className="px-6 py-3 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg font-semibold"
              >
                View Customer App
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}