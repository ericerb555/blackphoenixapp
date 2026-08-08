/**
 * ProductPicker — the one product chooser every Content Center tool shares.
 *
 * Backed by useAllProducts, so it always shows the WHOLE catalog: physical/
 * dropship items AND digital products (ebooks, templates, calculators, bundles)
 * in one searchable list, filterable by kind.
 *
 * Two ways to use it:
 *   • Give it `onSelect(product)` to pick a product for the current tool.
 *   • Give it `showSendMenu` to expose a "Create content with this →" menu that
 *     routes the product into Ad Studio, Creator Studio, Store Content Studio,
 *     or the Social Scheduler via the content handoff bridge.
 */
import { useMemo, useState } from 'react';
import { Search, RefreshCw, Package, Download, AlertCircle } from 'lucide-react';
import { useAllProducts, type UnifiedProduct, type ProductKind } from '../lib/useAllProducts';
import { type ContentTarget } from '../lib/contentHandoff';
import CreateContentMenu from './CreateContentMenu';

type KindFilter = 'all' | ProductKind;

const SEND_TARGETS: ContentTarget[] = ['ad-studio', 'creator-studio', 'store-content', 'social-scheduler'];

export interface ProductPickerProps {
  /** Called when a product card is clicked (single-select mode). */
  onSelect?: (product: UnifiedProduct) => void;
  /** Show the "Create content with this →" routing menu on each card. */
  showSendMenu?: boolean;
  /** Restrict the send menu to specific tools (defaults to all). */
  sendTargets?: ContentTarget[];
  /** Optional id of the currently selected product, to highlight it. */
  selectedId?: string;
  className?: string;
}

const money = (n?: number) => (typeof n === 'number' && n > 0 ? `$${n.toFixed(2)}` : '');

export default function ProductPicker({
  onSelect,
  showSendMenu = false,
  sendTargets = SEND_TARGETS,
  selectedId,
  className = '',
}: ProductPickerProps) {
  const { products, loading, error, live, reload } = useAllProducts();
  const [query, setQuery] = useState('');
  const [kind, setKind] = useState<KindFilter>('all');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter((p) => {
      if (kind !== 'all' && p.kind !== kind) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        (p.sku || '').toLowerCase().includes(q)
      );
    });
  }, [products, query, kind]);

  const counts = useMemo(
    () => ({
      all: products.length,
      physical: products.filter((p) => !p.isDigital).length,
      digital: products.filter((p) => p.isDigital).length,
    }),
    [products],
  );

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search products…"
            className="w-full pl-9 pr-3 py-2 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-orange-500/40"
          />
        </div>
        <div className="flex items-center gap-1 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-1">
          {(['all', 'physical', 'digital'] as KindFilter[]).map((k) => (
            <button
              key={k}
              onClick={() => setKind(k)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition ${
                kind === k ? 'bg-orange-600 text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              {k} <span className="opacity-60">({counts[k]})</span>
            </button>
          ))}
        </div>
        <button
          onClick={reload}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-2 bg-[#1A1A1A] border border-[#2A2A2A] text-gray-400 hover:text-white rounded-xl text-sm transition disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      {error && !live && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-sm text-red-300 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-red-200">Couldn't load your catalog</p>
            <p className="mt-1">{error}</p>
          </div>
        </div>
      )}

      {loading && products.length === 0 ? (
        <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-12 text-center text-gray-400 text-sm">
          Loading your products…
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-12 text-center">
          <Package className="w-10 h-10 text-gray-600 mx-auto mb-4" />
          <p className="text-white font-bold">No matching products</p>
          <p className="text-sm text-gray-500 mt-1">
            {products.length === 0
              ? 'Publish a physical or digital product and it will appear here for content creation.'
              : 'Try a different search or filter.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {filtered.map((p) => {
            const isSelected = selectedId === p.id;
            return (
              <div
                key={p.id}
                className={`relative bg-[#1A1A1A] border rounded-2xl overflow-hidden transition group ${
                  isSelected ? 'border-orange-500' : 'border-[#2A2A2A] hover:border-orange-500/30'
                }`}
              >
                <button
                  onClick={() => onSelect?.(p)}
                  className="w-full text-left"
                  disabled={!onSelect}
                >
                  <div className="aspect-square bg-[#0A0A0A] flex items-center justify-center overflow-hidden">
                    {p.image ? (
                      <img src={p.image} alt={p.name} className="w-full h-full object-cover" />
                    ) : (
                      <Package className="w-8 h-8 text-gray-700" />
                    )}
                  </div>
                  <div className="p-3">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span
                        className={`inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded ${
                          p.isDigital
                            ? 'bg-purple-500/15 text-purple-300'
                            : 'bg-blue-500/15 text-blue-300'
                        }`}
                      >
                        {p.isDigital ? <Download className="w-2.5 h-2.5" /> : <Package className="w-2.5 h-2.5" />}
                        {p.isDigital ? 'Digital' : 'Physical'}
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-white truncate">{p.name}</p>
                    <p className="text-xs text-gray-500 truncate">{p.category}</p>
                    {money(p.price) && <p className="text-sm font-bold text-orange-400 mt-1">{money(p.price)}</p>}
                  </div>
                </button>

                {showSendMenu && (
                  <div className="px-3 pb-3">
                    <CreateContentMenu product={p} targets={sendTargets} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
