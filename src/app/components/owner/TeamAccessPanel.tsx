/**
 * The team, in one place: bring somebody on, and change what they can reach.
 *
 * WHAT THIS REPLACED
 *
 * `RoleManagementSystem` — 1350 lines under a header that read "FULLY
 * FUNCTIONAL - Real user database with assignments, Live permission toggling".
 * It made no network call of any kind. It was seeded with twenty invented
 * people (john@company.com, sarah@company.com) and every toggle was React
 * state that died when the tab closed. An owner could spend an afternoon
 * setting permissions in it and change nothing at all.
 *
 * WHAT ACTUALLY GOVERNS ACCESS
 *
 * One string: the role in `app_metadata`, which `trustedRole` reads and some
 * thirty route guards enforce. That is what the dropdown on each row writes,
 * through `POST /team/members/role`, and it is the whole of the access model —
 * so this screen shows roles rather than a wall of switches that would imply a
 * granularity the server does not have.
 *
 * WHY INVITING LIVES HERE TOO
 *
 * Eric asked for one place. The invitation already worked — it is the same
 * `owner-provisioning/invites` route the portals panel uses — but it sat on a
 * different screen from anything to do with access, and it could only ever
 * create an `employee`. It now carries the role, so somebody can be hired as a
 * project manager in one step instead of being invited as crew and promoted
 * afterwards.
 */
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  UserPlus, Users, Mail, Phone, User, Shield, Send, LoaderCircle,
  QrCode, MessageSquare, Ban, RotateCcw, Clock, CheckCircle2, AlertTriangle,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { API_BASE_URL } from '../../lib/apiConfig';

const SERVER = `${API_BASE_URL}/make-server-3eae23a6`;

/**
 * The roles this screen can hand out, and what each one means in plain words.
 *
 * The values must match `ASSIGNABLE_ROLES` on the server, which is the list
 * `mayAssignRole` will actually accept; anything else comes back 403. The
 * server returns its own copy with the team, and that copy wins — this is the
 * labelling, not the authority.
 */
const ROLE_LABELS: Record<string, { label: string; note: string }> = {
  owner: { label: 'Owner', note: 'Everything, including the books and other owners.' },
  admin: { label: 'Administrator', note: 'Everything day to day. Cannot appoint owners.' },
  management: { label: 'Management', note: 'Crew, scheduling and jobs across the company.' },
  project_manager: { label: 'Project Manager', note: 'Runs jobs, quotes and crews on their work.' },
  estimator: { label: 'Estimator', note: 'Builds quotes and pricing.' },
  office: { label: 'Office', note: 'Scheduling, invoicing and customer contact.' },
  employee: { label: 'Employee', note: 'Crew. Their own jobs, time and photos.' },
  staff: { label: 'Staff', note: 'General company access.' },
};

const labelFor = (role: string) => ROLE_LABELS[role]?.label || role || '—';

interface Member {
  id: string; email: string; name: string; phone: string; role: string;
  active: boolean; lastSignInAt: string | null; emailConfirmed: boolean;
  createdAt: string | null;
}

const inputClass =
  'w-full rounded-lg border border-[#2A2A2A] bg-[#1A1A1A] px-3 py-2 text-sm text-white placeholder-gray-500 outline-none focus:border-red-500';

function sinceLabel(iso: string | null): string {
  if (!iso) return 'never signed in';
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 30) return `${days} days ago`;
  return new Date(iso).toLocaleDateString();
}

