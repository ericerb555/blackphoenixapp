import { useState } from 'react';
import {
  Gift, Share2, Users, DollarSign, TrendingUp, Copy, Check,
  Trophy, Star, Award, Zap, Target, ExternalLink, QrCode,
  Mail, MessageSquare, Link as LinkIcon, Download, Plus,
  BarChart3, Clock, CheckCircle, AlertCircle, UserPlus
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import ReferralInviteForm from './ReferralInviteForm';
import { copyToClipboard } from '../utils/clipboard';

interface UniversalReferralTrackerProps {
  userType: 'customer' | 'employee' | 'subcontractor' | 'investor' | 'advertiser';
  userId: string;
  userName: string;
  userEmail?: string;
  companyId: string;
  compactMode?: boolean;
}

export default function UniversalReferralTracker({
  userType,
  userId,
  userName,
  userEmail,
  companyId,
  compactMode = false
}: UniversalReferralTrackerProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'share' | 'rewards' | 'leaderboard'>('overview');
  const [copied, setCopied] = useState(false);
  const [showInviteForm, setShowInviteForm] = useState(false);

  // Mock data - would come from database
  const referralData = {
    code: `${userType.toUpperCase().substring(0, 3)}-${userName.substring(0, 4).toUpperCase()}1234`,
    totalReferrals: 12,
    successfulReferrals: 8,
    pendingReferrals: 4,
    totalRewardsEarned: 400.00,
    totalRewardsPaid: 250.00,
    pendingRewards: 150.00,
    rank: 7,
    percentile: 85,
  };

  const recentReferrals = [
    {
      id: 1,
      refereeName: 'Sarah Johnson',
      status: 'qualified',
      rewardAmount: 50,
      signedUpAt: '2 days ago',
      firstPurchaseAmount: 1250
    },
    {
      id: 2,
      refereeName: 'Mike Chen',
      status: 'pending',
      rewardAmount: 50,
      signedUpAt: '5 days ago',
      firstPurchaseAmount: null
    },
    {
      id: 3,
      refereeName: 'Lisa Anderson',
      status: 'rewarded',
      rewardAmount: 50,
      signedUpAt: '1 week ago',
      firstPurchaseAmount: 890
    },
  ];

  const leaderboard = [
    { rank: 1, name: 'David Martinez', type: 'employee', referrals: 24, rewards: 1200 },
    { rank: 2, name: 'Emma Wilson', type: 'customer', referrals: 19, rewards: 950 },
    { rank: 3, name: 'ABC Contractors', type: 'subcontractor', referrals: 15, rewards: 750 },
    { rank: 7, name: userName, type: userType, referrals: 8, rewards: 400, isCurrentUser: true },
  ];

  const programs = [
    {
      id: 1,
      name: 'Universal Referral Program',
      description: 'Refer anyone and earn $50 per qualified referral',
      referrerReward: 50,
      refereeReward: 25,
      isActive: true,
      eligibleFor: ['customer', 'employee', 'subcontractor'],
    }
  ];

  const handleCopyCode = async () => {
    const success = await copyToClipboard(referralData.code);
    if (success) {
      setCopied(true);
      toast.success('Referral code copied!');
      setTimeout(() => setCopied(false), 2000);
    } else {
      toast.error('Failed to copy code. Please copy manually.');
    }
  };

  const handleShare = async (method: string) => {
    const referralUrl = `${window.location.origin}/signup?ref=${referralData.code}`;
    const message = `Join us and get $25 off your first order! Use my referral code: ${referralData.code}`;

    switch (method) {
      case 'email':
        window.location.href = `mailto:?subject=Join us and get $25 off&body=${encodeURIComponent(message + '\n\n' + referralUrl)}`;
        break;
      case 'sms':
        window.location.href = `sms:?body=${encodeURIComponent(message + ' ' + referralUrl)}`;
        break;
      case 'copy':
        const success = await copyToClipboard(referralUrl);
        if (success) {
          toast.success('Referral link copied!');
        } else {
          toast.error('Failed to copy link. Please copy manually.');
        }
        break;
      case 'qr':
        toast.info('QR code generator would open here');
        break;
    }
  };

  const getStatusColor = (status: string) => {
    const colors: any = {
      pending: 'yellow',
      verified: 'blue',
      qualified: 'green',
      rewarded: 'cyan',
      expired: 'gray',
      rejected: 'red',
    };
    return colors[status] || 'gray';
  };

  const getUserTypeLabel = (type: string) => {
    const labels: any = {
      customer: 'Customer',
      employee: 'Employee',
      subcontractor: 'Subcontractor',
      investor: 'Investor',
      advertiser: 'Advertiser',
    };
    return labels[type] || type;
  };

  if (compactMode) {
    return (
      <>
        <div className="bg-gradient-to-br from-[#ea580c]/10 to-[#c2410c]/10 rounded-2xl border border-[#ea580c]/30 p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#ea580c] to-[#c2410c] flex items-center justify-center">
                <Gift className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Refer & Earn</h3>
                <p className="text-sm text-gray-400">Share your code and get rewarded</p>
              </div>
            </div>
            <button
              onClick={() => setShowInviteForm(true)}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#ea580c] to-[#c2410c] hover:from-[#c2410c] hover:to-[#9a3412] text-white rounded-lg transition shadow-lg shadow-[#ea580c]/20"
            >
              <UserPlus className="w-4 h-4" />
              Invite
            </button>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-white">{referralData.totalReferrals}</p>
              <p className="text-xs text-gray-400">Total Referrals</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-400">{referralData.successfulReferrals}</p>
              <p className="text-xs text-gray-400">Successful</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-[#ea580c]">${referralData.totalRewardsEarned}</p>
              <p className="text-xs text-gray-400">Earned</p>
            </div>
          </div>

          <button
            onClick={handleCopyCode}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-[#ea580c]/20 hover:bg-[#ea580c]/30 text-[#ea580c] rounded-lg transition border border-[#ea580c]/30"
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            Copy Code: {referralData.code}
          </button>
        </div>

        <ReferralInviteForm
          isOpen={showInviteForm}
          onClose={() => setShowInviteForm(false)}
          referralCode={referralData.code}
          referrerName={userName}
          userType={userType}
          programDetails={{
            referrerReward: 50,
            refereeReward: 25,
            description: 'Refer anyone and earn rewards when they make their first purchase!'
          }}
        />
      </>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#ea580c] to-[#c2410c] flex items-center justify-center shadow-lg shadow-[#ea580c]/20">
              <Gift className="w-8 h-8 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white mb-1">Referral Program</h2>
              <p className="text-gray-400">
                Share your code and earn rewards • {getUserTypeLabel(userType)} Program
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowInviteForm(true)}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#ea580c] to-[#c2410c] text-white rounded-xl hover:from-[#c2410c] hover:to-[#9a3412] transition shadow-lg shadow-[#ea580c]/20 font-semibold"
            >
              <UserPlus className="w-5 h-5" />
              Invite Someone
            </button>
            <div className="px-4 py-2 bg-[#ea580c]/10 rounded-xl border border-[#ea580c]/20">
              <div className="flex items-center gap-2 mb-1">
                <Trophy className="w-4 h-4 text-[#ea580c]" />
                <span className="text-xs text-gray-400">Your Rank</span>
              </div>
              <p className="text-2xl font-bold text-[#ea580c]">#{referralData.rank}</p>
            </div>
          </div>
        </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-[#1A1A1A] rounded-2xl p-6 border border-[#2A2A2A]">
          <div className="flex items-center justify-between mb-3">
            <Users className="w-6 h-6 text-blue-400" />
            <span className="text-xs font-semibold text-green-400">+15%</span>
          </div>
          <p className="text-3xl font-bold text-white mb-1">{referralData.totalReferrals}</p>
          <p className="text-sm text-gray-400">Total Referrals</p>
        </div>

        <div className="bg-[#1A1A1A] rounded-2xl p-6 border border-[#2A2A2A]">
          <div className="flex items-center justify-between mb-3">
            <CheckCircle className="w-6 h-6 text-green-400" />
            <span className="text-xs font-semibold text-green-400">67%</span>
          </div>
          <p className="text-3xl font-bold text-white mb-1">{referralData.successfulReferrals}</p>
          <p className="text-sm text-gray-400">Successful</p>
        </div>

        <div className="bg-[#1A1A1A] rounded-2xl p-6 border border-[#2A2A2A]">
          <div className="flex items-center justify-between mb-3">
            <DollarSign className="w-6 h-6 text-[#ea580c]" />
            <span className="text-xs font-semibold text-green-400">+$50</span>
          </div>
          <p className="text-3xl font-bold text-white mb-1">${referralData.totalRewardsEarned}</p>
          <p className="text-sm text-gray-400">Total Earned</p>
        </div>

        <div className="bg-[#1A1A1A] rounded-2xl p-6 border border-[#2A2A2A]">
          <div className="flex items-center justify-between mb-3">
            <Clock className="w-6 h-6 text-yellow-400" />
            <span className="text-xs font-semibold text-yellow-400">Pending</span>
          </div>
          <p className="text-3xl font-bold text-white mb-1">${referralData.pendingRewards}</p>
          <p className="text-sm text-gray-400">Pending Rewards</p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] p-2">
        <div className="flex items-center gap-2">
          {[
            { id: 'overview', name: 'Overview', icon: BarChart3 },
            { id: 'share', name: 'Share Code', icon: Share2 },
            { id: 'rewards', name: 'My Rewards', icon: Gift },
            { id: 'leaderboard', name: 'Leaderboard', icon: Trophy },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium transition ${
                  activeTab === tab.id
                    ? 'bg-gradient-to-r from-[#ea580c] to-[#c2410c] text-white shadow-lg shadow-[#ea580c]/20'
                    : 'text-gray-400 hover:text-gray-300 hover:bg-[#2A2A2A]'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Your Referral Code */}
          <div className="bg-gradient-to-br from-[#ea580c]/10 to-[#c2410c]/10 rounded-2xl border border-[#ea580c]/30 p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Your Referral Code</h3>
            <div className="flex items-center gap-4">
              <div className="flex-1 p-6 bg-[#0A0A0A] rounded-xl border border-[#ea580c]/20">
                <p className="text-xs text-gray-400 mb-2">Your unique code</p>
                <p className="text-4xl font-bold text-[#ea580c] tracking-wider mb-4">{referralData.code}</p>
                <p className="text-sm text-gray-400">Share this code to earn $50 per qualified referral</p>
              </div>
              <button
                onClick={handleCopyCode}
                className="px-8 py-6 bg-gradient-to-r from-[#ea580c] to-[#c2410c] text-white rounded-xl hover:from-[#c2410c] hover:to-[#9a3412] transition shadow-lg shadow-[#ea580c]/20"
              >
                {copied ? (
                  <>
                    <Check className="w-6 h-6 mx-auto mb-2" />
                    <span className="text-sm font-semibold">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-6 h-6 mx-auto mb-2" />
                    <span className="text-sm font-semibold">Copy Code</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Recent Referrals */}
          <div className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Recent Referrals</h3>
            <div className="space-y-3">
              {recentReferrals.map((referral) => (
                <div key={referral.id} className="flex items-center justify-between p-4 bg-[#0A0A0A] rounded-xl border border-[#2A2A2A]">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-lg bg-gradient-to-br from-${getStatusColor(referral.status)}-600/20 to-${getStatusColor(referral.status)}-700/20 flex items-center justify-center border border-${getStatusColor(referral.status)}-500/20`}>
                      <Users className={`w-5 h-5 text-${getStatusColor(referral.status)}-400`} />
                    </div>
                    <div>
                      <p className="font-semibold text-white">{referral.refereeName}</p>
                      <p className="text-sm text-gray-400">Signed up {referral.signedUpAt}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {referral.firstPurchaseAmount && (
                      <div className="text-right">
                        <p className="text-sm font-semibold text-green-400">
                          ${referral.firstPurchaseAmount}
                        </p>
                        <p className="text-xs text-gray-500">First purchase</p>
                      </div>
                    )}
                    <span className={`px-3 py-1 rounded-lg text-sm font-semibold bg-${getStatusColor(referral.status)}-500/10 text-${getStatusColor(referral.status)}-400 border border-${getStatusColor(referral.status)}-500/20`}>
                      {referral.status}
                    </span>
                    <div className="text-right">
                      <p className="text-lg font-bold text-[#ea580c]">${referral.rewardAmount}</p>
                      <p className="text-xs text-gray-500">Reward</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Share Tab */}
      {activeTab === 'share' && (
        <div className="space-y-6">
          {/* Invite Someone - Primary Action */}
          <div className="bg-gradient-to-br from-[#ea580c]/10 to-[#c2410c]/10 rounded-2xl border border-[#ea580c]/30 p-8">
            <div className="text-center mb-6">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#ea580c] to-[#c2410c] flex items-center justify-center mx-auto mb-4 shadow-lg shadow-[#ea580c]/20">
                <UserPlus className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">Invite Someone You Know</h3>
              <p className="text-gray-300 max-w-xl mx-auto">
                Send a personalized invitation via email or text. They get ${programs[0].refereeReward} off, you earn ${programs[0].referrerReward} when they purchase!
              </p>
            </div>
            <button
              onClick={() => setShowInviteForm(true)}
              className="w-full max-w-md mx-auto flex items-center justify-center gap-3 px-8 py-4 bg-gradient-to-r from-[#ea580c] to-[#c2410c] text-white rounded-xl hover:from-[#c2410c] hover:to-[#9a3412] transition shadow-lg shadow-[#ea580c]/20 font-bold text-lg"
            >
              <UserPlus className="w-6 h-6" />
              Send Invitation Now
            </button>
          </div>

          <div className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Other Sharing Options</h3>
            
            <div className="grid grid-cols-2 gap-4 mb-6">
              <button
                onClick={() => handleShare('email')}
                className="flex flex-col items-center gap-3 p-6 bg-[#0A0A0A] rounded-xl border border-[#2A2A2A] hover:border-blue-500/30 transition"
              >
                <Mail className="w-8 h-8 text-blue-400" />
                <span className="font-semibold text-white">Email</span>
                <span className="text-xs text-gray-400">Send via email</span>
              </button>

              <button
                onClick={() => handleShare('sms')}
                className="flex flex-col items-center gap-3 p-6 bg-[#0A0A0A] rounded-xl border border-[#2A2A2A] hover:border-green-500/30 transition"
              >
                <MessageSquare className="w-8 h-8 text-green-400" />
                <span className="font-semibold text-white">SMS</span>
                <span className="text-xs text-gray-400">Share via text</span>
              </button>

              <button
                onClick={() => handleShare('copy')}
                className="flex flex-col items-center gap-3 p-6 bg-[#0A0A0A] rounded-xl border border-[#2A2A2A] hover:border-purple-500/30 transition"
              >
                <LinkIcon className="w-8 h-8 text-purple-400" />
                <span className="font-semibold text-white">Copy Link</span>
                <span className="text-xs text-gray-400">Get referral URL</span>
              </button>

              <button
                onClick={() => handleShare('qr')}
                className="flex flex-col items-center gap-3 p-6 bg-[#0A0A0A] rounded-xl border border-[#2A2A2A] hover:border-orange-500/30 transition"
              >
                <QrCode className="w-8 h-8 text-[#ea580c]" />
                <span className="font-semibold text-white">QR Code</span>
                <span className="text-xs text-gray-400">Generate QR</span>
              </button>
            </div>

            <div className="p-4 bg-gradient-to-br from-blue-600/10 to-blue-700/10 rounded-xl border border-blue-500/30">
              <div className="flex items-start gap-3">
                <Zap className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-blue-400 mb-1">Pro Tip</p>
                  <p className="text-sm text-gray-300">
                    Your referrals are more likely to sign up when you share your personal story about why you chose us!
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Rewards Tab */}
      {activeTab === 'rewards' && (
        <div className="space-y-6">
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-gradient-to-br from-green-600/10 to-green-700/10 rounded-2xl border border-green-500/30 p-6">
              <DollarSign className="w-8 h-8 text-green-400 mb-3" />
              <p className="text-3xl font-bold text-white mb-1">${referralData.totalRewardsPaid}</p>
              <p className="text-sm text-gray-400">Paid Out</p>
            </div>

            <div className="bg-gradient-to-br from-yellow-600/10 to-yellow-700/10 rounded-2xl border border-yellow-500/30 p-6">
              <Clock className="w-8 h-8 text-yellow-400 mb-3" />
              <p className="text-3xl font-bold text-white mb-1">${referralData.pendingRewards}</p>
              <p className="text-sm text-gray-400">Pending</p>
            </div>

            <div className="bg-gradient-to-br from-orange-600/10 to-orange-700/10 rounded-2xl border border-orange-500/30 p-6">
              <TrendingUp className="w-8 h-8 text-[#ea580c] mb-3" />
              <p className="text-3xl font-bold text-white mb-1">${referralData.totalRewardsEarned}</p>
              <p className="text-sm text-gray-400">Total Earned</p>
            </div>
          </div>

          <div className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Active Programs</h3>
            {programs.map((program) => (
              <div key={program.id} className="p-6 bg-[#0A0A0A] rounded-xl border border-[#2A2A2A]">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h4 className="text-lg font-bold text-white mb-2">{program.name}</h4>
                    <p className="text-gray-400">{program.description}</p>
                  </div>
                  <span className="px-3 py-1 bg-green-500/10 text-green-400 rounded-lg text-sm font-semibold border border-green-500/20">
                    Active
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-[#1A1A1A] rounded-lg border border-[#2A2A2A]">
                    <p className="text-xs text-gray-500 mb-1">You Earn</p>
                    <p className="text-2xl font-bold text-[#ea580c]">${program.referrerReward}</p>
                  </div>
                  <div className="p-4 bg-[#1A1A1A] rounded-lg border border-[#2A2A2A]">
                    <p className="text-xs text-gray-500 mb-1">They Get</p>
                    <p className="text-2xl font-bold text-green-400">${program.refereeReward}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Leaderboard Tab */}
      {activeTab === 'leaderboard' && (
        <div className="space-y-6">
          <div className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-white">Top Referrers</h3>
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <Target className="w-4 h-4" />
                <span>This Month</span>
              </div>
            </div>

            <div className="space-y-3">
              {leaderboard.map((entry) => (
                <div
                  key={entry.rank}
                  className={`flex items-center justify-between p-4 rounded-xl border transition ${
                    entry.isCurrentUser
                      ? 'bg-gradient-to-r from-orange-600/10 to-orange-700/10 border-orange-500/30'
                      : 'bg-[#0A0A0A] border-[#2A2A2A]'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg ${
                      entry.rank === 1 ? 'bg-gradient-to-br from-yellow-600 to-yellow-700 text-white' :
                      entry.rank === 2 ? 'bg-gradient-to-br from-gray-400 to-gray-500 text-white' :
                      entry.rank === 3 ? 'bg-gradient-to-br from-orange-600 to-orange-700 text-white' :
                      'bg-[#1A1A1A] text-gray-400'
                    }`}>
                      {entry.rank <= 3 ? <Trophy className="w-6 h-6" /> : `#${entry.rank}`}
                    </div>
                    <div>
                      <p className="font-semibold text-white">
                        {entry.name}
                        {entry.isCurrentUser && (
                          <span className="ml-2 px-2 py-0.5 bg-[#ea580c]/20 text-[#ea580c] rounded text-xs font-semibold border border-[#ea580c]/30">
                            You
                          </span>
                        )}
                      </p>
                      <p className="text-sm text-gray-400 capitalize">{getUserTypeLabel(entry.type)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="text-2xl font-bold text-white">{entry.referrals}</p>
                      <p className="text-xs text-gray-500">Referrals</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-green-400">${entry.rewards}</p>
                      <p className="text-xs text-gray-500">Rewards</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-600/10 to-purple-700/10 rounded-2xl border border-purple-500/30 p-6">
            <div className="flex items-center gap-3 mb-4">
              <Star className="w-6 h-6 text-purple-400" />
              <h3 className="text-lg font-semibold text-white">Your Performance</h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-400 mb-1">Current Rank</p>
                <p className="text-3xl font-bold text-purple-400">#{referralData.rank}</p>
              </div>
              <div>
                <p className="text-sm text-gray-400 mb-1">Top Percentile</p>
                <p className="text-3xl font-bold text-purple-400">{referralData.percentile}%</p>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>

      {/* Referral Invite Form */}
      <ReferralInviteForm
        isOpen={showInviteForm}
        onClose={() => setShowInviteForm(false)}
        referralCode={referralData.code}
        referrerName={userName}
        userType={userType}
        programDetails={{
          referrerReward: 50,
          refereeReward: 25,
          description: 'Refer anyone and earn rewards when they make their first purchase!'
        }}
      />
    </>
  );
}