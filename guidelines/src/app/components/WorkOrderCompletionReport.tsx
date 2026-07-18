/**
 * Work Order Completion Report
 * Final comprehensive breakdown shown when invoice is paid
 * Includes all receipts, hours, costs, and profit analysis
 */

import { useState } from 'react';
import {
  CheckCircle,
  DollarSign,
  Clock,
  Users,
  Receipt,
  TrendingUp,
  TrendingDown,
  Calendar,
  Download,
  Printer,
  Mail,
  FileText,
  User,
  Wrench,
  Package,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Eye,
  Image as ImageIcon,
} from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/Card';
import { Badge } from './ui/Badge';

interface Receipt {
  id: string;
  date: string;
  vendor: string;
  category: string;
  description: string;
  amount: number;
  receiptImage?: string;
  invoiceNumber?: string;
}

interface LaborEntry {
  id: string;
  workerName: string;
  workerType: 'employee' | 'subcontractor' | 'service-provider';
  date: string;
  hoursWorked: number;
  hourlyRate: number;
  totalCost: number;
  description: string;
  approvedBy?: string;
}

interface WorkOrderData {
  id: string;
  workOrderNumber: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  projectTitle: string;
  projectDescription: string;
  location: string;
  
  // Dates
  requestDate: string;
  startDate: string;
  completionDate: string;
  invoicePaidDate: string;
  
  // Financial Summary
  quotedAmount: number;
  finalInvoiceAmount: number;
  totalMaterialCosts: number;
  totalLaborCosts: number;
  totalSubcontractorCosts: number;
  totalServiceProviderCosts: number;
  otherExpenses: number;
  totalCosts: number;
  profitMargin: number;
  profitAmount: number;
  
  // Detailed breakdowns
  receipts: Receipt[];
  laborEntries: LaborEntry[];
  
  // Additional info
  changeOrders?: Array<{
    id: string;
    date: string;
    description: string;
    amount: number;
    approved: boolean;
  }>;
  
  notes?: string;
  internalNotes?: string;
}

interface WorkOrderCompletionReportProps {
  workOrder: WorkOrderData;
  onClose?: () => void;
  onExport?: () => void;
  onEmail?: () => void;
}

