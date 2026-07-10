import { TrendingUp, Plus, DollarSign, PieChart, BarChart3, Users, Star } from 'lucide-react';

export default function InvestmentManagement() {
  return (
    <div className="bg-[#1A1A1A] rounded-xl shadow-sm border border-[#2A2A2A] p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-br from-emerald-600 to-teal-600 rounded-lg">
            <TrendingUp className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Investment & Profit Sharing Platform</h3>
            <p className="text-sm text-gray-400">Manage company investments and shareholder distributions</p>
          </div>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-lg hover:from-emerald-700 hover:to-teal-700 transition-all">
          <Plus className="w-4 h-4" />
          Add Investment
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl border border-emerald-200 p-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-emerald-700">Total Capital</p>
            <DollarSign className="w-5 h-5 text-emerald-600" />
          </div>
          <p className="text-2xl font-bold text-white">$0.00</p>
          <p className="text-xs text-gray-400 mt-1">Invested</p>
        </div>

        <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl border border-blue-200 p-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-blue-700">ROI</p>
            <TrendingUp className="w-5 h-5 text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-white">0%</p>
          <p className="text-xs text-gray-400 mt-1">Return on investment</p>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl border border-purple-200 p-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-purple-700">Shareholders</p>
            <Users className="w-5 h-5 text-purple-600" />
          </div>
          <p className="text-2xl font-bold text-white">0</p>
          <p className="text-xs text-gray-400 mt-1">Active investors</p>
        </div>

        <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl border border-amber-200 p-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-amber-700">Distributed</p>
            <Star className="w-5 h-5 text-amber-600" />
          </div>
          <p className="text-2xl font-bold text-white">$0.00</p>
          <p className="text-xs text-gray-400 mt-1">Profit shared</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="border border-[#2A2A2A] rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <PieChart className="w-5 h-5 text-emerald-600" />
            <h4 className="font-semibold text-white">Investment Portfolio</h4>
          </div>
          <div className="text-center py-12">
            <TrendingUp className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <p className="text-sm text-gray-400 mb-4">No investments recorded</p>
            <button className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm">
              <Plus className="w-4 h-4" />
              Add Investment
            </button>
          </div>
        </div>

        <div className="border border-[#2A2A2A] rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-5 h-5 text-blue-600" />
            <h4 className="font-semibold text-white">Profit Distribution</h4>
          </div>
          <div className="text-center py-12">
            <Users className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <p className="text-sm text-gray-400 mb-4">No shareholders yet</p>
            <button className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm">
              <Plus className="w-4 h-4" />
              Add Shareholder
            </button>
          </div>
        </div>
      </div>

      <div className="mt-6 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-lg p-6">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-emerald-600 rounded-lg">
            <TrendingUp className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <h4 className="text-lg font-semibold text-gray-900 mb-2">Investment Platform Features</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-gray-700">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-emerald-600 rounded-full" />
                <span>Track multiple investment rounds</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-emerald-600 rounded-full" />
                <span>Automated profit distribution</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-emerald-600 rounded-full" />
                <span>Shareholder portal access</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-emerald-600 rounded-full" />
                <span>ROI tracking and reporting</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-emerald-600 rounded-full" />
                <span>Equity management</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-emerald-600 rounded-full" />
                <span>Cap table management</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
