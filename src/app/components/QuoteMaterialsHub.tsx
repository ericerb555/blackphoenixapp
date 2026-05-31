/**
 * Quote Materials Hub - Enhanced Shopping Experience
 * 
 * Multi-supplier product search with shopping cart for quote building:
 * - Unified search across Home Depot, Lowe's, Grainger
 * - Real-time price comparison
 * - Shopping cart with running total
 * - Multiple layout options (Split, Side Panel, Full Screen)
 * - Bulk add to quote capability
 * - Smart recommendations
 */

import { useState, useEffect } from 'react';
import {
  Search, ShoppingCart, Plus, Minus, Trash2, X, Check, Package,
  DollarSign, TrendingDown, Filter, Star, Building2, Truck, ArrowLeft,
  ArrowRight, Grid, List, Eye, Heart, GitCompare, RefreshCw, Zap,
  Box, Layers, Tag, Award, Clock, Shield, CheckCircle, AlertCircle,
  ChevronRight, ChevronDown, Settings, Download, Upload, Save, Home
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';

interface Product {
  id: string;
  name: string;
  description: string;
  vendor: 'homedepot' | 'lowes' | 'grainger';
  sku: string;
  price: number;
  originalPrice?: number;
  image: string;
  category: string;
  inStock: boolean;
  rating: number;
  reviewCount: number;
  shippingTime: string;
  unit: string;
  minOrder?: number;
}

interface CartItem extends Product {
  quantity: number;
  notes?: string;
  markup?: number;
}

type LayoutMode = 'split' | 'side-panel' | 'bottom-panel' | 'full-screen';

interface QuoteMaterialsHubProps {
  isOpen: boolean;
  onClose: () => void;
  onAddToQuote: (items: CartItem[]) => void;
  existingItems?: any[];
  quoteId?: string;
}

export default function QuoteMaterialsHub({
  isOpen,
  onClose,
  onAddToQuote,
  existingItems = [],
  quoteId
}: QuoteMaterialsHubProps) {
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('split');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedVendors, setSelectedVendors] = useState<string[]>(['homedepot', 'lowes', 'grainger']);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<'price-low' | 'price-high' | 'rating' | 'name'>('price-low');
  const [showCart, setShowCart] = useState(true);
  const [searching, setSearching] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Mock product data - replace with actual API calls
  const mockProducts: Product[] = [
    {
      id: 'hd-001',
      name: '2x4x8 Premium Kiln-Dried Lumber',
      description: 'High-quality kiln-dried stud for framing',
      vendor: 'homedepot',
      sku: 'HD-LBR-2X4-8',
      price: 4.25,
      originalPrice: 5.99,
      image: 'https://images.unsplash.com/photo-1601582589907-f92af5ed9db8?w=400',
      category: 'Lumber',
      inStock: true,
      rating: 4.7,
      reviewCount: 342,
      shippingTime: 'In-store pickup today',
      unit: 'ea',
      minOrder: 1
    },
    {
      id: 'lw-001',
      name: '2x4x8 Pressure Treated Lumber',
      description: 'Weather-resistant pressure treated wood',
      vendor: 'lowes',
      sku: 'LW-PT-2X4-8',
      price: 7.89,
      image: 'https://images.unsplash.com/photo-1601582589907-f92af5ed9db8?w=400',
      category: 'Lumber',
      inStock: true,
      rating: 4.6,
      reviewCount: 289,
      shippingTime: 'Ships in 2-3 days',
      unit: 'ea'
    },
    {
      id: 'gr-001',
      name: 'Heavy Duty Trash Bags 55 Gal (100 Pack)',
      description: 'Industrial strength contractor bags',
      vendor: 'grainger',
      sku: 'GR-BAG-55-100',
      price: 32.99,
      image: 'https://images.unsplash.com/photo-1604335399105-a0c585fd81a1?w=400',
      category: 'Cleanup',
      inStock: true,
      rating: 4.9,
      reviewCount: 567,
      shippingTime: 'Ships next day',
      unit: 'box'
    },
    {
      id: 'hd-002',
      name: 'Drywall 1/2" x 4\' x 8\'',
      description: 'Standard gypsum drywall panel',
      vendor: 'homedepot',
      sku: 'HD-DW-12-48',
      price: 12.99,
      image: 'https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?w=400',
      category: 'Drywall',
      inStock: true,
      rating: 4.5,
      reviewCount: 445,
      shippingTime: 'Available for delivery',
      unit: 'sheet'
    },
    {
      id: 'lw-002',
      name: 'Interior Paint 5 Gal - Eggshell White',
      description: 'Premium interior latex paint',
      vendor: 'lowes',
      sku: 'LW-PNT-INT-5G',
      price: 124.99,
      originalPrice: 149.99,
      image: 'https://images.unsplash.com/photo-1562259949-e8e7689d7828?w=400',
      category: 'Paint',
      inStock: true,
      rating: 4.8,
      reviewCount: 723,
      shippingTime: 'In-store pickup today',
      unit: 'bucket'
    },
    {
      id: 'gr-002',
      name: 'Safety Cones 36" (Set of 12)',
      description: 'High-visibility traffic cones',
      vendor: 'grainger',
      sku: 'GR-SAFE-CONE-36',
      price: 191.88,
      image: 'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=400',
      category: 'Safety',
      inStock: true,
      rating: 4.6,
      reviewCount: 234,
      shippingTime: 'Ships in 1-2 days',
      unit: 'set'
    },
    {
      id: 'hd-003',
      name: 'Romex 12/2 Wire (250 ft Roll)',
      description: 'NM-B electrical wire',
      vendor: 'homedepot',
      sku: 'HD-WIRE-12-2',
      price: 89.99,
      image: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=400',
      category: 'Electrical',
      inStock: true,
      rating: 4.7,
      reviewCount: 412,
      shippingTime: 'In-store pickup',
      unit: 'roll'
    },
    {
      id: 'lw-003',
      name: 'PEX Tubing 1/2" (300 ft Coil)',
      description: 'Red PEX tubing for hot water',
      vendor: 'lowes',
      sku: 'LW-PEX-12-300',
      price: 89.99,
      image: 'https://images.unsplash.com/photo-1607472586893-edb57bdc0e39?w=400',
      category: 'Plumbing',
      inStock: true,
      rating: 4.8,
      reviewCount: 356,
      shippingTime: 'Available for delivery',
      unit: 'coil'
    }
  ];

  useEffect(() => {
    setProducts(mockProducts);
    setFilteredProducts(mockProducts);
  }, []);

  useEffect(() => {
    filterAndSortProducts();
  }, [searchQuery, selectedVendors, selectedCategory, sortBy, products]);

  const filterAndSortProducts = () => {
    let filtered = [...products];

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.category.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Filter by vendor
    filtered = filtered.filter(p => selectedVendors.includes(p.vendor));

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(p => p.category === selectedCategory);
    }

    // Sort
    switch (sortBy) {
      case 'price-low':
        filtered.sort((a, b) => a.price - b.price);
        break;
      case 'price-high':
        filtered.sort((a, b) => b.price - a.price);
        break;
      case 'rating':
        filtered.sort((a, b) => b.rating - a.rating);
        break;
      case 'name':
        filtered.sort((a, b) => a.name.localeCompare(b.name));
        break;
    }

    setFilteredProducts(filtered);
  };

  const toggleVendor = (vendor: string) => {
    if (selectedVendors.includes(vendor)) {
      setSelectedVendors(selectedVendors.filter(v => v !== vendor));
    } else {
      setSelectedVendors([...selectedVendors, vendor]);
    }
  };

  const addToCart = (product: Product) => {
    const existing = cart.find(item => item.id === product.id);
    if (existing) {
      setCart(cart.map(item =>
        item.id === product.id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
      toast.success('Quantity increased');
    } else {
      setCart([...cart, { ...product, quantity: 1 }]);
      toast.success('Added to cart');
    }
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setCart(cart.map(item =>
      item.id === productId ? { ...item, quantity } : item
    ));
  };

  const updateMarkup = (productId: string, markup: number) => {
    setCart(cart.map(item =>
      item.id === productId ? { ...item, markup } : item
    ));
  };

  const removeFromCart = (productId: string) => {
    setCart(cart.filter(item => item.id !== productId));
    toast.success('Removed from cart');
  };

  const clearCart = () => {
    setCart([]);
    toast.success('Cart cleared');
  };

  const handleAddToQuote = () => {
    if (cart.length === 0) {
      toast.error('Cart is empty');
      return;
    }
    onAddToQuote(cart);
    toast.success(`Added ${cart.length} items to quote`);
    setCart([]);
    onClose();
  };

  const cartTotal = cart.reduce((sum, item) => {
    const basePrice = item.price * item.quantity;
    const markupAmount = item.markup ? basePrice * (item.markup / 100) : 0;
    return sum + basePrice + markupAmount;
  }, 0);

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const categories = ['all', ...Array.from(new Set(products.map(p => p.category)))];

  const vendorColors = {
    homedepot: 'bg-orange-500',
    lowes: 'bg-blue-600',
    grainger: 'bg-red-600'
  };

  const vendorNames = {
    homedepot: 'Home Depot',
    lowes: "Lowe's",
    grainger: 'Grainger'
  };

  if (!isOpen) return null;

  // Product Card Component
  const ProductCard = ({ product }: { product: Product }) => {
    const inCart = cart.find(item => item.id === product.id);
    const discount = product.originalPrice ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100) : 0;

    return (
      <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] overflow-hidden hover:border-orange-500/50 transition group">
        <div className="relative">
          <img src={product.image} alt={product.name} className="w-full h-48 object-cover" />
          <div className={`absolute top-2 left-2 ${vendorColors[product.vendor]} text-white px-2 py-1 rounded text-xs font-semibold`}>
            {vendorNames[product.vendor]}
          </div>
          {discount > 0 && (
            <div className="absolute top-2 right-2 bg-green-600 text-white px-2 py-1 rounded text-xs font-bold">
              -{discount}%
            </div>
          )}
          {inCart && (
            <div className="absolute bottom-2 right-2 bg-orange-500 text-white px-2 py-1 rounded-full text-xs font-semibold flex items-center gap-1">
              <ShoppingCart className="w-3 h-3" />
              {inCart.quantity}
            </div>
          )}
        </div>

        <div className="p-4">
          <div className="flex items-start justify-between mb-2">
            <h3 className="text-white font-semibold text-sm line-clamp-2 flex-1">{product.name}</h3>
          </div>
          
          <p className="text-gray-400 text-xs mb-3 line-clamp-2">{product.description}</p>
          
          <div className="flex items-center gap-2 mb-3">
            <div className="flex items-center gap-1">
              <Star className="w-4 h-4 fill-yellow-500 text-yellow-500" />
              <span className="text-white text-sm font-semibold">{product.rating}</span>
              <span className="text-gray-500 text-xs">({product.reviewCount})</span>
            </div>
          </div>

          <div className="flex items-center gap-2 mb-3">
            <Truck className="w-4 h-4 text-gray-500" />
            <span className="text-gray-400 text-xs">{product.shippingTime}</span>
          </div>

          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="text-2xl font-bold text-white">
                ${product.price.toFixed(2)}
                <span className="text-sm text-gray-500">/{product.unit}</span>
              </div>
              {product.originalPrice && (
                <div className="text-sm text-gray-500 line-through">${product.originalPrice.toFixed(2)}</div>
              )}
            </div>
            {product.inStock ? (
              <div className="flex items-center gap-1 text-green-500 text-xs">
                <CheckCircle className="w-4 h-4" />
                In Stock
              </div>
            ) : (
              <div className="flex items-center gap-1 text-red-500 text-xs">
                <AlertCircle className="w-4 h-4" />
                Out of Stock
              </div>
            )}
          </div>

          <button
            onClick={() => addToCart(product)}
            disabled={!product.inStock}
            className="w-full bg-orange-600 hover:bg-orange-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white py-2 rounded-lg font-semibold flex items-center justify-center gap-2 transition"
          >
            <Plus className="w-4 h-4" />
            Add to Cart
          </button>
        </div>
      </div>
    );
  };

  // Cart Panel Component
  const CartPanel = () => (
    <div className="bg-[#0F0F0F] border-l border-[#2A2A2A] flex flex-col h-full">
      {/* Cart Header */}
      <div className="p-4 border-b border-[#2A2A2A]">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-orange-500" />
            <h2 className="text-xl font-bold text-white">Cart</h2>
          </div>
          <div className="bg-orange-500 text-white px-2 py-1 rounded-full text-sm font-bold">
            {cartCount}
          </div>
        </div>
        {cart.length > 0 && (
          <button
            onClick={clearCart}
            className="text-red-500 text-sm hover:text-red-400 transition flex items-center gap-1"
          >
            <Trash2 className="w-4 h-4" />
            Clear Cart
          </button>
        )}
      </div>

      {/* Cart Items */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {cart.length === 0 ? (
          <div className="text-center py-12">
            <ShoppingCart className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-500 text-sm">Your cart is empty</p>
            <p className="text-gray-600 text-xs mt-2">Search and add materials to get started</p>
          </div>
        ) : (
          cart.map((item) => (
            <div key={item.id} className="bg-[#1A1A1A] rounded-lg border border-[#2A2A2A] p-3">
              <div className="flex gap-3 mb-3">
                <img src={item.image} alt={item.name} className="w-16 h-16 rounded object-cover" />
                <div className="flex-1 min-w-0">
                  <h4 className="text-white font-semibold text-sm line-clamp-2 mb-1">{item.name}</h4>
                  <div className={`inline-block ${vendorColors[item.vendor]} text-white px-2 py-0.5 rounded text-xs`}>
                    {vendorNames[item.vendor]}
                  </div>
                </div>
                <button
                  onClick={() => removeFromCart(item.id)}
                  className="text-red-500 hover:text-red-400 transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2">
                {/* Quantity */}
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 text-xs">Quantity:</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      className="bg-[#2A2A2A] hover:bg-[#3A3A3A] text-white p-1 rounded transition"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => updateQuantity(item.id, parseInt(e.target.value) || 0)}
                      className="w-16 bg-[#2A2A2A] text-white text-center py-1 rounded text-sm"
                    />
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      className="bg-[#2A2A2A] hover:bg-[#3A3A3A] text-white p-1 rounded transition"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {/* Markup */}
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 text-xs">Markup %:</span>
                  <input
                    type="number"
                    value={item.markup || 0}
                    onChange={(e) => updateMarkup(item.id, parseFloat(e.target.value) || 0)}
                    className="w-20 bg-[#2A2A2A] text-white text-center py-1 rounded text-sm"
                    placeholder="0"
                  />
                </div>

                {/* Price Breakdown */}
                <div className="pt-2 border-t border-[#2A2A2A] space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Base:</span>
                    <span className="text-gray-400">${(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                  {item.markup && item.markup > 0 && (
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500">Markup ({item.markup}%):</span>
                      <span className="text-green-500">+${((item.price * item.quantity) * (item.markup / 100)).toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm font-bold pt-1 border-t border-[#2A2A2A]">
                    <span className="text-white">Total:</span>
                    <span className="text-orange-500">
                      ${((item.price * item.quantity) * (1 + (item.markup || 0) / 100)).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Cart Footer */}
      {cart.length > 0 && (
        <div className="p-4 border-t border-[#2A2A2A] space-y-3">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Subtotal ({cartCount} items):</span>
              <span className="text-white font-semibold">${cartTotal.toFixed(2)}</span>
            </div>
          </div>
          
          <button
            onClick={handleAddToQuote}
            className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition"
          >
            <Check className="w-5 h-5" />
            Add {cartCount} Items to Quote
          </button>
          
          <button
            onClick={onClose}
            className="w-full bg-[#2A2A2A] hover:bg-[#3A3A3A] text-white py-2 rounded-lg font-semibold transition"
          >
            Continue Shopping
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/95 z-50 flex flex-col">
      {/* Header */}
      <div className="bg-[#0A0A0A] border-b border-[#2A2A2A] p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-white">Materials Hub</h1>
              <p className="text-gray-400 text-sm">Search suppliers • Compare prices • Build your quote</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Layout Switcher */}
            <div className="bg-[#1A1A1A] rounded-lg p-1 flex gap-1">
              <button
                onClick={() => setLayoutMode('split')}
                className={`px-3 py-1.5 rounded text-sm font-medium transition ${
                  layoutMode === 'split' ? 'bg-orange-600 text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                Split
              </button>
              <button
                onClick={() => setLayoutMode('side-panel')}
                className={`px-3 py-1.5 rounded text-sm font-medium transition ${
                  layoutMode === 'side-panel' ? 'bg-orange-600 text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                Side Panel
              </button>
            </div>

            <button
              onClick={onClose}
              className="bg-[#1A1A1A] hover:bg-[#2A2A2A] text-white p-2 rounded-lg transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search products, SKU, category..."
              className="w-full pl-12 pr-4 py-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-orange-500"
            />
          </div>

          {/* Vendor Filters */}
          <div className="flex gap-2">
            {(['homedepot', 'lowes', 'grainger'] as const).map((vendor) => (
              <button
                key={vendor}
                onClick={() => toggleVendor(vendor)}
                className={`px-4 py-3 rounded-xl font-semibold transition ${
                  selectedVendors.includes(vendor)
                    ? `${vendorColors[vendor]} text-white`
                    : 'bg-[#1A1A1A] text-gray-400 hover:bg-[#2A2A2A]'
                }`}
              >
                {vendorNames[vendor]}
              </button>
            ))}
          </div>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-4 py-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl text-white focus:outline-none focus:border-orange-500"
          >
            <option value="price-low">Price: Low to High</option>
            <option value="price-high">Price: High to Low</option>
            <option value="rating">Highest Rated</option>
            <option value="name">Name A-Z</option>
          </select>
        </div>

        {/* Category Pills */}
        <div className="flex gap-2 mt-3 flex-wrap">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition ${
                selectedCategory === category
                  ? 'bg-orange-600 text-white'
                  : 'bg-[#1A1A1A] text-gray-400 hover:bg-[#2A2A2A]'
              }`}
            >
              {category === 'all' ? 'All Categories' : category}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Products Grid */}
        <div className={`flex-1 overflow-y-auto p-6 ${layoutMode === 'split' ? 'w-2/3' : 'w-full'}`}>
          <div className="mb-4 flex items-center justify-between">
            <p className="text-gray-400 text-sm">
              Found {filteredProducts.length} products
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded transition ${
                  viewMode === 'grid' ? 'bg-orange-600 text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                <Grid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded transition ${
                  viewMode === 'list' ? 'bg-orange-600 text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className={
            viewMode === 'grid'
              ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'
              : 'space-y-4'
          }>
            {filteredProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>

          {filteredProducts.length === 0 && (
            <div className="text-center py-12">
              <Package className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-500 text-lg font-semibold">No products found</p>
              <p className="text-gray-600 text-sm mt-2">Try adjusting your filters or search terms</p>
            </div>
          )}
        </div>

        {/* Cart Panel */}
        {layoutMode === 'split' && (
          <div className="w-1/3">
            <CartPanel />
          </div>
        )}
      </div>

      {/* Floating Cart Button (for non-split modes) */}
      {layoutMode !== 'split' && cart.length > 0 && (
        <button
          onClick={() => setShowCart(!showCart)}
          className="fixed bottom-6 right-6 bg-orange-600 hover:bg-orange-700 text-white px-6 py-4 rounded-full shadow-2xl flex items-center gap-3 transition z-50"
        >
          <ShoppingCart className="w-6 h-6" />
          <span className="font-bold">{cartCount} Items</span>
          <span className="font-bold">${cartTotal.toFixed(2)}</span>
        </button>
      )}
    </div>
  );
}
