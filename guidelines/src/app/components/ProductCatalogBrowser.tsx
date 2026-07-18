/**
 * Product Catalog Browser - Import dropshipper products to live catalog
 * Secure staging area with search, filter, and selection capabilities
 */

import { toast } from 'sonner@2.0.3';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { API_BASE_URL } from '../lib/apiConfig';

const API_URL = API_BASE_URL;

interface StagedProduct {
  stagingId: string;
  providerId: string;
  providerName: string;
  name: string;
  description: string;
  price: number;
  compareAtPrice?: number;
  costPrice?: number;
  images: string[];
  primaryImage: string;
  category: string;
  tags: string[];
  sku: string;
  stock: number;
  brand?: string;
  importedToLive: boolean;
  importedAt?: string;
  stagedAt: string;
}

export default function ProductCatalogBrowser() {
  const [products, setProducts] = useState<StagedProduct[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<StagedProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'imported' | 'not-imported'>('all');
  const [providerFilter, setProviderFilter] = useState<string>('all');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 24;

  // Stats & categories
  const [stats, setStats] = useState<any>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [providers, setProviders] = useState<string[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [products, searchQuery, categoryFilter, statusFilter, providerFilter]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [productsRes, statsRes, categoriesRes] = await Promise.all([
        fetch(`${API_URL}/dropshipper/catalog/staged`, {
          headers: { 'Authorization': `Bearer ${publicAnonKey}` }
        }),
        fetch(`${API_URL}/dropshipper/catalog/stats`, {
          headers: { 'Authorization': `Bearer ${publicAnonKey}` }
        }),
        fetch(`${API_URL}/dropshipper/catalog/categories`, {
          headers: { 'Authorization': `Bearer ${publicAnonKey}` }
        })
      ]);

      const [productsData, statsData, categoriesData] = await Promise.all([
        productsRes.json(),
        statsRes.json(),
        categoriesRes.json()
      ]);

      if (productsData.success) {
        setProducts(productsData.products);
        
        // Extract unique providers
        const uniqueProviders = Array.from(new Set(productsData.products.map((p: StagedProduct) => p.providerName)));
        setProviders(uniqueProviders as string[]);
      }

      if (statsData.success) {
        setStats(statsData.stats);
      }

      if (categoriesData.success) {
        setCategories(categoriesData.categories);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
      toast.error('Failed to load catalog');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...products];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(p =>
        p.name.toLowerCase().includes(query) ||
        p.description.toLowerCase().includes(query) ||
        p.sku.toLowerCase().includes(query) ||
        p.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }

    // Category filter
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(p => p.category === categoryFilter);
    }

    // Status filter
    if (statusFilter === 'imported') {
      filtered = filtered.filter(p => p.importedToLive);
    } else if (statusFilter === 'not-imported') {
      filtered = filtered.filter(p => !p.importedToLive);
    }

    // Provider filter
    if (providerFilter !== 'all') {
      filtered = filtered.filter(p => p.providerName === providerFilter);
    }

    setFilteredProducts(filtered);
    setCurrentPage(1); // Reset to first page
  };

  const toggleProductSelection = (stagingId: string) => {
    const newSelected = new Set(selectedProducts);
    if (newSelected.has(stagingId)) {
      newSelected.delete(stagingId);
    } else {
      newSelected.add(stagingId);
    }
    setSelectedProducts(newSelected);
  };

  const selectAll = () => {
    const notImported = filteredProducts.filter(p => !p.importedToLive);
    setSelectedProducts(new Set(notImported.map(p => p.stagingId)));
  };

  const deselectAll = () => {
    setSelectedProducts(new Set());
  };

  const importSelected = async () => {
    if (selectedProducts.size === 0) {
      toast.error('No products selected');
      return;
    }

    setImporting(true);
    try {
      const response = await fetch(`${API_URL}/dropshipper/catalog/import-to-live`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          stagingIds: Array.from(selectedProducts)
        })
      });

      const data = await response.json();
      
      if (data.success) {
        toast.success(`Successfully imported ${data.imported.length} products!`);
        setSelectedProducts(new Set());
        await loadData();
      } else {
        toast.error(`Import completed with ${data.failed.length} failures`);
        if (data.errors.length > 0) {
          console.error('Import errors:', data.errors);
        }
      }
    } catch (error) {
      toast.error('Failed to import products');
      console.error(error);
    } finally {
      setImporting(false);
    }
  };

  const clearStaging = async () => {
    if (!confirm('Are you sure you want to clear all staged products? This cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`${API_URL}/dropshipper/catalog/clear`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${publicAnonKey}` }
      });

      const data = await response.json();
      if (data.success) {
        toast.success(`Cleared ${data.cleared} products from staging`);
        await loadData();
      }
    } catch (error) {
      toast.error('Failed to clear staging area');
    }
  };

  // Pagination
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedProducts = filteredProducts.slice(startIndex, startIndex + itemsPerPage);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="text-center">
          <Loader className="w-12 h-12 text-[#ea580c] animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading catalog...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] p-6">
      {/* Header */}
      <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Product Catalog Browser</h1>
            <p className="text-gray-400">Import dropshipper products to your live catalog</p>
          </div>

          <button
            onClick={() => loadData()}
            className="px-4 py-2 bg-[#2A2A2A] hover:bg-[#3A3A3A] text-white rounded-lg transition-all flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg p-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-400 text-sm">Total Staged</span>
                <Package className="w-5 h-5 text-[#ea580c]" />
              </div>
              <p className="text-2xl font-bold text-white mt-2">{stats.total}</p>
            </div>

            <div className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg p-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-400 text-sm">Imported</span>
                <CheckCircle className="w-5 h-5 text-green-500" />
              </div>
              <p className="text-2xl font-bold text-white mt-2">{stats.imported}</p>
            </div>

            <div className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg p-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-400 text-sm">Not Imported</span>
                <XCircle className="w-5 h-5 text-yellow-500" />
              </div>
              <p className="text-2xl font-bold text-white mt-2">{stats.notImported}</p>
            </div>

            <div className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg p-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-400 text-sm">Categories</span>
                <Tag className="w-5 h-5 text-purple-500" />
              </div>
              <p className="text-2xl font-bold text-white mt-2">{stats.categories}</p>
            </div>
          </div>
        )}
      </div>

      {/* Filters & Actions */}
      <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search products..."
              className="w-full pl-10 pr-4 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#ea580c]"
            />
          </div>

          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-4 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white focus:outline-none focus:border-[#ea580c]"
          >
            <option value="all">All Categories</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-4 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white focus:outline-none focus:border-[#ea580c]"
          >
            <option value="all">All Products</option>
            <option value="not-imported">Not Imported</option>
            <option value="imported">Already Imported</option>
          </select>

          {/* Provider Filter */}
          <select
            value={providerFilter}
            onChange={(e) => setProviderFilter(e.target.value)}
            className="px-4 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white focus:outline-none focus:border-[#ea580c]"
          >
            <option value="all">All Providers</option>
            {providers.map(provider => (
              <option key={provider} value={provider}>{provider}</option>
            ))}
          </select>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={selectAll}
              className="px-4 py-2 bg-[#2A2A2A] hover:bg-[#3A3A3A] text-white rounded-lg transition-all text-sm"
            >
              Select All (Not Imported)
            </button>
            <button
              onClick={deselectAll}
              className="px-4 py-2 bg-[#2A2A2A] hover:bg-[#3A3A3A] text-white rounded-lg transition-all text-sm"
            >
              Deselect All
            </button>
            <span className="text-sm text-gray-400">
              {selectedProducts.size} selected
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex gap-1 border border-[#2A2A2A] rounded-lg p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded ${viewMode === 'grid' ? 'bg-[#ea580c] text-white' : 'text-gray-400 hover:text-white'}`}
              >
                <Grid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded ${viewMode === 'list' ? 'bg-[#ea580c] text-white' : 'text-gray-400 hover:text-white'}`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>

            <button
              onClick={importSelected}
              disabled={selectedProducts.size === 0 || importing}
              className="px-6 py-2 bg-gradient-to-r from-[#ea580c] to-[#dc2626] text-white rounded-lg hover:opacity-90 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {importing ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  Import Selected ({selectedProducts.size})
                </>
              )}
            </button>

            <button
              onClick={clearStaging}
              className="px-4 py-2 bg-red-500/20 text-red-500 hover:bg-red-500/30 rounded-lg transition-all flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Clear All
            </button>
          </div>
        </div>
      </div>

      {/* Products Grid/List */}
      {filteredProducts.length === 0 ? (
        <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-12 text-center">
          <Package className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">No Products Found</h3>
          <p className="text-gray-400">
            {products.length === 0 
              ? 'No products in staging area. Import a catalog from a provider first.'
              : 'No products match your filters. Try adjusting your search criteria.'}
          </p>
        </div>
      ) : (
        <>
          {viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-6">
              {paginatedProducts.map(product => (
                <ProductCard
                  key={product.stagingId}
                  product={product}
                  isSelected={selectedProducts.has(product.stagingId)}
                  onToggleSelect={toggleProductSelection}
                />
              ))}
            </div>
          ) : (
            <div className="space-y-3 mb-6">
              {paginatedProducts.map(product => (
                <ProductRow
                  key={product.stagingId}
                  product={product}
                  isSelected={selectedProducts.has(product.stagingId)}
                  onToggleSelect={toggleProductSelection}
                />
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 bg-[#1A1A1A] border border-[#2A2A2A] text-white rounded-lg hover:bg-[#2A2A2A] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <span className="text-gray-400">
                Page {currentPage} of {totalPages}
              </span>

              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-4 py-2 bg-[#1A1A1A] border border-[#2A2A2A] text-white rounded-lg hover:bg-[#2A2A2A] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// Product Card Component (Grid View)
function ProductCard({ product, isSelected, onToggleSelect }: {
  product: StagedProduct;
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
}) {
  return (
    <div
      className={`bg-[#1A1A1A] border rounded-xl overflow-hidden transition-all hover:shadow-lg hover:shadow-[#ea580c]/10 cursor-pointer ${
        isSelected ? 'border-[#ea580c] ring-2 ring-[#ea580c]/20' : 'border-[#2A2A2A]'
      } ${product.importedToLive ? 'opacity-60' : ''}`}
      onClick={() => !product.importedToLive && onToggleSelect(product.stagingId)}
    >
      {/* Image */}
      <div className="relative aspect-square bg-[#0A0A0A]">
        {product.primaryImage ? (
          <img
            src={product.primaryImage}
            alt={product.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Image className="w-16 h-16 text-gray-600" />
          </div>
        )}

        {/* Status Badge */}
        {product.importedToLive && (
          <div className="absolute top-2 right-2 px-2 py-1 bg-green-500 text-white text-xs font-semibold rounded flex items-center gap-1">
            <CheckCircle className="w-3 h-3" />
            Imported
          </div>
        )}

        {/* Selection Checkbox */}
        {!product.importedToLive && (
          <div className="absolute top-2 left-2">
            <div className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-all ${
              isSelected ? 'bg-[#ea580c] border-[#ea580c]' : 'bg-[#1A1A1A] border-gray-500'
            }`}>
              {isSelected && <Check className="w-4 h-4 text-white" />}
            </div>
          </div>
        )}

        {/* Stock Badge */}
        <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/60 backdrop-blur-sm text-white text-xs rounded">
          Stock: {product.stock}
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="text-white font-semibold mb-1 line-clamp-2">{product.name}</h3>
        <p className="text-sm text-gray-400 mb-2 line-clamp-1">{product.category}</p>

        <div className="flex items-center justify-between mb-2">
          <div>
            <span className="text-xl font-bold text-[#ea580c]">${product.price.toFixed(2)}</span>
            {product.compareAtPrice && product.compareAtPrice > product.price && (
              <span className="text-sm text-gray-500 line-through ml-2">
                ${product.compareAtPrice.toFixed(2)}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>SKU: {product.sku}</span>
          <span>{product.providerName}</span>
        </div>
      </div>
    </div>
  );
}

