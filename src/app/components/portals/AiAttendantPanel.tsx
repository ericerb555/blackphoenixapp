/**
 * AiAttendantPanel — the telephone number people actually ring, and who answers it.
 *
 * WHOSE SCREEN THIS IS
 *
 * The same account holder who sets up the rota next door: an association
 * secretary, a homeowner, a property manager. So it is written for somebody who
 * has never configured telephony and never will — one number, one switch, and
 * plain sentences about what a caller will hear.
 *
 * WHY IT IS A PANEL INSIDE OnCallSetup RATHER THAN A SCREEN OF ITS OWN
 *
 * Because the attendant is the front door of the rota, not a separate product.
 * An attendant switched on over an empty rota answers the phone warmly and
 * sends nobody, and the only way somebody sees that is if both halves are on
 * one page under one Save.
 *
 * WHAT IT REFUSES TO HIDE
 *
 * Three states that throw nothing and look finished: the attendant on with no
 * number assigned, a number assigned with the attendant off, and Twilio not
 * configured on the server at all. The server returns them with every load and
 * they are shown in amber at the top of the panel — not as a hint beside a
 * field, which is where warnings go to be ignored.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  Bot, LoaderCircle, Plus, Trash2, Save, AlertTriangle, PhoneIncoming,
  Mic, UserRound, ChevronDown, ChevronRight, Siren,
} from 'lucide-react';
import { API_BASE_URL } from '../../lib/apiConfig';

const SERVER = `${API_BASE_URL}/make-server-3eae23a6`;

/** The shape OnCallSetup's accent map already has. Passed in rather than rebuilt. */
export interface AttendantTone {
  text: string; hover: string; button: string;
  focus: string; check: string; chip: string;
}

interface Assignment {
  number: string; label: string; address: string;
  propertyId: string | null; enabled: boolean;
  assignedAt: string; assignedBy: string;
}

interface Settings {
  enabled: boolean;
  greeting: string;
  companyName: string;
  language: string;
  voice: string;
  recordCalls: boolean;
  askUnit: boolean;
  maxQuestions: number;
  handoffNumber: string;
  customCategories: Array<{ id: string; label: string; trade: string; safetyCritical: boolean; cues: string[] }>;
}

interface CallRow {
  id: string; startedAt: string; endedAt: string | null;
  summary: string; category: string; trade: string;
  safetyCritical: boolean; dispatched: boolean;
  workRequestId: string | null; jobId: string | null;
  from: string; callerName: string; recordingUrl: string | null;
}

const card = 'rounded-xl border border-[#2A2A2A] bg-[#0F0F0F] p-4';
const labelCls = 'mb-1.5 block text-xs font-semibold text-gray-400';

/**
 * The voices Twilio will actually speak with.
 *
 * A free-text voice name is one somebody mistypes, and Twilio answers a bad
 * voice by saying nothing at all — a silent emergency line that looks
 * configured.
 */
const VOICES = [
  { id: 'Polly.Joanna', label: 'Joanna — US English, calm' },
  { id: 'Polly.Matthew', label: 'Matthew — US English, calm' },
  { id: 'Polly.Salli', label: 'Salli — US English, brisk' },
  { id: 'Polly.Joey', label: 'Joey — US English, brisk' },
  { id: 'alice', label: 'Alice — the older Twilio voice' },
];

const when = (iso: string | null) => {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleString(); } catch { return iso; }
};

