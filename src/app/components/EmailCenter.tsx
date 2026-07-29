/**
 * EmailCenter
 *
 * Lives inside the User Management Hub. Lets an owner/admin:
 *  - See a log of every email that has actually been sent out (Sent tab)
 *  - Edit reusable email templates: subject + HTML body (Templates tab)
 *  - Compose & send an email from a template, which is then recorded in the log (Compose tab)
 *
 * Backend: /make-server-3eae23a6/email-center/{templates,log,send}
 */
import { useEffect, useMemo, useState } from 'react';
import { Mail, Send, FileText, Save, Trash2, Clock, CheckCircle2, XCircle, RefreshCw, Eye } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { publicAnonKey, projectId } from '../utils/supabase/info';

const SERVER = `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6/email-center`;

interface Template {
  key: string;
  name: string;
  subject: string;
  html: string;
  updatedAt?: string;
}

interface SentEmail {
  id: string;
  to: string;
  subject: string;
  html: string;
  templateKey: string | null;
  status: 'sent' | 'failed';
  provider: string;
  error: string | null;
  sentAt: string;
}

type SubTab = 'sent' | 'templates' | 'compose';

const authHeaders = {
  'Content-Type': 'application/json',
  Authorization: `Bearer ${publicAnonKey}`,
};

