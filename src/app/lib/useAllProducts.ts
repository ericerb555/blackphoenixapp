/**
 * useAllProducts — ONE catalog for every content tool.
 *
 * The Content Center's creators (Ad Studio, Creator Studio, Store Content
 * Studio, social scheduler, etc.) each used to load products their own way, and
 * most only ever saw the PHYSICAL store (`/products`) — digital products
 * (ebooks, templates, calculators, bundles) were invisible to them.
 *
 * This hook merges BOTH catalogs into a single, normalized list so anything the
 * business sells — digital or physical — can be turned into content:
 *   • Physical / dropship store  → GET /products?isActive=true   (prices in DOLLARS)
 *   • Digital marketplace        → GET /marketplace/products      (prices in CENTS)
 *
 * Every product is returned in one shape with prices in DOLLARS and an
 * `isDigital` flag, so callers never have to reconcile units or field names.
 */
import { useCallback, useEffect, useState } from 'react';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { normalizeStoreProduct } from './useStoreProducts';

const SERVER = `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6`;
const AUTH = { Authorization: `Bearer ${publicAnonKey}` };

export type ProductKind = 'physical' | 'digital';

export interface UnifiedProduct {
  id: string;
  name: string;
  description: string;
  price: number; // ALWAYS dollars
  originalPrice?: number; // dollars
  category: string;
  image: string;
  images: string[];
  badge?: string;
  sku?: string;
  kind: ProductKind;
  isDigital: boolean;
  /** Raw source record, in case a tool needs a field this shape doesn't carry. */
  raw: any;
}

/** Digital marketplace record → unified shape. Prices arrive in cents. */
function normalizeDigital(p: any): UnifiedProduct {
  const images: string[] = [
    p?.coverImage,
    ...(Array.isArray(p?.images) ? p.images : []),
    p?.image,
    p?.preview,
  ].filter((u: any): u is string => typeof u === 'string' && u.length > 0);
  const price = typeof p?.price === 'number' ? p.price / 100 : Number(p?.price) / 100 || 0;
  const original = typeof p?.originalPrice === 'number' ? p.originalPrice / 100 : undefined;
  return {
    id: String(p?.id ?? p?.sku ?? `digital_${Math.random().toString(36).slice(2, 10)}`),
    name: p?.title || p?.name || 'Untitled product',
    description: p?.subtitle || p?.description || '',
    price,
    originalPrice: original && original > price ? original : undefined,
    category: p?.category || 'digital',
    image: images[0] || '',
    images: images.length > 0 ? images : [''],
    badge: p?.badge || (p?.popular ? 'POPULAR' : undefined),
    sku: p?.sku || undefined,
    kind: 'digital',
    isDigital: true,
    raw: p,
  };
}

/** Physical store record → unified shape (prices already in dollars). */
function normalizePhysical(p: any): UnifiedProduct {
  const n = normalizeStoreProduct(p);
  return {
    id: n.id,
    name: n.name,
    description: n.description,
    price: n.price,
    originalPrice: n.originalPrice,
    category: n.category,
    image: n.image,
    images: n.images,
    badge: n.badge,
    sku: n.sku,
    kind: 'physical',
    isDigital: false,
    raw: p,
  };
}

export interface UseAllProductsResult {
  products: UnifiedProduct[];
  physical: UnifiedProduct[];
  digital: UnifiedProduct[];
  loading: boolean;
  error: string | null;
  /** true once at least one of the two catalogs answered successfully. */
  live: boolean;
  reload: () => void;
}

export function useAllProducts(limit = 200): UseAllProductsResult {
  const [products, setProducts] = useState<UnifiedProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [live, setLive] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    // Fetch both catalogs independently so one failing doesn't blank the other.
    const [physicalRes, digitalRes] = await Promise.allSettled([
      fetch(`${SERVER}/products?isActive=true&limit=${limit}`, { headers: AUTH })
        .then(async (r) => (r.ok ? (await r.json())?.products ?? [] : Promise.reject(new Error(`products ${r.status}`)))),
      fetch(`${SERVER}/marketplace/products`, { headers: AUTH })
        .then(async (r) => (r.ok ? (await r.json())?.products ?? [] : Promise.reject(new Error(`marketplace/products ${r.status}`)))),
    ]);

    const errs: string[] = [];
    let anyLive = false;

    let physical: UnifiedProduct[] = [];
    if (physicalRes.status === 'fulfilled') {
      anyLive = true;
      physical = (physicalRes.value as any[]).map(normalizePhysical);
    } else {
      errs.push(`physical catalog: ${physicalRes.reason?.message || physicalRes.reason}`);
      console.error('[useAllProducts] physical catalog failed:', physicalRes.reason);
    }

    let digital: UnifiedProduct[] = [];
    if (digitalRes.status === 'fulfilled') {
      anyLive = true;
      digital = (digitalRes.value as any[])
        .filter((p: any) => p?.visible !== false)
        .map(normalizeDigital);
    } else {
      errs.push(`digital catalog: ${digitalRes.reason?.message || digitalRes.reason}`);
      console.error('[useAllProducts] digital catalog failed:', digitalRes.reason);
    }

    setProducts([...physical, ...digital]);
    setLive(anyLive);
    setError(errs.length && !anyLive ? errs.join('; ') : null);
    setLoading(false);
  }, [limit]);

  useEffect(() => { load(); }, [load]);

  return {
    products,
    physical: products.filter((p) => !p.isDigital),
    digital: products.filter((p) => p.isDigital),
    loading,
    error,
    live,
    reload: load,
  };
}
