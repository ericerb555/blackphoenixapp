import { useState, useEffect } from 'react';
import {
  Grid, List, Search, Filter, Plus, Eye, Edit2, Trash2, Check, X,
  Clock, Smartphone, Users, Building2, Package, Sparkles, Send,
  CheckCircle, XCircle, AlertCircle, Globe, Share2, Link as LinkIcon
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import {
  getPortals,
  getPortalStats,
  deletePortal,
  approvePortal,
  rejectPortal,
  publishPortal,
  type Portal,
  type PortalType,
  type PortalStatus,
} from '../lib/services/portalService';

type ViewMode = 'grid' | 'list';
type FilterType = 'all' | PortalStatus;

export default function PortalManagement() {
  const [portals, setPortals] = useState<Portal[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterType>('all');
  const [filterType, setFilterType] = useState<PortalType | 'all'>('all');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [portalToDelete, setPortalToDelete] = useState<Portal | null>(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [portalToReject, setPortalToReject] = useState<Portal | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [stats, setStats] = useState({
    total: 0,
    draft: 0,
    pending: 0,
    approved: 0,
    published: 0,
    rejected: 0,
  });

  useEffect(() => {
    loadPortals();
    loadStats();
  }, []);

  const loadPortals = async () => {
    try {
      setLoading(true);
      const data = await getPortals();
      setPortals(data);
    } catch (error) {
      console.error('Error loading portals:', error);
      toast.error('Failed to load portals');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const statsData = await getPortalStats();
      setStats(statsData);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const handleDelete = async () => {
    if (!portalToDelete) return;

    try {
      await deletePortal(portalToDelete.id);
      toast.success('Portal deleted successfully');
      setShowDeleteModal(false);
      setPortalToDelete(null);
      loadPortals();
      loadStats();
    } catch (error) {
      console.error('Error deleting portal:', error);
      toast.error('Failed to delete portal');
    }
  };

  const handleApprove = async (portal: Portal) => {
    try {
      await approvePortal(portal.id, 'Current User'); // Would come from auth
      toast.success('Portal approved!');
      loadPortals();
      loadStats();
    } catch (error) {
      console.error('Error approving portal:', error);
      toast.error('Failed to approve portal');
    }
  };

  const handleReject = async () => {
    if (!portalToReject || !rejectionReason) {
      toast.error('Please provide a reason for rejection');
      return;
    }

    try {
      await rejectPortal(portalToReject.id, rejectionReason, 'Current User'); // Would come from auth
      toast.success('Portal rejected');
      setShowRejectModal(false);
      setPortalToReject(null);
      setRejectionReason('');
      loadPortals();
      loadStats();
    } catch (error) {
      console.error('Error rejecting portal:', error);
      toast.error('Failed to reject portal');
    }
  };

  const handlePublish = async (portal: Portal) => {
    try {
      await publishPortal(portal.id);
      toast.success('Portal published!');
      loadPortals();
      loadStats();
    } catch (error) {
      console.error('Error publishing portal:', error);
      toast.error('Failed to publish portal');
    }
  };

  const filteredPortals = portals.filter((portal) => {
    const matchesSearch =
      searchQuery === '' ||
      portal.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      portal.description.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = filterStatus === 'all' || portal.status === filterStatus;
    const matchesType = filterType === 'all' || portal.type === filterType;

    return matchesSearch && matchesStatus && matchesType;
  });

  const getStatusColor = (status: PortalStatus) => {
    switch (status) {
      case 'draft': return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
      case 'pending_approval': return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
      case 'approved': return 'bg-green-500/10 text-green-400 border-green-500/20';
      case 'published': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'rejected': return 'bg-red-500/10 text-red-400 border-red-500/20';
      default: return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
    }
  };

  const getStatusIcon = (status: PortalStatus) => {
    switch (status) {
      case 'draft': return Clock;
      case 'pending_approval': return AlertCircle;
      case 'approved': return CheckCircle;
      case 'published': return Globe;
      case 'rejected': return XCircle;
      default: return Clock;
    }
  };

  const getTypeIcon = (type: PortalType) => {
    switch (type) {
      case 'customer': return Users;
      case 'employee': return Building2;
      case 'subcontractor': return Package;
      case 'vendor': return Building2;
      case 'custom': return Sparkles;
      default: return Smartphone;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Loading portals...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Portal Management</h1>
          <p className="text-gray-400">Create and manage custom portals</p>
        </div>
        <button
          onClick={() => window.location.href = '/portal-creation'}
          className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 text-white rounded-xl font-semibold transition"
        >
          <Plus className="w-5 h-5" />
          Create Portal
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-4">
          <p className="text-gray-400 text-sm mb-1">Total</p>
          <p className="text-2xl font-bold text-white">{stats.total}</p>
        </div>
        <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-4">
          <p className="text-gray-400 text-sm mb-1">Drafts</p>
          <p className="text-2xl font-bold text-gray-400">{stats.draft}</p>
        </div>
        <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-4">
          <p className="text-yellow-400 text-sm mb-1">Pending</p>
          <p className="text-2xl font-bold text-yellow-400">{stats.pending}</p>
        </div>
        <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-4">
          <p className="text-green-400 text-sm mb-1">Approved</p>
          <p className="text-2xl font-bold text-green-400">{stats.approved}</p>
        </div>
        <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-4">
          <p className="text-blue-400 text-sm mb-1">Published</p>
          <p className="text-2xl font-bold text-blue-400">{stats.published}</p>
        </div>
        <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-4">
          <p className="text-red-400 text-sm mb-1">Rejected</p>
          <p className="text-2xl font-bold text-red-400">{stats.rejected}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-4">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
              <input
                type="text"
                placeholder="Search portals..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white placeholder:text-gray-500 focus:outline-none focus:border-orange-500"
              />
            </div>
          </div>

          {/* Status Filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as FilterType)}
            className="px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white focus:outline-none focus:border-orange-500"
          >
            <option value="all">All Status</option>
            <option value="draft">Draft</option>
            <option value="pending_approval">Pending</option>
            <option value="approved">Approved</option>
            <option value="published">Published</option>
            <option value="rejected">Rejected</option>
          </select>

          {/* Type Filter */}
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as PortalType | 'all')}
            className="px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white focus:outline-none focus:border-orange-500"
          >
            <option value="all">All Types</option>
            <option value="customer">Customer</option>
            <option value="employee">Employee</option>
            <option value="subcontractor">Subcontractor</option>
            <option value="vendor">Vendor</option>
            <option value="custom">Custom</option>
          </select>

          {/* View Mode */}
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-3 rounded-xl transition ${
                viewMode === 'grid'
                  ? 'bg-orange-600 text-white'
                  : 'bg-[#0A0A0A] border border-[#2A2A2A] text-gray-400 hover:text-white'
              }`}
            >
              <Grid className="w-5 h-5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-3 rounded-xl transition ${
                viewMode === 'list'
                  ? 'bg-orange-600 text-white'
                  : 'bg-[#0A0A0A] border border-[#2A2A2A] text-gray-400 hover:text-white'
              }`}
            >
              <List className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Portals Grid/List */}
      {filteredPortals.length === 0 ? (
        <div className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] p-12 text-center">
          <Smartphone className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400 mb-4">No portals found</p>
          <button
            onClick={() => window.location.href = '/portal-creation'}
            className="px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-semibold transition"
          >
            Create Your First Portal
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPortals.map((portal) => {
            const StatusIcon = getStatusIcon(portal.status);
            const TypeIcon = getTypeIcon(portal.type);
            
            return (
              <div
                key={portal.id}
                className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] p-6 hover:border-orange-500/30 transition"
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center"
                      style={{ backgroundColor: `${portal.primary_color}20` }}
                    >
                      <TypeIcon className="w-6 h-6" style={{ color: portal.primary_color }} />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white">{portal.name}</h3>
                      <p className="text-sm text-gray-400 capitalize">{portal.type}</p>
                    </div>
                  </div>
                </div>

                {/* Description */}
                <p className="text-sm text-gray-400 mb-4 line-clamp-2">{portal.description}</p>

                {/* Status Badge */}
                <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-lg text-xs font-semibold border mb-4 ${getStatusColor(portal.status)}`}>
                  <StatusIcon className="w-3 h-3" />
                  {portal.status.replace('_', ' ').toUpperCase()}
                </div>

                {/* Features Count */}
                <div className="flex items-center gap-4 text-sm text-gray-400 mb-4">
                  <span>{portal.enabled_features.length} features</span>
                  <span>•</span>
                  <span>{new Date(portal.created_at).toLocaleDateString()}</span>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => window.location.href = `/portal-creation?id=${portal.id}`}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 rounded-lg transition text-sm font-semibold border border-blue-500/20"
                  >
                    <Edit2 className="w-4 h-4" />
                    Edit
                  </button>
                  
                  {portal.status === 'pending_approval' && (
                    <>
                      <button
                        onClick={() => handleApprove(portal)}
                        className="px-3 py-2 bg-green-600/10 hover:bg-green-600/20 text-green-400 rounded-lg transition border border-green-500/20"
                        title="Approve"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          setPortalToReject(portal);
                          setShowRejectModal(true);
                        }}
                        className="px-3 py-2 bg-red-600/10 hover:bg-red-600/20 text-red-400 rounded-lg transition border border-red-500/20"
                        title="Reject"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </>
                  )}

                  {portal.status === 'approved' && (
                    <button
                      onClick={() => handlePublish(portal)}
                      className="px-3 py-2 bg-orange-600/10 hover:bg-orange-600/20 text-orange-400 rounded-lg transition border border-orange-500/20"
                      title="Publish"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  )}

                  <button
                    onClick={() => {
                      setPortalToDelete(portal);
                      setShowDeleteModal(true);
                    }}
                    className="px-3 py-2 bg-red-600/10 hover:bg-red-600/20 text-red-400 rounded-lg transition border border-red-500/20"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] overflow-hidden">
          <table className="w-full">
            <thead className="border-b border-[#2A2A2A]">
              <tr>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-400">Portal</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-400">Type</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-400">Status</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-400">Features</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-400">Created</th>
                <th className="text-right px-6 py-4 text-sm font-semibold text-gray-400">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredPortals.map((portal) => {
                const StatusIcon = getStatusIcon(portal.status);
                const TypeIcon = getTypeIcon(portal.type);
                
                return (
                  <tr key={portal.id} className="border-b border-[#2A2A2A] hover:bg-[#0A0A0A] transition">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{ backgroundColor: `${portal.primary_color}20` }}
                        >
                          <TypeIcon className="w-5 h-5" style={{ color: portal.primary_color }} />
                        </div>
                        <div>
                          <p className="font-semibold text-white">{portal.name}</p>
                          <p className="text-sm text-gray-400 line-clamp-1">{portal.description}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-300 capitalize">{portal.type}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-lg text-xs font-semibold border ${getStatusColor(portal.status)}`}>
                        <StatusIcon className="w-3 h-3" />
                        {portal.status.replace('_', ' ').toUpperCase()}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-300">{portal.enabled_features.length}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-300">{new Date(portal.created_at).toLocaleDateString()}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => window.location.href = `/portal-creation?id=${portal.id}`}
                          className="p-2 hover:bg-blue-600/10 rounded-lg transition border border-transparent hover:border-blue-500/20"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4 text-blue-400" />
                        </button>
                        
                        {portal.status === 'pending_approval' && (
                          <>
                            <button
                              onClick={() => handleApprove(portal)}
                              className="p-2 hover:bg-green-600/10 rounded-lg transition border border-transparent hover:border-green-500/20"
                              title="Approve"
                            >
                              <Check className="w-4 h-4 text-green-400" />
                            </button>
                            <button
                              onClick={() => {
                                setPortalToReject(portal);
                                setShowRejectModal(true);
                              }}
                              className="p-2 hover:bg-red-600/10 rounded-lg transition border border-transparent hover:border-red-500/20"
                              title="Reject"
                            >
                              <X className="w-4 h-4 text-red-400" />
                            </button>
                          </>
                        )}

                        {portal.status === 'approved' && (
                          <button
                            onClick={() => handlePublish(portal)}
                            className="p-2 hover:bg-orange-600/10 rounded-lg transition border border-transparent hover:border-orange-500/20"
                            title="Publish"
                          >
                            <Send className="w-4 h-4 text-orange-400" />
                          </button>
                        )}

                        <button
                          onClick={() => {
                            setPortalToDelete(portal);
                            setShowDeleteModal(true);
                          }}
                          className="p-2 hover:bg-red-600/10 rounded-lg transition border border-transparent hover:border-red-500/20"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4 text-red-400" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Delete Modal */}
      {showDeleteModal && portalToDelete && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-red-500/10 rounded-xl flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-red-400" />
              </div>
              <h3 className="text-xl font-bold text-white">Delete Portal</h3>
            </div>
            
            <p className="text-gray-400 mb-6">
              Are you sure you want to delete <span className="text-white font-semibold">{portalToDelete.name}</span>? This action cannot be undone.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setPortalToDelete(null);
                }}
                className="flex-1 px-4 py-3 bg-[#2A2A2A] hover:bg-[#3A3A3A] text-white rounded-xl transition font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl transition font-semibold"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && portalToReject && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-red-500/10 rounded-xl flex items-center justify-center">
                <XCircle className="w-6 h-6 text-red-400" />
              </div>
              <h3 className="text-xl font-bold text-white">Reject Portal</h3>
            </div>
            
            <p className="text-gray-400 mb-4">
              Please provide a reason for rejecting <span className="text-white font-semibold">{portalToReject.name}</span>:
            </p>

            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Enter rejection reason..."
              className="w-full h-32 px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white placeholder:text-gray-500 focus:outline-none focus:border-orange-500 resize-none mb-6"
            />

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setPortalToReject(null);
                  setRejectionReason('');
                }}
                className="flex-1 px-4 py-3 bg-[#2A2A2A] hover:bg-[#3A3A3A] text-white rounded-xl transition font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={!rejectionReason}
                className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl transition font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
