/**
 * Deciding, by hand, that two suppliers are selling the same thing.
 *
 * WHY THIS SCREEN EXISTS RATHER THAN A BACKGROUND JOB
 *
 * The materials hub only works if a customer can pick a product and have the
 * cheapest supplier resolved underneath, and that needs two vendors' lines
 * recognised as one product. Nothing can do that reliably: SKUs are each
 * supplier's own and names are whatever somebody typed into their ERP.
 *
 * And a wrong merge is not untidy — it puts one supplier's price against another
 * supplier's product, so a customer's job gets quoted from an item nobody is
 * going to deliver. The number looks exactly like a right one, which is why no
 * confidence score justifies applying it unasked.
 *
 * So the server proposes with a confidence and a reason, and a person ticks.
 * Below 0.7 a proposal arrives unticked: hiding it would drop real work, and
 * pre-ticking it would price a job wrong.
 *
 * MERGING IS REVERSIBLE, AND THAT IS SAID ON THE SCREEN
 *
 * The absorbed product is kept as a record of what it was and what it went into.
 * Somebody about to make a judgement call deserves to know that.
 */
import { useCallback, useEffect, useState } from 'react';
import { Loader2, GitMerge, RefreshCw, AlertTriangle, CheckCircle2, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { projectId } from '../../utils/supabase/info';
import { supabase } from '../../lib/supabase';

const API = `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6`;

interface Side {
  productId: string;
  name: string;
  unit: string;
  category: string;
  skus: string[];
  vendorIds: string[];
}

interface Proposal {
  a: string;
  b: string;
  confidence: number;
  reason: string;
  ticked: boolean;
  left: Side | null;
  right: Side | null;
}

/** The signed-in user's token. These routes are staff-only and check it. */
async function authHeaders(): Promise<Record<string, string>> {
  let token = '';
  try {
    const { data } = await supabase.auth.getSession();
    token = data?.session?.access_token || '';
  } catch { /* signed out; the server will refuse, which is where it belongs */ }
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

export default function ProductMergeReview() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [productCount, setProductCount] = useState(0);
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [applying, setApplying] = useState(false);
  const [done, setDone] = useState<string[]>([]);

  const keyOf = (p: Proposal) => `${p.a}|${p.b}`;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API}/catalog-products/merge-proposals`, { headers: await authHeaders() });
      const json = await res.json().catch(() => ({}));
      if (!json.success) {
        setError(res.status === 403
          ? 'Merging products is company staff only.'
          : (json.error || 'Could not load the proposals.'));
        return;
      }
      const list: Proposal[] = json.proposals || [];
      setProposals(list);
      setProductCount(json.productCount || 0);
      // The server's tick is the starting position, not the decision.
      setChecked(Object.fromEntries(list.map((p) => [`${p.a}|${p.b}`, p.ticked])));
      setDone([]);
    } catch {
      setError('Could not reach the server.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const selected = proposals.filter((p) => checked[keyOf(p)] && !done.includes(keyOf(p)));

  async function applySelected() {
    if (!selected.length) return;
    setApplying(true);
    const merged: string[] = [];
    let failures = 0;
    try {
      for (const p of selected) {
        // The side with more suppliers behind it survives, so the fewest offers
        // have to move. On a tie the left one is kept, which is arbitrary and
        // harmless — the record is the same either way.
        const leftOffers = p.left?.vendorIds.length || 0;
        const rightOffers = p.right?.vendorIds.length || 0;
        const keep = rightOffers > leftOffers ? p.b : p.a;
        const absorb = keep === p.a ? p.b : p.a;

        const res = await fetch(`${API}/catalog-products/merge`, {
          method: 'POST',
          headers: await authHeaders(),
          body: JSON.stringify({ keep, absorb }),
        });
        const json = await res.json().catch(() => ({}));
        if (json.success) merged.push(keyOf(p));
        else { failures++; toast.error(json.error || 'One merge did not apply.'); }
      }
      setDone((d) => [...d, ...merged]);
      if (merged.length) {
        toast.success(`${merged.length} product${merged.length === 1 ? '' : 's'} merged.`);
      }
      if (!failures) await load();
    } finally {
      setApplying(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 p-6 text-sm text-gray-400">
        <Loader2 className="h-4 w-4 animate-spin" /> Working out which products look like the same thing…
      </div>
    );
  }

  if (error) {
    return (
      <div className="m-6 rounded-lg border border-amber-500/30 bg-[#1A1A1A] p-4">
        <p className="text-sm text-amber-400">{error}</p>
        <button onClick={load} className="mt-3 rounded-lg bg-[#2A2A2A] px-3 py-1.5 text-sm text-white hover:bg-[#3A3A3A]">
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-bold text-white">
            <GitMerge className="h-5 w-5 text-[#ea580c]" />
            Same product, different suppliers
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-gray-400">
            Two suppliers selling one item should be one product with two prices, so the cheapest can be
            resolved when a quote is built. Nothing below has been applied — each one is a suggestion with
            the reason attached, and it happens when you say so.
          </p>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-2 rounded-lg border border-[#2A2A2A] px-3 py-1.5 text-sm text-gray-300 hover:border-[#ea580c]/40 hover:text-white"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Recheck
        </button>
      </div>

      {proposals.length === 0 ? (
        <div className="rounded-lg border border-[#2A2A2A] bg-[#1A1A1A] p-8 text-center">
          <CheckCircle2 className="mx-auto mb-3 h-7 w-7 text-gray-600" />
          <p className="font-semibold text-white">Nothing looks like a duplicate</p>
          <p className="mx-auto mt-2 max-w-md text-sm text-gray-400">
            {productCount === 0
              ? 'There are no products yet. They appear as vendors attach catalogues.'
              : `Checked ${productCount} product${productCount === 1 ? '' : 's'}. Suggestions need at least two suppliers carrying the same item.`}
          </p>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {proposals.map((p) => {
              const key = keyOf(p);
              const isDone = done.includes(key);
              const strong = p.confidence >= 0.7;
              return (
                <div
                  key={key}
                  className={`rounded-lg border p-4 ${isDone ? 'border-green-500/30 bg-green-500/5' : 'border-[#2A2A2A] bg-[#1A1A1A]'}`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      className="mt-1 h-4 w-4 shrink-0"
                      checked={Boolean(checked[key]) && !isDone}
                      disabled={isDone || applying}
                      onChange={(e) => setChecked((c) => ({ ...c, [key]: e.target.checked }))}
                      aria-label={`Merge ${p.left?.name} with ${p.right?.name}`}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="grid gap-3 md:grid-cols-[1fr_auto_1fr] md:items-center">
                        <ProductSide side={p.left} />
                        <ArrowRight className="hidden h-4 w-4 text-gray-600 md:block" />
                        <ProductSide side={p.right} />
                      </div>

                      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                        <span
                          className={`rounded-full border px-2 py-0.5 font-semibold ${
                            strong
                              ? 'border-green-500/30 bg-green-500/10 text-green-400'
                              : 'border-amber-500/30 bg-amber-500/10 text-amber-400'
                          }`}
                        >
                          {Math.round(p.confidence * 100)}% confident
                        </span>
                        <span className="text-gray-400">{p.reason}</span>
                      </div>

                      {!strong && !isDone && (
                        <p className="mt-2 flex items-start gap-1.5 text-xs text-amber-500/90">
                          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                          Left unticked on purpose — this one is worth reading properly before you agree.
                        </p>
                      )}
                      {isDone && <p className="mt-2 text-xs text-green-400">Merged.</p>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#2A2A2A] pt-4">
            <p className="text-xs text-gray-500">
              Merging keeps the absorbed product as a record of what it was and what it went into, so a
              mistake can be undone. Each supplier's own price, SKU and lead time stay theirs.
            </p>
            <button
              onClick={applySelected}
              disabled={applying || selected.length === 0}
              className="flex items-center gap-2 rounded-lg bg-[#ea580c] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {applying ? <Loader2 className="h-4 w-4 animate-spin" /> : <GitMerge className="h-4 w-4" />}
              {applying
                ? 'Merging…'
                : `Merge ${selected.length} ticked pair${selected.length === 1 ? '' : 's'}`}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function ProductSide({ side }: { side: Side | null }) {
  if (!side) return <div className="text-sm text-gray-500">(no longer there)</div>;
  return (
    <div className="min-w-0">
      <p className="truncate text-sm font-medium text-white" title={side.name}>{side.name}</p>
      <p className="mt-0.5 text-xs text-gray-500">
        {side.category || 'uncategorised'} · per {side.unit || 'each'}
        {side.vendorIds.length ? ` · ${side.vendorIds.length} supplier${side.vendorIds.length === 1 ? '' : 's'}` : ' · no supplier'}
      </p>
      {side.skus.length > 0 && (
        <p className="mt-0.5 truncate text-xs text-gray-600" title={side.skus.join(', ')}>
          {side.skus.slice(0, 3).join(', ')}{side.skus.length > 3 ? ` +${side.skus.length - 3}` : ''}
        </p>
      )}
    </div>
  );
}
