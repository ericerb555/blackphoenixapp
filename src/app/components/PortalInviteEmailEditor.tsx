/**
 * PortalInviteEmailEditor — view & edit the invitation emails sent for each
 * portal type, with a live preview that renders unsaved edits exactly as the
 * recipient will see them. Backed by the owner-provisioning invite-template
 * routes; blank fields fall back to the built-in defaults.
 */
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner@2.0.3';
import { Mail, Eye, RotateCcw, Save, Sparkles, RefreshCw, Send, MessageSquare, QrCode, Download } from 'lucide-react';
import QRCode from 'qrcode';
import { supabase } from '../lib/supabase';
import { projectId } from '../utils/supabase/info';

const SERVER = `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6`;
const ONBOARDING_BASE = 'https://www.theblackphoenixcompany.com/portal-onboarding';
type Channel = 'email' | 'sms' | 'qr';

interface FieldDef { key: string; label: string; hint: string; multiline: boolean; }
interface Template {
  portalType: string;
  label: string;
  defaults: Record<string, string>;
  overrides: Record<string, string>;
  effective: Record<string, string>;
  customized: boolean;
  updatedBy?: string | null;
  updatedAt?: string | null;
}

const TOKENS = ['{firstName}', '{company}', '{label}', '{trialPeriod}', '{trialMonths}'];

