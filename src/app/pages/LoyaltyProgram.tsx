/**
 * LoyaltyProgram — Black Phoenix Rewards
 * Points system: 1 point per $1 spent. Tiers: Bronze / Silver / Gold / Phoenix.
 * Persisted in localStorage per email. Viewable from store + owner dashboard.
 */
import { useState, useEffect } from 'react';
import { Star, Gift, Zap, Crown, TrendingUp, Copy, CheckCircle, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';
import companyLogo from '../../imports/BPB_phoenix_full_color_logo.png';
import { projectId } from '../utils/supabase/info';
import { supabase } from '../lib/supabase';

const STORAGE_KEY = 'bp_loyalty';
const SERVER = `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6`;


// Server is the source of truth; localStorage is a synchronous mirror for callers
// like the store checkout that award points without awaiting a network round-trip.
async function loyaltyRequest(path: string, init: RequestInit = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('Please sign in to access Phoenix Rewards.');
  const res = await fetch(`${SERVER}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}`, ...(init.headers || {}) },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.success === false) throw new Error(json.error || 'Loyalty request failed.');
  return json;
}

export async function loadLoyaltyFromServer(email: string): Promise<LoyaltyAccount | null> {
  try {
    const json = await loyaltyRequest(`/loyalty/${encodeURIComponent(email)}`);
    if (json.account) {
      localStorage.setItem(`${STORAGE_KEY}_${email}`, JSON.stringify(json.account));
      return json.account;
    }
    return null;
  } catch (err) {
    console.error('Network error loading loyalty account:', err);
    return null;
  }
}

export interface LoyaltyAccount {
  email: string;
  name: string;
  points: number;
  lifetimePoints: number;
  lifetimeSpend: number;
  tier: 'bronze' | 'silver' | 'gold' | 'phoenix';
  joinedAt: string;
  history: LoyaltyEvent[];
  referralCode: string;
  redeemedCodes: string[];
}

export interface LoyaltyEvent {
  id: string;
  type: 'earn' | 'redeem' | 'bonus' | 'referral';
  points: number;
  description: string;
  date: string;
}

const TIERS = [
  { id: 'bronze',  label: 'Bronze',  minSpend: 0,    color: '#cd7f32', icon: '🥉', perks: ['1 pt per $1 spent', 'Birthday bonus points', 'Member-only deals'] },
  { id: 'silver',  label: 'Silver',  minSpend: 250,  color: '#C0C0C0', icon: '🥈', perks: ['1.25 pts per $1 spent', 'Free shipping over $50', 'Early sale access'] },
  { id: 'gold',    label: 'Gold',    minSpend: 500,  color: '#FFD700', icon: '🥇', perks: ['1.5 pts per $1 spent', 'Free shipping always', 'Priority support', 'Quarterly bonus'] },
  { id: 'phoenix', label: 'Phoenix', minSpend: 1000, color: '#ea580c', icon: '🔥', perks: ['2 pts per $1 spent', 'Free expedited shipping', 'VIP-only products', 'Monthly $10 bonus', 'Personal shopper'] },
] as const;

const REWARDS = [
  { id: 'r5',  points: 100,  label: '$5 Off',         code: 'BPREWARD5'   },
  { id: 'r10', points: 175,  label: '$10 Off',        code: 'BPREWARD10'  },
  { id: 'r25', points: 400,  label: '$25 Off',        code: 'BPREWARD25'  },
  { id: 'r50', points: 700,  label: '$50 Off',        code: 'BPREWARD50'  },
  { id: 'fs',  points: 150,  label: 'Free Shipping',  code: 'BPFREESHIP'  },
  { id: 'vip', points: 500,  label: 'VIP Month Free', code: 'BPVIP1MONTH' },
];

