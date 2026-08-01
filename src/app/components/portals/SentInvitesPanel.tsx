import { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner@2.0.3';
import {
  Send, RefreshCw, CheckCircle2, Clock, AlertTriangle, Mail, Phone, Search, Users,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { projectId } from '../../utils/supabase/info';

const SERVER = `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6`;

interface Invite {
  applicationId: string;
  name: string;
  email: string;
  phone: string;
  portalType: string;
  inviteStatus: string;
  emailProvider: string;
  smsSent: boolean;
  inviteNotice: string;
  smsNotice: string;
  sentCount: number;
  lastSentAt: string | null;
  acceptedAt: string | null;
  createdAt: string | null;
}

const PORTAL_LABELS: Record<string, string> = {
  customer: 'Customer', landlord: 'Landlord', property_manager: 'Property Manager',
  condo_manager: 'Condo Manager', vendor: 'Vendor', subcontractor: 'Subcontractor',
  employee: 'Employee', advertiser: 'Advertiser', investor: 'Investor', territory_owner: 'Territory Owner',
};

function timeAgo(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function StatusBadge({ invite }: { invite: Invite }) {
  const s = invite.inviteStatus;
  if (s === 'accepted') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-500/15 text-green-400 border border-green-500/30">
        <CheckCircle2 className="w-3.5 h-3.5" /> Accepted
      </span>
    );
  }
  if (s === 'sent') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/15 text-blue-400 border border-blue-500/30">
        <Clock className="w-3.5 h-3.5" /> Invited · awaiting
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30">
      <AlertTriangle className="w-3.5 h-3.5" /> Needs attention
    </span>
  );
}

export default function SentInvitesPanel() {
  const { session } = useAuth();
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);
  const [resending, setResending] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  const load = useCallback(async () => {
    if (!session?.access_token) { setLoading(false); return; }
    setLoading(true);
    try {
      const res = await fetch(`${SERVER}/owner-provisioning/invites`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to load invites.');
      setInvites(data.invites || []);
    } catch (e: any) {
      console.error('Loading sent invites failed:', e);
      toast.error(e.message || 'Could not load sent invites.');
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => { load(); }, [load]);

  const resend = async (invite: Invite, channels: { sendEmail: boolean; sendSms: boolean }) => {
    if (!session?.access_token) { toast.error('Sign in again to resend.'); return; }
    setResending(invite.applicationId);
    try {
      const res = await fetch(`${SERVER}/owner-provisioning/invites/${invite.applicationId}/resend`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(channels),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Resend failed.');
      const inv = data.invite || {};
      if (inv.invitationSent || inv.smsSent) {
        toast.success(`Invite resent to ${invite.name || invite.email}.`);
      } else {
        toast.warning(inv.inviteNotice || inv.smsNotice || 'Resend attempted, but no channel confirmed delivery.');
      }
      await load();
    } catch (e: any) {
      console.error('Resend invite failed:', e);
      toast.error(e.message || 'Could not resend invite.');
    } finally {
      setResending(null);
    }
  };

  const filtered = invites.filter((i) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return [i.name, i.email, i.phone, PORTAL_LABELS[i.portalType] || i.portalType].some((v) => String(v || '').toLowerCase().includes(q));
  });

  const stats = {
    total: invites.length,
    accepted: invites.filter((i) => i.inviteStatus === 'accepted').length,
    pending: invites.filter((i) => i.inviteStatus === 'sent').length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Send className="w-6 h-6 text-orange-400" /> Sent Invites
          </h2>
          <p className="text-gray-400 text-sm mt-1">Track every portal invitation, see who's accepted, and resend in one click.</p>
        </div>
        <button
          onClick={load}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#2A2A2A] text-white text-sm font-medium hover:bg-[#333] transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-4">
          <div className="flex items-center gap-2 text-gray-400 text-xs font-medium"><Users className="w-4 h-4" /> Total sent</div>
          <div className="text-2xl font-bold text-white mt-1">{stats.total}</div>
        </div>
        <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-4">
          <div className="flex items-center gap-2 text-gray-400 text-xs font-medium"><CheckCircle2 className="w-4 h-4 text-green-400" /> Accepted</div>
          <div className="text-2xl font-bold text-green-400 mt-1">{stats.accepted}</div>
        </div>
        <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-4">
          <div className="flex items-center gap-2 text-gray-400 text-xs font-medium"><Clock className="w-4 h-4 text-blue-400" /> Awaiting</div>
          <div className="text-2xl font-bold text-blue-400 mt-1">{stats.pending}</div>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name, email, phone, or portal…"
          className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-[#1A1A1A] border border-[#2A2A2A] text-white text-sm placeholder-gray-500 focus:outline-none focus:border-orange-500"
        />
      </div>

      {/* List */}
      {loading ? (
        <div className="text-center py-16 text-gray-500">Loading invites…</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <Send className="w-10 h-10 mx-auto mb-3 opacity-40" />
          {invites.length === 0 ? 'No invites sent yet. Create a portal to send your first invitation.' : 'No invites match your search.'}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((invite) => (
            <div key={invite.applicationId} className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-4 flex flex-col lg:flex-row lg:items-center gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="font-semibold text-white truncate">{invite.name || invite.email}</span>
                  <span className="px-2 py-0.5 rounded-md text-xs font-medium bg-orange-500/15 text-orange-400 border border-orange-500/30">
                    {PORTAL_LABELS[invite.portalType] || invite.portalType}
                  </span>
                  <StatusBadge invite={invite} />
                </div>
                <div className="flex items-center gap-4 mt-2 text-xs text-gray-400 flex-wrap">
                  {invite.email && <span className="inline-flex items-center gap-1"><Mail className="w-3.5 h-3.5" /> {invite.email}</span>}
                  {invite.phone && <span className="inline-flex items-center gap-1"><Phone className="w-3.5 h-3.5" /> {invite.phone}</span>}
                  <span>Sent {invite.sentCount}× · last {timeAgo(invite.lastSentAt)}</span>
                  {invite.acceptedAt && <span className="text-green-400">Accepted {timeAgo(invite.acceptedAt)}</span>}
                </div>
                {(invite.inviteNotice || invite.smsNotice) && invite.inviteStatus !== 'accepted' && (
                  <div className="mt-2 text-xs text-amber-400/90">{invite.inviteNotice || invite.smsNotice}</div>
                )}
              </div>
              {invite.inviteStatus !== 'accepted' && (
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => resend(invite, { sendEmail: true, sendSms: false })}
                    disabled={resending === invite.applicationId}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-orange-500 text-white text-sm font-medium hover:bg-orange-600 transition-colors disabled:opacity-50"
                  >
                    <Mail className="w-4 h-4" /> Resend email
                  </button>
                  {invite.phone && (
                    <button
                      onClick={() => resend(invite, { sendEmail: false, sendSms: true })}
                      disabled={resending === invite.applicationId}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#2A2A2A] text-white text-sm font-medium hover:bg-[#333] transition-colors disabled:opacity-50"
                    >
                      <Phone className="w-4 h-4" /> Text
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
