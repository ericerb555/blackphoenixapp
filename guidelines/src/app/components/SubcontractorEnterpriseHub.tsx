/**
 * Subcontractor Enterprise Hub
 * 
 * Enterprise-level subcontractor management system:
 * - Add/manage subcontractor companies
 * - One-click full portal creation
 * - Mobile portal auto-generation
 * - Time tracking integration
 * - Master scheduling integration
 * - Coding & tracking system per subcontractor
 * - Complete feature access (invoicing, payments, projects, etc.)
 * - Company profile management
 */

import { useState } from 'react';
import {
  Building2, Plus, Users, Settings, Activity, Calendar, Code,
  FolderOpen, Smartphone, Clock, DollarSign, FileText, BarChart3,
  CheckCircle, AlertCircle, Zap, ChevronRight, Shield, ExternalLink,
  Search, Filter, Download, RefreshCw, Eye, Edit3, Trash2, Copy,
  Wallet, Package, MessageSquare, Star, TrendingUp, Award, Target,
  Link2, Globe, Database, Layers, Workflow, PlayCircle, Sparkles,
  ArrowLeft
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import SubcontractorSetupWizard from './SubcontractorSetupWizard';
import { TextArea } from './ui/input/TextArea';
import AdPerformanceDashboard from './vendor/AdPerformanceDashboard';

interface SubcontractorCompany {
  id: string;
  name: string;
  businessName: string;
  contactName: string;
  email: string;
  phone: string;
  address: string;
  city?: string;
  state?: string;
  zip?: string;
  
  status: 'active' | 'inactive' | 'pending' | 'suspended';
  
  // License & Insurance
  licenseNumber?: string;
  licenseState?: string;
  licenseExpiration?: string;
  insuranceProvider?: string;
  insurancePolicyNumber?: string;
  insuranceExpiration?: string;
  liabilityCoverage?: string;
  workersCompCoverage?: string;
  bondNumber?: string;
  
  // Skills & Certifications
  primaryTrade?: string;
  secondaryTrades?: string[];
  certifications?: string[];
  yearsExperience?: string;
  serviceArea?: string[];
  specialties?: string[];
  
  // Rate Cards
  hourlyRate?: string;
  overtimeRate?: string;
  emergencyRate?: string;
  minimumCharge?: string;
  travelFee?: string;
  paymentTerms?: string;
  preferredPaymentMethod?: string;
  
  portalSetup: {
    mobilePortalCreated: boolean;
    timeTrackingEnabled: boolean;
    schedulingEnabled: boolean;
    codingSystemEnabled: boolean;
    invoicingEnabled: boolean;
    paymentsEnabled: boolean;
    projectsEnabled: boolean;
    messagingEnabled: boolean;
    fullSetupComplete: boolean;
    qrCodeGenerated?: boolean;
    qrCodeUrl?: string;
  };
  
  access: {
    mobilePortalUrl?: string;
    portalId?: string;
    codingPrefix: string;
    folderPath: string;
  };
  
  stats: {
    activeProjects: number;
    totalRevenue: number;
    hoursTracked: number;
    invoicesSent: number;
    completionRate: number;
    rating: number;
  };
  
  metadata: {
    createdAt: Date;
    lastActive?: Date;
    setupCompletedAt?: Date;
    setupCompletedBy?: string;
    documentsUploaded?: boolean;
  };
}

export default function SubcontractorEnterpriseHub() {
  const [subcontractors, setSubcontractors] = useState<SubcontractorCompany[]>(mockSubcontractors);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showSetupWizard, setShowSetupWizard] = useState(false);
  const [selectedSubcontractor, setSelectedSubcontractor] = useState<SubcontractorCompany | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive' | 'pending'>('all');
  const [creatingPortal, setCreatingPortal] = useState<string | null>(null);
  const [showPerformanceDashboard, setShowPerformanceDashboard] = useState(false);

  // New subcontractor form state
  const [newSubcontractor, setNewSubcontractor] = useState({
    name: '',
    businessName: '',
    contactName: '',
    email: '',
    phone: '',
    address: '',
    codingPrefix: '',
    autoCreatePortal: true
  });

  const handleCreateFullPortal = async (subcontractorId: string) => {
    setCreatingPortal(subcontractorId);
    
    // Simulate portal creation process
    const steps = [
      'Creating mobile portal...',
      'Setting up time tracking...',
      'Configuring master scheduling...',
      'Initializing coding & tracking system...',
      'Creating folder structure...',
      'Enabling invoicing module...',
      'Configuring payment system...',
      'Setting up project management...',
      'Activating messaging...',
      'Finalizing setup...'
    ];

    for (const step of steps) {
      toast.info(step);
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Update subcontractor with full setup
    setSubcontractors(subcontractors.map(sub => 
      sub.id === subcontractorId 
        ? {
            ...sub,
            portalSetup: {
              mobilePortalCreated: true,
              timeTrackingEnabled: true,
              schedulingEnabled: true,
              codingSystemEnabled: true,
              invoicingEnabled: true,
              paymentsEnabled: true,
              projectsEnabled: true,
              messagingEnabled: true,
              fullSetupComplete: true
            },
            access: {
              ...sub.access,
              mobilePortalUrl: `/mobile-portal/${sub.id}`,
              portalId: `portal_${sub.id}`,
              codingPrefix: sub.access.codingPrefix || sub.name.substring(0, 3).toUpperCase(),
              folderPath: `/subcontractors/${sub.id}/files`
            },
            metadata: {
              ...sub.metadata,
              setupCompletedAt: new Date(),
              setupCompletedBy: 'Current Admin'
            }
          }
        : sub
    ));

    setCreatingPortal(null);
    toast.success(`✅ Full portal created for ${subcontractors.find(s => s.id === subcontractorId)?.name}!`);
  };

  const handleWizardComplete = async (wizardData: any) => {
    const newSub: SubcontractorCompany = {
      id: `sub_${Date.now()}`,
      name: wizardData.name,
      businessName: wizardData.businessName || wizardData.name,
      contactName: wizardData.contactName,
      email: wizardData.email,
      phone: wizardData.phone,
      address: wizardData.address,
      city: wizardData.city,
      state: wizardData.state,
      zip: wizardData.zip,
      status: 'active',
      
      // License & Insurance
      licenseNumber: wizardData.licenseNumber,
      licenseState: wizardData.licenseState,
      licenseExpiration: wizardData.licenseExpiration,
      insuranceProvider: wizardData.insuranceProvider,
      insurancePolicyNumber: wizardData.insurancePolicyNumber,
      insuranceExpiration: wizardData.insuranceExpiration,
      liabilityCoverage: wizardData.liabilityCoverage,
      workersCompCoverage: wizardData.workersCompCoverage,
      bondNumber: wizardData.bondNumber,
      
      // Skills
      primaryTrade: wizardData.primaryTrade,
      secondaryTrades: wizardData.secondaryTrades,
      certifications: wizardData.certifications,
      yearsExperience: wizardData.yearsExperience,
      serviceArea: wizardData.serviceArea,
      specialties: wizardData.specialties,
      
      // Rates
      hourlyRate: wizardData.hourlyRate,
      overtimeRate: wizardData.overtimeRate,
      emergencyRate: wizardData.emergencyRate,
      minimumCharge: wizardData.minimumCharge,
      travelFee: wizardData.travelFee,
      paymentTerms: wizardData.paymentTerms,
      preferredPaymentMethod: wizardData.preferredPaymentMethod,
      
      portalSetup: {
        mobilePortalCreated: wizardData.autoCreatePortal,
        timeTrackingEnabled: wizardData.autoCreatePortal,
        schedulingEnabled: wizardData.autoCreatePortal,
        codingSystemEnabled: wizardData.autoCreatePortal,
        invoicingEnabled: wizardData.autoCreatePortal,
        paymentsEnabled: wizardData.autoCreatePortal,
        projectsEnabled: wizardData.autoCreatePortal,
        messagingEnabled: wizardData.autoCreatePortal,
        fullSetupComplete: wizardData.autoCreatePortal,
        qrCodeGenerated: wizardData.generateQRCode
      },
      access: {
        codingPrefix: wizardData.codingPrefix || wizardData.name.substring(0, 3).toUpperCase(),
        folderPath: `/subcontractors/${Date.now()}/files`,
        mobilePortalUrl: wizardData.autoCreatePortal ? `/mobile-portal/${Date.now()}` : undefined,
        portalId: wizardData.autoCreatePortal ? `portal_${Date.now()}` : undefined
      },
      stats: {
        activeProjects: 0,
        totalRevenue: 0,
        hoursTracked: 0,
        invoicesSent: 0,
        completionRate: 0,
        rating: 0
      },
      metadata: {
        createdAt: new Date(),
        setupCompletedAt: wizardData.autoCreatePortal ? new Date() : undefined,
        setupCompletedBy: wizardData.autoCreatePortal ? 'Setup Wizard' : undefined,
        documentsUploaded: Object.values(wizardData.documentChecklist).some(v => v)
      }
    };

    setSubcontractors([newSub, ...subcontractors]);
    
    if (wizardData.autoCreatePortal) {
      toast.success(`✅ ${newSub.name} added with full portal setup!`);
    } else {
      toast.success(`${newSub.name} added successfully!`);
    }
    
    if (wizardData.sendInvitation && wizardData.email) {
      setTimeout(() => {
        toast.info(`📧 Invitation email sent to ${wizardData.email}`);
      }, 1000);
    }
  };

  const handleAddSubcontractor = async () => {
    if (!newSubcontractor.name || !newSubcontractor.email) {
      toast.error('Please fill in required fields');
      return;
    }

    const newSub: SubcontractorCompany = {
      id: `sub_${Date.now()}`,
      name: newSubcontractor.name,
      businessName: newSubcontractor.businessName || newSubcontractor.name,
      contactName: newSubcontractor.contactName,
      email: newSubcontractor.email,
      phone: newSubcontractor.phone,
      address: newSubcontractor.address,
      status: 'pending',
      portalSetup: {
        mobilePortalCreated: false,
        timeTrackingEnabled: false,
        schedulingEnabled: false,
        codingSystemEnabled: false,
        invoicingEnabled: false,
        paymentsEnabled: false,
        projectsEnabled: false,
        messagingEnabled: false,
        fullSetupComplete: false
      },
      access: {
        codingPrefix: newSubcontractor.codingPrefix || newSubcontractor.name.substring(0, 3).toUpperCase(),
        folderPath: `/subcontractors/${Date.now()}/files`
      },
      stats: {
        activeProjects: 0,
        totalRevenue: 0,
        hoursTracked: 0,
        invoicesSent: 0,
        completionRate: 0,
        rating: 0
      },
      metadata: {
        createdAt: new Date()
      }
    };

    setSubcontractors([...subcontractors, newSub]);
    setShowAddModal(false);
    
    // Reset form
    setNewSubcontractor({
      name: '',
      businessName: '',
      contactName: '',
      email: '',
      phone: '',
      address: '',
      codingPrefix: '',
      autoCreatePortal: true
    });

    toast.success(`Subcontractor ${newSub.name} added!`);

    // Auto-create portal if enabled
    if (newSubcontractor.autoCreatePortal) {
      setTimeout(() => {
        handleCreateFullPortal(newSub.id);
      }, 1000);
    }
  };

  const handleToggleModule = (subcontractorId: string, module: keyof SubcontractorCompany['portalSetup']) => {
    setSubcontractors(subcontractors.map(sub => 
      sub.id === subcontractorId 
        ? {
            ...sub,
            portalSetup: {
              ...sub.portalSetup,
              [module]: !sub.portalSetup[module]
            }
          }
        : sub
    ));
    toast.success('Module updated');
  };

  const filteredSubcontractors = subcontractors
    .filter(sub => filterStatus === 'all' || sub.status === filterStatus)
    .filter(sub => 
      searchQuery === '' ||
      sub.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sub.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (sub.contactName && sub.contactName.toLowerCase().includes(searchQuery.toLowerCase()))
    );

  const stats = {
    total: subcontractors.length,
    active: subcontractors.filter(s => s.status === 'active').length,
    withPortals: subcontractors.filter(s => s.portalSetup.fullSetupComplete).length,
    pending: subcontractors.filter(s => s.status === 'pending').length,
    totalRevenue: subcontractors.reduce((sum, s) => sum + s.stats.totalRevenue, 0),
    totalProjects: subcontractors.reduce((sum, s) => sum + s.stats.activeProjects, 0)
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-600/20 text-green-400 border-green-500/30';
      case 'inactive': return 'bg-gray-600/20 text-gray-400 border-gray-500/30';
      case 'pending': return 'bg-yellow-600/20 text-yellow-400 border-yellow-500/30';
      case 'suspended': return 'bg-red-600/20 text-red-400 border-red-500/30';
      default: return 'bg-gray-600/20 text-gray-400 border-gray-500/30';
    }
  };

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <button
        onClick={() => window.history.back()}
        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white transition-all group"
      >
        <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
        <span className="font-medium">Back</span>
      </button>

      {/* Header */}
      <div className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3 mb-2">
              <Building2 className="w-8 h-8 text-orange-400" />
              Subcontractor Enterprise Hub
            </h1>
            <p className="text-gray-400">Manage subcontractor companies with full portal automation</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowSetupWizard(true)}
              className="px-6 py-3 bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 text-white font-bold rounded-xl transition flex items-center gap-2 shadow-lg shadow-orange-500/20"
            >
              <Plus className="w-5 h-5" />
              Add Subcontractor
            </button>
            <button 
              onClick={() => setShowAddModal(true)}
              className="px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] text-white rounded-xl hover:bg-[#2A2A2A] transition"
              title="Quick Add (Legacy)"
            >
              <Zap className="w-5 h-5" />
            </button>
            <button className="px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] text-white rounded-xl hover:bg-[#2A2A2A] transition">
              <Download className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          <div className="bg-[#0A0A0A] rounded-xl border border-[#2A2A2A] p-4">
            <div className="flex items-center gap-2 mb-1">
              <Building2 className="w-4 h-4 text-blue-400" />
              <span className="text-xs text-gray-400">Total</span>
            </div>
            <p className="text-2xl font-bold text-blue-400">{stats.total}</p>
          </div>

          <div className="bg-[#0A0A0A] rounded-xl border border-[#2A2A2A] p-4">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle className="w-4 h-4 text-green-400" />
              <span className="text-xs text-gray-400">Active</span>
            </div>
            <p className="text-2xl font-bold text-green-400">{stats.active}</p>
          </div>

          <div className="bg-[#0A0A0A] rounded-xl border border-[#2A2A2A] p-4">
            <div className="flex items-center gap-2 mb-1">
              <Smartphone className="w-4 h-4 text-purple-400" />
              <span className="text-xs text-gray-400">Portals</span>
            </div>
            <p className="text-2xl font-bold text-purple-400">{stats.withPortals}</p>
          </div>

          <div className="bg-[#0A0A0A] rounded-xl border border-[#2A2A2A] p-4">
            <div className="flex items-center gap-2 mb-1">
              <AlertCircle className="w-4 h-4 text-yellow-400" />
              <span className="text-xs text-gray-400">Pending</span>
            </div>
            <p className="text-2xl font-bold text-yellow-400">{stats.pending}</p>
          </div>

          <div className="bg-[#0A0A0A] rounded-xl border border-[#2A2A2A] p-4">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="w-4 h-4 text-green-400" />
              <span className="text-xs text-gray-400">Revenue</span>
            </div>
            <p className="text-2xl font-bold text-green-400">${(stats.totalRevenue / 1000).toFixed(0)}k</p>
          </div>

          <div className="bg-[#0A0A0A] rounded-xl border border-[#2A2A2A] p-4">
            <div className="flex items-center gap-2 mb-1">
              <Package className="w-4 h-4 text-orange-400" />
              <span className="text-xs text-gray-400">Projects</span>
            </div>
            <p className="text-2xl font-bold text-orange-400">{stats.totalProjects}</p>
          </div>
        </div>
      </div>

      {/* Performance Dashboard Toggle & View */}
      <div className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] p-4">
        <button
          onClick={() => setShowPerformanceDashboard(!showPerformanceDashboard)}
          className={`w-full px-6 py-4 rounded-xl font-bold transition flex items-center justify-between ${
            showPerformanceDashboard
              ? 'bg-gradient-to-r from-orange-600 to-orange-700 text-white'
              : 'bg-[#0A0A0A] border border-[#2A2A2A] text-white hover:border-orange-500/50'
          }`}
        >
          <div className="flex items-center gap-3">
            <Activity className="w-6 h-6" />
            <div className="text-left">
              <p className="text-lg">Ad Performance Dashboard</p>
              <p className={`text-sm ${showPerformanceDashboard ? 'text-orange-200' : 'text-gray-400'}`}>
                Track advertising campaigns from impression to work order completion
              </p>
            </div>
          </div>
          <span className="px-3 py-1 bg-purple-600 text-white text-xs font-bold rounded-full">
            NEW
          </span>
        </button>
      </div>

      {showPerformanceDashboard && (
        <AdPerformanceDashboard />
      )}

      {/* Filters */}
      <div className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] p-4">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-orange-500"
                placeholder="Search subcontractors..."
              />
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setFilterStatus('all')}
              className={`px-4 py-2.5 rounded-xl text-sm font-medium transition ${
                filterStatus === 'all'
                  ? 'bg-orange-600 text-white'
                  : 'bg-[#0A0A0A] text-gray-400 border border-[#2A2A2A] hover:text-white'
              }`}
            >
              All ({stats.total})
            </button>
            <button
              onClick={() => setFilterStatus('active')}
              className={`px-4 py-2.5 rounded-xl text-sm font-medium transition ${
                filterStatus === 'active'
                  ? 'bg-green-600 text-white'
                  : 'bg-[#0A0A0A] text-gray-400 border border-[#2A2A2A] hover:text-white'
              }`}
            >
              Active ({stats.active})
            </button>
            <button
              onClick={() => setFilterStatus('pending')}
              className={`px-4 py-2.5 rounded-xl text-sm font-medium transition ${
                filterStatus === 'pending'
                  ? 'bg-yellow-600 text-white'
                  : 'bg-[#0A0A0A] text-gray-400 border border-[#2A2A2A] hover:text-white'
              }`}
            >
              Pending ({stats.pending})
            </button>
          </div>
        </div>
      </div>

      {/* Subcontractor Cards */}
      <div className="grid grid-cols-1 gap-6">
        {filteredSubcontractors.map(sub => (
          <div key={sub.id} className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] p-6">
            {/* Header */}
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-orange-600 to-orange-700 flex items-center justify-center flex-shrink-0">
                  <Building2 className="w-8 h-8 text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="text-xl font-bold text-white">{sub.name}</h3>
                    <div className={`px-3 py-1 rounded-lg border text-xs font-bold ${getStatusColor(sub.status)}`}>
                      {sub.status.toUpperCase()}
                    </div>
                    {sub.portalSetup.fullSetupComplete && (
                      <div className="px-3 py-1 bg-green-600/20 text-green-400 rounded-lg border border-green-500/30 text-xs font-bold flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" />
                        FULL SETUP
                      </div>
                    )}
                  </div>
                  <p className="text-sm text-gray-400 mb-1">{sub.businessName}</p>
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span>{sub.email}</span>
                    <span>{sub.phone}</span>
                    <span>Code: {sub.access.codingPrefix}</span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                {!sub.portalSetup.fullSetupComplete && (
                  <button
                    onClick={() => handleCreateFullPortal(sub.id)}
                    disabled={creatingPortal === sub.id}
                    className="px-6 py-2.5 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-bold rounded-xl transition flex items-center gap-2 disabled:opacity-50"
                  >
                    {creatingPortal === sub.id ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <Zap className="w-4 h-4" />
                        Create Full Portal
                      </>
                    )}
                  </button>
                )}
                {sub.portalSetup.mobilePortalCreated && (
                  <button
                    onClick={() => window.open(sub.access.mobilePortalUrl, '_blank')}
                    className="px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition flex items-center gap-2"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Open Portal
                  </button>
                )}
                <button
                  onClick={() => setSelectedSubcontractor(sub)}
                  className="px-4 py-2.5 bg-[#0A0A0A] border border-[#2A2A2A] text-white rounded-xl hover:bg-[#2A2A2A] transition"
                >
                  <Settings className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-6">
              <div className="bg-[#0A0A0A] rounded-lg border border-[#2A2A2A] p-3">
                <p className="text-xs text-gray-400 mb-1">Projects</p>
                <p className="text-lg font-bold text-white">{sub.stats.activeProjects}</p>
              </div>
              <div className="bg-[#0A0A0A] rounded-lg border border-[#2A2A2A] p-3">
                <p className="text-xs text-gray-400 mb-1">Revenue</p>
                <p className="text-lg font-bold text-green-400">${(sub.stats.totalRevenue / 1000).toFixed(0)}k</p>
              </div>
              <div className="bg-[#0A0A0A] rounded-lg border border-[#2A2A2A] p-3">
                <p className="text-xs text-gray-400 mb-1">Hours</p>
                <p className="text-lg font-bold text-blue-400">{sub.stats.hoursTracked}</p>
              </div>
              <div className="bg-[#0A0A0A] rounded-lg border border-[#2A2A2A] p-3">
                <p className="text-xs text-gray-400 mb-1">Invoices</p>
                <p className="text-lg font-bold text-purple-400">{sub.stats.invoicesSent}</p>
              </div>
              <div className="bg-[#0A0A0A] rounded-lg border border-[#2A2A2A] p-3">
                <p className="text-xs text-gray-400 mb-1">Completion</p>
                <p className="text-lg font-bold text-orange-400">{sub.stats.completionRate}%</p>
              </div>
              <div className="bg-[#0A0A0A] rounded-lg border border-[#2A2A2A] p-3">
                <p className="text-xs text-gray-400 mb-1">Rating</p>
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                  <p className="text-lg font-bold text-white">{sub.stats.rating.toFixed(1)}</p>
                </div>
              </div>
            </div>

            {/* Portal Setup Status */}
            <div className="bg-[#0A0A0A] rounded-xl border border-[#2A2A2A] p-4">
              <h4 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-orange-400" />
                Portal Features
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="flex items-center gap-2">
                  {sub.portalSetup.mobilePortalCreated ? (
                    <CheckCircle className="w-4 h-4 text-green-400" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-gray-600" />
                  )}
                  <span className="text-sm text-gray-400">Mobile Portal</span>
                </div>
                <div className="flex items-center gap-2">
                  {sub.portalSetup.timeTrackingEnabled ? (
                    <CheckCircle className="w-4 h-4 text-green-400" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-gray-600" />
                  )}
                  <span className="text-sm text-gray-400">Time Tracking</span>
                </div>
                <div className="flex items-center gap-2">
                  {sub.portalSetup.schedulingEnabled ? (
                    <CheckCircle className="w-4 h-4 text-green-400" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-gray-600" />
                  )}
                  <span className="text-sm text-gray-400">Scheduling</span>
                </div>
                <div className="flex items-center gap-2">
                  {sub.portalSetup.codingSystemEnabled ? (
                    <CheckCircle className="w-4 h-4 text-green-400" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-gray-600" />
                  )}
                  <span className="text-sm text-gray-400">Coding System</span>
                </div>
                <div className="flex items-center gap-2">
                  {sub.portalSetup.invoicingEnabled ? (
                    <CheckCircle className="w-4 h-4 text-green-400" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-gray-600" />
                  )}
                  <span className="text-sm text-gray-400">Invoicing</span>
                </div>
                <div className="flex items-center gap-2">
                  {sub.portalSetup.paymentsEnabled ? (
                    <CheckCircle className="w-4 h-4 text-green-400" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-gray-600" />
                  )}
                  <span className="text-sm text-gray-400">Payments</span>
                </div>
                <div className="flex items-center gap-2">
                  {sub.portalSetup.projectsEnabled ? (
                    <CheckCircle className="w-4 h-4 text-green-400" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-gray-600" />
                  )}
                  <span className="text-sm text-gray-400">Projects</span>
                </div>
                <div className="flex items-center gap-2">
                  {sub.portalSetup.messagingEnabled ? (
                    <CheckCircle className="w-4 h-4 text-green-400" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-gray-600" />
                  )}
                  <span className="text-sm text-gray-400">Messaging</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Setup Wizard */}
      <SubcontractorSetupWizard
        isOpen={showSetupWizard}
        onClose={() => setShowSetupWizard(false)}
        onComplete={handleWizardComplete}
      />

      {/* Quick Add Modal (Legacy) */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-2xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
              <Plus className="w-6 h-6 text-orange-400" />
              Add New Subcontractor
            </h3>

            <div className="space-y-4 mb-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-400 mb-2 block">Company Name *</label>
                  <input
                    type="text"
                    value={newSubcontractor.name}
                    onChange={(e) => setNewSubcontractor({ ...newSubcontractor, name: e.target.value })}
                    className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-orange-500"
                    placeholder="ABC Construction"
                  />
                </div>

                <div>
                  <label className="text-sm text-gray-400 mb-2 block">Business Name</label>
                  <input
                    type="text"
                    value={newSubcontractor.businessName}
                    onChange={(e) => setNewSubcontractor({ ...newSubcontractor, businessName: e.target.value })}
                    className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-orange-500"
                    placeholder="ABC Construction LLC"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-400 mb-2 block">Contact Name</label>
                  <input
                    type="text"
                    value={newSubcontractor.contactName}
                    onChange={(e) => setNewSubcontractor({ ...newSubcontractor, contactName: e.target.value })}
                    className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-orange-500"
                    placeholder="John Smith"
                  />
                </div>

                <div>
                  <label className="text-sm text-gray-400 mb-2 block">Email *</label>
                  <input
                    type="email"
                    value={newSubcontractor.email}
                    onChange={(e) => setNewSubcontractor({ ...newSubcontractor, email: e.target.value })}
                    className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-orange-500"
                    placeholder="john@abc-construction.com"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-400 mb-2 block">Phone</label>
                  <input
                    type="tel"
                    value={newSubcontractor.phone}
                    onChange={(e) => setNewSubcontractor({ ...newSubcontractor, phone: e.target.value })}
                    className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-orange-500"
                    placeholder="(555) 123-4567"
                  />
                </div>

                <div>
                  <label className="text-sm text-gray-400 mb-2 block">Coding Prefix</label>
                  <input
                    type="text"
                    value={newSubcontractor.codingPrefix}
                    onChange={(e) => setNewSubcontractor({ ...newSubcontractor, codingPrefix: e.target.value.toUpperCase() })}
                    className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-orange-500"
                    placeholder="ABC"
                    maxLength={5}
                  />
                </div>
              </div>

              <div>
                <label className="text-sm text-gray-400 mb-2 block">Address</label>
                <TextArea
                  value={newSubcontractor.address}
                  onChange={(value) => setNewSubcontractor({ ...newSubcontractor, address: value })}
                  rows={2}
                  placeholder="123 Main St, City, State 12345"
                />
              </div>

              <div className="bg-blue-600/10 border border-blue-500/30 rounded-xl p-4">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newSubcontractor.autoCreatePortal}
                    onChange={(e) => setNewSubcontractor({ ...newSubcontractor, autoCreatePortal: e.target.checked })}
                    className="w-5 h-5 rounded border-2 border-blue-500 bg-[#0A0A0A] checked:bg-blue-600"
                  />
                  <div>
                    <p className="text-blue-400 font-semibold flex items-center gap-2">
                      <Zap className="w-4 h-4" />
                      Auto-Create Full Portal
                    </p>
                    <p className="text-xs text-gray-400">
                      Automatically create mobile portal, enable time tracking, scheduling, coding system, and all features
                    </p>
                  </div>
                </label>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleAddSubcontractor}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 text-white font-bold rounded-xl transition flex items-center justify-center gap-2"
              >
                <Plus className="w-5 h-5" />
                Add Subcontractor
              </button>
              <button
                onClick={() => setShowAddModal(false)}
                className="px-6 py-3 bg-[#1A1A1A] border border-[#2A2A2A] text-white rounded-xl hover:bg-[#2A2A2A] transition font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Mock data
