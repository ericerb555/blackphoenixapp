// Shopping Cart Component
// Full cart view with checkout flow
import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  Truck, Trash2, X, Store, Plus, Package, Minus, Lock,
  CreditCard, ArrowRight, AlertCircle, ShoppingCart as ShoppingCartIcon,
} from 'lucide-react';
import { StandardButton, CompactStandardButton } from './ui/button/StandardButton';
import UnifiedCheckout from './UnifiedCheckout';
import * as hybridCart from '../utils/hybridCartApi';
import { projectId, publicAnonKey } from '../utils/supabase/info';

const SERVER = `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6`;

interface CartItem {
  id: string;
  productId: string;
  productName: string;
  productImage?: string;
  price: number;
  quantity: number;
  vendorId: string;
  vendorName: string;
  maxQuantity?: number;
}

interface ShoppingCartProps {
  onClose: () => void;
  initialOpen?: boolean;
}

export default function ShoppingCart({ onClose, initialOpen = false }: ShoppingCartProps) {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [showCheckout, setShowCheckout] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadCart();

    // Listen for cart updates
    const handleCartUpdate = () => {
      loadCart();
    };

    window.addEventListener('cart-updated', handleCartUpdate);
    return () => window.removeEventListener('cart-updated', handleCartUpdate);
  }, []);

  const loadCart = async () => {
    try {
      setLoading(true);
      setError(null);

      const result = await hybridCart.getCart();
      
      if (result.success && result.cart) {
        // Map the cart items to the expected format
        const mappedItems = (result.cart.items || []).map((item: any) => ({
          id: item.id,
          productId: item.productId,
          productName: item.name || item.productName,
          productImage: item.imageUrl || item.productImage,
          price: item.price,
          quantity: item.quantity,
          vendorId: item.vendorId || 'unknown',
          vendorName: item.vendorName || 'Unknown Vendor',
          maxQuantity: item.maxQuantity
        }));
        setCartItems(mappedItems);
      } else {
        setCartItems([]);
      }
    } catch (error) {
      // Silently handle cart loading - hybrid system will use local storage
      setCartItems([]);
      setError(null); // Don't show error UI for cart loading issues
    } finally {
      setLoading(false);
    }
  };

  const updateQuantity = async (itemId: string, newQuantity: number) => {
    if (newQuantity < 1) return;

    setUpdating(itemId);
    try {
      const result = await hybridCart.updateCartItem(itemId, newQuantity);
      
      if (result.success && result.cart) {
        const mappedItems = (result.cart.items || []).map((item: any) => ({
          id: item.id,
          productId: item.productId,
          productName: item.name || item.productName,
          productImage: item.imageUrl || item.productImage,
          price: item.price,
          quantity: item.quantity,
          vendorId: item.vendorId || 'unknown',
          vendorName: item.vendorName || 'Unknown Vendor',
          maxQuantity: item.maxQuantity
        }));
        setCartItems(mappedItems);
      }
    } catch (error) {
      console.error('Error updating quantity:', error);
    } finally {
      setUpdating(null);
    }
  };

  const removeItem = async (itemId: string) => {
    setUpdating(itemId);
    try {
      const result = await hybridCart.removeFromCart(itemId);
      
      if (result.success && result.cart) {
        const mappedItems = (result.cart.items || []).map((item: any) => ({
          id: item.id,
          productId: item.productId,
          productName: item.name || item.productName,
          productImage: item.imageUrl || item.productImage,
          price: item.price,
          quantity: item.quantity,
          vendorId: item.vendorId || 'unknown',
          vendorName: item.vendorName || 'Unknown Vendor',
          maxQuantity: item.maxQuantity
        }));
        setCartItems(mappedItems);
      }
    } catch (error) {
      console.error('Error removing item:', error);
    } finally {
      setUpdating(null);
    }
  };

  const clearCart = async () => {
    if (!confirm('Are you sure you want to clear your cart?')) return;

    try {
      const result = await hybridCart.clearCart();
      
      if (result.success) {
        setCartItems([]);
      }
    } catch (error) {
      console.error('Error clearing cart:', error);
    }
  };

  // Calculate totals
  const subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const tax = subtotal * 0.08; // 8% tax
  const shipping = subtotal > 100 ? 0 : 15; // Free shipping over $100
  const total = subtotal + tax + shipping;

  // Group items by vendor
  const itemsByVendor = cartItems.reduce((acc, item) => {
    if (!acc[item.vendorId]) {
      acc[item.vendorId] = {
        vendorName: item.vendorName,
        items: []
      };
    }
    acc[item.vendorId].items.push(item);
    return acc;
  }, {} as Record<string, { vendorName: string; items: CartItem[] }>);

  if (showCheckout) {
    return (
      <UnifiedCheckout
        open
        items={cartItems.map(item => ({
          id: String(item.id),
          name: item.productName,
          price: item.price,
          quantity: item.quantity,
          image: item.productImage,
          variant: item.vendorName,
        }))}
        subtotal={subtotal}
        shipping={shipping}
        tax={tax}
        requireShipping
        submitLabel={amt => `Pay $${amt.toFixed(2)}`}
        onEditCart={() => setShowCheckout(false)}
        onClose={() => setShowCheckout(false)}
        onSubmit={async customer => {
          // Real Stripe checkout on the e-commerce account — the same endpoint
          // the public storefront uses, so these orders land in Order Manager
          // and get forwarded for fulfillment like any other purchase.
          try {
            const res = await fetch(`${SERVER}/store/checkout`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', apikey: publicAnonKey, Authorization: `Bearer ${publicAnonKey}` },
              body: JSON.stringify({
                items: cartItems.map(item => ({
                  id: item.productId || item.id,
                  name: item.productName,
                  price: item.price,
                  qty: item.quantity,
                  quantity: item.quantity,
                  image: item.productImage,
                  vendorId: item.vendorId,
                  vendorName: item.vendorName,
                })),
                customer: {
                  name: customer.name,
                  email: customer.email,
                  phone: customer.phone,
                  address: `${customer.address}, ${customer.city} ${customer.zip}`,
                },
                shipping,
                tax,
                giftCardCode: null,
                coupon: null,
              }),
            });
            const data = await res.json().catch(() => null);

            if (data?.zeroBalanceOrder && data?.order) {
              try { await hybridCart.clearCart(); } catch { /* offline fallback */ }
              setCartItems([]);
              window.dispatchEvent(new Event('cart-updated'));
              return { success: true, message: `Order ${data.order.id} confirmed.` };
            }
            // Stripe hosted checkout — the cart is cleared on confirmed return,
            // never before the money actually moves.
            if (res.ok && data?.url) return { url: data.url };

            const reason = data?.error || `Checkout could not be started (${res.status}).`;
            console.error('[ShoppingCart] checkout failed:', reason);
            return { error: reason };
          } catch (err: any) {
            console.error('[ShoppingCart] checkout request threw:', err);
            return { error: err?.message || 'Could not reach the payment processor. Nothing was charged.' };
          }
        }}
      />
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[10000] flex items-center justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0, x: 100 }}
        animate={{ scale: 1, opacity: 1, x: 0 }}
        exit={{ scale: 0.95, opacity: 0, x: 100 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto my-8"
      >
        {/* Header */}
        <div className="sticky top-0 bg-[#1A1A1A] border-b border-[#2A2A2A] p-6 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#ea580c] to-orange-700 flex items-center justify-center">
              <ShoppingCartIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Shopping Cart</h2>
              <p className="text-sm text-gray-400">{cartItems.length} {cartItems.length === 1 ? 'item' : 'items'}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-[#2A2A2A] rounded-lg transition-colors text-gray-400 hover:text-white"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#ea580c]"></div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">Error Loading Cart</h3>
                <p className="text-gray-400 mb-4">{error}</p>
                <StandardButton variant="primary" onClick={loadCart}>
                  Try Again
                </StandardButton>
              </div>
            </div>
          ) : cartItems.length === 0 ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <ShoppingCartIcon className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">Your Cart is Empty</h3>
                <p className="text-gray-400 mb-6">Add some products to get started</p>
                <StandardButton variant="primary" onClick={onClose}>
                  Continue Shopping
                </StandardButton>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Cart Items */}
              <div className="lg:col-span-2 space-y-4">
                {/* Free Shipping Banner */}
                {subtotal > 0 && subtotal < 100 && (
                  <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 flex items-center gap-3">
                    <Truck className="w-5 h-5 text-blue-400" />
                    <div className="flex-1">
                      <div className="text-sm text-blue-400 font-semibold">
                        Add ${(100 - subtotal).toFixed(2)} more for FREE shipping!
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5">
                        Free shipping on orders over $100
                      </div>
                    </div>
                  </div>
                )}

                {/* Items by Vendor */}
                {Object.entries(itemsByVendor).map(([vendorId, { vendorName, items }]) => (
                  <div key={vendorId} className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-4 pb-3 border-b border-[#2A2A2A]">
                      <Store className="w-5 h-5 text-[#ea580c]" />
                      <h3 className="text-white font-semibold">{vendorName}</h3>
                    </div>

                    <div className="space-y-3">
                      {items.map(item => (
                        <div
                          key={item.id}
                          className="flex gap-4 p-3 bg-[#1A1A1A] rounded-lg border border-[#2A2A2A] hover:border-[#ea580c]/30 transition-colors"
                        >
                          {/* Image */}
                          <div className="w-20 h-20 bg-[#0A0A0A] rounded-lg overflow-hidden flex-shrink-0">
                            {item.productImage ? (
                              <img src={item.productImage} alt={item.productName} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Package className="w-8 h-8 text-gray-600" />
                              </div>
                            )}
                          </div>

                          {/* Details */}
                          <div className="flex-1 min-w-0">
                            <h4 className="text-white font-semibold mb-1 truncate">{item.productName}</h4>
                            <div className="text-lg font-bold text-[#ea580c] mb-2">
                              ${item.price.toFixed(2)}
                            </div>

                            {/* Quantity Controls */}
                            <div className="flex items-center gap-3">
                              <div className="flex items-center gap-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg p-1">
                                <button
                                  onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                  disabled={updating === item.id || item.quantity <= 1}
                                  className="p-1.5 hover:bg-[#1A1A1A] rounded text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                  <Minus className="w-3 h-3" />
                                </button>
                                <span className="text-white font-semibold w-8 text-center text-sm">
                                  {item.quantity}
                                </span>
                                <button
                                  onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                  disabled={updating === item.id || (item.maxQuantity && item.quantity >= item.maxQuantity)}
                                  className="p-1.5 hover:bg-[#1A1A1A] rounded text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                  <Plus className="w-3 h-3" />
                                </button>
                              </div>

                              <button
                                onClick={() => removeItem(item.id)}
                                disabled={updating === item.id}
                                className="p-2 hover:bg-red-500/20 rounded-lg text-gray-400 hover:text-red-400 transition-colors disabled:opacity-50"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>

                          {/* Item Total */}
                          <div className="text-right">
                            <div className="text-sm text-gray-400 mb-1">Total</div>
                            <div className="text-xl font-bold text-white">
                              ${(item.price * item.quantity).toFixed(2)}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}

                {/* Clear Cart */}
                <button
                  onClick={clearCart}
                  className="text-sm text-red-400 hover:text-red-300 transition-colors flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Clear entire cart
                </button>
              </div>

              {/* Order Summary */}
              <div className="lg:col-span-1">
                <div className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl p-6 sticky top-24">
                  <h3 className="text-xl font-bold text-white mb-4">Order Summary</h3>

                  <div className="space-y-3 mb-4 pb-4 border-b border-[#2A2A2A]">
                    <div className="flex justify-between text-gray-300">
                      <span>Subtotal</span>
                      <span className="font-semibold">${subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-gray-300">
                      <span>Tax (8%)</span>
                      <span className="font-semibold">${tax.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-gray-300">
                      <span>Shipping</span>
                      {shipping === 0 ? (
                        <span className="font-semibold text-green-400">FREE</span>
                      ) : (
                        <span className="font-semibold">${shipping.toFixed(2)}</span>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-between text-white mb-6">
                    <span className="text-lg font-bold">Total</span>
                    <span className="text-2xl font-bold text-[#ea580c]">${total.toFixed(2)}</span>
                  </div>

                  <StandardButton
                    variant="primary"
                    onClick={() => setShowCheckout(true)}
                    icon={<ArrowRight className="w-5 h-5" />}
                    className="w-full mb-3"
                  >
                    Proceed to Checkout
                  </StandardButton>

                  <button
                    onClick={onClose}
                    className="w-full px-4 py-3 bg-[#1A1A1A] hover:bg-[#2A2A2A] border border-[#2A2A2A] text-white rounded-lg font-semibold transition-colors"
                  >
                    Continue Shopping
                  </button>

                  {/* Trust Badges */}
                  <div className="mt-6 pt-6 border-t border-[#2A2A2A] space-y-3">
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                      <Lock className="w-4 h-4 text-green-400" />
                      <span>Secure checkout</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                      <Truck className="w-4 h-4 text-blue-400" />
                      <span>Fast delivery</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                      <CreditCard className="w-4 h-4 text-purple-400" />
                      <span>Multiple payment options</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}