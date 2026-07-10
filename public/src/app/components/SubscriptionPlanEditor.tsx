import { useState, useEffect } from 'react';
import {
  X,
  Users,
  Briefcase,
  Store,
  Megaphone,
  Plus,
  Trash2,
  DollarSign,
  Calendar,
  Package,
} from 'lucide-react';

interface SubscriptionPlan {
  id: string;
  plan_name: string;
  plan_type: 'customer' | 'subcontractor' | 'vendor' | 'advertising';
  billing_frequency: 'monthly' | 'quarterly' | 'annual';
  price: number;
  features: string[];
  is_active: boolean;
  max_users?: number;
  max_projects?: number;
  max_ads?: number;
  max_impressions?: number;
  created_at: string;
}

interface SubscriptionPlanEditorProps {
  plan: SubscriptionPlan | null;
  onSave: (plan: SubscriptionPlan) => void;
  onClose: () => void;
}

export default function SubscriptionPlanEditor({ plan, onSave, onClose }: SubscriptionPlanEditorProps) {
  const [formData, setFormData] = useState<Partial<SubscriptionPlan>>({
    plan_name: '',
    plan_type: 'customer',
    billing_frequency: 'monthly',
    price: 0,
    features: [],
    is_active: true,
  });
  const [newFeature, setNewFeature] = useState('');

  useEffect(() => {
    if (plan) {
      setFormData(plan);
    }
  }, [plan]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.plan_name || !formData.price || formData.features!.length === 0) {
      alert('Please fill in all required fields and add at least one feature');
      return;
    }

    onSave({
      ...plan,
      ...formData,
      id: plan?.id || `plan_${Date.now()}`,
      created_at: plan?.created_at || new Date().toISOString(),
    } as SubscriptionPlan);
  };

  const addFeature = () => {
    if (newFeature.trim()) {
      setFormData({
        ...formData,
        features: [...(formData.features || []), newFeature.trim()],
      });
      setNewFeature('');
    }
  };

  const removeFeature = (index: number) => {
    setFormData({
      ...formData,
      features: formData.features!.filter((_, i) => i !== index),
    });
  };

  const typeIcons = {
    customer: { icon: Users, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
    subcontractor: { icon: Briefcase, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
    vendor: { icon: Store, color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20' },
    advertising: { icon: Megaphone, color: 'text-pink-400', bg: 'bg-pink-500/10', border: 'border-pink-500/20' },
  };

  const currentType = typeIcons[formData.plan_type || 'customer'];
  const TypeIcon = currentType.icon;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#0A0A0A] rounded-xl border border-[#2A2A2A] max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-orange-600 to-orange-700 px-6 py-4 flex items-center justify-between border-b border-orange-500/20 rounded-t-xl z-10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg">
              <Package className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">
                {plan ? 'Edit Subscription Plan' : 'Create Subscription Plan'}
              </h2>
              <p className="text-sm text-orange-100">
                Configure pricing and features for your subscription
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Plan Type Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-3">
              Plan Type *
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {Object.entries(typeIcons).map(([type, config]) => {
                const Icon = config.icon;
                const isSelected = formData.plan_type === type;
                
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setFormData({ ...formData, plan_type: type as any })}
                    className={`p-4 rounded-lg border ${
                      isSelected
                        ? `${config.bg} ${config.border} border-2`
                        : 'bg-[#1A1A1A] border-[#2A2A2A] hover:border-orange-500/30'
                    } transition-all`}
                  >
                    <Icon className={`w-6 h-6 mx-auto mb-2 ${isSelected ? config.color : 'text-gray-400'}`} />
                    <p className={`text-sm font-medium ${isSelected ? 'text-white' : 'text-gray-400'}`}>
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Plan Name */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Plan Name *
            </label>
            <input
              type="text"
              value={formData.plan_name}
              onChange={(e) => setFormData({ ...formData, plan_name: e.target.value })}
              placeholder="e.g., Professional Plan"
              className="w-full px-4 py-2.5 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50"
              required
            />
          </div>

          {/* Pricing */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Price *
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) })}
                  placeholder="99.99"
                  className="w-full pl-10 pr-4 py-2.5 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Billing Frequency *
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <select
                  value={formData.billing_frequency}
                  onChange={(e) => setFormData({ ...formData, billing_frequency: e.target.value as any })}
                  className="w-full pl-10 pr-4 py-2.5 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg text-white focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50 appearance-none"
                  required
                >
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="annual">Annual</option>
                </select>
              </div>
            </div>
          </div>

          {/* Optional Limits */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Max Users (Optional)
              </label>
              <input
                type="number"
                min="0"
                value={formData.max_users || ''}
                onChange={(e) => setFormData({ ...formData, max_users: e.target.value ? parseInt(e.target.value) : undefined })}
                placeholder="Unlimited if empty"
                className="w-full px-4 py-2.5 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Max Projects (Optional)
              </label>
              <input
                type="number"
                min="0"
                value={formData.max_projects || ''}
                onChange={(e) => setFormData({ ...formData, max_projects: e.target.value ? parseInt(e.target.value) : undefined })}
                placeholder="Unlimited if empty"
                className="w-full px-4 py-2.5 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50"
              />
            </div>

            {formData.plan_type === 'advertising' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Max Ads (Optional)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.max_ads || ''}
                    onChange={(e) => setFormData({ ...formData, max_ads: e.target.value ? parseInt(e.target.value) : undefined })}
                    placeholder="Unlimited if empty"
                    className="w-full px-4 py-2.5 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Max Impressions/Month (Optional)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.max_impressions || ''}
                    onChange={(e) => setFormData({ ...formData, max_impressions: e.target.value ? parseInt(e.target.value) : undefined })}
                    placeholder="Unlimited if empty"
                    className="w-full px-4 py-2.5 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50"
                  />
                </div>
              </>
            )}

            {formData.plan_type === 'vendor' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Max Landing Page Ads (Optional)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.max_ads || ''}
                    onChange={(e) => setFormData({ ...formData, max_ads: e.target.value ? parseInt(e.target.value) : undefined })}
                    placeholder="Unlimited if empty"
                    className="w-full px-4 py-2.5 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Max Monthly Impressions (Optional)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.max_impressions || ''}
                    onChange={(e) => setFormData({ ...formData, max_impressions: e.target.value ? parseInt(e.target.value) : undefined })}
                    placeholder="Unlimited if empty"
                    className="w-full px-4 py-2.5 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50"
                  />
                </div>
              </>
            )}
          </div>

          {/* Features */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Plan Features *
            </label>
            <div className="space-y-3">
              {/* Add Feature Input */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newFeature}
                  onChange={(e) => setNewFeature(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addFeature();
                    }
                  }}
                  placeholder="Add a feature (press Enter or click +)"
                  className="flex-1 px-4 py-2.5 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50"
                />
                <button
                  type="button"
                  onClick={addFeature}
                  className="px-4 py-2.5 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>

              {/* Feature List */}
              {formData.features && formData.features.length > 0 && (
                <div className="space-y-2">
                  {formData.features.map((feature, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-3 p-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg group"
                    >
                      <div className="flex-1 text-sm text-gray-300">{feature}</div>
                      <button
                        type="button"
                        onClick={() => removeFeature(index)}
                        className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Active Status */}
          <div className="flex items-center gap-3 p-4 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg">
            <input
              type="checkbox"
              id="is_active"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="w-5 h-5 rounded border-[#2A2A2A] bg-[#0A0A0A] text-orange-600 focus:ring-2 focus:ring-orange-500/50"
            />
            <label htmlFor="is_active" className="flex-1 text-sm text-gray-300 cursor-pointer">
              <span className="font-medium text-white">Active Plan</span>
              <p className="text-xs text-gray-400 mt-0.5">
                This plan will be available for new subscriptions
              </p>
            </label>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t border-[#2A2A2A]">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 bg-[#1A1A1A] border border-[#2A2A2A] text-gray-300 rounded-lg hover:bg-[#2A2A2A] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2.5 bg-gradient-to-r from-orange-600 to-orange-700 text-white rounded-lg hover:from-orange-700 hover:to-orange-800 transition-colors font-medium"
            >
              {plan ? 'Update Plan' : 'Create Plan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
