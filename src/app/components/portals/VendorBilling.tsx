/**
 * VendorBilling — the vendor's Invoices, Payments and Performance tabs, and the
 * company side of the same ledger.
 *
 * All three used to be a card reading "...would be displayed here."
 *
 * ONE FILE FOR BOTH SIDES, ON PURPOSE
 *
 * A vendor and Black Phoenix look at the same invoices. Only the actions
 * differ: the vendor raises them, the company approves and pays them. Building
 * that twice would give two tables that drift apart on formatting, on what
 * counts as overdue, and eventually on the numbers themselves. So the tables
 * are shared and `mode` decides which actions are offered — the server enforces
 * the same split regardless of what this component renders.
 *
 * NOTHING HERE IS INVENTED
 *
 * An earlier pass had to strip fabricated figures out of this portal — $68,420
 * of revenue, eight pending invoices, a 4.8 supplier rating. Every number below
 * is counted from real purchase orders, real invoices and real payments, and
 * where a metric cannot honestly be computed yet the tab says so instead of
 * filling the space. On-time delivery is the clearest case: nothing timestamped
 * delivery until now, so it is reported only for orders that carry a delivery
 * date and is explicit about the fact that it starts from here.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FileText, DollarSign, Plus, AlertCircle, CheckCircle2, Clock, Package,
  TrendingUp, Ban, X, Loader2, Receipt, CalendarClock,
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { projectId } from '../../utils/supabase/info';

const API = `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6`;

const money = (n: unknown) =>
  `$${(Number(n) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const whole = (n: unknown) => `$${Math.round(Number(n) || 0).toLocaleString()}`;
const day = (s: unknown) => (s ? String(s).slice(0, 10) : '—');

export interface BillingProps {
  session: any;
  vendorId?: string | null;
  vendorLinked?: boolean | null;
  linkReason?: string;
  /** 'vendor' raises invoices; 'company' approves and pays them. */
  mode?: 'vendor' | 'company';
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared data
// ─────────────────────────────────────────────────────────────────────────────
function useBilling({ session, vendorId }: BillingProps) {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [billable, setBillable] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const headers = useMemo(
    () => ({ Authorization: `Bearer ${session?.access_token || ''}`, 'Content-Type': 'application/json' }),
    [session?.access_token],
  );

  const load = useCallback(async () => {
    if (!session?.access_token) { setLoading(false); return; }
    setLoading(true);
    setError('');
    // The vendor id is only honoured for a company caller; a vendor is scoped
    // by the server whatever it sends. Passing it means the owner's role
    // switcher shows one vendor's ledger rather than everybody's.
    const scope = vendorId ? `?vendorId=${encodeURIComponent(vendorId)}` : '';
    try {
      const [i, p, b] = await Promise.all([
        fetch(`${API}/vendor-billing/invoices${scope}`, { headers }).then(r => r.json()).catch(() => ({})),
        fetch(`${API}/vendor-billing/payments${scope}`, { headers }).then(r => r.json()).catch(() => ({})),
        fetch(`${API}/vendor-billing/billable-orders${scope}`, { headers }).then(r => r.json()).catch(() => ({})),
      ]);
      setInvoices(Array.isArray(i?.invoices) ? i.invoices : []);
      setPayments(Array.isArray(p?.payments) ? p.payments : []);
      setBillable(Array.isArray(b?.orders) ? b.orders : []);
      if (i?.success === false && i?.error) setError(String(i.error));
    } catch {
      setError('Could not reach the server.');
    } finally {
      setLoading(false);
    }
  }, [headers, session?.access_token, vendorId]);

  useEffect(() => { void load(); }, [load]);

  return { invoices, payments, billable, loading, error, reload: load, headers };
}

// ─────────────────────────────────────────────────────────────────────────────
// Small shared pieces
// ─────────────────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, icon: Icon, tone = 'gray' }: any) {
  const tones: Record<string, string> = {
    gray: 'text-gray-400',
    green: 'text-green-400',
    red: 'text-red-400',
    orange: 'text-orange-400',
  };
  return (
    <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-4">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
        {Icon && <Icon className="h-3.5 w-3.5" />} {label}
      </div>
      <p className={`mt-2 text-2xl font-bold tabular-nums ${tones[tone] || 'text-white'}`}>{value}</p>
      {sub && <p className="mt-1 text-xs text-gray-500">{sub}</p>}
    </div>
  );
}

