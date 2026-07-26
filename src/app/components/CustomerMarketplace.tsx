// Amazon-Style Customer Marketplace
// Modern eCommerce experience inspired by Amazon's design
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShoppingBag, 
  ShoppingCart, 
  Search, 
  Heart, 
  Star, 
  Eye, 
  Package,
  TrendingUp,
  Filter,
  Grid,
  List,
  X,
  Plus,
  Minus,
  ArrowRight,
  Zap,
  Sparkles,
  Crown,
  Flame,
  Gift,
  BadgeCheck
} from 'lucide-react';
import { StandardButton } from './ui/button/StandardButton';
import ProductDetailModal from './ProductDetailModal';
import ShoppingCartModal from './ShoppingCart';
import MegaMenu from './MegaMenu';
import AIRecommendations from './AIRecommendations';
import PersistentCartWishlistWidget from './PersistentCartWishlistWidget';
import VendorStorefront from './VendorStorefront';
import type { Product } from '../types/ecommerce';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import * as hybridCart from '../utils/hybridCartApi';

interface CartItem {
  productId: string;
  quantity: number;
  price: number;
  productName?: string;
  vendorName?: string;
}

export default function CustomerMarketplace() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>(['all']);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'featured' | 'rating' | 'price-low' | 'price-high' | 'newest'>('featured');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedVendorId, setSelectedVendorId] = useState<string | null>(null);
  const [showCart, setShowCart] = useState(false);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [showCheckout, setShowCheckout] = useState(false);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [hoveredProduct, setHoveredProduct] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [cartItemCount, setCartItemCount] = useState(0);

  const loadMarketplaceData = async () => {
    setLoading(true);
    
    try {
      const productsResponse = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6/products?isActive=true`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (productsResponse.ok) {
        try {
          const productsText = await productsResponse.text();
          
          let productsData;
          
          try {
            productsData = JSON.parse(productsText);
          } catch (e) {
            // Failed to parse, use demo data
            loadDemoData();
            setLoading(false);
            return;
          }

          const productList = productsData.products || [];
          setProducts(productList);
          
          // Extract unique categories
          const uniqueCategories = ['all', ...new Set(productList.map((p: Product) => p.category).filter(Boolean))];
          setCategories(uniqueCategories);
        } catch (e) {
          // Error processing response, use demo data
          loadDemoData();
        }
      } else {
        // API not available, use demo data
        loadDemoData();
      }
    } catch (error) {
      // Fetch failed (likely API not configured yet), use demo data silently
      loadDemoData();
    } finally {
      setLoading(false);
    }
  };

  const loadDemoData = () => {
    console.log('Loading demo data...');
    const demoProducts = [
      {
        id: 'demo_product_001',
        vendorId: 'demo_vendor_001',
        vendorName: 'Demo Hardware Supply',
        name: 'Professional 20V Cordless Drill Kit',
        description: 'Heavy-duty cordless drill with 2 batteries, charger, and carrying case.',
        category: 'Power Tools',
        price: 149.99,
        inventoryQuantity: 45,
        trackInventory: true,
        images: ['https://images.unsplash.com/photo-1504148455328-c376907d081c?w=600'],
        primaryImage: 'https://images.unsplash.com/photo-1504148455328-c376907d081c?w=600',
        isActive: true,
        isFeatured: true,
        slug: 'professional-20v-cordless-drill-kit',
      },
      {
        id: 'demo_product_002',
        vendorId: 'demo_vendor_001',
        vendorName: 'Demo Hardware Supply',
        name: '10\" Professional Circular Saw',
        description: 'Powerful 15-amp circular saw with laser guide for precise cuts.',
        category: 'Power Tools',
        price: 109.99,
        inventoryQuantity: 32,
        trackInventory: true,
        images: ['https://images.unsplash.com/photo-1572981779307-38b8cabb2407?w=600'],
        primaryImage: 'https://images.unsplash.com/photo-1572981779307-38b8cabb2407?w=600',
        isActive: true,
        isFeatured: true,
        slug: '10-inch-professional-circular-saw',
      },
      {
        id: 'demo_product_003',
        vendorId: 'demo_vendor_001',
        vendorName: 'Demo Hardware Supply',
        name: 'OSHA-Approved Safety Hard Hat',
        description: 'Type 1 Class E hard hat meeting ANSI Z89.1 standards.',
        category: 'Safety Equipment',
        price: 29.99,
        inventoryQuantity: 150,
        trackInventory: true,
        images: ['https://images.unsplash.com/photo-1583225214464-9296029427aa?w=600'],
        primaryImage: 'https://images.unsplash.com/photo-1583225214464-9296029427aa?w=600',
        isActive: true,
        isFeatured: false,
        slug: 'osha-approved-safety-hard-hat',
      },
      {
        id: 'demo_product_004',
        vendorId: 'demo_vendor_001',
        vendorName: 'Demo Hardware Supply',
        name: 'Heavy-Duty Work Gloves (12-Pack)',
        description: 'Durable leather palm work glgloves with reinforced fingertips.',
        category: 'Safety Equipment',
        price: 39.99,
        inventoryQuantity: 88,
        trackInventory: true,
        images: ['https://images.unsplash.com/photo-1581992652564-02d275cf5824?w=600'],
        primaryImage: 'https://images.unsplash.com/photo-1581992652564-02d275cf5824?w=600',
        isActive: true,
        isFeatured: false,
        slug: 'heavy-duty-work-gloves-12-pack',
      },
      {
        id: 'demo_product_005',
        vendorId: 'demo_vendor_001',
        vendorName: 'Demo Hardware Supply',
        name: '25ft Professional Tape Measure',
        description: 'Heavy-duty tape measure with magnetic tip and belt clip.',
        category: 'Hand Tools',
        price: 19.99,
        inventoryQuantity: 200,
        trackInventory: true,
        images: ['https://images.unsplash.com/photo-1598987845401-46dd82ea2912?w=600'],
        primaryImage: 'https://images.unsplash.com/photo-1598987845401-46dd82ea2912?w=600',
        isActive: true,
        isFeatured: false,
        slug: '25ft-professional-tape-measure',
      },
    ];
    
    setProducts(demoProducts);
    
    // Extract unique categories from demo products
    const uniqueCategories = ['all', ...new Set(demoProducts.map(p => p.category).filter(Boolean))];
    setCategories(uniqueCategories);
    
    console.log(`✅ Loaded ${demoProducts.length} demo products with categories:`, uniqueCategories);
  };

  const loadCartCount = async () => {
    try {
      const result = await hybridCart.getCart();
      if (result.success && result.cart && result.cart.items) {
        const count = result.cart.items.reduce((sum: number, item: any) => sum + item.quantity, 0);
        setCartItemCount(count);
      } else {
        setCartItemCount(0);
      }
    } catch (error) {
      // Silently fall back to local cart count
      setCartItemCount(hybridCart.getCartItemCount());
    }
  };

  useEffect(() => {
    loadMarketplaceData();
    loadCartCount();

    const handleCartUpdate = () => {
      loadCartCount();
    };

    window.addEventListener('cart-updated', handleCartUpdate);
    return () => window.removeEventListener('cart-updated', handleCartUpdate);
  }, []);

  const filteredProducts = products
    .filter(product => {
      const matchesSearch = searchQuery === '' || 
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;
      
      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'price-low':
          return a.price - b.price;
        case 'price-high':
          return b.price - a.price;
        case 'rating':
          return (b.rating || 0) - (a.rating || 0);
        case 'newest':
          return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
        case 'featured':
        default:
          return (b.isFeatured ? 1 : 0) - (a.isFeatured ? 1 : 0);
      }
    });

  const featuredProducts = products.filter(p => p.isFeatured).slice(0, 8);

  // Quick add to cart handler
  const handleQuickAddToCart = async (product: Product) => {
    try {
      const result = await hybridCart.addToCart(product.id, 1, product);
      if (result.success) {
        console.log(`✅ Added ${product.name} to cart (${result.source})`);
        // Cart count will be updated via the 'cart-updated' event
      }
    } catch (error) {
      console.error('Error adding to cart:', error);
    }
  };

  // Show Vendor Storefront if vendor is selected
  if (selectedVendorId) {
    return (
      <VendorStorefront
        vendorId={selectedVendorId}
        onBack={() => setSelectedVendorId(null)}
      />
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950/20 to-slate-950 flex items-center justify-center relative overflow-hidden">
        {/* Animated background */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl -top-48 -left-48 animate-pulse"></div>
          <div className="absolute w-96 h-96 bg-purple-500/20 rounded-full blur-3xl -bottom-48 -right-48 animate-pulse delay-1000"></div>
        </div>
        
        <div className="text-center relative z-10">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <div className="relative">
              <div className="w-20 h-20 border-4 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin mx-auto mb-6"></div>
              <div className="absolute inset-0 w-20 h-20 border-4 border-purple-500/20 border-t-purple-500 rounded-full animate-spin mx-auto mb-6" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
            </div>
            <p className="text-xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">Loading Marketplace</p>
            <p className="text-slate-400 mt-2">Preparing your shopping experience...</p>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] relative overflow-hidden">
      {/* Animated Background Effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <motion.div 
          className="absolute w-[500px] h-[500px] bg-orange-600/10 rounded-full blur-3xl"
          animate={{
            x: hoveredProduct ? 0 : -250,
            y: hoveredProduct ? 0 : -250,
          }}
          transition={{ type: "spring", stiffness: 50 }}
          style={{ left: hoveredProduct ? '50%' : '-250px', top: hoveredProduct ? '50%' : '-250px' }}
        />
        <motion.div 
          className="absolute w-[500px] h-[500px] bg-amber-600/10 rounded-full blur-3xl"
          animate={{
            x: hoveredProduct ? 0 : -250,
            y: hoveredProduct ? 0 : -250,
          }}
          transition={{ type: "spring", stiffness: 50 }}
          style={{ right: hoveredProduct ? '50%' : '-250px', bottom: hoveredProduct ? '50%' : '-250px' }}
        />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS1vcGFjaXR5PSIwLjAzIiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-30"></div>
      </div>

      {/* Futuristic Navigation Header */}
      <motion.header 
        className="sticky top-0 z-50 backdrop-blur-xl bg-[#0A0A0A]/90 border-b border-[#ea580c]/20"
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ type: "spring", stiffness: 100 }}
      >
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center gap-6">
            {/* Logo */}
            <motion.div 
              className="flex items-center gap-3 cursor-pointer"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <div className="relative">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#ea580c] to-orange-700 flex items-center justify-center shadow-lg shadow-[#ea580c]/50">
                  <ShoppingBag className="w-6 h-6 text-white" />
                </div>
                <div className="absolute -inset-0.5 bg-gradient-to-br from-[#ea580c] to-orange-700 rounded-2xl blur opacity-50 animate-pulse"></div>
              </div>
              <div>
                <h1 className="text-xl font-black bg-gradient-to-r from-[#ea580c] to-orange-400 bg-clip-text text-transparent">
                  NEXUS MARKET
                </h1>
                <p className="text-xs text-slate-400 font-medium">{products.length} Products</p>
              </div>
            </motion.div>

            {/* Advanced Search with Voice Search */}
            <div className="flex-1 max-w-2xl">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-slate-900/50 backdrop-blur-xl border border-[#ea580c]/20 rounded-xl text-white placeholder:text-slate-400 focus:outline-none focus:border-[#ea580c]/50 transition-all"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3">
              <motion.button
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowCart(true)}
                className="relative px-5 py-3 bg-gradient-to-r from-[#ea580c] to-orange-700 rounded-xl text-white font-bold transition-all flex items-center gap-2 shadow-lg shadow-[#ea580c]/50"
              >
                <ShoppingCart className="w-5 h-5" />
                <span className="hidden lg:inline">Cart</span>
                {cartItemCount > 0 && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-gradient-to-br from-orange-500 to-red-600 rounded-full flex items-center justify-center text-xs font-black shadow-lg"
                  >
                    {cartItemCount}
                  </motion.span>
                )}
              </motion.button>
            </div>
          </div>

          {/* Mega Menu */}
          <div className="mt-4">
            <MegaMenu
              products={products}
              onCategorySelect={(category) => setSelectedCategory(category)}
              onProductClick={(product) => setSelectedProduct(product)}
            />
          </div>
        </div>
      </motion.header>

      {/* Main Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 py-12">
        {/* Hero Section with 3D Effect */}
        <motion.div
          className="mb-16 relative"
        >
          <div className="relative rounded-3xl overflow-hidden">
            {/* Holographic Background */}
            <div className="absolute inset-0 bg-gradient-to-r from-[#ea580c]/20 via-orange-600/20 to-amber-600/20 backdrop-blur-3xl"></div>
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iZG90cyIgd2lkdGg9IjIwIiBoZWlnaHQ9IjIwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48Y2lyY2xlIGN4PSIyIiBjeT0iMiIgcj0iMSIgZmlsbD0id2hpdGUiIGZpbGwtb3BhY2l0eT0iMC4xIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2RvdHMpIi8+PC9zdmc+')] opacity-30"></div>
            
            <div className="relative p-12 lg:p-16">
              <div className="flex flex-col lg:flex-row items-center justify-between gap-8">
                <div className="flex-1 space-y-6">
                  <motion.div
                    initial={{ opacity: 0, x: -50 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 }}
                  >
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#ea580c]/20 to-orange-600/20 backdrop-blur-xl border border-[#ea580c]/30 rounded-full mb-4">
                      <Sparkles className="w-4 h-4 text-[#ea580c] animate-pulse" />
                      <span className="text-sm font-bold text-[#ea580c]">Next-Gen Shopping</span>
                      <Crown className="w-4 h-4 text-orange-400" />
                    </div>
                  </motion.div>

                  <motion.h2
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="text-5xl lg:text-6xl font-black leading-tight"
                  >
                    <span className="bg-gradient-to-r from-white via-orange-200 to-amber-200 bg-clip-text text-transparent">
                      Experience the Future
                    </span>
                    <br />
                    <span className="bg-gradient-to-r from-[#ea580c] via-orange-500 to-amber-500 bg-clip-text text-transparent">
                      of Shopping
                    </span>
                  </motion.h2>

                  <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="text-xl text-slate-300 max-w-2xl leading-relaxed"
                  >
                    Discover curated products from verified vendors. Lightning-fast delivery, 
                    AI-powered recommendations, and immersive 3D shopping experience.
                  </motion.p>

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="flex flex-wrap gap-4"
                  >
                    <motion.button
                      whileHover={{ scale: 1.05, y: -2 }}
                      whileTap={{ scale: 0.95 }}
                      className="px-8 py-4 bg-gradient-to-r from-[#ea580c] to-orange-700 rounded-xl text-white font-bold flex items-center gap-3 shadow-2xl shadow-[#ea580c]/50 hover:shadow-[#ea580c]/70 transition-shadow"
                    >
                      <Zap className="w-5 h-5" />
                      Explore Products
                      <ArrowRight className="w-5 h-5" />
                    </motion.button>
                  </motion.div>

                  {/* Stats */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                    className="flex gap-8 pt-8"
                  >
                    <div>
                      <div className="text-3xl font-black bg-gradient-to-r from-[#ea580c] to-orange-400 bg-clip-text text-transparent">
                        {products.length}+
                      </div>
                      <div className="text-sm text-slate-400 font-medium">Products</div>
                    </div>
                    <div>
                      <div className="text-3xl font-black bg-gradient-to-r from-orange-500 to-amber-500 bg-clip-text text-transparent">
                        4.9
                      </div>
                      <div className="text-sm text-slate-400 font-medium">Avg Rating</div>
                    </div>
                  </motion.div>
                </div>

                {/* 3D Floating Element */}
                <motion.div
                  className="hidden lg:block"
                  animate={{
                    y: [0, -20, 0],
                    rotate: [0, 5, 0],
                  }}
                  transition={{
                    duration: 4,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                >
                  <div className="relative w-64 h-64">
                    <div className="absolute inset-0 bg-gradient-to-br from-[#ea580c]/30 to-orange-600/30 rounded-3xl blur-2xl"></div>
                    <div className="relative w-full h-full bg-gradient-to-br from-[#ea580c]/10 to-orange-600/10 backdrop-blur-xl border border-[#ea580c]/20 rounded-3xl flex items-center justify-center">
                      <Gift className="w-32 h-32 text-[#ea580c]/50" />
                    </div>
                  </div>
                </motion.div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Featured Products */}
        {featuredProducts.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mb-16"
          >
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="w-1 h-8 bg-gradient-to-b from-[#ea580c] to-orange-700 rounded-full"></div>
                <div>
                  <h2 className="text-3xl font-black text-white">Featured Collection</h2>
                  <p className="text-slate-400">Handpicked premium products</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-[#ea580c]">
                <Flame className="w-5 h-5" />
                <span className="font-bold">Trending Now</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {featuredProducts.slice(0, 4).map((product, index) => (
                <FuturisticProductCard
                  key={product.id}
                  product={product}
                  onView={() => setSelectedProduct(product)}
                  onVendorClick={() => setSelectedVendorId(product.vendorId)}
                  isFavorite={favorites.has(product.id)}
                  onFavorite={() => {
                    const newFavorites = new Set(favorites);
                    if (newFavorites.has(product.id)) {
                      newFavorites.delete(product.id);
                    } else {
                      newFavorites.add(product.id);
                    }
                    setFavorites(newFavorites);
                  }}
                  index={index}
                  onQuickAdd={handleQuickAddToCart}
                />
              ))}
            </div>
          </motion.div>
        )}

        {/* Filters and Products Grid */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          {/* Filter Bar */}
          <div className="mb-8 bg-slate-900/30 backdrop-blur-xl border border-[#ea580c]/10 rounded-2xl p-6">
            <div className="flex flex-wrap gap-4 items-center">
              {/* Category Pills */}
              <div className="flex-1 flex flex-wrap gap-2">
                {categories.map(category => (
                  <motion.button
                    key={category}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setSelectedCategory(category)}
                    className={`px-4 py-2 rounded-xl font-semibold text-sm transition-all ${
                      selectedCategory === category
                        ? 'bg-gradient-to-r from-[#ea580c] to-orange-700 text-white shadow-lg shadow-[#ea580c]/30'
                        : 'bg-slate-800/50 text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    {category === 'all' ? 'All' : category}
                  </motion.button>
                ))}
              </div>

              {/* Sort and View Controls */}
              <div className="flex items-center gap-3">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="px-4 py-2 bg-slate-800/50 backdrop-blur-xl border border-[#ea580c]/20 rounded-xl text-white text-sm font-medium focus:outline-none focus:border-[#ea580c]/50 transition-all"
                >
                  <option value="featured">Featured</option>
                  <option value="rating">Rating</option>
                  <option value="price-low">Price: Low to High</option>
                  <option value="price-high">Price: High to Low</option>
                  <option value="newest">Newest</option>
                </select>

                <div className="px-4 py-2 bg-slate-800/30 backdrop-blur-xl border border-[#ea580c]/10 rounded-xl">
                  <span className="text-[#ea580c] font-bold">{filteredProducts.length}</span>
                  <span className="text-slate-400 text-sm ml-1">products</span>
                </div>
              </div>
            </div>
          </div>

          {/* Products Grid */}
          {filteredProducts.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-24"
            >
              <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-slate-800 to-slate-900 rounded-3xl flex items-center justify-center">
                <Package className="w-12 h-12 text-slate-600" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">No Products Found</h3>
              <p className="text-slate-400 mb-6">Try adjusting your filters or search query</p>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('all');
                }}
                className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-purple-600 rounded-xl text-white font-bold"
              >
                Clear Filters
              </motion.button>
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredProducts.map((product, index) => (
                <FuturisticProductCard
                  key={product.id}
                  product={product}
                  onView={() => setSelectedProduct(product)}
                  onVendorClick={() => {/* Navigate to vendor view - implement later */}}
                  isFavorite={favorites.has(product.id)}
                  onFavorite={() => {
                    const newFavorites = new Set(favorites);
                    if (newFavorites.has(product.id)) {
                      newFavorites.delete(product.id);
                    } else {
                      newFavorites.add(product.id);
                    }
                    setFavorites(newFavorites);
                  }}
                  index={index}
                  onQuickAdd={handleQuickAddToCart}
                />
              ))}
            </div>
          )}
        </motion.div>

        {/* AI Recommendations */}
        <div className="mb-16">
          <AIRecommendations
            products={products}
            currentProduct={selectedProduct || undefined}
            onProductClick={(product) => setSelectedProduct(product)}
            onAddToCart={(product) => {
              // Quick add to cart functionality
              setSelectedProduct(product);
            }}
          />
        </div>
      </div>

      {/* Persistent Cart/Wishlist Widget */}
      <PersistentCartWishlistWidget
        onOpenFullCart={() => setShowCart(true)}
        onOpenFullWishlist={() => {
          // Could open a wishlist modal/page
          console.log('Open full wishlist');
        }}
        onProductClick={(productId) => {
          const product = products.find(p => p.id === productId);
          if (product) setSelectedProduct(product);
        }}
      />

      {/* Modals */}
      <AnimatePresence>
        {selectedProduct && (
          <ProductDetailModal
            key="product-detail-modal"
            product={selectedProduct}
            vendor={{
              vendorKey: selectedProduct.vendorId,
              companyName: selectedProduct.vendorName,
            }}
            onClose={() => setSelectedProduct(null)}
            isFavorite={favorites.has(selectedProduct.id)}
            onFavorite={() => {
              const newFavorites = new Set(favorites);
              if (newFavorites.has(selectedProduct.id)) {
                newFavorites.delete(selectedProduct.id);
              } else {
                newFavorites.add(selectedProduct.id);
              }
              setFavorites(newFavorites);
            }}
          />
        )}

        {showCart && (
          <ShoppingCartModal key="shopping-cart-modal" onClose={() => setShowCart(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}

// Futuristic Product Card Component
function FuturisticProductCard({ 
  product, 
  onView, 
  onVendorClick,
  isFavorite,
  onFavorite,
  index,
  onQuickAdd
}: { 
  product: Product;
  onView: () => void;
  onVendorClick: () => void;
  isFavorite: boolean;
  onFavorite: () => void;
  index: number;
  onQuickAdd: (product: Product) => void;
}) {
  const [isHovered, setIsHovered] = useState(false);
  
  const discount = product.compareAtPrice && product.compareAtPrice > product.price
    ? Math.round(((product.compareAtPrice - product.price) / product.compareAtPrice) * 100)
    : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.4 }}
      whileHover={{ y: -8, scale: 1.02 }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      className="group relative cursor-pointer"
      onClick={onView}
    >
      {/* Glow Effect */}
      <motion.div
        className="absolute -inset-0.5 bg-gradient-to-r from-[#ea580c] to-orange-600 rounded-3xl opacity-0 group-hover:opacity-20 blur-xl transition-opacity duration-500"
        animate={isHovered ? { scale: [1, 1.05, 1] } : {}}
        transition={{ duration: 2, repeat: Infinity }}
      />

      <div className="relative bg-slate-900/50 backdrop-blur-xl border border-[#ea580c]/10 group-hover:border-[#ea580c]/30 rounded-3xl overflow-hidden transition-all duration-300">
        {/* Image Container */}
        <div className="relative aspect-square overflow-hidden bg-gradient-to-br from-slate-800 to-slate-900">
          {product.primaryImage ? (
            <motion.img
              src={product.primaryImage}
              alt={product.name}
              className="w-full h-full object-cover"
              animate={isHovered ? { scale: 1.1 } : { scale: 1 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Package className="w-20 h-20 text-slate-700" />
            </div>
          )}

          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent opacity-60"></div>

          {/* Badges */}
          <div className="absolute top-3 left-3 flex flex-col gap-2">
            {product.isFeatured && (
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 200 }}
                className="px-3 py-1.5 bg-gradient-to-r from-[#ea580c]/90 to-orange-600/90 backdrop-blur-xl rounded-full flex items-center gap-1.5 shadow-lg"
              >
                <Crown className="w-3.5 h-3.5 text-white" />
                <span className="text-xs font-black text-white">FEATURED</span>
              </motion.div>
            )}
            {discount > 0 && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="px-3 py-1.5 bg-gradient-to-r from-pink-500/90 to-red-500/90 backdrop-blur-xl rounded-full font-black text-white text-xs shadow-lg"
              >
                -{discount}% OFF
              </motion.div>
            )}
          </div>

          {/* Favorite Button */}
          <motion.button
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: isHovered ? 1 : 0, scale: isHovered ? 1 : 0 }}
            whileTap={{ scale: 0.9 }}
            onClick={(e) => {
              e.stopPropagation();
              onFavorite();
            }}
            className={`absolute top-3 right-3 p-2.5 rounded-full backdrop-blur-xl transition-all shadow-lg ${
              isFavorite 
                ? 'bg-gradient-to-br from-pink-500 to-red-500 text-white' 
                : 'bg-slate-900/70 text-white hover:bg-slate-900/90'
            }`}
          >
            <Heart className={`w-4 h-4 ${isFavorite ? 'fill-current' : ''}`} />
          </motion.button>

          {/* Quick Action Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: isHovered ? 1 : 0, y: isHovered ? 0 : 20 }}
            className="absolute bottom-3 left-3 right-3 flex gap-2"
          >
            <button 
              onClick={(e) => {
                e.stopPropagation();
                onQuickAdd(product);
              }}
              className="flex-1 py-3 bg-gradient-to-r from-[#ea580c] to-orange-700 backdrop-blur-xl rounded-xl text-white font-bold flex items-center justify-center gap-2 shadow-lg hover:shadow-[#ea580c]/50 transition-shadow"
            >
              <ShoppingCart className="w-4 h-4" />
              Add
            </button>
            <button className="px-4 py-3 bg-slate-900/90 backdrop-blur-xl rounded-xl text-white font-bold flex items-center justify-center gap-2 shadow-lg hover:bg-slate-800 transition-colors">
              <Eye className="w-4 h-4" />
            </button>
          </motion.div>
        </div>

        {/* Content */}
        <div className="p-5 space-y-3">
          {/* Vendor */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onVendorClick();
            }}
            className="flex items-center gap-2 text-xs text-[#ea580c] hover:text-orange-400 transition-colors font-semibold"
          >
            <BadgeCheck className="w-3.5 h-3.5" />
            {product.vendorName}
          </button>

          {/* Product Name */}
          <h3 className="font-bold text-white line-clamp-2 leading-snug group-hover:text-[#ea580c] transition-colors">
            {product.name}
          </h3>

          {/* Price */}
          <div className="flex items-center justify-between">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black bg-gradient-to-r from-[#ea580c] to-orange-400 bg-clip-text text-transparent">
                ${product.price.toFixed(2)}
              </span>
              {product.compareAtPrice && (
                <span className="text-sm text-slate-500 line-through">
                  ${product.compareAtPrice.toFixed(2)}
                </span>
              )}
            </div>

            {/* Stock Status */}
            {product.trackInventory && (
              <div className="flex items-center gap-1.5">
                <div className={`w-2 h-2 rounded-full ${
                  (product.inventoryQuantity || 0) > 10 ? 'bg-green-500' : 'bg-yellow-500'
                } animate-pulse`}></div>
                <span className="text-xs text-slate-400 font-medium">
                  {product.inventoryQuantity} left
                </span>
              </div>
            )}
          </div>

          {/* Rating */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={`w-3.5 h-3.5 ${
                    i < 4 ? 'text-[#ea580c] fill-current' : 'text-slate-700'
                  }`}
                />
              ))}
            </div>
            <span className="text-xs text-slate-400 font-medium">4.8 (127)</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// Futuristic List Item Component
