/**
 * Investment Prospectus - Comprehensive investment opportunity presentation
 * Includes profit calculator, charts, visuals, and detailed breakdown
 */

import { useState } from 'react';
import { X, DollarSign, TrendingUp, Calendar, Target, Users, MapPin, Building2, ArrowRight, Calculator, PieChart, BarChart3, TrendingDown, Shield, CheckCircle, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart as RePieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

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
  image?: string;
  keyFeatures?: string[];
  financialHighlights?: { label: string; value: string; }[];
  riskLevel?: string;
  marketOverview?: string;
  exitStrategy?: string;
}

interface InvestmentProspectusProps {
  opportunity: Opportunity;
  onClose: () => void;
}

export function InvestmentProspectus({ opportunity: opp, onClose }: InvestmentProspectusProps) {
  const [calculatorAmount, setCalculatorAmount] = useState(opp.minInvestment);
  const [expandedSection, setExpandedSection] = useState<string | null>('calculator');

  // Calculate projections
  const calculateProjections = (amount: number) => {
    const projectedReturn = (amount * opp.projectedROI) / 100;
    const totalPayout = amount + projectedReturn;
    const years = parseInt(opp.term) || 3;

    // Generate year-by-year projections
    const yearlyProjections = Array.from({ length: years }, (_, i) => ({
      year: `Year ${i + 1}`,
      investment: amount,
      value: amount + (projectedReturn / years) * (i + 1),
      return: (projectedReturn / years) * (i + 1),
      roi: ((projectedReturn / years) * (i + 1) / amount) * 100
    }));

    // Generate payout schedule
    let payoutSchedule: any[] = [];
    if (opp.payoutFrequency.toLowerCase().includes('quarterly')) {
      const quarterlyPayout = projectedReturn / (years * 4);
      payoutSchedule = Array.from({ length: years * 4 }, (_, i) => ({
        period: `Q${(i % 4) + 1} ${Math.floor(i / 4) + 1}`,
        amount: quarterlyPayout
      }));
    } else if (opp.payoutFrequency.toLowerCase().includes('monthly')) {
      const monthlyPayout = projectedReturn / (years * 12);
      payoutSchedule = Array.from({ length: 12 }, (_, i) => ({
        period: `Month ${i + 1}`,
        amount: monthlyPayout
      }));
    } else {
      payoutSchedule = Array.from({ length: years }, (_, i) => ({
        period: `Year ${i + 1}`,
        amount: projectedReturn / years
      }));
    }

    return {
      initialInvestment: amount,
      projectedReturn,
      totalPayout,
      roi: opp.projectedROI,
      yearlyProjections,
      payoutSchedule
    };
  };

  const projections = calculateProjections(calculatorAmount);

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Investment breakdown pie chart data
  const investmentBreakdown = [
    { name: 'Initial Investment', value: projections.initialInvestment, color: '#3b82f6' },
    { name: 'Projected Returns', value: projections.projectedReturn, color: '#10b981' }
  ];

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 overflow-y-auto">
      <div className="bg-[#0A0A0A] w-full min-h-screen">
        {/* Header with Hero Image */}
        <div className="relative h-96 bg-gradient-to-br from-[#1A1A1A] to-[#0A0A0A]">
          {opp.image && (
            <div className="absolute inset-0">
              <img
                src={opp.image}
                alt={opp.title}
                className="w-full h-full object-cover opacity-40"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A] via-[#0A0A0A]/80 to-transparent" />
            </div>
          )}

          <div className="relative h-full max-w-7xl mx-auto px-6 flex flex-col justify-end pb-12">
            <button
              onClick={onClose}
              className="absolute top-6 right-6 p-3 bg-black/50 hover:bg-black/70 rounded-full transition-colors"
            >
              <X className="w-6 h-6 text-white" />
            </button>

            {opp.highlight && (
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-500 to-red-500 rounded-full mb-4 w-fit">
                <span className="text-sm font-bold text-white uppercase">{opp.highlight}</span>
              </div>
            )}

            <h1 className="text-6xl font-bold text-white mb-4">{opp.title}</h1>

            <div className="flex items-center gap-6 text-gray-300">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-orange-400" />
                <span className="font-semibold">{opp.category}</span>
              </div>
              {opp.location && (
                <div className="flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-orange-400" />
                  <span>{opp.location}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-orange-400" />
                <span>{opp.investors} Investors</span>
              </div>
            </div>

            {/* Quick Stats Bar */}
            <div className="grid grid-cols-4 gap-4 mt-8">
              <div className="bg-black/60 backdrop-blur-sm border border-[#2A2A2A] rounded-xl p-4">
                <div className="text-gray-400 text-sm mb-1">Projected ROI</div>
                <div className="text-3xl font-bold text-green-400">{opp.projectedROI}%</div>
              </div>
              <div className="bg-black/60 backdrop-blur-sm border border-[#2A2A2A] rounded-xl p-4">
                <div className="text-gray-400 text-sm mb-1">Min Investment</div>
                <div className="text-3xl font-bold text-white">{formatCurrency(opp.minInvestment)}</div>
              </div>
              <div className="bg-black/60 backdrop-blur-sm border border-[#2A2A2A] rounded-xl p-4">
                <div className="text-gray-400 text-sm mb-1">Investment Term</div>
                <div className="text-3xl font-bold text-white">{opp.term}</div>
              </div>
              <div className="bg-black/60 backdrop-blur-sm border border-[#2A2A2A] rounded-xl p-4">
                <div className="text-gray-400 text-sm mb-1">Funding Status</div>
                <div className="text-3xl font-bold text-orange-400">{opp.funded}%</div>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-7xl mx-auto px-6 py-12">
          {/* Interactive Profit Calculator */}
          <div className="bg-gradient-to-br from-orange-500/10 to-red-500/10 border-2 border-orange-500/50 rounded-2xl p-8 mb-12 shadow-2xl shadow-orange-500/20">
            <button
              onClick={() => toggleSection('calculator')}
              className="w-full flex items-center justify-between mb-6"
            >
              <div className="flex items-center gap-3">
                <Calculator className="w-8 h-8 text-orange-400" />
                <h2 className="text-3xl font-bold text-white">Investment Profit Calculator</h2>
              </div>
              {expandedSection === 'calculator' ? (
                <ChevronUp className="w-6 h-6 text-orange-400" />
              ) : (
                <ChevronDown className="w-6 h-6 text-orange-400" />
              )}
            </button>

            {expandedSection === 'calculator' && (
              <>
                <p className="text-gray-300 mb-8 text-lg">
                  See how much you can earn with different investment amounts. Adjust the slider to calculate your projected returns.
                </p>

                {/* Investment Amount Slider */}
                <div className="mb-8">
                  <div className="flex items-center justify-between mb-4">
                    <label className="text-lg font-semibold text-white">Investment Amount</label>
                    <div className="text-3xl font-bold text-orange-400">{formatCurrency(calculatorAmount)}</div>
                  </div>
                  <input
                    type="range"
                    min={opp.minInvestment}
                    max={opp.maxInvestment}
                    step={10000}
                    value={calculatorAmount}
                    onChange={(e) => setCalculatorAmount(parseInt(e.target.value))}
                    className="w-full h-3 bg-[#1A1A1A] rounded-lg appearance-none cursor-pointer"
                    style={{
                      background: `linear-gradient(to right, #ea580c 0%, #ea580c ${((calculatorAmount - opp.minInvestment) / (opp.maxInvestment - opp.minInvestment)) * 100}%, #1A1A1A ${((calculatorAmount - opp.minInvestment) / (opp.maxInvestment - opp.minInvestment)) * 100}%, #1A1A1A 100%)`
                    }}
                  />
                  <div className="flex justify-between text-sm text-gray-500 mt-2">
                    <span>{formatCurrency(opp.minInvestment)}</span>
                    <span>{formatCurrency(opp.maxInvestment)}</span>
                  </div>
                </div>

                {/* Calculation Results */}
                <div className="grid grid-cols-3 gap-6 mb-8">
                  <div className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl p-6">
                    <div className="text-gray-400 text-sm mb-2">Your Investment</div>
                    <div className="text-3xl font-bold text-white mb-2">{formatCurrency(projections.initialInvestment)}</div>
                    <div className="text-sm text-gray-500">Initial capital</div>
                  </div>

                  <div className="bg-[#0A0A0A] border border-green-500/30 rounded-xl p-6">
                    <div className="text-green-400 text-sm mb-2">Projected Return</div>
                    <div className="text-3xl font-bold text-green-400 mb-2">{formatCurrency(projections.projectedReturn)}</div>
                    <div className="text-sm text-gray-500">{opp.projectedROI}% ROI over {opp.term}</div>
                  </div>

                  <div className="bg-gradient-to-br from-orange-500 to-red-500 rounded-xl p-6">
                    <div className="text-white/80 text-sm mb-2">Total Payout</div>
                    <div className="text-3xl font-bold text-white mb-2">{formatCurrency(projections.totalPayout)}</div>
                    <div className="text-sm text-white/70">Investment + Returns</div>
                  </div>
                </div>

                {/* Growth Chart */}
                <div className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl p-6">
                  <h3 className="text-xl font-bold text-white mb-6">Projected Investment Growth</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={projections.yearlyProjections}>
                      <defs>
                        <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#2A2A2A" />
                      <XAxis dataKey="year" stroke="#9ca3af" />
                      <YAxis stroke="#9ca3af" tickFormatter={(value) => `$${(value / 1000)}K`} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#1A1A1A', border: '1px solid #2A2A2A', borderRadius: '8px' }}
                        formatter={(value: any) => formatCurrency(value)}
                      />
                      <Area type="monotone" dataKey="value" stroke="#10b981" fillOpacity={1} fill="url(#colorValue)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </>
            )}
          </div>

          {/* Project Financial Breakdown */}
          <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-8 mb-12">
            <button
              onClick={() => toggleSection('breakdown')}
              className="w-full flex items-center justify-between mb-6"
            >
              <div className="flex items-center gap-3">
                <BarChart3 className="w-8 h-8 text-orange-400" />
                <h2 className="text-3xl font-bold text-white">Project Financial Breakdown</h2>
              </div>
              {expandedSection === 'breakdown' ? (
                <ChevronUp className="w-6 h-6 text-orange-400" />
              ) : (
                <ChevronDown className="w-6 h-6 text-orange-400" />
              )}
            </button>

            {expandedSection === 'breakdown' && opp.financialHighlights && (
              <div className="grid grid-cols-2 gap-6">
                {opp.financialHighlights.map((item, idx) => (
                  <div key={idx} className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl p-6">
                    <div className="text-gray-400 text-sm mb-2">{item.label}</div>
                    <div className="text-2xl font-bold text-white">{item.value}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Payout Schedule */}
          <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-8 mb-12">
            <button
              onClick={() => toggleSection('payout')}
              className="w-full flex items-center justify-between mb-6"
            >
              <div className="flex items-center gap-3">
                <Calendar className="w-8 h-8 text-orange-400" />
                <h2 className="text-3xl font-bold text-white">Payout Schedule</h2>
              </div>
              {expandedSection === 'payout' ? (
                <ChevronUp className="w-6 h-6 text-orange-400" />
              ) : (
                <ChevronDown className="w-6 h-6 text-orange-400" />
              )}
            </button>

            {expandedSection === 'payout' && (
              <>
                <p className="text-gray-400 mb-6">
                  Based on {formatCurrency(calculatorAmount)} investment - {opp.payoutFrequency} distributions
                </p>
                <div className="grid grid-cols-4 gap-4">
                  {projections.payoutSchedule.slice(0, 12).map((payout, idx) => (
                    <div key={idx} className="bg-[#0A0A0A] border border-blue-500/30 rounded-lg p-4">
                      <div className="text-blue-400 text-sm mb-1">{payout.period}</div>
                      <div className="text-lg font-bold text-white">{formatCurrency(payout.amount)}</div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Key Features */}
          {opp.keyFeatures && opp.keyFeatures.length > 0 && (
            <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-8 mb-12">
              <div className="flex items-center gap-3 mb-6">
                <CheckCircle className="w-8 h-8 text-green-400" />
                <h2 className="text-3xl font-bold text-white">Key Investment Highlights</h2>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {opp.keyFeatures.map((feature, idx) => (
                  <div key={idx} className="flex items-start gap-3 p-4 bg-[#0A0A0A] border border-green-500/20 rounded-lg">
                    <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-300">{feature}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Market Overview & Exit Strategy */}
          <div className="grid grid-cols-2 gap-6 mb-12">
            {opp.marketOverview && (
              <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-8">
                <div className="flex items-center gap-3 mb-4">
                  <TrendingUp className="w-6 h-6 text-blue-400" />
                  <h3 className="text-2xl font-bold text-white">Market Overview</h3>
                </div>
                <p className="text-gray-300 leading-relaxed">{opp.marketOverview}</p>
              </div>
            )}

            {opp.exitStrategy && (
              <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-8">
                <div className="flex items-center gap-3 mb-4">
                  <Target className="w-6 h-6 text-orange-400" />
                  <h3 className="text-2xl font-bold text-white">Exit Strategy</h3>
                </div>
                <p className="text-gray-300 leading-relaxed">{opp.exitStrategy}</p>
              </div>
            )}
          </div>

          {/* Risk Assessment */}
          <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-8 mb-12">
            <div className="flex items-center gap-3 mb-6">
              <Shield className="w-8 h-8 text-yellow-400" />
              <h2 className="text-3xl font-bold text-white">Risk Assessment</h2>
            </div>
            <div className="flex items-center gap-4 mb-6">
              <div className="text-lg text-gray-400">Risk Level:</div>
              <div className={`px-6 py-2 rounded-lg text-xl font-bold ${
                opp.riskLevel === 'Low' ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
                opp.riskLevel === 'Medium' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' :
                'bg-red-500/20 text-red-400 border border-red-500/30'
              }`}>
                {opp.riskLevel}
              </div>
            </div>
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-6">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-6 h-6 text-yellow-400 flex-shrink-0 mt-1" />
                <div>
                  <p className="text-yellow-300 font-semibold mb-2">Important Investment Notice</p>
                  <p className="text-gray-400 text-sm leading-relaxed">
                    All investments carry risk. Past performance does not guarantee future results. This is not an offer to sell securities.
                    All investments are subject to regulatory approval and accreditation requirements. Please consult with a financial advisor
                    before making any investment decisions.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Call to Action */}
          <div className="bg-gradient-to-r from-orange-500 to-red-500 rounded-2xl p-12 text-center">
            <h2 className="text-4xl font-bold text-white mb-4">Ready to Invest?</h2>
            <p className="text-white/90 text-xl mb-8">
              Join {opp.investors} investors who are already building wealth with this opportunity
            </p>
            <button className="px-12 py-5 bg-white hover:bg-gray-100 text-black rounded-xl text-xl font-bold transition-all shadow-2xl flex items-center gap-3 mx-auto">
              Apply to Invest {formatCurrency(calculatorAmount)}
              <ArrowRight className="w-6 h-6" />
            </button>
            <p className="text-white/70 text-sm mt-6">
              Projected total return: {formatCurrency(projections.totalPayout)} ({opp.projectedROI}% ROI)
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
