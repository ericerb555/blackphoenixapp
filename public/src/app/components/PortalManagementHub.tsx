import { useState } from 'react';
import {
  Plus, Layout, Edit, Trash2, Copy, Eye, Settings, Users,
  Shield, Calendar, TrendingUp, Search, Filter, CheckCircle,
  XCircle, Clock, Archive
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import PortalSectionManager from './PortalSectionManager';
import { ConfirmModal } from './ui/modal/ConfirmModal';

interface PortalConfig {
  id: string;
  name: string;
  type: string;
  assignedSections: any[];
  createdAt: string;
  lastModified: string;
  status: 'active' | 'draft' | 'archived';
}

export default function PortalManagementHub() {
  const [portals, setPortals] = useState<PortalConfig[]>([
    {
      id: 'PORTAL-001',
      name: 'Admin Control Center',
      type: 'admin',
      assignedSections: [
        { sectionId: 'subscription-plans', order: 0, isVisible: true, isEnabled: true, permissions: ['admin'] },
        { sectionId: 'maintenance-plans', order: 1, isVisible: true, isEnabled: true, permissions: ['admin'] },
        { sectionId: 'advertiser-approvals', order: 2, isVisible: true, isEnabled: true, permissions: ['admin'] },
        { sectionId: 'reel-approvals', order: 3, isVisible: true, isEnabled: true, permissions: ['admin'] },
        { sectionId: 'contractor-approvals', order: 4, isVisible: true, isEnabled: true, permissions: ['admin'] }
      ],
      createdAt: '2024-01-15',
      lastModified: '2024-01-24',
      status: 'active'
    },
    {
      id: 'PORTAL-002',
      name: 'Manager Portal',
      type: 'manager',
      assignedSections: [
        { sectionId: 'work-orders', order: 0, isVisible: true, isEnabled: true, permissions: ['manager'] },
        { sectionId: 'customer-management', order: 1, isVisible: true, isEnabled: true, permissions: ['manager'] },
        { sectionId: 'time-tracking', order: 2, isVisible: true, isEnabled: true, permissions: ['manager'] },
        { sectionId: 'master-scheduling', order: 3, isVisible: true, isEnabled: true, permissions: ['manager'] }
      ],
      createdAt: '2024-01-18',
      lastModified: '2024-01-23',
      status: 'active'
    },
    {
      id: 'PORTAL-003',
      name: 'Employee Dashboard',
      type: 'employee',
      assignedSections: [
        { sectionId: 'work-orders', order: 0, isVisible: true, isEnabled: true, permissions: ['employee'] },
        { sectionId: 'time-tracking', order: 1, isVisible: true, isEnabled: true, permissions: ['employee'] },
        { sectionId: 'personal-folders', order: 2, isVisible: true, isEnabled: true, permissions: ['employee'] }
      ],
      createdAt: '2024-01-20',
      lastModified: '2024-01-22',
      status: 'active'
    }
  ]);

  const [showPortalEditor, setShowPortalEditor] = useState(false);
  const [selectedPortal, setSelectedPortal] = useState<PortalConfig | null>(null);
  const [editorMode, setEditorMode] = useState<'create' | 'edit'>('create');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; portalId: string | null; portalName: string }>({
    isOpen: false,
    portalId: null,
    portalName: ''
  });

  const filteredPortals = portals.filter(portal => {
    const matchesSearch = portal.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         portal.type.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterStatus === 'all' || portal.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const handleCreatePortal = () => {
    setSelectedPortal(null);
    setEditorMode('create');
    setShowPortalEditor(true);
  };

  const handleEditPortal = (portal: PortalConfig) => {
    setSelectedPortal(portal);
    setEditorMode('edit');
    setShowPortalEditor(true);
  };

  const handleSavePortal = (config: PortalConfig) => {
    if (editorMode === 'create') {
      const newPortal = {
        ...config,
        id: `PORTAL-${String(portals.length + 1).padStart(3, '0')}`,
        createdAt: new Date().toISOString().split('T')[0],
        lastModified: new Date().toISOString().split('T')[0]
      };
      setPortals([...portals, newPortal]);
      toast.success('Portal created successfully!');
    } else {
      setPortals(portals.map(p => p.id === config.id ? config : p));
      toast.success('Portal updated successfully!');
    }
    setShowPortalEditor(false);
    setSelectedPortal(null);
  };

  const handleDeletePortal = (portalId: string, portalName: string) => {
    setDeleteConfirm({ isOpen: true, portalId, portalName });
  };
  
  const confirmDeletePortal = () => {
    if (!deleteConfirm.portalId) return;
    
    setPortals(portals.filter(p => p.id !== deleteConfirm.portalId));
    toast.success('Portal deleted successfully');
    setDeleteConfirm({ isOpen: false, portalId: null, portalName: '' });
  };

  const handleDuplicatePortal = (portal: PortalConfig) => {
    const duplicated: PortalConfig = {
      ...portal,
      id: `PORTAL-${String(portals.length + 1).padStart(3, '0')}`,
      name: `${portal.name} (Copy)`,
      status: 'draft',
      createdAt: new Date().toISOString().split('T')[0],
      lastModified: new Date().toISOString().split('T')[0]
    };
    setPortals([...portals, duplicated]);
    toast.success('Portal duplicated successfully!');
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'draft': return <Clock className="w-4 h-4 text-yellow-400" />;
      case 'archived': return <Archive className="w-4 h-4 text-gray-400" />;
      default: return <XCircle className="w-4 h-4 text-gray-400" />;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'admin': return <Shield className="w-5 h-5 text-orange-400" />;
      case 'manager': return <Users className="w-5 h-5 text-blue-400" />;
      case 'employee': return <Users className="w-5 h-5 text-green-400" />;
      case 'customer': return <Users className="w-5 h-5 text-purple-400" />;
      case 'vendor': return <Users className="w-5 h-5 text-cyan-400" />;
      default: return <Layout className="w-5 h-5 text-gray-400" />;
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Portal Management Hub</h1>
              <p className="text-gray-400">Configure and manage all portal sections dynamically</p>
            </div>
            <button
              onClick={handleCreatePortal}
              className="px-6 py-3 bg-gradient-to-r from-orange-600 to-orange-700 text-white rounded-xl hover:from-orange-700 hover:to-orange-800 transition font-bold flex items-center gap-2 shadow-lg shadow-orange-500/20"
            >
              <Plus className="w-5 h-5" />
              Create New Portal
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-600 to-orange-700 flex items-center justify-center">
                  <Layout className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{portals.length}</p>
                  <p className="text-sm text-gray-400">Total Portals</p>
                </div>
              </div>
            </div>

            <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-600 to-green-700 flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">
                    {portals.filter(p => p.status === 'active').length}
                  </p>
                  <p className="text-sm text-gray-400">Active</p>
                </div>
              </div>
            </div>

            <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-yellow-600 to-yellow-700 flex items-center justify-center">
                  <Clock className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">
                    {portals.filter(p => p.status === 'draft').length}
                  </p>
                  <p className="text-sm text-gray-400">Drafts</p>
                </div>
              </div>
            </div>

            <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">24</p>
                  <p className="text-sm text-gray-400">Available Sections</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Search & Filter */}
        <div className="mb-6 flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search portals..."
              className="w-full pl-12 pr-4 py-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl text-white placeholder-gray-500 focus:border-orange-500 focus:outline-none transition"
            />
          </div>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl text-white focus:border-orange-500 focus:outline-none transition"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="draft">Draft</option>
            <option value="archived">Archived</option>
          </select>
        </div>

        {/* Portal List */}
        <div className="space-y-4">
          {filteredPortals.map(portal => (
            <div
              key={portal.id}
              className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] p-6 hover:border-orange-500/30 transition"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4 flex-1">
                  <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-orange-600 to-orange-700 flex items-center justify-center">
                    {getTypeIcon(portal.type)}
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-bold text-white">{portal.name}</h3>
                      <div className="flex items-center gap-1 px-3 py-1 rounded-lg bg-[#0A0A0A] border border-[#2A2A2A]">
                        {getStatusIcon(portal.status)}
                        <span className="text-sm font-semibold text-gray-300 capitalize">{portal.status}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-4 gap-4 mb-3">
                      <div>
                        <p className="text-xs text-gray-500">Type</p>
                        <p className="text-sm font-semibold text-white capitalize">{portal.type}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Sections</p>
                        <p className="text-sm font-semibold text-cyan-400">{portal.assignedSections.length} assigned</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Created</p>
                        <p className="text-sm text-gray-300">{portal.createdAt}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Last Modified</p>
                        <p className="text-sm text-gray-300">{portal.lastModified}</p>
                      </div>
                    </div>

                    {/* Section Preview */}
                    <div className="flex flex-wrap gap-2">
                      {portal.assignedSections.slice(0, 5).map((section, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-1 bg-[#0A0A0A] rounded text-xs text-gray-400 border border-[#2A2A2A]"
                        >
                          {section.sectionId.replace(/-/g, ' ')}
                        </span>
                      ))}
                      {portal.assignedSections.length > 5 && (
                        <span className="px-2 py-1 bg-[#0A0A0A] rounded text-xs text-gray-400 border border-[#2A2A2A]">
                          +{portal.assignedSections.length - 5} more
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEditPortal(portal)}
                    className="p-3 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 rounded-xl transition border border-blue-500/30"
                    title="Configure Sections"
                  >
                    <Settings className="w-5 h-5" />
                  </button>

                  <button
                    onClick={() => handleDuplicatePortal(portal)}
                    className="p-3 bg-purple-600/20 hover:bg-purple-600/30 text-purple-400 rounded-xl transition border border-purple-500/30"
                    title="Duplicate Portal"
                  >
                    <Copy className="w-5 h-5" />
                  </button>

                  <button
                    onClick={() => handleDeletePortal(portal.id, portal.name)}
                    className="p-3 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-xl transition border border-red-500/30"
                    title="Delete Portal"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          ))}

          {filteredPortals.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <Layout className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p className="text-xl mb-2">No portals found</p>
              <p className="text-sm">Try adjusting your search or create a new portal</p>
            </div>
          )}
        </div>
      </div>

      {/* Portal Section Manager */}
      <PortalSectionManager
        isOpen={showPortalEditor}
        onClose={() => {
          setShowPortalEditor(false);
          setSelectedPortal(null);
        }}
        portal={selectedPortal}
        mode={editorMode}
        onSave={handleSavePortal}
      />
      
      {/* Delete Portal Confirmation */}
      <ConfirmModal
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({ isOpen: false, portalId: null, portalName: '' })}
        onConfirm={confirmDeletePortal}
        title="Delete Portal"
        message={`Are you sure you want to delete "${deleteConfirm.portalName}"? This action cannot be undone.`}
        variant="danger"
      />
    </div>
  );
}
