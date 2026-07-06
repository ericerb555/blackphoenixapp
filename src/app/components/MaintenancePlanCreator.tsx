/**
 * MaintenancePlanCreator — Owner/Admin tool in the UnifiedDashboard.
 * Create maintenance/subscription plans, assign to portal users,
 * log usage hours, and track overages + balances owed.
 */
import { useState, useEffect } from 'react';
import { toast } from 'sonner@2.0.3';
import {
  Clock, Plus, Trash2, Edit2, X, Send, RefreshCw,
  ChevronDown, ChevronUp, CheckCircle, AlertTriangle,
  DollarSign, Users, Calendar, Eye, EyeOff, BarChart3,
  FileText, Wrench, Tag, TrendingUp,
} from 'lucide-react';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { useAuth } from '../contexts/AuthContext';
import { PORTAL_OPTIONS } from './DealPublisher';

const SERVER = `https://${projectId}.supabase.co/functions/v1/make-server-57095a78`;

// ── Helpers ───────────────────────────────────────────────────────────────────

function overageHours(p: any) { return Math.max(0, (p.hoursUsed || 0) - p.hoursIncluded); }
function overageOwed(p: any) { return overageHours(p) * p.overageRate; }
function pct(used: number, total: number) { return total > 0 ? Math.min(100, Math.round((used / total) * 100)) : 0; }

function statusDot(p: any) {
  if (!p.active) return 'bg-gray-500';
  const used = p.hoursUsed || 0;
  if (used > p.hoursIncluded) return 'bg-red-500 animate-pulse';
  if (used / p.hoursIncluded > 0.8) return 'bg-yellow-500 animate-pulse';
  return 'bg-green-500 animate-pulse';
}

const EMPTY_FORM = {
  name: '',
  description: '',
  hoursIncluded: '',
  overageRate: '',
  monthlyFee: '',
  billingCycle: 'monthly' as 'monthly' | 'annual',
  targetPortals: ['all'] as string[],
  assignedTo: '',
  assignedName: '',
  renewsOn: '',
  active: true,
};

// ── Log Hours Modal ───────────────────────────────────────────────────────────

function LogHoursModal({ plan, token, onClose, onSaved }: { plan: any; token: string; onClose: () => void; onSaved: (updatedPlan: any) => void }) {
  const [desc, setDesc] = useState('');
  const [hours, setHours] = useState('');
  const [tech, setTech] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (!desc || !hours) { toast.error('Description and hours required'); return; }
    const h = parseFloat(hours);
    if (isNaN(h) || h <= 0) { toast.error('Enter a valid number of hours'); return; }
    setSaving(true);
    try {
      const res = await fetch(`${SERVER}/maintenance-plans/${plan.id}/log-hours`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ hours: h, description: desc, tech, date }),
      });
      if (!res.ok) throw new Error('Server error');
      const data = await res.json();
      toast.success(`${h}h logged to ${plan.name}`);
      onSaved({ ...plan, hoursUsed: data.hoursUsed });
      onClose();
    } catch {
      toast.error('Failed to log hours');
    } finally {
      setSaving(false);
    }
  }

  const newUsed = (plan.hoursUsed || 0) + (parseFloat(hours) || 0);
  const willOverage = newUsed > plan.hoursIncluded;
  const newOverage = Math.max(0, newUsed - plan.hoursIncluded);

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-6 w-full max-w-md space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-white">Log Hours</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-[#2A2A2A] rounded-lg text-gray-400 hover:text-white transition"><X className="w-4 h-4" /></button>
        </div>
        <p className="text-sm text-gray-400">Plan: <span className="text-white font-medium">{plan.name}</span>
          {plan.assignedName && <span className="text-gray-500"> · {plan.assignedName}</span>}
        </p>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-1.5">Date</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              className="w-full bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-1.5">Description *</label>
            <input value={desc} onChange={e => setDesc(e.target.value)} placeholder="Work performed…"
              className="w-full bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500 placeholder-gray-600" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1.5">Hours *</label>
              <input type="number" step="0.5" min="0.5" value={hours} onChange={e => setHours(e.target.value)} placeholder="2.5"
                className="w-full bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500 placeholder-gray-600" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1.5">Technician</label>
              <input value={tech} onChange={e => setTech(e.target.value)} placeholder="Name"
                className="w-full bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500 placeholder-gray-600" />
            </div>
          </div>
        </div>

        {/* Usage preview */}
        <div className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg px-4 py-3 space-y-2">
          <div className="flex justify-between text-xs text-gray-500">
            <span>Current usage</span><span className="text-white">{(plan.hoursUsed || 0).toFixed(1)}h / {plan.hoursIncluded}h</span>
          </div>
          {parseFloat(hours) > 0 && (
            <div className="flex justify-between text-xs text-gray-500">
              <span>After logging</span>
              <span className={willOverage ? 'text-red-400 font-semibold' : 'text-green-400'}>{newUsed.toFixed(1)}h / {plan.hoursIncluded}h</span>
            </div>
          )}
          {willOverage && parseFloat(hours) > 0 && (
            <p className="text-xs text-yellow-300 pt-1 border-t border-[#2A2A2A]">
              ⚠ {newOverage.toFixed(1)}h overage · ${(newOverage * plan.overageRate).toFixed(2)} at ${plan.overageRate}/hr
            </p>
          )}
        </div>

        <div className="flex gap-3">
          <button onClick={submit} disabled={saving}
            className="flex-1 py-2.5 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white rounded-lg text-sm font-semibold transition">
            {saving ? 'Saving…' : 'Log Hours'}
          </button>
          <button onClick={onClose} className="px-4 py-2.5 bg-[#0A0A0A] border border-[#2A2A2A] text-gray-400 hover:text-white rounded-lg text-sm transition">Cancel</button>
        </div>
      </div>
    </div>
  );
}

