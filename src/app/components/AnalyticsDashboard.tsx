// Analytics Dashboard with Customer Behavior & Sales Forecasting
import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  TrendingUp,
  TrendingDown,
  Users,
  DollarSign,
  ShoppingCart,
  Eye,
  Activity,
  BarChart3,
  LineChart,
  PieChart,
  Calendar,
  Download,
  Filter,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Target,
  Zap,
  Globe
} from 'lucide-react';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface DashboardMetrics {
  overview: {
    totalRevenue: number;
    totalOrders: number;
    averageOrderValue: number;
    conversionRate: number;
  };
  traffic: {
    totalVisits: number;
    uniqueVisitors: number;
    pageViews: number;
    bounceRate: number;
  };
  customers: {
    newCustomers: number;
    returningCustomers: number;
    customerLifetimeValue: number;
    segments: {
      vip: number;
      loyal: number;
      regular: number;
      at_risk: number;
      new: number;
    };
  };
  inventory: {
    lowStockAlerts: any[];
    outOfStockCount: number;
    inventoryValue: number;
  };
}

interface SalesForecast {
  historical: any[];
  forecast: any[];
  confidence: number;
  insights: any[];
}

export default function AnalyticsDashboard() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [forecast, setForecast] = useState<SalesForecast | null>(null);
  const [timeframe, setTimeframe] = useState('7d');
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, [timeframe]);

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(fetchDashboardData, 30000); // Refresh every 30s
      return () => clearInterval(interval);
    }
  }, [autoRefresh, timeframe]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch dashboard metrics
      const metricsResponse = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-57095a78/api/analytics/dashboard?timeframe=${timeframe}`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
          },
        }
      );

      if (metricsResponse.ok) {
        const metricsData = await metricsResponse.json();
        setMetrics(metricsData.data);
      }

      // Fetch sales forecast
      const forecastResponse = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-57095a78/api/analytics/sales-forecast?periods=30&granularity=day`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
          },
        }
      );

      if (forecastResponse.ok) {
        const forecastData = await forecastResponse.json();
        setForecast(forecastData.data);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading && !metrics) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950/20 to-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white font-semibold">Loading Analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950/20 to-slate-950 p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-black text-white mb-2">Analytics Dashboard</h1>
            <p className="text-slate-400">Real-time business insights and forecasting</p>
          </div>

          <div className="flex items-center gap-3">
            {/* Auto Refresh */}
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`px-4 py-2 rounded-xl font-semibold flex items-center gap-2 transition-all ${
                autoRefresh
                  ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <Activity className="w-5 h-5" />
              {autoRefresh ? 'Auto-Refresh ON' : 'Auto-Refresh OFF'}
            </button>

            {/* Timeframe Selector */}
            <select
              value={timeframe}
              onChange={(e) => setTimeframe(e.target.value)}
              className="px-4 py-2 bg-slate-800 border border-cyan-500/20 rounded-xl text-white font-semibold focus:outline-none focus:border-cyan-500/50"
            >
              <option value="24h">Last 24 Hours</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="90d">Last 90 Days</option>
            </select>

            {/* Refresh Button */}
            <button
              onClick={fetchDashboardData}
              disabled={loading}
              className="p-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-cyan-400 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </button>

            {/* Export Button */}
            <button
              className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-purple-600 rounded-xl text-white font-semibold flex items-center gap-2 hover:shadow-lg hover:shadow-purple-500/50 transition-shadow"
            >
              <Download className="w-5 h-5" />
              Export Report
            </button>
          </div>
        </div>

        {metrics && (
          <>
            {/* Overview KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <KPICard
                title="Total Revenue"
                value={`$${metrics.overview.totalRevenue.toLocaleString()}`}
                change={+12.5}
                icon={DollarSign}
                color="green"
              />
              <KPICard
                title="Total Orders"
                value={metrics.overview.totalOrders.toString()}
                change={+8.3}
                icon={ShoppingCart}
                color="blue"
              />
              <KPICard
                title="Avg Order Value"
                value={`$${metrics.overview.averageOrderValue.toFixed(2)}`}
                change={+5.2}
                icon={TrendingUp}
                color="purple"
              />
              <KPICard
                title="Conversion Rate"
                value={`${metrics.overview.conversionRate.toFixed(2)}%`}
                change={+2.1}
                icon={Target}
                color="cyan"
              />
            </div>

            {/* Sales Forecast */}
            {forecast && (
              <div className="bg-slate-900/50 backdrop-blur-xl border border-cyan-500/20 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-black text-white mb-2">30-Day Sales Forecast</h2>
                    <p className="text-slate-400">
                      AI-powered prediction with {(forecast.confidence * 100).toFixed(0)}% confidence
                    </p>
                  </div>
                  
                  <div className="px-4 py-2 bg-green-500/20 border border-green-500/30 rounded-xl">
                    <span className="text-green-400 font-bold">
                      {(forecast.confidence * 100).toFixed(0)}% Confidence
                    </span>
                  </div>
                </div>

                {/* Forecast Chart Visualization (Simplified) */}
                <div className="h-64 bg-slate-800/30 rounded-xl p-4 mb-6 relative overflow-hidden">
                  {/* Gradient Background */}
                  <div className="absolute inset-0 bg-gradient-to-t from-cyan-500/10 to-transparent" />
                  
                  {/* Chart Labels */}
                  <div className="relative h-full flex items-end justify-between">
                    {forecast.forecast.slice(0, 15).map((point, i) => (
                      <div key={i} className="flex-1 flex flex-col items-center">
                        <div
                          className="w-full bg-gradient-to-t from-cyan-500 to-purple-600 rounded-t transition-all duration-500"
                          style={{ 
                            height: `${Math.min((point.predicted / Math.max(...forecast.forecast.map(f => f.predicted))) * 100, 100)}%` 
                          }}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Insights */}
                <div className="space-y-3">
                  {forecast.insights.map((insight, index) => (
                    <div
                      key={index}
                      className={`flex items-start gap-3 p-4 rounded-xl ${
                        insight.type === 'positive'
                          ? 'bg-green-500/10 border border-green-500/20'
                          : insight.type === 'warning'
                          ? 'bg-yellow-500/10 border border-yellow-500/20'
                          : 'bg-blue-500/10 border border-blue-500/20'
                      }`}
                    >
                      {insight.type === 'positive' ? (
                        <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                      ) : insight.type === 'warning' ? (
                        <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                      ) : (
                        <Activity className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                      )}
                      <div className="flex-1">
                        <p className={`text-sm font-semibold ${
                          insight.type === 'positive'
                            ? 'text-green-300'
                            : insight.type === 'warning'
                            ? 'text-yellow-300'
                            : 'text-blue-300'
                        }`}>
                          {insight.message}
                        </p>
                        <p className="text-xs text-slate-400 mt-1">Impact: {insight.impact}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Customer Segments & Traffic */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Customer Segments */}
              <div className="bg-slate-900/50 backdrop-blur-xl border border-cyan-500/20 rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-6">
                  <Users className="w-6 h-6 text-purple-400" />
                  <h2 className="text-2xl font-black text-white">Customer Segments</h2>
                </div>

                <div className="space-y-4">
                  {Object.entries(metrics.customers.segments).map(([segment, count], index) => (
                    <div
                      key={segment}
                      className="space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-white capitalize">
                          {segment.replace('_', ' ')}
                        </span>
                        <span className="text-sm font-bold text-cyan-400">{count}</span>
                      </div>
                      <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-500 ${
                            segment === 'vip'
                              ? 'bg-gradient-to-r from-yellow-500 to-orange-500'
                              : segment === 'loyal'
                              ? 'bg-gradient-to-r from-green-500 to-emerald-600'
                              : segment === 'at_risk'
                              ? 'bg-gradient-to-r from-red-500 to-pink-600'
                              : 'bg-gradient-to-r from-cyan-500 to-blue-600'
                          }`}
                          style={{ width: `${(count / Object.values(metrics.customers.segments).reduce((a, b) => a + b, 0)) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-6 pt-6 border-t border-slate-800">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-slate-400 mb-1">New Customers</p>
                      <p className="text-2xl font-black text-green-400">
                        {metrics.customers.newCustomers}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-400 mb-1">Avg CLV</p>
                      <p className="text-2xl font-black text-purple-400">
                        ${metrics.customers.customerLifetimeValue.toFixed(0)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Traffic Overview */}
              <div className="bg-slate-900/50 backdrop-blur-xl border border-cyan-500/20 rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-6">
                  <Eye className="w-6 h-6 text-cyan-400" />
                  <h2 className="text-2xl font-black text-white">Traffic Overview</h2>
                </div>

                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-cyan-500/10 border border-cyan-500/20 rounded-xl">
                      <p className="text-sm text-cyan-400 mb-2">Total Visits</p>
                      <p className="text-3xl font-black text-white">
                        {metrics.traffic.totalVisits.toLocaleString()}
                      </p>
                    </div>
                    <div className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-xl">
                      <p className="text-sm text-purple-400 mb-2">Unique Visitors</p>
                      <p className="text-3xl font-black text-white">
                        {metrics.traffic.uniqueVisitors.toLocaleString()}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                      <p className="text-sm text-blue-400 mb-2">Page Views</p>
                      <p className="text-3xl font-black text-white">
                        {metrics.traffic.pageViews.toLocaleString()}
                      </p>
                    </div>
                    <div className="p-4 bg-orange-500/10 border border-orange-500/20 rounded-xl">
                      <p className="text-sm text-orange-400 mb-2">Bounce Rate</p>
                      <p className="text-3xl font-black text-white">
                        {metrics.traffic.bounceRate.toFixed(1)}%
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Inventory Alerts */}
            {metrics.inventory.lowStockAlerts.length > 0 && (
              <div className="bg-gradient-to-br from-red-500/10 to-orange-500/10 backdrop-blur-xl border border-red-500/20 rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <AlertCircle className="w-6 h-6 text-red-400" />
                  <h2 className="text-2xl font-black text-white">Low Stock Alerts</h2>
                  <span className="ml-auto px-3 py-1 bg-red-500/20 border border-red-500/30 rounded-full text-sm font-bold text-red-400">
                    {metrics.inventory.lowStockAlerts.length} items
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {metrics.inventory.lowStockAlerts.slice(0, 6).map((item, index) => (
                    <div
                      key={index}
                      className="p-4 bg-slate-900/50 border border-red-500/20 rounded-xl"
                    >
                      <p className="text-sm font-semibold text-white mb-1">{item.productId}</p>
                      <p className="text-xs text-slate-400 mb-2">Only {item.quantity} left</p>
                      <button className="w-full py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 rounded-lg text-xs font-semibold text-red-400 transition-colors">
                        Restock Now
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// KPI Card Component
function KPICard({
  title,
  value,
  change,
  icon: Icon,
  color
}: {
  title: string;
  value: string;
  change: number;
  icon: any;
  color: string;
}) {
  const colorClasses = {
    green: 'from-green-500 to-emerald-600',
    blue: 'from-blue-500 to-cyan-600',
    purple: 'from-purple-500 to-pink-600',
    cyan: 'from-cyan-500 to-blue-600'
  };

  return (
    <div className="relative group">
      <div className="absolute -inset-0.5 bg-gradient-to-r opacity-0 group-hover:opacity-20 blur transition-opacity" 
        style={{ backgroundImage: `linear-gradient(to right, var(--tw-gradient-stops))` }} 
      />
      
      <div className="relative bg-slate-900/50 backdrop-blur-xl border border-cyan-500/20 group-hover:border-cyan-500/40 rounded-2xl p-6 transition-all">
        <div className="flex items-start justify-between mb-4">
          <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${colorClasses[color as keyof typeof colorClasses]} flex items-center justify-center`}>
            <Icon className="w-6 h-6 text-white" />
          </div>
          
          <div className={`flex items-center gap-1 px-2 py-1 rounded-lg ${
            change >= 0
              ? 'bg-green-500/20 border border-green-500/30'
              : 'bg-red-500/20 border border-red-500/30'
          }`}>
            {change >= 0 ? (
              <TrendingUp className="w-4 h-4 text-green-400" />
            ) : (
              <TrendingDown className="w-4 h-4 text-red-400" />
            )}
            <span className={`text-xs font-bold ${
              change >= 0 ? 'text-green-400' : 'text-red-400'
            }`}>
              {Math.abs(change)}%
            </span>
          </div>
        </div>

        <p className="text-sm font-semibold text-slate-400 mb-2">{title}</p>
        <p className="text-3xl font-black text-white">{value}</p>
      </div>
    </div>
  );
}