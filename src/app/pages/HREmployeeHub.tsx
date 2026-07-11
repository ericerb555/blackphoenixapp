/**
 * HR & Employee Hub - Comprehensive Human Resources Management
 */

import { useState, useEffect } from 'react';
import {
  Users, Clock, DollarSign, Star, UserPlus, Heart, GraduationCap, FileCheck,
  Search, Plus, Download, Filter, Eye, Edit2, TrendingUp, BarChart3,
  Mail, Phone, MapPin, Calendar, CheckCircle, AlertTriangle, Award,
  Briefcase, Target, Shield, Activity, Building2, ArrowLeft, X, Save
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
}

const DEFAULT_EMPLOYEES: Employee[] = [
  { id: 'EMP-001', name: 'Michael Chen', role: 'Senior Project Manager', department: 'Operations', status: 'active', hireDate: '2024-03-15', email: 'michael.chen@company.com', phone: '(555) 123-4567', salary: 85000, performance: 4.8 },
  { id: 'EMP-002', name: 'Sarah Williams', role: 'Lead Carpenter', department: 'Field Operations', status: 'active', hireDate: '2023-08-22', email: 'sarah.williams@company.com', phone: '(555) 234-5678', salary: 62000, performance: 4.9 },
  { id: 'EMP-003', name: 'David Martinez', role: 'Electrician', department: 'Field Operations', status: 'active', hireDate: '2025-01-10', email: 'david.martinez@company.com', phone: '(555) 345-6789', salary: 58000, performance: 4.6 },
  { id: 'EMP-004', name: 'Emily Johnson', role: 'HR Coordinator', department: 'Human Resources', status: 'on-leave', hireDate: '2024-06-01', email: 'emily.johnson@company.com', phone: '(555) 456-7890', salary: 55000, performance: 4.7 },
  { id: 'EMP-005', name: 'James Wilson', role: 'Plumber', department: 'Field Operations', status: 'active', hireDate: '2024-11-05', email: 'james.wilson@company.com', phone: '(555) 567-8901', salary: 56000, performance: 4.5 },
];

const BLANK_FORM = { name: '', role: '', department: 'Field Operations', status: 'active' as Employee['status'], hireDate: new Date().toISOString().split('T')[0], email: '', phone: '', salary: '', performance: '4.5' };

function exportCSV(filename: string, headers: string[], rows: string[][]) {
  const csv = [headers.join(','), ...rows.map(r => r.map(v => `"${v}"`).join(','))].join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  a.download = filename;
  a.click();
}

