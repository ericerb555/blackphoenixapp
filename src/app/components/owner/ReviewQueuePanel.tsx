/**
 * Everything a tenant has submitted that is waiting on a decision.
 *
 * WHY ONE LIST
 *
 * Three kinds of thing queue — a reel, an advertisement, an offer — and each
 * had its own route, its own storage and, until this screen, no interface at
 * all. Anybody reviewing them would have had to call three endpoints by hand.
 * Split across three screens they would also be reviewed at three different
 * rates, and the one nobody opened would quietly fill up.
 *
 * WHAT IS SHOWN
 *
 * What a reader would see, because that is what is being judged: the words, the
 * link it points at, the discount and the code, and which portals it would
 * appear in. Not the record.
 *
 * A LINK IS SHOWN AS TEXT, NEVER AS A LINK
 *
 * The target of a submitted advertisement is the single most important thing to
 * read before approving it, and making it clickable here would invite the
 * reviewer to visit an address a stranger supplied, from a signed-in
 * administrator session. It is printed instead. The server already restricts
 * these to http and https; that stops a scheme, not a destination.
 */
import { useCallback, useEffect, useState } from 'react';
import {
  Film, Megaphone, Tag, Check, X, Loader2, Inbox, AlertTriangle, RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { projectId } from '../../utils/supabase/info';
import { supabase } from '../../lib/supabase';

const SERVER = `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6`;

type Kind = 'reel' | 'ad' | 'offer';

interface QueueItem {
  kind: Kind;
  id: string;
  title: string;
  submitter: string;
  submittedAt: string;
  /** Label/value pairs describing what a reader would see. */
  detail: Array<[string, string]>;
}

const KIND_META: Record<Kind, { label: string; icon: any; tint: string }> = {
  reel:  { label: 'Reel',          icon: Film,      tint: 'text-purple-400 border-purple-500/30 bg-purple-500/5' },
  ad:    { label: 'Advertisement', icon: Megaphone, tint: 'text-orange-400 border-orange-500/30 bg-orange-500/5' },
  offer: { label: 'Offer',         icon: Tag,       tint: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/5' },
};

const when = (iso: string) => {
  if (!iso) return '';
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return '';
  const mins = Math.floor((Date.now() - t) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
};

const text = (value: unknown) => String(value ?? '').trim();

export default function ReviewQueuePanel() {
  const [items, setItems] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [denied, setDenied] = useState(false);
  /** Named so a refusal can say why, which an author can then act on. */
  const [notes, setNotes] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) { setDenied(true); return; }
      const headers = { Authorization: `Bearer ${session.access_token}` };

      /**
       * All three at once, and one failing must not empty the other two —
       * a review screen that silently shows less than is waiting is worse
       * than one that says it could not load.
       */
      const [reels, ads, offers] = await Promise.allSettled([
        fetch(`${SERVER}/social/pending-reels`, { headers }).then(r => r.json()),
        fetch(`${SERVER}/advertising/review`, { headers }).then(r => r.json()),
        fetch(`${SERVER}/portal-deals/review`, { headers }).then(r => r.json()),
      ]);

      const out: QueueItem[] = [];
      let refused = 0;

      if (reels.status === 'fulfilled') {
        if (reels.value?.error) refused++;
        for (const r of (reels.value?.submissions || [])) {
          out.push({
            kind: 'reel',
            id: text(r.id),
            title: text(r.title) || 'Untitled reel',
            submitter: text(r.submitterName) || text(r.submitterType) || 'Unknown',
            submittedAt: text(r.submittedAt),
            detail: [
              ['Description', text(r.description)],
              ['Video', text(r.videoUrl) || 'none supplied'],
              ['Links to', text(r.linkUrl) || 'nowhere'],
            ].filter(([, v]) => v) as Array<[string, string]>,
          });
        }
      }

      if (ads.status === 'fulfilled') {
        if (ads.value?.error) refused++;
        for (const a of (ads.value?.pending || [])) {
          out.push({
            kind: 'ad',
            id: text(a.id),
            title: text(a.title) || 'Untitled advertisement',
            submitter: text(a.advertiserEmail) || 'Unknown',
            submittedAt: text(a.createdAt),
            detail: [
              ['Body', text(a.content)],
              ['Links to', text(a.linkUrl) || 'nowhere'],
              ['Image', text(a.imageUrl) || 'none'],
              ['Placement', text(a.placement) || 'marquee'],
            ].filter(([, v]) => v) as Array<[string, string]>,
          });
        }
      }

      if (offers.status === 'fulfilled') {
        if (offers.value?.error) refused++;
        for (const d of (offers.value?.pending || [])) {
          const value = text(d.discountValue);
          const kindOf = text(d.discountType);
          out.push({
            kind: 'offer',
            id: text(d.id),
            title: text(d.title) || 'Untitled offer',
            submitter: text(d.createdBy) || 'Unknown',
            submittedAt: text(d.createdAt),
            detail: [
              ['Description', text(d.description)],
              ['Discount', value ? (kindOf === 'percent' ? `${value}%` : `$${value}`) : ''],
              ['Code', text(d.promoCode)],
              ['Shown in', Array.isArray(d.targetPortals) ? d.targetPortals.join(', ') : 'all portals'],
              ['Expires', text(d.expiresAt)],
            ].filter(([, v]) => v) as Array<[string, string]>,
          });
        }
      }

      // Every one refused means this account is not an administrator.
      setDenied(refused === 3);
      out.sort((a, b) => String(b.submittedAt).localeCompare(String(a.submittedAt)));
      setItems(out);
    } catch (error: any) {
      toast.error(error?.message || 'Could not load the review queue.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const decide = async (item: QueueItem, approve: boolean) => {
    const key = `${item.kind}:${item.id}`;
    setBusy(key);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Sign in again.');
      const headers = {
        Authorization: `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      };
      const note = notes[key] || '';

      let res: Response;
      if (item.kind === 'reel') {
        res = await fetch(
          `${SERVER}/social/${approve ? 'approve' : 'reject'}-reel/${encodeURIComponent(item.id)}`,
          { method: 'POST', headers, body: JSON.stringify({ note }) },
        );
      } else {
        const path = item.kind === 'ad'
          ? `/advertising/creatives/${encodeURIComponent(item.id)}/decision`
          : `/portal-deals/${encodeURIComponent(item.id)}/decision`;
        res = await fetch(`${SERVER}${path}`, {
          method: 'POST', headers,
          body: JSON.stringify({ action: approve ? 'approve' : 'reject', note }),
        });
      }

      const body = await res.json().catch(() => null);
      if (!res.ok || body?.success === false || body?.error) {
        throw new Error(body?.error || 'That decision could not be recorded.');
      }

      toast.success(approve
        ? `${KIND_META[item.kind].label} approved — it is live now.`
        : `${KIND_META[item.kind].label} refused.`);
      setNotes(prev => { const next = { ...prev }; delete next[key]; return next; });
      await load();
    } catch (error: any) {
      toast.error(error?.message || 'That decision could not be recorded.');
    } finally {
      setBusy(null);
    }
  };

  if (denied) {
    return (
      <div className="rounded-xl border border-[#2A2A2A] bg-[#111] p-10 text-center">
        <AlertTriangle className="mx-auto mb-3 h-8 w-8 text-amber-400" />
        <p className="font-semibold text-white">Administrator access is required</p>
        <p className="mx-auto mt-2 max-w-md text-sm text-gray-400">
          This queue holds every tenant's submissions, not one account's.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-xl font-bold text-white">Waiting for approval</h2>
          <p className="mt-1 text-sm text-gray-400">
            Nothing here is visible to anybody until it is approved.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-[#2A2A2A] px-3 py-1.5 text-sm text-gray-300 transition hover:bg-white/5 disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="rounded-xl border border-[#2A2A2A] bg-[#111] p-10 text-center text-gray-400">
          <Loader2 className="mx-auto mb-3 h-6 w-6 animate-spin" />
          Reading the queues…
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-[#2A2A2A] bg-[#111] p-10 text-center">
          <Inbox className="mx-auto mb-3 h-8 w-8 text-gray-600" />
          <p className="font-semibold text-white">Nothing is waiting</p>
          <p className="mx-auto mt-2 max-w-md text-sm text-gray-400">
            Reels, advertisements and offers submitted by vendors, advertisers and
            other portal accounts appear here before anybody else can see them.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {items.map((item) => {
            const meta = KIND_META[item.kind];
            const key = `${item.kind}:${item.id}`;
            const Icon = meta.icon;
            return (
              <li key={key} className={`rounded-xl border p-4 ${meta.tint}`}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide">
                      <Icon className="h-3.5 w-3.5" /> {meta.label}
                    </span>
                    <h3 className="mt-1 break-words text-lg font-bold text-white">{item.title}</h3>
                    <p className="mt-0.5 text-xs text-gray-400">
                      {item.submitter}{item.submittedAt ? ` · ${when(item.submittedAt)}` : ''}
                    </p>
                  </div>
                </div>

                {item.detail.length > 0 && (
                  <dl className="mt-3 grid gap-x-6 gap-y-2 sm:grid-cols-2">
                    {item.detail.map(([label, value]) => (
                      <div key={label} className={label === 'Description' || label === 'Body' ? 'sm:col-span-2' : undefined}>
                        <dt className="text-[11px] uppercase tracking-wide text-gray-500">{label}</dt>
                        {/* Printed, never linked — see the note at the top of this file. */}
                        <dd className="mt-0.5 break-all text-sm text-gray-200">{value}</dd>
                      </div>
                    ))}
                  </dl>
                )}

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <input
                    value={notes[key] || ''}
                    onChange={(e) => setNotes(prev => ({ ...prev, [key]: e.target.value }))}
                    placeholder="Reason, if you are refusing it"
                    className="min-w-0 flex-1 rounded-lg border border-[#2A2A2A] bg-[#1A1A1A] px-3 py-2 text-sm text-white outline-none focus:border-white/30"
                  />
                  <button
                    type="button"
                    onClick={() => decide(item, true)}
                    disabled={busy === key}
                    className="inline-flex min-h-10 items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-emerald-500 disabled:opacity-50"
                  >
                    {busy === key ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                    Approve
                  </button>
                  <button
                    type="button"
                    onClick={() => decide(item, false)}
                    disabled={busy === key}
                    className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-red-500/40 px-4 py-2 text-sm font-bold text-red-300 transition hover:bg-red-500/10 disabled:opacity-50"
                  >
                    <X className="h-4 w-4" /> Refuse
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
