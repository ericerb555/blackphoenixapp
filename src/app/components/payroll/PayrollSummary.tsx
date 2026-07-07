import { DollarSign, Users, Clock, TrendingUp, Download, Send, AlertCircle } from 'lucide-react';

interface PayrollPeriod {
  startDate: string;
  endDate: string;
  status: 'draft' | 'processing' | 'approved' | 'paid';
  totalEmployees: number;
  totalAmount: number;
  regularHours: number;
  overtimeHours: number;
}

interface PayrollSummaryProps {
  period: PayrollPeriod;
  onExport?: () => void;
  onProcess?: () => void;
}

export function PayrollSummary({ period, onExport, onProcess }: PayrollSummaryProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric'
    });
  };

  const getStatusColor = (status: PayrollPeriod['status']) => {
    const colors = {
      draft: 'bg-gray-600',
      processing: 'bg-yellow-600',
      approved: 'bg-blue-600',
      paid: 'bg-green-600'
    };
    return colors[status] || 'bg-gray-600';
  };

  return (
    <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold mb-1">
            Pay Period: {formatDate(period.startDate)} - {formatDate(period.endDate)}
          </h2>
          <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(period.status)}`}>
            <AlertCircle className="w-4 h-4" />
            {period.status.toUpperCase()}
          </div>
        </div>
        <div className="flex gap-3">
          {onExport && (
            <button 
              onClick={onExport}
              className="flex items-center gap-2 px-4 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg hover:border-[#ea580c] transition-colors"
            >
              <Download className="w-4 h-4" />
              Export
            </button>
          )}
          {onProcess && (
            <button 
              onClick={onProcess}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#ea580c] to-[#dc2626] hover:from-[#dc2626] hover:to-[#ea580c] rounded-lg font-semibold transition-all"
            >
              <Send className="w-4 h-4" />
              Process Payroll
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400 text-sm">Total Payroll</span>
            <DollarSign className="w-5 h-5 text-[#ea580c]" />
          </div>
          <div className="text-2xl font-bold text-[#ea580c]">
            {formatCurrency(period.totalAmount)}
          </div>
        </div>

        <div className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400 text-sm">Employees</span>
            <Users className="w-5 h-5 text-blue-500" />
          </div>
          <div className="text-2xl font-bold text-blue-500">
            {period.totalEmployees}
          </div>
        </div>

        <div className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400 text-sm">Regular Hours</span>
            <Clock className="w-5 h-5 text-green-500" />
          </div>
          <div className="text-2xl font-bold text-green-500">
            {period.regularHours}
          </div>
        </div>

        <div className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400 text-sm">Overtime Hours</span>
            <TrendingUp className="w-5 h-5 text-yellow-500" />
          </div>
          <div className="text-2xl font-bold text-yellow-500">
            {period.overtimeHours}
          </div>
        </div>
      </div>
    </div>
  );
}
