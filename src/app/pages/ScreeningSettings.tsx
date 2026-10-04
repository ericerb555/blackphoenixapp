/**
 * The tenant-screening fee, and what it has earned.
 *
 * WHY THIS IS NOT PART OF `PricingSettings`
 *
 * That page configures construction pricing — material markups, labour rates,
 * margins, overhead. A screening fee is a different business with a cost of
 * goods behind it and a statutory refund attached. Putting it there would have
 * meant one save button writing two unrelated configurations.
 *
 * WHAT IS DELIBERATELY NOT ON THIS SCREEN
 *
 * `retainedAdminCents` — what may be kept from a refunded fee as "reasonable
 * administrative costs" under RSA 540-A:3 VIII — and the retention window that
 * decides when records are deleted. Both are legal judgements rather than
 * pricing decisions, and both are editable only by someone with API or
 * dashboard access. A destructive or law-adjacent setting should not sit one
 * mis-click away from a price.
 *
 * THE NUMBERS ARE IN DOLLARS HERE AND CENTS ON THE WIRE
 *
 * Because a form that asks for cents is a form somebody types 45 into meaning
 * $45 and sets the fee to forty-five cents. Converted at the edge, once.
 */
import { useState, useEffect, useCallback } from 'react';
import { DollarSign, Save, Loader2, AlertTriangle, Plus, Trash2, Info } from 'lucide-react';
import { BackToDashboard } from '../components/BackToDashboard';
import { projectId } from '../utils/supabase/info';
import { authedHeaders } from '../utils/authHeaders';

const SERVER = `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6`;

const card = 'rounded-2xl border border-[#2A2A2A] bg-[#1A1A1A] p-5 shadow-sm';
const input = 'w-full rounded-lg border border-[#2A2A2A] bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none focus:border-teal-500';
const label = 'mb-1 block text-xs font-medium text-gray-400';
const btnTeal = 'inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50';
const btnGhost = 'inline-flex items-center gap-2 rounded-lg border border-[#2A2A2A] px-3 py-2 text-sm text-gray-300 hover:bg-[#2A2A2A] disabled:opacity-50';

const dollars = (cents: any) => (Number(cents || 0) / 100).toFixed(2);
const toCents = (value: string) => Math.round(Number(value || 0) * 100);

type Payer = 'landlord' | 'applicant';

