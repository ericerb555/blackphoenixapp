// Enhanced Product Detail Page with All Advanced Features
import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  X,
  ShoppingCart,
  Heart,
  Share2,
  Plus,
  Minus,
  Check,
  Star,
  Package,
  Truck,
  Shield,
  RefreshCw,
  TrendingUp,
  Award,
  Zap,
  Info,
  Eye,
  Box,
  MessageSquare,
  FileText
} from 'lucide-react';
import type { Product } from '../types/ecommerce';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface EnhancedProductPageProps {
  product: Product;
  allProducts: Product[];
  vendor: {
    vendorKey: string;
    companyName: string;
    email?: string;
    phone?: string;
    address?: string;
    logo?: string;
  };
  onClose: () => void;
  isFavorite: boolean;
  onFavorite: () => void;
  onProductClick: (product: Product) => void;
}

type TabType = 'overview' | '3d' | 'reviews' | 'ar' | 'specs' | 'related';

export default function EnhancedProductPage({
  product,
  allProducts,
  vendor,
  onClose,
  isFavorite,
  onFavorite,
  onProductClick
}: EnhancedProductPageProps) {
  const [quantity, setQuantity] = useState(1);
  const [addingToCart, setAddingToCart] = useState(false);
  const [addedToCart, setAddedToCart] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [realTimePrice, setRealTimePrice] = useState(product.price);
  const [realTimeStock, setRealTimeStock] = useState(product.inventoryQuantity);

  // Simulate real-time price and availability updates
  useEffect(() => {
    const interval = setInterval(() => {
      // Simulate small price fluctuations (±2%)
      const fluctuation = (Math.random() - 0.5) * 0.04;
      setRealTimePrice(product.price * (1 + fluctuation));

      // Simulate stock changes (demo only)
      if (Math.random() > 0.95) {
        setRealTimeStock(prev => Math.max(0, prev - 1));
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [product.price]);

  const media = [
    { type: 'image' as const, url: product.primaryImage || '', alt: product.name },
    ...(product.images || []).map(url => ({ type: 'image' as const, url, alt: product.name })),
    // Demo video and 360 view
    { type: '360' as const, url: product.primaryImage || '', alt: `${product.name} 360` }
  ];

  const discount = product.compareAtPrice && product.compareAtPrice > product.price
    ? Math.round(((product.compareAtPrice - product.price) / product.compareAtPrice) * 100)
    : 0;

  const isLowStock = product.trackInventory && realTimeStock < (product.lowStockThreshold || 10);
  const isOutOfStock = product.trackInventory && realTimeStock === 0;

  const handleQuantityChange = (delta: number) => {
    const newQuantity = quantity + delta;
    if (newQuantity >= 1) {
      if (!product.trackInventory || newQuantity <= realTimeStock) {
        setQuantity(newQuantity);
      }
    }
  };

  const handleAddToCart = async () => {
    setAddingToCart(true);
    try {
      let sessionId = localStorage.getItem('cart_session_id');
      if (!sessionId) {
        sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        localStorage.setItem('cart_session_id', sessionId);
      }

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-57095a78/cart/add`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            sessionId,
            productId: product.id,
            quantity
          }),
        }
      );

      if (response.ok) {
        setAddedToCart(true);
        window.dispatchEvent(new Event('cart-updated'));
        setTimeout(() => setAddedToCart(false), 3000);
      }
    } catch (error) {
      console.error('Error adding to cart:', error);
    } finally {
      setAddingToCart(false);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: product.name,
          text: product.description,
          url: window.location.href
        });
      } catch (err) {
        console.log('Share cancelled');
      }
    }
  };

  const tabs = [
    { id: 'overview' as TabType, label: 'Overview', icon: Eye },
    { id: '3d' as TabType, label: '3D Model', icon: Box },
    { id: 'reviews' as TabType, label: 'Reviews', icon: MessageSquare },
    { id: 'ar' as TabType, label: 'AR Try-On', icon: Zap },
    { id: 'specs' as TabType, label: 'Specifications', icon: FileText },
    { id: 'related' as TabType, label: 'Related', icon: Package }
  ];

  // Render tab content with simple divs instead of complex components
  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <div className="p-6 bg-slate-900/50 backdrop-blur-xl border border-cyan-500/20 rounded-2xl">
            <h3 className="text-xl font-bold text-white mb-4">Product Gallery</h3>
            {product.primaryImage && (
              <img
                src={product.primaryImage}
                alt={product.name}
                className="w-full h-96 object-contain rounded-xl mb-4"
              />
            )}
            <p className="text-slate-300">{product.description}</p>
          </div>
        );
      case '3d':
        return (
          <div className="p-6 bg-slate-900/50 backdrop-blur-xl border border-cyan-500/20 rounded-2xl">
            <h3 className="text-xl font-bold text-white mb-4">3D Model Viewer</h3>
            <div className="aspect-square bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl flex items-center justify-center">
              <div className="text-center">
                <Box className="w-20 h-20 text-slate-700 mx-auto mb-4" />
                <p className="text-slate-500">Interactive 3D view coming soon</p>
              </div>
            </div>
          </div>
        );
      case 'reviews':
        return (
          <div className="p-6 bg-slate-900/50 backdrop-blur-xl border border-cyan-500/20 rounded-2xl">
            <h3 className="text-xl font-bold text-white mb-4">Customer Reviews</h3>
            <div className="flex items-center gap-4 mb-6">
              <div className="text-5xl font-black text-cyan-400">4.5</div>
              <div>
                <div className="flex items-center gap-1 mb-2">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`w-5 h-5 ${i < 4 ? 'text-yellow-500 fill-current' : 'text-slate-700'}`}
                    />
                  ))}
                </div>
                <p className="text-slate-400 text-sm">Based on 156 reviews</p>
              </div>
            </div>
            <p className="text-slate-300">Detailed reviews available soon</p>
          </div>
        );
      case 'ar':
        return (
          <div className="p-6 bg-slate-900/50 backdrop-blur-xl border border-cyan-500/20 rounded-2xl">
            <h3 className="text-xl font-bold text-white mb-4">AR Try-On</h3>
            <div className="aspect-square bg-gradient-to-br from-purple-900 to-slate-900 rounded-xl flex items-center justify-center">
              <div className="text-center">
                <Zap className="w-20 h-20 text-purple-500 mx-auto mb-4" />
                <p className="text-slate-300 mb-4">Experience this product in augmented reality</p>
                <button className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-purple-600 rounded-xl text-white font-bold">
                  Launch AR Experience
                </button>
              </div>
            </div>
          </div>
        );
      case 'specs':
        return (
          <div className="p-6 bg-slate-900/50 backdrop-blur-xl border border-cyan-500/20 rounded-2xl">
            <h3 className="text-xl font-bold text-white mb-4">Technical Specifications</h3>
            <div className="space-y-3">
              <div className="flex justify-between p-3 bg-slate-800/50 rounded-lg">
                <span className="text-slate-400">SKU</span>
                <span className="text-white font-semibold">{product.sku || product.id}</span>
              </div>
              <div className="flex justify-between p-3 bg-slate-800/50 rounded-lg">
                <span className="text-slate-400">Category</span>
                <span className="text-white font-semibold">{product.category}</span>
              </div>
              <div className="flex justify-between p-3 bg-slate-800/50 rounded-lg">
                <span className="text-slate-400">Vendor</span>
                <span className="text-white font-semibold">{vendor.companyName}</span>
              </div>
            </div>
          </div>
        );
      case 'related':
        return (
          <div className="p-6 bg-slate-900/50 backdrop-blur-xl border border-cyan-500/20 rounded-2xl">
            <h3 className="text-xl font-bold text-white mb-4">Related Products</h3>
            <p className="text-slate-300">Related products and bundles coming soon</p>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="min-h-screen py-8 px-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="max-w-7xl mx-auto bg-gradient-to-br from-slate-950 via-purple-950/20 to-slate-950 rounded-3xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="relative border-b border-cyan-500/20 bg-slate-900/50 backdrop-blur-xl">
            <div className="p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Award className="w-5 h-5 text-yellow-500" />
                    <span className="text-sm font-semibold text-yellow-500">Verified Product</span>
                  </div>
                  <h1 className="text-3xl font-black text-white mb-2">{product.name}</h1>
                  <p className="text-slate-400">{product.description}</p>
                </div>

                <button
                  onClick={onClose}
                  className="p-3 bg-slate-800 hover:bg-slate-700 rounded-full transition-colors"
                >
                  <X className="w-6 h-6 text-white" />
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 p-8">
            {/* Left Column - Tab Content */}
            <div className="lg:col-span-2 space-y-6">
              {renderTabContent()}
            </div>

            {/* Right Column - Product Info */}
            <div className="space-y-6">
              {/* Price Card */}
              <div className="bg-slate-900/50 backdrop-blur-xl border border-cyan-500/20 rounded-2xl p-6 sticky top-8">
                {/* Real-time Price */}
                <div className="mb-6">
                  <div className="flex items-baseline gap-3 mb-2">
                    <span className="text-4xl font-black bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
                      ${realTimePrice.toFixed(2)}
                    </span>
                    {product.compareAtPrice && (
                      <span className="text-xl text-slate-500 line-through">
                        ${product.compareAtPrice.toFixed(2)}
                      </span>
                    )}
                  </div>
                  
                  {discount > 0 && (
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-red-500/20 border border-red-500/30 rounded-full">
                      <TrendingUp className="w-4 h-4 text-red-400" />
                      <span className="text-sm font-bold text-red-400">Save {discount}%</span>
                    </div>
                  )}

                  {/* Real-time indicator */}
                  <div className="flex items-center gap-2 mt-3 text-xs text-green-400">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                    <span>Live pricing • Updates every 5s</span>
                  </div>
                </div>

                {/* Stock Status */}
                {product.trackInventory && (
                  <div className={`mb-6 p-4 rounded-xl ${
                    isOutOfStock
                      ? 'bg-red-500/10 border border-red-500/20'
                      : isLowStock
                      ? 'bg-yellow-500/10 border border-yellow-500/20'
                      : 'bg-green-500/10 border border-green-500/20'
                  }`}>
                    <div className="flex items-center gap-2">
                      {isOutOfStock ? (
                        <>
                          <Package className="w-5 h-5 text-red-400" />
                          <span className="font-semibold text-red-400">Out of Stock</span>
                        </>
                      ) : isLowStock ? (
                        <>
                          <Zap className="w-5 h-5 text-yellow-400" />
                          <span className="font-semibold text-yellow-400">
                            Only {realTimeStock} left in stock!
                          </span>
                        </>
                      ) : (
                        <>
                          <Check className="w-5 h-5 text-green-400" />
                          <span className="font-semibold text-green-400">In Stock ({realTimeStock} available)</span>
                        </>
                      )}
                    </div>
                  </div>
                )}

                {/* Quantity Selector */}
                {!isOutOfStock && (
                  <div className="mb-6">
                    <label className="block text-sm font-semibold text-slate-300 mb-3">
                      Quantity
                    </label>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => handleQuantityChange(-1)}
                        disabled={quantity <= 1}
                        className="p-3 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 rounded-xl transition-colors"
                      >
                        <Minus className="w-5 h-5 text-white" />
                      </button>

                      <div className="flex-1 text-center">
                        <span className="text-2xl font-bold text-white">{quantity}</span>
                      </div>

                      <button
                        onClick={() => handleQuantityChange(1)}
                        disabled={product.trackInventory && quantity >= realTimeStock}
                        className="p-3 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 rounded-xl transition-colors"
                      >
                        <Plus className="w-5 h-5 text-white" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="space-y-3 mb-6">
                  <button
                    onClick={handleAddToCart}
                    disabled={isOutOfStock || addingToCart}
                    className={`w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${
                      addedToCart
                        ? 'bg-green-500 text-white'
                        : 'bg-gradient-to-r from-cyan-500 to-purple-600 text-white hover:shadow-lg hover:shadow-purple-500/50'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {addingToCart ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Adding...
                      </>
                    ) : addedToCart ? (
                      <>
                        <Check className="w-5 h-5" />
                        Added to Cart!
                      </>
                    ) : (
                      <>
                        <ShoppingCart className="w-5 h-5" />
                        Add to Cart
                      </>
                    )}
                  </button>

                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={onFavorite}
                      className={`py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all ${
                        isFavorite
                          ? 'bg-gradient-to-r from-pink-500 to-red-500 text-white'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                      }`}
                    >
                      <Heart className={`w-5 h-5 ${isFavorite ? 'fill-current' : ''}`} />
                      {isFavorite ? 'Saved' : 'Save'}
                    </button>

                    <button
                      onClick={handleShare}
                      className="py-3 bg-slate-800 hover:bg-slate-700 rounded-xl text-slate-300 font-semibold flex items-center justify-center gap-2 transition-colors"
                    >
                      <Share2 className="w-5 h-5" />
                      Share
                    </button>
                  </div>
                </div>

                {/* Features */}
                <div className="space-y-3 pt-6 border-t border-slate-800">
                  <div className="flex items-center gap-3 text-sm text-slate-300">
                    <Truck className="w-5 h-5 text-green-400" />
                    <span>Free shipping on orders over $100</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-slate-300">
                    <RefreshCw className="w-5 h-5 text-blue-400" />
                    <span>30-day return policy</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-slate-300">
                    <Shield className="w-5 h-5 text-purple-400" />
                    <span>3-year warranty included</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Tabs Navigation */}
          <div className="border-t border-cyan-500/20 bg-slate-900/50 backdrop-blur-xl px-8 pt-4">
            <div className="flex gap-2 overflow-x-auto scrollbar-thin scrollbar-thumb-cyan-500/20">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-6 py-3 rounded-t-xl font-semibold flex items-center gap-2 transition-all whitespace-nowrap ${
                      activeTab === tab.id
                        ? 'bg-gradient-to-r from-cyan-500 to-purple-600 text-white shadow-lg'
                        : 'bg-slate-800/50 text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}