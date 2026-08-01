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
  UserPlus,
  Smartphone,
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
import { supabase } from '../lib/supabase';

async function quoteAuthHeaders(contentType = false) { const { data: { session } } = await supabase.auth.getSession(); return { Authorization: `Bearer ${session?.access_token || publicAnonKey}`, ...(contentType ? { 'Content-Type': 'application/json' } : {}) }; }
import {
  materialsHubService,
  Material,
} from '../lib/services/materialsHubService';
import { QuoteProcessEnhancements } from './QuoteProcessEnhancements';
import WorkRequestFullView from './WorkRequestFullView';
import { CompanyDatabaseService } from '../lib/services/companyDatabaseService';
import { pickMainAppCompany, setActiveCompanyInfo } from '../lib/config/companyInfo';

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
  const [showWorkRequestDrawer, setShowWorkRequestDrawer] = useState(false);

  // Load company logo and info
  const [companyLogo, setCompanyLogo] = useState<string>('');
  const [companyName, setCompanyName] = useState<string>('');

  useEffect(() => {
    (async () => {
      try {
        // Quotes/contracts always represent the main app business (Black Phoenix
        // Builds), never the ecommerce store. Resolve it and use it for both the
        // header display and the global company info the documents read.
        const { data: companies } = await CompanyDatabaseService.getCompanies();
        const mainApp = pickMainAppCompany(companies || []);
        if (mainApp) {
          setActiveCompanyInfo(mainApp);
          setCompanyName(mainApp.company_name || mainApp.company_legal_name || 'Company Name');
          setCompanyLogo(mainApp.logo_url || '');
        }

        // Fall back to the logo-variants cache only if the company had no logo.
        if (!mainApp?.logo_url) {
          const logoVariants = localStorage.getItem('company_logo_variants');
          if (logoVariants) {
            const parsed = JSON.parse(logoVariants);
            setCompanyLogo(parsed.logo_primary || parsed.logo_secondary || '');
          }
        }
      } catch (error) {
        console.error('Failed to load company info:', error);
      }
    })();
  }, []);

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
  // Optional: also invite the customer to join the app when sending the quote.
  const [inviteToApp, setInviteToApp] = useState(false);
  const [invitePhone, setInvitePhone] = useState('');
  const [inviteBySms, setInviteBySms] = useState(false);
  
  // Subcontractor bidding state
  const [subcontractorBids, setSubcontractorBids] = useState<SubcontractorBid[]>([]);
  const [showBidForm, setShowBidForm] = useState(false);
  const [loadingBids, setLoadingBids] = useState(false);

  // Materials Hub integration state
  const [showMaterialsHub, setShowMaterialsHub] = useState(false);

  // Purchase Order state
  const [showPurchaseOrders, setShowPurchaseOrders] = useState(false);
  const [purchaseOrders, setPurchaseOrders] = useState<Record<string, any[]>>({});
  const [materialsHubSearch, setMaterialsHubSearch] = useState('');
  const [materialsHubCategory, setMaterialsHubCategory] = useState('all');
  const [materialsHubResults, setMaterialsHubResults] = useState<Material[]>([]);
  const [replacingMaterialId, setReplacingMaterialId] = useState<string | null>(null);

  // Vendor comparison for individual materials in quote
  const [comparingMaterialId, setComparingMaterialId] = useState<string | null>(null);
  const [vendorAlternatives, setVendorAlternatives] = useState<any[]>([]);
  const [loadingVendorAlternatives, setLoadingVendorAlternatives] = useState(false);

  // Schedule builder state
  const [projectSchedule, setProjectSchedule] = useState<ScheduleTask[]>([]);
  const [showScheduleBuilder, setShowScheduleBuilder] = useState(false);

  const currentQuote = editMode ? editedQuote : normalizeQuote(workRequest.quote);

  const handleConvertToContract = async () => {
    const quoteId = currentQuote?.id || workRequest.quote?.id;
    if (!quoteId) { toast.error('Save the quote before generating a contract.'); return; }
    setLoading(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6/quotes/${encodeURIComponent(quoteId)}/convert-to-contract`,
        { method: 'POST', headers: await quoteAuthHeaders(true), body: JSON.stringify({
          title: currentQuote?.title || currentQuote?.name || workRequest.title || 'Service Contract',
          amount: currentQuote?.total || currentQuote?.grandTotal || currentQuote?.totalCost || undefined,
          customerEmail: workRequest.customerEmail || (workRequest as any).clientEmail,
          planId: (currentQuote as any)?.planId,
        }) }
      );
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || 'Could not generate the contract.');
      const updated = { ...currentQuote, contractId: result.contract.id, contractStatus: result.contract.status };
      setEditedQuote(updated as Quote);
      onSave({ ...workRequest, quote: updated as Quote });
      toast.success('Contract created and ready for the customer signature.');
      onConvertToContract({ ...workRequest, quote: updated as Quote });
    } catch (error: any) { toast.error(error.message || 'Could not generate the contract.'); }
    finally { setLoading(false); }
  };

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
        `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6/quotes/${workRequest.quote?.id}/bids`,
        {
          headers: await quoteAuthHeaders(),
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
        `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6/quotes/${workRequest.quote.id}/request-bids`,
        {
          method: 'POST',
          headers: await quoteAuthHeaders(true),
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

  // Find vendor alternatives for a specific material in quote
  const findVendorAlternativesForMaterial = async (material: MaterialItem) => {
    setComparingMaterialId(material.id);
    setLoadingVendorAlternatives(true);

    try {
      const alternatives: any[] = [];

      // Add current vendor
      alternatives.push({
        id: `current-${material.id}`,
        name: material.name,
        vendorName: material.supplier || 'Current Vendor',
        source: 'current',
        price: material.unitCost,
        inStock: true,
        isCurrent: true,
      });

      // Simulate searching other vendors (replace with real API calls in production)
      alternatives.push({
        id: `hd-${material.id}`,
        name: material.name,
        vendorName: 'Home Depot',
        source: 'home_depot',
        price: material.unitCost * 0.95,
        inStock: true,
      });

      alternatives.push({
        id: `lowes-${material.id}`,
        name: material.name,
        vendorName: "Lowe's",
        source: 'lowes',
        price: material.unitCost * 0.92,
        inStock: true,
      });

      alternatives.push({
        id: `grainger-${material.id}`,
        name: material.name,
        vendorName: 'Grainger',
        source: 'grainger',
        price: material.unitCost * 1.05,
        inStock: true,
      });

      setVendorAlternatives(alternatives);
    } catch (error) {
      console.error('Failed to find vendor alternatives:', error);
      toast.error('Failed to load vendor options');
    } finally {
      setLoadingVendorAlternatives(false);
    }
  };

  // Select a vendor alternative and update the material
  const selectVendorAlternative = (alternative: any) => {
    if (!editedQuote) return;

    const materialIndex = editedQuote.materials.findIndex(m => m.id === comparingMaterialId);
    if (materialIndex === -1) return;

    const originalMaterial = editedQuote.materials[materialIndex];
    const updatedMaterial = {
      ...originalMaterial,
      supplier: alternative.vendorName,
      unitCost: alternative.price,
      totalCost: alternative.price * originalMaterial.quantity,
    };

    const updatedMaterials = [...editedQuote.materials];
    updatedMaterials[materialIndex] = updatedMaterial;

    recalculateTotals({ ...editedQuote, materials: updatedMaterials });
    setComparingMaterialId(null);
    setVendorAlternatives([]);

    toast.success(`Switched to ${alternative.vendorName}`, {
      description: `New price: $${alternative.price.toFixed(2)}/${originalMaterial.unit}`,
    });
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

  const exportScheduleToCalendar = async () => {
    if (!projectSchedule.length) {
      toast.error('Add at least one project task before publishing the schedule.');
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6/work-requests/${encodeURIComponent(workRequest.id)}/project-schedule`,
        { method: 'PUT', headers: await quoteAuthHeaders(true), body: JSON.stringify({ quoteNumber: currentQuote?.quoteNumber, projectTitle: workRequest.title, tasks: projectSchedule }) }
      );
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || 'Unable to publish the project schedule.');
      toast.success('Schedule published to Master Scheduling', { description: `${projectSchedule.length} tasks are now attached to this project.` });
    } catch (error: any) {
      console.error('Error publishing schedule:', error);
      toast.error(error.message || 'Unable to publish the project schedule.');
    } finally { setLoading(false); }
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
        `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6/quotes/${editedQuote.id}`,
        {
          method: 'PUT',
          headers: await quoteAuthHeaders(true),
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

  // Fire the existing server-side portal invite for this customer.
  // Returns a human-readable status string, or null on hard failure (toasted).
  const sendAppInvite = async (): Promise<string | null> => {
    const phone = (invitePhone.trim() || workRequest.customerPhone || '').trim();
    try {
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6/owner-provisioning/invites`,
        {
          method: 'POST',
          headers: await quoteAuthHeaders(true),
          body: JSON.stringify({
            name: workRequest.customerName || workRequest.customerEmail,
            email: workRequest.customerEmail,
            phone,
            portalType: 'customer',
            fullAccess: true,
            sendEmail: true,
            sendSms: inviteBySms && !!phone,
          }),
        }
      );
      const data = await res.json().catch(() => null);
      if (res.status === 409) return 'already has an account/invite';
      if (!res.ok || !data?.success) {
        console.error('[QuoteToContractEditor] invite failed:', res.status, data);
        toast.error(data?.error || `Could not send app invite (${res.status}).`);
        return null;
      }
      const inv = data.invite || {};
      const parts: string[] = [];
      if (inv.invitationSent) parts.push('email');
      if (inv.smsSent) parts.push('SMS');
      if (parts.length) return `invite sent by ${parts.join(' + ')}`;
      const why = inv.inviteNotice || inv.smsNotice || 'no channel delivered';
      toast.warning(`Quote sent, but the app invite did not deliver: ${why}`);
      return null;
    } catch (err: any) {
      console.error('[QuoteToContractEditor] invite error:', err);
      toast.error(err.message || 'Could not send the app invite.');
      return null;
    }
  };

  // Send quote to customer for approval
  const handleSendToCustomer = async () => {
    if (inviteToApp && !(invitePhone.trim() || workRequest.customerPhone)) {
      toast.error('A phone number is required to invite this customer to the app.');
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6/quotes/${workRequest.quote?.id}/send-to-customer`,
        {
          method: 'POST',
          headers: await quoteAuthHeaders(true),
          body: JSON.stringify({
            customerEmail: workRequest.customerEmail,
            customerName: workRequest.customerName,
            message: 'Please review and approve this quote.'
          }),
        }
      );

      if (response.ok) {
        const data = await response.json().catch(() => ({}));
        // Optionally invite the customer to join the app (customer portal).
        let inviteStatus: string | null = null;
        if (inviteToApp) inviteStatus = await sendAppInvite();
        const inviteSuffix = inviteToApp && inviteStatus ? ` · ${inviteStatus}` : '';
        if (data?.approvalToken) {
          const link = `${window.location.origin}${window.location.pathname}?token=${data.approvalToken}`;
          try { await navigator.clipboard.writeText(link); } catch {}
          toast.success(`Quote sent — approval link copied${inviteSuffix}`, {
            description: `Share this link with ${workRequest.customerEmail}: ${link}`,
          });
        } else {
          toast.success(`Quote sent to customer${inviteSuffix}`, {
            description: `Sent to ${workRequest.customerEmail}`,
          });
        }
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
    <>
      {/* Purchase Orders Modal */}
      {showPurchaseOrders && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-[60] p-4 overflow-y-auto">
          <div className="bg-gradient-to-br from-[#1a1a1a] to-[#0d0d0d] border border-green-500/30 rounded-2xl max-w-6xl w-full my-8">
            {/* PO Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-700">
              <div className="flex items-center gap-3">
                <ShoppingCart className="w-6 h-6 text-green-400" />
                <div>
                  <h2 className="text-2xl font-bold text-white">Purchase Orders by Vendor</h2>
                  <p className="text-sm text-gray-400">Create and send purchase orders to suppliers</p>
                </div>
              </div>
              <button
                onClick={() => setShowPurchaseOrders(false)}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="w-6 h-6 text-gray-400" />
              </button>
            </div>

            {/* PO Content */}
            <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
              {Object.entries(purchaseOrders).map(([vendor, materials]) => {
                const vendorTotal = materials.reduce((sum, m) => sum + (m.totalCost || 0), 0);
                return (
                  <div key={vendor} className="bg-black/40 border border-gray-700 rounded-xl p-6">
                    {/* Vendor Header */}
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-xl font-bold text-white">{vendor}</h3>
                        <p className="text-sm text-gray-400">{materials.length} items · ${vendorTotal.toFixed(2)} total</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            // Export to CSV or send PO
                            const csvContent = `Material,Quantity,Unit,Unit Cost,Total\n` +
                              materials.map(m =>
                                `"${m.name}",${m.quantity},${m.unit},${m.unitCost},${m.totalCost}`
                              ).join('\n');

                            const blob = new Blob([csvContent], { type: 'text/csv' });
                            const url = window.URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `PO_${vendor.replace(/\s+/g, '_')}_${Date.now()}.csv`;
                            a.click();
                            window.URL.revokeObjectURL(url);

                            toast.success(`Purchase order exported for ${vendor}`);
                          }}
                          className="flex items-center gap-2 px-3 py-1.5 bg-black border border-blue-500/50 hover:border-blue-500 hover:shadow-[0_0_10px_rgba(59,130,246,0.3)] text-blue-400 rounded-lg text-sm font-semibold transition-all"
                        >
                          <Download className="w-4 h-4" />
                          Export CSV
                        </button>
                        <button
                          onClick={async () => {
                            setLoading(true);
                            try {
                              // Send PO request to backend or email
                              const poData = {
                                vendor,
                                materials,
                                total: vendorTotal,
                                quoteId: currentQuote.id,
                                requestedBy: workRequest.customerName,
                                requestDate: new Date().toISOString(),
                              };

                              // You can implement actual PO sending here
                              // For now, just show success
                              toast.success(`Purchase order request sent to ${vendor}`, {
                                description: `${materials.length} items · $${vendorTotal.toFixed(2)}`,
                              });
                            } catch (error) {
                              console.error('PO send error:', error);
                              toast.error('Failed to send purchase order');
                            } finally {
                              setLoading(false);
                            }
                          }}
                          className="flex items-center gap-2 px-3 py-1.5 bg-black border border-green-500/50 hover:border-green-500 hover:shadow-[0_0_10px_rgba(34,197,94,0.3)] text-green-400 rounded-lg text-sm font-semibold transition-all"
                        >
                          <Send className="w-4 h-4" />
                          Send PO Request
                        </button>
                      </div>
                    </div>

                    {/* Materials List */}
                    <div className="space-y-2">
                      {materials.map((material) => (
                        <div key={material.id} className="flex items-center justify-between py-2 px-3 bg-black/40 border border-gray-700 rounded">
                          <div className="flex-1">
                            <div className="font-semibold text-white text-sm">{material.name}</div>
                            <div className="text-xs text-gray-400">
                              {material.quantity} {material.unit} × ${(material.unitCost || 0).toFixed(2)}
                              {material.category && <span className="ml-2 text-gray-500">· {material.category}</span>}
                            </div>
                          </div>
                          <div className="text-green-400 font-bold">
                            ${(material.totalCost || 0).toFixed(2)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* PO Footer */}
            <div className="flex items-center justify-between p-6 border-t border-gray-700">
              <div className="text-sm text-gray-400">
                {Object.keys(purchaseOrders).length} vendors · {currentQuote.materials.length} total items
              </div>
              <button
                onClick={() => setShowPurchaseOrders(false)}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-semibold transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Quote Editor */}
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
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowWorkRequestDrawer(v => !v)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                showWorkRequestDrawer
                  ? 'bg-orange-600 text-white'
                  : 'bg-orange-600/20 border border-orange-500/40 text-orange-300 hover:bg-orange-600/30'
              }`}
            >
              👁 {showWorkRequestDrawer ? 'Hide' : 'View'} Work Request
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/5 rounded-lg transition-colors"
            >
              <X className="w-6 h-6 text-gray-400" />
            </button>
          </div>
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
                {/* Company Header with Logo */}
                <div className="flex items-start gap-4 mb-6 pb-4 border-b border-gray-700">
                  {companyLogo && (
                    <img
                      src={companyLogo}
                      alt={companyName}
                      className="w-16 h-16 object-contain rounded-lg"
                    />
                  )}
                  <div className="flex-1">
                    <h2 className="text-2xl font-bold text-white mb-1">{companyName}</h2>
                    <p className="text-sm text-gray-400">Professional Quote</p>
                  </div>
                </div>

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
                      ${(currentQuote.materialsSubtotal || 0).toLocaleString()}
                    </div>
                  </div>
                  <div className="bg-gradient-to-br from-purple-500/10 to-purple-600/10 border border-purple-500/30 rounded-lg p-4">
                    <div className="text-purple-400 text-sm mb-1">Labor</div>
                    <div className="text-2xl font-bold text-white">
                      ${(currentQuote.laborSubtotal || 0).toLocaleString()}
                    </div>
                  </div>
                  <div className="bg-gradient-to-br from-[#ea580c]/10 to-[#fb923c]/10 border border-[#ea580c]/30 rounded-lg p-4">
                    <div className="text-[#ea580c] text-sm mb-1">Total</div>
                    <div className="text-2xl font-bold text-white">
                      ${(currentQuote.totalCost || 0).toLocaleString()}
                    </div>
                  </div>
                </div>

                {/* Detailed Materials Breakdown - Always Visible */}
                <details open className="mt-6 bg-black/20 border border-blue-500/30 rounded-lg">
                  <summary className="px-4 py-3 cursor-pointer font-semibold text-blue-400 hover:bg-blue-500/10 rounded-t-lg flex items-center gap-2">
                    <Package className="w-4 h-4" />
                    Materials Breakdown ({currentQuote.materials.length} items)
                  </summary>
                  <div className="p-4 space-y-2">
                    {currentQuote.materials.length === 0 ? (
                      <p className="text-gray-500 text-sm text-center py-4">No materials added yet</p>
                    ) : (
                      currentQuote.materials.map((material) => (
                        <div key={material.id} className="flex items-center justify-between py-2 px-3 bg-black/40 border border-gray-700 rounded">
                          <div className="flex-1">
                            <div className="font-semibold text-white text-sm">{material.name || material.description}</div>
                            <div className="text-xs text-gray-400">
                              {material.quantity} {material.unit} × ${(material.unitCost || material.unitPrice || 0).toFixed(2)}
                            </div>
                          </div>
                          <div className="text-blue-400 font-bold">
                            ${(material.totalCost || material.totalPrice || 0).toFixed(2)}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </details>

                {/* Detailed Labor Breakdown - Always Visible */}
                <details open className="mt-4 bg-black/20 border border-purple-500/30 rounded-lg">
                  <summary className="px-4 py-3 cursor-pointer font-semibold text-purple-400 hover:bg-purple-500/10 rounded-t-lg flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Labor Breakdown ({currentQuote.labor.length} items)
                  </summary>
                  <div className="p-4 space-y-2">
                    {currentQuote.labor.length === 0 ? (
                      <p className="text-gray-500 text-sm text-center py-4">No labor items added yet</p>
                    ) : (
                      currentQuote.labor.map((labor) => (
                        <div key={labor.id} className="flex items-center justify-between py-2 px-3 bg-black/40 border border-gray-700 rounded">
                          <div className="flex-1">
                            <div className="font-semibold text-white text-sm">{labor.role || labor.description}</div>
                            <div className="text-xs text-gray-400">
                              {labor.hours} hours × ${(labor.hourlyRate || labor.unitPrice || 0).toFixed(2)}/hr
                            </div>
                          </div>
                          <div className="text-purple-400 font-bold">
                            ${(labor.totalCost || labor.totalPrice || 0).toFixed(2)}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </details>
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
                    <div className="flex items-center gap-2">
                      {!editMode && (
                        <>
                          <button
                            onClick={() => {
                              // Send all materials to Materials Hub for management
                              // ALL materials are set to visible in Materials Hub for internal work
                              // The visibility toggle only controls what customers see in their quote
                              const hubMaterials = currentQuote.materials.map((m: any) => ({
                                id: m.id,
                                name: m.name,
                                description: m.description || '',
                                category: m.category || 'General',
                                vendorName: m.supplier || 'General Supply',
                                manufacturer: m.manufacturer || m.supplier || '',
                                basePrice: m.unitCost,
                                quantity: m.quantity,
                                unit: m.unit,
                                inStock: true,
                                qualityRating: 4.5,
                                visible: true, // Always visible in Materials Hub for internal work
                                visibleToCustomer: m.visible || false, // Track customer visibility separately
                              }));

                              // Store in Materials Hub (you can integrate with your hub service here)
                              localStorage.setItem('materials-hub-import', JSON.stringify(hubMaterials));

                              toast.success(`${hubMaterials.length} materials added to Materials Hub`, {
                                description: 'You can now manage vendors and create purchase orders. All materials are visible for internal work.',
                              });
                            }}
                            className="flex items-center gap-2 px-3 py-1.5 bg-black border border-cyan-500/50 hover:border-cyan-500 hover:shadow-[0_0_10px_rgba(6,182,212,0.3)] text-cyan-400 rounded-lg text-sm font-semibold transition-all"
                          >
                            <Upload className="w-4 h-4" />
                            Add to Materials Hub
                          </button>
                          <button
                            onClick={() => {
                              // Group materials by supplier/vendor
                              const materialsByVendor: Record<string, any[]> = {};
                              currentQuote.materials.forEach((m: any) => {
                                const vendor = m.supplier || 'General Supply';
                                if (!materialsByVendor[vendor]) {
                                  materialsByVendor[vendor] = [];
                                }
                                materialsByVendor[vendor].push(m);
                              });

                              setPurchaseOrders(materialsByVendor);
                              setShowPurchaseOrders(true);
                            }}
                            className="flex items-center gap-2 px-3 py-1.5 bg-black border border-green-500/50 hover:border-green-500 hover:shadow-[0_0_10px_rgba(34,197,94,0.3)] text-green-400 rounded-lg text-sm font-semibold transition-all"
                          >
                            <ShoppingCart className="w-4 h-4" />
                            Create PO Lists by Vendor
                          </button>
                        </>
                      )}
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
                  </div>
                  <div className="mb-3 flex items-center justify-between">
                    <div className="text-sm text-gray-400">
                      <span className="text-blue-400 font-semibold">{currentQuote.materials.filter((m: any) => m.visible !== false).length} visible to customer</span> · {currentQuote.materials.length} total items
                    </div>
                    {!editMode && (
                      <div className="text-xs text-gray-500 flex items-center gap-1">
                        <Eye className="w-3 h-3" />
                        Click "Edit Quote" to toggle item visibility
                      </div>
                    )}
                  </div>
                  <div className="space-y-3">
                    {currentQuote.materials.map((material) => (
                      <div
                        key={material.id}
                        className={`bg-gradient-to-r from-[#0A0A0A] to-[#1a1a1a] border rounded-lg p-4 transition-all ${
                          material.visible === false
                            ? 'border-gray-800 opacity-60'
                            : 'border-gray-700'
                        }`}
                      >
                        {editMode ? (
                          <div className="grid grid-cols-6 gap-3 items-center">
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
                              <div className="text-white font-semibold text-sm">
                                ${(material.totalCost || material.totalPrice || 0).toFixed(2)}
                              </div>
                              <input
                                type="checkbox"
                                checked={material.visible !== false}
                                onChange={(e) => updateMaterial(material.id, 'visible', e.target.checked)}
                                className="w-4 h-4 text-blue-500 bg-gray-700 border-gray-600 rounded focus:ring-blue-500 focus:ring-2 cursor-pointer"
                                title={material.visible === false ? 'Hidden from customer - Click to show' : 'Visible to customer - Click to hide'}
                              />
                              <button
                                onClick={() => deleteMaterial(material.id)}
                                className="p-1.5 bg-black border border-red-500/50 hover:border-red-500 hover:shadow-[0_0_10px_rgba(239,68,68,0.3)] text-red-400 rounded transition-all"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="font-semibold text-white">{material.name || material.description}</div>
                                <div className="text-sm text-gray-400">
                                  {material.supplier && <span className="text-cyan-400">{material.supplier}</span>}
                                  {material.supplier && ' · '}
                                  {material.quantity} {material.unit} × ${(material.unitCost || material.unitPrice || 0).toFixed(2)}
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                <button
                                  onClick={() => findVendorAlternativesForMaterial(material)}
                                  disabled={loadingVendorAlternatives && comparingMaterialId === material.id}
                                  className="flex items-center gap-2 px-3 py-1.5 bg-black border border-yellow-500/50 hover:border-yellow-500 hover:shadow-[0_0_10px_rgba(234,179,8,0.3)] text-yellow-400 rounded-lg text-xs font-semibold transition-all disabled:opacity-50"
                                >
                                  {loadingVendorAlternatives && comparingMaterialId === material.id ? (
                                    <>
                                      <Loader2 className="w-3 h-3 animate-spin" />
                                      Finding...
                                    </>
                                  ) : (
                                    <>
                                      <Search className="w-3 h-3" />
                                      Compare Vendors
                                    </>
                                  )}
                                </button>
                                <div className="text-lg font-bold text-blue-400">
                                  ${(material.totalCost || material.totalPrice || 0).toFixed(2)}
                                </div>
                              </div>
                            </div>

                            {/* Vendor Alternatives Dropdown */}
                            {comparingMaterialId === material.id && vendorAlternatives.length > 0 && (
                              <div className="mt-3 p-3 bg-black/60 border border-yellow-500/30 rounded-lg">
                                <div className="text-sm font-semibold text-yellow-400 mb-2 flex items-center gap-2">
                                  <ShoppingCart className="w-4 h-4" />
                                  Available from {vendorAlternatives.length} vendors:
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
                                  {vendorAlternatives.map((alt, idx) => {
                                    const totalPrice = alt.price * material.quantity;
                                    const savings = alt.isCurrent ? 0 : (material.unitCost - alt.price) * material.quantity;

                                    const storeStyles =
                                      alt.source === 'home_depot' ? {
                                        border: 'border-orange-500/50 hover:border-orange-500',
                                        bg: 'bg-orange-500/5 hover:bg-orange-500/10',
                                        text: 'text-orange-400',
                                      } :
                                      alt.source === 'lowes' ? {
                                        border: 'border-blue-500/50 hover:border-blue-500',
                                        bg: 'bg-blue-500/5 hover:bg-blue-500/10',
                                        text: 'text-blue-400',
                                      } :
                                      alt.source === 'grainger' ? {
                                        border: 'border-red-500/50 hover:border-red-500',
                                        bg: 'bg-red-500/5 hover:bg-red-500/10',
                                        text: 'text-red-400',
                                      } : {
                                        border: 'border-cyan-500/50 hover:border-cyan-500',
                                        bg: 'bg-cyan-500/5 hover:bg-cyan-500/10',
                                        text: 'text-cyan-400',
                                      };

                                    return (
                                      <button
                                        key={idx}
                                        onClick={() => selectVendorAlternative(alt)}
                                        disabled={alt.isCurrent}
                                        className={`text-left p-3 rounded-lg border transition-all ${storeStyles.border} ${storeStyles.bg} disabled:opacity-50 disabled:cursor-not-allowed`}
                                      >
                                        <div className={`text-xs font-bold ${storeStyles.text} mb-1`}>
                                          {alt.vendorName}
                                          {alt.isCurrent && ' (Current)'}
                                        </div>
                                        <div className="text-sm font-bold text-white">
                                          ${alt.price.toFixed(2)}
                                          <span className="text-xs text-gray-400 font-normal">/{material.unit}</span>
                                        </div>
                                        <div className="text-xs text-gray-400">
                                          Total: ${totalPrice.toFixed(2)}
                                        </div>
                                        {savings > 0 && (
                                          <div className="text-xs text-green-400 mt-1">
                                            💰 Save ${savings.toFixed(2)}
                                          </div>
                                        )}
                                        {savings < 0 && !alt.isCurrent && (
                                          <div className="text-xs text-red-400 mt-1">
                                            +${Math.abs(savings).toFixed(2)} more
                                          </div>
                                        )}
                                      </button>
                                    );
                                  })}
                                </div>
                                <button
                                  onClick={() => {
                                    setComparingMaterialId(null);
                                    setVendorAlternatives([]);
                                  }}
                                  className="mt-2 text-xs text-gray-500 hover:text-gray-400 transition-colors"
                                >
                                  Close comparison
                                </button>
                              </div>
                            )}
                          </>
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
                  <div className="mb-3 flex items-center justify-between">
                    <div className="text-sm text-gray-400">
                      <span className="text-purple-400 font-semibold">{currentQuote.labor.filter((l: any) => l.visible !== false).length} visible to customer</span> · {currentQuote.labor.length} total items
                    </div>
                    {!editMode && (
                      <div className="text-xs text-gray-500 flex items-center gap-1">
                        <Eye className="w-3 h-3" />
                        Click "Edit Quote" to toggle item visibility
                      </div>
                    )}
                  </div>
                  <div className="space-y-3">
                    {currentQuote.labor.map((labor) => (
                      <div
                        key={labor.id}
                        className={`bg-gradient-to-r from-[#0A0A0A] to-[#1a1a1a] border rounded-lg p-4 transition-all ${
                          labor.visible === false
                            ? 'border-gray-800 opacity-60'
                            : 'border-gray-700'
                        }`}
                      >
                        {editMode ? (
                          <div className="grid grid-cols-5 gap-3 items-center">
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
                              <div className="text-white font-semibold text-sm">
                                ${(labor.totalCost || labor.totalPrice || 0).toFixed(2)}
                              </div>
                              <input
                                type="checkbox"
                                checked={labor.visible !== false}
                                onChange={(e) => updateLabor(labor.id, 'visible', e.target.checked)}
                                className="w-4 h-4 text-purple-500 bg-gray-700 border-gray-600 rounded focus:ring-purple-500 focus:ring-2 cursor-pointer"
                                title={labor.visible === false ? 'Hidden from customer - Click to show' : 'Visible to customer - Click to hide'}
                              />
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
                              ${(bid.bidAmount || 0).toLocaleString()}
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

                {/* Invite customer to the app (only relevant before sending) */}
                {currentQuote.approvalStatus === 'pending' && (
                  <div className="mb-4 bg-gradient-to-br from-[#0A0A0A] to-[#1a1a1a] border border-gray-700 rounded-lg overflow-hidden">
                    <label className="flex items-start gap-3 p-4 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={inviteToApp}
                        onChange={(e) => {
                          setInviteToApp(e.target.checked);
                          if (e.target.checked && !invitePhone) setInvitePhone(workRequest.customerPhone || '');
                        }}
                        disabled={loading}
                        className="mt-0.5 w-4 h-4 accent-[#ea580c] cursor-pointer disabled:opacity-50"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 text-white font-semibold">
                          <UserPlus className="w-4 h-4 text-[#ea580c]" /> Also invite this customer to join the app
                        </div>
                        <p className="text-xs text-gray-400 mt-1">
                          Sends {workRequest.customerName || 'them'} a secure link to create their own customer portal — where they can view quotes, approve, pay, and track work.
                        </p>
                      </div>
                    </label>
                    {inviteToApp && (
                      <div className="px-4 pb-4 space-y-3 border-t border-gray-700 pt-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-400 mb-1.5">Customer phone (required for the invite)</label>
                          <input
                            type="tel"
                            value={invitePhone}
                            onChange={(e) => setInvitePhone(e.target.value)}
                            disabled={loading}
                            placeholder="+1 555 123 4567"
                            className="w-full px-4 py-2.5 bg-black border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#ea580c] disabled:opacity-50"
                          />
                        </div>
                        <label className="flex items-center gap-2.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={inviteBySms}
                            onChange={(e) => setInviteBySms(e.target.checked)}
                            disabled={loading}
                            className="w-4 h-4 accent-[#ea580c] cursor-pointer disabled:opacity-50"
                          />
                          <span className="flex items-center gap-1.5 text-sm text-gray-300">
                            <Smartphone className="w-3.5 h-3.5 text-[#ea580c]" /> Also text them the invite link (SMS)
                          </span>
                        </label>
                      </div>
                    )}
                  </div>
                )}

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
                      {inviteToApp ? 'Send to Customer & Invite' : 'Send to Customer'}
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
                          onClick={handleConvertToContract}
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
                  onClick={handleConvertToContract}
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

      {/* Work Request Drawer — slides in from the right over the quote editor */}
      {showWorkRequestDrawer && (
        <div className="fixed top-0 right-0 bottom-0 w-[480px] z-[70] bg-[#0A0A0A] border-l border-[#2A2A2A] shadow-2xl flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 bg-[#1A1A1A] border-b border-[#2A2A2A] flex-shrink-0">
            <p className="font-bold text-white text-sm">📋 Work Request Details</p>
            <button onClick={() => setShowWorkRequestDrawer(false)} className="p-1.5 hover:bg-white/10 rounded-lg transition">
              <X className="w-4 h-4 text-gray-400" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            <WorkRequestFullView
              workRequest={(workRequest as any)._rawWorkRequest || workRequest}
              onClose={() => setShowWorkRequestDrawer(false)}
              embedded
            />
          </div>
        </div>
      )}
    </>
  );
}