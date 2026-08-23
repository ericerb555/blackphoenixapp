/**
 * Phoenix Exchange — where work is posted and priced.
 *
 * Unlike every other page in this app, it talks to Postgres directly through
 * supabase-js with the signed-in user's own session rather than going through
 * the edge function. That is deliberate: the Exchange's rules live in RLS
 * (migrations 003/004/011), so the database decides what each person may see
 * and write. A subcontractor physically cannot read a rival's price — not
 * because this file remembers to filter it out, but because the row never
 * arrives.
 *
 * One consequence worth understanding while reading this: THERE IS NO ROLE
 * SWITCH on the queries. Operator and subcontractor run the identical fetch;
 * RLS returns different rows to each. The UI only partitions what came back
 * into "work we posted" and "work we were invited to".
 *
 * TWO THINGS THAT LOOK ODD AND ARE NOT
 *
 * 1. Spacing comes from `exchangeStyles.ts`, not from `p-*` / `m-*`. Those
 *    utilities compute to 0px application-wide by design — see the comment on
 *    the reset in globals.css. Class selectors still work, so this screen names
 *    its own.
 *
 * 2. Everything migration 011 adds — emergency, coordinates, first refusal,
 *    media — is treated as optional. The page has to keep working against a
 *    database where 011 has not been applied yet, so a missing column or a
 *    missing table degrades to "not shown" rather than to a broken screen.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Gavel, Plus, Loader2, RefreshCw, Users, Clock, CheckCircle2, X,
  AlertTriangle, Send, Trophy, FileText, Building2, Inbox, UserPlus,
  Search, SlidersHorizontal, LayoutGrid, List as ListIcon, Radar,
  MapPin, Siren, ImageIcon, Play, ShieldCheck, TrendingUp, Ruler,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../lib/supabase';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import SponsoredMarquee from '../components/SponsoredMarquee';
import { EXCHANGE_CSS } from './exchangeStyles';
import {
  EMPTY_FILTERS, BUILT_IN_PRESETS, applyPreset, applyFilters, sortRequests,
  activeFilterCount, countdown, firstRefusal, bidSpread, requestDistance,
  type ExchangeFilters, type SortKey, type Coords,
} from '../lib/exchangeFilters';

// Only used for the invitation email. Every other call on this page goes
// straight to Postgres — sending mail is the one thing that needs a secret the
// browser must not hold.
const SERVER = `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6`;

// ── types ────────────────────────────────────────────────────────────────────

type RequestStatus = 'draft' | 'open' | 'closed' | 'awarded' | 'cancelled';
type BidState = 'submitted' | 'withdrawn' | 'declined' | 'won' | 'lost';

interface Org { id: string; name: string; slug: string; type: string }
interface Membership { org_id: string; role: string; status: string }

interface BidRequest {
  id: string;
  org_id: string;
  title: string;
  description: string | null;
  trade: string | null;
  status: RequestStatus;
  site_address: string | null;
  budget_low: number | null;
  budget_high: number | null;
  due_at: string | null;
  awarded_bid_id: string | null;
  created_at: string;
  // migration 011 — optional everywhere, see the header note.
  is_emergency?: boolean | null;
  latitude?: number | null;
  longitude?: number | null;
  first_refusal_until?: string | null;
  first_refusal_org_id?: string | null;
}

interface Bid {
  id: string;
  bid_request_id: string;
  org_id: string;
  status: BidState;
  amount: number | null;
  notes: string | null;
  submitted_at: string;
}

interface Invitation { id: string; bid_request_id: string; org_id: string; created_at: string }

interface Media {
  id: string; bid_request_id: string; kind: 'photo' | 'video';
  url: string; caption: string | null; sort_order: number;
}

// ── helpers ──────────────────────────────────────────────────────────────────

const usd = (n: number | null | undefined) =>
  typeof n === 'number' && Number.isFinite(n)
    ? `$${n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
    : '—';

const STATUS_STYLE: Record<RequestStatus, { bg: string; border: string; fg: string; label: string }> = {
  draft:     { bg: 'rgba(148,163,184,0.12)', border: 'rgba(148,163,184,0.35)', fg: '#cbd5e1', label: 'Draft' },
  open:      { bg: 'rgba(16,185,129,0.14)',  border: 'rgba(16,185,129,0.40)',  fg: '#34d399', label: 'Open' },
  closed:    { bg: 'rgba(234,88,12,0.14)',   border: 'rgba(234,88,12,0.40)',   fg: '#fb923c', label: 'Closed' },
  awarded:   { bg: 'rgba(124,58,237,0.16)',  border: 'rgba(124,58,237,0.40)',  fg: '#a78bfa', label: 'Awarded' },
  cancelled: { bg: 'rgba(239,68,68,0.12)',   border: 'rgba(239,68,68,0.35)',   fg: '#f87171', label: 'Cancelled' },
};

function Pill({ tone, children }: { tone: { bg: string; border: string; fg: string }; children: React.ReactNode }) {
  return (
    <span className="bpx-pill" style={{ background: tone.bg, border: `1px solid ${tone.border}`, color: tone.fg }}>
      {children}
    </span>
  );
}

function StatusPill({ status }: { status: RequestStatus }) {
  const s = STATUS_STYLE[status];
  return <Pill tone={s}>{s.label}</Pill>;
}

function Stat({ icon: Icon, label, value, tone = '#ea580c' }: {
  icon: any; label: string; value: string; tone?: string;
}) {
  return (
    <div className="bpx-stat">
      <span className="bpx-stat-k"><Icon size={13} style={{ color: tone }} />{label}</span>
      <span className="bpx-stat-v">{value}</span>
    </div>
  );
}

// ── page ─────────────────────────────────────────────────────────────────────

export default function BidRoom({ onNavigate }: { onNavigate?: (page: string) => void }) {
  const [loading, setLoading] = useState(true);
  const [fatal, setFatal] = useState<string | null>(null);

  const [myOrgs, setMyOrgs] = useState<Org[]>([]);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [requests, setRequests] = useState<BidRequest[]>([]);
  const [bids, setBids] = useState<Bid[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [orgNames, setOrgNames] = useState<Record<string, string>>({});
  const [media, setMedia] = useState<Media[]>([]);

  const [tab, setTab] = useState<'posted' | 'invited'>('posted');
  const [openRequestId, setOpenRequestId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [directory, setDirectory] = useState<Org[]>([]);

  // browse state
  const [filters, setFilters] = useState<ExchangeFilters>(EMPTY_FILTERS);
  const [sort, setSort] = useState<SortKey>('newest');
  const [view, setView] = useState<'list' | 'grid' | 'map'>('list');
  const [showFilters, setShowFilters] = useState(false);
  const [activePreset, setActivePreset] = useState<string | null>(null);
  const [origin, setOrigin] = useState<Coords | null>(null);

  const myOrgIds = useMemo(() => new Set(myOrgs.map(o => o.id)), [myOrgs]);

  const adminOrgs = useMemo(
    () => myOrgs.filter(o => memberships.some(
      m => m.org_id === o.id && m.status === 'active' && ['owner', 'admin'].includes(m.role),
    )),
    [myOrgs, memberships],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setFatal(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) { setFatal('Sign in to use Phoenix Exchange.'); return; }

      // Everything below is RLS-filtered. No org_id filters are applied here on
      // purpose — adding them would imply the client is what enforces scope.
      const [memRes, reqRes, bidRes, invRes] = await Promise.all([
        supabase.from('organization_members').select('org_id, role, status'),
        supabase.from('bid_requests').select('*').order('created_at', { ascending: false }),
        supabase.from('bids').select('*'),
        supabase.from('bid_invitations').select('id, bid_request_id, org_id, created_at'),
      ]);

      if (memRes.error) throw memRes.error;
      if (reqRes.error) throw reqRes.error;

      const mems = (memRes.data || []) as Membership[];
      setMemberships(mems);

      const activeOrgIds = mems.filter(m => m.status === 'active').map(m => m.org_id);
      if (activeOrgIds.length) {
        const { data: orgs } = await supabase
          .from('organizations').select('id, name, slug, type').in('id', activeOrgIds);
        setMyOrgs((orgs || []) as Org[]);
      } else {
        setMyOrgs([]);
      }

      setRequests((reqRes.data || []) as BidRequest[]);
      setBids((bidRes.data || []) as Bid[]);
      setInvitations((invRes.data || []) as Invitation[]);

      // Media is best-effort. Until migration 011 is applied this table does not
      // exist, and a screen full of jobs is far more useful than an error
      // because the photographs could not be listed.
      try {
        const { data: mediaRows, error: mediaErr } = await supabase
          .from('bid_request_media')
          .select('id, bid_request_id, kind, url, caption, sort_order')
          .order('sort_order');
        setMedia(mediaErr ? [] : ((mediaRows || []) as Media[]));
      } catch {
        setMedia([]);
      }

      // Resolve names for every org referenced by a bid or invitation. RLS on
      // `organizations` only returns orgs I belong to, so a provider's name may
      // legitimately come back missing — the UI falls back rather than blanking.
      const referenced = Array.from(new Set([
        ...(bidRes.data || []).map((b: any) => b.org_id),
        ...(invRes.data || []).map((i: any) => i.org_id),
      ]));
      if (referenced.length) {
        const { data: named } = await supabase
          .from('organizations').select('id, name').in('id', referenced);
        const map: Record<string, string> = {};
        (named || []).forEach((o: any) => { map[o.id] = o.name; });
        setOrgNames(map);
      }

      // Providers available to invite. RLS decides whether this returns
      // anything at all, so no permission check is duplicated here.
      const { data: dir } = await supabase
        .from('organizations')
        .select('id, name, slug, type')
        .in('type', ['subcontractor', 'vendor'])
        .eq('status', 'active')
        .order('name');
      setDirectory((dir || []) as Org[]);
    } catch (err: any) {
      console.error('[Exchange] load failed:', err);
      setFatal(err?.message || 'Could not load Phoenix Exchange.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const posted = useMemo(() => requests.filter(r => myOrgIds.has(r.org_id)), [requests, myOrgIds]);
  const invited = useMemo(() => requests.filter(r => !myOrgIds.has(r.org_id)), [requests, myOrgIds]);

  const bidsFor = useCallback((requestId: string) => bids.filter(b => b.bid_request_id === requestId), [bids]);
  const myBidFor = useCallback(
    (requestId: string) => bids.find(b => b.bid_request_id === requestId && myOrgIds.has(b.org_id)) || null,
    [bids, myOrgIds],
  );
  const mediaFor = useCallback((requestId: string) => media.filter(m => m.bid_request_id === requestId), [media]);

  const mediaCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    media.forEach(m => { counts[m.bid_request_id] = (counts[m.bid_request_id] || 0) + 1; });
    return counts;
  }, [media]);

  const bidCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    bids.forEach(b => { counts[b.bid_request_id] = (counts[b.bid_request_id] || 0) + 1; });
    return counts;
  }, [bids]);

  // Every trade actually present, so the filter never offers an empty category.
  const trades = useMemo(() => {
    const set = new Set<string>();
    requests.forEach(r => { const t = String(r.trade || '').trim().toLowerCase(); if (t) set.add(t); });
    return Array.from(set).sort();
  }, [requests]);

  const stats = useMemo(() => {
    const openPosted = posted.filter(r => r.status === 'open').length;
    const received = bids.filter(b => posted.some(r => r.id === b.bid_request_id)).length;
    const awaiting = posted.filter(r => r.status === 'open' && bidsFor(r.id).length > 0).length;
    const myOpenInvites = invited.filter(r => r.status === 'open' && !myBidFor(r.id)).length;
    const myWins = bids.filter(b => myOrgIds.has(b.org_id) && b.status === 'won').length;
    const emergencies = requests.filter(r => r.is_emergency && r.status === 'open').length;
    return { openPosted, received, awaiting, myOpenInvites, myWins, emergencies };
  }, [posted, invited, bids, bidsFor, myBidFor, myOrgIds, requests]);

  const source = tab === 'posted' ? posted : invited;

  const visible = useMemo(() => {
    const filtered = applyFilters(source as any, filters, { origin, mediaCounts });
    return sortRequests(filtered, sort, { origin, bidCounts }) as BidRequest[];
  }, [source, filters, sort, origin, mediaCounts, bidCounts]);

  // ── actions (unchanged — the rules they rely on live in RLS) ───────────────

  const submitBid = async (request: BidRequest, orgId: string, amount: number, notes: string) => {
    const existing = myBidFor(request.id);
    try {
      if (existing) {
        const { error, data } = await supabase.from('bids')
          .update({ amount, notes, updated_at: new Date().toISOString() })
          .eq('id', existing.id).select();
        if (error) throw error;
        // RLS rejects by matching zero rows, not by erroring — an empty result
        // means the policy refused, which must not read as success.
        if (!data?.length) throw new Error('That bid can no longer be changed. The request may have closed.');
        toast.success('Bid updated.');
      } else {
        const { error, data } = await supabase.from('bids')
          .insert({ bid_request_id: request.id, org_id: orgId, amount, notes, status: 'submitted' })
          .select();
        if (error) throw error;
        if (!data?.length) throw new Error('That bid was not accepted. The request may have closed.');
        toast.success('Bid submitted.');
      }
      await load();
    } catch (err: any) {
      console.error('[Exchange] submitBid:', err);
      toast.error(err?.message || 'Could not submit that bid.');
    }
  };

  const inviteProviders = async (request: BidRequest, orgIds: string[]) => {
    if (!orgIds.length) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const { error, data } = await supabase.from('bid_invitations').insert(
        orgIds.map(id => ({
          bid_request_id: request.id,
          org_id: id,
          invited_by: session?.user?.id || null,
        })),
      ).select();
      if (error) throw error;
      if (!data?.length) throw new Error('Those invitations were not accepted. You may not own this request.');

      // The invitation row is the source of truth and is already written. Email
      // is a courtesy on top, so a send failure must not read as a failed
      // invite — it is reported separately and the invitation stands.
      let notice = `Invited ${data.length} provider${data.length === 1 ? '' : 's'}.`;
      try {
        const res = await fetch(`${SERVER}/bid-room/notify-invites`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session?.access_token || publicAnonKey}`,
          },
          body: JSON.stringify({ bidRequestId: request.id, orgIds }),
        });
        const out = await res.json().catch(() => null);
        if (res.ok && out?.success) {
          const parts: string[] = [];
          if (out.emailed) parts.push(`${out.emailed} emailed`);
          if (out.texted) parts.push(`${out.texted} texted`);
          if (parts.length) notice += ` ${parts.join(', ')}.`;

          const unreached = (out.results || []).filter((r: any) => !r.sent);
          if (unreached.length) {
            toast.error(
              `Not reached: ${unreached.map((f: any) =>
                `${f.org} (${f.emailReason || f.smsReason || 'no contact details'})`).join(', ')}. ` +
              `They will still see the invitation when they open Phoenix Exchange.`,
              { duration: 9000 },
            );
          }
        } else {
          toast.error('Invitations saved, but the notifications could not be sent.');
        }
      } catch (notifyErr) {
        console.error('[Exchange] notify failed:', notifyErr);
        toast.error('Invitations saved, but the notifications could not be sent.');
      }

      toast.success(notice);
      await load();
    } catch (err: any) {
      console.error('[Exchange] invite:', err);
      const msg = /duplicate key|unique/i.test(err?.message || '')
        ? 'One of those providers was already invited.'
        : err?.message || 'Could not send those invitations.';
      toast.error(msg);
    }
  };

  const uninviteProvider = async (invitation: Invitation) => {
    try {
      const { error } = await supabase.from('bid_invitations').delete().eq('id', invitation.id);
      if (error) throw error;
      await load();
      toast.success('Invitation withdrawn.');
    } catch (err: any) {
      toast.error(err?.message || 'Could not withdraw that invitation.');
    }
  };

  const awardBid = async (request: BidRequest, bid: Bid) => {
    try {
      const { error: bidErr, data: bidRows } = await supabase.from('bids')
        .update({ status: 'won', updated_at: new Date().toISOString() }).eq('id', bid.id).select();
      if (bidErr) throw bidErr;
      if (!bidRows?.length) throw new Error('You do not have permission to award this bid.');

      const losers = bidsFor(request.id).filter(b => b.id !== bid.id && b.status === 'submitted');
      if (losers.length) {
        await supabase.from('bids').update({ status: 'lost' }).in('id', losers.map(b => b.id));
      }
      const { error: reqErr } = await supabase.from('bid_requests')
        .update({ status: 'awarded', awarded_bid_id: bid.id, updated_at: new Date().toISOString() })
        .eq('id', request.id);
      if (reqErr) throw reqErr;

      toast.success(`Awarded to ${orgNames[bid.org_id] || 'the selected bidder'}.`);
      await load();
    } catch (err: any) {
      console.error('[Exchange] awardBid:', err);
      toast.error(err?.message || 'Could not award that bid.');
    }
  };

  const setRequestStatus = async (request: BidRequest, status: RequestStatus) => {
    try {
      const { error, data } = await supabase.from('bid_requests')
        .update({ status, updated_at: new Date().toISOString() }).eq('id', request.id).select();
      if (error) throw error;
      if (!data?.length) throw new Error('You do not have permission to change this request.');
      toast.success(status === 'open' ? 'Request is now open for bids.' : `Request ${status}.`);
      await load();
    } catch (err: any) {
      toast.error(err?.message || 'Could not update that request.');
    }
  };

  // ── render ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="bpx-center">
        <style>{EXCHANGE_CSS}</style>
        <div className="bpx-row" style={{ color: '#9ca3af' }}>
          <Loader2 className="animate-spin" size={19} style={{ color: '#ea580c' }} />
          Loading Phoenix Exchange…
        </div>
      </div>
    );
  }

  if (fatal) {
    return (
      <div className="bpx-center">
        <style>{EXCHANGE_CSS}</style>
        <div className="bpx-panel">
          <AlertTriangle size={30} style={{ color: '#ea580c' }} />
          <p style={{ fontWeight: 800, fontSize: 17 }}>Phoenix Exchange could not load</p>
          <p style={{ fontSize: 13.5, color: '#9ca3af' }}>{fatal}</p>
          <button onClick={load} className="bpx-btn bpx-btn-primary">Try again</button>
        </div>
      </div>
    );
  }

  // Membership exists but is still `invited` — the person completed nothing yet.
  const hasActiveMembership = memberships.some(m => m.status === 'active');
  if (!hasActiveMembership) {
    // Two different situations were being told the same story. Somebody with an
    // `invited` membership genuinely has an application to finish. Somebody with
    // no membership at all has not been invited to anything, and telling them to
    // "finish your application" sends them to a form that will not help.
    const invitedSomewhere = memberships.length > 0;
    return (
      <div className="bpx-center">
        <style>{EXCHANGE_CSS}</style>
        <div className="bpx-panel">
          <Inbox size={30} style={{ color: '#ea580c' }} />
          <p style={{ fontWeight: 800, fontSize: 17 }}>
            {invitedSomewhere ? 'Your portal access is still pending' : 'This account is not part of an organisation yet'}
          </p>
          <p style={{ fontSize: 13.5, color: '#9ca3af', lineHeight: 1.6 }}>
            {invitedSomewhere
              ? 'You have been invited but have not finished your application yet. Complete your profile and Phoenix Exchange will open automatically.'
              : 'Phoenix Exchange is organised around companies — jobs are posted by one and bid on by others. Once your account is attached to an organisation, it opens here automatically.'}
          </p>
          {onNavigate && invitedSomewhere && (
            <button onClick={() => onNavigate('portal-onboarding')} className="bpx-btn bpx-btn-primary">
              Finish my application
            </button>
          )}
        </div>
      </div>
    );
  }

  const filterCount = activeFilterCount(filters);

  const choosePreset = (id: string) => {
    if (activePreset === id) {
      setActivePreset(null);
      setFilters(EMPTY_FILTERS);
      return;
    }
    const preset = BUILT_IN_PRESETS.find(p => p.id === id);
    if (!preset) return;
    setActivePreset(id);
    setFilters(applyPreset(preset));
    if (preset.sort) setSort(preset.sort);
    // The nearby preset is meaningless without somewhere to measure from.
    if (preset.filters.radiusMiles != null && !origin) requestOrigin(setOrigin);
  };

  return (
    <div className="bpx">
      <style>{EXCHANGE_CSS}</style>

      {/*
        The landing page's marquee, not the portals'.

        AdvertisingMarquee was here first and rendered nothing at all: it reads
        `advertisements` out of localStorage and filters on placement, and since
        no ad has ever been placed on "phoenix-exchange" the list came back
        empty and the component returned null. It only looked right in testing
        because the test seeded that key by hand.

        SponsoredMarquee is the one already running on the landing page — it
        genuinely scrolls, pulls paid placements from the server with impression
        and click tracking, and falls back to house content, so the strip is
        never blank while nobody has bought it.
      */}
      <SponsoredMarquee onNavigate={onNavigate} />

      <div className="bpx-shell">
        {/* ── masthead ───────────────────────────────────────────────────── */}
        <header className="bpx-masthead">
          <div className="bpx-masthead-row">
            <div className="bpx-brand">
              <div className="bpx-mark"><Gavel size={21} color="#fff" /></div>
              <div style={{ minWidth: 0 }}>
                <h1 className="bpx-title">Phoenix Exchange</h1>
                <p className="bpx-sub">Post work, invite providers, and compare sealed bids.</p>
              </div>
            </div>
            <div className="bpx-row">
              <button onClick={load} className="bpx-btn bpx-btn-icon" title="Reload" aria-label="Reload">
                <RefreshCw size={16} />
              </button>
              {adminOrgs.length > 0 && (
                <button onClick={() => setShowCreate(true)} className="bpx-btn bpx-btn-primary">
                  <Plus size={16} /> Post work
                </button>
              )}
            </div>
          </div>

          <div className="bpx-stats">
            {adminOrgs.length > 0 ? (
              <>
                <Stat icon={FileText} label="Open requests" value={String(stats.openPosted)} />
                <Stat icon={Users} label="Bids received" value={String(stats.received)} tone="#38bdf8" />
                <Stat icon={Clock} label="Awaiting decision" value={String(stats.awaiting)} tone="#fbbf24" />
                <Stat icon={Siren} label="Emergencies" value={String(stats.emergencies)} tone="#f87171" />
              </>
            ) : (
              <>
                <Stat icon={Inbox} label="Open invitations" value={String(stats.myOpenInvites)} />
                <Stat icon={Send} label="Bids submitted" value={String(bids.filter(b => myOrgIds.has(b.org_id)).length)} tone="#38bdf8" />
                <Stat icon={Trophy} label="Jobs won" value={String(stats.myWins)} tone="#a78bfa" />
                <Stat icon={Siren} label="Emergencies" value={String(stats.emergencies)} tone="#f87171" />
              </>
            )}
          </div>
        </header>

        {/* ── tabs ───────────────────────────────────────────────────────── */}
        <div className="bpx-row" style={{ gap: 8 }}>
          {([['posted', 'Posted by us', posted.length], ['invited', 'Our invitations', invited.length]] as const)
            .map(([k, label, n]) => (
              <button key={k} onClick={() => { setTab(k); setOpenRequestId(null); }}
                className="bpx-btn" data-on={tab === k}>
                {label} <span className="bpx-count" style={tab === k ? undefined : { background: '#2A2A2A', color: '#9ca3af' }}>{n}</span>
              </button>
            ))}
        </div>

        {/* ── toolbar ────────────────────────────────────────────────────── */}
        <div className="bpx-toolbar">
          <div className="bpx-search">
            <Search size={17} />
            <input
              value={filters.query}
              onChange={e => setFilters(f => ({ ...f, query: e.target.value }))}
              placeholder="Search by title, trade or town…"
              aria-label="Search requests"
            />
          </div>

          <button className="bpx-btn" data-on={showFilters || filterCount > 0}
            onClick={() => setShowFilters(v => !v)}>
            <SlidersHorizontal size={16} /> Filters
            {filterCount > 0 && <span className="bpx-count">{filterCount}</span>}
          </button>

          <select className="bpx-select" value={sort} onChange={e => setSort(e.target.value as SortKey)} aria-label="Sort">
            <option value="newest">Newest first</option>
            <option value="due">Closing soonest</option>
            <option value="budget-high">Budget: high to low</option>
            <option value="budget-low">Budget: low to high</option>
            <option value="distance">Nearest first</option>
            <option value="most-bids">Most bids</option>
          </select>

          <div className="bpx-seg" role="group" aria-label="View">
            <button data-on={view === 'list'} onClick={() => setView('list')} title="List" aria-label="List view"><ListIcon size={16} /></button>
            <button data-on={view === 'grid'} onClick={() => setView('grid')} title="Grid" aria-label="Grid view"><LayoutGrid size={16} /></button>
            <button data-on={view === 'map'} onClick={() => { setView('map'); if (!origin) requestOrigin(setOrigin); }} title="Map" aria-label="Map view"><Radar size={16} /></button>
          </div>
        </div>

        {/* ── presets ────────────────────────────────────────────────────── */}
        <div className="bpx-presets">
          {BUILT_IN_PRESETS.map(p => (
            <button key={p.id} className="bpx-chip" data-on={activePreset === p.id}
              onClick={() => choosePreset(p.id)} title={p.description}>
              {p.id === 'emergency' && <Siren size={13} />}
              {p.id === 'closing-soon' && <Clock size={13} />}
              {p.id === 'nearby' && <MapPin size={13} />}
              {p.id === 'big-jobs' && <TrendingUp size={13} />}
              {p.id === 'has-media' && <ImageIcon size={13} />}
              {p.label}
            </button>
          ))}
          {(filterCount > 0 || filters.query) && (
            <button className="bpx-chip" onClick={() => { setFilters(EMPTY_FILTERS); setActivePreset(null); }}>
              <X size={13} /> Clear
            </button>
          )}
        </div>

        {showFilters && (
          <FilterPanel
            filters={filters} trades={trades} origin={origin}
            onChange={next => { setFilters(next); setActivePreset(null); }}
            onNeedOrigin={() => requestOrigin(setOrigin)}
          />
        )}

        {/* ── results ────────────────────────────────────────────────────── */}
        {requests.length === 0 ? (
          /* Nothing has ever been posted. That is the state this screen will be
             in until the first job goes up, and it is the first thing a vendor
             or subcontractor sees — so it explains the place rather than
             reporting that it is empty. */
          <FirstRun
            canPost={adminOrgs.length > 0}
            providerCount={directory.length}
            onPost={() => setShowCreate(true)}
            onNavigate={onNavigate}
          />
        ) : visible.length === 0 ? (
          <div className="bpx-empty">
            <Gavel size={30} style={{ color: '#4b5563' }} />
            <p style={{ fontWeight: 800, fontSize: 16 }}>
              {source.length === 0
                ? (tab === 'posted' ? 'No work posted yet' : 'No invitations yet')
                : 'Nothing matches those filters'}
            </p>
            <p style={{ fontSize: 13.5, color: '#6b7280', maxWidth: 420, lineHeight: 1.6 }}>
              {source.length === 0
                ? (tab === 'posted'
                    ? 'Post work to Phoenix Exchange and invite providers to price it.'
                    : 'When someone invites you to bid, the job appears here.')
                : `${source.length} request${source.length === 1 ? '' : 's'} are hidden by the current filters.`}
            </p>
            {source.length > 0 && (
              <button className="bpx-btn" onClick={() => { setFilters(EMPTY_FILTERS); setActivePreset(null); }}>
                Clear filters
              </button>
            )}
          </div>
        ) : view === 'map' ? (
          <RadarMap
            requests={visible} origin={origin} orgNames={orgNames}
            onPick={id => { setView('list'); setOpenRequestId(id); }}
            onNeedOrigin={() => requestOrigin(setOrigin)}
          />
        ) : (
          <div className="bpx-list" data-view={view}>
            {visible.map(request => (
              <RequestCard
                key={request.id}
                request={request}
                bids={bidsFor(request.id)}
                invitations={invitations.filter(i => i.bid_request_id === request.id)}
                media={mediaFor(request.id)}
                myBid={myBidFor(request.id)}
                isOwner={myOrgIds.has(request.org_id)}
                origin={origin}
                expanded={openRequestId === request.id}
                onToggle={() => setOpenRequestId(openRequestId === request.id ? null : request.id)}
                orgNames={orgNames}
                directory={directory}
                myOrgs={myOrgs}
                myOrgIds={myOrgIds}
                onAward={b => awardBid(request, b)}
                onStatus={s => setRequestStatus(request, s)}
                onInvite={ids => inviteProviders(request, ids)}
                onUninvite={uninviteProvider}
                onSubmitBid={(orgId, amount, notes) => submitBid(request, orgId, amount, notes)}
              />
            ))}
          </div>
        )}
      </div>

      {showCreate && adminOrgs.length > 0 && (
        <CreateRequestModal
          orgs={adminOrgs}
          onClose={() => setShowCreate(false)}
          onCreated={async () => { setShowCreate(false); await load(); }}
        />
      )}
    </div>
  );
}

