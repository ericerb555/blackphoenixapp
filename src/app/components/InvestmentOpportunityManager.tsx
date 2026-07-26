import { useState, useEffect } from 'react';
import {
  DollarSign, Edit, Save, X, Plus, Trash2, TrendingUp, Calendar,
  Building2, Target, Users, Percent, AlertCircle, CheckCircle, Info,
  FileText, PieChart, MapPin, Briefcase, Clock, ShieldAlert, BarChart3, Loader2
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { PrimaryButton } from './ui/button/PrimaryButton';
import { SecondaryButton } from './ui/button/SecondaryButton';
import { projectId, publicAnonKey } from '../utils/supabase/info';

const DEFAULT_OPPORTUNITIES = [
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
      projectDetails: {
        description: 'Equity stake in Black Phoenix construction platform with revenue sharing. Investors receive quarterly distributions based on company net revenues across all service lines including construction management, vendor marketplace, and property management services.',
        location: 'Salem, NH & Greater Boston Area (Multi-Market Platform)',
        propertyType: 'SaaS Platform & Service Business',
        financialBreakdown: {
          acquisitionCost: 0,
          developmentCost: 2500000,
          operatingExpenses: 1500000,
          projectedAnnualRevenue: 8500000,
          projectedAnnualProfit: 4500000,
          netROI: 24
        },
        useOfFunds: [
          { category: 'Technology Development', amount: 1500000, percentage: 30 },
          { category: 'Marketing & Growth', amount: 1500000, percentage: 30 },
          { category: 'Operations & Staffing', amount: 1000000, percentage: 20 },
          { category: 'Working Capital', amount: 500000, percentage: 10 },
          { category: 'Legal & Compliance', amount: 500000, percentage: 10 }
        ],
        timeline: [
          { phase: 'Capital Deployment', startDate: '2026-06-01', endDate: '2026-09-01', status: 'pending' },
          { phase: 'Platform Enhancement', startDate: '2026-09-01', endDate: '2027-03-01', status: 'pending' },
          { phase: 'Market Expansion', startDate: '2027-03-01', endDate: '2027-12-01', status: 'pending' },
          { phase: 'Revenue Optimization', startDate: '2027-12-01', endDate: '2028-06-01', status: 'pending' },
          { phase: 'Exit/Distribution Phase', startDate: '2028-06-01', endDate: '2029-06-01', status: 'pending' }
        ],
        riskFactors: [
          { risk: 'Market Competition', severity: 'Medium', mitigation: 'Proprietary technology and established customer base provide competitive moat' },
          { risk: 'Economic Downturn', severity: 'Medium', mitigation: 'Diversified revenue streams across multiple service categories' },
          { risk: 'Technology Risk', severity: 'Low', mitigation: 'Proven platform with active user base and continuous development' },
          { risk: 'Regulatory Changes', severity: 'Low', mitigation: 'Compliance team monitors regulatory environment' }
        ],
        marketAnalysis: {
          marketSize: '$1.3 trillion construction industry, $50B+ PropTech sector',
          targetMarket: 'Commercial & residential property owners, construction professionals, service providers',
          competitiveAdvantage: 'Integrated platform combining project management, vendor marketplace, and financial tools',
          growthProjection: '300% revenue growth over 36 months'
        },
        team: [
          { name: 'Eric Erb', role: 'Platform Owner & CEO', experience: 'Technology & Construction Leadership' },
          { name: 'Development Team', role: 'Engineering', experience: 'Full-stack development and platform architecture' },
          { name: 'Business Development', role: 'Growth', experience: 'Market expansion and partnership development' }
        ]
      }
    },
    {
      id: 'PROP-025',
      title: 'Salem NH Fix & Flip Portfolio',
      category: 'Value-Add',
      minInvestment: 50000,
      maxInvestment: 500000,
      projectedROI: 35,
      term: '18 months',
      payoutFrequency: 'Upon Sale',
      status: 'open',
      investors: 15,
      funded: 88,
      targetRaise: 3500000,
      currentCommitments: 3080000,
      minimumToStart: 3500000,
      needsMoreFunding: true,
      silentInvestment: true,
      highlight: 'Quick Returns',
      projectDetails: {
        description: 'Portfolio of 8 distressed properties in Salem, Derry, Londonderry, and Nashua metro area for complete renovation and resale. Properties selected based on location value, renovation potential, and market comps showing strong exit pricing.',
        location: 'Salem, Derry, Londonderry, Nashua NH',
        propertyType: 'Multi-Family & Single-Family Residential',
        financialBreakdown: {
          acquisitionCost: 2400000,
          developmentCost: 980000,
          operatingExpenses: 320000,
          projectedAnnualRevenue: 4720000,
          projectedAnnualProfit: 1220000,
          netROI: 35
        },
        useOfFunds: [
          { category: 'Property Acquisition', amount: 2400000, percentage: 68.5 },
          { category: 'Renovation & Construction', amount: 800000, percentage: 23 },
          { category: 'Carrying Costs & Utilities', amount: 150000, percentage: 4.3 },
          { category: 'Marketing & Sales', amount: 80000, percentage: 2.3 },
          { category: 'Contingency Reserve', amount: 70000, percentage: 2 }
        ],
        timeline: [
          { phase: 'Acquisition Phase', startDate: '2026-05-01', endDate: '2026-07-01', status: 'in-progress' },
          { phase: 'Demolition & Permits', startDate: '2026-07-01', endDate: '2026-08-15', status: 'pending' },
          { phase: 'Renovation Phase 1 (4 props)', startDate: '2026-08-15', endDate: '2026-12-01', status: 'pending' },
          { phase: 'Renovation Phase 2 (4 props)', startDate: '2026-12-01', endDate: '2027-04-01', status: 'pending' },
          { phase: 'Marketing & Sales', startDate: '2027-02-01', endDate: '2027-08-01', status: 'pending' },
          { phase: 'Final Sale & Distribution', startDate: '2027-08-01', endDate: '2027-10-01', status: 'pending' }
        ],
        riskFactors: [
          { risk: 'Market Conditions', severity: 'Medium', mitigation: 'Conservative ARV projections at 15% below current comps' },
          { risk: 'Construction Delays', severity: 'Medium', mitigation: 'Established GC relationships and 20% contingency buffer in timeline' },
          { risk: 'Budget Overruns', severity: 'Low', mitigation: 'Detailed scope of work with fixed-price contracts and 2% contingency fund' },
          { risk: 'Title/Legal Issues', severity: 'Low', mitigation: 'Full title search and legal review before acquisition' }
        ],
        marketAnalysis: {
          marketSize: 'Boston metro median home price $725K, inventory shortage driving demand',
          targetMarket: 'First-time homebuyers and young families in appreciating neighborhoods',
          competitiveAdvantage: 'In-house construction team reduces costs by 18% vs external GCs',
          growthProjection: 'Properties in target areas appreciated 12% annually over past 3 years'
        },
        team: [
          { name: 'Acquisition Team', role: 'Deal Sourcing', experience: '50+ fix & flip completions' },
          { name: 'Construction Management', role: 'Renovation Oversight', experience: 'Licensed GCs with 15+ years experience' },
          { name: 'Sales Team', role: 'Exit Strategy', experience: 'Local real estate brokers with market expertise' }
        ]
      }
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
      minimumToStart: 50000000,
      needsMoreFunding: true,
      silentInvestment: true,
      highlight: 'Diversified',
      projectDetails: {
        description: 'Diversified portfolio of 24 multi-family apartment complexes across NH and MA markets. Focus on Class B properties in emerging neighborhoods with strong rental demand and value-add opportunities through property improvements and professional management.',
        location: 'Salem, Nashua, Manchester (NH), Boston Metro (MA)',
        propertyType: 'Class B Multi-Family (50-200 units per property)',
        financialBreakdown: {
          acquisitionCost: 38000000,
          developmentCost: 8500000,
          operatingExpenses: 4200000,
          projectedAnnualRevenue: 12800000,
          projectedAnnualProfit: 11000000,
          netROI: 22
        },
        useOfFunds: [
          { category: 'Property Acquisitions', amount: 38000000, percentage: 76 },
          { category: 'Property Improvements', amount: 7000000, percentage: 14 },
          { category: 'Operating Reserves', amount: 2500000, percentage: 5 },
          { category: 'Management Infrastructure', amount: 1500000, percentage: 3 },
          { category: 'Marketing & Leasing', amount: 1000000, percentage: 2 }
        ],
        timeline: [
          { phase: 'Fund Formation & Capital Raise', startDate: '2026-04-01', endDate: '2026-09-01', status: 'in-progress' },
          { phase: 'Initial Acquisitions (8 properties)', startDate: '2026-10-01', endDate: '2027-03-01', status: 'pending' },
          { phase: 'Property Improvements Wave 1', startDate: '2027-01-01', endDate: '2027-06-01', status: 'pending' },
          { phase: 'Secondary Acquisitions (8 properties)', startDate: '2027-04-01', endDate: '2027-09-01', status: 'pending' },
          { phase: 'Property Improvements Wave 2', startDate: '2027-07-01', endDate: '2027-12-01', status: 'pending' },
          { phase: 'Final Acquisitions (8 properties)', startDate: '2027-10-01', endDate: '2028-03-01', status: 'pending' },
          { phase: 'Stabilization & Optimization', startDate: '2028-03-01', endDate: '2029-12-01', status: 'pending' }
        ],
        riskFactors: [
          { risk: 'Interest Rate Risk', severity: 'Medium', mitigation: 'Mix of fixed and floating rate debt, 60% LTV cap' },
          { risk: 'Occupancy Risk', severity: 'Low', mitigation: 'Target markets with <5% vacancy rates, diverse geographic spread' },
          { risk: 'Property Management', severity: 'Low', mitigation: 'Professional management company with 20+ years multifamily experience' },
          { risk: 'Capital Expenditure Overruns', severity: 'Medium', mitigation: '15% contingency reserve for unexpected repairs' }
        ],
        marketAnalysis: {
          marketSize: '$4.5 trillion US multifamily market, Northeast represents 22% of national inventory',
          targetMarket: 'Working professionals and families seeking affordable urban-adjacent housing',
          competitiveAdvantage: 'Economies of scale across 24 properties, in-house property management reduces costs 12%',
          growthProjection: 'Target markets seeing 4-6% annual rent growth, 8% property appreciation'
        },
        team: [
          { name: 'REIT Management Team', role: 'Fund Operations', experience: 'Managed $800M+ in multifamily assets' },
          { name: 'Acquisition Team', role: 'Deal Sourcing', experience: '150+ multifamily acquisitions' },
          { name: 'Property Management Co.', role: 'Operations', experience: '5,000+ units under management' },
          { name: 'Asset Management', role: 'Performance Optimization', experience: 'Proven track record of 15%+ NOI improvements' }
        ]
      }
    },
    {
      id: 'PROP-027',
      title: 'Ground-Up Development',
      category: 'Development',
      minInvestment: 200000,
      maxInvestment: 2000000,
      projectedROI: 48,
      term: '4 years',
      payoutFrequency: 'Upon Sale',
      status: 'open',
      investors: 6,
      funded: 34,
      targetRaise: 12000000,
      currentCommitments: 4080000,
      minimumToStart: 12000000,
      needsMoreFunding: true,
      silentInvestment: true,
      highlight: 'Highest Returns',
      projectDetails: {
        description: 'Ground-up development of 85-unit luxury mixed-use complex in Seaport District, Boston. Project includes 65 residential condos, 20 luxury rentals, and 12,000 sq ft ground-floor retail. Prime waterfront location with city and harbor views.',
        location: 'Seaport District, Boston, MA',
        propertyType: 'Mixed-Use Development (Residential + Retail)',
        financialBreakdown: {
          acquisitionCost: 4200000,
          developmentCost: 24500000,
          operatingExpenses: 1800000,
          projectedAnnualRevenue: 42500000,
          projectedAnnualProfit: 17700000,
          netROI: 48
        },
        useOfFunds: [
          { category: 'Land Acquisition', amount: 4200000, percentage: 35 },
          { category: 'Construction Costs', amount: 20000000, percentage: 46.5 },
          { category: 'Architecture & Engineering', amount: 1500000, percentage: 12.5 },
          { category: 'Permits & Legal', amount: 800000, percentage: 6.7 },
          { category: 'Marketing & Sales', amount: 1000000, percentage: 8.3 },
          { category: 'Contingency & Soft Costs', amount: 500000, percentage: 4.2 }
        ],
        timeline: [
          { phase: 'Land Acquisition & Zoning', startDate: '2026-06-01', endDate: '2026-09-01', status: 'pending' },
          { phase: 'Final Design & Permitting', startDate: '2026-09-01', endDate: '2027-01-01', status: 'pending' },
          { phase: 'Site Preparation & Foundation', startDate: '2027-01-01', endDate: '2027-05-01', status: 'pending' },
          { phase: 'Vertical Construction', startDate: '2027-05-01', endDate: '2028-08-01', status: 'pending' },
          { phase: 'Interior Finishes & MEP', startDate: '2028-08-01', endDate: '2029-02-01', status: 'pending' },
          { phase: 'Pre-Sales & Marketing', startDate: '2028-10-01', endDate: '2029-06-01', status: 'pending' },
          { phase: 'Certificate of Occupancy', startDate: '2029-03-01', endDate: '2029-04-01', status: 'pending' },
          { phase: 'Unit Sales & Final Distribution', startDate: '2029-04-01', endDate: '2030-06-01', status: 'pending' }
        ],
        riskFactors: [
          { risk: 'Construction Delays', severity: 'High', mitigation: 'Fixed-price GC contract with liquidated damages, experienced team with Seaport track record' },
          { risk: 'Market Timing Risk', severity: 'Medium', mitigation: 'Phased presales strategy, rental option for unsold units' },
          { risk: 'Cost Overruns', severity: 'Medium', mitigation: '4.2% contingency fund, guaranteed maximum price (GMP) contract' },
          { risk: 'Permitting Delays', severity: 'Low', mitigation: 'Pre-approved zoning variance, expedited review track with city' }
        ],
        marketAnalysis: {
          marketSize: 'Seaport District is Boston\'s fastest-growing neighborhood - $20B+ development pipeline',
          targetMarket: 'High-net-worth professionals, tech executives, luxury buyers seeking waterfront living',
          competitiveAdvantage: 'Last available waterfront parcel in immediate area, superior views and finishes',
          growthProjection: 'Seaport condos appreciated 35% over past 5 years, retail space 98% occupied'
        },
        team: [
          { name: 'Development Partner', role: 'Project Sponsor', experience: '$500M+ in completed Seaport developments' },
          { name: 'Architecture Firm', role: 'Design', experience: 'Award-winning luxury residential designer' },
          { name: 'General Contractor', role: 'Construction', experience: 'Completed 12 high-rise projects in Boston' },
          { name: 'Sales & Marketing', role: 'Presales', experience: 'Sold out 3 previous Seaport luxury developments' }
        ]
      }
    }
  ];

