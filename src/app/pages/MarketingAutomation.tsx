import { useState, useEffect } from 'react';
import { Zap, Plus, Trash2, Play, Pause, Edit3, Copy, CheckCircle, Clock, Mail, MessageSquare, Bell, Tag, DollarSign, Users, ChevronRight, ChevronDown, Info, BarChart2, X, Save } from 'lucide-react';
import { toast } from 'sonner';
import { publicAnonKey, projectId } from '../utils/supabase/info';

const SERVER = `https://${projectId}.supabase.co/functions/v1/make-server-57095a78`;
const authHeaders = { 'Content-Type': 'application/json', Authorization: `Bearer ${publicAnonKey}` };

// ─── Types ────────────────────────────────────────────────────────────────────

type TriggerType = 'job_completed' | 'estimate_sent' | 'invoice_overdue' | 'new_lead' | 'job_started' | 'review_requested' | 'no_contact_30d';
type ActionType = 'send_email' | 'send_sms' | 'add_tag' | 'internal_note' | 'assign_follow_up' | 'send_review_request' | 'add_discount';
type WorkflowStatus = 'active' | 'paused' | 'draft';

interface WorkflowAction {
  id: string;
  type: ActionType;
  delayDays: number;
  subject?: string;
  body: string;
  tag?: string;
}

