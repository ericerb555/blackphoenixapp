import { useState } from 'react';
import {
  Plus, Save, X, Edit, Trash2, Copy, Eye, Settings, ArrowLeft,
  Building, Users, DollarSign, Calendar, FileText, Tag, Star,
  AlertCircle, CheckCircle, Zap, Target, Package, Shield, Briefcase,
  Home, Wrench, TrendingUp, BarChart3, PieChart, Activity, Bell,
  MessageSquare, Phone, Mail, MapPin, Search, Filter, Download,
  Upload, ExternalLink, ChevronRight, ChevronDown, Grid, List, Clock
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { TextArea } from './ui/input/TextArea';

interface CRMField {
  id: string;
  name: string;
  label: string;
  type: 'text' | 'email' | 'phone' | 'number' | 'date' | 'select' | 'textarea' | 'checkbox' | 'currency';
  required: boolean;
  placeholder?: string;
  options?: string[];
  defaultValue?: string;
}

interface CRMTab {
  id: string;
  name: string;
  label: string;
  icon: string;
  fields: CRMField[];
}

interface CRMTemplate {
  id: string;
  name: string;
  description: string;
  type: string;
  primaryColor: string;
  icon: string;
  tabs: CRMTab[];
  stats: Array<{
    label: string;
    key: string;
    icon: string;
  }>;
  createdDate: string;
  lastModified: string;
  isActive: boolean;
  // Portal Configuration
  hasManagerPortal: boolean;
  portalName?: string;
  portalDescription?: string;
  portalColor?: string;
  portalId?: string;
  // Customer Group Configuration
  hasCustomerGroup: boolean;
  customerGroupName?: string;
  allowCustomerSignup?: boolean;
  customerGroupSettings?: {
    requireApproval: boolean;
    autoAssignToGroup: boolean;
    customFields: string[];
  };
}

const availableIcons = [
  { name: 'Building', component: Building },
  { name: 'Users', component: Users },
  { name: 'DollarSign', component: DollarSign },
  { name: 'Calendar', component: Calendar },
  { name: 'FileText', component: FileText },
  { name: 'Tag', component: Tag },
  { name: 'Star', component: Star },
  { name: 'Shield', component: Shield },
  { name: 'Briefcase', component: Briefcase },
  { name: 'Home', component: Home },
  { name: 'Wrench', component: Wrench },
  { name: 'TrendingUp', component: TrendingUp },
  { name: 'BarChart3', component: BarChart3 },
  { name: 'Target', component: Target },
  { name: 'Package', component: Package }
];

const colorOptions = [
  { name: 'Cyan', value: 'cyan', gradient: 'from-cyan-600 to-cyan-700' },
  { name: 'Blue', value: 'blue', gradient: 'from-blue-600 to-blue-700' },
  { name: 'Purple', value: 'purple', gradient: 'from-purple-600 to-purple-700' },
  { name: 'Green', value: 'green', gradient: 'from-green-600 to-green-700' },
  { name: 'Orange', value: 'orange', gradient: 'from-orange-600 to-orange-700' },
  { name: 'Red', value: 'red', gradient: 'from-red-600 to-red-700' },
  { name: 'Pink', value: 'pink', gradient: 'from-pink-600 to-pink-700' },
  { name: 'Indigo', value: 'indigo', gradient: 'from-indigo-600 to-indigo-700' }
];

export default function SubCRMSystemBuilder() {
  const [view, setView] = useState<'list' | 'create' | 'edit' | 'preview'>('list');
  const [selectedTemplate, setSelectedTemplate] = useState<CRMTemplate | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');

  // Form state for creating/editing CRM
  const [crmName, setCrmName] = useState('');
  const [crmDescription, setCrmDescription] = useState('');
  const [crmType, setCrmType] = useState('');
  const [crmColor, setCrmColor] = useState('cyan');
  const [crmIcon, setCrmIcon] = useState('Building');
  const [crmTabs, setCrmTabs] = useState<CRMTab[]>([]);
  const [crmStats, setCrmStats] = useState<Array<{ label: string; key: string; icon: string }>>([]);
  
  // Portal configuration state
  const [hasManagerPortal, setHasManagerPortal] = useState(true);
  const [portalName, setPortalName] = useState('');
  const [portalDescription, setPortalDescription] = useState('');
  const [portalColor, setPortalColor] = useState('purple');
  
  // Customer group configuration state
  const [hasCustomerGroup, setHasCustomerGroup] = useState(true);
  const [customerGroupName, setCustomerGroupName] = useState('');
  const [allowCustomerSignup, setAllowCustomerSignup] = useState(true);
  const [requireApproval, setRequireApproval] = useState(false);
  const [autoAssignToGroup, setAutoAssignToGroup] = useState(true);

  // Existing CRM Templates
  const [crmTemplates, setCrmTemplates] = useState<CRMTemplate[]>([
    {
      id: 'CRM-001',
      name: 'Condo Association CRM',
      description: 'Property management CRM for condo associations with maintenance tracking, unit management, and resident portal',
      type: 'Property Management',
      primaryColor: 'cyan',
      icon: 'Building',
      tabs: [
        { id: 'dashboard', name: 'dashboard', label: 'Dashboard', icon: 'BarChart3', fields: [] },
        { id: 'requests', name: 'requests', label: 'Requests', icon: 'Wrench', fields: [] },
        { id: 'units', name: 'units', label: 'Units', icon: 'Home', fields: [] }
      ],
      stats: [
        { label: 'Total Units', key: 'totalUnits', icon: 'Building' },
        { label: 'Active Requests', key: 'activeRequests', icon: 'Wrench' },
        { label: 'Monthly Revenue', key: 'monthlyRevenue', icon: 'DollarSign' }
      ],
      createdDate: '2024-01-15',
      lastModified: '2024-01-24',
      isActive: true,
      hasManagerPortal: true,
      portalName: 'Property Manager Portal',
      portalDescription: 'Professional property management dashboard',
      portalColor: 'purple',
      portalId: 'PORTAL-CONDO-001',
      hasCustomerGroup: true,
      customerGroupName: 'Condo Residents',
      allowCustomerSignup: true,
      customerGroupSettings: {
        requireApproval: true,
        autoAssignToGroup: true,
        customFields: ['unitNumber', 'buildingName', 'ownershipType']
      }
    },
    {
      id: 'CRM-002',
      name: 'Portfolio Management CRM',
      description: 'Investment portfolio CRM for managing multiple properties, acquisitions, and financial performance',
      type: 'Investment Management',
      primaryColor: 'purple',
      icon: 'Briefcase',
      tabs: [
        { id: 'dashboard', name: 'dashboard', label: 'Dashboard', icon: 'BarChart3', fields: [] },
        { id: 'properties', name: 'properties', label: 'Properties', icon: 'Building', fields: [] },
        { id: 'acquisitions', name: 'acquisitions', label: 'Acquisitions', icon: 'Target', fields: [] }
      ],
      stats: [
        { label: 'Portfolio Value', key: 'portfolioValue', icon: 'DollarSign' },
        { label: 'Total Properties', key: 'totalProperties', icon: 'Building' },
        { label: 'Avg Cap Rate', key: 'avgCapRate', icon: 'TrendingUp' }
      ],
      createdDate: '2024-01-20',
      lastModified: '2024-01-25',
      isActive: true,
      hasManagerPortal: true,
      portalName: 'Portfolio Manager Portal',
      portalDescription: 'Executive portfolio management dashboard',
      portalColor: 'indigo',
      portalId: 'PORTAL-PORTFOLIO-001',
      hasCustomerGroup: true,
      customerGroupName: 'Portfolio Investors',
      allowCustomerSignup: true,
      customerGroupSettings: {
        requireApproval: true,
        autoAssignToGroup: true,
        customFields: ['investorType', 'investmentAmount', 'riskTolerance']
      }
    }
  ]);

  const handleCreateNewCRM = () => {
    // Reset form
    setCrmName('');
    setCrmDescription('');
    setCrmType('');
    setCrmColor('cyan');
    setCrmIcon('Building');
    setCrmTabs([
      { id: 'dashboard', name: 'dashboard', label: 'Dashboard', icon: 'BarChart3', fields: [] }
    ]);
    setCrmStats([
      { label: 'Total Items', key: 'totalItems', icon: 'Package' }
    ]);
    // Reset portal configuration
    setHasManagerPortal(true);
    setPortalName('');
    setPortalDescription('');
    setPortalColor('purple');
    // Reset customer group configuration
    setHasCustomerGroup(true);
    setCustomerGroupName('');
    setAllowCustomerSignup(true);
    setRequireApproval(false);
    setAutoAssignToGroup(true);
    setView('create');
  };

  const handleEditCRM = (template: CRMTemplate) => {
    setSelectedTemplate(template);
    setCrmName(template.name);
    setCrmDescription(template.description);
    setCrmType(template.type);
    setCrmColor(template.primaryColor);
    setCrmIcon(template.icon);
    setCrmTabs(template.tabs);
    setCrmStats(template.stats);
    // Load portal configuration
    setHasManagerPortal(template.hasManagerPortal);
    setPortalName(template.portalName || '');
    setPortalDescription(template.portalDescription || '');
    setPortalColor(template.portalColor || 'purple');
    // Load customer group configuration
    setHasCustomerGroup(template.hasCustomerGroup);
    setCustomerGroupName(template.customerGroupName || '');
    setAllowCustomerSignup(template.allowCustomerSignup || true);
    setRequireApproval(template.customerGroupSettings?.requireApproval || false);
    setAutoAssignToGroup(template.customerGroupSettings?.autoAssignToGroup || true);
    setView('edit');
  };

  const handlePreviewCRM = (template: CRMTemplate) => {
    setSelectedTemplate(template);
    setView('preview');
  };

  const handleSaveCRM = () => {
    if (!crmName || !crmDescription || !crmType) {
      toast.error('Please fill in all required fields');
      return;
    }

    // Validate portal configuration if enabled
    if (hasManagerPortal && !portalName) {
      toast.error('Please provide a portal name');
      return;
    }

    // Validate customer group configuration if enabled
    if (hasCustomerGroup && !customerGroupName) {
      toast.error('Please provide a customer group name');
      return;
    }

    const templateId = view === 'edit' && selectedTemplate ? selectedTemplate.id : `CRM-${String(crmTemplates.length + 1).padStart(3, '0')}`;
    const portalId = hasManagerPortal ? `PORTAL-${templateId}` : undefined;

    const newTemplate: CRMTemplate = {
      id: templateId,
      name: crmName,
      description: crmDescription,
      type: crmType,
      primaryColor: crmColor,
      icon: crmIcon,
      tabs: crmTabs,
      stats: crmStats,
      createdDate: view === 'edit' && selectedTemplate ? selectedTemplate.createdDate : new Date().toISOString().split('T')[0],
      lastModified: new Date().toISOString().split('T')[0],
      isActive: true,
      // Portal configuration
      hasManagerPortal,
      portalName: hasManagerPortal ? (portalName || `${crmName} Manager Portal`) : undefined,
      portalDescription: hasManagerPortal ? (portalDescription || `Manager portal for ${crmName}`) : undefined,
      portalColor: hasManagerPortal ? portalColor : undefined,
      portalId,
      // Customer group configuration
      hasCustomerGroup,
      customerGroupName: hasCustomerGroup ? (customerGroupName || `${crmName} Customers`) : undefined,
      allowCustomerSignup: hasCustomerGroup ? allowCustomerSignup : undefined,
      customerGroupSettings: hasCustomerGroup ? {
        requireApproval,
        autoAssignToGroup,
        customFields: []
      } : undefined
    };

    if (view === 'edit') {
      setCrmTemplates(crmTemplates.map(t => t.id === newTemplate.id ? newTemplate : t));
      toast.success('CRM template updated successfully!');
    } else {
      setCrmTemplates([...crmTemplates, newTemplate]);
      toast.success(`CRM template created successfully!${hasManagerPortal ? ' Manager portal will be available in Mobile Hub.' : ''}`);
    }

    setView('list');
  };

  const handleDuplicateCRM = (template: CRMTemplate) => {
    const duplicated: CRMTemplate = {
      ...template,
      id: `CRM-${String(crmTemplates.length + 1).padStart(3, '0')}`,
      name: `${template.name} (Copy)`,
      createdDate: new Date().toISOString().split('T')[0],
      lastModified: new Date().toISOString().split('T')[0]
    };
    setCrmTemplates([...crmTemplates, duplicated]);
    toast.success('CRM template duplicated successfully!');
  };

  const handleDeleteCRM = (id: string) => {
    setCrmTemplates(crmTemplates.filter(t => t.id !== id));
    toast.success('CRM template deleted successfully!');
  };

  const handleAddTab = () => {
    const newTab: CRMTab = {
      id: `tab-${crmTabs.length + 1}`,
      name: `tab_${crmTabs.length + 1}`,
      label: 'New Tab',
      icon: 'FileText',
      fields: []
    };
    setCrmTabs([...crmTabs, newTab]);
  };

  const handleRemoveTab = (tabId: string) => {
    if (crmTabs.length === 1) {
      toast.error('CRM must have at least one tab');
      return;
    }
    setCrmTabs(crmTabs.filter(t => t.id !== tabId));
  };

  const handleUpdateTab = (tabId: string, updates: Partial<CRMTab>) => {
    setCrmTabs(crmTabs.map(t => t.id === tabId ? { ...t, ...updates } : t));
  };

  const handleAddStat = () => {
    setCrmStats([...crmStats, { label: 'New Stat', key: 'newStat', icon: 'Star' }]);
  };

  const handleRemoveStat = (index: number) => {
    setCrmStats(crmStats.filter((_, i) => i !== index));
  };

  const handleUpdateStat = (index: number, updates: Partial<{ label: string; key: string; icon: string }>) => {
    setCrmStats(crmStats.map((stat, i) => i === index ? { ...stat, ...updates } : stat));
  };

  const filteredTemplates = crmTemplates.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         template.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         template.type.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterType === 'all' || template.type === filterType;
    return matchesSearch && matchesFilter;
  });

  const uniqueTypes = Array.from(new Set(crmTemplates.map(t => t.type)));

  if (view === 'create' || view === 'edit') {
    return (
      <div className="min-h-screen bg-[#0A0A0A] p-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <button
              onClick={() => setView('list')}
              className="flex items-center gap-2 px-4 py-2 bg-[#1A1A1A] hover:bg-[#2A2A2A] border border-[#2A2A2A] rounded-xl text-white transition mb-4"
            >
              <ArrowLeft className="w-5 h-5" />
              Back to CRM List
            </button>
            <h1 className="text-3xl font-bold text-white mb-2">
              {view === 'edit' ? 'Edit CRM Template' : 'Create New CRM Template'}
            </h1>
            <p className="text-gray-400">
              {view === 'edit' ? 'Modify your existing CRM template' : 'Build a custom CRM system with your own tabs, fields, and statistics'}
            </p>
          </div>

          <div className="grid grid-cols-3 gap-8">
            {/* Form */}
            <div className="col-span-2 space-y-6">
              {/* Basic Information */}
              <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-6">
                <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <Settings className="w-5 h-5 text-cyan-400" />
                  Basic Information
                </h2>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-300 mb-2">
                      CRM Name <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={crmName}
                      onChange={(e) => setCrmName(e.target.value)}
                      placeholder="e.g., Real Estate Agency CRM"
                      className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white placeholder-gray-500 focus:border-cyan-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-300 mb-2">
                      Description <span className="text-red-400">*</span>
                    </label>
                    <TextArea
                      value={crmDescription}
                      onChange={setCrmDescription}
                      placeholder="Describe the purpose and features of this CRM system..."
                      rows={3}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-300 mb-2">
                      CRM Type <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={crmType}
                      onChange={(e) => setCrmType(e.target.value)}
                      placeholder="e.g., Property Management, Sales, Customer Service"
                      className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white placeholder-gray-500 focus:border-cyan-500 focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-300 mb-2">
                        Primary Color
                      </label>
                      <div className="grid grid-cols-4 gap-2">
                        {colorOptions.map((color) => (
                          <button
                            key={color.value}
                            onClick={() => setCrmColor(color.value)}
                            className={`h-12 rounded-xl bg-gradient-to-r ${color.gradient} transition ${
                              crmColor === color.value ? 'ring-2 ring-white ring-offset-2 ring-offset-[#1A1A1A]' : 'opacity-50 hover:opacity-100'
                            }`}
                            title={color.name}
                          />
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-300 mb-2">
                        Icon
                      </label>
                      <select
                        value={crmIcon}
                        onChange={(e) => setCrmIcon(e.target.value)}
                        className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white focus:border-cyan-500 focus:outline-none"
                      >
                        {availableIcons.map((icon) => (
                          <option key={icon.name} value={icon.name}>
                            {icon.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Manager Portal Configuration */}
              <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <Shield className="w-5 h-5 text-purple-400" />
                    Manager Portal
                  </h2>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={hasManagerPortal}
                      onChange={(e) => setHasManagerPortal(e.target.checked)}
                      className="w-5 h-5 rounded border-[#2A2A2A] bg-[#0A0A0A] text-purple-600 focus:ring-purple-500"
                    />
                    <span className="text-sm text-gray-300">Enable Manager Portal</span>
                  </label>
                </div>

                {hasManagerPortal && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-300 mb-2">
                        Portal Name <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="text"
                        value={portalName}
                        onChange={(e) => setPortalName(e.target.value)}
                        placeholder={`${crmName || 'CRM'} Manager Portal`}
                        className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-300 mb-2">
                        Portal Description
                      </label>
                      <TextArea
                        value={portalDescription}
                        onChange={setPortalDescription}
                        placeholder={`Manager portal for ${crmName || 'this CRM system'}`}
                        rows={2}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-300 mb-2">
                        Portal Theme Color
                      </label>
                      <div className="grid grid-cols-8 gap-2">
                        {colorOptions.map((color) => (
                          <button
                            key={color.value}
                            onClick={() => setPortalColor(color.value)}
                            className={`h-10 rounded-lg bg-gradient-to-r ${color.gradient} transition ${
                              portalColor === color.value ? 'ring-2 ring-white ring-offset-2 ring-offset-[#1A1A1A]' : 'opacity-50 hover:opacity-100'
                            }`}
                            title={color.name}
                          />
                        ))}
                      </div>
                    </div>

                    <div className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-xl">
                      <p className="text-sm text-purple-300">
                        ✓ Portal will automatically appear in Mobile Hub when CRM is created
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Customer Group Configuration */}
              <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <Users className="w-5 h-5 text-blue-400" />
                    Customer Group
                  </h2>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={hasCustomerGroup}
                      onChange={(e) => setHasCustomerGroup(e.target.checked)}
                      className="w-5 h-5 rounded border-[#2A2A2A] bg-[#0A0A0A] text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-300">Enable Customer Grouping</span>
                  </label>
                </div>

                {hasCustomerGroup && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-300 mb-2">
                        Customer Group Name <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="text"
                        value={customerGroupName}
                        onChange={(e) => setCustomerGroupName(e.target.value)}
                        placeholder={`${crmName || 'CRM'} Customers`}
                        className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
                      />
                    </div>

                    <div className="space-y-3">
                      <label className="flex items-center gap-3 p-3 bg-[#0A0A0A] rounded-lg cursor-pointer hover:bg-[#1A1A1A] transition">
                        <input
                          type="checkbox"
                          checked={allowCustomerSignup}
                          onChange={(e) => setAllowCustomerSignup(e.target.checked)}
                          className="w-5 h-5 rounded border-[#2A2A2A] bg-[#0A0A0A] text-blue-600 focus:ring-blue-500"
                        />
                        <div>
                          <p className="text-sm font-semibold text-white">Allow Customer Signup</p>
                          <p className="text-xs text-gray-400">Customers can self-register through Customer Portal</p>
                        </div>
                      </label>

                      <label className="flex items-center gap-3 p-3 bg-[#0A0A0A] rounded-lg cursor-pointer hover:bg-[#1A1A1A] transition">
                        <input
                          type="checkbox"
                          checked={requireApproval}
                          onChange={(e) => setRequireApproval(e.target.checked)}
                          className="w-5 h-5 rounded border-[#2A2A2A] bg-[#0A0A0A] text-blue-600 focus:ring-blue-500"
                        />
                        <div>
                          <p className="text-sm font-semibold text-white">Require Admin Approval</p>
                          <p className="text-xs text-gray-400">New signups must be approved by manager</p>
                        </div>
                      </label>

                      <label className="flex items-center gap-3 p-3 bg-[#0A0A0A] rounded-lg cursor-pointer hover:bg-[#1A1A1A] transition">
                        <input
                          type="checkbox"
                          checked={autoAssignToGroup}
                          onChange={(e) => setAutoAssignToGroup(e.target.checked)}
                          className="w-5 h-5 rounded border-[#2A2A2A] bg-[#0A0A0A] text-blue-600 focus:ring-blue-500"
                        />
                        <div>
                          <p className="text-sm font-semibold text-white">Auto-Assign to Group</p>
                          <p className="text-xs text-gray-400">Automatically assign new customers to this CRM group</p>
                        </div>
                      </label>
                    </div>

                    <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                      <p className="text-sm text-blue-300">
                        ✓ Customers will be tracked separately per CRM group
                      </p>
                      <p className="text-sm text-blue-300 mt-1">
                        ✓ All data will report to a dedicated section in Reports tab
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Statistics Configuration */}
              <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-cyan-400" />
                    Dashboard Statistics
                  </h2>
                  <button
                    onClick={handleAddStat}
                    className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 rounded-xl text-white transition flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Add Stat
                  </button>
                </div>

                <div className="space-y-3">
                  {crmStats.map((stat, index) => (
                    <div key={index} className="flex items-center gap-3 p-3 bg-[#0A0A0A] rounded-xl border border-[#2A2A2A]">
                      <input
                        type="text"
                        value={stat.label}
                        onChange={(e) => handleUpdateStat(index, { label: e.target.value })}
                        placeholder="Stat Label"
                        className="flex-1 px-3 py-2 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg text-white placeholder-gray-500 focus:border-cyan-500 focus:outline-none"
                      />
                      <input
                        type="text"
                        value={stat.key}
                        onChange={(e) => handleUpdateStat(index, { key: e.target.value })}
                        placeholder="data_key"
                        className="flex-1 px-3 py-2 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg text-white placeholder-gray-500 focus:border-cyan-500 focus:outline-none"
                      />
                      <select
                        value={stat.icon}
                        onChange={(e) => handleUpdateStat(index, { icon: e.target.value })}
                        className="px-3 py-2 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg text-white focus:border-cyan-500 focus:outline-none"
                      >
                        {availableIcons.map((icon) => (
                          <option key={icon.name} value={icon.name}>
                            {icon.name}
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={() => handleRemoveStat(index)}
                        className="p-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-lg text-red-400 transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}

                  {crmStats.length === 0 && (
                    <p className="text-center text-gray-500 py-4">No statistics configured. Click "Add Stat" to add one.</p>
                  )}
                </div>
              </div>

              {/* Tabs Configuration */}
              <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <FileText className="w-5 h-5 text-cyan-400" />
                    CRM Tabs
                  </h2>
                  <button
                    onClick={handleAddTab}
                    className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 rounded-xl text-white transition flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Add Tab
                  </button>
                </div>

                <div className="space-y-3">
                  {crmTabs.map((tab, index) => (
                    <div key={tab.id} className="p-4 bg-[#0A0A0A] rounded-xl border border-[#2A2A2A]">
                      <div className="flex items-center gap-3 mb-3">
                        <span className="px-3 py-1 bg-cyan-500/10 text-cyan-400 rounded-lg text-sm font-semibold border border-cyan-500/20">
                          Tab {index + 1}
                        </span>
                        <input
                          type="text"
                          value={tab.label}
                          onChange={(e) => handleUpdateTab(tab.id, { label: e.target.value })}
                          placeholder="Tab Label"
                          className="flex-1 px-3 py-2 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg text-white placeholder-gray-500 focus:border-cyan-500 focus:outline-none"
                        />
                        <select
                          value={tab.icon}
                          onChange={(e) => handleUpdateTab(tab.id, { icon: e.target.value })}
                          className="px-3 py-2 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg text-white focus:border-cyan-500 focus:outline-none"
                        >
                          {availableIcons.map((icon) => (
                            <option key={icon.name} value={icon.name}>
                              {icon.name}
                            </option>
                          ))}
                        </select>
                        {crmTabs.length > 1 && (
                          <button
                            onClick={() => handleRemoveTab(tab.id)}
                            className="p-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-lg text-red-400 transition"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 ml-20">
                        Fields configuration can be added after saving the template
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4">
                <button
                  onClick={handleSaveCRM}
                  className="flex-1 py-4 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-xl hover:from-green-700 hover:to-green-800 transition font-bold flex items-center justify-center gap-2"
                >
                  <Save className="w-5 h-5" />
                  {view === 'edit' ? 'Update CRM Template' : 'Create CRM Template'}
                </button>
                <button
                  onClick={() => setView('list')}
                  className="px-8 py-4 bg-[#2A2A2A] hover:bg-[#3A3A3A] border border-[#2A2A2A] rounded-xl text-white transition font-bold"
                >
                  Cancel
                </button>
              </div>
            </div>

            {/* Live Preview */}
            <div className="col-span-1">
              <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-6 sticky top-8">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <Eye className="w-5 h-5 text-cyan-400" />
                  Live Preview
                </h3>

                {/* Preview Header */}
                {crmName && (
                  <div className={`bg-gradient-to-r from-${crmColor}-600 to-${crmColor}-700 rounded-xl p-6 mb-4`}>
                    <div className="flex items-center gap-3">
                      {availableIcons.find(i => i.name === crmIcon) && (
                        <div className="w-12 h-12 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center border-2 border-white/20">
                          {(() => {
                            const IconComponent = availableIcons.find(i => i.name === crmIcon)?.component;
                            return IconComponent ? <IconComponent className="w-6 h-6 text-white" /> : null;
                          })()}
                        </div>
                      )}
                      <div>
                        <h4 className="text-lg font-bold text-white">{crmName || 'CRM Name'}</h4>
                        <p className="text-xs text-white/80">{crmType || 'CRM Type'}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Preview Stats */}
                {crmStats.length > 0 && (
                  <div className="space-y-2 mb-4">
                    <p className="text-xs font-semibold text-gray-400 mb-2">DASHBOARD STATS</p>
                    {crmStats.slice(0, 3).map((stat, index) => {
                      const IconComponent = availableIcons.find(i => i.name === stat.icon)?.component;
                      return (
                        <div key={index} className="flex items-center justify-between p-3 bg-[#0A0A0A] rounded-lg border border-[#2A2A2A]">
                          <div className="flex items-center gap-2">
                            {IconComponent && <IconComponent className="w-4 h-4 text-gray-400" />}
                            <p className="text-xs text-gray-400">{stat.label}</p>
                          </div>
                          <p className="text-sm font-bold text-white">--</p>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Preview Tabs */}
                {crmTabs.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-gray-400 mb-2">CRM TABS</p>
                    <div className="space-y-1">
                      {crmTabs.map((tab) => {
                        const IconComponent = availableIcons.find(i => i.name === tab.icon)?.component;
                        return (
                          <div key={tab.id} className="flex items-center gap-2 px-3 py-2 bg-[#0A0A0A] rounded-lg border border-[#2A2A2A]">
                            {IconComponent && <IconComponent className="w-4 h-4 text-cyan-400" />}
                            <span className="text-sm text-white">{tab.label}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (view === 'preview' && selectedTemplate) {
    const color = colorOptions.find(c => c.value === selectedTemplate.primaryColor);
    const IconComponent = availableIcons.find(i => i.name === selectedTemplate.icon)?.component;

    return (
      <div className="min-h-screen bg-[#0A0A0A] p-8">
        <div className="max-w-6xl mx-auto">
          <button
            onClick={() => setView('list')}
            className="flex items-center gap-2 px-4 py-2 bg-[#1A1A1A] hover:bg-[#2A2A2A] border border-[#2A2A2A] rounded-xl text-white transition mb-6"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to CRM List
          </button>

          {/* Preview Header */}
          <div className={`bg-gradient-to-r ${color?.gradient} rounded-2xl p-8 mb-6 border-b-4 border-${selectedTemplate.primaryColor}-500`}>
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-sm flex items-center justify-center border-2 border-white/20">
                {IconComponent && <IconComponent className="w-8 h-8 text-white" />}
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white mb-1">{selectedTemplate.name}</h1>
                <p className="text-white/80">{selectedTemplate.type}</p>
              </div>
            </div>

            {/* Preview Stats */}
            <div className="grid grid-cols-4 gap-4">
              {selectedTemplate.stats.map((stat, index) => {
                const StatIcon = availableIcons.find(i => i.name === stat.icon)?.component;
                return (
                  <div key={index} className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-white/80 text-sm">{stat.label}</p>
                      {StatIcon && <StatIcon className="w-5 h-5 text-white/60" />}
                    </div>
                    <p className="text-2xl font-bold text-white">--</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Preview Tabs */}
          <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-6">
            <h2 className="text-xl font-bold text-white mb-4">CRM Structure</h2>
            <div className="grid grid-cols-1 gap-3">
              {selectedTemplate.tabs.map((tab) => {
                const TabIcon = availableIcons.find(i => i.name === tab.icon)?.component;
                return (
                  <div key={tab.id} className="flex items-center gap-3 p-4 bg-[#0A0A0A] rounded-xl border border-[#2A2A2A]">
                    {TabIcon && <TabIcon className="w-5 h-5 text-cyan-400" />}
                    <div>
                      <p className="text-white font-semibold">{tab.label}</p>
                      <p className="text-xs text-gray-500">Tab ID: {tab.id}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // List View
  return (
    <div className="min-h-screen bg-[#0A0A0A] p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Sub CRM System Builder</h1>
              <p className="text-gray-400">Create and manage custom CRM systems with editable templates</p>
            </div>
            <button
              onClick={handleCreateNewCRM}
              className="px-6 py-3 bg-gradient-to-r from-cyan-600 to-cyan-700 text-white rounded-xl hover:from-cyan-700 hover:to-cyan-800 transition font-bold flex items-center gap-2 shadow-lg shadow-cyan-500/20"
            >
              <Plus className="w-5 h-5" />
              Create New CRM
            </button>
          </div>

          {/* Search and Filter */}
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search CRM templates..."
                className="w-full pl-12 pr-4 py-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl text-white placeholder-gray-500 focus:border-cyan-500 focus:outline-none"
              />
            </div>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-4 py-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl text-white focus:border-cyan-500 focus:outline-none"
            >
              <option value="all">All Types</option>
              {uniqueTypes.map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-6 mb-8">
          <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-6">
            <div className="flex items-center justify-between mb-2">
              <Package className="w-8 h-8 text-cyan-400" />
              <span className="text-xs px-2 py-1 bg-cyan-500/10 text-cyan-400 rounded-lg border border-cyan-500/20">Total</span>
            </div>
            <p className="text-2xl font-bold text-white mb-1">{crmTemplates.length}</p>
            <p className="text-sm text-gray-400">CRM Templates</p>
          </div>

          <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-6">
            <div className="flex items-center justify-between mb-2">
              <CheckCircle className="w-8 h-8 text-green-400" />
              <span className="text-xs px-2 py-1 bg-green-500/10 text-green-400 rounded-lg border border-green-500/20">Active</span>
            </div>
            <p className="text-2xl font-bold text-white mb-1">{crmTemplates.filter(t => t.isActive).length}</p>
            <p className="text-sm text-gray-400">Active Systems</p>
          </div>

          <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-6">
            <div className="flex items-center justify-between mb-2">
              <Tag className="w-8 h-8 text-purple-400" />
              <span className="text-xs px-2 py-1 bg-purple-500/10 text-purple-400 rounded-lg border border-purple-500/20">Categories</span>
            </div>
            <p className="text-2xl font-bold text-white mb-1">{uniqueTypes.length}</p>
            <p className="text-sm text-gray-400">CRM Types</p>
          </div>

          <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-6">
            <div className="flex items-center justify-between mb-2">
              <FileText className="w-8 h-8 text-blue-400" />
              <span className="text-xs px-2 py-1 bg-blue-500/10 text-blue-400 rounded-lg border border-blue-500/20">Tabs</span>
            </div>
            <p className="text-2xl font-bold text-white mb-1">{crmTemplates.reduce((sum, t) => sum + t.tabs.length, 0)}</p>
            <p className="text-sm text-gray-400">Total Tabs</p>
          </div>
        </div>

        {/* CRM Templates List */}
        <div className="grid grid-cols-1 gap-6">
          {filteredTemplates.map((template) => {
            const color = colorOptions.find(c => c.value === template.primaryColor);
            const IconComponent = availableIcons.find(i => i.name === template.icon)?.component;

            return (
              <div key={template.id} className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-4 flex-1">
                    <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${color?.gradient} flex items-center justify-center shadow-lg`}>
                      {IconComponent && <IconComponent className="w-8 h-8 text-white" />}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-xl font-bold text-white">{template.name}</h3>
                        <span className="px-3 py-1 bg-cyan-500/10 text-cyan-400 rounded-lg text-xs font-semibold border border-cyan-500/20">
                          {template.type}
                        </span>
                        {template.isActive && (
                          <span className="px-3 py-1 bg-green-500/10 text-green-400 rounded-lg text-xs font-semibold border border-green-500/20">
                            ACTIVE
                          </span>
                        )}
                      </div>
                      <p className="text-gray-400 text-sm mb-3">{template.description}</p>
                      <div className="flex items-center gap-6 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <FileText className="w-4 h-4" />
                          {template.tabs.length} Tabs
                        </span>
                        <span className="flex items-center gap-1">
                          <BarChart3 className="w-4 h-4" />
                          {template.stats.length} Stats
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          Created: {new Date(template.createdDate).toLocaleDateString()}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          Modified: {new Date(template.lastModified).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => handlePreviewCRM(template)}
                      className="p-3 bg-[#2A2A2A] hover:bg-[#3A3A3A] border border-[#2A2A2A] rounded-xl text-white transition"
                      title="Preview"
                    >
                      <Eye className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleEditCRM(template)}
                      className="p-3 bg-cyan-600/10 hover:bg-cyan-600/20 border border-cyan-500/20 rounded-xl text-cyan-400 transition"
                      title="Edit"
                    >
                      <Edit className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleDuplicateCRM(template)}
                      className="p-3 bg-blue-600/10 hover:bg-blue-600/20 border border-blue-500/20 rounded-xl text-blue-400 transition"
                      title="Duplicate"
                    >
                      <Copy className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleDeleteCRM(template.id)}
                      className="p-3 bg-red-600/10 hover:bg-red-600/20 border border-red-500/20 rounded-xl text-red-400 transition"
                      title="Delete"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Tabs Preview */}
                <div className="flex flex-wrap gap-2">
                  {template.tabs.map((tab) => {
                    const TabIcon = availableIcons.find(i => i.name === tab.icon)?.component;
                    return (
                      <div key={tab.id} className="px-3 py-1.5 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg flex items-center gap-2">
                        {TabIcon && <TabIcon className="w-4 h-4 text-gray-400" />}
                        <span className="text-sm text-gray-300">{tab.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {filteredTemplates.length === 0 && (
            <div className="text-center py-12 bg-[#1A1A1A] rounded-xl border border-[#2A2A2A]">
              <Package className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">No CRM Templates Found</h3>
              <p className="text-gray-400 mb-4">Try adjusting your search or filter criteria</p>
              <button
                onClick={handleCreateNewCRM}
                className="px-6 py-3 bg-gradient-to-r from-cyan-600 to-cyan-700 text-white rounded-xl hover:from-cyan-700 hover:to-cyan-800 transition font-bold inline-flex items-center gap-2"
              >
                <Plus className="w-5 h-5" />
                Create Your First CRM
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
