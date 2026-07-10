/**
 * Promotion Form Modal - Create/Edit Coupons, Sales, and Giveaways
 */

import { useState, useEffect } from 'react';
import { X, Tag, Percent, DollarSign, Calendar, Users, Gift, AlertCircle, Sparkles } from 'lucide-react';
import { TextInput } from './ui/input/TextInput';
import { TextArea } from './ui/input/TextArea';
import { toast } from 'sonner@2.0.3';

export interface Promotion {
  id: string;
  vendorId: string;
  type: 'coupon' | 'sale' | 'giveaway';
  name: string;
  code?: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  description: string;
  startDate: string;
  endDate: string;
  usageLimit?: number;
  usageCount: number;
  minPurchase?: number;
  maxDiscount?: number;
  isActive: boolean;
  applicableProducts?: string[];
  createdAt: string;
}

interface PromotionFormModalProps {
  promotion?: Promotion | null;
  vendorId: string;
  vendorName: string;
  onClose: () => void;
  onSave: (promotion: Promotion) => void;
}

export default function PromotionFormModal({ promotion, vendorId, vendorName, onClose, onSave }: PromotionFormModalProps) {
  const isEdit = !!promotion;

  const [formData, setFormData] = useState<Partial<Promotion>>({
    type: promotion?.type || 'coupon',
    name: promotion?.name || '',
    code: promotion?.code || '',
    discountType: promotion?.discountType || 'percentage',
    discountValue: promotion?.discountValue || 0,
    description: promotion?.description || '',
    startDate: promotion?.startDate || new Date().toISOString().split('T')[0],
    endDate: promotion?.endDate || '',
    usageLimit: promotion?.usageLimit || undefined,
    minPurchase: promotion?.minPurchase || undefined,
    maxDiscount: promotion?.maxDiscount || undefined,
    isActive: promotion?.isActive ?? true,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Auto-generate coupon code
  const generateCode = () => {
    const randomCode = `${formData.type?.toUpperCase() || 'PROMO'}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    setFormData({ ...formData, code: randomCode });
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name?.trim()) {
      newErrors.name = 'Promotion name is required';
    }

    if (formData.type === 'coupon' && !formData.code?.trim()) {
      newErrors.code = 'Coupon code is required';
    }

    if (!formData.discountValue || formData.discountValue <= 0) {
      newErrors.discountValue = 'Discount value must be greater than 0';
    }

    if (formData.discountType === 'percentage' && formData.discountValue > 100) {
      newErrors.discountValue = 'Percentage cannot exceed 100%';
    }

    if (!formData.startDate) {
      newErrors.startDate = 'Start date is required';
    }

    if (!formData.endDate) {
      newErrors.endDate = 'End date is required';
    }

    if (formData.startDate && formData.endDate && new Date(formData.endDate) < new Date(formData.startDate)) {
      newErrors.endDate = 'End date must be after start date';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      toast.error('Please fix the errors before saving');
      return;
    }

    setIsSubmitting(true);

    try {
      const promotionData: Promotion = {
        id: promotion?.id || `PROMO-${Date.now()}`,
        vendorId,
        type: formData.type!,
        name: formData.name!,
        code: formData.code,
        discountType: formData.discountType!,
        discountValue: formData.discountValue!,
        description: formData.description || '',
        startDate: formData.startDate!,
        endDate: formData.endDate!,
        usageLimit: formData.usageLimit,
        usageCount: promotion?.usageCount || 0,
        minPurchase: formData.minPurchase,
        maxDiscount: formData.maxDiscount,
        isActive: formData.isActive!,
        createdAt: promotion?.createdAt || new Date().toISOString(),
      };

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));

      onSave(promotionData);
      toast.success(isEdit ? 'Promotion updated!' : 'Promotion created!');
    } catch (error) {
      toast.error('Failed to save promotion');
      console.error('Error saving promotion:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-[#1A1A1A] border-b border-[#2A2A2A] p-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white mb-1">
              {isEdit ? 'Edit Promotion' : 'Create New Promotion'}
            </h2>
            <p className="text-sm text-gray-400">{vendorName}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-[#2A2A2A] rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Promotion Type */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Promotion Type
            </label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { value: 'coupon', label: 'Coupon Code', icon: Tag },
                { value: 'sale', label: 'Sale Event', icon: Percent },
                { value: 'giveaway', label: 'Giveaway', icon: Gift },
              ].map((type) => {
                const Icon = type.icon;
                const isSelected = formData.type === type.value;
                return (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => setFormData({ ...formData, type: type.value as any })}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      isSelected
                        ? 'border-[#ea580c] bg-[#ea580c]/10'
                        : 'border-[#2A2A2A] bg-[#0A0A0A] hover:border-[#3A3A3A]'
                    }`}
                  >
                    <Icon className={`w-6 h-6 mx-auto mb-2 ${isSelected ? 'text-[#ea580c]' : 'text-gray-400'}`} />
                    <p className={`text-sm font-medium ${isSelected ? 'text-white' : 'text-gray-400'}`}>
                      {type.label}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Name */}
          <div>
            <TextInput
              label="Promotion Name"
              placeholder="Summer Sale 2026"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              error={errors.name}
              required
            />
          </div>

          {/* Coupon Code (only for coupon type) */}
          {formData.type === 'coupon' && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Coupon Code <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-2">
                <TextInput
                  placeholder="SUMMER2026"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  error={errors.code}
                  className="flex-1"
                />
                <button
                  type="button"
                  onClick={generateCode}
                  className="px-4 py-2 bg-[#2A2A2A] hover:bg-[#3A3A3A] text-white rounded-lg transition-colors flex items-center gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  Generate
                </button>
              </div>
            </div>
          )}

          {/* Discount Type & Value */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Discount Type
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, discountType: 'percentage' })}
                  className={`p-3 rounded-lg border transition-all ${
                    formData.discountType === 'percentage'
                      ? 'border-[#ea580c] bg-[#ea580c]/10 text-white'
                      : 'border-[#2A2A2A] bg-[#0A0A0A] text-gray-400 hover:border-[#3A3A3A]'
                  }`}
                >
                  <Percent className="w-5 h-5 mx-auto mb-1" />
                  <p className="text-xs">Percentage</p>
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, discountType: 'fixed' })}
                  className={`p-3 rounded-lg border transition-all ${
                    formData.discountType === 'fixed'
                      ? 'border-[#ea580c] bg-[#ea580c]/10 text-white'
                      : 'border-[#2A2A2A] bg-[#0A0A0A] text-gray-400 hover:border-[#3A3A3A]'
                  }`}
                >
                  <DollarSign className="w-5 h-5 mx-auto mb-1" />
                  <p className="text-xs">Fixed</p>
                </button>
              </div>
            </div>

            <div>
              <TextInput
                label="Discount Value"
                type="number"
                placeholder={formData.discountType === 'percentage' ? '20' : '50'}
                value={formData.discountValue || ''}
                onChange={(e) => setFormData({ ...formData, discountValue: parseFloat(e.target.value) })}
                error={errors.discountValue}
                icon={formData.discountType === 'percentage' ? Percent : DollarSign}
                required
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <TextArea
              label="Description (Optional)"
              placeholder="Describe the promotion details..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
            />
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <TextInput
                label="Start Date"
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                error={errors.startDate}
                icon={Calendar}
                required
              />
            </div>
            <div>
              <TextInput
                label="End Date"
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                error={errors.endDate}
                icon={Calendar}
                required
              />
            </div>
          </div>

          {/* Advanced Options */}
          <div className="border-t border-[#2A2A2A] pt-6">
            <h3 className="text-lg font-semibold text-white mb-4">Advanced Options</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <TextInput
                  label="Usage Limit (Optional)"
                  type="number"
                  placeholder="Unlimited"
                  value={formData.usageLimit || ''}
                  onChange={(e) => setFormData({ ...formData, usageLimit: e.target.value ? parseInt(e.target.value) : undefined })}
                  icon={Users}
                />
                <p className="text-xs text-gray-500 mt-1">Leave empty for unlimited uses</p>
              </div>

              <div>
                <TextInput
                  label="Minimum Purchase (Optional)"
                  type="number"
                  placeholder="$0"
                  value={formData.minPurchase || ''}
                  onChange={(e) => setFormData({ ...formData, minPurchase: e.target.value ? parseFloat(e.target.value) : undefined })}
                  icon={DollarSign}
                />
              </div>

              {formData.discountType === 'percentage' && (
                <div>
                  <TextInput
                    label="Max Discount (Optional)"
                    type="number"
                    placeholder="No limit"
                    value={formData.maxDiscount || ''}
                    onChange={(e) => setFormData({ ...formData, maxDiscount: e.target.value ? parseFloat(e.target.value) : undefined })}
                    icon={DollarSign}
                  />
                  <p className="text-xs text-gray-500 mt-1">Cap the maximum discount amount</p>
                </div>
              )}
            </div>
          </div>

          {/* Active Toggle */}
          <div className="flex items-center justify-between bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg p-4">
            <div>
              <p className="text-white font-medium">Active Status</p>
              <p className="text-sm text-gray-400">
                {formData.isActive ? 'Promotion is live and visible' : 'Promotion is paused'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setFormData({ ...formData, isActive: !formData.isActive })}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                formData.isActive ? 'bg-[#ea580c]' : 'bg-[#2A2A2A]'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  formData.isActive ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Preview */}
          {formData.name && formData.discountValue && (
            <div className="bg-gradient-to-r from-[#ea580c]/10 to-[#dc2626]/10 border border-[#ea580c]/30 rounded-lg p-4">
              <p className="text-xs text-gray-400 mb-2">Preview:</p>
              <div className="flex items-center gap-3">
                <Tag className="w-8 h-8 text-[#ea580c]" />
                <div>
                  <p className="text-white font-semibold">{formData.name}</p>
                  <p className="text-[#ea580c] font-bold">
                    {formData.discountType === 'percentage' ? `${formData.discountValue}% OFF` : `$${formData.discountValue} OFF`}
                    {formData.code && ` - Use code: ${formData.code}`}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 bg-[#2A2A2A] text-white font-semibold rounded-lg hover:bg-[#3A3A3A] transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-[#ea580c] to-[#dc2626] text-white font-semibold rounded-lg hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Saving...' : isEdit ? 'Update Promotion' : 'Create Promotion'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