// ── Usage Log Drawer ──────────────────────────────────────────────────────────

function UsageDrawer({ plan, token, onClose }: { plan: any; token: string; onClose: () => void }) {
  const [log, setLog] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${SERVER}/maintenance-plans/${plan.id}/usage`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => setLog(d.log || [])).catch(() => {}).finally(() => setLoading(false));
  }, [plan.id]);

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#2A2A2A]">
          <div>
            <h3 className="text-lg font-bold text-white">Usage Log</h3>
            <p className="text-xs text-gray-400 mt-0.5">{plan.name}{plan.assignedName ? ` · ${plan.assignedName}` : ''}</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-[#2A2A2A] rounded-lg text-gray-400 hover:text-white transition"><X className="w-4 h-4" /></button>
        </div>
        <div className="overflow-y-auto flex-1">
          {loading ? (
            <p className="text-center text-gray-500 py-8 text-sm">Loading…</p>
          ) : log.length === 0 ? (
            <p className="text-center text-gray-500 py-8 text-sm">No hours logged yet</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#2A2A2A]">
                  {['Date', 'Description', 'Tech', 'Hours'].map(h => (
                    <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider last:text-right">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {log.map((u, i) => (
                  <tr key={u.id} className={`border-b border-[#1A1A1A] hover:bg-[#0A0A0A]/50 ${i % 2 ? 'bg-[#0A0A0A]/20' : ''}`}>
                    <td className="px-5 py-3 text-gray-400 whitespace-nowrap">{new Date(u.date).toLocaleDateString()}</td>
                    <td className="px-5 py-3 text-white">{u.description}</td>
                    <td className="px-5 py-3 text-gray-400">{u.tech || '—'}</td>
                    <td className="px-5 py-3 text-right font-semibold text-white">{Number(u.hours).toFixed(1)}h</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-[#0A0A0A] border-t border-[#2A2A2A]">
                  <td colSpan={3} className="px-5 py-3 text-xs font-semibold text-gray-400 uppercase">Total logged</td>
                  <td className="px-5 py-3 text-right font-bold text-orange-400">
                    {log.reduce((a, u) => a + Number(u.hours), 0).toFixed(1)}h
                  </td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function MaintenancePlanCreator() {
  const { session } = useAuth();
  const token = session?.access_token || publicAnonKey;

  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [logPlan, setLogPlan] = useState<any>(null);
  const [viewUsagePlan, setViewUsagePlan] = useState<any>(null);
  const [expandedPlan, setExpandedPlan] = useState<string | null>(null);
  const [filterPortal, setFilterPortal] = useState('all');

  async function loadPlans() {
    setLoading(true);
    try {
      const res = await fetch(`${SERVER}/maintenance-plans`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setPlans(data.plans || []);
    } catch { toast.error('Failed to load plans'); }
    finally { setLoading(false); }
  }

  useEffect(() => { loadPlans(); }, []);

  function togglePortal(id: string) {
    setForm(prev => {
      if (id === 'all') return { ...prev, targetPortals: ['all'] };
      const without = prev.targetPortals.filter(p => p !== 'all');
      return without.includes(id)
        ? { ...prev, targetPortals: without.filter(p => p !== id).length ? without.filter(p => p !== id) : ['all'] }
        : { ...prev, targetPortals: [...without, id] };
    });
  }

  function startEdit(plan: any) {
    setForm({
      name: plan.name || '',
      description: plan.description || '',
      hoursIncluded: String(plan.hoursIncluded || ''),
      overageRate: String(plan.overageRate || ''),
      monthlyFee: String(plan.monthlyFee || ''),
      billingCycle: plan.billingCycle || 'monthly',
      targetPortals: plan.targetPortals || ['all'],
      assignedTo: plan.assignedTo || '',
      assignedName: plan.assignedName || '',
      renewsOn: plan.renewsOn ? plan.renewsOn.slice(0, 10) : '',
      active: plan.active !== false,
    });
    setEditingId(plan.id);
    setShowForm(true);
  }

  function cancelForm() { setShowForm(false); setEditingId(null); setForm({ ...EMPTY_FORM }); }

  async function savePlan() {
    if (!form.name.trim()) { toast.error('Plan name required'); return; }
    if (!form.hoursIncluded || isNaN(Number(form.hoursIncluded))) { toast.error('Hours included required'); return; }
    setSaving(true);
    try {
      const plan = { ...form, id: editingId || undefined, renewsOn: form.renewsOn ? new Date(form.renewsOn).toISOString() : '' };
      const res = await fetch(`${SERVER}/maintenance-plans`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      });
      if (!res.ok) throw new Error('Server error');
      toast.success(editingId ? 'Plan updated!' : 'Plan created!');
      cancelForm();
      loadPlans();
    } catch { toast.error('Failed to save plan'); }
    finally { setSaving(false); }
  }

  async function deletePlan(id: string) {
    try {
      await fetch(`${SERVER}/maintenance-plans/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      toast.success('Plan deleted');
      setPlans(prev => prev.filter(p => p.id !== id));
    } catch { toast.error('Failed to delete plan'); }
  }

  async function toggleActive(plan: any) {
    try {
      await fetch(`${SERVER}/maintenance-plans`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: { ...plan, active: !plan.active } }),
      });
      setPlans(prev => prev.map(p => p.id === plan.id ? { ...p, active: !p.active } : p));
      toast.success(plan.active ? 'Plan paused' : 'Plan activated');
    } catch { toast.error('Failed to update plan'); }
  }

  const portalLabel = (ids: string[]) => {
    if (!ids?.length || ids.includes('all')) return 'All Portals';
    return ids.map(id => PORTAL_OPTIONS.find(p => p.id === id)?.label || id).join(', ');
  };

  const filtered = plans.filter(p => filterPortal === 'all' || p.targetPortals?.includes(filterPortal) || p.targetPortals?.includes('all'));
  const totalOverageOwed = plans.reduce((a, p) => a + overageOwed(p), 0);
  const activePlans = plans.filter(p => p.active).length;

  return (
    <div className="space-y-6">
      {logPlan && <LogHoursModal plan={logPlan} token={token} onClose={() => setLogPlan(null)} onSaved={updated => setPlans(prev => prev.map(p => p.id === updated.id ? updated : p))} />}
      {viewUsagePlan && <UsageDrawer plan={viewUsagePlan} token={token} onClose={() => setViewUsagePlan(null)} />}

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Wrench className="w-5 h-5 text-orange-400" /> Maintenance Plan Creator
          </h2>
          <p className="text-sm text-gray-400 mt-0.5">Create service plans, assign to portal users, log hours, and track overages</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={loadPlans} className="p-2 rounded-lg bg-[#1A1A1A] border border-[#2A2A2A] text-gray-400 hover:text-white transition">
            <RefreshCw className="w-4 h-4" />
          </button>
          {!showForm && (
            <button onClick={() => setShowForm(true)}
              className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-lg text-sm font-semibold transition">
              <Plus className="w-4 h-4" /> New Plan
            </button>
          )}
        </div>
      </div>

      {/* Summary stats */}
      {plans.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Plans', value: plans.length, icon: FileText, color: 'text-blue-400' },
            { label: 'Active Plans', value: activePlans, icon: CheckCircle, color: 'text-green-400' },
            { label: 'Plans Over Limit', value: plans.filter(p => (p.hoursUsed || 0) > p.hoursIncluded).length, icon: AlertTriangle, color: 'text-red-400' },
            { label: 'Total Overages Owed', value: `$${totalOverageOwed.toFixed(2)}`, icon: DollarSign, color: 'text-yellow-400' },
          ].map((s, i) => {
            const Icon = s.icon;
            return (
              <div key={i} className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Icon className={`w-4 h-4 ${s.color}`} />
                  <p className="text-xs text-gray-500">{s.label}</p>
                </div>
                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit Form */}
      {showForm && (
        <div className="bg-[#1A1A1A] border border-orange-500/30 rounded-2xl p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-white">{editingId ? 'Edit Plan' : 'Create New Plan'}</h3>
            <button onClick={cancelForm} className="p-1.5 hover:bg-[#2A2A2A] rounded-lg text-gray-400 hover:text-white transition"><X className="w-4 h-4" /></button>
          </div>

          {/* Target portals */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Target Portals *</label>
            <div className="flex flex-wrap gap-2">
              {PORTAL_OPTIONS.map(p => {
                const sel = form.targetPortals.includes(p.id) || (p.id === 'all' && form.targetPortals.includes('all'));
                return (
                  <button key={p.id} onClick={() => togglePortal(p.id)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${sel ? p.color + ' ring-2 ring-offset-1 ring-offset-[#1A1A1A] ring-orange-500' : 'bg-[#0A0A0A] border-[#2A2A2A] text-gray-500 hover:text-gray-300'}`}>
                    {sel && '✓ '}{p.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Plan name + description */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1.5">Plan Name *</label>
              <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                placeholder="e.g. Basic Maintenance Plan"
                className="w-full bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500 placeholder-gray-600" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1.5">Assignee Email (optional)</label>
              <input value={form.assignedTo} onChange={e => setForm(p => ({ ...p, assignedTo: e.target.value }))}
                placeholder="user@email.com (leave blank for all users in portal)"
                className="w-full bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500 placeholder-gray-600" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1.5">Assignee Name</label>
              <input value={form.assignedName} onChange={e => setForm(p => ({ ...p, assignedName: e.target.value }))}
                placeholder="e.g. Angela Torres / Lakewood HOA"
                className="w-full bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500 placeholder-gray-600" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1.5">Description</label>
              <input value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                placeholder="What's included…"
                className="w-full bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500 placeholder-gray-600" />
            </div>
          </div>

          {/* Pricing */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1.5">Hours Included *</label>
              <input type="number" min="0" value={form.hoursIncluded} onChange={e => setForm(p => ({ ...p, hoursIncluded: e.target.value }))}
                placeholder="20"
                className="w-full bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500 placeholder-gray-600" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1.5">Overage Rate ($/hr)</label>
              <input type="number" min="0" step="0.01" value={form.overageRate} onChange={e => setForm(p => ({ ...p, overageRate: e.target.value }))}
                placeholder="85"
                className="w-full bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500 placeholder-gray-600" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1.5">Monthly Fee ($)</label>
              <input type="number" min="0" step="0.01" value={form.monthlyFee} onChange={e => setForm(p => ({ ...p, monthlyFee: e.target.value }))}
                placeholder="299"
                className="w-full bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500 placeholder-gray-600" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1.5">Renews On</label>
              <input type="date" value={form.renewsOn} onChange={e => setForm(p => ({ ...p, renewsOn: e.target.value }))}
                className="w-full bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500" />
            </div>
          </div>

          {/* Billing cycle + Active */}
          <div className="flex items-center gap-6 flex-wrap">
            <div className="flex items-center gap-3">
              <label className="text-xs font-semibold text-gray-400">Billing Cycle</label>
              {(['monthly', 'annual'] as const).map(c => (
                <button key={c} onClick={() => setForm(p => ({ ...p, billingCycle: c }))}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition border ${form.billingCycle === c ? 'bg-orange-600 text-white border-transparent' : 'bg-[#0A0A0A] border-[#2A2A2A] text-gray-400 hover:text-white'}`}>
                  {c.charAt(0).toUpperCase() + c.slice(1)}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setForm(p => ({ ...p, active: !p.active }))}
                className={`w-11 h-6 rounded-full transition-all relative ${form.active ? 'bg-orange-600' : 'bg-[#2A2A2A]'}`}>
                <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${form.active ? 'left-5' : 'left-0.5'}`} />
              </button>
              <span className="text-sm text-gray-300">{form.active ? 'Active' : 'Paused'}</span>
            </div>
          </div>

          {/* Preview */}
          {form.hoursIncluded && form.monthlyFee && (
            <div className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg px-4 py-3 flex items-center gap-6 text-sm text-gray-400 flex-wrap">
              <span><span className="text-white font-semibold">{form.hoursIncluded}h</span> included</span>
              <span><span className="text-white font-semibold">${form.monthlyFee}/mo</span></span>
              {form.overageRate && <span>Overage: <span className="text-yellow-400 font-semibold">${form.overageRate}/hr</span></span>}
              <span>→ <span className="text-orange-400 font-semibold">{portalLabel(form.targetPortals)}</span></span>
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button onClick={savePlan} disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white rounded-lg text-sm font-semibold transition">
              <Send className="w-4 h-4" /> {saving ? 'Saving…' : editingId ? 'Update Plan' : 'Create Plan'}
            </button>
            <button onClick={cancelForm} className="px-4 py-2.5 bg-[#0A0A0A] border border-[#2A2A2A] text-gray-400 hover:text-white rounded-lg text-sm font-medium transition">Cancel</button>
          </div>
        </div>
      )}

      {/* Filter */}
      {plans.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Filter:</span>
          {[{ id: 'all', label: 'All Portals' }, ...PORTAL_OPTIONS.filter(p => p.id !== 'all')].map(p => (
            <button key={p.id} onClick={() => setFilterPortal(p.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition ${filterPortal === p.id ? 'bg-orange-600 text-white border-transparent' : 'bg-[#1A1A1A] border-[#2A2A2A] text-gray-400 hover:text-white'}`}>
              {p.label}
            </button>
          ))}
        </div>
      )}

      {/* Plan list */}
      {loading ? (
        <div className="text-center py-12 text-gray-500 text-sm">Loading plans…</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl">
          <Wrench className="w-10 h-10 text-gray-700 mx-auto mb-3" />
          <p className="text-gray-400 font-medium">No maintenance plans yet</p>
          <p className="text-gray-600 text-sm mt-1">Create your first plan above and assign it to portal users</p>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">{filtered.length} plan{filtered.length !== 1 ? 's' : ''}</p>
          {filtered.map(plan => {
            const used = plan.hoursUsed || 0;
            const ovHours = overageHours(plan);
            const ovOwed = overageOwed(plan);
            const usedPct = pct(Math.min(used, plan.hoursIncluded), plan.hoursIncluded);
            const overLimit = used > plan.hoursIncluded;
            const expanded = expandedPlan === plan.id;

            return (
              <div key={plan.id} className={`bg-[#1A1A1A] border rounded-xl transition-all ${!plan.active ? 'border-[#2A2A2A] opacity-70' : overLimit ? 'border-red-500/30' : 'border-[#2A2A2A] hover:border-orange-500/20'}`}>
                <div className="flex items-center gap-4 px-5 py-4">
                  <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${statusDot(plan)}`} />

                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-white text-sm">{plan.name}</p>
                      {plan.assignedName && <span className="text-xs text-gray-400">· {plan.assignedName}</span>}
                      {!plan.active && <span className="text-xs text-gray-500 font-semibold">PAUSED</span>}
                      {overLimit && <span className="text-xs text-red-400 font-semibold">OVER LIMIT</span>}
                    </div>

                    {/* Mini gauge */}
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-2 bg-[#0A0A0A] rounded-full overflow-hidden border border-[#2A2A2A]">
                        <div className={`h-full rounded-full transition-all ${overLimit ? 'bg-red-500' : 'bg-orange-500'}`} style={{ width: `${usedPct}%` }} />
                      </div>
                      <span className={`text-xs font-medium whitespace-nowrap ${overLimit ? 'text-red-400' : 'text-gray-400'}`}>
                        {used.toFixed(1)} / {plan.hoursIncluded}h
                        {overLimit && ` (+${ovHours.toFixed(1)}h)`}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-gray-500 flex-wrap">
                      <span>{portalLabel(plan.targetPortals)}</span>
                      <span>${plan.monthlyFee}/mo · ${plan.overageRate}/hr overage</span>
                      {ovOwed > 0 && <span className="text-yellow-400 font-semibold">${ovOwed.toFixed(2)} overage owed</span>}
                      {plan.renewsOn && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {new Date(plan.renewsOn).toLocaleDateString()}</span>}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => setLogPlan(plan)} title="Log Hours"
                      className="p-1.5 rounded-lg hover:bg-orange-500/20 text-gray-400 hover:text-orange-400 transition">
                      <Clock className="w-4 h-4" />
                    </button>
                    <button onClick={() => setViewUsagePlan(plan)} title="View Usage"
                      className="p-1.5 rounded-lg hover:bg-[#2A2A2A] text-gray-400 hover:text-white transition">
                      <BarChart3 className="w-4 h-4" />
                    </button>
                    <button onClick={() => toggleActive(plan)} title={plan.active ? 'Pause' : 'Activate'}
                      className="p-1.5 rounded-lg hover:bg-[#2A2A2A] text-gray-400 hover:text-white transition">
                      {plan.active ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                    <button onClick={() => startEdit(plan)} title="Edit"
                      className="p-1.5 rounded-lg hover:bg-[#2A2A2A] text-gray-400 hover:text-white transition">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => deletePlan(plan.id)} title="Delete"
                      className="p-1.5 rounded-lg hover:bg-red-500/20 text-gray-400 hover:text-red-400 transition">
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => setExpandedPlan(expanded ? null : plan.id)}
                      className="p-1.5 rounded-lg hover:bg-[#2A2A2A] text-gray-400 hover:text-white transition">
                      {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {expanded && (
                  <div className="px-5 pb-4 border-t border-[#2A2A2A] pt-4 space-y-3">
                    {plan.description && <p className="text-sm text-gray-300">{plan.description}</p>}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div><p className="text-xs text-gray-500">Hours Used</p><p className={`font-bold ${overLimit ? 'text-red-400' : 'text-white'}`}>{used.toFixed(1)}h / {plan.hoursIncluded}h</p></div>
                      <div><p className="text-xs text-gray-500">Overage Hours</p><p className={`font-bold ${ovHours > 0 ? 'text-red-400' : 'text-gray-500'}`}>{ovHours.toFixed(1)}h</p></div>
                      <div><p className="text-xs text-gray-500">Overage Owed</p><p className={`font-bold ${ovOwed > 0 ? 'text-yellow-400' : 'text-gray-500'}`}>${ovOwed.toFixed(2)}</p></div>
                      <div><p className="text-xs text-gray-500">Period Total</p><p className="font-bold text-white">${(plan.monthlyFee + ovOwed).toFixed(2)}</p></div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {(plan.targetPortals || ['all']).map((pid: string) => {
                        const opt = PORTAL_OPTIONS.find(p => p.id === pid);
                        return opt ? <span key={pid} className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${opt.color}`}>{opt.label}</span> : null;
                      })}
                    </div>
                    <p className="text-xs text-gray-600">Created by {plan.createdBy} · {plan.createdAt ? new Date(plan.createdAt).toLocaleDateString() : ''}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
