import { useState, useEffect } from 'react';
import {
  DollarSign, TrendingUp, Users, Calendar, Target, AlertCircle,
  ArrowRight, Building2, CheckCircle, Loader2
} from 'lucide-react';

interface Opportunity {
  id: string;
  title: string;
  category: string;
  minInvestment: number;
  maxInvestment: number;
  projectedROI: number;
  term: string;
  payoutFrequency: string;
  status: string;
  investors: number;
  funded: number;
  targetRaise: number;
  currentCommitments?: number;
  highlight?: string;
  needsMoreFunding?: boolean;
  silentInvestment?: boolean;
}

const DEFAULT_OPPORTUNITIES: Opportunity[] = [
  {
    id: 'COMP-001',
    title: 'Revenue Share Partnership',
    category: 'Company Equity',
    minInvestment: 100000,
    maxInvestment: 2000000,
    projectedROI: 24,
    term: '3 years',
    payoutFrequency: 'quarterly',
    status: 'open',
    investors: 12,
    funded: 45,
    targetRaise: 5000000,
    currentCommitments: 2250000,
    highlight: 'Passive Income',
    silentInvestment: false,
    needsMoreFunding: false,
  },
  {
    id: 'PROP-025',
    title: 'Salem NH Fix & Flip Portfolio',
    category: 'Value-Add',
    minInvestment: 50000,
    maxInvestment: 500000,
    projectedROI: 35,
    term: '18 months',
    payoutFrequency: 'project_completion',
    status: 'open',
    investors: 15,
    funded: 88,
    targetRaise: 3500000,
    currentCommitments: 3080000,
    needsMoreFunding: true,
    silentInvestment: true,
    highlight: 'Quick Returns',
  },
  {
    id: 'PROP-026',
    title: 'NH Multi-Family REIT Fund',
    category: 'REIT',
    minInvestment: 10000,
    maxInvestment: 1000000,
    projectedROI: 22,
    term: 'Ongoing',
    payoutFrequency: 'monthly',
    status: 'open',
    investors: 124,
    funded: 92,
    targetRaise: 50000000,
    currentCommitments: 46000000,
    needsMoreFunding: true,
    silentInvestment: true,
    highlight: 'Diversified',
  },
  {
    id: 'PROP-027',
    title: 'Seaport Boston Development',
    category: 'Development',
    minInvestment: 200000,
    maxInvestment: 2000000,
    projectedROI: 48,
    term: '4 years',
    payoutFrequency: 'yearly',
    status: 'open',
    investors: 6,
    funded: 34,
    targetRaise: 12000000,
    currentCommitments: 4080000,
    needsMoreFunding: true,
    silentInvestment: true,
    highlight: 'Highest Returns',
  }
];

