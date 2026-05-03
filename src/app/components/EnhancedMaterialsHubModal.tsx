import { useState, useEffect } from 'react';
import {
  X,
  Package,
  Plus,
  Check,
  Search,
  Filter,
  ExternalLink,
  ShoppingCart,
  Loader2,
  Home,
  Hammer,
  Wrench
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { materialsStoreAPI, type StoreMaterial } from '../lib/services/materialsStoreAPI';
import { materialsHubService } from '../lib/services/materialsHubService';

interface EnhancedMaterialsHubModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddMaterial: (material: any) => void;
  editMode: boolean;
  initialSearchQuery?: string;
}

export function EnhancedMaterialsHubModal({
  isOpen,
  onClose,
  onAddMaterial,
  editMode,
  initialSearchQuery = ''
}: EnhancedMaterialsHubModalProps) {
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery);
  const [materials, setMaterials] = useState<StoreMaterial[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedMaterials, setSelectedMaterials] = useState<Set<string>>(new Set());
  const [priceSort, setPriceSort] = useState<'asc' | 'desc' | 'none'>('none');
  const [inStockOnly, setInStockOnly] = useState(false);
  
  // Store filters
  const [enabledStores, setEnabledStores] = useState({
    local: true,
    home_depot: true,
    lowes: true,
    grainger: true
  });

  // Store results count
  const [storeResults, setStoreResults] = useState({
    local: 0,
    home_depot: 0,
    lowes: 0,
    grainger: 0,
    total: 0
  });

  // Search materials across enabled stores
  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      const localMaterials = materialsHubService.getAllMaterials().map(m => ({
        ...m,
        source: 'local' as const
      }));
      setMaterials(localMaterials);
      setStoreResults({
        local: localMaterials.length,
        home_depot: 0,
        lowes: 0,
        grainger: 0,
        total: localMaterials.length
      });
      return;
    }

    setIsSearching(true);
    console.log(`🔍 Searching for: "${searchQuery}"`);

    try {
      const results: StoreMaterial[] = [];
      let localCount = 0, hdCount = 0, lowesCount = 0, graingerCount = 0;

      // Search local database
      if (enabledStores.local) {
        const localMaterials = materialsHubService.getAllMaterials();
        const localFiltered = localMaterials
          .filter(m => 
            m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            m.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
            m.category.toLowerCase().includes(searchQuery.toLowerCase())
          )
          .map(m => ({ ...m, source: 'local' as const }));
        results.push(...localFiltered);
        localCount = localFiltered.length;
        console.log(`📦 Local: ${localCount} results`);
      }

      // Search external stores (only if their toggle is enabled)
      const storeQueries: string[] = [];
      if (enabledStores.home_depot) storeQueries.push('home_depot');
      if (enabledStores.lowes) storeQueries.push('lowes');
      if (enabledStores.grainger) storeQueries.push('grainger');

      if (storeQueries.length > 0) {
        const storeResult = await materialsStoreAPI.searchAllStores(searchQuery, storeQueries);
        
        if (storeResult.success && storeResult.products) {
          results.push(...storeResult.products);
          hdCount = storeResult.byStore?.home_depot || 0;
          lowesCount = storeResult.byStore?.lowes || 0;
          graingerCount = storeResult.byStore?.grainger || 0;
          
          console.log(`🏠 Home Depot: ${hdCount} results`);
          console.log(`🔵 Lowe's: ${lowesCount} results`);
          console.log(`⚙️ Grainger: ${graingerCount} results`);
        }
        // Note: Errors are handled gracefully with fallback data in the API service
      }

      setMaterials(results);
      setStoreResults({
        local: localCount,
        home_depot: hdCount,
        lowes: lowesCount,
        grainger: graingerCount,
        total: results.length
      });

      console.log(`✅ Total results: ${results.length}`);
      
      if (results.length === 0) {
        toast.info('No materials found. Try a different search term.');
      }

    } catch (error) {
      console.error('Search error:', error);
      toast.error('Failed to search materials');
    } finally {
      setIsSearching(false);
    }
  };

  // Load initial materials on open
  useEffect(() => {
    if (isOpen) {
      if (initialSearchQuery) {
        setSearchQuery(initialSearchQuery);
        // Trigger search after setting the query
        setTimeout(handleSearch, 100);
      } else {
        // Load ALL materials on initial open (local + all stores)
        loadInitialMaterials();
      }
    }
  }, [isOpen]);

  // Load all materials from all sources on initial open
  const loadInitialMaterials = async () => {
    setIsSearching(true);
    try {
      const results: StoreMaterial[] = [];
      
      // Get local materials
      const localMaterials = materialsHubService.getAllMaterials().map(m => ({
        ...m,
        source: 'local' as const
      }));
      results.push(...localMaterials);
      
      // Get all store materials (empty search returns all demo materials)
      const storeResult = await materialsStoreAPI.searchAllStores('', ['home_depot', 'lowes', 'grainger']);
      if (storeResult.success && storeResult.products) {
        results.push(...storeResult.products);
      }
      
      setMaterials(results);
      setStoreResults({
        local: localMaterials.length,
        home_depot: storeResult.byStore?.home_depot || 0,
        lowes: storeResult.byStore?.lowes || 0,
        grainger: storeResult.byStore?.grainger || 0,
        total: results.length
      });
      
      console.log(`✅ Loaded ${results.length} initial materials from all sources`);
    } catch (error) {
      console.error('Error loading initial materials:', error);
    } finally {
      setIsSearching(false);
    }
  };

  // Apply filters and sorting
  const filteredMaterials = materials
    .filter(m => {
      // Filter by enabled stores
      if (m.source === 'local' && !enabledStores.local) return false;
      if (m.source === 'home_depot' && !enabledStores.home_depot) return false;
      if (m.source === 'lowes' && !enabledStores.lowes) return false;
      if (m.source === 'grainger' && !enabledStores.grainger) return false;
      
      // Filter by in-stock
      if (inStockOnly && !m.inStock) return false;
      
      return true;
    })
    .sort((a, b) => {
      if (priceSort === 'asc') return a.basePrice - b.basePrice;
      if (priceSort === 'desc') return b.basePrice - a.basePrice;
      return 0;
    });

  // Toggle store filter
  const toggleStore = (store: keyof typeof enabledStores) => {
    setEnabledStores(prev => ({ ...prev, [store]: !prev[store] }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[60] p-4">
      <div className="bg-gradient-to-br from-[#1a1a1a] to-[#0d0d0d] border border-gray-800 rounded-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-800">
          <div>
            <h3 className="text-2xl font-bold text-white flex items-center gap-2">
              <ShoppingCart className="w-6 h-6 text-[#ea580c]" />
              Materials Hub
            </h3>
            <p className="text-sm text-gray-400 mt-1">
              Search across Home Depot, Lowe's, Grainger, and local database
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-[#2A2A2A] rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-6 bg-[#0A0A0A] border-b border-gray-800">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="w-full pl-11 pr-4 py-3 bg-[#1a1a1a] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-[#ea580c] focus:ring-1 focus:ring-[#ea580c] transition-all"
                placeholder="Search materials (e.g., plywood, drywall, 2x4, sandpaper)..."
              />
            </div>
            <button
              onClick={handleSearch}
              disabled={isSearching}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#ea580c] to-[#fb923c] hover:from-[#c2410c] hover:to-[#ea580c] text-white rounded-lg transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSearching ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
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

          {/* Store Filters */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <Filter className="w-4 h-4" />
              <span>Sources:</span>
            </div>
            
            <button
              onClick={() => toggleStore('local')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all text-sm font-semibold ${
                enabledStores.local
                  ? 'bg-[#ea580c]/20 border border-[#ea580c]/50 text-[#ea580c]'
                  : 'bg-[#2A2A2A] border border-gray-700 text-gray-500'
              }`}
            >
              <Package className="w-4 h-4" />
              Local ({storeResults.local})
            </button>

            <button
              onClick={() => toggleStore('home_depot')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all text-sm font-semibold ${
                enabledStores.home_depot
                  ? 'bg-orange-500/20 border border-orange-500/50 text-orange-500'
                  : 'bg-[#2A2A2A] border border-gray-700 text-gray-500'
              }`}
            >
              <Home className="w-4 h-4" />
              Home Depot ({storeResults.home_depot})
            </button>

            <button
              onClick={() => toggleStore('lowes')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all text-sm font-semibold ${
                enabledStores.lowes
                  ? 'bg-blue-500/20 border border-blue-500/50 text-blue-500'
                  : 'bg-[#2A2A2A] border border-gray-700 text-gray-500'
              }`}
            >
              <Hammer className="w-4 h-4" />
              Lowe's ({storeResults.lowes})
            </button>

            <button
              onClick={() => toggleStore('grainger')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all text-sm font-semibold ${
                enabledStores.grainger
                  ? 'bg-red-500/20 border border-red-500/50 text-red-500'
                  : 'bg-[#2A2A2A] border border-gray-700 text-gray-500'
              }`}
            >
              <Wrench className="w-4 h-4" />
              Grainger ({storeResults.grainger})
            </button>

            <div className="ml-auto flex items-center gap-3">
              <label className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={inStockOnly}
                  onChange={(e) => setInStockOnly(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-700 bg-[#1a1a1a] text-[#ea580c] focus:ring-[#ea580c]"
                />
                In Stock Only
              </label>

              <select
                value={priceSort}
                onChange={(e) => setPriceSort(e.target.value as any)}
                className="px-3 py-1.5 bg-[#1a1a1a] border border-gray-700 rounded text-sm text-white"
              >
                <option value="none">Sort by Price</option>
                <option value="asc">Price: Low to High</option>
                <option value="desc">Price: High to Low</option>
              </select>
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto p-6">
          {isSearching ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-12 h-12 text-[#ea580c] animate-spin mb-4" />
              <p className="text-gray-400">Searching across all stores...</p>
            </div>
          ) : filteredMaterials.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Package className="w-16 h-16 text-gray-600 mb-4" />
              <p className="text-gray-400 text-lg mb-2">No materials found</p>
              <p className="text-gray-500 text-sm">Try adjusting your search or filters</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredMaterials.map((material) => {
                const storeInfo = materialsStoreAPI.getStoreInfo(material.source);
                return (
                  <div
                    key={material.id}
                    className={`bg-[#0A0A0A] border rounded-lg p-4 hover:border-[#ea580c] transition-all ${
                      selectedMaterials.has(material.id) ? 'border-green-500/50 bg-green-500/5' : 'border-gray-800'
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      {/* Image */}
                      {material.imageUrl && (
                        <img
                          src={material.imageUrl}
                          alt={material.name}
                          className="w-20 h-20 object-cover rounded-lg border border-gray-700"
                        />
                      )}

                      {/* Content */}
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h4 className="font-semibold text-white text-lg">{material.name}</h4>
                            <div className="flex items-center gap-2 mt-1">
                              <span className={`text-xs px-2 py-0.5 rounded-full ${storeInfo.bgColor} ${storeInfo.textColor} ${storeInfo.borderColor} border font-semibold`}>
                                {storeInfo.icon} {storeInfo.name}
                              </span>
                              <span className="text-xs text-gray-500">{material.category}</span>
                              {material.manufacturer && (
                                <span className="text-xs text-gray-500">• {material.manufacturer}</span>
                              )}
                            </div>
                          </div>

                          <div className="text-right">
                            <div className="text-2xl font-bold text-green-400">
                              ${material.basePrice.toFixed(2)}
                            </div>
                            <div className="text-xs text-gray-500">per {material.unit}</div>
                          </div>
                        </div>

                        <p className="text-sm text-gray-400 mb-3">{material.description}</p>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4 text-sm">
                            <span className={`font-semibold ${material.inStock ? 'text-green-400' : 'text-red-400'}`}>
                              {material.inStock ? '✓ In Stock' : '✗ Out of Stock'}
                            </span>
                            <span className="text-yellow-400">
                              ★ {material.qualityRating}/5
                            </span>
                            {material.sku && (
                              <span className="text-gray-500">SKU: {material.sku}</span>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            {material.storeUrl && (
                              <a
                                href={material.storeUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 px-3 py-1.5 bg-[#2A2A2A] hover:bg-[#3A3A3A] text-gray-300 rounded-lg transition-colors text-sm"
                              >
                                <ExternalLink className="w-3 h-3" />
                                View Online
                              </a>
                            )}

                            {editMode && (
                              <button
                                onClick={() => {
                                  onAddMaterial({
                                    id: `m-${Date.now()}`,
                                    name: material.name,
                                    description: material.description,
                                    quantity: 1,
                                    unit: material.unit,
                                    unitCost: material.basePrice,
                                    totalCost: material.basePrice,
                                    supplier: `${storeInfo.name} - ${material.manufacturer}`,
                                    category: material.category,
                                    manufacturer: material.manufacturer,
                                    basePrice: material.basePrice,
                                    inStock: material.inStock,
                                    qualityRating: material.qualityRating
                                  });
                                  setSelectedMaterials(prev => new Set(prev).add(material.id));
                                  toast.success(`Added ${material.name} to quote`);
                                }}
                                disabled={selectedMaterials.has(material.id) || !material.inStock}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all font-semibold ${
                                  selectedMaterials.has(material.id)
                                    ? 'bg-green-600/20 border border-green-500/50 text-green-400 cursor-not-allowed'
                                    : !material.inStock
                                    ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                                    : 'bg-gradient-to-r from-[#ea580c] to-[#fb923c] hover:from-[#c2410c] hover:to-[#ea580c] text-white shadow-lg shadow-[#ea580c]/20'
                                }`}
                              >
                                {selectedMaterials.has(material.id) ? (
                                  <>
                                    <Check className="w-4 h-4" />
                                    Added
                                  </>
                                ) : (
                                  <>
                                    <Plus className="w-4 h-4" />
                                    Add to Quote
                                  </>
                                )}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-800 p-4 bg-[#0A0A0A]">
          <div className="flex items-center justify-between text-sm">
            <div className="text-gray-400">
              Showing <span className="font-semibold text-white">{filteredMaterials.length}</span> of{' '}
              <span className="font-semibold text-white">{storeResults.total}</span> materials
            </div>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-[#2A2A2A] hover:bg-[#3A3A3A] text-white rounded-lg transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}