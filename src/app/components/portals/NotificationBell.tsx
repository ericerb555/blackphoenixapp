import { useState, useEffect, useRef } from 'react';
import { Bell, X, CheckCheck, LoaderCircle, Trash2 } from 'lucide-react';
import { projectId } from '../../utils/supabase/info';

const SERVER = `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6`;

interface Notif { id: string; event: string; title: string; body: string; read: boolean; createdAt: string; }

function timeAgo(iso: string) {
  const d = new Date(iso).getTime();
  const s = Math.max(0, Math.floor((Date.now() - d) / 1000));
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60); if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60); if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24); if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

export default function NotificationBell({ session, accent = 'teal' }: { session: any; accent?: 'teal' | 'indigo' }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notif[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  const authHeaders = session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : undefined;
  const dot = accent === 'indigo' ? 'bg-indigo-500' : 'bg-teal-500';
  const activeText = accent === 'indigo' ? 'text-indigo-400' : 'text-teal-400';

  const load = async () => {
    if (!authHeaders) return;
    setLoading(true);
    try {
      const res = await fetch(`${SERVER}/me/notifications`, { headers: authHeaders });
      const payload = await res.json().catch(() => ({}));
      if (res.ok && payload?.success) { setItems(payload.notifications || []); setUnread(payload.unread || 0); }
    } catch { /* silent */ }
    finally { setLoading(false); }
  };

  useEffect(() => { void load(); }, [session?.access_token]);
  // Light polling so the badge stays fresh while the portal is open.
  useEffect(() => {
    if (!authHeaders) return;
    const t = setInterval(() => { void load(); }, 60000);
    return () => clearInterval(t);
  }, [session?.access_token]);

  // Close on outside click.
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  const toggle = () => { const next = !open; setOpen(next); if (next) void load(); };

  const markAllRead = async () => {
    if (!authHeaders || unread === 0) return;
    setItems(prev => prev.map(n => ({ ...n, read: true }))); setUnread(0);
    try { await fetch(`${SERVER}/me/notifications/read`, { method: 'POST', headers: { ...authHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ ids: [] }) }); } catch { /* silent */ }
  };

  const clearAll = async () => {
    if (!authHeaders) return;
    setItems([]); setUnread(0);
    try { await fetch(`${SERVER}/me/notifications/clear`, { method: 'POST', headers: authHeaders }); } catch { /* silent */ }
  };

  return (
    <div className="relative" ref={ref}>
      <button onClick={toggle} className="relative p-2 rounded-lg bg-[#0A0A0A] border border-[#2A2A2A] text-gray-400 hover:text-white transition" aria-label="Notifications">
        <Bell className={`w-5 h-5 ${unread > 0 ? activeText : ''}`} />
        {unread > 0 && <span className={`absolute -top-1 -right-1 min-w-[16px] h-4 px-1 ${dot} rounded-full text-[9px] font-black text-white flex items-center justify-center`}>{unread > 9 ? '9+' : unread}</span>}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-[#2A2A2A] bg-[#151515] shadow-2xl">
          <div className="flex items-center justify-between border-b border-[#2A2A2A] px-4 py-3">
            <p className="text-sm font-bold text-white">Notifications</p>
            <div className="flex items-center gap-1">
              <button onClick={markAllRead} disabled={unread === 0} title="Mark all read" className="rounded-md p-1.5 text-gray-400 transition hover:text-white disabled:opacity-30"><CheckCheck className="h-4 w-4" /></button>
              <button onClick={clearAll} disabled={items.length === 0} title="Clear all" className="rounded-md p-1.5 text-gray-400 transition hover:text-red-400 disabled:opacity-30"><Trash2 className="h-4 w-4" /></button>
              <button onClick={() => setOpen(false)} className="rounded-md p-1.5 text-gray-400 transition hover:text-white"><X className="h-4 w-4" /></button>
            </div>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {loading && items.length === 0 ? (
              <div className="flex items-center justify-center gap-2 py-8 text-sm text-gray-500"><LoaderCircle className="h-4 w-4 animate-spin" /> Loading…</div>
            ) : items.length === 0 ? (
              <div className="py-10 text-center text-sm text-gray-500"><Bell className="mx-auto mb-2 h-8 w-8 text-gray-700" />You're all caught up.</div>
            ) : items.map(n => (
              <div key={n.id} className={`border-b border-[#222] px-4 py-3 ${n.read ? '' : 'bg-white/[0.03]'}`}>
                <div className="flex items-start gap-2">
                  {!n.read && <span className={`mt-1.5 h-2 w-2 flex-shrink-0 rounded-full ${dot}`} />}
                  <div className={`min-w-0 ${n.read ? 'pl-4' : ''}`}>
                    <p className="text-sm font-semibold text-white">{n.title}</p>
                    <p className="mt-0.5 line-clamp-3 whitespace-pre-wrap text-xs text-gray-400">{n.body}</p>
                    <p className="mt-1 text-[10px] uppercase tracking-wide text-gray-600">{timeAgo(n.createdAt)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
