/**
 * Advertising Hub
 * 
 * Central hub for all advertising products, packages, and vendor offerings
 * Features cohort-based dynamic pricing that scales with platform growth
 */

import { useState } from 'react';
import {
  Package, TrendingUp, Users, Zap, Crown, Star, Rocket, Shield,
  Eye, MousePointerClick, BarChart3, Target, DollarSign, Tag,
  Plus, Edit2, Trash2, Copy, Settings, Lock, Unlock, CheckCircle,
  AlertCircle, Info, Sparkles, Megaphone, Gift, Award, Calendar,
  ArrowUpRight, ArrowDownRight, Percent, Clock, MapPin, Layout,
  Image, Video, FileText, Mail, Phone, Building, Globe, Search,
  Filter, Download, Upload, RefreshCw, X, ChevronDown, ChevronRight
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { AdvancedCohortManagement } from './AdvancedCohortManagement';

type ViewMode = 'products' | 'packages' | 'vendor-packages' | 'cohorts' | 'analytics' | 'advanced-cohorts';

interface CohortTier {
  id: string;
  name: string;
  description: string;
  minUsers: number;
  maxUsers: number;
  priceMultiplier: number;
  features: string[];
  color: string;
  bgColor: string;
  active: boolean;
}

interface AdProduct {
  id: string;
  name: string;
  location: string;
  type: 'marquee' | 'banner' | 'logo' | 'video' | 'featured';
  basePrice: number; // Base price at Tier 1
  currentPrice: number; // Current price based on active cohort
  impressionsPerMonth: number;
  avgCTR: string;
  dimensions?: string;
  format: string[];
  icon: any;
  color: string;
  bgColor: string;
  status: 'active' | 'draft' | 'paused';
  cohortTier: string;
}

interface AdPackage {
  id: string;
  name: string;
  description: string;
  tier: 'starter' | 'growth' | 'professional' | 'enterprise';
  basePrice: number;
  currentPrice: number;
  savings: number; // Percentage discount
  products: string[]; // Product IDs
  features: string[];
  popular?: boolean;
  icon: any;
  color: string;
  bgColor: string;
  status: 'active' | 'draft';
  cohortTier: string;
}

interface VendorPackage {
  id: string;
  vendorName: string;
  packageName: string;
  category: 'materials' | 'tools' | 'equipment' | 'services';
  basePrice: number;
  currentPrice: number;
  products: {
    name: string;
    quantity: number;
    unit: string;
  }[];
  adPlacements: string[];
  duration: string;
  icon: any;
  color: string;
  bgColor: string;
  status: 'active' | 'pending' | 'expired';
  cohortTier: string;
}

export default function AdvertisingHub() {
  const [viewMode, setViewMode] = useState<ViewMode>('products');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'draft' | 'paused'>('all');
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [showCohortSettings, setShowCohortSettings] = useState(false);

  // ============================================================================
  // COHORT SYSTEM - Dynamic pricing based on platform growth
  // ============================================================================
  
  const cohortTiers: CohortTier[] = [
    {
      id: 'tier-1',
      name: 'Foundation',
      description: 'Initial launch phase - Building user base',
      minUsers: 0,
      maxUsers: 10000,
      priceMultiplier: 1.0,
      features: [
        'Base pricing',
        'Standard analytics',
        'Email support',
        'Monthly reporting'
      ],
      color: 'text-gray-400',
      bgColor: 'bg-gray-500/10',
      active: false
    },
    {
      id: 'tier-2',
      name: 'Growth',
      description: 'Expanding user base - Increasing reach',
      minUsers: 10001,
      maxUsers: 50000,
      priceMultiplier: 1.25,
      features: [
        '25% price increase',
        'Enhanced analytics',
        'Priority support',
        'Weekly reporting',
        'A/B testing'
      ],
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10',
      active: false
    },
    {
      id: 'tier-3',
      name: 'Scale',
      description: 'Established platform - Premium positioning',
      minUsers: 50001,
      maxUsers: 100000,
      priceMultiplier: 1.5,
      features: [
        '50% price increase',
        'Advanced analytics',
        'Dedicated account manager',
        'Daily reporting',
        'Custom targeting',
        'API access'
      ],
      color: 'text-orange-400',
      bgColor: 'bg-orange-500/10',
      active: true // Currently active tier
    },
    {
      id: 'tier-4',
      name: 'Enterprise',
      description: 'Market leader - Premium audience',
      minUsers: 100001,
      maxUsers: 500000,
      priceMultiplier: 2.0,
      features: [
        '100% price increase',
        'Enterprise analytics',
        'White-glove service',
        'Real-time reporting',
        'Advanced targeting',
        'Dedicated API',
        'Custom integrations'
      ],
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/10',
      active: false
    },
    {
      id: 'tier-5',
      name: 'Premium',
      description: 'Industry dominant - Maximum value',
      minUsers: 500001,
      maxUsers: Infinity,
      priceMultiplier: 3.0,
      features: [
        '200% price increase',
        'Custom analytics',
        'Executive support',
        'Predictive analytics',
        'AI-powered targeting',
        'Custom platform',
        'Revenue guarantees'
      ],
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-500/10',
      active: false
    }
  ];

  const activeCohort = cohortTiers.find(c => c.active) || cohortTiers[2];
  const currentUserCount = 75000; // Would come from actual analytics

  // ============================================================================
  // AD PRODUCTS - Individual placement offerings
  // ============================================================================
  
  const adProducts: AdProduct[] = [
    {
      id: 'landing-header',
      name: 'Landing Page Header Marquee',
      location: 'Public Landing Page',
      type: 'marquee',
      basePrice: 499,
      currentPrice: 499 * activeCohort.priceMultiplier,
      impressionsPerMonth: 50000,
      avgCTR: '3.2%',
      format: ['Text', 'Links', 'Emoji'],
      icon: Globe,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10',
      status: 'active',
      cohortTier: activeCohort.id
    },
    {
      id: 'landing-hero',
      name: 'Landing Page Hero Banner',
      location: 'Public Landing Page',
      type: 'banner',
      basePrice: 899,
      currentPrice: 899 * activeCohort.priceMultiplier,
      impressionsPerMonth: 50000,
      avgCTR: '4.8%',
      dimensions: '1200x400px',
      format: ['Image', 'Video', 'HTML'],
      icon: Image,
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/10',
      status: 'active',
      cohortTier: activeCohort.id
    },
    {
      id: 'subcontractor-header',
      name: 'Subcontractor Portal Header',
      location: 'Subcontractor Portal',
      type: 'marquee',
      basePrice: 399,
      currentPrice: 399 * activeCohort.priceMultiplier,
      impressionsPerMonth: 25000,
      avgCTR: '5.2%',
      format: ['Text', 'Links'],
      icon: Target,
      color: 'text-orange-400',
      bgColor: 'bg-orange-500/10',
      status: 'active',
      cohortTier: activeCohort.id
    },
    {
      id: 'materials-featured',
      name: 'Materials Hub Featured Product',
      location: 'Materials Hub',
      type: 'featured',
      basePrice: 799,
      currentPrice: 799 * activeCohort.priceMultiplier,
      impressionsPerMonth: 20000,
      avgCTR: '9.3%',
      dimensions: '600x400px',
      format: ['Product Listing', 'Image', 'Video'],
      icon: Star,
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-500/10',
      status: 'active',
      cohortTier: activeCohort.id
    },
    {
      id: 'customer-header',
      name: 'Customer Portal Header',
      location: 'Customer Portal',
      type: 'marquee',
      basePrice: 449,
      currentPrice: 449 * activeCohort.priceMultiplier,
      impressionsPerMonth: 35000,
      avgCTR: '4.9%',
      format: ['Text', 'Links'],
      icon: Users,
      color: 'text-cyan-400',
      bgColor: 'bg-cyan-500/10',
      status: 'active',
      cohortTier: activeCohort.id
    }
  ];

  // ============================================================================
  // AD PACKAGES - Bundled offerings
  // ============================================================================
  
  const adPackages: AdPackage[] = [
    {
      id: 'pkg-starter',
      name: 'Starter Package',
      description: 'Perfect for small businesses getting started',
      tier: 'starter',
      basePrice: 999,
      currentPrice: 999 * activeCohort.priceMultiplier,
      savings: 15,
      products: ['landing-header', 'subcontractor-header'],
      features: [
        '2 Premium Placements',
        '75K+ Monthly Impressions',
        'Basic Analytics Dashboard',
        'Email Support',
        'Monthly Performance Reports'
      ],
      icon: Rocket,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10',
      status: 'active',
      cohortTier: activeCohort.id
    },
    {
      id: 'pkg-growth',
      name: 'Growth Package',
      description: 'For growing businesses ready to scale',
      tier: 'growth',
      basePrice: 2499,
      currentPrice: 2499 * activeCohort.priceMultiplier,
      savings: 20,
      products: ['landing-header', 'landing-hero', 'subcontractor-header', 'customer-header'],
      features: [
        '4 Premium Placements',
        '160K+ Monthly Impressions',
        'Advanced Analytics',
        'Priority Support',
        'Weekly Reports',
        'A/B Testing',
        'Custom Targeting'
      ],
      popular: true,
      icon: TrendingUp,
      color: 'text-orange-400',
      bgColor: 'bg-orange-500/10',
      status: 'active',
      cohortTier: activeCohort.id
    },
    {
      id: 'pkg-professional',
      name: 'Professional Package',
      description: 'Maximum visibility across all platforms',
      tier: 'professional',
      basePrice: 4999,
      currentPrice: 4999 * activeCohort.priceMultiplier,
      savings: 25,
      products: ['landing-header', 'landing-hero', 'subcontractor-header', 'materials-featured', 'customer-header'],
      features: [
        '6 Premium Placements',
        '180K+ Monthly Impressions',
        'Premium Analytics Suite',
        'Dedicated Account Manager',
        'Daily Reports',
        'Advanced A/B Testing',
        'Conversion Optimization',
        'Custom Creative Support'
      ],
      icon: Crown,
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/10',
      status: 'active',
      cohortTier: activeCohort.id
    },
    {
      id: 'pkg-enterprise',
      name: 'Enterprise Package',
      description: 'Custom solutions for large organizations',
      tier: 'enterprise',
      basePrice: 9999,
      currentPrice: 9999 * activeCohort.priceMultiplier,
      savings: 30,
      products: ['landing-header', 'landing-hero', 'subcontractor-header', 'materials-featured', 'customer-header'],
      features: [
        'All Premium Placements',
        '300K+ Monthly Impressions',
        'Enterprise Analytics',
        'White-Glove Service',
        'Real-Time Reporting',
        'AI-Powered Optimization',
        'Custom Integrations',
        'Revenue Guarantees',
        'Quarterly Strategy Sessions'
      ],
      icon: Shield,
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-500/10',
      status: 'active',
      cohortTier: activeCohort.id
    }
  ];

  // ============================================================================
  // VENDOR PACKAGES - Vendor-specific advertising bundles
  // ============================================================================
  
  const vendorPackages: VendorPackage[] = [
    {
      id: 'vendor-homedepot',
      vendorName: 'Home Depot',
      packageName: 'Pro Builder Spotlight',
      category: 'materials',
      basePrice: 1499,
      currentPrice: 1499 * activeCohort.priceMultiplier,
      products: [
        { name: 'Lumber & Building Materials', quantity: 1, unit: 'category' },
        { name: 'Tools & Hardware', quantity: 1, unit: 'category' },
        { name: 'Featured Products', quantity: 5, unit: 'products' }
      ],
      adPlacements: ['materials-featured', 'subcontractor-header'],
      duration: '3 months',
      icon: Building,
      color: 'text-orange-400',
      bgColor: 'bg-orange-500/10',
      status: 'active',
      cohortTier: activeCohort.id
    },
    {
      id: 'vendor-dewalt',
      vendorName: 'DeWalt Tools',
      packageName: 'Power Tools Premium',
      category: 'tools',
      basePrice: 999,
      currentPrice: 999 * activeCohort.priceMultiplier,
      products: [
        { name: 'Power Tool Category', quantity: 1, unit: 'category' },
        { name: 'Featured Products', quantity: 3, unit: 'products' }
      ],
      adPlacements: ['subcontractor-header', 'materials-featured'],
      duration: '6 months',
      icon: Zap,
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-500/10',
      status: 'active',
      cohortTier: activeCohort.id
    },
    {
      id: 'vendor-johndeere',
      vendorName: 'John Deere',
      packageName: 'Equipment Showcase',
      category: 'equipment',
      basePrice: 2499,
      currentPrice: 2499 * activeCohort.priceMultiplier,
      products: [
        { name: 'Heavy Equipment', quantity: 1, unit: 'category' },
        { name: 'Landscaping Equipment', quantity: 1, unit: 'category' },
        { name: 'Featured Products', quantity: 8, unit: 'products' }
      ],
      adPlacements: ['landing-hero', 'subcontractor-header', 'materials-featured'],
      duration: '12 months',
      icon: Package,
      color: 'text-green-400',
      bgColor: 'bg-green-500/10',
      status: 'active',
      cohortTier: activeCohort.id
    }
  ];

  const filteredProducts = adProducts.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         p.location.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || p.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const filteredPackages = adPackages.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         p.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || p.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const filteredVendorPackages = vendorPackages.filter(p => {
    const matchesSearch = p.vendorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         p.packageName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || p.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const getTotalRevenue = () => {
    const productsRevenue = adProducts.reduce((sum, p) => sum + p.currentPrice, 0);
    const packagesRevenue = adPackages.reduce((sum, p) => sum + p.currentPrice, 0);
    const vendorRevenue = vendorPackages.reduce((sum, p) => sum + p.currentPrice, 0);
    return productsRevenue + packagesRevenue + vendorRevenue;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-600 to-orange-700 flex items-center justify-center">
              <Megaphone className="w-6 h-6 text-white" />
            </div>
            Advertising Hub
          </h2>
          <p className="text-gray-400">
            Manage all advertising products, packages, and vendor offerings
          </p>
        </div>

        <button
          onClick={() => setShowCohortSettings(!showCohortSettings)}
          className="px-4 py-2 bg-[#1A1A1A] border border-[#2A2A2A] hover:border-orange-500/30 text-gray-300 font-semibold rounded-lg transition flex items-center gap-2"
        >
          <Settings className="w-4 h-4" />
          Cohort Settings
        </button>
      </div>

      {/* Active Cohort Banner */}
      <div className="bg-[#0A0A0A] border border-orange-500/30 rounded-xl p-4 flex items-center justify-between hover:border-orange-500 hover:shadow-lg hover:shadow-orange-500/20 transition-all duration-300">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-[#1A1A1A] border border-orange-500/30 flex items-center justify-center">
            <TrendingUp className="w-6 h-6 text-orange-400" />
          </div>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h3 className="text-white font-bold">{activeCohort.name} Tier Active</h3>
              <span className="px-2 py-1 bg-orange-600 text-white text-xs font-bold rounded-full">
                {activeCohort.priceMultiplier}x
              </span>
            </div>
            <p className="text-sm text-gray-400">
              {currentUserCount.toLocaleString()} users • Prices multiplied by {activeCohort.priceMultiplier}x • {activeCohort.description}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-white">
            ${getTotalRevenue().toLocaleString()}<span className="text-sm text-gray-400">/mo</span>
          </p>
          <p className="text-xs text-gray-400">Total Revenue Potential</p>
        </div>
      </div>

      {/* Cohort Settings Panel */}
      {showCohortSettings && (
        <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-white">Cohort Pricing Tiers</h3>
            <button
              onClick={() => setShowCohortSettings(false)}
              className="p-2 hover:bg-[#2A2A2A] rounded-lg transition"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          <div className="space-y-3">
            {cohortTiers.map(tier => (
              <div
                key={tier.id}
                className={`bg-[#0A0A0A] border-2 rounded-xl p-4 transition-all duration-300 cursor-pointer ${
                  tier.active
                    ? 'border-orange-500 shadow-lg shadow-orange-500/20'
                    : 'border-[#2A2A2A] hover:border-orange-500/50 hover:shadow-lg hover:shadow-orange-500/10'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg bg-[#1A1A1A] border transition-all duration-300 ${
                      tier.active ? 'border-orange-500/50' : 'border-[#2A2A2A]'
                    } flex items-center justify-center`}>
                      <span className={`font-bold ${tier.color}`}>{tier.priceMultiplier}x</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-white font-bold">{tier.name}</h4>
                        {tier.active && (
                          <span className="px-2 py-0.5 bg-orange-600 text-white text-xs font-bold rounded-full">
                            ACTIVE
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-400">{tier.description}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-white">
                      {tier.minUsers.toLocaleString()} - {tier.maxUsers === Infinity ? '∞' : tier.maxUsers.toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-400">Users</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {tier.features.map((feature, idx) => (
                    <span key={idx} className="px-2 py-1 bg-[#1A1A1A] border border-[#2A2A2A] text-gray-400 text-xs rounded-full">
                      {feature}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-gray-300">
                <p className="font-semibold text-white mb-1">How Cohort Pricing Works:</p>
                <p>As the platform grows and gains more users, pricing automatically adjusts to reflect the increased value and reach. This ensures fair pricing as your ad campaigns reach larger, more engaged audiences.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-[#2A2A2A] overflow-x-auto">
        {[
          { id: 'products', label: 'Ad Products', icon: Target, count: adProducts.length },
          { id: 'packages', label: 'Packages', icon: Package, count: adPackages.length },
          { id: 'vendor-packages', label: 'Vendor Packages', icon: Building, count: vendorPackages.length },
          { id: 'cohorts', label: 'Cohort System', icon: TrendingUp },
          { id: 'advanced-cohorts', label: 'Advanced Cohort Management', icon: Settings, badge: 'NEW' },
          { id: 'analytics', label: 'Analytics', icon: BarChart3 }
        ].map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setViewMode(tab.id as ViewMode)}
              className={`flex items-center gap-2 px-4 py-3 font-semibold border-b-2 transition whitespace-nowrap ${
                viewMode === tab.id
                  ? 'border-orange-500 text-orange-400'
                  : 'border-transparent text-gray-400 hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
              {tab.count && (
                <span className="px-2 py-0.5 bg-[#1A1A1A] border border-[#2A2A2A] text-gray-400 text-xs rounded-full">
                  {tab.count}
                </span>
              )}
              {tab.badge && (
                <span className="px-2 py-0.5 bg-gradient-to-r from-orange-600 to-orange-700 text-white text-xs font-bold rounded-full animate-pulse">
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Search & Filters */}
      {(viewMode === 'products' || viewMode === 'packages' || viewMode === 'vendor-packages') && (
        <div className="flex items-center gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search..."
              className="w-full pl-11 pr-4 py-2 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg text-white placeholder-gray-500 focus:border-orange-500 outline-none transition"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            className="px-4 py-2 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg text-white focus:border-orange-500 outline-none transition"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="draft">Draft</option>
            <option value="paused">Paused</option>
          </select>
          <button className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-lg transition flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Add New
          </button>
        </div>
      )}

      {/* Content Views */}
      {viewMode === 'products' && (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProducts.map(product => {
            const Icon = product.icon;
            const borderColor = product.color.replace('text-', 'border-').replace('-400', '-500/30');
            const hoverBorderColor = product.color.replace('text-', 'border-').replace('-400', '-500');
            const shadowColor = product.color.replace('text-', 'shadow-').replace('-400', '-500/20');
            
            return (
              <div
                key={product.id}
                className={`bg-[#0A0A0A] border ${borderColor} rounded-xl p-5 hover:${hoverBorderColor} hover:shadow-lg hover:${shadowColor} transition-all duration-300 cursor-pointer`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className={`w-12 h-12 rounded-xl bg-[#1A1A1A] border ${borderColor} flex items-center justify-center`}>
                    <Icon className={`w-6 h-6 ${product.color}`} />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 text-xs font-bold rounded-full border ${
                      product.status === 'active' ? 'bg-[#0A0A0A] border-green-500/30 text-green-400' :
                      product.status === 'draft' ? 'bg-[#0A0A0A] border-gray-500/30 text-gray-400' :
                      'bg-[#0A0A0A] border-yellow-500/30 text-yellow-400'
                    }`}>
                      {product.status.toUpperCase()}
                    </span>
                  </div>
                </div>

                <h3 className="text-white font-bold mb-1">{product.name}</h3>
                <p className="text-sm text-gray-400 mb-4">{product.location}</p>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Base Price:</span>
                    <span className="text-gray-400 line-through">${product.basePrice}/mo</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Current Price:</span>
                    <span className="text-orange-400 font-bold text-lg">${product.currentPrice.toLocaleString()}/mo</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Impressions:</span>
                    <span className="text-white font-semibold">{product.impressionsPerMonth.toLocaleString()}/mo</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Avg CTR:</span>
                    <span className="text-green-400 font-semibold">{product.avgCTR}</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button className="flex-1 px-3 py-2 bg-[#1A1A1A] border border-[#2A2A2A] hover:border-orange-500/50 text-gray-300 hover:text-white font-semibold rounded-lg transition-all duration-300 flex items-center justify-center gap-2 text-sm">
                    <Edit2 className="w-4 h-4" />
                    Edit
                  </button>
                  <button className="px-3 py-2 bg-[#1A1A1A] border border-[#2A2A2A] hover:border-orange-500/50 text-gray-300 hover:text-white font-semibold rounded-lg transition-all duration-300">
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {viewMode === 'packages' && (
        <div className="grid md:grid-cols-2 gap-6">
          {filteredPackages.map(pkg => {
            const Icon = pkg.icon;
            const borderColor = pkg.color.replace('text-', 'border-').replace('-400', '-500/30');
            const hoverBorderColor = pkg.color.replace('text-', 'border-').replace('-400', '-500');
            const shadowColor = pkg.color.replace('text-', 'shadow-').replace('-400', '-500/20');
            
            return (
              <div
                key={pkg.id}
                className={`bg-[#0A0A0A] border-2 rounded-xl p-6 transition-all duration-300 cursor-pointer ${
                  pkg.popular
                    ? `border-orange-500 shadow-lg shadow-orange-500/20`
                    : `${borderColor} hover:${hoverBorderColor} hover:shadow-lg hover:${shadowColor}`
                }`}
              >
                {pkg.popular && (
                  <div className="mb-4">
                    <span className="px-3 py-1 bg-gradient-to-r from-orange-600 to-orange-700 text-white text-xs font-bold rounded-full">
                      ⭐ MOST POPULAR
                    </span>
                  </div>
                )}

                <div className="flex items-start justify-between mb-4">
                  <div className={`w-14 h-14 rounded-xl bg-[#1A1A1A] border ${pkg.popular ? 'border-orange-500/50' : borderColor} flex items-center justify-center`}>
                    <Icon className={`w-7 h-7 ${pkg.color}`} />
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-400 line-through">${pkg.basePrice}/mo</p>
                    <p className="text-3xl font-bold text-white">${pkg.currentPrice.toLocaleString()}</p>
                    <p className="text-xs text-green-400 font-semibold">Save {pkg.savings}%</p>
                  </div>
                </div>

                <h3 className="text-xl font-bold text-white mb-2">{pkg.name}</h3>
                <p className="text-gray-400 mb-4">{pkg.description}</p>

                <div className="space-y-2 mb-4">
                  {pkg.features.map((feature, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-sm">
                      <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                      <span className="text-gray-300">{feature}</span>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2 pt-4 border-t border-[#2A2A2A]">
                  <button className="flex-1 px-4 py-2 bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 text-white font-bold rounded-lg transition-all duration-300 shadow-lg shadow-orange-500/20 hover:shadow-orange-500/40">
                    View Details
                  </button>
                  <button className="px-4 py-2 bg-[#1A1A1A] border border-[#2A2A2A] hover:border-orange-500/50 text-gray-300 hover:text-white font-semibold rounded-lg transition-all duration-300">
                    <Edit2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {viewMode === 'vendor-packages' && (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredVendorPackages.map(vendor => {
            const Icon = vendor.icon;
            const borderColor = vendor.color.replace('text-', 'border-').replace('-400', '-500/30');
            const hoverBorderColor = vendor.color.replace('text-', 'border-').replace('-400', '-500');
            const shadowColor = vendor.color.replace('text-', 'shadow-').replace('-400', '-500/20');
            
            return (
              <div
                key={vendor.id}
                className={`bg-[#0A0A0A] border ${borderColor} rounded-xl p-5 hover:${hoverBorderColor} hover:shadow-lg hover:${shadowColor} transition-all duration-300 cursor-pointer`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className={`w-12 h-12 rounded-xl bg-[#1A1A1A] border ${borderColor} flex items-center justify-center`}>
                    <Icon className={`w-6 h-6 ${vendor.color}`} />
                  </div>
                  <span className={`px-2 py-1 text-xs font-bold rounded-full border ${
                    vendor.status === 'active' ? 'bg-[#0A0A0A] border-green-500/30 text-green-400' :
                    vendor.status === 'pending' ? 'bg-[#0A0A0A] border-yellow-500/30 text-yellow-400' :
                    'bg-[#0A0A0A] border-gray-500/30 text-gray-400'
                  }`}>
                    {vendor.status.toUpperCase()}
                  </span>
                </div>

                <h3 className="text-white font-bold mb-1">{vendor.vendorName}</h3>
                <p className="text-sm text-orange-400 font-semibold mb-4">{vendor.packageName}</p>

                <div className="space-y-2 mb-4">
                  <div className="text-sm">
                    <p className="text-gray-500 mb-1">Products:</p>
                    {vendor.products.map((product, idx) => (
                      <div key={idx} className="text-gray-300 flex items-center justify-between">
                        <span>{product.name}</span>
                        <span className="text-gray-500">{product.quantity} {product.unit}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center justify-between text-sm pt-2 border-t border-[#2A2A2A]">
                    <span className="text-gray-500">Duration:</span>
                    <span className="text-white font-semibold">{vendor.duration}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Base Price:</span>
                    <span className="text-gray-400 line-through">${vendor.basePrice}/mo</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Current Price:</span>
                    <span className="text-orange-400 font-bold text-lg">${vendor.currentPrice.toLocaleString()}/mo</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button className="flex-1 px-3 py-2 bg-[#1A1A1A] border border-[#2A2A2A] hover:border-orange-500/50 text-gray-300 hover:text-white font-semibold rounded-lg transition-all duration-300 text-sm">
                    View Details
                  </button>
                  <button className="px-3 py-2 bg-[#1A1A1A] border border-[#2A2A2A] hover:border-orange-500/50 text-gray-300 hover:text-white font-semibold rounded-lg transition-all duration-300">
                    <Edit2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {viewMode === 'cohorts' && (
        <div className="space-y-6">
          {/* Cohort Tiers */}
          <div className="space-y-4">
            {cohortTiers.map(tier => {
              const borderColor = tier.color.replace('text-', 'border-').replace('-400', '-500/30');
              const hoverBorderColor = tier.color.replace('text-', 'border-').replace('-400', '-500');
              const shadowColor = tier.color.replace('text-', 'shadow-').replace('-400', '-500/20');
              
              return (
                <div
                  key={tier.id}
                  className={`bg-[#0A0A0A] border-2 rounded-xl p-6 transition-all duration-300 cursor-pointer ${
                    tier.active
                      ? 'border-orange-500 shadow-lg shadow-orange-500/20'
                      : `${borderColor} hover:${hoverBorderColor} hover:shadow-lg hover:${shadowColor}`
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`w-16 h-16 rounded-xl bg-[#1A1A1A] border transition-all duration-300 ${
                        tier.active ? 'border-orange-500/50' : borderColor
                      } flex items-center justify-center`}>
                        <span className={`text-2xl font-bold ${tier.color}`}>{tier.priceMultiplier}x</span>
                      </div>
                      <div>
                        <div className="flex items-center gap-3 mb-1">
                          <h3 className="text-xl font-bold text-white">{tier.name}</h3>
                          {tier.active && (
                            <span className="px-3 py-1 bg-orange-600 text-white text-xs font-bold rounded-full animate-pulse">
                              CURRENTLY ACTIVE
                            </span>
                          )}
                        </div>
                        <p className="text-gray-400 mb-2">{tier.description}</p>
                        <p className="text-sm text-gray-500">
                          {tier.minUsers.toLocaleString()} - {tier.maxUsers === Infinity ? '∞' : tier.maxUsers.toLocaleString()} users
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {tier.features.map((feature, idx) => (
                      <span key={idx} className="px-3 py-1 bg-[#1A1A1A] border border-[#2A2A2A] text-gray-400 text-sm rounded-lg">
                        {feature}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {viewMode === 'analytics' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-[#0A0A0A] border border-blue-500/30 rounded-xl p-4 hover:border-blue-500 hover:shadow-lg hover:shadow-blue-500/20 transition-all duration-300 cursor-pointer">
              <BarChart3 className="w-5 h-5 text-blue-400 mb-2" />
              <p className="text-2xl font-bold text-white">${getTotalRevenue().toLocaleString()}</p>
              <p className="text-sm text-gray-400">Total Revenue/Month</p>
            </div>
            <div className="bg-[#0A0A0A] border border-green-500/30 rounded-xl p-4 hover:border-green-500 hover:shadow-lg hover:shadow-green-500/20 transition-all duration-300 cursor-pointer">
              <Package className="w-5 h-5 text-green-400 mb-2" />
              <p className="text-2xl font-bold text-white">{adProducts.length + adPackages.length + vendorPackages.length}</p>
              <p className="text-sm text-gray-400">Total Offerings</p>
            </div>
            <div className="bg-[#0A0A0A] border border-orange-500/30 rounded-xl p-4 hover:border-orange-500 hover:shadow-lg hover:shadow-orange-500/20 transition-all duration-300 cursor-pointer">
              <TrendingUp className="w-5 h-5 text-orange-400 mb-2" />
              <p className="text-2xl font-bold text-white">{activeCohort.priceMultiplier}x</p>
              <p className="text-sm text-gray-400">Active Multiplier</p>
            </div>
            <div className="bg-[#0A0A0A] border border-purple-500/30 rounded-xl p-4 hover:border-purple-500 hover:shadow-lg hover:shadow-purple-500/20 transition-all duration-300 cursor-pointer">
              <Users className="w-5 h-5 text-purple-400 mb-2" />
              <p className="text-2xl font-bold text-white">{currentUserCount.toLocaleString()}</p>
              <p className="text-sm text-gray-400">Platform Users</p>
            </div>
          </div>

          <div className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl p-6 hover:border-orange-500/30 hover:shadow-lg hover:shadow-orange-500/10 transition-all duration-300">
            <h3 className="text-lg font-bold text-white mb-4">Revenue Breakdown</h3>
            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-400">Ad Products</span>
                  <span className="text-white font-bold">
                    ${adProducts.reduce((sum, p) => sum + p.currentPrice, 0).toLocaleString()}/mo
                  </span>
                </div>
                <div className="h-2 bg-[#1A1A1A] rounded-full overflow-hidden border border-[#2A2A2A]">
                  <div className="h-full bg-gradient-to-r from-blue-600 to-blue-500 shadow-lg shadow-blue-500/50" style={{ width: '35%' }} />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-400">Packages</span>
                  <span className="text-white font-bold">
                    ${adPackages.reduce((sum, p) => sum + p.currentPrice, 0).toLocaleString()}/mo
                  </span>
                </div>
                <div className="h-2 bg-[#1A1A1A] rounded-full overflow-hidden border border-[#2A2A2A]">
                  <div className="h-full bg-gradient-to-r from-orange-600 to-orange-500 shadow-lg shadow-orange-500/50" style={{ width: '50%' }} />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-400">Vendor Packages</span>
                  <span className="text-white font-bold">
                    ${vendorPackages.reduce((sum, p) => sum + p.currentPrice, 0).toLocaleString()}/mo
                  </span>
                </div>
                <div className="h-2 bg-[#1A1A1A] rounded-full overflow-hidden border border-[#2A2A2A]">
                  <div className="h-full bg-gradient-to-r from-green-600 to-green-500 shadow-lg shadow-green-500/50" style={{ width: '15%' }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Advanced Cohort Management View */}
      {viewMode === 'advanced-cohorts' && (
        <AdvancedCohortManagement />
      )}
    </div>
  );
}