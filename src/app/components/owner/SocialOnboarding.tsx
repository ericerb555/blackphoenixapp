/**
 * Connect every social account, from one screen.
 *
 * Eric, 2026-10-03: *"i will connect once everything else is complete you
 * should make that on boarding symple for all social media accounts"*.
 *
 * WHAT WAS WRONG
 *
 * The server can post to twelve platforms and already reported which of them
 * had their credentials — and nothing in the interface read it. The hub
 * hardcoded three (`facebook | instagram | tiktok`), so nine were unreachable,
 * and because `configured` was never consulted, a Connect button could be
 * pressed for a platform with no credentials and simply fail after the click.
 *
 * WHAT MAKES THIS SIMPLE
 *
 * Not fewer buttons — fewer unanswered questions. Connecting a social account
 * is hard because the credentials live in twelve different developer consoles,
 * each wants a redirect URI pasted in exactly, and each calls its secrets
 * something different. So every platform here shows, in place:
 *
 *   • the exact callback URL to paste, with a copy button
 *   • the names of the secrets to set, with a copy button
 *   • a link straight to the console that issues them
 *   • one sentence on what to do there
 *
 * And the three states are kept apart, because they need different actions:
 * connected, ready to connect, and waiting on credentials. A platform in the
 * third state does NOT get a Connect button — offering one is how a person
 * ends up pressing something that cannot work and assuming the fault is
 * theirs.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Check, Copy, ExternalLink, Loader2, Link2, KeyRound, AlertTriangle,
  RefreshCw, DollarSign, Info,
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { projectId } from '../../utils/supabase/info';
import { supabase } from '../../lib/supabase';

const SERVER = `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6`;

interface Platform {
  id: string;
  label: string;
  auth: 'oauth' | 'app-password';
  media: 'none' | 'image-or-video' | 'video';
  maxChars: number;
  needsInstance?: boolean;
  needsBoard?: boolean;
  needsLocation?: boolean;
  needsOrganization?: boolean;
  costCents?: { plain: number; withLink: number };
  caveat?: string;
  configured: boolean;
  connected: boolean;
  redirectUri: string;
  setup: { secrets: string[]; console?: string; how: string };
}

async function authHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token;
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

function CopyButton({ value, label }: { value: string; label: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setDone(true);
          setTimeout(() => setDone(false), 1500);
        } catch {
          // Some browsers refuse clipboard access outside a secure context.
          // Saying so beats a button that silently does nothing.
          toast.error('Your browser blocked the clipboard — select the text and copy it.');
        }
      }}
      className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-[#1A1A1A] hover:bg-[#222] border border-[#2A2A2A] text-[11px] text-gray-300"
      title={`Copy ${label}`}
    >
      {done ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
      {done ? 'Copied' : 'Copy'}
    </button>
  );
}

export default function SocialOnboarding() {
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [callbackBase, setCallbackBase] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [handle, setHandle] = useState('');
  const [appPassword, setAppPassword] = useState('');
  const [instance, setInstance] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${SERVER}/social/platforms`, { headers: await authHeaders() });
      const data = await res.json().catch(() => null);
      if (!res.ok || !Array.isArray(data?.platforms)) {
        throw new Error(data?.error || `Could not load the platform list (${res.status}).`);
      }
      setPlatforms(data.platforms);
      setCallbackBase(String(data.callbackBase || ''));
    } catch (err: any) {
      setError(err?.message || 'Could not load the platform list.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const connect = async (p: Platform) => {
    setBusy(p.id);
    try {
      const body: Record<string, string> = {};
      if (p.auth === 'app-password') {
        if (!handle.trim() || !appPassword.trim()) {
          toast.error('Both the handle and the app password are needed.');
          return;
        }
        body.handle = handle.trim();
        body.appPassword = appPassword.trim();
      }
      if (p.needsInstance) {
        if (!instance.trim()) { toast.error('Which server is the account on?'); return; }
        body.instance = instance.trim();
      }

      const res = await fetch(`${SERVER}/social/connect/${p.id}`, {
        method: 'POST',
        headers: await authHeaders(),
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || `Could not start the connection (${res.status}).`);

      if (data?.authUrl) {
        // The platform's own consent screen. A new tab, so this screen and
        // whatever was typed into it survive the round trip.
        window.open(data.authUrl, '_blank', 'noopener,noreferrer');
        toast.success(`Finish signing in to ${p.label} in the new tab, then refresh this list.`);
      } else if (data?.connected) {
        toast.success(`${p.label} connected.`);
        setAppPassword('');
        void load();
      } else {
        toast.error(`${p.label} did not say whether it connected. Refresh and check.`);
      }
    } catch (err: any) {
      toast.error(err?.message || 'Could not connect that.');
    } finally {
      setBusy(null);
    }
  };

  const groups = useMemo(() => ({
    connected: platforms.filter((p) => p.connected),
    ready: platforms.filter((p) => !p.connected && p.configured),
    waiting: platforms.filter((p) => !p.connected && !p.configured),
  }), [platforms]);

  /** Several platforms share one set of secrets — say so once, not per card. */
  const sharedSecrets = useMemo(() => {
    const bySecret = new Map<string, string[]>();
    for (const p of platforms) {
      const key = p.setup.secrets.join(' + ');
      if (!key) continue;
      bySecret.set(key, [...(bySecret.get(key) || []), p.label]);
    }
    return [...bySecret.entries()].filter(([, labels]) => labels.length > 1);
  }, [platforms]);

  if (loading && platforms.length === 0) {
    return (
      <div className="bg-[#111] border border-[#2A2A2A] rounded-2xl p-8 text-center">
        <Loader2 className="w-6 h-6 text-orange-400 animate-spin mx-auto" />
      </div>
    );
  }

  const card = (p: Platform, state: 'connected' | 'ready' | 'waiting') => (
    <div
      key={p.id}
      className={`border rounded-xl p-4 ${
        state === 'connected'
          ? 'bg-emerald-500/5 border-emerald-500/30'
          : state === 'ready'
            ? 'bg-[#0A0A0A] border-[#2A2A2A]'
            : 'bg-[#0A0A0A] border-[#2A2A2A]'
      }`}
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <div>
          <p className="text-sm font-bold text-white flex items-center gap-2">
            {p.label}
            {state === 'connected' && <Check className="w-3.5 h-3.5 text-emerald-400" />}
          </p>
          <p className="text-[11px] text-gray-500">
            {p.media === 'video' ? 'Video only' : p.media === 'image-or-video' ? 'Needs an image or video' : 'Text is fine'}
            {' · '}{p.maxChars.toLocaleString()} characters
          </p>
        </div>
        {state === 'ready' && (
          <button
            onClick={() => void connect(p)}
            disabled={busy === p.id}
            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-orange-600 hover:bg-orange-500 text-white disabled:opacity-50 flex items-center gap-1.5 flex-shrink-0"
          >
            {busy === p.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Link2 className="w-3 h-3" />}
            Connect
          </button>
        )}
      </div>

      {p.costCents && (
        <p className="text-[11px] text-amber-400 flex items-start gap-1.5 mb-2">
          <DollarSign className="w-3 h-3 flex-shrink-0 mt-0.5" />
          {p.label} charges per post: {(p.costCents.plain / 100).toFixed(3).replace(/0$/, '')} plain,{' '}
          ${(p.costCents.withLink / 100).toFixed(2)} with a link. A store post always carries a link.
        </p>
      )}

      {p.caveat && (
        <p className="text-[11px] text-gray-400 flex items-start gap-1.5 mb-2">
          <Info className="w-3 h-3 flex-shrink-0 mt-0.5" /> {p.caveat}
        </p>
      )}

      {state === 'waiting' && (
        <div className="mt-3 space-y-2">
          <p className="text-xs text-gray-400">{p.setup.how}</p>

          {p.setup.secrets.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <KeyRound className="w-3 h-3 text-gray-500" />
              <code className="text-[11px] text-gray-300 bg-[#111] border border-[#2A2A2A] rounded px-2 py-1">
                {p.setup.secrets.join('   ')}
              </code>
              <CopyButton value={p.setup.secrets.join('\n')} label="secret names" />
              <span className="text-[10px] text-gray-500">set these in Supabase → Edge Functions → Secrets</span>
            </div>
          )}

          {p.auth === 'oauth' && (
            <div className="flex items-center gap-2 flex-wrap">
              <Link2 className="w-3 h-3 text-gray-500" />
              <code className="text-[11px] text-gray-300 bg-[#111] border border-[#2A2A2A] rounded px-2 py-1 break-all">
                {p.redirectUri}
              </code>
              <CopyButton value={p.redirectUri} label="callback URL" />
              <span className="text-[10px] text-gray-500">paste as the OAuth redirect</span>
            </div>
          )}

          {p.setup.console && (
            <a
              href={p.setup.console}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[11px] text-orange-400 hover:text-orange-300"
            >
              <ExternalLink className="w-3 h-3" /> Open the console that issues these
            </a>
          )}
        </div>
      )}

      {/* The two that need something typed rather than a redirect. */}
      {state === 'ready' && p.auth === 'app-password' && (
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <input
            value={handle}
            onChange={(e) => setHandle(e.target.value)}
            placeholder="your.handle.bsky.social"
            className="bg-[#111] border border-[#2A2A2A] rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600"
          />
          <input
            type="password"
            value={appPassword}
            onChange={(e) => setAppPassword(e.target.value)}
            placeholder="app password — never your real one"
            className="bg-[#111] border border-[#2A2A2A] rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600"
          />
        </div>
      )}
      {state === 'ready' && p.needsInstance && (
        <input
          value={instance}
          onChange={(e) => setInstance(e.target.value)}
          placeholder="mastodon.social"
          className="mt-3 w-full bg-[#111] border border-[#2A2A2A] rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600"
        />
      )}
    </div>
  );

  return (
    <div className="bg-[#111] border border-[#2A2A2A] rounded-2xl p-5">
      <div className="flex items-center justify-between gap-3 mb-1">
        <h2 className="text-base font-bold text-white">Social accounts</h2>
        <button
          onClick={() => void load()}
          className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-[#1A1A1A]"
          title="Refresh"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>
      <p className="text-sm text-gray-400 mb-4">
        {groups.connected.length} connected, {groups.ready.length} ready to connect,{' '}
        {groups.waiting.length} waiting on credentials. Nothing posts anywhere until an account is
        connected here.
      </p>

      {error && (
        <p className="text-sm text-red-400 flex items-start gap-2 mb-4">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" /> {error}
        </p>
      )}

      {sharedSecrets.length > 0 && groups.waiting.length > 0 && (
        <div className="border border-[#2A2A2A] rounded-xl p-3 mb-4 bg-[#0A0A0A]">
          <p className="text-[11px] text-gray-400">
            Some of these share one set of credentials, so one app covers several platforms:
          </p>
          <ul className="mt-1.5 space-y-0.5">
            {sharedSecrets.map(([secrets, labels]) => (
              <li key={secrets} className="text-[11px] text-gray-500">
                <code className="text-gray-300">{secrets}</code> → {labels.join(', ')}
              </li>
            ))}
          </ul>
        </div>
      )}

      {groups.connected.length > 0 && (
        <div className="mb-4">
          <p className="text-xs uppercase tracking-wide text-gray-500 mb-2">Connected</p>
          <div className="space-y-2">{groups.connected.map((p) => card(p, 'connected'))}</div>
        </div>
      )}

      {groups.ready.length > 0 && (
        <div className="mb-4">
          <p className="text-xs uppercase tracking-wide text-gray-500 mb-2">
            Ready to connect — credentials are already set
          </p>
          <div className="space-y-2">{groups.ready.map((p) => card(p, 'ready'))}</div>
        </div>
      )}

      {groups.waiting.length > 0 && (
        <div>
          <p className="text-xs uppercase tracking-wide text-gray-500 mb-1">
            Waiting on credentials
          </p>
          <p className="text-[11px] text-gray-500 mb-2">
            No Connect button on these on purpose — without the secrets it would fail after the
            click. Each one says what to fetch and where from.
          </p>
          <div className="space-y-2">{groups.waiting.map((p) => card(p, 'waiting'))}</div>
        </div>
      )}

      {callbackBase && (
        <p className="text-[10px] text-gray-600 mt-4">
          Every callback starts <code className="text-gray-500">{callbackBase}</code> — some consoles
          ask for that prefix or its domain rather than the full URL.
        </p>
      )}
    </div>
  );
}
