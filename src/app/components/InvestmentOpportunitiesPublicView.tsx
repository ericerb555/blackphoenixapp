import { useState, useEffect } from 'react';
import {
  DollarSign, TrendingUp, Users, Calendar, Target, AlertCircle,
  ArrowRight, Building2, CheckCircle, Loader2, Download, FileText,
  Shield, Award, BarChart3, Clock, MapPin, Star, ExternalLink,
  Info, Percent, LineChart, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { InvestmentDataSheet } from './InvestmentDataSheet';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { authedHeadersOrAnon } from "../utils/authHeaders";

const SERVER = `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6`;

// Server stores opportunities in snake_case; the view uses camelCase.
function fromServer(opp: any): any {
  return {
    id: opp.id,
    title: opp.title,
    category: opp.category,
    minInvestment: Number(opp.min_investment),
    maxInvestment: Number(opp.max_investment),
    projectedROI: Number(opp.projected_roi),
    term: opp.term,
    payoutFrequency: opp.payout_frequency,
    status: opp.status,
    investors: opp.investors,
    funded: Number(opp.funded),
    targetRaise: Number(opp.target_raise),
    currentCommitments: Number(opp.current_commitments),
    minimumToStart: opp.minimum_to_start != null ? Number(opp.minimum_to_start) : undefined,
    highlight: opp.highlight,
    silentInvestment: opp.silent_investment,
    needsMoreFunding: opp.needs_more_funding,
    projectDetails: opp.project_details,
  };
}

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
  location?: string;
  propertyType?: string;
  image?: string;
  keyFeatures?: string[];
  financialHighlights?: {
    label: string;
    value: string;
  }[];
  riskLevel?: 'Low' | 'Medium' | 'High';
  marketOverview?: string;
  exitStrategy?: string;
}

