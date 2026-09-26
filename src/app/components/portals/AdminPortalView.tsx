import PortalFeatureGuide from './PortalFeatureGuide';
import InvestmentTab from './InvestmentTab';
/**
 * Admin Portal - Platform Owner Dashboard
 * Real-time alerts, customer service, and employee support
 */

import React, { useCallback, useEffect, useState } from 'react';
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
import AddJobPhotosButton from '../AddJobPhotosButton';
import { projectId } from '../../utils/supabase/info';

const SERVER = `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6`;

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

  /**
   * ── Dispatch Center ──────────────────────────────────────────────────────
   *
   * This was six invented work orders and six invented employees held in this
   * file. Assigning one changed React state and nothing else, so a reload put
   * the same six back and no technician was ever sent anywhere.
   *
   * Every endpoint below already existed and already worked. The screen simply
   * never called them.
   *
   * The assign call is the load-bearing one. It records the employee’s email
   * and id alongside their name, and the employee portal decides which jobs a
   * person may bill time against by matching exactly those fields. Dispatching
   * from here is what puts a job on somebody’s timesheet.
   */
  type WorkOrder = {
    id: string; title: string; customer: string; address: string; phone: string;
    priority: string; status: string; assignedTo: string; assignedToEmail: string;
    trade: string; submitted: string; notes: string;
  };
  type FieldEmployee = {
    id: string; name: string; trade: string; status: string; phone: string; email: string;
    rating?: number; jobs?: number;
  };

  const first = (...values: any[]) => {
    for (const v of values) { const t = String(v ?? '').trim(); if (t) return t; }
    return '';
  };

  /**
   * A stored work request, as the dispatch board needs it.
   *
   * The field names vary by where the record came from — the same spread the
   * server’s own time-tracking module already maps around. Read every spelling
   * rather than picking one and silently showing blanks for the rest.
   */
  function toWorkOrder(r: any): WorkOrder {
    const assignedTo = first(r.assignedTo, r.assigned_to, r.crewName, r.assignedTech);
    const raw = String(r.status || '').toLowerCase().replace(/_/g, '-');
    const status =
      raw.includes('complet') ? 'completed' :
      raw.includes('progress') ? 'in-progress' :
      assignedTo ? 'assigned' : 'unassigned';
    const submitted = first(r.created_at, r.createdAt, r.submittedAt);
    return {
      id: String(r.id || ''),
      title: first(r.title, r.serviceType, r.service_type, r.project_type,
        r.description ? String(r.description).split('\n')[0].slice(0, 80) : '', 'Work order'),
      customer: first(r.client_name, r.customerName, r.clientName, r.client_info?.name, '—'),
      address: first(r.address, r.property_address, r.propertyAddress, r.client_info?.address, 'No address given'),
      phone: first(r.client_phone, r.clientPhone, r.client_info?.phone),
      priority: String(first(r.priority, r.urgency, 'medium')).toLowerCase(),
      status,
      assignedTo,
      assignedToEmail: first(r.assignedToEmail, r.assigned_to_email).toLowerCase(),
      trade: first(r.trade, r.serviceType, r.service_type, r.category, 'General'),
      submitted: submitted ? new Date(submitted).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '—',
      notes: first(r.notes, r.description, 'No notes on this request.'),
    };
  }

  /** A time-tracking employee, as the dispatch board needs them. */
  function toFieldEmployee(e: any): FieldEmployee {
    return {
      id: String(e.id || ''),
      name: first(e.name, e.email, 'Employee'),
      trade: first(e.role, e.department, 'General'),
      // Clocked in means they are on a job right now, which is what a dispatcher needs to know.
      status: e.isActive ? 'on-job' : 'available',
      phone: first(e.phoneNumber, e.phone),
      email: first(e.email).toLowerCase(),
      rating: typeof e.rating === 'number' ? e.rating : undefined,
      jobs: typeof e.jobsCompleted === 'number' ? e.jobsCompleted : undefined,
    };
  }

  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [employees, setEmployees] = useState<FieldEmployee[]>([]);
  const [dispatchLoading, setDispatchLoading] = useState(true);
  const [dispatchError, setDispatchError] = useState<string | null>(null);
  const [rosterError, setRosterError] = useState<string | null>(null);

  const loadDispatch = useCallback(async () => {
    const token = session?.access_token;
    if (!token) {
      setDispatchError('Sign in as an administrator to load dispatch.');
      setDispatchLoading(false);
      return;
    }
    setDispatchLoading(true);
    setDispatchError(null);
    try {
      const auth = { Authorization: `Bearer ${token}` };
      const [woRes, empRes] = await Promise.all([
        fetch(`${SERVER}/work-requests`, { headers: auth }),
        fetch(`${SERVER}/time-tracking/employees`, { headers: auth }),
      ]);

      const woBody = await woRes.json().catch(() => null);
      if (!woRes.ok) throw new Error(woBody?.error || 'Could not load work requests.');
      const rows = Array.isArray(woBody) ? woBody : (woBody?.workRequests || []);
      setWorkOrders(rows.map(toWorkOrder).filter((w: WorkOrder) => w.id));

      /**
       * The roster is gated separately from the work requests. Losing it should
       * cost you the ability to assign, not the sight of the board — so it is
       * reported on its own rather than failing the whole load.
       */
      const empBody = await empRes.json().catch(() => null);
      if (empRes.ok) {
        setEmployees((empBody?.employees || []).map(toFieldEmployee).filter((e: FieldEmployee) => e.id));
        setRosterError(null);
      } else {
        setEmployees([]);
        setRosterError(empBody?.error || 'Could not load the field team.');
      }
    } catch (error: any) {
      setDispatchError(error?.message || 'Could not load dispatch.');
    } finally {
      setDispatchLoading(false);
    }
  }, [session?.access_token]);

  useEffect(() => { loadDispatch(); }, [loadDispatch]);

  const [selectedWO, setSelectedWO] = useState<WorkOrder | null>(null);
  const [assignDropdown, setAssignDropdown] = useState<string | null>(null);
  const [dispatchFilter, setDispatchFilter] = useState<'all' | 'unassigned' | 'assigned' | 'in-progress' | 'completed'>('all');
  const [busyWO, setBusyWO] = useState<string | null>(null);

  /** Dispatch a work order to an employee, for real. */
  async function assignEmployee(woId: string, emp: FieldEmployee) {
    const token = session?.access_token;
    setAssignDropdown(null);
    if (!token) { toast.error('Sign in again to dispatch.'); return; }
    setBusyWO(woId);
    try {
      const res = await fetch(`${SERVER}/property-management/work-requests/${encodeURIComponent(woId)}/assign`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        // The email and id are what a timesheet matches on. A name alone is not enough.
        body: JSON.stringify({ crewName: emp.name, crewEmail: emp.email, employeeId: emp.id }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok || body?.success === false) throw new Error(body?.error || 'Could not dispatch this work order.');
      toast.success(`Work order dispatched to ${emp.name}`);
      await loadDispatch();
    } catch (error: any) {
      toast.error(error?.message || 'Could not dispatch this work order.');
    } finally { setBusyWO(null); }
  }

  /** Write a field back to the work request itself, so it survives a reload. */
  async function patchWorkOrder(woId: string, updates: Record<string, any>, done: string) {
    const token = session?.access_token;
    if (!token) { toast.error('Sign in again to make that change.'); return; }
    setBusyWO(woId);
    try {
      const res = await fetch(`${SERVER}/work-requests/${encodeURIComponent(woId)}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.error || 'Could not save that change.');
      toast.success(done);
      await loadDispatch();
    } catch (error: any) {
      toast.error(error?.message || 'Could not save that change.');
    } finally { setBusyWO(null); }
  }

  const updateStatus = (woId: string, status: string) =>
    patchWorkOrder(woId, { status }, `Status updated to ${status.replace('-', ' ')}`);

  const [filterAlerts, setFilterAlerts] = useState<'all' | 'critical' | 'warning' | 'unread'>('all');

  /**
   * System Alerts reads the store the rest of the platform already writes to.
   *
   * This was five invented alerts about a Stripe outage that never happened.
   * `admin_alerts` is real, and assigning a work order on the Dispatch tab
   * appends to it — so the two tabs are now the same system observed from two
   * ends, which is what makes an empty list meaningful instead of a blank.
   */
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [alertsLoading, setAlertsLoading] = useState(true);
  const [alertsError, setAlertsError] = useState<string | null>(null);

  const loadAlerts = useCallback(async () => {
    const token = session?.access_token;
    if (!token) { setAlertsError('Sign in as an administrator to load alerts.'); setAlertsLoading(false); return; }
    setAlertsLoading(true);
    setAlertsError(null);
    try {
      const res = await fetch(`${SERVER}/notifications/admin-alerts`, { headers: { Authorization: `Bearer ${token}` } });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.error || 'Could not load alerts.');
      const rows: any[] = Array.isArray(body?.alerts) ? body.alerts : [];
      setAlerts(rows.map((a: any): Alert => ({
        id: String(a.id || crypto.randomUUID()),
        // Producers write different type words; anything unrecognised is information, not a crisis.
        type: ['critical', 'warning', 'info', 'success'].includes(String(a.type)) ? a.type : 'info',
        title: String(a.title || 'Alert'),
        message: String(a.description || a.message || ''),
        timestamp: a.timestamp ? new Date(a.timestamp).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '',
        source: String(a.source || a.category || 'Platform'),
        status: ['unread', 'read', 'resolved'].includes(String(a.status)) ? a.status : 'unread',
        assignedTo: a.assignedTo || undefined,
      })));
    } catch (error: any) {
      setAlertsError(error?.message || 'Could not load alerts.');
    } finally { setAlertsLoading(false); }
  }, [session?.access_token]);

  useEffect(() => { loadAlerts(); }, [loadAlerts]);

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
            {/* Job photos, reachable without leaving the portal. An admin is
                the one who publishes them, so the shortcut to add and the
                shortcut to review sit together. */}
            <div className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] p-4 mb-6 flex items-center justify-between flex-wrap gap-3">
              <div>
                <h2 className="text-sm font-bold text-white">Job photos</h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  Added photos stay private until you publish them to the website.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <AddJobPhotosButton label="Add job photos" compact />
                <button
                  onClick={() => {
                    const nav = (window as any).__navigateApp;
                    if (typeof nav === 'function') nav('job-photos');
                    else window.location.assign('/job-photos');
                  }}
                  className="px-3 py-2 rounded-xl text-xs font-semibold text-gray-300 hover:bg-white/5"
                  style={{ border: '1px solid rgba(255,255,255,0.12)' }}
                >
                  Manage &amp; publish
                </button>
              </div>
            </div>

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

            {/*
              One card, not three. User Management, Revenue Analytics and System
              Analytics were three tiles that all opened the Unified Dashboard —
              three doors into one room, which reads as three places to look and
              wastes two of them.
            */}
            <div className="grid grid-cols-1 gap-4">
              <button
                onClick={() => onNavigate('unified-dashboard')}
                className="bg-[#1A1A1A] border border-[#2A2A2A] hover:border-orange-500/50 text-left text-white rounded-2xl p-6 transition-all"
              >
                <TrendingUp className="w-8 h-8 mb-2 text-orange-400" />
                <p className="font-semibold">Analytics</p>
                <p className="text-sm text-gray-400 mt-1">Users, revenue and platform performance, in the Unified Dashboard</p>
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
                  {dispatchLoading && (
                    <p className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-8 text-center text-sm text-gray-400">Loading work orders…</p>
                  )}
                  {!dispatchLoading && dispatchError && (
                    <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-6 text-center">
                      <p className="text-sm text-red-300">{dispatchError}</p>
                      <button onClick={loadDispatch} className="mt-3 rounded-lg bg-[#2A2A2A] px-3 py-1.5 text-xs font-semibold text-gray-200 hover:bg-[#333]">Try again</button>
                    </div>
                  )}
                  {/*
                    An empty board is the honest answer when nobody has raised work,
                    and it is the expected one on a platform with no customers in it
                    yet. It used to show six invented jobs instead.
                  */}
                  {!dispatchLoading && !dispatchError && workOrders.filter(wo => dispatchFilter === 'all' || wo.status === dispatchFilter).length === 0 && (
                    <p className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-8 text-center text-sm text-gray-400">
                      {workOrders.length === 0 ? 'No work requests have been submitted yet.' : 'No work orders are in that state.'}
                    </p>
                  )}
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
                                  {employees.length === 0 && (
                                    <p className="px-3 py-3 text-xs text-gray-500">
                                      {rosterError || 'No field team members yet. Add them in time tracking.'}
                                    </p>
                                  )}
                                  {employees.map(emp => (
                                    <button key={emp.id} onClick={e => { e.stopPropagation(); assignEmployee(wo.id, emp); }}
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
                              {/*
                                These three used to raise a success toast and do nothing at all —
                                no call placed, no technician messaged, no urgency recorded. A
                                button that claims to have called somebody is worse than no
                                button, because the job then looks handled.

                                They now either do the real thing or are not shown.
                              */}
                              {wo.phone ? (
                                <a href={`tel:${wo.phone.replace(/[^+\d]/g, '')}`} onClick={e => e.stopPropagation()}
                                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 rounded-lg text-xs font-semibold hover:bg-emerald-500/25 transition">
                                  <Phone className="w-3.5 h-3.5" /> Call {wo.customer}
                                </a>
                              ) : (
                                <span className="px-3 py-1.5 text-xs text-gray-500">No phone number on this request</span>
                              )}

                              {(() => {
                                const tech = employees.find(emp =>
                                  (wo.assignedToEmail && emp.email === wo.assignedToEmail) || emp.name === wo.assignedTo);
                                if (!tech?.phone) return null;
                                return (
                                  <a href={`sms:${tech.phone.replace(/[^+\d]/g, '')}`} onClick={e => e.stopPropagation()}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/15 text-blue-400 border border-blue-500/30 rounded-lg text-xs font-semibold hover:bg-blue-500/25 transition">
                                    <MessageSquare className="w-3.5 h-3.5" /> Text {tech.name}
                                  </a>
                                );
                              })()}

                              {wo.priority !== 'urgent' && (
                                <button disabled={busyWO === wo.id}
                                  onClick={e => { e.stopPropagation(); patchWorkOrder(wo.id, { priority: 'urgent' }, 'Work order marked urgent'); }}
                                  className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/15 text-red-400 border border-red-500/30 rounded-lg text-xs font-semibold hover:bg-red-500/25 transition disabled:opacity-50">
                                  <AlertTriangle className="w-3.5 h-3.5" /> Flag Urgent
                                </button>
                              )}
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
                  {employees.length === 0 && (
                    <p className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-6 text-center text-sm text-gray-400">
                      {rosterError || 'Nobody is on the field team yet. Employees appear here once they exist in time tracking.'}
                    </p>
                  )}
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
                          {emp.rating !== undefined && (
                            <div className="flex items-center gap-1">
                              <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                              <span className="text-xs text-gray-400">{emp.rating}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-[#2A2A2A]">
                        <span className="text-xs text-gray-500">{emp.jobs !== undefined ? `${emp.jobs} jobs completed` : emp.trade}</span>
                        {emp.phone ? (
                          <button onClick={() => { navigator.clipboard.writeText(emp.phone).catch(()=>{}); toast.success(`Copied ${emp.phone}`); }}
                            className="text-xs text-blue-400 hover:text-blue-300 font-medium flex items-center gap-1">
                            <Phone className="w-3 h-3" /> {emp.phone}
                          </button>
                        ) : (
                          <span className="text-xs text-gray-600">No phone on file</span>
                        )}
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
                {alertsLoading && <p className="p-8 text-center text-sm text-gray-400">Loading alerts…</p>}
                {!alertsLoading && alertsError && (
                  <div className="p-6 text-center">
                    <p className="text-sm text-red-300">{alertsError}</p>
                    <button onClick={loadAlerts} className="mt-3 rounded-lg bg-[#2A2A2A] px-3 py-1.5 text-xs font-semibold text-gray-200 hover:bg-[#333]">Try again</button>
                  </div>
                )}
                {!alertsLoading && !alertsError && filteredAlerts.length === 0 && (
                  <p className="p-8 text-center text-sm text-gray-400">
                    {alerts.length === 0 ? 'Nothing has raised an alert.' : 'No alerts match that filter.'}
                  </p>
                )}
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
