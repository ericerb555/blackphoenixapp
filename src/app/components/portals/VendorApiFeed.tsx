/**
 * A vendor connecting their own system, so their catalogue arrives by itself.
 *
 * WHAT THIS REPLACES
 *
 * A form backed by `useUserData`, which is `localStorage`. The endpoint, the API
 * key and the webhook URL a vendor filled in were written to their own browser,
 * lost when they cleared it, and never seen by our server — while the screen
 * told them they were "Connected". Its "Test connection" fetched the endpoint
 * *from the vendor's browser*, which proves the vendor can reach their own API
 * and nothing at all about whether we can.
 *
 * THREE THINGS MAKE THE REAL VERSION SAFE
 *
 * The key is stored server-side and **never sent back** — saving returns only
 * whether one is set. A key that can be read back is a key that leaks through
 * any screen that displays it, and this one has no reason to leave again.
 *
 * The endpoint is fetched by our server through `outboundGuard`, because we are
 * being asked to make a request from inside our own network to an address
 * somebody outside chose. That is server-side request forgery, and the guard is
 * what stands between a "catalogue endpoint" and our cloud metadata service.
 *
 * And the feed lands through the same import route as the CSV upload, so the
 * validation, the update-by-SKU rule and the rejection reporting are the ones
 * already tested rather than a second set written for feeds.
 */
