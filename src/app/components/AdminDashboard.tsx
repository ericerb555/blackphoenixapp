// Admin Dashboard - Platform Management
// Central control panel for marketplace administrators
import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  LayoutDashboard,
  Store,
  Package,
  ShoppingBag,
  Users,
  TrendingUp,
  DollarSign,
  AlertCircle,
  Settings,
  BarChart3,
  Filter,
  Search,
  Eye,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  Clock,
  Download,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Activity,
  Zap,
  Award,
  Target,
  ArrowLeft
} from 'lucide-react';
import { StandardButton } from './ui/StandardButton';
import { CompactStandardButton } from './ui/CompactStandardButton';
import type { Product, Order } from '../types/ecommerce';
import { projectId, publicAnonKey } from '../utils/supabase/info';

type AdminTab = 'overview' | 'vendors' | 'products' | 'orders' | 'customers' | 'analytics' | 'settings';

interface PlatformStats {
  totalRevenue: number;
  totalOrders: number;
  totalProducts: number;
  totalVendors: number;
  totalCustomers: number;
  activeOrders: number;
  revenueGrowth: number;
  orderGrowth: number;
}

interface VendorStats {
  vendorId: string;
  vendorName: string;
  totalProducts: number;
  totalOrders: number;
  totalRevenue: number;
  activeProducts: number;
  status: 'active' | 'suspended' | 'pending';
}

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [stats, setStats] = useState<PlatformStats>({
    totalRevenue: 0,
    totalOrders: 0,
    totalProducts: 0,
    totalVendors: 0,
    totalCustomers: 0,
    activeOrders: 0,
    revenueGrowth: 0,
    orderGrowth: 0
  });
  const [loading, setLoading] = useState(true);
  const [vendors, setVendors] = useState<VendorStats[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [timeRange, setTimeRange] = useState<'today' | 'week' | 'month' | 'year'>('month');

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      // Load all data in parallel - with safe error handling
      const [productsRes, ordersRes, vendorsRes] = await Promise.all([
        fetch(`https://${projectId}.supabase.co/functions/v1/make-server-57095a78/products`, {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json',
          },
        }).catch(err => null),
        fetch(`https://${projectId}.supabase.co/functions/v1/make-server-57095a78/admin/orders/all`, {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json',
          },
        }).catch(err => null),
        fetch(`https://${projectId}.supabase.co/functions/v1/make-server-57095a78/vendor-directory`, {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json',
          },
        }).catch(err => null)
      ]);

      let productsData = { success: false, products: [] };
      let ordersData = { success: false, orders: [] };
      let vendorsData = { success: false, vendors: [] };

      try {
        if (productsRes && productsRes.ok) {
          productsData = await productsRes.json();
        }
      } catch (e) {
        console.log('[AdminDashboard] Products data unavailable (server offline)');
      }

      try {
        if (ordersRes && ordersRes.ok) {
          ordersData = await ordersRes.json();
        }
      } catch (e) {
        console.log('[AdminDashboard] Orders data unavailable (server offline)');
      }

      try {
        if (vendorsRes && vendorsRes.ok) {
          vendorsData = await vendorsRes.json();
        }
      } catch (e) {
        console.log('[AdminDashboard] Vendors data unavailable (server offline)');
      }

      if (productsData.success) {
        setProducts(productsData.products || []);
      }

      if (ordersData.success) {
        setOrders(ordersData.orders || []);
      }

      if (vendorsData.success) {
        const vendorsList = vendorsData.vendors || [];
        setVendors(vendorsList);

        // Calculate vendor stats
        const vendorStatsMap = new Map<string, VendorStats>();
        
        vendorsList.forEach((vendor: any) => {
          vendorStatsMap.set(vendor.vendorKey, {
            vendorId: vendor.vendorKey,
            vendorName: vendor.companyName,
            totalProducts: 0,
            totalOrders: 0,
            totalRevenue: 0,
            activeProducts: 0,
            status: 'active'
          });
        });

        // Add product counts
        productsData.products?.forEach((product: Product) => {
          const vendorStat = vendorStatsMap.get(product.vendorId);
          if (vendorStat) {
            vendorStat.totalProducts++;
            if (product.isActive) {
              vendorStat.activeProducts++;
            }
          }
        });

        // Add order stats
        ordersData.orders?.forEach((order: Order) => {
          order.vendorOrders?.forEach(vo => {
            const vendorStat = vendorStatsMap.get(vo.vendorId);
            if (vendorStat) {
              vendorStat.totalOrders++;
              vendorStat.totalRevenue += vo.subtotal;
            }
          });
        });

        setVendors(Array.from(vendorStatsMap.values()));
      }

      // Calculate platform stats
      const allOrders = ordersData.orders || [];
      const totalRevenue = allOrders.reduce((sum: number, order: Order) => sum + order.total, 0);
      const activeOrders = allOrders.filter((o: Order) => 
        o.status === 'pending' || o.status === 'processing' || o.status === 'shipped'
      ).length;

      // Get unique customers
      const uniqueCustomers = new Set(allOrders.map((o: Order) => o.customerEmail));

      setStats({
        totalRevenue,
        totalOrders: allOrders.length,
        totalProducts: productsData.products?.length || 0,
        totalVendors: vendorsData.vendors?.length || 0,
        totalCustomers: uniqueCustomers.size,
        activeOrders,
        revenueGrowth: 12.5, // Mock data - would calculate from historical
        orderGrowth: 8.3 // Mock data
      });

    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'vendors', label: 'Vendors', icon: Store },
    { id: 'products', label: 'Products', icon: Package },
    { id: 'orders', label: 'Orders', icon: ShoppingBag },
    { id: 'customers', label: 'Customers', icon: Users },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'settings', label: 'Settings', icon: Settings }
  ];

  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      {/* Header */}
      <div className="bg-[#1A1A1A] border-b border-[#2A2A2A]">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  window.location.href = '/unified-dashboard';
                }}
                className="p-2 hover:bg-[#2A2A2A] rounded-lg transition-colors text-gray-400 hover:text-white"
                title="Back to Unified Dashboard"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#ea580c] to-orange-700 flex items-center justify-center">
                <LayoutDashboard className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">Admin Dashboard</h1>
                <p className="text-sm text-gray-400">Platform Management & Analytics</p>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-3">
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value as any)}
                className="px-4 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white focus:outline-none focus:border-[#ea580c]"
              >
                <option value="today">Today</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
                <option value="year">This Year</option>
              </select>

              <StandardButton
                variant="primary"
                icon={<Download className="w-4 h-4" />}
                onClick={() => alert('Export functionality coming soon!')}
              >
                Export Report
              </StandardButton>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-[#1A1A1A] border-b border-[#2A2A2A]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex gap-1 overflow-x-auto">
            {tabs.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as AdminTab)}
                  className={`px-6 py-3 font-semibold transition-all flex items-center gap-2 border-b-2 whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'text-[#ea580c] border-[#ea580c]'
                      : 'text-gray-400 border-transparent hover:text-white'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#ea580c]"></div>
          </div>
        ) : (
          <>
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <OverviewTab stats={stats} vendors={vendors} orders={orders} products={products} />
            )}

            {/* Vendors Tab */}
            {activeTab === 'vendors' && (
              <VendorsTab vendors={vendors} />
            )}

            {/* Products Tab */}
            {activeTab === 'products' && (
              <ProductsTab products={products} onRefresh={loadDashboardData} />
            )}

            {/* Orders Tab */}
            {activeTab === 'orders' && (
              <OrdersTab orders={orders} onRefresh={loadDashboardData} />
            )}

            {/* Customers Tab */}
            {activeTab === 'customers' && (
              <CustomersTab orders={orders} />
            )}

            {/* Analytics Tab */}
            {activeTab === 'analytics' && (
              <AnalyticsTab stats={stats} orders={orders} products={products} />
            )}

            {/* Settings Tab */}
            {activeTab === 'settings' && (
              <SettingsTab />
            )}
          </>
        )}
      </div>
    </div>
  );
}

// Overview Tab Component
function OverviewTab({ stats, vendors, orders, products }: {
  stats: PlatformStats;
  vendors: VendorStats[];
  orders: Order[];
  products: Product[];
}) {
  const recentOrders = orders.slice(0, 5);
  const topVendors = [...vendors].sort((a, b) => b.totalRevenue - a.totalRevenue).slice(0, 5);
  const lowStockProducts = products.filter(p => p.trackInventory && p.inventoryQuantity < (p.lowStockThreshold || 10)).slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Revenue"
          value={`$${stats.totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
          change={stats.revenueGrowth}
          icon={<DollarSign className="w-6 h-6" />}
          color="green"
        />
        <MetricCard
          title="Total Orders"
          value={stats.totalOrders.toString()}
          change={stats.orderGrowth}
          icon={<ShoppingBag className="w-6 h-6" />}
          color="blue"
        />
        <MetricCard
          title="Active Vendors"
          value={stats.totalVendors.toString()}
          icon={<Store className="w-6 h-6" />}
          color="purple"
        />
        <MetricCard
          title="Total Products"
          value={stats.totalProducts.toString()}
          icon={<Package className="w-6 h-6" />}
          color="orange"
        />
      </div>

      {/* Secondary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-yellow-500/20 flex items-center justify-center">
                <Clock className="w-5 h-5 text-yellow-400" />
              </div>
              <div>
                <div className="text-sm text-gray-400">Active Orders</div>
                <div className="text-2xl font-bold text-white">{stats.activeOrders}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <Users className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <div className="text-sm text-gray-400">Total Customers</div>
                <div className="text-2xl font-bold text-white">{stats.totalCustomers}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <div className="text-sm text-gray-400">Avg Order Value</div>
                <div className="text-2xl font-bold text-white">
                  ${stats.totalOrders > 0 ? (stats.totalRevenue / stats.totalOrders).toFixed(2) : '0.00'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Orders */}
        <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6">
          <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-[#ea580c]" />
            Recent Orders
          </h3>
          <div className="space-y-3">
            {recentOrders.length === 0 ? (
              <div className="text-center py-8 text-gray-400">No orders yet</div>
            ) : (
              recentOrders.map(order => (
                <div key={order.id} className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-white font-semibold">#{order.orderNumber}</div>
                    <div className="text-[#ea580c] font-bold">${order.total.toFixed(2)}</div>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">{order.customerName}</span>
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      order.status === 'delivered' ? 'bg-green-500/20 text-green-400' :
                      order.status === 'shipped' ? 'bg-blue-500/20 text-blue-400' :
                      order.status === 'processing' ? 'bg-yellow-500/20 text-yellow-400' :
                      'bg-gray-500/20 text-gray-400'
                    }`}>
                      {order.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Top Vendors */}
        <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6">
          <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <Award className="w-5 h-5 text-[#ea580c]" />
            Top Vendors by Revenue
          </h3>
          <div className="space-y-3">
            {topVendors.length === 0 ? (
              <div className="text-center py-8 text-gray-400">No vendors yet</div>
            ) : (
              topVendors.map((vendor, index) => (
                <div key={vendor.vendorId} className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#ea580c] to-orange-700 flex items-center justify-center text-white font-bold text-sm">
                      #{index + 1}
                    </div>
                    <div className="flex-1">
                      <div className="text-white font-semibold">{vendor.vendorName}</div>
                      <div className="text-sm text-gray-400">
                        {vendor.totalOrders} orders • {vendor.totalProducts} products
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[#ea580c] font-bold">${vendor.totalRevenue.toFixed(2)}</div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Low Stock Alert */}
      {lowStockProducts.length > 0 && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6">
          <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-400" />
            Low Stock Alert
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {lowStockProducts.map(product => (
              <div key={product.id} className="bg-[#0A0A0A] border border-red-500/30 rounded-lg p-3">
                <div className="text-white font-semibold text-sm mb-1">{product.name}</div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400">{product.vendorName}</span>
                  <span className="text-red-400 font-bold text-sm">{product.inventoryQuantity} left</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Metric Card Component
function MetricCard({ title, value, change, icon, color }: {
  title: string;
  value: string;
  change?: number;
  icon: React.ReactNode;
  color: 'green' | 'blue' | 'purple' | 'orange';
}) {
  const colorClasses = {
    green: 'from-green-500 to-emerald-600',
    blue: 'from-blue-500 to-cyan-600',
    purple: 'from-purple-500 to-pink-600',
    orange: 'from-[#ea580c] to-orange-700'
  };

  return (
    <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${colorClasses[color]} flex items-center justify-center text-white`}>
          {icon}
        </div>
        {change !== undefined && (
          <div className={`flex items-center gap-1 text-sm font-semibold ${change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            <TrendingUp className={`w-4 h-4 ${change < 0 ? 'rotate-180' : ''}`} />
            {Math.abs(change).toFixed(1)}%
          </div>
        )}
      </div>
      <div className="text-sm text-gray-400 mb-1">{title}</div>
      <div className="text-3xl font-bold text-white">{value}</div>
    </div>
  );
}

// Vendors Tab Component
function VendorsTab({ vendors }: { vendors: VendorStats[] }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'products' | 'orders' | 'revenue'>('revenue');

  const filteredVendors = vendors
    .filter(v => v.vendorName.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.vendorName.localeCompare(b.vendorName);
        case 'products':
          return b.totalProducts - a.totalProducts;
        case 'orders':
          return b.totalOrders - a.totalOrders;
        case 'revenue':
        default:
          return b.totalRevenue - a.totalRevenue;
      }
    });

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search vendors..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#ea580c]"
            />
          </div>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white focus:outline-none focus:border-[#ea580c]"
          >
            <option value="revenue">Sort by Revenue</option>
            <option value="orders">Sort by Orders</option>
            <option value="products">Sort by Products</option>
            <option value="name">Sort by Name</option>
          </select>
        </div>
      </div>

      {/* Vendors Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filteredVendors.map(vendor => (
          <div key={vendor.vendorId} className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6 hover:border-[#ea580c] transition-colors">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h3 className="text-xl font-bold text-white mb-2">{vendor.vendorName}</h3>
                <div className="flex items-center gap-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    vendor.status === 'active' ? 'bg-green-500/20 text-green-400' :
                    vendor.status === 'suspended' ? 'bg-red-500/20 text-red-400' :
                    'bg-yellow-500/20 text-yellow-400'
                  }`}>
                    {vendor.status}
                  </span>
                </div>
              </div>

              <div className="flex gap-2">
                <button className="p-2 hover:bg-[#0A0A0A] rounded-lg text-gray-400 hover:text-white transition-colors">
                  <Eye className="w-4 h-4" />
                </button>
                <button className="p-2 hover:bg-[#0A0A0A] rounded-lg text-gray-400 hover:text-white transition-colors">
                  <Edit className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="bg-[#0A0A0A] rounded-lg p-3">
                <div className="text-xs text-gray-400 mb-1">Products</div>
                <div className="text-xl font-bold text-white">{vendor.totalProducts}</div>
                <div className="text-xs text-gray-500">{vendor.activeProducts} active</div>
              </div>
              <div className="bg-[#0A0A0A] rounded-lg p-3">
                <div className="text-xs text-gray-400 mb-1">Orders</div>
                <div className="text-xl font-bold text-white">{vendor.totalOrders}</div>
              </div>
              <div className="bg-[#0A0A0A] rounded-lg p-3">
                <div className="text-xs text-gray-400 mb-1">Revenue</div>
                <div className="text-lg font-bold text-[#ea580c]">${vendor.totalRevenue.toFixed(0)}</div>
              </div>
            </div>

            <div className="flex gap-2">
              <CompactStandardButton variant="secondary" className="flex-1">
                View Details
              </CompactStandardButton>
              <CompactStandardButton variant="primary" className="flex-1">
                Contact
              </CompactStandardButton>
            </div>
          </div>
        ))}
      </div>

      {filteredVendors.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <Store className="w-16 h-16 mx-auto mb-4 text-gray-600" />
          <p>No vendors found</p>
        </div>
      )}
    </div>
  );
}

// Products Tab Component  
function ProductsTab({ products, onRefresh }: { products: Product[]; onRefresh: () => void }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  const filteredProducts = products.filter(p => {
    const matchesSearch = searchQuery === '' || 
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.vendorName?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'active' && p.isActive) ||
      (statusFilter === 'inactive' && !p.isActive);
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#ea580c]"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white focus:outline-none focus:border-[#ea580c]"
          >
            <option value="all">All Products</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
          </select>
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[#0A0A0A] border-b border-[#2A2A2A]">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-400">Product</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-400">Vendor</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-400">Price</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-400">Stock</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-400">Status</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-400">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2A2A2A]">
              {filteredProducts.slice(0, 20).map(product => (
                <tr key={product.id} className="hover:bg-[#0A0A0A] transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-[#0A0A0A] rounded-lg overflow-hidden flex-shrink-0">
                        {product.primaryImage ? (
                          <img src={product.primaryImage} alt={product.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Package className="w-5 h-5 text-gray-600" />
                          </div>
                        )}
                      </div>
                      <div>
                        <div className="text-white font-semibold">{product.name}</div>
                        <div className="text-sm text-gray-400">{product.category}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-300">{product.vendorName}</td>
                  <td className="px-6 py-4">
                    <div className="text-[#ea580c] font-semibold">${product.price.toFixed(2)}</div>
                  </td>
                  <td className="px-6 py-4">
                    {product.trackInventory ? (
                      <div className={`font-semibold ${
                        product.inventoryQuantity === 0 ? 'text-red-400' :
                        product.inventoryQuantity < (product.lowStockThreshold || 10) ? 'text-yellow-400' :
                        'text-green-400'
                      }`}>
                        {product.inventoryQuantity}
                      </div>
                    ) : (
                      <span className="text-gray-400">N/A</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      product.isActive ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'
                    }`}>
                      {product.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      <button className="p-2 hover:bg-[#2A2A2A] rounded-lg text-gray-400 hover:text-white transition-colors">
                        <Eye className="w-4 h-4" />
                      </button>
                      <button className="p-2 hover:bg-[#2A2A2A] rounded-lg text-gray-400 hover:text-white transition-colors">
                        <Edit className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {filteredProducts.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <Package className="w-16 h-16 mx-auto mb-4 text-gray-600" />
          <p>No products found</p>
        </div>
      )}
    </div>
  );
}

// Orders Tab Component
function OrdersTab({ orders, onRefresh }: { orders: Order[]; onRefresh: () => void }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filteredOrders = orders.filter(o => {
    const matchesSearch = searchQuery === '' ||
      o.orderNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.customerName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.customerEmail?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || o.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search orders..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#ea580c]"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white focus:outline-none focus:border-[#ea580c]"
          >
            <option value="all">All Orders</option>
            <option value="pending">Pending</option>
            <option value="processing">Processing</option>
            <option value="shipped">Shipped</option>
            <option value="delivered">Delivered</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Orders List */}
      <div className="space-y-3">
        {filteredOrders.slice(0, 20).map(order => (
          <div key={order.id} className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6 hover:border-[#ea580c] transition-colors">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-xl font-bold text-white">Order #{order.orderNumber}</h3>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    order.status === 'delivered' ? 'bg-green-500/20 text-green-400' :
                    order.status === 'shipped' ? 'bg-blue-500/20 text-blue-400' :
                    order.status === 'processing' ? 'bg-yellow-500/20 text-yellow-400' :
                    order.status === 'cancelled' ? 'bg-red-500/20 text-red-400' :
                    'bg-gray-500/20 text-gray-400'
                  }`}>
                    {order.status}
                  </span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <div className="text-gray-400">Customer</div>
                    <div className="text-white font-semibold">{order.customerName}</div>
                  </div>
                  <div>
                    <div className="text-gray-400">Email</div>
                    <div className="text-white">{order.customerEmail}</div>
                  </div>
                  <div>
                    <div className="text-gray-400">Items</div>
                    <div className="text-white font-semibold">{order.items.length}</div>
                  </div>
                  <div>
                    <div className="text-gray-400">Date</div>
                    <div className="text-white">{new Date(order.createdAt).toLocaleDateString()}</div>
                  </div>
                </div>
              </div>

              <div className="text-right ml-4">
                <div className="text-2xl font-bold text-[#ea580c] mb-2">${order.total.toFixed(2)}</div>
                <div className="flex gap-2">
                  <button className="p-2 hover:bg-[#0A0A0A] rounded-lg text-gray-400 hover:text-white transition-colors">
                    <Eye className="w-4 h-4" />
                  </button>
                  <button className="p-2 hover:bg-[#0A0A0A] rounded-lg text-gray-400 hover:text-white transition-colors">
                    <Download className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredOrders.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <ShoppingBag className="w-16 h-16 mx-auto mb-4 text-gray-600" />
          <p>No orders found</p>
        </div>
      )}
    </div>
  );
}

// Customers Tab Component
function CustomersTab({ orders }: { orders: Order[] }) {
  // Extract unique customers from orders
  const customersMap = new Map();
  orders.forEach(order => {
    const existing = customersMap.get(order.customerEmail);
    if (existing) {
      existing.totalOrders++;
      existing.totalSpent += order.total;
      existing.lastOrder = order.createdAt > existing.lastOrder ? order.createdAt : existing.lastOrder;
    } else {
      customersMap.set(order.customerEmail, {
        email: order.customerEmail,
        name: order.customerName,
        totalOrders: 1,
        totalSpent: order.total,
        lastOrder: order.createdAt
      });
    }
  });

  const customers = Array.from(customersMap.values())
    .sort((a, b) => b.totalSpent - a.totalSpent);

  return (
    <div className="space-y-6">
      <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6">
        <h3 className="text-xl font-bold text-white mb-4">Customer Overview</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-[#0A0A0A] rounded-lg p-4">
            <div className="text-sm text-gray-400 mb-1">Total Customers</div>
            <div className="text-3xl font-bold text-white">{customers.length}</div>
          </div>
          <div className="bg-[#0A0A0A] rounded-lg p-4">
            <div className="text-sm text-gray-400 mb-1">Avg Orders per Customer</div>
            <div className="text-3xl font-bold text-white">
              {customers.length > 0 ? (orders.length / customers.length).toFixed(1) : '0'}
            </div>
          </div>
          <div className="bg-[#0A0A0A] rounded-lg p-4">
            <div className="text-sm text-gray-400 mb-1">Avg Customer Value</div>
            <div className="text-3xl font-bold text-[#ea580c]">
              ${customers.length > 0 ? (customers.reduce((sum, c) => sum + c.totalSpent, 0) / customers.length).toFixed(2) : '0.00'}
            </div>
          </div>
        </div>
      </div>

      {/* Customers List */}
      <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[#0A0A0A] border-b border-[#2A2A2A]">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-400">Customer</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-400">Email</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-400">Orders</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-400">Total Spent</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-400">Last Order</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2A2A2A]">
              {customers.map(customer => (
                <tr key={customer.email} className="hover:bg-[#0A0A0A] transition-colors">
                  <td className="px-6 py-4 text-white font-semibold">{customer.name}</td>
                  <td className="px-6 py-4 text-gray-300">{customer.email}</td>
                  <td className="px-6 py-4 text-white font-semibold">{customer.totalOrders}</td>
                  <td className="px-6 py-4 text-[#ea580c] font-semibold">${customer.totalSpent.toFixed(2)}</td>
                  <td className="px-6 py-4 text-gray-300">
                    {new Date(customer.lastOrder).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// Analytics Tab Component
function AnalyticsTab({ stats, orders, products }: {
  stats: PlatformStats;
  orders: Order[];
  products: Product[];
}) {
  return (
    <div className="space-y-6">
      <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6">
        <h3 className="text-2xl font-bold text-white mb-6">Platform Analytics</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-[#0A0A0A] rounded-lg p-4">
            <div className="flex items-center gap-3 mb-3">
              <Target className="w-5 h-5 text-[#ea580c]" />
              <div className="text-sm text-gray-400">Conversion Rate</div>
            </div>
            <div className="text-2xl font-bold text-white">3.2%</div>
            <div className="text-xs text-green-400 mt-1">+0.4% from last month</div>
          </div>

          <div className="bg-[#0A0A0A] rounded-lg p-4">
            <div className="flex items-center gap-3 mb-3">
              <Activity className="w-5 h-5 text-blue-400" />
              <div className="text-sm text-gray-400">Active Sessions</div>
            </div>
            <div className="text-2xl font-bold text-white">247</div>
            <div className="text-xs text-gray-400 mt-1">Current visitors</div>
          </div>

          <div className="bg-[#0A0A0A] rounded-lg p-4">
            <div className="flex items-center gap-3 mb-3">
              <Zap className="w-5 h-5 text-yellow-400" />
              <div className="text-sm text-gray-400">Popular Category</div>
            </div>
            <div className="text-xl font-bold text-white">Electronics</div>
            <div className="text-xs text-gray-400 mt-1">45% of sales</div>
          </div>

          <div className="bg-[#0A0A0A] rounded-lg p-4">
            <div className="flex items-center gap-3 mb-3">
              <TrendingUp className="w-5 h-5 text-green-400" />
              <div className="text-sm text-gray-400">Growth Rate</div>
            </div>
            <div className="text-2xl font-bold text-white">+24%</div>
            <div className="text-xs text-green-400 mt-1">Year over year</div>
          </div>
        </div>

        <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-6">
          <h4 className="text-white font-semibold mb-2 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-400" />
            Advanced Analytics Coming Soon
          </h4>
          <p className="text-blue-400 text-sm">
            Detailed charts, graphs, and insights will be available in the next update. Track revenue trends, customer behavior, product performance, and more!
          </p>
        </div>
      </div>
    </div>
  );
}

// Settings Tab Component
function SettingsTab() {
  return (
    <div className="space-y-6">
      <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6">
        <h3 className="text-2xl font-bold text-white mb-6">Platform Settings</h3>
        
        <div className="space-y-6">
          <div>
            <h4 className="text-lg font-semibold text-white mb-4">General</h4>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Platform Name
                </label>
                <input
                  type="text"
                  defaultValue="Enterprise Marketplace"
                  className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white focus:outline-none focus:border-[#ea580c]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Platform Email
                </label>
                <input
                  type="email"
                  defaultValue="admin@marketplace.com"
                  className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white focus:outline-none focus:border-[#ea580c]"
                />
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-[#2A2A2A]">
            <h4 className="text-lg font-semibold text-white mb-4">Commission Settings</h4>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Platform Commission (%)
                </label>
                <input
                  type="number"
                  defaultValue="10"
                  min="0"
                  max="100"
                  className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white focus:outline-none focus:border-[#ea580c]"
                />
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-[#2A2A2A]">
            <h4 className="text-lg font-semibold text-white mb-4">Shipping Settings</h4>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Free Shipping Threshold ($)
                </label>
                <input
                  type="number"
                  defaultValue="100"
                  min="0"
                  className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white focus:outline-none focus:border-[#ea580c]"
                />
              </div>
            </div>
          </div>

          <div className="flex gap-4 pt-6">
            <StandardButton variant="primary">
              Save Changes
            </StandardButton>
            <StandardButton variant="secondary">
              Reset to Default
            </StandardButton>
          </div>
        </div>
      </div>
    </div>
  );
}