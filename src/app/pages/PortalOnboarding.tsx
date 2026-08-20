import { ChangeEvent, useEffect, useMemo, useState } from "react";
import { ArrowRight, Building2, CheckCircle2, CircleDashed, FileUp, Loader2, LockKeyhole, Phone, ShieldCheck, Sparkles, XCircle } from "lucide-react";
import { toast } from "sonner@2.0.3";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import { projectId, publicAnonKey } from "../utils/supabase/info";

const BASE = `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6`;

type Task = { id: string; label: string; required?: boolean; status: string; submittedAt?: string; reviewedAt?: string };
type DocumentRecord = { id: string; taskId: string; name: string; status: string; uploadedAt?: string; reviewNote?: string };
type Intake = { applicantName?: string; applicantEmail?: string; applicantPhone?: string; portalType?: string; status?: string; ownerProvisioned?: boolean; planInterest?: string; profile?: { fullName?: string; email?: string; phone?: string; company?: string; address?: string; completed?: boolean }; requiredTasks?: Task[]; documents?: DocumentRecord[] };

export default function PortalOnboarding() {
  const { user, isOwner } = useAuth();
  const [intake, setIntake] = useState<Intake | null>(null);
  const [applicationId, setApplicationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploadingTask, setUploadingTask] = useState<string | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({ fullName: '', phone: '', company: '', address: '', planInterest: 'not_selected' });
  // Account setup: when a recipient arrives from an invite link (which carries a
  // one-time ?token= and their ?email=), we show a "Create your password" step
  // before the checklist. The account is already provisioned server-side.
  const [needsPassword, setNeedsPassword] = useState(false);
  const [setupEmail, setSetupEmail] = useState('');
  const [setupToken, setSetupToken] = useState('');
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [settingPassword, setSettingPassword] = useState(false);

  const token = async () => (await supabase.auth.getSession()).data.session?.access_token;
  const load = async () => {
    setLoading(true);
    try {
      const accessToken = await token();
      if (!accessToken) {
        // Not signed in. If the URL carries an invite token, show the
        // create-password step; otherwise there's nothing to onboard.
        const params = new URLSearchParams(window.location.search);
        const t = params.get('token') || '';
        const e = (params.get('email') || '').trim().toLowerCase();
        if (t) { setSetupToken(t); setSetupEmail(e); setNeedsPassword(true); return; }
        throw new Error("Open the link from your invitation email to set up your portal.");
      }
      const response = await fetch(`${BASE}/intake/my-onboarding`, { headers: { Authorization: `Bearer ${accessToken}` } });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || "Could not load onboarding.");
      setIntake(result.intake);
      setApplicationId(result.access?.applicationId || null);
      if (result.intake) setProfileForm({ fullName: result.intake.profile?.fullName || result.intake.applicantName || '', phone: result.intake.profile?.phone || result.intake.applicantPhone || '', company: result.intake.profile?.company || '', address: result.intake.profile?.address || '', planInterest: result.intake.planInterest || 'not_selected' });
    } catch (error: any) {
      toast.error(error.message || "Could not load onboarding.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const claimRole = String(user?.app_metadata?.role || user?.user_metadata?.role || user?.user_metadata?.accountType || '').toLowerCase().replace(/[\s-]+/g, '_');
    const ownerByClaim = ['owner', 'master_admin', 'platform_owner', 'business_owner'].includes(claimRole);
    if (!isOwner && !ownerByClaim) return;
    const navigate = (window as any).__navigateApp;
    if (typeof navigate === 'function') navigate('unified-dashboard'); else window.history.replaceState({}, '', '/unified-dashboard');
  }, [isOwner, user?.id]);

  useEffect(() => { load(); }, []);

  const submitPassword = async (event: React.FormEvent) => {
    event.preventDefault();
    if (pw.length < 8) { toast.error('Password must be at least 8 characters.'); return; }
    if (pw !== pw2) { toast.error('Passwords do not match.'); return; }
    setSettingPassword(true);
    try {
      // 1) Exchange the one-time invite token for the chosen password.
      const res = await fetch(`${BASE}/intake/set-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${publicAnonKey}`, apikey: publicAnonKey },
        body: JSON.stringify({ token: setupToken, password: pw }),
      });
      const rawText = await res.text();
      let result: any = {};
      try { result = JSON.parse(rawText); } catch { /* non-JSON (gateway/HTML error) */ }
      console.log(`[set-password] status=${res.status} body=`, rawText);
      if (!res.ok || !result.success) {
        throw new Error(result.error || `Set-password failed (HTTP ${res.status}): ${rawText.slice(0, 200) || 'no response body'}`);
      }

      // 2) Sign them in immediately with the password they just created.
      const email = (result.email || setupEmail).trim().toLowerCase();
      const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password: pw });
      if (signInErr) throw new Error(`Password set, but sign-in failed: ${signInErr.message}. Try signing in with your new password.`);

      toast.success('Password created — welcome!');
      // 3) Clear the token from the URL and load their onboarding.
      window.history.replaceState({}, '', `/portal-onboarding${window.location.search.replace(/[?&]token=[^&]*/,'').replace(/^&/,'?') || ''}`);
      setNeedsPassword(false);
      setPw(''); setPw2('');
      await load();
    } catch (error: any) {
      toast.error(error.message || 'Could not set your password.');
    } finally {
      setSettingPassword(false);
    }
  };

  const required = useMemo(() => intake?.requiredTasks?.filter(task => task.required) || [], [intake]);
  const complete = required.filter(task => task.status === "complete").length;
  const progress = required.length ? Math.round((complete / required.length) * 100) : 0;

  const saveProfile = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!profileForm.fullName.trim() || !profileForm.phone.trim()) { toast.error('Your full name and phone number are required.'); return; }
    setSavingProfile(true);
    try {
      const accessToken = await token();
      if (!accessToken) throw new Error('Your session has expired. Please sign in again.');
      const response = await fetch(`${BASE}/intake/my-onboarding/profile`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` }, body: JSON.stringify(profileForm) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.success) throw new Error(result.error || 'Could not save your profile.');
      setIntake(result.intake);
      toast.success(profileForm.planInterest === 'not_selected' || profileForm.planInterest === 'later' ? 'Profile complete. Your free portal access is active.' : 'Profile complete. Your plan interest was sent to Black Phoenix.');
    } catch (error: any) { toast.error(error.message || 'Could not save your profile.'); }
    finally { setSavingProfile(false); }
  };

  const enterPortal = () => {
    // Every portal type must appear here. The fallback below is silent, so a
    // missing entry does not error — it quietly delivers someone to the customer
    // portal, which looks to them like the invitation was for the wrong thing.
    // `tenant` is included even though landlord-issued invites do not currently
    // pass through onboarding, because the cost of the entry is one line and the
    // cost of its absence is an invisible misroute.
    const routes: Record<string, string> = { customer: 'customer-portal-app', vendor: 'vendor-portal', subcontractor: 'subcontractor-portal', employee: 'employee-portal', advertiser: 'advertiser-portal', investor: 'investor-portal', property_manager: 'property-manager-portal', condo_manager: 'condo-manager-portal', landlord: 'landlord-portal', territory_owner: 'territory-portal', tenant: 'tenant-portal' };
    const route = routes[String(intake?.portalType || '')] || 'customer-portal-app';
    const navigate = (window as any).__navigateApp;
    if (typeof navigate === 'function') navigate(route); else window.location.assign(`/${route}`);
  };

  const openDocument = async (documentId: string) => {
    try {
      const accessToken = await token();
      if (!accessToken || !applicationId) throw new Error('Document link is not available yet.');
      const response = await fetch(`${BASE}/intake/onboarding/${applicationId}/documents/${documentId}/download`, { headers: { Authorization: `Bearer ${accessToken}` } });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || 'Could not open document.');
      window.open(result.url, '_blank', 'noopener,noreferrer');
    } catch (error: any) { toast.error(error.message || 'Could not open document.'); }
  };

  const upload = async (task: Task, event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploadingTask(task.id);
    try {
      const accessToken = await token();
      if (!accessToken) throw new Error("Your session has expired. Please sign in again.");
      const body = new FormData();
      body.set("taskId", task.id);
      body.set("file", file);
      const response = await fetch(`${BASE}/intake/my-onboarding/documents`, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
        body,
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || "Upload failed.");
      setIntake(current => current ? { ...current, requiredTasks: result.requiredTasks, documents: [...(current.documents || []), result.document] } : current);
      toast.success(`${file.name} submitted for review.`);
    } catch (error: any) {
      toast.error(error.message || "Upload failed.");
    } finally {
      setUploadingTask(null);
      event.target.value = "";
    }
  };

  if (loading) return <div className="min-h-screen bg-[#0a0a0a] grid place-items-center text-white"><Loader2 className="w-8 h-8 animate-spin text-orange-500" /></div>;

  if (needsPassword) return (
    <main className="min-h-screen bg-[#0a0a0a] px-5 py-10 text-white grid place-items-center">
      <form onSubmit={submitPassword} className="w-full max-w-md border border-white/10 bg-[#111111] p-7 shadow-2xl shadow-black/30 md:p-9">
        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-orange-300"><LockKeyhole className="h-4 w-4" /> Portal account setup</p>
        <h1 className="mt-4 text-2xl font-semibold tracking-[-0.02em] md:text-3xl">Create your password</h1>
        <p className="mt-3 text-sm leading-6 text-gray-400">Your portal account is ready. Set a password to finish setting up and go straight to your portal.</p>

        <label className="mt-6 block text-sm font-medium text-gray-300">Email
          <input type="email" value={setupEmail} onChange={(e) => setSetupEmail(e.target.value)} readOnly={!!setupEmail} className="mt-2 w-full border border-white/10 bg-[#080808] px-3 py-3 text-white outline-none transition focus:border-orange-400 read-only:text-gray-400" />
        </label>
        <label className="mt-4 block text-sm font-medium text-gray-300">Create password
          <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="At least 8 characters" autoComplete="new-password" className="mt-2 w-full border border-white/10 bg-[#080808] px-3 py-3 text-white outline-none transition focus:border-orange-400" />
        </label>
        <label className="mt-4 block text-sm font-medium text-gray-300">Confirm password
          <input type="password" value={pw2} onChange={(e) => setPw2(e.target.value)} placeholder="Re-enter password" autoComplete="new-password" className="mt-2 w-full border border-white/10 bg-[#080808] px-3 py-3 text-white outline-none transition focus:border-orange-400" />
        </label>

        <button type="submit" disabled={settingPassword} className="mt-6 inline-flex w-full items-center justify-center gap-2 bg-orange-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-orange-500 disabled:cursor-not-allowed disabled:opacity-50">{settingPassword ? <><Loader2 className="h-4 w-4 animate-spin" /> Setting up…</> : <>Create password & continue <ArrowRight className="h-4 w-4" /></>}</button>
      </form>
    </main>
  );

  if (!intake) return <div className="min-h-screen bg-[#0a0a0a] grid place-items-center px-6 text-center text-gray-300">No portal onboarding record is available for this account.</div>;

  if (intake.ownerProvisioned && !intake.profile?.completed) return (
    <main className="min-h-screen bg-[#0a0a0a] px-5 py-10 text-white md:px-10 md:py-16">
      <form onSubmit={saveProfile} className="mx-auto max-w-3xl border border-white/10 bg-[#111111] p-6 shadow-2xl shadow-black/30 md:p-10">
        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-orange-300"><Sparkles className="h-4 w-4" /> Your free portal access is ready</p>
        <h1 className="mt-4 text-3xl font-semibold tracking-[-0.02em] md:text-4xl">Finish your profile, then choose what you need.</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-400">Black Phoenix created your <span className="capitalize text-gray-200">{String(intake.portalType || '').replace(/_/g, ' ')}</span> access at no charge. Complete your account details before entering the portal. Plan selection is optional and never creates a charge from this screen.</p>
        <div className="mt-8 grid gap-5 md:grid-cols-2">
          <label className="text-sm font-medium text-gray-300">Full name<input required value={profileForm.fullName} onChange={(event) => setProfileForm((current) => ({ ...current, fullName: event.target.value }))} className="mt-2 w-full border border-white/10 bg-[#080808] px-3 py-3 text-white outline-none transition focus:border-orange-400" /></label>
          <label className="text-sm font-medium text-gray-300">Phone number<div className="relative mt-2"><Phone className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-gray-500" /><input required value={profileForm.phone} onChange={(event) => setProfileForm((current) => ({ ...current, phone: event.target.value }))} className="w-full border border-white/10 bg-[#080808] py-3 pl-10 pr-3 text-white outline-none transition focus:border-orange-400" /></div></label>
          <label className="text-sm font-medium text-gray-300">Company or property <span className="text-gray-600">(optional)</span><div className="relative mt-2"><Building2 className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-gray-500" /><input value={profileForm.company} onChange={(event) => setProfileForm((current) => ({ ...current, company: event.target.value }))} className="w-full border border-white/10 bg-[#080808] py-3 pl-10 pr-3 text-white outline-none transition focus:border-orange-400" /></div></label>
          <label className="text-sm font-medium text-gray-300">Address <span className="text-gray-600">(optional)</span><input value={profileForm.address} onChange={(event) => setProfileForm((current) => ({ ...current, address: event.target.value }))} className="mt-2 w-full border border-white/10 bg-[#080808] px-3 py-3 text-white outline-none transition focus:border-orange-400" /></label>
        </div>
        <fieldset className="mt-9"><legend className="text-base font-semibold text-white">Would you like plan information?</legend><p className="mt-1 text-sm text-gray-500">Choose an option now or keep your free portal access without a plan.</p><div className="mt-4 grid gap-3 sm:grid-cols-2">{[['not_selected', 'No plan right now', 'Enter with free access only.'], ['subscription', 'Subscription options', 'Recurring portal or service plans.'], ['maintenance', 'Maintenance plans', 'Planned service and included-hours options.'], ['both', 'Both plan types', 'Ask Black Phoenix to help build both.'], ['later', 'Decide later', 'Keep access and revisit from your portal.']].map(([value, title, detail]) => <label key={value} className={`cursor-pointer border p-4 transition ${profileForm.planInterest === value ? 'border-orange-400 bg-orange-500/10' : 'border-white/10 bg-[#151515] hover:border-white/25'}`}><input className="sr-only" type="radio" name="planInterest" value={value} checked={profileForm.planInterest === value} onChange={() => setProfileForm((current) => ({ ...current, planInterest: value }))} /><span className="block text-sm font-semibold text-white">{title}</span><span className="mt-1 block text-xs leading-5 text-gray-500">{detail}</span></label>)}</div></fieldset>
        <button disabled={savingProfile} type="submit" className="mt-8 inline-flex items-center gap-2 bg-orange-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-orange-500 disabled:cursor-not-allowed disabled:opacity-50">{savingProfile ? 'Saving your profile…' : 'Activate free portal access'}<ArrowRight className="h-4 w-4" /></button>
      </form>
    </main>
  );

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white selection:bg-orange-500/30">
      <div className="mx-auto max-w-5xl px-5 py-10 md:px-10 md:py-16">
        <header className="border-b border-white/10 pb-8 md:flex md:items-end md:justify-between">
          <div>
            <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-orange-300"><LockKeyhole className="h-3.5 w-3.5" /> Secure portal onboarding</p>
            <h1 className="max-w-2xl text-4xl font-semibold tracking-[-0.02em] md:text-5xl">Welcome, {intake.applicantName || "there"}.</h1>
            <p className="mt-3 max-w-xl text-gray-400">Complete the required items for your <span className="capitalize text-gray-200">{String(intake.portalType || "portal").replace(/_/g, " ")}</span> access. Documents stay private until reviewed by Black Phoenix.</p>
          </div>
          <div className="mt-6 min-w-40 md:mt-0">
            <p className="text-right text-3xl font-semibold">{progress}%</p>
            <div className="mt-2 h-1.5 overflow-hidden bg-white/10"><div className="h-full bg-orange-500 transition-all" style={{ width: `${progress}%` }} /></div>
            <p className="mt-2 text-right text-xs text-gray-500">{complete} of {required.length} required items approved</p>
          </div>
        </header>

        <section className="mt-10 grid gap-px overflow-hidden border border-white/10 bg-white/10 md:grid-cols-[1fr_280px]">
          <div className="bg-[#101010] p-5 md:p-8">
            <h2 className="text-xl font-semibold">Your checklist</h2>
            <div className="mt-6 divide-y divide-white/10">
              {(intake.requiredTasks || []).map(task => {
                const document = intake.documents?.filter(item => item.taskId === task.id).at(-1);
                const approved = task.status === "complete";
                const submitted = task.status === "submitted";
                const rejected = task.status === "rejected";
                return <div key={task.id} className="py-5 first:pt-0 last:pb-0">
                  <div className="flex gap-4">
                    {approved ? <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" /> : rejected ? <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-400" /> : <CircleDashed className="mt-0.5 h-5 w-5 shrink-0 text-orange-300" />}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2"><h3 className="font-medium">{task.label}</h3>{task.required && <span className="text-[10px] font-bold uppercase tracking-widest text-orange-300">Required</span>}</div>
                      <p className="mt-1 text-sm text-gray-500">{approved ? "Approved" : rejected ? "Needs another submission" : submitted ? `Submitted${document?.uploadedAt ? ` · ${new Date(document.uploadedAt).toLocaleDateString()}` : ""}` : "Not started"}</p>
                      {document?.reviewNote && <p className="mt-2 text-sm text-red-300">Reviewer note: {document.reviewNote}</p>}
                      {document && <button type="button" onClick={() => openDocument(document.id)} className="mt-3 mr-3 text-sm text-orange-200 underline underline-offset-4">View submitted file</button>}
                      {!approved && <label className="mt-4 inline-flex cursor-pointer items-center gap-2 border border-white/15 px-3 py-2 text-sm font-medium transition hover:border-orange-400 hover:text-orange-200"><FileUp className="h-4 w-4" />{uploadingTask === task.id ? "Uploading…" : submitted ? "Replace file" : "Upload file"}<input className="sr-only" type="file" onChange={event => upload(task, event)} disabled={uploadingTask === task.id} /></label>}
                    </div>
                  </div>
                </div>;
              })}
            </div>
          </div>
          <aside className="bg-[#151515] p-5 md:p-7">
            <ShieldCheck className="h-6 w-6 text-orange-300" />
            <h2 className="mt-4 font-semibold">Activation status</h2>
            <p className="mt-2 text-sm leading-6 text-gray-400">Your account is active, with portal features unlocking as required onboarding items are approved.</p>
            <p className="mt-6 border-t border-white/10 pt-5 text-xs uppercase tracking-[0.15em] text-gray-500">Current: <span className="text-orange-200">{String(intake.status || "pending").replace(/_/g, " ")}</span></p>
            {intake.ownerProvisioned && intake.profile?.completed && <button type="button" onClick={enterPortal} className="mt-5 inline-flex items-center gap-2 bg-orange-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-orange-500">Enter your portal <ArrowRight className="h-4 w-4" /></button>}
          </aside>
        </section>
      </div>
    </main>
  );
}