export function WorkOrderCompletionReport({
  workOrder,
  onClose,
  onExport,
  onEmail,
}: WorkOrderCompletionReportProps) {
  const [expandedSections, setExpandedSections] = useState<{
    receipts: boolean;
    labor: boolean;
    summary: boolean;
    changeOrders: boolean;
  }>({
    receipts: true,
    labor: true,
    summary: true,
    changeOrders: true,
  });

  const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null);

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTime = (hours: number) => {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return `${h}h ${m}m`;
  };

  // Calculate totals by worker type
  const employeeHours = workOrder.laborEntries
    .filter(e => e.workerType === 'employee')
    .reduce((sum, e) => sum + e.hoursWorked, 0);
  
  const subcontractorHours = workOrder.laborEntries
    .filter(e => e.workerType === 'subcontractor')
    .reduce((sum, e) => sum + e.hoursWorked, 0);
  
  const serviceProviderHours = workOrder.laborEntries
    .filter(e => e.workerType === 'service-provider')
    .reduce((sum, e) => sum + e.hoursWorked, 0);

  const totalHours = employeeHours + subcontractorHours + serviceProviderHours;

  // Group receipts by category
  const receiptsByCategory = workOrder.receipts.reduce((acc, receipt) => {
    if (!acc[receipt.category]) {
      acc[receipt.category] = [];
    }
    acc[receipt.category].push(receipt);
    return acc;
  }, {} as Record<string, Receipt[]>);

  const handlePrint = () => {
    window.print();
  };

  const handleExport = () => {
    if (onExport) {
      onExport();
    } else {
      // Default CSV export
      const csvData = generateCSV();
      const blob = new Blob([csvData], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `completion-report-${workOrder.workOrderNumber}.csv`;
      a.click();
    }
  };

  const generateCSV = () => {
    let csv = 'Work Order Completion Report\n\n';
    csv += `Work Order #,${workOrder.workOrderNumber}\n`;
    csv += `Customer,${workOrder.customerName}\n`;
    csv += `Project,${workOrder.projectTitle}\n`;
    csv += `Completed,${formatDate(workOrder.completionDate)}\n`;
    csv += `Invoice Paid,${formatDate(workOrder.invoicePaidDate)}\n\n`;
    
    csv += 'Financial Summary\n';
    csv += `Quoted Amount,${workOrder.quotedAmount}\n`;
    csv += `Final Invoice,${workOrder.finalInvoiceAmount}\n`;
    csv += `Total Costs,${workOrder.totalCosts}\n`;
    csv += `Profit,${workOrder.profitAmount}\n`;
    csv += `Profit Margin,${workOrder.profitMargin}%\n\n`;
    
    csv += 'Labor Summary\n';
    csv += `Total Hours,${totalHours}\n`;
    csv += `Employee Hours,${employeeHours}\n`;
    csv += `Subcontractor Hours,${subcontractorHours}\n`;
    csv += `Service Provider Hours,${serviceProviderHours}\n\n`;
    
    csv += 'Detailed Labor\n';
    csv += 'Date,Worker,Type,Hours,Rate,Total,Description\n';
    workOrder.laborEntries.forEach(entry => {
      csv += `${entry.date},"${entry.workerName}",${entry.workerType},${entry.hoursWorked},${entry.hourlyRate},${entry.totalCost},"${entry.description}"\n`;
    });
    
    csv += '\nReceipts\n';
    csv += 'Date,Vendor,Category,Description,Amount,Invoice #\n';
    workOrder.receipts.forEach(receipt => {
      csv += `${receipt.date},"${receipt.vendor}","${receipt.category}","${receipt.description}",${receipt.amount},"${receipt.invoiceNumber || ''}"\n`;
    });
    
    return csv;
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-50 overflow-y-auto">
      <div className="min-h-screen px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <Card className="bg-[#1A1A1A] border-[#2A2A2A]">
            {/* Header */}
            <div className="p-8 border-b border-[#2A2A2A]">
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center">
                    <CheckCircle className="w-6 h-6 text-green-500" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-white mb-1">
                      Work Order Completion Report
                    </h1>
                    <p className="text-gray-400">
                      Work Order #{workOrder.workOrderNumber}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    onClick={handlePrint}
                    variant="outline"
                    className="border-[#2A2A2A] text-white hover:bg-[#2A2A2A]"
                  >
                    <Printer className="w-4 h-4 mr-2" />
                    Print
                  </Button>
                  <Button
                    onClick={handleExport}
                    variant="outline"
                    className="border-[#2A2A2A] text-white hover:bg-[#2A2A2A]"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Export CSV
                  </Button>
                  {onEmail && (
                    <Button
                      onClick={onEmail}
                      variant="outline"
                      className="border-[#2A2A2A] text-white hover:bg-[#2A2A2A]"
                    >
                      <Mail className="w-4 h-4 mr-2" />
                      Email
                    </Button>
                  )}
                  {onClose && (
                    <Button
                      onClick={onClose}
                      variant="outline"
                      className="border-[#2A2A2A] text-white hover:bg-[#2A2A2A]"
                    >
                      Close
                    </Button>
                  )}
                </div>
              </div>

              {/* Project Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div>
                  <p className="text-sm text-gray-400 mb-1">Customer</p>
                  <p className="text-white font-medium">{workOrder.customerName}</p>
                  <p className="text-sm text-gray-400">{workOrder.customerEmail}</p>
                  {workOrder.customerPhone && (
                    <p className="text-sm text-gray-400">{workOrder.customerPhone}</p>
                  )}
                </div>
                <div>
                  <p className="text-sm text-gray-400 mb-1">Project</p>
                  <p className="text-white font-medium">{workOrder.projectTitle}</p>
                  <p className="text-sm text-gray-400">{workOrder.location}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400 mb-1">Timeline</p>
                  <div className="space-y-1">
                    <p className="text-sm text-white">
                      Started: {formatDate(workOrder.startDate)}
                    </p>
                    <p className="text-sm text-white">
                      Completed: {formatDate(workOrder.completionDate)}
                    </p>
                    <p className="text-sm text-green-500 font-medium">
                      Paid: {formatDate(workOrder.invoicePaidDate)}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Financial Summary Section */}
            <div className="p-8 border-b border-[#2A2A2A]">
              <button
                onClick={() => toggleSection('summary')}
                className="flex items-center justify-between w-full mb-6"
              >
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-[#ea580c]" />
                  Financial Summary
                </h2>
                {expandedSections.summary ? (
                  <ChevronUp className="w-5 h-5 text-gray-400" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-400" />
                )}
              </button>

              {expandedSections.summary && (
                <>
                  {/* Key Metrics */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <Card className="bg-[#0A0A0A] border-[#2A2A2A] p-6">
                      <p className="text-sm text-gray-400 mb-2">Quoted Amount</p>
                      <p className="text-2xl font-bold text-white">
                        {formatCurrency(workOrder.quotedAmount)}
                      </p>
                    </Card>
                    <Card className="bg-[#0A0A0A] border-[#2A2A2A] p-6">
                      <p className="text-sm text-gray-400 mb-2">Final Invoice</p>
                      <p className="text-2xl font-bold text-white">
                        {formatCurrency(workOrder.finalInvoiceAmount)}
                      </p>
                      {workOrder.finalInvoiceAmount !== workOrder.quotedAmount && (
                        <Badge className="mt-2 bg-yellow-500/20 text-yellow-500">
                          {workOrder.finalInvoiceAmount > workOrder.quotedAmount ? '+' : ''}
                          {formatCurrency(workOrder.finalInvoiceAmount - workOrder.quotedAmount)}
                        </Badge>
                      )}
                    </Card>
                    <Card className="bg-[#0A0A0A] border-[#2A2A2A] p-6">
                      <p className="text-sm text-gray-400 mb-2">Total Costs</p>
                      <p className="text-2xl font-bold text-white">
                        {formatCurrency(workOrder.totalCosts)}
                      </p>
                    </Card>
                    <Card className="bg-[#0A0A0A] border-[#2A2A2A] p-6">
                      <p className="text-sm text-gray-400 mb-2 flex items-center gap-2">
                        Net Profit
                        {workOrder.profitAmount > 0 ? (
                          <TrendingUp className="w-4 h-4 text-green-500" />
                        ) : (
                          <TrendingDown className="w-4 h-4 text-red-500" />
                        )}
                      </p>
                      <p className={`text-2xl font-bold ${
                        workOrder.profitAmount > 0 ? 'text-green-500' : 'text-red-500'
                      }`}>
                        {formatCurrency(workOrder.profitAmount)}
                      </p>
                      <Badge className={`mt-2 ${
                        workOrder.profitMargin > 0
                          ? 'bg-green-500/20 text-green-500'
                          : 'bg-red-500/20 text-red-500'
                      }`}>
                        {workOrder.profitMargin.toFixed(1)}% margin
                      </Badge>
                    </Card>
                  </div>

                  {/* Cost Breakdown */}
                  <div className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-white mb-4">Cost Breakdown</h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between py-3 border-b border-[#2A2A2A]">
                        <div className="flex items-center gap-3">
                          <Package className="w-5 h-5 text-blue-500" />
                          <span className="text-white">Materials & Supplies</span>
                        </div>
                        <span className="text-white font-semibold">
                          {formatCurrency(workOrder.totalMaterialCosts)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between py-3 border-b border-[#2A2A2A]">
                        <div className="flex items-center gap-3">
                          <Users className="w-5 h-5 text-green-500" />
                          <span className="text-white">Employee Labor</span>
                        </div>
                        <span className="text-white font-semibold">
                          {formatCurrency(workOrder.totalLaborCosts)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between py-3 border-b border-[#2A2A2A]">
                        <div className="flex items-center gap-3">
                          <Wrench className="w-5 h-5 text-purple-500" />
                          <span className="text-white">Subcontractors</span>
                        </div>
                        <span className="text-white font-semibold">
                          {formatCurrency(workOrder.totalSubcontractorCosts)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between py-3 border-b border-[#2A2A2A]">
                        <div className="flex items-center gap-3">
                          <User className="w-5 h-5 text-orange-500" />
                          <span className="text-white">Service Providers</span>
                        </div>
                        <span className="text-white font-semibold">
                          {formatCurrency(workOrder.totalServiceProviderCosts)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between py-3 border-b border-[#2A2A2A]">
                        <div className="flex items-center gap-3">
                          <FileText className="w-5 h-5 text-gray-500" />
                          <span className="text-white">Other Expenses</span>
                        </div>
                        <span className="text-white font-semibold">
                          {formatCurrency(workOrder.otherExpenses)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between py-3 pt-6 border-t-2 border-[#ea580c]">
                        <span className="text-white font-bold text-lg">Total Costs</span>
                        <span className="text-white font-bold text-xl">
                          {formatCurrency(workOrder.totalCosts)}
                        </span>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Labor Hours Section */}
            <div className="p-8 border-b border-[#2A2A2A]">
              <button
                onClick={() => toggleSection('labor')}
                className="flex items-center justify-between w-full mb-6"
              >
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Clock className="w-5 h-5 text-[#ea580c]" />
                  Labor Hours & Costs
                </h2>
                {expandedSections.labor ? (
                  <ChevronUp className="w-5 h-5 text-gray-400" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-400" />
                )}
              </button>

              {expandedSections.labor && (
                <>
                  {/* Hours Summary */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                    <Card className="bg-[#0A0A0A] border-[#2A2A2A] p-6">
                      <p className="text-sm text-gray-400 mb-2">Total Hours</p>
                      <p className="text-3xl font-bold text-white">{formatTime(totalHours)}</p>
                    </Card>
                    <Card className="bg-[#0A0A0A] border-[#2A2A2A] p-6">
                      <p className="text-sm text-gray-400 mb-2">Employee Hours</p>
                      <p className="text-2xl font-bold text-green-500">{formatTime(employeeHours)}</p>
                    </Card>
                    <Card className="bg-[#0A0A0A] border-[#2A2A2A] p-6">
                      <p className="text-sm text-gray-400 mb-2">Subcontractor Hours</p>
                      <p className="text-2xl font-bold text-purple-500">{formatTime(subcontractorHours)}</p>
                    </Card>
                    <Card className="bg-[#0A0A0A] border-[#2A2A2A] p-6">
                      <p className="text-sm text-gray-400 mb-2">Service Provider Hours</p>
                      <p className="text-2xl font-bold text-orange-500">{formatTime(serviceProviderHours)}</p>
                    </Card>
                  </div>

                  {/* Detailed Labor Table */}
                  <div className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-[#1A1A1A] border-b border-[#2A2A2A]">
                          <tr>
                            <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase">
                              Date
                            </th>
                            <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase">
                              Worker
                            </th>
                            <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase">
                              Type
                            </th>
                            <th className="px-6 py-4 text-right text-xs font-medium text-gray-400 uppercase">
                              Hours
                            </th>
                            <th className="px-6 py-4 text-right text-xs font-medium text-gray-400 uppercase">
                              Rate
                            </th>
                            <th className="px-6 py-4 text-right text-xs font-medium text-gray-400 uppercase">
                              Total
                            </th>
                            <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase">
                              Description
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#2A2A2A]">
                          {workOrder.laborEntries.map((entry) => (
                            <tr key={entry.id} className="hover:bg-[#1A1A1A] transition-colors">
                              <td className="px-6 py-4 text-sm text-white whitespace-nowrap">
                                {formatDate(entry.date)}
                              </td>
                              <td className="px-6 py-4 text-sm text-white">
                                {entry.workerName}
                              </td>
                              <td className="px-6 py-4 text-sm">
                                <Badge className={`${
                                  entry.workerType === 'employee'
                                    ? 'bg-green-500/20 text-green-500'
                                    : entry.workerType === 'subcontractor'
                                    ? 'bg-purple-500/20 text-purple-500'
                                    : 'bg-orange-500/20 text-orange-500'
                                }`}>
                                  {entry.workerType}
                                </Badge>
                              </td>
                              <td className="px-6 py-4 text-sm text-white text-right whitespace-nowrap">
                                {formatTime(entry.hoursWorked)}
                              </td>
                              <td className="px-6 py-4 text-sm text-white text-right whitespace-nowrap">
                                {formatCurrency(entry.hourlyRate)}/hr
                              </td>
                              <td className="px-6 py-4 text-sm text-white text-right font-semibold whitespace-nowrap">
                                {formatCurrency(entry.totalCost)}
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-400">
                                {entry.description}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="bg-[#1A1A1A] border-t-2 border-[#ea580c]">
                          <tr>
                            <td colSpan={3} className="px-6 py-4 text-sm font-bold text-white">
                              Total Labor Costs
                            </td>
                            <td className="px-6 py-4 text-sm font-bold text-white text-right">
                              {formatTime(totalHours)}
                            </td>
                            <td colSpan={1}></td>
                            <td className="px-6 py-4 text-lg font-bold text-white text-right">
                              {formatCurrency(
                                workOrder.totalLaborCosts +
                                workOrder.totalSubcontractorCosts +
                                workOrder.totalServiceProviderCosts
                              )}
                            </td>
                            <td></td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Receipts Section */}
            <div className="p-8 border-b border-[#2A2A2A]">
              <button
                onClick={() => toggleSection('receipts')}
                className="flex items-center justify-between w-full mb-6"
              >
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-[#ea580c]" />
                  Receipts & Expenses ({workOrder.receipts.length})
                </h2>
                {expandedSections.receipts ? (
                  <ChevronUp className="w-5 h-5 text-gray-400" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-400" />
                )}
              </button>

              {expandedSections.receipts && (
                <div className="space-y-6">
                  {Object.entries(receiptsByCategory).map(([category, receipts]) => (
                    <div key={category}>
                      <h3 className="text-lg font-semibold text-white mb-4 flex items-center justify-between">
                        <span>{category}</span>
                        <Badge className="bg-[#ea580c]/20 text-[#ea580c]">
                          {formatCurrency(receipts.reduce((sum, r) => sum + r.amount, 0))}
                        </Badge>
                      </h3>
                      <div className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg overflow-hidden">
                        <table className="w-full">
                          <thead className="bg-[#1A1A1A] border-b border-[#2A2A2A]">
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                                Date
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                                Vendor
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                                Description
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                                Invoice #
                              </th>
                              <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase">
                                Amount
                              </th>
                              <th className="px-6 py-3 text-center text-xs font-medium text-gray-400 uppercase">
                                Receipt
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#2A2A2A]">
                            {receipts.map((receipt) => (
                              <tr key={receipt.id} className="hover:bg-[#1A1A1A] transition-colors">
                                <td className="px-6 py-4 text-sm text-white whitespace-nowrap">
                                  {formatDate(receipt.date)}
                                </td>
                                <td className="px-6 py-4 text-sm text-white">
                                  {receipt.vendor}
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-400">
                                  {receipt.description}
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-400">
                                  {receipt.invoiceNumber || '-'}
                                </td>
                                <td className="px-6 py-4 text-sm text-white text-right font-semibold whitespace-nowrap">
                                  {formatCurrency(receipt.amount)}
                                </td>
                                <td className="px-6 py-4 text-center">
                                  {receipt.receiptImage ? (
                                    <Button
                                      onClick={() => setSelectedReceipt(receipt)}
                                      size="sm"
                                      variant="outline"
                                      className="border-[#2A2A2A] text-white hover:bg-[#2A2A2A]"
                                    >
                                      <Eye className="w-4 h-4" />
                                    </Button>
                                  ) : (
                                    <span className="text-gray-500 text-xs">No image</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Change Orders Section */}
            {workOrder.changeOrders && workOrder.changeOrders.length > 0 && (
              <div className="p-8 border-b border-[#2A2A2A]">
                <button
                  onClick={() => toggleSection('changeOrders')}
                  className="flex items-center justify-between w-full mb-6"
                >
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-[#ea580c]" />
                    Change Orders ({workOrder.changeOrders.length})
                  </h2>
                  {expandedSections.changeOrders ? (
                    <ChevronUp className="w-5 h-5 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  )}
                </button>

                {expandedSections.changeOrders && (
                  <div className="space-y-4">
                    {workOrder.changeOrders.map((changeOrder) => (
                      <Card key={changeOrder.id} className="bg-[#0A0A0A] border-[#2A2A2A] p-6">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <Badge className={changeOrder.approved
                                ? 'bg-green-500/20 text-green-500'
                                : 'bg-yellow-500/20 text-yellow-500'
                              }>
                                {changeOrder.approved ? 'Approved' : 'Pending'}
                              </Badge>
                              <span className="text-sm text-gray-400">
                                {formatDate(changeOrder.date)}
                              </span>
                            </div>
                            <p className="text-white mb-1">{changeOrder.description}</p>
                          </div>
                          <div className="text-right ml-4">
                            <p className={`text-xl font-bold ${
                              changeOrder.amount > 0 ? 'text-green-500' : 'text-red-500'
                            }`}>
                              {changeOrder.amount > 0 ? '+' : ''}
                              {formatCurrency(changeOrder.amount)}
                            </p>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Notes Section */}
            {(workOrder.notes || workOrder.internalNotes) && (
              <div className="p-8">
                {workOrder.notes && (
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-white mb-3">Project Notes</h3>
                    <div className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg p-4">
                      <p className="text-gray-300 whitespace-pre-wrap">{workOrder.notes}</p>
                    </div>
                  </div>
                )}
                {workOrder.internalNotes && (
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-3">Internal Notes</h3>
                    <div className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg p-4">
                      <p className="text-gray-300 whitespace-pre-wrap">{workOrder.internalNotes}</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Receipt Image Modal */}
      {selectedReceipt && (
        <div
          className="fixed inset-0 bg-black/90 z-[60] flex items-center justify-center p-4"
          onClick={() => setSelectedReceipt(null)}
        >
          <div
            className="max-w-4xl max-h-[90vh] bg-[#1A1A1A] rounded-lg overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-[#2A2A2A] flex items-center justify-between">
              <div>
                <h3 className="text-white font-semibold">{selectedReceipt.vendor}</h3>
                <p className="text-sm text-gray-400">
                  {formatDate(selectedReceipt.date)} • {formatCurrency(selectedReceipt.amount)}
                </p>
              </div>
              <Button
                onClick={() => setSelectedReceipt(null)}
                variant="outline"
                className="border-[#2A2A2A] text-white hover:bg-[#2A2A2A]"
              >
                Close
              </Button>
            </div>
            <div className="p-4 overflow-auto max-h-[calc(90vh-100px)]">
              <img
                src={selectedReceipt.receiptImage}
                alt={`Receipt from ${selectedReceipt.vendor}`}
                className="w-full h-auto"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}