/**
 * OnCallSetup — the screen a portal account sets its own on-call up on.
 *
 * WHOSE SCREEN THIS IS
 *
 * The account holder's. Each portal account runs its own on-call — their
 * people, their numbers, their hours — with Black Phoenix as the escalation
 * when nobody there answers, and with us running it outright for accounts that
 * have added on-call to their subscription. So this is edited by a landlord or
 * a condo association, not by staff on their behalf, and it has to make sense
 * to somebody who has never seen an escalation ladder before.
 *
 * SEVERAL SERVICES, NOT ONE ROTA
 *
 * A burst pipe and a tenant locked out are not the same emergency and do not
 * wake the same person. So the account keeps a list of services — one for
 * plumbing, one for lockouts, one for everything else — each with its own rota,
 * its own hours and rates where they differ, and its own answer to whether an
 * unanswered call should go out to Phoenix Exchange.
 *
 * WHAT IT REFUSES TO HIDE
 *
 * The state where on-call is switched on and nobody can be reached. The server
 * returns `readiness` with every load and save precisely because that state
 * throws nothing, looks finished, and is discovered during an emergency. It is
 * shown at the top, in amber, naming the service at fault — not as a validation
 * message beside a field, which is where warnings go to be ignored.
 *
 * MONEY CROSSES THE BOUNDARY ONCE
 *
 * The server stores cents; this shows dollars. That conversion happens in
 * `toCents` and `toDollars` and nowhere else, because getting it wrong is a
 * factor of a hundred in either direction and it is the kind of mistake that
 * reaches an invoice.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  PhoneCall, LoaderCircle, Plus, Trash2, Save, AlertTriangle, CheckCircle2,
  Clock, Users, Handshake, Wallet, ShieldCheck, Radio, Siren, Share2,
} from 'lucide-react';
import { projectId } from '../../utils/supabase/info';

const SERVER = `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6`;

interface Contact {
  id: string; name: string; phone: string;
  email?: string; role?: string; level?: string;
}
interface Step { contactIds: string[]; waitMinutes: number }
interface Hours {
  mode: 'always' | 'outside-business-hours' | 'custom';
  timezone: string;
  businessOpen?: string;
  businessClose?: string;
  windows?: Array<{ day: number; from: string; to: string }>;
}
interface Extras {
  calloutCents: number; afterHoursCents: number;
  hourlyCents: number; minimumHours: number; notes?: string;
}
interface Service {
  id: string; name: string; events: string[]; ladder: Step[];
  hours?: Hours; extras?: Extras;
  sendToExchange: boolean; enabled: boolean;
}
interface Vendor {
  trade: string; name: string; phone?: string; email?: string; exclusive: boolean;
}
interface Config {
  email: string; audience: string; enabled: boolean;
  hours: Hours; extras: Extras;
  contacts: Contact[]; services: Service[]; contractedVendors: Vendor[];
  escalateToPlatform: boolean;
}

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/**
 * The zones a customer of this platform plausibly operates in.
 *
 * A free-text zone is a zone somebody mistypes, and a mistyped zone makes every
 * hours comparison answer for the wrong part of the world — silently, and only
 * at night. A short list beats a text box here.
 */
const ZONES = [
  'America/New_York', 'America/Chicago', 'America/Denver', 'America/Phoenix',
  'America/Los_Angeles', 'America/Anchorage', 'Pacific/Honolulu',
];

