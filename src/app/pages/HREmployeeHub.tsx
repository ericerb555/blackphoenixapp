/**
 * HR & Employee Hub - Comprehensive Human Resources Management
 * 
 * Central hub for all employee and HR operations:
 * - Employee Directory & Management
 * - Time Tracking & Attendance
 * - Payroll & Compensation
 * - Performance Reviews
 * - Onboarding & Offboarding
 * - Benefits Administration
 * - Training & Development
 * - Compliance & Documents
 */

import { useState, useEffect } from 'react';
import { 
  Users, Clock, DollarSign, Star, UserPlus, Heart, GraduationCap, FileCheck,
  Search, Plus, Download, Filter, Eye, Edit2, TrendingUp, BarChart3,
  Mail, Phone, MapPin, Calendar, CheckCircle, AlertTriangle, Award,
  Briefcase, Target, Shield, Activity, Building2, ArrowLeft
} from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { toast } from 'sonner@2.0.3';

type TabType = 'directory' | 'time-tracking' | 'payroll' | 'performance' | 'onboarding' | 'benefits' | 'training' | 'compliance';

interface Employee {
  id: string;
  name: string;
  role: string;
  department: string;
  status: 'active' | 'on-leave' | 'terminated';
  hireDate: string;
  email: string;
  phone: string;
  salary: number;
  performance: number;
  avatar?: string;
}