export default function AiAttendantPanel({ session, tone, input }: {
  session: any;
  tone: AttendantTone;
  input: string;
}) {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [numbers, setNumbers] = useState<Assignment[]>([]);
  const [calls, setCalls] = useState<CallRow[]>([]);
  const [readiness, setReadiness] = useState<{ configured: boolean; problems: string[] }>({ configured: true, problems: [] });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [open, setOpen] = useState(false);
  const [newNumber, setNewNumber] = useState({ number: '', label: '', address: '' });
  const [transcript, setTranscript] = useState<{ id: string; text: string } | null>(null);

  const authHeaders = useMemo(
    () => (session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : null),
    [session?.access_token],
  );

  const load = useCallback(async () => {
    if (!authHeaders) { setLoading(false); return; }
    setLoading(true);
    try {
      const res = await fetch(`${SERVER}/on-call-attendant`, { headers: authHeaders });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok || !payload?.success) throw new Error(payload?.error || 'Could not load the attendant.');
      setSettings(payload.settings);
      setNumbers(payload.numbers || []);
      setCalls(payload.calls || []);
      setReadiness(payload.readiness || { configured: true, problems: [] });
      setDirty(false);
    } catch (e: any) {
      toast.error(e?.message || 'Could not load the attendant.');
    } finally {
      setLoading(false);
    }
  }, [authHeaders]);

  useEffect(() => { void load(); }, [load]);

  const edit = (patch: Partial<Settings>) => {
    setSettings(s => (s ? { ...s, ...patch } : s));
    setDirty(true);
  };

  const save = async () => {
    if (!authHeaders || !settings) return;
    setSaving(true);
    try {
      const res = await fetch(`${SERVER}/on-call-attendant`, {
        method: 'PUT',
        headers: { ...authHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok || !payload?.success) throw new Error(payload?.error || 'Could not save.');
      setSettings(payload.settings);
      setDirty(false);
      toast.success(payload.settings.enabled ? 'The attendant is answering.' : 'The attendant is off.');
      // Reloaded rather than patched: switching it on changes which warnings apply.
      void load();
    } catch (e: any) {
      toast.error(e?.message || 'Could not save.');
    } finally {
      setSaving(false);
    }
  };

  const addNumber = async () => {
    if (!authHeaders) return;
    if (!newNumber.number.trim()) { toast.error('Enter the phone number first.'); return; }
    try {
      const res = await fetch(`${SERVER}/on-call-attendant/numbers`, {
        method: 'POST',
        headers: { ...authHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify(newNumber),
      });
      const payload = await res.json().catch(() => ({}));
      // A number held by another account comes back as a sentence saying so.
      if (!res.ok || !payload?.success) throw new Error(payload?.error || 'Could not add that number.');
      setNewNumber({ number: '', label: '', address: '' });
      toast.success(`${payload.assignment.number} now reaches your on-call.`);
      void load();
    } catch (e: any) {
      toast.error(e?.message || 'Could not add that number.');
    }
  };

  const removeNumber = async (number: string) => {
    if (!authHeaders) return;
    try {
      const res = await fetch(`${SERVER}/on-call-attendant/numbers/${encodeURIComponent(number)}`, {
        method: 'DELETE', headers: authHeaders,
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok || !payload?.success) throw new Error(payload?.error || 'Could not remove that number.');
      toast.success(`${number} no longer reaches your on-call.`);
      void load();
    } catch (e: any) {
      toast.error(e?.message || 'Could not remove that number.');
    }
  };

  const showTranscript = async (id: string) => {
    if (!authHeaders) return;
    if (transcript?.id === id) { setTranscript(null); return; }
    try {
      const res = await fetch(`${SERVER}/on-call-attendant/calls/${encodeURIComponent(id)}`, { headers: authHeaders });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok || !payload?.success) throw new Error(payload?.error || 'Could not read that call.');
      setTranscript({ id, text: payload.transcript || '' });
    } catch (e: any) {
      toast.error(e?.message || 'Could not read that call.');
    }
  };

  if (loading) {
    return (
      <div className={card}>
        <p className="flex items-center gap-2 text-sm text-gray-400">
          <LoaderCircle className="h-4 w-4 animate-spin" /> Loading the attendant…
        </p>
      </div>
    );
  }
  if (!settings) return null;

  return (
    <div className={card}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <button onClick={() => setOpen(o => !o)} className="flex items-start gap-2 text-left">
          {open ? <ChevronDown className="mt-0.5 h-4 w-4 text-gray-500" /> : <ChevronRight className="mt-0.5 h-4 w-4 text-gray-500" />}
          <span>
            <span className="flex items-center gap-2 text-sm font-bold text-white">
              <Bot className={`h-4 w-4 ${tone.text}`} /> AI attendant — the number people ring
            </span>
            <span className="mt-0.5 block text-xs text-gray-500">
              Answers 24/7, asks what has happened and where, and opens the emergency on your rota.
              It never decides who is called — your rules below do that.
            </span>
          </span>
        </button>
        <div className="flex items-center gap-2">
          {settings.enabled && numbers.length > 0 && (
            <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${tone.chip}`}>
              <PhoneIncoming className="h-3.5 w-3.5" /> Answering on {numbers.length} number{numbers.length === 1 ? '' : 's'}
            </span>
          )}
          <button onClick={save} disabled={saving || !dirty}
            className={`inline-flex items-center gap-2 rounded-lg ${tone.button} px-3 py-1.5 text-xs font-bold text-white transition disabled:opacity-50`}>
            {saving ? <><LoaderCircle className="h-3.5 w-3.5 animate-spin" /> Saving…</> : <><Save className="h-3.5 w-3.5" /> Save attendant</>}
          </button>
        </div>
      </div>

      {/* The three states that look finished and answer nothing. */}
      {readiness.problems.length > 0 && (
        <div className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
          <p className="flex items-center gap-2 text-xs font-bold text-amber-400">
            <AlertTriangle className="h-3.5 w-3.5" /> Worth knowing before somebody rings
          </p>
          <ul className="mt-1.5 space-y-1 text-xs text-amber-200/90">
            {readiness.problems.map((p, i) => <li key={i}>• {p}</li>)}
          </ul>
        </div>
      )}

      {open && (
        <div className="mt-4 space-y-4">
          {/* ── on or off ───────────────────────────────────────────────── */}
          <label className="flex cursor-pointer items-start gap-3">
            <input type="checkbox" checked={settings.enabled}
              onChange={e => edit({ enabled: e.target.checked })}
              className={`mt-0.5 h-4 w-4 rounded border-[#2A2A2A] ${tone.check}`} />
            <span>
              <span className="text-sm font-semibold text-white">Let the attendant answer these numbers</span>
              <span className="mt-0.5 block text-xs text-gray-500">
                Off means callers hear that the line is unavailable — or are put through to your
                handover number below, if you have set one.
              </span>
            </span>
          </label>

          {/* ── the numbers ─────────────────────────────────────────────── */}
          <div>
            <h4 className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-gray-400">
              <PhoneIncoming className="h-3.5 w-3.5" /> Numbers that reach your on-call
            </h4>
            {numbers.length === 0 && (
              <p className="mb-2 text-xs text-gray-500">
                No number yet. Add the number you want people to ring — it must be one pointed at
                Black Phoenix by your telephone provider.
              </p>
            )}
            <div className="space-y-2">
              {numbers.map(n => (
                <div key={n.number} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[#2A2A2A] bg-[#151515] px-3 py-2">
                  <div>
                    <p className="text-sm font-semibold text-white">{n.number}</p>
                    <p className="text-xs text-gray-500">
                      {n.label}{n.address ? ` · ${n.address}` : ''}
                    </p>
                  </div>
                  <button onClick={() => removeNumber(n.number)}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-red-400 hover:text-red-300">
                    <Trash2 className="h-3.5 w-3.5" /> Remove
                  </button>
                </div>
              ))}
            </div>
            <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_1fr_1fr_auto]">
              <input className={input} placeholder="(603) 555-0100" value={newNumber.number}
                onChange={e => setNewNumber(s => ({ ...s, number: e.target.value }))} />
              <input className={input} placeholder="What this line is called" value={newNumber.label}
                onChange={e => setNewNumber(s => ({ ...s, label: e.target.value }))} />
              {/* With a building here the attendant never has to ask where — the
                  question most likely to be answered badly by somebody panicking. */}
              <input className={input} placeholder="Building this line serves (optional)" value={newNumber.address}
                onChange={e => setNewNumber(s => ({ ...s, address: e.target.value }))} />
              <button onClick={addNumber}
                className={`inline-flex items-center justify-center gap-1.5 rounded-lg ${tone.button} px-3 py-2 text-xs font-bold text-white`}>
                <Plus className="h-3.5 w-3.5" /> Add
              </button>
            </div>
          </div>

          {/* ── what the caller hears ───────────────────────────────────── */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className={labelCls}>How you are announced</label>
              <input className={input} value={settings.companyName}
                onChange={e => edit({ companyName: e.target.value })}
                placeholder="Maple Court Association" />
            </div>
            <div>
              <label className={labelCls}>Voice</label>
              <select className={input} value={settings.voice} onChange={e => edit({ voice: e.target.value })}>
                {VOICES.map(v => <option key={v.id} value={v.id} className="bg-[#151515] text-white">{v.label}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className={labelCls}>Opening line (leave empty for the standard one)</label>
              <textarea className={input} rows={2} value={settings.greeting}
                onChange={e => edit({ greeting: e.target.value })}
                placeholder="Thank you for calling Maple Court. This is the emergency attendant." />
              <p className="mt-1 text-xs text-gray-600">
                The attendant always adds “Please tell me what is happening.” after this.
              </p>
            </div>
            <div>
              <label className={labelCls}>Most questions to ask</label>
              <input type="number" min={2} max={10} className={input} value={settings.maxQuestions}
                onChange={e => edit({ maxQuestions: Number(e.target.value) })} />
              <p className="mt-1 text-xs text-gray-600">
                After this it stops asking and dispatches with what it has. Somebody standing in
                rising water is not a form.
              </p>
            </div>
            <div>
              <label className={labelCls}>Put callers through to (optional)</label>
              <input className={input} value={settings.handoffNumber}
                onChange={e => edit({ handoffNumber: e.target.value })}
                placeholder="(603) 555-0188" />
              <p className="mt-1 text-xs text-gray-600">
                Anyone who asks for a person is transferred here. With no number, the attendant
                logs the emergency and tells them so.
              </p>
            </div>
          </div>

          <label className="flex cursor-pointer items-start gap-3">
            <input type="checkbox" checked={settings.askUnit}
              onChange={e => edit({ askUnit: e.target.checked })}
              className={`mt-0.5 h-4 w-4 rounded border-[#2A2A2A] ${tone.check}`} />
            <span>
              <span className="text-sm font-semibold text-white">Ask which unit or apartment</span>
              <span className="mt-0.5 block text-xs text-gray-500">
                Right for a building. Turn it off for single homes, where it is a question with no answer.
              </span>
            </span>
          </label>

          <label className="flex cursor-pointer items-start gap-3">
            <input type="checkbox" checked={settings.recordCalls}
              onChange={e => edit({ recordCalls: e.target.checked })}
              className={`mt-0.5 h-4 w-4 rounded border-[#2A2A2A] ${tone.check}`} />
            <span>
              <span className="flex items-center gap-1.5 text-sm font-semibold text-white">
                <Mic className="h-3.5 w-3.5" /> Record these calls
              </span>
              <span className="mt-0.5 block text-xs text-gray-500">
                The attendant announces the recording in its greeting. In two-party-consent states
                that announcement is the consent, so it is not optional and cannot be removed.
                A written summary of every call is kept either way.
              </span>
            </span>
          </label>

          {/* ── what has come in ────────────────────────────────────────── */}
          <div>
            <h4 className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-gray-400">
              <UserRound className="h-3.5 w-3.5" /> Calls the attendant has taken
            </h4>
            {calls.length === 0 && (
              <p className="text-xs text-gray-500">No calls yet.</p>
            )}
            <div className="space-y-2">
              {calls.map(callRow => (
                <div key={callRow.id} className="rounded-lg border border-[#2A2A2A] bg-[#151515] px-3 py-2">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="flex items-center gap-1.5 text-sm font-semibold text-white">
                        {callRow.safetyCritical && <Siren className="h-3.5 w-3.5 text-red-400" />}
                        {callRow.summary || callRow.category || 'Emergency'}
                      </p>
                      <p className="text-xs text-gray-500">
                        {when(callRow.startedAt)} · {callRow.from || 'number withheld'}
                        {callRow.jobId ? ` · job ${callRow.jobId}` : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {/* Not dispatched is the one thing on this list that needs
                          chasing, so it is the one thing coloured. */}
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                        callRow.dispatched
                          ? 'border border-green-500/30 bg-green-500/15 text-green-400'
                          : 'border border-red-500/30 bg-red-500/15 text-red-400'
                      }`}>
                        {callRow.dispatched ? 'Dispatched' : 'Not dispatched'}
                      </span>
                      <button onClick={() => showTranscript(callRow.id)}
                        className={`text-xs font-semibold ${tone.text} ${tone.hover}`}>
                        {transcript?.id === callRow.id ? 'Hide' : 'Transcript'}
                      </button>
                    </div>
                  </div>
                  {transcript?.id === callRow.id && (
                    <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap rounded-lg bg-[#0B0B0B] p-3 text-xs text-gray-300">
                      {transcript.text}
                    </pre>
                  )}
                  {callRow.recordingUrl && (
                    <audio controls src={callRow.recordingUrl} className="mt-2 w-full" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
