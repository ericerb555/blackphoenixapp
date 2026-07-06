// Product Form Modal Component
// Phase 2: Product Creation/Edit Form
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Save,
  Upload,
  Image as ImageIcon,
  Trash2,
  DollarSign,
  Package,
  Tag,
  FileText,
  Star,
  AlertCircle,
  Plus,
  Sparkles
} from 'lucide-react';
import MarketingAssetGenerator from './MarketingAssetGenerator';
import type { Product } from '../types/ecommerce';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { API_BASE_URL } from '../lib/apiConfig';

interface ProductFormModalProps {
  product: Product | null;
  vendorId: string;
  vendorName: string;
  onClose: () => void;
  onSave: (product: Product) => void;
}

const CATEGORIES = [
  'Tools',
  'Building Materials',
  'Plumbing',
  'Electrical',
  'HVAC',
  'Flooring',
  'Paint & Supplies',
  'Hardware',
  'Safety Equipment',
  'Lighting',
  'Windows & Doors',
  'Roofing',
  'Insulation',
  'Other'
];

export default function ProductFormModal({
  product,
  vendorId,
  vendorName,
  onClose,
  onSave
}: ProductFormModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    shortDescription: '',
    description: '',
    category: 'Tools',
    subcategory: '',
    price: '',
    compareAtPrice: '',
    cost: '',
    sku: '',
    barcode: '',
    inventoryQuantity: '0',
    lowStockThreshold: '10',
    trackInventory: true,
    images: [] as string[],
    tags: [] as string[],
    isActive: true,
    isFeatured: false,
    metaTitle: '',
    metaDescription: ''
  });

  const [newTag, setNewTag] = useState('');
  const [newImageUrl, setNewImageUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showMarketingAssets, setShowMarketingAssets] = useState(false);

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name || '',
        shortDescription: product.shortDescription || '',
        description: product.description || '',
        category: product.category || 'Tools',
        subcategory: product.subcategory || '',
        price: product.price?.toString() || '',
        compareAtPrice: product.compareAtPrice?.toString() || '',
        cost: product.cost?.toString() || '',
        sku: product.sku || '',
        barcode: product.barcode || '',
        inventoryQuantity: product.inventoryQuantity?.toString() || '0',
        lowStockThreshold: product.lowStockThreshold?.toString() || '10',
        trackInventory: product.trackInventory !== false,
        images: product.images || [],
        tags: product.tags || [],
        isActive: product.isActive !== false,
        isFeatured: product.isFeatured || false,
        metaTitle: product.metaTitle || '',
        metaDescription: product.metaDescription || ''
      });
    }
  }, [product]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Product name is required';
    }

    if (!formData.price || parseFloat(formData.price) <= 0) {
      newErrors.price = 'Valid price is required';
    }

    if (formData.compareAtPrice && parseFloat(formData.compareAtPrice) < parseFloat(formData.price)) {
      newErrors.compareAtPrice = 'Compare price must be higher than price';
    }

    if (formData.trackInventory && parseInt(formData.inventoryQuantity) < 0) {
      newErrors.inventoryQuantity = 'Inventory cannot be negative';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setSaving(true);
    try {
      const url = product
        ? `${API_BASE_URL}/make-server-57095a78/products/${product.id}`
        : `${API_BASE_URL}/make-server-57095a78/products`;

      const method = product ? 'PUT' : 'POST';

      const payload = {
        vendorId,
        vendorName,
        name: formData.name.trim(),
        shortDescription: formData.shortDescription.trim(),
        description: formData.description.trim(),
        category: formData.category,
        subcategory: formData.subcategory.trim(),
        price: parseFloat(formData.price),
        compareAtPrice: formData.compareAtPrice ? parseFloat(formData.compareAtPrice) : undefined,
        cost: formData.cost ? parseFloat(formData.cost) : undefined,
        sku: formData.sku.trim(),
        barcode: formData.barcode.trim(),
        inventoryQuantity: parseInt(formData.inventoryQuantity),
        lowStockThreshold: parseInt(formData.lowStockThreshold),
        trackInventory: formData.trackInventory,
        images: formData.images,
        primaryImage: formData.images[0] || '',
        tags: formData.tags,
        isActive: formData.isActive,
        isFeatured: formData.isFeatured,
        metaTitle: formData.metaTitle.trim(),
        metaDescription: formData.metaDescription.trim()
      };

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      
      if (data.success) {
        onSave(data.product);
      } else {
        alert(data.error || 'Failed to save product');
      }
    } catch (error) {
      console.error('Error saving product:', error);
      alert('Failed to save product');
    } finally {
      setSaving(false);
    }
  };

  const handleAddImage = () => {
    if (newImageUrl.trim()) {
      setFormData({
        ...formData,
        images: [...formData.images, newImageUrl.trim()]
      });
      setNewImageUrl('');
    }
  };

  const handleRemoveImage = (index: number) => {
    setFormData({
      ...formData,
      images: formData.images.filter((_, i) => i !== index)
    });
  };

  const handleAddTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData({
        ...formData,
        tags: [...formData.tags, newTag.trim()]
      });
      setNewTag('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setFormData({
      ...formData,
      tags: formData.tags.filter(t => t !== tag)
    });
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
        className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto my-8"
      >
        {/* Header */}
        <div className="sticky top-0 bg-[#1A1A1A] border-b border-[#2A2A2A] p-6 flex items-center justify-between z-10">
          <div>
            <h2 className="text-2xl font-bold text-white">
              {product ? 'Edit Product' : 'Add New Product'}
            </h2>
            <p className="text-gray-400 text-sm mt-1">
              {product ? 'Update product information' : 'Fill in the details to create a new product'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-[#2A2A2A] rounded-lg transition-colors text-gray-400 hover:text-white"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form Content */}
        <div className="p-6 space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <FileText className="w-5 h-5 text-[#ea580c]" />
              Basic Information
            </h3>

            {/* Product Name */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Product Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className={`w-full px-4 py-3 bg-[#0A0A0A] border ${
                  errors.name ? 'border-red-500' : 'border-[#2A2A2A]'
                } rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#ea580c]`}
                placeholder="Enter product name"
              />
              {errors.name && (
                <p className="text-red-400 text-sm mt-1 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {errors.name}
                </p>
              )}
            </div>

            {/* Short Description */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Short Description
              </label>
              <input
                type="text"
                value={formData.shortDescription}
                onChange={(e) => setFormData({ ...formData, shortDescription: e.target.value })}
                className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#ea580c]"
                placeholder="Brief product description (shown in cards)"
                maxLength={120}
              />
              <p className="text-xs text-gray-500 mt-1">
                {formData.shortDescription.length}/120 characters
              </p>
            </div>

            {/* Full Description */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-300">
                  Full Description
                </label>
                <button
                  type="button"
                  onClick={async () => {
                    if (!formData.name) {
                      alert('Please enter a product name first');
                      return;
                    }
                    setSaving(true);
                    try {
                      const response = await fetch(
                        `${API_BASE_URL}/make-server-57095a78/marketing-assets/generate-description`,
                        {
                          method: 'POST',
                          headers: {
                            'Authorization': `Bearer ${publicAnonKey}`,
                            'Content-Type': 'application/json',
                          },
                          body: JSON.stringify({
                            productName: formData.name,
                            category: formData.category,
                            features: formData.shortDescription
                          }),
                        }
                      );
                      const data = await response.json();
                      if (data.success) {
                        setFormData({ ...formData, description: data.description });
                      }
                    } catch (error) {
                      console.error('Error generating description:', error);
                    } finally {
                      setSaving(false);
                    }
                  }}
                  className="flex items-center gap-1 text-xs text-purple-400 hover:text-purple-300 transition-colors"
                >
                  <Sparkles className="w-3 h-3" />
                  AI Generate
                </button>
              </div>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={4}
                className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#ea580c] resize-none"
                placeholder="Detailed product description"
              />
            </div>

            {/* Category & Subcategory */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Category *
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white focus:outline-none focus:border-[#ea580c]"
                >
                  {CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Subcategory
                </label>
                <input
                  type="text"
                  value={formData.subcategory}
                  onChange={(e) => setFormData({ ...formData, subcategory: e.target.value })}
                  className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#ea580c]"
                  placeholder="e.g., Power Tools"
                />
              </div>
            </div>
          </div>

          {/* Pricing */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-[#ea580c]" />
              Pricing
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Price *
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    className={`w-full pl-8 pr-4 py-3 bg-[#0A0A0A] border ${
                      errors.price ? 'border-red-500' : 'border-[#2A2A2A]'
                    } rounded-lg text-white focus:outline-none focus:border-[#ea580c]`}
                    placeholder="0.00"
                  />
                </div>
                {errors.price && (
                  <p className="text-red-400 text-sm mt-1">{errors.price}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Compare At Price
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.compareAtPrice}
                    onChange={(e) => setFormData({ ...formData, compareAtPrice: e.target.value })}
                    className={`w-full pl-8 pr-4 py-3 bg-[#0A0A0A] border ${
                      errors.compareAtPrice ? 'border-red-500' : 'border-[#2A2A2A]'
                    } rounded-lg text-white focus:outline-none focus:border-[#ea580c]`}
                    placeholder="0.00"
                  />
                </div>
                {errors.compareAtPrice && (
                  <p className="text-red-400 text-sm mt-1">{errors.compareAtPrice}</p>
                )}
                <p className="text-xs text-gray-500 mt-1">Original price (for discounts)</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Cost (Private)
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.cost}
                    onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                    className="w-full pl-8 pr-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white focus:outline-none focus:border-[#ea580c]"
                    placeholder="0.00"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">Your cost (not shown to customers)</p>
              </div>
            </div>
          </div>

          {/* Inventory */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <Package className="w-5 h-5 text-[#ea580c]" />
              Inventory
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  SKU
                </label>
                <input
                  type="text"
                  value={formData.sku}
                  onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                  className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#ea580c]"
                  placeholder="e.g., TOOL-001"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Barcode
                </label>
                <input
                  type="text"
                  value={formData.barcode}
                  onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                  className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#ea580c]"
                  placeholder="e.g., 123456789012"
                />
              </div>
            </div>

            <div className="flex items-center gap-4 p-4 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg">
              <input
                type="checkbox"
                id="trackInventory"
                checked={formData.trackInventory}
                onChange={(e) => setFormData({ ...formData, trackInventory: e.target.checked })}
                className="w-5 h-5 rounded border-[#2A2A2A] bg-[#0A0A0A] text-[#ea580c] focus:ring-[#ea580c]"
              />
              <label htmlFor="trackInventory" className="text-white cursor-pointer flex-1">
                Track inventory for this product
              </label>
            </div>

            {formData.trackInventory && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Quantity in Stock *
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.inventoryQuantity}
                    onChange={(e) => setFormData({ ...formData, inventoryQuantity: e.target.value })}
                    className={`w-full px-4 py-3 bg-[#0A0A0A] border ${
                      errors.inventoryQuantity ? 'border-red-500' : 'border-[#2A2A2A]'
                    } rounded-lg text-white focus:outline-none focus:border-[#ea580c]`}
                  />
                  {errors.inventoryQuantity && (
                    <p className="text-red-400 text-sm mt-1">{errors.inventoryQuantity}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Low Stock Alert Threshold
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.lowStockThreshold}
                    onChange={(e) => setFormData({ ...formData, lowStockThreshold: e.target.value })}
                    className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white focus:outline-none focus:border-[#ea580c]"
                  />
                  <p className="text-xs text-gray-500 mt-1">Alert when stock falls below this number</p>
                </div>
              </div>
            )}
          </div>

          {/* Images */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-[#ea580c]" />
                Product Images
              </h3>
              {product && (
                <button
                  onClick={() => setShowMarketingAssets(true)}
                  className="px-3 py-1.5 bg-[#2A2A2A] hover:bg-[#3A3A3A] border border-[#2A2A2A] text-gray-300 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  Generate Marketing Assets
                </button>
              )}
            </div>

            {/* Image Grid */}
            {formData.images.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {formData.images.map((img, index) => (
                  <div key={index} className="relative group aspect-square bg-[#0A0A0A] rounded-lg overflow-hidden border border-[#2A2A2A]">
                    <img src={img} alt={`Product ${index + 1}`} className="w-full h-full object-cover" />
                    {index === 0 && (
                      <div className="absolute top-2 left-2 px-2 py-1 bg-[#ea580c] text-white text-xs rounded-full">
                        Primary
                      </div>
                    )}
                    <button
                      onClick={() => handleRemoveImage(index)}
                      className="absolute top-2 right-2 p-1.5 bg-red-500 hover:bg-red-600 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add Image */}
            <div className="flex gap-2">
              <input
                type="url"
                value={newImageUrl}
                onChange={(e) => setNewImageUrl(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddImage()}
                className="flex-1 px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#ea580c]"
                placeholder="Enter image URL and press Enter"
              />
              <button
                onClick={handleAddImage}
                disabled={!newImageUrl.trim()}
                className="px-4 py-3 bg-[#2A2A2A] hover:bg-[#3A3A3A] border border-[#2A2A2A] text-gray-300 rounded-lg font-medium transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Upload className="w-4 h-4" />
                Add
              </button>
            </div>
            <p className="text-xs text-gray-500">First image will be used as the primary image</p>
          </div>

          {/* Tags */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <Tag className="w-5 h-5 text-[#ea580c]" />
              Tags
            </h3>

            {/* Tag List */}
            {formData.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {formData.tags.map(tag => (
                  <span
                    key={tag}
                    className="px-3 py-1 bg-[#0A0A0A] border border-[#2A2A2A] text-gray-300 rounded-full flex items-center gap-2 text-sm"
                  >
                    {tag}
                    <button
                      onClick={() => handleRemoveTag(tag)}
                      className="hover:text-red-400 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Add Tag */}
            <div className="flex gap-2">
              <input
                type="text"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
                className="flex-1 px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#ea580c]"
                placeholder="Enter tag and press Enter"
              />
              <button
                onClick={handleAddTag}
                disabled={!newTag.trim()}
                className="px-4 py-3 bg-[#2A2A2A] hover:bg-[#3A3A3A] border border-[#2A2A2A] text-gray-300 rounded-lg font-medium transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus className="w-4 h-4" />
                Add
              </button>
            </div>
          </div>

          {/* Status Options */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white">Status & Features</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-4 p-4 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="w-5 h-5 rounded border-[#2A2A2A] bg-[#0A0A0A] text-[#ea580c] focus:ring-[#ea580c]"
                />
                <label htmlFor="isActive" className="text-white cursor-pointer flex-1">
                  Active (visible in store)
                </label>
              </div>

              <div className="flex items-center gap-4 p-4 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg">
                <input
                  type="checkbox"
                  id="isFeatured"
                  checked={formData.isFeatured}
                  onChange={(e) => setFormData({ ...formData, isFeatured: e.target.checked })}
                  className="w-5 h-5 rounded border-[#2A2A2A] bg-[#0A0A0A] text-[#ea580c] focus:ring-[#ea580c]"
                />
                <label htmlFor="isFeatured" className="text-white cursor-pointer flex-1 flex items-center gap-2">
                  <Star className="w-4 h-4 text-yellow-500" />
                  Featured Product
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="sticky bottom-0 bg-[#1A1A1A] border-t border-[#2A2A2A] p-6 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-6 py-3 bg-[#0A0A0A] hover:bg-[#2A2A2A] border border-[#2A2A2A] text-white rounded-lg font-semibold transition-colors"
          >
            Cancel
          </button>
          
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-3 bg-gradient-to-r from-[#ea580c] to-[#dc2626] text-white rounded-lg font-semibold transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : product ? 'Update Product' : 'Create Product'}
          </button>
        </div>
      </motion.div>

      {/* Marketing Asset Generator Modal */}
      <AnimatePresence>
        {showMarketingAssets && product && (
          <MarketingAssetGenerator
            product={{
              ...product,
              ...formData,
              price: parseFloat(formData.price) || 0,
              inventoryQuantity: parseInt(formData.inventoryQuantity) || 0
            } as Product}
            onClose={() => setShowMarketingAssets(false)}
            onAssetsGenerated={(assets) => {
              setFormData({
                ...formData,
                images: [...formData.images, ...assets]
              });
              setShowMarketingAssets(false);
            }}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}