export default function HREmployeeHub() {
  const [activeTab, setActiveTab] = useState<TabType>('directory');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('all');

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
    { id: 'directory' as TabType, label: 'Employee Directory', icon: Users, color: 'blue' },
    { id: 'time-tracking' as TabType, label: 'Time & Attendance', icon: Clock, color: 'purple' },
    { id: 'payroll' as TabType, label: 'Payroll', icon: DollarSign, color: 'green' },
    { id: 'performance' as TabType, label: 'Performance', icon: Star, color: 'yellow' },
    { id: 'onboarding' as TabType, label: 'Onboarding', icon: UserPlus, color: 'cyan' },
    { id: 'benefits' as TabType, label: 'Benefits', icon: Heart, color: 'pink' },
    { id: 'training' as TabType, label: 'Training', icon: GraduationCap, color: 'indigo' },
    { id: 'compliance' as TabType, label: 'Compliance', icon: FileCheck, color: 'red' },
  ];

  const mockEmployees: Employee[] = [
    {
      id: 'EMP-001',
      name: 'Michael Chen',
      role: 'Senior Project Manager',
      department: 'Operations',
      status: 'active',
      hireDate: '2024-03-15',
      email: 'michael.chen@company.com',
      phone: '(555) 123-4567',
      salary: 85000,
      performance: 4.8
    },
    {
      id: 'EMP-002',
      name: 'Sarah Williams',
      role: 'Lead Carpenter',
      department: 'Field Operations',
      status: 'active',
      hireDate: '2023-08-22',
      email: 'sarah.williams@company.com',
      phone: '(555) 234-5678',
      salary: 62000,
      performance: 4.9
    },
    {
      id: 'EMP-003',
      name: 'David Martinez',
      role: 'Electrician',
      department: 'Field Operations',
      status: 'active',
      hireDate: '2025-01-10',
      email: 'david.martinez@company.com',
      phone: '(555) 345-6789',
      salary: 58000,
      performance: 4.6
    },
    {
      id: 'EMP-004',
      name: 'Emily Johnson',
      role: 'HR Coordinator',
      department: 'Human Resources',
      status: 'on-leave',
      hireDate: '2024-06-01',
      email: 'emily.johnson@company.com',
      phone: '(555) 456-7890',
      salary: 55000,
      performance: 4.7
    },
    {
      id: 'EMP-005',
      name: 'James Wilson',
      role: 'Plumber',
      department: 'Field Operations',
      status: 'active',
      hireDate: '2024-11-05',
      email: 'james.wilson@company.com',
      phone: '(555) 567-8901',
      salary: 56000,
      performance: 4.5
    },
  ];

  const departments = ['all', 'Operations', 'Field Operations', 'Human Resources', 'Sales', 'Finance'];

  const filteredEmployees = mockEmployees.filter(emp => {
    const matchesSearch = emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         emp.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         emp.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDepartment = selectedDepartment === 'all' || emp.department === selectedDepartment;
    return matchesSearch && matchesDepartment;
  });

  const stats = {
    totalEmployees: mockEmployees.length,
    activeEmployees: mockEmployees.filter(e => e.status === 'active').length,
    totalPayroll: mockEmployees.reduce((sum, e) => sum + e.salary, 0),
    avgPerformance: (mockEmployees.reduce((sum, e) => sum + e.performance, 0) / mockEmployees.length).toFixed(1),
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      <PageHeader 
        title="HR & Employee Hub"
        description="Comprehensive human resources and employee management"
        onBack={() => window.location.href = '/unified-dashboard'}
      />

      <div className="max-w-[1800px] mx-auto p-6 space-y-6">
        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-blue-600/20 to-blue-700/20 border border-blue-500/30 rounded-lg p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-blue-200">Total Employees</p>
              <Users className="w-5 h-5 text-blue-400" />
            </div>
            <p className="text-3xl font-bold text-white">{stats.totalEmployees}</p>
            <p className="text-xs text-blue-300 mt-1">{stats.activeEmployees} active</p>
          </div>

          <div className="bg-gradient-to-br from-green-600/20 to-green-700/20 border border-green-500/30 rounded-lg p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-green-200">Monthly Payroll</p>
              <DollarSign className="w-5 h-5 text-green-400" />
            </div>
            <p className="text-3xl font-bold text-white">${(stats.totalPayroll / 1000).toFixed(0)}K</p>
            <p className="text-xs text-green-300 mt-1">Total compensation</p>
          </div>

          <div className="bg-gradient-to-br from-yellow-600/20 to-yellow-700/20 border border-yellow-500/30 rounded-lg p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-yellow-200">Avg Performance</p>
              <Star className="w-5 h-5 text-yellow-400" />
            </div>
            <p className="text-3xl font-bold text-white">{stats.avgPerformance}</p>
            <p className="text-xs text-yellow-300 mt-1">Out of 5.0</p>
          </div>

          <div className="bg-gradient-to-br from-purple-600/20 to-purple-700/20 border border-purple-500/30 rounded-lg p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-purple-200">Open Positions</p>
              <Briefcase className="w-5 h-5 text-purple-400" />
            </div>
            <p className="text-3xl font-bold text-white">3</p>
            <p className="text-xs text-purple-300 mt-1">Currently hiring</p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-[#1A1A1A] border border-zinc-800 rounded-lg p-2">
          <div className="flex items-center gap-2 overflow-x-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={`flex items-center gap-2 px-4 py-3 rounded-lg transition-all whitespace-nowrap font-semibold ${
                    isActive
                      ? 'bg-[#ea580c] text-white shadow-lg shadow-orange-600/30'
                      : 'text-zinc-400 hover:text-white hover:bg-[#2A2A2A]'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'directory' && (
          <div className="space-y-4">
            {/* Employee Directory */}
            <div className="bg-[#1A1A1A] border border-zinc-800 rounded-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <Users className="w-6 h-6 text-blue-500" />
                  <h3 className="text-xl font-bold">Employee Directory</h3>
                </div>
                <button 
                  onClick={() => toast.info('Opening employee creation form...')}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold flex items-center gap-2 transition-all"
                >
                  <Plus className="w-4 h-4" />
                  Add Employee
                </button>
              </div>

              {/* Search and Filters */}
              <div className="flex flex-wrap items-center gap-4 mb-6">
                <div className="flex-1 min-w-[300px] relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-[#0A0A0A] border border-zinc-800 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500 transition-colors"
                    placeholder="Search employees by name, role, or email..."
                  />
                </div>

                <select
                  value={selectedDepartment}
                  onChange={(e) => setSelectedDepartment(e.target.value)}
                  className="px-4 py-3 bg-[#0A0A0A] border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-blue-500 transition-colors"
                >
                  {departments.map((dept) => (
                    <option key={dept} value={dept}>
                      {dept === 'all' ? 'All Departments' : dept}
                    </option>
                  ))}
                </select>

                <button
                  onClick={() => toast.info('Exporting employee directory...')}
                  className="px-4 py-3 bg-[#2A2A2A] hover:bg-[#3A3A3A] border border-zinc-800 text-white rounded-lg font-semibold flex items-center gap-2 transition-all"
                >
                  <Download className="w-4 h-4" />
                  Export
                </button>
              </div>

              {/* Employee List */}
              <div className="space-y-3">
                {filteredEmployees.map((employee) => (
                  <div
                    key={employee.id}
                    className="bg-[#0A0A0A] border border-zinc-800 rounded-lg p-5 hover:border-blue-500/30 transition-all group"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4 flex-1">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center text-white font-bold text-lg">
                          {employee.name.split(' ').map(n => n[0]).join('')}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h4 className="text-lg font-bold text-white">{employee.name}</h4>
                            <span className="text-xs text-zinc-500">{employee.id}</span>
                            <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                              employee.status === 'active' ? 'bg-green-600/20 text-green-400' :
                              employee.status === 'on-leave' ? 'bg-yellow-600/20 text-yellow-400' :
                              'bg-gray-600/20 text-gray-400'
                            }`}>
                              {employee.status.toUpperCase()}
                            </span>
                          </div>
                          <p className="text-sm text-zinc-400 mb-3">{employee.role} • {employee.department}</p>
                          <div className="flex items-center gap-6 text-xs text-zinc-500">
                            <span className="flex items-center gap-1">
                              <Mail className="w-3 h-3" />
                              {employee.email}
                            </span>
                            <span className="flex items-center gap-1">
                              <Phone className="w-3 h-3" />
                              {employee.phone}
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              Hired {employee.hireDate}
                            </span>
                            <span className="flex items-center gap-1">
                              <Star className="w-3 h-3 text-yellow-400" />
                              {employee.performance}/5.0
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => toast.info(`Viewing ${employee.name}'s profile`)}
                          className="p-2 bg-[#1A1A1A] hover:bg-[#2A2A2A] border border-zinc-800 text-white rounded-lg transition-all"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => toast.info(`Editing ${employee.name}'s profile`)}
                          className="p-2 bg-[#1A1A1A] hover:bg-[#2A2A2A] border border-zinc-800 text-white rounded-lg transition-all"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'time-tracking' && (
          <div className="space-y-4">
            {/* Time Tracking Overview */}
            <div className="bg-[#1A1A1A] border border-zinc-800 rounded-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <Clock className="w-6 h-6 text-purple-500" />
                  <h3 className="text-xl font-bold">Time & Attendance Tracking</h3>
                </div>
                <button 
                  onClick={() => toast.info('Opening time entry form...')}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold flex items-center gap-2 transition-all"
                >
                  <Plus className="w-4 h-4" />
                  Log Time
                </button>
              </div>

              {/* This Week Stats */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-gradient-to-br from-purple-600/10 to-purple-700/10 border border-purple-500/30 rounded-lg p-4">
                  <p className="text-sm text-purple-200 mb-1">Total Hours (This Week)</p>
                  <p className="text-2xl font-bold text-white">187.5</p>
                  <p className="text-xs text-purple-300 mt-1">Across all employees</p>
                </div>
                <div className="bg-gradient-to-br from-green-600/10 to-green-700/10 border border-green-500/30 rounded-lg p-4">
                  <p className="text-sm text-green-200 mb-1">On Time</p>
                  <p className="text-2xl font-bold text-white">94%</p>
                  <p className="text-xs text-green-300 mt-1">Attendance rate</p>
                </div>
                <div className="bg-gradient-to-br from-yellow-600/10 to-yellow-700/10 border border-yellow-500/30 rounded-lg p-4">
                  <p className="text-sm text-yellow-200 mb-1">Overtime Hours</p>
                  <p className="text-2xl font-bold text-white">12.5</p>
                  <p className="text-xs text-yellow-300 mt-1">This week</p>
                </div>
                <div className="bg-gradient-to-br from-red-600/10 to-red-700/10 border border-red-500/30 rounded-lg p-4">
                  <p className="text-sm text-red-200 mb-1">Late Check-ins</p>
                  <p className="text-2xl font-bold text-white">3</p>
                  <p className="text-xs text-red-300 mt-1">Needs attention</p>
                </div>
              </div>

              {/* Recent Time Entries */}
              <div>
                <h4 className="font-semibold mb-4">Today's Time Entries</h4>
                <div className="space-y-2">
                  {[
                    { employee: 'Michael Chen', checkIn: '08:00 AM', checkOut: '05:00 PM', hours: 8.0, status: 'complete' },
                    { employee: 'Sarah Williams', checkIn: '07:30 AM', checkOut: '04:30 PM', hours: 8.0, status: 'complete' },
                    { employee: 'David Martinez', checkIn: '08:15 AM', checkOut: '--', hours: 0, status: 'active' },
                    { employee: 'James Wilson', checkIn: '09:05 AM', checkOut: '--', hours: 0, status: 'late' },
                  ].map((entry, idx) => (
                    <div key={idx} className="flex items-center justify-between p-4 bg-[#0A0A0A] border border-zinc-800 rounded-lg">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-600 to-purple-700 flex items-center justify-center text-white font-bold text-sm">
                          {entry.employee.split(' ').map(n => n[0]).join('')}
                        </div>
                        <div>
                          <p className="font-semibold text-white">{entry.employee}</p>
                          <p className="text-xs text-zinc-500">
                            {entry.checkIn} - {entry.checkOut}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-sm font-semibold text-white">{entry.hours > 0 ? `${entry.hours} hrs` : 'In Progress'}</p>
                          <span className={`text-xs ${
                            entry.status === 'complete' ? 'text-green-400' :
                            entry.status === 'active' ? 'text-blue-400' :
                            'text-red-400'
                          }`}>
                            {entry.status === 'complete' ? 'Completed' :
                             entry.status === 'active' ? 'Active' :
                             'Late Check-in'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button
                onClick={() => toast.info('Opening timesheet reports...')}
                className="bg-gradient-to-br from-purple-600/10 to-purple-700/10 border border-purple-500/30 rounded-lg p-6 hover:border-purple-500/60 transition-all text-left group"
              >
                <BarChart3 className="w-8 h-8 text-purple-400 mb-3 group-hover:scale-110 transition-transform" />
                <h4 className="font-bold text-lg text-white mb-2">Timesheet Reports</h4>
                <p className="text-sm text-zinc-400">View detailed time and attendance reports</p>
              </button>

              <button
                onClick={() => toast.info('Managing PTO requests...')}
                className="bg-gradient-to-br from-blue-600/10 to-blue-700/10 border border-blue-500/30 rounded-lg p-6 hover:border-blue-500/60 transition-all text-left group"
              >
                <Calendar className="w-8 h-8 text-blue-400 mb-3 group-hover:scale-110 transition-transform" />
                <h4 className="font-bold text-lg text-white mb-2">PTO Requests</h4>
                <p className="text-sm text-zinc-400">Manage time-off requests and approvals</p>
              </button>

              <button
                onClick={() => toast.info('Viewing attendance history...')}
                className="bg-gradient-to-br from-green-600/10 to-green-700/10 border border-green-500/30 rounded-lg p-6 hover:border-green-500/60 transition-all text-left group"
              >
                <CheckCircle className="w-8 h-8 text-green-400 mb-3 group-hover:scale-110 transition-transform" />
                <h4 className="font-bold text-lg text-white mb-2">Attendance History</h4>
                <p className="text-sm text-zinc-400">Review historical attendance records</p>
              </button>
            </div>
          </div>
        )}

        {activeTab === 'payroll' && (
          <div className="space-y-4">
            {/* Payroll Management */}
            <div className="bg-[#1A1A1A] border border-zinc-800 rounded-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <DollarSign className="w-6 h-6 text-green-500" />
                  <h3 className="text-xl font-bold">Payroll Management</h3>
                </div>
                <button 
                  onClick={() => toast.info('Running payroll...')}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold flex items-center gap-2 transition-all"
                >
                  <DollarSign className="w-4 h-4" />
                  Run Payroll
                </button>
              </div>

              {/* Payroll Stats */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-gradient-to-br from-green-600/10 to-green-700/10 border border-green-500/30 rounded-lg p-4">
                  <p className="text-sm text-green-200 mb-1">Total Payroll</p>
                  <p className="text-2xl font-bold text-white">${stats.totalPayroll.toLocaleString()}</p>
                  <p className="text-xs text-green-300 mt-1">Monthly total</p>
                </div>
                <div className="bg-gradient-to-br from-blue-600/10 to-blue-700/10 border border-blue-500/30 rounded-lg p-4">
                  <p className="text-sm text-blue-200 mb-1">Average Salary</p>
                  <p className="text-2xl font-bold text-white">${Math.round(stats.totalPayroll / stats.totalEmployees).toLocaleString()}</p>
                  <p className="text-xs text-blue-300 mt-1">Per employee</p>
                </div>
                <div className="bg-gradient-to-br from-purple-600/10 to-purple-700/10 border border-purple-500/30 rounded-lg p-4">
                  <p className="text-sm text-purple-200 mb-1">Tax Withholding</p>
                  <p className="text-2xl font-bold text-white">${Math.round(stats.totalPayroll * 0.20).toLocaleString()}</p>
                  <p className="text-xs text-purple-300 mt-1">Estimated</p>
                </div>
                <div className="bg-gradient-to-br from-yellow-600/10 to-yellow-700/10 border border-yellow-500/30 rounded-lg p-4">
                  <p className="text-sm text-yellow-200 mb-1">Benefits Cost</p>
                  <p className="text-2xl font-bold text-white">${Math.round(stats.totalPayroll * 0.15).toLocaleString()}</p>
                  <p className="text-xs text-yellow-300 mt-1">Monthly benefits</p>
                </div>
              </div>

              {/* Payroll Schedule */}
              <div>
                <h4 className="font-semibold mb-4">Upcoming Payroll Schedule</h4>
                <div className="space-y-2">
                  {[
                    { date: 'April 30, 2026', type: 'Bi-weekly', amount: 108500, status: 'upcoming' },
                    { date: 'April 15, 2026', type: 'Bi-weekly', amount: 108500, status: 'processed' },
                    { date: 'March 31, 2026', type: 'Bi-weekly', amount: 105000, status: 'processed' },
                  ].map((payroll, idx) => (
                    <div key={idx} className="flex items-center justify-between p-4 bg-[#0A0A0A] border border-zinc-800 rounded-lg">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          payroll.status === 'upcoming' ? 'bg-green-600/20' : 'bg-zinc-700/20'
                        }`}>
                          <DollarSign className={`w-5 h-5 ${
                            payroll.status === 'upcoming' ? 'text-green-400' : 'text-zinc-400'
                          }`} />
                        </div>
                        <div>
                          <p className="font-semibold text-white">{payroll.date}</p>
                          <p className="text-xs text-zinc-500">{payroll.type} Payroll</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-white">${payroll.amount.toLocaleString()}</p>
                        <span className={`text-xs ${
                          payroll.status === 'upcoming' ? 'text-green-400' : 'text-zinc-500'
                        }`}>
                          {payroll.status === 'upcoming' ? 'Pending' : 'Completed'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Payroll Actions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button
                onClick={() => toast.info('Viewing payroll reports...')}
                className="bg-gradient-to-br from-green-600/10 to-green-700/10 border border-green-500/30 rounded-lg p-6 hover:border-green-500/60 transition-all text-left group"
              >
                <BarChart3 className="w-8 h-8 text-green-400 mb-3 group-hover:scale-110 transition-transform" />
                <h4 className="font-bold text-lg text-white mb-2">Payroll Reports</h4>
                <p className="text-sm text-zinc-400">View detailed payroll analytics and reports</p>
              </button>

              <button
                onClick={() => toast.info('Managing tax settings...')}
                className="bg-gradient-to-br from-blue-600/10 to-blue-700/10 border border-blue-500/30 rounded-lg p-6 hover:border-blue-500/60 transition-all text-left group"
              >
                <Shield className="w-8 h-8 text-blue-400 mb-3 group-hover:scale-110 transition-transform" />
                <h4 className="font-bold text-lg text-white mb-2">Tax Management</h4>
                <p className="text-sm text-zinc-400">Configure tax withholding and reporting</p>
              </button>

              <button
                onClick={() => toast.info('Exporting payroll data...')}
                className="bg-gradient-to-br from-purple-600/10 to-purple-700/10 border border-purple-500/30 rounded-lg p-6 hover:border-purple-500/60 transition-all text-left group"
              >
                <Download className="w-8 h-8 text-purple-400 mb-3 group-hover:scale-110 transition-transform" />
                <h4 className="font-bold text-lg text-white mb-2">Export Data</h4>
                <p className="text-sm text-zinc-400">Download payroll data for accounting</p>
              </button>
            </div>
          </div>
        )}

        {activeTab === 'performance' && (
          <div className="space-y-4">
            {/* Performance Reviews */}
            <div className="bg-[#1A1A1A] border border-zinc-800 rounded-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <Star className="w-6 h-6 text-yellow-500" />
                  <h3 className="text-xl font-bold">Performance Management</h3>
                </div>
                <button 
                  onClick={() => toast.info('Starting performance review...')}
                  className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg font-semibold flex items-center gap-2 transition-all"
                >
                  <Plus className="w-4 h-4" />
                  New Review
                </button>
              </div>

              {/* Performance Stats */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-gradient-to-br from-yellow-600/10 to-yellow-700/10 border border-yellow-500/30 rounded-lg p-4">
                  <p className="text-sm text-yellow-200 mb-1">Company Average</p>
                  <p className="text-2xl font-bold text-white">{stats.avgPerformance}/5.0</p>
                  <p className="text-xs text-yellow-300 mt-1">Performance rating</p>
                </div>
                <div className="bg-gradient-to-br from-green-600/10 to-green-700/10 border border-green-500/30 rounded-lg p-4">
                  <p className="text-sm text-green-200 mb-1">High Performers</p>
                  <p className="text-2xl font-bold text-white">
                    {mockEmployees.filter(e => e.performance >= 4.7).length}
                  </p>
                  <p className="text-xs text-green-300 mt-1">Rating ≥ 4.7</p>
                </div>
                <div className="bg-gradient-to-br from-blue-600/10 to-blue-700/10 border border-blue-500/30 rounded-lg p-4">
                  <p className="text-sm text-blue-200 mb-1">Reviews Completed</p>
                  <p className="text-2xl font-bold text-white">8</p>
                  <p className="text-xs text-blue-300 mt-1">This quarter</p>
                </div>
                <div className="bg-gradient-to-br from-purple-600/10 to-purple-700/10 border border-purple-500/30 rounded-lg p-4">
                  <p className="text-sm text-purple-200 mb-1">Pending Reviews</p>
                  <p className="text-2xl font-bold text-white">2</p>
                  <p className="text-xs text-purple-300 mt-1">Due this month</p>
                </div>
              </div>

              {/* Top Performers */}
              <div>
                <h4 className="font-semibold mb-4">Top Performers</h4>
                <div className="space-y-2">
                  {mockEmployees
                    .sort((a, b) => b.performance - a.performance)
                    .slice(0, 3)
                    .map((employee, idx) => (
                      <div key={employee.id} className="flex items-center justify-between p-4 bg-[#0A0A0A] border border-zinc-800 rounded-lg">
                        <div className="flex items-center gap-4">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-yellow-600 to-yellow-700 flex items-center justify-center text-white font-bold text-sm">
                            #{idx + 1}
                          </div>
                          <div>
                            <p className="font-semibold text-white">{employee.name}</p>
                            <p className="text-xs text-zinc-500">{employee.role}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                className={`w-4 h-4 ${
                                  i < Math.floor(employee.performance)
                                    ? 'text-yellow-400 fill-yellow-400'
                                    : 'text-zinc-700'
                                }`}
                              />
                            ))}
                          </div>
                          <span className="text-lg font-bold text-yellow-400">{employee.performance}</span>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>

            {/* Performance Actions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button
                onClick={() => toast.info('Opening goal management...')}
                className="bg-gradient-to-br from-yellow-600/10 to-yellow-700/10 border border-yellow-500/30 rounded-lg p-6 hover:border-yellow-500/60 transition-all text-left group"
              >
                <Target className="w-8 h-8 text-yellow-400 mb-3 group-hover:scale-110 transition-transform" />
                <h4 className="font-bold text-lg text-white mb-2">Goals & Objectives</h4>
                <p className="text-sm text-zinc-400">Set and track employee goals</p>
              </button>

              <button
                onClick={() => toast.info('Viewing performance analytics...')}
                className="bg-gradient-to-br from-blue-600/10 to-blue-700/10 border border-blue-500/30 rounded-lg p-6 hover:border-blue-500/60 transition-all text-left group"
              >
                <TrendingUp className="w-8 h-8 text-blue-400 mb-3 group-hover:scale-110 transition-transform" />
                <h4 className="font-bold text-lg text-white mb-2">Performance Analytics</h4>
                <p className="text-sm text-zinc-400">Detailed performance insights</p>
              </button>

              <button
                onClick={() => toast.info('Managing recognition program...')}
                className="bg-gradient-to-br from-purple-600/10 to-purple-700/10 border border-purple-500/30 rounded-lg p-6 hover:border-purple-500/60 transition-all text-left group"
              >
                <Award className="w-8 h-8 text-purple-400 mb-3 group-hover:scale-110 transition-transform" />
                <h4 className="font-bold text-lg text-white mb-2">Recognition & Awards</h4>
                <p className="text-sm text-zinc-400">Employee recognition programs</p>
              </button>
            </div>
          </div>
        )}

        {activeTab === 'onboarding' && (
          <div className="space-y-4">
            {/* Onboarding Management */}
            <div className="bg-[#1A1A1A] border border-zinc-800 rounded-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <UserPlus className="w-6 h-6 text-cyan-500" />
                  <h3 className="text-xl font-bold">Onboarding & Offboarding</h3>
                </div>
                <button 
                  onClick={() => toast.info('Starting new hire process...')}
                  className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg font-semibold flex items-center gap-2 transition-all"
                >
                  <Plus className="w-4 h-4" />
                  New Hire
                </button>
              </div>

              {/* Onboarding Stats */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-gradient-to-br from-cyan-600/10 to-cyan-700/10 border border-cyan-500/30 rounded-lg p-4">
                  <p className="text-sm text-cyan-200 mb-1">Active Onboarding</p>
                  <p className="text-2xl font-bold text-white">2</p>
                  <p className="text-xs text-cyan-300 mt-1">In progress</p>
                </div>
                <div className="bg-gradient-to-br from-green-600/10 to-green-700/10 border border-green-500/30 rounded-lg p-4">
                  <p className="text-sm text-green-200 mb-1">Completed (30d)</p>
                  <p className="text-2xl font-bold text-white">3</p>
                  <p className="text-xs text-green-300 mt-1">Successfully onboarded</p>
                </div>
                <div className="bg-gradient-to-br from-blue-600/10 to-blue-700/10 border border-blue-500/30 rounded-lg p-4">
                  <p className="text-sm text-blue-200 mb-1">Avg Onboarding Time</p>
                  <p className="text-2xl font-bold text-white">14 days</p>
                  <p className="text-xs text-blue-300 mt-1">To full productivity</p>
                </div>
                <div className="bg-gradient-to-br from-purple-600/10 to-purple-700/10 border border-purple-500/30 rounded-lg p-4">
                  <p className="text-sm text-purple-200 mb-1">Retention Rate</p>
                  <p className="text-2xl font-bold text-white">96%</p>
                  <p className="text-xs text-purple-300 mt-1">First 90 days</p>
                </div>
              </div>

              {/* Active Onboarding */}
              <div>
                <h4 className="font-semibold mb-4">Active Onboarding</h4>
                <div className="space-y-2">
                  {[
                    { name: 'Alex Turner', role: 'HVAC Technician', startDate: 'April 20, 2026', progress: 45, daysRemaining: 8 },
                    { name: 'Jordan Lee', role: 'Project Coordinator', startDate: 'April 18, 2026', progress: 60, daysRemaining: 6 },
                  ].map((hire, idx) => (
                    <div key={idx} className="p-4 bg-[#0A0A0A] border border-zinc-800 rounded-lg">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-600 to-cyan-700 flex items-center justify-center text-white font-bold text-sm">
                            {hire.name.split(' ').map(n => n[0]).join('')}
                          </div>
                          <div>
                            <p className="font-semibold text-white">{hire.name}</p>
                            <p className="text-xs text-zinc-500">{hire.role} • Started {hire.startDate}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-white">{hire.progress}% Complete</p>
                          <p className="text-xs text-zinc-500">{hire.daysRemaining} days remaining</p>
                        </div>
                      </div>
                      <div className="w-full bg-zinc-800 rounded-full h-2">
                        <div
                          className="bg-gradient-to-r from-cyan-500 to-cyan-600 h-2 rounded-full transition-all"
                          style={{ width: `${hire.progress}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Onboarding Actions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button
                onClick={() => toast.info('Managing onboarding checklist...')}
                className="bg-gradient-to-br from-cyan-600/10 to-cyan-700/10 border border-cyan-500/30 rounded-lg p-6 hover:border-cyan-500/60 transition-all text-left group"
              >
                <CheckCircle className="w-8 h-8 text-cyan-400 mb-3 group-hover:scale-110 transition-transform" />
                <h4 className="font-bold text-lg text-white mb-2">Onboarding Checklist</h4>
                <p className="text-sm text-zinc-400">Manage onboarding tasks and milestones</p>
              </button>

              <button
                onClick={() => toast.info('Viewing new hire documents...')}
                className="bg-gradient-to-br from-blue-600/10 to-blue-700/10 border border-blue-500/30 rounded-lg p-6 hover:border-blue-500/60 transition-all text-left group"
              >
                <FileCheck className="w-8 h-8 text-blue-400 mb-3 group-hover:scale-110 transition-transform" />
                <h4 className="font-bold text-lg text-white mb-2">New Hire Documents</h4>
                <p className="text-sm text-zinc-400">Employment paperwork and forms</p>
              </button>

              <button
                onClick={() => toast.info('Scheduling orientation...')}
                className="bg-gradient-to-br from-purple-600/10 to-purple-700/10 border border-purple-500/30 rounded-lg p-6 hover:border-purple-500/60 transition-all text-left group"
              >
                <Calendar className="w-8 h-8 text-purple-400 mb-3 group-hover:scale-110 transition-transform" />
                <h4 className="font-bold text-lg text-white mb-2">Orientation Schedule</h4>
                <p className="text-sm text-zinc-400">Plan and track orientation sessions</p>
              </button>
            </div>
          </div>
        )}

        {activeTab === 'benefits' && (
          <div className="space-y-4">
            {/* Benefits Administration */}
            <div className="bg-[#1A1A1A] border border-zinc-800 rounded-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <Heart className="w-6 h-6 text-pink-500" />
                  <h3 className="text-xl font-bold">Benefits Administration</h3>
                </div>
                <button 
                  onClick={() => toast.info('Managing benefit plans...')}
                  className="px-4 py-2 bg-pink-600 hover:bg-pink-700 text-white rounded-lg font-semibold flex items-center gap-2 transition-all"
                >
                  <Plus className="w-4 h-4" />
                  Add Benefit
                </button>
              </div>

              {/* Benefits Overview */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-gradient-to-br from-pink-600/10 to-pink-700/10 border border-pink-500/30 rounded-lg p-4">
                  <p className="text-sm text-pink-200 mb-1">Enrolled Employees</p>
                  <p className="text-2xl font-bold text-white">{stats.activeEmployees}</p>
                  <p className="text-xs text-pink-300 mt-1">In benefit programs</p>
                </div>
                <div className="bg-gradient-to-br from-blue-600/10 to-blue-700/10 border border-blue-500/30 rounded-lg p-4">
                  <p className="text-sm text-blue-200 mb-1">Monthly Cost</p>
                  <p className="text-2xl font-bold text-white">${Math.round(stats.totalPayroll * 0.15).toLocaleString()}</p>
                  <p className="text-xs text-blue-300 mt-1">Company contribution</p>
                </div>
                <div className="bg-gradient-to-br from-green-600/10 to-green-700/10 border border-green-500/30 rounded-lg p-4">
                  <p className="text-sm text-green-200 mb-1">Health Plans</p>
                  <p className="text-2xl font-bold text-white">3</p>
                  <p className="text-xs text-green-300 mt-1">Available options</p>
                </div>
                <div className="bg-gradient-to-br from-purple-600/10 to-purple-700/10 border border-purple-500/30 rounded-lg p-4">
                  <p className="text-sm text-purple-200 mb-1">Participation Rate</p>
                  <p className="text-2xl font-bold text-white">92%</p>
                  <p className="text-xs text-purple-300 mt-1">Overall enrollment</p>
                </div>
              </div>

              {/* Available Benefits */}
              <div>
                <h4 className="font-semibold mb-4">Available Benefits</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {[
                    { name: 'Health Insurance', enrolled: 45, type: 'Medical', cost: '$450/mo' },
                    { name: 'Dental Insurance', enrolled: 38, type: 'Dental', cost: '$35/mo' },
                    { name: 'Vision Insurance', enrolled: 32, type: 'Vision', cost: '$12/mo' },
                    { name: '401(k) Retirement', enrolled: 42, type: 'Retirement', cost: '3% match' },
                    { name: 'Life Insurance', enrolled: 48, type: 'Insurance', cost: '$25/mo' },
                    { name: 'PTO Package', enrolled: 50, type: 'Time Off', cost: '15 days/year' },
                  ].map((benefit, idx) => (
                    <div key={idx} className="p-4 bg-[#0A0A0A] border border-zinc-800 rounded-lg hover:border-pink-500/30 transition-all">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-semibold text-white">{benefit.name}</p>
                          <p className="text-xs text-zinc-500">{benefit.type}</p>
                        </div>
                        <span className="text-sm font-semibold text-pink-400">{benefit.cost}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-zinc-400">
                        <span>{benefit.enrolled} employees enrolled</span>
                        <span>{Math.round((benefit.enrolled / stats.totalEmployees) * 100)}% participation</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Benefits Actions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button
                onClick={() => toast.info('Managing enrollment...')}
                className="bg-gradient-to-br from-pink-600/10 to-pink-700/10 border border-pink-500/30 rounded-lg p-6 hover:border-pink-500/60 transition-all text-left group"
              >
                <UserPlus className="w-8 h-8 text-pink-400 mb-3 group-hover:scale-110 transition-transform" />
                <h4 className="font-bold text-lg text-white mb-2">Enrollment Management</h4>
                <p className="text-sm text-zinc-400">Handle benefit enrollments and changes</p>
              </button>

              <button
                onClick={() => toast.info('Viewing benefits analytics...')}
                className="bg-gradient-to-br from-blue-600/10 to-blue-700/10 border border-blue-500/30 rounded-lg p-6 hover:border-blue-500/60 transition-all text-left group"
              >
                <BarChart3 className="w-8 h-8 text-blue-400 mb-3 group-hover:scale-110 transition-transform" />
                <h4 className="font-bold text-lg text-white mb-2">Benefits Analytics</h4>
                <p className="text-sm text-zinc-400">Track costs and utilization metrics</p>
              </button>

              <button
                onClick={() => toast.info('Managing open enrollment...')}
                className="bg-gradient-to-br from-purple-600/10 to-purple-700/10 border border-purple-500/30 rounded-lg p-6 hover:border-purple-500/60 transition-all text-left group"
              >
                <Calendar className="w-8 h-8 text-purple-400 mb-3 group-hover:scale-110 transition-transform" />
                <h4 className="font-bold text-lg text-white mb-2">Open Enrollment</h4>
                <p className="text-sm text-zinc-400">Plan and run annual enrollment periods</p>
              </button>
            </div>
          </div>
        )}

        {activeTab === 'training' && (
          <div className="space-y-4">
            {/* Training & Development */}
            <div className="bg-[#1A1A1A] border border-zinc-800 rounded-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <GraduationCap className="w-6 h-6 text-indigo-500" />
                  <h3 className="text-xl font-bold">Training & Development</h3>
                </div>
                <button 
                  onClick={() => toast.info('Creating new training program...')}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold flex items-center gap-2 transition-all"
                >
                  <Plus className="w-4 h-4" />
                  New Training
                </button>
              </div>

              {/* Training Stats */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-gradient-to-br from-indigo-600/10 to-indigo-700/10 border border-indigo-500/30 rounded-lg p-4">
                  <p className="text-sm text-indigo-200 mb-1">Active Programs</p>
                  <p className="text-2xl font-bold text-white">12</p>
                  <p className="text-xs text-indigo-300 mt-1">Training courses</p>
                </div>
                <div className="bg-gradient-to-br from-green-600/10 to-green-700/10 border border-green-500/30 rounded-lg p-4">
                  <p className="text-sm text-green-200 mb-1">Completion Rate</p>
                  <p className="text-2xl font-bold text-white">87%</p>
                  <p className="text-xs text-green-300 mt-1">On-time completion</p>
                </div>
                <div className="bg-gradient-to-br from-blue-600/10 to-blue-700/10 border border-blue-500/30 rounded-lg p-4">
                  <p className="text-sm text-blue-200 mb-1">Avg Training Hours</p>
                  <p className="text-2xl font-bold text-white">24</p>
                  <p className="text-xs text-blue-300 mt-1">Per employee/year</p>
                </div>
                <div className="bg-gradient-to-br from-purple-600/10 to-purple-700/10 border border-purple-500/30 rounded-lg p-4">
                  <p className="text-sm text-purple-200 mb-1">Certifications</p>
                  <p className="text-2xl font-bold text-white">38</p>
                  <p className="text-xs text-purple-300 mt-1">Active certifications</p>
                </div>
              </div>

              {/* Training Programs */}
              <div>
                <h4 className="font-semibold mb-4">Active Training Programs</h4>
                <div className="space-y-2">
                  {[
                    { name: 'OSHA Safety Training', enrolled: 45, completed: 38, deadline: 'May 15, 2026' },
                    { name: 'Project Management Fundamentals', enrolled: 12, completed: 8, deadline: 'June 1, 2026' },
                    { name: 'Electrical Code Updates 2026', enrolled: 8, completed: 5, deadline: 'May 30, 2026' },
                    { name: 'Customer Service Excellence', enrolled: 30, completed: 22, deadline: 'April 30, 2026' },
                  ].map((program, idx) => (
                    <div key={idx} className="p-4 bg-[#0A0A0A] border border-zinc-800 rounded-lg">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <p className="font-semibold text-white">{program.name}</p>
                          <p className="text-xs text-zinc-500">Due: {program.deadline}</p>
                        </div>
                        <span className="text-sm font-semibold text-indigo-400">
                          {program.completed}/{program.enrolled} completed
                        </span>
                      </div>
                      <div className="w-full bg-zinc-800 rounded-full h-2">
                        <div
                          className="bg-gradient-to-r from-indigo-500 to-indigo-600 h-2 rounded-full transition-all"
                          style={{ width: `${(program.completed / program.enrolled) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Training Actions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button
                onClick={() => toast.info('Managing course library...')}
                className="bg-gradient-to-br from-indigo-600/10 to-indigo-700/10 border border-indigo-500/30 rounded-lg p-6 hover:border-indigo-500/60 transition-all text-left group"
              >
                <GraduationCap className="w-8 h-8 text-indigo-400 mb-3 group-hover:scale-110 transition-transform" />
                <h4 className="font-bold text-lg text-white mb-2">Course Library</h4>
                <p className="text-sm text-zinc-400">Browse and assign training courses</p>
              </button>

              <button
                onClick={() => toast.info('Tracking certifications...')}
                className="bg-gradient-to-br from-blue-600/10 to-blue-700/10 border border-blue-500/30 rounded-lg p-6 hover:border-blue-500/60 transition-all text-left group"
              >
                <Award className="w-8 h-8 text-blue-400 mb-3 group-hover:scale-110 transition-transform" />
                <h4 className="font-bold text-lg text-white mb-2">Certifications</h4>
                <p className="text-sm text-zinc-400">Track licenses and certifications</p>
              </button>

              <button
                onClick={() => toast.info('Viewing training analytics...')}
                className="bg-gradient-to-br from-purple-600/10 to-purple-700/10 border border-purple-500/30 rounded-lg p-6 hover:border-purple-500/60 transition-all text-left group"
              >
                <BarChart3 className="w-8 h-8 text-purple-400 mb-3 group-hover:scale-110 transition-transform" />
                <h4 className="font-bold text-lg text-white mb-2">Training Analytics</h4>
                <p className="text-sm text-zinc-400">View completion rates and effectiveness</p>
              </button>
            </div>
          </div>
        )}

        {activeTab === 'compliance' && (
          <div className="space-y-4">
            {/* Compliance Management */}
            <div className="bg-[#1A1A1A] border border-zinc-800 rounded-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <FileCheck className="w-6 h-6 text-red-500" />
                  <h3 className="text-xl font-bold">Compliance & Documents</h3>
                </div>
                <button 
                  onClick={() => toast.info('Uploading compliance document...')}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold flex items-center gap-2 transition-all"
                >
                  <Plus className="w-4 h-4" />
                  Add Document
                </button>
              </div>

              {/* Compliance Stats */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-gradient-to-br from-green-600/10 to-green-700/10 border border-green-500/30 rounded-lg p-4">
                  <p className="text-sm text-green-200 mb-1">Compliance Rate</p>
                  <p className="text-2xl font-bold text-white">98%</p>
                  <p className="text-xs text-green-300 mt-1">All employees</p>
                </div>
                <div className="bg-gradient-to-br from-red-600/10 to-red-700/10 border border-red-500/30 rounded-lg p-4">
                  <p className="text-sm text-red-200 mb-1">Expiring Soon</p>
                  <p className="text-2xl font-bold text-white">5</p>
                  <p className="text-xs text-red-300 mt-1">Within 30 days</p>
                </div>
                <div className="bg-gradient-to-br from-blue-600/10 to-blue-700/10 border border-blue-500/30 rounded-lg p-4">
                  <p className="text-sm text-blue-200 mb-1">Active Documents</p>
                  <p className="text-2xl font-bold text-white">156</p>
                  <p className="text-xs text-blue-300 mt-1">Total documents</p>
                </div>
                <div className="bg-gradient-to-br from-purple-600/10 to-purple-700/10 border border-purple-500/30 rounded-lg p-4">
                  <p className="text-sm text-purple-200 mb-1">Audits Passed</p>
                  <p className="text-2xl font-bold text-white">12/12</p>
                  <p className="text-xs text-purple-300 mt-1">This year</p>
                </div>
              </div>

              {/* Compliance Items Needing Attention */}
              <div>
                <h4 className="font-semibold mb-4 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-yellow-400" />
                  Items Needing Attention
                </h4>
                <div className="space-y-2">
                  {[
                    { item: 'I-9 Form Verification', employee: 'Alex Turner', expires: 'April 25, 2026', priority: 'high' },
                    { item: 'Safety Training Certificate', employee: 'Jordan Lee', expires: 'April 28, 2026', priority: 'medium' },
                    { item: 'Background Check Renewal', employee: 'Michael Chen', expires: 'May 5, 2026', priority: 'medium' },
                  ].map((item, idx) => (
                    <div key={idx} className={`p-4 bg-[#0A0A0A] border rounded-lg ${
                      item.priority === 'high' ? 'border-red-500/30' : 'border-yellow-500/30'
                    }`}>
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <p className="font-semibold text-white">{item.item}</p>
                          <p className="text-xs text-zinc-500">{item.employee}</p>
                        </div>
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${
                          item.priority === 'high' ? 'bg-red-600/20 text-red-400' : 'bg-yellow-600/20 text-yellow-400'
                        }`}>
                          {item.priority.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-400">Expires: {item.expires}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Compliance Actions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button
                onClick={() => toast.info('Managing document library...')}
                className="bg-gradient-to-br from-red-600/10 to-red-700/10 border border-red-500/30 rounded-lg p-6 hover:border-red-500/60 transition-all text-left group"
              >
                <FileCheck className="w-8 h-8 text-red-400 mb-3 group-hover:scale-110 transition-transform" />
                <h4 className="font-bold text-lg text-white mb-2">Document Library</h4>
                <p className="text-sm text-zinc-400">Manage compliance documents and records</p>
              </button>

              <button
                onClick={() => toast.info('Scheduling audit...')}
                className="bg-gradient-to-br from-blue-600/10 to-blue-700/10 border border-blue-500/30 rounded-lg p-6 hover:border-blue-500/60 transition-all text-left group"
              >
                <Shield className="w-8 h-8 text-blue-400 mb-3 group-hover:scale-110 transition-transform" />
                <h4 className="font-bold text-lg text-white mb-2">Audit Management</h4>
                <p className="text-sm text-zinc-400">Schedule and track compliance audits</p>
              </button>

              <button
                onClick={() => toast.info('Setting up compliance alerts...')}
                className="bg-gradient-to-br from-purple-600/10 to-purple-700/10 border border-purple-500/30 rounded-lg p-6 hover:border-purple-500/60 transition-all text-left group"
              >
                <AlertTriangle className="w-8 h-8 text-purple-400 mb-3 group-hover:scale-110 transition-transform" />
                <h4 className="font-bold text-lg text-white mb-2">Compliance Alerts</h4>
                <p className="text-sm text-zinc-400">Configure expiration and renewal alerts</p>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
