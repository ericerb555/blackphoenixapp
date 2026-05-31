import { useState } from 'react';
import {
  TrendingUp, DollarSign, Building2, PieChart, BarChart3, FileText,
  Calendar, Target, Award, ArrowUpRight, ArrowDownRight, Download,
  Home, MessageSquare, Settings, Bell, ChevronRight, Briefcase,
  Activity, Clock, CheckCircle, AlertCircle, Percent, Wallet, X,
  Users, MapPin, TrendingDown, Calculator, Shield, Info, ExternalLink
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import LayoutManager from '../layout-editor/LayoutManager';
import { PrimaryButton } from '../ui/button/PrimaryButton';
import { ChartContainer } from '../ChartContainer';
import LogoMarquee from '../LogoMarquee';
import AdvertisingMarquee from '../AdvertisingMarquee';
import ReferralRewards from '../ReferralRewards';
import InvestmentApplication from './InvestmentApplication';
import InvestmentContract from './InvestmentContract';

export default function InvestorPortalView() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'portfolio' | 'opportunities' | 'reports' | 'distributions' | 'documents' | 'referrals'>('dashboard');
  const [opportunityFilter, setOpportunityFilter] = useState<'all' | 'company' | 'property'>('all');
  const [selectedOpportunity, setSelectedOpportunity] = useState<any>(null);
  const [showOpportunityModal, setShowOpportunityModal] = useState(false);
  const [investmentAmount, setInvestmentAmount] = useState<string>('');
  const [showApplication, setShowApplication] = useState(false);
  const [applicationData, setApplicationData] = useState<any>(null);
  const [showContract, setShowContract] = useState(false);

  // Mock investor data
  const investorInfo = {
    name: 'Michael Chen',
    email: 'michael.chen@investments.com',
    phone: '(555) 234-5678',
    accountManager: 'Jennifer Lee',
    memberSince: 'June 2021',
    totalInvested: 2500000,
    currentValue: 3250000,
    totalROI: 30
  };

  // Portfolio performance data
  const performanceData = [
    { month: 'Jul', value: 2800000, roi: 12 },
    { month: 'Aug', value: 2850000, roi: 14 },
    { month: 'Sep', value: 2920000, roi: 16.8 },
    { month: 'Oct', value: 3020000, roi: 20.8 },
    { month: 'Nov', value: 3150000, roi: 26 },
    { month: 'Dec', value: 3180000, roi: 27.2 },
    { month: 'Jan', value: 3250000, roi: 30 }
  ];

  // Stats
  const stats = [
    { label: 'Portfolio Value', value: '$3.25M', change: '+$70K', trend: 'up', icon: Wallet, color: 'orange' },
    { label: 'Total ROI', value: '30%', change: '+2.8%', trend: 'up', icon: TrendingUp, color: 'green' },
    { label: 'Active Properties', value: '12', change: '+2 new', trend: 'up', icon: Building2, color: 'blue' },
    { label: 'Monthly Income', value: '$18.5K', change: '+$1.2K', trend: 'up', icon: DollarSign, color: 'yellow' }
  ];

  // Investment properties
  const properties = [
    {
      id: 'PROP-001',
      name: 'Sunset Towers',
      type: 'Multi-Family',
      location: 'Miami, FL',
      invested: 500000,
      currentValue: 675000,
      roi: 35,
      monthlyIncome: 4200,
      status: 'performing',
      occupancy: 98
    },
    {
      id: 'PROP-002',
      name: 'Downtown Plaza',
      type: 'Commercial',
      location: 'Austin, TX',
      invested: 850000,
      currentValue: 1020000,
      roi: 20,
      monthlyIncome: 6800,
      status: 'performing',
      occupancy: 100
    },
    {
      id: 'PROP-003',
      name: 'Garden Estates',
      type: 'Residential',
      location: 'Denver, CO',
      invested: 425000,
      currentValue: 580000,
      roi: 36.5,
      monthlyIncome: 3500,
      status: 'performing',
      occupancy: 95
    }
  ];

  // Investment opportunities - Company & Property Investments
  const companyOpportunities = [
    {
      id: 'COMP-001',
      title: 'Revenue Share Partnership',
      category: 'Company Equity',
      description: 'Earn quarterly distributions from company revenue growth',
      minInvestment: 100000,
      maxInvestment: 2000000,
      projectedROI: 24,
      term: '3 years',
      status: 'open',
      investors: 12,
      funded: 45,
      targetRaise: 5000000,
      highlight: 'Passive Income',
      benefits: ['Quarterly distributions', 'No dilution', 'Revenue-based returns'],
      detailedDescription: 'Partner with us through a revenue-sharing agreement that provides consistent quarterly income without equity dilution. This structure allows you to participate in our growth while maintaining a predictable income stream.',
      projections: [
        { year: 1, revenue: 2400000, distribution: 60000, roi: 6 },
        { year: 2, revenue: 3600000, distribution: 90000, roi: 15 },
        { year: 3, revenue: 4800000, distribution: 120000, roi: 24 }
      ],
      risks: ['Revenue fluctuation risk', 'Priority payment to debt holders', 'No equity upside'],
      timeline: [
        { milestone: 'Commitment Period', date: 'May 2026', status: 'current' },
        { milestone: 'First Distribution', date: 'Q3 2026', status: 'upcoming' },
        { milestone: 'Full Maturity', date: 'May 2029', status: 'future' }
      ],
      documents: [
        { name: 'Investment Memorandum', type: 'PDF', size: '2.4 MB' },
        { name: 'Revenue Share Agreement', type: 'PDF', size: '1.8 MB' },
        { name: 'Financial Projections', type: 'XLSX', size: '450 KB' },
        { name: 'Risk Disclosure', type: 'PDF', size: '890 KB' }
      ],
      team: [
        { name: 'Eric Erb', role: 'CEO & Founder', experience: '15+ years construction' },
        { name: 'Jennifer Lee', role: 'CFO', experience: '20+ years finance' }
      ]
    },
    {
      id: 'COMP-002',
      title: 'Preferred Equity Shares',
      category: 'Company Equity',
      description: 'Priority returns with liquidation preference',
      minInvestment: 500000,
      maxInvestment: 5000000,
      projectedROI: 35,
      term: '5 years',
      status: 'open',
      investors: 3,
      funded: 28,
      targetRaise: 10000000,
      highlight: 'Priority Returns',
      benefits: ['1.5x liquidation preference', 'Anti-dilution rights', 'Board observer seat'],
      detailedDescription: 'Secure preferred equity ownership with priority returns and downside protection. This investment vehicle provides you with a senior position in the capital structure, ensuring you receive distributions before common shareholders.',
      projections: [
        { year: 1, revenue: 5200000, distribution: 175000, roi: 7 },
        { year: 2, revenue: 7800000, distribution: 262500, roi: 14.5 },
        { year: 3, revenue: 11700000, distribution: 393750, roi: 22.9 },
        { year: 4, revenue: 17550000, distribution: 590625, roi: 30.4 },
        { year: 5, revenue: 26325000, distribution: 885938, roi: 35.0 }
      ],
      risks: ['Company performance risk', 'Illiquidity until exit event', 'Subordinate to debt holders'],
      timeline: [
        { milestone: 'Investment Closing', date: 'June 2026', status: 'current' },
        { milestone: 'First Annual Distribution', date: 'Q2 2027', status: 'upcoming' },
        { milestone: 'Expected Exit Event', date: 'Q2 2031', status: 'future' }
      ],
      documents: [
        { name: 'Preferred Stock Purchase Agreement', type: 'PDF', size: '3.2 MB' },
        { name: 'Company Financial Statements', type: 'PDF', size: '2.8 MB' },
        { name: 'Market Analysis Report', type: 'PDF', size: '4.1 MB' },
        { name: 'Legal Due Diligence', type: 'PDF', size: '5.5 MB' }
      ],
      team: [
        { name: 'Eric Erb', role: 'CEO & Founder', experience: '15+ years construction' },
        { name: 'Jennifer Lee', role: 'CFO', experience: '20+ years finance' },
        { name: 'Morgan Stanley', role: 'Investment Banker', experience: 'Lead underwriter' }
      ]
    },
    {
      id: 'COMP-003',
      title: 'Territory Franchise Ownership',
      category: 'Company Equity',
      description: 'Own and operate a protected territory',
      minInvestment: 750000,
      maxInvestment: 2500000,
      projectedROI: 42,
      term: '10 years',
      status: 'open',
      investors: 2,
      funded: 15,
      targetRaise: 15000000,
      highlight: 'Build Your Empire',
      benefits: ['Exclusive territory rights', 'Full training & support', 'Brand & tech licensing'],
      detailedDescription: 'Become a territory owner and build your own construction empire with our proven business model. You receive exclusive rights to operate in a designated territory with full access to our brand, technology platform, vendor relationships, and operational playbooks.',
      projections: [
        { year: 1, revenue: 1200000, distribution: 150000, roi: 4.2 },
        { year: 3, revenue: 3600000, distribution: 450000, roi: 14.3 },
        { year: 5, revenue: 7200000, distribution: 900000, roi: 26.7 },
        { year: 10, revenue: 18000000, distribution: 2250000, roi: 42.0 }
      ],
      risks: ['Business execution risk', 'Local market conditions', 'Competition in territory'],
      timeline: [
        { milestone: 'Territory Selection', date: 'June 2026', status: 'current' },
        { milestone: 'Training & Onboarding', date: 'August 2026', status: 'upcoming' },
        { milestone: 'Grand Opening', date: 'October 2026', status: 'upcoming' },
        { milestone: 'First Profitability', date: 'Q2 2027', status: 'future' }
      ],
      documents: [
        { name: 'Franchise Disclosure Document', type: 'PDF', size: '8.2 MB' },
        { name: 'Territory Map & Demographics', type: 'PDF', size: '4.5 MB' },
        { name: 'Operations Manual', type: 'PDF', size: '12.1 MB' },
        { name: 'Financial Performance Summary', type: 'PDF', size: '2.7 MB' }
      ],
      team: [
        { name: 'Eric Erb', role: 'Franchisor & CEO', experience: '15+ years, built 8-figure business' },
        { name: 'Franchise Support Team', role: 'Operations', experience: 'Dedicated territory support' }
      ]
    },
    {
      id: 'COMP-004',
      title: 'Convertible Note - Series B',
      category: 'Company Equity',
      description: 'Debt with equity upside and 20% discount',
      minInvestment: 250000,
      maxInvestment: 3000000,
      projectedROI: 45,
      term: '2 years',
      status: 'open',
      investors: 8,
      funded: 62,
      targetRaise: 8000000,
      highlight: 'High Upside',
      benefits: ['20% conversion discount', '8% annual interest', 'Equity participation'],
      detailedDescription: 'Invest through a convertible note that provides 8% annual interest payments while preserving the option to convert into equity at a 20% discount during our Series B round. This structure gives you downside protection with significant upside potential.',
      projections: [
        { year: 1, revenue: 8500000, distribution: 20000, roi: 8 },
        { year: 2, revenue: 15300000, distribution: 362500, roi: 45 }
      ],
      risks: ['Conversion trigger may not occur', 'Dilution in future rounds', 'Company valuation risk'],
      timeline: [
        { milestone: 'Note Issuance', date: 'May 2026', status: 'current' },
        { milestone: 'First Interest Payment', date: 'May 2027', status: 'upcoming' },
        { milestone: 'Series B Round / Conversion', date: 'Q2 2028', status: 'future' },
        { milestone: 'Note Maturity', date: 'May 2028', status: 'future' }
      ],
      documents: [
        { name: 'Convertible Note Agreement', type: 'PDF', size: '2.8 MB' },
        { name: 'Conversion Terms Sheet', type: 'PDF', size: '980 KB' },
        { name: 'Company Capitalization Table', type: 'PDF', size: '1.2 MB' },
        { name: 'Series B Projections', type: 'PDF', size: '3.4 MB' }
      ],
      team: [
        { name: 'Eric Erb', role: 'CEO & Founder', experience: '15+ years construction' },
        { name: 'Jennifer Lee', role: 'CFO', experience: '20+ years finance' },
        { name: 'Goldman Sachs', role: 'Series B Lead', experience: 'Investment banking' }
      ]
    }
  ];

  const propertyOpportunities = [
    {
      id: 'PROP-024',
      title: 'Fractional Luxury Condo',
      category: 'Fractional Ownership',
      description: 'Own 1/10th of a $2M Miami Beach property',
      minInvestment: 25000,
      maxInvestment: 200000,
      projectedROI: 18,
      term: '5 years',
      status: 'open',
      investors: 7,
      funded: 70,
      targetRaise: 2000000,
      highlight: 'Low Entry',
      benefits: ['Monthly rental income', 'Appreciation upside', 'Easy exit liquidity'],
      detailedDescription: 'Invest in a professionally managed luxury oceanfront condo in Miami Beach through fractional ownership. Each investor owns a proportional share with access to rental income and property appreciation without the hassle of property management.',
      location: 'Miami Beach, FL',
      propertyDetails: {
        type: 'Luxury Condo',
        bedrooms: 3,
        bathrooms: 3,
        sqft: 2400,
        yearBuilt: 2022,
        amenities: ['Ocean view', 'Pool', 'Gym', 'Concierge', 'Parking']
      },
      projections: [
        { year: 1, propertyValue: 2000000, rentalIncome: 72000, roi: 3.6 },
        { year: 2, propertyValue: 2100000, rentalIncome: 78000, roi: 7.9 },
        { year: 3, propertyValue: 2200000, rentalIncome: 84000, roi: 12.4 },
        { year: 4, propertyValue: 2320000, rentalIncome: 90000, roi: 16.1 },
        { year: 5, propertyValue: 2450000, rentalIncome: 96000, roi: 18.0 }
      ],
      risks: ['Market value fluctuation', 'Rental vacancy risk', 'Exit liquidity dependent on marketplace'],
      timeline: [
        { milestone: 'Funding Close', date: 'June 2026', status: 'current' },
        { milestone: 'Property Transfer', date: 'July 2026', status: 'upcoming' },
        { milestone: 'First Rental Income', date: 'August 2026', status: 'upcoming' },
        { milestone: 'Exit Window Opens', date: 'June 2031', status: 'future' }
      ],
      documents: [
        { name: 'Property Prospectus', type: 'PDF', size: '5.2 MB' },
        { name: 'Fractional Ownership Agreement', type: 'PDF', size: '2.1 MB' },
        { name: 'Property Appraisal', type: 'PDF', size: '3.8 MB' },
        { name: 'Management Agreement', type: 'PDF', size: '1.2 MB' },
        { name: 'Property Photos', type: 'ZIP', size: '45 MB' }
      ],
      team: [
        { name: 'Coastal Property Group', role: 'Property Manager', experience: '25+ years luxury rentals' },
        { name: 'Miami Legal Partners', role: 'Legal Counsel', experience: 'Real estate specialists' }
      ]
    },
    {
      id: 'PROP-025',
      title: 'Fix & Flip Syndication',
      category: 'Value-Add',
      description: 'Pool funds for profitable house flipping projects',
      minInvestment: 50000,
      maxInvestment: 500000,
      projectedROI: 35,
      term: '18 months',
      status: 'open',
      investors: 15,
      funded: 88,
      targetRaise: 3500000,
      currentCommitments: 3080000,
      minimumToStart: 3500000,
      needsMoreFunding: true,
      silentInvestment: true,
      highlight: 'Quick Returns',
      benefits: ['Short-term gains', 'Professional management', 'Proven track record', 'Silent passive investment'],
      detailedDescription: 'Join our proven fix-and-flip syndication fund targeting undervalued properties in high-growth markets. Our experienced team has completed 47 successful flips with an average ROI of 38% over 16 months.',
      location: 'Austin, TX Metro',
      propertyDetails: {
        type: 'Single Family Portfolio',
        bedrooms: 3,
        bathrooms: 2,
        sqft: 1800,
        yearBuilt: 1995,
        amenities: ['Full renovation', 'Modern finishes', 'Smart home tech', 'Energy efficient']
      },
      projections: [
        { year: 0, propertyValue: 3500000, rentalIncome: 0, roi: 0 },
        { year: 1, propertyValue: 4200000, rentalIncome: 0, roi: 20 },
        { year: 1.5, propertyValue: 4725000, rentalIncome: 0, roi: 35 }
      ],
      risks: ['Market timing risk', 'Construction cost overruns', 'Extended holding period'],
      timeline: [
        { milestone: 'Fund Closes', date: 'May 2026', status: 'current' },
        { milestone: 'Property Acquisitions', date: 'June 2026', status: 'upcoming' },
        { milestone: 'Renovations Complete', date: 'December 2026', status: 'upcoming' },
        { milestone: 'Properties Sold & Distribution', date: 'November 2027', status: 'future' }
      ],
      documents: [
        { name: 'Syndication Offering Memorandum', type: 'PDF', size: '6.8 MB' },
        { name: 'Past Performance Report', type: 'PDF', size: '3.2 MB' },
        { name: 'Target Property List', type: 'PDF', size: '2.4 MB' },
        { name: 'Operating Agreement', type: 'PDF', size: '1.9 MB' }
      ],
      team: [
        { name: 'Texas Home Flippers LLC', role: 'Fund Manager', experience: '47 successful flips, 12 years' },
        { name: 'Austin Contractors Group', role: 'General Contractor', experience: 'Licensed & bonded' }
      ]
    },
    {
      id: 'PROP-026',
      title: 'Multi-Family REIT Fund',
      category: 'REIT',
      description: 'Diversified portfolio of 50+ rental properties',
      minInvestment: 10000,
      maxInvestment: 1000000,
      projectedROI: 22,
      term: 'Ongoing',
      status: 'open',
      investors: 124,
      funded: 92,
      targetRaise: 50000000,
      currentCommitments: 46000000,
      minimumToStart: 50000000,
      needsMoreFunding: true,
      silentInvestment: true,
      highlight: 'Diversified',
      benefits: ['Monthly dividends', 'Low minimum', 'Professional management', 'Silent passive investment'],
      detailedDescription: 'Invest in a professionally managed REIT with a diversified portfolio of 50+ multi-family properties across high-growth markets. Receive monthly dividend distributions while benefiting from property appreciation and professional asset management.',
      location: 'Nationwide Portfolio',
      propertyDetails: {
        type: 'Multi-Family REIT',
        bedrooms: 0,
        bathrooms: 0,
        sqft: 0,
        yearBuilt: 0,
        amenities: ['52 properties', '1,840 units', '94% occupied', 'Professional management', '$127M portfolio value']
      },
      projections: [
        { year: 1, propertyValue: 50000000, rentalIncome: 550000, roi: 5.5 },
        { year: 2, propertyValue: 52500000, rentalIncome: 1155000, roi: 11.6 },
        { year: 3, propertyValue: 55125000, rentalIncome: 1815750, roi: 17.9 },
        { year: 5, propertyValue: 60775000, rentalIncome: 2750000, roi: 22.0 }
      ],
      risks: ['Market cycle risk', 'Interest rate sensitivity', 'Property management performance'],
      timeline: [
        { milestone: 'Investment Open', date: 'Ongoing', status: 'current' },
        { milestone: 'First Dividend', date: '30 days after investment', status: 'upcoming' },
        { milestone: 'Quarterly Statements', date: 'Every quarter', status: 'upcoming' }
      ],
      documents: [
        { name: 'REIT Prospectus', type: 'PDF', size: '14.2 MB' },
        { name: 'Property Portfolio Summary', type: 'PDF', size: '8.5 MB' },
        { name: 'Historical Performance', type: 'PDF', size: '3.1 MB' },
        { name: 'Subscription Agreement', type: 'PDF', size: '2.4 MB' }
      ],
      team: [
        { name: 'National Property REIT', role: 'Fund Manager', experience: '$2.4B AUM, 18 years' },
        { name: 'Regional Management Teams', role: 'Property Operations', experience: 'Local market experts' }
      ]
    },
    {
      id: 'PROP-027',
      title: 'Ground-Up Development',
      category: 'Development',
      description: 'New construction - 24-unit apartment building',
      minInvestment: 200000,
      maxInvestment: 2000000,
      projectedROI: 48,
      term: '4 years',
      status: 'open',
      investors: 6,
      funded: 34,
      targetRaise: 12000000,
      currentCommitments: 4080000,
      minimumToStart: 12000000,
      needsMoreFunding: true,
      silentInvestment: true,
      highlight: 'Highest Returns',
      benefits: ['New construction premium', 'Tax advantages', 'Forced appreciation', 'Silent passive investment'],
      detailedDescription: 'Participate in ground-up development of a 24-unit luxury apartment building in a high-demand urban location. This project offers the highest potential returns through new construction premiums, tax depreciation benefits, and immediate value-add positioning.',
      location: 'Denver, CO',
      propertyDetails: {
        type: 'New Construction Multi-Family',
        bedrooms: 24,
        bathrooms: 48,
        sqft: 28800,
        yearBuilt: 2027,
        amenities: ['Rooftop deck', 'Fitness center', 'Co-working space', 'EV charging', 'Smart units']
      },
      projections: [
        { year: 1, propertyValue: 12000000, rentalIncome: 0, roi: 0 },
        { year: 2, propertyValue: 14000000, rentalIncome: 480000, roi: 12 },
        { year: 3, propertyValue: 16000000, rentalIncome: 960000, roi: 28 },
        { year: 4, propertyValue: 17760000, rentalIncome: 1440000, roi: 48 }
      ],
      risks: ['Construction delays', 'Cost overruns', 'Lease-up risk', 'Market conditions'],
      timeline: [
        { milestone: 'Land Acquisition', date: 'July 2026', status: 'current' },
        { milestone: 'Construction Start', date: 'September 2026', status: 'upcoming' },
        { milestone: 'Construction Complete', date: 'March 2028', status: 'future' },
        { milestone: 'Stabilized & Exit', date: 'July 2030', status: 'future' }
      ],
      documents: [
        { name: 'Development Pro Forma', type: 'PDF', size: '6.8 MB' },
        { name: 'Architectural Renderings', type: 'PDF', size: '28.4 MB' },
        { name: 'Market Study', type: 'PDF', size: '5.2 MB' },
        { name: 'Construction Budget', type: 'XLSX', size: '890 KB' }
      ],
      team: [
        { name: 'Urban Development Partners', role: 'Developer', experience: '34 projects, $580M developed' },
        { name: 'Premier Construction Co', role: 'General Contractor', experience: 'Licensed, bonded, insured' }
      ]
    },
    {
      id: 'PROP-028',
      title: '1031 Exchange Portfolio',
      category: 'Tax-Deferred',
      description: 'Tax-deferred exchange into performing assets',
      minInvestment: 500000,
      maxInvestment: 10000000,
      projectedROI: 26,
      term: '7 years',
      status: 'open',
      investors: 4,
      funded: 51,
      targetRaise: 25000000,
      highlight: 'Tax Benefits',
      benefits: ['Defer capital gains', 'Step-up basis', 'Estate planning'],
      detailedDescription: 'Execute a 1031 exchange into a portfolio of institutional-grade properties while deferring capital gains taxes. This Delaware Statutory Trust (DST) structure provides fractional ownership in professionally managed commercial real estate.',
      location: 'Multi-State Portfolio',
      propertyDetails: {
        type: '1031 DST Portfolio',
        bedrooms: 0,
        bathrooms: 0,
        sqft: 0,
        yearBuilt: 0,
        amenities: ['Triple net leases', 'Investment grade tenants', 'Passive ownership', 'Tax deferral', 'Estate planning']
      },
      projections: [
        { year: 1, propertyValue: 25000000, rentalIncome: 650000, roi: 2.6 },
        { year: 3, propertyValue: 26500000, rentalIncome: 2010000, roi: 10.8 },
        { year: 5, propertyValue: 28090000, rentalIncome: 3575000, roi: 18.6 },
        { year: 7, propertyValue: 29775000, rentalIncome: 5265000, roi: 26.0 }
      ],
      risks: ['Tenant default risk', 'Limited liquidity', 'Property concentration'],
      timeline: [
        { milestone: '1031 Identification', date: 'Within 45 days', status: 'current' },
        { milestone: 'Exchange Completion', date: 'Within 180 days', status: 'upcoming' },
        { milestone: 'First Distribution', date: '30 days post-close', status: 'upcoming' },
        { milestone: 'Hold Period Ends', date: '7 years', status: 'future' }
      ],
      documents: [
        { name: '1031 DST Offering Memorandum', type: 'PDF', size: '12.4 MB' },
        { name: 'Property Appraisals', type: 'PDF', size: '8.9 MB' },
        { name: 'Tenant Lease Abstracts', type: 'PDF', size: '4.2 MB' },
        { name: 'Tax Benefits Analysis', type: 'PDF', size: '2.1 MB' }
      ],
      team: [
        { name: 'National DST Sponsor', role: 'Sponsor/Manager', experience: '$4.2B in 1031 exchanges' },
        { name: 'Tax & Legal Advisors', role: 'Compliance', experience: '1031 exchange specialists' }
      ]
    },
    {
      id: 'PROP-029',
      title: 'Passive Income Program',
      category: 'Turnkey',
      description: 'Fully managed rental with guaranteed income',
      minInvestment: 75000,
      maxInvestment: 750000,
      projectedROI: 16,
      term: '10 years',
      status: 'open',
      investors: 22,
      funded: 78,
      targetRaise: 15000000,
      highlight: 'Zero Work',
      benefits: ['Guaranteed 12% income', 'Full property management', 'Maintenance included'],
      detailedDescription: 'Invest in turnkey rental properties with a guaranteed 12% annual income and zero landlord responsibilities. We handle everything: tenant placement, maintenance, repairs, and property management. Perfect for truly passive real estate income.',
      location: 'Nashville, TN',
      propertyDetails: {
        type: 'Turnkey Single Family',
        bedrooms: 3,
        bathrooms: 2,
        sqft: 1650,
        yearBuilt: 2018,
        amenities: ['Tenant guaranteed', 'Property management', 'Maintenance reserve', 'HOA included', 'Insurance covered']
      },
      projections: [
        { year: 1, propertyValue: 75000, rentalIncome: 9000, roi: 12 },
        { year: 3, propertyValue: 78000, rentalIncome: 27360, roi: 13.5 },
        { year: 5, propertyValue: 81120, rentalIncome: 46224, roi: 14.8 },
        { year: 10, propertyValue: 87120, rentalIncome: 104544, roi: 16.0 }
      ],
      risks: ['Tenant turnover', 'Major repair costs', 'Property value stagnation'],
      timeline: [
        { milestone: 'Property Purchase', date: 'June 2026', status: 'current' },
        { milestone: 'Tenant Placement', date: 'July 2026', status: 'upcoming' },
        { milestone: 'First Income Payment', date: 'August 2026', status: 'upcoming' },
        { milestone: 'Contract Ends', date: 'June 2036', status: 'future' }
      ],
      documents: [
        { name: 'Turnkey Investment Agreement', type: 'PDF', size: '3.2 MB' },
        { name: 'Property Inspection Report', type: 'PDF', size: '5.8 MB' },
        { name: 'Income Guarantee Terms', type: 'PDF', size: '1.4 MB' },
        { name: 'Management Agreement', type: 'PDF', size: '2.1 MB' }
      ],
      team: [
        { name: 'Turnkey Property Solutions', role: 'Property Manager', experience: '1,200+ managed properties' },
        { name: 'Nashville Realty Group', role: 'Local Broker', experience: '22 years local market' }
      ]
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'performing': return 'bg-green-500/10 text-green-400 border-green-500/20';
      case 'attention': return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
      case 'open': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      default: return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
    }
  };

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: Home },
    { id: 'portfolio', label: 'Portfolio', icon: Briefcase },
    { id: 'opportunities', label: 'Opportunities', icon: Target },
    { id: 'reports', label: 'Reports', icon: BarChart3 },
    { id: 'distributions', label: 'Distributions', icon: DollarSign },
    { id: 'documents', label: 'Documents', icon: FileText },
    { id: 'referrals', label: 'Referral Rewards', icon: Award }
  ];

  const handleOpenOpportunity = (opportunity: any) => {
    setSelectedOpportunity(opportunity);
    setInvestmentAmount(opportunity.minInvestment.toString());
    setShowOpportunityModal(true);
  };

  const handleInvest = () => {
    const amount = parseFloat(investmentAmount);
    if (amount < selectedOpportunity.minInvestment) {
      toast.error(`Minimum investment is $${selectedOpportunity.minInvestment.toLocaleString()}`);
      return;
    }
    if (selectedOpportunity.maxInvestment && amount > selectedOpportunity.maxInvestment) {
      toast.error(`Maximum investment is $${selectedOpportunity.maxInvestment.toLocaleString()}`);
      return;
    }

    // Close the opportunity modal and open the application
    setShowOpportunityModal(false);
    setShowApplication(true);
  };

  const handleApplicationSubmit = (appData: any) => {
    setApplicationData(appData);
    setShowApplication(false);
    setShowContract(true);
    toast.success('Application submitted! Review your investment contract below.');
  };

  const calculateProjectedReturn = () => {
    if (!selectedOpportunity || !investmentAmount) return 0;
    const amount = parseFloat(investmentAmount);
    return (amount * selectedOpportunity.projectedROI) / 100;
  };

  return (
    <LayoutManager pageName="Investor Portal" enableCustomization={true} showEditButton={true}>
      <div className="min-h-screen bg-[#0A0A0A]" style={{ display: 'block', width: '100%' }}>
        {/* Investment Application */}
        {showApplication && selectedOpportunity && (
          <InvestmentApplication
            opportunity={selectedOpportunity}
            investmentAmount={parseFloat(investmentAmount)}
            onClose={() => setShowApplication(false)}
            onSubmit={handleApplicationSubmit}
          />
        )}

        {/* Investment Contract */}
        {showContract && applicationData && selectedOpportunity && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 overflow-y-auto">
            <div className="my-8 w-full flex items-center justify-center">
              <div className="relative">
                <button
                  onClick={() => {
                    setShowContract(false);
                    setApplicationData(null);
                    toast.success('Contract saved to your documents!');
                  }}
                  className="absolute top-4 right-4 z-10 p-2 rounded-lg bg-[#0A0A0A] border border-[#2A2A2A] text-gray-400 hover:text-white hover:border-red-500/30 transition"
                >
                  <X className="w-5 h-5" />
                </button>
                <InvestmentContract
                  applicationData={applicationData}
                  opportunity={selectedOpportunity}
                />
              </div>
            </div>
          </div>
        )}

        {/* Opportunity Detail Modal */}
        {showOpportunityModal && selectedOpportunity && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
            <div className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] max-w-5xl w-full max-h-[90vh] overflow-y-auto">
              {/* Modal Header */}
              <div className="sticky top-0 bg-[#1A1A1A] border-b border-[#2A2A2A] p-6 flex items-start justify-between z-10">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h2 className="text-2xl font-bold text-white">{selectedOpportunity.title}</h2>
                    <span className={`px-3 py-1 rounded-lg text-xs font-semibold ${
                      selectedOpportunity.category === 'Company Equity'
                        ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                        : 'bg-orange-500/20 text-orange-300 border border-orange-500/30'
                    }`}>
                      {selectedOpportunity.highlight}
                    </span>
                  </div>
                  <p className="text-gray-400">{selectedOpportunity.category}</p>
                  {selectedOpportunity.location && (
                    <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                      <MapPin className="w-3 h-3" />
                      {selectedOpportunity.location}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => setShowOpportunityModal(false)}
                  className="p-2 rounded-lg bg-[#0A0A0A] border border-[#2A2A2A] text-gray-400 hover:text-white hover:border-red-500/30 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-6 space-y-6">
                {/* Key Metrics Grid */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div className="bg-[#0A0A0A] rounded-lg border border-[#2A2A2A] p-4">
                    <p className="text-xs text-gray-500 mb-1">Projected ROI</p>
                    <p className="text-2xl font-bold text-green-400">{selectedOpportunity.projectedROI}%</p>
                  </div>
                  <div className="bg-[#0A0A0A] rounded-lg border border-[#2A2A2A] p-4">
                    <p className="text-xs text-gray-500 mb-1">Min Investment</p>
                    <p className="text-xl font-bold text-white">${(selectedOpportunity.minInvestment / 1000)}K</p>
                  </div>
                  <div className="bg-[#0A0A0A] rounded-lg border border-[#2A2A2A] p-4">
                    <p className="text-xs text-gray-500 mb-1">Term</p>
                    <p className="text-xl font-bold text-white">{selectedOpportunity.term}</p>
                  </div>
                  <div className="bg-[#0A0A0A] rounded-lg border border-[#2A2A2A] p-4">
                    <p className="text-xs text-gray-500 mb-1">Funded</p>
                    <p className="text-xl font-bold text-blue-400">{selectedOpportunity.funded}%</p>
                  </div>
                  <div className="bg-[#0A0A0A] rounded-lg border border-[#2A2A2A] p-4">
                    <p className="text-xs text-gray-500 mb-1">Investors</p>
                    <p className="text-xl font-bold text-white">{selectedOpportunity.investors}</p>
                  </div>
                </div>

                {/* Funding Progress */}
                <div className="bg-[#0A0A0A] rounded-lg border border-[#2A2A2A] p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-semibold text-white">Funding Progress</p>
                    <p className="text-sm text-gray-400">
                      ${((selectedOpportunity.targetRaise * selectedOpportunity.funded) / 100).toLocaleString()} of ${selectedOpportunity.targetRaise.toLocaleString()}
                    </p>
                  </div>
                  <div className="w-full bg-[#1A1A1A] rounded-full h-3">
                    <div
                      className="h-3 rounded-full bg-gradient-to-r from-green-600 to-emerald-500 transition-all"
                      style={{ width: `${selectedOpportunity.funded}%` }}
                    />
                  </div>
                </div>

                {/* Project Funding Counter - Only for specific opportunities */}
                {selectedOpportunity.needsMoreFunding && (
                  <div className="bg-gradient-to-br from-blue-600/10 to-cyan-600/10 border border-blue-500/30 rounded-xl p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
                          <Target className="w-5 h-5 text-blue-400" />
                          Project Funding Counter
                        </h3>
                        <p className="text-sm text-gray-400">Minimum needed to begin project execution</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-500">Status</p>
                        <p className="text-sm font-semibold text-yellow-400">Fundraising</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4 mb-4">
                      <div className="bg-[#0A0A0A] border border-blue-500/20 rounded-lg p-4">
                        <p className="text-xs text-gray-400 mb-1">Minimum to Start</p>
                        <p className="text-xl font-bold text-white">${(selectedOpportunity.minimumToStart / 1000000).toFixed(1)}M</p>
                      </div>
                      <div className="bg-[#0A0A0A] border border-green-500/20 rounded-lg p-4">
                        <p className="text-xs text-gray-400 mb-1">Committed So Far</p>
                        <p className="text-xl font-bold text-green-400">${(selectedOpportunity.currentCommitments / 1000000).toFixed(1)}M</p>
                      </div>
                      <div className="bg-[#0A0A0A] border border-orange-500/20 rounded-lg p-4">
                        <p className="text-xs text-gray-400 mb-1">Still Needed</p>
                        <p className="text-xl font-bold text-orange-400">
                          ${((selectedOpportunity.minimumToStart - selectedOpportunity.currentCommitments) / 1000000).toFixed(1)}M
                        </p>
                      </div>
                    </div>

                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-semibold text-white">Progress to Project Start</p>
                        <p className="text-sm text-gray-400">
                          {((selectedOpportunity.currentCommitments / selectedOpportunity.minimumToStart) * 100).toFixed(1)}%
                        </p>
                      </div>
                      <div className="w-full bg-[#1A1A1A] rounded-full h-4">
                        <div
                          className="h-4 rounded-full bg-gradient-to-r from-blue-600 to-cyan-500 transition-all flex items-center justify-end pr-2"
                          style={{ width: `${(selectedOpportunity.currentCommitments / selectedOpportunity.minimumToStart) * 100}%` }}
                        >
                          <span className="text-xs font-bold text-white">
                            {((selectedOpportunity.currentCommitments / selectedOpportunity.minimumToStart) * 100).toFixed(0)}%
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-[#0A0A0A] border border-blue-500/20 rounded-lg p-4 flex items-start gap-3">
                      <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-semibold text-white mb-1">Committed Investors</p>
                        <p className="text-xs text-gray-400">
                          <strong className="text-white">{selectedOpportunity.investors} investors</strong> have committed ${(selectedOpportunity.currentCommitments / 1000000).toFixed(1)}M.
                          Once we reach ${(selectedOpportunity.minimumToStart / 1000000).toFixed(1)}M, the project will begin immediately.
                          Your investment is held in escrow until the minimum is reached.
                        </p>
                      </div>
                    </div>

                    <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 flex items-start gap-3 mt-4">
                      <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-semibold text-white mb-1">Silent Investment Structure</p>
                        <p className="text-xs text-gray-400">
                          This is a <strong className="text-white">passive, silent investment</strong>. You will have full access to all financial reports
                          and performance data, but <strong className="text-white">no operational control or decision-making authority</strong>. All
                          project decisions are made by the professional management team.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Description */}
                <div className="bg-[#0A0A0A] rounded-lg border border-[#2A2A2A] p-6">
                  <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                    <Info className="w-5 h-5 text-orange-400" />
                    Investment Overview
                  </h3>
                  <p className="text-gray-300 leading-relaxed mb-4">{selectedOpportunity.detailedDescription}</p>

                  {/* Property Details if applicable */}
                  {selectedOpportunity.propertyDetails && (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-4 pt-4 border-t border-[#2A2A2A]">
                      <div>
                        <p className="text-xs text-gray-500">Property Type</p>
                        <p className="text-white font-semibold">{selectedOpportunity.propertyDetails.type}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Bedrooms</p>
                        <p className="text-white font-semibold">{selectedOpportunity.propertyDetails.bedrooms} BR</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Square Feet</p>
                        <p className="text-white font-semibold">{selectedOpportunity.propertyDetails.sqft.toLocaleString()} sqft</p>
                      </div>
                      <div className="col-span-2 md:col-span-3">
                        <p className="text-xs text-gray-500 mb-2">Amenities</p>
                        <div className="flex flex-wrap gap-2">
                          {selectedOpportunity.propertyDetails.amenities.map((amenity: string, idx: number) => (
                            <span key={idx} className="px-2 py-1 bg-[#1A1A1A] border border-[#2A2A2A] rounded text-xs text-gray-300">
                              {amenity}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Key Benefits */}
                <div className="bg-[#0A0A0A] rounded-lg border border-[#2A2A2A] p-6">
                  <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-400" />
                    Key Benefits
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {selectedOpportunity.benefits.map((benefit: string, idx: number) => (
                      <div key={idx} className="flex items-start gap-3 bg-[#1A1A1A] border border-green-500/20 rounded-lg p-3">
                        <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-gray-300">{benefit}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Financial Projections */}
                {selectedOpportunity.projections && (
                  <div className="bg-[#0A0A0A] rounded-lg border border-[#2A2A2A] p-6">
                    <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-green-400" />
                      Financial Projections
                    </h3>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-[#2A2A2A]">
                            <th className="text-left py-3 px-4 text-sm font-semibold text-gray-400">Year</th>
                            {selectedOpportunity.projections[0].propertyValue !== undefined && (
                              <th className="text-left py-3 px-4 text-sm font-semibold text-gray-400">Property Value</th>
                            )}
                            {selectedOpportunity.projections[0].revenue !== undefined && (
                              <th className="text-left py-3 px-4 text-sm font-semibold text-gray-400">Revenue</th>
                            )}
                            {selectedOpportunity.projections[0].rentalIncome !== undefined && (
                              <th className="text-left py-3 px-4 text-sm font-semibold text-gray-400">Rental Income</th>
                            )}
                            {selectedOpportunity.projections[0].distribution !== undefined && (
                              <th className="text-left py-3 px-4 text-sm font-semibold text-gray-400">Distribution</th>
                            )}
                            <th className="text-left py-3 px-4 text-sm font-semibold text-gray-400">Cumulative ROI</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedOpportunity.projections.map((proj: any, idx: number) => (
                            <tr key={idx} className="border-b border-[#2A2A2A]">
                              <td className="py-3 px-4 text-white font-semibold">Year {proj.year}</td>
                              {proj.propertyValue !== undefined && (
                                <td className="py-3 px-4 text-white">${(proj.propertyValue / 1000000).toFixed(2)}M</td>
                              )}
                              {proj.revenue !== undefined && (
                                <td className="py-3 px-4 text-white">${(proj.revenue / 1000000).toFixed(2)}M</td>
                              )}
                              {proj.rentalIncome !== undefined && (
                                <td className="py-3 px-4 text-green-400">${proj.rentalIncome.toLocaleString()}</td>
                              )}
                              {proj.distribution !== undefined && (
                                <td className="py-3 px-4 text-green-400">${proj.distribution.toLocaleString()}</td>
                              )}
                              <td className="py-3 px-4 text-green-400 font-semibold">{proj.roi}%</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Timeline */}
                {selectedOpportunity.timeline && (
                  <div className="bg-[#0A0A0A] rounded-lg border border-[#2A2A2A] p-6">
                    <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-blue-400" />
                      Investment Timeline
                    </h3>
                    <div className="space-y-3">
                      {selectedOpportunity.timeline.map((item: any, idx: number) => (
                        <div key={idx} className="flex items-center gap-4">
                          <div className={`w-3 h-3 rounded-full flex-shrink-0 ${
                            item.status === 'current' ? 'bg-orange-500' :
                            item.status === 'upcoming' ? 'bg-blue-500' :
                            'bg-gray-600'
                          }`} />
                          <div className="flex-1">
                            <p className="text-white font-semibold">{item.milestone}</p>
                            <p className="text-sm text-gray-400">{item.date}</p>
                          </div>
                          <span className={`px-2 py-1 rounded text-xs font-semibold ${
                            item.status === 'current' ? 'bg-orange-500/20 text-orange-300 border border-orange-500/30' :
                            item.status === 'upcoming' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' :
                            'bg-gray-500/20 text-gray-400 border border-gray-500/30'
                          }`}>
                            {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Risk Factors */}
                {selectedOpportunity.risks && (
                  <div className="bg-[#0A0A0A] rounded-lg border border-red-500/20 p-6">
                    <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                      <Shield className="w-5 h-5 text-red-400" />
                      Risk Factors
                    </h3>
                    <div className="space-y-2">
                      {selectedOpportunity.risks.map((risk: string, idx: number) => (
                        <div key={idx} className="flex items-start gap-3">
                          <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                          <p className="text-sm text-gray-300">{risk}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Team */}
                {selectedOpportunity.team && (
                  <div className="bg-[#0A0A0A] rounded-lg border border-[#2A2A2A] p-6">
                    <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                      <Users className="w-5 h-5 text-purple-400" />
                      Team & Management
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {selectedOpportunity.team.map((member: any, idx: number) => (
                        <div key={idx} className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg p-4">
                          <p className="font-semibold text-white mb-1">{member.name}</p>
                          <p className="text-sm text-gray-400 mb-1">{member.role}</p>
                          <p className="text-xs text-gray-500">{member.experience}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Documents */}
                {selectedOpportunity.documents && (
                  <div className="bg-[#0A0A0A] rounded-lg border border-[#2A2A2A] p-6">
                    <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                      <FileText className="w-5 h-5 text-blue-400" />
                      Investment Documents
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {selectedOpportunity.documents.map((doc: any, idx: number) => (
                        <button
                          key={idx}
                          onClick={() => toast.info(`Downloading ${doc.name}...`)}
                          className="flex items-center justify-between bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg p-4 hover:border-blue-500/30 transition group"
                        >
                          <div className="flex items-center gap-3">
                            <FileText className="w-5 h-5 text-blue-400" />
                            <div className="text-left">
                              <p className="text-sm font-semibold text-white">{doc.name}</p>
                              <p className="text-xs text-gray-500">{doc.type} • {doc.size}</p>
                            </div>
                          </div>
                          <Download className="w-4 h-4 text-gray-400 group-hover:text-blue-400 transition" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Investment Calculator */}
                <div className="bg-gradient-to-br from-orange-600/10 to-red-600/10 border border-orange-500/30 rounded-xl p-6">
                  <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <Calculator className="w-5 h-5 text-orange-400" />
                    Investment Calculator
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-white mb-2">Enter Your Investment Amount</label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl font-bold text-gray-400">$</span>
                        <input
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          value={investmentAmount}
                          onChange={(e) => {
                            // Only allow numbers and remove any non-numeric characters
                            const value = e.target.value.replace(/[^0-9]/g, '');
                            setInvestmentAmount(value);
                          }}
                          className="w-full bg-[#0A0A0A] border-2 border-orange-500/30 rounded-lg pl-10 pr-4 py-4 text-white text-2xl font-bold focus:outline-none focus:border-orange-500 transition [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          placeholder="100000"
                        />
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <p className="text-xs text-gray-400">
                          Minimum: <span className="text-white font-semibold">${selectedOpportunity.minInvestment.toLocaleString()}</span>
                        </p>
                        <p className="text-xs text-gray-400">
                          Maximum: <span className="text-white font-semibold">${selectedOpportunity.maxInvestment?.toLocaleString() || 'No limit'}</span>
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 bg-[#0A0A0A] rounded-lg border border-[#2A2A2A] p-4">
                      <div>
                        <p className="text-sm text-gray-400 mb-1">Projected Return ({selectedOpportunity.projectedROI}%)</p>
                        <p className="text-2xl font-bold text-green-400">
                          ${calculateProjectedReturn().toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-400 mb-1">Total Value at Maturity</p>
                        <p className="text-2xl font-bold text-white">
                          ${(parseFloat(investmentAmount || '0') + calculateProjectedReturn()).toLocaleString()}
                        </p>
                      </div>
                    </div>

                    <PrimaryButton
                      onClick={handleInvest}
                      className="w-full py-4 text-lg font-bold"
                    >
                      Submit Investment
                    </PrimaryButton>

                    <p className="text-xs text-gray-500 text-center">
                      By submitting, you agree to our investment terms and acknowledge you've reviewed all risk disclosures.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="bg-[#1A1A1A] border-b border-[#2A2A2A] sticky top-0 z-10" style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
        <div className="px-6 py-4" style={{ maxWidth: '80rem', width: '100%', display: 'block' }}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-600 to-orange-700 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-white" />
                </div>
                Investor Portal
              </h1>
              <p className="text-gray-400 mt-1">{investorInfo.name}</p>
            </div>
            <div className="flex items-center gap-3">
              <button className="p-2 rounded-lg bg-[#0A0A0A] border border-[#2A2A2A] text-gray-400 hover:text-white hover:border-orange-500/30 transition">
                <Bell className="w-5 h-5" />
              </button>
              <button className="p-2 rounded-lg bg-[#0A0A0A] border border-[#2A2A2A] text-gray-400 hover:text-white hover:border-orange-500/30 transition">
                <Settings className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 overflow-x-auto pb-2">
            {tabs.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg whitespace-nowrap transition ${
                    activeTab === tab.id
                      ? 'bg-orange-600 text-white'
                      : 'bg-[#0A0A0A] text-gray-400 hover:text-white border border-[#2A2A2A] hover:border-orange-500/30'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Logo Marquee */}
      <LogoMarquee />

      {/* Advertising Text Banner */}
      <AdvertisingMarquee placement="portal-header" dismissible />

      {/* Content */}
      <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
      <div className="px-6 py-6 space-y-6" style={{ maxWidth: '80rem', width: '100%', display: 'block' }}>
        {activeTab === 'dashboard' && (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {stats.map((stat, i) => {
                const Icon = stat.icon;
                return (
                  <div key={i} className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-6 hover:border-orange-500/30 transition">
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-10 h-10 rounded-lg bg-orange-600/10 border border-orange-500/20 flex items-center justify-center">
                        <Icon className="w-5 h-5 text-orange-400" />
                      </div>
                      <div className={`flex items-center gap-1 text-sm ${
                        stat.trend === 'up' ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {stat.trend === 'up' ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                        {stat.change}
                      </div>
                    </div>
                    <p className="text-2xl font-bold text-white mb-1">{stat.value}</p>
                    <p className="text-sm text-gray-400">{stat.label}</p>
                  </div>
                );
              })}
            </div>

            {/* Performance Chart */}
            <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-lg font-bold text-white">Portfolio Performance</h2>
                  <p className="text-sm text-gray-400">Total value and ROI over time</p>
                </div>
                <PrimaryButton
                  onClick={() => toast.success('Downloading report...')}
                  className="flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Export Report
                </PrimaryButton>
              </div>
              <ChartContainer height={256} minHeight={256} dependencies={[activeTab]}>
                <AreaChart data={performanceData} width={800} height={256}>
                  <defs>
                    <linearGradient id="valueGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop key="investor-stop1" offset="5%" stopColor="#ea580c" stopOpacity={0.3}/>
                      <stop key="investor-stop2" offset="95%" stopColor="#ea580c" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid key="investor-grid" strokeDasharray="3 3" stroke="#2A2A2A" />
                  <XAxis key="investor-xaxis" dataKey="month" stroke="#6B7280" />
                  <YAxis key="investor-yaxis" stroke="#6B7280" />
                  <Tooltip
                    key="investor-tooltip"
                    contentStyle={{ backgroundColor: '#1A1A1A', border: '1px solid #2A2A2A', borderRadius: '8px' }}
                    labelStyle={{ color: '#fff' }}
                  />
                  <Area key="investor-area" type="monotone" dataKey="value" stroke="#ea580c" fillOpacity={1} fill="url(#valueGradient)" strokeWidth={2} isAnimationActive={false} />
                </AreaChart>
              </ChartContainer>
            </div>

            {/* Properties Grid */}
            <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-white">Investment Properties</h2>
                <button
                  onClick={() => setActiveTab('portfolio')}
                  className="text-orange-400 hover:text-orange-300 text-sm font-semibold flex items-center gap-1"
                >
                  View All
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {properties.map(property => (
                  <div key={property.id} className="bg-[#0A0A0A] rounded-lg border border-[#2A2A2A] p-5 hover:border-orange-500/30 transition">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-semibold text-white mb-1">{property.name}</h3>
                        <p className="text-sm text-gray-400">{property.type} • {property.location}</p>
                      </div>
                      <span className={`px-2 py-1 rounded text-xs font-semibold border ${getStatusColor(property.status)}`}>
                        {property.occupancy}%
                      </span>
                    </div>
                    <div className="space-y-2 mb-4">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Invested</span>
                        <span className="text-white font-semibold">${(property.invested / 1000)}K</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Current Value</span>
                        <span className="text-white font-semibold">${(property.currentValue / 1000)}K</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">ROI</span>
                        <span className="text-green-400 font-semibold">+{property.roi}%</span>
                      </div>
                    </div>
                    <div className="pt-3 border-t border-[#2A2A2A]">
                      <p className="text-xs text-gray-400 mb-1">Monthly Income</p>
                      <p className="text-lg font-bold text-orange-400">${property.monthlyIncome.toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Investment Opportunities */}
            <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-white">New Investment Opportunities</h2>
                <button
                  onClick={() => setActiveTab('opportunities')}
                  className="text-orange-400 hover:text-orange-300 text-sm font-semibold flex items-center gap-1"
                >
                  View All
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Company Opportunities Preview */}
              <div className="mb-6">
                <h3 className="text-md font-bold text-white mb-3 flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-purple-400" />
                  Company Equity Opportunities
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {companyOpportunities.slice(0, 2).map(opp => (
                    <div key={opp.id} className="bg-gradient-to-br from-purple-600/10 to-pink-600/10 border border-purple-500/30 rounded-lg p-4 hover:border-purple-500/50 transition">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-white">{opp.title}</h3>
                            <span className="px-2 py-0.5 rounded text-xs font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                              {opp.highlight}
                            </span>
                          </div>
                          <p className="text-xs text-gray-400 mb-2">{opp.description}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-3 text-sm mb-3">
                        <div>
                          <p className="text-gray-500 text-xs">Min Investment</p>
                          <p className="text-white font-semibold">${(opp.minInvestment / 1000)}K</p>
                        </div>
                        <div>
                          <p className="text-gray-500 text-xs">Projected ROI</p>
                          <p className="text-green-400 font-semibold">{opp.projectedROI}%</p>
                        </div>
                        <div>
                          <p className="text-gray-500 text-xs">Funded</p>
                          <p className="text-white font-semibold">{opp.funded}%</p>
                        </div>
                      </div>
                      <PrimaryButton
                        onClick={() => handleOpenOpportunity(opp)}
                        className="w-full text-sm py-2"
                      >
                        Learn More
                      </PrimaryButton>
                    </div>
                  ))}
                </div>
              </div>

              {/* Property Opportunities Preview */}
              <div>
                <h3 className="text-md font-bold text-white mb-3 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-orange-400" />
                  Property Investment Opportunities
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {propertyOpportunities.slice(0, 2).map(opp => (
                    <div key={opp.id} className="bg-gradient-to-br from-orange-600/10 to-red-600/10 border border-orange-500/30 rounded-lg p-4 hover:border-orange-500/50 transition">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <h3 className="font-semibold text-white">{opp.title}</h3>
                            <span className="px-2 py-0.5 rounded text-xs font-semibold bg-orange-500/20 text-orange-300 border border-orange-500/30">
                              {opp.highlight}
                            </span>
                            {opp.needsMoreFunding && (
                              <span className="px-2 py-0.5 rounded text-xs font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/30 flex items-center gap-1">
                                <Target className="w-3 h-3" />
                                Fundraising
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-400 mb-2">{opp.description}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-3 text-sm mb-3">
                        <div>
                          <p className="text-gray-500 text-xs">Min Investment</p>
                          <p className="text-white font-semibold">${(opp.minInvestment / 1000)}K</p>
                        </div>
                        <div>
                          <p className="text-gray-500 text-xs">Projected ROI</p>
                          <p className="text-green-400 font-semibold">{opp.projectedROI}%</p>
                        </div>
                        <div>
                          <p className="text-gray-500 text-xs">Funded</p>
                          <p className="text-white font-semibold">{opp.funded}%</p>
                        </div>
                      </div>
                      <PrimaryButton
                        onClick={() => handleOpenOpportunity(opp)}
                        className="w-full text-sm py-2"
                      >
                        Learn More
                      </PrimaryButton>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}

        {activeTab === 'portfolio' && (
          <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-6">
            <h2 className="text-lg font-bold text-white mb-4">Portfolio Details</h2>
            <p className="text-gray-400">Complete portfolio breakdown and analytics would be displayed here.</p>
          </div>
        )}

        {activeTab === 'opportunities' && (
          <>
            {/* Header with Filters */}
            <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-white">Investment Opportunities</h2>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setOpportunityFilter('all')}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
                      opportunityFilter === 'all'
                        ? 'bg-orange-600 text-white'
                        : 'bg-[#0A0A0A] text-gray-400 border border-[#2A2A2A] hover:border-orange-500/30'
                    }`}
                  >
                    All
                  </button>
                  <button
                    onClick={() => setOpportunityFilter('company')}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
                      opportunityFilter === 'company'
                        ? 'bg-purple-600 text-white'
                        : 'bg-[#0A0A0A] text-gray-400 border border-[#2A2A2A] hover:border-purple-500/30'
                    }`}
                  >
                    <Briefcase className="w-4 h-4 inline mr-1" />
                    Company Equity
                  </button>
                  <button
                    onClick={() => setOpportunityFilter('property')}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
                      opportunityFilter === 'property'
                        ? 'bg-orange-600 text-white'
                        : 'bg-[#0A0A0A] text-gray-400 border border-[#2A2A2A] hover:border-orange-500/30'
                    }`}
                  >
                    <Building2 className="w-4 h-4 inline mr-1" />
                    Real Estate
                  </button>
                </div>
              </div>
              <p className="text-sm text-gray-400">
                {opportunityFilter === 'all' && 'Browse all company equity and real estate investment opportunities'}
                {opportunityFilter === 'company' && 'Invest directly in company growth through equity partnerships'}
                {opportunityFilter === 'property' && 'Build wealth through diverse real estate investment vehicles'}
              </p>
            </div>

            {/* Company Opportunities */}
            {(opportunityFilter === 'all' || opportunityFilter === 'company') && (
              <div className="mb-6">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <Briefcase className="w-5 h-5 text-purple-400" />
                  Company Equity Opportunities
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {companyOpportunities.map(opp => (
                    <div
                      key={opp.id}
                      onClick={() => handleOpenOpportunity(opp)}
                      className="bg-gradient-to-br from-purple-600/10 to-pink-600/10 border border-purple-500/30 rounded-xl p-6 hover:border-purple-500/50 hover:shadow-xl hover:shadow-purple-500/20 transition cursor-pointer group"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="text-lg font-bold text-white group-hover:text-purple-300 transition">{opp.title}</h3>
                            <span className="px-2 py-1 rounded text-xs font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                              {opp.highlight}
                            </span>
                          </div>
                          <p className="text-sm text-gray-400 mb-2">{opp.category}</p>
                          <p className="text-sm text-gray-300 mb-3">{opp.description}</p>
                        </div>
                        <span className="px-3 py-1 rounded-lg text-xs font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                          {opp.funded}% FUNDED
                        </span>
                      </div>

                      <div className="grid grid-cols-4 gap-3 mb-4">
                        <div>
                          <p className="text-xs text-gray-500">Min Investment</p>
                          <p className="text-white font-semibold">${(opp.minInvestment / 1000)}K</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Projected ROI</p>
                          <p className="text-green-400 font-semibold">{opp.projectedROI}%</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Term</p>
                          <p className="text-white font-semibold">{opp.term}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Investors</p>
                          <p className="text-white font-semibold">{opp.investors}</p>
                        </div>
                      </div>

                      <div className="bg-[#0A0A0A] rounded-lg border border-purple-500/20 p-3 mb-4">
                        <p className="text-xs text-gray-400 mb-2 font-semibold">Key Benefits:</p>
                        <ul className="space-y-1">
                          {opp.benefits.map((benefit, idx) => (
                            <li key={idx} className="flex items-center gap-2 text-xs text-gray-300">
                              <CheckCircle className="w-3 h-3 text-purple-400 flex-shrink-0" />
                              {benefit}
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="flex items-center justify-center gap-2 text-purple-400 font-semibold text-sm group-hover:text-purple-300 transition">
                        <span>View Full Details & Invest</span>
                        <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Property Opportunities */}
            {(opportunityFilter === 'all' || opportunityFilter === 'property') && (
              <div>
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-orange-400" />
                  Real Estate Investment Opportunities
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {propertyOpportunities.map(opp => (
                    <div
                      key={opp.id}
                      onClick={() => handleOpenOpportunity(opp)}
                      className="bg-gradient-to-br from-orange-600/10 to-red-600/10 border border-orange-500/30 rounded-xl p-6 hover:border-orange-500/50 hover:shadow-xl hover:shadow-orange-500/20 transition cursor-pointer group"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="text-lg font-bold text-white group-hover:text-orange-300 transition">{opp.title}</h3>
                            <span className="px-2 py-1 rounded text-xs font-semibold bg-orange-500/20 text-orange-300 border border-orange-500/30">
                              {opp.highlight}
                            </span>
                          </div>
                          <p className="text-sm text-gray-400 mb-2">{opp.category}</p>
                          <p className="text-sm text-gray-300 mb-3">{opp.description}</p>
                        </div>
                        <span className="px-3 py-1 rounded-lg text-xs font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                          {opp.funded}% FUNDED
                        </span>
                      </div>

                      <div className="grid grid-cols-4 gap-3 mb-4">
                        <div>
                          <p className="text-xs text-gray-500">Min Investment</p>
                          <p className="text-white font-semibold">${(opp.minInvestment / 1000)}K</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Projected ROI</p>
                          <p className="text-green-400 font-semibold">{opp.projectedROI}%</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Term</p>
                          <p className="text-white font-semibold">{opp.term}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Investors</p>
                          <p className="text-white font-semibold">{opp.investors}</p>
                        </div>
                      </div>

                      <div className="bg-[#0A0A0A] rounded-lg border border-orange-500/20 p-3 mb-4">
                        <p className="text-xs text-gray-400 mb-2 font-semibold">Key Benefits:</p>
                        <ul className="space-y-1">
                          {opp.benefits.map((benefit, idx) => (
                            <li key={idx} className="flex items-center gap-2 text-xs text-gray-300">
                              <CheckCircle className="w-3 h-3 text-orange-400 flex-shrink-0" />
                              {benefit}
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="flex items-center justify-center gap-2 text-orange-400 font-semibold text-sm group-hover:text-orange-300 transition">
                        <span>View Full Details & Invest</span>
                        <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {activeTab === 'reports' && (
          <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-6">
            <h2 className="text-lg font-bold text-white mb-4">Financial Reports</h2>
            <p className="text-gray-400">Detailed financial reports and analytics would be displayed here.</p>
          </div>
        )}

        {activeTab === 'distributions' && (
          <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-6">
            <h2 className="text-lg font-bold text-white mb-4">Distribution History</h2>
            <p className="text-gray-400">Distribution payments and schedule would be displayed here.</p>
          </div>
        )}

        {activeTab === 'documents' && (
          <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-6">
            <h2 className="text-lg font-bold text-white mb-4">Investment Documents</h2>
            <p className="text-gray-400">Legal documents and contracts would be displayed here.</p>
          </div>
        )}

        {activeTab === 'referrals' && (
          <ReferralRewards />
        )}
      </div>
      </div>
    </div>
    </LayoutManager>
  );
}
