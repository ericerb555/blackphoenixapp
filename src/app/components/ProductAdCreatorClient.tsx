/**
 * Client-Side Product Ad Creator
 * Works without Edge Function - uses local data only
 */

import React, { useState, useEffect } from 'react';
import { Search, ShoppingCart, Sparkles, Download, Eye, Palette, RefreshCw, AlertCircle, Video, Play, Film, Music, Volume2, Headphones } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { getVideoAssets, VideoAsset } from '../lib/videoAssetManager';
import {
  getMusicAssets,
  suggestMusicForProductAd,
  MusicAsset,
  MusicSuggestion,
} from '../lib/musicAssetManager';
import {
  getPlaylists,
  getPlaylistTracks,
  MusicPlaylist,
} from '../lib/musicPlaylistManager';
import {
  trimAudioToVideo,
  generateBeatMarkers,
  BeatMarker,
} from '../lib/audioBeatSync';
import { useStoreProducts, normalizeStoreProduct, StoreCatalogProduct } from '../lib/useStoreProducts';

// Mock template data
const TEMPLATES = [
  {
    id: 'social-square',
    name: 'Social Media Square',
    type: 'social' as const,
    size: { width: 1080, height: 1080 },
    description: 'Perfect for Instagram and Facebook posts',
    mediaType: 'image' as const,
  },
  {
    id: 'social-story',
    name: 'Social Story',
    type: 'social' as const,
    size: { width: 1080, height: 1920 },
    description: 'Instagram and Facebook stories',
    mediaType: 'image' as const,
  },
  {
    id: 'banner-wide',
    name: 'Wide Banner',
    type: 'banner' as const,
    size: { width: 728, height: 90 },
    description: 'Website banner ad',
    mediaType: 'image' as const,
  },
  {
    id: 'banner-rect',
    name: 'Rectangle Banner',
    type: 'banner' as const,
    size: { width: 300, height: 250 },
    description: 'Medium rectangle ad',
    mediaType: 'image' as const,
  },
  // Video Templates
  {
    id: 'video-square',
    name: 'Video Ad - Square',
    type: 'video' as const,
    size: { width: 1080, height: 1080 },
    description: 'Square video for Instagram & Facebook feed',
    mediaType: 'video' as const,
  },
  {
    id: 'video-story',
    name: 'Video Ad - Story/Reels',
    type: 'video' as const,
    size: { width: 1080, height: 1920 },
    description: 'Vertical video for Stories, Reels, TikTok',
    mediaType: 'video' as const,
  },
  {
    id: 'video-landscape',
    name: 'Video Ad - Landscape',
    type: 'video' as const,
    size: { width: 1920, height: 1080 },
    description: 'Landscape video for YouTube & website',
    mediaType: 'video' as const,
  },
  {
    id: 'video-short',
    name: 'Short-Form Video',
    type: 'video' as const,
    size: { width: 1080, height: 1920 },
    description: '15-30 second promotional video',
    mediaType: 'video' as const,
  },
];

// Sample products — shown ONLY when the live store catalog can't be reached.
const MOCK_PRODUCTS: StoreCatalogProduct[] = ([
  {
    id: 'prod-1',
    name: 'Premium Wireless Headphones',
    description: 'High-quality audio with active noise cancellation',
    price: 299.99,
    compareAtPrice: 399.99,
    images: ['https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800'],
    category: 'Electronics',
    source: { provider: 'Demo', lastSynced: new Date().toISOString() }
  },
  {
    id: 'prod-2',
    name: 'Smart Fitness Watch',
    description: 'Track your health and fitness goals',
    price: 249.99,
    compareAtPrice: 349.99,
    images: ['https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800'],
    category: 'Electronics',
    source: { provider: 'Demo', lastSynced: new Date().toISOString() }
  },
  {
    id: 'prod-3',
    name: 'Minimalist Backpack',
    description: 'Stylish and functional everyday carry',
    price: 89.99,
    compareAtPrice: 129.99,
    images: ['https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800'],
    category: 'Fashion',
    source: { provider: 'Demo', lastSynced: new Date().toISOString() }
  },
  {
    id: 'prod-4',
    name: 'Stainless Steel Water Bottle',
    description: 'Keep drinks cold for 24 hours',
    price: 34.99,
    images: ['https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=800'],
    category: 'Lifestyle',
    source: { provider: 'Demo', lastSynced: new Date().toISOString() }
  },
] as any[]).map(normalizeStoreProduct);

