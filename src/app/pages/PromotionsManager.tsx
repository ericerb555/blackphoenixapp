/**
 * Promotions Manager - Comprehensive Promotions & Coupons Management
 * 
 * Full-featured system for creating and managing promotional campaigns:
 * - Coupon codes with usage limits
 * - Site-wide sales and discounts
 * - Giveaway campaigns
 * - Performance analytics
 * - ROI tracking
 */

import { useState, useEffect } from 'react';
import {
  Gift, Tag, Percent, DollarSign, Calendar, Users, TrendingUp, TrendingDown,
  Plus, Edit, Trash2, Eye, Copy, Search, Filter, Download, Settings,
  BarChart3, Activity, Clock, CheckCircle, XCircle, Sparkles, ArrowLeft,
  Share2, Send, Target, X, Save
} from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { toast } from 'sonner@2.0.3';
import { publicAnonKey, projectId } from '../utils/supabase/info';

const SERVER = `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6`;
const authHeaders = { 'Content-Type': 'application/json', Authorization: `Bearer ${publicAnonKey}` };

const DEFAULT_PROMOS = [
    {
      id: 'PROMO-001',
      name: 'Spring Sale 2026',
      type: 'sale',
      code: 'SPRING2026',
      discount: '25% OFF',
      discountType: 'percentage',
      discountValue: 25,
      used: 487,
      limit: 1000,
      revenue: 28450,
      expires: '2026-06-30',
      status: 'active'
    },
    {
      id: 'PROMO-002',
      name: 'New Customer Welcome',
      type: 'coupon',
      code: 'WELCOME50',
      discount: '$50 OFF',
      discountType: 'fixed',
      discountValue: 50,
      used: 234,
      limit: 500,
      revenue: 11700,
      expires: '2026-12-31',
      status: 'active'
    },
    {
      id: 'PROMO-003',
      name: 'Weekend Flash Sale',
      type: 'sale',
      code: 'WEEKEND15',
      discount: '15% OFF',
      discountType: 'percentage',
      discountValue: 15,
      used: 892,
      limit: 1000,
      revenue: 13380,
      expires: '2026-04-20',
      status: 'active'
    },
    {
      id: 'PROMO-004',
      name: 'Tool Giveaway Contest',
      type: 'giveaway',
      code: 'GIVEAWAY2026',
      discount: 'Free Entry',
      discountType: 'none',
      discountValue: 0,
      used: 1248,
      limit: 5000,
      revenue: 0,
      expires: '2026-05-15',
      status: 'active'
    },
    {
      id: 'PROMO-005',
      name: 'Referral Bonus',
      type: 'coupon',
      code: 'REFER20',
      discount: '$20 OFF',
      discountType: 'fixed',
      discountValue: 20,
      used: 156,
      limit: 1000,
      revenue: 3120,
      expires: '2026-12-31',
      status: 'active'
    },
    {
      id: 'PROMO-006',
      name: 'Black Friday Mega Sale',
      type: 'sale',
      code: 'BLACKFRIDAY',
      discount: '40% OFF',
      discountType: 'percentage',
      discountValue: 40,
      used: 2145,
      limit: 5000,
      revenue: 85800,
      expires: '2026-11-29',
      status: 'scheduled'
    },
    {
      id: 'PROMO-007',
      name: 'Summer Clearance',
      type: 'sale',
      code: 'SUMMER30',
      discount: '30% OFF',
      discountType: 'percentage',
      discountValue: 30,
      used: 1876,
      limit: 2000,
      revenue: 56280,
      expires: '2026-08-31',
      status: 'expired'
    },
];

const BLANK = { name: '', type: 'coupon' as 'coupon'|'sale'|'giveaway', code: '', discountType: 'percentage' as 'percentage'|'fixed'|'none', discountValue: 0, limit: 500, expires: '', status: 'active' as 'active'|'scheduled'|'expired' };

