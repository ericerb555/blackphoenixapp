import { useState, useEffect } from 'react';
import {
  FileText, Users, CheckCircle, XCircle, Clock, Eye, Search, Filter, Download,
  ArrowLeft, Loader2
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { projectId, publicAnonKey } from '../utils/supabase/info';

const API_BASE = `https://${projectId}.supabase.co/functions/v1/make-server-57095a78`;

interface Application {
  id: string;
  personalInfo?: any;
  formData?: any;
  status: 'new' | 'reviewed' | 'accepted' | 'rejected';
  submittedAt: string;
  updatedAt: string;
  [key: string]: any;
}

type StatusFilter = 'all' | 'new' | 'reviewed' | 'accepted' | 'rejected';

export default function ApplicationSubmissions() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    loadApplications();
  }, []);

  const loadApplications = async () => {
    try {
      setLoading(true);
      
      // Check for offline vendor applications first
      const offlineApps = localStorage.getItem('vendor_applications_pending');
      let offlineVendorApps: any[] = [];
      if (offlineApps) {
        offlineVendorApps = JSON.parse(offlineApps).map((app: any) => ({
          ...app,
          type: 'vendor',
          status: 'new',
          _offline: true
        }));
        console.log('[ApplicationSubmissions] Found', offlineVendorApps.length, 'pending offline vendor applications');
      }
      
      const response = await fetch(
        `${API_BASE}/applications`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
          },
        }
      ).catch(() => null);

      if (!response || !response.ok) {
        // Server offline - show only offline applications
        console.log('[ApplicationSubmissions] Server offline - showing offline applications only');
        setApplications(offlineVendorApps);
        setLoading(false);
        if (offlineVendorApps.length > 0) {
          toast.info(`Showing ${offlineVendorApps.length} offline applications`);
        }
        return;
      }

      const data = await response.json();
      if (data.success) {
        // Merge online and offline applications
        const mergedApps = [...(data.applications || []), ...offlineVendorApps];
        setApplications(mergedApps);
        
        if (offlineVendorApps.length > 0) {
          toast.warning(`${offlineVendorApps.length} offline applications pending sync`);
        }
      } else {
        toast.error('Failed to load applications');
      }
    } catch (error) {
      console.error('Error loading applications:', error);
      toast.error('Failed to load applications');
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id: string, status: Application['status']) => {
    try {
      const response = await fetch(
        `${API_BASE}/applications/${id}`,
        {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ status }),
        }
      );

      const data = await response.json();
      if (data.success) {
        setApplications(apps =>
          apps.map(app => app.id === id ? data.application : app)
        );
        toast.success('Application status updated');
        if (selectedApplication?.id === id) {
          setSelectedApplication(data.application);
        }
      } else {
        toast.error('Failed to update status');
      }
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
    }
  };

  const exportToCSV = () => {
    const headers = ['ID', 'Name', 'Email', 'Phone', 'Status', 'Submitted At'];
    const rows = filteredApplications.map(app => [
      app.id,
      getApplicantName(app),
      getApplicantEmail(app),
      getApplicantPhone(app),
      app.status,
      new Date(app.submittedAt).toLocaleString(),
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `applications-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Applications exported to CSV');
  };

  const getApplicantName = (app: Application) => {
    if (app.personalInfo) {
      return `${app.personalInfo.firstName || ''} ${app.personalInfo.lastName || ''}`.trim();
    }
    if (app.formData) {
      return `${app.formData.firstName || ''} ${app.formData.lastName || ''}`.trim();
    }
    return 'N/A';
  };

  const getApplicantEmail = (app: Application) => {
    return app.personalInfo?.email || app.formData?.email || 'N/A';
  };

  const getApplicantPhone = (app: Application) => {
    return app.personalInfo?.phone || app.formData?.phone || 'N/A';
  };

  const handleNavigation = (path: string) => {
    window.location.href = path;
  };

  const filteredApplications = applications.filter(app => {
    const matchesSearch = 
      getApplicantName(app).toLowerCase().includes(searchQuery.toLowerCase()) ||
      getApplicantEmail(app).toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || app.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const statusCounts = {
    all: applications.length,
    new: applications.filter(a => a.status === 'new').length,
    reviewed: applications.filter(a => a.status === 'reviewed').length,
    accepted: applications.filter(a => a.status === 'accepted').length,
    rejected: applications.filter(a => a.status === 'rejected').length,
  };

  const getStatusColor = (status: Application['status']) => {
    switch (status) {
      case 'new':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'reviewed':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'accepted':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'rejected':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const getStatusIcon = (status: Application['status']) => {
    switch (status) {
      case 'new':
        return <Clock className="w-4 h-4" />;
      case 'reviewed':
        return <Eye className="w-4 h-4" />;
      case 'accepted':
        return <CheckCircle className="w-4 h-4" />;
      case 'rejected':
        return <XCircle className="w-4 h-4" />;
      default:
        return <AlertCircle className="w-4 h-4" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-[#ea580c] animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading applications...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      {/* Header */}
      <div className="border-b border-[#1A1A1A] bg-[#0F0F0F] sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => window.location.href = '/unified-dashboard'}
                className="p-2 hover:bg-[#2A2A2A] rounded-lg transition-colors text-gray-400 hover:text-white"
                title="Back to Dashboard"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <h1 className="text-xl font-bold text-white">Application Submissions</h1>
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={exportToCSV}
                className="flex items-center gap-2 px-4 py-2 bg-[#1A1A1A] text-white rounded-lg hover:bg-[#2A2A2A] transition border border-[#2A2A2A]"
              >
                <Download className="w-4 h-4" />
                <span>Export CSV</span>
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-5 gap-4">
            {(['all', 'new', 'reviewed', 'accepted', 'rejected'] as StatusFilter[]).map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`p-3 rounded-lg border transition ${
                  statusFilter === status
                    ? 'bg-[#ea580c]/20 border-[#ea580c] text-white'
                    : 'bg-[#1A1A1A] border-[#2A2A2A] text-gray-400 hover:border-[#ea580c]/50'
                }`}
              >
                <div className="text-2xl font-bold mb-1">{statusCounts[status]}</div>
                <div className="text-sm capitalize">{status}</div>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Search and Filters */}
        <div className="mb-6 flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name or email..."
              className="w-full pl-10 pr-4 py-2.5 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#ea580c] transition"
            />
          </div>
        </div>

        {/* Applications List */}
        {filteredApplications.length === 0 ? (
          <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-12 text-center">
            <FileText className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No Applications Found</h3>
            <p className="text-gray-400">
              {searchQuery || statusFilter !== 'all'
                ? 'Try adjusting your filters'
                : 'Applications will appear here when submitted'}
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredApplications.map((app) => (
              <div
                key={app.id}
                className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6 hover:border-[#ea580c]/50 transition cursor-pointer"
                onClick={() => setSelectedApplication(app)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-white">
                        {getApplicantName(app)}
                      </h3>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium border flex items-center gap-1.5 ${getStatusColor(app.status)}`}>
                        {getStatusIcon(app.status)}
                        <span className="capitalize">{app.status}</span>
                      </span>
                    </div>

                    <div className="flex items-center gap-6 text-sm text-gray-400">
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4" />
                        <span>{getApplicantEmail(app)}</span>
                      </div>
                      {getApplicantPhone(app) !== 'N/A' && (
                        <div className="flex items-center gap-2">
                          <Phone className="w-4 h-4" />
                          <span>{getApplicantPhone(app)}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        <span>{new Date(app.submittedAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <select
                      value={app.status}
                      onChange={(e) => {
                        e.stopPropagation();
                        updateStatus(app.id, e.target.value as Application['status']);
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="px-3 py-1.5 bg-[#0F0F0F] border border-[#2A2A2A] rounded-lg text-white text-sm focus:outline-none focus:border-[#ea580c]"
                    >
                      <option value="new">New</option>
                      <option value="reviewed">Reviewed</option>
                      <option value="accepted">Accepted</option>
                      <option value="rejected">Rejected</option>
                    </select>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedApplication(app);
                      }}
                      className="p-2 text-gray-400 hover:text-white transition"
                    >
                      <Eye className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Application Detail Modal */}
      {selectedApplication && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-6">
          <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-[#1A1A1A] border-b border-[#2A2A2A] p-6 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-white mb-2">
                  {getApplicantName(selectedApplication)}
                </h2>
                <div className="flex items-center gap-3">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium border flex items-center gap-1.5 ${getStatusColor(selectedApplication.status)}`}>
                    {getStatusIcon(selectedApplication.status)}
                    <span className="capitalize">{selectedApplication.status}</span>
                  </span>
                  <span className="text-sm text-gray-400">
                    Submitted {new Date(selectedApplication.submittedAt).toLocaleString()}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelectedApplication(null)}
                className="p-2 text-gray-400 hover:text-white transition"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Contact Information */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-3">Contact Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-gray-400">Email</label>
                    <p className="text-white">{getApplicantEmail(selectedApplication)}</p>
                  </div>
                  {getApplicantPhone(selectedApplication) !== 'N/A' && (
                    <div>
                      <label className="text-sm text-gray-400">Phone</label>
                      <p className="text-white">{getApplicantPhone(selectedApplication)}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* All Application Data */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-3">Application Details</h3>
                <div className="bg-[#0F0F0F] border border-[#2A2A2A] rounded-lg p-4">
                  <pre className="text-sm text-gray-300 whitespace-pre-wrap overflow-x-auto">
                    {JSON.stringify(
                      selectedApplication.personalInfo || selectedApplication.formData || selectedApplication,
                      null,
                      2
                    )}
                  </pre>
                </div>
              </div>

              {/* Status Update */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-3">Update Status</h3>
                <div className="grid grid-cols-4 gap-3">
                  {(['new', 'reviewed', 'accepted', 'rejected'] as Application['status'][]).map((status) => (
                    <button
                      key={status}
                      onClick={() => updateStatus(selectedApplication.id, status)}
                      className={`px-4 py-3 rounded-lg border font-medium transition ${
                        selectedApplication.status === status
                          ? getStatusColor(status)
                          : 'bg-[#0F0F0F] border-[#2A2A2A] text-gray-400 hover:border-[#ea580c]/50'
                      }`}
                    >
                      <div className="flex items-center justify-center gap-2 mb-1">
                        {getStatusIcon(status)}
                      </div>
                      <div className="text-sm capitalize">{status}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}