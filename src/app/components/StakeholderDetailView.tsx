// Stakeholder Detail View - Full profile with tabs
// Created: 2026-01-27
import { useState, useEffect } from 'react';
import {
  X, FolderOpen, Workflow, Palette, MessageSquare, Activity, Settings,
  Mail, Phone, MapPin, Calendar, Tag, Building2, Globe, FileText,
  CheckCircle, XCircle, Clock, Edit, Eye, Upload, Download, Trash2,
  Plus, Search, Filter, Grid, List, MoreVertical, ChevronRight,
  Package, Wrench, Briefcase, DollarSign, Home, Megaphone, Users, Shield, Bell
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner@2.0.3';
import StakeholderFileBrowser from './StakeholderFileBrowser';
import StakeholderStorageQuota from './StakeholderStorageQuota';
import StakeholderPermissionConfigurator from './StakeholderPermissionConfigurator';
import StakeholderNotificationCenter from './StakeholderNotificationCenter';

interface Stakeholder {
  id: string;
  type: string;
  name: string;
  display_name?: string;
  email?: string;
  phone?: string;
  address?: string;
  status: string;
  tags: string[];
  notes?: string;
  metadata: any;
  created_at: string;
  updated_at: string;
  last_activity?: string;
}

interface StakeholderDetailViewProps {
  isOpen: boolean;
  stakeholder: Stakeholder | null;
  onClose: () => void;
  onEdit: () => void;
}

// Icon mapping
const iconMap: { [key: string]: any } = {
  Package, Wrench, Briefcase, DollarSign, Home, Building2, Megaphone, Users
};

type TabType = 'overview' | 'files' | 'workflows' | 'designs' | 'social' | 'messages' | 'notifications' | 'activity' | 'permissions';

export default function StakeholderDetailView({ isOpen, stakeholder, onClose, onEdit }: StakeholderDetailViewProps) {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [loading, setLoading] = useState(false);
  const [fileCount, setFileCount] = useState(0);
  const [workflowCount, setWorkflowCount] = useState(0);
  const [activityLog, setActivityLog] = useState<any[]>([]);

  useEffect(() => {
    if (isOpen && stakeholder) {
      loadCounts();
      loadActivity();
    }
  }, [isOpen, stakeholder]);

  const loadCounts = async () => {
    if (!stakeholder) return;

    try {
      // Count files
      const { count: files } = await supabase
        .from('stakeholder_files')
        .select('*', { count: 'exact', head: true })
        .eq('stakeholder_id', stakeholder.id);
      setFileCount(files || 0);

      // Count workflows
      try {
        const { count: workflows } = await supabase
          .from('workflows')
          .select('*', { count: 'exact', head: true })
          .eq('stakeholder_id', stakeholder.id);
        setWorkflowCount(workflows || 0);
      } catch (e) {
        setWorkflowCount(0);
      }
    } catch (error) {
      console.error('Error loading counts:', error);
    }
  };

  const loadActivity = async () => {
    if (!stakeholder) return;

    try {
      // Load from localStorage
      const key = `stakeholder_activity_${stakeholder.id}`;
      const storedData = localStorage.getItem(key);
      
      if (storedData) {
        setActivityLog(JSON.parse(storedData));
      } else {
        // Generate demo activity for this stakeholder
        const activityTypes = [
          'portal_login', 'notification_read', 'file_accessed', 
          'message_sent', 'profile_updated'
        ];
        
        const demoActivity = Array.from({ length: 10 }, (_, i) => ({
          id: `activity-${stakeholder.id}-${i + 1}`,
          stakeholder_id: stakeholder.id,
          activity_type: activityTypes[Math.floor(Math.random() * activityTypes.length)],
          description: `Activity ${i + 1} for ${stakeholder.name}`,
          created_at: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString()
        })).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        
        setActivityLog(demoActivity);
      }
    } catch (error) {
      console.error('Error loading activity:', error);
    }
  };

  if (!isOpen || !stakeholder) return null;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'inactive': return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
      case 'pending': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'suspended': return 'bg-red-500/20 text-red-400 border-red-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const getTypeIcon = (type: string) => {
    const iconKey = type === 'vendor' ? 'Package' :
      type === 'subcontractor' ? 'Wrench' :
      type === 'employee' ? 'Briefcase' :
      type === 'investor' ? 'DollarSign' :
      type === 'landlord' ? 'Home' :
      type === 'condo_association' ? 'Building2' :
      type === 'advertiser' ? 'Megaphone' : 'Users';
    return iconMap[iconKey] || Users;
  };

  const tabs = [
    { id: 'overview' as TabType, label: 'Overview', icon: Eye },
    { id: 'files' as TabType, label: 'Files', icon: FolderOpen, count: fileCount },
    { id: 'workflows' as TabType, label: 'Workflows', icon: Workflow, count: workflowCount },
    { id: 'designs' as TabType, label: 'Designs', icon: Palette },
    { id: 'social' as TabType, label: 'Social Media', icon: MessageSquare },
    { id: 'messages' as TabType, label: 'Messages', icon: MessageSquare },
    { id: 'notifications' as TabType, label: 'Notifications', icon: Bell },
    { id: 'permissions' as TabType, label: 'Permissions', icon: Shield },
    { id: 'activity' as TabType, label: 'Activity', icon: Activity }
  ];

  const TypeIcon = getTypeIcon(stakeholder.type);

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#0A0A0A] border border-white/10 rounded-lg w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-white/10">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-[#ea580c]/20 border border-[#ea580c]/30 rounded-lg">
              <TypeIcon size={24} className="text-[#ea580c]" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white mb-1">{stakeholder.name}</h2>
              <div className="flex items-center gap-3">
                <span className="text-gray-400 capitalize">{stakeholder.type.replace('_', ' ')}</span>
                <span className={`px-2 py-1 rounded text-xs font-medium border ${getStatusColor(stakeholder.status)}`}>
                  {stakeholder.status.toUpperCase()}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onEdit}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              title="Edit stakeholder"
            >
              <Edit size={20} className="text-gray-400" />
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <X size={20} className="text-gray-400" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-white/10 bg-white/5">
          <div className="flex gap-1 px-6 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors relative ${
                  activeTab === tab.id
                    ? 'text-[#ea580c]'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <tab.icon size={16} />
                {tab.label}
                {tab.count !== undefined && tab.count > 0 && (
                  <span className="px-2 py-0.5 bg-[#ea580c]/20 text-[#ea580c] text-xs rounded-full">
                    {tab.count}
                  </span>
                )}
                {activeTab === tab.id && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#ea580c]" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Contact Information */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-4">Contact Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {stakeholder.email && (
                    <div className="flex items-start gap-3 p-4 bg-white/5 border border-white/10 rounded-lg">
                      <Mail size={20} className="text-gray-400 mt-0.5" />
                      <div>
                        <div className="text-sm text-gray-400 mb-1">Email</div>
                        <div className="text-white">{stakeholder.email}</div>
                      </div>
                    </div>
                  )}
                  {stakeholder.phone && (
                    <div className="flex items-start gap-3 p-4 bg-white/5 border border-white/10 rounded-lg">
                      <Phone size={20} className="text-gray-400 mt-0.5" />
                      <div>
                        <div className="text-sm text-gray-400 mb-1">Phone</div>
                        <div className="text-white">{stakeholder.phone}</div>
                      </div>
                    </div>
                  )}
                  {stakeholder.address && (
                    <div className="flex items-start gap-3 p-4 bg-white/5 border border-white/10 rounded-lg md:col-span-2">
                      <MapPin size={20} className="text-gray-400 mt-0.5" />
                      <div>
                        <div className="text-sm text-gray-400 mb-1">Address</div>
                        <div className="text-white">{stakeholder.address}</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Additional Information */}
              {stakeholder.metadata && Object.keys(stakeholder.metadata).length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4">Additional Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {stakeholder.metadata.company_name && (
                      <div className="flex items-start gap-3 p-4 bg-white/5 border border-white/10 rounded-lg">
                        <Building2 size={20} className="text-gray-400 mt-0.5" />
                        <div>
                          <div className="text-sm text-gray-400 mb-1">Company Name</div>
                          <div className="text-white">{stakeholder.metadata.company_name}</div>
                        </div>
                      </div>
                    )}
                    {stakeholder.metadata.contact_person && (
                      <div className="flex items-start gap-3 p-4 bg-white/5 border border-white/10 rounded-lg">
                        <Users size={20} className="text-gray-400 mt-0.5" />
                        <div>
                          <div className="text-sm text-gray-400 mb-1">Contact Person</div>
                          <div className="text-white">{stakeholder.metadata.contact_person}</div>
                        </div>
                      </div>
                    )}
                    {stakeholder.metadata.website && (
                      <div className="flex items-start gap-3 p-4 bg-white/5 border border-white/10 rounded-lg">
                        <Globe size={20} className="text-gray-400 mt-0.5" />
                        <div>
                          <div className="text-sm text-gray-400 mb-1">Website</div>
                          <a
                            href={stakeholder.metadata.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[#ea580c] hover:underline"
                          >
                            {stakeholder.metadata.website}
                          </a>
                        </div>
                      </div>
                    )}
                    {stakeholder.metadata.tax_id && (
                      <div className="flex items-start gap-3 p-4 bg-white/5 border border-white/10 rounded-lg">
                        <FileText size={20} className="text-gray-400 mt-0.5" />
                        <div>
                          <div className="text-sm text-gray-400 mb-1">Tax ID / EIN</div>
                          <div className="text-white">{stakeholder.metadata.tax_id}</div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Tags */}
              {stakeholder.tags && stakeholder.tags.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4">Tags</h3>
                  <div className="flex flex-wrap gap-2">
                    {stakeholder.tags.map((tag, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-white/10 border border-white/20 rounded-full text-sm text-white"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Notes */}
              {stakeholder.notes && (
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4">Notes</h3>
                  <div className="p-4 bg-white/5 border border-white/10 rounded-lg text-gray-300 whitespace-pre-wrap">
                    {stakeholder.notes}
                  </div>
                </div>
              )}

              {/* Storage Quota */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-4">Storage</h3>
                <StakeholderStorageQuota stakeholderId={stakeholder.id} />
              </div>

              {/* Timestamps */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-4">Timeline</h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-3 text-sm">
                    <Calendar size={16} className="text-gray-400" />
                    <span className="text-gray-400">Created:</span>
                    <span className="text-white">{new Date(stakeholder.created_at).toLocaleString()}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <Clock size={16} className="text-gray-400" />
                    <span className="text-gray-400">Last Updated:</span>
                    <span className="text-white">{new Date(stakeholder.updated_at).toLocaleString()}</span>
                  </div>
                  {stakeholder.last_activity && (
                    <div className="flex items-center gap-3 text-sm">
                      <Activity size={16} className="text-gray-400" />
                      <span className="text-gray-400">Last Activity:</span>
                      <span className="text-white">{new Date(stakeholder.last_activity).toLocaleString()}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'files' && (
            <div className="h-[600px]">
              <StakeholderFileBrowser
                stakeholderId={stakeholder.id}
                viewMode="admin"
              />
            </div>
          )}

          {activeTab === 'workflows' && (
            <div className="text-center py-12">
              <Workflow size={48} className="mx-auto mb-4 text-gray-400" />
              <h3 className="text-xl font-semibold text-white mb-2">Workflows</h3>
              <p className="text-gray-400 mb-6">Workflow integration coming next</p>
              <p className="text-sm text-gray-500">Total workflows: {workflowCount}</p>
            </div>
          )}

          {activeTab === 'designs' && (
            <div className="text-center py-12">
              <Palette size={48} className="mx-auto mb-4 text-gray-400" />
              <h3 className="text-xl font-semibold text-white mb-2">Design Gallery</h3>
              <p className="text-gray-400">Design integration coming next</p>
            </div>
          )}

          {activeTab === 'social' && (
            <div className="text-center py-12">
              <MessageSquare size={48} className="mx-auto mb-4 text-gray-400" />
              <h3 className="text-xl font-semibold text-white mb-2">Social Media</h3>
              <p className="text-gray-400">Social media content coming next</p>
            </div>
          )}

          {activeTab === 'messages' && (
            <div className="text-center py-12">
              <MessageSquare size={48} className="mx-auto mb-4 text-gray-400" />
              <h3 className="text-xl font-semibold text-white mb-2">Messages</h3>
              <p className="text-gray-400">Messaging system coming next</p>
            </div>
          )}

          {activeTab === 'permissions' && (
            <StakeholderPermissionConfigurator
              stakeholderId={stakeholder.id}
              viewMode="admin"
            />
          )}

          {activeTab === 'notifications' && (
            <div className="h-[600px]">
              <StakeholderNotificationCenter
                stakeholderId={stakeholder.id}
                isPortalView={false}
              />
            </div>
          )}

          {activeTab === 'activity' && (
            <div>
              {activityLog.length === 0 ? (
                <div className="text-center py-12">
                  <Activity size={48} className="mx-auto mb-4 text-gray-400" />
                  <h3 className="text-xl font-semibold text-white mb-2">No Activity Yet</h3>
                  <p className="text-gray-400">Activity will be tracked here</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {activityLog.map((activity) => (
                    <div key={activity.id} className="flex items-start gap-3 p-4 bg-white/5 border border-white/10 rounded-lg">
                      <Activity size={16} className="text-gray-400 mt-1" />
                      <div className="flex-1">
                        <div className="text-white capitalize">{activity.action.replace('_', ' ')}</div>
                        <div className="text-sm text-gray-400 mt-1">
                          {new Date(activity.created_at).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
