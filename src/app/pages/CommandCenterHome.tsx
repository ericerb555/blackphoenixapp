/**
 * CommandCenterHome — where the day gets run from.
 *
 * WHAT WAS WRONG WITH MY LAST ATTEMPT
 *
 * I built it as a dashboard: six numbers, two charts, eight pinned tools, and
 * the other eighty-three shut in a drawer. Eric's answer was that this is where
 * he goes to do everything and there was only a small section of buttons.
 *
 * He is right and the mistake was mine. A launcher that hides most of what it
 * launches is not a launcher — it is a quiz about which eight things you were
 * supposed to want. So every tool is on the page now, grouped by area, and the
 * search reaches all of them at once.
 *
 * WHAT IT LOOKS LIKE
 *
 * The portals, because he asked for that and because they already work: the
 * gradient header, the tinted stat cards, the progress bars, the status pills.
 * Nothing new was invented for this screen — the visual language is lifted from
 * `CustomerPortalView` so the app stops looking like two applications.
 *
 * NEEDS YOU NOW
 *
 * The band under the header is the point of the whole screen. Money that is
 * late, work requests waiting on an approval, and applications waiting on an
 * answer — each one a queue with somebody at the other end of it. They come
 * from `/command-center/summary` and `/invoices`, both of which already
 * existed. `pendingApplications` in particular has been returned by the server
 * since it was written and thrown away by this screen every time.
 *
 * NOTHING HERE IS INVENTED
 *
 * Where a number is zero it is zero because that is what the data says. And
 * when the numbers cannot be loaded at all the screen says so, rather than
 * showing zeros — a failed fetch and a business with no revenue, no jobs and no
 * customers used to render identically, and the zeros were the more believable
 * of the two.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Search, X, TrendingUp, AlertTriangle, DollarSign, Briefcase,
  Users, HardHat, FileWarning, Pin, PinOff, ArrowRight, Loader2, ChevronRight,
  ClipboardList, UserPlus, CheckCircle2, WifiOff,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { projectId } from '../utils/supabase/info';

const SERVER = `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6`;

interface ModuleCard {
  label: string; path: string; icon: any; color: string;
  tab?: string; description?: string; badge?: string;
}
interface TabCategory { id: string; label: string; icon: any; modules: ModuleCard[] }

export interface CommandCenterHomeProps {
  tabCategories: TabCategory[];
  companyName: string;
  /** The company mark, shown beside the name. */
  companyLogo?: string | null;
  onNavigate: (path: string, tab?: string) => void;
  summary: {
    totalRevenue: number;
    openInvoiceTotal?: number;
    activeJobsCount: number;
    customersCount: number;
    teamCount: number;
    pendingWorkRequests?: number;
    pendingApplications?: number;
    chartData?: { month: string; revenue: number }[];
  };
  /** Set when the summary could not be loaded, so zeros can explain themselves. */
  metricsError?: string;
}

/**
 * A starting point for the pinned row, not a limit. Everything is on the page
 * regardless; these just sit at the top where the hands already are.
 */
const DEFAULT_PINS = [
  'Active Jobs', 'Work Request Intake', 'Master Schedule', 'Phoenix Exchange',
  'Job Financials', 'Materials Center', 'CRM Hub', 'eCommerce Store',
];

const PIN_KEY = 'command_center_pins';

const money = (n: unknown) => `$${Math.round(Number(n) || 0).toLocaleString()}`;
const daysBetween = (a: number, b: number) => Math.floor((a - b) / 86400000);

/** An invoice is delinquent when money is owed and the date has passed. */
function delinquentFrom(invoices: any[]) {
  const today = Date.now();
  return invoices
    .map((inv) => {
      const status = String(inv.status || '').toLowerCase();
      if (['paid', 'completed', 'cancelled', 'void', 'draft'].includes(status)) return null;
      const balance = Number(inv.balance_due ?? inv.balanceDue ?? inv.balance ?? inv.total_amount ?? inv.total ?? 0);
      if (!(balance > 0)) return null;
      const rawDue = inv.due_date || inv.dueDate;
      if (!rawDue) return null;
      const due = Date.parse(String(rawDue));
      if (!Number.isFinite(due) || due >= today) return null;
      return {
        id: String(inv.id || inv.invoice_number || ''),
        number: String(inv.invoice_number || inv.number || inv.id || ''),
        customer: String(inv.customer_name || inv.customerName || inv.client_name || inv.bill_to || 'Unnamed customer'),
        balance,
        daysLate: daysBetween(today, due),
      };
    })
    .filter(Boolean)
    // Oldest debt first: the longer it has been outstanding the less likely it
    // is to be collected, so that is the one to call about.
    .sort((a: any, b: any) => b.daysLate - a.daysLate) as any[];
}

