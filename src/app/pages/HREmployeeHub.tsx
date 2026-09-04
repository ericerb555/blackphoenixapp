import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { saveDual, loadDual } from '../lib/database';
import { projectId } from '../utils/supabase/info';
import { Users, Clock, DollarSign, Plus, Search, Edit2, Trash2, ChevronDown, ChevronUp, CheckCircle, Download, Save, X, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

type PayType = 'hourly' | 'salary' | 'contract';
type Status = 'active' | 'inactive' | 'onleave';

interface Employee {
  id: string; firstName: string; lastName: string; email: string; phone: string;
  role: string; department: string; payType: PayType; payRate: number;
  status: Status; startDate: string; hoursThisWeek: number; hoursThisPeriod: number;
  certifications: string[]; notes: string;
}

interface PayrollRun {
  id: string; periodStart: string; periodEnd: string;
  status: 'draft' | 'approved' | 'paid'; totalGross: number; employeeCount: number;
}

/** A shift the clock closed by itself, waiting on a real finish time. */
interface HeldShift {
  id: string; employeeId: string; employeeName: string;
  punchIn: string; punchOut: string; totalHours: number;
  autoClosed: boolean; reason: string;
}

const TIME_API = (id: string) =>
  `https://${id}.supabase.co/functions/v1/make-server-3eae23a6/time-tracking`;

/**
 * A datetime-local value for the punch-out box, defaulted to the placeholder
 * already on the record and rendered in the browser's own timezone.
 *
 * Doing this by hand rather than with toISOString(): that converts to UTC, so
 * the box would open showing a time four or five hours away from the one the
 * crew would name, and whoever is correcting it would be reading a different
 * clock from the person they are asking.
 */
function toLocalInput(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
    + `T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const SEED: Employee[] = [
  { id: 'EMP-001', firstName: 'Mike', lastName: 'Torres', email: 'mike@bpb.com', phone: '603-555-0101', role: 'Lead Carpenter', department: 'field', payType: 'hourly', payRate: 32, status: 'active', startDate: '2022-03-15', hoursThisWeek: 38, hoursThisPeriod: 76, certifications: ['OSHA-30'], notes: '' },
  { id: 'EMP-002', firstName: 'Jake', lastName: 'Sullivan', email: 'jake@bpb.com', phone: '603-555-0103', role: 'Roofer', department: 'field', payType: 'hourly', payRate: 28, status: 'active', startDate: '2023-06-01', hoursThisWeek: 40, hoursThisPeriod: 80, certifications: ['OSHA-10'], notes: '' },
  { id: 'EMP-003', firstName: 'Lisa', lastName: 'Park', email: 'lisa@bpb.com', phone: '603-555-0105', role: 'Office Manager', department: 'office', payType: 'salary', payRate: 55000, status: 'active', startDate: '2021-09-01', hoursThisWeek: 40, hoursThisPeriod: 80, certifications: [], notes: '' },
  { id: 'EMP-004', firstName: 'Tom', lastName: 'Walsh', email: 'tom@bpb.com', phone: '603-555-0109', role: 'Project Manager', department: 'management', payType: 'salary', payRate: 72000, status: 'active', startDate: '2020-04-20', hoursThisWeek: 42, hoursThisPeriod: 84, certifications: ['PMP', 'OSHA-30'], notes: '' },
];

const SEED_PAYROLL: PayrollRun[] = [
  { id: 'PAY-001', periodStart: '2026-06-28', periodEnd: '2026-07-11', status: 'paid', totalGross: 18640, employeeCount: 4 },
  { id: 'PAY-002', periodStart: '2026-07-12', periodEnd: '2026-07-25', status: 'draft', totalGross: 19120, employeeCount: 4 },
];

function load<T>(key: string, fallback: T): T {
  try { return JSON.parse(localStorage.getItem(key) || 'null') ?? fallback; } catch { return fallback; }
}

const STATUS_CLS: Record<Status, string> = {
  active: 'text-green-400 bg-green-500/10 border-green-500/20',
  inactive: 'text-gray-500 bg-gray-500/10 border-gray-500/20',
  onleave: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
};

export default function HREmployeeHub({ onNavigate }: { onNavigate?: (p: string) => void }) {
  const { user } = useAuth();
  const [tab, setTab] = useState<'employees' | 'payroll'>('employees');
  const [employees, setEmployees] = useState<Employee[]>(() => {
    const s = load<Employee[]>('hr_employees', []);
    return s.length ? s : SEED;
  });
  const [payroll, setPayroll] = useState<PayrollRun[]>(() => {
    const s = load<PayrollRun[]>('hr_payroll', []);
    return s.length ? s : SEED_PAYROLL;
  });
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [editing, setEditing] = useState<Partial<Employee> | null>(null);

  // Shifts nobody punched out of. The clock closed them after sixteen hours
  // with a placeholder finish time, and their hours are deliberately absent
  // from the figures above until somebody says when the person actually
  // finished. Until then payroll is short and this is the only place that says
  // why, so it sits in front of the payroll runs rather than below them.
  const [heldShifts, setHeldShifts] = useState<HeldShift[]>([]);
  const [fixingId, setFixingId] = useState<string | null>(null);
  const [finishDraft, setFinishDraft] = useState('');
  const [savingFinish, setSavingFinish] = useState(false);
  const [demoBusy, setDemoBusy] = useState(false);
  const hasDemoShift = heldShifts.some(s => s.id.startsWith('DEMO-HELD-'));

  // Hydrate from the server on mount (falls back to the localStorage-seeded
  // initial state if nothing is stored server-side yet).
  useEffect(() => {
    (async () => {
      const [emp, pay] = await Promise.all([
        loadDual('hr_employees'),
        loadDual('hr_payroll'),
      ]);
      const base: Employee[] = (Array.isArray(emp) && emp.length) ? emp : employees;
      if (Array.isArray(pay) && pay.length) setPayroll(pay);

      // Overlay real logged hours from the time-tracking system (matched by full name).
      try {
        await refreshHours(base);
      } catch (err) {
        console.error('Could not load real hours from time-tracking:', err);
        setEmployees(base);
      }
    })();
  }, [user?.id]);

  /**
   * Pull the real hours, and the shifts being held back from them.
   *
   * Called again after a finish time is corrected, because the correction moves
   * hours from held into payable and the figures at the top of this screen
   * would otherwise keep showing the shortfall that has just been resolved.
   */
  async function refreshHours(base?: Employee[]) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) throw new Error('Sign in is required to load payroll hours.');
    const res = await fetch(
      `${TIME_API(projectId)}/hours-summary`,
      { headers: { Authorization: `Bearer ${session.access_token}` } }
    );
    if (!res.ok) throw new Error(`Time tracking responded ${res.status}`);
    const json = await res.json();
    setHeldShifts(Array.isArray(json?.held) ? json.held : []);
    const merge = (list: Employee[]) => (json?.success && json?.summary)
      ? list.map(e => {
          const h = json.summary[`${e.firstName} ${e.lastName}`.trim()];
          return h ? { ...e, hoursThisWeek: h.hoursThisWeek, hoursThisPeriod: h.hoursThisPeriod } : e;
        })
      : list;
    setEmployees(prev => merge(base ?? prev));
  }

  /**
   * Plant or remove a demo held shift.
   *
   * A real one only appears when somebody genuinely leaves a punch running for
   * sixteen hours, which is not something anybody can sit and wait for — so
   * there has to be a way to see this panel work. The planted entry is filed
   * under a name matching no employee and is flagged for review, so its hours
   * are held out of every payroll figure by construction: it cannot move
   * anybody's pay while it sits there. The server refuses both calls to anyone
   * who is not an admin.
   */
  async function demoHeldShift(action: 'plant' | 'remove') {
    setDemoBusy(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Sign in again to do this.');
      const res = await fetch(`${TIME_API(projectId)}/dev/demo-held-shift`, {
        method: action === 'plant' ? 'POST' : 'DELETE',
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.success) throw new Error(json?.error || `Time tracking responded ${res.status}`);
      toast.success(action === 'plant'
        ? 'Demo shift planted — it is the amber panel above.'
        : `Removed ${json.removed} demo shift${json.removed === 1 ? '' : 's'}.`);
      await refreshHours();
    } catch (err: any) {
      toast.error(err?.message || 'Could not change the demo shift.');
    } finally {
      setDemoBusy(false);
    }
  }

  /**
   * Record when somebody actually finished a shift the clock closed for them.
   *
   * The server does the checking — that the time is after the punch-in and
   * within a plausible shift — because this is the number that becomes a wage
   * and a customer's invoice, and a screen is not where that is decided.
   */
  async function saveFinishTime(shift: HeldShift) {
    if (!finishDraft) { toast.error('Enter when the shift actually finished.'); return; }
    setSavingFinish(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Sign in again to record this.');
      const res = await fetch(`${TIME_API(projectId)}/entries/${encodeURIComponent(shift.id)}/finish-time`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
        // A datetime-local box has no timezone, so the browser's own is applied
        // here — the supervisor is typing the time the crew would say.
        body: JSON.stringify({ punchOut: new Date(finishDraft).toISOString() }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.success) throw new Error(json?.error || `Time tracking responded ${res.status}`);
      toast.success(
        json.unallocatedHours > 0.01
          ? `${json.totalHours}h recorded — ${shift.employeeName} still has ${json.unallocatedHours}h to assign to a work order.`
          : `${json.totalHours}h recorded for ${shift.employeeName}.`
      );
      setFixingId(null);
      setFinishDraft('');
      await refreshHours();
    } catch (err: any) {
      toast.error(err?.message || 'Could not record the finish time.');
    } finally {
      setSavingFinish(false);
    }
  }

  useEffect(() => { saveDual('hr_employees', employees); }, [employees]);
  useEffect(() => { saveDual('hr_payroll', payroll); }, [payroll]);

  const active = employees.filter(e => e.status === 'active');
  const totalHours = active.reduce((s, e) => s + e.hoursThisWeek, 0);
  const periodPay = active.reduce((s, e) => s + (e.payType === 'salary' ? e.payRate / 26 : e.payRate * e.hoursThisPeriod), 0);

  const filtered = employees.filter(e => {
    const q = search.toLowerCase();
    return !q || `${e.firstName} ${e.lastName} ${e.role}`.toLowerCase().includes(q);
  });

  function saveEmp(emp: Partial<Employee>) {
    if (!emp.firstName || !emp.lastName) { toast.error('Name required'); return; }
    const full = { ...emp, id: emp.id || `EMP-${Date.now()}` } as Employee;
    setEmployees(prev => {
      const i = prev.findIndex(x => x.id === full.id);
      if (i >= 0) { const n = [...prev]; n[i] = full; return n; }
      return [...prev, full];
    });
    setEditing(null);
    toast.success('Saved');
  }

  function deleteEmp(id: string) {
    if (!confirm('Delete employee?')) return;
    setEmployees(prev => prev.filter(e => e.id !== id));
  }

  function exportCSV() {
    const rows = [['ID','Name','Role','Dept','Pay Type','Rate','Status'],
      ...employees.map(e => [e.id, `${e.firstName} ${e.lastName}`, e.role, e.department, e.payType, e.payRate, e.status])
    ].map(r => r.join(',')).join('\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([rows], { type: 'text/csv' })); a.download = 'employees.csv'; a.click();
  }

  return (
    <div className="min-h-screen p-4 sm:p-6" style={{ background: '#0a0a0a', color: 'white' }}>
      {editing !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.8)' }}>
          <div className="w-full max-w-lg rounded-2xl overflow-hidden" style={{ background: '#111', border: '1px solid rgba(255,255,255,0.1)' }}>
            <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
              <h2 className="font-black text-white">{editing.id ? 'Edit' : 'Add'} Employee</h2>
              <button onClick={() => setEditing(null)}><X className="w-5 h-5 text-gray-500" /></button>
            </div>
            <div className="p-5 grid grid-cols-2 gap-3 overflow-y-auto max-h-[60vh]">
              {([['firstName','First Name'],['lastName','Last Name'],['email','Email'],['phone','Phone'],['role','Role']] as [keyof Employee, string][]).map(([k, label]) => (
                <div key={k} className={k === 'email' ? 'col-span-2' : ''}>
                  <p className="text-xs text-gray-500 mb-1">{label}</p>
                  <input value={(editing[k] as string) || ''} onChange={e => setEditing(prev => ({ ...prev, [k]: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl text-sm text-white focus:outline-none"
                    style={{ background: '#0d0d0d', border: '1px solid rgba(255,255,255,0.08)' }} />
                </div>
              ))}
              <div>
                <p className="text-xs text-gray-500 mb-1">Pay Type</p>
                <select value={editing.payType || 'hourly'} onChange={e => setEditing(p => ({ ...p, payType: e.target.value as PayType }))}
                  className="w-full px-3 py-2 rounded-xl text-sm text-white focus:outline-none"
                  style={{ background: '#0d0d0d', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <option value="hourly">Hourly</option><option value="salary">Salary</option><option value="contract">Contract</option>
                </select>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Rate</p>
                <input type="number" value={editing.payRate || ''} onChange={e => setEditing(p => ({ ...p, payRate: parseFloat(e.target.value) }))}
                  className="w-full px-3 py-2 rounded-xl text-sm text-white focus:outline-none"
                  style={{ background: '#0d0d0d', border: '1px solid rgba(255,255,255,0.08)' }} />
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Status</p>
                <select value={editing.status || 'active'} onChange={e => setEditing(p => ({ ...p, status: e.target.value as Status }))}
                  className="w-full px-3 py-2 rounded-xl text-sm text-white focus:outline-none"
                  style={{ background: '#0d0d0d', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <option value="active">Active</option><option value="inactive">Inactive</option><option value="onleave">On Leave</option>
                </select>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Start Date</p>
                <input type="date" value={editing.startDate || ''} onChange={e => setEditing(p => ({ ...p, startDate: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl text-sm text-white focus:outline-none"
                  style={{ background: '#0d0d0d', border: '1px solid rgba(255,255,255,0.08)' }} />
              </div>
            </div>
            <div className="flex justify-end gap-3 p-5 border-t" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
              <button onClick={() => setEditing(null)} className="px-5 py-2 rounded-xl text-sm text-gray-500">Cancel</button>
              <button onClick={() => saveEmp(editing)} className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-black text-white"
                style={{ background: 'linear-gradient(135deg,#ea580c,#c2410c)' }}>
                <Save className="w-4 h-4" /> Save
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-5xl mx-auto space-y-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(234,88,12,0.12)', border: '1px solid rgba(234,88,12,0.25)' }}>
              <Users className="w-7 h-7 text-orange-400" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-white">HR & Employee Hub</h1>
              <p className="text-gray-500 text-sm">Payroll · Time Tracking · Team Management</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={exportCSV} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-gray-500" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <Download className="w-4 h-4" /> Export
            </button>
            <button onClick={() => setEditing({ payType: 'hourly', payRate: 25, status: 'active', startDate: new Date().toISOString().slice(0,10), hoursThisWeek: 0, hoursThisPeriod: 0, certifications: [], notes: '', department: 'field' })}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-black text-white" style={{ background: 'linear-gradient(135deg,#ea580c,#c2410c)' }}>
              <Plus className="w-4 h-4" /> Add Employee
            </button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Active Employees', value: active.length, icon: Users, color: '#fb923c' },
            { label: 'Hours This Week', value: totalHours, icon: Clock, color: '#60a5fa' },
            { label: 'Period Payroll Est', value: `$${Math.round(periodPay).toLocaleString()}`, icon: DollarSign, color: '#34d399' },
          ].map(k => (
            <div key={k.label} className="rounded-2xl p-4" style={{ background: '#111', border: '1px solid rgba(255,255,255,0.07)' }}>
              <k.icon className="w-4 h-4 mb-2" style={{ color: k.color }} />
              <p className="text-xl font-black text-white">{k.value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{k.label}</p>
            </div>
          ))}
        </div>

        <div className="flex gap-1 p-1 rounded-xl" style={{ background: '#111', border: '1px solid rgba(255,255,255,0.07)' }}>
          {(['employees', 'payroll'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} className="flex-1 py-2 rounded-lg text-sm font-bold capitalize transition"
              style={tab === t ? { background: '#ea580c', color: 'white' } : { color: '#6b7280' }}>
              {t}
              {/* Held shifts only appear on the payroll tab, so the count has to
                  be visible from the other one or nobody finds them. */}
              {t === 'payroll' && heldShifts.length > 0 && (
                <span className="ml-2 px-1.5 py-0.5 rounded-full text-[10px] font-black text-amber-400 bg-amber-500/15 border border-amber-500/30">
                  {heldShifts.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {tab === 'employees' && (
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search employees…"
                className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm text-white focus:outline-none"
                style={{ background: '#111', border: '1px solid rgba(255,255,255,0.08)' }} />
            </div>
            {filtered.map(emp => {
              const open = expanded === emp.id;
              const pay = emp.payType === 'salary' ? emp.payRate / 26 : emp.payRate * emp.hoursThisPeriod;
              return (
                <div key={emp.id} className="rounded-2xl overflow-hidden" style={{ background: '#111', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <div className="flex items-center gap-3 p-4">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm flex-shrink-0" style={{ background: 'rgba(234,88,12,0.12)', color: '#fb923c' }}>
                      {emp.firstName[0]}{emp.lastName[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-bold text-white text-sm">{emp.firstName} {emp.lastName}</p>
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${STATUS_CLS[emp.status]}`}>{emp.status}</span>
                      </div>
                      <p className="text-xs text-gray-500">{emp.role} · {emp.department}</p>
                    </div>
                    <p className="hidden sm:block text-sm font-black text-white">{emp.payType === 'salary' ? `$${(emp.payRate/1000).toFixed(0)}k/yr` : `$${emp.payRate}/hr`}</p>
                    <p className="hidden sm:block text-sm font-bold text-green-400">${Math.round(pay).toLocaleString()}</p>
                    <div className="flex gap-1">
                      <button onClick={() => setEditing(emp)} className="p-1.5 rounded-lg text-gray-600 hover:text-white transition"><Edit2 className="w-3.5 h-3.5" /></button>
                      <button onClick={() => deleteEmp(emp.id)} className="p-1.5 rounded-lg text-gray-600 hover:text-red-400 transition"><Trash2 className="w-3.5 h-3.5" /></button>
                      <button onClick={() => setExpanded(open ? null : emp.id)} className="p-1.5 rounded-lg text-gray-600 hover:text-white transition">
                        {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  {open && (
                    <div className="border-t px-4 pb-3 pt-2 grid grid-cols-3 gap-2 text-xs" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                      <div><p className="text-gray-600">Email</p><p className="text-gray-300">{emp.email}</p></div>
                      <div><p className="text-gray-600">Phone</p><p className="text-gray-300">{emp.phone}</p></div>
                      <div><p className="text-gray-600">Start Date</p><p className="text-gray-300">{emp.startDate}</p></div>
                      <div className="col-span-3">
                        <p className="text-gray-600 mb-1">Certifications</p>
                        <div className="flex gap-1 flex-wrap">
                          {emp.certifications.length ? emp.certifications.map((c,i) => (
                            <span key={i} className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: 'rgba(234,88,12,0.1)', color: '#fb923c' }}>{c}</span>
                          )) : <span className="text-gray-600">None</span>}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {tab === 'payroll' && (
          <div className="space-y-3">
            {/* Held shifts come first. Their hours are missing from the estimate
                above, and a payroll run that is short by a day's labour should
                say so before somebody approves it. */}
            {heldShifts.length > 0 && (
              <div className="rounded-2xl p-4" style={{ background: '#111', border: '1px solid rgba(245,158,11,0.3)' }}>
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-5 h-5 shrink-0 text-amber-400 mt-0.5" />
                  <div className="min-w-0">
                    <p className="font-black text-white text-sm">
                      {heldShifts.length} shift{heldShifts.length === 1 ? '' : 's'} held back from payroll
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Nobody punched out of these, so the clock closed them after 16 hours with a
                      placeholder finish time. Their hours are not in the figures above. Ask what time
                      the person finished and record it here.
                    </p>
                  </div>
                </div>

                <div className="mt-3 space-y-2">
                  {heldShifts.map(shift => (
                    <div key={shift.id} className="rounded-xl p-3" style={{ background: '#0b0b0b', border: '1px solid rgba(255,255,255,0.07)' }}>
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="min-w-0">
                          <p className="font-bold text-white text-sm">{shift.employeeName || 'Unnamed employee'}</p>
                          <p className="text-xs text-gray-500">
                            In {new Date(shift.punchIn).toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                            {' · '}
                            <span className="text-amber-400">{shift.totalHours}h placeholder</span>
                          </p>
                        </div>
                        {fixingId !== shift.id && (
                          <button
                            onClick={() => { setFixingId(shift.id); setFinishDraft(toLocalInput(shift.punchOut || shift.punchIn)); }}
                            className="px-3 py-1.5 rounded-xl text-xs font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20"
                          >
                            Set finish time
                          </button>
                        )}
                      </div>

                      {fixingId === shift.id && (
                        <div className="mt-3 flex flex-wrap items-end gap-2">
                          <label className="text-xs text-gray-400">
                            <span className="block mb-1">When did they actually finish?</span>
                            <input
                              type="datetime-local"
                              value={finishDraft}
                              onChange={e => setFinishDraft(e.target.value)}
                              min={toLocalInput(shift.punchIn)}
                              className="px-3 py-2 rounded-xl text-sm text-white"
                              style={{ background: '#111', border: '1px solid rgba(255,255,255,0.12)' }}
                            />
                          </label>
                          <button
                            onClick={() => saveFinishTime(shift)}
                            disabled={savingFinish}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-white disabled:opacity-50"
                            style={{ background: 'linear-gradient(135deg,#ea580c,#c2410c)' }}
                          >
                            <Save className="w-3.5 h-3.5" /> {savingFinish ? 'Saving…' : 'Record'}
                          </button>
                          <button
                            onClick={() => { setFixingId(null); setFinishDraft(''); }}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-gray-400 border border-white/10"
                          >
                            <X className="w-3.5 h-3.5" /> Cancel
                          </button>
                          <p className="w-full text-[11px] text-gray-500">
                            The split across work orders was made against the placeholder, so it will
                            need redoing against the real hours before this can go to payroll.
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button onClick={() => {
              const run: PayrollRun = { id: `PAY-${Date.now()}`, periodStart: '2026-07-26', periodEnd: '2026-08-08', status: 'draft', totalGross: Math.round(periodPay), employeeCount: active.length };
              setPayroll(prev => [run, ...prev]);
              toast.success('Payroll run created');
            }} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-black text-white" style={{ background: 'linear-gradient(135deg,#ea580c,#c2410c)' }}>
              <Plus className="w-4 h-4" /> New Payroll Run
            </button>
            {payroll.map(run => (
              <div key={run.id} className="rounded-2xl p-4" style={{ background: '#111', border: '1px solid rgba(255,255,255,0.07)' }}>
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <p className="font-bold text-white text-sm">{run.periodStart} → {run.periodEnd}</p>
                    <p className="text-xs text-gray-500">{run.id} · {run.employeeCount} employees</p>
                  </div>
                  <div className="text-right">
                    <p className="font-black text-white">${run.totalGross.toLocaleString()}</p>
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${run.status === 'paid' ? 'text-green-400 bg-green-500/10 border-green-500/20' : run.status === 'approved' ? 'text-blue-400 bg-blue-500/10 border-blue-500/20' : 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20'}`}>{run.status.toUpperCase()}</span>
                  </div>
                </div>
                {run.status !== 'paid' && (
                  <div className="flex gap-2 mt-3">
                    {run.status === 'draft' && (
                      <button onClick={() => setPayroll(prev => prev.map(r => r.id === run.id ? { ...r, status: 'approved' } : r))}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-blue-400 bg-blue-500/10 border border-blue-500/20">
                        <CheckCircle className="w-3.5 h-3.5" /> Approve
                      </button>
                    )}
                    {run.status === 'approved' && (
                      <button onClick={() => setPayroll(prev => prev.map(r => r.id === run.id ? { ...r, status: 'paid' } : r))}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-green-400 bg-green-500/10 border border-green-500/20">
                        <DollarSign className="w-3.5 h-3.5" /> Mark Paid
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}

            {/* A way to see the held-shift panel without waiting for somebody to
                actually leave a punch running overnight. Says what it is; the
                planted shift belongs to no real employee and its hours are held
                out of payroll, so it cannot affect anybody's pay. */}
            <div className="pt-2 flex items-center gap-3 flex-wrap">
              <button
                onClick={() => demoHeldShift(hasDemoShift ? 'remove' : 'plant')}
                disabled={demoBusy}
                className="px-3 py-1.5 rounded-xl text-xs font-bold text-gray-400 border border-white/10 disabled:opacity-50"
              >
                {demoBusy ? 'Working…' : hasDemoShift ? 'Remove the demo held shift' : 'Plant a demo held shift'}
              </button>
              <span className="text-[11px] text-gray-600">
                Shows what a forgotten punch-out looks like. Nobody's pay is affected.
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
