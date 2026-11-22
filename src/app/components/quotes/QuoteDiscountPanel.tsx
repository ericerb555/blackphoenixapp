/**
 * The discount on one quote: what applies, where it came from, and the one
 * place to add or withdraw it.
 *
 * Eric, 2026-11-21: "can we add a customer discount option on the quote editor
 * that will show on the quote with a toggle show and hide", and then "we
 * should be able to tie is all our dicounts and hours".
 *
 * WHY THIS ADDS NO NEW DISCOUNT FIELD
 *
 * A `quote.discountPercent` would have been half an hour's work and a second
 * source of truth. The machinery already exists and is better than a field:
 *
 *   plan discount    read from the tier the payment actually granted —
 *                    `feature_grant:` → `plan_tier:` — never from the browser
 *   grants           an administrator's own discounts, scoped to a customer,
 *                    a job or ONE QUOTE, each with a required reason
 *   resolveDiscount  adds them up, caps the total at 20% of labour, and says
 *                    which parts made the number
 *
 * So "a customer discount on this quote" is a grant scoped to this quote, and
 * it arrives on the customer's page through the same resolver as everything
 * else. That is what ties them together: one number, one cap, and a list of
 * what it is made of — rather than a plan discount from one place and a typed
 * figure from another, quietly stacking.
 *
 * LABOUR ONLY, because that is the standing rule: "the discount only comes
 * off labor, not materials." The money shown here is computed with the same
 * `labourDiscountAmount` the customer's page uses, against the same labour
 * subtotal, so the two cannot disagree.
 */
import { useCallback, useEffect, useState } from 'react';
import { Percent, Plus, Loader2, Trash2, Eye, EyeOff, AlertTriangle, Info } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../../lib/supabase';
import { API_BASE_URL } from '../../lib/apiConfig';
import {
  labourDiscountAmount, QUOTE_DISCOUNT_CAP_PERCENT,
} from '../../../../supabase/functions/server/discounts.ts';

const SERVER = `${API_BASE_URL}/make-server-3eae23a6`;

interface Component { source: string; percent: number; why: string }
interface Grant {
  id: string; percent: number; reason: string;
  grantedBy?: string; grantedAt?: string; revokedAt?: string;
  live?: boolean; expiresAt?: string;
}

interface Props {
  quoteId: string;
  customerEmail: string;
  jobId?: string;
  /** Labour AT THE CUSTOMER'S PRICE — the figure the percentage divides into. */
  labourShown: number;
  /** The contract total before any discount. */
  total: number;
  /** Whether the saving is itemised on the customer's copy. */
  itemised: boolean;
  onToggleItemised: () => void;
  togglePending?: boolean;
}

