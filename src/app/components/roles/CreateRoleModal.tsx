/**
 * Create Role Modal Component
 * Complete role creation form with permissions and validation
 * Deep orange dark theme (#ea580c, #0A0A0A backgrounds)
 */

import { useState, FormEvent } from 'react';
import {
  Shield, Crown, Star, Target, Users, Briefcase, Key, AlertCircle,
  Info, CheckCircle, Plus, X, ChevronDown, ChevronUp, Zap, Lock,
  Eye, Settings, Database, FileText, CreditCard, Activity, Globe,
  Building2, Package, Truck, Megaphone, Video, Calendar
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import RoleService from '../../lib/services/roleService';
import { FormModal } from '../ui/modal';
import { TextInput } from '../ui/input/TextInput';
import { TextArea } from '../ui/input/TextArea';
import { Select } from '../ui/input/Select';
import { Checkbox } from '../ui/input/Checkbox';

interface CreateRoleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRoleCreated: (role: any) => void;
}

interface RoleFormData {
  name: string;
  description: string;
  level: number;
  color: string;
  icon: string;
  inheritsFrom: string;
  isSystem: boolean;
  permissions: string[];
}

// Available icons for roles
const availableIcons = [
  { id: 'crown', label: 'Crown', icon: Crown },
  { id: 'shield', label: 'Shield', icon: Shield },
  { id: 'star', label: 'Star', icon: Star },
  { id: 'target', label: 'Target', icon: Target },
  { id: 'users', label: 'Users', icon: Users },
  { id: 'briefcase', label: 'Briefcase', icon: Briefcase },
  { id: 'zap', label: 'Lightning', icon: Zap },
  { id: 'key', label: 'Key', icon: Key },
  { id: 'lock', label: 'Lock', icon: Lock },
  { id: 'eye', label: 'Eye', icon: Eye },
  { id: 'settings', label: 'Settings', icon: Settings },
  { id: 'database', label: 'Database', icon: Database },
  { id: 'activity', label: 'Activity', icon: Activity },
];

// Available colors for roles
const availableColors = [
  { id: 'purple', label: 'Purple', hex: '#9333ea' },
  { id: 'indigo', label: 'Indigo', hex: '#6366f1' },
  { id: 'blue', label: 'Blue', hex: '#3b82f6' },
  { id: 'cyan', label: 'Cyan', hex: '#06b6d4' },
  { id: 'teal', label: 'Teal', hex: '#14b8a6' },
  { id: 'green', label: 'Green', hex: '#22c55e' },
  { id: 'lime', label: 'Lime', hex: '#84cc16' },
  { id: 'yellow', label: 'Yellow', hex: '#eab308' },
  { id: 'orange', label: 'Orange', hex: '#ea580c' },
  { id: 'red', label: 'Red', hex: '#ef4444' },
  { id: 'pink', label: 'Pink', hex: '#ec4899' },
  { id: 'gray', label: 'Gray', hex: '#6b7280' },
];

