/**
 * Every price in one place.
 *
 * Phases 1 and 2 of `tasks/pricing-in-one-place.md`. Eric: *"i want one place to
 * read and change all the pricing for plans and subscription that link to
 * stripe."* Two views under one tab: the catalogue, which says what can be
 * bought and why not, and the editor, which is where that is changed.
 *
 * The editor is `PlanTierAdmin` rendered whole rather than reimplemented. See
 * the note above the component.
 *
 * WHAT IT IS FOR, CONCRETELY
 *
 * Two states were live in production and no screen reported either: three
 * tiers superseded on 2026-09-29 whose notes say "do not reactivate", and
 * fifteen content add-ons with no Stripe price at all. Both took a long series
 * of hand-written queries to find. This screen answers it on arrival.
 *
 * WHY EVERY BLOCKED ROW STATES ITS REASON
 *
 * Because "not sellable" on its own sends somebody to the wrong fix. The three
 * superseded tiers and the fifteen unpriced add-ons look identical in a list
 * of names, and the correct action on one is "create a price" while the
 * correct action on the other is "leave it alone for ever".
 *
 * STYLING NOTE: this renders inside `CohortManagement`, which is Tailwind on a
 * `#0A0A0A` ground, so it follows that rather than the `bpx-` sheet used by the
 * Exchange screens.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Loader2, AlertCircle, RefreshCw, CheckCircle2, XCircle, Archive,
  CreditCard, FlaskConical, Layers, Tag, Users,
} from 'lucide-react';
import { publicAnonKey } from '../utils/supabase/info';
import { API_BASE_URL } from '../lib/apiConfig';
import { supabase } from '../lib/supabase';
import PlanTierAdmin from './PlanTierAdmin';

const SERVER = `${API_BASE_URL}/make-server-3eae23a6`;

interface Row {
  kind: 'tier' | 'addon' | 'cohort';
  key: string;
  audience: string;
  id: string;
  name: string;
  blurb: string;
  active: boolean;
  priceCents: number | null;
  interval: string | null;
  stripePriceId: string | null;
  stripePriceIdTest: string | null;
  bands: number;
  sourceTierId: string | null;
  supersededByAddOn: string | null;
  note: string | null;
  sellable: boolean;
  superseded: boolean;
  reasons: string[];
  priceId: string | null;
}

interface Counts { sellable: number; blocked: number; superseded: number; total: number }

const KIND_LABEL: Record<Row['kind'], string> = {
  tier: 'Plan tiers',
  addon: 'Add-ons',
  cohort: 'Cohorts',
};

const KIND_ICON: Record<Row['kind'], typeof Tag> = {
  tier: Layers,
  addon: Tag,
  cohort: Users,
};

/** Cents, as money. Null is "nothing set", which is not the same as free. */
const money = (cents: number | null) => {
  if (cents === null || cents === undefined) return '—';
  if (!Number.isFinite(cents)) return '—';
  return `$${(cents / 100).toLocaleString(undefined, {
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;
};

/**
 * Read, or change.
 *
 * Phase 2 of the plan says MOVE `PlanTierAdmin` rather than rewrite it, and
 * this is the move. Those 1,422 lines already hold every Stripe refusal that
 * stops a live price being created by accident — no fallback from a missing
 * test key to the live one, no second price for something that already has
 * one, the product reused across price changes. A fresh editor built against
 * the same routes is how those get lost one at a time.
 *
 * So the catalogue view and the editor sit side by side under one tab, which
 * is what "one place to read and change all the pricing" actually asks for.
 */
type View = 'catalogue' | 'edit';

export default function PricingOverview() {
  const [view, setView] = useState<View>('catalogue');
  const [rows, setRows] = useState<Row[]>([]);
  const [counts, setCounts] = useState<Record<string, Counts> | null>(null);
  const [cohortsExist, setCohortsExist] = useState(true);
  const [mode, setMode] = useState<'live' | 'test'>('live');
  const [loading, setLoading] = useState(true);
  const [refused, setRefused] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setRefused(false);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const res = await fetch(`${SERVER}/pricing/overview?mode=${mode}`, {
        headers: { Authorization: `Bearer ${token || publicAnonKey}` },
      });
      // 403 is the gate working, not a failure to apologise for.
      if (res.status === 403) { setRefused(true); return; }
      const body = await res.json().catch(() => ({}));
      if (!res.ok || !body?.success) {
        setError(body?.error || 'We could not read the pricing catalogue.');
        return;
      }
      setRows(Array.isArray(body.rows) ? body.rows : []);
      setCounts(body.counts ?? null);
      setCohortsExist(Boolean(body.cohortsExist));
    } catch {
      setError('We could not reach the server just now.');
    } finally {
      setLoading(false);
    }
  }, [mode]);

  useEffect(() => { void load(); }, [load]);

  const grouped = useMemo(() => {
    const out: Record<Row['kind'], Row[]> = { tier: [], addon: [], cohort: [] };
    for (const row of rows) (out[row.kind] ||= []).push(row);
    return out;
  }, [rows]);

  const everything = counts?.everything;

  return (
    <div className="px-6 py-6 space-y-6">
      {/* ── what mode, and the headline ─────────────────────────────── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-xl font-bold text-white">Pricing — everything that links to Stripe</h2>
          <p className="text-zinc-400 text-sm mt-1 max-w-2xl">
            Every plan tier, add-on and cohort, with what it costs and whether
            anybody can actually buy it. Switch to <strong>Edit plans</strong> to
            change a price or attach a Stripe one.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/*
            Read or change, in one place. The catalogue answers "what can
            somebody buy"; the editor is where that is altered.
          */}
          <div className="flex gap-1 bg-zinc-900 p-1 rounded-lg">
            {([['catalogue', 'Catalogue'], ['edit', 'Edit plans']] as const).map(([id, label]) => (
              <button
                key={id}
                onClick={() => setView(id)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                  view === id
                    ? 'bg-zinc-700 text-white'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/*
            The two Stripe worlds are separate answers, and conflating them is
            how a rehearsal charges somebody real money. So the mode is always
            on screen rather than implied.
          */}
          <div className="flex gap-1 bg-zinc-900 p-1 rounded-lg" hidden={view !== 'catalogue'}>
            {(['live', 'test'] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-1.5 ${
                  mode === m
                    ? 'bg-[#ea580c] text-white'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                }`}
              >
                {m === 'test' ? <FlaskConical className="w-3.5 h-3.5" /> : <CreditCard className="w-3.5 h-3.5" />}
                {m === 'live' ? 'Live' : 'Test'}
              </button>
            ))}
          </div>
          <button
            onClick={() => void load()}
            disabled={loading}
            hidden={view !== 'catalogue'}
            className="px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white text-sm flex items-center gap-1.5 disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            Refresh
          </button>
        </div>
      </div>

      {/*
        The editor keeps its own loading, refusals and Stripe controls, so it
        is rendered whole rather than having its pieces re-plumbed through this
        component's state.
      */}
      {view === 'edit' && <PlanTierAdmin />}

      {view === 'catalogue' && loading && (
        <div className="flex items-center gap-3 text-zinc-400 py-12 justify-center">
          <Loader2 className="w-5 h-5 animate-spin" /> Reading the catalogue…
        </div>
      )}

      {view === 'catalogue' && !loading && refused && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-8 text-center">
          <CreditCard className="w-7 h-7 text-zinc-500 mx-auto mb-3" />
          <div className="text-white font-semibold">Company access is required</div>
          <p className="text-zinc-400 text-sm mt-1 max-w-md mx-auto">
            This screen shows every price and every Stripe price id, so it is
            kept to staff.
          </p>
        </div>
      )}

      {view === 'catalogue' && !loading && !refused && error && (
        <div className="rounded-xl border border-red-900/50 bg-red-950/30 p-6 text-center">
          <AlertCircle className="w-6 h-6 text-red-400 mx-auto mb-2" />
          <div className="text-white">{error}</div>
          <button onClick={() => void load()} className="mt-3 px-3 py-1.5 rounded-lg bg-zinc-800 text-white text-sm">
            Try again
          </button>
        </div>
      )}

      {view === 'catalogue' && !loading && !refused && !error && (
        <>
          {/* ── the headline numbers ──────────────────────────────────── */}
          {everything && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: `Sellable ${mode}`, value: everything.sellable, tone: 'text-emerald-400' },
                { label: 'Blocked', value: everything.blocked, tone: 'text-amber-400' },
                { label: 'Superseded', value: everything.superseded, tone: 'text-zinc-500' },
                { label: 'Records', value: everything.total, tone: 'text-white' },
              ].map((stat) => (
                <div key={stat.label} className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
                  <div className={`text-2xl font-bold ${stat.tone}`}>{stat.value}</div>
                  <div className="text-zinc-400 text-xs mt-0.5">{stat.label}</div>
                </div>
              ))}
            </div>
          )}

          {/*
            "No cohorts" is a finding rather than an empty state: the pricing
            core already calls cohorts the money spine, and migrate-tiers has
            never been run. Said here so the screen does not look broken.
          */}
          {!cohortsExist && (
            <div className="rounded-xl border border-amber-900/40 bg-amber-950/20 p-4 text-sm text-amber-200/90">
              <strong className="text-amber-200">No cohorts exist yet.</strong>{' '}
              The pricing core treats cohorts as the object that owns a price,
              but <code className="text-amber-100">migrate-tiers</code> has never
              been run — so everything below is still priced as tiers and add-ons.
              Running it moves the system of record for money while real accounts
              are attached, so it is rehearsed off production first. See
              Phase 0 of <code className="text-amber-100">tasks/pricing-in-one-place.md</code>.
            </div>
          )}

          {/* ── the catalogue ────────────────────────────────────────── */}
          {(['tier', 'addon', 'cohort'] as const).map((kind) => {
            const list = grouped[kind] ?? [];
            if (!list.length) return null;
            const Icon = KIND_ICON[kind];
            const kindCounts = counts?.[kind === 'tier' ? 'tiers' : kind === 'addon' ? 'addons' : 'cohorts'];

            return (
              <section key={kind} className="space-y-2">
                <div className="flex items-center gap-2 pt-2">
                  <Icon className="w-4 h-4 text-[#ea580c]" />
                  <h3 className="text-white font-semibold">{KIND_LABEL[kind]}</h3>
                  {kindCounts && (
                    <span className="text-zinc-500 text-xs">
                      {kindCounts.sellable} sellable · {kindCounts.blocked} blocked
                      {kindCounts.superseded > 0 && ` · ${kindCounts.superseded} superseded`}
                    </span>
                  )}
                </div>

                <div className="space-y-1.5">
                  {list.map((row) => (
                    <div
                      key={`${row.kind}:${row.audience}:${row.id}`}
                      className={`rounded-lg border p-3 ${
                        row.superseded
                          ? 'border-zinc-800/60 bg-zinc-900/20 opacity-70'
                          : row.sellable
                            ? 'border-emerald-900/40 bg-emerald-950/10'
                            : 'border-amber-900/40 bg-amber-950/10'
                      }`}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0 flex items-start gap-2.5">
                          {row.superseded
                            ? <Archive className="w-4 h-4 text-zinc-500 mt-0.5 shrink-0" />
                            : row.sellable
                              ? <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                              : <XCircle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />}
                          <div className="min-w-0">
                            <div className="text-white text-sm font-medium flex flex-wrap items-center gap-2">
                              {row.name}
                              {row.audience && (
                                <span className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400">
                                  {row.audience}
                                </span>
                              )}
                              {!row.active && !row.superseded && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400">off</span>
                              )}
                            </div>

                            {/* The reason, which is the point of the screen. */}
                            {row.reasons.length > 0 && (
                              <div className={`text-xs mt-1 ${row.superseded ? 'text-zinc-500' : 'text-amber-300/90'}`}>
                                {row.reasons.join(' ')}
                              </div>
                            )}

                            {row.blurb && row.sellable && (
                              <div className="text-zinc-500 text-xs mt-1">{row.blurb}</div>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-4 shrink-0 text-right">
                          <div>
                            <div className="text-white text-sm font-semibold">
                              {row.bands > 0 && row.priceCents === null
                                ? `${row.bands} bands`
                                : money(row.priceCents)}
                            </div>
                            <div className="text-zinc-500 text-[11px]">
                              {row.interval ? `per ${row.interval}` : 'no interval'}
                            </div>
                          </div>

                          {/*
                            Both ids regardless of the mode selected, because
                            "rehearsed but not live" is a real and otherwise
                            invisible state — it is exactly where the three
                            vendor content add-ons are sitting.
                          */}
                          <div className="flex flex-col gap-0.5 items-end w-20">
                            <span className={`text-[10px] px-1.5 py-0.5 rounded w-full ${
                              row.stripePriceId ? 'bg-emerald-900/40 text-emerald-300' : 'bg-zinc-800 text-zinc-500'
                            }`}>
                              {row.stripePriceId ? 'live price' : 'no live'}
                            </span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded w-full ${
                              row.stripePriceIdTest ? 'bg-sky-900/40 text-sky-300' : 'bg-zinc-800 text-zinc-500'
                            }`}>
                              {row.stripePriceIdTest ? 'test price' : 'no test'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            );
          })}

          {/*
            Named rather than silently excluded. On-call rates and the screening
            fee are prices, they are just not Stripe plan products, and a screen
            claiming to show "all pricing" has to say what it is not showing.
          */}
          <div className="text-zinc-500 text-xs border-t border-zinc-800 pt-4">
            Not shown here, because they are not Stripe subscription products:
            on-call hourly rates (Owner&nbsp;→&nbsp;On-call pricing) and the
            tenant screening fee (Screening settings). Everything billed as a
            plan or a subscription is above.
          </div>
        </>
      )}
    </div>
  );
}
