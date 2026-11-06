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
  Plus, Send,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../../lib/supabase';
import { API_BASE_URL } from '../../lib/apiConfig';

const SERVER = `${API_BASE_URL}/make-server-3eae23a6`;

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

  /**
   * Adding a reel from inside the app, instead of from a console.
   *
   * `/social/submit-reel` was written for vendors and advertisers sending
   * US their content, so there has never been a way for the company to add
   * its own. The gap was filled by pasting JavaScript into the browser
   * console, which is not a way to run a business: the first attempt failed
   * because the snippet referenced `window.supabase`, which this app does
   * not expose, and the error was invisible among three hundred lines of
   * startup logging.
   *
   * It submits as PENDING like everything else rather than publishing
   * directly. One path to the public page means one place to check before
   * something reaches a customer — and the reel then appears in the list
   * below, where it can be read as a stranger would read it before anybody
   * presses Approve.
   */
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState({
    title: '', description: '', videoUrl: '', thumbnailUrl: '', linkUrl: '',
  });
  const [submitting, setSubmitting] = useState(false);

  /**
   * The five trades, as a starting point rather than a finished reel.
   *
   * Filling the form is the slow part and the copy is the part worth
   * keeping, so these carry real wording — what the job is, what the
   * customer gets, one reason to call. The media is left EMPTY on purpose:
   * a preset that quietly supplied stock footage would put somebody else's
   * kitchen on the page under this company's name, and the whole value of
   * the trade is that it can be trusted.
   */
  const PRESETS: Array<{ label: string; title: string; description: string; linkUrl: string }> = [
    {
      label: 'Trash removal',
      title: 'Trash removal and clear-outs',
      description: 'Skips, loading and tip fees handled. Garage, basement, estate clear-out or the '
        + 'debris from somebody else\u2019s job \u2014 we take it away and sweep up after it. '
        + 'Minimum $125, quoted before we start.',
      linkUrl: '/work-request?service=trash-removal',
    },
    {
      label: 'Kitchen',
      title: 'Kitchen remodeling',
      description: 'Strip-out to final clean, run as phases you can see finished: set-up and '
        + 'protection, demo, first fix, cabinets and worktops, second fix, hand-over. Phase prices '
        + 'up front, and you pay against the ones that are done.',
      linkUrl: '/work-request?service=kitchen-remodel',
    },
    {
      label: 'Bathroom',
      title: 'Bathroom remodeling',
      description: 'One bathroom out of use, not the whole house. Waterproofing and first fix done '
        + 'properly before anything pretty goes on top \u2014 the part nobody photographs and '
        + 'everybody pays for twice when it is skipped.',
      linkUrl: '/work-request?service=bathroom-remodel',
    },
    {
      label: 'Painting',
      title: 'Interior and exterior painting',
      description: 'Prep is most of the job: filling, sanding, caulking and masking before a brush '
        + 'is opened. Rooms back in use the same day where we can, and we move the furniture back '
        + 'ourselves.',
      linkUrl: '/work-request?service=painting',
    },
    {
      label: 'Flooring',
      title: 'Flooring \u2014 supply or fit your own',
      description: 'Hardwood, LVP, tile and carpet. Subfloor checked and levelled first, because a '
        + 'beautiful floor on a bad subfloor is a complaint waiting six months. Buying your own '
        + 'material? That comes off the bill, itemised.',
      linkUrl: '/work-request?service=flooring',
    },
  ];

  /**
   * Send the draft to the pending queue.
   *
   * Errors are SHOWN, with the status code. The console flow failed
   * silently twice; a form that does the same would be no better than the
   * thing it replaces.
   */
  const submitDraft = useCallback(async () => {
    const title = draft.title.trim();
    if (!title) { toast.error('A reel needs a title.'); return; }

    setSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { toast.error('Sign in again — the session has expired.'); return; }

      const res = await fetch(`${SERVER}/social/submit-reel`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title,
          description: draft.description.trim(),
          videoUrl: draft.videoUrl.trim(),
          thumbnailUrl: draft.thumbnailUrl.trim(),
          linkUrl: draft.linkUrl.trim(),
          submitterName: 'Black Phoenix Builds',
          // 'content' is what marks a reel as OURS, which is what puts our
          // logo on the card rather than a submitter's.
          submitterType: 'content',
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || body?.error) {
        toast.error(body?.error || `That did not save (HTTP ${res.status}).`);
        return;
      }
      toast.success(`"${title}" is waiting for approval below.`);
      setDraft({ title: '', description: '', videoUrl: '', thumbnailUrl: '', linkUrl: '' });
      await load();
    } catch (err: any) {
      toast.error(`That did not save: ${err?.message || err}`);
    } finally {
      setSubmitting(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft]);

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

      {/*
        ── adding one of our own ────────────────────────────────────────

        `/social/submit-reel` was built for vendors sending US their
        content, so the company had no way to add its own and the gap was
        being filled by pasting JavaScript into a browser console. That
        failed twice — once on an API the app does not expose — and the
        error was invisible among three hundred lines of startup logging.

        It submits as PENDING like every other route into this queue. One
        path to the public page means one place to check before something
        reaches a customer, and the reel appears in the list below to be
        read as a stranger would read it.
      */}
      <div className="mb-4 rounded-xl border border-[#2A2A2A] bg-[#111]">
        <button
          type="button"
          onClick={() => setAdding(v => !v)}
          className="flex w-full items-center gap-2 px-4 py-3 text-left"
        >
          <Plus className="h-4 w-4 text-purple-400" />
          <span className="text-sm font-bold text-white">Add a reel of our own</span>
          <span className="ml-auto text-xs text-gray-500">{adding ? 'Close' : 'Open'}</span>
        </button>

        {adding && (
          <div className="space-y-3 border-t border-[#2A2A2A] p-4">
            {/*
              Starting points, not finished reels. The copy is the slow part
              and worth keeping; the MEDIA is deliberately left empty,
              because a preset that quietly supplied stock footage would put
              somebody else's kitchen on the page under this company's name.
            */}
            <div>
              <div className="mb-1.5 text-xs font-semibold text-gray-400">Start from a trade</div>
              <div className="flex flex-wrap gap-1.5">
                {PRESETS.map(preset => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => setDraft(d => ({
                      ...d,
                      title: preset.title,
                      description: preset.description,
                      linkUrl: preset.linkUrl,
                    }))}
                    className="rounded-full border border-[#2A2A2A] bg-[#0A0A0A] px-3 py-1 text-xs font-semibold text-gray-300 transition hover:border-purple-500/50 hover:text-white"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            <input
              className="w-full rounded-lg border border-[#2A2A2A] bg-[#0A0A0A] px-3 py-2 text-sm text-white placeholder-gray-600 focus:border-purple-500/50 focus:outline-none"
              placeholder="Title — what the card says"
              value={draft.title}
              onChange={e => setDraft(d => ({ ...d, title: e.target.value }))}
            />
            <textarea
              className="w-full rounded-lg border border-[#2A2A2A] bg-[#0A0A0A] px-3 py-2 text-sm text-white placeholder-gray-600 focus:border-purple-500/50 focus:outline-none"
              rows={3}
              placeholder="Description — what the job is, and one reason to call"
              value={draft.description}
              onChange={e => setDraft(d => ({ ...d, description: e.target.value }))}
            />
            <input
              className="w-full rounded-lg border border-[#2A2A2A] bg-[#0A0A0A] px-3 py-2 text-sm text-white placeholder-gray-600 focus:border-purple-500/50 focus:outline-none"
              placeholder="Video URL — an .mp4 we host, or leave blank for a still only"
              value={draft.videoUrl}
              onChange={e => setDraft(d => ({ ...d, videoUrl: e.target.value }))}
            />
            <input
              className="w-full rounded-lg border border-[#2A2A2A] bg-[#0A0A0A] px-3 py-2 text-sm text-white placeholder-gray-600 focus:border-purple-500/50 focus:outline-none"
              placeholder="Thumbnail URL — https:// only"
              value={draft.thumbnailUrl}
              onChange={e => setDraft(d => ({ ...d, thumbnailUrl: e.target.value }))}
            />
            <input
              className="w-full rounded-lg border border-[#2A2A2A] bg-[#0A0A0A] px-3 py-2 text-sm text-white placeholder-gray-600 focus:border-purple-500/50 focus:outline-none"
              placeholder="Links to — e.g. /work-request?service=painting"
              value={draft.linkUrl}
              onChange={e => setDraft(d => ({ ...d, linkUrl: e.target.value }))}
            />

            {/*
              Said plainly, where the decision is made. A reel on the landing
              page reads as "this is our work"; footage that is not ours is
              fine for laying out a page and wrong in front of a customer.
            */}
            <p className="text-xs text-gray-500">
              Use your own job photos and video where you can. Anything on the landing page reads to a
              customer as work you did. Nothing here goes public until you approve it below.
            </p>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => void submitDraft()}
                disabled={submitting || !draft.title.trim()}
                className="flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-purple-500 disabled:opacity-40"
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Send for approval
              </button>
              <button
                type="button"
                onClick={() => setDraft({ title: '', description: '', videoUrl: '', thumbnailUrl: '', linkUrl: '' })}
                className="rounded-lg border border-[#2A2A2A] px-3 py-2 text-sm text-gray-400 transition hover:text-white"
              >
                Clear
              </button>
            </div>
          </div>
        )}
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
            To add one of your own, use <strong className="text-gray-300">Add a reel of our own</strong> above.
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
