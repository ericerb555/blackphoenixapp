/**
 * TokenRedemptionManager Component
 * 
 * Manages token redemption, rewards, and loyalty points
 */

import { useState } from 'react';
import { Gift, Coins, Star, TrendingUp, Check, X } from 'lucide-react';
import { toast } from 'sonner@2.0.3';

interface Reward {
  id: string;
  name: string;
  description: string;
  tokensRequired: number;
  category: 'discount' | 'service' | 'product' | 'upgrade';
  available: boolean;
  image?: string;
}

interface TokenRedemptionManagerProps {
  userId?: string;
  currentTokens?: number;
  onRedemption?: (rewardId: string, tokensSpent: number) => void;
}

export function TokenRedemptionManager({
  userId,
  currentTokens = 0,
  onRedemption,
}: TokenRedemptionManagerProps) {
  const [selectedReward, setSelectedReward] = useState<Reward | null>(null);
  const [isRedeeming, setIsRedeeming] = useState(false);

  const rewards: Reward[] = [
    {
      id: 'discount_10',
      name: '10% Discount',
      description: 'Get 10% off your next service',
      tokensRequired: 100,
      category: 'discount',
      available: true,
    },
    {
      id: 'discount_25',
      name: '25% Discount',
      description: 'Get 25% off your next service',
      tokensRequired: 250,
      category: 'discount',
      available: true,
    },
    {
      id: 'free_inspection',
      name: 'Free Inspection',
      description: 'Complimentary property inspection',
      tokensRequired: 150,
      category: 'service',
      available: true,
    },
    {
      id: 'priority_support',
      name: 'Priority Support',
      description: '30 days of priority customer support',
      tokensRequired: 300,
      category: 'upgrade',
      available: true,
    },
    {
      id: 'gift_card_50',
      name: '$50 Gift Card',
      description: 'Redeemable for any service or product',
      tokensRequired: 500,
      category: 'product',
      available: true,
    },
    {
      id: 'premium_upgrade',
      name: 'Premium Upgrade',
      description: '3 months of premium features',
      tokensRequired: 750,
      category: 'upgrade',
      available: true,
    },
  ];

  const handleRedeem = async (reward: Reward) => {
    if (currentTokens < reward.tokensRequired) {
      toast.error('Insufficient tokens');
      return;
    }

    setSelectedReward(reward);
    setIsRedeeming(true);

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      toast.success(`Successfully redeemed: ${reward.name}`);
      
      if (onRedemption) {
        onRedemption(reward.id, reward.tokensRequired);
      }
      
      setSelectedReward(null);
    } catch (error) {
      console.error('Redemption error:', error);
      toast.error('Failed to redeem reward');
    } finally {
      setIsRedeeming(false);
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'discount':
        return 'bg-green-500/20 text-green-500 border-green-500/30';
      case 'service':
        return 'bg-blue-500/20 text-blue-500 border-blue-500/30';
      case 'product':
        return 'bg-purple-500/20 text-purple-500 border-purple-500/30';
      case 'upgrade':
        return 'bg-[#ea580c]/20 text-[#ea580c] border-[#ea580c]/30';
      default:
        return 'bg-gray-500/20 text-gray-500 border-gray-500/30';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'discount':
        return TrendingUp;
      case 'service':
        return Star;
      case 'product':
        return Gift;
      case 'upgrade':
        return Star;
      default:
        return Gift;
    }
  };

  return (
    <div className="space-y-6">
      {/* Token Balance */}
      <div className="bg-gradient-to-br from-[#ea580c] to-orange-700 rounded-2xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm opacity-90 mb-1">Available Tokens</p>
            <p className="text-4xl font-bold">{currentTokens.toLocaleString()}</p>
          </div>
          <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center">
            <Coins className="w-8 h-8" />
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-white/20">
          <p className="text-sm opacity-90">
            Earn more tokens by completing projects and referring friends!
          </p>
        </div>
      </div>

      {/* Available Rewards */}
      <div>
        <h3 className="text-xl font-bold text-white mb-4">Available Rewards</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {rewards.map((reward) => {
            const Icon = getCategoryIcon(reward.category);
            const canAfford = currentTokens >= reward.tokensRequired;

            return (
              <div
                key={reward.id}
                className={`bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-5 ${
                  !canAfford ? 'opacity-50' : ''
                } transition-all hover:border-[#ea580c]/50`}
              >
                {/* Category Badge */}
                <div className="flex items-center justify-between mb-3">
                  <span className={`px-2 py-1 rounded-lg border text-xs font-medium ${getCategoryColor(reward.category)}`}>
                    {reward.category.charAt(0).toUpperCase() + reward.category.slice(1)}
                  </span>
                  <Icon className="w-5 h-5 text-[#ea580c]" />
                </div>

                {/* Reward Info */}
                <h4 className="text-lg font-bold text-white mb-2">{reward.name}</h4>
                <p className="text-sm text-gray-400 mb-4">{reward.description}</p>

                {/* Cost */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Coins className="w-4 h-4 text-[#ea580c]" />
                    <span className="text-white font-bold">{reward.tokensRequired.toLocaleString()}</span>
                    <span className="text-gray-500 text-sm">tokens</span>
                  </div>
                  {canAfford && (
                    <Check className="w-5 h-5 text-green-500" />
                  )}
                </div>

                {/* Redeem Button */}
                <button
                  onClick={() => handleRedeem(reward)}
                  disabled={!canAfford || isRedeeming}
                  className={`w-full px-4 py-2 rounded-lg font-medium transition-all ${
                    canAfford
                      ? 'bg-gradient-to-r from-[#ea580c] to-orange-700 hover:shadow-lg hover:shadow-[#ea580c]/50 text-white'
                      : 'bg-[#2A2A2A] text-gray-500 cursor-not-allowed'
                  }`}
                >
                  {canAfford ? 'Redeem Now' : 'Insufficient Tokens'}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Redemption History */}
      <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-6">
        <h3 className="text-lg font-bold text-white mb-4">Recent Redemptions</h3>
        
        <div className="space-y-3">
          <div className="flex items-center justify-between py-3 border-b border-[#2A2A2A]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
                <Check className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-white font-medium">10% Discount</p>
                <p className="text-sm text-gray-500">Redeemed 3 days ago</p>
              </div>
            </div>
            <span className="text-[#ea580c] font-medium">-100 tokens</span>
          </div>

          <div className="flex items-center justify-between py-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                <Check className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-white font-medium">Free Inspection</p>
                <p className="text-sm text-gray-500">Redeemed 2 weeks ago</p>
              </div>
            </div>
            <span className="text-[#ea580c] font-medium">-150 tokens</span>
          </div>
        </div>
      </div>

      {/* How to Earn More */}
      <div className="bg-gradient-to-br from-[#ea580c]/20 to-orange-700/20 border border-[#ea580c]/30 rounded-2xl p-6">
        <h3 className="text-lg font-bold text-white mb-3">How to Earn More Tokens</h3>
        <ul className="space-y-2 text-sm text-gray-300">
          <li className="flex items-start gap-2">
            <Star className="w-4 h-4 text-[#ea580c] mt-0.5 flex-shrink-0" />
            <span>Complete projects: +50 tokens per completed project</span>
          </li>
          <li className="flex items-start gap-2">
            <Star className="w-4 h-4 text-[#ea580c] mt-0.5 flex-shrink-0" />
            <span>Refer a friend: +100 tokens per successful referral</span>
          </li>
          <li className="flex items-start gap-2">
            <Star className="w-4 h-4 text-[#ea580c] mt-0.5 flex-shrink-0" />
            <span>Leave a review: +25 tokens per verified review</span>
          </li>
          <li className="flex items-start gap-2">
            <Star className="w-4 h-4 text-[#ea580c] mt-0.5 flex-shrink-0" />
            <span>Monthly bonus: +20 tokens for active accounts</span>
          </li>
        </ul>
      </div>
    </div>
  );
}

export default TokenRedemptionManager;
