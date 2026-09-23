/**
 * OnCallPricingAdmin — the three numbers on-call is sold on, in one place.
 *
 * WHAT IS HERE AND WHY
 *
 * On-call is priced on the call, the hours worked and the size of what is
 * covered. Each of those lived somewhere different and only one of them had a
 * screen, so setting a price meant an API call or a database edit:
 *
 *   the call      on_call_platform_rates:global   nothing edited it
 *   the hours     tech_tiers:config               the tech tier screen
 *   the size      plan_addon:{audience}:on-call   bands, nothing edited them
 *
 * This edits the first and third, and points at the second rather than copying
 * it: a second hourly rate would be the copy that disagrees, and the one that
 * disagrees about money ends up on an invoice.
 *
 * THE RATES HERE ARE OURS, NOT A CUSTOMER'S
 *
 * Every field on this screen decides what Black Phoenix charges. The matching
 * fields on a customer's own on-call record are theirs and are edited in their
 * portal; when we answer, these win outright. That split is the whole reason
 * this screen exists — our callout used to live where the person being charged
 * it could change it.
 *
 * A PRICE IS NOT LIVE UNTIL STRIPE HAS ONE
 *
 * Editing a band's amount stores a number. It does not create the Stripe price
 * that number is charged through, and a band whose amount has changed loses the
 * price it had — Stripe prices are immutable, so keeping it would bill the old
 * figure. The state of each band is therefore shown plainly rather than left to
 * be inferred from a silence.
 */
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  PhoneCall, Wallet, LoaderCircle, Save, Plus, Trash2, AlertTriangle,
  CheckCircle2, CreditCard, Users, MessageSquareQuote,
} from 'lucide-react';
import { projectId } from '../utils/supabase/info';
import { authedHeaders } from '../utils/authHeaders';

const SERVER = `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6`;

/** The portals on-call is sold into. */
const AUDIENCES = [
  { id: 'landlord', label: 'Landlord' },
  { id: 'condo_association', label: 'Condo association' },
  { id: 'property_manager', label: 'Property manager' },
];

interface Band {
  id: string;
  label?: string;
  upToUnits?: number;
  priceCents?: number;
  quoteOnly?: boolean;
  stripePriceId?: string;
  stripePriceIdTest?: string;
}

interface AddOn {
  id: string;
  audience: string;
  name: string;
  active?: boolean;
  sizeBands?: Band[];
}

interface Rates {
  calloutCents: number;
  afterHoursCents: number;
  hourlyCents: number;
  minimumHours: number;
  notes?: string;
}

const toDollars = (cents?: number) => (Number(cents) || 0) / 100;
const toCents = (dollars: string | number) => Math.round((Number(dollars) || 0) * 100);

const card = 'rounded-xl border border-white/10 bg-[#111] p-5';
const label = 'mb-1.5 block text-xs font-semibold text-gray-400';
const input = 'w-full rounded-lg border border-white/10 bg-[#0A0A0A] px-3 py-2 text-sm text-white '
  + 'placeholder-gray-600 outline-none focus:border-orange-500';

