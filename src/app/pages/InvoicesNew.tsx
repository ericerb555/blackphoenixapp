import { useState, useEffect } from 'react';
import {
  FileText, Search, Filter, Download, Plus, Grid, List,
  DollarSign, Clock, CheckCircle, XCircle, AlertCircle,
  Calendar, User, TrendingUp, Activity, Edit2, Trash2, Eye, ArrowLeft, CreditCard, Wallet, Copy
} from 'lucide-react';
import { DataTable, type DataTableColumn } from '../components/ui/table';
import DeleteConfirmationModal from '../components/ui/DeleteConfirmationModal';
import CreateInvoiceModal from '../components/invoices/CreateInvoiceModal';
import InvoicePreviewModal from '../components/invoices/InvoicePreviewModal';
import { InvoiceService, type Invoice } from '../lib/services/invoiceService';
import { toast } from 'sonner@2.0.3';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { projectId } from '../utils/supabase/info';
import { CompanyDatabaseService } from '../lib/services/companyDatabaseService';
import { pickMainAppCompany, setActiveCompanyInfo } from '../lib/config/companyInfo';

type ViewMode = 'grid' | 'list';
type TabType = 'all' | 'draft' | 'pending' | 'paid' | 'overdue';

export default function InvoicesNew() {
  const { user, isOwner: isCompanyOwner, isAdmin, isMasterAdmin } = useAuth();

  /**
   * Who may manage an invoice on this screen.
   *
   * `isOwner` alone was too narrow, and it made the whole tab inert: it is true
   * only when there is a row in `company_members` with role 'owner' and
   * is_active set, so an administrator — or an owner whose membership row was
   * never written — got no Edit button, no payment button, and a card that did
   * nothing when clicked. Nothing on screen explained why.
   *
   * The server is the real gate and always was: every write goes through
   * `financialActor` and is refused without administrator access. So this
   * decides what is worth offering, and the server decides what is allowed.
   * Matching the server's notion of who manages money is the point — a UI
   * stricter than the rule behind it is indistinguishable from a broken screen.
   */
  const canManage = Boolean(isCompanyOwner || isAdmin || isMasterAdmin);
  const isOwner = canManage;
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [invoiceToDelete, setInvoiceToDelete] = useState<Invoice | null>(null);
  const [invoiceToPreview, setInvoiceToPreview] = useState<Invoice | null>(null);
  const [invoiceToEdit, setInvoiceToEdit] = useState<Invoice | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [pendingProjectData, setPendingProjectData] = useState<any>(null);
  const [stellarInvoice, setStellarInvoice] = useState<Invoice | null>(null);
  const [stellarInstructions, setStellarInstructions] = useState<any>(null);
  const [stellarTransactionHash, setStellarTransactionHash] = useState('');
  const [stellarAmount, setStellarAmount] = useState('');
  const [stellarLoading, setStellarLoading] = useState(false);
  // Recording money that arrived by hand — a check, cash, a transfer done
  // outside Stripe. Every other payment route here leaves a processor record
  // behind it; this one leaves only what gets typed, so it asks for enough to
  // find the payment on a bank statement later.
  const [payingInvoice, setPayingInvoice] = useState<Invoice | null>(null);
  const [payMethod, setPayMethod] = useState<'check' | 'cash' | 'bank_transfer' | 'other'>('check');
  const [payAmount, setPayAmount] = useState('');
  const [payReference, setPayReference] = useState('');
  const [payReceivedAt, setPayReceivedAt] = useState('');
  const [payNote, setPayNote] = useState('');
  const [paySaving, setPaySaving] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    draft: 0,
    pending: 0,
    paid: 0,
    overdue: 0,
    totalRevenue: 0,
    pendingRevenue: 0,
  });

  useEffect(() => {
    loadInvoices();
    loadStats();
    // Invoices always represent the main app business (Black Phoenix Builds),
    // never the ecommerce store — resolve and apply it regardless of any switch.
    (async () => {
      try {
        const { data: companies } = await CompanyDatabaseService.getCompanies();
        const mainApp = pickMainAppCompany(companies || []);
        if (mainApp) setActiveCompanyInfo(mainApp);
      } catch (err) {
        console.error('[InvoicesNew] Could not resolve main-app company:', err);
      }
    })();
  }, []);

  // Read tab from URL on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab') as TabType;
    if (tab && ['all', 'draft', 'pending', 'paid', 'overdue'].includes(tab)) {
      setActiveTab(tab);
    }
    
    // Check if we should auto-open create invoice modal from pipeline
    const createNew = params.get('createNew');
    if (createNew === 'true') {
      // Load project data from sessionStorage
      const projectDataStr = sessionStorage.getItem('pendingInvoiceData');
      if (projectDataStr) {
        try {
          const projectData = JSON.parse(projectDataStr);
          setPendingProjectData(projectData);
          // Clear it from storage after reading
          sessionStorage.removeItem('pendingInvoiceData');
        } catch (error) {
          console.error('Failed to parse pending invoice data:', error);
        }
      }
      
      setShowCreateModal(true);
      // Clean up the URL parameter
      const url = new URL(window.location.href);
      url.searchParams.delete('createNew');
      window.history.replaceState({}, '', url.toString());
    }
  }, []);

  // Update URL when tab changes
  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    const url = new URL(window.location.href);
    url.searchParams.set('tab', tab);
    window.history.pushState({}, '', url.toString());
  };

  const loadInvoices = async () => {
    try {
      setLoading(true);
      setError(null);
      const { data, error: invoiceError } = await InvoiceService.getInvoices();
      if (invoiceError) throw invoiceError;
      setInvoices(data || []);
    } catch (err: any) {
      console.error('Error loading invoices:', err);
      setError(err.message || 'Failed to load invoices');
      toast.error('Failed to load invoices');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const statsData = await InvoiceService.getInvoiceStats();
      setStats(statsData);
    } catch (err) {
      console.error('Error loading stats:', err);
    }
  };

  const handleCreateSuccess = () => {
    loadInvoices();
    loadStats();
  };

  const handleViewInvoice = (invoice: Invoice, e: React.MouseEvent) => {
    e.stopPropagation();
    setInvoiceToPreview(invoice);
    setShowPreviewModal(true);
  };

  const handlePayInvoice = async (invoice: Invoice, e: React.MouseEvent, paymentMethod: 'card' | 'us_bank_account' = 'card') => {
    e.stopPropagation();
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Sign in to pay this invoice.');
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6/payments/create-checkout`, {
        method: 'POST', headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoiceId: invoice.id, amount: invoice.balance_due, paymentMethod, description: `Invoice #${invoice.invoice_number}` }),
      });
      const result = await response.json();
      if (!response.ok || !result.checkoutUrl) throw new Error(result.error || 'Unable to start secure checkout.');
      window.location.assign(result.checkoutUrl);
    } catch (error: any) { toast.error(error?.message || 'Unable to start payment.'); }
  };


  const openStellarInstructions = async (invoice: Invoice, e: React.MouseEvent) => {
    e.stopPropagation(); setStellarInvoice(invoice); setStellarInstructions(null); setStellarTransactionHash(''); setStellarAmount(''); setStellarLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6/invoices/${encodeURIComponent(invoice.id)}/stellar-instructions`, { headers: { Authorization: `Bearer ${session?.access_token || ''}` } });
      const result = await response.json(); if (!response.ok || !result.success) throw new Error(result.error || 'Stellar payments are not currently available.'); setStellarInstructions(result);
    } catch (error: any) { toast.error(error?.message || 'Could not load Stellar instructions.'); setStellarInvoice(null); }
    finally { setStellarLoading(false); }
  };

  /**
   * Open an invoice.
   *
   * The card already looked clickable — `cursor-pointer`, a hover state, and
   * buttons inside it calling `stopPropagation` as though something sat behind
   * them — but nothing was ever wired to it, so clicking an invoice did
   * nothing. Both views now go through here so the card and the list behave the
   * same way rather than one of them being the real one.
   */
  const openInvoice = (invoice: Invoice) => {
    // Editing is an administrator action. A customer clicking their own invoice
    // should not be dropped into the editor for it, so for them this stays a
    // no-op rather than opening something they cannot save.
    if (!isOwner) return;
    setInvoiceToEdit(invoice);
    setShowCreateModal(true);
  };

  /**
   * What is still owed on this invoice, worked out the way the server does.
   *
   * WHY THIS EXISTS RATHER THAN READING balance_due
   *
   * The Record payment button used to show only when `invoice.balance_due > 0`,
   * with a comment claiming it matched what the server enforces. It did not.
   * The server computes `(total_amount ?? total) - (paid_amount ?? 0)` and never
   * looks at balance_due at all — so an invoice carrying a total and no
   * balance_due field, which older records do, was past due everywhere else in
   * the app and had no way to be settled on this screen. Eric hit exactly that:
   * he went to mark one paid and there was nothing to press.
   *
   * The fallback chain matches the one the command center uses to decide an
   * invoice is delinquent, so the two screens cannot disagree about whether
   * money is outstanding.
   */
  const outstandingOn = (invoice: any): number => {
    const total = Number(invoice.total_amount ?? invoice.total ?? 0);
    const paid = Number(invoice.paid_amount ?? 0);
    const fromTotals = total - paid;
    const stated = Number(invoice.balance_due ?? invoice.balanceDue ?? NaN);
    // Prefer the arithmetic; fall back to a stated balance when there are no
    // totals to work from at all.
    return Number.isFinite(fromTotals) && total > 0
      ? Math.round(fromTotals * 100) / 100
      : (Number.isFinite(stated) ? stated : 0);
  };

  /** Settled, void or never issued — nothing to record against either way. */
  const SETTLED = ['paid', 'completed', 'cancelled', 'void', 'refunded', 'draft'];
  const hasOutstanding = (invoice: any) =>
    !SETTLED.includes(String(invoice.status || '').toLowerCase())
    && outstandingOn(invoice) > 0;

  /** Open the record-payment panel, defaulting to settling the whole balance. */
  const openRecordPayment = (invoice: Invoice, e: React.MouseEvent) => {
    e.stopPropagation();
    setPayingInvoice(invoice);
    setPayMethod('check');
    // Prefilled because paying the balance in full is the common case, and it
    // is easier to change a number than to look one up.
    setPayAmount(String(outstandingOn(invoice) || ''));
    setPayReference('');
    setPayReceivedAt(new Date().toISOString().slice(0, 10));
    setPayNote('');
  };

  const submitRecordPayment = async () => {
    if (!payingInvoice) return;
    setPaySaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6/invoices/${encodeURIComponent(payingInvoice.id)}/record-payment`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${session?.access_token || ''}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amount: Number(payAmount),
            method: payMethod,
            reference: payReference,
            receivedAt: payReceivedAt,
            note: payNote,
          }),
        },
      );
      const result = await response.json();
      // The server decides whether this settles the invoice; the screen only
      // reports what it decided.
      if (!response.ok || !result.success) throw new Error(result.error || 'Could not record that payment.');
      toast.success(result.invoice?.status === 'paid'
        ? 'Payment recorded — invoice settled.'
        : `Payment recorded — $${Number(result.invoice?.balance_due || 0).toFixed(2)} still due.`);
      setPayingInvoice(null);
      loadInvoices();
      loadStats();
    } catch (error: any) {
      toast.error(error?.message || 'Could not record that payment.');
    } finally {
      setPaySaving(false);
    }
  };

  const submitStellarPayment = async () => {
    if (!stellarInvoice || !stellarTransactionHash) return;
    try {
      setStellarLoading(true); const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6/invoices/${encodeURIComponent(stellarInvoice.id)}/stellar-payment-submissions`, { method: 'POST', headers: { Authorization: `Bearer ${session?.access_token || ''}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ transactionHash: stellarTransactionHash, amount: stellarAmount, assetCode: stellarInstructions?.wallet?.assetCode }) });
      const result = await response.json(); if (!response.ok || !result.success) throw new Error(result.error || 'Could not submit Stellar payment.'); toast.success('Stellar transaction submitted for reconciliation.'); setStellarInvoice(null);
    } catch (error: any) { toast.error(error?.message || 'Could not submit Stellar payment.'); }
    finally { setStellarLoading(false); }
  };

  const handleDeleteClick = (invoice: Invoice, e: React.MouseEvent) => {
    e.stopPropagation();
    setInvoiceToDelete(invoice);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!invoiceToDelete) return;

    setDeleteLoading(true);
    try {
      const { error } = await InvoiceService.deleteInvoice(invoiceToDelete.id);
      if (error) throw error;
      
      toast.success('Invoice deleted successfully!');
      setShowDeleteModal(false);
      setInvoiceToDelete(null);
      loadInvoices();
      loadStats();
    } catch (error: any) {
      console.error('Error deleting invoice:', error);
      toast.error(error.message || 'Failed to delete invoice');
    } finally {
      setDeleteLoading(false);
    }
  };

  const filteredInvoices = invoices.filter((invoice) => {
    const matchesSearch =
      searchQuery === '' ||
      invoice.invoice_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      invoice.customer_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      invoice.customer_email?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesTab =
      activeTab === 'all' ||
      (activeTab === 'draft' && invoice.is_draft) ||
      (activeTab !== 'draft' && invoice.status === activeTab);

    return matchesSearch && matchesTab;
  });

  const getStatusColor = (status: string, isDraft: boolean) => {
    if (isDraft) return 'gray';
    switch (status) {
      case 'paid':
        return 'green';
      case 'pending':
        return 'blue';
      case 'overdue':
        return 'red';
      case 'partial':
        return 'yellow';
      case 'cancelled':
        return 'gray';
      default:
        return 'gray';
    }
  };

  const getStatusIcon = (status: string, isDraft: boolean) => {
    if (isDraft) return Clock;
    switch (status) {
      case 'paid':
        return CheckCircle;
      case 'pending':
        return Clock;
      case 'overdue':
        return AlertCircle;
      case 'partial':
        return Activity;
      case 'cancelled':
        return XCircle;
      default:
        return Clock;
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Not set';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const statsDisplay = [
    { label: 'Total Invoices', value: stats.total, change: '+8%', icon: FileText },
    { label: 'Draft', value: stats.draft, change: '+3%', icon: Clock },
    { label: 'Pending', value: stats.pending, change: '+12%', icon: Activity },
    { label: 'Paid', value: stats.paid, change: '+15%', icon: CheckCircle },
    {
      label: 'Total Revenue',
      value: `$${(stats.totalRevenue / 1000).toFixed(1)}k`,
      change: '+22%',
      icon: DollarSign,
    },
    {
      label: 'Pending Revenue',
      value: `$${(stats.pendingRevenue / 1000).toFixed(1)}k`,
      change: '+5%',
      icon: TrendingUp,
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Loading invoices...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <p className="text-red-400 mb-4">{error}</p>
          <button
            onClick={loadInvoices}
            className="px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-semibold transition"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full px-6 py-6 space-y-6" style={{ alignSelf: 'stretch' }}>
      {/* Header */}
      <div>
        <div className="flex items-center gap-4 mb-2">
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              console.log('🔙 Back button clicked from Invoice Management');
              
              // Check if we came from pipeline
              const returnTo = sessionStorage.getItem('invoiceReturnTo');
              console.log('📍 Return destination:', returnTo || 'unified-dashboard (default)');
              
              if (returnTo === 'pipeline') {
                sessionStorage.removeItem('invoiceReturnTo');
                console.log('✅ Navigating to pipeline');
                window.location.href = '/pipeline';
              } else {
                console.log('✅ Navigating to unified-dashboard (command center)');
                window.location.href = '/unified-dashboard';
              }
            }}
            className="p-2 hover:bg-[#2A2A2A] rounded-lg transition-colors text-gray-400 hover:text-white cursor-pointer"
            title="Back to Command Center"
            type="button"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-3xl font-bold text-white flex items-center gap-2">
            <FileText className="w-8 h-8 text-orange-400" />
            Invoice Management
          </h1>
        </div>
        <p className="text-gray-400 ml-14">Create and manage invoices for your customers</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {statsDisplay.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div
              key={i}
              className="bg-[#1A1A1A] rounded-2xl p-4 border border-[#2A2A2A] hover:border-orange-500/30 transition group"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-600/20 to-orange-700/20 flex items-center justify-center border border-orange-500/20">
                  <Icon className="w-5 h-5 text-orange-400" />
                </div>
                <span className="text-sm font-semibold text-green-400">{stat.change}</span>
              </div>
              <p className="text-2xl font-bold text-white">{stat.value}</p>
              <p className="text-sm text-gray-400">{stat.label}</p>
            </div>
          );
        })}
      </div>

      {/* Filters & Actions */}
      <div className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] p-6">
        <div className="flex items-center gap-4 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
            <input
              type="text"
              placeholder="Search invoices by number, customer name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50"
            />
          </div>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-3 border rounded-xl transition-colors ${
              showFilters
                ? 'bg-orange-600 text-white border-orange-600'
                : 'border-[#2A2A2A] text-gray-300 hover:bg-[#2A2A2A]'
            }`}
          >
            <Filter className="w-4 h-4" />
            Filters
          </button>

          <div className="flex items-center gap-2 p-1 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg ${
                viewMode === 'grid'
                  ? 'bg-orange-600 text-white'
                  : 'text-gray-400 hover:bg-[#2A2A2A]'
              }`}
            >
              <Grid className="w-5 h-5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg ${
                viewMode === 'list'
                  ? 'bg-orange-600 text-white'
                  : 'text-gray-400 hover:bg-[#2A2A2A]'
              }`}
            >
              <List className="w-5 h-5" />
            </button>
          </div>

          <button className="flex items-center gap-2 px-4 py-3 border border-[#2A2A2A] rounded-xl text-gray-300 hover:bg-[#2A2A2A] transition">
            <Download className="w-4 h-4" />
            Export
          </button>

          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-orange-600 to-orange-700 text-white rounded-xl hover:from-orange-700 hover:to-orange-800 transition shadow-lg shadow-orange-500/20"
          >
            <Plus className="w-4 h-4" />
            New Invoice
          </button>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleTabChange('all')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
              activeTab === 'all'
                ? 'bg-orange-600 text-white'
                : 'bg-[#0A0A0A] text-gray-400 hover:bg-[#2A2A2A]'
            }`}
          >
            All ({stats.total})
          </button>
          <button
            onClick={() => handleTabChange('draft')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
              activeTab === 'draft'
                ? 'bg-gray-600 text-white'
                : 'bg-[#0A0A0A] text-gray-400 hover:bg-[#2A2A2A]'
            }`}
          >
            Draft ({stats.draft})
          </button>
          <button
            onClick={() => handleTabChange('pending')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
              activeTab === 'pending'
                ? 'bg-blue-600 text-white'
                : 'bg-[#0A0A0A] text-gray-400 hover:bg-[#2A2A2A]'
            }`}
          >
            Pending ({stats.pending})
          </button>
          <button
            onClick={() => handleTabChange('paid')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
              activeTab === 'paid'
                ? 'bg-green-600 text-white'
                : 'bg-[#0A0A0A] text-gray-400 hover:bg-[#2A2A2A]'
            }`}
          >
            Paid ({stats.paid})
          </button>
          <button
            onClick={() => handleTabChange('overdue')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
              activeTab === 'overdue'
                ? 'bg-red-600 text-white'
                : 'bg-[#0A0A0A] text-gray-400 hover:bg-[#2A2A2A]'
            }`}
          >
            Overdue ({stats.overdue})
          </button>
        </div>
      </div>

      {/* Draft Info Banner */}
      {activeTab === 'draft' && (
        <div className="bg-gradient-to-r from-gray-900/50 to-gray-800/50 border border-gray-700/50 rounded-xl p-4 mb-6">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-gray-600/20 rounded-xl flex items-center justify-center flex-shrink-0">
              <Clock className="w-5 h-5 text-gray-400" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-white mb-1">Draft Invoices</h3>
              <p className="text-sm text-gray-300 mb-2">
                These invoices are saved without a customer assignment. They'll be stored here until you:
              </p>
              <ul className="text-sm text-gray-400 space-y-1 ml-4 list-disc">
                <li>Assign a customer when they sign up for the app</li>
                <li>Convert them to active invoices</li>
                <li>Delete them if no longer needed</li>
              </ul>
              <p className="text-sm text-gray-500 mt-3">
                💡 Tip: You can create invoices for work before the customer has an account, then assign them later.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Invoice Grid */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredInvoices.map((invoice) => {
            const statusColor = getStatusColor(invoice.status, invoice.is_draft);
            const StatusIcon = getStatusIcon(invoice.status, invoice.is_draft);

            return (
              <div
                key={invoice.id}
                onClick={() => openInvoice(invoice)}
                role={isOwner ? 'button' : undefined}
                tabIndex={isOwner ? 0 : undefined}
                onKeyDown={isOwner ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openInvoice(invoice); } } : undefined}
                // Only offer the pointer to somebody the click will actually do
                // something for. Showing a hand to a customer who cannot edit is
                // the same lie the card was telling everyone before.
                className={`bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] p-6 hover:border-orange-500/30 hover:bg-gradient-to-br hover:from-orange-600/5 hover:to-orange-700/5 transition group ${isOwner ? 'cursor-pointer' : ''}`}
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm font-mono text-gray-500">{invoice.invoice_number}</span>
                      {invoice.is_draft && (
                        <span className="px-2 py-0.5 rounded text-sm font-semibold bg-gray-500/10 text-gray-400 border border-gray-500/20">
                          DRAFT
                        </span>
                      )}
                    </div>
                    <h3 className="font-semibold text-white group-hover:text-orange-400 transition">
                      {invoice.customer_name || <span className="italic text-gray-500">No Customer Assigned</span>}
                    </h3>
                    {invoice.customer_email ? (
                      <p className="text-sm text-gray-400">{invoice.customer_email}</p>
                    ) : (
                      <p className="text-sm text-gray-500 italic">Awaiting customer signup</p>
                    )}
                  </div>
                  <span
                    className={`px-3 py-1 rounded-lg text-sm font-semibold flex items-center gap-1 ${
                      statusColor === 'green'
                        ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                        : statusColor === 'blue'
                        ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                        : statusColor === 'red'
                        ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                        : statusColor === 'yellow'
                        ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
                        : 'bg-gray-500/10 text-gray-400 border border-gray-500/20'
                    }`}
                  >
                    <StatusIcon className="w-3 h-3" />
                    {invoice.is_draft ? 'DRAFT' : invoice.status.toUpperCase()}
                  </span>
                </div>

                {/* Dates */}
                <div className="space-y-2 mb-4 pb-4 border-b border-[#2A2A2A]">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Issue Date</span>
                    <span className="text-gray-300">{formatDate(invoice.issue_date)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Due Date</span>
                    <span className="text-gray-300">{formatDate(invoice.due_date)}</span>
                  </div>
                </div>

                {/* Amount */}
                <div className="mb-4">
                  <p className="text-sm text-gray-500 mb-1">Total Amount</p>
                  <p className="text-2xl font-bold text-orange-400">
                    ${invoice.total_amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </p>
                  {invoice.balance_due > 0 && invoice.balance_due !== invoice.total_amount && (
                    <p className="text-sm text-yellow-400 mt-1">
                      Balance Due: ${invoice.balance_due.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={(e) => handleViewInvoice(invoice, e)} className="flex items-center justify-center gap-2 px-3 py-2 bg-orange-600/10 hover:bg-orange-600/20 rounded-lg text-orange-400 text-sm font-semibold transition border border-orange-500/20"><Eye className="w-4 h-4" /> View</button>
                  {isOwner ? <button onClick={(e) => { e.stopPropagation(); setInvoiceToEdit(invoice); setShowCreateModal(true); }} className="flex items-center justify-center gap-2 px-3 py-2 bg-blue-600/10 hover:bg-blue-600/20 rounded-lg text-blue-400 text-sm font-semibold transition border border-blue-500/20"><Edit2 className="w-4 h-4" /> Edit</button> : hasOutstanding(invoice) ? <div className="grid grid-cols-2 gap-2"><button onClick={(e) => handlePayInvoice(invoice, e, 'card')} className="flex items-center justify-center gap-1 px-2 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-white text-xs font-bold transition"><CreditCard className="w-4 h-4" /> Card</button><button onClick={(e) => handlePayInvoice(invoice, e, 'us_bank_account')} className="rounded-lg border border-emerald-500/40 px-2 py-2 text-xs font-bold text-emerald-300 hover:bg-emerald-500/10">ACH bank</button></div> : <span className="flex items-center justify-center rounded-lg border border-white/10 text-sm text-gray-400">{invoice.status === 'paid' ? 'Paid' : 'No payment due'}</span>}
                  {/*
                    Recording a check or cash. Only for staff, only where money
                    is genuinely still outstanding — worked out the way the
                    server works it out, so the button and the rule agree.

                    They did not agree before: this read `balance_due > 0` while
                    the server reads `total_amount - paid_amount`, so an invoice
                    without a balance_due field was chased everywhere and could
                    be settled nowhere.
                  */}
                  {isOwner && hasOutstanding(invoice) && (
                    <button onClick={(e) => openRecordPayment(invoice, e)} className="col-span-2 flex items-center justify-center gap-2 px-3 py-2 bg-emerald-600/10 hover:bg-emerald-600/20 rounded-lg text-emerald-400 text-sm font-semibold transition border border-emerald-500/20">
                      <DollarSign className="w-4 h-4" /> Record check or cash
                    </button>
                  )}
                  {isOwner && <button onClick={(e) => handleDeleteClick(invoice, e)} className="col-span-2 flex items-center justify-center gap-2 px-3 py-2 bg-red-600/10 hover:bg-red-600/20 rounded-lg text-red-400 text-sm font-semibold transition border border-red-500/20"><Trash2 className="w-4 h-4" /> Delete</button>}
                  {!isOwner && hasOutstanding(invoice) && <button onClick={(e) => openStellarInstructions(invoice, e)} className="col-span-2 flex items-center justify-center gap-2 rounded-lg border border-cyan-500/35 px-3 py-2 text-sm font-bold text-cyan-300 hover:bg-cyan-500/10"><Wallet className="w-4 h-4" /> Pay with Stellar</button>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* List View */}
      {viewMode === 'list' && (
        <DataTable
          columns={[
            {
              key: 'invoice',
              header: 'Invoice',
              sortable: true,
              sortFn: (a, b) => a.invoice_number.localeCompare(b.invoice_number),
              render: (invoice: Invoice) => (
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-mono text-white font-semibold">
                      {invoice.invoice_number}
                    </span>
                    {invoice.is_draft && (
                      <span className="px-2 py-0.5 rounded text-sm font-semibold bg-gray-500/10 text-gray-400 border border-gray-500/20">
                        DRAFT
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-400">
                    {invoice.customer_name || <span className="italic text-gray-500">No Customer Assigned</span>}
                  </p>
                  {!invoice.customer_email && invoice.is_draft && (
                    <p className="text-sm text-gray-500 italic mt-0.5">Awaiting customer signup</p>
                  )}
                </div>
              ),
            },
            {
              key: 'status',
              header: 'Status',
              sortable: true,
              sortFn: (a, b) => a.status.localeCompare(b.status),
              render: (invoice: Invoice) => {
                const statusColor = getStatusColor(invoice.status, invoice.is_draft);
                const StatusIcon = getStatusIcon(invoice.status, invoice.is_draft);
                return (
                  <span
                    className={`px-3 py-1 rounded-lg text-sm font-semibold flex items-center gap-1 w-fit ${
                      statusColor === 'green'
                        ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                        : statusColor === 'blue'
                        ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                        : statusColor === 'red'
                        ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                        : statusColor === 'yellow'
                        ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
                        : 'bg-gray-500/10 text-gray-400 border border-gray-500/20'
                    }`}
                  >
                    <StatusIcon className="w-3 h-3" />
                    {invoice.is_draft ? 'DRAFT' : invoice.status.toUpperCase()}
                  </span>
                );
              },
            },
            {
              key: 'issue_date',
              header: 'Issue Date',
              sortable: true,
              sortFn: (a, b) => (a.issue_date || '').localeCompare(b.issue_date || ''),
              render: (invoice: Invoice) => (
                <p className="text-sm text-gray-300">{formatDate(invoice.issue_date)}</p>
              ),
            },
            {
              key: 'due_date',
              header: 'Due Date',
              sortable: true,
              sortFn: (a, b) => (a.due_date || '').localeCompare(b.due_date || ''),
              render: (invoice: Invoice) => (
                <p className="text-sm text-gray-300">{formatDate(invoice.due_date)}</p>
              ),
            },
            {
              key: 'total',
              header: 'Total',
              sortable: true,
              sortFn: (a, b) => a.total_amount - b.total_amount,
              render: (invoice: Invoice) => (
                <div>
                  <p className="font-semibold text-orange-400">
                    ${invoice.total_amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </p>
                  {invoice.balance_due > 0 && invoice.balance_due !== invoice.total_amount && (
                    <p className="text-sm text-yellow-400">
                      Due: ${invoice.balance_due.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </p>
                  )}
                </div>
              ),
              align: 'right',
            },
            {
              key: 'actions',
              header: 'Actions',
              render: (invoice: Invoice) => (
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => handleViewInvoice(invoice, e)}
                    className="p-2 hover:bg-orange-600/10 rounded-lg transition border border-transparent hover:border-orange-500/20"
                    title="View invoice"
                  >
                    <Eye className="w-4 h-4 text-orange-400" />
                  </button>
                  {isOwner ? <><button onClick={(e) => { e.stopPropagation(); setInvoiceToEdit(invoice); setShowCreateModal(true); }} className="p-2 hover:bg-blue-600/10 rounded-lg transition border border-transparent hover:border-blue-500/20" title="Edit invoice"><Edit2 className="w-4 h-4 text-blue-400" /></button><button onClick={(e) => { e.stopPropagation(); handleDeleteClick(invoice, e); }} className="p-2 hover:bg-red-600/10 rounded-lg transition border border-transparent hover:border-red-500/20" title="Delete invoice"><Trash2 className="w-4 h-4 text-red-400" /></button></> : hasOutstanding(invoice) ? <div className="flex gap-1"><button onClick={(e) => handlePayInvoice(invoice, e, 'card')} className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-500"><CreditCard className="w-4 h-4" /> Card</button><button onClick={(e) => handlePayInvoice(invoice, e, 'us_bank_account')} className="rounded-lg border border-emerald-500/40 px-2 py-2 text-xs font-bold text-emerald-300 hover:bg-emerald-500/10">ACH</button></div> : null}
                  {!isOwner && hasOutstanding(invoice) && <button onClick={(e) => openStellarInstructions(invoice, e)} className="rounded-lg border border-cyan-500/35 px-2 py-2 text-xs font-bold text-cyan-300 hover:bg-cyan-500/10" title="Pay with Stellar"><Wallet className="w-4 h-4" /></button>}
                </div>
              ),
              align: 'right',
            },
          ] as DataTableColumn<Invoice>[]}
          data={filteredInvoices}
          emptyMessage="No invoices found"
          // DataTable has supported this all along and it was never passed, so
          // the list view had the same dead click as the cards.
          onRowClick={(invoice) => openInvoice(invoice)}
          rowHoverEffect={true}
          defaultSort={{ key: 'issue_date', direction: 'desc' }}
          pagination={true}
          pageSize={15}
          pageSizeOptions={[10, 15, 25, 50]}
        />
      )}

      {payingInvoice && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-emerald-500/25 bg-[#121212] p-6 text-white shadow-2xl">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-300">Record a payment</p>
                <h2 className="mt-1 text-xl font-bold">Invoice {payingInvoice.invoice_number}</h2>
                <p className="mt-1 text-sm text-gray-400">
                  ${outstandingOn(payingInvoice).toFixed(2)} outstanding
                </p>
              </div>
              <button onClick={() => setPayingInvoice(null)} className="text-gray-400 hover:text-white">
                <XCircle className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-4 gap-2">
                {([['check', 'Check'], ['cash', 'Cash'], ['bank_transfer', 'Transfer'], ['other', 'Other']] as const).map(([id, label]) => (
                  <button key={id} onClick={() => setPayMethod(id)}
                    className={`rounded-lg px-2 py-2 text-xs font-bold transition ${
                      payMethod === id
                        ? 'bg-emerald-600 text-white'
                        : 'border border-white/10 text-gray-300 hover:bg-white/5'
                    }`}>
                    {label}
                  </button>
                ))}
              </div>

              <label className="block">
                <span className="text-[11px] font-semibold text-gray-400">Amount received</span>
                <input value={payAmount} onChange={(e) => setPayAmount(e.target.value)}
                  inputMode="decimal" placeholder="0.00"
                  className="mt-1 w-full rounded-lg border border-[#2a2a2a] bg-[#0a0a0a] px-3 py-2.5 text-white placeholder-gray-600" />
              </label>

              <label className="block">
                <span className="text-[11px] font-semibold text-gray-400">
                  {payMethod === 'check' ? 'Check number' : 'Reference'}
                  {payMethod === 'check' && <span className="text-emerald-400"> — required</span>}
                </span>
                <input value={payReference} onChange={(e) => setPayReference(e.target.value)}
                  placeholder={payMethod === 'check' ? 'e.g. 1042' : 'optional'}
                  className="mt-1 w-full rounded-lg border border-[#2a2a2a] bg-[#0a0a0a] px-3 py-2.5 text-white placeholder-gray-600" />
              </label>

              <label className="block">
                <span className="text-[11px] font-semibold text-gray-400">Date received</span>
                <input type="date" value={payReceivedAt} onChange={(e) => setPayReceivedAt(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-[#2a2a2a] bg-[#0a0a0a] px-3 py-2.5 text-white" />
              </label>

              <label className="block">
                <span className="text-[11px] font-semibold text-gray-400">Note</span>
                <input value={payNote} onChange={(e) => setPayNote(e.target.value)}
                  placeholder="optional"
                  className="mt-1 w-full rounded-lg border border-[#2a2a2a] bg-[#0a0a0a] px-3 py-2.5 text-white placeholder-gray-600" />
              </label>

              {/*
                Said out loud because this is the one payment path with no
                processor behind it. Whoever presses this is the record.
              */}
              <p className="text-[11px] text-gray-500">
                Recorded against your name and today's date. A part payment leaves the invoice open for the rest.
              </p>

              <button onClick={submitRecordPayment}
                disabled={paySaving || !(Number(payAmount) > 0) || (payMethod === 'check' && !payReference.trim())}
                className="w-full rounded-lg bg-emerald-600 px-4 py-3 font-bold text-white hover:bg-emerald-500 disabled:opacity-50">
                {paySaving ? 'Recording…' : 'Record payment'}
              </button>
            </div>
          </div>
        </div>
      )}

      {stellarInvoice && <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"><div className="w-full max-w-lg rounded-2xl border border-cyan-500/25 bg-[#121212] p-6 text-white shadow-2xl"><div className="mb-5 flex items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-300">Stellar payment instructions</p><h2 className="mt-1 text-xl font-bold">Invoice {stellarInvoice.invoice_number}</h2><p className="mt-1 text-sm text-gray-400">Crypto transfers are reconciled before this USD invoice is marked paid.</p></div><button onClick={() => setStellarInvoice(null)} className="text-gray-400 hover:text-white"><XCircle className="h-5 w-5" /></button></div>{stellarLoading ? <p className="py-8 text-center text-gray-400">Loading secure payment instructions…</p> : stellarInstructions ? <div className="space-y-4"><div className="rounded-xl border border-white/10 bg-black/25 p-4"><div className="mb-2 flex justify-between text-sm"><span className="text-gray-400">Network</span><strong>{stellarInstructions.wallet.network === 'testnet' ? 'Testnet' : 'Public Network'}</strong></div><div className="mb-2 flex justify-between text-sm"><span className="text-gray-400">Asset</span><strong>{stellarInstructions.wallet.assetCode}</strong></div><p className="mb-1 text-xs text-gray-400">Receiving address</p><div className="flex gap-2"><code className="min-w-0 flex-1 break-all rounded-lg bg-black/50 p-2 text-xs text-cyan-200">{stellarInstructions.wallet.publicKey}</code><button onClick={() => navigator.clipboard?.writeText(stellarInstructions.wallet.publicKey)} className="rounded-lg border border-white/10 px-3 text-cyan-300 hover:bg-white/5"><Copy className="h-4 w-4" /></button></div>{stellarInstructions.wallet.assetIssuer && <p className="mt-3 break-all text-xs text-gray-400">Issuer: {stellarInstructions.wallet.assetIssuer}</p>}{stellarInstructions.wallet.memoInstructions && <p className="mt-3 text-sm text-amber-200">Memo: {stellarInstructions.wallet.memoInstructions}</p>}</div><div className="grid gap-3"><input value={stellarAmount} onChange={(e) => setStellarAmount(e.target.value)} placeholder={`Amount sent in ${stellarInstructions.wallet.assetCode}`} className="rounded-lg border border-[#2a2a2a] bg-[#0a0a0a] px-3 py-2.5 text-white placeholder-gray-600" /><input value={stellarTransactionHash} onChange={(e) => setStellarTransactionHash(e.target.value.trim())} placeholder="64-character Stellar transaction hash" className="rounded-lg border border-[#2a2a2a] bg-[#0a0a0a] px-3 py-2.5 text-white placeholder-gray-600" /><button onClick={submitStellarPayment} disabled={stellarLoading || stellarTransactionHash.length !== 64} className="rounded-lg bg-cyan-600 px-4 py-3 font-bold text-white hover:bg-cyan-500 disabled:opacity-50">Submit transaction for reconciliation</button></div></div> : null}</div></div>}

      {/* Delete Confirmation Modal */}
      {invoiceToDelete && (
        <DeleteConfirmationModal
          isOpen={showDeleteModal}
          onClose={() => {
            setShowDeleteModal(false);
            setInvoiceToDelete(null);
          }}
          onConfirm={handleDeleteConfirm}
          title="Delete Invoice"
          message="Are you sure you want to delete this invoice? This action cannot be undone."
          itemName={`${invoiceToDelete.invoice_number} - ${invoiceToDelete.customer_name || 'Draft'}`}
          loading={deleteLoading}
        />
      )}

      {/* Create Invoice Modal */}
      <CreateInvoiceModal
        isOpen={showCreateModal}
        onClose={() => { setShowCreateModal(false); setInvoiceToEdit(null); }}
        onSuccess={handleCreateSuccess}
        projectData={pendingProjectData}
        invoice={invoiceToEdit}
      />

      {/* Invoice Preview Modal */}
      {invoiceToPreview && (
        <InvoicePreviewModal
          isOpen={showPreviewModal}
          onClose={() => {
            setShowPreviewModal(false);
            setInvoiceToPreview(null);
          }}
          invoice={invoiceToPreview}
          onEdit={() => {
            // Close the preview and open the full editor pre-loaded with this invoice.
            setInvoiceToEdit(invoiceToPreview);
            setShowPreviewModal(false);
            setInvoiceToPreview(null);
            setShowCreateModal(true);
          }}
        />
      )}
    </div>
  );
}