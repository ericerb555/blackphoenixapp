import PortalFeatureGuide from './PortalFeatureGuide';
import { MessagesTab, MessagesBell, MessagesTabBadge, usePortalMessages } from './PortalMessagesSystem';
import MaintenancePlanTracker from './MaintenancePlanTracker';
import PlanBuilderTab from './PlanBuilderTab';
import InvestmentTab from './InvestmentTab';
import { useState, useEffect } from 'react';
import { toast } from 'sonner@2.0.3';
import { useAuth } from '../../contexts/AuthContext';
import { projectId } from '../../utils/supabase/info';

const TIME_API = `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6/time-tracking`;
import {
  Briefcase, Bell, MessageSquare, Settings, Clock, Star,
  ArrowUpRight, ClipboardList, CheckCircle, Calendar,
  Target, FileText, Download, ChevronRight, Search, Filter,
  Home, BarChart3, Award, Sparkles, DollarSign
} from 'lucide-react';
import { ChartContainer } from '../ChartContainer';
import { PrimaryButton } from '../ui/button/PrimaryButton';
import { SecondaryButton } from '../ui/button/SecondaryButton';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import LogoMarquee from '../LogoMarquee';
import AdvertisingMarquee from '../AdvertisingMarquee';
import AdvertisingVideoReel from '../AdvertisingVideoReel';
import ReferralRewards from '../ReferralRewards';
import AddJobPhotosButton from '../AddJobPhotosButton';

