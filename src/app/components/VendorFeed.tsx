import { useState } from 'react';
import {
  Play, Heart, Bookmark, Share2, Eye, MessageCircle, ExternalLink,
  ChevronLeft, ChevronRight, Filter, Grid, List, Search, X,
  Star, MapPin, Phone, Mail, Clock, TrendingUp, Award, CheckCircle
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { PrimaryButton, IconButton } from './ui/button/index';

interface VendorPromotion {
  id: string;
  vendorId: string;
  vendorName: string;
  vendorLogo: string;
  vendorRating: number;
  vendorVerified: boolean;
  category: string;
  title: string;
  description: string;
  videoUrl: string;
  thumbnailUrl: string;
  duration: string;
  views: number;
  likes: number;
  comments: number;
  promotionType: 'discount' | 'new-product' | 'seasonal' | 'limited-time';
  discountAmount?: string;
  validUntil?: string;
  location: string;
  tags: string[];
  isLiked: boolean;
  isSaved: boolean;
  postedAt: string;
}

interface VendorFeedProps {
  portalType?: 'customer' | 'subcontractor' | 'employee' | 'technician';
  compact?: boolean;
}

export default function VendorFeed({ portalType = 'customer', compact = false }: VendorFeedProps) {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPromo, setSelectedPromo] = useState<VendorPromotion | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  // Mock vendor promotions data
  const promotions: VendorPromotion[] = [
    {
      id: 'PROMO-001',
      vendorId: 'V001',
      vendorName: 'Premier Paint Supply',
      vendorLogo: '🎨',
      vendorRating: 4.8,
      vendorVerified: true,
      category: 'paint',
      title: 'Spring Sale - 40% Off Premium Paints',
      description: 'Get 40% off all premium interior and exterior paints. Limited time offer!',
      videoUrl: 'https://example.com/promo1.mp4',
      thumbnailUrl: 'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=400',
      duration: '0:45',
      views: 12543,
      likes: 892,
      comments: 134,
      promotionType: 'discount',
      discountAmount: '40%',
      validUntil: '2026-02-15',
      location: 'Multiple Locations',
      tags: ['paint', 'discount', 'spring-sale'],
      isLiked: false,
      isSaved: false,
      postedAt: '2 hours ago'
    },
    {
      id: 'PROMO-002',
      vendorId: 'V002',
      vendorName: 'Elite Tools & Hardware',
      vendorLogo: '🔨',
      vendorRating: 4.9,
      vendorVerified: true,
      category: 'tools',
      title: 'New Cordless Power Tool Line',
      description: 'Introducing our latest professional-grade cordless tools with 5-year warranty',
      videoUrl: 'https://example.com/promo2.mp4',
      thumbnailUrl: 'https://images.unsplash.com/photo-1530124566582-a618bc2615dc?w=400',
      duration: '1:20',
      views: 8932,
      likes: 654,
      comments: 89,
      promotionType: 'new-product',
      validUntil: '2026-03-01',
      location: 'Downtown Showroom',
      tags: ['tools', 'cordless', 'new-arrival'],
      isLiked: true,
      isSaved: false,
      postedAt: '5 hours ago'
    },
    {
      id: 'PROMO-003',
      vendorId: 'V003',
      vendorName: 'Luxury Flooring Co.',
      vendorLogo: '🏠',
      vendorRating: 4.7,
      vendorVerified: true,
      category: 'flooring',
      title: 'Free Installation on Hardwood',
      description: 'Order premium hardwood flooring and get professional installation completely free',
      videoUrl: 'https://example.com/promo3.mp4',
      thumbnailUrl: 'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=400',
      duration: '0:55',
      views: 15234,
      likes: 1243,
      comments: 201,
      promotionType: 'limited-time',
      validUntil: '2026-01-31',
      location: 'All Locations',
      tags: ['flooring', 'hardwood', 'free-installation'],
      isLiked: false,
      isSaved: true,
      postedAt: '1 day ago'
    },
    {
      id: 'PROMO-004',
      vendorId: 'V004',
      vendorName: 'Modern Kitchen & Bath',
      vendorLogo: '🚰',
      vendorRating: 4.9,
      vendorVerified: true,
      category: 'fixtures',
      title: 'Designer Faucets - Buy 2 Get 1 Free',
      description: 'Premium designer faucets and fixtures. Special BOGO offer this week only!',
      videoUrl: 'https://example.com/promo4.mp4',
      thumbnailUrl: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=400',
      duration: '1:05',
      views: 9876,
      likes: 721,
      comments: 156,
      promotionType: 'seasonal',
      discountAmount: 'BOGO',
      validUntil: '2026-02-01',
      location: 'West Side Store',
      tags: ['fixtures', 'faucets', 'bogo'],
      isLiked: false,
      isSaved: false,
      postedAt: '3 days ago'
    },
    {
      id: 'PROMO-005',
      vendorId: 'V005',
      vendorName: 'Pro Electrical Supply',
      vendorLogo: '⚡',
      vendorRating: 4.8,
      vendorVerified: true,
      category: 'electrical',
      title: 'Smart Home Package - 30% Off',
      description: 'Complete smart home electrical package with installation support included',
      videoUrl: 'https://example.com/promo5.mp4',
      thumbnailUrl: 'https://images.unsplash.com/photo-1558002038-1055907df827?w=400',
      duration: '1:30',
      views: 11234,
      likes: 876,
      comments: 167,
      promotionType: 'discount',
      discountAmount: '30%',
      validUntil: '2026-02-28',
      location: 'Online & In-Store',
      tags: ['electrical', 'smart-home', 'discount'],
      isLiked: true,
      isSaved: true,
      postedAt: '1 week ago'
    },
    {
      id: 'PROMO-006',
      vendorId: 'V006',
      vendorName: 'Outdoor Living Pros',
      vendorLogo: '🌳',
      vendorRating: 4.6,
      vendorVerified: false,
      category: 'outdoor',
      title: 'Deck & Patio Materials Sale',
      description: 'Premium composite decking and patio materials at unbeatable prices',
      videoUrl: 'https://example.com/promo6.mp4',
      thumbnailUrl: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=400',
      duration: '0:50',
      views: 7654,
      likes: 543,
      comments: 78,
      promotionType: 'seasonal',
      discountAmount: '25%',
      validUntil: '2026-03-15',
      location: 'North Location',
      tags: ['outdoor', 'decking', 'patio'],
      isLiked: false,
      isSaved: false,
      postedAt: '2 weeks ago'
    }
  ];

  const categories = [
    { id: 'all', label: 'All Vendors', count: promotions.length },
    { id: 'paint', label: 'Paint & Supplies', count: promotions.filter(p => p.category === 'paint').length },
    { id: 'tools', label: 'Tools & Hardware', count: promotions.filter(p => p.category === 'tools').length },
    { id: 'flooring', label: 'Flooring', count: promotions.filter(p => p.category === 'flooring').length },
    { id: 'fixtures', label: 'Fixtures', count: promotions.filter(p => p.category === 'fixtures').length },
    { id: 'electrical', label: 'Electrical', count: promotions.filter(p => p.category === 'electrical').length },
    { id: 'outdoor', label: 'Outdoor', count: promotions.filter(p => p.category === 'outdoor').length }
  ];

  const filteredPromotions = promotions.filter(promo => {
    const matchesSearch = promo.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         promo.vendorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         promo.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || promo.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleLike = (promoId: string) => {
    toast.success('Added to favorites!');
  };

  const handleSave = (promoId: string) => {
    toast.success('Saved for later!');
  };

  const handleShare = (promo: VendorPromotion) => {
    toast.success(`Sharing ${promo.title}...`);
  };

  const handleContactVendor = (promo: VendorPromotion) => {
    toast.success(`Opening contact for ${promo.vendorName}...`);
  };

  const getPromotionBadge = (type: string) => {
    const badges = {
      'discount': { label: 'Discount', color: 'bg-green-600' },
      'new-product': { label: 'New', color: 'bg-blue-600' },
      'seasonal': { label: 'Seasonal', color: 'bg-purple-600' },
      'limited-time': { label: 'Limited Time', color: 'bg-red-600' }
    };
    return badges[type as keyof typeof badges] || badges.discount;
  };

  if (compact) {
    return (
      <div className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-orange-600" />
            Vendor Promotions
          </h3>
          <button className="text-sm text-orange-600 hover:text-orange-500">
            View All
          </button>
        </div>

        <div className="space-y-3">
          {promotions.slice(0, 3).map((promo) => (
            <div
              key={promo.id}
              className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg p-3 hover:border-orange-600/30 transition cursor-pointer"
              onClick={() => setSelectedPromo(promo)}
            >
              <div className="flex gap-3">
                <div className="relative flex-shrink-0">
                  <img
                    src={promo.thumbnailUrl}
                    alt={promo.title}
                    className="w-20 h-20 rounded-lg object-cover"
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-lg">
                    <Play className="w-6 h-6 text-white" />
                  </div>
                  <div className="absolute bottom-1 right-1 bg-black/80 text-white text-xs px-1 rounded">
                    {promo.duration}
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h4 className="text-sm font-medium text-white truncate">
                      {promo.title}
                    </h4>
                    {promo.discountAmount && (
                      <span className="text-xs font-bold text-green-500 flex-shrink-0">
                        {promo.discountAmount}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-xs text-gray-400 mb-2">
                    <span className="flex items-center gap-1">
                      {promo.vendorLogo} {promo.vendorName}
                    </span>
                    {promo.vendorVerified && (
                      <CheckCircle className="w-3 h-3 text-blue-500" />
                    )}
                  </div>

                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <Eye className="w-3 h-3" />
                      {promo.views.toLocaleString()}
                    </span>
                    <span className="flex items-center gap-1">
                      <Heart className="w-3 h-3" />
                      {promo.likes.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-600 to-orange-700 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            Vendor Promotions
          </h2>
          <p className="text-gray-400 mt-1">
            Exclusive deals and new products from our verified vendors
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 rounded-lg transition ${
              viewMode === 'grid'
                ? 'bg-orange-600 text-white'
                : 'bg-[#1A1A1A] text-gray-400 hover:text-white'
            }`}
          >
            <Grid className="w-5 h-5" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 rounded-lg transition ${
              viewMode === 'list'
                ? 'bg-orange-600 text-white'
                : 'bg-[#1A1A1A] text-gray-400 hover:text-white'
            }`}
          >
            <List className="w-5 h-5" />
          </button>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="p-2 rounded-lg bg-[#1A1A1A] text-gray-400 hover:text-white transition"
          >
            <Filter className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search promotions, vendors..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl pl-12 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-orange-600"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Category Filters */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`px-4 py-2 rounded-lg whitespace-nowrap transition ${
                selectedCategory === category.id
                  ? 'bg-orange-600 text-white'
                  : 'bg-[#1A1A1A] text-gray-400 hover:text-white border border-[#2A2A2A]'
              }`}
            >
              {category.label}
              <span className="ml-2 text-xs opacity-70">({category.count})</span>
            </button>
          ))}
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-4">
          <div className="text-2xl font-bold text-white">
            {filteredPromotions.length}
          </div>
          <div className="text-sm text-gray-400">Active Promos</div>
        </div>
        <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-4">
          <div className="text-2xl font-bold text-white">
            {promotions.filter(p => p.vendorVerified).length}
          </div>
          <div className="text-sm text-gray-400">Verified Vendors</div>
        </div>
        <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-4">
          <div className="text-2xl font-bold text-orange-600">
            {promotions.reduce((sum, p) => sum + p.likes, 0).toLocaleString()}
          </div>
          <div className="text-sm text-gray-400">Total Likes</div>
        </div>
        <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-4">
          <div className="text-2xl font-bold text-orange-600">
            Up to 40%
          </div>
          <div className="text-sm text-gray-400">Max Discount</div>
        </div>
      </div>

      {/* Promotions Grid/List */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPromotions.map((promo) => {
            const badge = getPromotionBadge(promo.promotionType);
            return (
              <div
                key={promo.id}
                className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl overflow-hidden hover:border-orange-600/50 transition group cursor-pointer"
                onClick={() => setSelectedPromo(promo)}
              >
                {/* Thumbnail */}
                <div className="relative aspect-video">
                  <img
                    src={promo.thumbnailUrl}
                    alt={promo.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                  
                  {/* Play Button */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                    <div className="w-16 h-16 rounded-full bg-orange-600 flex items-center justify-center">
                      <Play className="w-8 h-8 text-white ml-1" />
                    </div>
                  </div>

                  {/* Duration */}
                  <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-2 py-1 rounded">
                    {promo.duration}
                  </div>

                  {/* Promotion Badge */}
                  <div className={`absolute top-2 left-2 ${badge.color} text-white text-xs px-2 py-1 rounded-lg font-medium`}>
                    {badge.label}
                  </div>

                  {/* Discount Amount */}
                  {promo.discountAmount && (
                    <div className="absolute top-2 right-2 bg-green-600 text-white text-sm px-3 py-1 rounded-lg font-bold">
                      {promo.discountAmount} OFF
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="p-4">
                  {/* Vendor Info */}
                  <div className="flex items-center gap-2 mb-3">
                    <div className="text-2xl">{promo.vendorLogo}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-white truncate">
                          {promo.vendorName}
                        </span>
                        {promo.vendorVerified && (
                          <CheckCircle className="w-4 h-4 text-blue-500 flex-shrink-0" />
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-gray-400">
                        <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                        {promo.vendorRating}
                      </div>
                    </div>
                  </div>

                  {/* Title */}
                  <h3 className="text-base font-semibold text-white mb-2 line-clamp-2">
                    {promo.title}
                  </h3>

                  {/* Description */}
                  <p className="text-sm text-gray-400 mb-3 line-clamp-2">
                    {promo.description}
                  </p>

                  {/* Stats */}
                  <div className="flex items-center justify-between mb-3 pb-3 border-b border-[#2A2A2A]">
                    <div className="flex items-center gap-3 text-sm text-gray-400">
                      <span className="flex items-center gap-1">
                        <Eye className="w-4 h-4" />
                        {promo.views.toLocaleString()}
                      </span>
                      <span className="flex items-center gap-1">
                        <Heart className={`w-4 h-4 ${promo.isLiked ? 'fill-red-500 text-red-500' : ''}`} />
                        {promo.likes.toLocaleString()}
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageCircle className="w-4 h-4" />
                        {promo.comments}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleLike(promo.id);
                      }}
                      className={`flex-1 py-2 rounded-lg transition ${
                        promo.isLiked
                          ? 'bg-red-600 text-white'
                          : 'bg-[#0A0A0A] text-gray-400 hover:text-white'
                      }`}
                    >
                      <Heart className={`w-4 h-4 mx-auto ${promo.isLiked ? 'fill-current' : ''}`} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSave(promo.id);
                      }}
                      className={`flex-1 py-2 rounded-lg transition ${
                        promo.isSaved
                          ? 'bg-orange-600 text-white'
                          : 'bg-[#0A0A0A] text-gray-400 hover:text-white'
                      }`}
                    >
                      <Bookmark className={`w-4 h-4 mx-auto ${promo.isSaved ? 'fill-current' : ''}`} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleShare(promo);
                      }}
                      className="flex-1 py-2 rounded-lg bg-[#0A0A0A] text-gray-400 hover:text-white transition"
                    >
                      <Share2 className="w-4 h-4 mx-auto" />
                    </button>
                  </div>

                  {/* Valid Until */}
                  {promo.validUntil && (
                    <div className="mt-3 flex items-center gap-2 text-xs text-orange-500">
                      <Clock className="w-3 h-3" />
                      Valid until {new Date(promo.validUntil).toLocaleDateString()}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredPromotions.map((promo) => {
            const badge = getPromotionBadge(promo.promotionType);
            return (
              <div
                key={promo.id}
                className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-4 hover:border-orange-600/50 transition cursor-pointer"
                onClick={() => setSelectedPromo(promo)}
              >
                <div className="flex gap-4">
                  {/* Thumbnail */}
                  <div className="relative flex-shrink-0">
                    <img
                      src={promo.thumbnailUrl}
                      alt={promo.title}
                      className="w-48 h-32 rounded-lg object-cover"
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-lg opacity-0 hover:opacity-100 transition">
                      <Play className="w-10 h-10 text-white" />
                    </div>
                    <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-2 py-1 rounded">
                      {promo.duration}
                    </div>
                    <div className={`absolute top-2 left-2 ${badge.color} text-white text-xs px-2 py-1 rounded`}>
                      {badge.label}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-white mb-1">
                          {promo.title}
                        </h3>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-lg">{promo.vendorLogo}</span>
                          <span className="text-sm text-gray-400">{promo.vendorName}</span>
                          {promo.vendorVerified && (
                            <CheckCircle className="w-4 h-4 text-blue-500" />
                          )}
                          <div className="flex items-center gap-1 text-sm text-gray-400">
                            <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                            {promo.vendorRating}
                          </div>
                        </div>
                      </div>
                      {promo.discountAmount && (
                        <div className="bg-green-600 text-white text-lg px-4 py-2 rounded-lg font-bold">
                          {promo.discountAmount} OFF
                        </div>
                      )}
                    </div>

                    <p className="text-sm text-gray-400 mb-3">
                      {promo.description}
                    </p>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 text-sm text-gray-400">
                        <span className="flex items-center gap-1">
                          <Eye className="w-4 h-4" />
                          {promo.views.toLocaleString()}
                        </span>
                        <span className="flex items-center gap-1">
                          <Heart className="w-4 h-4" />
                          {promo.likes.toLocaleString()}
                        </span>
                        <span className="flex items-center gap-1">
                          <MessageCircle className="w-4 h-4" />
                          {promo.comments}
                        </span>
                        {promo.validUntil && (
                          <span className="flex items-center gap-1 text-orange-500">
                            <Clock className="w-4 h-4" />
                            Until {new Date(promo.validUntil).toLocaleDateString()}
                          </span>
                        )}
                      </div>

                      <PrimaryButton
                        onClick={(e) => {
                          e.stopPropagation();
                          handleContactVendor(promo);
                        }}
                        size="sm"
                      >
                        Contact Vendor
                      </PrimaryButton>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Video Modal */}
      {selectedPromo && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4">
          <div className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 bg-[#0A0A0A] border-b border-[#2A2A2A] p-4 flex items-center justify-between z-10">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{selectedPromo.vendorLogo}</span>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold text-white">
                      {selectedPromo.vendorName}
                    </h3>
                    {selectedPromo.vendorVerified && (
                      <CheckCircle className="w-5 h-5 text-blue-500" />
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-sm text-gray-400">
                    <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                    {selectedPromo.vendorRating}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSelectedPromo(null)}
                className="p-2 hover:bg-[#1A1A1A] rounded-lg transition"
              >
                <X className="w-6 h-6 text-gray-400" />
              </button>
            </div>

            {/* Video Player */}
            <div className="aspect-video bg-black relative">
              <img
                src={selectedPromo.thumbnailUrl}
                alt={selectedPromo.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-20 h-20 rounded-full bg-orange-600 flex items-center justify-center cursor-pointer hover:bg-orange-700 transition">
                  <Play className="w-10 h-10 text-white ml-1" />
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Title and Description */}
              <div>
                <div className="flex items-start justify-between gap-4 mb-3">
                  <h2 className="text-2xl font-bold text-white">
                    {selectedPromo.title}
                  </h2>
                  {selectedPromo.discountAmount && (
                    <div className="bg-green-600 text-white text-xl px-4 py-2 rounded-lg font-bold">
                      {selectedPromo.discountAmount} OFF
                    </div>
                  )}
                </div>
                <p className="text-gray-400">
                  {selectedPromo.description}
                </p>
              </div>

              {/* Stats */}
              <div className="flex items-center gap-6 text-gray-400">
                <span className="flex items-center gap-2">
                  <Eye className="w-5 h-5" />
                  {selectedPromo.views.toLocaleString()} views
                </span>
                <span className="flex items-center gap-2">
                  <Heart className="w-5 h-5" />
                  {selectedPromo.likes.toLocaleString()} likes
                </span>
                <span className="flex items-center gap-2">
                  <MessageCircle className="w-5 h-5" />
                  {selectedPromo.comments} comments
                </span>
                <span className="text-gray-500">• {selectedPromo.postedAt}</span>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleLike(selectedPromo.id)}
                  className={`flex-1 py-3 rounded-xl font-medium transition flex items-center justify-center gap-2 ${
                    selectedPromo.isLiked
                      ? 'bg-red-600 text-white'
                      : 'bg-[#1A1A1A] text-gray-400 hover:text-white'
                  }`}
                >
                  <Heart className={`w-5 h-5 ${selectedPromo.isLiked ? 'fill-current' : ''}`} />
                  {selectedPromo.isLiked ? 'Liked' : 'Like'}
                </button>
                <button
                  onClick={() => handleSave(selectedPromo.id)}
                  className={`flex-1 py-3 rounded-xl font-medium transition flex items-center justify-center gap-2 ${
                    selectedPromo.isSaved
                      ? 'bg-orange-600 text-white'
                      : 'bg-[#1A1A1A] text-gray-400 hover:text-white'
                  }`}
                >
                  <Bookmark className={`w-5 h-5 ${selectedPromo.isSaved ? 'fill-current' : ''}`} />
                  {selectedPromo.isSaved ? 'Saved' : 'Save'}
                </button>
                <button
                  onClick={() => handleShare(selectedPromo)}
                  className="flex-1 py-3 rounded-xl bg-[#1A1A1A] text-gray-400 hover:text-white font-medium transition flex items-center justify-center gap-2"
                >
                  <Share2 className="w-5 h-5" />
                  Share
                </button>
              </div>

              {/* Vendor Info */}
              <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6">
                <h4 className="text-lg font-semibold text-white mb-4">
                  Vendor Information
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-2 text-gray-400">
                    <MapPin className="w-5 h-5 text-orange-600" />
                    {selectedPromo.location}
                  </div>
                  {selectedPromo.validUntil && (
                    <div className="flex items-center gap-2 text-orange-500">
                      <Clock className="w-5 h-5" />
                      Valid until {new Date(selectedPromo.validUntil).toLocaleDateString()}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-3 mt-4 pt-4 border-t border-[#2A2A2A]">
                  <PrimaryButton
                    icon={<Phone />}
                    onClick={() => handleContactVendor(selectedPromo)}
                    fullWidth
                  >
                    Contact Vendor
                  </PrimaryButton>
                  <button className="flex-1 py-3 bg-[#0A0A0A] hover:bg-[#2A2A2A] border border-[#2A2A2A] text-white rounded-xl font-medium transition flex items-center justify-center gap-2">
                    <ExternalLink className="w-5 h-5" />
                    View Profile
                  </button>
                </div>
              </div>

              {/* Tags */}
              <div className="flex flex-wrap gap-2">
                {selectedPromo.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-3 py-1 bg-[#1A1A1A] border border-[#2A2A2A] rounded-full text-sm text-gray-400"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {filteredPromotions.length === 0 && (
        <div className="text-center py-12">
          <TrendingUp className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">
            No promotions found
          </h3>
          <p className="text-gray-400">
            Try adjusting your search or filters
          </p>
        </div>
      )}
    </div>
  );
}