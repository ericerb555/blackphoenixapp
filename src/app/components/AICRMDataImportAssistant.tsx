/**
 * AI CRM Data Import Assistant
 * State-of-the-art AI assistant for automated CRM data import
 * Supports: Contacts, Companies, Deals, Properties, Associations
 */

import { useState } from 'react';
import {
  Upload, FileText, Sparkles, CheckCircle, AlertCircle, Edit2,
  Trash2, Save, X, Download, FileSpreadsheet, File, Image,
  Loader2, Brain, Zap, Eye, Plus, Check, RefreshCw, Users,
  Building2, Briefcase, Home, Package, DollarSign, Tag, Box,
  BarChart3, TrendingUp, Phone, Mail, MapPin, Calendar, ExternalLink
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { DataTable } from './ui/table/DataTable';
import type { DataTableColumn } from './ui/table/DataTable';

type ImportType = 'contacts' | 'companies' | 'deals' | 'properties' | 'associations';

interface CRMData {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  title?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  value?: number;
  stage?: string;
  type?: string;
  category?: string;
  notes?: string;
  customFields?: Record<string, any>;
  aiConfidence: number;
  needsReview: boolean;
  status: 'pending' | 'verified' | 'edited';
}

interface ImportSession {
  id: string;
  fileName: string;
  fileSize: string;
  uploadDate: string;
  importType: ImportType;
  status: 'uploading' | 'processing' | 'review' | 'completed' | 'failed';
  totalRecords: number;
  processedRecords: number;
  verifiedRecords: number;
  aiAccuracy: number;
}

interface AICRMDataImportAssistantProps {
  importType: ImportType;
  onImportComplete?: (data: CRMData[]) => void;
}

export default function AICRMDataImportAssistant({ 
  importType = 'contacts',
  onImportComplete 
}: AICRMDataImportAssistantProps) {
  const [importSession, setImportSession] = useState<ImportSession | null>(null);
  const [records, setRecords] = useState<CRMData[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<CRMData | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editedRecord, setEditedRecord] = useState<CRMData | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [processingStage, setProcessingStage] = useState<'upload' | 'extract' | 'analyze' | 'structure' | 'validate' | 'complete'>('upload');

  const getImportTypeConfig = () => {
    switch (importType) {
      case 'contacts':
        return {
          icon: Users,
          title: 'Contact',
          pluralTitle: 'Contacts',
          color: 'blue',
          description: 'Import contacts with names, emails, phones, and company info'
        };
      case 'companies':
        return {
          icon: Building2,
          title: 'Company',
          pluralTitle: 'Companies',
          color: 'purple',
          description: 'Import companies with details, addresses, and contacts'
        };
      case 'deals':
        return {
          icon: Briefcase,
          title: 'Deal',
          pluralTitle: 'Deals',
          color: 'green',
          description: 'Import deals with values, stages, and associations'
        };
      case 'properties':
        return {
          icon: Home,
          title: 'Property',
          pluralTitle: 'Properties',
          color: 'orange',
          description: 'Import properties with addresses, values, and details'
        };
      case 'associations':
        return {
          icon: Package,
          title: 'Association',
          pluralTitle: 'Associations',
          color: 'cyan',
          description: 'Import associations with member and property details'
        };
    }
  };

  const config = getImportTypeConfig();
  const TypeIcon = config.icon;

  // Generate mock data based on import type
  const generateMockData = (): CRMData[] => {
    if (importType === 'contacts') {
      return [
        {
          id: 'c1',
          name: 'John Anderson',
          email: 'john.anderson@techcorp.com',
          phone: '(555) 123-4567',
          company: 'Tech Corp Solutions',
          title: 'Chief Technology Officer',
          address: '123 Innovation Drive',
          city: 'San Francisco',
          state: 'CA',
          zipCode: '94105',
          aiConfidence: 0.98,
          needsReview: false,
          status: 'verified'
        },
        {
          id: 'c2',
          name: 'Sarah Mitchell',
          email: 'sarah.mitchell@buildco.com',
          phone: '(555) 234-5678',
          company: 'BuildCo Properties',
          title: 'Property Manager',
          address: '456 Commerce Street',
          city: 'Austin',
          state: 'TX',
          zipCode: '78701',
          aiConfidence: 0.95,
          needsReview: false,
          status: 'verified'
        },
        {
          id: 'c3',
          name: 'Michael Chen',
          email: 'mchen@innovate.io',
          phone: '(555) 345-6789',
          company: 'Innovate Solutions',
          title: 'VP Operations',
          address: '789 Tech Plaza',
          city: 'Seattle',
          state: 'WA',
          zipCode: '98101',
          aiConfidence: 0.91,
          needsReview: true,
          status: 'pending'
        },
        {
          id: 'c4',
          name: 'Emily Rodriguez',
          email: 'emily.r@globalventures.com',
          phone: '(555) 456-7890',
          company: 'Global Ventures LLC',
          title: 'Senior Account Executive',
          address: '321 Business Park Way',
          city: 'Denver',
          state: 'CO',
          zipCode: '80202',
          aiConfidence: 0.97,
          needsReview: false,
          status: 'verified'
        },
        {
          id: 'c5',
          name: 'David Kim',
          email: 'dkim@realestate.pro',
          phone: '(555) 567-8901',
          company: 'Real Estate Professionals',
          title: 'Broker Associate',
          address: '654 Market Avenue',
          city: 'Miami',
          state: 'FL',
          zipCode: '33131',
          aiConfidence: 0.89,
          needsReview: true,
          status: 'pending'
        }
      ];
    } else if (importType === 'companies') {
      return [
        {
          id: 'co1',
          name: 'Tech Corp Solutions',
          type: 'Technology',
          email: 'info@techcorp.com',
          phone: '(555) 100-2000',
          address: '123 Innovation Drive',
          city: 'San Francisco',
          state: 'CA',
          zipCode: '94105',
          value: 250000,
          notes: 'Leading enterprise software provider',
          aiConfidence: 0.96,
          needsReview: false,
          status: 'verified'
        },
        {
          id: 'co2',
          name: 'BuildCo Properties',
          type: 'Real Estate',
          email: 'contact@buildco.com',
          phone: '(555) 200-3000',
          address: '456 Commerce Street',
          city: 'Austin',
          state: 'TX',
          zipCode: '78701',
          value: 180000,
          notes: 'Commercial property management',
          aiConfidence: 0.94,
          needsReview: false,
          status: 'verified'
        },
        {
          id: 'co3',
          name: 'Innovate Solutions',
          type: 'Consulting',
          email: 'hello@innovate.io',
          phone: '(555) 300-4000',
          address: '789 Tech Plaza',
          city: 'Seattle',
          state: 'WA',
          zipCode: '98101',
          value: 125000,
          notes: 'Business transformation consulting',
          aiConfidence: 0.88,
          needsReview: true,
          status: 'pending'
        }
      ];
    } else if (importType === 'deals') {
      return [
        {
          id: 'd1',
          name: 'Office Renovation Project',
          company: 'Tech Corp Solutions',
          value: 145000,
          stage: 'Proposal Sent',
          category: 'Commercial',
          notes: 'Complete office renovation including HVAC and electrical',
          aiConfidence: 0.97,
          needsReview: false,
          status: 'verified'
        },
        {
          id: 'd2',
          name: 'Multi-Unit Plumbing Upgrade',
          company: 'BuildCo Properties',
          value: 87500,
          stage: 'Negotiation',
          category: 'Residential',
          notes: '15-unit apartment complex plumbing modernization',
          aiConfidence: 0.93,
          needsReview: false,
          status: 'verified'
        },
        {
          id: 'd3',
          name: 'Emergency HVAC Replacement',
          company: 'Innovate Solutions',
          value: 52000,
          stage: 'Qualified',
          category: 'Commercial',
          notes: 'Urgent replacement of failed HVAC system',
          aiConfidence: 0.90,
          needsReview: true,
          status: 'pending'
        }
      ];
    } else if (importType === 'properties') {
      return [
        {
          id: 'p1',
          name: 'Sunset View Apartments',
          type: 'Multi-Family',
          address: '100 Sunset Boulevard',
          city: 'Los Angeles',
          state: 'CA',
          zipCode: '90001',
          value: 2500000,
          notes: '50-unit apartment complex',
          aiConfidence: 0.96,
          needsReview: false,
          status: 'verified'
        },
        {
          id: 'p2',
          name: 'Downtown Office Tower',
          type: 'Commercial',
          address: '200 Business Plaza',
          city: 'Chicago',
          state: 'IL',
          zipCode: '60601',
          value: 5000000,
          notes: '12-story office building',
          aiConfidence: 0.94,
          needsReview: false,
          status: 'verified'
        }
      ];
    } else {
      return [
        {
          id: 'a1',
          name: 'Riverside Condo Association',
          type: 'Condominium',
          address: '500 River Road',
          city: 'Portland',
          state: 'OR',
          zipCode: '97201',
          notes: '125 units, established 2015',
          aiConfidence: 0.95,
          needsReview: false,
          status: 'verified'
        }
      ];
    }
  };

  // Simulate AI processing stages
  const simulateAIProcessing = (file: File) => {
    const session: ImportSession = {
      id: 'session-' + Date.now(),
      fileName: file.name,
      fileSize: (file.size / 1024).toFixed(2) + ' KB',
      uploadDate: new Date().toLocaleDateString(),
      importType,
      status: 'uploading',
      totalRecords: 0,
      processedRecords: 0,
      verifiedRecords: 0,
      aiAccuracy: 0
    };
    
    setImportSession(session);
    setProcessingStage('upload');

    // Stage 1: Upload
    setTimeout(() => {
      setProcessingStage('extract');
      setImportSession({ ...session, status: 'processing' });
    }, 1000);

    // Stage 2: Extract
    setTimeout(() => {
      setProcessingStage('analyze');
    }, 2000);

    // Stage 3: Analyze
    setTimeout(() => {
      setProcessingStage('structure');
    }, 3500);

    // Stage 4: Structure
    setTimeout(() => {
      setProcessingStage('validate');
      
      // Generate mock records
      const mockRecords = generateMockData();
      setRecords(mockRecords);
    }, 5000);

    // Stage 5: Validate
    setTimeout(() => {
      setProcessingStage('complete');
      const mockRecords = generateMockData();
      const verifiedCount = mockRecords.filter(r => !r.needsReview).length;
      
      setImportSession({
        ...session,
        status: 'review',
        totalRecords: mockRecords.length,
        processedRecords: mockRecords.length,
        verifiedRecords: verifiedCount,
        aiAccuracy: 94
      });
      toast.success('AI processing complete! Review imported records.');
    }, 6500);
  };

  const handleFileUpload = (file: File) => {
    if (!file) return;
    
    const validTypes = [
      'application/pdf',
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/json'
    ];
    
    if (!validTypes.includes(file.type)) {
      toast.error('Please upload a PDF, CSV, Excel, or JSON file');
      return;
    }

    simulateAIProcessing(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileUpload(file);
  };

  const handleEditRecord = (record: CRMData) => {
    setSelectedRecord(record);
    setEditedRecord({ ...record });
    setShowEditModal(true);
  };

  const handleSaveRecord = () => {
    if (!editedRecord) return;
    
    setRecords(records.map(r => 
      r.id === editedRecord.id 
        ? { ...editedRecord, status: 'edited', needsReview: false }
        : r
    ));
    
    setShowEditModal(false);
    setEditedRecord(null);
    setSelectedRecord(null);
    toast.success('Record updated successfully');
  };

  const handleDeleteRecord = (recordId: string) => {
    setRecords(records.filter(r => r.id !== recordId));
    toast.success('Record removed');
  };

  const handleVerifyRecord = (recordId: string) => {
    setRecords(records.map(r => 
      r.id === recordId 
        ? { ...r, status: 'verified', needsReview: false }
        : r
    ));
    toast.success('Record verified');
  };

  const handleImportAll = () => {
    const unverified = records.filter(r => r.needsReview);
    if (unverified.length > 0) {
      toast.error(`Please review ${unverified.length} records marked for review`);
      return;
    }
    
    if (onImportComplete) {
      onImportComplete(records);
    }
    
    toast.success(`Successfully imported ${records.length} ${config.pluralTitle.toLowerCase()}!`);
    setImportSession(null);
    setRecords([]);
    setProcessingStage('upload');
  };

  const columns: DataTableColumn<CRMData>[] = [
    {
      header: config.title,
      accessorKey: 'name',
      cell: (row) => (
        <div className="max-w-md">
          <div className="flex items-center gap-2 mb-1">
            <p className="font-semibold text-white">{row.name}</p>
            {row.aiConfidence > 0.95 && (
              <Sparkles className="w-3 h-3 text-yellow-400" />
            )}
          </div>
          {row.email && <p className="text-xs text-gray-400 flex items-center gap-1"><Mail className="w-3 h-3" /> {row.email}</p>}
          {row.phone && <p className="text-xs text-gray-400 flex items-center gap-1"><Phone className="w-3 h-3" /> {row.phone}</p>}
          {row.company && <p className="text-xs text-gray-500 flex items-center gap-1"><Building2 className="w-3 h-3" /> {row.company}</p>}
        </div>
      ),
    },
    {
      header: 'Details',
      accessorKey: 'details',
      cell: (row) => (
        <div className="text-sm">
          {row.title && <p className="text-white">{row.title}</p>}
          {row.type && <p className="text-white">{row.type}</p>}
          {row.stage && <p className="text-purple-400">{row.stage}</p>}
          {row.category && <p className="text-blue-400">{row.category}</p>}
          {row.address && (
            <p className="text-xs text-gray-400 flex items-center gap-1 mt-1">
              <MapPin className="w-3 h-3" />
              {row.city}, {row.state}
            </p>
          )}
        </div>
      ),
    },
    {
      header: 'Value',
      accessorKey: 'value',
      cell: (row) => row.value ? (
        <p className="font-semibold text-green-400">${row.value.toLocaleString()}</p>
      ) : (
        <span className="text-gray-600">-</span>
      ),
      headerClassName: 'text-right',
    },
    {
      header: 'AI Confidence',
      accessorKey: 'aiConfidence',
      cell: (row) => (
        <div className="flex items-center gap-2">
          <div className="flex-1 max-w-[80px]">
            <div className="h-2 bg-[#0F0F0F] rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full ${
                  row.aiConfidence >= 0.95 ? 'bg-green-500' :
                  row.aiConfidence >= 0.90 ? 'bg-yellow-500' :
                  'bg-orange-500'
                }`}
                style={{ width: `${row.aiConfidence * 100}%` }}
              />
            </div>
          </div>
          <span className="text-xs font-semibold text-gray-300">
            {(row.aiConfidence * 100).toFixed(0)}%
          </span>
        </div>
      ),
      headerClassName: 'text-center',
    },
    {
      header: 'Status',
      accessorKey: 'status',
      cell: (row) => (
        <div className="flex items-center gap-2">
          {row.needsReview ? (
            <span className="px-2 py-1 rounded-full text-xs font-semibold bg-yellow-600 text-white flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              Review
            </span>
          ) : row.status === 'verified' ? (
            <span className="px-2 py-1 rounded-full text-xs font-semibold bg-green-600 text-white flex items-center gap-1">
              <CheckCircle className="w-3 h-3" />
              Verified
            </span>
          ) : (
            <span className="px-2 py-1 rounded-full text-xs font-semibold bg-blue-600 text-white flex items-center gap-1">
              <Edit2 className="w-3 h-3" />
              Edited
            </span>
          )}
        </div>
      ),
      headerClassName: 'text-center',
    },
    {
      header: 'Actions',
      accessorKey: 'id',
      cell: (row) => (
        <div className="flex items-center gap-1">
          <button
            onClick={() => handleEditRecord(row)}
            className="p-1.5 bg-blue-600/20 hover:bg-blue-600/30 rounded text-blue-400 transition"
            title="Edit"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          {row.needsReview && (
            <button
              onClick={() => handleVerifyRecord(row.id)}
              className="p-1.5 bg-green-600/20 hover:bg-green-600/30 rounded text-green-400 transition"
              title="Verify"
            >
              <Check className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={() => handleDeleteRecord(row.id)}
            className="p-1.5 bg-red-600/20 hover:bg-red-600/30 rounded text-red-400 transition"
            title="Remove"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
      headerClassName: 'text-right',
    },
  ];

  const processingStages = [
    { id: 'upload', label: 'Uploading File', icon: Upload, color: 'blue' },
    { id: 'extract', label: 'Extracting Data', icon: FileText, color: 'purple' },
    { id: 'analyze', label: 'AI Analysis', icon: Brain, color: 'pink' },
    { id: 'structure', label: 'Structuring Data', icon: Package, color: 'cyan' },
    { id: 'validate', label: 'Validating', icon: CheckCircle, color: 'green' },
    { id: 'complete', label: 'Complete', icon: Sparkles, color: 'yellow' }
  ];

  const currentStageIndex = processingStages.findIndex(s => s.id === processingStage);

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br from-${config.color}-600 to-${config.color}-700 flex items-center justify-center`}>
              <TypeIcon className="w-6 h-6 text-white" />
            </div>
            AI {config.title} Import
          </h1>
          <p className="text-gray-400">{config.description}</p>
        </div>
        <a 
          href="/ai-diagnostics"
          className="px-4 py-2 bg-[#0A0A0A] border border-[#ea580c]/30 hover:border-[#ea580c] text-[#ea580c] hover:bg-[#ea580c]/10 font-semibold rounded-lg transition-all flex items-center gap-2 group"
        >
          <Brain className="w-4 h-4" />
          AI Control Center
          <ExternalLink className="w-3 h-3 opacity-50 group-hover:opacity-100" />
        </a>
      </div>

      {/* Upload Area */}
      {!importSession && (
        <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-8">
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-xl p-12 transition-all ${
              isDragging
                ? 'border-purple-500 bg-purple-500/10'
                : 'border-[#2A2A2A] hover:border-purple-500/50'
            }`}
          >
            <div className="text-center space-y-6">
              <div className="flex justify-center">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center">
                  <Upload className="w-10 h-10 text-white" />
                </div>
              </div>

              <div>
                <h3 className="text-2xl font-bold text-white mb-2">
                  Upload {config.pluralTitle}
                </h3>
                <p className="text-gray-400 max-w-2xl mx-auto">
                  Our AI will automatically extract {config.pluralTitle.toLowerCase()} information, validate data, and structure it for import. 
                  Supports PDF, CSV, Excel, and JSON formats.
                </p>
              </div>

              <div className="flex items-center justify-center gap-4">
                <label className="px-6 py-3 bg-gradient-to-r from-purple-600/10 to-pink-600/10 text-gray-300 hover:from-purple-600/20 hover:to-pink-600/20 hover:text-white border-2 border-purple-500/30 hover:border-purple-400/50 hover:shadow-lg hover:shadow-purple-500/30 hover:scale-102 transition-all duration-300 rounded-xl font-bold cursor-pointer flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Choose File
                  <input
                    type="file"
                    className="hidden"
                    accept=".pdf,.csv,.xls,.xlsx,.json"
                    onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
                  />
                </label>
                <span className="text-gray-500">or drag and drop here</span>
              </div>

              <div className="flex items-center justify-center gap-6 pt-4">
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <File className="w-4 h-4" />
                  <span>PDF</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>CSV / Excel</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <FileText className="w-4 h-4" />
                  <span>JSON</span>
                </div>
              </div>
            </div>
          </div>

          {/* Features */}
          <div className="grid grid-cols-4 gap-4 mt-8">
            <div className="bg-[#0A0A0A] rounded-xl p-4 border border-[#2A2A2A]">
              <Brain className="w-8 h-8 text-purple-400 mb-3" />
              <h4 className="font-bold text-white mb-1">AI-Powered</h4>
              <p className="text-sm text-gray-400">Advanced ML models extract CRM data</p>
            </div>
            <div className="bg-[#0A0A0A] rounded-xl p-4 border border-[#2A2A2A]">
              <Zap className="w-8 h-8 text-yellow-400 mb-3" />
              <h4 className="font-bold text-white mb-1">Lightning Fast</h4>
              <p className="text-sm text-gray-400">Process hundreds of records in seconds</p>
            </div>
            <div className="bg-[#0A0A0A] rounded-xl p-4 border border-[#2A2A2A]">
              <CheckCircle className="w-8 h-8 text-green-400 mb-3" />
              <h4 className="font-bold text-white mb-1">High Accuracy</h4>
              <p className="text-sm text-gray-400">94%+ average accuracy with validation</p>
            </div>
            <div className="bg-[#0A0A0A] rounded-xl p-4 border border-[#2A2A2A]">
              <Edit2 className="w-8 h-8 text-blue-400 mb-3" />
              <h4 className="font-bold text-white mb-1">Fully Editable</h4>
              <p className="text-sm text-gray-400">Review and adjust before importing</p>
            </div>
          </div>
        </div>
      )}

      {/* Processing Status */}
      {importSession && importSession.status === 'processing' && (
        <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-8">
          <div className="text-center space-y-6">
            <div className="flex justify-center">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center animate-pulse">
                <Brain className="w-10 h-10 text-white" />
              </div>
            </div>

            <div>
              <h3 className="text-2xl font-bold text-white mb-2">AI Processing Your Data</h3>
              <p className="text-gray-400">
                File: <span className="text-white font-semibold">{importSession.fileName}</span>
                {' '}({importSession.fileSize})
              </p>
            </div>

            {/* Progress Stages */}
            <div className="max-w-4xl mx-auto">
              <div className="flex items-center justify-between mb-4">
                {processingStages.map((stage, index) => {
                  const StageIcon = stage.icon;
                  const isActive = index === currentStageIndex;
                  const isCompleted = index < currentStageIndex;
                  
                  return (
                    <div key={stage.id} className="flex-1 flex items-center">
                      <div className="flex flex-col items-center flex-1">
                        <div
                          className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 ${
                            isActive
                              ? `bg-${stage.color}-600 shadow-lg shadow-${stage.color}-500/50 scale-110`
                              : isCompleted
                              ? `bg-${stage.color}-600/30`
                              : 'bg-[#2A2A2A]'
                          }`}
                        >
                          {isCompleted ? (
                            <Check className="w-6 h-6 text-green-400" />
                          ) : (
                            <StageIcon
                              className={`w-6 h-6 ${
                                isActive ? 'text-white animate-pulse' : 'text-gray-600'
                              }`}
                            />
                          )}
                        </div>
                        <p
                          className={`text-xs mt-2 font-semibold ${
                            isActive ? 'text-white' : isCompleted ? 'text-gray-400' : 'text-gray-600'
                          }`}
                        >
                          {stage.label}
                        </p>
                      </div>
                      {index < processingStages.length - 1 && (
                        <div className="flex-1 h-0.5 bg-[#2A2A2A] mx-2">
                          <div
                            className={`h-full bg-gradient-to-r from-purple-600 to-pink-600 transition-all duration-500 ${
                              isCompleted ? 'w-full' : 'w-0'
                            }`}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center justify-center gap-2 text-purple-400">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="font-semibold">
                {processingStages[currentStageIndex]?.label}...
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Review Records */}
      {importSession && importSession.status === 'review' && records.length > 0 && (
        <>
          {/* Session Info */}
          <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl p-6 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <CheckCircle className="w-12 h-12" />
                <div>
                  <h3 className="text-2xl font-bold mb-1">AI Processing Complete!</h3>
                  <p className="opacity-90">
                    Extracted {importSession.totalRecords} {config.pluralTitle.toLowerCase()} from {importSession.fileName}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-4xl font-bold mb-1">{importSession.aiAccuracy}%</div>
                <p className="text-sm opacity-90">Average Accuracy</p>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-4">
              <TypeIcon className="w-6 h-6 text-blue-400 mb-2" />
              <p className="text-2xl font-bold text-white">{importSession.totalRecords}</p>
              <p className="text-sm text-gray-400">Total {config.pluralTitle}</p>
            </div>
            <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-4">
              <CheckCircle className="w-6 h-6 text-green-400 mb-2" />
              <p className="text-2xl font-bold text-white">{importSession.verifiedRecords}</p>
              <p className="text-sm text-gray-400">Auto-Verified</p>
            </div>
            <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-4">
              <AlertCircle className="w-6 h-6 text-yellow-400 mb-2" />
              <p className="text-2xl font-bold text-white">
                {records.filter(r => r.needsReview).length}
              </p>
              <p className="text-sm text-gray-400">Need Review</p>
            </div>
            <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-4">
              <BarChart3 className="w-6 h-6 text-purple-400 mb-2" />
              <p className="text-2xl font-bold text-white">{importSession.aiAccuracy}%</p>
              <p className="text-sm text-gray-400">AI Accuracy</p>
            </div>
          </div>

          {/* Records Table */}
          <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] overflow-hidden">
            <div className="px-6 py-4 bg-[#0F0F0F] border-b border-[#2A2A2A] flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">Review {config.pluralTitle}</h2>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    setImportSession(null);
                    setRecords([]);
                    setProcessingStage('upload');
                  }}
                  className="px-4 py-2 bg-gradient-to-r from-gray-600/10 to-gray-700/10 text-gray-300 hover:from-gray-600/20 hover:to-gray-700/20 hover:text-white border-2 border-gray-500/30 hover:border-gray-400/50 transition-all duration-300 rounded-lg font-semibold flex items-center gap-2"
                >
                  <X className="w-4 h-4" />
                  Cancel
                </button>
                <button
                  onClick={handleImportAll}
                  className="px-6 py-2 bg-gradient-to-r from-green-600/10 to-green-700/10 text-gray-300 hover:from-green-600/20 hover:to-green-700/20 hover:text-white border-2 border-green-500/30 hover:border-green-400/50 hover:shadow-lg hover:shadow-green-500/30 hover:scale-102 transition-all duration-300 rounded-lg font-bold flex items-center gap-2"
                >
                  <Check className="w-5 h-5" />
                  Import All {config.pluralTitle}
                </button>
              </div>
            </div>
            <DataTable
              columns={columns}
              data={records}
              emptyMessage={`No ${config.pluralTitle.toLowerCase()}`}
              containerClassName="bg-transparent border-none"
              headerClassName="bg-[#0A0A0A] border-[#2A2A2A]"
            />
          </div>
        </>
      )}

      {/* Edit Modal */}
      {showEditModal && editedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm overflow-y-auto">
          <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl shadow-2xl max-w-4xl w-full my-8">
            <div className="p-6 border-b border-[#2A2A2A] flex items-center justify-between sticky top-0 bg-[#1A1A1A] z-10">
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <Edit2 className="w-6 h-6 text-blue-400" />
                Edit {config.title}
              </h2>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditedRecord(null);
                  setSelectedRecord(null);
                }}
                className="p-2 hover:bg-[#2A2A2A] rounded-lg transition"
              >
                <X className="w-6 h-6 text-gray-400" />
              </button>
            </div>

            <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                {/* Name */}
                <div className="col-span-2">
                  <label className="block text-sm font-semibold text-gray-400 mb-2">
                    Name *
                  </label>
                  <input
                    type="text"
                    value={editedRecord.name}
                    onChange={(e) => setEditedRecord({ ...editedRecord, name: e.target.value })}
                    className="w-full px-4 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  />
                </div>

                {/* Email */}
                {importType === 'contacts' && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-400 mb-2">
                      Email
                    </label>
                    <input
                      type="email"
                      value={editedRecord.email || ''}
                      onChange={(e) => setEditedRecord({ ...editedRecord, email: e.target.value })}
                      className="w-full px-4 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                    />
                  </div>
                )}

                {/* Phone */}
                <div>
                  <label className="block text-sm font-semibold text-gray-400 mb-2">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={editedRecord.phone || ''}
                    onChange={(e) => setEditedRecord({ ...editedRecord, phone: e.target.value })}
                    className="w-full px-4 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  />
                </div>

                {/* Company/Title */}
                {importType === 'contacts' && (
                  <>
                    <div>
                      <label className="block text-sm font-semibold text-gray-400 mb-2">
                        Company
                      </label>
                      <input
                        type="text"
                        value={editedRecord.company || ''}
                        onChange={(e) => setEditedRecord({ ...editedRecord, company: e.target.value })}
                        className="w-full px-4 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-400 mb-2">
                        Title
                      </label>
                      <input
                        type="text"
                        value={editedRecord.title || ''}
                        onChange={(e) => setEditedRecord({ ...editedRecord, title: e.target.value })}
                        className="w-full px-4 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                      />
                    </div>
                  </>
                )}

                {/* Type */}
                {(importType === 'companies' || importType === 'properties' || importType === 'associations') && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-400 mb-2">
                      Type
                    </label>
                    <input
                      type="text"
                      value={editedRecord.type || ''}
                      onChange={(e) => setEditedRecord({ ...editedRecord, type: e.target.value })}
                      className="w-full px-4 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                    />
                  </div>
                )}

                {/* Value */}
                {(importType === 'companies' || importType === 'deals' || importType === 'properties') && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-400 mb-2">
                      Value
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                      <input
                        type="number"
                        value={editedRecord.value || ''}
                        onChange={(e) => setEditedRecord({ ...editedRecord, value: parseFloat(e.target.value) || 0 })}
                        className="w-full pl-8 pr-4 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                      />
                    </div>
                  </div>
                )}

                {/* Address Fields */}
                {(importType === 'contacts' || importType === 'companies' || importType === 'properties' || importType === 'associations') && (
                  <>
                    <div className="col-span-2">
                      <label className="block text-sm font-semibold text-gray-400 mb-2">
                        Address
                      </label>
                      <input
                        type="text"
                        value={editedRecord.address || ''}
                        onChange={(e) => setEditedRecord({ ...editedRecord, address: e.target.value })}
                        className="w-full px-4 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-400 mb-2">
                        City
                      </label>
                      <input
                        type="text"
                        value={editedRecord.city || ''}
                        onChange={(e) => setEditedRecord({ ...editedRecord, city: e.target.value })}
                        className="w-full px-4 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-400 mb-2">
                        State
                      </label>
                      <input
                        type="text"
                        value={editedRecord.state || ''}
                        onChange={(e) => setEditedRecord({ ...editedRecord, state: e.target.value })}
                        className="w-full px-4 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                      />
                    </div>
                  </>
                )}

                {/* Notes */}
                <div className="col-span-2">
                  <label className="block text-sm font-semibold text-gray-400 mb-2">
                    Notes
                  </label>
                  <textarea
                    value={editedRecord.notes || ''}
                    onChange={(e) => setEditedRecord({ ...editedRecord, notes: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  />
                </div>
              </div>

              {/* AI Confidence Indicator */}
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <Sparkles className="w-5 h-5 text-blue-400" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-blue-300">
                      AI Confidence: {(editedRecord.aiConfidence * 100).toFixed(0)}%
                    </p>
                    <p className="text-xs text-blue-400">
                      {editedRecord.aiConfidence >= 0.95
                        ? 'High confidence - data extracted with high accuracy'
                        : editedRecord.aiConfidence >= 0.90
                        ? 'Good confidence - please verify important fields'
                        : 'Low confidence - please review all fields carefully'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-[#2A2A2A] flex items-center justify-end gap-3">
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditedRecord(null);
                  setSelectedRecord(null);
                }}
                className="px-6 py-2 bg-gradient-to-r from-gray-600/10 to-gray-700/10 text-gray-300 hover:from-gray-600/20 hover:to-gray-700/20 hover:text-white border-2 border-gray-500/30 hover:border-gray-400/50 transition-all duration-300 rounded-lg font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveRecord}
                className="px-6 py-2 bg-gradient-to-r from-blue-600/10 to-cyan-600/10 text-gray-300 hover:from-blue-600/20 hover:to-cyan-600/20 hover:text-white border-2 border-blue-500/30 hover:border-blue-400/50 hover:shadow-lg hover:shadow-blue-500/30 hover:scale-102 transition-all duration-300 rounded-lg font-bold flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
