import React, { useState, useEffect } from 'react';
import { 
  Users, 
  CreditCard, 
  ShoppingBag, 
  Megaphone, 
  TrendingUp, 
  Settings, 
  Plus, 
  Search, 
  MoreVertical, 
  Edit, 
  Trash2, 
  Copy, 
  X, 
  Save,
  DollarSign,
  Calendar,
  Target,
  Eye,
  UserCheck,
  Package,
  Tag,
  BarChart3,
  Filter,
  Download,
  Upload,
  CheckCircle,
  XCircle,
  AlertCircle,
  HardHat
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { SubscriptionPlans } from './SubscriptionPlans';

type ViewMode = 'subscriptions' | 'cohorts' | 'maintenance' | 'vendors' | 'advertisers' | 'construction';

interface Cohort {
  id: string;
  name: string;
  description: string;
  memberCount: number;
  monthlyRevenue: number;
  growthRate: number;
  status: 'active' | 'inactive';
  createdAt: string;
  tags: string[];
}

interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  price: number;
  billingCycle: 'monthly' | 'yearly';
  features: string[];
  subscriberCount: number;
  status: 'active' | 'inactive';
  createdAt: string;
}

interface VendorPlan {
  id: string;
  name: string;
  description: string;
  monthlyFee: number;
  commissionRate: number;
  features: string[];
  vendorCount: number;
  status: 'active' | 'inactive';
  createdAt: string;
}

interface AdvertiserPlan {
  id: string;
  name: string;
  description: string;
  costPerImpression: number;
  impressionsPerMonth: number;
  features: string[];
  advertiserCount: number;
  status: 'active' | 'inactive';
  createdAt: string;
}

interface MaintenancePlan {
  id: string;
  name: string;
  description: string;
  price: number;
  monthlyHours: number;
  propertyType: 'residential' | 'commercial' | 'multi-family';
  features: string[];
  clientCount: number;
  status: 'active' | 'inactive';
  createdAt: string;
}

interface ConstructionPlan {
  id: string;
  name: string;
  description: string;
  price: number;
  monthlyHours: number;
  features: string[];
  subscriberCount: number;
  status: 'active' | 'inactive';
  createdAt: string;
  popular?: boolean;
}

