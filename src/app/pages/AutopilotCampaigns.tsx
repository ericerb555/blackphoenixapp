/**
 * Autopilot Campaigns — the hands-off growth agent (ScaleShot-style).
 *
 * Flow: pick a product → set a goal/budget/cadence → AI generates a dated
 * content plan → AI generates captions + hero images → the runner auto-publishes
 * each post to the connected Facebook / Instagram account when its due time
 * arrives.
 *
 * SCHEDULING NOTE (honest): this environment has no server cron, so the runner
 * is driven by a client heartbeat while this tab is open, plus a catch-up on
 * load. The server endpoint (advance) is idempotent, so posts never double-fire.
 * A future external cron can hit /autopilot/tick for fully-closed operation.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Card, CardHeader, CardTitle, CardDescription, CardContent,
} from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Input } from '../components/ui/Input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import {
  Rocket, Bot, CalendarClock, CheckCircle2, XCircle, Clock, Pause, Play,
  Trash2, Sparkles, ImageIcon, AlertTriangle, Loader2, Facebook, Instagram, RefreshCw,
  ThumbsUp, Ban, Pencil, Wand2, ShieldCheck, Save, X,
} from 'lucide-react';
import { toast } from 'sonner';
import { publicAnonKey, projectId } from '../utils/supabase/info';
import { supabase } from '../lib/supabase';
import { useStoreProducts, StoreCatalogProduct } from '../lib/useStoreProducts';

const SERVER = `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6`;
const HEARTBEAT_MS = 60_000;

async function authToken(): Promise<string> {
  try {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token || publicAnonKey;
  } catch {
    return publicAnonKey;
  }
}

async function api(path: string, method: 'GET' | 'POST' | 'DELETE' = 'GET', body?: any) {
  const token = await authToken();
  const res = await fetch(`${SERVER}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      apikey: publicAnonKey,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json: any = {};
  try { json = text ? JSON.parse(text) : {}; } catch { json = { raw: text }; }
  if (!res.ok) throw new Error(json?.error || `Request failed (HTTP ${res.status})`);
  return json;
}

interface CampaignItem {
  id: string; day: number; dueAt: string; channel: string; suggestedChannel: string;
  format: string; title: string; hook: string; notes: string; caption: string;
  hashtags: string[]; complianceScore: number | null; assetPath: string; assetUrl: string;
  status: 'planned' | 'ready' | 'pending_approval' | 'posted' | 'failed' | 'skipped'; postedAt: string | null;
  externalId: string | null; error: string | null;
}
interface Campaign {
  id: string; status: string; goal: string; budget: number | null;
  product: { id: string | null; name: string; price: number | null; imageUrl: string } | null;
  channels: string[]; days: number; cadencePerDay: number; spacingMinutes: number;
  autoPublish: boolean; requireApproval: boolean; startAt: string; items: CampaignItem[];
  createdAt: string; updatedAt: string; lastRunAt: string | null;
}

const STATUS_STYLE: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  planned: 'bg-blue-100 text-blue-700',
  assets_ready: 'bg-indigo-100 text-indigo-700',
  running: 'bg-green-100 text-green-700',
  paused: 'bg-amber-100 text-amber-700',
  completed: 'bg-purple-100 text-purple-700',
};

const ITEM_ICON: Record<string, JSX.Element> = {
  posted: <CheckCircle2 className="w-4 h-4 text-green-600" />,
  failed: <XCircle className="w-4 h-4 text-red-600" />,
  skipped: <AlertTriangle className="w-4 h-4 text-amber-600" />,
  ready: <Clock className="w-4 h-4 text-blue-600" />,
  pending_approval: <ShieldCheck className="w-4 h-4 text-amber-600" />,
  planned: <Clock className="w-4 h-4 text-gray-400" />,
};

function ChannelIcon({ channel }: { channel: string }) {
  if (channel === 'facebook') return <Facebook className="w-4 h-4 text-[#1877F2]" />;
  if (channel === 'instagram') return <Instagram className="w-4 h-4 text-[#E4405F]" />;
  return <Sparkles className="w-4 h-4 text-gray-500" />;
}

export default function AutopilotCampaigns() {
  const { products, loading: productsLoading } = useStoreProducts([], 100);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selected, setSelected] = useState<Campaign | null>(null);
  const [accounts, setAccounts] = useState<Record<string, any>>({});
  const [busy, setBusy] = useState<string>('');

  // New-campaign form
  const [product, setProduct] = useState<StoreCatalogProduct | null>(null);
  const [goal, setGoal] = useState('');
  const [budget, setBudget] = useState('');
  const [days, setDays] = useState(7);
  const [cadence, setCadence] = useState(1);
  const [fastMode, setFastMode] = useState(false);
  const [requireApproval, setRequireApproval] = useState(false);
  const [channels, setChannels] = useState<string[]>(['facebook']);

  // Inline caption editing (review mode)
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editCaption, setEditCaption] = useState('');
  const [editHashtags, setEditHashtags] = useState('');
  const [itemBusy, setItemBusy] = useState<string>('');

  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const connectedChannels = Object.entries(accounts)
    .filter(([, a]: any) => a?.connected)
    .map(([k]) => k)
    .filter((k) => k === 'facebook' || k === 'instagram');

  const loadCampaigns = useCallback(async () => {
    try {
      const res = await api('/autopilot/campaigns');
      const list: Campaign[] = res.campaigns || [];
      setCampaigns(list);
      setSelected((prev) => (prev ? list.find((c) => c.id === prev.id) || null : prev));
    } catch (err: any) {
      console.error('[Autopilot] loadCampaigns failed:', err);
    }
  }, []);

  const loadAccounts = useCallback(async () => {
    try {
      const res = await api('/social/accounts');
      setAccounts(res.accounts || {});
    } catch (err: any) {
      console.error('[Autopilot] loadAccounts failed:', err);
    }
  }, []);

  // The runner heartbeat: check for due items and advance the campaigns that
  // have them. Also runs once on mount so posts catch up when you reopen the app.
  const runHeartbeat = useCallback(async () => {
    try {
      const due = await api('/autopilot/due');
      if (!due?.campaignIds?.length) return;
      let posted = 0;
      for (const cid of due.campaignIds) {
        const res = await api(`/autopilot/campaigns/${cid}/advance`, 'POST');
        posted += (res.ran || []).filter((r: any) => r.success).length;
      }
      if (posted > 0) {
        toast.success(`Autopilot published ${posted} post${posted === 1 ? '' : 's'}.`);
        await loadCampaigns();
      }
    } catch (err: any) {
      console.error('[Autopilot] heartbeat failed:', err);
    }
  }, [loadCampaigns]);

  useEffect(() => {
    loadCampaigns();
    loadAccounts();
    runHeartbeat();
    heartbeatRef.current = setInterval(runHeartbeat, HEARTBEAT_MS);
    return () => { if (heartbeatRef.current) clearInterval(heartbeatRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleChannel = (ch: string) => {
    setChannels((prev) => (prev.includes(ch) ? prev.filter((c) => c !== ch) : [...prev, ch]));
  };

  const createCampaign = async () => {
    if (!goal.trim()) { toast.error('Describe your campaign goal.'); return; }
    if (channels.length === 0) { toast.error('Pick at least one channel.'); return; }
    const notConnected = channels.filter((c) => !connectedChannels.includes(c));
    if (notConnected.length) {
      toast.error(`Connect ${notConnected.join(', ')} in the Social Media Hub first.`);
      return;
    }
    setBusy('create');
    try {
      const body: any = {
        goal, channels, days, cadencePerDay: cadence,
        budget: budget ? Number(budget) : null,
        autoPublish: true,
        requireApproval,
      };
      if (fastMode) body.spacingMinutes = 1; // live-demo pacing: one post per minute
      if (product) {
        body.productId = product.id;
        body.product = {
          id: product.id, name: product.name, price: product.price,
          description: product.description, imageUrl: product.image,
        };
      }
      const res = await api('/autopilot/campaigns', 'POST', body);
      const campaign: Campaign = res.campaign;
      toast.success('Campaign created — generating plan…');

      setBusy('plan');
      const planRes = await api(`/autopilot/campaigns/${campaign.id}/generate-plan`, 'POST');
      toast.success(`Plan ready: ${planRes.campaign.items.length} posts scheduled. Generating assets…`);

      setBusy('assets');
      const assetsRes = await api(`/autopilot/campaigns/${campaign.id}/generate-assets`, 'POST');
      const gen = assetsRes.generated ?? 0;
      if (assetsRes.errors?.length) {
        toast.warning(`${gen} assets generated, ${assetsRes.errors.length} need attention.`);
      } else if (requireApproval) {
        toast.success(`${gen} posts generated and waiting for your approval.`);
      } else {
        toast.success(`Autopilot is live — ${gen} posts queued and will publish automatically.`);
      }

      // Reset form and focus the new campaign.
      setGoal(''); setBudget(''); setProduct(null);
      await loadCampaigns();
      setSelected(assetsRes.campaign);
      runHeartbeat();
    } catch (err: any) {
      console.error('[Autopilot] createCampaign failed:', err);
      toast.error(err.message || 'Failed to create campaign.');
    } finally {
      setBusy('');
    }
  };

  const pauseResume = async (c: Campaign) => {
    try {
      const action = c.status === 'paused' ? 'resume' : 'pause';
      const res = await api(`/autopilot/campaigns/${c.id}/${action}`, 'POST');
      setSelected(res.campaign);
      await loadCampaigns();
      toast.success(action === 'pause' ? 'Autopilot paused.' : 'Autopilot resumed.');
    } catch (err: any) {
      toast.error(err.message || 'Failed to update campaign.');
    }
  };

  const removeCampaign = async (c: Campaign) => {
    try {
      await api(`/autopilot/campaigns/${c.id}`, 'DELETE');
      if (selected?.id === c.id) setSelected(null);
      await loadCampaigns();
      toast.success('Campaign deleted.');
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete.');
    }
  };

  const runNow = async (c: Campaign) => {
    setBusy('advance');
    try {
      const res = await api(`/autopilot/campaigns/${c.id}/advance`, 'POST');
      const ok = (res.ran || []).filter((r: any) => r.success).length;
      const fail = (res.ran || []).filter((r: any) => !r.success).length;
      if (ok) toast.success(`Published ${ok} post${ok === 1 ? '' : 's'}.`);
      if (fail) toast.warning(`${fail} post${fail === 1 ? '' : 's'} could not publish yet.`);
      if (!ok && !fail) toast.info('Nothing is due to publish yet.');
      setSelected(res.campaign);
      await loadCampaigns();
    } catch (err: any) {
      toast.error(err.message || 'Advance failed.');
    } finally {
      setBusy('');
    }
  };

  // ── Review controls (only used when a campaign requires approval) ──────────
  const itemAction = async (c: Campaign, itemId: string, path: string, body?: any, label?: string) => {
    setItemBusy(itemId + path);
    try {
      const res = await api(`/autopilot/campaigns/${c.id}/${path}`, 'POST', body);
      setSelected(res.campaign);
      await loadCampaigns();
      if (label) toast.success(label);
    } catch (err: any) {
      toast.error(err.message || 'Action failed.');
    } finally {
      setItemBusy('');
    }
  };

  const approveItem = (c: Campaign, id: string) => itemAction(c, id, `items/${id}/approve`, undefined, 'Approved — will publish when due.');
  const rejectItem = (c: Campaign, id: string) => itemAction(c, id, `items/${id}/reject`, undefined, 'Post rejected.');
  const regenItem = (c: Campaign, id: string, what: 'caption' | 'image') =>
    itemAction(c, id, `items/${id}/regenerate`, { what }, what === 'image' ? 'New image generated.' : 'New caption generated.');
  const approveAll = async (c: Campaign) => {
    setBusy('approve-all');
    try {
      const res = await api(`/autopilot/campaigns/${c.id}/approve-all`, 'POST');
      setSelected(res.campaign);
      await loadCampaigns();
      toast.success(`Approved ${res.approved} post${res.approved === 1 ? '' : 's'}.`);
    } catch (err: any) {
      toast.error(err.message || 'Approve all failed.');
    } finally {
      setBusy('');
    }
  };

  const startEdit = (item: CampaignItem) => {
    setEditingId(item.id);
    setEditCaption(item.caption);
    setEditHashtags((item.hashtags || []).join(' '));
  };
  const saveEdit = async (c: Campaign, id: string) => {
    const hashtags = editHashtags.split(/\s+/).map((h) => h.replace(/^#/, '')).filter(Boolean);
    await itemAction(c, id, `items/${id}/edit`, { caption: editCaption, hashtags }, 'Post updated.');
    setEditingId(null);
  };

  const pendingCount = (c: Campaign) => (c.items || []).filter((i) => i.status === 'pending_approval').length;

  const fmtTime = (iso: string) => {
    try { return new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }); }
    catch { return iso; }
  };

  const progressOf = (c: Campaign) => {
    const total = c.items?.length || 0;
    const done = (c.items || []).filter((i) => i.status === 'posted' || i.status === 'skipped').length;
    return { done, total, pct: total ? Math.round((done / total) * 100) : 0 };
  };

  const busyLabel = busy === 'create' ? 'Creating…'
    : busy === 'plan' ? 'Planning content…'
    : busy === 'assets' ? 'Generating captions & images…'
    : 'Launch Autopilot';

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-500 to-fuchsia-500 flex items-center justify-center">
          <Rocket className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Autopilot Campaigns</h1>
          <p className="text-sm text-gray-500">Pick a product, set a goal — AI plans, creates, and auto-posts for you.</p>
        </div>
      </div>

      {/* Connection status */}
      <Card>
        <CardContent className="py-4 flex flex-wrap items-center gap-4">
          <span className="text-sm font-medium">Connected channels:</span>
          {connectedChannels.length === 0 ? (
            <span className="text-sm text-amber-600 flex items-center gap-1">
              <AlertTriangle className="w-4 h-4" /> None yet — connect Facebook/Instagram in the Social Media Hub to enable auto-publishing.
            </span>
          ) : (
            connectedChannels.map((ch) => (
              <span key={ch} className="text-sm flex items-center gap-1 capitalize">
                <ChannelIcon channel={ch} /> {ch}
              </span>
            ))
          )}
          <Button variant="outline" size="sm" className="ml-auto" onClick={() => { loadAccounts(); loadCampaigns(); }}>
            <RefreshCw className="w-4 h-4 mr-1" /> Refresh
          </Button>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* New campaign */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Bot className="w-5 h-5 text-indigo-500" /> New Autopilot Campaign</CardTitle>
            <CardDescription>The agent will plan a content calendar, write captions, generate images, and publish on schedule.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Product (optional)</Label>
              <select
                className="w-full mt-1 border rounded-md px-3 py-2 text-sm bg-white"
                value={product?.id || ''}
                onChange={(e) => setProduct(products.find((p) => p.id === e.target.value) || null)}
              >
                <option value="">No specific product (brand campaign)</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}{p.price ? ` — $${p.price}` : ''}</option>
                ))}
              </select>
              {productsLoading && <p className="text-xs text-gray-400 mt-1">Loading catalog…</p>}
            </div>

            <div>
              <Label>Campaign goal</Label>
              <Textarea
                className="mt-1"
                placeholder="e.g. Drive first-time sales for our new product with playful, benefit-led posts"
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                rows={2}
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Budget ($)</Label>
                <Input className="mt-1" type="number" placeholder="Optional" value={budget} onChange={(e) => setBudget(e.target.value)} />
              </div>
              <div>
                <Label>Days</Label>
                <Input className="mt-1" type="number" min={3} max={30} value={days} onChange={(e) => setDays(Number(e.target.value) || 7)} />
              </div>
              <div>
                <Label>Posts/day</Label>
                <Input className="mt-1" type="number" min={1} max={4} value={cadence} onChange={(e) => setCadence(Number(e.target.value) || 1)} />
              </div>
            </div>

            <div>
              <Label>Channels (must be connected)</Label>
              <div className="flex gap-2 mt-1">
                {['facebook', 'instagram'].map((ch) => {
                  const active = channels.includes(ch);
                  const connected = connectedChannels.includes(ch);
                  return (
                    <button
                      key={ch}
                      type="button"
                      onClick={() => toggleChannel(ch)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-sm capitalize transition ${
                        active ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-gray-200 text-gray-600'
                      } ${!connected ? 'opacity-60' : ''}`}
                    >
                      <ChannelIcon channel={ch} /> {ch}
                      {!connected && <span className="text-[10px] text-amber-600">(not connected)</span>}
                    </button>
                  );
                })}
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm text-gray-600">
              <input type="checkbox" checked={requireApproval} onChange={(e) => setRequireApproval(e.target.checked)} />
              <ShieldCheck className="w-4 h-4 text-amber-600" />
              Require my approval before each post publishes (review, edit, or regenerate first)
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-600">
              <input type="checkbox" checked={fastMode} onChange={(e) => setFastMode(e.target.checked)} />
              Demo mode — publish one post per minute instead of spreading across the day
            </label>

            <Button className="w-full" onClick={createCampaign} disabled={!!busy}>
              {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Rocket className="w-4 h-4 mr-2" />}
              {busyLabel}
            </Button>
            <p className="text-xs text-gray-400 flex items-start gap-1">
              <CalendarClock className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              Autopilot advances while this tab is open and catches up whenever you return. Posts publish to your live accounts.
            </p>
          </CardContent>
        </Card>

        {/* Campaign list */}
        <Card>
          <CardHeader>
            <CardTitle>Your Campaigns</CardTitle>
            <CardDescription>{campaigns.length} campaign{campaigns.length === 1 ? '' : 's'}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {campaigns.length === 0 && <p className="text-sm text-gray-400">No campaigns yet. Launch your first one.</p>}
            {campaigns.map((c) => {
              const p = progressOf(c);
              return (
                <button
                  key={c.id}
                  onClick={() => setSelected(c)}
                  className={`w-full text-left border rounded-lg p-3 transition hover:border-indigo-300 ${
                    selected?.id === c.id ? 'border-indigo-500 bg-indigo-50/40' : 'border-gray-200'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium truncate">{c.product?.name || c.goal.slice(0, 40)}</span>
                    <Badge className={STATUS_STYLE[c.status] || ''}>{c.status}</Badge>
                  </div>
                  <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-500" style={{ width: `${p.pct}%` }} />
                  </div>
                  <div className="flex items-center justify-between mt-1 text-xs text-gray-500">
                    <span>{p.done}/{p.total} posted</span>
                    <span className="flex items-center gap-1">
                      {c.channels.map((ch) => <ChannelIcon key={ch} channel={ch} />)}
                    </span>
                  </div>
                </button>
              );
            })}
          </CardContent>
        </Card>
      </div>

      {/* Selected campaign detail */}
      {selected && (
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle className="flex items-center gap-2">
                  {selected.product?.name || 'Brand campaign'}
                  <Badge className={STATUS_STYLE[selected.status] || ''}>{selected.status}</Badge>
                </CardTitle>
                <CardDescription>{selected.goal}</CardDescription>
              </div>
              <div className="flex gap-2 shrink-0 flex-wrap justify-end">
                {pendingCount(selected) > 0 && (
                  <Button size="sm" onClick={() => approveAll(selected)} disabled={busy === 'approve-all'}>
                    {busy === 'approve-all' ? <Loader2 className="w-4 h-4 animate-spin" /> : <ThumbsUp className="w-4 h-4" />}
                    <span className="ml-1">Approve all ({pendingCount(selected)})</span>
                  </Button>
                )}
                <Button variant="outline" size="sm" onClick={() => runNow(selected)} disabled={busy === 'advance'}>
                  {busy === 'advance' ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                  <span className="ml-1">Run due now</span>
                </Button>
                <Button variant="outline" size="sm" onClick={() => pauseResume(selected)}>
                  {selected.status === 'paused' ? <><Play className="w-4 h-4 mr-1" /> Resume</> : <><Pause className="w-4 h-4 mr-1" /> Pause</>}
                </Button>
                <Button variant="outline" size="sm" onClick={() => removeCampaign(selected)}>
                  <Trash2 className="w-4 h-4 text-red-500" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {selected.items.map((item) => (
              <div key={item.id} className="flex gap-3 border rounded-lg p-3">
                {item.assetUrl ? (
                  <img src={item.assetUrl} alt={item.title} className="w-20 h-20 rounded-md object-cover shrink-0 bg-gray-100" />
                ) : (
                  <div className="w-20 h-20 rounded-md bg-gray-100 flex items-center justify-center shrink-0">
                    <ImageIcon className="w-6 h-6 text-gray-300" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    {ITEM_ICON[item.status]}
                    <span className="font-medium text-sm truncate">{item.title || item.hook || 'Post'}</span>
                    <ChannelIcon channel={item.channel} />
                    <Badge variant="outline" className="text-[10px]">Day {item.day}</Badge>
                    {typeof item.complianceScore === 'number' && (
                      <Badge variant="outline" className="text-[10px]">Brand {item.complianceScore}%</Badge>
                    )}
                  </div>
                  {editingId === item.id ? (
                    <div className="mt-1 space-y-2">
                      <Textarea rows={3} value={editCaption} onChange={(e) => setEditCaption(e.target.value)} placeholder="Caption" />
                      <Input value={editHashtags} onChange={(e) => setEditHashtags(e.target.value)} placeholder="#hashtags space-separated" />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => saveEdit(selected, item.id)} disabled={itemBusy.startsWith(item.id)}>
                          <Save className="w-3.5 h-3.5 mr-1" /> Save
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>
                          <X className="w-3.5 h-3.5 mr-1" /> Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {item.caption && <p className="text-xs text-gray-600 mt-1 line-clamp-3">{item.caption}</p>}
                      {item.hashtags?.length > 0 && (
                        <p className="text-[11px] text-indigo-500 mt-1 truncate">{item.hashtags.map((h) => (h.startsWith('#') ? h : `#${h}`)).join(' ')}</p>
                      )}
                    </>
                  )}

                  <div className="flex items-center gap-3 mt-1 text-[11px] text-gray-400">
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {item.status === 'posted' && item.postedAt ? `Posted ${fmtTime(item.postedAt)}` : `Due ${fmtTime(item.dueAt)}`}</span>
                    {item.status === 'pending_approval' && <span className="text-amber-600 font-medium">Awaiting approval</span>}
                    {item.error && <span className="text-red-500 truncate">{item.error}</span>}
                  </div>

                  {/* Human-in-the-loop review controls — only for posts awaiting approval */}
                  {item.status === 'pending_approval' && editingId !== item.id && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      <Button size="sm" onClick={() => approveItem(selected, item.id)} disabled={itemBusy.startsWith(item.id)}>
                        <ThumbsUp className="w-3.5 h-3.5 mr-1" /> Approve
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => startEdit(item)}>
                        <Pencil className="w-3.5 h-3.5 mr-1" /> Edit
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => regenItem(selected, item.id, 'caption')} disabled={itemBusy.startsWith(item.id)}>
                        <Wand2 className="w-3.5 h-3.5 mr-1" /> Redo text
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => regenItem(selected, item.id, 'image')} disabled={itemBusy.startsWith(item.id)}>
                        <ImageIcon className="w-3.5 h-3.5 mr-1" /> Redo image
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => rejectItem(selected, item.id)} disabled={itemBusy.startsWith(item.id)}>
                        <Ban className="w-3.5 h-3.5 mr-1 text-red-500" /> Reject
                      </Button>
                      {itemBusy.startsWith(item.id) && <Loader2 className="w-4 h-4 animate-spin text-gray-400 self-center" />}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
