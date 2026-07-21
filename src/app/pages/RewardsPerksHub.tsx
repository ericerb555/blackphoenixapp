/**
 * RewardsPerksHub — one home for every customer rewards / perks program.
 *
 * Consolidates the previously scattered screens into a single tabbed hub:
 *   • Loyalty      → LoyaltyProgram
 *   • Affiliate    → AffiliateProgram
 *   • Referrals    → ReferralRewards
 *   • Gift Cards   → GiftCards
 *   • Gift Hours   → TransferApprovalPanel + GiftHoursModal
 *
 * Each tab renders the existing feature component, so all the real logic
 * (localStorage/server persistence) is preserved — nothing is re-implemented.
 */
import { useState, useEffect } from 'react';
import { Star, Users, Gift, CreditCard, Clock, Plus, Award } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import LoyaltyProgram from './LoyaltyProgram';
import AffiliateProgram from './AffiliateProgram';
import ReferralRewards from './ReferralRewards';
import GiftCards from './GiftCards';
import TransferApprovalPanel from '../components/TransferApprovalPanel';
import GiftHoursModal from '../components/GiftHoursModal';

type TabId = 'loyalty' | 'affiliate' | 'referrals' | 'gift-cards' | 'gift-hours';

const TABS: { id: TabId; label: string; icon: any; blurb: string }[] = [
  { id: 'loyalty',    label: 'Loyalty',    icon: Star,       blurb: 'Points & tiers' },
  { id: 'affiliate',  label: 'Affiliate',  icon: Users,      blurb: 'Partner commissions' },
  { id: 'referrals',  label: 'Referrals',  icon: Award,      blurb: 'Refer-a-friend rewards' },
  { id: 'gift-cards', label: 'Gift Cards', icon: CreditCard, blurb: 'Buy & redeem cards' },
  { id: 'gift-hours', label: 'Gift Hours', icon: Clock,      blurb: 'Gift & transfer hours' },
];

export default function RewardsPerksHub() {
  const auth = useAuth();
  const userName =
    (auth as any)?.user?.name || (auth as any)?.user?.email || 'Owner';

  // Allow deep-linking to a tab via ?tab=affiliate
  const initialTab = (() => {
    try {
      const t = new URLSearchParams(window.location.search).get('tab') as TabId | null;
      return t && TABS.some((x) => x.id === t) ? t : 'loyalty';
    } catch {
      return 'loyalty' as TabId;
    }
  })();

  const canManageReferrals = Boolean((auth as any)?.isAdmin || (auth as any)?.isOwner || (auth as any)?.isMasterAdmin);
  const visibleTabs = TABS.filter((tab) => tab.id !== 'referrals' || canManageReferrals);
  const [activeTab, setActiveTab] = useState<TabId>(() => visibleTabs.some((tab) => tab.id === initialTab) ? initialTab : 'loyalty');
  const [showGiftHours, setShowGiftHours] = useState(false);
  const [giftHoursRefresh, setGiftHoursRefresh] = useState(0);

  // Keep the active tab in sync with the URL when navigating between the
  // sidebar sub-links (they share this base path) or using back/forward.
  useEffect(() => {
    const syncFromUrl = () => {
      try {
        const t = new URLSearchParams(window.location.search).get('tab') as TabId | null;
        if (t && visibleTabs.some((x) => x.id === t)) setActiveTab(t);
        else if (t === 'referrals' && !canManageReferrals) setActiveTab('loyalty');
      } catch { /* ignore */ }
    };
    window.addEventListener('popstate', syncFromUrl);
    // The in-app router uses pushState (no event), so also listen for the
    // custom signal some hubs dispatch, and re-check on focus.
    window.addEventListener('app:navigate', syncFromUrl as EventListener);
    return () => {
      window.removeEventListener('popstate', syncFromUrl);
      window.removeEventListener('app:navigate', syncFromUrl as EventListener);
    };
  }, [canManageReferrals, visibleTabs]);

  // Clicking a tab updates the URL so it stays shareable/deep-linkable.
  const selectTab = (id: TabId) => {
    setActiveTab(id);
    try {
      window.history.replaceState({}, '', `/rewards-perks?tab=${id}`);
    } catch { /* ignore */ }
  };

  return (
    <div className="min-h-screen bg-[#0d0d0d] text-white">
      {/* Hub header */}
      <div className="border-b border-[#2A2A2A] bg-[#111] px-6 py-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#ea580c] to-[#f59e0b] flex items-center justify-center">
            <Gift className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Rewards &amp; Perks Hub</h1>
            <p className="text-sm text-gray-400">
              Loyalty, affiliate, referrals, gift cards &amp; gift hours — all in one place
            </p>
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex flex-wrap gap-2 mt-5">
          {visibleTabs.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => selectTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-colors ${
                  active
                    ? 'bg-[#ea580c] border-[#ea580c] text-white'
                    : 'bg-[#1A1A1A] border-[#2A2A2A] text-gray-300 hover:border-[#ea580c]/50 hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="text-sm font-medium">{tab.label}</span>
                <span className={`hidden sm:inline text-xs ${active ? 'text-white/70' : 'text-gray-500'}`}>
                  · {tab.blurb}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab content — each renders the existing feature screen */}
      <div className="p-6">
        {activeTab === 'loyalty' && <LoyaltyProgram />}
        {activeTab === 'affiliate' && <AffiliateProgram />}
        {activeTab === 'referrals' && <ReferralRewards />}
        {activeTab === 'gift-cards' && <GiftCards />}

        {activeTab === 'gift-hours' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <Clock className="w-5 h-5 text-[#ea580c]" />
                  Gift &amp; Transfer Hours
                </h2>
                <p className="text-sm text-gray-400">
                  Gift service hours to a customer subscription or approve pending transfers
                </p>
              </div>
              <button
                onClick={() => setShowGiftHours(true)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#ea580c] hover:bg-[#c2410c] text-white font-medium transition-colors"
              >
                <Plus className="w-4 h-4" />
                Gift Hours
              </button>
            </div>

            <TransferApprovalPanel
              key={giftHoursRefresh}
              adminName={userName}
              onTransferProcessed={() => setGiftHoursRefresh((n) => n + 1)}
            />

            <GiftHoursModal
              isOpen={showGiftHours}
              onClose={() => setShowGiftHours(false)}
              userRole="owner"
              userName={userName}
              onSuccess={() => {
                setShowGiftHours(false);
                setGiftHoursRefresh((n) => n + 1);
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