export default function QuoteDiscountPanel({
  quoteId, customerEmail, jobId, labourShown, total, itemised, onToggleItemised, togglePending,
}: Props) {
  const [resolved, setResolved] = useState<{ percent: number; capped: boolean; requestedPercent: number; components: Component[] } | null>(null);
  const [grants, setGrants] = useState<Grant[]>([]);
  const [loading, setLoading] = useState(true);
  const [percent, setPercent] = useState('');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  const headers = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) throw new Error('Sign in again to change a discount.');
    return { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' };
  }, []);

  /**
   * Both halves, together, because they answer different questions: what the
   * customer ends up with, and which grants on THIS quote produced part of it.
   * A grants list alone would omit the plan; a resolved percent alone would
   * give nothing to revoke.
   */
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const h = await headers();
      const url = new URL(`${SERVER}/my-discount`);
      if (customerEmail) url.searchParams.set('email', customerEmail);
      url.searchParams.set('context', 'quote');
      url.searchParams.set('quoteId', quoteId);
      if (jobId) url.searchParams.set('jobId', jobId);

      const [mine, list] = await Promise.all([
        fetch(url.toString(), { headers: h }),
        fetch(`${SERVER}/discount-grants?scope=quote&scopeId=${encodeURIComponent(quoteId)}`, { headers: h }),
      ]);
      const mineBody = await mine.json().catch(() => ({}));
      const listBody = await list.json().catch(() => ({}));
      if (mine.ok && mineBody?.success) {
        setResolved({
          percent: Number(mineBody.percent) || 0,
          capped: Boolean(mineBody.capped),
          requestedPercent: Number(mineBody.requestedPercent) || 0,
          components: Array.isArray(mineBody.components) ? mineBody.components : [],
        });
      }
      if (list.ok && listBody?.success) setGrants(Array.isArray(listBody.grants) ? listBody.grants : []);
    } catch (error: any) {
      // Said, not swallowed. A panel that silently shows 0% is indistinguishable
      // from a customer who has no discount, and those are different facts.
      toast.error(error?.message || 'Could not read the discount for this quote.');
    } finally {
      setLoading(false);
    }
  }, [headers, customerEmail, quoteId, jobId]);

  useEffect(() => { void load(); }, [load]);

  const addGrant = async () => {
    const pct = Number(percent);
    if (!Number.isFinite(pct) || pct <= 0) { toast.error('A discount is a percentage above zero.'); return; }
    if (!reason.trim()) { toast.error('Say why this discount is being given — it is the only thing that explains it later.'); return; }
    setSaving(true);
    try {
      const res = await fetch(`${SERVER}/discount-grants`, {
        method: 'POST',
        headers: await headers(),
        body: JSON.stringify({ scope: 'quote', scopeId: quoteId, percent: pct, reason: reason.trim() }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || body?.success === false) throw new Error(body?.error || 'Could not add that discount.');
      setPercent('');
      setReason('');
      await load();
      toast.success(`${pct}% off labour on this quote.`);
    } catch (error: any) {
      toast.error(error?.message || 'Could not add that discount.');
    } finally { setSaving(false); }
  };

  const revoke = async (grant: Grant) => {
    setSaving(true);
    try {
      const res = await fetch(`${SERVER}/discount-grants/${encodeURIComponent(grant.id)}`, {
        method: 'DELETE', headers: await headers(),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || body?.success === false) throw new Error(body?.error || 'Could not withdraw that discount.');
      await load();
      toast.success('Discount withdrawn. The record of it stays.');
    } catch (error: any) {
      toast.error(error?.message || 'Could not withdraw that discount.');
    } finally { setSaving(false); }
  };

  const pct = resolved?.percent || 0;
  const amount = labourDiscountAmount(labourShown, pct);
  const net = Math.max(0, (Number(total) || 0) - amount);
  const money = (n: number) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div className="rounded-xl border border-[#2A2A2A] bg-[#111] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-bold text-white">
            <Percent className="h-4 w-4 text-emerald-400" /> Customer discount
          </h3>
          <p className="mt-0.5 text-xs text-gray-500">
            Off labour only, capped at {QUOTE_DISCOUNT_CAP_PERCENT}% however many sources agree.
          </p>
        </div>
        {/*
          The toggle Eric asked for. It governs the ROW, never the price — a
          quote that charged the discounted total while printing the list one
          would not add up.
        */}
        <button
          type="button"
          onClick={onToggleItemised}
          disabled={togglePending}
          className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-bold transition disabled:opacity-60 ${
            itemised
              ? 'border-blue-500/50 bg-blue-500/10 text-blue-300'
              : 'border-amber-500/50 bg-amber-500/10 text-amber-300'
          }`}
          title={itemised
            ? 'The saving is itemised on the customer’s quote'
            : 'The discount still comes off the price — the customer just does not see the line'}
        >
          {itemised ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
          {itemised ? 'Shown on the quote' : 'Applied, not shown'}
        </button>
      </div>

      {loading ? (
        <p className="mt-4 flex items-center gap-2 text-xs text-gray-500">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Reading what applies…
        </p>
      ) : (
        <>
          <div className="mt-4 rounded-lg border border-[#2A2A2A] bg-[#0A0A0A] p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400">Applies to this quote</span>
              <span className="text-lg font-bold text-emerald-400">{pct}%</span>
            </div>
            {pct > 0 && (
              <div className="mt-2 space-y-1 text-xs">
                <div className="flex justify-between text-gray-400">
                  <span>Off labour of {money(Number(labourShown) || 0)}</span>
                  <span className="text-emerald-400">−{money(amount)}</span>
                </div>
                <div className="flex justify-between font-semibold text-white">
                  <span>The customer pays</span>
                  <span>{money(net)}</span>
                </div>
              </div>
            )}
            {/*
              WHERE IT CAME FROM. The plan and each grant, as the server
              describes them — this panel has no plan catalogue to look names
              up in, and inventing one is how two screens come to disagree.
            */}
            {!!resolved?.components?.length && (
              <ul className="mt-2 space-y-1 border-t border-[#2A2A2A] pt-2">
                {resolved.components.map((c, i) => (
                  <li key={i} className="flex items-start justify-between gap-3 text-xs text-gray-400">
                    <span>
                      <span className={`mr-1.5 rounded px-1 py-0.5 text-[10px] font-bold uppercase ${
                        c.source === 'plan' ? 'bg-purple-500/15 text-purple-300' : 'bg-emerald-500/15 text-emerald-300'
                      }`}>
                        {c.source}
                      </span>
                      {c.why}
                    </span>
                    <span className="shrink-0 tabular-nums">{c.percent}%</span>
                  </li>
                ))}
              </ul>
            )}
            {resolved?.capped && (
              <p className="mt-2 flex items-start gap-1.5 text-xs text-amber-400">
                <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
                These add up to {resolved.requestedPercent}%, capped at {QUOTE_DISCOUNT_CAP_PERCENT}%.
              </p>
            )}
            {pct === 0 && (
              <p className="mt-2 flex items-start gap-1.5 text-xs text-gray-500">
                <Info className="mt-0.5 h-3 w-3 shrink-0" />
                Nothing applies to this quote — no plan discount and no grant.
              </p>
            )}
          </div>

          {/* The grants on THIS quote, which are the ones that can be withdrawn here. */}
          {grants.filter((g) => g.live).length > 0 && (
            <div className="mt-3 space-y-1.5">
              {grants.filter((g) => g.live).map((g) => (
                <div key={g.id} className="flex items-start justify-between gap-3 rounded-lg border border-[#2A2A2A] bg-[#0A0A0A] px-3 py-2">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-white">{g.percent}% — {g.reason}</p>
                    <p className="text-[11px] text-gray-500">
                      {g.grantedBy ? `by ${g.grantedBy}` : ''}
                      {g.grantedAt ? ` · ${String(g.grantedAt).slice(0, 10)}` : ''}
                      {!g.expiresAt ? ' · no end date' : ` · until ${String(g.expiresAt).slice(0, 10)}`}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void revoke(g)}
                    disabled={saving}
                    title="Withdraw this discount. The record of it stays."
                    className="shrink-0 rounded border border-red-500/40 p-1 text-red-400 transition hover:bg-red-500/10 disabled:opacity-40"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/*
            A reason is required by the route, and that is deliberate friction:
            15% for a good reason and 15% by mistake look identical in a number
            and different in a record.
          */}
          <div className="mt-3 flex flex-wrap items-end gap-2">
            <div>
              <label className="block text-[11px] font-semibold text-gray-400">Discount</label>
              <div className="mt-0.5 flex items-center gap-1">
                <input
                  type="number" min={0} max={100} step="0.5"
                  value={percent}
                  onChange={(e) => setPercent(e.target.value)}
                  placeholder="5"
                  className="w-20 rounded border border-gray-700 bg-black px-2 py-1 text-right text-sm text-white focus:border-emerald-500/50 focus:outline-none"
                />
                <span className="text-sm text-gray-500">%</span>
              </div>
            </div>
            <div className="min-w-[12rem] flex-1">
              <label className="block text-[11px] font-semibold text-gray-400">Why</label>
              <input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Repeat customer, two jobs this year"
                className="mt-0.5 w-full rounded border border-gray-700 bg-black px-2 py-1 text-sm text-white focus:border-emerald-500/50 focus:outline-none"
              />
            </div>
            <button
              type="button"
              onClick={() => void addGrant()}
              disabled={saving}
              className="flex items-center gap-1.5 rounded-lg border border-emerald-500/50 bg-emerald-500/10 px-3 py-1.5 text-xs font-bold text-emerald-300 transition hover:bg-emerald-500/20 disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
              Add
            </button>
          </div>
        </>
      )}
    </div>
  );
}
