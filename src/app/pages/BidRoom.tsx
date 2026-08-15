/**
 * BidRoom — the first screen running entirely on the platform core.
 *
 * Unlike every other page in this app, it talks to Postgres directly through
 * supabase-js with the signed-in user's own session rather than going through
 * the edge function. That is deliberate: the bid room's rules live in RLS
 * (migrations 003/004), so the database decides what each person may see and
 * write. A subcontractor physically cannot read a rival's price — not because
 * this file remembers to filter it out, but because the row never arrives.
 *
 * One consequence worth understanding while reading this: THERE IS NO ROLE
 * SWITCH on the queries. Operator and subcontractor run the identical fetch;
 * RLS returns different rows to each. The UI only partitions what came back
 * into "work I posted" and "work I was invited to".
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Gavel, Plus, Loader2, RefreshCw, Users, Clock, CheckCircle2, X,
  AlertTriangle, Send, Trophy, FileText, Building2, Inbox, UserPlus,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../lib/supabase';
import { projectId, publicAnonKey } from '../utils/supabase/info';

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

interface Invitation {
  id: string;
  bid_request_id: string;
  org_id: string;
  created_at: string;
}

// ── helpers ──────────────────────────────────────────────────────────────────

const usd = (n: number | null | undefined) =>
  typeof n === 'number' && Number.isFinite(n)
    ? `$${n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
    : '—';

function dueLabel(due: string | null): { text: string; urgent: boolean } {
  if (!due) return { text: 'No deadline', urgent: false };
  const ms = new Date(due).getTime() - Date.now();
  if (ms < 0) return { text: 'Deadline passed', urgent: true };
  const days = Math.floor(ms / 86_400_000);
  if (days === 0) return { text: 'Due today', urgent: true };
  if (days === 1) return { text: 'Due tomorrow', urgent: true };
  return { text: `Due in ${days} days`, urgent: days <= 3 };
}

const STATUS_STYLE: Record<RequestStatus, { bg: string; border: string; fg: string; label: string }> = {
  draft:     { bg: 'rgba(148,163,184,0.12)', border: 'rgba(148,163,184,0.35)', fg: '#cbd5e1', label: 'Draft' },
  open:      { bg: 'rgba(16,185,129,0.14)',  border: 'rgba(16,185,129,0.40)',  fg: '#34d399', label: 'Open' },
  closed:    { bg: 'rgba(234,88,12,0.14)',   border: 'rgba(234,88,12,0.40)',   fg: '#fb923c', label: 'Closed' },
  awarded:   { bg: 'rgba(124,58,237,0.16)',  border: 'rgba(124,58,237,0.40)',  fg: '#a78bfa', label: 'Awarded' },
  cancelled: { bg: 'rgba(239,68,68,0.12)',   border: 'rgba(239,68,68,0.35)',   fg: '#f87171', label: 'Cancelled' },
};

function StatusPill({ status }: { status: RequestStatus }) {
  const s = STATUS_STYLE[status];
  return (
    <span
      className="px-2.5 py-1 rounded-lg text-xs font-bold tracking-wide uppercase"
      style={{ background: s.bg, border: `1px solid ${s.border}`, color: s.fg }}
    >
      {s.label}
    </span>
  );
}

function Stat({ icon: Icon, label, value, tone = '#ea580c' }: {
  icon: any; label: string; value: string; tone?: string;
}) {
  return (
    <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-5 flex-1 min-w-[160px]">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-4 h-4" style={{ color: tone }} />
        <span className="text-xs text-gray-400 uppercase tracking-wide">{label}</span>
      </div>
      <div className="text-2xl font-bold text-white tabular-nums">{value}</div>
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

  const [tab, setTab] = useState<'posted' | 'invited'>('posted');
  const [openRequestId, setOpenRequestId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  // Provider directory. Only populated for platform operators — migration 005
  // grants them, and only them, read access to provider-type orgs. Everyone
  // else gets an empty list from RLS, which is why the invite UI simply does
  // not render for them rather than being conditionally hidden.
  const [directory, setDirectory] = useState<Org[]>([]);

  const myOrgIds = useMemo(() => new Set(myOrgs.map(o => o.id)), [myOrgs]);

  // Orgs I can act as an owner/admin for — mirrors my_admin_org_ids() in SQL,
  // and is what decides whether the "New request" affordance is offered at all.
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
      if (!session?.user) { setFatal('Sign in to use the bid room.'); return; }

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
      console.error('[BidRoom] load failed:', err);
      setFatal(err?.message || 'Could not load the bid room.');
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

  const stats = useMemo(() => {
    const openPosted = posted.filter(r => r.status === 'open').length;
    const received = bids.filter(b => posted.some(r => r.id === b.bid_request_id)).length;
    const awaiting = posted.filter(r => r.status === 'open' && bidsFor(r.id).length > 0).length;
    const myOpenInvites = invited.filter(r => r.status === 'open' && !myBidFor(r.id)).length;
    const myWins = bids.filter(b => myOrgIds.has(b.org_id) && b.status === 'won').length;
    return { openPosted, received, awaiting, myOpenInvites, myWins };
  }, [posted, invited, bids, bidsFor, myBidFor, myOrgIds]);

  // ── actions ────────────────────────────────────────────────────────────────

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
      console.error('[BidRoom] submitBid:', err);
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
          const failed = (out.results || []).filter((r: any) => !r.sent);
          notice += out.sent ? ` ${out.sent} notified by email.` : '';
          if (failed.length) {
            toast.error(
              `Not notified: ${failed.map((f: any) => `${f.org} (${f.reason})`).join(', ')}. ` +
              `They will still see the invitation when they open the bid room.`,
              { duration: 9000 },
            );
          }
        } else {
          toast.error('Invitations saved, but the notification email could not be sent.');
        }
      } catch (notifyErr) {
        console.error('[BidRoom] notify failed:', notifyErr);
        toast.error('Invitations saved, but the notification email could not be sent.');
      }

      toast.success(notice);
      await load();
    } catch (err: any) {
      console.error('[BidRoom] invite:', err);
      // The unique (bid_request_id, org_id) constraint is the backstop against
      // double-inviting; say so plainly instead of surfacing a Postgres code.
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
      console.error('[BidRoom] awardBid:', err);
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
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="flex items-center gap-3 text-gray-400">
          <Loader2 className="w-5 h-5 animate-spin text-orange-500" />
          Loading the bid room…
        </div>
      </div>
    );
  }

  if (fatal) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center p-6">
        <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-8 max-w-md text-center">
          <AlertTriangle className="w-8 h-8 text-orange-500 mx-auto mb-4" />
          <p className="text-white font-bold mb-2">The bid room could not load</p>
          <p className="text-sm text-gray-400 mb-5">{fatal}</p>
          <button onClick={load} className="px-4 py-2 rounded-xl text-sm font-bold text-white" style={{ background: '#ea580c' }}>
            Try again
          </button>
        </div>
      </div>
    );
  }

  // Membership exists but is still `invited` — the person completed nothing yet.
  // Worth calling out explicitly, because otherwise this renders as a bare empty
  // page and looks broken rather than pending.
  const hasActiveMembership = memberships.some(m => m.status === 'active');
  if (!hasActiveMembership) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center p-6">
        <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-8 max-w-lg text-center">
          <Inbox className="w-8 h-8 text-orange-500 mx-auto mb-4" />
          <p className="text-white font-bold mb-2">Your portal access is still pending</p>
          <p className="text-sm text-gray-400">
            You have been invited but have not finished your application yet. Complete
            your profile and the bid room will open automatically.
          </p>
          {onNavigate && (
            <button onClick={() => onNavigate('portal-onboarding')}
              className="mt-5 px-4 py-2 rounded-xl text-sm font-bold text-white" style={{ background: '#ea580c' }}>
              Finish my application
            </button>
          )}
        </div>
      </div>
    );
  }

  const list = tab === 'posted' ? posted : invited;

  return (
    <div className="min-h-screen bg-[#0A0A0A] p-6 lg:p-8">
      {/* header */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl flex items-center justify-center"
                 style={{ background: 'linear-gradient(135deg,#ea580c,#f97316)' }}>
              <Gavel className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Bid Room</h1>
              <p className="text-sm text-gray-400">
                Post work, invite providers, and compare sealed bids.
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} className="p-2.5 rounded-xl text-gray-400 hover:text-white border border-[#2A2A2A]" title="Reload">
            <RefreshCw className="w-4 h-4" />
          </button>
          {adminOrgs.length > 0 && (
            <button onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white"
              style={{ background: '#ea580c' }}>
              <Plus className="w-4 h-4" /> New request
            </button>
          )}
        </div>
      </div>

      {/* stats */}
      <div className="flex flex-wrap gap-3 mb-6">
        {adminOrgs.length > 0 ? (
          <>
            <Stat icon={FileText} label="Open requests" value={String(stats.openPosted)} />
            <Stat icon={Users} label="Bids received" value={String(stats.received)} tone="#38bdf8" />
            <Stat icon={Clock} label="Awaiting decision" value={String(stats.awaiting)} tone="#fbbf24" />
          </>
        ) : (
          <>
            <Stat icon={Inbox} label="Open invitations" value={String(stats.myOpenInvites)} />
            <Stat icon={Send} label="Bids submitted" value={String(bids.filter(b => myOrgIds.has(b.org_id)).length)} tone="#38bdf8" />
            <Stat icon={Trophy} label="Jobs won" value={String(stats.myWins)} tone="#a78bfa" />
          </>
        )}
      </div>

      {/* tabs */}
      <div className="flex items-center gap-1 mb-5 border-b border-[#2A2A2A]">
        {([['posted', `Posted by us (${posted.length})`], ['invited', `Our invitations (${invited.length})`]] as const).map(([k, lbl]) => (
          <button key={k} onClick={() => { setTab(k); setOpenRequestId(null); }}
            className={`px-4 py-2.5 text-sm font-bold border-b-2 -mb-px transition-colors ${
              tab === k ? 'text-white' : 'text-gray-500 hover:text-gray-300 border-transparent'
            }`}
            style={tab === k ? { borderColor: '#ea580c' } : undefined}>
            {lbl}
          </button>
        ))}
      </div>

      {/* list */}
      {list.length === 0 ? (
        <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-12 text-center">
          <Gavel className="w-8 h-8 text-gray-600 mx-auto mb-3" />
          <p className="text-white font-bold mb-1">
            {tab === 'posted' ? 'No requests posted yet' : 'No invitations yet'}
          </p>
          <p className="text-sm text-gray-500">
            {tab === 'posted'
              ? 'Post work to the bid room and invite providers to price it.'
              : 'When someone invites you to bid, the job appears here.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {list.map(request => {
            const rBids = bidsFor(request.id);
            const rInvites = invitations.filter(i => i.bid_request_id === request.id);
            const low = rBids.filter(b => typeof b.amount === 'number').sort((a, b) => (a.amount! - b.amount!))[0];
            const mine = myBidFor(request.id);
            const due = dueLabel(request.due_at);
            const isOwner = myOrgIds.has(request.org_id);
            const expanded = openRequestId === request.id;

            return (
              <div key={request.id} className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl overflow-hidden">
                <div className="p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <h3 className="text-white font-bold truncate">{request.title}</h3>
                        <StatusPill status={request.status} />
                        {mine && (
                          <span className="px-2 py-0.5 rounded-lg text-xs font-bold"
                                style={{ background: 'rgba(56,189,248,0.14)', border: '1px solid rgba(56,189,248,0.4)', color: '#38bdf8' }}>
                            {mine.status === 'won' ? 'You won' : mine.status === 'lost' ? 'Not selected' : `Your bid ${usd(mine.amount)}`}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-2 text-sm text-gray-400 flex-wrap">
                        {request.trade && <span className="capitalize">{request.trade}</span>}
                        <span className={due.urgent ? 'text-orange-400' : ''}>{due.text}</span>
                        {(request.budget_low || request.budget_high) && (
                          <span>Budget {usd(request.budget_low)}–{usd(request.budget_high)}</span>
                        )}
                        {request.site_address && <span className="truncate">{request.site_address}</span>}
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      {isOwner && (
                        <div className="text-right">
                          <div className="text-xs text-gray-500 uppercase tracking-wide">Bids</div>
                          <div className="text-lg font-bold text-white tabular-nums">
                            {rBids.length}<span className="text-gray-600 text-sm"> / {rInvites.length}</span>
                          </div>
                        </div>
                      )}
                      {isOwner && low && (
                        <div className="text-right">
                          <div className="text-xs text-gray-500 uppercase tracking-wide">Low bid</div>
                          <div className="text-lg font-bold tabular-nums" style={{ color: '#34d399' }}>{usd(low.amount)}</div>
                        </div>
                      )}
                      <button onClick={() => setOpenRequestId(expanded ? null : request.id)}
                        className="px-3.5 py-2 rounded-xl text-sm font-bold text-white border border-[#2A2A2A] hover:border-orange-500/40">
                        {expanded ? 'Hide' : isOwner ? 'View bids' : 'Open'}
                      </button>
                    </div>
                  </div>
                </div>

                {expanded && (
                  <div className="border-t border-[#2A2A2A] p-5 bg-[#141414]">
                    {request.description && (
                      <p className="text-sm text-gray-300 mb-4 whitespace-pre-wrap">{request.description}</p>
                    )}

                    {isOwner ? (
                      <OwnerPanel
                        request={request}
                        bids={rBids}
                        invitations={rInvites}
                        orgNames={orgNames}
                        directory={directory}
                        onAward={b => awardBid(request, b)}
                        onStatus={s => setRequestStatus(request, s)}
                        onInvite={ids => inviteProviders(request, ids)}
                        onUninvite={uninviteProvider}
                      />
                    ) : (
                      <ProviderPanel
                        request={request}
                        myBid={mine}
                        myOrgId={
                          // The org that was invited — not simply my first org, which
                          // would submit under the wrong entity for a person who
                          // belongs to several.
                          rInvites.find(i => myOrgIds.has(i.org_id))?.org_id
                          || myOrgs[0]?.id
                          || ''
                        }
                        onSubmit={(orgId, amount, notes) => submitBid(request, orgId, amount, notes)}
                      />
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

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
    <div>
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-bold text-white uppercase tracking-wide">Bids received</h4>
        <div className="flex gap-2">
          {request.status === 'draft' && (
            <button onClick={() => onStatus('open')} className="px-3 py-1.5 rounded-lg text-xs font-bold text-white" style={{ background: '#ea580c' }}>
              Open for bids
            </button>
          )}
          {request.status === 'open' && (
            <button onClick={() => onStatus('closed')} className="px-3 py-1.5 rounded-lg text-xs font-bold text-gray-300 border border-[#2A2A2A]">
              Close bidding
            </button>
          )}
        </div>
      </div>

      {sorted.length === 0 ? (
        <p className="text-sm text-gray-500 mb-4">
          No bids yet. {invitations.length} provider{invitations.length === 1 ? '' : 's'} invited.
        </p>
      ) : (
        <div className="space-y-2 mb-4">
          {sorted.map((b, i) => (
            <div key={b.id} className="flex items-center justify-between gap-4 p-3 rounded-xl bg-[#1A1A1A] border border-[#2A2A2A]">
              <div className="flex items-center gap-3 min-w-0">
                <Building2 className="w-4 h-4 text-gray-500 shrink-0" />
                <div className="min-w-0">
                  <div className="text-sm text-white font-medium truncate">
                    {orgNames[b.org_id] || 'Provider'}
                    {i === 0 && b.status !== 'lost' && (
                      <span className="ml-2 text-xs" style={{ color: '#34d399' }}>lowest</span>
                    )}
                  </div>
                  {b.notes && <div className="text-xs text-gray-500 truncate">{b.notes}</div>}
                </div>
              </div>
              <div className="flex items-center gap-4 shrink-0">
                <div className="text-lg font-bold text-white tabular-nums">{usd(b.amount)}</div>
                {b.status === 'won' ? (
                  <span className="flex items-center gap-1 text-xs font-bold" style={{ color: '#a78bfa' }}>
                    <Trophy className="w-3.5 h-3.5" /> Awarded
                  </span>
                ) : b.status === 'lost' ? (
                  <span className="text-xs text-gray-600">Not selected</span>
                ) : request.status === 'awarded' ? null : (
                  <button onClick={() => onAward(b)}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold text-white" style={{ background: 'rgba(124,58,237,0.9)' }}>
                    Award
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <InvitePanel
        request={request}
        invitations={invitations}
        bids={bids}
        orgNames={orgNames}
        directory={directory}
        onInvite={onInvite}
        onUninvite={onUninvite}
      />

      {notBid.length > 0 && (
        <p className="text-xs text-gray-500 mt-3">
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
    <div className="mt-5 pt-5 border-t border-[#2A2A2A]">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-bold text-white uppercase tracking-wide">
          Invited providers ({invitations.length})
        </h4>
        {canInvite && (
          <button onClick={() => setOpen(v => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white"
            style={{ background: open ? 'rgba(255,255,255,0.08)' : '#ea580c' }}>
            {open ? <>Close</> : <><UserPlus className="w-3.5 h-3.5" /> Invite providers</>}
          </button>
        )}
      </div>

      {invitations.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {invitations.map(i => {
            // Withdrawing an invitation after they have priced the work would
            // orphan a real bid, so that is not offered.
            const hasBid = bids.some(b => b.org_id === i.org_id);
            return (
              <span key={i.id}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid #2A2A2A', color: '#e5e7eb' }}>
                <Building2 className="w-3.5 h-3.5 text-gray-500" />
                {orgNames[i.org_id] || 'Provider'}
                {hasBid
                  ? <span style={{ color: '#34d399' }}>bid in</span>
                  : canInvite && (
                      <button onClick={() => onUninvite(i)} title="Withdraw invitation"
                        className="text-gray-600 hover:text-red-400"><X className="w-3.5 h-3.5" /></button>
                    )}
              </span>
            );
          })}
        </div>
      )}

      {open && (
        <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-4">
          {directory.length === 0 ? (
            <p className="text-sm text-gray-500">
              No providers available to invite. Provider organizations appear here once they
              have completed onboarding.
            </p>
          ) : (
            <>
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search providers by name or trade…"
                className="w-full mb-3 px-3 py-2 rounded-xl bg-[#0F0F0F] border border-[#2A2A2A] text-white text-sm outline-none focus:border-orange-500/50"
              />
              <div className="max-h-56 overflow-y-auto space-y-1.5 mb-3">
                {candidates.length === 0 ? (
                  <p className="text-sm text-gray-500 py-2">
                    {invitedIds.size > 0 && !query
                      ? 'Everyone in your directory is already invited.'
                      : 'No providers match that search.'}
                  </p>
                ) : candidates.map(o => {
                  const on = picked.has(o.id);
                  return (
                    <button key={o.id} onClick={() => toggle(o.id)}
                      className="w-full flex items-center justify-between gap-3 p-2.5 rounded-lg text-left transition-colors"
                      style={{
                        background: on ? 'rgba(234,88,12,0.12)' : 'rgba(255,255,255,0.03)',
                        border: `1px solid ${on ? 'rgba(234,88,12,0.45)' : '#2A2A2A'}`,
                      }}>
                      <span className="flex items-center gap-2.5 min-w-0">
                        <Building2 className="w-4 h-4 text-gray-500 shrink-0" />
                        <span className="min-w-0">
                          <span className="block text-sm text-white truncate">{o.name}</span>
                          <span className="block text-xs text-gray-500 capitalize">{o.type}</span>
                        </span>
                      </span>
                      {on && <CheckCircle2 className="w-4 h-4 shrink-0" style={{ color: '#ea580c' }} />}
                    </button>
                  );
                })}
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs text-gray-500">
                  {picked.size ? `${picked.size} selected` : 'Select providers to invite'}
                </span>
                <button onClick={send} disabled={busy || picked.size === 0}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white disabled:opacity-40"
                  style={{ background: '#ea580c' }}>
                  {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  Send {picked.size || ''} invitation{picked.size === 1 ? '' : 's'}
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {request.status === 'draft' && invitations.length > 0 && (
        <p className="text-xs text-gray-500 mt-3">
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
      <div className="flex items-center gap-3 p-4 rounded-xl bg-[#1A1A1A] border border-[#2A2A2A]">
        {myBid?.status === 'won'
          ? <><Trophy className="w-5 h-5" style={{ color: '#a78bfa' }} />
              <span className="text-white font-bold">You won this job at {usd(myBid.amount)}.</span></>
          : <><X className="w-5 h-5 text-gray-500" />
              <span className="text-gray-400">This job went to another provider.</span></>}
      </div>
    );
  }

  if (closed) {
    return (
      <div className="p-4 rounded-xl bg-[#1A1A1A] border border-[#2A2A2A] text-sm text-gray-400">
        Bidding is {request.status} on this request.
        {myBid && <> Your bid of <span className="text-white font-bold">{usd(myBid.amount)}</span> is recorded.</>}
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
    <div className="p-4 rounded-xl bg-[#1A1A1A] border border-[#2A2A2A]">
      <h4 className="text-sm font-bold text-white uppercase tracking-wide mb-3">
        {myBid ? 'Revise your bid' : 'Submit your bid'}
      </h4>
      <div className="flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs text-gray-400 mb-1.5">Amount (USD)</label>
          <input value={amount} onChange={e => setAmount(e.target.value)} inputMode="decimal" placeholder="0.00"
            className="w-40 px-3 py-2 rounded-xl bg-[#0F0F0F] border border-[#2A2A2A] text-white tabular-nums focus:border-orange-500/50 outline-none" />
        </div>
        <div className="flex-1 min-w-[220px]">
          <label className="block text-xs text-gray-400 mb-1.5">Notes (optional)</label>
          <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Scope, exclusions, lead time…"
            className="w-full px-3 py-2 rounded-xl bg-[#0F0F0F] border border-[#2A2A2A] text-white focus:border-orange-500/50 outline-none" />
        </div>
        <button onClick={submit} disabled={busy}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white disabled:opacity-40"
          style={{ background: '#ea580c' }}>
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          {myBid ? 'Update bid' : 'Submit bid'}
        </button>
      </div>
      <p className="text-xs text-gray-600 mt-3">
        Sealed bid — other providers cannot see your price.
      </p>
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
  const [busy, setBusy] = useState(false);

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
      const { error, data } = await supabase.from('bid_requests').insert({
        org_id: orgId,
        title: title.trim(),
        trade: trade.trim() || null,
        description: description.trim() || null,
        site_address: siteAddress.trim() || null,
        budget_low: lo, budget_high: hi,
        due_at: dueAt ? new Date(dueAt).toISOString() : null,
        status: 'draft',
        created_by: session?.user?.id || null,
      }).select();
      if (error) throw error;
      if (!data?.length) throw new Error('You do not have permission to post work for that organization.');
      toast.success('Request created as a draft. Invite providers, then open it for bids.');
      onCreated();
    } catch (err: any) {
      console.error('[BidRoom] create:', err);
      toast.error(err?.message || 'Could not create that request.');
    } finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
           onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-[#2A2A2A]">
          <h3 className="text-lg font-bold text-white">New bid request</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-white"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-5 space-y-4">
          {orgs.length > 1 && (
            <Field label="Posting as">
              <select value={orgId} onChange={e => setOrgId(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-[#0F0F0F] border border-[#2A2A2A] text-white outline-none">
                {orgs.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
              </select>
            </Field>
          )}
          <Field label="Title">
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Deck framing — 24 Elm St"
              className="w-full px-3 py-2.5 rounded-xl bg-[#0F0F0F] border border-[#2A2A2A] text-white outline-none focus:border-orange-500/50" />
          </Field>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Trade"><input value={trade} onChange={e => setTrade(e.target.value)} placeholder="framing"
              className="w-full px-3 py-2.5 rounded-xl bg-[#0F0F0F] border border-[#2A2A2A] text-white outline-none focus:border-orange-500/50" /></Field>
            <Field label="Bids due"><input type="datetime-local" value={dueAt} onChange={e => setDueAt(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-[#0F0F0F] border border-[#2A2A2A] text-white outline-none focus:border-orange-500/50" /></Field>
          </div>
          <Field label="Site address">
            <input value={siteAddress} onChange={e => setSiteAddress(e.target.value)} placeholder="24 Elm St, Nashua NH"
              className="w-full px-3 py-2.5 rounded-xl bg-[#0F0F0F] border border-[#2A2A2A] text-white outline-none focus:border-orange-500/50" />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Budget low"><input value={low} onChange={e => setLow(e.target.value)} inputMode="decimal" placeholder="8000"
              className="w-full px-3 py-2.5 rounded-xl bg-[#0F0F0F] border border-[#2A2A2A] text-white tabular-nums outline-none focus:border-orange-500/50" /></Field>
            <Field label="Budget high"><input value={high} onChange={e => setHigh(e.target.value)} inputMode="decimal" placeholder="12000"
              className="w-full px-3 py-2.5 rounded-xl bg-[#0F0F0F] border border-[#2A2A2A] text-white tabular-nums outline-none focus:border-orange-500/50" /></Field>
          </div>
          <Field label="Scope">
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={4}
              placeholder="What is included, what is not, materials, access…"
              className="w-full px-3 py-2.5 rounded-xl bg-[#0F0F0F] border border-[#2A2A2A] text-white outline-none focus:border-orange-500/50 resize-y" />
          </Field>
        </div>

        <div className="flex items-center justify-between gap-3 p-5 border-t border-[#2A2A2A]">
          <p className="text-xs text-gray-500">Created as a draft — providers cannot see it until you open it.</p>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-bold text-gray-300 border border-[#2A2A2A]">Cancel</button>
            <button onClick={create} disabled={busy}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white disabled:opacity-40" style={{ background: '#ea580c' }}>
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />} Create draft
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs text-gray-400 mb-1.5 uppercase tracking-wide">{label}</label>
      {children}
    </div>
  );
}