export function AdvancedCohortManagement() {
  const [viewMode, setViewMode] = useState<ViewMode>('subscriptions');
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [editingItem, setEditingItem] = useState<any | null>(null);

  // Sample data
  const [cohorts, setCohorts] = useState<Cohort[]>([
    {
      id: '1',
      name: 'Premium Customers',
      description: 'High-value customers with premium subscriptions',
      memberCount: 245,
      monthlyRevenue: 24500,
      growthRate: 12.5,
      status: 'active',
      createdAt: '2024-01-15',
      tags: ['Premium', 'High Value']
    },
    {
      id: '2',
      name: 'Enterprise Clients',
      description: 'Large enterprise accounts',
      memberCount: 48,
      monthlyRevenue: 96000,
      growthRate: 8.3,
      status: 'active',
      createdAt: '2024-02-01',
      tags: ['Enterprise', 'B2B']
    }
  ]);

  const [subscriptionPlans, setSubscriptionPlans] = useState<SubscriptionPlan[]>([
    {
      id: '1',
      name: 'Starter Plan',
      description: 'Perfect for small businesses',
      price: 29,
      billingCycle: 'monthly',
      features: ['Feature 1', 'Feature 2', 'Feature 3'],
      subscriberCount: 320,
      status: 'active',
      createdAt: '2024-01-10'
    },
    {
      id: '2',
      name: 'Professional Plan',
      description: 'For growing businesses',
      price: 99,
      billingCycle: 'monthly',
      features: ['All Starter features', 'Advanced Analytics', 'Priority Support'],
      subscriberCount: 156,
      status: 'active',
      createdAt: '2024-01-10'
    }
  ]);

  const [vendorPlans, setVendorPlans] = useState<VendorPlan[]>([
    {
      id: '1',
      name: 'Basic Vendor',
      description: 'Entry-level vendor partnership',
      monthlyFee: 49,
      commissionRate: 15,
      features: ['Storefront', 'Basic Analytics', 'Email Support'],
      vendorCount: 89,
      status: 'active',
      createdAt: '2024-01-20'
    },
    {
      id: '2',
      name: 'Premium Vendor',
      description: 'Full-featured vendor access',
      monthlyFee: 199,
      commissionRate: 10,
      features: ['Premium Storefront', 'Advanced Analytics', 'Dedicated Support', 'Featured Placement'],
      vendorCount: 34,
      status: 'active',
      createdAt: '2024-01-20'
    }
  ]);

  const [advertiserPlans, setAdvertiserPlans] = useState<AdvertiserPlan[]>([
    {
      id: '1',
      name: 'Standard Advertising',
      description: 'Basic advertising package',
      costPerImpression: 0.05,
      impressionsPerMonth: 100000,
      features: ['Display Ads', 'Basic Targeting', 'Monthly Reports'],
      advertiserCount: 45,
      status: 'active',
      createdAt: '2024-02-05'
    },
    {
      id: '2',
      name: 'Premium Advertising',
      description: 'Advanced advertising with premium placement',
      costPerImpression: 0.10,
      impressionsPerMonth: 500000,
      features: ['Premium Placement', 'Advanced Targeting', 'Real-time Analytics', 'A/B Testing'],
      advertiserCount: 18,
      status: 'active',
      createdAt: '2024-02-05'
    }
  ]);

  const [maintenancePlans, setMaintenancePlans] = useState<MaintenancePlan[]>([
    {
      id: '1',
      name: 'Residential Basic',
      description: 'Essential maintenance for homeowners',
      price: 149,
      monthlyHours: 4,
      propertyType: 'residential',
      features: ['4 hours/month service', 'Priority scheduling', 'Email & phone support', 'Service history tracking'],
      clientCount: 87,
      status: 'active',
      createdAt: '2024-01-15'
    },
    {
      id: '2',
      name: 'Multi-Family Standard',
      description: 'Comprehensive maintenance for apartment buildings',
      price: 599,
      monthlyHours: 20,
      propertyType: 'multi-family',
      features: ['20 hours/month service', 'Multi-unit coordination', 'Dedicated property manager', '24/7 emergency support'],
      clientCount: 23,
      status: 'active',
      createdAt: '2024-01-20'
    },
    {
      id: '3',
      name: 'Commercial Premium',
      description: 'Enterprise-grade maintenance for commercial properties',
      price: 1299,
      monthlyHours: 40,
      propertyType: 'commercial',
      features: ['40 hours/month service', 'Preventive maintenance program', 'Dedicated facility manager', 'Compliance reporting', 'After-hours service'],
      clientCount: 15,
      status: 'active',
      createdAt: '2024-02-01'
    }
  ]);

  const [constructionPlans, setConstructionPlans] = useState<ConstructionPlan[]>([
    {
      id: '1',
      name: 'Basic Build',
      description: 'Perfect for small construction projects and renovations',
      price: 999,
      monthlyHours: 10,
      features: ['10 Build Hours/Month', 'Project Management', 'Material Sourcing', 'Progress Reports'],
      subscriberCount: 42,
      status: 'active',
      createdAt: '2024-01-15',
      popular: false
    },
    {
      id: '2',
      name: 'Pro Build',
      description: 'Ideal for medium-sized construction and renovation projects',
      price: 2199,
      monthlyHours: 25,
      features: ['25 Build Hours/Month', 'Priority Scheduling', 'Dedicated PM', 'Design Consultation', 'Material Discounts'],
      subscriberCount: 68,
      status: 'active',
      createdAt: '2024-01-15',
      popular: true
    },
    {
      id: '3',
      name: 'Enterprise Build',
      description: 'Full-scale construction services for large commercial projects',
      price: 3999,
      monthlyHours: 50,
      features: ['50 Build Hours/Month', 'Fastest Response', 'Senior PM Team', 'Custom Design Services', 'Premium Materials', 'Warranty Extension'],
      subscriberCount: 29,
      status: 'active',
      createdAt: '2024-02-01',
      popular: false
    }
  ]);

  const getCurrentData = () => {
    switch (viewMode) {
      case 'cohorts':
        return cohorts;
      case 'subscriptions':
        return subscriptionPlans;
      case 'maintenance':
        return maintenancePlans;
      case 'construction':
        return constructionPlans;
      case 'vendors':
        return vendorPlans;
      case 'advertisers':
        return advertiserPlans;
      default:
        return [];
    }
  };

  const getFilteredData = () => {
    const data = getCurrentData();
    if (!searchTerm) return data;
    return data.filter((item: any) =>
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.description.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  const handleDelete = (id: string) => {
    if (!confirm('Are you sure you want to delete this item?')) return;

    switch (viewMode) {
      case 'cohorts':
        setCohorts(cohorts.filter(c => c.id !== id));
        break;
      case 'subscriptions':
        setSubscriptionPlans(subscriptionPlans.filter(p => p.id !== id));
        break;
      case 'maintenance':
        setMaintenancePlans(maintenancePlans.filter(p => p.id !== id));
        break;
      case 'construction':
        setConstructionPlans(constructionPlans.filter(p => p.id !== id));
        break;
      case 'vendors':
        setVendorPlans(vendorPlans.filter(p => p.id !== id));
        break;
      case 'advertisers':
        setAdvertiserPlans(advertiserPlans.filter(p => p.id !== id));
        break;
    }
    toast.success('Item deleted successfully');
  };

  const handleDuplicate = (item: any) => {
    const newItem = {
      ...item,
      id: Date.now().toString(),
      name: `${item.name} (Copy)`,
      createdAt: new Date().toISOString().split('T')[0]
    };

    switch (viewMode) {
      case 'cohorts':
        setCohorts([...cohorts, newItem]);
        break;
      case 'subscriptions':
        setSubscriptionPlans([...subscriptionPlans, newItem]);
        break;
      case 'maintenance':
        setMaintenancePlans([...maintenancePlans, newItem]);
        break;
      case 'construction':
        setConstructionPlans([...constructionPlans, newItem]);
        break;
      case 'vendors':
        setVendorPlans([...vendorPlans, newItem]);
        break;
      case 'advertisers':
        setAdvertiserPlans([...advertiserPlans, newItem]);
        break;
    }
    toast.success('Item duplicated successfully');
  };

  const handleToggleStatus = (id: string) => {
    const toggleStatus = (item: any) => ({
      ...item,
      status: item.status === 'active' ? 'inactive' : 'active'
    });

    switch (viewMode) {
      case 'cohorts':
        setCohorts(cohorts.map(c => c.id === id ? toggleStatus(c) : c));
        break;
      case 'subscriptions':
        setSubscriptionPlans(subscriptionPlans.map(p => p.id === id ? toggleStatus(p) : p));
        break;
      case 'maintenance':
        setMaintenancePlans(maintenancePlans.map(p => p.id === id ? toggleStatus(p) : p));
        break;
      case 'construction':
        setConstructionPlans(constructionPlans.map(p => p.id === id ? toggleStatus(p) : p));
        break;
      case 'vendors':
        setVendorPlans(vendorPlans.map(p => p.id === id ? toggleStatus(p) : p));
        break;
      case 'advertisers':
        setAdvertiserPlans(advertiserPlans.map(p => p.id === id ? toggleStatus(p) : p));
        break;
    }
    toast.success('Status updated successfully');
  };

  const getViewConfig = () => {
    switch (viewMode) {
      case 'cohorts':
        return {
          icon: Users,
          title: 'Cohort Management',
          description: 'Manage customer cohorts and segments',
          color: 'from-blue-500 to-cyan-500'
        };
      case 'subscriptions':
        return {
          icon: CreditCard,
          title: 'Subscription Plans',
          description: 'Manage subscription tiers and pricing',
          color: 'from-green-500 to-emerald-500'
        };
      case 'maintenance':
        return {
          icon: Settings,
          title: 'Maintenance Plans',
          description: 'Property maintenance for owners, landlords & commercial units',
          color: 'from-yellow-500 to-amber-500'
        };
      case 'construction':
        return {
          icon: HardHat,
          title: 'Construction Subscriptions',
          description: 'Monthly build hours for construction & renovation projects',
          color: 'from-orange-500 to-red-500'
        };
      case 'vendors':
        return {
          icon: ShoppingBag,
          title: 'Vendor Plans',
          description: 'Manage vendor partnership tiers',
          color: 'from-purple-500 to-pink-500'
        };
      case 'advertisers':
        return {
          icon: Megaphone,
          title: 'Advertiser Plans',
          description: 'Manage advertising packages and pricing',
          color: 'from-red-500 to-pink-500'
        };
    }
  };

  const config = getViewConfig();
  const IconComponent = config.icon;
  const filteredData = getFilteredData();

  return (
    <>
    <div className="min-h-screen bg-[#0A0A0A] p-6 w-full" style={{ alignSelf: 'stretch' }}>
      <div className="max-w-[1800px] mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 bg-gradient-to-br from-[#ea580c] to-[#dc2626] rounded-lg flex items-center justify-center">
                <IconComponent className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white">{config.title}</h1>
                <p className="text-zinc-400">{config.description}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowSettingsModal(true)}
                className="p-3 bg-zinc-900 border border-zinc-800 text-white rounded-lg hover:bg-zinc-800 transition-colors"
              >
                <Settings className="w-5 h-5" />
              </button>
              <button
                onClick={() => {
                  setEditingItem(null);
                  setShowCreateModal(true);
                }}
                className="px-6 py-3 bg-[#ea580c] text-white rounded-lg hover:bg-[#dc2626] transition-colors font-medium flex items-center gap-2"
              >
                <Plus className="w-5 h-5" />
                Create New
              </button>
            </div>
          </div>
        </div>

        {/* View Mode Tabs */}
        <div className="mb-6 flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-lg p-2">
          {[
            { mode: 'cohorts' as ViewMode, icon: Users, label: 'Cohorts' },
            { mode: 'subscriptions' as ViewMode, icon: CreditCard, label: 'Subscriptions' },
            { mode: 'maintenance' as ViewMode, icon: Settings, label: 'Maintenance' },
            { mode: 'construction' as ViewMode, icon: HardHat, label: 'Construction' },
            { mode: 'vendors' as ViewMode, icon: ShoppingBag, label: 'Vendors' },
            { mode: 'advertisers' as ViewMode, icon: Megaphone, label: 'Advertisers' }
          ].map((tab) => {
            const TabIcon = tab.icon;
            return (
              <button
                key={tab.mode}
                onClick={() => {
                  setViewMode(tab.mode);
                  setSearchTerm('');
                }}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg transition-all ${
                  viewMode === tab.mode
                    ? 'bg-[#ea580c] text-white'
                    : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
                }`}
              >
                <TabIcon className="w-5 h-5" />
                <span className="font-medium">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Search and Filters */}
        <div className="mb-6 flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={`Search ${viewMode}...`}
              className="w-full pl-12 pr-4 py-3 bg-zinc-900 border border-zinc-800 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-[#ea580c]"
            />
          </div>
          <button className="px-4 py-3 bg-zinc-900 border border-zinc-800 text-white rounded-lg hover:bg-zinc-800 transition-colors flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filters
          </button>
          <button className="px-4 py-3 bg-zinc-900 border border-zinc-800 text-white rounded-lg hover:bg-zinc-800 transition-colors flex items-center gap-2">
            <Download className="w-5 h-5" />
            Export
          </button>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-zinc-400 text-sm">Total Items</span>
              <BarChart3 className="w-5 h-5 text-[#ea580c]" />
            </div>
            <div className="text-3xl font-bold text-white">{getCurrentData().length}</div>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-zinc-400 text-sm">Active</span>
              <CheckCircle className="w-5 h-5 text-green-500" />
            </div>
            <div className="text-3xl font-bold text-white">
              {getCurrentData().filter((item: any) => item.status === 'active').length}
            </div>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-zinc-400 text-sm">Inactive</span>
              <XCircle className="w-5 h-5 text-red-500" />
            </div>
            <div className="text-3xl font-bold text-white">
              {getCurrentData().filter((item: any) => item.status === 'inactive').length}
            </div>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-zinc-400 text-sm">Growth</span>
              <TrendingUp className="w-5 h-5 text-[#ea580c]" />
            </div>
            <div className="text-3xl font-bold text-green-500">+12.3%</div>
          </div>
        </div>

        {/* Data Grid */}
        {viewMode === 'subscriptions' ? (
          <SubscriptionPlans onSelectPlan={(planId) => toast.success(`Selected plan: ${planId}`)} />
        ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredData.map((item: any) => {
            if (viewMode === 'cohorts') {
              return (
                <CohortCard
                  key={item.id}
                  cohort={item}
                  onEdit={() => {
                    setEditingItem(item);
                    setShowCreateModal(true);
                  }}
                  onDelete={() => handleDelete(item.id)}
                  onDuplicate={() => handleDuplicate(item)}
                  onToggleStatus={() => handleToggleStatus(item.id)}
                />
              );
            } else if (viewMode === 'maintenance') {
              return (
                <MaintenancePlanCard
                  key={item.id}
                  plan={item}
                  onEdit={() => {
                    setEditingItem(item);
                    setShowCreateModal(true);
                  }}
                  onDelete={() => handleDelete(item.id)}
                  onDuplicate={() => handleDuplicate(item)}
                  onToggleStatus={() => handleToggleStatus(item.id)}
                />
              );
            } else if (viewMode === 'construction') {
              return (
                <ConstructionPlanCard
                  key={item.id}
                  plan={item}
                  onEdit={() => {
                    setEditingItem(item);
                    setShowCreateModal(true);
                  }}
                  onDelete={() => handleDelete(item.id)}
                  onDuplicate={() => handleDuplicate(item)}
                  onToggleStatus={() => handleToggleStatus(item.id)}
                />
              );
            } else if (viewMode === 'vendors') {
              return (
                <VendorPlanCard
                  key={item.id}
                  plan={item}
                  onEdit={() => {
                    setEditingItem(item);
                    setShowCreateModal(true);
                  }}
                  onDelete={() => handleDelete(item.id)}
                  onDuplicate={() => handleDuplicate(item)}
                  onToggleStatus={() => handleToggleStatus(item.id)}
                />
              );
            } else {
              return (
                <AdvertiserPlanCard
                  key={item.id}
                  plan={item}
                  onEdit={() => {
                    setEditingItem(item);
                    setShowCreateModal(true);
                  }}
                  onDelete={() => handleDelete(item.id)}
                  onDuplicate={() => handleDuplicate(item)}
                  onToggleStatus={() => handleToggleStatus(item.id)}
                />
              );
            }
          })}
        </div>
        )}

        {/* Empty State */}
        {filteredData.length === 0 && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-12 text-center">
            <IconComponent className="w-16 h-16 text-zinc-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No {viewMode} found</h3>
            <p className="text-zinc-400 mb-6">
              {searchTerm ? 'Try adjusting your search criteria' : `Create your first ${viewMode.slice(0, -1)} to get started`}
            </p>
            {!searchTerm && (
              <button
                onClick={() => {
                  setEditingItem(null);
                  setShowCreateModal(true);
                }}
                className="px-6 py-3 bg-[#ea580c] text-white rounded-lg hover:bg-[#dc2626] transition-colors font-medium inline-flex items-center gap-2"
              >
                <Plus className="w-5 h-5" />
                Create New
              </button>
            )}
          </div>
        )}

        {/* Create/Edit Modal */}
        {showCreateModal && (
          <CreateEditModal
            viewMode={viewMode}
            editingItem={editingItem}
            onClose={() => {
              setShowCreateModal(false);
              setEditingItem(null);
            }}
            onSave={(item) => {
              if (editingItem) {
                // Update existing
                switch (viewMode) {
                  case 'cohorts':
                    setCohorts(cohorts.map(c => c.id === item.id ? item : c));
                    break;
                  case 'subscriptions':
                    setSubscriptionPlans(subscriptionPlans.map(p => p.id === item.id ? item : p));
                    break;
                  case 'maintenance':
                    setMaintenancePlans(maintenancePlans.map(p => p.id === item.id ? item : p));
                    break;
                  case 'construction':
                    setConstructionPlans(constructionPlans.map(p => p.id === item.id ? item : p));
                    break;
                  case 'vendors':
                    setVendorPlans(vendorPlans.map(p => p.id === item.id ? item : p));
                    break;
                  case 'advertisers':
                    setAdvertiserPlans(advertiserPlans.map(p => p.id === item.id ? item : p));
                    break;
                }
                toast.success('Item updated successfully');
              } else {
                // Create new
                const newItem = {
                  ...item,
                  id: Date.now().toString(),
                  status: 'active',
                  createdAt: new Date().toISOString().split('T')[0]
                };
                switch (viewMode) {
                  case 'cohorts':
                    setCohorts([...cohorts, newItem]);
                    break;
                  case 'subscriptions':
                    setSubscriptionPlans([...subscriptionPlans, newItem]);
                    break;
                  case 'maintenance':
                    setMaintenancePlans([...maintenancePlans, newItem]);
                    break;
                  case 'construction':
                    setConstructionPlans([...constructionPlans, newItem]);
                    break;
                  case 'vendors':
                    setVendorPlans([...vendorPlans, newItem]);
                    break;
                  case 'advertisers':
                    setAdvertiserPlans([...advertiserPlans, newItem]);
                    break;
                }
                toast.success('Item created successfully');
              }
              setShowCreateModal(false);
              setEditingItem(null);
            }}
          />
        )}
      </div>
    </div>

      {/* Settings Modal */}
      <CohortSettingsModal 
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
      />
    </>
  );
}

// ===== COHORT CARD COMPONENT =====
interface CohortCardProps {
  cohort: Cohort;
  onEdit: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onToggleStatus: () => void;
}

function CohortCard({ cohort, onEdit, onDelete, onDuplicate, onToggleStatus }: CohortCardProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 hover:border-[#ea580c] transition-all group">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-lg font-semibold text-white">{cohort.name}</h3>
            <span className={`px-2 py-1 rounded text-xs font-medium ${
              cohort.status === 'active' ? 'bg-green-500/20 text-green-400' : 'bg-zinc-700 text-zinc-400'
            }`}>
              {cohort.status}
            </span>
          </div>
          <p className="text-sm text-zinc-400 mb-3">{cohort.description}</p>
          <div className="flex flex-wrap gap-1">
            {cohort.tags.map((tag, idx) => (
              <span key={idx} className="px-2 py-1 bg-zinc-800 text-zinc-300 rounded text-xs">
                {tag}
              </span>
            ))}
          </div>
        </div>
        <div className="relative group">
          <button className="p-2 hover:bg-zinc-800 rounded-lg transition-colors">
            <MoreVertical className="w-5 h-5 text-zinc-400" />
          </button>
          <div className="absolute right-0 top-full mt-2 w-48 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
            <button onClick={onEdit} className="w-full px-4 py-2 text-left text-sm text-white hover:bg-zinc-700 flex items-center gap-2">
              <Edit className="w-4 h-4" /> Edit
            </button>
            <button onClick={onDuplicate} className="w-full px-4 py-2 text-left text-sm text-white hover:bg-zinc-700 flex items-center gap-2">
              <Copy className="w-4 h-4" /> Duplicate
            </button>
            <button onClick={onToggleStatus} className="w-full px-4 py-2 text-left text-sm text-white hover:bg-zinc-700 flex items-center gap-2">
              {cohort.status === 'active' ? <XCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
              {cohort.status === 'active' ? 'Deactivate' : 'Activate'}
            </button>
            <button onClick={onDelete} className="w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-zinc-700 flex items-center gap-2">
              <Trash2 className="w-4 h-4" /> Delete
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 pt-4 border-t border-zinc-800">
        <div>
          <div className="text-xs text-zinc-500 mb-1">Members</div>
          <div className="text-lg font-semibold text-white flex items-center gap-1">
            <Users className="w-4 h-4 text-[#ea580c]" />
            {cohort.memberCount}
          </div>
        </div>
        <div>
          <div className="text-xs text-zinc-500 mb-1">Revenue</div>
          <div className="text-lg font-semibold text-white flex items-center gap-1">
            <DollarSign className="w-4 h-4 text-green-500" />
            {formatCurrency(cohort.monthlyRevenue)}
          </div>
        </div>
        <div>
          <div className="text-xs text-zinc-500 mb-1">Growth</div>
          <div className="text-lg font-semibold text-green-500 flex items-center gap-1">
            <TrendingUp className="w-4 h-4" />
            {cohort.growthRate}%
          </div>
        </div>
      </div>
    </div>
  );
}

// ===== SUBSCRIPTION CARD COMPONENT =====
interface SubscriptionCardProps {
  plan: SubscriptionPlan;
  onEdit: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onToggleStatus: () => void;
}

function SubscriptionCard({ plan, onEdit, onDelete, onDuplicate, onToggleStatus }: SubscriptionCardProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 hover:border-[#ea580c] transition-all group">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-lg font-semibold text-white">{plan.name}</h3>
            <span className={`px-2 py-1 rounded text-xs font-medium ${
              plan.status === 'active' ? 'bg-green-500/20 text-green-400' : 'bg-zinc-700 text-zinc-400'
            }`}>
              {plan.status}
            </span>
          </div>
          <p className="text-sm text-zinc-400 mb-3">{plan.description}</p>
          <div className="text-2xl font-bold text-white mb-3">
            {formatCurrency(plan.price)}
            <span className="text-sm text-zinc-400 font-normal">/{plan.billingCycle}</span>
          </div>
        </div>
        <div className="relative group">
          <button className="p-2 hover:bg-zinc-800 rounded-lg transition-colors">
            <MoreVertical className="w-5 h-5 text-zinc-400" />
          </button>
          <div className="absolute right-0 top-full mt-2 w-48 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
            <button onClick={onEdit} className="w-full px-4 py-2 text-left text-sm text-white hover:bg-zinc-700 flex items-center gap-2">
              <Edit className="w-4 h-4" /> Edit
            </button>
            <button onClick={onDuplicate} className="w-full px-4 py-2 text-left text-sm text-white hover:bg-zinc-700 flex items-center gap-2">
              <Copy className="w-4 h-4" /> Duplicate
            </button>
            <button onClick={onToggleStatus} className="w-full px-4 py-2 text-left text-sm text-white hover:bg-zinc-700 flex items-center gap-2">
              {plan.status === 'active' ? <XCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
              {plan.status === 'active' ? 'Deactivate' : 'Activate'}
            </button>
            <button onClick={onDelete} className="w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-zinc-700 flex items-center gap-2">
              <Trash2 className="w-4 h-4" /> Delete
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-2 mb-4">
        {plan.features.slice(0, 3).map((feature, idx) => (
          <div key={idx} className="flex items-center gap-2 text-sm text-zinc-300">
            <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
            {feature}
          </div>
        ))}
        {plan.features.length > 3 && (
          <div className="text-sm text-zinc-500">+{plan.features.length - 3} more features</div>
        )}
      </div>

      <div className="pt-4 border-t border-zinc-800">
        <div className="flex items-center justify-between">
          <div className="text-xs text-zinc-500">Subscribers</div>
          <div className="text-lg font-semibold text-white flex items-center gap-1">
            <UserCheck className="w-4 h-4 text-[#ea580c]" />
            {plan.subscriberCount}
          </div>
        </div>
      </div>
    </div>
  );
}

// ===== VENDOR PLAN CARD COMPONENT =====
interface VendorPlanCardProps {
  plan: VendorPlan;
  onEdit: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onToggleStatus: () => void;
}

function VendorPlanCard({ plan, onEdit, onDelete, onDuplicate, onToggleStatus }: VendorPlanCardProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 hover:border-[#ea580c] transition-all group">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-lg font-semibold text-white">{plan.name}</h3>
            <span className={`px-2 py-1 rounded text-xs font-medium ${
              plan.status === 'active' ? 'bg-green-500/20 text-green-400' : 'bg-zinc-700 text-zinc-400'
            }`}>
              {plan.status}
            </span>
          </div>
          <p className="text-sm text-zinc-400 mb-3">{plan.description}</p>
        </div>
        <div className="relative group">
          <button className="p-2 hover:bg-zinc-800 rounded-lg transition-colors">
            <MoreVertical className="w-5 h-5 text-zinc-400" />
          </button>
          <div className="absolute right-0 top-full mt-2 w-48 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
            <button onClick={onEdit} className="w-full px-4 py-2 text-left text-sm text-white hover:bg-zinc-700 flex items-center gap-2">
              <Edit className="w-4 h-4" /> Edit
            </button>
            <button onClick={onDuplicate} className="w-full px-4 py-2 text-left text-sm text-white hover:bg-zinc-700 flex items-center gap-2">
              <Copy className="w-4 h-4" /> Duplicate
            </button>
            <button onClick={onToggleStatus} className="w-full px-4 py-2 text-left text-sm text-white hover:bg-zinc-700 flex items-center gap-2">
              {plan.status === 'active' ? <XCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
              {plan.status === 'active' ? 'Deactivate' : 'Activate'}
            </button>
            <button onClick={onDelete} className="w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-zinc-700 flex items-center gap-2">
              <Trash2 className="w-4 h-4" /> Delete
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-zinc-800/50 rounded-lg p-3">
          <div className="text-xs text-zinc-500 mb-1">Monthly Fee</div>
          <div className="text-lg font-semibold text-white">{formatCurrency(plan.monthlyFee)}</div>
        </div>
        <div className="bg-zinc-800/50 rounded-lg p-3">
          <div className="text-xs text-zinc-500 mb-1">Commission</div>
          <div className="text-lg font-semibold text-[#ea580c]">{plan.commissionRate}%</div>
        </div>
      </div>

      <div className="space-y-2 mb-4">
        {plan.features.slice(0, 3).map((feature, idx) => (
          <div key={idx} className="flex items-center gap-2 text-sm text-zinc-300">
            <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
            {feature}
          </div>
        ))}
        {plan.features.length > 3 && (
          <div className="text-sm text-zinc-500">+{plan.features.length - 3} more features</div>
        )}
      </div>

      <div className="pt-4 border-t border-zinc-800">
        <div className="flex items-center justify-between">
          <div className="text-xs text-zinc-500">Active Vendors</div>
          <div className="text-lg font-semibold text-white flex items-center gap-1">
            <ShoppingBag className="w-4 h-4 text-[#ea580c]" />
            {plan.vendorCount}
          </div>
        </div>
      </div>
    </div>
  );
}

// ===== ADVERTISER PLAN CARD COMPONENT =====
interface AdvertiserPlanCardProps {
  plan: AdvertiserPlan;
  onEdit: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onToggleStatus: () => void;
}

function AdvertiserPlanCard({ plan, onEdit, onDelete, onDuplicate, onToggleStatus }: AdvertiserPlanCardProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 hover:border-[#ea580c] transition-all group">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-lg font-semibold text-white">{plan.name}</h3>
            <span className={`px-2 py-1 rounded text-xs font-medium ${
              plan.status === 'active' ? 'bg-green-500/20 text-green-400' : 'bg-zinc-700 text-zinc-400'
            }`}>
              {plan.status}
            </span>
          </div>
          <p className="text-sm text-zinc-400 mb-3">{plan.description}</p>
        </div>
        <div className="relative group">
          <button className="p-2 hover:bg-zinc-800 rounded-lg transition-colors">
            <MoreVertical className="w-5 h-5 text-zinc-400" />
          </button>
          <div className="absolute right-0 top-full mt-2 w-48 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
            <button onClick={onEdit} className="w-full px-4 py-2 text-left text-sm text-white hover:bg-zinc-700 flex items-center gap-2">
              <Edit className="w-4 h-4" /> Edit
            </button>
            <button onClick={onDuplicate} className="w-full px-4 py-2 text-left text-sm text-white hover:bg-zinc-700 flex items-center gap-2">
              <Copy className="w-4 h-4" /> Duplicate
            </button>
            <button onClick={onToggleStatus} className="w-full px-4 py-2 text-left text-sm text-white hover:bg-zinc-700 flex items-center gap-2">
              {plan.status === 'active' ? <XCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
              {plan.status === 'active' ? 'Deactivate' : 'Activate'}
            </button>
            <button onClick={onDelete} className="w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-zinc-700 flex items-center gap-2">
              <Trash2 className="w-4 h-4" /> Delete
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-zinc-800/50 rounded-lg p-3">
          <div className="text-xs text-zinc-500 mb-1">Cost per 1K</div>
          <div className="text-lg font-semibold text-white">{formatCurrency(plan.costPerImpression * 1000)}</div>
        </div>
        <div className="bg-zinc-800/50 rounded-lg p-3">
          <div className="text-xs text-zinc-500 mb-1">Impressions/mo</div>
          <div className="text-lg font-semibold text-[#ea580c]">{formatNumber(plan.impressionsPerMonth)}</div>
        </div>
      </div>

      <div className="space-y-2 mb-4">
        {plan.features.slice(0, 3).map((feature, idx) => (
          <div key={idx} className="flex items-center gap-2 text-sm text-zinc-300">
            <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
            {feature}
          </div>
        ))}
        {plan.features.length > 3 && (
          <div className="text-sm text-zinc-500">+{plan.features.length - 3} more features</div>
        )}
      </div>

      <div className="pt-4 border-t border-zinc-800">
        <div className="flex items-center justify-between">
          <div className="text-xs text-zinc-500">Active Advertisers</div>
          <div className="text-lg font-semibold text-white flex items-center gap-1">
            <Megaphone className="w-4 h-4 text-[#ea580c]" />
            {plan.advertiserCount}
          </div>
        </div>
      </div>
    </div>
  );
}

// ===== MAINTENANCE PLAN CARD COMPONENT =====
interface MaintenancePlanCardProps {
  plan: MaintenancePlan;
  onEdit: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onToggleStatus: () => void;
}

function MaintenancePlanCard({ plan, onEdit, onDelete, onDuplicate, onToggleStatus }: MaintenancePlanCardProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  const propertyTypeColors = {
    residential: 'bg-green-500/20 text-green-400',
    commercial: 'bg-blue-500/20 text-blue-400',
    'multi-family': 'bg-purple-500/20 text-purple-400'
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 hover:border-[#ea580c] transition-all group">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-lg font-semibold text-white">{plan.name}</h3>
            <span className={`px-2 py-1 rounded text-xs font-medium ${
              plan.status === 'active' ? 'bg-green-500/20 text-green-400' : 'bg-zinc-700 text-zinc-400'
            }`}>
              {plan.status}
            </span>
            <span className={`px-2 py-1 rounded text-xs font-medium ${propertyTypeColors[plan.propertyType]}`}>
              {plan.propertyType}
            </span>
          </div>
          <p className="text-sm text-zinc-400 mb-3">{plan.description}</p>
        </div>
        <div className="relative group">
          <button className="p-2 hover:bg-zinc-800 rounded-lg transition-colors">
            <MoreVertical className="w-5 h-5 text-zinc-400" />
          </button>
          <div className="absolute right-0 top-full mt-2 w-48 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
            <button onClick={onEdit} className="w-full px-4 py-2 text-left text-sm text-white hover:bg-zinc-700 flex items-center gap-2">
              <Edit className="w-4 h-4" /> Edit
            </button>
            <button onClick={onDuplicate} className="w-full px-4 py-2 text-left text-sm text-white hover:bg-zinc-700 flex items-center gap-2">
              <Copy className="w-4 h-4" /> Duplicate
            </button>
            <button onClick={onToggleStatus} className="w-full px-4 py-2 text-left text-sm text-white hover:bg-zinc-700 flex items-center gap-2">
              {plan.status === 'active' ? <XCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
              {plan.status === 'active' ? 'Deactivate' : 'Activate'}
            </button>
            <button onClick={onDelete} className="w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-zinc-700 flex items-center gap-2">
              <Trash2 className="w-4 h-4" /> Delete
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-zinc-800/50 rounded-lg p-3">
          <div className="text-xs text-zinc-500 mb-1">Monthly Price</div>
          <div className="text-lg font-semibold text-white">{formatCurrency(plan.price)}</div>
        </div>
        <div className="bg-zinc-800/50 rounded-lg p-3">
          <div className="text-xs text-zinc-500 mb-1">Monthly Hours</div>
          <div className="text-lg font-semibold text-[#ea580c]">{plan.monthlyHours} hrs</div>
        </div>
      </div>

      <div className="space-y-2 mb-4">
        {plan.features.slice(0, 3).map((feature, idx) => (
          <div key={idx} className="flex items-center gap-2 text-sm text-zinc-300">
            <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
            {feature}
          </div>
        ))}
        {plan.features.length > 3 && (
          <div className="text-sm text-zinc-500">+{plan.features.length - 3} more features</div>
        )}
      </div>

      <div className="pt-4 border-t border-zinc-800">
        <div className="flex items-center justify-between">
          <div className="text-xs text-zinc-500">Active Clients</div>
          <div className="text-lg font-semibold text-white flex items-center gap-1">
            <Settings className="w-4 h-4 text-[#ea580c]" />
            {plan.clientCount}
          </div>
        </div>
      </div>
    </div>
  );
}

// ===== CONSTRUCTION PLAN CARD COMPONENT =====
interface ConstructionPlanCardProps {
  plan: ConstructionPlan;
  onEdit: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onToggleStatus: () => void;
}

function ConstructionPlanCard({ plan, onEdit, onDelete, onDuplicate, onToggleStatus }: ConstructionPlanCardProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 hover:border-[#ea580c] transition-all group relative">
      {plan.popular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="px-4 py-1 bg-gradient-to-r from-orange-600 to-red-600 text-white text-xs font-bold rounded-full shadow-lg">
            MOST POPULAR
          </span>
        </div>
      )}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-lg font-semibold text-white">{plan.name}</h3>
            <span className={`px-2 py-1 rounded text-xs font-medium ${
              plan.status === 'active' ? 'bg-green-500/20 text-green-400' : 'bg-zinc-700 text-zinc-400'
            }`}>
              {plan.status}
            </span>
          </div>
          <p className="text-sm text-zinc-400 mb-3">{plan.description}</p>
        </div>
        <div className="relative group">
          <button className="p-2 hover:bg-zinc-800 rounded-lg transition-colors">
            <MoreVertical className="w-5 h-5 text-zinc-400" />
          </button>
          <div className="absolute right-0 top-full mt-2 w-48 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
            <button onClick={onEdit} className="w-full px-4 py-2 text-left text-sm text-white hover:bg-zinc-700 flex items-center gap-2">
              <Edit className="w-4 h-4" /> Edit
            </button>
            <button onClick={onDuplicate} className="w-full px-4 py-2 text-left text-sm text-white hover:bg-zinc-700 flex items-center gap-2">
              <Copy className="w-4 h-4" /> Duplicate
            </button>
            <button onClick={onToggleStatus} className="w-full px-4 py-2 text-left text-sm text-white hover:bg-zinc-700 flex items-center gap-2">
              {plan.status === 'active' ? <XCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
              {plan.status === 'active' ? 'Deactivate' : 'Activate'}
            </button>
            <button onClick={onDelete} className="w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-zinc-700 flex items-center gap-2">
              <Trash2 className="w-4 h-4" /> Delete
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-zinc-800/50 rounded-lg p-3">
          <div className="text-xs text-zinc-500 mb-1">Monthly Price</div>
          <div className="text-lg font-semibold text-white">{formatCurrency(plan.price)}</div>
        </div>
        <div className="bg-zinc-800/50 rounded-lg p-3">
          <div className="text-xs text-zinc-500 mb-1">Build Hours</div>
          <div className="text-lg font-semibold text-[#ea580c]">{plan.monthlyHours} hrs</div>
        </div>
      </div>

      <div className="space-y-2 mb-4">
        {plan.features.slice(0, 3).map((feature, idx) => (
          <div key={idx} className="flex items-center gap-2 text-sm text-zinc-300">
            <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
            {feature}
          </div>
        ))}
        {plan.features.length > 3 && (
          <div className="text-sm text-zinc-500">+{plan.features.length - 3} more features</div>
        )}
      </div>

      <div className="pt-4 border-t border-zinc-800">
        <div className="flex items-center justify-between">
          <div className="text-xs text-zinc-500">Active Subscribers</div>
          <div className="text-lg font-semibold text-white flex items-center gap-1">
            <HardHat className="w-4 h-4 text-[#ea580c]" />
            {plan.subscriberCount}
          </div>
        </div>
      </div>
    </div>
  );
}

// ===== CREATE/EDIT MODAL COMPONENT =====
interface CreateEditModalProps {
  viewMode: ViewMode;
  editingItem: any | null;
  onClose: () => void;
  onSave: (item: any) => void;
}

function CreateEditModal({ viewMode, editingItem, onClose, onSave }: CreateEditModalProps) {
  const [formData, setFormData] = useState(editingItem || {});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-6">
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-zinc-900 border-b border-zinc-800 p-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-white">
            {editingItem ? 'Edit' : 'Create'} {viewMode.slice(0, -1).charAt(0).toUpperCase() + viewMode.slice(1, -1)}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-zinc-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          {/* Common Fields */}
          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">Name</label>
              <input
                type="text"
                value={formData.name || ''}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-[#ea580c]"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">Description</label>
              <textarea
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-[#ea580c]"
                required
              />
            </div>
          </div>

          {/* View-specific fields */}
          {viewMode === 'cohorts' && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">Member Count</label>
                  <input
                    type="number"
                    value={formData.memberCount || 0}
                    onChange={(e) => setFormData({ ...formData, memberCount: parseInt(e.target.value) })}
                    className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-[#ea580c]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">Monthly Revenue</label>
                  <input
                    type="number"
                    value={formData.monthlyRevenue || 0}
                    onChange={(e) => setFormData({ ...formData, monthlyRevenue: parseFloat(e.target.value) })}
                    className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-[#ea580c]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">Growth Rate (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.growthRate || 0}
                    onChange={(e) => setFormData({ ...formData, growthRate: parseFloat(e.target.value) })}
                    className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-[#ea580c]"
                    required
                  />
                </div>
              </div>
            </>
          )}

          {viewMode === 'subscriptions' && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">Price</label>
                  <input
                    type="number"
                    value={formData.price || 0}
                    onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) })}
                    className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-[#ea580c]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">Billing Cycle</label>
                  <select
                    value={formData.billingCycle || 'monthly'}
                    onChange={(e) => setFormData({ ...formData, billingCycle: e.target.value })}
                    className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-[#ea580c]"
                  >
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">Subscriber Count</label>
                  <input
                    type="number"
                    value={formData.subscriberCount || 0}
                    onChange={(e) => setFormData({ ...formData, subscriberCount: parseInt(e.target.value) })}
                    className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-[#ea580c]"
                    required
                  />
                </div>
              </div>
            </>
          )}

          {viewMode === 'maintenance' && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">Price ($)</label>
                  <input
                    type="number"
                    value={formData.price || 0}
                    onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) })}
                    className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-[#ea580c]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">Monthly Hours</label>
                  <input
                    type="number"
                    value={formData.monthlyHours || 0}
                    onChange={(e) => setFormData({ ...formData, monthlyHours: parseInt(e.target.value) })}
                    className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-[#ea580c]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">Property Type</label>
                  <select
                    value={formData.propertyType || 'residential'}
                    onChange={(e) => setFormData({ ...formData, propertyType: e.target.value })}
                    className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-[#ea580c]"
                  >
                    <option value="residential">Residential</option>
                    <option value="commercial">Commercial</option>
                    <option value="multi-family">Multi-Family</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">Client Count</label>
                  <input
                    type="number"
                    value={formData.clientCount || 0}
                    onChange={(e) => setFormData({ ...formData, clientCount: parseInt(e.target.value) })}
                    className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-[#ea580c]"
                    required
                  />
                </div>
              </div>
            </>
          )}

          {viewMode === 'vendors' && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">Monthly Fee</label>
                  <input
                    type="number"
                    value={formData.monthlyFee || 0}
                    onChange={(e) => setFormData({ ...formData, monthlyFee: parseFloat(e.target.value) })}
                    className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-[#ea580c]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">Commission Rate (%)</label>
                  <input
                    type="number"
                    value={formData.commissionRate || 0}
                    onChange={(e) => setFormData({ ...formData, commissionRate: parseFloat(e.target.value) })}
                    className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-[#ea580c]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">Vendor Count</label>
                  <input
                    type="number"
                    value={formData.vendorCount || 0}
                    onChange={(e) => setFormData({ ...formData, vendorCount: parseInt(e.target.value) })}
                    className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-[#ea580c]"
                    required
                  />
                </div>
              </div>
            </>
          )}

          {viewMode === 'advertisers' && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">Cost Per Impression</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.costPerImpression || 0}
                    onChange={(e) => setFormData({ ...formData, costPerImpression: parseFloat(e.target.value) })}
                    className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-[#ea580c]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">Advertiser Count</label>
                  <input
                    type="number"
                    value={formData.advertiserCount || 0}
                    onChange={(e) => setFormData({ ...formData, advertiserCount: parseInt(e.target.value) })}
                    className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-[#ea580c]"
                    required
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-zinc-300 mb-2">Impressions Per Month</label>
                  <input
                    type="number"
                    value={formData.impressionsPerMonth || 0}
                    onChange={(e) => setFormData({ ...formData, impressionsPerMonth: parseInt(e.target.value) })}
                    className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-[#ea580c]"
                    required
                  />
                </div>
              </div>
            </>
          )}

          <div className="flex items-center gap-3 pt-4 border-t border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 bg-zinc-800 text-white rounded-lg hover:bg-zinc-700 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-3 bg-[#ea580c] text-white rounded-lg hover:bg-[#dc2626] transition-colors font-medium flex items-center justify-center gap-2"
            >
              <Save className="w-5 h-5" />
              {editingItem ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ===== COHORT SETTINGS MODAL COMPONENT =====
interface CohortSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function CohortSettingsModal({ isOpen, onClose }: CohortSettingsModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-6">
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-zinc-900 border-b border-zinc-800 p-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-white">Cohort Settings</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-zinc-400" />
          </button>
        </div>
        <div className="p-6">
          <p className="text-zinc-400">Settings configuration coming soon...</p>
        </div>
      </div>
    </div>
  );
}