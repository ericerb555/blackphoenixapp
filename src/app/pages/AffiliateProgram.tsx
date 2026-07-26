import { useState, useEffect } from 'react';
import { Copy, Check, Users, DollarSign, TrendingUp, Link, Gift, Share2, ChevronRight, Star, Zap } from 'lucide-react';
import { motion } from 'motion/react';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';
import companyLogo from '../../imports/BPB_phoenix_full_color_logo.png';
import { projectId } from '../utils/supabase/info';
import { supabase } from '../lib/supabase';

const SERVER = `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6`;

interface AffiliateStats {
  email: string;
  code: string;
  clicks: number;
  signups: number;
  conversions: number;
  pendingCredit: number;
  paidCredit: number;
  history: AffiliateEvent[];
  joinedAt: string;
}

interface AffiliateEvent {
  id: string;
  type: 'click' | 'signup' | 'sale' | 'payout';
  description: string;
  credit: number;
  date: string;
}

async function affiliateRequest(path: string, init: RequestInit = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('Please sign in to join or view the affiliate program.');
  const res = await fetch(`${SERVER}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}`, ...(init.headers || {}) },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.success === false) throw new Error(json.error || 'Affiliate request failed.');
  return json;
}

async function loadAffiliate(email: string): Promise<AffiliateStats | null> {
  try {
    const json = await affiliateRequest(`/affiliates/${encodeURIComponent(email)}`);
    return json.stats || null;
  } catch (err) {
    console.error('Network error loading affiliate stats:', err);
    return null;
  }
}

const HOW_IT_WORKS = [
  { step: '01', icon: Link, color: '#ea580c', title: 'Share Your Link', desc: 'Post your unique referral link on social, texts, or email. Anyone who clicks gets tagged to you.' },
  { step: '02', icon: Users, color: '#a855f7', title: 'Friends Shop', desc: 'When someone uses your link and makes a purchase, you both win — they get a welcome discount, you earn credit.' },
  { step: '03', icon: DollarSign, color: '#22c55e', title: 'Earn 10% Credit', desc: 'You earn 10% store credit on every referred sale. No cap. Cash out any time on your next order.' },
];

const TIERS = [
  { label: 'Starter', refs: 0, bonus: '10% commission', icon: '🔗', color: '#6b7280' },
  { label: 'Advocate', refs: 5, bonus: '12% commission + $5 bonus', icon: '⚡', color: '#3b82f6' },
  { label: 'Champion', refs: 15, bonus: '15% commission + priority payout', icon: '🔥', color: '#ea580c' },
  { label: 'Legend', refs: 30, bonus: '20% commission + featured spotlight', icon: '👑', color: '#f59e0b' },
];

