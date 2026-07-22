/**
 * Referral Rewards Component
 * Comprehensive referral tracking system with:
 * - Referral link generation and sharing
 * - Potential rewards tracker (pending referrals)
 * - Actual rewards tracker (completed projects with payment)
 * - Statistics and earnings dashboard
 * - User-specific referral tracking (isolated per account)
 */

import { useState, useEffect } from 'react';
import {
  Gift,
  Users,
  DollarSign,
  TrendingUp,
  Copy,
  Check,
  Share2,
  Mail,
  MessageSquare,
  Award,
  Clock,
  CheckCircle,
  AlertCircle,
  ExternalLink,
  Star,
  Zap
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { copyToClipboard } from '../utils/clipboard';
import { useUserData, useReferralCode } from '../lib/hooks/useUserData';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { projectId } from '../utils/supabase/info';

interface Referral {
  id: string;
  name: string;
  email: string;
  status: 'pending' | 'active' | 'completed' | 'paid';
  dateReferred: string;
  potentialReward: number;
  actualReward: number;
  projectValue?: number;
  projectCompletedDate?: string;
  paymentReceivedDate?: string;
}

export default function ReferralRewards() {
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);
  const [serverReferralCode, setServerReferralCode] = useState('');
  const [activeTab, setActiveTab] = useState<'overview' | 'pending' | 'completed'>('overview');

  // Use user-specific data storage hooks
  const [referrals, setReferrals] = useUserData<Referral[]>('referrals', []);
  const referralCode = useReferralCode();

  const referralLink = `https://theblackphoenixcompany.com/signup?ref=${serverReferralCode || referralCode}`;

  useEffect(() => {
    if (!user?.email) return;
    const loadCode = async () => {
      try { const { data: { session } } = await supabase.auth.getSession(); if (!session?.access_token) return; const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-57095a78/referrals/my-code`, { headers: { Authorization: `Bearer ${session.access_token}` } }); const data = await response.json(); if (response.ok && data.success) setServerReferralCode(data.code); } catch { /* local code remains a short offline fallback */ }
    };
    void loadCode();
  }, [user?.email]);

  // The server is the source of truth for referrals. Keep the existing user-data
  // store as a local mirror so the component remains usable while offline.
  useEffect(() => {
    if (!user?.email) return;
    const load = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) return;
        const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-57095a78/referrals/mine`, { headers: { Authorization: `Bearer ${session.access_token}` } });
        const data = await response.json();
        if (!response.ok || !data.success) throw new Error(data.error || 'Unable to load referrals.');
        setReferrals((data.referrals || []).map((item: any) => ({
          id: item.id, name: item.referred || item.referredEmail, email: item.referredEmail,
          status: item.status === 'paid' ? 'paid' : item.status === 'completed' ? 'completed' : item.status === 'active' ? 'active' : 'pending',
          dateReferred: item.date, potentialReward: Number(item.potentialReward ?? item.reward ?? 0), actualReward: Number(item.actualReward ?? (item.status === 'paid' ? item.reward : 0) ?? 0),
          projectValue: item.projectValue, projectCompletedDate: item.projectCompletedDate, paymentReceivedDate: item.paymentReceivedDate,
        })));
      } catch (error) { console.warn('Referral data unavailable:', error); }
    };
    void load();
  }, [user?.email]);

  const stats = {
    totalReferrals: referrals.length,
    pendingReferrals: referrals.filter(r => r.status === 'pending' || r.status === 'active').length,
    completedReferrals: referrals.filter(r => r.status === 'completed' || r.status === 'paid').length,
    potentialRewards: referrals.reduce((sum, r) => sum + r.potentialReward, 0),
    actualRewards: referrals.reduce((sum, r) => sum + r.actualReward, 0),
    totalEarnings: referrals.reduce((sum, r) => sum + r.actualReward, 0),
  };

  const handleCopyLink = async () => {
    const success = await copyToClipboard(referralLink);
    
    if (success) {
      setCopied(true);
      toast.success('Referral link copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } else {
      toast.error('Failed to copy link. Please copy manually.');
    }
  };

  const handleShare = (platform: 'email' | 'sms' | 'whatsapp') => {
    const message = `Join our platform using my referral link: ${referralLink}`;
    
    switch (platform) {
      case 'email':
        window.open(`mailto:?subject=Join our platform&body=${encodeURIComponent(message)}`);
        break;
      case 'sms':
        window.open(`sms:?body=${encodeURIComponent(message)}`);
        break;
      case 'whatsapp':
        window.open(`https://wa.me/?text=${encodeURIComponent(message)}`);
        break;
    }
    
    toast.success(`Opening ${platform} to share referral link`);
  };

  const getStatusBadge = (status: Referral['status']) => {
    const badges = {
      pending: { color: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30', icon: Clock, label: 'Pending Signup' },
      active: { color: 'bg-blue-500/20 text-blue-300 border-blue-500/30', icon: Zap, label: 'Active Project' },
      completed: { color: 'bg-purple-500/20 text-purple-300 border-purple-500/30', icon: CheckCircle, label: 'Project Completed' },
      paid: { color: 'bg-green-500/20 text-green-300 border-green-500/30', icon: DollarSign, label: 'Reward Paid' },
    };
    
    const badge = badges[status];
    const Icon = badge.icon;
    
    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${badge.color}`}>
        <Icon className="w-3.5 h-3.5" />
        {badge.label}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-3">
            <Gift className="w-7 h-7 text-orange-400" />
            Referral Rewards
          </h2>
          <p className="text-gray-400 mt-1">Share and earn rewards for every successful referral</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-4">
          <div className="flex items-center gap-2 text-gray-400 text-sm mb-2">
            <Users className="w-4 h-4" />
            Total Referrals
          </div>
          <div className="text-2xl font-bold text-white">{stats.totalReferrals}</div>
        </div>

        <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-4">
          <div className="flex items-center gap-2 text-gray-400 text-sm mb-2">
            <Clock className="w-4 h-4" />
            Pending
          </div>
          <div className="text-2xl font-bold text-yellow-400">{stats.pendingReferrals}</div>
        </div>

        <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-4">
          <div className="flex items-center gap-2 text-gray-400 text-sm mb-2">
            <CheckCircle className="w-4 h-4" />
            Completed
          </div>
          <div className="text-2xl font-bold text-green-400">{stats.completedReferrals}</div>
        </div>

        <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-4">
          <div className="flex items-center gap-2 text-gray-400 text-sm mb-2">
            <TrendingUp className="w-4 h-4" />
            Potential Rewards
          </div>
          <div className="text-2xl font-bold text-purple-400">${stats.potentialRewards.toLocaleString()}</div>
        </div>

        <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-4">
          <div className="flex items-center gap-2 text-gray-400 text-sm mb-2">
            <DollarSign className="w-4 h-4" />
            Actual Rewards
          </div>
          <div className="text-2xl font-bold text-green-400">${stats.actualRewards.toLocaleString()}</div>
        </div>

        <div className="bg-gradient-to-br from-orange-500/20 to-orange-600/10 border border-orange-500/30 rounded-xl p-4">
          <div className="flex items-center gap-2 text-orange-300 text-sm mb-2">
            <Award className="w-4 h-4" />
            Total Earnings
          </div>
          <div className="text-2xl font-bold text-orange-400">${stats.totalEarnings.toLocaleString()}</div>
        </div>
      </div>

      {/* Referral Link Section */}
      <div className="bg-gradient-to-br from-orange-500/10 to-orange-600/5 border border-orange-500/20 rounded-xl p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold text-white mb-1">Your Referral Link</h3>
            <p className="text-gray-400 text-sm">Share this link to start earning rewards</p>
          </div>
          <Star className="w-6 h-6 text-orange-400" />
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="flex-1 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg px-4 py-3 font-mono text-sm text-gray-300">
            {referralLink}
          </div>
          <button
            onClick={handleCopyLink}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-orange-600 hover:bg-orange-500 text-white rounded-lg font-medium transition"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                Copy Link
              </>
            )}
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => handleShare('email')}
            className="flex items-center gap-2 px-4 py-2 bg-[#1A1A1A] hover:bg-[#2A2A2A] border border-[#2A2A2A] text-white rounded-lg text-sm transition"
          >
            <Mail className="w-4 h-4" />
            Share via Email
          </button>
          <button
            onClick={() => handleShare('sms')}
            className="flex items-center gap-2 px-4 py-2 bg-[#1A1A1A] hover:bg-[#2A2A2A] border border-[#2A2A2A] text-white rounded-lg text-sm transition"
          >
            <MessageSquare className="w-4 h-4" />
            Share via SMS
          </button>
          <button
            onClick={() => handleShare('whatsapp')}
            className="flex items-center gap-2 px-4 py-2 bg-[#1A1A1A] hover:bg-[#2A2A2A] border border-[#2A2A2A] text-white rounded-lg text-sm transition"
          >
            <Share2 className="w-4 h-4" />
            Share via WhatsApp
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-[#2A2A2A]">
        <div className="flex gap-1">
          {[
            { id: 'overview', label: 'All Referrals', count: stats.totalReferrals },
            { id: 'pending', label: 'Pending', count: stats.pendingReferrals },
            { id: 'completed', label: 'Completed', count: stats.completedReferrals },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-6 py-3 font-medium transition relative ${
                activeTab === tab.id
                  ? 'text-orange-400 border-b-2 border-orange-400'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {tab.label}
              <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
                activeTab === tab.id ? 'bg-orange-500/20 text-orange-300' : 'bg-[#2A2A2A] text-gray-400'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Referrals List */}
      <div className="space-y-3">
        {referrals
          .filter(r => {
            if (activeTab === 'pending') return r.status === 'pending' || r.status === 'active';
            if (activeTab === 'completed') return r.status === 'completed' || r.status === 'paid';
            return true;
          })
          .map(referral => (
            <div
              key={referral.id}
              className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-5 hover:border-orange-500/30 transition"
            >
              <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                {/* User Info */}
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center text-white font-bold">
                      {referral.name.charAt(0)}
                    </div>
                    <div>
                      <h4 className="font-semibold text-white">{referral.name}</h4>
                      <p className="text-sm text-gray-400">{referral.email}</p>
                    </div>
                  </div>
                  <div className="ml-13">
                    {getStatusBadge(referral.status)}
                  </div>
                </div>

                {/* Timeline */}
                <div className="flex-1 grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-gray-400 mb-1">Referred Date</div>
                    <div className="text-white font-medium">{new Date(referral.dateReferred).toLocaleDateString()}</div>
                  </div>
                  {referral.projectCompletedDate && (
                    <div>
                      <div className="text-gray-400 mb-1">Project Completed</div>
                      <div className="text-white font-medium">{new Date(referral.projectCompletedDate).toLocaleDateString()}</div>
                    </div>
                  )}
                  {referral.paymentReceivedDate && (
                    <div>
                      <div className="text-gray-400 mb-1">Payment Received</div>
                      <div className="text-green-400 font-medium">{new Date(referral.paymentReceivedDate).toLocaleDateString()}</div>
                    </div>
                  )}
                  {referral.projectValue && (
                    <div>
                      <div className="text-gray-400 mb-1">Project Value</div>
                      <div className="text-white font-medium">${referral.projectValue.toLocaleString()}</div>
                    </div>
                  )}
                </div>

                {/* Rewards */}
                <div className="flex gap-4">
                  {referral.potentialReward > 0 && (
                    <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg px-4 py-3 text-center">
                      <div className="text-xs text-purple-300 mb-1">Potential</div>
                      <div className="text-lg font-bold text-purple-400">${referral.potentialReward}</div>
                    </div>
                  )}
                  {referral.actualReward > 0 && (
                    <div className="bg-green-500/10 border border-green-500/30 rounded-lg px-4 py-3 text-center">
                      <div className="text-xs text-green-300 mb-1">Earned</div>
                      <div className="text-lg font-bold text-green-400">${referral.actualReward}</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}

        {referrals.filter(r => {
          if (activeTab === 'pending') return r.status === 'pending' || r.status === 'active';
          if (activeTab === 'completed') return r.status === 'completed' || r.status === 'paid';
          return true;
        }).length === 0 && (
          <div className="text-center py-12">
            <Gift className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-400 mb-2">No referrals yet</h3>
            <p className="text-gray-500">Start sharing your referral link to earn rewards!</p>
          </div>
        )}
      </div>

      {/* How It Works */}
      <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6">
        <h3 className="text-lg font-bold text-white mb-4">How Referral Rewards Work</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="w-12 h-12 bg-orange-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
              <Share2 className="w-6 h-6 text-orange-400" />
            </div>
            <h4 className="font-semibold text-white mb-1">1. Share</h4>
            <p className="text-sm text-gray-400">Share your unique referral link with friends</p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
              <Users className="w-6 h-6 text-blue-400" />
            </div>
            <h4 className="font-semibold text-white mb-1">2. They Sign Up</h4>
            <p className="text-sm text-gray-400">Your referral creates an account and starts a project</p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
              <CheckCircle className="w-6 h-6 text-purple-400" />
            </div>
            <h4 className="font-semibold text-white mb-1">3. Project Completed</h4>
            <p className="text-sm text-gray-400">They complete a project and payment is received</p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
              <Award className="w-6 h-6 text-green-400" />
            </div>
            <h4 className="font-semibold text-white mb-1">4. Get Rewarded</h4>
            <p className="text-sm text-gray-400">Receive your reward (5% of project value)</p>
          </div>
        </div>
      </div>
    </div>
  );
}
