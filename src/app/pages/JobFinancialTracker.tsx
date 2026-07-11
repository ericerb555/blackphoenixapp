/**
 * Job Financial Tracker
 * Comprehensive financial tracking and management for all jobs
 */

import { useState, useEffect } from 'react';
import { jobFinancialService, type JobFinancialSummary, type TimeEntry, type PurchaseEntry } from '../lib/services/jobFinancialService';
import {
  DollarSign, TrendingUp, TrendingDown, Clock, CheckCircle, AlertCircle,
  Search, Filter, Calendar, Eye, Edit, Trash2, Plus, Download, FileText,
  Package, Users, Building2, ArrowUpRight, ArrowDownRight, BarChart3,
  PieChart, Target, Percent, CreditCard, Receipt, X, ChevronRight
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { DataTable } from '../components/ui/table/DataTable';
import type { DataTableColumn } from '../components/ui/table/DataTable';

interface Job {
  id: string;
  jobNumber: string;
  customerName: string;
  projectName: string;
  status: 'active' | 'completed' | 'on-hold' | 'cancelled';
  startDate: string;
  estimatedRevenue: number;
  actualRevenue: number;
  estimatedCosts: number;
  actualCosts: number;
  profitMargin: number;
  completionPercentage: number;
}

export default function JobFinancialTracker() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [purchases, setPurchases] = useState<PurchaseEntry[]>([]);

  // Populate demo data on first load
  useEffect(() => {
    const hasTimeData = localStorage.getItem('time_entries_job_1');
    if (!hasTimeData) {
      console.log('📊 Populating demo financial data...');
      jobFinancialService.populateDemoData('job_1');
      toast.success('Demo financial data loaded! Check job JOB-2026-001');
    }
  }, []);

  // Clean sample data
  const [jobs] = useState<Job[]>([
    {
      id: 'job1',
      jobNumber: 'JOB-2026-001',
      customerName: 'ABC Corporation',
      projectName: 'Office HVAC Installation',
      status: 'active',
      startDate: '2026-02-15',
      estimatedRevenue: 45000,
      actualRevenue: 22500,
      estimatedCosts: 30000,
      actualCosts: 15000,
      profitMargin: 33.3,
      completionPercentage: 50
    },
    {
      id: 'job2',
      jobNumber: 'JOB-2026-002',
      customerName: 'Tech Solutions Inc',
      projectName: 'Commercial Plumbing Upgrade',
      status: 'active',
      startDate: '2026-02-18',
      estimatedRevenue: 28000,
      actualRevenue: 8400,
      estimatedCosts: 18000,
      actualCosts: 5400,
      profitMargin: 35.7,
      completionPercentage: 30
    },
    {
      id: 'job3',
      jobNumber: 'JOB-2026-003',
      customerName: 'Retail Solutions LLC',
      projectName: 'Store Electrical System',
      status: 'completed',
      startDate: '2026-01-10',
      estimatedRevenue: 67500,
      actualRevenue: 68200,
      estimatedCosts: 45000,
      actualCosts: 43800,
      profitMargin: 35.8,
      completionPercentage: 100
    }
  ]);

  const getStatusColor = (status: Job['status']) => {
    switch (status) {
      case 'active': return 'bg-blue-600';
      case 'completed': return 'bg-green-600';
      case 'on-hold': return 'bg-yellow-600';
      case 'cancelled': return 'bg-red-600';
      default: return 'bg-gray-600';
    }
  };

  const getStatusLabel = (status: Job['status']) => {
    return status.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  // Load detailed financial data for a job
  const handleViewJobDetails = (jobId: string) => {
    console.log('📊 Loading financial details for job:', jobId);
    setSelectedJobId(jobId);

    // Map job1 to job_1 for the service
    const serviceJobId = jobId.replace('job', 'job_');
    const timeData = jobFinancialService.getTimeEntries(serviceJobId);
    const purchaseData = jobFinancialService.getPurchases(serviceJobId);

    setTimeEntries(timeData);
    setPurchases(purchaseData);

    console.log('✅ Loaded:', { timeEntries: timeData.length, purchases: purchaseData.length });
  };

  const filteredJobs = jobs.filter(job => {
    const matchesSearch = 
      job.jobNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.projectName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || job.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const columns: DataTableColumn<Job>[] = [
    {
      key: 'job',
      header: 'Job',
      render: (row) => (
        <div>
          <p className="font-mono font-semibold text-white">{row.jobNumber}</p>
          <p className="text-sm text-gray-400">{row.projectName}</p>
          <p className="text-sm text-gray-500">{row.customerName}</p>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => (
        <div className="flex flex-col gap-2">
          <span className={`px-2 py-1 rounded-full text-sm font-semibold text-white ${getStatusColor(row.status)}`}>
            {getStatusLabel(row.status)}
          </span>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-2 bg-[#0F0F0F] rounded-full overflow-hidden">
              <div 
                className="h-full bg-blue-500 rounded-full"
                style={{ width: `${row.completionPercentage}%` }}
              />
            </div>
            <span className="text-sm text-gray-400 font-semibold">{row.completionPercentage}%</span>
          </div>
        </div>
      ),
      align: 'center',
    },
    {
      key: 'revenue',
      header: 'Revenue',
      render: (row) => (
        <div>
          <p className="font-semibold text-white">${row.actualRevenue.toLocaleString()}</p>
          <p className="text-sm text-gray-400">of ${row.estimatedRevenue.toLocaleString()}</p>
        </div>
      ),
      align: 'right',
    },
    {
      key: 'costs',
      header: 'Costs',
      render: (row) => (
        <div>
          <p className="font-semibold text-white">${row.actualCosts.toLocaleString()}</p>
          <p className="text-sm text-gray-400">of ${row.estimatedCosts.toLocaleString()}</p>
        </div>
      ),
      align: 'right',
    },
    {
      key: 'profit',
      header: 'Profit',
      render: (row) => {
        const profit = row.actualRevenue - row.actualCosts;
        const isPositive = profit >= 0;
        return (
          <div>
            <p className={`font-semibold ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
              ${profit.toLocaleString()}
            </p>
            <p className="text-sm text-gray-400">{row.profitMargin.toFixed(1)}% margin</p>
          </div>
        );
      },
      align: 'right',
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (row) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleViewJobDetails(row.id)}
            className="p-1.5 bg-blue-600/20 hover:bg-blue-600/30 rounded text-blue-400 transition"
            title="View Hours & Receipts"
          >
            <Eye className="w-4 h-4" />
          </button>
          <button
            onClick={() => window.location.href = `/job-financial-detail?id=${row.id}&edit=true`}
            className="p-1.5 bg-purple-600/20 hover:bg-purple-600/30 rounded text-purple-400 transition"
            title="Edit"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              if (confirm('Delete this job?')) {
                toast.success('Job deleted');
              }
            }}
            className="p-1.5 bg-red-600/20 hover:bg-red-600/30 rounded text-red-400 transition"
            title="Delete"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
      align: 'right',
    },
  ];

  // Calculate totals
  const stats = {
    totalJobs: jobs.length,
    activeJobs: jobs.filter(j => j.status === 'active').length,
    completedJobs: jobs.filter(j => j.status === 'completed').length,
    totalRevenue: jobs.reduce((sum, j) => sum + j.actualRevenue, 0),
    totalCosts: jobs.reduce((sum, j) => sum + j.actualCosts, 0),
    totalProfit: jobs.reduce((sum, j) => sum + (j.actualRevenue - j.actualCosts), 0)
  };

  return (
    <div className="w-full space-y-6 pb-8" style={{ alignSelf: 'stretch' }}>
      {/* Unified Back Button */}
      <button
        onClick={() => window.location.href = '/unified-dashboard'}
        className="flex items-center gap-2 px-4 py-2 bg-[#1A1A1A] hover:bg-[#2A2A2A] border border-[#2A2A2A] hover:border-[#ea580c] text-gray-300 hover:text-white rounded-lg transition-all duration-200"
      >
        <ChevronRight className="w-4 h-4 rotate-180" />
        Back to Unified Dashboard
      </button>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-600 to-green-700 flex items-center justify-center">
              <BarChart3 className="w-6 h-6 text-white" />
            </div>
            Job Financial Tracker
          </h1>
          <p className="text-gray-400">Track revenue, costs, and profitability across all jobs</p>
        </div>
        <button
          onClick={() => window.location.href = '/job-financial-detail?new=true'}
          className="px-4 py-2 bg-gradient-to-r from-orange-600/10 to-red-600/10 text-gray-300 hover:from-orange-600/20 hover:to-red-600/20 hover:text-white border-2 border-orange-500/30 hover:border-orange-400/50 hover:shadow-lg hover:shadow-orange-500/30 hover:scale-102 transition-all duration-300 rounded-xl font-bold flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          New Job
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-6 gap-4">
        <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl p-4 text-white">
          <Package className="w-6 h-6 mb-2 opacity-80" />
          <p className="text-2xl font-bold">{stats.totalJobs}</p>
          <p className="text-sm opacity-90">Total Jobs</p>
        </div>
        <div className="bg-gradient-to-br from-green-600 to-green-700 rounded-xl p-4 text-white">
          <CheckCircle className="w-6 h-6 mb-2 opacity-80" />
          <p className="text-2xl font-bold">{stats.activeJobs}</p>
          <p className="text-sm opacity-90">Active</p>
        </div>
        <div className="bg-gradient-to-br from-purple-600 to-purple-700 rounded-xl p-4 text-white">
          <Target className="w-6 h-6 mb-2 opacity-80" />
          <p className="text-2xl font-bold">{stats.completedJobs}</p>
          <p className="text-sm opacity-90">Completed</p>
        </div>
        <div className="bg-gradient-to-br from-emerald-600 to-emerald-700 rounded-xl p-4 text-white">
          <TrendingUp className="w-6 h-6 mb-2 opacity-80" />
          <p className="text-2xl font-bold">${(stats.totalRevenue / 1000).toFixed(0)}K</p>
          <p className="text-sm opacity-90">Revenue</p>
        </div>
        <div className="bg-gradient-to-br from-orange-600 to-orange-700 rounded-xl p-4 text-white">
          <Receipt className="w-6 h-6 mb-2 opacity-80" />
          <p className="text-2xl font-bold">${(stats.totalCosts / 1000).toFixed(0)}K</p>
          <p className="text-sm opacity-90">Costs</p>
        </div>
        <div className="bg-gradient-to-br from-green-600 to-green-700 rounded-xl p-4 text-white">
          <DollarSign className="w-6 h-6 mb-2 opacity-80" />
          <p className="text-2xl font-bold">${(stats.totalProfit / 1000).toFixed(0)}K</p>
          <p className="text-sm opacity-90">Profit</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-6">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-[300px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by job number, customer, or project..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="on-hold">On Hold</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          {(searchQuery || statusFilter !== 'all') && (
            <button
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('all');
              }}
              className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition flex items-center gap-2"
            >
              <X className="w-4 h-4" />
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Jobs Table */}
      <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] overflow-hidden">
        <div className="px-6 py-4 bg-[#0F0F0F] border-b border-[#2A2A2A] flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">
            Jobs ({filteredJobs.length})
          </h2>
          <button
            onClick={() => {
              const csv = ['Job Number,Customer,Project,Status,Est Revenue,Actual Revenue,Est Cost,Actual Cost,Margin %', ...filteredJobs.map((j: any) => `"${j.jobNumber}","${j.customerName}","${j.projectName}","${j.status}","${j.estimatedRevenue}","${j.actualRevenue}","${j.estimatedCosts}","${j.actualCosts}","${j.profitMargin}"`)].join('\n');
              const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = 'job-financials.csv'; a.click();
              toast.success('Job financials exported');
            }}
            className="px-4 py-2 bg-gradient-to-r from-blue-600/10 to-cyan-600/10 text-gray-300 hover:from-blue-600/20 hover:to-cyan-600/20 hover:text-white border-2 border-blue-500/30 hover:border-blue-400/50 transition-all duration-300 rounded-lg font-semibold flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
        <DataTable
          columns={columns}
          data={filteredJobs}
          emptyMessage="No jobs found"
          containerClassName="bg-transparent border-none"
          headerClassName="bg-[#0A0A0A] border-[#2A2A2A]"
        />
      </div>

      {/* Job Financial Details */}
      {selectedJobId && (
        <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] overflow-hidden">
          <div className="px-6 py-4 bg-[#0F0F0F] border-b border-[#2A2A2A] flex items-center justify-between">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Receipt className="w-6 h-6 text-orange-400" />
              Financial Details - {jobs.find(j => j.id === selectedJobId)?.jobNumber}
            </h2>
            <button
              onClick={() => setSelectedJobId(null)}
              className="p-2 hover:bg-[#2A2A2A] rounded-lg text-gray-400 hover:text-white transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Time Entries */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <Clock className="w-5 h-5 text-blue-400" />
                Hours Tracked ({timeEntries.length})
              </h3>
              {timeEntries.length === 0 ? (
                <p className="text-gray-400 text-sm">No time entries yet</p>
              ) : (
                <div className="space-y-3">
                  {timeEntries.map((entry) => (
                    <div key={entry.id} className="bg-[#0A0A0A] rounded-lg p-4 border border-[#2A2A2A]">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-semibold text-white">{entry.employeeName}</p>
                          <p className="text-sm text-gray-400">{entry.description}</p>
                        </div>
                        {entry.approved ? (
                          <CheckCircle className="w-5 h-5 text-green-400" />
                        ) : (
                          <AlertCircle className="w-5 h-5 text-yellow-400" />
                        )}
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-sm">
                        <div>
                          <p className="text-gray-500">Date</p>
                          <p className="text-white">{new Date(entry.date).toLocaleDateString()}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Hours</p>
                          <p className="text-white font-semibold">{entry.hours}h</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Total</p>
                          <p className="text-green-400 font-semibold">${entry.total.toFixed(2)}</p>
                        </div>
                      </div>
                      {entry.category === 'overtime' && (
                        <div className="mt-2">
                          <span className="px-2 py-1 bg-orange-600/20 text-orange-400 text-xs font-semibold rounded">
                            OVERTIME
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Purchase Receipts */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <Receipt className="w-5 h-5 text-green-400" />
                Receipts & Purchases ({purchases.length})
              </h3>
              {purchases.length === 0 ? (
                <p className="text-gray-400 text-sm">No purchases yet</p>
              ) : (
                <div className="space-y-3">
                  {purchases.map((purchase) => (
                    <div key={purchase.id} className="bg-[#0A0A0A] rounded-lg p-4 border border-[#2A2A2A]">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-semibold text-white">{purchase.vendor}</p>
                          <p className="text-sm text-gray-400">{purchase.description}</p>
                        </div>
                        {purchase.approved ? (
                          <CheckCircle className="w-5 h-5 text-green-400" />
                        ) : (
                          <AlertCircle className="w-5 h-5 text-yellow-400" />
                        )}
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-sm mb-2">
                        <div>
                          <p className="text-gray-500">Date</p>
                          <p className="text-white">{new Date(purchase.date).toLocaleDateString()}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Category</p>
                          <p className="text-white">{purchase.category}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Total</p>
                          <p className="text-green-400 font-semibold">${purchase.totalCost.toFixed(2)}</p>
                        </div>
                      </div>
                      {purchase.receiptUrl && (
                        <div className="mt-2">
                          <a
                            href={purchase.receiptUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2 py-1 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 text-xs font-semibold rounded transition"
                          >
                            <FileText className="w-3 h-3" />
                            View Receipt
                          </a>
                        </div>
                      )}
                      <div className="mt-2 text-xs text-gray-500">
                        Invoice: {purchase.invoiceNumber} • Paid by: {purchase.paidBy}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