export default function AffiliateProgram() {
  const { user } = useAuth();
  const [stats, setStats] = useState<AffiliateStats | null>(null);
  const [copied, setCopied] = useState(false);
  const [tab, setTab] = useState<'overview' | 'how' | 'history'>('overview');
  const [guestEmail, setGuestEmail] = useState('');
  const [guestName, setGuestName] = useState('');
  const [joining, setJoining] = useState(false);
  const [requestingPayout, setRequestingPayout] = useState(false);

  const email = user?.email || '';
  const name = user?.user_metadata?.full_name || user?.email?.split('@')[0] || '';

  useEffect(() => {
    if (email) loadAffiliate(email).then(setStats);
  }, [email]);

  async function joinAsGuest() {
    if (!user?.email) { toast.error('Create or sign in to an account before joining the affiliate program.'); return; }
    setJoining(true);
    try {
      const data = await affiliateRequest('/affiliates/join', { method: 'POST', body: JSON.stringify({ name: guestName || name }) });
      setStats(data.stats);
      toast.success(data.existing ? 'Your affiliate account is ready.' : 'Welcome to the affiliate program!');
    } catch (error: any) {
      toast.error(error.message || 'Unable to join the affiliate program.');
    } finally { setJoining(false); }
  }

  async function requestPayout() {
    if (!stats || !email) return;
    const available = Math.max(0, Number(stats.pendingCredit || 0) - Number((stats as any).payoutHold || 0));
    if (available < 25) { toast.error('A minimum $25.00 available credit is required to request a payout.'); return; }
    setRequestingPayout(true);
    try {
      const data = await affiliateRequest(`/affiliates/${encodeURIComponent(email)}/payout-requests`, { method: 'POST', body: JSON.stringify({ amount: available, payoutMethod: 'manual_review' }) });
      setStats(data.stats); toast.success(`Payout request for $${available.toFixed(2)} submitted for review.`);
    } catch (error: any) { toast.error(error.message || 'Unable to submit payout request.'); }
    finally { setRequestingPayout(false); }
  }

  function copyLink() {
    if (!stats) return;
    const url = `https://theblackphoenixcompany.com/local?ref=${stats.code}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      toast.success('Link copied!');
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function shareLink() {
    if (!stats) return;
    const url = `https://theblackphoenixcompany.com/local?ref=${stats.code}`;
    const text = "I shop at Black Phoenix Company — family-owned, great products, and fast shipping! Use my link for an exclusive welcome deal:";
    if (navigator.share) {
      navigator.share({ title: 'Black Phoenix Company', text, url });
    } else {
      navigator.clipboard.writeText(`${text} ${url}`);
      toast.success('Share text copied!');
    }
  }

  const currentTier = TIERS.reduce((best, t) => (stats && stats.conversions >= t.refs) ? t : best, TIERS[0]);
  const nextTier = TIERS[TIERS.indexOf(currentTier) + 1];
  const referralUrl = stats ? `theblackphoenixcompany.com/local?ref=${stats.code}` : '';

  if (!stats) {
    return (
      <div className="min-h-screen bg-[#050505] text-white flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-6">
          {/* Hero */}
          <div className="text-center space-y-3">
            <img src={companyLogo} alt="Black Phoenix" className="h-14 w-auto mx-auto object-contain"
              style={{ filter: 'drop-shadow(0 0 20px rgba(234,88,12,0.4))' }} />
            <h1 className="text-3xl font-black text-white">Earn With Us</h1>
            <p className="text-gray-400 text-sm">Share Black Phoenix with friends. Earn 10% store credit on every sale. No limits.</p>
          </div>

          <div className="rounded-2xl border border-[#2a2a2a] bg-[#111] p-6 space-y-4">
            <h3 className="font-black text-white">Join the Affiliate Program</h3>
            <div>
              <label className="text-xs font-bold text-gray-500 mb-1.5 block">Your Name</label>
              <input value={guestName} onChange={e => setGuestName(e.target.value)}
                placeholder="John Smith"
                className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-orange-500/50" />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 mb-1.5 block">Email Address</label>
              <input value={guestEmail} onChange={e => setGuestEmail(e.target.value)}
                placeholder="you@email.com" type="email"
                className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-orange-500/50" />
            </div>
            <button onClick={joinAsGuest} disabled={joining}
              className="w-full py-4 rounded-2xl font-black text-white transition hover:brightness-110 disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #ea580c, #c2410c)' }}>
              {joining ? 'Setting up your account…' : 'Get My Referral Link →'}
            </button>
            <p className="text-[11px] text-gray-600 text-center">Free to join. No commitment. Earn immediately.</p>
          </div>

          {/* Mini how-it-works */}
          <div className="grid grid-cols-3 gap-3">
            {HOW_IT_WORKS.map(h => (
              <div key={h.step} className="rounded-xl p-3 text-center" style={{ background: '#111', border: '1px solid #1e1e1e' }}>
                <h.icon className="w-5 h-5 mx-auto mb-2" style={{ color: h.color }} />
                <p className="text-[11px] font-bold text-white">{h.title}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white p-4 sm:p-6">
      <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2">
            <Share2 className="w-6 h-6 text-orange-400" /> Affiliate Program
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Earn 10% store credit on every referred sale</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-600">Your tier</p>
          <p className="text-sm font-black" style={{ color: currentTier.color }}>{currentTier.icon} {currentTier.label}</p>
        </div>
      </div>

      {/* Referral link card */}
      <div className="rounded-2xl p-5 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #1a0a00, #111)', border: '1px solid rgba(234,88,12,0.25)' }}>
        <div className="absolute top-0 right-0 w-48 h-48 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at top right, rgba(234,88,12,0.1) 0%, transparent 70%)' }} />
        <p className="text-xs font-black text-gray-500 uppercase tracking-widest mb-2">Your Referral Link</p>
        <div className="flex items-center gap-2 p-3 rounded-xl mb-4" style={{ background: '#0d0d0d', border: '1px solid #2a2a2a' }}>
          <Link className="w-4 h-4 text-orange-400 flex-shrink-0" />
          <p className="text-xs text-gray-400 flex-1 truncate font-mono">{referralUrl}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={copyLink}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-black text-sm text-white transition hover:brightness-110"
            style={{ background: copied ? '#16a34a' : '#ea580c' }}>
            {copied ? <><Check className="w-4 h-4" /> Copied!</> : <><Copy className="w-4 h-4" /> Copy Link</>}
          </button>
          <button onClick={shareLink}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-black text-sm transition hover:brightness-110"
            style={{ background: 'rgba(234,88,12,0.12)', color: '#fb923c', border: '1px solid rgba(234,88,12,0.25)' }}>
            <Share2 className="w-4 h-4" /> Share
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Link Clicks', value: stats.clicks, icon: TrendingUp, color: '#3b82f6' },
          { label: 'Sign-ups', value: stats.signups, icon: Users, color: '#a855f7' },
          { label: 'Sales', value: stats.conversions, icon: DollarSign, color: '#22c55e' },
          { label: 'Pending Credit', value: `$${stats.pendingCredit.toFixed(2)}`, icon: Gift, color: '#ea580c' },
        ].map(s => (
          <div key={s.label} className="rounded-2xl p-4" style={{ background: '#111', border: '1px solid #1e1e1e' }}>
            <div className="w-8 h-8 rounded-xl flex items-center justify-center mb-3" style={{ background: s.color + '18' }}>
              <s.icon className="w-4 h-4" style={{ color: s.color }} />
            </div>
            <p className="text-xl font-black text-white">{s.value}</p>
            <p className="text-xs text-gray-600 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3" style={{ background: '#111', border: '1px solid #1e1e1e' }}>
        <div><p className="text-xs font-black text-white">Affiliate payout</p><p className="text-xs text-gray-500 mt-1">Requests are reviewed and paid by Black Phoenix. Available: ${Math.max(0, Number(stats.pendingCredit || 0) - Number((stats as any).payoutHold || 0)).toFixed(2)}</p></div>
        <button onClick={() => void requestPayout()} disabled={requestingPayout || Math.max(0, Number(stats.pendingCredit || 0) - Number((stats as any).payoutHold || 0)) < 25} className="px-4 py-2.5 rounded-xl text-sm font-black text-white disabled:opacity-40" style={{ background: '#ea580c' }}>{requestingPayout ? 'Submitting…' : 'Request Payout'}</button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl" style={{ background: '#111', border: '1px solid #1e1e1e' }}>
        {([['overview', 'Overview'], ['how', 'How It Works'], ['history', 'Activity']] as const).map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)}
            className="flex-1 py-2 rounded-lg text-xs font-bold transition"
            style={tab === id
              ? { background: 'linear-gradient(135deg, #ea580c, #c2410c)', color: '#fff' }
              : { color: '#6b7280' }}>
            {label}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW ──────────────────────────────────────────────────────── */}
      {tab === 'overview' && (
        <div className="space-y-4">
          {/* Tier progress */}
          <div className="rounded-2xl border border-[#1e1e1e] bg-[#111] p-5">
            <h3 className="font-black text-white text-sm mb-4">Your Affiliate Tier</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {TIERS.map((t, i) => {
                const active = t.label === currentTier.label;
                const unlocked = stats.conversions >= t.refs;
                return (
                  <div key={t.label} className="rounded-xl p-3 text-center transition"
                    style={active
                      ? { background: t.color + '18', border: `1px solid ${t.color}40` }
                      : { background: '#0d0d0d', border: '1px solid #1e1e1e', opacity: unlocked ? 1 : 0.45 }}>
                    <p className="text-2xl mb-1">{t.icon}</p>
                    <p className="text-xs font-black text-white">{t.label}</p>
                    <p className="text-[10px] mt-0.5" style={{ color: t.color }}>{t.bonus}</p>
                    {t.refs > 0 && <p className="text-[9px] text-gray-600 mt-1">{t.refs}+ sales</p>}
                  </div>
                );
              })}
            </div>
            {nextTier && (
              <div className="mt-4 pt-4" style={{ borderTop: '1px solid #1e1e1e' }}>
                <div className="flex items-center justify-between text-xs mb-2">
                  <span className="text-gray-500">{stats.conversions} sales toward {nextTier.label}</span>
                  <span className="font-bold text-white">{nextTier.refs - stats.conversions} more to go</span>
                </div>
                <div className="h-2 rounded-full bg-[#1a1a1a] overflow-hidden">
                  <div className="h-full rounded-full transition-all"
                    style={{ width: `${Math.min(100, (stats.conversions / nextTier.refs) * 100)}%`, background: nextTier.color }} />
                </div>
              </div>
            )}
          </div>

          {/* Credit summary */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-[#1e1e1e] bg-[#111] p-5">
              <p className="text-xs font-bold text-gray-500 mb-1">Pending Credit</p>
              <p className="text-2xl font-black text-orange-400">${stats.pendingCredit.toFixed(2)}</p>
              <p className="text-[11px] text-gray-600 mt-1">Applied automatically at checkout</p>
            </div>
            <div className="rounded-2xl border border-[#1e1e1e] bg-[#111] p-5">
              <p className="text-xs font-bold text-gray-500 mb-1">Total Earned</p>
              <p className="text-2xl font-black text-green-400">${(stats.pendingCredit + stats.paidCredit).toFixed(2)}</p>
              <p className="text-[11px] text-gray-600 mt-1">${stats.paidCredit.toFixed(2)} already redeemed</p>
            </div>
          </div>

          {/* Share ideas */}
          <div className="rounded-2xl border border-[#1e1e1e] bg-[#111] p-5 space-y-3">
            <h3 className="font-black text-white text-sm">🚀 Share Ideas</h3>
            {[
              { platform: 'Facebook', idea: 'Post in local buy/sell groups with your link' },
              { platform: 'Instagram', idea: 'Story with your fave product + swipe-up link' },
              { platform: 'Text', idea: 'Text 3 friends who shop online regularly' },
              { platform: 'Nextdoor', idea: 'Post as a local business recommendation' },
            ].map(s => (
              <div key={s.platform} className="flex items-center justify-between p-3 rounded-xl" style={{ background: '#0d0d0d' }}>
                <div>
                  <p className="text-xs font-bold text-white">{s.platform}</p>
                  <p className="text-[11px] text-gray-500">{s.idea}</p>
                </div>
                <button onClick={shareLink}
                  className="text-[10px] font-black px-3 py-1.5 rounded-lg transition hover:brightness-110 flex-shrink-0"
                  style={{ background: '#ea580c' }}>
                  Share
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── HOW IT WORKS ──────────────────────────────────────────────────── */}
      {tab === 'how' && (
        <div className="space-y-4 max-w-lg mx-auto">
          {HOW_IT_WORKS.map(h => (
            <div key={h.step} className="flex gap-4 p-5 rounded-2xl" style={{ background: '#111', border: '1px solid #1e1e1e' }}>
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: h.color + '18' }}>
                <h.icon className="w-5 h-5" style={{ color: h.color }} />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-black text-gray-600">{h.step}</span>
                  <h3 className="text-sm font-black text-white">{h.title}</h3>
                </div>
                <p className="text-xs text-gray-500 leading-relaxed">{h.desc}</p>
              </div>
            </div>
          ))}

          <div className="rounded-2xl p-5" style={{ background: 'rgba(234,88,12,0.06)', border: '1px solid rgba(234,88,12,0.2)' }}>
            <h3 className="font-black text-white text-sm mb-2">📋 Program Rules</h3>
            <ul className="space-y-1.5">
              {[
                'Free to join — no purchase required',
                'You earn 10% store credit on referred sales (not cash)',
                'Credit is applied automatically on your next order',
                'Referred friends get a welcome discount via your link',
                'No self-referrals — must be a new customer',
                'Credit never expires as long as your account is active',
              ].map(rule => (
                <li key={rule} className="flex items-start gap-2 text-xs text-gray-400">
                  <Check className="w-3.5 h-3.5 text-green-400 flex-shrink-0 mt-0.5" />
                  {rule}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* ── ACTIVITY ──────────────────────────────────────────────────────── */}
      {tab === 'history' && (
        <div className="space-y-3 max-w-lg mx-auto">
          {stats.history.length === 0 && (
            <div className="text-center py-12 text-gray-600">
              <Share2 className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No activity yet — share your link to get started!</p>
            </div>
          )}
          {stats.history.map(e => (
            <div key={e.id} className="flex items-center justify-between p-4 rounded-2xl"
              style={{ background: '#111', border: '1px solid #1e1e1e' }}>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: e.type === 'sale' ? 'rgba(34,197,94,0.15)' : e.type === 'payout' ? 'rgba(234,88,12,0.15)' : 'rgba(168,85,247,0.15)' }}>
                  <span className="text-sm">{e.type === 'sale' ? '💰' : e.type === 'payout' ? '🎁' : e.type === 'signup' ? '👤' : '🖱'}</span>
                </div>
                <div>
                  <p className="text-xs font-bold text-white">{e.description}</p>
                  <p className="text-[11px] text-gray-600">{e.date}</p>
                </div>
              </div>
              {e.credit > 0 && (
                <span className="text-sm font-black text-green-400">+${e.credit.toFixed(2)}</span>
              )}
            </div>
          ))}
        </div>
      )}
      </div>
    </div>
  );
}
