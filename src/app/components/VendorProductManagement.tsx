// Vendor Product Management Component
// Phase 2: Vendor Product Management UI
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Plus,
  Search,
  Filter,
  Edit2,
  Trash2,
  Eye,
  EyeOff,
  Package,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  Image as ImageIcon,
  Save,
  X,
  Upload,
  Tag,
  Grid3x3,
  List,
  Star
} from 'lucide-react';
import { StandardButton } from './ui/StandardButton';
import ProductFormModal from './ProductFormModal';
import type { Product } from '../types/ecommerce';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface VendorProductManagementProps {
  vendorId: string;
  vendorName: string;
}

export default function VendorProductManagement({ vendorId, vendorName }: VendorProductManagementProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showProductForm, setShowProductForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    lowStock: 0,
    totalValue: 0
  });

  useEffect(() => {
    loadProducts();
  }, [vendorId]);

  useEffect(() => {
    calculateStats();
  }, [products]);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-57095a78/products?vendorId=${vendorId}`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const data = await response.json();
      if (data.success) {
        setProducts(data.products || []);
      }
    } catch (error) {
      console.error('Error loading products:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = () => {
    const total = products.length;
    const active = products.filter(p => p.isActive).length;
    const lowStock = products.filter(p => 
      p.trackInventory && p.inventoryQuantity < (p.lowStockThreshold || 10)
    ).length;
    const totalValue = products.reduce((sum, p) => 
      sum + (p.price * p.inventoryQuantity), 0
    );

    setStats({ total, active, lowStock, totalValue });
  };

  const handleDeleteProduct = async (productId: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return;

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-57095a78/products/${productId}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const data = await response.json();
      if (data.success) {
        setProducts(products.filter(p => p.id !== productId));
      }
    } catch (error) {
      console.error('Error deleting product:', error);
      alert('Failed to delete product');
    }
  };

  const handleToggleActive = async (product: Product) => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-57095a78/products/${product.id}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ isActive: !product.isActive }),
        }
      );

      const data = await response.json();
      if (data.success) {
        setProducts(products.map(p => 
          p.id === product.id ? data.product : p
        ));
      }
    } catch (error) {
      console.error('Error toggling product status:', error);
    }
  };

  const filteredProducts = products.filter(product => {
    const matchesSearch = searchQuery === '' || 
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.sku?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = filterCategory === 'all' || product.category === filterCategory;
    const matchesStatus = filterStatus === 'all' || 
      (filterStatus === 'active' && product.isActive) ||
      (filterStatus === 'inactive' && !product.isActive) ||
      (filterStatus === 'lowStock' && product.trackInventory && 
        product.inventoryQuantity < (product.lowStockThreshold || 10));

    return matchesSearch && matchesCategory && matchesStatus;
  });

  const categories = Array.from(new Set(products.map(p => p.category)));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#ea580c]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6">
          <div className="flex items-center justify-between mb-2">
            <Package className="w-8 h-8 text-[#ea580c]" />
          </div>
          <div className="text-3xl font-bold text-white">{stats.total}</div>
          <div className="text-sm text-gray-400">Total Products</div>
        </div>

        <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6">
          <div className="flex items-center justify-between mb-2">
            <Eye className="w-8 h-8 text-green-500" />
          </div>
          <div className="text-3xl font-bold text-white">{stats.active}</div>
          <div className="text-sm text-gray-400">Active Products</div>
        </div>

        <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6">
          <div className="flex items-center justify-between mb-2">
            <AlertTriangle className="w-8 h-8 text-yellow-500" />
          </div>
          <div className="text-3xl font-bold text-white">{stats.lowStock}</div>
          <div className="text-sm text-gray-400">Low Stock Items</div>
        </div>

        <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6">
          <div className="flex items-center justify-between mb-2">
            <DollarSign className="w-8 h-8 text-blue-500" />
          </div>
          <div className="text-3xl font-bold text-white">
            ${stats.totalValue.toLocaleString()}
          </div>
          <div className="text-sm text-gray-400">Inventory Value</div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-4">
        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
          <div className="flex-1 flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#ea580c]"
              />
            </div>

            {/* Category Filter */}
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="px-4 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white focus:outline-none focus:border-[#ea580c]"
            >
              <option value="all">All Categories</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white focus:outline-none focus:border-[#ea580c]"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="lowStock">Low Stock</option>
            </select>
          </div>

          <div className="flex items-center gap-3">
            {/* View Mode Toggle */}
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

            {/* Add Product Button */}
            <StandardButton
              variant="primary"
              onClick={() => {
                setEditingProduct(null);
                setShowProductForm(true);
              }}
              icon={<Plus className="w-4 h-4" />}
            >
              Add Product
            </StandardButton>
          </div>
        </div>
      </div>

      {/* Products Display */}
      {filteredProducts.length === 0 ? (
        <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-12 text-center">
          <Package className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">No Products Found</h3>
          <p className="text-gray-400 mb-6">
            {searchQuery || filterCategory !== 'all' || filterStatus !== 'all'
              ? 'Try adjusting your filters'
              : 'Get started by adding your first product'}
          </p>
          {products.length === 0 && (
            <StandardButton
              variant="primary"
              onClick={() => {
                setEditingProduct(null);
                setShowProductForm(true);
              }}
              icon={<Plus className="w-4 h-4" />}
            >
              Add Your First Product
            </StandardButton>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredProducts.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onEdit={() => {
                setEditingProduct(product);
                setShowProductForm(true);
              }}
              onDelete={() => handleDeleteProduct(product.id)}
              onToggleActive={() => handleToggleActive(product)}
            />
          ))}
        </div>
      ) : (
        <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl overflow-hidden">
          <table className="w-full">
            <thead className="bg-[#0A0A0A] border-b border-[#2A2A2A]">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Product
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Price
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Inventory
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2A2A2A]">
              {filteredProducts.map((product) => (
                <ProductRow
                  key={product.id}
                  product={product}
                  onEdit={() => {
                    setEditingProduct(product);
                    setShowProductForm(true);
                  }}
                  onDelete={() => handleDeleteProduct(product.id)}
                  onToggleActive={() => handleToggleActive(product)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Product Form Modal */}
      <AnimatePresence>
        {showProductForm && (
          <ProductFormModal
            product={editingProduct}
            vendorId={vendorId}
            vendorName={vendorName}
            onClose={() => {
              setShowProductForm(false);
              setEditingProduct(null);
            }}
            onSave={(savedProduct) => {
              if (editingProduct) {
                setProducts(products.map(p => p.id === savedProduct.id ? savedProduct : p));
              } else {
                setProducts([savedProduct, ...products]);
              }
              setShowProductForm(false);
              setEditingProduct(null);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// Product Card Component (Grid View)
function ProductCard({ 
  product, 
  onEdit, 
  onDelete, 
  onToggleActive 
}: { 
  product: Product;
  onEdit: () => void;
  onDelete: () => void;
  onToggleActive: () => void;
}) {
  const isLowStock = product.trackInventory && 
    product.inventoryQuantity < (product.lowStockThreshold || 10);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl overflow-hidden hover:border-[#ea580c] transition-colors group"
    >
      {/* Image */}
      <div className="relative aspect-square bg-[#0A0A0A] overflow-hidden">
        {product.primaryImage ? (
          <img
            src={product.primaryImage}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ImageIcon className="w-16 h-16 text-gray-600" />
          </div>
        )}
        
        {/* Status Badge */}
        <div className="absolute top-2 right-2 flex gap-2">
          {product.isFeatured && (
            <span className="px-2 py-1 bg-yellow-500/20 border border-yellow-500/30 text-yellow-400 text-xs rounded-full flex items-center gap-1">
              <Star className="w-3 h-3 fill-current" />
              Featured
            </span>
          )}
          <span className={`px-2 py-1 text-xs rounded-full ${
            product.isActive 
              ? 'bg-green-500/20 border border-green-500/30 text-green-400'
              : 'bg-gray-500/20 border border-gray-500/30 text-gray-400'
          }`}>
            {product.isActive ? 'Active' : 'Inactive'}
          </span>
        </div>

        {isLowStock && (
          <div className="absolute bottom-2 left-2">
            <span className="px-2 py-1 bg-yellow-500/20 border border-yellow-500/30 text-yellow-400 text-xs rounded-full flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              Low Stock
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="text-white font-semibold mb-1 truncate">{product.name}</h3>
        <p className="text-gray-400 text-sm mb-3 line-clamp-2 min-h-[40px]">
          {product.shortDescription || product.description}
        </p>

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
          <div className="text-right">
            <div className="text-sm text-gray-400">Stock</div>
            <div className={`font-semibold ${
              isLowStock ? 'text-yellow-500' : 'text-white'
            }`}>
              {product.inventoryQuantity}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={onEdit}
            className="flex-1 px-3 py-2 bg-[#0A0A0A] hover:bg-[#2A2A2A] border border-[#2A2A2A] text-white rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <Edit2 className="w-4 h-4" />
            Edit
          </button>
          <button
            onClick={onToggleActive}
            className="px-3 py-2 bg-[#0A0A0A] hover:bg-[#2A2A2A] border border-[#2A2A2A] text-white rounded-lg transition-colors"
            title={product.isActive ? 'Deactivate' : 'Activate'}
          >
            {product.isActive ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
          <button
            onClick={onDelete}
            className="px-3 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 rounded-lg transition-colors"
            title="Delete"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// Product Row Component (List View)
function ProductRow({ 
  product, 
  onEdit, 
  onDelete, 
  onToggleActive 
}: { 
  product: Product;
  onEdit: () => void;
  onDelete: () => void;
  onToggleActive: () => void;
}) {
  const isLowStock = product.trackInventory && 
    product.inventoryQuantity < (product.lowStockThreshold || 10);

  return (
    <tr className="hover:bg-[#0A0A0A] transition-colors">
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-[#0A0A0A] rounded-lg overflow-hidden flex-shrink-0">
            {product.primaryImage ? (
              <img src={product.primaryImage} alt={product.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <ImageIcon className="w-6 h-6 text-gray-600" />
              </div>
            )}
          </div>
          <div>
            <div className="text-white font-medium">{product.name}</div>
            {product.sku && (
              <div className="text-sm text-gray-400">SKU: {product.sku}</div>
            )}
          </div>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <span className="px-2 py-1 bg-[#0A0A0A] border border-[#2A2A2A] text-gray-300 text-sm rounded-full">
          {product.category}
        </span>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-white font-semibold">${product.price.toFixed(2)}</div>
        {product.compareAtPrice && product.compareAtPrice > product.price && (
          <div className="text-sm text-gray-500 line-through">
            ${product.compareAtPrice.toFixed(2)}
          </div>
        )}
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className={`font-semibold ${isLowStock ? 'text-yellow-500' : 'text-white'}`}>
          {product.inventoryQuantity}
        </div>
        {isLowStock && (
          <div className="text-xs text-yellow-500 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" />
            Low Stock
          </div>
        )}
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <span className={`px-2 py-1 text-xs rounded-full ${
          product.isActive 
            ? 'bg-green-500/20 border border-green-500/30 text-green-400'
            : 'bg-gray-500/20 border border-gray-500/30 text-gray-400'
        }`}>
          {product.isActive ? 'Active' : 'Inactive'}
        </span>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-right">
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={onEdit}
            className="p-2 hover:bg-[#0A0A0A] text-gray-400 hover:text-white rounded-lg transition-colors"
            title="Edit"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={onToggleActive}
            className="p-2 hover:bg-[#0A0A0A] text-gray-400 hover:text-white rounded-lg transition-colors"
            title={product.isActive ? 'Deactivate' : 'Activate'}
          >
            {product.isActive ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
          <button
            onClick={onDelete}
            className="p-2 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors"
            title="Delete"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </td>
    </tr>
  );
}