interface InvestmentOpportunitiesPublicViewProps {
  onNavigate?: (page: string) => void;
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
    payoutFrequency: 'Quarterly',
    status: 'open',
    investors: 12,
    funded: 45,
    targetRaise: 5000000,
    currentCommitments: 2250000,
    highlight: 'Passive Income',
    silentInvestment: false,
    needsMoreFunding: false,
    location: 'Nationwide',
    image: 'https://images.unsplash.com/photo-1759310610325-2c7cb621e5e3?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxidXNpbmVzcyUyMHBhcnRuZXJzaGlwJTIwaGFuZHNoYWtlJTIwb2ZmaWNlfGVufDF8fHx8MTc3ODU3NDA2Mnww&ixlib=rb-4.1.0&q=80&w=1080',
    keyFeatures: [
      'Quarterly dividend payments',
      'Revenue share from growing contractor network',
      'Diversified income streams',
      'Professional management team'
    ],
    financialHighlights: [
      { label: 'Target Raise', value: '$5,000,000' },
      { label: 'Current Commitments', value: '$2,250,000' },
      { label: 'Min Investment', value: '$100,000' },
      { label: 'Projected IRR', value: '24% annually' }
    ],
    riskLevel: 'Medium',
    marketOverview: 'Contractor services market growing at 5.2% CAGR with strong demand across residential and commercial sectors.',
    exitStrategy: 'Buyback option after 3 years or continue quarterly distributions'
  },
  {
    id: 'PROP-025',
    title: 'Salem NH Fix & Flip Portfolio',
    category: 'Value-Add',
    minInvestment: 50000,
    maxInvestment: 500000,
    projectedROI: 35,
    term: '18 months',
    payoutFrequency: 'Project Completion',
    status: 'open',
    investors: 15,
    funded: 88,
    targetRaise: 3500000,
    currentCommitments: 3080000,
    needsMoreFunding: true,
    silentInvestment: true,
    highlight: 'Quick Returns',
    location: 'Salem, NH',
    propertyType: 'Single Family Residential',
    image: 'https://images.unsplash.com/photo-1777115470242-9b21d2c67729?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxob3VzZSUyMHJlbm92YXRpb24lMjBjb25zdHJ1Y3Rpb24lMjBtb2Rlcm4lMjBob21lfGVufDF8fHx8MTc3ODYzNjQ4M3ww&ixlib=rb-4.1.0&q=80&w=1080',
    keyFeatures: [
      '6 properties in prime locations',
      'Experienced renovation team',
      'Strong buyer demand in area',
      'Projected 35% ROI in 18 months'
    ],
    financialHighlights: [
      { label: 'Total Project Cost', value: '$3,500,000' },
      { label: 'After Repair Value', value: '$4,800,000' },
      { label: 'Profit Target', value: '$1,300,000' },
      { label: 'Investor Return', value: '35% ROI' }
    ],
    riskLevel: 'Medium',
    marketOverview: 'Salem NH housing market up 12% YoY with median home price at $485K. Strong buyer demand and limited inventory.',
    exitStrategy: 'Retail sale after renovation (12-18 months)'
  },
  {
    id: 'PROP-026',
    title: 'NH Multi-Family REIT Fund',
    category: 'REIT',
    minInvestment: 10000,
    maxInvestment: 1000000,
    projectedROI: 22,
    term: 'Ongoing',
    payoutFrequency: 'Monthly',
    status: 'open',
    investors: 124,
    funded: 92,
    targetRaise: 50000000,
    currentCommitments: 46000000,
    needsMoreFunding: true,
    silentInvestment: true,
    highlight: 'Diversified',
    location: 'New Hampshire',
    propertyType: 'Multi-Family',
    image: 'https://images.unsplash.com/photo-1761165308179-d8de8f78bc49?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwzfHxtb2Rlcm4lMjBhcGFydG1lbnQlMjBidWlsZGluZyUyMGV4dGVyaW9yfGVufDF8fHx8MTc3ODU4MzcyMXww&ixlib=rb-4.1.0&q=80&w=1080',
    keyFeatures: [
      'Monthly cash distributions',
      'Diversified across 25+ properties',
      'Professional property management',
      'Low minimum investment ($10K)'
    ],
    financialHighlights: [
      { label: 'Fund Size', value: '$50,000,000' },
      { label: 'Current AUM', value: '$46,000,000' },
      { label: 'Properties', value: '25+ Units' },
      { label: 'Avg Occupancy', value: '96%' }
    ],
    riskLevel: 'Low',
    marketOverview: 'NH rental market showing strong fundamentals with 3.5% vacancy rate and rising rents across major metros.',
    exitStrategy: 'Liquid REIT shares - redeem quarterly with 90-day notice'
  },
  {
    id: 'PROP-028',
    title: 'Build-to-Rent Multi-Unit Complex',
    category: 'Development',
    minInvestment: 75000,
    maxInvestment: 1500000,
    projectedROI: 42,
    term: '2-3 years per cycle',
    payoutFrequency: 'Quarterly after stabilization',
    status: 'open',
    investors: 18,
    funded: 62,
    targetRaise: 8500000,
    currentCommitments: 5270000,
    needsMoreFunding: true,
    silentInvestment: true,
    highlight: 'Recurring Strategy',
    location: 'New Hampshire & Massachusetts',
    propertyType: 'Multi-Family Development',
    image: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtdWx0aWZhbWlseSUyMGFwYXJ0bWVudCUyMGNvbXBsZXglMjBjb25zdHJ1Y3Rpb258ZW58MXx8fHwxNzc4NjM2NDg0fDA&ixlib=rb-4.1.0&q=80&w=1080',
    keyFeatures: [
      'Build, Rent, Refinance, Repeat (BRRRR) strategy',
      'Cash-out refinance to extract equity after stabilization',
      'Option to reinvest in new builds or take returns',
      'Retain ownership stake in rental income streams',
      'Proven construction & property management team',
      'Multiple exit options: cash out, hold, or compound'
    ],
    financialHighlights: [
      { label: 'Total Build Cost', value: '$8,500,000' },
      { label: 'Stabilized Value', value: '$12,800,000' },
      { label: 'Refinance Potential', value: '$9,600,000 (75% LTV)' },
      { label: 'Cash-Out Equity', value: '$1,100,000+' },
      { label: 'Annual Rental Income', value: '$1,280,000' },
      { label: 'Investor Return', value: '42% + ongoing income' }
    ],
    riskLevel: 'Medium',
    marketOverview: 'Multi-family rental demand surging in NH/MA with 97% occupancy rates. Construction costs stabilizing while rents continue climbing 6-8% annually. Strong refinancing environment with competitive commercial rates.',
    exitStrategy: 'Refinance after 18-24 months to extract equity. Investors choose: (1) Cash out full returns, (2) Reinvest equity into next development cycle, or (3) Hold ownership stake for ongoing quarterly rental distributions. Portfolio grows through equity recycling while maintaining income-producing assets.'
  },
  {
    id: 'PROP-027',
    title: 'Seaport Boston Development',
    category: 'Development',
    minInvestment: 200000,
    maxInvestment: 2000000,
    projectedROI: 48,
    term: '4 years',
    payoutFrequency: 'Annually',
    status: 'open',
    investors: 6,
    funded: 34,
    targetRaise: 12000000,
    currentCommitments: 4080000,
    needsMoreFunding: true,
    silentInvestment: true,
    highlight: 'Highest Returns',
    location: 'Seaport District, Boston MA',
    propertyType: 'Mixed-Use Development',
    image: 'https://images.unsplash.com/photo-1615000448078-6751e42cbe82?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxib3N0b24lMjBzZWFwb3J0JTIwbW9kZXJuJTIwYXJjaGl0ZWN0dXJlfGVufDF8fHx8MTc3ODYzNjQ4NHww&ixlib=rb-4.1.0&q=80&w=1080',
    keyFeatures: [
      'Prime Seaport location',
      'Mixed-use: retail + residential',
      'Pre-leased anchor tenants',
      'Experienced development team'
    ],
    financialHighlights: [
      { label: 'Total Development Cost', value: '$12,000,000' },
      { label: 'Projected Stabilized Value', value: '$18,500,000' },
      { label: 'Projected Profit', value: '$6,500,000' },
      { label: 'Investor Multiple', value: '1.48x' }
    ],
    riskLevel: 'High',
    marketOverview: 'Seaport District is Boston\'s fastest-growing neighborhood with significant retail and residential demand.',
    exitStrategy: 'Refinance and hold, or sell to institutional buyer upon stabilization'
  }
];

