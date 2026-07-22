import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bell, CalendarDays, Camera, ChevronRight, Clock3, FileText, Gift,
  Home, MessageSquare, ReceiptText, ShieldCheck, Sparkles, UserRound,
  Wrench, ClipboardList, CircleDollarSign, ArrowLeft,
} from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { supabase } from "../../lib/supabase";
import { projectId, publicAnonKey } from "../../utils/supabase/info";
import EmployeeMobileApp from "../../pages/EmployeeMobileApp";
import SponsoredMarquee from "../SponsoredMarquee";
import AdvertisingMarquee from "../AdvertisingMarquee";
import LogoMarquee from "../LogoMarquee";
import LayoutManager from "../layout-editor/LayoutManager";

const SERVER = `https://${projectId}.supabase.co/functions/v1/make-server-57095a78`;
type View = "dashboard" | "field";

type Task = { id: string; title: string; location?: string; scheduledAt?: string; status?: string };

export default function EmployeePortalView() {
  const { user } = useAuth();
  const [view, setView] = useState<View>("dashboard");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [weekHours, setWeekHours] = useState(0);
  const [isClockedIn, setIsClockedIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const employeeName = String(user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Field Technician");
  const employeeId = user?.id || "";

  const authHeaders = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) throw new Error("Sign in required.");
    return { Authorization: `Bearer ${session.access_token}`, apikey: publicAnonKey };
  }, []);

  const loadLiveSummary = useCallback(async () => {
    if (!employeeId) { setLoading(false); return; }
    try {
      const headers = await authHeaders();
      await fetch(`${SERVER}/time-tracking/employees`, { method: "POST", headers: { ...headers, "Content-Type": "application/json" }, body: JSON.stringify({ id: employeeId, name: employeeName, role: "Field Technician" }) });
      const [employeeResponse, tasksResponse, hoursResponse] = await Promise.all([
        fetch(`${SERVER}/time-tracking/employees/${employeeId}`, { headers }),
        fetch(`${SERVER}/time-tracking/tasks/${employeeId}`, { headers }),
        fetch(`${SERVER}/time-tracking/hours-summary`, { headers }),
      ]);
      const [employeeData, tasksData, hoursData] = await Promise.all([
        employeeResponse.json().catch(() => ({})), tasksResponse.json().catch(() => ({})), hoursResponse.json().catch(() => ({})),
      ]);
      setIsClockedIn(Boolean(employeeData?.activeEntry?.punchIn));
      setTasks(Array.isArray(tasksData?.tasks) ? tasksData.tasks : []);
      setWeekHours(Number(hoursData?.summary?.[employeeName]?.hoursThisWeek || 0));
    } catch {
      setTasks([]); setWeekHours(0); setIsClockedIn(false);
    } finally { setLoading(false); }
  }, [authHeaders, employeeId, employeeName]);

  useEffect(() => { void loadLiveSummary(); }, [loadLiveSummary]);

  const navigation = [
    { id: "dashboard", label: "Overview", icon: Home, action: () => setView("dashboard") },
    { id: "field", label: "Field Operations", icon: Wrench, action: () => setView("field") },
    { id: "change", label: "Change Orders", icon: ReceiptText, action: () => { window.location.href = "/change-order-camera"; } },
    { id: "messages", label: "Messages", icon: MessageSquare, action: () => { window.location.href = "/messages"; } },
    { id: "rewards", label: "Rewards & Referrals", icon: Gift, action: () => { window.location.href = "/rewards-perks?tab=referrals"; } },
    { id: "hr", label: "Onboarding & Tax", icon: ShieldCheck, action: () => { window.location.href = "/portal-onboarding"; } },
  ];
  const teamPosts = [
    { label: "Field team offers", copy: "Review current approved technician offers and perks.", href: "/rewards-perks", icon: Sparkles },
    { label: "Referral rewards", copy: "Share your link and review reward activity.", href: "/rewards-perks?tab=referrals", icon: Gift },
    { label: "Dispatch messages", copy: "Open current updates from dispatch and managers.", href: "/messages", icon: MessageSquare },
  ];
  const openTasks = tasks.filter(task => !["completed", "cancelled"].includes(String(task.status || "").toLowerCase()));
  const scheduledTasks = [...openTasks].sort((a, b) => {
    const aTime = a.scheduledAt ? new Date(a.scheduledAt).getTime() : Number.MAX_SAFE_INTEGER;
    const bTime = b.scheduledAt ? new Date(b.scheduledAt).getTime() : Number.MAX_SAFE_INTEGER;
    return aTime - bTime;
  });
  const formatScheduleTime = (scheduledAt?: string) => {
    if (!scheduledAt) return "Dispatch will confirm the time";
    const date = new Date(scheduledAt);
    if (Number.isNaN(date.getTime())) return "Dispatch will confirm the time";
    return date.toLocaleString([], { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  };
  const status = isClockedIn ? "Clocked in" : "Clocked out";
  const stats = useMemo(() => [
    { label: "Hours this week", value: loading ? "—" : weekHours.toFixed(1), hint: "Live time tracking", icon: Clock3, color: "text-blue-300" },
    { label: "Open work", value: loading ? "—" : String(openTasks.length), hint: "Assigned maintenance tasks", icon: ClipboardList, color: "text-orange-300" },
    { label: "Time status", value: loading ? "—" : status, hint: "GPS-backed time clock", icon: CircleDollarSign, color: isClockedIn ? "text-emerald-300" : "text-slate-300" },
    { label: "Field evidence", value: "Upload", hint: "Photos, video, and documents", icon: Camera, color: "text-purple-300" },
  ], [isClockedIn, loading, openTasks.length, status, weekHours]);

  return (
    <LayoutManager pageName="Employee Portal" enableCustomization={true} showEditButton={true}>
      <div className="w-full min-h-screen bg-[#0A0A0A] text-white">
        <SponsoredMarquee />
        <AdvertisingMarquee placement="portal-header" dismissible />
        <LogoMarquee />
      <div className="flex min-h-screen">
        <aside className="hidden w-72 shrink-0 border-r border-white/10 bg-[#111] lg:flex lg:flex-col">
          <div className="border-b border-white/10 px-6 py-6">
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-orange-400">Black Phoenix Builds</p>
            <h1 className="mt-2 text-xl font-black">Employee Portal</h1>
            <p className="mt-1 text-sm text-slate-500">Field maintenance operations</p>
          </div>
          <div className="flex-1 px-3 py-5">
            <p className="px-3 pb-2 text-[10px] font-black uppercase tracking-[0.18em] text-slate-600">Workspace</p>
            <nav className="space-y-1">{navigation.map(item => {
              const Icon = item.icon; const selected = (item.id === "dashboard" && view === "dashboard") || (item.id === "field" && view === "field");
              return <button key={item.id} onClick={item.action} className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold transition ${selected ? "bg-orange-500/15 text-orange-200" : "text-slate-400 hover:bg-white/5 hover:text-white"}`}><Icon className="h-4 w-4" />{item.label}{item.id === "messages" && <span className="ml-auto h-2 w-2 rounded-full bg-orange-400" />}</button>;
            })}</nav>
          </div>
          <div className="border-t border-white/10 p-4"><div className="flex items-center gap-3 rounded-xl bg-black/20 p-3"><div className="flex h-9 w-9 items-center justify-center rounded-full bg-orange-500/15 text-orange-300"><UserRound className="h-4 w-4" /></div><div className="min-w-0"><p className="truncate text-sm font-bold">{employeeName}</p><p className="text-xs text-slate-500">Field technician</p></div></div></div>
        </aside>

        <main className="min-w-0 flex-1">
          <header className="border-b border-white/10 bg-[#111]/95 px-4 py-4 backdrop-blur lg:px-8"><div className="mx-auto flex max-w-7xl items-center justify-between gap-4"><div><p className="text-xs font-semibold text-orange-400 lg:hidden">BLACK PHOENIX BUILDS</p><h2 className="text-lg font-black">{view === "field" ? "Field Operations" : `Welcome back, ${employeeName}`}</h2><p className="mt-1 text-xs text-slate-500">Maintenance, service evidence, time, and team support in one place.</p></div><div className="flex items-center gap-2"><button onClick={() => { window.location.href = "/messages"; }} className="relative rounded-xl border border-white/10 bg-white/5 p-2.5 text-slate-300 hover:text-white"><Bell className="h-4 w-4" /><span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-orange-400" /></button><button onClick={() => { window.location.href = "/unified-dashboard"; }} className="hidden items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-xs font-bold text-slate-300 hover:bg-white/5 sm:flex"><ArrowLeft className="h-3.5 w-3.5" />Command Center</button></div></div></header>

          {view === "field" ? <EmployeeMobileApp /> : <div className="mx-auto max-w-7xl space-y-6 p-4 lg:p-8">
            <section className="relative overflow-hidden rounded-2xl border border-orange-500/20 bg-gradient-to-br from-[#24140c] via-[#17110e] to-[#111] p-6 lg:p-8"><div className="relative z-10 max-w-2xl"><p className="text-xs font-black uppercase tracking-[0.2em] text-orange-300">Field command</p><h3 className="mt-2 text-3xl font-black tracking-[-0.02em]">Your maintenance day, organized.</h3><p className="mt-3 max-w-xl text-sm leading-6 text-slate-300">Clock time, work assigned maintenance visits, attach field evidence, submit a change order, and stay connected to dispatch without leaving your portal.</p><div className="mt-5 flex flex-wrap gap-3"><button onClick={() => setView("field")} className="flex items-center gap-2 rounded-xl bg-orange-600 px-4 py-3 text-sm font-black text-white hover:bg-orange-500"><Wrench className="h-4 w-4" />Open field operations</button><button onClick={() => { window.location.href = "/change-order-camera"; }} className="flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-bold text-white hover:bg-white/10"><ReceiptText className="h-4 w-4" />New change order</button></div></div><CalendarDays className="absolute -bottom-8 -right-8 h-44 w-44 text-orange-400/10" /></section>
            <section className="rounded-xl border border-white/10 bg-[#1A1A1A] p-5 sm:p-6"><div className="mb-4 flex items-center justify-between"><div><p className="text-xs font-black uppercase tracking-[0.16em] text-orange-300">Team updates</p><h3 className="mt-1 font-bold text-white">Posts for the field team</h3></div><button onClick={() => { window.location.href = "/messages"; }} className="text-sm font-bold text-orange-300 hover:text-orange-200">View messages →</button></div><div className="grid gap-3 md:grid-cols-3">{teamPosts.map(post => { const Icon = post.icon; return <button key={post.label} onClick={() => { window.location.href = post.href; }} className="group rounded-lg border border-white/5 bg-black/20 p-4 text-left transition hover:border-orange-500/30 hover:bg-black/30"><div className="flex items-start gap-3"><div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-orange-500/10"><Icon className="h-4 w-4 text-orange-300" /></div><div><p className="text-sm font-bold text-white group-hover:text-orange-200">{post.label}</p><p className="mt-1 text-xs leading-5 text-slate-500">{post.copy}</p></div></div></button>; })}</div></section>
            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{stats.map(stat => { const Icon = stat.icon; return <div key={stat.label} className="rounded-xl border border-white/10 bg-[#1a1a1a] p-5 transition hover:border-orange-500/30"><div className="mb-5 flex items-start justify-between"><div className="flex h-10 w-10 items-center justify-center rounded-lg border border-orange-500/20 bg-orange-500/10"><Icon className={`h-5 w-5 ${stat.color}`} /></div><ChevronRight className="h-4 w-4 text-slate-600" /></div><p className="text-2xl font-black text-white">{stat.value}</p><p className="mt-1 text-sm text-slate-300">{stat.label}</p><p className="mt-1 text-xs text-slate-600">{stat.hint}</p></div>; })}</section>
            <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
              <div className="rounded-xl border border-white/10 bg-[#1a1a1a] p-6">
                <div className="mb-5 flex items-center justify-between gap-3">
                  <div><div className="flex items-center gap-2"><CalendarDays className="h-4 w-4 text-orange-300" /><h3 className="font-bold">Your schedule</h3></div><p className="mt-1 text-sm text-slate-500">Upcoming assigned service visits</p></div>
                  <button onClick={() => setView("field")} className="shrink-0 text-sm font-bold text-orange-300 hover:text-orange-200">Open schedule</button>
                </div>
                {loading ? <p className="py-7 text-sm text-slate-500">Loading your schedule…</p> : scheduledTasks.length === 0 ? <div className="rounded-lg border border-dashed border-white/10 py-7 text-center"><CalendarDays className="mx-auto h-6 w-6 text-slate-600" /><p className="mt-2 text-sm text-slate-500">No visits are scheduled yet.</p><button onClick={() => { window.location.href = "/messages"; }} className="mt-3 text-xs font-bold text-orange-300">Ask dispatch about your schedule →</button></div> : <div className="space-y-2">{scheduledTasks.slice(0, 4).map(task => <button key={task.id} onClick={() => setView("field")} className="flex w-full items-center gap-3 rounded-lg border border-white/5 bg-black/20 p-3 text-left transition hover:border-orange-500/30 hover:bg-black/30"><div className="flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-md bg-orange-500/10 text-orange-200"><CalendarDays className="h-4 w-4" /></div><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-white">{task.title}</p><p className="mt-0.5 truncate text-xs text-slate-500">{task.location || "Location pending"}</p><p className="mt-1 text-xs font-medium text-orange-200">{formatScheduleTime(task.scheduledAt)}</p></div><ChevronRight className="h-4 w-4 shrink-0 text-slate-600" /></button>)}</div>}
              </div>
              <div className="rounded-xl border border-orange-500/15 bg-[#16110e] p-6"><p className="text-xs font-black uppercase tracking-[0.16em] text-orange-300">Today in the field</p><h3 className="mt-2 text-xl font-black text-white">Everything needed for the next stop.</h3><p className="mt-2 text-sm leading-6 text-slate-400">Clock time, view work details, add photos, and keep dispatch updated from Field Operations.</p><div className="mt-5 grid gap-2 sm:grid-cols-2 xl:grid-cols-1"><button onClick={() => setView("field")} className="flex items-center gap-3 rounded-lg bg-orange-600 px-4 py-3 text-left text-sm font-bold text-white hover:bg-orange-500"><Clock3 className="h-4 w-4" />Clock in & open tasks</button><button onClick={() => { window.location.href = "/messages"; }} className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-left text-sm font-semibold text-slate-200 hover:bg-white/10"><MessageSquare className="h-4 w-4 text-orange-300" />Message dispatch</button></div></div>
            </section>
            <section className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]"><div className="rounded-xl border border-white/10 bg-[#1a1a1a] p-6"><div className="mb-5 flex items-center justify-between"><div><h3 className="font-bold">Assigned maintenance work</h3><p className="mt-1 text-sm text-slate-500">Live tasks assigned to your technician account</p></div><button onClick={() => setView("field")} className="text-sm font-bold text-orange-300 hover:text-orange-200">Open tasks</button></div>{loading ? <p className="py-8 text-sm text-slate-500">Loading work assignments…</p> : openTasks.length === 0 ? <p className="rounded-lg border border-dashed border-white/10 py-8 text-center text-sm text-slate-500">No active maintenance work is assigned right now.</p> : <div className="space-y-3">{openTasks.slice(0, 5).map(task => <button key={task.id} onClick={() => setView("field")} className="flex w-full items-center justify-between gap-4 rounded-lg border border-white/5 bg-black/20 p-4 text-left hover:border-orange-500/25"><div><p className="font-semibold text-white">{task.title}</p><p className="mt-1 text-xs text-slate-500">{task.location || "Location pending"} · {task.scheduledAt ? new Date(task.scheduledAt).toLocaleString() : "Schedule pending"}</p></div><span className="rounded-md bg-orange-500/10 px-2 py-1 text-xs font-bold text-orange-300">{task.status || "pending"}</span></button>)}</div>}</div>
              <div className="space-y-4"><div className="rounded-xl border border-white/10 bg-[#1a1a1a] p-5"><h3 className="font-bold">Quick field tools</h3><div className="mt-4 space-y-2">{[{ label: "Upload site evidence", icon: Camera, action: () => setView("field") }, { label: "Submit change order", icon: ReceiptText, action: () => { window.location.href = "/change-order-camera"; } }, { label: "Referral rewards", icon: Gift, action: () => { window.location.href = "/rewards-perks?tab=referrals"; } }, { label: "Onboarding & tax forms", icon: ShieldCheck, action: () => { window.location.href = "/portal-onboarding"; } }].map(tool => { const Icon = tool.icon; return <button key={tool.label} onClick={tool.action} className="flex w-full items-center gap-3 rounded-lg bg-black/20 px-3 py-3 text-left text-sm font-semibold text-slate-300 hover:bg-white/5 hover:text-white"><Icon className="h-4 w-4 text-orange-300" />{tool.label}<ChevronRight className="ml-auto h-4 w-4 text-slate-600" /></button>; })}</div></div><div className="rounded-xl border border-blue-400/15 bg-blue-500/5 p-5"><p className="text-xs font-black uppercase tracking-[0.16em] text-blue-300">Need help?</p><p className="mt-2 text-sm text-slate-300">Use Team Messages for dispatch, manager questions, schedule support, or safety escalation.</p><button onClick={() => { window.location.href = "/messages"; }} className="mt-4 text-sm font-bold text-blue-300">Open messages →</button></div></div>
            </section>
          </div>}
        </main>
      </div>
      </div>
    </LayoutManager>
  );
}
