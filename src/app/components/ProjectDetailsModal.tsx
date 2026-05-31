/**
 * Project Details Modal - Mission Control for a Single Project
 * 
 * Complete view of all project data with tabs for:
 * - Overview
 * - Customer Submission (photos, videos, documents, plans)
 * - Quote Editor
 * - Design Center
 * - Materials Search
 * - Contract
 * - Invoice/Payment
 */

import { useState } from 'react';
import {
  X, FileText, Image as ImageIcon, Video, FileCheck, ChevronDown, ChevronUp,
  Clock, DollarSign, CheckCircle, XCircle, MapPin, Phone, Mail, Building2,
  Calendar, User, Edit2, Send, FileSignature, AlertCircle, Wrench, Package, 
  ExternalLink, Eye, Search, ShoppingCart, Sparkles, Play, Star, Palette, FileSignature as FileContract, Plus,
  ZoomIn, Download, Layout, Maximize2, Info, Save, ArrowLeft, ArrowRight
} from 'lucide-react';
import CreateInvoiceModal from './invoices/CreateInvoiceModal';
import { toast } from 'sonner@2.0.3';

interface ProjectDetailsModalProps {
  item: any;
  onClose: () => void;
  onUpdate: (updatedItem: any) => void;
  onStageChange: (newStage: string) => void;
  onOpenQuoteEditor?: (item: any) => void;
  initialTab?: TabType; // Optional initial tab to open
}

type TabType = 'overview' | 'submission' | 'quote' | 'design' | 'materials' | 'contract' | 'invoice';

