/**
 * Vendor Advertising Management Component
 * For use within Subscription Hub - Vendor Tab
 * Complete advertising package and product catalog management
 */

import { useState } from 'react';
import {
  Package, Crown, Star, Edit, Trash2, Plus, Eye, ShoppingCart, 
  TrendingUp, Activity, Target, Grid, List, Search, Check, X,
  Upload, Image as ImageIcon, Tag, Zap, Rocket, ArrowRight,
  BarChart3, ChevronRight, AlertCircle, CheckCircle
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { ChartContainer } from './ChartContainer';

interface VendorAdvertisingData {
  vendorId: string;
  vendorName: string;
  currentPackage: 'basic' | 'professional' | 'enterprise';
  packageExpiry: string;
  totalProducts: number;
  activeAds: number;
  monthlyReach: number;
  conversionRate: number;
}

interface Product {
  id: string;
  name: string;
  category: string;
  sku: string;
  price: number;
  unit: string;
  inStock: boolean;
  stockQuantity: number;
  description: string;
  imageUrl: string;
  featured: boolean;
  materialsListEnabled: boolean;
  specifications?: any;
  tags: string[];
  views: number;
  orders: number;
}

interface AdvertisingPackage {
  id: string;
  name: string;
  icon: any;
  price: number;
  interval: string;
  color: string;
  popular?: boolean;
  features: string[];
  adPlacements: string[];
  limits: {
    products: number;
    bannerAds: number;
    featuredProducts: number;
    videoAds: number;
    materialsListPriority: 'standard' | 'high' | 'premium';
  };
}

interface VendorAdvertisingManagementProps {
  vendorId: string;
  onClose?: () => void;
}

export default function VendorAdvertisingManagement({ vendorId, onClose }: VendorAdvertisingManagementProps) {
  const [activeView, setActiveView] = useState<'overview' | 'packages' | 'products'>('overview');
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showProductModal, setShowProductModal] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [productViewMode, setProductViewMode] = useState<'grid' | 'list'>('grid');

  // Load vendor data from localStorage
  const loadVendorData = (): VendorAdvertisingData => {
    const stored = localStorage.getItem(`vendor_advertising_${vendorId}`);
    if (stored) {
      return JSON.parse(stored);
    }
    // Default data
    return {
      vendorId,
      vendorName: 'Sample Vendor',
      currentPackage: 'basic',
      packageExpiry: '2026-12-31',
      totalProducts: 0,
      activeAds: 0,
      monthlyReach: 0,
      conversionRate: 0
    };
  };

  const [vendorData, setVendorData] = useState<VendorAdvertisingData>(loadVendorData());

  // Load products from localStorage
  const loadProducts = (): Product[] => {
    const stored = localStorage.getItem(`vendor_products_${vendorId}`);
    return stored ? JSON.parse(stored) : [];
  };

  const [products, setProducts] = useState<Product[]>(loadProducts());

  // Save vendor data to localStorage
  const saveVendorData = (data: VendorAdvertisingData) => {
    localStorage.setItem(`vendor_advertising_${vendorId}`, JSON.stringify(data));
    setVendorData(data);
  };

  // Save products to localStorage
  const saveProducts = (prods: Product[]) => {
    localStorage.setItem(`vendor_products_${vendorId}`, JSON.stringify(prods));
    setProducts(prods);
  };

  // Advertising Packages
  const advertisingPackages: AdvertisingPackage[] = [
    {
      id: 'basic',
      name: 'Basic',
      icon: Package,
      price: 99,
      interval: 'month',
      color: 'from-gray-600 to-gray-700',
      features: [
        '1 Featured Banner Ad',
        'Up to 25 Products in Catalog',
        'Basic Analytics Dashboard',
        'Standard Support',
        'Company Profile Page',
        'Email Notifications'
      ],
      adPlacements: ['Footer Banner (Homepage)'],
      limits: {
        products: 25,
        bannerAds: 1,
        featuredProducts: 3,
        videoAds: 0,
        materialsListPriority: 'standard'
      }
    },
    {
      id: 'professional',
      name: 'Professional',
      icon: Star,
      price: 299,
      interval: 'month',
      color: 'from-blue-600 to-blue-700',
      popular: true,
      features: [
        '5 Premium Ad Placements',
        'Up to 100 Products in Catalog',
        'Advanced Analytics & Insights',
        'Priority Support',
        'Enhanced Profile with Video',
        'Featured in Materials Lists',
        'Customer Review Management',
        'Monthly Performance Reports'
      ],
      adPlacements: [
        'Homepage Hero Banner',
        'Dashboard Sidebar',
        'Work Orders Page Banner',
        'Materials Hub Sidebar',
        'Footer Banner (All Pages)'
      ],
      limits: {
        products: 100,
        bannerAds: 5,
        featuredProducts: 15,
        videoAds: 2,
        materialsListPriority: 'high'
      }
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      icon: Crown,
      price: 799,
      interval: 'month',
      color: 'from-orange-600 to-orange-700',
      features: [
        'Unlimited Ad Placements',
        'Unlimited Products in Catalog',
        'Real-Time Analytics & AI Insights',
        'Dedicated Account Manager',
        'Custom Video Production Support',
        'Top Priority in Materials Lists',
        'API Access for Integration',
        'White-Label Product Pages',
        'Exclusive Vendor Badge',
        'Featured Newsletter Placement',
        'Custom Landing Pages',
        'A/B Testing Tools'
      ],
      adPlacements: [
        'All Professional Placements',
        'Project Detail Page Banners',
        'Invoice Page Banners',
        'Customer Portal Ads',
        'Email Newsletter Placement',
        'Mobile App Splash Screen',
        'Search Results Sponsored Listings'
      ],
      limits: {
        products: 999999,
        bannerAds: 999,
        featuredProducts: 999,
        videoAds: 10,
        materialsListPriority: 'premium'
      }
    }
  ];

  // Performance data
  const performanceData = [
    { month: 'Aug', impressions: 38000, clicks: 1140, conversions: 45 },
    { month: 'Sep', impressions: 42000, clicks: 1260, conversions: 52 },
    { month: 'Oct', impressions: 39000, clicks: 1170, conversions: 48 },
    { month: 'Nov', impressions: 45000, clicks: 1350, conversions: 58 },
    { month: 'Dec', impressions: 48000, clicks: 1440, conversions: 62 },
    { month: 'Jan', impressions: 52000, clicks: 1560, conversions: 68 }
  ];

  const currentPackage = advertisingPackages.find(p => p.id === vendorData.currentPackage);

  const handleUpgradePackage = (packageId: string) => {
    const pkg = advertisingPackages.find(p => p.id === packageId);
    if (pkg) {
      const updatedData = {
        ...vendorData,
        currentPackage: packageId as 'basic' | 'professional' | 'enterprise'
      };
      saveVendorData(updatedData);
      toast.success(`Upgraded to ${pkg.name} package!`);
      setShowUpgradeModal(false);
    }
  };

  const handleSaveProduct = (productData: any) => {
    if (editingProduct) {
      const updatedProducts = products.map(p => 
        p.id === editingProduct.id ? { ...p, ...productData } : p
      );
      saveProducts(updatedProducts);
      toast.success('Product updated successfully!');
    } else {
      const newProduct: Product = {
        id: `PROD-${Date.now()}`,
        ...productData,
        views: 0,
        orders: 0
      };
      saveProducts([...products, newProduct]);
      
      // Update vendor data product count
      const updatedData = {
        ...vendorData,
        totalProducts: products.length + 1
      };
      saveVendorData(updatedData);
      
      toast.success('Product added successfully!');
    }
    setShowProductModal(false);
    setEditingProduct(null);
  };

  const handleDeleteProduct = (productId: string) => {
    const updatedProducts = products.filter(p => p.id !== productId);
    saveProducts(updatedProducts);
    
    // Update vendor data product count
    const updatedData = {
      ...vendorData,
      totalProducts: updatedProducts.length
    };
    saveVendorData(updatedData);
    
    toast.success('Product deleted');
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.sku.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold text-white mb-1">Advertising & Product Management</h3>
          <p className="text-sm text-gray-400">Manage advertising packages and product catalog</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-[#0F0F0F] border border-[#2A2A2A] rounded-lg px-3 py-2">
            <p className="text-xs text-gray-400">Current Plan</p>
            <p className="text-sm font-bold text-orange-400">{currentPackage?.name}</p>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 hover:bg-[#2A2A2A] rounded-lg transition"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          )}
        </div>
      </div>

      {/* Navigation */}
      <div className="space-y-3">
        {[
          { id: 'overview', label: 'Overview', icon: BarChart3, color: 'blue', description: 'Stats & Analytics' },
          { id: 'packages', label: 'Packages', icon: Crown, color: 'purple', description: 'Subscription Tiers' },
          { id: 'products', label: 'Products', icon: Package, color: 'green', description: 'Catalog Management' }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeView === tab.id;
          
          // Color configurations
          const colorConfig = {
            blue: {
              active: 'bg-gradient-to-r from-blue-500 via-cyan-500 to-blue-600 text-white shadow-2xl shadow-blue-500/50 scale-105 border-2 border-blue-400/50',
              inactive: 'bg-gradient-to-r from-blue-600/10 to-cyan-600/10 text-gray-300 hover:from-blue-600/20 hover:to-cyan-600/20 hover:text-white border-2 border-blue-500/30 hover:border-blue-400/50 hover:shadow-lg hover:shadow-blue-500/30 hover:scale-102',
              iconBg: isActive ? 'bg-white/20' : 'bg-blue-500/20'
            },
            purple: {
              active: 'bg-gradient-to-r from-purple-500 via-pink-500 to-purple-600 text-white shadow-2xl shadow-purple-500/50 scale-105 border-2 border-purple-400/50',
              inactive: 'bg-gradient-to-r from-purple-600/10 to-pink-600/10 text-gray-300 hover:from-purple-600/20 hover:to-pink-600/20 hover:text-white border-2 border-purple-500/30 hover:border-purple-400/50 hover:shadow-lg hover:shadow-purple-500/30 hover:scale-102',
              iconBg: isActive ? 'bg-white/20' : 'bg-purple-500/20'
            },
            green: {
              active: 'bg-gradient-to-r from-green-500 via-emerald-500 to-green-600 text-white shadow-2xl shadow-green-500/50 scale-105 border-2 border-green-400/50',
              inactive: 'bg-gradient-to-r from-green-600/10 to-emerald-600/10 text-gray-300 hover:from-green-600/20 hover:to-emerald-600/20 hover:text-white border-2 border-green-500/30 hover:border-green-400/50 hover:shadow-lg hover:shadow-green-500/30 hover:scale-102',
              iconBg: isActive ? 'bg-white/20' : 'bg-green-500/20'
            }
          };
          
          const colors = colorConfig[tab.color as keyof typeof colorConfig];
          
          return (
            <button
              key={tab.id}
              onClick={() => setActiveView(tab.id as any)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ${
                isActive ? colors.active : colors.inactive
              }`}
            >
              <div className={`p-2 rounded-lg ${colors.iconBg}`}>
                <Icon className="w-5 h-5" />
              </div>
              <div className="flex-1 text-left">
                <div className="text-sm font-bold flex items-center gap-2">
                  {tab.label}
                  {isActive && <span className="text-xs">✨</span>}
                </div>
                <div className="text-xs opacity-90">{tab.description}</div>
              </div>
              <ChevronRight className="w-5 h-5" />
            </button>
          );
        })}
      </div>

      {/* Overview */}
      {activeView === 'overview' && (
        <div className="space-y-4">
          {/* Stats */}
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-[#0A0A0A] border border-orange-500/30 rounded-lg p-4 text-white hover:border-orange-500 hover:shadow-lg hover:shadow-orange-500/20 transition-all duration-300 cursor-pointer">
              <Eye className="w-6 h-6 mb-2 text-orange-400" />
              <p className="text-2xl font-bold mb-1">{vendorData.monthlyReach.toLocaleString()}</p>
              <p className="text-xs text-gray-400">Monthly Reach</p>
            </div>
            <div className="bg-[#0A0A0A] border border-blue-500/30 rounded-lg p-4 text-white hover:border-blue-500 hover:shadow-lg hover:shadow-blue-500/20 transition-all duration-300 cursor-pointer">
              <Activity className="w-6 h-6 mb-2 text-blue-400" />
              <p className="text-2xl font-bold mb-1">{vendorData.activeAds}</p>
              <p className="text-xs text-gray-400">Active Ads</p>
            </div>
            <div className="bg-[#0A0A0A] border border-green-500/30 rounded-lg p-4 text-white hover:border-green-500 hover:shadow-lg hover:shadow-green-500/20 transition-all duration-300 cursor-pointer">
              <Package className="w-6 h-6 mb-2 text-green-400" />
              <p className="text-2xl font-bold mb-1">{vendorData.totalProducts}</p>
              <p className="text-xs text-gray-400">Products</p>
            </div>
            <div className="bg-[#0A0A0A] border border-purple-500/30 rounded-lg p-4 text-white hover:border-purple-500 hover:shadow-lg hover:shadow-purple-500/20 transition-all duration-300 cursor-pointer">
              <Target className="w-6 h-6 mb-2 text-purple-400" />
              <p className="text-2xl font-bold mb-1">{vendorData.conversionRate}%</p>
              <p className="text-xs text-gray-400">Conversion</p>
            </div>
          </div>

          {/* Package Info */}
          <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="font-bold text-white mb-1">Current Package: {currentPackage?.name}</h4>
                <p className="text-xs text-gray-400">Expires: {vendorData.packageExpiry}</p>
              </div>
              <button
                onClick={() => setActiveView('packages')}
                className="px-4 py-2 rounded-xl transition-all duration-300 bg-gradient-to-r from-orange-600/10 to-red-600/10 text-gray-300 hover:from-orange-600/20 hover:to-red-600/20 hover:text-white border-2 border-orange-500/30 hover:border-orange-400/50 hover:shadow-lg hover:shadow-orange-500/30 hover:scale-102 flex items-center gap-2 font-bold text-sm"
              >
                <Rocket className="w-4 h-4" />
                Upgrade Package
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <h5 className="text-xs font-semibold text-gray-400 mb-2">Usage Limits</h5>
                <div className="space-y-2">
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-gray-400">Products</span>
                      <span className="text-white font-medium">
                        {vendorData.totalProducts} / {currentPackage?.limits.products === 999999 ? '∞' : currentPackage?.limits.products}
                      </span>
                    </div>
                    <div className="h-1.5 bg-[#0F0F0F] rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-orange-600 to-orange-700"
                        style={{ 
                          width: currentPackage?.limits.products === 999999 ? '10%' : 
                            `${Math.min((vendorData.totalProducts / (currentPackage?.limits.products || 1)) * 100, 100)}%` 
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h5 className="text-xs font-semibold text-gray-400 mb-2">Features</h5>
                <ul className="space-y-1">
                  {currentPackage?.features.slice(0, 3).map((feature, index) => (
                    <li key={index} className="flex items-center gap-2 text-xs text-gray-300">
                      <Check className="w-3 h-3 text-green-400 flex-shrink-0" />
                      <span className="truncate">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Performance Chart */}
          <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg p-4">
            <h4 className="font-bold text-white mb-3 text-sm">Performance Trend</h4>
            <ChartContainer>
              <LineChart data={performanceData} height={200}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2A2A2A" />
                <XAxis dataKey="month" stroke="#666" style={{ fontSize: '11px' }} />
                <YAxis stroke="#666" style={{ fontSize: '11px' }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1A1A1A', border: '1px solid #2A2A2A', borderRadius: '8px', fontSize: '12px' }}
                  labelStyle={{ color: '#fff' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Line type="monotone" dataKey="impressions" stroke="#ea580c" strokeWidth={2} name="Impressions" isAnimationActive={false} />
                <Line type="monotone" dataKey="clicks" stroke="#3b82f6" strokeWidth={2} name="Clicks" isAnimationActive={false} />
              </LineChart>
            </ChartContainer>
          </div>
        </div>
      )}

      {/* Packages */}
      {activeView === 'packages' && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            {advertisingPackages.map((pkg) => {
              const Icon = pkg.icon;
              const isCurrentPackage = pkg.id === vendorData.currentPackage;
              
              return (
                <div
                  key={pkg.id}
                  className={`relative bg-gradient-to-br ${pkg.color} rounded-lg p-5 text-white ${
                    pkg.popular ? 'ring-2 ring-orange-500/50' : ''
                  } ${isCurrentPackage ? 'ring-2 ring-green-500/50' : ''}`}
                >
                  {pkg.popular && (
                    <div className="absolute -top-2 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-orange-500 rounded-full text-[10px] font-bold">
                      POPULAR
                    </div>
                  )}
                  
                  {isCurrentPackage && (
                    <div className="absolute -top-2 right-3 px-2 py-0.5 bg-green-500 rounded-full text-[10px] font-bold flex items-center gap-1">
                      <Check className="w-2.5 h-2.5" />
                      CURRENT
                    </div>
                  )}

                  <div className="flex items-center gap-2 mb-3">
                    <Icon className="w-7 h-7" />
                    <h4 className="text-lg font-bold">{pkg.name}</h4>
                  </div>

                  <div className="mb-4">
                    <span className="text-3xl font-bold">${pkg.price}</span>
                    <span className="text-sm opacity-80">/{pkg.interval}</span>
                  </div>

                  <ul className="space-y-2 mb-4">
                    {pkg.features.slice(0, 4).map((feature, index) => (
                      <li key={index} className="flex items-start gap-2 text-xs">
                        <Check className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <button
                    onClick={() => handleUpgradePackage(pkg.id)}
                    disabled={isCurrentPackage}
                    className={`w-full py-2 rounded-lg font-bold text-sm transition-all duration-300 ${
                      isCurrentPackage
                        ? 'bg-white/20 cursor-not-allowed'
                        : pkg.id === 'basic' 
                          ? 'bg-gradient-to-r from-gray-600/10 to-gray-700/10 text-gray-300 hover:from-gray-600/20 hover:to-gray-700/20 hover:text-white border-2 border-gray-500/30 hover:border-gray-400/50 hover:shadow-lg hover:shadow-gray-500/30 hover:scale-102'
                          : pkg.id === 'professional'
                            ? 'bg-gradient-to-r from-purple-600/10 to-purple-700/10 text-gray-300 hover:from-purple-600/20 hover:to-purple-700/20 hover:text-white border-2 border-purple-500/30 hover:border-purple-400/50 hover:shadow-lg hover:shadow-purple-500/30 hover:scale-102'
                            : 'bg-gradient-to-r from-orange-600/10 to-red-600/10 text-gray-300 hover:from-orange-600/20 hover:to-red-600/20 hover:text-white border-2 border-orange-500/30 hover:border-orange-400/50 hover:shadow-lg hover:shadow-orange-500/30 hover:scale-102'
                    }`}
                  >
                    {isCurrentPackage ? 'Current Package' : 'Select Package'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Products */}
      {activeView === 'products' && (
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search products..."
                className="w-full pl-9 pr-4 py-2 bg-[#0F0F0F] border border-[#2A2A2A] rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-orange-500 transition"
              />
            </div>
            <div className="flex items-center gap-2 ml-3">
              <div className="flex items-center gap-1 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg p-0.5">
                <button
                  onClick={() => setProductViewMode('grid')}
                  className={`p-1.5 rounded transition ${
                    productViewMode === 'grid' ? 'bg-orange-600 text-white' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <Grid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setProductViewMode('list')}
                  className={`p-1.5 rounded transition ${
                    productViewMode === 'list' ? 'bg-orange-600 text-white' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
              <button
                onClick={() => {
                  setEditingProduct(null);
                  setShowProductModal(true);
                }}
                className="px-4 py-2 rounded-xl transition-all duration-300 bg-gradient-to-r from-green-600/10 to-emerald-600/10 text-gray-300 hover:from-green-600/20 hover:to-emerald-600/20 hover:text-white border-2 border-green-500/30 hover:border-green-400/50 hover:shadow-lg hover:shadow-green-500/30 hover:scale-102 flex items-center gap-2 font-bold text-sm"
              >
                <Plus className="w-4 h-4" />
                Add Product
              </button>
            </div>
          </div>

          {/* Products Grid */}
          {productViewMode === 'grid' ? (
            <div className="grid grid-cols-3 gap-4">
              {filteredProducts.map((product) => (
                <div
                  key={product.id}
                  className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg overflow-hidden hover:border-orange-500/50 transition group"
                >
                  <div className="relative aspect-video bg-[#0F0F0F]">
                    {product.imageUrl ? (
                      <img
                        src={product.imageUrl}
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="w-8 h-8 text-gray-600" />
                      </div>
                    )}
                    {product.featured && (
                      <div className="absolute top-2 right-2 px-2 py-0.5 bg-orange-500 rounded text-[10px] font-bold text-white flex items-center gap-1">
                        <Star className="w-2.5 h-2.5 fill-current" />
                        Featured
                      </div>
                    )}
                  </div>

                  <div className="p-3">
                    <h4 className="font-bold text-white text-sm mb-1 truncate group-hover:text-orange-400 transition">
                      {product.name}
                    </h4>
                    <p className="text-xs text-gray-400 mb-2">{product.category}</p>

                    <div className="flex items-center justify-between mb-3">
                      <div className="text-lg font-bold text-orange-400">
                        ${product.price}
                        <span className="text-xs text-gray-400">/{product.unit}</span>
                      </div>
                      <div className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                        product.materialsListEnabled 
                          ? 'bg-green-500/20 text-green-400' 
                          : 'bg-gray-500/20 text-gray-400'
                      }`}>
                        {product.materialsListEnabled ? 'Listed' : 'Unlisted'}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-[10px] text-gray-400 mb-3">
                      <div className="flex items-center gap-1">
                        <Eye className="w-3 h-3" />
                        {product.views}
                      </div>
                      <div className="flex items-center gap-1">
                        <ShoppingCart className="w-3 h-3" />
                        {product.orders}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setEditingProduct(product);
                          setShowProductModal(true);
                        }}
                        className="flex-1 px-2 py-1.5 bg-[#0F0F0F] border border-[#2A2A2A] hover:border-orange-500 rounded text-white text-xs transition flex items-center justify-center gap-1"
                      >
                        <Edit className="w-3 h-3" />
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteProduct(product.id)}
                        className="px-2 py-1.5 bg-[#0F0F0F] border border-[#2A2A2A] hover:border-red-500 rounded text-red-400 hover:text-red-300 text-xs transition"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {filteredProducts.length === 0 && (
                <div className="col-span-3 text-center py-12">
                  <Package className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                  <div className="text-gray-400">No products found</div>
                </div>
              )}
            </div>
          ) : (
            /* List View */
            <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#2A2A2A]">
                    <th className="text-left py-2 px-3 text-gray-400 text-xs font-medium">Product</th>
                    <th className="text-left py-2 px-3 text-gray-400 text-xs font-medium">Category</th>
                    <th className="text-left py-2 px-3 text-gray-400 text-xs font-medium">SKU</th>
                    <th className="text-right py-2 px-3 text-gray-400 text-xs font-medium">Price</th>
                    <th className="text-center py-2 px-3 text-gray-400 text-xs font-medium">Stock</th>
                    <th className="text-center py-2 px-3 text-gray-400 text-xs font-medium">Status</th>
                    <th className="text-right py-2 px-3 text-gray-400 text-xs font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map((product) => (
                    <tr key={product.id} className="border-b border-[#2A2A2A] hover:bg-[#0F0F0F] transition">
                      <td className="py-2 px-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded bg-[#0F0F0F] flex items-center justify-center flex-shrink-0">
                            {product.imageUrl ? (
                              <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover rounded" />
                            ) : (
                              <Package className="w-4 h-4 text-gray-600" />
                            )}
                          </div>
                          <div>
                            <p className="text-white text-xs font-medium">{product.name}</p>
                            <div className="flex items-center gap-2 text-[10px] text-gray-400">
                              <Eye className="w-2.5 h-2.5" />
                              {product.views}
                              <ShoppingCart className="w-2.5 h-2.5 ml-1" />
                              {product.orders}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-2 px-3 text-gray-300 text-xs">{product.category}</td>
                      <td className="py-2 px-3 text-gray-400 text-xs">{product.sku}</td>
                      <td className="py-2 px-3 text-right">
                        <span className="font-bold text-orange-400 text-xs">${product.price}</span>
                        <span className="text-[10px] text-gray-400">/{product.unit}</span>
                      </td>
                      <td className="py-2 px-3 text-center text-gray-300 text-xs">{product.stockQuantity}</td>
                      <td className="py-2 px-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                          product.inStock 
                            ? 'bg-green-500/20 text-green-400' 
                            : 'bg-red-500/20 text-red-400'
                        }`}>
                          {product.inStock ? 'In Stock' : 'Out of Stock'}
                        </span>
                      </td>
                      <td className="py-2 px-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => {
                              setEditingProduct(product);
                              setShowProductModal(true);
                            }}
                            className="p-1 hover:bg-[#2A2A2A] rounded text-gray-400 hover:text-orange-400 transition"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteProduct(product.id)}
                            className="p-1 hover:bg-[#2A2A2A] rounded text-gray-400 hover:text-red-400 transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {filteredProducts.length === 0 && (
                <div className="text-center py-12">
                  <Package className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                  <div className="text-gray-400">No products found</div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Product Modal */}
      {showProductModal && (
        <ProductModal
          product={editingProduct}
          onSave={handleSaveProduct}
          onClose={() => {
            setShowProductModal(false);
            setEditingProduct(null);
          }}
        />
      )}
    </div>
  );
}

// Product Modal Component
function ProductModal({ product, onSave, onClose }: { product: Product | null; onSave: (data: any) => void; onClose: () => void }) {
  const [formData, setFormData] = useState({
    name: product?.name || '',
    category: product?.category || '',
    sku: product?.sku || '',
    price: product?.price?.toString() || '',
    unit: product?.unit || 'piece',
    stockQuantity: product?.stockQuantity?.toString() || '',
    description: product?.description || '',
    imageUrl: product?.imageUrl || '',
    featured: product?.featured || false,
    materialsListEnabled: product?.materialsListEnabled !== false,
    inStock: product?.inStock !== false,
    tags: product?.tags?.join(', ') || ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...formData,
      price: parseFloat(formData.price),
      stockQuantity: parseInt(formData.stockQuantity),
      tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean)
    });
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <div className="sticky top-0 bg-[#1A1A1A] border-b border-[#2A2A2A] p-4 flex items-center justify-between">
            <h3 className="text-lg font-bold text-white">
              {product ? 'Edit Product' : 'Add New Product'}
            </h3>
            <button
              type="button"
              onClick={onClose}
              className="p-1 hover:bg-[#2A2A2A] rounded transition"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          <div className="p-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-300 mb-1">Product Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 bg-[#0F0F0F] border border-[#2A2A2A] rounded-lg text-white text-sm focus:outline-none focus:border-orange-500"
                  placeholder="e.g., Premium Interior Paint"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">Category</label>
                <input
                  type="text"
                  required
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-3 py-2 bg-[#0F0F0F] border border-[#2A2A2A] rounded-lg text-white text-sm focus:outline-none focus:border-orange-500"
                  placeholder="e.g., Paint & Coatings"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">SKU</label>
                <input
                  type="text"
                  required
                  value={formData.sku}
                  onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                  className="w-full px-3 py-2 bg-[#0F0F0F] border border-[#2A2A2A] rounded-lg text-white text-sm focus:outline-none focus:border-orange-500"
                  placeholder="e.g., PIP-001"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">Price</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  className="w-full px-3 py-2 bg-[#0F0F0F] border border-[#2A2A2A] rounded-lg text-white text-sm focus:outline-none focus:border-orange-500"
                  placeholder="45.99"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">Unit</label>
                <select
                  value={formData.unit}
                  onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                  className="w-full px-3 py-2 bg-[#0F0F0F] border border-[#2A2A2A] rounded-lg text-white text-sm focus:outline-none focus:border-orange-500"
                >
                  <option value="piece">Piece</option>
                  <option value="gallon">Gallon</option>
                  <option value="sq ft">Sq Ft</option>
                  <option value="box">Box</option>
                  <option value="bundle">Bundle</option>
                </select>
              </div>

              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-300 mb-1">Stock Quantity</label>
                <input
                  type="number"
                  required
                  value={formData.stockQuantity}
                  onChange={(e) => setFormData({ ...formData, stockQuantity: e.target.value })}
                  className="w-full px-3 py-2 bg-[#0F0F0F] border border-[#2A2A2A] rounded-lg text-white text-sm focus:outline-none focus:border-orange-500"
                  placeholder="500"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-300 mb-1">Description</label>
                <textarea
                  required
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 bg-[#0F0F0F] border border-[#2A2A2A] rounded-lg text-white text-sm focus:outline-none focus:border-orange-500 resize-none"
                  placeholder="Product description..."
                />
              </div>

              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-300 mb-1">Image URL</label>
                <input
                  type="url"
                  value={formData.imageUrl}
                  onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                  className="w-full px-3 py-2 bg-[#0F0F0F] border border-[#2A2A2A] rounded-lg text-white text-sm focus:outline-none focus:border-orange-500"
                  placeholder="https://..."
                />
              </div>

              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-300 mb-1">Tags (comma-separated)</label>
                <input
                  type="text"
                  value={formData.tags}
                  onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                  className="w-full px-3 py-2 bg-[#0F0F0F] border border-[#2A2A2A] rounded-lg text-white text-sm focus:outline-none focus:border-orange-500"
                  placeholder="Interior, Premium, Eco-Friendly"
                />
              </div>

              <div className="col-span-2 space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.materialsListEnabled}
                    onChange={(e) => setFormData({ ...formData, materialsListEnabled: e.target.checked })}
                    className="w-4 h-4 rounded border-[#2A2A2A] bg-[#0F0F0F] text-orange-600"
                  />
                  <span className="text-xs text-gray-300">Show in materials lists</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.featured}
                    onChange={(e) => setFormData({ ...formData, featured: e.target.checked })}
                    className="w-4 h-4 rounded border-[#2A2A2A] bg-[#0F0F0F] text-orange-600"
                  />
                  <span className="text-xs text-gray-300">Featured product</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.inStock}
                    onChange={(e) => setFormData({ ...formData, inStock: e.target.checked })}
                    className="w-4 h-4 rounded border-[#2A2A2A] bg-[#0F0F0F] text-orange-600"
                  />
                  <span className="text-xs text-gray-300">In stock</span>
                </label>
              </div>
            </div>
          </div>

          <div className="sticky bottom-0 bg-[#1A1A1A] border-t border-[#2A2A2A] p-4 flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-3 py-2 bg-[#0F0F0F] border border-[#2A2A2A] hover:border-gray-500 rounded-lg text-white text-sm font-medium transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-3 py-2 bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 rounded-lg text-white text-sm font-bold transition"
            >
              {product ? 'Update Product' : 'Add Product'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
