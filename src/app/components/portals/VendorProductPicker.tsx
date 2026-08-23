/**
 * VendorProductPicker — lets a customer choose real products at real prices.
 *
 * WHY THIS EXISTS
 *
 * Until now the only way a product reached a quote was through Materials Center,
 * which is a staff tool. So the customer described what they wanted in prose and
 * somebody translated it into materials by hand. Every translation is a chance
 * to price the wrong thing.
 *
 * WHAT MAKES A LINE FROM HERE DIFFERENT
 *
 * A line picked here carries its `vendorId` and `sku`. That matters downstream:
 * the purchase order route can group by vendor with certainty instead of
 * guessing from a supplier name, which is the code path that once matched a
 * two-character string to Home Depot. Nothing on this screen is invented — the
 * price shown is the price the vendor published.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Search, Plus, Minus, Package, Loader2, Check } from 'lucide-react';
import { projectId } from '../../utils/supabase/info';
import { authedHeaders } from '../../utils/authHeaders';
import { catalogKey } from '../../lib/quoteLines';

const SERVER = `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6`;

export interface CatalogProduct {
  vendorId: string;
  vendorName: string;
  name: string;
  sku: string;
  unit: string;
  price: number;
  category?: string;
  availability?: string;
  leadTimeDays?: number | null;
}

export interface PickedProduct extends CatalogProduct {
  quantity: number;
}

interface Props {
  /** Called with the chosen product and quantity. */
  onAdd: (product: PickedProduct) => void;
  /** SKUs already in the quote, so the picker can show them as added. */
  chosenSkus?: string[];
  accent?: string;
  /** The customer portal's quote builder is dark; staff screens are light. */
  theme?: 'light' | 'dark';
}

/** One palette per surface, so the picker never sits light-on-dark. */
const PALETTES = {
  light: { text: '#111827', muted: '#6b7280', border: '#e5e7eb', field: '#d1d5db', surface: '#fff', input: '#fff' },
  dark: { text: '#f3f4f6', muted: '#9ca3af', border: '#2A2A2A', field: '#3A3A3A', surface: '#0A0A0A', input: '#0A0A0A' },
} as const;

