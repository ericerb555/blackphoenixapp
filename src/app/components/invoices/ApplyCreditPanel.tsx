/**
 * ApplyCreditPanel — settling part of a bill with what you already hold.
 *
 * WHAT IT IS FOR
 *
 * A gift card and banked plan hours are money and time the customer has already
 * paid for. This is where they spend them against an invoice: their own cards
 * and hours are listed, and a code box takes a card somebody gave them.
 *
 * WHAT IT DELIBERATELY DOES NOT DO
 *
 * Decide amounts. It names what to apply; the server works out how much, from
 * the lesser of what is held and what is owed. Sending an amount from here
 * would be the browser deciding how much of its own credit to spend, and the
 * list it shows was itself resolved by the server for the same reason — a
 * browser knows neither what is left on a card nor what hours have been used.
 *
 * It also does not touch the total. These reduce the balance, and the invoice
 * keeps saying what it said when it was sent.
 *
 * A NOTE ON THE CODE BOX
 *
 * A card code is a bearer instrument: whoever holds it can spend it. So a wrong
 * code is refused with one message whether it does not exist or is spent —
 * anything more specific would let somebody find valid codes by trying.
 */
import { useCallback, useEffect, useState } from 'react';
import { Gift, Clock, Loader2, Check, AlertCircle } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { projectId } from '../../utils/supabase/info';
import { supabase } from '../../lib/supabase';

const SERVER = `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6`;

interface Attachable {
  kind: 'grant' | 'promotion' | 'giftcard' | 'hours' | 'addon';
  id: string;
  label: string;
  detail: string;
  amount?: number;
  hours?: number;
  reduces: 'total' | 'balance';
}

interface Props {
  invoiceId: string;
  /** Called after something is applied, so the caller can reload the invoice. */
  onApplied?: () => void;
}

export default function ApplyCreditPanel({ invoiceId, onApplied }: Props) {
  const [items, setItems] = useState<Attachable[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [code, setCode] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) { setItems([]); return; }
      const res = await fetch(`${SERVER}/invoice-attachables`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) { setItems([]); return; }
      const body = await res.json();
      /**
       * Only the things that settle a balance are shown here. A discount
       * changes the price and is the company's to give, so offering one to the
       * person paying would be offering them somebody else's decision.
       */
      const usable: Attachable[] = (body?.attachables || []).filter(
        (a: Attachable) => a.reduces === 'balance',
      );
      setItems(usable);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  /** Apply one thing. What it is worth is the server's answer, not ours. */
  const apply = async (payload: Record<string, unknown>, key: string) => {
    setBusy(key);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Sign in again to apply this.');
      const res = await fetch(`${SERVER}/invoices/${encodeURIComponent(invoiceId)}/apply`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok || body?.success === false) throw new Error(body?.error || 'That could not be applied.');

      if (body?.duplicate) {
        toast.info('That had already been applied to this invoice.');
      } else {
        const applied = Number(body?.applied || 0);
        toast.success(
          body?.hoursUsed
            ? `${body.hoursUsed} hour${body.hoursUsed === 1 ? '' : 's'} applied — $${applied.toFixed(2)} off`
            : `$${applied.toFixed(2)} applied`,
        );
      }
      setCode('');
      await load();
      onApplied?.();
    } catch (error: any) {
      toast.error(error?.message || 'That could not be applied.');
    } finally {
      setBusy(null);
    }
  };

  const hasSomething = items.length > 0;

  return (
    <div className="rounded-xl border border-[#2A2A2A] bg-[#111] p-4">
      <p className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-gray-400">
        Use a gift card or your hours
      </p>

      {loading ? (
        <p className="flex items-center gap-2 text-sm text-gray-500">
          <Loader2 className="h-4 w-4 animate-spin" /> Checking what you have…
        </p>
      ) : (
        <>
          {hasSomething && (
            <ul className="mb-3 space-y-2">
              {items.map((item) => {
                const key = `${item.kind}:${item.id}`;
                const payload = item.kind === 'hours'
                  ? { planId: item.id }
                  : { giftCardCode: item.id };
                return (
                  <li
                    key={key}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#2A2A2A] bg-black/30 px-3 py-2.5"
                  >
                    <span className="flex min-w-0 items-center gap-2.5">
                      {item.kind === 'hours'
                        ? <Clock className="h-4 w-4 shrink-0 text-cyan-400" />
                        : <Gift className="h-4 w-4 shrink-0 text-emerald-400" />}
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold text-white">{item.label}</span>
                        <span className="block truncate text-xs text-gray-500">{item.detail}</span>
                      </span>
                    </span>
                    <button
                      type="button"
                      onClick={() => apply(payload, key)}
                      disabled={busy === key}
                      className="inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-emerald-500 disabled:opacity-50"
                    >
                      {busy === key ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                      Apply
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          {/* A card somebody was given, which will not be in the list above. */}
          <div className="flex flex-wrap items-center gap-2">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Gift card code"
              className="min-w-0 flex-1 rounded-lg border border-[#2A2A2A] bg-[#1A1A1A] px-3 py-2 text-sm text-white outline-none focus:border-emerald-500"
            />
            <button
              type="button"
              onClick={() => apply({ giftCardCode: code.trim() }, 'code')}
              disabled={!code.trim() || busy === 'code'}
              className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-emerald-500/40 px-3 py-2 text-xs font-bold text-emerald-300 transition hover:bg-emerald-500/10 disabled:opacity-40"
            >
              {busy === 'code' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              Apply code
            </button>
          </div>

          {!hasSomething && (
            <p className="mt-2 flex items-start gap-1.5 text-xs leading-5 text-gray-500">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              You have no gift cards or spare plan hours on this account. A code you were
              given still works in the box above.
            </p>
          )}
        </>
      )}
    </div>
  );
}
