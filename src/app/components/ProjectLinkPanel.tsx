/**
 * ProjectLinkPanel — who this design belongs to, and where its paperwork goes.
 *
 * Until now a design knew an address and nothing else. It was not attached to a
 * customer, not attached to a job, and the documents it produced — permit
 * packets, calculation sheets, renders — were browser downloads that ended up
 * in whoever's Downloads folder generated them. The one place they were
 * guaranteed not to be was with the customer they belonged to.
 *
 * So this panel does two things and stays out of the way otherwise: pick the
 * customer, and show their folder. Once a customer is picked, their work
 * requests, quotes and invoices are listed alongside — not because the designer
 * needs to act on them, but because seeing that a quote already exists for this
 * job is what stops a second one being written.
 *
 * Filing is explicit. Nothing is uploaded to a customer's folder without
 * someone pressing a button, because a document filed against the wrong
 * customer is worse than one that was never filed.
 */
import { useCallback, useEffect, useState } from 'react';
import {
  Users, Loader2, FolderOpen, FileText, Upload, ExternalLink, Trash2,
  Receipt, ClipboardList, Info, Link2,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../lib/supabase';
import { projectId, publicAnonKey } from '../utils/supabase/info';

const SERVER = `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6`;

async function headers() {
  const { data: { session } } = await supabase.auth.getSession();
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${session?.access_token || publicAnonKey}`,
    apikey: publicAnonKey,
  };
}

export interface DesignLink {
  customerId: string;
  customerName: string;
  jobId: string;
  /**
   * The job's readable title, kept beside its id for the same reason
   * customerName is kept beside customerId: an id identifies a job to the
   * server and tells a person nothing. The workspace indicator has to name the
   * job on screens that never loaded the customer's job list, and it cannot go
   * looking one up from a bare id.
   */
  jobTitle?: string;
  /**
   * The address on the job, carried across so it need not be retyped.
   *
   * It travels with the link rather than being looked up later because the
   * address is not administrative detail here — it decides snow load, frost
   * depth and which code edition applies, so a design attached to a job and a
   * design carrying that job's address are the same claim and should not be
   * able to drift apart.
   */
  jobAddress?: string;
  /**
   * The customer's email, carried because a quote is invisible without it.
   *
   * `ownsQuote` on the server matches a quote to a customer on clientEmail,
   * customerEmail, customerId, userId or createdBy. A quote written with a
   * customer id alone would sit in the pipeline looking perfectly fine and
   * never appear in that customer's portal, with nothing to indicate why. So
   * the email travels with the link and a quote is refused without it.
   */
  customerEmail?: string;
}

interface Props {
  /** The saved design, if there is one. Filing needs something to attach to. */
  designId: string | null;
  link: DesignLink;
  onLink: (next: DesignLink) => void;
  /**
   * Hands the parent a filing function, so a permit packet or a render can be
   * sent to the customer's folder from wherever it is generated rather than
   * only from here.
   */
  onFilerReady?: (file: (label: string, category: string, dataUri: string, shared?: boolean) => Promise<boolean>) => void;
}

export default function ProjectLinkPanel({ designId, link, onLink, onFilerReady }: Props) {
  const [customers, setCustomers] = useState<any[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [context, setContext] = useState<any>(null);
  const [loadingContext, setLoadingContext] = useState(false);
  const [busy, setBusy] = useState(false);
  const [denied, setDenied] = useState(false);

  useEffect(() => {
    let live = true;
    (async () => {
      setLoadingCustomers(true);
      try {
        const res = await fetch(`${SERVER}/customers`, { headers: await headers() });
        const json = await res.json().catch(() => null);
        if (!live) return;
        if (res.status === 403) { setDenied(true); return; }
        if (json?.success && Array.isArray(json.customers)) setCustomers(json.customers);
      } catch {
        // A failed customer list should not block designing.
      } finally {
        if (live) setLoadingCustomers(false);
      }
    })();
    return () => { live = false; };
  }, []);

  const loadContext = useCallback(async (customerId: string) => {
    if (!customerId) { setContext(null); return; }
    setLoadingContext(true);
    try {
      const res = await fetch(`${SERVER}/design-links/context?customerId=${encodeURIComponent(customerId)}`,
        { headers: await headers() });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Could not load that customer.');
      setContext(json);
    } catch (err: any) {
      toast.error(err?.message || 'Could not load that customer.');
      setContext(null);
    } finally {
      setLoadingContext(false);
    }
  }, []);

  useEffect(() => { loadContext(link.customerId); }, [link.customerId, loadContext]);

  /**
   * Fill in a job we only know the id of.
   *
   * Two ways that happens: a design saved before the address was carried on the
   * link, and a design opened straight from the pipeline, which knows the ids
   * and not the wording. Rather than making either caller look the details up,
   * they are completed here once the customer's records arrive.
   *
   * Guarded on an actual difference — calling `onLink` unconditionally after
   * every context load would re-render the designer forever.
   */
  useEffect(() => {
    if (!link.jobId || !context?.requests) return;
    const job = context.requests.find((r: any) => String(r.id) === String(link.jobId));
    if (!job) return;
    const title = String(job.title || '');
    const address = String(job.address || '').trim();
    if (link.jobTitle === title && (link.jobAddress || '') === address) return;
    onLink({ ...link, jobTitle: title, jobAddress: address });
  }, [context, link, onLink]);

  const attach = useCallback(async (customerId: string, jobId: string) => {
    const c = customers.find(x => String(x.id) === customerId);
    const job = (context?.requests || []).find((r: any) => String(r.id) === jobId);
    onLink({
      customerId,
      customerName: c?.name || c?.email || '',
      jobId,
      jobTitle: job?.title || '',
      // The job's address if it has one, otherwise the customer's. A work
      // request is raised against a property and the customer's record is where
      // they live, and for a landlord or a property manager those are routinely
      // different places — so the job wins whenever it says anything.
      jobAddress: String(job?.address || c?.address || '').trim(),
      customerEmail: String(c?.email || '').trim(),
    });

    // Only persist once the design exists — a link on an unsaved design has
    // nothing to hang from, and the save carries it anyway.
    if (!designId || !customerId) return;
    try {
      const res = await fetch(`${SERVER}/design-links/attach`, {
        method: 'POST',
        headers: await headers(),
        body: JSON.stringify({ designId, ownerKey: 'decks', customerId, jobId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Could not attach.');
      toast.success(`Linked to ${c?.name || 'customer'}.`);
    } catch (err: any) {
      toast.error(err?.message || 'Could not attach this design.');
    }
  }, [customers, designId, onLink]);

  /**
   * File a document into a customer's folder, and optionally show it to them.
   *
   * Filing and sharing are separate on purpose. A cost breakdown or a
   * half-finished drawing belongs in the folder without belonging in front of
   * the customer, so `shared` is asked for rather than assumed — the server
   * defaults it to false and only returns shared documents to the portal.
   */
  const fileDocument = useCallback(async (
    label: string,
    category: string,
    dataUri: string,
    shared = false,
  ) => {
    if (!link.customerId) { toast.error('Pick a customer before filing a document.'); return false; }
    setBusy(true);
    try {
      const res = await fetch(`${SERVER}/design-links/files`, {
        method: 'POST',
        headers: await headers(),
        body: JSON.stringify({
          customerId: link.customerId, jobId: link.jobId, designId: designId || '',
          label, category, dataUri, sharedWithCustomer: shared,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Could not file that document.');
      toast.success(shared ? `Sent “${label}” to the customer.` : `Filed “${label}”.`);
      loadContext(link.customerId);
      return true;
    } catch (err: any) {
      toast.error(err?.message || 'Could not file that document.');
      return false;
    } finally {
      setBusy(false);
    }
  }, [link, designId, loadContext]);

  useEffect(() => { onFilerReady?.(fileDocument); }, [fileDocument, onFilerReady]);

  const upload = useCallback(async (files: FileList | null) => {
    const f = files?.[0];
    if (!f) return;
    const dataUri: string = await new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result));
      r.onerror = () => reject(new Error('That file could not be read.'));
      r.readAsDataURL(f);
    });
    await fileDocument(f.name, 'upload', dataUri);
  }, [fileDocument]);

  const open = useCallback(async (id: string) => {
    try {
      const res = await fetch(`${SERVER}/design-links/files/${id}/url`, { headers: await headers() });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Could not open that document.');
      window.open(json.url, '_blank', 'noopener');
    } catch (err: any) {
      toast.error(err?.message || 'Could not open that document.');
    }
  }, []);

  const remove = useCallback(async (id: string, label: string) => {
    if (!confirm(`Remove “${label}” from this customer's folder?`)) return;
    try {
      const res = await fetch(`${SERVER}/design-links/files/${id}`, {
        method: 'DELETE', headers: await headers(),
      });
      if (!res.ok) throw new Error('Could not remove that document.');
      toast.success('Removed.');
      loadContext(link.customerId);
    } catch (err: any) {
      toast.error(err?.message || 'Could not remove that document.');
    }
  }, [link.customerId, loadContext]);

  const card = 'rounded-2xl border border-[#2A2A2A] bg-[#111] p-4';
  const field = 'w-full px-3 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white text-sm focus:outline-none focus:border-[#ea580c]';

  if (denied) {
    return (
      <div className={card}>
        <h2 className="text-sm font-bold text-white flex items-center gap-2 mb-1">
          <Link2 className="w-4 h-4 text-[#ea580c]" /> Customer
        </h2>
        <p className="flex items-start gap-2 text-xs text-gray-500">
          <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          Linking a design to a customer needs an internal account. Designs still save and print
          normally without it.
        </p>
      </div>
    );
  }

  return (
    <div className={card}>
      <h2 className="text-sm font-bold text-white flex items-center gap-2 mb-1">
        <Link2 className="w-4 h-4 text-[#ea580c]" /> Customer &amp; job
      </h2>
      <p className="text-xs text-gray-500 mb-3">
        Attaches this design to the rest of the business — their requests, quotes and invoices, and
        a folder the paperwork actually lands in.
      </p>

      <div className="space-y-2 mb-3">
        <select className={field} value={link.customerId}
          onChange={e => attach(e.target.value, '')}
          disabled={loadingCustomers}>
          <option value="">
            {loadingCustomers ? 'Loading customers…' : 'Not linked to a customer'}
          </option>
          {customers.map(c => (
            <option key={c.id} value={c.id}>
              {c.name || c.email}{c.address ? ` — ${c.address}` : ''}
            </option>
          ))}
        </select>

        {link.customerId && (
          <select className={field} value={link.jobId}
            onChange={e => attach(link.customerId, e.target.value)}>
            <option value="">Not tied to a specific job</option>
            {(context?.requests || []).map((r: any) => (
              <option key={r.id} value={r.id}>
                {r.title}{r.address ? ` — ${r.address}` : ''}{r.status ? ` (${r.status})` : ''}
              </option>
            ))}
          </select>
        )}
      </div>

      {!designId && link.customerId && (
        <p className="flex items-start gap-2 text-xs text-yellow-400 mb-3">
          <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          Save the design and the link is written with it.
        </p>
      )}

      {loadingContext && (
        <p className="flex items-center gap-2 text-xs text-gray-500">
          <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading their records…
        </p>
      )}

      {context && (
        <div className="space-y-4">
          {/* What already exists for this customer. Read-only on purpose: this
              is here so a second quote does not get written for a job that
              already has one. */}
          <div className="grid grid-cols-3 gap-2">
            <Tally icon={ClipboardList} n={context.requests?.length || 0} label="requests" />
            <Tally icon={FileText} n={context.quotes?.length || 0} label="quotes" />
            <Tally icon={Receipt} n={context.invoices?.length || 0} label="invoices" />
          </div>

          {(context.quotes || []).length > 0 && (
            <div>
              <div className="text-[10px] uppercase tracking-wide text-gray-500 mb-1">Quotes &amp; estimates</div>
              {context.quotes.slice(0, 4).map((q: any) => (
                <div key={q.id} className="flex items-baseline justify-between gap-2 text-sm py-0.5">
                  <span className="text-gray-300 truncate">
                    {q.type === 'invoice' ? 'Invoice' : 'Estimate'} {q.number || q.id.slice(0, 6)}
                  </span>
                  <span className="text-gray-500 shrink-0">{q.status || '—'}</span>
                </div>
              ))}
            </div>
          )}

          {(context.designs || []).length > 1 && (
            <div>
              <div className="text-[10px] uppercase tracking-wide text-gray-500 mb-1">
                Their other designs
              </div>
              {context.designs.filter((d: any) => d.id !== designId).slice(0, 5).map((d: any) => (
                <div key={d.id} className="flex items-baseline justify-between gap-2 text-sm py-0.5">
                  <span className="text-gray-300 truncate">{d.name}</span>
                  <span className="text-gray-500 shrink-0">{d.kind}</span>
                </div>
              ))}
            </div>
          )}

          {/* The folder. */}
          <div>
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <div className="text-[10px] uppercase tracking-wide text-gray-500 flex items-center gap-1.5">
                <FolderOpen className="w-3.5 h-3.5" /> Their folder
              </div>
              <label className="text-xs text-[#ea580c] font-semibold cursor-pointer flex items-center gap-1">
                <Upload className="w-3.5 h-3.5" /> Add a file
                <input type="file" className="hidden" disabled={busy}
                  onChange={e => { upload(e.target.files); e.currentTarget.value = ''; }} />
              </label>
            </div>

            {(context.files || []).length === 0 ? (
              <p className="text-xs text-gray-600">
                Nothing filed yet. Permit packets, calculation sheets and renders can be filed here
                from the panels that produce them.
              </p>
            ) : (
              <div className="space-y-0.5">
                {context.files.map((f: any) => (
                  <div key={f.id} className="flex items-center gap-2 text-sm py-1 group">
                    <FileText className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                    <button onClick={() => open(f.id)}
                      className="text-gray-300 hover:text-white truncate text-left flex-1">
                      {f.label}
                    </button>
                    <span className="text-[10px] text-gray-600 shrink-0">{f.category}</span>
                    <button onClick={() => open(f.id)} className="text-gray-500 hover:text-white shrink-0"
                      aria-label={`Open ${f.label}`}>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => remove(f.id, f.label)}
                      className="text-gray-600 hover:text-red-400 shrink-0 opacity-0 group-hover:opacity-100 transition"
                      aria-label={`Remove ${f.label}`}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Tally({ icon: Icon, n, label }: { icon: any; n: number; label: string }) {
  return (
    <div className="rounded-xl border border-[#2A2A2A] bg-[#0A0A0A] px-2 py-2 text-center">
      <Icon className="w-3.5 h-3.5 text-[#ea580c] mx-auto mb-0.5" />
      <div className="text-lg font-bold text-white leading-none tabular-nums">{n}</div>
      <div className="text-[10px] text-gray-500">{label}</div>
    </div>
  );
}
