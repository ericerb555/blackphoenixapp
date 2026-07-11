import { useState } from 'react';
import { Zap, Play } from 'lucide-react';
import { toast } from 'sonner';

interface AutomationRule {
  id: string; name: string; trigger: string; action: string;
  enabled: boolean; lastRun?: string; runCount: number;
}

const DEFAULT_RULES: AutomationRule[] = [
  { id: '1', name: 'New Work Request Welcome', trigger: 'Work request submitted', action: 'Send welcome email to customer', enabled: true, runCount: 0 },
  { id: '2', name: 'Invoice Overdue Reminder', trigger: 'Invoice past due date', action: 'Send payment reminder email + SMS', enabled: true, runCount: 0 },
  { id: '3', name: 'Job Complete Review Request', trigger: 'Job marked complete', action: 'Send review request email (24h delay)', enabled: true, runCount: 0 },
  { id: '4', name: 'Quote Follow-Up', trigger: 'Quote sent but not signed (3 days)', action: 'Send follow-up email to customer', enabled: false, runCount: 0 },
  { id: '5', name: 'Monthly Report', trigger: '1st of every month', action: 'Generate and email monthly summary report', enabled: false, runCount: 0 },
];

export function EnterpriseContentAutomationManager() {
  const [rules, setRules] = useState<AutomationRule[]>(() => {
    try { return JSON.parse(localStorage.getItem('automation_rules') || 'null') || DEFAULT_RULES; } catch { return DEFAULT_RULES; }
  });

  function toggle(id: string) {
    const updated = rules.map(r => r.id === id ? { ...r, enabled: !r.enabled } : r);
    setRules(updated);
    localStorage.setItem('automation_rules', JSON.stringify(updated));
    const rule = updated.find(r => r.id === id)!;
    toast.success(`"${rule.name}" ${rule.enabled ? 'enabled' : 'disabled'}`);
  }

  function runNow(rule: AutomationRule) {
    if (!rule.enabled) { toast.error('Enable this rule first'); return; }
    const updated = rules.map(r => r.id === rule.id ? { ...r, runCount: r.runCount + 1, lastRun: new Date().toISOString() } : r);
    setRules(updated);
    localStorage.setItem('automation_rules', JSON.stringify(updated));
    toast.success(`Running: ${rule.action}`);
  }

  const activeCount = rules.filter(r => r.enabled).length;

  return (
    <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-6">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-9 h-9 rounded-xl bg-violet-600/20 flex items-center justify-center"><Zap className="w-4 h-4 text-violet-400" /></div>
        <div>
          <h3 className="text-base font-bold text-white">Content Automation</h3>
          <p className="text-xs text-gray-500">{activeCount} of {rules.length} rules active</p>
        </div>
      </div>
      <div className="space-y-3">
        {rules.map(rule => (
          <div key={rule.id} className={`p-4 rounded-xl border transition-all ${rule.enabled ? 'bg-[#111] border-[#2A2A2A]' : 'bg-[#0D0D0D] border-[#1A1A1A] opacity-60'}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white">{rule.name}</p>
                <p className="text-xs text-gray-500 mt-0.5">Trigger: {rule.trigger}</p>
                <p className="text-xs text-gray-500">Action: {rule.action}</p>
                {rule.lastRun && <p className="text-[10px] text-gray-600 mt-1">Last run: {new Date(rule.lastRun).toLocaleDateString()}</p>}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button onClick={() => runNow(rule)} className="p-1.5 text-gray-600 hover:text-violet-400 transition" title="Run now">
                  <Play className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => toggle(rule.id)}
                  className="relative w-9 h-5 rounded-full transition-colors"
                  style={{ background: rule.enabled ? '#7c3aed' : '#2a2a2a' }}>
                  <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${rule.enabled ? 'translate-x-4' : 'translate-x-0.5'}`} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
