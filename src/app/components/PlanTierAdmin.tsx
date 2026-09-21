/**
 * The published plan tiers, and the one button that makes them sellable.
 *
 * WHY THIS EXISTS RATHER THAN A DOCUMENTED CURL COMMAND
 *
 * Creating the Stripe price needs an administrator's token. Getting one to a
 * terminal means either typing a password into a shell — which then lives in
 * the history — or copying a JWT out of devtools. Both work and both are worse
 * than a button on a page where the administrator is already signed in: the
 * browser already holds the token, so nothing has to be moved anywhere.
 *
 * WHY IT SHOWS `purchasable` SO PROMINENTLY
 *
 * Because it is the only thing that matters and it is invisible everywhere
 * else. A tier can look completely finished — name, price, feature list — and
 * still be unbuyable, because a price in this app and a Price in Stripe are
 * different objects and only the second one can take money. A vendor clicking
 * a plan that cannot be bought is the failure this panel exists to prevent.
 *
 * WHAT IT WILL NOT DO
 *
 * Create a second price for a tier that already has one. Stripe prices are
 * immutable, so changing an amount means a new price and the old one left
 * behind for existing subscribers. The server refuses by default and this
 * surfaces that refusal rather than papering over it with a retry.
 */
import { useCallback, useEffect, useState } from 'react';
import { Loader2, CheckCircle2, AlertTriangle, CreditCard, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../lib/supabase';
import { projectId } from '../utils/supabase/info';

const SERVER = `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6`;

const AUDIENCES = [
  'vendor', 'subcontractor', 'advertiser', 'customer',
  'content', 'property_manager', 'landlord', 'condo_association',
];

interface Tier {
  id: string;
  name: string;
  blurb?: string;
  features: string[];
  limits?: Record<string, number>;
  priceCents?: number;
  interval?: 'month' | 'year';
  purchasable: boolean;
  active?: boolean;
}

function money(cents?: number, interval?: string) {
  if (!Number.isFinite(Number(cents)) || Number(cents) <= 0) return 'no price';
  const amount = (Number(cents) / 100).toLocaleString(undefined, {
    style: 'currency', currency: 'USD', minimumFractionDigits: 0,
  });
  return interval ? `${amount}/${interval}` : amount;
}

export default function PlanTierAdmin() {
  const [audience, setAudience] = useState('vendor');
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState<string | null>(null);
  /**
   * Test unless deliberately switched.
   *
   * The cost of creating a test price by accident is one more click. The cost
   * of creating a live one by accident is a plan a vendor can buy for real
   * money before it has been rehearsed even once, so the default leans the way
   * that is cheap to undo.
   */
  const [mode, setMode] = useState<'test' | 'live'>('test');
  const [note, setNote] = useState<string | null>(null);

  const headers = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session?.access_token || ''}`,
    };
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${SERVER}/plan-tiers?audience=${encodeURIComponent(audience)}`, {
        headers: await headers(),
      });
      const json = await res.json().catch(() => ({}));
      setTiers(Array.isArray(json?.tiers) ? json.tiers : []);
      setNote(json?.note || null);
    } catch {
      setTiers([]);
      setNote('Could not load the plans.');
    } finally {
      setLoading(false);
    }
  }, [audience]);

  useEffect(() => { void load(); }, [load]);

  /** Create the Stripe product and recurring price for one tier. */
  const createPrice = async (tierId: string, replace = false) => {
    setWorking(tierId);
    try {
      const res = await fetch(
        `${SERVER}/plan-tiers/${encodeURIComponent(audience)}/${encodeURIComponent(tierId)}/stripe-price?mode=${mode}${replace ? '&replace=1' : ''}`,
        { method: 'POST', headers: await headers() },
      );
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        // 409 means it already has one. Surfaced as a question rather than an
        // error, because replacing is a real and deliberate thing to want.
        if (res.status === 409) {
          toast.error(json?.error || 'That plan already has a price.', { duration: 8000 });
        } else {
          toast.error(json?.error || `Could not create the price (${res.status}).`);
        }
        return;
      }
      toast.success(
        `${json.stripePriceId} created — ${money(json.amountCents, json.interval)}. ${json.note || ''}`,
        { duration: 9000 },
      );
      await load();
    } catch (e: any) {
      toast.error(e?.message || 'Could not reach Stripe.');
    } finally {
      setWorking(null);
    }
  };

  const sellable = tiers.filter(t => t.purchasable).length;

  return (
    <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 text-lg font-bold text-white">
            <CreditCard className="h-5 w-5 text-orange-400" /> Portal plans
          </h3>
          <p className="mt-1 text-xs text-gray-500">
            A plan can only be bought once it has a price in Stripe. Until then it is
            listed and refused.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* The mode is shown, not implied. Which Stripe account a price lands
              on is the one thing that cannot be undone by editing afterwards,
              and it is invisible in the price id itself. */}
          <div className="flex overflow-hidden rounded-lg border border-[#2A2A2A]">
            {(['test', 'live'] as const).map(m => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`px-3 py-2 text-xs font-bold uppercase tracking-wide transition ${
                  mode === m
                    ? m === 'live'
                      ? 'bg-red-600 text-white'
                      : 'bg-emerald-600 text-white'
                    : 'bg-[#0A0A0A] text-gray-500 hover:text-gray-300'
                }`}
                title={m === 'live'
                  ? 'Creates a price on the real Stripe account. Vendors can buy it for real money.'
                  : 'Creates a price in Stripe test mode. Nothing real is charged.'}
              >
                {m}
              </button>
            ))}
          </div>
          <select
            value={audience}
            onChange={e => setAudience(e.target.value)}
            className="rounded-lg border border-[#2A2A2A] bg-[#0A0A0A] px-3 py-2 text-sm text-white focus:border-orange-500 focus:outline-none"
          >
            {AUDIENCES.map(a => <option key={a} value={a}>{a.replace(/_/g, ' ')}</option>)}
          </select>
          <button
            onClick={() => void load()}
            className="rounded-lg border border-[#2A2A2A] p-2 text-gray-400 transition hover:text-white"
            title="Reload"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {loading ? (
        <p className="flex items-center gap-2 text-sm text-gray-400">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading plans…
        </p>
      ) : tiers.length === 0 ? (
        <p className="rounded-lg border border-[#2A2A2A] bg-[#0A0A0A] p-4 text-sm text-gray-400">
          {note || 'No plans published for this portal yet.'}
        </p>
      ) : (
        <>
          <p className="mb-3 text-xs text-gray-500">
            {sellable} of {tiers.length} can currently be bought.
            {mode === 'live' && (
              <span className="ml-2 font-semibold text-red-400">
                LIVE mode — a price created now can be bought for real money.
              </span>
            )}
          </p>
          <div className="space-y-2">
            {tiers.map(t => (
              <div key={t.id} className="rounded-xl border border-[#2A2A2A] bg-[#0A0A0A] p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 font-semibold text-white">
                      {t.name}
                      <span className="text-sm font-normal text-orange-400">
                        {money(t.priceCents, t.interval)}
                      </span>
                      {t.active === false && (
                        <span className="rounded bg-gray-700 px-1.5 py-0.5 text-[10px] font-bold text-gray-300">
                          WITHDRAWN
                        </span>
                      )}
                    </p>
                    {t.blurb && <p className="mt-0.5 text-xs text-gray-500">{t.blurb}</p>}
                    {t.features.length > 0 && (
                      <ul className="mt-1.5 space-y-0.5 text-xs text-gray-400">
                        {t.features.map((f, i) => <li key={i}>· {f}</li>)}
                      </ul>
                    )}
                  </div>

                  <div className="shrink-0 text-right">
                    {t.purchasable ? (
                      <p className="inline-flex items-center gap-1.5 rounded-lg border border-green-500/20 bg-green-500/10 px-2.5 py-1.5 text-xs font-bold text-green-400">
                        <CheckCircle2 className="h-3.5 w-3.5" /> On sale
                      </p>
                    ) : (
                      <>
                        <p className="mb-2 inline-flex items-center gap-1.5 rounded-lg border border-amber-500/20 bg-amber-500/10 px-2.5 py-1.5 text-xs font-bold text-amber-400">
                          <AlertTriangle className="h-3.5 w-3.5" /> Not on sale
                        </p>
                        <button
                          onClick={() => createPrice(t.id)}
                          disabled={working !== null || !Number(t.priceCents)}
                          className="block w-full rounded-lg bg-orange-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-orange-500 disabled:opacity-50"
                        >
                          {working === t.id
                            ? <span className="inline-flex items-center gap-1.5"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Creating…</span>
                            : `Create ${mode} price`}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-3 text-[11px] text-gray-600">
            Creating a price uses the Stripe key already stored in the edge function
            secrets, on the Black Phoenix Builds account. The reply says whether it
            landed on the live account or in test mode. Stripe prices cannot be edited
            afterwards — changing an amount creates a new one and leaves the old for
            anybody already subscribed.
          </p>
        </>
      )}
    </div>
  );
}
