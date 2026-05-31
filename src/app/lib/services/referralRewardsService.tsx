/**
 * Referral Rewards Service
 * Manages referral tracking, rewards, and analytics
 */

export interface Referral {
  id: string;
  referrerId: string;
  referrerName: string;
  referredEmail: string;
  referredName?: string;
  referredPhone?: string;
  status: 'pending' | 'signed-up' | 'first-purchase' | 'active' | 'expired';
  referralCode: string;
  referralLink: string;
  
  // Dates
  sentDate: string;
  signupDate?: string;
  firstPurchaseDate?: string;
  expirationDate?: string;
  
  // Rewards
  rewardEarned: number;
  rewardPaid: boolean;
  rewardPaidDate?: string;
  bonusEarned?: number;
  
  // Metadata
  source: 'email' | 'link' | 'social' | 'direct';
  notes?: string;
}

export interface ReferralReward {
  id: string;
  name: string;
  description: string;
  type: 'cash' | 'credit' | 'discount' | 'service';
  amount: number;
  icon: string;
  color: string;
  requirements: string[];
  tier: number;
}

export interface ReferralTier {
  id: string;
  name: string;
  minReferrals: number;
  maxReferrals: number;
  rewardMultiplier: number;
  bonusReward: number;
  benefits: string[];
  color: string;
  icon: string;
}

export interface ReferrerProfile {
  userId: string;
  userName: string;
  email: string;
  referralCode: string;
  referralLink: string;
  
  // Stats
  totalReferrals: number;
  successfulReferrals: number;
  pendingReferrals: number;
  totalEarned: number;
  totalPaid: number;
  pendingRewards: number;
  
  // Tier
  currentTier: string;
  nextTier?: string;
  referralsToNextTier: number;
  
  // History
  joinedDate: string;
  lastReferralDate?: string;
  referrals: Referral[];
}

export interface RewardTransaction {
  id: string;
  referrerId: string;
  referralId: string;
  type: 'signup_bonus' | 'purchase_bonus' | 'tier_bonus' | 'special_bonus';
  amount: number;
  status: 'pending' | 'approved' | 'paid' | 'cancelled';
  description: string;
  date: string;
  paidDate?: string;
  paymentMethod?: string;
}

class ReferralRewardsService {
  private referralsKey = 'referral_program';
  private profilesKey = 'referrer_profiles';
  private rewardsKey = 'reward_transactions';

  // Get current user's profile
  getCurrentProfile(): ReferrerProfile {
    const profiles = this.getAllProfiles();
    // For demo, return first profile or create one
    if (profiles.length > 0) {
      return profiles[0];
    }
    return this.createDefaultProfile();
  }

  // Get all profiles
  getAllProfiles(): ReferrerProfile[] {
    const data = localStorage.getItem(this.profilesKey);
    return data ? JSON.parse(data) : [];
  }

  // Create referrer profile
  createProfile(userName: string, email: string): ReferrerProfile {
    const profiles = this.getAllProfiles();
    const referralCode = this.generateReferralCode(userName);
    
    const profile: ReferrerProfile = {
      userId: `user_${Date.now()}`,
      userName,
      email,
      referralCode,
      referralLink: `https://yourcompany.com/join?ref=${referralCode}`,
      totalReferrals: 0,
      successfulReferrals: 0,
      pendingReferrals: 0,
      totalEarned: 0,
      totalPaid: 0,
      pendingRewards: 0,
      currentTier: 'Bronze',
      nextTier: 'Silver',
      referralsToNextTier: 5,
      joinedDate: new Date().toISOString(),
      referrals: []
    };
    
    profiles.push(profile);
    this.saveProfiles(profiles);
    return profile;
  }

  // Send referral
  sendReferral(referrerProfile: ReferrerProfile, referredEmail: string, referredName?: string, source: string = 'email'): Referral {
    const referral: Referral = {
      id: `ref_${Date.now()}`,
      referrerId: referrerProfile.userId,
      referrerName: referrerProfile.userName,
      referredEmail,
      referredName,
      status: 'pending',
      referralCode: referrerProfile.referralCode,
      referralLink: referrerProfile.referralLink,
      sentDate: new Date().toISOString(),
      expirationDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(), // 90 days
      rewardEarned: 0,
      rewardPaid: false,
      source: source as any
    };
    
    // Add to profile
    referrerProfile.referrals.unshift(referral);
    referrerProfile.totalReferrals++;
    referrerProfile.pendingReferrals++;
    referrerProfile.lastReferralDate = new Date().toISOString();
    
    this.updateProfile(referrerProfile);
    
    return referral;
  }

