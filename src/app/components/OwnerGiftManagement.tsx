import { useState, useEffect } from 'react';
import {
  Gift, X, Plus, Search, Calendar, DollarSign, Clock, Crown, Users,
  Wrench, Store, Megaphone, Check, AlertCircle, Trash2, Edit, Eye,
  Package, Zap, Tag, TrendingUp, Award, Star, Heart, Sparkles,
  Filter, Download, RefreshCw, Copy, Send, ChevronDown, ChevronRight
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';

type GiftType = 
  | 'hours' 
  | 'subscription' 
  | 'maintenance-plan'
  | 'ad-space'
  | 'credits'
  | 'feature-access'
  | 'service'
  | 'custom';

type RecipientType = 'customer' | 'subcontractor' | 'vendor' | 'advertiser';

interface GiftTemplate {
  id: string;
  name: string;
  type: GiftType;
  description: string;
  defaultAmount?: number;
  defaultDuration?: number;
  durationType?: 'days' | 'months' | 'years';
  isActive: boolean;
  createdAt: string;
  usageCount: number;
}

interface GiftRecord {
  id: string;
  templateId: string;
  templateName: string;
  giftType: GiftType;
  recipientId: string;
  recipientName: string;
  recipientType: RecipientType;
  amount?: number;
  duration?: number;
  durationType?: 'days' | 'months' | 'years';
  status: 'active' | 'redeemed' | 'expired' | 'revoked';
  grantedBy: string;
  grantedDate: string;
  expiryDate?: string;
  redeemedDate?: string;
  notes?: string;
}

interface OwnerGiftManagementProps {
  onClose: () => void;
}

export default function OwnerGiftManagement({ onClose }: OwnerGiftManagementProps) {
  const [activeTab, setActiveTab] = useState<'templates' | 'active-gifts' | 'history'>('templates');
  const [showCreateTemplate, setShowCreateTemplate] = useState(false);
  const [showGrantGift, setShowGrantGift] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<GiftTemplate | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<GiftType | 'all'>('all');
  const [filterRecipient, setFilterRecipient] = useState<RecipientType | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<'active' | 'redeemed' | 'expired' | 'revoked' | 'all'>('all');

  // Sample data - in production, load from Supabase
  const [templates, setTemplates] = useState<GiftTemplate[]>([
    {
      id: 'tpl1',
      name: '10 Free Hours',
      type: 'hours',
      description: 'Gift 10 hours of service time',
      defaultAmount: 10,
      isActive: true,
      createdAt: '2024-01-15',
      usageCount: 12
    },
    {
      id: 'tpl2',
      name: '30-Day Premium Trial',
      type: 'subscription',
      description: 'Premium subscription access for 30 days',
      defaultDuration: 30,
      durationType: 'days',
      isActive: true,
      createdAt: '2024-01-20',
      usageCount: 8
    },
    {
      id: 'tpl3',
      name: 'Featured Ad Spot',
      type: 'ad-space',
      description: 'Premium advertising placement',
      defaultDuration: 7,
      durationType: 'days',
      isActive: true,
      createdAt: '2024-02-01',
      usageCount: 5
    }
  ]);

  const [giftRecords, setGiftRecords] = useState<GiftRecord[]>([
    {
      id: 'gift1',
      templateId: 'tpl1',
      templateName: '10 Free Hours',
      giftType: 'hours',
      recipientId: 'cust1',
      recipientName: 'John Smith',
      recipientType: 'customer',
      amount: 10,
      status: 'active',
      grantedBy: 'Owner',
      grantedDate: '2024-03-01',
      expiryDate: '2024-06-01',
      notes: 'Welcome bonus'
    },
    {
      id: 'gift2',
      templateId: 'tpl2',
      templateName: '30-Day Premium Trial',
      giftType: 'subscription',
      recipientId: 'sub1',
      recipientName: 'Mike Johnson',
      recipientType: 'subcontractor',
      duration: 30,
      durationType: 'days',
      status: 'redeemed',
      grantedBy: 'Owner',
      grantedDate: '2024-02-15',
      redeemedDate: '2024-02-16',
      notes: 'New subcontractor onboarding'
    }
  ]);

  const giftTypeConfig = {
    hours: { icon: Clock, color: 'from-blue-500 to-blue-600', label: 'Service Hours' },
    subscription: { icon: Crown, color: 'from-purple-500 to-purple-600', label: 'Subscription' },
    'maintenance-plan': { icon: Wrench, color: 'from-green-500 to-green-600', label: 'Maintenance Plan' },
    'ad-space': { icon: Megaphone, color: 'from-pink-500 to-pink-600', label: 'Ad Space' },
    credits: { icon: DollarSign, color: 'from-yellow-500 to-yellow-600', label: 'Credits' },
    'feature-access': { icon: Zap, color: 'from-orange-500 to-orange-600', label: 'Feature Access' },
    service: { icon: Package, color: 'from-teal-500 to-teal-600', label: 'Service' },
    custom: { icon: Gift, color: 'from-gray-500 to-gray-600', label: 'Custom Gift' }
  };

  const recipientTypeConfig = {
    customer: { icon: Users, label: 'Customer', color: 'text-blue-400' },
    subcontractor: { icon: Wrench, label: 'Subcontractor', color: 'text-green-400' },
    vendor: { icon: Store, label: 'Vendor', color: 'text-purple-400' },
    advertiser: { icon: Megaphone, label: 'Advertiser', color: 'text-pink-400' }
  };

  const filteredTemplates = templates.filter(template => {
    if (filterType !== 'all' && template.type !== filterType) return false;
    if (searchQuery && !template.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const filteredGifts = giftRecords.filter(gift => {
    if (filterType !== 'all' && gift.giftType !== filterType) return false;
    if (filterRecipient !== 'all' && gift.recipientType !== filterRecipient) return false;
    if (filterStatus !== 'all' && gift.status !== filterStatus) return false;
    if (searchQuery && !gift.recipientName.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const renderTemplateCard = (template: GiftTemplate) => {
    const config = giftTypeConfig[template.type];
    const IconComponent = config.icon;

    return (
      <div key={template.id} className="bg-[#1a1a1a] border border-gray-800 rounded-xl p-6 hover:border-[#ea580c]/50 transition">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`p-3 bg-gradient-to-br ${config.color} rounded-lg`}>
              <IconComponent className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-white font-semibold">{template.name}</h3>
              <p className="text-sm text-gray-400">{config.label}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setSelectedTemplate(template);
                setShowGrantGift(true);
              }}
              className="p-2 bg-gradient-to-r from-[#ea580c] to-[#c2410c] hover:from-[#c2410c] hover:to-[#9a3412] text-white rounded-lg transition"
              title="Grant Gift"
            >
              <Send className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                setSelectedTemplate(template);
                setShowCreateTemplate(true);
              }}
              className="p-2 bg-[#2a2a2a] hover:bg-[#333] text-gray-400 hover:text-white rounded-lg transition"
              title="Edit"
            >
              <Edit className="w-4 h-4" />
            </button>
          </div>
        </div>
        
        <p className="text-sm text-gray-400 mb-4">{template.description}</p>

        <div className="flex items-center gap-4 text-sm">
          {template.defaultAmount && (
            <div className="flex items-center gap-1 text-gray-400">
              <Tag className="w-4 h-4" />
              <span>{template.defaultAmount} units</span>
            </div>
          )}
          {template.defaultDuration && (
            <div className="flex items-center gap-1 text-gray-400">
              <Clock className="w-4 h-4" />
              <span>{template.defaultDuration} {template.durationType}</span>
            </div>
          )}
          <div className="flex items-center gap-1 text-gray-400">
            <Award className="w-4 h-4" />
            <span>{template.usageCount} granted</span>
          </div>
        </div>
      </div>
    );
  };

  const renderGiftRecord = (gift: GiftRecord) => {
    const typeConfig = giftTypeConfig[gift.giftType];
    const recipientConfig = recipientTypeConfig[gift.recipientType];
    const TypeIcon = typeConfig.icon;
    const RecipientIcon = recipientConfig.icon;

    const statusConfig = {
      active: { color: 'bg-green-500/20 text-green-400 border-green-500/30', label: 'Active' },
      redeemed: { color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', label: 'Redeemed' },
      expired: { color: 'bg-gray-500/20 text-gray-400 border-gray-500/30', label: 'Expired' },
      revoked: { color: 'bg-red-500/20 text-red-400 border-red-500/30', label: 'Revoked' }
    };

    return (
      <div key={gift.id} className="bg-[#1a1a1a] border border-gray-800 rounded-xl p-6 hover:border-[#ea580c]/30 transition">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <div className={`p-2 bg-gradient-to-br ${typeConfig.color} rounded-lg`}>
                <TypeIcon className="w-4 h-4 text-white" />
              </div>
              <div>
                <h3 className="text-white font-semibold">{gift.templateName}</h3>
                <div className="flex items-center gap-2 text-sm">
                  <RecipientIcon className={`w-3 h-3 ${recipientConfig.color}`} />
                  <span className="text-gray-400">{gift.recipientName}</span>
                  <span className="text-gray-600">•</span>
                  <span className={recipientConfig.color}>{recipientConfig.label}</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <span className={`px-3 py-1 rounded-full border text-xs font-medium ${statusConfig[gift.status].color}`}>
              {statusConfig[gift.status].label}
            </span>
            <button className="p-2 bg-[#2a2a2a] hover:bg-[#333] text-gray-400 hover:text-white rounded-lg transition">
              <Eye className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          {gift.amount && (
            <div>
              <p className="text-gray-500 mb-1">Amount</p>
              <p className="text-white font-medium">{gift.amount} units</p>
            </div>
          )}
          {gift.duration && (
            <div>
              <p className="text-gray-500 mb-1">Duration</p>
              <p className="text-white font-medium">{gift.duration} {gift.durationType}</p>
            </div>
          )}
          <div>
            <p className="text-gray-500 mb-1">Granted</p>
            <p className="text-white font-medium">{new Date(gift.grantedDate).toLocaleDateString()}</p>
          </div>
          {gift.expiryDate && (
            <div>
              <p className="text-gray-500 mb-1">Expires</p>
              <p className="text-white font-medium">{new Date(gift.expiryDate).toLocaleDateString()}</p>
            </div>
          )}
        </div>

        {gift.notes && (
          <div className="mt-4 pt-4 border-t border-gray-800">
            <p className="text-sm text-gray-400">{gift.notes}</p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-[#0A0A0A] rounded-2xl border border-[#2A2A2A] max-w-7xl w-full max-h-[90vh] overflow-hidden flex flex-col my-8">
        {/* Header */}
        <div className="p-6 border-b border-gray-800">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-br from-[#ea580c] to-[#c2410c] rounded-xl">
                <Gift className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">Owner Gift Management</h2>
                <p className="text-sm text-gray-400">Grant complimentary access to any service or feature</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-[#2a2a2a] text-gray-400 hover:text-white rounded-lg transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mt-4">
            {[
              { id: 'templates', label: 'Gift Templates', icon: Package },
              { id: 'active-gifts', label: 'Active Gifts', icon: Sparkles },
              { id: 'history', label: 'History', icon: Clock }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${
                  activeTab === tab.id
                    ? 'bg-[#ea580c] text-white'
                    : 'bg-[#1a1a1a] text-gray-400 hover:bg-[#2a2a2a]'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Filters & Actions */}
        <div className="p-6 border-b border-gray-800 bg-[#0f0f0f]">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={activeTab === 'templates' ? 'Search templates...' : 'Search recipients...'}
                  className="w-full pl-10 pr-4 py-2 bg-[#1a1a1a] border border-gray-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#ea580c]"
                />
              </div>
            </div>

            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as any)}
              className="px-4 py-2 bg-[#1a1a1a] border border-gray-800 rounded-lg text-white focus:outline-none focus:border-[#ea580c]"
            >
              <option value="all">All Types</option>
              <option value="hours">Hours</option>
              <option value="subscription">Subscription</option>
              <option value="maintenance-plan">Maintenance Plan</option>
              <option value="ad-space">Ad Space</option>
              <option value="credits">Credits</option>
              <option value="feature-access">Feature Access</option>
              <option value="service">Service</option>
              <option value="custom">Custom</option>
            </select>

            {activeTab !== 'templates' && (
              <>
                <select
                  value={filterRecipient}
                  onChange={(e) => setFilterRecipient(e.target.value as any)}
                  className="px-4 py-2 bg-[#1a1a1a] border border-gray-800 rounded-lg text-white focus:outline-none focus:border-[#ea580c]"
                >
                  <option value="all">All Recipients</option>
                  <option value="customer">Customers</option>
                  <option value="subcontractor">Subcontractors</option>
                  <option value="vendor">Vendors</option>
                  <option value="advertiser">Advertisers</option>
                </select>

                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as any)}
                  className="px-4 py-2 bg-[#1a1a1a] border border-gray-800 rounded-lg text-white focus:outline-none focus:border-[#ea580c]"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="redeemed">Redeemed</option>
                  <option value="expired">Expired</option>
                  <option value="revoked">Revoked</option>
                </select>
              </>
            )}

            {activeTab === 'templates' && (
              <button
                onClick={() => {
                  setSelectedTemplate(null);
                  setShowCreateTemplate(true);
                }}
                className="px-4 py-2 bg-gradient-to-r from-[#ea580c] to-[#c2410c] hover:from-[#c2410c] hover:to-[#9a3412] text-white rounded-lg flex items-center gap-2 transition font-medium"
              >
                <Plus className="w-4 h-4" />
                Create Template
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'templates' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredTemplates.map(renderTemplateCard)}
              
              {filteredTemplates.length === 0 && (
                <div className="col-span-full flex flex-col items-center justify-center py-12 text-gray-500">
                  <Package className="w-12 h-12 mb-3 opacity-50" />
                  <p>No templates found</p>
                </div>
              )}
            </div>
          )}

          {(activeTab === 'active-gifts' || activeTab === 'history') && (
            <div className="space-y-4">
              {filteredGifts
                .filter(gift => activeTab === 'active-gifts' ? gift.status === 'active' : gift.status !== 'active')
                .map(renderGiftRecord)}
              
              {filteredGifts.filter(gift => activeTab === 'active-gifts' ? gift.status === 'active' : gift.status !== 'active').length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                  <Sparkles className="w-12 h-12 mb-3 opacity-50" />
                  <p>No {activeTab === 'active-gifts' ? 'active gifts' : 'gift history'} found</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Summary Footer */}
        <div className="p-4 border-t border-gray-800 bg-[#0f0f0f]">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-6 text-gray-400">
              <span>{filteredTemplates.length} templates</span>
              <span>{giftRecords.filter(g => g.status === 'active').length} active gifts</span>
              <span>{giftRecords.filter(g => g.status === 'redeemed').length} redeemed</span>
            </div>
            <button className="px-4 py-2 bg-[#2a2a2a] hover:bg-[#333] text-gray-300 rounded-lg flex items-center gap-2 transition">
              <Download className="w-4 h-4" />
              Export Report
            </button>
          </div>
        </div>
      </div>

      {/* Create/Edit Template Modal */}
      {showCreateTemplate && (
        <CreateTemplateModal
          template={selectedTemplate}
          onClose={() => {
            setShowCreateTemplate(false);
            setSelectedTemplate(null);
          }}
          onSave={(template) => {
            if (selectedTemplate) {
              setTemplates(templates.map(t => t.id === template.id ? template : t));
              toast.success('Template updated successfully');
            } else {
              setTemplates([...templates, { ...template, id: `tpl${Date.now()}`, createdAt: new Date().toISOString(), usageCount: 0 }]);
              toast.success('Template created successfully');
            }
            setShowCreateTemplate(false);
            setSelectedTemplate(null);
          }}
        />
      )}

      {/* Grant Gift Modal */}
      {showGrantGift && selectedTemplate && (
        <GrantGiftModal
          template={selectedTemplate}
          onClose={() => {
            setShowGrantGift(false);
            setSelectedTemplate(null);
          }}
          onGrant={(giftData) => {
            setGiftRecords([...giftRecords, {
              ...giftData,
              id: `gift${Date.now()}`,
              templateId: selectedTemplate.id,
              templateName: selectedTemplate.name,
              giftType: selectedTemplate.type,
              status: 'active',
              grantedBy: 'Owner',
              grantedDate: new Date().toISOString()
            }]);
            setTemplates(templates.map(t => 
              t.id === selectedTemplate.id ? { ...t, usageCount: t.usageCount + 1 } : t
            ));
            toast.success(`Gift granted to ${giftData.recipientName}`);
            setShowGrantGift(false);
            setSelectedTemplate(null);
          }}
        />
      )}
    </div>
  );
}

// Create Template Modal Component
function CreateTemplateModal({ template, onClose, onSave }: {
  template: GiftTemplate | null;
  onClose: () => void;
  onSave: (template: Omit<GiftTemplate, 'id' | 'createdAt' | 'usageCount'>) => void;
}) {
  const [formData, setFormData] = useState({
    name: template?.name || '',
    type: template?.type || 'hours' as GiftType,
    description: template?.description || '',
    defaultAmount: template?.defaultAmount || 0,
    defaultDuration: template?.defaultDuration || 0,
    durationType: template?.durationType || 'days' as 'days' | 'months' | 'years',
    isActive: template?.isActive ?? true
  });

  const giftTypes: { value: GiftType; label: string; icon: any }[] = [
    { value: 'hours', label: 'Service Hours', icon: Clock },
    { value: 'subscription', label: 'Subscription Plan', icon: Crown },
    { value: 'maintenance-plan', label: 'Maintenance Plan', icon: Wrench },
    { value: 'ad-space', label: 'Advertising Space', icon: Megaphone },
    { value: 'credits', label: 'Platform Credits', icon: DollarSign },
    { value: 'feature-access', label: 'Feature Access', icon: Zap },
    { value: 'service', label: 'One-time Service', icon: Package },
    { value: 'custom', label: 'Custom Gift', icon: Gift }
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.description) {
      toast.error('Please fill in all required fields');
      return;
    }
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
      <div className="bg-[#0A0A0A] rounded-2xl border border-[#2A2A2A] max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-800">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-white">
              {template ? 'Edit Gift Template' : 'Create Gift Template'}
            </h3>
            <button onClick={onClose} className="p-2 hover:bg-[#2a2a2a] text-gray-400 hover:text-white rounded-lg transition">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Template Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., 10 Free Hours, 30-Day Trial"
              className="w-full px-4 py-2 bg-[#1a1a1a] border border-gray-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#ea580c]"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Gift Type *</label>
            <div className="grid grid-cols-2 gap-3">
              {giftTypes.map((type) => {
                const IconComponent = type.icon;
                return (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => setFormData({ ...formData, type: type.value })}
                    className={`p-3 rounded-lg border transition ${
                      formData.type === type.value
                        ? 'bg-[#ea580c]/20 border-[#ea580c] text-white'
                        : 'bg-[#1a1a1a] border-gray-800 text-gray-400 hover:border-gray-700'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <IconComponent className="w-4 h-4" />
                      <span className="text-sm font-medium">{type.label}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Description *</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe what this gift provides..."
              rows={3}
              className="w-full px-4 py-2 bg-[#1a1a1a] border border-gray-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#ea580c]"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Default Amount</label>
              <input
                type="number"
                value={formData.defaultAmount}
                onChange={(e) => setFormData({ ...formData, defaultAmount: parseInt(e.target.value) || 0 })}
                placeholder="0"
                className="w-full px-4 py-2 bg-[#1a1a1a] border border-gray-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#ea580c]"
              />
              <p className="text-xs text-gray-500 mt-1">For quantifiable gifts (hours, credits, etc.)</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Default Duration</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={formData.defaultDuration}
                  onChange={(e) => setFormData({ ...formData, defaultDuration: parseInt(e.target.value) || 0 })}
                  placeholder="0"
                  className="flex-1 px-4 py-2 bg-[#1a1a1a] border border-gray-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#ea580c]"
                />
                <select
                  value={formData.durationType}
                  onChange={(e) => setFormData({ ...formData, durationType: e.target.value as any })}
                  className="px-3 py-2 bg-[#1a1a1a] border border-gray-800 rounded-lg text-white focus:outline-none focus:border-[#ea580c]"
                >
                  <option value="days">Days</option>
                  <option value="months">Months</option>
                  <option value="years">Years</option>
                </select>
              </div>
              <p className="text-xs text-gray-500 mt-1">How long the gift is valid</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-4 bg-[#1a1a1a] rounded-lg">
            <input
              type="checkbox"
              id="isActive"
              checked={formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              className="w-4 h-4 rounded border-gray-700 bg-[#2a2a2a] text-[#ea580c] focus:ring-[#ea580c]"
            />
            <label htmlFor="isActive" className="text-sm text-gray-300">
              Template is active and ready to use
            </label>
          </div>

          <div className="flex gap-3 pt-4 border-t border-gray-800">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-[#2a2a2a] hover:bg-[#333] text-white rounded-lg transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-gradient-to-r from-[#ea580c] to-[#c2410c] hover:from-[#c2410c] hover:to-[#9a3412] text-white rounded-lg transition font-medium"
            >
              {template ? 'Update Template' : 'Create Template'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Grant Gift Modal Component
function GrantGiftModal({ template, onClose, onGrant }: {
  template: GiftTemplate;
  onClose: () => void;
  onGrant: (data: Partial<GiftRecord>) => void;
}) {
  const [formData, setFormData] = useState({
    recipientType: 'customer' as RecipientType,
    recipientId: '',
    recipientName: '',
    amount: template.defaultAmount || 0,
    duration: template.defaultDuration || 0,
    durationType: template.durationType || 'days' as 'days' | 'months' | 'years',
    expiryDate: '',
    notes: ''
  });

  // Sample recipients - in production, load from Supabase based on recipientType
  const sampleRecipients = {
    customer: [
      { id: 'cust1', name: 'John Smith' },
      { id: 'cust2', name: 'Sarah Johnson' },
      { id: 'cust3', name: 'Mike Williams' }
    ],
    subcontractor: [
      { id: 'sub1', name: 'Bob Builder' },
      { id: 'sub2', name: 'Tom Plumber' }
    ],
    vendor: [
      { id: 'vend1', name: 'ABC Supplies' },
      { id: 'vend2', name: 'XYZ Materials' }
    ],
    advertiser: [
      { id: 'adv1', name: 'Marketing Pro' },
      { id: 'adv2', name: 'Ad Agency Co' }
    ]
  };

  const recipients = sampleRecipients[formData.recipientType];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.recipientId || !formData.recipientName) {
      toast.error('Please select a recipient');
      return;
    }
    onGrant(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
      <div className="bg-[#0A0A0A] rounded-2xl border border-[#2A2A2A] max-w-2xl w-full">
        <div className="p-6 border-b border-gray-800">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold text-white">Grant Gift</h3>
              <p className="text-sm text-gray-400 mt-1">Template: {template.name}</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-[#2a2a2a] text-gray-400 hover:text-white rounded-lg transition">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Recipient Type *</label>
            <div className="grid grid-cols-4 gap-2">
              {(['customer', 'subcontractor', 'vendor', 'advertiser'] as RecipientType[]).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setFormData({ ...formData, recipientType: type, recipientId: '', recipientName: '' })}
                  className={`px-3 py-2 rounded-lg border text-sm transition ${
                    formData.recipientType === type
                      ? 'bg-[#ea580c]/20 border-[#ea580c] text-white'
                      : 'bg-[#1a1a1a] border-gray-800 text-gray-400 hover:border-gray-700'
                  }`}
                >
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Select Recipient *</label>
            <select
              value={formData.recipientId}
              onChange={(e) => {
                const selected = recipients.find(r => r.id === e.target.value);
                setFormData({ 
                  ...formData, 
                  recipientId: e.target.value,
                  recipientName: selected?.name || ''
                });
              }}
              className="w-full px-4 py-2 bg-[#1a1a1a] border border-gray-800 rounded-lg text-white focus:outline-none focus:border-[#ea580c]"
              required
            >
              <option value="">Choose a recipient...</option>
              {recipients.map(recipient => (
                <option key={recipient.id} value={recipient.id}>{recipient.name}</option>
              ))}
            </select>
          </div>

          {template.defaultAmount ? (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Amount</label>
              <input
                type="number"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: parseInt(e.target.value) || 0 })}
                className="w-full px-4 py-2 bg-[#1a1a1a] border border-gray-800 rounded-lg text-white focus:outline-none focus:border-[#ea580c]"
              />
            </div>
          ) : null}

          {template.defaultDuration ? (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Duration</label>
                <input
                  type="number"
                  value={formData.duration}
                  onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) || 0 })}
                  className="w-full px-4 py-2 bg-[#1a1a1a] border border-gray-800 rounded-lg text-white focus:outline-none focus:border-[#ea580c]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Duration Type</label>
                <select
                  value={formData.durationType}
                  onChange={(e) => setFormData({ ...formData, durationType: e.target.value as any })}
                  className="w-full px-4 py-2 bg-[#1a1a1a] border border-gray-800 rounded-lg text-white focus:outline-none focus:border-[#ea580c]"
                >
                  <option value="days">Days</option>
                  <option value="months">Months</option>
                  <option value="years">Years</option>
                </select>
              </div>
            </div>
          ) : null}

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Expiry Date (Optional)</label>
            <input
              type="date"
              value={formData.expiryDate}
              onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
              className="w-full px-4 py-2 bg-[#1a1a1a] border border-gray-800 rounded-lg text-white focus:outline-none focus:border-[#ea580c]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Notes (Optional)</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Add any additional notes..."
              rows={3}
              className="w-full px-4 py-2 bg-[#1a1a1a] border border-gray-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#ea580c]"
            />
          </div>

          <div className="flex gap-3 pt-4 border-t border-gray-800">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-[#2a2a2a] hover:bg-[#333] text-white rounded-lg transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-gradient-to-r from-[#ea580c] to-[#c2410c] hover:from-[#c2410c] hover:to-[#9a3412] text-white rounded-lg transition font-medium flex items-center justify-center gap-2"
            >
              <Send className="w-4 h-4" />
              Grant Gift
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
