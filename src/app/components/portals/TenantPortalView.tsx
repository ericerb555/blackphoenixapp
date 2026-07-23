import { FormEvent, useEffect, useMemo, useState } from "react";
import { ArrowRight, ClipboardPlus, Gift, House, LoaderCircle, MessageSquareText, ReceiptText, Send, ShieldCheck, ShoppingBag, Sparkles, Wrench } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../../contexts/AuthContext";
import { projectId } from "../../utils/supabase/info";

type Tenant = { tenantName: string; tenantEmail: string; propertyName: string; unitNumber: string; parentPortalType: string; status: string };
type Request = { id: string; title?: string; project_name?: string; description: string; priority: string; status: string; created_at: string };
type Experience = { marqueeItems: string[]; ads: { id: string; title: string; body: string; ctaLabel: string; ctaRoute: string; active: boolean }[] };

export default function TenantPortalView({ onNavigate }: { onNavigate?: (page: string) => void }) {
  const { session } = useAuth();
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [requests, setRequests] = useState<Request[]>([]);
  const [experience, setExperience] = useState<Experience>({ marqueeItems: [], ads: [] });
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [draft, setDraft] = useState({ title: "", description: "", category: "General maintenance", priority: "normal" });
  const api = `https://${projectId}.supabase.co/functions/v1/make-server-57095a78`;
  const authHeaders = session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {};
  const navigate = (page: string) => onNavigate ? onNavigate(page) : (window.location.href = `/${page}`);
  // Owner-only RoleSwitcher preview: it renders representative resident data
  // locally and never calls or alters the real tenant records.
  const previewMode = typeof window !== "undefined" && sessionStorage.getItem("role_switching") === "owner_preview" && (() => {
    try { return JSON.parse(localStorage.getItem("demo_role_profile") || "{}").role === "tenant"; } catch { return false; }
  })();

  const load = async () => {
    if (previewMode) {
      setTenant({ tenantName: "Maya Rodriguez", tenantEmail: "maya@cedarcourtdemo.com", propertyName: "Cedar Court Residences", unitNumber: "204", parentPortalType: "landlord", status: "active" });
      setRequests([{ id: "demo-tenant-request-1", title: "Kitchen faucet drip", description: "Slow drip from the kitchen faucet after use.", priority: "normal", status: "scheduled", created_at: "2026-07-21T14:00:00.000Z" }]);
      setExperience({ marqueeItems: ["Preview mode — this is a safe test tenant portal.", "Maintenance requests are reviewed by your property team.", "Explore resident rewards, gift cards, and the Black Phoenix shop."], ads: [{ id: "demo-gift-cards", title: "Give a little help", body: "Send a Black Phoenix gift card for a project, repair, or seasonal refresh.", ctaLabel: "View gift cards", ctaRoute: "gift-cards", active: true }, { id: "demo-shop", title: "Resident essentials", body: "Shop curated home and maintenance products from Black Phoenix.", ctaLabel: "Open shop", ctaRoute: "public-store", active: true }] });
      setLoading(false); return;
    }
    if (!session?.access_token) { setLoading(false); return; }
    setLoading(true);
    try {
      const [meResponse, experienceResponse] = await Promise.all([
        fetch(`${api}/tenant-portal/me`, { headers: authHeaders }),
        fetch(`${api}/tenant-portals/experience`, { headers: authHeaders }),
      ]);
      const me = await meResponse.json().catch(() => ({})); const content = await experienceResponse.json().catch(() => ({}));
      if (!meResponse.ok || !me.success) throw new Error(me.error || "Your resident portal is not available.");
      setTenant(me.tenant); setRequests(Array.isArray(me.workRequests) ? me.workRequests : []);
      if (content.success && content.experience) setExperience(content.experience);
    } catch (error: any) { toast.error(error?.message || "Unable to load your resident portal."); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, [session?.access_token, previewMode]);

  const sendRequest = async (event: FormEvent) => {
    event.preventDefault();
    if (previewMode) {
      const now = new Date().toISOString();
      setRequests(current => [{ id: `demo-tenant-request-${Date.now()}`, title: draft.title, description: draft.description, priority: draft.priority, status: "pending approval", created_at: now }, ...current]);
      setDraft({ title: "", description: "", category: "General maintenance", priority: "normal" });
      toast.success("Preview request added locally. No real work order was created."); return;
    }
    if (!session?.access_token) return toast.error("Please sign in again.");
    setSending(true);
    try {
      const response = await fetch(`${api}/tenant-portal/work-requests`, { method: "POST", headers: { ...authHeaders, "Content-Type": "application/json" }, body: JSON.stringify(draft) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.success) throw new Error(data.error || "Unable to submit your request.");
      setRequests(current => [data.workRequest, ...current]); setDraft({ title: "", description: "", category: "General maintenance", priority: "normal" }); toast.success("Request sent to your property team.");
    } catch (error: any) { toast.error(error?.message || "Unable to submit your request."); }
    finally { setSending(false); }
  };

  const statusLabel = (status: string) => String(status || "pending").replace(/_/g, " ");
  const openCount = useMemo(() => requests.filter(request => !["completed", "rejected", "closed"].includes(String(request.status).toLowerCase())).length, [requests]);
  if (loading) return <div className="min-h-screen bg-[#0b0b0c] grid place-items-center text-gray-300"><div className="flex items-center gap-3 text-sm"><LoaderCircle className="animate-spin text-orange-400" size={18} /> Loading your resident portal…</div></div>;
  if (!tenant) return <div className="min-h-screen bg-[#0b0b0c] grid place-items-center p-6 text-center text-gray-300"><div><ShieldCheck className="mx-auto text-orange-400" size={32} /><h1 className="mt-4 text-xl font-semibold text-white">Resident access is not active</h1><p className="mt-2 max-w-md text-sm leading-6">Use the email your property team invited, or ask them to send a new resident-portal invitation.</p></div></div>;

  const marquee = experience.marqueeItems.length ? experience.marqueeItems : ["Maintenance requests are reviewed by your property team."];
  return <main className="min-h-screen overflow-hidden bg-[#0b0b0c] text-white">
    <style>{`@keyframes tenant-marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }`}</style>
    <header className="border-b border-white/10 bg-[#101011]"><div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8"><div><p className="text-[10px] font-bold uppercase tracking-[.2em] text-orange-300">Black Phoenix · Resident Services</p><h1 className="mt-1 text-2xl font-semibold tracking-[-.02em] sm:text-3xl">Welcome, {tenant.tenantName.split(" ")[0]}</h1><p className="mt-1 text-sm text-gray-400">{tenant.propertyName} <span className="px-1 text-orange-300">/</span> Unit {tenant.unitNumber}</p></div><div className="flex flex-wrap gap-2"><button onClick={() => navigate("loyalty")} className="inline-flex min-h-10 items-center gap-2 border border-white/15 px-3 text-sm text-gray-200 hover:border-orange-400/60"><Gift size={16} /> Refer & earn</button><button onClick={() => navigate("public-store")} className="inline-flex min-h-10 items-center gap-2 bg-orange-500 px-3 text-sm font-bold text-black hover:bg-orange-400"><ShoppingBag size={16} /> Shop</button></div></div></header>
    <div className="border-b border-orange-400/20 bg-orange-500/10 overflow-hidden"><div className="flex w-max min-w-full motion-reduce:transform-none motion-safe:animate-[tenant-marquee_28s_linear_infinite]">{[...marquee, ...marquee].map((item, index) => <span key={`${item}-${index}`} className="flex shrink-0 items-center gap-3 px-6 py-2.5 text-xs font-medium text-orange-100"><Sparkles size={13} className="text-orange-300" />{item}</span>)}</div></div>
    <div className="mx-auto grid max-w-7xl gap-5 px-4 py-6 sm:px-6 lg:grid-cols-[1.2fr_.8fr] lg:px-8 lg:py-8">
      <section className="space-y-5"><div className="grid gap-px border border-white/10 bg-white/10 sm:grid-cols-3"><div className="bg-[#151516] p-4"><House className="text-orange-300" size={18} /><p className="mt-5 text-[10px] uppercase tracking-[.15em] text-gray-500">Your home</p><p className="mt-1 text-lg font-semibold">Unit {tenant.unitNumber}</p></div><div className="bg-[#151516] p-4"><ReceiptText className="text-orange-300" size={18} /><p className="mt-5 text-[10px] uppercase tracking-[.15em] text-gray-500">Open requests</p><p className="mt-1 text-lg font-semibold">{openCount}</p></div><div className="bg-[#151516] p-4"><ShieldCheck className="text-emerald-300" size={18} /><p className="mt-5 text-[10px] uppercase tracking-[.15em] text-gray-500">Portal status</p><p className="mt-1 text-lg font-semibold capitalize text-emerald-300">Protected</p></div></div>
        <section className="border border-orange-400/25 bg-[#151516] p-5 sm:p-6"><div className="flex items-start gap-3"><div className="grid h-10 w-10 shrink-0 place-items-center bg-orange-500 text-black"><ClipboardPlus size={20} /></div><div><p className="text-[10px] font-bold uppercase tracking-[.18em] text-orange-300">Directly to your property team</p><h2 className="mt-1 text-xl font-semibold">Request maintenance</h2></div></div><form onSubmit={sendRequest} className="mt-5 grid gap-3"><input required value={draft.title} onChange={e => setDraft(current => ({ ...current, title: e.target.value }))} placeholder="What needs attention?" className="h-11 border border-white/15 bg-[#0d0d0e] px-3 text-sm outline-none placeholder:text-gray-600 focus:border-orange-400" /><div className="grid gap-3 sm:grid-cols-2"><select value={draft.category} onChange={e => setDraft(current => ({ ...current, category: e.target.value }))} className="h-11 border border-white/15 bg-[#0d0d0e] px-3 text-sm outline-none focus:border-orange-400"><option>General maintenance</option><option>Plumbing</option><option>Electrical</option><option>HVAC</option><option>Appliance</option><option>Safety / emergency</option></select><select value={draft.priority} onChange={e => setDraft(current => ({ ...current, priority: e.target.value }))} className="h-11 border border-white/15 bg-[#0d0d0e] px-3 text-sm outline-none focus:border-orange-400"><option value="normal">Normal priority</option><option value="low">Low priority</option><option value="high">High priority</option><option value="urgent">Urgent</option></select></div><textarea required value={draft.description} onChange={e => setDraft(current => ({ ...current, description: e.target.value }))} placeholder="Include the location in the unit, what you are seeing, and anything the service team should know." rows={4} className="border border-white/15 bg-[#0d0d0e] p-3 text-sm outline-none placeholder:text-gray-600 focus:border-orange-400" /><button disabled={sending} className="inline-flex min-h-11 w-full items-center justify-center gap-2 bg-orange-500 px-4 text-sm font-bold text-black transition hover:bg-orange-400 disabled:opacity-60 sm:w-fit"><Send size={16} />{sending ? "Sending…" : "Send to property team"}</button></form></section>
        <section className="border border-white/10 bg-[#151516]"><div className="flex items-center justify-between border-b border-white/10 px-5 py-4"><div><p className="text-[10px] font-bold uppercase tracking-[.18em] text-gray-500">Live request updates</p><h2 className="mt-1 text-lg font-semibold">Your maintenance history</h2></div><Wrench className="text-orange-300" size={19} /></div><div className="divide-y divide-white/10">{requests.length ? requests.slice(0, 6).map(request => <div key={request.id} className="p-4 sm:flex sm:items-start sm:justify-between"><div><p className="font-medium text-white">{request.title || request.project_name}</p><p className="mt-1 text-xs text-gray-500">{new Date(request.created_at).toLocaleDateString()} · {request.priority} priority</p></div><span className="mt-2 inline-flex border border-orange-400/25 bg-orange-500/10 px-2 py-1 text-[10px] font-bold uppercase tracking-[.13em] text-orange-200 sm:mt-0">{statusLabel(request.status)}</span></div>) : <p className="p-5 text-sm leading-6 text-gray-400">No requests yet. When you submit one, its status and updates stay right here.</p>}</div></section>
      </section>
      <aside className="space-y-5"><section className="border border-white/10 bg-[#151516] p-5"><div className="flex items-center gap-2"><MessageSquareText className="text-orange-300" size={18} /><h2 className="font-semibold">Resident resources</h2></div><p className="mt-2 text-sm leading-6 text-gray-400">Everything below uses the existing Black Phoenix account tools—no separate resident checkout or reward account is created.</p><div className="mt-4 grid gap-2"><button onClick={() => navigate("loyalty")} className="flex items-center justify-between border border-white/10 px-3 py-3 text-left text-sm hover:border-orange-400/60"><span><b className="block text-white">Referral rewards</b><span className="text-xs text-gray-500">Open your rewards & referral link</span></span><ArrowRight size={16} /></button><button onClick={() => navigate("gift-cards")} className="flex items-center justify-between border border-white/10 px-3 py-3 text-left text-sm hover:border-orange-400/60"><span><b className="block text-white">Gift cards</b><span className="text-xs text-gray-500">Send or purchase Black Phoenix credit</span></span><ArrowRight size={16} /></button><button onClick={() => navigate("public-store")} className="flex items-center justify-between border border-white/10 px-3 py-3 text-left text-sm hover:border-orange-400/60"><span><b className="block text-white">Online shop</b><span className="text-xs text-gray-500">Browse products and checkout securely</span></span><ArrowRight size={16} /></button></div></section>
        {experience.ads.filter(ad => ad.active).map(ad => <section key={ad.id} className="border border-orange-400/20 bg-gradient-to-br from-[#1b1713] to-[#121212] p-5"><p className="text-[10px] font-bold uppercase tracking-[.18em] text-orange-300">From your property team</p><h2 className="mt-2 text-xl font-semibold">{ad.title}</h2><p className="mt-2 text-sm leading-6 text-gray-400">{ad.body}</p><button onClick={() => navigate(ad.ctaRoute)} className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-orange-300 hover:text-orange-200">{ad.ctaLabel} <ArrowRight size={15} /></button></section>)}
      </aside>
    </div>
  </main>;
}
