/**
 * Quote to Contract Editor Component
 * 
 * Comprehensive quote editing, bidding, and approval system
 * Combines all quote workflow functionality in one place:
 * - Edit quote details (materials, labor, process steps)
 * - Request subcontractor bids
 * - Track customer approval status
 * - Convert approved quotes to contracts
 */

import { useState, useEffect } from 'react';
import {
  X,
  FileText,
  DollarSign,
  Clock,
  Edit2,
  Save,
  Send,
  Package,
  Users,
  ListChecks,
  Plus,
  Trash2,
  Search,
  ExternalLink,
  Eye,
  EyeOff,
  Recycle,
  Video,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Building2,
  Mail,
  Phone,
  MapPin,
  Calendar,
  TrendingUp,
  Award,
  MessageSquare,
  ThumbsUp,
  ThumbsDown,
  Loader2,
  ArrowRight,
  Download,
  Upload,
  Sparkles,
  ShoppingCart,
  Hammer,
  Star,
  Filter,
  RefreshCw,
  CalendarDays,
  ChevronRight,
  CircleDot
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import {
  materialsHubService,
  Material,
} from '../lib/services/materialsHubService';
import { QuoteProcessEnhancements } from './QuoteProcessEnhancements';

interface MaterialItem {
  id: string;
  name: string;
  description: string;
  quantity: number;
  unit: string;
  unitCost: number;
  totalCost: number;
  supplier?: string;
  category: string;
  manufacturer?: string;
  basePrice?: number;
  inStock?: boolean;
  qualityRating?: number;
  visible?: boolean;
}

interface LaborItem {
  id: string;
  role: string;
  description: string;
  hours: number;
  hourlyRate: number;
  totalCost: number;
  assignedTo?: string;
  visible?: boolean;
}

interface ProcessStep {
  id: string;
  stepNumber: number;
  title: string;
  description: string;
  estimatedDuration: string;
  dependencies?: string[];
  visible?: boolean;
}

interface ScheduleTask {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  duration: number; // in days
  assignedTo?: string;
  dependencies?: string[];
  status: 'not-started' | 'in-progress' | 'completed';
  color: string;
}

interface Quote {
  id: string;
  quoteNumber: string;
  materials: MaterialItem[];
  labor: LaborItem[];
  processSteps: ProcessStep[];
  materialsSubtotal: number;
  laborSubtotal: number;
  taxRate: number;
  taxAmount: number;
  totalCost: number;
  generatedAt: string;
  approvalStatus: 'pending' | 'approved' | 'rejected' | 'revised';
  approvedAt?: string;
  rejectionReason?: string;
  contractTypeSelected?: boolean;
  selectedContractType?: 'standard' | 'soroban-smart-contract';
}

interface SubcontractorBid {
  id: string;
  subcontractorName: string;
  subcontractorEmail: string;
  subcontractorPhone: string;
  company: string;
  bidAmount: number;
  estimatedDuration: string;
  notes: string;
  status: 'pending' | 'accepted' | 'rejected';
  submittedAt: string;
  rating?: number;
}

interface WorkRequest {
  id: string;
  requestNumber: string;
  serviceType: string;
  title: string;
  description: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  location?: string;
  quote?: Quote;
}

interface QuoteToContractEditorProps {
  workRequest: WorkRequest;
  onClose: () => void;
  onSave: (updatedRequest: WorkRequest) => void;
  onSendToCustomer: (request: WorkRequest) => void;
  onConvertToContract: (request: WorkRequest) => void;
}

export function QuoteToContractEditor({
  workRequest,
  onClose,
  onSave,
  onSendToCustomer,
  onConvertToContract
}: QuoteToContractEditorProps) {
  // Normalize materials and labor from Materials Hub format
  const normalizeQuote = (quote: Quote | undefined): Quote | undefined => {
    if (!quote) return quote;
    
    const normalizedMaterials = quote.materials?.map(m => ({
      ...m,
      name: m.name || m.description || '',
      unitCost: m.unitCost || (m as any).unitPrice || 0,
      totalCost: m.totalCost || (m as any).totalPrice || (m.quantity * (m.unitCost || (m as any).unitPrice || 0)),
    })) || [];
    
    const normalizedLabor = quote.labor?.map(l => ({
      ...l,
      role: l.role || l.description || '',
      hourlyRate: l.hourlyRate || (l as any).unitPrice || 0,
      totalCost: l.totalCost || (l as any).totalPrice || (l.hours * (l.hourlyRate || (l as any).unitPrice || 0)),
    })) || [];
    
    return {
      ...quote,
      materials: normalizedMaterials,
      labor: normalizedLabor,
    };
  };
  
  const [activeTab, setActiveTab] = useState<'quote' | 'bidding' | 'approval'>('quote');
  const [quoteEditTab, setQuoteEditTab] = useState<'materials' | 'labor' | 'process'>('materials');
  const [editMode, setEditMode] = useState(false);
  const [editedQuote, setEditedQuote] = useState<Quote | undefined>(normalizeQuote(workRequest.quote));
  const [loading, setLoading] = useState(false);
  
  // Subcontractor bidding state
  const [subcontractorBids, setSubcontractorBids] = useState<SubcontractorBid[]>([]);
  const [showBidForm, setShowBidForm] = useState(false);
  const [loadingBids, setLoadingBids] = useState(false);

  // Materials Hub integration state
  const [showMaterialsHub, setShowMaterialsHub] = useState(false);
  const [materialsHubSearch, setMaterialsHubSearch] = useState('');
  const [materialsHubCategory, setMaterialsHubCategory] = useState('all');
  const [materialsHubResults, setMaterialsHubResults] = useState<Material[]>([]);
  const [replacingMaterialId, setReplacingMaterialId] = useState<string | null>(null);

  // Schedule builder state
  const [projectSchedule, setProjectSchedule] = useState<ScheduleTask[]>([]);
  const [showScheduleBuilder, setShowScheduleBuilder] = useState(false);

  const currentQuote = editMode ? editedQuote : normalizeQuote(workRequest.quote);

  // Load subcontractor bids from backend
  useEffect(() => {
    if (activeTab === 'bidding' && workRequest.quote?.id) {
      loadSubcontractorBids();
    }
  }, [activeTab, workRequest.quote?.id]);

  const loadSubcontractorBids = async () => {
    setLoadingBids(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-57095a78/v1/make-server-57095a78/quotes/${workRequest.quote?.id}/bids`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setSubcontractorBids(data.bids || []);
      }
    } catch (error) {
      console.error('Error loading bids:', error);
      toast.error('Failed to load subcontractor bids');
    } finally {
      setLoadingBids(false);
    }
  };

  // Request bids from subcontractors
  const handleRequestBids = async () => {
    if (!workRequest.quote) return;
    
    setLoading(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-57095a78/v1/make-server-57095a78/quotes/${workRequest.quote.id}/request-bids`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            workRequestId: workRequest.id,
            quoteId: workRequest.quote.id,
          }),
        }
      );

      if (response.ok) {
        toast.success('Bid requests sent to subcontractors', {
          description: 'They will be notified via email. Demo bids will appear in 2-5 seconds.',
        });
        
        // Auto-refresh bids after a delay to catch the demo bids
        setTimeout(() => {
          loadSubcontractorBids();
          toast.info('Bids received!', {
            description: 'Check the list below for new subcontractor bids'
          });
        }, 5000);
      } else {
        throw new Error('Failed to send bid requests');
      }
    } catch (error) {
      console.error('Error requesting bids:', error);
      toast.error('Failed to send bid requests');
    } finally {
      setLoading(false);
    }
  };

  // Add new material
  const addMaterial = () => {
    if (!editedQuote) return;
    const newMaterial: MaterialItem = {
      id: `m-${Date.now()}`,
      name: 'New Material',
      description: '',
      quantity: 1,
      unit: 'unit',
      unitCost: 0,
      totalCost: 0,
      category: 'General',
      visible: true,
    };
    setEditedQuote({
      ...editedQuote,
      materials: [...editedQuote.materials, newMaterial],
    });
  };

  // Update material
  const updateMaterial = (id: string, field: keyof MaterialItem, value: any) => {
    if (!editedQuote) return;
    const updated = editedQuote.materials.map((m) => {
      if (m.id === id) {
        const updatedMaterial = { ...m, [field]: value };
        if (field === 'quantity' || field === 'unitCost') {
          updatedMaterial.totalCost = updatedMaterial.quantity * updatedMaterial.unitCost;
        }
        return updatedMaterial;
      }
      return m;
    });
    recalculateTotals({ ...editedQuote, materials: updated });
  };

  // Delete material
  const deleteMaterial = (id: string) => {
    if (!editedQuote) return;
    const updated = editedQuote.materials.filter((m) => m.id !== id);
    recalculateTotals({ ...editedQuote, materials: updated });
  };

  // Add new labor
  const addLabor = () => {
    if (!editedQuote) return;
    const newLabor: LaborItem = {
      id: `l-${Date.now()}`,
      role: 'New Labor Role',
      description: '',
      hours: 0,
      hourlyRate: 0,
      totalCost: 0,
      visible: true,
    };
    setEditedQuote({
      ...editedQuote,
      labor: [...editedQuote.labor, newLabor],
    });
  };

  // Update labor
  const updateLabor = (id: string, field: keyof LaborItem, value: any) => {
    if (!editedQuote) return;
    const updated = editedQuote.labor.map((l) => {
      if (l.id === id) {
        const updatedLabor = { ...l, [field]: value };
        if (field === 'hours' || field === 'hourlyRate') {
          updatedLabor.totalCost = updatedLabor.hours * updatedLabor.hourlyRate;
        }
        return updatedLabor;
      }
      return l;
    });
    recalculateTotals({ ...editedQuote, labor: updated });
  };

  // Delete labor
  const deleteLabor = (id: string) => {
    if (!editedQuote) return;
    const updated = editedQuote.labor.filter((l) => l.id !== id);
    recalculateTotals({ ...editedQuote, labor: updated });
  };

  // Add new process step
  const addProcessStep = () => {
    if (!editedQuote) return;
    const newStep: ProcessStep = {
      id: `s-${Date.now()}`,
      stepNumber: editedQuote.processSteps.length + 1,
      title: 'New Step',
      description: '',
      estimatedDuration: '1 day',
      visible: true,
    };
    setEditedQuote({
      ...editedQuote,
      processSteps: [...editedQuote.processSteps, newStep],
    });
  };

  // Update process step
  const updateProcessStep = (id: string, field: keyof ProcessStep, value: any) => {
    if (!editedQuote) return;
    const updated = editedQuote.processSteps.map((s) =>
      s.id === id ? { ...s, [field]: value } : s
    );
    setEditedQuote({ ...editedQuote, processSteps: updated });
  };

  // Delete process step
  const deleteProcessStep = (id: string) => {
    if (!editedQuote) return;
    const updated = editedQuote.processSteps
      .filter((s) => s.id !== id)
      .map((s, index) => ({ ...s, stepNumber: index + 1 }));
    setEditedQuote({ ...editedQuote, processSteps: updated });
  };

  // Materials Hub Integration Functions
  const searchMaterialsHub = () => {
    const results = materialsHubService.searchMaterials(materialsHubSearch, {
      category: materialsHubCategory !== 'all' ? materialsHubCategory : undefined,
    });
    setMaterialsHubResults(results);
  };

  useEffect(() => {
    if (showMaterialsHub) {
      searchMaterialsHub();
    }
  }, [materialsHubSearch, materialsHubCategory, showMaterialsHub]);

  const replaceMaterialWithHubProduct = (hubMaterial: Material, originalMaterialId: string) => {
    if (!editedQuote) return;
    
    const originalMaterial = editedQuote.materials.find(m => m.id === originalMaterialId);
    if (!originalMaterial) return;

    const updated = editedQuote.materials.map((m) => {
      if (m.id === originalMaterialId) {
        return {
          ...m,
          name: hubMaterial.name,
          description: hubMaterial.description || m.description,
          unitCost: hubMaterial.basePrice,
          totalCost: m.quantity * hubMaterial.basePrice,
          supplier: hubMaterial.vendorName || hubMaterial.manufacturer,
          manufacturer: hubMaterial.manufacturer,
          category: hubMaterial.category,
        };
      }
      return m;
    });

    recalculateTotals({ ...editedQuote, materials: updated });
    toast.success(`Replaced with ${hubMaterial.name}`);
    setReplacingMaterialId(null);
  };

  const addMaterialFromHub = (hubMaterial: Material) => {
    if (!editedQuote) return;
    
    const newMaterial: MaterialItem = {
      id: `m-${Date.now()}`,
      name: hubMaterial.name,
      description: hubMaterial.description || '',
      quantity: 1,
      unit: hubMaterial.unit,
      unitCost: hubMaterial.basePrice,
      totalCost: hubMaterial.basePrice,
      supplier: hubMaterial.vendorName || hubMaterial.manufacturer,
      manufacturer: hubMaterial.manufacturer,
      category: hubMaterial.category,
      visible: true,
    };

    setEditedQuote({
      ...editedQuote,
      materials: [...editedQuote.materials, newMaterial],
    });
    
    recalculateTotals({
      ...editedQuote,
      materials: [...editedQuote.materials, newMaterial],
    });

    toast.success(`Added ${hubMaterial.name} to quote`);
  };

  // Schedule Builder Functions
  const addScheduleTask = () => {
    const newTask: ScheduleTask = {
      id: `task-${Date.now()}`,
      title: 'New Task',
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      duration: 7,
      status: 'not-started',
      color: '#3b82f6',
    };
    setProjectSchedule([...projectSchedule, newTask]);
  };

  const updateScheduleTask = (id: string, field: keyof ScheduleTask, value: any) => {
    setProjectSchedule(projectSchedule.map(task => {
      if (task.id === id) {
        const updated = { ...task, [field]: value };
        
        // Auto-calculate duration when dates change
        if (field === 'startDate' || field === 'endDate') {
          const start = new Date(field === 'startDate' ? value : task.startDate);
          const end = new Date(field === 'endDate' ? value : task.endDate);
          const diffTime = Math.abs(end.getTime() - start.getTime());
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          updated.duration = diffDays;
        }
        
        return updated;
      }
      return task;
    }));
  };

  const deleteScheduleTask = (id: string) => {
    setProjectSchedule(projectSchedule.filter(task => task.id !== id));
    toast.info('Task removed from schedule');
  };

  const generateScheduleFromProcessSteps = () => {
    if (!editedQuote) return;
    
    const tasks: ScheduleTask[] = [];
    let currentDate = new Date();
    
    editedQuote.processSteps.forEach((step, index) => {
      const duration = parseInt(step.estimatedDuration) || 1;
      const endDate = new Date(currentDate);
      endDate.setDate(endDate.getDate() + duration);
      
      tasks.push({
        id: `task-${step.id}`,
        title: step.title,
        startDate: currentDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
        duration: duration,
        status: 'not-started',
        color: index % 2 === 0 ? '#3b82f6' : '#8b5cf6',
      });
      
      currentDate = new Date(endDate);
      currentDate.setDate(currentDate.getDate() + 1); // 1 day buffer
    });
    
    setProjectSchedule(tasks);
    toast.success('Schedule generated from process steps');
  };

  const exportScheduleToCalendar = () => {
    toast.success('Schedule ready for Master Scheduling', {
      description: `${projectSchedule.length} tasks prepared for scheduling system`,
    });
    // This would integrate with the MasterScheduling page
    // For now, we'll store it in localStorage for the scheduling system to pick up
    localStorage.setItem('pending_project_schedule', JSON.stringify({
      workRequestId: workRequest.id,
      quoteNumber: currentQuote?.quoteNumber,
      projectTitle: workRequest.title,
      tasks: projectSchedule,
    }));
  };

  // Recalculate quote totals
  const recalculateTotals = (quote: Quote) => {
    const materialsSubtotal = quote.materials.reduce((sum, m) => sum + m.totalCost, 0);
    const laborSubtotal = quote.labor.reduce((sum, l) => sum + l.totalCost, 0);
    const taxAmount = materialsSubtotal * quote.taxRate;
    const totalCost = materialsSubtotal + laborSubtotal + taxAmount;

    setEditedQuote({
      ...quote,
      materialsSubtotal,
      laborSubtotal,
      taxAmount,
      totalCost,
    });
  };

  // Save quote changes to backend
  const handleSaveQuote = async () => {
    if (!editedQuote) return;

    setLoading(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-57095a78/v1/make-server-57095a78/quotes/${editedQuote.id}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            materials: editedQuote.materials,
            labor: editedQuote.labor,
            processSteps: editedQuote.processSteps,
            materialsSubtotal: editedQuote.materialsSubtotal,
            laborSubtotal: editedQuote.laborSubtotal,
            taxRate: editedQuote.taxRate,
            taxAmount: editedQuote.taxAmount,
            totalCost: editedQuote.totalCost,
          }),
        }
      );

      if (response.ok) {
        toast.success('Quote updated successfully');
        onSave({ ...workRequest, quote: editedQuote });
        setEditMode(false);
      } else {
        throw new Error('Failed to update quote');
      }
    } catch (error) {
      console.error('Error saving quote:', error);
      toast.error('Failed to save quote');
    } finally {
      setLoading(false);
    }
  };

  // Send quote to customer for approval
  const handleSendToCustomer = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-57095a78/v1/make-server-57095a78/quotes/${workRequest.quote?.id}/send-to-customer`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            customerEmail: workRequest.customerEmail,
            customerName: workRequest.customerName,
            message: 'Please review and approve this quote.'
          }),
        }
      );

      if (response.ok) {
        toast.success('Quote sent to customer', {
          description: `Email sent to ${workRequest.customerEmail}`,
        });
        onSendToCustomer(workRequest);
      } else {
        throw new Error('Failed to send quote');
      }
    } catch (error) {
      console.error('Error sending quote:', error);
      toast.error('Failed to send quote to customer');
    } finally {
      setLoading(false);
    }
  };

  if (!currentQuote) {
    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="bg-gradient-to-br from-[#1a1a1a] to-[#0d0d0d] border border-gray-800 rounded-2xl p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <AlertCircle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">No Quote Available</h3>
            <p className="text-gray-400 mb-6">
              This work request doesn't have a quote yet. Generate one first.
            </p>
            <button
              onClick={onClose}
              className="px-6 py-2 bg-black border border-[#ea580c]/50 hover:border-[#ea580c] hover:shadow-[0_0_15px_rgba(234,88,12,0.5)] text-[#ea580c] rounded-lg font-semibold transition-all"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-gradient-to-br from-[#1a1a1a] to-[#0d0d0d] border border-gray-800 rounded-2xl max-w-7xl w-full my-8">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-800">
          <div className="flex items-center gap-4">
            <FileText className="w-8 h-8 text-[#ea580c]" />
            <div>
              <h2 className="text-2xl font-bold text-white">Quote Editor</h2>
              <p className="text-gray-400 text-sm">
                {workRequest.requestNumber} - {workRequest.customerName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/5 rounded-lg transition-colors"
          >
            <X className="w-6 h-6 text-gray-400" />
          </button>
        </div>

        {/* Main Tabs */}
        <div className="border-b border-gray-800">
          <div className="flex gap-2 p-4">
            <button
              onClick={() => setActiveTab('quote')}
              className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all ${
                activeTab === 'quote'
                  ? 'bg-[#ea580c] text-white'
                  : 'bg-black border border-gray-700 text-gray-400 hover:text-white hover:border-gray-600'
              }`}
            >
              <FileText className="w-5 h-5" />
              Quote Details
            </button>
            <button
              onClick={() => setActiveTab('bidding')}
              className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all ${
                activeTab === 'bidding'
                  ? 'bg-[#ea580c] text-white'
                  : 'bg-black border border-gray-700 text-gray-400 hover:text-white hover:border-gray-600'
              }`}
            >
              <Award className="w-5 h-5" />
              Subcontractor Bids
              {subcontractorBids.length > 0 && (
                <span className="bg-green-500 text-white text-xs px-2 py-0.5 rounded-full">
                  {subcontractorBids.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('approval')}
              className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all ${
                activeTab === 'approval'
                  ? 'bg-[#ea580c] text-white'
                  : 'bg-black border border-gray-700 text-gray-400 hover:text-white hover:border-gray-600'
              }`}
            >
              <CheckCircle2 className="w-5 h-5" />
              Customer Approval
              {currentQuote.approvalStatus === 'approved' && (
                <span className="bg-green-500 text-white text-xs px-2 py-0.5 rounded-full">
                  Approved
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div className="p-6 max-h-[calc(100vh-300px)] overflow-y-auto">
          {/* QUOTE DETAILS TAB */}
          {activeTab === 'quote' && (
            <div className="space-y-6">
              {/* Quote Header */}
              <div className="bg-black/40 border border-gray-700 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-white mb-1">
                      Quote {currentQuote.quoteNumber}
                    </h3>
                    <p className="text-gray-400 text-sm">
                      Generated: {new Date(currentQuote.generatedAt).toLocaleDateString()}
                    </p>
                  </div>
                  {!editMode ? (
                    <button
                      onClick={() => setEditMode(true)}
                      className="flex items-center gap-2 px-4 py-2 bg-black border border-blue-500/50 hover:border-blue-500 hover:shadow-[0_0_15px_rgba(59,130,246,0.5)] text-blue-400 rounded-lg font-semibold transition-all"
                    >
                      <Edit2 className="w-4 h-4" />
                      Edit Quote
                    </button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setEditMode(false)}
                        className="px-4 py-2 bg-black border border-gray-600 hover:border-gray-500 text-gray-400 hover:text-white rounded-lg font-semibold transition-all"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSaveQuote}
                        disabled={loading}
                        className="flex items-center gap-2 px-4 py-2 bg-black border border-green-500/50 hover:border-green-500 hover:shadow-[0_0_15px_rgba(34,197,94,0.5)] text-green-400 rounded-lg font-semibold transition-all disabled:opacity-50"
                      >
                        {loading ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Save className="w-4 h-4" />
                        )}
                        Save Changes
                      </button>
                    </div>
                  )}
                </div>

                {/* Quote Summary */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 border border-blue-500/30 rounded-lg p-4">
                    <div className="text-blue-400 text-sm mb-1">Materials</div>
                    <div className="text-2xl font-bold text-white">
                      ${currentQuote.materialsSubtotal.toLocaleString()}
                    </div>
                  </div>
                  <div className="bg-gradient-to-br from-purple-500/10 to-purple-600/10 border border-purple-500/30 rounded-lg p-4">
                    <div className="text-purple-400 text-sm mb-1">Labor</div>
                    <div className="text-2xl font-bold text-white">
                      ${currentQuote.laborSubtotal.toLocaleString()}
                    </div>
                  </div>
                  <div className="bg-gradient-to-br from-[#ea580c]/10 to-[#fb923c]/10 border border-[#ea580c]/30 rounded-lg p-4">
                    <div className="text-[#ea580c] text-sm mb-1">Total</div>
                    <div className="text-2xl font-bold text-white">
                      ${currentQuote.totalCost.toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>

              {/* Quote Edit Tabs */}
              {editMode && (
                <div className="flex gap-2 mb-4">
                  <button
                    onClick={() => setQuoteEditTab('materials')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-all ${
                      quoteEditTab === 'materials'
                        ? 'bg-blue-500/20 text-blue-400 border border-blue-500/50'
                        : 'bg-black border border-gray-700 text-gray-400 hover:text-white'
                    }`}
                  >
                    <Package className="w-4 h-4" />
                    Materials ({currentQuote.materials.length})
                  </button>
                  <button
                    onClick={() => setQuoteEditTab('labor')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-all ${
                      quoteEditTab === 'labor'
                        ? 'bg-purple-500/20 text-purple-400 border border-purple-500/50'
                        : 'bg-black border border-gray-700 text-gray-400 hover:text-white'
                    }`}
                  >
                    <Users className="w-4 h-4" />
                    Labor ({currentQuote.labor.length})
                  </button>
                  <button
                    onClick={() => setQuoteEditTab('process')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-all ${
                      quoteEditTab === 'process'
                        ? 'bg-green-500/20 text-green-400 border border-green-500/50'
                        : 'bg-black border border-gray-700 text-gray-400 hover:text-white'
                    }`}
                  >
                    <ListChecks className="w-4 h-4" />
                    Process ({currentQuote.processSteps.length})
                  </button>
                </div>
              )}

              {/* Materials Section */}
              {(!editMode || quoteEditTab === 'materials') && (
                <div className="bg-black/40 border border-gray-700 rounded-xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-lg font-bold text-white flex items-center gap-2">
                      <Package className="w-5 h-5 text-blue-400" />
                      Materials
                    </h4>
                    {editMode && (
                      <button
                        onClick={addMaterial}
                        className="flex items-center gap-2 px-3 py-1.5 bg-black border border-blue-500/50 hover:border-blue-500 hover:shadow-[0_0_10px_rgba(59,130,246,0.3)] text-blue-400 rounded-lg text-sm font-semibold transition-all"
                      >
                        <Plus className="w-4 h-4" />
                        Add Material
                      </button>
                    )}
                  </div>
                  <div className="space-y-3">
                    {currentQuote.materials.map((material) => (
                      <div
                        key={material.id}
                        className="bg-gradient-to-r from-[#0A0A0A] to-[#1a1a1a] border border-gray-700 rounded-lg p-4"
                      >
                        {editMode ? (
                          <div className="grid grid-cols-6 gap-3">
                            <input
                              type="text"
                              value={material.name}
                              onChange={(e) => updateMaterial(material.id, 'name', e.target.value)}
                              className="col-span-2 bg-black border border-gray-600 rounded px-3 py-2 text-white text-sm"
                              placeholder="Material name"
                            />
                            <input
                              type="number"
                              value={material.quantity}
                              onChange={(e) => updateMaterial(material.id, 'quantity', Number(e.target.value))}
                              className="bg-black border border-gray-600 rounded px-3 py-2 text-white text-sm"
                              placeholder="Qty"
                            />
                            <input
                              type="text"
                              value={material.unit}
                              onChange={(e) => updateMaterial(material.id, 'unit', e.target.value)}
                              className="bg-black border border-gray-600 rounded px-3 py-2 text-white text-sm"
                              placeholder="Unit"
                            />
                            <input
                              type="number"
                              value={material.unitCost}
                              onChange={(e) => updateMaterial(material.id, 'unitCost', Number(e.target.value))}
                              className="bg-black border border-gray-600 rounded px-3 py-2 text-white text-sm"
                              placeholder="Unit $"
                            />
                            <div className="flex items-center gap-2">
                              <div className="text-white font-semibold">
                                ${(material.totalCost || material.totalPrice || 0).toFixed(2)}
                              </div>
                              <button
                                onClick={() => deleteMaterial(material.id)}
                                className="p-1.5 bg-black border border-red-500/50 hover:border-red-500 hover:shadow-[0_0_10px_rgba(239,68,68,0.3)] text-red-400 rounded transition-all"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="font-semibold text-white">{material.name || material.description}</div>
                              <div className="text-sm text-gray-400">
                                {material.quantity} {material.unit} × ${(material.unitCost || material.unitPrice || 0).toFixed(2)}
                              </div>
                            </div>
                            <div className="text-lg font-bold text-blue-400">
                              ${(material.totalCost || material.totalPrice || 0).toFixed(2)}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Labor Section */}
              {(!editMode || quoteEditTab === 'labor') && (
                <div className="bg-black/40 border border-gray-700 rounded-xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-lg font-bold text-white flex items-center gap-2">
                      <Users className="w-5 h-5 text-purple-400" />
                      Labor
                    </h4>
                    {editMode && (
                      <button
                        onClick={addLabor}
                        className="flex items-center gap-2 px-3 py-1.5 bg-black border border-purple-500/50 hover:border-purple-500 hover:shadow-[0_0_10px_rgba(168,85,247,0.3)] text-purple-400 rounded-lg text-sm font-semibold transition-all"
                      >
                        <Plus className="w-4 h-4" />
                        Add Labor
                      </button>
                    )}
                  </div>
                  <div className="space-y-3">
                    {currentQuote.labor.map((labor) => (
                      <div
                        key={labor.id}
                        className="bg-gradient-to-r from-[#0A0A0A] to-[#1a1a1a] border border-gray-700 rounded-lg p-4"
                      >
                        {editMode ? (
                          <div className="grid grid-cols-5 gap-3">
                            <input
                              type="text"
                              value={labor.role}
                              onChange={(e) => updateLabor(labor.id, 'role', e.target.value)}
                              className="col-span-2 bg-black border border-gray-600 rounded px-3 py-2 text-white text-sm"
                              placeholder="Labor role"
                            />
                            <input
                              type="number"
                              value={labor.hours}
                              onChange={(e) => updateLabor(labor.id, 'hours', Number(e.target.value))}
                              className="bg-black border border-gray-600 rounded px-3 py-2 text-white text-sm"
                              placeholder="Hours"
                            />
                            <input
                              type="number"
                              value={labor.hourlyRate}
                              onChange={(e) => updateLabor(labor.id, 'hourlyRate', Number(e.target.value))}
                              className="bg-black border border-gray-600 rounded px-3 py-2 text-white text-sm"
                              placeholder="Rate"
                            />
                            <div className="flex items-center gap-2">
                              <div className="text-white font-semibold">
                                ${(labor.totalCost || labor.totalPrice || 0).toFixed(2)}
                              </div>
                              <button
                                onClick={() => deleteLabor(labor.id)}
                                className="p-1.5 bg-black border border-red-500/50 hover:border-red-500 hover:shadow-[0_0_10px_rgba(239,68,68,0.3)] text-red-400 rounded transition-all"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="font-semibold text-white">{labor.role || labor.description}</div>
                              <div className="text-sm text-gray-400">
                                {labor.hours} hours × ${(labor.hourlyRate || labor.unitPrice || 0).toFixed(2)}/hr
                              </div>
                            </div>
                            <div className="text-lg font-bold text-purple-400">
                              ${(labor.totalCost || labor.totalPrice || 0).toFixed(2)}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Process Steps Section */}
              {(!editMode || quoteEditTab === 'process') && (
                <div className="bg-black/40 border border-gray-700 rounded-xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-lg font-bold text-white flex items-center gap-2">
                      <ListChecks className="w-5 h-5 text-green-400" />
                      Process Steps
                    </h4>
                    {editMode && (
                      <button
                        onClick={addProcessStep}
                        className="flex items-center gap-2 px-3 py-1.5 bg-black border border-green-500/50 hover:border-green-500 hover:shadow-[0_0_10px_rgba(34,197,94,0.3)] text-green-400 rounded-lg text-sm font-semibold transition-all"
                      >
                        <Plus className="w-4 h-4" />
                        Add Step
                      </button>
                    )}
                  </div>
                  <div className="space-y-3">
                    {currentQuote.processSteps.map((step, index) => (
                      <div
                        key={step.id}
                        className="bg-gradient-to-r from-[#0A0A0A] to-[#1a1a1a] border border-gray-700 rounded-lg p-4"
                      >
                        {editMode ? (
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-green-500/20 border border-green-500/50 flex items-center justify-center text-green-400 font-bold">
                                {index + 1}
                              </div>
                              <input
                                type="text"
                                value={step.title}
                                onChange={(e) => updateProcessStep(step.id, 'title', e.target.value)}
                                className="flex-1 bg-black border border-gray-600 rounded px-3 py-2 text-white"
                                placeholder="Step title"
                              />
                              <input
                                type="text"
                                value={step.estimatedDuration}
                                onChange={(e) => updateProcessStep(step.id, 'estimatedDuration', e.target.value)}
                                className="w-32 bg-black border border-gray-600 rounded px-3 py-2 text-white text-sm"
                                placeholder="Duration"
                              />
                              <button
                                onClick={() => deleteProcessStep(step.id)}
                                className="p-2 bg-black border border-red-500/50 hover:border-red-500 hover:shadow-[0_0_10px_rgba(239,68,68,0.3)] text-red-400 rounded transition-all"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                            <textarea
                              value={step.description}
                              onChange={(e) => updateProcessStep(step.id, 'description', e.target.value)}
                              className="w-full bg-black border border-gray-600 rounded px-3 py-2 text-white text-sm"
                              placeholder="Step description"
                              rows={2}
                            />
                          </div>
                        ) : (
                          <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-full bg-green-500/20 border border-green-500/50 flex items-center justify-center text-green-400 font-bold flex-shrink-0">
                              {index + 1}
                            </div>
                            <div className="flex-1">
                              <div className="font-semibold text-white mb-1">{step.title}</div>
                              <div className="text-sm text-gray-400">{step.description}</div>
                            </div>
                            <div className="text-sm text-gray-500 flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              {step.estimatedDuration}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Materials Hub & Schedule Builder - Only in Process Tab when editing */}
              {(!editMode || quoteEditTab === 'process') && editMode && editedQuote && (
                <QuoteProcessEnhancements
                  materials={editedQuote.materials}
                  processSteps={editedQuote.processSteps}
                  onMaterialsUpdate={(updatedMaterials) => {
                    const updated = { ...editedQuote, materials: updatedMaterials };
                    recalculateTotals(updated);
                  }}
                  workRequestId={workRequest.id}
                  quoteNumber={editedQuote.quoteNumber}
                  projectTitle={workRequest.title}
                />
              )}
            </div>
          )}

          {/* SUBCONTRACTOR BIDDING TAB */}
          {activeTab === 'bidding' && (
            <div className="space-y-6">
              <div className="bg-black/40 border border-gray-700 rounded-xl p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-xl font-bold text-white mb-1">Subcontractor Bids</h3>
                    <p className="text-gray-400 text-sm">
                      Request and manage bids from qualified subcontractors
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {subcontractorBids.length > 0 && (
                      <button
                        onClick={loadSubcontractorBids}
                        disabled={loadingBids}
                        className="flex items-center gap-2 px-4 py-2 bg-black border border-blue-500/50 hover:border-blue-500 hover:shadow-[0_0_15px_rgba(59,130,246,0.5)] text-blue-400 rounded-lg font-semibold transition-all disabled:opacity-50"
                      >
                        {loadingBids ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Recycle className="w-4 h-4" />
                        )}
                        Refresh
                      </button>
                    )}
                    <button
                      onClick={handleRequestBids}
                      disabled={loading}
                      className="flex items-center gap-2 px-4 py-2 bg-black border border-[#ea580c]/50 hover:border-[#ea580c] hover:shadow-[0_0_15px_rgba(234,88,12,0.5)] text-[#ea580c] rounded-lg font-semibold transition-all disabled:opacity-50"
                    >
                      {loading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                      Request Bids
                    </button>
                  </div>
                </div>

                {loadingBids ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 text-[#ea580c] animate-spin" />
                  </div>
                ) : subcontractorBids.length === 0 ? (
                  <div className="text-center py-12 border-2 border-dashed border-gray-700 rounded-lg">
                    <Award className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-400 text-lg mb-2">No bids received yet</p>
                    <p className="text-gray-600 text-sm">
                      Click "Request Bids" to invite subcontractors
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {subcontractorBids.map((bid) => (
                      <div
                        key={bid.id}
                        className="bg-gradient-to-r from-[#0A0A0A] to-[#1a1a1a] border border-gray-700 rounded-lg p-4"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-start gap-3">
                            <div className="w-12 h-12 rounded-full bg-[#ea580c]/20 border border-[#ea580c]/50 flex items-center justify-center">
                              <Building2 className="w-6 h-6 text-[#ea580c]" />
                            </div>
                            <div>
                              <div className="font-bold text-white">{bid.subcontractorName}</div>
                              <div className="text-sm text-gray-400">{bid.company}</div>
                              <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                                <span className="flex items-center gap-1">
                                  <Mail className="w-3 h-3" />
                                  {bid.subcontractorEmail}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Phone className="w-3 h-3" />
                                  {bid.subcontractorPhone}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-bold text-[#ea580c]">
                              ${bid.bidAmount.toLocaleString()}
                            </div>
                            <div className="text-xs text-gray-500 flex items-center gap-1 justify-end mt-1">
                              <Clock className="w-3 h-3" />
                              {bid.estimatedDuration}
                            </div>
                          </div>
                        </div>
                        {bid.notes && (
                          <div className="bg-black/50 rounded p-3 mb-3">
                            <div className="text-xs text-gray-500 mb-1">Notes:</div>
                            <div className="text-sm text-gray-300">{bid.notes}</div>
                          </div>
                        )}
                        <div className="flex items-center justify-between pt-3 border-t border-gray-700">
                          <div className="text-xs text-gray-500">
                            Submitted: {new Date(bid.submittedAt).toLocaleString()}
                          </div>
                          <div className="flex items-center gap-2">
                            <button className="flex items-center gap-1 px-3 py-1.5 bg-black border border-green-500/50 hover:border-green-500 hover:shadow-[0_0_10px_rgba(34,197,94,0.3)] text-green-400 rounded text-sm font-semibold transition-all">
                              <ThumbsUp className="w-3 h-3" />
                              Accept
                            </button>
                            <button className="flex items-center gap-1 px-3 py-1.5 bg-black border border-red-500/50 hover:border-red-500 hover:shadow-[0_0_10px_rgba(239,68,68,0.3)] text-red-400 rounded text-sm font-semibold transition-all">
                              <ThumbsDown className="w-3 h-3" />
                              Decline
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* CUSTOMER APPROVAL TAB */}
          {activeTab === 'approval' && (
            <div className="space-y-6">
              <div className="bg-black/40 border border-gray-700 rounded-xl p-6">
                <h3 className="text-xl font-bold text-white mb-6">Customer Approval Status</h3>

                {/* Approval Status Card */}
                <div
                  className={`rounded-xl p-6 mb-6 border-2 ${
                    currentQuote.approvalStatus === 'approved'
                      ? 'bg-green-500/10 border-green-500/50'
                      : currentQuote.approvalStatus === 'rejected'
                      ? 'bg-red-500/10 border-red-500/50'
                      : 'bg-yellow-500/10 border-yellow-500/50'
                  }`}
                >
                  <div className="flex items-center gap-4 mb-4">
                    {currentQuote.approvalStatus === 'approved' ? (
                      <CheckCircle2 className="w-12 h-12 text-green-400" />
                    ) : currentQuote.approvalStatus === 'rejected' ? (
                      <XCircle className="w-12 h-12 text-red-400" />
                    ) : (
                      <Clock className="w-12 h-12 text-yellow-400" />
                    )}
                    <div>
                      <div className="text-2xl font-bold text-white capitalize">
                        {currentQuote.approvalStatus.replace('-', ' ')}
                      </div>
                      {currentQuote.approvedAt && (
                        <div className="text-sm text-gray-400">
                          {new Date(currentQuote.approvedAt).toLocaleString()}
                        </div>
                      )}
                    </div>
                  </div>

                  {currentQuote.approvalStatus === 'rejected' && currentQuote.rejectionReason && (
                    <div className="bg-black/50 rounded-lg p-4">
                      <div className="text-sm text-gray-400 mb-1">Rejection Reason:</div>
                      <div className="text-white">{currentQuote.rejectionReason}</div>
                    </div>
                  )}
                </div>

                {/* Customer Info */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-gradient-to-br from-[#0A0A0A] to-[#1a1a1a] border border-gray-700 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Mail className="w-4 h-4 text-[#ea580c]" />
                      <div className="text-sm text-gray-400">Email</div>
                    </div>
                    <div className="text-white font-semibold">{workRequest.customerEmail}</div>
                  </div>
                  {workRequest.customerPhone && (
                    <div className="bg-gradient-to-br from-[#0A0A0A] to-[#1a1a1a] border border-gray-700 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Phone className="w-4 h-4 text-[#ea580c]" />
                        <div className="text-sm text-gray-400">Phone</div>
                      </div>
                      <div className="text-white font-semibold">{workRequest.customerPhone}</div>
                    </div>
                  )}
                </div>

                {/* Actions */}
                {currentQuote.approvalStatus === 'pending' && (
                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleSendToCustomer}
                      disabled={loading}
                      className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-black border border-[#ea580c]/50 hover:border-[#ea580c] hover:shadow-[0_0_15px_rgba(234,88,12,0.5)] text-[#ea580c] rounded-lg font-semibold transition-all disabled:opacity-50"
                    >
                      {loading ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <Send className="w-5 h-5" />
                      )}
                      Send to Customer
                    </button>
                  </div>
                )}

                {currentQuote.approvalStatus === 'approved' && (
                  <>
                    {/* Contract Type Selection */}
                    {!currentQuote.contractTypeSelected ? (
                      <div className="space-y-4">
                        <div className="bg-gradient-to-br from-purple-500/10 to-blue-500/10 border-2 border-purple-500/50 rounded-xl p-6">
                          <div className="flex items-center gap-3 mb-4">
                            <Sparkles className="w-8 h-8 text-purple-400" />
                            <div>
                              <h4 className="text-xl font-bold text-white">Choose Contract Type</h4>
                              <p className="text-sm text-gray-400">Customer must select their preferred contract type</p>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4">
                            {/* Standard Contract */}
                            <button
                              onClick={() => {
                                const updated = {
                                  ...currentQuote,
                                  contractTypeSelected: true,
                                  selectedContractType: 'standard' as const
                                };
                                setEditedQuote(updated);
                                onSave({ ...workRequest, quote: updated });
                                toast.success('Standard Contract selected', {
                                  description: 'Traditional contract with manual milestone tracking'
                                });
                              }}
                              className="group bg-gradient-to-br from-blue-500/10 to-blue-600/10 border-2 border-blue-500/50 hover:border-blue-400 hover:shadow-[0_0_20px_rgba(59,130,246,0.4)] rounded-xl p-6 transition-all"
                            >
                              <div className="flex flex-col items-center text-center">
                                <FileText className="w-16 h-16 text-blue-400 mb-4 group-hover:scale-110 transition-transform" />
                                <h5 className="text-lg font-bold text-white mb-2">Standard Contract</h5>
                                <p className="text-sm text-gray-400 mb-4">
                                  Traditional legal contract with manual payment processing and milestone tracking
                                </p>
                                <ul className="text-xs text-gray-500 space-y-1 text-left w-full">
                                  <li className="flex items-start gap-2">
                                    <CheckCircle2 className="w-3 h-3 text-blue-400 mt-0.5 flex-shrink-0" />
                                    <span>Traditional payment terms</span>
                                  </li>
                                  <li className="flex items-start gap-2">
                                    <CheckCircle2 className="w-3 h-3 text-blue-400 mt-0.5 flex-shrink-0" />
                                    <span>Manual invoice processing</span>
                                  </li>
                                  <li className="flex items-start gap-2">
                                    <CheckCircle2 className="w-3 h-3 text-blue-400 mt-0.5 flex-shrink-0" />
                                    <span>PDF contract generation</span>
                                  </li>
                                  <li className="flex items-start gap-2">
                                    <CheckCircle2 className="w-3 h-3 text-blue-400 mt-0.5 flex-shrink-0" />
                                    <span>Standard signature process</span>
                                  </li>
                                </ul>
                              </div>
                            </button>

                            {/* Soroban Smart Contract */}
                            <button
                              onClick={() => {
                                const updated = {
                                  ...currentQuote,
                                  contractTypeSelected: true,
                                  selectedContractType: 'soroban-smart-contract' as const
                                };
                                setEditedQuote(updated);
                                onSave({ ...workRequest, quote: updated });
                                toast.success('Soroban Smart Contract selected', {
                                  description: 'Blockchain-powered contract with automated escrow and payments'
                                });
                              }}
                              className="group bg-gradient-to-br from-purple-500/10 to-purple-600/10 border-2 border-purple-500/50 hover:border-purple-400 hover:shadow-[0_0_20px_rgba(168,85,247,0.4)] rounded-xl p-6 transition-all relative overflow-hidden"
                            >
                              <div className="absolute top-2 right-2">
                                <span className="px-2 py-1 bg-purple-500 text-white text-xs font-bold rounded-full">
                                  BLOCKCHAIN
                                </span>
                              </div>
                              <div className="flex flex-col items-center text-center">
                                <Sparkles className="w-16 h-16 text-purple-400 mb-4 group-hover:scale-110 transition-transform" />
                                <h5 className="text-lg font-bold text-white mb-2">Soroban Smart Contract</h5>
                                <p className="text-sm text-gray-400 mb-4">
                                  Blockchain-based contract on Stellar network with automated escrow and milestone payments
                                </p>
                                <ul className="text-xs text-gray-500 space-y-1 text-left w-full">
                                  <li className="flex items-start gap-2">
                                    <CheckCircle2 className="w-3 h-3 text-purple-400 mt-0.5 flex-shrink-0" />
                                    <span>Automated payment milestones</span>
                                  </li>
                                  <li className="flex items-start gap-2">
                                    <CheckCircle2 className="w-3 h-3 text-purple-400 mt-0.5 flex-shrink-0" />
                                    <span>Blockchain escrow protection</span>
                                  </li>
                                  <li className="flex items-start gap-2">
                                    <CheckCircle2 className="w-3 h-3 text-purple-400 mt-0.5 flex-shrink-0" />
                                    <span>IPFS evidence storage</span>
                                  </li>
                                  <li className="flex items-start gap-2">
                                    <CheckCircle2 className="w-3 h-3 text-purple-400 mt-0.5 flex-shrink-0" />
                                    <span>Multi-sig dispute resolution</span>
                                  </li>
                                  <li className="flex items-start gap-2">
                                    <CheckCircle2 className="w-3 h-3 text-purple-400 mt-0.5 flex-shrink-0" />
                                    <span>Recorded on Stellar blockchain</span>
                                  </li>
                                </ul>
                              </div>
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {/* Contract Type Selected */}
                        <div className={`rounded-xl p-4 border-2 ${
                          currentQuote.selectedContractType === 'soroban-smart-contract'
                            ? 'bg-purple-500/10 border-purple-500/50'
                            : 'bg-blue-500/10 border-blue-500/50'
                        }`}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              {currentQuote.selectedContractType === 'soroban-smart-contract' ? (
                                <Sparkles className="w-8 h-8 text-purple-400" />
                              ) : (
                                <FileText className="w-8 h-8 text-blue-400" />
                              )}
                              <div>
                                <div className="text-sm text-gray-400">Selected Contract Type</div>
                                <div className="text-lg font-bold text-white">
                                  {currentQuote.selectedContractType === 'soroban-smart-contract'
                                    ? 'Soroban Smart Contract'
                                    : 'Standard Contract'}
                                </div>
                              </div>
                            </div>
                            <button
                              onClick={() => {
                                const updated = {
                                  ...currentQuote,
                                  contractTypeSelected: false,
                                  selectedContractType: undefined
                                };
                                setEditedQuote(updated);
                                onSave({ ...workRequest, quote: updated });
                                toast.info('Contract type deselected', {
                                  description: 'Choose a different contract type'
                                });
                              }}
                              className="px-4 py-2 bg-black border border-gray-600 hover:border-gray-500 text-gray-400 hover:text-white rounded-lg text-sm font-semibold transition-all"
                            >
                              Change
                            </button>
                          </div>
                        </div>

                        {/* Convert to Contract Button */}
                        <button
                          onClick={() => onConvertToContract(workRequest)}
                          className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-[#ea580c] to-[#fb923c] hover:from-[#c2410c] hover:to-[#ea580c] text-white rounded-lg font-semibold transition-all shadow-lg shadow-[#ea580c]/20"
                        >
                          <ArrowRight className="w-5 h-5" />
                          Generate {currentQuote.selectedContractType === 'soroban-smart-contract' ? 'Smart' : 'Standard'} Contract
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-800 p-6">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-500">
              Quote ID: {currentQuote.id}
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={onClose}
                className="px-6 py-2 bg-black border border-gray-600 hover:border-gray-500 text-gray-400 hover:text-white rounded-lg font-semibold transition-all"
              >
                Close
              </button>
              {currentQuote.approvalStatus === 'approved' && currentQuote.contractTypeSelected && (
                <button
                  onClick={() => onConvertToContract(workRequest)}
                  className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-[#ea580c] to-[#fb923c] hover:from-[#c2410c] hover:to-[#ea580c] text-white rounded-lg font-semibold transition-all shadow-lg shadow-[#ea580c]/20"
                >
                  Generate {currentQuote.selectedContractType === 'soroban-smart-contract' ? 'Smart' : 'Standard'} Contract
                  <ArrowRight className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}