/**
 * What actually came in, written down.
 *
 * WHY THIS EXISTS
 *
 * The "Mark as Paid" button on the invoice builder set a status flag in React
 * state and nothing else. It did not say how much arrived, by what means, or
 * against what reference — and it never reached the server at all, so the paid
 * status did not survive a reload. The toast said "Marked as paid" and nothing
 * had been recorded anywhere.
 *
 * A payment is not a status. It is an amount, a method, a date and a reference,
 * and without those a deposit cannot be told from settlement, a cheque cannot
 * be found on a bank statement, and the books do not reconcile.
 *
 * ON THE QUOTE/INVOICE SEAM
 *
 * The builder lists quotes, and payments are recorded against invoices. Nothing
 * converted one into the other, which is why money had nowhere to land. When a
 * payment is recorded here and no invoice exists yet, one is raised from the
 * quote first, carrying the same id so the two stay tied together. The server
 * remains the authority on the arithmetic: it recomputes the balance, refuses
 * an overpayment rather than clamping it, and insists on a cheque number.
 */
import { useMemo, useState } from 'react';
import { X, Loader2, BadgeDollarSign } from 'lucide-react';
import { toast } from 'sonner';
import { projectId } from '../../utils/supabase/info';
import { supabase } from '../../lib/supabase';

const SERVER = `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6`;

type Method = 'cash' | 'check' | 'bank_transfer' | 'other';

const METHODS: Array<{ id: Method; label: string; refLabel: string; refRequired: boolean }> = [
  { id: 'cash', label: 'Cash', refLabel: 'Receipt number (optional)', refRequired: false },
  { id: 'check', label: 'Check', refLabel: 'Check number', refRequired: true },
  { id: 'bank_transfer', label: 'Bank transfer', refLabel: 'Reference (optional)', refRequired: false },
  { id: 'other', label: 'Other', refLabel: 'Reference (optional)', refRequired: false },
];

export interface PayableDoc {
  id: string;
  number?: string;
  clientName?: string;
  clientEmail?: string;
  customerId?: string;
  /** The full value of the document. */
  total: number;
  /** Already received against it, if known. */
  paidAmount?: number;
  /** Used to raise an invoice if one does not exist yet. */
  lineItems?: Array<{ description: string; quantity: number; unit_price: number }>;
  taxRate?: number;
  dueDate?: string;
}