export default function InvestmentOpportunitiesPublicView({ onNavigate }: InvestmentOpportunitiesPublicViewProps) {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'open' | 'funded'>('open');
  const [selectedOpportunity, setSelectedOpportunity] = useState<Opportunity | null>(null);
  const [showDataSheet, setShowDataSheet] = useState(false);
  const [dataSheetOpportunity, setDataSheetOpportunity] = useState<Opportunity | null>(null);

  useEffect(() => {
    loadOpportunities();
  }, []);

  const loadOpportunities = async () => {
    setLoading(true);
    // Server is the source of truth; fall back to the localStorage cache / defaults.
    try {
      const res = await fetch(`${SERVER}/investments/opportunities`, {
        headers: await authedHeadersOrAnon(publicAnonKey),
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.opportunities) && data.opportunities.length > 0) {
        const mapped = data.opportunities.map(fromServer);
        setOpportunities(mapped);
        try { localStorage.setItem('investmentOpportunities', JSON.stringify(mapped)); } catch {}
        setLoading(false);
        return;
      }
    } catch (err) {
      console.error('InvestmentOpportunitiesPublicView: failed to load from server, using cache:', err);
    }

    const stored = localStorage.getItem('investmentOpportunities');
    if (stored) {
      try {
        setOpportunities(JSON.parse(stored));
      } catch (e) {
        console.error('Error loading opportunities:', e);
        setOpportunities(DEFAULT_OPPORTUNITIES);
        localStorage.setItem('investmentOpportunities', JSON.stringify(DEFAULT_OPPORTUNITIES));
      }
    } else {
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
      'Company Equity': 'bg-blue-500/20 text-blue-300 border-blue-500/30',
      'Value-Add': 'bg-orange-500/20 text-orange-300 border-orange-500/30',
      'REIT': 'bg-purple-500/20 text-purple-300 border-purple-500/30',
      'Development': 'bg-green-500/20 text-green-300 border-green-500/30',
      'Tax-Deferred': 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
      'Turnkey': 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
      'Fractional Ownership': 'bg-pink-500/20 text-pink-300 border-pink-500/30'
    };
    return colors[category] || 'bg-gray-500/20 text-gray-300 border-gray-500/30';
  };

  const getRiskLevelColor = (risk?: string) => {
    if (!risk) return 'text-gray-400';
    const colors: Record<string, string> = {
      'Low': 'text-green-400',
      'Medium': 'text-yellow-400',
      'High': 'text-red-400'
    };
    return colors[risk] || 'text-gray-400';
  };

  const downloadDataSheet = (opp: Opportunity) => {
    // Show data sheet modal
    setDataSheetOpportunity(opp);
    setShowDataSheet(true);
  };

  const oldGenerateDataSheetHTML = (opp: Opportunity) => {
    // Calculate detailed projections
    const investmentAmount = opp.minInvestment;
    const projectedReturn = (investmentAmount * opp.projectedROI) / 100;
    const totalReturn = investmentAmount + projectedReturn;

    // Generate quarterly payout schedule if applicable
    const generatePayoutSchedule = () => {
      if (opp.payoutFrequency === 'Quarterly') {
        const quarterlyPayout = projectedReturn / (parseInt(opp.term) * 4);
        return Array.from({ length: parseInt(opp.term) * 4 }, (_, i) => ({
          quarter: i + 1,
          amount: quarterlyPayout,
          cumulative: quarterlyPayout * (i + 1)
        }));
      } else if (opp.payoutFrequency === 'Monthly') {
        const monthlyPayout = projectedReturn / (parseInt(opp.term) * 12);
        return Array.from({ length: Math.min(12, parseInt(opp.term) * 12) }, (_, i) => ({
          month: i + 1,
          amount: monthlyPayout,
          cumulative: monthlyPayout * (i + 1)
        }));
      }
      return [];
    };

    const payoutSchedule = generatePayoutSchedule();

    // Generate a printable data sheet with black theme
    const dataSheetHTML = `
<!DOCTYPE html>
<html>
<head>
  <title>${opp.title} - Investment Data Sheet</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #0A0A0A;
      color: #ffffff;
      padding: 40px;
      line-height: 1.6;
    }
    .header {
      border-bottom: 4px solid #ea580c;
      padding-bottom: 20px;
      margin-bottom: 30px;
      background: linear-gradient(135deg, #1A1A1A 0%, #0A0A0A 100%);
      padding: 30px;
      border-radius: 12px;
      border: 1px solid #2A2A2A;
    }
    h1 { font-size: 32px; margin-bottom: 8px; color: #ffffff; font-weight: 700; }
    .category {
      display: inline-block;
      background: linear-gradient(135deg, #ea580c, #f97316);
      color: #ffffff;
      padding: 8px 16px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 700;
      margin-top: 8px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .section {
      margin: 30px 0;
      page-break-inside: avoid;
      background: #1A1A1A;
      border: 1px solid #2A2A2A;
      border-radius: 12px;
      padding: 24px;
    }
    .section-title {
      font-size: 22px;
      font-weight: 700;
      color: #ea580c;
      margin-bottom: 20px;
      padding-bottom: 12px;
      border-bottom: 2px solid #ea580c;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 16px;
      margin: 20px 0;
    }
    .metric-card {
      border: 2px solid #2A2A2A;
      border-radius: 12px;
      padding: 20px;
      background: #0A0A0A;
      transition: all 0.3s;
    }
    .metric-card:hover {
      border-color: #ea580c;
      box-shadow: 0 0 20px rgba(234, 88, 12, 0.3);
    }
    .metric-label {
      font-size: 11px;
      color: #9ca3af;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 8px;
      font-weight: 600;
    }
    .metric-value {
      font-size: 28px;
      font-weight: 700;
      color: #ffffff;
    }
    .metric-value.highlight {
      color: #10b981;
    }
    .features-list {
      list-style: none;
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 12px;
    }
    .features-list li {
      padding: 14px;
      background: #0A0A0A;
      border-left: 4px solid #ea580c;
      border-radius: 8px;
      color: #d1d5db;
      font-size: 14px;
    }
    .text-content {
      padding: 20px;
      background: #0A0A0A;
      border-radius: 12px;
      line-height: 1.8;
      color: #d1d5db;
      border: 1px solid #2A2A2A;
    }
    .payout-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 16px;
    }
    .payout-table th {
      background: #ea580c;
      color: white;
      padding: 12px;
      text-align: left;
      font-weight: 700;
      font-size: 13px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .payout-table td {
      padding: 12px;
      border-bottom: 1px solid #2A2A2A;
      color: #d1d5db;
    }
    .payout-table tr:nth-child(even) {
      background: #0A0A0A;
    }
    .payout-table tr:hover {
      background: #1A1A1A;
    }
    .summary-box {
      background: linear-gradient(135deg, #ea580c 0%, #f97316 100%);
      color: white;
      padding: 24px;
      border-radius: 12px;
      margin: 20px 0;
      box-shadow: 0 10px 30px rgba(234, 88, 12, 0.3);
    }
    .summary-box h3 {
      font-size: 18px;
      margin-bottom: 16px;
      font-weight: 700;
    }
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
    }
    .summary-item {
      text-align: center;
    }
    .summary-label {
      font-size: 12px;
      opacity: 0.9;
      margin-bottom: 4px;
      font-weight: 600;
    }
    .summary-value {
      font-size: 24px;
      font-weight: 700;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 2px solid #2A2A2A;
      text-align: center;
      color: #6b7280;
      font-size: 14px;
    }
    .location {
      color: #9ca3af;
      margin-top: 8px;
      font-size: 16px;
    }
    .highlight-banner {
      background: #ea580c;
      color: white;
      padding: 8px 16px;
      border-radius: 8px;
      display: inline-block;
      font-weight: 700;
      font-size: 13px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 12px;
    }
    @media print {
      body { padding: 20px; background: #0A0A0A; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="header">
    ${opp.highlight ? `<div class="highlight-banner">🔥 ${opp.highlight}</div>` : ''}
    <h1>${opp.title}</h1>
    <div class="category">${opp.category}</div>
    ${opp.location ? `<div class="location">📍 ${opp.location}</div>` : ''}
  </div>

  <!-- Investment Summary -->
  <div class="summary-box">
    <h3>📊 Investment Summary (Based on ${formatCurrency(investmentAmount)} Investment)</h3>
    <div class="summary-grid">
      <div class="summary-item">
        <div class="summary-label">Initial Investment</div>
        <div class="summary-value">${formatCurrency(investmentAmount)}</div>
      </div>
      <div class="summary-item">
        <div class="summary-label">Projected Return</div>
        <div class="summary-value">${formatCurrency(projectedReturn)}</div>
      </div>
      <div class="summary-item">
        <div class="summary-label">Total Payout</div>
        <div class="summary-value">${formatCurrency(totalReturn)}</div>
      </div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Key Investment Metrics</div>
    <div class="metrics-grid">
      <div class="metric-card">
        <div class="metric-label">Projected ROI</div>
        <div class="metric-value highlight">${opp.projectedROI}%</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">Investment Term</div>
        <div class="metric-value">${opp.term}</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">Min Investment</div>
        <div class="metric-value" style="font-size: 20px;">${formatCurrency(opp.minInvestment)}</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">Risk Level</div>
        <div class="metric-value">${opp.riskLevel || 'N/A'}</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">Payout Frequency</div>
        <div class="metric-value" style="font-size: 18px;">${opp.payoutFrequency}</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">Current Investors</div>
        <div class="metric-value">${opp.investors}</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">Funding Status</div>
        <div class="metric-value highlight">${opp.funded}%</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">Target Raise</div>
        <div class="metric-value" style="font-size: 18px;">${formatCurrency(opp.targetRaise)}</div>
      </div>
    </div>
  </div>

  ${opp.financialHighlights && opp.financialHighlights.length > 0 ? `
  <div class="section">
    <div class="section-title">💰 Financial Highlights & Project Breakdown</div>
    <div class="metrics-grid">
      ${opp.financialHighlights.map(item => `
        <div class="metric-card">
          <div class="metric-label">${item.label}</div>
          <div class="metric-value" style="font-size: 20px;">${item.value}</div>
        </div>
      `).join('')}
    </div>
  </div>
  ` : ''}

  ${opp.keyFeatures && opp.keyFeatures.length > 0 ? `
  <div class="section">
    <div class="section-title">Key Features</div>
    <ul class="features-list">
      ${opp.keyFeatures.map(feature => `<li>✓ ${feature}</li>`).join('')}
    </ul>
  </div>
  ` : ''}

  ${opp.marketOverview ? `
  <div class="section">
    <div class="section-title">Market Overview</div>
    <div class="text-content">${opp.marketOverview}</div>
  </div>
  ` : ''}

  ${opp.exitStrategy ? `
  <div class="section">
    <div class="section-title">🎯 Exit Strategy</div>
    <div class="text-content">${opp.exitStrategy}</div>
  </div>
  ` : ''}

  ${payoutSchedule.length > 0 ? `
  <div class="section">
    <div class="section-title">📅 Projected Payout Schedule</div>
    <p style="color: #9ca3af; margin-bottom: 16px;">Based on ${formatCurrency(investmentAmount)} investment with ${opp.projectedROI}% projected ROI</p>
    <table class="payout-table">
      <thead>
        <tr>
          <th>${opp.payoutFrequency === 'Quarterly' ? 'Quarter' : 'Month'}</th>
          <th>Payout Amount</th>
          <th>Cumulative Return</th>
          <th>% of Total Return</th>
        </tr>
      </thead>
      <tbody>
        ${payoutSchedule.slice(0, 12).map((payout, index) => `
          <tr>
            <td><strong>${opp.payoutFrequency === 'Quarterly' ? 'Q' + payout.quarter : 'Month ' + payout.month}</strong></td>
            <td>${formatCurrency(payout.amount)}</td>
            <td>${formatCurrency(payout.cumulative)}</td>
            <td>${((payout.cumulative / projectedReturn) * 100).toFixed(1)}%</td>
          </tr>
        `).join('')}
        ${payoutSchedule.length > 12 ? `
          <tr style="background: #1A1A1A;">
            <td colspan="4" style="text-align: center; color: #ea580c; font-weight: 600; padding: 16px;">
              ... and ${payoutSchedule.length - 12} more ${opp.payoutFrequency === 'Quarterly' ? 'quarters' : 'months'}
            </td>
          </tr>
        ` : ''}
      </tbody>
    </table>
  </div>
  ` : `
  <div class="section">
    <div class="section-title">📅 Payout Structure</div>
    <div class="metrics-grid" style="grid-template-columns: repeat(3, 1fr);">
      <div class="metric-card">
        <div class="metric-label">Payout Frequency</div>
        <div class="metric-value" style="font-size: 20px;">${opp.payoutFrequency}</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">Total Return</div>
        <div class="metric-value highlight" style="font-size: 20px;">${formatCurrency(projectedReturn)}</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">Investment Period</div>
        <div class="metric-value" style="font-size: 20px;">${opp.term}</div>
      </div>
    </div>
  </div>
  `}

  <div class="section">
    <div class="section-title">📋 Investment Details</div>
    <div class="metrics-grid" style="grid-template-columns: repeat(3, 1fr);">
      <div class="metric-card">
        <div class="metric-label">Investment Range</div>
        <div class="metric-value" style="font-size: 18px;">${formatCurrency(opp.minInvestment)} - ${formatCurrency(opp.maxInvestment)}</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">Current Commitments</div>
        <div class="metric-value" style="font-size: 18px;">${formatCurrency(opp.currentCommitments || 0)}</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">Remaining to Target</div>
        <div class="metric-value" style="font-size: 18px;">${formatCurrency(opp.targetRaise - (opp.currentCommitments || 0))}</div>
      </div>
    </div>
  </div>

  <div class="footer">
    <p style="font-size: 16px; margin-bottom: 12px;"><strong>⚠️ Important Notice:</strong> This is not an offer to sell securities. All investments are subject to risks and regulatory approval.</p>
    <p style="color: #9ca3af;">Generated on ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
    <p style="color: #6b7280; margin-top: 8px; font-size: 13px;">The Black Phoenix Company - Investment Opportunities</p>
  </div>

  <div class="no-print" style="margin-top: 40px; text-align: center; padding: 30px; background: #1A1A1A; border-radius: 12px; border: 2px solid #2A2A2A;">
    <p style="color: #9ca3af; margin-bottom: 20px; font-size: 15px;">📄 Save this data sheet for your records or print for offline review</p>
    <button onclick="window.print()" style="padding: 14px 32px; background: linear-gradient(135deg, #ea580c, #f97316); color: white; border: none; border-radius: 10px; font-size: 16px; font-weight: 700; cursor: pointer; box-shadow: 0 4px 12px rgba(234, 88, 12, 0.4); transition: all 0.3s;">
      🖨️ Print / Save as PDF
    </button>
    <button onclick="window.close()" style="padding: 14px 32px; background: #2A2A2A; color: white; border: 2px solid #3A3A3A; border-radius: 10px; font-size: 16px; font-weight: 600; cursor: pointer; margin-left: 12px; transition: all 0.3s;">
      ✕ Close
    </button>
  </div>
</body>
</html>
    `;

    // Open in new window
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(dataSheetHTML);
      printWindow.document.close();
    }
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
    <>
      {/* Investment Data Sheet Modal */}
      {showDataSheet && dataSheetOpportunity && (
        <InvestmentDataSheet
          opportunity={dataSheetOpportunity}
          onClose={() => {
            setShowDataSheet(false);
            setDataSheetOpportunity(null);
          }}
          onNavigate={onNavigate}
        />
      )}

      <div className="min-h-screen bg-[#0A0A0A] py-12 px-6">
        <div className="w-full">
        {/* Hero Section */}
        <div className="flex flex-col items-center justify-center text-center mb-16 w-full px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-500/10 to-red-500/10 border border-orange-500/30 rounded-full mb-6"
          >
            <TrendingUp className="w-4 h-4 text-orange-400" />
            <span className="text-sm font-semibold text-orange-400">Vetted Investment Opportunities</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-5xl md:text-6xl font-bold text-white mb-6 text-center w-full"
            style={{ textAlign: 'center' }}
          >
            Build Wealth Through<br />Strategic Investments
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-lg md:text-xl text-gray-400 leading-relaxed text-center max-w-4xl mx-auto"
          >
            Access exclusive real estate and business opportunities with competitive returns,
            professional management, and transparent reporting
          </motion.p>

          {/* Key Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12 max-w-5xl mx-auto w-full"
          >
            <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6 text-center">
              <div className="text-3xl font-bold text-orange-400 mb-2">$70M+</div>
              <div className="text-sm text-gray-400">Total Capital Deployed</div>
            </div>
            <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6 text-center">
              <div className="text-3xl font-bold text-green-400 mb-2">28%</div>
              <div className="text-sm text-gray-400">Average Annual Return</div>
            </div>
            <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6 text-center">
              <div className="text-3xl font-bold text-blue-400 mb-2">157</div>
              <div className="text-sm text-gray-400">Active Investors</div>
            </div>
          </motion.div>
        </div>

        <div className="max-w-7xl mx-auto">

        {/* Filter Tabs */}
        <div className="flex flex-wrap items-center justify-center gap-4 mb-12">
          <button
            onClick={() => setFilter('all')}
            className={`px-8 py-3 rounded-xl font-semibold transition-all ${
              filter === 'all'
                ? 'bg-gradient-to-r from-orange-600 to-orange-700 text-white shadow-lg shadow-orange-500/30'
                : 'bg-[#1A1A1A] text-gray-400 hover:text-white border border-[#2A2A2A] hover:border-orange-500/30'
            }`}
          >
            All Opportunities ({opportunities.length})
          </button>
          <button
            onClick={() => setFilter('open')}
            className={`px-8 py-3 rounded-xl font-semibold transition-all ${
              filter === 'open'
                ? 'bg-gradient-to-r from-orange-600 to-orange-700 text-white shadow-lg shadow-orange-500/30'
                : 'bg-[#1A1A1A] text-gray-400 hover:text-white border border-[#2A2A2A] hover:border-orange-500/30'
            }`}
          >
            Open ({opportunities.filter(o => o.status === 'open').length})
          </button>
          <button
            onClick={() => setFilter('funded')}
            className={`px-8 py-3 rounded-xl font-semibold transition-all ${
              filter === 'funded'
                ? 'bg-gradient-to-r from-orange-600 to-orange-700 text-white shadow-lg shadow-orange-500/30'
                : 'bg-[#1A1A1A] text-gray-400 hover:text-white border border-[#2A2A2A] hover:border-orange-500/30'
            }`}
          >
            Funded ({opportunities.filter(o => o.status === 'funded').length})
          </button>
        </div>

        {/* Opportunities Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-16">
          {filteredOpportunities.map((opp, index) => (
            <motion.div
              key={opp.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="group bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl overflow-hidden hover:border-orange-500/50 hover:shadow-2xl hover:shadow-orange-500/10 transition-all duration-300"
            >
              {/* Hero Image */}
              {opp.image && (
                <div className="relative h-64 overflow-hidden">
                  <img
                    src={opp.image}
                    alt={opp.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#1A1A1A] via-[#1A1A1A]/50 to-transparent" />
                  {opp.highlight && (
                    <div className="absolute top-4 right-4 px-3 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg">
                      {opp.highlight}
                    </div>
                  )}
                </div>
              )}

              {/* Header */}
              <div className="relative p-6 pb-4 bg-gradient-to-br from-[#1A1A1A] to-[#0A0A0A]">
                {!opp.image && opp.highlight && (
                  <div className="absolute top-4 right-4 px-3 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg">
                    {opp.highlight}
                  </div>
                )}

                <div className="flex items-start gap-4 mb-4">
                  <div className="p-3 bg-orange-500/10 rounded-xl border border-orange-500/30">
                    {opp.category === 'Company Equity' && <Building2 className="w-6 h-6 text-orange-400" />}
                    {opp.category === 'Value-Add' && <TrendingUp className="w-6 h-6 text-orange-400" />}
                    {opp.category === 'REIT' && <BarChart3 className="w-6 h-6 text-orange-400" />}
                    {opp.category === 'Development' && <Target className="w-6 h-6 text-orange-400" />}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold text-white mb-2 group-hover:text-orange-400 transition-colors">
                      {opp.title}
                    </h3>
                    <span className={`inline-block px-3 py-1 rounded-lg text-xs font-semibold border ${getCategoryColor(opp.category)}`}>
                      {opp.category}
                    </span>
                  </div>
                </div>

                {opp.location && (
                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <MapPin className="w-4 h-4" />
                    {opp.location}
                  </div>
                )}
              </div>

              {/* Key Metrics */}
              <div className="grid grid-cols-3 gap-4 px-6 py-4 bg-[#0A0A0A] border-y border-[#2A2A2A]">
                <div>
                  <div className="text-xs text-gray-500 mb-1">Projected ROI</div>
                  <div className="text-2xl font-bold text-green-400 flex items-baseline gap-1">
                    {opp.projectedROI}
                    <Percent className="w-4 h-4" />
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1">Term</div>
                  <div className="text-lg font-semibold text-white">{opp.term}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1">Risk Level</div>
                  <div className={`text-lg font-semibold ${getRiskLevelColor(opp.riskLevel)}`}>
                    {opp.riskLevel || 'N/A'}
                  </div>
                </div>
              </div>

              {/* Investment Details */}
              <div className="p-6 space-y-4">
                {/* Progress Bar */}
                <div>
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-gray-400">Funding Progress</span>
                    <span className="text-white font-semibold">{opp.funded}% Funded</span>
                  </div>
                  <div className="relative w-full bg-[#0A0A0A] rounded-full h-3 border border-[#2A2A2A] overflow-hidden">
                    <div
                      className="absolute inset-0 bg-gradient-to-r from-orange-500 via-orange-600 to-red-500 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(opp.funded, 100)}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-500 mt-2">
                    <span>{formatCurrency(opp.currentCommitments || 0)} raised</span>
                    <span>{formatCurrency(opp.targetRaise)} target</span>
                  </div>
                </div>

                {/* Investment Range */}
                <div className="p-4 bg-[#0A0A0A] rounded-xl border border-[#2A2A2A]">
                  <div className="text-xs text-gray-500 mb-2">Investment Range</div>
                  <div className="text-lg font-bold text-white">
                    {formatCurrency(opp.minInvestment)} - {formatCurrency(opp.maxInvestment)}
                  </div>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-3 gap-3 text-xs">
                  <div className="flex flex-col items-center p-3 bg-[#0A0A0A] rounded-lg border border-[#2A2A2A]">
                    <Users className="w-4 h-4 text-gray-400 mb-1" />
                    <div className="font-semibold text-white">{opp.investors}</div>
                    <div className="text-gray-500">Investors</div>
                  </div>
                  <div className="flex flex-col items-center p-3 bg-[#0A0A0A] rounded-lg border border-[#2A2A2A]">
                    <Calendar className="w-4 h-4 text-gray-400 mb-1" />
                    <div className="font-semibold text-white">{opp.payoutFrequency}</div>
                    <div className="text-gray-500">Payouts</div>
                  </div>
                  <div className="flex flex-col items-center p-3 bg-[#0A0A0A] rounded-lg border border-[#2A2A2A]">
                    <Clock className="w-4 h-4 text-gray-400 mb-1" />
                    <div className="font-semibold text-white">{opp.term}</div>
                    <div className="text-gray-500">Duration</div>
                  </div>
                </div>

                {/* Financial Highlights */}
                {opp.financialHighlights && opp.financialHighlights.length > 0 && (
                  <div>
                    <h4 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-orange-400" />
                      Financial Highlights
                    </h4>
                    <div className="grid grid-cols-2 gap-3">
                      {opp.financialHighlights.map((item, idx) => (
                        <div key={idx} className="p-3 bg-[#0A0A0A] rounded-lg border border-[#2A2A2A]">
                          <div className="text-xs text-gray-500 mb-1">{item.label}</div>
                          <div className="text-sm font-bold text-white">{item.value}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Key Features */}
                {opp.keyFeatures && opp.keyFeatures.length > 0 && (
                  <div>
                    <h4 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                      <Star className="w-4 h-4 text-orange-400" />
                      Key Features
                    </h4>
                    <div className="space-y-2">
                      {opp.keyFeatures.slice(0, 4).map((feature, idx) => (
                        <div key={idx} className="flex items-start gap-2 text-sm">
                          <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                          <span className="text-gray-300">{feature}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Market Overview */}
                {opp.marketOverview && (
                  <div className="p-4 bg-[#0A0A0A] rounded-xl border border-[#2A2A2A]">
                    <h4 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
                      <LineChart className="w-4 h-4 text-orange-400" />
                      Market Overview
                    </h4>
                    <p className="text-xs text-gray-300 leading-relaxed">{opp.marketOverview}</p>
                  </div>
                )}

                {/* Exit Strategy */}
                {opp.exitStrategy && (
                  <div className="p-4 bg-[#0A0A0A] rounded-xl border border-[#2A2A2A]">
                    <h4 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
                      <Target className="w-4 h-4 text-orange-400" />
                      Exit Strategy
                    </h4>
                    <p className="text-xs text-gray-300 leading-relaxed">{opp.exitStrategy}</p>
                  </div>
                )}

                {/* CTA Buttons */}
                <div className="space-y-3 pt-4">
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      console.log('🔵 Invest Now clicked for opportunity:', opp.id);
                      console.log('🔵 onNavigate function available?', !!onNavigate);
                      if (onNavigate) {
                        console.log('🔵 Using onNavigate to go to investor-application');
                        onNavigate(`investor-application?opportunity=${opp.id}`);
                      } else {
                        console.log('🔵 Using window.location.href fallback');
                        window.location.href = `/investor-application?opportunity=${opp.id}`;
                      }
                    }}
                    className="w-full flex items-center justify-center gap-2 px-4 py-4 bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 rounded-xl text-white font-bold shadow-lg shadow-orange-500/30 transition-all group-hover:shadow-orange-500/50"
                  >
                    Invest Now
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </button>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setSelectedOpportunity(opp)}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-[#2A2A2A] hover:bg-[#3A3A3A] border border-[#3A3A3A] hover:border-orange-500/50 rounded-lg text-white text-sm font-semibold transition-all"
                    >
                      <Info className="w-4 h-4" />
                      Full Report
                    </button>
                    <button
                      onClick={() => downloadDataSheet(opp)}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-[#2A2A2A] hover:bg-[#3A3A3A] border border-[#3A3A3A] hover:border-orange-500/50 rounded-lg text-white text-sm font-semibold transition-all"
                      title="Download Data Sheet"
                    >
                      <Download className="w-4 h-4" />
                      Data Sheet
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {filteredOpportunities.length === 0 && (
          <div className="text-center py-20">
            <AlertCircle className="w-16 h-16 text-gray-600 mx-auto mb-6" />
            <h3 className="text-2xl font-bold text-white mb-3">No opportunities found</h3>
            <p className="text-gray-400 mb-8">Check back soon for new investment opportunities</p>
            <button
              onClick={() => setFilter('all')}
              className="px-6 py-3 bg-orange-600 hover:bg-orange-700 rounded-xl text-white font-semibold transition-all"
            >
              View All Opportunities
            </button>
          </div>
        )}

        {/* Bottom CTA Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-20 relative overflow-hidden max-w-6xl mx-auto"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-orange-600/20 via-red-600/20 to-pink-600/20 rounded-3xl blur-3xl" />
          <div className="relative bg-gradient-to-br from-[#1A1A1A] to-[#0A0A0A] border border-orange-500/30 rounded-3xl p-12">
            <div className="text-center">
              <Shield className="w-16 h-16 text-orange-400 mx-auto mb-6" />
              <h3 className="text-4xl font-bold text-white mb-4">
                Ready to Start Investing?
              </h3>
              <p className="text-xl text-gray-300 mb-8 leading-relaxed">
                Join our exclusive investor network to access vetted opportunities,
                receive detailed due diligence reports, and enjoy transparent quarterly reporting
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <button
                  onClick={() => {
                    if (onNavigate) {
                      onNavigate('investor-application');
                    } else {
                      window.location.href = '/investor-application';
                    }
                  }}
                  className="px-8 py-4 bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 text-white font-bold rounded-xl shadow-lg shadow-orange-500/30 transition-all flex items-center gap-2"
                >
                  Apply to Become an Investor
                  <ArrowRight className="w-5 h-5" />
                </button>
                <button
                  onClick={() => {
                    if (onNavigate) {
                      onNavigate('investment-calculator');
                    } else {
                      window.location.href = '/investment-calculator';
                    }
                  }}
                  className="px-8 py-4 bg-[#2A2A2A] hover:bg-[#3A3A3A] border border-[#3A3A3A] hover:border-orange-500/50 text-white font-semibold rounded-xl transition-all flex items-center gap-2"
                >
                  <BarChart3 className="w-5 h-5" />
                  Calculate Returns
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-6 h-6 text-green-400 flex-shrink-0 mt-1" />
                  <div className="text-left">
                    <div className="font-semibold text-white mb-1">Vetted Opportunities</div>
                    <div className="text-sm text-gray-400">All investments undergo rigorous due diligence</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-6 h-6 text-green-400 flex-shrink-0 mt-1" />
                  <div className="text-left">
                    <div className="font-semibold text-white mb-1">Transparent Reporting</div>
                    <div className="text-sm text-gray-400">Quarterly updates and financial statements</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-6 h-6 text-green-400 flex-shrink-0 mt-1" />
                  <div className="text-left">
                    <div className="font-semibold text-white mb-1">Professional Management</div>
                    <div className="text-sm text-gray-400">Experienced teams managing your investments</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Detailed Modal */}
      <AnimatePresence>
        {selectedOpportunity && (
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-6"
            onClick={() => setSelectedOpportunity(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="sticky top-0 bg-[#1A1A1A] border-b border-[#2A2A2A] p-6 flex items-center justify-between z-10">
                <div>
                  <h2 className="text-2xl font-bold text-white mb-1">{selectedOpportunity.title}</h2>
                  <span className={`inline-block px-3 py-1 rounded-lg text-xs font-semibold border ${getCategoryColor(selectedOpportunity.category)}`}>
                    {selectedOpportunity.category}
                  </span>
                </div>
                <button
                  onClick={() => setSelectedOpportunity(null)}
                  className="p-2 hover:bg-[#2A2A2A] rounded-lg transition-colors"
                >
                  <X className="w-6 h-6 text-gray-400 hover:text-white" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-6 space-y-6">
                {/* Hero Image */}
                {selectedOpportunity.image && (
                  <div className="relative h-96 -mx-6 -mt-6 mb-6 overflow-hidden">
                    <img
                      src={selectedOpportunity.image}
                      alt={selectedOpportunity.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#1A1A1A] via-transparent to-transparent" />
                  </div>
                )}

                {/* Key Metrics */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 bg-[#0A0A0A] rounded-xl border border-[#2A2A2A]">
                    <div className="text-xs text-gray-500 mb-1">Projected ROI</div>
                    <div className="text-2xl font-bold text-green-400">{selectedOpportunity.projectedROI}%</div>
                  </div>
                  <div className="p-4 bg-[#0A0A0A] rounded-xl border border-[#2A2A2A]">
                    <div className="text-xs text-gray-500 mb-1">Term</div>
                    <div className="text-xl font-bold text-white">{selectedOpportunity.term}</div>
                  </div>
                  <div className="p-4 bg-[#0A0A0A] rounded-xl border border-[#2A2A2A]">
                    <div className="text-xs text-gray-500 mb-1">Min Investment</div>
                    <div className="text-xl font-bold text-white">{formatCurrency(selectedOpportunity.minInvestment)}</div>
                  </div>
                  <div className="p-4 bg-[#0A0A0A] rounded-xl border border-[#2A2A2A]">
                    <div className="text-xs text-gray-500 mb-1">Risk Level</div>
                    <div className={`text-xl font-bold ${getRiskLevelColor(selectedOpportunity.riskLevel)}`}>
                      {selectedOpportunity.riskLevel}
                    </div>
                  </div>
                </div>

                {/* Financial Highlights */}
                {selectedOpportunity.financialHighlights && selectedOpportunity.financialHighlights.length > 0 && (
                  <div>
                    <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                      <DollarSign className="w-5 h-5 text-orange-400" />
                      Financial Highlights
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {selectedOpportunity.financialHighlights.map((item, idx) => (
                        <div key={idx} className="p-4 bg-[#0A0A0A] rounded-xl border border-[#2A2A2A]">
                          <div className="text-xs text-gray-500 mb-2">{item.label}</div>
                          <div className="text-lg font-bold text-white">{item.value}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Key Features */}
                {selectedOpportunity.keyFeatures && selectedOpportunity.keyFeatures.length > 0 && (
                  <div>
                    <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                      <Star className="w-5 h-5 text-orange-400" />
                      Key Features
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {selectedOpportunity.keyFeatures.map((feature, idx) => (
                        <div key={idx} className="flex items-start gap-3 p-3 bg-[#0A0A0A] rounded-lg border border-[#2A2A2A]">
                          <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                          <span className="text-gray-300">{feature}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Market Overview */}
                {selectedOpportunity.marketOverview && (
                  <div>
                    <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                      <LineChart className="w-5 h-5 text-orange-400" />
                      Market Overview
                    </h3>
                    <div className="p-4 bg-[#0A0A0A] rounded-xl border border-[#2A2A2A]">
                      <p className="text-gray-300 leading-relaxed">{selectedOpportunity.marketOverview}</p>
                    </div>
                  </div>
                )}

                {/* Exit Strategy */}
                {selectedOpportunity.exitStrategy && (
                  <div>
                    <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                      <Target className="w-5 h-5 text-orange-400" />
                      Exit Strategy
                    </h3>
                    <div className="p-4 bg-[#0A0A0A] rounded-xl border border-[#2A2A2A]">
                      <p className="text-gray-300 leading-relaxed">{selectedOpportunity.exitStrategy}</p>
                    </div>
                  </div>
                )}

                {/* Download Data Sheet */}
                <div className="flex gap-3 pt-4 border-t border-[#2A2A2A]">
                  <button
                    onClick={() => downloadDataSheet(selectedOpportunity)}
                    className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-[#2A2A2A] hover:bg-[#3A3A3A] border border-[#3A3A3A] hover:border-orange-500/50 rounded-xl text-white font-semibold transition-all"
                  >
                    <Download className="w-5 h-5" />
                    Download Data Sheet
                  </button>
                  <button
                    onClick={() => {
                      setSelectedOpportunity(null);
                      if (onNavigate) {
                        onNavigate(`investor-application?opportunity=${selectedOpportunity.id}`);
                      } else {
                        window.location.href = `/investor-application?opportunity=${selectedOpportunity.id}`;
                      }
                    }}
                    className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 rounded-xl text-white font-bold shadow-lg shadow-orange-500/30 transition-all"
                  >
                    Express Interest
                    <ArrowRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      </div>
      </div>
    </>
  );
}
