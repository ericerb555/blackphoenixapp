import { useState } from 'react';
import {
  Settings, Eye, EyeOff, Edit, Save, X, Check, Users, Shield,
  Bell, Lock, Unlock, ToggleLeft, ToggleRight, Search, Filter,
  Plus, Trash2, AlertCircle, CheckCircle, Info
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';

interface PortalConfig {
  id: string;
  name: string;
  crmId: string;
  isVisible: boolean;
  requiresAuth: boolean;
  allowedRoles: string[];
  maxUsers: number;
  isActive: boolean;
  customerGroupId?: string;
}

interface MobileHubAdminControlsProps {
  portals: PortalConfig[];
  onUpdatePortal: (portalId: string, updates: Partial<PortalConfig>) => void;
  onClose: () => void;
}

export default function MobileHubAdminControls({ portals, onUpdatePortal, onClose }: MobileHubAdminControlsProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [editingPortal, setEditingPortal] = useState<string | null>(null);

  const filteredPortals = portals.filter(portal => {
    const matchesSearch = portal.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterStatus === 'all' || 
      (filterStatus === 'active' && portal.isActive) ||
      (filterStatus === 'inactive' && !portal.isActive);
    return matchesSearch && matchesFilter;
  });

  const handleToggleVisibility = (portalId: string, currentValue: boolean) => {
    onUpdatePortal(portalId, { isVisible: !currentValue });
    toast.success(`Portal ${!currentValue ? 'shown' : 'hidden'} in Mobile Hub`);
  };

  const handleToggleActive = (portalId: string, currentValue: boolean) => {
    onUpdatePortal(portalId, { isActive: !currentValue });
    toast.success(`Portal ${!currentValue ? 'activated' : 'deactivated'}`);
  };

  const handleToggleAuth = (portalId: string, currentValue: boolean) => {
    onUpdatePortal(portalId, { requiresAuth: !currentValue });
    toast.success(`Authentication ${!currentValue ? 'required' : 'not required'}`);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-6">
      <div className="bg-[#0A0A0A] rounded-2xl border border-[#2A2A2A] w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-purple-700 p-6 border-b-4 border-purple-500">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center border-2 border-white/20">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white mb-1">Mobile Hub Admin Controls</h2>
                <p className="text-purple-100 text-sm">Manage portal visibility and access settings</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-3 bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/20 rounded-xl text-white transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Search and Filter Bar */}
        <div className="p-6 border-b border-[#2A2A2A] bg-[#1A1A1A]">
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search portals..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none"
              />
            </div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white focus:border-purple-500 focus:outline-none"
            >
              <option value="all">All Portals</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </select>
          </div>
        </div>

        {/* Portal List */}
        <div className="flex-1 overflow-auto p-6 space-y-4">
          {filteredPortals.map((portal) => (
            <div
              key={portal.id}
              className={`bg-[#1A1A1A] rounded-xl border p-6 transition ${
                portal.isActive ? 'border-[#2A2A2A]' : 'border-red-500/20 bg-red-500/5'
              }`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-bold text-white">{portal.name}</h3>
                    {portal.isActive ? (
                      <span className="px-2 py-1 bg-green-500/10 text-green-400 rounded text-xs font-semibold border border-green-500/20">
                        ACTIVE
                      </span>
                    ) : (
                      <span className="px-2 py-1 bg-red-500/10 text-red-400 rounded text-xs font-semibold border border-red-500/20">
                        INACTIVE
                      </span>
                    )}
                    {portal.customerGroupId && (
                      <span className="px-2 py-1 bg-blue-500/10 text-blue-400 rounded text-xs font-semibold border border-blue-500/20">
                        GROUP LINKED
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-400">Portal ID: {portal.id}</p>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-4">
                {/* Visibility Toggle */}
                <div className="bg-[#0A0A0A] rounded-xl p-4 border border-[#2A2A2A]">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {portal.isVisible ? (
                        <Eye className="w-4 h-4 text-green-400" />
                      ) : (
                        <EyeOff className="w-4 h-4 text-gray-500" />
                      )}
                      <p className="text-sm font-semibold text-white">Visibility</p>
                    </div>
                    <button
                      onClick={() => handleToggleVisibility(portal.id, portal.isVisible)}
                      className={`p-1 rounded transition ${
                        portal.isVisible ? 'text-green-400 hover:text-green-300' : 'text-gray-500 hover:text-gray-400'
                      }`}
                    >
                      {portal.isVisible ? <ToggleRight className="w-6 h-6" /> : <ToggleLeft className="w-6 h-6" />}
                    </button>
                  </div>
                  <p className="text-xs text-gray-500">
                    {portal.isVisible ? 'Shown in Mobile Hub' : 'Hidden from Mobile Hub'}
                  </p>
                </div>

                {/* Active Status Toggle */}
                <div className="bg-[#0A0A0A] rounded-xl p-4 border border-[#2A2A2A]">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {portal.isActive ? (
                        <CheckCircle className="w-4 h-4 text-green-400" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-red-400" />
                      )}
                      <p className="text-sm font-semibold text-white">Status</p>
                    </div>
                    <button
                      onClick={() => handleToggleActive(portal.id, portal.isActive)}
                      className={`p-1 rounded transition ${
                        portal.isActive ? 'text-green-400 hover:text-green-300' : 'text-red-400 hover:text-red-300'
                      }`}
                    >
                      {portal.isActive ? <ToggleRight className="w-6 h-6" /> : <ToggleLeft className="w-6 h-6" />}
                    </button>
                  </div>
                  <p className="text-xs text-gray-500">
                    {portal.isActive ? 'Portal is active' : 'Portal is disabled'}
                  </p>
                </div>

                {/* Authentication Toggle */}
                <div className="bg-[#0A0A0A] rounded-xl p-4 border border-[#2A2A2A]">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {portal.requiresAuth ? (
                        <Lock className="w-4 h-4 text-yellow-400" />
                      ) : (
                        <Unlock className="w-4 h-4 text-gray-500" />
                      )}
                      <p className="text-sm font-semibold text-white">Auth</p>
                    </div>
                    <button
                      onClick={() => handleToggleAuth(portal.id, portal.requiresAuth)}
                      className={`p-1 rounded transition ${
                        portal.requiresAuth ? 'text-yellow-400 hover:text-yellow-300' : 'text-gray-500 hover:text-gray-400'
                      }`}
                    >
                      {portal.requiresAuth ? <ToggleRight className="w-6 h-6" /> : <ToggleLeft className="w-6 h-6" />}
                    </button>
                  </div>
                  <p className="text-xs text-gray-500">
                    {portal.requiresAuth ? 'Login required' : 'Public access'}
                  </p>
                </div>

                {/* User Limit */}
                <div className="bg-[#0A0A0A] rounded-xl p-4 border border-[#2A2A2A]">
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="w-4 h-4 text-blue-400" />
                    <p className="text-sm font-semibold text-white">Max Users</p>
                  </div>
                  <p className="text-lg font-bold text-white">{portal.maxUsers === -1 ? '∞' : portal.maxUsers}</p>
                  <p className="text-xs text-gray-500">User limit</p>
                </div>
              </div>

              {/* Allowed Roles */}
              {portal.allowedRoles.length > 0 && (
                <div className="mt-4 pt-4 border-t border-[#2A2A2A]">
                  <p className="text-sm font-semibold text-gray-400 mb-2">Allowed Roles:</p>
                  <div className="flex flex-wrap gap-2">
                    {portal.allowedRoles.map((role) => (
                      <span
                        key={role}
                        className="px-3 py-1 bg-purple-500/10 text-purple-400 rounded-lg text-xs font-semibold border border-purple-500/20"
                      >
                        {role}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}

          {filteredPortals.length === 0 && (
            <div className="text-center py-12">
              <Info className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">No Portals Found</h3>
              <p className="text-gray-400">Try adjusting your search or filter criteria</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-[#2A2A2A] bg-[#1A1A1A]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 text-sm text-gray-400">
              <span className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-400" />
                {portals.filter(p => p.isActive).length} Active
              </span>
              <span className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-blue-400" />
                {portals.filter(p => p.isVisible).length} Visible
              </span>
              <span className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-yellow-400" />
                {portals.filter(p => p.requiresAuth).length} Protected
              </span>
            </div>
            <button
              onClick={onClose}
              className="px-6 py-3 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-xl hover:from-purple-700 hover:to-purple-800 transition font-bold"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
