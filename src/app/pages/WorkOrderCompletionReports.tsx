/**
 * Work Order Completion Reports Page
 * View all completed work orders with final financial breakdowns
 */

import { useState, useEffect } from 'react';
import {
  CheckCircle,
  Search,
  Filter,
  Calendar,
  DollarSign,
  TrendingUp,
  Eye,
  Download,
  ArrowLeft,
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { WorkOrderCompletionReport } from '../components/WorkOrderCompletionReport';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { supabase } from '../lib/supabase';

const SERVER = `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6`;

interface CompletionReportsProps {
  onNavigate: (path: string) => void;
}

export default function WorkOrderCompletionReports({ onNavigate }: CompletionReportsProps) {
  const [completedWorkOrders, setCompletedWorkOrders] = useState<any[]>([]);
  const [filteredWorkOrders, setFilteredWorkOrders] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState<'all' | '30days' | '90days' | 'year'>('all');
  const [selectedReport, setSelectedReport] = useState<any | null>(null);

  useEffect(() => {
    loadCompletedWorkOrders();
  }, []);

  useEffect(() => {
    filterWorkOrders();
  }, [completedWorkOrders, searchTerm, dateFilter]);

  const loadCompletedWorkOrders = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${SERVER}/work-orders/completion-reports`, { headers: { Authorization: `Bearer ${session?.access_token || publicAnonKey}` } });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Unable to load completion reports.');
      setCompletedWorkOrders(Array.isArray(data.reports) ? data.reports : []);
    } catch (error: any) {
      console.error('WorkOrderCompletionReports:', error);
      setCompletedWorkOrders([]);
    }
  };

  const filterWorkOrders = () => {
    let filtered = [...completedWorkOrders];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(wo =>
        wo.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        wo.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        wo.itemNumber?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Date filter
    if (dateFilter !== 'all') {
      const now = new Date();
      const filterDate = new Date();
      
      if (dateFilter === '30days') {
        filterDate.setDate(now.getDate() - 30);
      } else if (dateFilter === '90days') {
        filterDate.setDate(now.getDate() - 90);
      } else if (dateFilter === 'year') {
        filterDate.setFullYear(now.getFullYear() - 1);
      }

      filtered = filtered.filter(wo => {
        const completionDate = new Date(wo.completionDate || wo.lastModified);
        return completionDate >= filterDate;
      });
    }

    setFilteredWorkOrders(filtered);
  };

  const viewReport = (workOrderId: string) => {
    const reportData = completedWorkOrders.find((workOrder) => workOrder.id === workOrderId);
    if (reportData) setSelectedReport(reportData);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // Calculate summary stats
  const totalRevenue = completedWorkOrders.reduce((sum, wo) => 
    sum + (wo.finalInvoiceAmount || wo.estimatedValue || 0), 0
  );

  /**
   * Averaged over the jobs whose costs are actually known, not over all of them.
   *
   * `wo.profitMargin || 0` turned every unknown job into a 0% one and divided by
   * the whole list, so the headline moved every time a job was finished without
   * its costs recorded — in the opposite direction to the old bug, and just as
   * wrong. Jobs with nothing to measure are counted separately and said out
   * loud instead.
   */
  const measured = completedWorkOrders.filter(
    (wo) => wo.profitMargin !== null && wo.profitMargin !== undefined,
  );
  const unmeasuredCount = completedWorkOrders.length - measured.length;
  const totalProfit = measured.reduce((sum, wo) => sum + (wo.profitAmount || 0), 0);
  const avgProfitMargin = measured.length > 0
    ? measured.reduce((sum, wo) => sum + (wo.profitMargin || 0), 0) / measured.length
    : null;

  return (
    <div className="min-h-screen bg-[#0A0A0A] pb-20">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-[#1A1A1A] border-b border-[#2A2A2A]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button
                onClick={() => onNavigate('unified-dashboard')}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-xl font-bold text-white flex items-center gap-2">
                  <CheckCircle className="w-6 h-6 text-green-500" />
                  Completed Work Orders
                </h1>
                <p className="text-sm text-gray-400">
                  Final reports for paid invoices
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-[#1A1A1A] border-[#2A2A2A] p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-400">Total Completed</h3>
              <CheckCircle className="w-5 h-5 text-green-500" />
            </div>
            <p className="text-3xl font-bold text-white">{completedWorkOrders.length}</p>
            <p className="text-sm text-gray-400 mt-1">Work orders</p>
          </Card>

          <Card className="bg-[#1A1A1A] border-[#2A2A2A] p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-400">Total Revenue</h3>
              <DollarSign className="w-5 h-5 text-[#ea580c]" />
            </div>
            <p className="text-3xl font-bold text-white">{formatCurrency(totalRevenue)}</p>
            <p className="text-sm text-green-500 mt-1 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              {formatCurrency(totalProfit)} profit
            </p>
          </Card>

          <Card className="bg-[#1A1A1A] border-[#2A2A2A] p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-400">Avg Profit Margin</h3>
              <TrendingUp className="w-5 h-5 text-green-500" />
            </div>
            <p className="text-3xl font-bold text-white">
              {avgProfitMargin === null ? '—' : `${avgProfitMargin.toFixed(1)}%`}
            </p>
            {/* Says what it is across. "Across all projects" was untrue: it was
                across all projects with their costs hardcoded to zero, which is
                how this screen came to claim 100% on everything. */}
            <p className="text-sm text-gray-400 mt-1">
              {measured.length === 0
                ? 'No job yet has both its labour and materials recorded'
                : `Across ${measured.length} job${measured.length === 1 ? '' : 's'} with costs recorded`}
              {unmeasuredCount > 0 && (
                <span className="block text-yellow-500/80">
                  {unmeasuredCount} more finished, costs not recorded
                </span>
              )}
            </p>
          </Card>
        </div>

        {/* Filters */}
        <Card className="bg-[#1A1A1A] border-[#2A2A2A] p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Search
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Search by customer, project, or WO #..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-[#0A0A0A] border-[#2A2A2A] text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Time Period
              </label>
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value as any)}
                className="w-full bg-[#0A0A0A] border border-[#2A2A2A] text-white rounded-lg px-3 py-2"
              >
                <option value="all">All Time</option>
                <option value="30days">Last 30 Days</option>
                <option value="90days">Last 90 Days</option>
                <option value="year">Last Year</option>
              </select>
            </div>
          </div>
        </Card>

        {/* Work Orders List */}
        {filteredWorkOrders.length === 0 ? (
          <Card className="bg-[#1A1A1A] border-[#2A2A2A] p-12">
            <div className="text-center">
              <CheckCircle className="w-16 h-16 text-gray-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">
                No Completed Work Orders
              </h3>
              <p className="text-gray-400 mb-6">
                Completed work orders with paid invoices will appear here
              </p>
              <Button
                onClick={() => onNavigate('unified-project-pipeline')}
                className="bg-[#ea580c] text-white hover:bg-[#ea580c]/90"
              >
                Go to Project Pipeline
              </Button>
            </div>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredWorkOrders.map((wo) => {
              const reportData = wo;
              return (
                <Card
                  key={wo.id}
                  className="bg-[#1A1A1A] border-[#2A2A2A] p-6 hover:border-[#ea580c]/50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <Badge className="bg-green-500/20 text-green-500">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Completed
                        </Badge>
                        <span className="text-sm text-gray-400">
                          WO #{wo.itemNumber || wo.id.slice(0, 8).toUpperCase()}
                        </span>
                      </div>

                      <h3 className="text-lg font-semibold text-white mb-2">
                        {wo.title}
                      </h3>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <div>
                          <p className="text-sm text-gray-400">Customer</p>
                          <p className="text-white">{wo.customerName}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-400">Completed</p>
                          <p className="text-white">
                            {formatDate(wo.completionDate || wo.lastModified)}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-400">Location</p>
                          <p className="text-white">{wo.location || 'Not specified'}</p>
                        </div>
                      </div>

                      {reportData && (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-[#2A2A2A]">
                          <div>
                            <p className="text-sm text-gray-400 mb-1">Invoice Amount</p>
                            <p className="text-white font-semibold">
                              {formatCurrency(reportData.finalInvoiceAmount)}
                            </p>
                          </div>
                          {/* Null is not zero here.
                              These three read `null` when the job has no time
                              booked to it or no purchase order against it. The
                              server used to send 0 for costs and therefore 100%
                              margin on every job ever finished, so a dash that
                              says "not known" is the whole correction — a
                              number would be the bug coming back. */}
                          <div>
                            <p className="text-sm text-gray-400 mb-1">Total Costs</p>
                            <p className="text-white font-semibold">
                              {reportData.totalCosts === null || reportData.totalCosts === undefined
                                ? <span className="text-gray-500">Not known</span>
                                : formatCurrency(reportData.totalCosts)}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-400 mb-1">Profit</p>
                            <p className={`font-semibold ${
                              reportData.profitAmount === null || reportData.profitAmount === undefined
                                ? 'text-gray-500'
                                : reportData.profitAmount > 0 ? 'text-green-500' : 'text-red-500'
                            }`}>
                              {reportData.profitAmount === null || reportData.profitAmount === undefined
                                ? 'Not known'
                                : formatCurrency(reportData.profitAmount)}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-400 mb-1">Margin</p>
                            <p className={`font-semibold ${
                              reportData.profitMargin === null || reportData.profitMargin === undefined
                                ? 'text-gray-500'
                                : reportData.profitMargin > 0 ? 'text-green-500' : 'text-red-500'
                            }`}>
                              {reportData.profitMargin === null || reportData.profitMargin === undefined
                                ? 'Not known'
                                : `${reportData.profitMargin.toFixed(1)}%`}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Why it is not known, in the words the server used. */}
                      {Array.isArray(reportData.gaps) && reportData.gaps.length > 0 && (
                        <div className="mt-3 rounded-lg border border-yellow-500/20 bg-yellow-500/5 p-3">
                          <p className="text-xs font-semibold text-yellow-400 mb-1">
                            This job's profit cannot be worked out yet
                          </p>
                          <ul className="space-y-0.5 text-xs text-yellow-200/70">
                            {reportData.gaps.map((g: string, i: number) => <li key={i}>· {g}</li>)}
                          </ul>
                        </div>
                      )}
                    </div>

                    <div className="ml-6">
                      <Button
                        onClick={() => viewReport(wo.id)}
                        className="bg-[#ea580c] text-white hover:bg-[#ea580c]/90"
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        View Report
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Report Modal */}
      {selectedReport && (
        <WorkOrderCompletionReport
          workOrder={selectedReport}
          onClose={() => setSelectedReport(null)}
          onExport={() => {
            // Export logic handled in component
          }}
          onEmail={() => {
            // Email logic - could integrate with email service
            console.log('Email report:', selectedReport);
          }}
        />
      )}
    </div>
  );
}