export function getLoyaltyAccount(email: string): LoyaltyAccount | null {
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY}_${email}`);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function saveLoyaltyAccount(acct: LoyaltyAccount) {
  localStorage.setItem(`${STORAGE_KEY}_${acct.email}`, JSON.stringify(acct));
  // Legacy synchronous callers retain a local mirror; live actions below use the authenticated API.

}

export function createLoyaltyAccount(email: string, name: string): LoyaltyAccount {
  const code = 'BP' + Math.random().toString(36).substring(2, 7).toUpperCase();
  const acct: LoyaltyAccount = {
    email, name, points: 50, lifetimePoints: 50, lifetimeSpend: 0,
    tier: 'bronze', joinedAt: new Date().toISOString(),
    referralCode: code, redeemedCodes: [],
    history: [{ id: 'welcome', type: 'bonus', points: 50, description: 'Welcome bonus — thanks for joining!', date: new Date().toISOString() }],
  };
  saveLoyaltyAccount(acct);
  return acct;
}

export function awardPoints(email: string, spend: number, description = 'Purchase'): LoyaltyAccount | null {
  const acct = getLoyaltyAccount(email);
  if (!acct) return null;
  const multiplier = acct.tier === 'phoenix' ? 2 : acct.tier === 'gold' ? 1.5 : acct.tier === 'silver' ? 1.25 : 1;
  const earned = Math.floor(spend * multiplier);
  acct.points += earned;
  acct.lifetimePoints += earned;
  acct.lifetimeSpend += spend;
  // Upgrade tier
  const newTier = [...TIERS].reverse().find(t => acct.lifetimeSpend >= t.minSpend);
  if (newTier) acct.tier = newTier.id;
  acct.history.unshift({ id: `earn_${Date.now()}`, type: 'earn', points: earned, description, date: new Date().toISOString() });
  saveLoyaltyAccount(acct);
  return acct;
}

function getTier(acct: LoyaltyAccount) {
  return TIERS.find(t => t.id === acct.tier) || TIERS[0];
}

function getNextTier(acct: LoyaltyAccount) {
  const idx = TIERS.findIndex(t => t.id === acct.tier);
  return idx < TIERS.length - 1 ? TIERS[idx + 1] : null;
}

export default function LoyaltyProgram() {
  const { user } = useAuth();
  const [account, setAccount] = useState<LoyaltyAccount | null>(null);
  const [joinName, setJoinName] = useState('');
  const [joining, setJoining] = useState(false);
  const [copiedCode, setCopiedCode] = useState('');

  useEffect(() => {
    if (user?.email) {
      // Show any cached account instantly, then reconcile with the server.
      const cached = getLoyaltyAccount(user.email);
      if (cached) setAccount(cached);
      loadLoyaltyFromServer(user.email).then(serverAcct => {
        if (serverAcct) setAccount(serverAcct);
      });
    }
  }, [user]);

  async function handleJoin() {
    if (!user?.email || !joinName.trim()) return;
    setJoining(true);
    try {
      const data = await loyaltyRequest(`/loyalty/${encodeURIComponent(user.email)}/join`, {
        method: 'POST', body: JSON.stringify({ name: joinName.trim() }),
      });
      setAccount(data.account);
      localStorage.setItem(`${STORAGE_KEY}_${user.email}`, JSON.stringify(data.account));
      toast.success(data.existing ? 'Your Phoenix Rewards account is ready.' : 'Welcome to Black Phoenix Rewards! You earned 50 welcome points 🎉');
    } catch (error: any) {
      toast.error(error.message || 'Unable to join Phoenix Rewards.');
    } finally { setJoining(false); }
  }

  async function handleRedeem(reward: typeof REWARDS[0]) {
    if (!account || !user?.email) return;
    if (account.points < reward.points) { toast.error(`Need ${reward.points - account.points} more points`); return; }
    if (account.redeemedCodes.includes(reward.code)) { toast.info('Already redeemed — check your rewards history.'); return; }
    try {
      const data = await loyaltyRequest(`/loyalty/${encodeURIComponent(user.email)}/redeem`, {
        method: 'POST', body: JSON.stringify({ reward, idempotencyKey: crypto.randomUUID() }),
      });
      setAccount(data.account);
      localStorage.setItem(`${STORAGE_KEY}_${user.email}`, JSON.stringify(data.account));
      navigator.clipboard.writeText(reward.code);
      setCopiedCode(reward.id);
      setTimeout(() => setCopiedCode(''), 3000);
      toast.success(`${reward.label} redeemed! Code ${reward.code} copied to clipboard 🎉`);
    } catch (error: any) { toast.error(error.message || 'Unable to redeem this reward.'); }
  }

  function copyReferral() {
    if (!account) return;
    navigator.clipboard.writeText(`https://theblackphoenixcompany.com/local?ref=${account.referralCode}`);
    toast.success('Referral link copied! Share it to earn 100 bonus points per sign-up');
  }

  const tier = account ? getTier(account) : null;
  const nextTier = account ? getNextTier(account) : null;
  const progressPct = account && nextTier
    ? Math.min(100, Math.round(((account.lifetimeSpend - (TIERS.find(t => t.id === account.tier)?.minSpend || 0)) / (nextTier.minSpend - (TIERS.find(t => t.id === account.tier)?.minSpend || 0))) * 100))
    : 100;

  return (
    <div className="min-h-screen bg-[#080808] text-white p-4 sm:p-6">
      {/* Header */}
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <img src={companyLogo} alt="Black Phoenix" style={{ height: 44, width: 'auto', objectFit: 'contain', filter: 'drop-shadow(0 0 12px rgba(234,88,12,0.5))' }} />
          <div>
            <h1 className="text-2xl font-black text-white">Phoenix Rewards</h1>
            <p className="text-sm text-gray-400">Earn points. Unlock perks. Rise up.</p>
          </div>
        </div>

        {/* Not logged in */}
        {!user && (
          <div className="rounded-3xl p-8 text-center max-w-xl mx-auto" style={{ background: '#111', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div className="text-5xl mb-4">🔥</div>
            <h2 className="text-2xl font-black text-white mb-2">Join Phoenix Rewards</h2>
            <p className="text-gray-400 text-sm mb-6">Sign in to start earning points on every purchase.</p>
            <a href="/login" className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl font-black text-white"
              style={{ background: '#ea580c' }}>Sign In to Join</a>
          </div>
        )}

        {/* Not enrolled */}
        {user && !account && (
          <div className="rounded-3xl overflow-hidden max-w-xl mx-auto" style={{ border: '1px solid rgba(234,88,12,0.25)' }}>
            <div className="p-8 text-center" style={{ background: 'linear-gradient(135deg, #111, #1a0800)' }}>
              <div className="text-5xl mb-4">🎁</div>
              <h2 className="text-2xl font-black text-white mb-2">Join & Get 50 Free Points</h2>
              <p className="text-gray-400 text-sm mb-6 max-w-xs mx-auto">Earn 1 point per $1 spent. Redeem for discounts, free shipping, and VIP perks.</p>
              <div className="max-w-xs mx-auto space-y-3">
                <input value={joinName} onChange={e => setJoinName(e.target.value)}
                  placeholder="Your first name"
                  className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-gray-600 focus:outline-none"
                  style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }} />
                <button onClick={handleJoin} disabled={joining || !joinName.trim()}
                  className="w-full py-4 rounded-2xl font-black text-white transition hover:brightness-110 disabled:opacity-40 flex items-center justify-center gap-2"
                  style={{ background: 'linear-gradient(135deg, #ea580c, #f97316)' }}>
                  {joining ? '⏳ Joining…' : <><Star className="w-4 h-4" /> Join Free — Get 50 Points</>}
                </button>
              </div>
              {/* Tier preview */}
              <div className="grid grid-cols-4 gap-2 mt-8">
                {TIERS.map(t => (
                  <div key={t.id} className="flex flex-col items-center gap-1 p-2 rounded-xl"
                    style={{ background: 'rgba(255,255,255,0.04)' }}>
                    <span className="text-xl">{t.icon}</span>
                    <p className="text-[10px] font-bold" style={{ color: t.color }}>{t.label}</p>
                    <p className="text-[9px] text-gray-600">${t.minSpend}+</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Enrolled */}
        {account && tier && (
          <div className="space-y-4">
            {/* Points card */}
            <div className="rounded-3xl p-6 relative overflow-hidden"
              style={{ background: `linear-gradient(135deg, ${tier.color}22, #111)`, border: `1px solid ${tier.color}40` }}>
              <div className="absolute top-0 right-0 w-48 h-48 pointer-events-none" style={{
                background: `radial-gradient(ellipse at top right, ${tier.color}25 0%, transparent 70%)`
              }} />
              <div className="relative">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-xs font-black tracking-widest uppercase" style={{ color: tier.color }}>{tier.icon} {tier.label} Member</p>
                    <p className="text-xs text-gray-500 mt-0.5">{account.name} · {account.email}</p>
                  </div>
                  <img src={companyLogo} style={{ height: 36, opacity: 0.7 }} />
                </div>
                <div className="mb-4">
                  <p className="text-5xl font-black text-white">{account.points.toLocaleString()}</p>
                  <p className="text-sm text-gray-400">points available</p>
                </div>
                {nextTier ? (
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-gray-500">{tier.label}</span>
                      <span style={{ color: nextTier.color }}>{nextTier.icon} {nextTier.label} at ${nextTier.minSpend}</span>
                    </div>
                    <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
                      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${progressPct}%`, background: `linear-gradient(90deg, ${tier.color}, ${nextTier.color})` }} />
                    </div>
                    <p className="text-[10px] text-gray-600 mt-1">${(nextTier.minSpend - account.lifetimeSpend).toFixed(0)} more to {nextTier.label}</p>
                  </div>
                ) : (
                  <p className="text-sm font-bold" style={{ color: tier.color }}>🔥 Maximum Tier Achieved!</p>
                )}
              </div>
            </div>

            {/* Two-column detail grid on desktop */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
            {/* Tier perks */}
            <div className="rounded-2xl p-4" style={{ background: '#111', border: '1px solid rgba(255,255,255,0.07)' }}>
              <p className="text-xs font-black uppercase tracking-widest text-gray-500 mb-3">Your {tier.label} Perks</p>
              <div className="space-y-2">
                {tier.perks.map((perk, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <CheckCircle className="w-3.5 h-3.5 flex-shrink-0" style={{ color: tier.color }} />
                    <span className="text-sm text-gray-300">{perk}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Redeem rewards */}
            <div className="rounded-2xl p-4" style={{ background: '#111', border: '1px solid rgba(255,255,255,0.07)' }}>
              <p className="text-xs font-black uppercase tracking-widest text-gray-500 mb-3">Redeem Points</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {REWARDS.map(reward => {
                  const canRedeem = account.points >= reward.points;
                  const redeemed = account.redeemedCodes.includes(reward.code);
                  return (
                    <button key={reward.id} onClick={() => handleRedeem(reward)}
                      disabled={!canRedeem}
                      className="flex flex-col items-center gap-1.5 p-3 rounded-xl border text-center transition-all"
                      style={{
                        background: redeemed ? 'rgba(16,185,129,0.08)' : canRedeem ? 'rgba(234,88,12,0.08)' : 'rgba(255,255,255,0.02)',
                        borderColor: redeemed ? 'rgba(16,185,129,0.3)' : canRedeem ? 'rgba(234,88,12,0.3)' : 'rgba(255,255,255,0.06)',
                      }}>
                      <span className="text-xl">{redeemed ? '✅' : <Gift className="w-5 h-5 mx-auto" style={{ color: canRedeem ? '#ea580c' : '#6b7280' }} />}</span>
                      <p className="text-xs font-black text-white">{reward.label}</p>
                      <p className="text-[10px] font-bold" style={{ color: canRedeem ? '#fb923c' : '#6b7280' }}>{reward.points} pts</p>
                      {copiedCode === reward.id && <p className="text-[10px] text-green-400 font-bold">Copied!</p>}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Referral */}
            <div className="rounded-2xl p-4 relative overflow-hidden"
              style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)' }}>
              <p className="text-xs font-black uppercase tracking-widest text-indigo-400 mb-2">Refer Friends — Earn 100 Points Each</p>
              <p className="text-xs text-gray-400 mb-3">Share your link. When a friend signs up and places their first order, you both get rewarded.</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-xs text-indigo-300 bg-black/30 px-3 py-2 rounded-xl truncate">
                  theblackphoenixcompany.com/local?ref={account.referralCode}
                </code>
                <button onClick={copyReferral} className="p-2 rounded-xl transition hover:bg-white/10"
                  style={{ border: '1px solid rgba(99,102,241,0.3)' }}>
                  <Copy className="w-4 h-4 text-indigo-400" />
                </button>
              </div>
            </div>

            {/* History */}
            {account.history.length > 0 && (
              <div className="rounded-2xl p-4" style={{ background: '#111', border: '1px solid rgba(255,255,255,0.07)' }}>
                <p className="text-xs font-black uppercase tracking-widest text-gray-500 mb-3">Points History</p>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {account.history.map(ev => (
                    <div key={ev.id} className="flex items-center justify-between py-2 border-b border-[#1a1a1a] last:border-0">
                      <div>
                        <p className="text-xs font-semibold text-white">{ev.description}</p>
                        <p className="text-[10px] text-gray-600">{new Date(ev.date).toLocaleDateString()}</p>
                      </div>
                      <span className={`text-sm font-black ${ev.points > 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {ev.points > 0 ? '+' : ''}{ev.points}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            </div>{/* end two-column detail grid */}

            {/* Stats */}
            <div className="grid grid-cols-3 sm:grid-cols-3 gap-3">
              {[
                { label: 'Lifetime Points', value: account.lifetimePoints.toLocaleString() },
                { label: 'Total Spent', value: `$${account.lifetimeSpend.toFixed(0)}` },
                { label: 'Rewards Redeemed', value: account.redeemedCodes.length },
              ].map((s, i) => (
                <div key={i} className="rounded-xl p-3 text-center" style={{ background: '#111', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <p className="text-lg font-black text-white">{s.value}</p>
                  <p className="text-[10px] text-gray-600 mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
