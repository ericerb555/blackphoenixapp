/**
 * Vendors Admin Hub - Consolidated Admin Management
 * 
 * Combines 3 vendor admin pages into one:
 * - Tab 1: Vendor Relationships (approve/reject/manage vendors)
 * - Tab 2: Advertising Management (vendor ads, giveaways, product catalog)
 * - Tab 3: API Integrations (Grainger, Home Depot, Lowe's, etc.)
 */

import { useState, useEffect } from 'react';
import {
  Building2, CheckCircle, XCircle, Clock, Mail, Phone, Globe, MapPin,
  Star, TrendingUp, DollarSign, Package, Eye, Edit2, Trash2, Crown,
  Medal, Award, Search, Filter, Users, AlertCircle, Shield, ArrowLeft,
  Settings, ExternalLink, RefreshCw, Loader2, ShoppingCart, Megaphone,
  Gift, BarChart3, Plus, Upload, Download, Video, Image, FileText,
  Tag, Grid, List, Activity, Share2, Sparkles, X, Zap, Check,
  Calendar, Box, Percent, Target, MessageCircle, Bell
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { BackToDashboard } from '../components/BackToDashboard';
import { vendorPortalService, VendorProfile } from '../lib/services/vendorPortalService';
import { vendorPriorityService } from '../lib/services/vendorPriorityService';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { ChartContainer } from '../components/ChartContainer';
import { TextInput } from '../components/ui/input/TextInput';
import { TextArea } from '../components/ui/input/TextArea';
import LogoMarquee from '../components/LogoMarquee';
import AIProductCatalogAssistant from '../components/AIProductCatalogAssistant';
import { AdvancedCohortManagement } from '../components/AdvancedCohortManagement';
import ProductAdCreator from '../components/ProductAdCreator';
import { ProductAdCreatorErrorBoundary } from '../components/ProductAdCreatorErrorBoundary';
import AdPerformanceDashboard from '../components/vendor/AdPerformanceDashboard';

// Types for API Management
interface Vendor {
  id: string;
  name: string;
  displayName: string;
  enabled: boolean;
  configured: boolean;
  color: string;
  icon: string;
  documentation?: string;
  envKeyName: string;
  authType: string;
  rateLimit?: {
    requestsPerMinute: number;
    requestsPerDay?: number;
  };
}

interface VendorStatus {
  total: number;
  configured: number;
  unconfigured: number;
  vendors: Array<{
    id: string;
    displayName: string;
    configured: boolean;
    envKeyName: string;
  }>;
}

const API_BASE = `https://${projectId}.supabase.co/functions/v1/make-server-57095a78`;

type TabId = 'relationships' | 'advertising' | 'api-integrations';

export default function VendorsAdminHub() {
  const [activeTab, setActiveTab] = useState<TabId>('relationships');

  const tabs = [
    { id: 'relationships' as TabId, label: 'Vendor Relationships', icon: Building2, description: 'Approve and manage vendor connections' },
    { id: 'advertising' as TabId, label: 'Advertising Management', icon: Megaphone, description: 'Manage vendor ads, giveaways, and product catalog' },
    { id: 'api-integrations' as TabId, label: 'API Integrations', icon: Settings, description: 'Configure vendor API connections' },
  ];

  return (
    <div className="min-h-screen bg-[#0A0A0A] p-6">
      <div className="max-w-[1600px] mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-4 mb-2">
              <BackToDashboard />
              <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center">
                  <Building2 className="w-6 h-6 text-white" />
                </div>
                Vendors Admin Hub
              </h1>
            </div>
            <p className="text-gray-400 ml-14">
              Comprehensive vendor management, advertising, and API configuration
            </p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-2">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`p-4 rounded-lg transition-all ${
                    isActive
                      ? 'bg-gradient-to-r from-orange-600 to-orange-700 text-white shadow-lg shadow-orange-500/30'
                      : 'bg-[#0A0A0A] text-gray-400 hover:text-white hover:bg-[#2A2A2A]'
                  }`}
                >
                  <div className="flex items-center gap-3 mb-1">
                    <Icon className="w-5 h-5" />
                    <span className="font-semibold">{tab.label}</span>
                  </div>
                  <p className={`text-sm ${isActive ? 'text-orange-100' : 'text-gray-500'}`}>
                    {tab.description}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab Content */}
        <div className="min-h-[600px]">
          {activeTab === 'relationships' && <VendorRelationshipsTab />}
          {activeTab === 'advertising' && <AdvertisingManagementTab />}
          {activeTab === 'api-integrations' && <APIIntegrationsTab />}
        </div>
      </div>
    </div>
  );
}

// ============================================
// TAB 1: VENDOR RELATIONSHIPS
// ============================================

function VendorRelationshipsTab() {
  const [vendors, setVendors] = useState<VendorProfile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'active' | 'suspended'>('all');
  const [selectedVendor, setSelectedVendor] = useState<VendorProfile | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  useEffect(() => {
    loadVendors();
  }, []);

  const loadVendors = () => {
    const allVendors = vendorPortalService.getAllVendors();
    setVendors(allVendors);
  };

  const handleApprove = (id: string) => {
    vendorPortalService.updateStatus(id, 'active');
    toast.success('Vendor approved successfully');
    loadVendors();
  };

  const handleReject = (id: string) => {
    if (!confirm('Are you sure you want to reject this vendor application?')) return;
    vendorPortalService.deleteVendor(id);
    toast.success('Vendor application rejected');
    loadVendors();
  };

  const handleSuspend = (id: string) => {
    if (!confirm('Are you sure you want to suspend this vendor?')) return;
    vendorPortalService.updateStatus(id, 'suspended');
    toast.success('Vendor suspended');
    loadVendors();
  };

  const handleReactivate = (id: string) => {
    vendorPortalService.updateStatus(id, 'active');
    toast.success('Vendor reactivated');
    loadVendors();
  };

  const filteredVendors = vendors.filter(v => {
    const matchesSearch = v.companyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         v.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || v.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = [
    {
      label: 'Total Vendors',
      value: vendors.length,
      icon: Building2,
      color: 'blue'
    },
    {
      label: 'Active Vendors',
      value: vendors.filter(v => v.status === 'active').length,
      icon: CheckCircle,
      color: 'green'
    },
    {
      label: 'Pending Approval',
      value: vendors.filter(v => v.status === 'pending').length,
      icon: Clock,
      color: 'yellow'
    },
    {
      label: 'Priority Vendors',
      value: vendors.filter(v => v.subscriptionTier && v.subscriptionTier !== 'none').length,
      icon: Star,
      color: 'orange'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          const colorMap: Record<string, string> = {
            blue: 'bg-blue-500/20 border-blue-500/30 text-blue-400',
            green: 'bg-green-500/20 border-green-500/30 text-green-400',
            yellow: 'bg-yellow-500/20 border-yellow-500/30 text-yellow-400',
            orange: 'bg-orange-500/20 border-orange-500/30 text-orange-400',
          };
          return (
            <div key={i} className="bg-[#1A1A1A] rounded-xl p-6 border border-[#2A2A2A] hover:border-blue-500/30 transition">
              <div className="flex items-center justify-between mb-4">
                <div className={`w-12 h-12 rounded-xl border flex items-center justify-center ${colorMap[stat.color]}`}>
                  <Icon className="w-6 h-6" />
                </div>
              </div>
              <p className="text-2xl font-bold text-white mb-1">{stat.value}</p>
              <p className="text-sm text-gray-400">{stat.label}</p>
            </div>
          );
        })}
      </div>

      {/* Filters */}
      <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-6">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
            <input
              type="text"
              placeholder="Search vendors by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="pending">Pending</option>
            <option value="suspended">Suspended</option>
          </select>
        </div>
      </div>

      {/* Pending Approvals Alert */}
      {vendors.filter(v => v.status === 'pending').length > 0 && (
        <div className="bg-gradient-to-r from-yellow-500/10 to-yellow-600/10 border border-yellow-500/30 rounded-xl p-6">
          <div className="flex items-start gap-4">
            <AlertCircle className="w-6 h-6 text-yellow-400 flex-shrink-0 mt-1" />
            <div>
              <h3 className="text-lg font-semibold text-white mb-1">
                {vendors.filter(v => v.status === 'pending').length} Pending Approval{vendors.filter(v => v.status === 'pending').length !== 1 && 's'}
              </h3>
              <p className="text-gray-300">Review and approve vendor applications to allow them to connect</p>
            </div>
          </div>
        </div>
      )}

      {/* Vendors Table */}
      <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] overflow-hidden">
        <div className="p-6 border-b border-[#2A2A2A]">
          <h2 className="text-lg font-semibold text-white">
            Vendor Connections
            <span className="ml-3 text-sm text-gray-400">({filteredVendors.length} vendors)</span>
          </h2>
        </div>

        {filteredVendors.length === 0 ? (
          <div className="p-12 text-center">
            <Building2 className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400">No vendors found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[#0A0A0A]">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-400 uppercase tracking-wider">Vendor</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-400 uppercase tracking-wider">Contact</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-400 uppercase tracking-wider">Categories</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-400 uppercase tracking-wider">Priority</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-400 uppercase tracking-wider">Connected</th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-gray-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2A2A2A]">
                {filteredVendors.map(vendor => (
                  <tr key={vendor.id} className="hover:bg-[#0A0A0A] transition">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-white font-bold">
                          {vendor.companyName.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-white">{vendor.companyName}</p>
                          <p className="text-sm text-gray-500">ID: {vendor.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1 text-sm">
                        <div className="flex items-center gap-2 text-gray-400">
                          <Mail className="w-3 h-3" />
                          <span>{vendor.email}</span>
                        </div>
                        {vendor.phone && (
                          <div className="flex items-center gap-2 text-gray-400">
                            <Phone className="w-3 h-3" />
                            <span>{vendor.phone}</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {vendor.categories?.slice(0, 2).map(cat => (
                          <span key={cat} className="px-2 py-1 bg-blue-500/20 text-blue-400 text-sm rounded">
                            {cat}
                          </span>
                        ))}
                        {vendor.categories && vendor.categories.length > 2 && (
                          <span className="px-2 py-1 bg-[#2A2A2A] text-gray-400 text-sm rounded">
                            +{vendor.categories.length - 2}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {vendor.subscriptionTier && vendor.subscriptionTier !== 'none' ? (
                        <div className="flex items-center gap-2">
                          <Crown className="w-4 h-4 text-orange-400" />
                          <span className="text-sm font-semibold text-orange-400 capitalize">
                            {vendor.subscriptionTier}
                          </span>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-500">Standard</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {vendor.status === 'active' && (
                        <span className="px-3 py-1 bg-green-500/20 text-green-400 text-sm font-semibold rounded-full flex items-center gap-1 w-fit">
                          <CheckCircle className="w-3 h-3" />
                          Active
                        </span>
                      )}
                      {vendor.status === 'pending' && (
                        <span className="px-3 py-1 bg-yellow-500/20 text-yellow-400 text-sm font-semibold rounded-full flex items-center gap-1 w-fit">
                          <Clock className="w-3 h-3" />
                          Pending
                        </span>
                      )}
                      {vendor.status === 'suspended' && (
                        <span className="px-3 py-1 bg-red-500/20 text-red-400 text-sm font-semibold rounded-full flex items-center gap-1 w-fit">
                          <XCircle className="w-3 h-3" />
                          Suspended
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-400">
                      {new Date(vendor.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        {vendor.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleApprove(vendor.id)}
                              className="p-2 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-lg transition"
                              title="Approve"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleReject(vendor.id)}
                              className="p-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition"
                              title="Reject"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        {vendor.status === 'active' && (
                          <button
                            onClick={() => handleSuspend(vendor.id)}
                            className="p-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition"
                            title="Suspend"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        )}
                        {vendor.status === 'suspended' && (
                          <button
                            onClick={() => handleReactivate(vendor.id)}
                            className="p-2 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-lg transition"
                            title="Reactivate"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setSelectedVendor(vendor);
                            setShowDetailModal(true);
                          }}
                          className="p-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg transition"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Vendor Detail Modal */}
      {showDetailModal && selectedVendor && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 border-b border-blue-500/30 p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-white text-2xl font-bold">
                    {selectedVendor.companyName.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white">{selectedVendor.companyName}</h2>
                    <p className="text-gray-400">{selectedVendor.email}</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="p-2 hover:bg-[#2A2A2A] rounded-lg transition"
                >
                  <X className="w-6 h-6 text-gray-400" />
                </button>
              </div>
            </div>
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-gray-400 text-sm mb-1">Status</p>
                  <p className="text-white font-semibold capitalize">{selectedVendor.status}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm mb-1">Priority Tier</p>
                  <p className="text-white font-semibold capitalize">{selectedVendor.subscriptionTier || 'Standard'}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm mb-1">Phone</p>
                  <p className="text-white font-semibold">{selectedVendor.phone || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm mb-1">Joined</p>
                  <p className="text-white font-semibold">{new Date(selectedVendor.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
              {selectedVendor.categories && selectedVendor.categories.length > 0 && (
                <div>
                  <p className="text-gray-400 text-sm mb-2">Categories</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedVendor.categories.map(cat => (
                      <span key={cat} className="px-3 py-1 bg-blue-500/20 text-blue-400 text-sm rounded-lg">
                        {cat}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================
// TAB 2: ADVERTISING MANAGEMENT
// ============================================

function AdvertisingManagementTab() {
  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#1A1A1A] rounded-xl p-6 border border-[#2A2A2A]">
          <Gift className="w-8 h-8 text-purple-400 mb-3" />
          <p className="text-gray-400 text-sm mb-1">Active Giveaways</p>
          <p className="text-2xl font-bold text-white">3</p>
        </div>
        <div className="bg-[#1A1A1A] rounded-xl p-6 border border-[#2A2A2A]">
          <Package className="w-8 h-8 text-blue-400 mb-3" />
          <p className="text-gray-400 text-sm mb-1">Total Products</p>
          <p className="text-2xl font-bold text-white">487</p>
        </div>
        <div className="bg-[#1A1A1A] rounded-xl p-6 border border-[#2A2A2A]">
          <BarChart3 className="w-8 h-8 text-green-400 mb-3" />
          <p className="text-gray-400 text-sm mb-1">Ad Campaigns</p>
          <p className="text-2xl font-bold text-white">12</p>
        </div>
        <div className="bg-[#1A1A1A] rounded-xl p-6 border border-[#2A2A2A]">
          <TrendingUp className="w-8 h-8 text-orange-400 mb-3" />
          <p className="text-gray-400 text-sm mb-1">Monthly Reach</p>
          <p className="text-2xl font-bold text-white">125K</p>
        </div>
      </div>

      {/* Advanced Cohort Management Component */}
      <AdvancedCohortManagement />
    </div>
  );
}

// ============================================
// TAB 3: API INTEGRATIONS
// ============================================

function APIIntegrationsTab() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [status, setStatus] = useState<VendorStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState<Record<string, boolean>>({});
  const [testResults, setTestResults] = useState<Record<string, any>>({});

  useEffect(() => {
    loadVendors();
    loadStatus();
  }, []);

  const loadVendors = async () => {
    try {
      const response = await fetch(`${API_BASE}/vendors`, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        const vendorList = data.vendors || [];
        
        // If no vendors exist, initialize with sample data
        if (vendorList.length === 0) {
          await initializeVendors();
          return;
        }
        
        setVendors(vendorList);
      }
    } catch (error) {
      console.error('Error loading vendors:', error);
      toast.error('Failed to load vendors');
    } finally {
      setLoading(false);
    }
  };

  const initializeVendors = async () => {
    try {
      const response = await fetch(`${API_BASE}/vendors/initialize`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setVendors(data.vendors || []);
        toast.success(`Initialized ${data.count} sample vendors`);
      }
    } catch (error) {
      console.error('Error initializing vendors:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStatus = async () => {
    try {
      const response = await fetch(`${API_BASE}/vendors/status`, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setStatus(data.status);
      }
    } catch (error) {
      console.error('Error loading vendor status:', error);
    }
  };

  const testVendor = async (vendorId: string) => {
    setTesting(prev => ({ ...prev, [vendorId]: true }));
    try {
      const response = await fetch(`${API_BASE}/vendors/${vendorId}/test`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      setTestResults(prev => ({ ...prev, [vendorId]: data }));
      
      if (data.success) {
        toast.success(`${vendorId} API test successful`);
      } else {
        toast.error(`${vendorId} API test failed: ${data.error}`);
      }
    } catch (error) {
      toast.error(`Failed to test ${vendorId} API`);
      setTestResults(prev => ({ ...prev, [vendorId]: { success: false, error: 'Network error' } }));
    } finally {
      setTesting(prev => ({ ...prev, [vendorId]: false }));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 text-orange-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Status Overview */}
      {status && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-[#1A1A1A] rounded-xl p-6 border border-[#2A2A2A]">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center">
                <Settings className="w-6 h-6 text-blue-400" />
              </div>
            </div>
            <p className="text-2xl font-bold text-white mb-1">{status.total}</p>
            <p className="text-sm text-gray-400">Total Integrations</p>
          </div>
          <div className="bg-[#1A1A1A] rounded-xl p-6 border border-[#2A2A2A]">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-green-500/20 border border-green-500/30 flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-400" />
              </div>
            </div>
            <p className="text-2xl font-bold text-white mb-1">{status.configured}</p>
            <p className="text-sm text-gray-400">Configured</p>
          </div>
          <div className="bg-[#1A1A1A] rounded-xl p-6 border border-[#2A2A2A]">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-yellow-500/20 border border-yellow-500/30 flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-yellow-400" />
              </div>
            </div>
            <p className="text-2xl font-bold text-white mb-1">{status.unconfigured}</p>
            <p className="text-sm text-gray-400">Not Configured</p>
          </div>
        </div>
      )}

      {/* Vendor API List */}
      <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] overflow-hidden">
        <div className="p-6 border-b border-[#2A2A2A]">
          <h2 className="text-lg font-semibold text-white">Vendor API Integrations</h2>
          <p className="text-sm text-gray-400 mt-1">Configure and test external vendor API connections</p>
        </div>
        <div className="divide-y divide-[#2A2A2A]">
          {vendors.map(vendor => {
            const result = testResults[vendor.id];
            const isTesting = testing[vendor.id];
            
            return (
              <div key={vendor.id} className="p-6 hover:bg-[#0A0A0A] transition">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 flex-1">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl`} style={{ backgroundColor: `${vendor.color}20`, border: `1px solid ${vendor.color}30` }}>
                      {vendor.icon}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="font-semibold text-white">{vendor.displayName}</h3>
                        {vendor.configured ? (
                          <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-sm font-semibold rounded-full flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" />
                            Configured
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-400 text-sm font-semibold rounded-full flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            Not Configured
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-400">
                        {vendor.authType} • {vendor.envKeyName}
                      </p>
                      {vendor.rateLimit && (
                        <p className="text-sm text-gray-500 mt-1">
                          Rate Limit: {vendor.rateLimit.requestsPerMinute}/min
                          {vendor.rateLimit.requestsPerDay && ` • ${vendor.rateLimit.requestsPerDay}/day`}
                        </p>
                      )}
                      {result && (
                        <div className={`mt-2 text-sm ${result.success ? 'text-green-400' : 'text-red-400'}`}>
                          {result.success ? (
                            <span className="flex items-center gap-1">
                              <CheckCircle className="w-3 h-3" />
                              Test successful
                            </span>
                          ) : (
                            <span className="flex items-center gap-1">
                              <XCircle className="w-3 h-3" />
                              {result.error}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {vendor.documentation && (
                      <a
                        href={vendor.documentation}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg transition"
                        title="View Documentation"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                    <button
                      onClick={() => testVendor(vendor.id)}
                      disabled={isTesting || !vendor.configured}
                      className="px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition flex items-center gap-2"
                    >
                      {isTesting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Testing...
                        </>
                      ) : (
                        <>
                          <Zap className="w-4 h-4" />
                          Test API
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Help Text */}
      <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-6">
        <div className="flex items-start gap-4">
          <Shield className="w-6 h-6 text-blue-400 flex-shrink-0 mt-1" />
          <div>
            <h3 className="text-lg font-semibold text-white mb-2">API Configuration</h3>
            <p className="text-gray-300 text-sm mb-3">
              To configure a vendor API integration, you need to add the appropriate API key as an environment variable in your Supabase project settings.
            </p>
            <p className="text-gray-400 text-sm">
              Example: For Grainger, add GRAINGER_API_KEY to your Supabase secrets. Then use the Test API button to verify the connection.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}