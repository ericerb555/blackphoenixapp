/**
 * Mint a junk pricing link, copy it, text it, revoke it.
 *
 * Eric, 2026-11-16: *"also can we create a link to the junk pricing tool i can
 * text?"* and *"and put it into the portals."*
 *
 * THE TOKEN IS SHOWN ONCE AND THEN IT IS GONE
 *
 * Only its hash is stored, so this screen is the single moment the link exists
 * in readable form. That is deliberate — a link recoverable from the store is a
 * link recoverable by anything that can read the store — but it makes the copy
 * button the most important control here rather than a convenience, which is
 * why the fresh link gets its own block at the top and says so out loud.
 *
 * WHY AN SMS LINK AND NOT JUST A COPY BUTTON
 *
 * The thing Eric asked for is a link he can text, and on a phone `sms:` hands
 * the link straight to the messaging app with the body already written. On a
 * desktop it does nothing useful, so the copy button stays as the one control
 * that always works.
 */
import { useEffect, useState } from 'react';
import { Link2, Copy, CheckCircle2, Ban, Loader2, MessageSquare, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { authedHeaders } from '../../utils/authHeaders';
import { API_BASE_URL } from '../../lib/apiConfig';

const SERVER = `${API_BASE_URL}/make-server-3eae23a6`;

interface LinkRow {
  id: string;
  label: string;
  createdBy: string;
  createdAt: string;
  expiresAt: string;
  lastUsedAt: string | null;
  uses: number;
  maxUses: number;
  usable: boolean;
  reason: string | null;
}

const shortDate = (iso: string) => (iso ? String(iso).slice(0, 10) : '—');

export default function JunkLinksPanel() {
  const [links, setLinks] = useState<LinkRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [minting, setMinting] = useState(false);
  const [label, setLabel] = useState('');
  /** The one and only time the token is readable. Never refetched. */
  const [fresh, setFresh] = useState<{ url: string; expiresAt: string; maxUses: number } | null>(null);
  const [copied, setCopied] = useState(false);

  const load = async () => {
    try {
      const res = await fetch(`${SERVER}/trash-estimator/links`, { headers: await authedHeaders() });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Could not load the links.');
      setLinks(json.links || []);
    } catch (err: any) {
      console.error('[JunkLinksPanel]', err);
      toast.error(err?.message || 'Could not load the pricing links.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const mint = async () => {
    setMinting(true);
    try {
      const res = await fetch(`${SERVER}/trash-estimator/links`, {
        method: 'POST',
        headers: await authedHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ label: label.trim() }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Could not create a link.');
      setFresh({ url: json.url, expiresAt: json.expiresAt, maxUses: json.maxUses });
      setCopied(false);
      setLabel('');
      await load();
    } catch (err: any) {
      console.error('[JunkLinksPanel] mint', err);
      toast.error(err?.message || 'Could not create a link.');
    } finally {
      setMinting(false);
    }
  };

  const copy = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success('Link copied.');
    } catch {
      // Clipboard is blocked in some in-app browsers. The input below is
      // selectable, so say that rather than failing silently.
      toast.error('Could not copy — select the link and copy it by hand.');
    }
  };

  const revoke = async (id: string) => {
    try {
      const res = await fetch(`${SERVER}/trash-estimator/links/${encodeURIComponent(id)}/revoke`, {
        method: 'POST',
        headers: await authedHeaders({ 'Content-Type': 'application/json' }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Could not revoke it.');
      toast.success('That link will not work again.');
      await load();
    } catch (err: any) {
      console.error('[JunkLinksPanel] revoke', err);
      toast.error(err?.message || 'Could not revoke that link.');
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl p-5" style={{ background: '#0d0d0d', border: '1px solid #2a2a2a' }}>
        <div className="flex items-center gap-2">
          <Link2 className="h-4 w-4 text-orange-500" />
          <p className="text-[11px] font-black uppercase tracking-widest text-orange-500">
            Junk pricing links
          </p>
        </div>
        <p className="mt-2 text-sm text-gray-400">
          A link you can text to somebody standing in front of a pile. They photograph it and get a
          price — no account needed. Each link works a limited number of times and expires on its
          own, so one that gets forwarded around cannot run forever.
        </p>

        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="What is it for? e.g. Dunbarton basement"
            className="flex-1 rounded-lg px-3 py-2.5 text-sm text-white"
            style={{ background: '#0a0a0a', border: '1px solid #2a2a2a' }}
          />
          <button
            type="button"
            onClick={mint}
            disabled={minting}
            className="rounded-lg px-4 py-2.5 text-sm font-black text-black disabled:opacity-60"
            style={{ background: '#ea580c' }}
          >
            {minting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create a link'}
          </button>
        </div>
      </div>

      {fresh && (
        <div className="rounded-2xl p-5" style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.35)' }}>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-400" />
            <p className="text-sm font-black text-white">Your link is ready</p>
          </div>
          <p className="mt-1 text-xs text-gray-400">
            Copy it now — this is the only time it can be shown. Works {fresh.maxUses} times, expires{' '}
            {shortDate(fresh.expiresAt)}. If you lose it, make another and revoke this one.
          </p>
          <input
            readOnly
            value={fresh.url}
            onFocus={(e) => e.currentTarget.select()}
            className="mt-3 w-full rounded-lg px-3 py-2.5 text-xs text-white"
            style={{ background: '#0a0a0a', border: '1px solid #2a2a2a' }}
          />
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={() => copy(fresh.url)}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-black text-black"
              style={{ background: '#22c55e' }}
            >
              {copied ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? 'Copied' : 'Copy link'}
            </button>
            <a
              href={`sms:?&body=${encodeURIComponent(`Here is a link to price your junk removal: ${fresh.url}`)}`}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-black text-white"
              style={{ background: '#1a1a1a', border: '1px solid #2a2a2a' }}
            >
              <MessageSquare className="h-4 w-4" /> Text it
            </a>
          </div>
        </div>
      )}

      <div className="rounded-2xl p-5" style={{ background: '#0d0d0d', border: '1px solid #2a2a2a' }}>
        <p className="text-sm font-black text-white">Links you have made</p>
        {loading ? (
          <p className="mt-3 text-sm text-gray-500">Loading…</p>
        ) : links.length === 0 ? (
          <p className="mt-3 text-sm text-gray-500">None yet.</p>
        ) : (
          <div className="mt-3 space-y-2">
            {links.map((l) => (
              <div
                key={l.id}
                className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg px-3 py-2.5"
                style={{ background: '#0a0a0a', border: '1px solid #1f1f1f' }}
              >
                <span className="text-sm font-bold text-white">{l.label || 'Untitled'}</span>
                <span className="text-xs text-gray-500">
                  {l.uses} of {l.maxUses} used
                </span>
                <span className="text-xs text-gray-500">expires {shortDate(l.expiresAt)}</span>
                {l.usable ? (
                  <span className="text-xs font-bold text-green-400">live</span>
                ) : (
                  <span className="flex items-center gap-1 text-xs font-bold text-gray-500">
                    <AlertTriangle className="h-3 w-3" /> {l.reason}
                  </span>
                )}
                {l.usable && (
                  <button
                    type="button"
                    onClick={() => revoke(l.id)}
                    className="ml-auto flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-bold text-red-400"
                    style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)' }}
                  >
                    <Ban className="h-3 w-3" /> Revoke
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