export default function TeamAccessPanel() {
  const { session } = useAuth();
  const token = session?.access_token;

  const [members, setMembers] = useState<Member[]>([]);
  const [assignable, setAssignable] = useState<string[]>(Object.keys(ROLE_LABELS));
  const [actorEmail, setActorEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [savingEmail, setSavingEmail] = useState('');

  const [form, setForm] = useState({ name: '', email: '', phone: '', role: 'employee' });
  const [sendEmail, setSendEmail] = useState(true);
  const [sendSms, setSendSms] = useState(false);
  const [generateQr, setGenerateQr] = useState(false);
  const [inviting, setInviting] = useState(false);

  const load = useCallback(async () => {
    if (!token) { setLoading(false); setLoadError('Sign in again to see the team.'); return; }
    setLoading(true); setLoadError('');
    try {
      const res = await fetch(`${SERVER}/team/members`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok || !payload?.success) throw new Error(payload?.error || 'The team could not be read.');
      setMembers(payload.members || []);
      setActorEmail(String(payload.actorEmail || ''));
      if (Array.isArray(payload.assignableRoles) && payload.assignableRoles.length) {
        setAssignable(payload.assignableRoles);
      }
    } catch (err: any) {
      setLoadError(err?.message || 'The team could not be read.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const invite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.phone.trim()) {
      toast.error('Name, email and phone are all required.'); return;
    }
    if (!sendEmail && !sendSms && !generateQr) {
      toast.error('Pick at least one way to reach them — email, text, or a QR code.'); return;
    }
    if (!token) { toast.error('Sign in again before inviting anybody.'); return; }
    setInviting(true);
    try {
      const res = await fetch(`${SERVER}/owner-provisioning/invites`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name, email: form.email, phone: form.phone,
          portalType: 'employee',
          staffRole: form.role,
          sendEmail, sendSms, generateQr,
        }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok || !payload?.success) throw new Error(payload?.error || 'The invitation could not be sent.');

      /**
       * Report what actually went out, per channel.
       *
       * The server tells us whether each one landed, and saying "invited" when
       * the email bounced is how somebody ends up waiting on a message that was
       * never delivered.
       */
      const sent = payload.invite || {};
      const went = [
        sendEmail && sent.invitationSent && 'email',
        sendSms && sent.smsSent && 'text',
        generateQr && sent.qrDataUrl && 'QR code',
      ].filter(Boolean);
      if (went.length) {
        toast.success(`${form.name} invited as ${labelFor(form.role)} — sent by ${went.join(' and ')}.`);
      } else {
        toast.error(
          `The account was created, but nothing was delivered. ${sent.inviteNotice || sent.smsNotice || ''}`.trim(),
          { duration: 12000 },
        );
      }
      setForm({ name: '', email: '', phone: '', role: 'employee' });
      load();
    } catch (err: any) {
      toast.error(err?.message || 'The invitation could not be sent.');
    } finally {
      setInviting(false);
    }
  };

  const changeRole = async (member: Member, role: string) => {
    if (role === member.role) return;
    if (!token) { toast.error('Sign in again.'); return; }
    setSavingEmail(member.email);
    try {
      const res = await fetch(`${SERVER}/team/members/role`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: member.email, role }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok || !payload?.success) throw new Error(payload?.error || 'The role could not be changed.');
      setMembers(ms => ms.map(m => (m.email === member.email ? { ...m, role } : m)));
      toast.success(`${member.name || member.email} is now ${labelFor(role)}.`);
    } catch (err: any) {
      toast.error(err?.message || 'The role could not be changed.');
      // Put the dropdown back where it was; the server did not accept the change.
      setMembers(ms => [...ms]);
    } finally {
      setSavingEmail('');
    }
  };

  const setActive = async (member: Member, active: boolean) => {
    if (!token) { toast.error('Sign in again.'); return; }
    setSavingEmail(member.email);
    try {
      const res = await fetch(`${SERVER}/accounts/${active ? 'reactivate' : 'deactivate'}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: member.email, reason: active ? '' : 'Switched off from the team screen.' }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok || !payload?.success) throw new Error(payload?.error || 'That could not be changed.');
      setMembers(ms => ms.map(m => (m.email === member.email ? { ...m, active } : m)));
      toast.success(active ? `${member.email} can sign in again.` : `${member.email} is switched off.`);
    } catch (err: any) {
      toast.error(err?.message || 'That could not be changed.');
    } finally {
      setSavingEmail('');
    }
  };

  return (
    <div className="space-y-6">
      {/* ADD SOMEBODY */}
      <form onSubmit={invite} className="rounded-xl border border-[#2A2A2A] bg-[#111] p-5 space-y-4">
        <div className="flex items-center gap-2">
          <UserPlus className="h-5 w-5 text-red-500" />
          <h3 className="text-lg font-semibold text-white">Add someone to the team</h3>
        </div>
        <p className="text-sm text-gray-400">
          They get an email or a text with a link that signs them in and asks them to set a password.
          Their access is the role you pick here, and you can change it any time below.
        </p>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1">
            <span className="text-xs text-gray-400">Full name</span>
            <div className="relative">
              <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Jordan Smith" className={`${inputClass} pl-9`} />
            </div>
          </label>
          <label className="space-y-1">
            <span className="text-xs text-gray-400">Email</span>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
              <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                placeholder="jordan@email.com" className={`${inputClass} pl-9`} />
            </div>
          </label>
          <label className="space-y-1">
            <span className="text-xs text-gray-400">Mobile</span>
            <div className="relative">
              <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
              <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                placeholder="(555) 123-4567" className={`${inputClass} pl-9`} />
            </div>
          </label>
          <label className="space-y-1">
            <span className="text-xs text-gray-400">Role</span>
            <div className="relative">
              <Shield className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
              <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                className={`${inputClass} pl-9 appearance-none`}>
                {assignable.map(r => (
                  <option key={r} value={r} className="bg-[#1A1A1A] text-white">{labelFor(r)}</option>
                ))}
              </select>
            </div>
          </label>
        </div>

        <p className="text-xs text-gray-500">{ROLE_LABELS[form.role]?.note}</p>

        <div className="flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-2 text-sm text-gray-300">
            <input type="checkbox" checked={sendEmail} onChange={e => setSendEmail(e.target.checked)}
              className="h-4 w-4 accent-red-500" />
            <Mail className="h-3.5 w-3.5 text-gray-500" /> Email it
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-300">
            <input type="checkbox" checked={sendSms} onChange={e => setSendSms(e.target.checked)}
              className="h-4 w-4 accent-red-500" />
            <MessageSquare className="h-3.5 w-3.5 text-gray-500" /> Text it
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-300">
            <input type="checkbox" checked={generateQr} onChange={e => setGenerateQr(e.target.checked)}
              className="h-4 w-4 accent-red-500" />
            <QrCode className="h-3.5 w-3.5 text-gray-500" /> QR code to scan in person
          </label>
        </div>

        <button type="submit" disabled={inviting}
          className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500 disabled:opacity-60">
          {inviting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          {inviting ? 'Sending…' : 'Send the invitation'}
        </button>
      </form>

      {/* THE TEAM */}
      <div className="rounded-xl border border-[#2A2A2A] bg-[#111] p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-red-500" />
            <h3 className="text-lg font-semibold text-white">The team</h3>
            {!loading && <span className="text-sm text-gray-500">{members.length}</span>}
          </div>
          <button onClick={load} className="text-xs text-gray-400 hover:text-white">Refresh</button>
        </div>

        {loading && (
          <p className="flex items-center gap-2 text-sm text-gray-400">
            <LoaderCircle className="h-4 w-4 animate-spin" /> Reading the directory…
          </p>
        )}

        {!loading && loadError && (
          <p className="flex items-start gap-2 rounded-lg border border-amber-900/50 bg-amber-950/30 p-3 text-sm text-amber-200">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> {loadError}
          </p>
        )}

        {!loading && !loadError && members.length === 0 && (
          <p className="text-sm text-gray-400">
            Nobody holds a company role yet. Invite somebody above and they will appear here.
          </p>
        )}

        {!loading && !loadError && members.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-[#2A2A2A] text-left text-xs uppercase tracking-wide text-gray-500">
                  <th className="pb-2 pr-3 font-medium">Person</th>
                  <th className="pb-2 pr-3 font-medium">Role</th>
                  <th className="pb-2 pr-3 font-medium">Last signed in</th>
                  <th className="pb-2 font-medium">Account</th>
                </tr>
              </thead>
              <tbody>
                {members.map(m => {
                  const isSelf = m.email === actorEmail;
                  const busy = savingEmail === m.email;
                  return (
                    <tr key={m.id || m.email} className="border-b border-[#1F1F1F] last:border-0">
                      <td className="py-3 pr-3">
                        <div className="font-medium text-white">{m.name || '—'}{isSelf && <span className="ml-2 text-[10px] uppercase text-gray-500">you</span>}</div>
                        <div className="text-xs text-gray-500">{m.email}</div>
                      </td>
                      <td className="py-3 pr-3">
                        {isSelf ? (
                          /* Nobody changes their own role — the server refuses it, and a
                             sole owner who demotes themselves cannot undo it. */
                          <span className="text-gray-300">{labelFor(m.role)}</span>
                        ) : (
                          <select
                            value={m.role}
                            disabled={busy}
                            onChange={e => changeRole(m, e.target.value)}
                            className="rounded-lg border border-[#2A2A2A] bg-[#1A1A1A] px-2 py-1 text-sm text-white outline-none focus:border-red-500 disabled:opacity-50"
                          >
                            {/* A role the server no longer offers is still shown, so a row
                                never silently reads as something it is not. */}
                            {(assignable.includes(m.role) ? assignable : [m.role, ...assignable]).map(r => (
                              <option key={r} value={r} className="bg-[#1A1A1A] text-white">{labelFor(r)}</option>
                            ))}
                          </select>
                        )}
                      </td>
                      <td className="py-3 pr-3 text-gray-400">
                        <span className="inline-flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5 text-gray-600" />
                          {sinceLabel(m.lastSignInAt)}
                        </span>
                      </td>
                      <td className="py-3">
                        {m.active ? (
                          <div className="flex items-center gap-3">
                            <span className="inline-flex items-center gap-1.5 text-emerald-400">
                              <CheckCircle2 className="h-3.5 w-3.5" /> Active
                            </span>
                            {!isSelf && (
                              <button onClick={() => setActive(m, false)} disabled={busy}
                                className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-red-400 disabled:opacity-50">
                                <Ban className="h-3.5 w-3.5" /> Switch off
                              </button>
                            )}
                          </div>
                        ) : (
                          <div className="flex items-center gap-3">
                            <span className="inline-flex items-center gap-1.5 text-red-400">
                              <Ban className="h-3.5 w-3.5" /> Switched off
                            </span>
                            <button onClick={() => setActive(m, true)} disabled={busy}
                              className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-emerald-400 disabled:opacity-50">
                              <RotateCcw className="h-3.5 w-3.5" /> Turn back on
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <p className="text-xs text-gray-500">
          The role is the access. It is what every part of the server checks before it
          answers, so changing it here changes what that person can reach everywhere —
          on the next request, with no need for them to sign in again.
        </p>
      </div>
    </div>
  );
}