  // Update referral status
  updateReferralStatus(referralId: string, status: Referral['status'], purchaseAmount?: number): void {
    const profiles = this.getAllProfiles();
    
    for (const profile of profiles) {
      const referral = profile.referrals.find(r => r.id === referralId);
      if (referral) {
        const oldStatus = referral.status;
        referral.status = status;
        
        // Update dates
        if (status === 'signed-up' && !referral.signupDate) {
          referral.signupDate = new Date().toISOString();
          profile.pendingReferrals--;
          profile.successfulReferrals++;
          
          // Award signup bonus
          const signupReward = 50; // $50 signup bonus
          referral.rewardEarned += signupReward;
          profile.totalEarned += signupReward;
          profile.pendingRewards += signupReward;
          
          this.createRewardTransaction(profile.userId, referralId, 'signup_bonus', signupReward, 'Referral signed up');
        }
        
        if (status === 'first-purchase' && !referral.firstPurchaseDate) {
          referral.firstPurchaseDate = new Date().toISOString();
          
          // Award purchase bonus
          const purchaseReward = purchaseAmount ? purchaseAmount * 0.1 : 100; // 10% of purchase or $100
          referral.rewardEarned += purchaseReward;
          referral.bonusEarned = purchaseReward;
          profile.totalEarned += purchaseReward;
          profile.pendingRewards += purchaseReward;
          
          this.createRewardTransaction(profile.userId, referralId, 'purchase_bonus', purchaseReward, 'Referral made first purchase');
          
          // Check for tier upgrade
          this.checkTierUpgrade(profile);
        }
        
        this.saveProfiles(profiles);
        break;
      }
    }
  }

  // Check and upgrade tier
  checkTierUpgrade(profile: ReferrerProfile): void {
    const tiers = this.getTiers();
    const currentTierIndex = tiers.findIndex(t => t.name === profile.currentTier);
    
    if (currentTierIndex < tiers.length - 1) {
      const nextTier = tiers[currentTierIndex + 1];
      if (profile.successfulReferrals >= nextTier.minReferrals) {
        profile.currentTier = nextTier.name;
        profile.totalEarned += nextTier.bonusReward;
        profile.pendingRewards += nextTier.bonusReward;
        
        this.createRewardTransaction(
          profile.userId,
          'tier_upgrade',
          'tier_bonus',
          nextTier.bonusReward,
          `Upgraded to ${nextTier.name} tier`
        );
        
        // Update next tier
        if (currentTierIndex + 2 < tiers.length) {
          const newNextTier = tiers[currentTierIndex + 2];
          profile.nextTier = newNextTier.name;
          profile.referralsToNextTier = newNextTier.minReferrals - profile.successfulReferrals;
        } else {
          profile.nextTier = undefined;
          profile.referralsToNextTier = 0;
        }
      }
    }
  }

  // Create reward transaction
  createRewardTransaction(referrerId: string, referralId: string, type: RewardTransaction['type'], amount: number, description: string): void {
    const transactions = this.getRewardTransactions();
    
    const transaction: RewardTransaction = {
      id: `txn_${Date.now()}`,
      referrerId,
      referralId,
      type,
      amount,
      status: 'pending',
      description,
      date: new Date().toISOString()
    };
    
    transactions.push(transaction);
    localStorage.setItem(this.rewardsKey, JSON.stringify(transactions));
  }

  // Get reward transactions
  getRewardTransactions(referrerId?: string): RewardTransaction[] {
    const data = localStorage.getItem(this.rewardsKey);
    const transactions: RewardTransaction[] = data ? JSON.parse(data) : [];
    
    if (referrerId) {
      return transactions.filter(t => t.referrerId === referrerId);
    }
    
    return transactions;
  }

  // Pay out rewards
  payoutRewards(referrerId: string, amount: number, method: string): void {
    const profiles = this.getAllProfiles();
    const profile = profiles.find(p => p.userId === referrerId);
    
    if (profile) {
      profile.pendingRewards -= amount;
      profile.totalPaid += amount;
      
      // Update transactions
      const transactions = this.getRewardTransactions(referrerId);
      transactions
        .filter(t => t.status === 'pending')
        .slice(0, Math.ceil(amount / 50)) // Rough calculation
        .forEach(t => {
          t.status = 'paid';
          t.paidDate = new Date().toISOString();
          t.paymentMethod = method;
        });
      
      localStorage.setItem(this.rewardsKey, JSON.stringify(this.getRewardTransactions()));
      this.saveProfiles(profiles);
    }
  }

  // Get available rewards
  getAvailableRewards(): ReferralReward[] {
    return [
      {
        id: 'signup_bonus',
        name: 'Signup Bonus',
        description: 'Earn when your referral signs up',
        type: 'cash',
        amount: 50,
        icon: '💰',
        color: 'green',
        requirements: ['Referral creates account'],
        tier: 1
      },
      {
        id: 'purchase_bonus',
        name: 'First Purchase Bonus',
        description: 'Earn 10% of their first purchase',
        type: 'cash',
        amount: 100,
        icon: '🎁',
        color: 'blue',
        requirements: ['Referral makes first purchase'],
        tier: 1
      },
      {
        id: 'tier_bonus',
        name: 'Tier Upgrade Bonus',
        description: 'Extra rewards when you level up',
        type: 'cash',
        amount: 500,
        icon: '🏆',
        color: 'purple',
        requirements: ['Reach new referral tier'],
        tier: 2
      },
      {
        id: 'monthly_bonus',
        name: 'Monthly Active Bonus',
        description: 'Bonus for 5+ referrals in a month',
        type: 'cash',
        amount: 200,
        icon: '⭐',
        color: 'yellow',
        requirements: ['5+ successful referrals per month'],
        tier: 3
      }
    ];
  }

