// Product Detail Modal
// Detailed product view with add to cart functionality
import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
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
  ChevronLeft,
  ChevronRight,
  Store,
  Mail,
  Phone,
  MapPin
} from 'lucide-react';
import { StandardButton } from './ui/button/StandardButton';
import { CompactStandardButton } from './ui/button/StandardButton';
import type { Product } from '../types/ecommerce';
import * as hybridCart from '../utils/hybridCartApi';

interface ProductDetailModalProps {
  product: Product;
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
}

export default function ProductDetailModal({
  product,
  vendor,
  onClose,
  isFavorite,
  onFavorite
}: ProductDetailModalProps) {
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);
  const [addingToCart, setAddingToCart] = useState(false);
  const [addedToCart, setAddedToCart] = useState(false);

  const images = product.images && product.images.length > 0 ? product.images : [product.primaryImage || ''];
  const discount = product.compareAtPrice && product.compareAtPrice > product.price
    ? Math.round(((product.compareAtPrice - product.price) / product.compareAtPrice) * 100)
    : 0;

  const isLowStock = product.trackInventory && product.inventoryQuantity < (product.lowStockThreshold || 10);
  const isOutOfStock = product.trackInventory && product.inventoryQuantity === 0;

  const handleQuantityChange = (delta: number) => {
    const newQuantity = quantity + delta;
    if (newQuantity >= 1) {
      if (!product.trackInventory || newQuantity <= product.inventoryQuantity) {
        setQuantity(newQuantity);
      }
    }
  };

  const handleAddToCart = async () => {
    setAddingToCart(true);
    try {
      const result = await hybridCart.addToCart(product.id, quantity, product);
      
      if (result.success) {
        setAddedToCart(true);
        setTimeout(() => setAddedToCart(false), 3000);
        console.log(`✅ Added ${product.name} to cart (${result.source})`);
      } else {
        alert('Failed to add to cart');
      }
    } catch (error) {
      console.error('Error adding to cart:', error);
      alert('Failed to add to cart');
    } finally {
      setAddingToCart(false);
    }
  };

  const handleShare = () => {
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

  const nextImage = () => {
    setSelectedImage((prev) => (prev + 1) % images.length);
  };

  const prevImage = () => {
    setSelectedImage((prev) => (prev - 1 + images.length) % images.length);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[10000] flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-t-2xl sm:rounded-2xl w-full max-w-6xl max-h-[92vh] overflow-y-auto overscroll-contain my-0 sm:my-8"
      >
        {/* Header */}
        <div className="sticky top-0 bg-[#1A1A1A] border-b border-[#2A2A2A] p-6 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            {vendor.logo && (
              <img src={vendor.logo} alt={vendor.companyName} className="w-10 h-10 rounded-lg object-cover" />
            )}
            <div>
              <div className="text-sm text-gray-400">Sold by</div>
              <div className="text-white font-semibold">{vendor.companyName}</div>
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 p-6">
          {/* Left: Images */}
          <div className="space-y-4">
            {/* Main Image */}
            <div className="relative aspect-square bg-[#0A0A0A] rounded-xl overflow-hidden">
              {images[selectedImage] ? (
                <img
                  src={images[selectedImage]}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Package className="w-24 h-24 text-gray-600" />
                </div>
              )}

              {/* Badges */}
              <div className="absolute top-4 left-4 flex flex-col gap-2">
                {product.isFeatured && (
                  <span className="px-3 py-1.5 bg-yellow-500/20 border border-yellow-500/30 text-yellow-400 text-sm rounded-full flex items-center gap-1">
                    <Star className="w-4 h-4 fill-current" />
                    Featured
                  </span>
                )}
                {discount > 0 && (
                  <span className="px-3 py-1.5 bg-red-500/20 border border-red-500/30 text-red-400 text-sm rounded-full font-bold">
                    Save {discount}%
                  </span>
                )}
              </div>

              {/* Navigation Arrows */}
              {images.length > 1 && (
                <>
                  <button
                    onClick={prevImage}
                    className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-black/50 backdrop-blur-sm hover:bg-black/70 rounded-lg text-white transition-colors"
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </button>
                  <button
                    onClick={nextImage}
                    className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-black/50 backdrop-blur-sm hover:bg-black/70 rounded-lg text-white transition-colors"
                  >
                    <ChevronRight className="w-6 h-6" />
                  </button>
                </>
              )}

              {/* Image Counter */}
              {images.length > 1 && (
                <div className="absolute bottom-4 right-4 px-3 py-1 bg-black/50 backdrop-blur-sm border border-white/10 rounded-full text-white text-sm">
                  {selectedImage + 1} / {images.length}
                </div>
              )}
            </div>

            {/* Thumbnail Strip */}
            {images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-2">
                {images.map((img, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedImage(index)}
                    className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-colors ${
                      selectedImage === index
                        ? 'border-[#ea580c]'
                        : 'border-[#2A2A2A] hover:border-[#ea580c]/50'
                    }`}
                  >
                    {img ? (
                      <img src={img} alt={`View ${index + 1}`} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-[#0A0A0A] flex items-center justify-center">
                        <Package className="w-8 h-8 text-gray-600" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right: Details */}
          <div className="space-y-6">
            {/* Title & Category */}
            <div>
              <div className="text-sm text-gray-400 mb-2">{product.category}</div>
              <h1 className="text-3xl font-bold text-white mb-3">{product.name}</h1>
              {product.shortDescription && (
                <p className="text-lg text-gray-300">{product.shortDescription}</p>
              )}
            </div>

            {/* Price */}
            <div className="flex items-center gap-4">
              <div className="text-4xl font-bold text-[#ea580c]">
                ${product.price.toFixed(2)}
              </div>
              {product.compareAtPrice && product.compareAtPrice > product.price && (
                <div className="text-xl text-gray-500 line-through">
                  ${product.compareAtPrice.toFixed(2)}
                </div>
              )}
            </div>

            {/* Stock Status */}
            {product.trackInventory && (
              <div className="flex items-center gap-2">
                {isOutOfStock ? (
                  <span className="px-3 py-1 bg-red-500/20 border border-red-500/30 text-red-400 rounded-full text-sm font-semibold">
                    Out of Stock
                  </span>
                ) : isLowStock ? (
                  <span className="px-3 py-1 bg-orange-500/20 border border-orange-500/30 text-orange-400 rounded-full text-sm font-semibold">
                    Only {product.inventoryQuantity} left - Order soon!
                  </span>
                ) : (
                  <span className="px-3 py-1 bg-green-500/20 border border-green-500/30 text-green-400 rounded-full text-sm font-semibold flex items-center gap-1">
                    <Check className="w-4 h-4" />
                    In Stock
                  </span>
                )}
              </div>
            )}

            {/* Description */}
            {product.description && (
              <div className="pt-4 border-t border-[#2A2A2A]">
                <h3 className="text-lg font-semibold text-white mb-2">Description</h3>
                <p className="text-gray-300 leading-relaxed whitespace-pre-line">{product.description}</p>
              </div>
            )}

            {/* Tags */}
            {product.tags && product.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {product.tags.map(tag => (
                  <span
                    key={tag}
                    className="px-3 py-1 bg-[#0A0A0A] border border-[#2A2A2A] text-gray-300 rounded-full text-sm"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {/* Quantity Selector */}
            {!isOutOfStock && (
              <div className="pt-4 border-t border-[#2A2A2A]">
                <label className="block text-sm font-medium text-gray-300 mb-3">Quantity</label>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg p-2">
                    <button
                      onClick={() => handleQuantityChange(-1)}
                      disabled={quantity <= 1}
                      className="p-2 hover:bg-[#1A1A1A] rounded text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="text-white font-semibold w-12 text-center">{quantity}</span>
                    <button
                      onClick={() => handleQuantityChange(1)}
                      disabled={product.trackInventory && quantity >= product.inventoryQuantity}
                      className="p-2 hover:bg-[#1A1A1A] rounded text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  {product.trackInventory && (
                    <span className="text-sm text-gray-400">
                      {product.inventoryQuantity} available
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <StandardButton
                variant="primary"
                onClick={handleAddToCart}
                disabled={addingToCart || isOutOfStock || addedToCart}
                icon={addedToCart ? <Check className="w-5 h-5" /> : <ShoppingCart className="w-5 h-5" />}
                className="flex-1"
              >
                {addedToCart ? 'Added to Cart!' : addingToCart ? 'Adding...' : isOutOfStock ? 'Out of Stock' : 'Add to Cart'}
              </StandardButton>

              <button
                onClick={onFavorite}
                className={`p-4 rounded-xl border-2 transition-all ${
                  isFavorite
                    ? 'bg-red-500/10 border-red-500 text-red-400'
                    : 'border-[#2A2A2A] hover:border-[#ea580c] text-gray-400 hover:text-white'
                }`}
              >
                <Heart className={`w-5 h-5 ${isFavorite ? 'fill-current' : ''}`} />
              </button>

              <button
                onClick={handleShare}
                className="p-4 border-2 border-[#2A2A2A] hover:border-[#ea580c] rounded-xl text-gray-400 hover:text-white transition-all"
              >
                <Share2 className="w-5 h-5" />
              </button>
            </div>

            {/* Trust Badges */}
            <div className="grid grid-cols-3 gap-3 pt-6 border-t border-[#2A2A2A]">
              <div className="text-center">
                <Truck className="w-8 h-8 text-[#ea580c] mx-auto mb-2" />
                <div className="text-xs text-gray-400">Fast Shipping</div>
              </div>
              <div className="text-center">
                <Shield className="w-8 h-8 text-[#ea580c] mx-auto mb-2" />
                <div className="text-xs text-gray-400">Secure Payment</div>
              </div>
              <div className="text-center">
                <RefreshCw className="w-8 h-8 text-[#ea580c] mx-auto mb-2" />
                <div className="text-xs text-gray-400">Easy Returns</div>
              </div>
            </div>

            {/* Vendor Contact */}
            <div className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl p-4">
              <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                <Store className="w-5 h-5 text-[#ea580c]" />
                Vendor Information
              </h3>
              <div className="space-y-2 text-sm">
                {vendor.email && (
                  <a href={`mailto:${vendor.email}`} className="flex items-center gap-2 text-gray-300 hover:text-[#ea580c] transition-colors">
                    <Mail className="w-4 h-4" />
                    {vendor.email}
                  </a>
                )}
                {vendor.phone && (
                  <a href={`tel:${vendor.phone}`} className="flex items-center gap-2 text-gray-300 hover:text-[#ea580c] transition-colors">
                    <Phone className="w-4 h-4" />
                    {vendor.phone}
                  </a>
                )}
                {vendor.address && (
                  <div className="flex items-start gap-2 text-gray-300">
                    <MapPin className="w-4 h-4 mt-0.5" />
                    {vendor.address}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}