// Product Row Component (List View)
function ProductRow({ product, isSelected, onToggleSelect }: {
  product: StagedProduct;
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
}) {
  return (
    <div
      className={`bg-[#1A1A1A] border rounded-xl p-4 transition-all hover:shadow-lg hover:shadow-[#ea580c]/10 cursor-pointer ${
        isSelected ? 'border-[#ea580c] ring-2 ring-[#ea580c]/20' : 'border-[#2A2A2A]'
      } ${product.importedToLive ? 'opacity-60' : ''}`}
      onClick={() => !product.importedToLive && onToggleSelect(product.stagingId)}
    >
      <div className="flex items-center gap-4">
        {/* Checkbox */}
        {!product.importedToLive && (
          <div className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-all flex-shrink-0 ${
            isSelected ? 'bg-[#ea580c] border-[#ea580c]' : 'bg-[#0A0A0A] border-gray-500'
          }`}>
            {isSelected && <Check className="w-4 h-4 text-white" />}
          </div>
        )}

        {/* Image */}
        <div className="w-20 h-20 bg-[#0A0A0A] rounded-lg overflow-hidden flex-shrink-0">
          {product.primaryImage ? (
            <img src={product.primaryImage} alt={product.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Image className="w-8 h-8 text-gray-600" />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1 min-w-0">
              <h3 className="text-white font-semibold truncate">{product.name}</h3>
              <p className="text-sm text-gray-400">{product.category} • {product.providerName}</p>
            </div>

            {product.importedToLive && (
              <div className="ml-4 px-3 py-1 bg-green-500/20 text-green-500 text-xs font-semibold rounded-full flex items-center gap-1 flex-shrink-0">
                <CheckCircle className="w-3 h-3" />
                Imported
              </div>
            )}
          </div>

          <div className="flex items-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-gray-500" />
              <span className="text-white font-semibold">${product.price.toFixed(2)}</span>
              {product.costPrice && (
                <span className="text-gray-500">Cost: ${product.costPrice.toFixed(2)}</span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Box className="w-4 h-4 text-gray-500" />
              <span className="text-gray-400">Stock: {product.stock}</span>
            </div>

            <div className="flex items-center gap-2">
              <Tag className="w-4 h-4 text-gray-500" />
              <span className="text-gray-400">SKU: {product.sku}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}