export default function OnCallPricingAdmin() {
  const [rates, setRates] = useState<Rates | null>(null);
  const [tiers, setTiers] = useState<Array<{ id: string; label: string; hourlyRate: number }>>([]);
  const [addOns, setAddOns] = useState<Record<string, AddOn | null>>({});
  const [loading, setLoading] = useState(true);
  const [savingRates, setSavingRates] = useState(false);
  const [savingAudience, setSavingAudience] = useState<string | null>(null);
  const [pricing, setPricing] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const headers = await authedHeaders();
      const [r, t, ...cats] = await Promise.all([
        fetch(`${SERVER}/on-call-platform-rates`, { headers }).then(x => x.json()).catch(() => null),
        fetch(`${SERVER}/tech-tiers/config`, { headers }).then(x => x.json()).catch(() => null),
        ...AUDIENCES.map(a =>
          fetch(`${SERVER}/plan-addons?audience=${encodeURIComponent(a.id)}`, { headers })
            .then(x => x.json()).catch(() => null)),
      ]);

      if (r?.success) setRates(r.rates);
      if (t?.success) setTiers(Array.isArray(t.tiers) ? t.tiers : []);

      const next: Record<string, AddOn | null> = {};
      AUDIENCES.forEach((a, i) => {
        const list = cats[i]?.addOns || [];
        next[a.id] = list.find((x: any) => String(x?.id) === 'on-call') || null;
      });
      setAddOns(next);
    } catch (e: any) {
      toast.error(e?.message || 'Could not load the on-call pricing.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const saveRates = async () => {
    if (!rates) return;
    setSavingRates(true);
    try {
      const res = await fetch(`${SERVER}/on-call-platform-rates`, {
        method: 'PUT',
        headers: await authedHeaders(),
        body: JSON.stringify(rates),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok || !payload?.success) throw new Error(payload?.error || 'Could not save the rates.');
      setRates(payload.rates);
      toast.success('Our on-call rates saved.');
    } catch (e: any) {
      toast.error(e?.message || 'Could not save the rates.');
    } finally {
      setSavingRates(false);
    }
  };

  const setBand = (audience: string, bandId: string, patch: Partial<Band>) => {
    setAddOns(prev => {
      const a = prev[audience];
      if (!a) return prev;
      return {
        ...prev,
        [audience]: {
          ...a,
          sizeBands: (a.sizeBands || []).map(b => (b.id === bandId ? { ...b, ...patch } : b)),
        },
      };
    });
  };

  const addBand = (audience: string) => setAddOns(prev => {
    const a = prev[audience];
    if (!a) return prev;
    const bands = a.sizeBands || [];
    return {
      ...prev,
      [audience]: {
        ...a,
        sizeBands: [...bands, {
          id: `band-${bands.length + 1}-${Math.random().toString(36).slice(2, 5)}`,
          label: '',
          priceCents: 0,
        }],
      },
    };
  });

  const removeBand = (audience: string, bandId: string) => setAddOns(prev => {
    const a = prev[audience];
    if (!a) return prev;
    return { ...prev, [audience]: { ...a, sizeBands: (a.sizeBands || []).filter(b => b.id !== bandId) } };
  });

  const saveAddOn = async (audience: string) => {
    const addOn = addOns[audience];
    if (!addOn) return;
    setSavingAudience(audience);
    try {
      const res = await fetch(`${SERVER}/plan-addons/${encodeURIComponent(audience)}`, {
        method: 'POST',
        headers: await authedHeaders(),
        body: JSON.stringify(addOn),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload?.error || 'Could not save.');
      // The warning is the interesting half — it says when a band has lost its
      // Stripe price because the amount moved.
      if (payload?.warning) toast.warning(payload.warning, { duration: 10000 });
      else toast.success(`${addOn.name} saved for ${audience.replace(/_/g, ' ')}.`);
      await load();
    } catch (e: any) {
      toast.error(e?.message || 'Could not save.');
    } finally {
      setSavingAudience(null);
    }
  };

  /** Create the Stripe price for one band, in one mode. */
  const createPrice = async (audience: string, bandId: string, mode: 'test' | 'live') => {
    const key = `${audience}:${bandId}:${mode}`;
    setPricing(key);
    try {
      const res = await fetch(
        `${SERVER}/plan-addons/${encodeURIComponent(audience)}/on-call/stripe-price`
        + `?band=${encodeURIComponent(bandId)}&mode=${mode}`,
        { method: 'POST', headers: await authedHeaders(), body: JSON.stringify({}) },
      );
      const payload = await res.json().catch(() => ({}));
      if (!res.ok || !payload?.success) throw new Error(payload?.error || 'Stripe refused.');
      toast.success(payload.note || `${mode} price created.`);
      await load();
    } catch (e: any) {
      toast.error(e?.message || 'Could not create the price.', { duration: 9000 });
    } finally {
      setPricing(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 p-6 text-sm text-gray-400">
        <LoaderCircle className="h-4 w-4 animate-spin" /> Loading the on-call pricing…
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="flex items-center gap-2 text-xl font-bold text-white">
          <PhoneCall className="h-5 w-5 text-orange-400" /> On-call pricing
        </h2>
        <p className="mt-1 text-sm text-gray-400">
          What we charge when Black Phoenix answers: per call, per hour, and per month by size.
          These are ours — a customer's own rates live in their portal and are theirs.
        </p>
      </div>

      {/* ── per call ───────────────────────────────────────────────────── */}
      <div className={card}>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-sm font-bold text-white">
            <Wallet className="h-4 w-4 text-orange-400" /> Per call
          </h3>
          <button
            onClick={() => void saveRates()}
            disabled={savingRates || !rates}
            className="inline-flex items-center gap-2 rounded-lg bg-orange-600 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-orange-500 disabled:opacity-50"
          >
            {savingRates ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            Save
          </button>
        </div>
        {rates ? (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className={label}>Callout — charged every time we turn out</label>
                <input type="number" min={0} step="0.01" className={input}
                  value={toDollars(rates.calloutCents) || ''}
                  onChange={e => setRates({ ...rates, calloutCents: toCents(e.target.value) })} />
              </div>
              <div>
                <label className={label}>Out of hours — added to the callout, not instead of it</label>
                <input type="number" min={0} step="0.01" className={input}
                  value={toDollars(rates.afterHoursCents) || ''}
                  onChange={e => setRates({ ...rates, afterHoursCents: toCents(e.target.value) })} />
              </div>
            </div>
            <div className="mt-3">
              <label className={label}>Note shown with the rates</label>
              <input className={input} value={rates.notes || ''}
                onChange={e => setRates({ ...rates, notes: e.target.value })} />
            </div>
          </>
        ) : (
          <p className="text-sm text-gray-500">The rates could not be loaded.</p>
        )}
      </div>

      {/* ── per hour, which lives elsewhere on purpose ─────────────────── */}
      <div className={card}>
        <h3 className="mb-1 flex items-center gap-2 text-sm font-bold text-white">
          <Users className="h-4 w-4 text-orange-400" /> Per hour, when a technician attends
        </h3>
        <p className="mb-3 text-xs text-gray-500">
          Billed at the attending technician's tier. Set on the technician tiers screen and shown
          here so the whole price is in one view — there is deliberately no second copy to edit,
          because the copy that disagrees is the one that reaches an invoice.
        </p>
        {tiers.length === 0 ? (
          <p className="text-sm text-gray-500">The tier rates could not be loaded.</p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {tiers.map(t => (
              <div key={t.id} className="rounded-lg border border-white/10 bg-[#0A0A0A] p-3">
                <p className="text-xs text-gray-500">{t.label}</p>
                <p className="mt-0.5 text-lg font-bold text-white">${Number(t.hourlyRate || 0)}/hr</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── per month, by size ─────────────────────────────────────────── */}
      {AUDIENCES.map(audience => {
        const addOn = addOns[audience.id];
        return (
          <div key={audience.id} className={card}>
            <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
              <h3 className="flex items-center gap-2 text-sm font-bold text-white">
                <CreditCard className="h-4 w-4 text-orange-400" />
                Monthly — {audience.label}
              </h3>
              {addOn && (
                <div className="flex items-center gap-2">
                  <label className="flex cursor-pointer items-center gap-1.5 text-xs text-gray-400">
                    <input type="checkbox" checked={addOn.active !== false}
                      onChange={e => setAddOns(prev => ({
                        ...prev, [audience.id]: { ...addOn, active: e.target.checked },
                      }))}
                      className="h-4 w-4 rounded border-white/10 text-orange-600 focus:ring-orange-500" />
                    On sale
                  </label>
                  <button onClick={() => void addBand(audience.id)}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-orange-400 hover:text-orange-300">
                    <Plus className="h-3.5 w-3.5" /> Add a band
                  </button>
                  <button onClick={() => void saveAddOn(audience.id)}
                    disabled={savingAudience === audience.id}
                    className="inline-flex items-center gap-2 rounded-lg bg-orange-600 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-orange-500 disabled:opacity-50">
                    {savingAudience === audience.id
                      ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                      : <Save className="h-3.5 w-3.5" />}
                    Save
                  </button>
                </div>
              )}
            </div>

            {!addOn ? (
              <p className="text-sm text-gray-500">
                No on-call add-on exists for this portal yet.
              </p>
            ) : (
              <>
                <p className="mb-3 text-xs text-gray-500">
                  A flat monthly fee, with the figure decided by how many units the account
                  covers. We count the units from their own properties — they do not choose a band.
                </p>
                <div className="space-y-2">
                  {(addOn.sizeBands || []).map(band => {
                    const live = Boolean(band.stripePriceId);
                    const test = Boolean(band.stripePriceIdTest);
                    return (
                      <div key={band.id} className="rounded-lg border border-white/10 bg-[#0A0A0A] p-3">
                        <div className="grid gap-2 sm:grid-cols-[1fr_9rem_9rem_auto]">
                          <div>
                            <label className={label}>What it is called</label>
                            <input className={input} value={band.label || ''}
                              placeholder="Up to 25 units"
                              onChange={e => setBand(audience.id, band.id, { label: e.target.value })} />
                          </div>
                          <div>
                            <label className={label}>Up to (units)</label>
                            <input type="number" min={0} className={input}
                              value={band.upToUnits || ''}
                              placeholder="no limit"
                              onChange={e => setBand(audience.id, band.id, {
                                upToUnits: Number(e.target.value) || undefined,
                              })} />
                          </div>
                          <div>
                            <label className={label}>Per month</label>
                            <input type="number" min={0} step="0.01" className={input}
                              disabled={band.quoteOnly}
                              value={band.quoteOnly ? '' : (toDollars(band.priceCents) || '')}
                              placeholder={band.quoteOnly ? 'quoted' : '0.00'}
                              onChange={e => setBand(audience.id, band.id, {
                                priceCents: toCents(e.target.value),
                              })} />
                          </div>
                          <div className="flex items-end pb-1">
                            <button onClick={() => removeBand(audience.id, band.id)}
                              className="rounded-lg p-2 text-gray-500 transition hover:bg-white/5 hover:text-red-400"
                              aria-label="Remove this band">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>

                        <label className="mt-2 flex cursor-pointer items-start gap-2">
                          <input type="checkbox" checked={Boolean(band.quoteOnly)}
                            onChange={e => setBand(audience.id, band.id, {
                              quoteOnly: e.target.checked, priceCents: e.target.checked ? 0 : band.priceCents,
                            })}
                            className="mt-0.5 h-4 w-4 rounded border-white/10 text-orange-600 focus:ring-orange-500" />
                          <span className="text-xs text-gray-400">
                            <span className="inline-flex items-center gap-1.5 font-semibold text-white">
                              <MessageSquareQuote className="h-3.5 w-3.5" /> Quote this size instead
                            </span>
                            <span className="mt-0.5 block">
                              No published price and no Stripe price needed. An account this size is
                              invited to ask, and the request reaches you with the unit count we counted.
                            </span>
                          </span>
                        </label>

                        {/* What is actually sellable, said rather than implied. */}
                        {!band.quoteOnly && (
                          <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-white/10 pt-2">
                            <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
                              live
                                ? 'border-green-500/30 bg-green-500/10 text-green-400'
                                : 'border-amber-500/30 bg-amber-500/10 text-amber-400'
                            }`}>
                              {live ? <CheckCircle2 className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
                              {live ? 'Live price attached' : 'No live price — not on sale'}
                            </span>
                            <button
                              onClick={() => void createPrice(audience.id, band.id, 'test')}
                              disabled={pricing === `${audience.id}:${band.id}:test`}
                              className="rounded-lg border border-white/10 px-2.5 py-1 text-[11px] font-semibold text-gray-300 transition hover:border-white/20 hover:text-white disabled:opacity-50">
                              {test ? 'Replace test price' : 'Create test price'}
                            </button>
                            <button
                              onClick={() => void createPrice(audience.id, band.id, 'live')}
                              disabled={pricing === `${audience.id}:${band.id}:live`}
                              className="rounded-lg border border-orange-500/40 bg-orange-500/10 px-2.5 py-1 text-[11px] font-semibold text-orange-300 transition hover:bg-orange-500/20 disabled:opacity-50">
                              {live ? 'Replace live price' : 'Create live price'}
                            </button>
                            <span className="text-[11px] text-gray-600">
                              Save the amount first — a price is created from what is stored.
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {(addOn.sizeBands || []).length === 0 && (
                    <p className="text-sm text-amber-400">
                      No bands, so nothing can be sold. Add one, or add a quoted band so larger
                      accounts can at least ask.
                    </p>
                  )}
                </div>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}
