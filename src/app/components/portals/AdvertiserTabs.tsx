/**
 * AdvertiserTabs — Campaigns, Media, Analytics, Performance and Billing.
 *
 * All five were cards reading "...would be displayed here", which was the odd
 * part: the backend behind them already existed. `advertising.tsx` serves ads,
 * counts every impression and click per creative, and rolls them up by day. The
 * portal was already fetching all of it on mount and showing almost none of it.
 *
 * WHAT IS NOT HERE, AND WHY
 *
 * No conversions, no return on ad spend, no "audience reach". Every one of those
 * needs to know that a click led to a purchase, and nothing in this platform
 * attributes a sale back to an ad. This screen previously claimed 415,000
 * impressions, a 3.0% click-through rate, 207 conversions and 385% ROI — every
 * figure a literal, on a screen an advertiser might renew a contract on the
 * strength of. Everything below is counted or it is absent.
 *
 * ANALYTICS VERSUS PERFORMANCE
 *
 * They are the same numbers cut two ways, deliberately. Analytics is the trend:
 * what happened, day by day. Performance is the decision: which creative earns
 * its place and which one should be killed. Splitting them that way is the only
 * reason two tabs are worth having.
 */
import { useMemo, useState } from 'react';
import {
  Megaphone, Plus, X, Loader2, Trash2, Play, Pause, BarChart3, MousePointerClick,
  Eye, Image as ImageIcon, TrendingUp, TrendingDown, CreditCard, Check, AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { projectId } from '../../utils/supabase/info';
import { ADVERTISER_PLANS, ADVERTISER_WEEKLY_PLANS, type SubscriptionPlan } from '../../config/subscriptionPlans';

const API = `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6`;

const num = (n: unknown) => (Number(n) || 0).toLocaleString();
const pct = (n: unknown) => `${(Number(n) || 0).toFixed(2)}%`;

/**
 * Click-through rate, in one place.
 *
 * Four tabs show this number. Computing it in four places is how two tabs end
 * up disagreeing about the same campaign.
 */
export const ctrOf = (impressions: number, clicks: number) =>
  impressions > 0 ? (clicks / impressions) * 100 : 0;

export interface AdvertiserTabProps {
  session: any;
  adStats: any;
  adDaily: any[];
  adByCreative: any[];
  creatives: any[];
  campaigns: any[];
  loading: boolean;
  /** Re-runs the portal's own loader after a write. */
  reload: () => void | Promise<void>;
  subscriptionTier?: string;
}

const headersOf = (session: any) => ({
  Authorization: `Bearer ${session?.access_token || ''}`,
  'Content-Type': 'application/json',
});

function Empty({ icon: Icon, title, body }: any) {
  return (
    <div className="rounded-lg border border-[#2A2A2A] bg-[#0A0A0A] p-10 text-center">
      <Icon className="mx-auto mb-3 h-8 w-8 text-gray-600" />
      <p className="font-semibold text-white">{title}</p>
      <p className="mx-auto mt-2 max-w-md text-sm text-gray-400">{body}</p>
    </div>
  );
}

function Loading() {
  return (
    <div className="flex items-center justify-center gap-2 py-12 text-sm text-gray-400">
      <Loader2 className="h-4 w-4 animate-spin" /> Loading…
    </div>
  );
}

function Stat({ label, value, sub, icon: Icon, tone = 'white' }: any) {
  const tones: Record<string, string> = {
    white: 'text-white', green: 'text-green-400', orange: 'text-orange-400', red: 'text-red-400',
  };
  return (
    <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-4">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
        {Icon && <Icon className="h-3.5 w-3.5" />} {label}
      </div>
      <p className={`mt-2 text-2xl font-bold tabular-nums ${tones[tone]}`}>{value}</p>
      {sub && <p className="mt-1 text-xs text-gray-500">{sub}</p>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Campaigns
// ─────────────────────────────────────────────────────────────────────────────
export function AdvertiserCampaignsTab({ session, campaigns, creatives, loading, reload }: AdvertiserTabProps) {
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ name: '', objective: '' });

  const save = async (payload: any, message: string) => {
    setBusy(true);
    try {
      const res = await fetch(`${API}/advertising/campaigns`, {
        method: 'POST', headers: headersOf(session), body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.success === false) throw new Error(data?.error || `HTTP ${res.status}`);
      toast.success(message);
      setAdding(false);
      setForm({ name: '', objective: '' });
      await reload();
    } catch (e: any) {
      toast.error(e?.message || 'Could not save the campaign.');
    } finally { setBusy(false); }
  };

  if (loading) return <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-6"><Loading /></div>;

  const STATUS: Record<string, string> = {
    active: 'border-green-500/30 bg-green-500/10 text-green-300',
    paused: 'border-yellow-500/30 bg-yellow-500/10 text-yellow-300',
    draft: 'border-[#3A3A3A] bg-[#222] text-gray-400',
    ended: 'border-[#3A3A3A] bg-[#222] text-gray-500',
  };

  return (
    <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-white">Campaigns</h2>
          <p className="mt-1 text-sm text-gray-400">
            A campaign groups your ads. Pausing one stops every ad inside it from being served.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setAdding((v) => !v)}
          className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-orange-500"
        >
          {adding ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {adding ? 'Cancel' : 'New campaign'}
        </button>
      </div>

      {adding && (
        <div className="mb-6 rounded-lg border border-orange-500/30 bg-orange-500/5 p-4 sm:p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-400">Name</span>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Spring kitchen promotion"
                className="w-full rounded-lg border border-[#2A2A2A] bg-[#0A0A0A] px-3 py-2 text-sm text-white"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-400">Objective (optional)</span>
              <input
                value={form.objective}
                onChange={(e) => setForm({ ...form, objective: e.target.value })}
                placeholder="What this campaign is for"
                className="w-full rounded-lg border border-[#2A2A2A] bg-[#0A0A0A] px-3 py-2 text-sm text-white"
              />
            </label>
          </div>
          <button
            type="button"
            disabled={busy || !form.name.trim()}
            onClick={() => save({ ...form, status: 'active' }, `Campaign "${form.name}" created.`)}
            className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-lg bg-orange-600 px-5 py-2 text-sm font-bold text-white transition hover:bg-orange-500 disabled:opacity-40"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Megaphone className="h-4 w-4" />}
            Create campaign
          </button>
        </div>
      )}

      {campaigns.length === 0 ? (
        <Empty
          icon={Megaphone}
          title="No campaigns yet"
          body="Create a campaign, then add ads to it on the Media tab. Ads only get served once they belong to an active campaign."
        />
      ) : (
        <div className="space-y-3">
          {campaigns.map((c) => {
            const inCampaign = creatives.filter((cr) => String(cr.campaignId || '') === String(c.id));
            const live = inCampaign.filter((cr) => cr.isActive).length;
            return (
              <div key={c.id} className="rounded-lg border border-[#2A2A2A] bg-[#0A0A0A] p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-bold text-white">{c.name}</p>
                      <span className={`rounded border px-2 py-0.5 text-xs font-semibold capitalize ${STATUS[String(c.status)] || STATUS.draft}`}>
                        {c.status}
                      </span>
                    </div>
                    {c.objective && <p className="mt-1 text-sm text-gray-400">{c.objective}</p>}
                    <p className="mt-1 text-xs text-gray-500">
                      {inCampaign.length} ad{inCampaign.length === 1 ? '' : 's'}
                      {inCampaign.length > 0 && ` · ${live} live`}
                      {c.startsAt && ` · started ${String(c.startsAt).slice(0, 10)}`}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {c.status === 'active' ? (
                      <button
                        type="button" disabled={busy}
                        onClick={() => save({ id: c.id, name: c.name, status: 'paused' }, `"${c.name}" paused.`)}
                        className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-yellow-500/40 px-3 py-1.5 text-xs font-bold text-yellow-300 transition hover:bg-yellow-500/10 disabled:opacity-40"
                      >
                        <Pause className="h-3.5 w-3.5" /> Pause
                      </button>
                    ) : c.status !== 'ended' && (
                      <button
                        type="button" disabled={busy}
                        onClick={() => save({ id: c.id, name: c.name, status: 'active' }, `"${c.name}" is live.`)}
                        className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-green-500/40 px-3 py-1.5 text-xs font-bold text-green-300 transition hover:bg-green-500/10 disabled:opacity-40"
                      >
                        <Play className="h-3.5 w-3.5" /> Resume
                      </button>
                    )}
                    {c.status !== 'ended' && (
                      <button
                        type="button" disabled={busy}
                        onClick={() => save({ id: c.id, name: c.name, status: 'ended' }, `"${c.name}" ended.`)}
                        className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-[#3A3A3A] px-3 py-1.5 text-xs font-bold text-gray-300 transition hover:bg-[#222] disabled:opacity-40"
                      >
                        End
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Media — the creative library
// ─────────────────────────────────────────────────────────────────────────────
export function AdvertiserMediaTab({ session, creatives, campaigns, adByCreative, loading, reload }: AdvertiserTabProps) {
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState(false);
  const empty = { title: '', content: '', linkUrl: '', imageUrl: '', campaignId: '', placement: 'marquee' };
  const [form, setForm] = useState<any>(empty);

  const post = async (payload: any, message: string) => {
    setBusy(true);
    try {
      const res = await fetch(`${API}/advertising/creatives`, {
        method: 'POST', headers: headersOf(session), body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.success === false) throw new Error(data?.error || `HTTP ${res.status}`);
      toast.success(message);
      setAdding(false);
      setForm(empty);
      await reload();
    } catch (e: any) {
      toast.error(e?.message || 'Could not save the ad.');
    } finally { setBusy(false); }
  };

  const remove = async (creative: any) => {
    setBusy(true);
    try {
      const res = await fetch(`${API}/advertising/creatives/${creative.id}`, {
        method: 'DELETE', headers: headersOf(session),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.success === false) throw new Error(data?.error || `HTTP ${res.status}`);
      toast.success(`"${creative.title}" deleted.`);
      await reload();
    } catch (e: any) {
      toast.error(e?.message || 'Could not delete the ad.');
    } finally { setBusy(false); }
  };

  if (loading) return <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-6"><Loading /></div>;

  return (
    <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-white">Media library</h2>
          <p className="mt-1 text-sm text-gray-400">
            Your ads, and where each one runs. Only ads that are live and in an active campaign get served.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setAdding((v) => !v)}
          className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-orange-500"
        >
          {adding ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {adding ? 'Cancel' : 'New ad'}
        </button>
      </div>

      {adding && (
        <div className="mb-6 rounded-lg border border-orange-500/30 bg-orange-500/5 p-4 sm:p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-400">Headline</span>
              <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="What the reader sees first"
                className="w-full rounded-lg border border-[#2A2A2A] bg-[#0A0A0A] px-3 py-2 text-sm text-white" />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-400">Campaign</span>
              <select value={form.campaignId} onChange={(e) => setForm({ ...form, campaignId: e.target.value })}
                className="w-full rounded-lg border border-[#2A2A2A] bg-[#0A0A0A] px-3 py-2 text-sm text-white">
                <option value="">— none —</option>
                {campaigns.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </label>
            <label className="block sm:col-span-2">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-400">Body</span>
              <input value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })}
                placeholder="One line. The strip is narrow."
                className="w-full rounded-lg border border-[#2A2A2A] bg-[#0A0A0A] px-3 py-2 text-sm text-white" />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-400">Link</span>
              <input value={form.linkUrl} onChange={(e) => setForm({ ...form, linkUrl: e.target.value })}
                placeholder="https://"
                className="w-full rounded-lg border border-[#2A2A2A] bg-[#0A0A0A] px-3 py-2 text-sm text-white" />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-400">Placement</span>
              <select value={form.placement} onChange={(e) => setForm({ ...form, placement: e.target.value })}
                className="w-full rounded-lg border border-[#2A2A2A] bg-[#0A0A0A] px-3 py-2 text-sm text-white">
                <option value="marquee">Marquee strip</option>
                <option value="banner">Banner</option>
                <option value="reel">Reel</option>
              </select>
            </label>
          </div>
          <button
            type="button" disabled={busy || !form.title.trim()}
            onClick={() => post({ ...form, isActive: true }, `"${form.title}" created.`)}
            className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-lg bg-orange-600 px-5 py-2 text-sm font-bold text-white transition hover:bg-orange-500 disabled:opacity-40"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-4 w-4" />}
            Create ad
          </button>
        </div>
      )}

      {creatives.length === 0 ? (
        <Empty
          icon={ImageIcon}
          title="No ads yet"
          body="Create an ad and it can start running on the marquee strip, which the platform renders across the portals and the store."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {creatives.map((cr) => {
            const stat = adByCreative.find((s) => String(s.creativeId) === String(cr.id));
            const campaign = campaigns.find((c) => String(c.id) === String(cr.campaignId || ''));
            return (
              <div key={cr.id} className="flex flex-col rounded-lg border border-[#2A2A2A] bg-[#0A0A0A] p-4">
                <div className="mb-2 flex items-start justify-between gap-2">
                  <p className="min-w-0 font-bold text-white">{cr.title}</p>
                  <span className={`shrink-0 rounded border px-2 py-0.5 text-xs font-semibold ${
                    cr.isActive ? 'border-green-500/30 bg-green-500/10 text-green-300' : 'border-[#3A3A3A] bg-[#222] text-gray-500'
                  }`}>
                    {cr.isActive ? 'Live' : 'Off'}
                  </span>
                </div>
                {cr.content && <p className="mb-2 text-sm text-gray-400">{cr.content}</p>}
                <p className="mb-3 text-xs text-gray-500">
                  {cr.placement} · {campaign ? campaign.name : 'no campaign'}
                </p>

                {/* Counted, or plainly nothing. A creative that has never been
                    served says so rather than showing a confident zero. */}
                <div className="mt-auto border-t border-[#2A2A2A] pt-3 text-sm">
                  {stat ? (
                    <p className="tabular-nums text-gray-300">
                      {num(stat.impressions)} shown · {num(stat.clicks)} clicks ·{' '}
                      <span className="font-semibold text-white">{pct(ctrOf(stat.impressions, stat.clicks))}</span>
                    </p>
                  ) : (
                    <p className="text-gray-500">Not served yet</p>
                  )}
                </div>

                <div className="mt-3 flex gap-2">
                  <button
                    type="button" disabled={busy}
                    onClick={() => post({ id: cr.id, title: cr.title, isActive: !cr.isActive }, cr.isActive ? `"${cr.title}" paused.` : `"${cr.title}" is live.`)}
                    className="inline-flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-lg border border-[#3A3A3A] px-3 py-1.5 text-xs font-bold text-gray-300 transition hover:bg-[#222] disabled:opacity-40"
                  >
                    {cr.isActive ? <><Pause className="h-3.5 w-3.5" /> Pause</> : <><Play className="h-3.5 w-3.5" /> Run</>}
                  </button>
                  <button
                    type="button" disabled={busy} onClick={() => remove(cr)}
                    className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-lg border border-red-500/40 px-3 py-1.5 text-xs font-bold text-red-300 transition hover:bg-red-500/10 disabled:opacity-40"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Analytics — the trend
// ─────────────────────────────────────────────────────────────────────────────
export function AdvertiserAnalyticsTab({ adStats, adDaily, loading }: AdvertiserTabProps) {
  if (loading) return <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-6"><Loading /></div>;

  const days = adDaily || [];
  const peak = days.reduce((m, d) => Math.max(m, Number(d.impressions || 0)), 0);
  const best = days.reduce((b: any, d: any) => (Number(d.impressions || 0) > Number(b?.impressions || 0) ? d : b), null);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Impressions" value={num(adStats?.impressions)} icon={Eye}
          sub={adStats?.days ? `last ${adStats.days} days` : ''} />
        <Stat label="Clicks" value={num(adStats?.clicks)} icon={MousePointerClick} />
        <Stat label="Click-through rate" value={pct(adStats?.ctr)} icon={BarChart3}
          sub="clicks per impression" />
        <Stat label="Live ads" value={`${num(adStats?.activeCreatives)} of ${num(adStats?.totalCreatives)}`} icon={ImageIcon} />
      </div>

      <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-6">
        <h2 className="text-lg font-bold text-white">Day by day</h2>
        <p className="mt-1 mb-5 text-sm text-gray-400">
          Impressions and clicks per day, counted as they were served.
        </p>

        {days.length === 0 ? (
          <Empty
            icon={BarChart3}
            title="Nothing served yet"
            body="Once an ad in an active campaign starts appearing, its impressions and clicks are counted here every day."
          />
        ) : (
          <div className="space-y-2">
            {days.map((d: any) => {
              const width = peak > 0 ? (Number(d.impressions || 0) / peak) * 100 : 0;
              return (
                <div key={d.date}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="text-gray-400">{d.date}</span>
                    <span className="tabular-nums text-gray-300">
                      {num(d.impressions)} shown · {num(d.clicks)} clicks ·{' '}
                      <span className="font-semibold text-white">{pct(ctrOf(d.impressions, d.clicks))}</span>
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-[#0A0A0A]">
                    <div className="h-full rounded-full bg-orange-500" style={{ width: `${width}%` }} />
                  </div>
                </div>
              );
            })}
            {best && (
              <p className="pt-3 text-sm text-gray-500">
                Busiest day was {best.date}, at {num(best.impressions)} impressions.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Performance — the decision
// ─────────────────────────────────────────────────────────────────────────────
export function AdvertiserPerformanceTab({ adStats, adByCreative, creatives, campaigns, loading }: AdvertiserTabProps) {
  const ranked = useMemo(() => {
    return (adByCreative || [])
      .map((s: any) => ({ ...s, ctr: ctrOf(s.impressions, s.clicks) }))
      // Ranked by click-through rate, not by impressions. Impressions measure
      // how much we showed something, which is a budget decision, not a
      // judgement on the ad. Click-through is the ad doing its job.
      .sort((a, b) => b.ctr - a.ctr);
  }, [adByCreative]);

  if (loading) return <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-6"><Loading /></div>;

  const average = Number(adStats?.ctr || 0);
  // A creative needs to have been shown enough times for its rate to mean
  // anything. Two clicks from three impressions is not a 67% winner.
  const FLOOR = 200;
  const judged = ranked.filter((r) => r.impressions >= FLOOR);
  const tooEarly = ranked.filter((r) => r.impressions < FLOOR);
  const never = (creatives || []).filter((cr) => !ranked.some((r) => String(r.creativeId) === String(cr.id)));

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-6">
        <h2 className="text-lg font-bold text-white">What is working</h2>
        <p className="mt-1 mb-5 text-sm text-gray-400">
          Your ads ranked by click-through rate against your {pct(average)} average.
          Ads shown fewer than {num(FLOOR)} times are held back — a rate from a handful
          of impressions is noise.
        </p>

        {judged.length === 0 ? (
          <Empty
            icon={TrendingUp}
            title={ranked.length ? 'Not enough data to rank yet' : 'Nothing served yet'}
            body={ranked.length
              ? `Your ads have been shown, but none has reached ${num(FLOOR)} impressions yet. Ranking them now would mostly measure luck.`
              : 'Once your ads start running, the ones earning their place show up here and the ones to kill do too.'}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] text-sm">
              <thead>
                <tr className="border-b border-[#2A2A2A] text-left text-xs uppercase tracking-wide text-gray-500">
                  <th className="pb-3 pr-4 font-semibold">Ad</th>
                  <th className="pb-3 pr-4 text-right font-semibold">Shown</th>
                  <th className="pb-3 pr-4 text-right font-semibold">Clicks</th>
                  <th className="pb-3 pr-4 text-right font-semibold">CTR</th>
                  <th className="pb-3 font-semibold">Against average</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2A2A2A]">
                {judged.map((r) => {
                  const delta = average > 0 ? ((r.ctr - average) / average) * 100 : 0;
                  const good = delta >= 0;
                  return (
                    <tr key={r.creativeId} className="text-gray-300">
                      <td className="py-3 pr-4 font-semibold text-white">{r.title}</td>
                      <td className="py-3 pr-4 text-right tabular-nums">{num(r.impressions)}</td>
                      <td className="py-3 pr-4 text-right tabular-nums">{num(r.clicks)}</td>
                      <td className="py-3 pr-4 text-right font-semibold tabular-nums text-white">{pct(r.ctr)}</td>
                      <td className="py-3">
                        <span className={`inline-flex items-center gap-1 text-sm font-semibold ${good ? 'text-green-400' : 'text-red-400'}`}>
                          {good ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                          {good ? '+' : ''}{delta.toFixed(0)}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {(tooEarly.length > 0 || never.length > 0) && (
        <div className="grid gap-6 lg:grid-cols-2">
          {tooEarly.length > 0 && (
            <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-6">
              <h3 className="font-bold text-white">Still gathering</h3>
              <p className="mt-1 mb-4 text-sm text-gray-400">
                Running, but not shown enough times to judge.
              </p>
              <div className="space-y-2">
                {tooEarly.map((r) => (
                  <div key={r.creativeId} className="flex items-center justify-between gap-3 text-sm">
                    <span className="min-w-0 truncate text-gray-300">{r.title}</span>
                    <span className="shrink-0 tabular-nums text-gray-500">{num(r.impressions)} of {num(FLOOR)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {never.length > 0 && (
            <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-6">
              <h3 className="font-bold text-white">Never served</h3>
              <p className="mt-1 mb-4 text-sm text-gray-400">
                These have not been shown once. Usually that means the ad is paused, or its
                campaign is not active.
              </p>
              <div className="space-y-2">
                {never.map((cr) => {
                  const campaign = campaigns.find((c) => String(c.id) === String(cr.campaignId || ''));
                  const why = !cr.isActive
                    ? 'ad is paused'
                    : !campaign
                      ? 'not in a campaign'
                      : campaign.status !== 'active'
                        ? `campaign is ${campaign.status}`
                        : 'waiting to be served';
                  return (
                    <div key={cr.id} className="flex items-center justify-between gap-3 text-sm">
                      <span className="min-w-0 truncate text-gray-300">{cr.title}</span>
                      <span className="shrink-0 text-yellow-400/80">{why}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Billing
// ─────────────────────────────────────────────────────────────────────────────
export function AdvertiserBillingTab({ adStats, campaigns, loading, subscriptionTier = 'starter' }: AdvertiserTabProps) {
  const [interval, setInterval] = useState<'month' | 'week'>('month');

  const plans = interval === 'week' ? ADVERTISER_WEEKLY_PLANS : ADVERTISER_PLANS;
  const current: SubscriptionPlan | undefined =
    ADVERTISER_PLANS.find((p) => p.tier === subscriptionTier) || ADVERTISER_PLANS[0];

  if (loading) return <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-6"><Loading /></div>;

  const impressionCap = Number(current?.limits?.impressions || 0);
  const campaignCap = Number(current?.limits?.campaigns || 0);
  const unlimited = (n: number) => n >= 999999;

  const used = Number(adStats?.impressions || 0);
  const liveCampaigns = (campaigns || []).filter((c) => String(c.status) === 'active').length;
  const impressionPct = unlimited(impressionCap) || !impressionCap ? 0 : Math.min(100, (used / impressionCap) * 100);
  const campaignPct = unlimited(campaignCap) || !campaignCap ? 0 : Math.min(100, (liveCampaigns / campaignCap) * 100);

  const bar = (p: number) => (p >= 90 ? 'bg-red-500' : p >= 75 ? 'bg-yellow-500' : 'bg-green-500');

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-orange-500/30 bg-orange-500/5 p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-orange-400">Your plan</p>
            <h2 className="mt-1 text-2xl font-bold text-white">{current?.name}</h2>
            <p className="mt-1 text-sm text-gray-400">{current?.tagline}</p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold tabular-nums text-white">${num(current?.regularPrice)}</p>
            <p className="text-sm text-gray-400">per month</p>
          </div>
        </div>
      </div>

      {/* Usage is the honest part of a billing screen: these are the same
          impressions the ad server counted, measured against the cap the plan
          actually sells. Nothing here is estimated. */}
      <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-6">
        <h3 className="font-bold text-white">What you have used</h3>
        <p className="mt-1 mb-5 text-sm text-gray-400">
          Counted over the last {num(adStats?.days || 90)} days, from ads actually served.
        </p>

        <div className="space-y-5">
          <div>
            <div className="mb-1 flex flex-wrap items-center justify-between gap-2 text-sm">
              <span className="text-gray-300">Impressions</span>
              <span className="tabular-nums text-gray-400">
                {num(used)} {unlimited(impressionCap) ? '· unlimited on this plan' : `of ${num(impressionCap)}`}
              </span>
            </div>
            {!unlimited(impressionCap) && (
              <div className="h-2 overflow-hidden rounded-full bg-[#0A0A0A]">
                <div className={`h-full rounded-full ${bar(impressionPct)}`} style={{ width: `${impressionPct}%` }} />
              </div>
            )}
          </div>

          <div>
            <div className="mb-1 flex flex-wrap items-center justify-between gap-2 text-sm">
              <span className="text-gray-300">Active campaigns</span>
              <span className="tabular-nums text-gray-400">
                {num(liveCampaigns)} {unlimited(campaignCap) ? '· unlimited on this plan' : `of ${num(campaignCap)}`}
              </span>
            </div>
            {!unlimited(campaignCap) && (
              <div className="h-2 overflow-hidden rounded-full bg-[#0A0A0A]">
                <div className={`h-full rounded-full ${bar(campaignPct)}`} style={{ width: `${campaignPct}%` }} />
              </div>
            )}
          </div>
        </div>

        {impressionPct >= 90 && !unlimited(impressionCap) && (
          <div className="mt-5 flex items-start gap-2 rounded-lg border border-yellow-500/30 bg-yellow-500/5 p-3 text-sm text-yellow-200">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            You are close to your impression allowance. Ads stop being served once it runs out.
          </div>
        )}
      </div>

      <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-white">Change your plan</h3>
            <p className="mt-1 text-sm text-gray-400">
              Weekly suits a campaign built around one promotion. Monthly is better value if you
              advertise continuously.
            </p>
          </div>
          <div className="inline-flex rounded-lg border border-[#2A2A2A] bg-[#0A0A0A] p-1">
            {(['month', 'week'] as const).map((i) => (
              <button
                key={i}
                type="button"
                onClick={() => setInterval(i)}
                className={`min-h-11 rounded-md px-4 py-1.5 text-sm font-semibold transition ${
                  interval === i ? 'bg-orange-600 text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                {i === 'month' ? 'Monthly' : 'Weekly'}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          {plans.map((p) => {
            const isCurrent = interval === 'month' && p.tier === subscriptionTier;
            return (
              <div
                key={p.id}
                className={`flex flex-col rounded-lg border p-5 ${
                  isCurrent ? 'border-orange-500/50 bg-orange-500/5' : 'border-[#2A2A2A] bg-[#0A0A0A]'
                }`}
              >
                <p className="font-bold text-white">{p.name}</p>
                <p className="mt-1 text-sm text-gray-400">{p.tagline}</p>
                <p className="mt-3">
                  <span className="text-2xl font-bold tabular-nums text-white">${num(p.regularPrice)}</span>
                  <span className="text-sm text-gray-400"> / {interval === 'week' ? 'week' : 'month'}</span>
                </p>
                <ul className="mt-4 space-y-1.5">
                  {p.features.slice(0, 5).map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-gray-300">
                      <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-green-400" /> {f}
                    </li>
                  ))}
                </ul>
                <p className="mt-4 text-xs text-gray-500">
                  {unlimited(Number(p.limits?.impressions)) ? 'Unlimited impressions' : `${num(p.limits?.impressions)} impressions`}
                  {' · '}
                  {unlimited(Number(p.limits?.campaigns)) ? 'unlimited campaigns' : `${num(p.limits?.campaigns)} campaigns`}
                </p>
                <button
                  type="button"
                  disabled={isCurrent}
                  onClick={() => toast.info(`Your account manager will move you to ${p.name}. Nothing has been charged.`)}
                  className={`mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-bold transition ${
                    isCurrent
                      ? 'cursor-default border border-orange-500/40 text-orange-300'
                      : 'bg-orange-600 text-white hover:bg-orange-500'
                  }`}
                >
                  {isCurrent ? 'Current plan' : <><CreditCard className="h-4 w-4" /> Switch to this</>}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
