// Persistent Mini Cart and Wishlist Widget
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ShoppingCart,
  Heart,
  X,
  Plus,
  Minus,
  Trash2,
  ArrowRight,
  Package,
  AlertCircle
} from 'lucide-react';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import type { Product } from '../types/ecommerce';

interface CartItem {
  id: string;
  productId: string;
  productName: string;
  productImage?: string;
  price: number;
  quantity: number;
  vendorName: string;
}

interface PersistentWidgetProps {
  onOpenFullCart: () => void;
  onOpenFullWishlist: () => void;
  onProductClick: (productId: string) => void;
}

export default function PersistentCartWishlistWidget({
  onOpenFullCart,
  onOpenFullWishlist,
  onProductClick
}: PersistentWidgetProps) {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [wishlistItems, setWishlistItems] = useState<Product[]>([]);
  const [showMiniCart, setShowMiniCart] = useState(false);
  const [showMiniWishlist, setShowMiniWishlist] = useState(false);
  const [cartTotal, setCartTotal] = useState(0);
  const [cartCount, setCartCount] = useState(0);

  useEffect(() => {
    loadCart();
    loadWishlist();

    // Listen for updates
    const handleCartUpdate = () => loadCart();
    const handleWishlistUpdate = () => loadWishlist();

    window.addEventListener('cart-updated', handleCartUpdate);
    window.addEventListener('wishlist-updated', handleWishlistUpdate);

    return () => {
      window.removeEventListener('cart-updated', handleCartUpdate);
      window.removeEventListener('wishlist-updated', handleWishlistUpdate);
    };
  }, []);

  useEffect(() => {
    // Calculate totals when cart items change
    const count = cartItems.reduce((sum, item) => sum + item.quantity, 0);
    const total = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    setCartCount(count);
    setCartTotal(total);
  }, [cartItems]);

  const loadCart = async () => {
    try {
      const sessionId = localStorage.getItem('cart_session_id');
      if (!sessionId) {
        setCartItems([]);
        return;
      }

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6/cart/${sessionId}`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        // Silently fall back to empty cart
        setCartItems([]);
        return;
      }

      const responseText = await response.text();
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        // Silently fall back to empty cart
        setCartItems([]);
        return;
      }

      if (data.success && data.cart) {
        setCartItems(data.cart.items || []);
      } else {
        setCartItems([]);
      }
    } catch (error) {
      // Silently handle cart loading - hybrid system uses local storage
    }
  };

  const loadWishlist = () => {
    const saved = localStorage.getItem('wishlist');
    if (saved) {
      setWishlistItems(JSON.parse(saved));
    }
  };

  const removeFromCart = async (itemId: string) => {
    try {
      const sessionId = localStorage.getItem('cart_session_id');
      if (!sessionId) return;

      await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6/cart/remove`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ sessionId, itemId }),
        }
      );

      window.dispatchEvent(new Event('cart-updated'));
    } catch (error) {
      // Silently handle error - hybrid system will manage
    }
  };

  const removeFromWishlist = (productId: string) => {
    const updated = wishlistItems.filter(item => item.id !== productId);
    setWishlistItems(updated);
    localStorage.setItem('wishlist', JSON.stringify(updated));
    window.dispatchEvent(new Event('wishlist-updated'));
  };

  return (
    <>
      {/* Floating Action Buttons */}
      <div className="fixed bottom-8 right-8 z-40 flex flex-col gap-3">
        {/* Wishlist Button */}
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => setShowMiniWishlist(!showMiniWishlist)}
          className="relative w-14 h-14 bg-gradient-to-br from-pink-500 to-red-500 rounded-full shadow-2xl shadow-pink-500/50 flex items-center justify-center group"
        >
          <Heart className="w-6 h-6 text-white" />
          {wishlistItems.length > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute -top-1 -right-1 w-6 h-6 bg-white rounded-full flex items-center justify-center text-xs font-black text-pink-500 shadow-lg"
            >
              {wishlistItems.length}
            </motion.span>
          )}
          
          {/* Tooltip */}
          <div className="absolute right-full mr-3 px-3 py-1.5 bg-slate-900 border border-pink-500/20 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
            <span className="text-sm font-semibold text-white">Wishlist</span>
          </div>
        </motion.button>

        {/* Cart Button */}
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => setShowMiniCart(!showMiniCart)}
          className="relative w-16 h-16 bg-gradient-to-br from-cyan-500 to-purple-600 rounded-full shadow-2xl shadow-purple-500/50 flex items-center justify-center group"
        >
          <ShoppingCart className="w-7 h-7 text-white" />
          {cartCount > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute -top-1 -right-1 w-7 h-7 bg-white rounded-full flex items-center justify-center text-sm font-black text-purple-600 shadow-lg"
            >
              {cartCount}
            </motion.span>
          )}
          
          {/* Tooltip */}
          <div className="absolute right-full mr-3 px-3 py-1.5 bg-slate-900 border border-cyan-500/20 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
            <span className="text-sm font-semibold text-white">Cart • ${cartTotal.toFixed(2)}</span>
          </div>
        </motion.button>
      </div>

      {/* Mini Cart Panel */}
      <AnimatePresence>
        {showMiniCart && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowMiniCart(false)}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
            />

            {/* Panel */}
            <motion.div
              initial={{ x: 400, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 400, opacity: 0 }}
              transition={{ type: "spring", damping: 25 }}
              className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-slate-950 border-l border-cyan-500/20 shadow-2xl z-50 flex flex-col"
            >
              {/* Header */}
              <div className="p-6 border-b border-slate-800">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center">
                      <ShoppingCart className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h2 className="text-xl font-black text-white">Shopping Cart</h2>
                      <p className="text-sm text-slate-400">{cartCount} items</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowMiniCart(false)}
                    className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5 text-slate-400" />
                  </button>
                </div>
              </div>

              {/* Cart Items */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {cartItems.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-20 h-20 mx-auto mb-4 bg-slate-800/50 rounded-2xl flex items-center justify-center">
                      <ShoppingCart className="w-10 h-10 text-slate-600" />
                    </div>
                    <h3 className="text-lg font-bold text-white mb-2">Your cart is empty</h3>
                    <p className="text-sm text-slate-400">Start shopping to add items</p>
                  </div>
                ) : (
                  cartItems.map((item) => (
                    <motion.div
                      key={item.id}
                      layout
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="flex gap-4 bg-slate-900/50 rounded-xl p-4 border border-slate-800 hover:border-cyan-500/20 transition-colors"
                    >
                      {/* Image */}
                      <button
                        onClick={() => {
                          onProductClick(item.productId);
                          setShowMiniCart(false);
                        }}
                        className="w-20 h-20 rounded-lg bg-gradient-to-br from-slate-800 to-slate-900 flex-shrink-0 overflow-hidden"
                      >
                        {item.productImage ? (
                          <img 
                            src={item.productImage} 
                            alt={item.productName}
                            className="w-full h-full object-cover hover:scale-110 transition-transform"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Package className="w-8 h-8 text-slate-600" />
                          </div>
                        )}
                      </button>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <button
                          onClick={() => {
                            onProductClick(item.productId);
                            setShowMiniCart(false);
                          }}
                          className="font-semibold text-white text-sm line-clamp-2 hover:text-cyan-400 transition-colors text-left"
                        >
                          {item.productName}
                        </button>
                        <div className="text-xs text-slate-500 mt-1">{item.vendorName}</div>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-cyan-400 font-bold">
                            ${(item.price * item.quantity).toFixed(2)}
                          </span>
                          <div className="text-xs text-slate-400">
                            ${item.price.toFixed(2)} × {item.quantity}
                          </div>
                        </div>
                      </div>

                      {/* Remove */}
                      <button
                        onClick={() => removeFromCart(item.id)}
                        className="p-2 hover:bg-red-500/10 rounded-lg transition-colors self-start"
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </button>
                    </motion.div>
                  ))
                )}
              </div>

              {/* Footer */}
              {cartItems.length > 0 && (
                <div className="p-6 border-t border-slate-800 space-y-4">
                  {/* Subtotal */}
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 font-medium">Subtotal</span>
                    <span className="text-2xl font-black bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
                      ${cartTotal.toFixed(2)}
                    </span>
                  </div>

                  {/* Shipping Notice */}
                  <div className="flex items-start gap-2 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                    <AlertCircle className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-green-400">
                      Free shipping on orders over $100
                    </p>
                  </div>

                  {/* Buttons */}
                  <div className="space-y-2">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        onOpenFullCart();
                        setShowMiniCart(false);
                      }}
                      className="w-full py-4 bg-gradient-to-r from-cyan-500 to-purple-600 rounded-xl text-white font-bold flex items-center justify-center gap-2 shadow-lg shadow-purple-500/50"
                    >
                      Checkout
                      <ArrowRight className="w-5 h-5" />
                    </motion.button>

                    <button
                      onClick={() => setShowMiniCart(false)}
                      className="w-full py-3 bg-slate-800/50 hover:bg-slate-800 rounded-xl text-slate-300 font-semibold transition-colors"
                    >
                      Continue Shopping
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Mini Wishlist Panel */}
      <AnimatePresence>
        {showMiniWishlist && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowMiniWishlist(false)}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
            />

            {/* Panel */}
            <motion.div
              initial={{ x: 400, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 400, opacity: 0 }}
              transition={{ type: "spring", damping: 25 }}
              className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-slate-950 border-l border-pink-500/20 shadow-2xl z-50 flex flex-col"
            >
              {/* Header */}
              <div className="p-6 border-b border-slate-800">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 to-red-500 flex items-center justify-center">
                      <Heart className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h2 className="text-xl font-black text-white">My Wishlist</h2>
                      <p className="text-sm text-slate-400">{wishlistItems.length} items</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowMiniWishlist(false)}
                    className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5 text-slate-400" />
                  </button>
                </div>
              </div>

              {/* Wishlist Items */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {wishlistItems.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-20 h-20 mx-auto mb-4 bg-slate-800/50 rounded-2xl flex items-center justify-center">
                      <Heart className="w-10 h-10 text-slate-600" />
                    </div>
                    <h3 className="text-lg font-bold text-white mb-2">No favorites yet</h3>
                    <p className="text-sm text-slate-400">Save items you love for later</p>
                  </div>
                ) : (
                  wishlistItems.map((item) => (
                    <motion.div
                      key={item.id}
                      layout
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="flex gap-4 bg-slate-900/50 rounded-xl p-4 border border-slate-800 hover:border-pink-500/20 transition-colors"
                    >
                      {/* Image */}
                      <button
                        onClick={() => {
                          onProductClick(item.id);
                          setShowMiniWishlist(false);
                        }}
                        className="w-20 h-20 rounded-lg bg-gradient-to-br from-slate-800 to-slate-900 flex-shrink-0 overflow-hidden"
                      >
                        {item.primaryImage ? (
                          <img 
                            src={item.primaryImage} 
                            alt={item.name}
                            className="w-full h-full object-cover hover:scale-110 transition-transform"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Package className="w-8 h-8 text-slate-600" />
                          </div>
                        )}
                      </button>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <button
                          onClick={() => {
                            onProductClick(item.id);
                            setShowMiniWishlist(false);
                          }}
                          className="font-semibold text-white text-sm line-clamp-2 hover:text-pink-400 transition-colors text-left"
                        >
                          {item.name}
                        </button>
                        <div className="text-xs text-slate-500 mt-1">{item.vendorName}</div>
                        <div className="text-pink-400 font-bold mt-2">
                          ${item.price.toFixed(2)}
                        </div>
                      </div>

                      {/* Remove */}
                      <button
                        onClick={() => removeFromWishlist(item.id)}
                        className="p-2 hover:bg-red-500/10 rounded-lg transition-colors self-start"
                      >
                        <X className="w-4 h-4 text-red-500" />
                      </button>
                    </motion.div>
                  ))
                )}
              </div>

              {/* Footer */}
              {wishlistItems.length > 0 && (
                <div className="p-6 border-t border-slate-800">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      onOpenFullWishlist();
                      setShowMiniWishlist(false);
                    }}
                    className="w-full py-4 bg-gradient-to-r from-pink-500 to-red-500 rounded-xl text-white font-bold flex items-center justify-center gap-2 shadow-lg shadow-pink-500/50"
                  >
                    View Full Wishlist
                    <ArrowRight className="w-5 h-5" />
                  </motion.button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}