function StatusPill({ invoice }: { invoice: any }) {
  const status = String(invoice.status || 'submitted');
  const overdue = Boolean(invoice.overdue);
  const map: Record<string, string> = {
    submitted: 'border-blue-500/30 bg-blue-500/10 text-blue-300',
    approved: 'border-green-500/30 bg-green-500/10 text-green-300',
    disputed: 'border-red-500/30 bg-red-500/10 text-red-300',
    paid: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
    void: 'border-[#3A3A3A] bg-[#222] text-gray-500',
  };
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`rounded border px-2 py-0.5 text-xs font-semibold capitalize ${map[status] || map.submitted}`}>
        {status}
      </span>
      {overdue && (
        <span className="rounded border border-red-500/40 bg-red-500/10 px-2 py-0.5 text-xs font-bold text-red-300">
          Overdue
        </span>
      )}
    </span>
  );
}

/** Not linked, not signed in, and nothing here yet are three different things. */
function Blocked({ vendorLinked, linkReason, loading, error }: any) {
  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-12 text-sm text-gray-400">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading…
      </div>
    );
  }
  if (vendorLinked === false) {
    return (
      <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/5 p-8 text-center">
        <AlertCircle className="mx-auto mb-3 h-7 w-7 text-yellow-400" />
        <p className="font-semibold text-white">This account is not linked to a vendor yet</p>
        <p className="mx-auto mt-2 max-w-md text-sm text-gray-400">
          {linkReason || 'Once your login is attached to your vendor record, your invoices appear here.'}
        </p>
      </div>
    );
  }
  if (error) {
    return (
      <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-6 text-center text-sm text-red-300">
        {error}
      </div>
    );
  }
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Invoices
// ─────────────────────────────────────────────────────────────────────────────
export function VendorInvoicesTab(props: BillingProps) {
  const { mode = 'vendor', vendorLinked, linkReason, vendorId } = props;
  const { invoices, payments, billable, loading, error, reload, headers } = useBilling(props);

  const [raising, setRaising] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ number: '', issueDate: new Date().toISOString().slice(0, 10), terms: 'Net 30', notes: '' });
  const [picked, setPicked] = useState<string[]>([]);

  const pickedTotal = billable
    .filter((o) => picked.includes(o.id))
    .reduce((s, o) => s + Number(o.total || 0), 0);

  const outstanding = invoices.filter((i) => i.status !== 'paid' && i.status !== 'void');
  const outstandingTotal = outstanding.reduce((s, i) => s + Number(i.outstanding || 0), 0);
  const overdue = outstanding.filter((i) => i.overdue);
  const thisYear = String(new Date().getFullYear());
  const paidThisYear = payments
    .filter((p) => String(p.paidDate || '').startsWith(thisYear))
    .reduce((s, p) => s + Number(p.amount || 0), 0);

  const raise = async () => {
    if (!form.number.trim()) { toast.error('Give the invoice a number.'); return; }
    if (!picked.length) { toast.error('Select at least one purchase order.'); return; }
    setBusy(true);
    try {
      const res = await fetch(`${API}/vendor-billing/invoices`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ ...form, poIds: picked, vendorId: vendorId || undefined }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.success === false) throw new Error(data?.error || `HTTP ${res.status}`);
      toast.success(`Invoice ${form.number} submitted.`);
      setRaising(false);
      setPicked([]);
      setForm({ number: '', issueDate: new Date().toISOString().slice(0, 10), terms: 'Net 30', notes: '' });
      await reload();
    } catch (e: any) {
      toast.error(e?.message || 'Could not raise the invoice.');
    } finally {
      setBusy(false);
    }
  };

  const setStatus = async (invoice: any, status: string) => {
    setBusy(true);
    try {
      const res = await fetch(`${API}/vendor-billing/invoices/${invoice.id}/status`, {
        method: 'PATCH', headers, body: JSON.stringify({ status }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.success === false) throw new Error(data?.error || `HTTP ${res.status}`);
      toast.success(`Invoice ${invoice.number} ${status}.`);
      await reload();
    } catch (e: any) {
      toast.error(e?.message || 'Could not update the invoice.');
    } finally { setBusy(false); }
  };

  const pay = async (invoice: any) => {
    setBusy(true);
    try {
      const res = await fetch(`${API}/vendor-billing/payments`, {
        method: 'POST', headers,
        body: JSON.stringify({ invoiceIds: [invoice.id], method: 'ACH transfer', reference: `Payment for ${invoice.number}` }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.success === false) throw new Error(data?.error || `HTTP ${res.status}`);
      toast.success(`${money(data.payment?.amount)} recorded against ${invoice.number}.`);
      await reload();
    } catch (e: any) {
      toast.error(e?.message || 'Could not record the payment.');
    } finally { setBusy(false); }
  };

  const blocked = <Blocked vendorLinked={vendorLinked} linkReason={linkReason} loading={loading} error={error} />;
  if (loading || vendorLinked === false || error) {
    return <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-6">{blocked}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Outstanding" value={whole(outstandingTotal)} icon={FileText}
          sub={outstanding.length ? `${outstanding.length} invoice${outstanding.length === 1 ? '' : 's'} unpaid` : 'Nothing outstanding'} />
        <StatCard label="Overdue" value={overdue.length.toString()} icon={AlertCircle}
          tone={overdue.length ? 'red' : 'gray'}
          sub={overdue.length ? whole(overdue.reduce((s, i) => s + Number(i.outstanding || 0), 0)) + ' past due' : 'All within terms'} />
        <StatCard label={`Paid in ${thisYear}`} value={whole(paidThisYear)} icon={CheckCircle2} tone="green"
          sub={payments.length ? `${payments.length} remittance${payments.length === 1 ? '' : 's'}` : 'No payments yet'} />
      </div>

      <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-white">Invoices</h2>
            <p className="mt-1 text-sm text-gray-400">
              {mode === 'company'
                ? 'Invoices raised against Black Phoenix, newest first.'
                : 'What you have billed Black Phoenix for, newest first.'}
            </p>
          </div>
          {mode === 'vendor' && (
            <button
              type="button"
              onClick={() => setRaising((v) => !v)}
              className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-orange-500"
            >
              {raising ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              {raising ? 'Cancel' : 'Raise an invoice'}
            </button>
          )}
        </div>

        {raising && mode === 'vendor' && (
          <div className="mb-6 rounded-lg border border-orange-500/30 bg-orange-500/5 p-4 sm:p-5">
            <h3 className="mb-4 font-bold text-white">New invoice</h3>

            {billable.length === 0 ? (
              <div className="rounded-lg border border-[#2A2A2A] bg-[#0A0A0A] p-6 text-center">
                <Package className="mx-auto mb-2 h-6 w-6 text-gray-600" />
                <p className="text-sm font-semibold text-white">Nothing left to invoice</p>
                <p className="mx-auto mt-1 max-w-sm text-sm text-gray-400">
                  Every purchase order raised against you is either already on an invoice, still in
                  draft on our side, or cancelled.
                </p>
              </div>
            ) : (
              <>
                <div className="grid gap-4 sm:grid-cols-3">
                  <label className="block">
                    <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-400">Invoice number</span>
                    <input
                      value={form.number}
                      onChange={(e) => setForm({ ...form, number: e.target.value })}
                      placeholder="Your own reference"
                      className="w-full rounded-lg border border-[#2A2A2A] bg-[#0A0A0A] px-3 py-2 text-sm text-white"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-400">Issue date</span>
                    <input
                      type="date"
                      value={form.issueDate}
                      onChange={(e) => setForm({ ...form, issueDate: e.target.value })}
                      className="w-full rounded-lg border border-[#2A2A2A] bg-[#0A0A0A] px-3 py-2 text-sm text-white"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-400">Terms</span>
                    <select
                      value={form.terms}
                      onChange={(e) => setForm({ ...form, terms: e.target.value })}
                      className="w-full rounded-lg border border-[#2A2A2A] bg-[#0A0A0A] px-3 py-2 text-sm text-white"
                    >
                      {['Due on receipt', 'Net 15', 'Net 30', 'Net 45', 'Net 60'].map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </label>
                </div>

                <p className="mt-5 mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
                  Purchase orders to bill
                </p>
                <div className="max-h-64 overflow-y-auto rounded-lg border border-[#2A2A2A] bg-[#0A0A0A] divide-y divide-[#2A2A2A]">
                  {billable.map((o) => {
                    const on = picked.includes(o.id);
                    return (
                      <label key={o.id} className="flex min-h-11 cursor-pointer items-center gap-3 p-3 hover:bg-[#141414]">
                        <input
                          type="checkbox"
                          checked={on}
                          onChange={() => setPicked(on ? picked.filter((x) => x !== o.id) : [...picked, o.id])}
                          className="h-4 w-4 accent-orange-500"
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold text-white">{o.poNumber}</span>
                          <span className="block text-xs text-gray-500">
                            {o.orderDate || '—'} · {o.lines} line{o.lines === 1 ? '' : 's'} · {o.status}
                          </span>
                        </span>
                        <span className="text-sm font-bold tabular-nums text-white">{money(o.total)}</span>
                      </label>
                    );
                  })}
                </div>

                <label className="mt-4 block">
                  <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-400">Notes (optional)</span>
                  <textarea
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    rows={2}
                    className="w-full rounded-lg border border-[#2A2A2A] bg-[#0A0A0A] px-3 py-2 text-sm text-white"
                  />
                </label>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[#2A2A2A] pt-4">
                  {/* Totalled from the selected orders rather than typed. The
                      server recomputes it anyway and ignores anything sent. */}
                  <p className="text-sm text-gray-400">
                    {picked.length} order{picked.length === 1 ? '' : 's'} ·{' '}
                    <span className="text-lg font-bold tabular-nums text-white">{money(pickedTotal)}</span>
                  </p>
                  <button
                    type="button"
                    onClick={raise}
                    disabled={busy || !picked.length || !form.number.trim()}
                    className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-orange-600 px-5 py-2 text-sm font-bold text-white transition hover:bg-orange-500 disabled:opacity-40"
                  >
                    {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Receipt className="h-4 w-4" />}
                    Submit invoice
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {invoices.length === 0 ? (
          <div className="rounded-lg border border-[#2A2A2A] bg-[#0A0A0A] p-10 text-center">
            <FileText className="mx-auto mb-3 h-8 w-8 text-gray-600" />
            <p className="font-semibold text-white">No invoices yet</p>
            <p className="mx-auto mt-2 max-w-md text-sm text-gray-400">
              {mode === 'company'
                ? 'When a vendor bills for a delivered order, the invoice arrives here for approval.'
                : 'Once a purchase order has been delivered, raise an invoice against it and it appears here.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b border-[#2A2A2A] text-left text-xs uppercase tracking-wide text-gray-500">
                  <th className="pb-3 pr-4 font-semibold">Invoice</th>
                  {/* The company sees every vendor's invoices in one table, so
                      it needs to know whose each one is. A vendor looking at
                      their own ledger does not. */}
                  {mode === 'company' && <th className="pb-3 pr-4 font-semibold">Vendor</th>}
                  <th className="pb-3 pr-4 font-semibold">Issued</th>
                  <th className="pb-3 pr-4 font-semibold">Due</th>
                  <th className="pb-3 pr-4 font-semibold">Orders</th>
                  <th className="pb-3 pr-4 text-right font-semibold">Amount</th>
                  <th className="pb-3 pr-4 text-right font-semibold">Outstanding</th>
                  <th className="pb-3 pr-4 font-semibold">Status</th>
                  {mode === 'company' && <th className="pb-3 font-semibold">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2A2A2A]">
                {invoices.map((inv) => (
                  <tr key={inv.id} className="text-gray-300">
                    <td className="py-3 pr-4 font-semibold text-white">{inv.number}</td>
                    {mode === 'company' && (
                      <td className="py-3 pr-4 text-gray-300">{inv.vendorName || inv.vendorId || '—'}</td>
                    )}
                    <td className="py-3 pr-4">{day(inv.issueDate)}</td>
                    <td className={`py-3 pr-4 ${inv.overdue ? 'font-semibold text-red-300' : ''}`}>{day(inv.dueDate)}</td>
                    <td className="py-3 pr-4 text-gray-400">{(inv.poNumbers || []).join(', ') || '—'}</td>
                    <td className="py-3 pr-4 text-right font-semibold tabular-nums text-white">{money(inv.amount)}</td>
                    <td className="py-3 pr-4 text-right tabular-nums">
                      {Number(inv.outstanding || 0) > 0 ? money(inv.outstanding) : <span className="text-emerald-400">Settled</span>}
                    </td>
                    <td className="py-3 pr-4"><StatusPill invoice={inv} /></td>
                    {mode === 'company' && (
                      <td className="py-3">
                        <div className="flex flex-wrap gap-2">
                          {inv.status === 'submitted' && (
                            <>
                              <button type="button" disabled={busy} onClick={() => setStatus(inv, 'approved')}
                                className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-green-500/40 px-3 py-1.5 text-xs font-bold text-green-300 transition hover:bg-green-500/10 disabled:opacity-40">
                                <CheckCircle2 className="h-3.5 w-3.5" /> Approve
                              </button>
                              <button type="button" disabled={busy} onClick={() => setStatus(inv, 'disputed')}
                                className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-red-500/40 px-3 py-1.5 text-xs font-bold text-red-300 transition hover:bg-red-500/10 disabled:opacity-40">
                                <Ban className="h-3.5 w-3.5" /> Dispute
                              </button>
                            </>
                          )}
                          {inv.status === 'approved' && Number(inv.outstanding || 0) > 0 && (
                            <button type="button" disabled={busy} onClick={() => pay(inv)}
                              className="inline-flex min-h-11 items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-emerald-500 disabled:opacity-40">
                              <DollarSign className="h-3.5 w-3.5" /> Record payment
                            </button>
                          )}
                          {inv.status === 'disputed' && (
                            <button type="button" disabled={busy} onClick={() => setStatus(inv, 'submitted')}
                              className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-[#3A3A3A] px-3 py-1.5 text-xs font-bold text-gray-300 transition hover:bg-[#222] disabled:opacity-40">
                              Reopen
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Payments
// ─────────────────────────────────────────────────────────────────────────────
export function VendorPaymentsTab(props: BillingProps) {
  const { vendorLinked, linkReason } = props;
  const { invoices, payments, loading, error } = useBilling(props);

  const paidTotal = payments.reduce((s, p) => s + Number(p.amount || 0), 0);
  const outstandingTotal = invoices
    .filter((i) => i.status !== 'void')
    .reduce((s, i) => s + Number(i.outstanding || 0), 0);

  /**
   * Average days from raising an invoice to the money arriving.
   *
   * Only over invoices that have actually been paid — averaging in the unpaid
   * ones would quietly report a faster payer than we are.
   */
  const avgDaysToPay = (() => {
    const spans: number[] = [];
    for (const p of payments) {
      for (const id of (p.invoiceIds || [])) {
        const inv = invoices.find((i) => i.id === id);
        if (!inv?.issueDate || !p.paidDate) continue;
        const d = (Date.parse(`${p.paidDate}T00:00:00Z`) - Date.parse(`${inv.issueDate}T00:00:00Z`)) / 86400000;
        if (Number.isFinite(d) && d >= 0) spans.push(d);
      }
    }
    return spans.length ? Math.round(spans.reduce((a, b) => a + b, 0) / spans.length) : null;
  })();

  if (loading || vendorLinked === false || error) {
    return (
      <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-6">
        <Blocked vendorLinked={vendorLinked} linkReason={linkReason} loading={loading} error={error} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Paid to date" value={whole(paidTotal)} icon={CheckCircle2} tone="green"
          sub={payments.length ? `${payments.length} remittance${payments.length === 1 ? '' : 's'}` : 'No payments yet'} />
        <StatCard label="Still outstanding" value={whole(outstandingTotal)} icon={Clock}
          tone={outstandingTotal > 0 ? 'orange' : 'gray'}
          sub={outstandingTotal > 0 ? 'Across unpaid invoices' : 'Everything settled'} />
        <StatCard label="Average days to pay" value={avgDaysToPay === null ? '—' : String(avgDaysToPay)} icon={CalendarClock}
          sub={avgDaysToPay === null ? 'No invoice has been paid yet' : 'From invoice date to payment'} />
      </div>

      <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-6">
        <h2 className="text-lg font-bold text-white">Payment history</h2>
        <p className="mt-1 mb-5 text-sm text-gray-400">Remittances received from Black Phoenix, newest first.</p>

        {payments.length === 0 ? (
          <div className="rounded-lg border border-[#2A2A2A] bg-[#0A0A0A] p-10 text-center">
            <DollarSign className="mx-auto mb-3 h-8 w-8 text-gray-600" />
            <p className="font-semibold text-white">No payments yet</p>
            <p className="mx-auto mt-2 max-w-md text-sm text-gray-400">
              {invoices.length
                ? 'Payments appear here as each approved invoice is settled.'
                : 'Once you raise an invoice and it is settled, the remittance shows up here.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-[#2A2A2A] text-left text-xs uppercase tracking-wide text-gray-500">
                  <th className="pb-3 pr-4 font-semibold">Paid</th>
                  <th className="pb-3 pr-4 font-semibold">Reference</th>
                  <th className="pb-3 pr-4 font-semibold">Method</th>
                  <th className="pb-3 pr-4 font-semibold">Invoices</th>
                  <th className="pb-3 text-right font-semibold">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2A2A2A]">
                {payments.map((p) => (
                  <tr key={p.id} className="text-gray-300">
                    <td className="py-3 pr-4">{day(p.paidDate)}</td>
                    <td className="py-3 pr-4 text-gray-400">{p.reference || '—'}</td>
                    <td className="py-3 pr-4">{p.method || '—'}</td>
                    <td className="py-3 pr-4 text-gray-400">{(p.invoiceNumbers || []).join(', ') || '—'}</td>
                    <td className="py-3 text-right font-semibold tabular-nums text-emerald-400">{money(p.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Performance
// ─────────────────────────────────────────────────────────────────────────────
export function VendorPerformanceTab(props: BillingProps & { purchaseOrders: any[]; catalog: any[] }) {
  const { purchaseOrders = [], catalog = [], vendorLinked, linkReason } = props;
  const { invoices, payments, loading, error } = useBilling(props);

  const orderCount = purchaseOrders.length;
  const totalValue = purchaseOrders.reduce((s, o) => s + Number(o.total || 0), 0);
  const avgOrder = orderCount ? totalValue / orderCount : 0;
  const largest = purchaseOrders.reduce((m, o) => Math.max(m, Number(o.total || 0)), 0);

  /**
   * On-time delivery, over the orders that can actually answer the question.
   *
   * Delivery was never timestamped until now, so historical orders have no
   * `deliveredAt` and are excluded rather than assumed on time. When none
   * qualify the tab says the measurement starts from here — which is the honest
   * answer, and better than a percentage computed from nothing.
   */
  const onTime = (() => {
    const measurable = purchaseOrders.filter((o) => o.deliveredAt && (o.expectedDate || o.expectedDelivery));
    if (!measurable.length) return null;
    const hit = measurable.filter((o) => {
      const promised = String(o.expectedDate || o.expectedDelivery).slice(0, 10);
      return String(o.deliveredAt).slice(0, 10) <= promised;
    }).length;
    return { pct: Math.round((hit / measurable.length) * 100), hit, of: measurable.length };
  })();

  /** Where the orders sit right now — counted, not sampled. */
  const statusMix = (() => {
    const by = new Map<string, number>();
    for (const o of purchaseOrders) {
      const k = String(o.status || 'unknown').toLowerCase();
      by.set(k, (by.get(k) || 0) + 1);
    }
    return [...by.entries()].sort((a, b) => b[1] - a[1]);
  })();

  /**
   * Catalogue coverage: which published lines have ever actually been ordered.
   *
   * A vendor can act on this — a line nobody has ever bought is either priced
   * wrong, described wrong, or something we do not use.
   */
  const coverage = (() => {
    if (!catalog.length) return null;
    const orderedSkus = new Set<string>();
    for (const o of purchaseOrders) {
      for (const li of (o.lineItems || [])) {
        const sku = String(li?.sku || li?.SKU || '').trim().toLowerCase();
        if (sku) orderedSkus.add(sku);
      }
    }
    const ordered = catalog.filter((c) => orderedSkus.has(String(c?.sku || '').trim().toLowerCase())).length;
    return { ordered, total: catalog.length, pct: Math.round((ordered / catalog.length) * 100) };
  })();

  const invoicedTotal = invoices.filter((i) => i.status !== 'void').reduce((s, i) => s + Number(i.amount || 0), 0);
  const paidTotal = payments.reduce((s, p) => s + Number(p.amount || 0), 0);

  if (loading || vendorLinked === false || error) {
    return (
      <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-6">
        <Blocked vendorLinked={vendorLinked} linkReason={linkReason} loading={loading} error={error} />
      </div>
    );
  }

  if (!orderCount) {
    return (
      <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-6">
        <h2 className="mb-4 text-lg font-bold text-white">Performance</h2>
        <div className="rounded-lg border border-[#2A2A2A] bg-[#0A0A0A] p-10 text-center">
          <TrendingUp className="mx-auto mb-3 h-8 w-8 text-gray-600" />
          <p className="font-semibold text-white">Nothing to measure yet</p>
          <p className="mx-auto mt-2 max-w-md text-sm text-gray-400">
            Performance is counted from the purchase orders raised against you. Once the first
            order is placed, this fills in on its own.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Order value" value={whole(totalValue)} icon={DollarSign}
          sub={`across ${orderCount} order${orderCount === 1 ? '' : 's'}`} />
        <StatCard label="Average order" value={whole(avgOrder)} icon={Package} sub={`largest ${whole(largest)}`} />
        <StatCard label="Invoiced" value={whole(invoicedTotal)} icon={FileText}
          sub={invoicedTotal ? `${whole(paidTotal)} settled` : 'Nothing invoiced yet'} />
        <StatCard
          label="On-time delivery"
          value={onTime ? `${onTime.pct}%` : '—'}
          tone={onTime ? (onTime.pct >= 90 ? 'green' : onTime.pct >= 75 ? 'orange' : 'red') : 'gray'}
          icon={CalendarClock}
          sub={onTime ? `${onTime.hit} of ${onTime.of} measured` : 'Measured from the next delivery on'}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-6">
          <h3 className="mb-4 font-bold text-white">Where orders stand</h3>
          <div className="space-y-3">
            {statusMix.map(([status, count]) => (
              <div key={status}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="capitalize text-gray-300">{status.replace(/_/g, ' ')}</span>
                  <span className="font-semibold tabular-nums text-white">{count}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-[#0A0A0A]">
                  <div className="h-full rounded-full bg-orange-500" style={{ width: `${(count / orderCount) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-6">
          <h3 className="mb-1 font-bold text-white">Catalogue coverage</h3>
          <p className="mb-4 text-sm text-gray-400">
            How much of what you publish has actually been ordered.
          </p>
          {coverage === null ? (
            <div className="rounded-lg border border-[#2A2A2A] bg-[#0A0A0A] p-6 text-center text-sm text-gray-400">
              Publish your catalogue on the Products tab and this shows which lines sell.
            </div>
          ) : (
            <>
              <p className="text-3xl font-bold tabular-nums text-white">{coverage.pct}%</p>
              <p className="mt-1 text-sm text-gray-400">
                {coverage.ordered} of {coverage.total} published line{coverage.total === 1 ? '' : 's'} ordered
                at least once
              </p>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-[#0A0A0A]">
                <div className="h-full rounded-full bg-green-500" style={{ width: `${coverage.pct}%` }} />
              </div>
              {coverage.ordered < coverage.total && (
                <p className="mt-4 text-sm text-gray-500">
                  {coverage.total - coverage.ordered} line{coverage.total - coverage.ordered === 1 ? ' has' : 's have'}{' '}
                  never been ordered — worth checking the price or the description.
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
