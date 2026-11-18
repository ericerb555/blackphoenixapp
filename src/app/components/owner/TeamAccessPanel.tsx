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

  /**
   * BULK ROLE SETTING. Eric, 2026-11-18: "add bulk role setting".
   *
   * Selection is by email because that is what the server's route takes, and
   * `id` is not what `mayAssignRole` compares.
   *
   * `bulkArmed` is a deliberate second step. Everything else on this screen
   * changes one person; this changes several people's authority at once, and a
   * mis-click on a dropdown next to "Apply to 9 people" is not a mistake that
   * announces itself. The button names the count and the role before it will
   * do anything.
   */
  const [selected, setSelected] = useState<string[]>([]);
  const [bulkRole, setBulkRole] = useState('employee');
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkArmed, setBulkArmed] = useState(false);
  const [bulkDone, setBulkDone] = useState<null | {
    changed: string[]; unchanged: string[]; refused: { who: string; why: string }[]; stopped: boolean;
  }>(null);

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


  /**
   * Who may be selected: everybody but you.
   *
   * The server refuses a change to your own role and always will — a sole
   * owner who demotes themselves locks themselves out of the screen that
   * would undo it. Making your row unselectable keeps a guaranteed refusal
   * out of every bulk result rather than explaining it afterwards.
   */
  const selectableEmails = members.filter(m => m.email !== actorEmail).map(m => m.email);
  const selectedCount = selected.length;
  const allSelected = selectableEmails.length > 0 && selectedCount === selectableEmails.length;

  const toggleOne = (email: string) => {
    setBulkArmed(false); setBulkDone(null);
    setSelected(cur => (cur.includes(email) ? cur.filter(e => e !== email) : [...cur, email]));
  };

  const toggleAll = () => {
    setBulkArmed(false); setBulkDone(null);
    setSelected(allSelected ? [] : selectableEmails);
  };

  /**
   * APPLY ONE ROLE TO SEVERAL PEOPLE.
   *
   * THERE IS NO BULK ROUTE ON THE SERVER, AND THAT IS THE POINT. Each change
   * goes through `POST /team/members/role` exactly as the single dropdown
   * does, so:
   *
   *   - `mayAssignRole` decides every one of them. An administrator doing this
   *     still cannot mint a second administrator, because the same check runs
   *     each time. A new bulk endpoint would be a second route that writes
   *     `app_metadata.role`, needing its own guard and its own proof — and the
   *     existing one has been tested against a real non-staff session.
   *   - the audit log keeps one `team_role_change:` row per person, with who
   *     did it and when, which is what makes "who made them an administrator?"
   *     answerable. A single bulk write would collapse nine decisions into one
   *     record.
   *   - a partial failure stays truthful. Six changed and three refused is
   *     reported as six changed and three refused.
   *
   * SEQUENTIAL, NOT PARALLEL. The log stays in order, and a 401 stops the rest
   * instead of firing eight more requests that cannot succeed. A team is tens
   * of people, not thousands; the wall-clock cost is not worth the mess.
   *
   * REFUSALS CARRY THE SERVER'S OWN WORDS. The browser does not re-implement
   * `mayAssignRole` to grey out combinations it thinks will fail — that would
   * be a second copy of an authorisation rule, drifting from the first, which
   * is the exact mistake `/me/permissions` exists to have stopped.
   */
  const applyBulkRole = async () => {
    if (!token) { toast.error('Sign in again.'); return; }
    if (!selectedCount) return;
    setBulkBusy(true);
    const changed: string[] = [];
    const unchanged: string[] = [];
    const refused: { who: string; why: string }[] = [];
    let stopped = false;

    for (const email of selected) {
      const member = members.find(m => m.email === email);
      if (!member) continue;
      const who = member.name || member.email;
      if (member.role === bulkRole) { unchanged.push(who); continue; }
      try {
        const res = await fetch(`${SERVER}/team/members/role`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, role: bulkRole }),
        });
        const payload = await res.json().catch(() => ({}));
        if (res.status === 401) {
          refused.push({ who, why: 'Your session expired part way through.' });
          stopped = true;
          break;
        }
        if (!res.ok || !payload?.success) {
          refused.push({ who, why: String(payload?.error || 'The server refused it.') });
          continue;
        }
        changed.push(who);
        setMembers(ms => ms.map(m => (m.email === email ? { ...m, role: bulkRole } : m)));
      } catch (err: any) {
        refused.push({ who, why: err?.message || 'The request did not go through.' });
      }
    }

    setBulkBusy(false);
    setBulkArmed(false);
    setBulkDone({ changed, unchanged, refused, stopped });
    setSelected([]);
    if (changed.length) {
      toast.success(`${changed.length} ${changed.length === 1 ? 'person is' : 'people are'} now ${labelFor(bulkRole)}.`);
    }
    if (refused.length) toast.error(`${refused.length} refused — see the panel.`);
    // The directory is the authority, not this list. Re-read it.
    load();
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

        {/*
          THE BULK BAR — only on screen when something is selected.
          A permanently visible row-of-controls on a screen that writes
          authority is an invitation; this appears when it is asked for.
        */}
        {!loading && !loadError && selectedCount > 0 && (
          <div className="flex flex-col gap-3 rounded-lg border border-red-900/40 bg-red-950/20 p-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-white">
              <span className="font-semibold">{selectedCount}</span>{' '}
              {selectedCount === 1 ? 'person' : 'people'} selected
              <button
                onClick={() => { setSelected([]); setBulkArmed(false); }}
                disabled={bulkBusy}
                className="ml-3 text-xs text-gray-400 underline hover:text-white disabled:opacity-50"
              >
                clear
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <label className="text-xs uppercase tracking-wide text-gray-400">Set role to</label>
              <select
                value={bulkRole}
                onChange={e => { setBulkRole(e.target.value); setBulkArmed(false); }}
                disabled={bulkBusy}
                /* text-base, not text-sm: iOS Safari zooms into a focused
                   control under 16px and never zooms back out. */
                className="rounded-lg border border-[#2A2A2A] bg-[#1A1A1A] px-3 py-2 text-base text-white outline-none focus:border-red-500 disabled:opacity-50"
              >
                {assignable.map(r => (
                  <option key={r} value={r}>{labelFor(r)}</option>
                ))}
              </select>

              {/*
                Two clicks, deliberately. The first arms it and the button then
                says exactly what it will do, naming the count and the role.
                One dropdown plus one button is how nine people silently become
                administrators.
              */}
              <button
                onClick={() => (bulkArmed ? applyBulkRole() : setBulkArmed(true))}
                disabled={bulkBusy}
                className={`inline-flex min-h-[44px] items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition ${
                  bulkArmed
                    ? 'bg-red-600 text-white hover:bg-red-500'
                    : 'border border-red-900/60 bg-[#1A1A1A] text-red-200 hover:border-red-600'
                } disabled:opacity-50`}
              >
                {bulkBusy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Shield className="h-4 w-4" />}
                {bulkBusy
                  ? 'Applying…'
                  : bulkArmed
                    ? `Yes — make ${selectedCount} ${selectedCount === 1 ? 'person' : 'people'} ${labelFor(bulkRole)}`
                    : 'Apply to selected'}
              </button>
            </div>
          </div>
        )}

        {/*
          WHAT ACTUALLY HAPPENED, per person. A bulk action that reports only
          "done" is worse than no bulk action: the refusals are the part
          somebody has to act on, and they carry the server's own words.
        */}
        {bulkDone && (
          <div className="space-y-2 rounded-lg border border-[#2A2A2A] bg-[#0D0D0D] p-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-white">Result</span>
              <button onClick={() => setBulkDone(null)} className="text-xs text-gray-500 hover:text-white">dismiss</button>
            </div>
            {bulkDone.changed.length > 0 && (
              <p className="flex items-start gap-2 text-green-300">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                <span>Changed: {bulkDone.changed.join(', ')}</span>
              </p>
            )}
            {bulkDone.unchanged.length > 0 && (
              <p className="text-gray-400">Already that role: {bulkDone.unchanged.join(', ')}</p>
            )}
            {bulkDone.refused.map(r => (
              <p key={r.who} className="flex items-start gap-2 text-amber-200">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <span><span className="font-medium">{r.who}</span> — {r.why}</span>
              </p>
            ))}
            {bulkDone.stopped && (
              <p className="text-amber-200">
                Stopped part way through, so anybody after that point was not changed.
                Sign in again and re-select them.
              </p>
            )}
            {bulkDone.changed.length === 0 && bulkDone.refused.length === 0 && bulkDone.unchanged.length === 0 && (
              <p className="text-gray-400">Nothing to do.</p>
            )}
          </div>
        )}

        {!loading && !loadError && members.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-[#2A2A2A] text-left text-xs uppercase tracking-wide text-gray-500">
                  <th className="pb-2 pr-3 font-medium">
                    {/*
                      Select-all covers everybody BUT you — see selectableEmails.
                      h-5 w-5 rather than the browser default, because Eric works
                      from a phone and a 13px native checkbox in a table row is
                      not a tap target.
                    */}
                    <input
                      type="checkbox"
                      aria-label="Select everybody"
                      checked={allSelected}
                      onChange={toggleAll}
                      disabled={bulkBusy || selectableEmails.length === 0}
                      className="h-5 w-5 cursor-pointer accent-red-500"
                    />
                  </th>
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
                      <td className="py-3 pr-3 align-top">
                        <input
                          type="checkbox"
                          aria-label={`Select ${m.name || m.email}`}
                          checked={selected.includes(m.email)}
                          onChange={() => toggleOne(m.email)}
                          /* Your own row cannot be selected: the server refuses a
                             change to your own role, so offering it would only
                             manufacture a refusal. */
                          disabled={isSelf || bulkBusy || busy}
                          className="h-5 w-5 cursor-pointer accent-red-500 disabled:cursor-not-allowed disabled:opacity-30"
                        />
                      </td>
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
        {/*
          There are two separate notions of "employee" in this system and it is
          worth saying so rather than letting somebody hunt. This screen manages
          the ACCOUNT — who they are and what they may reach. `HREmployeeHub`
          manages the time-tracking EMPLOYEE RECORD — pay rate, burden, shifts —
          against a different API, keyed separately. Neither creates the other.
        */}
        <p className="text-xs text-gray-500">
          Pay rates, labour burden and timesheets are a separate record, kept in{' '}
          <a href="/payroll" className="text-red-400 hover:text-red-300 underline underline-offset-2">
            HR &amp; Employee Hub
          </a>
          . Inviting somebody here gives them an account and its access; it does not
          put them on the payroll.
        </p>
      </div>
    </div>
  );
}