const toDollars = (cents: number) => (Number(cents) || 0) / 100;
const toCents = (dollars: string | number) => Math.round((Number(dollars) || 0) * 100);
const uid = (p: string) => `${p}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;

const BLANK_EXTRAS: Extras = {
  calloutCents: 0, afterHoursCents: 0, hourlyCents: 0, minimumHours: 0,
};

/**
 * Each portal's own accent, spelled out rather than built.
 *
 * Tailwind reads class names out of the source at build time, so a name put
 * together at runtime — `bg-${accent}-600` — is not in the stylesheet and the
 * element renders with no colour at all. The landlord portal is teal and the
 * other two orange, so both have to appear here literally.
 */
const ACCENTS = {
  orange: {
    text: 'text-orange-400', hover: 'hover:text-orange-300',
    button: 'bg-orange-600 hover:bg-orange-500',
    focus: 'focus:border-orange-500', check: 'text-orange-600 focus:ring-orange-500',
    chip: 'border-orange-500/40 bg-orange-500/15 text-orange-300',
  },
  teal: {
    text: 'text-teal-400', hover: 'hover:text-teal-300',
    button: 'bg-teal-600 hover:bg-teal-500',
    focus: 'focus:border-teal-500', check: 'text-teal-600 focus:ring-teal-500',
    chip: 'border-teal-500/40 bg-teal-500/15 text-teal-300',
  },
  blue: {
    text: 'text-blue-400', hover: 'hover:text-blue-300',
    button: 'bg-blue-600 hover:bg-blue-500',
    focus: 'focus:border-blue-500', check: 'text-blue-600 focus:ring-blue-500',
    chip: 'border-blue-500/40 bg-blue-500/15 text-blue-300',
  },
  purple: {
    text: 'text-purple-400', hover: 'hover:text-purple-300',
    button: 'bg-purple-600 hover:bg-purple-500',
    focus: 'focus:border-purple-500', check: 'text-purple-600 focus:ring-purple-500',
    chip: 'border-purple-500/40 bg-purple-500/15 text-purple-300',
  },
} as const;

/** Any one of the accents above — not specifically the orange one. */
type Tone = (typeof ACCENTS)[keyof typeof ACCENTS];

const card = 'rounded-xl border border-[#2A2A2A] bg-[#0F0F0F] p-4';
const labelCls = 'mb-1.5 block text-xs font-semibold text-gray-400';

/* ── shared editors, so defaults and per-service overrides cannot drift ──── */

function HoursEditor({ hours, onChange, input, tone }: {
  hours: Hours; onChange: (h: Hours) => void; input: string; tone: Tone;
}) {
  const opt = 'bg-[#151515] text-white';
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className={labelCls}>Cover</label>
          <select value={hours.mode} onChange={e => onChange({ ...hours, mode: e.target.value as Hours['mode'] })} className={input}>
            <option className={opt} value="always">All the time</option>
            <option className={opt} value="outside-business-hours">Outside business hours</option>
            <option className={opt} value="custom">Specific hours</option>
          </select>
        </div>
        <div>
          <label className={labelCls}>Time zone</label>
          <select value={hours.timezone} onChange={e => onChange({ ...hours, timezone: e.target.value })} className={input}>
            {/* The stored zone is kept even if it is not one of ours, so opening
                this screen cannot silently move somebody's clock. */}
            {(ZONES.includes(hours.timezone) ? ZONES : [hours.timezone, ...ZONES]).map(z => (
              <option key={z} className={opt} value={z}>{z.replace(/_/g, ' ')}</option>
            ))}
          </select>
        </div>
      </div>

      {hours.mode === 'outside-business-hours' && (
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div>
            <label className={labelCls}>Business day opens</label>
            <input type="time" value={hours.businessOpen || '08:00'}
              onChange={e => onChange({ ...hours, businessOpen: e.target.value })} className={input} />
          </div>
          <div>
            <label className={labelCls}>Business day closes</label>
            <input type="time" value={hours.businessClose || '17:00'}
              onChange={e => onChange({ ...hours, businessClose: e.target.value })} className={input} />
          </div>
          <p className="text-xs text-gray-500 sm:col-span-2">
            Covers everything outside those hours, and the whole weekend.
          </p>
        </div>
      )}

      {hours.mode === 'custom' && (
        <div className="mt-3 space-y-2">
          {(hours.windows || []).map((w, i) => (
            <div key={i} className="flex flex-wrap items-center gap-2">
              <select value={w.day} className={`${input} w-auto`}
                onChange={e => onChange({
                  ...hours,
                  windows: (hours.windows || []).map((x, n) => (n === i ? { ...x, day: Number(e.target.value) } : x)),
                })}>
                {DAYS.map((d, n) => <option key={d} className={opt} value={n}>{d}</option>)}
              </select>
              <input type="time" value={w.from} className={`${input} w-auto`}
                onChange={e => onChange({
                  ...hours, windows: (hours.windows || []).map((x, n) => (n === i ? { ...x, from: e.target.value } : x)),
                })} />
              <span className="text-xs text-gray-500">to</span>
              <input type="time" value={w.to} className={`${input} w-auto`}
                onChange={e => onChange({
                  ...hours, windows: (hours.windows || []).map((x, n) => (n === i ? { ...x, to: e.target.value } : x)),
                })} />
              <button
                onClick={() => onChange({ ...hours, windows: (hours.windows || []).filter((_, n) => n !== i) })}
                className="rounded-lg p-2 text-gray-500 transition hover:bg-white/5 hover:text-red-400"
                aria-label="Remove this window">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
          <button
            onClick={() => onChange({ ...hours, windows: [...(hours.windows || []), { day: 1, from: '17:00', to: '08:00' }] })}
            className={`inline-flex items-center gap-1.5 text-xs font-semibold ${tone.text} ${tone.hover}`}>
            <Plus className="h-3.5 w-3.5" /> Add hours
          </button>
          <p className="text-xs text-gray-500">
            A window may run past midnight — 17:00 to 08:00 covers the night.
          </p>
        </div>
      )}
    </>
  );
}

function ExtrasEditor({ extras, onChange, input }: {
  extras: Extras; onChange: (e: Extras) => void; input: string;
}) {
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <label className={labelCls}>Callout</label>
          <input type="number" min={0} step="0.01" value={toDollars(extras.calloutCents) || ''}
            onChange={e => onChange({ ...extras, calloutCents: toCents(e.target.value) })}
            placeholder="0.00" className={input} />
        </div>
        <div>
          <label className={labelCls}>Out of hours, added</label>
          <input type="number" min={0} step="0.01" value={toDollars(extras.afterHoursCents) || ''}
            onChange={e => onChange({ ...extras, afterHoursCents: toCents(e.target.value) })}
            placeholder="0.00" className={input} />
        </div>
        <div>
          <label className={labelCls}>Hourly rate</label>
          <input type="number" min={0} step="0.01" value={toDollars(extras.hourlyCents) || ''}
            onChange={e => onChange({ ...extras, hourlyCents: toCents(e.target.value) })}
            placeholder="0.00" className={input} />
        </div>
        <div>
          <label className={labelCls}>Minimum hours</label>
          <input type="number" min={0} max={24} step="0.5" value={extras.minimumHours || ''}
            onChange={e => onChange({ ...extras, minimumHours: Number(e.target.value) || 0 })}
            placeholder="0" className={input} />
        </div>
      </div>
      <div className="mt-3">
        <label className={labelCls}>Anything else somebody should know</label>
        <textarea value={extras.notes || ''} rows={2}
          onChange={e => onChange({ ...extras, notes: e.target.value })}
          placeholder="Parking, key access, which door to use at night…" className={input} />
      </div>
    </>
  );
}

/* ── the screen ──────────────────────────────────────────────────────────── */

export default function OnCallSetup({ session, accent = 'orange' }: {
  session: any;
  accent?: keyof typeof ACCENTS;
}) {
  const tone = ACCENTS[accent] || ACCENTS.orange;
  const input = 'w-full rounded-lg border border-[#2A2A2A] bg-[#151515] px-3 py-2 text-sm text-white '
    + `placeholder-gray-600 outline-none ${tone.focus}`;

  const [config, setConfig] = useState<Config | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [state, setState] = useState<{
    readiness?: { ready: boolean; problems: string[] };
    coveringNow?: boolean;
    weAnswer?: boolean;
    services?: Array<{ id: string; name: string; coveringNow: boolean; ladderMinutes: number }>;
  }>({});

  const authHeaders = useMemo(
    () => (session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : null),
    [session?.access_token],
  );

  const take = (payload: any) => {
    setConfig(payload.config);
    setState({
      readiness: payload.readiness,
      coveringNow: payload.coveringNow,
      weAnswer: payload.weAnswer,
      services: payload.services,
    });
    setDirty(false);
  };

  const load = useCallback(async () => {
    if (!authHeaders) { setLoading(false); return; }
    setLoading(true);
    try {
      const res = await fetch(`${SERVER}/on-call`, { headers: authHeaders });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok || !payload?.success) throw new Error(payload?.error || 'Could not load your on-call setup.');
      take(payload);
    } catch (e: any) {
      toast.error(e?.message || 'Could not load your on-call setup.');
    } finally {
      setLoading(false);
    }
  }, [authHeaders]);

  useEffect(() => { void load(); }, [load]);

  /** Every edit goes through here, so nothing can change without marking unsaved. */
  const edit = (patch: Partial<Config> | ((c: Config) => Partial<Config>)) => {
    setConfig(prev => {
      if (!prev) return prev;
      return { ...prev, ...(typeof patch === 'function' ? patch(prev) : patch) };
    });
    setDirty(true);
  };

  const save = async () => {
    if (!config || !authHeaders) return;
    setSaving(true);
    try {
      const res = await fetch(`${SERVER}/on-call`, {
        method: 'PUT',
        headers: { ...authHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ config }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok || !payload?.success) throw new Error(payload?.error || 'Could not save your on-call setup.');
      // The server's cleaned version, not the one that was typed — it drops
      // rungs pointing at deleted people and clamps the waits, and the screen
      // should show what was actually stored.
      take(payload);
      if (payload.config.enabled && !payload.readiness?.ready) {
        toast.warning('Saved — but this cannot answer yet. See the note at the top.', { duration: 8000 });
      } else {
        toast.success('On-call setup saved.');
      }
    } catch (e: any) {
      toast.error(e?.message || 'Could not save your on-call setup.');
    } finally {
      setSaving(false);
    }
  };

  /* ── people ───────────────────────────────────────────────────────────── */

  const addContact = () => edit(c => ({
    contacts: [...c.contacts, { id: uid('c'), name: '', phone: '', role: '' }],
  }));

  /**
   * Removing somebody takes them off every rota as well.
   *
   * The server drops a rung pointing at a contact who no longer exists, so
   * leaving it here would be safe but dishonest: the screen would go on showing
   * a rung that will not survive the save.
   */
  const removeContact = (id: string) => edit(c => ({
    contacts: c.contacts.filter(x => x.id !== id),
    services: c.services.map(s => ({
      ...s,
      ladder: s.ladder
        .map(step => ({ ...step, contactIds: step.contactIds.filter(x => x !== id) }))
        .filter(step => step.contactIds.length > 0),
    })),
  }));

  const setContact = (id: string, patch: Partial<Contact>) => edit(c => ({
    contacts: c.contacts.map(x => (x.id === id ? { ...x, ...patch } : x)),
  }));

  /* ── services ─────────────────────────────────────────────────────────── */

  const setService = (id: string, patch: Partial<Service>) => edit(c => ({
    services: c.services.map(s => (s.id === id ? { ...s, ...patch } : s)),
  }));

  const addService = () => edit(c => ({
    services: [...c.services, {
      id: uid('s'),
      name: c.services.length === 0 ? 'Emergencies' : '',
      // The first one is the catch-all, because an account with a single
      // service almost always means "this handles everything".
      events: [], ladder: [], sendToExchange: false, enabled: true,
    }],
  }));

  const removeService = (id: string) => edit(c => ({ services: c.services.filter(s => s.id !== id) }));

  const setStep = (serviceId: string, i: number, patch: Partial<Step>) =>
    setService(serviceId, {
      ladder: (config?.services.find(s => s.id === serviceId)?.ladder || [])
        .map((s, n) => (n === i ? { ...s, ...patch } : s)),
    });

  const toggleOnStep = (serviceId: string, i: number, contactId: string) => edit(c => ({
    services: c.services.map(s => {
      if (s.id !== serviceId) return s;
      return {
        ...s,
        ladder: s.ladder.map((step, n) => {
          if (n !== i) return step;
          const on = step.contactIds.includes(contactId);
          return {
            ...step,
            contactIds: on ? step.contactIds.filter(x => x !== contactId) : [...step.contactIds, contactId],
          };
        }),
      };
    }),
  }));

  /* ── contracted vendors ───────────────────────────────────────────────── */

  const addVendor = () => edit(c => ({
    contractedVendors: [...c.contractedVendors, { trade: '', name: '', exclusive: false }],
  }));
  const setVendor = (i: number, patch: Partial<Vendor>) => edit(c => ({
    contractedVendors: c.contractedVendors.map((v, n) => (n === i ? { ...v, ...patch } : v)),
  }));
  const removeVendor = (i: number) => edit(c => ({
    contractedVendors: c.contractedVendors.filter((_, n) => n !== i),
  }));

  if (loading) {
    return (
      <div className="flex items-center gap-2 p-6 text-sm text-gray-400">
        <LoaderCircle className="h-4 w-4 animate-spin" /> Loading your on-call setup…
      </div>
    );
  }
  if (!config) {
    return <div className={card}><p className="text-sm text-gray-400">Sign in to set up on-call.</p></div>;
  }

  const SaveButton = () => (
    <button onClick={save} disabled={saving || !dirty}
      className={`inline-flex items-center gap-2 rounded-lg ${tone.button} px-4 py-2 text-sm font-bold text-white transition disabled:opacity-50`}>
      {saving ? <><LoaderCircle className="h-4 w-4 animate-spin" /> Saving…</> : <><Save className="h-4 w-4" /> Save</>}
    </button>
  );

  return (
    <div className="space-y-4">
      {/* ── header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-bold text-white">
            <PhoneCall className={`h-5 w-5 ${tone.text}`} /> On-call
          </h2>
          <p className="mt-1 text-sm text-gray-400">
            Who gets called when something goes wrong out of hours, and in what order.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {state.weAnswer && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-green-500/30 bg-green-500/15 px-2.5 py-1 text-xs font-semibold text-green-400">
              <ShieldCheck className="h-3.5 w-3.5" /> Black Phoenix answers for you
            </span>
          )}
          {config.enabled && state.coveringNow && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-500/30 bg-blue-500/15 px-2.5 py-1 text-xs font-semibold text-blue-400">
              <Radio className="h-3.5 w-3.5" /> Covering right now
            </span>
          )}
          <SaveButton />
        </div>
      </div>

      {/* ── the warning that must not be a field-level whisper ──────────── */}
      {config.enabled && state.readiness && !state.readiness.ready && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
          <p className="flex items-center gap-2 text-sm font-bold text-amber-400">
            <AlertTriangle className="h-4 w-4" /> This cannot answer an emergency yet
          </p>
          <ul className="mt-2 space-y-1 text-sm text-amber-200/90">
            {state.readiness.problems.map((p, i) => <li key={i}>• {p}</li>)}
          </ul>
        </div>
      )}
      {config.enabled && state.readiness?.ready && (
        <p className="flex items-center gap-2 text-sm text-green-400">
          <CheckCircle2 className="h-4 w-4" /> On-call is set up and can be reached.
        </p>
      )}

      {/* ── on or off ──────────────────────────────────────────────────── */}
      <div className={card}>
        <label className="flex cursor-pointer items-start gap-3">
          <input type="checkbox" checked={config.enabled}
            onChange={e => edit({ enabled: e.target.checked })}
            className={`mt-0.5 h-4 w-4 rounded border-[#2A2A2A] ${tone.check}`} />
          <span>
            <span className="text-sm font-semibold text-white">Run on-call for this account</span>
            <span className="mt-0.5 block text-xs text-gray-500">
              Off means an emergency goes straight to whoever you have chosen to escalate to.
            </span>
          </span>
        </label>
      </div>

      {/* ── people ─────────────────────────────────────────────────────── */}
      <div className={card}>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-sm font-bold text-white">
            <Users className={`h-4 w-4 ${tone.text}`} /> Who can be called
          </h3>
          <button onClick={addContact} className={`inline-flex items-center gap-1.5 text-xs font-semibold ${tone.text} ${tone.hover}`}>
            <Plus className="h-3.5 w-3.5" /> Add someone
          </button>
        </div>
        {config.contacts.length === 0 ? (
          <p className="text-sm text-gray-500">Nobody yet. Add the people who answer out of hours.</p>
        ) : (
          <div className="space-y-2">
            {config.contacts.map(person => (
              <div key={person.id} className="grid gap-2 rounded-lg border border-[#2A2A2A] bg-[#151515] p-3 sm:grid-cols-[1fr_1fr_1fr_auto]">
                <input value={person.name} onChange={e => setContact(person.id, { name: e.target.value })}
                  placeholder="Name" className={input} />
                <input value={person.phone} onChange={e => setContact(person.id, { phone: e.target.value })}
                  placeholder="Mobile number" className={input} />
                <input value={person.role || ''} onChange={e => setContact(person.id, { role: e.target.value })}
                  placeholder="Plumber, site manager…" className={input} />
                <button onClick={() => removeContact(person.id)}
                  className="rounded-lg p-2 text-gray-500 transition hover:bg-white/5 hover:text-red-400"
                  aria-label={`Remove ${person.name || 'this person'}`}>
                  <Trash2 className="h-4 w-4" />
                </button>
                {!person.phone && (
                  <p className="text-xs text-amber-400 sm:col-span-4">Without a number this person cannot be called.</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── the services ───────────────────────────────────────────────── */}
      <div className={card}>
        <div className="mb-1 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-sm font-bold text-white">
            <Siren className={`h-4 w-4 ${tone.text}`} /> On-call services
          </h3>
          <button onClick={addService} className={`inline-flex items-center gap-1.5 text-xs font-semibold ${tone.text} ${tone.hover}`}>
            <Plus className="h-3.5 w-3.5" /> Add a service
          </button>
        </div>
        <p className="mb-3 text-xs text-gray-500">
          A burst pipe and a tenant locked out do not wake the same person. Set up one service
          per kind of emergency — each with its own rota.
        </p>

        {config.services.length === 0 ? (
          <p className="text-sm text-amber-400">
            No services yet, so an emergency would reach no one here.
          </p>
        ) : (
          <div className="space-y-3">
            {config.services.map(service => {
              const live = state.services?.find(s => s.id === service.id);
              const running = service.ladder.reduce<number[]>((acc, s, i) => {
                acc.push((acc[i - 1] || 0) + (Number(s.waitMinutes) || 0));
                return acc;
              }, []);
              return (
                <div key={service.id} className="rounded-xl border border-[#2A2A2A] bg-[#151515] p-4">
                  {/* name, events, on/off */}
                  <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
                    <div>
                      <label className={labelCls}>Service name</label>
                      <input value={service.name} onChange={e => setService(service.id, { name: e.target.value })}
                        placeholder="Plumbing, lockouts, lifts…" className={input} />
                    </div>
                    <div>
                      <label className={labelCls}>Trades it covers</label>
                      <input
                        value={(service.events || []).join(', ')}
                        onChange={e => setService(service.id, {
                          events: e.target.value.split(',').map(x => x.trim()).filter(Boolean),
                        })}
                        placeholder="Leave empty for everything else" className={input} />
                    </div>
                    <div className="flex items-end gap-1 pb-1">
                      <label className="flex cursor-pointer items-center gap-1.5 text-xs text-gray-400">
                        <input type="checkbox" checked={service.enabled !== false}
                          onChange={e => setService(service.id, { enabled: e.target.checked })}
                          className={`h-4 w-4 rounded border-[#2A2A2A] ${tone.check}`} />
                        On
                      </label>
                      <button onClick={() => removeService(service.id)}
                        className="rounded-lg p-2 text-gray-500 transition hover:bg-white/5 hover:text-red-400"
                        aria-label={`Remove ${service.name || 'this service'}`}>
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  {(service.events || []).length === 0 && (
                    <p className="mt-1 text-xs text-gray-500">
                      This one answers anything no other service claims.
                    </p>
                  )}
                  {live?.coveringNow && (
                    <p className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-blue-400">
                      <Radio className="h-3.5 w-3.5" /> Covering right now
                    </p>
                  )}

                  {/* the rota */}
                  <div className="mt-3 border-t border-[#2A2A2A] pt-3">
                    <div className="mb-2 flex items-center justify-between">
                      <p className="text-xs font-bold uppercase tracking-wide text-gray-400">Who is called, in order</p>
                      <button
                        onClick={() => setService(service.id, { ladder: [...service.ladder, { contactIds: [], waitMinutes: 10 }] })}
                        disabled={config.contacts.length === 0}
                        className={`inline-flex items-center gap-1.5 text-xs font-semibold ${tone.text} ${tone.hover} disabled:opacity-40`}>
                        <Plus className="h-3.5 w-3.5" /> Add a step
                      </button>
                    </div>

                    {config.contacts.length === 0 ? (
                      <p className="text-sm text-gray-500">Add somebody above first.</p>
                    ) : service.ladder.length === 0 ? (
                      <p className="text-sm text-amber-400">Nobody on this rota — these calls would reach no one.</p>
                    ) : (
                      <div className="space-y-2">
                        {service.ladder.map((step, i) => (
                          <div key={i} className="rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] p-3">
                            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                              <span className="text-xs font-bold uppercase tracking-wide text-gray-400">
                                Step {i + 1}
                                <span className="ml-2 font-normal normal-case text-gray-600">
                                  {i === 0 ? 'called immediately' : `after ${running[i - 1]} min`}
                                </span>
                              </span>
                              <div className="flex items-center gap-2">
                                <label className="text-xs text-gray-500">Wait</label>
                                <input type="number" min={1} max={120} value={step.waitMinutes}
                                  onChange={e => setStep(service.id, i, {
                                    waitMinutes: Math.min(120, Math.max(1, Number(e.target.value) || 1)),
                                  })}
                                  className={`${input} w-20`} />
                                <span className="text-xs text-gray-500">min</span>
                                <button
                                  onClick={() => setService(service.id, { ladder: service.ladder.filter((_, n) => n !== i) })}
                                  className="rounded-lg p-2 text-gray-500 transition hover:bg-white/5 hover:text-red-400"
                                  aria-label={`Remove step ${i + 1}`}>
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {config.contacts.map(person => {
                                const on = step.contactIds.includes(person.id);
                                return (
                                  <button key={person.id} onClick={() => toggleOnStep(service.id, i, person.id)}
                                    className={`rounded-full border px-2.5 py-1 text-xs font-semibold transition ${
                                      on ? tone.chip : 'border-[#2A2A2A] text-gray-500 hover:text-white'
                                    }`}>
                                    {person.name || 'Unnamed'}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* where it goes when nobody answers */}
                  <label className="mt-3 flex cursor-pointer items-start gap-2 border-t border-[#2A2A2A] pt-3">
                    <input type="checkbox" checked={service.sendToExchange}
                      onChange={e => setService(service.id, { sendToExchange: e.target.checked })}
                      className={`mt-0.5 h-4 w-4 rounded border-[#2A2A2A] ${tone.check}`} />
                    <span className="text-xs text-gray-400">
                      <span className="inline-flex items-center gap-1.5 font-semibold text-white">
                        <Share2 className="h-3.5 w-3.5" /> Put it out to Phoenix Exchange if nobody answers
                      </span>
                      <span className="mt-0.5 block">
                        Subscribed contractors can take the job
                        {service.ladder.length > 0 && ` after the ${running[running.length - 1]} minutes above`}.
                        Use this where you would rather have somebody than wait.
                      </span>
                    </span>
                  </label>

                  {/* optional overrides, folded away until wanted */}
                  <div className="mt-3 space-y-2 border-t border-[#2A2A2A] pt-3">
                    <label className="flex cursor-pointer items-center gap-2 text-xs text-gray-400">
                      <input type="checkbox" checked={Boolean(service.hours)}
                        onChange={e => setService(service.id, {
                          hours: e.target.checked ? { ...config.hours } : undefined,
                        })}
                        className={`h-4 w-4 rounded border-[#2A2A2A] ${tone.check}`} />
                      This service keeps different hours from the rest
                    </label>
                    {service.hours && (
                      <div className="rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] p-3">
                        <HoursEditor hours={service.hours} input={input} tone={tone}
                          onChange={h => setService(service.id, { hours: h })} />
                      </div>
                    )}

                    <label className="flex cursor-pointer items-center gap-2 text-xs text-gray-400">
                      <input type="checkbox" checked={Boolean(service.extras)}
                        onChange={e => setService(service.id, {
                          extras: e.target.checked ? { ...config.extras } : undefined,
                        })}
                        className={`h-4 w-4 rounded border-[#2A2A2A] ${tone.check}`} />
                      This service is charged differently
                    </label>
                    {service.extras && (
                      <div className="rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] p-3">
                        <ExtrasEditor extras={service.extras} input={input}
                          onChange={x => setService(service.id, { extras: x })} />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── default hours ──────────────────────────────────────────────── */}
      <div className={card}>
        <h3 className="mb-1 flex items-center gap-2 text-sm font-bold text-white">
          <Clock className={`h-4 w-4 ${tone.text}`} /> When on-call covers
        </h3>
        <p className="mb-3 text-xs text-gray-500">
          Used by every service that has not set its own.
        </p>
        <HoursEditor hours={config.hours} input={input} tone={tone} onChange={h => edit({ hours: h })} />
      </div>

      {/* ── contracted vendors ─────────────────────────────────────────── */}
      <div className={card}>
        <div className="mb-1 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-sm font-bold text-white">
            <Handshake className={`h-4 w-4 ${tone.text}`} /> Contractors you already use
          </h3>
          <button onClick={addVendor} className={`inline-flex items-center gap-1.5 text-xs font-semibold ${tone.text} ${tone.hover}`}>
            <Plus className="h-3.5 w-3.5" /> Add one
          </button>
        </div>
        <p className="mb-3 text-xs text-gray-500">
          If you have somebody under contract for a trade, emergencies in that trade go to them.
        </p>
        {config.contractedVendors.length === 0 ? (
          <p className="text-sm text-gray-500">None listed.</p>
        ) : (
          <div className="space-y-2">
            {config.contractedVendors.map((v, i) => (
              <div key={i} className="rounded-lg border border-[#2A2A2A] bg-[#151515] p-3">
                <div className="grid gap-2 sm:grid-cols-[1fr_1fr_1fr_auto]">
                  <input value={v.trade} onChange={e => setVendor(i, { trade: e.target.value })}
                    placeholder="Trade — plumbing, roofing…" className={input} />
                  <input value={v.name} onChange={e => setVendor(i, { name: e.target.value })}
                    placeholder="Company" className={input} />
                  <input value={v.phone || ''} onChange={e => setVendor(i, { phone: e.target.value })}
                    placeholder="Phone" className={input} />
                  <button onClick={() => removeVendor(i)}
                    className="rounded-lg p-2 text-gray-500 transition hover:bg-white/5 hover:text-red-400"
                    aria-label={`Remove ${v.name || 'this contractor'}`}>
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <label className="mt-2 flex cursor-pointer items-start gap-2">
                  <input type="checkbox" checked={v.exclusive}
                    onChange={e => setVendor(i, { exclusive: e.target.checked })}
                    className={`mt-0.5 h-4 w-4 rounded border-[#2A2A2A] ${tone.check}`} />
                  <span className="text-xs text-gray-400">
                    <span className="font-semibold text-white">They get this work exclusively.</span>{' '}
                    {/* Said in full because it is the one setting here that
                        overrides everything else, including our own rota. */}
                    Work in this trade goes only to them — not to Black Phoenix, and never out
                    to other contractors on the exchange.
                  </span>
                </label>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── default rates ──────────────────────────────────────────────── */}
      <div className={card}>
        <h3 className="mb-1 flex items-center gap-2 text-sm font-bold text-white">
          <Wallet className={`h-4 w-4 ${tone.text}`} /> What a callout costs
        </h3>
        <p className="mb-3 text-xs text-gray-500">
          Charged per call, on top of the subscription, for every service that has not set its
          own. Leave a figure blank and it is not charged.
        </p>
        <ExtrasEditor extras={config.extras || BLANK_EXTRAS} input={input} onChange={x => edit({ extras: x })} />
      </div>

      {/* ── escalation ─────────────────────────────────────────────────── */}
      <div className={card}>
        <label className="flex cursor-pointer items-start gap-3">
          <input type="checkbox" checked={config.escalateToPlatform}
            onChange={e => edit({ escalateToPlatform: e.target.checked })}
            className={`mt-0.5 h-4 w-4 rounded border-[#2A2A2A] ${tone.check}`} />
          <span>
            <span className="text-sm font-semibold text-white">
              If nobody here answers, send it to Black Phoenix
            </span>
            <span className="mt-0.5 block text-xs text-gray-500">
              We pick it up, or put it out to contractors on the exchange. Turn this off and an
              emergency nobody answers stops with your own rotas.
            </span>
          </span>
        </label>
      </div>

      {/* Repeated at the bottom: this is a long form and the save at the top
          scrolls away exactly when somebody has finished filling it in. */}
      <div className="flex items-center justify-end gap-3">
        {dirty && <span className="text-xs text-amber-400">Unsaved changes</span>}
        <SaveButton />
      </div>
    </div>
  );
}
