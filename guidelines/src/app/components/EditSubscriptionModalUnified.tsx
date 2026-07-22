import { useState, useEffect } from 'react';
import {
  X,
  Users,
  Briefcase,
  Store,
  Megaphone,
  DollarSign,
  Calendar,
  Mail,
  User,
  Package,
  Shield,
  CheckCircle,
} from 'lucide-react';

interface Subscription {
  id: string;
  subscriber_id: string;
  subscriber_name: string;
  subscriber_email: string;
  subscriber_type: 'customer' | 'subcontractor' | 'vendor' | 'advertising';
  plan_id: string;
  plan_name: string;
  status: 'active' | 'pending' | 'cancelled' | 'past_due' | 'trial' | 'expired';
  start_date: string;
  end_date: string;
  next_billing_date: string;
  amount: number;
  billing_frequency: string;
  auto_renew: boolean;
  trial_ends_at: string | null;
  created_at: string;
}

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
  created_at: string;
}

interface EditSubscriptionModalProps {
  subscription: Subscription | null;
  plans: SubscriptionPlan[];
  onSave: (subscription: Subscription) => void;
  onClose: () => void;
}

export default function EditSubscriptionModalUnified({ 
  subscription, 
  plans, 
  onSave, 
  onClose 
}: EditSubscriptionModalProps) {
  const [formData, setFormData] = useState<Partial<Subscription>>({
    subscriber_type: 'customer',
    status: 'active',
    auto_renew: true,
    billing_frequency: 'monthly',
  });

  useEffect(() => {
    if (subscription) {
      setFormData(subscription);
    }
  }, [subscription]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.subscriber_name || !formData.subscriber_email || !formData.plan_id || !formData.amount) {
      alert('Please fill in all required fields');
      return;
    }

    const today = new Date();
    const nextBilling = new Date(today);
    
    if (formData.billing_frequency === 'monthly') {
      nextBilling.setMonth(nextBilling.getMonth() + 1);
    } else if (formData.billing_frequency === 'quarterly') {
      nextBilling.setMonth(nextBilling.getMonth() + 3);
    } else {
      nextBilling.setFullYear(nextBilling.getFullYear() + 1);
    }

    onSave({
      ...subscription,
      ...formData,
      id: subscription?.id || `sub_${Date.now()}`,
      subscriber_id: formData.subscriber_id || `user_${Date.now()}`,
      start_date: formData.start_date || today.toISOString(),
      end_date: formData.end_date || '',
      next_billing_date: formData.next_billing_date || nextBilling.toISOString(),
      created_at: subscription?.created_at || new Date().toISOString(),
    } as Subscription);
  };

  const typeIcons = {
    customer: { icon: Users, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
    subcontractor: { icon: Briefcase, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
    vendor: { icon: Store, color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20' },
    advertising: { icon: Megaphone, color: 'text-pink-400', bg: 'bg-pink-500/10', border: 'border-pink-500/20' },
  };

  const statusOptions = [
    { value: 'active', label: 'Active', color: 'text-green-400' },
    { value: 'trial', label: 'Trial', color: 'text-blue-400' },
    { value: 'pending', label: 'Pending', color: 'text-yellow-400' },
    { value: 'cancelled', label: 'Cancelled', color: 'text-gray-400' },
    { value: 'past_due', label: 'Past Due', color: 'text-red-400' },
    { value: 'expired', label: 'Expired', color: 'text-gray-400' },
  ];

  const handlePlanChange = (planId: string) => {
    const selectedPlan = plans.find(p => p.id === planId);
    if (selectedPlan) {
      setFormData({
        ...formData,
        plan_id: planId,
        plan_name: selectedPlan.plan_name,
        amount: selectedPlan.price,
        billing_frequency: selectedPlan.billing_frequency,
        subscriber_type: selectedPlan.plan_type,
      });
    }
  };

  const currentType = typeIcons[formData.subscriber_type || 'customer'];
  const TypeIcon = currentType.icon;

  const filteredPlans = plans.filter(p => 
    p.plan_type === formData.subscriber_type && p.is_active
  );

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
                {subscription ? 'Edit Subscription' : 'Create Subscription'}
              </h2>
              <p className="text-sm text-orange-100">
                Manage subscription details and status
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
          {/* Subscriber Type Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-3">
              Subscriber Type *
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {Object.entries(typeIcons).map(([type, config]) => {
                const Icon = config.icon;
                const isSelected = formData.subscriber_type === type;
                
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setFormData({ ...formData, subscriber_type: type as any, plan_id: '' })}
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

          {/* Subscriber Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Subscriber Name *
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={formData.subscriber_name || ''}
                  onChange={(e) => setFormData({ ...formData, subscriber_name: e.target.value })}
                  placeholder="Enter name"
                  className="w-full pl-10 pr-4 py-2.5 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Email Address *
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  value={formData.subscriber_email || ''}
                  onChange={(e) => setFormData({ ...formData, subscriber_email: e.target.value })}
                  placeholder="email@example.com"
                  className="w-full pl-10 pr-4 py-2.5 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50"
                  required
                />
              </div>
            </div>
          </div>

          {/* Plan Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Select Plan *
            </label>
            <div className="relative">
              <Package className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 z-10" />
              <select
                value={formData.plan_id || ''}
                onChange={(e) => handlePlanChange(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg text-white focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50 appearance-none"
                required
              >
                <option value="">Select a plan...</option>
                {filteredPlans.map((plan) => (
                  <option key={plan.id} value={plan.id}>
                    {plan.plan_name} - ${plan.price}/{plan.billing_frequency}
                  </option>
                ))}
              </select>
            </div>
            {filteredPlans.length === 0 && (
              <p className="text-sm text-gray-400 mt-1">
                No active plans available for {formData.subscriber_type} type
              </p>
            )}
          </div>

          {/* Status and Billing */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Status *
              </label>
              <div className="relative">
                <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 z-10" />
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                  className="w-full pl-10 pr-4 py-2.5 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg text-white focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50 appearance-none"
                  required
                >
                  {statusOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Amount *
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.amount || ''}
                  onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) })}
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
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 z-10" />
                <select
                  value={formData.billing_frequency}
                  onChange={(e) => setFormData({ ...formData, billing_frequency: e.target.value })}
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

          {/* Auto Renew */}
          <div className="flex items-center gap-3 p-4 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg">
            <input
              type="checkbox"
              id="auto_renew"
              checked={formData.auto_renew}
              onChange={(e) => setFormData({ ...formData, auto_renew: e.target.checked })}
              className="w-5 h-5 rounded border-[#2A2A2A] bg-[#0A0A0A] text-orange-600 focus:ring-2 focus:ring-orange-500/50"
            />
            <label htmlFor="auto_renew" className="flex-1 text-sm text-gray-300 cursor-pointer">
              <span className="font-medium text-white">Auto Renew</span>
              <p className="text-xs text-gray-400 mt-0.5">
                Automatically renew this subscription at the end of each billing period
              </p>
            </label>
          </div>

          {/* Trial Information */}
          {formData.status === 'trial' && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Trial End Date
              </label>
              <input
                type="date"
                value={formData.trial_ends_at ? new Date(formData.trial_ends_at).toISOString().split('T')[0] : ''}
                onChange={(e) => setFormData({ ...formData, trial_ends_at: e.target.value ? new Date(e.target.value).toISOString() : null })}
                className="w-full px-4 py-2.5 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg text-white focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50"
              />
            </div>
          )}

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
              className="flex-1 px-4 py-2.5 bg-gradient-to-r from-orange-600 to-orange-700 text-white rounded-lg hover:from-orange-700 hover:to-orange-800 transition-colors font-medium flex items-center justify-center gap-2"
            >
              <CheckCircle className="w-4 h-4" />
              {subscription ? 'Update Subscription' : 'Create Subscription'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