  // Get tiers
  getTiers(): ReferralTier[] {
    return [
      {
        id: 'bronze',
        name: 'Bronze',
        minReferrals: 0,
        maxReferrals: 4,
        rewardMultiplier: 1.0,
        bonusReward: 0,
        benefits: ['$50 per signup', 'Basic rewards', 'Email support'],
        color: 'from-orange-600 to-orange-700',
        icon: '🥉'
      },
      {
        id: 'silver',
        name: 'Silver',
        minReferrals: 5,
        maxReferrals: 14,
        rewardMultiplier: 1.2,
        bonusReward: 250,
        benefits: ['$60 per signup', '20% bonus rewards', 'Priority support', '$250 tier bonus'],
        color: 'from-gray-400 to-gray-500',
        icon: '🥈'
      },
      {
        id: 'gold',
        name: 'Gold',
        minReferrals: 15,
        maxReferrals: 29,
        rewardMultiplier: 1.5,
        bonusReward: 500,
        benefits: ['$75 per signup', '50% bonus rewards', 'Dedicated support', '$500 tier bonus'],
        color: 'from-yellow-500 to-yellow-600',
        icon: '🥇'
      },
      {
        id: 'platinum',
        name: 'Platinum',
        minReferrals: 30,
        maxReferrals: 999,
        rewardMultiplier: 2.0,
        bonusReward: 1000,
        benefits: ['$100 per signup', '2x all rewards', 'VIP support', '$1000 tier bonus', 'Exclusive perks'],
        color: 'from-purple-600 to-purple-700',
        icon: '💎'
      }
    ];
  }

  // Generate referral code
  private generateReferralCode(name: string): string {
    const cleanName = name.replace(/[^a-zA-Z]/g, '').toUpperCase().substring(0, 4);
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${cleanName}${random}`;
  }

  // Update profile
  private updateProfile(profile: ReferrerProfile): void {
    const profiles = this.getAllProfiles();
    const index = profiles.findIndex(p => p.userId === profile.userId);
    if (index !== -1) {
      profiles[index] = profile;
      this.saveProfiles(profiles);
    }
  }

  // Save profiles
  private saveProfiles(profiles: ReferrerProfile[]): void {
    localStorage.setItem(this.profilesKey, JSON.stringify(profiles));
  }

  // Create default profile
  private createDefaultProfile(): ReferrerProfile {
    const profile = this.createProfile('Demo User', 'demo@example.com');
    
    // Add sample referrals
    const sampleReferrals: Partial<Referral>[] = [
      {
        referredEmail: 'john.smith@email.com',
        referredName: 'John Smith',
        status: 'first-purchase',
        sentDate: '2026-02-15T10:00:00Z',
        signupDate: '2026-02-16T14:30:00Z',
        firstPurchaseDate: '2026-02-18T09:15:00Z',
        rewardEarned: 150,
        bonusEarned: 100,
        source: 'email'
      },
      {
        referredEmail: 'sarah.johnson@email.com',
        referredName: 'Sarah Johnson',
        status: 'signed-up',
        sentDate: '2026-02-18T11:00:00Z',
        signupDate: '2026-02-19T16:45:00Z',
        rewardEarned: 50,
        source: 'link'
      },
      {
        referredEmail: 'mike.davis@email.com',
        referredName: 'Mike Davis',
        status: 'pending',
        sentDate: '2026-02-20T09:30:00Z',
        rewardEarned: 0,
        source: 'social'
      }
    ];
    
    sampleReferrals.forEach((ref, i) => {
      // Add delay to ensure unique timestamps
      const delayedTimestamp = Date.now() + i;
      const referral: Referral = {
        id: `ref_${delayedTimestamp}`,
        referrerId: profile.userId,
        referrerName: profile.userName,
        referredEmail: ref.referredEmail!,
        referredName: ref.referredName,
        status: ref.status as any || 'pending',
        referralCode: profile.referralCode,
        referralLink: profile.referralLink,
        sentDate: ref.sentDate!,
        expirationDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
        rewardEarned: ref.rewardEarned || 0,
        rewardPaid: false,
        bonusEarned: ref.bonusEarned,
        source: ref.source as any,
        signupDate: ref.signupDate,
        firstPurchaseDate: ref.firstPurchaseDate
      };
      
      profile.referrals.unshift(referral);
      profile.totalReferrals++;
      
      if (ref.status === 'pending') {
        profile.pendingReferrals++;
      } else if (ref.status === 'signed-up' || ref.status === 'first-purchase') {
        profile.successfulReferrals++;
        profile.totalEarned += ref.rewardEarned || 0;
        profile.pendingRewards += ref.rewardEarned || 0;
      }
    });
    
    profile.lastReferralDate = new Date().toISOString();
    this.updateProfile(profile);
    return profile;
  }
}

export const referralRewardsService = new ReferralRewardsService();
