/**
 * Public Store - Premium eCommerce Experience
 * World-class shopping experience with modern design
 */

import { useState, useEffect } from 'react';
import {
  ShoppingCart, Search, Menu, X, User, Heart, Star, Filter,
  ChevronDown, Package, Truck, Shield, CreditCard, ArrowLeft,
  Plus, Minus, Check, Eye, TrendingUp, Zap, Award, ChevronRight,
  Grid, List, SlidersHorizontal, RefreshCw, ShoppingBag, Lock,
  Flame, Tag, ArrowRight, MessageSquare, Mail, Instagram,
  Facebook, Youtube, MapPin, Phone,
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { useAuth } from '../contexts/AuthContext';
import { useCompany } from '../contexts/CompanyContext';
import companyLogo from '../../imports/BPB_phoenix_full_color_logo.png';
import { publicAnonKey, projectId } from '../utils/supabase/info';

const SERVER = `https://${projectId}.supabase.co/functions/v1/make-server-57095a78`;

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
  const [dropshipProducts, setDropshipProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);

  // Fetch live products from connected dropshippers
  useEffect(() => {
    async function loadDropshipProducts() {
      setLoadingProducts(true);
      try {
        const res = await fetch(`${SERVER}/dropshipper/inventory`, {
          headers: { Authorization: `Bearer ${publicAnonKey}` },
        });
        if (res.ok) {
          const data = await res.json();
          const items = (data.products || data.inventory || []).map((p: any) => ({
            id: p.id || p.sku || `ds-${Math.random()}`,
            name: p.name || p.title,
            description: p.description || '',
            price: Number(p.price) || Number(p.retailPrice) || 0,
            originalPrice: p.originalPrice || p.msrp || undefined,
            category: p.category || 'General',
            rating: p.rating || 4.5,
            reviews: p.reviews || 0,
            image: p.image || p.imageUrl || '/placeholder-product.jpg',
            inStock: p.inStock !== false && (p.stock ?? 1) > 0,
            badge: p.badge || (p.isNew ? 'NEW' : undefined),
            supplier: p.provider || p.supplier,
          }));
          if (items.length > 0) setDropshipProducts(items);
        }
      } catch {
        // silent — falls back to hardcoded products
      } finally {
        setLoadingProducts(false);
      }
    }
    loadDropshipProducts();
  }, []);

  // Get company branding
  const companyName = 'The Black Phoenix Company';
  const companyTagline = activeCompany?.dba || 'Shop Everything';

  const categories = ['All', 'Home & Garden', 'Tools & Hardware', 'Electronics', 'Apparel', 'Health & Beauty', 'Sports & Outdoors', 'Kitchen', 'Office', 'Toys & Games', 'Automotive', 'Pet Supplies'];

  const products: Product[] = [
    {
      id: 'p1', name: 'Wireless Noise-Cancelling Headphones',
      description: 'Premium over-ear headphones with 30hr battery, active noise cancellation, and foldable design.',
      price: 79.99, originalPrice: 129.99, category: 'Electronics', rating: 4.9, reviews: 2841,
      image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&q=80',
      inStock: true, featured: true, badge: 'BESTSELLER',
    },
    {
      id: 'p2', name: 'Stainless Steel Water Bottle (32oz)',
      description: 'Double-wall vacuum insulated. Keeps drinks cold 24hrs, hot 12hrs. Leak-proof lid.',
      price: 24.99, originalPrice: 39.99, category: 'Sports & Outdoors', rating: 4.8, reviews: 5102,
      image: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=400&q=80',
      inStock: true, featured: true, badge: 'TOP RATED',
    },
    {
      id: 'p3', name: 'Smart LED Strip Lights (16ft)',
      description: 'RGB color-changing LED strips, app & voice control, works with Alexa & Google Home.',
      price: 19.99, originalPrice: 34.99, category: 'Electronics', rating: 4.7, reviews: 3920,
      image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&q=80',
      inStock: true, featured: true, badge: 'HOT',
    },
    {
      id: 'p4', name: 'Cordless Drill & Driver Set',
      description: '20V MAX cordless drill with 2 batteries, charger, and 50-piece accessory set.',
      price: 89.99, originalPrice: 129.99, category: 'Tools & Hardware', rating: 4.8, reviews: 1456,
      image: 'https://images.unsplash.com/photo-1504148455328-c376907d081c?w=400&q=80',
      inStock: true, featured: true,
    },
    {
      id: 'p5', name: 'Yoga Mat — Non-Slip (6mm)',
      description: 'Extra thick non-slip yoga mat with carrying strap. Eco-friendly TPE material.',
      price: 29.99, originalPrice: 49.99, category: 'Sports & Outdoors', rating: 4.8, reviews: 2234,
      image: 'https://images.unsplash.com/photo-1601925228010-7c09e48f2be3?w=400&q=80',
      inStock: true,
    },
    {
      id: 'p6', name: 'Air Fryer (5.8Qt)',
      description: 'Large capacity digital air fryer with 8 presets. 1700W, dishwasher-safe basket.',
      price: 69.99, originalPrice: 99.99, category: 'Kitchen', rating: 4.9, reviews: 7821,
      image: 'https://images.unsplash.com/photo-1585515320310-259814833e62?w=400&q=80',
      inStock: true, badge: 'BESTSELLER',
    },
    {
      id: 'p7', name: 'Graphic Hoodie — Unisex',
      description: 'Soft fleece pullover hoodie with kangaroo pocket. Available in 6 colors.',
      price: 39.99, originalPrice: 59.99, category: 'Apparel', rating: 4.6, reviews: 934,
      image: 'https://images.unsplash.com/photo-1556821840-3a63f15732ce?w=400&q=80',
      inStock: true, colors: ['Black', 'Gray', 'Navy', 'White', 'Olive', 'Burgundy'],
      sizes: ['XS', 'S', 'M', 'L', 'XL', '2XL'],
    },
    {
      id: 'p8', name: 'Portable Bluetooth Speaker',
      description: '360° surround sound, waterproof IPX7, 20hr battery. Perfect for outdoors.',
      price: 49.99, originalPrice: 79.99, category: 'Electronics', rating: 4.7, reviews: 3102,
      image: 'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=400&q=80',
      inStock: true,
    },
    {
      id: 'p9', name: 'Vitamin C + Zinc Gummies (90ct)',
      description: 'Immune support gummies, natural orange flavor, no artificial colors or sweeteners.',
      price: 18.99, originalPrice: 27.99, category: 'Health & Beauty', rating: 4.8, reviews: 4521,
      image: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400&q=80',
      inStock: true, badge: 'POPULAR',
    },
    {
      id: 'p10', name: 'Mechanical Keyboard (TKL)',
      description: 'Tenkeyless mechanical keyboard, blue switches, RGB backlit, USB-C.',
      price: 59.99, originalPrice: 89.99, category: 'Electronics', rating: 4.7, reviews: 1867,
      image: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=400&q=80',
      inStock: true,
    },
    {
      id: 'p11', name: 'Dog Harness — No-Pull (M)',
      description: 'Adjustable no-pull dog harness with reflective strips. Easy on/off clip.',
      price: 22.99, originalPrice: 34.99, category: 'Pet Supplies', rating: 4.9, reviews: 6234,
      image: 'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=400&q=80',
      inStock: true,
    },
    {
      id: 'p12', name: 'Car Phone Mount — Dashboard',
      description: 'Universal magnetic dashboard phone mount, 360° rotation, strong suction.',
      price: 14.99, originalPrice: 24.99, category: 'Automotive', rating: 4.6, reviews: 2891,
      image: 'https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=400&q=80',
      inStock: true, badge: 'SALE',
    },
  ];

  // Auto-Pilot products from localStorage
  const autoImported: Product[] = (() => {
    try {
      const saved = JSON.parse(localStorage.getItem('bp_auto_products') || '[]');
      return saved
        .filter((p: any) => p.status === 'auto-published')
        .map((p: any) => ({
          id: p.id,
          name: p.name,
          description: p.description || '',
          price: p.ourPrice,
          originalPrice: undefined,
          category: p.category,
          rating: p.avgRating || 4.5,
          reviews: Math.floor(Math.random() * 200) + 10,
          image: p.image,
          inStock: true,
          badge: p.badge || (p.trendSignal === 'surging' ? '🔥 TRENDING' : 'NEW'),
        }));
    } catch { return []; }
  })();

  // Merge: live dropship products first, then auto-pilot, then hardcoded as fallback
  const allProducts = dropshipProducts.length > 0
    ? [...dropshipProducts, ...autoImported.filter(a => !dropshipProducts.find(d => d.name === a.name)), ...products.filter(p => !dropshipProducts.find(d => d.name === p.name))]
    : [...autoImported, ...products.filter(p => !autoImported.find(a => a.name === p.name))];

  const filteredProducts = allProducts.filter(product => {
    const matchesCategory = selectedCategory === 'all' ||
      product.category.toLowerCase() === selectedCategory.toLowerCase();
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPrice = product.price >= priceRange[0] && product.price <= priceRange[1];
    return matchesCategory && matchesSearch && matchesPrice;
  });

  const sortedProducts: Product[] = [...filteredProducts].sort((a, b) => {
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

  const [email, setEmail] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');

  const REVIEWS = [
    { name: 'Marcus T.', role: 'Verified Buyer', rating: 5, text: "Fast shipping, great prices, and the product quality is exactly as described. My go-to shop for everything.", avatar: 'M' },
    { name: 'Sarah K.', role: 'Verified Buyer', rating: 5, text: "Love the variety here. Found everything from kitchen gadgets to workout gear in one place. Will definitely be back!", avatar: 'S' },
    { name: 'Jamie R.', role: 'Verified Buyer', rating: 5, text: "The headphones I ordered exceeded my expectations. Packaging was great and arrived two days early.", avatar: 'J' },
  ];

  const featuredProducts = allProducts.filter(p => p.featured || p.badge).slice(0, 4);

  return (
    <div className="min-h-screen text-white" style={{ background: '#080808' }}>

      {/* ── STICKY HEADER ──────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b" style={{ background: 'rgba(8,8,8,0.97)', backdropFilter: 'blur(20px)', borderColor: 'rgba(255,255,255,0.06)' }}>
        {/* Announcement bar */}
        <div className="py-2 text-center text-xs font-semibold tracking-widest uppercase" style={{ background: '#ea580c', color: '#fff' }}>
          🔥 Free Shipping on Orders Over $500 &nbsp;·&nbsp; Use Code <span className="underline">BPBUILDS</span> for 10% Off
        </div>

        <div className="max-w-[1440px] mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16 sm:h-18">

            {/* Logo */}
            <div className="flex items-center gap-3 flex-shrink-0">
              <img src={companyLogo} alt={companyName} className="w-10 h-10 object-contain" />
              <div className="hidden sm:block">
                <p className="text-sm font-black tracking-tight leading-none text-white">{companyName}</p>
                <p className="text-xs text-gray-500">Shop Everything</p>
              </div>
            </div>

            {/* Nav */}
            <nav className="hidden lg:flex items-center gap-1">
              {categories.map(cat => (
                <button key={cat}
                  onClick={() => setSelectedCategory(cat.toLowerCase())}
                  className={`px-3 py-2 text-sm font-medium rounded-lg transition-all ${selectedCategory === cat.toLowerCase() ? 'text-orange-400 bg-orange-500/10' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
                  {cat}
                </button>
              ))}
            </nav>

            {/* Search */}
            <div className="hidden md:flex items-center flex-1 max-w-xs mx-4">
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input type="text" placeholder="Search products…" value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border text-white placeholder-gray-600 focus:outline-none transition"
                  style={{ background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.08)' }} />
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <button className="relative p-2 rounded-xl hover:bg-white/5 transition">
                <Heart className="w-5 h-5 text-gray-400" />
                {wishlist.length > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-xs font-bold flex items-center justify-center">{wishlist.length}</span>}
              </button>
              <button onClick={() => setShowCart(true)} className="relative flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm transition" style={{ background: '#ea580c' }}>
                <ShoppingCart className="w-4 h-4" />
                <span className="hidden sm:inline">Cart</span>
                {cartCount > 0 && <span className="bg-white text-orange-600 rounded-full w-5 h-5 text-xs font-black flex items-center justify-center">{cartCount}</span>}
              </button>
              <button className="lg:hidden p-2 rounded-xl hover:bg-white/5 transition" onClick={() => setShowMobileMenu(!showMobileMenu)}>
                <Menu className="w-5 h-5 text-gray-400" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile menu */}
      {showMobileMenu && (
        <div className="lg:hidden fixed inset-0 z-40 pt-16" style={{ background: 'rgba(8,8,8,0.98)' }}>
          <div className="p-6 space-y-3">
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input type="text" placeholder="Search…" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-3 rounded-xl text-white placeholder-gray-600 focus:outline-none"
                style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.08)' }} />
            </div>
            {categories.map(cat => (
              <button key={cat} onClick={() => { setSelectedCategory(cat.toLowerCase()); setShowMobileMenu(false); }}
                className={`w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition ${selectedCategory === cat.toLowerCase() ? 'bg-orange-500/20 text-orange-400' : 'text-gray-300 hover:bg-white/5'}`}>
                {cat}
              </button>
            ))}
            <button onClick={() => setShowMobileMenu(false)} className="absolute top-4 right-4 p-2 text-gray-400"><X className="w-6 h-6" /></button>
          </div>
        </div>
      )}

      {/* ── HERO ─────────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden" style={{ minHeight: 560 }}>
        {/* Cinematic background */}
        <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, #0d0d0d 0%, #111 40%, #1a0a00 100%)' }} />
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 80% 60% at 60% 50%, rgba(234,88,12,0.18) 0%, transparent 70%)' }} />
        {/* Grid texture */}
        <div className="absolute inset-0 opacity-5" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />

        <div className="relative max-w-[1440px] mx-auto px-4 sm:px-6 py-24 flex flex-col lg:flex-row items-center gap-12">
          <div className="flex-1 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold tracking-widest uppercase mb-6" style={{ background: 'rgba(234,88,12,0.15)', border: '1px solid rgba(234,88,12,0.3)', color: '#ea580c' }}>
              <Flame className="w-3.5 h-3.5" /> New Arrivals Every Week
            </div>
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black leading-none mb-4 tracking-tight">
              <span className="text-white">Shop Quality</span><br />
              <span style={{ background: 'linear-gradient(135deg, #ea580c, #f97316, #fb923c)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Products Made to Last</span>
            </h1>
            <p className="text-lg text-gray-400 mb-8 max-w-lg mx-auto lg:mx-0">
              Everything you need in one place — electronics, apparel, home goods, tools, beauty, sports, and more. Top brands, unbeatable prices, fast shipping.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
              <button onClick={() => document.getElementById('products-section')?.scrollIntoView({ behavior: 'smooth' })}
                className="px-8 py-4 rounded-2xl font-bold text-base transition-all hover:scale-105 flex items-center gap-2 justify-center"
                style={{ background: '#ea580c' }}>
                Shop Now <ArrowRight className="w-5 h-5" />
              </button>
              <button className="px-8 py-4 rounded-2xl font-bold text-base transition-all hover:bg-white/10 flex items-center gap-2 justify-center text-gray-300"
                style={{ border: '1px solid rgba(255,255,255,0.12)' }}>
                View Catalog
              </button>
            </div>

            {/* Social proof under hero */}
            <div className="flex items-center gap-6 mt-10 justify-center lg:justify-start">
              <div className="flex -space-x-3">
                {['M','S','C','J','A'].map((l,i) => (
                  <div key={i} className="w-9 h-9 rounded-full border-2 flex items-center justify-center text-xs font-bold"
                    style={{ borderColor: '#080808', background: `hsl(${i*40+10},60%,35%)` }}>{l}</div>
                ))}
              </div>
              <div>
                <div className="flex items-center gap-1 mb-0.5">
                  {[1,2,3,4,5].map(s => <Star key={s} className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />)}
                </div>
                <p className="text-xs text-gray-500">Trusted by <span className="text-white font-semibold">10,000+</span> contractors</p>
              </div>
            </div>
          </div>

          {/* Hero stats */}
          <div className="hidden lg:grid grid-cols-2 gap-4 w-80 flex-shrink-0">
            {[
              { label: 'Products', value: '2,000+', icon: Package },
              { label: 'Suppliers', value: '8', icon: Truck },
              { label: 'Avg Rating', value: '4.9★', icon: Star },
              { label: 'Ship Time', value: '2–5 Days', icon: Zap },
            ].map((s, i) => {
              const Icon = s.icon;
              return (
                <div key={i} className="rounded-2xl p-5 backdrop-blur-sm" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <Icon className="w-5 h-5 mb-2" style={{ color: '#ea580c' }} />
                  <p className="text-2xl font-black text-white">{s.value}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── TRUST BAR ────────────────────────────────────────────────────────── */}
      <div style={{ background: 'rgba(255,255,255,0.03)', borderTop: '1px solid rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-center gap-6 sm:gap-12 overflow-x-auto">
            {[
              { icon: Truck, label: 'Free Shipping $500+', color: '#ea580c' },
              { icon: Shield, label: 'Quality Guaranteed', color: '#22c55e' },
              { icon: RefreshCw, label: '30-Day Returns', color: '#a855f7' },
              { icon: Lock, label: 'Secure Checkout', color: '#eab308' },
              { icon: Award, label: 'Pro-Grade Only', color: '#3b82f6' },
            ].map((t, i) => {
              const Icon = t.icon;
              return (
                <div key={i} className="flex items-center gap-2 whitespace-nowrap flex-shrink-0">
                  <Icon className="w-4 h-4 flex-shrink-0" style={{ color: t.color }} />
                  <span className="text-xs text-gray-400 font-medium">{t.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── FEATURED PRODUCTS ─────────────────────────────────────────────────── */}
      {featuredProducts.length > 0 && (
        <section className="max-w-[1440px] mx-auto px-4 sm:px-6 py-14">
          <div className="flex items-center justify-between mb-8">
            <div>
              <p className="text-xs font-bold tracking-widest uppercase mb-1" style={{ color: '#ea580c' }}>Handpicked</p>
              <h2 className="text-2xl font-black text-white">Featured Products</h2>
            </div>
            <button className="text-sm text-gray-400 hover:text-white flex items-center gap-1 transition">
              View all <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {featuredProducts.map(product => (
              <div key={product.id} onClick={() => setShowQuickView(product)}
                className="group relative rounded-2xl overflow-hidden cursor-pointer transition-all hover:scale-105"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <div className="aspect-square flex items-center justify-center relative" style={{ background: 'rgba(255,255,255,0.04)' }}>
                  {product.image && product.image !== '/placeholder-product.jpg'
                    ? <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                    : <Package className="w-16 h-16 text-gray-700" />}
                  {product.badge && (
                    <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full text-xs font-black" style={{ background: '#ea580c' }}>
                      {product.badge}
                    </span>
                  )}
                </div>
                <div className="p-4">
                  <p className="text-xs text-gray-500 mb-1">{product.category}</p>
                  <p className="text-sm font-bold text-white line-clamp-1 mb-2">{product.name}</p>
                  <div className="flex items-center justify-between">
                    <span className="font-black text-orange-400">${product.price.toFixed(2)}</span>
                    <button onClick={e => { e.stopPropagation(); addToCart(product); }}
                      className="w-7 h-7 rounded-lg flex items-center justify-center transition hover:scale-110" style={{ background: '#ea580c' }}>
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── MAIN PRODUCT SECTION ──────────────────────────────────────────────── */}
      <section id="products-section" className="max-w-[1440px] mx-auto px-4 sm:px-6 pb-20">

        {/* Category pills + toolbar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div className="flex gap-2 overflow-x-auto pb-1 flex-wrap">
            {categories.map(cat => (
              <button key={cat} onClick={() => setSelectedCategory(cat.toLowerCase())}
                className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition flex-shrink-0 ${
                  selectedCategory === cat.toLowerCase()
                    ? 'text-white' : 'text-gray-500 hover:text-gray-300'
                }`}
                style={selectedCategory === cat.toLowerCase()
                  ? { background: '#ea580c' }
                  : { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.07)' }}>
                {cat}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {/* View toggle */}
            <div className="flex items-center p-1 rounded-xl" style={{ background: 'rgba(255,255,255,0.05)' }}>
              <button onClick={() => setViewMode('grid')} className={`p-1.5 rounded-lg transition ${viewMode === 'grid' ? 'bg-orange-500/20 text-orange-400' : 'text-gray-500 hover:text-white'}`}><Grid className="w-4 h-4" /></button>
              <button onClick={() => setViewMode('list')} className={`p-1.5 rounded-lg transition ${viewMode === 'list' ? 'bg-orange-500/20 text-orange-400' : 'text-gray-500 hover:text-white'}`}><List className="w-4 h-4" /></button>
            </div>
            <select value={sortBy} onChange={e => setSortBy(e.target.value)}
              className="text-sm rounded-xl px-3 py-2 text-gray-300 focus:outline-none"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <option value="featured">Featured</option>
              <option value="price-low">Price ↑</option>
              <option value="price-high">Price ↓</option>
              <option value="rating">Top Rated</option>
              <option value="reviews">Most Reviewed</option>
            </select>
          </div>
        </div>

        <p className="text-sm text-gray-600 mb-6">{sortedProducts.length} products</p>

        {/* Products grid — glassmorphism cards */}
        <div className={viewMode === 'grid'
          ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5'
          : 'flex flex-col gap-4'}>
          {sortedProducts.map(product => {
            const discount = product.originalPrice
              ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100) : 0;
            const isWishlisted = wishlist.includes(product.id);
            return (
              <div key={product.id}
                className={`group relative rounded-2xl overflow-hidden transition-all duration-300 hover:-translate-y-1 ${viewMode === 'list' ? 'flex gap-0' : ''}`}
                style={{ background: 'rgba(255,255,255,0.035)', border: '1px solid rgba(255,255,255,0.07)', backdropFilter: 'blur(12px)' }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(234,88,12,0.35)')}
                onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)')}>

                {/* Image */}
                <div className={`relative overflow-hidden ${viewMode === 'list' ? 'w-44 flex-shrink-0' : 'aspect-square'}`}
                  style={{ background: 'rgba(255,255,255,0.04)' }}>
                  {product.image && product.image !== '/placeholder-product.jpg'
                    ? <img src={product.image} alt={product.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                    : <div className="w-full h-full flex items-center justify-center"><Package className="w-16 h-16 text-gray-700" /></div>
                  }
                  {/* Gradient overlay */}
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 60%)' }} />

                  {/* Badges */}
                  <div className="absolute top-3 left-3 flex flex-col gap-1.5">
                    {product.badge && <span className="px-2.5 py-1 rounded-full text-xs font-black shadow-lg" style={{ background: '#ea580c' }}>{product.badge}</span>}
                    {discount >= 10 && <span className="px-2.5 py-1 rounded-full text-xs font-black bg-green-500">−{discount}%</span>}
                    {!product.inStock && <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-gray-800 text-gray-400">Out of Stock</span>}
                  </div>

                  {/* Hover actions */}
                  <div className="absolute top-3 right-3 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0 duration-200">
                    <button onClick={() => toggleWishlist(product.id)}
                      className="w-9 h-9 rounded-xl flex items-center justify-center shadow-lg transition hover:scale-110"
                      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}>
                      <Heart className={`w-4 h-4 ${isWishlisted ? 'fill-red-500 text-red-500' : 'text-white'}`} />
                    </button>
                    <button onClick={() => setShowQuickView(product)}
                      className="w-9 h-9 rounded-xl flex items-center justify-center shadow-lg transition hover:scale-110"
                      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}>
                      <Eye className="w-4 h-4 text-white" />
                    </button>
                  </div>

                  {/* Quick-add overlay on hover */}
                  <div className="absolute bottom-0 left-0 right-0 p-3 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                    <button onClick={() => addToCart(product)} disabled={!product.inStock}
                      className="w-full py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition disabled:opacity-50"
                      style={{ background: '#ea580c' }}>
                      <ShoppingCart className="w-4 h-4" /> Quick Add
                    </button>
                  </div>
                </div>

                {/* Info */}
                <div className="p-4 flex flex-col flex-1">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-medium text-gray-500">{product.category}</span>
                    {product.inStock
                      ? <span className="flex items-center gap-1 text-xs text-green-400"><div className="w-1.5 h-1.5 rounded-full bg-green-400" />In Stock</span>
                      : <span className="text-xs text-gray-600">Out of Stock</span>}
                  </div>

                  <h3 className="font-bold text-white text-sm leading-snug mb-2 line-clamp-2 group-hover:text-orange-300 transition-colors">{product.name}</h3>

                  {viewMode === 'list' && <p className="text-xs text-gray-500 mb-3 line-clamp-2">{product.description}</p>}

                  {/* Rating */}
                  <div className="flex items-center gap-1.5 mb-3">
                    <div className="flex">
                      {[1,2,3,4,5].map(s => (
                        <Star key={s} className={`w-3.5 h-3.5 ${s <= Math.floor(product.rating) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-700'}`} />
                      ))}
                    </div>
                    <span className="text-xs text-gray-500">{product.rating} ({product.reviews})</span>
                  </div>

                  {/* Price row */}
                  <div className="flex items-center justify-between mt-auto">
                    <div>
                      <span className="text-lg font-black text-white">${product.price.toFixed(2)}</span>
                      {product.originalPrice && <span className="text-xs text-gray-600 line-through ml-2">${product.originalPrice.toFixed(2)}</span>}
                    </div>
                    <button onClick={() => addToCart(product)} disabled={!product.inStock}
                      className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm transition hover:scale-110 disabled:opacity-40"
                      style={{ background: '#ea580c' }}>
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Empty */}
        {sortedProducts.length === 0 && (
          <div className="text-center py-24">
            <Package className="w-16 h-16 mx-auto mb-4 text-gray-700" />
            <h3 className="text-xl font-bold mb-2">No products found</h3>
            <p className="text-gray-500 text-sm mb-5">Try adjusting your search or category</p>
            <button onClick={() => { setSelectedCategory('all'); setSearchQuery(''); }} className="px-6 py-2.5 rounded-xl text-sm font-bold" style={{ background: '#ea580c' }}>Clear Filters</button>
          </div>
        )}
      </section>

      {/* ── SOCIAL PROOF ─────────────────────────────────────────────────────── */}
      <section style={{ background: 'rgba(255,255,255,0.02)', borderTop: '1px solid rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-16">
          <div className="text-center mb-10">
            <p className="text-xs font-bold tracking-widest uppercase mb-2" style={{ color: '#ea580c' }}>Reviews</p>
            <h2 className="text-3xl font-black text-white">What Our Customers Say</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {REVIEWS.map((r, i) => (
              <div key={i} className="rounded-2xl p-6" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <div className="flex items-center gap-1 mb-4">
                  {[1,2,3,4,5].map(s => <Star key={s} className="w-4 h-4 fill-yellow-400 text-yellow-400" />)}
                </div>
                <p className="text-sm text-gray-300 leading-relaxed mb-5 italic">"{r.text}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm" style={{ background: '#ea580c' }}>{r.avatar}</div>
                  <div>
                    <p className="text-sm font-bold text-white">{r.name}</p>
                    <p className="text-xs text-gray-500">{r.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── NEWSLETTER ───────────────────────────────────────────────────────── */}
      <section className="max-w-[1440px] mx-auto px-4 sm:px-6 py-16">
        <div className="relative rounded-3xl overflow-hidden px-8 py-14 text-center" style={{ background: 'linear-gradient(135deg, rgba(234,88,12,0.15) 0%, rgba(234,88,12,0.05) 100%)', border: '1px solid rgba(234,88,12,0.2)' }}>
          <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 60% 80% at 50% 50%, rgba(234,88,12,0.1) 0%, transparent 70%)' }} />
          <div className="relative flex flex-col items-center text-center">
            <p className="text-xs font-bold tracking-widest uppercase mb-3" style={{ color: '#ea580c' }}>Stay In The Loop</p>
            <h2 className="text-3xl font-black text-white mb-3">Get Exclusive Deals & New Arrivals</h2>
            <p className="text-gray-400 text-sm mb-8 max-w-md">Join 10,000+ shoppers who get early access to flash sales, new products, and members-only discounts.</p>
            <div className="flex flex-col sm:flex-row gap-3 w-full max-w-md">
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Your email address"
                className="flex-1 px-4 py-3 rounded-xl text-sm text-white placeholder-gray-600 focus:outline-none"
                style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)' }} />
              <button onClick={() => { if (email) { toast.success('You\'re on the list!'); setEmail(''); } }}
                className="px-6 py-3 rounded-xl font-bold text-sm whitespace-nowrap transition hover:scale-105"
                style={{ background: '#ea580c' }}>
                Subscribe
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────────────────────── */}
      <footer style={{ background: '#050505', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-14">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
            <div>
              <img src={companyLogo} alt={companyName} className="w-12 h-12 mb-4 object-contain" />
              <p className="text-sm font-black text-white mb-2">{companyName}</p>
              <p className="text-xs text-gray-600 leading-relaxed mb-4">Your one-stop shop for quality products across every category. Trusted by 10,000+ happy customers.</p>
              <div className="flex gap-3">
                {[Instagram, Facebook, Youtube].map((Icon, i) => (
                  <button key={i} className="w-9 h-9 rounded-xl flex items-center justify-center transition hover:scale-110 text-gray-500 hover:text-white"
                    style={{ background: 'rgba(255,255,255,0.06)' }}>
                    <Icon className="w-4 h-4" />
                  </button>
                ))}
              </div>
            </div>
            {[
              { title: 'Shop', links: ['All Products', 'Electronics', 'Apparel', 'Home & Garden', 'Tools & Hardware', 'Health & Beauty', 'Sports & Outdoors'] },
              { title: 'Company', links: ['About Us', 'Careers', 'Press', 'Blog', 'Affiliates'] },
              { title: 'Support', links: ['FAQ', 'Shipping Policy', 'Returns', 'Track Order', 'Contact Us'] },
            ].map((col, i) => (
              <div key={i}>
                <p className="text-sm font-bold text-white mb-4">{col.title}</p>
                <ul className="space-y-2.5">
                  {col.links.map(link => (
                    <li key={link}><button className="text-xs text-gray-600 hover:text-gray-300 transition">{link}</button></li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="mt-10 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            <p className="text-xs text-gray-700">© 2026 {companyName}. All rights reserved.</p>
            <div className="flex items-center gap-4">
              {[CreditCard, Shield, Lock].map((Icon, i) => (
                <div key={i} className="w-10 h-7 rounded flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.05)' }}>
                  <Icon className="w-4 h-4 text-gray-600" />
                </div>
              ))}
              <span className="text-xs text-gray-700">Secure Payments</span>
            </div>
          </div>
        </div>
      </footer>

      {/* ── CART SIDEBAR ─────────────────────────────────────────────────────── */}
      {showCart && (
        <div className="fixed inset-0 z-50 flex items-start justify-end">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowCart(false)} />
          <div className="relative w-full max-w-md h-full overflow-y-auto flex flex-col" style={{ background: '#0d0d0d', borderLeft: '1px solid rgba(255,255,255,0.07)' }}>
            <div className="sticky top-0 z-10 px-6 py-5" style={{ background: '#0d0d0d', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-black text-white">Your Cart</h3>
                  <p className="text-xs text-gray-500">{cartCount} item{cartCount !== 1 ? 's' : ''}</p>
                </div>
                <button onClick={() => setShowCart(false)} className="p-2 rounded-xl hover:bg-white/5 text-gray-400 hover:text-white transition"><X className="w-5 h-5" /></button>
              </div>
              {cartTotal > 0 && cartTotal < 500 && (
                <div className="mt-3 rounded-xl p-3" style={{ background: 'rgba(234,88,12,0.1)', border: '1px solid rgba(234,88,12,0.2)' }}>
                  <p className="text-xs text-orange-400">Add <span className="font-bold">${(500 - cartTotal).toFixed(2)}</span> more for free shipping!</p>
                  <div className="mt-2 h-1.5 rounded-full overflow-hidden bg-white/10">
                    <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, (cartTotal / 500) * 100)}%`, background: '#ea580c' }} />
                  </div>
                </div>
              )}
            </div>

            <div className="flex-1 p-6 space-y-4">
              {cart.length === 0 ? (
                <div className="text-center py-20">
                  <ShoppingCart className="w-14 h-14 mx-auto mb-4 text-gray-700" />
                  <p className="text-gray-500 font-medium">Your cart is empty</p>
                  <button onClick={() => setShowCart(false)} className="mt-4 px-6 py-2.5 rounded-xl text-sm font-bold" style={{ background: '#ea580c' }}>Continue Shopping</button>
                </div>
              ) : cart.map(item => (
                <div key={item.id} className="flex gap-4 p-4 rounded-2xl" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div className="w-16 h-16 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                    {item.image && item.image !== '/placeholder-product.jpg'
                      ? <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                      : <Package className="w-8 h-8 text-gray-700" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-white line-clamp-1">{item.name}</p>
                    <p className="text-xs text-gray-500 mb-2">${item.price.toFixed(2)}</p>
                    <div className="flex items-center gap-2">
                      <button onClick={() => setCart(item.quantity > 1 ? cart.map(i => i.id === item.id ? { ...i, quantity: i.quantity - 1 } : i) : cart.filter(i => i.id !== item.id))}
                        className="w-7 h-7 rounded-lg flex items-center justify-center transition hover:bg-white/10" style={{ background: 'rgba(255,255,255,0.06)' }}>
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="text-sm font-bold text-white w-5 text-center">{item.quantity}</span>
                      <button onClick={() => setCart(cart.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i))}
                        className="w-7 h-7 rounded-lg flex items-center justify-center transition hover:bg-white/10" style={{ background: 'rgba(255,255,255,0.06)' }}>
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-black text-white text-sm">${(item.price * item.quantity).toFixed(2)}</p>
                    <button onClick={() => setCart(cart.filter(i => i.id !== item.id))} className="text-xs text-gray-600 hover:text-red-400 transition mt-2">Remove</button>
                  </div>
                </div>
              ))}
            </div>

            {cart.length > 0 && (
              <div className="sticky bottom-0 p-6" style={{ background: '#0d0d0d', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
                <div className="space-y-2 mb-5">
                  <div className="flex justify-between text-sm text-gray-500"><span>Subtotal</span><span className="text-white font-semibold">${cartTotal.toFixed(2)}</span></div>
                  <div className="flex justify-between text-sm text-gray-500">
                    <span>Shipping</span>
                    <span className={cartTotal >= 500 ? 'text-green-400 font-semibold' : 'text-white font-semibold'}>
                      {cartTotal >= 500 ? '✓ FREE' : '$25.00'}
                    </span>
                  </div>
                  <div className="flex justify-between text-base font-black text-white pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
                    <span>Total</span>
                    <span style={{ color: '#ea580c' }}>${(cartTotal >= 500 ? cartTotal : cartTotal + 25).toFixed(2)}</span>
                  </div>
                </div>
                <button className="w-full py-4 rounded-2xl font-black text-base transition hover:scale-105 flex items-center justify-center gap-2" style={{ background: '#ea580c' }}>
                  <Lock className="w-4 h-4" /> Secure Checkout
                </button>
                <button onClick={() => setShowCart(false)} className="w-full mt-2 py-3 text-sm text-gray-500 hover:text-gray-300 transition">Continue Shopping</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── QUICK VIEW MODAL ─────────────────────────────────────────────────── */}
      {showQuickView && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={() => setShowQuickView(null)} />
          <div className="relative w-full max-w-3xl rounded-3xl overflow-hidden" style={{ background: '#0f0f0f', border: '1px solid rgba(255,255,255,0.09)' }}>
            <button onClick={() => setShowQuickView(null)} className="absolute top-4 right-4 z-10 w-9 h-9 rounded-xl flex items-center justify-center text-gray-400 hover:text-white transition" style={{ background: 'rgba(255,255,255,0.07)' }}>
              <X className="w-5 h-5" />
            </button>
            <div className="flex flex-col md:flex-row">
              <div className="md:w-80 aspect-square md:aspect-auto flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(255,255,255,0.04)' }}>
                {showQuickView.image && showQuickView.image !== '/placeholder-product.jpg'
                  ? <img src={showQuickView.image} alt={showQuickView.name} className="w-full h-full object-cover" />
                  : <Package className="w-28 h-28 text-gray-700" />}
              </div>
              <div className="flex-1 p-8">
                <div className="flex items-center gap-2 mb-2">
                  {showQuickView.badge && <span className="px-3 py-1 rounded-full text-xs font-black" style={{ background: '#ea580c' }}>{showQuickView.badge}</span>}
                  <span className="text-xs text-gray-500">{showQuickView.category}</span>
                </div>
                <h2 className="text-2xl font-black text-white mb-2">{showQuickView.name}</h2>
                <p className="text-sm text-gray-400 mb-4 leading-relaxed">{showQuickView.description}</p>
                <div className="flex items-center gap-2 mb-6">
                  <div className="flex">{[1,2,3,4,5].map(s => <Star key={s} className={`w-4 h-4 ${s <= Math.floor(showQuickView.rating) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-700'}`} />)}</div>
                  <span className="text-xs text-gray-500">{showQuickView.rating} ({showQuickView.reviews} reviews)</span>
                </div>
                <div className="flex items-end gap-3 mb-6">
                  <span className="text-4xl font-black text-white">${showQuickView.price.toFixed(2)}</span>
                  {showQuickView.originalPrice && <span className="text-lg text-gray-600 line-through pb-1">${showQuickView.originalPrice.toFixed(2)}</span>}
                </div>
                {showQuickView.colors && showQuickView.colors.length > 0 && (
                  <div className="mb-4">
                    <p className="text-xs font-semibold text-gray-400 mb-2">Color</p>
                    <div className="flex flex-wrap gap-2">{showQuickView.colors.map(c => <button key={c} className="px-3 py-1.5 rounded-lg text-xs font-medium text-gray-300 hover:text-white transition" style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}>{c}</button>)}</div>
                  </div>
                )}
                {showQuickView.sizes && showQuickView.sizes.length > 0 && (
                  <div className="mb-6">
                    <p className="text-xs font-semibold text-gray-400 mb-2">Size</p>
                    <div className="flex flex-wrap gap-2">{showQuickView.sizes.map(s => <button key={s} className="px-3 py-1.5 rounded-lg text-xs font-medium text-gray-300 hover:text-white transition" style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}>{s}</button>)}</div>
                  </div>
                )}
                <button onClick={() => { addToCart(showQuickView); setShowQuickView(null); }}
                  className="w-full py-4 rounded-2xl font-black text-base flex items-center justify-center gap-2 transition hover:scale-105" style={{ background: '#ea580c' }}>
                  <ShoppingCart className="w-5 h-5" /> Add to Cart
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