// Permission categories and individual permissions
const permissionCategories = [
  {
    id: 'user_management',
    name: 'User Management',
    icon: Users,
    permissions: [
      { id: 'users.view', label: 'View Users', description: 'View user accounts and profiles' },
      { id: 'users.create', label: 'Create Users', description: 'Create new user accounts' },
      { id: 'users.edit', label: 'Edit Users', description: 'Modify user information' },
      { id: 'users.delete', label: 'Delete Users', description: 'Delete user accounts' },
      { id: 'users.assign_roles', label: 'Assign Roles', description: 'Assign roles to users' },
    ]
  },
  {
    id: 'role_management',
    name: 'Role Management',
    icon: Shield,
    permissions: [
      { id: 'roles.view', label: 'View Roles', description: 'View role definitions' },
      { id: 'roles.create', label: 'Create Roles', description: 'Create new roles' },
      { id: 'roles.edit', label: 'Edit Roles', description: 'Modify role settings' },
      { id: 'roles.delete', label: 'Delete Roles', description: 'Delete roles' },
      { id: 'permissions.manage', label: 'Manage Permissions', description: 'Assign/revoke permissions' },
    ]
  },
  {
    id: 'customer_management',
    name: 'Customer Management',
    icon: Building2,
    permissions: [
      { id: 'customers.view', label: 'View Customers', description: 'View customer information' },
      { id: 'customers.create', label: 'Create Customers', description: 'Add new customers' },
      { id: 'customers.edit', label: 'Edit Customers', description: 'Modify customer data' },
      { id: 'customers.delete', label: 'Delete Customers', description: 'Remove customers' },
    ]
  },
  {
    id: 'work_orders',
    name: 'Work Orders',
    icon: Briefcase,
    permissions: [
      { id: 'work_orders.view', label: 'View Work Orders', description: 'View work order details' },
      { id: 'work_orders.create', label: 'Create Work Orders', description: 'Create new work orders' },
      { id: 'work_orders.edit', label: 'Edit Work Orders', description: 'Modify work orders' },
      { id: 'work_orders.delete', label: 'Delete Work Orders', description: 'Remove work orders' },
      { id: 'work_orders.assign', label: 'Assign Work Orders', description: 'Assign work to technicians' },
    ]
  },
  {
    id: 'financial',
    name: 'Financial',
    icon: CreditCard,
    permissions: [
      { id: 'invoices.view', label: 'View Invoices', description: 'View invoice details' },
      { id: 'invoices.create', label: 'Create Invoices', description: 'Create new invoices' },
      { id: 'invoices.edit', label: 'Edit Invoices', description: 'Modify invoices' },
      { id: 'invoices.delete', label: 'Delete Invoices', description: 'Remove invoices' },
      { id: 'payments.process', label: 'Process Payments', description: 'Process customer payments' },
      { id: 'reports.financial', label: 'Financial Reports', description: 'View financial reports' },
    ]
  },
  {
    id: 'reporting',
    name: 'Reporting & Analytics',
    icon: Activity,
    permissions: [
      { id: 'reports.view', label: 'View Reports', description: 'Access report dashboard' },
      { id: 'reports.create', label: 'Create Reports', description: 'Create custom reports' },
      { id: 'reports.export', label: 'Export Reports', description: 'Export report data' },
      { id: 'analytics.view', label: 'View Analytics', description: 'View analytics dashboard' },
    ]
  },
  {
    id: 'settings',
    name: 'System Settings',
    icon: Settings,
    permissions: [
      { id: 'settings.view', label: 'View Settings', description: 'View system settings' },
      { id: 'settings.edit', label: 'Edit Settings', description: 'Modify system settings' },
      { id: 'company.edit', label: 'Edit Company Profile', description: 'Modify company information' },
      { id: 'integrations.manage', label: 'Manage Integrations', description: 'Configure integrations' },
    ]
  },
];

