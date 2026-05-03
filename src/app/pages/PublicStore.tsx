/**
 * Public Store - Standalone eCommerce storefront
 * Accessible to anyone without authentication
 * Supports guest checkout and user registration
 */

import { useState, useEffect } from 'react';
import {
  ShoppingCart, Search, Menu, X, User, LogIn, UserPlus,
  Heart, Star, Filter, ChevronDown, Home, Phone, Mail,
  MapPin, Facebook, Instagram, Twitter, Package, Truck,
  Shield, CreditCard, ArrowLeft, Plus, Minus, Check
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';

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
  type?: 'product' | 'structure' | 'custom';
  dimensions?: string;
  leadTime?: string;
}

interface CartItem extends Product {
  quantity: number;
}

export default function PublicStore() {
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showCart, setShowCart] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCheckout, setShowCheckout] = useState(false);
  const [showCustomBuildModal, setShowCustomBuildModal] = useState(false);
  const [isGuest, setIsGuest] = useState(true);

  // Expanded products catalog - structures, materials, tools, and more
  const products: Product[] = [
    // PRE-BUILT STRUCTURES
    {
      id: 's1',
      name: 'Modern Garden Shed - 10x12',
      description: 'Premium cedar wood garden shed with double doors, windows, and weather-resistant finish',
      price: 3499.00,
      originalPrice: 4299.00,
      category: 'Structures',
      rating: 4.9,
      reviews: 67,
      image: '/placeholder-product.jpg',
      inStock: true,
      featured: true,
      badge: 'BESTSELLER',
      type: 'structure',
      dimensions: '10\' x 12\' x 8\'',
      leadTime: '2-3 weeks'
    },
    {
      id: 's2',
      name: 'Deluxe Workshop - 16x20',
      description: 'Heavy-duty workshop with insulation, electrical wiring, and custom shelving',
      price: 8999.00,
      category: 'Structures',
      rating: 5.0,
      reviews: 34,
      image: '/placeholder-product.jpg',
      inStock: true,
      featured: true,
      type: 'structure',
      dimensions: '16\' x 20\' x 10\'',
      leadTime: '4-6 weeks'
    },
    {
      id: 's3',
      name: 'Hexagon Gazebo - 12ft',
      description: 'Beautiful cedar gazebo with built-in seating and cupola top',
      price: 5299.00,
      originalPrice: 6499.00,
      category: 'Structures',
      rating: 4.8,
      reviews: 89,
      image: '/placeholder-product.jpg',
      inStock: true,
      featured: true,
      badge: 'SALE',
      type: 'structure',
      dimensions: '12\' diameter x 10\' high',
      leadTime: '3-4 weeks'
    },
    {
      id: 's4',
      name: 'Backyard Studio - 12x16',
      description: 'Modern office/studio with insulation, HVAC rough-in, and large windows',
      price: 12499.00,
      category: 'Structures',
      rating: 4.9,
      reviews: 45,
      image: '/placeholder-product.jpg',
      inStock: true,
      type: 'structure',
      dimensions: '12\' x 16\' x 10\'',
      leadTime: '6-8 weeks'
    },
    {
      id: 's5',
      name: 'Chicken Coop - Deluxe',
      description: 'Cedar chicken coop with nesting boxes, roosting bars, and predator protection',
      price: 1899.00,
      category: 'Structures',
      rating: 4.7,
      reviews: 156,
      image: '/placeholder-product.jpg',
      inStock: true,
      type: 'structure',
      dimensions: '6\' x 8\' x 6\'',
      leadTime: '1-2 weeks'
    },
    {
      id: 's6',
      name: 'Pergola Kit - 12x12',
      description: 'Premium redwood pergola kit with decorative lattice and hardware',
      price: 2799.00,
      category: 'Structures',
      rating: 4.6,
      reviews: 112,
      image: '/placeholder-product.jpg',
      inStock: true,
      badge: 'NEW',
      type: 'structure',
      dimensions: '12\' x 12\' x 9\'',
      leadTime: '2-3 weeks'
    },
    
    // MATERIALS
    {
      id: 'p1',
      name: 'Premium Hardwood Flooring',
      description: 'Solid oak hardwood flooring, 3/4" thick, pre-finished',
      price: 8.99,
      originalPrice: 12.99,
      category: 'Materials',
      rating: 4.8,
      reviews: 156,
      image: '/placeholder-product.jpg',
      inStock: true,
      featured: true,
      badge: 'SALE'
    },
    {
      id: 'p4',
      name: 'Marble Countertop Slab',
      description: 'White Carrara marble, polished, 3cm thick',
      price: 89.00,
      category: 'Materials',
      rating: 4.9,
      reviews: 67,
      image: '/placeholder-product.jpg',
      inStock: true
    },
    
    // TOOLS & EQUIPMENT
    {
      id: 't1',
      name: 'Professional Tool Set - 230pc',
      description: 'Complete professional tool set with rolling cabinet',
      price: 1299.00,
      originalPrice: 1799.00,
      category: 'Tools',
      rating: 4.9,
      reviews: 234,
      image: '/placeholder-product.jpg',
      inStock: true,
      featured: true,
      badge: '28% OFF'
    },
    {
      id: 't2',
      name: 'Cordless Drill Combo Kit',
      description: 'Professional 20V cordless drill and impact driver combo with batteries',
      price: 279.00,
      category: 'Tools',
      rating: 4.8,
      reviews: 445,
      image: '/placeholder-product.jpg',
      inStock: true
    },
    
    // PLUMBING & FIXTURES
    {
      id: 'p2',
      name: 'Designer Kitchen Faucet',
      description: 'Stainless steel pull-down kitchen faucet with spray',
      price: 249.00,
      category: 'Plumbing',
      rating: 4.9,
      reviews: 89,
      image: '/placeholder-product.jpg',
      inStock: true,
      featured: true
    },
    
    // ELECTRICAL
    {
      id: 'p3',
      name: 'LED Recessed Lighting Kit',
      description: '6-pack dimmable LED recessed lights, 4-inch',
      price: 119.99,
      originalPrice: 159.99,
      category: 'Electrical',
      rating: 4.7,
      reviews: 234,
      image: '/placeholder-product.jpg',
      inStock: true,
      badge: '25% OFF'
    },
    {
      id: 'p5',
      name: 'Smart Thermostat',
      description: 'WiFi-enabled programmable thermostat with app control',
      price: 179.99,
      category: 'Electrical',
      rating: 4.6,
      reviews: 342,
      image: '/placeholder-product.jpg',
      inStock: true,
      featured: true
    },
    
    // HARDWARE
    {
      id: 'p6',
      name: 'Cabinet Hardware Set',
      description: 'Brushed nickel cabinet pulls and knobs, 20-piece set',
      price: 34.99,
      category: 'Hardware',
      rating: 4.5,
      reviews: 123,
      image: '/placeholder-product.jpg',
      inStock: true
    },
    
    // CUSTOM BUILD PLACEHOLDER
    {
      id: 'custom1',
      name: 'Custom Build - Your Vision',
      description: 'Design your own structure - shed, workshop, studio, or any custom build',
      price: 0,
      category: 'Custom Builds',
      rating: 5.0,
      reviews: 89,
      image: '/placeholder-product.jpg',
      inStock: true,
      featured: true,
      badge: 'CUSTOM',
      type: 'custom'
    }
  ];

  const categories = ['All', 'Structures', 'Materials', 'Tools', 'Plumbing', 'Electrical', 'Hardware', 'Custom Builds'];

  const filteredProducts = products.filter(product => {
    const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         product.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const addToCart = (product: Product) => {
    // If it's a custom build, open the custom build modal instead
    if (product.type === 'custom') {
      setShowCustomBuildModal(true);
      return;
    }
    
    const existing = cart.find(item => item.id === product.id);
    if (existing) {
      setCart(cart.map(item => 
        item.id === product.id 
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      setCart([...cart, { ...product, quantity: 1 }]);
    }
    toast.success('Added to cart!');
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart(cart.map(item => {
      if (item.id === productId) {
        const newQuantity = Math.max(0, item.quantity + delta);
        return { ...item, quantity: newQuantity };
      }
      return item;
    }).filter(item => item.quantity > 0));
  };

  const removeFromCart = (productId: string) => {
    setCart(cart.filter(item => item.id !== productId));
    toast.success('Removed from cart');
  };

  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const handleCheckout = () => {
    if (cart.length === 0) {
      toast.error('Your cart is empty');
      return;
    }
    setShowCheckout(true);
    setShowCart(false);
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      {/* Header */}
      <header className="bg-[#1A1A1A] border-b border-[#2A2A2A] sticky top-0 z-50">
        {/* Top Bar */}
        <div className="bg-[#ea580c] text-white py-2">
          <div className="max-w-7xl mx-auto px-4 flex items-center justify-between text-sm">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <Phone className="w-3 h-3" />
                (555) 123-4567
              </span>
              <span className="flex items-center gap-1">
                <Mail className="w-3 h-3" />
                support@yourstore.com
              </span>
            </div>
            <div className="flex items-center gap-4">
              <span>Free Shipping on Orders $500+</span>
            </div>
          </div>
        </div>

        {/* Main Header */}
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            {/* Logo */}
            <button
              onClick={() => window.location.href = '/'}
              className="flex items-center gap-2"
            >
              <div className="w-10 h-10 bg-[#ea580c] rounded-lg flex items-center justify-center">
                <Home className="w-6 h-6 text-white" />
              </div>
              <div className="text-left hidden sm:block">
                <div className="font-bold text-xl text-white">ProStore</div>
                <div className="text-xs text-gray-400">Premium Building Materials</div>
              </div>
            </button>

            {/* Search */}
            <div className="flex-1 max-w-2xl hidden md:block">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#ea580c]/50"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3">
              {/* Cart */}
              <button
                onClick={() => setShowCart(!showCart)}
                className="relative p-3 bg-[#0A0A0A] hover:bg-[#2A2A2A] rounded-xl transition"
              >
                <ShoppingCart className="w-6 h-6 text-white" />
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-[#ea580c] text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                    {cartCount}
                  </span>
                )}
              </button>

              {/* User */}
              <button
                onClick={() => setShowAuthModal(true)}
                className="hidden sm:flex items-center gap-2 px-4 py-3 bg-[#ea580c] hover:bg-[#dc2626] rounded-xl transition font-semibold"
              >
                <User className="w-5 h-5" />
                <span>Sign In</span>
              </button>

              {/* Mobile Menu */}
              <button
                onClick={() => setShowMobileMenu(!showMobileMenu)}
                className="md:hidden p-3 bg-[#0A0A0A] hover:bg-[#2A2A2A] rounded-xl transition"
              >
                <Menu className="w-6 h-6" />
              </button>
            </div>
          </div>
        </div>

        {/* Categories */}
        <div className="bg-[#0F0F0F] border-t border-[#2A2A2A]">
          <div className="max-w-7xl mx-auto px-4 py-3">
            <div className="flex items-center gap-2 overflow-x-auto">
              {categories.map(category => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category.toLowerCase())}
                  className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition ${
                    selectedCategory === category.toLowerCase()
                      ? 'bg-[#ea580c] text-white'
                      : 'bg-[#1A1A1A] text-gray-300 hover:bg-[#2A2A2A]'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      {/* Hero Banner */}
      <div className="bg-gradient-to-r from-[#ea580c] to-orange-600 py-16">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <h1 className="text-5xl font-bold text-white mb-4">
            Premium Building Materials
          </h1>
          <p className="text-xl text-orange-100 mb-8">
            Everything you need for your construction and renovation projects
          </p>
          <div className="flex items-center justify-center gap-4">
            <div className="flex items-center gap-2 text-white">
              <Truck className="w-5 h-5" />
              <span>Fast Delivery</span>
            </div>
            <div className="flex items-center gap-2 text-white">
              <Shield className="w-5 h-5" />
              <span>Quality Guaranteed</span>
            </div>
            <div className="flex items-center gap-2 text-white">
              <Package className="w-5 h-5" />
              <span>Easy Returns</span>
            </div>
          </div>
        </div>
      </div>

      {/* Products Grid */}
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-3xl font-bold text-white">
            {selectedCategory === 'all' ? 'All Products' : selectedCategory}
          </h2>
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-400" />
            <select className="px-4 py-2 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#ea580c]/50">
              <option>Sort by: Featured</option>
              <option>Price: Low to High</option>
              <option>Price: High to Low</option>
              <option>Rating</option>
              <option>Newest</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredProducts.map(product => (
            <div
              key={product.id}
              className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl overflow-hidden hover:border-[#ea580c]/50 transition group"
            >
              {/* Product Image */}
              <div className="relative bg-[#0A0A0A] aspect-square flex items-center justify-center">
                <Package className="w-24 h-24 text-gray-700" />
                {product.badge && (
                  <div className="absolute top-3 left-3 bg-[#ea580c] text-white px-3 py-1 rounded-full text-xs font-bold">
                    {product.badge}
                  </div>
                )}
                <button className="absolute top-3 right-3 p-2 bg-white/10 backdrop-blur-sm hover:bg-white/20 rounded-full transition opacity-0 group-hover:opacity-100">
                  <Heart className="w-5 h-5 text-white" />
                </button>
              </div>

              {/* Product Info */}
              <div className="p-4">
                <div className="text-sm text-gray-400 mb-1">{product.category}</div>
                <h3 className="font-bold text-white mb-2 line-clamp-2">{product.name}</h3>
                <p className="text-sm text-gray-400 mb-3 line-clamp-2">{product.description}</p>

                {/* Rating */}
                <div className="flex items-center gap-2 mb-3">
                  <div className="flex items-center gap-1">
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
                  <span className="text-sm text-gray-400">({product.reviews})</span>
                </div>

                {/* Price */}
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="text-2xl font-bold text-white">
                      ${product.price.toFixed(2)}
                    </div>
                    {product.originalPrice && (
                      <div className="text-sm text-gray-500 line-through">
                        ${product.originalPrice.toFixed(2)}
                      </div>
                    )}
                  </div>
                  {product.inStock && (
                    <span className="text-sm text-green-400 font-semibold">In Stock</span>
                  )}
                </div>

                {/* Add to Cart */}
                <button
                  onClick={() => addToCart(product)}
                  disabled={!product.inStock}
                  className="w-full py-3 bg-[#ea580c] hover:bg-[#dc2626] disabled:bg-gray-700 disabled:cursor-not-allowed rounded-xl font-bold text-white transition flex items-center justify-center gap-2"
                >
                  <ShoppingCart className="w-5 h-5" />
                  {product.inStock ? 'Add to Cart' : 'Out of Stock'}
                </button>
              </div>
            </div>
          ))}
        </div>

        {filteredProducts.length === 0 && (
          <div className="text-center py-16">
            <Package className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <p className="text-xl text-gray-400">No products found</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="bg-[#1A1A1A] border-t border-[#2A2A2A] mt-16">
        <div className="max-w-7xl mx-auto px-4 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <h3 className="font-bold text-white mb-4">About Us</h3>
              <p className="text-gray-400 text-sm">
                Your trusted source for premium building materials and construction supplies.
              </p>
            </div>
            <div>
              <h3 className="font-bold text-white mb-4">Customer Service</h3>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><a href="#" className="hover:text-[#ea580c]">Contact Us</a></li>
                <li><a href="#" className="hover:text-[#ea580c]">Shipping Info</a></li>
                <li><a href="#" className="hover:text-[#ea580c]">Returns</a></li>
                <li><a href="#" className="hover:text-[#ea580c]">FAQ</a></li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold text-white mb-4">Quick Links</h3>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><a href="#" className="hover:text-[#ea580c]">Products</a></li>
                <li><a href="#" className="hover:text-[#ea580c]">Categories</a></li>
                <li><a href="#" className="hover:text-[#ea580c]">Deals</a></li>
                <li><a href="#" className="hover:text-[#ea580c]">Blog</a></li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold text-white mb-4">Follow Us</h3>
              <div className="flex items-center gap-3">
                <a href="#" className="p-2 bg-[#0A0A0A] hover:bg-[#ea580c] rounded-lg transition">
                  <Facebook className="w-5 h-5" />
                </a>
                <a href="#" className="p-2 bg-[#0A0A0A] hover:bg-[#ea580c] rounded-lg transition">
                  <Instagram className="w-5 h-5" />
                </a>
                <a href="#" className="p-2 bg-[#0A0A0A] hover:bg-[#ea580c] rounded-lg transition">
                  <Twitter className="w-5 h-5" />
                </a>
              </div>
            </div>
          </div>
          <div className="border-t border-[#2A2A2A] mt-8 pt-8 text-center text-gray-400 text-sm">
            © 2026 ProStore. All rights reserved.
          </div>
        </div>
      </footer>

      {/* Shopping Cart Sidebar */}
      {showCart && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setShowCart(false)}
          />
          <div className="relative w-full max-w-md bg-[#1A1A1A] border-l border-[#2A2A2A] flex flex-col">
            {/* Cart Header */}
            <div className="p-6 border-b border-[#2A2A2A] flex items-center justify-between">
              <h2 className="text-2xl font-bold text-white">Shopping Cart</h2>
              <button
                onClick={() => setShowCart(false)}
                className="p-2 hover:bg-[#2A2A2A] rounded-lg transition"
              >
                <X className="w-6 h-6 text-gray-400" />
              </button>
            </div>

            {/* Cart Items */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {cart.length === 0 ? (
                <div className="text-center py-16">
                  <ShoppingCart className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400">Your cart is empty</p>
                </div>
              ) : (
                cart.map(item => (
                  <div key={item.id} className="bg-[#0A0A0A] rounded-xl p-4 border border-[#2A2A2A]">
                    <div className="flex gap-4">
                      <div className="w-20 h-20 bg-[#1A1A1A] rounded-lg flex items-center justify-center flex-shrink-0">
                        <Package className="w-10 h-10 text-gray-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-white mb-1 line-clamp-1">{item.name}</h3>
                        <p className="text-sm text-gray-400 mb-2">${item.price.toFixed(2)}</p>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => updateQuantity(item.id, -1)}
                            className="p-1 bg-[#1A1A1A] hover:bg-[#2A2A2A] rounded"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <span className="text-white font-semibold w-8 text-center">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item.id, 1)}
                            className="p-1 bg-[#1A1A1A] hover:bg-[#2A2A2A] rounded"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => removeFromCart(item.id)}
                            className="ml-auto p-1 text-red-400 hover:bg-red-500/10 rounded"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Cart Footer */}
            {cart.length > 0 && (
              <div className="p-6 border-t border-[#2A2A2A] bg-[#0F0F0F]">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-lg text-gray-400">Subtotal:</span>
                  <span className="text-2xl font-bold text-white">${cartTotal.toFixed(2)}</span>
                </div>
                <button
                  onClick={handleCheckout}
                  className="w-full py-4 bg-[#ea580c] hover:bg-[#dc2626] rounded-xl font-bold text-white transition flex items-center justify-center gap-2"
                >
                  <CreditCard className="w-5 h-5" />
                  Proceed to Checkout
                </button>
                <button
                  onClick={() => setShowCart(false)}
                  className="w-full py-3 mt-2 text-gray-400 hover:text-white transition"
                >
                  Continue Shopping
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Checkout Modal */}
      {showCheckout && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-[#2A2A2A] flex items-center justify-between sticky top-0 bg-[#1A1A1A] z-10">
              <h2 className="text-2xl font-bold text-white">Checkout</h2>
              <button
                onClick={() => setShowCheckout(false)}
                className="p-2 hover:bg-[#2A2A2A] rounded-lg transition"
              >
                <X className="w-6 h-6 text-gray-400" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Guest vs Login */}
              <div className="bg-[#0A0A0A] rounded-xl p-6 border border-[#2A2A2A]">
                <h3 className="font-bold text-white mb-4">Checkout As</h3>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => setIsGuest(true)}
                    className={`p-4 rounded-xl border-2 transition ${
                      isGuest
                        ? 'border-[#ea580c] bg-[#ea580c]/10'
                        : 'border-[#2A2A2A] hover:border-[#3A3A3A]'
                    }`}
                  >
                    <User className="w-8 h-8 text-white mx-auto mb-2" />
                    <div className="font-bold text-white">Guest</div>
                    <div className="text-xs text-gray-400">Quick checkout</div>
                  </button>
                  <button
                    onClick={() => {
                      setIsGuest(false);
                      setShowAuthModal(true);
                    }}
                    className={`p-4 rounded-xl border-2 transition ${
                      !isGuest
                        ? 'border-[#ea580c] bg-[#ea580c]/10'
                        : 'border-[#2A2A2A] hover:border-[#3A3A3A]'
                    }`}
                  >
                    <LogIn className="w-8 h-8 text-white mx-auto mb-2" />
                    <div className="font-bold text-white">Sign In</div>
                    <div className="text-xs text-gray-400">Saved addresses</div>
                  </button>
                </div>
              </div>

              {/* Contact Information */}
              <div className="bg-[#0A0A0A] rounded-xl p-6 border border-[#2A2A2A]">
                <h3 className="font-bold text-white mb-4">Contact Information</h3>
                <div className="space-y-4">
                  <input
                    type="email"
                    placeholder="Email"
                    className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#ea580c]/50"
                  />
                  <input
                    type="tel"
                    placeholder="Phone"
                    className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#ea580c]/50"
                  />
                </div>
              </div>

              {/* Shipping Address */}
              <div className="bg-[#0A0A0A] rounded-xl p-6 border border-[#2A2A2A]">
                <h3 className="font-bold text-white mb-4">Shipping Address</h3>
                <div className="space-y-4">
                  <input
                    type="text"
                    placeholder="Full Name"
                    className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#ea580c]/50"
                  />
                  <input
                    type="text"
                    placeholder="Street Address"
                    className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#ea580c]/50"
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <input
                      type="text"
                      placeholder="City"
                      className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#ea580c]/50"
                    />
                    <input
                      type="text"
                      placeholder="State"
                      className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#ea580c]/50"
                    />
                  </div>
                  <input
                    type="text"
                    placeholder="ZIP Code"
                    className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#ea580c]/50"
                  />
                </div>
              </div>

              {/* Order Summary */}
              <div className="bg-[#0A0A0A] rounded-xl p-6 border border-[#2A2A2A]">
                <h3 className="font-bold text-white mb-4">Order Summary</h3>
                <div className="space-y-3">
                  <div className="flex justify-between text-gray-400">
                    <span>Subtotal ({cartCount} items):</span>
                    <span>${cartTotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-gray-400">
                    <span>Shipping:</span>
                    <span className="text-green-400">FREE</span>
                  </div>
                  <div className="flex justify-between text-gray-400">
                    <span>Tax:</span>
                    <span>${(cartTotal * 0.08).toFixed(2)}</span>
                  </div>
                  <div className="border-t border-[#2A2A2A] pt-3 flex justify-between">
                    <span className="text-xl font-bold text-white">Total:</span>
                    <span className="text-2xl font-bold text-[#ea580c]">
                      ${(cartTotal * 1.08).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Place Order */}
              <button
                onClick={() => {
                  toast.success('Order placed successfully! Check your email for confirmation.');
                  setShowCheckout(false);
                  setCart([]);
                }}
                className="w-full py-4 bg-[#ea580c] hover:bg-[#dc2626] rounded-xl font-bold text-white transition flex items-center justify-center gap-2"
              >
                <Check className="w-5 h-5" />
                Place Order - ${(cartTotal * 1.08).toFixed(2)}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Auth Modal */}
      {showAuthModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl shadow-2xl max-w-md w-full">
            <div className="p-6 border-b border-[#2A2A2A] flex items-center justify-between">
              <h2 className="text-2xl font-bold text-white">
                {authMode === 'login' ? 'Sign In' : 'Create Account'}
              </h2>
              <button
                onClick={() => setShowAuthModal(false)}
                className="p-2 hover:bg-[#2A2A2A] rounded-lg transition"
              >
                <X className="w-6 h-6 text-gray-400" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <input
                type="email"
                placeholder="Email"
                className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#ea580c]/50"
              />
              <input
                type="password"
                placeholder="Password"
                className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#ea580c]/50"
              />
              {authMode === 'signup' && (
                <input
                  type="password"
                  placeholder="Confirm Password"
                  className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#ea580c]/50"
                />
              )}
              <button
                onClick={() => {
                  toast.success(authMode === 'login' ? 'Signed in successfully!' : 'Account created!');
                  setShowAuthModal(false);
                }}
                className="w-full py-3 bg-[#ea580c] hover:bg-[#dc2626] rounded-xl font-bold text-white transition"
              >
                {authMode === 'login' ? 'Sign In' : 'Create Account'}
              </button>
              <button
                onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')}
                className="w-full py-2 text-gray-400 hover:text-white transition"
              >
                {authMode === 'login' 
                  ? "Don't have an account? Sign up" 
                  : "Already have an account? Sign in"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Build Request Modal */}
      {showCustomBuildModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-[#2A2A2A] flex items-center justify-between sticky top-0 bg-[#1A1A1A] z-10">
              <div>
                <h2 className="text-2xl font-bold text-white">Custom Build Request</h2>
                <p className="text-gray-400 text-sm mt-1">Tell us about your dream structure</p>
              </div>
              <button
                onClick={() => setShowCustomBuildModal(false)}
                className="p-2 hover:bg-[#2A2A2A] rounded-lg transition"
              >
                <X className="w-6 h-6 text-gray-400" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Structure Type */}
              <div className="bg-[#0A0A0A] rounded-xl p-6 border border-[#2A2A2A]">
                <h3 className="font-bold text-white mb-4">What type of structure?</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {['Shed', 'Workshop', 'Studio', 'Gazebo', 'Barn', 'Garage', 'Greenhouse', 'Pergola', 'Other'].map(type => (
                    <button
                      key={type}
                      className="p-4 bg-[#1A1A1A] hover:bg-[#2A2A2A] border border-[#2A2A2A] hover:border-[#ea580c] rounded-xl transition text-white font-medium"
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              {/* Dimensions */}
              <div className="bg-[#0A0A0A] rounded-xl p-6 border border-[#2A2A2A]">
                <h3 className="font-bold text-white mb-4">Approximate Dimensions</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm text-gray-400 mb-2 block">Width (ft)</label>
                    <input
                      type="number"
                      placeholder="10"
                      className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#ea580c]/50"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-gray-400 mb-2 block">Length (ft)</label>
                    <input
                      type="number"
                      placeholder="12"
                      className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#ea580c]/50"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-gray-400 mb-2 block">Height (ft)</label>
                    <input
                      type="number"
                      placeholder="8"
                      className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#ea580c]/50"
                    />
                  </div>
                </div>
              </div>

              {/* Features & Requirements */}
              <div className="bg-[#0A0A0A] rounded-xl p-6 border border-[#2A2A2A]">
                <h3 className="font-bold text-white mb-4">Features & Requirements</h3>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  {[
                    'Insulation',
                    'Electrical Wiring',
                    'HVAC',
                    'Plumbing',
                    'Windows',
                    'Skylights',
                    'Custom Doors',
                    'Built-in Storage',
                    'Workbenches',
                    'Loft/Second Floor',
                    'Custom Paint',
                    'Weatherproofing'
                  ].map(feature => (
                    <label key={feature} className="flex items-center gap-3 p-3 bg-[#1A1A1A] rounded-lg cursor-pointer hover:bg-[#2A2A2A] transition">
                      <input type="checkbox" className="w-5 h-5 rounded border-[#2A2A2A] bg-[#0A0A0A] text-[#ea580c] focus:ring-[#ea580c]" />
                      <span className="text-white text-sm">{feature}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Additional Details */}
              <div className="bg-[#0A0A0A] rounded-xl p-6 border border-[#2A2A2A]">
                <h3 className="font-bold text-white mb-4">Additional Details</h3>
                <textarea
                  placeholder="Describe your vision, special requirements, materials preferences, timeline, budget range, etc..."
                  rows={6}
                  className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#ea580c]/50"
                />
              </div>

              {/* Contact Information */}
              <div className="bg-[#0A0A0A] rounded-xl p-6 border border-[#2A2A2A]">
                <h3 className="font-bold text-white mb-4">Contact Information</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <input
                    type="text"
                    placeholder="Full Name"
                    className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#ea580c]/50"
                  />
                  <input
                    type="email"
                    placeholder="Email"
                    className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#ea580c]/50"
                  />
                  <input
                    type="tel"
                    placeholder="Phone"
                    className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#ea580c]/50"
                  />
                  <input
                    type="text"
                    placeholder="City, State"
                    className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#ea580c]/50"
                  />
                </div>
              </div>

              {/* Budget Range */}
              <div className="bg-[#0A0A0A] rounded-xl p-6 border border-[#2A2A2A]">
                <h3 className="font-bold text-white mb-4">Budget Range (Optional)</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {['Under $5K', '$5K - $10K', '$10K - $25K', '$25K+'].map(range => (
                    <button
                      key={range}
                      className="p-3 bg-[#1A1A1A] hover:bg-[#2A2A2A] border border-[#2A2A2A] hover:border-[#ea580c] rounded-xl transition text-white font-medium text-sm"
                    >
                      {range}
                    </button>
                  ))}
                </div>
              </div>

              {/* Submit */}
              <div className="flex gap-4">
                <button
                  onClick={() => setShowCustomBuildModal(false)}
                  className="flex-1 py-4 bg-[#2A2A2A] hover:bg-[#3A3A3A] rounded-xl font-bold text-white transition"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    toast.success('Custom build request submitted! We\'ll contact you within 24 hours.');
                    setShowCustomBuildModal(false);
                  }}
                  className="flex-1 py-4 bg-[#ea580c] hover:bg-[#dc2626] rounded-xl font-bold text-white transition flex items-center justify-center gap-2"
                >
                  <Check className="w-5 h-5" />
                  Submit Request
                </button>
              </div>

              {/* Info Note */}
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
                <p className="text-sm text-blue-300 text-center">
                  💡 Our team will review your request and provide a detailed quote within 24-48 hours. Custom builds typically take 4-12 weeks depending on complexity.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}