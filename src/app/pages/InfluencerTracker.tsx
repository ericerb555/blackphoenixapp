import { useState, useMemo, useEffect } from 'react';
import { Users, Plus, Edit3, Trash2, Search, Instagram, Link2, Download, Eye, X, Save, DollarSign, Star, TrendingUp, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { publicAnonKey, projectId } from '../utils/supabase/info';

const SERVER = `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6`;
const authHeaders = { 'Content-Type': 'application/json', Authorization: `Bearer ${publicAnonKey}` };

// ─── Types ────────────────────────────────────────────────────────────────────

type AmbassadorStatus = 'active' | 'inactive' | 'prospect' | 'paused';
type Platform = 'Instagram' | 'Facebook' | 'TikTok' | 'YouTube' | 'Nextdoor' | 'Other';

interface Ambassador {
  id: string;
  name: string;
  email: string;
  phone: string;
  platform: Platform;
  handle: string;
  followers: number;
  niche: string;
  status: AmbassadorStatus;
  promoCode: string;
  commissionPct: number;
  referrals: number;
  revenue: number;
  notes: string;
  joinedAt: string;
  lastPost: string;
  tags: string[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function persist(a: Ambassador[]) {
  try {
    const res = await fetch(`${SERVER}/influencers`, { method: 'POST', headers: authHeaders, body: JSON.stringify({ influencers: a }) });
    const json = await res.json();
    if (!json.success) console.error('Failed to save influencers:', json.error);
  } catch (err) {
    console.error('Network error saving influencers:', err);
  }
}

function fmt(n: number) {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}

const DEFAULTS: Ambassador[] = [
  {
    id: 'amb-1', name: 'Kayla Thompson', email: 'kayla@nhlifestyle.com', phone: '(603) 555-0201',
    platform: 'Instagram', handle: '@nhlifestyle_kayla', followers: 18400, niche: 'Home & Lifestyle',
    status: 'active', promoCode: 'KAYLA10', commissionPct: 10, referrals: 0, revenue: 0,
    notes: 'Great content creator. Posts before/after remodels. Very engaged audience in NH.',
    joinedAt: '2026-04-01', lastPost: '2026-07-05', tags: ['instagram', 'home', 'nh'],
  },
  {
    id: 'amb-2', name: 'Mike Labonte', email: 'mike@nhcontractors.net', phone: '(603) 555-0302',
    platform: 'Facebook', handle: 'Mike Labonte Home Talk', followers: 5200, niche: 'Contractor / Trade',
    status: 'active', promoCode: 'MIKE15', commissionPct: 15, referrals: 0, revenue: 0,
    notes: 'Local contractor who refers overflow to us. High conversion.',
    joinedAt: '2026-03-15', lastPost: '2026-07-01', tags: ['facebook', 'referral', 'trade'],
  },
  {
    id: 'amb-3', name: 'Sarah V.', email: 'sarahv@gmail.com', phone: '(603) 555-0403',
    platform: 'Nextdoor', handle: 'Sarah V. - Nashua Area', followers: 0, niche: 'Neighborhood',
    status: 'active', promoCode: 'SARAH10', commissionPct: 10, referrals: 0, revenue: 0,
    notes: 'Very active on Nextdoor. Recommends us in home improvement threads.',
    joinedAt: '2026-05-20', lastPost: '2026-06-28', tags: ['nextdoor', 'local'],
  },
  {
    id: 'amb-4', name: 'NHHomeImprovement', email: 'contact@nhhome.tv', phone: '',
    platform: 'YouTube', handle: '@nhhomeimprovement', followers: 42000, niche: 'Home Improvement',
    status: 'prospect', promoCode: '', commissionPct: 12, referrals: 0, revenue: 0,
    notes: 'Large NH-based channel. Would love to sponsor an episode. Reached out 7/10.',
    joinedAt: '', lastPost: '', tags: ['youtube', 'prospect'],
  },
];

const BLANK = (): Ambassador => ({
  id: `amb-${Date.now()}`, name: '', email: '', phone: '', platform: 'Instagram', handle: '',
  followers: 0, niche: '', status: 'prospect', promoCode: '', commissionPct: 10, referrals: 0, revenue: 0,
  notes: '', joinedAt: new Date().toISOString().split('T')[0], lastPost: '', tags: [],
});

// ─── Modal ────────────────────────────────────────────────────────────────────

function AmbassadorModal({ amb, onSave, onClose }: { amb: Ambassador; onSave: (a: Ambassador) => void; onClose: () => void }) {
  const [a, setA] = useState<Ambassador>({ ...amb });
  function f(k: keyof Ambassador, v: any) { setA(x => ({ ...x, [k]: v })); }

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-start justify-center p-4 overflow-auto">
      <div className="w-full max-w-xl bg-[#0e0e0e] border border-[#222] rounded-2xl shadow-2xl my-4">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#1a1a1a]">
          <h2 className="font-bold text-white text-sm">{amb.id === a.id && !amb.name ? 'Add Ambassador' : `Edit — ${amb.name}`}</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-500 hover:text-white transition" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Name', key: 'name', type: 'text' },
              { label: 'Email', key: 'email', type: 'email' },
              { label: 'Phone', key: 'phone', type: 'text' },
              { label: 'Handle / Profile', key: 'handle', type: 'text' },
              { label: 'Followers', key: 'followers', type: 'number' },
              { label: 'Niche / Focus', key: 'niche', type: 'text' },
              { label: 'Promo Code', key: 'promoCode', type: 'text' },
              { label: 'Commission %', key: 'commissionPct', type: 'number' },
              { label: 'Referrals', key: 'referrals', type: 'number' },
              { label: 'Revenue Generated ($)', key: 'revenue', type: 'number' },
              { label: 'Joined Date', key: 'joinedAt', type: 'date' },
              { label: 'Last Post Date', key: 'lastPost', type: 'date' },
            ].map(fi => (
              <div key={fi.key}>
                <label className="text-xs text-gray-400 block mb-1">{fi.label}</label>
                <input type={fi.type} value={(a as any)[fi.key]} onChange={e => f(fi.key as keyof Ambassador, fi.type === 'number' ? Number(e.target.value) : e.target.value)}
                  className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-orange-500 transition" />
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-400 block mb-1">Platform</label>
              <select value={a.platform} onChange={e => f('platform', e.target.value as Platform)}
                className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500 transition">
                {(['Instagram', 'Facebook', 'TikTok', 'YouTube', 'Nextdoor', 'Other'] as Platform[]).map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Status</label>
              <select value={a.status} onChange={e => f('status', e.target.value as AmbassadorStatus)}
                className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500 transition">
                <option value="active">Active</option>
                <option value="prospect">Prospect</option>
                <option value="paused">Paused</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-400 block mb-1">Notes</label>
            <textarea rows={3} value={a.notes} onChange={e => f('notes', e.target.value)}
              className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-orange-500 transition resize-none" />
          </div>
        </div>
        <div className="flex justify-end gap-3 px-5 pb-5">
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm text-gray-400 hover:text-white transition">Cancel</button>
          <button onClick={() => { onSave(a); toast.success('Ambassador saved.'); }}
            className="flex items-center gap-2 px-5 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-sm font-semibold transition">
            <Save className="w-4 h-4" /> Save
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<AmbassadorStatus, string> = {
  active: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  inactive: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
  prospect: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  paused: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
};

export default function InfluencerTracker() {
  const [ambassadors, setAmbassadors] = useState<Ambassador[]>([]);
  const [editing, setEditing] = useState<Ambassador | null>(null);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | AmbassadorStatus>('all');
  const [filterPlatform, setFilterPlatform] = useState<'all' | Platform>('all');

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${SERVER}/influencers`, { headers: authHeaders });
        const json = await res.json();
        if (json.success && Array.isArray(json.influencers) && json.influencers.length) {
          setAmbassadors(json.influencers);
        } else {
          setAmbassadors(DEFAULTS);
          persist(DEFAULTS);
        }
      } catch (err) {
        console.error('Network error loading influencers:', err);
        setAmbassadors(DEFAULTS);
      }
    })();
  }, []);

  function save(list: Ambassador[]) { setAmbassadors(list); persist(list); }

  function handleSave(a: Ambassador) {
    save(ambassadors.find(x => x.id === a.id) ? ambassadors.map(x => x.id === a.id ? a : x) : [...ambassadors, a]);
    setEditing(null);
  }

  function del(id: string) { save(ambassadors.filter(a => a.id !== id)); toast.success('Removed.'); }

  function exportCSV() {
    const rows = [['Name', 'Email', 'Platform', 'Handle', 'Followers', 'Status', 'Promo Code', 'Commission %', 'Referrals', 'Revenue', 'Joined']];
    ambassadors.forEach(a => rows.push([a.name, a.email, a.platform, a.handle, String(a.followers), a.status, a.promoCode, String(a.commissionPct), String(a.referrals), String(a.revenue), a.joinedAt]));
    const csv = rows.map(r => r.map(c => `"${c.replace(/"/g, '""')}"`).join(',')).join('\n');
    const el = document.createElement('a');
    el.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    el.download = 'ambassadors.csv';
    el.click();
    toast.success('Exported!');
  }

  const filtered = useMemo(() => ambassadors.filter(a => {
    if (filterStatus !== 'all' && a.status !== filterStatus) return false;
    if (filterPlatform !== 'all' && a.platform !== filterPlatform) return false;
    if (search && !a.name.toLowerCase().includes(search.toLowerCase()) && !a.handle.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }), [ambassadors, search, filterStatus, filterPlatform]);

  const active = ambassadors.filter(a => a.status === 'active');
  const totalRevenue = ambassadors.reduce((s, a) => s + a.revenue, 0);
  const totalReferrals = ambassadors.reduce((s, a) => s + a.referrals, 0);
  const totalReach = active.reduce((s, a) => s + a.followers, 0);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {editing && <AmbassadorModal amb={editing} onSave={handleSave} onClose={() => setEditing(null)} />}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-pink-500/10 flex items-center justify-center">
            <Users className="w-5 h-5 text-pink-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Influencer & Ambassadors</h1>
            <p className="text-sm text-gray-400">Track brand partners, referrers, and promo codes</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={exportCSV} className="flex items-center gap-2 px-3 py-2 rounded-xl border border-[#222] text-gray-400 hover:text-white text-sm transition">
            <Download className="w-4 h-4" /> Export
          </button>
          <button onClick={() => setEditing(BLANK())}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-sm font-semibold transition">
            <Plus className="w-4 h-4" /> Add Ambassador
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Total Partners', value: ambassadors.length },
          { label: 'Active', value: active.length, color: 'text-emerald-400' },
          { label: 'Total Referrals', value: totalReferrals, color: 'text-blue-400' },
          { label: 'Revenue Generated', value: `$${totalRevenue.toLocaleString()}`, color: 'text-yellow-400' },
        ].map(s => (
          <div key={s.label} className="bg-[#111] border border-[#222] rounded-xl p-4 text-center">
            <p className={`text-2xl font-bold ${s.color || 'text-white'}`}>{s.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Reach summary */}
      <div className="bg-[#111] border border-[#222] rounded-xl px-5 py-3 mb-5 flex items-center gap-3">
        <TrendingUp className="w-4 h-4 text-pink-400" />
        <p className="text-sm text-gray-300">Active ambassador total reach: <span className="font-bold text-white">{fmt(totalReach)} followers</span></p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name or handle..."
            className="w-full bg-[#111] border border-[#222] rounded-xl pl-9 pr-4 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-orange-500 transition" />
        </div>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value as any)}
          className="bg-[#111] border border-[#222] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500 transition">
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="prospect">Prospect</option>
          <option value="paused">Paused</option>
          <option value="inactive">Inactive</option>
        </select>
        <select value={filterPlatform} onChange={e => setFilterPlatform(e.target.value as any)}
          className="bg-[#111] border border-[#222] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500 transition">
          <option value="all">All Platforms</option>
          {(['Instagram', 'Facebook', 'TikTok', 'YouTube', 'Nextdoor', 'Other'] as Platform[]).map(p => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>

      {/* List */}
      <div className="space-y-3">
        {filtered.length === 0 && (
          <div className="text-center py-16 text-gray-600 text-sm">
            <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
            No ambassadors found. Add one to get started.
          </div>
        )}
        {filtered.map(a => (
          <div key={a.id} className="bg-[#111] border border-[#222] rounded-xl p-4 hover:border-pink-500/20 transition">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-500 to-orange-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                {a.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-white text-sm">{a.name}</p>
                  <span className={`text-[10px] font-semibold border px-2 py-0.5 rounded-full capitalize ${STATUS_COLORS[a.status]}`}>{a.status}</span>
                  <span className="text-[10px] text-gray-600 bg-[#1a1a1a] border border-[#2a2a2a] px-2 py-0.5 rounded-full">{a.platform}</span>
                  {a.followers > 0 && <span className="text-[10px] text-gray-500">{fmt(a.followers)} followers</span>}
                </div>
                {a.handle && <p className="text-xs text-gray-500 mt-0.5">{a.handle}</p>}
                <div className="flex items-center gap-4 mt-2 text-xs text-gray-600">
                  {a.promoCode && <span className="text-yellow-500 font-mono font-semibold">{a.promoCode}</span>}
                  {a.commissionPct > 0 && <span>{a.commissionPct}% commission</span>}
                  {a.referrals > 0 && <span className="text-blue-400">{a.referrals} referrals</span>}
                  {a.revenue > 0 && <span className="text-emerald-400">${a.revenue.toLocaleString()}</span>}
                </div>
                {a.notes && <p className="text-xs text-gray-600 mt-1.5 line-clamp-1">{a.notes}</p>}
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button onClick={() => setEditing(a)} className="p-2 hover:bg-[#1a1a1a] rounded-lg text-gray-500 hover:text-white transition">
                  <Edit3 className="w-4 h-4" />
                </button>
                <button onClick={() => del(a.id)} className="p-2 hover:bg-[#1a1a1a] rounded-lg text-gray-500 hover:text-red-400 transition">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
