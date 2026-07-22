import { useState, useEffect, useMemo } from 'react';
import { Gift, Users, DollarSign, Plus, TrendingUp, Award, Search, Edit2, Share2, Copy, ArrowLeft, X } from 'lucide-react';
import { toast } from 'sonner';
import { projectId } from '../utils/supabase/info';
import { useAuth } from '../contexts/AuthContext';
import PersonalReferralRewards from '../components/ReferralRewards';

const SERVER = `https://${projectId}.supabase.co/functions/v1/make-server-57095a78`;

interface Referral {
  id: string;
  referrer: string;
  referred: string;
  status: 'pending' | 'converted' | 'rewarded';
  reward: number;
  date: string;
  code: string;
}

interface Program {
  id: string;
  name: string;
  reward: string;
  referrals: number;
  active: boolean;
}


export default function ReferralRewards() {
  const auth = useAuth();
  const canManageReferrals = Boolean((auth as any)?.isAdmin || (auth as any)?.isOwner || (auth as any)?.isMasterAdmin);
  if (!canManageReferrals) {
    return <div className="min-h-screen bg-[#0d0d0d] px-4 py-6 text-white sm:px-6"><PersonalReferralRewards /></div>;
  }
  return <ReferralRewardsManagement />;
}

function ReferralRewardsManagement() {
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const { session } = useAuth();
  const [form, setForm] = useState({ name: '', reward: '' });

  async function request(path: string, init: RequestInit = {}) {
    if (!session?.access_token) throw new Error('Sign in with an administrator account to manage referrals.');
    const res = await fetch(`${SERVER}${path}`, {
      ...init,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}`, ...(init.headers || {}) },
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || json.success === false) throw new Error(json.error || 'Referral request failed.');
    return json;
  }

  useEffect(() => {
    if (!session?.access_token) { setReferrals([]); setPrograms([]); return; }
    (async () => {
      try {
        const json = await request('/referrals');
        setReferrals(Array.isArray(json.referrals) ? json.referrals : []);
        setPrograms(Array.isArray(json.programs) ? json.programs : []);
      } catch (err: any) {
        toast.error(err.message || 'Unable to load referral programs.');
        setReferrals([]); setPrograms([]);
      }
    })();
  }, [session?.access_token]);

  async function persist(r: Referral[], p: Program[]) {
    try {
      await request('/referrals', { method: 'POST', body: JSON.stringify({ referrals: r, programs: p }) });
    } catch (err: any) { toast.error(err.message || 'Unable to save referral programs.'); }
  }

  function createProgram() {
    if (!form.name.trim() || !form.reward.trim()) { toast.error('Name and reward are required.'); return; }
    const reward = form.reward.trim().startsWith('$') ? form.reward.trim() : `$${form.reward.trim()}`;
    const program: Program = { id: `prog-${Date.now()}`, name: form.name.trim(), reward, referrals: 0, active: true };
    const next = [...programs, program];
    setPrograms(next);
    persist(referrals, next);
    setForm({ name: '', reward: '' });
    setShowCreate(false);
    toast.success('Program created.');
  }

  function copyCode(code: string) {
    navigator.clipboard.writeText(code);
    toast.success(`Code ${code} copied.`);
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return referrals;
    return referrals.filter(r =>
      r.referrer.toLowerCase().includes(q) ||
      r.referred.toLowerCase().includes(q) ||
      r.code.toLowerCase().includes(q) ||
      r.id.toLowerCase().includes(q)
    );
  }, [referrals, search]);

  const totalReferrals = referrals.length;
  const rewardsPaid = referrals.filter(r => r.status === 'rewarded').reduce((s, r) => s + r.reward, 0);
  const converted = referrals.filter(r => r.status !== 'pending').length;
  const conversionRate = totalReferrals ? Math.round((converted / totalReferrals) * 100) : 0;

  const stats = [
    { label: 'Total Referrals', value: String(totalReferrals), icon: Users },
    { label: 'Rewards Paid', value: `$${rewardsPaid.toLocaleString()}`, icon: DollarSign },
    { label: 'Conversion Rate', value: `${conversionRate}%`, icon: TrendingUp },
    { label: 'Active Programs', value: String(programs.filter(p => p.active).length), icon: Gift },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-4 mb-2">
          <button
            onClick={() => { window.location.href = '/unified-dashboard'; }}
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
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="bg-[#1A1A1A] rounded-2xl p-6 border border-[#2A2A2A] hover:border-[#ea580c]/30 transition group">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#ea580c]/20 to-[#dc2626]/20 flex items-center justify-center border border-[#ea580c]/20">
                  <Icon className="w-6 h-6 text-[#ea580c]" />
                </div>
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
          <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#ea580c] to-[#dc2626] text-white rounded-xl hover:from-[#dc2626] hover:to-[#b91c1c] transition shadow-lg shadow-[#ea580c]/20">
            <Plus className="w-4 h-4" />
            New Program
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {programs.map((program) => (
            <div key={program.id} className="bg-[#0A0A0A] rounded-xl border border-[#2A2A2A] p-6 hover:border-[#ea580c]/30 transition group cursor-pointer">
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
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search referrals..."
              className="w-full pl-11 pr-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#ea580c]/50"
            />
          </div>
          <button
            onClick={() => { navigator.clipboard.writeText('https://theblackphoenixcompany.com/refer'); toast.success('Referral link copied.'); }}
            className="flex items-center gap-2 px-4 py-3 border border-[#2A2A2A] rounded-xl text-gray-300 hover:bg-[#2A2A2A] transition"
          >
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
          {filtered.map((referral) => (
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
                      <button onClick={() => copyCode(referral.code)} className="p-1 hover:bg-[#ea580c]/10 rounded transition">
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
                </div>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="p-10 text-center text-gray-600 text-sm">No referrals found.</div>
          )}
        </div>
      </div>

      {/* Create Program Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#2A2A2A]">
              <h2 className="font-bold text-white">New Referral Program</h2>
              <button onClick={() => setShowCreate(false)} className="text-gray-500 hover:text-white transition">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-sm text-gray-400 mb-1.5 block">Program Name</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Holiday Referral"
                  className="w-full bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#ea580c]/50" />
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-1.5 block">Reward Amount</label>
                <input value={form.reward} onChange={e => setForm(f => ({ ...f, reward: e.target.value }))}
                  placeholder="e.g. $500"
                  className="w-full bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#ea580c]/50" />
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 pb-6">
              <button onClick={() => setShowCreate(false)} className="px-4 py-2 rounded-xl text-sm text-gray-400 hover:text-white transition">Cancel</button>
              <button onClick={createProgram} className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#ea580c] to-[#dc2626] text-white text-sm font-semibold transition">Create Program</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
