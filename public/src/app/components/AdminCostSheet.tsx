/**
 * Admin Cost Sheet View
 * Real-time expense tracking for work orders/projects
 * Shows all spending with approval status and running totals
 */

import React, { useState } from 'react';
import {
  DollarSign, Tag, Calendar, User, CheckCircle, Clock, AlertCircle,
  TrendingUp, Filter, Search, Download, Eye, X, FileText, Image as ImageIcon
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';

interface Expense {
  id: string;
  workOrderId: string;
  workOrderName: string;
  projectId: string;
  projectName: string;
  amount: number;
  category: string;
  description: string;
  purchasedBy: string;
  date: string;
  timestamp: string;
  receiptPhoto?: string;
  vendor?: string;
  paymentMethod?: string;
  approved: boolean;
  approvedBy?: string;
  approvedAt?: string;
}

interface AdminCostSheetProps {
  workOrderId?: string; // Optional: filter by specific work order
  projectId?: string; // Optional: filter by specific project
  onClose?: () => void;
}

export default function AdminCostSheet({ workOrderId, projectId, onClose }: AdminCostSheetProps) {
  // Mock data - would come from backend
  const [expenses] = useState<Expense[]>([
    {
      id: 'exp-1',
      workOrderId: 'WO-2026-001',
      workOrderName: 'Kitchen Remodel - Electrical',
      projectId: 'PROJ-001',
      projectName: 'Smith Residence Kitchen Renovation',
      amount: 245.50,
      category: 'Materials',
      description: 'Electrical wire and outlets',
      purchasedBy: 'John Smith',
      date: 'Jan 22, 2026',
      timestamp: 'Jan 22, 2026 10:30 AM',
      vendor: 'Home Depot',
      paymentMethod: 'Company Card',
      approved: true,
      approvedBy: 'Jennifer Kim',
      approvedAt: 'Jan 22, 2026 2:15 PM',
      receiptPhoto: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=400'
    },
    {
      id: 'exp-2',
      workOrderId: 'WO-2026-001',
      workOrderName: 'Kitchen Remodel - Electrical',
      projectId: 'PROJ-001',
      projectName: 'Smith Residence Kitchen Renovation',
      amount: 89.99,
      category: 'Tools',
      description: 'Power drill bits set',
      purchasedBy: 'Mike Johnson',
      date: 'Jan 23, 2026',
      timestamp: 'Jan 23, 2026 2:15 PM',
      vendor: "Lowe's",
      paymentMethod: 'Cash',
      approved: false,
      receiptPhoto: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=400'
    },
    {
      id: 'exp-3',
      workOrderId: 'WO-2026-002',
      workOrderName: 'Kitchen Remodel - Plumbing',
      projectId: 'PROJ-001',
      projectName: 'Smith Residence Kitchen Renovation',
      amount: 425.00,
      category: 'Materials',
      description: 'Sink, faucet, and plumbing supplies',
      purchasedBy: 'David Lee',
      date: 'Jan 23, 2026',
      timestamp: 'Jan 23, 2026 9:00 AM',
      vendor: 'Ferguson',
      paymentMethod: 'Company Card',
      approved: true,
      approvedBy: 'Jennifer Kim',
      approvedAt: 'Jan 23, 2026 10:00 AM',
      receiptPhoto: 'https://images.unsplash.com/photo-1585704032915-c3400ca199e7?w=400'
    }
  ]);

  const [filterStatus, setFilterStatus] = useState<'all' | 'approved' | 'pending'>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<Expense | null>(null);

  // Filter expenses
  const filteredExpenses = expenses
    .filter(exp => {
      if (workOrderId && exp.workOrderId !== workOrderId) return false;
      if (projectId && exp.projectId !== projectId) return false;
      if (filterStatus === 'approved' && !exp.approved) return false;
      if (filterStatus === 'pending' && exp.approved) return false;
      if (filterCategory !== 'all' && exp.category !== filterCategory) return false;
      if (searchQuery && !exp.description.toLowerCase().includes(searchQuery.toLowerCase()) &&
          !exp.purchasedBy.toLowerCase().includes(searchQuery.toLowerCase()) &&
          !exp.vendor?.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    });

  // Calculate totals
  const totalExpenses = filteredExpenses.reduce((sum, exp) => sum + exp.amount, 0);
  const approvedExpenses = filteredExpenses.filter(exp => exp.approved).reduce((sum, exp) => sum + exp.amount, 0);
  const pendingExpenses = filteredExpenses.filter(exp => !exp.approved).reduce((sum, exp) => sum + exp.amount, 0);

  const categories = ['all', 'Materials', 'Tools', 'Equipment', 'Labor', 'Permits', 'Transportation', 'Other'];

  const handleApprove = (expenseId: string) => {
    toast.success('Expense approved successfully!');
  };

  const handleExportReport = () => {
    toast.success('Cost report exported to CSV');
  };

  return (
    <div className="fixed inset-0 bg-[#0A0A0A] z-50 overflow-hidden flex flex-col">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#1A1A1A] to-[#0F0F0F] border-b border-[#2A2A2A] px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-600 to-green-700 flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-white" />
              </div>
              Cost Sheet
            </h1>
            <p className="text-sm text-gray-400 mt-1">
              {workOrderId ? `Work Order: ${workOrderId}` : 'All Projects & Work Orders'}
            </p>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 hover:bg-[#2A2A2A] rounded-lg transition"
            >
              <X className="w-6 h-6 text-gray-400" />
            </button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="px-6 py-4 bg-[#0F0F0F] border-b border-[#2A2A2A]">
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-blue-600/20 to-blue-700/20 border border-blue-500/30 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-blue-400">Total Expenses</span>
              <TrendingUp className="w-5 h-5 text-blue-400" />
            </div>
            <div className="text-3xl font-bold text-white">${totalExpenses.toFixed(2)}</div>
            <div className="text-xs text-gray-400 mt-1">{filteredExpenses.length} transactions</div>
          </div>

          <div className="bg-gradient-to-br from-green-600/20 to-green-700/20 border border-green-500/30 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-green-400">Approved</span>
              <CheckCircle className="w-5 h-5 text-green-400" />
            </div>
            <div className="text-3xl font-bold text-white">${approvedExpenses.toFixed(2)}</div>
            <div className="text-xs text-gray-400 mt-1">
              {filteredExpenses.filter(e => e.approved).length} approved
            </div>
          </div>

          <div className="bg-gradient-to-br from-orange-600/20 to-orange-700/20 border border-orange-500/30 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-orange-400">Pending</span>
              <Clock className="w-5 h-5 text-orange-400" />
            </div>
            <div className="text-3xl font-bold text-white">${pendingExpenses.toFixed(2)}</div>
            <div className="text-xs text-gray-400 mt-1">
              {filteredExpenses.filter(e => !e.approved).length} pending approval
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-600/20 to-purple-700/20 border border-purple-500/30 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-purple-400">Approval Rate</span>
              <CheckCircle className="w-5 h-5 text-purple-400" />
            </div>
            <div className="text-3xl font-bold text-white">
              {filteredExpenses.length > 0
                ? Math.round((filteredExpenses.filter(e => e.approved).length / filteredExpenses.length) * 100)
                : 0}%
            </div>
            <div className="text-xs text-gray-400 mt-1">of expenses approved</div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="px-6 py-4 bg-[#0F0F0F] border-b border-[#2A2A2A]">
        <div className="flex items-center gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search expenses..."
              className="w-full pl-10 pr-4 py-2.5 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50"
            />
          </div>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            className="px-4 py-2.5 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
          >
            <option value="all">All Status</option>
            <option value="approved">Approved</option>
            <option value="pending">Pending</option>
          </select>

          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-4 py-2.5 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
          >
            {categories.map(cat => (
              <option key={cat} value={cat}>
                {cat === 'all' ? 'All Categories' : cat}
              </option>
            ))}
          </select>

          <button
            onClick={handleExportReport}
            className="px-4 py-2.5 bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 rounded-xl text-white font-bold transition flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      </div>

      {/* Expenses List */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="space-y-4">
          {filteredExpenses.map(expense => (
            <div
              key={expense.id}
              className={`bg-[#0F0F0F] rounded-xl border p-5 transition hover:border-orange-500/30 ${
                expense.approved
                  ? 'border-green-500/20'
                  : 'border-orange-500/20'
              }`}
            >
              <div className="flex items-start gap-4">
                {/* Receipt Thumbnail */}
                {expense.receiptPhoto && (
                  <button
                    onClick={() => {
                      setSelectedReceipt(expense);
                      setShowReceiptModal(true);
                    }}
                    className="w-24 h-24 rounded-lg overflow-hidden flex-shrink-0 hover:opacity-80 transition border-2 border-orange-500/30 hover:border-orange-500"
                  >
                    <img
                      src={expense.receiptPhoto}
                      alt="Receipt"
                      className="w-full h-full object-cover"
                    />
                  </button>
                )}

                <div className="flex-1">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-3xl font-bold text-white">${expense.amount.toFixed(2)}</span>
                        <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                          expense.approved
                            ? 'bg-green-600/20 text-green-400 border border-green-500/30'
                            : 'bg-orange-600/20 text-orange-400 border border-orange-500/30'
                        }`}>
                          {expense.approved ? 'APPROVED' : 'PENDING'}
                        </span>
                        <span className="px-2 py-0.5 rounded text-xs font-bold bg-blue-600/20 text-blue-400">
                          {expense.category}
                        </span>
                      </div>

                      <p className="text-white font-medium mb-2">{expense.description}</p>

                      {/* Project & Work Order Info */}
                      <div className="flex items-center gap-3 text-sm text-gray-400 mb-2">
                        <span className="flex items-center gap-1">
                          <FileText className="w-4 h-4" />
                          {expense.workOrderId}
                        </span>
                        <span className="text-gray-600">•</span>
                        <span className="text-gray-400">{expense.projectName}</span>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-sm text-gray-400">
                        <span className="flex items-center gap-1">
                          <User className="w-4 h-4" />
                          {expense.purchasedBy}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {expense.timestamp}
                        </span>
                        {expense.vendor && (
                          <span className="flex items-center gap-1">
                            <Tag className="w-4 h-4" />
                            {expense.vendor}
                          </span>
                        )}
                        {expense.paymentMethod && (
                          <span className="px-2 py-0.5 rounded bg-gray-700/50 text-gray-300 text-xs">
                            {expense.paymentMethod}
                          </span>
                        )}
                      </div>

                      {expense.approved && expense.approvedBy && (
                        <p className="text-sm text-green-400 mt-2 flex items-center gap-1">
                          <CheckCircle className="w-4 h-4" />
                          Approved by {expense.approvedBy} on {expense.approvedAt}
                        </p>
                      )}
                    </div>

                    {!expense.approved && (
                      <button
                        onClick={() => handleApprove(expense.id)}
                        className="px-4 py-2 bg-green-600/20 hover:bg-green-600/30 border border-green-500/30 rounded-lg text-green-400 font-medium transition flex items-center gap-2"
                      >
                        <CheckCircle className="w-4 h-4" />
                        Approve
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredExpenses.length === 0 && (
          <div className="text-center py-12">
            <DollarSign className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400">No expenses found</p>
            <p className="text-sm text-gray-500 mt-2">Try adjusting your filters</p>
          </div>
        )}
      </div>

      {/* Receipt Modal */}
      {showReceiptModal && selectedReceipt && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <div className="max-w-4xl w-full">
            <div className="bg-[#1A1A1A] rounded-2xl border border-orange-500/30 overflow-hidden">
              <div className="p-4 border-b border-[#2A2A2A] flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-white">Receipt Photo</h3>
                  <p className="text-sm text-gray-400 mt-1">
                    {selectedReceipt.description} - ${selectedReceipt.amount.toFixed(2)}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowReceiptModal(false);
                    setSelectedReceipt(null);
                  }}
                  className="p-2 hover:bg-[#2A2A2A] rounded-lg transition"
                >
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>
              <div className="p-6 bg-[#0F0F0F]">
                {selectedReceipt.receiptPhoto && (
                  <img
                    src={selectedReceipt.receiptPhoto}
                    alt="Receipt"
                    className="w-full h-auto max-h-[70vh] object-contain rounded-lg"
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
