/**
 * Live Chat Manager — configure the floating chat widget, view leads, chat transcripts.
 */

import { useState, useEffect } from 'react';
import {
  MessageCircle, Settings, Users, BarChart3, Eye, Save, RotateCcw,
  Zap, Palette, Clock, Download, Trash2, ChevronRight, Bot,
  CheckCircle, Phone, Mail, ArrowRight, AlertCircle, Play
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { publicAnonKey, projectId } from '../utils/supabase/info';

const SERVER = `https://${projectId}.supabase.co/functions/v1/make-server-57095a78`;
const authHeaders = { 'Content-Type': 'application/json', Authorization: `Bearer ${publicAnonKey}` };

interface ChatConfig {
  enabled: boolean;
  businessName: string;
  welcomeMessage: string;
  accentColor: string;
  position: 'bottom-right' | 'bottom-left';
  agentName: string;
  collectLeads: boolean;
  aiEnabled: boolean;
  businessHours: { start: number; end: number };
  quickReplies: string[];
}

interface Lead {
  email: string;
  name: string;
  capturedAt: string;
  source: string;
}

const DEFAULT_CONFIG: ChatConfig = {
  enabled: true,
  businessName: 'Black Phoenix Builds',
  welcomeMessage: "Hi there! 👋 How can we help you today? Ask us anything about our services, pricing, or availability.",
  accentColor: '#ea580c',
  position: 'bottom-right',
  agentName: 'Phoenix Support',
  collectLeads: true,
  aiEnabled: true,
  businessHours: { start: 8, end: 18 },
  quickReplies: ['Get a free estimate', 'What services do you offer?', 'How much does it cost?', 'Schedule a call'],
};

const COLORS = ['#ea580c', '#3b82f6', '#22c55e', '#a855f7', '#ef4444', '#f59e0b', '#06b6d4', '#ec4899'];

const HOURS = Array.from({ length: 24 }, (_, i) => ({ value: i, label: i === 0 ? '12 AM' : i < 12 ? `${i} AM` : i === 12 ? '12 PM' : `${i - 12} PM` }));

export default function LiveChatManager({ onNavigate }: { onNavigate?: (page: string) => void }) {
  const [config, setConfig] = useState<ChatConfig>(() => {
    try { return { ...DEFAULT_CONFIG, ...JSON.parse(localStorage.getItem('live_chat_config') || '{}') }; } catch { return DEFAULT_CONFIG; }
  });
  const [hasChanges, setHasChanges] = useState(false);
  const [activeTab, setActiveTab] = useState<'configure' | 'quickreplies' | 'leads' | 'stats'>('configure');
  const [leads, setLeads] = useState<Lead[]>([]);
  const [newQR, setNewQR] = useState('');

  // Load the saved widget config from the server (falls back to the local copy).
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${SERVER}/chat/config`, { headers: authHeaders });
        const json = await res.json();
        if (json.success && json.config) {
          setConfig(v => ({ ...v, ...json.config }));
          localStorage.setItem('live_chat_config', JSON.stringify(json.config));
        }
      } catch (err) { console.error('Failed to load chat config:', err); }
    })();
  }, []);

  // Load captured chat leads from the server whenever the tab changes.
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${SERVER}/chat/leads`, { headers: authHeaders });
        const json = await res.json();
        if (json.success) setLeads(json.leads);
        else console.error('Failed to load chat leads:', json.error);
      } catch (err) { console.error('Network error loading chat leads:', err); }
    })();
  }, [activeTab]);

  function update(patch: Partial<ChatConfig>) { setConfig(v => ({ ...v, ...patch })); setHasChanges(true); }

  async function save() {
    // Mirror to localStorage so the on-page widget picks it up instantly…
    localStorage.setItem('live_chat_config', JSON.stringify(config));
    setHasChanges(false);
    // …and persist to the server so it's shared across devices/admins.
    try {
      const res = await fetch(`${SERVER}/chat/config`, { method: 'POST', headers: authHeaders, body: JSON.stringify(config) });
      const json = await res.json();
      if (json.success) toast.success('Chat widget settings saved');
      else toast.error(json.error || 'Save failed');
    } catch (err) { console.error('Failed to save chat config:', err); toast.error('Network error saving settings'); }
  }

  function reset() { setConfig(DEFAULT_CONFIG); setHasChanges(true); }

  function addQuickReply() {
    if (!newQR.trim()) return;
    update({ quickReplies: [...config.quickReplies, newQR.trim()] });
    setNewQR('');
  }

  function removeQR(i: number) {
    update({ quickReplies: config.quickReplies.filter((_, idx) => idx !== i) });
  }

  function exportLeads() {
    if (!leads.length) { toast.error('No leads to export'); return; }
    const csv = ['Name,Email,Captured At', ...leads.map(l => `"${l.name}","${l.email}","${l.capturedAt}"`)].join('\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = 'chat-leads.csv'; a.click();
    toast.success('Leads exported');
  }

  async function clearLeads() {
    localStorage.removeItem('chat_leads');
    setLeads([]);
    try {
      await fetch(`${SERVER}/chat/leads`, { method: 'DELETE', headers: authHeaders });
      toast.success('Leads cleared');
    } catch (err) { console.error('Failed to clear chat leads:', err); toast.error('Network error clearing leads'); }
  }

  const totalLeads = leads.length;
  const todayLeads = leads.filter(l => new Date(l.capturedAt).toDateString() === new Date().toDateString()).length;

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      {/* Header */}
      <div className="border-b border-[#1A1A1A] px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-600/20 flex items-center justify-center">
              <MessageCircle className="w-5 h-5 text-orange-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Live Chat Manager</h1>
              <p className="text-xs text-gray-500">Configure your site chat widget and view captured leads</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <span className="text-sm text-gray-400">{config.enabled ? 'Widget Live' : 'Widget Off'}</span>
              <button onClick={() => update({ enabled: !config.enabled })}
                className="relative w-11 h-6 rounded-full transition-colors"
                style={{ background: config.enabled ? config.accentColor : '#2a2a2a' }}>
                <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${config.enabled ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </label>
            {hasChanges && (
              <button onClick={save} className="flex items-center gap-2 px-4 py-2 text-white text-sm font-bold rounded-lg" style={{ background: config.accentColor }}>
                <Save className="w-3.5 h-3.5" /> Save
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto p-6">
        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Status', value: config.enabled ? 'Live' : 'Off', color: config.enabled ? '#22c55e' : '#6b7280' },
            { label: 'Total Leads', value: totalLeads, color: config.accentColor },
            { label: 'Today', value: todayLeads, color: '#3b82f6' },
            { label: 'AI Mode', value: config.aiEnabled ? 'On' : 'Off', color: '#a855f7' },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-4">
              <p className="text-xs text-gray-500 mb-1">{label}</p>
              <p className="text-2xl font-bold" style={{ color }}>{value}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-[#111] rounded-xl p-1 w-fit">
          {[
            { id: 'configure', label: 'Configure' },
            { id: 'quickreplies', label: 'Quick Replies' },
            { id: 'leads', label: `Leads (${totalLeads})` },
            { id: 'stats', label: 'Tips' },
          ].map(({ id, label }) => (
            <button key={id} onClick={() => setActiveTab(id as any)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === id ? 'bg-[#1A1A1A] text-white shadow' : 'text-gray-500 hover:text-gray-300'}`}>
              {label}
            </button>
          ))}
        </div>

        {/* CONFIGURE */}
        {activeTab === 'configure' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-5">
              {/* Identity */}
              <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-5 space-y-4">
                <h3 className="text-sm font-bold text-white">Widget Identity</h3>
                {[['Business Name', 'businessName'], ['Agent / Bot Name', 'agentName']].map(([label, key]) => (
                  <div key={key}>
                    <label className="block text-xs text-gray-400 mb-1">{label}</label>
                    <input value={(config as any)[key]} onChange={e => update({ [key]: e.target.value } as any)}
                      className="w-full bg-[#111] border border-[#2A2A2A] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500 transition" />
                  </div>
                ))}
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Welcome Message</label>
                  <textarea value={config.welcomeMessage} onChange={e => update({ welcomeMessage: e.target.value })} rows={3}
                    className="w-full bg-[#111] border border-[#2A2A2A] rounded-lg px-3 py-2 text-sm text-white resize-none focus:outline-none focus:border-orange-500 transition" />
                </div>
              </div>

              {/* Appearance */}
              <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-5 space-y-4">
                <h3 className="text-sm font-bold text-white flex items-center gap-2"><Palette className="w-4 h-4 text-purple-400" /> Appearance</h3>
                <div>
                  <label className="block text-xs text-gray-400 mb-2">Accent Color</label>
                  <div className="flex flex-wrap gap-2">
                    {COLORS.map(c => (
                      <button key={c} onClick={() => update({ accentColor: c })}
                        className={`w-8 h-8 rounded-full transition-transform hover:scale-110 ${config.accentColor === c ? 'ring-2 ring-white ring-offset-2 ring-offset-[#111] scale-110' : ''}`}
                        style={{ background: c }} />
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Widget Position</label>
                  <div className="grid grid-cols-2 gap-2">
                    {[['bottom-right', 'Bottom Right'], ['bottom-left', 'Bottom Left']].map(([val, label]) => (
                      <button key={val} onClick={() => update({ position: val as any })}
                        className={`py-2 rounded-lg text-xs font-semibold border transition ${config.position === val ? 'border-orange-500/50 bg-orange-600/20 text-orange-300' : 'border-[#2A2A2A] bg-[#111] text-gray-400 hover:text-white'}`}>
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Settings */}
              <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-5 space-y-4">
                <h3 className="text-sm font-bold text-white flex items-center gap-2"><Settings className="w-4 h-4 text-blue-400" /> Behavior</h3>
                {[
                  { label: 'AI Auto-Responses', key: 'aiEnabled', desc: 'Automatically answer common questions' },
                  { label: 'Collect Leads', key: 'collectLeads', desc: 'Prompt for name & email when escalating' },
                ].map(({ label, key, desc }) => (
                  <label key={key} className="flex items-center justify-between cursor-pointer">
                    <div>
                      <p className="text-sm text-white font-semibold">{label}</p>
                      <p className="text-xs text-gray-500">{desc}</p>
                    </div>
                    <button onClick={() => update({ [key]: !(config as any)[key] } as any)}
                      className="relative w-10 h-5 rounded-full transition-colors flex-shrink-0"
                      style={{ background: (config as any)[key] ? config.accentColor : '#2a2a2a' }}>
                      <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${(config as any)[key] ? 'translate-x-5' : 'translate-x-0.5'}`} />
                    </button>
                  </label>
                ))}

                <div className="grid grid-cols-2 gap-3">
                  {[['Business Hours Start', 'start'], ['Business Hours End', 'end']].map(([label, key]) => (
                    <div key={key}>
                      <label className="block text-xs text-gray-400 mb-1">{label}</label>
                      <select value={(config.businessHours as any)[key]} onChange={e => update({ businessHours: { ...config.businessHours, [key]: Number(e.target.value) } })}
                        className="w-full bg-[#111] border border-[#2A2A2A] rounded-lg px-2 py-2 text-sm text-white focus:outline-none focus:border-orange-500 transition">
                        {HOURS.map(h => <option key={h.value} value={h.value}>{h.label}</option>)}
                      </select>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-2">
                <button onClick={reset} className="px-4 py-2 border border-[#2A2A2A] text-gray-400 rounded-lg text-sm hover:text-white transition flex items-center gap-1.5">
                  <RotateCcw className="w-3.5 h-3.5" /> Reset
                </button>
                <button onClick={save} className="flex-1 py-2 text-white font-bold rounded-lg text-sm flex items-center justify-center gap-2 transition" style={{ background: config.accentColor }}>
                  <Save className="w-3.5 h-3.5" /> Save Settings
                </button>
              </div>
            </div>

            {/* Preview */}
            <div className="self-start lg:sticky lg:top-6">
              <p className="text-xs text-gray-500 mb-3 font-semibold uppercase tracking-wider">Widget Preview</p>
              <div className="relative bg-[#0A0A0A] rounded-2xl border border-[#1A1A1A] p-4 h-[420px] overflow-hidden">
                <div className="absolute bottom-4 right-4">
                  <div className="w-[280px] rounded-2xl overflow-hidden shadow-2xl" style={{ background: '#111', border: '1px solid #222' }}>
                    <div className="flex items-center justify-between px-3 py-2.5" style={{ background: config.accentColor }}>
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center text-white text-xs font-bold">{config.agentName[0]}</div>
                        <div>
                          <p className="text-xs font-bold text-white">{config.agentName}</p>
                          <div className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-green-300" /><p className="text-[9px] text-white/80">Online now</p></div>
                        </div>
                      </div>
                    </div>
                    <div className="p-3 space-y-2">
                      <div className="flex gap-2">
                        <div className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-bold text-white" style={{ background: config.accentColor }}>{config.agentName[0]}</div>
                        <div className="text-[11px] text-gray-200 bg-[#1e1e1e] rounded-2xl rounded-tl-sm px-2.5 py-2 max-w-[80%] leading-relaxed">{config.welcomeMessage}</div>
                      </div>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {config.quickReplies.slice(0, 2).map(qr => (
                          <div key={qr} className="text-[9px] px-2 py-1 rounded-full border" style={{ borderColor: `${config.accentColor}66`, color: config.accentColor, background: `${config.accentColor}11` }}>{qr}</div>
                        ))}
                      </div>
                    </div>
                    <div className="px-3 pb-2 pt-1 border-t border-[#1e1e1e]">
                      <div className="flex gap-2 items-center bg-[#1a1a1a] rounded-xl px-2.5 py-1.5">
                        <div className="flex-1 text-[11px] text-gray-500">Type a message...</div>
                        <div className="w-5 h-5 rounded-lg flex items-center justify-center" style={{ background: config.accentColor }}>
                          <ArrowRight className="w-3 h-3 text-white" />
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end mt-2">
                    <div className="w-10 h-10 rounded-full shadow-lg flex items-center justify-center" style={{ background: config.accentColor }}>
                      <MessageCircle className="w-5 h-5 text-white" />
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-4 p-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-gray-400">The widget appears on every page of your app. After saving, the bubble will appear in the <strong className="text-white">{config.position.replace('-', ' ')}</strong> corner after 8 seconds.</p>
              </div>
            </div>
          </div>
        )}

        {/* QUICK REPLIES */}
        {activeTab === 'quickreplies' && (
          <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6">
            <h3 className="font-bold text-white mb-1">Quick Reply Buttons</h3>
            <p className="text-xs text-gray-500 mb-5">These buttons appear in the chat window when it first opens, letting visitors jump straight to common questions.</p>
            <div className="space-y-2 mb-4">
              {config.quickReplies.map((qr, i) => (
                <div key={i} className="flex items-center gap-2 p-3 bg-[#111] border border-[#2A2A2A] rounded-lg">
                  <span className="flex-1 text-sm text-white">{qr}</span>
                  <button onClick={() => removeQR(i)} className="text-gray-600 hover:text-red-400 transition"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input value={newQR} onChange={e => setNewQR(e.target.value)} onKeyDown={e => e.key === 'Enter' && addQuickReply()}
                placeholder="Add quick reply (e.g. 'View our portfolio')"
                className="flex-1 bg-[#111] border border-[#2A2A2A] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500 transition" />
              <button onClick={addQuickReply} className="px-4 py-2 text-white text-sm font-bold rounded-lg transition" style={{ background: config.accentColor }}>Add</button>
            </div>
            <div className="mt-4 pt-4 border-t border-[#2A2A2A] flex justify-end">
              <button onClick={save} className="px-6 py-2 text-white text-sm font-bold rounded-lg transition flex items-center gap-2" style={{ background: config.accentColor }}>
                <Save className="w-3.5 h-3.5" /> Save Quick Replies
              </button>
            </div>
          </div>
        )}

        {/* LEADS */}
        {activeTab === 'leads' && (
          <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="font-bold text-white">Chat Leads</h3>
                <p className="text-xs text-gray-500 mt-0.5">{totalLeads} visitors left their contact info via chat</p>
              </div>
              <div className="flex gap-2">
                {leads.length > 0 && <>
                  <button onClick={exportLeads} className="px-3 py-1.5 bg-[#111] border border-[#2A2A2A] text-gray-300 hover:text-white text-xs rounded-lg transition">Export CSV</button>
                  <button onClick={clearLeads} className="px-3 py-1.5 bg-red-600/10 border border-red-500/20 text-red-400 text-xs rounded-lg transition">Clear</button>
                </>}
              </div>
            </div>
            {leads.length === 0 ? (
              <div className="text-center py-12">
                <Users className="w-12 h-12 text-gray-700 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">No chat leads yet.</p>
                <p className="text-gray-600 text-xs mt-1">Leads are captured when the AI prompts visitors for their name and email.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {[...leads].reverse().map((l, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-[#111] border border-[#2A2A2A] rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ background: config.accentColor }}>
                        {(l.name || l.email)[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white">{l.name || 'Unknown'}</p>
                        <p className="text-xs text-gray-500">{l.email}</p>
                      </div>
                    </div>
                    <p className="text-xs text-gray-600">{new Date(l.capturedAt).toLocaleDateString()}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TIPS */}
        {activeTab === 'stats' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6">
              <h3 className="font-bold text-white mb-5 flex items-center gap-2"><Bot className="w-4 h-4 text-purple-400" /> AI Response Coverage</h3>
              <div className="space-y-3">
                {[
                  ['Free estimates', '✓ Covered'], ['Services offered', '✓ Covered'],
                  ['Pricing questions', '✓ Covered'], ['Scheduling a call', '✓ Covered'],
                  ['Business hours', '✓ Covered'], ['Service area', '✓ Covered'],
                  ['Warranty questions', '✓ Covered'], ['Insurance & licensing', '✓ Covered'],
                ].map(([topic, status]) => (
                  <div key={topic} className="flex justify-between text-sm">
                    <span className="text-gray-400">{topic}</span>
                    <span className="text-green-400 font-semibold">{status}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6">
              <h3 className="font-bold text-white mb-5 flex items-center gap-2"><Zap className="w-4 h-4 text-yellow-400" /> Best Practices</h3>
              <div className="space-y-4">
                {[
                  { tip: 'Use a real agent name', detail: '"Sarah at Phoenix" converts better than "Support Bot"' },
                  { tip: 'Keep quick replies specific', detail: '"Get a free roof estimate" outperforms "Learn more"' },
                  { tip: 'Set accurate hours', detail: 'Showing offline builds trust — visitors know when to expect a reply' },
                  { tip: 'Follow up fast', detail: 'Chat leads that get a callback within 1 hour close at 7x higher rates' },
                  { tip: 'Export leads weekly', detail: 'Add chat leads to your email/SMS campaigns for ongoing nurturing' },
                ].map(({ tip, detail }, i) => (
                  <div key={i} className="flex gap-3">
                    <div className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5" style={{ background: `${config.accentColor}22`, color: config.accentColor }}>{i + 1}</div>
                    <div>
                      <p className="text-sm font-semibold text-white">{tip}</p>
                      <p className="text-xs text-gray-500">{detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
