import { useState, useEffect } from 'react';
import {
  X, Package, DollarSign, Calendar, Users, Plus, Trash2, Check,
  AlertCircle, Wrench, Clock, Settings, Save, Edit, Copy,
  Eye, EyeOff, Building, Home, Video, Image as ImageIcon,
  Link as LinkIcon, Upload, Play, Share2, FileText, Zap,
  CheckCircle, Target, TrendingUp, Star, Shield
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { TextArea } from './ui/input/TextArea';

interface MaintenancePlan {
  id: string;
  name: string;
  type: string;
  description: string;
  targetType: 'condo_association' | 'landlord' | 'both';
  status: string;
  
  // Pricing
  monthlyPrice: number;
  annualPrice: number;
  quarterlyPrice: number;
  setupFee: number;
  discountPercentage: number;
  
  // Services
  includedServices: string[];
  serviceFrequency: string;
  responseTime: string;
  
  // Scheduling
  inspectionSchedule: string;
  maintenanceSchedule: string;
  
  // Features
  features: string[];
  benefits: string[];
  limitations: string[];
  
  // Media Attachments
  attachedReels: AttachedMedia[];
  attachedSocialPosts: AttachedMedia[];
  
  // Display
  colorTheme: string;
  icon: string;
  isPopular: boolean;
  isFeatured: boolean;
  isVisible: boolean;
  priority: number;
  
  // Limits
  maxClients: number;
  minUnits: number;
  maxUnits: number;
  
  // Coverage
  coverageArea: string[];
  propertyTypes: string[];
  
  // Terms
  terms: string;
  cancellationPolicy: string;
  
  // Tracking
  activeSubscriptions: number;
  submittedBy: string;
  submittedAt: string;
}

interface AttachedMedia {
  id: string;
  type: 'reel' | 'social_post';
  title: string;
  url: string;
  thumbnail: string;
  description: string;
}

interface MaintenancePlanEditorProps {
  isOpen: boolean;
  onClose: () => void;
  plan: MaintenancePlan | null;
  mode: 'create' | 'edit';
  onSave: (plan: MaintenancePlan) => void;
}

export default function MaintenancePlanEditor({
  isOpen,
  onClose,
  plan,
  mode,
  onSave
}: MaintenancePlanEditorProps) {
  const [formData, setFormData] = useState<MaintenancePlan>({
    id: '',
    name: '',
    type: 'monthly',
    description: '',
    targetType: 'both',
    status: 'pending',
    monthlyPrice: 0,
    annualPrice: 0,
    quarterlyPrice: 0,
    setupFee: 0,
    discountPercentage: 0,
    includedServices: [],
    serviceFrequency: 'monthly',
    responseTime: '24 hours',
    inspectionSchedule: 'quarterly',
    maintenanceSchedule: 'as-needed',
    features: [],
    benefits: [],
    limitations: [],
    attachedReels: [],
    attachedSocialPosts: [],
    colorTheme: 'cyan',
    icon: 'wrench',
    isPopular: false,
    isFeatured: false,
    isVisible: true,
    priority: 1,
    maxClients: 0,
    minUnits: 0,
    maxUnits: 0,
    coverageArea: [],
    propertyTypes: [],
    terms: '',
    cancellationPolicy: '',
    activeSubscriptions: 0,
    submittedBy: 'Admin',
    submittedAt: new Date().toISOString().split('T')[0]
  });

  const [activeTab, setActiveTab] = useState<'basic' | 'services' | 'pricing' | 'features' | 'media' | 'advanced'>('basic');
  const [newService, setNewService] = useState('');
  const [newFeature, setNewFeature] = useState('');
  const [newBenefit, setNewBenefit] = useState('');
  const [newLimitation, setNewLimitation] = useState('');
  const [newPropertyType, setNewPropertyType] = useState('');
  const [newCoverageArea, setNewCoverageArea] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showMediaPicker, setShowMediaPicker] = useState<'reel' | 'social' | null>(null);

  // Mock available media
  const availableReels = [
    {
      id: 'REEL-001',
      type: 'reel' as const,
      title: 'Preventive Maintenance Tips',
      url: '/video/maintenance-tips.mp4',
      thumbnail: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=400',
      description: 'Essential maintenance tips for property managers'
    },
    {
      id: 'REEL-002',
      type: 'reel' as const,
      title: 'HVAC System Inspection',
      url: '/video/hvac-inspection.mp4',
      thumbnail: 'https://images.unsplash.com/photo-1621905251918-48416bd8575a?w=400',
      description: 'Professional HVAC inspection process'
    },
    {
      id: 'REEL-003',
      type: 'reel' as const,
      title: 'Plumbing Maintenance Guide',
      url: '/video/plumbing-guide.mp4',
      thumbnail: 'https://images.unsplash.com/photo-1585704032915-c3400ca199e7?w=400',
      description: 'Complete plumbing maintenance walkthrough'
    }
  ];

  const availableSocialPosts = [
    {
      id: 'POST-001',
      type: 'social_post' as const,
      title: 'Monthly Maintenance Checklist',
      url: '/post/monthly-checklist',
      thumbnail: 'https://images.unsplash.com/photo-1484480974693-6ca0a78fb36b?w=400',
      description: 'Complete checklist for property managers'
    },
    {
      id: 'POST-002',
      type: 'social_post' as const,
      title: 'Winter Preparation Guide',
      url: '/post/winter-prep',
      thumbnail: 'https://images.unsplash.com/photo-1477346611705-65d1883cee1e?w=400',
      description: 'Prepare your property for winter'
    },
    {
      id: 'POST-003',
      type: 'social_post' as const,
      title: 'Cost-Saving Maintenance Tips',
      url: '/post/cost-saving',
      thumbnail: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=400',
      description: 'Save money with preventive maintenance'
    }
  ];

  useEffect(() => {
    if (plan && mode === 'edit') {
      setFormData({
        ...plan,
        quarterlyPrice: plan.quarterlyPrice || plan.monthlyPrice * 3 * 0.95,
        annualPrice: plan.annualPrice || plan.monthlyPrice * 12 * 0.9,
        attachedReels: plan.attachedReels || [],
        attachedSocialPosts: plan.attachedSocialPosts || []
      });
    }
  }, [plan, mode]);

  if (!isOpen) return null;

  const handleInputChange = (field: keyof MaintenancePlan, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleAddService = () => {
    if (newService.trim()) {
      setFormData(prev => ({
        ...prev,
        includedServices: [...prev.includedServices, newService.trim()]
      }));
      setNewService('');
    }
  };

  const handleRemoveService = (index: number) => {
    setFormData(prev => ({
      ...prev,
      includedServices: prev.includedServices.filter((_, i) => i !== index)
    }));
  };

  const handleAddFeature = () => {
    if (newFeature.trim()) {
      setFormData(prev => ({
        ...prev,
        features: [...prev.features, newFeature.trim()]
      }));
      setNewFeature('');
    }
  };

  const handleRemoveFeature = (index: number) => {
    setFormData(prev => ({
      ...prev,
      features: prev.features.filter((_, i) => i !== index)
    }));
  };

  const handleAddBenefit = () => {
    if (newBenefit.trim()) {
      setFormData(prev => ({
        ...prev,
        benefits: [...prev.benefits, newBenefit.trim()]
      }));
      setNewBenefit('');
    }
  };

  const handleRemoveBenefit = (index: number) => {
    setFormData(prev => ({
      ...prev,
      benefits: prev.benefits.filter((_, i) => i !== index)
    }));
  };

  const handleAddLimitation = () => {
    if (newLimitation.trim()) {
      setFormData(prev => ({
        ...prev,
        limitations: [...prev.limitations, newLimitation.trim()]
      }));
      setNewLimitation('');
    }
  };

  const handleRemoveLimitation = (index: number) => {
    setFormData(prev => ({
      ...prev,
      limitations: prev.limitations.filter((_, i) => i !== index)
    }));
  };

  const handleAddPropertyType = () => {
    if (newPropertyType.trim()) {
      setFormData(prev => ({
        ...prev,
        propertyTypes: [...prev.propertyTypes, newPropertyType.trim()]
      }));
      setNewPropertyType('');
    }
  };

  const handleRemovePropertyType = (index: number) => {
    setFormData(prev => ({
      ...prev,
      propertyTypes: prev.propertyTypes.filter((_, i) => i !== index)
    }));
  };

  const handleAddCoverageArea = () => {
    if (newCoverageArea.trim()) {
      setFormData(prev => ({
        ...prev,
        coverageArea: [...prev.coverageArea, newCoverageArea.trim()]
      }));
      setNewCoverageArea('');
    }
  };

  const handleRemoveCoverageArea = (index: number) => {
    setFormData(prev => ({
      ...prev,
      coverageArea: prev.coverageArea.filter((_, i) => i !== index)
    }));
  };

  const handleAttachMedia = (media: AttachedMedia) => {
    if (media.type === 'reel') {
      setFormData(prev => ({
        ...prev,
        attachedReels: [...prev.attachedReels, media]
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        attachedSocialPosts: [...prev.attachedSocialPosts, media]
      }));
    }
    setShowMediaPicker(null);
    toast.success(`${media.type === 'reel' ? 'Reel' : 'Social post'} attached successfully!`);
  };

  const handleRemoveMedia = (type: 'reel' | 'social', index: number) => {
    if (type === 'reel') {
      setFormData(prev => ({
        ...prev,
        attachedReels: prev.attachedReels.filter((_, i) => i !== index)
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        attachedSocialPosts: prev.attachedSocialPosts.filter((_, i) => i !== index)
      }));
    }
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      toast.error('Plan name is required');
      return false;
    }
    if (formData.monthlyPrice <= 0) {
      toast.error('Monthly price must be greater than 0');
      return false;
    }
    if (formData.includedServices.length === 0) {
      toast.error('Add at least one included service');
      return false;
    }
    if (!formData.description.trim()) {
      toast.error('Description is required');
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setIsSaving(true);

    try {
      // Calculate pricing if not set
      if (!formData.quarterlyPrice || formData.quarterlyPrice === 0) {
        formData.quarterlyPrice = formData.monthlyPrice * 3 * 0.95; // 5% discount
      }
      if (!formData.annualPrice || formData.annualPrice === 0) {
        formData.annualPrice = formData.monthlyPrice * 12 * 0.9; // 10% discount
      }

      await new Promise(resolve => setTimeout(resolve, 1000));

      onSave(formData);
      toast.success(`Maintenance plan ${mode === 'create' ? 'created' : 'updated'} successfully!`);
      onClose();
    } catch (error) {
      toast.error('Failed to save maintenance plan');
    } finally {
      setIsSaving(false);
    }
  };

  const colorThemes = [
    { value: 'cyan', label: 'Cyan', color: 'from-cyan-600 to-cyan-700' },
    { value: 'blue', label: 'Blue', color: 'from-blue-600 to-blue-700' },
    { value: 'green', label: 'Green', color: 'from-green-600 to-green-700' },
    { value: 'orange', label: 'Orange', color: 'from-orange-600 to-orange-700' },
    { value: 'purple', label: 'Purple', color: 'from-purple-600 to-purple-700' },
    { value: 'teal', label: 'Teal', color: 'from-teal-600 to-teal-700' }
  ];

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-[#1A1A1A] rounded-3xl border border-[#2A2A2A] max-w-6xl w-full my-8">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-cyan-600 to-cyan-700 p-6 rounded-t-3xl z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-sm">
                <Package className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">
                  {mode === 'create' ? 'Create New' : 'Edit'} Maintenance Plan
                </h2>
                <p className="text-cyan-100 text-sm">
                  {mode === 'create' ? 'For condo associations & landlords' : `Editing: ${plan?.name}`}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-lg transition"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-[#2A2A2A] bg-[#0A0A0A] sticky top-[88px] z-10">
          <div className="flex gap-1 p-2 overflow-x-auto">
            {[
              { id: 'basic' as const, label: 'Basic Info', icon: FileText },
              { id: 'services' as const, label: 'Services', icon: Wrench },
              { id: 'pricing' as const, label: 'Pricing', icon: DollarSign },
              { id: 'features' as const, label: 'Features', icon: Zap },
              { id: 'media' as const, label: 'Media', icon: Video },
              { id: 'advanced' as const, label: 'Advanced', icon: Settings }
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'bg-cyan-600 text-white'
                      : 'text-gray-400 hover:bg-[#1A1A1A]'
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
        <div className="p-6 max-h-[600px] overflow-y-auto">
          {/* Basic Info Tab */}
          {activeTab === 'basic' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                {/* Plan Name */}
                <div>
                  <label className="block text-sm font-semibold text-white mb-2">
                    Plan Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    placeholder="Premium Maintenance Plan"
                    className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white placeholder-gray-500 focus:border-cyan-500 focus:outline-none transition"
                  />
                </div>

                {/* Target Type */}
                <div>
                  <label className="block text-sm font-semibold text-white mb-2">
                    Target Audience *
                  </label>
                  <select
                    value={formData.targetType}
                    onChange={(e) => handleInputChange('targetType', e.target.value)}
                    className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white focus:border-cyan-500 focus:outline-none transition"
                  >
                    <option value="both">Both (Condo Associations & Landlords)</option>
                    <option value="condo_association">Condo Associations Only</option>
                    <option value="landlord">Landlords Only</option>
                  </select>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-semibold text-white mb-2">
                  Description *
                </label>
                <TextArea
                  value={formData.description}
                  onChange={(value) => handleInputChange('description', value)}
                  placeholder="Comprehensive maintenance plan designed for..."
                  rows={3}
                />
              </div>

              {/* Property Details */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-white mb-2">
                    Minimum Units
                  </label>
                  <div className="relative">
                    <Building className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                    <input
                      type="number"
                      value={formData.minUnits}
                      onChange={(e) => handleInputChange('minUnits', parseInt(e.target.value))}
                      min="0"
                      className="w-full pl-12 pr-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white focus:border-cyan-500 focus:outline-none transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-white mb-2">
                    Maximum Units (0 = unlimited)
                  </label>
                  <div className="relative">
                    <Building className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                    <input
                      type="number"
                      value={formData.maxUnits}
                      onChange={(e) => handleInputChange('maxUnits', parseInt(e.target.value))}
                      min="0"
                      className="w-full pl-12 pr-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white focus:border-cyan-500 focus:outline-none transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-white mb-2">
                    Max Clients (0 = unlimited)
                  </label>
                  <div className="relative">
                    <Users className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                    <input
                      type="number"
                      value={formData.maxClients}
                      onChange={(e) => handleInputChange('maxClients', parseInt(e.target.value))}
                      min="0"
                      className="w-full pl-12 pr-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white focus:border-cyan-500 focus:outline-none transition"
                    />
                  </div>
                </div>
              </div>

              {/* Property Types */}
              <div>
                <label className="block text-sm font-semibold text-white mb-2">
                  Property Types Covered
                </label>
                <div className="flex gap-2 mb-3">
                  <input
                    type="text"
                    value={newPropertyType}
                    onChange={(e) => setNewPropertyType(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddPropertyType()}
                    placeholder="e.g., High-rise, Low-rise, Townhomes"
                    className="flex-1 px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white placeholder-gray-500 focus:border-cyan-500 focus:outline-none transition"
                  />
                  <button
                    onClick={handleAddPropertyType}
                    className="px-4 py-3 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl transition flex items-center gap-2"
                  >
                    <Plus className="w-5 h-5" />
                    Add
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {formData.propertyTypes.map((type, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-cyan-500/10 text-cyan-400 rounded-lg text-sm flex items-center gap-2 border border-cyan-500/20"
                    >
                      {type}
                      <button
                        onClick={() => handleRemovePropertyType(index)}
                        className="hover:text-cyan-300"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              {/* Coverage Areas */}
              <div>
                <label className="block text-sm font-semibold text-white mb-2">
                  Coverage Areas
                </label>
                <div className="flex gap-2 mb-3">
                  <input
                    type="text"
                    value={newCoverageArea}
                    onChange={(e) => setNewCoverageArea(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddCoverageArea()}
                    placeholder="e.g., Downtown Miami, Brickell, Coral Gables"
                    className="flex-1 px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white placeholder-gray-500 focus:border-cyan-500 focus:outline-none transition"
                  />
                  <button
                    onClick={handleAddCoverageArea}
                    className="px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl transition flex items-center gap-2"
                  >
                    <Plus className="w-5 h-5" />
                    Add
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {formData.coverageArea.map((area, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-green-500/10 text-green-400 rounded-lg text-sm flex items-center gap-2 border border-green-500/20"
                    >
                      {area}
                      <button
                        onClick={() => handleRemoveCoverageArea(index)}
                        className="hover:text-green-300"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              {/* Color Theme & Toggles */}
              <div className="grid grid-cols-2 gap-4">
                {/* Color Theme */}
                <div>
                  <label className="block text-sm font-semibold text-white mb-2">
                    Color Theme
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {colorThemes.map((theme) => (
                      <button
                        key={theme.value}
                        onClick={() => handleInputChange('colorTheme', theme.value)}
                        className={`p-3 rounded-xl border-2 transition ${
                          formData.colorTheme === theme.value
                            ? 'border-white'
                            : 'border-[#2A2A2A] hover:border-[#3A3A3A]'
                        }`}
                      >
                        <div className={`w-full h-6 rounded-lg bg-gradient-to-r ${theme.color}`} />
                        <p className="text-xs text-gray-400 mt-1 text-center">{theme.label}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Toggles */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-[#0A0A0A] rounded-xl border border-[#2A2A2A]">
                    <div className="flex items-center gap-2">
                      <Star className="w-4 h-4 text-yellow-400" />
                      <span className="text-sm font-semibold text-white">Mark as Popular</span>
                    </div>
                    <button
                      onClick={() => handleInputChange('isPopular', !formData.isPopular)}
                      className={`w-11 h-6 rounded-full transition ${
                        formData.isPopular ? 'bg-yellow-500' : 'bg-gray-600'
                      }`}
                    >
                      <div className={`w-5 h-5 rounded-full bg-white transition-transform ${
                        formData.isPopular ? 'translate-x-5' : 'translate-x-0.5'
                      }`} />
                    </button>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-[#0A0A0A] rounded-xl border border-[#2A2A2A]">
                    <div className="flex items-center gap-2">
                      <Target className="w-4 h-4 text-orange-400" />
                      <span className="text-sm font-semibold text-white">Featured Plan</span>
                    </div>
                    <button
                      onClick={() => handleInputChange('isFeatured', !formData.isFeatured)}
                      className={`w-11 h-6 rounded-full transition ${
                        formData.isFeatured ? 'bg-orange-500' : 'bg-gray-600'
                      }`}
                    >
                      <div className={`w-5 h-5 rounded-full bg-white transition-transform ${
                        formData.isFeatured ? 'translate-x-5' : 'translate-x-0.5'
                      }`} />
                    </button>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-[#0A0A0A] rounded-xl border border-[#2A2A2A]">
                    <div className="flex items-center gap-2">
                      {formData.isVisible ? <Eye className="w-4 h-4 text-green-400" /> : <EyeOff className="w-4 h-4 text-gray-400" />}
                      <span className="text-sm font-semibold text-white">Visible to Customers</span>
                    </div>
                    <button
                      onClick={() => handleInputChange('isVisible', !formData.isVisible)}
                      className={`w-11 h-6 rounded-full transition ${
                        formData.isVisible ? 'bg-green-500' : 'bg-gray-600'
                      }`}
                    >
                      <div className={`w-5 h-5 rounded-full bg-white transition-transform ${
                        formData.isVisible ? 'translate-x-5' : 'translate-x-0.5'
                      }`} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Services Tab */}
          {activeTab === 'services' && (
            <div className="space-y-6">
              {/* Included Services */}
              <div>
                <label className="block text-sm font-semibold text-white mb-2">
                  Included Services *
                </label>
                <div className="flex gap-2 mb-3">
                  <input
                    type="text"
                    value={newService}
                    onChange={(e) => setNewService(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddService()}
                    placeholder="e.g., HVAC inspection, Plumbing check, Electrical audit"
                    className="flex-1 px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white placeholder-gray-500 focus:border-cyan-500 focus:outline-none transition"
                  />
                  <button
                    onClick={handleAddService}
                    className="px-4 py-3 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl transition flex items-center gap-2"
                  >
                    <Plus className="w-5 h-5" />
                    Add
                  </button>
                </div>
                <div className="space-y-2">
                  {formData.includedServices.map((service, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-[#0A0A0A] rounded-lg border border-[#2A2A2A]"
                    >
                      <div className="flex items-center gap-3">
                        <Wrench className="w-4 h-4 text-cyan-400" />
                        <span className="text-gray-300">{service}</span>
                      </div>
                      <button
                        onClick={() => handleRemoveService(index)}
                        className="p-1 hover:bg-red-500/20 rounded transition"
                      >
                        <Trash2 className="w-4 h-4 text-red-400" />
                      </button>
                    </div>
                  ))}
                  {formData.includedServices.length === 0 && (
                    <p className="text-sm text-gray-500 text-center py-4">No services added yet</p>
                  )}
                </div>
              </div>

              {/* Service Schedule */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-white mb-2">
                    Service Frequency
                  </label>
                  <select
                    value={formData.serviceFrequency}
                    onChange={(e) => handleInputChange('serviceFrequency', e.target.value)}
                    className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white focus:border-cyan-500 focus:outline-none transition"
                  >
                    <option value="weekly">Weekly</option>
                    <option value="bi-weekly">Bi-weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="semi-annual">Semi-annual</option>
                    <option value="annual">Annual</option>
                    <option value="as-needed">As Needed</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-white mb-2">
                    Response Time
                  </label>
                  <select
                    value={formData.responseTime}
                    onChange={(e) => handleInputChange('responseTime', e.target.value)}
                    className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white focus:border-cyan-500 focus:outline-none transition"
                  >
                    <option value="immediate">Immediate (within 2 hours)</option>
                    <option value="same-day">Same Day (within 8 hours)</option>
                    <option value="24 hours">24 Hours</option>
                    <option value="48 hours">48 Hours</option>
                    <option value="72 hours">72 Hours</option>
                    <option value="1 week">Within 1 Week</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-white mb-2">
                    Inspection Schedule
                  </label>
                  <select
                    value={formData.inspectionSchedule}
                    onChange={(e) => handleInputChange('inspectionSchedule', e.target.value)}
                    className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white focus:border-cyan-500 focus:outline-none transition"
                  >
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="semi-annual">Semi-annual</option>
                    <option value="annual">Annual</option>
                    <option value="custom">Custom Schedule</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-white mb-2">
                    Maintenance Schedule
                  </label>
                  <select
                    value={formData.maintenanceSchedule}
                    onChange={(e) => handleInputChange('maintenanceSchedule', e.target.value)}
                    className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white focus:border-cyan-500 focus:outline-none transition"
                  >
                    <option value="preventive">Preventive (Scheduled)</option>
                    <option value="as-needed">As Needed (On-demand)</option>
                    <option value="seasonal">Seasonal</option>
                    <option value="condition-based">Condition-based</option>
                    <option value="hybrid">Hybrid (Scheduled + On-demand)</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Pricing Tab */}
          {activeTab === 'pricing' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                {/* Monthly Price */}
                <div>
                  <label className="block text-sm font-semibold text-white mb-2">
                    Monthly Price *
                  </label>
                  <div className="relative">
                    <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                    <input
                      type="number"
                      value={formData.monthlyPrice}
                      onChange={(e) => handleInputChange('monthlyPrice', parseFloat(e.target.value))}
                      min="0"
                      step="0.01"
                      className="w-full pl-12 pr-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white placeholder-gray-500 focus:border-cyan-500 focus:outline-none transition"
                    />
                  </div>
                </div>

                {/* Quarterly Price */}
                <div>
                  <label className="block text-sm font-semibold text-white mb-2">
                    Quarterly Price
                  </label>
                  <div className="relative">
                    <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                    <input
                      type="number"
                      value={formData.quarterlyPrice}
                      onChange={(e) => handleInputChange('quarterlyPrice', parseFloat(e.target.value))}
                      min="0"
                      step="0.01"
                      className="w-full pl-12 pr-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white placeholder-gray-500 focus:border-cyan-500 focus:outline-none transition"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Suggested: ${(formData.monthlyPrice * 3 * 0.95).toFixed(2)} (5% discount)
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Annual Price */}
                <div>
                  <label className="block text-sm font-semibold text-white mb-2">
                    Annual Price
                  </label>
                  <div className="relative">
                    <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                    <input
                      type="number"
                      value={formData.annualPrice}
                      onChange={(e) => handleInputChange('annualPrice', parseFloat(e.target.value))}
                      min="0"
                      step="0.01"
                      className="w-full pl-12 pr-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white placeholder-gray-500 focus:border-cyan-500 focus:outline-none transition"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Suggested: ${(formData.monthlyPrice * 12 * 0.9).toFixed(2)} (10% discount)
                  </p>
                </div>

                {/* Setup Fee */}
                <div>
                  <label className="block text-sm font-semibold text-white mb-2">
                    One-Time Setup Fee
                  </label>
                  <div className="relative">
                    <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                    <input
                      type="number"
                      value={formData.setupFee}
                      onChange={(e) => handleInputChange('setupFee', parseFloat(e.target.value))}
                      min="0"
                      step="0.01"
                      className="w-full pl-12 pr-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white placeholder-gray-500 focus:border-cyan-500 focus:outline-none transition"
                    />
                  </div>
                </div>
              </div>

              {/* Discount */}
              <div>
                <label className="block text-sm font-semibold text-white mb-2">
                  Promotional Discount %
                </label>
                <input
                  type="number"
                  value={formData.discountPercentage}
                  onChange={(e) => handleInputChange('discountPercentage', parseFloat(e.target.value))}
                  min="0"
                  max="100"
                  step="1"
                  className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white placeholder-gray-500 focus:border-cyan-500 focus:outline-none transition"
                />
              </div>

              {/* Price Preview */}
              <div className="bg-gradient-to-br from-cyan-600/10 to-cyan-700/10 rounded-2xl border border-cyan-500/30 p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Price Preview</h3>
                <div className="grid grid-cols-4 gap-4">
                  <div className="text-center">
                    <p className="text-sm text-gray-400 mb-1">Monthly</p>
                    <p className="text-3xl font-bold text-cyan-400">
                      ${formData.monthlyPrice.toFixed(2)}
                    </p>
                    <p className="text-sm text-gray-400 mt-1">per month</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-gray-400 mb-1">Quarterly</p>
                    <p className="text-3xl font-bold text-cyan-400">
                      ${(formData.quarterlyPrice || 0).toFixed(2)}
                    </p>
                    <p className="text-sm text-gray-400 mt-1">
                      ${((formData.quarterlyPrice || 0) / 3).toFixed(2)}/mo
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-gray-400 mb-1">Annual</p>
                    <p className="text-3xl font-bold text-cyan-400">
                      ${(formData.annualPrice || 0).toFixed(2)}
                    </p>
                    <p className="text-sm text-gray-400 mt-1">
                      ${((formData.annualPrice || 0) / 12).toFixed(2)}/mo
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-gray-400 mb-1">Setup</p>
                    <p className="text-3xl font-bold text-white">
                      ${(formData.setupFee || 0).toFixed(2)}
                    </p>
                    <p className="text-sm text-gray-400 mt-1">One-time</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Features Tab */}
          {activeTab === 'features' && (
            <div className="space-y-6">
              {/* Features */}
              <div>
                <label className="block text-sm font-semibold text-white mb-2">
                  Plan Features
                </label>
                <div className="flex gap-2 mb-3">
                  <input
                    type="text"
                    value={newFeature}
                    onChange={(e) => setNewFeature(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddFeature()}
                    placeholder="e.g., 24/7 emergency hotline, Priority scheduling"
                    className="flex-1 px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white placeholder-gray-500 focus:border-cyan-500 focus:outline-none transition"
                  />
                  <button
                    onClick={handleAddFeature}
                    className="px-4 py-3 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl transition flex items-center gap-2"
                  >
                    <Plus className="w-5 h-5" />
                    Add
                  </button>
                </div>
                <div className="space-y-2">
                  {formData.features.map((feature, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-[#0A0A0A] rounded-lg border border-[#2A2A2A]"
                    >
                      <div className="flex items-center gap-3">
                        <Check className="w-4 h-4 text-green-400" />
                        <span className="text-gray-300">{feature}</span>
                      </div>
                      <button
                        onClick={() => handleRemoveFeature(index)}
                        className="p-1 hover:bg-red-500/20 rounded transition"
                      >
                        <Trash2 className="w-4 h-4 text-red-400" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Benefits */}
              <div>
                <label className="block text-sm font-semibold text-white mb-2">
                  Benefits
                </label>
                <div className="flex gap-2 mb-3">
                  <input
                    type="text"
                    value={newBenefit}
                    onChange={(e) => setNewBenefit(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddBenefit()}
                    placeholder="e.g., Save up to 30% on repairs"
                    className="flex-1 px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white placeholder-gray-500 focus:border-cyan-500 focus:outline-none transition"
                  />
                  <button
                    onClick={handleAddBenefit}
                    className="px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl transition flex items-center gap-2"
                  >
                    <Plus className="w-5 h-5" />
                    Add
                  </button>
                </div>
                <div className="space-y-2">
                  {formData.benefits.map((benefit, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-[#0A0A0A] rounded-lg border border-[#2A2A2A]"
                    >
                      <div className="flex items-center gap-3">
                        <Zap className="w-4 h-4 text-green-400" />
                        <span className="text-gray-300">{benefit}</span>
                      </div>
                      <button
                        onClick={() => handleRemoveBenefit(index)}
                        className="p-1 hover:bg-red-500/20 rounded transition"
                      >
                        <Trash2 className="w-4 h-4 text-red-400" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Limitations */}
              <div>
                <label className="block text-sm font-semibold text-white mb-2">
                  Limitations
                </label>
                <div className="flex gap-2 mb-3">
                  <input
                    type="text"
                    value={newLimitation}
                    onChange={(e) => setNewLimitation(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddLimitation()}
                    placeholder="e.g., Does not include major renovations"
                    className="flex-1 px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white placeholder-gray-500 focus:border-cyan-500 focus:outline-none transition"
                  />
                  <button
                    onClick={handleAddLimitation}
                    className="px-4 py-3 bg-yellow-600 hover:bg-yellow-700 text-white rounded-xl transition flex items-center gap-2"
                  >
                    <Plus className="w-5 h-5" />
                    Add
                  </button>
                </div>
                <div className="space-y-2">
                  {formData.limitations.map((limitation, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-[#0A0A0A] rounded-lg border border-[#2A2A2A]"
                    >
                      <div className="flex items-center gap-3">
                        <AlertCircle className="w-4 h-4 text-yellow-400" />
                        <span className="text-gray-300">{limitation}</span>
                      </div>
                      <button
                        onClick={() => handleRemoveLimitation(index)}
                        className="p-1 hover:bg-red-500/20 rounded transition"
                      >
                        <Trash2 className="w-4 h-4 text-red-400" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Media Tab */}
          {activeTab === 'media' && (
            <div className="space-y-6">
              {/* Attached Reels */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-semibold text-white">
                    Attached Reels ({formData.attachedReels.length})
                  </label>
                  <button
                    onClick={() => setShowMediaPicker('reel')}
                    className="px-4 py-2 bg-pink-600 hover:bg-pink-700 text-white rounded-lg transition flex items-center gap-2 text-sm"
                  >
                    <Video className="w-4 h-4" />
                    Attach Reel
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {formData.attachedReels.map((reel, index) => (
                    <div
                      key={index}
                      className="relative bg-[#0A0A0A] rounded-xl border border-[#2A2A2A] overflow-hidden group"
                    >
                      <img
                        src={reel.thumbnail}
                        alt={reel.title}
                        className="w-full h-40 object-cover"
                      />
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                        <Play className="w-12 h-12 text-white" />
                      </div>
                      <button
                        onClick={() => handleRemoveMedia('reel', index)}
                        className="absolute top-2 right-2 p-2 bg-red-600 hover:bg-red-700 rounded-lg transition"
                      >
                        <X className="w-4 h-4 text-white" />
                      </button>
                      <div className="p-3">
                        <p className="font-semibold text-white text-sm">{reel.title}</p>
                        <p className="text-xs text-gray-400 mt-1">{reel.description}</p>
                      </div>
                    </div>
                  ))}
                  {formData.attachedReels.length === 0 && (
                    <div className="col-span-2 text-center py-8 text-gray-500">
                      No reels attached yet. Click "Attach Reel" to add promotional videos.
                    </div>
                  )}
                </div>
              </div>

              {/* Attached Social Posts */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-semibold text-white">
                    Attached Social Posts ({formData.attachedSocialPosts.length})
                  </label>
                  <button
                    onClick={() => setShowMediaPicker('social')}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition flex items-center gap-2 text-sm"
                  >
                    <Share2 className="w-4 h-4" />
                    Attach Post
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {formData.attachedSocialPosts.map((post, index) => (
                    <div
                      key={index}
                      className="relative bg-[#0A0A0A] rounded-xl border border-[#2A2A2A] overflow-hidden"
                    >
                      <img
                        src={post.thumbnail}
                        alt={post.title}
                        className="w-full h-40 object-cover"
                      />
                      <button
                        onClick={() => handleRemoveMedia('social', index)}
                        className="absolute top-2 right-2 p-2 bg-red-600 hover:bg-red-700 rounded-lg transition"
                      >
                        <X className="w-4 h-4 text-white" />
                      </button>
                      <div className="p-3">
                        <p className="font-semibold text-white text-sm">{post.title}</p>
                        <p className="text-xs text-gray-400 mt-1">{post.description}</p>
                      </div>
                    </div>
                  ))}
                  {formData.attachedSocialPosts.length === 0 && (
                    <div className="col-span-2 text-center py-8 text-gray-500">
                      No social posts attached yet. Click "Attach Post" to add promotional content.
                    </div>
                  )}
                </div>
              </div>

              {/* Info Box */}
              <div className="bg-blue-600/10 border border-blue-500/30 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-300">
                    <p className="font-semibold mb-1">About Media Attachments:</p>
                    <ul className="list-disc list-inside space-y-1 text-blue-300/80">
                      <li>Attached reels and social posts will be shown to customers viewing this plan</li>
                      <li>Use high-quality, relevant content that showcases your services</li>
                      <li>Content must be approved in the Control Center before attachment</li>
                      <li>Customers can view attached media to learn more about the plan</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Advanced Tab */}
          {activeTab === 'advanced' && (
            <div className="space-y-6">
              {/* Status */}
              <div>
                <label className="block text-sm font-semibold text-white mb-2">
                  Plan Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => handleInputChange('status', e.target.value)}
                  className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white focus:border-cyan-500 focus:outline-none transition"
                >
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="active">Active</option>
                  <option value="expired">Expired</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>

              {/* Terms & Conditions */}
              <div>
                <label className="block text-sm font-semibold text-white mb-2">
                  Terms & Conditions
                </label>
                <TextArea
                  value={formData.terms}
                  onChange={(value) => handleInputChange('terms', value)}
                  placeholder="Enter terms and conditions for this maintenance plan..."
                  rows={6}
                />
              </div>

              {/* Cancellation Policy */}
              <div>
                <label className="block text-sm font-semibold text-white mb-2">
                  Cancellation Policy
                </label>
                <TextArea
                  value={formData.cancellationPolicy}
                  onChange={(value) => handleInputChange('cancellationPolicy', value)}
                  placeholder="Describe the cancellation policy..."
                  rows={4}
                />
              </div>

              {/* Metadata */}
              <div className="bg-cyan-600/10 border border-cyan-500/30 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <Shield className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-cyan-300">
                    <p className="font-semibold mb-1">Plan Information:</p>
                    <ul className="list-disc list-inside space-y-1 text-cyan-300/80">
                      <li>ID: {formData.id || 'Will be generated'}</li>
                      <li>Submitted by: {formData.submittedBy}</li>
                      <li>Submitted on: {formData.submittedAt}</li>
                      <li>Active subscriptions: {formData.activeSubscriptions || 0}</li>
                      <li>Target: {formData.targetType === 'both' ? 'Condo Associations & Landlords' : formData.targetType === 'condo_association' ? 'Condo Associations Only' : 'Landlords Only'}</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-[#2A2A2A] p-6 bg-[#0A0A0A] rounded-b-3xl sticky bottom-0">
          <div className="flex items-center justify-between">
            <button
              onClick={onClose}
              className="px-6 py-3 bg-[#1A1A1A] border border-[#2A2A2A] text-gray-300 rounded-xl hover:bg-[#2A2A2A] transition font-semibold"
            >
              Cancel
            </button>

            <div className="flex gap-3">
              {mode === 'edit' && (
                <button
                  onClick={() => {
                    const newPlan = { ...formData, id: '', name: `${formData.name} (Copy)` };
                    onSave(newPlan);
                    toast.success('Plan duplicated successfully!');
                  }}
                  className="px-6 py-3 bg-blue-600/20 border border-blue-500/30 text-blue-400 rounded-xl hover:bg-blue-600/30 transition font-semibold flex items-center gap-2"
                >
                  <Copy className="w-5 h-5" />
                  Duplicate
                </button>
              )}

              <button
                onClick={handleSave}
                disabled={isSaving}
                className="px-8 py-3 bg-gradient-to-r from-cyan-600 to-cyan-700 text-white rounded-xl hover:from-cyan-700 hover:to-cyan-800 transition font-bold flex items-center gap-2 shadow-lg shadow-cyan-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5" />
                    {mode === 'create' ? 'Create Plan' : 'Save Changes'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Media Picker Modal */}
      {showMediaPicker && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] max-w-4xl w-full max-h-[80vh] overflow-y-auto">
            <div className="sticky top-0 bg-[#1A1A1A] border-b border-[#2A2A2A] p-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">
                Select {showMediaPicker === 'reel' ? 'Reel' : 'Social Post'}
              </h3>
              <button
                onClick={() => setShowMediaPicker(null)}
                className="p-2 hover:bg-[#2A2A2A] rounded-lg transition"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <div className="p-4 grid grid-cols-3 gap-4">
              {(showMediaPicker === 'reel' ? availableReels : availableSocialPosts).map((media) => (
                <button
                  key={media.id}
                  onClick={() => handleAttachMedia(media)}
                  className="bg-[#0A0A0A] rounded-xl border border-[#2A2A2A] overflow-hidden hover:border-cyan-500 transition text-left"
                >
                  <div className="relative">
                    <img
                      src={media.thumbnail}
                      alt={media.title}
                      className="w-full h-40 object-cover"
                    />
                    {showMediaPicker === 'reel' && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Play className="w-12 h-12 text-white opacity-80" />
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    <p className="font-semibold text-white text-sm mb-1">{media.title}</p>
                    <p className="text-xs text-gray-400">{media.description}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
