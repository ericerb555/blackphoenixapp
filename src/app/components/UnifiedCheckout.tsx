// UnifiedCheckout — the single, shared checkout experience used by EVERY storefront.
//
// Why this exists: the app used to have several different checkout UIs (a 4-step
// marketplace flow, a single-form Stripe flow, a name+email digital flow), each
// with their own scroll/sizing/z-index bugs. This component is the one source of
// truth for checkout UX so every store behaves identically:
//   • full-screen on mobile, height-constrained card on desktop (100dvh)
//   • header → scrollable body → footer, with overscroll-contain
//   • z-[10000] so no floating widget can ever cover the buttons
//   • an always-available "Edit cart" affordance
//
// Each store keeps its own backend by passing an `onSubmit` handler. The handler
// returns either a Stripe redirect URL, an in-app success, or an error string.
import { useState } from 'react';
import { X, Lock, Shield } from 'lucide-react';
import { toast } from 'sonner';

export interface UnifiedCheckoutItem {
  id: string;
  name: string;
  price: number; // dollars
  quantity: number;
  image?: string;
  variant?: string;
}

export interface UnifiedCheckoutCustomer {
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  zip: string;
}

export interface UnifiedCheckoutResult {
  // Redirect the browser to a hosted payment page (e.g. Stripe Checkout).
  url?: string;
  // The order completed in-app (no redirect needed).
  success?: boolean;
  // A message to toast on success.
  message?: string;
  // A human-readable error to show inline; keeps the form open.
  error?: string;
}

interface UnifiedCheckoutProps {
  open: boolean;
  items: UnifiedCheckoutItem[];
  subtotal: number;
  shipping?: number;
  tax?: number;
  /** Physical goods need a shipping address; digital goods do not. */
  requireShipping?: boolean;
  /** Text for the pay button, given the amount due. */
  submitLabel?: (amountDue: number) => string;
  initialCustomer?: Partial<UnifiedCheckoutCustomer>;
  onSubmit: (customer: UnifiedCheckoutCustomer) => Promise<UnifiedCheckoutResult>;
  onClose: () => void;
  /** Jump back to the cart to add/remove items mid-checkout. */
  onEditCart?: () => void;
  /** Optional extra section (e.g. gift-card entry) rendered above the form. */
  extraContent?: React.ReactNode;
}

const EMPTY: UnifiedCheckoutCustomer = { name: '', email: '', phone: '', address: '', city: '', zip: '' };

