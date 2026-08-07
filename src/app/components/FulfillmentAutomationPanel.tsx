/**
 * Auto-fulfillment controls for the Orders page.
 *
 * Backed by /store/fulfillment/settings, /store/fulfillment/run and
 * /store/fulfillment/tick. Nothing here is simulated — the mode is persisted
 * server-side and is what decides whether a paid order is forwarded to the
 * supplier immediately, batched daily, or left for the operator.
 *
 * On mount it pings /tick, which is what actually drives "daily" mode: this
 * runtime has no cron, so the sweep runs the first time the page is opened
 * after the day's window opens. The panel says so rather than implying a timer.
 */
import { useState, useEffect } from 'react';
import { Zap, CalendarClock, Hand, Play, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { publicAnonKey, projectId } from '../utils/supabase/info';

const SERVER = `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6`;

type Mode = 'instant' | 'daily' | 'manual';

interface Settings {
  mode: Mode;
  dailyHourUtc: number;
  lastRunAt?: string;
  lastRunReason?: string;
  lastRunForwarded?: number;
  lastRunFailed?: number;
  lastRunErrors?: string[];
}

const MODES: { id: Mode; label: string; blurb: string; icon: any; color: string }[] = [
  { id: 'instant', label: 'Instant',  blurb: 'Send to the supplier the second payment clears.', icon: Zap,           color: '#4ade80' },
  { id: 'daily',   label: 'Daily',    blurb: 'Batch every unsent paid order once a day.',       icon: CalendarClock, color: '#60a5fa' },
  { id: 'manual',  label: 'Manual',   blurb: 'Nothing goes out until you send it.',             icon: Hand,          color: '#fbbf24' },
];

async function authHeaders(): Promise<Record<string, string>> {
  const { supabase } = await import('../lib/supabase');
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('Sign in as an administrator to manage fulfillment.');
  return { apikey: publicAnonKey, Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' };
}

/** "13" (UTC) → "13:00 UTC · 8:00 AM your time" */
function describeHour(hourUtc: number): string {
  const d = new Date();
  d.setUTCHours(hourUtc, 0, 0, 0);
  const local = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  return `${String(hourUtc).padStart(2, '0')}:00 UTC · ${local} your time`;
}

interface Props {
  /** Called after a sweep so the order list can refresh. */
  onOrdersChanged?: () => void;
}

export default function FulfillmentAutomationPanel({ onOrdersChanged }: Props) {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);

  async function load() {
    try {
      const res = await fetch(`${SERVER}/store/fulfillment/settings`, { headers: await authHeaders() });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || `Could not load fulfillment settings (${res.status}).`);
      setSettings(data.settings);
      setPendingCount(data.pendingCount ?? 0);
      setLoadError(null);
    } catch (err: any) {
      setLoadError(err?.message || 'Could not load fulfillment settings.');
    }
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await load();
      if (cancelled) return;
      // Drive "daily" mode. No-ops unless the day's window has opened.
      try {
        const res = await fetch(`${SERVER}/store/fulfillment/tick`, { method: 'POST', headers: await authHeaders() });
        const data = await res.json().catch(() => null);
        if (res.ok && data?.ran && !cancelled) {
          toast.success(`Daily fulfillment run: ${data.forwarded} order(s) sent to suppliers.`);
          onOrdersChanged?.();
          void load();
        }
      } catch (err) {
        console.error('[FulfillmentAutomationPanel] daily tick failed:', err);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function save(next: Partial<Settings>) {
    if (!settings) return;
    const merged = { ...settings, ...next };
    setSaving(true);
    try {
      const res = await fetch(`${SERVER}/store/fulfillment/settings`, {
        method: 'PUT',
        headers: await authHeaders(),
        body: JSON.stringify({ mode: merged.mode, dailyHourUtc: merged.dailyHourUtc }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) throw new Error(data?.error || `Could not save fulfillment settings (${res.status}).`);
      setSettings(data.settings);
      toast.success('Fulfillment settings saved');
    } catch (err: any) {
      console.error('[FulfillmentAutomationPanel] save failed:', err);
      toast.error(err?.message || 'Could not save fulfillment settings.');
    }
    setSaving(false);
  }

  async function runNow() {
    setRunning(true);
    try {
      const res = await fetch(`${SERVER}/store/fulfillment/run`, { method: 'POST', headers: await authHeaders() });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) throw new Error(data?.error || `The fulfillment run failed (${res.status}).`);
      if (data.examined === 0) toast.info('No paid orders are waiting to be sent.');
      else if (data.failed > 0) toast.error(`${data.forwarded} sent, ${data.failed} failed. See the details below.`);
      else toast.success(`${data.forwarded} order(s) sent to suppliers.`);
      setSettings(data.settings);
      onOrdersChanged?.();
      void load();
    } catch (err: any) {
      console.error('[FulfillmentAutomationPanel] run failed:', err);
      toast.error(err?.message || 'The fulfillment run failed.');
    }
    setRunning(false);
  }

  if (loadError) {
    return (
      <div className="rounded-2xl p-5 flex items-start gap-3" style={{ background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.2)' }}>
        <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-black text-amber-400 text-sm">Auto-fulfillment unavailable</p>
          <p className="text-xs text-gray-400 mt-1">{loadError}</p>
        </div>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="rounded-2xl p-5" style={{ background: '#111', border: '1px solid rgba(255,255,255,0.07)' }}>
        <p className="text-sm text-gray-500">Loading fulfillment settings…</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl p-5 space-y-4" style={{ background: '#111', border: '1px solid rgba(255,255,255,0.07)' }}>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <p className="font-black text-white">Auto-fulfillment</p>
          <p className="text-xs text-gray-500 mt-0.5">
            When paid orders get forwarded to your dropship suppliers.
          </p>
        </div>
        <button
          onClick={runNow}
          disabled={running}
          className="flex items-center gap-2 px-4 py-2 rounded-xl font-black text-sm text-white hover:brightness-110 transition disabled:opacity-50"
          style={{ background: '#ea580c' }}
        >
          <Play className={`w-4 h-4 ${running ? 'animate-pulse' : ''}`} />
          {running ? 'Sending…' : `Run now${pendingCount > 0 ? ` (${pendingCount})` : ''}`}
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {MODES.map(m => {
          const active = settings.mode === m.id;
          return (
            <button
              key={m.id}
              onClick={() => save({ mode: m.id })}
              disabled={saving}
              className="text-left rounded-xl p-3 transition hover:brightness-110 disabled:opacity-50"
              style={{
                background: active ? `${m.color}14` : '#161616',
                border: `1px solid ${active ? `${m.color}55` : 'rgba(255,255,255,0.07)'}`,
              }}
            >
              <div className="flex items-center gap-2">
                <m.icon className="w-4 h-4" style={{ color: m.color }} />
                <span className="text-sm font-black" style={{ color: active ? m.color : 'white' }}>{m.label}</span>
                {active && <CheckCircle2 className="w-3.5 h-3.5 ml-auto" style={{ color: m.color }} />}
              </div>
              <p className="text-[11px] text-gray-500 mt-1.5 leading-snug">{m.blurb}</p>
            </button>
          );
        })}
      </div>

      {settings.mode === 'daily' && (
        <div className="rounded-xl p-3 space-y-2" style={{ background: '#161616', border: '1px solid rgba(255,255,255,0.07)' }}>
          <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Daily run time</label>
          <select
            value={settings.dailyHourUtc}
            onChange={e => save({ dailyHourUtc: Number(e.target.value) })}
            disabled={saving}
            className="w-full px-3 py-2 rounded-lg text-sm text-white focus:outline-none disabled:opacity-50"
            style={{ background: '#0d0d0d', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            {Array.from({ length: 24 }, (_, h) => (
              <option key={h} value={h}>{describeHour(h)}</option>
            ))}
          </select>
          <p className="text-[11px] text-gray-500 leading-snug">
            There is no background scheduler on this plan, so the batch runs the first time
            this page is opened after the window opens each day. Use <strong className="text-gray-400">Run now</strong> if
            you need it sooner.
          </p>
        </div>
      )}

      {settings.lastRunAt && (
        <div className="text-xs text-gray-500 space-y-1 pt-1 border-t" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
          <p className="pt-2">
            Last run {new Date(settings.lastRunAt).toLocaleString()} ({settings.lastRunReason || 'unknown trigger'}) —{' '}
            <span className="text-green-400 font-black">{settings.lastRunForwarded ?? 0} sent</span>
            {(settings.lastRunFailed ?? 0) > 0 && (
              <>, <span className="text-red-400 font-black">{settings.lastRunFailed} failed</span></>
            )}
          </p>
          {settings.lastRunErrors && settings.lastRunErrors.length > 0 && (
            <ul className="space-y-0.5 mt-1">
              {settings.lastRunErrors.map((e, i) => (
                <li key={i} className="text-[11px] text-red-400/80 leading-snug">• {e}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