export default function PortalInviteEmailEditor() {
  const [loading, setLoading] = useState(true);
  const [fields, setFields] = useState<FieldDef[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [active, setActive] = useState<string>('customer');
  // draft = current edits keyed by field for the active portal type.
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [previewHtml, setPreviewHtml] = useState('');
  const [previewing, setPreviewing] = useState(false);
  const [trialOn, setTrialOn] = useState(true);
  const [sendingTest, setSendingTest] = useState(false);
  const [channel, setChannel] = useState<Channel>('email');
  const [smsText, setSmsText] = useState('');
  const [testPhone, setTestPhone] = useState('');
  const [sendingTestSms, setSendingTestSms] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState('');

  async function authHeaders() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) throw new Error('Sign in again to manage invite emails.');
    return { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` };
  }

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`${SERVER}/owner-provisioning/invite-templates`, { headers: await authHeaders() });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) throw new Error(data.error || 'Could not load invite templates.');
      setFields(data.fields || []);
      setTemplates(data.templates || []);
    } catch (e: any) {
      toast.error(e.message || 'Failed to load invite emails.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const activeTemplate = useMemo(() => templates.find(t => t.portalType === active), [templates, active]);

  // When switching portal type (or after a reload), seed the draft with the
  // effective copy so the fields show what's actually in use.
  useEffect(() => {
    if (activeTemplate) setDraft({ ...activeTemplate.effective });
  }, [active, activeTemplate]);

  // Only fields that DIFFER from the default are sent as overrides.
  function overridesFromDraft(): Record<string, string> {
    if (!activeTemplate) return {};
    const out: Record<string, string> = {};
    for (const f of fields) {
      const v = (draft[f.key] ?? '').trim();
      if (v && v !== activeTemplate.defaults[f.key]) out[f.key] = draft[f.key];
    }
    return out;
  }

  async function refreshPreview() {
    if (!activeTemplate) return;
    setPreviewing(true);
    try {
      const res = await fetch(`${SERVER}/owner-provisioning/invite-preview`, {
        method: 'POST',
        headers: await authHeaders(),
        body: JSON.stringify({ portalType: active, fullAccess: trialOn, trialMonths: 6, overrides: overridesFromDraft() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) throw new Error(data.error || 'Preview failed.');
      setPreviewHtml(data.html || '');
      setSmsText(data.sms || '');
    } catch (e: any) {
      toast.error(e.message || 'Could not render preview.');
    } finally {
      setPreviewing(false);
    }
  }

  // The QR encodes a per-portal "scan to start onboarding" link. Regenerate it
  // whenever the active portal changes.
  useEffect(() => {
    const url = `${ONBOARDING_BASE}?portal=${encodeURIComponent(active)}`;
    QRCode.toDataURL(url, { width: 512, margin: 2 })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(''));
  }, [active]);

  // Auto-refresh the preview shortly after edits settle.
  useEffect(() => {
    if (!activeTemplate) return;
    const t = setTimeout(refreshPreview, 500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft, trialOn, active]);

  async function save() {
    if (!activeTemplate) return;
    setSaving(true);
    try {
      const res = await fetch(`${SERVER}/owner-provisioning/invite-templates/${active}`, {
        method: 'PUT',
        headers: await authHeaders(),
        body: JSON.stringify({ overrides: overridesFromDraft() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) throw new Error(data.error || 'Save failed.');
      setTemplates(prev => prev.map(t => t.portalType === active
        ? { ...t, overrides: data.overrides || {}, effective: data.effective || t.effective, customized: Object.keys(data.overrides || {}).some(k => !k.startsWith('_')), updatedBy: data.updatedBy, updatedAt: data.updatedAt }
        : t));
      toast.success(`${activeTemplate.label} invitation email saved.`);
    } catch (e: any) {
      toast.error(e.message || 'Could not save invite email.');
    } finally {
      setSaving(false);
    }
  }

  async function sendTest() {
    if (!activeTemplate) return;
    setSendingTest(true);
    try {
      const res = await fetch(`${SERVER}/owner-provisioning/invite-test`, {
        method: 'POST',
        headers: await authHeaders(),
        body: JSON.stringify({ portalType: active, fullAccess: trialOn, trialMonths: 6, overrides: overridesFromDraft() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) throw new Error(data.error || 'Test send failed.');
      toast.success(`Test ${activeTemplate.label} invite sent to ${data.to}.`);
    } catch (e: any) {
      toast.error(e.message || 'Could not send the test email.');
    } finally {
      setSendingTest(false);
    }
  }

  async function sendTestSms() {
    if (!activeTemplate) return;
    if (!testPhone.trim()) { toast.error('Enter a phone number to send the test SMS to.'); return; }
    setSendingTestSms(true);
    try {
      const res = await fetch(`${SERVER}/owner-provisioning/invite-test-sms`, {
        method: 'POST',
        headers: await authHeaders(),
        body: JSON.stringify({ portalType: active, fullAccess: trialOn, trialMonths: 6, overrides: overridesFromDraft(), to: testPhone.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) throw new Error(data.error || 'Test SMS failed.');
      toast.success(`Test ${activeTemplate.label} invite texted to ${data.to}.`);
    } catch (e: any) {
      toast.error(e.message || 'Could not send the test SMS.');
    } finally {
      setSendingTestSms(false);
    }
  }

  function downloadQr() {
    if (!qrDataUrl) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = `${active}-portal-invite-qr.png`;
    a.click();
  }

  function resetToDefault() {
    if (!activeTemplate) return;
    setDraft({ ...activeTemplate.defaults });
    toast.message('Reverted to the default copy. Click Save to apply.');
  }

  const dirty = useMemo(() => {
    if (!activeTemplate) return false;
    return fields.some(f => (draft[f.key] ?? '') !== (activeTemplate.effective[f.key] ?? ''));
  }, [draft, activeTemplate, fields]);

  return (
    <div className="rounded-xl border border-[#2A2A2A] bg-[#141414] overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-[#2A2A2A] bg-gradient-to-r from-orange-600/10 to-transparent">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center">
            <Mail className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-bold text-white">Portal Invitations</p>
            <p className="text-xs text-gray-500">One template → email, SMS & QR for every portal invite</p>
          </div>
        </div>
        <button onClick={load} className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition">
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Reload
        </button>
      </div>

      {/* Portal type selector */}
      <div className="flex flex-wrap gap-2 px-5 py-3 border-b border-[#2A2A2A]">
        {templates.map(t => (
          <button key={t.portalType} onClick={() => setActive(t.portalType)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${active === t.portalType ? 'bg-orange-600 text-white' : 'bg-[#1A1A1A] border border-[#2A2A2A] text-gray-400 hover:text-white'}`}>
            {t.label}
            {t.customized && <span className="w-1.5 h-1.5 rounded-full bg-green-400" title="Customized" />}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="p-10 text-center text-gray-500 text-sm">Loading invitation emails…</div>
      ) : (
        <div className="grid lg:grid-cols-2 gap-0">
          {/* Editor */}
          <div className="p-5 space-y-4 border-b lg:border-b-0 lg:border-r border-[#2A2A2A]">
            <div className="flex items-center gap-2 text-[11px] text-gray-500 flex-wrap">
              <Sparkles className="w-3.5 h-3.5 text-orange-400" />
              <span>Tokens you can use:</span>
              {TOKENS.map(tk => (
                <code key={tk} className="px-1.5 py-0.5 rounded bg-[#1A1A1A] border border-[#2A2A2A] text-orange-300">{tk}</code>
              ))}
            </div>

            {fields.map(f => (
              <label key={f.key} className="block">
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">{f.label}</span>
                {f.multiline ? (
                  <textarea rows={2} value={draft[f.key] ?? ''} onChange={e => setDraft(d => ({ ...d, [f.key]: e.target.value }))}
                    placeholder={activeTemplate?.defaults[f.key]}
                    className="mt-1.5 w-full rounded-lg border border-white/10 bg-[#101010] px-3 py-2 text-sm text-white outline-none transition focus:border-orange-400 resize-y" />
                ) : (
                  <input value={draft[f.key] ?? ''} onChange={e => setDraft(d => ({ ...d, [f.key]: e.target.value }))}
                    placeholder={activeTemplate?.defaults[f.key]}
                    className="mt-1.5 w-full rounded-lg border border-white/10 bg-[#101010] px-3 py-2 text-sm text-white outline-none transition focus:border-orange-400" />
                )}
                <span className="text-[10px] text-gray-600">{f.hint}</span>
              </label>
            ))}

            <label className="flex items-center gap-2 text-xs text-gray-400 pt-1">
              <input type="checkbox" checked={trialOn} onChange={e => setTrialOn(e.target.checked)} className="accent-orange-500" />
              Preview with the free-trial note shown
            </label>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button onClick={save} disabled={saving || !dirty}
                className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-lg text-sm font-bold transition disabled:opacity-40">
                {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {saving ? 'Saving…' : 'Save Email'}
              </button>
              <button onClick={sendTest} disabled={sendingTest}
                className="flex items-center gap-2 px-3 py-2 bg-[#1A1A1A] border border-[#2A2A2A] hover:border-orange-500/40 text-gray-200 rounded-lg text-sm font-semibold transition disabled:opacity-40">
                {sendingTest ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Send test to my inbox
              </button>
              <button onClick={resetToDefault}
                className="flex items-center gap-2 px-3 py-2 text-sm text-gray-400 hover:text-white transition">
                <RotateCcw className="w-4 h-4" /> Reset to default
              </button>
            </div>
            {activeTemplate?.updatedAt && (
              <p className="text-[11px] text-gray-500 pt-1">
                Last edited{activeTemplate.updatedBy ? ` by ${activeTemplate.updatedBy}` : ''} on {new Date(activeTemplate.updatedAt).toLocaleString()}
              </p>
            )}
          </div>

          {/* Live preview — Email / SMS / QR all built from the same template */}
          <div className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="inline-flex rounded-lg bg-[#101010] border border-[#2A2A2A] p-0.5">
                {([
                  { id: 'email' as Channel, label: 'Email', icon: Mail },
                  { id: 'sms' as Channel, label: 'SMS', icon: MessageSquare },
                  { id: 'qr' as Channel, label: 'QR', icon: QrCode },
                ]).map(ch => (
                  <button key={ch.id} onClick={() => setChannel(ch.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition ${channel === ch.id ? 'bg-orange-600 text-white' : 'text-gray-400 hover:text-white'}`}>
                    <ch.icon className="w-3.5 h-3.5" /> {ch.label}
                  </button>
                ))}
              </div>
              {previewing && channel !== 'qr' && <span className="text-[10px] text-gray-500 flex items-center gap-1"><RefreshCw className="w-3 h-3 animate-spin" /> updating</span>}
            </div>

            {channel === 'email' && (
              <div className="rounded-xl overflow-hidden border border-[#2A2A2A] bg-white h-[460px]">
                <iframe title="Invite email preview" srcDoc={previewHtml} className="w-full h-full" sandbox="" />
              </div>
            )}

            {channel === 'sms' && (
              <div className="space-y-3">
                <div className="rounded-xl border border-[#2A2A2A] bg-[#0B141A] p-4 h-[300px] overflow-y-auto flex items-start">
                  <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-[#1F6FEB] text-white text-sm px-3.5 py-2.5 whitespace-pre-wrap break-words">
                    {smsText || 'SMS preview will appear here…'}
                  </div>
                </div>
                <p className="text-[11px] text-gray-500">{smsText.length} characters · long texts auto-split into multiple SMS segments. Uses the same intro, pitch, and trial note as the email.</p>
                <div className="flex items-center gap-2">
                  <input value={testPhone} onChange={e => setTestPhone(e.target.value)} placeholder="+1 (214) 555-0100"
                    className="flex-1 rounded-lg border border-white/10 bg-[#101010] px-3 py-2 text-sm text-white outline-none focus:border-orange-400" />
                  <button onClick={sendTestSms} disabled={sendingTestSms}
                    className="flex items-center gap-2 px-3 py-2 bg-[#1A1A1A] border border-[#2A2A2A] hover:border-orange-500/40 text-gray-200 rounded-lg text-sm font-semibold transition disabled:opacity-40 whitespace-nowrap">
                    {sendingTestSms ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Send test SMS
                  </button>
                </div>
              </div>
            )}

            {channel === 'qr' && (
              <div className="rounded-xl border border-[#2A2A2A] bg-[#101010] p-5 h-[460px] flex flex-col items-center justify-center gap-4">
                {qrDataUrl ? (
                  <img src={qrDataUrl} alt="Portal onboarding QR code" className="w-56 h-56 rounded-lg bg-white p-3" />
                ) : (
                  <div className="w-56 h-56 rounded-lg bg-[#1A1A1A] flex items-center justify-center text-gray-600"><QrCode className="w-10 h-10" /></div>
                )}
                <p className="text-xs text-gray-400 text-center max-w-xs">Scan to open the {activeTemplate?.label} onboarding page. Print it on flyers, cards, or job sites — anyone who scans starts the same sign-up flow.</p>
                <code className="text-[10px] text-orange-300 break-all text-center">{`${ONBOARDING_BASE}?portal=${active}`}</code>
                <button onClick={downloadQr} disabled={!qrDataUrl}
                  className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-lg text-sm font-bold transition disabled:opacity-40">
                  <Download className="w-4 h-4" /> Download QR (PNG)
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
