// Individual Vendor Storefront
// Customer-facing product catalog for each vendor
import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  ShoppingCart,
  Heart,
  Share2,
  Search,
  Filter,
  Grid3x3,
  List,
  Star,
  MapPin,
  Phone,
  Mail,
  Globe,
  CheckCircle,
  Package,
  Truck,
  Shield,
  ArrowLeft,
  ChevronRight,
  TrendingUp,
  Award,
  Store
} from 'lucide-react';
import { StandardButton } from './ui/button/StandardButton';
import { CompactStandardButton } from './ui/button/StandardButton';
import ProductDetailModal from './ProductDetailModal';
import type { Product } from '../types/ecommerce';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner@2.0.3';

interface VendorStorefrontProps {
  vendorId: string;
  onBack?: () => void;
}

interface VendorProfile {
  vendorKey: string;
  companyName: string;
  email: string;
  phone?: string;
  website?: string;
  address?: string;
  description?: string;
  logo?: string;
  coverImage?: string;
  rating?: number;
  totalReviews?: number;
  verified?: boolean;
  yearsInBusiness?: number;
}

export default function VendorStorefront({ vendorId, onBack }: VendorStorefrontProps) {
  const [vendor, setVendor] = useState<VendorProfile | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'featured' | 'price-low' | 'price-high' | 'newest'>('featured');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadVendorData();
  }, [vendorId]);

  // Favourites live on the signed-in account so they follow the shopper across
  // devices. Signed out, the server returns an empty list and toggling asks
  // them to sign in rather than silently forgetting the choice.
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) return;
        const res = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6/product-favorites`,
          { headers: { Authorization: `Bearer ${session.access_token}` } },
        );
        const data = await res.json().catch(() => ({}));
        if (mounted && res.ok && Array.isArray(data.productIds)) setFavorites(new Set(data.productIds));
      } catch (error) {
        console.error('Error loading saved product favourites:', error);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const loadVendorData = async () => {
    try {
      setLoading(true);

      // Load vendor profile
      const vendorResponse = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6/vendor-profile/${vendorId}`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      // Load products
      const productsResponse = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6/products?vendorId=${vendorId}&isActive=true`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const vendorData = await vendorResponse.json();
      const productsData = await productsResponse.json();

      if (vendorData.success) {
        setVendor(vendorData.vendor);
      }

      if (productsData.success) {
        setProducts(productsData.products || []);
      }
    } catch (error) {
      console.error('Error loading vendor storefront:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleFavorite = async (productId: string) => {
    const previous = favorites;
    const next = new Set(favorites);
    const nowFavorite = !next.has(productId);
    if (nowFavorite) next.add(productId); else next.delete(productId);
    setFavorites(next);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setFavorites(previous);
        toast.error('Sign in to save products to your favourites.');
        return;
      }
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6/product-favorites`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ productId, favorite: nowFavorite }),
        },
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) throw new Error(data.error || `Server responded ${res.status}`);
      if (Array.isArray(data.productIds)) setFavorites(new Set(data.productIds));
    } catch (error: any) {
      console.error('Error saving product favourite:', error);
      setFavorites(previous);
      toast.error(`Could not save that favourite: ${error?.message || error}`);
    }
  };

  const handleShare = (product: Product) => {
    if (navigator.share) {
      navigator.share({
        title: product.name,
        text: product.shortDescription || product.description,
        url: window.location.href
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert('Link copied to clipboard!');
    }
  };

  // Filter and sort products
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
        case 'newest':
          return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
        case 'featured':
        default:
          return (b.isFeatured ? 1 : 0) - (a.isFeatured ? 1 : 0);
      }
    });

  const categories = ['all', ...Array.from(new Set(products.map(p => p.category)))];
  const featuredProducts = products.filter(p => p.isFeatured).slice(0, 4);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#ea580c]"></div>
      </div>
    );
  }

  if (!vendor) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <Store className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Vendor Not Found</h2>
          <p className="text-gray-400 mb-6">This storefront is not available.</p>
          {onBack && (
            <StandardButton variant="primary" onClick={onBack} icon={<ArrowLeft className="w-4 h-4" />}>
              Go Back
            </StandardButton>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      {/* Header/Cover */}
      <div className="relative h-64 bg-gradient-to-r from-[#ea580c] to-orange-700 overflow-hidden">
        {vendor.coverImage && (
          <img src={vendor.coverImage} alt="Cover" className="absolute inset-0 w-full h-full object-cover opacity-30" />
        )}
        
        {/* Back Button */}
        {onBack && (
          <button
            onClick={onBack}
            className="absolute top-6 left-6 p-3 bg-black/50 backdrop-blur-sm hover:bg-black/70 rounded-xl text-white transition-colors flex items-center gap-2"
          >
            <ArrowLeft className="w-5 h-5" />
            Back
          </button>
        )}

        {/* Vendor Logo & Info */}
        <div className="absolute bottom-0 left-0 right-0 transform translate-y-1/2 px-6">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-end gap-6">
              {/* Logo */}
              <div className="w-32 h-32 rounded-2xl bg-white border-4 border-[#0A0A0A] shadow-2xl overflow-hidden flex-shrink-0">
                {vendor.logo ? (
                  <img src={vendor.logo} alt={vendor.companyName} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#ea580c] to-orange-700">
                    <Store className="w-16 h-16 text-white" />
                  </div>
                )}
              </div>

              {/* Vendor Name & Stats */}
              <div className="flex-1 pb-4">
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-3xl font-bold text-white">{vendor.companyName}</h1>
                  {vendor.verified && (
                    <div className="px-3 py-1 bg-green-500/20 border border-green-500/30 rounded-full flex items-center gap-1">
                      <CheckCircle className="w-4 h-4 text-green-400" />
                      <span className="text-sm text-green-400 font-semibold">Verified</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-6 text-white/80">
                  {vendor.rating && (
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1">
                        <Star className="w-5 h-5 text-yellow-400 fill-current" />
                        <span className="font-semibold">{vendor.rating.toFixed(1)}</span>
                      </div>
                      <span className="text-sm">({vendor.totalReviews || 0} reviews)</span>
                    </div>
                  )}
                  {vendor.yearsInBusiness && (
                    <div className="flex items-center gap-2">
                      <Award className="w-5 h-5" />
                      <span className="text-sm">{vendor.yearsInBusiness} years in business</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Package className="w-5 h-5" />
                    <span className="text-sm">{products.length} products</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 pt-20 pb-12">
        {/* Vendor Description & Contact */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Description */}
          <div className="lg:col-span-2 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6">
            <h2 className="text-xl font-bold text-white mb-3">About Us</h2>
            <p className="text-gray-300 leading-relaxed">
              {vendor.description || `Welcome to ${vendor.companyName}! We offer high-quality products and exceptional service. Browse our catalog to find exactly what you need.`}
            </p>

            {/* Trust Badges */}
            <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-[#2A2A2A]">
              <div className="text-center">
                <Truck className="w-8 h-8 text-[#ea580c] mx-auto mb-2" />
                <div className="text-sm font-semibold text-white">Fast Shipping</div>
                <div className="text-xs text-gray-400">Quick delivery</div>
              </div>
              <div className="text-center">
                <Shield className="w-8 h-8 text-[#ea580c] mx-auto mb-2" />
                <div className="text-sm font-semibold text-white">Secure Payment</div>
                <div className="text-xs text-gray-400">Protected checkout</div>
              </div>
              <div className="text-center">
                <CheckCircle className="w-8 h-8 text-[#ea580c] mx-auto mb-2" />
                <div className="text-sm font-semibold text-white">Quality Guarantee</div>
                <div className="text-xs text-gray-400">Satisfaction ensured</div>
              </div>
            </div>
          </div>

          {/* Contact Info */}
          <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6">
            <h2 className="text-xl font-bold text-white mb-4">Contact Information</h2>
            <div className="space-y-3">
              {vendor.email && (
                <a href={`mailto:${vendor.email}`} className="flex items-center gap-3 text-gray-300 hover:text-[#ea580c] transition-colors">
                  <Mail className="w-5 h-5 flex-shrink-0" />
                  <span className="text-sm truncate">{vendor.email}</span>
                </a>
              )}
              {vendor.phone && (
                <a href={`tel:${vendor.phone}`} className="flex items-center gap-3 text-gray-300 hover:text-[#ea580c] transition-colors">
                  <Phone className="w-5 h-5 flex-shrink-0" />
                  <span className="text-sm">{vendor.phone}</span>
                </a>
              )}
              {vendor.website && (
                <a href={vendor.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-gray-300 hover:text-[#ea580c] transition-colors">
                  <Globe className="w-5 h-5 flex-shrink-0" />
                  <span className="text-sm truncate">Visit Website</span>
                </a>
              )}
              {vendor.address && (
                <div className="flex items-start gap-3 text-gray-300">
                  <MapPin className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <span className="text-sm">{vendor.address}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Featured Products */}
        {featuredProducts.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-6 h-6 text-[#ea580c]" />
              <h2 className="text-2xl font-bold text-white">Featured Products</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {featuredProducts.map(product => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onView={() => setSelectedProduct(product)}
                  onFavorite={() => toggleFavorite(product.id)}
                  onShare={() => handleShare(product)}
                  isFavorite={favorites.has(product.id)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Catalog Section */}
        <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6">
          <h2 className="text-2xl font-bold text-white mb-6">Product Catalog</h2>

          {/* Filters & Search */}
          <div className="space-y-4 mb-6">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#ea580c]"
              />
            </div>

            {/* Filters Row */}
            <div className="flex flex-wrap gap-3 items-center">
              {/* Category Filter */}
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-4 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white focus:outline-none focus:border-[#ea580c]"
              >
                {categories.map(cat => (
                  <option key={cat} value={cat}>
                    {cat === 'all' ? 'All Categories' : cat}
                  </option>
                ))}
              </select>

              {/* Sort */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-4 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white focus:outline-none focus:border-[#ea580c]"
              >
                <option value="featured">Featured First</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
                <option value="newest">Newest First</option>
              </select>

              <div className="ml-auto flex items-center gap-2">
                {/* View Toggle */}
                <div className="flex bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg p-1">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-2 rounded ${viewMode === 'grid' ? 'bg-[#ea580c] text-white' : 'text-gray-400 hover:text-white'}`}
                  >
                    <Grid3x3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-2 rounded ${viewMode === 'list' ? 'bg-[#ea580c] text-white' : 'text-gray-400 hover:text-white'}`}
                  >
                    <List className="w-4 h-4" />
                  </button>
                </div>

                {/* Results Count */}
                <div className="text-sm text-gray-400">
                  {filteredProducts.length} {filteredProducts.length === 1 ? 'product' : 'products'}
                </div>
              </div>
            </div>
          </div>

          {/* Products Grid */}
          {filteredProducts.length === 0 ? (
            <div className="text-center py-12">
              <Package className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">No Products Found</h3>
              <p className="text-gray-400">Try adjusting your search or filters</p>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredProducts.map(product => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onView={() => setSelectedProduct(product)}
                  onFavorite={() => toggleFavorite(product.id)}
                  onShare={() => handleShare(product)}
                  isFavorite={favorites.has(product.id)}
                />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredProducts.map(product => (
                <ProductListItem
                  key={product.id}
                  product={product}
                  onView={() => setSelectedProduct(product)}
                  onFavorite={() => toggleFavorite(product.id)}
                  onShare={() => handleShare(product)}
                  isFavorite={favorites.has(product.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Product Detail Modal */}
      {selectedProduct && (
        <ProductDetailModal
          product={selectedProduct}
          vendor={vendor}
          onClose={() => setSelectedProduct(null)}
          isFavorite={favorites.has(selectedProduct.id)}
          onFavorite={() => toggleFavorite(selectedProduct.id)}
        />
      )}
    </div>
  );
}

// Product Card Component
function ProductCard({ 
  product, 
  onView, 
  onFavorite, 
  onShare, 
  isFavorite 
}: { 
  product: Product;
  onView: () => void;
  onFavorite: () => void;
  onShare: () => void;
  isFavorite: boolean;
}) {
  const discount = product.compareAtPrice && product.compareAtPrice > product.price
    ? Math.round(((product.compareAtPrice - product.price) / product.compareAtPrice) * 100)
    : 0;

  const isLowStock = product.trackInventory && product.inventoryQuantity < (product.lowStockThreshold || 10);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ y: -4 }}
      className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl overflow-hidden hover:border-[#ea580c] transition-all group cursor-pointer"
      onClick={onView}
    >
      {/* Image */}
      <div className="relative aspect-square overflow-hidden bg-[#1A1A1A]">
        {product.primaryImage ? (
          <img
            src={product.primaryImage}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package className="w-16 h-16 text-gray-600" />
          </div>
        )}

        {/* Badges */}
        <div className="absolute top-2 left-2 flex flex-col gap-2">
          {product.isFeatured && (
            <span className="px-2 py-1 bg-yellow-500/20 border border-yellow-500/30 text-yellow-400 text-xs rounded-full flex items-center gap-1">
              <Star className="w-3 h-3 fill-current" />
              Featured
            </span>
          )}
          {discount > 0 && (
            <span className="px-2 py-1 bg-red-500/20 border border-red-500/30 text-red-400 text-xs rounded-full font-bold">
              -{discount}%
            </span>
          )}
        </div>

        {/* Action Buttons */}
        <div className="absolute top-2 right-2 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onFavorite();
            }}
            className={`p-2 rounded-lg backdrop-blur-sm transition-colors ${
              isFavorite 
                ? 'bg-red-500 text-white' 
                : 'bg-black/50 text-white hover:bg-black/70'
            }`}
          >
            <Heart className={`w-4 h-4 ${isFavorite ? 'fill-current' : ''}`} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onShare();
            }}
            className="p-2 bg-black/50 backdrop-blur-sm hover:bg-black/70 rounded-lg text-white transition-colors"
          >
            <Share2 className="w-4 h-4" />
          </button>
        </div>

        {isLowStock && (
          <div className="absolute bottom-2 left-2">
            <span className="px-2 py-1 bg-orange-500/20 border border-orange-500/30 text-orange-400 text-xs rounded-full">
              Only {product.inventoryQuantity} left
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="text-sm text-gray-400 mb-1">{product.category}</div>
        <h3 className="text-white font-semibold mb-2 line-clamp-2 min-h-[48px]">{product.name}</h3>
        
        {product.shortDescription && (
          <p className="text-gray-400 text-sm mb-3 line-clamp-2 min-h-[40px]">
            {product.shortDescription}
          </p>
        )}

        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-2xl font-bold text-[#ea580c]">
              ${product.price.toFixed(2)}
            </div>
            {product.compareAtPrice && product.compareAtPrice > product.price && (
              <div className="text-sm text-gray-500 line-through">
                ${product.compareAtPrice.toFixed(2)}
              </div>
            )}
          </div>
        </div>

        <StandardButton
          variant="primary"
          onClick={(e) => {
            e.stopPropagation();
            onView();
          }}
          icon={<ShoppingCart className="w-4 h-4" />}
          className="w-full"
        >
          View Details
        </StandardButton>
      </div>
    </motion.div>
  );
}

// Product List Item Component
function ProductListItem({ 
  product, 
  onView, 
  onFavorite, 
  onShare, 
  isFavorite 
}: { 
  product: Product;
  onView: () => void;
  onFavorite: () => void;
  onShare: () => void;
  isFavorite: boolean;
}) {
  const discount = product.compareAtPrice && product.compareAtPrice > product.price
    ? Math.round(((product.compareAtPrice - product.price) / product.compareAtPrice) * 100)
    : 0;

  return (
    <div
      onClick={onView}
      className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl p-4 hover:border-[#ea580c] transition-colors cursor-pointer flex gap-4"
    >
      {/* Image */}
      <div className="w-24 h-24 bg-[#1A1A1A] rounded-lg overflow-hidden flex-shrink-0">
        {product.primaryImage ? (
          <img src={product.primaryImage} alt={product.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package className="w-8 h-8 text-gray-600" />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1">
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-white font-semibold">{product.name}</h3>
              {product.isFeatured && (
                <Star className="w-4 h-4 text-yellow-400 fill-current" />
              )}
            </div>
            <p className="text-gray-400 text-sm line-clamp-2">{product.shortDescription || product.description}</p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 ml-4">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onFavorite();
              }}
              className={`p-2 rounded-lg transition-colors ${
                isFavorite 
                  ? 'bg-red-500/20 text-red-400' 
                  : 'hover:bg-[#1A1A1A] text-gray-400 hover:text-white'
              }`}
            >
              <Heart className={`w-4 h-4 ${isFavorite ? 'fill-current' : ''}`} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onShare();
              }}
              className="p-2 hover:bg-[#1A1A1A] rounded-lg text-gray-400 hover:text-white transition-colors"
            >
              <Share2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Price & Button */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div>
              <div className="text-xl font-bold text-[#ea580c]">
                ${product.price.toFixed(2)}
              </div>
              {product.compareAtPrice && product.compareAtPrice > product.price && (
                <div className="text-sm text-gray-500 line-through">
                  ${product.compareAtPrice.toFixed(2)}
                </div>
              )}
            </div>
            {discount > 0 && (
              <span className="px-2 py-1 bg-red-500/20 border border-red-500/30 text-red-400 text-xs rounded-full font-bold">
                Save {discount}%
              </span>
            )}
          </div>

          <CompactStandardButton
            variant="primary"
            onClick={(e) => {
              e.stopPropagation();
              onView();
            }}
            icon={<ChevronRight className="w-4 h-4" />}
          >
            View Details
          </CompactStandardButton>
        </div>
      </div>
    </div>
  );
}