/**
 * useStoreProducts — one shared source of truth for "the products in my store".
 *
 * Every creator tool (reels, product ads, video recreation, content studio) reads
 * the SAME live catalog the public storefront reads: GET /products?isActive=true.
 * That endpoint returns manually added items plus synced dropshipper inventory, so
 * anything a shopper can buy is automatically available to make content about.
 *
 * If the catalog can't be reached the hook falls back to whatever sample list the
 * caller passes in, and reports `live: false` so the UI can say so honestly
 * instead of silently pretending demo data is real inventory.
 */
import { useCallback, useEffect, useState } from 'react';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { authedHeadersOrAnon } from "../utils/authHeaders";

const SERVER = `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6`;

export interface StoreCatalogProduct {
  id: string;
  name: string;
  description: string;
  price: number;
  originalPrice?: number;
  compareAtPrice?: number;
  category: string;
  image: string;
  images: string[];
  badge?: string;
  sku?: string;
  inStock?: boolean;
  source?: { provider: string; lastSynced: string };
}

/** Normalize the many shapes a product record can arrive in into one contract. */
export function normalizeStoreProduct(p: any): StoreCatalogProduct {
  const images: string[] = [
    p?.primaryImage,
    ...(Array.isArray(p?.images) ? p.images : []),
    p?.image,
    p?.imageUrl,
  ].filter((u: any): u is string => typeof u === 'string' && u.length > 0);
  const price = Number(p?.price) || 0;
  const compare = Number(p?.compareAtPrice ?? p?.originalPrice ?? p?.msrp) || undefined;

  return {
    id: String(p?.id ?? p?.sku ?? p?.productId ?? `prod_${Math.random().toString(36).slice(2, 10)}`),
    name: p?.name || p?.title || 'Untitled product',
    description: p?.description || p?.shortDescription || '',
    price,
    originalPrice: compare && compare > price ? compare : undefined,
    compareAtPrice: compare && compare > price ? compare : undefined,
    category: p?.category || p?.productType || 'General',
    image: images[0] || '',
    images: images.length > 0 ? images : [''],
    badge: p?.badge || (p?.isFeatured ? 'FEATURED' : undefined),
    sku: p?.sku || undefined,
    inStock: p?.inStock ?? (typeof p?.inventory === 'number' ? p.inventory > 0 : undefined),
    source: p?.source || (p?.provider ? { provider: p.provider, lastSynced: p?.lastSynced || '' } : undefined),
  };
}

export interface UseStoreProductsResult {
  products: StoreCatalogProduct[];
  loading: boolean;
  /** true once real catalog data has loaded; false while showing the fallback. */
  live: boolean;
  error: string | null;
  reload: () => void;
}

// See useAllProducts — default covers the full catalog instead of truncating it.
export function useStoreProducts(fallback: StoreCatalogProduct[] = [], limit = 5000): UseStoreProductsResult {
  const [products, setProducts] = useState<StoreCatalogProduct[]>(fallback);
  const [loading, setLoading] = useState(true);
  const [live, setLive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${SERVER}/products?isActive=true&limit=${limit}`, {
        headers: await authedHeadersOrAnon(publicAnonKey),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) {
        throw new Error(data?.error || `Store catalog request failed (${res.status})`);
      }
      const list = (data.products || []).map(normalizeStoreProduct);
      if (list.length === 0) {
        // Reachable but empty — surface that rather than showing fake stock.
        setProducts([]);
        setLive(true);
        return;
      }
      setProducts(list);
      setLive(true);
    } catch (err: any) {
      console.error('[useStoreProducts] could not load live store catalog:', err);
      setError(err?.message || 'Could not load your store catalog.');
      setProducts(fallback);
      setLive(false);
    } finally {
      setLoading(false);
    }
    // `fallback` is a module-level constant at every call site; excluded on purpose
    // so a new array literal can't retrigger the fetch on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [limit]);

  useEffect(() => { load(); }, [load]);

  return { products, loading, live, error, reload: load };
}