const API_BASE = `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6`;

export default function InvestmentOpportunityManager() {
  const [opportunities, setOpportunities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Load opportunities from Supabase on mount
  useEffect(() => {
    fetchOpportunities();
  }, []);

  // Save to localStorage whenever opportunities change (for offline support)
  useEffect(() => {
    if (opportunities.length > 0) {
      localStorage.setItem('investmentOpportunities', JSON.stringify(opportunities));
    }
  }, [opportunities]);

  const fetchOpportunities = async () => {
    setLoading(true);

    try {
      const url = `${API_BASE}/investments/opportunities`;
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`
        }
      });

      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`);
      }

      const data = await response.json();

      // If no opportunities in database, seed with defaults
      if (!data.opportunities || data.opportunities.length === 0) {
        console.log('📊 No opportunities in database, seeding defaults...');
        await seedDefaultOpportunities();
      } else {
        // Convert snake_case from DB to camelCase for component
        const formattedOpportunities = data.opportunities.map((opp: any) => ({
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
          minimumToStart: opp.minimum_to_start ? Number(opp.minimum_to_start) : undefined,
          highlight: opp.highlight,
          silentInvestment: opp.silent_investment,
          needsMoreFunding: opp.needs_more_funding,
          projectDetails: opp.project_details
        }));
        setOpportunities(formattedOpportunities);
        console.log('✅ Loaded opportunities from Supabase');
      }
    } catch (error) {
      // Server not available - use localStorage (this is expected until function is deployed)
      console.log('💾 Using local storage (Supabase function not deployed)');

      // Fallback to localStorage
      const stored = localStorage.getItem('investmentOpportunities');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          setOpportunities(parsed);
          console.log(`✅ Loaded ${parsed.length} opportunities from localStorage`);
        } catch (e) {
          console.error('Error loading from localStorage:', e);
          setOpportunities(DEFAULT_OPPORTUNITIES);
          console.log(`✅ Loaded ${DEFAULT_OPPORTUNITIES.length} default opportunities`);
        }
      } else {
        // No localStorage data - use defaults and save them
        console.log(`✅ Loading ${DEFAULT_OPPORTUNITIES.length} default opportunities (first time setup)`);
        setOpportunities(DEFAULT_OPPORTUNITIES);
        localStorage.setItem('investmentOpportunities', JSON.stringify(DEFAULT_OPPORTUNITIES));
        toast.success(`Loaded ${DEFAULT_OPPORTUNITIES.length} investment opportunities`);
      }
    } finally {
      setLoading(false);
    }
  };

  const seedDefaultOpportunities = async () => {
    try {
      for (const opp of DEFAULT_OPPORTUNITIES) {
        await fetch(`${API_BASE}/investments/opportunities`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`
          },
          body: JSON.stringify({
            id: opp.id,
            title: opp.title,
            category: opp.category,
            min_investment: opp.minInvestment,
            max_investment: opp.maxInvestment,
            projected_roi: opp.projectedROI,
            term: opp.term,
            payout_frequency: opp.payoutFrequency,
            status: opp.status,
            investors: opp.investors,
            funded: opp.funded,
            target_raise: opp.targetRaise,
            current_commitments: opp.currentCommitments,
            minimum_to_start: opp.minimumToStart || null,
            highlight: opp.highlight,
            silent_investment: opp.silentInvestment,
            needs_more_funding: opp.needsMoreFunding,
            project_details: opp.projectDetails
          })
        });
      }
      // Refresh after seeding
      await fetchOpportunities();
      toast.success('Default opportunities loaded');
    } catch (error) {
      console.error('Error seeding opportunities:', error);
      toast.error('Failed to seed default opportunities');
    }
  };

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<any>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [expandedDetails, setExpandedDetails] = useState<string | null>(null);
  const [createForm, setCreateForm] = useState<any>({
    id: '',
    title: '',
    category: 'Value-Add',
    minInvestment: 50000,
    maxInvestment: 500000,
    projectedROI: 20,
    term: '3 years',
    payoutFrequency: 'quarterly',
    status: 'open',
    investors: 0,
    funded: 0,
    targetRaise: 1000000,
    currentCommitments: 0,
    highlight: 'New Opportunity',
    silentInvestment: false,
    needsMoreFunding: false,
    minimumToStart: 0
  });

  const handleEdit = (opp: any) => {
    setEditingId(opp.id);
    setEditForm({ ...opp });
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditForm(null);
  };

  const handleSave = async () => {
    if (!editForm) return;

    try {
      // Recalculate funded percentage based on current commitments
      const calculatedFunded = Math.round((editForm.currentCommitments / editForm.targetRaise) * 100);

      const response = await fetch(`${API_BASE}/investments/opportunities/${editingId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`
        },
        body: JSON.stringify({
          title: editForm.title,
          category: editForm.category,
          min_investment: editForm.minInvestment,
          max_investment: editForm.maxInvestment,
          projected_roi: editForm.projectedROI,
          term: editForm.term,
          payout_frequency: editForm.payoutFrequency,
          status: editForm.status,
          investors: editForm.investors,
          funded: calculatedFunded,
          target_raise: editForm.targetRaise,
          current_commitments: editForm.currentCommitments,
          minimum_to_start: editForm.minimumToStart || null,
          highlight: editForm.highlight,
          silent_investment: editForm.silentInvestment,
          needs_more_funding: editForm.needsMoreFunding,
          project_details: editForm.projectDetails
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update opportunity');
      }

      toast.success('Investment opportunity updated successfully!');
      setEditingId(null);
      setEditForm(null);
      await fetchOpportunities(); // Refresh data
    } catch (error) {
      // Fallback: update in-memory and localStorage
      const updatedOpportunity = {
        ...editForm,
        funded: Math.round((editForm.currentCommitments / editForm.targetRaise) * 100)
      };

      const updated = opportunities.map(opp =>
        opp.id === editingId ? updatedOpportunity : opp
      );
      setOpportunities(updated);

      toast.success('Investment opportunity updated successfully!');
      setEditingId(null);
      setEditForm(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this investment opportunity?')) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/investments/opportunities/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete opportunity');
      }

      toast.success('Investment opportunity deleted');
      await fetchOpportunities(); // Refresh data
    } catch (error) {
      // Fallback: delete from in-memory and localStorage
      const updated = opportunities.filter(opp => opp.id !== id);
      setOpportunities(updated);
      toast.success('Investment opportunity deleted');
    }
  };

  const handleCreateNew = () => {
    setCreateForm({
      id: '',
      title: '',
      category: 'Value-Add',
      minInvestment: 50000,
      maxInvestment: 500000,
      projectedROI: 20,
      term: '3 years',
      payoutFrequency: 'quarterly',
      status: 'open',
      investors: 0,
      funded: 0,
      targetRaise: 1000000,
      currentCommitments: 0,
      highlight: 'New Opportunity',
      silentInvestment: false,
      needsMoreFunding: false,
      minimumToStart: 0
    });
    setShowCreateModal(true);
  };

  const handleCreateSave = async () => {
    if (!createForm.title || !createForm.id) {
      toast.error('Please fill in all required fields (ID and Title)');
      return;
    }

    // Check if ID already exists
    if (opportunities.some(opp => opp.id === createForm.id)) {
      toast.error('An opportunity with this ID already exists');
      return;
    }

    try {
      // Calculate funded percentage
      const calculatedFunded = createForm.targetRaise > 0
        ? Math.round((createForm.currentCommitments / createForm.targetRaise) * 100)
        : 0;

      const response = await fetch(`${API_BASE}/investments/opportunities`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`
        },
        body: JSON.stringify({
          id: createForm.id,
          title: createForm.title,
          category: createForm.category,
          min_investment: createForm.minInvestment,
          max_investment: createForm.maxInvestment,
          projected_roi: createForm.projectedROI,
          term: createForm.term,
          payout_frequency: createForm.payoutFrequency,
          status: createForm.status,
          investors: createForm.investors,
          funded: calculatedFunded,
          target_raise: createForm.targetRaise,
          current_commitments: createForm.currentCommitments,
          minimum_to_start: createForm.minimumToStart || null,
          highlight: createForm.highlight,
          silent_investment: createForm.silentInvestment,
          needs_more_funding: createForm.needsMoreFunding,
          project_details: createForm.projectDetails || null
        })
      });

      if (!response.ok) {
        throw new Error('Failed to create opportunity');
      }

      toast.success('Investment opportunity created successfully!');
      setShowCreateModal(false);
      await fetchOpportunities(); // Refresh data
    } catch (error) {
      // Fallback: add to in-memory and localStorage
      const calculatedFunded = createForm.targetRaise > 0
        ? Math.round((createForm.currentCommitments / createForm.targetRaise) * 100)
        : 0;

      const newOpportunity = {
        ...createForm,
        funded: calculatedFunded
      };

      setOpportunities([...opportunities, newOpportunity]);
      toast.success('Investment opportunity created successfully!');
      setShowCreateModal(false);
    }
  };

  const handleCreateCancel = () => {
    setShowCreateModal(false);
  };

  const handleStatusChange = async (opportunityId: string, newStatus: string) => {
    try {
      const response = await fetch(`${API_BASE}/investments/opportunities/${opportunityId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (!response.ok) {
        throw new Error('Failed to update status');
      }

      toast.success(`Status changed to ${newStatus}`);
      await fetchOpportunities(); // Refresh data
    } catch (error) {
      // Fallback: update in-memory and localStorage
      const updated = opportunities.map(opp =>
        opp.id === opportunityId ? { ...opp, status: newStatus } : opp
      );
      setOpportunities(updated);
      toast.success(`Status changed to ${newStatus}`);
    }
  };

  const updateCreateField = (field: string, value: any) => {
    setCreateForm({ ...createForm, [field]: value });
  };

  const updateField = (field: string, value: any) => {
    setEditForm({ ...editForm, [field]: value });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-green-500/10 text-green-400 border-green-500/20';
      case 'closed': return 'bg-red-500/10 text-red-400 border-red-500/20';
      case 'funded': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      default: return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
    }
  };

  const getCategoryColor = (category: string) => {
    if (category.includes('Equity')) return 'text-purple-400';
    return 'text-orange-400';
  };

  const getPayoutFrequencyLabel = (frequency: string) => {
    switch (frequency) {
      case 'monthly': return 'Monthly Payouts';
      case 'quarterly': return 'Quarterly Payouts';
      case 'yearly': return 'Yearly Payouts';
      case 'project_completion': return 'Upon Sale';
      case 'Upon Sale': return 'Upon Sale';
      default: return 'Quarterly Payouts';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 text-orange-400 animate-spin" />
          <p className="text-gray-400">Loading investment opportunities...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-3">
            <DollarSign className="w-7 h-7 text-orange-400" />
            Investment Opportunity Manager
          </h2>
          <p className="text-gray-400 mt-1">Manage and update all investment opportunities</p>
        </div>
        <PrimaryButton onClick={handleCreateNew} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Add New Opportunity
        </PrimaryButton>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6">
          <p className="text-sm text-gray-400 mb-2">Total Opportunities</p>
          <p className="text-3xl font-bold text-white">{opportunities.length}</p>
        </div>
        <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6">
          <p className="text-sm text-gray-400 mb-2">Total Target Raise</p>
          <p className="text-3xl font-bold text-white">
            ${(opportunities.reduce((sum, opp) => sum + opp.targetRaise, 0) / 1000000).toFixed(1)}M
          </p>
        </div>
        <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6">
          <p className="text-sm text-gray-400 mb-2">Current Commitments</p>
          <p className="text-3xl font-bold text-green-400">
            ${(opportunities.reduce((sum, opp) => sum + (opp.currentCommitments || 0), 0) / 1000000).toFixed(1)}M
          </p>
        </div>
        <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6">
          <p className="text-sm text-gray-400 mb-2">Total Investors</p>
          <p className="text-3xl font-bold text-white">
            {opportunities.reduce((sum, opp) => sum + opp.investors, 0)}
          </p>
        </div>
      </div>

      {/* Opportunities List */}
      <div className="space-y-4">
        {opportunities.map((opp) => {
          const isEditing = editingId === opp.id;
          const data = isEditing ? editForm : opp;
          const stillNeeded = data.minimumToStart ? data.minimumToStart - data.currentCommitments : 0;
          const fundingProgress = data.minimumToStart ? (data.currentCommitments / data.minimumToStart) * 100 : 0;

          return (
            <div
              key={opp.id}
              className={`bg-[#1A1A1A] border rounded-xl p-6 transition ${
                isEditing ? 'border-orange-500' : 'border-[#2A2A2A] hover:border-[#3A3A3A]'
              }`}
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-6">
                <div className="flex-1">
                  {isEditing ? (
                    <div className="space-y-3">
                      <input
                        type="text"
                        value={data.title}
                        onChange={(e) => updateField('title', e.target.value)}
                        className="w-full bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg px-4 py-2 text-white font-bold text-lg focus:outline-none focus:border-orange-500/50"
                      />
                      <div className="flex items-center gap-3">
                        <select
                          value={data.category}
                          onChange={(e) => updateField('category', e.target.value)}
                          className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:border-orange-500/50"
                        >
                          <option value="Company Equity">Company Equity</option>
                          <option value="Value-Add">Value-Add</option>
                          <option value="REIT">REIT</option>
                          <option value="Development">Development</option>
                          <option value="Tax-Deferred">Tax-Deferred</option>
                          <option value="Turnkey">Turnkey</option>
                          <option value="Fractional Ownership">Fractional Ownership</option>
                        </select>
                        <input
                          type="text"
                          value={data.highlight}
                          onChange={(e) => updateField('highlight', e.target.value)}
                          placeholder="Highlight tag"
                          className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:border-orange-500/50"
                        />
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-xl font-bold text-white">{data.title}</h3>
                        <span className="px-2 py-1 rounded text-xs font-semibold bg-orange-500/20 text-orange-300 border border-orange-500/30">
                          {data.highlight}
                        </span>
                        {data.needsMoreFunding && (
                          <span className="px-2 py-1 rounded text-xs font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/30 flex items-center gap-1">
                            <Target className="w-3 h-3" />
                            Fundraising
                          </span>
                        )}
                        {data.silentInvestment && (
                          <span className="px-2 py-1 rounded text-xs font-semibold bg-yellow-500/20 text-yellow-300 border border-yellow-500/30">
                            Silent Investment
                          </span>
                        )}
                      </div>
                      <p className={`text-sm font-semibold ${getCategoryColor(data.category)}`}>
                        {data.category} • {data.id}
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {isEditing ? (
                    <>
                      <SecondaryButton onClick={handleCancel} className="flex items-center gap-2">
                        <X className="w-4 h-4" />
                        Cancel
                      </SecondaryButton>
                      <PrimaryButton onClick={handleSave} className="flex items-center gap-2">
                        <Save className="w-4 h-4" />
                        Save
                      </PrimaryButton>
                    </>
                  ) : (
                    <>
                      <select
                        value={data.status}
                        onChange={(e) => handleStatusChange(opp.id, e.target.value)}
                        className={`px-3 py-1 rounded-lg text-xs font-semibold border ${getStatusColor(data.status)}`}
                      >
                        <option value="open">Open</option>
                        <option value="closed">Closed</option>
                        <option value="funded">Funded</option>
                      </select>
                      <button
                        onClick={() => handleEdit(opp)}
                        className="p-2 rounded-lg bg-[#0A0A0A] border border-[#2A2A2A] text-gray-400 hover:text-white hover:border-orange-500/30 transition"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(opp.id)}
                        className="p-2 rounded-lg bg-[#0A0A0A] border border-[#2A2A2A] text-gray-400 hover:text-red-400 hover:border-red-500/30 transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Investment Details */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg p-4">
                  <p className="text-xs text-gray-400 mb-2">Min Investment</p>
                  {isEditing ? (
                    <div className="relative">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                      <input
                        type="number"
                        value={data.minInvestment}
                        onChange={(e) => updateField('minInvestment', parseInt(e.target.value))}
                        className="w-full bg-[#1A1A1A] border border-[#2A2A2A] rounded px-6 py-1 text-white text-lg font-bold focus:outline-none focus:border-orange-500/50"
                      />
                    </div>
                  ) : (
                    <p className="text-lg font-bold text-white">${(data.minInvestment / 1000).toLocaleString()}K</p>
                  )}
                </div>

                <div className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg p-4">
                  <p className="text-xs text-gray-400 mb-2">Max Investment</p>
                  {isEditing ? (
                    <div className="relative">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                      <input
                        type="number"
                        value={data.maxInvestment}
                        onChange={(e) => updateField('maxInvestment', parseInt(e.target.value))}
                        className="w-full bg-[#1A1A1A] border border-[#2A2A2A] rounded px-6 py-1 text-white text-lg font-bold focus:outline-none focus:border-orange-500/50"
                      />
                    </div>
                  ) : (
                    <p className="text-lg font-bold text-white">${(data.maxInvestment / 1000).toLocaleString()}K</p>
                  )}
                </div>

                <div className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg p-4">
                  <p className="text-xs text-gray-400 mb-2">Projected ROI</p>
                  {isEditing ? (
                    <div className="relative">
                      <input
                        type="number"
                        value={data.projectedROI}
                        onChange={(e) => updateField('projectedROI', parseInt(e.target.value))}
                        className="w-full bg-[#1A1A1A] border border-[#2A2A2A] rounded px-2 py-1 text-white text-lg font-bold focus:outline-none focus:border-orange-500/50"
                      />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400">%</span>
                    </div>
                  ) : (
                    <p className="text-lg font-bold text-green-400">{data.projectedROI}%</p>
                  )}
                </div>

                <div className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg p-4">
                  <p className="text-xs text-gray-400 mb-2">Term</p>
                  {isEditing ? (
                    <input
                      type="text"
                      value={data.term}
                      onChange={(e) => updateField('term', e.target.value)}
                      className="w-full bg-[#1A1A1A] border border-[#2A2A2A] rounded px-2 py-1 text-white text-lg font-bold focus:outline-none focus:border-orange-500/50"
                    />
                  ) : (
                    <p className="text-lg font-bold text-white">{data.term}</p>
                  )}
                </div>
              </div>

              {/* Payout Frequency */}
              <div className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg p-4">
                <p className="text-xs text-gray-400 mb-2">Payout Frequency</p>
                {isEditing ? (
                  <select
                    value={data.payoutFrequency || 'quarterly'}
                    onChange={(e) => updateField('payoutFrequency', e.target.value)}
                    className="w-full bg-[#1A1A1A] border border-[#2A2A2A] rounded px-2 py-1 text-white text-sm font-semibold focus:outline-none focus:border-orange-500/50"
                  >
                    <option value="monthly">Monthly Payouts</option>
                    <option value="quarterly">Quarterly Payouts</option>
                    <option value="yearly">Yearly Payouts</option>
                    <option value="project_completion">Upon Sale</option>
                  </select>
                ) : (
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-green-400" />
                    <p className="text-sm font-semibold text-green-400">{getPayoutFrequencyLabel(data.payoutFrequency || 'quarterly')}</p>
                  </div>
                )}
              </div>

              {/* Funding Details */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg p-4">
                  <p className="text-xs text-gray-400 mb-2">Target Raise</p>
                  {isEditing ? (
                    <div className="relative">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                      <input
                        type="number"
                        value={data.targetRaise}
                        onChange={(e) => updateField('targetRaise', parseInt(e.target.value))}
                        className="w-full bg-[#1A1A1A] border border-[#2A2A2A] rounded px-6 py-1 text-white text-lg font-bold focus:outline-none focus:border-orange-500/50"
                      />
                    </div>
                  ) : (
                    <p className="text-lg font-bold text-white">${(data.targetRaise / 1000000).toFixed(1)}M</p>
                  )}
                </div>

                <div className="bg-[#0A0A0A] border border-green-500/20 rounded-lg p-4">
                  <p className="text-xs text-gray-400 mb-2">Current Commitments</p>
                  {isEditing ? (
                    <div className="relative">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                      <input
                        type="number"
                        value={data.currentCommitments}
                        onChange={(e) => updateField('currentCommitments', parseInt(e.target.value))}
                        className="w-full bg-[#1A1A1A] border border-green-500/30 rounded px-6 py-1 text-white text-lg font-bold focus:outline-none focus:border-green-500/50"
                      />
                    </div>
                  ) : (
                    <p className="text-lg font-bold text-green-400">${(data.currentCommitments / 1000000).toFixed(1)}M</p>
                  )}
                </div>

                <div className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg p-4">
                  <p className="text-xs text-gray-400 mb-2">Funded %</p>
                  <p className="text-lg font-bold text-blue-400">{data.funded}%</p>
                </div>

                <div className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg p-4">
                  <p className="text-xs text-gray-400 mb-2">Investors</p>
                  {isEditing ? (
                    <input
                      type="number"
                      value={data.investors}
                      onChange={(e) => updateField('investors', parseInt(e.target.value))}
                      className="w-full bg-[#1A1A1A] border border-[#2A2A2A] rounded px-2 py-1 text-white text-lg font-bold focus:outline-none focus:border-orange-500/50"
                    />
                  ) : (
                    <p className="text-lg font-bold text-white">{data.investors}</p>
                  )}
                </div>
              </div>

              {/* Funding Counter Settings */}
              {isEditing && (
                <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-4 mb-6">
                  <div className="flex items-center gap-3 mb-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={data.needsMoreFunding}
                        onChange={(e) => updateField('needsMoreFunding', e.target.checked)}
                        className="w-4 h-4 rounded border-gray-600 text-orange-600 focus:ring-orange-500"
                      />
                      <span className="text-sm font-semibold text-white">Enable Funding Counter</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={data.silentInvestment}
                        onChange={(e) => updateField('silentInvestment', e.target.checked)}
                        className="w-4 h-4 rounded border-gray-600 text-orange-600 focus:ring-orange-500"
                      />
                      <span className="text-sm font-semibold text-white">Silent Investment</span>
                    </label>
                  </div>

                  {data.needsMoreFunding && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs text-gray-400 mb-2">Minimum to Start Project</label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                          <input
                            type="number"
                            value={data.minimumToStart || ''}
                            onChange={(e) => updateField('minimumToStart', parseInt(e.target.value))}
                            className="w-full bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg pl-8 pr-4 py-2 text-white focus:outline-none focus:border-blue-500/50"
                            placeholder="0"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Project Funding Progress (if applicable) */}
              {data.needsMoreFunding && !isEditing && (
                <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-semibold text-white flex items-center gap-2">
                      <Target className="w-4 h-4 text-blue-400" />
                      Project Funding Progress
                    </p>
                    <p className="text-sm text-gray-400">{fundingProgress.toFixed(1)}%</p>
                  </div>

                  <div className="grid grid-cols-3 gap-3 mb-3">
                    <div>
                      <p className="text-xs text-gray-400">Min to Start</p>
                      <p className="text-sm font-bold text-white">${(data.minimumToStart / 1000000).toFixed(1)}M</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Committed</p>
                      <p className="text-sm font-bold text-green-400">${(data.currentCommitments / 1000000).toFixed(1)}M</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Still Needed</p>
                      <p className="text-sm font-bold text-orange-400">${(stillNeeded / 1000000).toFixed(1)}M</p>
                    </div>
                  </div>

                  <div className="w-full bg-[#1A1A1A] rounded-full h-3">
                    <div
                      className="h-3 rounded-full bg-gradient-to-r from-blue-600 to-cyan-500 transition-all"
                      style={{ width: `${Math.min(fundingProgress, 100)}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Project Details Toggle Button */}
              {!isEditing && data.projectDetails && (
                <button
                  onClick={() => setExpandedDetails(expandedDetails === opp.id ? null : opp.id)}
                  className="w-full mt-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] hover:border-orange-500/30 rounded-lg text-white font-semibold transition-all flex items-center justify-center gap-2"
                >
                  <FileText className="w-4 h-4" />
                  {expandedDetails === opp.id ? 'Hide Project Details' : 'View Detailed Project Breakdown'}
                  {expandedDetails !== opp.id && <Info className="w-4 h-4 text-orange-400" />}
                </button>
              )}

              {/* Expanded Project Details */}
              {expandedDetails === opp.id && data.projectDetails && (
                <div className="mt-4 space-y-4 border-t border-[#2A2A2A] pt-6">
                  {/* Project Overview */}
                  <div className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg p-5">
                    <h4 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                      <Building2 className="w-5 h-5 text-orange-400" />
                      Project Overview
                    </h4>
                    <p className="text-gray-300 mb-4 leading-relaxed">{data.projectDetails.description}</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="flex items-center gap-2 text-sm">
                        <MapPin className="w-4 h-4 text-orange-400" />
                        <span className="text-gray-400">Location:</span>
                        <span className="text-white font-semibold">{data.projectDetails.location}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Building2 className="w-4 h-4 text-orange-400" />
                        <span className="text-gray-400">Property Type:</span>
                        <span className="text-white font-semibold">{data.projectDetails.propertyType}</span>
                      </div>
                    </div>
                  </div>

                  {/* Financial Breakdown */}
                  <div className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg p-5">
                    <h4 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                      <DollarSign className="w-5 h-5 text-green-400" />
                      Financial Breakdown
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <div>
                        <p className="text-xs text-gray-400 mb-1">Acquisition Cost</p>
                        <p className="text-lg font-bold text-white">${(data.projectDetails.financialBreakdown.acquisitionCost / 1000000).toFixed(1)}M</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 mb-1">Development Cost</p>
                        <p className="text-lg font-bold text-white">${(data.projectDetails.financialBreakdown.developmentCost / 1000000).toFixed(1)}M</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 mb-1">Operating Expenses</p>
                        <p className="text-lg font-bold text-white">${(data.projectDetails.financialBreakdown.operatingExpenses / 1000000).toFixed(1)}M</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 mb-1">Projected Revenue</p>
                        <p className="text-lg font-bold text-green-400">${(data.projectDetails.financialBreakdown.projectedAnnualRevenue / 1000000).toFixed(1)}M</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 mb-1">Projected Profit</p>
                        <p className="text-lg font-bold text-green-400">${(data.projectDetails.financialBreakdown.projectedAnnualProfit / 1000000).toFixed(1)}M</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 mb-1">Net ROI</p>
                        <p className="text-lg font-bold text-orange-400">{data.projectDetails.financialBreakdown.netROI}%</p>
                      </div>
                    </div>
                  </div>

                  {/* Use of Funds */}
                  <div className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg p-5">
                    <h4 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                      <PieChart className="w-5 h-5 text-purple-400" />
                      Use of Funds
                    </h4>
                    <div className="space-y-3">
                      {data.projectDetails.useOfFunds.map((fund: any, idx: number) => (
                        <div key={idx}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm text-gray-300">{fund.category}</span>
                            <span className="text-sm font-semibold text-white">
                              ${(fund.amount / 1000000).toFixed(2)}M ({fund.percentage}%)
                            </span>
                          </div>
                          <div className="w-full bg-[#1A1A1A] rounded-full h-2">
                            <div
                              className="h-2 rounded-full bg-gradient-to-r from-purple-600 to-purple-400"
                              style={{ width: `${fund.percentage}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Timeline & Milestones */}
                  <div className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg p-5">
                    <h4 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                      <Clock className="w-5 h-5 text-blue-400" />
                      Timeline & Milestones
                    </h4>
                    <div className="space-y-3">
                      {data.projectDetails.timeline.map((milestone: any, idx: number) => (
                        <div key={idx} className="flex items-start gap-3">
                          <div className={`w-3 h-3 rounded-full mt-1 ${
                            milestone.status === 'completed' ? 'bg-green-500' :
                            milestone.status === 'in-progress' ? 'bg-blue-500' :
                            'bg-gray-600'
                          }`} />
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-semibold text-white">{milestone.phase}</p>
                              <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                                milestone.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                                milestone.status === 'in-progress' ? 'bg-blue-500/20 text-blue-400' :
                                'bg-gray-500/20 text-gray-400'
                              }`}>
                                {milestone.status}
                              </span>
                            </div>
                            <p className="text-xs text-gray-400 mt-1">
                              {new Date(milestone.startDate).toLocaleDateString()} - {new Date(milestone.endDate).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Risk Factors */}
                  <div className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg p-5">
                    <h4 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                      <ShieldAlert className="w-5 h-5 text-yellow-400" />
                      Risk Assessment
                    </h4>
                    <div className="space-y-3">
                      {data.projectDetails.riskFactors.map((risk: any, idx: number) => (
                        <div key={idx} className="border-l-2 border-yellow-500/30 pl-4">
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-sm font-semibold text-white">{risk.risk}</p>
                            <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                              risk.severity === 'High' ? 'bg-red-500/20 text-red-400' :
                              risk.severity === 'Medium' ? 'bg-yellow-500/20 text-yellow-400' :
                              'bg-green-500/20 text-green-400'
                            }`}>
                              {risk.severity} Risk
                            </span>
                          </div>
                          <p className="text-xs text-gray-400">Mitigation: {risk.mitigation}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Market Analysis */}
                  <div className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg p-5">
                    <h4 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                      <BarChart3 className="w-5 h-5 text-cyan-400" />
                      Market Analysis
                    </h4>
                    <div className="space-y-3">
                      <div>
                        <p className="text-xs text-gray-400 mb-1">Market Size</p>
                        <p className="text-sm text-white">{data.projectDetails.marketAnalysis.marketSize}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 mb-1">Target Market</p>
                        <p className="text-sm text-white">{data.projectDetails.marketAnalysis.targetMarket}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 mb-1">Competitive Advantage</p>
                        <p className="text-sm text-white">{data.projectDetails.marketAnalysis.competitiveAdvantage}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 mb-1">Growth Projection</p>
                        <p className="text-sm text-green-400 font-semibold">{data.projectDetails.marketAnalysis.growthProjection}</p>
                      </div>
                    </div>
                  </div>

                  {/* Team & Partners */}
                  <div className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg p-5">
                    <h4 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                      <Briefcase className="w-5 h-5 text-indigo-400" />
                      Team & Partners
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {data.projectDetails.team.map((member: any, idx: number) => (
                        <div key={idx} className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg p-3">
                          <p className="text-sm font-semibold text-white mb-1">{member.name}</p>
                          <p className="text-xs text-orange-400 mb-1">{member.role}</p>
                          <p className="text-xs text-gray-400">{member.experience}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Create New Opportunity Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-6">
          <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-[#1A1A1A] border-b border-[#2A2A2A] px-6 py-4 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-white">Create New Investment Opportunity</h2>
              <button
                onClick={handleCreateCancel}
                className="p-2 hover:bg-[#2A2A2A] rounded-lg transition"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Basic Info */}
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-white">Basic Information</h3>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Opportunity ID *</label>
                    <input
                      type="text"
                      value={createForm.id}
                      onChange={(e) => updateCreateField('id', e.target.value.toUpperCase())}
                      placeholder="e.g., PROP-028"
                      className="w-full bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg px-4 py-2 text-white focus:outline-none focus:border-orange-500/50"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Status</label>
                    <select
                      value={createForm.status}
                      onChange={(e) => updateCreateField('status', e.target.value)}
                      className="w-full bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg px-4 py-2 text-white focus:outline-none focus:border-orange-500/50"
                    >
                      <option value="open">Open</option>
                      <option value="closed">Closed</option>
                      <option value="funded">Funded</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-2">Title *</label>
                  <input
                    type="text"
                    value={createForm.title}
                    onChange={(e) => updateCreateField('title', e.target.value)}
                    placeholder="e.g., Multi-Family Value-Add"
                    className="w-full bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg px-4 py-2 text-white focus:outline-none focus:border-orange-500/50"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Category</label>
                    <select
                      value={createForm.category}
                      onChange={(e) => updateCreateField('category', e.target.value)}
                      className="w-full bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg px-4 py-2 text-white focus:outline-none focus:border-orange-500/50"
                    >
                      <option value="Company Equity">Company Equity</option>
                      <option value="Value-Add">Value-Add</option>
                      <option value="REIT">REIT</option>
                      <option value="Development">Development</option>
                      <option value="Tax-Deferred">Tax-Deferred</option>
                      <option value="Turnkey">Turnkey</option>
                      <option value="Fractional Ownership">Fractional Ownership</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Highlight Tag</label>
                    <input
                      type="text"
                      value={createForm.highlight}
                      onChange={(e) => updateCreateField('highlight', e.target.value)}
                      placeholder="e.g., Quick Returns"
                      className="w-full bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg px-4 py-2 text-white focus:outline-none focus:border-orange-500/50"
                    />
                  </div>
                </div>
              </div>

              {/* Investment Terms */}
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-white">Investment Terms</h3>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Minimum Investment</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                      <input
                        type="number"
                        value={createForm.minInvestment || ''}
                        onChange={(e) => updateCreateField('minInvestment', parseInt(e.target.value) || 0)}
                        className="w-full bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg pl-8 pr-4 py-2 text-white focus:outline-none focus:border-orange-500/50"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Maximum Investment</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                      <input
                        type="number"
                        value={createForm.maxInvestment || ''}
                        onChange={(e) => updateCreateField('maxInvestment', parseInt(e.target.value) || 0)}
                        className="w-full bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg pl-8 pr-4 py-2 text-white focus:outline-none focus:border-orange-500/50"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Projected ROI (%)</label>
                    <input
                      type="number"
                      value={createForm.projectedROI || ''}
                      onChange={(e) => updateCreateField('projectedROI', parseInt(e.target.value) || 0)}
                      className="w-full bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg px-4 py-2 text-white focus:outline-none focus:border-orange-500/50"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Investment Term</label>
                    <input
                      type="text"
                      value={createForm.term}
                      onChange={(e) => updateCreateField('term', e.target.value)}
                      placeholder="e.g., 3 years"
                      className="w-full bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg px-4 py-2 text-white focus:outline-none focus:border-orange-500/50"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-2">Payout Frequency</label>
                  <select
                    value={createForm.payoutFrequency || 'quarterly'}
                    onChange={(e) => updateCreateField('payoutFrequency', e.target.value)}
                    className="w-full bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg px-4 py-2 text-white focus:outline-none focus:border-orange-500/50"
                  >
                    <option value="monthly">Monthly Payouts</option>
                    <option value="quarterly">Quarterly Payouts</option>
                    <option value="yearly">Yearly Payouts</option>
                    <option value="project_completion">Upon Sale</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-2">How often will investors receive distributions?</p>
                </div>
              </div>

              {/* Funding Details */}
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-white">Funding Details</h3>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Target Raise</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                      <input
                        type="number"
                        value={createForm.targetRaise || ''}
                        onChange={(e) => updateCreateField('targetRaise', parseInt(e.target.value) || 0)}
                        className="w-full bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg pl-8 pr-4 py-2 text-white focus:outline-none focus:border-orange-500/50"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Current Commitments</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                      <input
                        type="number"
                        value={createForm.currentCommitments || ''}
                        onChange={(e) => updateCreateField('currentCommitments', parseInt(e.target.value) || 0)}
                        className="w-full bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg pl-8 pr-4 py-2 text-white focus:outline-none focus:border-orange-500/50"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-2">Number of Investors</label>
                  <input
                    type="number"
                    value={createForm.investors || ''}
                    onChange={(e) => updateCreateField('investors', parseInt(e.target.value) || 0)}
                    className="w-full bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg px-4 py-2 text-white focus:outline-none focus:border-orange-500/50"
                  />
                </div>
              </div>

              {/* Special Options */}
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-white">Special Options</h3>

                <div className="flex items-center gap-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={createForm.needsMoreFunding}
                      onChange={(e) => updateCreateField('needsMoreFunding', e.target.checked)}
                      className="w-4 h-4 rounded border-gray-600 text-orange-600 focus:ring-orange-500"
                    />
                    <span className="text-sm font-semibold text-white">Enable Funding Counter</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={createForm.silentInvestment}
                      onChange={(e) => updateCreateField('silentInvestment', e.target.checked)}
                      className="w-4 h-4 rounded border-gray-600 text-orange-600 focus:ring-orange-500"
                    />
                    <span className="text-sm font-semibold text-white">Silent Investment</span>
                  </label>
                </div>

                {createForm.needsMoreFunding && (
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Minimum to Start Project</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                      <input
                        type="number"
                        value={createForm.minimumToStart || ''}
                        onChange={(e) => updateCreateField('minimumToStart', parseInt(e.target.value) || 0)}
                        className="w-full bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg pl-8 pr-4 py-2 text-white focus:outline-none focus:border-orange-500/50"
                        placeholder="0"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="sticky bottom-0 bg-[#1A1A1A] border-t border-[#2A2A2A] px-6 py-4 flex items-center justify-end gap-3">
              <SecondaryButton onClick={handleCreateCancel} className="flex items-center gap-2">
                <X className="w-4 h-4" />
                Cancel
              </SecondaryButton>
              <PrimaryButton onClick={handleCreateSave} className="flex items-center gap-2">
                <Save className="w-4 h-4" />
                Create Opportunity
              </PrimaryButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
