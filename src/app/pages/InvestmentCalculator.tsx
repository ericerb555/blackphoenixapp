/**
 * Investment Opportunity Calculator
 * Detailed form showing returns, timelines, profit breakdowns, and payout schedules
 */

import { useState } from 'react';
import {
  DollarSign, TrendingUp, Calendar, Users, PieChart, Calculator,
  ArrowRight, Clock, Award, Shield, AlertCircle, CheckCircle,
  Download, Printer, Share2, Info
} from 'lucide-react';

interface InvestmentCalculatorProps {
  onNavigate?: (page: string) => void;
}

interface InvestmentBreakdown {
  investmentAmount: number;
  totalReturn: number;
  netProfit: number;
  roi: number;
  monthlyReturn: number;
  annualReturn: number;
  payoutSchedule: PayoutPeriod[];
  profitDistribution: ProfitBreakdown;
}

interface PayoutPeriod {
  period: number;
  date: string;
  amount: number;
  cumulativeAmount: number;
  description: string;
}

interface ProfitBreakdown {
  operatingCosts: number;
  laborCosts: number;
  materialCosts: number;
  overheadCosts: number;
  platformFee: number;
  netProfit: number;
  investorShare: number;
  companyShare: number;
}

export default function InvestmentCalculator({ onNavigate }: InvestmentCalculatorProps) {
  const [investmentAmount, setInvestmentAmount] = useState<number>(10000);
  const [investmentTier, setInvestmentTier] = useState<string>('standard');
  const [investmentDuration, setInvestmentDuration] = useState<number>(12); // months
  const [projectType, setProjectType] = useState<string>('residential');

  // Investment Tiers with different ROI rates
  const investmentTiers = {
    standard: {
      name: 'Standard',
      minInvestment: 5000,
      maxInvestment: 24999,
      roiRate: 0.15, // 15% annual
      investorSharePercent: 65,
      description: 'Entry-level investment tier'
    },
    premium: {
      name: 'Premium',
      minInvestment: 25000,
      maxInvestment: 99999,
      roiRate: 0.20, // 20% annual
      investorSharePercent: 70,
      description: 'Enhanced returns for larger investments'
    },
    elite: {
      name: 'Elite',
      minInvestment: 100000,
      maxInvestment: 999999,
      roiRate: 0.25, // 25% annual
      investorSharePercent: 75,
      description: 'Premium tier with highest returns'
    },
  };

  // Project Types with different profit margins
  const projectTypes = {
    residential: {
      name: 'Residential Construction',
      avgProjectValue: 250000,
      profitMargin: 0.30,
      operatingCostPercent: 0.15,
      laborCostPercent: 0.35,
      materialCostPercent: 0.40,
      overheadPercent: 0.05,
      platformFeePercent: 0.05,
      avgDuration: 6, // months
      description: 'Home building and renovation projects'
    },
    commercial: {
      name: 'Commercial Construction',
      avgProjectValue: 750000,
      profitMargin: 0.25,
      operatingCostPercent: 0.12,
      laborCostPercent: 0.38,
      materialCostPercent: 0.42,
      overheadPercent: 0.03,
      platformFeePercent: 0.05,
      avgDuration: 12,
      description: 'Office buildings, retail spaces'
    },
    infrastructure: {
      name: 'Infrastructure Projects',
      avgProjectValue: 1500000,
      profitMargin: 0.20,
      operatingCostPercent: 0.10,
      laborCostPercent: 0.40,
      materialCostPercent: 0.45,
      overheadPercent: 0.02,
      platformFeePercent: 0.03,
      avgDuration: 18,
      description: 'Roads, bridges, public works'
    },
  };

  const currentTier = investmentTiers[investmentTier as keyof typeof investmentTiers];
  const currentProject = projectTypes[projectType as keyof typeof projectTypes];

  // Calculate investment breakdown
  const calculateInvestment = (): InvestmentBreakdown => {
    const annualROI = investmentAmount * currentTier.roiRate;
    const totalReturn = investmentAmount + (annualROI * (investmentDuration / 12));
    const netProfit = totalReturn - investmentAmount;
    const roi = (netProfit / investmentAmount) * 100;
    const monthlyReturn = netProfit / investmentDuration;
    const annualReturn = annualROI;

    // Calculate profit distribution based on project
    const projectRevenue = investmentAmount * 2.5; // Assume investment generates 2.5x in project revenue
    const grossProfit = projectRevenue * currentProject.profitMargin;

    const operatingCosts = projectRevenue * currentProject.operatingCostPercent;
    const laborCosts = projectRevenue * currentProject.laborCostPercent;
    const materialCosts = projectRevenue * currentProject.materialCostPercent;
    const overheadCosts = projectRevenue * currentProject.overheadPercent;
    const platformFee = grossProfit * currentProject.platformFeePercent;

    const netProfitFromProject = grossProfit - platformFee;
    const investorShare = netProfitFromProject * (currentTier.investorSharePercent / 100);
    const companyShare = netProfitFromProject - investorShare;

    // Generate payout schedule (monthly)
    const payoutSchedule: PayoutPeriod[] = [];
    let cumulativeAmount = 0;
    const monthlyPayout = netProfit / investmentDuration;

    for (let i = 1; i <= investmentDuration; i++) {
      const payoutDate = new Date();
      payoutDate.setMonth(payoutDate.getMonth() + i);

      cumulativeAmount += monthlyPayout;

      payoutSchedule.push({
        period: i,
        date: payoutDate.toLocaleDateString(),
        amount: monthlyPayout,
        cumulativeAmount: cumulativeAmount,
        description: i === investmentDuration ? 'Final payment + principal return' : 'Monthly return payment'
      });
    }

    return {
      investmentAmount,
      totalReturn,
      netProfit,
      roi,
      monthlyReturn,
      annualReturn,
      payoutSchedule,
      profitDistribution: {
        operatingCosts,
        laborCosts,
        materialCosts,
        overheadCosts,
        platformFee,
        netProfit: netProfitFromProject,
        investorShare,
        companyShare,
      }
    };
  };

  const breakdown = calculateInvestment();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatPercent = (value: number) => {
    return `${value.toFixed(2)}%`;
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Investment Opportunity Calculator</h1>
          <p className="text-gray-600">Detailed breakdown of returns, timelines, and profit distribution</p>
        </div>

        <div className="grid grid-cols-3 gap-6">
          {/* Left Column - Investment Inputs */}
          <div className="space-y-6">
            {/* Investment Amount */}
            <div className="bg-[#1A1A1A] rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-green-600" />
                Investment Amount
              </h2>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Amount ($)
                </label>
                <input
                  type="number"
                  value={investmentAmount}
                  onChange={(e) => setInvestmentAmount(Number(e.target.value))}
                  min={5000}
                  step={1000}
                  className="w-full px-4 py-2 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <div className="flex items-center gap-2 mt-2">
                  <button
                    onClick={() => setInvestmentAmount(10000)}
                    className="px-3 py-1 text-sm bg-[#2A2A2A] hover:bg-[#3A3A3A] rounded"
                  >
                    $10K
                  </button>
                  <button
                    onClick={() => setInvestmentAmount(50000)}
                    className="px-3 py-1 text-sm bg-[#2A2A2A] hover:bg-[#3A3A3A] rounded"
                  >
                    $50K
                  </button>
                  <button
                    onClick={() => setInvestmentAmount(100000)}
                    className="px-3 py-1 text-sm bg-[#2A2A2A] hover:bg-[#3A3A3A] rounded"
                  >
                    $100K
                  </button>
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Investment Tier
                </label>
                <select
                  value={investmentTier}
                  onChange={(e) => setInvestmentTier(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="standard">Standard (15% ROI)</option>
                  <option value="premium">Premium (20% ROI)</option>
                  <option value="elite">Elite (25% ROI)</option>
                </select>
                <p className="text-sm text-gray-500 mt-1">{currentTier.description}</p>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Duration (Months)
                </label>
                <input
                  type="number"
                  value={investmentDuration}
                  onChange={(e) => setInvestmentDuration(Number(e.target.value))}
                  min={6}
                  max={36}
                  className="w-full px-4 py-2 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Project Type
                </label>
                <select
                  value={projectType}
                  onChange={(e) => setProjectType(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="residential">Residential Construction</option>
                  <option value="commercial">Commercial Construction</option>
                  <option value="infrastructure">Infrastructure Projects</option>
                </select>
                <p className="text-sm text-gray-500 mt-1">{currentProject.description}</p>
              </div>
            </div>

            {/* Key Metrics */}
            <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg shadow p-6 text-white">
              <h3 className="text-lg font-semibold mb-4">Investment Summary</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-blue-100">Total Investment</span>
                  <span className="font-bold">{formatCurrency(breakdown.investmentAmount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-blue-100">Total Return</span>
                  <span className="font-bold">{formatCurrency(breakdown.totalReturn)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-blue-100">Net Profit</span>
                  <span className="font-bold text-green-300">{formatCurrency(breakdown.netProfit)}</span>
                </div>
                <div className="border-t border-blue-500 pt-3 mt-3">
                  <div className="flex justify-between">
                    <span className="text-blue-100">ROI</span>
                    <span className="font-bold text-xl">{formatPercent(breakdown.roi)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Middle Column - Returns & Timeline */}
          <div className="space-y-6">
            {/* Returns Breakdown */}
            <div className="bg-[#1A1A1A] rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-green-600" />
                Returns Breakdown
              </h2>

              <div className="space-y-4">
                <div className="border-l-4 border-green-500 pl-4">
                  <p className="text-sm text-gray-600">Monthly Return</p>
                  <p className="text-2xl font-bold text-white">{formatCurrency(breakdown.monthlyReturn)}</p>
                  <p className="text-sm text-gray-500">Paid at the end of each month</p>
                </div>

                <div className="border-l-4 border-blue-500 pl-4">
                  <p className="text-sm text-gray-600">Annual Return</p>
                  <p className="text-2xl font-bold text-white">{formatCurrency(breakdown.annualReturn)}</p>
                  <p className="text-sm text-gray-500">{formatPercent(currentTier.roiRate * 100)} annual ROI</p>
                </div>

                <div className="border-l-4 border-purple-500 pl-4">
                  <p className="text-sm text-gray-600">Investment Period</p>
                  <p className="text-2xl font-bold text-white">{investmentDuration} months</p>
                  <p className="text-sm text-gray-500">
                    {new Date().toLocaleDateString()} - {new Date(Date.now() + investmentDuration * 30 * 24 * 60 * 60 * 1000).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>

            {/* How Money is Made */}
            <div className="bg-[#1A1A1A] rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Calculator className="w-5 h-5 text-purple-600" />
                How Profits Are Generated
              </h2>

              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-bold text-blue-600">1</span>
                  </div>
                  <div>
                    <p className="font-medium text-white">Investment Deployed</p>
                    <p className="text-sm text-gray-600">Your {formatCurrency(investmentAmount)} is allocated to {currentProject.name.toLowerCase()}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-bold text-blue-600">2</span>
                  </div>
                  <div>
                    <p className="font-medium text-white">Project Execution</p>
                    <p className="text-sm text-gray-600">Construction work generates {formatCurrency(investmentAmount * 2.5)} in project revenue</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-bold text-blue-600">3</span>
                  </div>
                  <div>
                    <p className="font-medium text-white">Operating Costs Paid</p>
                    <p className="text-sm text-gray-600">Labor ({formatPercent(currentProject.laborCostPercent * 100)}), Materials ({formatPercent(currentProject.materialCostPercent * 100)}), Overhead ({formatPercent(currentProject.overheadPercent * 100)})</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-bold text-green-600">4</span>
                  </div>
                  <div>
                    <p className="font-medium text-white">Profit Distribution</p>
                    <p className="text-sm text-gray-600">Net profit split: {currentTier.investorSharePercent}% to investors, {100 - currentTier.investorSharePercent}% to company</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-bold text-purple-600">5</span>
                  </div>
                  <div>
                    <p className="font-medium text-white">Monthly Payouts</p>
                    <p className="text-sm text-gray-600">You receive {formatCurrency(breakdown.monthlyReturn)}/month for {investmentDuration} months</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Risk Factors */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-6">
              <h3 className="font-semibold text-amber-900 flex items-center gap-2 mb-3">
                <Shield className="w-5 h-5" />
                Risk Considerations
              </h3>
              <ul className="space-y-2 text-sm text-amber-800">
                <li className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>Project delays may extend payout timeline</span>
                </li>
                <li className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>Material cost fluctuations may affect returns</span>
                </li>
                <li className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>Returns are projected and not guaranteed</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Right Column - Profit Distribution & Payout Schedule */}
          <div className="space-y-6">
            {/* Profit Distribution */}
            <div className="bg-[#1A1A1A] rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <PieChart className="w-5 h-5 text-blue-600" />
                Profit Distribution
              </h2>

              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">Labor Costs</span>
                    <span className="font-medium">{formatCurrency(breakdown.profitDistribution.laborCosts)}</span>
                  </div>
                  <div className="w-full bg-[#3A3A3A] rounded-full h-2">
                    <div className="bg-red-500 h-2 rounded-full" style={{ width: `${currentProject.laborCostPercent * 100}%` }}></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">Material Costs</span>
                    <span className="font-medium">{formatCurrency(breakdown.profitDistribution.materialCosts)}</span>
                  </div>
                  <div className="w-full bg-[#3A3A3A] rounded-full h-2">
                    <div className="bg-orange-500 h-2 rounded-full" style={{ width: `${currentProject.materialCostPercent * 100}%` }}></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">Operating Costs</span>
                    <span className="font-medium">{formatCurrency(breakdown.profitDistribution.operatingCosts)}</span>
                  </div>
                  <div className="w-full bg-[#3A3A3A] rounded-full h-2">
                    <div className="bg-yellow-500 h-2 rounded-full" style={{ width: `${currentProject.operatingCostPercent * 100}%` }}></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">Overhead</span>
                    <span className="font-medium">{formatCurrency(breakdown.profitDistribution.overheadCosts)}</span>
                  </div>
                  <div className="w-full bg-[#3A3A3A] rounded-full h-2">
                    <div className="bg-gray-500 h-2 rounded-full" style={{ width: `${currentProject.overheadPercent * 100}%` }}></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">Platform Fee</span>
                    <span className="font-medium">{formatCurrency(breakdown.profitDistribution.platformFee)}</span>
                  </div>
                  <div className="w-full bg-[#3A3A3A] rounded-full h-2">
                    <div className="bg-purple-500 h-2 rounded-full" style={{ width: `${currentProject.platformFeePercent * 100}%` }}></div>
                  </div>
                </div>

                <div className="border-t pt-3 mt-3">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600 font-semibold">Your Share ({currentTier.investorSharePercent}%)</span>
                    <span className="font-bold text-green-600">{formatCurrency(breakdown.profitDistribution.investorShare)}</span>
                  </div>
                  <div className="w-full bg-[#3A3A3A] rounded-full h-2">
                    <div className="bg-green-600 h-2 rounded-full" style={{ width: `${currentTier.investorSharePercent}%` }}></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">Company Share ({100 - currentTier.investorSharePercent}%)</span>
                    <span className="font-medium">{formatCurrency(breakdown.profitDistribution.companyShare)}</span>
                  </div>
                  <div className="w-full bg-[#3A3A3A] rounded-full h-2">
                    <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${100 - currentTier.investorSharePercent}%` }}></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Payout Schedule */}
            <div className="bg-[#1A1A1A] rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-purple-600" />
                Payout Schedule
              </h2>

              <div className="max-h-96 overflow-y-auto space-y-2">
                {breakdown.payoutSchedule.map((payout) => (
                  <div
                    key={payout.period}
                    className="border rounded-lg p-3 hover:bg-[#2A2A2A]"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-white">
                        Month {payout.period}
                      </span>
                      <span className="text-sm font-bold text-green-600">
                        {formatCurrency(payout.amount)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm text-gray-500">
                      <span>{payout.date}</span>
                      <span>Total: {formatCurrency(payout.cumulativeAmount)}</span>
                    </div>
                    {payout.period === investmentDuration && (
                      <p className="text-sm text-blue-600 mt-1 flex items-center gap-1">
                        <Award className="w-3 h-3" />
                        {payout.description}
                      </p>
                    )}
                  </div>
                ))}
              </div>

              <div className="mt-4 pt-4 border-t">
                <div className="flex justify-between font-semibold">
                  <span>Total Payout</span>
                  <span className="text-green-600">{formatCurrency(breakdown.totalReturn)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-8 flex items-center justify-between bg-[#1A1A1A] rounded-lg shadow p-6">
          <div className="flex items-center gap-4">
            <button className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 font-semibold">
              <CheckCircle className="w-5 h-5" />
              Proceed with Investment
            </button>
            <button className="px-6 py-3 border border-gray-700 text-gray-300 rounded-lg hover:bg-[#2A2A2A] flex items-center gap-2">
              <Download className="w-5 h-5" />
              Download PDF
            </button>
            <button className="px-6 py-3 border border-gray-700 text-gray-300 rounded-lg hover:bg-[#2A2A2A] flex items-center gap-2">
              <Printer className="w-5 h-5" />
              Print
            </button>
          </div>

          <button
            onClick={() => onNavigate?.('unified-dashboard')}
            className="px-4 py-2 text-gray-600 hover:text-white"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