const mockSubcontractors: SubcontractorCompany[] = [
  {
    id: 'sub_001',
    name: 'Elite HVAC Services',
    businessName: 'Elite HVAC Services LLC',
    contactName: 'Mike Johnson',
    email: 'mike@elitehvac.com',
    phone: '(555) 123-4567',
    address: '123 Industrial Blvd, Los Angeles, CA 90001',
    status: 'active',
    portalSetup: {
      mobilePortalCreated: true,
      timeTrackingEnabled: true,
      schedulingEnabled: true,
      codingSystemEnabled: true,
      invoicingEnabled: true,
      paymentsEnabled: true,
      projectsEnabled: true,
      messagingEnabled: true,
      fullSetupComplete: true
    },
    access: {
      mobilePortalUrl: '/mobile-portal/sub_001',
      portalId: 'portal_sub_001',
      codingPrefix: 'EHS',
      folderPath: '/subcontractors/sub_001/files'
    },
    stats: {
      activeProjects: 12,
      totalRevenue: 284500,
      hoursTracked: 1240,
      invoicesSent: 47,
      completionRate: 94,
      rating: 4.8
    },
    metadata: {
      createdAt: new Date('2024-01-15'),
      lastActive: new Date(),
      setupCompletedAt: new Date('2024-01-15'),
      setupCompletedBy: 'Admin User'
    }
  },
  {
    id: 'sub_002',
    name: 'ProPlumb Solutions',
    businessName: 'ProPlumb Solutions Inc',
    contactName: 'Sarah Martinez',
    email: 'sarah@proplumb.com',
    phone: '(555) 234-5678',
    address: '456 Commerce Ave, San Diego, CA 92101',
    status: 'pending',
    portalSetup: {
      mobilePortalCreated: false,
      timeTrackingEnabled: false,
      schedulingEnabled: false,
      codingSystemEnabled: false,
      invoicingEnabled: false,
      paymentsEnabled: false,
      projectsEnabled: false,
      messagingEnabled: false,
      fullSetupComplete: false
    },
    access: {
      codingPrefix: 'PPS',
      folderPath: '/subcontractors/sub_002/files'
    },
    stats: {
      activeProjects: 0,
      totalRevenue: 0,
      hoursTracked: 0,
      invoicesSent: 0,
      completionRate: 0,
      rating: 0
    },
    metadata: {
      createdAt: new Date('2026-01-25')
    }
  }
];