export function EmailCenter() {
  const [subTab, setSubTab] = useState<SubTab>('sent');

  const [templates, setTemplates] = useState<Template[]>([]);
  const [sent, setSent] = useState<SentEmail[]>([]);
  const [loading, setLoading] = useState(false);

  // Template editing
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [draft, setDraft] = useState<Template>({ key: '', name: '', subject: '', html: '' });
  const [saving, setSaving] = useState(false);

  // Compose
  const [composeTo, setComposeTo] = useState('');
  const [composeSubject, setComposeSubject] = useState('');
  const [composeHtml, setComposeHtml] = useState('');
  const [composeTemplateKey, setComposeTemplateKey] = useState<string>('');
  const [sending, setSending] = useState(false);

  // Preview
  const [previewEmail, setPreviewEmail] = useState<SentEmail | null>(null);

  const loadTemplates = async () => {
    try {
      const res = await fetch(`${SERVER}/templates`, { headers: authHeaders });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setTemplates(data.templates || []);
    } catch (err) {
      console.error('[EmailCenter] Failed to load templates:', err);
      toast.error(`Could not load templates: ${err}`);
    }
  };

  const loadSent = async () => {
    try {
      const res = await fetch(`${SERVER}/log`, { headers: authHeaders });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setSent(data.emails || []);
    } catch (err) {
      console.error('[EmailCenter] Failed to load sent log:', err);
      toast.error(`Could not load sent emails: ${err}`);
    }
  };

  const refreshAll = async () => {
    setLoading(true);
    await Promise.all([loadTemplates(), loadSent()]);
    setLoading(false);
  };

  useEffect(() => {
    refreshAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Template editing ──────────────────────────────────────────────
  const startEdit = (t: Template) => {
    setEditingKey(t.key);
    setDraft({ ...t });
  };

  const startNew = () => {
    setEditingKey('__new__');
    setDraft({ key: '', name: '', subject: '', html: '' });
  };

  const saveTemplate = async () => {
    const key = (editingKey === '__new__' ? draft.key : editingKey)?.trim();
    if (!key) {
      toast.error('Template key is required (e.g. "welcome").');
      return;
    }
    if (!draft.subject.trim() || !draft.html.trim()) {
      toast.error('Subject and body are both required.');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`${SERVER}/templates/${encodeURIComponent(key)}`, {
        method: 'PUT',
        headers: authHeaders,
        body: JSON.stringify({ name: draft.name || key, subject: draft.subject, html: draft.html }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      toast.success('Template saved.');
      setEditingKey(null);
      await loadTemplates();
    } catch (err) {
      console.error('[EmailCenter] Failed to save template:', err);
      toast.error(`Could not save template: ${err}`);
    } finally {
      setSaving(false);
    }
  };

  const deleteTemplate = async (key: string) => {
    if (!confirm(`Delete template "${key}"? This cannot be undone.`)) return;
    try {
      const res = await fetch(`${SERVER}/templates/${encodeURIComponent(key)}`, {
        method: 'DELETE',
        headers: authHeaders,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      toast.success('Template deleted.');
      await loadTemplates();
    } catch (err) {
      console.error('[EmailCenter] Failed to delete template:', err);
      toast.error(`Could not delete template: ${err}`);
    }
  };

  // ── Compose ──────────────────────────────────────────────────────
  const applyTemplateToCompose = (key: string) => {
    setComposeTemplateKey(key);
    const t = templates.find((x) => x.key === key);
    if (t) {
      setComposeSubject(t.subject);
      setComposeHtml(t.html);
    }
  };

  const sendEmail = async () => {
    if (!composeTo.trim() || !composeSubject.trim() || !composeHtml.trim()) {
      toast.error('Recipient, subject, and body are all required.');
      return;
    }
    setSending(true);
    try {
      const res = await fetch(`${SERVER}/send`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          to: composeTo.split(',').map((s) => s.trim()).filter(Boolean),
          subject: composeSubject,
          html: composeHtml,
          templateKey: composeTemplateKey || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      toast.success('Email sent and logged.');
      setComposeTo('');
      await loadSent();
      setSubTab('sent');
    } catch (err) {
      console.error('[EmailCenter] Failed to send email:', err);
      toast.error(`Could not send email: ${err}`);
    } finally {
      setSending(false);
    }
  };

  const subTabs: { id: SubTab; label: string; icon: any }[] = useMemo(
    () => [
      { id: 'sent', label: `Sent (${sent.length})`, icon: Clock },
      { id: 'templates', label: `Templates (${templates.length})`, icon: FileText },
      { id: 'compose', label: 'Compose', icon: Send },
    ],
    [sent.length, templates.length],
  );

  const inputCls =
    'w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#ea580c] transition';

  return (
    <div className="p-6 space-y-6">
      {/* Sub-tab nav */}
      <div className="flex flex-wrap items-center gap-2">
        {subTabs.map((t) => {
          const Icon = t.icon;
          const active = subTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setSubTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${
                active
                  ? 'bg-gradient-to-br from-[#ea580c] to-[#c2410c] text-white'
                  : 'bg-[#0F0F0F] text-gray-400 hover:text-white border border-[#2A2A2A]'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="font-semibold">{t.label}</span>
            </button>
          );
        })}
        <button
          onClick={refreshAll}
          className="ml-auto flex items-center gap-2 px-3 py-2 rounded-xl bg-[#0F0F0F] text-gray-400 hover:text-white border border-[#2A2A2A]"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* SENT LOG */}
      {subTab === 'sent' && (
        <div className="space-y-3">
          {sent.length === 0 ? (
            <div className="text-center py-16 text-gray-500">
              <Mail className="w-12 h-12 mx-auto mb-3 opacity-40" />
              No emails have been sent yet.
            </div>
          ) : (
            sent.map((e) => (
              <div
                key={e.id}
                className="flex items-center gap-4 bg-[#0F0F0F] border border-[#2A2A2A] rounded-xl p-4"
              >
                {e.status === 'sent' ? (
                  <CheckCircle2 className="w-5 h-5 text-green-400 shrink-0" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-400 shrink-0" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-white truncate">{e.subject}</div>
                  <div className="text-sm text-gray-400 truncate">
                    To: {e.to} · {new Date(e.sentAt).toLocaleString()}
                    {e.error ? <span className="text-red-400"> · {e.error}</span> : null}
                  </div>
                </div>
                <button
                  onClick={() => setPreviewEmail(e)}
                  className="flex items-center gap-1 px-3 py-2 text-sm rounded-lg bg-[#1A1A1A] border border-[#2A2A2A] text-gray-300 hover:text-white hover:border-[#ea580c]"
                >
                  <Eye className="w-4 h-4" /> View
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {/* TEMPLATES */}
      {subTab === 'templates' && (
        <div className="space-y-4">
          {editingKey === null ? (
            <>
              <div className="flex justify-end">
                <button
                  onClick={startNew}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-br from-[#ea580c] to-[#c2410c] text-white rounded-xl font-semibold"
                >
                  <FileText className="w-4 h-4" /> New Template
                </button>
              </div>
              {templates.length === 0 ? (
                <div className="text-center py-16 text-gray-500">No templates yet.</div>
              ) : (
                templates.map((t) => (
                  <div
                    key={t.key}
                    className="flex items-center gap-4 bg-[#0F0F0F] border border-[#2A2A2A] rounded-xl p-4"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-white">{t.name}</div>
                      <div className="text-sm text-gray-400 truncate">
                        <span className="text-gray-500">{t.key}</span> · {t.subject}
                      </div>
                    </div>
                    <button
                      onClick={() => startEdit(t)}
                      className="px-3 py-2 text-sm rounded-lg bg-[#1A1A1A] border border-[#2A2A2A] text-gray-300 hover:text-white hover:border-[#ea580c]"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => deleteTemplate(t.key)}
                      className="p-2 rounded-lg bg-[#1A1A1A] border border-[#2A2A2A] text-gray-400 hover:text-red-400 hover:border-red-500/40"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </>
          ) : (
            <div className="space-y-4 bg-[#0F0F0F] border border-[#2A2A2A] rounded-2xl p-6">
              {editingKey === '__new__' && (
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Template key (no spaces)</label>
                  <input
                    className={inputCls}
                    value={draft.key}
                    onChange={(e) => setDraft({ ...draft, key: e.target.value.replace(/\s+/g, '-') })}
                    placeholder="e.g. promo-offer"
                  />
                </div>
              )}
              <div>
                <label className="block text-sm text-gray-400 mb-2">Display name</label>
                <input
                  className={inputCls}
                  value={draft.name}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                  placeholder="Welcome Email"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">Subject</label>
                <input
                  className={inputCls}
                  value={draft.subject}
                  onChange={(e) => setDraft({ ...draft, subject: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">
                  Body (HTML) — use {'{{name}}'}, {'{{link}}'}, {'{{details}}'} as placeholders
                </label>
                <textarea
                  className={`${inputCls} font-mono text-sm min-h-[220px]`}
                  value={draft.html}
                  onChange={(e) => setDraft({ ...draft, html: e.target.value })}
                />
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={saveTemplate}
                  disabled={saving}
                  className="flex items-center gap-2 px-5 py-3 bg-gradient-to-br from-[#ea580c] to-[#c2410c] text-white rounded-xl font-semibold disabled:opacity-50"
                >
                  <Save className="w-4 h-4" /> {saving ? 'Saving…' : 'Save Template'}
                </button>
                <button
                  onClick={() => setEditingKey(null)}
                  className="px-5 py-3 bg-[#1A1A1A] border border-[#2A2A2A] text-gray-300 hover:text-white rounded-xl"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* COMPOSE */}
      {subTab === 'compose' && (
        <div className="space-y-4 bg-[#0F0F0F] border border-[#2A2A2A] rounded-2xl p-6">
          <div>
            <label className="block text-sm text-gray-400 mb-2">Start from template (optional)</label>
            <select
              className={inputCls}
              value={composeTemplateKey}
              onChange={(e) => applyTemplateToCompose(e.target.value)}
            >
              <option value="">— None —</option>
              {templates.map((t) => (
                <option key={t.key} value={t.key}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-2">To (comma-separated for multiple)</label>
            <input
              className={inputCls}
              value={composeTo}
              onChange={(e) => setComposeTo(e.target.value)}
              placeholder="customer@example.com"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-2">Subject</label>
            <input
              className={inputCls}
              value={composeSubject}
              onChange={(e) => setComposeSubject(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-2">Body (HTML)</label>
            <textarea
              className={`${inputCls} font-mono text-sm min-h-[220px]`}
              value={composeHtml}
              onChange={(e) => setComposeHtml(e.target.value)}
            />
          </div>
          {composeHtml && (
            <div>
              <label className="block text-sm text-gray-400 mb-2">Preview</label>
              <div
                className="bg-white rounded-xl p-4 max-h-64 overflow-auto"
                // Preview of the owner's own composed content.
                dangerouslySetInnerHTML={{ __html: composeHtml }}
              />
            </div>
          )}
          <button
            onClick={sendEmail}
            disabled={sending}
            className="flex items-center gap-2 px-5 py-3 bg-gradient-to-br from-[#ea580c] to-[#c2410c] text-white rounded-xl font-semibold disabled:opacity-50"
          >
            <Send className="w-4 h-4" /> {sending ? 'Sending…' : 'Send Email'}
          </button>
        </div>
      )}

      {/* Preview modal */}
      {previewEmail && (
        <div
          className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
          onClick={() => setPreviewEmail(null)}
        >
          <div
            className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 border-b border-[#2A2A2A]">
              <div className="font-bold text-white">{previewEmail.subject}</div>
              <div className="text-sm text-gray-400 mt-1">
                To: {previewEmail.to} · {new Date(previewEmail.sentAt).toLocaleString()}
              </div>
            </div>
            <div className="p-5 overflow-auto">
              <div
                className="bg-white rounded-xl p-4"
                dangerouslySetInnerHTML={{ __html: previewEmail.html || '<p>(no body stored)</p>' }}
              />
            </div>
            <div className="p-4 border-t border-[#2A2A2A] flex justify-end">
              <button
                onClick={() => setPreviewEmail(null)}
                className="px-5 py-2 bg-[#0F0F0F] border border-[#2A2A2A] text-gray-300 hover:text-white rounded-xl"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default EmailCenter;
