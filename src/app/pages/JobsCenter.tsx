/**
 * JobsCenter — one job, and everything that belongs to it.
 *
 * WHY THIS SCREEN EXISTS
 *
 * Until jobs existed there was no way to ask "show me everything for the Sutton
 * job". Documents pointed at whatever created them — a quote at its work
 * request, an invoice at its quote — which answers the question from the door
 * you came in through and from nowhere else. A purchase order raised from the
 * materials hub pointed at nothing at all.
 *
 * So this is the answer to the question rather than another place to create
 * things. Every document shown here is created somewhere it already belongs,
 * and this screen links out to those screens rather than reproducing them.
 *
 * WHAT IT DELIBERATELY DOES NOT DO
 *
 * It does not total anything up across documents. The quote owns its total and
 * the invoice owns its own; adding them together here would produce a third
 * number with no record behind it, and a figure on a screen that no document
 * agrees with is worse than no figure at all.
 */
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from '../hooks/useNavigate';
import {
  ChevronLeft, Search, Briefcase, FileText, Receipt, Package,
  PencilRuler, Loader2, RefreshCw, MapPin, User, ExternalLink,
} from 'lucide-react';
import { projectId } from '../utils/supabase/info';
import { authedHeaders } from '../utils/authHeaders';
import { toast } from 'sonner';

const SERVER = `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6`;

interface Job {
  id: string;
  jobNumber: string;
  customerName: string;
  customerEmail: string;
  siteAddress: string;
  title: string;
  serviceType: string;
  openedFrom: string;
  createdAt: string;
}

/** The five collections a job gathers, and how each one describes itself. */
const SECTIONS: Array<{
  key: string;
  label: string;
  icon: any;
  /** Where this kind of document is actually worked on. */
  page?: string;
  line: (d: any) => { title: string; meta: string; status?: string };
}> = [
  {
    key: 'workRequests',
    label: 'Work requests',
    icon: Briefcase,
    page: 'work-request-hub',
    line: (d) => ({
      title: d.title || d.project_name || d.id,
      meta: [d.client_name || d.clientName, d.serviceType || d.project_type]
        .filter(Boolean).join(' · '),
      status: d.status,
    }),
  },
  {
    key: 'quotes',
    label: 'Quotes',
    icon: FileText,
    page: 'quote-prep',
    line: (d) => ({
      title: d.quoteNumber || d.title || d.id,
      meta: money(d.total ?? d.totalAmount ?? d.total_amount),
      status: d.status,
    }),
  },
  {
    key: 'invoices',
    label: 'Invoices',
    icon: Receipt,
    page: 'invoice',
    line: (d) => ({
      title: d.invoice_number || d.invoice_id || d.id,
      meta: [money(d.total_amount), d.balance_due ? `${money(d.balance_due)} outstanding` : '']
        .filter(Boolean).join(' · '),
      status: d.status,
    }),
  },
  {
    key: 'purchaseOrders',
    label: 'Purchase orders',
    icon: Package,
    page: 'purchase-orders',
    line: (d) => ({
      title: `${d.poNumber || d.id}${d.supplier ? ` — ${d.supplier}` : ''}`,
      meta: [money(d.total), d.items ? `${d.items} line${d.items === 1 ? '' : 's'}` : '', d.fulfillment]
        .filter(Boolean).join(' · '),
      status: d.status,
    }),
  },
  {
    key: 'designProjects',
    label: 'Design projects',
    icon: PencilRuler,
    page: 'design-center',
    line: (d) => ({ title: d.name || d.title || d.id, meta: d.trade || '', status: d.status }),
  },
];

function money(v: any) {
  const n = Number(v);
  if (!Number.isFinite(n) || n === 0) return '';
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });
}

/**
 * Colour by meaning, not by collection.
 *
 * A draft purchase order and a draft quote are the same kind of fact — nothing
 * has left the building yet — and somebody scanning this page is looking for
 * what still needs doing rather than what kind of document it is.
 */
function statusTone(status?: string) {
  const s = String(status || '').toLowerCase();
  if (['paid', 'approved', 'completed', 'received', 'delivered', 'accepted'].includes(s)) {
    return 'bg-green-500/10 text-green-400 border-green-500/20';
  }
  if (['draft', 'pending', 'scheduled'].includes(s)) {
    return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
  }
  if (['sent', 'offered', 'in_progress', 'active'].includes(s)) {
    return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
  }
  if (['cancelled', 'void', 'rejected', 'declined'].includes(s)) {
    return 'bg-red-500/10 text-red-400 border-red-500/20';
  }
  return 'bg-white/5 text-gray-400 border-white/10';
}

