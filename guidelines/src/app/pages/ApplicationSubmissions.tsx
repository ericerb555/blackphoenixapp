import { useState, useEffect } from 'react';
import {
  FileText, Users, CheckCircle, XCircle, Clock, Eye, Search, Filter, Download,
  ArrowLeft, Loader2, AlertCircle, Mail, Phone, Calendar, ShieldCheck
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { projectId } from '../utils/supabase/info';
import { supabase } from '../lib/supabase';

const API_BASE = `https://${projectId}.supabase.co/functions/v1/make-server-57095a78`;

interface Application {
  id: string;
  personalInfo?: any;
  formData?: any;
  status: 'new' | 'reviewed' | 'accepted' | 'approved' | 'rejected';
  submittedAt: string;
  updatedAt: string;
  [key: string]: any;
}

type StatusFilter = 'all' | 'new' | 'reviewed' | 'accepted' | 'approved' | 'rejected';

export default function ApplicationSubmissions() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);
  const [onboardingDetails, setOnboardingDetails] = useState<any | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [proposalQuote, setProposalQuote] = useState('');
  const [proposalNotes, setProposalNotes] = useState('');
  const [proposalSaving, setProposalSaving] = useState(false);

  useEffect(() => {
    loadApplications();
  }, []);
  const getAdminHeaders = async (withContentType = false) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) throw new Error('Sign in with an administrator account to manage applications.');
    return { Authorization: `Bearer ${session.access_token}`, ...(withContentType ? { 'Content-Type': 'application/json' } : {}) };
  };


  useEffect(() => {
    const proposal = selectedApplication?.planProposal;
    setProposalQuote(proposal?.quotedMonthlyTotal === null || proposal?.quotedMonthlyTotal === undefined ? '' : String(proposal.quotedMonthlyTotal));
    setProposalNotes(String(proposal?.notes || ''));
  }, [selectedApplication?.id, selectedApplication?.planProposal?.updatedAt]);

  useEffect(() => {
    if (!selectedApplication?.id) { setOnboardingDetails(null); return; }
    getAdminHeaders().then(headers => fetch(`${API_BASE}/intake/onboarding/${selectedApplication.id}`, { headers }))
      .then(response => response.json())
      .then(result => setOnboardingDetails(result.success ? result.intake : null))
      .catch(() => setOnboardingDetails(null));
  }, [selectedApplication?.id]);

  const loadApplications = async () => {
    try {
      setLoading(true);
      
      // Recover every legacy local application queue, not only vendor forms.
      const queueKeys = [
        'generic_app_pending__applications',
        'vendor_applications_pending',
        'service_provider_applications_pending',
        'subcontractor_applications_pending',
        'territory_applications_pending',
      ];
      const offlineVendorApps = queueKeys.flatMap((key) => {
        try {
          return JSON.parse(localStorage.getItem(key) || '[]').map((app: any) => ({
            ...app,
            applicationType: app.applicationType || app.type || 'general',
            status: app.status || 'new',
            _offline: true,
            _queueKey: key,
          }));
        } catch {
          return [];
        }
      });
      if (offlineVendorApps.length) console.log('[ApplicationSubmissions] Found', offlineVendorApps.length, 'queued offline applications');
      
      const response = await fetch(
        `${API_BASE}/applications`,
        { headers: await getAdminHeaders() }
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
        // Server is reachable — sync any offline-queued vendor applications up
        // to the server so they become real records, then clear the queue.
        let syncedCount = 0;
        if (offlineVendorApps.length > 0) {
          const pendingByQueue: Record<string, any[]> = {};
          for (const app of offlineVendorApps) {
            try {
              const { _offline, _queueKey, id, status, submittedAt, updatedAt, ...payload } = app;
              // This is an administrator recovery action, so keep the real session
              // identity rather than bypassing the server with the public anon token.
              const res = await fetch(`${API_BASE}/applications`, {
                method: 'POST', headers: await getAdminHeaders(true), body: JSON.stringify(payload),
              });
              if (res.ok) syncedCount++;
              else (pendingByQueue[_queueKey] ||= []).push(app);
            } catch (err) {
              console.error('[ApplicationSubmissions] Failed to sync offline application:', err);
              (pendingByQueue[app._queueKey] ||= []).push(app);
            }
          }
          // A record leaves its own queue only after the server confirms it saved.
          // This prevents a failed middle item from being discarded by index slicing.
          queueKeys.forEach((key) => {
            const remaining = pendingByQueue[key] || [];
            if (!remaining.length) localStorage.removeItem(key);
            else localStorage.setItem(key, JSON.stringify(remaining.map(({ _offline, _queueKey, ...app }: any) => app)));
          });
        }

        if (syncedCount > 0) {
          toast.success(`${syncedCount} offline application${syncedCount !== 1 ? 's' : ''} synced to the server`);
          // Re-fetch so the newly-synced records appear as real server records
          const refreshed = await fetch(`${API_BASE}/applications`, {
            headers: await getAdminHeaders(),
          }).then(r => r.json()).catch(() => null);
          setApplications(refreshed?.applications || data.applications || []);
        } else {
          // Merge online and any still-unsynced offline applications
          const mergedApps = [...(data.applications || []), ...offlineVendorApps];
          setApplications(mergedApps);
          if (offlineVendorApps.length > 0) {
            toast.warning(`${offlineVendorApps.length} offline applications pending sync`);
          }
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
          headers: await getAdminHeaders(true),
          body: JSON.stringify({ status }),
        }
      );

      const data = await response.json();
      if (data.success) {
        setApplications(apps =>
          apps.map(app => app.id === id ? data.application : app)
        );
        toast.success((status === 'accepted' || status === 'approved') ? 'Application approved — portal onboarding has started.' : 'Application status updated');
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

  const updatePlanProposal = async (status: 'quoted' | 'approved' | 'declined') => {
    if (!selectedApplication?.id) return;
    if ((status === 'quoted' || status === 'approved') && (proposalQuote.trim() === '' || Number.isNaN(Number(proposalQuote)) || Number(proposalQuote) < 0)) {
      toast.error('Enter a valid monthly price before sending this plan decision.');
      return;
    }
    setProposalSaving(true);
    try {
      const response = await fetch(`${API_BASE}/application-plan-proposals/${selectedApplication.id}`, {
        method: 'PATCH', headers: await getAdminHeaders(true),
        body: JSON.stringify({ status, quotedMonthlyTotal: proposalQuote.trim() === '' ? undefined : Number(proposalQuote), notes: proposalNotes }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || 'Could not update plan proposal.');
      const application = { ...selectedApplication, planProposal: result.proposal, planProposalId: result.proposal.id };
      setSelectedApplication(application);
      setApplications(apps => apps.map(app => app.id === application.id ? { ...app, planProposal: result.proposal, planProposalId: result.proposal.id } : app));
      toast.success(status === 'approved' ? `Plan price approved. Invoice ${result.invoice?.invoice_number || result.proposal.invoiceNumber || ''} is now available in the customer's portal.` : status === 'quoted' ? 'Plan quote saved for review.' : 'Plan proposal declined.');
    } catch (error: any) { toast.error(error.message || 'Could not update plan proposal.'); }
    finally { setProposalSaving(false); }
  };

  const getAdminToken = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) throw new Error('Please sign in as an administrator to review documents.');
    return session.access_token;
  };

  const openDocument = async (documentId: string) => {
    if (!selectedApplication) return;
    try {
      const accessToken = await getAdminToken();
      const response = await fetch(`${API_BASE}/intake/onboarding/${selectedApplication.id}/documents/${documentId}/download`, { headers: { Authorization: `Bearer ${accessToken}` } });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || 'Could not open document.');
      window.open(result.url, '_blank', 'noopener,noreferrer');
    } catch (error: any) { toast.error(error.message || 'Could not open document.'); }
  };

  const reviewDocument = async (documentId: string, status: 'approved' | 'rejected') => {
    if (!selectedApplication) return;
    try {
      const response = await fetch(`${API_BASE}/intake/onboarding/${selectedApplication.id}/documents/${documentId}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${await getAdminToken()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || 'Review failed');
      setOnboardingDetails((current: any) => current ? { ...current, documents: result.documents, requiredTasks: result.requiredTasks } : current);
      toast.success(status === 'approved' ? 'Document approved.' : 'Document returned to applicant.');
    } catch (error: any) {
      toast.error(error.message || 'Could not review document.');
    }
  };

  const exportToCSV = () => {
    const headers = ['ID', 'Name', 'Email', 'Phone', 'Portal', 'Onboarding', 'Status', 'Submitted At'];
    const rows = filteredApplications.map(app => [
      app.id,
      getApplicantName(app),
      getApplicantEmail(app),
      getApplicantPhone(app),
      getPortalLabel(app),
      app.onboardingStatus || 'awaiting review',
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
    const nested = app.personalInfo || app.formData || {};
    return app.name || app.full_name || app.contact_name ||
      `${nested.firstName || app.firstName || ''} ${nested.lastName || app.lastName || ''}`.trim() || 'N/A';
  };

  const getApplicantEmail = (app: Application) =>
    app.email || app.contact_email || app.personalInfo?.email || app.formData?.email || 'N/A';

  const getApplicantPhone = (app: Application) =>
    app.phone || app.contact_phone || app.personalInfo?.phone || app.formData?.phone || 'N/A';

  const getPortalLabel = (app: Application) =>
    String(app.portalType || app.applicationType || app.type || 'general').replace(/_/g, ' ');

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
    accepted: applications.filter(a => a.status === 'accepted' || a.status === 'approved').length,
    rejected: applications.filter(a => a.status === 'rejected').length,
  };

  const getStatusColor = (status: Application['status']) => {
    switch (status) {
      case 'new':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'reviewed':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'accepted':
      case 'approved':
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
      case 'approved':
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
                      <span className="px-3 py-1 rounded-full text-xs font-medium border border-cyan-500/30 bg-cyan-500/10 text-cyan-200 capitalize flex items-center gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        {getPortalLabel(app)} · {String(app.onboardingStatus || 'awaiting review').replace(/_/g, ' ')}
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

              <div className="rounded-lg border border-cyan-500/20 bg-cyan-500/5 p-4">
                <p className="text-xs uppercase tracking-[0.14em] text-cyan-200/70 mb-1">Portal handoff</p>
                <p className="text-white font-medium capitalize">{getPortalLabel(selectedApplication)} portal</p>
                <p className="text-sm text-gray-400 mt-1">Onboarding: {String(selectedApplication.onboardingStatus || 'awaiting_review').replace(/_/g, ' ')}</p>
                {selectedApplication.onboardingStatus === 'provisioning_failed' && <p className="text-sm text-red-300 mt-2">Portal provisioning failed. Check Admin Alerts for the specific recovery action.</p>}
              </div>

              {onboardingDetails && (
                <div>
                  <h3 className="text-lg font-semibold text-white mb-3">Onboarding document review</h3>
                  <div className="space-y-3">
                    {(onboardingDetails.documents || []).length === 0 ? <p className="text-sm text-gray-500">No onboarding documents have been submitted yet.</p> : onboardingDetails.documents.map((document: any) => (
                      <div key={document.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] p-3">
                        <div><button type="button" onClick={() => openDocument(document.id)} className="text-left text-sm font-medium text-orange-200 underline underline-offset-4">{document.name}</button><p className="text-xs capitalize text-gray-500">{document.taskId.replace(/_/g, ' ')} · {document.status}</p></div>
                        {document.status === 'submitted' && <div className="flex gap-2"><button onClick={() => reviewDocument(document.id, 'approved')} className="border border-emerald-500/40 px-3 py-1.5 text-xs text-emerald-300 hover:bg-emerald-500/10">Approve</button><button onClick={() => reviewDocument(document.id, 'rejected')} className="border border-red-500/40 px-3 py-1.5 text-xs text-red-300 hover:bg-red-500/10">Return</button></div>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedApplication.planPreference && (
                <div className="rounded-xl border border-orange-500/30 bg-orange-500/5 p-5 space-y-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div><p className="text-xs uppercase tracking-[0.14em] text-orange-200/70">Requested plan preference</p><h3 className="mt-1 text-lg font-bold text-white">{selectedApplication.planPreference.planName || 'Custom plan'}</h3><p className="mt-1 text-sm text-gray-400">{(selectedApplication.planPreference.serviceNames || []).join(' · ') || 'Services to be reviewed'}</p></div>
                    <span className="rounded-full border border-orange-500/30 px-3 py-1 text-xs font-bold capitalize text-orange-200">{String(selectedApplication.planProposal?.status || 'awaiting application approval').replace(/_/g, ' ')}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm"><div><p className="text-gray-500">Requested monthly estimate</p><p className="font-bold text-white">${Number(selectedApplication.planPreference.monthlyTotal || 0).toFixed(2)}</p></div><div><p className="text-gray-500">Frequency</p><p className="font-bold capitalize text-white">{String(selectedApplication.planPreference.frequencyId || 'monthly').replace(/_/g, ' ')}</p></div></div>
                  {!selectedApplication.planProposal ? <p className="rounded-lg bg-black/20 p-3 text-sm text-gray-400">Approve this application first to open the controlled pricing review. No plan, service hours, or billing is activated yet.</p> : <>
                    {selectedApplication.planProposal.invoiceNumber && <p className="rounded-lg border border-emerald-500/25 bg-emerald-500/10 p-3 text-sm text-emerald-100">Payment invoice: <strong>{selectedApplication.planProposal.invoiceNumber}</strong> · {String(selectedApplication.planProposal.status) === 'active' ? 'Paid and activated' : 'Visible in the customer portal for secure payment.'}</p>}
                    <div className="grid gap-3 sm:grid-cols-2"><label className="text-sm text-gray-400">Approved monthly price<input value={proposalQuote} onChange={event => setProposalQuote(event.target.value)} type="number" min="0" step="0.01" placeholder="0.00" className="mt-1 w-full rounded-lg border border-[#333] bg-[#0F0F0F] px-3 py-2 text-white focus:border-orange-500 focus:outline-none" /></label><label className="text-sm text-gray-400">Pricing notes<textarea value={proposalNotes} onChange={event => setProposalNotes(event.target.value)} rows={2} placeholder="Scope, exclusions, or next steps" className="mt-1 w-full rounded-lg border border-[#333] bg-[#0F0F0F] px-3 py-2 text-white focus:border-orange-500 focus:outline-none" /></label></div>
                    <div className="flex flex-wrap gap-2"><button disabled={proposalSaving} onClick={() => updatePlanProposal('quoted')} className="rounded-lg border border-sky-500/40 px-3 py-2 text-sm font-bold text-sky-200 disabled:opacity-50">Save Quote</button><button disabled={proposalSaving} onClick={() => updatePlanProposal('approved')} className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-bold text-white disabled:opacity-50">Approve Price</button><button disabled={proposalSaving} onClick={() => updatePlanProposal('declined')} className="rounded-lg border border-red-500/40 px-3 py-2 text-sm font-bold text-red-200 disabled:opacity-50">Decline Plan</button></div>
                  </>}
                </div>
              )}

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
                  {(['new', 'reviewed', 'approved', 'rejected'] as Application['status'][]).map((status) => (
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