/**
 * AttachablesSearchPanel — everything that can go on this invoice, in one list.
 *
 * WHY IT EXISTS
 *
 * Five things can reduce what somebody pays — a granted discount, a promotion,
 * a gift card, banked plan hours, a plan add-on — and until now each lived in
 * its own corner of the system with no way to see them together. Whoever wrote
 * the invoice had to remember what a customer was owed. This lists what the
 * server says they actually hold, searchably, and lets more than one be put on.
 *
 * THE DISTINCTION THIS PANEL INSISTS ON
 *
 * A DISCOUNT changes the TOTAL. It is the company's to give, it is decided
 * while the invoice is being written, and it goes into the discount figure.
 *
 * A GIFT CARD or BANKED HOURS change the BALANCE. They are the customer paying
 * with something already bought, so they cannot be "applied" to a draft: there
 * is nothing yet to pay. They are shown on a draft so whoever is writing it
 * knows what is coming, and they become pressable once the invoice is issued.
 *
 * Collapsing that distinction — letting a gift card reduce the total — would
 * mean an invoice that says a smaller number than the work cost, and money that
 * left a card with nothing on paper explaining where it went.
 *
 * WHAT IT DOES NOT DECIDE
 *
 * How much a credit is worth. It names what to apply and the server works out
 * the amount from the lesser of what is held and what is owed. The list itself
 * is the server's answer too — a browser knows neither what an administrator
 * granted nor what is left on a card.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Search, Gift, Clock, Percent, Loader2, Check, Plus } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { projectId as supabaseProjectId } from '../../utils/supabase/info';
import { supabase } from '../../lib/supabase';

const SERVER = `https://${supabaseProjectId}.supabase.co/functions/v1/make-server-3eae23a6`;

export interface Attachable {
  kind: 'grant' | 'promotion' | 'giftcard' | 'hours' | 'addon';
  id: string;
  label: string;
  detail: string;
  percent?: number;
  amount?: number;
  hours?: number;
  reduces: 'total' | 'balance';
}

interface Props {
  /** Who the invoice is addressed to. Nothing loads without one. */
  email: string;
  jobId?: string;
  /** The lines added up, so a percentage can be shown as money. */
  subtotal: number;
  /** The saved invoice, where there is one. Credits need something to pay. */
  invoiceId?: string;
  /** False while the invoice is still a draft. */
  issued?: boolean;
  /** A percentage the writer chose to put on. Positive to add, negative to take off. */
  onPercentChange: (percentDelta: number) => void;
  /** Something was settled on the server, so the caller should re-read. */
  onApplied?: () => void;
}

const money = (n: number) => `$${(Math.round(n * 100) / 100).toFixed(2)}`;