export default function ScreeningSettings() {
  const [price, setPrice] = useState('');
  const [cost, setCost] = useState('');
  const [enabled, setEnabled] = useState(true);
  const [defaultPayer, setDefaultPayer] = useState<Payer>('landlord');
  const [states, setStates] = useState<Array<{ state: string; payer: Payer }>>([]);
  const [retainedAdminCents, setRetainedAdminCents] = useState(0);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState('');
  const [revenue, setRevenue] = useState<any>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const headers = await authedHeaders();
      const [pRes, rRes] = await Promise.all([
        fetch(`${SERVER}/staff/screening/pricing`, { headers }),
        fetch(`${SERVER}/staff/screening/revenue`, { headers }),
      ]);
      const p = await pRes.json();
      if (!p.success) throw new Error(p.error || 'Unable to load the screening fee');
      const pricing = p.pricing || {};
      setPrice(pricing.priceCents ? dollars(pricing.priceCents) : '');
      setCost(pricing.costCents ? dollars(pricing.costCents) : '');
      setEnabled(pricing.enabled !== false);
      setDefaultPayer(pricing.defaultPayer === 'applicant' ? 'applicant' : 'landlord');
      setStates(Object.entries(pricing.payerByState || {}).map(([state, payer]) => ({ state, payer: payer as Payer })));
      setRetainedAdminCents(Number(pricing.retainedAdminCents || 0));
      const r = await rRes.json().catch(() => ({}));
      if (r?.success) setRevenue(r);
      setError('');
    } catch (e: any) { setError(e.message || 'Unable to load the screening fee'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const save = async () => {
    try {
      setSaving(true); setError(''); setSaved('');
      const payerByState: Record<string, Payer> = {};
      for (const row of states) {
        const code = row.state.trim().toUpperCase();
        if (/^[A-Z]{2}$/.test(code)) payerByState[code] = row.payer;
      }
      const res = await fetch(`${SERVER}/staff/screening/pricing`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...(await authedHeaders()) },
        body: JSON.stringify({
          priceCents: toCents(price),
          costCents: toCents(cost),
          enabled,
          defaultPayer,
          payerByState,
          // Passed back unchanged. It is not editable here, and leaving it out
          // would silently reset it to zero on every save from this screen.
          retainedAdminCents,
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Unable to save');
      setSaved(toCents(price) > 0 && enabled
        ? `Saved. Screenings now cost $${dollars(toCents(price))}.`
        : 'Saved. No fee is charged — screenings are ordered at no cost.');
      void load();
    } catch (e: any) { setError(e.message || 'Unable to save'); }
    finally { setSaving(false); }
  };

  const markup = toCents(price) - toCents(cost);
  const chargingApplicants = defaultPayer === 'applicant' || states.some((s) => s.payer === 'applicant');

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center text-gray-400"><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading…</div>;
  }

  return (
    <div className="min-h-screen bg-[#0F0F0F] p-6 text-white">
      <div className="mx-auto max-w-3xl space-y-5">
        <BackToDashboard />

        <div>
          <h1 className="text-2xl font-semibold">Tenant screening fee</h1>
          <p className="mt-1 text-sm text-gray-400">
            What a credit, eviction and criminal report costs, and who is asked to pay it.
          </p>
        </div>

        {toCents(price) === 0 && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200">
            <b>No fee is set, so nothing is charged.</b> Landlords can order screenings and they
            are free. That is the resting state — set a price below when you want to start
            charging.
          </div>
        )}

        <div className={card}>
          <div className="mb-4 flex items-center gap-2 text-sm font-semibold"><DollarSign className="h-4 w-4 text-teal-400" /> The fee</div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={label}>What we charge</label>
              <input className={input} inputMode="decimal" placeholder="0.00" value={price} onChange={(e) => setPrice(e.target.value)} />
              <p className="mt-1 text-xs text-gray-500">Dollars. Leave empty to charge nothing.</p>
            </div>
            <div>
              <label className={label}>What the agency charges us</label>
              <input className={input} inputMode="decimal" placeholder="0.00" value={cost} onChange={(e) => setCost(e.target.value)} />
              <p className="mt-1 text-xs text-gray-500">The documented cost. Used for margin, and for refunds.</p>
            </div>
          </div>

          {toCents(price) > 0 && (
            <div className="mt-4 rounded-lg bg-[#0A0A0A] p-3 text-sm">
              <span className="text-gray-400">Margin per screening: </span>
              <b className={markup > 0 ? 'text-emerald-400' : 'text-rose-400'}>${dollars(markup)}</b>
              {markup <= 0 && <span className="text-rose-400"> — the fee does not cover the agency's cost.</span>}
            </div>
          )}

          <label className="mt-4 flex items-center gap-2 text-sm text-gray-300">
            <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} className="h-4 w-4" />
            Charge the fee. Unticked keeps the figures but charges nobody.
          </label>
        </div>

        <div className={card}>
          <div className="mb-1 flex items-center gap-2 text-sm font-semibold">Who pays</div>
          <p className="mb-4 text-xs text-gray-500">
            The default applies to any state without a rule of its own. An unknown state always
            falls to the landlord — the applicant is never charged by accident.
          </p>

          <div className="max-w-xs">
            <label className={label}>Default payer</label>
            <select className={input} value={defaultPayer} onChange={(e) => setDefaultPayer(e.target.value as Payer)}>
              <option value="landlord">The landlord</option>
              <option value="applicant">The applicant</option>
            </select>
          </div>

          <div className="mt-4 space-y-2">
            {states.map((row, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  className={`${input} w-20`}
                  maxLength={2}
                  placeholder="NH"
                  value={row.state}
                  onChange={(e) => setStates(states.map((s, j) => (j === i ? { ...s, state: e.target.value.toUpperCase() } : s)))}
                />
                <select
                  className={`${input} flex-1`}
                  value={row.payer}
                  onChange={(e) => setStates(states.map((s, j) => (j === i ? { ...s, payer: e.target.value as Payer } : s)))}
                >
                  <option value="landlord">The landlord pays</option>
                  <option value="applicant">The applicant pays</option>
                </select>
                <button className={btnGhost} onClick={() => setStates(states.filter((_, j) => j !== i))}><Trash2 className="h-4 w-4" /></button>
              </div>
            ))}
            <button className={btnGhost} onClick={() => setStates([...states, { state: '', payer: 'landlord' }])}>
              <Plus className="h-4 w-4" /> Add a state
            </button>
          </div>

          {chargingApplicants && (
            <div className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200">
              <b>Charging applicants is regulated, and the rules differ by state.</b>
              <ul className="mt-2 list-disc space-y-1 pl-4">
                <li><b>Massachusetts and Vermont:</b> a landlord may not charge an applicant at all. MA also makes it a c. 93A unfair practice.</li>
                <li><b>New Hampshire:</b> allowed, but the amount and whether a satisfactory check is required must be disclosed in writing first, and anything above documented cost goes back to anyone not rented to within 30 days. Both are automatic.</li>
                <li><b>New York:</b> the lesser of actual cost or $20, waived entirely if the applicant brings a report from the last 30 days.</li>
                <li>Several states cap the fee and <b>index the cap annually</b>, so a figure that is right this year may not be next.</li>
              </ul>
              <p className="mt-2">See <code>tasks/tenant-screening.md</code> for the sources.</p>
            </div>
          )}
        </div>

        {revenue && (
          <div className={card}>
            <div className="mb-3 text-sm font-semibold">What it has earned</div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                ['Orders', revenue.totalOrders ?? 0],
                ['Paid', revenue.paidOrders ?? 0],
                ['Revenue', `$${dollars(revenue.revenueCents)}`],
                ['Refunded', `$${dollars(revenue.refundedCents)}`],
                ['Agency cost', `$${dollars(revenue.costCents)}`],
                ['Margin', `$${dollars(revenue.marginCents)}`],
              ].map(([k, v]) => (
                <div key={String(k)} className="rounded-lg bg-[#0A0A0A] p-3">
                  <div className="text-lg font-semibold">{v as any}</div>
                  <div className="text-xs text-gray-500">{k as any}</div>
                </div>
              ))}
            </div>
            {retainedAdminCents > 0 && (
              <p className="mt-3 flex items-start gap-2 text-xs text-gray-500">
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                ${dollars(retainedAdminCents)} per refund is retained as administrative costs. That
                is set outside this screen, because it is a legal judgement rather than a price.
              </p>
            )}
          </div>
        )}

        {error && (
          <div className="flex items-start gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-200">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
          </div>
        )}
        {saved && <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-200">{saved}</div>}

        <div className="flex justify-end">
          <button className={btnTeal} disabled={saving} onClick={save}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save
          </button>
        </div>
      </div>
    </div>
  );
}
