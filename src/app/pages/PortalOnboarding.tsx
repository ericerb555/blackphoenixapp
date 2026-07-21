import { ChangeEvent, useEffect, useMemo, useState } from "react";
import { CheckCircle2, CircleDashed, FileUp, Loader2, LockKeyhole, ShieldCheck, XCircle } from "lucide-react";
import { toast } from "sonner@2.0.3";
import { supabase } from "../lib/supabase";
import { projectId } from "../utils/supabase/info";

const BASE = `https://${projectId}.supabase.co/functions/v1/make-server-57095a78`;

type Task = { id: string; label: string; required?: boolean; status: string; submittedAt?: string; reviewedAt?: string };
type DocumentRecord = { id: string; taskId: string; name: string; status: string; uploadedAt?: string; reviewNote?: string };
type Intake = { applicantName?: string; portalType?: string; status?: string; requiredTasks?: Task[]; documents?: DocumentRecord[] };

export default function PortalOnboarding() {
  const [intake, setIntake] = useState<Intake | null>(null);
  const [applicationId, setApplicationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploadingTask, setUploadingTask] = useState<string | null>(null);

  const token = async () => (await supabase.auth.getSession()).data.session?.access_token;
  const load = async () => {
    setLoading(true);
    try {
      const accessToken = await token();
      if (!accessToken) throw new Error("Sign in to view your onboarding checklist.");
      const response = await fetch(`${BASE}/intake/my-onboarding`, { headers: { Authorization: `Bearer ${accessToken}` } });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || "Could not load onboarding.");
      setIntake(result.intake);
      setApplicationId(result.access?.applicationId || null);
    } catch (error: any) {
      toast.error(error.message || "Could not load onboarding.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const required = useMemo(() => intake?.requiredTasks?.filter(task => task.required) || [], [intake]);
  const complete = required.filter(task => task.status === "complete").length;
  const progress = required.length ? Math.round((complete / required.length) * 100) : 0;

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
  if (!intake) return <div className="min-h-screen bg-[#0a0a0a] grid place-items-center px-6 text-center text-gray-300">No portal onboarding record is available for this account.</div>;

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
          </aside>
        </section>
      </div>
    </main>
  );
}
