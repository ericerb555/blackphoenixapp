/**
 * Product Ad Creator - Create ads from dropshipper products
 * Auto-generates ad content with customization options
 * Auto-switches to client-side demo if server unavailable
 */

import { useState, useEffect } from 'react';
import {
  Sparkles, Image, Type, DollarSign, Tag, Palette, Layout, Download,
  Copy, Share2, Eye, EyeOff, RefreshCw, Check, X, Plus, Edit, Trash2,
  ChevronDown, ChevronUp, Grid, List, Search, Filter, Loader, Zap,
  FileText, ShoppingCart, Target, Award, TrendingUp, Megaphone, Settings
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import ProductAdCreatorClient from './ProductAdCreatorClient';

// The edge function is served at /functions/v1/make-server-3eae23a6 — the old
// `/functions/v1/server` base pointed at a function that does not exist, so
// every request from this screen 404'd.
const BASE_URL = `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6`;

// Helper function to build API URLs
const buildApiUrl = (path: string) => {
  // Ensure path starts with /
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${BASE_URL}${cleanPath}`;
};

interface Product {
  stagingId: string;
  name: string;
  description: string;
  price: number;
  compareAtPrice?: number;
  images: string[];
  primaryImage: string;
  category: string;
  tags: string[];
  sku: string;
  brand?: string;
  stock: number;
  productType?: string;
}

interface AdTemplate {
  id: string;
  name: string;
  type: string;
  layout: string;
  size: { width: number; height: number };
  placeholders: any;
  style: any;
}

interface ProductAd {
  id: string;
  templateId: string;
  productId: string;
  productData: any;
  content: {
    headline: string;
    subheadline?: string;
    description: string;
    cta: string;
    badge?: string;
    selectedImages: string[];
  };
  status: string;
  createdAt: string;
}

export default function ProductAdCreator() {
  const [useClientMode, setUseClientMode] = useState(false);
  const [step, setStep] = useState<'select' | 'template' | 'customize' | 'preview'>('select');
  const [selectedProducts, setSelectedProducts] = useState<Product[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<AdTemplate | null>(null);
  const [generatedAds, setGeneratedAds] = useState<ProductAd[]>([]);
  const [currentAdIndex, setCurrentAdIndex] = useState(0);
  
  // Options
  const [adOptions, setAdOptions] = useState({
    tone: 'professional' as 'professional' | 'casual' | 'exciting' | 'luxury' | 'discount',
    focusOn: 'benefits' as 'features' | 'benefits' | 'price' | 'quality' | 'uniqueness',
    ctaStyle: 'shop_now' as 'buy_now' | 'learn_more' | 'limited_time' | 'shop_now',
    includeVariants: false,
    platform: 'instagram' as 'facebook' | 'instagram' | 'google' | 'email' | 'web'
  });

  const currentAd = generatedAds[currentAdIndex];

  const handleProductSelection = (products: Product[]) => {
    setSelectedProducts(products);
    setStep('template');
  };

  const handleTemplateSelection = async (template: AdTemplate) => {
    setSelectedTemplate(template);
    setStep('customize');
  };

  const generateAds = async () => {
    if (selectedProducts.length === 0 || !selectedTemplate) return;

    try {
      toast.info(`Generating ${selectedProducts.length} ads...`);
      
      const response = await fetch(buildApiUrl('/product-ads/create-bulk'), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          productIds: selectedProducts.map(p => p.stagingId),
          templateId: selectedTemplate.id,
          options: adOptions
        })
      });

      const data = await response.json();
      
      if (data.success) {
        setGeneratedAds(data.created);
        setCurrentAdIndex(0);
        setStep('preview');
        toast.success(`Generated ${data.created.length} ads successfully!`);
      } else {
        toast.error(`Failed to generate ads: ${data.failed.length} failures`);
      }
    } catch (error) {
      toast.error('Failed to generate ads');
      console.error(error);
    }
  };

  const updateAdContent = async (adId: string, updates: any) => {
    try {
      const response = await fetch(buildApiUrl(`/product-ads/${adId}`), {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ content: updates })
      });

      const data = await response.json();
      
      if (data.success) {
        // Update local state
        setGeneratedAds(ads => ads.map(ad => 
          ad.id === adId ? { ...ad, content: { ...ad.content, ...updates } } : ad
        ));
        toast.success('Ad updated');
      }
    } catch (error) {
      toast.error('Failed to update ad');
    }
  };

  const refreshProductData = async (adId: string) => {
    try {
      const response = await fetch(buildApiUrl(`/product-ads/${adId}/refresh`), {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      
      if (data.success) {
        toast.success('Product data refreshed');
        // Reload ads
      } else {
        toast.error(data.error || 'Failed to refresh');
      }
    } catch (error) {
      toast.error('Failed to refresh product data');
    }
  };

  // If server is unavailable, use client-side demo mode
  if (useClientMode) {
    return <ProductAdCreatorClient />;
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] p-6">
      {/* Header */}
      <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Sparkles className="w-8 h-8 text-[#ea580c]" />
              <h1 className="text-3xl font-bold text-white">Product Ad Creator</h1>
              <span className="px-3 py-1 bg-[#ea580c]/20 text-[#ea580c] text-sm font-semibold rounded-full">
                AI-Powered
              </span>
            </div>
            <p className="text-gray-400">
              Generate professional ads from your imported dropshipper products
            </p>
          </div>

          {/* Progress */}
          <div className="flex items-center gap-2">
            {[
              { id: 'select', label: 'Select Products', icon: ShoppingCart },
              { id: 'template', label: 'Choose Template', icon: Layout },
              { id: 'customize', label: 'Customize', icon: Palette },
              { id: 'preview', label: 'Preview', icon: Eye }
            ].map((s, idx) => {
              const Icon = s.icon;
              const isCurrent = step === s.id;
              const isPast = ['select', 'template', 'customize', 'preview'].indexOf(step) > idx;
              
              return (
                <div key={s.id} className="flex items-center">
                  <div className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${
                    isCurrent 
                      ? 'bg-gradient-to-r from-[#ea580c] to-[#dc2626] text-white' 
                      : isPast 
                        ? 'bg-green-500/20 text-green-500'
                        : 'bg-[#2A2A2A] text-gray-500'
                  }`}>
                    <Icon className="w-4 h-4" />
                    <span className="text-sm font-medium hidden lg:block">{s.label}</span>
                  </div>
                  {idx < 3 && (
                    <ChevronDown className="w-4 h-4 text-gray-600 mx-1 rotate-[-90deg]" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      {step === 'select' && (
        <ProductSelector onSelect={handleProductSelection} />
      )}

      {step === 'template' && (
        <TemplateSelector 
          onSelect={handleTemplateSelection}
          onBack={() => setStep('select')}
        />
      )}

      {step === 'customize' && (
        <CustomizeOptions
          options={adOptions}
          onChange={setAdOptions}
          onGenerate={generateAds}
          onBack={() => setStep('template')}
          selectedCount={selectedProducts.length}
        />
      )}

      {step === 'preview' && currentAd && (
        <AdPreview
          ad={currentAd}
          totalAds={generatedAds.length}
          currentIndex={currentAdIndex}
          onNext={() => setCurrentAdIndex(i => Math.min(i + 1, generatedAds.length - 1))}
          onPrev={() => setCurrentAdIndex(i => Math.max(i - 1, 0))}
          onUpdate={(updates) => updateAdContent(currentAd.id, updates)}
          onRefresh={() => refreshProductData(currentAd.id)}
          onBack={() => setStep('customize')}
        />
      )}
    </div>
  );
}

// Product Selector Component
function ProductSelector({ onSelect }: { onSelect: (products: Product[]) => void }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'physical' | 'digital'>('all');
  const [inStockOnly, setInStockOnly] = useState(false);

  useEffect(() => {
    loadProducts();
  }, []);

  // Normalize any product shape (store catalog OR dropshipper staging) into the
  // shape this ad creator expects. Store products key on `id`; staging on
  // `stagingId`. Works for both physical and digital products.
  const normalizeProduct = (p: any): Product & { productType: string } => ({
    stagingId: p.stagingId || p.id,
    name: p.name || 'Untitled Product',
    description: p.description || '',
    price: Number(p.price) || 0,
    compareAtPrice: p.compareAtPrice ?? p.compare_at_price ?? undefined,
    images: (Array.isArray(p.images) && p.images.length ? p.images : (p.primaryImage ? [p.primaryImage] : [])),
    primaryImage: p.primaryImage || (Array.isArray(p.images) ? p.images[0] : '') || '',
    category: p.category || 'Uncategorized',
    tags: Array.isArray(p.tags) ? p.tags : [],
    sku: p.sku || p.id || p.stagingId || '',
    brand: p.brand || p.vendorName || undefined,
    stock: Number(p.inventoryQuantity ?? p.stock ?? 0),
    productType: String(p.productType || (p.isDigital ? 'digital' : 'physical')),
  });

  const loadProducts = async () => {
    setLoading(true);
    const headers = {
      Authorization: `Bearer ${publicAnonKey}`,
      'Content-Type': 'application/json',
    };
    try {
      // De-dupe across sources by stagingId; the live store catalog wins.
      const collected = new Map<string, Product & { productType: string }>();

      // 1) The FULL ecommerce store catalog — every product you sell, physical
      //    AND digital. This is the primary source so the generator can pull any
      //    product that exists in the store.
      try {
        const res = await fetch(buildApiUrl('/products?limit=1000'), { headers });
        if (res.ok) {
          const data = await res.json();
          const list = Array.isArray(data.products) ? data.products : [];
          list.forEach((p: any) => { const n = normalizeProduct(p); collected.set(n.stagingId, n); });
          console.log(`Loaded ${list.length} products from the store catalog.`);
        } else {
          console.warn('Store catalog request failed:', res.status, await res.text().catch(() => ''));
        }
      } catch (e: any) {
        console.warn('Store catalog load failed:', e?.message || e);
      }

      // 2) Dropshipper staging — imported products not yet published to the
      //    store. Added only if not already present from the store catalog.
      try {
        const res = await fetch(buildApiUrl('/dropshipper/catalog/staging'), { headers });
        if (res.ok) {
          const data = await res.json();
          const list = Array.isArray(data.products) ? data.products : [];
          list.forEach((p: any) => { const n = normalizeProduct(p); if (!collected.has(n.stagingId)) collected.set(n.stagingId, n); });
        }
      } catch (e: any) {
        console.warn('Staging catalog load failed:', e?.message || e);
      }

      const all = Array.from(collected.values());
      setProducts(all);
      if (all.length > 0) {
        const digital = all.filter(p => p.productType === 'digital').length;
        const physical = all.length - digital;
        toast.success(`Loaded ${all.length} products (${physical} physical, ${digital} digital)`);
      } else {
        toast.info('No products found in your store yet. Add products to the store, then come back to generate ads.');
      }
    } catch (error) {
      console.error('Failed to load products:', error);
      toast.error(`Failed to load products: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products.filter(p => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.category.toLowerCase().includes(searchQuery.toLowerCase());
    const type = (p as any).productType === 'digital' ? 'digital' : 'physical';
    const matchesType = typeFilter === 'all' || type === typeFilter;
    // Digital products are always available; only gate physical items on stock.
    const matchesStock = !inStockOnly || type === 'digital' || (p.stock ?? 0) > 0;
    return matchesSearch && matchesType && matchesStock;
  });

  const toggleProduct = (id: string) => {
    const newSelected = new Set(selected);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelected(newSelected);
  };

  const handleContinue = () => {
    const selectedProds = products.filter(p => selected.has(p.stagingId));
    if (selectedProds.length === 0) {
      toast.error('Please select at least one product');
      return;
    }
    onSelect(selectedProds);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader className="w-8 h-8 text-[#ea580c] animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex-1 max-w-md relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search products..."
              className="w-full pl-10 pr-4 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#ea580c]"
            />
          </div>

          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-400">
              {selected.size} selected
            </span>
            <button
              onClick={handleContinue}
              disabled={selected.size === 0}
              className="px-6 py-2 bg-gradient-to-r from-[#ea580c] to-[#dc2626] text-white rounded-lg hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              Continue
              <ChevronDown className="w-4 h-4 rotate-[-90deg]" />
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex rounded-lg border border-[#2A2A2A] bg-[#0A0A0A] p-0.5">
            {(['all', 'physical', 'digital'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                className={`px-3 py-1.5 text-sm rounded-md capitalize transition-all ${
                  typeFilter === t
                    ? 'bg-[#ea580c] text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {t === 'all' ? 'All' : t}
              </button>
            ))}
          </div>

          <button
            onClick={() => setInStockOnly((v) => !v)}
            className={`px-3 py-1.5 text-sm rounded-lg border transition-all ${
              inStockOnly
                ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                : 'bg-[#0A0A0A] border-[#2A2A2A] text-gray-400 hover:text-white'
            }`}
          >
            In stock only
          </button>

          <span className="text-xs text-gray-500 ml-auto">
            Showing {filteredProducts.length} of {products.length}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredProducts.map(product => (
          <div
            key={product.stagingId}
            onClick={() => toggleProduct(product.stagingId)}
            className={`bg-[#1A1A1A] border rounded-xl overflow-hidden cursor-pointer transition-all hover:shadow-lg hover:shadow-[#ea580c]/10 ${
              selected.has(product.stagingId)
                ? 'border-[#ea580c] ring-2 ring-[#ea580c]/20'
                : 'border-[#2A2A2A]'
            }`}
          >
            <div className="relative aspect-square bg-[#0A0A0A]">
              {product.primaryImage ? (
                <img src={product.primaryImage} alt={product.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Image className="w-16 h-16 text-gray-600" />
                </div>
              )}
              
              {selected.has(product.stagingId) && (
                <div className="absolute top-2 right-2 w-8 h-8 bg-[#ea580c] rounded-full flex items-center justify-center">
                  <Check className="w-5 h-5 text-white" />
                </div>
              )}

              <span
                className={`absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide ${
                  product.productType === 'digital'
                    ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30'
                    : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                }`}
              >
                {product.productType === 'digital' ? 'Digital' : 'Physical'}
              </span>
            </div>

            <div className="p-4">
              <h3 className="text-white font-semibold mb-1 line-clamp-1">{product.name}</h3>
              <p className="text-sm text-gray-400 mb-2">{product.category}</p>
              <div className="flex items-center justify-between">
                <span className="text-lg font-bold text-[#ea580c]">${product.price.toFixed(2)}</span>
                <span className="text-xs text-gray-500">SKU: {product.sku}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredProducts.length === 0 && (
        <div className="text-center py-12">
          <ShoppingCart className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">No Products Found</h3>
          <p className="text-gray-400 mb-6">
            {products.length === 0
              ? 'No imported products available. Import products from the Catalog tab first.'
              : 'No products match your search. Try a different query.'}
          </p>
          
          {/* Deployment Help */}
          {products.length === 0 && (
            <div className="max-w-2xl mx-auto mt-8 p-6 bg-[#1A1A1A] border border-[#ea580c] rounded-xl">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-[#ea580c]/20 rounded-full flex items-center justify-center flex-shrink-0">
                  <Settings className="w-6 h-6 text-[#ea580c]" />
                </div>
                <div className="text-left">
                  <h4 className="text-white font-semibold mb-2">Server Deployment Required</h4>
                  <p className="text-sm text-gray-400 mb-4">
                    The Supabase Edge Function "server" needs to be deployed for this feature to work.
                  </p>
                  <div className="space-y-2 text-sm text-gray-300">
                    <div className="flex items-start gap-2">
                      <span className="text-[#ea580c] font-bold">1.</span>
                      <span>The server code has been updated to v4.0 (check console logs)</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-[#ea580c] font-bold">2.</span>
                      <span>In Figma Make, this should auto-deploy within 10-30 seconds</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-[#ea580c] font-bold">3.</span>
                      <span>Refresh this page after waiting</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-[#ea580c] font-bold">4.</span>
                      <span>If still not working, check the <a href={`https://supabase.com/dashboard/project/${projectId}/functions`} target="_blank" rel="noopener noreferrer" className="underline text-[#ea580c]">Supabase Dashboard</a></span>
                    </div>
                  </div>
                  <button
                    onClick={() => window.location.reload()}
                    className="mt-4 px-6 py-2 bg-gradient-to-r from-[#ea580c] to-[#dc2626] text-white rounded-lg hover:opacity-90 transition-all flex items-center gap-2 mx-auto"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Refresh Page to Check Deployment
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Template Selector Component
function TemplateSelector({ onSelect, onBack }: { 
  onSelect: (template: AdTemplate) => void;
  onBack: () => void;
}) {
  const [templates, setTemplates] = useState<AdTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      const templatesUrl = buildApiUrl('/product-ads/templates');
      const response = await fetch(templatesUrl, {
        headers: { 
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.success && Array.isArray(data.templates)) {
        setTemplates(data.templates);
      } else {
        console.error('Invalid template data:', data);
        setTemplates([]);
        toast.error('Invalid template data received');
      }
    } catch (error) {
      console.error('Failed to load templates:', error);
      toast.error(`Failed to load templates: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setTemplates([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader className="w-8 h-8 text-[#ea580c] animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <button
        onClick={onBack}
        className="px-4 py-2 bg-[#2A2A2A] text-white rounded-lg hover:bg-[#3A3A3A] transition-all flex items-center gap-2"
      >
        <ChevronDown className="w-4 h-4 rotate-90" />
        Back
      </button>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {templates.map(template => (
          <div
            key={template.id}
            onClick={() => onSelect(template)}
            className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6 cursor-pointer hover:border-[#ea580c] transition-all group"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-[#ea580c] to-[#dc2626] rounded-lg flex items-center justify-center">
                  <Layout className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-white font-semibold">{template.name}</h3>
                  <p className="text-sm text-gray-400 capitalize">{template.type.replace('_', ' ')}</p>
                </div>
              </div>
            </div>

            <div className="space-y-2 mb-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Size:</span>
                <span className="text-gray-300">{template.size.width} × {template.size.height}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Layout:</span>
                <span className="text-gray-300 capitalize">{template.layout.replace('_', ' ')}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Theme:</span>
                <span className="text-gray-300 capitalize">{template.style.theme}</span>
              </div>
            </div>

            <button className="w-full px-4 py-2 bg-[#2A2A2A] text-white rounded-lg group-hover:bg-gradient-to-r group-hover:from-[#ea580c] group-hover:to-[#dc2626] transition-all">
              Select Template
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// Customize Options Component
function CustomizeOptions({ options, onChange, onGenerate, onBack, selectedCount }: {
  options: any;
  onChange: (options: any) => void;
  onGenerate: () => void;
  onBack: () => void;
  selectedCount: number;
}) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="px-4 py-2 bg-[#2A2A2A] text-white rounded-lg hover:bg-[#3A3A3A] transition-all flex items-center gap-2"
        >
          <ChevronDown className="w-4 h-4 rotate-90" />
          Back
        </button>

        <button
          onClick={onGenerate}
          className="px-8 py-3 bg-gradient-to-r from-[#ea580c] to-[#dc2626] text-white rounded-lg hover:opacity-90 transition-all flex items-center gap-2 text-lg font-semibold"
        >
          <Sparkles className="w-5 h-5" />
          Generate {selectedCount} Ad{selectedCount > 1 ? 's' : ''}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Tone */}
        <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6">
          <label className="block text-white font-semibold mb-4">Ad Tone</label>
          <div className="space-y-2">
            {['professional', 'casual', 'exciting', 'luxury', 'discount'].map(tone => (
              <button
                key={tone}
                onClick={() => onChange({ ...options, tone })}
                className={`w-full px-4 py-3 rounded-lg text-left transition-all ${
                  options.tone === tone
                    ? 'bg-gradient-to-r from-[#ea580c] to-[#dc2626] text-white'
                    : 'bg-[#2A2A2A] text-gray-400 hover:bg-[#3A3A3A]'
                }`}
              >
                <span className="capitalize font-medium">{tone}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Focus */}
        <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6">
          <label className="block text-white font-semibold mb-4">Focus On</label>
          <div className="space-y-2">
            {['features', 'benefits', 'price', 'quality', 'uniqueness'].map(focus => (
              <button
                key={focus}
                onClick={() => onChange({ ...options, focusOn: focus })}
                className={`w-full px-4 py-3 rounded-lg text-left transition-all ${
                  options.focusOn === focus
                    ? 'bg-gradient-to-r from-[#ea580c] to-[#dc2626] text-white'
                    : 'bg-[#2A2A2A] text-gray-400 hover:bg-[#3A3A3A]'
                }`}
              >
                <span className="capitalize font-medium">{focus}</span>
              </button>
            ))}
          </div>
        </div>

        {/* CTA Style */}
        <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6">
          <label className="block text-white font-semibold mb-4">Call-to-Action</label>
          <div className="space-y-2">
            {['shop_now', 'buy_now', 'learn_more', 'limited_time'].map(cta => (
              <button
                key={cta}
                onClick={() => onChange({ ...options, ctaStyle: cta })}
                className={`w-full px-4 py-3 rounded-lg text-left transition-all ${
                  options.ctaStyle === cta
                    ? 'bg-gradient-to-r from-[#ea580c] to-[#dc2626] text-white'
                    : 'bg-[#2A2A2A] text-gray-400 hover:bg-[#3A3A3A]'
                }`}
              >
                <span className="capitalize font-medium">{cta.replace('_', ' ')}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Platform */}
        <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6">
          <label className="block text-white font-semibold mb-4">Platform</label>
          <div className="space-y-2">
            {['facebook', 'instagram', 'google', 'email', 'web'].map(platform => (
              <button
                key={platform}
                onClick={() => onChange({ ...options, platform })}
                className={`w-full px-4 py-3 rounded-lg text-left transition-all ${
                  options.platform === platform
                    ? 'bg-gradient-to-r from-[#ea580c] to-[#dc2626] text-white'
                    : 'bg-[#2A2A2A] text-gray-400 hover:bg-[#3A3A3A]'
                }`}
              >
                <span className="capitalize font-medium">{platform}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// Ad Preview Component
function AdPreview({ ad, totalAds, currentIndex, onNext, onPrev, onUpdate, onRefresh, onBack }: {
  ad: ProductAd;
  totalAds: number;
  currentIndex: number;
  onNext: () => void;
  onPrev: () => void;
  onUpdate: (updates: any) => void;
  onRefresh: () => void;
  onBack: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(ad.content);

  const handleSave = () => {
    onUpdate(editedContent);
    setEditing(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="px-4 py-2 bg-[#2A2A2A] text-white rounded-lg hover:bg-[#3A3A3A] transition-all flex items-center gap-2"
        >
          <ChevronDown className="w-4 h-4 rotate-90" />
          Back
        </button>

        <div className="flex items-center gap-3">
          <span className="text-gray-400">
            Ad {currentIndex + 1} of {totalAds}
          </span>
          
          <div className="flex gap-2">
            <button
              onClick={onPrev}
              disabled={currentIndex === 0}
              className="px-4 py-2 bg-[#2A2A2A] text-white rounded-lg hover:bg-[#3A3A3A] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronDown className="w-4 h-4 rotate-90" />
            </button>
            <button
              onClick={onNext}
              disabled={currentIndex === totalAds - 1}
              className="px-4 py-2 bg-[#2A2A2A] text-white rounded-lg hover:bg-[#3A3A3A] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronDown className="w-4 h-4 rotate-[-90deg]" />
            </button>
          </div>

          <button
            onClick={onRefresh}
            className="px-4 py-2 bg-[#2A2A2A] text-white rounded-lg hover:bg-[#3A3A3A] transition-all flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh Data
          </button>

          <button
            onClick={() => setEditing(!editing)}
            className={`px-4 py-2 rounded-lg transition-all flex items-center gap-2 ${
              editing
                ? 'bg-[#ea580c] text-white'
                : 'bg-[#2A2A2A] text-white hover:bg-[#3A3A3A]'
            }`}
          >
            <Edit className="w-4 h-4" />
            {editing ? 'Editing' : 'Edit'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Preview */}
        <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6">
          <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
            <Eye className="w-5 h-5 text-[#ea580c]" />
            Preview
          </h3>
          
          <div className="bg-white rounded-lg p-6 space-y-4">
            {/* Image */}
            <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
              <img 
                src={ad.content.selectedImages[0] || ad.productData.primaryImage} 
                alt={ad.productData.name}
                className="w-full h-full object-cover"
              />
            </div>

            {/* Badge */}
            {ad.content.badge && (
              <div className="inline-block px-3 py-1 bg-[#ea580c] text-white text-sm font-semibold rounded-full">
                {ad.content.badge}
              </div>
            )}

            {/* Headline */}
            <h2 className="text-2xl font-bold text-gray-900">
              {ad.content.headline}
            </h2>

            {/* Subheadline */}
            {ad.content.subheadline && (
              <p className="text-lg text-gray-700">{ad.content.subheadline}</p>
            )}

            {/* Description */}
            <p className="text-gray-600">{ad.content.description}</p>

            {/* Price */}
            <div className="flex items-center gap-3">
              <span className="text-3xl font-bold text-[#ea580c]">
                ${ad.productData.price.toFixed(2)}
              </span>
              {ad.productData.compareAtPrice && (
                <span className="text-lg text-gray-500 line-through">
                  ${ad.productData.compareAtPrice.toFixed(2)}
                </span>
              )}
            </div>

            {/* CTA */}
            <button className="w-full px-6 py-4 bg-gradient-to-r from-[#ea580c] to-[#dc2626] text-white font-semibold rounded-lg hover:opacity-90 transition-all">
              {ad.content.cta}
            </button>
          </div>
        </div>

        {/* Edit Panel */}
        <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6 space-y-4">
          <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
            <Type className="w-5 h-5 text-[#ea580c]" />
            Ad Content
          </h3>

          {editing ? (
            <>
              <div>
                <label className="block text-sm text-gray-400 mb-2">Headline</label>
                <input
                  type="text"
                  value={editedContent.headline}
                  onChange={(e) => setEditedContent({ ...editedContent, headline: e.target.value })}
                  className="w-full px-4 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white focus:outline-none focus:border-[#ea580c]"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">Subheadline</label>
                <input
                  type="text"
                  value={editedContent.subheadline || ''}
                  onChange={(e) => setEditedContent({ ...editedContent, subheadline: e.target.value })}
                  className="w-full px-4 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white focus:outline-none focus:border-[#ea580c]"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">Description</label>
                <textarea
                  value={editedContent.description}
                  onChange={(e) => setEditedContent({ ...editedContent, description: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white focus:outline-none focus:border-[#ea580c]"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">CTA Button</label>
                <input
                  type="text"
                  value={editedContent.cta}
                  onChange={(e) => setEditedContent({ ...editedContent, cta: e.target.value })}
                  className="w-full px-4 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white focus:outline-none focus:border-[#ea580c]"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">Badge (optional)</label>
                <input
                  type="text"
                  value={editedContent.badge || ''}
                  onChange={(e) => setEditedContent({ ...editedContent, badge: e.target.value })}
                  className="w-full px-4 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white focus:outline-none focus:border-[#ea580c]"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    setEditedContent(ad.content);
                    setEditing(false);
                  }}
                  className="flex-1 px-4 py-2 bg-[#2A2A2A] text-white rounded-lg hover:bg-[#3A3A3A] transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-[#ea580c] to-[#dc2626] text-white rounded-lg hover:opacity-90 transition-all"
                >
                  Save Changes
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="space-y-3">
                <div>
                  <span className="text-sm text-gray-500">Product:</span>
                  <p className="text-white">{ad.productData.name}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-500">Category:</span>
                  <p className="text-white">{ad.productData.category}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-500">SKU:</span>
                  <p className="text-white font-mono">{ad.productData.sku}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-500">Status:</span>
                  <span className={`ml-2 px-2 py-1 rounded text-xs font-semibold ${
                    ad.status === 'published' ? 'bg-green-500/20 text-green-500' :
                    ad.status === 'draft' ? 'bg-gray-500/20 text-gray-500' :
                    'bg-yellow-500/20 text-yellow-500'
                  }`}>
                    {ad.status}
                  </span>
                </div>
                <div>
                  <span className="text-sm text-gray-500">Created:</span>
                  <p className="text-white">{new Date(ad.createdAt).toLocaleString()}</p>
                </div>
              </div>

              <div className="pt-4 space-y-2">
                <button className="w-full px-4 py-2 bg-gradient-to-r from-[#ea580c] to-[#dc2626] text-white rounded-lg hover:opacity-90 transition-all flex items-center justify-center gap-2">
                  <Download className="w-4 h-4" />
                  Download Ad
                </button>
                <button className="w-full px-4 py-2 bg-[#2A2A2A] text-white rounded-lg hover:bg-[#3A3A3A] transition-all flex items-center justify-center gap-2">
                  <Share2 className="w-4 h-4" />
                  Share Ad
                </button>
                <button className="w-full px-4 py-2 bg-[#2A2A2A] text-white rounded-lg hover:bg-[#3A3A3A] transition-all flex items-center justify-center gap-2">
                  <Copy className="w-4 h-4" />
                  Copy Content
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}