function FuturisticProductListItem({ 
  product, 
  onView, 
  onVendorClick,
  isFavorite,
  onFavorite,
  index
}: { 
  product: Product;
  onView: () => void;
  onVendorClick: () => void;
  isFavorite: boolean;
  onFavorite: () => void;
  index: number;
}) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, x: -50 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.03 }}
      whileHover={{ x: 4 }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      onClick={onView}
      className="group relative cursor-pointer"
    >
      <div className="relative bg-slate-900/30 backdrop-blur-xl border border-cyan-500/10 group-hover:border-cyan-500/30 rounded-2xl p-5 flex gap-6 items-center transition-all">
        {/* Image */}
        <div className="relative w-32 h-32 flex-shrink-0 rounded-xl overflow-hidden bg-gradient-to-br from-slate-800 to-slate-900">
          {product.primaryImage ? (
            <motion.img
              src={product.primaryImage}
              alt={product.name}
              className="w-full h-full object-cover"
              animate={isHovered ? { scale: 1.1 } : { scale: 1 }}
              transition={{ duration: 0.4 }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Package className="w-12 h-12 text-slate-700" />
            </div>
          )}
          
          {product.isFeatured && (
            <div className="absolute top-2 left-2">
              <div className="px-2 py-1 bg-gradient-to-r from-yellow-500/90 to-orange-500/90 backdrop-blur-xl rounded-lg flex items-center gap-1">
                <Crown className="w-3 h-3 text-white" />
              </div>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onVendorClick();
            }}
            className="flex items-center gap-2 text-xs text-cyan-400 hover:text-cyan-300 transition-colors font-semibold mb-2"
          >
            <BadgeCheck className="w-3.5 h-3.5" />
            {product.vendorName}
          </button>

          <h3 className="text-lg font-bold text-white mb-2 group-hover:text-cyan-400 transition-colors line-clamp-1">
            {product.name}
          </h3>

          <p className="text-sm text-slate-400 line-clamp-2 mb-3">
            {product.description}
          </p>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={`w-3.5 h-3.5 ${
                    i < 4 ? 'text-yellow-500 fill-current' : 'text-slate-700'
                  }`}
                />
              ))}
            </div>
            <span className="text-xs text-slate-400">4.8 (127 reviews)</span>
            {product.trackInventory && (
              <>
                <div className="w-1 h-1 rounded-full bg-slate-600"></div>
                <span className="text-xs text-slate-400">{product.inventoryQuantity} in stock</span>
              </>
            )}
          </div>
        </div>

        {/* Price and Actions */}
        <div className="flex flex-col items-end gap-3">
          <div className="text-right">
            <div className="text-2xl font-black bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
              ${product.price.toFixed(2)}
            </div>
            {product.compareAtPrice && (
              <div className="text-sm text-slate-500 line-through">
                ${product.compareAtPrice.toFixed(2)}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={(e) => {
                e.stopPropagation();
                onFavorite();
              }}
              className={`p-2.5 rounded-lg backdrop-blur-xl transition-all ${
                isFavorite 
                  ? 'bg-gradient-to-br from-pink-500 to-red-500 text-white' 
                  : 'bg-slate-800/50 text-slate-400 hover:text-white'
              }`}
            >
              <Heart className={`w-4 h-4 ${isFavorite ? 'fill-current' : ''}`} />
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-4 py-2.5 bg-gradient-to-r from-cyan-500 to-purple-600 rounded-lg text-white font-bold flex items-center gap-2 shadow-lg hover:shadow-purple-500/50 transition-shadow"
            >
              <Eye className="w-4 h-4" />
              View
            </motion.button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}