async function authHeaders() {
  const { data: { session } } = await supabase.auth.getSession();
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${session?.access_token || ''}`,
  };
}

export default function RecordPaymentDialog({ doc, onClose, onRecorded }: {
  doc: PayableDoc;
  onClose: () => void;
  /** Handed the server's updated invoice so the caller can refresh. */
  onRecorded: (invoice: any) => void;
}) {
  const outstanding = useMemo(
    () => Math.max(0, Number((doc.total - (doc.paidAmount || 0)).toFixed(2))),
    [doc.total, doc.paidAmount],
  );

  const [amount, setAmount] = useState<string>(outstanding.toFixed(2));
  const [method, setMethod] = useState<Method>('check');
  const [reference, setReference] = useState('');
  const [receivedAt, setReceivedAt] = useState(() => new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const spec = METHODS.find(m => m.id === method)!;
  const entered = Number(amount);
  const valid = Number.isFinite(entered) && entered > 0 && entered <= outstanding
    && (!spec.refRequired || reference.trim().length > 0);

  /**
   * Make sure there is an invoice to pay.
   *
   * The invoice takes the quote's id, so a document does not end up existing
   * twice under two identifiers — which is how a customer ends up chased for a
   * bill they have already settled.
   */
  async function ensureInvoice(headers: Record<string, string>): Promise<boolean> {
    const existing = await fetch(`${SERVER}/invoices/${encodeURIComponent(doc.id)}`, { headers })
      .then(r => (r.ok ? r.json() : null))
      .catch(() => null);
    if (existing?.invoice) return true;

    const res = await fetch(`${SERVER}/invoices`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        id: doc.id,
        invoice_number: doc.number,
        customerEmail: doc.clientEmail,
        customerName: doc.clientName,
        customerId: doc.customerId,
        line_items: (doc.lineItems || []).map((l, i) => ({
          line_number: i + 1,
          description: l.description,
          quantity: l.quantity,
          unit_price: l.unit_price,
        })),
        tax_rate: doc.taxRate ?? 0,
        total_amount: doc.total,
        due_date: doc.dueDate,
        status: 'pending',
        raisedFromQuote: doc.id,
      }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.success) {
      toast.error(data?.error || `Could not raise an invoice for this quote (${res.status}).`);
      return false;
    }
    return true;
  }

  async function submit() {
    if (!valid || busy) return;
    setBusy(true);
    try {
      const headers = await authHeaders();
      if (!(await ensureInvoice(headers))) return;

      const res = await fetch(`${SERVER}/invoices/${encodeURIComponent(doc.id)}/record-payment`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          amount: entered,
          method,
          reference: reference.trim(),
          receivedAt,
          note: note.trim(),
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) {
        // The server's wording is better than anything invented here — it knows
        // the outstanding balance and says so.
        toast.error(data?.error || `Payment was not recorded (${res.status}).`);
        return;
      }

      const settled = Number(data.invoice?.balance_due ?? 0) <= 0;
      toast.success(settled
        ? `$${entered.toFixed(2)} recorded — this invoice is settled.`
        : `$${entered.toFixed(2)} recorded. $${Number(data.invoice?.balance_due ?? 0).toFixed(2)} still outstanding.`);
      onRecorded(data.invoice);
      onClose();
    } catch (err: any) {
      toast.error(err?.message || 'Payment was not recorded.');
    } finally {
      setBusy(false);
    }
  }

  const input = 'w-full px-3 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white text-sm focus:outline-none focus:border-[#ea580c]';
  const label = 'block text-[11px] font-semibold text-gray-400 mb-1';

  return (
    <div className="fixed inset-0 z-[9000] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)' }} onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl border border-[#2A2A2A] bg-[#111] p-5"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-1">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <BadgeDollarSign className="w-5 h-5 text-[#ea580c]" /> Record a payment
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white"><X className="w-5 h-5" /></button>
        </div>
        <p className="text-xs text-gray-500 mb-4">
          {doc.number ? `${doc.number} — ` : ''}{doc.clientName || 'this customer'}.
          {' '}<span className="text-gray-300 font-semibold">${outstanding.toFixed(2)}</span> outstanding.
        </p>

        <div className="space-y-3">
          <div>
            <label className={label}>Amount received</label>
            <input value={amount} onChange={e => setAmount(e.target.value)} inputMode="decimal" className={input} />
            {entered > outstanding && (
              <p className="text-[11px] text-red-400 mt-1">
                That is more than the ${outstanding.toFixed(2)} outstanding.
              </p>
            )}
            {outstanding > 0 && entered > 0 && entered < outstanding && (
              <p className="text-[11px] text-amber-500/90 mt-1">
                Part payment — ${(outstanding - entered).toFixed(2)} will remain outstanding.
              </p>
            )}
          </div>

          <div>
            <label className={label}>How it came in</label>
            <div className="grid grid-cols-4 gap-1.5">
              {METHODS.map(m => (
                <button key={m.id} onClick={() => setMethod(m.id)}
                  className={`px-2 py-2 rounded-lg text-xs font-semibold border transition ${
                    method === m.id
                      ? 'border-[#ea580c] text-white bg-[#ea580c]/15'
                      : 'border-[#2A2A2A] text-gray-400 hover:text-white'}`}>
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className={label}>
              {spec.refLabel}
              {spec.refRequired && <span className="text-[#ea580c]"> *</span>}
            </label>
            <input value={reference} onChange={e => setReference(e.target.value)} className={input}
              placeholder={method === 'check' ? 'The number on the cheque' : ''} />
            {spec.refRequired && !reference.trim() && (
              <p className="text-[11px] text-gray-500 mt-1">
                Without it this payment cannot be matched to a bank statement later.
              </p>
            )}
          </div>

          <div>
            <label className={label}>Date received</label>
            <input type="date" value={receivedAt} max={new Date().toISOString().slice(0, 10)}
              onChange={e => setReceivedAt(e.target.value)} className={input} />
          </div>

          <div>
            <label className={label}>Note (optional)</label>
            <input value={note} onChange={e => setNote(e.target.value)} className={input}
              placeholder="Deposit, final payment, paid on site" />
          </div>
        </div>

        <button onClick={submit} disabled={!valid || busy}
          className="mt-4 w-full py-3 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2 disabled:opacity-40"
          style={{ background: '#ea580c' }}>
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <BadgeDollarSign className="w-4 h-4" />}
          {busy ? 'Recording…' : `Record $${(Number.isFinite(entered) ? entered : 0).toFixed(2)}`}
        </button>
        <p className="text-[11px] text-gray-600 mt-2 text-center">
          Recorded against the invoice on the server, with who entered it and when.
        </p>
      </div>
    </div>
  );
}
