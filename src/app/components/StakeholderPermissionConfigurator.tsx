// Stakeholder Permission Configurator
// Created: 2026-01-27 - Day 4
// Visual permission editor with module and feature-level controls

import { useState, useEffect } from 'react';
import {
  Shield, Lock, Unlock, Eye, Edit, Trash2, Upload, Download,
  Settings, Check, X, AlertCircle, Info, Save, RefreshCw,
  FolderOpen, Workflow, Image as ImageIcon, Share2, MessageSquare,
  Globe, Users, Wrench, Database, Sparkles, ChevronDown, ChevronRight,
  Copy, Star, Zap
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner@2.0.3';

interface PermissionModule {
  id: string;
  name: string;
  icon: any;
  description: string;
  features: PermissionFeature[];
}

interface PermissionFeature {
  id: string;
  name: string;
  description: string;
  actions: ('view' | 'create' | 'edit' | 'delete' | 'upload' | 'download' | 'share')[];
}

interface PermissionConfig {
  module: string;
  enabled: boolean;
  permissions: Record<string, boolean>;
  limits?: Record<string, any>;
}

interface StakeholderPermissionConfiguratorProps {
  stakeholderId: string;
  onSave?: () => void;
  viewMode?: 'admin' | 'readonly';
}

// Permission modules definition
const PERMISSION_MODULES: PermissionModule[] = [
  {
    id: 'folders',
    name: 'File Management',
    icon: FolderOpen,
    description: 'Access to files and folders',
    features: [
      {
        id: 'files',
        name: 'Files',
        description: 'Manage files and documents',
        actions: ['view', 'upload', 'download', 'delete', 'share']
      },
      {
        id: 'folders',
        name: 'Folders',
        description: 'Create and manage folders',
        actions: ['view', 'create', 'edit', 'delete']
      }
    ]
  },
  {
    id: 'workflows',
    name: 'Workflows',
    icon: Workflow,
    description: 'Access to workflow management',
    features: [
      {
        id: 'view_workflows',
        name: 'View Workflows',
        description: 'See assigned workflows',
        actions: ['view']
      },
      {
        id: 'submit_workflows',
        name: 'Submit to Workflows',
        description: 'Start new workflow instances',
        actions: ['create']
      },
      {
        id: 'manage_workflows',
        name: 'Manage Workflows',
        description: 'Edit and manage workflows',
        actions: ['view', 'create', 'edit', 'delete']
      }
    ]
  },
  {
    id: 'designs',
    name: 'Design Gallery',
    icon: ImageIcon,
    description: 'Access to design gallery and CAD',
    features: [
      {
        id: 'view_designs',
        name: 'View Designs',
        description: 'Browse design gallery',
        actions: ['view']
      },
      {
        id: 'upload_designs',
        name: 'Upload Designs',
        description: 'Upload new designs',
        actions: ['upload']
      },
      {
        id: 'manage_designs',
        name: 'Manage Designs',
        description: 'Edit and delete designs',
        actions: ['edit', 'delete']
      }
    ]
  },
  {
    id: 'social_media',
    name: 'Social Media',
    icon: Share2,
    description: 'Social media posting and management',
    features: [
      {
        id: 'view_posts',
        name: 'View Posts',
        description: 'See social media posts',
        actions: ['view']
      },
      {
        id: 'create_posts',
        name: 'Create Posts',
        description: 'Create new posts',
        actions: ['create']
      },
      {
        id: 'manage_posts',
        name: 'Manage Posts',
        description: 'Edit and delete posts',
        actions: ['edit', 'delete']
      }
    ]
  },
  {
    id: 'communication',
    name: 'Communication',
    icon: MessageSquare,
    description: 'Messaging and communication tools',
    features: [
      {
        id: 'messages',
        name: 'Messages',
        description: 'Send and receive messages',
        actions: ['view', 'create']
      },
      {
        id: 'notifications',
        name: 'Notifications',
        description: 'Receive system notifications',
        actions: ['view']
      }
    ]
  },
  {
    id: 'portal',
    name: 'Portal Access',
    icon: Globe,
    description: 'Portal login and access control',
    features: [
      {
        id: 'portal_access',
        name: 'Portal Login',
        description: 'Access to stakeholder portal',
        actions: ['view']
      },
      {
        id: 'portal_users',
        name: 'Portal Users',
        description: 'Manage portal user accounts',
        actions: ['view', 'create', 'edit', 'delete']
      }
    ]
  },
  {
    id: 'data',
    name: 'Data Access',
    icon: Database,
    description: 'View and edit stakeholder data',
    features: [
      {
        id: 'view_profile',
        name: 'View Profile',
        description: 'See company profile and details',
        actions: ['view']
      },
      {
        id: 'edit_profile',
        name: 'Edit Profile',
        description: 'Update company information',
        actions: ['edit']
      }
    ]
  },
  {
    id: 'ai_tools',
    name: 'AI Tools',
    icon: Sparkles,
    description: 'AI-powered features and automation',
    features: [
      {
        id: 'ai_chat',
        name: 'AI Chat',
        description: 'AI workflow assistant',
        actions: ['view', 'create']
      },
      {
        id: 'ai_automation',
        name: 'AI Automation',
        description: 'Automated workflows and suggestions',
        actions: ['view']
      }
    ]
  }
];

// Permission templates
const PERMISSION_TEMPLATES = [
  {
    id: 'full_access',
    name: 'Full Access',
    description: 'Complete access to all features',
    icon: Unlock,
    color: 'green',
    apply: () => {
      const config: Record<string, PermissionConfig> = {};
      PERMISSION_MODULES.forEach(module => {
        const permissions: Record<string, boolean> = {};
        module.features.forEach(feature => {
          feature.actions.forEach(action => {
            permissions[`${feature.id}_${action}`] = true;
          });
        });
        config[module.id] = {
          module: module.id,
          enabled: true,
          permissions,
          limits: module.id === 'folders' ? { storage_quota_gb: 10 } : {}
        };
      });
      return config;
    }
  },
  {
    id: 'read_only',
    name: 'Read Only',
    description: 'View access only, no editing',
    icon: Eye,
    color: 'blue',
    apply: () => {
      const config: Record<string, PermissionConfig> = {};
      PERMISSION_MODULES.forEach(module => {
        const permissions: Record<string, boolean> = {};
        module.features.forEach(feature => {
          feature.actions.forEach(action => {
            permissions[`${feature.id}_${action}`] = action === 'view';
          });
        });
        config[module.id] = {
          module: module.id,
          enabled: true,
          permissions,
          limits: module.id === 'folders' ? { storage_quota_gb: 5 } : {}
        };
      });
      return config;
    }
  },
  {
    id: 'vendor_standard',
    name: 'Vendor Standard',
    description: 'Standard vendor permissions',
    icon: Users,
    color: 'purple',
    apply: () => {
      return {
        folders: {
          module: 'folders',
          enabled: true,
          permissions: {
            files_view: true,
            files_upload: true,
            files_download: true,
            folders_view: true
          },
          limits: { storage_quota_gb: 5 }
        },
        workflows: {
          module: 'workflows',
          enabled: true,
          permissions: {
            view_workflows_view: true,
            submit_workflows_create: true
          }
        },
        communication: {
          module: 'communication',
          enabled: true,
          permissions: {
            messages_view: true,
            messages_create: true,
            notifications_view: true
          }
        },
        portal: {
          module: 'portal',
          enabled: true,
          permissions: {
            portal_access_view: true
          }
        },
        data: {
          module: 'data',
          enabled: true,
          permissions: {
            view_profile_view: true,
            edit_profile_edit: true
          }
        }
      };
    }
  },
  {
    id: 'subcontractor',
    name: 'Subcontractor',
    description: 'Standard subcontractor access',
    icon: Wrench,
    color: 'orange',
    apply: () => {
      return {
        folders: {
          module: 'folders',
          enabled: true,
          permissions: {
            files_view: true,
            files_upload: true,
            files_download: true,
            folders_view: true
          },
          limits: { storage_quota_gb: 3 }
        },
        workflows: {
          module: 'workflows',
          enabled: true,
          permissions: {
            view_workflows_view: true,
            submit_workflows_create: true
          }
        },
        designs: {
          module: 'designs',
          enabled: true,
          permissions: {
            view_designs_view: true,
            upload_designs_upload: true
          }
        },
        communication: {
          module: 'communication',
          enabled: true,
          permissions: {
            messages_view: true,
            messages_create: true,
            notifications_view: true
          }
        },
        portal: {
          module: 'portal',
          enabled: true,
          permissions: {
            portal_access_view: true
          }
        }
      };
    }
  },
  {
    id: 'limited',
    name: 'Limited Access',
    description: 'Minimal permissions',
    icon: Lock,
    color: 'red',
    apply: () => {
      return {
        portal: {
          module: 'portal',
          enabled: true,
          permissions: {
            portal_access_view: true
          }
        },
        data: {
          module: 'data',
          enabled: true,
          permissions: {
            view_profile_view: true
          }
        },
        communication: {
          module: 'communication',
          enabled: true,
          permissions: {
            messages_view: true,
            notifications_view: true
          }
        }
      };
    }
  }
];

export default function StakeholderPermissionConfigurator({
  stakeholderId,
  onSave,
  viewMode = 'admin'
}: StakeholderPermissionConfiguratorProps) {
  const [permissions, setPermissions] = useState<Record<string, PermissionConfig>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expandedModules, setExpandedModules] = useState<string[]>(['folders', 'portal']);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    loadPermissions();
  }, [stakeholderId]);

  const loadPermissions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('stakeholder_permissions')
        .select('*')
        .eq('stakeholder_id', stakeholderId);

      if (error) throw error;

      const config: Record<string, PermissionConfig> = {};
      data?.forEach(perm => {
        config[perm.module] = {
          module: perm.module,
          enabled: perm.enabled,
          permissions: perm.permissions || {},
          limits: perm.limits || {}
        };
      });

      setPermissions(config);
    } catch (error: any) {
      console.error('Error loading permissions:', error);
      toast.error('Failed to load permissions');
    } finally {
      setLoading(false);
    }
  };

  const handleSavePermissions = async () => {
    setSaving(true);
    try {
      // Delete existing permissions
      await supabase
        .from('stakeholder_permissions')
        .delete()
        .eq('stakeholder_id', stakeholderId);

      // Insert new permissions
      const permissionsToInsert = Object.values(permissions).map(perm => ({
        stakeholder_id: stakeholderId,
        module: perm.module,
        enabled: perm.enabled,
        permissions: perm.permissions,
        limits: perm.limits
      }));

      const { error } = await supabase
        .from('stakeholder_permissions')
        .insert(permissionsToInsert);

      if (error) throw error;

      toast.success('Permissions saved successfully');
      setHasChanges(false);
      onSave?.();
    } catch (error: any) {
      console.error('Error saving permissions:', error);
      toast.error('Failed to save permissions');
    } finally {
      setSaving(false);
    }
  };

  const handleApplyTemplate = (templateId: string) => {
    const template = PERMISSION_TEMPLATES.find(t => t.id === templateId);
    if (!template) return;

    const newPermissions = template.apply();
    setPermissions(newPermissions);
    setHasChanges(true);
    toast.success(`Applied "${template.name}" template`);
  };

  const handleToggleModule = (moduleId: string) => {
    setPermissions(prev => ({
      ...prev,
      [moduleId]: {
        ...prev[moduleId],
        module: moduleId,
        enabled: !prev[moduleId]?.enabled,
        permissions: prev[moduleId]?.permissions || {},
        limits: prev[moduleId]?.limits || {}
      }
    }));
    setHasChanges(true);
  };

  const handleTogglePermission = (moduleId: string, permissionKey: string) => {
    setPermissions(prev => {
      const modulePerms = prev[moduleId]?.permissions || {};
      return {
        ...prev,
        [moduleId]: {
          ...prev[moduleId],
          module: moduleId,
          enabled: prev[moduleId]?.enabled ?? true,
          permissions: {
            ...modulePerms,
            [permissionKey]: !modulePerms[permissionKey]
          },
          limits: prev[moduleId]?.limits || {}
        }
      };
    });
    setHasChanges(true);
  };

  const handleUpdateLimit = (moduleId: string, limitKey: string, value: any) => {
    setPermissions(prev => ({
      ...prev,
      [moduleId]: {
        ...prev[moduleId],
        module: moduleId,
        enabled: prev[moduleId]?.enabled ?? true,
        permissions: prev[moduleId]?.permissions || {},
        limits: {
          ...prev[moduleId]?.limits,
          [limitKey]: value
        }
      }
    }));
    setHasChanges(true);
  };

  const toggleExpandModule = (moduleId: string) => {
    setExpandedModules(prev =>
      prev.includes(moduleId)
        ? prev.filter(id => id !== moduleId)
        : [...prev, moduleId]
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw size={48} className="text-[#ea580c] animate-spin" />
      </div>
    );
  }

  const isReadOnly = viewMode === 'readonly';

  return (
    <div className="space-y-6">
      {/* Header with Templates */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-xl font-semibold text-white mb-2">Permission Configuration</h3>
          <p className="text-sm text-gray-400">
            Control module access and feature permissions for this stakeholder
          </p>
        </div>
        {!isReadOnly && hasChanges && (
          <button
            onClick={handleSavePermissions}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-[#ea580c] hover:bg-[#ea580c]/80 rounded-lg transition-colors disabled:opacity-50"
          >
            {saving ? (
              <>
                <RefreshCw size={18} className="animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Save size={18} />
                <span>Save Changes</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Permission Templates */}
      {!isReadOnly && (
        <div className="p-4 bg-white/5 border border-white/10 rounded-lg">
          <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <Star size={16} className="text-yellow-400" />
            Quick Apply Templates
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {PERMISSION_TEMPLATES.map(template => {
              const Icon = template.icon;
              return (
                <button
                  key={template.id}
                  onClick={() => handleApplyTemplate(template.id)}
                  className={`p-3 border rounded-lg hover:bg-white/10 transition-colors text-left ${
                    template.color === 'green' ? 'border-green-500/30' :
                    template.color === 'blue' ? 'border-blue-500/30' :
                    template.color === 'purple' ? 'border-purple-500/30' :
                    template.color === 'orange' ? 'border-orange-500/30' :
                    'border-red-500/30'
                  }`}
                >
                  <Icon size={20} className={`mb-2 ${
                    template.color === 'green' ? 'text-green-400' :
                    template.color === 'blue' ? 'text-blue-400' :
                    template.color === 'purple' ? 'text-purple-400' :
                    template.color === 'orange' ? 'text-orange-400' :
                    'text-red-400'
                  }`} />
                  <p className="text-sm font-medium text-white mb-1">{template.name}</p>
                  <p className="text-xs text-gray-400">{template.description}</p>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Permission Modules */}
      <div className="space-y-3">
        {PERMISSION_MODULES.map(module => {
          const Icon = module.icon;
          const moduleConfig = permissions[module.id];
          const isEnabled = moduleConfig?.enabled ?? false;
          const isExpanded = expandedModules.includes(module.id);

          return (
            <div
              key={module.id}
              className={`bg-white/5 border rounded-lg transition-all ${
                isEnabled ? 'border-[#ea580c]/30' : 'border-white/10'
              }`}
            >
              {/* Module Header */}
              <div className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1">
                  <Icon size={24} className={isEnabled ? 'text-[#ea580c]' : 'text-gray-500'} />
                  <div className="flex-1">
                    <h4 className="text-white font-medium">{module.name}</h4>
                    <p className="text-sm text-gray-400">{module.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {!isReadOnly && (
                    <button
                      onClick={() => handleToggleModule(module.id)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        isEnabled ? 'bg-[#ea580c]' : 'bg-gray-600'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          isEnabled ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  )}
                  <button
                    onClick={() => toggleExpandModule(module.id)}
                    className="p-1 hover:bg-white/10 rounded transition-colors"
                  >
                    {isExpanded ? (
                      <ChevronDown size={20} className="text-gray-400" />
                    ) : (
                      <ChevronRight size={20} className="text-gray-400" />
                    )}
                  </button>
                </div>
              </div>

              {/* Module Features */}
              {isExpanded && isEnabled && (
                <div className="px-4 pb-4 border-t border-white/10 pt-4">
                  <div className="space-y-4">
                    {module.features.map(feature => (
                      <div key={feature.id} className="space-y-2">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="text-sm font-medium text-white">{feature.name}</p>
                            <p className="text-xs text-gray-400">{feature.description}</p>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {feature.actions.map(action => {
                            const permKey = `${feature.id}_${action}`;
                            const isChecked = moduleConfig?.permissions?.[permKey] ?? false;
                            
                            return (
                              <button
                                key={action}
                                onClick={() => !isReadOnly && handleTogglePermission(module.id, permKey)}
                                disabled={isReadOnly}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                                  isChecked
                                    ? 'bg-[#ea580c] text-white'
                                    : 'bg-white/10 text-gray-400 hover:bg-white/20'
                                } ${isReadOnly ? 'cursor-default' : 'cursor-pointer'}`}
                              >
                                {isChecked && <Check size={14} />}
                                <span className="capitalize">{action}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}

                    {/* Storage Quota for folders module */}
                    {module.id === 'folders' && !isReadOnly && (
                      <div className="pt-4 border-t border-white/10">
                        <label className="block text-sm font-medium text-white mb-2">
                          Storage Quota (GB)
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="100"
                          value={moduleConfig?.limits?.storage_quota_gb || 5}
                          onChange={(e) => handleUpdateLimit(module.id, 'storage_quota_gb', parseInt(e.target.value))}
                          className="w-32 px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-[#ea580c]"
                        />
                        <p className="text-xs text-gray-400 mt-1">
                          Maximum storage space for this stakeholder
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Save Footer */}
      {!isReadOnly && hasChanges && (
        <div className="flex items-center justify-between p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
          <div className="flex items-center gap-2">
            <AlertCircle size={20} className="text-yellow-400" />
            <span className="text-sm text-yellow-200">You have unsaved changes</span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={loadPermissions}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
            >
              Discard
            </button>
            <button
              onClick={handleSavePermissions}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-[#ea580c] hover:bg-[#ea580c]/80 rounded-lg transition-colors disabled:opacity-50"
            >
              {saving ? (
                <>
                  <RefreshCw size={18} className="animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save size={18} />
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
