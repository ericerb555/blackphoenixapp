/**
 * Job Tracking Hub - Consolidated Job Management
 * 
 * Central hub for all job tracking, scheduling, and project management
 * Tabs: Active Jobs | Projects | Job Financials | Master Schedule | Service Schedule | Change Orders | Weather Monitor
 */

import { useState, useEffect } from 'react';
import { 
  ArrowLeft, Briefcase, Building2, DollarSign, Calendar, Clock, 
  Edit2, Cloud, Plus, Search, Filter, TrendingUp, AlertTriangle,
  CheckCircle, XCircle, RefreshCw, Download, Eye, MapPin
} from 'lucide-react';
import { PageHeader } from '../components/PageHeader';

type TabType = 'active-jobs' | 'projects' | 'job-financial' | 'master-schedule' | 'service-schedule' | 'change-orders' | 'weather';

export default function JobTrackingHub() {
  const [activeTab, setActiveTab] = useState<TabType>('active-jobs');
  const [searchQuery, setSearchQuery] = useState('');

  // Read tab from URL on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab') as TabType;
    if (tab) {
      setActiveTab(tab);
    }
  }, []);

  // Update URL when tab changes
  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    const url = new URL(window.location.href);
    url.searchParams.set('tab', tab);
    window.history.pushState({}, '', url.toString());
  };

  const tabs = [
    { id: 'active-jobs', label: 'Active Jobs', icon: Briefcase },
    { id: 'projects', label: 'Projects', icon: Building2 },
    { id: 'job-financial', label: 'Job Financials', icon: DollarSign },
    { id: 'master-schedule', label: 'Master Schedule', icon: Calendar },
    { id: 'service-schedule', label: 'Service Schedule', icon: Clock },
    { id: 'change-orders', label: 'Change Orders', icon: Edit2 },
    { id: 'weather', label: 'Weather Monitor', icon: Cloud }
  ];

  const mockJobs = [
    { id: '1', name: 'Residential Remodel - 123 Main St', status: 'in-progress', budget: 85000, spent: 42500, progress: 50 },
    { id: '2', name: 'Commercial Build - Downtown Plaza', status: 'in-progress', budget: 250000, spent: 175000, progress: 70 },
    { id: '3', name: 'Kitchen Renovation - Oak Ave', status: 'planning', budget: 35000, spent: 0, progress: 10 }
  ];

  const mockChangeOrders = [
    { id: 'CO-001', job: 'Residential Remodel', description: 'Add bathroom fixtures upgrade', amount: 3500, status: 'pending' },
    { id: 'CO-002', job: 'Commercial Build', description: 'Change HVAC system specs', amount: 12000, status: 'approved' }
  ];

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      <PageHeader 
        title="Job Tracking Hub"
        description="Comprehensive job tracking, scheduling, and project management"
        onBack={() => window.location.href = '/unified-dashboard'}
      />

      <div className="max-w-[1800px] mx-auto p-6 space-y-6">
        {/* Tab Navigation */}
        <div className="bg-[#1A1A1A] border border-zinc-800 rounded-lg p-2 flex flex-wrap gap-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id as TabType)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-semibold transition-all ${
                  isActive
                    ? 'bg-orange-600 text-white shadow-lg shadow-orange-600/30'
                    : 'bg-[#0A0A0A] text-gray-400 hover:text-white hover:bg-[#2A2A2A]'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        {activeTab === 'active-jobs' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Active Jobs</h2>
              <button className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-semibold flex items-center gap-2">
                <Plus className="w-4 h-4" />
                New Job
              </button>
            </div>

            <div className="grid gap-4">
              {mockJobs.map((job) => (
                <div key={job.id} className="bg-[#1A1A1A] border border-zinc-800 rounded-lg p-6 hover:border-orange-500/30 transition-all">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-bold mb-1">{job.name}</h3>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${
                          job.status === 'in-progress' ? 'bg-blue-600/20 text-blue-400' : 'bg-yellow-600/20 text-yellow-400'
                        }`}>
                          {job.status === 'in-progress' ? 'In Progress' : 'Planning'}
                        </span>
                      </div>
                    </div>
                    <button className="px-3 py-1.5 bg-[#2A2A2A] hover:bg-[#3A3A3A] text-white rounded-lg text-sm font-semibold flex items-center gap-2">
                      <Eye className="w-4 h-4" />
                      View Details
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div>
                      <p className="text-sm text-zinc-400 mb-1">Budget</p>
                      <p className="text-lg font-bold text-green-400">${job.budget.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-sm text-zinc-400 mb-1">Spent</p>
                      <p className="text-lg font-bold text-orange-400">${job.spent.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-sm text-zinc-400 mb-1">Remaining</p>
                      <p className="text-lg font-bold text-white">${(job.budget - job.spent).toLocaleString()}</p>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm text-zinc-400">Progress</p>
                      <p className="text-sm font-semibold text-white">{job.progress}%</p>
                    </div>
                    <div className="w-full bg-zinc-800 rounded-full h-2">
                      <div 
                        className="bg-gradient-to-r from-orange-600 to-orange-500 h-2 rounded-full transition-all"
                        style={{ width: `${job.progress}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'projects' && (
          <div className="bg-[#1A1A1A] border border-zinc-800 rounded-lg p-8 text-center">
            <Building2 className="w-16 h-16 text-blue-500 mx-auto mb-4" />
            <h3 className="text-xl font-bold mb-2">Projects Management</h3>
            <p className="text-zinc-400 mb-4">View and manage all projects in one place</p>
            <button 
              onClick={() => window.location.href = '/projects-new'}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold"
            >
              Go to Projects
            </button>
          </div>
        )}

        {activeTab === 'job-financial' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Job Financials</h2>
              <button className="px-4 py-2 bg-[#1A1A1A] border border-zinc-700 hover:border-orange-500/50 text-white rounded-lg font-semibold flex items-center gap-2">
                <Download className="w-4 h-4" />
                Export Report
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gradient-to-br from-green-600/20 to-green-700/20 border border-green-500/30 rounded-lg p-6">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-green-200">Total Revenue</p>
                  <TrendingUp className="w-5 h-5 text-green-400" />
                </div>
                <p className="text-3xl font-bold text-white">$370,000</p>
                <p className="text-xs text-green-300 mt-1">+12% from last month</p>
              </div>

              <div className="bg-gradient-to-br from-orange-600/20 to-orange-700/20 border border-orange-500/30 rounded-lg p-6">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-orange-200">Total Expenses</p>
                  <DollarSign className="w-5 h-5 text-orange-400" />
                </div>
                <p className="text-3xl font-bold text-white">$217,500</p>
                <p className="text-xs text-orange-300 mt-1">58.8% of revenue</p>
              </div>

              <div className="bg-gradient-to-br from-blue-600/20 to-blue-700/20 border border-blue-500/30 rounded-lg p-6">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-blue-200">Net Profit</p>
                  <CheckCircle className="w-5 h-5 text-blue-400" />
                </div>
                <p className="text-3xl font-bold text-white">$152,500</p>
                <p className="text-xs text-blue-300 mt-1">41.2% margin</p>
              </div>
            </div>

            <div className="bg-[#1A1A1A] border border-zinc-800 rounded-lg p-6">
              <h3 className="text-lg font-bold mb-4">Financial Breakdown by Job</h3>
              <div className="space-y-3">
                {mockJobs.map((job) => (
                  <div key={job.id} className="flex items-center justify-between p-3 bg-[#0A0A0A] rounded-lg">
                    <span className="font-semibold">{job.name}</span>
                    <div className="flex items-center gap-4">
                      <span className="text-sm text-zinc-400">Budget: ${job.budget.toLocaleString()}</span>
                      <span className="text-sm text-zinc-400">Spent: ${job.spent.toLocaleString()}</span>
                      <span className="text-sm font-semibold text-green-400">
                        Remaining: ${(job.budget - job.spent).toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'master-schedule' && (
          <div className="bg-[#1A1A1A] border border-zinc-800 rounded-lg p-8 text-center">
            <Calendar className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-xl font-bold mb-2">Master Schedule</h3>
            <p className="text-zinc-400 mb-4">Company-wide calendar and scheduling</p>
            <button 
              onClick={() => window.location.href = '/master-scheduling'}
              className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold"
            >
              Open Master Schedule
            </button>
          </div>
        )}

        {activeTab === 'service-schedule' && (
          <div className="bg-[#1A1A1A] border border-zinc-800 rounded-lg p-8 text-center">
            <Clock className="w-16 h-16 text-cyan-500 mx-auto mb-4" />
            <h3 className="text-xl font-bold mb-2">Service Scheduling</h3>
            <p className="text-zinc-400 mb-4">Schedule service appointments and maintenance</p>
            <button 
              onClick={() => window.location.href = '/service-scheduling'}
              className="px-6 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg font-semibold"
            >
              Open Service Schedule
            </button>
          </div>
        )}

        {activeTab === 'change-orders' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Change Orders</h2>
              <button className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-semibold flex items-center gap-2">
                <Plus className="w-4 h-4" />
                New Change Order
              </button>
            </div>

            <div className="grid gap-4">
              {mockChangeOrders.map((co) => (
                <div key={co.id} className="bg-[#1A1A1A] border border-zinc-800 rounded-lg p-6 hover:border-orange-500/30 transition-all">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-bold">{co.id}</h3>
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${
                          co.status === 'approved' ? 'bg-green-600/20 text-green-400' : 'bg-yellow-600/20 text-yellow-400'
                        }`}>
                          {co.status === 'approved' ? 'Approved' : 'Pending'}
                        </span>
                      </div>
                      <p className="text-sm text-zinc-400 mb-1">Job: {co.job}</p>
                      <p className="text-white">{co.description}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-zinc-400 mb-1">Amount</p>
                      <p className="text-xl font-bold text-orange-400">${co.amount.toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-[#1A1A1A] border border-zinc-800 rounded-lg p-6 text-center">
              <button 
                onClick={() => window.location.href = '/change-orders'}
                className="px-6 py-2 bg-[#2A2A2A] hover:bg-[#3A3A3A] text-white rounded-lg font-semibold"
              >
                View All Change Orders
              </button>
            </div>
          </div>
        )}

        {activeTab === 'weather' && (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold">Weather Monitor</h2>
            
            <div className="bg-gradient-to-br from-blue-600/20 to-cyan-600/20 border border-blue-500/30 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-xl font-bold mb-1">Current Conditions</h3>
                  <p className="text-sm text-blue-200">Last updated: {new Date().toLocaleTimeString()}</p>
                </div>
                <Cloud className="w-12 h-12 text-blue-400" />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-blue-200 mb-1">Temperature</p>
                  <p className="text-2xl font-bold">72°F</p>
                </div>
                <div>
                  <p className="text-sm text-blue-200 mb-1">Conditions</p>
                  <p className="text-2xl font-bold">Partly Cloudy</p>
                </div>
                <div>
                  <p className="text-sm text-blue-200 mb-1">Wind</p>
                  <p className="text-2xl font-bold">8 mph</p>
                </div>
              </div>
            </div>

            <div className="bg-[#1A1A1A] border border-zinc-800 rounded-lg p-6">
              <h3 className="text-lg font-bold mb-4">Job Site Conditions</h3>
              <div className="space-y-3">
                {mockJobs.map((job) => (
                  <div key={job.id} className="flex items-center justify-between p-3 bg-[#0A0A0A] rounded-lg">
                    <div className="flex items-center gap-3">
                      <MapPin className="w-4 h-4 text-zinc-400" />
                      <span className="font-semibold">{job.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-400" />
                      <span className="text-sm text-green-400">Good Conditions</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}