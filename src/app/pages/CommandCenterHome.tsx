/**
 * CommandCenterHome — the desktop command center, rebuilt.
 *
 * WHAT WAS WRONG WITH THE OLD ONE
 *
 * 91 modules across 9 categories, reached through three navigation systems at
 * once: a left sidebar, a nine-tab bar, and a search box that only filtered
 * inside whichever tab you were already standing on. That last part is the
 * heart of it — the one tool that should make 91 destinations tractable could
 * not see past the bucket you had already guessed.
 *
 * WHAT THIS IS INSTEAD
 *
 * A dashboard rather than a launcher. Eric's brief: the things he needs every
 * day on the main page, analytics, invoices still delinquent, and everything
 * else behind a drawer.
 *
 *   1. The numbers, from the real command-center summary
 *   2. Money that needs chasing — overdue invoices, named, with days late
 *   3. Revenue over six months
 *   4. The handful of tools opened daily, which he can change
 *   5. All 91, in a drawer, searchable across every category at once
 *
 * NOTHING HERE IS INVENTED
 *
 * Every figure comes from `/command-center/summary` or `/invoices`. Both are
 * existing endpoints, so this needs no deploy. Where a number is zero it is
 * zero because that is what the data says, and the empty states say so rather
 * than showing a placeholder.
 */
import { useEffect, useMemo, useState } from 'react';
import {
  Search, X, LayoutGrid, TrendingUp, AlertTriangle, DollarSign, Briefcase,
  Users, HardHat, FileWarning, Pin, PinOff, ArrowRight, Loader2, ChevronRight,
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
  onNavigate: (path: string, tab?: string) => void;
  summary: {
    totalRevenue: number;
    openInvoiceTotal?: number;
    activeJobsCount: number;
    customersCount: number;
    teamCount: number;
    pendingWorkRequests?: number;
    chartData?: { month: string; revenue: number }[];
  };
}

/**
 * What a renovation contractor opens most days. Only a starting point — every
 * card carries a pin, and the choice is stored per browser. Chosen from the
 * real module list rather than invented, so each one goes somewhere.
 */
