/**
 * Exit Intent Manager — configure and preview exit-intent popups.
 */

import { useState, useEffect } from 'react';
import {
  MousePointerClick, Tag, Mail, Users, TrendingUp, Eye, Settings,
  Save, RotateCcw, Play, Pause, BarChart3, Clock, CheckCircle,
  Palette, Type, ArrowRight, X, Zap, AlertCircle
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';

interface ExitIntentConfig {
  enabled: boolean;
  headline: string;
  subheadline: string;
  offerType: 'discount' | 'lead' | 'newsletter';
  promoCode: string;
  discountLabel: string;
  buttonText: string;
  bgColor: string;
  accentColor: string;
  suppressHours: number;
  showOnPages: string[];
}

interface Lead {
  email: string;
  capturedAt: string;
  promoCode: string;
  source: string;
}

const DEFAULT_CONFIG: ExitIntentConfig = {
  enabled: true,
  headline: "Wait — Don't Leave Empty Handed!",
  subheadline: "Get an exclusive discount on your first service. Enter your email and we'll send it right over.",
  offerType: 'discount',
  promoCode: 'SAVE15',
  discountLabel: '15% OFF',
  buttonText: 'Claim My Discount',
  bgColor: '#111111',
  accentColor: '#ea580c',
  suppressHours: 24,
  showOnPages: [],
};

const ACCENT_COLORS = [
  { name: 'Orange', value: '#ea580c' },
  { name: 'Blue', value: '#3b82f6' },
  { name: 'Green', value: '#22c55e' },
  { name: 'Purple', value: '#a855f7' },
  { name: 'Red', value: '#ef4444' },
  { name: 'Amber', value: '#f59e0b' },
  { name: 'Cyan', value: '#06b6d4' },
  { name: 'Pink', value: '#ec4899' },
];

const PRESET_OFFERS = [
  { headline: "Wait — Don't Leave Empty Handed!", subheadline: "Get an exclusive discount on your first service. Enter your email and we'll send it right over.", discountLabel: '15% OFF', promoCode: 'SAVE15', buttonText: 'Claim My Discount' },
  { headline: 'Before You Go — Free Estimate!', subheadline: "Get a no-obligation estimate from our team. We'll reach out within 24 hours.", discountLabel: 'FREE', promoCode: 'FREEESTIMATE', buttonText: 'Get My Free Estimate' },
  { headline: 'Special Offer Just for You', subheadline: "New customers get $50 off their first service. Limited time — grab it before it's gone.", discountLabel: '$50 OFF', promoCode: 'FIRST50', buttonText: 'Unlock $50 Off' },
  { headline: 'Join Our VIP List', subheadline: 'Get early access to deals, seasonal specials, and priority scheduling — free.', discountLabel: 'VIP ACCESS', promoCode: 'VIP2026', buttonText: 'Join VIP List' },
];

export default function ExitIntentManager({ onNavigate }: { onNavigate?: (page: string) => void }) {
  const [config, setConfig] = useState<ExitIntentConfig>(() => {
    try { return { ...DEFAULT_CONFIG, ...JSON.parse(localStorage.getItem('exit_intent_config') || '{}') }; } catch { return DEFAULT_CONFIG; }
  });
  const [hasChanges, setHasChanges] = useState(false);
  const [activeTab, setActiveTab] = useState<'configure' | 'preview' | 'leads' | 'stats'>('configure');
  const [leads, setLeads] = useState<Lead[]>([]);
  const [stats, setStats] = useState({ impressions: 0, captures: 0 });
  const [showPreview, setShowPreview] = useState(false);
  const [previewEmail, setPreviewEmail] = useState('');
  const [previewCaptured, setPreviewCaptured] = useState(false);

  useEffect(() => {
    try {
      setLeads(JSON.parse(localStorage.getItem('exit_intent_leads') || '[]'));
      setStats(JSON.parse(localStorage.getItem('exit_intent_stats') || '{"impressions":0,"captures":0}'));
    } catch {}
  }, [activeTab]);

  function update(patch: Partial<ExitIntentConfig>) {
    setConfig(v => ({ ...v, ...patch }));
    setHasChanges(true);
  }

  function save() {
    localStorage.setItem('exit_intent_config', JSON.stringify(config));
    setHasChanges(false);
    toast.success('Exit-intent popup saved and active');
  }

  function reset() {
    setConfig(DEFAULT_CONFIG);
    setHasChanges(true);
  }

  function testNow() {
    localStorage.removeItem('exit_intent_suppressed');
    toast.success('Suppression cleared — move your mouse to the top of any page to trigger the popup');
  }

  function applyPreset(preset: typeof PRESET_OFFERS[0]) {
    update({ ...preset });
    toast.success('Preset applied');
  }

  function clearLeads() {
    localStorage.removeItem('exit_intent_leads');
    localStorage.removeItem('exit_intent_stats');
    setLeads([]);
    setStats({ impressions: 0, captures: 0 });
    toast.success('Leads and stats cleared');
  }

  function exportLeads() {
    if (leads.length === 0) { toast.error('No leads to export'); return; }
    const csv = ['Email,Promo Code,Captured At,Source', ...leads.map(l => `"${l.email}","${l.promoCode}","${l.capturedAt}","${l.source}"`)].join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = 'exit-intent-leads.csv';
    a.click();
    toast.success(`${leads.length} leads exported`);
  }

  const conversionRate = stats.impressions > 0 ? ((stats.captures / stats.impressions) * 100).toFixed(1) : '0';

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      {/* Header */}
      <div className="border-b border-[#1A1A1A] px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-600/20 flex items-center justify-center">
              <MousePointerClick className="w-5 h-5 text-orange-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Exit-Intent Popups</h1>
              <p className="text-xs text-gray-500">Capture leads before visitors leave your site</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Live toggle */}
            <label className="flex items-center gap-2 cursor-pointer">
              <span className="text-sm text-gray-400">{config.enabled ? 'Live' : 'Paused'}</span>
              <button
                onClick={() => update({ enabled: !config.enabled })}
                className="relative w-11 h-6 rounded-full transition-colors"
                style={{ background: config.enabled ? config.accentColor : '#2a2a2a' }}
              >
                <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${config.enabled ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </label>
            <button onClick={testNow} className="flex items-center gap-2 px-3 py-2 bg-[#1A1A1A] hover:bg-[#222] border border-[#2A2A2A] text-gray-300 text-sm rounded-lg transition">
              <Play className="w-3.5 h-3.5" /> Test
            </button>
            {hasChanges && (
              <button onClick={save} className="flex items-center gap-2 px-4 py-2 text-white text-sm font-bold rounded-lg transition" style={{ background: config.accentColor }}>
                <Save className="w-3.5 h-3.5" /> Save Changes
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-6">
        {/* Stats bar */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Status', value: config.enabled ? 'Live' : 'Paused', icon: Zap, color: config.enabled ? '#22c55e' : '#6b7280' },
            { label: 'Impressions', value: stats.impressions.toLocaleString(), icon: Eye, color: '#3b82f6' },
            { label: 'Leads Captured', value: stats.captures.toLocaleString(), icon: Users, color: config.accentColor },
            { label: 'Conversion Rate', value: `${conversionRate}%`, icon: TrendingUp, color: '#a855f7' },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-gray-500">{label}</p>
                <Icon className="w-4 h-4" style={{ color }} />
              </div>
              <p className="text-2xl font-bold text-white">{value}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-[#111] rounded-xl p-1 w-fit">
          {[
            { id: 'configure', label: 'Configure', icon: Settings },
            { id: 'preview', label: 'Preview', icon: Eye },
            { id: 'leads', label: `Leads (${leads.length})`, icon: Users },
            { id: 'stats', label: 'Stats', icon: BarChart3 },
          ].map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setActiveTab(id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === id ? 'bg-[#1A1A1A] text-white shadow' : 'text-gray-500 hover:text-gray-300'}`}>
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>

        {/* CONFIGURE TAB */}
        {activeTab === 'configure' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: form */}
            <div className="space-y-5">
              {/* Presets */}
              <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-5">
                <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2"><Zap className="w-4 h-4 text-orange-400" /> Quick Presets</h3>
                <div className="grid grid-cols-2 gap-2">
                  {PRESET_OFFERS.map(preset => (
                    <button key={preset.promoCode} onClick={() => applyPreset(preset)}
                      className="p-3 bg-[#111] border border-[#2A2A2A] hover:border-[#3A3A3A] rounded-lg text-left transition">
                      <p className="text-xs font-bold text-white mb-0.5">{preset.discountLabel}</p>
                      <p className="text-[10px] text-gray-500 leading-tight line-clamp-2">{preset.headline}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Content */}
              <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-5 space-y-4">
                <h3 className="text-sm font-bold text-white flex items-center gap-2"><Type className="w-4 h-4 text-blue-400" /> Copy & Offer</h3>
                {[
                  ['Headline', 'headline', 'text', "Wait — Don't Leave Empty Handed!"],
                  ['Sub-headline', 'subheadline', 'textarea', 'Enter your value proposition...'],
                  ['Promo Code', 'promoCode', 'text', 'SAVE15'],
                  ['Discount Label', 'discountLabel', 'text', '15% OFF'],
                  ['Button Text', 'buttonText', 'text', 'Claim My Discount'],
                ].map(([label, key, type, placeholder]) => (
                  <div key={key}>
                    <label className="block text-xs text-gray-400 mb-1">{label}</label>
                    {type === 'textarea' ? (
                      <textarea value={(config as any)[key]} onChange={e => update({ [key]: e.target.value } as any)} rows={2}
                        placeholder={placeholder}
                        className="w-full bg-[#111] border border-[#2A2A2A] rounded-lg px-3 py-2 text-sm text-white resize-none focus:outline-none focus:border-orange-500 transition" />
                    ) : (
                      <input type={type} value={(config as any)[key]} onChange={e => update({ [key]: e.target.value } as any)}
                        placeholder={placeholder}
                        className="w-full bg-[#111] border border-[#2A2A2A] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500 transition" />
                    )}
                  </div>
                ))}

                <div>
                  <label className="block text-xs text-gray-400 mb-1">Offer Type</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[['discount', 'Discount Code'], ['lead', 'Lead Capture'], ['newsletter', 'Newsletter']].map(([val, label]) => (
                      <button key={val} onClick={() => update({ offerType: val as any })}
                        className={`py-2 rounded-lg text-xs font-semibold transition border ${config.offerType === val ? 'border-orange-500/50 bg-orange-600/20 text-orange-300' : 'border-[#2A2A2A] bg-[#111] text-gray-400 hover:text-white'}`}>
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Appearance */}
              <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-5 space-y-4">
                <h3 className="text-sm font-bold text-white flex items-center gap-2"><Palette className="w-4 h-4 text-purple-400" /> Appearance</h3>
                <div>
                  <label className="block text-xs text-gray-400 mb-2">Accent Color</label>
                  <div className="flex flex-wrap gap-2">
                    {ACCENT_COLORS.map(({ name, value }) => (
                      <button key={value} onClick={() => update({ accentColor: value })} title={name}
                        className={`w-8 h-8 rounded-full transition-transform hover:scale-110 ${config.accentColor === value ? 'ring-2 ring-white ring-offset-2 ring-offset-[#111] scale-110' : ''}`}
                        style={{ background: value }} />
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Suppress After Show (hours)</label>
                  <select value={config.suppressHours} onChange={e => update({ suppressHours: Number(e.target.value) })}
                    className="w-full bg-[#111] border border-[#2A2A2A] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500 transition">
                    {[1, 6, 12, 24, 48, 72, 168].map(h => <option key={h} value={h}>{h === 168 ? '7 days' : `${h} hour${h > 1 ? 's' : ''}`}</option>)}
                  </select>
                </div>
              </div>

              <div className="flex gap-2">
                <button onClick={reset} className="flex items-center gap-1.5 px-4 py-2 border border-[#2A2A2A] text-gray-400 hover:text-white rounded-lg text-sm transition">
                  <RotateCcw className="w-3.5 h-3.5" /> Reset
                </button>
                <button onClick={save} className="flex-1 flex items-center justify-center gap-2 py-2 text-white text-sm font-bold rounded-lg transition" style={{ background: config.accentColor }}>
                  <Save className="w-3.5 h-3.5" /> Save & Activate
                </button>
              </div>
            </div>

            {/* Right: live preview */}
            <div className="lg:sticky lg:top-6 self-start">
              <p className="text-xs text-gray-500 mb-3 font-semibold uppercase tracking-wider">Live Preview</p>
              <div className="rounded-2xl overflow-hidden shadow-2xl" style={{ background: config.bgColor, border: `1px solid ${config.accentColor}33` }}>
                <div className="h-1.5" style={{ background: config.accentColor }} />
                <div className="p-6">
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold mb-4"
                    style={{ background: `${config.accentColor}22`, color: config.accentColor }}>
                    <Tag className="w-3 h-3" />
                    {config.discountLabel} — Exclusive Offer
                  </div>
                  <h2 className="text-lg font-bold text-white mb-2 leading-tight">{config.headline}</h2>
                  <p className="text-gray-400 text-sm mb-4 leading-relaxed">{config.subheadline}</p>
                  {config.offerType === 'discount' && (
                    <div className="p-3 rounded-xl mb-4 text-center" style={{ background: `${config.accentColor}15`, border: `1px dashed ${config.accentColor}66` }}>
                      <p className="text-xs text-gray-500 mb-0.5 uppercase tracking-wider">Promo Code</p>
                      <p className="text-2xl font-bold font-mono tracking-widest" style={{ color: config.accentColor }}>{config.promoCode}</p>
                    </div>
                  )}
                  <div className="relative mb-3">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <div className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm text-gray-500 bg-[#1a1a1a] border border-[#2a2a2a]">
                      Enter your email address
                    </div>
                  </div>
                  <button className="w-full py-2.5 rounded-xl font-bold text-white text-sm flex items-center justify-center gap-2" style={{ background: config.accentColor }}>
                    {config.buttonText} <ArrowRight className="w-4 h-4" />
                  </button>
                  <p className="text-[10px] text-gray-600 text-center mt-3">No spam. Unsubscribe anytime.</p>
                </div>
              </div>
              <div className="mt-4 p-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-gray-400">This popup fires when a visitor's mouse exits the top of the browser window. On mobile, it triggers after 30 seconds of inactivity. It suppresses for <span className="text-white">{config.suppressHours}h</span> after showing.</p>
              </div>
            </div>
          </div>
        )}

        {/* PREVIEW TAB */}
        {activeTab === 'preview' && (
          <div className="space-y-6">
            <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6 text-center">
              <MousePointerClick className="w-12 h-12 mx-auto mb-4" style={{ color: config.accentColor }} />
              <h3 className="text-xl font-bold text-white mb-2">Test the Popup</h3>
              <p className="text-gray-400 mb-4 text-sm">Click the button below to preview the popup exactly as your visitors will see it. Or clear suppression and move your mouse to the top of the screen.</p>
              <div className="flex gap-3 justify-center">
                <button onClick={() => { setPreviewCaptured(false); setPreviewEmail(''); setShowPreview(true); }}
                  className="px-6 py-2.5 text-white font-semibold rounded-xl transition" style={{ background: config.accentColor }}>
                  Launch Preview
                </button>
                <button onClick={testNow} className="px-6 py-2.5 bg-[#111] border border-[#2A2A2A] text-gray-300 font-semibold rounded-xl hover:text-white transition">
                  Clear Suppression
                </button>
              </div>
            </div>

            {showPreview && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowPreview(false)} />
                <div className="relative w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden" style={{ background: config.bgColor, border: `1px solid ${config.accentColor}33` }}>
                  <div className="h-1.5" style={{ background: config.accentColor }} />
                  <button onClick={() => setShowPreview(false)} className="absolute top-4 right-4 text-gray-500 hover:text-white z-10"><X className="w-5 h-5" /></button>
                  <div className="p-8">
                    {previewCaptured ? (
                      <div className="text-center py-6">
                        <CheckCircle className="w-16 h-16 mx-auto mb-4" style={{ color: config.accentColor }} />
                        <h3 className="text-2xl font-bold text-white mb-2">You're All Set!</h3>
                        <p className="text-gray-400 mb-4">Your code: <span className="font-mono font-bold" style={{ color: config.accentColor }}>{config.promoCode}</span></p>
                      </div>
                    ) : (
                      <>
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold mb-5" style={{ background: `${config.accentColor}22`, color: config.accentColor }}>
                          <Tag className="w-3.5 h-3.5" />{config.discountLabel} — Exclusive Offer
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-3 leading-tight">{config.headline}</h2>
                        <p className="text-gray-400 mb-6 leading-relaxed">{config.subheadline}</p>
                        {config.offerType === 'discount' && (
                          <div className="p-4 rounded-xl mb-6 text-center" style={{ background: `${config.accentColor}15`, border: `1px dashed ${config.accentColor}66` }}>
                            <p className="text-xs text-gray-500 mb-1 uppercase tracking-wider">Promo Code</p>
                            <p className="text-3xl font-bold font-mono tracking-widest" style={{ color: config.accentColor }}>{config.promoCode}</p>
                            <p className="text-xs text-gray-500 mt-1">Expires in 48 hours</p>
                          </div>
                        )}
                        <div className="space-y-3">
                          <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                            <input type="email" value={previewEmail} onChange={e => setPreviewEmail(e.target.value)}
                              placeholder="Enter your email" className="w-full pl-10 pr-4 py-3 rounded-xl text-white text-sm focus:outline-none"
                              style={{ background: '#1a1a1a', border: '1px solid #2a2a2a' }} />
                          </div>
                          <button onClick={() => { if (previewEmail) setPreviewCaptured(true); }}
                            className="w-full py-3 rounded-xl font-bold text-white flex items-center justify-center gap-2" style={{ background: config.accentColor }}>
                            {config.buttonText} <ArrowRight className="w-4 h-4" />
                          </button>
                        </div>
                        <p className="text-xs text-gray-600 text-center mt-4">No spam. Unsubscribe anytime.</p>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* LEADS TAB */}
        {activeTab === 'leads' && (
          <div className="space-y-4">
            <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-5">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="font-bold text-white">Captured Leads</h3>
                  <p className="text-xs text-gray-500 mt-0.5">{leads.length} emails collected via exit-intent</p>
                </div>
                <div className="flex gap-2">
                  {leads.length > 0 && <>
                    <button onClick={exportLeads} className="px-3 py-1.5 bg-[#111] border border-[#2A2A2A] text-gray-300 hover:text-white text-xs rounded-lg transition">Export CSV</button>
                    <button onClick={clearLeads} className="px-3 py-1.5 bg-red-600/10 border border-red-500/20 text-red-400 text-xs rounded-lg transition">Clear All</button>
                  </>}
                </div>
              </div>
              {leads.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="w-12 h-12 text-gray-700 mx-auto mb-3" />
                  <p className="text-gray-500 text-sm">No leads captured yet.</p>
                  <p className="text-gray-600 text-xs mt-1">Make sure the popup is enabled and your site has visitors.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {[...leads].reverse().map((lead, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-[#111] border border-[#2A2A2A] rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ background: config.accentColor }}>
                          {lead.email[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-white">{lead.email}</p>
                          <p className="text-xs text-gray-500">{new Date(lead.capturedAt).toLocaleString()}</p>
                        </div>
                      </div>
                      <span className="text-xs font-mono font-bold px-2 py-1 rounded" style={{ background: `${config.accentColor}22`, color: config.accentColor }}>
                        {lead.promoCode}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* STATS TAB */}
        {activeTab === 'stats' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6">
              <h3 className="font-bold text-white mb-5 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-green-400" /> Performance</h3>
              <div className="space-y-4">
                {[
                  { label: 'Total Impressions', value: stats.impressions, color: '#3b82f6' },
                  { label: 'Leads Captured', value: stats.captures, color: config.accentColor },
                  { label: 'Conversion Rate', value: `${conversionRate}%`, color: '#a855f7' },
                  { label: 'Estimated Value', value: `$${(stats.captures * 45).toLocaleString()}`, color: '#22c55e' },
                ].map(({ label, value, color }) => (
                  <div key={label} className="flex items-center justify-between p-3 bg-[#111] rounded-lg">
                    <span className="text-sm text-gray-400">{label}</span>
                    <span className="text-lg font-bold" style={{ color }}>{value}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6">
              <h3 className="font-bold text-white mb-5 flex items-center gap-2"><Clock className="w-4 h-4 text-blue-400" /> Tips to Improve Conversion</h3>
              <div className="space-y-3">
                {[
                  { tip: 'Use urgency in your headline', detail: '"Limited time" and "before you go" increase captures by 20-40%' },
                  { tip: 'Keep promo codes simple', detail: 'Short, memorable codes like SAVE15 convert better than random strings' },
                  { tip: 'Offer real value', detail: '$50 flat off converts better than 10% for high-ticket services' },
                  { tip: 'Match your site accent color', detail: 'Brand consistency builds trust and increases form fills' },
                  { tip: 'Suppress for 24-48 hours', detail: "Don't annoy repeat visitors — show it once per day max" },
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
