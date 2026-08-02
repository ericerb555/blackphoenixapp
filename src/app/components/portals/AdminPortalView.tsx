import PortalFeatureGuide from './PortalFeatureGuide';
import InvestmentTab from './InvestmentTab';
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
  HardHat, Briefcase, ClipboardList, Star, Shield, ArrowLeft, LayoutDashboard, FileText,
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import SponsoredMarquee from '../SponsoredMarquee';
import AdvertisingMarquee from '../AdvertisingMarquee';
import PlansRecordsPanel from './PlansRecordsPanel';
import CreatePortalPanel from './CreatePortalPanel';
import SentInvitesPanel from './SentInvitesPanel';
import { PortalDocumentVault } from './PortalDocumentVault';
import { useAuth } from '../../contexts/AuthContext';

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
  const { session } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'create-portal' | 'sent-invites' | 'dispatch' | 'plans' | 'alerts' | 'customer-service' | 'employee-support' | 'investments' | 'documents' | 'guide'>('overview');

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
      high: 'bg-red-500/15 text-red-400 border border-red-500/30',
      medium: 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/30',
      low: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30',
    };
    return colors[priority as keyof typeof colors] || colors.low;
  };

  const getStatusBadge = (status: string) => {
    const colors = {
      open: 'bg-blue-500/15 text-blue-400 border border-blue-500/30',
      pending: 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/30',
      in_progress: 'bg-purple-500/15 text-purple-400 border border-purple-500/30',
      resolved: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30',
      unread: 'bg-red-500/15 text-red-400 border border-red-500/30',
      read: 'bg-white/10 text-gray-400 border border-white/10',
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
    <div className="w-full min-h-screen bg-[#0A0A0A] text-white">
      <SponsoredMarquee />
      <AdvertisingMarquee placement="portal-header" dismissible />
      {/* Header */}
      <div className="border-b border-[#2A2A2A] bg-[#1A1A1A]">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-500 to-orange-700 flex items-center justify-center flex-shrink-0">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white">Admin Command Center</h1>
                <p className="text-gray-400 mt-1">Platform Owner Dashboard — Full System Access</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => onNavigate('owners-dashboard')}
                className="flex items-center gap-2 px-4 py-2.5 bg-[#2A2A2A] hover:bg-[#333] text-gray-200 rounded-xl transition-colors border border-[#3A3A3A]"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Portal
              </button>
              <button
                onClick={() => onNavigate('unified-dashboard')}
                className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-xl transition-colors font-semibold"
              >
                <LayoutDashboard className="w-4 h-4" />
                Command Center
              </button>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
            {[
              { label: 'Active Alerts', value: stats.totalAlerts, icon: Bell, color: 'text-orange-400' },
              { label: 'Critical Issues', value: stats.criticalAlerts, icon: AlertTriangle, color: 'text-red-400' },
              { label: 'Open Tickets', value: stats.openTickets, icon: MessageSquare, color: 'text-blue-400' },
              { label: 'Employee Requests', value: stats.pendingEmployeeRequests, icon: HeadphonesIcon, color: 'text-purple-400' },
            ].map(s => (
              <div key={s.label} className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-2xl p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm">{s.label}</p>
                    <p className="text-3xl font-bold mt-1 text-white">{s.value}</p>
                  </div>
                  <s.icon className={`w-8 h-8 ${s.color}`} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-[#1A1A1A] border-b border-[#2A2A2A] sticky top-16 z-30">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex gap-6 overflow-x-auto">
            {[
              { id: 'overview', label: 'Overview', icon: Activity },
              { id: 'create-portal', label: 'Create Portal', icon: UserCheck },
              { id: 'sent-invites', label: 'Sent Invites', icon: Send },
              { id: 'dispatch', label: 'Dispatch Center', icon: ClipboardList, badge: workOrders.filter(w => w.status === 'unassigned').length },
              { id: 'plans', label: 'Maintenance Plans', icon: Wrench },
              { id: 'alerts', label: 'System Alerts', icon: Bell },
              { id: 'customer-service', label: 'Customer Service', icon: MessageSquare },
              { id: 'employee-support', label: 'Employee Support', icon: HeadphonesIcon },
              { id: 'investments', label: 'Investments', icon: DollarSign },
              { id: 'documents', label: 'Documents', icon: FileText },
              { id: 'guide', label: 'Portal Guide', icon: ClipboardList },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-4 border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-orange-500 text-orange-400'
                    : 'border-transparent text-gray-400 hover:text-white'
                }`}
              >
                <tab.icon className="w-5 h-5" />
                {tab.label}
                {(tab as any).badge > 0 && (
                  <span className="px-1.5 py-0.5 bg-orange-500 text-white text-xs font-bold rounded-full">
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
        {activeTab === 'sent-invites' && <SentInvitesPanel />}

        {/* Maintenance Plans Tab — searchable records tied to hours, gift cards, promos & offers */}
        {activeTab === 'plans' && <PlansRecordsPanel />}

        {/* Overview Tab */}
        {activeTab === 'guide' && <PortalFeatureGuide portal="admin" />}

        {activeTab === 'investments' && <InvestmentTab portalType="admin" />}

        {activeTab === 'documents' && <PortalDocumentVault session={session} accent="orange" />}

        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Recent Critical Alerts */}
              <div className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold flex items-center gap-2 text-white">
                    <Zap className="w-5 h-5 text-red-400" />
                    Critical Alerts
                  </h2>
                  <button
                    onClick={() => setActiveTab('alerts')}
                    className="text-sm text-orange-400 hover:text-orange-300 flex items-center gap-1"
                  >
                    View All <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
                <div className="space-y-3">
                  {alerts.filter(a => a.type === 'critical' && a.status !== 'resolved').slice(0, 3).map(alert => (
                    <div key={alert.id} className="border-l-4 border-red-500 bg-red-500/10 p-3 rounded-lg">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-medium text-white">{alert.title}</p>
                          <p className="text-sm text-gray-400 mt-1">{alert.message}</p>
                          <p className="text-xs text-gray-500 mt-2">{alert.timestamp}</p>
                        </div>
                        <XCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recent Customer Tickets */}
              <div className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold flex items-center gap-2 text-white">
                    <MessageSquare className="w-5 h-5 text-blue-400" />
                    Recent Tickets
                  </h2>
                  <button
                    onClick={() => setActiveTab('customer-service')}
                    className="text-sm text-orange-400 hover:text-orange-300 flex items-center gap-1"
                  >
                    View All <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
                <div className="space-y-3">
                  {tickets.slice(0, 3).map(ticket => (
                    <div key={ticket.id} className="border border-[#2A2A2A] rounded-xl p-3 hover:bg-white/5 cursor-pointer transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-medium text-white">{ticket.customer}</p>
                          <p className="text-sm text-gray-400 mt-1">{ticket.subject}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <span className={`text-xs px-2 py-1 rounded-full ${getPriorityBadge(ticket.priority)}`}>
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
            <div className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold flex items-center gap-2 text-white">
                  <HeadphonesIcon className="w-5 h-5 text-purple-400" />
                  Pending Employee Support
                </h2>
                <button
                  onClick={() => setActiveTab('employee-support')}
                  className="text-sm text-orange-400 hover:text-orange-300 flex items-center gap-1"
                >
                  View All <ArrowRight className="w-4 h-4" />
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {employeeRequests.filter(r => r.status === 'pending').map(request => (
                  <div key={request.id} className="border border-[#2A2A2A] rounded-xl p-4 hover:bg-white/5 cursor-pointer transition-colors">
                    <p className="font-medium text-white">{request.employee}</p>
                    <p className="text-sm text-gray-400 mt-1">{request.subject}</p>
                    <div className="flex items-center gap-2 mt-3">
                      <span className="text-xs px-2 py-1 rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/30">
                        {request.category}
                      </span>
                      <span className="text-xs text-gray-500">{request.createdAt}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Access */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button
                onClick={() => onNavigate('unified-dashboard')}
                className="bg-[#1A1A1A] border border-[#2A2A2A] hover:border-orange-500/50 text-left text-white rounded-2xl p-6 transition-all"
              >
                <Users className="w-8 h-8 mb-2 text-blue-400" />
                <p className="font-semibold">User Management</p>
                <p className="text-sm text-gray-400 mt-1">Manage all platform users</p>
              </button>
              <button
                onClick={() => onNavigate('unified-dashboard')}
                className="bg-[#1A1A1A] border border-[#2A2A2A] hover:border-orange-500/50 text-left text-white rounded-2xl p-6 transition-all"
              >
                <DollarSign className="w-8 h-8 mb-2 text-emerald-400" />
                <p className="font-semibold">Revenue Analytics</p>
                <p className="text-sm text-gray-400 mt-1">View platform revenue</p>
              </button>
              <button
                onClick={() => onNavigate('unified-dashboard')}
                className="bg-[#1A1A1A] border border-[#2A2A2A] hover:border-orange-500/50 text-left text-white rounded-2xl p-6 transition-all"
              >
                <TrendingUp className="w-8 h-8 mb-2 text-purple-400" />
                <p className="font-semibold">System Analytics</p>
                <p className="text-sm text-gray-400 mt-1">Performance & usage stats</p>
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
                { label: 'Unassigned', value: workOrders.filter(w => w.status === 'unassigned').length, color: 'text-red-400' },
                { label: 'Assigned', value: workOrders.filter(w => w.status === 'assigned').length, color: 'text-blue-400' },
                { label: 'In Progress', value: workOrders.filter(w => w.status === 'in-progress').length, color: 'text-yellow-400' },
                { label: 'Completed Today', value: workOrders.filter(w => w.status === 'completed').length, color: 'text-emerald-400' },
              ].map((s, i) => (
                <div key={i} className="rounded-2xl border border-[#2A2A2A] bg-[#1A1A1A] p-4">
                  <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
                  <p className="text-sm text-gray-400 mt-1">{s.label}</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

              {/* Work Orders list */}
              <div className="lg:col-span-2 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <ClipboardList className="w-5 h-5 text-orange-400" /> Work Orders
                  </h3>
                  <div className="flex gap-2 flex-wrap">
                    {(['all','unassigned','assigned','in-progress','completed'] as const).map(f => (
                      <button key={f} onClick={() => setDispatchFilter(f)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${dispatchFilter === f ? 'bg-orange-500 text-white' : 'bg-[#2A2A2A] text-gray-400 hover:bg-[#333]'}`}>
                        {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1).replace('-',' ')}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  {workOrders.filter(wo => dispatchFilter === 'all' || wo.status === dispatchFilter).map(wo => {
                    const priorityColor = wo.priority === 'urgent' ? 'border-l-red-500' : wo.priority === 'high' ? 'border-l-orange-500' : wo.priority === 'medium' ? 'border-l-yellow-500' : 'border-l-gray-500';
                    const statusBadge = wo.status === 'unassigned' ? 'bg-red-500/15 text-red-400' : wo.status === 'assigned' ? 'bg-blue-500/15 text-blue-400' : wo.status === 'in-progress' ? 'bg-yellow-500/15 text-yellow-400' : 'bg-emerald-500/15 text-emerald-400';
                    return (
                      <div key={wo.id} className={`border-l-4 ${priorityColor} bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-4 cursor-pointer hover:border-orange-500/40 transition`}
                        onClick={() => setSelectedWO(wo.id === selectedWO?.id ? null : wo)}>
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <span className="font-bold text-white text-sm">{wo.id}</span>
                              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${statusBadge}`}>{wo.status.replace('-',' ').toUpperCase()}</span>
                              <span className="px-2 py-0.5 bg-white/10 text-gray-300 rounded-full text-xs font-semibold">{wo.trade}</span>
                            </div>
                            <p className="font-semibold text-gray-200">{wo.title}</p>
                            <p className="text-sm text-gray-500 flex items-center gap-1 mt-0.5"><MapPin className="w-3.5 h-3.5" />{wo.customer} · {wo.address}</p>
                            {wo.assignedTo && <p className="text-sm text-blue-400 font-medium mt-1 flex items-center gap-1"><HardHat className="w-3.5 h-3.5" />{wo.assignedTo}</p>}
                          </div>
                          <div className="flex flex-col items-end gap-2 flex-shrink-0">
                            <p className="text-xs text-gray-500">{wo.submitted}</p>
                            {/* Assign dropdown */}
                            <div className="relative">
                              <button
                                onClick={e => { e.stopPropagation(); setAssignDropdown(assignDropdown === wo.id ? null : wo.id); }}
                                className="flex items-center gap-1 px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-xs font-semibold transition">
                                <Send className="w-3 h-3" />
                                {wo.assignedTo ? 'Reassign' : 'Dispatch'}
                                <ChevronDown className="w-3 h-3" />
                              </button>
                              {assignDropdown === wo.id && (
                                <div className="absolute right-0 top-full mt-1 w-52 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl shadow-xl z-20 overflow-hidden">
                                  <div className="px-3 py-2 bg-[#0A0A0A] border-b border-[#2A2A2A]">
                                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Assign to Employee</p>
                                  </div>
                                  {employees.filter(e => e.status !== 'off').map(emp => (
                                    <button key={emp.id} onClick={e => { e.stopPropagation(); assignEmployee(wo.id, emp.name); }}
                                      className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-white/5 transition text-left">
                                      <div className="w-8 h-8 bg-orange-500/15 rounded-full flex items-center justify-center flex-shrink-0">
                                        <span className="text-xs font-bold text-orange-400">{emp.name.charAt(0)}</span>
                                      </div>
                                      <div>
                                        <p className="text-sm font-semibold text-gray-200">{emp.name}</p>
                                        <p className="text-xs text-gray-500">{emp.trade} · <span className={emp.status === 'available' ? 'text-emerald-400 font-medium' : 'text-yellow-400 font-medium'}>{emp.status}</span></p>
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
                                className="text-xs border border-[#2A2A2A] rounded-lg px-2 py-1 bg-[#0A0A0A] text-gray-300 focus:outline-none focus:border-orange-500">
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
                          <div className="mt-3 pt-3 border-t border-[#2A2A2A]">
                            <p className="text-sm text-gray-400 mb-2"><span className="font-semibold text-gray-300">Notes:</span> {wo.notes}</p>
                            <div className="flex gap-2 flex-wrap">
                              <button onClick={e => { e.stopPropagation(); toast.success(`Calling ${wo.customer}...`); }}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 rounded-lg text-xs font-semibold hover:bg-emerald-500/25 transition">
                                <Phone className="w-3.5 h-3.5" /> Call Customer
                              </button>
                              <button onClick={e => { e.stopPropagation(); toast.success('Message sent to tech'); }}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/15 text-blue-400 border border-blue-500/30 rounded-lg text-xs font-semibold hover:bg-blue-500/25 transition">
                                <MessageSquare className="w-3.5 h-3.5" /> Message Tech
                              </button>
                              <button onClick={e => { e.stopPropagation(); toast.success('Work order marked urgent'); }}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/15 text-red-400 border border-red-500/30 rounded-lg text-xs font-semibold hover:bg-red-500/25 transition">
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
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <HardHat className="w-5 h-5 text-orange-400" /> Field Team
                </h3>
                <div className="space-y-3">
                  {employees.map(emp => (
                    <div key={emp.id} className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-4 hover:border-orange-500/40 transition">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-orange-500/15 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="font-bold text-orange-400">{emp.name.charAt(0)}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-white text-sm">{emp.name}</p>
                          <p className="text-xs text-gray-500">{emp.trade}</p>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                            emp.status === 'available' ? 'bg-emerald-500/15 text-emerald-400' :
                            emp.status === 'on-job' ? 'bg-yellow-500/15 text-yellow-400' :
                            'bg-white/10 text-gray-500'
                          }`}>{emp.status}</span>
                          <div className="flex items-center gap-1">
                            <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                            <span className="text-xs text-gray-400">{emp.rating}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-[#2A2A2A]">
                        <span className="text-xs text-gray-500">{emp.jobs} jobs completed</span>
                        <button onClick={() => { navigator.clipboard.writeText(emp.phone).catch(()=>{}); toast.success(`Copied ${emp.phone}`); }}
                          className="text-xs text-blue-400 hover:text-blue-300 font-medium flex items-center gap-1">
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
              <h2 className="text-2xl font-bold text-white">System Alerts</h2>
              <div className="flex items-center gap-3">
                <div className="flex gap-2">
                  {['all', 'critical', 'warning', 'unread'].map(filter => (
                    <button
                      key={filter}
                      onClick={() => setFilterAlerts(filter as any)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        filterAlerts === filter
                          ? 'bg-orange-500 text-white'
                          : 'bg-[#2A2A2A] text-gray-400 hover:bg-[#333]'
                      }`}
                    >
                      {filter.charAt(0).toUpperCase() + filter.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A]">
              <div className="divide-y divide-[#2A2A2A]">
                {filteredAlerts.map(alert => (
                  <div key={alert.id} className="p-4 hover:bg-white/5 transition-colors">
                    <div className="flex items-start gap-4">
                      {getAlertIcon(alert.type)}
                      <div className="flex-1">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="font-semibold text-white">{alert.title}</h3>
                            <p className="text-gray-400 mt-1">{alert.message}</p>
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
                          <span className={`text-xs px-2 py-1 rounded-full ${getStatusBadge(alert.status)}`}>
                            {alert.status}
                          </span>
                        </div>
                      </div>
                      <button className="text-gray-500 hover:text-gray-300">
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
              <h2 className="text-2xl font-bold text-white">Customer Service Tickets</h2>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                  <input
                    type="text"
                    placeholder="Search tickets..."
                    className="pl-10 pr-4 py-2 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg w-64 text-white placeholder:text-gray-500 focus:outline-none focus:border-orange-500"
                  />
                </div>
                <button className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600">
                  New Ticket
                </button>
              </div>
            </div>

            <div className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] overflow-hidden">
              <table className="w-full">
                <thead className="bg-[#0A0A0A] border-b border-[#2A2A2A]">
                  <tr>
                    <th className="text-left px-6 py-3 text-sm font-semibold text-gray-300">Customer</th>
                    <th className="text-left px-6 py-3 text-sm font-semibold text-gray-300">Subject</th>
                    <th className="text-left px-6 py-3 text-sm font-semibold text-gray-300">Priority</th>
                    <th className="text-left px-6 py-3 text-sm font-semibold text-gray-300">Status</th>
                    <th className="text-left px-6 py-3 text-sm font-semibold text-gray-300">Assigned To</th>
                    <th className="text-left px-6 py-3 text-sm font-semibold text-gray-300">Last Update</th>
                    <th className="text-left px-6 py-3 text-sm font-semibold text-gray-300"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2A2A2A]">
                  {tickets.map(ticket => (
                    <tr key={ticket.id} className="hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-blue-500/15 rounded-full flex items-center justify-center">
                            <Users className="w-4 h-4 text-blue-400" />
                          </div>
                          <span className="font-medium text-white">{ticket.customer}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-300">{ticket.subject}</td>
                      <td className="px-6 py-4">
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${getPriorityBadge(ticket.priority)}`}>
                          {ticket.priority}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${getStatusBadge(ticket.status)}`}>
                          {ticket.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-400">{ticket.assignedAgent || 'Unassigned'}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">{ticket.lastUpdate}</td>
                      <td className="px-6 py-4">
                        <button className="text-gray-500 hover:text-gray-300">
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
              <h2 className="text-2xl font-bold text-white">Employee Support Requests</h2>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                  <input
                    type="text"
                    placeholder="Search requests..."
                    className="pl-10 pr-4 py-2 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg w-64 text-white placeholder:text-gray-500 focus:outline-none focus:border-orange-500"
                  />
                </div>
                <button className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600">
                  New Request
                </button>
              </div>
            </div>

            <div className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] overflow-hidden">
              <table className="w-full">
                <thead className="bg-[#0A0A0A] border-b border-[#2A2A2A]">
                  <tr>
                    <th className="text-left px-6 py-3 text-sm font-semibold text-gray-300">Employee</th>
                    <th className="text-left px-6 py-3 text-sm font-semibold text-gray-300">Department</th>
                    <th className="text-left px-6 py-3 text-sm font-semibold text-gray-300">Category</th>
                    <th className="text-left px-6 py-3 text-sm font-semibold text-gray-300">Subject</th>
                    <th className="text-left px-6 py-3 text-sm font-semibold text-gray-300">Status</th>
                    <th className="text-left px-6 py-3 text-sm font-semibold text-gray-300">Created</th>
                    <th className="text-left px-6 py-3 text-sm font-semibold text-gray-300"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2A2A2A]">
                  {employeeRequests.map(request => (
                    <tr key={request.id} className="hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-purple-500/15 rounded-full flex items-center justify-center">
                            <UserCheck className="w-4 h-4 text-purple-400" />
                          </div>
                          <span className="font-medium text-white">{request.employee}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-400">{request.department}</td>
                      <td className="px-6 py-4">
                        <span className="text-xs px-2 py-1 rounded-full font-medium bg-blue-500/15 text-blue-400 border border-blue-500/30">
                          {request.category}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-300">{request.subject}</td>
                      <td className="px-6 py-4">
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${getStatusBadge(request.status)}`}>
                          {request.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">{request.createdAt}</td>
                      <td className="px-6 py-4">
                        <button className="text-gray-500 hover:text-gray-300">
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
