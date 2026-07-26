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
import { getLoyaltyAccount, awardPoints } from './LoyaltyProgram';
import { ActiveFlashBanner } from './FlashSaleManager';
import SocialProofWidget from '../components/SocialProofWidget';
import StoreReviews from '../components/StoreReviews';

const SERVER = `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6`;

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
  const [showLeadCapture, setShowLeadCapture] = useState(false);
  const [leadEmail, setLeadEmail] = useState('');
  const [leadName, setLeadName] = useState('');
  const [leadSubmitted, setLeadSubmitted] = useState(false);
  const [dropshipProducts, setDropshipProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [showReviewRequest, setShowReviewRequest] = useState(false);
  const [reviewStep, setReviewStep] = useState<'rate' | 'thanks'>('rate');

  // ── Checkout ──────────────────────────────────────────────────────────────
  const [showCheckout, setShowCheckout] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState<'info' | 'processing' | 'done'>('info');
  const [checkoutForm, setCheckoutForm] = useState({ name: '', email: '', phone: '', address: '', city: '', zip: '', giftCardCode: '' });
  const [checkoutError, setCheckoutError] = useState('');
  const [giftCardBalance, setGiftCardBalance] = useState<number | null>(null);
  const [checkingGiftCard, setCheckingGiftCard] = useState(false);

  // Stripe only creates the order after the payment session is verified by the
  // server. This also makes a browser refresh/retry safe and idempotent.
  useEffect(() => {
    const checkoutId = new URLSearchParams(window.location.search).get('checkout_id');
    const sessionId = new URLSearchParams(window.location.search).get('session_id');
    if (!checkoutId || !sessionId) return;
    let cancelled = false;
    const complete = async () => {
      try {
        setShowCheckout(true); setCheckoutStep('processing');
        const response = await fetch(`${SERVER}/store/checkouts/${encodeURIComponent(checkoutId)}/complete`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${publicAnonKey}` }, body: JSON.stringify({ sessionId }) });
        const data = await response.json().catch(() => ({}));
        if (!response.ok || !data.success) throw new Error(data.error || 'Payment confirmation is still pending.');
        if (cancelled) return;
        setCart([]); setShowCart(false); setShowCheckout(false); setCheckoutStep('info');
        window.history.replaceState({}, '', window.location.pathname);
        toast.success(data.duplicate ? 'Your order is already confirmed.' : `Order ${data.order?.id || ''} confirmed! We will email your receipt.`);
      } catch (error: any) {
        if (!cancelled) { setCheckoutError(error.message || 'We could not confirm payment yet.'); setCheckoutStep('info'); toast.error(error.message || 'Payment confirmation is still pending.'); }
      }
    };
    void complete();
    return () => { cancelled = true; };
  }, []);

  // ── AI Chat ──────────────────────────────────────────────────────────────
  const [showChat, setShowChat] = useState(false);
  const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'bot'; text: string }[]>([
    { role: 'bot', text: "Hey! 👋 I'm Phoenix, your Black Phoenix shopping assistant. Ask me anything — products, shipping, deals, or help finding the right item!" },
  ]);
  const [chatInput, setChatInput] = useState('');
  const [chatTyping, setChatTyping] = useState(false);
  const [chatUnread, setChatUnread] = useState(1);

  // Fetch live catalog products. Shoppers are anonymous, so we read the PUBLIC
  // /products endpoint (curated live catalog: manually added items + dropshipper
  // items imported "to live"). The admin-only /dropshipper/inventory route can't
  // be read with the anon key, which is why the store previously showed only the
  // hardcoded fallback.
  useEffect(() => {
    async function loadDropshipProducts() {
      setLoadingProducts(true);
      try {
        const res = await fetch(`${SERVER}/products?isActive=true`, {
          headers: { Authorization: `Bearer ${publicAnonKey}`, apikey: publicAnonKey },
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

  // Lead capture — show popup after 30s if not already submitted
  useEffect(() => {
    const already = localStorage.getItem('bp_lead_captured');
    if (already) return;
    const timer = setTimeout(() => setShowLeadCapture(true), 30000);
    return () => clearTimeout(timer);
  }, []);

  // Abandoned cart recovery — fire after 10 min of cart inactivity
  useEffect(() => {
    if (cart.length === 0) return;
    const cartValue = cart.reduce((s, i) => s + i.price * i.quantity, 0);
    const cartItems = cart.map(i => i.name).join(', ');
    const recoveredKey = 'bp_cart_recovered';
    const alreadyRecovered = localStorage.getItem(recoveredKey);
    if (alreadyRecovered) return;

    const timer = setTimeout(async () => {
      // Only fire if we have an email (from lead capture or user session)
      const capturedEmail = localStorage.getItem('bp_lead_email') || user?.email || '';
      const capturedName = localStorage.getItem('bp_lead_name') || '';
      if (!capturedEmail) return;
      try {
        await fetch(`${SERVER}/leads/capture`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${publicAnonKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: capturedEmail,
            name: capturedName,
            source: 'abandoned_cart',
            page: window.location.pathname,
            cartValue,
            metadata: { cartItems, trigger: 'abandoned_cart' },
          }),
        });
        // Auto-send recovery email
        await fetch(`${SERVER}/leads/send-email`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${publicAnonKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: capturedEmail,
            name: capturedName || 'there',
            emailType: 'cart_abandon',
            metadata: { cartItems, cartValue: cartValue.toFixed(2) },
          }),
        });
        localStorage.setItem(recoveredKey, '1');
      } catch { /* silent */ }
    }, 10 * 60 * 1000); // 10 minutes

    return () => clearTimeout(timer);
  }, [cart, user]);

  async function submitLead(source = 'store_popup') {
    if (!leadEmail) return;
    try {
      await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6/leads/capture`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${publicAnonKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: leadEmail, name: leadName, source,
          page: window.location.pathname,
          cartValue: cart.reduce((s, i) => s + i.price * i.quantity, 0),
          productsViewed: allProducts.length,
        }),
      });
      localStorage.setItem('bp_lead_captured', '1');
      localStorage.setItem('bp_lead_email', leadEmail);
      if (leadName) localStorage.setItem('bp_lead_name', leadName);
      setLeadSubmitted(true);
      setTimeout(() => setShowLeadCapture(false), 2500);
    } catch { setShowLeadCapture(false); }
  }

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

  const [zipCode, setZipCode] = useState('');
  const [taxState, setTaxState] = useState('');
  const [taxRate, setTaxRate] = useState(0);

  // US state sales tax rates (2024 average combined rates)
  const STATE_TAX_RATES: Record<string, { rate: number; name: string }> = {
    AL: { rate: 0.09, name: 'Alabama' }, AK: { rate: 0.0, name: 'Alaska' },
    AZ: { rate: 0.084, name: 'Arizona' }, AR: { rate: 0.094, name: 'Arkansas' },
    CA: { rate: 0.0885, name: 'California' }, CO: { rate: 0.077, name: 'Colorado' },
    CT: { rate: 0.0635, name: 'Connecticut' }, DE: { rate: 0.0, name: 'Delaware' },
    FL: { rate: 0.07, name: 'Florida' }, GA: { rate: 0.073, name: 'Georgia' },
    HI: { rate: 0.044, name: 'Hawaii' }, ID: { rate: 0.06, name: 'Idaho' },
    IL: { rate: 0.087, name: 'Illinois' }, IN: { rate: 0.07, name: 'Indiana' },
    IA: { rate: 0.069, name: 'Iowa' }, KS: { rate: 0.087, name: 'Kansas' },
    KY: { rate: 0.06, name: 'Kentucky' }, LA: { rate: 0.0952, name: 'Louisiana' },
    ME: { rate: 0.055, name: 'Maine' }, MD: { rate: 0.06, name: 'Maryland' },
    MA: { rate: 0.0625, name: 'Massachusetts' }, MI: { rate: 0.06, name: 'Michigan' },
    MN: { rate: 0.0749, name: 'Minnesota' }, MS: { rate: 0.0707, name: 'Mississippi' },
    MO: { rate: 0.082, name: 'Missouri' }, MT: { rate: 0.0, name: 'Montana' },
    NE: { rate: 0.069, name: 'Nebraska' }, NV: { rate: 0.082, name: 'Nevada' },
    NH: { rate: 0.0, name: 'New Hampshire' }, NJ: { rate: 0.066, name: 'New Jersey' },
    NM: { rate: 0.079, name: 'New Mexico' }, NY: { rate: 0.0852, name: 'New York' },
    NC: { rate: 0.0699, name: 'North Carolina' }, ND: { rate: 0.069, name: 'North Dakota' },
    OH: { rate: 0.072, name: 'Ohio' }, OK: { rate: 0.089, name: 'Oklahoma' },
    OR: { rate: 0.0, name: 'Oregon' }, PA: { rate: 0.068, name: 'Pennsylvania' },
    RI: { rate: 0.07, name: 'Rhode Island' }, SC: { rate: 0.075, name: 'South Carolina' },
    SD: { rate: 0.064, name: 'South Dakota' }, TN: { rate: 0.0955, name: 'Tennessee' },
    TX: { rate: 0.0825, name: 'Texas' }, UT: { rate: 0.0719, name: 'Utah' },
    VT: { rate: 0.0624, name: 'Vermont' }, VA: { rate: 0.057, name: 'Virginia' },
    WA: { rate: 0.093, name: 'Washington' }, WV: { rate: 0.065, name: 'West Virginia' },
    WI: { rate: 0.054, name: 'Wisconsin' }, WY: { rate: 0.054, name: 'Wyoming' },
    DC: { rate: 0.06, name: 'Washington D.C.' },
  };

  // ZIP prefix → state code (first 3 digits covers most common ranges)
  function zipToState(zip: string): string {
    const z = parseInt(zip.slice(0, 3), 10);
    if (z >= 988 && z <= 994) return 'WA'; if (z >= 970 && z <= 979) return 'OR';
    if (z >= 900 && z <= 961) return 'CA'; if (z >= 967 && z <= 968) return 'HI';
    if (z >= 995 && z <= 999) return 'AK'; if (z >= 800 && z <= 816) return 'CO';
    if (z >= 820 && z <= 831) return 'WY'; if (z >= 832 && z <= 838) return 'ID';
    if (z >= 840 && z <= 847) return 'UT'; if (z >= 850 && z <= 865) return 'AZ';
    if (z >= 870 && z <= 884) return 'NM'; if (z >= 885 && z <= 885) return 'TX';
    if (z >= 750 && z <= 799) return 'TX'; if (z >= 700 && z <= 714) return 'LA';
    if (z >= 716 && z <= 729) return 'AR'; if (z >= 386 && z <= 397) return 'MS';
    if (z >= 350 && z <= 369) return 'AL'; if (z >= 370 && z <= 385) return 'TN';
    if (z >= 400 && z <= 427) return 'KY'; if (z >= 430 && z <= 458) return 'OH';
    if (z >= 460 && z <= 479) return 'IN'; if (z >= 480 && z <= 499) return 'MI';
    if (z >= 530 && z <= 549) return 'WI'; if (z >= 550 && z <= 567) return 'MN';
    if (z >= 500 && z <= 528) return 'IA'; if (z >= 580 && z <= 588) return 'ND';
    if (z >= 570 && z <= 577) return 'SD'; if (z >= 680 && z <= 693) return 'NE';
    if (z >= 660 && z <= 679) return 'KS'; if (z >= 630 && z <= 658) return 'MO';
    if (z >= 600 && z <= 629) return 'IL'; if (z >= 730 && z <= 749) return 'OK';
    if (z >= 590 && z <= 599) return 'MT'; if (z >= 820 && z <= 822) return 'WY';
    if (z >= 300 && z <= 319) return 'GA'; if (z >= 320 && z <= 349) return 'FL';
    if (z >= 270 && z <= 289) return 'NC'; if (z >= 290 && z <= 299) return 'SC';
    if (z >= 240 && z <= 246) return 'VA'; if (z >= 247 && z <= 268) return 'VA';
    if (z >= 200 && z <= 205) return 'DC'; if (z >= 206 && z <= 212) return 'MD';
    if (z >= 214 && z <= 219) return 'MD'; if (z >= 220 && z <= 231) return 'VA';
    if (z >= 232 && z <= 238) return 'VA'; if (z >= 239 && z <= 239) return 'VA';
    if (z >= 250 && z <= 268) return 'WV'; if (z >= 150 && z <= 196) return 'PA';
    if (z >= 197 && z <= 199) return 'DE'; if (z >= 100 && z <= 149) return 'NY';
    if (z >= 70 && z <= 89) return 'NJ'; if (z >= 10 && z <= 27) return 'MA';
    if (z >= 28 && z <= 29) return 'RI'; if (z >= 30 && z <= 49) return 'NH';
    if (z >= 50 && z <= 69) return 'VT'; if (z >= 3 && z <= 4) return 'ME';
    if (z >= 5 && z <= 5) return 'ME'; if (z >= 6 && z <= 6) return 'CT';
    if (z >= 600 && z <= 601) return 'PR';
    return '';
  }

  function applyZip(zip: string) {
    if (zip.length === 5) {
      const state = zipToState(zip);
      if (state && STATE_TAX_RATES[state]) {
        setTaxState(state);
        setTaxRate(STATE_TAX_RATES[state].rate);
      } else {
        setTaxState('');
        setTaxRate(0);
      }
    } else {
      setTaxState('');
      setTaxRate(0);
    }
  }

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const checkoutShipping = cartTotal >= 500 ? 0 : 25;
  const checkoutTax = Number((cartTotal * taxRate).toFixed(2));
  const checkoutTotal = Number((cartTotal + checkoutShipping + checkoutTax).toFixed(2));
  const giftCardCredit = Math.min(giftCardBalance || 0, checkoutTotal);
  const amountDueAfterGiftCard = Number(Math.max(0, checkoutTotal - giftCardCredit).toFixed(2));

  const applyGiftCard = async () => {
    const code = checkoutForm.giftCardCode.trim();
    if (!code) { setCheckoutError('Enter a gift card code first.'); return; }
    setCheckingGiftCard(true); setCheckoutError('');
    try {
      const response = await fetch(`${SERVER}/gift-cards/${encodeURIComponent(code)}`, { headers: { apikey: publicAnonKey } });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data?.success) throw new Error(data?.error || 'Gift card could not be verified.');
      const balance = Number(data.card?.balance || 0);
      if (balance <= 0) throw new Error('This gift card has no available balance.');
      setGiftCardBalance(balance);
      toast.success(`Gift card applied — up to $${Math.min(balance, checkoutTotal).toFixed(2)} will be used.`);
    } catch (error: any) {
      setGiftCardBalance(null);
      setCheckoutError(error.message || 'Gift card could not be verified.');
    } finally { setCheckingGiftCard(false); }
  };

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

  const BUNDLES = [
    {
      id: 'bundle-home',
      label: 'Home Essentials Kit',
      badge: 'SAVE 22%',
      emoji: '🏠',
      tagline: 'Everything you need to upgrade your space',
      productIds: ['p3', 'p9', 'p10'],
      originalTotal: 94.97,
      bundlePrice: 73.99,
    },
    {
      id: 'bundle-outdoors',
      label: 'Outdoor Ready Pack',
      badge: 'SAVE 18%',
      emoji: '🌿',
      tagline: 'Stay hydrated, protected, and active',
      productIds: ['p2', 'p5', 'p7'],
      originalTotal: 89.97,
      bundlePrice: 73.99,
    },
    {
      id: 'bundle-tech',
      label: 'Tech Starter Bundle',
      badge: 'SAVE 25%',
      emoji: '⚡',
      tagline: 'Premium gear for work and play',
      productIds: ['p1', 'p6', 'p8'],
      originalTotal: 139.97,
      bundlePrice: 104.99,
    },
  ];

  const REVIEWS = [
    { name: 'Marcus T.', role: 'Verified Buyer', rating: 5, text: "Fast shipping, great prices, and the product quality is exactly as described. My go-to shop for everything.", avatar: 'M' },
    { name: 'Sarah K.', role: 'Verified Buyer', rating: 5, text: "Love the variety here. Found everything from kitchen gadgets to workout gear in one place. Will definitely be back!", avatar: 'S' },
    { name: 'Jamie R.', role: 'Verified Buyer', rating: 5, text: "The headphones I ordered exceeded my expectations. Packaging was great and arrived two days early.", avatar: 'J' },
  ];

  const featuredProducts = allProducts.filter(p => p.featured || p.badge).slice(0, 4);
  const [shopView, setShopView] = useState<'home' | 'hot' | 'top-sellers' | 'sports' | 'clothing' | 'beauty' | 'construction' | 'electronics' | 'all'>('home');

  // Derive products for the current shopView
  const getViewProducts = () => {
    const q = searchQuery.toLowerCase();
    let base: typeof allProducts = [];
    if (shopView === 'hot') {
      base = [...allProducts].filter(p => p.badge || p.featured).sort((a, b) => b.rating - a.rating);
    } else if (shopView === 'top-sellers') {
      base = [...allProducts].sort((a, b) => b.reviews - a.reviews);
    } else if (shopView === 'sports') {
      base = allProducts.filter(p => ['sports', 'sports & outdoors', 'fitness'].includes((p.category || '').toLowerCase()));
    } else if (shopView === 'clothing') {
      base = allProducts.filter(p => ['apparel', 'clothing', 'hats'].includes((p.category || '').toLowerCase()));
    } else if (shopView === 'beauty') {
      base = allProducts.filter(p => ['health & beauty', 'beauty', 'personal care'].includes((p.category || '').toLowerCase()));
    } else if (shopView === 'construction') {
      base = allProducts.filter(p => ['tools & hardware', 'construction', 'automotive'].includes((p.category || '').toLowerCase()));
    } else if (shopView === 'electronics') {
      base = allProducts.filter(p => (p.category || '').toLowerCase() === 'electronics');
    } else {
      base = [...allProducts].sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));
    }
    if (q) base = base.filter(p => p.name.toLowerCase().includes(q) || (p.category || '').toLowerCase().includes(q));
    return base;
  };
  const viewProducts = getViewProducts();

  const viewTitles: Record<string, string> = {
    hot: '🔥 Hot Items',
    'top-sellers': '⭐ Top Sellers',
    sports: '⚽ Sports Equipment',
    clothing: '👕 Clothing & Hats',
    beauty: '💄 Beauty Supplies',
    construction: '🔨 Construction',
    electronics: '⚡ Electronics',
    all: '🛍️ All Products',
  };

  // Inline product card renderer
  const ProductCard = ({ product }: { product: typeof allProducts[0] }) => {
    const isWishlisted = wishlist.includes(product.id);
    return (
      <div
        className="group relative rounded-2xl overflow-hidden transition-all duration-300 hover:-translate-y-1"
        style={{ background: 'rgba(255,255,255,0.035)', border: '1px solid rgba(255,255,255,0.07)' }}
        onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(234,88,12,0.35)')}
        onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)')}
      >
        {/* Image */}
        <div className="aspect-square relative overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)' }}>
          {product.image && product.image !== '/placeholder-product.jpg'
            ? <img src={product.image} alt={product.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
            : <div className="w-full h-full flex items-center justify-center"><Package className="w-16 h-16 text-gray-700" /></div>
          }
          {product.badge && (
            <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full text-xs font-black shadow-lg" style={{ background: '#ea580c' }}>
              {product.badge}
            </span>
          )}
          {/* Wishlist button */}
          <button
            onClick={() => toggleWishlist(product.id)}
            className="absolute top-3 right-3 w-9 h-9 rounded-xl flex items-center justify-center shadow-lg transition opacity-0 group-hover:opacity-100"
            style={{ background: 'rgba(0,0,0,0.7)' }}
          >
            <Heart className={`w-4 h-4 ${isWishlisted ? 'fill-red-500 text-red-500' : 'text-white'}`} />
          </button>
        </div>
        {/* Info */}
        <div className="p-4 flex flex-col gap-2">
          <h3 className="font-bold text-white text-sm leading-snug line-clamp-2">{product.name}</h3>
          <div className="flex items-center gap-1">
            {[1,2,3,4,5].map(s => (
              <Star key={s} className={`w-3 h-3 ${s <= Math.floor(product.rating) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-700'}`} />
            ))}
            <span className="text-xs text-gray-500 ml-1">({product.reviews})</span>
          </div>
          <div className="flex items-center justify-between mt-1">
            <div>
              <span className="font-black text-orange-400">${product.price.toFixed(2)}</span>
              {product.originalPrice && <span className="text-xs text-gray-600 line-through ml-1">${product.originalPrice.toFixed(2)}</span>}
            </div>
            <button
              onClick={() => addToCart(product)}
              disabled={!product.inStock}
              className="px-3 py-1.5 rounded-xl text-xs font-bold transition hover:scale-105 disabled:opacity-40"
              style={{ background: '#ea580c', minHeight: 32 }}
            >
              Add
            </button>
          </div>
        </div>
      </div>
    );
  };

  async function sendChatMessage() {
    const text = chatInput.trim();
    if (!text) return;
    setChatInput('');
    setChatMessages(prev => [...prev, { role: 'user', text }]);
    setChatTyping(true);

    // Simple rule-based AI that knows the store
    const q = text.toLowerCase();
    await new Promise(r => setTimeout(r, 900 + Math.random() * 600));

    let reply = '';
    if (q.match(/ship|deliver|how long|arrival/)) {
      reply = "We ship within 1-2 business days! Orders $500+ get FREE shipping. Standard delivery is 3-7 days. Need it faster? Reach us at (your phone) and we'll do our best! 🚚";
    } else if (q.match(/return|refund|exchange/)) {
      reply = "We have a hassle-free 30-day return policy. If you're not happy, we'll make it right — that's the Black Phoenix promise. Just reply to your order email and we'll handle it! 💛";
    } else if (q.match(/discount|coupon|promo|deal|sale|off/)) {
      reply = "Use code **BPBUILDS** for 10% off your order! 🔥 Also check out our Bundle & Save section for up to 25% off. Local neighbor? Grab 15% off at theblackphoenixcompany.com/local";
    } else if (q.match(/reward|loyalty|points|phoenix reward/)) {
      reply = "We have a Phoenix Rewards program! Earn points on every purchase — Bronze, Silver, Gold, and Phoenix tiers. Join free at theblackphoenixcompany.com/loyalty 🏆";
    } else if (q.match(/headphone|wireless|audio|earbuds/)) {
      reply = "Our Wireless Noise-Cancelling Headphones are a bestseller at $79.99 (was $129.99)! 30hr battery, active noise cancellation, foldable. Customers rate them 4.9/5 ⭐";
    } else if (q.match(/water bottle|bottle|hydrat/)) {
      reply = "The Stainless Steel Water Bottle (32oz) is TOP RATED at $24.99! Double-wall vacuum insulated, keeps drinks cold 24hrs / hot 12hrs. Over 5,000 reviews! 💧";
    } else if (q.match(/contact|call|email|phone|reach/)) {
      reply = "You can reach us at hello@theblackphoenixcompany.com or visit theblackphoenixcompany.com. We're a family-owned business and personally respond to every message! 🧡";
    } else if (q.match(/bundle|kit|combo|pack/)) {
      reply = "Check out our Bundle & Save section! We have Home Essentials (save 22%), Outdoor Ready Pack (save 18%), and Tech Starter Bundle (save 25%). All handpicked deals! 🎁";
    } else if (q.match(/family|owner|who are you|about/)) {
      reply = "Black Phoenix Company is a family-owned and operated business. We're real people who stand behind every product we sell. When you shop with us, you're supporting a family — not a warehouse. 🧡";
    } else if (q.match(/track|order status|where.*order/)) {
      reply = "To track your order, check the confirmation email we sent you — it has a tracking link. Questions? Email hello@theblackphoenixcompany.com with your order number!";
    } else {
      reply = "Great question! I want to make sure I give you the right answer. For anything specific, you can also email us at hello@theblackphoenixcompany.com — we reply fast! Is there anything else I can help with? 😊";
    }

    setChatTyping(false);
    setChatMessages(prev => [...prev, { role: 'bot', text: reply }]);
    if (!showChat) setChatUnread(prev => prev + 1);
  }

  return (
    <div className="min-h-screen text-white" style={{ background: '#080808' }}>

      {/* ── STICKY HEADER ──────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b" style={{ background: 'rgba(8,8,8,0.97)', backdropFilter: 'blur(20px)', borderColor: 'rgba(255,255,255,0.06)' }}>
        {/* Flash sale banner — shows when Eric has an active sale */}
        <ActiveFlashBanner />
        {/* Announcement bar */}
        <div className="py-2 text-center text-xs font-semibold tracking-widest uppercase" style={{ background: '#ea580c', color: '#fff' }}>
          🔥 Free Shipping $500+ · Code <span className="underline">BPBUILDS</span> saves 10%
        </div>

        <div className="max-w-screen-xl mx-auto px-4">
          <div className="flex items-center gap-3 h-16">
            {/* Logo */}
            <button className="flex items-center gap-2 flex-shrink-0" onClick={() => setShopView('home')}>
              <img src={companyLogo} alt={companyName} className="h-12 w-auto object-contain" style={{ maxWidth: 120 }} />
            </button>

            {/* Search — hidden on mobile, full width on md+ */}
            <div className="hidden md:flex flex-1 relative mx-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                placeholder="Search products…"
                value={searchQuery}
                onChange={e => { setSearchQuery(e.target.value); if (shopView === 'home' && e.target.value) setShopView('all'); }}
                className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border text-white placeholder-gray-600 focus:outline-none transition"
                style={{ background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.08)' }}
              />
            </div>

            <div className="flex items-center gap-2 ml-auto">
              {/* Mobile search icon */}
              <button className="md:hidden p-2 rounded-xl hover:bg-white/5 transition text-gray-400" onClick={() => setShopView(shopView === 'home' ? 'all' : shopView)}>
                <Search className="w-5 h-5" />
              </button>
              {/* Loyalty points badge */}
              {user?.email && (() => {
                const acct = getLoyaltyAccount(user.email!);
                if (!acct) return null;
                return (
                  <a href="/loyalty" className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition hover:brightness-110"
                    style={{ background: 'rgba(234,88,12,0.12)', border: '1px solid rgba(234,88,12,0.25)' }}>
                    <span className="text-sm">🔥</span>
                    <span className="text-xs font-black" style={{ color: '#fb923c' }}>{acct.points.toLocaleString()} pts</span>
                  </a>
                );
              })()}
              {/* Wishlist */}
              <button className="relative p-2 rounded-xl hover:bg-white/5 transition">
                <Heart className="w-5 h-5 text-gray-400" />
                {wishlist.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-xs font-bold flex items-center justify-center">{wishlist.length}</span>
                )}
              </button>
              {/* Cart */}
              <button
                onClick={() => setShowCart(true)}
                className="relative flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm transition"
                style={{ background: '#ea580c', minHeight: 44 }}
              >
                <ShoppingCart className="w-4 h-4" />
                <span className="hidden sm:inline">Cart</span>
                {cartCount > 0 && (
                  <span className="bg-white text-orange-600 rounded-full w-5 h-5 text-xs font-black flex items-center justify-center">{cartCount}</span>
                )}
              </button>
            </div>
          </div>

          {/* Mobile search bar shown below header row */}
          <div className="md:hidden pb-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                placeholder="Search products…"
                value={searchQuery}
                onChange={e => { setSearchQuery(e.target.value); if (shopView === 'home' && e.target.value) setShopView('all'); }}
                className="w-full pl-9 pr-3 py-2.5 text-sm rounded-xl text-white placeholder-gray-600 focus:outline-none"
                style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.08)' }}
              />
            </div>
          </div>
        </div>
      </header>

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* HOME VIEW                                                              */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {shopView === 'home' && (
        <>
          {/* ── HERO — BOLD STATEMENT ─────────────────────────────────────────── */}
          <section className="relative overflow-hidden" style={{ background: '#080808', minHeight: 'min(72vw, 520px)' }}>
            {/* Diagonal grid */}
            <div className="absolute inset-0 pointer-events-none" style={{
              backgroundImage: 'linear-gradient(rgba(234,88,12,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(234,88,12,0.05) 1px, transparent 1px)',
              backgroundSize: '48px 48px'
            }} />
            {/* Large glow behind logo */}
            <div className="absolute inset-0 pointer-events-none" style={{
              background: 'radial-gradient(ellipse 70% 60% at 50% 40%, rgba(234,88,12,0.13) 0%, transparent 70%)'
            }} />
            {/* Bottom fade */}
            <div className="absolute bottom-0 left-0 right-0 h-32 pointer-events-none" style={{
              background: 'linear-gradient(to bottom, transparent, #080808)'
            }} />

            <div className="relative max-w-screen-xl mx-auto px-4 pt-10 pb-16 flex flex-col items-center text-center">
              {/* Family badge */}
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-6"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}>
                <span className="text-sm">🏠</span>
                <span className="text-xs font-bold tracking-widest uppercase text-gray-400">Family Owned &amp; Operated</span>
              </div>

              {/* Big logo — center stage */}
              <div className="mb-6 relative">
                <div className="absolute inset-0 rounded-full blur-3xl" style={{ background: 'rgba(234,88,12,0.25)', transform: 'scale(1.4)' }} />
                <img
                  src={companyLogo}
                  alt={companyName}
                  className="relative"
                  style={{ height: 'clamp(80px, 18vw, 140px)', width: 'auto', objectFit: 'contain', filter: 'drop-shadow(0 0 32px rgba(234,88,12,0.5))' }}
                />
              </div>

              {/* Headline */}
              <h1 className="font-black leading-[0.95] tracking-tight mb-3" style={{ fontSize: 'clamp(2.4rem, 10vw, 5.5rem)' }}>
                <span className="text-white">Built for the</span><br />
                <span style={{ background: 'linear-gradient(90deg, #ea580c 0%, #fb923c 50%, #f97316 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Every Day</span>
              </h1>
              <p className="text-gray-400 mb-8 max-w-sm" style={{ fontSize: 'clamp(0.85rem, 3vw, 1rem)', lineHeight: 1.6 }}>
                Sports · Clothing · Beauty · Construction · Electronics.<br />
                Everything your family needs, from ours to yours.
              </p>

              {/* CTAs */}
              <div className="flex gap-3 flex-wrap justify-center">
                <button
                  onClick={() => setShopView('all')}
                  className="flex items-center gap-2 font-black px-7 py-4 rounded-2xl transition-all hover:brightness-110 active:scale-95"
                  style={{ background: '#ea580c', color: '#fff', fontSize: '0.9rem', minHeight: 52, boxShadow: '0 8px 32px rgba(234,88,12,0.35)' }}
                >
                  Shop Now <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setShopView('hot')}
                  className="flex items-center gap-2 font-bold px-7 py-4 rounded-2xl transition-all hover:bg-white/10 active:scale-95 text-white"
                  style={{ border: '1px solid rgba(255,255,255,0.15)', fontSize: '0.9rem', minHeight: 52 }}
                >
                  <Flame className="w-4 h-4" style={{ color: '#ea580c' }} /> What's Hot
                </button>
              </div>

              {/* Trust row */}
              <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 mt-8">
                {[
                  { icon: Truck, label: 'Fast Shipping' },
                  { icon: RefreshCw, label: 'Free Returns' },
                  { icon: Lock, label: 'Secure Checkout' },
                  { icon: Package, label: '500+ Products' },
                ].map((b, i) => (
                  <div key={i} className="flex items-center gap-1.5">
                    <b.icon className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#ea580c' }} />
                    <span className="text-xs font-semibold text-gray-500">{b.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ── CATEGORY STRIP ────────────────────────────────────────────────── */}
          <section className="px-4 py-4" style={{ background: 'rgba(255,255,255,0.02)', borderTop: '1px solid rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <div className="max-w-screen-xl mx-auto flex gap-2 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
              {([
                { emoji: '🔥', label: 'Hot',          view: 'hot',          color: '#ea580c' },
                { emoji: '⭐', label: 'Top Sellers',  view: 'top-sellers',  color: '#f59e0b' },
                { emoji: '⚽', label: 'Sports',       view: 'sports',       color: '#10b981' },
                { emoji: '👕', label: 'Clothing',     view: 'clothing',     color: '#8b5cf6' },
                { emoji: '💄', label: 'Beauty',       view: 'beauty',       color: '#ec4899' },
                { emoji: '🔨', label: 'Construction', view: 'construction', color: '#f97316' },
                { emoji: '⚡', label: 'Electronics',  view: 'electronics',  color: '#3b82f6' },
                { emoji: '🛍️', label: 'All',          view: 'all',          color: '#6b7280' },
              ] as { emoji: string; label: string; view: typeof shopView; color: string }[]).map(cat => (
                <button key={cat.view} onClick={() => setShopView(cat.view)}
                  className="flex-shrink-0 flex items-center gap-1.5 px-4 py-2.5 rounded-2xl text-xs font-black text-white whitespace-nowrap transition-all active:scale-95"
                  style={{ background: `${cat.color}15`, border: `1px solid ${cat.color}35`, minHeight: 44 }}
                  onMouseEnter={e => { e.currentTarget.style.background = `${cat.color}28`; }}
                  onMouseLeave={e => { e.currentTarget.style.background = `${cat.color}15`; }}>
                  <span>{cat.emoji}</span> {cat.label}
                </button>
              ))}
            </div>
          </section>

          {/* ── HOT PRODUCTS GRID — TOP 12 ────────────────────────────────────── */}
          <section className="max-w-screen-xl mx-auto px-4 pt-8 pb-4">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2.5">
                <div className="w-1 h-7 rounded-full" style={{ background: 'linear-gradient(180deg, #ea580c, #f97316)' }} />
                <div>
                  <h2 className="text-xl font-black text-white leading-none">Hot Right Now</h2>
                  <p className="text-[11px] text-gray-600 mt-0.5">Our best products, handpicked for you</p>
                </div>
              </div>
              <button onClick={() => setShopView('all')}
                className="text-xs font-bold flex items-center gap-1 px-3 py-2 rounded-xl transition"
                style={{ color: '#ea580c', background: 'rgba(234,88,12,0.08)', border: '1px solid rgba(234,88,12,0.2)' }}>
                View All <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            {/* 2-col mobile / 3-col sm / 4-col lg */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {allProducts.slice(0, 12).map(product => {
                const isWishlisted = wishlist.includes(product.id);
                const discount = product.originalPrice
                  ? Math.round((1 - product.price / product.originalPrice) * 100)
                  : 0;
                return (
                  <div key={product.id}
                    className="group relative rounded-2xl overflow-hidden flex flex-col cursor-pointer transition-all duration-200"
                    style={{ background: '#111', border: '1px solid rgba(255,255,255,0.08)' }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(234,88,12,0.5)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.transform = 'translateY(0)'; }}>

                    {/* Image zone */}
                    <div className="relative overflow-hidden bg-black" style={{ aspectRatio: '1' }}>
                      {product.image && product.image !== '/placeholder-product.jpg'
                        ? <img src={product.image} alt={product.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-108" />
                        : <div className="w-full h-full flex flex-col items-center justify-center gap-2">
                            <Package className="w-12 h-12 text-gray-800" />
                            <span className="text-[10px] text-gray-700 font-bold tracking-widest uppercase">No Image</span>
                          </div>
                      }
                      {/* Gradient overlay */}
                      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                        style={{ background: 'linear-gradient(to top, rgba(234,88,12,0.15) 0%, transparent 60%)' }} />
                      {/* Discount badge */}
                      {discount > 0 && (
                        <span className="absolute top-2 left-2 text-[10px] font-black px-2 py-0.5 rounded-lg"
                          style={{ background: '#ea580c' }}>-{discount}%</span>
                      )}
                      {product.badge && !discount && (
                        <span className="absolute top-2 left-2 text-[10px] font-black px-2 py-0.5 rounded-lg"
                          style={{ background: 'rgba(0,0,0,0.8)', color: '#fb923c', border: '1px solid rgba(234,88,12,0.4)' }}>
                          {product.badge}
                        </span>
                      )}
                      {/* Wishlist */}
                      <button onClick={e => { e.stopPropagation(); toggleWishlist(product.id); }}
                        className="absolute top-2 right-2 w-8 h-8 rounded-xl flex items-center justify-center transition-all opacity-0 group-hover:opacity-100"
                        style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}>
                        <Heart className={`w-4 h-4 ${isWishlisted ? 'fill-red-500 text-red-500' : 'text-white'}`} />
                      </button>
                    </div>

                    {/* Info */}
                    <div className="p-3 flex flex-col gap-1.5 flex-1">
                      <p className="text-xs font-bold text-white line-clamp-2 leading-snug">{product.name}</p>
                      <div className="flex items-center gap-0.5">
                        {[1,2,3,4,5].map(s => (
                          <Star key={s} className={`w-2.5 h-2.5 ${s <= Math.round(product.rating) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-800'}`} />
                        ))}
                        <span className="text-[10px] text-gray-600 ml-1">({product.reviews})</span>
                      </div>
                      <div className="flex items-center justify-between mt-auto pt-1.5 gap-2">
                        <div className="min-w-0">
                          <div className="text-sm font-black" style={{ color: '#fb923c' }}>${product.price.toFixed(2)}</div>
                          {product.originalPrice && (
                            <div className="text-[10px] text-gray-600 line-through">${product.originalPrice.toFixed(2)}</div>
                          )}
                        </div>
                        <button onClick={() => addToCart(product)} disabled={!product.inStock}
                          className="flex-shrink-0 font-black text-[11px] px-3 py-2 rounded-xl transition-all hover:brightness-110 active:scale-95 disabled:opacity-30"
                          style={{ background: '#ea580c', minHeight: 34, whiteSpace: 'nowrap' }}>
                          + Cart
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* ── BUNDLE DEALS ─────────────────────────────────────────────────── */}
          <section className="max-w-screen-xl mx-auto px-4 pt-2 pb-4">
            <div className="flex items-center gap-2.5 mb-5">
              <div className="w-1 h-7 rounded-full" style={{ background: 'linear-gradient(180deg, #a855f7, #6d28d9)' }} />
              <div>
                <h2 className="text-xl font-black text-white leading-none">Bundle &amp; Save</h2>
                <p className="text-[11px] text-gray-600 mt-0.5">Handpicked combos at unbeatable prices</p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {BUNDLES.map(bundle => {
                const bundleProducts = bundle.productIds.map(id => allProducts.find(p => p.id === id)).filter(Boolean) as typeof allProducts;
                const savings = bundle.originalTotal - bundle.bundlePrice;
                return (
                  <div key={bundle.id}
                    className="group relative rounded-2xl overflow-hidden cursor-pointer transition-all duration-200"
                    style={{ background: '#111', border: '1px solid rgba(168,85,247,0.18)' }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(168,85,247,0.5)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(168,85,247,0.18)'; e.currentTarget.style.transform = 'translateY(0)'; }}>
                    <div className="absolute top-0 right-0 w-32 h-32 pointer-events-none"
                      style={{ background: 'radial-gradient(ellipse at top right, rgba(168,85,247,0.08) 0%, transparent 70%)' }} />
                    <div className="p-4">
                      {/* Header */}
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-lg">{bundle.emoji}</span>
                            <span className="text-xs font-black px-2 py-0.5 rounded-full"
                              style={{ background: 'rgba(168,85,247,0.15)', color: '#c084fc', border: '1px solid rgba(168,85,247,0.3)' }}>
                              {bundle.badge}
                            </span>
                          </div>
                          <h3 className="font-black text-white text-sm">{bundle.label}</h3>
                          <p className="text-[11px] text-gray-500 mt-0.5">{bundle.tagline}</p>
                        </div>
                      </div>
                      {/* Product thumbnails */}
                      <div className="flex gap-2 mb-4">
                        {bundleProducts.slice(0, 3).map(p => (
                          <div key={p.id} className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0"
                            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                            {p.image && p.image !== '/placeholder-product.jpg'
                              ? <img src={p.image} alt={p.name} className="w-full h-full object-cover" />
                              : <div className="w-full h-full flex items-center justify-center"><Package className="w-5 h-5 text-gray-700" /></div>}
                          </div>
                        ))}
                        <div className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 text-[10px] font-black text-gray-500"
                          style={{ border: '1px dashed rgba(255,255,255,0.1)' }}>
                          +more
                        </div>
                      </div>
                      {/* Price row */}
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-lg font-black" style={{ color: '#c084fc' }}>${bundle.bundlePrice.toFixed(2)}</div>
                          <div className="text-[11px] text-gray-600">
                            <span className="line-through">${bundle.originalTotal.toFixed(2)}</span>
                            <span className="text-green-400 font-bold ml-1">Save ${savings.toFixed(2)}</span>
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            bundleProducts.forEach(p => addToCart(p));
                            toast.success(`${bundle.label} added to cart!`);
                          }}
                          className="px-4 py-2.5 rounded-xl font-black text-xs text-white transition-all hover:brightness-110 active:scale-95"
                          style={{ background: 'linear-gradient(135deg, #7c3aed, #a855f7)' }}>
                          Add Bundle
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* ── FAMILY OWNED BANNER ───────────────────────────────────────────── */}
          <section className="max-w-screen-xl mx-auto px-4 py-6">
            <div className="rounded-3xl overflow-hidden relative flex flex-col sm:flex-row items-center justify-between gap-6 px-7 py-7"
              style={{ background: 'linear-gradient(135deg, #111 0%, #1a0a00 100%)', border: '1px solid rgba(234,88,12,0.2)' }}>
              <div className="absolute inset-0 pointer-events-none" style={{
                background: 'radial-gradient(ellipse 60% 80% at 90% 50%, rgba(234,88,12,0.12) 0%, transparent 70%)'
              }} />
              <div className="relative text-center sm:text-left">
                <p className="text-xs font-black tracking-widest uppercase mb-1" style={{ color: '#ea580c' }}>Our Promise</p>
                <h3 className="text-xl font-black text-white mb-1">Family Owned &amp; Operated</h3>
                <p className="text-sm text-gray-400 max-w-sm">
                  We're not a warehouse — we're a family that stands behind every product we sell. Real people, real care.
                </p>
              </div>
              <div className="relative flex-shrink-0 flex items-center gap-3">
                <img src={companyLogo} alt={companyName}
                  style={{ height: 64, width: 'auto', objectFit: 'contain', filter: 'drop-shadow(0 0 16px rgba(234,88,12,0.4))' }} />
              </div>
            </div>
          </section>

          {/* ── REVIEWS ────────────────────────────────────────────────────────── */}
          <section className="max-w-screen-xl mx-auto px-4 pb-10">
            <div className="flex items-center gap-2.5 mb-5">
              <div className="w-1 h-7 rounded-full" style={{ background: 'linear-gradient(180deg, #f59e0b, #fb923c)' }} />
              <div>
                <h2 className="text-xl font-black text-white leading-none">What People Say</h2>
                <p className="text-[11px] text-gray-600 mt-0.5">Real customers, real results</p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {REVIEWS.map((r, i) => (
                <div key={i} className="rounded-2xl p-5 relative overflow-hidden"
                  style={{ background: '#111', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <div className="absolute top-0 right-0 w-24 h-24 pointer-events-none"
                    style={{ background: 'radial-gradient(ellipse at top right, rgba(234,88,12,0.07) 0%, transparent 70%)' }} />
                  <div className="flex items-center gap-0.5 mb-3">
                    {[1,2,3,4,5].map(s => <Star key={s} className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />)}
                  </div>
                  <p className="text-xs text-gray-400 leading-relaxed mb-5 italic">"{r.text}"</p>
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-2xl flex items-center justify-center font-black text-sm flex-shrink-0"
                      style={{ background: '#ea580c' }}>{r.avatar}</div>
                    <div>
                      <p className="text-xs font-black text-white">{r.name}</p>
                      <p className="text-[10px] text-gray-600">{r.role}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* ── FOOTER ─────────────────────────────────────────────────────────── */}
          <footer style={{ borderTop: '1px solid rgba(255,255,255,0.06)', background: '#050505' }}>
            <div className="max-w-screen-xl mx-auto px-4 py-8">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <img src={companyLogo} alt={companyName}
                    style={{ height: 44, width: 'auto', objectFit: 'contain' }} />
                  <div>
                    <p className="text-sm font-black text-white">{companyName}</p>
                    <p className="text-[10px] tracking-widest uppercase" style={{ color: '#ea580c' }}>Family Owned &amp; Operated</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  {[Instagram, Facebook, Youtube].map((Icon, i) => (
                    <button key={i} className="w-10 h-10 rounded-xl flex items-center justify-center transition hover:scale-110"
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                      <Icon className="w-4 h-4 text-gray-500" />
                    </button>
                  ))}
                </div>
              </div>
              <p className="text-center text-[10px] text-gray-800 mt-6">© 2026 {companyName}. All rights reserved.</p>
            </div>
          </footer>
        </>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* PRODUCT LIST VIEWS                                                     */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {shopView !== 'home' && (
        <div className="max-w-screen-xl mx-auto px-4 pb-20 pt-6">
          {/* Back + title */}
          <div className="flex items-center gap-3 mb-6">
            <button
              onClick={() => { setShopView('home'); setSearchQuery(''); }}
              className="flex items-center gap-1 text-sm font-semibold text-gray-400 hover:text-white transition"
              style={{ minHeight: 44 }}
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
            <h1 className="text-xl font-black text-white">{viewTitles[shopView]}</h1>
          </div>

          {/* Search bar */}
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder={`Search ${viewTitles[shopView]}…`}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-3 rounded-2xl text-white placeholder-gray-600 focus:outline-none transition"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.09)' }}
            />
          </div>

          {/* Product count */}
          <p className="text-sm text-gray-600 mb-5">{viewProducts.length} product{viewProducts.length !== 1 ? 's' : ''}</p>

          {/* Grid */}
          {viewProducts.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {viewProducts.map(product => <ProductCard key={product.id} product={product} />)}
            </div>
          ) : (
            <div className="text-center py-24">
              <Package className="w-16 h-16 mx-auto mb-4 text-gray-700" />
              <h3 className="text-xl font-bold mb-2">No products found</h3>
              <p className="text-gray-500 text-sm mb-5">Try a different search term</p>
              <button onClick={() => setSearchQuery('')} className="px-6 py-2.5 rounded-xl text-sm font-bold" style={{ background: '#ea580c' }}>Clear Search</button>
            </div>
          )}
        </div>
      )}

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

            {/* ── UPSELL STRIP ─────────────────────────────────────────────── */}
            {cart.length > 0 && (() => {
              const cartIds = new Set(cart.map(i => i.id));
              const upsells = allProducts.filter(p => !cartIds.has(p.id) && p.inStock).slice(0, 3);
              if (upsells.length === 0) return null;
              return (
                <div className="px-6 pb-4">
                  <p className="text-[10px] font-black tracking-widest uppercase text-gray-600 mb-2">You Might Also Like</p>
                  <div className="flex flex-col gap-2">
                    {upsells.map(p => (
                      <div key={p.id} className="flex items-center gap-3 p-2.5 rounded-xl transition"
                        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                        <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0"
                          style={{ background: 'rgba(255,255,255,0.04)' }}>
                          {p.image && p.image !== '/placeholder-product.jpg'
                            ? <img src={p.image} alt={p.name} className="w-full h-full object-cover" />
                            : <Package className="w-5 h-5 text-gray-700 m-auto mt-2.5" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-white truncate">{p.name}</p>
                          <p className="text-[11px] font-black" style={{ color: '#fb923c' }}>${p.price.toFixed(2)}</p>
                        </div>
                        <button onClick={() => addToCart(p)}
                          className="flex-shrink-0 text-[10px] font-black px-3 py-1.5 rounded-lg transition hover:brightness-110"
                          style={{ background: '#ea580c' }}>
                          + Add
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            {cart.length > 0 && (
              <div className="sticky bottom-0 p-6" style={{ background: '#0d0d0d', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
                {/* ZIP / Tax calculator */}
                <div className="mb-4">
                  <p className="text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-widest">Calculate Tax</p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={5}
                      placeholder="Enter ZIP code"
                      value={zipCode}
                      onChange={e => {
                        const v = e.target.value.replace(/\D/g, '');
                        setZipCode(v);
                        applyZip(v);
                      }}
                      className="flex-1 bg-[#1A1A1A] border border-[#2A2A2A] focus:border-orange-500/50 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none"
                    />
                    {taxState && (
                      <span className="flex items-center px-3 rounded-xl text-xs font-bold text-orange-400 bg-orange-500/10 border border-orange-500/20 whitespace-nowrap">
                        {taxState} · {(taxRate * 100).toFixed(2)}%
                      </span>
                    )}
                  </div>
                  {zipCode.length === 5 && !taxState && (
                    <p className="text-xs text-gray-600 mt-1">ZIP not recognized — no tax applied</p>
                  )}
                </div>

                <div className="space-y-2 mb-5">
                  <div className="flex justify-between text-sm text-gray-500">
                    <span>Subtotal</span>
                    <span className="text-white font-semibold">${cartTotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-gray-500">
                    <span>Shipping</span>
                    <span className={cartTotal >= 500 ? 'text-green-400 font-semibold' : 'text-white font-semibold'}>
                      {cartTotal >= 500 ? '✓ FREE' : '$25.00'}
                    </span>
                  </div>
                  {taxRate > 0 && (
                    <div className="flex justify-between text-sm text-gray-500">
                      <span>Tax ({(taxRate * 100).toFixed(2)}%)</span>
                      <span className="text-white font-semibold">${(cartTotal * taxRate).toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-base font-black text-white pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
                    <span>Total</span>
                    <span style={{ color: '#ea580c' }}>
                      ${((cartTotal >= 500 ? cartTotal : cartTotal + 25) + cartTotal * taxRate).toFixed(2)}
                    </span>
                  </div>
                  {taxRate > 0 && (
                    <p className="text-[10px] text-gray-600">Includes ${(cartTotal * taxRate).toFixed(2)} in {taxState} sales tax</p>
                  )}
                </div>

                <button
                  className="w-full py-4 rounded-2xl font-black text-base transition hover:scale-105 flex items-center justify-center gap-2"
                  style={{ background: '#ea580c' }}
                  onClick={() => {
                    localStorage.removeItem('bp_cart_recovered');
                    const savedName = localStorage.getItem('bp_lead_name') || user?.email?.split('@')[0] || '';
                    const savedEmail = localStorage.getItem('bp_lead_email') || user?.email || '';
                    setCheckoutForm(f => ({ ...f, name: f.name || savedName, email: f.email || savedEmail }));
                    setCheckoutStep('info');
                    setCheckoutError('');
                    setShowCart(false);
                    setShowCheckout(true);
                  }}
                >
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
                <div className="pt-4 border-t mt-4" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
                  <h3 className="text-sm font-black text-white mb-3">Customer Reviews</h3>
                  <StoreReviews productId={showQuickView.id} compact />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── CHECKOUT MODAL ───────────────────────────────────────────────── */}
      {showCheckout && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-[9999] flex items-end sm:items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl" style={{ background: '#0f0f0f', border: '1px solid rgba(234,88,12,0.25)' }}>
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'rgba(255,255,255,0.07)', background: 'rgba(234,88,12,0.05)' }}>
              <div>
                <p className="font-black text-white">Secure Checkout</p>
                <p className="text-xs text-gray-500 mt-0.5">{cart.length} item{cart.length !== 1 ? 's' : ''} · ${((cartTotal >= 500 ? cartTotal : cartTotal + 25) + cartTotal * taxRate).toFixed(2)} total</p>
              </div>
              <button onClick={() => setShowCheckout(false)} className="p-2 rounded-xl text-gray-600 hover:text-white transition" style={{ background: 'rgba(255,255,255,0.05)' }}>
                <X className="w-4 h-4" />
              </button>
            </div>

            {checkoutStep === 'info' && (
              <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
                {/* Order summary */}
                <div className="rounded-2xl p-4 space-y-2" style={{ background: '#161616', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <p className="text-xs font-black text-gray-500 uppercase tracking-widest mb-3">Order Summary</p>
                  {cart.map(item => (
                    <div key={item.id} className="flex justify-between text-sm">
                      <span className="text-gray-400 truncate mr-2">{item.name} × {item.qty}</span>
                      <span className="text-white font-bold flex-shrink-0">${(item.price * item.qty).toFixed(2)}</span>
                    </div>
                  ))}
                  <div className="border-t pt-2 mt-2 flex justify-between text-sm" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
                    <span className="text-gray-500">Shipping</span>
                    <span className="text-white">{checkoutShipping === 0 ? 'FREE' : `$${checkoutShipping.toFixed(2)}`}</span>
                  </div>
                  {taxRate > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Tax</span>
                      <span className="text-white">${checkoutTax.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="border-t pt-2 flex justify-between font-black" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
                    <span className="text-white">Total</span>
                    <span style={{ color: '#ea580c' }}>${checkoutTotal.toFixed(2)}</span>
                  </div>
                </div>

                <div className="rounded-2xl p-4 space-y-2" style={{ background: '#161616', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <p className="text-xs font-black text-gray-500 uppercase tracking-widest">Gift card</p>
                  <div className="flex gap-2">
                    <input
                      value={checkoutForm.giftCardCode}
                      onChange={event => { setCheckoutForm(form => ({ ...form, giftCardCode: event.target.value })); setGiftCardBalance(null); }}
                      placeholder="BPB-XXXX-XXXX-XXXX"
                      className="min-w-0 flex-1 px-3 py-2.5 rounded-xl text-sm text-white placeholder-gray-700 focus:outline-none focus:border-orange-500/50"
                      style={{ background: '#0d0d0d', border: '1px solid rgba(255,255,255,0.08)' }}
                    />
                    <button type="button" onClick={applyGiftCard} disabled={checkingGiftCard} className="px-4 py-2 rounded-xl text-xs font-black text-orange-300 disabled:opacity-50" style={{ border: '1px solid rgba(234,88,12,0.4)', background: 'rgba(234,88,12,0.1)' }}>
                      {checkingGiftCard ? 'Checking…' : 'Apply'}
                    </button>
                  </div>
                  {giftCardBalance !== null && <div className="flex justify-between text-xs"><span className="text-green-400">Gift card credit reserved at payment</span><span className="font-black text-green-400">−${giftCardCredit.toFixed(2)}</span></div>}
                  {giftCardBalance !== null && <p className="text-[10px] text-gray-500">Available card balance: ${giftCardBalance.toFixed(2)} · Amount due: ${amountDueAfterGiftCard.toFixed(2)}</p>}
                </div>

                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Your Information</p>
                {[
                  { key: 'name',    label: 'Full Name *',     type: 'text',  placeholder: 'John Smith' },
                  { key: 'email',   label: 'Email *',         type: 'email', placeholder: 'you@example.com' },
                  { key: 'phone',   label: 'Phone',           type: 'tel',   placeholder: '(614) 555-0000' },
                  { key: 'address', label: 'Shipping Address *', type: 'text', placeholder: '123 Main St' },
                  { key: 'city',    label: 'City *',          type: 'text',  placeholder: 'Columbus' },
                  { key: 'zip',     label: 'ZIP Code *',      type: 'text',  placeholder: '43215' },
                ].map(field => (
                  <div key={field.key}>
                    <label className="text-xs font-bold text-gray-500 block mb-1">{field.label}</label>
                    <input
                      type={field.type}
                      value={(checkoutForm as any)[field.key]}
                      onChange={e => setCheckoutForm(f => ({ ...f, [field.key]: e.target.value }))}
                      placeholder={field.placeholder}
                      className="w-full px-4 py-2.5 rounded-xl text-sm text-white placeholder-gray-700 focus:outline-none focus:border-orange-500/50"
                      style={{ background: '#161616', border: '1px solid rgba(255,255,255,0.08)' }}
                    />
                  </div>
                ))}

                {checkoutError && (
                  <p className="text-sm text-red-400 font-bold">{checkoutError}</p>
                )}

                <button
                  className="w-full py-4 rounded-2xl font-black text-base text-white flex items-center justify-center gap-2 hover:brightness-110 transition"
                  style={{ background: 'linear-gradient(135deg, #ea580c, #c2410c)', boxShadow: '0 4px 20px rgba(234,88,12,0.35)' }}
                  onClick={async () => {
                    if (!checkoutForm.name.trim()) { setCheckoutError('Name is required'); return; }
                    if (!checkoutForm.email.trim()) { setCheckoutError('Email is required'); return; }
                    if (!checkoutForm.address.trim() || !checkoutForm.city.trim() || !checkoutForm.zip.trim()) { setCheckoutError('Full shipping address is required'); return; }
                    setCheckoutError('');
                    setCheckoutStep('processing');

                    // Save email for lead tracking
                    localStorage.setItem('bp_lead_email', checkoutForm.email);
                    localStorage.setItem('bp_lead_name', checkoutForm.name);

                    try {
                      const res = await fetch(`${SERVER}/store/checkout`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', apikey: publicAnonKey },
                        body: JSON.stringify({
                          items: cart.map(item => ({ id: item.id, name: item.name, price: item.price, qty: item.qty, image: item.image })),
                          customer: { name: checkoutForm.name, email: checkoutForm.email, phone: checkoutForm.phone, address: `${checkoutForm.address}, ${checkoutForm.city} ${checkoutForm.zip}` },
                          shipping: checkoutShipping,
                          tax: checkoutTax,
                          giftCardCode: giftCardBalance !== null ? checkoutForm.giftCardCode.trim() : null,
                          coupon: null,
                        }),
                      });
                      const data = await res.json();
                      if (data.zeroBalanceOrder && data.order) {
                        setCart([]); setShowCart(false); setShowCheckout(false); setCheckoutStep('info');
                        setGiftCardBalance(null); setCheckoutForm(form => ({ ...form, giftCardCode: '' }));
                        toast.success(`Order ${data.order.id} confirmed — your gift card covered the total.`);
                      } else if (data.url) {
                        window.location.href = data.url;
                      } else {
                        setCheckoutError(data.error || 'Payment setup failed. Please try again.');
                        setCheckoutStep('info');
                      }
                    } catch {
                      setCheckoutError('Could not connect to payment processor. Please try again.');
                      setCheckoutStep('info');
                    }
                  }}
                >
                  <Lock className="w-4 h-4" /> {amountDueAfterGiftCard === 0 && giftCardBalance !== null ? 'Complete Gift Card Order' : `Pay $${amountDueAfterGiftCard.toFixed(2)} — Powered by Stripe`}
                </button>
                <p className="text-center text-[10px] text-gray-700">256-bit SSL encrypted · You will be redirected to Stripe's secure payment page</p>
              </div>
            )}

            {checkoutStep === 'processing' && (
              <div className="flex flex-col items-center justify-center py-16 px-6">
                <div className="w-12 h-12 rounded-full border-2 border-orange-500 border-t-transparent animate-spin mb-4" />
                <p className="font-black text-white">Setting up secure payment…</p>
                <p className="text-sm text-gray-500 mt-1">Redirecting to Stripe</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── LEAD CAPTURE POPUP ───────────────────────────────────────────── */}
      {showLeadCapture && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[9999] flex items-end sm:items-center justify-center p-4">
          <div className="bg-[#111] border border-[#2A2A2A] rounded-2xl w-full max-w-sm p-6 relative shadow-2xl">
            <button onClick={() => setShowLeadCapture(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-[#2A2A2A] transition text-gray-500">
              <X className="w-4 h-4" />
            </button>

            {leadSubmitted ? (
              <div className="text-center py-4">
                <div className="w-14 h-14 rounded-full bg-green-500/20 border border-green-500/30 flex items-center justify-center mx-auto mb-3">
                  <Check className="w-7 h-7 text-green-400" />
                </div>
                <p className="font-black text-white text-lg">You're in!</p>
                <p className="text-gray-400 text-sm mt-1">Check your inbox for exclusive deals 🎉</p>
              </div>
            ) : (
              <>
                <div className="text-center mb-5">
                  <p className="text-2xl mb-2">🎁</p>
                  <h3 className="font-black text-white text-lg leading-tight">Get 10% Off Your First Order</h3>
                  <p className="text-gray-400 text-sm mt-1">Join thousands of happy shoppers. No spam, ever.</p>
                </div>
                <div className="space-y-3">
                  <input value={leadName} onChange={e => setLeadName(e.target.value)}
                    placeholder="Your first name"
                    className="w-full bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-orange-500/50" />
                  <input type="email" value={leadEmail} onChange={e => setLeadEmail(e.target.value)}
                    placeholder="Your email address"
                    onKeyDown={e => e.key === 'Enter' && submitLead()}
                    className="w-full bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-orange-500/50" />
                  <button onClick={() => submitLead()} disabled={!leadEmail}
                    className="w-full py-3.5 rounded-2xl font-black text-white text-sm transition disabled:opacity-40"
                    style={{ background: '#ea580c' }}>
                    Claim My 10% Off →
                  </button>
                  <p className="text-[10px] text-gray-600 text-center">Use code <strong className="text-gray-400">BPBUILDS10</strong> at checkout</p>
                </div>
              </>
            )}
          </div>
        </div>
      )}
      {/* ── REVIEW REQUEST MODAL ─────────────────────────────────────────── */}
      {showReviewRequest && (
        <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)' }}>
          <div className="w-full max-w-sm rounded-3xl overflow-hidden" style={{ background: '#111', border: '1px solid rgba(255,255,255,0.1)' }}>
            {reviewStep === 'rate' ? (
              <>
                <div className="px-6 pt-8 pb-4 text-center">
                  <div className="text-5xl mb-3">🎉</div>
                  <h3 className="text-xl font-black text-white mb-1">Thank You for Your Order!</h3>
                  <p className="text-sm text-gray-400 leading-relaxed">
                    As a family-owned business, every review means the world to us. Would you take 60 seconds to share your experience?
                  </p>
                </div>

                {/* Star rating */}
                <div className="flex justify-center gap-2 py-3">
                  {[1,2,3,4,5].map(s => (
                    <button key={s}
                      onClick={() => {
                        if (s >= 4) {
                          // High rating → send to Google
                          window.open('https://g.page/r/your-google-review-link/review', '_blank');
                          setReviewStep('thanks');
                        } else {
                          // Low rating → collect feedback privately
                          setReviewStep('thanks');
                        }
                      }}
                      className="transition hover:scale-125 active:scale-95">
                      <Star className="w-9 h-9 fill-yellow-400 text-yellow-400" />
                    </button>
                  ))}
                </div>

                <div className="px-6 pb-6 space-y-2 mt-2">
                  <a href="https://g.page/r/your-google-review-link/review" target="_blank" rel="noreferrer"
                    onClick={() => setReviewStep('thanks')}
                    className="flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl font-black text-white text-sm transition hover:brightness-110"
                    style={{ background: '#4285F4' }}>
                    <Star className="w-4 h-4 fill-white" /> Leave a Google Review
                  </a>
                  <button onClick={() => setShowReviewRequest(false)}
                    className="w-full py-2.5 text-xs text-gray-600 hover:text-gray-400 transition">
                    Maybe later
                  </button>
                </div>
              </>
            ) : (
              <div className="px-6 py-10 text-center">
                <div className="text-5xl mb-4">🧡</div>
                <h3 className="text-xl font-black text-white mb-2">You're Amazing!</h3>
                <p className="text-sm text-gray-400 mb-6">Your support keeps this family business going. We'll also send a reminder to your email — no pressure.</p>
                <button onClick={() => { setShowReviewRequest(false); setReviewStep('rate'); }}
                  className="w-full py-3.5 rounded-2xl font-black text-white text-sm transition hover:brightness-110"
                  style={{ background: '#ea580c' }}>
                  Keep Shopping
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── SOCIAL PROOF WIDGET ──────────────────────────────────────────── */}
      <SocialProofWidget />

      {/* ── AI CHAT WIDGET ────────────────────────────────────────────────── */}
      <div className="fixed bottom-6 right-5 z-50 flex flex-col items-end gap-3">
        {/* Chat panel */}
        {showChat && (
          <div className="w-80 rounded-2xl overflow-hidden shadow-2xl flex flex-col"
            style={{ background: '#0d0d0d', border: '1px solid rgba(234,88,12,0.25)', maxHeight: '70vh' }}>
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #ea580c, #c2410c)' }}>
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl overflow-hidden flex-shrink-0 bg-white/20 flex items-center justify-center">
                  <img src={companyLogo} alt="Phoenix" className="w-6 h-6 object-contain" />
                </div>
                <div>
                  <p className="text-xs font-black text-white">Phoenix AI</p>
                  <div className="flex items-center gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-300 animate-pulse" />
                    <p className="text-[10px] text-orange-100">Online · Replies instantly</p>
                  </div>
                </div>
              </div>
              <button onClick={() => setShowChat(false)}
                className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/20 transition">
                <X className="w-4 h-4 text-white" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3" style={{ minHeight: 200, maxHeight: 340 }}>
              {chatMessages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {msg.role === 'bot' && (
                    <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 mr-2 mt-0.5"
                      style={{ background: 'rgba(234,88,12,0.2)' }}>
                      <span className="text-[10px]">🔥</span>
                    </div>
                  )}
                  <div className="max-w-[75%] px-3 py-2 rounded-2xl text-xs leading-relaxed"
                    style={msg.role === 'user'
                      ? { background: '#ea580c', color: '#fff', borderBottomRightRadius: 4 }
                      : { background: '#1a1a1a', color: '#d1d5db', borderBottomLeftRadius: 4 }}>
                    {msg.text}
                  </div>
                </div>
              ))}
              {chatTyping && (
                <div className="flex justify-start">
                  <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 mr-2"
                    style={{ background: 'rgba(234,88,12,0.2)' }}>
                    <span className="text-[10px]">🔥</span>
                  </div>
                  <div className="px-3 py-2.5 rounded-2xl" style={{ background: '#1a1a1a', borderBottomLeftRadius: 4 }}>
                    <div className="flex gap-1">
                      {[0,1,2].map(d => (
                        <div key={d} className="w-1.5 h-1.5 rounded-full bg-gray-500 animate-bounce"
                          style={{ animationDelay: `${d * 0.15}s` }} />
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Quick replies */}
            <div className="px-3 pb-2 flex gap-1.5 flex-wrap flex-shrink-0">
              {['Shipping info', 'Best deals', 'Returns'].map(q => (
                <button key={q} onClick={() => { setChatInput(q); }}
                  className="text-[10px] font-bold px-2.5 py-1 rounded-full transition"
                  style={{ background: 'rgba(234,88,12,0.1)', color: '#fb923c', border: '1px solid rgba(234,88,12,0.2)' }}>
                  {q}
                </button>
              ))}
            </div>

            {/* Input */}
            <div className="flex gap-2 p-3 flex-shrink-0" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <input
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && sendChatMessage()}
                placeholder="Ask me anything…"
                className="flex-1 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-3 py-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-orange-500/50"
              />
              <button onClick={sendChatMessage}
                className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 transition hover:brightness-110"
                style={{ background: '#ea580c' }}>
                <ArrowRight className="w-3.5 h-3.5 text-white" />
              </button>
            </div>
          </div>
        )}

        {/* Bubble button */}
        <button
          onClick={() => { setShowChat(prev => !prev); setChatUnread(0); }}
          className="w-14 h-14 rounded-2xl shadow-2xl flex items-center justify-center relative transition-all hover:scale-105 active:scale-95"
          style={{ background: 'linear-gradient(135deg, #ea580c, #c2410c)', boxShadow: '0 8px 32px rgba(234,88,12,0.45)' }}>
          {showChat
            ? <X className="w-6 h-6 text-white" />
            : <MessageSquare className="w-6 h-6 text-white" />}
          {!showChat && chatUnread > 0 && (
            <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black text-white"
              style={{ background: '#ef4444' }}>
              {chatUnread}
            </span>
          )}
        </button>
      </div>
    </div>
  );
}
