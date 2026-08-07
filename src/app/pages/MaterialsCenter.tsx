/**
 * Materials Center - Comprehensive Materials Management Hub
 * 
 * Priority Features:
 * 1. Easy search (AI-powered, fast, intuitive)
 * 2. Vendor self-service (vendors can add materials)
 * 3. Quick quote integration (one-click add to quote)
 * 
 * Tabs:
 * - Catalog: Browse & search all materials
 * - Vendor Portal: Vendors submit/manage their materials
 * - Quote Builder: Materials selected for quotes
 * - Database: Material library management
 * - Procurement: Purchase orders & vendor management
 * - Analytics: Material usage & cost tracking
 */

import { useState, useEffect, useRef } from 'react';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import {
  Search, Package, Filter, Star, TrendingUp, ShoppingCart,
  Zap, CheckCircle, DollarSign, Truck, Award, BarChart3,
  Plus, Eye, Heart, GitCompare, Sparkles, MessageSquare,
  Grid, List, SlidersHorizontal, ArrowRight, Building2,
  Clock, Shield, Tag, Box, Layers, X, Settings, Globe,
  Download, Edit2, Trash2, AlertTriangle, Receipt, FileText,
  Database, ChevronRight, Upload, Store, Users, TrendingDown,
  ArrowLeft, ExternalLink, Copy, Link as LinkIcon, Crown,
  Medal, Trophy, Archive, RefreshCw, Calculator, ClipboardList, Send
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { useNavigate } from '../hooks/useNavigate';
import {
  materialsHubService,
  Material,
  MaterialCategory,
  AISearchRequest
} from '../lib/services/materialsHubService';
import { productDataSourceManager } from '../lib/services/productDataSourceManager';

type TabType = 'catalog' | 'vendor-portal' | 'quote-builder' | 'database' | 'procurement' | 'analytics';
type ViewMode = 'grid' | 'list';

interface VendorMaterialSubmission {
  id: string;
  vendorId: string;
  vendorName: string;
  materialName: string;
  category: string;
  description: string;
  price: number;
  sku: string;
  images: string[];
  specifications: Record<string, string>;
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: string;
}

// ─── Materials AI Chat ────────────────────────────────────────────────────────

const MATERIALS_PROMPTS = [
  'What materials do I need for a deck build?',
  'Compare pressure-treated vs composite decking',
  'Estimate lumber for a 12x16 addition',
  'What\'s the best insulation for NH winters?',
  'How much concrete for a 10x10 slab?',
  'Roofing materials for New England climate',
];

function MaterialsAIChat({ onClose }: { onClose: () => void }) {
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, loading]);

  async function send(text?: string) {
    const msg = (text || input).trim();
    if (!msg || loading) return;
    setInput('');
    const history = [...messages, { role: 'user' as const, content: msg }];
    setMessages(history);
    setLoading(true);
    try {
      const res = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6/permit-ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${publicAnonKey}` },
        body: JSON.stringify({
          message: msg,
          address: '',
          workType: 'Materials & Procurement',
          history: messages,
          systemOverride: 'You are a construction materials expert for New England / New Hampshire projects. Help the user select the right materials, estimate quantities, compare options, understand building codes for materials, and find cost-effective solutions. Be specific, practical, and reference NH climate and local supplier context where relevant.',
        }),
      });
      const data = await res.json();
      if (data.reply) setMessages([...history, { role: 'assistant', content: data.reply }]);
      else if (data.error?.includes('ANTHROPIC_API_KEY')) {
        setMessages([...history, { role: 'assistant', content: '⚠️ **Setup Required** — Add `ANTHROPIC_API_KEY` to Supabase Edge Function secrets to activate AI assistance.' }]);
      }
    } catch { toast.error('Connection error'); }
    setLoading(false);
  }

  return (
    <div className="flex flex-col gap-4" style={{ minHeight: 320 }}>
      {messages.length === 0 && (
        <div className="grid grid-cols-2 gap-2">
          {MATERIALS_PROMPTS.map(p => (
            <button key={p} onClick={() => send(p)}
              className="text-left px-3 py-2.5 bg-[#111] border border-[#2A2A2A] hover:border-purple-500/40 text-xs text-gray-400 hover:text-white rounded-xl transition">
              {p}
            </button>
          ))}
        </div>
      )}
      <div className="space-y-3 max-h-64 overflow-y-auto">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl text-sm ${m.role === 'user' ? 'bg-purple-600 text-white rounded-tr-sm' : 'bg-[#111] border border-[#2A2A2A] text-gray-200 rounded-tl-sm'}`}>
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex gap-1.5 px-3 py-2">
            {[0,1,2].map(i => <div key={i} className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: `${i*0.15}s` }} />)}
          </div>
        )}
        <div ref={bottomRef} />
      </div>
      <div className="flex gap-2 bg-[#111] border border-[#2A2A2A] focus-within:border-purple-500/50 rounded-xl p-2 transition">
        <input value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send()}
          placeholder="Ask about materials, quantities, costs…"
          className="flex-1 bg-transparent text-white text-sm placeholder-gray-600 outline-none px-2" />
        <button onClick={() => send()} disabled={loading || !input.trim()}
          className="w-8 h-8 bg-purple-600 hover:bg-purple-500 disabled:bg-[#2A2A2A] disabled:text-gray-600 text-white rounded-lg flex items-center justify-center flex-shrink-0 transition">
          <Send className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

