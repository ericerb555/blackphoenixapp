/**
 * Financial Data Sheet - Running financial overview for project
 */

import { X, DollarSign, TrendingUp, TrendingDown, Clock, Calendar, CreditCard, FileText, CheckCircle, AlertCircle } from 'lucide-react';

interface FinancialDataSheetProps {
  project: any;
  onClose: () => void;
}

export function FinancialDataSheet({ project, onClose }: FinancialDataSheetProps) {
  // Calculate financial metrics
  const quoteTotal = project.quote?.totalCost || 0;
  const contractTotal = project.contract?.totalAmount || quoteTotal;
  const invoicedAmount = project.invoice?.totalAmount || 0;
  const paidAmount = project.invoice?.amountPaid || 0;
  const dueAmount = project.invoice?.amountDue || 0;

  // Calculate payment schedule totals
  const paymentSchedule = project.contract?.paymentSchedule || [];
  const totalPaid = paymentSchedule
    .filter((p: any) => p.status === 'paid')
    .reduce((sum: number, p: any) => sum + (p.amount || 0), 0);
  const totalPending = paymentSchedule
    .filter((p: any) => p.status === 'pending')
    .reduce((sum: number, p: any) => sum + (p.amount || 0), 0);

  const laborCost = project.quote?.laborCost || project.quote?.laborSubtotal || 0;
  const materialCost = project.quote?.materialCost || project.quote?.materialsSubtotal || 0;

  const profitMargin = contractTotal > 0 ? ((contractTotal - laborCost - materialCost) / contractTotal * 100) : 0;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-br from-gray-900 to-black border border-gray-700 rounded-xl max-w-5xl w-full max-h-[90vh] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#ea580c] to-[#fb923c] px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <DollarSign className="w-6 h-6 text-white" />
            <div>
              <h2 className="text-xl font-bold text-white">Financial Data Sheet</h2>
              <p className="text-sm text-white/80">{project.itemNumber} - {project.title}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
          {/* Key Metrics */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 border border-blue-500/30 rounded-lg p-4">
              <div className="text-blue-400 text-sm mb-1 flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Quote Value
              </div>
              <div className="text-2xl font-bold text-white">
                ${(quoteTotal || 0).toLocaleString()}
              </div>
            </div>

            <div className="bg-gradient-to-br from-green-500/10 to-green-600/10 border border-green-500/30 rounded-lg p-4">
              <div className="text-green-400 text-sm mb-1 flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                Paid
              </div>
              <div className="text-2xl font-bold text-white">
                ${(paidAmount || totalPaid || 0).toLocaleString()}
              </div>
            </div>

            <div className="bg-gradient-to-br from-yellow-500/10 to-yellow-600/10 border border-yellow-500/30 rounded-lg p-4">
              <div className="text-yellow-400 text-sm mb-1 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Pending
              </div>
              <div className="text-2xl font-bold text-white">
                ${(dueAmount || totalPending || 0).toLocaleString()}
              </div>
            </div>

            <div className="bg-gradient-to-br from-purple-500/10 to-purple-600/10 border border-purple-500/30 rounded-lg p-4">
              <div className="text-purple-400 text-sm mb-1 flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Profit Margin
              </div>
              <div className="text-2xl font-bold text-white">
                {profitMargin.toFixed(1)}%
              </div>
            </div>
          </div>

          {/* Cost Breakdown */}
          <div className="bg-black/50 border border-gray-700 rounded-lg p-4 mb-6">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-[#ea580c]" />
              Cost Breakdown
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between py-2 border-b border-gray-700">
                <span className="text-gray-400">Labor Cost</span>
                <span className="text-white font-semibold">${(laborCost || 0).toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-gray-700">
                <span className="text-gray-400">Material Cost</span>
                <span className="text-white font-semibold">${(materialCost || 0).toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-t-2 border-[#ea580c]/50 pt-3">
                <span className="text-white font-bold">Total Project Cost</span>
                <span className="text-[#ea580c] font-bold text-xl">${(contractTotal || quoteTotal || 0).toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Payment Schedule */}
          {paymentSchedule.length > 0 && (
            <div className="bg-black/50 border border-gray-700 rounded-lg p-4 mb-6">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-[#ea580c]" />
                Payment Schedule
              </h3>
              <div className="space-y-3">
                {paymentSchedule.map((payment: any, index: number) => (
                  <div
                    key={payment.id || index}
                    className={`p-3 rounded-lg border ${
                      payment.status === 'paid'
                        ? 'bg-green-500/10 border-green-500/30'
                        : payment.status === 'pending'
                        ? 'bg-yellow-500/10 border-yellow-500/30'
                        : 'bg-gray-500/10 border-gray-500/30'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {payment.status === 'paid' ? (
                          <CheckCircle className="w-4 h-4 text-green-400" />
                        ) : payment.status === 'pending' ? (
                          <Clock className="w-4 h-4 text-yellow-400" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-gray-400" />
                        )}
                        <span className="text-white font-semibold">{payment.description}</span>
                      </div>
                      <span className={`font-bold ${
                        payment.status === 'paid' ? 'text-green-400' : 'text-white'
                      }`}>
                        ${(payment.amount || 0).toLocaleString()}
                      </span>
                    </div>
                    {payment.milestone && (
                      <div className="text-sm text-gray-400 ml-6">
                        Milestone: {payment.milestone}
                      </div>
                    )}
                    {payment.dueDate && (
                      <div className="text-sm text-gray-400 ml-6 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        Due: {new Date(payment.dueDate).toLocaleDateString()}
                      </div>
                    )}
                    <div className="text-xs text-gray-500 ml-6 mt-1 uppercase">
                      {payment.status}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Invoice Information */}
          {project.invoice && (
            <div className="bg-black/50 border border-gray-700 rounded-lg p-4">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#ea580c]" />
                Invoice Details
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between py-2 border-b border-gray-700">
                  <span className="text-gray-400">Invoice Number</span>
                  <span className="text-white font-semibold">{project.invoice.invoiceNumber}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-gray-700">
                  <span className="text-gray-400">Invoice Date</span>
                  <span className="text-white font-semibold">
                    {new Date(project.invoice.invoiceDate).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-gray-700">
                  <span className="text-gray-400">Due Date</span>
                  <span className="text-white font-semibold">
                    {new Date(project.invoice.dueDate).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-gray-700">
                  <span className="text-gray-400">Total Amount</span>
                  <span className="text-white font-semibold">
                    ${(project.invoice.totalAmount || 0).toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-gray-700">
                  <span className="text-gray-400">Amount Paid</span>
                  <span className="text-green-400 font-semibold">
                    ${(project.invoice.amountPaid || 0).toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between py-2 border-t-2 border-[#ea580c]/50 pt-3">
                  <span className="text-white font-bold">Amount Due</span>
                  <span className="text-[#ea580c] font-bold text-xl">
                    ${(project.invoice.amountDue || 0).toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-gray-400">Status</span>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                    project.invoice.status === 'paid' ? 'bg-green-500/20 text-green-400' :
                    project.invoice.status === 'sent' ? 'bg-yellow-500/20 text-yellow-400' :
                    'bg-gray-500/20 text-gray-400'
                  }`}>
                    {project.invoice.status}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