export default function CommandCenterHome({
  tabCategories, companyName, companyLogo, onNavigate, summary, metricsError,
}: CommandCenterHomeProps) {
  const [query, setQuery] = useState('');
  const [invoices, setInvoices] = useState<any[]>([]);
  const [invoicesLoading, setInvoicesLoading] = useState(true);
  const [invoiceError, setInvoiceError] = useState('');
  /** Guards against a poll and a focus landing on top of each other. */
  const loadingRef = useRef(false);
  const [pins, setPins] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(PIN_KEY);
      const parsed = saved ? JSON.parse(saved) : null;
      return Array.isArray(parsed) && parsed.length ? parsed : DEFAULT_PINS;
    } catch { return DEFAULT_PINS; }
  });

  const allModules = useMemo(
    () => tabCategories.flatMap((c) => c.modules.map((m) => ({ ...m, category: c.label }))),
    [tabCategories],
  );

  /**
   * The invoices behind "still delinquent".
   *
   * WHY THIS REFRESHES RATHER THAN LOADING ONCE
   *
   * It used to run once on mount and never again. Eric marked an invoice paid
   * and it stayed in the past-due list — the server had it right the whole
   * time, and this screen was showing a copy it had taken minutes or hours
   * earlier. The numbers beside it were polling every sixty seconds, so the
   * page was contradicting itself as well as the database.
   *
   * A dashboard is a screen people leave open. Anything on it that never
   * refreshes is a screenshot pretending to be a status.
   */
  const loadInvoices = useCallback(async (opts: { quiet?: boolean } = {}) => {
    // A refresh already in flight is not worth stacking another on top of.
    if (loadingRef.current) return;
    loadingRef.current = true;
    if (!opts.quiet) setInvoicesLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;
      const res = await fetch(`${SERVER}/invoices`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) {
        setInvoiceError(data?.error || 'Invoices could not be loaded.');
      } else {
        setInvoices(Array.isArray(data.invoices) ? data.invoices : []);
        setInvoiceError('');
      }
    } catch (err: any) {
      setInvoiceError(err?.message || 'Invoices could not be loaded.');
    } finally {
      loadingRef.current = false;
      setInvoicesLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInvoices();

    // Same cadence as the numbers, so the two halves of the screen cannot
    // disagree about how old they are.
    const interval = setInterval(() => loadInvoices({ quiet: true }), 60000);

    // The moment that actually matters: coming back to the tab after settling
    // an invoice somewhere else. Cheaper than polling faster and it catches
    // exactly the case that made this look broken.
    const onFocus = () => { if (!document.hidden) loadInvoices({ quiet: true }); };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onFocus);
    };
  }, [loadInvoices]);

  const overdue = useMemo(() => delinquentFrom(invoices), [invoices]);
  const overdueTotal = overdue.reduce((s, o) => s + o.balance, 0);

  const pinned = useMemo(
    () => pins.map((label) => allModules.find((m) => m.label === label)).filter(Boolean) as any[],
    [pins, allModules],
  );

  const togglePin = (label: string) => {
    setPins((current) => {
      const next = current.includes(label) ? current.filter((l) => l !== label) : [...current, label];
      try { localStorage.setItem(PIN_KEY, JSON.stringify(next)); } catch { /* storage full or blocked */ }
      return next;
    });
  };

  /**
   * Search reaches every module in every area.
   *
   * When something is typed the whole page filters to matches rather than
   * dropping a separate results panel over the top — same page, fewer things
   * on it, which is what a person means by searching a page.
   */
  const q = query.trim().toLowerCase();
  const matches = (m: any) =>
    !q
    || m.label.toLowerCase().includes(q)
    || (m.description || '').toLowerCase().includes(q)
    || String(m.category || '').toLowerCase().includes(q);

  const visibleCategories = useMemo(
    () => tabCategories
      .map((c) => ({ ...c, modules: c.modules.filter((m) => matches({ ...m, category: c.label })) }))
      .filter((c) => c.modules.length > 0),
    [tabCategories, q],
  );
  const matchCount = visibleCategories.reduce((n, c) => n + c.modules.length, 0);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === 'k' && (e.metaKey || e.ctrlKey)) || (e.key === '/' && !/input|textarea/i.test((e.target as HTMLElement)?.tagName || ''))) {
        e.preventDefault();
        (document.getElementById('cc-search') as HTMLInputElement)?.focus();
      }
      if (e.key === 'Escape') setQuery('');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const chart = summary.chartData || [];
  const chartPeak = chart.reduce((m, d) => Math.max(m, Number(d.revenue) || 0), 0);

  const go = (m: any) => { setQuery(''); onNavigate(m.path, m.tab); };

  /**
   * What is waiting on somebody.
   *
   * Only queues with something actually in them. A row of confident zeros
   * teaches people to stop reading the band, which costs more than the space it
   * saves.
   */
  const actions = [
    overdueTotal > 0 && {
      key: 'overdue',
      count: overdue.length,
      value: money(overdueTotal),
      label: overdue.length === 1 ? 'invoice past due' : 'invoices past due',
      detail: overdue[0] ? `Oldest: ${overdue[0].customer}, ${overdue[0].daysLate} days late` : '',
      icon: AlertTriangle,
      tint: 'from-red-600/15 to-red-700/10 border-red-500/30',
      accent: 'text-red-400',
      cta: 'Chase it',
      go: () => onNavigate('/invoices-new'),
    },
    (summary.pendingWorkRequests || 0) > 0 && {
      key: 'requests',
      count: summary.pendingWorkRequests || 0,
      value: String(summary.pendingWorkRequests || 0),
      label: (summary.pendingWorkRequests || 0) === 1 ? 'work request waiting' : 'work requests waiting',
      detail: 'A customer has asked for something and nobody has answered',
      icon: ClipboardList,
      tint: 'from-orange-600/15 to-orange-700/10 border-orange-500/30',
      accent: 'text-orange-400',
      cta: 'Review',
      go: () => onNavigate('/work-request-hub'),
    },
    (summary.pendingApplications || 0) > 0 && {
      key: 'applications',
      count: summary.pendingApplications || 0,
      value: String(summary.pendingApplications || 0),
      label: (summary.pendingApplications || 0) === 1 ? 'application pending' : 'applications pending',
      detail: 'Someone applied to work with you and is still waiting',
      icon: UserPlus,
      tint: 'from-purple-600/15 to-purple-700/10 border-purple-500/30',
      accent: 'text-purple-400',
      cta: 'Open',
      go: () => onNavigate('/applications'),
    },
  ].filter(Boolean) as any[];

  const StatCard = ({ label, value, sub, icon: Icon, tint, accent, onClick }: any) => (
    <button
      type="button" onClick={onClick} disabled={!onClick}
      className={`rounded-xl border bg-gradient-to-br p-4 text-left transition ${tint} ${onClick ? 'hover:brightness-125' : 'cursor-default'}`}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">{label}</span>
        <Icon className={`h-4 w-4 ${accent}`} />
      </div>
      <div className={`mt-2 text-2xl font-bold tabular-nums ${accent}`}>{value}</div>
      {sub && <div className="mt-0.5 text-xs text-gray-500">{sub}</div>}
    </button>
  );

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      {/* ── Header, in the portals' language ───────────────────────────────
          Same gradient wash and gradient-text heading the customer, vendor and
          landlord portals already use, so this stops looking like a different
          application from the one it sits inside. */}
      <div className="border-b border-[#2A2A2A] bg-gradient-to-br from-[#1A1A1A] via-[#0A0A0A] to-[#0A0A0A]">
        <div className="mx-auto max-w-[1600px] px-6 py-6">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              {companyLogo
                ? <img src={companyLogo} alt={companyName} className="h-11 w-11 shrink-0 rounded-xl object-contain" />
                : <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-orange-600 to-orange-700 text-lg font-black">
                    {companyName.slice(0, 1).toUpperCase()}
                  </div>}
              <div className="min-w-0">
                <h1 className="truncate bg-gradient-to-r from-orange-400 via-orange-300 to-orange-500 bg-clip-text text-3xl font-bold text-transparent">
                  {companyName}
                </h1>
                <p className="text-sm text-gray-400">
                  Command Center · {allModules.length} tools
                </p>
              </div>
            </div>

            <div className="relative min-w-[18rem] flex-1 sm:max-w-md">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
              <input
                id="cc-search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search every tool…  ( / )"
                // Inline, because globals.css sets `padding: 0.75rem 1rem` on
                // every input outside any @layer, and an unlayered rule beats a
                // layered utility — so `pl-10` loses and the magnifier sits on
                // top of the placeholder.
                style={{ paddingLeft: '2.5rem', paddingRight: '2.25rem' }}
                className="w-full rounded-lg border border-[#2A2A2A] bg-[#0A0A0A] py-2.5 text-sm text-white placeholder:text-gray-600 focus:border-orange-500/50 focus:outline-none"
              />
              {query && (
                <button
                  type="button" onClick={() => setQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-gray-500 hover:text-white"
                  aria-label="Clear search"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {/* ── Needs you now ──────────────────────────────────────────────
              The reason to open this screen. Queues with somebody at the other
              end of them, and nothing shown that is empty. */}
          {metricsError ? (
            <div className="flex items-start gap-3 rounded-xl border border-yellow-500/30 bg-gradient-to-br from-yellow-600/10 to-yellow-700/5 p-4">
              <WifiOff className="mt-0.5 h-5 w-5 shrink-0 text-yellow-400" />
              <div>
                <p className="font-semibold text-yellow-200">The numbers could not be loaded</p>
                <p className="mt-0.5 text-sm text-gray-400">
                  {metricsError} The figures below are not zero because your business is —
                  they are zero because nothing arrived. It retries every minute.
                </p>
              </div>
            </div>
          ) : actions.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {actions.map((a) => (
                <button
                  key={a.key} type="button" onClick={a.go}
                  className={`rounded-xl border bg-gradient-to-br p-4 text-left transition hover:brightness-125 ${a.tint}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-baseline gap-2">
                        <span className={`text-2xl font-bold tabular-nums ${a.accent}`}>{a.value}</span>
                        <span className="truncate text-sm font-semibold text-gray-200">{a.label}</span>
                      </div>
                      {a.detail && <p className="mt-1 truncate text-xs text-gray-400">{a.detail}</p>}
                    </div>
                    <a.icon className={`h-5 w-5 shrink-0 ${a.accent}`} />
                  </div>
                  <span className={`mt-3 inline-flex items-center gap-1 text-xs font-bold ${a.accent}`}>
                    {a.cta} <ArrowRight className="h-3 w-3" />
                  </span>
                </button>
              ))}
            </div>
          ) : invoicesLoading ? (
            <div className="flex items-center gap-2 rounded-xl border border-[#2A2A2A] bg-[#0F0F0F] p-4 text-sm text-gray-500">
              <Loader2 className="h-4 w-4 animate-spin" /> Checking what needs attention…
            </div>
          ) : (
            <div className="flex items-center gap-3 rounded-xl border border-green-500/25 bg-gradient-to-br from-green-600/10 to-green-700/5 p-4">
              <CheckCircle2 className="h-5 w-5 shrink-0 text-green-400" />
              <div>
                <p className="font-semibold text-green-200">Nothing is waiting on you</p>
                <p className="text-sm text-gray-400">
                  No overdue invoices, no unanswered work requests, no applications pending.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      <main className="mx-auto max-w-[1600px] px-6 py-6">
        {/* ── The numbers ──────────────────────────────────────────────────
            Tinted like the portals' cards rather than flat grey boxes. */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <StatCard label="Revenue" value={money(summary.totalRevenue)} sub="collected, last 6 months"
            icon={DollarSign} tint="from-green-600/10 to-green-700/5 border-green-500/25" accent="text-green-400" />
          <StatCard label="Owed to you" value={money(summary.openInvoiceTotal)} sub="unpaid invoices"
            icon={FileWarning} tint="from-sky-600/10 to-sky-700/5 border-sky-500/25" accent="text-sky-400"
            onClick={() => onNavigate('/invoices-new')} />
          <StatCard label="Overdue" value={invoicesLoading ? '—' : money(overdueTotal)}
            sub={invoicesLoading ? 'checking…' : overdue.length ? `${overdue.length} past due` : 'nothing past due'}
            icon={AlertTriangle}
            tint={overdueTotal > 0 ? 'from-red-600/10 to-red-700/5 border-red-500/25' : 'from-[#141414] to-[#141414] border-[#2A2A2A]'}
            accent={overdueTotal > 0 ? 'text-red-400' : 'text-gray-400'}
            onClick={() => onNavigate('/invoices-new')} />
          <StatCard label="Active jobs" value={String(summary.activeJobsCount)} sub="in progress"
            icon={Briefcase} tint="from-orange-600/10 to-orange-700/5 border-orange-500/25" accent="text-orange-400"
            onClick={() => onNavigate('/job-tracking-hub', 'active-jobs')} />
          <StatCard label="Customers" value={String(summary.customersCount)} sub="on file"
            icon={Users} tint="from-purple-600/10 to-purple-700/5 border-purple-500/25" accent="text-purple-400"
            onClick={() => onNavigate('/unified-crm')} />
          <StatCard label="Crew" value={String(summary.teamCount)} sub="active"
            icon={HardHat} tint="from-blue-600/10 to-blue-700/5 border-blue-500/25" accent="text-blue-400" />
        </div>

        {/* ── Revenue and the money to chase ─────────────────────────────── */}
        <div className="mt-6 grid gap-4 xl:grid-cols-[1.1fr_1fr]">
          <section className="rounded-xl border border-[#2A2A2A] bg-[#141414] p-5">
            <h2 className="mb-1 flex items-center gap-2 font-bold">
              <TrendingUp className="h-4 w-4 text-orange-400" /> Revenue
            </h2>
            <p className="mb-4 text-sm text-gray-500">Collected payments, by month</p>
            {chart.length === 0 || chartPeak === 0 ? (
              <p className="py-10 text-center text-sm text-gray-500">
                No payments recorded yet. This fills in as invoices are paid.
              </p>
            ) : (
              <div className="space-y-2.5">
                {chart.map((d) => (
                  <div key={d.month}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="text-gray-400">{d.month}</span>
                      <span className="tabular-nums text-gray-300">{money(d.revenue)}</span>
                    </div>
                    <div className="h-2.5 overflow-hidden rounded-full bg-[#0A0A0A]">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-orange-600 to-orange-400"
                        style={{ width: `${((Number(d.revenue) || 0) / chartPeak) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-xl border border-[#2A2A2A] bg-[#141414] p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="flex items-center gap-2 font-bold">
                  <AlertTriangle className={`h-4 w-4 ${overdueTotal > 0 ? 'text-red-400' : 'text-gray-500'}`} />
                  Still delinquent
                </h2>
                <p className="mt-0.5 text-sm text-gray-500">Past their due date, oldest first</p>
              </div>
              {overdueTotal > 0 && (
                <span className="rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1 text-sm font-bold tabular-nums text-red-300">
                  {money(overdueTotal)}
                </span>
              )}
            </div>

            {invoicesLoading ? (
              <div className="flex items-center justify-center gap-2 py-10 text-sm text-gray-500">
                <Loader2 className="h-4 w-4 animate-spin" /> Checking invoices…
              </div>
            ) : invoiceError ? (
              <p className="py-8 text-center text-sm text-red-300">{invoiceError}</p>
            ) : overdue.length === 0 ? (
              <p className="py-10 text-center text-sm text-gray-500">
                {invoices.length === 0
                  ? 'No invoices on file yet.'
                  : 'Nothing is past due. Everything owed is still within its terms.'}
              </p>
            ) : (
              <div className="divide-y divide-[#2A2A2A]">
                {overdue.slice(0, 7).map((o) => (
                  <button
                    key={o.id || o.number} type="button"
                    onClick={() => onNavigate('/invoices-new')}
                    className="flex w-full items-center justify-between gap-3 py-3 text-left transition hover:opacity-80"
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-semibold">{o.customer}</span>
                      <span className="block text-xs text-gray-500">
                        {o.number ? `${o.number} · ` : ''}
                        <span className={o.daysLate >= 60 ? 'text-red-400' : o.daysLate >= 30 ? 'text-yellow-400' : ''}>
                          {o.daysLate} day{o.daysLate === 1 ? '' : 's'} late
                        </span>
                      </span>
                    </span>
                    <span className="shrink-0 font-bold tabular-nums text-white">{money(o.balance)}</span>
                  </button>
                ))}
                {overdue.length > 7 && (
                  <button
                    type="button" onClick={() => onNavigate('/invoices-new')}
                    className="flex w-full items-center justify-between py-3 text-sm font-semibold text-orange-400"
                  >
                    {overdue.length - 7} more overdue <ChevronRight className="h-4 w-4" />
                  </button>
                )}
              </div>
            )}
          </section>
        </div>

        {/* ── Every day ──────────────────────────────────────────────────── */}
        {!q && pinned.length > 0 && (
          <section className="mt-8">
            <h2 className="mb-3 flex items-center gap-2 font-bold">
              <Pin className="h-4 w-4 fill-current text-orange-400" /> Every day
            </h2>
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-8">
              {pinned.map((m) => (
                <div key={m.label} className="group relative">
                  <button
                    type="button" onClick={() => go(m)}
                    className="flex w-full flex-col items-start gap-2 rounded-xl border border-orange-500/25 bg-gradient-to-br from-orange-600/10 to-orange-700/5 p-3 text-left transition hover:border-orange-500/50 hover:brightness-125"
                  >
                    <m.icon className="h-5 w-5 text-orange-400" />
                    <span className="line-clamp-2 text-sm font-semibold leading-tight">{m.label}</span>
                  </button>
                  <button
                    type="button" onClick={() => togglePin(m.label)} title="Unpin"
                    className="absolute right-1.5 top-1.5 rounded p-1 text-gray-600 opacity-0 transition group-hover:opacity-100 hover:text-orange-400"
                  >
                    <PinOff className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Everything, on the page ─────────────────────────────────────
            The fix for the actual complaint. No drawer: every tool is here,
            grouped by area, and searching filters in place rather than opening
            something over the top. */}
        {q && (
          <p className="mt-8 text-sm text-gray-500">
            {matchCount === 0
              ? `Nothing matches “${query}”.`
              : `${matchCount} tool${matchCount === 1 ? '' : 's'} match “${query}”.`}
          </p>
        )}

        {visibleCategories.map((cat) => (
          <section key={cat.id} className="mt-8">
            <h2 className="mb-3 flex items-center gap-2 font-bold">
              <cat.icon className="h-4 w-4 text-orange-400" />
              {cat.label}
              <span className="rounded-full border border-[#2A2A2A] bg-[#141414] px-2 py-0.5 text-xs font-normal text-gray-500">
                {cat.modules.length}
              </span>
            </h2>
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
              {cat.modules.map((m) => {
                const isPinned = pins.includes(m.label);
                return (
                  <div key={m.label + m.path} className="group relative">
                    <button
                      type="button" onClick={() => go(m)}
                      className="flex h-full w-full flex-col items-start gap-2 rounded-xl border border-[#2A2A2A] bg-[#141414] p-3 text-left transition hover:border-orange-500/40 hover:bg-[#181818]"
                    >
                      <m.icon className="h-5 w-5 shrink-0 text-orange-400" />
                      <span className="line-clamp-2 text-sm font-semibold leading-tight">{m.label}</span>
                      {m.description && (
                        <span className="line-clamp-2 text-xs leading-snug text-gray-500">{m.description}</span>
                      )}
                    </button>
                    <button
                      type="button" onClick={() => togglePin(m.label)}
                      title={isPinned ? 'Unpin from Every day' : 'Pin to Every day'}
                      className={`absolute right-1.5 top-1.5 rounded p-1 transition ${
                        isPinned ? 'text-orange-400' : 'text-gray-700 opacity-0 group-hover:opacity-100 hover:text-orange-400'
                      }`}
                    >
                      <Pin className={`h-3.5 w-3.5 ${isPinned ? 'fill-current' : ''}`} />
                    </button>
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </main>
    </div>
  );
}
