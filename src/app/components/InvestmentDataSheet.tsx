/**
 * Investment Data Sheet - Comprehensive financial breakdown for investment opportunities
 * Based on FinancialDataSheet component styling
 */

import { useState } from 'react';
import { X, DollarSign, TrendingUp, Clock, Calendar, CreditCard, FileText, CheckCircle, Target, Percent, Users, Calculator, BarChart3, LineChart, PieChart } from 'lucide-react';
import { LineChart as RechartsLine, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart as RechartsPie, Pie, Cell } from 'recharts';

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
  location?: string;
  keyFeatures?: string[];
  financialHighlights?: { label: string; value: string; }[];
  riskLevel?: string;
  marketOverview?: string;
  exitStrategy?: string;
}

interface InvestmentDataSheetProps {
  opportunity: Opportunity;
  onClose: () => void;
  onNavigate?: (page: string) => void;
}

export function InvestmentDataSheet({ opportunity: opp, onClose, onNavigate }: InvestmentDataSheetProps) {
  // Interactive investment amount calculator
  const [investmentAmount, setInvestmentAmount] = useState(opp.minInvestment);

  // Calculate projections based on user input
  const projectedReturn = (investmentAmount * opp.projectedROI) / 100;
  const totalReturn = investmentAmount + projectedReturn;

  // Generate payout schedule
  const generatePayoutSchedule = () => {
    if (opp.payoutFrequency === 'Quarterly' || opp.payoutFrequency === 'quarterly after stabilization') {
      const years = parseInt(opp.term) || 3;
      const quarterlyPayout = projectedReturn / (years * 4);
      return Array.from({ length: years * 4 }, (_, i) => ({
        period: `Q${(i % 4) + 1} Year ${Math.floor(i / 4) + 1}`,
        amount: quarterlyPayout,
        cumulative: quarterlyPayout * (i + 1),
        status: 'projected'
      }));
    } else if (opp.payoutFrequency === 'Monthly') {
      const years = parseInt(opp.term) || 3;
      const monthlyPayout = projectedReturn / (years * 12);
      return Array.from({ length: Math.min(24, years * 12) }, (_, i) => ({
        period: `Month ${i + 1}`,
        amount: monthlyPayout,
        cumulative: monthlyPayout * (i + 1),
        status: 'projected'
      }));
    } else {
      // Annually or Project Completion
      const years = parseInt(opp.term) || 3;
      return Array.from({ length: years }, (_, i) => ({
        period: `Year ${i + 1}`,
        amount: projectedReturn / years,
        cumulative: (projectedReturn / years) * (i + 1),
        status: 'projected'
      }));
    }
  };

  const payoutSchedule = generatePayoutSchedule();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Generate growth chart data
  const generateGrowthData = () => {
    const years = parseInt(opp.term) || 3;
    const data = [];
    for (let i = 0; i <= years; i++) {
      const yearReturn = (projectedReturn / years) * i;
      data.push({
        year: i === 0 ? 'Start' : `Year ${i}`,
        investment: investmentAmount,
        totalValue: investmentAmount + yearReturn,
        profit: yearReturn,
      });
    }
    return data;
  };

  // Generate payout bar chart data
  const generatePayoutChartData = () => {
    if (opp.payoutFrequency === 'Quarterly' || opp.payoutFrequency === 'quarterly after stabilization') {
      const years = parseInt(opp.term) || 3;
      const quarterlyPayout = projectedReturn / (years * 4);
      return Array.from({ length: Math.min(12, years * 4) }, (_, i) => ({
        period: `Q${(i % 4) + 1}-Y${Math.floor(i / 4) + 1}`,
        payout: quarterlyPayout,
      }));
    } else if (opp.payoutFrequency === 'Monthly') {
      const years = parseInt(opp.term) || 3;
      const monthlyPayout = projectedReturn / (years * 12);
      return Array.from({ length: 12 }, (_, i) => ({
        period: `M${i + 1}`,
        payout: monthlyPayout,
      }));
    } else {
      const years = parseInt(opp.term) || 3;
      return Array.from({ length: years }, (_, i) => ({
        period: `Y${i + 1}`,
        payout: projectedReturn / years,
      }));
    }
  };

  // Pie chart data for investment breakdown
  const pieData = [
    { name: 'Initial Investment', value: investmentAmount, color: '#3b82f6' },
    { name: 'Projected Profit', value: projectedReturn, color: '#10b981' },
  ];

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInvestmentAmount(Number(e.target.value));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Number(e.target.value.replace(/[^0-9]/g, ''));
    if (value >= opp.minInvestment && value <= opp.maxInvestment) {
      setInvestmentAmount(value);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-br from-gray-900 to-black border border-gray-700 rounded-xl max-w-6xl w-full max-h-[90vh] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#ea580c] to-[#fb923c] px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <DollarSign className="w-6 h-6 text-white" />
            <div>
              <h2 className="text-xl font-bold text-white">Investment Data Sheet</h2>
              <p className="text-sm text-white/80">{opp.title} - {opp.category}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
          {/* Value Proposition Banner */}
          <div className="bg-gradient-to-r from-green-500/20 to-emerald-600/20 border-2 border-green-500/50 rounded-xl p-6 mb-6">
            <h3 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
              <TrendingUp className="w-7 h-7 text-green-400" />
              Turn Your Capital Into Profit
            </h3>
            <p className="text-gray-300 text-lg">
              {opp.highlight || `Invest in ${opp.title} and earn ${opp.projectedROI}% projected returns over ${opp.term}. Join ${opp.investors} smart investors already participating in this opportunity.`}
            </p>
          </div>

          {/* Interactive Investment Calculator */}
          <div className="bg-gradient-to-br from-blue-900/50 to-purple-900/50 border-2 border-blue-500/50 rounded-xl p-6 mb-6">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Calculator className="w-6 h-6 text-blue-400" />
              Calculate Your Potential Profit
            </h3>

            {/* Investment Amount Input */}
            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-300 mb-2">
                Your Investment Amount
              </label>
              <div className="flex items-center gap-4 mb-3">
                <input
                  type="text"
                  value={formatCurrency(investmentAmount)}
                  onChange={handleInputChange}
                  className="bg-black/50 border border-gray-600 rounded-lg px-4 py-3 text-white text-2xl font-bold focus:border-blue-500 focus:outline-none flex-1"
                />
              </div>
              <input
                type="range"
                min={opp.minInvestment}
                max={opp.maxInvestment}
                step={(opp.maxInvestment - opp.minInvestment) / 100}
                value={investmentAmount}
                onChange={handleSliderChange}
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>Min: {formatCurrency(opp.minInvestment)}</span>
                <span>Max: {formatCurrency(opp.maxInvestment)}</span>
              </div>
            </div>

            {/* Profit Projection Results */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-black/30 border border-blue-500/30 rounded-lg p-4 text-center">
                <div className="text-blue-400 text-xs mb-1 uppercase font-semibold">Your Investment</div>
                <div className="text-2xl font-bold text-white">{formatCurrency(investmentAmount)}</div>
              </div>

              <div className="bg-black/30 border border-green-500/30 rounded-lg p-4 text-center">
                <div className="text-green-400 text-xs mb-1 uppercase font-semibold flex items-center justify-center gap-1">
                  <TrendingUp className="w-3 h-3" />
                  Your Profit
                </div>
                <div className="text-2xl font-bold text-green-400">{formatCurrency(projectedReturn)}</div>
                <div className="text-xs text-gray-400 mt-1">{opp.projectedROI}% ROI</div>
              </div>

              <div className="bg-gradient-to-br from-orange-500/20 to-yellow-500/20 border-2 border-orange-500/50 rounded-lg p-4 text-center">
                <div className="text-orange-400 text-xs mb-1 uppercase font-semibold">Total Payout</div>
                <div className="text-2xl font-bold text-white">{formatCurrency(totalReturn)}</div>
                <div className="text-xs text-green-400 mt-1">+{formatCurrency(projectedReturn)} profit</div>
              </div>
            </div>
          </div>

          {/* Profit Growth Visualization */}
          <div className="grid grid-cols-2 gap-6 mb-6">
            {/* Growth Over Time Chart */}
            <div className="bg-black/50 border border-gray-700 rounded-lg p-5">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <LineChart className="w-5 h-5 text-green-400" />
                Investment Growth Over Time
              </h3>
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={generateGrowthData()}>
                  <defs>
                    <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="year" stroke="#9ca3af" />
                  <YAxis stroke="#9ca3af" tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #4b5563', borderRadius: '8px' }}
                    formatter={(value: any) => formatCurrency(value)}
                  />
                  <Area type="monotone" dataKey="totalValue" stroke="#10b981" fillOpacity={1} fill="url(#colorProfit)" />
                  <Area type="monotone" dataKey="investment" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.2} />
                </AreaChart>
              </ResponsiveContainer>
              <div className="flex items-center justify-center gap-6 mt-3 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded"></div>
                  <span className="text-gray-400">Total Value</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-blue-500 rounded"></div>
                  <span className="text-gray-400">Initial Investment</span>
                </div>
              </div>
            </div>

            {/* Payout Distribution Chart */}
            <div className="bg-black/50 border border-gray-700 rounded-lg p-5">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-blue-400" />
                {opp.payoutFrequency} Payout Distribution
              </h3>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={generatePayoutChartData()}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="period" stroke="#9ca3af" />
                  <YAxis stroke="#9ca3af" tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #4b5563', borderRadius: '8px' }}
                    formatter={(value: any) => formatCurrency(value)}
                  />
                  <Bar dataKey="payout" fill="#3b82f6" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Investment vs Profit Breakdown */}
          <div className="bg-black/50 border border-gray-700 rounded-lg p-5 mb-6">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <PieChart className="w-5 h-5 text-purple-400" />
              Return on Investment Breakdown
            </h3>
            <div className="flex items-center gap-8">
              <div className="flex-1">
                <ResponsiveContainer width="100%" height={200}>
                  <RechartsPie>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {pieData.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: any) => formatCurrency(value)} />
                  </RechartsPie>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 space-y-4">
                <div className="flex items-center justify-between p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-blue-500 rounded"></div>
                    <span className="text-gray-300">Your Investment</span>
                  </div>
                  <span className="text-white font-bold">{formatCurrency(investmentAmount)}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-green-500 rounded"></div>
                    <span className="text-gray-300">Projected Profit</span>
                  </div>
                  <span className="text-green-400 font-bold">{formatCurrency(projectedReturn)}</span>
                </div>
                <div className="p-3 bg-gradient-to-r from-orange-500/20 to-yellow-500/20 border-2 border-orange-500/50 rounded-lg">
                  <div className="text-orange-400 text-sm font-semibold mb-1">Total Return</div>
                  <div className="text-2xl font-bold text-white">{formatCurrency(totalReturn)}</div>
                  <div className="text-sm text-green-400 mt-1">+{((projectedReturn / investmentAmount) * 100).toFixed(1)}% Gain</div>
                </div>
              </div>
            </div>
          </div>

          {/* Project Financial Highlights */}
          {opp.financialHighlights && opp.financialHighlights.length > 0 && (
            <div className="bg-black/50 border border-gray-700 rounded-lg p-4 mb-6">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#ea580c]" />
                Project Financial Breakdown
              </h3>
              <div className="grid grid-cols-2 gap-4">
                {opp.financialHighlights.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between py-3 border-b border-gray-700">
                    <span className="text-gray-400">{item.label}</span>
                    <span className="text-white font-semibold text-lg">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Payout Schedule */}
          <div className="bg-black/50 border border-gray-700 rounded-lg p-4 mb-6">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-[#ea580c]" />
              Projected Payout Schedule
            </h3>
            <div className="text-sm text-gray-400 mb-4">
              Based on {formatCurrency(investmentAmount)} investment with {opp.projectedROI}% projected ROI
            </div>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {payoutSchedule.map((payment, index) => (
                <div
                  key={index}
                  className="p-3 rounded-lg border bg-blue-500/10 border-blue-500/30"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-blue-400" />
                      <span className="text-white font-semibold">{payment.period}</span>
                    </div>
                    <span className="text-blue-400 font-bold">{formatCurrency(payment.amount)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">Cumulative Return</span>
                    <span className="text-gray-300">{formatCurrency(payment.cumulative)} ({((payment.cumulative / projectedReturn) * 100).toFixed(1)}%)</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Investment Details */}
          <div className="bg-black/50 border border-gray-700 rounded-lg p-4 mb-6">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Target className="w-5 h-5 text-[#ea580c]" />
              Investment Details
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center justify-between py-2 border-b border-gray-700">
                <span className="text-gray-400">Investment Range</span>
                <span className="text-white font-semibold">{formatCurrency(opp.minInvestment)} - {formatCurrency(opp.maxInvestment)}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-gray-700">
                <span className="text-gray-400">Term</span>
                <span className="text-white font-semibold">{opp.term}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-gray-700">
                <span className="text-gray-400">Payout Frequency</span>
                <span className="text-white font-semibold">{opp.payoutFrequency}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-gray-700">
                <span className="text-gray-400">Risk Level</span>
                <span className={`font-semibold ${
                  opp.riskLevel === 'Low' ? 'text-green-400' :
                  opp.riskLevel === 'Medium' ? 'text-yellow-400' :
                  'text-red-400'
                }`}>{opp.riskLevel}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-gray-700">
                <span className="text-gray-400">Current Investors</span>
                <span className="text-white font-semibold">{opp.investors}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-gray-700">
                <span className="text-gray-400">Funding Status</span>
                <span className="text-green-400 font-semibold">{opp.funded}% Funded</span>
              </div>
            </div>
          </div>

          {/* Key Benefits Section */}
          {opp.keyFeatures && opp.keyFeatures.length > 0 && (
            <div className="bg-gradient-to-br from-green-900/30 to-emerald-900/30 border border-green-500/30 rounded-lg p-5 mb-6">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-400" />
                Why This Investment Makes Sense
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {opp.keyFeatures.map((feature, idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-300">{feature}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Social Proof */}
          <div className="bg-gradient-to-r from-blue-900/30 to-purple-900/30 border border-blue-500/30 rounded-lg p-5 mb-6">
            <div className="flex items-center justify-around">
              <div className="text-center">
                <div className="text-3xl font-bold text-white mb-1">{opp.investors}</div>
                <div className="text-sm text-gray-400 flex items-center gap-1 justify-center">
                  <Users className="w-4 h-4" />
                  Active Investors
                </div>
              </div>
              <div className="w-px h-12 bg-gray-600"></div>
              <div className="text-center">
                <div className="text-3xl font-bold text-green-400 mb-1">{opp.funded}%</div>
                <div className="text-sm text-gray-400">Funded</div>
              </div>
              <div className="w-px h-12 bg-gray-600"></div>
              <div className="text-center">
                <div className="text-3xl font-bold text-orange-400 mb-1">{opp.projectedROI}%</div>
                <div className="text-sm text-gray-400">Projected ROI</div>
              </div>
            </div>
          </div>

          {/* Call to Action */}
          <div className="bg-gradient-to-r from-orange-600 to-red-600 rounded-xl p-6 mb-6 text-center">
            <h3 className="text-2xl font-bold text-white mb-2">Ready to Start Earning?</h3>
            <p className="text-white/90 mb-4">
              Join {opp.investors} investors already profiting from this opportunity. Limited spots available.
            </p>
            <button
              onClick={() => {
                if (onNavigate) {
                  onNavigate(`investor-application?opportunity=${opp.id}`);
                } else {
                  window.location.href = `/investor-application?opportunity=${opp.id}`;
                }
              }}
              className="bg-white text-orange-600 px-8 py-3 rounded-lg font-bold text-lg hover:bg-gray-100 transition-colors"
            >
              Invest Now - {formatCurrency(investmentAmount)}
            </button>
          </div>

          {/* Footer Disclaimer */}
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
            <p className="text-yellow-300 text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>
                <strong>Important Notice:</strong> This is not an offer to sell securities. All investments are subject to risks and regulatory approval. Past performance does not guarantee future results. Projected returns are estimates and not guaranteed.
              </span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function AlertCircle({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
    </svg>
  );
}
