/**
 * ZendropTopProducts — pulls the TOP (best-selling) products from the connected
 * Zendrop account, lets you auto-generate store-ready product info with AI, and
 * publishes them into the live store catalog (`product_` — what the public
 * store reads, and what checkout prices from).
 *
 * Backed by real server routes:
 *   GET  /zendrop/top-products?limit=N   → real best-sellers (no side effects)
 *   POST /zendrop/publish-to-store       → AI product info + write to store
 *   GET  /zendrop/status                 → connection snapshot
 */
import { useState, useEffect } from 'react';
import { toast } from 'sonner@2.0.3';
import {
  Package, RefreshCw, DollarSign, TrendingUp, CheckCircle,
  Sparkles, Store, AlertTriangle,
} from 'lucide-react';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { authedHeaders } from '../utils/authHeaders';

const API = `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6`;

interface ZendropProduct {
  providerProductId: string;
  sku: string;
  name: string;
  description: string;
  price: number;
  cost: number;
  stock: number;
  images: string[];
  category: string;
  rating: number;
  rank?: number;
  margin?: number;
  profitPerUnit?: number;
}

export default function ZendropTopProducts() {
  const [products, setProducts] = useState<ZendropProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [connected, setConnected] = useState<boolean | null>(null);
  const [publishing, setPublishing] = useState<string | null>(null);
  const [published, setPublished] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { checkStatus(); }, []);

  async function checkStatus() {
    try {
      const res = await fetch(`${API}/zendrop/status`, {
        headers: await authedHeaders(),
      });
      const data = await res.json().catch(() => ({}));
      setConnected(!!data.connected);
      if (data.connected) loadTopProducts();
    } catch (e: any) {
      setConnected(false);
      setError(`Could not reach the server: ${e.message}`);
    }
  }

  async function loadTopProducts() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API}/zendrop/top-products?limit=24`, {
        headers: await authedHeaders(),
      });
      const data = await res.json().catch(() => ({}));
      if (data.success && Array.isArray(data.products)) {
        setProducts(data.products);
        if (data.products.length === 0) setError('Zendrop returned no products. Check your account catalog.');
      } else {
        setError(data.error || 'Failed to load Zendrop products.');
      }
    } catch (e: any) {
      setError(`Failed to load Zendrop products: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }

  async function publishToStore(p: ZendropProduct) {
    setPublishing(p.sku);
    try {
      const res = await fetch(`${API}/zendrop/publish-to-store`, {
        method: 'POST',
        headers: await authedHeaders(),
        body: JSON.stringify({ product: p, generateInfo: true }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        setPublished(prev => ({ ...prev, [p.sku]: true }));
        toast.success(`"${data.product?.name || p.name}" published to your store with AI-generated info!`);
      } else {
        toast.error(data.error || 'Failed to publish to store.');
      }
    } catch (e: any) {
      toast.error(`Publish failed: ${e.message}`);
    } finally {
      setPublishing(null);
    }
  }

  async function publishAll() {
    const toPublish = products.filter(p => !published[p.sku]);
    if (toPublish.length === 0) { toast.info('All products already published.'); return; }
    toast.info(`Publishing ${toPublish.length} products with AI info — this may take a moment…`);
    for (const p of toPublish) {
      // eslint-disable-next-line no-await-in-loop
      await publishToStore(p);
    }
    toast.success('Finished publishing top Zendrop products to your store!');
  }

  if (connected === false) {
    return (
      <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-8 text-center">
        <AlertTriangle className="w-10 h-10 text-yellow-500 mx-auto mb-3" />
        <h3 className="text-lg font-bold text-white mb-1">Zendrop not connected</h3>
        <p className="text-gray-400 text-sm mb-4">
          Connect your Zendrop account in the Dropshipper Admin to pull your top products here.
        </p>
        {error && <p className="text-xs text-red-400 mb-3">{error}</p>}
        <button onClick={checkStatus}
          className="inline-flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-sm font-semibold transition">
          <RefreshCw className="w-4 h-4" /> Re-check connection
        </button>
      </div>
    );
  }

  const unpublishedCount = products.filter(p => !published[p.sku]).length;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <Store className="w-5 h-5 text-orange-400" /> Top Zendrop Products
          </h3>
          <p className="text-gray-400 text-sm mt-0.5">
            Your connected Zendrop best-sellers — generate AI product info and publish to your store in one click.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={loadTopProducts} disabled={loading}
            className="inline-flex items-center gap-2 px-3 py-2 bg-[#1A1A1A] border border-[#2A2A2A] text-gray-300 hover:text-white rounded-xl text-sm transition disabled:opacity-50">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
          {products.length > 0 && (
            <button onClick={publishAll} disabled={!!publishing || unpublishedCount === 0}
              className="inline-flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-sm font-semibold transition disabled:opacity-50">
              <Sparkles className="w-4 h-4" /> Publish all ({unpublishedCount})
            </button>
          )}
        </div>
      </div>

      {error && products.length === 0 && !loading && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-sm text-red-300">{error}</div>
      )}

      {loading && products.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-orange-400" />
          Pulling your top Zendrop products…
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {products.map((p) => {
          const isPub = published[p.sku];
          const isBusy = publishing === p.sku;
          return (
            <div key={p.sku} className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl overflow-hidden flex flex-col hover:border-orange-500/30 transition">
              <div className="relative aspect-square bg-[#0A0A0A]">
                {p.images?.[0] ? (
                  <img src={p.images[0]} alt={p.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-600"><Package className="w-10 h-10" /></div>
                )}
                {p.rank != null && (
                  <span className="absolute top-2 left-2 text-[11px] font-bold text-white bg-black/60 px-2 py-0.5 rounded-full">#{p.rank} best-seller</span>
                )}
                {isPub && (
                  <span className="absolute top-2 right-2 flex items-center gap-1 text-[11px] font-bold text-green-300 bg-green-900/70 px-2 py-0.5 rounded-full">
                    <CheckCircle className="w-3 h-3" /> In store
                  </span>
                )}
              </div>
              <div className="p-4 flex flex-col flex-1">
                <p className="font-semibold text-white text-sm leading-snug line-clamp-2">{p.name}</p>
                <p className="text-xs text-gray-500 mt-0.5">{p.category}</p>
                <div className="grid grid-cols-3 gap-2 mt-3 text-center">
                  <div className="bg-[#0A0A0A] rounded-lg py-1.5">
                    <p className="text-[10px] text-gray-500">Sell</p>
                    <p className="text-sm font-bold text-white">${p.price}</p>
                  </div>
                  <div className="bg-[#0A0A0A] rounded-lg py-1.5">
                    <p className="text-[10px] text-gray-500">Cost</p>
                    <p className="text-sm font-bold text-gray-300">${p.cost}</p>
                  </div>
                  <div className="bg-[#0A0A0A] rounded-lg py-1.5">
                    <p className="text-[10px] text-gray-500">Margin</p>
                    <p className="text-sm font-bold text-green-400">{p.margin ?? 0}%</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 mt-2 text-[11px] text-gray-500">
                  <span className="flex items-center gap-1"><DollarSign className="w-3 h-3" /> ${p.profitPerUnit ?? (p.price - p.cost).toFixed(2)}/unit</span>
                  {p.rating > 0 && <span className="flex items-center gap-1"><TrendingUp className="w-3 h-3" /> {p.rating.toFixed(1)}★</span>}
                </div>
                <button
                  onClick={() => publishToStore(p)}
                  disabled={isBusy || isPub}
                  className={`mt-3 w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold transition ${
                    isPub ? 'bg-green-600/20 text-green-400 cursor-default'
                    : 'bg-orange-600 hover:bg-orange-700 text-white disabled:opacity-60'
                  }`}>
                  {isBusy ? <><RefreshCw className="w-4 h-4 animate-spin" /> Generating & publishing…</>
                    : isPub ? <><CheckCircle className="w-4 h-4" /> Published</>
                    : <><Sparkles className="w-4 h-4" /> Generate info & publish</>}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
