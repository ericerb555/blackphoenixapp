import React, { useState } from 'react';
import { 
  Package, Wrench, ExternalLink, X, CheckCircle, 
  Search, Filter, Star, TrendingDown, Clock
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';

interface LineItem {
  id: string;
  type: 'labor' | 'material';
  description: string;
  quantity: number;
  unit: string;
  hours?: number;
  unitPrice: number;
  total: number;
  supplier?: string;
  quality?: string;
  optimized?: boolean;
  customerVisible?: boolean;
}

interface MaterialComparison {
  id: string;
  name: string;
  supplier: string;
  price: number;
  quality: string;
  inStock: boolean;
  leadTime: string;
}

interface CustomerQuoteViewProps {
  lineItems: LineItem[];
  totals: {
    laborTotal: number;
    materialsTotal: number;
    subtotal: number;
    tax: number;
    total: number;
  };
  quoteNumber: string;
  onMaterialSuggestion: (materialId: string, alternativeId: string) => void;
}

export default function CustomerQuoteView({ 
  lineItems, 
  totals, 
  quoteNumber,
  onMaterialSuggestion 
}: CustomerQuoteViewProps) {
  const [selectedMaterialId, setSelectedMaterialId] = useState<string | null>(null);
  const [showMaterialComparison, setShowMaterialComparison] = useState(false);
  const [comparisonResults, setComparisonResults] = useState<MaterialComparison[]>([]);
  const [isSearchingHub, setIsSearchingHub] = useState(false);
  const [showHubSearch, setShowHubSearch] = useState(false);
  const [hubSearchQuery, setHubSearchQuery] = useState('');
  const [hubSearchResults, setHubSearchResults] = useState<MaterialComparison[]>([]);
  const [suggestedSwaps, setSuggestedSwaps] = useState<string[]>([]);

  // Filter only customer-visible materials
  const customerVisibleMaterials = lineItems.filter(
    item => item.type === 'material' && item.customerVisible !== false
  );

  // Search Materials Hub for alternatives to specific material
  const handleCompareMaterial = (materialId: string) => {
    const material = lineItems.find(item => item.id === materialId);
    if (!material) return;

    setSelectedMaterialId(materialId);
    setIsSearchingHub(true);
    setShowMaterialComparison(true);

    toast.info('Searching Materials Hub...', {
      description: `Finding alternatives for ${material.description}`
    });

    // Simulate Materials Hub search
    setTimeout(() => {
      const mockResults: MaterialComparison[] = [
        {
          id: 'alt-1',
          name: material.description,
          supplier: material.supplier || 'Current Selection',
          price: material.unitPrice,
          quality: material.quality || 'Standard',
          inStock: true,
          leadTime: '2-3 days'
        },
        {
          id: 'alt-2',
          name: material.description + ' - Premium',
          supplier: 'Home Depot Pro',
          price: material.unitPrice * 0.85,
          quality: 'Premium',
          inStock: true,
          leadTime: '1-2 days'
        },
        {
          id: 'alt-3',
          name: material.description + ' - Budget',
          supplier: "Lowe's Commercial",
          price: material.unitPrice * 0.72,
          quality: 'Standard',
          inStock: true,
          leadTime: '3-5 days'
        },
        {
          id: 'alt-4',
          name: material.description + ' - Professional Grade',
          supplier: 'Ferguson Supply',
          price: material.unitPrice * 1.15,
          quality: 'Professional',
          inStock: false,
          leadTime: '5-7 days'
        },
        {
          id: 'alt-5',
          name: material.description + ' - Economy',
          supplier: 'Menards',
          price: material.unitPrice * 0.68,
          quality: 'Economy',
          inStock: true,
          leadTime: '2-4 days'
        },
        {
          id: 'alt-6',
          name: material.description + ' - Eco-Friendly',
          supplier: 'Build.com Green',
          price: material.unitPrice * 0.95,
          quality: 'Premium Eco',
          inStock: true,
          leadTime: '3-4 days'
        }
      ];

      setComparisonResults(mockResults);
      setIsSearchingHub(false);

      toast.success('Found Alternatives!', {
        description: `${mockResults.length} options available`
      });
    }, 1500);
  };

  // Browse/Search Materials Hub (general search)
  const handleSearchHub = () => {
    if (!hubSearchQuery.trim()) {
      toast.error('Please enter a search term');
      return;
    }

    setIsSearchingHub(true);
    toast.info('Searching Materials Hub...', {
      description: `Looking for "${hubSearchQuery}"`
    });

    setTimeout(() => {
      const mockResults: MaterialComparison[] = [
        {
          id: 'search-1',
          name: `${hubSearchQuery} - Premium Grade`,
          supplier: 'Home Depot',
          price: 45,
          quality: 'Premium',
          inStock: true,
          leadTime: '1-2 days'
        },
        {
          id: 'search-2',
          name: `${hubSearchQuery} - Standard`,
          supplier: "Lowe's",
          price: 32,
          quality: 'Standard',
          inStock: true,
          leadTime: '2-3 days'
        },
        {
          id: 'search-3',
          name: `${hubSearchQuery} - Professional`,
          supplier: 'Ferguson',
          price: 58,
          quality: 'Professional',
          inStock: true,
          leadTime: '3-5 days'
        },
        {
          id: 'search-4',
          name: `${hubSearchQuery} - Economy`,
          supplier: 'Menards',
          price: 28,
          quality: 'Budget',
          inStock: false,
          leadTime: '5-7 days'
        }
      ];

      setHubSearchResults(mockResults);
      setIsSearchingHub(false);

      toast.success('Search Complete!', {
        description: `Found ${mockResults.length} materials`
      });
    }, 1500);
  };

  // Suggest material swap to contractor
  const handleSuggestSwap = (alternativeId: string) => {
    if (selectedMaterialId) {
      onMaterialSuggestion(selectedMaterialId, alternativeId);
      setSuggestedSwaps([...suggestedSwaps, selectedMaterialId]);
      
      const alternative = comparisonResults.find(alt => alt.id === alternativeId);
      toast.success('Suggestion Sent!', {
        description: `Contractor will review your ${alternative?.supplier} suggestion`
      });
      
      setShowMaterialComparison(false);
      setSelectedMaterialId(null);
    }
  };

  // Request to add searched material
  const handleRequestMaterial = (materialId: string) => {
    const material = hubSearchResults.find(m => m.id === materialId);
    toast.success('Material Request Sent!', {
      description: `Contractor will review adding ${material?.name}`
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#ea580c]/10 to-orange-600/10 border border-[#ea580c]/30 rounded-xl p-6">
        <h2 className="text-2xl font-bold text-white mb-2">Your Project Quote</h2>
        <p className="text-gray-300 mb-4">
          Review the materials and labor for your project. You can compare alternatives and suggest changes.
        </p>
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2 text-blue-400">
            <ExternalLink className="w-4 h-4" />
            <span>Click "Compare" to see alternative materials</span>
          </div>
          <div className="flex items-center gap-2 text-purple-400">
            <Search className="w-4 h-4" />
            <span>Search Materials Hub for additional items</span>
          </div>
        </div>
      </div>

      {/* Materials Hub Search */}
      <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Search className="w-5 h-5 text-purple-400" />
              Browse Materials Hub
            </h3>
            <p className="text-sm text-gray-400 mt-1">Search for additional materials or alternatives</p>
          </div>
          <button
            onClick={() => setShowHubSearch(!showHubSearch)}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-white text-sm font-semibold transition"
          >
            {showHubSearch ? 'Hide Search' : 'Open Search'}
          </button>
        </div>

        {showHubSearch && (
          <div className="space-y-4">
            <div className="flex gap-3">
              <input
                type="text"
                value={hubSearchQuery}
                onChange={(e) => setHubSearchQuery(e.target.value)}
                placeholder="Search for materials (e.g., 'oak flooring', 'LED fixtures', 'plumbing pipes')"
                className="flex-1 px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                onKeyDown={(e) => e.key === 'Enter' && handleSearchHub()}
              />
              <button
                onClick={handleSearchHub}
                disabled={isSearchingHub}
                className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 rounded-lg text-white font-semibold transition disabled:opacity-50 flex items-center gap-2"
              >
                {isSearchingHub ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Searching...
                  </>
                ) : (
                  <>
                    <Search className="w-5 h-5" />
                    Search
                  </>
                )}
              </button>
            </div>

            {/* Search Results */}
            {hubSearchResults.length > 0 && (
              <div className="space-y-2 mt-4">
                <h4 className="text-sm font-bold text-gray-400 mb-2">Search Results</h4>
                {hubSearchResults.map((material) => (
                  <div
                    key={material.id}
                    className="p-4 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg hover:border-purple-500/30 transition"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="text-white font-semibold">{material.name}</h4>
                        <div className="flex items-center gap-4 mt-2 text-sm">
                          <span className="text-gray-400">
                            <span className="text-gray-500">Supplier:</span> {material.supplier}
                          </span>
                          <span className="text-gray-400">
                            <span className="text-gray-500">Quality:</span> {material.quality}
                          </span>
                          <span className={material.inStock ? 'text-green-400' : 'text-red-400'}>
                            {material.inStock ? '✓ In Stock' : '✗ Out of Stock'}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-bold text-white font-mono">${material.price}</p>
                        <button
                          onClick={() => handleRequestMaterial(material.id)}
                          className="mt-2 px-4 py-1.5 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 rounded-lg text-purple-400 text-xs font-semibold transition"
                        >
                          Request to Add
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Labor Items */}
      <div className="bg-[#0A0A0A] rounded-xl border border-[#2A2A2A] overflow-hidden">
        <div className="px-6 py-4 bg-blue-600/10 border-b border-blue-500/30">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Wrench className="w-5 h-5 text-blue-400" />
            Labor Items ({lineItems.filter(i => i.type === 'labor').length})
          </h3>
        </div>
        <div className="p-6">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#2A2A2A]">
                <th className="text-left py-3 text-sm font-semibold text-gray-400">Description</th>
                <th className="text-center py-3 text-sm font-semibold text-gray-400">Hours</th>
                <th className="text-right py-3 text-sm font-semibold text-gray-400">Rate/Hr</th>
                <th className="text-right py-3 text-sm font-semibold text-gray-400">Total</th>
              </tr>
            </thead>
            <tbody>
              {lineItems.filter(i => i.type === 'labor').map((item) => (
                <tr key={item.id} className="border-b border-[#2A2A2A]/50">
                  <td className="py-3 text-white">{item.description}</td>
                  <td className="py-3 text-center text-white font-mono">{item.quantity}</td>
                  <td className="py-3 text-right text-white font-mono">${item.unitPrice}</td>
                  <td className="py-3 text-right text-white font-mono font-semibold">${item.total.toLocaleString()}</td>
                </tr>
              ))}
              <tr className="bg-blue-600/5">
                <td colSpan={3} className="py-3 text-right font-bold text-blue-400">Labor Subtotal:</td>
                <td className="py-3 text-right font-bold text-blue-400 font-mono">${totals.laborTotal.toLocaleString()}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Material Items */}
      <div className="bg-[#0A0A0A] rounded-xl border border-[#2A2A2A] overflow-hidden">
        <div className="px-6 py-4 bg-green-600/10 border-b border-green-500/30">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Package className="w-5 h-5 text-green-400" />
            Material Items ({customerVisibleMaterials.length})
          </h3>
          <p className="text-sm text-gray-400 mt-1">Click "Compare" to see alternative options and pricing</p>
        </div>
        <div className="p-6">
          {customerVisibleMaterials.length === 0 ? (
            <div className="text-center py-8">
              <Package className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400">No materials available for customer selection</p>
              <p className="text-sm text-gray-500 mt-1">The contractor will handle material selection for this project</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#2A2A2A]">
                  <th className="text-left py-3 text-sm font-semibold text-gray-400">Description</th>
                  <th className="text-center py-3 text-sm font-semibold text-gray-400">Supplier</th>
                  <th className="text-center py-3 text-sm font-semibold text-gray-400">Qty</th>
                  <th className="text-center py-3 text-sm font-semibold text-gray-400">Unit</th>
                  <th className="text-right py-3 text-sm font-semibold text-gray-400">Unit Price</th>
                  <th className="text-right py-3 text-sm font-semibold text-gray-400">Total</th>
                  <th className="text-center py-3 text-sm font-semibold text-gray-400">Action</th>
                </tr>
              </thead>
              <tbody>
                {customerVisibleMaterials.map((item) => {
                  const hasSuggestion = suggestedSwaps.includes(item.id);
                
                return (
                  <tr 
                    key={item.id} 
                    className={`border-b border-[#2A2A2A]/50 transition ${
                      selectedMaterialId === item.id ? 'bg-purple-600/10' : 'hover:bg-[#1A1A1A]'
                    }`}
                  >
                    <td className="py-3 text-white">
                      <div className="flex items-center gap-2">
                        {item.description}
                        {item.optimized && (
                          <span className="px-2 py-0.5 bg-green-600/20 border border-green-500/30 rounded text-xs text-green-400">
                            Optimized
                          </span>
                        )}
                        {hasSuggestion && (
                          <span className="px-2 py-0.5 bg-yellow-600/20 border border-yellow-500/30 rounded text-xs text-yellow-400">
                            Suggestion Sent
                          </span>
                        )}
                      </div>
                      {item.quality && (
                        <div className="text-xs text-gray-400 mt-1">{item.quality}</div>
                      )}
                    </td>
                    <td className="py-3 text-center text-gray-300 text-sm">
                      {item.supplier || 'Standard'}
                    </td>
                    <td className="py-3 text-center text-white font-mono">{item.quantity}</td>
                    <td className="py-3 text-center text-white text-sm">{item.unit}</td>
                    <td className="py-3 text-right text-white font-mono">${item.unitPrice.toLocaleString()}</td>
                    <td className="py-3 text-right text-white font-mono font-semibold">${item.total.toLocaleString()}</td>
                    <td className="py-3 text-center">
                      <button
                        onClick={() => handleCompareMaterial(item.id)}
                        className="px-3 py-1.5 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 rounded-lg text-purple-400 text-xs font-semibold transition flex items-center gap-1 mx-auto"
                      >
                        <ExternalLink className="w-3 h-3" />
                        Compare
                      </button>
                    </td>
                  </tr>
                );
              })}
              <tr className="bg-green-600/5">
                <td colSpan={5} className="py-3 text-right font-bold text-green-400">Materials Subtotal:</td>
                <td className="py-3 text-right font-bold text-green-400 font-mono">
                  ${customerVisibleMaterials.reduce((sum, item) => sum + item.total, 0).toLocaleString()}
                </td>
                <td></td>
              </tr>
            </tbody>
          </table>
          )}
        </div>
      </div>

      {/* Totals */}
      <div className="bg-gradient-to-r from-[#ea580c]/10 to-orange-600/10 border border-[#ea580c]/30 rounded-xl p-6">
        <div className="space-y-3">
          <div className="flex items-center justify-between text-lg">
            <span className="text-gray-300">Subtotal:</span>
            <span className="text-white font-mono font-semibold">${totals.subtotal.toLocaleString()}</span>
          </div>
          <div className="flex items-center justify-between text-lg">
            <span className="text-gray-300">Tax (8.75%):</span>
            <span className="text-white font-mono font-semibold">${totals.tax.toLocaleString()}</span>
          </div>
          <div className="border-t border-orange-500/30 pt-3 flex items-center justify-between text-2xl">
            <span className="text-white font-bold">Total:</span>
            <span className="text-[#ea580c] font-mono font-bold">${totals.total.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Material Comparison Modal */}
      {showMaterialComparison && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="px-6 py-4 bg-gradient-to-r from-purple-600/20 to-pink-600/20 border-b border-purple-500/30 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-white">Compare Materials - Materials Hub</h2>
                <p className="text-gray-400 text-sm mt-1">
                  {lineItems.find(i => i.id === selectedMaterialId)?.description}
                </p>
              </div>
              <button
                onClick={() => {
                  setShowMaterialComparison(false);
                  setSelectedMaterialId(null);
                }}
                className="p-2 hover:bg-[#2A2A2A] rounded-lg transition"
              >
                <X className="w-6 h-6 text-gray-400" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {isSearchingHub ? (
                <div className="flex items-center justify-center py-20">
                  <div className="text-center">
                    <div className="w-16 h-16 border-4 border-purple-600/30 border-t-purple-600 rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-white font-semibold">Searching Materials Hub...</p>
                    <p className="text-gray-400 text-sm mt-2">Finding best prices and alternatives</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {comparisonResults.map((alt, index) => {
                    const currentItem = lineItems.find(i => i.id === selectedMaterialId);
                    const savings = currentItem ? currentItem.unitPrice - alt.price : 0;
                    const savingsPercent = currentItem ? ((savings / currentItem.unitPrice) * 100).toFixed(1) : 0;
                    const isCurrent = index === 0;

                    return (
                      <div
                        key={alt.id}
                        className={`p-5 rounded-xl border-2 transition ${
                          isCurrent
                            ? 'bg-blue-600/5 border-blue-500/30'
                            : 'bg-[#0A0A0A] border-[#2A2A2A] hover:border-purple-500/30'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="text-lg font-bold text-white">{alt.name}</h3>
                              {isCurrent && (
                                <span className="px-2 py-0.5 bg-blue-600/20 border border-blue-500/30 rounded text-xs text-blue-400 font-semibold">
                                  CURRENT QUOTE
                                </span>
                              )}
                              {!isCurrent && savings > 0 && (
                                <span className="px-2 py-0.5 bg-green-600/20 border border-green-500/30 rounded text-xs text-green-400 font-semibold flex items-center gap-1">
                                  <TrendingDown className="w-3 h-3" />
                                  SAVE {savingsPercent}%
                                </span>
                              )}
                              {!isCurrent && savings < 0 && (
                                <span className="px-2 py-0.5 bg-purple-600/20 border border-purple-500/30 rounded text-xs text-purple-400 font-semibold flex items-center gap-1">
                                  <Star className="w-3 h-3" />
                                  HIGHER QUALITY
                                </span>
                              )}
                              {!alt.inStock && (
                                <span className="px-2 py-0.5 bg-red-600/20 border border-red-500/30 rounded text-xs text-red-400 font-semibold">
                                  OUT OF STOCK
                                </span>
                              )}
                            </div>
                            
                            <div className="grid grid-cols-3 gap-4 mt-3">
                              <div>
                                <p className="text-xs text-gray-400 mb-1">Supplier</p>
                                <p className="text-sm text-white font-semibold">{alt.supplier}</p>
                              </div>
                              <div>
                                <p className="text-xs text-gray-400 mb-1">Quality</p>
                                <p className="text-sm text-white font-semibold">{alt.quality}</p>
                              </div>
                              <div>
                                <p className="text-xs text-gray-400 mb-1 flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  Lead Time
                                </p>
                                <p className="text-sm text-white font-semibold">{alt.leadTime}</p>
                              </div>
                            </div>
                          </div>

                          <div className="text-right">
                            <p className="text-2xl font-bold text-white font-mono mb-1">
                              ${alt.price.toLocaleString()}
                            </p>
                            <p className="text-xs text-gray-400 mb-3">per {currentItem?.unit}</p>
                            
                            {!isCurrent && alt.inStock && (
                              <button
                                onClick={() => handleSuggestSwap(alt.id)}
                                className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 rounded-lg text-white font-semibold text-sm transition shadow-lg"
                              >
                                Suggest This
                              </button>
                            )}
                            {isCurrent && (
                              <button
                                disabled
                                className="px-4 py-2 bg-[#2A2A2A] rounded-lg text-gray-500 font-semibold text-sm cursor-not-allowed"
                              >
                                Current Quote
                              </button>
                            )}
                          </div>
                        </div>

                        {!isCurrent && currentItem && (
                          <div className="mt-4 pt-4 border-t border-[#2A2A2A]">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-gray-400">Impact for {currentItem.quantity} {currentItem.unit}:</span>
                              <span className={`font-bold ${savings > 0 ? 'text-green-400' : 'text-purple-400'}`}>
                                {savings > 0 ? '-' : '+'}${Math.abs(savings * currentItem.quantity).toLocaleString()}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-[#0A0A0A] border-t border-[#2A2A2A]">
              <div className="flex items-start gap-3 mb-4">
                <div className="p-2 bg-blue-600/20 rounded">
                  <ExternalLink className="w-4 h-4 text-blue-400" />
                </div>
                <div className="flex-1 text-sm">
                  <p className="text-gray-300 mb-1">
                    Click <strong className="text-white">"Suggest This"</strong> to send your preference to the contractor. 
                    They'll review and can update the quote if approved.
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowMaterialComparison(false);
                  setSelectedMaterialId(null);
                }}
                className="w-full px-6 py-2.5 bg-[#2A2A2A] hover:bg-[#3A3A3A] rounded-lg text-white font-semibold transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