export function ProjectDetailsModal({ item, onClose, onUpdate, onStageChange, onOpenQuoteEditor, initialTab = 'overview' }: ProjectDetailsModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>(initialTab);
  const [selectedMedia, setSelectedMedia] = useState<{ type: 'photo' | 'video', url: string, filename: string } | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editedItem, setEditedItem] = useState(item);

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Info, available: true },
    { id: 'submission', label: 'Customer Files', icon: ImageIcon, available: !!item.submission, badge: getTotalFilesCount() },
    { id: 'quote', label: 'Quote', icon: FileText, available: true },
    { id: 'design', label: 'Design Center', icon: Palette, available: true },
    { id: 'materials', label: 'Materials', icon: Package, available: true },
    { id: 'contract', label: 'Contract', icon: FileContract, available: true },
    { id: 'invoice', label: 'Invoice', icon: DollarSign, available: true },
  ];

  function getTotalFilesCount() {
    if (!item.submission) return 0;
    return (
      (item.submission.photos?.length || 0) +
      (item.submission.videos?.length || 0) +
      (item.submission.documents?.length || 0) +
      (item.submission.plans?.length || 0)
    );
  }

  const handleSave = () => {
    onUpdate(editedItem);
    setEditMode(false);
    toast.success('Project updated successfully!');
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#0A0A0A] border border-gray-700 rounded-2xl w-full max-w-7xl h-[90vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-2xl font-bold text-white">{item.title}</h2>
              <span className="px-3 py-1 bg-[#ea580c]/20 border border-[#ea580c]/50 rounded-lg text-sm font-mono text-[#ea580c]">
                {item.itemNumber}
              </span>
            </div>
            <div className="flex items-center gap-4 text-sm text-gray-400">
              <span className="flex items-center gap-1">
                <User className="w-4 h-4" />
                {item.customerName}
              </span>
              <span className="flex items-center gap-1">
                <Wrench className="w-4 h-4" />
                {item.serviceType}
              </span>
              {item.quote && (
                <span className="flex items-center gap-1 text-green-400 font-semibold">
                  <DollarSign className="w-4 h-4" />
                  ${item.quote.totalCost.toLocaleString()}
                </span>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X className="w-6 h-6 text-gray-400" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-2 px-6 py-3 border-b border-gray-700 overflow-x-auto">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                disabled={!tab.available}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold whitespace-nowrap transition-all ${
                  activeTab === tab.id
                    ? 'bg-[#ea580c] text-white shadow-lg'
                    : tab.available
                    ? 'bg-black border border-gray-700 text-gray-400 hover:border-gray-600'
                    : 'bg-black/50 border border-gray-800 text-gray-600 cursor-not-allowed'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
                {tab.badge > 0 && (
                  <span className="px-2 py-0.5 bg-[#ea580c] text-white text-xs rounded-full">
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'overview' && (
            <OverviewTab item={editedItem} editMode={editMode} setEditedItem={setEditedItem} />
          )}
          
          {activeTab === 'submission' && (
            <CustomerSubmissionTab item={item} onMediaSelect={setSelectedMedia} />
          )}
          
          {activeTab === 'quote' && (
            <QuoteTab item={item} onUpdate={onUpdate} onOpenQuoteEditor={onOpenQuoteEditor} />
          )}
          
          {activeTab === 'design' && (
            <DesignCenterTab item={item} />
          )}
          
          {activeTab === 'materials' && (
            <MaterialsSearchTab item={item} onUpdate={onUpdate} />
          )}
          
          {activeTab === 'contract' && (
            <ContractTab item={item} />
          )}
          
          {activeTab === 'invoice' && (
            <InvoiceTab item={item} />
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between p-6 border-t border-gray-700">
          <div className="flex items-center gap-3">
            <StageProgressBar currentStage={item.stage} onStageChange={onStageChange} />
          </div>
          
          <div className="flex items-center gap-3">
            {editMode ? (
              <>
                <button
                  onClick={() => {
                    setEditedItem(item);
                    setEditMode(false);
                  }}
                  className="px-4 py-2 bg-black border border-gray-700 text-gray-400 rounded-lg hover:border-gray-600 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#ea580c] to-[#fb923c] text-white rounded-lg font-semibold"
                >
                  <Save className="w-4 h-4" />
                  Save Changes
                </button>
              </>
            ) : (
              <button
                onClick={() => setEditMode(true)}
                className="flex items-center gap-2 px-4 py-2 bg-black border border-gray-700 text-gray-400 rounded-lg hover:border-[#ea580c] hover:text-[#ea580c] transition-colors"
              >
                <Edit2 className="w-4 h-4" />
                Edit Project
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Media Viewer */}
      {selectedMedia && (
        <MediaViewer media={selectedMedia} onClose={() => setSelectedMedia(null)} />
      )}
    </div>
  );
}

// Overview Tab
function OverviewTab({ item, editMode, setEditedItem }: any) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-6">
        {/* Customer Information */}
        <div className="bg-black/40 border border-gray-700 rounded-xl p-6">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <User className="w-5 h-5 text-[#ea580c]" />
            Customer Information
          </h3>
          <div className="space-y-3">
            <div>
              <label className="text-sm text-gray-400 mb-1 block">Name</label>
              {editMode ? (
                <input
                  type="text"
                  value={item.customerName}
                  onChange={(e) => setEditedItem({ ...item, customerName: e.target.value })}
                  className="w-full px-3 py-2 bg-black border border-gray-700 rounded-lg text-white"
                />
              ) : (
                <p className="text-white">{item.customerName}</p>
              )}
            </div>
            <div>
              <label className="text-sm text-gray-400 mb-1 block">Email</label>
              <div className="flex items-center gap-2 text-white">
                <Mail className="w-4 h-4 text-gray-400" />
                {item.customerEmail}
              </div>
            </div>
            <div>
              <label className="text-sm text-gray-400 mb-1 block">Phone</label>
              <div className="flex items-center gap-2 text-white">
                <Phone className="w-4 h-4 text-gray-400" />
                {item.customerPhone || 'Not provided'}
              </div>
            </div>
            <div>
              <label className="text-sm text-gray-400 mb-1 block">Location</label>
              <div className="flex items-center gap-2 text-white">
                <MapPin className="w-4 h-4 text-gray-400" />
                {item.location || 'Not provided'}
              </div>
            </div>
          </div>
        </div>

        {/* Project Details */}
        <div className="bg-black/40 border border-gray-700 rounded-xl p-6">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Wrench className="w-5 h-5 text-[#ea580c]" />
            Project Details
          </h3>
          <div className="space-y-3">
            <div>
              <label className="text-sm text-gray-400 mb-1 block">Service Type</label>
              <p className="text-white">{item.serviceType}</p>
            </div>
            <div>
              <label className="text-sm text-gray-400 mb-1 block">Priority</label>
              <span className={`inline-block px-3 py-1 rounded-lg text-xs font-semibold ${
                item.priority === 'urgent' ? 'bg-red-500/20 text-red-400' :
                item.priority === 'high' ? 'bg-orange-500/20 text-orange-400' :
                item.priority === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                'bg-green-500/20 text-green-400'
              }`}>
                {item.priority.toUpperCase()}
              </span>
            </div>
            <div>
              <label className="text-sm text-gray-400 mb-1 block">Assigned To</label>
              <p className="text-white">{item.assignedTo || 'Unassigned'}</p>
            </div>
            <div>
              <label className="text-sm text-gray-400 mb-1 block">Created Date</label>
              <div className="flex items-center gap-2 text-white">
                <Calendar className="w-4 h-4 text-gray-400" />
                {new Date(item.createdDate).toLocaleDateString()}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Description */}
      <div className="bg-black/40 border border-gray-700 rounded-xl p-6">
        <h3 className="text-lg font-bold text-white mb-4">Description</h3>
        {editMode ? (
          <textarea
            value={item.description}
            onChange={(e) => setEditedItem({ ...item, description: e.target.value })}
            rows={4}
            className="w-full px-3 py-2 bg-black border border-gray-700 rounded-lg text-white"
          />
        ) : (
          <p className="text-gray-300 leading-relaxed">{item.description}</p>
        )}
      </div>
    </div>
  );
}

// Customer Submission Tab
function CustomerSubmissionTab({ item, onMediaSelect }: any) {
  const submission = item.submission;

  if (!submission) {
    return (
      <div className="text-center py-16">
        <AlertCircle className="w-16 h-16 text-gray-600 mx-auto mb-4" />
        <p className="text-gray-400 text-lg">No customer submission data available</p>
        <p className="text-gray-600 text-sm">Files will appear here when the customer uploads them</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Photos */}
      {submission.photos && submission.photos.length > 0 && (
        <div>
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-[#ea580c]" />
            Photos ({submission.photos.length})
          </h3>
          <div className="grid grid-cols-4 gap-4">
            {submission.photos.map((photo: any) => (
              <div
                key={photo.id}
                onClick={() => onMediaSelect({ type: 'photo', url: photo.url, filename: photo.filename })}
                className="aspect-square bg-black border border-gray-700 rounded-xl overflow-hidden cursor-pointer hover:border-[#ea580c] transition-colors group relative"
              >
                <img src={photo.url} alt={photo.filename} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <ZoomIn className="w-8 h-8 text-white" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Videos */}
      {submission.videos && submission.videos.length > 0 && (
        <div>
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Video className="w-5 h-5 text-[#ea580c]" />
            Videos ({submission.videos.length})
          </h3>
          <div className="grid grid-cols-3 gap-4">
            {submission.videos.map((video: any) => (
              <div
                key={video.id}
                onClick={() => onMediaSelect({ type: 'video', url: video.url, filename: video.filename })}
                className="aspect-video bg-black border border-gray-700 rounded-xl overflow-hidden cursor-pointer hover:border-[#ea580c] transition-colors group relative"
              >
                <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-purple-500/20 to-blue-500/20">
                  <Play className="w-12 h-12 text-white" />
                </div>
                <p className="absolute bottom-0 left-0 right-0 p-2 bg-black/80 text-white text-xs truncate">
                  {video.filename}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Documents */}
      {submission.documents && submission.documents.length > 0 && (
        <div>
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <FileCheck className="w-5 h-5 text-[#ea580c]" />
            Documents ({submission.documents.length})
          </h3>
          <div className="space-y-2">
            {submission.documents.map((doc: any) => (
              <a
                key={doc.id}
                href={doc.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-4 bg-black border border-gray-700 rounded-xl hover:border-[#ea580c] transition-colors"
              >
                <div className="flex items-center gap-3">
                  <FileCheck className="w-5 h-5 text-blue-400" />
                  <div>
                    <p className="text-white font-medium">{doc.filename}</p>
                    <p className="text-xs text-gray-400">{doc.type}</p>
                  </div>
                </div>
                <Download className="w-5 h-5 text-gray-400" />
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Plans/Blueprints */}
      {submission.plans && submission.plans.length > 0 && (
        <div>
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Layout className="w-5 h-5 text-[#ea580c]" />
            Plans & Blueprints ({submission.plans.length})
          </h3>
          <div className="grid grid-cols-2 gap-4">
            {submission.plans.map((plan: any) => (
              <div
                key={plan.id}
                onClick={() => onMediaSelect({ type: 'photo', url: plan.url, filename: plan.filename })}
                className="aspect-[4/3] bg-black border border-gray-700 rounded-xl overflow-hidden cursor-pointer hover:border-[#ea580c] transition-colors group relative"
              >
                <img src={plan.url} alt={plan.filename} className="w-full h-full object-contain bg-gray-900" />
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Maximize2 className="w-8 h-8 text-white" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Blueprint Analysis */}
      {submission.blueprintAnalysis && (
        <div className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-blue-500/30 rounded-xl p-6">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-blue-400" />
            AI Blueprint Analysis
          </h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-black/40 border border-gray-700 rounded-lg p-4">
              <p className="text-gray-400 text-sm mb-1">Rooms Detected</p>
              <p className="text-2xl font-bold text-white">{submission.blueprintAnalysis.rooms?.length || 0}</p>
            </div>
            <div className="bg-black/40 border border-gray-700 rounded-lg p-4">
              <p className="text-gray-400 text-sm mb-1">Materials Identified</p>
              <p className="text-2xl font-bold text-white">{submission.blueprintAnalysis.materials?.length || 0}</p>
            </div>
            <div className="bg-black/40 border border-gray-700 rounded-lg p-4">
              <p className="text-gray-400 text-sm mb-1">Estimated Cost</p>
              <p className="text-2xl font-bold text-green-400">
                ${submission.blueprintAnalysis.estimatedCosts?.total?.toLocaleString() || 0}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Quote Tab
function QuoteTab({ item, onUpdate, onOpenQuoteEditor }: any) {
  return (
    <div className="space-y-6">
      <div className="bg-black/40 border border-gray-700 rounded-xl p-6">
        <h3 className="text-lg font-bold text-white mb-4">Quote Editor</h3>
        <p className="text-gray-400 mb-4">Full quote editing interface will be integrated here</p>
        <button
          onClick={() => onOpenQuoteEditor && onOpenQuoteEditor(item)}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#ea580c] to-[#fb923c] text-white rounded-lg font-semibold"
        >
          <Sparkles className="w-4 h-4" />
          Open Full Quote Editor
        </button>
      </div>
    </div>
  );
}

// Design Center Tab
function DesignCenterTab({ item }: any) {
  return (
    <div className="space-y-6">
      <div className="bg-black/40 border border-gray-700 rounded-xl p-6">
        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <Palette className="w-5 h-5 text-[#ea580c]" />
          Design Center Integration
        </h3>
        <p className="text-gray-400 mb-4">Access design tools, create layouts, and visualize the project</p>
        <button className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-lg font-semibold">
          <Palette className="w-4 h-4" />
          Open Design Center
        </button>
      </div>
    </div>
  );
}

// Materials Search Tab
function MaterialsSearchTab({ item, onUpdate }: any) {
  return (
    <div className="space-y-6">
      <div className="bg-black/40 border border-gray-700 rounded-xl p-6">
        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <Package className="w-5 h-5 text-[#ea580c]" />
          Materials Search
        </h3>
        <p className="text-gray-400 mb-4">Search vendor catalogs and add materials to quote</p>
        
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search Grainger, Home Depot, Lowe's..."
            className="w-full pl-10 pr-4 py-3 bg-black border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#ea580c]"
          />
        </div>
        
        <div className="grid grid-cols-3 gap-4">
          <button className="flex flex-col items-center justify-center p-6 bg-gradient-to-br from-orange-500/10 to-red-500/10 border border-orange-500/30 rounded-xl hover:border-orange-500 transition-colors">
            <img src="https://upload.wikimedia.org/wikipedia/commons/7/76/Grainger_Logo.svg" alt="Grainger" className="h-8 mb-2 opacity-80" />
            <span className="text-white font-semibold">Grainger</span>
          </button>
          <button className="flex flex-col items-center justify-center p-6 bg-gradient-to-br from-orange-500/10 to-orange-600/10 border border-orange-500/30 rounded-xl hover:border-orange-500 transition-colors">
            <span className="text-2xl font-bold text-orange-500 mb-2">HD</span>
            <span className="text-white font-semibold">Home Depot</span>
          </button>
          <button className="flex flex-col items-center justify-center p-6 bg-gradient-to-br from-blue-500/10 to-blue-600/10 border border-blue-500/30 rounded-xl hover:border-blue-500 transition-colors">
            <span className="text-2xl font-bold text-blue-400 mb-2">L</span>
            <span className="text-white font-semibold">Lowe's</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// Contract Tab
function ContractTab({ item }: any) {
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'signed': return 'text-green-400 bg-green-500/20 border-green-500/50';
      case 'active': return 'text-blue-400 bg-blue-500/20 border-blue-500/50';
      case 'completed': return 'text-purple-400 bg-purple-500/20 border-purple-500/50';
      case 'awaiting-signature': return 'text-yellow-400 bg-yellow-500/20 border-yellow-500/50';
      case 'sent': return 'text-cyan-400 bg-cyan-500/20 border-cyan-500/50';
      case 'draft': return 'text-gray-400 bg-gray-500/20 border-gray-500/50';
      default: return 'text-gray-400 bg-gray-500/20 border-gray-500/50';
    }
  };

  return (
    <div className="space-y-6">
      {item.contract ? (
        <>
          {/* Contract Header with Create Invoice Button */}
          <div className="bg-gradient-to-r from-[#ea580c]/10 to-[#fb923c]/10 border border-[#ea580c]/30 rounded-xl p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-2xl font-bold text-white mb-2">{item.contract.contractNumber}</h3>
                <p className="text-gray-400">Contract for: <span className="text-white font-semibold">{item.title}</span></p>
              </div>
              <div className="flex items-center gap-3">
                <div className={`px-3 py-1.5 rounded-full text-xs font-bold border ${getStatusColor(item.contract.status)}`}>
                  {item.contract.status.toUpperCase().replace('-', ' ')}
                </div>
                {/* Create Invoice Button */}
                {item.contract.status === 'signed' || item.contract.status === 'active' ? (
                  <button
                    onClick={() => setShowInvoiceModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white rounded-lg font-semibold transition-all shadow-lg"
                  >
                    <Plus className="w-4 h-4" />
                    Create Invoice
                  </button>
                ) : null}
              </div>
            </div>
          </div>

          {/* Contract Type & Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-black/40 border border-gray-700 rounded-xl p-4">
              <p className="text-xs text-gray-500 uppercase font-semibold mb-2">Contract Type</p>
              <p className="text-white font-semibold">
                {item.contract.contractType === 'soroban-smart-contract' ? '⚡ Smart Contract (Soroban)' : '📄 Standard Contract'}
              </p>
              {item.contract.contractType === 'soroban-smart-contract' && item.contract.sorobanContractId && (
                <p className="text-xs text-gray-500 mt-1 font-mono">{item.contract.sorobanContractId.slice(0, 20)}...</p>
              )}
            </div>
            
            <div className="bg-black/40 border border-gray-700 rounded-xl p-4">
              <p className="text-xs text-gray-500 uppercase font-semibold mb-2">Start Date</p>
              <p className="text-white font-semibold">{new Date(item.contract.startDate).toLocaleDateString()}</p>
              {item.contract.endDate && (
                <p className="text-xs text-gray-400 mt-1">End: {new Date(item.contract.endDate).toLocaleDateString()}</p>
              )}
            </div>
          </div>

          {/* Signatures */}
          {(item.contract.signedDate || item.contract.customerSignature || item.contract.companySignature) && (
            <div className="bg-black/40 border border-gray-700 rounded-xl p-6">
              <h4 className="text-lg font-bold text-white mb-4">Signatures</h4>
              <div className="grid grid-cols-2 gap-6">
                {item.contract.customerSignature && (
                  <div>
                    <p className="text-sm text-gray-400 mb-2">Customer Signature</p>
                    <div className="bg-white p-4 rounded border border-gray-300 h-24 flex items-center justify-center">
                      <p className="text-gray-800 font-signature text-2xl">{item.contract.signedBy || item.customerName}</p>
                    </div>
                    {item.contract.signedDate && (
                      <p className="text-xs text-green-400 mt-2">✓ Signed on {new Date(item.contract.signedDate).toLocaleDateString()}</p>
                    )}
                  </div>
                )}
                {item.contract.companySignature && (
                  <div>
                    <p className="text-sm text-gray-400 mb-2">Company Signature</p>
                    <div className="bg-white p-4 rounded border border-gray-300 h-24 flex items-center justify-center">
                      <p className="text-gray-800 font-signature text-2xl">Authorized Representative</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Payment Schedule */}
          {item.contract.paymentSchedule && item.contract.paymentSchedule.length > 0 && (
            <div className="bg-black/40 border border-gray-700 rounded-xl p-6">
              <h4 className="text-lg font-bold text-white mb-4">Payment Schedule</h4>
              <div className="space-y-3">
                {item.contract.paymentSchedule.map((payment: any, idx: number) => (
                  <div key={idx} className="p-4 bg-black/60 border border-gray-700 rounded-lg">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-white font-bold text-lg">{payment.type.toUpperCase()}</p>
                          <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold ${
                            payment.status === 'paid' ? 'bg-green-500/20 text-green-400 border border-green-500/50' :
                            payment.status === 'overdue' ? 'bg-red-500/20 text-red-400 border border-red-500/50' :
                            'bg-yellow-500/20 text-yellow-400 border border-yellow-500/50'
                          }`}>
                            {payment.status.toUpperCase()}
                          </span>
                        </div>
                        <p className="text-sm text-gray-400">{payment.description}</p>
                        {payment.milestone && (
                          <p className="text-xs text-purple-400 mt-1">📍 {payment.milestone}</p>
                        )}
                        {payment.dueDate && (
                          <p className="text-xs text-cyan-400 mt-1">📅 Due: {new Date(payment.dueDate).toLocaleDateString()}</p>
                        )}
                      </div>
                      <div className="text-right ml-4">
                        <p className="text-white font-bold text-xl">${payment.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                        <p className="text-xs text-gray-400">{payment.percentage}% of total</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Payment Schedule Summary */}
              <div className="mt-4 pt-4 border-t border-gray-700">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="text-sm">
                      <span className="text-gray-400">Total Paid: </span>
                      <span className="text-green-400 font-bold">
                        ${item.contract.paymentSchedule
                          .filter((p: any) => p.status === 'paid')
                          .reduce((sum: number, p: any) => sum + p.amount, 0)
                          .toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="text-sm">
                      <span className="text-gray-400">Remaining: </span>
                      <span className="text-yellow-400 font-bold">
                        ${item.contract.paymentSchedule
                          .filter((p: any) => p.status !== 'paid')
                          .reduce((sum: number, p: any) => sum + p.amount, 0)
                          .toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                  <div className="text-sm">
                    <span className="text-gray-400">Contract Total: </span>
                    <span className="text-white font-bold">
                      ${item.contract.paymentSchedule
                        .reduce((sum: number, p: any) => sum + p.amount, 0)
                        .toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Terms & Conditions */}
          <div className="bg-black/40 border border-gray-700 rounded-xl p-6">
            <h4 className="text-lg font-bold text-white mb-4">Terms & Conditions</h4>
            <div className="text-gray-300 text-sm whitespace-pre-wrap leading-relaxed">
              {item.contract.terms || 'No terms specified'}
            </div>
          </div>

          {/* Timeline */}
          <div className="bg-black/40 border border-gray-700 rounded-xl p-6">
            <h4 className="text-lg font-bold text-white mb-4">Contract Timeline</h4>
            <div className="space-y-3">
              {item.contract.contractTypeSelectedAt && (
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 mt-2 rounded-full bg-gray-500"></div>
                  <div>
                    <p className="text-white">Contract Type Selected</p>
                    <p className="text-xs text-gray-400">{new Date(item.contract.contractTypeSelectedAt).toLocaleString()}</p>
                  </div>
                </div>
              )}
              {item.contract.sentAt && (
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 mt-2 rounded-full bg-cyan-500"></div>
                  <div>
                    <p className="text-white">Sent to Customer</p>
                    <p className="text-xs text-gray-400">{new Date(item.contract.sentAt).toLocaleString()}</p>
                  </div>
                </div>
              )}
              {item.contract.customerViewedAt && (
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 mt-2 rounded-full bg-purple-500"></div>
                  <div>
                    <p className="text-white">Viewed by Customer</p>
                    <p className="text-xs text-gray-400">{new Date(item.contract.customerViewedAt).toLocaleString()}</p>
                  </div>
                </div>
              )}
              {item.contract.signedDate && (
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 mt-2 rounded-full bg-green-500"></div>
                  <div>
                    <p className="text-white">Signed by {item.contract.signedBy}</p>
                    <p className="text-xs text-gray-400">{new Date(item.contract.signedDate).toLocaleString()}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Blockchain Details (if applicable) */}
          {item.contract.contractType === 'soroban-smart-contract' && (
            <div className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/30 rounded-xl p-6">
              <h4 className="text-lg font-bold text-white mb-4">⚡ Blockchain Details</h4>
              <div className="space-y-2">
                {item.contract.sorobanContractId && (
                  <div>
                    <p className="text-sm text-gray-400">Contract ID</p>
                    <p className="text-white font-mono text-xs break-all">{item.contract.sorobanContractId}</p>
                  </div>
                )}
                {item.contract.sorobanTransactionHash && (
                  <div>
                    <p className="text-sm text-gray-400 mt-3">Transaction Hash</p>
                    <p className="text-white font-mono text-xs break-all">{item.contract.sorobanTransactionHash}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="bg-black/40 border border-gray-700 rounded-xl p-12 text-center">
          <FileSignature className="w-16 h-16 mx-auto mb-4 text-gray-600" />
          <h3 className="text-xl font-bold text-white mb-2">No Contract Created</h3>
          <p className="text-gray-400 mb-6">This project does not have a contract yet.</p>
          <button className="px-6 py-3 bg-gradient-to-r from-[#ea580c] to-[#fb923c] hover:from-[#fb923c] hover:to-[#ea580c] text-white rounded-lg font-bold transition-all">
            Create Contract
          </button>
        </div>
      )}
      
      {/* Invoice Creation Modal */}
      {showInvoiceModal && (
        <CreateInvoiceModal
          isOpen={showInvoiceModal}
          onClose={() => setShowInvoiceModal(false)}
          onSuccess={() => {
            setShowInvoiceModal(false);
            toast.success('Invoice created successfully!');
            // Optionally reload or update the item
          }}
          projectId={item.id}
        />
      )}
    </div>
  );
}

// Invoice Tab
function InvoiceTab({ item }: any) {
  return (
    <div className="space-y-6">
      <div className="bg-black/40 border border-gray-700 rounded-xl p-6">
        <h3 className="text-lg font-bold text-white mb-4">Invoice & Payment</h3>
        {item.invoice ? (
          <div className="space-y-3">
            <p className="text-gray-400">Invoice Number: <span className="text-white font-mono">{item.invoice.invoiceNumber}</span></p>
            <p className="text-gray-400">Due Date: <span className="text-white">{item.invoice.dueDate}</span></p>
            <p className="text-gray-400">Status: <span className="text-yellow-400">{item.invoice.paymentStatus}</span></p>
          </div>
        ) : (
          <p className="text-gray-400">No invoice created yet</p>
        )}
      </div>
    </div>
  );
}

// Stage Progress Bar with navigation
function StageProgressBar({ currentStage, onStageChange }: any) {
  const stages = [
    { id: 'work-request', label: 'Request' },
    { id: 'quote-draft', label: 'Quote Draft' },
    { id: 'quote-sent', label: 'Quote Sent' },
    { id: 'quote-approved', label: 'Approved' },
    { id: 'contract', label: 'Contract' },
    { id: 'invoice', label: 'Invoice' },
    { id: 'payment', label: 'Payment' },
  ];

  const currentIndex = stages.findIndex(s => s.id === currentStage);

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => currentIndex > 0 && onStageChange(stages[currentIndex - 1].id)}
        disabled={currentIndex === 0}
        className="p-2 bg-black border border-gray-700 rounded-lg text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
      </button>
      
      <div className="flex items-center gap-1">
        {stages.map((stage, index) => (
          <div
            key={stage.id}
            onClick={() => onStageChange(stage.id)}
            className={`px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
              index === currentIndex
                ? 'bg-[#ea580c] text-white'
                : index < currentIndex
                ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                : 'bg-gray-800 text-gray-500'
            }`}
          >
            {stage.label}
          </div>
        ))}
      </div>
      
      <button
        onClick={() => currentIndex < stages.length - 1 && onStageChange(stages[currentIndex + 1].id)}
        disabled={currentIndex === stages.length - 1}
        className="p-2 bg-black border border-gray-700 rounded-lg text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
      >
        <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  );
}

// Media Viewer Modal
function MediaViewer({ media, onClose }: any) {
  return (
    <div className="fixed inset-0 bg-black/95 z-[60] flex items-center justify-center p-4" onClick={onClose}>
      <button
        onClick={onClose}
        className="absolute top-4 right-4 p-2 bg-black/50 hover:bg-black rounded-lg transition-colors"
      >
        <X className="w-6 h-6 text-white" />
      </button>
      
      <div className="max-w-6xl max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
        {media.type === 'photo' ? (
          <img src={media.url} alt={media.filename} className="max-w-full max-h-[85vh] object-contain rounded-lg" />
        ) : (
          <video src={media.url} controls className="max-w-full max-h-[85vh] rounded-lg" autoPlay />
        )}
        <p className="text-center text-white mt-4">{media.filename}</p>
      </div>
    </div>
  );
}