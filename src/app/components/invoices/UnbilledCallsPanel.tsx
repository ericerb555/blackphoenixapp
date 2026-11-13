/**
 * The emergency callouts on this job that nobody has billed yet.
 *
 * WHY IT IS A PANEL AND NOT AUTOMATIC
 *
 * The lines are already priced and could in principle be added to the invoice
 * the moment it opens. They are not, because a callout is the most disputed
 * thing on any invoice — the hours, the out-of-hours rate, whether the first
 * visit counted — and the person raising the invoice is the one who knows
 * whether this particular night gets charged in full, discounted, or waived
 * because it was a return visit for the same fault. Adding it silently would
 * take that decision away from them and put it in front of the customer.
 *
 * So it offers, with the arithmetic shown, and a person chooses.
 *
 * WHAT IT REFUSES TO HIDE
 *
 * A call that closed without a price is shown as needing attention rather
 * than left out of the list. Those are the calls where something went wrong
 * at the time — the rate card would not load at 2am — and they are therefore
 * exactly the calls most likely to go unbilled forever if this panel only
 * ever showed the tidy ones.
 */
import { useState, useEffect, useMemo } from 'react';
import { AlertTriangle, Phone, Plus, Check } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { API_BASE_URL } from '../../lib/apiConfig';
import {
  billableCalls, invoiceLinesFromCalls,
  type CallLike, type InvoiceLine,
} from '../../lib/callsToInvoice';

const SERVER = `${API_BASE_URL}/make-server-3eae23a6`;

const money = (cents: number) =>
  '$' + (Math.round(cents) / 100).toLocaleString('en-US', {
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  });

export default function UnbilledCallsPanel({
  jobId, workRequestId, currentLines, nextLineNumber, onAdd,
}: {
  jobId?: string | null;
  workRequestId?: string | null;
  /** The lines already on the invoice being edited, so nothing is added twice. */
  currentLines: Array<Record<string, unknown>>;
  nextLineNumber: number;
  onAdd: (lines: InvoiceLine[], callIds: string[]) => void;
}) {
  const [calls, setCalls] = useState<CallLike[] | null>(null);
  const [chosen, setChosen] = useState<Set<string>>(new Set());
  const [failed, setFailed] = useState(false);

  const scoped = Boolean(String(jobId || '').trim() || String(workRequestId || '').trim());

  useEffect(() => {
    if (!scoped) { setCalls(null); return; }
    let cancelled = false;
    void (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) return;
        const res = await fetch(`${SERVER}/on-call-calls`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (!res.ok) { if (!cancelled) setFailed(true); return; }
        const body = await res.json();
        if (!cancelled) setCalls(Array.isArray(body?.calls) ? body.calls : []);
      } catch {
        /*
         * A call log that will not load must not stop an invoice being raised.
         * It says so below rather than rendering nothing, because an empty
         * panel and a broken one look identical and mean opposite things.
         */
        if (!cancelled) setFailed(true);
      }
    })();
    return () => { cancelled = true; };
  }, [scoped, jobId, workRequestId]);

  const found = useMemo(() => billableCalls(calls, {
    jobId,
    workRequestId,
    // The invoice being edited counts as an existing invoice: its own lines
    // veto a call just as a saved one would, so clicking Add twice cannot
    // double it.
    existingInvoices: [{ invoice_number: 'this invoice', line_items: currentLines }],
  }), [calls, jobId, workRequestId, currentLines]);

  if (!scoped || failed) {
    return failed ? (
      <p className="text-xs text-amber-700">
        The call log could not be read, so any unbilled callouts are not shown here.
      </p>
    ) : null;
  }

  const nothing = found.billable.length === 0
    && found.needsPricing.length === 0
    && found.alreadyInvoiced.length === 0;
  if (calls === null || nothing) return null;

  const toggle = (id: string) => setChosen((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  const picked = found.billable.filter((b) => chosen.has(b.callId));
  const pickedCents = picked.reduce((n, b) => n + b.totalCents, 0);

  const add = () => {
    if (!picked.length) return;
    onAdd(invoiceLinesFromCalls(picked, nextLineNumber), picked.map((b) => b.callId));
    setChosen(new Set());
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
      <div className="flex items-center gap-2">
        <Phone className="h-4 w-4 text-gray-600" />
        <h4 className="text-sm font-semibold text-gray-900">Emergency callouts on this job</h4>
      </div>

      {found.billable.length > 0 && (
        <>
          <p className="mt-1 text-xs text-gray-600">
            Priced when the call was closed. Tick what belongs on this invoice.
          </p>
          <ul className="mt-2 space-y-1.5">
            {found.billable.map((b) => (
              <li key={b.callId}>
                <label className="flex cursor-pointer items-start gap-2 rounded border border-gray-200 bg-white p-2">
                  <input
                    type="checkbox"
                    className="mt-0.5"
                    checked={chosen.has(b.callId)}
                    onChange={() => toggle(b.callId)}
                  />
                  <span className="flex-1">
                    <span className="block text-sm font-medium text-gray-900">{b.title}</span>
                    <span className="block text-xs text-gray-600">
                      {b.closedAt ? new Date(b.closedAt).toLocaleString('en-US', {
                        month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
                      }) : 'no close time'}
                      {b.billedHours ? ` · ${b.billedHours} hr billed` : ''}
                      {b.trade ? ` · ${b.trade}` : ''}
                    </span>
                  </span>
                  <span className="text-sm font-semibold text-gray-900">{money(b.totalCents)}</span>
                </label>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={add}
            disabled={!picked.length}
            className="mt-2 inline-flex items-center gap-1.5 rounded bg-gray-900 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40"
          >
            <Plus className="h-3.5 w-3.5" />
            {picked.length
              ? `Add ${picked.length} to the invoice · ${money(pickedCents)}`
              : 'Add to the invoice'}
          </button>
        </>
      )}

      {/*
        The calls that could not be priced when they closed. They are the ones
        that most need a person, so they are not tucked away under the tidy
        list — and the panel deliberately offers no way to add them, because
        there is no figure to add.
      */}
      {found.needsPricing.length > 0 && (
        <div className="mt-2 rounded border border-amber-300 bg-amber-50 p-2">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-amber-900">
            <AlertTriangle className="h-3.5 w-3.5" />
            {found.needsPricing.length} closed call{found.needsPricing.length === 1 ? '' : 's'} never got priced
          </p>
          <ul className="mt-1 space-y-0.5 pl-5 text-xs text-amber-900">
            {found.needsPricing.map((s) => (
              <li key={s.callId} className="list-disc">
                {s.title}
                {s.closedAt ? ` · ${new Date(s.closedAt).toLocaleDateString('en-US')}` : ''}
              </li>
            ))}
          </ul>
          <p className="mt-1 pl-5 text-[11px] text-amber-800">
            Price them on the call itself, then they appear here.
          </p>
        </div>
      )}

      {found.alreadyInvoiced.length > 0 && (
        <p className="mt-2 flex items-start gap-1.5 text-xs text-gray-500">
          <Check className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            {found.alreadyInvoiced.length} call{found.alreadyInvoiced.length === 1 ? '' : 's'} already
            billed — {found.alreadyInvoiced.map((s) => s.why.replace(/^Already on /, '')).join(', ')}.
          </span>
        </p>
      )}

      {found.nothingToBill.length > 0 && (
        <p className="mt-1 text-xs text-gray-500">
          {found.nothingToBill.length} call{found.nothingToBill.length === 1 ? '' : 's'} on this job
          carried no charge.
        </p>
      )}
    </div>
  );
}
