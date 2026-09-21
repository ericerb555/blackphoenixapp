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
import {
  Loader2, CheckCircle2, AlertTriangle, CreditCard, RefreshCw,
  Pencil, Plus, Sparkles, X,
} from 'lucide-react';
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
  sortOrder?: number;
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

/**
 * A tier being edited, held as the strings a form actually contains.
 *
 * Kept separate from `Tier` rather than editing one in place, because a
 * half-typed price is the string "4" long before it is a number, and coercing
 * on every keystroke makes the field fight the person using it. Converted once,
 * on save.
 */
interface Draft {
  id: string;
  isNew: boolean;
  name: string;
  blurb: string;
  featuresText: string;
  limits: { key: string; value: string }[];
  priceDollars: string;
  interval: 'month' | 'year';
  sortOrder: string;
  active: boolean;
  /** What it cost before this edit, to notice an amount change on save. */
  originalCents: number;
  /** Whether it could be bought before this edit, for the same reason. */
  wasOnSale: boolean;
}

function draftFrom(t: Partial<Tier> & { id?: string }, isNew: boolean): Draft {
  return {
    id: t.id || '',
    isNew,
    name: t.name || '',
    blurb: t.blurb || '',
    featuresText: (t.features || []).join('\n'),
    limits: Object.entries(t.limits || {}).map(([key, value]) => ({ key, value: String(value) })),
    priceDollars: Number(t.priceCents) > 0 ? String(Number(t.priceCents) / 100) : '',
    interval: t.interval === 'year' ? 'year' : 'month',
    sortOrder: String(t.sortOrder ?? 0),
    active: t.active !== false,
    originalCents: Number(t.priceCents || 0),
    wasOnSale: Boolean(t.purchasable),
  };
}

/** The form's contents as the server's `readTier` expects them. */
function tierFrom(d: Draft) {
  const limits: Record<string, number> = {};
  for (const row of d.limits) {
    const key = row.key.trim();
    const n = Number(row.value);
    if (key && Number.isFinite(n) && n >= 0) limits[key] = n;
  }
  return {
    id: d.id.trim().toLowerCase().replace(/[^a-z0-9_-]/g, ''),
    name: d.name.trim(),
    blurb: d.blurb.trim(),
    features: d.featuresText.split('\n').map(f => f.trim()).filter(Boolean),
    limits,
    priceCents: Math.max(0, Math.round(Number(d.priceDollars || 0) * 100)),
    interval: d.interval,
    sortOrder: Number(d.sortOrder) || 0,
    active: d.active,
  };
}

const field = 'w-full rounded-lg border border-[#2A2A2A] bg-[#0A0A0A] px-3 py-2 text-sm text-white '
  + 'placeholder:text-gray-600 focus:border-orange-500 focus:outline-none';
const label = 'mb-1 block text-[11px] font-semibold uppercase tracking-wide text-gray-500';

/**
 * The form. Everything a tier is, in one place.
 *
 * Pulled out of the panel rather than inlined because the panel is already a
 * list, a mode switch and two Stripe flows, and a nine-field form buried inside
 * that is a wall nobody can read.
 */
