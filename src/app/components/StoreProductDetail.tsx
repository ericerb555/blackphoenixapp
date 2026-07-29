/**
 * StoreProductDetail — an Amazon-style product page shown as an overlay for the
 * public storefront (PublicStore).
 *
 * Goals: make buying as frictionless as possible.
 *   • Large imagery, clear title / rating / price, stock + delivery info.
 *   • Big, thumb-friendly color swatches and size chips (≥44px tap targets)
 *     that work on any device, with a required-selection guard.
 *   • Quantity stepper, Add to Cart AND a one-tap Buy Now.
 *   • Trust row (free shipping / returns / secure checkout).
 *   • Description + customer reviews.
 *   • "Customers also viewed" related-item rail underneath — clicking a related
 *     item swaps the detail view to that product.
 *
 * All shopping state (cart, wishlist, checkout) lives in PublicStore; this
 * component is presentational and calls back through props.
 */
import { useMemo, useState } from 'react';
import {
  X, Star, ShoppingCart, Heart, Check, Truck, Shield, RefreshCw,
  Package, Minus, Plus, Zap, ChevronRight,
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import StoreReviews from './StoreReviews';

export interface DetailProduct {
  id: string;
  name: string;
  description?: string;
  price: number;
  originalPrice?: number;
  category?: string;
  rating?: number;
  reviews?: number;
  image?: string;
  inStock?: boolean;
  stock?: number;
  badge?: string;
  colors?: string[];
  sizes?: string[];
}

interface Props {
  product: DetailProduct;
  related: DetailProduct[];
  wishlist: string[];
  freeShipThreshold: number;
  onClose: () => void;
  onAddToCart: (product: DetailProduct, opts: { size?: string; color?: string; quantity: number }) => void;
  onBuyNow: (product: DetailProduct, opts: { size?: string; color?: string; quantity: number }) => void;
  onToggleWishlist: (id: string) => void;
  onOpenProduct: (product: DetailProduct) => void;
}

// Named CSS colors render as a real swatch dot; anything else falls back to a
// neutral dot so unusual color names never show a broken/empty circle.
const CSS_COLORS = new Set([
  'black', 'white', 'red', 'blue', 'green', 'yellow', 'orange', 'purple', 'pink',
  'gray', 'grey', 'brown', 'navy', 'beige', 'teal', 'gold', 'silver', 'maroon',
  'olive', 'lime', 'cyan', 'magenta', 'tan', 'khaki', 'ivory', 'coral', 'salmon',
]);
const swatchColor = (name: string) => {
  const n = name.trim().toLowerCase();
  return CSS_COLORS.has(n) ? n : 'transparent';
};

export default function StoreProductDetail({
  product, related, wishlist, freeShipThreshold,
  onClose, onAddToCart, onBuyNow, onToggleWishlist, onOpenProduct,
}: Props) {
  const hasSizes = !!(product.sizes && product.sizes.length);
  const hasColors = !!(product.colors && product.colors.length);
  const [size, setSize] = useState('');
  const [color, setColor] = useState('');
  const [qty, setQty] = useState(1);

  const rating = product.rating ?? 4.5;
  const reviews = product.reviews ?? 0;
  const inStock = product.inStock !== false;
  const discount = product.originalPrice && product.originalPrice > product.price
    ? Math.round((1 - product.price / product.originalPrice) * 100)
    : 0;
  const remainingForFreeShip = Math.max(0, freeShipThreshold - product.price * qty);

  const requireSelections = () => {
    if (hasSizes && !size) { toast.error('Please select a size first.'); return false; }
    if (hasColors && !color) { toast.error('Please choose a color first.'); return false; }
    return true;
  };
  const opts = useMemo(() => ({ size: size || undefined, color: color || undefined, quantity: qty }), [size, color, qty]);

  const handleAdd = () => { if (!requireSelections()) return; onAddToCart(product, opts); };
  const handleBuy = () => { if (!requireSelections()) return; onBuyNow(product, opts); };

  const selectableStyle = (active: boolean) => active
    ? { background: '#ea580c', color: '#fff', borderColor: '#ea580c' }
    : { background: 'rgba(255,255,255,0.06)', color: '#e5e7eb', borderColor: 'rgba(255,255,255,0.14)' };

  return (
    <div className="fixed inset-0 z-[60] flex sm:items-center justify-center sm:p-4">
      <div className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={onClose} />

      <div
        className="relative w-full sm:max-w-5xl h-full sm:h-auto sm:max-h-[92vh] overflow-y-auto sm:rounded-3xl"
        style={{ background: '#0f0f0f', border: '1px solid rgba(255,255,255,0.09)' }}
      >
        {/* Close */}
        <button
          onClick={onClose}
          className="sticky top-3 float-right mr-3 z-10 w-10 h-10 rounded-xl flex items-center justify-center text-gray-300 hover:text-white transition"
          style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }}
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-4 sm:p-8">
          <div className="flex flex-col md:flex-row gap-6 lg:gap-10">
            {/* ── Gallery ─────────────────────────────────────────────── */}
            <div className="md:w-[46%] flex-shrink-0">
              <div className="relative rounded-2xl overflow-hidden aspect-square" style={{ background: 'rgba(255,255,255,0.04)' }}>
                {product.image && product.image !== '/placeholder-product.jpg'
                  ? <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                  : <div className="w-full h-full flex items-center justify-center"><Package className="w-24 h-24 text-gray-700" /></div>}
                {discount > 0 && (
                  <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full text-xs font-black" style={{ background: '#ea580c' }}>-{discount}%</span>
                )}
              </div>
            </div>

            {/* ── Buy box ─────────────────────────────────────────────── */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                {product.badge && <span className="px-3 py-1 rounded-full text-xs font-black" style={{ background: '#ea580c' }}>{product.badge}</span>}
                {product.category && <span className="text-xs text-gray-500">{product.category}</span>}
              </div>

              <h1 className="text-2xl sm:text-3xl font-black text-white leading-tight mb-2">{product.name}</h1>

              <div className="flex items-center gap-2 mb-4">
                <div className="flex">{[1, 2, 3, 4, 5].map(s => (
                  <Star key={s} className={`w-4 h-4 ${s <= Math.round(rating) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-700'}`} />
                ))}</div>
                <span className="text-xs text-gray-400">{rating.toFixed(1)} · {reviews.toLocaleString()} review{reviews === 1 ? '' : 's'}</span>
              </div>

              <div className="flex items-end gap-3 mb-1">
                <span className="text-4xl font-black text-white">${product.price.toFixed(2)}</span>
                {product.originalPrice && product.originalPrice > product.price && (
                  <span className="text-lg text-gray-600 line-through pb-1">${product.originalPrice.toFixed(2)}</span>
                )}
                {discount > 0 && <span className="pb-1.5 text-sm font-bold text-green-400">Save {discount}%</span>}
              </div>

              {/* Stock */}
              <p className={`text-sm font-semibold mb-5 ${inStock ? 'text-green-400' : 'text-red-400'}`}>
                {inStock
                  ? (typeof product.stock === 'number' && product.stock > 0 && product.stock <= 10
                    ? `Only ${product.stock} left in stock — order soon`
                    : 'In stock')
                  : 'Currently out of stock'}
              </p>

              {/* Colors */}
              {hasColors && (
                <div className="mb-5">
                  <p className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-2">
                    Color {color ? <span className="text-orange-400 normal-case">· {color}</span> : <span className="text-gray-600 normal-case">· choose one</span>}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {product.colors!.map(c => {
                      const active = color === c;
                      return (
                        <button key={c} onClick={() => setColor(c)}
                          className="flex items-center gap-2 rounded-xl border text-sm font-semibold transition active:scale-95"
                          style={{ minHeight: 44, padding: '0 14px', ...selectableStyle(active) }}>
                          <span className="w-4 h-4 rounded-full border border-white/30" style={{ background: swatchColor(c) }} />
                          {c}
                          {active && <Check className="w-3.5 h-3.5" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Sizes */}
              {hasSizes && (
                <div className="mb-5">
                  <p className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-2">
                    Size {size ? <span className="text-orange-400 normal-case">· {size}</span> : <span className="text-gray-600 normal-case">· choose one</span>}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {product.sizes!.map(s => {
                      const active = size === s;
                      return (
                        <button key={s} onClick={() => setSize(s)}
                          className="rounded-xl border text-sm font-bold transition active:scale-95 flex items-center justify-center"
                          style={{ minWidth: 52, minHeight: 44, padding: '0 10px', ...selectableStyle(active) }}>
                          {s}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Quantity */}
              <div className="mb-6">
                <p className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-2">Quantity</p>
                <div className="inline-flex items-center rounded-xl border" style={{ borderColor: 'rgba(255,255,255,0.14)', background: 'rgba(255,255,255,0.06)' }}>
                  <button onClick={() => setQty(q => Math.max(1, q - 1))} className="w-11 h-11 flex items-center justify-center text-white hover:bg-white/10 rounded-l-xl" aria-label="Decrease quantity">
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="w-12 text-center text-white font-bold">{qty}</span>
                  <button onClick={() => setQty(q => q + 1)} className="w-11 h-11 flex items-center justify-center text-white hover:bg-white/10 rounded-r-xl" aria-label="Increase quantity">
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-3 mb-4">
                <button onClick={handleAdd} disabled={!inStock}
                  className="flex-1 py-4 rounded-2xl font-black text-base flex items-center justify-center gap-2 transition hover:brightness-110 active:scale-95 disabled:opacity-40"
                  style={{ background: 'rgba(234,88,12,0.15)', color: '#fb923c', border: '1px solid rgba(234,88,12,0.5)' }}>
                  <ShoppingCart className="w-5 h-5" /> Add to Cart
                </button>
                <button onClick={handleBuy} disabled={!inStock}
                  className="flex-1 py-4 rounded-2xl font-black text-base flex items-center justify-center gap-2 transition hover:brightness-110 active:scale-95 disabled:opacity-40"
                  style={{ background: '#ea580c', color: '#fff', boxShadow: '0 8px 28px rgba(234,88,12,0.35)' }}>
                  <Zap className="w-5 h-5" /> Buy Now
                </button>
              </div>

              {/* Wishlist */}
              <button onClick={() => onToggleWishlist(product.id)}
                className="w-full py-3 mb-5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition hover:bg-white/5"
                style={{ border: '1px solid rgba(255,255,255,0.12)', color: '#e5e7eb' }}>
                <Heart className={`w-4 h-4 ${wishlist.includes(product.id) ? 'fill-red-500 text-red-500' : ''}`} />
                {wishlist.includes(product.id) ? 'Saved to Wishlist' : 'Add to Wishlist'}
              </button>

              {/* Trust / delivery */}
              <div className="rounded-2xl p-4 space-y-2.5" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <div className="flex items-center gap-2.5 text-sm text-gray-300">
                  <Truck className="w-4 h-4 flex-shrink-0" style={{ color: '#ea580c' }} />
                  {remainingForFreeShip > 0
                    ? <span>Add <b className="text-white">${remainingForFreeShip.toFixed(2)}</b> more to unlock FREE shipping</span>
                    : <span className="text-green-400 font-semibold">This order qualifies for FREE shipping 🎉</span>}
                </div>
                <div className="flex items-center gap-2.5 text-sm text-gray-300">
                  <RefreshCw className="w-4 h-4 flex-shrink-0" style={{ color: '#ea580c' }} /> 30-day hassle-free returns
                </div>
                <div className="flex items-center gap-2.5 text-sm text-gray-300">
                  <Shield className="w-4 h-4 flex-shrink-0" style={{ color: '#ea580c' }} /> Secure SSL checkout · family owned &amp; operated
                </div>
              </div>
            </div>
          </div>

          {/* ── Description ───────────────────────────────────────────── */}
          {product.description && (
            <div className="mt-8 pt-6 border-t" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
              <h2 className="text-lg font-black text-white mb-2">Product Details</h2>
              <p className="text-sm text-gray-400 leading-relaxed whitespace-pre-line">{product.description}</p>
            </div>
          )}

          {/* ── Reviews ───────────────────────────────────────────────── */}
          <div className="mt-8 pt-6 border-t" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
            <h2 className="text-lg font-black text-white mb-3">Customer Reviews</h2>
            <StoreReviews productId={product.id} compact />
          </div>

          {/* ── Related — "Customers also viewed" ─────────────────────── */}
          {related.length > 0 && (
            <div className="mt-8 pt-6 border-t" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-black text-white">Customers also viewed</h2>
                <ChevronRight className="w-5 h-5 text-gray-600" />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {related.map(r => (
                  <button key={r.id} onClick={() => onOpenProduct(r)}
                    className="group text-left rounded-2xl overflow-hidden transition hover:-translate-y-1"
                    style={{ background: 'rgba(255,255,255,0.035)', border: '1px solid rgba(255,255,255,0.07)' }}>
                    <div className="aspect-square overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)' }}>
                      {r.image && r.image !== '/placeholder-product.jpg'
                        ? <img src={r.image} alt={r.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                        : <div className="w-full h-full flex items-center justify-center"><Package className="w-10 h-10 text-gray-700" /></div>}
                    </div>
                    <div className="p-3">
                      <p className="text-xs font-bold text-white line-clamp-2 leading-snug mb-1">{r.name}</p>
                      <div className="flex items-center gap-1 mb-1">
                        {[1, 2, 3, 4, 5].map(s => (
                          <Star key={s} className={`w-2.5 h-2.5 ${s <= Math.round(r.rating ?? 4.5) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-800'}`} />
                        ))}
                      </div>
                      <span className="text-sm font-black" style={{ color: '#fb923c' }}>${r.price.toFixed(2)}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
