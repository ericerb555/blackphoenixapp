/**
 * CondoMasterAccount — the associations this account administers, and the
 * sub-portals it issues beneath them.
 *
 * THE RULE THIS IS BUILT AROUND
 *
 * The master account may be held by anyone — a board, a management company, a
 * single owner — but **the association has to consent to it**. So the
 * association is the root entity here, never the account holder. Everything
 * belongs to the association; people hold grants on it, and a grant can be
 * withdrawn.
 *
 * That is why this screen leads with the association rather than with a roster.
 * A management company running four associations is looking at four separate
 * sets of records, not one merged pile, and the consent behind each is stated
 * on the card rather than assumed.
 *
 * WHAT THE QUOTA COUNTS
 *
 * Board seats are governance and cost nothing. What the Condo Manager Plan
 * sells is portals for the people underneath — owners, residents and vendors —
 * so those are what count against the allowance. The server enforces this; the
 * number here is only the display of it.
 */
import { useCallback, useEffect, useState } from 'react';
import {
  Building2, Plus, X, Loader2, Send, Users, ShieldCheck, ShieldAlert,
  Trash2, ChevronLeft, AlertCircle, Check,
} from 'lucide-react';
import { toast } from 'sonner';
import { projectId } from '../../utils/supabase/info';

const API = `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6`;

/** The roles an association can grant, and what each one is for. */
const ROLES: { id: string; label: string; hint: string; governing: boolean }[] = [
  { id: 'board_president',  label: 'Board President',  hint: 'Runs the association and is the only role that can confirm or withdraw who administers it', governing: true },
  { id: 'board_member',     label: 'Board Member',     hint: 'Approvals, financials and governance', governing: true },
  { id: 'property_manager', label: 'Property Manager', hint: 'Day-to-day operations and work requests', governing: true },
  { id: 'owner',            label: 'Unit Owner',       hint: 'Owns a unit — not necessarily the person living in it', governing: false },
  { id: 'resident',         label: 'Resident',         hint: 'Lives in a unit and can report maintenance', governing: false },
  { id: 'vendor',           label: 'Vendor',           hint: 'Sees only the work assigned to them by this association', governing: false },
];

const roleLabel = (id: string) => ROLES.find((r) => r.id === id)?.label || id;