function TierEditor({
  draft, setDraft, onSave, onCancel, saving, mode,
}: {
  draft: Draft;
  setDraft: (d: Draft) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
  mode: 'test' | 'live';
}) {
  const cents = Math.max(0, Math.round(Number(draft.priceDollars || 0) * 100));
  /**
   * The one warning worth interrupting for.
   *
   * A Stripe Price cannot be edited — its amount is fixed for good. So changing
   * the figure here does nothing to what the card is charged, and the server
   * detaches the old price on save rather than let the portal advertise one
   * number while Stripe bills another. Said before the save, not after, because
   * afterwards the plan is off sale and that would read as a fault.
   */
  const priceMoved = !draft.isNew && draft.wasOnSale && cents !== draft.originalCents;

  return (
    <div className="mb-4 rounded-xl border border-orange-500/30 bg-[#0A0A0A] p-4">
      <p className="mb-3 text-sm font-bold text-white">
        {draft.isNew ? 'New plan' : `Editing ${draft.name || draft.id}`}
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <span className={label}>Name</span>
          <input
            className={field}
            value={draft.name}
            placeholder="Stocked"
            onChange={e => setDraft({ ...draft, name: e.target.value })}
          />
        </div>
        <div>
          <span className={label}>
            Id {draft.isNew ? '' : '(fixed)'}
          </span>
          <input
            className={`${field} ${draft.isNew ? '' : 'opacity-60'}`}
            value={draft.id}
            readOnly={!draft.isNew}
            placeholder="stocked"
            title={draft.isNew
              ? 'Short, lowercase. This is what a saved subscription points at.'
              : 'The id cannot change — subscriptions already written point at it.'}
            onChange={e => draft.isNew && setDraft({ ...draft, id: e.target.value })}
          />
        </div>
      </div>

      <div className="mt-3">
        <span className={label}>One line on who it is for</span>
        <input
          className={field}
          value={draft.blurb}
          placeholder="For vendors who stock what they list."
          onChange={e => setDraft({ ...draft, blurb: e.target.value })}
        />
      </div>

      <div className="mt-3">
        <span className={label}>Features — one per line, in the buyer's words</span>
        <textarea
          className={`${field} min-h-[96px] font-mono text-xs`}
          value={draft.featuresText}
          placeholder={'Your catalogue in front of every customer\nQuote on jobs within 50 miles'}
          onChange={e => setDraft({ ...draft, featuresText: e.target.value })}
        />
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <div>
          <span className={label}>Price, dollars</span>
          <input
            className={field}
            inputMode="decimal"
            value={draft.priceDollars}
            placeholder="0"
            onChange={e => setDraft({ ...draft, priceDollars: e.target.value })}
          />
        </div>
        <div>
          <span className={label}>Billed</span>
          <select
            className={field}
            value={draft.interval}
            onChange={e => setDraft({ ...draft, interval: e.target.value === 'year' ? 'year' : 'month' })}
          >
            <option value="month">monthly</option>
            <option value="year">yearly</option>
          </select>
        </div>
        <div>
          <span className={label}>Order</span>
          <input
            className={field}
            inputMode="numeric"
            value={draft.sortOrder}
            title="Lower shows first in the portal."
            onChange={e => setDraft({ ...draft, sortOrder: e.target.value })}
          />
        </div>
      </div>

      {priceMoved && (
        <p className="mt-2 flex gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-2.5 text-[11px] text-amber-300">
          <AlertTriangle className="mt-px h-3.5 w-3.5 shrink-0" />
          <span>
            A Stripe price cannot be changed once it exists, so saving a different
            amount takes this plan off sale until you create a new {mode} price —
            one button, right here, afterwards. Anybody already subscribed keeps
            paying the figure they agreed to.
          </span>
        </p>
      )}

      <div className="mt-3">
        <span className={label}>Limits</span>
        {draft.limits.map((row, i) => (
          <div key={i} className="mb-1.5 flex gap-2">
            <input
              className={`${field} flex-1`}
              value={row.key}
              placeholder="products"
              onChange={e => {
                const next = [...draft.limits];
                next[i] = { ...row, key: e.target.value };
                setDraft({ ...draft, limits: next });
              }}
            />
            <input
              className={`${field} w-28`}
              inputMode="numeric"
              value={row.value}
              placeholder="0"
              onChange={e => {
                const next = [...draft.limits];
                next[i] = { ...row, value: e.target.value };
                setDraft({ ...draft, limits: next });
              }}
            />
            <button
              onClick={() => setDraft({ ...draft, limits: draft.limits.filter((_, j) => j !== i) })}
              className="rounded-lg border border-[#2A2A2A] px-2 text-gray-500 transition hover:text-red-400"
              title="Remove this limit"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
        <button
          onClick={() => setDraft({ ...draft, limits: [...draft.limits, { key: '', value: '' }] })}
          className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-gray-400 transition hover:text-white"
        >
          <Plus className="h-3 w-3" /> Add a limit
        </button>
        {/* Said plainly rather than implied. Publishing a number that nothing
            reads, while the form presents it as a ceiling, would be the kind of
            quiet untruth that only surfaces when a vendor exceeds it and
            nothing happens. */}
        <p className="mt-1.5 text-[11px] text-gray-600">
          0 means unlimited. These are recorded and shown, but nothing in the app
          enforces them yet — treat them as what the plan promises, not as a
          ceiling the software applies.
        </p>
      </div>

      <label className="mt-3 flex items-center gap-2 text-xs text-gray-400">
        <input
          type="checkbox"
          checked={draft.active}
          onChange={e => setDraft({ ...draft, active: e.target.checked })}
          className="h-3.5 w-3.5 accent-orange-500"
        />
        On offer in the portal (uncheck to withdraw without deleting)
      </label>

      <div className="mt-4 flex gap-2">
        <button
          onClick={onSave}
          disabled={saving || !draft.name.trim() || !draft.id.trim()}
          className="inline-flex items-center gap-1.5 rounded-lg bg-orange-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-orange-500 disabled:opacity-50"
        >
          {saving ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving…</> : 'Save plan'}
        </button>
        <button
          onClick={onCancel}
          disabled={saving}
          className="rounded-lg border border-[#2A2A2A] px-4 py-2 text-xs font-semibold text-gray-300 transition hover:text-white disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
    </div>
  );
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
  const [assistantOpen, setAssistantOpen] = useState(false);

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
      try {
        const me = await (await fetch(`${SERVER}/my-plan`, { headers: await headers() })).json();
        setRehearsal(Boolean(me?.rehearsal));
      } catch {
        // Unknown means real, not rehearsal. Being wrong the other way costs money.
        setRehearsal(false);
      }
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

  /**
   * Whether a checkout from THIS account would be a rehearsal or real money.
   *
   * Read from the server, which applies exactly the conditions the checkout
   * applies, so the label on the button cannot disagree with what the button
   * does. Defaults to false — assuming "real" is the safe direction to be
   * wrong in.
   */
  const [rehearsal, setRehearsal] = useState(false);
  /**
   * Recurring prices that already exist in Stripe.
   *
   * Loaded on demand rather than always, because most of the time the create
   * button is the right path and a dropdown of every price in the account is
   * noise. It matters when somebody has already built their prices in the
   * Stripe dashboard — then the price is real, and only this app is unaware.
   */
  const [stripePrices, setStripePrices] = useState<any[] | null>(null);
  const [attaching, setAttaching] = useState<string | null>(null);
  const [checkingHooks, setCheckingHooks] = useState(false);
  const [hookReport, setHookReport] = useState<string[]>([]);

  /**
   * Find this project's Stripe webhook endpoints and make sure each one is
   * subscribed to the events a subscription flow needs.
   *
   * Only endpoints pointing at this project are touched. Stripe accounts often
   * carry endpoints for other things entirely, and adding events to somebody
   * else's endpoint would send them deliveries they never asked for.
   */
  const checkWebhookEvents = async () => {
    setCheckingHooks(true);
    setHookReport([]);
    const lines: string[] = [];
    try {
      const listed = await fetch(`${SERVER}/stripe/webhook-endpoints`, { headers: await headers() });
      const json = await listed.json().catch(() => ({}));
      if (!listed.ok) {
        setHookReport([`! ${json?.error || `Could not list endpoints (${listed.status}).`}`]);
        return;
      }

      const accounts = json?.accounts || {};
      let touched = 0;
      for (const [envName, info] of Object.entries<any>(accounts)) {
        for (const ep of info?.endpoints || []) {
          if (!ep.pointsAtThisProject) continue;
          touched += 1;
          const res = await fetch(
            `${SERVER}/stripe/webhook-endpoints/${encodeURIComponent(ep.id)}/ensure-subscription-events?key=${encodeURIComponent(envName)}`,
            { method: 'POST', headers: await headers() },
          );
          const out = await res.json().catch(() => ({}));
          const where = `${ep.livemode ? 'live' : 'test'} · ${ep.url.replace(/^https:\/\//, '').slice(0, 40)}`;
          if (!res.ok) lines.push(`! ${where}: ${out?.error || res.status}`);
          else if (out.alreadyComplete) lines.push(`✓ ${where}: already complete`);
          else lines.push(`✓ ${where}: added ${(out.added || []).join(', ')}`);
        }
      }
      if (touched === 0) {
        lines.push('! No Stripe webhook endpoint points at this project yet — nothing to fix.');
      }
      setHookReport(lines);
    } catch (e: any) {
      setHookReport([`! ${e?.message || 'Could not reach Stripe.'}`]);
    } finally {
      setCheckingHooks(false);
    }
  };

  /**
   * Start a checkout for this plan as the signed-in administrator.
   *
   * Exists because an administrator never sees the banner that normally sells
   * a plan: the entitlements route short-circuits admins to full access with
   * `needsPlan: false`, and `PortalTrialBanner` returns null for them. So the
   * one person able to rehearse the paid flow is the one person with no button
   * to press.
   *
   * What this rehearses is the chain that matters — checkout, Stripe, the
   * webhook, the grant, and `/my-plan` reflecting it. It does NOT rehearse the
   * banner, which stays invisible to administrators by design. That half needs
   * a non-admin account.
   */
  const rehearse = async (tierId: string) => {
    /**
     * Only a rehearsal when the server says so.
     *
     * With no test key configured this button opens a real Stripe checkout on
     * the live account. A confirm dialog is a weak safeguard in general — but
     * here it is guarding against a mislabelled button rather than a mis-click,
     * and the label itself already says REAL money. This is the second line,
     * not the only one.
     */
    if (!rehearsal) {
      const t = tiers.find(x => x.id === tierId);
      const ok = window.confirm(
        'This is NOT a rehearsal.\n\n'
        + 'No Stripe test key is configured for this account, so buying '
        + `"${t?.name || tierId}" will charge your card ${money(t?.priceCents, t?.interval)} for real.\n\n`
        + 'Continue?',
      );
      if (!ok) return;
    }
    setWorking(tierId);
    try {
      const res = await fetch(`${SERVER}/plan-checkout`, {
        method: 'POST',
        headers: await headers(),
        body: JSON.stringify({ audience, tierId }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.url) {
        toast.error(json?.error || `Could not start checkout (${res.status}).`, { duration: 9000 });
        return;
      }
      window.location.assign(json.url);
    } catch (e: any) {
      toast.error(e?.message || 'Could not reach Stripe.');
    } finally {
      setWorking(null);
    }
  };

  const loadStripePrices = async () => {
    try {
      const res = await fetch(`${SERVER}/stripe-prices?mode=${mode}`, { headers: await headers() });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) { toast.error(json?.error || 'Could not read Stripe prices.'); return; }
      setStripePrices(json.prices || []);
      if ((json.prices || []).length === 0) {
        toast.message(`No recurring ${mode}-mode prices found in Stripe.`);
      }
    } catch (e: any) {
      toast.error(e?.message || 'Could not reach Stripe.');
    }
  };

  const attachPrice = async (tierId: string, priceId: string) => {
    setAttaching(tierId);
    try {
      const res = await fetch(
        `${SERVER}/plan-tiers/${encodeURIComponent(audience)}/${encodeURIComponent(tierId)}/attach-price?mode=${mode}`,
        { method: 'POST', headers: await headers(), body: JSON.stringify({ stripePriceId: priceId }) },
      );
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        // 409 is the amount mismatch, and it is the one worth reading rather
        // than dismissing — it means the portal and the card would disagree.
        toast.error(json?.error || `Could not attach (${res.status}).`, { duration: 12000 });
        return;
      }
      toast.success(`Attached ${json.stripePriceId} — ${money(json.amountCents, json.interval)}.`);
      await load();
    } catch (e: any) {
      toast.error(e?.message || 'Could not attach that price.');
    } finally {
      setAttaching(null);
    }
  };

  /**
   * Editing a plan, and having one drafted.
   *
   * Both end in the same place: the form. The assistant does not save, and
   * there is no path by which it could — what comes back is loaded into
   * `draft` exactly as if it had been typed, and the catalogue changes only
   * when Save is pressed.
   */
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [brief, setBrief] = useState('');
  const [drafting, setDrafting] = useState(false);
  const [proposal, setProposal] = useState<{ tiers: any[]; reasoning?: string; note?: string } | null>(null);

  const saveDraft = async () => {
    if (!draft) return;
    setSaving(true);
    try {
      const res = await fetch(`${SERVER}/plan-tiers/${encodeURIComponent(audience)}`, {
        method: 'POST',
        headers: await headers(),
        body: JSON.stringify(tierFrom(draft)),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(json?.error || `Could not save (${res.status}).`);
        return;
      }
      // The warning is the interesting half — it is how somebody finds out the
      // plan they just saved is not on sale, and why.
      if (json?.warning) toast.warning(json.warning, { duration: 12000 });
      else toast.success(`${draft.name} saved.`);
      setDraft(null);
      await load();
    } catch (e: any) {
      toast.error(e?.message || 'Could not save the plan.');
    } finally {
      setSaving(false);
    }
  };

  const askForDraft = async () => {
    if (!brief.trim()) return;
    setDrafting(true);
    setProposal(null);
    try {
      const res = await fetch(`${SERVER}/plan-draft`, {
        method: 'POST',
        headers: await headers(),
        body: JSON.stringify({ audience, brief }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(json?.error || `Could not draft (${res.status}).`);
        return;
      }
      if (!Array.isArray(json?.tiers) || json.tiers.length === 0) {
        toast.message('Nothing came back. Try saying more about what the plans should do.');
        return;
      }
      setProposal({ tiers: json.tiers, reasoning: json.reasoning, note: json.note });
    } catch (e: any) {
      toast.error(e?.message || 'Could not reach the assistant.');
    } finally {
      setDrafting(false);
    }
  };

  /**
   * Take one proposed tier into the form.
   *
   * An id that already exists loads as an edit of that plan rather than a new
   * one, so the assistant revising "Listed" revises Listed instead of quietly
   * offering to overwrite it under the same key — and the form then shows the
   * price warning if the amount moved.
   */
  const useProposed = (t: any) => {
    const current = tiers.find(x => x.id === t.id);
    setDraft(draftFrom({ ...t, purchasable: current?.purchasable }, !current));
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
            onClick={() => { setDraft(draftFrom({ interval: 'month' }, true)); }}
            className="inline-flex items-center gap-1.5 rounded-lg bg-orange-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-orange-500"
            title="Write a new plan for this portal"
          >
            <Plus className="h-3.5 w-3.5" /> New plan
          </button>
          <button
            onClick={() => setAssistantOpen(v => !v)}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition ${
              assistantOpen
                ? 'border-orange-500/40 text-orange-300'
                : 'border-[#2A2A2A] text-gray-300 hover:border-orange-500/40 hover:text-white'
            }`}
            title="Describe what the plans should do and have a ladder drafted"
          >
            <Sparkles className="h-3.5 w-3.5" /> Assistant
          </button>
          <button
            onClick={loadStripePrices}
            className="rounded-lg border border-[#2A2A2A] px-3 py-2 text-xs font-semibold text-gray-300 transition hover:border-orange-500/40 hover:text-white"
            title="List recurring prices that already exist in Stripe, so one can be attached to a plan"
          >
            Find prices in Stripe
          </button>
          <button
            onClick={() => void load()}
            className="rounded-lg border border-[#2A2A2A] p-2 text-gray-400 transition hover:text-white"
            title="Reload"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* ── Have the ladder drafted ───────────────────────────────────
          The prices are the easy part; making the rungs step sensibly is not,
          and it is only visible with the whole ladder in view. This writes
          nothing — what comes back lands in the form, and the catalogue
          changes when Save is pressed and not before. */}
      {assistantOpen && (
        <div className="mb-4 rounded-xl border border-[#2A2A2A] bg-[#0A0A0A] p-4">
          <p className="flex items-center gap-2 text-sm font-bold text-white">
            <Sparkles className="h-4 w-4 text-orange-400" /> Draft the plans
          </p>
          <p className="mt-1 text-[11px] text-gray-500">
            Say what these plans should do for a {audience.replace(/_/g, ' ')} and what
            you want to charge. It proposes; nothing is saved until you press Save on
            a plan.
          </p>
          <textarea
            className="mt-2 min-h-[72px] w-full rounded-lg border border-[#2A2A2A] bg-[#111] px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:border-orange-500 focus:outline-none"
            value={brief}
            placeholder="Three tiers for suppliers. Bottom one free so they can list a few products. Middle around $79 for anyone who stocks what they list. Top tier gets first refusal on jobs within 50 miles."
            onChange={e => setBrief(e.target.value)}
          />
          <button
            onClick={askForDraft}
            disabled={drafting || !brief.trim()}
            className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-orange-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-orange-500 disabled:opacity-50"
          >
            {drafting
              ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Drafting…</>
              : 'Draft plans'}
          </button>

          {proposal && (
            <div className="mt-3 border-t border-[#2A2A2A] pt-3">
              {proposal.reasoning && (
                <p className="mb-2 text-[11px] italic text-gray-400">{proposal.reasoning}</p>
              )}
              <div className="space-y-2">
                {proposal.tiers.map((t: any) => (
                  <div key={t.id} className="rounded-lg border border-[#2A2A2A] bg-[#111] p-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-white">
                          {t.name}{' '}
                          <span className="font-normal text-orange-400">
                            {money(t.priceCents, t.interval)}
                          </span>
                          {tiers.some(x => x.id === t.id) && (
                            <span className="ml-2 rounded bg-blue-500/15 px-1.5 py-0.5 text-[10px] font-bold text-blue-300">
                              REPLACES {t.id}
                            </span>
                          )}
                        </p>
                        {t.blurb && <p className="mt-0.5 text-[11px] text-gray-500">{t.blurb}</p>}
                        <ul className="mt-1 space-y-0.5 text-[11px] text-gray-400">
                          {(t.features || []).map((f: string, i: number) => <li key={i}>· {f}</li>)}
                        </ul>
                        {Object.keys(t.limits || {}).length > 0 && (
                          <p className="mt-1 font-mono text-[10px] text-gray-600">
                            {Object.entries(t.limits).map(([k, v]) => `${k}: ${v === 0 ? '∞' : v}`).join('  ·  ')}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => useProposed(t)}
                        className="shrink-0 rounded-lg border border-[#2A2A2A] px-3 py-1.5 text-[11px] font-bold text-gray-200 transition hover:border-orange-500/40 hover:text-white"
                      >
                        Open in the form
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <p className="mt-2 text-[11px] text-gray-600">{proposal.note}</p>
            </div>
          )}
        </div>
      )}

      {draft && (
        <TierEditor
          draft={draft}
          setDraft={setDraft}
          onSave={saveDraft}
          onCancel={() => setDraft(null)}
          saving={saving}
          mode={mode}
        />
      )}

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
                    <button
                      onClick={() => setDraft(draftFrom(t, false))}
                      className="mb-2 mr-2 inline-flex items-center gap-1 rounded-lg border border-[#2A2A2A] px-2.5 py-1.5 text-xs font-semibold text-gray-300 transition hover:border-orange-500/40 hover:text-white"
                      title="Edit this plan's name, features, limits and price"
                    >
                      <Pencil className="h-3 w-3" /> Edit
                    </button>
                    {t.purchasable ? (
                      <>
                        <p className="mb-2 inline-flex items-center gap-1.5 rounded-lg border border-green-500/20 bg-green-500/10 px-2.5 py-1.5 text-xs font-bold text-green-400">
                          <CheckCircle2 className="h-3.5 w-3.5" /> On sale
                        </p>
                        {/* An administrator never sees the banner that sells
                            this, so without a button here the one person who
                            can rehearse the flow has no way to start it. */}
                        <button
                          onClick={() => rehearse(t.id)}
                          disabled={working !== null}
                          className="block w-full rounded-lg border border-[#2A2A2A] px-3 py-2 text-xs font-bold text-gray-200 transition hover:border-orange-500/40 disabled:opacity-50"
                        >
                          {working === t.id
                            ? <span className="inline-flex items-center gap-1.5"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Opening…</span>
                            : rehearsal ? 'Buy it myself (rehearsal)' : 'Buy it myself (REAL money)'}
                        </button>
                      </>
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

                        {/* For prices already built in the Stripe dashboard.
                            Attaching checks the amount against the plan and
                            refuses a mismatch — the portal advertising one
                            number while the card is charged another is not a
                            formatting problem. */}
                        {stripePrices && stripePrices.length > 0 && (
                          <select
                            defaultValue=""
                            disabled={attaching !== null}
                            onChange={e => { if (e.target.value) attachPrice(t.id, e.target.value); }}
                            className="mt-1.5 block w-full rounded-lg border border-[#2A2A2A] bg-[#0A0A0A] px-2 py-1.5 text-[11px] text-gray-300 focus:border-orange-500 focus:outline-none"
                          >
                            <option value="">…or attach an existing one</option>
                            {stripePrices.map(p => (
                              <option key={p.id} value={p.id}>
                                {p.productName || p.id} — {money(p.amountCents, p.interval)}
                              </option>
                            ))}
                          </select>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
          {/* ── The events without which none of this works ────────────────
              Missing one is silent and slow: no `customer.subscription.deleted`
              means a cancellation never arrives and the customer keeps paid
              access for good; no `.updated` means a failed renewal never
              arrives and we go on treating them as paying. Neither surfaces as
              an error anywhere, which is why it gets a button rather than a
              line in a runbook. */}
          <div className="mt-4 rounded-lg border border-[#2A2A2A] bg-[#0A0A0A] p-3">
            <p className="text-xs font-semibold text-gray-300">Stripe webhook events</p>
            <p className="mt-1 text-[11px] text-gray-500">
              Subscriptions need Stripe to tell us about cancellations and failed
              renewals. Without those events access is never withdrawn, and nothing
              anywhere reports it.
            </p>
            <button
              onClick={checkWebhookEvents}
              disabled={checkingHooks}
              className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-[#2A2A2A] px-3 py-1.5 text-xs font-bold text-gray-200 transition hover:border-orange-500/40 disabled:opacity-50"
            >
              {checkingHooks
                ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Checking…</>
                : 'Check and fix webhook events'}
            </button>
            {hookReport.length > 0 && (
              <ul className="mt-2 space-y-1 text-[11px]">
                {hookReport.map((line, i) => (
                  <li key={i} className={line.startsWith('✓') ? 'text-green-400' : line.startsWith('!') ? 'text-amber-400' : 'text-gray-400'}>
                    {line}
                  </li>
                ))}
              </ul>
            )}
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