const DEFAULT_PINS = [
  'Active Jobs', 'Work Request Intake', 'Master Schedule', 'Bid Room',
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
  tabCategories, companyName, onNavigate, summary,
}: CommandCenterHomeProps) {
  const [query, setQuery] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [invoicesLoading, setInvoicesLoading] = useState(true);
  const [invoiceError, setInvoiceError] = useState('');
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

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) { setInvoicesLoading(false); return; }
        const res = await fetch(`${SERVER}/invoices`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (!res.ok || data?.success === false) throw new Error(data?.error || `HTTP ${res.status}`);
        setInvoices(Array.isArray(data?.invoices) ? data.invoices : []);
      } catch (e: any) {
        if (!cancelled) setInvoiceError(e?.message || 'Could not load invoices.');
      } finally {
        if (!cancelled) setInvoicesLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

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

  // Search reaches every module in every category — the thing the old screen
  // could not do.
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return allModules.filter((m) =>
      m.label.toLowerCase().includes(q) ||
      (m.description || '').toLowerCase().includes(q) ||
      (m as any).category.toLowerCase().includes(q),
    ).slice(0, 40);
  }, [query, allModules]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === 'k' && (e.metaKey || e.ctrlKey)) || (e.key === '/' && !/input|textarea/i.test((e.target as HTMLElement)?.tagName || ''))) {
        e.preventDefault();
        (document.getElementById('cc-search') as HTMLInputElement)?.focus();
      }
      if (e.key === 'Escape') { setQuery(''); setDrawerOpen(false); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const chart = summary.chartData || [];
  const chartPeak = chart.reduce((m, d) => Math.max(m, Number(d.revenue) || 0), 0);

  const go = (m: any) => { setDrawerOpen(false); setQuery(''); onNavigate(m.path, m.tab); };

  const Stat = ({ label, value, sub, icon: Icon, tone = 'default', onClick }: any) => {
    const tones: Record<string, string> = {
      default: 'text-white',
      alert: 'text-red-400',
      good: 'text-green-400',
      warn: 'text-yellow-400',
    };
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={!onClick}
        className={`rounded-xl border border-[#2A2A2A] bg-[#141414] p-4 text-left transition ${onClick ? 'hover:border-orange-500/40' : 'cursor-default'}`}
      >
        <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
          <Icon className="h-3.5 w-3.5" /> {label}
        </span>
        <span className={`mt-2 block text-2xl font-bold tabular-nums ${tones[tone]}`}>{value}</span>
        {sub && <span className="mt-0.5 block text-xs text-gray-500">{sub}</span>}
      </button>
    );
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      {/* ── Header: search first, everything else behind one button ───────── */}
      <header className="sticky top-0 z-30 border-b border-[#2A2A2A] bg-[#0F0F0F]/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center gap-3 px-6 py-3">
          <div className="min-w-0">
            <h1 className="truncate text-lg font-bold">{companyName}</h1>
            <p className="text-xs text-gray-500">Command Center</p>
          </div>

          <div className="relative min-w-[16rem] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
            <input
              id="cc-search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search all tools…  ( / )"
              // Inline, because globals.css sets `padding: 0.75rem 1rem` on
              // every input outside any @layer, and an unlayered rule beats a
              // layered utility — so `pl-10` loses and the magnifier sits on
              // top of the placeholder. Same cascade trap as the reset, in a
              // different disguise.
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

          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg border border-[#2A2A2A] bg-[#141414] px-4 py-2.5 text-sm font-semibold text-gray-200 transition hover:border-orange-500/40"
          >
            <LayoutGrid className="h-4 w-4" /> All tools
            <span className="rounded bg-[#0A0A0A] px-1.5 py-0.5 text-xs text-gray-500">{allModules.length}</span>
          </button>
        </div>

        {/* Results drop straight under the box, across every category. */}
        {query && (
          <div className="border-t border-[#2A2A2A] bg-[#0F0F0F]">
            <div className="mx-auto max-w-[1600px] px-6 py-3">
              {results.length === 0 ? (
                <p className="py-4 text-sm text-gray-500">Nothing matches “{query}”.</p>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {results.map((m) => (
                    <button
                      key={m.label + m.path} type="button" onClick={() => go(m)}
                      className="flex items-center gap-3 rounded-lg border border-[#2A2A2A] bg-[#141414] p-3 text-left transition hover:border-orange-500/40"
                    >
                      <m.icon className="h-4 w-4 shrink-0 text-orange-400" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold">{m.label}</span>
                        <span className="block truncate text-xs text-gray-500">{(m as any).category}</span>
                      </span>
                      <ArrowRight className="h-4 w-4 shrink-0 text-gray-600" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </header>

      <main className="mx-auto max-w-[1600px] px-6 py-6">
        {/* ── The numbers ─────────────────────────────────────────────────── */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <Stat label="Revenue" value={money(summary.totalRevenue)} sub="collected, last 6 months" icon={DollarSign} tone="good" />
          <Stat label="Owed to you" value={money(summary.openInvoiceTotal)} sub="unpaid invoices" icon={FileWarning} />
          <Stat
            label="Overdue" value={invoicesLoading ? '—' : money(overdueTotal)}
            sub={invoicesLoading ? 'checking…' : overdue.length ? `${overdue.length} invoice${overdue.length === 1 ? '' : 's'} past due` : 'nothing past due'}
            icon={AlertTriangle} tone={overdueTotal > 0 ? 'alert' : 'good'}
            onClick={() => onNavigate('/invoices-new')}
          />
          <Stat label="Active jobs" value={String(summary.activeJobsCount)} sub={summary.pendingWorkRequests ? `${summary.pendingWorkRequests} awaiting approval` : 'in progress'} icon={Briefcase} onClick={() => onNavigate('/job-tracking-hub', 'active-jobs')} />
          <Stat label="Customers" value={String(summary.customersCount)} sub="on file" icon={Users} onClick={() => onNavigate('/unified-crm')} />
          <Stat label="Crew" value={String(summary.teamCount)} sub="active" icon={HardHat} />
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-[1.1fr_1fr]">
          {/* ── Revenue ───────────────────────────────────────────────────── */}
          <section className="rounded-xl border border-[#2A2A2A] bg-[#141414] p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="flex items-center gap-2 font-bold"><TrendingUp className="h-4 w-4 text-orange-400" /> Revenue</h2>
                <p className="mt-0.5 text-sm text-gray-500">Collected payments, by month</p>
              </div>
            </div>
            {chart.length === 0 || chartPeak === 0 ? (
              <p className="py-10 text-center text-sm text-gray-500">
                No payments recorded yet. This fills in as invoices are paid.
              </p>
            ) : (
              <div className="space-y-2">
                {chart.map((d) => (
                  <div key={d.month}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="text-gray-400">{d.month}</span>
                      <span className="tabular-nums text-gray-300">{money(d.revenue)}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-[#0A0A0A]">
                      <div className="h-full rounded-full bg-orange-500" style={{ width: `${((Number(d.revenue) || 0) / chartPeak) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* ── Money to chase ────────────────────────────────────────────── */}
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
                <span className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-sm font-bold tabular-nums text-red-300">
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

        {/* ── Every day ─────────────────────────────────────────────────── */}
        <section className="mt-6">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-bold">Every day</h2>
              <p className="mt-0.5 text-sm text-gray-500">
                Pin anything from All tools to put it here.
              </p>
            </div>
          </div>
          {pinned.length === 0 ? (
            <div className="rounded-xl border border-[#2A2A2A] bg-[#141414] p-8 text-center text-sm text-gray-500">
              Nothing pinned. Open All tools and pin the things you use most.
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {pinned.map((m) => (
                <div key={m.label} className="group relative">
                  <button
                    type="button" onClick={() => go(m)}
                    className="w-full rounded-xl border border-[#2A2A2A] bg-[#141414] p-4 text-left transition hover:border-orange-500/50"
                  >
                    <m.icon className="mb-2 h-5 w-5 text-orange-400" />
                    <span className="block font-semibold">{m.label}</span>
                    {m.description && <span className="mt-0.5 block text-xs text-gray-500 line-clamp-2">{m.description}</span>}
                  </button>
                  <button
                    type="button" onClick={() => togglePin(m.label)}
                    title="Unpin"
                    className="absolute right-2 top-2 rounded p-1.5 text-gray-600 opacity-0 transition group-hover:opacity-100 hover:text-orange-400"
                  >
                    <PinOff className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      {/* ── Everything else ───────────────────────────────────────────────── */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60" onClick={() => setDrawerOpen(false)}>
          <div
            className="h-full w-full max-w-2xl overflow-y-auto border-l border-[#2A2A2A] bg-[#0F0F0F] p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold">All tools</h2>
                <p className="text-sm text-gray-500">{allModules.length} across {tabCategories.length} areas</p>
              </div>
              <button
                type="button" onClick={() => setDrawerOpen(false)}
                className="rounded-lg border border-[#2A2A2A] p-2 text-gray-400 hover:text-white"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {tabCategories.map((cat) => (
              <div key={cat.id} className="mb-6">
                <h3 className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-500">
                  <cat.icon className="h-3.5 w-3.5" /> {cat.label}
                  <span className="text-gray-600">{cat.modules.length}</span>
                </h3>
                <div className="grid gap-2 sm:grid-cols-2">
                  {cat.modules.map((m) => {
                    const isPinned = pins.includes(m.label);
                    return (
                      <div key={m.label + m.path} className="flex items-center gap-1 rounded-lg border border-[#2A2A2A] bg-[#141414] pr-1">
                        <button
                          type="button" onClick={() => go(m)}
                          className="flex min-w-0 flex-1 items-center gap-2.5 p-3 text-left"
                        >
                          <m.icon className="h-4 w-4 shrink-0 text-orange-400" />
                          <span className="min-w-0 truncate text-sm font-medium">{m.label}</span>
                        </button>
                        <button
                          type="button" onClick={() => togglePin(m.label)}
                          title={isPinned ? 'Unpin from Every day' : 'Pin to Every day'}
                          className={`rounded p-2 transition ${isPinned ? 'text-orange-400' : 'text-gray-600 hover:text-gray-300'}`}
                        >
                          {isPinned ? <Pin className="h-3.5 w-3.5 fill-current" /> : <Pin className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
