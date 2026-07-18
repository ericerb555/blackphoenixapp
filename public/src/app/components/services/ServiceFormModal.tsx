/**
 * Service Form Modal - Enterprise Service Creation/Editing
 * Comprehensive service management with all features
 */

import { useState, useEffect } from 'react';
import {
  X, Save, Package, DollarSign, Clock, Tag, FileText, Image,
  Upload, Trash2, Plus, Award, Users, Briefcase, Wrench, Shield,
  AlertCircle, CheckCircle, Copy, Zap, Settings, Target, BarChart3
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { useCompany } from '../../contexts/CompanyContext';

interface ServiceVariant {
  id: string;
  name: string;
  price: number;
  description: string;
}

interface ServiceAddon {
  id: string;
  name: string;
  price: number;
  optional: boolean;
}

interface ServiceFormData {
  // Basic Information
  name: string;
  description: string;
  category: string;
  subcategory: string;
  
  // Pricing
  pricing_type: 'fixed' | 'hourly' | 'per_sqft' | 'custom';
  base_price: number;
  min_price?: number;
  max_price?: number;
  cost: number; // Internal cost for profit calculation
  
  // Time Estimates
  duration_min: number; // in hours
  duration_max: number;
  duration_unit: 'hours' | 'days' | 'weeks';
  
  // Service Details
  service_code: string;
  status: 'active' | 'inactive' | 'draft';
  featured: boolean;
  
  // Requirements
  required_skills: string[];
  required_certifications: string[];
  required_equipment: string[];
  team_size_min: number;
  team_size_max: number;
  
  // Variants & Add-ons
  has_variants: boolean;
  variants: ServiceVariant[];
  addons: ServiceAddon[];
  
  // Business Rules
  requires_site_visit: boolean;
  requires_permit: boolean;
  requires_inspection: boolean;
  min_notice_days: number;
  
  // Terms & Conditions
  terms_conditions: string;
  warranty_period: number; // in months
  warranty_description: string;
  
  // Metadata
  tags: string[];
  internal_notes: string;
  
  // Images
  image_url?: string;
  gallery_urls: string[];
  
  // Integration
  quickbooks_item_id?: string;
  stripe_product_id?: string;
}

interface ServiceFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (service: ServiceFormData) => Promise<void>;
  editingService?: ServiceFormData | null;
  mode: 'create' | 'edit';
}

