/**
 * Master Admin Dashboard - Platform Owner (GOD MODE)
 * 
 * Full access to:
 * - All territories across the platform
 * - All tenants (vendors, advertisers, subcontractors)
 * - Global revenue analytics
 * - System-wide settings
 * - Approve/suspend any account
 * - Set platform pricing
 */

import { useState, useEffect } from 'react';
import {
  Crown, TrendingUp, Users, DollarSign, MapPin, Building2, 
  Megaphone, Wrench, BarChart3, Settings, Shield, AlertCircle,
  CheckCircle, XCircle, Clock, Target, Zap, Activity, Eye,
  Edit, Trash2, Plus, Search, Filter, Download, RefreshCw,
  ArrowUpRight, ArrowDownRight, ChevronRight, Bell, Star,
  Lock, Unlock, Ban, Check, X, Mail, Phone, Calendar,
  Layers, Package, Briefcase, Award
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { useUser } from '../lib/user-context';
import { UserRole, hasPermission, getRoleDisplayName, getRoleColor } from '../lib/rbac';
import { PageHeader } from '../components/PageHeader';
import { projectId, publicAnonKey } from '../utils/supabase/info';

type DashboardView = 'overview' | 'territories' | 'tenants' | 'revenue' | 'cohorts' | 'system';

interface PlatformStats {
  totalTerritories: number;
  totalTenants: number;
  totalRevenue: number;
  monthlyRecurringRevenue: number;
  activeSubscriptions: number;
  trialAccounts: number;
  suspendedAccounts: number;
  totalTransactions: number;
}

interface TerritoryOverview {
  id: string;
  name: string;
  admin_name: string;
  admin_email: string;
  location: string;
  status: 'active' | 'trial' | 'suspended';
  vendors: number;
  advertisers: number;
  subcontractors: number;
  monthly_revenue: number;
  license_fee: number;
  created_at: string;
}

interface TenantOverview {
  id: string;
  name: string;
  type: 'vendor' | 'advertiser' | 'subcontractor';
  territory_name: string;
  cohort_name: string;
  status: 'active' | 'trial' | 'suspended' | 'cancelled';
  monthly_fee: number;
  total_revenue: number;
  join_date: string;
  trial_end_date?: string;
}

interface MasterAdminDashboardProps {
  onNavigate?: (page: string) => void;
}

export default function MasterAdminDashboard({ onNavigate }: MasterAdminDashboardProps) {
  const { user } = useUser();
  const [activeView, setActiveView] = useState<DashboardView>('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  // Modal states
  const [showNewTerritoryModal, setShowNewTerritoryModal] = useState(false);
  const [showSystemSettingsModal, setShowSystemSettingsModal] = useState(false);
  const [newTerritoryData, setNewTerritoryData] = useState({
    territoryName: '',
    adminName: '',
    adminEmail: '',
    adminPhone: '',
    city: '',
    state: '',
    zipCode: '',
    licenseFee: '15000',
    monthlyFee: '499',
    radiusMiles: '40',
  });

  // Platform-wide stats
  const [stats, setStats] = useState<PlatformStats>({
    totalTerritories: 12,
    totalTenants: 347,
    totalRevenue: 1245680,
    monthlyRecurringRevenue: 84790,
    activeSubscriptions: 312,
    trialAccounts: 35,
    suspendedAccounts: 8,
    totalTransactions: 5824,
  });

  // Mock data - territories
  const [territories, setTerritories] = useState<TerritoryOverview[]>([
    {
      id: 'TERR-001',
      name: 'New York Metro',
      admin_name: 'John Smith',
      admin_email: 'john@nymetro.com',
      location: 'New York, NY 10001',
      status: 'active',
      vendors: 45,
      advertisers: 12,
      subcontractors: 67,
      monthly_revenue: 18450,
      license_fee: 499,
      created_at: '2024-01-15',
    },
    {
      id: 'TERR-002',
      name: 'Los Angeles West',
      admin_name: 'Sarah Johnson',
      admin_email: 'sarah@lawest.com',
      location: 'Los Angeles, CA 90001',
      status: 'active',
      vendors: 38,
      advertisers: 8,
      subcontractors: 52,
      monthly_revenue: 15230,
      license_fee: 499,
      created_at: '2024-02-01',
    },
    {
      id: 'TERR-003',
      name: 'Chicago North',
      admin_name: 'Mike Davis',
      admin_email: 'mike@chinorth.com',
      location: 'Chicago, IL 60601',
      status: 'trial',
      vendors: 12,
      advertisers: 3,
      subcontractors: 18,
      monthly_revenue: 4850,
      license_fee: 0,
      created_at: '2024-03-15',
    },
  ]);

  // Mock data - tenants
  const [tenants, setTenants] = useState<TenantOverview[]>([
    {
      id: 'TENANT-001',
      name: 'Premium Plumbing Co',
      type: 'subcontractor',
      territory_name: 'New York Metro',
      cohort_name: 'Trade Contractor Elite',
      status: 'active',
      monthly_fee: 199,
      total_revenue: 45600,
      join_date: '2024-01-20',
    },
    {
      id: 'TENANT-002',
      name: 'Home Depot Partner',
      type: 'vendor',
      territory_name: 'New York Metro',
      cohort_name: 'Vendor Professional',
      status: 'active',
      monthly_fee: 149,
      total_revenue: 128450,
      join_date: '2024-01-18',
    },
    {
      id: 'TENANT-003',
      name: 'Metro Marketing Group',
      type: 'advertiser',
      territory_name: 'Los Angeles West',
      cohort_name: 'Advertising Premium',
      status: 'trial',
      monthly_fee: 999,
      total_revenue: 5200,
      join_date: '2024-03-10',
      trial_end_date: '2024-09-10',
    },
  ]);

  // Check if user has platform owner access
  if (!user || user.role !== UserRole.PLATFORM_OWNER) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center p-6">
        <div className="bg-[#1A1A1A] border border-red-500/50 rounded-xl p-8 max-w-md text-center">
          <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Shield className="w-8 h-8 text-red-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Access Denied</h2>
          <p className="text-zinc-400 mb-6">
            This dashboard is restricted to Platform Owners only.
          </p>
          <button
            onClick={() => onNavigate?.('unified-dashboard')}
            className="px-6 py-3 bg-[#ea580c] hover:bg-[#c2410c] text-white rounded-lg font-medium transition-colors"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'trial': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'suspended': return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'cancelled': return 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30';
      default: return 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30';
    }
  };

  const handleCreateTerritory = async () => {
    // Validation
    if (!newTerritoryData.territoryName || !newTerritoryData.adminName || 
        !newTerritoryData.adminEmail || !newTerritoryData.city || 
        !newTerritoryData.state || !newTerritoryData.zipCode) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      const newTerritory: TerritoryOverview = {
        id: `TERR-${String(territories.length + 1).padStart(3, '0')}`,
        name: newTerritoryData.territoryName,
        admin_name: newTerritoryData.adminName,
        admin_email: newTerritoryData.adminEmail,
        location: `${newTerritoryData.city}, ${newTerritoryData.state} ${newTerritoryData.zipCode}`,
        status: 'active',
        vendors: 0,
        advertisers: 0,
        subcontractors: 0,
        monthly_revenue: 0,
        license_fee: parseFloat(newTerritoryData.monthlyFee),
        created_at: new Date().toISOString().split('T')[0],
      };

      // Add to territories list
      setTerritories([...territories, newTerritory]);
      
      // Update stats
      setStats(prev => ({
        ...prev,
        totalTerritories: prev.totalTerritories + 1,
        monthlyRecurringRevenue: prev.monthlyRecurringRevenue + parseFloat(newTerritoryData.monthlyFee),
      }));

      // Reset form and close modal
      setNewTerritoryData({
        territoryName: '',
        adminName: '',
        adminEmail: '',
        adminPhone: '',
        city: '',
        state: '',
        zipCode: '',
        licenseFee: '15000',
        monthlyFee: '499',
        radiusMiles: '40',
      });
      setShowNewTerritoryModal(false);

      toast.success(`Territory "${newTerritory.name}" created successfully!`);
    } catch (error) {
      console.error('Error creating territory:', error);
      toast.error('Failed to create territory');
    }
  };

  const handleExportData = () => {
    // Generate CSV data
    const csvData = {
      territories: territories.map(t => ({
        ID: t.id,
        Name: t.name,
        Admin: t.admin_name,
        Email: t.admin_email,
        Location: t.location,
        Status: t.status,
        Vendors: t.vendors,
        Advertisers: t.advertisers,
        Subcontractors: t.subcontractors,
        'Monthly Revenue': t.monthly_revenue,
        'License Fee': t.license_fee,
        Created: t.created_at,
      })),
      tenants: tenants.map(t => ({
        ID: t.id,
        Name: t.name,
        Type: t.type,
        Territory: t.territory_name,
        Cohort: t.cohort_name,
        Status: t.status,
        'Monthly Fee': t.monthly_fee,
        'Total Revenue': t.total_revenue,
        'Join Date': t.join_date,
      })),
      summary: {
        'Total Territories': stats.totalTerritories,
        'Total Tenants': stats.totalTenants,
        'Total Revenue': stats.totalRevenue,
        'Monthly Recurring Revenue': stats.monthlyRecurringRevenue,
        'Active Subscriptions': stats.activeSubscriptions,
        'Export Date': new Date().toISOString(),
      }
    };

    // Create and download JSON file
    const blob = new Blob([JSON.stringify(csvData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `platform-export-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success('Data exported successfully!');
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      <PageHeader
        title="Master Admin Dashboard"
        subtitle="Platform Owner - God Mode Access"
        onBack={() => onNavigate?.('unified-dashboard')}
      />

      <div className="max-w-[1800px] mx-auto p-6 space-y-6">
        {/* God Mode Badge */}
        <div className="bg-gradient-to-r from-red-600/20 to-red-700/10 border border-red-500/30 rounded-xl p-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-red-600/20 rounded-xl flex items-center justify-center">
              <Crown className="w-8 h-8 text-red-400" />
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-white mb-1">Platform Owner Access</h2>
              <p className="text-zinc-300">
                You have full administrative control over all territories, tenants, and system settings.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => toast.success('All systems operational')}
                className="px-4 py-2 bg-green-500/20 text-green-400 border border-green-500/30 rounded-lg font-medium hover:bg-green-500/30 transition-colors flex items-center gap-2"
              >
                <Activity className="w-4 h-4" />
                System Healthy
              </button>
            </div>
          </div>
        </div>

        {/* Platform-Wide Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-[#1A1A1A] border border-zinc-800 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-purple-600/20 rounded-lg flex items-center justify-center">
                <MapPin className="w-6 h-6 text-purple-400" />
              </div>
              <div className="flex items-center gap-1 text-green-400 text-sm">
                <ArrowUpRight className="w-4 h-4" />
                <span>+2</span>
              </div>
            </div>
            <p className="text-sm text-zinc-400 mb-1">Total Territories</p>
            <p className="text-3xl font-bold text-white">{stats.totalTerritories}</p>
            <p className="text-sm text-zinc-500 mt-2">Active territory licenses</p>
          </div>

          <div className="bg-[#1A1A1A] border border-zinc-800 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-blue-600/20 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-400" />
              </div>
              <div className="flex items-center gap-1 text-green-400 text-sm">
                <ArrowUpRight className="w-4 h-4" />
                <span>+23</span>
              </div>
            </div>
            <p className="text-sm text-zinc-400 mb-1">Total Tenants</p>
            <p className="text-3xl font-bold text-white">{stats.totalTenants}</p>
            <p className="text-sm text-zinc-500 mt-2">Vendors, advertisers, subcontractors</p>
          </div>

          <div className="bg-[#1A1A1A] border border-zinc-800 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-green-600/20 rounded-lg flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-green-400" />
              </div>
              <div className="flex items-center gap-1 text-green-400 text-sm">
                <ArrowUpRight className="w-4 h-4" />
                <span>+18%</span>
              </div>
            </div>
            <p className="text-sm text-zinc-400 mb-1">Monthly Recurring Revenue</p>
            <p className="text-3xl font-bold text-white">{formatCurrency(stats.monthlyRecurringRevenue)}</p>
            <p className="text-sm text-zinc-500 mt-2">ARR: {formatCurrency(stats.monthlyRecurringRevenue * 12)}</p>
          </div>

          <div className="bg-[#1A1A1A] border border-zinc-800 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-orange-600/20 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-orange-400" />
              </div>
              <div className="flex items-center gap-1 text-green-400 text-sm">
                <ArrowUpRight className="w-4 h-4" />
                <span>+12%</span>
              </div>
            </div>
            <p className="text-sm text-zinc-400 mb-1">Total Revenue (All-Time)</p>
            <p className="text-3xl font-bold text-white">{formatCurrency(stats.totalRevenue)}</p>
            <p className="text-sm text-zinc-500 mt-2">{stats.totalTransactions.toLocaleString()} transactions</p>
          </div>
        </div>

        {/* View Tabs */}
        <div className="bg-[#1A1A1A] border border-zinc-800 rounded-xl p-2">
          <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
            {[
              { id: 'overview', label: 'Overview', icon: BarChart3 },
              { id: 'territories', label: 'Territories', icon: MapPin },
              { id: 'tenants', label: 'Tenants', icon: Users },
              { id: 'revenue', label: 'Revenue', icon: DollarSign },
              { id: 'cohorts', label: 'Cohorts', icon: Layers },
              { id: 'system', label: 'System', icon: Settings },
            ].map(tab => {
              const Icon = tab.icon;
              const isActive = activeView === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveView(tab.id as DashboardView)}
                  className={`p-3 rounded-lg transition-all font-medium flex items-center justify-center gap-2 ${
                    isActive
                      ? 'bg-[#ea580c] text-white shadow-lg'
                      : 'bg-[#0A0A0A] text-zinc-400 hover:text-white hover:bg-zinc-800'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden md:inline">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* OVERVIEW TAB */}
        {activeView === 'overview' && (
          <div className="space-y-6">
            {/* Quick Actions */}
            <div className="bg-[#1A1A1A] border border-zinc-800 rounded-xl p-6">
              <h3 className="text-lg font-bold text-white mb-4">Quick Actions</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <button
                  onClick={() => setShowNewTerritoryModal(true)}
                  className="p-4 bg-purple-600/10 border border-purple-500/30 rounded-lg hover:bg-purple-600/20 transition-colors text-left"
                >
                  <Plus className="w-5 h-5 text-purple-400 mb-2" />
                  <p className="text-sm font-medium text-white">New Territory</p>
                  <p className="text-sm text-zinc-400">License sale</p>
                </button>
                <button 
                  onClick={() => onNavigate?.('cohort-management')}
                  className="p-4 bg-blue-600/10 border border-blue-500/30 rounded-lg hover:bg-blue-600/20 transition-colors text-left"
                >
                  <Layers className="w-5 h-5 text-blue-400 mb-2" />
                  <p className="text-sm font-medium text-white">Manage Cohorts</p>
                  <p className="text-sm text-zinc-400">Pricing & plans</p>
                </button>
                <button
                  onClick={handleExportData}
                  className="p-4 bg-orange-600/10 border border-orange-500/30 rounded-lg hover:bg-orange-600/20 transition-colors text-left"
                >
                  <Download className="w-5 h-5 text-orange-400 mb-2" />
                  <p className="text-sm font-medium text-white">Export Data</p>
                  <p className="text-sm text-zinc-400">Reports & analytics</p>
                </button>
                <button
                  onClick={() => setActiveView('system')}
                  className="p-4 bg-red-600/10 border border-red-500/30 rounded-lg hover:bg-red-600/20 transition-colors text-left"
                >
                  <Settings className="w-5 h-5 text-red-400 mb-2" />
                  <p className="text-sm font-medium text-white">System Settings</p>
                  <p className="text-sm text-zinc-400">Platform config</p>
                </button>
              </div>
            </div>

            {/* Account Status Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-[#1A1A1A] border border-zinc-800 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <CheckCircle className="w-6 h-6 text-green-400" />
                  <h3 className="text-lg font-bold text-white">Active Accounts</h3>
                </div>
                <p className="text-4xl font-bold text-green-400 mb-2">{stats.activeSubscriptions}</p>
                <p className="text-sm text-zinc-400">Paying customers</p>
              </div>

              <div className="bg-[#1A1A1A] border border-zinc-800 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Clock className="w-6 h-6 text-blue-400" />
                  <h3 className="text-lg font-bold text-white">Trial Accounts</h3>
                </div>
                <p className="text-4xl font-bold text-blue-400 mb-2">{stats.trialAccounts}</p>
                <p className="text-sm text-zinc-400">Free trial period</p>
              </div>

              <div className="bg-[#1A1A1A] border border-zinc-800 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <XCircle className="w-6 h-6 text-red-400" />
                  <h3 className="text-lg font-bold text-white">Suspended</h3>
                </div>
                <p className="text-4xl font-bold text-red-400 mb-2">{stats.suspendedAccounts}</p>
                <p className="text-sm text-zinc-400">Payment issues</p>
              </div>
            </div>
          </div>
        )}

        {/* TERRITORIES TAB */}
        {activeView === 'territories' && (
          <div className="space-y-6">
            {/* Search and Filter */}
            <div className="flex items-center gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Search territories..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-[#1A1A1A] border border-zinc-800 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-[#ea580c]"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-3 bg-[#1A1A1A] border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-[#ea580c]"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="trial">Trial</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>

            {/* Territories List */}
            <div className="space-y-4">
              {territories.map(territory => (
                <div
                  key={territory.id}
                  className="bg-[#1A1A1A] border border-zinc-800 rounded-xl p-6 hover:border-[#ea580c]/50 transition-all"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 bg-purple-600/20 rounded-xl flex items-center justify-center">
                        <MapPin className="w-7 h-7 text-purple-400" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-white">{territory.name}</h3>
                        <p className="text-sm text-zinc-400">{territory.location}</p>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-sm text-zinc-500">Admin: {territory.admin_name}</span>
                          <span className="text-sm text-zinc-600">•</span>
                          <span className="text-sm text-zinc-500">{territory.admin_email}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(territory.status)}`}>
                        {territory.status}
                      </span>
                      <button className="p-2 hover:bg-zinc-800 rounded-lg transition-colors">
                        <Edit className="w-4 h-4 text-zinc-400" />
                      </button>
                      <button className="p-2 hover:bg-zinc-800 rounded-lg transition-colors">
                        <Eye className="w-4 h-4 text-zinc-400" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <div className="bg-[#0A0A0A] border border-zinc-800 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <Wrench className="w-4 h-4 text-orange-400" />
                        <span className="text-sm text-zinc-400">Subcontractors</span>
                      </div>
                      <p className="text-xl font-bold text-white">{territory.subcontractors}</p>
                    </div>

                    <div className="bg-[#0A0A0A] border border-zinc-800 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <Building2 className="w-4 h-4 text-blue-400" />
                        <span className="text-sm text-zinc-400">Vendors</span>
                      </div>
                      <p className="text-xl font-bold text-white">{territory.vendors}</p>
                    </div>

                    <div className="bg-[#0A0A0A] border border-zinc-800 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <Megaphone className="w-4 h-4 text-pink-400" />
                        <span className="text-sm text-zinc-400">Advertisers</span>
                      </div>
                      <p className="text-xl font-bold text-white">{territory.advertisers}</p>
                    </div>

                    <div className="bg-[#0A0A0A] border border-zinc-800 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <DollarSign className="w-4 h-4 text-green-400" />
                        <span className="text-sm text-zinc-400">Monthly Revenue</span>
                      </div>
                      <p className="text-xl font-bold text-white">{formatCurrency(territory.monthly_revenue)}</p>
                    </div>

                    <div className="bg-[#0A0A0A] border border-zinc-800 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <Crown className="w-4 h-4 text-yellow-400" />
                        <span className="text-sm text-zinc-400">License Fee</span>
                      </div>
                      <p className="text-xl font-bold text-white">{formatCurrency(territory.license_fee)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TENANTS TAB */}
        {activeView === 'tenants' && (
          <div className="space-y-6">
            {/* Tenant Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-[#1A1A1A] border border-zinc-800 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Building2 className="w-6 h-6 text-blue-400" />
                  <h3 className="text-lg font-bold text-white">Vendors</h3>
                </div>
                <p className="text-4xl font-bold text-blue-400 mb-2">124</p>
                <p className="text-sm text-zinc-400">Active storefronts</p>
              </div>

              <div className="bg-[#1A1A1A] border border-zinc-800 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Megaphone className="w-6 h-6 text-pink-400" />
                  <h3 className="text-lg font-bold text-white">Advertisers</h3>
                </div>
                <p className="text-4xl font-bold text-pink-400 mb-2">56</p>
                <p className="text-sm text-zinc-400">Running campaigns</p>
              </div>

              <div className="bg-[#1A1A1A] border border-zinc-800 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Wrench className="w-6 h-6 text-orange-400" />
                  <h3 className="text-lg font-bold text-white">Subcontractors</h3>
                </div>
                <p className="text-4xl font-bold text-orange-400 mb-2">167</p>
                <p className="text-sm text-zinc-400">Service providers</p>
              </div>
            </div>

            {/* Tenants Table */}
            <div className="bg-[#1A1A1A] border border-zinc-800 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-[#0A0A0A] border-b border-zinc-800">
                    <tr>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-zinc-400 uppercase tracking-wider">Tenant</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-zinc-400 uppercase tracking-wider">Type</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-zinc-400 uppercase tracking-wider">Territory</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-zinc-400 uppercase tracking-wider">Cohort</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-zinc-400 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-zinc-400 uppercase tracking-wider">Revenue</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-zinc-400 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800">
                    {tenants.map(tenant => (
                      <tr key={tenant.id} className="hover:bg-zinc-900/50 transition-colors">
                        <td className="px-6 py-4">
                          <p className="text-sm font-medium text-white">{tenant.name}</p>
                          <p className="text-sm text-zinc-500">ID: {tenant.id}</p>
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-2 py-1 bg-blue-500/20 text-blue-400 text-sm font-medium rounded border border-blue-500/30">
                            {tenant.type}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm text-white">{tenant.territory_name}</p>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm text-white">{tenant.cohort_name}</p>
                          <p className="text-sm text-zinc-500">{formatCurrency(tenant.monthly_fee)}/mo</p>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 text-sm font-medium rounded border ${getStatusColor(tenant.status)}`}>
                            {tenant.status}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm font-medium text-white">{formatCurrency(tenant.total_revenue)}</p>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <button className="p-1.5 hover:bg-zinc-800 rounded transition-colors">
                              <Eye className="w-4 h-4 text-zinc-400" />
                            </button>
                            <button className="p-1.5 hover:bg-zinc-800 rounded transition-colors">
                              <Edit className="w-4 h-4 text-zinc-400" />
                            </button>
                            <button className="p-1.5 hover:bg-red-900/50 rounded transition-colors">
                              <Ban className="w-4 h-4 text-red-400" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* REVENUE TAB */}
        {activeView === 'revenue' && (
          <div className="space-y-6">
            <div className="bg-[#1A1A1A] border border-zinc-800 rounded-xl p-8 text-center">
              <BarChart3 className="w-16 h-16 text-green-400 mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-white mb-2">Revenue Analytics</h3>
              <p className="text-zinc-400 mb-6">
                Detailed revenue breakdowns, charts, and financial reports will be displayed here.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
                <div className="bg-[#0A0A0A] border border-zinc-800 rounded-lg p-6">
                  <p className="text-sm text-zinc-400 mb-2">Territory Licenses</p>
                  <p className="text-3xl font-bold text-white mb-1">{formatCurrency(5988)}</p>
                  <p className="text-sm text-green-400">+$499 this month</p>
                </div>
                <div className="bg-[#0A0A0A] border border-zinc-800 rounded-lg p-6">
                  <p className="text-sm text-zinc-400 mb-2">Subscriptions</p>
                  <p className="text-3xl font-bold text-white mb-1">{formatCurrency(62450)}</p>
                  <p className="text-sm text-green-400">+18% MoM</p>
                </div>
                <div className="bg-[#0A0A0A] border border-zinc-800 rounded-lg p-6">
                  <p className="text-sm text-zinc-400 mb-2">Transaction Fees</p>
                  <p className="text-3xl font-bold text-white mb-1">{formatCurrency(16352)}</p>
                  <p className="text-sm text-green-400">+12% MoM</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* COHORTS TAB */}
        {activeView === 'cohorts' && (
          <div className="bg-[#1A1A1A] border border-zinc-800 rounded-xl p-8 text-center">
            <Layers className="w-16 h-16 text-purple-400 mx-auto mb-4" />
            <h3 className="text-2xl font-bold text-white mb-2">Cohort Management</h3>
            <p className="text-zinc-400 mb-6">
              Manage all subscription plans, pricing tiers, and capacity limits.
            </p>
            <button
              onClick={() => onNavigate?.('cohort-management')}
              className="px-6 py-3 bg-[#ea580c] hover:bg-[#c2410c] text-white rounded-lg font-medium transition-colors inline-flex items-center gap-2"
            >
              <Layers className="w-5 h-5" />
              Go to Cohort Management
            </button>
          </div>
        )}

        {/* SYSTEM TAB */}
        {activeView === 'system' && (
          <div className="bg-[#1A1A1A] border border-zinc-800 rounded-xl p-8 text-center">
            <Settings className="w-16 h-16 text-red-400 mx-auto mb-4" />
            <h3 className="text-2xl font-bold text-white mb-2">System Settings</h3>
            <p className="text-zinc-400 mb-6">
              Platform configuration, API settings, security, and system maintenance tools.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
              <button className="p-6 bg-[#0A0A0A] border border-zinc-800 rounded-lg hover:border-[#ea580c]/50 transition-all text-left">
                <Settings className="w-6 h-6 text-[#ea580c] mb-3" />
                <p className="font-semibold text-white mb-1">Platform Settings</p>
                <p className="text-sm text-zinc-400">General configuration</p>
              </button>
              <button className="p-6 bg-[#0A0A0A] border border-zinc-800 rounded-lg hover:border-[#ea580c]/50 transition-all text-left">
                <Shield className="w-6 h-6 text-blue-400 mb-3" />
                <p className="font-semibold text-white mb-1">Security & Access</p>
                <p className="text-sm text-zinc-400">Permissions & roles</p>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* New Territory Modal */}
      {showNewTerritoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-[#1A1A1A] border border-zinc-800 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 bg-[#1A1A1A] border-b border-zinc-800 p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-purple-600/20 rounded-lg flex items-center justify-center">
                    <MapPin className="w-6 h-6 text-purple-400" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white">Create New Territory</h2>
                    <p className="text-sm text-zinc-400">License a new 40-mile exclusive territory</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowNewTerritoryModal(false)}
                  className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-zinc-400" />
                </button>
              </div>
            </div>

            {/* Form */}
            <div className="p-6 space-y-6">
              {/* Territory Info */}
              <div>
                <h3 className="text-lg font-bold text-white mb-4">Territory Information</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-white mb-2">
                      Territory Name *
                    </label>
                    <input
                      type="text"
                      value={newTerritoryData.territoryName}
                      onChange={(e) => setNewTerritoryData({...newTerritoryData, territoryName: e.target.value})}
                      placeholder="e.g., Boston Metro, Dallas North"
                      className="w-full px-4 py-3 bg-[#0A0A0A] border border-zinc-800 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-[#ea580c]"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-white mb-2">
                        City *
                      </label>
                      <input
                        type="text"
                        value={newTerritoryData.city}
                        onChange={(e) => setNewTerritoryData({...newTerritoryData, city: e.target.value})}
                        placeholder="Boston"
                        className="w-full px-4 py-3 bg-[#0A0A0A] border border-zinc-800 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-[#ea580c]"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-white mb-2">
                        State *
                      </label>
                      <input
                        type="text"
                        value={newTerritoryData.state}
                        onChange={(e) => setNewTerritoryData({...newTerritoryData, state: e.target.value})}
                        placeholder="MA"
                        maxLength={2}
                        className="w-full px-4 py-3 bg-[#0A0A0A] border border-zinc-800 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-[#ea580c] uppercase"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-white mb-2">
                        ZIP Code *
                      </label>
                      <input
                        type="text"
                        value={newTerritoryData.zipCode}
                        onChange={(e) => setNewTerritoryData({...newTerritoryData, zipCode: e.target.value})}
                        placeholder="02101"
                        maxLength={5}
                        className="w-full px-4 py-3 bg-[#0A0A0A] border border-zinc-800 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-[#ea580c]"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-white mb-2">
                        Radius (miles)
                      </label>
                      <input
                        type="number"
                        value={newTerritoryData.radiusMiles}
                        onChange={(e) => setNewTerritoryData({...newTerritoryData, radiusMiles: e.target.value})}
                        className="w-full px-4 py-3 bg-[#0A0A0A] border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-[#ea580c]"
                        disabled
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Admin Info */}
              <div>
                <h3 className="text-lg font-bold text-white mb-4">Territory Administrator</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-white mb-2">
                      Admin Name *
                    </label>
                    <input
                      type="text"
                      value={newTerritoryData.adminName}
                      onChange={(e) => setNewTerritoryData({...newTerritoryData, adminName: e.target.value})}
                      placeholder="John Smith"
                      className="w-full px-4 py-3 bg-[#0A0A0A] border border-zinc-800 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-[#ea580c]"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-white mb-2">
                      Admin Email *
                    </label>
                    <input
                      type="email"
                      value={newTerritoryData.adminEmail}
                      onChange={(e) => setNewTerritoryData({...newTerritoryData, adminEmail: e.target.value})}
                      placeholder="john@example.com"
                      className="w-full px-4 py-3 bg-[#0A0A0A] border border-zinc-800 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-[#ea580c]"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-white mb-2">
                      Admin Phone
                    </label>
                    <input
                      type="tel"
                      value={newTerritoryData.adminPhone}
                      onChange={(e) => setNewTerritoryData({...newTerritoryData, adminPhone: e.target.value})}
                      placeholder="(555) 123-4567"
                      className="w-full px-4 py-3 bg-[#0A0A0A] border border-zinc-800 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-[#ea580c]"
                    />
                  </div>
                </div>
              </div>

              {/* Pricing */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-white">License Fees</h3>
                  <p className="text-sm text-zinc-400">Customize pricing below</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-white mb-2">
                      One-Time License Fee
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400">$</span>
                      <input
                        type="number"
                        value={newTerritoryData.licenseFee}
                        onChange={(e) => setNewTerritoryData({...newTerritoryData, licenseFee: e.target.value})}
                        className="w-full pl-8 pr-4 py-3 bg-[#0A0A0A] border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-[#ea580c]"
                        placeholder="15000"
                      />
                    </div>
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={() => setNewTerritoryData({...newTerritoryData, licenseFee: '10000'})}
                        className="px-3 py-1 text-sm bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded transition-colors"
                      >
                        $10k
                      </button>
                      <button
                        onClick={() => setNewTerritoryData({...newTerritoryData, licenseFee: '15000'})}
                        className="px-3 py-1 text-sm bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded transition-colors"
                      >
                        $15k
                      </button>
                      <button
                        onClick={() => setNewTerritoryData({...newTerritoryData, licenseFee: '25000'})}
                        className="px-3 py-1 text-sm bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded transition-colors"
                      >
                        $25k
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-white mb-2">
                      Monthly License Fee
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400">$</span>
                      <input
                        type="number"
                        value={newTerritoryData.monthlyFee}
                        onChange={(e) => setNewTerritoryData({...newTerritoryData, monthlyFee: e.target.value})}
                        className="w-full pl-8 pr-4 py-3 bg-[#0A0A0A] border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-[#ea580c]"
                        placeholder="499"
                      />
                    </div>
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={() => setNewTerritoryData({...newTerritoryData, monthlyFee: '299'})}
                        className="px-3 py-1 text-sm bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded transition-colors"
                      >
                        $299
                      </button>
                      <button
                        onClick={() => setNewTerritoryData({...newTerritoryData, monthlyFee: '499'})}
                        className="px-3 py-1 text-sm bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded transition-colors"
                      >
                        $499
                      </button>
                      <button
                        onClick={() => setNewTerritoryData({...newTerritoryData, monthlyFee: '999'})}
                        className="px-3 py-1 text-sm bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded transition-colors"
                      >
                        $999
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Summary */}
              <div className="bg-gradient-to-r from-purple-600/10 to-purple-700/5 border border-purple-500/30 rounded-lg p-6">
                <h3 className="text-lg font-bold text-white mb-3">Territory Summary</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Territory</span>
                    <span className="text-white font-medium">
                      {newTerritoryData.territoryName || '—'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Location</span>
                    <span className="text-white font-medium">
                      {newTerritoryData.city && newTerritoryData.state 
                        ? `${newTerritoryData.city}, ${newTerritoryData.state}` 
                        : '—'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Administrator</span>
                    <span className="text-white font-medium">
                      {newTerritoryData.adminName || '—'}
                    </span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-purple-500/20">
                    <span className="text-zinc-400">One-Time Fee</span>
                    <span className="text-green-400 font-bold">
                      ${parseFloat(newTerritoryData.licenseFee || '0').toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Monthly Fee</span>
                    <span className="text-green-400 font-bold">
                      ${parseFloat(newTerritoryData.monthlyFee || '0').toLocaleString()}/mo
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 bg-[#1A1A1A] border-t border-zinc-800 p-6">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowNewTerritoryModal(false)}
                  className="flex-1 px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateTerritory}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white rounded-lg font-medium transition-all shadow-lg shadow-purple-500/30 flex items-center justify-center gap-2"
                >
                  <CheckCircle className="w-5 h-5" />
                  Create Territory
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}