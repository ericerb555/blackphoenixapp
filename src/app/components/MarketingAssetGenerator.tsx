// Marketing Asset Generator for Product Catalog
// Integrates with Design Studio Pro and AI Generation
import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Sparkles,
  Image as ImageIcon,
  Video,
  Layout,
  Wand2,
  Download,
  Share2,
  Copy,
  Check,
  Loader2,
  X,
  RefreshCw,
  Instagram,
  Facebook,
  Twitter,
  Linkedin,
  Mail,
  Play,
  Palette,
  Zap
} from 'lucide-react';
import type { Product } from '../types/ecommerce';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface MarketingAssetGeneratorProps {
  product: Product;
  onClose: () => void;
  onAssetsGenerated: (assets: string[]) => void;
}

type AssetType = 'product-photo' | 'social-ad' | 'video' | 'banner';
type Platform = 'instagram' | 'facebook' | 'twitter' | 'linkedin' | 'email' | 'web';

interface GeneratedAsset {
  id: string;
  type: AssetType;
  url: string;
  platform?: Platform;
  dimensions: string;
  prompt?: string;
}

export default function MarketingAssetGenerator({
  product,
  onClose,
  onAssetsGenerated
}: MarketingAssetGeneratorProps) {
  const [activeTab, setActiveTab] = useState<AssetType>('product-photo');
  const [selectedPlatforms, setSelectedPlatforms] = useState<Platform[]>(['instagram', 'facebook']);
  const [generating, setGenerating] = useState(false);
  const [generatedAssets, setGeneratedAssets] = useState<GeneratedAsset[]>([]);
  const [customPrompt, setCustomPrompt] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const assetTypes = [
    { id: 'product-photo', label: 'Product Photos', icon: ImageIcon, color: 'blue' },
    { id: 'social-ad', label: 'Social Ads', icon: Share2, color: 'purple' },
    { id: 'video', label: 'Video Ads', icon: Video, color: 'red' },
    { id: 'banner', label: 'Web Banners', icon: Layout, color: 'green' }
  ];

  const platforms = [
    { id: 'instagram', label: 'Instagram', icon: Instagram, dimensions: '1080x1080' },
    { id: 'facebook', label: 'Facebook', icon: Facebook, dimensions: '1200x630' },
    { id: 'twitter', label: 'Twitter', icon: Twitter, dimensions: '1200x675' },
    { id: 'linkedin', label: 'LinkedIn', icon: Linkedin, dimensions: '1200x627' },
    { id: 'email', label: 'Email', icon: Mail, dimensions: '600x400' },
    { id: 'web', label: 'Web Banner', icon: Layout, dimensions: '728x90' }
  ];

  const togglePlatform = (platformId: Platform) => {
    if (selectedPlatforms.includes(platformId)) {
      setSelectedPlatforms(selectedPlatforms.filter(p => p !== platformId));
    } else {
      setSelectedPlatforms([...selectedPlatforms, platformId]);
    }
  };

  const generateAssets = async () => {
    setGenerating(true);
    try {
      // Generate prompt based on product details
      const basePrompt = customPrompt || `Professional product photography of ${product.name}. ${product.description}. High quality, well-lit, clean background, commercial photography style.`;

      // Call AI generation API
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-57095a78/marketing-assets/generate`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            productId: product.id,
            productName: product.name,
            productDescription: product.description,
            assetType: activeTab,
            platforms: selectedPlatforms,
            customPrompt: basePrompt,
            existingImages: product.images
          }),
        }
      );

      const data = await response.json();
      
      if (data.success) {
        setGeneratedAssets(data.assets);
      } else {
        alert('Failed to generate assets. Using demo assets for now.');
        // Demo assets for testing
        generateDemoAssets();
      }
    } catch (error) {
      console.error('Error generating assets:', error);
      // Generate demo assets as fallback
      generateDemoAssets();
    } finally {
      setGenerating(false);
    }
  };

  const generateDemoAssets = () => {
    const demoAssets: GeneratedAsset[] = selectedPlatforms.map((platform, index) => {
      const platformInfo = platforms.find(p => p.id === platform);
      return {
        id: `asset_${Date.now()}_${index}`,
        type: activeTab,
        url: `https://source.unsplash.com/random/1200x1200?${product.category.toLowerCase()},product&sig=${index}`,
        platform,
        dimensions: platformInfo?.dimensions || '1200x1200',
        prompt: customPrompt || `${product.name} - ${platform} ad`
      };
    });
    setGeneratedAssets(demoAssets);
  };

  const copyToClipboard = (url: string, id: string) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const saveAssetsToProduct = () => {
    const assetUrls = generatedAssets.map(a => a.url);
    onAssetsGenerated(assetUrls);
    onClose();
  };

  const openInDesignStudio = () => {
    // Integration with Design Studio Pro
    alert('Opening in Design Studio Pro... (This would launch your design tool with the product info)');
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl w-full max-w-6xl max-h-[90vh] overflow-y-auto my-8"
      >
        {/* Header */}
        <div className="sticky top-0 bg-[#1A1A1A] border-b border-[#2A2A2A] p-6 flex items-start justify-between z-10">
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              Marketing Asset Generator
            </h2>
            <p className="text-gray-400 text-sm mt-2">
              Create stunning marketing materials for <span className="text-[#ea580c] font-semibold">{product.name}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-[#2A2A2A] rounded-lg transition-colors text-gray-400 hover:text-white"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Asset Type Tabs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {assetTypes.map((type) => {
              const Icon = type.icon;
              const isActive = activeTab === type.id;
              return (
                <button
                  key={type.id}
                  onClick={() => setActiveTab(type.id as AssetType)}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    isActive
                      ? 'bg-[#ea580c]/10 border-[#ea580c] shadow-lg shadow-[#ea580c]/20'
                      : 'bg-[#0A0A0A] border-[#2A2A2A] hover:border-[#ea580c]/50'
                  }`}
                >
                  <Icon className={`w-6 h-6 mb-2 ${isActive ? 'text-[#ea580c]' : 'text-gray-400'}`} />
                  <div className={`text-sm font-semibold ${isActive ? 'text-white' : 'text-gray-400'}`}>
                    {type.label}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Product Info Card */}
          <div className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl p-4 flex items-center gap-4">
            <div className="w-20 h-20 bg-[#1A1A1A] rounded-lg overflow-hidden flex-shrink-0">
              {product.primaryImage ? (
                <img src={product.primaryImage} alt={product.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <ImageIcon className="w-8 h-8 text-gray-600" />
                </div>
              )}
            </div>
            <div className="flex-1">
              <h3 className="text-white font-semibold">{product.name}</h3>
              <p className="text-gray-400 text-sm line-clamp-2">{product.description}</p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-[#ea580c]">${product.price.toFixed(2)}</div>
              <div className="text-sm text-gray-400">{product.category}</div>
            </div>
          </div>

          {/* Platform Selection */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <Share2 className="w-5 h-5 text-[#ea580c]" />
              Select Platforms
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {platforms.map((platform) => {
                const Icon = platform.icon;
                const isSelected = selectedPlatforms.includes(platform.id as Platform);
                return (
                  <button
                    key={platform.id}
                    onClick={() => togglePlatform(platform.id as Platform)}
                    className={`p-4 rounded-xl border transition-all ${
                      isSelected
                        ? 'bg-[#ea580c]/10 border-[#ea580c]'
                        : 'bg-[#0A0A0A] border-[#2A2A2A] hover:border-[#ea580c]/30'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={`w-5 h-5 ${isSelected ? 'text-[#ea580c]' : 'text-gray-400'}`} />
                      <div className="text-left">
                        <div className={`text-sm font-semibold ${isSelected ? 'text-white' : 'text-gray-400'}`}>
                          {platform.label}
                        </div>
                        <div className="text-xs text-gray-500">{platform.dimensions}</div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Prompt */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <Wand2 className="w-5 h-5 text-[#ea580c]" />
              Customize Your Assets (Optional)
            </h3>
            <textarea
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              rows={3}
              className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#ea580c] resize-none"
              placeholder="Add custom instructions for AI generation (e.g., 'Make it vibrant and colorful', 'Add text overlay with product benefits', 'Professional studio lighting')"
            />
          </div>

          {/* Generate Button */}
          <div className="flex gap-3">
            <button
              onClick={generateAssets}
              disabled={generating || selectedPlatforms.length === 0}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-[#ea580c] to-[#dc2626] text-white rounded-lg font-semibold transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90"
            >
              {generating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5" />}
              {generating ? 'Generating...' : `Generate ${selectedPlatforms.length} Asset${selectedPlatforms.length !== 1 ? 's' : ''}`}
            </button>
            
            <button
              onClick={openInDesignStudio}
              className="px-6 py-3 bg-[#2A2A2A] hover:bg-[#3A3A3A] border border-[#2A2A2A] text-gray-300 rounded-lg font-semibold transition-colors flex items-center gap-2"
            >
              <Palette className="w-5 h-5" />
              Design Studio Pro
            </button>
          </div>

          {/* Generated Assets Grid */}
          {generatedAssets.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-[#ea580c]" />
                  Generated Assets ({generatedAssets.length})
                </h3>
                <button
                  onClick={generateAssets}
                  disabled={generating}
                  className="px-3 py-1.5 bg-[#2A2A2A] hover:bg-[#3A3A3A] border border-[#2A2A2A] text-gray-300 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <RefreshCw className="w-4 h-4" />
                  Regenerate
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {generatedAssets.map((asset) => {
                  const platformInfo = platforms.find(p => p.id === asset.platform);
                  const Icon = platformInfo?.icon || ImageIcon;
                  const isCopied = copiedId === asset.id;

                  return (
                    <motion.div
                      key={asset.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl overflow-hidden hover:border-[#ea580c]/50 transition-colors group"
                    >
                      {/* Asset Preview */}
                      <div className="relative aspect-video bg-[#1A1A1A] overflow-hidden">
                        {asset.type === 'video' ? (
                          <div className="w-full h-full flex items-center justify-center">
                            <Play className="w-16 h-16 text-[#ea580c] opacity-50 group-hover:opacity-100 transition-opacity" />
                            <img src={asset.url} alt="Video thumbnail" className="absolute inset-0 w-full h-full object-cover opacity-50" />
                          </div>
                        ) : (
                          <img
                            src={asset.url}
                            alt={`${asset.platform} asset`}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        )}
                        
                        {/* Platform Badge */}
                        <div className="absolute top-2 left-2 px-2 py-1 bg-black/70 backdrop-blur-sm border border-white/10 rounded-full flex items-center gap-1">
                          <Icon className="w-3 h-3 text-white" />
                          <span className="text-xs text-white">{platformInfo?.label}</span>
                        </div>

                        {/* Dimensions */}
                        <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/70 backdrop-blur-sm border border-white/10 rounded text-xs text-white">
                          {asset.dimensions}
                        </div>
                      </div>

                      {/* Asset Actions */}
                      <div className="p-3 space-y-2">
                        <div className="flex gap-2">
                          <button
                            onClick={() => window.open(asset.url, '_blank')}
                            className="flex-1 px-3 py-2 bg-[#1A1A1A] hover:bg-[#2A2A2A] border border-[#2A2A2A] text-white rounded-lg transition-colors flex items-center justify-center gap-2 text-sm"
                          >
                            <Download className="w-4 h-4" />
                            Download
                          </button>
                          <button
                            onClick={() => copyToClipboard(asset.url, asset.id)}
                            className="px-3 py-2 bg-[#1A1A1A] hover:bg-[#2A2A2A] border border-[#2A2A2A] text-white rounded-lg transition-colors"
                            title="Copy URL"
                          >
                            {isCopied ? (
                              <Check className="w-4 h-4 text-green-400" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              {/* Save to Product */}
              <div className="flex items-center justify-between p-4 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl">
                <div>
                  <h4 className="text-white font-semibold mb-1">Add these assets to your product?</h4>
                  <p className="text-sm text-gray-400">
                    These images will be added to your product gallery
                  </p>
                </div>
                <button
                  onClick={saveAssetsToProduct}
                  className="px-6 py-3 bg-gradient-to-r from-[#ea580c] to-[#dc2626] text-white rounded-lg font-semibold transition-colors flex items-center gap-2 hover:opacity-90"
                >
                  <Check className="w-4 h-4" />
                  Add to Product
                </button>
              </div>
            </div>
          )}

          {/* Tips */}
          <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/30 rounded-xl p-4">
            <h4 className="text-white font-semibold mb-2 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-400" />
              Pro Tips
            </h4>
            <ul className="text-sm text-gray-300 space-y-1">
              <li>• Select multiple platforms to generate optimized assets for each</li>
              <li>• Use custom prompts to add specific styling or text overlays</li>
              <li>• Generated videos are perfect for Instagram Reels and Facebook Stories</li>
              <li>• Save assets to your product to use them in your storefront</li>
              <li>• Open Design Studio Pro for advanced customization</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-[#1A1A1A] border-t border-[#2A2A2A] p-6 flex items-center justify-between">
          <div className="text-sm text-gray-400">
            Powered by AI • Design Studio Pro Integration
          </div>
          <button
            onClick={onClose}
            className="px-6 py-3 bg-[#0A0A0A] hover:bg-[#2A2A2A] border border-[#2A2A2A] text-white rounded-lg font-semibold transition-colors"
          >
            Close
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}