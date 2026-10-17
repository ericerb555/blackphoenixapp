/**
 * Tell the owner when something priceable cannot be sold.
 *
 * Eric, 2026-10-17: *"the app should alert owner admin when action is needed
 * and prices are not set."*
 *
 * WHY A BANNER AND NOT AN ENTRY IN THE ALERTS PANEL
 *
 * Because "no price is set" is a state rather than an event, and the alerts
 * panel merges what the server sends into the browser's own `localStorage`.
 * A state pushed through there is copied into every admin's browser and
 * outlives the problem — it would still be sitting there after the price was
 * created, waiting to be dismissed by hand. This is recomputed on every mount,
 * so it appears when there is something to do and vanishes when there is not,
 * without anybody telling it so.
 *
 * WHY IT RENDERS NOTHING WHEN ALL IS WELL
 *
 * A banner that is always present is furniture, and furniture is not read. It
 * occupies no space at all unless there is an action to take.
 *
 * WHAT IT DOES NOT DO
 *
 * It does not say what the price should be, and it does not offer to set one.
 * A price is a decision with money attached. This reports and links; a person
 * decides.
 */
import { useEffect, useState } from 'react';
import { AlertTriangle, ArrowRight, X } from 'lucide-react';
import { API_BASE_URL } from '../lib/apiConfig';
import { supabase } from '../lib/supabase';

interface Attention {
  needsAttention: boolean;
  sellable: number;
  blocked: number;
  withoutPrice: number;
  readyButOff: number;
  examples: Array<{ name: string; audience: string; reasons: string[] }>;
}

interface Props {
  /** Where "Review pricing" should go. Defaults to the cohort page. */
  onNavigate?: (path: string) => void;
}

export default function PricingAttentionBanner({ onNavigate }: Props) {
  const [state, setState] = useState<Attention | null>(null);
  /*
   * Dismissal lasts for this view only, deliberately not persisted. A price
   * that cannot be charged is not a notice somebody should be able to silence
   * for ever from a dashboard.
   */
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        // No session means no staff token, and the route would refuse anyway.
        if (!session?.access_token) return;

        const res = await fetch(`${API_BASE_URL}/make-server-3eae23a6/pricing/needs-attention`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        // 403 is a non-staff viewer. Say nothing rather than showing an error
        // to somebody who was never the audience for this.
        if (!res.ok) return;

        const body = await res.json().catch(() => null);
        if (!cancelled && body?.success) setState(body as Attention);
      } catch {
        /* Silent. A banner that cannot check must not claim a problem. */
      }
    })();

    return () => { cancelled = true; };
  }, []);

  if (!state?.needsAttention || dismissed) return null;

  const go = () => {
    if (onNavigate) onNavigate('cohort-management');
    else window.location.href = '/cohort-management';
  };

  // The two cases have different fixes, so the sentence names whichever
  // dominates rather than averaging them into "some plans have problems".
  const headline = state.withoutPrice > 0
    ? `${state.withoutPrice} ${state.withoutPrice === 1 ? 'plan has' : 'plans have'} no Stripe price`
    : `${state.readyButOff} priced ${state.readyButOff === 1 ? 'plan is' : 'plans are'} switched off`;

  return (
    <div className="rounded-xl border border-amber-900/50 bg-amber-950/25 p-4 mb-4">
      <div className="flex flex-wrap items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-400 mt-0.5 shrink-0" />

        <div className="min-w-0 flex-1">
          <div className="text-amber-100 font-semibold text-sm">
            {headline} — nobody can buy {state.blocked === 1 ? 'it' : 'them'}
          </div>

          <div className="text-amber-200/80 text-xs mt-1">
            {state.withoutPrice > 0 && state.readyButOff > 0 && (
              <>
                {state.withoutPrice} need a Stripe price, {state.readyButOff}{' '}
                {state.readyButOff === 1 ? 'is' : 'are'} priced but switched off.{' '}
              </>
            )}
            {state.sellable > 0
              ? `${state.sellable} ${state.sellable === 1 ? 'plan is' : 'plans are'} sellable.`
              : 'Nothing is currently sellable.'}
          </div>

          {state.examples.length > 0 && (
            <ul className="text-amber-200/70 text-xs mt-2 space-y-0.5">
              {state.examples.map((x) => (
                <li key={`${x.audience}:${x.name}`}>
                  <span className="text-amber-100">{x.name}</span>
                  {x.audience && <span className="text-amber-200/50"> ({x.audience})</span>}
                  {' — '}{x.reasons.join(' ')}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={go}
            className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-medium flex items-center gap-1.5"
          >
            Review pricing <ArrowRight className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setDismissed(true)}
            aria-label="Hide for now"
            className="p-1.5 rounded-lg text-amber-300/70 hover:text-amber-100 hover:bg-amber-900/30"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