export default function PromotionsManager() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'coupons' | 'sales' | 'giveaways'>('all');
  const [promotions, setPromos] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingPromo, setEditingPromo] = useState<any | null>(null);
  const [viewingPromo, setViewingPromo] = useState<any | null>(null);
  const [form, setForm] = useState(BLANK);
  const [createType, setCreateType] = useState<'coupon'|'sale'|'giveaway'>('coupon');

  useEffect(() => { loadPromos(); }, []);

  async function loadPromos() {
    try {
      const res = await fetch(`${SERVER}/promotions`, { headers: authHeaders });
      const json = await res.json();
      if (json.success) {
        if (json.promotions.length === 0) {
          // Seed the database with defaults on first run.
          await Promise.all(DEFAULT_PROMOS.map(p =>
            fetch(`${SERVER}/promotions`, { method: 'POST', headers: authHeaders, body: JSON.stringify(p) })
          ));
          const re = await fetch(`${SERVER}/promotions`, { headers: authHeaders });
          const reJson = await re.json();
          setPromos(reJson.promotions || []);
        } else {
          setPromos(json.promotions);
        }
      }
    } catch (err) {
      console.error('Promotions load error:', err);
      toast.error('Could not load promotions from server');
    }
  }

  function openCreate(type: 'coupon'|'sale'|'giveaway' = 'coupon') {
    setCreateType(type);
    setForm({ ...BLANK, type, code: type.toUpperCase() + Math.floor(Math.random() * 9000 + 1000), expires: new Date(Date.now() + 90 * 86400000).toISOString().split('T')[0] });
    setEditingPromo(null);
    setShowModal(true);
  }

  function openEdit(promo: any) {
    setForm({ name: promo.name, type: promo.type, code: promo.code, discountType: promo.discountType, discountValue: promo.discountValue, limit: promo.limit, expires: promo.expires, status: promo.status });
    setEditingPromo(promo);
    setShowModal(true);
  }

  async function savePromo() {
    if (!form.name || !form.code) { toast.error('Name and code are required'); return; }
    try {
      if (editingPromo) {
        const res = await fetch(`${SERVER}/promotions/${editingPromo.id}`, {
          method: 'PUT', headers: authHeaders, body: JSON.stringify({ ...form }),
        });
        const json = await res.json();
        if (!json.success) { toast.error(json.error || 'Failed to update'); return; }
        toast.success('Promotion updated');
      } else {
        const res = await fetch(`${SERVER}/promotions`, {
          method: 'POST', headers: authHeaders, body: JSON.stringify({ ...form }),
        });
        const json = await res.json();
        if (!json.success) { toast.error(json.error || 'Failed to create'); return; }
        toast.success(`"${form.name}" promotion created`);
      }
      await loadPromos();
      setShowModal(false);
      setEditingPromo(null);
    } catch (err) {
      console.error('Save promo error:', err);
      toast.error('Network error while saving promotion');
    }
  }

  async function deletePromo(id: string, name: string) {
    try {
      const res = await fetch(`${SERVER}/promotions/${id}`, { method: 'DELETE', headers: authHeaders });
      const json = await res.json();
      if (!json.success) { toast.error(json.error || 'Failed to delete'); return; }
      await loadPromos();
      toast.success(`"${name}" deleted`);
    } catch (err) {
      console.error('Delete promo error:', err);
      toast.error('Network error while deleting promotion');
    }
  }

  async function duplicatePromo(promo: any) {
    try {
      const { id, createdAt, ...rest } = promo;
      const res = await fetch(`${SERVER}/promotions`, {
        method: 'POST', headers: authHeaders,
        body: JSON.stringify({ ...rest, name: `${promo.name} (Copy)`, used: 0, revenue: 0 }),
      });
      const json = await res.json();
      if (!json.success) { toast.error(json.error || 'Failed to duplicate'); return; }
      await loadPromos();
      toast.success(`Duplicated "${promo.name}"`);
    } catch (err) {
      console.error('Duplicate promo error:', err);
      toast.error('Network error while duplicating promotion');
    }
  }

  function exportReport() {
    const csv = ['Name,Code,Type,Discount,Used,Limit,Revenue,Status,Expires', ...promotions.map(p => `"${p.name}","${p.code}","${p.type}","${p.discount}","${p.used}","${p.limit}","${p.revenue}","${p.status}","${p.expires}"`)].join('\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = 'promotions-report.csv'; a.click();
    toast.success('Report exported');
  }

  const filteredPromotions = promotions.filter(promo => {
    const matchesType = filterType === 'all' || promo.type === filterType;
    const matchesSearch = 
      promo.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      promo.code.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesSearch;
  });

  const stats = {
    activePromos: promotions.filter(p => p.status === 'active').length,
    totalSavings: promotions.reduce((sum, p) => sum + (p.revenue / (p.discountValue / 100)), 0),
    redemptions: promotions.reduce((sum, p) => sum + p.used, 0),
    conversionRate: 18.5
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      <PageHeader 
        title="Promotions & Coupons Manager"
        description="Create and manage promotional campaigns, discount codes, and special offers"
        onBack={() => window.location.href = '/revenue-monetization-hub?tab=promotions'}
      />

      <div className="max-w-[1800px] mx-auto p-6 space-y-6">
        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-pink-600/20 to-pink-700/20 border border-pink-500/30 rounded-lg p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-pink-200">Active Promos</p>
              <Gift className="w-5 h-5 text-pink-400" />
            </div>
            <p className="text-3xl font-bold text-white">{stats.activePromos}</p>
            <p className="text-sm text-pink-300 mt-1">Running campaigns</p>
          </div>

          <div className="bg-gradient-to-br from-green-600/20 to-green-700/20 border border-green-500/30 rounded-lg p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-green-200">Total Savings</p>
              <DollarSign className="w-5 h-5 text-green-400" />
            </div>
            <p className="text-3xl font-bold text-white">$45,280</p>
            <p className="text-sm text-green-300 mt-1">Customer savings</p>
          </div>

          <div className="bg-gradient-to-br from-blue-600/20 to-blue-700/20 border border-blue-500/30 rounded-lg p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-blue-200">Redemptions</p>
              <Tag className="w-5 h-5 text-blue-400" />
            </div>
            <p className="text-3xl font-bold text-white">{stats.redemptions.toLocaleString()}</p>
            <p className="text-sm text-blue-300 mt-1">Codes used</p>
          </div>

          <div className="bg-gradient-to-br from-purple-600/20 to-purple-700/20 border border-purple-500/30 rounded-lg p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-purple-200">Conversion Rate</p>
              <TrendingUp className="w-5 h-5 text-purple-400" />
            </div>
            <p className="text-3xl font-bold text-white">{stats.conversionRate}%</p>
            <p className="text-sm text-purple-300 mt-1">Promo to purchase</p>
          </div>
        </div>

        {/* Promotions Management */}
        <div className="bg-[#1A1A1A] border border-zinc-800 rounded-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Gift className="w-6 h-6 text-pink-500" />
              <h3 className="text-xl font-bold">All Promotions</h3>
            </div>
            <button
              onClick={() => openCreate('coupon')}
              className="px-4 py-3 bg-gradient-to-r from-pink-600 to-pink-700 hover:from-pink-700 hover:to-pink-800 text-white rounded-lg font-bold flex items-center gap-2 transition-all shadow-lg shadow-pink-600/30"
            >
              <Plus className="w-5 h-5" />
              Create Promotion
            </button>
          </div>

          {/* Search and Filters */}
          <div className="flex flex-wrap items-center gap-4 mb-6">
            <div className="flex-1 min-w-[300px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-[#0A0A0A] border border-zinc-800 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-pink-500 transition-colors"
                  placeholder="Search promotions or codes..."
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              {[
                { id: 'all', label: 'All', count: promotions.length },
                { id: 'coupons', label: 'Coupons', count: promotions.filter(p => p.type === 'coupon').length },
                { id: 'sales', label: 'Sales', count: promotions.filter(p => p.type === 'sale').length },
                { id: 'giveaways', label: 'Giveaways', count: promotions.filter(p => p.type === 'giveaway').length },
              ].map((filter) => (
                <button
                  key={filter.id}
                  onClick={() => setFilterType(filter.id as any)}
                  className={`px-4 py-3 rounded-lg text-sm font-semibold transition-all ${
                    filterType === filter.id
                      ? 'bg-pink-600 text-white shadow-lg shadow-pink-600/30'
                      : 'bg-[#0A0A0A] text-zinc-400 hover:text-white hover:bg-[#2A2A2A] border border-zinc-800'
                  }`}
                >
                  {filter.label} <span className="text-zinc-500">({filter.count})</span>
                </button>
              ))}
            </div>
          </div>

          {/* Promotions List */}
          <div className="space-y-3">
            {filteredPromotions.map((promo) => {
              const percentUsed = (promo.used / promo.limit) * 100;
              return (
                <div
                  key={promo.id}
                  className="bg-[#0A0A0A] border border-zinc-800 rounded-lg p-5 hover:border-pink-500/30 transition-all group"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="text-lg font-bold text-white">{promo.name}</h4>
                        <span className={`px-2 py-0.5 rounded text-sm font-semibold ${
                          promo.type === 'coupon' ? 'bg-blue-600/20 text-blue-400' :
                          promo.type === 'sale' ? 'bg-pink-600/20 text-pink-400' :
                          'bg-purple-600/20 text-purple-400'
                        }`}>
                          {promo.type.toUpperCase()}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-sm font-semibold ${
                          promo.status === 'active' ? 'bg-green-600/20 text-green-400' :
                          promo.status === 'scheduled' ? 'bg-yellow-600/20 text-yellow-400' :
                          'bg-gray-600/20 text-gray-400'
                        }`}>
                          {promo.status.toUpperCase()}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-zinc-400">
                        <span className="flex items-center gap-1">
                          <Tag className="w-3 h-3" />
                          Code: <span className="font-mono text-pink-400">{promo.code}</span>
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          Expires: {promo.expires}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-pink-400 mb-1">{promo.discount}</div>
                      {promo.revenue > 0 && (
                        <div className="text-sm text-green-400">+${promo.revenue.toLocaleString()} revenue</div>
                      )}
                    </div>
                  </div>

                  {/* Usage Progress */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between text-sm text-zinc-400 mb-2">
                      <span>Usage: {promo.used.toLocaleString()} / {promo.limit.toLocaleString()}</span>
                      <span>{percentUsed.toFixed(1)}% used</span>
                    </div>
                    <div className="w-full bg-zinc-800 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all ${
                          percentUsed >= 90 ? 'bg-red-500' :
                          percentUsed >= 70 ? 'bg-yellow-500' :
                          'bg-green-500'
                        }`}
                        style={{ width: `${percentUsed}%` }}
                      />
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => setViewingPromo(promo)}
                      className="flex-1 px-3 py-2 bg-[#1A1A1A] hover:bg-[#2A2A2A] border border-zinc-800 text-white rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2"
                    >
                      <Eye className="w-3 h-3" />
                      View Details
                    </button>
                    <button
                      onClick={() => openEdit(promo)}
                      className="flex-1 px-3 py-2 bg-[#1A1A1A] hover:bg-[#2A2A2A] border border-zinc-800 text-white rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2"
                    >
                      <Edit className="w-3 h-3" />
                      Edit
                    </button>
                    <button
                      onClick={() => duplicatePromo(promo)}
                      className="flex-1 px-3 py-2 bg-[#1A1A1A] hover:bg-[#2A2A2A] border border-zinc-800 text-white rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2"
                    >
                      <Copy className="w-3 h-3" />
                      Duplicate
                    </button>
                    <button
                      onClick={() => deletePromo(promo.id, promo.name)}
                      className="px-3 py-2 bg-red-600/10 hover:bg-red-600/20 border border-red-500/30 text-red-400 rounded-lg text-sm font-medium transition-all flex items-center gap-2"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Promotion Types Guide */}
        <div className="bg-[#1A1A1A] border border-zinc-800 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-6">
            <Sparkles className="w-6 h-6 text-yellow-500" />
            <h3 className="text-xl font-bold">Promotion Types</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gradient-to-br from-blue-600/10 to-blue-700/10 border border-blue-500/30 rounded-lg p-6">
              <Tag className="w-8 h-8 text-blue-400 mb-3" />
              <h4 className="font-bold text-lg mb-2">Coupon Codes</h4>
              <p className="text-sm text-zinc-400 mb-4">
                Unique codes customers enter at checkout for discounts
              </p>
              <ul className="text-sm text-zinc-500 space-y-1">
                <li>• Percentage or fixed amount off</li>
                <li>• Usage limits per customer</li>
                <li>• Minimum purchase requirements</li>
                <li>• Expiration dates</li>
              </ul>
            </div>

            <div className="bg-gradient-to-br from-pink-600/10 to-pink-700/10 border border-pink-500/30 rounded-lg p-6">
              <Percent className="w-8 h-8 text-pink-400 mb-3" />
              <h4 className="font-bold text-lg mb-2">Sale Events</h4>
              <p className="text-sm text-zinc-400 mb-4">
                Site-wide or category-specific promotional sales
              </p>
              <ul className="text-sm text-zinc-500 space-y-1">
                <li>• Flash sales & seasonal events</li>
                <li>• Automatic discounts applied</li>
                <li>• Targeted product categories</li>
                <li>• Time-limited promotions</li>
              </ul>
            </div>

            <div className="bg-gradient-to-br from-purple-600/10 to-purple-700/10 border border-purple-500/30 rounded-lg p-6">
              <Gift className="w-8 h-8 text-purple-400 mb-3" />
              <h4 className="font-bold text-lg mb-2">Giveaways</h4>
              <p className="text-sm text-zinc-400 mb-4">
                Contests and promotional giveaways to boost engagement
              </p>
              <ul className="text-sm text-zinc-500 space-y-1">
                <li>• Product prizes & rewards</li>
                <li>• Entry tracking & management</li>
                <li>• Social media integration</li>
                <li>• Winner selection tools</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Performance Analytics */}
        <div className="bg-[#1A1A1A] border border-zinc-800 rounded-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <BarChart3 className="w-6 h-6 text-green-500" />
              <h3 className="text-xl font-bold">Promotion Performance</h3>
            </div>
            <button
              onClick={exportReport}
              className="px-4 py-2 bg-[#2A2A2A] hover:bg-[#3A3A3A] text-white rounded-lg font-semibold flex items-center gap-2 transition-all"
            >
              <Download className="w-4 h-4" />
              Export Report
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Top Performing Promotions */}
            <div className="bg-[#0A0A0A] border border-zinc-800 rounded-lg p-6">
              <h4 className="font-semibold mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-green-400" />
                Top Performing Promotions
              </h4>
              <div className="space-y-3">
                {[
                  { name: 'Weekend Flash Sale', conversions: 892, revenue: '$13,380', roi: '+285%' },
                  { name: 'Spring Sale 2026', conversions: 487, revenue: '$28,450', roi: '+198%' },
                  { name: 'New Customer Welcome', conversions: 234, revenue: '$11,700', roi: '+156%' },
                ].map((promo, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-zinc-900 border border-zinc-800 rounded-lg hover:border-pink-500/30 transition-all">
                    <div className="flex-1">
                      <p className="font-semibold text-white text-sm">{promo.name}</p>
                      <p className="text-sm text-zinc-500">{promo.conversions} conversions</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-green-400">{promo.roi}</p>
                      <p className="text-sm text-zinc-500">{promo.revenue}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Key Metrics */}
            <div className="bg-[#0A0A0A] border border-zinc-800 rounded-lg p-6">
              <h4 className="font-semibold mb-4 flex items-center gap-2">
                <Activity className="w-5 h-5 text-blue-400" />
                Key Metrics
              </h4>
              <div className="space-y-4">
                {[
                  { label: 'Total Redemptions', value: '6,894', change: '+12.5%' },
                  { label: 'Average Discount', value: '$24.52', change: '-3.2%' },
                  { label: 'Conversion Rate', value: '18.5%', change: '+5.8%' },
                  { label: 'Customer Savings', value: '$45,280', change: '+18.7%' },
                  { label: 'Revenue Generated', value: '$198,730', change: '+22.4%' },
                ].map((metric, idx) => (
                  <div key={idx} className="flex items-center justify-between">
                    <span className="text-sm text-zinc-400">{metric.label}</span>
                    <div className="text-right">
                      <span className="font-bold text-white">{metric.value}</span>
                      <span className={`ml-2 text-sm ${
                        metric.change.startsWith('+') ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {metric.change}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => openCreate('coupon')}
            className="bg-gradient-to-br from-blue-600/10 to-blue-700/10 border border-blue-500/30 rounded-lg p-6 hover:border-blue-500/60 transition-all text-left group"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-lg bg-blue-600/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Tag className="w-6 h-6 text-blue-400" />
              </div>
              <h4 className="font-bold text-lg text-white">Create Coupon Code</h4>
            </div>
            <p className="text-sm text-zinc-400">Generate unique discount codes for customers</p>
          </button>

          <button
            onClick={() => openCreate('sale')}
            className="bg-gradient-to-br from-pink-600/10 to-pink-700/10 border border-pink-500/30 rounded-lg p-6 hover:border-pink-500/60 transition-all text-left group"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-lg bg-pink-600/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Percent className="w-6 h-6 text-pink-400" />
              </div>
              <h4 className="font-bold text-lg text-white">Schedule Sale Event</h4>
            </div>
            <p className="text-sm text-zinc-400">Plan site-wide or category sales</p>
          </button>

          <button
            onClick={() => openCreate('giveaway')}
            className="bg-gradient-to-br from-purple-600/10 to-purple-700/10 border border-purple-500/30 rounded-lg p-6 hover:border-purple-500/60 transition-all text-left group"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-lg bg-purple-600/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Gift className="w-6 h-6 text-purple-400" />
              </div>
              <h4 className="font-bold text-lg text-white">Launch Giveaway</h4>
            </div>
            <p className="text-sm text-zinc-400">Run promotional contests and giveaways</p>
          </button>
        </div>
      </div>

      {/* Create / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowModal(false)} />
          <div className="relative bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-[#2A2A2A]">
              <h3 className="font-bold text-white">{editingPromo ? 'Edit Promotion' : 'Create Promotion'}</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-500 hover:text-white"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-5 space-y-3">
              {[['Promotion Name', 'name', 'text'], ['Promo Code', 'code', 'text']].map(([label, key, type]) => (
                <div key={key}>
                  <label className="block text-xs text-gray-400 mb-1">{label}</label>
                  <input type={type} value={(form as any)[key]} onChange={e => setForm(v => ({ ...v, [key]: e.target.value }))}
                    className="w-full bg-[#111] border border-[#2A2A2A] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-pink-500 transition" />
                </div>
              ))}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Type</label>
                  <select value={form.type} onChange={e => setForm(v => ({ ...v, type: e.target.value as any }))}
                    className="w-full bg-[#111] border border-[#2A2A2A] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-pink-500 transition">
                    <option value="coupon">Coupon</option>
                    <option value="sale">Sale</option>
                    <option value="giveaway">Giveaway</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Discount Type</label>
                  <select value={form.discountType} onChange={e => setForm(v => ({ ...v, discountType: e.target.value as any }))}
                    className="w-full bg-[#111] border border-[#2A2A2A] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-pink-500 transition">
                    <option value="percentage">Percentage %</option>
                    <option value="fixed">Fixed Amount $</option>
                    <option value="none">None (entry/giveaway)</option>
                  </select>
                </div>
              </div>
              {form.discountType !== 'none' && (
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Discount Value</label>
                  <input type="number" min="0" value={form.discountValue} onChange={e => setForm(v => ({ ...v, discountValue: Number(e.target.value) }))}
                    className="w-full bg-[#111] border border-[#2A2A2A] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-pink-500 transition" />
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Usage Limit</label>
                  <input type="number" min="1" value={form.limit} onChange={e => setForm(v => ({ ...v, limit: Number(e.target.value) }))}
                    className="w-full bg-[#111] border border-[#2A2A2A] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-pink-500 transition" />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Expires</label>
                  <input type="date" value={form.expires} onChange={e => setForm(v => ({ ...v, expires: e.target.value }))}
                    className="w-full bg-[#111] border border-[#2A2A2A] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-pink-500 transition" />
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Status</label>
                <select value={form.status} onChange={e => setForm(v => ({ ...v, status: e.target.value as any }))}
                  className="w-full bg-[#111] border border-[#2A2A2A] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-pink-500 transition">
                  <option value="active">Active</option>
                  <option value="scheduled">Scheduled</option>
                  <option value="expired">Expired</option>
                </select>
              </div>
            </div>
            <div className="p-5 border-t border-[#2A2A2A] flex gap-2">
              <button onClick={() => setShowModal(false)} className="flex-1 py-2 border border-[#2A2A2A] text-gray-400 rounded-lg text-sm hover:text-white transition">Cancel</button>
              <button onClick={savePromo} className="flex-1 py-2 bg-pink-600 hover:bg-pink-500 text-white rounded-lg text-sm font-semibold transition flex items-center justify-center gap-1.5">
                <Save className="w-3.5 h-3.5" />{editingPromo ? 'Save Changes' : 'Create Promotion'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Details Modal */}
      {viewingPromo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setViewingPromo(null)} />
          <div className="relative bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-[#2A2A2A]">
              <h3 className="font-bold text-white">{viewingPromo.name}</h3>
              <button onClick={() => setViewingPromo(null)} className="text-gray-500 hover:text-white"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-5 space-y-3">
              <div className="text-center py-4">
                <p className="text-3xl font-bold text-pink-400 mb-1">{viewingPromo.discount}</p>
                <p className="text-sm font-mono text-white bg-[#111] px-4 py-2 rounded-lg inline-block mt-2">{viewingPromo.code}</p>
              </div>
              {[['Type', viewingPromo.type], ['Status', viewingPromo.status], ['Used', `${viewingPromo.used.toLocaleString()} / ${viewingPromo.limit.toLocaleString()}`], ['Revenue Generated', `$${viewingPromo.revenue.toLocaleString()}`], ['Expires', viewingPromo.expires]].map(([label, val]) => (
                <div key={label} className="flex justify-between py-2 border-b border-[#2A2A2A]">
                  <span className="text-xs text-gray-400">{label}</span>
                  <span className="text-sm text-white font-medium capitalize">{val}</span>
                </div>
              ))}
            </div>
            <div className="p-5 border-t border-[#2A2A2A] flex gap-2">
              <button onClick={() => { navigator.clipboard.writeText(viewingPromo.code); toast.success('Code copied to clipboard'); }} className="flex-1 py-2 border border-[#2A2A2A] text-gray-400 rounded-lg text-sm hover:text-white transition flex items-center justify-center gap-1.5"><Copy className="w-3.5 h-3.5" /> Copy Code</button>
              <button onClick={() => { setViewingPromo(null); openEdit(viewingPromo); }} className="flex-1 py-2 bg-pink-600 hover:bg-pink-500 text-white rounded-lg text-sm font-semibold transition flex items-center justify-center gap-1.5"><Edit className="w-3.5 h-3.5" /> Edit</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
