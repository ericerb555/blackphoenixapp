/**
 * Financial Reconciliation Page
 * Comprehensive bank reconciliation, transaction matching, and discrepancy management
 */

import { useState, useEffect } from 'react';
import {
  DollarSign,
  CheckCircle,
  AlertTriangle,
  Calendar,
  TrendingUp,
  TrendingDown,
  FileText,
  Download,
  Upload,
  RefreshCw,
  Search,
  Filter,
  Plus,
  X,
  Check,
  AlertCircle,
  Clock,
  ArrowLeft,
  Edit,
  Trash2,
  Eye,
  BarChart3,
} from 'lucide-react';
import { reconciliationService, BankTransaction, ReconciliationMatch, ReconciliationPeriod, ReconciliationDiscrepancy } from '../lib/services/reconciliationService';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { useCompany } from '../contexts/CompanyContext';

interface FinancialReconciliationProps {
  onNavigate: (path: string) => void;
}

export default function FinancialReconciliation({ onNavigate }: FinancialReconciliationProps) {
  const companyContext = useCompany();
  const companyId = companyContext?.activeCompany?.id || 'default';

  const [activeTab, setActiveTab] = useState<'dashboard' | 'transactions' | 'periods' | 'discrepancies' | 'reports'>('dashboard');
  
  // State
  const [transactions, setTransactions] = useState<BankTransaction[]>([]);
  const [matches, setMatches] = useState<ReconciliationMatch[]>([]);
  const [periods, setPeriods] = useState<ReconciliationPeriod[]>([]);
  const [discrepancies, setDiscrepancies] = useState<ReconciliationDiscrepancy[]>([]);
  const [stats, setStats] = useState<any>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month' | 'quarter'>('month');
  const [statusFilter, setStatusFilter] = useState<'all' | 'reconciled' | 'unreconciled'>('all');

  // Modal states
  const [showNewPeriodModal, setShowNewPeriodModal] = useState(false);
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<BankTransaction | null>(null);

  // Load data
  useEffect(() => {
    loadData();
  }, [companyId]);

  const loadData = () => {
    console.log('📊 [Financial Reconciliation] Loading data for company:', companyId);
    
    const txns = reconciliationService.getTransactionsByCompany(companyId);
    const mtchs = reconciliationService.getMatchesByCompany(companyId);
    const prds = reconciliationService.getPeriodsByCompany(companyId);
    const discs = reconciliationService.getDiscrepanciesByCompany(companyId);
    const sts = reconciliationService.getReconciliationStats(companyId);

    setTransactions(txns);
    setMatches(mtchs);
    setPeriods(prds);
    setDiscrepancies(discs);
    setStats(sts);

    console.log('✅ [Financial Reconciliation] Data loaded:', {
      transactions: txns.length,
      matches: mtchs.length,
      periods: prds.length,
      discrepancies: discs.length,
    });
  };

  // Filter transactions
  const filteredTransactions = transactions.filter(txn => {
    // Search filter
    const matchesSearch = searchTerm === '' || 
      txn.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      txn.reference.toLowerCase().includes(searchTerm.toLowerCase());

    // Status filter
    const matchesStatus = statusFilter === 'all' ||
      (statusFilter === 'reconciled' && txn.isReconciled) ||
      (statusFilter === 'unreconciled' && !txn.isReconciled);

    // Date filter
    let matchesDate = true;
    if (dateFilter !== 'all') {
      const txnDate = new Date(txn.date);
      const now = new Date();
      const diffDays = Math.floor((now.getTime() - txnDate.getTime()) / (1000 * 60 * 60 * 24));

      if (dateFilter === 'today') matchesDate = diffDays === 0;
      else if (dateFilter === 'week') matchesDate = diffDays <= 7;
      else if (dateFilter === 'month') matchesDate = diffDays <= 30;
      else if (dateFilter === 'quarter') matchesDate = diffDays <= 90;
    }

    return matchesSearch && matchesStatus && matchesDate;
  });

  const handleReconcileTransaction = (transactionId: string) => {
    const transaction = transactions.find(t => t.id === transactionId);
    if (!transaction) return;

    // Try auto-match first
    const autoMatch = reconciliationService.autoMatch(transaction);
    
    if (autoMatch) {
      console.log('✅ Auto-matched transaction:', autoMatch);
      loadData();
    } else {
      // Show manual match modal
      setSelectedTransaction(transaction);
      setShowTransactionModal(true);
    }
  };

  const handleCreatePeriod = () => {
    setShowNewPeriodModal(true);
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

  return (
    <div className="min-h-screen bg-[#0A0A0A] pb-20" style={{ fontSize: '16px', zoom: 1, transform: 'scale(1)' }}>
      {/* Header */}
      <div className="sticky top-0 z-40 bg-[#1A1A1A] border-b border-[#2A2A2A]">
        <div className="w-full px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button
                onClick={() => onNavigate('unified-dashboard')}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                  <CheckCircle className="w-8 h-8 text-[#ea580c]" />
                  Financial Reconciliation
                </h1>
                <p className="text-base text-gray-400">Bank reconciliation and transaction matching</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button
                onClick={() => handleCreatePeriod()}
                className="bg-[#ea580c] text-white hover:bg-[#ea580c]/90"
              >
                <Plus className="w-4 h-4 mr-2" />
                New Period
              </Button>
              <Button
                onClick={loadData}
                variant="outline"
                className="border-[#2A2A2A] text-white hover:bg-[#2A2A2A]"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-[#1A1A1A] border-b border-[#2A2A2A]">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="flex gap-4 overflow-x-auto">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
              { id: 'transactions', label: 'Transactions', icon: FileText },
              { id: 'periods', label: 'Periods', icon: Calendar },
              { id: 'discrepancies', label: 'Discrepancies', icon: AlertTriangle },
              { id: 'reports', label: 'Reports', icon: TrendingUp },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-[#ea580c] text-white'
                    : 'border-transparent text-gray-400 hover:text-white'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'dashboard' && (
          <DashboardView
            stats={stats}
            transactions={transactions}
            periods={periods}
            discrepancies={discrepancies}
            formatCurrency={formatCurrency}
            onNavigate={onNavigate}
          />
        )}

        {activeTab === 'transactions' && (
          <TransactionsView
            transactions={filteredTransactions}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            dateFilter={dateFilter}
            setDateFilter={setDateFilter}
            onReconcile={handleReconcileTransaction}
            formatCurrency={formatCurrency}
            formatDate={formatDate}
          />
        )}

        {activeTab === 'periods' && (
          <PeriodsView
            periods={periods}
            formatCurrency={formatCurrency}
            formatDate={formatDate}
          />
        )}

        {activeTab === 'discrepancies' && (
          <DiscrepanciesView
            discrepancies={discrepancies}
            formatCurrency={formatCurrency}
            formatDate={formatDate}
          />
        )}

        {activeTab === 'reports' && (
          <ReportsView
            stats={stats}
            transactions={transactions}
            matches={matches}
            formatCurrency={formatCurrency}
          />
        )}
      </div>
    </div>
  );
}

// Dashboard View Component
function DashboardView({ stats, transactions, periods, discrepancies, formatCurrency, onNavigate }: any) {
  if (!stats) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-400">No reconciliation data available</p>
      </div>
    );
  }

  const recentTransactions = transactions.slice(0, 5);
  const openDiscrepancies = discrepancies.filter((d: ReconciliationDiscrepancy) => d.status === 'open');

  return (
    <div className="w-full space-y-6" style={{ alignSelf: 'stretch' }}>
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-[#1A1A1A] border-[#2A2A2A] p-8">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-medium text-gray-400">Total Transactions</h3>
            <FileText className="w-6 h-6 text-blue-500" />
          </div>
          <p className="text-4xl font-bold text-white">{stats.totalTransactions}</p>
          <p className="text-base text-gray-400 mt-2">
            {stats.reconciledCount} reconciled
          </p>
        </Card>

        <Card className="bg-[#1A1A1A] border-[#2A2A2A] p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-400">Reconciliation Rate</h3>
            <CheckCircle className="w-5 h-5 text-green-500" />
          </div>
          <p className="text-3xl font-bold text-white">{stats.reconciliationRate.toFixed(1)}%</p>
          <p className="text-sm text-gray-400 mt-1">
            {stats.unreconciledCount} unreconciled
          </p>
        </Card>

        <Card className="bg-[#1A1A1A] border-[#2A2A2A] p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-400">Total Amount</h3>
            <DollarSign className="w-5 h-5 text-[#ea580c]" />
          </div>
          <p className="text-3xl font-bold text-white">{formatCurrency(stats.totalAmount)}</p>
          <p className="text-sm text-gray-400 mt-1">
            {formatCurrency(stats.reconciledAmount)} reconciled
          </p>
        </Card>

        <Card className="bg-[#1A1A1A] border-[#2A2A2A] p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-400">Open Discrepancies</h3>
            <AlertTriangle className="w-5 h-5 text-yellow-500" />
          </div>
          <p className="text-3xl font-bold text-white">{stats.openDiscrepancies}</p>
          <p className="text-sm text-gray-400 mt-1">
            {formatCurrency(stats.totalDiscrepancyAmount)} total
          </p>
        </Card>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Transactions */}
        <Card className="bg-[#1A1A1A] border-[#2A2A2A] p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Recent Transactions</h3>
            <FileText className="w-5 h-5 text-gray-400" />
          </div>
          <div className="space-y-3">
            {recentTransactions.length === 0 ? (
              <p className="text-gray-400 text-sm">No transactions yet</p>
            ) : (
              recentTransactions.map((txn: BankTransaction) => (
                <div
                  key={txn.id}
                  className="flex items-center justify-between p-3 bg-[#0A0A0A] rounded-lg border border-[#2A2A2A]"
                >
                  <div className="flex-1">
                    <p className="text-white font-medium">{txn.description}</p>
                    <p className="text-sm text-gray-400">{new Date(txn.date).toLocaleDateString()}</p>
                  </div>
                  <div className="text-right">
                    <p className={`font-bold ${txn.amount >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {formatCurrency(Math.abs(txn.amount))}
                    </p>
                    {txn.isReconciled ? (
                      <Badge className="bg-green-500/20 text-green-500 text-sm">
                        Reconciled
                      </Badge>
                    ) : (
                      <Badge className="bg-yellow-500/20 text-yellow-500 text-sm">
                        Pending
                      </Badge>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        {/* Open Discrepancies */}
        <Card className="bg-[#1A1A1A] border-[#2A2A2A] p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Open Discrepancies</h3>
            <AlertTriangle className="w-5 h-5 text-yellow-500" />
          </div>
          <div className="space-y-3">
            {openDiscrepancies.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-2" />
                <p className="text-gray-400">No open discrepancies</p>
              </div>
            ) : (
              openDiscrepancies.slice(0, 5).map((disc: ReconciliationDiscrepancy) => (
                <div
                  key={disc.id}
                  className="p-3 bg-[#0A0A0A] rounded-lg border border-[#2A2A2A]"
                >
                  <div className="flex items-start justify-between mb-2">
                    <Badge className={`text-sm ${
                      disc.severity === 'critical' ? 'bg-red-500/20 text-red-500' :
                      disc.severity === 'high' ? 'bg-orange-500/20 text-orange-500' :
                      disc.severity === 'medium' ? 'bg-yellow-500/20 text-yellow-500' :
                      'bg-blue-500/20 text-blue-500'
                    }`}>
                      {disc.severity}
                    </Badge>
                    <span className="text-sm font-bold text-white">{formatCurrency(disc.amount)}</span>
                  </div>
                  <p className="text-white text-sm">{disc.description}</p>
                  <p className="text-sm text-gray-400 mt-1">
                    {new Date(disc.detectedDate).toLocaleDateString()}
                  </p>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

// Transactions View Component
function TransactionsView({ 
  transactions, 
  searchTerm, 
  setSearchTerm,
  statusFilter,
  setStatusFilter,
  dateFilter,
  setDateFilter,
  onReconcile,
  formatCurrency, 
  formatDate 
}: any) {
  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card className="bg-[#1A1A1A] border-[#2A2A2A] p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Search transactions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-[#0A0A0A] border-[#2A2A2A] text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="w-full bg-[#0A0A0A] border border-[#2A2A2A] text-white rounded-lg px-3 py-2"
            >
              <option value="all">All Status</option>
              <option value="reconciled">Reconciled</option>
              <option value="unreconciled">Unreconciled</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Date Range</label>
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value as any)}
              className="w-full bg-[#0A0A0A] border border-[#2A2A2A] text-white rounded-lg px-3 py-2"
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="week">Last 7 Days</option>
              <option value="month">Last 30 Days</option>
              <option value="quarter">Last 90 Days</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Transactions Table */}
      <Card className="bg-[#1A1A1A] border-[#2A2A2A] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[#0A0A0A] border-b border-[#2A2A2A]">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-400 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-400 uppercase tracking-wider">
                  Description
                </th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-400 uppercase tracking-wider">
                  Reference
                </th>
                <th className="px-6 py-4 text-right text-sm font-medium text-gray-400 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-4 text-center text-sm font-medium text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-4 text-center text-sm font-medium text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2A2A2A]">
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                    No transactions found
                  </td>
                </tr>
              ) : (
                transactions.map((txn: BankTransaction) => (
                  <tr key={txn.id} className="hover:bg-[#0A0A0A] transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                      {formatDate(txn.date)}
                    </td>
                    <td className="px-6 py-4 text-sm text-white">
                      <div>
                        <p className="font-medium">{txn.description}</p>
                        {txn.bankAccount && (
                          <p className="text-sm text-gray-400">{txn.bankAccount}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                      {txn.reference}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <span className={`font-bold ${
                        txn.type === 'deposit' ? 'text-green-500' : 'text-red-500'
                      }`}>
                        {txn.type === 'deposit' ? '+' : '-'}{formatCurrency(Math.abs(txn.amount))}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      {txn.isReconciled ? (
                        <Badge className="bg-green-500/20 text-green-500">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Reconciled
                        </Badge>
                      ) : (
                        <Badge className="bg-yellow-500/20 text-yellow-500">
                          <Clock className="w-3 h-3 mr-1" />
                          Pending
                        </Badge>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      {!txn.isReconciled && (
                        <Button
                          onClick={() => onReconcile(txn.id)}
                          size="sm"
                          className="bg-[#ea580c] text-white hover:bg-[#ea580c]/90"
                        >
                          <Check className="w-3 h-3 mr-1" />
                          Reconcile
                        </Button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

// Periods View Component
function PeriodsView({ periods, formatCurrency, formatDate }: any) {
  return (
    <div className="space-y-6">
      <Card className="bg-[#1A1A1A] border-[#2A2A2A] p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Reconciliation Periods</h3>
        <div className="space-y-4">
          {periods.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="w-12 h-12 text-gray-500 mx-auto mb-4" />
              <p className="text-gray-400">No reconciliation periods yet</p>
              <p className="text-sm text-gray-500 mt-2">Create a new period to get started</p>
            </div>
          ) : (
            periods.map((period: ReconciliationPeriod) => (
              <div
                key={period.id}
                className="p-6 bg-[#0A0A0A] rounded-lg border border-[#2A2A2A]"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h4 className="text-white font-semibold mb-1">
                      {formatDate(period.startDate)} - {formatDate(period.endDate)}
                    </h4>
                    <Badge className={`text-sm ${
                      period.status === 'completed' ? 'bg-green-500/20 text-green-500' :
                      period.status === 'in-progress' ? 'bg-blue-500/20 text-blue-500' :
                      period.status === 'locked' ? 'bg-gray-500/20 text-gray-500' :
                      'bg-yellow-500/20 text-yellow-500'
                    }`}>
                      {period.status}
                    </Badge>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-400">Difference</p>
                    <p className={`text-lg font-bold ${
                      period.difference === 0 ? 'text-green-500' : 'text-red-500'
                    }`}>
                      {formatCurrency(period.difference)}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Opening Balance</p>
                    <p className="text-white font-semibold">{formatCurrency(period.openingBalance)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Closing Balance</p>
                    <p className="text-white font-semibold">{formatCurrency(period.closingBalance)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Bank Balance</p>
                    <p className="text-white font-semibold">{formatCurrency(period.bankBalance)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Book Balance</p>
                    <p className="text-white font-semibold">{formatCurrency(period.bookBalance)}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-[#2A2A2A]">
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Total Transactions</p>
                    <p className="text-white font-semibold">{period.totalTransactions}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Reconciled</p>
                    <p className="text-green-500 font-semibold">{period.reconciledTransactions}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Unmatched</p>
                    <p className="text-yellow-500 font-semibold">{period.unmatchedTransactions}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Discrepancies</p>
                    <p className="text-red-500 font-semibold">{period.discrepancies}</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}

// Discrepancies View Component
function DiscrepanciesView({ discrepancies, formatCurrency, formatDate }: any) {
  return (
    <div className="space-y-6">
      <Card className="bg-[#1A1A1A] border-[#2A2A2A] p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Discrepancies</h3>
        <div className="space-y-4">
          {discrepancies.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
              <p className="text-gray-400">No discrepancies found</p>
              <p className="text-sm text-gray-500 mt-2">All transactions are properly reconciled</p>
            </div>
          ) : (
            discrepancies.map((disc: ReconciliationDiscrepancy) => (
              <div
                key={disc.id}
                className="p-6 bg-[#0A0A0A] rounded-lg border border-[#2A2A2A]"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge className={`text-sm ${
                        disc.severity === 'critical' ? 'bg-red-500/20 text-red-500' :
                        disc.severity === 'high' ? 'bg-orange-500/20 text-orange-500' :
                        disc.severity === 'medium' ? 'bg-yellow-500/20 text-yellow-500' :
                        'bg-blue-500/20 text-blue-500'
                      }`}>
                        {disc.severity}
                      </Badge>
                      <Badge className={`text-sm ${
                        disc.status === 'resolved' ? 'bg-green-500/20 text-green-500' :
                        disc.status === 'investigating' ? 'bg-blue-500/20 text-blue-500' :
                        disc.status === 'accepted' ? 'bg-gray-500/20 text-gray-500' :
                        'bg-yellow-500/20 text-yellow-500'
                      }`}>
                        {disc.status}
                      </Badge>
                    </div>
                    <p className="text-white font-medium mb-1">{disc.description}</p>
                    <p className="text-sm text-gray-400">
                      Type: {disc.type.replace(/-/g, ' ')} • Detected: {formatDate(disc.detectedDate)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-red-500">{formatCurrency(disc.amount)}</p>
                  </div>
                </div>

                {disc.resolution && (
                  <div className="mt-4 p-3 bg-[#1A1A1A] rounded border border-[#2A2A2A]">
                    <p className="text-sm text-gray-400 mb-1">Resolution</p>
                    <p className="text-sm text-white">{disc.resolution}</p>
                    {disc.resolvedDate && (
                      <p className="text-sm text-gray-400 mt-1">
                        Resolved: {formatDate(disc.resolvedDate)} by {disc.resolvedBy}
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}

// Reports View Component
function ReportsView({ stats, transactions, matches, formatCurrency }: any) {
  if (!stats) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-400">No data available for reports</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-[#1A1A1A] border-[#2A2A2A] p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Reconciliation Summary</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Total Transactions</span>
              <span className="text-white font-semibold">{stats.totalTransactions}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Reconciled</span>
              <span className="text-green-500 font-semibold">{stats.reconciledCount}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Unreconciled</span>
              <span className="text-yellow-500 font-semibold">{stats.unreconciledCount}</span>
            </div>
            <div className="flex justify-between items-center pt-4 border-t border-[#2A2A2A]">
              <span className="text-gray-400">Reconciliation Rate</span>
              <span className="text-white font-bold">{stats.reconciliationRate.toFixed(1)}%</span>
            </div>
          </div>
        </Card>

        <Card className="bg-[#1A1A1A] border-[#2A2A2A] p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Financial Summary</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Total Amount</span>
              <span className="text-white font-semibold">{formatCurrency(stats.totalAmount)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Reconciled Amount</span>
              <span className="text-green-500 font-semibold">{formatCurrency(stats.reconciledAmount)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Unreconciled Amount</span>
              <span className="text-yellow-500 font-semibold">{formatCurrency(stats.unreconciledAmount)}</span>
            </div>
            <div className="flex justify-between items-center pt-4 border-t border-[#2A2A2A]">
              <span className="text-gray-400">Total Matches</span>
              <span className="text-white font-bold">{stats.matchCount}</span>
            </div>
          </div>
        </Card>
      </div>

      <Card className="bg-[#1A1A1A] border-[#2A2A2A] p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Export Options</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Button
            variant="outline"
            className="border-[#2A2A2A] text-white hover:bg-[#2A2A2A]"
          >
            <Download className="w-4 h-4 mr-2" />
            Export to CSV
          </Button>
          <Button
            variant="outline"
            className="border-[#2A2A2A] text-white hover:bg-[#2A2A2A]"
          >
            <Download className="w-4 h-4 mr-2" />
            Export to Excel
          </Button>
          <Button
            variant="outline"
            className="border-[#2A2A2A] text-white hover:bg-[#2A2A2A]"
          >
            <Download className="w-4 h-4 mr-2" />
            Generate PDF Report
          </Button>
        </div>
      </Card>
    </div>
  );
}
