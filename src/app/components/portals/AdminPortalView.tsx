/**
 * Admin Portal - Platform Owner Dashboard
 * Real-time alerts, customer service, and employee support
 */

import React, { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  XCircle,
  Users,
  MessageSquare,
  HeadphonesIcon,
  TrendingUp,
  DollarSign,
  Activity,
  Bell,
  UserCheck,
  Mail,
  Phone,
  ArrowRight,
  Filter,
  Search,
  MoreVertical,
  AlertCircle,
  Zap
} from 'lucide-react';

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
  const [activeTab, setActiveTab] = useState<'overview' | 'alerts' | 'customer-service' | 'employee-support'>('overview');
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
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex gap-6">
            {[
              { id: 'overview', label: 'Overview', icon: Activity },
              { id: 'alerts', label: 'System Alerts', icon: Bell },
              { id: 'customer-service', label: 'Customer Service', icon: MessageSquare },
              { id: 'employee-support', label: 'Employee Support', icon: HeadphonesIcon },
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
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Overview Tab */}
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
