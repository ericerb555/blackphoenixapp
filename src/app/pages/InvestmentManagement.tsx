import { useState } from 'react';
import InvestmentOpportunityManager from '../components/InvestmentOpportunityManager';
import InvestmentDetailsManager from '../components/InvestmentDetailsManager';
import { useUser } from '../lib/user-context';
import { UserRole } from '../lib/rbac';
import { DollarSign, FileText, ArrowLeft } from 'lucide-react';

export default function InvestmentManagement() {
  const { user } = useUser();
  const [activeTab, setActiveTab] = useState<'opportunities' | 'details'>('opportunities');

  const handleBackToCommandCenter = () => {
    window.location.href = '/unified-dashboard';
  };

  // Get user profile from localStorage to check account type
  const currentUserProfile = localStorage.getItem('currentUserProfile');
  let accountType = 'customer';
  let userEmail = '';

  if (currentUserProfile) {
    try {
      const profile = JSON.parse(currentUserProfile);
      accountType = profile.accountType || 'customer';
      userEmail = profile.email || '';
    } catch (e) {
      console.error('Error parsing user profile:', e);
    }
  }

  // Check if user is owner (either by role or accountType)
  const isOwner = user?.role === UserRole.PLATFORM_OWNER ||
                  accountType === 'owner' ||
                  userEmail.toLowerCase() === 'ericerb555@proton.me';

  // Only platform owners can access this management page
  if (!isOwner) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Access Denied</h1>
          <p className="text-gray-400">Only platform owners can manage investment opportunities.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] p-6">
      <div className="max-w-[1920px] mx-auto">
        {/* Back to Command Center Button */}
        <div className="mb-6">
          <button
            onClick={handleBackToCommandCenter}
            className="flex items-center gap-2 px-4 py-2 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg text-gray-300 hover:text-white hover:border-orange-500/50 hover:bg-[#2A2A2A] transition-all group"
          >
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            <span className="font-semibold">Back to Command Center</span>
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-2 mb-6 flex gap-2">
          <button
            onClick={() => setActiveTab('opportunities')}
            className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all ${
              activeTab === 'opportunities'
                ? 'bg-gradient-to-r from-[#ea580c] to-[#dc2626] text-white shadow-lg'
                : 'text-gray-400 hover:text-white hover:bg-[#2A2A2A]'
            }`}
          >
            <DollarSign className="w-5 h-5" />
            Investment Opportunities
          </button>
          <button
            onClick={() => setActiveTab('details')}
            className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all ${
              activeTab === 'details'
                ? 'bg-gradient-to-r from-[#ea580c] to-[#dc2626] text-white shadow-lg'
                : 'text-gray-400 hover:text-white hover:bg-[#2A2A2A]'
            }`}
          >
            <FileText className="w-5 h-5" />
            Investment Details & Financials
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'opportunities' && <InvestmentOpportunityManager />}
        {activeTab === 'details' && <InvestmentDetailsManager />}
      </div>
    </div>
  );
}
