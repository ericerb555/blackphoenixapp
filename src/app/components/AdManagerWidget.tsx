import { useState, useEffect } from 'react';
import { Megaphone, Eye, ExternalLink, TrendingUp, Plus, ChevronRight } from 'lucide-react';

/**
 * AdManagerWidget
 * 
 * Quick overview widget for dashboard showing:
 * - Total active ads
 * - Recent performance stats
 * - Quick link to full ad manager
 */

export default function AdManagerWidget() {
  const [stats, setStats] = useState({
    totalAds: 0,
    activeAds: 0,
    totalImpressions: 0,
    totalClicks: 0,
    avgCTR: 0
  });

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = () => {
    const saved = localStorage.getItem('advertisements');
    if (saved) {
      const ads = JSON.parse(saved);
      const activeAds = ads.filter((ad: any) => ad.isActive);
      const totalImpressions = ads.reduce((sum: number, ad: any) => sum + (ad.impressionCount || 0), 0);
      const totalClicks = ads.reduce((sum: number, ad: any) => sum + (ad.clickCount || 0), 0);
      const avgCTR = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;

      setStats({
        totalAds: ads.length,
        activeAds: activeAds.length,
        totalImpressions,
        totalClicks,
        avgCTR
      });
    }
  };

  return (
    <div className="bg-[#1a1a1a] rounded-lg border border-gray-800 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#ea580c]/20 rounded-lg flex items-center justify-center">
            <Megaphone className="w-5 h-5 text-[#ea580c]" />
          </div>
          <div>
            <h3 className="font-semibold text-white">Advertising</h3>
            <p className="text-xs text-gray-400">Campaign Performance</p>
          </div>
        </div>
        <button
          onClick={() => window.location.href = '/advertising-management'}
          className="text-[#ea580c] hover:text-[#dc4a08] transition-colors flex items-center gap-1 text-sm"
        >
          <span>Manage</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-[#0A0A0A] rounded-lg p-3">
          <div className="text-2xl font-bold text-white">{stats.activeAds}</div>
          <div className="text-xs text-gray-400">Active Ads</div>
        </div>
        <div className="bg-[#0A0A0A] rounded-lg p-3">
          <div className="text-2xl font-bold text-white">{stats.totalAds}</div>
          <div className="text-xs text-gray-400">Total Created</div>
        </div>
        <div className="bg-[#0A0A0A] rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <Eye className="w-4 h-4 text-blue-400" />
            <div className="text-lg font-bold text-white">
              {stats.totalImpressions.toLocaleString()}
            </div>
          </div>
          <div className="text-xs text-gray-400">Impressions</div>
        </div>
        <div className="bg-[#0A0A0A] rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <ExternalLink className="w-4 h-4 text-purple-400" />
            <div className="text-lg font-bold text-white">
              {stats.totalClicks.toLocaleString()}
            </div>
          </div>
          <div className="text-xs text-gray-400">Clicks</div>
        </div>
      </div>

      {/* CTR */}
      {stats.totalImpressions > 0 && (
        <div className="bg-gradient-to-r from-[#ea580c]/10 to-transparent rounded-lg p-3 mb-4 border-l-2 border-[#ea580c]">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-gray-400 mb-1">Average CTR</div>
              <div className="text-xl font-bold text-[#ea580c]">
                {stats.avgCTR.toFixed(2)}%
              </div>
            </div>
            <TrendingUp className="w-8 h-8 text-[#ea580c] opacity-50" />
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="flex gap-2">
        <button
          onClick={() => window.location.href = '/advertising-management'}
          className="flex-1 py-2 bg-[#ea580c] hover:bg-[#dc4a08] rounded-lg text-white text-sm font-medium transition-colors flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Create Ad
        </button>
        <button
          onClick={() => window.location.href = '/advertising-management'}
          className="px-4 py-2 bg-[#2a2a2a] hover:bg-[#3a3a3a] rounded-lg text-white text-sm transition-colors"
        >
          View All
        </button>
      </div>
    </div>
  );
}
