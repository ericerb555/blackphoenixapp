/**
 * Admin Portal — full command center for Black Phoenix admin/owner.
 * Real-time data across all business operations in one view.
 */

import { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import {
  LayoutDashboard, FileText, Users, DollarSign, Bell, MessageSquare,
  Wrench, TrendingUp, Settings, ChevronRight, RefreshCw, X,
  CheckCircle, AlertCircle, Clock, ArrowRight, Star, Package,
  Calendar, Phone, Mail, MapPin, Eye, Plus, Activity,
  BarChart3, PieChart, Building2, Hammer, Trash2, Home
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { supabase } from '../lib/supabase';

const SERVER = `https://${projectId}.supabase.co/functions/v1/make-server-57095a78`;

interface Props { onNavigate?: (page: string) => void; }

const NAV_ITEMS = [
  { id: 'overview',      label: 'Overview',         icon: LayoutDashboard },
  { id: 'work-requests', label: 'Work Requests',     icon: FileText },
  { id: 'pipeline',      label: 'Pipeline',          icon: Hammer },
  { id: 'customers',     label: 'Customers',         icon: Users },
  { id: 'messages',      label: 'Messages',          icon: MessageSquare },
  { id: 'reviews',       label: 'Reviews',           icon: Star },
  { id: 'follow-ups',    label: 'Follow-ups',        icon: Bell },
  { id: 'financials',    label: 'Financials',        icon: DollarSign },
  { id: 'analytics',     label: 'Analytics',         icon: BarChart3 },
  { id: 'settings',      label: 'Settings',          icon: Settings },
];

export default function AdminPortalPage({ onNavigate }: Props) {
  const [activeTab, setActiveTab] = useState('overview');
  const [workRequests, setWorkRequests] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [followUps, setFollowUps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => { loadAll(); }, []);

  const getToken = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || publicAnonKey;
  };

  const loadAll = async () => {
    setLoading(true);
    const token = await getToken();
    const headers = { Authorization: `Bearer ${token}` };
    try {
      const [wrRes, revRes, fuRes] = await Promise.all([
        fetch(`${SERVER}/work-requests`, { headers }),
        fetch(`${SERVER}/reviews?status=all`, { headers }),
        fetch(`${SERVER}/follow-ups`, { headers }),
      ]);
      if (wrRes.ok) { const d = await wrRes.json(); setWorkRequests(Array.isArray(d) ? d : (d.workRequests || [])); }
      if (revRes.ok) { const d = await revRes.json(); setReviews(d.reviews || []); }
      if (fuRes.ok) { const d = await fuRes.json(); setFollowUps(d.followUps || []); }
    } catch {}
    setLoading(false);
  };

  // Stats
  const stats = {
    totalRequests: workRequests.length,
    pending: workRequests.filter(r => r.status === 'pending' || r.status === 'opened').length,
    inProgress: workRequests.filter(r => r.status === 'in-progress').length,
    completed: workRequests.filter(r => r.status === 'completed').length,
    pendingReviews: reviews.filter(r => r.status === 'pending').length,
    pendingFollowUps: followUps.filter(f => f.status === 'pending').length,
    avgRating: reviews.filter(r => r.status === 'approved').length > 0
      ? (reviews.filter(r => r.status === 'approved').reduce((s, r) => s + r.rating, 0) / reviews.filter(r => r.status === 'approved').length).toFixed(1)
      : '—',
  };

  const navigate = (page: string) => onNavigate ? onNavigate(page) : (window.location.href = `/${page}`);

  return (
    <div className="flex h-screen bg-[#0A0A0A] text-white overflow-hidden">
      {/* ── SIDEBAR ─────────────────────────────────────────────────────── */}
      <div className={`flex-shrink-0 bg-[#111] border-r border-[#2A2A2A] flex flex-col transition-all duration-200 ${sidebarOpen ? 'w-56' : 'w-16'}`}>
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 py-5 border-b border-[#2A2A2A]">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-600 to-red-600 flex items-center justify-center flex-shrink-0">
            <Building2 className="w-4 h-4 text-white" />
          </div>
          {sidebarOpen && <span className="font-bold text-sm text-white leading-tight">Black Phoenix<br /><span className="text-orange-400 text-xs font-normal">Admin Portal</span></span>}
        </div>

        {/* Nav */}
        <nav className="flex-1 py-3 space-y-0.5 overflow-y-auto">
          {NAV_ITEMS.map(item => {
            const Icon = item.icon;
            const badge =
              item.id === 'work-requests' ? stats.pending :
              item.id === 'reviews' ? stats.pendingReviews :
              item.id === 'follow-ups' ? stats.pendingFollowUps : 0;
            return (
              <button key={item.id} onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition relative ${
                  activeTab === item.id
                    ? 'bg-orange-600/20 text-orange-400 border-r-2 border-orange-500'
                    : 'text-gray-400 hover:bg-white/5 hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                {sidebarOpen && <span className="flex-1 text-left">{item.label}</span>}
                {badge > 0 && sidebarOpen && (
                  <span className="px-1.5 py-0.5 bg-orange-500 text-white text-[10px] font-bold rounded-full">{badge}</span>
                )}
                {badge > 0 && !sidebarOpen && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-orange-500 rounded-full" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Bottom links */}
        <div className="border-t border-[#2A2A2A] p-3 space-y-1">
          {[
            { label: 'Command Center', page: 'unified-dashboard', icon: LayoutDashboard },
            { label: 'Pipeline', page: 'unified-project-pipeline', icon: Hammer },
            { label: "Owner's Dashboard", page: 'owners-dashboard', icon: Building2 },
          ].map(link => (
            <button key={link.page} onClick={() => navigate(link.page)}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-500 hover:text-white hover:bg-white/5 rounded-lg transition">
              <link.icon className="w-3.5 h-3.5 flex-shrink-0" />
              {sidebarOpen && link.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── MAIN CONTENT ────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <div className="flex items-center justify-between px-5 py-3 bg-[#111] border-b border-[#2A2A2A] flex-shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-1.5 hover:bg-white/10 rounded-lg transition">
              <Activity className="w-4 h-4 text-gray-400" />
            </button>
            <h1 className="text-sm font-semibold text-white capitalize">{activeTab.replace('-', ' ')}</h1>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={loadAll} className="p-1.5 hover:bg-white/10 rounded-lg transition"><RefreshCw className={`w-4 h-4 text-gray-400 ${loading ? 'animate-spin' : ''}`} /></button>
            <button onClick={() => navigate('unified-dashboard')} className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-600/20 hover:bg-orange-600/30 border border-orange-500/30 text-orange-300 text-xs font-semibold rounded-lg transition">
              Command Center <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {activeTab === 'overview' && <OverviewTab stats={stats} workRequests={workRequests} reviews={reviews} followUps={followUps} navigate={navigate} />}
          {activeTab === 'work-requests' && <WorkRequestsTab workRequests={workRequests} navigate={navigate} reload={loadAll} getToken={getToken} />}
          {activeTab === 'pipeline' && <QuickNav navigate={navigate} page="unified-project-pipeline" label="Open Project Pipeline" desc="Manage quotes, contracts, and job workflow" icon={Hammer} />}
          {activeTab === 'customers' && <CustomersTab workRequests={workRequests} navigate={navigate} />}
          {activeTab === 'messages' && <QuickNav navigate={navigate} page="admin-alerts" label="Open Messages & Alerts" desc="View all customer messages and admin alerts" icon={MessageSquare} />}
          {activeTab === 'reviews' && <ReviewsTab reviews={reviews} reload={loadAll} getToken={getToken} />}
          {activeTab === 'follow-ups' && <FollowUpsTab followUps={followUps} reload={loadAll} getToken={getToken} />}
          {activeTab === 'financials' && <QuickNav navigate={navigate} page="invoices" label="Open Financial Management" desc="Invoices, payments, and financial reports" icon={DollarSign} />}
          {activeTab === 'analytics' && <AnalyticsTab stats={stats} workRequests={workRequests} reviews={reviews} />}
          {activeTab === 'settings' && <SettingsTab navigate={navigate} />}
        </div>
      </div>
    </div>
  );
}

// ── OVERVIEW ─────────────────────────────────────────────────────────────────
function OverviewTab({ stats, workRequests, reviews, followUps, navigate }: any) {
  const recent = [...workRequests].sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()).slice(0, 5);
  return (
    <div className="space-y-5">
      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Requests', value: stats.totalRequests, sub: `${stats.pending} pending`, color: 'orange', icon: FileText },
          { label: 'In Progress', value: stats.inProgress, sub: 'Active projects', color: 'blue', icon: Hammer },
          { label: 'Avg Rating', value: stats.avgRating, sub: `${reviews.filter((r: any) => r.status === 'approved').length} reviews`, color: 'yellow', icon: Star },
          { label: 'Follow-ups Due', value: stats.pendingFollowUps, sub: 'Scheduled', color: 'purple', icon: Bell },
        ].map(card => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs text-gray-500">{card.label}</p>
                <div className={`w-8 h-8 rounded-lg bg-${card.color}-500/20 flex items-center justify-center`}>
                  <Icon className={`w-4 h-4 text-${card.color}-400`} />
                </div>
              </div>
              <p className="text-2xl font-bold text-white">{card.value}</p>
              <p className="text-xs text-gray-500 mt-1">{card.sub}</p>
            </div>
          );
        })}
      </div>

      {/* Recent work requests + actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-white">Recent Work Requests</h3>
            <button onClick={() => navigate('work-request-viewer')} className="text-xs text-orange-400 hover:text-orange-300">View all →</button>
          </div>
          {recent.length === 0 ? <p className="text-gray-500 text-sm">No requests yet</p> : (
            <div className="space-y-3">
              {recent.map((wr: any) => (
                <div key={wr.id} className="flex items-center justify-between py-2 border-b border-[#2A2A2A] last:border-0">
                  <div>
                    <p className="text-sm font-medium text-white">{wr.client_name || 'Customer'}</p>
                    <p className="text-xs text-gray-500">{wr.serviceType || wr.project_type || 'Service request'}</p>
                  </div>
                  <StatusBadge status={wr.status} />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-5">
          <h3 className="font-semibold text-white mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'View Pipeline', page: 'unified-project-pipeline', icon: Hammer, color: 'orange' },
              { label: 'Admin Alerts', page: 'admin-alerts', icon: Bell, color: 'red' },
              { label: 'Before/After', page: 'gallery', icon: Eye, color: 'blue' },
              { label: 'Work Requests', page: 'work-request-viewer', icon: FileText, color: 'green' },
              { label: 'Labor Rates', page: 'labor-rates-config', icon: Settings, color: 'purple' },
              { label: 'Content', page: 'enterprise-content-center', icon: Package, color: 'pink' },
            ].map(action => {
              const Icon = action.icon;
              return (
                <button key={action.page} onClick={() => navigate(action.page)}
                  className={`flex items-center gap-2 p-3 bg-${action.color}-500/10 hover:bg-${action.color}-500/20 border border-${action.color}-500/30 rounded-xl text-sm font-medium text-${action.color}-300 transition`}>
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  {action.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── WORK REQUESTS TAB ────────────────────────────────────────────────────────
function WorkRequestsTab({ workRequests, navigate, reload, getToken }: any) {
  const [filter, setFilter] = useState('all');
  const filtered = filter === 'all' ? workRequests : workRequests.filter((r: any) => r.status === filter);

  const updateStatus = async (id: string, status: string) => {
    const token = await getToken();
    await fetch(`${SERVER}/work-requests/${id}`, {
      method: 'PUT', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    toast.success(`Status updated to ${status}`);
    reload();
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        {['all', 'pending', 'opened', 'in-progress', 'quote-sent', 'completed'].map(s => (
          <button key={s} onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition capitalize ${filter === s ? 'bg-orange-600 text-white' : 'bg-[#1A1A1A] border border-[#2A2A2A] text-gray-400 hover:text-white'}`}>
            {s} {s !== 'all' && <span className="ml-1 opacity-60">({workRequests.filter((r: any) => r.status === s).length})</span>}
          </button>
        ))}
        <button onClick={() => navigate('work-request-viewer')} className="ml-auto flex items-center gap-1 px-3 py-1.5 bg-orange-600/20 border border-orange-500/30 text-orange-300 text-xs font-semibold rounded-lg transition hover:bg-orange-600/30">
          <Eye className="w-3.5 h-3.5" /> View Full Requests
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-10 text-center text-gray-500">
          <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p>No {filter === 'all' ? '' : filter} work requests</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((wr: any) => (
            <div key={wr.id} className="bg-[#1A1A1A] border border-[#2A2A2A] hover:border-orange-500/30 rounded-xl p-4 transition">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-semibold text-white truncate">{wr.client_name || 'Customer'}</p>
                    <StatusBadge status={wr.status} />
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                    {wr.client_email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{wr.client_email}</span>}
                    {wr.client_phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{wr.client_phone}</span>}
                    {(wr.site_address || wr.city) && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{wr.site_address || wr.city}</span>}
                    <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{wr.created_at ? new Date(wr.created_at).toLocaleDateString() : 'Recent'}</span>
                  </div>
                  {(wr.serviceType || wr.project_type) && <p className="text-xs text-orange-400 mt-1">{wr.serviceType || wr.project_type}</p>}
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                <button onClick={() => navigate('unified-project-pipeline')} className="text-xs px-3 py-1.5 bg-orange-600/20 border border-orange-500/30 text-orange-300 rounded-lg hover:bg-orange-600/30 transition">Open in Pipeline</button>
                {wr.status === 'pending' && <button onClick={() => updateStatus(wr.id, 'opened')} className="text-xs px-3 py-1.5 bg-blue-600/20 border border-blue-500/30 text-blue-300 rounded-lg hover:bg-blue-600/30 transition">Mark Opened</button>}
                {wr.status === 'opened' && <button onClick={() => updateStatus(wr.id, 'in-progress')} className="text-xs px-3 py-1.5 bg-green-600/20 border border-green-500/30 text-green-300 rounded-lg hover:bg-green-600/30 transition">Start Work</button>}
                {wr.status === 'in-progress' && <button onClick={() => updateStatus(wr.id, 'completed')} className="text-xs px-3 py-1.5 bg-purple-600/20 border border-purple-500/30 text-purple-300 rounded-lg hover:bg-purple-600/30 transition">Mark Complete</button>}
                {wr.client_email && <a href={`mailto:${wr.client_email}?subject=Re: Your ${wr.serviceType || 'Work'} Request`} className="text-xs px-3 py-1.5 bg-white/5 border border-[#2A2A2A] text-gray-400 hover:text-white rounded-lg transition">Email</a>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── CUSTOMERS TAB ────────────────────────────────────────────────────────────
function CustomersTab({ workRequests, navigate }: any) {
  // Build unique customers from work requests
  const customers: any[] = [];
  const seen = new Set();
  workRequests.forEach((wr: any) => {
    const email = wr.client_email || wr.clientEmail;
    if (email && !seen.has(email)) {
      seen.add(email);
      customers.push({ name: wr.client_name || wr.clientName || 'Customer', email, phone: wr.client_phone || wr.clientPhone, requests: workRequests.filter((r: any) => (r.client_email || r.clientEmail) === email).length });
    }
  });

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-500">{customers.length} unique customers from work requests</p>
      {customers.length === 0 ? (
        <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-10 text-center text-gray-500">
          <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p>No customers yet</p>
        </div>
      ) : (
        customers.map(c => (
          <div key={c.email} className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-600 to-red-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                {c.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="font-semibold text-white text-sm">{c.name}</p>
                <p className="text-xs text-gray-500">{c.email} {c.phone && `· ${c.phone}`}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-500">{c.requests} request{c.requests !== 1 ? 's' : ''}</span>
              <a href={`mailto:${c.email}`} className="p-1.5 hover:bg-white/10 rounded-lg transition"><Mail className="w-4 h-4 text-gray-400" /></a>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

// ── REVIEWS TAB ──────────────────────────────────────────────────────────────
function ReviewsTab({ reviews, reload, getToken }: any) {
  const update = async (id: string, status: string, response?: string) => {
    const token = await getToken();
    await fetch(`${SERVER}/reviews/${id}`, {
      method: 'PUT', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, response }),
    });
    toast.success(status === 'approved' ? 'Review approved and live!' : 'Review rejected');
    reload();
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2 text-xs">
        {['pending', 'approved', 'rejected'].map(s => (
          <span key={s} className={`px-2 py-1 rounded-full ${s === 'pending' ? 'bg-yellow-500/20 text-yellow-400' : s === 'approved' ? 'bg-green-500/20 text-green-400' : 'bg-gray-700 text-gray-400'}`}>
            {reviews.filter((r: any) => r.status === s).length} {s}
          </span>
        ))}
      </div>
      {reviews.map((rev: any) => (
        <div key={rev.id} className={`bg-[#1A1A1A] border rounded-xl p-4 space-y-3 ${rev.status === 'pending' ? 'border-yellow-500/40' : rev.status === 'approved' ? 'border-green-500/30' : 'border-[#2A2A2A]'}`}>
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                {[1,2,3,4,5].map(s => <span key={s} className={s <= rev.rating ? 'text-yellow-400' : 'text-gray-700'}>★</span>)}
                <span className={`text-xs px-2 py-0.5 rounded-full ${rev.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' : rev.status === 'approved' ? 'bg-green-500/20 text-green-400' : 'bg-gray-700 text-gray-400'}`}>{rev.status}</span>
              </div>
              <p className="text-sm text-gray-200 italic">"{rev.reviewText}"</p>
              <p className="text-xs text-gray-500 mt-1">{rev.customerName} · {rev.serviceType} · {new Date(rev.createdAt).toLocaleDateString()}</p>
            </div>
          </div>
          {rev.status !== 'approved' && (
            <div className="flex gap-2">
              <button onClick={() => update(rev.id, 'approved')} className="text-xs px-3 py-1.5 bg-green-600/20 border border-green-500/30 text-green-400 rounded-lg hover:bg-green-600/30 transition">✓ Approve & Publish</button>
              <button onClick={() => update(rev.id, 'rejected')} className="text-xs px-3 py-1.5 bg-red-600/20 border border-red-500/30 text-red-400 rounded-lg hover:bg-red-600/30 transition">✕ Reject</button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ── FOLLOW-UPS TAB ───────────────────────────────────────────────────────────
function FollowUpsTab({ followUps, reload, getToken }: any) {
  const processDue = async () => {
    const token = await getToken();
    const res = await fetch(`${SERVER}/follow-ups/process`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
    const d = await res.json();
    toast.success(d.processed > 0 ? `${d.processed} follow-up(s) sent!` : 'No due follow-ups');
    reload();
  };

  const pending = followUps.filter((f: any) => f.status === 'pending');
  const sent = followUps.filter((f: any) => f.status === 'sent');

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-2 text-xs">
          <span className="px-2 py-1 rounded-full bg-yellow-500/20 text-yellow-400">{pending.length} pending</span>
          <span className="px-2 py-1 rounded-full bg-green-500/20 text-green-400">{sent.length} sent</span>
        </div>
        <button onClick={processDue} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600/20 border border-blue-500/30 text-blue-300 text-xs font-semibold rounded-lg hover:bg-blue-600/30 transition">
          <RefreshCw className="w-3.5 h-3.5" /> Process Due Now
        </button>
      </div>

      {followUps.length === 0 ? (
        <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-10 text-center text-gray-500">
          <Bell className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p>No follow-ups scheduled</p>
          <p className="text-sm mt-1">Follow-ups auto-schedule when you send a quote</p>
        </div>
      ) : (
        [...pending, ...sent, ...followUps.filter((f: any) => f.status === 'cancelled')].map(fu => (
          <div key={fu.id} className={`bg-[#1A1A1A] border rounded-xl p-4 ${fu.status === 'pending' ? 'border-yellow-500/40' : fu.status === 'sent' ? 'border-green-500/30' : 'border-[#2A2A2A]'}`}>
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${fu.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' : fu.status === 'sent' ? 'bg-green-500/20 text-green-400' : 'bg-gray-700 text-gray-400'}`}>{fu.status}</span>
                  <span className="text-xs text-gray-500">{fu.dayLabel} follow-up</span>
                </div>
                <p className="font-semibold text-white text-sm">{fu.clientName}</p>
                <p className="text-xs text-gray-500">{fu.serviceType} · {fu.status === 'sent' ? `Sent ${new Date(fu.sentAt).toLocaleDateString()}` : `Scheduled ${new Date(fu.scheduledAt).toLocaleDateString()}`}</p>
              </div>
              {fu.approvalUrl && <a href={fu.approvalUrl} target="_blank" rel="noopener noreferrer" className="text-xs px-3 py-1.5 bg-white/5 border border-[#2A2A2A] text-gray-400 hover:text-white rounded-lg transition">View Quote</a>}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

// ── ANALYTICS TAB ────────────────────────────────────────────────────────────
function AnalyticsTab({ stats, workRequests, reviews }: any) {
  const byService: Record<string, number> = {};
  workRequests.forEach((r: any) => {
    const s = r.serviceType || r.project_type || 'Other';
    byService[s] = (byService[s] || 0) + 1;
  });
  const topServices = Object.entries(byService).sort((a, b) => b[1] - a[1]).slice(0, 6);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {[
          { label: 'Total Work Requests', value: stats.totalRequests },
          { label: 'Completed Projects', value: stats.completed },
          { label: 'Completion Rate', value: stats.totalRequests > 0 ? `${Math.round((stats.completed / stats.totalRequests) * 100)}%` : '—' },
          { label: 'Avg Star Rating', value: stats.avgRating },
          { label: 'Total Reviews', value: reviews.length },
          { label: 'Pending Follow-ups', value: stats.pendingFollowUps },
        ].map(m => (
          <div key={m.label} className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-4">
            <p className="text-xs text-gray-500 mb-1">{m.label}</p>
            <p className="text-2xl font-bold text-white">{m.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-5">
        <h3 className="font-semibold text-white mb-4">Requests by Service Type</h3>
        {topServices.length === 0 ? <p className="text-gray-500 text-sm">No data yet</p> : (
          <div className="space-y-3">
            {topServices.map(([service, count]) => {
              const pct = stats.totalRequests > 0 ? (count / stats.totalRequests) * 100 : 0;
              return (
                <div key={service}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-300">{service}</span>
                    <span className="text-white font-semibold">{count}</span>
                  </div>
                  <div className="h-2 bg-[#2A2A2A] rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-orange-600 to-red-600 rounded-full transition-all" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ── SETTINGS TAB ─────────────────────────────────────────────────────────────
function SettingsTab({ navigate }: any) {
  const settingsLinks = [
    { label: 'Labor Rates & Pricing', desc: 'Set hourly rates used in AI quotes', page: 'labor-rates-config', icon: DollarSign },
    { label: 'Company Profile', desc: 'Business info, logo, contact details', page: 'company-profile', icon: Building2 },
    { label: 'Landing Page Editor', desc: 'Customize the public landing page', page: 'landing-page-editor', icon: Home },
    { label: 'User Management', desc: 'Manage roles and permissions', page: 'user-management-hub', icon: Users },
    { label: 'Module Manager', desc: 'Enable/disable platform features', page: 'module-manager', icon: Package },
    { label: 'Fix My Logo', desc: 'Publish logo to live site', page: 'fix-my-logo', icon: Eye },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {settingsLinks.map(link => {
        const Icon = link.icon;
        return (
          <button key={link.page} onClick={() => navigate(link.page)}
            className="flex items-center gap-4 p-4 bg-[#1A1A1A] border border-[#2A2A2A] hover:border-orange-500/30 rounded-xl text-left transition group">
            <div className="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center flex-shrink-0">
              <Icon className="w-5 h-5 text-orange-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-white text-sm">{link.label}</p>
              <p className="text-xs text-gray-500">{link.desc}</p>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-orange-400 transition" />
          </button>
        );
      })}
    </div>
  );
}

// ── Quick Nav (for tabs that just link out) ───────────────────────────────────
function QuickNav({ navigate, page, label, desc, icon: Icon }: any) {
  return (
    <div className="flex items-center justify-center h-64">
      <button onClick={() => navigate(page)} className="flex flex-col items-center gap-4 p-8 bg-[#1A1A1A] border border-[#2A2A2A] hover:border-orange-500/40 rounded-2xl transition group max-w-sm">
        <div className="w-16 h-16 rounded-2xl bg-orange-500/20 flex items-center justify-center">
          <Icon className="w-8 h-8 text-orange-400" />
        </div>
        <div className="text-center">
          <p className="font-bold text-white text-lg">{label}</p>
          <p className="text-gray-500 text-sm mt-1">{desc}</p>
        </div>
        <span className="flex items-center gap-2 text-orange-400 text-sm font-semibold">Open <ArrowRight className="w-4 h-4" /></span>
      </button>
    </div>
  );
}

// ── Status Badge ──────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    pending:      'bg-yellow-500/20 text-yellow-400',
    opened:       'bg-blue-500/20 text-blue-400',
    'in-progress':'bg-orange-500/20 text-orange-400',
    'quote-sent': 'bg-purple-500/20 text-purple-400',
    completed:    'bg-green-500/20 text-green-400',
  };
  return <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold capitalize ${colors[status] || 'bg-gray-700 text-gray-400'}`}>{status?.replace('-', ' ')}</span>;
}
