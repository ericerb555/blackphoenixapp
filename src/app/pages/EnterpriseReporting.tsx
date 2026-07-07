import { useState } from 'react';
import { BarChart3, Download, Calendar, TrendingUp, DollarSign, Users, Briefcase, FileText, Filter, Eye, UserPlus, Activity, Shield, Target, Bell, Layout, Brain, ArrowLeft, PieChart } from 'lucide-react';
import ReferralSourceReport from '../components/reporting/ReferralSourceReport';
import StakeholderActivityAnalytics from '../components/StakeholderActivityAnalytics';
import StakeholderAuditLogViewer from '../components/StakeholderAuditLogViewer';
import StakeholderEngagementDashboard from '../components/StakeholderEngagementDashboard';
import NotificationAnalyticsDashboard from '../components/NotificationAnalyticsDashboard';
import CustomReportBuilder from '../components/CustomReportBuilder';
import AIWorkRequestAnalytics from '../components/reporting/AIWorkRequestAnalytics';
import { BarChart, Bar, LineChart, Line, PieChart as RechartsPie, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { toast } from 'sonner';
import { projectId, publicAnonKey } from '../utils/supabase/info';

export default function EnterpriseReporting() {
  const [activeTab, setActiveTab] = useState<'overview' | 'financial' | 'referrals' | 'stakeholders' | 'audit' | 'engagement' | 'notifications' | 'builder' | 'ai-requests'>('overview');
  const [reportType, setReportType] = useState<'revenue' | 'customers' | 'projects'>('revenue');
  const [dateRange, setDateRange] = useState<'week' | 'month' | 'quarter' | 'year'>('month');
  
  const reports = [
    { id: 'RPT-001', name: 'Monthly Revenue Report', type: 'Financial', date: '2026-01-22', status: 'ready', size: '2.4 MB' },
    { id: 'RPT-002', name: 'Customer Analytics', type: 'Analytics', date: '2026-01-20', status: 'ready', size: '1.8 MB' },
    { id: 'RPT-003', name: 'Project Performance', type: 'Operations', date: '2026-01-18', status: 'ready', size: '3.1 MB' },
    { id: 'RPT-004', name: 'Employee Productivity', type: 'HR', date: '2026-01-15', status: 'processing', size: '2.2 MB' },
  ];

  const stats = [
    { label: 'Total Reports', value: '156', icon: FileText, change: '+12' },
    { label: 'This Month', value: '24', icon: Calendar, change: '+8' },
    { label: 'Scheduled', value: '8', icon: BarChart3, change: '+2' },
    { label: 'Storage Used', value: '245 MB', icon: Download, change: '+18 MB' }
  ];

  const categories = [
    { name: 'Financial Reports', count: 45, icon: DollarSign, color: 'orange' },
    { name: 'Customer Analytics', count: 38, icon: Users, color: 'blue' },
    { name: 'AI Work Requests', count: 247, icon: Brain, color: 'purple' },
    { name: 'Operations', count: 52, icon: Briefcase, color: 'green' },
    { name: 'Performance', count: 21, icon: TrendingUp, color: 'cyan' }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-4 mb-2">
          <button
            onClick={() => {
              window.location.href = '/unified-dashboard';
            }}
            className="p-2 hover:bg-[#2A2A2A] rounded-lg transition-colors text-gray-400 hover:text-white"
            title="Back to Unified Dashboard"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-3xl font-bold text-white flex items-center gap-2">
            <BarChart3 className="w-8 h-8 text-orange-400" />
            Enterprise Reporting
          </h1>
        </div>
        <p className="text-gray-400 ml-14">Advanced analytics and business intelligence</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-[#2A2A2A] overflow-x-auto">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-6 py-3 font-semibold transition-all relative ${
            activeTab === 'overview'
              ? 'text-orange-400'
              : 'text-gray-400 hover:text-gray-300'
          }`}
        >
          <BarChart3 className="w-4 h-4 inline mr-2" />
          Overview
          {activeTab === 'overview' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[#ea580c] to-[#c2410c]" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('financial')}
          className={`px-6 py-3 font-semibold transition-all relative whitespace-nowrap ${
            activeTab === 'financial'
              ? 'text-orange-400'
              : 'text-gray-400 hover:text-gray-300'
          }`}
        >
          <DollarSign className="w-4 h-4 inline mr-2" />
          Financial Reports
          {activeTab === 'financial' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[#ea580c] to-[#c2410c]" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('ai-requests')}
          className={`px-6 py-3 font-semibold transition-all relative whitespace-nowrap ${
            activeTab === 'ai-requests'
              ? 'text-orange-400'
              : 'text-gray-400 hover:text-gray-300'
          }`}
        >
          <Brain className="w-4 h-4 inline mr-2" />
          AI Work Requests
          <span className="ml-2 px-2 py-0.5 bg-purple-600 text-white text-sm font-bold rounded-full">NEW</span>
          {activeTab === 'ai-requests' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[#ea580c] to-[#c2410c]" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('referrals')}
          className={`px-6 py-3 font-semibold transition-all relative ${
            activeTab === 'referrals'
              ? 'text-orange-400'
              : 'text-gray-400 hover:text-gray-300'
          }`}
        >
          <UserPlus className="w-4 h-4 inline mr-2" />
          Referral Sources
          {activeTab === 'referrals' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[#ea580c] to-[#c2410c]" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('stakeholders')}
          className={`px-6 py-3 font-semibold transition-all relative ${
            activeTab === 'stakeholders'
              ? 'text-orange-400'
              : 'text-gray-400 hover:text-gray-300'
          }`}
        >
          <Activity className="w-4 h-4 inline mr-2" />
          Stakeholder Activity
          {activeTab === 'stakeholders' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[#ea580c] to-[#c2410c]" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('audit')}
          className={`px-6 py-3 font-semibold transition-all relative ${
            activeTab === 'audit'
              ? 'text-orange-400'
              : 'text-gray-400 hover:text-gray-300'
          }`}
        >
          <Shield className="w-4 h-4 inline mr-2" />
          Audit Logs
          {activeTab === 'audit' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[#ea580c] to-[#c2410c]" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('engagement')}
          className={`px-6 py-3 font-semibold transition-all relative ${
            activeTab === 'engagement'
              ? 'text-orange-400'
              : 'text-gray-400 hover:text-gray-300'
          }`}
        >
          <Target className="w-4 h-4 inline mr-2" />
          Engagement
          {activeTab === 'engagement' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[#ea580c] to-[#c2410c]" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('notifications')}
          className={`px-6 py-3 font-semibold transition-all relative ${
            activeTab === 'notifications'
              ? 'text-orange-400'
              : 'text-gray-400 hover:text-gray-300'
          }`}
        >
          <Bell className="w-4 h-4 inline mr-2" />
          Notifications
          {activeTab === 'notifications' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[#ea580c] to-[#c2410c]" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('builder')}
          className={`px-6 py-3 font-semibold transition-all relative ${
            activeTab === 'builder'
              ? 'text-orange-400'
              : 'text-gray-400 hover:text-gray-300'
          }`}
        >
          <Layout className="w-4 h-4 inline mr-2" />
          Builder
          {activeTab === 'builder' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[#ea580c] to-[#c2410c]" />
          )}
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'financial' ? (
        // Financial Reports Tab Content (Consolidated from Reports.tsx)
        <FinancialReportsContent reportType={reportType} setReportType={setReportType} dateRange={dateRange} setDateRange={setDateRange} />
      ) : activeTab === 'ai-requests' ? (
        <AIWorkRequestAnalytics />
      ) : activeTab === 'referrals' ? (
        <ReferralSourceReport />
      ) : activeTab === 'stakeholders' ? (
        <StakeholderActivityAnalytics />
      ) : activeTab === 'audit' ? (
        <StakeholderAuditLogViewer />
      ) : activeTab === 'engagement' ? (
        <StakeholderEngagementDashboard />
      ) : activeTab === 'notifications' ? (
        <NotificationAnalyticsDashboard />
      ) : activeTab === 'builder' ? (
        <CustomReportBuilder />
      ) : (
        <div className="space-y-6">

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div key={i} className="bg-[#1A1A1A] rounded-2xl p-6 border border-[#2A2A2A] hover:border-orange-500/30 transition group">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-600/20 to-orange-700/20 flex items-center justify-center border border-orange-500/20">
                  <Icon className="w-6 h-6 text-orange-400" />
                </div>
                <span className="text-sm font-semibold text-green-400">{stat.change}</span>
              </div>
              <p className="text-2xl font-bold text-white">{stat.value}</p>
              <p className="text-sm text-gray-400">{stat.label}</p>
            </div>
          );
        })}
      </div>

      {/* Report Categories */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {categories.map((category, i) => {
          const Icon = category.icon;
          return (
            <div 
              key={i} 
              className="bg-[#1A1A1A] rounded-2xl p-6 border border-[#2A2A2A] hover:border-orange-500/30 hover:bg-gradient-to-br hover:from-orange-600/5 hover:to-orange-700/5 transition cursor-pointer group"
              onClick={() => {
                if (category.name === 'AI Work Requests') {
                  setActiveTab('ai-requests');
                }
              }}
            >
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br mb-4 flex items-center justify-center border ${
                category.color === 'orange' ? 'from-orange-600/20 to-orange-700/20 border-orange-500/20' :
                category.color === 'blue' ? 'from-blue-600/20 to-blue-700/20 border-blue-500/20' :
                category.color === 'green' ? 'from-green-600/20 to-green-700/20 border-green-500/20' :
                category.color === 'purple' ? 'from-purple-600/20 to-purple-700/20 border-purple-500/20' :
                'from-cyan-600/20 to-cyan-700/20 border-cyan-500/20'
              }`}>
                <Icon className={`w-6 h-6 ${
                  category.color === 'orange' ? 'text-orange-400' :
                  category.color === 'blue' ? 'text-blue-400' :
                  category.color === 'green' ? 'text-green-400' :
                  category.color === 'purple' ? 'text-purple-400' :
                  'text-cyan-400'
                }`} />
              </div>
              <h3 className="font-semibold text-white mb-1 group-hover:text-orange-400 transition">{category.name}</h3>
              <p className="text-2xl font-bold text-orange-400">{category.count}</p>
              <p className="text-sm text-gray-400">
                {category.name === 'AI Work Requests' ? 'work requests' : 'reports available'}
              </p>
            </div>
          );
        })}
      </div>

      {/* Filters & Actions */}
      <div className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] p-6">
        <div className="flex items-center gap-4">
          <button className="flex items-center gap-2 px-4 py-3 border border-[#2A2A2A] rounded-xl text-gray-300 hover:bg-[#2A2A2A] transition">
            <Calendar className="w-4 h-4" />
            Last 30 Days
          </button>
          <button className="flex items-center gap-2 px-4 py-3 border border-[#2A2A2A] rounded-xl text-gray-300 hover:bg-[#2A2A2A] transition">
            <Filter className="w-4 h-4" />
            All Types
          </button>
          <button className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-600 to-orange-700 text-white rounded-xl hover:from-orange-700 hover:to-orange-800 transition shadow-lg shadow-orange-500/20 ml-auto">
            <BarChart3 className="w-4 h-4" />
            Generate Report
          </button>
        </div>
      </div>

      {/* Reports List */}
      <div className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] overflow-hidden">
        <div className="px-6 py-4 border-b border-[#2A2A2A]">
          <h2 className="text-lg font-semibold text-white">Recent Reports</h2>
        </div>
        <div className="divide-y divide-[#2A2A2A]">
          {reports.map((report) => (
            <div key={report.id} className="p-6 hover:bg-[#2A2A2A]/50 transition cursor-pointer">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-orange-600/20 to-orange-700/20 flex items-center justify-center border border-orange-500/20">
                    <FileText className="w-7 h-7 text-orange-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white mb-1">{report.name}</h3>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-gray-400">{report.id}</span>
                      <span className="px-2 py-0.5 rounded text-sm font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                        {report.type}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <p className="text-sm text-gray-500">Generated</p>
                    <p className="text-sm text-gray-300">{report.date}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-500">Size</p>
                    <p className="text-sm text-gray-300">{report.size}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-lg text-sm font-semibold ${
                    report.status === 'ready'
                      ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                      : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                  }`}>
                    {report.status.toUpperCase()}
                  </span>
                  <div className="flex items-center gap-2">
                    <button className="p-2 hover:bg-orange-600/10 rounded-lg transition">
                      <Eye className="w-4 h-4 text-orange-400" />
                    </button>
                    <button className="p-2 hover:bg-orange-600/10 rounded-lg transition">
                      <Download className="w-4 h-4 text-orange-400" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Scheduled Reports */}
      <div className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Scheduled Reports</h2>
        <div className="space-y-3">
          {[
            { name: 'Weekly Revenue Summary', frequency: 'Every Monday at 9:00 AM', next: '2026-01-27' },
            { name: 'Monthly Performance', frequency: 'First day of month at 8:00 AM', next: '2026-02-01' },
            { name: 'Daily Operations', frequency: 'Every day at 6:00 PM', next: '2026-01-22' }
          ].map((scheduled, i) => (
            <div key={i} className="flex items-center justify-between p-4 bg-[#0A0A0A] rounded-xl border border-[#2A2A2A]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-600/20 to-orange-700/20 flex items-center justify-center border border-orange-500/20">
                  <Calendar className="w-5 h-5 text-orange-400" />
                </div>
                <div>
                  <h4 className="font-semibold text-white">{scheduled.name}</h4>
                  <p className="text-sm text-gray-400">{scheduled.frequency}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500">Next Run</p>
                <p className="text-sm font-medium text-gray-300">{scheduled.next}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
        </div>
      )}
    </div>
  );
}

// Financial Reports Tab Content (Consolidated from Reports.tsx)
function FinancialReportsContent({ reportType, setReportType, dateRange, setDateRange }: { reportType: 'revenue' | 'customers' | 'projects', setReportType: (type: 'revenue' | 'customers' | 'projects') => void, dateRange: 'week' | 'month' | 'quarter' | 'year', setDateRange: (range: 'week' | 'month' | 'quarter' | 'year') => void }) {
  return (
    <div className="space-y-6">
      {/* Report Type Selector */}
      <div className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] p-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setReportType('revenue')}
            className={`px-4 py-2 font-semibold transition-all relative ${
              reportType === 'revenue'
                ? 'text-orange-400'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            Revenue
            {reportType === 'revenue' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[#ea580c] to-[#c2410c]" />
            )}
          </button>
          <button
            onClick={() => setReportType('customers')}
            className={`px-4 py-2 font-semibold transition-all relative ${
              reportType === 'customers'
                ? 'text-orange-400'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            Customers
            {reportType === 'customers' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[#ea580c] to-[#c2410c]" />
            )}
          </button>
          <button
            onClick={() => setReportType('projects')}
            className={`px-4 py-2 font-semibold transition-all relative ${
              reportType === 'projects'
                ? 'text-orange-400'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            Projects
            {reportType === 'projects' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[#ea580c] to-[#c2410c]" />
            )}
          </button>
        </div>
      </div>

      {/* Date Range Selector */}
      <div className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] p-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setDateRange('week')}
            className={`px-4 py-2 font-semibold transition-all relative ${
              dateRange === 'week'
                ? 'text-orange-400'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            Week
            {dateRange === 'week' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[#ea580c] to-[#c2410c]" />
            )}
          </button>
          <button
            onClick={() => setDateRange('month')}
            className={`px-4 py-2 font-semibold transition-all relative ${
              dateRange === 'month'
                ? 'text-orange-400'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            Month
            {dateRange === 'month' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[#ea580c] to-[#c2410c]" />
            )}
          </button>
          <button
            onClick={() => setDateRange('quarter')}
            className={`px-4 py-2 font-semibold transition-all relative ${
              dateRange === 'quarter'
                ? 'text-orange-400'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            Quarter
            {dateRange === 'quarter' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[#ea580c] to-[#c2410c]" />
            )}
          </button>
          <button
            onClick={() => setDateRange('year')}
            className={`px-4 py-2 font-semibold transition-all relative ${
              dateRange === 'year'
                ? 'text-orange-400'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            Year
            {dateRange === 'year' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[#ea580c] to-[#c2410c]" />
            )}
          </button>
        </div>
      </div>

      {/* Financial Reports Chart */}
      <div className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Financial Reports</h2>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={generateFinancialData(reportType, dateRange)}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="value" fill="#FF8C00" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// Generate Financial Data based on report type and date range
function generateFinancialData(reportType: 'revenue' | 'customers' | 'projects', dateRange: 'week' | 'month' | 'quarter' | 'year') {
  const data = [];
  const currentDate = new Date();
  const startDate = new Date(currentDate);

  switch (dateRange) {
    case 'week':
      startDate.setDate(currentDate.getDate() - 6);
      break;
    case 'month':
      startDate.setMonth(currentDate.getMonth() - 1);
      break;
    case 'quarter':
      startDate.setMonth(currentDate.getMonth() - 3);
      break;
    case 'year':
      startDate.setFullYear(currentDate.getFullYear() - 1);
      break;
  }

  const days = Math.ceil((currentDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

  for (let i = 0; i < days; i++) {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + i);
    const value = Math.floor(Math.random() * 1000) + 100; // Random value between 100 and 1099
    data.push({ name: date.toISOString().split('T')[0], value });
  }

  return data;
}