export default function ServiceFormModal({ isOpen, onClose, onSave, editingService, mode }: ServiceFormModalProps) {
  const companyContext = useCompany();
  const activeCompany = companyContext?.activeCompany || null;
  const [activeTab, setActiveTab] = useState<'basic' | 'pricing' | 'requirements' | 'variants' | 'terms' | 'advanced'>('basic');
  const [isSaving, setIsSaving] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState<ServiceFormData>({
    name: '',
    description: '',
    category: 'Installation',
    subcategory: '',
    pricing_type: 'fixed',
    base_price: 0,
    cost: 0,
    duration_min: 1,
    duration_max: 2,
    duration_unit: 'hours',
    service_code: '',
    status: 'active',
    featured: false,
    required_skills: [],
    required_certifications: [],
    required_equipment: [],
    team_size_min: 1,
    team_size_max: 1,
    has_variants: false,
    variants: [],
    addons: [],
    requires_site_visit: false,
    requires_permit: false,
    requires_inspection: false,
    min_notice_days: 0,
    terms_conditions: '',
    warranty_period: 12,
    warranty_description: '',
    tags: [],
    internal_notes: '',
    gallery_urls: []
  });
  
  const [newSkill, setNewSkill] = useState('');
  const [newCert, setNewCert] = useState('');
  const [newEquipment, setNewEquipment] = useState('');
  const [newTag, setNewTag] = useState('');
  
  // Load editing service data
  useEffect(() => {
    if (editingService) {
      setFormData(editingService);
    } else {
      // Generate service code
      const code = `SRV-${Date.now().toString().slice(-6)}`;
      setFormData(prev => ({ ...prev, service_code: code }));
    }
  }, [editingService]);
  
  const categories = [
    'Installation', 'Repair', 'Maintenance', 'Renovation', 'Upgrade',
    'Inspection', 'Consultation', 'Emergency', 'Seasonal', 'Custom'
  ];
  
  const subcategories: Record<string, string[]> = {
    Installation: ['HVAC', 'Electrical', 'Plumbing', 'Flooring', 'Roofing', 'Windows', 'Doors'],
    Repair: ['Emergency Repair', 'Scheduled Repair', 'Warranty Repair', 'Preventive'],
    Maintenance: ['Routine', 'Preventive', 'Seasonal', 'Contract-based'],
    Renovation: ['Kitchen', 'Bathroom', 'Basement', 'Whole House', 'Commercial'],
    Upgrade: ['System Upgrade', 'Efficiency Upgrade', 'Modernization', 'Expansion']
  };
  
  const handleSave = async () => {
    // Validation
    if (!formData.name.trim()) {
      toast.error('Service name is required');
      return;
    }
    if (formData.base_price <= 0) {
      toast.error('Base price must be greater than 0');
      return;
    }
    
    setIsSaving(true);
    try {
      await onSave(formData);
      toast.success(`Service ${mode === 'create' ? 'created' : 'updated'} successfully!`);
      onClose();
    } catch (error) {
      toast.error(`Failed to ${mode === 'create' ? 'create' : 'update'} service`);
    } finally {
      setIsSaving(false);
    }
  };
  
  const addSkill = () => {
    if (newSkill.trim() && !formData.required_skills.includes(newSkill.trim())) {
      setFormData({ ...formData, required_skills: [...formData.required_skills, newSkill.trim()] });
      setNewSkill('');
    }
  };
  
  const removeSkill = (skill: string) => {
    setFormData({ ...formData, required_skills: formData.required_skills.filter(s => s !== skill) });
  };
  
  const addCertification = () => {
    if (newCert.trim() && !formData.required_certifications.includes(newCert.trim())) {
      setFormData({ ...formData, required_certifications: [...formData.required_certifications, newCert.trim()] });
      setNewCert('');
    }
  };
  
  const removeCertification = (cert: string) => {
    setFormData({ ...formData, required_certifications: formData.required_certifications.filter(c => c !== cert) });
  };
  
  const addEquipment = () => {
    if (newEquipment.trim() && !formData.required_equipment.includes(newEquipment.trim())) {
      setFormData({ ...formData, required_equipment: [...formData.required_equipment, newEquipment.trim()] });
      setNewEquipment('');
    }
  };
  
  const removeEquipment = (equipment: string) => {
    setFormData({ ...formData, required_equipment: formData.required_equipment.filter(e => e !== equipment) });
  };
  
  const addTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData({ ...formData, tags: [...formData.tags, newTag.trim()] });
      setNewTag('');
    }
  };
  
  const removeTag = (tag: string) => {
    setFormData({ ...formData, tags: formData.tags.filter(t => t !== tag) });
  };
  
  const addVariant = () => {
    const newVariant: ServiceVariant = {
      id: `var-${Date.now()}`,
      name: '',
      price: formData.base_price,
      description: ''
    };
    setFormData({ ...formData, variants: [...formData.variants, newVariant] });
  };
  
  const updateVariant = (id: string, updates: Partial<ServiceVariant>) => {
    setFormData({
      ...formData,
      variants: formData.variants.map(v => v.id === id ? { ...v, ...updates } : v)
    });
  };
  
  const removeVariant = (id: string) => {
    setFormData({ ...formData, variants: formData.variants.filter(v => v.id !== id) });
  };
  
  const addAddon = () => {
    const newAddon: ServiceAddon = {
      id: `addon-${Date.now()}`,
      name: '',
      price: 0,
      optional: true
    };
    setFormData({ ...formData, addons: [...formData.addons, newAddon] });
  };
  
  const updateAddon = (id: string, updates: Partial<ServiceAddon>) => {
    setFormData({
      ...formData,
      addons: formData.addons.map(a => a.id === id ? { ...a, ...updates } : a)
    });
  };
  
  const removeAddon = (id: string) => {
    setFormData({ ...formData, addons: formData.addons.filter(a => a.id !== id) });
  };
  
  const calculateProfitMargin = () => {
    if (formData.cost > 0 && formData.base_price > 0) {
      const margin = ((formData.base_price - formData.cost) / formData.base_price) * 100;
      return margin.toFixed(1);
    }
    return '0.0';
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#0A0A0A] rounded-2xl border-2 border-orange-500/30 w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl shadow-orange-500/20">
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-600 to-orange-700 p-6 border-b border-orange-500/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center">
                <Package className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">
                  {mode === 'create' ? 'Create New Service' : 'Edit Service'}
                </h2>
                <p className="text-white/80 text-sm">
                  {mode === 'create' ? 'Add a new service to your catalog' : 'Update service details'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition"
            >
              <X className="w-6 h-6 text-white" />
            </button>
          </div>
          
          {/* Tabs */}
          <div className="flex items-center gap-2 mt-4 overflow-x-auto">
            {[
              { id: 'basic', label: 'Basic Info', icon: FileText },
              { id: 'pricing', label: 'Pricing', icon: DollarSign },
              { id: 'requirements', label: 'Requirements', icon: Shield },
              { id: 'variants', label: 'Variants & Add-ons', icon: Zap },
              { id: 'terms', label: 'Terms', icon: Award },
              { id: 'advanced', label: 'Advanced', icon: Settings }
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2 whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'bg-white/20 text-white border border-white/30'
                      : 'bg-white/5 text-white/70 hover:bg-white/10'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Basic Info Tab */}
          {activeTab === 'basic' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Service Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                    placeholder="e.g., HVAC Installation"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Service Code *
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={formData.service_code}
                      onChange={(e) => setFormData({ ...formData, service_code: e.target.value })}
                      className="flex-1 px-4 py-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg text-white font-mono focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                      placeholder="SRV-001"
                    />
                    <button
                      onClick={() => {
                        const code = `SRV-${Date.now().toString().slice(-6)}`;
                        setFormData({ ...formData, service_code: code });
                      }}
                      className="p-3 bg-orange-600/20 hover:bg-orange-600/30 text-orange-400 rounded-lg transition border border-orange-500/20"
                      title="Generate Code"
                    >
                      <Zap className="w-5 h-5" />
                    </button>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="draft">Draft</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Category *
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value, subcategory: '' })}
                    className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                  >
                    {categories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Subcategory
                  </label>
                  <select
                    value={formData.subcategory}
                    onChange={(e) => setFormData({ ...formData, subcategory: e.target.value })}
                    className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                  >
                    <option value="">Select subcategory</option>
                    {subcategories[formData.category]?.map(sub => (
                      <option key={sub} value={sub}>{sub}</option>
                    ))}
                  </select>
                </div>
                
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={4}
                    className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                    placeholder="Detailed description of the service..."
                  />
                </div>
                
                <div className="md:col-span-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.featured}
                      onChange={(e) => setFormData({ ...formData, featured: e.target.checked })}
                      className="w-4 h-4 rounded border-gray-600 text-orange-600 focus:ring-orange-500 focus:ring-offset-0 bg-[#1A1A1A]"
                    />
                    <span className="text-sm text-gray-300">
                      Feature this service (show prominently in catalog)
                    </span>
                  </label>
                </div>
              </div>
            </div>
          )}
          
          {/* Pricing Tab */}
          {activeTab === 'pricing' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Pricing Type *
                  </label>
                  <select
                    value={formData.pricing_type}
                    onChange={(e) => setFormData({ ...formData, pricing_type: e.target.value as any })}
                    className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                  >
                    <option value="fixed">Fixed Price</option>
                    <option value="hourly">Hourly Rate</option>
                    <option value="per_sqft">Per Square Foot</option>
                    <option value="custom">Custom Quote</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Base Price * {formData.pricing_type !== 'fixed' && `(per ${formData.pricing_type === 'hourly' ? 'hour' : 'sq ft'})`}
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                    <input
                      type="number"
                      value={formData.base_price}
                      onChange={(e) => setFormData({ ...formData, base_price: parseFloat(e.target.value) || 0 })}
                      className="w-full pl-8 pr-4 py-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                      step="0.01"
                      min="0"
                    />
                  </div>
                </div>
                
                {formData.pricing_type === 'custom' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">
                        Min Price Range
                      </label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                        <input
                          type="number"
                          value={formData.min_price || ''}
                          onChange={(e) => setFormData({ ...formData, min_price: parseFloat(e.target.value) || undefined })}
                          className="w-full pl-8 pr-4 py-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                          step="0.01"
                          min="0"
                        />
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">
                        Max Price Range
                      </label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                        <input
                          type="number"
                          value={formData.max_price || ''}
                          onChange={(e) => setFormData({ ...formData, max_price: parseFloat(e.target.value) || undefined })}
                          className="w-full pl-8 pr-4 py-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                          step="0.01"
                          min="0"
                        />
                      </div>
                    </div>
                  </>
                )}
                
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Internal Cost
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                    <input
                      type="number"
                      value={formData.cost}
                      onChange={(e) => setFormData({ ...formData, cost: parseFloat(e.target.value) || 0 })}
                      className="w-full pl-8 pr-4 py-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                      step="0.01"
                      min="0"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">For profit margin calculation</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Profit Margin
                  </label>
                  <div className="px-4 py-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg">
                    <p className="text-2xl font-bold text-green-400">
                      {calculateProfitMargin()}%
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Profit: ${(formData.base_price - formData.cost).toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Time Estimates */}
              <div className="pt-6 border-t border-[#2A2A2A]">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-blue-400" />
                  Time Estimates
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Min Duration
                    </label>
                    <input
                      type="number"
                      value={formData.duration_min}
                      onChange={(e) => setFormData({ ...formData, duration_min: parseFloat(e.target.value) || 0 })}
                      className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                      min="0"
                      step="0.5"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Max Duration
                    </label>
                    <input
                      type="number"
                      value={formData.duration_max}
                      onChange={(e) => setFormData({ ...formData, duration_max: parseFloat(e.target.value) || 0 })}
                      className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                      min="0"
                      step="0.5"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Unit
                    </label>
                    <select
                      value={formData.duration_unit}
                      onChange={(e) => setFormData({ ...formData, duration_unit: e.target.value as any })}
                      className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                    >
                      <option value="hours">Hours</option>
                      <option value="days">Days</option>
                      <option value="weeks">Weeks</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Requirements Tab */}
          {activeTab === 'requirements' && (
            <div className="space-y-6">
              {/* Skills */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Wrench className="w-5 h-5 text-purple-400" />
                  Required Skills
                </h3>
                <div className="flex items-center gap-2 mb-3">
                  <input
                    type="text"
                    value={newSkill}
                    onChange={(e) => setNewSkill(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addSkill()}
                    className="flex-1 px-4 py-2 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                    placeholder="Add required skill..."
                  />
                  <button
                    onClick={addSkill}
                    className="px-4 py-2 bg-orange-600/20 hover:bg-orange-600/30 text-orange-400 rounded-lg transition border border-orange-500/20"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {formData.required_skills.map((skill, index) => (
                    <div key={index} className="px-3 py-1.5 bg-purple-600/20 text-purple-400 rounded-lg text-sm flex items-center gap-2 border border-purple-500/20">
                      {skill}
                      <button onClick={() => removeSkill(skill)}>
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Certifications */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Award className="w-5 h-5 text-yellow-400" />
                  Required Certifications
                </h3>
                <div className="flex items-center gap-2 mb-3">
                  <input
                    type="text"
                    value={newCert}
                    onChange={(e) => setNewCert(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addCertification()}
                    className="flex-1 px-4 py-2 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                    placeholder="Add required certification..."
                  />
                  <button
                    onClick={addCertification}
                    className="px-4 py-2 bg-orange-600/20 hover:bg-orange-600/30 text-orange-400 rounded-lg transition border border-orange-500/20"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {formData.required_certifications.map((cert, index) => (
                    <div key={index} className="px-3 py-1.5 bg-yellow-600/20 text-yellow-400 rounded-lg text-sm flex items-center gap-2 border border-yellow-500/20">
                      {cert}
                      <button onClick={() => removeCertification(cert)}>
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Equipment */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Briefcase className="w-5 h-5 text-green-400" />
                  Required Equipment
                </h3>
                <div className="flex items-center gap-2 mb-3">
                  <input
                    type="text"
                    value={newEquipment}
                    onChange={(e) => setNewEquipment(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addEquipment()}
                    className="flex-1 px-4 py-2 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                    placeholder="Add required equipment..."
                  />
                  <button
                    onClick={addEquipment}
                    className="px-4 py-2 bg-orange-600/20 hover:bg-orange-600/30 text-orange-400 rounded-lg transition border border-orange-500/20"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {formData.required_equipment.map((equipment, index) => (
                    <div key={index} className="px-3 py-1.5 bg-green-600/20 text-green-400 rounded-lg text-sm flex items-center gap-2 border border-green-500/20">
                      {equipment}
                      <button onClick={() => removeEquipment(equipment)}>
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Team Size */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-400" />
                  Team Size Requirements
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Minimum Team Size
                    </label>
                    <input
                      type="number"
                      value={formData.team_size_min}
                      onChange={(e) => setFormData({ ...formData, team_size_min: parseInt(e.target.value) || 1 })}
                      className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                      min="1"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Maximum Team Size
                    </label>
                    <input
                      type="number"
                      value={formData.team_size_max}
                      onChange={(e) => setFormData({ ...formData, team_size_max: parseInt(e.target.value) || 1 })}
                      className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                      min="1"
                    />
                  </div>
                </div>
              </div>
              
              {/* Business Requirements */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-cyan-400" />
                  Business Requirements
                </h3>
                <div className="space-y-3">
                  <label className="flex items-center gap-3 p-3 bg-[#1A1A1A] rounded-lg border border-[#2A2A2A] cursor-pointer hover:border-orange-500/30 transition">
                    <input
                      type="checkbox"
                      checked={formData.requires_site_visit}
                      onChange={(e) => setFormData({ ...formData, requires_site_visit: e.target.checked })}
                      className="w-4 h-4 rounded border-gray-600 text-orange-600 focus:ring-orange-500 focus:ring-offset-0"
                    />
                    <span className="text-white">Requires Site Visit/Assessment</span>
                  </label>
                  
                  <label className="flex items-center gap-3 p-3 bg-[#1A1A1A] rounded-lg border border-[#2A2A2A] cursor-pointer hover:border-orange-500/30 transition">
                    <input
                      type="checkbox"
                      checked={formData.requires_permit}
                      onChange={(e) => setFormData({ ...formData, requires_permit: e.target.checked })}
                      className="w-4 h-4 rounded border-gray-600 text-orange-600 focus:ring-orange-500 focus:ring-offset-0"
                    />
                    <span className="text-white">Requires Permit</span>
                  </label>
                  
                  <label className="flex items-center gap-3 p-3 bg-[#1A1A1A] rounded-lg border border-[#2A2A2A] cursor-pointer hover:border-orange-500/30 transition">
                    <input
                      type="checkbox"
                      checked={formData.requires_inspection}
                      onChange={(e) => setFormData({ ...formData, requires_inspection: e.target.checked })}
                      className="w-4 h-4 rounded border-gray-600 text-orange-600 focus:ring-orange-500 focus:ring-offset-0"
                    />
                    <span className="text-white">Requires Inspection</span>
                  </label>
                </div>
                
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Minimum Notice (Days)
                  </label>
                  <input
                    type="number"
                    value={formData.min_notice_days}
                    onChange={(e) => setFormData({ ...formData, min_notice_days: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                    min="0"
                  />
                  <p className="text-xs text-gray-500 mt-1">Minimum days notice required before service can be scheduled</p>
                </div>
              </div>
            </div>
          )}
          
          {/* Variants & Add-ons Tab */}
          {activeTab === 'variants' && (
            <div className="space-y-6">
              {/* Service Variants */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                      <Zap className="w-5 h-5 text-orange-400" />
                      Service Variants
                    </h3>
                    <p className="text-sm text-gray-400 mt-1">Different options for this service (e.g., Basic, Standard, Premium)</p>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.has_variants}
                      onChange={(e) => setFormData({ ...formData, has_variants: e.target.checked })}
                      className="w-4 h-4 rounded border-gray-600 text-orange-600 focus:ring-orange-500 focus:ring-offset-0"
                    />
                    <span className="text-sm text-gray-300">Enable Variants</span>
                  </label>
                </div>
                
                {formData.has_variants && (
                  <div className="space-y-3">
                    {formData.variants.map((variant, index) => (
                      <div key={variant.id} className="p-4 bg-[#1A1A1A] rounded-lg border border-[#2A2A2A]">
                        <div className="flex items-start justify-between mb-3">
                          <span className="text-sm font-medium text-gray-400">Variant #{index + 1}</span>
                          <button
                            onClick={() => removeVariant(variant.id)}
                            className="p-1 hover:bg-red-600/20 text-red-400 rounded transition"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div>
                            <input
                              type="text"
                              value={variant.name}
                              onChange={(e) => updateVariant(variant.id, { name: e.target.value })}
                              className="w-full px-3 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                              placeholder="Variant name"
                            />
                          </div>
                          <div>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                              <input
                                type="number"
                                value={variant.price}
                                onChange={(e) => updateVariant(variant.id, { price: parseFloat(e.target.value) || 0 })}
                                className="w-full pl-7 pr-3 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                                step="0.01"
                                min="0"
                              />
                            </div>
                          </div>
                          <div>
                            <input
                              type="text"
                              value={variant.description}
                              onChange={(e) => updateVariant(variant.id, { description: e.target.value })}
                              className="w-full px-3 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                              placeholder="Description"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                    <button
                      onClick={addVariant}
                      className="w-full px-4 py-3 bg-orange-600/10 hover:bg-orange-600/20 text-orange-400 rounded-lg transition border border-orange-500/20 flex items-center justify-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      Add Variant
                    </button>
                  </div>
                )}
              </div>
              
              {/* Add-ons */}
              <div className="pt-6 border-t border-[#2A2A2A]">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                      <Plus className="w-5 h-5 text-green-400" />
                      Service Add-ons
                    </h3>
                    <p className="text-sm text-gray-400 mt-1">Optional extras that can be added to this service</p>
                  </div>
                </div>
                
                <div className="space-y-3">
                  {formData.addons.map((addon, index) => (
                    <div key={addon.id} className="p-4 bg-[#1A1A1A] rounded-lg border border-[#2A2A2A]">
                      <div className="flex items-start justify-between mb-3">
                        <span className="text-sm font-medium text-gray-400">Add-on #{index + 1}</span>
                        <button
                          onClick={() => removeAddon(addon.id)}
                          className="p-1 hover:bg-red-600/20 text-red-400 rounded transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div>
                          <input
                            type="text"
                            value={addon.name}
                            onChange={(e) => updateAddon(addon.id, { name: e.target.value })}
                            className="w-full px-3 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                            placeholder="Add-on name"
                          />
                        </div>
                        <div>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                            <input
                              type="number"
                              value={addon.price}
                              onChange={(e) => updateAddon(addon.id, { price: parseFloat(e.target.value) || 0 })}
                              className="w-full pl-7 pr-3 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                              step="0.01"
                              min="0"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={addon.optional}
                              onChange={(e) => updateAddon(addon.id, { optional: e.target.checked })}
                              className="w-4 h-4 rounded border-gray-600 text-orange-600 focus:ring-orange-500 focus:ring-offset-0"
                            />
                            <span className="text-sm text-gray-300">Optional</span>
                          </label>
                        </div>
                      </div>
                    </div>
                  ))}
                  <button
                    onClick={addAddon}
                    className="w-full px-4 py-3 bg-green-600/10 hover:bg-green-600/20 text-green-400 rounded-lg transition border border-green-500/20 flex items-center justify-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Add Add-on
                  </button>
                </div>
              </div>
            </div>
          )}
          
          {/* Terms Tab */}
          {activeTab === 'terms' && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Terms & Conditions
                </label>
                <textarea
                  value={formData.terms_conditions}
                  onChange={(e) => setFormData({ ...formData, terms_conditions: e.target.value })}
                  rows={8}
                  className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 font-mono text-sm"
                  placeholder="Enter terms and conditions for this service..."
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Warranty Period (Months)
                  </label>
                  <input
                    type="number"
                    value={formData.warranty_period}
                    onChange={(e) => setFormData({ ...formData, warranty_period: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                    min="0"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Warranty Description
                </label>
                <textarea
                  value={formData.warranty_description}
                  onChange={(e) => setFormData({ ...formData, warranty_description: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                  placeholder="Describe what the warranty covers..."
                />
              </div>
            </div>
          )}
          
          {/* Advanced Tab */}
          {activeTab === 'advanced' && (
            <div className="space-y-6">
              {/* Tags */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Tag className="w-5 h-5 text-pink-400" />
                  Tags
                </h3>
                <div className="flex items-center gap-2 mb-3">
                  <input
                    type="text"
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addTag()}
                    className="flex-1 px-4 py-2 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                    placeholder="Add tag..."
                  />
                  <button
                    onClick={addTag}
                    className="px-4 py-2 bg-orange-600/20 hover:bg-orange-600/30 text-orange-400 rounded-lg transition border border-orange-500/20"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {formData.tags.map((tag, index) => (
                    <div key={index} className="px-3 py-1.5 bg-pink-600/20 text-pink-400 rounded-lg text-sm flex items-center gap-2 border border-pink-500/20">
                      #{tag}
                      <button onClick={() => removeTag(tag)}>
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Internal Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Internal Notes
                </label>
                <textarea
                  value={formData.internal_notes}
                  onChange={(e) => setFormData({ ...formData, internal_notes: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                  placeholder="Internal notes (not visible to customers)..."
                />
              </div>
              
              {/* Integrations */}
              <div className="pt-6 border-t border-[#2A2A2A]">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Settings className="w-5 h-5 text-cyan-400" />
                  External Integrations
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      QuickBooks Item ID
                    </label>
                    <input
                      type="text"
                      value={formData.quickbooks_item_id || ''}
                      onChange={(e) => setFormData({ ...formData, quickbooks_item_id: e.target.value })}
                      className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                      placeholder="QB Item ID"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Stripe Product ID
                    </label>
                    <input
                      type="text"
                      value={formData.stripe_product_id || ''}
                      onChange={(e) => setFormData({ ...formData, stripe_product_id: e.target.value })}
                      className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                      placeholder="prod_..."
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="border-t border-[#2A2A2A] p-6 bg-[#0A0A0A]">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-400">
              {mode === 'create' ? 'All fields marked with * are required' : 'Updating existing service'}
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={onClose}
                disabled={isSaving}
                className="px-6 py-3 bg-[#1A1A1A] hover:bg-[#2A2A2A] text-white rounded-xl font-semibold transition border border-[#2A2A2A]"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="px-6 py-3 bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 text-white rounded-xl font-semibold transition flex items-center gap-2 shadow-lg shadow-orange-500/20"
              >
                {isSaving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    {mode === 'create' ? 'Create Service' : 'Update Service'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