export function VendorProductPicker({ onAdd, chosenSkus = [], accent = '#f97316', theme = 'light' }: Props) {
  const c = PALETTES[theme];
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<CatalogProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState('');
  const [quantities, setQuantities] = useState<Record<string, number>>({});

  // A search per keystroke would hammer the function and race its own results.
  const timer = useRef<any>(null);
  const latest = useRef(0);

  const keyOf = useCallback((p: CatalogProduct) => catalogKey(p), []);

  const chosen = useMemo(() => new Set(chosenSkus), [chosenSkus]);

  useEffect(() => {
    const term = query.trim();
    if (timer.current) clearTimeout(timer.current);

    if (term.length < 2) {
      setResults([]);
      setSearched(false);
      setLoading(false);
      return;
    }

    setLoading(true);
    timer.current = setTimeout(async () => {
      // Only the newest search may write results — otherwise a slow early
      // request can land after a fast later one and show the wrong products.
      const ticket = ++latest.current;
      try {
        const url = new URL(`${SERVER}/vendor-catalog-search`);
        url.searchParams.set('q', term);
        // The catalogue search requires a signed-in user — vendor pricing is not
        // public. The anon key gets a 401 here.
        const res = await fetch(url.toString(), { headers: await authedHeaders() });
        const data = await res.json().catch(() => ({}));
        if (ticket !== latest.current) return;
        if (!res.ok || data.success === false) {
          throw new Error(data.error || 'Could not search the catalogue.');
        }
        setResults(Array.isArray(data.matches) ? data.matches : []);
        setError('');
      } catch (e: any) {
        if (ticket !== latest.current) return;
        setError(e.message || 'Could not search the catalogue.');
        setResults([]);
      } finally {
        if (ticket === latest.current) {
          setLoading(false);
          setSearched(true);
        }
      }
    }, 300);

    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [query]);

  const setQty = (key: string, next: number) => {
    setQuantities(prev => ({ ...prev, [key]: Math.max(1, Math.min(9999, next)) }));
  };

  return (
    <div>
      <div style={{ position: 'relative', marginBottom: 16 }}>
        <Search
          size={18}
          style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: c.muted, pointerEvents: 'none' }}
        />
        <input
          type="search"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search products — decking, tile, fixtures, cabinets…"
          aria-label="Search vendor products"
          style={{
            width: '100%',
            // globals.css sets padding on every input unlayered, so the room
            // for the icon has to be stated here or the two overlap.
            paddingLeft: 42,
            paddingRight: 14,
            paddingTop: 12,
            paddingBottom: 12,
            minHeight: 44,
            borderRadius: 10,
            border: `1px solid ${c.field}`,
            background: c.input,
            color: c.text,
            fontSize: 15,
          }}
        />
      </div>

      {loading && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '20px 4px', color: c.muted }}>
          <Loader2 size={16} className="animate-spin" />
          <span>Searching vendor catalogues…</span>
        </div>
      )}

      {!loading && error && (
        <div style={{
          padding: 16, borderRadius: 10,
          background: theme === 'dark' ? 'rgba(185,28,28,0.15)' : '#fef2f2',
          border: `1px solid ${theme === 'dark' ? '#7f1d1d' : '#fecaca'}`,
          color: theme === 'dark' ? '#fca5a5' : '#b91c1c',
        }}>
          {error}
        </div>
      )}

      {!loading && !error && query.trim().length < 2 && (
        <div style={{ padding: '28px 4px', color: c.muted, textAlign: 'center' }}>
          <Package size={28} style={{ margin: '0 auto 10px', display: 'block', opacity: 0.5 }} />
          Type at least two characters to search products from our vendors.
        </div>
      )}

      {!loading && !error && searched && results.length === 0 && query.trim().length >= 2 && (
        <div style={{ padding: '28px 4px', color: c.muted, textAlign: 'center' }}>
          No products matched “{query.trim()}”. Try a broader word, or add it to your
          request as a note and we'll source it.
        </div>
      )}

      <div style={{ display: 'grid', gap: 10 }}>
        {!loading && results.map(product => {
          const key = keyOf(product);
          const qty = quantities[key] || 1;
          const alreadyAdded = chosen.has(key);
          return (
            <div
              key={key}
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                gap: 12,
                padding: 14,
                borderRadius: 10,
                border: `1px solid ${c.border}`,
                background: c.surface,
              }}
            >
              <div style={{ flex: '1 1 220px', minWidth: 0 }}>
                <div style={{ fontWeight: 600, color: c.text }}>{product.name}</div>
                <div style={{ fontSize: 13, color: c.muted, marginTop: 2 }}>
                  {product.vendorName}
                  {product.sku ? ` · SKU ${product.sku}` : ''}
                </div>
                {(product.availability || typeof product.leadTimeDays === 'number') && (
                  <div style={{ fontSize: 12, color: c.muted, marginTop: 4 }}>
                    {product.availability}
                    {product.availability && typeof product.leadTimeDays === 'number' ? ' · ' : ''}
                    {typeof product.leadTimeDays === 'number'
                      ? product.leadTimeDays === 0
                        ? 'Available now'
                        : `${product.leadTimeDays} day lead time`
                      : ''}
                  </div>
                )}
              </div>

              <div style={{ textAlign: 'right', minWidth: 96, fontVariantNumeric: 'tabular-nums' }}>
                <div style={{ fontWeight: 700, color: c.text }}>
                  ${Number(product.price || 0).toFixed(2)}
                </div>
                <div style={{ fontSize: 12, color: c.muted }}>per {product.unit || 'each'}</div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <button
                  type="button"
                  onClick={() => setQty(key, qty - 1)}
                  aria-label={`Decrease quantity of ${product.name}`}
                  style={stepBtn(c)}
                >
                  <Minus size={15} />
                </button>
                <input
                  type="number"
                  min={1}
                  value={qty}
                  onChange={e => setQty(key, Number(e.target.value) || 1)}
                  aria-label={`Quantity of ${product.name}`}
                  style={{
                    width: 58, textAlign: 'center', padding: 6, minHeight: 44,
                    border: `1px solid ${c.field}`, borderRadius: 8, fontVariantNumeric: 'tabular-nums',
                    background: c.input, color: c.text,
                  }}
                />
                <button
                  type="button"
                  onClick={() => setQty(key, qty + 1)}
                  aria-label={`Increase quantity of ${product.name}`}
                  style={stepBtn(c)}
                >
                  <Plus size={15} />
                </button>
              </div>

              {/*
                Deliberately still enabled once added. Disabling it stranded a
                customer who wanted five more of something already in the list —
                the quantity could only be changed by removing the line and
                starting again. Adding again raises the quantity instead.
              */}
              <button
                type="button"
                onClick={() => onAdd({ ...product, quantity: qty })}
                aria-label={alreadyAdded
                  ? `Add ${qty} more ${product.name} to your quote`
                  : `Add ${product.name} to your quote`}
                style={{
                  minHeight: 44,
                  padding: '0 18px',
                  borderRadius: 8,
                  border: alreadyAdded ? '1px solid #22c55e' : 'none',
                  fontWeight: 600,
                  cursor: 'pointer',
                  background: alreadyAdded ? 'rgba(34,197,94,0.15)' : accent,
                  color: alreadyAdded ? '#22c55e' : '#fff',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  whiteSpace: 'nowrap',
                }}
              >
                {alreadyAdded ? <><Check size={15} /> Add more</> : 'Add'}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const stepBtn = (c: { field: string; input: string; text: string }): React.CSSProperties => ({
  // 44px is the tap floor the rest of the app uses; 40 is a miss on a phone.
  width: 44, height: 44, minHeight: 44,
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  border: `1px solid ${c.field}`, borderRadius: 8,
  background: c.input, color: c.text, cursor: 'pointer',
});

export default VendorProductPicker;
