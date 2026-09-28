/**
 * What you pay, and what you could add to it.
 *
 * WHY THIS EXISTS
 *
 * Eric's sentence, when he stopped the Stripe work to settle the shape:
 *
 *   "there will be add on in the portals that can increase the monthly
 *    subscriptions depending on what the user wants."
 *
 * Everything needed to honour that was already built and tested on the server
 * — `subscriptionTotalCents`, `addOnsForTier`, a checkout that validates
 * against the catalogue, and a route that adds one extra to a live
 * subscription. None of it had a caller. So a subscriber could not see their
 * monthly figure, could not see what was available to them, and could not add
 * anything. This is the missing screen, and only the screen: no pricing
 * decision is made here.
 *
 * EVERY NUMBER COMES FROM THE SERVER
 *
 * The figures are read from `/my-plan`, which computes them from records the
 * server owns. The one number computed in this file is the PREVIEW of a new
 * total while boxes are being ticked, and it is display only — `/plan-add-on`
 * recomputes from the catalogue when the button is actually pressed, because a
 * total that arrived from a browser is a number the customer can edit.
 *
 * IT FAILS CLOSED
 *
 * Anything that cannot be read leaves the panel showing nothing purchasable
 * rather than a guessed price or an enabled button. A subscriber seeing no
 * extras is a worse screen than one who is charged for something the panel
 * mispriced.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, Plus, Check, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { projectId } from '../../utils/supabase/info';
import { supabase } from '../../lib/supabase';

const API = `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6`;

interface AvailableAddOn {
  id: string;
  name: string;
  blurb?: string;
  features?: string[];
  priceCents?: number;
  interval?: string;
  included: boolean;
  purchasable: boolean;
  perUnit?: boolean;
}

interface MyPlan {
  entitlement?: { source?: string; level?: string; endsAt?: string | null };
  tier?: { id?: string; name?: string } | null;
  addOns?: string[];
  available?: AvailableAddOn[];
  monthlyTotalCents?: number | null;
  totalBasis?: 'subscription' | 'trial' | 'free';
}

const money = (cents: number | null | undefined): string =>
  typeof cents === 'number' && Number.isFinite(cents)
    ? `$${(cents / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : '—';

export default function SubscriptionAddOnsPanel() {
  const [plan, setPlan] = useState<MyPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [ticked, setTicked] = useState<string[]>([]);
  const [buying, setBuying] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error('not signed in');
      const res = await fetch(`${API}/my-plan`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error(`my-plan ${res.status}`);
      setPlan(await res.json());
      setFailed(false);
    } catch (error) {
      // Fails closed: no catalogue, no buttons, and the panel says so.
      console.warn('[SubscriptionAddOns] Could not read the plan:', error);
      setPlan(null);
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const held = plan?.addOns || [];
  const available = plan?.available || [];
  const extras = available.filter((a) => !a.included && !held.includes(a.id));

  /**
   * The preview figure, for display while boxes are being ticked.
   *
   * Per-unit extras are deliberately left OUT of the arithmetic: their price
   * is per unit covered and the count comes from the platform's own records,
   * so adding one price would state a total that is wrong for every account
   * with more than one unit. They are shown, priced per unit, and called out.
   */
  const previewCents = useMemo(() => {
    if (typeof plan?.monthlyTotalCents !== 'number') return null;
    const chosen = extras.filter((a) => ticked.includes(a.id) && !a.perUnit);
    return chosen.reduce((sum, a) => sum + Math.max(0, Number(a.priceCents || 0)), plan.monthlyTotalCents);
  }, [plan?.monthlyTotalCents, extras, ticked]);

  const addOne = async (addOn: AvailableAddOn) => {
    setBuying(addOn.id);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error('Sign in to change your subscription.');
      const res = await fetch(`${API}/plan-add-on`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ addOnId: addOn.id }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error || 'That could not be added.');
      toast.success(`${addOn.name} added to your subscription.`);
      setTicked([]);
      await load();
    } catch (error: any) {
      toast.error(error?.message || 'That could not be added.');
    } finally {
      setBuying(null);
    }
  };

  if (loading) {
    return (
      <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-6">
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <Loader2 className="h-4 w-4 animate-spin" /> Reading your subscription…
        </div>
      </div>
    );
  }

  if (failed) {
    return (
      <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-6">
        <h3 className="font-bold text-white">Add-ons</h3>
        <p className="mt-2 flex items-start gap-2 text-sm text-amber-300">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            We could not read your subscription just now, so nothing is shown rather
            than a figure we are not sure of. Refresh, or contact us if it persists.
          </span>
        </p>
      </div>
    );
  }

  const basis = plan?.totalBasis || 'free';

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h3 className="font-bold text-white">What you are billed</h3>
            <p className="mt-1 text-sm text-gray-400">
              {basis === 'subscription' && 'Your plan plus the extras you have added.'}
              {basis === 'trial'
                && 'Nothing is being charged during your trial — every extra is included until it ends.'}
              {basis === 'free' && 'You are on the free plan. Nothing is being charged.'}
            </p>
          </div>
          <div className="text-right">
            {/*
              A trialist is shown no figure rather than "$0.00". They owe
              nothing today, and their real monthly figure depends on the tier
              they convert to, which they have not chosen yet — so a zero here
              would teach them the wrong number for the day the clock stops.
            */}
            <p className="text-3xl font-bold tabular-nums text-white">
              {basis === 'subscription' ? money(plan?.monthlyTotalCents) : '—'}
            </p>
            <p className="text-sm text-gray-400">
              {basis === 'subscription' ? 'per month' : 'no monthly charge yet'}
            </p>
          </div>
        </div>

        {previewCents !== null && previewCents !== plan?.monthlyTotalCents && (
          <p className="mt-4 rounded-lg border border-orange-500/30 bg-orange-500/5 px-4 py-3 text-sm text-orange-200">
            With what you have ticked, your monthly total would be{' '}
            <strong className="tabular-nums">{money(previewCents)}</strong>. Nothing changes
            until you add it.
          </p>
        )}
      </div>

      <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-6">
        <h3 className="font-bold text-white">Add-ons</h3>
        <p className="mt-1 mb-5 text-sm text-gray-400">
          Extras available on your plan. Each one raises your monthly figure by its
          own price.
        </p>

        {available.length === 0 && (
          <p className="text-sm text-gray-500">
            There are no add-ons published for your plan yet.
          </p>
        )}

        <div className="space-y-3">
          {available.map((addOn) => {
            const isHeld = addOn.included || held.includes(addOn.id);
            const isTicked = ticked.includes(addOn.id);
            return (
              <div
                key={addOn.id}
                className={`rounded-lg border p-4 ${
                  isTicked ? 'border-orange-500/40 bg-orange-500/5' : 'border-[#2A2A2A] bg-[#0F0F0F]'
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-white">{addOn.name}</span>
                      {addOn.included && (
                        <span className="rounded border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-xs font-bold uppercase tracking-wide text-emerald-200">
                          Included
                        </span>
                      )}
                      {!addOn.included && held.includes(addOn.id) && (
                        <span className="rounded border border-sky-500/40 bg-sky-500/10 px-2 py-0.5 text-xs font-bold uppercase tracking-wide text-sky-200">
                          On your plan
                        </span>
                      )}
                    </div>
                    {addOn.blurb && <p className="mt-1 text-sm text-gray-400">{addOn.blurb}</p>}
                  </div>

                  <div className="text-right">
                    <p className="tabular-nums font-bold text-white">
                      {addOn.included ? 'No extra cost' : money(addOn.priceCents)}
                    </p>
                    {/*
                      Per-unit pricing is stated rather than shown as a flat
                      figure. A four-unit house and a hundred-and-twenty-unit
                      block do not cost the same, and the count comes from our
                      records, not from the customer.
                    */}
                    {!addOn.included && addOn.perUnit && (
                      <p className="text-xs text-gray-500">per unit covered, per month</p>
                    )}
                    {!addOn.included && !addOn.perUnit && addOn.priceCents ? (
                      <p className="text-xs text-gray-500">per month</p>
                    ) : null}
                  </div>
                </div>

                {!isHeld && (
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-300">
                      <input
                        type="checkbox"
                        checked={isTicked}
                        onChange={() => setTicked((cur) =>
                          cur.includes(addOn.id) ? cur.filter((id) => id !== addOn.id) : [...cur, addOn.id])}
                        className="h-4 w-4 rounded border-white/20 bg-black/50 text-[#ea580c] focus:ring-[#ea580c] focus:ring-offset-0"
                      />
                      See what it would cost
                    </label>
                    <button
                      type="button"
                      disabled={buying === addOn.id || basis !== 'subscription'}
                      onClick={() => addOne(addOn)}
                      title={basis !== 'subscription'
                        ? 'Choose a plan first — add-ons attach to a paid subscription.'
                        : undefined}
                      className="ml-auto flex items-center gap-2 rounded-lg bg-[#ea580c] px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-[#dc2626] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {buying === addOn.id
                        ? <Loader2 className="h-4 w-4 animate-spin" />
                        : <Plus className="h-4 w-4" />}
                      Add to my plan
                    </button>
                  </div>
                )}

                {isHeld && (
                  <p className="mt-3 flex items-center gap-2 text-sm text-emerald-300">
                    <Check className="h-4 w-4" /> Active on your subscription.
                  </p>
                )}
              </div>
            );
          })}
        </div>

        {basis === 'trial' && available.length > 0 && (
          <p className="mt-4 text-sm text-amber-300/90">
            Everything above is already included in your trial. They only add to a
            monthly figure if you keep them after it ends.
          </p>
        )}
      </div>
    </div>
  );
}