export default function MaterialsCenter() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>('catalog');
  
  // Universal Search
  const [searchQuery, setSearchQuery] = useState('');
  const [showAIAssistant, setShowAIAssistant] = useState(false);
  
  // Materials
  const [materials, setMaterials] = useState<Material[]>([]);
  const [categories, setCategories] = useState<MaterialCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  
  // Quote Integration
  const [isQuoteMode, setIsQuoteMode] = useState(false);
  const [quoteMaterials, setQuoteMaterials] = useState<any[]>([]);
  const [quoteWorkflowData, setQuoteWorkflowData] = useState<any>(null);
  
  // Vendor Portal
  const [vendorSubmissions, setVendorSubmissions] = useState<VendorMaterialSubmission[]>([]);
  const [showVendorSubmitForm, setShowVendorSubmitForm] = useState(false);
  
  // Filters
  const [filters, setFilters] = useState({
    minPrice: 0,
    maxPrice: 10000,
    minQuality: 0,
    inStockOnly: false,
    vendorId: ''
  });
  
  // Data Sources
  const [enabledDataSources, setEnabledDataSources] = useState<any[]>([]);
  const [compareList, setCompareList] = useState<string[]>([]);

  useEffect(() => {
    loadData();
    checkQuoteMode();
    checkDataSources();
  }, []);

  const loadData = () => {
    try {
      const allMaterials = materialsHubService.getAllMaterials();
      setMaterials(allMaterials);
      setCategories(materialsHubService.getCategories());
    } catch (error) {
      console.log('Materials service not available - using empty data');
      setMaterials([]);
      setCategories([]);
    }
  };

  const checkQuoteMode = () => {
    const quoteData = localStorage.getItem('quote_in_progress');
    if (quoteData) {
      try {
        const parsed = JSON.parse(quoteData);
        setIsQuoteMode(true);
        setQuoteWorkflowData(parsed);
        const materials = parsed.lineItems?.filter((item: any) => item.type === 'material') || [];
        setQuoteMaterials(materials);
      } catch (e) {
        console.error('Failed to parse quote data:', e);
      }
    }
  };

  const checkDataSources = async () => {
    try {
      const sources = await productDataSourceManager.getDataSources();
      const enabled = sources.filter(s => s.enabled && s.credentialsValid);
      setEnabledDataSources(enabled);
    } catch (error) {
      console.log('Data sources not available - continuing without API integration');
      setEnabledDataSources([]);
    }
  };

  const handleSearch = () => {
    try {
      const results = materialsHubService.searchMaterials(searchQuery, {
        category: selectedCategory !== 'all' ? selectedCategory : undefined,
        ...filters
      });
      setMaterials(results);
    } catch (error) {
      console.log('Search failed - using current materials');
    }
  };

  useEffect(() => {
    handleSearch();
  }, [searchQuery, selectedCategory, filters]);

  // Quick add to quote - ONE CLICK!
  const quickAddToQuote = (material: Material) => {
    const newItem = {
      id: `quote-${Date.now()}`,
      type: 'material',
      description: material.name,
      quantity: 1,
      unit: material.unit || 'ea',
      unitPrice: material.basePrice,
      totalPrice: material.basePrice,
      category: material.category,
      supplier: material.vendorName || material.manufacturer,
      materialId: material.id
    };
    
    if (isQuoteMode) {
      setQuoteMaterials([...quoteMaterials, newItem]);
      toast.success(`✅ ${material.name} added to quote!`, {
        action: {
          label: 'View Quote',
          onClick: () => setActiveTab('quote-builder')
        }
      });
    } else {
      // Start a new quote
      const newQuote = {
        quoteNumber: `Q-${Date.now()}`,
        lineItems: [newItem],
        createdAt: new Date().toISOString()
      };
      localStorage.setItem('quote_in_progress', JSON.stringify(newQuote));
      setIsQuoteMode(true);
      setQuoteWorkflowData(newQuote);
      setQuoteMaterials([newItem]);
      toast.success(`🎉 New quote started with ${material.name}!`, {
        action: {
          label: 'View Quote',
          onClick: () => setActiveTab('quote-builder')
        }
      });
    }
  };

  const returnToQuote = () => {
    if (quoteWorkflowData) {
      const updatedLineItems = [
        ...quoteWorkflowData.lineItems.filter((item: any) => item.type !== 'material'),
        ...quoteMaterials
      ];
      
      const updatedData = {
        ...quoteWorkflowData,
        lineItems: updatedLineItems,
        materialsUpdated: true
      };
      
      localStorage.setItem('quote_in_progress', JSON.stringify(updatedData));
      toast.success(`Returning to quote with ${quoteMaterials.length} materials`);
      
      setTimeout(() => {
        navigate('unified-project-pipeline');
      }, 500);
    }
  };

  const removeMaterialFromQuote = (id: string) => {
    setQuoteMaterials(quoteMaterials.filter(m => m.id !== id));
    toast.info('Material removed from quote');
  };

  const updateQuoteMaterial = (materialId: string, updates: any) => {
    const updatedMaterials = quoteMaterials.map((m: any) => {
      if (m.id === materialId) {
        return { ...m, ...updates };
      }
      return m;
    });
    setQuoteMaterials(updatedMaterials);

    // Also update localStorage
    const quoteData = localStorage.getItem('quote_in_progress');
    if (quoteData) {
      const parsed = JSON.parse(quoteData);
      parsed.lineItems = [
        ...parsed.lineItems.filter((item: any) => item.type !== 'material'),
        ...updatedMaterials
      ];
      localStorage.setItem('quote_in_progress', JSON.stringify(parsed));
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] pb-8">
      {/* Fixed Header */}
      <div className="sticky top-16 z-40 bg-[#0A0A0A] border-b border-[#2A2A2A]">
        {/* Back Button & Title */}
        <div className="px-6 pt-6 pb-4">
          <button
            onClick={() => navigate('/unified-dashboard')}
            className="flex items-center gap-2 px-4 py-2 bg-[#1A1A1A] hover:bg-[#2A2A2A] border border-[#2A2A2A] hover:border-[#ea580c] text-gray-300 hover:text-white rounded-lg transition-all duration-200 mb-4"
          >
            <ChevronRight className="w-4 h-4 rotate-180" />
            Back to Dashboard
          </button>

          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center">
                  <Package className="w-7 h-7 text-white" />
                </div>
                Materials Center
              </h1>
              <p className="text-gray-400">Search, manage, and procure materials with ease</p>
            </div>

            {/* Quick Actions */}
            <div className="flex gap-3">
              {isQuoteMode && quoteMaterials.length > 0 && (
                <button
                  onClick={() => setActiveTab('quote-builder')}
                  className="px-4 py-2 bg-gradient-to-r from-[#ea580c] to-orange-600 text-white font-semibold rounded-xl hover:from-[#dc2626] hover:to-orange-700 transition flex items-center gap-2 shadow-lg shadow-orange-500/30"
                >
                  <ShoppingCart className="w-4 h-4" />
                  Quote ({quoteMaterials.length})
                </button>
              )}
              <button
                onClick={() => setShowAIAssistant(true)}
                className="px-4 py-2 bg-gradient-to-r from-purple-600 to-purple-700 text-white font-semibold rounded-xl hover:from-purple-700 hover:to-purple-800 transition flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                AI Search
              </button>
            </div>
          </div>
        </div>

        {/* Universal Search Bar - ALWAYS VISIBLE */}
        <div className="px-6 pb-4">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
              <input
                type="text"
                placeholder="🔍 Search materials by name, SKU, category, vendor, or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-[#1A1A1A] border-2 border-[#2A2A2A] focus:border-blue-500 rounded-xl text-white placeholder-gray-500 focus:outline-none transition-all text-lg"
              />
            </div>
            <button
              onClick={() => setShowAIAssistant(true)}
              className="px-6 py-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold rounded-xl hover:from-purple-700 hover:to-blue-700 transition flex items-center gap-2 shadow-lg shadow-purple-500/30"
            >
              <Sparkles className="w-5 h-5" />
              Ask AI
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="px-6">
          <div className="flex gap-2 overflow-x-auto pb-0">
            {[
              { id: 'catalog', label: 'Catalog', icon: Store, badge: materials.length },
              { id: 'vendor-portal', label: 'Vendor Portal', icon: Building2, badge: 'NEW' },
              { id: 'quote-builder', label: 'Quote Builder', icon: ShoppingCart, badge: quoteMaterials.length || null },
              { id: 'database', label: 'Database', icon: Database },
              { id: 'procurement', label: 'Procurement', icon: Receipt },
              { id: 'analytics', label: 'Analytics', icon: BarChart3 },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`px-6 py-3 font-semibold rounded-t-xl transition-all border-b-4 flex items-center gap-2 whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-[#1A1A1A] text-white border-[#ea580c]'
                    : 'bg-transparent text-gray-400 hover:text-white border-transparent hover:bg-[#1A1A1A]/50'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
                {tab.badge && (
                  <span className={`px-2 py-0.5 rounded-full text-sm font-bold ${
                    typeof tab.badge === 'number'
                      ? 'bg-[#ea580c] text-white'
                      : 'bg-green-500/20 text-green-300'
                  }`}>
                    {tab.badge}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="px-6 pt-6">
        {activeTab === 'catalog' && <CatalogTab materials={materials} categories={categories} selectedCategory={selectedCategory} setSelectedCategory={setSelectedCategory} filters={filters} setFilters={setFilters} viewMode={viewMode} setViewMode={setViewMode} quickAddToQuote={quickAddToQuote} navigate={navigate} />}
        
        {activeTab === 'vendor-portal' && <VendorPortalTab />}
        
        {activeTab === 'quote-builder' && <QuoteBuilderTab quoteMaterials={quoteMaterials} removeMaterialFromQuote={removeMaterialFromQuote} updateQuoteMaterial={updateQuoteMaterial} returnToQuote={returnToQuote} isQuoteMode={isQuoteMode} />}
        
        {activeTab === 'database' && <DatabaseTab />}
        
        {activeTab === 'procurement' && <ProcurementTab />}
        
        {activeTab === 'analytics' && <AnalyticsTab />}
      </div>

      {/* AI Assistant Modal */}
      {showAIAssistant && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-6">
          <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6 border-b border-[#2A2A2A] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">AI Material Search</h2>
                  <p className="text-sm text-gray-400">Ask anything about materials</p>
                </div>
              </div>
              <button
                onClick={() => setShowAIAssistant(false)}
                className="p-2 hover:bg-[#2A2A2A] rounded-lg transition text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <MaterialsAIChat onClose={() => setShowAIAssistant(false)} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ==================== TAB COMPONENTS ====================

function CatalogTab({ materials, categories, selectedCategory, setSelectedCategory, filters, setFilters, viewMode, setViewMode, quickAddToQuote, navigate }: any) {
  return (
    <div className="space-y-6">
      {/* My Ecommerce Store — pull products from your own store */}
      <MyStoreSection quickAddToQuote={quickAddToQuote} />

      {/* Vendor Catalog Cards */}
      <div className="bg-gradient-to-r from-orange-600/10 to-red-600/10 border-2 border-orange-500/30 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2 mb-1">
              <Building2 className="w-6 h-6 text-orange-400" />
              Vendor Product Catalogs
            </h2>
            <p className="text-sm text-gray-400">Browse products from verified vendor partners</p>
          </div>
        </div>
        
        <div className="grid grid-cols-3 gap-4">
          {/* Home Depot */}
          <div className="bg-[#0A0A0A] border border-orange-500/30 rounded-lg p-5 hover:border-orange-500 hover:shadow-lg hover:shadow-orange-500/20 transition-all duration-300 cursor-pointer">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-14 h-14 rounded-lg bg-[#F96302] flex items-center justify-center font-black text-white text-xl border-2 border-orange-600">
                HD
              </div>
              <div>
                <p className="font-bold text-white text-lg">The Home Depot</p>
                <p className="text-sm text-orange-400 font-semibold">Enterprise Partner</p>
              </div>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Products:</span>
                <span className="text-white font-semibold">10,000+</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Delivery:</span>
                <span className="text-green-400 font-semibold flex items-center gap-1">
                  <Truck className="w-3 h-3" />
                  Same Day
                </span>
              </div>
            </div>
          </div>

          {/* Lowe's */}
          <div className="bg-[#0A0A0A] border border-blue-500/30 rounded-lg p-5 hover:border-blue-500 hover:shadow-lg hover:shadow-blue-500/20 transition-all duration-300 cursor-pointer">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-14 h-14 rounded-lg bg-[#004990] flex items-center justify-center font-black text-white text-xl border-2 border-blue-600">
                L
              </div>
              <div>
                <p className="font-bold text-white text-lg">Lowe's</p>
                <p className="text-sm text-blue-400 font-semibold">Enterprise Partner</p>
              </div>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Products:</span>
                <span className="text-white font-semibold">9,500+</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Delivery:</span>
                <span className="text-green-400 font-semibold flex items-center gap-1">
                  <Truck className="w-3 h-3" />
                  Same Day
                </span>
              </div>
            </div>
          </div>

          {/* Grainger */}
          <div className="bg-[#0A0A0A] border border-red-500/30 rounded-lg p-5 hover:border-red-500 hover:shadow-lg hover:shadow-red-500/20 transition-all duration-300 cursor-pointer">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-14 h-14 rounded-lg bg-[#CC0000] flex items-center justify-center font-black text-white text-xl border-2 border-red-600">
                G
              </div>
              <div>
                <p className="font-bold text-white text-lg">Grainger</p>
                <p className="text-sm text-red-400 font-semibold">Enterprise Partner</p>
              </div>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Products:</span>
                <span className="text-white font-semibold">1.6M+</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Delivery:</span>
                <span className="text-green-400 font-semibold flex items-center gap-1">
                  <Truck className="w-3 h-3" />
                  Next Day
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Categories */}
      <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-6">
        <h3 className="text-lg font-bold text-white mb-4">Categories</h3>
        <div className="flex gap-3 overflow-x-auto pb-2">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-4 py-2 rounded-lg font-medium transition whitespace-nowrap ${
              selectedCategory === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-[#0A0A0A] text-gray-400 hover:text-white border border-[#2A2A2A]'
            }`}
          >
            All Products
          </button>
          {categories.map((cat: any) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.name)}
              className={`px-4 py-2 rounded-lg font-medium transition whitespace-nowrap flex items-center gap-2 ${
                selectedCategory === cat.name
                  ? 'bg-blue-600 text-white'
                  : 'bg-[#0A0A0A] text-gray-400 hover:text-white border border-[#2A2A2A]'
              }`}
            >
              <span>{cat.icon}</span>
              <span>{cat.name}</span>
              <span className="text-sm opacity-75">({cat.productCount})</span>
            </button>
          ))}
        </div>
      </div>

      {/* Materials Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {materials.map((material: Material) => (
          <div key={material.id} className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-4 hover:border-blue-500 transition-all group">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <h4 className="font-semibold text-white mb-1 line-clamp-2">{material.name}</h4>
                <p className="text-sm text-gray-400">{material.category}</p>
              </div>
              {material.inStock && (
                <span className="px-2 py-1 bg-green-500/20 text-green-400 text-sm font-semibold rounded">
                  In Stock
                </span>
              )}
            </div>
            
            <div className="mb-4">
              <p className="text-2xl font-bold text-white">
                ${material.basePrice?.toFixed(2) || '0.00'}
              </p>
              {material.vendorName && (
                <p className="text-sm text-gray-500 mt-1">from {material.vendorName}</p>
              )}
            </div>

            {/* ONE-CLICK ADD TO QUOTE BUTTON */}
            <button
              onClick={() => quickAddToQuote(material)}
              className="w-full px-4 py-2 bg-gradient-to-r from-[#ea580c] to-orange-600 hover:from-[#dc2626] hover:to-orange-700 text-white font-semibold rounded-lg transition-all flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20"
            >
              <Plus className="w-4 h-4" />
              Add to Quote
            </button>
          </div>
        ))}
      </div>

      {materials.length === 0 && (
        <div className="text-center py-12">
          <Package className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400 text-lg mb-2">No materials found</p>
          <p className="text-gray-500 text-sm">Try adjusting your search or filters</p>
        </div>
      )}
    </div>
  );
}

