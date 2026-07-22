import { useState, useEffect } from 'react';
import {
  TrendingUp, Users, Calendar, Award, BarChart3, PieChart,
  ArrowUpRight, ArrowDownRight, Loader, RefreshCw, Download,
  Search, Filter, Star, MapPin, Radio, Smartphone, Mail
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { projectId } from '../../utils/supabase/info';
import { toast } from 'sonner@2.0.3';
import { DataTable } from '../ui/table/DataTable';
import type { DataTableColumn } from '../ui/table/DataTable';

interface ReferralSourceData {
  source_name: string;
  category: string;
  color: string;
  total_signups: number;
  signups_last_30_days: number;
  signups_last_7_days: number;
  total_value: number;
  avg_value_per_signup: number;
  first_signup: string;
  last_signup: string;
  user_roles: string[];
}

interface OnboardingFunnelData {
  started_count: number;
  completed_count: number;
  skipped_count: number;
  abandoned_count: number;
  completion_rate: number;
  avg_completion_time_minutes: number;
}

const ICON_MAP: Record<string, any> = {
  Search, Users, Mail, Star, Smartphone, MapPin, Radio
};

export default function ReferralSourceReport() {
  const [referralData, setReferralData] = useState<ReferralSourceData[]>([]);
  const [funnelData, setFunnelData] = useState<OnboardingFunnelData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'total' | 'recent' | 'value'>('total');

  useEffect(() => {
    loadReportData();
  }, []);

  const loadReportData = async () => {
    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Sign in as the Platform Owner to view referral reporting.');
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-57095a78/reporting/referral-sources`, { headers: { Authorization: `Bearer ${session.access_token}` } });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || 'Unable to load referral reporting.');
      setReferralData(result.sources || []); setFunnelData(result.funnel || null);
    } catch (err: any) { console.error('Error loading referral report:', err); toast.error(err?.message || 'Failed to load referral data'); setReferralData([]); setFunnelData(null); }
    finally { setIsLoading(false); }
  };
  const filteredData = referralData
    .filter(item => {
      const matchesSearch = item.source_name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter;
      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => {
      if (sortBy === 'total') return b.total_signups - a.total_signups;
      if (sortBy === 'recent') return b.signups_last_30_days - a.signups_last_30_days;
      if (sortBy === 'value') return b.total_value - a.total_value;
      return 0;
    });

  const totalSignups = referralData.reduce((sum, item) => sum + item.total_signups, 0);
  const totalValue = referralData.reduce((sum, item) => sum + item.total_value, 0);
  const activeSourcesCount = referralData.filter(item => item.total_signups > 0).length;

  const referralColumns: DataTableColumn<ReferralSourceData>[] = [
    {
      key: 'source_name',
      header: 'Source',
      render: (row) => {
        const percentage = ((row.total_signups / totalSignups) * 100).toFixed(1);
        return (
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: row.color + '20' }}
            >
              <Star className="w-5 h-5" style={{ color: row.color }} />
            </div>
            <div>
              <div className="font-medium text-white">{row.source_name}</div>
              <div className="text-xs text-gray-400">{percentage}% of total</div>
            </div>
          </div>
        );
      },
    },
    {
      key: 'category',
      header: 'Category',
      render: (row) => (
        <span className="px-3 py-1 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-sm text-gray-300 capitalize">
          {row.category}
        </span>
      ),
    },
    {
      key: 'total_signups',
      header: 'Total',
      align: 'right',
      render: (row) => <span className="text-white font-semibold">{row.total_signups}</span>,
    },
    {
      key: 'signups_last_30_days',
      header: 'Last 30d',
      align: 'right',
      render: (row) => <span className="text-gray-300">{row.signups_last_30_days}</span>,
    },
    {
      key: 'signups_last_7_days',
      header: 'Last 7d',
      align: 'right',
      render: (row) => <span className="text-gray-300">{row.signups_last_7_days}</span>,
    },
    {
      key: 'avg_value_per_signup',
      header: 'Avg Value',
      align: 'right',
      render: (row) => (
        <span className="text-white font-medium">
          ${row.avg_value_per_signup.toFixed(0)}
        </span>
      ),
    },
    {
      key: 'trend',
      header: 'Trend',
      align: 'right',
      render: (row) => {
        const trend = row.signups_last_7_days > 0 ? 'up' : row.total_signups > 0 ? 'stable' : 'none';
        return (
          <>
            {trend === 'up' && (
              <div className="inline-flex items-center gap-1 text-green-400">
                <ArrowUpRight className="w-4 h-4" />
                <span className="text-sm font-medium">Growing</span>
              </div>
            )}
            {trend === 'stable' && (
              <span className="text-gray-400 text-sm">Stable</span>
            )}
            {trend === 'none' && (
              <span className="text-gray-500 text-sm">-</span>
            )}
          </>
        );
      },
    },
  ];

  const categories = ['all', ...Array.from(new Set(referralData.map(item => item.category)))];

  const exportToCSV = () => {
    const headers = ['Source', 'Category', 'Total Signups', 'Last 30 Days', 'Last 7 Days', 'Total Value', 'Avg Value'];
    const rows = filteredData.map(item => [
      item.source_name,
      item.category,
      item.total_signups,
      item.signups_last_30_days,
      item.signups_last_7_days,
      `$${item.total_value.toFixed(2)}`,
      `$${item.avg_value_per_signup.toFixed(2)}`
    ]);

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `referral-sources-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    toast.success('Report exported to CSV');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Loader className="w-12 h-12 text-orange-400 animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading referral data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <TrendingUp className="w-7 h-7 text-orange-400" />
            Referral Source Analytics
          </h2>
          <p className="text-gray-400 mt-1">Track how users discover your platform</p>
        </div>
        
        <div className="flex gap-3">
          <button
            onClick={loadReportData}
            className="px-4 py-2 bg-[#1A1A1A] hover:bg-[#2A2A2A] border border-[#2A2A2A] text-white rounded-xl transition-all flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
          <button
            onClick={exportToCSV}
            className="px-4 py-2 bg-gradient-to-r from-[#ea580c] to-[#c2410c] hover:from-[#c2410c] hover:to-[#9a3412] text-white rounded-xl transition-all flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Onboarding Funnel Stats */}
      {funnelData && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-400 text-sm">Started</span>
              <Users className="w-5 h-5 text-blue-400" />
            </div>
            <div className="text-3xl font-bold text-white">{funnelData.started_count}</div>
          </div>

          <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-400 text-sm">Completed</span>
              <Award className="w-5 h-5 text-green-400" />
            </div>
            <div className="text-3xl font-bold text-white">{funnelData.completed_count}</div>
          </div>

          <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-400 text-sm">Completion Rate</span>
              <TrendingUp className="w-5 h-5 text-orange-400" />
            </div>
            <div className="text-3xl font-bold text-white">{funnelData.completion_rate}%</div>
          </div>

          <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-400 text-sm">Avg Time</span>
              <Calendar className="w-5 h-5 text-purple-400" />
            </div>
            <div className="text-3xl font-bold text-white">
              {funnelData.avg_completion_time_minutes?.toFixed(1) || '0'}m
            </div>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-orange-500/20 to-orange-600/10 border border-orange-500/30 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-orange-200 text-sm font-medium">Total Signups</span>
            <Users className="w-5 h-5 text-orange-400" />
          </div>
          <div className="text-4xl font-bold text-white mb-1">{totalSignups}</div>
          <p className="text-orange-200 text-sm">From all sources</p>
        </div>

        <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/10 border border-blue-500/30 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-blue-200 text-sm font-medium">Active Sources</span>
            <Star className="w-5 h-5 text-blue-400" />
          </div>
          <div className="text-4xl font-bold text-white mb-1">{activeSourcesCount}</div>
          <p className="text-blue-200 text-sm">Channels with signups</p>
        </div>

        <div className="bg-gradient-to-br from-green-500/20 to-green-600/10 border border-green-500/30 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-green-200 text-sm font-medium">Total Value</span>
            <TrendingUp className="w-5 h-5 text-green-400" />
          </div>
          <div className="text-4xl font-bold text-white mb-1">${totalValue.toFixed(0)}</div>
          <p className="text-green-200 text-sm">Lifetime value generated</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search sources..."
              className="w-full pl-10 pr-4 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white focus:border-orange-500 focus:outline-none transition-colors"
            />
          </div>

          <div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full px-4 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white focus:border-orange-500 focus:outline-none transition-colors capitalize"
            >
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat === 'all' ? 'All Categories' : cat}</option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full px-4 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white focus:border-orange-500 focus:outline-none transition-colors"
            >
              <option value="total">Sort by Total Signups</option>
              <option value="recent">Sort by Recent Activity</option>
              <option value="value">Sort by Value</option>
            </select>
          </div>
        </div>
      </div>

      {/* Data Table */}
      <DataTable
        columns={referralColumns}
        data={filteredData}
        emptyMessage="No referral sources match your filters"
        rowHoverEffect={true}
        containerClassName="bg-[#1A1A1A] border-[#2A2A2A]"
      />
    </div>
  );
}