export default function JobsCenter() {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Job | null>(null);
  const [documents, setDocuments] = useState<Record<string, any[]> | null>(null);
  const [loadingJob, setLoadingJob] = useState(false);

  const loadJobs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${SERVER}/jobs?q=${encodeURIComponent(query)}`, {
        headers: await authedHeaders(),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || `Could not load jobs (${res.status}).`);
      setJobs(Array.isArray(json.jobs) ? json.jobs : []);
    } catch (e: any) {
      toast.error(e?.message || 'Could not load jobs.');
      setJobs([]);
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => { void loadJobs(); }, [loadJobs]);

  const openJob = async (job: Job) => {
    setSelected(job);
    setDocuments(null);
    setLoadingJob(true);
    try {
      const res = await fetch(`${SERVER}/jobs/${encodeURIComponent(job.id)}`, {
        headers: await authedHeaders(),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || `Could not open the job (${res.status}).`);
      setDocuments(json.documents || {});
    } catch (e: any) {
      toast.error(e?.message || 'Could not open the job.');
      setDocuments({});
    } finally {
      setLoadingJob(false);
    }
  };

  const totalDocs = documents
    ? Object.values(documents).reduce((n, list) => n + (list?.length || 0), 0)
    : 0;

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      <div className="border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center gap-3">
          <button
            onClick={() => navigate('unified-dashboard')}
            className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-bold">Jobs</h1>
            <p className="text-xs text-gray-500">
              Every request, quote, invoice and purchase order that belongs to one piece of work.
            </p>
          </div>
          <button
            onClick={() => void loadJobs()}
            className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition"
            title="Reload"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6 grid gap-6 lg:grid-cols-[22rem_1fr]">
        {/* ── the list ───────────────────────────────────────────────── */}
        <div>
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Job number, customer, address…"
              className="w-full rounded-lg border border-white/10 bg-[#111] pl-9 pr-3 py-2 text-sm focus:border-orange-500 focus:outline-none"
            />
          </div>

          {loading ? (
            <p className="flex items-center gap-2 text-sm text-gray-400">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading…
            </p>
          ) : jobs.length === 0 ? (
            <div className="rounded-lg border border-white/10 bg-[#111] p-4 text-sm text-gray-400">
              {query
                ? 'No job matches that.'
                : 'No jobs yet. A job opens the first time a work request, quote, invoice or '
                  + 'purchase order is created — and everything written before jobs existed needs '
                  + 'the back-fill run before it appears here.'}
            </div>
          ) : (
            <div className="space-y-1.5 max-h-[70vh] overflow-y-auto pr-1">
              {jobs.map(job => (
                <button
                  key={job.id}
                  onClick={() => openJob(job)}
                  className={`w-full text-left rounded-lg border p-3 transition ${
                    selected?.id === job.id
                      ? 'border-orange-500/40 bg-orange-500/5'
                      : 'border-white/10 bg-[#111] hover:border-white/20'
                  }`}
                >
                  <p className="font-mono text-[11px] text-orange-400">{job.jobNumber}</p>
                  <p className="text-sm font-semibold truncate">{job.title || 'Untitled job'}</p>
                  <p className="text-[11px] text-gray-500 truncate">
                    {[job.customerName, job.siteAddress].filter(Boolean).join(' · ') || 'No details yet'}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── the job ────────────────────────────────────────────────── */}
        <div>
          {!selected ? (
            <div className="rounded-lg border border-white/10 bg-[#111] p-8 text-center text-sm text-gray-500">
              Pick a job to see everything attached to it.
            </div>
          ) : (
            <>
              <div className="rounded-lg border border-white/10 bg-[#111] p-4 mb-4">
                <p className="font-mono text-xs text-orange-400">{selected.jobNumber}</p>
                <h2 className="text-lg font-bold">{selected.title || 'Untitled job'}</h2>
                <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs text-gray-400">
                  {selected.customerName && (
                    <span className="inline-flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5" /> {selected.customerName}
                    </span>
                  )}
                  {selected.siteAddress && (
                    <span className="inline-flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5" /> {selected.siteAddress}
                    </span>
                  )}
                  <span>
                    Opened from {String(selected.openedFrom || 'manual').replace(/_/g, ' ')}
                    {selected.createdAt ? ` on ${selected.createdAt.slice(0, 10)}` : ''}
                  </span>
                </div>
              </div>

              {loadingJob ? (
                <p className="flex items-center gap-2 text-sm text-gray-400">
                  <Loader2 className="w-4 h-4 animate-spin" /> Gathering the documents…
                </p>
              ) : totalDocs === 0 ? (
                <div className="rounded-lg border border-white/10 bg-[#111] p-6 text-sm text-gray-400">
                  Nothing is attached to this job yet.
                </div>
              ) : (
                <div className="space-y-4">
                  {SECTIONS.map(section => {
                    const list = documents?.[section.key] || [];
                    if (list.length === 0) return null;
                    const Icon = section.icon;
                    return (
                      <div key={section.key} className="rounded-lg border border-white/10 bg-[#111]">
                        <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/10">
                          <p className="inline-flex items-center gap-2 text-sm font-semibold">
                            <Icon className="w-4 h-4 text-orange-400" />
                            {section.label}
                            <span className="text-xs font-normal text-gray-500">{list.length}</span>
                          </p>
                          {section.page && (
                            // Links out rather than editing here. Each document
                            // already has a screen that knows how to work on it.
                            //
                            // Purchase orders carry the job across, because that
                            // screen is where an order is actually sent to the
                            // vendor and arriving at every order in the company
                            // leaves you hunting for the three that were on the
                            // job you had open.
                            <button
                              onClick={() => navigate(
                                section.key === 'purchaseOrders'
                                  ? `${section.page}?job=${encodeURIComponent(selected.id)}`
                                    + `&jobNumber=${encodeURIComponent(selected.jobNumber || selected.id)}`
                                  : section.page!,
                              )}
                              className="inline-flex items-center gap-1 text-[11px] text-gray-400 hover:text-white transition"
                            >
                              Open <ExternalLink className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                        <div className="divide-y divide-white/5">
                          {list.map((d: any, i: number) => {
                            const { title, meta, status } = section.line(d);
                            return (
                              <div key={d.id || i} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5">
                                <div className="min-w-0">
                                  <p className="text-sm truncate">{title}</p>
                                  {meta && <p className="text-[11px] text-gray-500 truncate">{meta}</p>}
                                </div>
                                {status && (
                                  <span className={`shrink-0 rounded border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${statusTone(status)}`}>
                                    {status}
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
