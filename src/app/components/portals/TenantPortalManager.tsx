import { useEffect, useState } from "react";
import { Building2, Mail, Plus, Send, ShieldCheck, UserRoundCheck, X } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../../contexts/AuthContext";
import { projectId } from "../../utils/supabase/info";

type ParentPortalType = "landlord" | "property_manager" | "condo_manager";
type TenantRecord = { id: string; tenantName: string; tenantEmail: string; phone?: string; propertyName: string; unitNumber: string; status: string };

export default function TenantPortalManager({ parentPortalType }: { parentPortalType: ParentPortalType }) {
  const { session } = useAuth();
  const [tenants, setTenants] = useState<TenantRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState({ name: "", email: "", phone: "", propertyName: "", unitNumber: "" });
  const api = `https://${projectId}.supabase.co/functions/v1/make-server-57095a78`;
  const headers = session?.access_token ? { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" } : undefined;

  const load = async () => {
    if (!session?.access_token) { setLoading(false); return; }
    setLoading(true);
    try {
      const response = await fetch(`${api}/tenant-portals?portalType=${parentPortalType}`, { headers: { Authorization: `Bearer ${session.access_token}` } });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.success) throw new Error(data.error || "Unable to load resident portals.");
      setTenants(Array.isArray(data.tenants) ? data.tenants : []);
    } catch (error: any) { toast.error(error?.message || "Unable to load resident portals."); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, [session?.access_token, parentPortalType]);

  const invite = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!headers) return toast.error("Sign in is required.");
    setSaving(true);
    try {
      const response = await fetch(`${api}/tenant-portals/invite`, { method: "POST", headers, body: JSON.stringify({ ...draft, parentPortalType }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.success) throw new Error(data.error || "Unable to send the invitation.");
      toast.success(data.invitationSent ? "Tenant invitation sent." : (data.message || "Tenant portal created."));
      setDraft({ name: "", email: "", phone: "", propertyName: "", unitNumber: "" }); setShowForm(false); await load();
    } catch (error: any) { toast.error(error?.message || "Unable to send the invitation."); }
    finally { setSaving(false); }
  };

  const setStatus = async (tenant: TenantRecord, status: "active" | "deactivated") => {
    if (!headers) return;
    try {
      const response = await fetch(`${api}/tenant-portals/${tenant.id}`, { method: "PATCH", headers, body: JSON.stringify({ status }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.success) throw new Error(data.error || "Unable to update access.");
      toast.success(status === "deactivated" ? "Resident portal paused." : "Resident portal activated."); await load();
    } catch (error: any) { toast.error(error?.message || "Unable to update access."); }
  };

  return <section className="border border-orange-400/20 bg-[#131313] p-5 shadow-[0_18px_50px_rgba(0,0,0,.22)] sm:p-6">
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
      <div className="flex gap-3"><div className="grid h-10 w-10 shrink-0 place-items-center bg-orange-500/15 text-orange-300"><UserRoundCheck size={20} /></div><div><p className="text-[10px] font-bold uppercase tracking-[.18em] text-orange-300">Resident access</p><h2 className="mt-1 text-xl font-semibold text-white">Tenant Sub-Portals</h2><p className="mt-1 max-w-xl text-sm leading-6 text-gray-400">Invite a tenant to a unit-specific portal. Requests stay linked to this property account and arrive in your work queue.</p></div></div>
      <button type="button" onClick={() => setShowForm(true)} className="inline-flex min-h-10 items-center justify-center gap-2 bg-orange-500 px-4 text-sm font-bold text-black transition hover:bg-orange-400"><Plus size={16} /> Invite tenant</button>
    </div>
    <div className="mt-5 grid gap-px bg-white/10 sm:grid-cols-3">
      <div className="bg-[#171717] p-3"><p className="text-[10px] uppercase tracking-[.15em] text-gray-500">Connected</p><p className="mt-1 text-2xl font-semibold text-white">{tenants.filter(t => t.status !== "deactivated").length}</p></div>
      <div className="bg-[#171717] p-3"><p className="text-[10px] uppercase tracking-[.15em] text-gray-500">Invites pending</p><p className="mt-1 text-2xl font-semibold text-white">{tenants.filter(t => t.status === "invited").length}</p></div>
      <div className="bg-[#171717] p-3"><p className="text-[10px] uppercase tracking-[.15em] text-gray-500">Data boundary</p><p className="mt-1 text-sm font-semibold text-emerald-300">Parent-scoped</p></div>
    </div>
    <div className="mt-4 divide-y divide-white/10 border-y border-white/10">{loading ? <p className="p-4 text-sm text-gray-400">Loading tenant portals…</p> : tenants.length ? tenants.slice(0, 5).map(tenant => <div key={tenant.id} className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><p className="font-medium text-white">{tenant.tenantName} <span className="ml-2 text-xs font-normal text-gray-500">Unit {tenant.unitNumber}</span></p><p className="mt-0.5 truncate text-xs text-gray-400">{tenant.propertyName} · {tenant.tenantEmail}</p></div><div className="flex items-center gap-2"><span className={`border px-2 py-1 text-[10px] font-bold uppercase tracking-[.13em] ${tenant.status === "active" ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300" : tenant.status === "deactivated" ? "border-red-400/30 bg-red-400/10 text-red-300" : "border-amber-400/30 bg-amber-400/10 text-amber-200"}`}>{tenant.status}</span><button type="button" onClick={() => setStatus(tenant, tenant.status === "deactivated" ? "active" : "deactivated")} className="border border-white/15 px-2.5 py-1.5 text-xs text-gray-300 hover:border-orange-400/60 hover:text-white">{tenant.status === "deactivated" ? "Restore" : "Pause"}</button></div></div>) : <p className="p-4 text-sm text-gray-400">No tenant portals yet. Invite the first resident when a unit is ready.</p>}</div>
    {showForm && <div className="fixed inset-0 z-[100] grid place-items-end bg-black/70 p-3 backdrop-blur-sm sm:place-items-center" role="dialog" aria-modal="true" aria-label="Invite tenant"><form onSubmit={invite} className="w-full max-w-xl border border-orange-400/30 bg-[#111] p-5 shadow-2xl sm:p-7"><div className="flex items-start justify-between gap-4"><div><p className="text-[10px] font-bold uppercase tracking-[.18em] text-orange-300">Secure invitation</p><h3 className="mt-1 text-xl font-semibold text-white">Connect a resident to a unit</h3></div><button type="button" onClick={() => setShowForm(false)} aria-label="Close" className="text-gray-400 hover:text-white"><X /></button></div><p className="mt-2 text-sm leading-6 text-gray-400">They will receive a protected portal for this unit only. Their maintenance requests report back to this portal.</p><div className="mt-5 grid gap-3 sm:grid-cols-2">{([['name','Tenant name'],['email','Email'],['phone','Phone'],['unitNumber','Unit number'],['propertyName','Property name']] as const).map(([key,label]) => <label key={key} className={key === 'propertyName' ? 'sm:col-span-2' : ''}><span className="mb-1 block text-xs font-medium text-gray-300">{label}{['name','email','unitNumber','propertyName'].includes(key) ? ' *' : ''}</span><input required={['name','email','unitNumber','propertyName'].includes(key)} type={key === 'email' ? 'email' : 'text'} value={draft[key]} onChange={e => setDraft(current => ({ ...current, [key]: e.target.value }))} className="h-11 w-full border border-white/15 bg-[#1a1a1a] px-3 text-sm text-white outline-none placeholder:text-gray-600 focus:border-orange-400" /></label>)}</div><div className="mt-6 flex justify-end gap-3"><button type="button" onClick={() => setShowForm(false)} className="px-4 py-2.5 text-sm text-gray-300">Cancel</button><button disabled={saving} className="inline-flex min-h-11 items-center gap-2 bg-orange-500 px-4 text-sm font-bold text-black disabled:opacity-60"><Send size={16} />{saving ? 'Sending…' : 'Send invitation'}</button></div></form></div>}
  </section>;
}