/**
 * Ask the browser where we are, for the radius filter and the map.
 *
 * Permission is requested only when something actually needs it — on opening
 * the map or choosing a distance filter — rather than on page load, because a
 * location prompt that appears for no visible reason gets denied, and a denial
 * is remembered by the browser.
 */
function requestOrigin(set: (c: Coords | null) => void) {
  if (!('geolocation' in navigator)) {
    toast.error('This browser cannot share a location, so distance is unavailable.');
    return;
  }
  navigator.geolocation.getCurrentPosition(
    pos => set({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
    () => toast.error('Location was not shared, so distances cannot be shown.'),
    { timeout: 8000, maximumAge: 300_000 },
  );
}

// ── filter panel ─────────────────────────────────────────────────────────────

const STATUSES: RequestStatus[] = ['draft', 'open', 'closed', 'awarded', 'cancelled'];
const RADII = [10, 25, 50, 100];
const DUE_WINDOWS = [1, 3, 7, 14];

function FilterPanel({ filters, trades, origin, onChange, onNeedOrigin }: {
  filters: ExchangeFilters; trades: string[]; origin: Coords | null;
  onChange: (next: ExchangeFilters) => void; onNeedOrigin: () => void;
}) {
  const toggleIn = <T,>(list: T[], value: T): T[] =>
    list.includes(value) ? list.filter(v => v !== value) : [...list, value];

  return (
    <div className="bpx-filters">
      <div className="bpx-fgroup">
        <span className="bpx-flabel">Trade</span>
        <div className="bpx-frow">
          {trades.length === 0 && <span style={{ fontSize: 12.5, color: '#6b7280' }}>No trades recorded yet.</span>}
          {trades.map(t => (
            <button key={t} className="bpx-tog" data-on={filters.trades.includes(t)}
              onClick={() => onChange({ ...filters, trades: toggleIn(filters.trades, t) })}>
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="bpx-fgroup">
        <span className="bpx-flabel">Status</span>
        <div className="bpx-frow">
          {STATUSES.map(s => (
            <button key={s} className="bpx-tog" data-on={filters.statuses.includes(s)}
              onClick={() => onChange({ ...filters, statuses: toggleIn(filters.statuses, s) })}>
              {STATUS_STYLE[s].label}
            </button>
          ))}
        </div>
      </div>

      <div className="bpx-fgroup">
        <span className="bpx-flabel">Budget</span>
        <div className="bpx-row" style={{ gap: 8, flexWrap: 'nowrap' }}>
          <input className="bpx-num" inputMode="numeric" placeholder="Min"
            value={filters.budgetMin ?? ''}
            onChange={e => onChange({ ...filters, budgetMin: e.target.value ? Number(e.target.value) : null })} />
          <span style={{ color: '#6b7280' }}>–</span>
          <input className="bpx-num" inputMode="numeric" placeholder="Max"
            value={filters.budgetMax ?? ''}
            onChange={e => onChange({ ...filters, budgetMax: e.target.value ? Number(e.target.value) : null })} />
        </div>
        <span style={{ fontSize: 11.5, color: '#6b7280' }}>
          Matches any job whose range overlaps yours.
        </span>
      </div>

      <div className="bpx-fgroup">
        <span className="bpx-flabel">Distance</span>
        <div className="bpx-frow">
          {RADII.map(r => (
            <button key={r} className="bpx-tog" data-on={filters.radiusMiles === r}
              onClick={() => {
                const next = filters.radiusMiles === r ? null : r;
                if (next != null && !origin) onNeedOrigin();
                onChange({ ...filters, radiusMiles: next });
              }}>
              {r} mi
            </button>
          ))}
        </div>
        {!origin && filters.radiusMiles != null && (
          <span style={{ fontSize: 11.5, color: '#fbbf24' }}>
            Waiting for your location — nothing can be measured until it is shared.
          </span>
        )}
      </div>

      <div className="bpx-fgroup">
        <span className="bpx-flabel">Bids due within</span>
        <div className="bpx-frow">
          {DUE_WINDOWS.map(d => (
            <button key={d} className="bpx-tog" data-on={filters.dueWithinDays === d}
              onClick={() => onChange({ ...filters, dueWithinDays: filters.dueWithinDays === d ? null : d })}>
              {d === 1 ? '24 hours' : `${d} days`}
            </button>
          ))}
        </div>
      </div>

      <div className="bpx-fgroup">
        <span className="bpx-flabel">Only show</span>
        <div className="bpx-frow">
          <button className="bpx-tog" data-on={filters.emergencyOnly}
            onClick={() => onChange({ ...filters, emergencyOnly: !filters.emergencyOnly })}>
            Emergencies
          </button>
          <button className="bpx-tog" data-on={filters.withMediaOnly}
            onClick={() => onChange({ ...filters, withMediaOnly: !filters.withMediaOnly })}>
            With photos
          </button>
        </div>
      </div>
    </div>
  );
}

// ── request card ─────────────────────────────────────────────────────────────

function RequestCard(props: {
  request: BidRequest; bids: Bid[]; invitations: Invitation[]; media: Media[];
  myBid: Bid | null; isOwner: boolean; origin: Coords | null; expanded: boolean;
  onToggle: () => void; orgNames: Record<string, string>; directory: Org[];
  myOrgs: Org[]; myOrgIds: Set<string>;
  onAward: (b: Bid) => void; onStatus: (s: RequestStatus) => void;
  onInvite: (ids: string[]) => void; onUninvite: (i: Invitation) => void;
  onSubmitBid: (orgId: string, amount: number, notes: string) => void;
}) {
  const {
    request, bids, invitations, media, myBid, isOwner, origin, expanded, onToggle,
    orgNames, directory, myOrgs, myOrgIds,
  } = props;

  const due = countdown(request.due_at);
  const refusal = firstRefusal(request as any);
  const spread = bidSpread(bids as any);
  const miles = requestDistance(request as any, origin);
  const emergency = !!request.is_emergency;

  return (
    <article className="bpx-card" data-emergency={emergency}>
      <div className="bpx-card-body">
        <div className="bpx-card-top">
          <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <h3 className="bpx-card-title">{request.title}</h3>
            <div className="bpx-tags">
              <StatusPill status={request.status} />
              {emergency && (
                <Pill tone={{ bg: 'rgba(239,68,68,0.16)', border: 'rgba(239,68,68,0.5)', fg: '#fca5a5' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Siren size={11} /> Emergency</span>
                </Pill>
              )}
              {refusal.active && (
                <Pill tone={{ bg: 'rgba(56,189,248,0.14)', border: 'rgba(56,189,248,0.45)', fg: '#7dd3fc' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><ShieldCheck size={11} /> {refusal.text}</span>
                </Pill>
              )}
              {myBid && (
                <Pill tone={{ bg: 'rgba(56,189,248,0.14)', border: 'rgba(56,189,248,0.4)', fg: '#38bdf8' }}>
                  {myBid.status === 'won' ? 'You won' : myBid.status === 'lost' ? 'Not selected' : `Your bid ${usd(myBid.amount)}`}
                </Pill>
              )}
            </div>
          </div>

          <button className="bpx-btn" onClick={onToggle} style={{ flexShrink: 0 }}>
            {expanded ? 'Hide' : isOwner ? 'View bids' : 'Open'}
          </button>
        </div>

        <div className="bpx-meta">
          {request.trade && <span className="bpx-meta-item" style={{ textTransform: 'capitalize' }}>{request.trade}</span>}
          <span className="bpx-meta-item" style={{ color: due.urgent ? '#fb923c' : undefined }}>
            <Clock size={13} /> {due.text}
          </span>
          {(request.budget_low || request.budget_high) && (
            <span className="bpx-meta-item">{usd(request.budget_low)}–{usd(request.budget_high)}</span>
          )}
          {request.site_address && (
            <span className="bpx-meta-item" style={{ minWidth: 0 }}>
              <MapPin size={13} />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{request.site_address}</span>
            </span>
          )}
          {miles != null && (
            <span className="bpx-meta-item" style={{ color: '#7dd3fc' }}><Ruler size={13} /> {miles} mi</span>
          )}
        </div>

        {media.length > 0 && <MediaStrip media={media} />}

        {/* The owner sees where the prices landed. A provider must not — that is
            the sealed-bid guarantee, and RLS would not have sent them the rows
            anyway; this only avoids rendering an empty summary for them. */}
        {isOwner && spread.count > 0 && (
          <SpreadBar spread={spread} invited={invitations.length} />
        )}
      </div>

      {expanded && (
        <div className="bpx-detail">
          {request.description && <p className="bpx-desc">{request.description}</p>}
          {!refusal.active && refusal.lapsed && (
            <p style={{ fontSize: 12.5, color: '#9ca3af' }}>{refusal.text}</p>
          )}

          {isOwner ? (
            <OwnerPanel
              request={request} bids={bids} invitations={invitations}
              orgNames={orgNames} directory={directory}
              onAward={props.onAward} onStatus={props.onStatus}
              onInvite={props.onInvite} onUninvite={props.onUninvite}
            />
          ) : (
            <ProviderPanel
              request={request} myBid={myBid}
              myOrgId={
                // The org that was invited — not simply my first org, which
                // would submit under the wrong entity for a person who belongs
                // to several.
                invitations.find(i => myOrgIds.has(i.org_id))?.org_id || myOrgs[0]?.id || ''
              }
              onSubmit={props.onSubmitBid}
            />
          )}
        </div>
      )}
    </article>
  );
}

// ── first run ────────────────────────────────────────────────────────────────

/**
 * What the Exchange looks like before anything has been posted.
 *
 * This is not a placeholder. Until the first job goes up this IS the page, and
 * it is what a subcontractor or vendor sees when they are invited in — so it
 * has to explain what the place is for and give the one action that starts it,
 * rather than announcing that a list is empty.
 *
 * The provider count is read from the directory rather than invented. Saying
 * "hundreds of contractors" to somebody who can see there are two is how a
 * marketplace loses the people it is trying to attract.
 */
function FirstRun({ canPost, providerCount, onPost, onNavigate }: {
  canPost: boolean; providerCount: number;
  onPost: () => void; onNavigate?: (page: string) => void;
}) {
  const STEPS = [
    { n: 1, icon: FileText, title: 'Post the work',
      body: 'Scope, budget range, site address and a deadline. Add photographs and video — a provider cannot price framing from a sentence.' },
    { n: 2, icon: UserPlus, title: 'Invite who should price it',
      body: 'Pick from your provider directory. They are notified by email and text, and the job appears in their Exchange straight away.' },
    { n: 3, icon: Trophy, title: 'Compare sealed bids',
      body: 'Prices land side by side with the spread between them. No provider can see another’s number — the database enforces that, not the screen.' },
  ];

  return (
    <div className="bpx-firstrun">
      <div className="bpx-firstrun-hero">
        <div className="bpx-mark" style={{ width: 52, height: 52 }}><Gavel size={24} color="#fff" /></div>
        <h2>Nothing has been posted yet</h2>
        <p>
          Phoenix Exchange is where Black Phoenix puts work out to subcontractors and
          vendors, and where they price it back. Post the first job and it starts here.
        </p>
        <div className="bpx-row" style={{ justifyContent: 'center', gap: 10, marginTop: 4 }}>
          {canPost && (
            <button className="bpx-btn bpx-btn-primary" onClick={onPost}>
              <Plus size={16} /> Post the first job
            </button>
          )}
          {onNavigate && (
            <button className="bpx-btn" onClick={() => onNavigate('subcontractor-application')}>
              <UserPlus size={16} /> Bring in providers
            </button>
          )}
        </div>
        <p className="bpx-firstrun-count">
          {providerCount === 0
            ? 'No providers have finished onboarding yet — they appear here as soon as they do.'
            : `${providerCount} provider${providerCount === 1 ? '' : 's'} ready to be invited.`}
        </p>
      </div>

      <ol className="bpx-steps">
        {STEPS.map(s => (
          <li key={s.n} className="bpx-step">
            <span className="bpx-step-n">{s.n}</span>
            <s.icon size={17} style={{ color: '#fb923c' }} />
            <h3>{s.title}</h3>
            <p>{s.body}</p>
          </li>
        ))}
      </ol>

      <div className="bpx-firstrun-note">
        <ShieldCheck size={16} style={{ color: '#7dd3fc', flexShrink: 0 }} />
        <span>
          Emergencies jump the queue, jobs inside your radius can be held for first
          refusal before they reach the wider market, and every price stays sealed
          until you award it.
        </span>
      </div>
    </div>
  );
}

function MediaStrip({ media }: { media: Media[] }) {
  return (
    <div className="bpx-media">
      {media.map(m => (
        <a key={m.id} className="bpx-thumb" href={m.url} target="_blank" rel="noopener noreferrer"
           title={m.caption || (m.kind === 'video' ? 'Video' : 'Photo')}>
          {m.kind === 'video' ? (
            <>
              <video src={m.url} preload="metadata" muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              <span className="bpx-thumb-play"><Play size={16} /></span>
            </>
          ) : (
            <img src={m.url} alt={m.caption || 'Site photo'} loading="lazy" />
          )}
        </a>
      ))}
    </div>
  );
}

function SpreadBar({ spread, invited }: { spread: ReturnType<typeof bidSpread>; invited: number }) {
  // Where the median sits between low and high, as a percentage. With a single
  // bid there is no spread to place it in, so the marker sits at the middle.
  const pct = spread.range && spread.low != null && spread.median != null && spread.range > 0
    ? ((spread.median - spread.low) / spread.range) * 100
    : 50;

  return (
    <div className="bpx-spread">
      <div className="bpx-spread-nums">
        <span style={{ color: '#34d399', fontWeight: 700 }}>{usd(spread.low)}</span>
        <span style={{ color: '#9ca3af' }}>
          {/* Stated as two separate facts. "3 of 2 bids" was being rendered
              whenever the posting org priced its own job or an invitation was
              withdrawn after a bid landed — the count genuinely can exceed the
              invitation list, and phrasing it as a fraction made it read as a
              bug in the arithmetic. */}
          {spread.count} bid{spread.count === 1 ? '' : 's'}
          {invited > 0 && <> · {invited} invited</>}
          {spread.median != null && <> · median {usd(spread.median)}</>}
        </span>
        <span style={{ color: '#f87171', fontWeight: 700 }}>{usd(spread.high)}</span>
      </div>
      <div className="bpx-spread-track">
        <div className="bpx-spread-fill" style={{ left: 0, right: 0 }} />
        <div className="bpx-spread-tick" style={{ left: `calc(${Math.min(100, Math.max(0, pct))}% - 1px)` }} />
      </div>
      {spread.range != null && spread.range > 0 && (
        <span style={{ fontSize: 11.5, color: '#6b7280' }}>
          {usd(spread.range)} between the lowest and highest price.
        </span>
      )}
    </div>
  );
}

// ── radar map ────────────────────────────────────────────────────────────────

/**
 * Jobs plotted by distance and bearing from where you are.
 *
 * Deliberately not a tile map. Tiles mean an external host, and the artifact
 * and portal contexts this renders in block third-party requests — a map that
 * silently fails to load is worse than none. What actually matters here is
 * "how far, and roughly which way", which this shows without leaving the page.
 */
function RadarMap({ requests, origin, orgNames, onPick, onNeedOrigin }: {
  requests: BidRequest[]; origin: Coords | null; orgNames: Record<string, string>;
  onPick: (id: string) => void; onNeedOrigin: () => void;
}) {
  const located = requests.filter(r => requestDistance(r as any, origin) != null);
  const maxMiles = Math.max(10, ...located.map(r => requestDistance(r as any, origin) || 0));
  const rings = [0.25, 0.5, 0.75, 1];

  if (!origin) {
    return (
      <div className="bpx-empty">
        <Radar size={30} style={{ color: '#4b5563' }} />
        <p style={{ fontWeight: 800, fontSize: 16 }}>Share your location to see the map</p>
        <p style={{ fontSize: 13.5, color: '#6b7280', maxWidth: 420, lineHeight: 1.6 }}>
          Jobs are plotted by how far they are from you, so the map needs a starting point.
        </p>
        <button className="bpx-btn bpx-btn-primary" onClick={onNeedOrigin}>Use my location</button>
      </div>
    );
  }

  return (
    <div className="bpx-radar-wrap">
      <div className="bpx-radar">
        <svg viewBox="0 0 100 100" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
          {rings.map(r => (
            <circle key={r} cx="50" cy="50" r={r * 48} fill="none" stroke="#2A2A2A" strokeWidth="0.3" />
          ))}
          <line x1="50" y1="2" x2="50" y2="98" stroke="#2A2A2A" strokeWidth="0.3" />
          <line x1="2" y1="50" x2="98" y2="50" stroke="#2A2A2A" strokeWidth="0.3" />
          {rings.map(r => (
            <text key={`t${r}`} x="51" y={50 - r * 48 + 3} fill="#4b5563" fontSize="3">
              {Math.round(maxMiles * r)}mi
            </text>
          ))}
        </svg>

        {/* you */}
        <div className="bpx-radar-dot" style={{ left: '50%', top: '50%' }} title="You">
          <div style={{
            width: 12, height: 12, borderRadius: '50%', background: '#ea580c',
            boxShadow: '0 0 0 4px rgba(234,88,12,.25)',
          }} />
        </div>

        {located.map(r => {
          const miles = requestDistance(r as any, origin)!;
          // Bearing from true north, so the plot bears some relation to reality
          // rather than scattering jobs at arbitrary angles.
          const dLng = (r.longitude! - origin.longitude) * Math.cos((origin.latitude * Math.PI) / 180);
          const dLat = r.latitude! - origin.latitude;
          const angle = Math.atan2(dLng, dLat);
          const radius = (miles / maxMiles) * 48;
          const x = 50 + Math.sin(angle) * radius;
          const y = 50 - Math.cos(angle) * radius;
          const tone = r.is_emergency ? '#ef4444' : r.status === 'open' ? '#34d399' : '#9ca3af';

          return (
            <button key={r.id} className="bpx-radar-dot"
              style={{ left: `${x}%`, top: `${y}%`, background: 'none', border: 'none', padding: 0 }}
              onClick={() => onPick(r.id)}
              title={`${r.title} — ${miles} mi${r.is_emergency ? ' — emergency' : ''}`}>
              <span style={{
                display: 'block', width: r.is_emergency ? 13 : 10, height: r.is_emergency ? 13 : 10,
                borderRadius: '50%', background: tone,
                boxShadow: r.is_emergency ? '0 0 0 4px rgba(239,68,68,.22)' : '0 0 0 3px rgba(0,0,0,.5)',
              }} />
            </button>
          );
        })}
      </div>

      <div className="bpx-radar-legend">
        <span><span style={{ color: '#ea580c' }}>●</span> You</span>
        <span><span style={{ color: '#34d399' }}>●</span> Open</span>
        <span><span style={{ color: '#ef4444' }}>●</span> Emergency</span>
        <span><span style={{ color: '#9ca3af' }}>●</span> Other</span>
      </div>

      {located.length < requests.length && (
        <p style={{ fontSize: 12, color: '#6b7280', textAlign: 'center', marginTop: 10 }}>
          {requests.length - located.length} of {requests.length} requests have no location recorded and cannot be plotted.
        </p>
      )}
    </div>
  );
}

// ── owner panel ──────────────────────────────────────────────────────────────

function OwnerPanel({ request, bids, invitations, orgNames, directory, onAward, onStatus, onInvite, onUninvite }: {
  request: BidRequest; bids: Bid[]; invitations: Invitation[];
  orgNames: Record<string, string>; directory: Org[];
  onAward: (b: Bid) => void; onStatus: (s: RequestStatus) => void;
  onInvite: (orgIds: string[]) => void; onUninvite: (i: Invitation) => void;
}) {
  const sorted = [...bids].sort((a, b) => (a.amount ?? Infinity) - (b.amount ?? Infinity));
  const notBid = invitations.filter(i => !bids.some(b => b.org_id === i.org_id));

  return (
    <div className="bpx-stack">
      <div className="bpx-row" style={{ justifyContent: 'space-between' }}>
        <h4 className="bpx-flabel">Bids received</h4>
        <div className="bpx-row" style={{ gap: 8 }}>
          {request.status === 'draft' && (
            <button onClick={() => onStatus('open')} className="bpx-btn bpx-btn-primary" style={{ minHeight: 38 }}>
              Open for bids
            </button>
          )}
          {request.status === 'open' && (
            <button onClick={() => onStatus('closed')} className="bpx-btn" style={{ minHeight: 38 }}>
              Close bidding
            </button>
          )}
        </div>
      </div>

      {sorted.length === 0 ? (
        <p style={{ fontSize: 13, color: '#6b7280' }}>
          No bids yet. {invitations.length} provider{invitations.length === 1 ? '' : 's'} invited.
        </p>
      ) : (
        <div className="bpx-stack" style={{ gap: 8 }}>
          {sorted.map((b, i) => (
            <div key={b.id} className="bpx-row" style={{
              justifyContent: 'space-between', padding: 12, borderRadius: 13,
              background: '#1A1A1A', border: '1px solid #2A2A2A', flexWrap: 'nowrap',
            }}>
              <div className="bpx-row" style={{ minWidth: 0, flexWrap: 'nowrap' }}>
                <Building2 size={15} style={{ color: '#6b7280', flexShrink: 0 }} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {orgNames[b.org_id] || 'Provider'}
                    {i === 0 && b.status !== 'lost' && <span style={{ marginLeft: 8, fontSize: 11.5, color: '#34d399' }}>lowest</span>}
                  </div>
                  {b.notes && <div style={{ fontSize: 11.5, color: '#6b7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.notes}</div>}
                </div>
              </div>
              <div className="bpx-row" style={{ flexWrap: 'nowrap', flexShrink: 0 }}>
                <span style={{ fontSize: 17, fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>{usd(b.amount)}</span>
                {b.status === 'won' ? (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11.5, fontWeight: 800, color: '#a78bfa' }}>
                    <Trophy size={13} /> Awarded
                  </span>
                ) : b.status === 'lost' ? (
                  <span style={{ fontSize: 11.5, color: '#4b5563' }}>Not selected</span>
                ) : request.status === 'awarded' ? null : (
                  <button onClick={() => onAward(b)} className="bpx-btn"
                    style={{ minHeight: 36, background: 'rgba(124,58,237,0.9)', border: 'none', color: '#fff' }}>
                    Award
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <InvitePanel
        request={request} invitations={invitations} bids={bids}
        orgNames={orgNames} directory={directory}
        onInvite={onInvite} onUninvite={onUninvite}
      />

      {notBid.length > 0 && (
        <p style={{ fontSize: 11.5, color: '#6b7280' }}>
          Awaiting a bid from: {notBid.map(i => orgNames[i.org_id] || 'provider').join(', ')}
        </p>
      )}
    </div>
  );
}

// ── invite panel ─────────────────────────────────────────────────────────────

function InvitePanel({ request, invitations, bids, orgNames, directory, onInvite, onUninvite }: {
  request: BidRequest; invitations: Invitation[]; bids: Bid[];
  orgNames: Record<string, string>; directory: Org[];
  onInvite: (orgIds: string[]) => void; onUninvite: (i: Invitation) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);

  const invitedIds = useMemo(() => new Set(invitations.map(i => i.org_id)), [invitations]);

  const candidates = useMemo(() => {
    const q = query.trim().toLowerCase();
    return directory
      .filter(o => !invitedIds.has(o.id))
      .filter(o => !q || o.name.toLowerCase().includes(q) || (o.type || '').toLowerCase().includes(q));
  }, [directory, invitedIds, query]);

  const toggle = (id: string) => setPicked(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const send = async () => {
    setBusy(true);
    try {
      await onInvite(Array.from(picked));
      setPicked(new Set());
      setQuery('');
      setOpen(false);
    } finally { setBusy(false); }
  };

  // An awarded or cancelled request should not gain new bidders.
  const canInvite = request.status === 'draft' || request.status === 'open';

  return (
    <div style={{ paddingTop: 16, borderTop: '1px solid #2A2A2A', display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div className="bpx-row" style={{ justifyContent: 'space-between' }}>
        <h4 className="bpx-flabel">Invited providers ({invitations.length})</h4>
        {canInvite && (
          <button onClick={() => setOpen(v => !v)} className="bpx-btn"
            style={{ minHeight: 38, ...(open ? {} : { background: '#ea580c', border: 'none', color: '#fff' }) }}>
            {open ? 'Close' : <><UserPlus size={14} /> Invite providers</>}
          </button>
        )}
      </div>

      {invitations.length > 0 && (
        <div className="bpx-row" style={{ gap: 8 }}>
          {invitations.map(i => {
            // Withdrawing an invitation after they have priced the work would
            // orphan a real bid, so that is not offered.
            const hasBid = bids.some(b => b.org_id === i.org_id);
            return (
              <span key={i.id} className="bpx-row" style={{
                gap: 8, padding: '8px 12px', borderRadius: 11, fontSize: 12,
                background: 'rgba(255,255,255,0.05)', border: '1px solid #2A2A2A', flexWrap: 'nowrap',
              }}>
                <Building2 size={13} style={{ color: '#6b7280' }} />
                {orgNames[i.org_id] || 'Provider'}
                {hasBid
                  ? <span style={{ color: '#34d399' }}>bid in</span>
                  : canInvite && (
                      <button onClick={() => onUninvite(i)} title="Withdraw invitation"
                        style={{ background: 'none', border: 'none', color: '#4b5563', cursor: 'pointer', display: 'grid', placeItems: 'center' }}>
                        <X size={13} />
                      </button>
                    )}
              </span>
            );
          })}
        </div>
      )}

      {open && (
        <div style={{ borderRadius: 14, border: '1px solid #2A2A2A', background: '#1A1A1A', padding: 16 }}>
          {directory.length === 0 ? (
            <p style={{ fontSize: 13, color: '#6b7280' }}>
              No providers available to invite. Provider organizations appear here once they
              have completed onboarding.
            </p>
          ) : (
            <div className="bpx-stack">
              <input className="bpx-input" value={query} onChange={e => setQuery(e.target.value)}
                placeholder="Search providers by name or trade…" />
              <div style={{ maxHeight: 224, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
                {candidates.length === 0 ? (
                  <p style={{ fontSize: 13, color: '#6b7280' }}>
                    {invitedIds.size > 0 && !query
                      ? 'Everyone in your directory is already invited.'
                      : 'No providers match that search.'}
                  </p>
                ) : candidates.map(o => (
                  <label key={o.id} className="bpx-row" style={{
                    justifyContent: 'space-between', padding: '10px 12px', borderRadius: 11,
                    border: '1px solid #2A2A2A', cursor: 'pointer', flexWrap: 'nowrap',
                    background: picked.has(o.id) ? 'rgba(234,88,12,0.12)' : 'transparent',
                  }}>
                    <span className="bpx-row" style={{ flexWrap: 'nowrap', minWidth: 0 }}>
                      <Building2 size={14} style={{ color: '#6b7280', flexShrink: 0 }} />
                      <span style={{ fontSize: 13.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.name}</span>
                      <span style={{ fontSize: 11, color: '#6b7280', textTransform: 'capitalize' }}>{o.type}</span>
                    </span>
                    <input type="checkbox" checked={picked.has(o.id)} onChange={() => toggle(o.id)}
                      style={{ width: 18, height: 18, accentColor: '#ea580c', flexShrink: 0 }} />
                  </label>
                ))}
              </div>
              <div className="bpx-row" style={{ justifyContent: 'flex-end' }}>
                <button onClick={send} disabled={busy || picked.size === 0}
                  className="bpx-btn bpx-btn-primary" style={{ opacity: busy || picked.size === 0 ? 0.4 : 1 }}>
                  {busy ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
                  Invite {picked.size || ''}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {request.status === 'draft' && invitations.length > 0 && (
        <p style={{ fontSize: 11.5, color: '#6b7280' }}>
          Invited providers cannot see this request until you open it for bids.
        </p>
      )}
    </div>
  );
}

// ── provider panel ───────────────────────────────────────────────────────────

function ProviderPanel({ request, myBid, myOrgId, onSubmit }: {
  request: BidRequest; myBid: Bid | null; myOrgId: string;
  onSubmit: (orgId: string, amount: number, notes: string) => void;
}) {
  const [amount, setAmount] = useState(myBid?.amount ? String(myBid.amount) : '');
  const [notes, setNotes] = useState(myBid?.notes || '');
  const [busy, setBusy] = useState(false);

  const closed = request.status !== 'open';
  const decided = myBid?.status === 'won' || myBid?.status === 'lost';

  if (decided) {
    return (
      <div className="bpx-row" style={{ padding: 16, borderRadius: 14, background: '#1A1A1A', border: '1px solid #2A2A2A' }}>
        {myBid?.status === 'won'
          ? <><Trophy size={19} style={{ color: '#a78bfa' }} /><span style={{ fontWeight: 800 }}>You won this job at {usd(myBid.amount)}.</span></>
          : <><X size={19} style={{ color: '#6b7280' }} /><span style={{ color: '#9ca3af' }}>This job went to another provider.</span></>}
      </div>
    );
  }

  if (closed) {
    return (
      <div style={{ padding: 16, borderRadius: 14, background: '#1A1A1A', border: '1px solid #2A2A2A', fontSize: 13.5, color: '#9ca3af' }}>
        Bidding is {request.status} on this request.
        {myBid && <> Your bid of <span style={{ color: '#fff', fontWeight: 700 }}>{usd(myBid.amount)}</span> is recorded.</>}
      </div>
    );
  }

  const submit = async () => {
    const n = parseFloat(amount);
    if (!Number.isFinite(n) || n <= 0) { toast.error('Enter a bid amount.'); return; }
    setBusy(true);
    try { await onSubmit(myOrgId, n, notes.trim()); } finally { setBusy(false); }
  };

  return (
    <div style={{ padding: 16, borderRadius: 14, background: '#1A1A1A', border: '1px solid #2A2A2A', display: 'flex', flexDirection: 'column', gap: 14 }}>
      <h4 className="bpx-flabel">{myBid ? 'Revise your bid' : 'Submit your bid'}</h4>
      <div className="bpx-row" style={{ alignItems: 'flex-end', gap: 12 }}>
        <div className="bpx-field" style={{ width: 160 }}>
          <label>Amount (USD)</label>
          <input className="bpx-input" value={amount} onChange={e => setAmount(e.target.value)}
            inputMode="decimal" placeholder="0.00" style={{ fontVariantNumeric: 'tabular-nums' }} />
        </div>
        <div className="bpx-field" style={{ flex: '1 1 220px', minWidth: 0 }}>
          <label>Notes (optional)</label>
          <input className="bpx-input" value={notes} onChange={e => setNotes(e.target.value)}
            placeholder="Scope, exclusions, lead time…" />
        </div>
        <button onClick={submit} disabled={busy} className="bpx-btn bpx-btn-primary" style={{ opacity: busy ? 0.4 : 1 }}>
          {busy ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
          {myBid ? 'Update bid' : 'Submit bid'}
        </button>
      </div>
      <p style={{ fontSize: 11.5, color: '#4b5563' }}>Sealed bid — other providers cannot see your price.</p>
    </div>
  );
}

// ── create modal ─────────────────────────────────────────────────────────────

function CreateRequestModal({ orgs, onClose, onCreated }: {
  orgs: Org[]; onClose: () => void; onCreated: () => void;
}) {
  const [orgId, setOrgId] = useState(orgs[0]?.id || '');
  const [title, setTitle] = useState('');
  const [trade, setTrade] = useState('');
  const [description, setDescription] = useState('');
  const [siteAddress, setSiteAddress] = useState('');
  const [low, setLow] = useState('');
  const [high, setHigh] = useState('');
  const [dueAt, setDueAt] = useState('');
  const [isEmergency, setIsEmergency] = useState(false);
  const [refusalHours, setRefusalHours] = useState('');
  const [coords, setCoords] = useState<Coords | null>(null);
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [mediaDraft, setMediaDraft] = useState('');
  const [busy, setBusy] = useState(false);

  const addMedia = () => {
    const raw = mediaDraft.trim();
    if (!raw) return;
    // Only http(s) may be stored. A javascript: or data: URL here would later
    // be rendered as a link or a <video src> for everyone invited to the job.
    try {
      const u = new URL(raw);
      if (u.protocol !== 'http:' && u.protocol !== 'https:') throw new Error('scheme');
      setMediaUrls(list => [...list, u.href]);
      setMediaDraft('');
    } catch {
      toast.error('Give a full http or https link to the photo or video.');
    }
  };

  const create = async () => {
    if (!title.trim()) { toast.error('Give the request a title.'); return; }
    const lo = low ? parseFloat(low) : null;
    const hi = high ? parseFloat(high) : null;
    // Mirrors the budget_range_sane CHECK so the person gets a sentence rather
    // than a constraint violation.
    if (lo !== null && hi !== null && hi < lo) { toast.error('The high budget must be at least the low budget.'); return; }

    setBusy(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();

      const row: Record<string, any> = {
        org_id: orgId,
        title: title.trim(),
        trade: trade.trim() || null,
        description: description.trim() || null,
        site_address: siteAddress.trim() || null,
        budget_low: lo, budget_high: hi,
        due_at: dueAt ? new Date(dueAt).toISOString() : null,
        status: 'draft',
        created_by: session?.user?.id || null,
      };

      // Only sent when set, so this insert still succeeds against a database
      // where migration 011 has not been applied.
      if (isEmergency) row.is_emergency = true;
      if (coords) { row.latitude = coords.latitude; row.longitude = coords.longitude; }
      if (refusalHours) {
        const hrs = parseFloat(refusalHours);
        if (Number.isFinite(hrs) && hrs > 0) {
          row.first_refusal_until = new Date(Date.now() + hrs * 3_600_000).toISOString();
          row.first_refusal_org_id = orgId;
        }
      }

      const { error, data } = await supabase.from('bid_requests').insert(row).select();
      if (error) throw error;
      if (!data?.length) throw new Error('You do not have permission to post work for that organization.');

      // Media is attached after the request exists, because the rows reference
      // it. A failure here leaves a valid request with no photographs, which is
      // recoverable — so it is reported without discarding the request.
      if (mediaUrls.length) {
        const requestId = data[0].id;
        const { error: mediaErr } = await supabase.from('bid_request_media').insert(
          mediaUrls.map((url, i) => ({
            bid_request_id: requestId,
            kind: /\.(mp4|mov|webm|m4v)(\?|$)/i.test(url) ? 'video' : 'photo',
            url,
            sort_order: i,
            uploaded_by: session?.user?.id || null,
          })),
        );
        if (mediaErr) {
          toast.error('The request was created, but the photos could not be attached.');
        }
      }

      toast.success('Request created as a draft. Invite providers, then open it for bids.');
      onCreated();
    } catch (err: any) {
      console.error('[Exchange] create:', err);
      toast.error(err?.message || 'Could not create that request.');
    } finally { setBusy(false); }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.72)', display: 'grid',
      placeItems: 'center', padding: 16, zIndex: 50,
    }} onClick={onClose}>
      <div style={{
        background: '#1A1A1A', border: '1px solid #2A2A2A', borderRadius: 20,
        width: '100%', maxWidth: 680, maxHeight: '90vh', overflowY: 'auto',
      }} onClick={e => e.stopPropagation()}>
        <div className="bpx-modal-head">
          <h3 style={{ fontSize: 17, fontWeight: 800 }}>Post work to the Exchange</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        <div className="bpx-modal-body">
          {orgs.length > 1 && (
            <div className="bpx-field">
              <label>Posting as</label>
              <select className="bpx-input" value={orgId} onChange={e => setOrgId(e.target.value)}>
                {orgs.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
              </select>
            </div>
          )}

          <div className="bpx-field">
            <label>Title</label>
            <input className="bpx-input" value={title} onChange={e => setTitle(e.target.value)}
              placeholder="Deck framing — 24 Elm St" />
          </div>

          <div className="bpx-grid2">
            <div className="bpx-field">
              <label>Trade</label>
              <input className="bpx-input" value={trade} onChange={e => setTrade(e.target.value)} placeholder="framing" />
            </div>
            <div className="bpx-field">
              <label>Bids due</label>
              <input className="bpx-input" type="datetime-local" value={dueAt} onChange={e => setDueAt(e.target.value)} />
            </div>
          </div>

          <div className="bpx-field">
            <label>Site address</label>
            <input className="bpx-input" value={siteAddress} onChange={e => setSiteAddress(e.target.value)}
              placeholder="24 Elm St, Nashua NH" />
            <div className="bpx-row" style={{ gap: 8 }}>
              <button type="button" className="bpx-btn" style={{ minHeight: 38 }}
                onClick={() => requestOrigin(c => { setCoords(c); if (c) toast.success('Location attached to this request.'); })}>
                <MapPin size={14} /> {coords ? 'Location attached' : 'Use my current location'}
              </button>
              {coords && (
                <span style={{ fontSize: 11.5, color: '#6b7280' }}>
                  {coords.latitude.toFixed(4)}, {coords.longitude.toFixed(4)}
                </span>
              )}
            </div>
            <span style={{ fontSize: 11.5, color: '#6b7280' }}>
              Without coordinates this job cannot appear in a distance search.
            </span>
          </div>

          <div className="bpx-grid2">
            <div className="bpx-field">
              <label>Budget low</label>
              <input className="bpx-input" value={low} onChange={e => setLow(e.target.value)}
                inputMode="decimal" placeholder="8000" style={{ fontVariantNumeric: 'tabular-nums' }} />
            </div>
            <div className="bpx-field">
              <label>Budget high</label>
              <input className="bpx-input" value={high} onChange={e => setHigh(e.target.value)}
                inputMode="decimal" placeholder="12000" style={{ fontVariantNumeric: 'tabular-nums' }} />
            </div>
          </div>

          <div className="bpx-field">
            <label>Scope</label>
            <textarea className="bpx-input" value={description} onChange={e => setDescription(e.target.value)}
              rows={4} placeholder="What is included, what is not, materials, access…"
              style={{ resize: 'vertical', minHeight: 96 }} />
          </div>

          {/* photos and video */}
          <div className="bpx-field">
            <label>Photos and video</label>
            <div className="bpx-row" style={{ gap: 8, flexWrap: 'nowrap' }}>
              <input className="bpx-input" value={mediaDraft} onChange={e => setMediaDraft(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addMedia(); } }}
                placeholder="https://…/site-photo.jpg" />
              <button type="button" className="bpx-btn" style={{ minHeight: 44 }} onClick={addMedia}>Add</button>
            </div>
            {mediaUrls.length > 0 && (
              <div className="bpx-media" style={{ marginTop: 8 }}>
                {mediaUrls.map((u, i) => (
                  <span key={u + i} className="bpx-thumb" title={u}>
                    <img src={u} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <button type="button" onClick={() => setMediaUrls(list => list.filter((_, j) => j !== i))}
                      style={{
                        position: 'absolute', top: 2, right: 2, background: 'rgba(0,0,0,.7)', border: 'none',
                        borderRadius: 6, color: '#fff', cursor: 'pointer', display: 'grid', placeItems: 'center', padding: 2,
                      }}>
                      <X size={11} />
                    </button>
                  </span>
                ))}
              </div>
            )}
            <span style={{ fontSize: 11.5, color: '#6b7280' }}>
              A provider cannot price framing from a sentence. Photographs get you closer prices.
            </span>
          </div>

          {/* marketplace mechanics */}
          <div className="bpx-grid2">
            <div className="bpx-field">
              <label>Priority</label>
              <button type="button" className="bpx-tog" data-on={isEmergency}
                onClick={() => setIsEmergency(v => !v)} style={{ minHeight: 44 }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <Siren size={14} /> {isEmergency ? 'Emergency — jumps the queue' : 'Mark as emergency'}
                </span>
              </button>
            </div>
            <div className="bpx-field">
              <label>First refusal (hours)</label>
              <input className="bpx-input" value={refusalHours} onChange={e => setRefusalHours(e.target.value)}
                inputMode="numeric" placeholder="24" style={{ fontVariantNumeric: 'tabular-nums' }} />
              <span style={{ fontSize: 11.5, color: '#6b7280' }}>
                Leave blank to open it to every provider immediately.
              </span>
            </div>
          </div>
        </div>

        <div className="bpx-modal-foot">
          <p style={{ fontSize: 11.5, color: '#6b7280' }}>
            Created as a draft — providers cannot see it until you open it.
          </p>
          <div className="bpx-row" style={{ gap: 8 }}>
            <button onClick={onClose} className="bpx-btn">Cancel</button>
            <button onClick={create} disabled={busy} className="bpx-btn bpx-btn-primary" style={{ opacity: busy ? 0.4 : 1 }}>
              {busy ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />} Create draft
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