interface Workflow {
  id: string;
  name: string;
  trigger: TriggerType;
  status: WorkflowStatus;
  actions: WorkflowAction[];
  runCount: number;
  createdAt: string;
  description: string;
  lastRun?: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TRIGGERS: { value: TriggerType; label: string; icon: any; desc: string }[] = [
  { value: 'new_lead', label: 'New Lead Created', icon: Users, desc: 'When a lead is added to the system' },
  { value: 'estimate_sent', label: 'Estimate Sent', icon: DollarSign, desc: 'When an estimate is emailed to a client' },
  { value: 'job_started', label: 'Job Started', icon: Play, desc: 'When a job status changes to In Progress' },
  { value: 'job_completed', label: 'Job Completed', icon: CheckCircle, desc: 'When a job is marked complete' },
  { value: 'invoice_overdue', label: 'Invoice Overdue', icon: Clock, desc: 'When an invoice passes its due date' },
  { value: 'review_requested', label: 'Review Requested', icon: Bell, desc: 'After a review request is sent' },
  { value: 'no_contact_30d', label: 'No Contact 30 Days', icon: MessageSquare, desc: 'No activity for 30 days — re-engagement' },
];

const ACTIONS: { value: ActionType; label: string; icon: any; color: string }[] = [
  { value: 'send_email', label: 'Send Email', icon: Mail, color: 'text-blue-400' },
  { value: 'send_sms', label: 'Send SMS', icon: MessageSquare, color: 'text-green-400' },
  { value: 'add_tag', label: 'Add Tag', icon: Tag, color: 'text-yellow-400' },
  { value: 'internal_note', label: 'Internal Note', icon: Bell, color: 'text-purple-400' },
  { value: 'send_review_request', label: 'Send Review Request', icon: CheckCircle, color: 'text-orange-400' },
  { value: 'add_discount', label: 'Add Discount Code', icon: DollarSign, color: 'text-pink-400' },
];

const DEFAULT_WORKFLOWS: Workflow[] = [
  {
    id: 'wf-1',
    name: 'New Lead Welcome',
    trigger: 'new_lead',
    status: 'active',
    runCount: 0,
    createdAt: '2026-06-01',
    description: 'Greet new leads instantly, follow up in 2 days.',
    actions: [
      { id: 'a1', type: 'send_email', delayDays: 0, subject: 'Thanks for reaching out to Black Phoenix Builds!', body: "Hi {{name}},\n\nThank you for contacting us! We're excited to learn about your project. Someone from our team will be in touch within 24 hours.\n\nIn the meantime, check out our recent work at blackphoenixbuilds.com.\n\n— The Black Phoenix Team" },
      { id: 'a2', type: 'add_tag', delayDays: 0, body: '', tag: 'new-lead' },
      { id: 'a3', type: 'send_email', delayDays: 2, subject: 'Still thinking about your project?', body: "Hi {{name}},\n\nJust following up to see if you have any questions. We'd love to schedule a free estimate at your convenience.\n\nReply to this email or call us any time.\n\n— Black Phoenix Builds" },
    ],
  },
  {
    id: 'wf-2',
    name: 'Post-Job Review Request',
    trigger: 'job_completed',
    status: 'active',
    runCount: 0,
    createdAt: '2026-05-15',
    description: 'Ask for a Google review 3 days after completion.',
    actions: [
      { id: 'a4', type: 'send_email', delayDays: 3, subject: "How did we do, {{name}}?", body: "Hi {{name}},\n\nThank you for choosing Black Phoenix Builds! We hope you're loving the results.\n\nWould you mind leaving us a quick Google review? It takes less than 2 minutes and helps us a ton:\n\n⭐ [Leave a Review]\n\nThank you so much — it means the world to us!\n\n— Eric & the Black Phoenix team" },
      { id: 'a5', type: 'add_tag', delayDays: 3, body: '', tag: 'review-requested' },
    ],
  },
  {
    id: 'wf-3',
    name: 'Overdue Invoice Reminder',
    trigger: 'invoice_overdue',
    status: 'paused',
    runCount: 0,
    createdAt: '2026-05-20',
    description: 'Friendly reminder, then escalate after a week.',
    actions: [
      { id: 'a6', type: 'send_email', delayDays: 0, subject: 'Friendly reminder — Invoice #{invoice_num} due', body: "Hi {{name}},\n\nThis is a friendly reminder that invoice #{invoice_num} for ${{amount}} is past due. If you have any questions, please reach out.\n\nYou can pay online at [Pay Now].\n\nThank you!" },
      { id: 'a7', type: 'internal_note', delayDays: 7, body: 'Invoice still unpaid after 7 days. Consider calling {{name}} directly.' },
    ],
  },
];

const BLANK_ACTION = (): WorkflowAction => ({
  id: `a-${Date.now()}`,
  type: 'send_email',
  delayDays: 0,
  subject: '',
  body: '',
});

const BLANK_WORKFLOW = (): Workflow => ({
  id: `wf-${Date.now()}`,
  name: 'New Workflow',
  trigger: 'new_lead',
  status: 'draft',
  actions: [BLANK_ACTION()],
  runCount: 0,
  createdAt: new Date().toISOString().split('T')[0],
  description: '',
});

async function saveToServer(ws: Workflow[]) {
  try {
    const res = await fetch(`${SERVER}/automation/workflows`, { method: 'POST', headers: authHeaders, body: JSON.stringify({ workflows: ws }) });
    const json = await res.json();
    if (!json.success) console.error('Failed to save workflows:', json.error);
  } catch (err) {
    console.error('Network error saving workflows:', err);
  }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function TriggerBadge({ trigger }: { trigger: TriggerType }) {
  const t = TRIGGERS.find(t => t.value === trigger);
  if (!t) return null;
  const Icon = t.icon;
  return (
    <span className="inline-flex items-center gap-1 text-[10px] bg-[#1a1a1a] border border-[#2a2a2a] text-gray-400 px-2 py-0.5 rounded-full">
      <Icon className="w-3 h-3" />
      {t.label}
    </span>
  );
}

function StatusBadge({ status }: { status: WorkflowStatus }) {
  const map = {
    active: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    paused: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    draft: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
  };
  return (
    <span className={`text-[10px] font-semibold border px-2 py-0.5 rounded-full capitalize ${map[status]}`}>
      {status}
    </span>
  );
}

function ActionIcon({ type }: { type: ActionType }) {
  const a = ACTIONS.find(a => a.value === type);
  if (!a) return null;
  const Icon = a.icon;
  return <Icon className={`w-4 h-4 ${a.color}`} />;
}

// ─── Editor Modal ─────────────────────────────────────────────────────────────

function WorkflowEditor({ workflow, onSave, onClose }: {
  workflow: Workflow;
  onSave: (w: Workflow) => void;
  onClose: () => void;
}) {
  const [wf, setWf] = useState<Workflow>(JSON.parse(JSON.stringify(workflow)));

  function setField(key: keyof Workflow, val: any) {
    setWf(w => ({ ...w, [key]: val }));
  }

  function updateAction(id: string, key: keyof WorkflowAction, val: any) {
    setWf(w => ({ ...w, actions: w.actions.map(a => a.id === id ? { ...a, [key]: val } : a) }));
  }

  function addAction() {
    setWf(w => ({ ...w, actions: [...w.actions, BLANK_ACTION()] }));
  }

  function removeAction(id: string) {
    setWf(w => ({ ...w, actions: w.actions.filter(a => a.id !== id) }));
  }

  function moveAction(id: string, dir: 1 | -1) {
    setWf(w => {
      const idx = w.actions.findIndex(a => a.id === id);
      if (idx < 0) return w;
      const next = idx + dir;
      if (next < 0 || next >= w.actions.length) return w;
      const actions = [...w.actions];
      [actions[idx], actions[next]] = [actions[next], actions[idx]];
      return { ...w, actions };
    });
  }

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-start justify-center p-4 overflow-auto">
      <div className="w-full max-w-2xl bg-[#0e0e0e] border border-[#222] rounded-2xl shadow-2xl my-4">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#1a1a1a]">
          <h2 className="font-bold text-white">Edit Workflow</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Basics */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-400 mb-1.5 block">Workflow Name</label>
              <input value={wf.name} onChange={e => setField('name', e.target.value)}
                className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500 transition" />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1.5 block">Status</label>
              <select value={wf.status} onChange={e => setField('status', e.target.value as WorkflowStatus)}
                className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500 transition">
                <option value="active">Active</option>
                <option value="paused">Paused</option>
                <option value="draft">Draft</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-400 mb-1.5 block">Description</label>
            <input value={wf.description} onChange={e => setField('description', e.target.value)}
              placeholder="Brief description of this workflow"
              className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500 transition" />
          </div>

          {/* Trigger */}
          <div>
            <label className="text-xs text-gray-400 mb-1.5 block">Trigger</label>
            <select value={wf.trigger} onChange={e => setField('trigger', e.target.value as TriggerType)}
              className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500 transition">
              {TRIGGERS.map(t => <option key={t.value} value={t.value}>{t.label} — {t.desc}</option>)}
            </select>
          </div>

          {/* Actions */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs text-gray-400">Actions ({wf.actions.length})</label>
              <button onClick={addAction} className="text-xs text-orange-400 hover:text-orange-300 flex items-center gap-1 transition">
                <Plus className="w-3.5 h-3.5" /> Add Step
              </button>
            </div>
            <div className="space-y-3">
              {wf.actions.map((action, idx) => (
                <div key={action.id} className="bg-[#141414] border border-[#222] rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500 font-medium">Step {idx + 1}</span>
                    <div className="flex gap-1">
                      {idx > 0 && <button onClick={() => moveAction(action.id, -1)} className="text-gray-600 hover:text-gray-400 text-xs px-1">↑</button>}
                      {idx < wf.actions.length - 1 && <button onClick={() => moveAction(action.id, 1)} className="text-gray-600 hover:text-gray-400 text-xs px-1">↓</button>}
                      <button onClick={() => removeAction(action.id)} className="text-gray-600 hover:text-red-400 ml-1 transition">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] text-gray-500 block mb-1">Action Type</label>
                      <select value={action.type} onChange={e => updateAction(action.id, 'type', e.target.value as ActionType)}
                        className="w-full bg-[#1e1e1e] border border-[#2a2a2a] rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-orange-500 transition">
                        {ACTIONS.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] text-gray-500 block mb-1">Delay (days after trigger)</label>
                      <input type="number" min={0} max={365} value={action.delayDays}
                        onChange={e => updateAction(action.id, 'delayDays', parseInt(e.target.value) || 0)}
                        className="w-full bg-[#1e1e1e] border border-[#2a2a2a] rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-orange-500 transition" />
                    </div>
                  </div>

                  {(action.type === 'send_email' || action.type === 'send_review_request') && (
                    <div>
                      <label className="text-[10px] text-gray-500 block mb-1">Subject</label>
                      <input value={action.subject || ''} onChange={e => updateAction(action.id, 'subject', e.target.value)}
                        placeholder="Email subject line"
                        className="w-full bg-[#1e1e1e] border border-[#2a2a2a] rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-orange-500 transition" />
                    </div>
                  )}

                  {action.type === 'add_tag' ? (
                    <div>
                      <label className="text-[10px] text-gray-500 block mb-1">Tag Name</label>
                      <input value={action.tag || ''} onChange={e => updateAction(action.id, 'tag', e.target.value)}
                        placeholder="e.g. hot-lead, vip, follow-up"
                        className="w-full bg-[#1e1e1e] border border-[#2a2a2a] rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-orange-500 transition" />
                    </div>
                  ) : (
                    <div>
                      <label className="text-[10px] text-gray-500 block mb-1">
                        {action.type === 'internal_note' ? 'Note' : 'Message Body'}
                        <span className="text-gray-600 ml-1">— use {'{{name}}'}, {'{{amount}}'}, {'{{invoice_num}}'}</span>
                      </label>
                      <textarea rows={4} value={action.body} onChange={e => updateAction(action.id, 'body', e.target.value)}
                        placeholder="Message content..."
                        className="w-full bg-[#1e1e1e] border border-[#2a2a2a] rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-orange-500 transition resize-none" />
                    </div>
                  )}
                </div>
              ))}
              {wf.actions.length === 0 && (
                <button onClick={addAction} className="w-full py-6 border border-dashed border-[#2a2a2a] rounded-xl text-sm text-gray-600 hover:text-gray-400 hover:border-gray-500 transition">
                  + Add First Step
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 px-5 pb-5">
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm text-gray-400 hover:text-white transition">Cancel</button>
          <button onClick={() => { onSave(wf); toast.success('Workflow saved.'); }}
            className="flex items-center gap-2 px-5 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-sm font-semibold transition">
            <Save className="w-4 h-4" />
            Save Workflow
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function MarketingAutomation() {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [editing, setEditing] = useState<Workflow | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [tab, setTab] = useState<'workflows' | 'templates' | 'stats'>('workflows');

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${SERVER}/automation/workflows`, { headers: authHeaders });
        const json = await res.json();
        if (json.success && Array.isArray(json.workflows) && json.workflows.length) {
          setWorkflows(json.workflows);
        } else {
          setWorkflows(DEFAULT_WORKFLOWS);
          saveToServer(DEFAULT_WORKFLOWS);
        }
      } catch (err) {
        console.error('Network error loading workflows:', err);
        setWorkflows(DEFAULT_WORKFLOWS);
      }
    })();
  }, []);

  function persist(ws: Workflow[]) {
    setWorkflows(ws);
    saveToServer(ws);
  }

  function handleSave(wf: Workflow) {
    persist(workflows.map(w => w.id === wf.id ? wf : w));
    setEditing(null);
  }

  function handleCreate() {
    const wf = BLANK_WORKFLOW();
    persist([...workflows, wf]);
    setEditing(wf);
  }

  function handleDuplicate(wf: Workflow) {
    const copy = { ...JSON.parse(JSON.stringify(wf)), id: `wf-${Date.now()}`, name: `${wf.name} (Copy)`, runCount: 0, status: 'draft' as WorkflowStatus };
    persist([...workflows, copy]);
    toast.success('Workflow duplicated as draft.');
  }

  function handleDelete(id: string) {
    persist(workflows.filter(w => w.id !== id));
    toast.success('Workflow deleted.');
  }

  function toggleStatus(id: string) {
    persist(workflows.map(w => {
      if (w.id !== id) return w;
      const next = w.status === 'active' ? 'paused' : 'active';
      toast.success(`Workflow ${next === 'active' ? 'activated' : 'paused'}.`);
      return { ...w, status: next };
    }));
  }

  async function runWorkflow(id: string) {
    const wf = workflows.find(w => w.id === id);
    if (!wf) return;
    if (wf.status !== 'active') { toast.error('Activate the workflow before running it.'); return; }
    try {
      const res = await fetch(`${SERVER}/automation/workflows/${id}/run`, { method: 'POST', headers: authHeaders });
      const json = await res.json();
      if (json.success && json.workflow) {
        setWorkflows(prev => prev.map(w => w.id === id ? { ...w, runCount: json.workflow.runCount, lastRun: json.workflow.lastRun } : w));
        toast.success(`"${wf.name}" ran — ${json.workflow.runCount} total run${json.workflow.runCount === 1 ? '' : 's'}.`);
      } else {
        toast.error(json.error || 'Failed to run workflow');
      }
    } catch (err) {
      console.error('Failed to run workflow:', err);
      toast.error('Network error running workflow');
    }
  }

  function useTemplate(tmpl: Partial<Workflow>) {
    const wf: Workflow = { ...BLANK_WORKFLOW(), ...tmpl, id: `wf-${Date.now()}`, runCount: 0, createdAt: new Date().toISOString().split('T')[0], status: 'draft' };
    persist([...workflows, wf]);
    setEditing(wf);
    setTab('workflows');
    toast.success('Template loaded — review and activate when ready.');
  }

  const totalRuns = workflows.reduce((s, w) => s + w.runCount, 0);
  const active = workflows.filter(w => w.status === 'active').length;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {editing && (
        <WorkflowEditor
          workflow={editing}
          onSave={handleSave}
          onClose={() => setEditing(null)}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center">
            <Zap className="w-5 h-5 text-orange-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Marketing Automation</h1>
            <p className="text-sm text-gray-400">Trigger emails, SMS, and tasks automatically</p>
          </div>
        </div>
        <button onClick={handleCreate}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-sm font-semibold transition">
          <Plus className="w-4 h-4" />
          New Workflow
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Total Workflows', value: workflows.length },
          { label: 'Active', value: active, color: 'text-emerald-400' },
          { label: 'Paused', value: workflows.filter(w => w.status === 'paused').length, color: 'text-yellow-400' },
          { label: 'Total Runs', value: totalRuns, color: 'text-blue-400' },
        ].map(s => (
          <div key={s.label} className="bg-[#111] border border-[#222] rounded-xl p-4 text-center">
            <p className={`text-2xl font-bold ${s.color || 'text-white'}`}>{s.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl p-1 w-fit">
        {(['workflows', 'templates', 'stats'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition capitalize ${tab === t ? 'bg-[#1e1e1e] text-white' : 'text-gray-500 hover:text-gray-300'}`}>
            {t}
          </button>
        ))}
      </div>

      {/* ── Workflows Tab ── */}
      {tab === 'workflows' && (
        <div className="space-y-3">
          {workflows.length === 0 && (
            <div className="text-center py-16 text-gray-600">
              <Zap className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No workflows yet. Create one or pick a template.</p>
            </div>
          )}
          {workflows.map(wf => (
            <div key={wf.id} className="bg-[#111] border border-[#222] rounded-xl overflow-hidden">
              <div className="px-5 py-4 flex items-center gap-4">
                {/* Toggle */}
                <button onClick={() => toggleStatus(wf.id)}
                  className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition ${wf.status === 'active' ? 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20' : 'bg-[#1a1a1a] text-gray-600 hover:text-gray-400'}`}>
                  {wf.status === 'active' ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                </button>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-white text-sm">{wf.name}</p>
                    <StatusBadge status={wf.status} />
                    <TriggerBadge trigger={wf.trigger} />
                  </div>
                  {wf.description && <p className="text-xs text-gray-500 mt-0.5 truncate">{wf.description}</p>}
                </div>

                {/* Meta */}
                <div className="hidden sm:flex items-center gap-4 text-xs text-gray-600 flex-shrink-0">
                  <span>{wf.actions.length} step{wf.actions.length !== 1 ? 's' : ''}</span>
                  <span>{wf.runCount} run{wf.runCount !== 1 ? 's' : ''}</span>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  {wf.status === 'active' && (
                    <button onClick={() => runWorkflow(wf.id)} title="Run now" className="p-2 hover:bg-[#1a1a1a] rounded-lg text-gray-500 hover:text-green-400 transition">
                      <Play className="w-4 h-4" />
                    </button>
                  )}
                  <button onClick={() => setEditing(wf)} className="p-2 hover:bg-[#1a1a1a] rounded-lg text-gray-500 hover:text-white transition">
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDuplicate(wf)} className="p-2 hover:bg-[#1a1a1a] rounded-lg text-gray-500 hover:text-white transition">
                    <Copy className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(wf.id)} className="p-2 hover:bg-[#1a1a1a] rounded-lg text-gray-500 hover:text-red-400 transition">
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => setExpandedId(expandedId === wf.id ? null : wf.id)}
                    className="p-2 hover:bg-[#1a1a1a] rounded-lg text-gray-500 hover:text-white transition">
                    {expandedId === wf.id ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Steps preview */}
              {expandedId === wf.id && (
                <div className="px-5 pb-4 border-t border-[#1a1a1a]">
                  <div className="pt-4 flex flex-col gap-2">
                    {wf.actions.map((action, idx) => {
                      const meta = ACTIONS.find(a => a.value === action.type);
                      return (
                        <div key={action.id} className="flex items-start gap-3">
                          <div className="flex flex-col items-center">
                            <div className="w-7 h-7 rounded-lg bg-[#1a1a1a] flex items-center justify-center flex-shrink-0">
                              <ActionIcon type={action.type} />
                            </div>
                            {idx < wf.actions.length - 1 && <div className="w-px h-5 bg-[#222] mt-1" />}
                          </div>
                          <div className="flex-1 pb-2">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium text-white">{meta?.label}</span>
                              {action.delayDays > 0 && (
                                <span className="text-[10px] text-gray-600">+{action.delayDays} day{action.delayDays !== 1 ? 's' : ''}</span>
                              )}
                              {action.delayDays === 0 && (
                                <span className="text-[10px] text-gray-600">immediately</span>
                              )}
                            </div>
                            {action.subject && <p className="text-[11px] text-gray-500 mt-0.5">Subject: {action.subject}</p>}
                            {action.tag && <p className="text-[11px] text-gray-500 mt-0.5">Tag: <span className="text-yellow-500">{action.tag}</span></p>}
                            {action.body && (
                              <p className="text-[11px] text-gray-600 mt-0.5 line-clamp-1">{action.body.slice(0, 80)}{action.body.length > 80 ? '…' : ''}</p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── Templates Tab ── */}
      {tab === 'templates' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            {
              name: 'Estimate Follow-Up',
              trigger: 'estimate_sent' as TriggerType,
              description: 'Follow up 2 days after sending an estimate to nudge the decision.',
              actions: [
                { id: 'ta1', type: 'add_tag' as ActionType, delayDays: 0, body: '', tag: 'estimate-sent' },
                { id: 'ta2', type: 'send_email' as ActionType, delayDays: 2, subject: 'Did you get a chance to review your estimate?', body: "Hi {{name}},\n\nJust checking in — we sent over an estimate a couple days ago and wanted to make sure you received it. Let us know if you have any questions or would like to adjust the scope.\n\nWe'd love to work with you!\n\n— Black Phoenix Builds" },
                { id: 'ta3', type: 'internal_note' as ActionType, delayDays: 5, body: 'No response to estimate after 5 days. Consider a phone call to {{name}}.' },
              ],
            },
            {
              name: 'Win-Back: 30-Day Silence',
              trigger: 'no_contact_30d' as TriggerType,
              description: 'Re-engage contacts who have gone quiet for 30 days.',
              actions: [
                { id: 'tb1', type: 'send_email' as ActionType, delayDays: 0, subject: "We miss you, {{name}} — special offer inside", body: "Hi {{name}},\n\nIt's been a while since we last talked! We wanted to reach out and let you know we're still here for all your home improvement needs.\n\nAs a thank-you for your past interest, we're offering 5% off your next project. Just mention this email when you call.\n\nLooking forward to hearing from you!\n\n— Eric & the Black Phoenix team" },
                { id: 'tb2', type: 'add_tag' as ActionType, delayDays: 0, body: '', tag: 'win-back' },
              ],
            },
            {
              name: 'New Job Kickoff',
              trigger: 'job_started' as TriggerType,
              description: 'Let clients know the job has started and set expectations.',
              actions: [
                { id: 'tc1', type: 'send_email' as ActionType, delayDays: 0, subject: "We've started work on your project, {{name}}!", body: "Hi {{name}},\n\nGreat news — our crew has officially started your project today! Here's what to expect:\n\n• Our team will be on-site as scheduled\n• We'll keep the work area clean throughout\n• You can reach us any time if you have questions\n\nThank you for trusting Black Phoenix Builds!\n\n— Eric" },
              ],
            },
            {
              name: 'Invoice Overdue — Escalation',
              trigger: 'invoice_overdue' as TriggerType,
              description: 'Friendly nudge on day 0, stronger reminder on day 7, team note on day 14.',
              actions: [
                { id: 'td1', type: 'send_email' as ActionType, delayDays: 0, subject: 'Invoice #{invoice_num} — past due', body: "Hi {{name}},\n\nThis is a friendly reminder that invoice #{invoice_num} for ${{amount}} was due recently. If you have any questions about the invoice, please don't hesitate to reach out.\n\nYou can pay at [Pay Now Link] or contact us to make other arrangements.\n\nThank you!" },
                { id: 'td2', type: 'send_email' as ActionType, delayDays: 7, subject: 'REMINDER: Invoice #{invoice_num} is 7 days overdue', body: "Hi {{name}},\n\nWe haven't received payment for invoice #{invoice_num} (${{amount}}), now 7 days past due. Please arrange payment as soon as possible to avoid any service holds.\n\nContact us if there's an issue — we're happy to work with you." },
                { id: 'td3', type: 'internal_note' as ActionType, delayDays: 14, body: 'Invoice #{invoice_num} for {{name}} is 14 days overdue. Escalate to Eric for direct call.' },
              ],
            },
          ].map(tmpl => (
            <div key={tmpl.name} className="bg-[#111] border border-[#222] rounded-xl p-5 hover:border-orange-500/30 transition group">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-semibold text-white text-sm">{tmpl.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{tmpl.description}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 mb-4 flex-wrap">
                <TriggerBadge trigger={tmpl.trigger} />
                <span className="text-[10px] text-gray-600">{tmpl.actions.length} steps</span>
              </div>
              <div className="space-y-1.5 mb-4">
                {tmpl.actions.map((a, i) => {
                  const meta = ACTIONS.find(m => m.value === a.type);
                  return (
                    <div key={i} className="flex items-center gap-2 text-xs text-gray-500">
                      <ActionIcon type={a.type} />
                      <span>{meta?.label}</span>
                      {a.delayDays > 0 && <span className="text-gray-700">• +{a.delayDays}d</span>}
                    </div>
                  );
                })}
              </div>
              <button onClick={() => useTemplate(tmpl)}
                className="w-full py-2 rounded-lg bg-orange-600/10 hover:bg-orange-600/20 text-orange-400 text-xs font-semibold border border-orange-600/20 transition group-hover:border-orange-500/40">
                Use Template
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ── Stats Tab ── */}
      {tab === 'stats' && (
        <div className="space-y-4">
          <div className="bg-[#111] border border-[#222] rounded-xl p-5">
            <h3 className="text-sm font-semibold text-white mb-4">Workflow Performance</h3>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-500 border-b border-[#1a1a1a]">
                  <th className="text-left pb-2">Workflow</th>
                  <th className="text-left pb-2">Status</th>
                  <th className="text-left pb-2">Trigger</th>
                  <th className="text-right pb-2">Runs</th>
                </tr>
              </thead>
              <tbody>
                {workflows.map(wf => (
                  <tr key={wf.id} className="border-b border-[#1a1a1a] last:border-0">
                    <td className="py-3 text-white font-medium text-xs">{wf.name}</td>
                    <td className="py-3"><StatusBadge status={wf.status} /></td>
                    <td className="py-3"><TriggerBadge trigger={wf.trigger} /></td>
                    <td className="py-3 text-right text-white font-semibold">{wf.runCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="bg-[#0d1a2a] border border-blue-900/30 rounded-xl p-4">
            <div className="flex gap-2">
              <Info className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-gray-400">
                <p className="text-blue-300 font-semibold mb-1">How automation runs work</p>
                <p>When a trigger event occurs (job completed, estimate sent, etc.), the workflow fires automatically. Each action runs on schedule based on its delay setting. Email and SMS actions use your connected email provider. Run counts increase with each trigger event.</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