export default function CondoMasterAccount({ session }: { session: any }) {
  const headers = {
    Authorization: `Bearer ${session?.access_token || ''}`,
    'Content-Type': 'application/json',
  };

  const [associations, setAssociations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<any>(null);
  const [busy, setBusy] = useState(false);

  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState({ name: '', address: '', unitCount: '', myRole: 'property_manager' });

  const [members, setMembers] = useState<any[]>([]);
  const [quota, setQuota] = useState<any>(null);
  const [membersLoading, setMembersLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [memberDraft, setMemberDraft] = useState({ name: '', email: '', unit: '', role: 'owner' });

  const loadAssociations = useCallback(async () => {
    if (!session?.access_token) { setLoading(false); return; }
    setLoading(true);
    try {
      const res = await fetch(`${API}/condo/associations`, { headers });
      const data = await res.json().catch(() => ({}));
      setAssociations(Array.isArray(data?.associations) ? data.associations : []);
    } catch {
      toast.error('Could not reach the server.');
    } finally {
      setLoading(false);
    }
  }, [session?.access_token]);

  useEffect(() => { void loadAssociations(); }, [loadAssociations]);

  const loadMembers = useCallback(async (assoc: any) => {
    if (!assoc) return;
    setMembersLoading(true);
    try {
      const res = await fetch(`${API}/condo/associations/${assoc.id}/members`, { headers });
      const data = await res.json().catch(() => ({}));
      setMembers(Array.isArray(data?.members) ? data.members : []);
      setQuota(data?.quota || null);
      if (data?.success === false && data?.error) toast.error(String(data.error));
    } catch {
      toast.error('Could not load the roster.');
    } finally {
      setMembersLoading(false);
    }
  }, [session?.access_token]);

  useEffect(() => { if (selected) void loadMembers(selected); }, [selected, loadMembers]);

  const createAssociation = async () => {
    if (!draft.name.trim()) { toast.error('Give the association a name.'); return; }
    setBusy(true);
    try {
      const res = await fetch(`${API}/condo/associations`, {
        method: 'POST', headers, body: JSON.stringify({ ...draft, unitCount: Number(draft.unitCount) || 0 }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.success === false) throw new Error(data?.error || `HTTP ${res.status}`);
      toast.success(
        draft.myRole === 'board_president'
          ? `${draft.name} created.`
          : `${draft.name} created. The board still needs to confirm that you administer it.`,
      );
      setCreating(false);
      setDraft({ name: '', address: '', unitCount: '', myRole: 'property_manager' });
      await loadAssociations();
    } catch (e: any) {
      toast.error(e?.message || 'Could not create the association.');
    } finally { setBusy(false); }
  };

  const addMember = async () => {
    if (!memberDraft.name.trim() || !memberDraft.email.trim()) {
      toast.error('A name and an email are needed.'); return;
    }
    setBusy(true);
    try {
      const res = await fetch(`${API}/condo/associations/${selected.id}/members`, {
        method: 'POST', headers, body: JSON.stringify(memberDraft),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.success === false) throw new Error(data?.error || `HTTP ${res.status}`);
      toast.success(`${memberDraft.name} added. They get access once you invite them.`);
      setAdding(false);
      setMemberDraft({ name: '', email: '', unit: '', role: 'owner' });
      await loadMembers(selected);
    } catch (e: any) {
      toast.error(e?.message || 'Could not add them.');
    } finally { setBusy(false); }
  };

  const invite = async (member: any) => {
    setBusy(true);
    try {
      const res = await fetch(`${API}/condo/associations/${selected.id}/members/${encodeURIComponent(member.email)}/invite`, {
        method: 'POST', headers,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.success === false) throw new Error(data?.error || `HTTP ${res.status}`);
      if (data.invitationSent) toast.success(`Invite emailed to ${member.email}.`);
      else toast.warning(data.inviteNotice || `${member.email} was set up, but the invite email did not send.`, { duration: 12000 });
      await loadMembers(selected);
    } catch (e: any) {
      toast.error(e?.message || 'Could not send the invitation.');
    } finally { setBusy(false); }
  };

  const removeMember = async (member: any) => {
    setBusy(true);
    try {
      const res = await fetch(`${API}/condo/associations/${selected.id}/members/${encodeURIComponent(member.email)}`, {
        method: 'PATCH', headers, body: JSON.stringify({ status: 'revoked' }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.success === false) throw new Error(data?.error || `HTTP ${res.status}`);
      toast.success(`${member.name || member.email} no longer has access.`);
      await loadMembers(selected);
    } catch (e: any) {
      toast.error(e?.message || 'Could not remove them.');
    } finally { setBusy(false); }
  };

  const confirmConsent = async (member: any) => {
    setBusy(true);
    try {
      const res = await fetch(`${API}/condo/associations/${selected.id}/consent`, {
        method: 'POST', headers, body: JSON.stringify({ email: member.email, decision: 'confirm' }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.success === false) throw new Error(data?.error || `HTTP ${res.status}`);
      toast.success(`The association has confirmed ${member.name || member.email}.`);
      await loadMembers(selected);
      await loadAssociations();
    } catch (e: any) {
      toast.error(e?.message || 'Could not record the confirmation.');
    } finally { setBusy(false); }
  };

  // ── The roster for one association ────────────────────────────────────────
  if (selected) {
    const canConsent = ['board_president'].includes(String(selected.myRole));
    return (
      <div className="space-y-6">
        <button
          type="button"
          onClick={() => { setSelected(null); setMembers([]); setQuota(null); }}
          className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-gray-400 transition hover:text-white"
        >
          <ChevronLeft className="h-4 w-4" /> All associations
        </button>

        <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-white">{selected.name}</h2>
              {selected.address && <p className="mt-1 text-sm text-gray-400">{selected.address}</p>}
              <p className="mt-1 text-sm text-gray-500">
                You are the {roleLabel(String(selected.myRole))} here
                {selected.unitCount ? ` · ${selected.unitCount} units` : ''}
              </p>
            </div>
            {quota && (
              <div className="rounded-lg border border-[#2A2A2A] bg-[#0A0A0A] px-4 py-3 text-right">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Sub-portals</p>
                <p className="mt-1 text-lg font-bold tabular-nums text-white">
                  {quota.used}{quota.limit === null ? '' : ` of ${quota.limit}`}
                </p>
                <p className="text-xs text-gray-500">{quota.planId} plan</p>
              </div>
            )}
          </div>

          {selected.consentStatus === 'awaiting_board' && (
            <div className="mt-4 flex items-start gap-2 rounded-lg border border-yellow-500/30 bg-yellow-500/5 p-3 text-sm text-yellow-200">
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                This association has not yet confirmed who administers it. A board president
                needs to confirm before the arrangement is on record — you can carry on working
                in the meantime.
              </span>
            </div>
          )}
        </div>

        <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-6">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-white">Members</h3>
              <p className="mt-1 text-sm text-gray-400">
                Everyone with access to this association, and what they may do.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setAdding((v) => !v)}
              className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500"
            >
              {adding ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              {adding ? 'Cancel' : 'Add someone'}
            </button>
          </div>

          {adding && (
            <div className="mb-6 rounded-lg border border-indigo-500/30 bg-indigo-500/5 p-4 sm:p-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-400">Name</span>
                  <input value={memberDraft.name} onChange={(e) => setMemberDraft({ ...memberDraft, name: e.target.value })}
                    className="w-full rounded-lg border border-[#2A2A2A] bg-[#0A0A0A] px-3 py-2 text-sm text-white" />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-400">Email</span>
                  <input value={memberDraft.email} onChange={(e) => setMemberDraft({ ...memberDraft, email: e.target.value })}
                    className="w-full rounded-lg border border-[#2A2A2A] bg-[#0A0A0A] px-3 py-2 text-sm text-white" />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-400">Unit (optional)</span>
                  <input value={memberDraft.unit} onChange={(e) => setMemberDraft({ ...memberDraft, unit: e.target.value })}
                    className="w-full rounded-lg border border-[#2A2A2A] bg-[#0A0A0A] px-3 py-2 text-sm text-white" />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-400">Role</span>
                  <select value={memberDraft.role} onChange={(e) => setMemberDraft({ ...memberDraft, role: e.target.value })}
                    className="w-full rounded-lg border border-[#2A2A2A] bg-[#0A0A0A] px-3 py-2 text-sm text-white">
                    {ROLES.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
                  </select>
                </label>
              </div>
              <p className="mt-2 text-sm text-gray-500">
                {ROLES.find((r) => r.id === memberDraft.role)?.hint}
              </p>
              {memberDraft.role === 'vendor' && (
                <p className="mt-2 text-sm text-gray-400">
                  A vendor needs an existing vendor account — they keep one across the whole
                  platform, so this grants access to your work rather than creating a second
                  identity for them.
                </p>
              )}
              <button
                type="button" disabled={busy}
                onClick={addMember}
                className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2 text-sm font-bold text-white transition hover:bg-indigo-500 disabled:opacity-40"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Users className="h-4 w-4" />}
                Add to association
              </button>
            </div>
          )}

          {membersLoading ? (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-gray-400">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading the roster…
            </div>
          ) : members.length === 0 ? (
            <div className="rounded-lg border border-[#2A2A2A] bg-[#0A0A0A] p-10 text-center">
              <Users className="mx-auto mb-3 h-8 w-8 text-gray-600" />
              <p className="font-semibold text-white">Nobody has been added yet</p>
              <p className="mx-auto mt-2 max-w-md text-sm text-gray-400">
                Add the board, the owners and any vendors, then invite them. Each one gets their
                own portal into this association.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-[#2A2A2A] rounded-lg border border-[#2A2A2A] bg-[#0A0A0A]">
              {members.map((m) => (
                <div key={m.email} className="flex flex-wrap items-center justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2 font-semibold text-white">
                      {m.name || m.email}
                      <span className="rounded border border-[#3A3A3A] bg-[#1A1A1A] px-2 py-0.5 text-xs font-semibold text-gray-300">
                        {roleLabel(String(m.role))}
                      </span>
                      {m.invited && (
                        <span className="rounded border border-teal-500/30 bg-teal-500/10 px-2 py-0.5 text-xs font-bold uppercase text-teal-300">
                          Portal active
                        </span>
                      )}
                      {/* Whether the association itself has confirmed this
                          person's authority, shown only where it means
                          something — a board seat granted by the board is
                          self-evidently consented. */}
                      {!m.associationConfirmed && (
                        <span className="inline-flex items-center gap-1 rounded border border-yellow-500/30 bg-yellow-500/10 px-2 py-0.5 text-xs font-bold text-yellow-300">
                          <ShieldAlert className="h-3 w-3" /> Unconfirmed
                        </span>
                      )}
                    </p>
                    <p className="mt-0.5 text-sm text-gray-500">
                      {m.email}{m.unit ? ` · Unit ${m.unit}` : ''}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {canConsent && !m.associationConfirmed && (
                      <button
                        type="button" disabled={busy} onClick={() => confirmConsent(m)}
                        title="Record that the association agrees to this person's role"
                        className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-green-500/40 px-3 py-1.5 text-xs font-bold text-green-300 transition hover:bg-green-500/10 disabled:opacity-40"
                      >
                        <ShieldCheck className="h-3.5 w-3.5" /> Confirm
                      </button>
                    )}
                    <button
                      type="button" disabled={busy} onClick={() => invite(m)}
                      className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-indigo-500/40 px-3 py-1.5 text-xs font-bold text-indigo-300 transition hover:bg-indigo-500/10 disabled:opacity-40"
                    >
                      <Send className="h-3.5 w-3.5" /> {m.invited ? 'Resend' : 'Invite'}
                    </button>
                    <button
                      type="button" disabled={busy} onClick={() => removeMember(m)}
                      className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-red-500/40 px-3 py-1.5 text-xs font-bold text-red-300 transition hover:bg-red-500/10 disabled:opacity-40"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── The list of associations ──────────────────────────────────────────────
  return (
    <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-white">Associations</h2>
          <p className="mt-1 text-sm text-gray-400">
            Each association owns its own records. You administer it because it agreed you
            could, and it can withdraw that at any time.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCreating((v) => !v)}
          className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500"
        >
          {creating ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {creating ? 'Cancel' : 'New association'}
        </button>
      </div>

      {creating && (
        <div className="mb-6 rounded-lg border border-indigo-500/30 bg-indigo-500/5 p-4 sm:p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-400">Association name</span>
              <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                placeholder="Harbour Point Condominium Association"
                className="w-full rounded-lg border border-[#2A2A2A] bg-[#0A0A0A] px-3 py-2 text-sm text-white" />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-400">Address</span>
              <input value={draft.address} onChange={(e) => setDraft({ ...draft, address: e.target.value })}
                className="w-full rounded-lg border border-[#2A2A2A] bg-[#0A0A0A] px-3 py-2 text-sm text-white" />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-400">Units</span>
              <input value={draft.unitCount} onChange={(e) => setDraft({ ...draft, unitCount: e.target.value })}
                inputMode="numeric"
                className="w-full rounded-lg border border-[#2A2A2A] bg-[#0A0A0A] px-3 py-2 text-sm text-white" />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-400">You are the…</span>
              <select value={draft.myRole} onChange={(e) => setDraft({ ...draft, myRole: e.target.value })}
                className="w-full rounded-lg border border-[#2A2A2A] bg-[#0A0A0A] px-3 py-2 text-sm text-white">
                <option value="property_manager">Property Manager</option>
                <option value="board_president">Board President</option>
              </select>
            </label>
          </div>

          {/* Consent, stated at the moment it is decided rather than buried. */}
          <div className="mt-4 flex items-start gap-2 rounded-lg border border-[#2A2A2A] bg-[#0A0A0A] p-3 text-sm text-gray-400">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-gray-500" />
            {draft.myRole === 'board_president' ? (
              <span>
                Setting this up as the board president means the association is setting up its
                own account, so its consent is on record from the start.
              </span>
            ) : (
              <span>
                Setting this up as the property manager records that the association has
                <strong className="text-gray-300"> not yet confirmed</strong> you administer it.
                Invite a board president and have them confirm — you can work in the meantime.
              </span>
            )}
          </div>

          <button
            type="button" disabled={busy || !draft.name.trim()}
            onClick={createAssociation}
            className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2 text-sm font-bold text-white transition hover:bg-indigo-500 disabled:opacity-40"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Building2 className="h-4 w-4" />}
            Create association
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-10 text-sm text-gray-400">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading your associations…
        </div>
      ) : associations.length === 0 ? (
        <div className="rounded-lg border border-[#2A2A2A] bg-[#0A0A0A] p-10 text-center">
          <Building2 className="mx-auto mb-3 h-8 w-8 text-gray-600" />
          <p className="font-semibold text-white">No associations yet</p>
          <p className="mx-auto mt-2 max-w-md text-sm text-gray-400">
            Create one, then add its board, owners, residents and vendors. Each of them gets
            their own portal into it.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {associations.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => setSelected(a)}
              className="rounded-lg border border-[#2A2A2A] bg-[#0A0A0A] p-5 text-left transition hover:border-indigo-500/40"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-bold text-white">{a.name}</p>
                  {a.address && <p className="mt-1 text-sm text-gray-400">{a.address}</p>}
                </div>
                {a.consentStatus === 'awaiting_board' ? (
                  <span className="inline-flex shrink-0 items-center gap-1 rounded border border-yellow-500/30 bg-yellow-500/10 px-2 py-0.5 text-xs font-bold text-yellow-300">
                    <ShieldAlert className="h-3 w-3" /> Unconfirmed
                  </span>
                ) : (
                  <span className="inline-flex shrink-0 items-center gap-1 rounded border border-green-500/30 bg-green-500/10 px-2 py-0.5 text-xs font-bold text-green-300">
                    <Check className="h-3 w-3" /> Consented
                  </span>
                )}
              </div>
              <p className="mt-3 text-sm text-gray-500">
                You are the {roleLabel(String(a.myRole))}
                {a.unitCount ? ` · ${a.unitCount} units` : ''}
              </p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