export default function AttachablesSearchPanel({
  email, jobId, subtotal, invoiceId, issued, onPercentChange, onApplied,
}: Props) {
  const [items, setItems] = useState<Attachable[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  /** Percentage items the writer has put on, so pressing twice does not double it. */
  const [added, setAdded] = useState<Record<string, number>>({});

  const load = useCallback(async () => {
    const who = String(email || '').trim().toLowerCase();
    if (!who) { setItems([]); return; }
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) { setItems([]); return; }
      const url = new URL(`${SERVER}/invoice-attachables`);
      url.searchParams.set('email', who);
      if (jobId) url.searchParams.set('jobId', String(jobId));
      const res = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) { setItems([]); return; }
      const body = await res.json();
      setItems(Array.isArray(body?.attachables) ? body.attachables : []);
    } catch {
      /* An invoice can still be written without knowing what is on offer. */
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [email, jobId]);

  useEffect(() => { void load(); }, [load]);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((i) =>
      `${i.label} ${i.detail} ${i.kind}`.toLowerCase().includes(q));
  }, [items, query]);

  const discounts = matches.filter((i) => i.reduces === 'total');
  const credits = matches.filter((i) => i.reduces === 'balance');

  /** Put a percentage on, or take it back off. The caller owns the figure. */
  const togglePercent = (item: Attachable) => {
    const key = `${item.kind}:${item.id}`;
    const percent = Number(item.percent) || 0;
    if (percent <= 0) return;
    if (added[key]) {
      onPercentChange(-added[key]);
      setAdded((prev) => { const next = { ...prev }; delete next[key]; return next; });
    } else {
      onPercentChange(percent);
      setAdded((prev) => ({ ...prev, [key]: percent }));
    }
  };

  /** Spend a card or some hours against the saved invoice. */
  const applyCredit = async (item: Attachable) => {
    if (!invoiceId) return;
    const key = `${item.kind}:${item.id}`;
    setBusy(key);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Sign in again to apply this.');
      const res = await fetch(`${SERVER}/invoices/${encodeURIComponent(invoiceId)}/apply`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(item.kind === 'hours' ? { planId: item.id } : { giftCardCode: item.id }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok || body?.success === false) throw new Error(body?.error || 'That could not be applied.');
      toast.success(body?.duplicate
        ? 'That had already been applied to this invoice.'
        : `${money(Number(body?.applied || 0))} applied`);
      await load();
      onApplied?.();
    } catch (error: any) {
      toast.error(error?.message || 'That could not be applied.');
    } finally {
      setBusy(null);
    }
  };

  if (!String(email || '').trim()) return null;

  return (
    <div className="rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] p-3">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-gray-400">
          What can go on this invoice
        </p>
        {loading && <Loader2 className="h-3.5 w-3.5 animate-spin text-gray-500" />}
      </div>

      <div className="relative mb-3">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search discounts, gift cards, hours…"
          className="w-full rounded-lg border border-[#2A2A2A] bg-[#1A1A1A] py-2 pl-9 pr-3 text-sm text-white outline-none focus:border-orange-500"
        />
      </div>

      {!loading && items.length === 0 && (
        <p className="text-xs leading-5 text-gray-500">
          This customer has no grants, gift cards or spare plan hours on record.
        </p>
      )}

      {discounts.length > 0 && (
        <>
          <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-emerald-400/80">
            Comes off the total
          </p>
          <ul className="mb-3 space-y-1.5">
            {discounts.map((item) => {
              const key = `${item.kind}:${item.id}`;
              const on = Boolean(added[key]);
              const worth = subtotal * ((Number(item.percent) || 0) / 100);
              return (
                <li key={key} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[#2A2A2A] bg-black/30 px-3 py-2">
                  <span className="flex min-w-0 items-center gap-2">
                    <Percent className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-white">{item.label}</span>
                      <span className="block truncate text-[11px] text-gray-500">
                        {item.detail}{subtotal > 0 ? ` — ${money(worth)} on these lines` : ''}
                      </span>
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={() => togglePercent(item)}
                    className={`inline-flex min-h-8 shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                      on
                        ? 'bg-emerald-600 text-white hover:bg-emerald-500'
                        : 'border border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/10'
                    }`}
                  >
                    {on ? <Check className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                    {on ? 'On' : 'Add'}
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      )}

      {credits.length > 0 && (
        <>
          <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-cyan-400/80">
            Comes off the balance
          </p>
          <ul className="space-y-1.5">
            {credits.map((item) => {
              const key = `${item.kind}:${item.id}`;
              const ready = Boolean(invoiceId && issued);
              return (
                <li key={key} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[#2A2A2A] bg-black/30 px-3 py-2">
                  <span className="flex min-w-0 items-center gap-2">
                    {item.kind === 'hours'
                      ? <Clock className="h-3.5 w-3.5 shrink-0 text-cyan-400" />
                      : <Gift className="h-3.5 w-3.5 shrink-0 text-cyan-400" />}
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-white">{item.label}</span>
                      <span className="block truncate text-[11px] text-gray-500">{item.detail}</span>
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={() => applyCredit(item)}
                    disabled={!ready || busy === key}
                    title={ready ? undefined : 'Issue the invoice first — there is nothing to pay yet.'}
                    className="inline-flex min-h-8 shrink-0 items-center gap-1.5 rounded-lg border border-cyan-500/40 px-3 py-1.5 text-xs font-bold text-cyan-300 transition hover:bg-cyan-500/10 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {busy === key ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                    Apply
                  </button>
                </li>
              );
            })}
          </ul>
          {!(invoiceId && issued) && (
            <p className="mt-2 text-[11px] leading-4 text-gray-500">
              These settle a balance rather than changing the price, so they can be
              applied once this invoice has been issued.
            </p>
          )}
        </>
      )}
    </div>
  );
}
