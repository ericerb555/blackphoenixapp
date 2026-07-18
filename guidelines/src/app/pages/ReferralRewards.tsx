import { useState } from 'react';
import { Gift, Users, DollarSign, Plus, TrendingUp, Award, Search, Edit2, Share2, Copy, ArrowLeft } from 'lucide-react';

export default function ReferralRewards() {
  const [referrals] = useState([
    { id: 'REF-001', referrer: 'Sarah Johnson', referred: 'Mike Williams', status: 'rewarded', reward: 500, date: '2026-01-20', code: 'SJ2026' },
    { id: 'REF-002', referrer: 'Robert Chen', referred: 'Lisa Martinez', status: 'converted', reward: 500, date: '2026-01-18', code: 'RC2026' },
    { id: 'REF-003', referrer: 'Emily Williams', referred: 'John Davis', status: 'pending', reward: 500, date: '2026-01-15', code: 'EW2026' },
  ]);

  const stats = [
    { label: 'Total Referrals', value: '48', icon: Users, change: '+12%' },
    { label: 'Rewards Paid', value: '$12,500', icon: DollarSign, change: '+18%' },
    { label: 'Conversion Rate', value: '68%', icon: TrendingUp, change: '+5%' },
    { label: 'Active Programs', value: '3', icon: Gift, change: '+1%' }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-4 mb-2">
          <button
            onClick={() => {
              window.location.href = '/unified-dashboard';
            }}
            className="p-2 hover:bg-[#2A2A2A] rounded-lg transition-colors text-gray-400 hover:text-white"
            title="Back to Unified Dashboard"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-3xl font-bold text-white flex items-center gap-2">
            <Gift className="w-8 h-8 text-[#ea580c]" />
            Referral Rewards
          </h1>
        </div>
        <p className="text-gray-400 ml-14">Manage referral programs and track rewards</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div key={i} className="bg-[#1A1A1A] rounded-2xl p-6 border border-[#2A2A2A] hover:border-[#ea580c]/30 transition group">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#ea580c]/20 to-[#dc2626]/20 flex items-center justify-center border border-[#ea580c]/20">
                  <Icon className="w-6 h-6 text-[#ea580c]" />
                </div>
                <span className="text-sm font-semibold text-green-400">{stat.change}</span>
              </div>
              <p className="text-2xl font-bold text-white">{stat.value}</p>
              <p className="text-sm text-gray-400">{stat.label}</p>
            </div>
          );
        })}
      </div>

      {/* Active Programs */}
      <div className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Active Programs</h2>
          <button className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#ea580c] to-[#dc2626] text-white rounded-xl hover:from-[#dc2626] hover:to-[#b91c1c] transition shadow-lg shadow-[#ea580c]/20">
            <Plus className="w-4 h-4" />
            New Program
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { name: 'Customer Referral', reward: '$500', referrals: 32, active: true },
            { name: 'VIP Referral', reward: '$1,000', referrals: 12, active: true },
            { name: 'Partner Referral', reward: '$750', referrals: 4, active: true }
          ].map((program, i) => (
            <div key={i} className="bg-[#0A0A0A] rounded-xl border border-[#2A2A2A] p-6 hover:border-[#ea580c]/30 transition group cursor-pointer">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#ea580c]/20 to-[#dc2626]/20 flex items-center justify-center border border-[#ea580c]/20">
                  <Award className="w-6 h-6 text-[#ea580c]" />
                </div>
                <span className="px-2 py-1 rounded-lg text-sm font-semibold bg-green-500/10 text-green-400 border border-green-500/20">
                  ACTIVE
                </span>
              </div>
              <h3 className="font-semibold text-white mb-1 group-hover:text-[#ea580c] transition">{program.name}</h3>
              <p className="text-2xl font-bold text-[#ea580c] mb-2">{program.reward}</p>
              <p className="text-sm text-gray-400">{program.referrals} referrals</p>
            </div>
          ))}
        </div>
      </div>

      {/* Actions Bar */}
      <div className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] p-6">
        <div className="flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
            <input
              type="text"
              placeholder="Search referrals..."
              className="w-full pl-11 pr-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#ea580c]/50"
            />
          </div>
          <button className="flex items-center gap-2 px-4 py-3 border border-[#2A2A2A] rounded-xl text-gray-300 hover:bg-[#2A2A2A] transition">
            <Share2 className="w-4 h-4" />
            Share Link
          </button>
        </div>
      </div>

      {/* Referrals List */}
      <div className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] overflow-hidden">
        <div className="px-6 py-4 border-b border-[#2A2A2A]">
          <h2 className="text-lg font-semibold text-white">Recent Referrals</h2>
        </div>
        <div className="divide-y divide-[#2A2A2A]">
          {referrals.map((referral) => (
            <div key={referral.id} className="p-6 hover:bg-[#2A2A2A]/50 transition cursor-pointer">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#ea580c]/20 to-[#dc2626]/20 flex items-center justify-center border border-[#ea580c]/20">
                    <Gift className="w-6 h-6 text-[#ea580c]" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">{referral.id}</h3>
                    <p className="text-sm text-gray-400">{referral.referrer} → {referral.referred}</p>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <p className="text-sm text-gray-500">Reward</p>
                    <p className="font-semibold text-[#ea580c]">${referral.reward}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-500">Code</p>
                    <div className="flex items-center gap-2">
                      <p className="text-sm text-gray-300 font-mono">{referral.code}</p>
                      <button className="p-1 hover:bg-[#ea580c]/10 rounded transition">
                        <Copy className="w-3 h-3 text-[#ea580c]" />
                      </button>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-500">Date</p>
                    <p className="text-sm text-gray-300">{referral.date}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-lg text-sm font-semibold ${
                    referral.status === 'rewarded' ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
                    referral.status === 'converted' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                    'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                  }`}>
                    {referral.status.toUpperCase()}
                  </span>
                  <button className="p-2 hover:bg-[#ea580c]/10 rounded-lg transition">
                    <Edit2 className="w-4 h-4 text-[#ea580c]" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}