export default function UnifiedCheckout({
  open,
  items,
  subtotal,
  shipping = 0,
  tax = 0,
  requireShipping = true,
  submitLabel,
  initialCustomer,
  onSubmit,
  onClose,
  onEditCart,
  extraContent,
}: UnifiedCheckoutProps) {
  const [customer, setCustomer] = useState<UnifiedCheckoutCustomer>({ ...EMPTY, ...initialCustomer });
  const [error, setError] = useState('');
  const [processing, setProcessing] = useState(false);

  if (!open) return null;

  const total = subtotal + shipping + tax;
  const set = (key: keyof UnifiedCheckoutCustomer, val: string) => setCustomer(c => ({ ...c, [key]: val }));

  const fields: { key: keyof UnifiedCheckoutCustomer; label: string; type: string; placeholder: string; shipping?: boolean }[] = [
    { key: 'name', label: 'Full Name *', type: 'text', placeholder: 'John Smith' },
    { key: 'email', label: 'Email *', type: 'email', placeholder: 'you@example.com' },
    { key: 'phone', label: 'Phone', type: 'tel', placeholder: '(614) 555-0000' },
    { key: 'address', label: 'Shipping Address *', type: 'text', placeholder: '123 Main St', shipping: true },
    { key: 'city', label: 'City *', type: 'text', placeholder: 'Columbus', shipping: true },
    { key: 'zip', label: 'ZIP Code *', type: 'text', placeholder: '43215', shipping: true },
  ];
  const visibleFields = fields.filter(f => !f.shipping || requireShipping);

  async function handleSubmit() {
    if (!customer.name.trim()) { setError('Name is required'); return; }
    if (!customer.email.trim() || !customer.email.includes('@')) { setError('A valid email is required'); return; }
    if (requireShipping && (!customer.address.trim() || !customer.city.trim() || !customer.zip.trim())) {
      setError('Full shipping address is required');
      return;
    }
    setError('');
    setProcessing(true);
    try {
      const result = await onSubmit(customer);
      if (result.url) {
        window.location.href = result.url;
        return; // keep spinner while the browser navigates
      }
      if (result.success) {
        if (result.message) toast.success(result.message);
        onClose();
        return;
      }
      setError(result.error || 'Payment setup failed. Please try again.');
      setProcessing(false);
    } catch (err: any) {
      setError(err?.message || 'Could not connect to the payment processor. Please try again.');
      setProcessing(false);
    }
  }

  const label = submitLabel ? submitLabel(total) : `Pay $${total.toFixed(2)}`;

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-[10000] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div
        className="w-full sm:max-w-lg h-[100dvh] sm:h-auto sm:max-h-[90dvh] flex flex-col rounded-none sm:rounded-3xl overflow-hidden shadow-2xl"
        style={{ background: '#0f0f0f', border: '1px solid rgba(234,88,12,0.25)' }}
      >
        {/* Header */}
        <div
          className="flex-shrink-0 flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b"
          style={{ borderColor: 'rgba(255,255,255,0.07)', background: 'rgba(234,88,12,0.05)' }}
        >
          <div className="min-w-0 flex-1 pr-3">
            <p className="text-sm font-black text-white truncate">Secure Checkout</p>
            <p className="text-xs text-gray-500 mt-0.5 truncate">
              {items.reduce((n, i) => n + i.quantity, 0)} item{items.reduce((n, i) => n + i.quantity, 0) !== 1 ? 's' : ''} · ${total.toFixed(2)} total
            </p>
          </div>
          <button onClick={onClose} className="flex-shrink-0 p-2 rounded-xl text-gray-600 hover:text-white transition" style={{ background: 'rgba(255,255,255,0.05)' }}>
            <X className="w-4 h-4" />
          </button>
        </div>

        {processing ? (
          <div className="flex-1 flex flex-col items-center justify-center py-12 px-6">
            <div className="w-10 h-10 rounded-full border-2 border-orange-500 border-t-transparent animate-spin mb-4" />
            <p className="text-sm font-black text-white">Setting up secure payment…</p>
            <p className="text-xs text-gray-500 mt-1">One moment</p>
          </div>
        ) : (
          <div className="flex-1 min-h-0 px-4 sm:px-6 py-4 space-y-3 overflow-y-auto overscroll-contain">
            {/* Order summary */}
            <div className="rounded-xl p-3 space-y-2" style={{ background: '#161616', border: '1px solid rgba(255,255,255,0.07)' }}>
              <div className="flex items-center justify-between gap-2 mb-2">
                <p className="text-[10px] sm:text-xs font-black text-gray-500 uppercase tracking-wider sm:tracking-widest truncate">Order Summary</p>
                {onEditCart && (
                  <button onClick={onEditCart} className="flex-shrink-0 whitespace-nowrap text-xs font-bold text-orange-400 hover:text-orange-300 transition">
                    Edit cart
                  </button>
                )}
              </div>
              {items.map(item => (
                <div key={`${item.id}|${item.variant || ''}`} className="flex justify-between gap-2 text-xs sm:text-sm">
                  <span className="text-gray-400 truncate min-w-0">
                    {item.name}{item.variant ? ` (${item.variant})` : ''} × {item.quantity}
                  </span>
                  <span className="text-white font-bold flex-shrink-0">${(item.price * item.quantity).toFixed(2)}</span>
                </div>
              ))}
              {requireShipping && (
                <div className="border-t pt-2 mt-2 flex justify-between gap-2 text-xs sm:text-sm" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
                  <span className="text-gray-500">Shipping</span>
                  <span className="text-white">{shipping === 0 ? 'FREE' : `$${shipping.toFixed(2)}`}</span>
                </div>
              )}
              {tax > 0 && (
                <div className="flex justify-between gap-2 text-xs sm:text-sm">
                  <span className="text-gray-500">Tax</span>
                  <span className="text-white">${tax.toFixed(2)}</span>
                </div>
              )}
              <div className="border-t pt-2 flex justify-between gap-2 text-sm sm:text-base font-black" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
                <span className="text-white">Total</span>
                <span style={{ color: '#ea580c' }}>${total.toFixed(2)}</span>
              </div>
            </div>

            {extraContent}

            <p className="text-[10px] font-black text-gray-500 uppercase tracking-wider sm:tracking-widest">Your Information</p>
            {visibleFields.map(field => (
              <div key={field.key}>
                <label className="text-xs font-bold text-gray-500 block mb-1">{field.label}</label>
                <input
                  type={field.type}
                  value={customer[field.key]}
                  onChange={e => set(field.key, e.target.value)}
                  placeholder={field.placeholder}
                  /* 16px on mobile: iOS Safari force-zooms the page when a focused
                     input is under 16px, and that zoom is what pushes the modal's
                     text past the edge of the screen. text-sm again on desktop. */
                  className="w-full px-3 py-2.5 rounded-xl text-base sm:text-sm text-white placeholder-gray-700 focus:outline-none focus:border-orange-500/50"
                  style={{ background: '#161616', border: '1px solid rgba(255,255,255,0.08)' }}
                />
              </div>
            ))}

            {error && <p className="text-xs sm:text-sm text-red-400 font-bold break-words">{error}</p>}

            <button
              onClick={handleSubmit}
              className="w-full py-3.5 rounded-2xl font-black text-sm text-white flex items-center justify-center gap-2 hover:brightness-110 transition"
              style={{ background: 'linear-gradient(135deg, #ea580c, #c2410c)', boxShadow: '0 4px 20px rgba(234,88,12,0.35)' }}
            >
              <Lock className="w-4 h-4 flex-shrink-0" /> <span className="truncate">{label}</span>
            </button>
            <div className="flex items-center justify-center gap-1.5 text-[10px] text-gray-600 text-center">
              <Shield className="w-3 h-3 flex-shrink-0 text-green-500" /> 256-bit SSL encrypted secure checkout
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
