/**
 * Public Store - Premium eCommerce Experience
 * World-class shopping experience with modern design
 */

import { useState, useEffect } from 'react';
import {
  ShoppingCart, Search, Menu, X, User, Heart, Star, Filter,
  ChevronDown, Package, Truck, Shield, CreditCard, ArrowLeft,
  Plus, Minus, Check, Eye, TrendingUp, Zap, Award, ChevronRight,
  Grid, List, SlidersHorizontal, RefreshCw, ShoppingBag, Lock
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { useAuth } from '../contexts/AuthContext';
import { useCompany } from '../contexts/CompanyContext';
import companyLogo from '../../imports/BPB_phoenix_full_color_logo.png';

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  originalPrice?: number;
  category: string;
  rating: number;
  reviews: number;
  image: string;
  inStock: boolean;
  featured?: boolean;
  badge?: string;
  colors?: string[];
  sizes?: string[];
}

interface CartItem extends Product {
  quantity: number;
  selectedColor?: string;
  selectedSize?: string;
}

export default function PublicStore() {
  const { user } = useAuth();
  const companyContext = useCompany();
  const activeCompany = companyContext?.activeCompany || null;
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showCart, setShowCart] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showQuickView, setShowQuickView] = useState<Product | null>(null);
  const [sortBy, setSortBy] = useState('featured');
  const [priceRange, setPriceRange] = useState([0, 10000]);
  const [showFilters, setShowFilters] = useState(false);

  // Get company branding
  const companyName = 'The Black Phoenix Company';
  const companyTagline = activeCompany?.dba || 'Premium Materials';

  const categories = ['All', 'Structures', 'Materials', 'Tools', 'Hardware', 'Electrical', 'Plumbing'];

  const products: Product[] = [
    {
      id: 's1',
      name: 'Modern Garden Shed',
      description: 'Premium cedar wood garden shed with double doors and weather-resistant finish',
      price: 3499.00,
      originalPrice: 4299.00,
      category: 'Structures',
      rating: 4.9,
      reviews: 67,
      image: '/placeholder-product.jpg',
      inStock: true,
      featured: true,
      badge: 'BESTSELLER',
      colors: ['Natural Cedar', 'Dark Walnut', 'Gray'],
      sizes: ['10x12', '12x16', '16x20']
    },
    {
      id: 's2',
      name: 'Deluxe Workshop',
      description: 'Heavy-duty workshop with insulation, electrical wiring, and custom shelving',
      price: 8999.00,
      category: 'Structures',
      rating: 5.0,
      reviews: 34,
      image: '/placeholder-product.jpg',
      inStock: true,
      featured: true,
      sizes: ['16x20', '20x24', '24x32']
    },
    {
      id: 'm1',
      name: 'Premium Composite Decking',
      description: 'Low-maintenance composite decking boards with 25-year warranty',
      price: 4.99,
      originalPrice: 6.99,
      category: 'Materials',
      rating: 4.8,
      reviews: 156,
      image: '/placeholder-product.jpg',
      inStock: true,
      badge: 'SALE',
      colors: ['Weathered Gray', 'Walnut', 'Brazilian Ipe']
    },
    {
      id: 't1',
      name: 'Professional Power Drill Set',
      description: '20V cordless drill with 2 batteries and 100+ accessories',
      price: 199.99,
      category: 'Tools',
      rating: 4.7,
      reviews: 89,
      image: '/placeholder-product.jpg',
      inStock: true
    },
    {
      id: 'h1',
      name: 'Stainless Steel Hardware Kit',
      description: 'Complete hardware kit with 500+ pieces for various projects',
      price: 49.99,
      category: 'Hardware',
      rating: 4.6,
      reviews: 234,
      image: '/placeholder-product.jpg',
      inStock: true,
      badge: 'POPULAR'
    },
    {
      id: 'e1',
      name: 'LED Work Light Pro',
      description: 'Ultra-bright 5000 lumen work light with adjustable stand',
      price: 79.99,
      originalPrice: 99.99,
      category: 'Electrical',
      rating: 4.9,
      reviews: 122,
      image: '/placeholder-product.jpg',
      inStock: true
    },
    {
      id: 'p1',
      name: 'PEX Plumbing Kit',
      description: 'Complete PEX plumbing kit with tools and fittings',
      price: 149.99,
      category: 'Plumbing',
      rating: 4.5,
      reviews: 78,
      image: '/placeholder-product.jpg',
      inStock: true
    },
    {
      id: 'm2',
      name: 'Pressure-Treated Lumber',
      description: 'High-quality pressure-treated lumber for outdoor projects',
      price: 12.99,
      category: 'Materials',
      rating: 4.7,
      reviews: 203,
      image: '/placeholder-product.jpg',
      inStock: true
    }
  ];

  const filteredProducts = products.filter(product => {
    const matchesCategory = selectedCategory === 'all' ||
      product.category.toLowerCase() === selectedCategory.toLowerCase();
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPrice = product.price >= priceRange[0] && product.price <= priceRange[1];
    return matchesCategory && matchesSearch && matchesPrice;
  });

  const sortedProducts = [...filteredProducts].sort((a, b) => {
    switch (sortBy) {
      case 'price-low': return a.price - b.price;
      case 'price-high': return b.price - a.price;
      case 'rating': return b.rating - a.rating;
      case 'reviews': return b.reviews - a.reviews;
      default: return b.featured ? 1 : -1;
    }
  });

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  const addToCart = (product: Product) => {
    const existing = cart.find(item => item.id === product.id);
    if (existing) {
      setCart(cart.map(item =>
        item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
      ));
    } else {
      setCart([...cart, { ...product, quantity: 1 }]);
    }
    toast.success('Added to cart!');
  };

  const toggleWishlist = (productId: string) => {
    if (wishlist.includes(productId)) {
      setWishlist(wishlist.filter(id => id !== productId));
      toast.success('Removed from wishlist');
    } else {
      setWishlist([...wishlist, productId]);
      toast.success('Added to wishlist!');
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Premium Header */}
      <header className="sticky top-0 z-50 bg-black/95 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-[1400px] mx-auto px-6">
          {/* Top Bar */}
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center gap-8">
              {/* Logo */}
              <div className="flex items-center gap-3">
                <img
                  src={companyLogo}
                  alt={companyName}
                  className="w-12 h-12 rounded-xl object-contain bg-white/5 p-1"
                />
                <div>
                  <h1 className="text-xl font-bold">{companyName}</h1>
                  <p className="text-xs text-gray-400">{companyTagline}</p>
                </div>
              </div>

              {/* Categories Desktop */}
              <nav className="hidden lg:flex items-center gap-1">
                {categories.map(category => (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(category.toLowerCase())}
                    className={`px-4 py-2 rounded-lg font-medium transition-all ${
                      selectedCategory === category.toLowerCase()
                        ? 'bg-white/10 text-white'
                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    {category}
                  </button>
                ))}
              </nav>
            </div>

            {/* Search Bar */}
            <div className="hidden md:flex items-center flex-1 max-w-lg mx-6">
              <div className="relative w-full">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-blue-500/50 focus:bg-white/10 transition"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3">
              {/* Wishlist */}
              <button className="relative p-3 rounded-xl hover:bg-white/5 transition">
                <Heart className="w-6 h-6" />
                {wishlist.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-r from-pink-500 to-red-500 rounded-full text-xs font-bold flex items-center justify-center">
                    {wishlist.length}
                  </span>
                )}
              </button>

              {/* Cart */}
              <button
                onClick={() => setShowCart(true)}
                className="relative p-3 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 transition"
              >
                <ShoppingCart className="w-6 h-6" />
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 rounded-full text-sm font-bold flex items-center justify-center">
                    {cartCount}
                  </span>
                )}
              </button>

              {/* User */}
              {user ? (
                <div className="hidden sm:flex items-center gap-2 px-4 py-3 bg-white/5 rounded-xl border border-white/10">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-r from-green-400 to-emerald-500 flex items-center justify-center">
                    <User className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-sm">Signed In</span>
                </div>
              ) : (
                <button className="hidden sm:flex items-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/15 rounded-xl transition font-medium border border-white/10">
                  <User className="w-5 h-5" />
                  <span>Sign In</span>
                </button>
              )}

              {/* Mobile Menu */}
              <button
                onClick={() => setShowMobileMenu(!showMobileMenu)}
                className="lg:hidden p-3 hover:bg-white/5 rounded-xl transition"
              >
                <Menu className="w-6 h-6" />
              </button>
            </div>
          </div>
        </div>

        {/* Trust Bar */}
        <div className="border-t border-white/10 py-3 bg-white/5">
          <div className="max-w-[1400px] mx-auto px-6">
            <div className="flex items-center justify-center gap-8 text-sm text-gray-400">
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-blue-400" />
                <span>Free Shipping Over $500</span>
              </div>
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-green-400" />
                <span>Quality Guaranteed</span>
              </div>
              <div className="flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-purple-400" />
                <span>30-Day Returns</span>
              </div>
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-yellow-400" />
                <span>Secure Checkout</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Banner */}
      <section className="relative py-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 via-purple-600/20 to-pink-600/20" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/20 via-black to-black" />

        <div className="relative max-w-[1400px] mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500/20 border border-blue-500/30 rounded-full text-blue-300 text-sm font-medium mb-6">
            <Zap className="w-4 h-4" />
            Limited Time Offer
          </div>
          <h2 className="text-6xl font-bold mb-4 bg-gradient-to-r from-white via-gray-200 to-gray-400 bg-clip-text text-transparent">
            Premium Building Materials
          </h2>
          <p className="text-xl text-gray-400 mb-8 max-w-2xl mx-auto">
            Professional-grade supplies for construction, renovation, and DIY projects
          </p>
          <button className="px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 rounded-xl font-semibold text-lg transition-all transform hover:scale-105 shadow-xl">
            Shop Now
          </button>
        </div>
      </section>

      {/* Main Content */}
      <div className="max-w-[1400px] mx-auto px-6 py-12">
        {/* Toolbar */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <h3 className="text-2xl font-bold">
              {selectedCategory === 'all' ? 'All Products' : selectedCategory}
              <span className="text-gray-400 text-lg ml-2">({sortedProducts.length})</span>
            </h3>
          </div>

          <div className="flex items-center gap-3">
            {/* View Toggle */}
            <div className="flex items-center gap-1 p-1 bg-white/5 rounded-lg border border-white/10">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded ${viewMode === 'grid' ? 'bg-white/10' : 'hover:bg-white/5'} transition`}
              >
                <Grid className="w-5 h-5" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded ${viewMode === 'list' ? 'bg-white/10' : 'hover:bg-white/5'} transition`}
              >
                <List className="w-5 h-5" />
              </button>
            </div>

            {/* Filters */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-4 py-3 bg-white/5 hover:bg-white/10 rounded-lg border border-white/10 transition"
            >
              <SlidersHorizontal className="w-5 h-5" />
              <span>Filters</span>
            </button>

            {/* Sort */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-blue-500/50 transition"
            >
              <option value="featured">Featured</option>
              <option value="price-low">Price: Low to High</option>
              <option value="price-high">Price: High to Low</option>
              <option value="rating">Highest Rated</option>
              <option value="reviews">Most Reviewed</option>
            </select>
          </div>
        </div>

        {/* Products Grid */}
        <div className={viewMode === 'grid'
          ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'
          : 'flex flex-col gap-4'
        }>
          {sortedProducts.map(product => (
            <div
              key={product.id}
              className={`group relative bg-white/5 border border-white/10 rounded-2xl overflow-hidden hover:border-blue-500/50 transition-all duration-300 ${
                viewMode === 'list' ? 'flex gap-6 p-6' : ''
              }`}
            >
              {/* Badge */}
              {product.badge && (
                <div className="absolute top-4 left-4 z-10 px-3 py-1 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full text-xs font-bold">
                  {product.badge}
                </div>
              )}

              {/* Wishlist Button */}
              <button
                onClick={() => toggleWishlist(product.id)}
                className="absolute top-4 right-4 z-10 p-2 bg-black/50 backdrop-blur-sm hover:bg-black/70 rounded-full transition-all opacity-0 group-hover:opacity-100"
              >
                <Heart
                  className={`w-5 h-5 ${wishlist.includes(product.id) ? 'fill-red-500 text-red-500' : 'text-white'}`}
                />
              </button>

              {/* Quick View */}
              <button
                onClick={() => setShowQuickView(product)}
                className="absolute top-4 right-16 z-10 p-2 bg-black/50 backdrop-blur-sm hover:bg-black/70 rounded-full transition-all opacity-0 group-hover:opacity-100"
              >
                <Eye className="w-5 h-5 text-white" />
              </button>

              {/* Product Image */}
              <div className={`relative bg-white/5 flex items-center justify-center ${
                viewMode === 'list' ? 'w-48 h-48 flex-shrink-0 rounded-xl' : 'aspect-square'
              }`}>
                <Package className="w-20 h-20 text-gray-700" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>

              {/* Product Info */}
              <div className="p-6 flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm text-gray-400">{product.category}</span>
                  {product.inStock && (
                    <span className="flex items-center gap-1 text-xs text-green-400">
                      <Check className="w-3 h-3" />
                      In Stock
                    </span>
                  )}
                </div>

                <h3 className="font-bold text-lg mb-2 line-clamp-2 group-hover:text-blue-400 transition">
                  {product.name}
                </h3>

                <p className="text-sm text-gray-400 mb-4 line-clamp-2">
                  {product.description}
                </p>

                {/* Rating */}
                <div className="flex items-center gap-2 mb-4">
                  <div className="flex items-center">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`w-4 h-4 ${
                          i < Math.floor(product.rating)
                            ? 'text-yellow-400 fill-yellow-400'
                            : 'text-gray-600'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-sm text-gray-400">
                    {product.rating} ({product.reviews})
                  </span>
                </div>

                {/* Price */}
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold">
                      ${product.price.toFixed(2)}
                    </div>
                    {product.originalPrice && (
                      <div className="text-sm text-gray-500 line-through">
                        ${product.originalPrice.toFixed(2)}
                      </div>
                    )}
                  </div>

                  {/* Add to Cart Button */}
                  <button
                    onClick={() => addToCart(product)}
                    className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 rounded-xl font-semibold transition-all transform hover:scale-105 flex items-center gap-2"
                  >
                    <ShoppingCart className="w-4 h-4" />
                    Add
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {sortedProducts.length === 0 && (
          <div className="text-center py-20">
            <Package className="w-20 h-20 text-gray-700 mx-auto mb-4" />
            <h3 className="text-2xl font-bold mb-2">No products found</h3>
            <p className="text-gray-400">Try adjusting your filters or search query</p>
          </div>
        )}
      </div>

      {/* Shopping Cart Sidebar */}
      {showCart && (
        <div className="fixed inset-0 z-50 flex items-start justify-end">
          <div
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => setShowCart(false)}
          />
          <div className="relative w-full max-w-md h-full bg-[#0A0A0A] border-l border-white/10 overflow-y-auto">
            {/* Cart Header */}
            <div className="sticky top-0 bg-[#0A0A0A] border-b border-white/10 px-6 py-4 z-10">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-2xl font-bold">Shopping Cart</h3>
                <button
                  onClick={() => setShowCart(false)}
                  className="p-2 hover:bg-white/5 rounded-lg transition"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">{cartCount} items</span>
                {cartTotal >= 500 && (
                  <span className="flex items-center gap-1 text-green-400">
                    <Check className="w-4 h-4" />
                    Free shipping unlocked!
                  </span>
                )}
              </div>
            </div>

            {/* Cart Items */}
            <div className="p-6 space-y-4">
              {cart.length === 0 ? (
                <div className="text-center py-12">
                  <ShoppingCart className="w-16 h-16 text-gray-700 mx-auto mb-4" />
                  <p className="text-gray-400">Your cart is empty</p>
                </div>
              ) : (
                cart.map((item) => (
                  <div key={item.id} className="flex gap-4 p-4 bg-white/5 rounded-xl border border-white/10">
                    <div className="w-20 h-20 bg-white/5 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Package className="w-10 h-10 text-gray-700" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold mb-1">{item.name}</h4>
                      <p className="text-sm text-gray-400 mb-2">${item.price.toFixed(2)}</p>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            if (item.quantity > 1) {
                              setCart(cart.map(i =>
                                i.id === item.id ? { ...i, quantity: i.quantity - 1 } : i
                              ));
                            } else {
                              setCart(cart.filter(i => i.id !== item.id));
                            }
                          }}
                          className="p-1 bg-white/10 hover:bg-white/20 rounded transition"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <span className="w-8 text-center">{item.quantity}</span>
                        <button
                          onClick={() => {
                            setCart(cart.map(i =>
                              i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
                            ));
                          }}
                          className="p-1 bg-white/10 hover:bg-white/20 rounded transition"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold mb-2">
                        ${(item.price * item.quantity).toFixed(2)}
                      </div>
                      <button
                        onClick={() => setCart(cart.filter(i => i.id !== item.id))}
                        className="text-red-400 hover:text-red-300 text-sm"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Cart Footer */}
            {cart.length > 0 && (
              <div className="sticky bottom-0 bg-[#0A0A0A] border-t border-white/10 p-6">
                <div className="space-y-3 mb-6">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">Subtotal</span>
                    <span className="font-semibold">${cartTotal.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">Shipping</span>
                    <span className="font-semibold">
                      {cartTotal >= 500 ? (
                        <span className="text-green-400">FREE</span>
                      ) : (
                        '$25.00'
                      )}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-lg font-bold pt-3 border-t border-white/10">
                    <span>Total</span>
                    <span className="text-2xl bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                      ${(cartTotal >= 500 ? cartTotal : cartTotal + 25).toFixed(2)}
                    </span>
                  </div>
                </div>
                <button className="w-full py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 rounded-xl font-bold text-lg transition-all transform hover:scale-105">
                  Proceed to Checkout
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Quick View Modal */}
      {showQuickView && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => setShowQuickView(null)}
          />
          <div className="relative max-w-4xl w-full bg-[#0A0A0A] border border-white/10 rounded-2xl overflow-hidden">
            <button
              onClick={() => setShowQuickView(null)}
              className="absolute top-4 right-4 z-10 p-2 bg-black/50 backdrop-blur-sm hover:bg-black/70 rounded-full transition"
            >
              <X className="w-6 h-6" />
            </button>

            <div className="flex flex-col md:flex-row gap-8 p-8">
              {/* Image */}
              <div className="flex-1 bg-white/5 rounded-xl aspect-square flex items-center justify-center">
                <Package className="w-32 h-32 text-gray-700" />
              </div>

              {/* Details */}
              <div className="flex-1">
                {showQuickView.badge && (
                  <span className="inline-block px-3 py-1 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full text-xs font-bold mb-4">
                    {showQuickView.badge}
                  </span>
                )}
                <h2 className="text-3xl font-bold mb-2">{showQuickView.name}</h2>
                <p className="text-gray-400 mb-4">{showQuickView.description}</p>

                {/* Rating */}
                <div className="flex items-center gap-2 mb-6">
                  <div className="flex items-center">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`w-5 h-5 ${
                          i < Math.floor(showQuickView.rating)
                            ? 'text-yellow-400 fill-yellow-400'
                            : 'text-gray-600'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-gray-400">
                    {showQuickView.rating} ({showQuickView.reviews} reviews)
                  </span>
                </div>

                {/* Price */}
                <div className="mb-6">
                  <div className="text-4xl font-bold mb-2">
                    ${showQuickView.price.toFixed(2)}
                  </div>
                  {showQuickView.originalPrice && (
                    <div className="text-xl text-gray-500 line-through">
                      ${showQuickView.originalPrice.toFixed(2)}
                    </div>
                  )}
                </div>

                {/* Colors */}
                {showQuickView.colors && showQuickView.colors.length > 0 && (
                  <div className="mb-6">
                    <label className="block text-sm font-medium mb-2">Color</label>
                    <div className="flex gap-2">
                      {showQuickView.colors.map(color => (
                        <button
                          key={color}
                          className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-blue-500 rounded-lg transition"
                        >
                          {color}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Sizes */}
                {showQuickView.sizes && showQuickView.sizes.length > 0 && (
                  <div className="mb-6">
                    <label className="block text-sm font-medium mb-2">Size</label>
                    <div className="flex gap-2">
                      {showQuickView.sizes.map(size => (
                        <button
                          key={size}
                          className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-blue-500 rounded-lg transition"
                        >
                          {size}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Add to Cart */}
                <button
                  onClick={() => {
                    addToCart(showQuickView);
                    setShowQuickView(null);
                  }}
                  className="w-full py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 rounded-xl font-bold text-lg transition-all transform hover:scale-105 flex items-center justify-center gap-2"
                >
                  <ShoppingCart className="w-5 h-5" />
                  Add to Cart
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