export default function EmployeePortalView() {
  
  // Messages system
  const { unread: unreadMessages, clearUnread } = usePortalMessages('', '');
  const [activeTab, setActiveTab] = useState<'dashboard' | 'schedule' | 'tasks' | 'timesheet' | 'documents' | 'plan-tracker' | 'plan-builder' | 'performance' | 'referrals' | 'investments' | 'messages' | 'guide'>('dashboard');

  // Mock employee data — pulled from RoleSwitcher demo profile if present
  // ---------------------------------------------------------------------------
  // The time clock, and the hours behind it.
  //
  // `time-tracking.tsx` has had punch-in, punch-out, breaks, entries, approval
  // and payroll all along — this screen simply never called any of it. The Clock
  // In button had no handler and every figure below was a literal.
  //
  // Hours are billed to work orders, and a work order here is a work request.
  // The rule that governs the whole timesheet: the hours allocated across work
  // orders must equal the hours actually clocked. The server enforces that; this
  // screen's job is to make the gap visible while it is being corrected.
  // ---------------------------------------------------------------------------
  const { user, session } = useAuth();
  const [employee, setEmployee] = useState<any>(null);
  const [activeEntry, setActiveEntry] = useState<any>(null);
  const [entries, setEntries] = useState<any[]>([]);
  const [myWorkOrders, setMyWorkOrders] = useState<any[]>([]);
  const [clockBusy, setClockBusy] = useState(false);
  const [timeLoading, setTimeLoading] = useState(true);
  const [timeError, setTimeError] = useState<string | null>(null);
  // The entry being re-split, and the rows as they are being edited.
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [draftRows, setDraftRows] = useState<Array<{ workOrderId: string; hours: string; note: string }>>([]);
  const [savingRows, setSavingRows] = useState(false);

  // Ticks only while the clock is running. A punch card that shows a frozen
  // number is worse than one that shows none — the whole point is watching the
  // shift accumulate.
  const [nowTick, setNowTick] = useState(() => Date.now());
  useEffect(() => {
    if (!activeEntry?.punchIn) return;
    const id = setInterval(() => setNowTick(Date.now()), 1000);
    return () => clearInterval(id);
  }, [activeEntry?.punchIn]);

  const elapsed = (() => {
    if (!activeEntry?.punchIn) return null;
    const ms = Math.max(0, nowTick - new Date(activeEntry.punchIn).getTime());
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    return { h, m, s, hours: Math.round((ms / 3600000) * 100) / 100 };
  })();

  const authHeaders = () => ({ Authorization: `Bearer ${session?.access_token || ''}`, 'Content-Type': 'application/json' });
  const employeeId = String(employee?.id || user?.id || '');

  const loadTime = async () => {
    if (!session?.access_token || !user?.id) { setTimeLoading(false); return; }
    setTimeError(null);
    try {
      const id = user.id;
      const [empRes, entRes, woRes] = await Promise.all([
        fetch(`${TIME_API}/employees/${encodeURIComponent(id)}`, { headers: authHeaders() }),
        fetch(`${TIME_API}/entries?employeeId=${encodeURIComponent(id)}`, { headers: authHeaders() }),
        fetch(`${TIME_API}/my-work-orders/${encodeURIComponent(id)}`, { headers: authHeaders() }),
      ]);
      const emp = await empRes.json().catch(() => ({}));
      const ent = await entRes.json().catch(() => ({}));
      const wos = await woRes.json().catch(() => ({}));
      setEmployee(emp?.employee || null);
      setActiveEntry(emp?.activeEntry || ent?.activeEntry || null);
      setEntries(Array.isArray(ent?.entries) ? ent.entries : []);
      setMyWorkOrders(Array.isArray(wos?.workOrders) ? wos.workOrders : []);
    } catch (e: any) {
      setTimeError(e?.message || 'Could not load your time records.');
    } finally {
      setTimeLoading(false);
    }
  };
  useEffect(() => { void loadTime(); }, [session?.access_token, user?.id]);

  const punch = async (direction: 'in' | 'out') => {
    if (clockBusy || !employeeId) return;
    setClockBusy(true);
    try {
      const res = await fetch(`${TIME_API}/punch-${direction}`, {
        method: 'POST', headers: authHeaders(), body: JSON.stringify({ employeeId }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || !j?.success) throw new Error(j?.error || `Could not punch ${direction}.`);
      toast.success(direction === 'in' ? 'Punched in.' : `Punched out — ${j.timeEntry?.totalHours ?? 0}h recorded.`);
      await loadTime();
    } catch (e: any) {
      toast.error(e?.message || `Could not punch ${direction}.`);
    } finally { setClockBusy(false); }
  };

  const beginEditing = (entry: any) => {
    setEditingEntryId(entry.id);
    setDraftRows(
      (Array.isArray(entry.allocations) && entry.allocations.length
        ? entry.allocations
        : [{ workOrderId: '', hours: String(entry.totalHours ?? ''), note: '' }]
      ).map((a: any) => ({ workOrderId: String(a.workOrderId || ''), hours: String(a.hours ?? ''), note: String(a.note || '') })),
    );
  };

  const draftTotal = draftRows.reduce((sum, r) => sum + (Number(r.hours) || 0), 0);
  const editingEntry = entries.find((e: any) => e.id === editingEntryId) || null;
  const entryTotal = Number(editingEntry?.totalHours || 0);
  // The number the whole screen turns on. Shown live so the gap is being closed
  // in front of the person, not discovered when Save is refused.
  const unallocated = Math.round((entryTotal - draftTotal) * 100) / 100;
  // Every row must name a work order and carry hours. A row with hours and no
  // work order still counts toward the total, so without this the seeded row
  // balanced at the full shift while the request it would send was empty.
  const rowsComplete = draftRows.length > 0 && draftRows.every((r) => r.workOrderId && Number(r.hours) > 0);
  // A partial split is a legitimate thing to save — you may be assigning a day
  // across three jobs and only know two of them so far. Only over-allocation is
  // refused, because billing more hours than were worked is never in progress,
  // it is just wrong.
  const canSave = rowsComplete && unallocated >= -0.01;
  // Balance is what payroll needs, not what saving needs.
  const balanced = Math.abs(unallocated) <= 0.01 && rowsComplete;

  const submitToPayroll = async (entryId: string) => {
    if (savingRows) return;
    setSavingRows(true);
    try {
      const res = await fetch(`${TIME_API}/entries/${encodeURIComponent(entryId)}/submit`, {
        method: 'POST', headers: authHeaders(),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || !j?.success) throw new Error(j?.error || 'Could not send this shift to payroll.');
      toast.success('Sent to payroll.');
      await loadTime();
    } catch (e: any) {
      toast.error(e?.message || 'Could not send this shift to payroll.');
    } finally { setSavingRows(false); }
  };

  const saveAllocations = async () => {
    if (!editingEntryId || savingRows || !canSave) return;
    setSavingRows(true);
    try {
      const res = await fetch(`${TIME_API}/entries/${encodeURIComponent(editingEntryId)}/allocations`, {
        method: 'PATCH', headers: authHeaders(),
        body: JSON.stringify({
          allocations: draftRows
            .filter((r) => r.workOrderId && Number(r.hours) > 0)
            .map((r) => ({ workOrderId: r.workOrderId, hours: Number(r.hours), note: r.note })),
        }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || !j?.success) throw new Error(j?.error || 'Could not save the split.');
      toast.success('Hours split saved.');
      setEditingEntryId(null);
      await loadTime();
    } catch (e: any) {
      toast.error(e?.message || 'Could not save the split.');
    } finally { setSavingRows(false); }
  };

  const employeeInfo = {
    name: String(employee?.name || user?.user_metadata?.full_name || user?.email || 'Employee'),
    email: String(user?.email || ''),
    phone: String(employee?.phoneNumber || ''),
    position: String(employee?.role || 'Employee'),
    department: String(employee?.department || ''),
    employeeId: String(employee?.id || ''),
    hireDate: employee?.createdAt ? new Date(employee.createdAt).toLocaleDateString(undefined, { month: 'long', year: 'numeric' }) : '',
    manager: '',
    rating: null,
  };

  // Hours by week, counted from real shifts. The seven-week curve that used to
  // sit here (42, 40, 45, 38…) was drawn, and "overtime" was invented alongside
  // it. Anything past 40 in a week is shown as overtime; below that there is
  // none, which is arithmetic rather than a guess.
  const hoursData = (() => {
    const byWeek = new Map<string, { week: string; hours: number; overtime: number; sort: string }>();
    for (const e of entries) {
      if (!e?.punchIn) continue;
      const d = new Date(e.punchIn);
      if (Number.isNaN(d.getTime())) continue;
      const monday = new Date(d);
      monday.setDate(d.getDate() - ((d.getDay() + 6) % 7));
      const sort = monday.toISOString().slice(0, 10);
      const row = byWeek.get(sort) || { week: monday.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }), hours: 0, overtime: 0, sort };
      row.hours += Number(e.totalHours || 0);
      byWeek.set(sort, row);
    }
    return [...byWeek.values()]
      .sort((a, b) => a.sort.localeCompare(b.sort))
      .slice(-8)
      .map((r) => ({ ...r, hours: Math.round(r.hours * 100) / 100, overtime: Math.max(0, Math.round((r.hours - 40) * 100) / 100) }));
  })();

  const thisWeekStart = (() => { const d = new Date(); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); d.setHours(0, 0, 0, 0); return d; })();
  const hoursThisWeek = Math.round(entries
    .filter((e: any) => e?.punchIn && new Date(e.punchIn) >= thisWeekStart)
    .reduce((s: number, e: any) => s + Number(e.totalHours || 0), 0) * 100) / 100;
  // The number that matters most on this screen: hours clocked but not yet
  // attributed to a job, and therefore not yet billable to anyone.
  const unbilledHours = Math.round(entries.reduce((s: number, e: any) => {
    const alloc = (Array.isArray(e.allocations) ? e.allocations : []).reduce((x: number, a: any) => x + Number(a.hours || 0), 0);
    return s + Math.max(0, Number(e.totalHours || 0) - alloc);
  }, 0) * 100) / 100;

  const stats = [
    { label: 'Hours This Week', value: String(hoursThisWeek), change: entries.length ? `${entries.length} shift${entries.length === 1 ? '' : 's'} recorded` : 'No shifts yet', trend: 'neutral', icon: Clock, color: 'blue' },
    { label: 'Unbilled Hours', value: String(unbilledHours), change: unbilledHours > 0 ? 'needs splitting to a work order' : 'all hours assigned', trend: 'neutral', icon: ClipboardList, color: 'orange' },
    { label: 'Work Orders', value: String(myWorkOrders.length), change: myWorkOrders.length ? 'assigned to you' : 'none assigned', trend: 'neutral', icon: CheckCircle, color: 'green' },
    { label: 'Status', value: activeEntry ? 'On the clock' : 'Clocked out', change: activeEntry ? `since ${new Date(activeEntry.punchIn).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}` : '—', trend: 'neutral', icon: Star, color: 'yellow' },
  ];

  // Today's schedule
  const todaySchedule = [
    {
      id: 'SCH-001',
      title: 'Team Stand-up Meeting',
      time: '9:00 AM',
      duration: '30 min',
      location: 'Conference Room A',
      type: 'meeting',
      status: 'upcoming'
    },
    {
      id: 'SCH-002',
      title: 'Site Inspection - Downtown Office',
      time: '10:30 AM',
      duration: '2 hours',
      location: '123 Main St',
      type: 'field-work',
      status: 'upcoming'
    },
    {
      id: 'SCH-003',
      title: 'Lunch Break',
      time: '12:30 PM',
      duration: '1 hour',
      location: 'Off-site',
      type: 'break',
      status: 'upcoming'
    },
    {
      id: 'SCH-004',
      title: 'Project Review with Client',
      time: '2:00 PM',
      duration: '1 hour',
      location: 'Virtual - Zoom',
      type: 'meeting',
      status: 'upcoming'
    }
  ];

  // Active tasks
  const activeTasks = [
    {
      id: 'TASK-089',
      title: 'Complete safety inspection report',
      project: 'Commercial Office Renovation',
      priority: 'high',
      dueDate: '2024-02-02',
      progress: 75,
      status: 'in-progress'
    },
    {
      id: 'TASK-091',
      title: 'Review contractor bids',
      project: 'Residential Complex Phase 2',
      priority: 'high',
      dueDate: '2024-02-02',
      progress: 40,
      status: 'in-progress'
    },
    {
      id: 'TASK-092',
      title: 'Update project timeline',
      project: 'Retail Space Expansion',
      priority: 'medium',
      dueDate: '2024-02-03',
      progress: 60,
      status: 'in-progress'
    },
    {
      id: 'TASK-093',
      title: 'Prepare material order list',
      project: 'Industrial Facility Upgrade',
      priority: 'medium',
      dueDate: '2024-02-05',
      progress: 20,
      status: 'not-started'
    }
  ];

  // Recent documents
  const recentDocuments = [
    {
      id: 'DOC-156',
      name: 'Safety Training Certificate 2024',
      type: 'certificate',
      uploadedDate: '2024-01-28',
      size: '2.4 MB'
    },
    {
      id: 'DOC-148',
      name: 'Employment Contract - Updated',
      type: 'contract',
      uploadedDate: '2024-01-25',
      size: '1.8 MB'
    },
    {
      id: 'DOC-142',
      name: 'W-2 Form 2023',
      type: 'tax-document',
      uploadedDate: '2024-01-20',
      size: '0.5 MB'
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'in-progress': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'not-started': return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
      case 'completed': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'upcoming': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'medium': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'low': return 'bg-green-500/20 text-green-400 border-green-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'meeting': return '🤝';
      case 'field-work': return '🏗️';
      case 'break': return '☕';
      default: return '📋';
    }
  };

  const getStatColor = (color: string) => {
    switch (color) {
      case 'orange': return 'bg-[#ea580c]/20 text-[#ea580c]';
      case 'green': return 'bg-green-500/20 text-green-400';
      case 'blue': return 'bg-blue-500/20 text-blue-400';
      case 'yellow': return 'bg-yellow-500/20 text-yellow-400';
      default: return 'bg-gray-500/20 text-gray-400';
    }
  };

  return (
    <div className="w-full min-h-screen bg-[#0A0A0A]">
      {/* Logo Marquee */}
      <LogoMarquee speed={30} />

      {/* Advertising Text Banner */}
      <AdvertisingMarquee placement="employee-portal" dismissible />

      {/* Advertising Video Reel - Floating Widget */}
      <AdvertisingVideoReel placement="employee-portal" maxVideos={5} autoPlay={false} />

      {/* Header */}
      <header className="bg-[#1a1a1a] border-b border-gray-800 sticky top-16 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo and Employee Name */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-[#ea580c] to-orange-600 rounded-lg flex items-center justify-center">
                <Briefcase className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-white">{employeeInfo.name}</h1>
                <p className="text-xs text-gray-400">{employeeInfo.position}</p>
              </div>
            </div>

            {/* Right side actions */}
            <div className="flex items-center gap-3">
              <button className="relative inline-flex items-center justify-center min-w-11 min-h-11 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors">
                <Bell className="w-5 h-5" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-[#ea580c] rounded-full"></span>
              </button>
              <button className="relative inline-flex items-center justify-center min-w-11 min-h-11 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors">
                <MessageSquare className="w-5 h-5" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-blue-500 rounded-full"></span>
              </button>
              <button className="inline-flex items-center justify-center min-w-11 min-h-11 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors">
                <Settings className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex gap-1 -mb-px">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: Home },
              { id: 'schedule', label: 'Schedule', icon: Calendar },
              { id: 'tasks', label: 'Tasks', icon: ClipboardList },
              { id: 'timesheet', label: 'Timesheet', icon: Clock },
              { id: 'documents', label: 'Documents', icon: FileText },
              { id: 'plan-tracker', label: 'Hour Banking', icon: BarChart3 },
              { id: 'plan-builder', label: 'Plans & Add-ons', icon: Sparkles },
              { id: 'performance', label: 'Performance', icon: BarChart3 },
              { id: 'referrals', label: 'Referrals', icon: Award },
              { id: 'investments', label: 'Investments', icon: DollarSign },
    { id: 'guide', label: 'Portal Guide', icon: FileText },
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? 'border-[#ea580c] text-[#ea580c]'
                      : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-700'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Dashboard Tab */}
        {activeTab === 'guide' && <PortalFeatureGuide portal="employee" />}

        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {/* ─── Punch clock ───────────────────────────────────────────────
                First thing on the dashboard, because it is the thing an employee
                opens this portal to do. It was previously a small button tucked
                into the welcome banner, which is a poor home for the one control
                that gets used twice a day, every day. */}
            <div className={`rounded-xl border p-6 transition ${activeEntry ? 'border-green-500/30 bg-green-500/5' : 'border-gray-800 bg-[#1a1a1a]'}`}>
              <div className="flex flex-wrap items-center justify-between gap-6">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`h-2.5 w-2.5 rounded-full ${activeEntry ? 'animate-pulse bg-green-400' : 'bg-gray-600'}`} />
                    <p className="text-sm font-semibold uppercase tracking-wide text-gray-400">
                      {activeEntry ? 'On the clock' : 'Clocked out'}
                    </p>
                  </div>

                  {activeEntry && elapsed ? (
                    <>
                      <p className="mt-2 text-4xl font-bold tabular-nums text-white">
                        {String(elapsed.h).padStart(2, '0')}:{String(elapsed.m).padStart(2, '0')}
                        <span className="text-2xl text-gray-500">:{String(elapsed.s).padStart(2, '0')}</span>
                      </p>
                      <p className="mt-1 text-sm text-gray-400">
                        Started {new Date(activeEntry.punchIn).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                        {' · '}{elapsed.hours}h so far
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="mt-2 text-4xl font-bold tabular-nums text-white">{hoursThisWeek}h</p>
                      <p className="mt-1 text-sm text-gray-400">
                        this week{entries.length ? ` · ${entries.length} shift${entries.length === 1 ? '' : 's'}` : ' · no shifts yet'}
                      </p>
                    </>
                  )}
                </div>

                <div className="flex flex-col items-stretch gap-2">
                  <button
                    type="button"
                    onClick={() => punch(activeEntry ? 'out' : 'in')}
                    disabled={clockBusy || timeLoading || !employeeId}
                    className={`inline-flex items-center justify-center gap-2 rounded-xl px-8 py-4 text-lg font-bold text-white shadow-lg transition disabled:cursor-not-allowed disabled:opacity-50 ${
                      activeEntry ? 'bg-red-600 hover:bg-red-500' : 'bg-green-600 hover:bg-green-500'
                    }`}
                  >
                    <Clock className="h-5 w-5" />
                    {clockBusy ? 'Working…' : activeEntry ? 'Punch out' : 'Punch in'}
                  </button>
                  {!employeeId && !timeLoading && (
                    <p className="max-w-[15rem] text-center text-xs text-yellow-400">
                      No employee record is linked to this account yet.
                    </p>
                  )}
                </div>
              </div>

              {/* The nudge that keeps payroll unblocked. Only shown when there is
                  actually something outstanding. */}
              {unbilledHours > 0 && (
                <button
                  type="button"
                  onClick={() => setActiveTab('timesheet')}
                  className="mt-5 flex w-full items-center justify-between gap-3 rounded-lg border border-yellow-500/20 bg-yellow-500/5 px-4 py-3 text-left transition hover:border-yellow-500/40"
                >
                  <span className="text-sm text-yellow-300">
                    <span className="font-bold tabular-nums">{unbilledHours}h</span> not yet assigned to a work order — payroll cannot take these.
                  </span>
                  <span className="whitespace-nowrap text-xs font-bold text-yellow-400">Split hours →</span>
                </button>
              )}
            </div>

            {/* Welcome Section */}
            <div className="bg-gradient-to-r from-[#ea580c] to-orange-600 rounded-xl p-6 text-white">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-2xl font-bold mb-2">Good morning, {employeeInfo.name.split(' ')[0]}!</h2>
                  <p className="text-white/90 mb-4">
                    You have {activeTasks.filter(t => t.status === 'in-progress').length} active tasks and {todaySchedule.length} scheduled events today
                  </p>
                  {/* On the home screen rather than buried in a menu: the crew
                      are on site with a phone in hand, and a photo that takes
                      three taps to find a home for is a photo nobody takes. */}
                  <div className="mb-4">
                    <AddJobPhotosButton
                      label="Add job photos"
                      className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-white text-[#ea580c] hover:bg-white/90 transition disabled:opacity-40"
                    />
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 fill-current" />
                      <span className="font-semibold">{employeeInfo.rating}</span>
                      <span className="text-white/80">Performance</span>
                    </div>
                    <div className="w-px h-4 bg-white/30" />
                    <div className="text-white/80">
                      ID: <span className="font-semibold text-white">{employeeInfo.employeeId}</span>
                    </div>
                    <div className="w-px h-4 bg-white/30" />
                    <div className="text-white/80">
                      Employed since {employeeInfo.hireDate}
                    </div>
                  </div>
                </div>
                {/* The punch control lives in the clock card above. Two buttons
                    that do the same thing, one of which is the more prominent,
                    is a way to punch out by accident. */}
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {stats.map((stat, index) => {
                const Icon = stat.icon;
                return (
                  <div key={index} className="bg-[#1a1a1a] border border-gray-800 rounded-xl p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className={`p-3 rounded-lg ${getStatColor(stat.color)}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      {stat.trend === 'up' && <ArrowUpRight className="w-4 h-4 text-green-400" />}
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-gray-400">{stat.label}</p>
                      <p className="text-2xl font-bold text-white">{stat.value}</p>
                      <p className="text-xs text-gray-500">{stat.change}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Work Hours Chart */}
            <div className="bg-[#1a1a1a] border border-gray-800 rounded-xl p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-bold text-white mb-1">Weekly Hours</h3>
                  <p className="text-sm text-gray-400">Track your work hours and overtime</p>
                </div>
                <SecondaryButton size="sm">
                  <Download className="w-4 h-4" />
                  Export Report
                </SecondaryButton>
              </div>
              <ChartContainer>
                <AreaChart data={hoursData} height={300}>
                  <defs>
                    <linearGradient id="empHoursGradientA" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ea580c" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#ea580c" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis dataKey="week" stroke="#666" />
                  <YAxis stroke="#666" />
                  <Tooltip contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333', borderRadius: '8px' }} />
                  <Area key="hours-a" type="monotone" dataKey="hours" stroke="#ea580c" strokeWidth={2} fillOpacity={1} fill="url(#empHoursGradientA)" />
                </AreaChart>
              </ChartContainer>
            </div>

            {/* Today's Schedule & Active Tasks */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Today's Schedule */}
              <div className="bg-[#1a1a1a] border border-gray-800 rounded-xl p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-bold text-white">Today's Schedule</h3>
                  <button
                    onClick={() => setActiveTab('schedule')}
                    className="text-sm text-[#ea580c] hover:text-orange-400 font-medium inline-flex items-center gap-1 min-h-11 px-2 -mr-2"
                  >
                    View All <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
                <div className="space-y-3">
                  {todaySchedule.map((event) => (
                    <div key={event.id} className="p-4 bg-[#0A0A0A] border border-gray-800 rounded-lg hover:border-gray-700 transition-colors">
                      <div className="flex items-start gap-3">
                        <span className="text-2xl">{getTypeIcon(event.type)}</span>
                        <div className="flex-1">
                          <h4 className="text-sm font-semibold text-white mb-1">{event.title}</h4>
                          <div className="flex items-center gap-2 text-xs text-gray-400 mb-1">
                            <Clock className="w-3 h-3" />
                            <span>{event.time} • {event.duration}</span>
                          </div>
                          <p className="text-xs text-gray-500">{event.location}</p>
                        </div>
                        <span className={`px-2 py-1 text-xs rounded-full border ${getStatusColor(event.status)}`}>
                          {event.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Active Tasks */}
              <div className="bg-[#1a1a1a] border border-gray-800 rounded-xl p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-bold text-white">Active Tasks</h3>
                  <button
                    onClick={() => setActiveTab('tasks')}
                    className="text-sm text-[#ea580c] hover:text-orange-400 font-medium inline-flex items-center gap-1 min-h-11 px-2 -mr-2"
                  >
                    View All <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
                <div className="space-y-3">
                  {activeTasks.slice(0, 3).map((task) => (
                    <div key={task.id} className="p-4 bg-[#0A0A0A] border border-gray-800 rounded-lg hover:border-gray-700 transition-colors">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h4 className="text-sm font-semibold text-white mb-1">{task.title}</h4>
                          <p className="text-xs text-gray-400">{task.project}</p>
                        </div>
                        <span className={`px-2 py-1 text-xs rounded-full border ${getPriorityColor(task.priority)}`}>
                          {task.priority}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
                        <span>{task.id}</span>
                        <span>Due: {task.dueDate}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-800 rounded-full h-2">
                          <div 
                            className="bg-[#ea580c] h-2 rounded-full transition-all"
                            style={{ width: `${task.progress}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-400">{task.progress}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Schedule Tab */}
        {activeTab === 'schedule' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-white mb-1">My Schedule</h2>
                <p className="text-sm text-gray-400">View and manage your calendar</p>
              </div>
              <div className="flex gap-3">
                <SecondaryButton>
                  <Filter className="w-4 h-4" />
                  Filter
                </SecondaryButton>
                <PrimaryButton>
                  <Calendar className="w-4 h-4" />
                  Add Event
                </PrimaryButton>
              </div>
            </div>

            <div className="bg-[#1a1a1a] border border-gray-800 rounded-xl p-6">
              <h3 className="text-lg font-bold text-white mb-6">Today's Schedule</h3>
              <div className="space-y-4">
                {todaySchedule.map((event) => (
                  <div key={event.id} className="p-5 bg-[#0A0A0A] border border-gray-800 rounded-lg hover:border-gray-700 transition-colors">
                    <div className="flex items-start gap-4">
                      <div className="text-center min-w-[60px]">
                        <p className="text-sm font-semibold text-[#ea580c]">{event.time.split(' ')[0]}</p>
                        <p className="text-xs text-gray-500">{event.time.split(' ')[1]}</p>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h4 className="text-base font-semibold text-white mb-1">{event.title}</h4>
                            <p className="text-sm text-gray-400">{event.location}</p>
                          </div>
                          <span className={`px-3 py-1 text-xs rounded-full border ${getStatusColor(event.status)}`}>
                            {event.status}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {event.duration}
                          </span>
                          <span className="capitalize">{event.type.replace('-', ' ')}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tasks Tab */}
        {activeTab === 'tasks' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-white mb-1">My Tasks</h2>
                <p className="text-sm text-gray-400">Manage your assigned tasks</p>
              </div>
              <div className="flex gap-3">
                <SecondaryButton>
                  <Filter className="w-4 h-4" />
                  Filter
                </SecondaryButton>
                <SecondaryButton>
                  <Search className="w-4 h-4" />
                  Search
                </SecondaryButton>
              </div>
            </div>

            <div className="grid gap-4">
              {activeTasks.map((task) => (
                <div key={task.id} className="bg-[#1a1a1a] border border-gray-800 rounded-xl p-6 hover:border-gray-700 transition-colors">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-bold text-white">{task.title}</h3>
                        <span className={`px-3 py-1 text-xs rounded-full border ${getPriorityColor(task.priority)}`}>
                          {task.priority}
                        </span>
                        <span className={`px-3 py-1 text-xs rounded-full border ${getStatusColor(task.status)}`}>
                          {task.status}
                        </span>
                      </div>
                      <p className="text-sm text-gray-400 mb-1">{task.project}</p>
                      <p className="text-xs text-gray-500">{task.id}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Due Date</p>
                      <p className="text-sm text-white">{task.dueDate}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Progress</p>
                      <p className="text-sm text-white">{task.progress}%</p>
                    </div>
                  </div>

                  <div className="mb-4">
                    <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
                      <span>Overall Progress</span>
                      <span>{task.progress}% Complete</span>
                    </div>
                    <div className="bg-gray-800 rounded-full h-3">
                      <div 
                        className="bg-gradient-to-r from-[#ea580c] to-orange-600 h-3 rounded-full transition-all"
                        style={{ width: `${task.progress}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <PrimaryButton size="sm">
                      <ClipboardList className="w-4 h-4" />
                      View Details
                    </PrimaryButton>
                    <SecondaryButton size="sm">
                      <MessageSquare className="w-4 h-4" />
                      Comments
                    </SecondaryButton>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Timesheet Tab */}
        {activeTab === 'timesheet' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-white mb-1">Timesheet</h2>
                <p className="text-sm text-gray-400">Track and submit your work hours</p>
              </div>
              <PrimaryButton>
                <Download className="w-4 h-4" />
                Export Timesheet
              </PrimaryButton>
            </div>

            {/* Shifts and how their hours are billed out. */}
            <div className="bg-[#1a1a1a] border border-gray-800 rounded-xl p-6">
              <h3 className="text-lg font-bold text-white">Shifts &amp; work-order split</h3>
              <p className="mt-1 mb-5 text-sm text-gray-400">
                Every shift's hours have to add up to the time you clocked. Split a day across
                work orders so each job is billed for what it actually took.
              </p>

              {timeLoading ? (
                <div className="flex items-center justify-center gap-2 py-10 text-sm text-gray-400">
                  <Clock className="h-4 w-4 animate-spin" /> Loading your shifts…
                </div>
              ) : timeError ? (
                <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-6 text-center text-sm text-red-300">{timeError}</div>
              ) : entries.length === 0 ? (
                <div className="rounded-lg border border-gray-800 bg-[#0f0f0f] p-10 text-center">
                  <Clock className="mx-auto mb-3 h-8 w-8 text-gray-600" />
                  <p className="font-semibold text-white">No completed shifts yet</p>
                  <p className="mx-auto mt-2 max-w-md text-sm text-gray-400">
                    Clock in and out and the shift appears here, ready to be split across the work orders you were on.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {entries.map((entry: any) => {
                    const allocated = (Array.isArray(entry.allocations) ? entry.allocations : [])
                      .reduce((s: number, a: any) => s + Number(a.hours || 0), 0);
                    const gap = Math.round((Number(entry.totalHours || 0) - allocated) * 100) / 100;
                    const isEditing = editingEntryId === entry.id;
                    return (
                      <div key={entry.id} className="rounded-lg border border-gray-800 bg-[#0f0f0f] p-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <p className="font-semibold text-white">
                              {new Date(entry.punchIn).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                              <span className="ml-2 text-sm font-normal text-gray-400">
                                {new Date(entry.punchIn).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                                {entry.punchOut ? ` – ${new Date(entry.punchOut).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}` : ''}
                              </span>
                            </p>
                            <p className="mt-0.5 text-sm text-gray-400 tabular-nums">
                              {entry.totalHours}h clocked
                              {entry.breakMinutes ? ` · ${entry.breakMinutes}m break` : ''}
                              {gap !== 0 && <span className="ml-2 text-yellow-400">{gap > 0 ? `${gap}h unbilled` : `${Math.abs(gap)}h over-allocated`}</span>}
                            </p>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            {entry.approved ? (
                              <span className="rounded border border-green-500/20 bg-green-500/10 px-2 py-0.5 text-xs font-semibold text-green-400">Approved by payroll</span>
                            ) : entry.submittedToPayroll ? (
                              <span className="rounded border border-blue-500/20 bg-blue-500/10 px-2 py-0.5 text-xs font-semibold text-blue-300">Sent to payroll</span>
                            ) : null}

                            {!entry.approved && (
                              <SecondaryButton onClick={() => (isEditing ? setEditingEntryId(null) : beginEditing(entry))}>
                                {isEditing ? 'Cancel' : 'Split hours'}
                              </SecondaryButton>
                            )}

                            {/* Payroll is the gate. It only opens when the split
                                reconciles to the clock — which is why the figure
                                is named on the button when it does not. */}
                            {!entry.approved && !entry.submittedToPayroll && !isEditing && (
                              gap === 0 && Array.isArray(entry.allocations) && entry.allocations.length > 0 ? (
                                <PrimaryButton onClick={() => submitToPayroll(entry.id)} disabled={savingRows}>
                                  Send to payroll
                                </PrimaryButton>
                              ) : (
                                <span
                                  title="Assign every hour to a work order first"
                                  className="cursor-not-allowed rounded-lg border border-gray-700 px-3 py-2 text-xs font-semibold text-gray-500"
                                >
                                  {gap > 0 ? `${gap}h to assign before payroll` : `${Math.abs(gap)}h over — fix before payroll`}
                                </span>
                              )
                            )}
                          </div>
                        </div>

                        {!isEditing && Array.isArray(entry.allocations) && entry.allocations.length > 0 && (
                          <ul className="mt-3 space-y-1 border-t border-gray-800 pt-3 text-sm">
                            {entry.allocations.map((a: any, i: number) => (
                              <li key={i} className="flex justify-between text-gray-300">
                                <span>{a.workOrderTitle || a.workOrderId}</span>
                                <span className="tabular-nums text-white">{a.hours}h</span>
                              </li>
                            ))}
                          </ul>
                        )}

                        {isEditing && (
                          <div className="mt-4 space-y-2 border-t border-gray-800 pt-4">
                            {myWorkOrders.length === 0 && (
                              <p className="rounded border border-yellow-500/20 bg-yellow-500/5 p-3 text-sm text-yellow-300">
                                No work orders are assigned to you, so there is nothing to bill these hours to yet.
                              </p>
                            )}
                            {draftRows.map((row, i) => (
                              <div key={i} className="flex flex-wrap items-center gap-2">
                                <select
                                  value={row.workOrderId}
                                  onChange={(e) => setDraftRows(rows => rows.map((r, j) => j === i ? { ...r, workOrderId: e.target.value } : r))}
                                  className="min-w-[220px] flex-1 rounded-lg border border-gray-700 bg-[#1a1a1a] px-3 py-2 text-sm text-white"
                                >
                                  <option value="">Choose a work order…</option>
                                  {myWorkOrders.map((w: any) => (
                                    <option key={w.id} value={w.id}>{w.title}{w.customer ? ` — ${w.customer}` : ''}</option>
                                  ))}
                                </select>
                                <input
                                  type="number" step="0.25" min="0" inputMode="decimal"
                                  value={row.hours}
                                  onChange={(e) => setDraftRows(rows => rows.map((r, j) => j === i ? { ...r, hours: e.target.value } : r))}
                                  className="w-24 rounded-lg border border-gray-700 bg-[#1a1a1a] px-3 py-2 text-right text-sm text-white tabular-nums"
                                  placeholder="hours"
                                />
                                <button
                                  type="button"
                                  onClick={() => setDraftRows(rows => rows.filter((_, j) => j !== i))}
                                  className="rounded-lg border border-gray-700 px-3 py-2 text-sm text-gray-400 transition hover:text-white"
                                >
                                  Remove
                                </button>
                              </div>
                            ))}

                            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                              <button
                                type="button"
                                onClick={() => setDraftRows(rows => [...rows, { workOrderId: '', hours: '', note: '' }])}
                                className="rounded-lg border border-gray-700 px-3 py-2 text-sm font-semibold text-gray-300 transition hover:text-white"
                              >
                                + Add work order
                              </button>

                              <div className="flex items-center gap-3">
                                {/* The live reconciliation. Save stays locked until
                                    this reads zero, so an unbalanced split is never
                                    even attempted. */}
                                {/* The running figure. It no longer gates Save —
                                    a partial split is worth keeping — it gates
                                    payroll, which is the point at which the
                                    hours become an invoice and a wage. */}
                                <span className={`text-sm font-semibold tabular-nums ${balanced ? 'text-green-400' : unallocated < 0 ? 'text-red-400' : 'text-yellow-400'}`}>
                                  {balanced
                                    ? `Balanced · ${entryTotal}h · ready for payroll`
                                    : !rowsComplete
                                      ? 'Choose a work order for every line'
                                      : unallocated > 0
                                        ? `${unallocated}h left before payroll`
                                        : `${Math.abs(unallocated)}h over the ${entryTotal}h clocked`}
                                </span>
                                <PrimaryButton onClick={saveAllocations} disabled={!canSave || savingRows}>
                                  {savingRows ? 'Saving…' : 'Save split'}
                                </PrimaryButton>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="bg-[#1a1a1a] border border-gray-800 rounded-xl p-6">
              <h3 className="text-lg font-bold text-white mb-6">Weekly Hours</h3>
              <ChartContainer>
                <AreaChart data={hoursData} height={400}>
                  <defs>
                    <linearGradient id="empHoursGradientB" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ea580c" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#ea580c" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="empOvertimeGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis dataKey="week" stroke="#666" />
                  <YAxis stroke="#666" />
                  <Tooltip contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333', borderRadius: '8px' }} />
                  <Area key="hours-b" type="monotone" dataKey="hours" stroke="#ea580c" strokeWidth={2} fillOpacity={1} fill="url(#empHoursGradientB)" name="Regular Hours" />
                  <Area key="overtime-b" type="monotone" dataKey="overtime" stroke="#3b82f6" strokeWidth={2} fillOpacity={0.5} fill="url(#empOvertimeGradient)" name="Overtime" />
                </AreaChart>
              </ChartContainer>
            </div>
          </div>
        )}

        {/* Documents Tab */}
        {activeTab === 'documents' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-white mb-1">My Documents</h2>
                <p className="text-sm text-gray-400">Access your employment documents</p>
              </div>
              <div className="flex gap-3">
                <SecondaryButton>
                  <Search className="w-4 h-4" />
                  Search
                </SecondaryButton>
                <PrimaryButton>
                  <Download className="w-4 h-4" />
                  Upload Document
                </PrimaryButton>
              </div>
            </div>

            <div className="grid gap-4">
              {recentDocuments.map((doc) => (
                <div key={doc.id} className="bg-[#1a1a1a] border border-gray-800 rounded-xl p-6 hover:border-gray-700 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-[#ea580c]/20 rounded-lg flex items-center justify-center">
                        <FileText className="w-6 h-6 text-[#ea580c]" />
                      </div>
                      <div>
                        <h3 className="text-base font-semibold text-white mb-1">{doc.name}</h3>
                        <div className="flex items-center gap-3 text-xs text-gray-400">
                          <span className="capitalize">{doc.type.replace('-', ' ')}</span>
                          <span>•</span>
                          <span>{doc.size}</span>
                          <span>•</span>
                          <span>Uploaded {doc.uploadedDate}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <SecondaryButton size="sm">
                        <Download className="w-4 h-4" />
                        Download
                      </SecondaryButton>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Performance Tab */}
        {activeTab === 'plan-tracker' && <MaintenancePlanTracker portalRole="employee" ownerName={employeeInfo.name} />}
        {activeTab === 'plan-builder' && <PlanBuilderTab portalType="employee" ownerName={employeeInfo.name} />}
        {activeTab === 'investments' && <InvestmentTab portalType="employee" ownerName={employeeInfo.name} />}
        {activeTab === 'performance' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-white mb-1">Performance Dashboard</h2>
              <p className="text-sm text-gray-400">Track your performance metrics and goals</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-[#1a1a1a] border border-gray-800 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 bg-yellow-500/20 rounded-lg">
                    <Star className="w-5 h-5 text-yellow-400" />
                  </div>
                  <span className="text-sm text-gray-400">Overall Rating</span>
                </div>
                <p className="text-3xl font-bold text-white mb-1">{employeeInfo.rating}</p>
                <p className="text-xs text-green-400">+0.3 this quarter</p>
              </div>

              <div className="bg-[#1a1a1a] border border-gray-800 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 bg-green-500/20 rounded-lg">
                    <CheckCircle className="w-5 h-5 text-green-400" />
                  </div>
                  <span className="text-sm text-gray-400">Tasks Completed</span>
                </div>
                <p className="text-3xl font-bold text-white mb-1">142</p>
                <p className="text-xs text-green-400">+15% from last month</p>
              </div>

              <div className="bg-[#1a1a1a] border border-gray-800 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 bg-blue-500/20 rounded-lg">
                    <Target className="w-5 h-5 text-blue-400" />
                  </div>
                  <span className="text-sm text-gray-400">Goals Achieved</span>
                </div>
                <p className="text-3xl font-bold text-white mb-1">8/10</p>
                <p className="text-xs text-gray-400">80% completion rate</p>
              </div>
            </div>
          </div>
        )}

        {/* Referrals Tab */}

        {activeTab === 'messages' && (
          <div className="p-6">
            <MessagesTab userId="" userEmail="" userName="Portal User" onTabOpen={clearUnread} />
          </div>
        )}

                {activeTab === 'referrals' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-white mb-1">Referral Program</h2>
              <p className="text-sm text-gray-400">Earn rewards by referring talented professionals</p>
            </div>
            <ReferralRewards userType="employee" />
          </div>
        )}
      </main>
    </div>
  );
}