export default function HREmployeeHub() {
  const [activeTab, setActiveTab] = useState<TabType>('directory');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [employees, setEmployees] = useState<Employee[]>(() => {
    try { return JSON.parse(localStorage.getItem('hr_employees') || 'null') || DEFAULT_EMPLOYEES; } catch { return DEFAULT_EMPLOYEES; }
  });

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [viewingEmployee, setViewingEmployee] = useState<Employee | null>(null);
  const [showPayrollConfirm, setShowPayrollConfirm] = useState(false);
  const [showLogTimeModal, setShowLogTimeModal] = useState(false);
  const [showAddDocModal, setShowAddDocModal] = useState(false);
  const [showNewReviewModal, setShowNewReviewModal] = useState(false);
  const [showNewHireModal, setShowNewHireModal] = useState(false);
  const [showNewTrainingModal, setShowNewTrainingModal] = useState(false);

  const [form, setForm] = useState(BLANK_FORM);
  const [logTimeForm, setLogTimeForm] = useState({ employeeId: '', date: new Date().toISOString().split('T')[0], hours: '', notes: '' });
  const [newDocForm, setNewDocForm] = useState({ title: '', type: 'Policy', expiry: '' });
  const [newReviewForm, setNewReviewForm] = useState({ employeeId: '', rating: '4', notes: '' });
  const [newHireForm, setNewHireForm] = useState({ name: '', role: '', startDate: '' });
  const [newTrainingForm, setNewTrainingForm] = useState({ title: '', deadline: '', enrolled: '' });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab') as TabType;
    if (tab) setActiveTab(tab);
  }, []);

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    const url = new URL(window.location.href);
    url.searchParams.set('tab', tab);
    window.history.pushState({}, '', url.toString());
  };

  const save = (updated: Employee[]) => {
    setEmployees(updated);
    localStorage.setItem('hr_employees', JSON.stringify(updated));
  };

  function addEmployee() {
    if (!form.name || !form.role || !form.email) { toast.error('Name, role, and email are required'); return; }
    const next: Employee = {
      id: `EMP-${String(employees.length + 1).padStart(3, '0')}`,
      name: form.name, role: form.role, department: form.department,
      status: form.status, hireDate: form.hireDate, email: form.email,
      phone: form.phone, salary: Number(form.salary) || 0, performance: Number(form.performance) || 4.5,
    };
    save([...employees, next]);
    setShowAddModal(false);
    setForm(BLANK_FORM);
    toast.success(`${next.name} added to employee directory`);
  }

  function updateEmployee() {
    if (!editingEmployee) return;
    const updated = employees.map(e => e.id === editingEmployee.id ? {
      ...editingEmployee, name: form.name, role: form.role, department: form.department,
      status: form.status, hireDate: form.hireDate, email: form.email,
      phone: form.phone, salary: Number(form.salary) || 0, performance: Number(form.performance) || 4.5,
    } : e);
    save(updated);
    setEditingEmployee(null);
    toast.success('Employee profile updated');
  }

  function openEdit(emp: Employee) {
    setForm({ name: emp.name, role: emp.role, department: emp.department, status: emp.status, hireDate: emp.hireDate, email: emp.email, phone: emp.phone, salary: String(emp.salary), performance: String(emp.performance) });
    setEditingEmployee(emp);
  }

  function exportEmployees() {
    exportCSV('employees.csv',
      ['ID', 'Name', 'Role', 'Department', 'Status', 'Hire Date', 'Email', 'Phone', 'Salary'],
      filteredEmployees.map(e => [e.id, e.name, e.role, e.department, e.status, e.hireDate, e.email, e.phone, String(e.salary)])
    );
    toast.success('Employee directory exported');
  }

  function exportPayroll() {
    exportCSV('payroll.csv',
      ['Employee', 'Role', 'Department', 'Annual Salary', 'Monthly', 'Est. Tax (20%)', 'Benefits (15%)'],
      employees.map(e => [e.name, e.role, e.department, String(e.salary), String(Math.round(e.salary / 12)), String(Math.round(e.salary / 12 * 0.2)), String(Math.round(e.salary / 12 * 0.15))])
    );
    toast.success('Payroll data exported to CSV');
  }

  function runPayroll() {
    setShowPayrollConfirm(false);
    toast.success(`Payroll processed — $${Math.round(stats.totalPayroll / 12).toLocaleString()} sent to ${employees.filter(e => e.status === 'active').length} employees`);
  }

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

  const departments = ['all', 'Operations', 'Field Operations', 'Human Resources', 'Sales', 'Finance'];

  const filteredEmployees = employees.filter(emp => {
    const matchesSearch = emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDepartment = selectedDepartment === 'all' || emp.department === selectedDepartment;
    return matchesSearch && matchesDepartment;
  });

  const stats = {
    totalEmployees: employees.length,
    activeEmployees: employees.filter(e => e.status === 'active').length,
    totalPayroll: employees.reduce((sum, e) => sum + e.salary, 0),
    avgPerformance: employees.length ? (employees.reduce((sum, e) => sum + e.performance, 0) / employees.length).toFixed(1) : '0',
  };

  const ModalWrapper = ({ title, onClose, children, onSave, saveLabel = 'Save' }: any) => (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-[#2A2A2A]">
          <h3 className="font-bold text-white">{title}</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-white"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-5 space-y-3">{children}</div>
        {onSave && (
          <div className="p-5 border-t border-[#2A2A2A] flex gap-2">
            <button onClick={onClose} className="flex-1 py-2 border border-[#2A2A2A] text-gray-400 rounded-lg text-sm hover:text-white transition">Cancel</button>
            <button onClick={onSave} className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-semibold transition flex items-center justify-center gap-1.5"><Save className="w-3.5 h-3.5" />{saveLabel}</button>
          </div>
        )}
      </div>
    </div>
  );

  const EmployeeForm = () => (
    <>
      {[['Name', 'name', 'text'], ['Role / Title', 'role', 'text'], ['Email', 'email', 'email'], ['Phone', 'phone', 'tel'], ['Salary (annual)', 'salary', 'number'], ['Performance (1–5)', 'performance', 'number'], ['Hire Date', 'hireDate', 'date']].map(([label, key, type]) => (
        <div key={key}>
          <label className="block text-xs text-gray-400 mb-1">{label}</label>
          <input type={type} value={(form as any)[key]} onChange={e => setForm(v => ({ ...v, [key]: e.target.value }))}
            className="w-full bg-[#111] border border-[#2A2A2A] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 transition" />
        </div>
      ))}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-gray-400 mb-1">Department</label>
          <select value={form.department} onChange={e => setForm(v => ({ ...v, department: e.target.value }))}
            className="w-full bg-[#111] border border-[#2A2A2A] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 transition">
            {['Operations', 'Field Operations', 'Human Resources', 'Sales', 'Finance'].map(d => <option key={d}>{d}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">Status</label>
          <select value={form.status} onChange={e => setForm(v => ({ ...v, status: e.target.value as Employee['status'] }))}
            className="w-full bg-[#111] border border-[#2A2A2A] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 transition">
            <option value="active">Active</option>
            <option value="on-leave">On Leave</option>
            <option value="terminated">Terminated</option>
          </select>
        </div>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      <PageHeader title="HR & Employee Hub" description="Comprehensive human resources and employee management" onBack={() => window.location.href = '/unified-dashboard'} />

      <div className="max-w-[1800px] mx-auto p-6 space-y-6">
        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-blue-600/20 to-blue-700/20 border border-blue-500/30 rounded-lg p-6">
            <div className="flex items-center justify-between mb-2"><p className="text-sm text-blue-200">Total Employees</p><Users className="w-5 h-5 text-blue-400" /></div>
            <p className="text-3xl font-bold text-white">{stats.totalEmployees}</p>
            <p className="text-sm text-blue-300 mt-1">{stats.activeEmployees} active</p>
          </div>
          <div className="bg-gradient-to-br from-green-600/20 to-green-700/20 border border-green-500/30 rounded-lg p-6">
            <div className="flex items-center justify-between mb-2"><p className="text-sm text-green-200">Annual Payroll</p><DollarSign className="w-5 h-5 text-green-400" /></div>
            <p className="text-3xl font-bold text-white">${(stats.totalPayroll / 1000).toFixed(0)}K</p>
            <p className="text-sm text-green-300 mt-1">${Math.round(stats.totalPayroll / 12).toLocaleString()}/mo</p>
          </div>
          <div className="bg-gradient-to-br from-yellow-600/20 to-yellow-700/20 border border-yellow-500/30 rounded-lg p-6">
            <div className="flex items-center justify-between mb-2"><p className="text-sm text-yellow-200">Avg Performance</p><Star className="w-5 h-5 text-yellow-400" /></div>
            <p className="text-3xl font-bold text-white">{stats.avgPerformance}</p>
            <p className="text-sm text-yellow-300 mt-1">Out of 5.0</p>
          </div>
          <div className="bg-gradient-to-br from-purple-600/20 to-purple-700/20 border border-purple-500/30 rounded-lg p-6">
            <div className="flex items-center justify-between mb-2"><p className="text-sm text-purple-200">Departments</p><Building2 className="w-5 h-5 text-purple-400" /></div>
            <p className="text-3xl font-bold text-white">{new Set(employees.map(e => e.department)).size}</p>
            <p className="text-sm text-purple-300 mt-1">Active departments</p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex flex-wrap gap-2">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button key={tab.id} onClick={() => handleTabChange(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-semibold text-sm transition-all ${activeTab === tab.id ? `bg-${tab.color}-600/20 text-${tab.color}-400 border border-${tab.color}-500/30` : 'bg-[#1A1A1A] text-zinc-400 border border-zinc-800 hover:border-zinc-600'}`}>
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Directory Tab */}
        {activeTab === 'directory' && (
          <div className="space-y-4">
            <div className="bg-[#1A1A1A] border border-zinc-800 rounded-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3"><Users className="w-6 h-6 text-blue-500" /><h3 className="text-xl font-bold">Employee Directory</h3></div>
                <button onClick={() => { setForm(BLANK_FORM); setShowAddModal(true); }}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold flex items-center gap-2 transition-all">
                  <Plus className="w-4 h-4" /> Add Employee
                </button>
              </div>
              <div className="flex flex-wrap items-center gap-4 mb-6">
                <div className="flex-1 min-w-[280px] relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                  <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-[#0A0A0A] border border-zinc-800 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500 transition-colors"
                    placeholder="Search employees..." />
                </div>
                <select value={selectedDepartment} onChange={e => setSelectedDepartment(e.target.value)}
                  className="px-4 py-3 bg-[#0A0A0A] border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-blue-500 transition-colors">
                  {departments.map(d => <option key={d} value={d}>{d === 'all' ? 'All Departments' : d}</option>)}
                </select>
                <button onClick={exportEmployees}
                  className="px-4 py-3 bg-[#2A2A2A] hover:bg-[#3A3A3A] border border-zinc-800 text-white rounded-lg font-semibold flex items-center gap-2 transition-all">
                  <Download className="w-4 h-4" /> Export CSV
                </button>
              </div>
              <div className="space-y-3">
                {filteredEmployees.length === 0 && <p className="text-center text-zinc-500 py-8">No employees found</p>}
                {filteredEmployees.map(employee => (
                  <div key={employee.id} className="bg-[#0A0A0A] border border-zinc-800 rounded-lg p-5 hover:border-blue-500/30 transition-all group">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4 flex-1">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center text-white font-bold text-lg">
                          {employee.name.split(' ').map(n => n[0]).join('')}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h4 className="text-lg font-bold text-white">{employee.name}</h4>
                            <span className="text-sm text-zinc-500">{employee.id}</span>
                            <span className={`px-2 py-0.5 rounded text-sm font-semibold ${employee.status === 'active' ? 'bg-green-600/20 text-green-400' : employee.status === 'on-leave' ? 'bg-yellow-600/20 text-yellow-400' : 'bg-gray-600/20 text-gray-400'}`}>
                              {employee.status.toUpperCase()}
                            </span>
                          </div>
                          <p className="text-sm text-zinc-400 mb-3">{employee.role} • {employee.department}</p>
                          <div className="flex flex-wrap items-center gap-4 text-sm text-zinc-500">
                            <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{employee.email}</span>
                            <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{employee.phone}</span>
                            <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />Hired {employee.hireDate}</span>
                            <span className="flex items-center gap-1"><Star className="w-3 h-3 text-yellow-400" />{employee.performance}/5.0</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => setViewingEmployee(employee)}
                          className="p-2 bg-[#1A1A1A] hover:bg-[#2A2A2A] border border-zinc-800 text-white rounded-lg transition-all" title="View profile">
                          <Eye className="w-4 h-4" />
                        </button>
                        <button onClick={() => openEdit(employee)}
                          className="p-2 bg-[#1A1A1A] hover:bg-[#2A2A2A] border border-zinc-800 text-white rounded-lg transition-all" title="Edit profile">
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

        {/* Time Tracking Tab */}
        {activeTab === 'time-tracking' && (
          <div className="space-y-4">
            <div className="bg-[#1A1A1A] border border-zinc-800 rounded-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3"><Clock className="w-6 h-6 text-purple-500" /><h3 className="text-xl font-bold">Time & Attendance Tracking</h3></div>
                <button onClick={() => setShowLogTimeModal(true)}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold flex items-center gap-2 transition-all">
                  <Plus className="w-4 h-4" /> Log Time
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                {[['Total Hours (Week)', '187.5', 'Across all employees', 'purple'], ['On Time', '94%', 'Attendance rate', 'green'], ['Overtime Hours', '12.5', 'This week', 'yellow'], ['Late Check-ins', '3', 'Needs attention', 'red']].map(([label, val, sub, color]) => (
                  <div key={label} className={`bg-gradient-to-br from-${color}-600/10 to-${color}-700/10 border border-${color}-500/30 rounded-lg p-4`}>
                    <p className={`text-sm text-${color}-200 mb-1`}>{label}</p>
                    <p className="text-2xl font-bold text-white">{val}</p>
                    <p className={`text-sm text-${color}-300 mt-1`}>{sub}</p>
                  </div>
                ))}
              </div>
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
                          <p className="text-sm text-zinc-500">{entry.checkIn} - {entry.checkOut}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-white">{entry.hours > 0 ? `${entry.hours} hrs` : 'In Progress'}</p>
                        <span className={`text-sm ${entry.status === 'complete' ? 'text-green-400' : entry.status === 'active' ? 'text-blue-400' : 'text-red-400'}`}>
                          {entry.status === 'complete' ? 'Completed' : entry.status === 'active' ? 'Active' : 'Late Check-in'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { icon: BarChart3, color: 'purple', title: 'Timesheet Reports', desc: 'View detailed time and attendance reports', action: () => { exportCSV('timesheets.csv', ['Employee', 'Week', 'Regular Hrs', 'Overtime Hrs'], employees.map(e => [e.name, 'Current Week', '40', '2'])); toast.success('Timesheet report exported'); } },
                { icon: Calendar, color: 'blue', title: 'PTO Requests', desc: 'Manage time-off requests and approvals', action: () => toast.success('3 pending PTO requests — click each entry to approve or deny') },
                { icon: CheckCircle, color: 'green', title: 'Attendance History', desc: 'Review historical attendance records', action: () => { exportCSV('attendance.csv', ['Employee', 'Date', 'Check In', 'Check Out', 'Hours'], employees.map(e => [e.name, new Date().toLocaleDateString(), '08:00', '17:00', '8'])); toast.success('Attendance history exported'); } },
              ].map(({ icon: Icon, color, title, desc, action }) => (
                <button key={title} onClick={action}
                  className={`bg-gradient-to-br from-${color}-600/10 to-${color}-700/10 border border-${color}-500/30 rounded-lg p-6 hover:border-${color}-500/60 transition-all text-left group`}>
                  <Icon className={`w-8 h-8 text-${color}-400 mb-3 group-hover:scale-110 transition-transform`} />
                  <h4 className="font-bold text-lg text-white mb-2">{title}</h4>
                  <p className="text-sm text-zinc-400">{desc}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Payroll Tab */}
        {activeTab === 'payroll' && (
          <div className="space-y-4">
            <div className="bg-[#1A1A1A] border border-zinc-800 rounded-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3"><DollarSign className="w-6 h-6 text-green-500" /><h3 className="text-xl font-bold">Payroll Management</h3></div>
                <button onClick={() => setShowPayrollConfirm(true)}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold flex items-center gap-2 transition-all">
                  <DollarSign className="w-4 h-4" /> Run Payroll
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-gradient-to-br from-green-600/10 to-green-700/10 border border-green-500/30 rounded-lg p-4">
                  <p className="text-sm text-green-200 mb-1">Total Annual Payroll</p>
                  <p className="text-2xl font-bold text-white">${stats.totalPayroll.toLocaleString()}</p>
                  <p className="text-sm text-green-300 mt-1">${Math.round(stats.totalPayroll / 12).toLocaleString()}/month</p>
                </div>
                <div className="bg-gradient-to-br from-blue-600/10 to-blue-700/10 border border-blue-500/30 rounded-lg p-4">
                  <p className="text-sm text-blue-200 mb-1">Average Salary</p>
                  <p className="text-2xl font-bold text-white">${employees.length ? Math.round(stats.totalPayroll / employees.length).toLocaleString() : 0}</p>
                  <p className="text-sm text-blue-300 mt-1">Per employee</p>
                </div>
                <div className="bg-gradient-to-br from-purple-600/10 to-purple-700/10 border border-purple-500/30 rounded-lg p-4">
                  <p className="text-sm text-purple-200 mb-1">Tax Withholding</p>
                  <p className="text-2xl font-bold text-white">${Math.round(stats.totalPayroll / 12 * 0.20).toLocaleString()}</p>
                  <p className="text-sm text-purple-300 mt-1">Est. monthly</p>
                </div>
                <div className="bg-gradient-to-br from-yellow-600/10 to-yellow-700/10 border border-yellow-500/30 rounded-lg p-4">
                  <p className="text-sm text-yellow-200 mb-1">Benefits Cost</p>
                  <p className="text-2xl font-bold text-white">${Math.round(stats.totalPayroll / 12 * 0.15).toLocaleString()}</p>
                  <p className="text-sm text-yellow-300 mt-1">Monthly benefits</p>
                </div>
              </div>
              <div>
                <h4 className="font-semibold mb-4">Employee Compensation</h4>
                <div className="space-y-2">
                  {employees.filter(e => e.status !== 'terminated').map(e => (
                    <div key={e.id} className="flex items-center justify-between p-4 bg-[#0A0A0A] border border-zinc-800 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-green-600 to-green-700 flex items-center justify-center text-white font-bold text-xs">
                          {e.name.split(' ').map(n => n[0]).join('')}
                        </div>
                        <div>
                          <p className="font-semibold text-white text-sm">{e.name}</p>
                          <p className="text-xs text-zinc-500">{e.role}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-white">${e.salary.toLocaleString()}/yr</p>
                        <p className="text-xs text-zinc-500">${Math.round(e.salary / 12).toLocaleString()}/mo</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { icon: BarChart3, color: 'green', title: 'Payroll Reports', desc: 'View detailed payroll analytics', action: () => toast.success('Payroll analytics: Total YTD $' + stats.totalPayroll.toLocaleString()) },
                { icon: Shield, color: 'blue', title: 'Tax Management', desc: 'Configure tax withholding and reporting', action: () => toast.success('NH has no state income tax. Federal withholding: 22% bracket for most employees.') },
                { icon: Download, color: 'purple', title: 'Export Data', desc: 'Download payroll data for accounting', action: exportPayroll },
              ].map(({ icon: Icon, color, title, desc, action }) => (
                <button key={title} onClick={action}
                  className={`bg-gradient-to-br from-${color}-600/10 to-${color}-700/10 border border-${color}-500/30 rounded-lg p-6 hover:border-${color}-500/60 transition-all text-left group`}>
                  <Icon className={`w-8 h-8 text-${color}-400 mb-3 group-hover:scale-110 transition-transform`} />
                  <h4 className="font-bold text-lg text-white mb-2">{title}</h4>
                  <p className="text-sm text-zinc-400">{desc}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Performance Tab */}
        {activeTab === 'performance' && (
          <div className="space-y-4">
            <div className="bg-[#1A1A1A] border border-zinc-800 rounded-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3"><Star className="w-6 h-6 text-yellow-500" /><h3 className="text-xl font-bold">Performance Management</h3></div>
                <button onClick={() => setShowNewReviewModal(true)}
                  className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg font-semibold flex items-center gap-2 transition-all">
                  <Plus className="w-4 h-4" /> New Review
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-gradient-to-br from-yellow-600/10 to-yellow-700/10 border border-yellow-500/30 rounded-lg p-4">
                  <p className="text-sm text-yellow-200 mb-1">Company Average</p>
                  <p className="text-2xl font-bold text-white">{stats.avgPerformance}/5.0</p>
                </div>
                <div className="bg-gradient-to-br from-green-600/10 to-green-700/10 border border-green-500/30 rounded-lg p-4">
                  <p className="text-sm text-green-200 mb-1">High Performers</p>
                  <p className="text-2xl font-bold text-white">{employees.filter(e => e.performance >= 4.7).length}</p>
                  <p className="text-sm text-green-300 mt-1">Rating ≥ 4.7</p>
                </div>
                <div className="bg-gradient-to-br from-blue-600/10 to-blue-700/10 border border-blue-500/30 rounded-lg p-4">
                  <p className="text-sm text-blue-200 mb-1">Reviews Completed</p>
                  <p className="text-2xl font-bold text-white">8</p>
                  <p className="text-sm text-blue-300 mt-1">This quarter</p>
                </div>
                <div className="bg-gradient-to-br from-purple-600/10 to-purple-700/10 border border-purple-500/30 rounded-lg p-4">
                  <p className="text-sm text-purple-200 mb-1">Pending Reviews</p>
                  <p className="text-2xl font-bold text-white">2</p>
                  <p className="text-sm text-purple-300 mt-1">Due this month</p>
                </div>
              </div>
              <div>
                <h4 className="font-semibold mb-4">All Employees — Performance Ratings</h4>
                <div className="space-y-2">
                  {[...employees].sort((a, b) => b.performance - a.performance).map((employee, idx) => (
                    <div key={employee.id} className="flex items-center justify-between p-4 bg-[#0A0A0A] border border-zinc-800 rounded-lg">
                      <div className="flex items-center gap-4">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-yellow-600 to-yellow-700 flex items-center justify-center text-white font-bold text-sm">#{idx + 1}</div>
                        <div>
                          <p className="font-semibold text-white">{employee.name}</p>
                          <p className="text-sm text-zinc-500">{employee.role}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1">
                          {[...Array(5)].map((_, i) => <Star key={i} className={`w-4 h-4 ${i < Math.floor(employee.performance) ? 'text-yellow-400 fill-yellow-400' : 'text-zinc-700'}`} />)}
                        </div>
                        <span className="text-lg font-bold text-yellow-400">{employee.performance}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { icon: Target, color: 'yellow', title: 'Goals & Objectives', desc: 'Set and track employee goals', action: () => toast.success('Goal tracking: 12 active goals across all employees. Top priority: OSHA certification by May 2026.') },
                { icon: TrendingUp, color: 'blue', title: 'Performance Analytics', desc: 'Detailed performance insights', action: () => { exportCSV('performance.csv', ['Employee', 'Rating', 'Department'], employees.map(e => [e.name, String(e.performance), e.department])); toast.success('Performance report exported'); } },
                { icon: Award, color: 'purple', title: 'Recognition & Awards', desc: 'Employee recognition programs', action: () => toast.success(`Top performer: ${employees.sort((a,b) => b.performance - a.performance)[0]?.name} with a ${employees.sort((a,b) => b.performance - a.performance)[0]?.performance}/5.0 rating`) },
              ].map(({ icon: Icon, color, title, desc, action }) => (
                <button key={title} onClick={action}
                  className={`bg-gradient-to-br from-${color}-600/10 to-${color}-700/10 border border-${color}-500/30 rounded-lg p-6 hover:border-${color}-500/60 transition-all text-left group`}>
                  <Icon className={`w-8 h-8 text-${color}-400 mb-3 group-hover:scale-110 transition-transform`} />
                  <h4 className="font-bold text-lg text-white mb-2">{title}</h4>
                  <p className="text-sm text-zinc-400">{desc}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Onboarding Tab */}
        {activeTab === 'onboarding' && (
          <div className="space-y-4">
            <div className="bg-[#1A1A1A] border border-zinc-800 rounded-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3"><UserPlus className="w-6 h-6 text-cyan-500" /><h3 className="text-xl font-bold">Onboarding & Offboarding</h3></div>
                <button onClick={() => setShowNewHireModal(true)}
                  className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg font-semibold flex items-center gap-2 transition-all">
                  <Plus className="w-4 h-4" /> New Hire
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                {[['Active Onboarding', '2', 'In progress', 'cyan'], ['Completed (30d)', '3', 'Successfully onboarded', 'green'], ['Avg Onboarding', '14 days', 'To full productivity', 'blue'], ['Retention Rate', '96%', 'First 90 days', 'purple']].map(([label, val, sub, color]) => (
                  <div key={label} className={`bg-gradient-to-br from-${color}-600/10 to-${color}-700/10 border border-${color}-500/30 rounded-lg p-4`}>
                    <p className={`text-sm text-${color}-200 mb-1`}>{label}</p>
                    <p className="text-2xl font-bold text-white">{val}</p>
                    <p className={`text-sm text-${color}-300 mt-1`}>{sub}</p>
                  </div>
                ))}
              </div>
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
                            <p className="text-sm text-zinc-500">{hire.role} • Started {hire.startDate}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-white">{hire.progress}% Complete</p>
                          <p className="text-sm text-zinc-500">{hire.daysRemaining} days remaining</p>
                        </div>
                      </div>
                      <div className="w-full bg-zinc-800 rounded-full h-2">
                        <div className="bg-gradient-to-r from-cyan-500 to-cyan-600 h-2 rounded-full transition-all" style={{ width: `${hire.progress}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { icon: CheckCircle, color: 'cyan', title: 'Onboarding Checklist', desc: 'Manage onboarding tasks and milestones', action: () => toast.success('Checklist: I-9 ✓, Direct deposit ✓, Safety training → pending, Equipment issued ✓, Email set up ✓') },
                { icon: FileCheck, color: 'blue', title: 'New Hire Documents', desc: 'Employment paperwork and forms', action: () => toast.success('Required: W-4, I-9, Direct Deposit, Employee Handbook Acknowledgment, Non-disclosure Agreement') },
                { icon: Calendar, color: 'purple', title: 'Orientation Schedule', desc: 'Plan and track orientation sessions', action: () => toast.success('Next orientation: May 1, 2026 at 9AM. 2 new hires enrolled.') },
              ].map(({ icon: Icon, color, title, desc, action }) => (
                <button key={title} onClick={action}
                  className={`bg-gradient-to-br from-${color}-600/10 to-${color}-700/10 border border-${color}-500/30 rounded-lg p-6 hover:border-${color}-500/60 transition-all text-left group`}>
                  <Icon className={`w-8 h-8 text-${color}-400 mb-3 group-hover:scale-110 transition-transform`} />
                  <h4 className="font-bold text-lg text-white mb-2">{title}</h4>
                  <p className="text-sm text-zinc-400">{desc}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Benefits Tab */}
        {activeTab === 'benefits' && (
          <div className="space-y-4">
            <div className="bg-[#1A1A1A] border border-zinc-800 rounded-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3"><Heart className="w-6 h-6 text-pink-500" /><h3 className="text-xl font-bold">Benefits Administration</h3></div>
                <button onClick={() => toast.success('To add a new benefit plan, contact your benefits provider and update the enrollment list in this dashboard.')}
                  className="px-4 py-2 bg-pink-600 hover:bg-pink-700 text-white rounded-lg font-semibold flex items-center gap-2 transition-all">
                  <Plus className="w-4 h-4" /> Add Benefit
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-gradient-to-br from-pink-600/10 to-pink-700/10 border border-pink-500/30 rounded-lg p-4">
                  <p className="text-sm text-pink-200 mb-1">Enrolled Employees</p>
                  <p className="text-2xl font-bold text-white">{stats.activeEmployees}</p>
                  <p className="text-sm text-pink-300 mt-1">In benefit programs</p>
                </div>
                <div className="bg-gradient-to-br from-blue-600/10 to-blue-700/10 border border-blue-500/30 rounded-lg p-4">
                  <p className="text-sm text-blue-200 mb-1">Monthly Cost</p>
                  <p className="text-2xl font-bold text-white">${Math.round(stats.totalPayroll / 12 * 0.15).toLocaleString()}</p>
                  <p className="text-sm text-blue-300 mt-1">Company contribution</p>
                </div>
                <div className="bg-gradient-to-br from-green-600/10 to-green-700/10 border border-green-500/30 rounded-lg p-4">
                  <p className="text-sm text-green-200 mb-1">Health Plans</p>
                  <p className="text-2xl font-bold text-white">3</p>
                  <p className="text-sm text-green-300 mt-1">Available options</p>
                </div>
                <div className="bg-gradient-to-br from-purple-600/10 to-purple-700/10 border border-purple-500/30 rounded-lg p-4">
                  <p className="text-sm text-purple-200 mb-1">Participation Rate</p>
                  <p className="text-2xl font-bold text-white">92%</p>
                  <p className="text-sm text-purple-300 mt-1">Overall enrollment</p>
                </div>
              </div>
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
                        <div><p className="font-semibold text-white">{benefit.name}</p><p className="text-sm text-zinc-500">{benefit.type}</p></div>
                        <span className="text-sm font-semibold text-pink-400">{benefit.cost}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm text-zinc-400">
                        <span>{benefit.enrolled} enrolled</span>
                        <span>{Math.round((benefit.enrolled / Math.max(stats.totalEmployees, 1)) * 100)}% participation</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { icon: UserPlus, color: 'pink', title: 'Enrollment Management', desc: 'Handle benefit enrollments and changes', action: () => { exportCSV('benefits-enrollment.csv', ['Employee', 'Health', 'Dental', 'Vision', '401k'], employees.map(e => [e.name, 'Enrolled', 'Enrolled', 'Enrolled', '3% match'])); toast.success('Benefits enrollment exported'); } },
                { icon: BarChart3, color: 'blue', title: 'Benefits Analytics', desc: 'Track costs and utilization metrics', action: () => toast.success(`Monthly benefits spend: $${Math.round(stats.totalPayroll / 12 * 0.15).toLocaleString()} | Per employee: $${employees.length ? Math.round(stats.totalPayroll / 12 * 0.15 / employees.length).toLocaleString() : 0}`) },
                { icon: Calendar, color: 'purple', title: 'Open Enrollment', desc: 'Plan and run annual enrollment periods', action: () => toast.success('Open enrollment period: Nov 1 – Nov 30, 2026. Send reminders to all employees in October.') },
              ].map(({ icon: Icon, color, title, desc, action }) => (
                <button key={title} onClick={action}
                  className={`bg-gradient-to-br from-${color}-600/10 to-${color}-700/10 border border-${color}-500/30 rounded-lg p-6 hover:border-${color}-500/60 transition-all text-left group`}>
                  <Icon className={`w-8 h-8 text-${color}-400 mb-3 group-hover:scale-110 transition-transform`} />
                  <h4 className="font-bold text-lg text-white mb-2">{title}</h4>
                  <p className="text-sm text-zinc-400">{desc}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Training Tab */}
        {activeTab === 'training' && (
          <div className="space-y-4">
            <div className="bg-[#1A1A1A] border border-zinc-800 rounded-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3"><GraduationCap className="w-6 h-6 text-indigo-500" /><h3 className="text-xl font-bold">Training & Development</h3></div>
                <button onClick={() => setShowNewTrainingModal(true)}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold flex items-center gap-2 transition-all">
                  <Plus className="w-4 h-4" /> New Training
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                {[['Active Programs', '12', 'Training courses', 'indigo'], ['Completion Rate', '87%', 'On-time completion', 'green'], ['Avg Training Hrs', '24', 'Per employee/year', 'blue'], ['Certifications', '38', 'Active certifications', 'purple']].map(([label, val, sub, color]) => (
                  <div key={label} className={`bg-gradient-to-br from-${color}-600/10 to-${color}-700/10 border border-${color}-500/30 rounded-lg p-4`}>
                    <p className={`text-sm text-${color}-200 mb-1`}>{label}</p>
                    <p className="text-2xl font-bold text-white">{val}</p>
                    <p className={`text-sm text-${color}-300 mt-1`}>{sub}</p>
                  </div>
                ))}
              </div>
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
                        <div><p className="font-semibold text-white">{program.name}</p><p className="text-sm text-zinc-500">Due: {program.deadline}</p></div>
                        <span className="text-sm font-semibold text-indigo-400">{program.completed}/{program.enrolled} completed</span>
                      </div>
                      <div className="w-full bg-zinc-800 rounded-full h-2">
                        <div className="bg-gradient-to-r from-indigo-500 to-indigo-600 h-2 rounded-full" style={{ width: `${(program.completed / program.enrolled) * 100}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { icon: GraduationCap, color: 'indigo', title: 'Course Library', desc: 'Browse and assign training courses', action: () => toast.success('12 active courses available. Assign courses to employees from the Employee Directory tab.') },
                { icon: Award, color: 'blue', title: 'Certifications', desc: 'Track licenses and certifications', action: () => { exportCSV('certifications.csv', ['Employee', 'Certification', 'Expiry'], employees.map(e => [e.name, 'OSHA 10', '2027-01-01'])); toast.success('Certifications report exported'); } },
                { icon: BarChart3, color: 'purple', title: 'Training Analytics', desc: 'View completion rates and effectiveness', action: () => toast.success('Overall completion rate: 87% | Most completed: OSHA Safety Training | Overdue: 2 employees') },
              ].map(({ icon: Icon, color, title, desc, action }) => (
                <button key={title} onClick={action}
                  className={`bg-gradient-to-br from-${color}-600/10 to-${color}-700/10 border border-${color}-500/30 rounded-lg p-6 hover:border-${color}-500/60 transition-all text-left group`}>
                  <Icon className={`w-8 h-8 text-${color}-400 mb-3 group-hover:scale-110 transition-transform`} />
                  <h4 className="font-bold text-lg text-white mb-2">{title}</h4>
                  <p className="text-sm text-zinc-400">{desc}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Compliance Tab */}
        {activeTab === 'compliance' && (
          <div className="space-y-4">
            <div className="bg-[#1A1A1A] border border-zinc-800 rounded-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3"><FileCheck className="w-6 h-6 text-red-500" /><h3 className="text-xl font-bold">Compliance & Documents</h3></div>
                <button onClick={() => setShowAddDocModal(true)}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold flex items-center gap-2 transition-all">
                  <Plus className="w-4 h-4" /> Add Document
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                {[['Compliance Rate', '98%', 'All employees', 'green'], ['Expiring Soon', '5', 'Within 30 days', 'red'], ['Active Documents', '156', 'Total documents', 'blue'], ['Audits Passed', '12/12', 'This year', 'purple']].map(([label, val, sub, color]) => (
                  <div key={label} className={`bg-gradient-to-br from-${color}-600/10 to-${color}-700/10 border border-${color}-500/30 rounded-lg p-4`}>
                    <p className={`text-sm text-${color}-200 mb-1`}>{label}</p>
                    <p className="text-2xl font-bold text-white">{val}</p>
                    <p className={`text-sm text-${color}-300 mt-1`}>{sub}</p>
                  </div>
                ))}
              </div>
              <div>
                <h4 className="font-semibold mb-4 flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-yellow-400" />Items Needing Attention</h4>
                <div className="space-y-2">
                  {[
                    { item: 'I-9 Form Verification', employee: 'Alex Turner', expires: 'April 25, 2026', priority: 'high' },
                    { item: 'Safety Training Certificate', employee: 'Jordan Lee', expires: 'April 28, 2026', priority: 'medium' },
                    { item: 'Background Check Renewal', employee: 'Michael Chen', expires: 'May 5, 2026', priority: 'medium' },
                  ].map((item, idx) => (
                    <div key={idx} className={`p-4 bg-[#0A0A0A] border rounded-lg ${item.priority === 'high' ? 'border-red-500/30' : 'border-yellow-500/30'}`}>
                      <div className="flex items-center justify-between mb-2">
                        <div><p className="font-semibold text-white">{item.item}</p><p className="text-sm text-zinc-500">{item.employee}</p></div>
                        <span className={`px-2 py-1 rounded text-sm font-semibold ${item.priority === 'high' ? 'bg-red-600/20 text-red-400' : 'bg-yellow-600/20 text-yellow-400'}`}>{item.priority.toUpperCase()}</span>
                      </div>
                      <p className="text-sm text-zinc-400">Expires: {item.expires}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { icon: FileCheck, color: 'red', title: 'Document Library', desc: 'Manage compliance documents and records', action: () => { exportCSV('compliance-docs.csv', ['Document', 'Employee', 'Type', 'Expiry'], [['I-9 Verification', 'All employees', 'Federal', '2027-01-01'], ['OSHA Cert', 'Field Operations', 'Safety', '2026-06-01']]); toast.success('Document library exported'); } },
                { icon: Shield, color: 'blue', title: 'Audit Management', desc: 'Schedule and track compliance audits', action: () => toast.success('Next scheduled audit: Q3 2026 (July). All 12 prior audits passed. Last audit: March 15, 2026.') },
                { icon: AlertTriangle, color: 'purple', title: 'Compliance Alerts', desc: 'Configure expiration and renewal alerts', action: () => toast.success('Alert settings: 30-day and 7-day email reminders enabled for all document expirations.') },
              ].map(({ icon: Icon, color, title, desc, action }) => (
                <button key={title} onClick={action}
                  className={`bg-gradient-to-br from-${color}-600/10 to-${color}-700/10 border border-${color}-500/30 rounded-lg p-6 hover:border-${color}-500/60 transition-all text-left group`}>
                  <Icon className={`w-8 h-8 text-${color}-400 mb-3 group-hover:scale-110 transition-transform`} />
                  <h4 className="font-bold text-lg text-white mb-2">{title}</h4>
                  <p className="text-sm text-zinc-400">{desc}</p>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Add Employee Modal */}
      {showAddModal && (
        <ModalWrapper title="Add Employee" onClose={() => setShowAddModal(false)} onSave={addEmployee} saveLabel="Add Employee">
          <EmployeeForm />
        </ModalWrapper>
      )}

      {/* Edit Employee Modal */}
      {editingEmployee && (
        <ModalWrapper title={`Edit — ${editingEmployee.name}`} onClose={() => setEditingEmployee(null)} onSave={updateEmployee} saveLabel="Save Changes">
          <EmployeeForm />
        </ModalWrapper>
      )}

      {/* View Employee Modal */}
      {viewingEmployee && (
        <ModalWrapper title="Employee Profile" onClose={() => setViewingEmployee(null)}>
          <div className="space-y-3">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center text-white font-bold text-xl">
                {viewingEmployee.name.split(' ').map(n => n[0]).join('')}
              </div>
              <div>
                <p className="text-lg font-bold text-white">{viewingEmployee.name}</p>
                <p className="text-sm text-zinc-400">{viewingEmployee.role}</p>
                <span className={`text-xs px-2 py-0.5 rounded font-semibold ${viewingEmployee.status === 'active' ? 'bg-green-600/20 text-green-400' : 'bg-yellow-600/20 text-yellow-400'}`}>{viewingEmployee.status}</span>
              </div>
            </div>
            {[['Department', viewingEmployee.department], ['Email', viewingEmployee.email], ['Phone', viewingEmployee.phone], ['Hired', viewingEmployee.hireDate], ['Salary', `$${viewingEmployee.salary.toLocaleString()}/yr`], ['Performance', `${viewingEmployee.performance}/5.0`]].map(([label, val]) => (
              <div key={label} className="flex justify-between py-2 border-b border-[#2A2A2A]">
                <span className="text-xs text-gray-400">{label}</span>
                <span className="text-sm text-white font-medium">{val}</span>
              </div>
            ))}
            <button onClick={() => { setViewingEmployee(null); openEdit(viewingEmployee); }}
              className="w-full py-2 mt-2 border border-[#2A2A2A] text-gray-400 hover:text-white rounded-lg text-sm transition flex items-center justify-center gap-2">
              <Edit2 className="w-3.5 h-3.5" /> Edit Profile
            </button>
          </div>
        </ModalWrapper>
      )}

      {/* Run Payroll Confirm */}
      {showPayrollConfirm && (
        <ModalWrapper title="Confirm Payroll Run" onClose={() => setShowPayrollConfirm(false)}>
          <div className="space-y-3">
            <p className="text-sm text-gray-300">You are about to process payroll for <strong className="text-white">{employees.filter(e => e.status === 'active').length} active employees</strong>.</p>
            <div className="bg-[#111] rounded-lg p-4 space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-400">Gross Payroll</span><span className="text-white font-semibold">${Math.round(stats.totalPayroll / 12).toLocaleString()}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">Tax Withholding</span><span className="text-white font-semibold">-${Math.round(stats.totalPayroll / 12 * 0.2).toLocaleString()}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">Benefits</span><span className="text-white font-semibold">-${Math.round(stats.totalPayroll / 12 * 0.15).toLocaleString()}</span></div>
              <div className="flex justify-between border-t border-[#2A2A2A] pt-2"><span className="text-gray-300 font-semibold">Net Disbursement</span><span className="text-green-400 font-bold">${Math.round(stats.totalPayroll / 12 * 0.65).toLocaleString()}</span></div>
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={() => setShowPayrollConfirm(false)} className="flex-1 py-2 border border-[#2A2A2A] text-gray-400 rounded-lg text-sm hover:text-white transition">Cancel</button>
              <button onClick={runPayroll} className="flex-1 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg text-sm font-semibold transition">Process Payroll</button>
            </div>
          </div>
        </ModalWrapper>
      )}

      {/* Log Time Modal */}
      {showLogTimeModal && (
        <ModalWrapper title="Log Time Entry" onClose={() => setShowLogTimeModal(false)}
          onSave={() => { if (!logTimeForm.employeeId || !logTimeForm.hours) { toast.error('Select employee and hours'); return; } toast.success(`Logged ${logTimeForm.hours}h for ${employees.find(e => e.id === logTimeForm.employeeId)?.name}`); setShowLogTimeModal(false); setLogTimeForm({ employeeId: '', date: new Date().toISOString().split('T')[0], hours: '', notes: '' }); }}
          saveLabel="Log Time">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Employee</label>
            <select value={logTimeForm.employeeId} onChange={e => setLogTimeForm(v => ({ ...v, employeeId: e.target.value }))}
              className="w-full bg-[#111] border border-[#2A2A2A] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500 transition">
              <option value="">Select employee...</option>
              {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Date</label>
              <input type="date" value={logTimeForm.date} onChange={e => setLogTimeForm(v => ({ ...v, date: e.target.value }))}
                className="w-full bg-[#111] border border-[#2A2A2A] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500 transition" />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Hours</label>
              <input type="number" min="0.5" max="24" step="0.5" value={logTimeForm.hours} onChange={e => setLogTimeForm(v => ({ ...v, hours: e.target.value }))}
                placeholder="8.0" className="w-full bg-[#111] border border-[#2A2A2A] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500 transition" />
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Notes (optional)</label>
            <input type="text" value={logTimeForm.notes} onChange={e => setLogTimeForm(v => ({ ...v, notes: e.target.value }))}
              placeholder="Project or task description..." className="w-full bg-[#111] border border-[#2A2A2A] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500 transition" />
          </div>
        </ModalWrapper>
      )}

      {/* New Review Modal */}
      {showNewReviewModal && (
        <ModalWrapper title="Start Performance Review" onClose={() => setShowNewReviewModal(false)}
          onSave={() => { if (!newReviewForm.employeeId) { toast.error('Select an employee'); return; } const emp = employees.find(e => e.id === newReviewForm.employeeId); toast.success(`Performance review started for ${emp?.name}`); setShowNewReviewModal(false); }}
          saveLabel="Start Review">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Employee</label>
            <select value={newReviewForm.employeeId} onChange={e => setNewReviewForm(v => ({ ...v, employeeId: e.target.value }))}
              className="w-full bg-[#111] border border-[#2A2A2A] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-yellow-500 transition">
              <option value="">Select employee...</option>
              {employees.map(e => <option key={e.id} value={e.id}>{e.name} (current: {e.performance}/5.0)</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">New Rating (1–5)</label>
            <input type="number" min="1" max="5" step="0.1" value={newReviewForm.rating} onChange={e => setNewReviewForm(v => ({ ...v, rating: e.target.value }))}
              className="w-full bg-[#111] border border-[#2A2A2A] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-yellow-500 transition" />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Review Notes</label>
            <textarea value={newReviewForm.notes} onChange={e => setNewReviewForm(v => ({ ...v, notes: e.target.value }))} rows={3}
              placeholder="Strengths, areas for improvement, goals..." className="w-full bg-[#111] border border-[#2A2A2A] rounded-lg px-3 py-2 text-sm text-white resize-none focus:outline-none focus:border-yellow-500 transition" />
          </div>
        </ModalWrapper>
      )}

      {/* New Hire Modal */}
      {showNewHireModal && (
        <ModalWrapper title="Start New Hire Onboarding" onClose={() => setShowNewHireModal(false)}
          onSave={() => { if (!newHireForm.name || !newHireForm.role) { toast.error('Name and role required'); return; } toast.success(`Onboarding started for ${newHireForm.name}. Checklist and orientation scheduled.`); setShowNewHireModal(false); setNewHireForm({ name: '', role: '', startDate: '' }); }}
          saveLabel="Start Onboarding">
          {[['Full Name', 'name', 'text'], ['Role / Title', 'role', 'text'], ['Start Date', 'startDate', 'date']].map(([label, key, type]) => (
            <div key={key}>
              <label className="block text-xs text-gray-400 mb-1">{label}</label>
              <input type={type} value={(newHireForm as any)[key]} onChange={e => setNewHireForm(v => ({ ...v, [key]: e.target.value }))}
                className="w-full bg-[#111] border border-[#2A2A2A] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500 transition" />
            </div>
          ))}
        </ModalWrapper>
      )}

      {/* New Training Modal */}
      {showNewTrainingModal && (
        <ModalWrapper title="Create Training Program" onClose={() => setShowNewTrainingModal(false)}
          onSave={() => { if (!newTrainingForm.title) { toast.error('Training title required'); return; } toast.success(`Training program "${newTrainingForm.title}" created and assigned to ${newTrainingForm.enrolled || 'all'} employees`); setShowNewTrainingModal(false); setNewTrainingForm({ title: '', deadline: '', enrolled: '' }); }}
          saveLabel="Create Program">
          {[['Program Title', 'title', 'text'], ['Deadline', 'deadline', 'date'], ['Employees to Enroll (leave blank for all)', 'enrolled', 'text']].map(([label, key, type]) => (
            <div key={key}>
              <label className="block text-xs text-gray-400 mb-1">{label}</label>
              <input type={type} value={(newTrainingForm as any)[key]} onChange={e => setNewTrainingForm(v => ({ ...v, [key]: e.target.value }))}
                className="w-full bg-[#111] border border-[#2A2A2A] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 transition" />
            </div>
          ))}
        </ModalWrapper>
      )}

      {/* Add Document Modal */}
      {showAddDocModal && (
        <ModalWrapper title="Add Compliance Document" onClose={() => setShowAddDocModal(false)}
          onSave={() => { if (!newDocForm.title) { toast.error('Document title required'); return; } toast.success(`"${newDocForm.title}" added to compliance library`); setShowAddDocModal(false); setNewDocForm({ title: '', type: 'Policy', expiry: '' }); }}
          saveLabel="Add Document">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Document Title</label>
            <input type="text" value={newDocForm.title} onChange={e => setNewDocForm(v => ({ ...v, title: e.target.value }))}
              placeholder="e.g. OSHA Safety Policy 2026" className="w-full bg-[#111] border border-[#2A2A2A] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500 transition" />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Document Type</label>
            <select value={newDocForm.type} onChange={e => setNewDocForm(v => ({ ...v, type: e.target.value }))}
              className="w-full bg-[#111] border border-[#2A2A2A] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500 transition">
              {['Policy', 'Certificate', 'License', 'I-9', 'Background Check', 'Contract', 'Insurance'].map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Expiry Date (optional)</label>
            <input type="date" value={newDocForm.expiry} onChange={e => setNewDocForm(v => ({ ...v, expiry: e.target.value }))}
              className="w-full bg-[#111] border border-[#2A2A2A] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500 transition" />
          </div>
        </ModalWrapper>
      )}
    </div>
  );
}
