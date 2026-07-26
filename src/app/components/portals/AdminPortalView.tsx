import PortalFeatureGuide from './PortalFeatureGuide';
/**
 * Admin Portal - Platform Owner Dashboard
 * Real-time alerts, customer service, and employee support
 */

import React, { useState } from 'react';
import {
  AlertTriangle, CheckCircle, Clock, XCircle, Users, MessageSquare,
  HeadphonesIcon, TrendingUp, DollarSign, Activity, Bell, UserCheck,
  Mail, Phone, ArrowRight, Filter, Search, MoreVertical, AlertCircle,
  Zap, Wrench, Send, ChevronDown, MapPin, Calendar, Plus, X,
  HardHat, Briefcase, ClipboardList, Star,
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import SponsoredMarquee from '../SponsoredMarquee';
import AdvertisingMarquee from '../AdvertisingMarquee';
import PlansRecordsPanel from './PlansRecordsPanel';
import CreatePortalPanel from './CreatePortalPanel';

interface Alert {
  id: string;
  type: 'critical' | 'warning' | 'info' | 'success';
  title: string;
  message: string;
  timestamp: string;
  source: string;
  status: 'unread' | 'read' | 'resolved';
  assignedTo?: string;
}

interface CustomerServiceTicket {
  id: string;
  customer: string;
  subject: string;
  priority: 'high' | 'medium' | 'low';
  status: 'open' | 'in_progress' | 'resolved';
  lastUpdate: string;
  assignedAgent?: string;
}

interface EmployeeSupportRequest {
  id: string;
  employee: string;
  department: string;
  category: 'technical' | 'hr' | 'payroll' | 'benefits' | 'general';
  subject: string;
  status: 'pending' | 'in_progress' | 'resolved';
  createdAt: string;
}

interface AdminPortalViewProps {
  onNavigate: (page: string) => void;
}

export default function AdminPortalView({ onNavigate }: AdminPortalViewProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'create-portal' | 'dispatch' | 'plans' | 'alerts' | 'customer-service' | 'employee-support' | 'guide'>('overview');

  // ── Dispatch Center Data ───────────────────────────────────────────────────
  const [workOrders, setWorkOrders] = useState([
    { id: 'WO-001', title: 'HVAC Not Cooling', customer: 'Sarah Johnson', address: '742 Oak St, Dallas TX', priority: 'urgent', status: 'unassigned', assignedTo: '', trade: 'HVAC', submitted: '2026-07-03 09:12', notes: 'Unit completely down, tenants complaining.' },
    { id: 'WO-002', title: 'Electrical Panel Inspection', customer: 'Mike Thompson', address: '205 Maple Ave, Plano TX', priority: 'high', status: 'assigned', assignedTo: 'Carlos Rivera', trade: 'Electrical', submitted: '2026-07-03 08:45', notes: 'Annual inspection required.' },
    { id: 'WO-003', title: 'Bathroom Plumbing Leak', customer: 'Lisa Chen', address: '99 Pine Rd, Irving TX', priority: 'high', status: 'in-progress', assignedTo: 'Mike Torres', trade: 'Plumbing', submitted: '2026-07-03 07:30', notes: 'Active leak under sink.' },
    { id: 'WO-004', title: 'Roof Gutter Cleaning', customer: 'James Wilson', address: '3810 Cedar Blvd, Arlington TX', priority: 'medium', status: 'unassigned', assignedTo: '', trade: 'General', submitted: '2026-07-02 16:00', notes: 'Seasonal maintenance.' },
    { id: 'WO-005', title: 'Door Lock Replacement', customer: 'Patricia Nguyen', address: '1204 Elm St, Garland TX', priority: 'medium', status: 'completed', assignedTo: 'Tyler Brooks', trade: 'Handyman', submitted: '2026-07-02 14:20', notes: 'Tenant locked out, lock worn.' },
    { id: 'WO-006', title: 'Kitchen Appliance Install', customer: 'Robert Chen', address: '570 Birch Ln, McKinney TX', priority: 'low', status: 'unassigned', assignedTo: '', trade: 'Handyman', submitted: '2026-07-02 11:05', notes: 'New dishwasher delivery scheduled.' },
  ]);

  const employees = [
    { id: 'e1', name: 'Carlos Rivera',  trade: 'Electrical', status: 'available', phone: '(817) 555-0163', rating: 4.9, jobs: 142 },
    { id: 'e2', name: 'Mike Torres',    trade: 'Plumbing',   status: 'on-job',    phone: '(214) 555-0244', rating: 4.8, jobs: 98  },
    { id: 'e3', name: 'Tyler Brooks',   trade: 'Handyman',   status: 'available', phone: '(972) 555-0310', rating: 4.7, jobs: 76  },
    { id: 'e4', name: 'Angela Davis',   trade: 'HVAC',       status: 'available', phone: '(469) 555-0187', rating: 4.9, jobs: 115 },
    { id: 'e5', name: 'Jason Park',     trade: 'General',    status: 'off',       phone: '(817) 555-0529', rating: 4.6, jobs: 63  },
    { id: 'e6', name: 'Maria Lopez',    trade: 'Cleaning',   status: 'available', phone: '(214) 555-0632', rating: 5.0, jobs: 88  },
  ];

  const [selectedWO, setSelectedWO] = useState<any>(null);
  const [assignDropdown, setAssignDropdown] = useState<string | null>(null);
  const [dispatchFilter, setDispatchFilter] = useState<'all' | 'unassigned' | 'assigned' | 'in-progress' | 'completed'>('all');

  function assignEmployee(woId: string, empName: string) {
    setWorkOrders(prev => prev.map(wo =>
      wo.id === woId ? { ...wo, assignedTo: empName, status: 'assigned' } : wo
    ));
    setAssignDropdown(null);
    toast.success(`Work order dispatched to ${empName}`);
  }

  function updateStatus(woId: string, status: string) {
    setWorkOrders(prev => prev.map(wo => wo.id === woId ? { ...wo, status } : wo));
    toast.success(`Status updated to ${status}`);
  }
  const [filterAlerts, setFilterAlerts] = useState<'all' | 'critical' | 'warning' | 'unread'>('all');

  // Demo data - Real-time alerts
  const [alerts] = useState<Alert[]>([
    {
      id: 'alert-001',
      type: 'critical',
      title: 'Payment Gateway Timeout',
      message: 'Multiple payment failures detected in the last 5 minutes. Stripe API responding slowly.',
      timestamp: '2 minutes ago',
      source: 'Payment System',
      status: 'unread',
    },
    {
      id: 'alert-002',
      type: 'warning',
      title: 'High Server Load',
      message: 'API server load at 85%. Consider scaling up resources.',
      timestamp: '15 minutes ago',
      source: 'Infrastructure',
      status: 'read',
    },
    {
      id: 'alert-003',
      type: 'critical',
      title: 'Customer Data Export Failed',
      message: 'Scheduled data export job failed for customer ABC Corp. Retry in progress.',
      timestamp: '1 hour ago',
      source: 'Data Pipeline',
      status: 'unread',
      assignedTo: 'Tech Team',
    },
    {
      id: 'alert-004',
      type: 'info',
      title: 'New Territory Application',
      message: 'New territory admin application received for Dallas, TX.',
      timestamp: '2 hours ago',
      source: 'Territory Management',
      status: 'read',
    },
    {
      id: 'alert-005',
      type: 'success',
      title: 'System Backup Completed',
      message: 'Daily backup completed successfully. 2.4GB backed up.',
      timestamp: '3 hours ago',
      source: 'Backup System',
      status: 'resolved',
    },
    {
      id: 'alert-006',
      type: 'warning',
      title: 'Unusual Login Activity',
      message: '5 failed login attempts detected from IP 192.168.1.100',
      timestamp: '4 hours ago',
      source: 'Security',
      status: 'read',
    },
  ]);

  // Demo data - Customer service tickets
  const [tickets] = useState<CustomerServiceTicket[]>([
    {
      id: 'ticket-001',
      customer: 'John Smith',
      subject: 'Cannot access invoice history',
      priority: 'high',
      status: 'open',
      lastUpdate: '5 minutes ago',
      assignedAgent: 'Sarah Johnson',
    },
    {
      id: 'ticket-002',
      customer: 'ABC Construction',
      subject: 'Billing discrepancy on March invoice',
      priority: 'high',
      status: 'in_progress',
      lastUpdate: '1 hour ago',
      assignedAgent: 'Mike Chen',
    },
    {
      id: 'ticket-003',
      customer: 'Jane Doe',
      subject: 'How to add team members?',
      priority: 'low',
      status: 'open',
      lastUpdate: '2 hours ago',
    },
    {
      id: 'ticket-004',
      customer: 'XYZ Plumbing',
      subject: 'Mobile app not syncing',
      priority: 'medium',
      status: 'in_progress',
      lastUpdate: '3 hours ago',
      assignedAgent: 'Sarah Johnson',
    },
  ]);

  // Demo data - Employee support requests
  const [employeeRequests] = useState<EmployeeSupportRequest[]>([
    {
      id: 'emp-001',
      employee: 'Emily Rodriguez',
      department: 'Sales',
      category: 'technical',
      subject: 'VPN connection issues',
      status: 'in_progress',
      createdAt: '30 minutes ago',
    },
    {
      id: 'emp-002',
      employee: 'David Park',
      department: 'Operations',
      category: 'payroll',
      subject: 'Missing overtime hours',
      status: 'pending',
      createdAt: '1 hour ago',
    },
    {
      id: 'emp-003',
      employee: 'Lisa Anderson',
      department: 'Customer Success',
      category: 'hr',
      subject: 'PTO request approval',
      status: 'resolved',
      createdAt: '2 hours ago',
    },
    {
      id: 'emp-004',
      employee: 'Tom Wilson',
      department: 'Engineering',
      category: 'benefits',
      subject: 'Health insurance enrollment question',
      status: 'pending',
      createdAt: '4 hours ago',
    },
  ]);

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'critical': return <XCircle className="w-5 h-5 text-red-500" />;
      case 'warning': return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'success': return <CheckCircle className="w-5 h-5 text-green-500" />;
      default: return <AlertCircle className="w-5 h-5 text-blue-500" />;
    }
  };

  const getPriorityBadge = (priority: string) => {
    const colors = {
      high: 'bg-red-100 text-red-700',
      medium: 'bg-yellow-100 text-yellow-700',
      low: 'bg-green-100 text-green-700',
    };
    return colors[priority as keyof typeof colors] || colors.low;
  };

  const getStatusBadge = (status: string) => {
    const colors = {
      open: 'bg-blue-100 text-blue-700',
      pending: 'bg-yellow-100 text-yellow-700',
      in_progress: 'bg-purple-100 text-purple-700',
      resolved: 'bg-green-100 text-green-700',
      unread: 'bg-red-100 text-red-700',
      read: 'bg-gray-100 text-gray-700',
    };
    return colors[status as keyof typeof colors] || colors.open;
  };

  const filteredAlerts = alerts.filter(alert => {
    if (filterAlerts === 'all') return true;
    if (filterAlerts === 'critical') return alert.type === 'critical';
    if (filterAlerts === 'warning') return alert.type === 'warning';
    if (filterAlerts === 'unread') return alert.status === 'unread';
    return true;
  });

  const stats = {
    totalAlerts: alerts.filter(a => a.status !== 'resolved').length,
    criticalAlerts: alerts.filter(a => a.type === 'critical' && a.status !== 'resolved').length,
    openTickets: tickets.filter(t => t.status !== 'resolved').length,
    pendingEmployeeRequests: employeeRequests.filter(r => r.status === 'pending').length,
  };

  return (
    <div className="w-full min-h-screen bg-gray-50">
      <SponsoredMarquee />
      <AdvertisingMarquee placement="portal-header" dismissible />
      {/* Header */}
      <div className="bg-gradient-to-r from-red-600 to-red-700 text-white">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Admin Command Center</h1>
              <p className="text-red-100 mt-1">Platform Owner Dashboard - Full System Access</p>
            </div>
            <button
              onClick={() => onNavigate('unified-dashboard')}
              className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
            >
              Back to Main Dashboard
            </button>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-4 gap-4 mt-8">
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-red-100 text-sm">Active Alerts</p>
                  <p className="text-3xl font-bold mt-1">{stats.totalAlerts}</p>
                </div>
                <Bell className="w-8 h-8 text-white/80" />
              </div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-red-100 text-sm">Critical Issues</p>
                  <p className="text-3xl font-bold mt-1">{stats.criticalAlerts}</p>
                </div>
                <AlertTriangle className="w-8 h-8 text-white/80" />
              </div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-red-100 text-sm">Open Tickets</p>
                  <p className="text-3xl font-bold mt-1">{stats.openTickets}</p>
                </div>
                <MessageSquare className="w-8 h-8 text-white/80" />
              </div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-red-100 text-sm">Employee Requests</p>
                  <p className="text-3xl font-bold mt-1">{stats.pendingEmployeeRequests}</p>
                </div>
                <HeadphonesIcon className="w-8 h-8 text-white/80" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white border-b sticky top-16 z-30">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex gap-6">
            {[
              { id: 'overview', label: 'Overview', icon: Activity },
              { id: 'create-portal', label: 'Create Portal', icon: UserCheck },
              { id: 'dispatch', label: 'Dispatch Center', icon: ClipboardList, badge: workOrders.filter(w => w.status === 'unassigned').length },
              { id: 'plans', label: 'Maintenance Plans', icon: Wrench },
              { id: 'alerts', label: 'System Alerts', icon: Bell },
              { id: 'customer-service', label: 'Customer Service', icon: MessageSquare },
              { id: 'employee-support', label: 'Employee Support', icon: HeadphonesIcon },
              { id: 'guide', label: 'Portal Guide', icon: ClipboardList },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-4 border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-red-600 text-red-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                <tab.icon className="w-5 h-5" />
                {tab.label}
                {(tab as any).badge > 0 && (
                  <span className="px-1.5 py-0.5 bg-red-500 text-white text-xs font-bold rounded-full">
                    {(tab as any).badge}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Create Portal Tab — provision any portal + optional full-access trial */}
        {activeTab === 'create-portal' && <CreatePortalPanel />}

        {/* Maintenance Plans Tab — searchable records tied to hours, gift cards, promos & offers */}
        {activeTab === 'plans' && <PlansRecordsPanel />}

        {/* Overview Tab */}
        {activeTab === 'guide' && <PortalFeatureGuide portal="admin" />}

        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              {/* Recent Critical Alerts */}
              <div className="bg-white rounded-lg border p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold flex items-center gap-2">
                    <Zap className="w-5 h-5 text-red-500" />
                    Critical Alerts
                  </h2>
                  <button
                    onClick={() => setActiveTab('alerts')}
                    className="text-sm text-red-600 hover:text-red-700 flex items-center gap-1"
                  >
                    View All <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
                <div className="space-y-3">
                  {alerts.filter(a => a.type === 'critical' && a.status !== 'resolved').slice(0, 3).map(alert => (
                    <div key={alert.id} className="border-l-4 border-red-500 bg-red-50 p-3 rounded">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{alert.title}</p>
                          <p className="text-sm text-gray-600 mt-1">{alert.message}</p>
                          <p className="text-xs text-gray-500 mt-2">{alert.timestamp}</p>
                        </div>
                        <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recent Customer Tickets */}
              <div className="bg-white rounded-lg border p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-blue-500" />
                    Recent Tickets
                  </h2>
                  <button
                    onClick={() => setActiveTab('customer-service')}
                    className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                  >
                    View All <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
                <div className="space-y-3">
                  {tickets.slice(0, 3).map(ticket => (
                    <div key={ticket.id} className="border rounded-lg p-3 hover:bg-gray-50 cursor-pointer">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{ticket.customer}</p>
                          <p className="text-sm text-gray-600 mt-1">{ticket.subject}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <span className={`text-xs px-2 py-1 rounded ${getPriorityBadge(ticket.priority)}`}>
                              {ticket.priority}
                            </span>
                            <span className="text-xs text-gray-500">{ticket.lastUpdate}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Employee Support Requests */}
            <div className="bg-white rounded-lg border p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <HeadphonesIcon className="w-5 h-5 text-purple-500" />
                  Pending Employee Support
                </h2>
                <button
                  onClick={() => setActiveTab('employee-support')}
                  className="text-sm text-purple-600 hover:text-purple-700 flex items-center gap-1"
                >
                  View All <ArrowRight className="w-4 h-4" />
                </button>
              </div>
              <div className="grid grid-cols-3 gap-4">
                {employeeRequests.filter(r => r.status === 'pending').map(request => (
                  <div key={request.id} className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer">
                    <p className="font-medium text-gray-900">{request.employee}</p>
                    <p className="text-sm text-gray-600 mt-1">{request.subject}</p>
                    <div className="flex items-center gap-2 mt-3">
                      <span className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-700">
                        {request.category}
                      </span>
                      <span className="text-xs text-gray-500">{request.createdAt}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Access */}
            <div className="grid grid-cols-3 gap-4">
              <button
                onClick={() => onNavigate('unified-dashboard')}
                className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-lg p-6 hover:from-blue-600 hover:to-blue-700 transition-all"
              >
                <Users className="w-8 h-8 mb-2" />
                <p className="font-semibold">User Management</p>
                <p className="text-sm text-blue-100 mt-1">Manage all platform users</p>
              </button>
              <button
                onClick={() => onNavigate('unified-dashboard')}
                className="bg-gradient-to-br from-green-500 to-green-600 text-white rounded-lg p-6 hover:from-green-600 hover:to-green-700 transition-all"
              >
                <DollarSign className="w-8 h-8 mb-2" />
                <p className="font-semibold">Revenue Analytics</p>
                <p className="text-sm text-green-100 mt-1">View platform revenue</p>
              </button>
              <button
                onClick={() => onNavigate('unified-dashboard')}
                className="bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-lg p-6 hover:from-purple-600 hover:to-purple-700 transition-all"
              >
                <TrendingUp className="w-8 h-8 mb-2" />
                <p className="font-semibold">System Analytics</p>
                <p className="text-sm text-purple-100 mt-1">Performance & usage stats</p>
              </button>
            </div>
          </div>
        )}

        {/* ── DISPATCH CENTER ──────────────────────────────────────────────── */}
        {activeTab === 'dispatch' && (
          <div className="space-y-6">

            {/* Summary stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Unassigned', value: workOrders.filter(w => w.status === 'unassigned').length, color: 'text-red-500', bg: 'bg-red-50 border-red-200' },
                { label: 'Assigned', value: workOrders.filter(w => w.status === 'assigned').length, color: 'text-blue-500', bg: 'bg-blue-50 border-blue-200' },
                { label: 'In Progress', value: workOrders.filter(w => w.status === 'in-progress').length, color: 'text-yellow-500', bg: 'bg-yellow-50 border-yellow-200' },
                { label: 'Completed Today', value: workOrders.filter(w => w.status === 'completed').length, color: 'text-green-500', bg: 'bg-green-50 border-green-200' },
              ].map((s, i) => (
                <div key={i} className={`rounded-xl border p-4 ${s.bg}`}>
                  <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
                  <p className="text-sm text-gray-600 mt-1">{s.label}</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

              {/* Work Orders list */}
              <div className="lg:col-span-2 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <ClipboardList className="w-5 h-5 text-red-600" /> Work Orders
                  </h3>
                  <div className="flex gap-2 flex-wrap">
                    {(['all','unassigned','assigned','in-progress','completed'] as const).map(f => (
                      <button key={f} onClick={() => setDispatchFilter(f)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${dispatchFilter === f ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                        {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1).replace('-',' ')}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  {workOrders.filter(wo => dispatchFilter === 'all' || wo.status === dispatchFilter).map(wo => {
                    const priorityColor = wo.priority === 'urgent' ? 'border-l-red-500 bg-red-50' : wo.priority === 'high' ? 'border-l-orange-500 bg-orange-50' : wo.priority === 'medium' ? 'border-l-yellow-500 bg-yellow-50' : 'border-l-gray-400 bg-gray-50';
                    const statusBadge = wo.status === 'unassigned' ? 'bg-red-100 text-red-700' : wo.status === 'assigned' ? 'bg-blue-100 text-blue-700' : wo.status === 'in-progress' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700';
                    return (
                      <div key={wo.id} className={`border-l-4 ${priorityColor} border border-gray-200 rounded-xl p-4 cursor-pointer hover:shadow-md transition`}
                        onClick={() => setSelectedWO(wo.id === selectedWO?.id ? null : wo)}>
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <span className="font-bold text-gray-900 text-sm">{wo.id}</span>
                              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${statusBadge}`}>{wo.status.replace('-',' ').toUpperCase()}</span>
                              <span className="px-2 py-0.5 bg-gray-200 text-gray-700 rounded-full text-xs font-semibold">{wo.trade}</span>
                            </div>
                            <p className="font-semibold text-gray-800">{wo.title}</p>
                            <p className="text-sm text-gray-500 flex items-center gap-1 mt-0.5"><MapPin className="w-3.5 h-3.5" />{wo.customer} · {wo.address}</p>
                            {wo.assignedTo && <p className="text-sm text-blue-600 font-medium mt-1 flex items-center gap-1"><HardHat className="w-3.5 h-3.5" />{wo.assignedTo}</p>}
                          </div>
                          <div className="flex flex-col items-end gap-2 flex-shrink-0">
                            <p className="text-xs text-gray-400">{wo.submitted}</p>
                            {/* Assign dropdown */}
                            <div className="relative">
                              <button
                                onClick={e => { e.stopPropagation(); setAssignDropdown(assignDropdown === wo.id ? null : wo.id); }}
                                className="flex items-center gap-1 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold transition">
                                <Send className="w-3 h-3" />
                                {wo.assignedTo ? 'Reassign' : 'Dispatch'}
                                <ChevronDown className="w-3 h-3" />
                              </button>
                              {assignDropdown === wo.id && (
                                <div className="absolute right-0 top-full mt-1 w-52 bg-white border border-gray-200 rounded-xl shadow-xl z-20 overflow-hidden">
                                  <div className="px-3 py-2 bg-gray-50 border-b border-gray-100">
                                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Assign to Employee</p>
                                  </div>
                                  {employees.filter(e => e.status !== 'off').map(emp => (
                                    <button key={emp.id} onClick={e => { e.stopPropagation(); assignEmployee(wo.id, emp.name); }}
                                      className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-red-50 transition text-left">
                                      <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                                        <span className="text-xs font-bold text-red-600">{emp.name.charAt(0)}</span>
                                      </div>
                                      <div>
                                        <p className="text-sm font-semibold text-gray-800">{emp.name}</p>
                                        <p className="text-xs text-gray-500">{emp.trade} · <span className={emp.status === 'available' ? 'text-green-600 font-medium' : 'text-yellow-600 font-medium'}>{emp.status}</span></p>
                                      </div>
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                            {/* Status update */}
                            {wo.status !== 'completed' && (
                              <select value={wo.status}
                                onChange={e => { e.stopPropagation(); updateStatus(wo.id, e.target.value); }}
                                onClick={e => e.stopPropagation()}
                                className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white text-gray-700 focus:outline-none focus:border-red-500">
                                <option value="unassigned">Unassigned</option>
                                <option value="assigned">Assigned</option>
                                <option value="in-progress">In Progress</option>
                                <option value="completed">Completed</option>
                              </select>
                            )}
                          </div>
                        </div>
                        {/* Expanded detail */}
                        {selectedWO?.id === wo.id && (
                          <div className="mt-3 pt-3 border-t border-gray-200">
                            <p className="text-sm text-gray-600 mb-2"><span className="font-semibold">Notes:</span> {wo.notes}</p>
                            <div className="flex gap-2 flex-wrap">
                              <button onClick={e => { e.stopPropagation(); toast.success(`Calling ${wo.customer}...`); }}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-green-100 text-green-700 rounded-lg text-xs font-semibold hover:bg-green-200 transition">
                                <Phone className="w-3.5 h-3.5" /> Call Customer
                              </button>
                              <button onClick={e => { e.stopPropagation(); toast.success('Message sent to tech'); }}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg text-xs font-semibold hover:bg-blue-200 transition">
                                <MessageSquare className="w-3.5 h-3.5" /> Message Tech
                              </button>
                              <button onClick={e => { e.stopPropagation(); toast.success('Work order marked urgent'); }}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-red-100 text-red-700 rounded-lg text-xs font-semibold hover:bg-red-200 transition">
                                <AlertTriangle className="w-3.5 h-3.5" /> Flag Urgent
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Employee Availability */}
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <HardHat className="w-5 h-5 text-red-600" /> Field Team
                </h3>
                <div className="space-y-3">
                  {employees.map(emp => (
                    <div key={emp.id} className="bg-white border border-gray-200 rounded-xl p-4 hover:border-red-300 transition">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="font-bold text-red-600">{emp.name.charAt(0)}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 text-sm">{emp.name}</p>
                          <p className="text-xs text-gray-500">{emp.trade}</p>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                            emp.status === 'available' ? 'bg-green-100 text-green-700' :
                            emp.status === 'on-job' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-gray-100 text-gray-500'
                          }`}>{emp.status}</span>
                          <div className="flex items-center gap-1">
                            <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                            <span className="text-xs text-gray-600">{emp.rating}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100">
                        <span className="text-xs text-gray-500">{emp.jobs} jobs completed</span>
                        <button onClick={() => { navigator.clipboard.writeText(emp.phone).catch(()=>{}); toast.success(`Copied ${emp.phone}`); }}
                          className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1">
                          <Phone className="w-3 h-3" /> {emp.phone}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Alerts Tab */}
        {activeTab === 'alerts' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">System Alerts</h2>
              <div className="flex items-center gap-3">
                <div className="flex gap-2">
                  {['all', 'critical', 'warning', 'unread'].map(filter => (
                    <button
                      key={filter}
                      onClick={() => setFilterAlerts(filter as any)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        filterAlerts === filter
                          ? 'bg-red-600 text-white'
                          : 'bg-white border hover:bg-gray-50'
                      }`}
                    >
                      {filter.charAt(0).toUpperCase() + filter.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg border">
              <div className="divide-y">
                {filteredAlerts.map(alert => (
                  <div key={alert.id} className="p-4 hover:bg-gray-50">
                    <div className="flex items-start gap-4">
                      {getAlertIcon(alert.type)}
                      <div className="flex-1">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="font-semibold text-gray-900">{alert.title}</h3>
                            <p className="text-gray-600 mt-1">{alert.message}</p>
                            <div className="flex items-center gap-3 mt-2">
                              <span className="text-sm text-gray-500">{alert.source}</span>
                              <span className="text-sm text-gray-500">•</span>
                              <span className="text-sm text-gray-500">{alert.timestamp}</span>
                              {alert.assignedTo && (
                                <>
                                  <span className="text-sm text-gray-500">•</span>
                                  <span className="text-sm text-gray-500">Assigned: {alert.assignedTo}</span>
                                </>
                              )}
                            </div>
                          </div>
                          <span className={`text-xs px-2 py-1 rounded ${getStatusBadge(alert.status)}`}>
                            {alert.status}
                          </span>
                        </div>
                      </div>
                      <button className="text-gray-400 hover:text-gray-600">
                        <MoreVertical className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Customer Service Tab */}
        {activeTab === 'customer-service' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">Customer Service Tickets</h2>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search tickets..."
                    className="pl-10 pr-4 py-2 border rounded-lg w-64"
                  />
                </div>
                <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                  New Ticket
                </button>
              </div>
            </div>

            <div className="bg-white rounded-lg border">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left px-6 py-3 text-sm font-semibold text-gray-900">Customer</th>
                    <th className="text-left px-6 py-3 text-sm font-semibold text-gray-900">Subject</th>
                    <th className="text-left px-6 py-3 text-sm font-semibold text-gray-900">Priority</th>
                    <th className="text-left px-6 py-3 text-sm font-semibold text-gray-900">Status</th>
                    <th className="text-left px-6 py-3 text-sm font-semibold text-gray-900">Assigned To</th>
                    <th className="text-left px-6 py-3 text-sm font-semibold text-gray-900">Last Update</th>
                    <th className="text-left px-6 py-3 text-sm font-semibold text-gray-900"></th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {tickets.map(ticket => (
                    <tr key={ticket.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                            <Users className="w-4 h-4 text-blue-600" />
                          </div>
                          <span className="font-medium">{ticket.customer}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-900">{ticket.subject}</td>
                      <td className="px-6 py-4">
                        <span className={`text-xs px-2 py-1 rounded font-medium ${getPriorityBadge(ticket.priority)}`}>
                          {ticket.priority}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`text-xs px-2 py-1 rounded font-medium ${getStatusBadge(ticket.status)}`}>
                          {ticket.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-600">{ticket.assignedAgent || 'Unassigned'}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">{ticket.lastUpdate}</td>
                      <td className="px-6 py-4">
                        <button className="text-gray-400 hover:text-gray-600">
                          <MoreVertical className="w-5 h-5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Employee Support Tab */}
        {activeTab === 'employee-support' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">Employee Support Requests</h2>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search requests..."
                    className="pl-10 pr-4 py-2 border rounded-lg w-64"
                  />
                </div>
                <button className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
                  New Request
                </button>
              </div>
            </div>

            <div className="bg-white rounded-lg border">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left px-6 py-3 text-sm font-semibold text-gray-900">Employee</th>
                    <th className="text-left px-6 py-3 text-sm font-semibold text-gray-900">Department</th>
                    <th className="text-left px-6 py-3 text-sm font-semibold text-gray-900">Category</th>
                    <th className="text-left px-6 py-3 text-sm font-semibold text-gray-900">Subject</th>
                    <th className="text-left px-6 py-3 text-sm font-semibold text-gray-900">Status</th>
                    <th className="text-left px-6 py-3 text-sm font-semibold text-gray-900">Created</th>
                    <th className="text-left px-6 py-3 text-sm font-semibold text-gray-900"></th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {employeeRequests.map(request => (
                    <tr key={request.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                            <UserCheck className="w-4 h-4 text-purple-600" />
                          </div>
                          <span className="font-medium">{request.employee}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-600">{request.department}</td>
                      <td className="px-6 py-4">
                        <span className="text-xs px-2 py-1 rounded font-medium bg-blue-100 text-blue-700">
                          {request.category}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-900">{request.subject}</td>
                      <td className="px-6 py-4">
                        <span className={`text-xs px-2 py-1 rounded font-medium ${getStatusBadge(request.status)}`}>
                          {request.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">{request.createdAt}</td>
                      <td className="px-6 py-4">
                        <button className="text-gray-400 hover:text-gray-600">
                          <MoreVertical className="w-5 h-5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