// ── MY STORE INTEGRATION ────────────────────────────────────────────────────
function MyStoreSection({ quickAddToQuote }: { quickAddToQuote: (m: any) => void }) {
  const [config, setConfig] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [showSetup, setShowSetup] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [form, setForm] = useState({ storeType: 'shopify', storeUrl: '', apiKey: '', apiSecret: '' });
  const [search, setSearch] = useState('');

  const SERVER = `https://${(window as any).__SUPABASE_URL__ || ''}`;

  useEffect(() => { loadConfig(); }, []);

  const loadConfig = async () => {
    try {
      const { supabase } = await import('../lib/supabase');
      const { projectId, publicAnonKey } = await import('../utils/supabase/info');
      const server = `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6`;
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || publicAnonKey;

      const [cfgRes, prodRes] = await Promise.all([
        fetch(`${server}/my-store/config`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${server}/my-store/products`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      if (cfgRes.ok) { const d = await cfgRes.json(); setConfig(d.config); if (d.config) setForm(d.config); }
      if (prodRes.ok) { const d = await prodRes.json(); setProducts(d.products || []); }
    } catch {}
  };

  const saveAndSync = async () => {
    setSyncing(true);
    try {
      const { supabase } = await import('../lib/supabase');
      const { projectId, publicAnonKey } = await import('../utils/supabase/info');
      const server = `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6`;
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || publicAnonKey;

      await fetch(`${server}/my-store/config`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      const syncRes = await fetch(`${server}/my-store/sync`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
      const syncData = await syncRes.json();

      if (syncRes.ok) {
        setConfig(form);
        setShowSetup(false);
        await loadConfig();
        const { toast } = await import('sonner@2.0.3');
        toast.success(`Synced ${syncData.count} products from your store!`);
      } else {
        const { toast } = await import('sonner@2.0.3');
        toast.error(syncData.error || 'Sync failed — check your store URL and API key');
      }
    } catch (e: any) {
      const { toast } = await import('sonner@2.0.3');
      toast.error('Connection failed: ' + e.message);
    }
    setSyncing(false);
  };

  const filtered = products.filter(p => !search || p.name?.toLowerCase().includes(search.toLowerCase()) || p.category?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="bg-gradient-to-r from-blue-600/10 to-purple-600/10 border-2 border-blue-500/30 rounded-xl p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2 mb-1">
            <Store className="w-6 h-6 text-blue-400" />
            My Ecommerce Store
          </h2>
          <p className="text-sm text-gray-400">{config ? `Connected: ${config.storeType} · ${products.length} products` : 'Connect your store to pull products into quotes'}</p>
        </div>
        <button onClick={() => setShowSetup(!showSetup)} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition ${config ? 'bg-blue-600/20 border border-blue-500/30 text-blue-300 hover:bg-blue-600/30' : 'bg-blue-600 hover:bg-blue-500 text-white'}`}>
          {config ? '⚙️ Settings' : '+ Connect Store'}
        </button>
      </div>

      {/* Setup form */}
      {showSetup && (
        <div className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl p-5 space-y-4">
          <h3 className="font-bold text-white text-sm">Store Connection</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Store Type</label>
              <select value={form.storeType} onChange={e => setForm(f => ({ ...f, storeType: e.target.value }))} className="w-full px-3 py-2.5 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl text-sm text-white focus:border-blue-500 focus:outline-none">
                <option value="shopify">Shopify</option>
                <option value="woocommerce">WooCommerce</option>
                <option value="custom">Custom REST API</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">
                {form.storeType === 'custom' ? 'Products API URL' : 'Store URL'}
              </label>
              <input value={form.storeUrl} onChange={e => setForm(f => ({ ...f, storeUrl: e.target.value }))} placeholder={form.storeType === 'shopify' ? 'mystore.myshopify.com' : form.storeType === 'woocommerce' ? 'https://mystore.com' : 'https://mystore.com/api/products'} className="w-full px-3 py-2.5 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl text-sm text-white placeholder-gray-600 focus:border-blue-500 focus:outline-none" />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">
                {form.storeType === 'shopify' ? 'Admin API Access Token' : form.storeType === 'woocommerce' ? 'Consumer Key' : 'API Key (optional)'}
              </label>
              <input value={form.apiKey} onChange={e => setForm(f => ({ ...f, apiKey: e.target.value }))} placeholder="API key or access token" type="password" className="w-full px-3 py-2.5 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl text-sm text-white placeholder-gray-600 focus:border-blue-500 focus:outline-none" />
            </div>
            {form.storeType === 'woocommerce' && (
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Consumer Secret</label>
                <input value={form.apiSecret} onChange={e => setForm(f => ({ ...f, apiSecret: e.target.value }))} placeholder="Consumer secret" type="password" className="w-full px-3 py-2.5 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl text-sm text-white placeholder-gray-600 focus:border-blue-500 focus:outline-none" />
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <button onClick={saveAndSync} disabled={syncing || !form.storeUrl} className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition disabled:opacity-50 text-sm">
              {syncing ? <><RefreshCw className="w-4 h-4 animate-spin" /> Syncing...</> : '🔄 Save & Sync Products'}
            </button>
            <button onClick={() => setShowSetup(false)} className="px-4 py-2.5 bg-white/5 border border-[#2A2A2A] text-gray-400 rounded-xl text-sm transition hover:text-white">Cancel</button>
          </div>
          <p className="text-xs text-gray-600">
            {form.storeType === 'shopify' && 'Get your token from Shopify Admin → Settings → Apps → Custom apps'}
            {form.storeType === 'woocommerce' && 'Get keys from WooCommerce → Settings → Advanced → REST API'}
            {form.storeType === 'custom' && 'URL should return a JSON array of products with name, price, and image fields'}
          </p>
        </div>
      )}

      {/* Products grid */}
      {products.length > 0 && !showSetup && (
        <div className="space-y-3">
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search your store products..." className="w-full px-3 py-2.5 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-sm text-white placeholder-gray-600 focus:border-blue-500 focus:outline-none" />
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 max-h-80 overflow-y-auto">
            {filtered.slice(0, 24).map(product => (
              <div key={product.id} className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl p-3 hover:border-blue-500/40 transition group">
                {product.imageUrl && <img src={product.imageUrl} alt={product.name} className="w-full h-24 object-cover rounded-lg mb-2 bg-[#1A1A1A]" />}
                <p className="text-xs font-semibold text-white line-clamp-2 mb-1">{product.name}</p>
                <p className="text-xs text-gray-500 mb-2">{product.category}</p>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-green-400">${(product.price || 0).toFixed(2)}</span>
                  <button onClick={() => quickAddToQuote(product)} className="text-[10px] px-2 py-1 bg-blue-600/20 hover:bg-blue-600/40 border border-blue-500/30 text-blue-300 rounded-lg transition opacity-0 group-hover:opacity-100">
                    + Add
                  </button>
                </div>
              </div>
            ))}
          </div>
          {filtered.length > 24 && <p className="text-xs text-gray-600 text-center">{filtered.length - 24} more products — refine search to find them</p>}
        </div>
      )}

      {config && products.length === 0 && !showSetup && (
        <div className="text-center py-6 text-gray-500 text-sm">
          <p>No products synced yet.</p>
          <button onClick={saveAndSync} disabled={syncing} className="mt-3 px-4 py-2 bg-blue-600/20 border border-blue-500/30 text-blue-300 rounded-lg text-xs hover:bg-blue-600/30 transition">
            {syncing ? 'Syncing...' : 'Sync Now'}
          </button>
        </div>
      )}
    </div>
  );
}

function VendorPortalTab() {
  const [showSubmitForm, setShowSubmitForm] = useState(false);

  return (
    <div className="space-y-6">
      {/* Vendor Portal Header */}
      <div className="bg-gradient-to-r from-blue-600/10 to-purple-600/10 border-2 border-blue-500/30 rounded-xl p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center flex-shrink-0">
              <Building2 className="w-8 h-8 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">Vendor Material Submission Portal</h2>
              <p className="text-gray-300 mb-4">
                Vendors can easily submit their products to our materials catalog. All submissions are reviewed before publishing.
              </p>
              <div className="flex flex-wrap gap-2">
                <span className="px-3 py-1 bg-green-500/20 border border-green-500/40 text-green-200 text-sm font-semibold rounded-full flex items-center gap-1">
                  <CheckCircle className="w-4 h-4" />
                  Fast Approval
                </span>
                <span className="px-3 py-1 bg-blue-500/20 border border-blue-500/40 text-blue-200 text-sm font-semibold rounded-full flex items-center gap-1">
                  <Shield className="w-4 h-4" />
                  Verified Only
                </span>
                <span className="px-3 py-1 bg-purple-500/20 border border-purple-500/40 text-purple-200 text-sm font-semibold rounded-full flex items-center gap-1">
                  <Upload className="w-4 h-4" />
                  Bulk Upload
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={() => setShowSubmitForm(true)}
            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold rounded-xl hover:from-blue-700 hover:to-purple-700 transition flex items-center gap-2 shadow-lg shadow-blue-500/30 whitespace-nowrap"
          >
            <Plus className="w-5 h-5" />
            Submit Material
          </button>
        </div>
      </div>

      {/* Submission Form */}
      {showSubmitForm ? (
        <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-white">Submit New Material</h3>
            <button
              onClick={() => setShowSubmitForm(false)}
              className="text-gray-400 hover:text-white transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Material Name *</label>
              <input
                type="text"
                placeholder="e.g., Premium Oak Hardwood Flooring"
                className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Category *</label>
                <select className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option>Select category...</option>
                  <option>Flooring</option>
                  <option>Plumbing</option>
                  <option>Electrical</option>
                  <option>HVAC</option>
                  <option>Roofing</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Price (USD) *</label>
                <input
                  type="number"
                  placeholder="0.00"
                  step="0.01"
                  className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Description *</label>
              <textarea
                rows={4}
                placeholder="Detailed product description..."
                className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">SKU / Model Number</label>
                <input
                  type="text"
                  placeholder="e.g., OAK-1000-NAT"
                  className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Stock Status</label>
                <select className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option>In Stock</option>
                  <option>Low Stock</option>
                  <option>Out of Stock</option>
                  <option>Made to Order</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3">
              <button className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold rounded-xl hover:from-blue-700 hover:to-purple-700 transition">
                Submit for Review
              </button>
              <button
                onClick={() => setShowSubmitForm(false)}
                className="px-6 py-3 bg-[#2A2A2A] text-gray-300 font-semibold rounded-xl hover:bg-[#3A3A3A] transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-12 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl">
          <Store className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400 text-lg mb-2">No submissions yet</p>
          <p className="text-gray-500 text-sm mb-6">Click "Submit Material" to add your first product</p>
          <button
            onClick={() => setShowSubmitForm(true)}
            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold rounded-xl hover:from-blue-700 hover:to-purple-700 transition inline-flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Submit Material
          </button>
        </div>
      )}

      {/* Bulk Upload Option */}
      <div className="bg-gradient-to-r from-purple-600/10 to-pink-600/10 border-2 border-purple-500/30 rounded-xl p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center flex-shrink-0">
            <Upload className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-white mb-2">Bulk Material Upload</h3>
            <p className="text-sm text-gray-300 mb-4">
              Have many materials to add? Upload a CSV file with all your products at once.
            </p>
            <button className="px-6 py-2 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 transition flex items-center gap-2">
              <Download className="w-4 h-4" />
              Download CSV Template
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function QuoteBuilderTab({ quoteMaterials, removeMaterialFromQuote, updateQuoteMaterial, returnToQuote, isQuoteMode }: any) {
  const totalCost = quoteMaterials.reduce((sum: number, item: any) => sum + (item.totalPrice || 0), 0);

  // Vendor comparison state
  const [comparingMaterialId, setComparingMaterialId] = useState<string | null>(null);
  const [vendorAlternatives, setVendorAlternatives] = useState<any[]>([]);
  const [loadingVendorAlternatives, setLoadingVendorAlternatives] = useState(false);

  // Purchase order state
  const [showPurchaseOrders, setShowPurchaseOrders] = useState(false);
  const [purchaseOrders, setPurchaseOrders] = useState<any[]>([]);
  const [deliveryPreference, setDeliveryPreference] = useState<'pickup' | 'delivery'>('delivery');

  if (!isQuoteMode || quoteMaterials.length === 0) {
    return (
      <div className="text-center py-12 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl">
        <ShoppingCart className="w-16 h-16 text-gray-600 mx-auto mb-4" />
        <p className="text-gray-400 text-lg mb-2">No materials in quote</p>
        <p className="text-gray-500 text-sm">Go to Catalog and click "Add to Quote" on any material</p>
      </div>
    );
  }

  const findVendorAlternativesForMaterial = async (material: any) => {
    setComparingMaterialId(material.id);
    setLoadingVendorAlternatives(true);

    try {
      const searchTerm = material.description || material.name;
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6/vendor-pricing/compare`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({
            materialId: material.id,
            materialName: searchTerm,
            basePrice: material.unitPrice,
            quantity: material.quantity,
          }),
        }
      );

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Vendor pricing request failed (${res.status}): ${errText}`);
      }

      const json = await res.json();
      if (!json.success) {
        throw new Error(`Vendor pricing error: ${json.error || 'unknown'}`);
      }

      setVendorAlternatives(json.data || []);
    } catch (error) {
      console.error('Error fetching vendor alternatives from server:', error);
      toast.error('Failed to fetch vendor alternatives');
    } finally {
      setLoadingVendorAlternatives(false);
    }
  };

  const selectVendorAlternative = (material: any, alternative: any) => {
    // Update the material with new vendor info
    updateQuoteMaterial(material.id, {
      supplier: alternative.vendorName,
      unitPrice: alternative.price,
      totalPrice: alternative.price * material.quantity,
      sku: alternative.sku
    });

    setComparingMaterialId(null);
    setVendorAlternatives([]);
    toast.success(`✅ Selected ${alternative.vendorName} for ${material.description}`);
  };

  const createPurchaseOrders = () => {
    // Group materials by vendor
    const grouped: Record<string, any[]> = {};

    quoteMaterials.forEach((material: any) => {
      const vendor = material.supplier || 'Unassigned';
      if (!grouped[vendor]) {
        grouped[vendor] = [];
      }
      grouped[vendor].push(material);
    });

    // Create PO objects
    const pos = Object.entries(grouped).map(([vendor, items]) => ({
      vendor,
      items,
      total: items.reduce((sum: number, item: any) => sum + (item.totalPrice || 0), 0),
      poNumber: `PO-${Date.now()}-${vendor.substring(0, 3).toUpperCase()}`
    }));

    setPurchaseOrders(pos);
    setShowPurchaseOrders(true);
  };

  const exportPOToCSV = (po: any) => {
    const headers = ['Item', 'Quantity', 'Unit', 'Unit Price', 'Total', 'SKU'];
    const rows = po.items.map((item: any) => [
      item.name || item.description || 'Unnamed Material',
      item.quantity,
      item.unit,
      item.unitPrice.toFixed(2),
      item.totalPrice.toFixed(2),
      item.sku || 'N/A'
    ]);

    const csvContent = [
      `Purchase Order: ${po.poNumber}`,
      `Vendor: ${po.vendor}`,
      `Delivery Preference: ${deliveryPreference === 'pickup' ? 'Employee Pickup' : 'Delivery to Site'}`,
      `Date: ${new Date().toLocaleDateString()}`,
      '',
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${po.poNumber}.csv`;
    a.click();

    toast.success(`Exported ${po.poNumber} to CSV`);
  };

  const sendPORequest = async (po: any) => {
    // In production, this would send to vendor API or email
    toast.success(`📧 Purchase order ${po.poNumber} sent to ${po.vendor}`, {
      description: `Delivery: ${deliveryPreference === 'pickup' ? 'Employee Pickup' : 'Delivery to Site'}`
    });
  };

  return (
    <div className="space-y-6">
      {/* Quote Summary */}
      <div className="bg-gradient-to-r from-[#ea580c]/10 to-orange-600/10 border-2 border-[#ea580c]/50 rounded-xl p-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white mb-2">Quote Materials</h2>
            <p className="text-gray-300">{quoteMaterials.length} materials • Total: ${totalCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          </div>
          <button
            onClick={returnToQuote}
            className="px-6 py-3 bg-gradient-to-r from-[#ea580c] to-orange-600 hover:from-[#dc2626] hover:to-orange-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-orange-500/30 flex items-center gap-2"
          >
            <ArrowRight className="w-5 h-5" />
            Return to Quote Workflow
          </button>
        </div>
      </div>

      {/* Materials List */}
      <div className="space-y-3">
        {quoteMaterials.map((item: any, idx: number) => (
          <div key={item.id} className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-4 hover:border-[#ea580c] transition">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <span className="px-2 py-1 bg-[#ea580c]/20 text-[#ea580c] text-sm font-bold rounded">
                    #{idx + 1}
                  </span>
                  <h4 className="font-semibold text-white">{item.name || item.description || 'Unnamed Material'}</h4>
                </div>
                <div className="flex items-center gap-6 text-sm">
                  <span className="text-gray-400">{item.quantity || 1} {item.unit || 'ea'}</span>
                  <span className="text-gray-600">×</span>
                  <span className="text-gray-400">${(item.unitPrice || 0).toFixed(2)}</span>
                  <span className="text-gray-600">=</span>
                  <span className="text-white font-semibold">${(item.totalPrice || 0).toFixed(2)}</span>
                  {item.supplier && (
                    <>
                      <span className="text-gray-600">•</span>
                      <span className="px-3 py-1 bg-cyan-500/20 border border-cyan-500/50 text-cyan-400 rounded-lg font-semibold flex items-center gap-1.5">
                        <Store className="w-3.5 h-3.5" />
                        {item.supplier}
                      </span>
                    </>
                  )}
                  {!item.supplier && (
                    <>
                      <span className="text-gray-600">•</span>
                      <span className="px-3 py-1 bg-yellow-500/20 border border-yellow-500/50 text-yellow-400 rounded-lg font-semibold text-xs flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        No Vendor Selected
                      </span>
                    </>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => findVendorAlternativesForMaterial(item)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition flex items-center gap-2"
                >
                  <GitCompare className="w-4 h-4" />
                  Compare Vendors
                </button>
                <button
                  onClick={() => removeMaterialFromQuote(item.id)}
                  className="p-2 hover:bg-red-600/20 rounded-lg transition text-red-400 hover:text-red-300"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Vendor Comparison Dropdown */}
            {comparingMaterialId === item.id && (
              <div className="mt-4 p-4 bg-black/60 border border-yellow-500/30 rounded-lg">
                {loadingVendorAlternatives ? (
                  <div className="text-center py-4">
                    <RefreshCw className="w-6 h-6 text-blue-500 animate-spin mx-auto mb-2" />
                    <p className="text-sm text-gray-400">Searching vendors...</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold text-white">Available from:</h4>
                      <button
                        onClick={() => setComparingMaterialId(null)}
                        className="text-gray-400 hover:text-white"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    {vendorAlternatives.map((alt, altIdx) => {
                      const savings = (item.unitPrice - alt.price) * item.quantity;
                      const vendorColors = {
                        'Home Depot': 'border-orange-500/50 bg-orange-500/10',
                        'Lowes': 'border-blue-500/50 bg-blue-500/10',
                        'Grainger': 'border-red-500/50 bg-red-500/10'
                      };
                      const colorClass = vendorColors[alt.vendorName as keyof typeof vendorColors] || 'border-gray-500/50 bg-gray-500/10';

                      return (
                        <button
                          key={altIdx}
                          onClick={() => selectVendorAlternative(item, alt)}
                          className={`w-full p-3 border-2 ${colorClass} rounded-lg hover:shadow-lg transition text-left`}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-bold text-white">{alt.vendorName}</p>
                              <p className="text-sm text-gray-400">{alt.sku}</p>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-white text-lg">${alt.price.toFixed(2)}/{item.unit}</p>
                              {savings > 0 && (
                                <p className="text-sm text-green-400 font-semibold">💰 Save ${savings.toFixed(2)}</p>
                              )}
                              {savings < 0 && (
                                <p className="text-sm text-red-400 font-semibold">+${Math.abs(savings).toFixed(2)}</p>
                              )}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Create Purchase Orders Button */}
      <div className="bg-gradient-to-r from-purple-600/10 to-blue-600/10 border-2 border-purple-500/30 rounded-xl p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-white mb-1">Ready to Order?</h3>
            <p className="text-gray-300">Create purchase orders grouped by vendor</p>
          </div>
          <button
            onClick={createPurchaseOrders}
            className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-purple-500/30 flex items-center gap-2"
          >
            <Receipt className="w-5 h-5" />
            Create Purchase Orders
          </button>
        </div>
      </div>

      {/* Total */}
      <div className="bg-[#0A0A0A] border border-[#ea580c] rounded-xl p-6">
        <div className="flex items-center justify-between">
          <span className="text-xl font-bold text-white">Total Materials Cost:</span>
          <span className="text-3xl font-bold text-[#ea580c]">
            ${totalCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
      </div>

      {/* Purchase Orders Modal */}
      {showPurchaseOrders && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-6">
          <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-[#1A1A1A] border-b border-[#2A2A2A] p-6 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-white mb-1">Purchase Orders</h2>
                <p className="text-gray-400">Grouped by vendor • {purchaseOrders.length} order{purchaseOrders.length !== 1 ? 's' : ''}</p>
              </div>
              <button
                onClick={() => setShowPurchaseOrders(false)}
                className="p-2 hover:bg-[#2A2A2A] rounded-lg transition text-gray-400 hover:text-white"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Delivery Preference */}
            <div className="px-6 pt-6">
              <div className="bg-gradient-to-r from-blue-600/10 to-purple-600/10 border-2 border-blue-500/30 rounded-xl p-4 mb-6">
                <h3 className="text-lg font-bold text-white mb-3">Delivery Preference</h3>
                <div className="flex gap-4">
                  <button
                    onClick={() => setDeliveryPreference('delivery')}
                    className={`flex-1 p-4 rounded-lg border-2 transition ${
                      deliveryPreference === 'delivery'
                        ? 'border-blue-500 bg-blue-500/20 text-white'
                        : 'border-[#2A2A2A] bg-[#0A0A0A] text-gray-400'
                    }`}
                  >
                    <Truck className="w-6 h-6 mx-auto mb-2" />
                    <p className="font-semibold">Delivery to Site</p>
                  </button>
                  <button
                    onClick={() => setDeliveryPreference('pickup')}
                    className={`flex-1 p-4 rounded-lg border-2 transition ${
                      deliveryPreference === 'pickup'
                        ? 'border-blue-500 bg-blue-500/20 text-white'
                        : 'border-[#2A2A2A] bg-[#0A0A0A] text-gray-400'
                    }`}
                  >
                    <Store className="w-6 h-6 mx-auto mb-2" />
                    <p className="font-semibold">Employee Pickup</p>
                  </button>
                </div>
              </div>
            </div>

            {/* Purchase Orders List */}
            <div className="p-6 space-y-6">
              {purchaseOrders.map((po, idx) => (
                <div key={idx} className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-xl font-bold text-white mb-1">{po.vendor}</h3>
                      <p className="text-sm text-gray-400">PO #: {po.poNumber}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-400 mb-1">Total</p>
                      <p className="text-2xl font-bold text-[#ea580c]">${po.total.toFixed(2)}</p>
                    </div>
                  </div>

                  {/* Items */}
                  <div className="space-y-2 mb-4">
                    {po.items.map((item: any, itemIdx: number) => (
                      <div key={itemIdx} className="flex items-center justify-between py-2 border-b border-[#2A2A2A] last:border-0">
                        <div className="flex-1">
                          <p className="text-white font-medium">{item.name || item.description || 'Unnamed Material'}</p>
                          <p className="text-sm text-gray-400">
                            {item.quantity} {item.unit} × ${item.unitPrice.toFixed(2)}
                          </p>
                        </div>
                        <p className="text-white font-semibold">${item.totalPrice.toFixed(2)}</p>
                      </div>
                    ))}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3">
                    <button
                      onClick={() => exportPOToCSV(po)}
                      className="flex-1 px-4 py-3 bg-[#2A2A2A] hover:bg-[#3A3A3A] text-white font-semibold rounded-lg transition flex items-center justify-center gap-2"
                    >
                      <Download className="w-4 h-4" />
                      Export CSV
                    </button>
                    <button
                      onClick={() => sendPORequest(po)}
                      className="flex-1 px-4 py-3 bg-gradient-to-r from-[#ea580c] to-orange-600 hover:from-[#dc2626] hover:to-orange-700 text-white font-bold rounded-lg transition flex items-center justify-center gap-2"
                    >
                      <FileText className="w-4 h-4" />
                      Send PO Request
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Shared procurement types ─────────────────────────────────────────────────

const PO_API = `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6`;
const poHeaders = {
  Authorization: `Bearer ${publicAnonKey}`,
  'Content-Type': 'application/json',
};

interface POLineItem {
  materialId: string;
  name: string;
  quantity: number;
  unitPrice: number;
}

interface PurchaseOrderRecord {
  id: string;
  poNumber?: string;
  vendorName?: string;
  supplier?: string;
  status: 'draft' | 'sent' | 'confirmed' | 'received' | 'cancelled' | string;
  orderDate?: string;
  expectedDate?: string;
  lineItems?: POLineItem[];
  total?: number;
  notes?: string;
  createdAt?: string;
}

const PO_STATUS_STYLES: Record<string, string> = {
  draft: 'bg-gray-600/20 text-gray-300',
  sent: 'bg-blue-600/20 text-blue-400',
  confirmed: 'bg-yellow-600/20 text-yellow-400',
  received: 'bg-green-600/20 text-green-400',
  cancelled: 'bg-red-600/20 text-red-400',
  pending: 'bg-yellow-600/20 text-yellow-400',
};

const usd = (n: number) =>
  `$${Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const poTotal = (po: PurchaseOrderRecord) =>
  Number(po.total) ||
  (po.lineItems || []).reduce((sum, li) => sum + (Number(li.quantity) || 0) * (Number(li.unitPrice) || 0), 0);

// ─── Database tab ─────────────────────────────────────────────────────────────

function DatabaseTab() {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<Material | null>(null);
  const [form, setForm] = useState({ basePrice: '', leadTime: '', minOrderQuantity: '', inStock: true });

  const reload = () => setMaterials(materialsHubService.getAllMaterials());
  useEffect(() => { reload(); }, []);

  const filtered = materials.filter((m) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return [m.name, m.sku, m.category, m.manufacturer, m.vendorName]
      .some((field) => String(field || '').toLowerCase().includes(q));
  });

  const stats = {
    total: materials.length,
    inStock: materials.filter((m) => m.inStock).length,
    categories: new Set(materials.map((m) => m.category)).size,
    avgPrice: materials.length
      ? materials.reduce((sum, m) => sum + (Number(m.basePrice) || 0), 0) / materials.length
      : 0,
  };

  const openEdit = (m: Material) => {
    setEditing(m);
    setForm({
      basePrice: String(m.basePrice ?? ''),
      leadTime: m.leadTime || '',
      minOrderQuantity: String(m.minOrderQuantity ?? ''),
      inStock: !!m.inStock,
    });
  };

  const handleSave = () => {
    if (!editing) return;
    const price = Number(form.basePrice);
    if (!Number.isFinite(price) || price < 0) {
      toast.error('Enter a valid base price.');
      return;
    }
    const moq = Number(form.minOrderQuantity);
    const result = materialsHubService.updateMaterial(editing.id, {
      basePrice: price,
      leadTime: form.leadTime,
      minOrderQuantity: Number.isFinite(moq) && moq > 0 ? moq : 1,
      inStock: form.inStock,
    });
    if (!result) {
      toast.error('That material is no longer in the library.');
      return;
    }
    toast.success(`${result.name} updated`);
    setEditing(null);
    reload();
  };

  const handleDelete = (m: Material) => {
    if (!window.confirm(`Remove "${m.name}" from the material library?`)) return;
    if (materialsHubService.deleteMaterial(m.id)) {
      toast.success('Material removed');
      reload();
    } else {
      toast.error('Could not remove that material.');
    }
  };

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(materials, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `material-library-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Library exported');
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Materials', value: String(stats.total) },
          { label: 'In stock', value: String(stats.inStock) },
          { label: 'Categories', value: String(stats.categories) },
          { label: 'Average price', value: stats.total ? usd(stats.avgPrice) : '—' },
        ].map((s) => (
          <div key={s.label} className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-4">
            <p className="text-gray-400 text-sm mb-1">{s.label}</p>
            <p className="text-2xl font-bold text-white">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, SKU, category, manufacturer or vendor"
            className="w-full bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg pl-9 pr-3 py-2 text-white"
          />
        </div>
        <button
          onClick={handleExport}
          className="px-4 py-2 bg-[#2A2A2A] hover:bg-[#3A3A3A] text-white rounded-lg flex items-center gap-2"
        >
          <Download className="w-4 h-4" />
          Export Library
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl">
          <Database className="w-12 h-12 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-300 mb-1">{materials.length === 0 ? 'The material library is empty' : 'No materials match that search'}</p>
          <p className="text-gray-500 text-sm">
            {materials.length === 0 ? 'Add materials from the Catalog or Vendor Portal tab.' : 'Try a different term.'}
          </p>
        </div>
      ) : (
        <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-500 text-left border-b border-[#2A2A2A]">
                <th className="p-3 font-medium">Material</th>
                <th className="p-3 font-medium">SKU</th>
                <th className="p-3 font-medium">Category</th>
                <th className="p-3 font-medium">Price</th>
                <th className="p-3 font-medium">Lead time</th>
                <th className="p-3 font-medium">Stock</th>
                <th className="p-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((m) => (
                <tr key={m.id} className="border-b border-[#2A2A2A]/60">
                  <td className="p-3 text-white">
                    {m.name}
                    {m.manufacturer && <span className="block text-gray-500 text-xs">{m.manufacturer}</span>}
                  </td>
                  <td className="p-3 text-gray-400">{m.sku || '—'}</td>
                  <td className="p-3 text-gray-400">{m.category}</td>
                  <td className="p-3 text-white">{usd(m.basePrice)}<span className="text-gray-500"> / {m.unit}</span></td>
                  <td className="p-3 text-gray-400">{m.leadTime || '—'}</td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded text-xs ${m.inStock ? 'bg-green-600/20 text-green-400' : 'bg-red-600/20 text-red-400'}`}>
                      {m.inStock ? 'In stock' : 'Out'}
                    </span>
                  </td>
                  <td className="p-3 text-right whitespace-nowrap">
                    <button onClick={() => openEdit(m)} className="p-2 text-gray-400 hover:text-white" aria-label={`Edit ${m.name}`}>
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(m)} className="p-2 text-gray-500 hover:text-red-400" aria-label={`Delete ${m.name}`}>
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-[#2A2A2A]">
              <h3 className="text-lg font-bold text-white">Edit {editing.name}</h3>
              <button onClick={() => setEditing(null)} className="text-gray-400 hover:text-white" aria-label="Close">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Base price ({editing.unit})</label>
                <input
                  type="number" min="0" step="0.01"
                  value={form.basePrice}
                  onChange={(e) => setForm({ ...form, basePrice: e.target.value })}
                  className="w-full bg-[#0F0F0F] border border-[#2A2A2A] rounded-lg px-3 py-2 text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Lead time</label>
                  <input
                    value={form.leadTime}
                    onChange={(e) => setForm({ ...form, leadTime: e.target.value })}
                    placeholder="e.g. 3-5 days"
                    className="w-full bg-[#0F0F0F] border border-[#2A2A2A] rounded-lg px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Min order qty</label>
                  <input
                    type="number" min="1" step="1"
                    value={form.minOrderQuantity}
                    onChange={(e) => setForm({ ...form, minOrderQuantity: e.target.value })}
                    className="w-full bg-[#0F0F0F] border border-[#2A2A2A] rounded-lg px-3 py-2 text-white"
                  />
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                <input type="checkbox" checked={form.inStock} onChange={(e) => setForm({ ...form, inStock: e.target.checked })} />
                In stock
              </label>
            </div>
            <div className="flex justify-end gap-2 p-5 border-t border-[#2A2A2A]">
              <button onClick={() => setEditing(null)} className="px-4 py-2 bg-[#2A2A2A] hover:bg-[#3A3A3A] text-white rounded-lg">Cancel</button>
              <button onClick={handleSave} className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-semibold">Save</button>
            </div>
          </div>
        </div>
      )}

      <p className="text-gray-600 text-xs">
        This library is stored in your browser, so edits here are local to this device until the catalog is moved to the server.
      </p>
    </div>
  );
}

// ─── Procurement tab ──────────────────────────────────────────────────────────

function ProcurementTab() {
  const [orders, setOrders] = useState<PurchaseOrderRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showCreate, setShowCreate] = useState(false);

  const [materials] = useState<Material[]>(() => materialsHubService.getAllMaterials());
  const [draft, setDraft] = useState({
    vendorName: '', poNumber: '', orderDate: new Date().toISOString().slice(0, 10),
    expectedDate: '', notes: '',
  });
  const [lines, setLines] = useState<POLineItem[]>([]);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${PO_API}/purchase-orders`, { headers: poHeaders });
      if (!res.ok) {
        const detail = await res.text();
        throw new Error(`Could not load purchase orders (${res.status}): ${detail.slice(0, 200)}`);
      }
      const data = await res.json();
      setOrders(Array.isArray(data) ? data : (data.orders || []));
      setError(null);
    } catch (err: any) {
      console.error('Failed to load purchase orders:', err);
      setError(err?.message || 'Could not load purchase orders.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const draftTotal = lines.reduce((sum, l) => sum + (Number(l.quantity) || 0) * (Number(l.unitPrice) || 0), 0);

  const addLine = () => setLines([...lines, { materialId: '', name: '', quantity: 1, unitPrice: 0 }]);

  const setLine = (index: number, patch: Partial<POLineItem>) =>
    setLines(lines.map((l, i) => (i === index ? { ...l, ...patch } : l)));

  const pickMaterial = (index: number, materialId: string) => {
    const m = materials.find((x) => x.id === materialId);
    setLine(index, {
      materialId,
      name: m?.name || '',
      unitPrice: Number(m?.basePrice) || 0,
    });
  };

  const resetDraft = () => {
    setDraft({ vendorName: '', poNumber: '', orderDate: new Date().toISOString().slice(0, 10), expectedDate: '', notes: '' });
    setLines([]);
  };

  const handleCreate = async () => {
    if (!draft.vendorName.trim()) {
      toast.error('Enter the vendor this order goes to.');
      return;
    }
    if (lines.length === 0 || lines.some((l) => !l.name.trim())) {
      toast.error('Add at least one line item, and give every line a material.');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`${PO_API}/purchase-orders`, {
        method: 'POST',
        headers: poHeaders,
        body: JSON.stringify({
          ...draft,
          supplier: draft.vendorName,
          poNumber: draft.poNumber.trim() || `PO-${Date.now().toString(36).toUpperCase()}`,
          status: 'draft',
          lineItems: lines,
          items: lines.length,
          total: draftTotal,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || `Server returned ${res.status}`);
      toast.success('Purchase order created');
      setShowCreate(false);
      resetDraft();
      load();
    } catch (err: any) {
      console.error('Failed to create purchase order:', err);
      toast.error(err?.message || 'Could not create the purchase order.');
    } finally {
      setSaving(false);
    }
  };

  const setStatus = async (po: PurchaseOrderRecord, status: string) => {
    try {
      const res = await fetch(`${PO_API}/purchase-orders/${po.id}/status`, {
        method: 'PATCH',
        headers: poHeaders,
        body: JSON.stringify({ status }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || `Server returned ${res.status}`);
      toast.success(`Marked ${status}`);
      load();
    } catch (err: any) {
      console.error('Failed to update purchase order status:', err);
      toast.error(err?.message || 'Could not update the order.');
    }
  };

  const handleDelete = async (po: PurchaseOrderRecord) => {
    if (!window.confirm(`Delete ${po.poNumber || 'this purchase order'}?`)) return;
    try {
      const res = await fetch(`${PO_API}/purchase-orders/${po.id}`, { method: 'DELETE', headers: poHeaders });
      if (!res.ok) throw new Error(`Server returned ${res.status}`);
      toast.success('Purchase order deleted');
      load();
    } catch (err: any) {
      console.error('Failed to delete purchase order:', err);
      toast.error(err?.message || 'Could not delete the order.');
    }
  };

  const visible = statusFilter === 'all' ? orders : orders.filter((o) => o.status === statusFilter);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="text-xl font-bold text-white">Purchase Orders</h3>
          <p className="text-gray-400 text-sm">Raise orders against the material library and track them through delivery.</p>
        </div>
        <button
          onClick={() => setShowCreate((v) => !v)}
          className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-semibold flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          {showCreate ? 'Close' : 'New Purchase Order'}
        </button>
      </div>

      {error && (
        <div className="bg-red-950/40 border border-red-800 rounded-lg p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-red-300 font-semibold">Couldn't load purchase orders</p>
            <p className="text-red-400/80 text-sm">{error}</p>
          </div>
        </div>
      )}

      {showCreate && (
        <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Vendor *</label>
              <input
                value={draft.vendorName}
                onChange={(e) => setDraft({ ...draft, vendorName: e.target.value })}
                className="w-full bg-[#0F0F0F] border border-[#2A2A2A] rounded-lg px-3 py-2 text-white"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">PO number</label>
              <input
                value={draft.poNumber}
                onChange={(e) => setDraft({ ...draft, poNumber: e.target.value })}
                placeholder="auto-generated if blank"
                className="w-full bg-[#0F0F0F] border border-[#2A2A2A] rounded-lg px-3 py-2 text-white"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Order date</label>
              <input
                type="date"
                value={draft.orderDate}
                onChange={(e) => setDraft({ ...draft, orderDate: e.target.value })}
                className="w-full bg-[#0F0F0F] border border-[#2A2A2A] rounded-lg px-3 py-2 text-white"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Expected delivery</label>
              <input
                type="date"
                value={draft.expectedDate}
                onChange={(e) => setDraft({ ...draft, expectedDate: e.target.value })}
                className="w-full bg-[#0F0F0F] border border-[#2A2A2A] rounded-lg px-3 py-2 text-white"
              />
            </div>
          </div>

          <div className="space-y-2">
            {lines.map((line, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 items-end">
                <div className="col-span-6">
                  {i === 0 && <label className="block text-sm text-gray-400 mb-1">Material</label>}
                  <select
                    value={line.materialId}
                    onChange={(e) => pickMaterial(i, e.target.value)}
                    className="w-full bg-[#0F0F0F] border border-[#2A2A2A] rounded-lg px-3 py-2 text-white"
                  >
                    <option value="">Select a material…</option>
                    {materials.map((m) => (
                      <option key={m.id} value={m.id}>{m.name} — {usd(m.basePrice)}</option>
                    ))}
                  </select>
                </div>
                <div className="col-span-2">
                  {i === 0 && <label className="block text-sm text-gray-400 mb-1">Qty</label>}
                  <input
                    type="number" min="1" step="1"
                    value={line.quantity}
                    onChange={(e) => setLine(i, { quantity: Number(e.target.value) || 0 })}
                    className="w-full bg-[#0F0F0F] border border-[#2A2A2A] rounded-lg px-3 py-2 text-white"
                  />
                </div>
                <div className="col-span-3">
                  {i === 0 && <label className="block text-sm text-gray-400 mb-1">Unit price</label>}
                  <input
                    type="number" min="0" step="0.01"
                    value={line.unitPrice}
                    onChange={(e) => setLine(i, { unitPrice: Number(e.target.value) || 0 })}
                    className="w-full bg-[#0F0F0F] border border-[#2A2A2A] rounded-lg px-3 py-2 text-white"
                  />
                </div>
                <div className="col-span-1">
                  <button
                    onClick={() => setLines(lines.filter((_, x) => x !== i))}
                    className="p-2 text-gray-500 hover:text-red-400"
                    aria-label="Remove line"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
            <button onClick={addLine} className="text-orange-400 hover:text-orange-300 text-sm flex items-center gap-1">
              <Plus className="w-4 h-4" /> Add line item
            </button>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Notes</label>
            <textarea
              value={draft.notes}
              onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
              rows={2}
              className="w-full bg-[#0F0F0F] border border-[#2A2A2A] rounded-lg px-3 py-2 text-white"
            />
          </div>

          <div className="flex items-center justify-between border-t border-[#2A2A2A] pt-4">
            <p className="text-white font-semibold">Order total: {usd(draftTotal)}</p>
            <button
              onClick={handleCreate}
              disabled={saving}
              className="px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white rounded-lg font-semibold"
            >
              {saving ? 'Saving…' : 'Create Purchase Order'}
            </button>
          </div>
        </div>
      )}

      <div className="flex gap-2 flex-wrap">
        {['all', 'draft', 'sent', 'confirmed', 'received', 'cancelled'].map((sf) => (
          <button
            key={sf}
            onClick={() => setStatusFilter(sf)}
            className={`px-3 py-1.5 rounded-lg text-sm capitalize ${
              statusFilter === sf ? 'bg-orange-600 text-white' : 'bg-[#1A1A1A] border border-[#2A2A2A] text-gray-400 hover:text-white'
            }`}
          >
            {sf}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl text-gray-400">
          Loading purchase orders…
        </div>
      ) : visible.length === 0 ? (
        <div className="text-center py-12 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl">
          <Receipt className="w-12 h-12 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-300 mb-1">
            {orders.length === 0 ? 'No purchase orders yet' : `No ${statusFilter} orders`}
          </p>
          <p className="text-gray-500 text-sm">Create one to start tracking spend with your vendors.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {visible.map((po) => (
            <div key={po.id} className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-5">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <h4 className="font-bold text-white">{po.poNumber || po.id}</h4>
                    <span className={`px-2 py-0.5 rounded text-xs font-semibold ${PO_STATUS_STYLES[po.status] || PO_STATUS_STYLES.draft}`}>
                      {String(po.status || 'draft').toUpperCase()}
                    </span>
                  </div>
                  <p className="text-gray-400 text-sm mt-1">{po.vendorName || po.supplier || 'No vendor recorded'}</p>
                  <p className="text-gray-500 text-xs mt-1">
                    Ordered {po.orderDate || '—'}
                    {po.expectedDate ? ` • expected ${po.expectedDate}` : ''}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold text-white">{usd(poTotal(po))}</p>
                  <p className="text-gray-500 text-xs">{(po.lineItems || []).length} line item{(po.lineItems || []).length === 1 ? '' : 's'}</p>
                </div>
              </div>

              {(po.lineItems || []).length > 0 && (
                <div className="mt-3 border-t border-[#2A2A2A] pt-3 space-y-1">
                  {po.lineItems!.map((li, i) => (
                    <div key={`${po.id}-${i}`} className="flex justify-between text-sm">
                      <span className="text-gray-300">{li.name} × {li.quantity}</span>
                      <span className="text-gray-400">{usd((Number(li.quantity) || 0) * (Number(li.unitPrice) || 0))}</span>
                    </div>
                  ))}
                </div>
              )}

              {po.notes && <p className="text-gray-500 text-sm mt-2">{po.notes}</p>}

              <div className="flex items-center gap-2 mt-4 flex-wrap">
                {po.status === 'draft' && (
                  <button onClick={() => setStatus(po, 'sent')} className="px-3 py-1.5 bg-[#2A2A2A] hover:bg-[#3A3A3A] text-white rounded-lg text-sm">Mark Sent</button>
                )}
                {po.status === 'sent' && (
                  <button onClick={() => setStatus(po, 'confirmed')} className="px-3 py-1.5 bg-[#2A2A2A] hover:bg-[#3A3A3A] text-white rounded-lg text-sm">Mark Confirmed</button>
                )}
                {(po.status === 'sent' || po.status === 'confirmed') && (
                  <button onClick={() => setStatus(po, 'received')} className="px-3 py-1.5 bg-green-600/20 hover:bg-green-600/30 text-green-400 rounded-lg text-sm">Mark Received</button>
                )}
                {po.status !== 'received' && po.status !== 'cancelled' && (
                  <button onClick={() => setStatus(po, 'cancelled')} className="px-3 py-1.5 bg-[#2A2A2A] hover:bg-[#3A3A3A] text-gray-300 rounded-lg text-sm">Cancel</button>
                )}
                <button onClick={() => handleDelete(po)} className="p-2 text-gray-500 hover:text-red-400 ml-auto" aria-label="Delete order">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Analytics tab ────────────────────────────────────────────────────────────

function AnalyticsTab() {
  const [orders, setOrders] = useState<PurchaseOrderRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [materials] = useState<Material[]>(() => materialsHubService.getAllMaterials());

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${PO_API}/purchase-orders`, { headers: poHeaders });
        if (!res.ok) {
          const detail = await res.text();
          throw new Error(`Could not load purchase orders (${res.status}): ${detail.slice(0, 200)}`);
        }
        const data = await res.json();
        setOrders(Array.isArray(data) ? data : (data.orders || []));
        setError(null);
      } catch (err: any) {
        console.error('Failed to load material analytics:', err);
        setError(err?.message || 'Could not load material analytics.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Cancelled orders never became spend, so they're excluded everywhere below.
  const counted = orders.filter((o) => o.status !== 'cancelled');
  const totalSpend = counted.reduce((sum, o) => sum + poTotal(o), 0);
  const avgOrder = counted.length ? totalSpend / counted.length : 0;
  const vendors = new Set(counted.map((o) => o.vendorName || o.supplier).filter(Boolean));

  const monthly: { label: string; total: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    const total = counted.reduce((sum, o) => {
      const od = new Date(o.orderDate || o.createdAt || '');
      if (Number.isNaN(od.getTime())) return sum;
      return `${od.getFullYear()}-${od.getMonth()}` === key ? sum + poTotal(o) : sum;
    }, 0);
    monthly.push({ label: d.toLocaleString('en-US', { month: 'short' }), total });
  }
  const maxMonth = Math.max(...monthly.map((m) => m.total), 0);

  const byVendor = Object.entries(
    counted.reduce<Record<string, number>>((acc, o) => {
      const v = o.vendorName || o.supplier || 'Unspecified vendor';
      acc[v] = (acc[v] || 0) + poTotal(o);
      return acc;
    }, {}),
  ).sort((a, b) => b[1] - a[1]);

  const byMaterial = Object.entries(
    counted.reduce<Record<string, number>>((acc, o) => {
      for (const li of o.lineItems || []) {
        const name = li.name || 'Unnamed item';
        acc[name] = (acc[name] || 0) + (Number(li.quantity) || 0) * (Number(li.unitPrice) || 0);
      }
      return acc;
    }, {}),
  ).sort((a, b) => b[1] - a[1]).slice(0, 8);

  const byCategory = Object.entries(
    counted.reduce<Record<string, number>>((acc, o) => {
      for (const li of o.lineItems || []) {
        const cat = materials.find((m) => m.id === li.materialId)?.category || 'Uncategorized';
        acc[cat] = (acc[cat] || 0) + (Number(li.quantity) || 0) * (Number(li.unitPrice) || 0);
      }
      return acc;
    }, {}),
  ).sort((a, b) => b[1] - a[1]);

  if (loading) {
    return (
      <div className="text-center py-12 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl text-gray-400">
        Loading material analytics…
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-950/40 border border-red-800 rounded-lg p-5 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
        <div>
          <p className="text-red-300 font-semibold">Couldn't load material analytics</p>
          <p className="text-red-400/80 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (counted.length === 0) {
    return (
      <div className="text-center py-12 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl">
        <BarChart3 className="w-12 h-12 text-gray-600 mx-auto mb-3" />
        <p className="text-gray-300 mb-1">No material spend yet</p>
        <p className="text-gray-500 text-sm">Analytics fill in as purchase orders are raised on the Procurement tab.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total spend', value: usd(totalSpend) },
          { label: 'Orders placed', value: String(counted.length) },
          { label: 'Average order', value: usd(avgOrder) },
          { label: 'Vendors used', value: String(vendors.size) },
        ].map((s) => (
          <div key={s.label} className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-4">
            <p className="text-gray-400 text-sm mb-1">{s.label}</p>
            <p className="text-2xl font-bold text-white">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-5">
        <h4 className="font-bold text-white mb-4">Spend, last 6 months</h4>
        <div className="flex items-end gap-3 h-40">
          {monthly.map((m) => (
            <div key={m.label} className="flex-1 flex flex-col items-center justify-end gap-2">
              <span className="text-gray-500 text-xs">{m.total > 0 ? usd(m.total) : ''}</span>
              <div
                className="w-full bg-orange-600/70 rounded-t"
                style={{ height: maxMonth > 0 ? `${Math.max((m.total / maxMonth) * 100, m.total > 0 ? 4 : 0)}%` : '0%' }}
              />
              <span className="text-gray-400 text-xs">{m.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-5">
          <h4 className="font-bold text-white mb-4">Spend by vendor</h4>
          <div className="space-y-2">
            {byVendor.map(([name, total]) => (
              <div key={name} className="flex justify-between text-sm">
                <span className="text-gray-300">{name}</span>
                <span className="text-white">{usd(total)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-5">
          <h4 className="font-bold text-white mb-4">Spend by category</h4>
          {byCategory.length === 0 ? (
            <p className="text-gray-500 text-sm">No line items are linked to catalog materials yet.</p>
          ) : (
            <div className="space-y-2">
              {byCategory.map(([name, total]) => (
                <div key={name} className="flex justify-between text-sm">
                  <span className="text-gray-300">{name}</span>
                  <span className="text-white">{usd(total)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-5">
        <h4 className="font-bold text-white mb-4">Top materials by spend</h4>
        {byMaterial.length === 0 ? (
          <p className="text-gray-500 text-sm">No line items recorded on these orders.</p>
        ) : (
          <div className="space-y-2">
            {byMaterial.map(([name, total]) => (
              <div key={name} className="flex justify-between text-sm">
                <span className="text-gray-300">{name}</span>
                <span className="text-white">{usd(total)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}