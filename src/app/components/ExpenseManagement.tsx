import { Receipt, Plus, TrendingDown, DollarSign, Calendar, Filter } from 'lucide-react';
import { Select } from './ui/input/Select';

export default function ExpenseManagement() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-600 rounded-lg">
            <Receipt className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Expense Tracking</h3>
            <p className="text-sm text-gray-400">Monitor and categorize all business expenses</p>
          </div>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors">
          <Plus className="w-4 h-4" />
          Add Expense
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-red-50 to-orange-50 rounded-xl border border-red-200 p-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-red-700">This Month</p>
            <Calendar className="w-5 h-5 text-red-600" />
          </div>
          <p className="text-2xl font-bold text-white">$0.00</p>
          <p className="text-xs text-gray-400 mt-1">Total expenses</p>
        </div>

        <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl border border-blue-200 p-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-blue-700">This Year</p>
            <TrendingDown className="w-5 h-5 text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-white">$0.00</p>
          <p className="text-xs text-gray-400 mt-1">Year to date</p>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl border border-purple-200 p-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-purple-700">Average</p>
            <DollarSign className="w-5 h-5 text-purple-600" />
          </div>
          <p className="text-2xl font-bold text-white">$0.00</p>
          <p className="text-xs text-gray-400 mt-1">Per month</p>
        </div>

        <div className="bg-gradient-to-br from-amber-50 to-yellow-50 rounded-xl border border-amber-200 p-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-amber-700">Categories</p>
            <Filter className="w-5 h-5 text-amber-600" />
          </div>
          <p className="text-2xl font-bold text-white">0</p>
          <p className="text-xs text-gray-400 mt-1">Active types</p>
        </div>
      </div>

      <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] overflow-hidden">
        <div className="p-6 border-b border-[#2A2A2A]">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-white">Recent Expenses</h4>
            <div className="flex gap-2">
              <Select
                value="all"
                onChange={() => {}}
                options={[
                  { value: 'all', label: 'All Categories' },
                  { value: 'materials', label: 'Materials' },
                  { value: 'labor', label: 'Labor' },
                  { value: 'equipment', label: 'Equipment' },
                  { value: 'travel', label: 'Travel' },
                  { value: 'utilities', label: 'Utilities' },
                  { value: 'marketing', label: 'Marketing' }
                ]}
              />
              <Select
                value="this-month"
                onChange={() => {}}
                options={[
                  { value: 'this-month', label: 'This Month' },
                  { value: 'last-month', label: 'Last Month' },
                  { value: 'this-quarter', label: 'This Quarter' },
                  { value: 'this-year', label: 'This Year' },
                  { value: 'all-time', label: 'All Time' }
                ]}
              />
            </div>
          </div>
        </div>
        <div className="p-12 text-center">
          <Receipt className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">No Expenses Recorded</h3>
          <p className="text-gray-400 mb-4">Start tracking your business expenses for better financial insights</p>
          <button className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors">
            <Plus className="w-4 h-4" />
            Add First Expense
          </button>
        </div>
      </div>
    </div>
  );
}
