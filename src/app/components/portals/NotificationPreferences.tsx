import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { BellRing, LoaderCircle, Mail, MessageCircle, Monitor } from 'lucide-react';
import { projectId } from '../../utils/supabase/info';

const SERVER = `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6`;

type Channel = 'email' | 'sms' | 'inApp';
interface EventPref { email: boolean; sms: boolean; inApp: boolean; }

export default function NotificationPreferences({ session, accent = 'teal' }: { session: any; accent?: 'teal' | 'indigo' }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [events, setEvents] = useState<string[]>([]);
  const [labels, setLabels] = useState<Record<string, string>>({});
  const [prefs, setPrefs] = useState<{ phone: string; events: Record<string, EventPref> }>({ phone: '', events: {} });

  const authHeaders = session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : undefined;
  const btn = accent === 'indigo' ? 'bg-indigo-600 hover:bg-indigo-500' : 'bg-teal-600 hover:bg-teal-500';
  const on = accent === 'indigo' ? 'bg-indigo-600' : 'bg-teal-600';

  useEffect(() => {
    const load = async () => {
      if (!authHeaders) { setLoading(false); return; }
      setLoading(true);
      try {
        const res = await fetch(`${SERVER}/me/notification-prefs`, { headers: authHeaders });
        const payload = await res.json().catch(() => ({}));
        if (!res.ok || !payload?.success) throw new Error(payload?.error || 'Unable to load settings.');
        setEvents(payload.events || []);
        setLabels(payload.labels || {});
        setPrefs({ phone: payload.prefs?.phone || '', events: payload.prefs?.events || {} });
      } catch (error: any) { toast.error(error?.message || 'Unable to load notification settings.'); }
      finally { setLoading(false); }
    };
    void load();
  }, [session?.access_token]);

  const toggle = (evt: string, ch: Channel) => {
    setPrefs(p => {
      const cur = p.events[evt] || { email: true, sms: true, inApp: true };
      return { ...p, events: { ...p.events, [evt]: { ...cur, [ch]: !cur[ch] } } };
    });
  };

  const save = async () => {
    if (!authHeaders) return;
    setSaving(true);
    try {
      const res = await fetch(`${SERVER}/me/notification-prefs`, {
        method: 'PUT',
        headers: { ...authHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: prefs.phone, events: prefs.events }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok || !payload?.success) throw new Error(payload?.error || 'Unable to save settings.');
      toast.success('Notification settings saved.');
    } catch (error: any) { toast.error(error?.message || 'Unable to save notification settings.'); }
    finally { setSaving(false); }
  };

  const Toggle = ({ evt, ch }: { evt: string; ch: Channel }) => {
    const val = (prefs.events[evt] || { email: true, sms: true, inApp: true })[ch];
    return (
      <button type="button" onClick={() => toggle(evt, ch)} className={`relative inline-flex h-5 w-9 flex-shrink-0 items-center rounded-full transition ${val ? on : 'bg-[#333]'}`} aria-pressed={val}>
        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${val ? 'translate-x-4' : 'translate-x-0.5'}`} />
      </button>
    );
  };

  if (loading) {
    return <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6 flex items-center gap-2 text-sm text-gray-400"><LoaderCircle className="h-4 w-4 animate-spin" /> Loading notification settings…</div>;
  }

  return (
    <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6 space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-white/5 border border-[#2A2A2A] flex items-center justify-center"><BellRing className="w-5 h-5 text-gray-300" /></div>
        <div>
          <p className="font-bold">Notifications</p>
          <p className="text-xs text-gray-400">Choose how you're notified for each event.</p>
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-gray-400 mb-1.5">Mobile number (for SMS alerts)</label>
        <input value={prefs.phone} onChange={e => setPrefs(p => ({ ...p, phone: e.target.value }))} placeholder="+1 555 123 4567"
          className="w-full bg-[#0A0A0A] border border-[#2A2A2A] focus:border-teal-500 rounded-lg px-4 py-2.5 text-white text-sm outline-none" />
        <p className="mt-1 text-[11px] text-gray-500">SMS requires a valid mobile number. Leave blank to disable texts.</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-gray-500">
              <th className="pb-2 text-left font-semibold">Event</th>
              <th className="pb-2 px-2"><span className="inline-flex items-center gap-1 justify-center text-xs"><Monitor className="h-3.5 w-3.5" /> In-app</span></th>
              <th className="pb-2 px-2"><span className="inline-flex items-center gap-1 justify-center text-xs"><Mail className="h-3.5 w-3.5" /> Email</span></th>
              <th className="pb-2 px-2"><span className="inline-flex items-center gap-1 justify-center text-xs"><MessageCircle className="h-3.5 w-3.5" /> SMS</span></th>
            </tr>
          </thead>
          <tbody>
            {events.map(evt => (
              <tr key={evt} className="border-t border-[#2A2A2A]">
                <td className="py-3 pr-3 text-gray-200">{labels[evt] || evt}</td>
                <td className="py-3 px-2 text-center"><div className="flex justify-center"><Toggle evt={evt} ch="inApp" /></div></td>
                <td className="py-3 px-2 text-center"><div className="flex justify-center"><Toggle evt={evt} ch="email" /></div></td>
                <td className="py-3 px-2 text-center"><div className="flex justify-center"><Toggle evt={evt} ch="sms" /></div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button onClick={save} disabled={saving} className={`inline-flex items-center gap-2 px-6 py-2.5 ${btn} text-white rounded-lg text-sm font-bold transition disabled:opacity-60`}>
        {saving ? <><LoaderCircle className="h-4 w-4 animate-spin" /> Saving…</> : 'Save notification settings'}
      </button>
    </div>
  );
}