export default function CreateRoleModal({ isOpen, onClose, onRoleCreated }: CreateRoleModalProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<string[]>(['user_management']);
  
  const [formData, setFormData] = useState<RoleFormData>({
    name: '',
    description: '',
    level: 5,
    color: 'blue',
    icon: 'users',
    inheritsFrom: 'none',
    isSystem: false,
    permissions: []
  });

  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // Predefined roles that can be inherited from
  const inheritableRoles = [
    { value: 'none', label: 'None - Start from scratch' },
    { value: 'business_owner', label: 'Business Owner - Full access' },
    { value: 'administrator', label: 'Administrator - Admin access' },
    { value: 'manager', label: 'Manager - Management access' },
    { value: 'employee', label: 'Employee - Standard access' },
    { value: 'field_tech', label: 'Field Tech - Field access' },
  ];

  const handleInputChange = (field: keyof RoleFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setValidationErrors([]);
  };

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev =>
      prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const togglePermission = (permissionId: string) => {
    setFormData(prev => ({
      ...prev,
      permissions: prev.permissions.includes(permissionId)
        ? prev.permissions.filter(p => p !== permissionId)
        : [...prev.permissions, permissionId]
    }));
  };

  const toggleCategoryPermissions = (category: typeof permissionCategories[0]) => {
    const categoryPermIds = category.permissions.map(p => p.id);
    const allSelected = categoryPermIds.every(id => formData.permissions.includes(id));
    
    if (allSelected) {
      // Deselect all
      setFormData(prev => ({
        ...prev,
        permissions: prev.permissions.filter(p => !categoryPermIds.includes(p))
      }));
    } else {
      // Select all
      setFormData(prev => ({
        ...prev,
        permissions: [...new Set([...prev.permissions, ...categoryPermIds])]
      }));
    }
  };

  const validateForm = (): boolean => {
    const errors: string[] = [];

    if (!formData.name.trim()) {
      errors.push('Role name is required');
    }
    
    if (formData.name.length < 2) {
      errors.push('Role name must be at least 2 characters');
    }

    if (!formData.description.trim()) {
      errors.push('Description is required');
    }

    if (formData.level < 0 || formData.level > 10) {
      errors.push('Level must be between 0 and 10');
    }

    if (formData.permissions.length === 0) {
      errors.push('At least one permission must be selected');
    }

    setValidationErrors(errors);
    return errors.length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error('Please fix the errors before saving');
      return;
    }

    try {
      setIsSaving(true);

      // Create role using the service
      const newRole = await RoleService.createRole(formData);

      toast.success(`Role "${formData.name}" created successfully!`);
      onRoleCreated(newRole);
      handleClose();
    } catch (error: any) {
      console.error('Error creating role:', error);
      toast.error(error.message || 'Failed to create role. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    setFormData({
      name: '',
      description: '',
      level: 5,
      color: 'blue',
      icon: 'users',
      inheritsFrom: 'none',
      isSystem: false,
      permissions: []
    });
    setValidationErrors([]);
    setExpandedCategories(['user_management']);
    onClose();
  };

  const getSelectedIcon = () => {
    const iconObj = availableIcons.find(i => i.id === formData.icon);
    return iconObj ? iconObj.icon : Users;
  };

  const SelectedIcon = getSelectedIcon();

  return (
    <FormModal
      isOpen={isOpen}
      onClose={handleClose}
      title="Create New Role"
      size="xl"
      onSubmit={handleSubmit}
      confirmText={isSaving ? 'Creating Role...' : 'Create Role'}
      cancelText="Cancel"
      isLoading={isSaving}
    >
      <div className="space-y-6">
        {/* Validation Errors */}
        {validationErrors.length > 0 && (
          <div className="p-4 bg-red-600/10 border border-red-500/30 rounded-xl">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-red-400 mb-1">Please fix the following errors:</p>
                <ul className="text-sm text-red-300 space-y-0.5 list-disc list-inside">
                  {validationErrors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Info Banner */}
        <div className="p-4 bg-blue-600/10 border border-blue-500/30 rounded-xl">
          <div className="flex items-start gap-2">
            <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-blue-300">
                Create a custom role to define specific permissions and access levels for your team members.
                You can inherit permissions from existing roles or start from scratch.
              </p>
            </div>
          </div>
        </div>

        {/* Basic Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Shield className="w-5 h-5 text-orange-400" />
            Basic Information
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <TextInput
                label="Role Name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="e.g., Senior Manager, Field Supervisor"
                required
                icon={<Shield className="w-4 h-4" />}
              />
            </div>

            <div className="md:col-span-2">
              <TextArea
                label="Description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Describe the purpose and responsibilities of this role..."
                required
                rows={3}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2">
                Access Level (0-10)
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="0"
                  max="10"
                  value={formData.level}
                  onChange={(e) => handleInputChange('level', parseInt(e.target.value))}
                  className="flex-1 h-2 bg-[#0A0A0A] rounded-lg appearance-none cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, #ea580c 0%, #ea580c ${formData.level * 10}%, #0A0A0A ${formData.level * 10}%, #0A0A0A 100%)`
                  }}
                />
                <span className="w-12 px-3 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-center text-white font-bold">
                  {formData.level}
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Higher levels have more authority (0 = highest, 10 = lowest)
              </p>
            </div>

            <Select
              label="Inherit Permissions From"
              value={formData.inheritsFrom}
              onChange={(e) => handleInputChange('inheritsFrom', e.target.value)}
              options={inheritableRoles}
            />
          </div>
        </div>

        {/* Visual Customization */}
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Star className="w-5 h-5 text-orange-400" />
            Visual Customization
          </h3>

          {/* Color Selection */}
          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-3">Role Color</label>
            <div className="grid grid-cols-6 md:grid-cols-12 gap-2">
              {availableColors.map((color) => (
                <button
                  key={color.id}
                  type="button"
                  onClick={() => handleInputChange('color', color.id)}
                  className={`relative w-full aspect-square rounded-lg transition-all ${
                    formData.color === color.id
                      ? 'ring-2 ring-orange-500 ring-offset-2 ring-offset-[#0A0A0A] scale-110'
                      : 'hover:scale-105'
                  }`}
                  style={{ backgroundColor: color.hex }}
                  title={color.label}
                >
                  {formData.color === color.id && (
                    <CheckCircle className="w-4 h-4 text-white absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Icon Selection */}
          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-3">Role Icon</label>
            <div className="grid grid-cols-6 md:grid-cols-13 gap-2">
              {availableIcons.map((iconObj) => {
                const IconComponent = iconObj.icon;
                const isSelected = formData.icon === iconObj.id;
                return (
                  <button
                    key={iconObj.id}
                    type="button"
                    onClick={() => handleInputChange('icon', iconObj.id)}
                    className={`aspect-square rounded-lg p-3 transition-all ${
                      isSelected
                        ? 'bg-orange-600/20 border-2 border-orange-500 scale-110'
                        : 'bg-[#0A0A0A] border border-[#2A2A2A] hover:bg-[#2A2A2A] hover:scale-105'
                    }`}
                    title={iconObj.label}
                  >
                    <IconComponent className={`w-full h-full ${isSelected ? 'text-orange-400' : 'text-gray-400'}`} />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Preview */}
          <div className="p-4 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl">
            <label className="block text-sm font-semibold text-gray-300 mb-3">Preview</label>
            <div className="flex items-center gap-3 p-4 bg-[#1A1A1A] rounded-lg border border-[#2A2A2A]">
              <div
                className={`w-12 h-12 rounded-lg flex items-center justify-center`}
                style={{ backgroundColor: availableColors.find(c => c.id === formData.color)?.hex }}
              >
                <SelectedIcon className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-white font-bold">{formData.name || 'Role Name'}</p>
                <p className="text-sm text-gray-400">Level {formData.level} • {formData.permissions.length} permissions</p>
              </div>
            </div>
          </div>
        </div>

        {/* Permissions */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Key className="w-5 h-5 text-orange-400" />
              Permissions ({formData.permissions.length} selected)
            </h3>
            <button
              type="button"
              onClick={() => {
                const allPerms = permissionCategories.flatMap(cat => cat.permissions.map(p => p.id));
                if (formData.permissions.length === allPerms.length) {
                  setFormData(prev => ({ ...prev, permissions: [] }));
                  toast.info('All permissions cleared');
                } else {
                  setFormData(prev => ({ ...prev, permissions: allPerms }));
                  toast.success('All permissions selected');
                }
              }}
              className="px-3 py-1.5 bg-orange-600/20 text-orange-400 text-sm rounded-lg hover:bg-orange-600/30 transition border border-orange-500/30"
            >
              {formData.permissions.length === permissionCategories.flatMap(cat => cat.permissions).length ? 'Clear All' : 'Select All'}
            </button>
          </div>

          <div className="max-h-[400px] overflow-y-auto space-y-3 pr-2">
            {permissionCategories.map((category) => {
              const CategoryIcon = category.icon;
              const categoryPermIds = category.permissions.map(p => p.id);
              const selectedCount = categoryPermIds.filter(id => formData.permissions.includes(id)).length;
              const isExpanded = expandedCategories.includes(category.id);
              const allSelected = selectedCount === categoryPermIds.length;

              return (
                <div key={category.id} className="bg-[#0A0A0A] rounded-xl border border-[#2A2A2A] overflow-hidden">
                  <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-[#1A1A1A] transition"
                    onClick={() => toggleCategory(category.id)}
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <CategoryIcon className="w-5 h-5 text-orange-400" />
                      <div>
                        <h4 className="font-bold text-white">{category.name}</h4>
                        <p className="text-xs text-gray-400">{selectedCount}/{categoryPermIds.length} selected</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleCategoryPermissions(category);
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                          allSelected
                            ? 'bg-green-600/20 text-green-400 border border-green-500/30'
                            : 'bg-gray-600/20 text-gray-400 border border-gray-500/30 hover:bg-gray-600/30'
                        }`}
                      >
                        {allSelected ? 'All Selected' : 'Select All'}
                      </button>
                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5 text-gray-400" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-gray-400" />
                      )}
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="p-4 pt-0 space-y-2">
                      {category.permissions.map((permission) => {
                        const isSelected = formData.permissions.includes(permission.id);
                        return (
                          <label
                            key={permission.id}
                            className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer transition ${
                              isSelected
                                ? 'bg-orange-600/10 border border-orange-500/30'
                                : 'bg-[#1A1A1A] border border-[#2A2A2A] hover:bg-[#2A2A2A]'
                            }`}
                          >
                            <Checkbox
                              checked={isSelected}
                              onChange={() => togglePermission(permission.id)}
                            />
                            <div className="flex-1">
                              <p className={`text-sm font-semibold ${isSelected ? 'text-orange-400' : 'text-white'}`}>
                                {permission.label}
                              </p>
                              <p className="text-xs text-gray-400 mt-0.5">{permission.description}</p>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* System Role Toggle */}
        <div className="p-4 bg-yellow-600/10 border border-yellow-500/30 rounded-xl">
          <label className="flex items-start gap-3 cursor-pointer">
            <Checkbox
              checked={formData.isSystem}
              onChange={() => handleInputChange('isSystem', !formData.isSystem)}
            />
            <div>
              <p className="text-sm font-semibold text-yellow-400">Mark as System Role</p>
              <p className="text-xs text-yellow-300 mt-1">
                System roles cannot be deleted and have special protections. Only use this for critical roles.
              </p>
            </div>
          </label>
        </div>
      </div>
    </FormModal>
  );
}
