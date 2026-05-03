import { useState, useEffect } from 'react';
import {
  X, Package, Users, DollarSign, Wrench, Video, FileText,
  Settings, Save, Plus, Trash2, GripVertical, Eye, EyeOff,
  Shield, Lock, AlertCircle, Check, Search, Filter, Grid,
  List, Crown, Target, Calendar, TrendingUp, Briefcase,
  ClipboardList, Home, Building, Zap, Layout, Copy, Move,
  ChevronDown, ChevronUp, Edit, ToggleLeft, ToggleRight
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';

interface ManagementSection {
  id: string;
  name: string;
  icon: string;
  category: string;
  description: string;
  color: string;
  permissions: string[];
  isCore: boolean;
}

interface PortalConfig {
  id: string;
  name: string;
  type: string;
  assignedSections: PortalSection[];
  createdAt: string;
  lastModified: string;
  status: 'active' | 'draft' | 'archived';
}

interface PortalSection {
  sectionId: string;
  order: number;
  isVisible: boolean;
  isEnabled: boolean;
  customName?: string;
  customColor?: string;
  permissions: string[];
}

interface PortalSectionManagerProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (config: PortalConfig) => void;
  portal?: PortalConfig | null;
  mode: 'create' | 'edit';
}

export default function PortalSectionManager({
  isOpen,
  onClose,
  onSave,
  portal,
  mode
}: PortalSectionManagerProps) {
  // All available management sections
  const availableSections: ManagementSection[] = [
    {
      id: 'subscription-plans',
      name: 'Subscription Plan Management',
      icon: 'crown',
      category: 'Plans & Services',
      description: 'Manage labor hour subscription plans with media attachments',
      color: 'purple',
      permissions: ['admin', 'manager'],
      isCore: true
    },
    {
      id: 'maintenance-plans',
      name: 'Maintenance Plan Management',
      icon: 'wrench',
      category: 'Plans & Services',
      description: 'Manage maintenance plans for condos & landlords',
      color: 'cyan',
      permissions: ['admin', 'manager'],
      isCore: true
    },
    {
      id: 'customer-management',
      name: 'Customer Management',
      icon: 'users',
      category: 'CRM',
      description: 'Complete customer database and relationship management',
      color: 'blue',
      permissions: ['admin', 'manager', 'sales'],
      isCore: true
    },
    {
      id: 'work-orders',
      name: 'Work Order Management',
      icon: 'clipboard-list',
      category: 'Operations',
      description: 'Create, track, and manage work orders',
      color: 'green',
      permissions: ['admin', 'manager', 'technician'],
      isCore: true
    },
    {
      id: 'invoicing',
      name: 'Invoice Management',
      icon: 'file-text',
      category: 'Financial',
      description: 'Generate and manage invoices with payment tracking',
      color: 'orange',
      permissions: ['admin', 'manager', 'accounting'],
      isCore: true
    },
    {
      id: 'unified-payment-center',
      name: 'Payment Center',
      icon: 'dollar-sign',
      category: 'Financial',
      description: 'Process payments with blockchain integration',
      color: 'green',
      permissions: ['admin', 'accounting'],
      isCore: true
    },
    {
      id: 'quote-creation',
      name: 'Quote Creation',
      icon: 'target',
      category: 'Sales',
      description: 'Create and manage customer quotes',
      color: 'indigo',
      permissions: ['admin', 'manager', 'sales'],
      isCore: true
    },
    {
      id: 'advertiser-approvals',
      name: 'Advertiser Approvals',
      icon: 'trending-up',
      category: 'Approvals',
      description: 'Review and approve advertising requests',
      color: 'pink',
      permissions: ['admin', 'manager'],
      isCore: false
    },
    {
      id: 'reel-approvals',
      name: 'Reel/Video Approvals',
      icon: 'video',
      category: 'Approvals',
      description: 'Review and approve video content',
      color: 'red',
      permissions: ['admin', 'manager'],
      isCore: false
    },
    {
      id: 'contractor-approvals',
      name: 'Contractor Approvals',
      icon: 'briefcase',
      category: 'Approvals',
      description: 'Review and approve contractor applications',
      color: 'yellow',
      permissions: ['admin', 'manager'],
      isCore: false
    },
    {
      id: 'subcontractor-management',
      name: 'Subcontractor Management',
      icon: 'users',
      category: 'Workforce',
      description: 'Manage subcontractor database and assignments',
      color: 'teal',
      permissions: ['admin', 'manager'],
      isCore: true
    },
    {
      id: 'employee-management',
      name: 'Employee Management',
      icon: 'users',
      category: 'Workforce',
      description: 'Manage employees, roles, and schedules',
      color: 'blue',
      permissions: ['admin', 'hr'],
      isCore: true
    },
    {
      id: 'time-tracking',
      name: 'Time Tracking',
      icon: 'calendar',
      category: 'Operations',
      description: 'Track employee hours and job time',
      color: 'purple',
      permissions: ['admin', 'manager', 'employee'],
      isCore: true
    },
    {
      id: 'master-scheduling',
      name: 'Master Scheduling',
      icon: 'calendar',
      category: 'Operations',
      description: 'Comprehensive scheduling system',
      color: 'indigo',
      permissions: ['admin', 'manager'],
      isCore: true
    },
    {
      id: 'cad-design',
      name: 'CAD Design Center',
      icon: 'layout',
      category: 'Design',
      description: 'Professional CAD floor plan drawing',
      color: 'cyan',
      permissions: ['admin', 'designer'],
      isCore: false
    },
    {
      id: 'ai-architecture',
      name: 'AI Architecture Design',
      icon: 'zap',
      category: 'Design',
      description: 'AI-powered architecture design tools',
      color: 'purple',
      permissions: ['admin', 'designer'],
      isCore: false
    },
    {
      id: 'measurement-system',
      name: 'Door/Window Measurement',
      icon: 'grid',
      category: 'Operations',
      description: 'AI-powered video measurement system',
      color: 'green',
      permissions: ['admin', 'technician'],
      isCore: false
    },
    {
      id: 'reporting-hub',
      name: 'Enterprise Reporting Hub',
      icon: 'trending-up',
      category: 'Analytics',
      description: 'Comprehensive reporting and analytics',
      color: 'blue',
      permissions: ['admin', 'manager'],
      isCore: true
    },
    {
      id: 'referral-system',
      name: 'Referral Rewards System',
      icon: 'users',
      category: 'Marketing',
      description: 'Manage customer referral program',
      color: 'pink',
      permissions: ['admin', 'manager', 'sales'],
      isCore: false
    },
    {
      id: 'theme-manager',
      name: 'Theme Manager',
      icon: 'settings',
      category: 'Customization',
      description: 'Manage themes and branding',
      color: 'purple',
      permissions: ['admin'],
      isCore: false
    },
    {
      id: 'backup-recovery',
      name: 'System Backup & Recovery',
      icon: 'shield',
      category: 'System',
      description: 'Data backup and recovery tools',
      color: 'red',
      permissions: ['admin'],
      isCore: true
    },
    {
      id: 'module-manager',
      name: 'Module Manager',
      icon: 'package',
      category: 'System',
      description: 'Enable/disable system modules',
      color: 'orange',
      permissions: ['admin'],
      isCore: true
    },
    {
      id: 'personal-folders',
      name: 'Personal Folder System',
      icon: 'home',
      category: 'Organization',
      description: 'Personal document organization',
      color: 'yellow',
      permissions: ['admin', 'manager', 'employee'],
      isCore: false
    },
    {
      id: 'video-feed',
      name: 'Video/Reel Feed Manager',
      icon: 'video',
      category: 'Content',
      description: 'Manage video content feed',
      color: 'red',
      permissions: ['admin', 'manager'],
      isCore: false
    }
  ];

  const [portalConfig, setPortalConfig] = useState<PortalConfig>({
    id: '',
    name: '',
    type: 'admin',
    assignedSections: [],
    createdAt: new Date().toISOString(),
    lastModified: new Date().toISOString(),
    status: 'draft'
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [draggedSection, setDraggedSection] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (portal && mode === 'edit') {
      setPortalConfig(portal);
    }
  }, [portal, mode]);

  if (!isOpen) return null;

  const categories = ['all', ...Array.from(new Set(availableSections.map(s => s.category)))];

  const filteredSections = availableSections.filter(section => {
    const matchesSearch = section.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         section.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || section.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const assignedSectionIds = portalConfig.assignedSections.map(s => s.sectionId);
  const unassignedSections = filteredSections.filter(s => !assignedSectionIds.includes(s.id));

  const getIconComponent = (iconName: string) => {
    const icons: { [key: string]: any } = {
      crown: Crown,
      wrench: Wrench,
      users: Users,
      'clipboard-list': ClipboardList,
      'file-text': FileText,
      'dollar-sign': DollarSign,
      target: Target,
      'trending-up': TrendingUp,
      video: Video,
      briefcase: Briefcase,
      calendar: Calendar,
      layout: Layout,
      zap: Zap,
      grid: Grid,
      shield: Shield,
      package: Package,
      home: Home,
      settings: Settings
    };
    return icons[iconName] || Package;
  };

  const getColorClasses = (color: string) => {
    const colors: { [key: string]: string } = {
      purple: 'from-purple-600 to-purple-700',
      cyan: 'from-cyan-600 to-cyan-700',
      blue: 'from-blue-600 to-blue-700',
      green: 'from-green-600 to-green-700',
      orange: 'from-orange-600 to-orange-700',
      pink: 'from-pink-600 to-pink-700',
      red: 'from-red-600 to-red-700',
      yellow: 'from-yellow-600 to-yellow-700',
      teal: 'from-teal-600 to-teal-700',
      indigo: 'from-indigo-600 to-indigo-700'
    };
    return colors[color] || colors.blue;
  };

  const handleAddSection = (section: ManagementSection) => {
    const newSection: PortalSection = {
      sectionId: section.id,
      order: portalConfig.assignedSections.length,
      isVisible: true,
      isEnabled: true,
      permissions: [...section.permissions]
    };

    setPortalConfig(prev => ({
      ...prev,
      assignedSections: [...prev.assignedSections, newSection],
      lastModified: new Date().toISOString()
    }));

    toast.success(`${section.name} added to portal`);
  };

  const handleRemoveSection = (sectionId: string) => {
    const section = availableSections.find(s => s.id === sectionId);
    setPortalConfig(prev => ({
      ...prev,
      assignedSections: prev.assignedSections.filter(s => s.sectionId !== sectionId),
      lastModified: new Date().toISOString()
    }));

    toast.success(`${section?.name || 'Section'} removed from portal`);
  };

  const handleToggleVisibility = (sectionId: string) => {
    setPortalConfig(prev => ({
      ...prev,
      assignedSections: prev.assignedSections.map(s =>
        s.sectionId === sectionId ? { ...s, isVisible: !s.isVisible } : s
      ),
      lastModified: new Date().toISOString()
    }));
  };

  const handleToggleEnabled = (sectionId: string) => {
    setPortalConfig(prev => ({
      ...prev,
      assignedSections: prev.assignedSections.map(s =>
        s.sectionId === sectionId ? { ...s, isEnabled: !s.isEnabled } : s
      ),
      lastModified: new Date().toISOString()
    }));
  };

  const handleReorder = (sectionId: string, direction: 'up' | 'down') => {
    const currentIndex = portalConfig.assignedSections.findIndex(s => s.sectionId === sectionId);
    if (currentIndex === -1) return;

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= portalConfig.assignedSections.length) return;

    const newSections = [...portalConfig.assignedSections];
    [newSections[currentIndex], newSections[newIndex]] = [newSections[newIndex], newSections[currentIndex]];
    
    // Update order numbers
    newSections.forEach((section, index) => {
      section.order = index;
    });

    setPortalConfig(prev => ({
      ...prev,
      assignedSections: newSections,
      lastModified: new Date().toISOString()
    }));
  };

  const handleSave = async () => {
    if (!portalConfig.name.trim()) {
      toast.error('Portal name is required');
      return;
    }

    if (portalConfig.assignedSections.length === 0) {
      toast.error('Add at least one section to the portal');
      return;
    }

    setIsSaving(true);

    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      onSave(portalConfig);
      toast.success(`Portal ${mode === 'create' ? 'created' : 'updated'} successfully!`);
      onClose();
    } catch (error) {
      toast.error('Failed to save portal configuration');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDuplicatePortal = () => {
    const duplicatedConfig: PortalConfig = {
      ...portalConfig,
      id: '',
      name: `${portalConfig.name} (Copy)`,
      status: 'draft',
      createdAt: new Date().toISOString(),
      lastModified: new Date().toISOString()
    };
    onSave(duplicatedConfig);
    toast.success('Portal duplicated successfully!');
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-[#1A1A1A] rounded-3xl border border-[#2A2A2A] max-w-7xl w-full my-8">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-orange-600 to-orange-700 p-6 rounded-t-3xl z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-sm">
                <Layout className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">
                  {mode === 'create' ? 'Create New' : 'Configure'} Portal
                </h2>
                <p className="text-orange-100 text-sm">
                  Add/remove management sections dynamically
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

        {/* Portal Basic Info */}
        <div className="p-6 border-b border-[#2A2A2A] bg-[#0A0A0A]">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-semibold text-white mb-2">
                Portal Name *
              </label>
              <input
                type="text"
                value={portalConfig.name}
                onChange={(e) => setPortalConfig(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Admin Portal, Manager Portal, Employee Portal"
                className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl text-white placeholder-gray-500 focus:border-orange-500 focus:outline-none transition"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-white mb-2">
                Portal Type
              </label>
              <select
                value={portalConfig.type}
                onChange={(e) => setPortalConfig(prev => ({ ...prev, type: e.target.value }))}
                className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl text-white focus:border-orange-500 focus:outline-none transition"
              >
                <option value="admin">Admin Portal</option>
                <option value="manager">Manager Portal</option>
                <option value="employee">Employee Portal</option>
                <option value="customer">Customer Portal</option>
                <option value="vendor">Vendor Portal</option>
                <option value="custom">Custom Portal</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-white mb-2">
                Status
              </label>
              <select
                value={portalConfig.status}
                onChange={(e) => setPortalConfig(prev => ({ ...prev, status: e.target.value as any }))}
                className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl text-white focus:border-orange-500 focus:outline-none transition"
              >
                <option value="draft">Draft</option>
                <option value="active">Active</option>
                <option value="archived">Archived</option>
              </select>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-4 text-sm text-gray-400">
            <span>📦 {portalConfig.assignedSections.length} sections assigned</span>
            <span>•</span>
            <span>🕒 Last modified: {new Date(portalConfig.lastModified).toLocaleDateString()}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6 p-6">
          {/* Available Sections */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">
                Available Sections ({unassignedSections.length})
              </h3>
              <div className="flex gap-2">
                <button
                  onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
                  className="p-2 hover:bg-[#2A2A2A] rounded-lg transition"
                  title={`Switch to ${viewMode === 'grid' ? 'list' : 'grid'} view`}
                >
                  {viewMode === 'grid' ? <List className="w-4 h-4 text-gray-400" /> : <Grid className="w-4 h-4 text-gray-400" />}
                </button>
              </div>
            </div>

            {/* Search & Filter */}
            <div className="space-y-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search sections..."
                  className="w-full pl-10 pr-4 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white placeholder-gray-500 focus:border-orange-500 focus:outline-none transition"
                />
              </div>

              <div className="flex gap-2 overflow-x-auto pb-2">
                {categories.map(category => (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    className={`px-3 py-1 rounded-lg text-sm whitespace-nowrap transition ${
                      selectedCategory === category
                        ? 'bg-orange-600 text-white'
                        : 'bg-[#0A0A0A] text-gray-400 hover:bg-[#1A1A1A]'
                    }`}
                  >
                    {category === 'all' ? 'All' : category}
                  </button>
                ))}
              </div>
            </div>

            {/* Available Sections List */}
            <div className="max-h-[600px] overflow-y-auto space-y-2 pr-2">
              {unassignedSections.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No available sections found</p>
                  <p className="text-sm mt-1">Try changing your search or filter</p>
                </div>
              ) : (
                unassignedSections.map(section => {
                  const Icon = getIconComponent(section.icon);
                  return (
                    <div
                      key={section.id}
                      className="bg-[#0A0A0A] rounded-xl border border-[#2A2A2A] p-4 hover:border-orange-500/50 transition group"
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${getColorClasses(section.color)} flex items-center justify-center flex-shrink-0`}>
                          <Icon className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <h4 className="font-semibold text-white text-sm">{section.name}</h4>
                              <p className="text-xs text-gray-400 mt-1">{section.description}</p>
                              <div className="flex items-center gap-2 mt-2">
                                <span className="text-xs px-2 py-0.5 bg-[#1A1A1A] text-gray-400 rounded">
                                  {section.category}
                                </span>
                                {section.isCore && (
                                  <span className="text-xs px-2 py-0.5 bg-orange-500/10 text-orange-400 rounded border border-orange-500/20">
                                    Core
                                  </span>
                                )}
                              </div>
                            </div>
                            <button
                              onClick={() => handleAddSection(section)}
                              className="p-2 bg-green-600/20 hover:bg-green-600/30 text-green-400 rounded-lg transition opacity-0 group-hover:opacity-100"
                              title="Add to portal"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Assigned Sections */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">
                Assigned Sections ({portalConfig.assignedSections.length})
              </h3>
              {portalConfig.assignedSections.length > 0 && (
                <span className="text-xs text-gray-400">Drag to reorder</span>
              )}
            </div>

            {/* Assigned Sections List */}
            <div className="max-h-[680px] overflow-y-auto space-y-2 pr-2">
              {portalConfig.assignedSections.length === 0 ? (
                <div className="text-center py-12 text-gray-500 border-2 border-dashed border-[#2A2A2A] rounded-xl">
                  <Layout className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No sections assigned yet</p>
                  <p className="text-sm mt-1">Add sections from the left panel</p>
                </div>
              ) : (
                portalConfig.assignedSections.map((assignedSection, index) => {
                  const section = availableSections.find(s => s.id === assignedSection.sectionId);
                  if (!section) return null;

                  const Icon = getIconComponent(section.icon);
                  return (
                    <div
                      key={assignedSection.sectionId}
                      className={`bg-[#0A0A0A] rounded-xl border-2 p-4 transition ${
                        assignedSection.isEnabled
                          ? 'border-green-500/30'
                          : 'border-gray-500/30 opacity-60'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <button
                          className="mt-1 cursor-move text-gray-500 hover:text-gray-300"
                          title="Drag to reorder"
                        >
                          <GripVertical className="w-5 h-5" />
                        </button>

                        <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${getColorClasses(section.color)} flex items-center justify-center flex-shrink-0`}>
                          <Icon className="w-5 h-5 text-white" />
                        </div>

                        <div className="flex-1">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div>
                              <h4 className="font-semibold text-white text-sm flex items-center gap-2">
                                {assignedSection.customName || section.name}
                                <span className="text-xs text-gray-500">#{index + 1}</span>
                              </h4>
                              <p className="text-xs text-gray-400 mt-1">{section.category}</p>
                            </div>
                          </div>

                          {/* Controls */}
                          <div className="flex items-center gap-2 mt-3">
                            {/* Visibility Toggle */}
                            <button
                              onClick={() => handleToggleVisibility(section.id)}
                              className={`p-2 rounded-lg transition text-xs flex items-center gap-1 ${
                                assignedSection.isVisible
                                  ? 'bg-blue-600/20 text-blue-400 hover:bg-blue-600/30'
                                  : 'bg-gray-600/20 text-gray-400 hover:bg-gray-600/30'
                              }`}
                              title={assignedSection.isVisible ? 'Visible' : 'Hidden'}
                            >
                              {assignedSection.isVisible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                            </button>

                            {/* Enabled Toggle */}
                            <button
                              onClick={() => handleToggleEnabled(section.id)}
                              className={`p-2 rounded-lg transition text-xs flex items-center gap-1 ${
                                assignedSection.isEnabled
                                  ? 'bg-green-600/20 text-green-400 hover:bg-green-600/30'
                                  : 'bg-red-600/20 text-red-400 hover:bg-red-600/30'
                              }`}
                              title={assignedSection.isEnabled ? 'Enabled' : 'Disabled'}
                            >
                              {assignedSection.isEnabled ? <ToggleRight className="w-3 h-3" /> : <ToggleLeft className="w-3 h-3" />}
                            </button>

                            {/* Reorder Buttons */}
                            <button
                              onClick={() => handleReorder(section.id, 'up')}
                              disabled={index === 0}
                              className="p-2 bg-[#1A1A1A] hover:bg-[#2A2A2A] text-gray-400 rounded-lg transition disabled:opacity-30 disabled:cursor-not-allowed"
                              title="Move up"
                            >
                              <ChevronUp className="w-3 h-3" />
                            </button>

                            <button
                              onClick={() => handleReorder(section.id, 'down')}
                              disabled={index === portalConfig.assignedSections.length - 1}
                              className="p-2 bg-[#1A1A1A] hover:bg-[#2A2A2A] text-gray-400 rounded-lg transition disabled:opacity-30 disabled:cursor-not-allowed"
                              title="Move down"
                            >
                              <ChevronDown className="w-3 h-3" />
                            </button>

                            {/* Remove Button */}
                            <button
                              onClick={() => handleRemoveSection(section.id)}
                              className="ml-auto p-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-lg transition"
                              title="Remove from portal"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
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
                  onClick={handleDuplicatePortal}
                  className="px-6 py-3 bg-blue-600/20 border border-blue-500/30 text-blue-400 rounded-xl hover:bg-blue-600/30 transition font-semibold flex items-center gap-2"
                >
                  <Copy className="w-5 h-5" />
                  Duplicate
                </button>
              )}

              <button
                onClick={handleSave}
                disabled={isSaving}
                className="px-8 py-3 bg-gradient-to-r from-orange-600 to-orange-700 text-white rounded-xl hover:from-orange-700 hover:to-orange-800 transition font-bold flex items-center gap-2 shadow-lg shadow-orange-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5" />
                    {mode === 'create' ? 'Create Portal' : 'Save Changes'}
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
