/**
 * Notification Recipients — Owner Dashboard
 *
 * Controls who on the team gets emailed when someone signs up for a portal,
 * a payment is captured, or a work request comes in.
 *
 * The addresses in the ADMIN_NOTIFICATION_EMAILS secret are shown read-only:
 * they always receive everything, so no UI mistake can silence every alert.
 */

import { useCallback, useEffect, useState } from 'react';
import {
  Bell, Plus, Trash2, Mail, ShieldCheck, AlertCircle, Send,
  Loader2, CheckCircle2, XCircle, RefreshCw, Lock, Pencil,
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { projectId } from '../../utils/supabase/info';
import { supabase } from '../../lib/supabase';

const SERVER = `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6`;

type EventId = 'signup' | 'payment' | 'work_request';

interface EventMeta {
  id: EventId;
  label: string;
  description: string;
}

interface Recipient {
  id: string;
  email: string;
  name: string;
  role: 'owner' | 'admin' | 'employee';
  events: EventId[];
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

interface LogEntry {
  id: string;
  event: string;
  subject: string;
  recipients: string[];
  status: 'sent' | 'failed' | 'skipped';
  error?: string;
  sentAt: string;
}

const EMPTY_FORM = {
  id: '',
  name: '',
  email: '',
  role: 'employee' as Recipient['role'],
  events: [] as EventId[],
  enabled: true,
};

export function NotificationRecipientsPanel() {
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [ownerEmails, setOwnerEmails] = useState<string[]>([]);
  const [events, setEvents] = useState<EventMeta[]>([]);
  const [emailConfigured, setEmailConfigured] = useState(true);
  const [fromEmail, setFromEmail] = useState('');
  const [log, setLog] = useState<LogEntry[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  const authHeaders = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) throw new Error('Sign in as an owner to manage notification recipients.');
    return { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' };
  }, []);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const headers = await authHeaders();

      const res = await fetch(`${SERVER}/staff-notifications/recipients`, { headers });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || `Request failed with status ${res.status}`);

      setRecipients(Array.isArray(data.recipients) ? data.recipients : []);
      setOwnerEmails(Array.isArray(data.ownerEmails) ? data.ownerEmails : []);
      setEvents(Array.isArray(data.events) ? data.events : []);
      setEmailConfigured(Boolean(data.emailConfigured));
      setFromEmail(data.fromEmail || '');

      const logRes = await fetch(`${SERVER}/staff-notifications/log?limit=25`, { headers });
      const logData = await logRes.json();
      if (logRes.ok && logData.success) setLog(Array.isArray(logData.log) ? logData.log : []);
    } catch (err: any) {
      console.error('[NotificationRecipients] Failed to load:', err);
      setError(err?.message || 'Could not load notification recipients.');
    } finally {
      setLoading(false);
    }
  }, [authHeaders]);

  useEffect(() => { load(); }, [load]);

  const startAdd = () => { setForm(EMPTY_FORM); setShowForm(true); };

  const startEdit = (r: Recipient) => {
    setForm({ id: r.id, name: r.name, email: r.email, role: r.role, events: r.events || [], enabled: r.enabled !== false });
    setShowForm(true);
  };

  const toggleFormEvent = (id: EventId) => {
    setForm(prev => ({
      ...prev,
      events: prev.events.includes(id) ? prev.events.filter(e => e !== id) : [...prev.events, id],
    }));
  };

  const save = async () => {
    if (!form.email.trim()) return toast.error('Enter an email address.');
    if (form.events.length === 0) return toast.error('Pick at least one alert this person should receive.');

    try {
      setSaving(true);
      const res = await fetch(`${SERVER}/staff-notifications/recipients`, {
        method: 'POST',
        headers: await authHeaders(),
        body: JSON.stringify({
          id: form.id || undefined,
          email: form.email.trim(),
          name: form.name.trim(),
          role: form.role,
          events: form.events,
          enabled: form.enabled,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || `Save failed with status ${res.status}`);

      setRecipients(data.recipients || []);
      setShowForm(false);
      setForm(EMPTY_FORM);
      toast.success(form.id ? 'Recipient updated' : `${form.email.trim()} will now get these alerts`);
    } catch (err: any) {
      console.error('[NotificationRecipients] Save failed:', err);
      toast.error(err?.message || 'Could not save this recipient.');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (r: Recipient) => {
    if (!confirm(`Stop sending alerts to ${r.email}?`)) return;
    try {
      const res = await fetch(`${SERVER}/staff-notifications/recipients/${r.id}`, {
        method: 'DELETE',
        headers: await authHeaders(),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || `Delete failed with status ${res.status}`);
      setRecipients(data.recipients || []);
      toast.success(`${r.email} removed`);
    } catch (err: any) {
      console.error('[NotificationRecipients] Delete failed:', err);
      toast.error(err?.message || 'Could not remove this recipient.');
    }
  };

  const toggleEnabled = async (r: Recipient) => {
    try {
      const res = await fetch(`${SERVER}/staff-notifications/recipients`, {
        method: 'POST',
        headers: await authHeaders(),
        body: JSON.stringify({ ...r, enabled: !r.enabled }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || `Update failed with status ${res.status}`);
      setRecipients(data.recipients || []);
    } catch (err: any) {
      console.error('[NotificationRecipients] Toggle failed:', err);
      toast.error(err?.message || 'Could not update this recipient.');
    }
  };

  const sendTest = async (event: EventId) => {
    try {
      setTesting(true);
      const res = await fetch(`${SERVER}/staff-notifications/test`, {
        method: 'POST',
        headers: await authHeaders(),
        body: JSON.stringify({ event }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || `Test failed with status ${res.status}`);
      toast.success(`Test sent to ${(data.recipients || []).length} recipient(s)`);
      load();
    } catch (err: any) {
      console.error('[NotificationRecipients] Test send failed:', err);
      toast.error(err?.message || 'Could not send the test notification.');
    } finally {
      setTesting(false);
    }
  };

  const eventLabel = (id: string) => events.find(e => e.id === id)?.label || id;

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-3 rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-12 text-gray-400">
        <Loader2 className="h-5 w-5 animate-spin" />
        Loading notification settings...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-bold text-white">
            <Bell className="h-5 w-5 text-[#ea580c]" />
            Notification Recipients
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-gray-400">
            Choose who gets an email when someone signs up for a portal, a payment comes in,
            or a work request is submitted. Add admins and employees here at any time — no redeploy needed.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={load}
            className="flex items-center gap-2 rounded-lg border border-[#2A2A2A] bg-[#1A1A1A] px-3 py-2 text-sm text-white hover:border-[#ea580c]"
          >
            <RefreshCw className="h-4 w-4" /> Refresh
          </button>
          <button
            onClick={startAdd}
            className="flex items-center gap-2 rounded-lg bg-[#ea580c] px-4 py-2 text-sm font-semibold text-white hover:bg-[#c2410c]"
          >
            <Plus className="h-4 w-4" /> Add Recipient
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-4">
          <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-400" />
          <div>
            <p className="text-sm font-semibold text-red-300">Could not load recipients</p>
            <p className="mt-1 text-sm text-red-200/80">{error}</p>
          </div>
        </div>
      )}

      {!emailConfigured && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
          <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-400" />
          <div>
            <p className="text-sm font-semibold text-amber-300">No email provider configured</p>
            <p className="mt-1 text-sm text-amber-200/80">
              RESEND_API_KEY is not set in the edge function secrets, so no alert emails can go out.
              Alerts are still recorded in the log below, but nobody is being emailed.
            </p>
          </div>
        </div>
      )}

      {/* Always-on owner addresses */}
      {ownerEmails.length > 0 && (
        <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-white">
            <ShieldCheck className="h-4 w-4 text-green-400" />
            Always notified (owner addresses)
          </div>
          <p className="mt-1 text-xs text-gray-500">
            Set in the ADMIN_NOTIFICATION_EMAILS secret. These receive every alert and cannot be removed here,
            so a change on this page can never leave you with no coverage.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {ownerEmails.map(email => (
              <span key={email} className="inline-flex items-center gap-1.5 rounded-full bg-green-500/10 px-3 py-1 text-xs text-green-300">
                <Lock className="h-3 w-3" /> {email}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Add / edit form */}
      {showForm && (
        <div className="rounded-xl border border-[#ea580c]/40 bg-[#1A1A1A] p-5">
          <h3 className="mb-4 text-sm font-bold text-white">
            {form.id ? 'Edit recipient' : 'Add a recipient'}
          </h3>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs text-gray-400">Name</label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Jordan Reyes"
                className="w-full rounded-lg border border-[#2A2A2A] bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none focus:border-[#ea580c]"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-400">Email *</label>
              <input
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="name@company.com"
                className="w-full rounded-lg border border-[#2A2A2A] bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none focus:border-[#ea580c]"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-400">Role</label>
              <select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value as Recipient['role'] })}
                className="w-full rounded-lg border border-[#2A2A2A] bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none focus:border-[#ea580c]"
              >
                <option value="employee">Employee</option>
                <option value="admin">Admin</option>
                <option value="owner">Owner</option>
              </select>
            </div>
          </div>

          <div className="mt-4">
            <label className="mb-2 block text-xs text-gray-400">Send this person *</label>
            <div className="grid gap-2 sm:grid-cols-3">
              {events.map(evt => {
                const checked = form.events.includes(evt.id);
                return (
                  <label
                    key={evt.id}
                    className={`cursor-pointer rounded-lg border p-3 transition-colors ${
                      checked ? 'border-[#ea580c] bg-[#ea580c]/10' : 'border-[#2A2A2A] bg-[#0A0A0A] hover:border-[#3A3A3A]'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleFormEvent(evt.id)}
                        className="mt-0.5"
                      />
                      <div>
                        <div className="text-sm font-medium text-white">{evt.label}</div>
                        <div className="mt-0.5 text-[11px] leading-snug text-gray-500">{evt.description}</div>
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="mt-5 flex justify-end gap-2">
            <button
              onClick={() => { setShowForm(false); setForm(EMPTY_FORM); }}
              disabled={saving}
              className="rounded-lg border border-[#2A2A2A] bg-[#0A0A0A] px-4 py-2 text-sm text-white hover:border-[#3A3A3A] disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={save}
              disabled={saving}
              className="flex items-center gap-2 rounded-lg bg-[#ea580c] px-4 py-2 text-sm font-semibold text-white hover:bg-[#c2410c] disabled:opacity-50"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {form.id ? 'Save changes' : 'Add recipient'}
            </button>
          </div>
        </div>
      )}

      {/* Recipient list */}
      <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A]">
        {recipients.length === 0 ? (
          <div className="p-10 text-center">
            <Mail className="mx-auto mb-3 h-10 w-10 text-gray-600" />
            <p className="text-sm text-gray-400">
              No extra recipients yet. {ownerEmails.length > 0
                ? 'Only the owner addresses above are being notified.'
                : 'Nobody is currently being notified — add someone below.'}
            </p>
            <button
              onClick={startAdd}
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[#ea580c] px-4 py-2 text-sm font-semibold text-white hover:bg-[#c2410c]"
            >
              <Plus className="h-4 w-4" /> Add your first recipient
            </button>
          </div>
        ) : (
          <div className="divide-y divide-[#2A2A2A]">
            {recipients.map(r => (
              <div key={r.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-white">{r.name || r.email}</span>
                    <span className="rounded-full bg-[#2A2A2A] px-2 py-0.5 text-[10px] uppercase tracking-wide text-gray-400">
                      {r.role}
                    </span>
                    {!r.enabled && (
                      <span className="rounded-full bg-gray-500/15 px-2 py-0.5 text-[10px] uppercase tracking-wide text-gray-400">
                        Paused
                      </span>
                    )}
                  </div>
                  {r.name && <div className="mt-0.5 truncate text-xs text-gray-500">{r.email}</div>}
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {(r.events || []).map(e => (
                      <span key={e} className="rounded-full bg-[#ea580c]/10 px-2 py-0.5 text-[11px] text-[#fb923c]">
                        {eventLabel(e)}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex flex-shrink-0 gap-2">
                  <button
                    onClick={() => toggleEnabled(r)}
                    title={r.enabled ? 'Pause alerts for this person' : 'Resume alerts'}
                    className="rounded-lg border border-[#2A2A2A] bg-[#0A0A0A] p-2 text-gray-400 hover:border-[#ea580c] hover:text-white"
                  >
                    {r.enabled ? <CheckCircle2 className="h-4 w-4 text-green-400" /> : <XCircle className="h-4 w-4" />}
                  </button>
                  <button
                    onClick={() => startEdit(r)}
                    title="Edit"
                    className="rounded-lg border border-[#2A2A2A] bg-[#0A0A0A] p-2 text-gray-400 hover:border-[#ea580c] hover:text-white"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => remove(r)}
                    title="Remove"
                    className="rounded-lg border border-[#2A2A2A] bg-[#0A0A0A] p-2 text-gray-400 hover:border-red-500 hover:text-red-400"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Test sends */}
      <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-4">
        <div className="text-sm font-semibold text-white">Send a test</div>
        <p className="mt-1 text-xs text-gray-500">
          Delivers a real email to everyone subscribed to that alert, so you can confirm it arrives before a client triggers it.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {events.map(evt => (
            <button
              key={evt.id}
              onClick={() => sendTest(evt.id)}
              disabled={testing}
              className="flex items-center gap-2 rounded-lg border border-[#2A2A2A] bg-[#0A0A0A] px-3 py-2 text-sm text-white hover:border-[#ea580c] disabled:opacity-50"
            >
              {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Test “{evt.label}”
            </button>
          ))}
        </div>
        {fromEmail && (
          <p className="mt-3 text-[11px] text-gray-600">Alerts are sent from {fromEmail}</p>
        )}
      </div>

      {/* Delivery log */}
      <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A]">
        <div className="border-b border-[#2A2A2A] p-4 text-sm font-semibold text-white">
          Recent alert deliveries
        </div>
        {log.length === 0 ? (
          <p className="p-6 text-sm text-gray-500">
            Nothing sent yet. Once a sign-up, payment or work request comes in, it will show up here.
          </p>
        ) : (
          <div className="divide-y divide-[#2A2A2A]">
            {log.map(entry => (
              <div key={entry.id} className="flex items-start gap-3 p-4">
                {entry.status === 'sent'
                  ? <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-400" />
                  : entry.status === 'skipped'
                    ? <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-gray-500" />
                    : <XCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-400" />}
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm text-white">{entry.subject}</div>
                  <div className="mt-0.5 text-xs text-gray-500">
                    {eventLabel(entry.event)} · {new Date(entry.sentAt).toLocaleString('en-US')}
                    {entry.recipients?.length ? ` · ${entry.recipients.length} recipient(s)` : ''}
                  </div>
                  {entry.error && <div className="mt-1 text-xs text-red-300/80">{entry.error}</div>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default NotificationRecipientsPanel;