interface ProductAdCreatorClientProps {
  onClose?: () => void;
}

export default function ProductAdCreatorClient({ onClose }: ProductAdCreatorClientProps) {
  // Real store catalog — the same list the storefront shows shoppers.
  const { products, loading: productsLoading, live: productsLive, error: productsError, reload: reloadProducts } =
    useStoreProducts(MOCK_PRODUCTS);
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('social-square');
  const [loading, setLoading] = useState(false);
  const [previewAd, setPreviewAd] = useState<any>(null);
  const [videoAssets, setVideoAssets] = useState<VideoAsset[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<VideoAsset | null>(null);
  const [activeView, setActiveView] = useState<'products' | 'videos'>('products');
  
  // Music state
  const [musicAssets, setMusicAssets] = useState<MusicAsset[]>([]);
  const [selectedMusic, setSelectedMusic] = useState<MusicAsset | null>(null);
  const [musicSuggestions, setMusicSuggestions] = useState<MusicSuggestion[]>([]);
  const [showMusicSelector, setShowMusicSelector] = useState(false);
  const [musicVolume, setMusicVolume] = useState(70);
  const [playlists, setPlaylists] = useState<MusicPlaylist[]>([]);
  const [selectedPlaylist, setSelectedPlaylist] = useState<MusicPlaylist | null>(null);
  const [showBeatInfo, setShowBeatInfo] = useState(false);
  const [beatMarkers, setBeatMarkers] = useState<BeatMarker[]>([]);

  useEffect(() => {
    // Load video assets from library
    const assets = getVideoAssets();
    setVideoAssets(assets);
    
    // Load music assets from library
    const music = getMusicAssets();
    setMusicAssets(music);
    
    // Load playlists
    const lists = getPlaylists();
    setPlaylists(lists);
    
    // Auto-switch to video view if template is video and we have videos
    const template = TEMPLATES.find(t => t.id === selectedTemplate);
    if (template?.mediaType === 'video' && assets.length > 0) {
      setActiveView('videos');
    }
    
    // Auto-suggest music for video templates
    if (template?.mediaType === 'video') {
      const firstProduct = products[0];
      if (firstProduct) {
        const suggestions = suggestMusicForProductAd(firstProduct.category, 'video');
        setMusicSuggestions(suggestions);
        
        // Auto-select first product ads playlist if exists
        const productAdsPlaylist = lists.find(p => p.category === 'product-ads');
        if (productAdsPlaylist) {
          setSelectedPlaylist(productAdsPlaylist);
        }
      }
    }
  }, [selectedTemplate]);

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleProduct = (productId: string) => {
    const newSelected = new Set(selectedProducts);
    if (newSelected.has(productId)) {
      newSelected.delete(productId);
    } else {
      newSelected.add(productId);
    }
    setSelectedProducts(newSelected);
  };

  const selectAll = () => {
    setSelectedProducts(new Set(filteredProducts.map(p => p.id)));
  };

  const clearSelection = () => {
    setSelectedProducts(new Set());
  };

  const generateAds = async () => {
    const template = TEMPLATES.find(t => t.id === selectedTemplate);
    
    // Check if video template requires video
    if (template?.mediaType === 'video' && !selectedVideo) {
      toast.error('Please select a video for video ad templates');
      setActiveView('videos');
      return;
    }

    if (selectedProducts.size === 0 && template?.mediaType !== 'video') {
      toast.error('Please select at least one product');
      return;
    }

    setLoading(true);
    
    // Simulate ad generation
    await new Promise(resolve => setTimeout(resolve, 1500));

    const selectedProductsList = products.filter(p => selectedProducts.has(p.id));

    if (template?.mediaType === 'video' && selectedVideo) {
      // Generate video ad preview
      const firstProduct = selectedProductsList[0] || products[0];
      const discount = firstProduct?.compareAtPrice
        ? Math.round(((firstProduct.compareAtPrice - firstProduct.price) / firstProduct.compareAtPrice) * 100)
        : 0;

      setPreviewAd({
        product: firstProduct,
        template,
        video: selectedVideo,
        discount,
        content: {
          headline: firstProduct ? `Get ${firstProduct.name}` : selectedVideo.title,
          subheadline: discount > 0 ? `Save ${discount}% Today!` : 'Limited Time Offer',
          description: firstProduct?.description || 'Promotional video ad',
          cta: 'Shop Now'
        }
      });

      toast.success(`Generated video ad!`, {
        description: `Using ${template?.name} template with ${selectedVideo.title}`
      });
    } else {
      // Generate image ad preview
      const firstProduct = selectedProductsList[0];
      const discount = firstProduct.compareAtPrice
        ? Math.round(((firstProduct.compareAtPrice - firstProduct.price) / firstProduct.compareAtPrice) * 100)
        : 0;

      setPreviewAd({
        product: firstProduct,
        template,
        discount,
        content: {
          headline: `Get ${firstProduct.name}`,
          subheadline: discount > 0 ? `Save ${discount}% Today!` : 'Premium Quality',
          description: firstProduct.description,
          cta: 'Shop Now'
        }
      });

      toast.success(`Generated ${selectedProducts.size} product ads!`, {
        description: `Using ${template?.name} template`
      });
    }

    setLoading(false);
  };

  const downloadAd = () => {
    toast.success('Ad design exported!', {
      description: 'In production, this would export the ad design'
    });
  };

  const currentTemplate = TEMPLATES.find(t => t.id === selectedTemplate);
  const isVideoTemplate = currentTemplate?.mediaType === 'video';

  return (
    <div className="min-h-screen bg-[#0A0A0A] p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                <Sparkles className="w-8 h-8 text-[#ea580c]" />
                Product Ad Creator
                <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                  Client-Side Demo
                </Badge>
              </h1>
              <p className="text-gray-400 mt-2">
                Create professional ads from your product catalog (Demo Mode - No Server Required)
              </p>
            </div>
            {onClose && (
              <Button onClick={onClose} variant="outline">
                Close
              </Button>
            )}
          </div>

          {/* Catalog status — tells you exactly which products you're working with. */}
          <div className={`rounded-lg p-4 border ${productsLive ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-amber-500/10 border-amber-500/30'}`}>
            <div className="flex items-start gap-3">
              {productsLive
                ? <ShoppingCart className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                : <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />}
              <div className="text-sm flex-1 min-w-0">
                <div className={`font-semibold mb-1 ${productsLive ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {productsLoading
                    ? 'Loading your store catalog…'
                    : productsLive
                      ? `Live store catalog — ${products.length} product${products.length !== 1 ? 's' : ''}`
                      : 'Showing sample products'}
                </div>
                <div className="text-gray-300 mb-3 break-words">
                  {productsLive
                    ? 'These are the exact products on your storefront, including synced dropshipper inventory. Add or activate a product in the store and it appears here.'
                    : productsError
                      ? `Could not reach your store catalog: ${productsError}`
                      : 'Your live catalog is unavailable, so sample items are shown instead.'}
                </div>
                <div className="flex gap-2 flex-wrap">
                  <Button onClick={reloadProducts} size="sm" className="bg-[#ea580c] hover:brightness-110 text-white">
                    <RefreshCw className={`w-3 h-3 mr-2 ${productsLoading ? 'animate-spin' : ''}`} />
                    Refresh products
                  </Button>
                  <Button onClick={() => window.open('/product-catalog', '_blank')} size="sm" variant="outline" className="text-xs">
                    Manage store products →
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Product Selection */}
          <div className="lg:col-span-2 space-y-6">
            {/* Template Selection */}
            <Card className="bg-[#1A1A1A] border-gray-800 p-6">
              <div className="flex items-center gap-2 mb-4">
                <Palette className="w-5 h-5 text-[#ea580c]" />
                <h2 className="text-xl font-semibold text-white">Ad Template</h2>
              </div>
              
              <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                <SelectTrigger className="bg-[#0A0A0A] border-gray-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#1A1A1A] border-gray-700">
                  {TEMPLATES.map(template => (
                    <SelectItem key={template.id} value={template.id} className="text-white">
                      <div className="flex items-center gap-2">
                        {template.mediaType === 'video' ? (
                          <Video className="w-4 h-4 text-[#ea580c]" />
                        ) : (
                          <Palette className="w-4 h-4 text-blue-400" />
                        )}
                        <div className="flex flex-col">
                          <span className="font-medium">{template.name}</span>
                          <span className="text-xs text-gray-400">
                            {template.size.width} × {template.size.height}px - {template.description}
                          </span>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Card>

            {/* Tab Switcher for Video Templates */}
            {isVideoTemplate && (
              <Card className="bg-[#1A1A1A] border-gray-800 p-4">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setActiveView('videos')}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg transition font-medium ${
                      activeView === 'videos'
                        ? 'bg-[#ea580c] text-white'
                        : 'bg-[#0A0A0A] text-gray-400 hover:text-white'
                    }`}
                  >
                    <Video className="w-4 h-4" />
                    Video Assets ({videoAssets.length})
                  </button>
                  <button
                    onClick={() => setActiveView('products')}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg transition font-medium ${
                      activeView === 'products'
                        ? 'bg-[#ea580c] text-white'
                        : 'bg-[#0A0A0A] text-gray-400 hover:text-white'
                    }`}
                  >
                    <ShoppingCart className="w-4 h-4" />
                    Products (Optional)
                  </button>
                </div>
              </Card>
            )}

            {/* Video Assets Selection (for video templates) */}
            {isVideoTemplate && activeView === 'videos' && (
              <Card className="bg-[#1A1A1A] border-gray-800 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold text-white">Select Video Asset</h2>
                  <Badge className="bg-[#ea580c]/20 text-[#ea580c] border-[#ea580c]/30">
                    {videoAssets.length} Available
                  </Badge>
                </div>

                {videoAssets.length === 0 ? (
                  <div className="text-center py-12">
                    <Film className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-white mb-2">No Videos Available</h3>
                    <p className="text-gray-400 mb-4">
                      Upload and edit videos in the Enterprise Content Center first
                    </p>
                    <Button
                      onClick={() => toast.info('Navigate to Enterprise Content Center → AI Generator → AI Video Editor')}
                      variant="outline"
                      className="text-sm"
                    >
                      Learn How to Add Videos
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[600px] overflow-y-auto">
                    {videoAssets.map(video => (
                      <div
                        key={video.id}
                        onClick={() => setSelectedVideo(video)}
                        className={`
                          p-4 rounded-lg border-2 cursor-pointer transition-all
                          ${selectedVideo?.id === video.id
                            ? 'border-[#ea580c] bg-[#ea580c]/10'
                            : 'border-gray-700 bg-[#0A0A0A] hover:border-gray-600'
                          }
                        `}
                      >
                        <div className="space-y-3">
                          {/* Video Preview */}
                          <div className="relative w-full h-40 rounded-lg overflow-hidden bg-gray-800">
                            {video.url ? (
                              <>
                                <video
                                  src={video.url}
                                  className="w-full h-full object-cover"
                                  muted
                                />
                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                  <Play className="w-12 h-12 text-white opacity-80" />
                                </div>
                              </>
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Video className="w-12 h-12 text-gray-600" />
                              </div>
                            )}
                          </div>

                          {/* Video Info */}
                          <div>
                            <h3 className="text-white font-medium mb-1 truncate">
                              {video.title}
                            </h3>
                            <p className="text-gray-400 text-sm mb-2">
                              {video.size.width} × {video.size.height}px
                            </p>
                            
                            {/* AI Features Badge */}
                            {video.aiSuggestions && (
                              <div className="flex flex-wrap gap-2">
                                {video.aiSuggestions.trimPoints && video.aiSuggestions.trimPoints.length > 0 && (
                                  <Badge className="text-xs bg-blue-500/20 text-blue-400 border-blue-500/30">
                                    {video.aiSuggestions.trimPoints.length} Trim Points
                                  </Badge>
                                )}
                                {video.aiSuggestions.effects && video.aiSuggestions.effects.length > 0 && (
                                  <Badge className="text-xs bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
                                    {video.aiSuggestions.effects.length} Effects
                                  </Badge>
                                )}
                                {video.aiSuggestions.transitions && video.aiSuggestions.transitions.length > 0 && (
                                  <Badge className="text-xs bg-purple-500/20 text-purple-400 border-purple-500/30">
                                    {video.aiSuggestions.transitions.length} Transitions
                                  </Badge>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Selection Indicator */}
                          <div className="flex items-center justify-between pt-2 border-t border-gray-700">
                            <span className="text-xs text-gray-500">
                              From {video.source === 'content-center' ? 'Content Center' : 'Upload'}
                            </span>
                            {selectedVideo?.id === video.id && (
                              <Badge className="bg-[#ea580c] text-white text-xs">
                                Selected ✓
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            )}

            {/* Product Search & Selection */}
            {(!isVideoTemplate || activeView === 'products') && (
              <Card className="bg-[#1A1A1A] border-gray-800 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold text-white">
                    {isVideoTemplate ? 'Select Products (Optional)' : 'Select Products'}
                  </h2>
                <div className="flex gap-2">
                  <Button
                    onClick={selectAll}
                    variant="outline"
                    size="sm"
                    className="text-xs"
                  >
                    Select All ({filteredProducts.length})
                  </Button>
                  <Button
                    onClick={clearSelection}
                    variant="outline"
                    size="sm"
                    className="text-xs"
                  >
                    Clear
                  </Button>
                </div>
              </div>

              {/* Search */}
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search products..."
                  className="pl-10 bg-[#0A0A0A] border-gray-700 text-white"
                />
              </div>

              {/* Products Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[600px] overflow-y-auto">
                {filteredProducts.map(product => (
                  <div
                    key={product.id}
                    onClick={() => toggleProduct(product.id)}
                    className={`
                      p-4 rounded-lg border-2 cursor-pointer transition-all
                      ${selectedProducts.has(product.id)
                        ? 'border-[#ea580c] bg-[#ea580c]/10'
                        : 'border-gray-700 bg-[#0A0A0A] hover:border-gray-600'
                      }
                    `}
                  >
                    <div className="flex gap-3">
                      {/* Product Image */}
                      <div className="w-20 h-20 rounded-lg overflow-hidden bg-gray-800 flex-shrink-0">
                        {product.images[0] ? (
                          <img
                            src={product.images[0]}
                            alt={product.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <ShoppingCart className="w-8 h-8 text-gray-600" />
                          </div>
                        )}
                      </div>

                      {/* Product Info */}
                      <div className="flex-1 min-w-0">
                        <h3 className="text-white font-medium mb-1 truncate">
                          {product.name}
                        </h3>
                        <p className="text-gray-400 text-sm mb-2 line-clamp-2">
                          {product.description}
                        </p>
                        <div className="flex items-center gap-2">
                          <span className="text-[#ea580c] font-bold">
                            ${product.price}
                          </span>
                          {product.compareAtPrice && (
                            <span className="text-gray-500 line-through text-sm">
                              ${product.compareAtPrice}
                            </span>
                          )}
                        </div>
                        <Badge className="mt-2 text-xs">
                          {product.category}
                        </Badge>
                      </div>

                      {/* Checkbox */}
                      <div className="flex-shrink-0">
                        <div className={`
                          w-6 h-6 rounded border-2 flex items-center justify-center
                          ${selectedProducts.has(product.id)
                            ? 'bg-[#ea580c] border-[#ea580c]'
                            : 'border-gray-600'
                          }
                        `}>
                          {selectedProducts.has(product.id) && (
                            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"/>
                            </svg>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {filteredProducts.length === 0 && (
                <div className="text-center py-12">
                  <ShoppingCart className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-white mb-2">No Products Found</h3>
                  <p className="text-gray-400">
                    {productsLoading
                      ? 'Loading your store catalog…'
                      : products.length === 0
                        ? 'Your store has no active products yet. Add one in Product Catalog and it will show up here.'
                        : 'No products match your search'}
                  </p>
                </div>
              )}
              </Card>
            )}
          </div>

          {/* Right Column - Preview & Actions */}
          <div className="space-y-6">
            {/* Action Card */}
            <Card className="bg-[#1A1A1A] border-gray-800 p-6">
              <h2 className="text-xl font-semibold text-white mb-4">Generate Ads</h2>
              
              <div className="space-y-4">
                {/* Video Selection (for video templates) */}
                {isVideoTemplate && (
                  <div className="bg-[#0A0A0A] rounded-lg p-4">
                    <div className="text-sm text-gray-400 mb-1">Selected Video</div>
                    {selectedVideo ? (
                      <div>
                        <div className="text-lg font-semibold text-white mb-1">
                          {selectedVideo.title}
                        </div>
                        <div className="text-xs text-gray-500">
                          {selectedVideo.size.width} × {selectedVideo.size.height}px
                        </div>
                        {selectedVideo.aiSuggestions && (
                          <Badge className="mt-2 text-xs bg-purple-500/20 text-purple-400 border-purple-500/30">
                            AI Enhanced
                          </Badge>
                        )}
                      </div>
                    ) : (
                      <div className="text-yellow-400 text-sm">
                        No video selected
                      </div>
                    )}
                  </div>
                )}

                {/* Music Selection (for video templates) */}
                {isVideoTemplate && (
                  <div className="bg-[#0A0A0A] rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-sm text-gray-400">Background Music</div>
                      {!showMusicSelector && (
                        <button
                          onClick={() => setShowMusicSelector(!showMusicSelector)}
                          className="text-xs text-[#ea580c] hover:text-[#c2410c] font-medium"
                        >
                          {selectedMusic ? 'Change' : 'Add Music'}
                        </button>
                      )}
                    </div>
                    
                    {selectedMusic ? (
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <Music className="w-4 h-4 text-[#ea580c]" />
                          <div className="text-lg font-semibold text-white">
                            {selectedMusic.title}
                          </div>
                        </div>
                        <div className="text-xs text-gray-500 mb-3">
                          {selectedMusic.mood} • {selectedMusic.genre}
                        </div>
                        <div className="flex items-center gap-2">
                          <Volume2 className="w-3 h-3 text-gray-400" />
                          <input
                            type="range"
                            min="0"
                            max="100"
                            value={musicVolume}
                            onChange={(e) => setMusicVolume(parseInt(e.target.value))}
                            className="flex-1 h-1 bg-[#2A2A2A] rounded appearance-none cursor-pointer accent-[#ea580c]"
                          />
                          <span className="text-xs text-gray-400 w-8">{musicVolume}%</span>
                        </div>
                      </div>
                    ) : (
                      <div className="text-gray-500 text-sm">
                        No music selected (optional)
                      </div>
                    )}

                    {/* Music Selector Popup */}
                    {showMusicSelector && (
                      <div className="mt-4 pt-4 border-t border-[#2A2A2A] space-y-3">
                        {musicSuggestions.length > 0 && (
                          <div>
                            <div className="text-xs font-medium text-purple-400 mb-2 flex items-center gap-1">
                              <Sparkles className="w-3 h-3" />
                              AI Recommended
                            </div>
                            {musicSuggestions.slice(0, 3).map((suggestion) => {
                              const music = musicAssets.find(m => m.id === suggestion.musicId);
                              if (!music) return null;
                              return (
                                <button
                                  key={music.id}
                                  onClick={() => {
                                    setSelectedMusic(music);
                                    setShowMusicSelector(false);
                                    toast.success(`🎵 ${music.title} selected`);
                                  }}
                                  className="w-full flex items-center justify-between p-2 bg-[#1A1A1A] hover:bg-[#2A2A2A] rounded-lg transition text-left"
                                >
                                  <div className="flex items-center gap-2 flex-1 min-w-0">
                                    <Music className="w-3 h-3 text-[#ea580c] flex-shrink-0" />
                                    <div className="min-w-0 flex-1">
                                      <p className="text-xs font-medium text-white truncate">{music.title}</p>
                                      <p className="text-xs text-gray-500">{music.mood}</p>
                                    </div>
                                  </div>
                                  <span className="text-xs text-purple-400 ml-2">{suggestion.confidence}%</span>
                                </button>
                              );
                            })}
                          </div>
                        )}
                        
                        <div>
                          <div className="text-xs font-medium text-gray-400 mb-2">All Music</div>
                          <div className="max-h-48 overflow-y-auto space-y-2">
                            {musicAssets.slice(0, 5).map((music) => (
                              <button
                                key={music.id}
                                onClick={() => {
                                  setSelectedMusic(music);
                                  setShowMusicSelector(false);
                                  toast.success(`🎵 ${music.title} selected`);
                                }}
                                className="w-full flex items-center justify-between p-2 bg-[#1A1A1A] hover:bg-[#2A2A2A] rounded-lg transition text-left"
                              >
                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                  <Music className="w-3 h-3 text-gray-400 flex-shrink-0" />
                                  <div className="min-w-0 flex-1">
                                    <p className="text-xs font-medium text-white truncate">{music.title}</p>
                                    <p className="text-xs text-gray-500">{music.mood} • {music.duration}s</p>
                                  </div>
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>

                        <button
                          onClick={() => setShowMusicSelector(false)}
                          className="w-full text-xs text-gray-400 hover:text-white transition py-2"
                        >
                          Close
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Product Selection */}
                <div className="bg-[#0A0A0A] rounded-lg p-4">
                  <div className="text-sm text-gray-400 mb-1">
                    Selected Products {isVideoTemplate && '(Optional)'}
                  </div>
                  <div className="text-3xl font-bold text-white">
                    {selectedProducts.size}
                  </div>
                </div>

                {/* Template Info */}
                <div className="bg-[#0A0A0A] rounded-lg p-4">
                  <div className="text-sm text-gray-400 mb-1">Template</div>
                  <div className="flex items-center gap-2 mb-1">
                    {isVideoTemplate ? (
                      <Video className="w-4 h-4 text-[#ea580c]" />
                    ) : (
                      <Palette className="w-4 h-4 text-blue-400" />
                    )}
                    <div className="text-lg font-semibold text-white">
                      {currentTemplate?.name}
                    </div>
                  </div>
                  <div className="text-xs text-gray-500">
                    {currentTemplate?.size.width} × {currentTemplate?.size.height}px
                  </div>
                </div>

                <Button
                  onClick={generateAds}
                  disabled={(isVideoTemplate ? !selectedVideo : selectedProducts.size === 0) || loading}
                  className="w-full bg-gradient-to-r from-[#ea580c] to-[#dc2626] hover:opacity-90"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Generate Ads
                    </>
                  )}
                </Button>
              </div>
            </Card>

            {/* Preview Card */}
            {previewAd && (
              <Card className="bg-[#1A1A1A] border-gray-800 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold text-white">Preview</h2>
                  <div className="flex items-center gap-2">
                    {previewAd.video && <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">Video Ad</Badge>}
                    <Eye className="w-5 h-5 text-[#ea580c]" />
                  </div>
                </div>

                {/* Ad Preview */}
                <div className="bg-gradient-to-br from-[#ea580c] to-[#dc2626] rounded-lg p-6 text-white mb-4">
                  {/* Media Preview */}
                  <div className="aspect-square bg-white/10 rounded-lg mb-4 overflow-hidden relative">
                    {previewAd.video ? (
                      <>
                        <video
                          src={previewAd.video.url}
                          controls
                          className="w-full h-full object-cover"
                          poster={previewAd.product?.images?.[0]}
                        />
                        <div className="absolute top-3 left-3 px-3 py-1 bg-black/70 rounded-lg flex items-center gap-2">
                          <Video className="w-4 h-4" />
                          <span className="text-xs font-bold">Video Ad</span>
                        </div>
                      </>
                    ) : (
                      <img
                        src={previewAd.product.images[0]}
                        alt={previewAd.product.name}
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>
                  
                  <h3 className="text-2xl font-bold mb-2">
                    {previewAd.content.headline}
                  </h3>
                  {previewAd.discount > 0 && (
                    <div className="inline-block bg-white text-[#ea580c] px-3 py-1 rounded-full font-bold text-sm mb-3">
                      {previewAd.discount}% OFF
                    </div>
                  )}
                  <p className="text-white/90 mb-4">
                    {previewAd.content.description}
                  </p>
                  <div className="flex items-center justify-between">
                    <div className="text-3xl font-bold">
                      ${previewAd.product.price}
                    </div>
                    <Button className="bg-white text-[#ea580c] hover:bg-gray-100">
                      {previewAd.content.cta}
                    </Button>
                  </div>
                </div>

                <Button
                  onClick={downloadAd}
                  variant="outline"
                  className="w-full"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export Design
                </Button>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
