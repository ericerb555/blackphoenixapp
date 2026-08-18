/**
 * Code Tracker - Development & Workflow Tracking
 * 
 * Tracks the complete lifecycle from Work Request → Quote → Contract → Invoice → Payment
 * with business profile filtering and real-time status monitoring
 * 
 * Created: 2026-03-21
 */

import { useState, useEffect } from 'react';
import { 
  ArrowLeft, Code, CheckCircle, XCircle, Clock, AlertCircle,
  ChevronRight, TrendingUp, Activity, FileText, DollarSign,
  Building2, Users, Calendar, RefreshCw, Filter, Search,
  Download, Eye, Zap, Package, Receipt, Wallet
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { authedHeaders } from '../utils/authHeaders';
import { supabase } from '../lib/supabase';

interface WorkflowItem {
  id: string;
  workRequestId: string;
  customerName: string;
  businessProfile: string;
  businessProfileId: string;
  currentStage: 'work-request' | 'quote' | 'contract' | 'invoice' | 'payment' | 'completed';
  stages: {
    workRequest: StageStatus;
    quote: StageStatus;
    contract: StageStatus;
    invoice: StageStatus;
    payment: StageStatus;
  };
  totalValue: number;
  createdAt: string;
  lastUpdated: string;
  daysInProgress: number;
}

interface StageStatus {
  status: 'pending' | 'in-progress' | 'completed' | 'failed' | 'skipped';
  completedAt?: string;
  duration?: number; // hours
  recordId?: string;
}

interface BusinessProfile {
  id: string;
  name: string;
  logo?: string;
}

interface StageMetrics {
  total: number;
  completed: number;
  inProgress: number;
  failed: number;
  avgDuration: number;
}

export default function CodeTracker() {
  const [workflows, setWorkflows] = useState<WorkflowItem[]>([]);
  const [businessProfiles, setBusinessProfiles] = useState<BusinessProfile[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStage, setFilterStage] = useState<string>('all');
  const [serverOnline, setServerOnline] = useState(false);
  const [useMockData, setUseMockData] = useState(false);
  
  // Metrics
  const [metrics, setMetrics] = useState({
    totalWorkflows: 0,
    completedWorkflows: 0,
    inProgressWorkflows: 0,
    totalRevenue: 0,
    avgCompletionTime: 0,
    stageMetrics: {
      workRequest: { total: 0, completed: 0, inProgress: 0, failed: 0, avgDuration: 0 },
      quote: { total: 0, completed: 0, inProgress: 0, failed: 0, avgDuration: 0 },
      contract: { total: 0, completed: 0, inProgress: 0, failed: 0, avgDuration: 0 },
      invoice: { total: 0, completed: 0, inProgress: 0, failed: 0, avgDuration: 0 },
      payment: { total: 0, completed: 0, inProgress: 0, failed: 0, avgDuration: 0 },
    }
  });

  useEffect(() => {
    // Test server connectivity first, then fall back to localStorage
    testServerHealth();
  }, [selectedProfile]);

  const testServerHealth = async () => {
    try {
      const API_BASE = `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      const response = await fetch(`${API_BASE}/health`, {
        headers: await authedHeaders(),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Server is healthy - using live data');
        setServerOnline(true);
        // Server is online, fetch from API
        fetchBusinessProfiles();
        fetchWorkflows();
      } else {
        console.log('ℹ️ Server returned non-OK status - using demo data');
        setServerOnline(false);
        // Fall back to localStorage
        loadFromLocalStorage();
      }
    } catch (error) {
      // Server is offline - this is expected, just use demo data
      console.log('ℹ️ Server offline - using localStorage demo mode');
      setServerOnline(false);
      // Fall back to localStorage
      loadFromLocalStorage();
    }
  };

  const loadFromLocalStorage = () => {
    console.log('📦 Loading data from localStorage...');
    
    // Try to load existing data from localStorage
    const storedWorkRequests = localStorage.getItem('work_requests');
    const storedQuotes = localStorage.getItem('quotes');
    const storedContracts = localStorage.getItem('contracts');
    const storedInvoices = localStorage.getItem('invoices');
    const storedProfiles = localStorage.getItem('business_profiles');

    // Parse or create sample data
    const workRequests = storedWorkRequests ? JSON.parse(storedWorkRequests) : createSampleWorkRequests();
    const quotes = storedQuotes ? JSON.parse(storedQuotes) : createSampleQuotes(workRequests);
    const contracts = storedContracts ? JSON.parse(storedContracts) : createSampleContracts(workRequests);
    const invoices = storedInvoices ? JSON.parse(storedInvoices) : createSampleInvoices(workRequests);
    const profiles = storedProfiles ? JSON.parse(storedProfiles) : createSampleProfiles();

    // Save to localStorage if they were just created
    if (!storedWorkRequests) localStorage.setItem('work_requests', JSON.stringify(workRequests));
    if (!storedQuotes) localStorage.setItem('quotes', JSON.stringify(quotes));
    if (!storedContracts) localStorage.setItem('contracts', JSON.stringify(contracts));
    if (!storedInvoices) localStorage.setItem('invoices', JSON.stringify(invoices));
    if (!storedProfiles) localStorage.setItem('business_profiles', JSON.stringify(profiles));

    setBusinessProfiles(profiles);
    buildWorkflowsFromData(workRequests, quotes, contracts, invoices);
    setLoading(false);
  };

  const createSampleProfiles = (): BusinessProfile[] => {
    return [
      { id: 'profile-1', name: 'Construction Division' },
      { id: 'profile-2', name: 'Renovation Services' },
      { id: 'profile-3', name: 'Commercial Projects' }
    ];
  };

  const createSampleWorkRequests = () => {
    const now = Date.now();
    return [
      {
        id: 'wr-001',
        customerName: 'Acme Corp',
        businessProfileId: 'profile-1',
        businessProfileName: 'Construction Division',
        status: 'approved',
        createdAt: new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString(),
        description: 'Office renovation project'
      },
      {
        id: 'wr-002',
        customerName: 'TechStart Inc',
        businessProfileId: 'profile-2',
        businessProfileName: 'Renovation Services',
        status: 'approved',
        createdAt: new Date(now - 20 * 24 * 60 * 60 * 1000).toISOString(),
        description: 'Kitchen remodel'
      },
      {
        id: 'wr-003',
        customerName: 'Retail Solutions LLC',
        businessProfileId: 'profile-3',
        businessProfileName: 'Commercial Projects',
        status: 'pending',
        createdAt: new Date(now - 10 * 24 * 60 * 60 * 1000).toISOString(),
        description: 'Store front upgrade'
      },
      {
        id: 'wr-004',
        customerName: 'HomeOwner John',
        businessProfileId: 'profile-1',
        businessProfileName: 'Construction Division',
        status: 'approved',
        createdAt: new Date(now - 5 * 24 * 60 * 60 * 1000).toISOString(),
        description: 'Bathroom renovation'
      }
    ];
  };

  const createSampleQuotes = (workRequests: any[]) => {
    return workRequests.map((wr, index) => ({
      id: `quote-${index + 1}`,
      workRequestId: wr.id,
      total: 15000 + (index * 5000),
      status: index < 3 ? 'approved' : 'pending',
      createdAt: wr.createdAt,
      updatedAt: new Date(new Date(wr.createdAt).getTime() + 2 * 24 * 60 * 60 * 1000).toISOString()
    }));
  };

  const createSampleContracts = (workRequests: any[]) => {
    return workRequests.slice(0, 3).map((wr, index) => ({
      id: `contract-${index + 1}`,
      workRequestId: wr.id,
      status: index < 2 ? 'signed' : 'pending',
      createdAt: new Date(new Date(wr.createdAt).getTime() + 3 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(new Date(wr.createdAt).getTime() + 5 * 24 * 60 * 60 * 1000).toISOString()
    }));
  };

  const createSampleInvoices = (workRequests: any[]) => {
    return workRequests.slice(0, 2).map((wr, index) => ({
      id: `invoice-${index + 1}`,
      workRequestId: wr.id,
      total: 15000 + (index * 5000),
      status: index < 1 ? 'paid' : 'sent',
      createdAt: new Date(new Date(wr.createdAt).getTime() + 10 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(new Date(wr.createdAt).getTime() + 15 * 24 * 60 * 60 * 1000).toISOString(),
      paidAt: index < 1 ? new Date(new Date(wr.createdAt).getTime() + 20 * 24 * 60 * 60 * 1000).toISOString() : undefined
    }));
  };

  const fetchBusinessProfiles = async () => {
    try {
      const API_BASE = `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6`;
      console.log('🔍 Fetching business profiles from:', `${API_BASE}/business-profiles`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(`${API_BASE}/business-profiles`, {
        headers: await authedHeaders(),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);

      console.log('📥 Business profiles response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Business profiles data:', data);
        setBusinessProfiles(data || []);
      } else {
        console.warn('⚠️ Business profiles response not ok:', response.status, response.statusText);
        // Set empty array if no profiles found
        setBusinessProfiles([]);
      }
    } catch (error) {
      console.error('❌ Failed to fetch business profiles:', error);
      console.log('ℹ️ Using fallback: The server may need to be redeployed with the new endpoints');
      // Set empty array on error - don't block the UI
      setBusinessProfiles([]);
      
      // Only show error toast once
      if (error instanceof Error && error.message.includes('aborted')) {
        toast.error('Server connection timeout. The edge function may need to be redeployed.');
      }
    }
  };

  const fetchWorkflows = async () => {
    setLoading(true);
    try {
      const API_BASE = `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6`;
      console.log('🔍 Fetching workflows from API base:', API_BASE);
      
      // Fetch work requests with error handling
      console.log('📥 Fetching work requests...');
      const workRequestsRes = await fetch(`${API_BASE}/work-requests`, {
        headers: await authedHeaders()
      });
      console.log('Work requests status:', workRequestsRes.status);
      const workRequests = workRequestsRes.ok ? await workRequestsRes.json() : [];
      console.log('Work requests count:', workRequests.length);

      // Fetch quotes with error handling
      console.log('📥 Fetching quotes...');
      const quotesRes = await fetch(`${API_BASE}/quotes`, {
        headers: await authedHeaders()
      });
      console.log('Quotes status:', quotesRes.status);
      const quotes = quotesRes.ok ? await quotesRes.json() : [];
      console.log('Quotes count:', quotes.length);

      // Contracts and invoices contain private financial data, so these use
      // the active admin session rather than the public anon key.
      const { data: { session } } = await supabase.auth.getSession();
      const privateHeaders = session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : null;
      console.log('📥 Fetching contracts...');
      const contractsRes = privateHeaders ? await fetch(`${API_BASE}/contracts`, { headers: privateHeaders }) : null;
      console.log('Contracts status:', contractsRes?.status);
      const contractsPayload = contractsRes?.ok ? await contractsRes.json() : { contracts: [] };
      const contracts = contractsPayload.contracts || [];
      console.log('Contracts count:', contracts.length);

      console.log('📥 Fetching invoices...');
      const invoicesRes = privateHeaders ? await fetch(`${API_BASE}/invoices`, { headers: privateHeaders }) : null;
      console.log('Invoices status:', invoicesRes?.status);
      const invoices = invoicesRes?.ok ? await invoicesRes.json() : [];
      console.log('Invoices count:', invoices.length);

      // Build workflow tracking
      const workflowMap = new Map<string, WorkflowItem>();

      // Start with work requests
      workRequests.forEach((wr: any) => {
        if (selectedProfile !== 'all' && wr.businessProfileId !== selectedProfile) return;

        const workflow: WorkflowItem = {
          id: wr.id,
          workRequestId: wr.id,
          customerName: wr.customerName || 'Unknown',
          businessProfile: wr.businessProfileName || 'Default',
          businessProfileId: wr.businessProfileId || 'default',
          currentStage: 'work-request',
          stages: {
            workRequest: {
              status: 'completed',
              completedAt: wr.createdAt,
              recordId: wr.id
            },
            quote: { status: 'pending' },
            contract: { status: 'pending' },
            invoice: { status: 'pending' },
            payment: { status: 'pending' }
          },
          totalValue: 0,
          createdAt: wr.createdAt,
          lastUpdated: wr.createdAt,
          daysInProgress: Math.floor((Date.now() - new Date(wr.createdAt).getTime()) / (1000 * 60 * 60 * 24))
        };
        workflowMap.set(wr.id, workflow);
      });

      // Add quotes
      quotes.forEach((quote: any) => {
        const workflow = workflowMap.get(quote.workRequestId);
        if (workflow) {
          workflow.stages.quote = {
            status: quote.status === 'approved' ? 'completed' : quote.status === 'rejected' ? 'failed' : 'in-progress',
            completedAt: quote.status === 'approved' ? quote.updatedAt : undefined,
            recordId: quote.id
          };
          workflow.currentStage = 'quote';
          workflow.totalValue = quote.total || 0;
          workflow.lastUpdated = quote.updatedAt;
        }
      });

      // Add contracts
      contracts.forEach((contract: any) => {
        const workflow = workflowMap.get(contract.workRequestId);
        if (workflow) {
          workflow.stages.contract = {
            status: contract.status === 'signed' ? 'completed' : contract.status === 'cancelled' ? 'failed' : 'in-progress',
            completedAt: contract.status === 'signed' ? contract.updatedAt : undefined,
            recordId: contract.id
          };
          workflow.currentStage = 'contract';
          workflow.lastUpdated = contract.updatedAt;
        }
      });

      // Add invoices
      invoices.forEach((invoice: any) => {
        const workflow = workflowMap.get(invoice.workRequestId);
        if (workflow) {
          workflow.stages.invoice = {
            status: invoice.status === 'paid' ? 'completed' : invoice.status === 'cancelled' ? 'failed' : 'in-progress',
            completedAt: invoice.status === 'paid' ? invoice.updatedAt : undefined,
            recordId: invoice.id
          };
          workflow.currentStage = 'invoice';
          workflow.lastUpdated = invoice.updatedAt;
          
          if (invoice.status === 'paid') {
            workflow.stages.payment = {
              status: 'completed',
              completedAt: invoice.paidAt || invoice.updatedAt,
              recordId: invoice.id
            };
            workflow.currentStage = 'completed';
          }
        }
      });

      const workflowArray = Array.from(workflowMap.values());
      console.log('✅ Total workflows built:', workflowArray.length);
      setWorkflows(workflowArray);
      calculateMetrics(workflowArray);
    } catch (error) {
      console.error('❌ Failed to fetch workflows:', error);
      toast.error('Failed to load workflow data. Please check console for details.');
      // Set empty workflows on error
      setWorkflows([]);
      calculateMetrics([]);
    } finally {
      setLoading(false);
    }
  };

  const buildWorkflowsFromData = (workRequests: any[], quotes: any[], contracts: any[], invoices: any[]) => {
    // Build workflow tracking
    const workflowMap = new Map<string, WorkflowItem>();

    // Start with work requests
    workRequests.forEach((wr: any) => {
      if (selectedProfile !== 'all' && wr.businessProfileId !== selectedProfile) return;

      const workflow: WorkflowItem = {
        id: wr.id,
        workRequestId: wr.id,
        customerName: wr.customerName || 'Unknown',
        businessProfile: wr.businessProfileName || 'Default',
        businessProfileId: wr.businessProfileId || 'default',
        currentStage: 'work-request',
        stages: {
          workRequest: {
            status: 'completed',
            completedAt: wr.createdAt,
            recordId: wr.id
          },
          quote: { status: 'pending' },
          contract: { status: 'pending' },
          invoice: { status: 'pending' },
          payment: { status: 'pending' }
        },
        totalValue: 0,
        createdAt: wr.createdAt,
        lastUpdated: wr.createdAt,
        daysInProgress: Math.floor((Date.now() - new Date(wr.createdAt).getTime()) / (1000 * 60 * 60 * 24))
      };
      workflowMap.set(wr.id, workflow);
    });

    // Add quotes
    quotes.forEach((quote: any) => {
      const workflow = workflowMap.get(quote.workRequestId);
      if (workflow) {
        workflow.stages.quote = {
          status: quote.status === 'approved' ? 'completed' : quote.status === 'rejected' ? 'failed' : 'in-progress',
          completedAt: quote.status === 'approved' ? quote.updatedAt : undefined,
          recordId: quote.id
        };
        workflow.currentStage = 'quote';
        workflow.totalValue = quote.total || 0;
        workflow.lastUpdated = quote.updatedAt;
      }
    });

    // Add contracts
    contracts.forEach((contract: any) => {
      const workflow = workflowMap.get(contract.workRequestId);
      if (workflow) {
        workflow.stages.contract = {
          status: contract.status === 'signed' ? 'completed' : contract.status === 'cancelled' ? 'failed' : 'in-progress',
          completedAt: contract.status === 'signed' ? contract.updatedAt : undefined,
          recordId: contract.id
        };
        workflow.currentStage = 'contract';
        workflow.lastUpdated = contract.updatedAt;
      }
    });

    // Add invoices
    invoices.forEach((invoice: any) => {
      const workflow = workflowMap.get(invoice.workRequestId);
      if (workflow) {
        workflow.stages.invoice = {
          status: invoice.status === 'paid' ? 'completed' : invoice.status === 'cancelled' ? 'failed' : 'in-progress',
          completedAt: invoice.status === 'paid' ? invoice.updatedAt : undefined,
          recordId: invoice.id
        };
        workflow.currentStage = 'invoice';
        workflow.lastUpdated = invoice.updatedAt;
        
        if (invoice.status === 'paid') {
          workflow.stages.payment = {
            status: 'completed',
            completedAt: invoice.paidAt || invoice.updatedAt,
            recordId: invoice.id
          };
          workflow.currentStage = 'completed';
        }
      }
    });

    const workflowArray = Array.from(workflowMap.values());
    console.log('✅ Total workflows built:', workflowArray.length);
    setWorkflows(workflowArray);
    calculateMetrics(workflowArray);
  };

  const calculateMetrics = (workflows: WorkflowItem[]) => {
    const total = workflows.length;
    const completed = workflows.filter(w => w.currentStage === 'completed').length;
    const inProgress = total - completed;
    const revenue = workflows.reduce((sum, w) => sum + w.totalValue, 0);

    const stageMetrics = {
      workRequest: calculateStageMetrics(workflows, 'workRequest'),
      quote: calculateStageMetrics(workflows, 'quote'),
      contract: calculateStageMetrics(workflows, 'contract'),
      invoice: calculateStageMetrics(workflows, 'invoice'),
      payment: calculateStageMetrics(workflows, 'payment'),
    };

    setMetrics({
      totalWorkflows: total,
      completedWorkflows: completed,
      inProgressWorkflows: inProgress,
      totalRevenue: revenue,
      avgCompletionTime: 14.5, // Mock - calculate from completed workflows
      stageMetrics
    });
  };

  const calculateStageMetrics = (workflows: WorkflowItem[], stage: keyof WorkflowItem['stages']): StageMetrics => {
    const total = workflows.length;
    const completed = workflows.filter(w => w.stages[stage].status === 'completed').length;
    const inProgress = workflows.filter(w => w.stages[stage].status === 'in-progress').length;
    const failed = workflows.filter(w => w.stages[stage].status === 'failed').length;

    return {
      total,
      completed,
      inProgress,
      failed,
      avgDuration: 24 // Mock hours
    };
  };

  const getStageIcon = (stage: string) => {
    switch (stage) {
      case 'workRequest': return FileText;
      case 'quote': return DollarSign;
      case 'contract': return Package;
      case 'invoice': return Receipt;
      case 'payment': return Wallet;
      default: return Activity;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-400';
      case 'in-progress': return 'text-orange-400';
      case 'failed': return 'text-red-400';
      case 'pending': return 'text-gray-500';
      default: return 'text-gray-400';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return CheckCircle;
      case 'in-progress': return Clock;
      case 'failed': return XCircle;
      case 'pending': return AlertCircle;
      default: return Clock;
    }
  };

  const filteredWorkflows = workflows.filter(workflow => {
    const matchesSearch = workflow.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         workflow.workRequestId.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStage = filterStage === 'all' || workflow.currentStage === filterStage;
    return matchesSearch && matchesStage;
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      {/* Server Status Banner */}
      {!serverOnline && !loading && (
        <div className="bg-gradient-to-r from-yellow-500/10 to-yellow-600/10 border-b border-yellow-500/20 p-4">
          <div className="max-w-[1800px] mx-auto">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-yellow-300 mb-1">📦 Running in LocalStorage Demo Mode</h4>
                <p className="text-sm text-yellow-200/80 mb-2">
                  The Supabase server is offline, so we're using sample data stored in your browser's LocalStorage to demonstrate the Code Tracker functionality.
                </p>
                <div className="flex items-center gap-4 text-sm text-yellow-200/70">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>Sample workflows loaded</span>
                  </div>
                  <span className="text-yellow-500/30">•</span>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>All features functional</span>
                  </div>
                  <span className="text-yellow-500/30">•</span>
                  <div className="flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>Deploy server for live data</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {serverOnline && workflows.length === 0 && !loading && (
        <div className="bg-gradient-to-r from-blue-500/10 to-blue-600/10 border-b border-blue-500/20 p-4">
          <div className="max-w-[1800px] mx-auto">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-blue-300 mb-1">✅ Server Online - No Data Found</h4>
                <p className="text-sm text-blue-200/80">
                  The server is running but no workflows were found. Create some work requests to see them tracked here.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-[#0F0F0F] border-b border-[#2A2A2A] p-6">
        <div className="max-w-[1800px] mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <button
                onClick={() => window.history.back()}
                className="p-2 hover:bg-[#1A1A1A] rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-400" />
              </button>
              <div>
                <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-600 to-purple-700 flex items-center justify-center">
                    <Code className="w-6 h-6 text-white" />
                  </div>
                  Code Tracker
                </h1>
                <p className="text-gray-400 mt-1">
                  Development & Workflow Tracking - Work Request → Payment Lifecycle
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={fetchWorkflows}
                disabled={loading}
                className="px-4 py-2 bg-[#1A1A1A] border border-[#2A2A2A] hover:border-purple-500/50 text-gray-300 hover:text-white rounded-lg transition-all flex items-center gap-2 disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-4">
            {/* Business Profile Filter */}
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-gray-400" />
              <select
                value={selectedProfile}
                onChange={(e) => setSelectedProfile(e.target.value)}
                className="px-4 py-2 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg text-white focus:outline-none focus:border-purple-500/50"
              >
                <option value="all">All Profiles</option>
                {businessProfiles.map(profile => (
                  <option key={profile.id} value={profile.id}>{profile.name}</option>
                ))}
              </select>
            </div>

            {/* Stage Filter */}
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <select
                value={filterStage}
                onChange={(e) => setFilterStage(e.target.value)}
                className="px-4 py-2 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg text-white focus:outline-none focus:border-purple-500/50"
              >
                <option value="all">All Stages</option>
                <option value="work-request">Work Request</option>
                <option value="quote">Quote</option>
                <option value="contract">Contract</option>
                <option value="invoice">Invoice</option>
                <option value="payment">Payment</option>
                <option value="completed">Completed</option>
              </select>
            </div>

            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by customer or request ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg text-white text-sm focus:outline-none focus:border-purple-500/50"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Metrics Dashboard */}
      <div className="border-b border-[#2A2A2A] bg-[#0F0F0F] p-6">
        <div className="max-w-[1800px] mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Total Workflows */}
            <div className="p-4 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-400">Total Workflows</span>
                <Activity className="w-4 h-4 text-purple-400" />
              </div>
              <div className="text-2xl font-bold text-white">{metrics.totalWorkflows}</div>
            </div>

            {/* In Progress */}
            <div className="p-4 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-400">In Progress</span>
                <Clock className="w-4 h-4 text-orange-400" />
              </div>
              <div className="text-2xl font-bold text-white">{metrics.inProgressWorkflows}</div>
            </div>

            {/* Completed */}
            <div className="p-4 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-400">Completed</span>
                <CheckCircle className="w-4 h-4 text-green-400" />
              </div>
              <div className="text-2xl font-bold text-white">{metrics.completedWorkflows}</div>
            </div>

            {/* Total Revenue */}
            <div className="p-4 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-400">Total Revenue</span>
                <DollarSign className="w-4 h-4 text-green-400" />
              </div>
              <div className="text-2xl font-bold text-white">{formatCurrency(metrics.totalRevenue)}</div>
            </div>

            {/* Avg Completion Time */}
            <div className="p-4 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-400">Avg Completion</span>
                <TrendingUp className="w-4 h-4 text-blue-400" />
              </div>
              <div className="text-2xl font-bold text-white">{metrics.avgCompletionTime} days</div>
            </div>
          </div>

          {/* Stage Breakdown */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-5 gap-4">
            {Object.entries(metrics.stageMetrics).map(([stage, data]) => {
              const Icon = getStageIcon(stage);
              const stageName = stage.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
              const completionRate = data.total > 0 ? Math.round((data.completed / data.total) * 100) : 0;

              return (
                <div key={stage} className="p-4 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
                      <Icon className="w-4 h-4 text-purple-400" />
                    </div>
                    <span className="text-sm font-semibold text-white">{stageName}</span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-400">Completion</span>
                      <span className="text-white font-semibold">{completionRate}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-[#2A2A2A] rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-purple-600 to-purple-500 rounded-full transition-all duration-500"
                        style={{ width: `${completionRate}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-green-400">{data.completed} done</span>
                      <span className="text-orange-400">{data.inProgress} active</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Workflows List */}
      <div className="p-6">
        <div className="max-w-[1800px] mx-auto">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <RefreshCw className="w-8 h-8 text-purple-400 animate-spin" />
            </div>
          ) : filteredWorkflows.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Code className="w-16 h-16 text-gray-600 mb-4" />
              <h3 className="text-xl font-bold text-gray-400 mb-2">No workflows found</h3>
              <p className="text-gray-500">Try adjusting your filters</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredWorkflows.map(workflow => (
                <div
                  key={workflow.id}
                  className="p-6 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl hover:border-purple-500/50 transition-all"
                >
                  {/* Workflow Header */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-lg bg-purple-500/10 flex items-center justify-center">
                        <FileText className="w-6 h-6 text-purple-400" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-white">{workflow.customerName}</h3>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-sm text-gray-400">ID: {workflow.workRequestId.slice(0, 8)}</span>
                          <span className="text-sm text-gray-500">•</span>
                          <div className="flex items-center gap-1 text-sm text-gray-400">
                            <Building2 className="w-3 h-3" />
                            {workflow.businessProfile}
                          </div>
                          <span className="text-sm text-gray-500">•</span>
                          <span className="text-sm text-gray-400">{workflow.daysInProgress} days</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-bold text-white">{formatCurrency(workflow.totalValue)}</div>
                      <div className="text-sm text-gray-400">{formatDate(workflow.createdAt)}</div>
                    </div>
                  </div>

                  {/* Workflow Progress */}
                  <div className="relative">
                    {/* Progress Line */}
                    <div className="absolute top-6 left-6 right-6 h-0.5 bg-[#2A2A2A]">
                      <div 
                        className="h-full bg-gradient-to-r from-purple-600 to-purple-500 transition-all duration-500"
                        style={{ width: `${(Object.values(workflow.stages).filter(s => s.status === 'completed').length / 5) * 100}%` }}
                      />
                    </div>

                    {/* Stages */}
                    <div className="relative flex items-center justify-between">
                      {Object.entries(workflow.stages).map(([stageName, stage], index) => {
                        const Icon = getStageIcon(stageName);
                        const StatusIcon = getStatusIcon(stage.status);
                        const isActive = workflow.currentStage === stageName;

                        return (
                          <div key={stageName} className="flex flex-col items-center relative z-10">
                            <div className={`w-12 h-12 rounded-full border-2 flex items-center justify-center mb-2 transition-all ${
                              stage.status === 'completed' 
                                ? 'bg-green-500/20 border-green-500' 
                                : stage.status === 'in-progress'
                                ? 'bg-orange-500/20 border-orange-500 animate-pulse'
                                : stage.status === 'failed'
                                ? 'bg-red-500/20 border-red-500'
                                : 'bg-[#1A1A1A] border-[#2A2A2A]'
                            }`}>
                              <Icon className={`w-5 h-5 ${getStatusColor(stage.status)}`} />
                            </div>
                            <span className={`text-sm font-semibold ${isActive ? 'text-white' : 'text-gray-400'}`}>
                              {stageName.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                            </span>
                            <div className="flex items-center gap-1 mt-1">
                              <StatusIcon className={`w-3 h-3 ${getStatusColor(stage.status)}`} />
                              <span className={`text-sm ${getStatusColor(stage.status)}`}>
                                {stage.status}
                              </span>
                            </div>
                            {stage.completedAt && (
                              <span className="text-sm text-gray-500 mt-1">
                                {formatDate(stage.completedAt)}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}