export default function InvestmentOpportunitiesPublicView() {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'open' | 'funded'>('open');

  useEffect(() => {
    loadOpportunities();
  }, []);

  const loadOpportunities = () => {
    setLoading(true);
    // Load from localStorage
    const stored = localStorage.getItem('investmentOpportunities');
    if (stored) {
      try {
        const data = JSON.parse(stored);
        setOpportunities(data);
        console.log(`✅ Loaded ${data.length} opportunities from localStorage`);
      } catch (e) {
        console.error('Error loading opportunities:', e);
        // Fallback to defaults
        setOpportunities(DEFAULT_OPPORTUNITIES);
        localStorage.setItem('investmentOpportunities', JSON.stringify(DEFAULT_OPPORTUNITIES));
      }
    } else {
      // No data in localStorage - use defaults and save them
      console.log(`✅ Loading ${DEFAULT_OPPORTUNITIES.length} default opportunities`);
      setOpportunities(DEFAULT_OPPORTUNITIES);
      localStorage.setItem('investmentOpportunities', JSON.stringify(DEFAULT_OPPORTUNITIES));
    }
    setLoading(false);
  };

  const filteredOpportunities = opportunities.filter(opp => {
    if (filter === 'all') return true;
    return opp.status === filter;
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      'Company Equity': 'text-blue-400',
      'Value-Add': 'text-orange-400',
      'REIT': 'text-purple-400',
      'Development': 'text-green-400',
      'Tax-Deferred': 'text-yellow-400',
      'Turnkey': 'text-cyan-400',
      'Fractional Ownership': 'text-pink-400'
    };
    return colors[category] || 'text-gray-400';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center px-6">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 text-orange-400 animate-spin" />
          <p className="text-gray-400">Loading opportunities...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0A0A0A', paddingTop: '3rem', paddingBottom: '3rem', display: 'flex', justifyContent: 'center', width: '100%' }}>
      <div style={{ maxWidth: '80rem', width: '100%', display: 'block', paddingLeft: '1.5rem', paddingRight: '1.5rem' }}>
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500/10 border border-orange-500/30 rounded-full mb-6">
            <TrendingUp className="w-4 h-4 text-orange-400" />
            <span className="text-sm font-semibold text-orange-400">Investment Opportunities</span>
          </div>
          <h1 className="text-5xl font-bold text-white mb-4">
            Explore Our Investment Portfolio
          </h1>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            Discover vetted real estate and business investment opportunities with competitive returns
          </p>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center justify-center gap-4 mb-8">
          <button
            onClick={() => setFilter('all')}
            className={`px-6 py-2 rounded-lg font-semibold transition-all ${
              filter === 'all'
                ? 'bg-orange-500 text-white'
                : 'bg-[#1A1A1A] text-gray-400 hover:text-white border border-[#2A2A2A]'
            }`}
          >
            All ({opportunities.length})
          </button>
          <button
            onClick={() => setFilter('open')}
            className={`px-6 py-2 rounded-lg font-semibold transition-all ${
              filter === 'open'
                ? 'bg-orange-500 text-white'
                : 'bg-[#1A1A1A] text-gray-400 hover:text-white border border-[#2A2A2A]'
            }`}
          >
            Open ({opportunities.filter(o => o.status === 'open').length})
          </button>
          <button
            onClick={() => setFilter('funded')}
            className={`px-6 py-2 rounded-lg font-semibold transition-all ${
              filter === 'funded'
                ? 'bg-orange-500 text-white'
                : 'bg-[#1A1A1A] text-gray-400 hover:text-white border border-[#2A2A2A]'
            }`}
          >
            Funded ({opportunities.filter(o => o.status === 'funded').length})
          </button>
        </div>

        {/* Opportunities Grid */}
        <div className="flex flex-wrap justify-center gap-6">
          {filteredOpportunities.map((opp) => (
            <div
              key={opp.id}
              className="w-full md:w-[calc(50%-12px)] lg:w-[calc(33.333%-16px)] bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6 hover:border-orange-500/30 transition-all"
            >
              {/* Header */}
              <div className="mb-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-white mb-1">{opp.title}</h3>
                    <p className={`text-sm font-semibold ${getCategoryColor(opp.category)}`}>
                      {opp.category}
                    </p>
                  </div>
                  {opp.highlight && (
                    <span className="px-2 py-1 rounded text-xs font-semibold bg-orange-500/20 text-orange-300 border border-orange-500/30">
                      {opp.highlight}
                    </span>
                  )}
                </div>

                {opp.needsMoreFunding && (
                  <div className="flex items-center gap-1 text-xs text-blue-400 bg-blue-500/10 px-2 py-1 rounded border border-blue-500/20 w-fit">
                    <Target className="w-3 h-3" />
                    Fundraising
                  </div>
                )}
              </div>

              {/* ROI & Term */}
              <div className="grid grid-cols-2 gap-4 mb-4 p-4 bg-[#0A0A0A] rounded-lg border border-[#2A2A2A]">
                <div>
                  <div className="text-xs text-gray-500 mb-1">Projected ROI</div>
                  <div className="text-2xl font-bold text-green-400">{opp.projectedROI}%</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1">Term</div>
                  <div className="text-lg font-semibold text-white">{opp.term}</div>
                </div>
              </div>

              {/* Investment Range */}
              <div className="mb-4">
                <div className="text-xs text-gray-500 mb-2">Investment Range</div>
                <div className="text-sm font-semibold text-white">
                  {formatCurrency(opp.minInvestment)} - {formatCurrency(opp.maxInvestment)}
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mb-4">
                <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
                  <span>Funded</span>
                  <span>{opp.funded}%</span>
                </div>
                <div className="w-full bg-[#0A0A0A] rounded-full h-2 border border-[#2A2A2A]">
                  <div
                    className="bg-gradient-to-r from-orange-500 to-orange-600 h-full rounded-full transition-all"
                    style={{ width: `${Math.min(opp.funded, 100)}%` }}
                  />
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-4 mb-4 text-xs">
                <div className="flex items-center gap-2 text-gray-400">
                  <Users className="w-4 h-4" />
                  {opp.investors} Investors
                </div>
                <div className="flex items-center gap-2 text-gray-400">
                  <Calendar className="w-4 h-4" />
                  {opp.payoutFrequency}
                </div>
              </div>

              {/* CTA */}
              <button
                onClick={() => window.location.href = '/investor-application'}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 rounded-xl text-white font-bold transition-all"
              >
                Learn More
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>

        {filteredOpportunities.length === 0 && (
          <div className="text-center py-12">
            <AlertCircle className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">No opportunities found</h3>
            <p className="text-gray-400">Check back soon for new investment opportunities</p>
          </div>
        )}

        {/* Bottom CTA */}
        <div className="mt-16 text-center">
          <div className="bg-gradient-to-r from-orange-600/20 via-red-600/20 to-pink-600/20 border border-orange-500/30 rounded-2xl p-8">
            <h3 className="text-2xl font-bold text-white mb-3">
              Ready to Invest?
            </h3>
            <p className="text-gray-300 mb-6 max-w-2xl mx-auto">
              Join our investor network to access exclusive opportunities and receive updates on new investments
            </p>
            <button
              onClick={() => window.location.href = '/investor-application'}
              className="px-8 py-4 bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 text-white font-bold rounded-xl shadow-lg transition-all"
            >
              Apply to Become an Investor
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
