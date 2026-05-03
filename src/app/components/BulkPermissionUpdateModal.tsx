// Bulk Permission Update Modal
// Created: 2026-01-27 - Day 4
// Update permissions for multiple stakeholders at once

import { useState } from 'react';
import {
  X, Shield, Save, RefreshCw, Users, CheckCircle, AlertCircle,
  Star, Unlock, Eye, Lock, Wrench
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner@2.0.3';

interface BulkPermissionUpdateModalProps {
  isOpen: boolean;
  selectedStakeholderIds: string[];
  stakeholderNames: string[];
  onClose: () => void;
  onComplete: () => void;
}

const PERMISSION_TEMPLATES = [
  {
    id: 'full_access',
    name: 'Full Access',
    description: 'Complete access to all features',
    icon: Unlock,
    color: 'green'
  },
  {
    id: 'read_only',
    name: 'Read Only',
    description: 'View access only, no editing',
    icon: Eye,
    color: 'blue'
  },
  {
    id: 'vendor_standard',
    name: 'Vendor Standard',
    description: 'Standard vendor permissions',
    icon: Users,
    color: 'purple'
  },
  {
    id: 'subcontractor',
    name: 'Subcontractor',
    description: 'Standard subcontractor access',
    icon: Wrench,
    color: 'orange'
  },
  {
    id: 'limited',
    name: 'Limited Access',
    description: 'Minimal permissions',
    icon: Lock,
    color: 'red'
  }
];

export default function BulkPermissionUpdateModal({
  isOpen,
  selectedStakeholderIds,
  stakeholderNames,
  onClose,
  onComplete
}: BulkPermissionUpdateModalProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [applying, setApplying] = useState(false);
  const [progress, setProgress] = useState(0);

  if (!isOpen) return null;

  const handleApplyTemplate = async () => {
    if (!selectedTemplate) {
      toast.error('Please select a permission template');
      return;
    }

    setApplying(true);
    setProgress(0);

    try {
      // Import the actual template logic from StakeholderPermissionConfigurator
      const templates: Record<string, any> = {
        full_access: {
          folders: {
            module: 'folders',
            enabled: true,
            permissions: {
              files_view: true,
              files_upload: true,
              files_download: true,
              files_delete: true,
              files_share: true,
              folders_view: true,
              folders_create: true,
              folders_edit: true,
              folders_delete: true
            },
            limits: { storage_quota_gb: 10 }
          },
          workflows: {
            module: 'workflows',
            enabled: true,
            permissions: {
              view_workflows_view: true,
              submit_workflows_create: true,
              manage_workflows_view: true,
              manage_workflows_create: true,
              manage_workflows_edit: true,
              manage_workflows_delete: true
            }
          },
          designs: {
            module: 'designs',
            enabled: true,
            permissions: {
              view_designs_view: true,
              upload_designs_upload: true,
              manage_designs_edit: true,
              manage_designs_delete: true
            }
          },
          social_media: {
            module: 'social_media',
            enabled: true,
            permissions: {
              view_posts_view: true,
              create_posts_create: true,
              manage_posts_edit: true,
              manage_posts_delete: true
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
              portal_access_view: true,
              portal_users_view: true,
              portal_users_create: true,
              portal_users_edit: true,
              portal_users_delete: true
            }
          },
          data: {
            module: 'data',
            enabled: true,
            permissions: {
              view_profile_view: true,
              edit_profile_edit: true
            }
          },
          ai_tools: {
            module: 'ai_tools',
            enabled: true,
            permissions: {
              ai_chat_view: true,
              ai_chat_create: true,
              ai_automation_view: true
            }
          }
        },
        read_only: {
          folders: {
            module: 'folders',
            enabled: true,
            permissions: {
              files_view: true,
              files_download: true,
              folders_view: true
            },
            limits: { storage_quota_gb: 5 }
          },
          workflows: {
            module: 'workflows',
            enabled: true,
            permissions: {
              view_workflows_view: true
            }
          },
          designs: {
            module: 'designs',
            enabled: true,
            permissions: {
              view_designs_view: true
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
        },
        vendor_standard: {
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
        },
        subcontractor: {
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
        },
        limited: {
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
        }
      };

      const templateConfig = templates[selectedTemplate];
      if (!templateConfig) {
        throw new Error('Invalid template');
      }

      // Apply to each stakeholder
      for (let i = 0; i < selectedStakeholderIds.length; i++) {
        const stakeholderId = selectedStakeholderIds[i];

        // Delete existing permissions
        await supabase
          .from('stakeholder_permissions')
          .delete()
          .eq('stakeholder_id', stakeholderId);

        // Insert new permissions
        const permissionsToInsert = Object.values(templateConfig).map((perm: any) => ({
          stakeholder_id: stakeholderId,
          module: perm.module,
          enabled: perm.enabled,
          permissions: perm.permissions,
          limits: perm.limits || {}
        }));

        const { error } = await supabase
          .from('stakeholder_permissions')
          .insert(permissionsToInsert);

        if (error) throw error;

        setProgress(Math.round(((i + 1) / selectedStakeholderIds.length) * 100));
      }

      toast.success(`Permissions updated for ${selectedStakeholderIds.length} stakeholder(s)`);
      onComplete();
      onClose();
    } catch (error: any) {
      console.error('Error applying bulk permissions:', error);
      toast.error('Failed to update permissions');
    } finally {
      setApplying(false);
      setProgress(0);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#0A0A0A] border border-white/10 rounded-lg w-full max-w-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#ea580c]/20 border border-[#ea580c]/30 rounded-lg">
              <Shield size={24} className="text-[#ea580c]" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">Bulk Update Permissions</h2>
              <p className="text-sm text-gray-400 mt-1">
                Apply permissions to {selectedStakeholderIds.length} selected stakeholder(s)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={applying}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors disabled:opacity-50"
          >
            <X size={20} className="text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Selected Stakeholders */}
          <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Users size={16} className="text-blue-400" />
              <span className="text-sm font-medium text-blue-200">
                {selectedStakeholderIds.length} Stakeholder(s) Selected
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {stakeholderNames.slice(0, 5).map((name, index) => (
                <span key={index} className="px-2 py-1 bg-blue-500/20 text-blue-200 text-xs rounded">
                  {name}
                </span>
              ))}
              {stakeholderNames.length > 5 && (
                <span className="px-2 py-1 bg-blue-500/20 text-blue-200 text-xs rounded">
                  +{stakeholderNames.length - 5} more
                </span>
              )}
            </div>
          </div>

          {/* Template Selection */}
          <div>
            <label className="block text-sm font-medium text-white mb-3">
              Select Permission Template
            </label>
            <div className="grid grid-cols-1 gap-3">
              {PERMISSION_TEMPLATES.map((template) => {
                const Icon = template.icon;
                const isSelected = selectedTemplate === template.id;
                
                return (
                  <button
                    key={template.id}
                    onClick={() => setSelectedTemplate(template.id)}
                    disabled={applying}
                    className={`p-4 border-2 rounded-lg text-left transition-all disabled:opacity-50 ${
                      isSelected
                        ? 'border-[#ea580c] bg-[#ea580c]/10'
                        : 'border-white/10 hover:border-white/30 bg-white/5'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <Icon size={24} className={`mt-0.5 ${
                          template.color === 'green' ? 'text-green-400' :
                          template.color === 'blue' ? 'text-blue-400' :
                          template.color === 'purple' ? 'text-purple-400' :
                          template.color === 'orange' ? 'text-orange-400' :
                          'text-red-400'
                        }`} />
                        <div>
                          <h4 className="font-medium text-white">{template.name}</h4>
                          <p className="text-sm text-gray-400 mt-1">{template.description}</p>
                        </div>
                      </div>
                      {isSelected && (
                        <CheckCircle size={20} className="text-[#ea580c]" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Progress Bar */}
          {applying && (
            <div className="p-4 bg-white/5 border border-white/10 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <RefreshCw size={16} className="text-[#ea580c] animate-spin" />
                <span className="text-sm text-white">Applying permissions...</span>
              </div>
              <div className="w-full bg-white/10 rounded-full h-2">
                <div
                  className="bg-[#ea580c] h-2 rounded-full transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-xs text-gray-400 mt-2">{progress}% complete</p>
            </div>
          )}

          {/* Warning */}
          <div className="flex items-start gap-3 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
            <AlertCircle size={20} className="text-yellow-400 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-yellow-200">
                This will replace all existing permissions for the selected stakeholders.
                This action cannot be undone.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-white/10">
          <button
            onClick={onClose}
            disabled={applying}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleApplyTemplate}
            disabled={!selectedTemplate || applying}
            className="flex items-center gap-2 px-4 py-2 bg-[#ea580c] hover:bg-[#ea580c]/80 rounded-lg transition-colors disabled:opacity-50"
          >
            {applying ? (
              <>
                <RefreshCw size={18} className="animate-spin" />
                <span>Applying...</span>
              </>
            ) : (
              <>
                <Save size={18} />
                <span>Apply to {selectedStakeholderIds.length} Stakeholder(s)</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
