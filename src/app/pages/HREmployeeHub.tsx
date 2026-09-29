import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { saveDual, loadDual } from '../lib/database';
import { projectId } from '../utils/supabase/info';
import { Users, Clock, DollarSign, Plus, Search, Edit2, Trash2, ChevronDown, ChevronUp, CheckCircle, Download, Save, X, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import TimeOffApprovals from '../components/schedule/TimeOffApprovals';

type PayType = 'hourly' | 'salary' | 'contract';
type Status = 'active' | 'inactive' | 'onleave';

interface Employee {
  id: string; firstName: string; lastName: string; email: string; phone: string;
  role: string; department: string; payType: PayType;
  /** What we PAY. Hourly, or ANNUAL when payType is 'salary'. */
  payRate: number;
  /**
   * What an hour of their time is CHARGED at. Always hourly.
   *
   * The gap between this and the cost is the labour margin on a job, which is
   * why both are kept — the same reason a purchase order's total (what we pay
   * the vendor) is held apart from what the customer is charged.
   */
  billRate?: number;
  status: Status; startDate: string; hoursThisWeek: number; hoursThisPeriod: number;
  certifications: string[]; notes: string;
}

/**
 * What one hour of this person costs.
 *
 * Mirrors `employeeRates.ts` on the server, and exists for the same reason: a
 * salaried employee's `payRate` is ANNUAL, so using it as an hourly figure
 * makes a project manager's hour cost seventy-two thousand pounds. Shown on
 * this screen beside the bill rate, so the margin is the real one.
 */
const HOURS_PER_YEAR = 2080;
const hourlyCost = (e: Partial<Employee>): number | null => {
  const rate = Number(e?.payRate);
  if (!Number.isFinite(rate) || rate <= 0) return null;
  return e?.payType === 'salary' ? rate / HOURS_PER_YEAR : rate;
};
const hourlyBill = (e: Partial<Employee>): number | null => {
  const rate = Number(e?.billRate);
  return Number.isFinite(rate) && rate > 0 ? rate : null;
};

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

/**
 * There are no seed employees.
 *
 * This held four invented people — Mike Torres, Jake Sullivan, Lisa Park and
 * Tom Walsh — on a payroll screen. They were harmless while this screen only
 * talked to itself. They stopped being harmless when it started reading the
 * records job costing uses: two of them carried SALARIES (55,000 and 72,000)
 * in a field that is multiplied by hours everywhere else.
 *
 * An empty list is also the honest thing to show. A payroll screen listing
 * staff who do not exist invites somebody to run payroll against them.
 */
const SEED: Employee[] = [];


/**
 * There are no seed payroll runs either.
 *
 * This held two: PAY-001 marked PAID at 18,640 gross, and PAY-002 as a draft
 * at 19,120, both for `employeeCount: 4` — the four invented employees removed
 * alongside them.
 *
 * A fabricated payroll history is worse than a fabricated staff list. It says
 * money was paid to people on dates it was not, on the screen somebody would
 * check to find out whether it had been. One marked "paid" is a record of a
 * transaction that never happened.
 */
const SEED_PAYROLL: PayrollRun[] = [];

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
  const [tab, setTab] = useState<'employees' | 'payroll' | 'time off'>('employees');
  /* Pending requests, counted here so the badge shows from any tab — a request
     nobody sees is a technician who does not know if they have the day. */
  const [pendingTimeOff, setPendingTimeOff] = useState(0);
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

  /**
   * The employee records the platform actually uses.
   *
   * `time_employee:<id>` is the store job costing, the timeclock and the hours
   * summary all read. Mapped into this screen's shape here — one `name` field
   * becomes first and last, because that is what this screen was built around
   * and splitting on the first space is lossless enough for a display name.
   */
  async function loadTimeEmployees(): Promise<Employee[]> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return [];
      const res = await fetch(`${TIME_API(projectId)}/employees`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) return [];
      const json = await res.json();
      const rows: any[] = Array.isArray(json?.employees) ? json.employees : [];
      return rows.map((r) => {
        const [firstName = '', ...rest] = String(r.name || '').trim().split(/\s+/);
        return {
          id: String(r.id),
          firstName,
          lastName: rest.join(' '),
          email: String(r.email || ''),
          phone: String(r.phoneNumber || ''),
          role: String(r.role || 'Employee'),
          department: String(r.department || 'field'),
          payType: (r.payType === 'salary' ? 'salary' : 'hourly') as PayType,
          payRate: Number(r.payRate) || 0,
          billRate: Number(r.billRate) || 0,
          status: 'active' as Status,
          startDate: String(r.createdAt || '').slice(0, 10),
          hoursThisWeek: Number(r.hoursWeek) || 0,
          hoursThisPeriod: Number(r.hoursWeek) || 0,
          certifications: [],
          notes: '',
        };
      });
    } catch {
      // A screen that cannot reach the server shows what it has rather than
      // nothing; the local copy is still there.
      return [];
    }
  }

  // Hydrate from the server on mount (falls back to the localStorage-seeded
  // initial state if nothing is stored server-side yet).
  useEffect(() => {
    (async () => {
      /**
       * The real employee records, not this screen's own copy.
       *
       * `hr_employees` is still read as a fallback for anything created here
       * before the two stores were joined, but `time_employee:` wins — it is
       * what job costing, the timeclock and payroll hours all read, so a rate
       * edited here now reaches them.
       */
      const [serverEmployees, emp, pay] = await Promise.all([
        loadTimeEmployees(),
        loadDual('hr_employees'),
        loadDual('hr_payroll'),
      ]);
      const local: Employee[] = (Array.isArray(emp) && emp.length) ? emp : [];
      const byId = new Map<string, Employee>();
      for (const e of local) if (e?.id) byId.set(String(e.id), e);
      for (const e of serverEmployees) if (e?.id) byId.set(String(e.id), { ...byId.get(String(e.id)), ...e });
      const base: Employee[] = [...byId.values()];
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

  /**
   * Save to the employee record the rest of the platform actually reads.
   *
   * This used to write only `hr_employees`, a store of its own, joined to time
   * tracking by matching full names. Job costing reads `time_employee:<id>`,
   * so a pay rate set here reached the figures on this page and nothing else —
   * every hour booked by that person was still counted as unpriced.
   *
   * Now it posts to the same admin-gated route the timeclock uses, so there is
   * one employee list and one place each rate lives. The local state is updated
   * from what the server returns rather than from what was typed, so a refusal
   * shows as a refusal instead of a saved-looking screen.
   */
  async function saveEmp(emp: Partial<Employee>) {
    if (!emp.firstName || !emp.lastName) { toast.error('Name required'); return; }
    const id = emp.id || `EMP-${Date.now()}`;
    const name = `${emp.firstName} ${emp.lastName}`.trim();
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Sign in again to save.');
      const res = await fetch(`${TIME_API(projectId)}/employees`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id, name,
          role: emp.role || 'Employee',
          department: emp.department || 'field',
          phoneNumber: emp.phone || '',
          payType: emp.payType || 'hourly',
          payRate: Number(emp.payRate) || 0,
          billRate: Number(emp.billRate) || 0,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json?.success === false) throw new Error(json?.error || `Save failed (${res.status})`);

      const full = { ...emp, id } as Employee;
      setEmployees(prev => {
        const i = prev.findIndex(x => x.id === full.id);
        if (i >= 0) { const n = [...prev]; n[i] = full; return n; }
        return [...prev, full];
      });
      setEditing(null);
      toast.success('Saved');
    } catch (error: any) {
      toast.error(error.message || 'Could not save this employee.');
    }
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
                <p className="text-xs text-gray-500 mb-1">
                  {editing.payType === 'salary' ? 'Salary (per year)' : 'Pay rate (per hour)'}
                </p>
                <input type="number" value={editing.payRate || ''} onChange={e => setEditing(p => ({ ...p, payRate: parseFloat(e.target.value) }))}
                  className="w-full px-3 py-2 rounded-xl text-sm text-white focus:outline-none"
                  style={{ background: '#0d0d0d', border: '1px solid rgba(255,255,255,0.08)' }} />
                {/*
                  Said out loud, because the same field means two different
                  things depending on the pay type and a salary entered as an
                  hourly rate would cost a job seventy-two thousand an hour.
                */}
                {editing.payType === 'salary' && hourlyCost(editing) !== null && (
                  <p className="mt-1 text-[11px] text-gray-500">
                    Costs ${hourlyCost(editing)!.toFixed(2)}/hr on a job ({HOURS_PER_YEAR}h year)
                  </p>
                )}
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Billed out (per hour)</p>
                <input type="number" value={editing.billRate || ''} onChange={e => setEditing(p => ({ ...p, billRate: parseFloat(e.target.value) }))}
                  className="w-full px-3 py-2 rounded-xl text-sm text-white focus:outline-none"
                  style={{ background: '#0d0d0d', border: '1px solid rgba(255,255,255,0.08)' }} />
                {/*
                  The margin, shown where both numbers are being typed — it is
                  the figure the pair exists to produce, and a rate billed
                  below cost should be visible while it is being set rather
                  than discovered on a job report later.
                */}
                {(() => {
                  const cost = hourlyCost(editing);
                  const bill = hourlyBill(editing);
                  if (cost === null || bill === null) return null;
                  const profit = bill - cost;
                  return (
                    <p className={`mt-1 text-[11px] ${profit < 0 ? 'text-red-400' : 'text-green-400'}`}>
                      {profit < 0 ? 'Billed BELOW cost: ' : 'Margin: '}
                      ${profit.toFixed(2)}/hr ({((profit / bill) * 100).toFixed(0)}%)
                    </p>
                  );
                })()}
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
          {(['employees', 'payroll', 'time off'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} className="flex-1 py-2 rounded-lg text-sm font-bold capitalize transition"
              style={tab === t ? { background: '#ea580c', color: 'white' } : { color: '#6b7280' }}>
              {t}
              {/* Held shifts only appear on the payroll tab, so the count has to
                  be visible from the other one or nobody finds them. */}
              {t === 'time off' && pendingTimeOff > 0 && (
                <span className="ml-2 px-1.5 py-0.5 rounded-full text-[10px] font-black text-amber-400 bg-amber-500/15 border border-amber-500/30">
                  {pendingTimeOff}
                </span>
              )}
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

        {tab === 'time off' && (
          /*
            Names come from the roster this screen already holds, so the list
            reads as people rather than as uuids. Falls back to the id when
            somebody self-provisioned a timesheet and has no HR record yet.
          */
          <TimeOffApprovals
            onPendingCount={setPendingTimeOff}
            nameFor={(id) => {
              const match = employees.find(e => String(e.id) === String(id));
              return match ? `${match.firstName} ${match.lastName}`.trim() : id;
            }}
          />
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