import { useCallback, useEffect, useState } from 'react';
import { Plug, Loader2, CheckCircle2, AlertTriangle, RefreshCw, Save, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';

const FIELD_LABELS: Record<string, string> = {
  name: 'Name', sku: 'SKU', price: 'Price', unit: 'Unit',
  category: 'Category', availability: 'Availability', leadTimeDays: 'Lead time (days)',
};
const FIELDS = ['name', 'sku', 'price', 'unit', 'category', 'availability', 'leadTimeDays'];

interface Props {
  vendorId: string;
  apiBase: string;
  headers: () => Record<string, string>;
}

export default function VendorApiFeed({ vendorId, apiBase, headers }: Props) {
  const [feed, setFeed] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [test, setTest] = useState<any>(null);
  const [newKey, setNewKey] = useState('');
  const [showKey, setShowKey] = useState(false);

  const url = `${apiBase}/vendor-catalog/${encodeURIComponent(vendorId)}/feed`;

  const load = useCallback(async () => {
    if (!vendorId) { setLoading(false); return; }
    try {
      const res = await fetch(url, { headers: headers() });
      const json = await res.json().catch(() => ({}));
      setFeed(json?.feed || { endpoint: '', authStyle: 'bearer', authName: 'X-API-Key', mapping: {}, enabled: false, hasKey: false });
    } catch {
      setFeed({ endpoint: '', authStyle: 'bearer', authName: 'X-API-Key', mapping: {}, enabled: false, hasKey: false });
    } finally { setLoading(false); }
  }, [url, vendorId]);

  useEffect(() => { void load(); }, [load]);

  const save = async (patch: any = {}) => {
    setSaving(true);
    try {
      const body: any = { ...feed, ...patch };
      // An empty key means "leave the stored one alone". The server treats it
      // the same way, so saving the endpoint never wipes the credential.
      if (newKey) body.apiKey = newKey;
      else delete body.apiKey;

      const res = await fetch(url, { method: 'PUT', headers: headers(), body: JSON.stringify(body) });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.success) throw new Error(json?.error || `The server responded ${res.status}`);
      setFeed(json.feed);
      setNewKey('');
      toast.success('Connection settings saved.');
      return json.feed;
    } catch (e: any) {
      toast.error(e?.message || 'Could not save those settings.');
      return null;
    } finally { setSaving(false); }
  };

  const runTest = async () => {
    const saved = await save();
    if (!saved) return;
    setTesting(true);
    setTest(null);
    try {
      const res = await fetch(`${url}/test`, { method: 'POST', headers: headers() });
      const json = await res.json().catch(() => ({}));
      setTest(json);
      if (!res.ok || !json?.success) toast.error(json?.error || 'The test failed.');
      else toast.success(`${json.productsFound} products found.`);
    } catch (e: any) {
      toast.error(e?.message || 'The test could not run.');
    } finally { setTesting(false); }
  };

  const runSync = async () => {
    setSyncing(true);
    try {
      const res = await fetch(`${url}/sync`, { method: 'POST', headers: headers() });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.success) throw new Error(json?.error || 'The sync failed.');
      toast.success(`${json.added} added, ${json.updated} updated.`);
      await load();
    } catch (e: any) {
      toast.error(e?.message || 'The sync failed.');
    } finally { setSyncing(false); }
  };

  if (loading) {
    return (
      <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-6 text-sm text-gray-400">
        <Loader2 className="mr-2 inline h-4 w-4 animate-spin" /> Loading your connection…
      </div>
    );
  }

  const input = 'w-full rounded-lg border border-[#2A2A2A] bg-[#0A0A0A] px-3 py-2 text-sm text-white';
  const mapping = feed?.mapping || {};
  const sampleKeys: string[] = test?.sample?.length
    ? Array.from(new Set(test.sample.flatMap((r: any) => Object.keys(r))))
    : [];

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-bold text-white">
              <Plug className="h-5 w-5 text-orange-400" /> Connect your system
            </h2>
            <p className="mt-1 text-sm text-gray-400">
              Point us at the endpoint your catalogue comes from and we will pull it in.
              No API? Upload a price list instead — it ends up in the same place.
            </p>
          </div>
          <span className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${
            feed?.lastSyncAt
              ? 'border border-green-500/20 bg-green-500/10 text-green-400'
              : 'border border-gray-500/20 bg-gray-500/10 text-gray-400'
          }`}>
            {feed?.lastSyncAt ? `Last synced ${new Date(feed.lastSyncAt).toLocaleDateString()}` : 'Never synced'}
          </span>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <label className="md:col-span-2">
            <span className="mb-1 block text-xs text-gray-400">Catalogue endpoint</span>
            <input
              className={input} type="url" placeholder="https://api.yoursystem.com/v1/products"
              value={feed?.endpoint || ''}
              onChange={(e) => setFeed({ ...feed, endpoint: e.target.value })}
            />
            <span className="mt-1 block text-[11px] text-gray-600">
              Must be https. It has to return the catalogue as JSON.
            </span>
          </label>

          <label>
            <span className="mb-1 block text-xs text-gray-400">How your key is sent</span>
            <select className={input} value={feed?.authStyle || 'bearer'}
              onChange={(e) => setFeed({ ...feed, authStyle: e.target.value })}>
              <option value="bearer">Authorization: Bearer</option>
              <option value="header">A custom header</option>
              <option value="query">A query parameter</option>
            </select>
          </label>

          {feed?.authStyle !== 'bearer' && (
            <label>
              <span className="mb-1 block text-xs text-gray-400">
                {feed?.authStyle === 'query' ? 'Parameter name' : 'Header name'}
              </span>
              <input className={input} value={feed?.authName || ''}
                onChange={(e) => setFeed({ ...feed, authName: e.target.value })} />
            </label>
          )}

          <label className="md:col-span-2">
            <span className="mb-1 block text-xs text-gray-400">
              API key {feed?.hasKey && <span className="text-green-400">— one is saved</span>}
            </span>
            <div className="flex gap-2">
              <input
                className={input} type={showKey ? 'text' : 'password'}
                placeholder={feed?.hasKey ? 'Leave blank to keep the saved key' : 'Paste your key'}
                value={newKey} onChange={(e) => setNewKey(e.target.value)}
              />
              <button type="button" onClick={() => setShowKey(!showKey)}
                className="rounded-lg border border-[#2A2A2A] px-3 text-gray-400 hover:text-white">
                {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {/* Said plainly, because it is unusual and it is deliberate. */}
            <span className="mt-1 block text-[11px] text-gray-600">
              Stored on our server and never shown again — not even to you. Replace it by
              typing a new one.
            </span>
          </label>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button onClick={runTest} disabled={testing || saving || !feed?.endpoint}
            className="inline-flex items-center gap-2 rounded-xl border border-[#2A2A2A] px-4 py-2 text-sm font-semibold text-gray-300 hover:text-white disabled:opacity-40">
            {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Test connection
          </button>
          <button onClick={() => save()} disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl bg-[#1a1a1a] border border-[#2A2A2A] px-4 py-2 text-sm font-semibold text-gray-300 hover:text-white disabled:opacity-40">
            <Save className="h-4 w-4" /> Save
          </button>
          <button onClick={runSync} disabled={syncing || !feed?.endpoint || !feed?.mapping?.name || !feed?.mapping?.price}
            className="inline-flex items-center gap-2 rounded-xl bg-orange-600 px-4 py-2 text-sm font-bold text-white hover:bg-orange-500 disabled:opacity-40">
            {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plug className="h-4 w-4" />}
            Sync now
          </button>
        </div>
      </div>

      {/* ── What the test actually found ──────────────────────────────────
          Reported rather than a green tick. "Connected" tells a vendor nothing
          about whether their prices will arrive intact. */}
      {test && (
        <div className={`rounded-xl border p-4 ${test.success ? 'border-green-500/20 bg-green-500/5' : 'border-red-500/20 bg-red-500/5'}`}>
          {test.success ? (
            <>
              <p className="flex items-center gap-2 text-sm font-semibold text-green-400">
                <CheckCircle2 className="h-4 w-4" />
                {test.productsFound} products found at “{test.foundAt}” · {test.usable} usable
              </p>
              {test.dnsChecked === false && (
                <p className="mt-1 text-[11px] text-yellow-400/80">
                  We could not verify where that hostname resolves to from here.
                </p>
              )}
              {test.rejectedTotal > 0 && (
                <details className="mt-2">
                  <summary className="cursor-pointer text-xs text-yellow-400">
                    {test.rejectedTotal} could not be used
                  </summary>
                  <ul className="mt-1 space-y-0.5 text-[11px] text-gray-400">
                    {test.rejected.map((r: any, i: number) => <li key={i}>Row {r.line} — {r.reason}</li>)}
                  </ul>
                </details>
              )}

              {/* The mapping, shown for the vendor to correct. Getting the price
                  column wrong is not a mistake to make silently on their behalf. */}
              <div className="mt-3">
                <p className="mb-2 text-[11px] uppercase tracking-wide text-gray-500">Match your fields to ours</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {FIELDS.map((f) => (
                    <label key={f} className="flex items-center gap-2">
                      <span className="w-28 shrink-0 text-xs text-gray-400">
                        {FIELD_LABELS[f]}{(f === 'name' || f === 'price') && <span className="text-orange-400"> *</span>}
                      </span>
                      <select
                        className={input}
                        value={mapping[f] || ''}
                        onChange={(e) => {
                          const next = { ...mapping };
                          if (e.target.value) next[f] = e.target.value; else delete next[f];
                          setFeed({ ...feed, mapping: next });
                        }}
                      >
                        <option value="">— not in this feed —</option>
                        {(sampleKeys.length ? sampleKeys : Object.values(mapping)).map((k: any) => (
                          <option key={k} value={k}>{k}</option>
                        ))}
                      </select>
                    </label>
                  ))}
                </div>
                {(!mapping.name || !mapping.price) && (
                  <p className="mt-2 text-xs text-yellow-400">
                    Name and price are needed before a sync can run.
                  </p>
                )}
                <button onClick={() => save()} disabled={saving}
                  className="mt-2 rounded-lg bg-orange-600 px-3 py-1.5 text-xs font-bold text-white disabled:opacity-40">
                  Save mapping
                </button>
              </div>
            </>
          ) : (
            <p className="flex items-start gap-2 text-sm text-red-300">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> {test.error}
            </p>
          )}
        </div>
      )}

      {feed?.lastSyncSummary && (
        <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-4 text-sm text-gray-300">
          <span className="font-semibold text-white">Last sync:</span>{' '}
          {feed.lastSyncSummary.added} added, {feed.lastSyncSummary.updated} updated
          {feed.lastSyncSummary.rejected ? `, ${feed.lastSyncSummary.rejected} rejected` : ''}
          {feed.lastSyncSummary.error && (
            <span className="text-red-400"> — {feed.lastSyncSummary.error}</span>
          )}
        </div>
      )}
    </div>
  );
}
