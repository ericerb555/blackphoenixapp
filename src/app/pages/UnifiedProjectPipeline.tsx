/**
 * Unified Project Pipeline - THE ONE WORKFLOW FOR EVERYTHING
 * Updated: 2026-05-31 - Made pipeline more compact to fit on one screen
 *
 * ALL workflow routes consolidate here:
 * - enterprise-quote-workflow → UnifiedProjectPipeline
 * - quote-to-contract-workflow → UnifiedProjectPipeline
 * - work-request-tracking → UnifiedProjectPipeline
 * - quote-response-hub → UnifiedProjectPipeline
 * - work-request-hub → UnifiedProjectPipeline
 * - work-request-intake → UnifiedProjectPipeline
 * - work-request-form-editor → UnifiedProjectPipeline
 * 
 * Kanban-style workflow: Work Request → Quote → Contract → Invoice
 * Professional board layout with drag-and-drop stage progression
 * 
 * Features:
 * - Walk items through ALL pipeline stages
 * - Inline action buttons for everything
 * - Move back and forth through processes from submission to payment
 * - Bring projects to the design center
 * - Search materials sites
 * - Edit all aspects
 * - View all customer submission information (photos, videos, documents, plans)
 */

import { useState, useEffect } from 'react';
import {
  FileText, DollarSign, CheckCircle, Clock, Play, Eye, Edit2,
  Send, FileSignature, Package, TrendingUp, Filter, Search,
  Plus, ArrowRight, User, MapPin, Calendar, AlertCircle, Sparkles,
  Building2, Phone, Mail, Wrench, ChevronRight, Star, CircleDot,
  Maximize2, Image, Video, FileCheck, ChevronDown, ChevronUp,
  XCircle, MoveRight, ExternalLink, Settings, Percent, Database,
  Loader2, RefreshCw, Zap, Camera, PenTool, Layers, X, Download
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { BackToDashboard } from '../components/BackToDashboard';
import { QuoteToContractEditor } from '../components/QuoteToContractEditor';
import { ProjectDetailsModal } from '../components/ProjectDetailsModal';
import WorkRequestFullView from '../components/WorkRequestFullView';
import PipelineMessagePanel from '../components/PipelineMessagePanel';
import AutoJobScheduleGenerator from '../components/AutoJobScheduleGenerator';
import { FinancialDataSheet } from '../components/FinancialDataSheet';
import { EmployeeNotes } from '../components/EmployeeNotes';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { supabase } from '../lib/supabase';
import { generateDemoQuote } from '../lib/demoQuoteGenerator';
import { listDesignProjects, saveDesignProject, type DesignProjectSummary } from '../lib/designProjectService';
import { useNavigate } from '../hooks/useNavigate';

// The Design Center is a separate published Figma Make app that shares this
// app's Supabase backend (design_project:* KV records). We link to it by URL and
// pass the project id so, if the Design Center reads it, the project opens
// directly. Both apps use the "shared" owner namespace by default.
const DESIGN_CENTER_URL = 'https://author-canon-65421010.figma.site';
const DESIGN_OWNER_KEY = 'shared';
function openInDesignCenter(designProjectId?: string) {
  const url = designProjectId
    ? `${DESIGN_CENTER_URL}/?projectId=${encodeURIComponent(designProjectId)}&owner=${encodeURIComponent(DESIGN_OWNER_KEY)}`
    : DESIGN_CENTER_URL;
  window.open(url, '_blank', 'noopener');
}

type PipelineStage = 'quote-draft' | 'quote-sent' | 'quote-approved' | 'contract' | 'invoice' | 'payment';

interface CustomerSubmission {
  photos: Array<{
    id: string;
    url: string;
    filename: string;
    uploadedAt: string;
    caption?: string;
  }>;
  videos: Array<{
    id: string;
    url: string;
    filename: string;
    uploadedAt: string;
    caption?: string;
  }>;
  documents: Array<{
    id: string;
    url: string;
    filename: string;
    type: string;
    uploadedAt: string;
  }>;
  plans: Array<{
    id: string;
    url: string;
    filename: string;
    uploadedAt: string;
  }>;
  blueprintAnalysis?: {
    rooms: any[];
    materials: any[];
    estimatedCosts: any;
    analyzedAt: string;
  };
}

interface PipelineItem {
  id: string;
  itemNumber: string;
  stage: PipelineStage;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  location?: string;
  serviceType: string;
  title: string;
  description: string;
  estimatedValue: number;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  createdDate: string;
  lastModified: string;
  assignedTo?: string;
  
  // Customer submission data
  submission?: CustomerSubmission;
  
  // Quote-specific data (when stage >= quote-draft)
  quote?: {
    id: string;
    quoteNumber: string;
    materials: any[];
    labor: any[];
    processSteps: any[];
    materialsSubtotal: number;
    laborSubtotal: number;
    taxRate: number;
    taxAmount: number;
    totalCost: number;
    generatedAt: string;
    sentAt?: string;
    approvalStatus: 'pending' | 'approved' | 'rejected' | 'revised';
    approvedAt?: string;
    approvedBy?: string; // Customer name who approved
    rejectedAt?: string;
    rejectionReason?: string;
    expiryDate?: string;
    customerViewedAt?: string; // Track when customer viewed the quote
    // Per-quote labor rates and profit settings
    laborRates?: Array<{
      id: string;
      category: string;
      description: string;
      hourlyRate: number;
      visible: boolean;
    }>;
    profitSettings?: {
      laborMarkup: number;
      materialsMarkup: number;
      overheadPercentage: number;
      targetProfitMargin: number;
    };
  };
  
  // Contract-specific data (when stage >= contract)
  contract?: {
    id: string;
    contractNumber: string;
    contractType: 'standard' | 'soroban-smart-contract'; // Customer's choice
    contractTypeSelectedAt?: string; // When customer chose the contract type
    signedDate?: string;
    signedBy?: string; // Customer name who signed
    customerSignature?: string;
    companySignature?: string;
    startDate: string;
    endDate?: string;
    terms: string;
    status: 'draft' | 'sent' | 'awaiting-signature' | 'signed' | 'active' | 'completed';
    sentAt?: string; // When contract was sent to customer
    customerViewedAt?: string; // When customer viewed the contract
    paymentSchedule?: Array<{
      id?: string;
      type: string;
      description: string;
      percentage: number;
      amount: number;
      milestone?: string;
      dueDate?: string;
      status: 'pending' | 'paid' | 'overdue';
    }>;
    sorobanContractId?: string; // For blockchain contracts
    sorobanTransactionHash?: string;
  };
  
  // Invoice data
  invoice?: {
    id: string;
    invoiceNumber: string;
    dueDate: string;
    sentDate?: string;
    paidDate?: string;
    paymentStatus: 'pending' | 'partial' | 'paid';
    amountPaid: number;
  };
}

export default function UnifiedProjectPipeline() {
  console.log('🚀 UnifiedProjectPipeline component rendering...');
  const navigate = useNavigate();
  const [items, setItems] = useState<PipelineItem[]>([]);
  console.log('[Pipeline RENDER] Current items count:', items.length);
  const [isLoading, setIsLoading] = useState(true);
  const [hasTriedAutoGenerate, setHasTriedAutoGenerate] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);

  const [filterStage, setFilterStage] = useState<'all' | PipelineStage>('all');
  const [filterSource, setFilterSource] = useState<'all' | 'camera' | 'design-studio' | 'other'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItem, setSelectedItem] = useState<PipelineItem | null>(null);
  const [showQuoteEditor, setShowQuoteEditor] = useState(false);
  const [showProjectDetails, setShowProjectDetails] = useState(false);
  const [showFullWorkRequest, setShowFullWorkRequest] = useState(false);
  const [showMessagePanel, setShowMessagePanel] = useState(false);
  const [projectDetailsInitialTab, setProjectDetailsInitialTab] = useState<'overview' | 'submission' | 'quote' | 'design' | 'materials' | 'contract' | 'invoice'>('overview');
  const [showContractView, setShowContractView] = useState(false);
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const [showScheduleGenerator, setShowScheduleGenerator] = useState(false);
  const [scheduleGeneratorItem, setScheduleGeneratorItem] = useState<PipelineItem | null>(null);
  const [showFinancialSheet, setShowFinancialSheet] = useState(false);
  const [showEmployeeNotes, setShowEmployeeNotes] = useState(false);
  const [financialSheetItem, setFinancialSheetItem] = useState<PipelineItem | null>(null);
  const [employeeNotesItem, setEmployeeNotesItem] = useState<PipelineItem | null>(null);
  // Design Center bridge — design projects from the shared backend.
  const [designProjects, setDesignProjects] = useState<DesignProjectSummary[]>([]);
  const [showDesignPanel, setShowDesignPanel] = useState(false);
  const [designSearch, setDesignSearch] = useState('');
  const [designBusyId, setDesignBusyId] = useState<string | null>(null);

  const loadDesignProjects = async () => {
    try {
      const list = await listDesignProjects(DESIGN_OWNER_KEY);
      setDesignProjects(list);
    } catch (err) {
      console.error('[Pipeline] Could not load Design Center projects:', err);
    }
  };
  useEffect(() => { loadDesignProjects(); }, []);

  // Helper function to save a single item to backend
  const saveItemToBackend = async (item: PipelineItem) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Sign in as an owner or administrator before updating the pipeline.');
      const base = `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6/pipeline/items`;
      const headers = { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' };
      let response = await fetch(`${base}/${encodeURIComponent(item.id)}`, { method: 'PUT', headers, body: JSON.stringify(item) });
      if (response.status === 404) response = await fetch(base, { method: 'POST', headers, body: JSON.stringify(item) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.success) throw new Error(data.error || `Unable to save project ${item.itemNumber}.`);
      return data.item as PipelineItem;
    } catch (error) {
      console.error('[Pipeline] Error saving item:', error);
      throw error;
    }
  };

  // Bring a Design Center project INTO the pipeline as a linked item.
  const importDesignProject = async (dp: DesignProjectSummary) => {
    const already = items.find(i => (i as any).designProjectId === dp.id);
    if (already) { setSelectedItem(already); setShowProjectDetails(true); setShowDesignPanel(false); return; }
    setDesignBusyId(dp.id);
    try {
      const now = new Date().toISOString();
      const item: PipelineItem = {
        id: `DPRJ-${dp.id}`,
        itemNumber: `DP-${dp.id.slice(-6).toUpperCase()}`,
        stage: 'quote-draft',
        customerName: 'Design Project',
        customerEmail: '',
        serviceType: 'Design',
        title: dp.name || 'Untitled Design',
        description: `Imported from Design Center — ${dp.floorCount} floor(s), ${dp.elementCount} element(s).`,
        estimatedValue: 0,
        priority: 'medium',
        createdDate: dp.createdAt || now,
        lastModified: now,
      };
      (item as any).source = 'design-studio';
      (item as any).designProjectId = dp.id;
      (item as any).designProjectVersion = dp.version;
      const saved = await saveItemToBackend(item);
      setItems(prev => [saved || item, ...prev.filter(i => i.id !== item.id)]);
      toast.success(`"${dp.name}" added to the pipeline.`);
      setShowDesignPanel(false);
    } catch (err: any) {
      toast.error(err.message || 'Could not import this design project.');
    } finally {
      setDesignBusyId(null);
    }
  };

  // Push a pipeline item OUT to the Design Center: ensure a linked design
  // project exists, then open the Design Center to work on it.
  const sendToDesignCenter = async (item: PipelineItem) => {
    setDesignBusyId(item.id);
    try {
      let designId = (item as any).designProjectId as string | undefined;
      if (!designId) {
        const { project } = await saveDesignProject({
          name: item.title || `Project ${item.itemNumber}`,
          ownerKey: DESIGN_OWNER_KEY,
          quoteId: item.quote?.id || null,
          note: `Created from pipeline ${item.itemNumber}`,
        });
        designId = project.id;
        const updated = { ...item, lastModified: new Date().toISOString() };
        (updated as any).designProjectId = designId;
        (updated as any).source = (item as any).source || 'design-studio';
        await saveItemToBackend(updated).catch(() => {});
        setItems(prev => prev.map(i => (i.id === item.id ? updated : i)));
        loadDesignProjects();
      }
      openInDesignCenter(designId);
    } catch (err: any) {
      toast.error(err.message || 'Could not open this project in the Design Center.');
    } finally {
      setDesignBusyId(null);
    }
  };

  // Load pipeline items from KV store on mount
  useEffect(() => {
    const loadPipelineItems = async () => {
      console.log('[Pipeline] 🚀 Starting data load');
      setIsLoading(true);

      // Work requests and pipeline records are loaded from the authenticated server only.
      let localItems: PipelineItem[] = [];

      // Step 2: Load ALL submitted work requests directly from all_work_requests KV
      // This ensures every work request ever submitted always appears in the pipeline
      let serverItems: PipelineItem[] = [];
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token || publicAnonKey;

        const wrRes = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6/work-requests`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        if (wrRes.ok) {
          const wrData = await wrRes.json();
          const allWR: any[] = Array.isArray(wrData) ? wrData : (wrData.workRequests || []);
          console.log('[Pipeline] ✅ Loaded', allWR.length, 'work requests from server');

          serverItems = allWR.map((wr: any) => {
            const clientName  = wr.client_name  || wr.client_info?.name  || wr.clientName  || 'Customer';
            const clientEmail = wr.client_email || wr.client_info?.email || wr.clientEmail || '';
            const clientPhone = wr.client_phone || wr.client_info?.phone || wr.clientPhone || '';
            const serviceType = wr.serviceType  || wr.project_type || 'General Service';
            const budgetMax   = wr.budget_range?.max || wr.budget_range?.min || 0;

            const quote = wr.quote || undefined;

            // Build the submission object from wherever photos/videos are stored
            const media = wr.media_attachments || wr.media || {};
            const photoUrls: string[] = media.photos || wr.photos || [];
            const videoUrls: string[] = media.videos || wr.videos || [];
            const blueprintUrls: string[] = media.blueprints || wr.blueprints || [];

            const submission = (photoUrls.length > 0 || videoUrls.length > 0 || blueprintUrls.length > 0) ? {
              photos: photoUrls.map((url: string, idx: number) => ({
                id: `photo-${idx}`, url,
                filename: `photo-${idx + 1}.jpg`,
                uploadedAt: wr.created_at || new Date().toISOString(),
              })),
              videos: videoUrls.map((url: string, idx: number) => ({
                id: `video-${idx}`, url,
                filename: `video-${idx + 1}.mp4`,
                uploadedAt: wr.created_at || new Date().toISOString(),
              })),
              documents: [],
              plans: blueprintUrls.map((url: string, idx: number) => ({
                id: `blueprint-${idx}`, url,
                filename: `blueprint-${idx + 1}.pdf`,
                uploadedAt: wr.created_at || new Date().toISOString(),
              })),
              blueprintAnalysis: media.blueprintAnalysis,
            } : undefined;

            return {
              id: wr.id,
              itemNumber: wr.id?.toUpperCase?.() || 'WR-001',
              stage: (wr.status === 'completed' ? 'invoice' : wr.status === 'in-progress' ? 'contract' : 'quote-draft') as any,
              customerName: clientName,
              customerEmail: clientEmail,
              customerPhone: clientPhone,
              location: wr.site_address ? `${wr.site_address}, ${wr.city || ''}`.trim() : (wr.city || ''),
              serviceType,
              title: wr.project_name || wr.title || `${serviceType} — ${clientName}`,
              description: wr.description || '',
              estimatedValue: budgetMax,
              priority: 'high' as const,
              createdDate: wr.created_at || new Date().toISOString(),
              lastModified: wr.updated_at || wr.created_at || new Date().toISOString(),
              workRequest: wr,
              submission,
              quote,
              floorPlan: wr.floorPlan || undefined,
            };
          });
        }
      } catch (err) {
        console.warn('[Pipeline] Could not load work requests from server:', err);
      }

      // Load server-owned pipeline state (quotes, stage transitions, contracts) with the same signed-in session.
      let kvItems: PipelineItem[] = [];
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
          const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6/pipeline/items`, { headers: { Authorization: `Bearer ${session.access_token}` } });
          const data = await response.json();
          if (response.ok && data.success && Array.isArray(data.items)) kvItems = data.items as PipelineItem[];
        }
      } catch (error) { console.warn('[Pipeline] Could not load saved pipeline records:', error); }

      // Merge: KV pipeline items (with quotes) take priority over plain work requests
      // Deduplicate by ID — prefer the one with a quote
      const allById = new Map<string, PipelineItem>();
      serverItems.forEach(i => allById.set(i.id, i));
      kvItems.forEach(i => allById.set(i.id, i)); // KV wins (has quote)

      const merged = Array.from(allById.values());
      console.log('[Pipeline] Final items:', merged.length);
      setItems(merged);
      setIsLoading(false);
    };

    loadPipelineItems();
  }, []);

  // Auto-open item when navigated here from admin alerts — runs after items load
  useEffect(() => {
    const openItemId = localStorage.getItem('pipeline_open_item');
    if (!openItemId || items.length === 0) return;

    const target = items.find(i => i.id === openItemId);
    if (target) {
      localStorage.removeItem('pipeline_open_item');
      setSelectedItem(target);
      setProjectDetailsInitialTab('submission'); // Open straight to Customer Files tab
      setShowProjectDetails(true);
    }
  }, [items]); // re-runs whenever items updates

  // Check for materials update from Materials Hub
  useEffect(() => {
    const checkMaterialsUpdate = () => {
      const quoteData = localStorage.getItem('quote_in_progress');
      if (quoteData) {
        try {
          const parsed = JSON.parse(quoteData);
          
          // Check if materials were updated
          if (parsed.materialsUpdated) {
            console.log('📦 Materials updated from Materials Hub:', parsed);
            
            // Find the item and update it
            setItems(prevItems => prevItems.map(item => {
              if (item.id === parsed.id) {
                // Extract materials and labor from lineItems
                const materials = parsed.lineItems?.filter((li: any) => li.type === 'material') || [];
                const labor = parsed.lineItems?.filter((li: any) => li.type === 'labor') || [];
                
                // Calculate totals
                const materialsSubtotal = materials.reduce((sum: number, m: any) => sum + (m.totalPrice || 0), 0);
                const laborSubtotal = labor.reduce((sum: number, l: any) => sum + (l.totalPrice || 0), 0);
                const taxAmount = (materialsSubtotal + laborSubtotal) * 0.08;
                const totalCost = materialsSubtotal + laborSubtotal + taxAmount;
                
                toast.success(`Updated ${materials.length} materials in quote #${item.itemNumber}`);
                
                const updated = {
                  ...item,
                  quote: item.quote ? { ...item.quote, materials, labor, materialsSubtotal, laborSubtotal, taxAmount, totalCost } : undefined,
                  lastModified: new Date().toISOString()
                };
                void saveItemToBackend(updated).catch((error) => toast.error(error.message || 'Unable to save materials to the quote.'));
                return updated;
              }
              return item;
            }));
            
            // Clear the flag and localStorage
            localStorage.removeItem('quote_in_progress');
          }
        } catch (e) {
          console.error('Failed to parse quote data:', e);
        }
      }
    };
    
    checkMaterialsUpdate();
  }, []); // Run once on mount to check for returning from Materials Hub

  // Pipeline records are explicitly written by workflow actions; browser storage is never used as a project source of truth.

  // Convert PipelineItem to WorkRequest format for the editor
  const convertToWorkRequest = (item: PipelineItem) => {
    // Transform quote to match QuoteToContractEditor expectations
    const transformedQuote = item.quote ? {
      id: item.quote.id || `qt-${item.id}`,
      quoteNumber: item.quote.quoteNumber || `Q-${new Date().getFullYear()}-001`,
      materials: item.quote.materials || [],
      labor: item.quote.labor || item.quote.laborItems || [],
      processSteps: item.quote.processSteps || [],
      materialsSubtotal: item.quote.materialsSubtotal || 0,
      laborSubtotal: item.quote.laborSubtotal || 0,
      taxRate: item.quote.taxRate || 0.08,
      taxAmount: item.quote.taxAmount || 0,
      totalCost: item.quote.totalCost || 0,
      generatedAt: item.quote.generatedAt || new Date().toISOString(),
      approvalStatus: (item.quote.approvalStatus || 'pending') as 'pending' | 'approved' | 'rejected' | 'revised',
      approvedAt: item.quote.approvedAt,
      rejectionReason: item.quote.rejectionReason
    } : undefined;

    return {
      id: item.id,
      requestNumber: item.itemNumber,
      serviceType: item.serviceType,
      title: item.title,
      description: item.description,
      customerName: item.customerName,
      customerEmail: item.customerEmail,
      customerPhone: item.customerPhone,
      location: item.location,
      quote: transformedQuote
    };
  };

  // Auto-generate quotes for items with blueprintAnalysis but no quote data
  // DISABLED: This was causing crashes. Auto-generate is available via button instead.
  // useEffect(() => {
  //   // Only run once after items are loaded and we haven't tried yet
  //   if (isLoading || hasTriedAutoGenerate || items.length === 0) {
  //     return;
  //   }

  //   const itemsNeedingQuotes = items.filter(item => 
  //     item.stage === 'quote-draft' &&
  //     item.submission?.blueprintAnalysis &&
  //     item.quote &&
  //     (!item.quote.materials || item.quote.materials.length === 0) &&
  //     (!item.quote.labor || item.quote.labor.length === 0)
  //   );

  //   if (itemsNeedingQuotes.length > 0) {
  //     console.log(`🔄 Auto-generating quotes for ${itemsNeedingQuotes.length} item(s)...`);
  //     setHasTriedAutoGenerate(true);
      
  //     itemsNeedingQuotes.forEach(async (item) => {
  //       try {
  //         // Generate quote automatically
  //         await handleAutoGenerateQuote(item);
  //       } catch (error) {
  //         console.error('❌ Failed to auto-generate quote for item:', item.id, error);
  //       }
  //     });
  //   } else {
  //     setHasTriedAutoGenerate(true);
  //   }
  // }, [items, isLoading, hasTriedAutoGenerate]); // Run when items load

  // Filter items
  const filteredItems = items.filter(item => {
    if (filterStage !== 'all' && item.stage !== filterStage) return false;

    if (filterSource !== 'all') {
      const src = (item as any).source;
      if (filterSource === 'other') {
        if (src === 'camera' || src === 'design-studio') return false;
      } else if (src !== filterSource) {
        return false;
      }
    }

    if (searchQuery) {
      const search = searchQuery.toLowerCase();
      return (
        item.itemNumber.toLowerCase().includes(search) ||
        item.customerName.toLowerCase().includes(search) ||
        item.title.toLowerCase().includes(search) ||
        item.serviceType.toLowerCase().includes(search)
      );
    }
    
    return true;
  });

  // Get stage info
  const getStageInfo = (stage: PipelineStage) => {
    switch (stage) {
      case 'quote-draft':
        return { label: 'Quote Draft', color: 'yellow', icon: Edit2 };
      case 'quote-sent':
        return { label: 'Quote Sent', color: 'purple', icon: Send };
      case 'quote-approved':
        return { label: 'Quote Approved', color: 'green', icon: CheckCircle };
      case 'contract':
        return { label: 'Contract', color: 'orange', icon: FileSignature };
      case 'invoice':
        return { label: 'Invoice', color: 'cyan', icon: DollarSign };
      case 'payment':
        return { label: 'Payment', color: 'green', icon: DollarSign };
      default:
        return { label: 'Unknown', color: 'gray', icon: FileText };
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'text-red-400 bg-red-500/20 border-red-500/50';
      case 'high': return 'text-orange-400 bg-orange-500/20 border-orange-500/50';
      case 'medium': return 'text-yellow-400 bg-yellow-500/20 border-yellow-500/50';
      case 'low': return 'text-green-400 bg-green-500/20 border-green-500/50';
      default: return 'text-gray-400 bg-gray-500/20 border-gray-500/50';
    }
  };

  // Action handlers
  const handleCreateQuote = (item: PipelineItem) => {
    const newQuote = {
      id: `qt-${Date.now()}`,
      quoteNumber: `QT-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${String(Math.floor(Math.random() * 9999)).padStart(4, '0')}`,
      materials: [],
      labor: [],
      processSteps: [],
      materialsSubtotal: 0,
      laborSubtotal: 0,
      taxRate: 0.08,
      taxAmount: 0,
      totalCost: 0,
      generatedAt: new Date().toISOString(),
      approvalStatus: 'pending' as const,
    };
    
    const itemWithQuote = {
      ...item,
      quote: newQuote
    };
    
    setSelectedItem(itemWithQuote);
    setShowQuoteEditor(true);
    toast.info('Opening Quote Editor...');
  };

  const handleAutoGenerateQuote = async (item: PipelineItem) => {
    toast.loading('🤖 AI is analyzing the work request...', { id: 'auto-gen' });
    
    try {
      // Load current labor rates from the system
      let laborRates: any[] | undefined;
      let profitSettings: any | undefined;
      
      try {
        const ratesResponse = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6/labor-rates/get`,
          {
            headers: {
              'Authorization': `Bearer ${publicAnonKey}`,
            }
          }
        );
        
        if (ratesResponse.ok) {
          const ratesData = await ratesResponse.json();
          laborRates = ratesData.laborRates?.map((r: any) => ({
            id: r.id,
            category: r.category,
            description: r.description || '',
            hourlyRate: r.hourlyRate,
            visible: r.visible
          }));
          profitSettings = ratesData.profitSettings;
        }
      } catch (error) {
        console.log('[Auto-Generate] Could not load labor rates, will use defaults');
      }
      
      // DISABLED: Health check removed to prevent console 404 spam
      // Skip to offline demo mode since server is not available
      console.log('[Auto-Generate] Server check disabled - using offline demo mode');
      throw new Error('Server not deployed or not reachable');
      
    } catch (error: any) {
      // Server unavailable - generate a comprehensive demo quote based on the project description
      console.log('[Auto-Generate] Using offline demo mode:', error.message);
      
      const demoQuote = generateDemoQuote({
        id: item.id,
        title: item.title,
        description: item.description,
        serviceType: item.serviceType,
        estimatedValue: item.estimatedValue
      });
      
      const updatedItem = {
        ...item,
        stage: 'quote-draft' as PipelineStage,
        quote: {
          id: `qt-${Date.now()}`,
          quoteNumber: `QT-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${String(Math.floor(Math.random() * 9999)).padStart(4, '0')}`,
          materials: demoQuote.materials,
          labor: demoQuote.labor,
          processSteps: demoQuote.processSteps,
          materialsSubtotal: demoQuote.materialsSubtotal,
          laborSubtotal: demoQuote.laborSubtotal,
          taxRate: demoQuote.taxRate,
          taxAmount: demoQuote.taxAmount,
          totalCost: demoQuote.totalCost,
          generatedAt: new Date().toISOString(),
          approvalStatus: 'pending' as const,
        },
        lastModified: new Date().toISOString()
      };

      console.log('[Auto-Generate] Created offline demo quote:', {
        materials: demoQuote.materials.length,
        labor: demoQuote.labor.length,
        processSteps: demoQuote.processSteps.length,
        materialsSubtotal: demoQuote.materialsSubtotal,
        laborSubtotal: demoQuote.laborSubtotal,
        totalCost: demoQuote.totalCost
      });

      const { data: { session } } = await supabase.auth.getSession();
      await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6/quotes`, {
        method: 'POST', headers: { Authorization: `Bearer ${session?.access_token || publicAnonKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: updatedItem.quote?.id, number: updatedItem.quote?.quoteNumber, clientName: updatedItem.customerName, clientEmail: updatedItem.customerEmail, clientPhone: updatedItem.customerPhone, items: [...(updatedItem.quote?.materials || []), ...(updatedItem.quote?.labor || [])], notes: updatedItem.description, status: 'draft', workRequestId: updatedItem.id, total: updatedItem.quote?.totalCost })
      });
      const savedItem = await saveItemToBackend(updatedItem);
      setItems(items.map(i => i.id === item.id ? savedItem : i));
      toast.success('Quote estimate generated and saved', { id: 'auto-gen', description: `Generated ${demoQuote.materials.length} materials and ${demoQuote.labor.length} labor items for review.` });
      setSelectedItem(savedItem);
      setShowQuoteEditor(true);
    }
  };

  const handleEditQuote = (item: PipelineItem) => {
    setSelectedItem(item);
    setShowQuoteEditor(true);
  };

  const handleOpenScheduleGenerator = (item: PipelineItem) => {
    setScheduleGeneratorItem(item);
    setShowScheduleGenerator(true);
  };

  const handleScheduleGenerated = (schedule: any) => {
    toast.success('Job schedule generated and saved!', {
      description: `${schedule.phases.length} phases, ${schedule.totalDuration} days`
    });
    setShowScheduleGenerator(false);
    setScheduleGeneratorItem(null);

    // Optionally navigate to master scheduling to view the schedule
    // navigate('master-scheduling');
  };

  const handleOpenMaterialsHub = (item: PipelineItem) => {
    // Prepare quote data for Materials Hub
    const quoteData = {
      id: item.id,
      itemNumber: item.itemNumber,
      customerName: item.customerName,
      customerEmail: item.customerEmail,
      serviceType: item.serviceType,
      title: item.title,
      description: item.description,
      estimatedValue: item.estimatedValue,
      quote: item.quote,
      lineItems: [
        // Add existing quote materials if they exist
        ...(item.quote?.materials?.map((mat: any) => ({
          type: 'material',
          ...mat
        })) || []),
        // Add existing labor items if they exist
        ...(item.quote?.labor?.map((lab: any) => ({
          type: 'labor',
          ...lab
        })) || [])
      ]
    };
    
    // Store in localStorage for Materials Hub to pick up
    localStorage.setItem('quote_in_progress', JSON.stringify(quoteData));
    
    // Navigate to Materials Hub
    navigate('materials-hub');
    
    toast.success('Opening Materials Hub with quote data...', {
      description: 'Search and compare materials from multiple suppliers'
    });
  };

  const handleSendQuote = async (item: PipelineItem) => {
    if (item.stage !== 'quote-draft') {
      toast.error('Can only send quotes in draft stage');
      return;
    }
    toast.loading('Generating quote link & sending to customer...', { id: 'send-quote' });
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || publicAnonKey;

      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6/quotes/generate-link`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            quoteId: item.quote?.id || item.id,
            workRequestId: item.id,
            clientName: item.customerName,
            clientEmail: item.customerEmail,
            clientPhone: item.customerPhone,
            quoteData: item.quote,
          }),
        }
      );

      const data = await res.json();
      if (res.ok && data.approvalUrl) {
        // Update pipeline stage
        const updated = { ...item, stage: 'quote-sent' as PipelineStage, quote: item.quote ? { ...item.quote, sentAt: new Date().toISOString() } : undefined, lastModified: new Date().toISOString() };
        const saved = await saveItemToBackend(updated);
        setItems(items.map(i => i.id === item.id ? saved : i));
        // Schedule automated follow-ups (3-day and 7-day)
        fetch(`https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6/follow-ups/schedule`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            quoteId: item.quote?.id || item.id,
            workRequestId: item.id,
            clientName: item.customerName,
            clientEmail: item.customerEmail,
            clientPhone: item.customerPhone,
            serviceType: item.serviceType,
            approvalUrl: data.approvalUrl,
            quoteTotal: item.quote?.totalCost || item.estimatedValue || 0,
          }),
        }).catch(() => {});
        // Copy link to clipboard as fallback
        navigator.clipboard?.writeText(data.approvalUrl).catch(() => {});
        toast.success('Quote sent! Follow-ups scheduled at 3 & 7 days.', {
          id: 'send-quote',
          description: `Link: ${data.approvalUrl.substring(0, 50)}...`,
        });
      } else {
        // Fallback — still update stage
        setItems(items.map(i => i.id === item.id ? { ...i, stage: 'quote-sent' as PipelineStage } : i));
        toast.success('Quote sent to customer!', { id: 'send-quote' });
      }
    } catch (err: any) {
      // Network fallback
      setItems(items.map(i => i.id === item.id ? { ...i, stage: 'quote-sent' as PipelineStage } : i));
      toast.success('Quote stage updated. Check network for SMS delivery.', { id: 'send-quote' });
    }
  };

  const handleSimulateQuoteApproval = (_item: PipelineItem) => {
    toast.info('Customer approval is recorded from the customer quote/portal flow. This owner view cannot self-approve a customer quote.');
  };

  const handleConvertToContract = (item: PipelineItem) => {
    if (!item.quote || item.quote.approvalStatus !== 'approved') {
      toast.error('A customer-approved quote is required before creating a contract.');
      return;
    }
    setSelectedItem(item);
    setShowQuoteEditor(true);
    toast.info('Open the contract action in the quote editor to create the canonical contract.');
  };

  const handleSimulateContractSigned = (_item: PipelineItem) => {
    toast.info('Contracts are signed by the customer from the Contracts tab in their portal.');
  };

  const handleSaveQuote = async (updatedItem: any) => {
    const current = items.find(i => i.id === updatedItem.id);
    if (!current) return;
    const next = { ...current, stage: current.stage === 'work-request' ? 'quote-draft' as PipelineStage : current.stage, quote: updatedItem.quote, estimatedValue: updatedItem.quote?.totalCost || current.estimatedValue, lastModified: new Date().toISOString() };
    try {
      const saved = await saveItemToBackend(next);
      setItems(items.map(i => i.id === saved.id ? saved : i)); setSelectedItem(saved); setShowQuoteEditor(false); toast.success('Quote saved to the project record.');
    } catch (error: any) { toast.error(error.message || 'Unable to save quote.'); }
  };

  const handleViewProjectDetails = async (item: PipelineItem) => {
    setSelectedItem(item);
    setShowProjectDetails(true);

    // Notify customer that their request has been viewed
    if (item.customerEmail) {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || publicAnonKey;
      fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6/work-requests/${item.id}/viewed`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            adminName: 'Black Phoenix Team',
            customerEmail: item.customerEmail,
            customerName: item.customerName,
          }),
        }
      ).catch(() => {});
    }
  };

  const toggleCardExpanded = (itemId: string) => {
    setExpandedCards(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  const handleViewFinancialSheet = (item: PipelineItem) => {
    setFinancialSheetItem(item);
    setShowFinancialSheet(true);
  };

  const handleViewEmployeeNotes = (item: PipelineItem) => {
    setEmployeeNotesItem(item);
    setShowEmployeeNotes(true);
  };

  // Sample records are intentionally disabled in production operations.
  const handleSeedData = async () => {
    toast.error('Sample pipeline data is disabled. Create or review a real work request instead.');
  };

  // Define pipeline stages
  const pipelineStages: { stage: PipelineStage; label: string; color: string; icon: any }[] = [
    { stage: 'quote-draft', label: 'Quote Drafts', color: 'yellow', icon: Edit2 },
    { stage: 'quote-sent', label: 'Quotes Sent', color: 'purple', icon: Send },
    { stage: 'quote-approved', label: 'Approved', color: 'green', icon: CheckCircle },
    { stage: 'contract', label: 'Contracts', color: 'orange', icon: FileSignature },
    { stage: 'invoice', label: 'Invoices', color: 'cyan', icon: DollarSign },
  ];

  const getItemsForStage = (stage: PipelineStage) => {
    return filteredItems.filter(item => item.stage === stage);
  };

  const getTotalValue = (stageItems: PipelineItem[]) => {
    return stageItems.reduce((sum, item) => sum + (item.quote?.totalCost || item.estimatedValue), 0);
  };

  // Show loading state
  console.log('📊 Checking loading state:', isLoading, 'items:', items.length);
  if (isLoading) {
    console.log('⏳ Showing loading spinner...');
    return (
      <div className="min-h-screen bg-[#0A0A0A] text-white p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#ea580c] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Loading pipeline data...</p>
        </div>
      </div>
    );
  }

  console.log('✅ About to render main pipeline UI with', items.length, 'items');
  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white p-6">
      <BackToDashboard />

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <TrendingUp className="w-8 h-8 text-[#ea580c]" />
              <h1 className="text-4xl font-bold">Project Pipeline</h1>
            </div>
            <p className="text-gray-400">Track projects through each stage from request to invoice</p>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Refresh Button */}
            <button
              onClick={() => window.location.reload()}
              className="flex items-center gap-2 px-4 py-2.5 bg-black/60 border border-gray-700 hover:border-gray-500 text-gray-400 hover:text-white font-semibold rounded-lg transition-all"
            >
              <RefreshCw className="w-5 h-5" />
              Refresh
            </button>
            
            {/* Design Center bridge */}
            <button
              onClick={() => { loadDesignProjects(); setShowDesignPanel(true); }}
              className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-500/10 to-indigo-600/10 border-2 border-blue-500/30 hover:border-blue-400 text-blue-300 hover:text-white font-semibold rounded-lg transition-all"
              title="Import, search, and open projects in the Design Center"
            >
              <Layers className="w-5 h-5" />
              Design Center
              {designProjects.length > 0 && (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-blue-500/20">{designProjects.length}</span>
              )}
            </button>

            {/* Labor Rates & Markups Button */}
            <button
              onClick={() => {
                console.log('🔘 Labor Rates button clicked!');
                console.log('🔘 Navigate function:', typeof navigate);
                try {
                  navigate('/labor-rates-config');
                  console.log('🔘 Navigate called successfully');
                } catch (error) {
                  console.error('🔘 Navigate error:', error);
                }
              }}
              className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-[#ea580c]/10 to-orange-600/10 border-2 border-[#ea580c]/30 hover:border-[#ea580c] text-[#ea580c] hover:text-white font-semibold rounded-lg transition-all hover:shadow-lg hover:shadow-[#ea580c]/20"
            >
              <Percent className="w-5 h-5" />
              Labor Rates & Markups
            </button>
            
            {/* Search */}
            <div className="relative w-96">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search projects, customers, or IDs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-black/60 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#ea580c] focus:border-transparent"
              />
            </div>

            {/* Source filter */}
            <div className="flex items-center gap-1 bg-black/60 border border-gray-700 rounded-lg p-1">
              {([
                { key: 'all', label: 'All Sources', Icon: Filter },
                { key: 'camera', label: 'Camera', Icon: Camera },
                { key: 'design-studio', label: 'Design', Icon: PenTool },
                { key: 'other', label: 'Other', Icon: CircleDot },
              ] as const).map(({ key, label, Icon }) => {
                const active = filterSource === key;
                const count = key === 'all'
                  ? items.length
                  : key === 'other'
                  ? items.filter(i => { const s = (i as any).source; return s !== 'camera' && s !== 'design-studio'; }).length
                  : items.filter(i => (i as any).source === key).length;
                return (
                  <button
                    key={key}
                    onClick={() => setFilterSource(key)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition ${
                      active ? 'bg-[#ea580c] text-white' : 'text-gray-400 hover:text-white hover:bg-white/5'
                    }`}
                    title={label}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span className="hidden md:inline">{label}</span>
                    <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${active ? 'bg-black/25' : 'bg-white/10'}`}>{count}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Per-source value rollup */}
      {(() => {
        const valOf = (i: any) => Number(i.quote?.totalCost || i.estimatedValue) || 0;
        const rollup = (pred: (i: any) => boolean) => {
          const list = items.filter(pred);
          return { count: list.length, value: list.reduce((s, i) => s + valOf(i), 0) };
        };
        const cards = [
          { key: 'total', label: 'Total Pipeline', Icon: TrendingUp, color: '#ea580c', ...rollup(() => true) },
          { key: 'camera', label: 'From Camera', Icon: Camera, color: '#fb923c', ...rollup(i => (i as any).source === 'camera') },
          { key: 'design-studio', label: 'From Design Studio', Icon: PenTool, color: '#60a5fa', ...rollup(i => (i as any).source === 'design-studio') },
          { key: 'other', label: 'Other Sources', Icon: CircleDot, color: '#94a3b8', ...rollup(i => { const s = (i as any).source; return s !== 'camera' && s !== 'design-studio'; }) },
        ];
        return (
          <div className="mb-6 grid grid-cols-2 lg:grid-cols-4 gap-4">
            {cards.map(({ key, label, Icon, color, count, value }) => (
              <div key={key} className="bg-[#1a1a1a] border border-gray-700 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Icon className="w-4 h-4" style={{ color }} />
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{label}</span>
                </div>
                <div className="text-2xl font-bold" style={{ color }}>${value.toLocaleString()}</div>
                <div className="text-xs text-gray-500 mt-1">{count} {count === 1 ? 'opportunity' : 'opportunities'}</div>
              </div>
            ))}
          </div>
        );
      })()}

      {/* Stage Progress Indicator */}
      <div className="mb-6 bg-[#1a1a1a] border border-gray-700 rounded-xl p-6">
        <h3 className="text-sm font-semibold text-gray-400 mb-4">PROJECT WORKFLOW STAGES</h3>
        <div className="flex items-center justify-between">
          {pipelineStages.map(({ stage, label, icon: Icon }, index) => {
            const stageItems = getItemsForStage(stage);
            const isActive = stageItems.length > 0;

            return (
              <div key={stage} className="flex items-center flex-1">
                <div className="flex flex-col items-center flex-1">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-2 transition-all ${
                    isActive
                      ? 'bg-gradient-to-br from-[#ea580c] to-orange-600 text-white shadow-lg shadow-[#ea580c]/30'
                      : 'bg-gray-800 text-gray-600'
                  }`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <div className="text-xs font-semibold text-center text-white">{label}</div>
                  <div className={`text-xs mt-1 px-2 py-0.5 rounded-full ${
                    isActive ? 'bg-[#ea580c]/20 text-[#ea580c]' : 'bg-gray-800 text-gray-600'
                  }`}>
                    {stageItems.length}
                  </div>
                </div>
                {index < pipelineStages.length - 1 && (
                  <ChevronRight className="w-5 h-5 text-gray-700 mx-2" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Kanban Board */}
      {items.length === 0 ? (
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center max-w-lg">
            <div className="w-20 h-20 bg-gradient-to-br from-[#ea580c]/20 to-orange-600/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <TrendingUp className="w-10 h-10 text-[#ea580c]" />
            </div>
            <h2 className="text-3xl font-bold mb-3">No Projects Yet</h2>
            <p className="text-gray-400 mb-6 leading-relaxed">
              Your pipeline will populate when a customer submits a work request. Create a real work request or review incoming intake records from the Command Center.
            </p>

          </div>
        </div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-gray-900">
          {pipelineStages.map(({ stage, label, color, icon: Icon }) => {
            const stageItems = getItemsForStage(stage);
            const totalValue = getTotalValue(stageItems);

            return (
              <div
                key={stage}
                className="flex-shrink-0 w-[340px]"
              >
              {/* Column Header */}
              <div className="bg-gradient-to-br from-[#1a1a1a] to-[#0a0a0a] border border-gray-700 rounded-lg p-3 mb-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-[#ea580c]/20 flex items-center justify-center">
                      <Icon className="w-4 h-4 text-[#ea580c]" />
                    </div>
                    <div>
                      <h3 className="font-bold text-white text-sm">{label}</h3>
                      <p className="text-xs text-gray-500">{stageItems.length} project{stageItems.length !== 1 ? 's' : ''}</p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-gray-800">
                  <span className="text-xs text-gray-500 uppercase font-semibold">Total</span>
                  <span className="text-sm font-bold text-green-400">${totalValue.toLocaleString()}</span>
                </div>
              </div>

              {/* Cards Container */}
              <div className="space-y-3 max-h-[calc(100vh-300px)] overflow-y-auto pr-2">
                {stageItems.length === 0 ? (
                  <div className="text-center py-12 bg-[#1a1a1a] border-2 border-dashed border-gray-800 rounded-xl">
                    <Icon className="w-12 h-12 mx-auto mb-3 text-gray-700" />
                    <p className="text-sm text-gray-500 font-medium">No projects in this stage</p>
                  </div>
                ) : (
                  stageItems.map((item) => {
                    return (
                      <div
                        key={item.id}
                        className="bg-gradient-to-br from-[#1a1a1a] to-[#0f0f0f] border border-gray-700 hover:border-[#ea580c]/50 rounded-lg overflow-hidden transition-all hover:shadow-lg hover:shadow-[#ea580c]/10"
                      >
                        {/* Card Header */}
                        <div className="p-3">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs font-mono text-[#ea580c]">{item.itemNumber}</span>
                                {(item as any).source && (
                                  <span
                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border"
                                    style={
                                      (item as any).source === 'camera'
                                        ? { background: 'rgba(234,88,12,0.15)', borderColor: 'rgba(234,88,12,0.4)', color: '#fb923c' }
                                        : (item as any).source === 'design-studio'
                                        ? { background: 'rgba(59,130,246,0.15)', borderColor: 'rgba(59,130,246,0.4)', color: '#60a5fa' }
                                        : { background: 'rgba(148,163,184,0.15)', borderColor: 'rgba(148,163,184,0.4)', color: '#94a3b8' }
                                    }
                                    title={`Source: ${(item as any).source}`}
                                  >
                                    {(item as any).source === 'camera' ? (
                                      <><Camera className="w-2.5 h-2.5" /> Camera</>
                                    ) : (item as any).source === 'design-studio' ? (
                                      <><PenTool className="w-2.5 h-2.5" /> Design Studio</>
                                    ) : (
                                      (item as any).source
                                    )}
                                  </span>
                                )}
                              </div>
                              <h4 className="font-bold text-white text-sm mb-1 leading-tight">{item.title}</h4>
                              <p className="text-xs text-gray-400 line-clamp-2 leading-relaxed">{item.description}</p>
                            </div>
                            <span className={`ml-2 flex-shrink-0 px-2 py-0.5 rounded-full text-xs font-bold border ${getPriorityColor(item.priority)}`}>
                              {item.priority.toUpperCase()}
                            </span>
                          </div>

                          {/* Customer & Service Info */}
                          <div className="space-y-1.5 mb-3 pb-3 border-b border-gray-800">
                            <div className="flex items-center gap-2 text-sm">
                              <User className="w-4 h-4 text-gray-500" />
                              <span className="text-white font-medium">{item.customerName}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                              <Wrench className="w-4 h-4 text-gray-500" />
                              <span className="text-gray-400">{item.serviceType}</span>
                            </div>
                            {item.location && (
                              <div className="flex items-center gap-2 text-sm">
                                <MapPin className="w-4 h-4 text-gray-500" />
                                <span className="text-gray-400 truncate">{item.location}</span>
                              </div>
                            )}
                          </div>

                          {/* Value */}
                          <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-2 mb-3">
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-green-400 font-semibold uppercase">Value</span>
                              <span className="text-lg font-bold text-green-400">
                                ${(item.quote?.totalCost || item.estimatedValue).toLocaleString()}
                              </span>
                            </div>
                          </div>

                          {/* Quote Info */}
                          {item.quote && (
                            <div className="flex items-center gap-2 mb-3 text-xs">
                              <div className="flex items-center gap-1 px-2 py-1 bg-blue-500/10 border border-blue-500/30 rounded text-blue-400">
                                <Package className="w-3 h-3" />
                                {item.quote.materials?.length || 0} Materials
                              </div>
                              <div className="flex items-center gap-1 px-2 py-1 bg-purple-500/10 border border-purple-500/30 rounded text-purple-400">
                                <Wrench className="w-3 h-3" />
                                {item.quote.labor?.length || 0} Labor Items
                              </div>
                            </div>
                          )}

                          {/* Media Indicators */}
                          {item.submission && (item.submission.photos.length > 0 || item.submission.videos.length > 0 || item.submission.plans.length > 0) && (
                            <div className="flex items-center gap-3 mb-4 text-xs">
                              {item.submission.photos.length > 0 && (
                                <span className="flex items-center gap-1 text-gray-500">
                                  <Image className="w-3 h-3" />
                                  {item.submission.photos.length} photos
                                </span>
                              )}
                              {item.submission.videos.length > 0 && (
                                <span className="flex items-center gap-1 text-gray-500">
                                  <Video className="w-3 h-3" />
                                  {item.submission.videos.length} videos
                                </span>
                              )}
                              {item.submission.plans.length > 0 && (
                                <span className="flex items-center gap-1 text-gray-500">
                                  <FileCheck className="w-3 h-3" />
                                  {item.submission.plans.length} plans
                                </span>
                              )}
                            </div>
                          )}

                          {/* Primary Action - ONE main action per stage */}
                          <div className="space-y-2">

                          {/* ── ALWAYS VISIBLE: Open split-screen quote + work request view ── */}
                          <button
                            onClick={() => handleEditQuote(item)}
                            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-gradient-to-r from-[#ea580c] to-orange-600 hover:from-orange-500 hover:to-orange-500 text-white rounded-lg text-xs font-bold transition-all shadow-lg shadow-orange-500/20"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            📋 Build Quote + View Request
                          </button>

                          {/* Quote Draft Stage */}
                          {stage === 'quote-draft' && (
                            <>
                              <button
                                onClick={() => handleEditQuote(item)}
                                className="hidden"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                                Edit Quote
                              </button>
                              <button
                                onClick={() => handleSendQuote(item)}
                                className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-black border border-gray-700 hover:border-purple-500 text-gray-300 hover:text-white rounded-lg text-xs font-semibold transition-all"
                              >
                                <Send className="w-3.5 h-3.5" />
                                Send to Customer
                              </button>
                            </>
                          )}

                          {/* Quote Sent Stage */}
                          {stage === 'quote-sent' && (
                            <>
                              <div className="w-full px-3 py-2 bg-purple-500/10 border border-purple-500/30 rounded-lg text-center">
                                <div className="flex items-center justify-center gap-2 text-xs text-purple-400 font-semibold">
                                  <Clock className="w-3.5 h-3.5" />
                                  Waiting for Customer
                                </div>
                              </div>
                              <button
                                onClick={() => handleSimulateQuoteApproval(item)}
                                className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-emerald-600 hover:to-green-600 text-white rounded-lg text-xs font-bold transition-all shadow-lg"
                              >
                                <CheckCircle className="w-3.5 h-3.5" />
                                Simulate Approval
                              </button>
                            </>
                          )}

                          {/* Quote Approved Stage */}
                          {stage === 'quote-approved' && (
                            <button
                              onClick={() => handleConvertToContract(item)}
                              className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-gradient-to-r from-[#ea580c] to-orange-600 hover:from-orange-600 hover:to-[#ea580c] text-white rounded-lg text-xs font-bold transition-all shadow-lg"
                            >
                              <FileSignature className="w-3.5 h-3.5" />
                              Create Contract
                            </button>
                          )}

                          {/* Contract Stage */}
                          {stage === 'contract' && (
                            <button
                              onClick={() => {
                                const projectData = {
                                  id: item.id,
                                  customerName: item.customerName,
                                  customerEmail: item.customerEmail,
                                  customerPhone: item.customerPhone,
                                  location: item.location,
                                  title: item.title,
                                  description: item.description,
                                  amount: item.estimatedValue,
                                  itemNumber: item.itemNumber
                                };
                                sessionStorage.setItem('pendingInvoiceData', JSON.stringify(projectData));
                                sessionStorage.setItem('invoiceReturnTo', 'pipeline');
                                navigate('/invoices?createNew=true');
                                toast.success('Opening invoice creator...');
                              }}
                              className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-blue-600 hover:to-cyan-500 text-white rounded-lg text-xs font-bold transition-all shadow-lg"
                            >
                              <DollarSign className="w-3.5 h-3.5" />
                              Create Invoice
                            </button>
                          )}

                          {/* Contract Stage — also allow creating a standalone quote */}
                          {stage === 'contract' && (
                            <button
                              onClick={() => handleEditQuote(item)}
                              className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-gradient-to-r from-purple-500 to-fuchsia-600 hover:from-fuchsia-600 hover:to-purple-500 text-white rounded-lg text-xs font-bold transition-all shadow-lg"
                            >
                              <FileText className="w-3.5 h-3.5" />
                              Create Quote
                            </button>
                          )}

                          {/* Invoice Stage */}
                          {stage === 'invoice' && (
                            <div className="w-full px-3 py-2 bg-green-500/10 border border-green-500/30 rounded-lg text-center">
                              <div className="flex items-center justify-center gap-2 text-xs text-green-400 font-semibold">
                                <CheckCircle className="w-3.5 h-3.5" />
                                Awaiting Payment
                              </div>
                            </div>
                          )}

                          {/* 💬 Message Customer — right on the card */}
                          <button
                            onClick={async () => {
                              setSelectedItem(item);
                              setShowMessagePanel(true);
                              // Notify customer their request was viewed
                              if (item.customerEmail) {
                                const { data: { session } } = await supabase.auth.getSession();
                                const token = session?.access_token || publicAnonKey;
                                fetch(
                                  `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6/work-requests/${item.id}/viewed`,
                                  { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ adminName: 'Black Phoenix Team', customerEmail: item.customerEmail, customerName: item.customerName }) }
                                ).catch(() => {});
                              }
                            }}
                            className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white rounded-lg text-xs font-bold transition-all shadow-lg shadow-blue-500/20"
                          >
                            💬 Message Customer
                          </button>

                          {/* View Full Work Request — photos, videos, all form data */}
                          {item.workRequest && (
                            <button
                              onClick={() => { setSelectedItem(item); setShowFullWorkRequest(true); }}
                              className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-gradient-to-r from-orange-600/20 to-red-600/20 hover:from-orange-600/30 hover:to-red-600/30 border border-orange-500/40 text-orange-300 rounded-lg text-xs font-bold transition-all"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              View Full Request + Media
                            </button>
                          )}
                          {/* Secondary Action - View Details */}
                          <button
                            onClick={() => handleViewProjectDetails(item)}
                            className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-black border border-gray-700 hover:border-gray-500 text-gray-400 hover:text-white rounded-lg text-xs font-medium transition-all"
                          >
                            <Maximize2 className="w-3.5 h-3.5" />
                            View Details
                          </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    )}

      {/* Quote Editor Modal */}
      {showQuoteEditor && selectedItem && (
        <QuoteToContractEditor
          workRequest={{
            ...convertToWorkRequest(selectedItem),
            // Pass the FULL raw work request so the drawer can show photos/videos
            _rawWorkRequest: selectedItem.workRequest || selectedItem,
          } as any}
          onClose={() => {
            setShowQuoteEditor(false);
            setSelectedItem(null);
          }}
          onSave={handleSaveQuote}
          onSendToCustomer={() => {
            if (selectedItem) handleSendQuote(selectedItem);
          }}
          onConvertToContract={() => {
            if (selectedItem) handleConvertToContract(selectedItem);
          }}
        />
      )}

      {/* Project Details Modal */}
      {showFullWorkRequest && selectedItem?.workRequest && (
        <WorkRequestFullView
          workRequest={selectedItem.workRequest}
          onClose={() => { setShowFullWorkRequest(false); }}
        />
      )}

      {/* Slide-in message panel */}
      {showMessagePanel && selectedItem && (
        <div className="fixed inset-0 z-50 flex justify-end" onClick={() => setShowMessagePanel(false)}>
          <div
            className="w-full max-w-md bg-[#0A0A0A] border-l border-[#2A2A2A] shadow-2xl flex flex-col h-full"
            onClick={e => e.stopPropagation()}
          >
            <PipelineMessagePanel
              workRequestId={selectedItem.id}
              customerName={selectedItem.customerName || 'Customer'}
              customerEmail={selectedItem.customerEmail || ''}
              customerPhone={selectedItem.customerPhone || (selectedItem as any).workRequest?.client_phone || ''}
              onClose={() => setShowMessagePanel(false)}
            />
          </div>
        </div>
      )}

      {showProjectDetails && selectedItem && (
        <ProjectDetailsModal
          item={selectedItem}
          initialTab={projectDetailsInitialTab}
          onClose={() => {
            setShowProjectDetails(false);
            setSelectedItem(null);
            setProjectDetailsInitialTab('overview'); // Reset to overview for next time
          }}
          onUpdate={(updatedItem) => {
            void saveItemToBackend(updatedItem).then((saved) => { setItems(items.map(i => i.id === saved.id ? saved : i)); toast.success('Project updated successfully!'); }).catch((error: any) => toast.error(error.message || 'Unable to save project update.'));
          }}
          onStageChange={(newStage) => {
            if (selectedItem) {
              const updatedItem = { ...selectedItem, stage: newStage as PipelineStage };
              void saveItemToBackend(updatedItem).then((saved) => { setItems(items.map(i => i.id === saved.id ? saved : i)); setSelectedItem(saved); toast.success(`Project moved to ${newStage}!`); }).catch((error: any) => toast.error(error.message || 'Unable to move project.'));
            }
          }}
          onOpenQuoteEditor={(item) => {
            // Close the details modal and open the quote editor
            setShowProjectDetails(false);
            setSelectedItem(item);
            setShowQuoteEditor(true);
          }}
        />
      )}

      {/* Auto-Generate Job Schedule Modal */}
      {showScheduleGenerator && scheduleGeneratorItem && (
        <AutoJobScheduleGenerator
          workOrder={{
            id: scheduleGeneratorItem.id,
            title: scheduleGeneratorItem.title,
            serviceType: scheduleGeneratorItem.serviceType,
            description: scheduleGeneratorItem.description,
            estimatedValue: scheduleGeneratorItem.estimatedValue,
            location: scheduleGeneratorItem.location
          }}
          onScheduleGenerated={handleScheduleGenerated}
          onCancel={() => {
            setShowScheduleGenerator(false);
            setScheduleGeneratorItem(null);
          }}
        />
      )}

      {/* Financial Data Sheet Modal */}
      {showFinancialSheet && financialSheetItem && (
        <FinancialDataSheet
          project={financialSheetItem}
          onClose={() => {
            setShowFinancialSheet(false);
            setFinancialSheetItem(null);
          }}
        />
      )}

      {/* Employee Notes Modal */}
      {showEmployeeNotes && employeeNotesItem && (
        <EmployeeNotes
          project={employeeNotesItem}
          onClose={() => {
            setShowEmployeeNotes(false);
            setEmployeeNotesItem(null);
          }}
          onSave={(notes) => {
            // Notes are saved to localStorage by the component
            toast.success('Notes saved successfully!');
          }}
        />
      )}

      {/* ── Design Center bridge panel ─────────────────────────────────────── */}
      {showDesignPanel && (() => {
        const q = designSearch.trim().toLowerCase();
        const importedIds = new Set(items.map(i => (i as any).designProjectId).filter(Boolean));
        const dps = designProjects.filter(dp =>
          !q || dp.name?.toLowerCase().includes(q) || dp.id.toLowerCase().includes(q)
        );
        const linkableItems = items.filter(i =>
          !q ||
          i.title?.toLowerCase().includes(q) ||
          i.customerName?.toLowerCase().includes(q) ||
          i.itemNumber?.toLowerCase().includes(q) ||
          i.id.toLowerCase().includes(q)
        );
        return (
          <div className="fixed inset-0 z-[120] flex items-start justify-center p-4 sm:p-8 overflow-y-auto" style={{ background: 'rgba(0,0,0,0.75)' }} onClick={() => setShowDesignPanel(false)}>
            <div className="w-full max-w-3xl bg-[#141414] border border-gray-700 rounded-2xl shadow-2xl" onClick={e => e.stopPropagation()}>
              {/* Header */}
              <div className="flex items-center gap-3 p-4 border-b border-gray-800">
                <Layers className="w-5 h-5 text-blue-400" />
                <div className="flex-1">
                  <h2 className="text-lg font-bold text-white">Design Center</h2>
                  <p className="text-xs text-gray-500">Search, import, and open projects across the pipeline and Design Center.</p>
                </div>
                <button onClick={() => openInDesignCenter()} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold text-blue-300 border border-blue-500/30 hover:bg-blue-500/10 transition">
                  <ExternalLink className="w-3.5 h-3.5" /> Open Design Center
                </button>
                <button onClick={() => setShowDesignPanel(false)} className="p-2 rounded-lg hover:bg-white/5"><X className="w-5 h-5 text-gray-400" /></button>
              </div>

              {/* Search */}
              <div className="p-4 border-b border-gray-800">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    autoFocus
                    value={designSearch}
                    onChange={e => setDesignSearch(e.target.value)}
                    placeholder="Search any project by name, customer, or ID…"
                    className="w-full pl-9 pr-3 py-2.5 bg-black/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="max-h-[60vh] overflow-y-auto p-4 space-y-6">
                {/* Design Center projects */}
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">In the Design Center ({dps.length})</p>
                  {dps.length === 0 ? (
                    <p className="text-sm text-gray-600 py-3">No matching design projects.</p>
                  ) : (
                    <div className="space-y-2">
                      {dps.map(dp => {
                        const imported = importedIds.has(dp.id);
                        const busy = designBusyId === dp.id;
                        return (
                          <div key={dp.id} className="flex items-center gap-3 p-3 rounded-xl bg-black/40 border border-gray-800">
                            <div className="w-9 h-9 rounded-lg bg-blue-500/15 flex items-center justify-center flex-shrink-0">
                              <PenTool className="w-4 h-4 text-blue-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-white truncate">{dp.name || 'Untitled Design'}</p>
                              <p className="text-xs text-gray-500">v{dp.version} · {dp.floorCount} floor(s) · {dp.elementCount} element(s) · {new Date(dp.updatedAt).toLocaleDateString()}</p>
                            </div>
                            <button onClick={() => openInDesignCenter(dp.id)} className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition" title="Open in Design Center">
                              <ExternalLink className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => importDesignProject(dp)}
                              disabled={busy}
                              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition disabled:opacity-50 ${imported ? 'text-green-400 border border-green-500/30' : 'text-white bg-blue-600 hover:bg-blue-500'}`}
                            >
                              {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : imported ? <CheckCircle className="w-3.5 h-3.5" /> : <Download className="w-3.5 h-3.5" />}
                              {imported ? 'In pipeline' : 'Import'}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Pipeline items → push out to Design Center */}
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">In the pipeline ({linkableItems.length})</p>
                  {linkableItems.length === 0 ? (
                    <p className="text-sm text-gray-600 py-3">No matching pipeline projects.</p>
                  ) : (
                    <div className="space-y-2">
                      {linkableItems.slice(0, 50).map(item => {
                        const linked = !!(item as any).designProjectId;
                        const busy = designBusyId === item.id;
                        return (
                          <div key={item.id} className="flex items-center gap-3 p-3 rounded-xl bg-black/40 border border-gray-800">
                            <div className="w-9 h-9 rounded-lg bg-orange-500/15 flex items-center justify-center flex-shrink-0">
                              <FileText className="w-4 h-4 text-orange-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-white truncate">{item.title}</p>
                              <p className="text-xs text-gray-500 truncate">{item.itemNumber} · {item.customerName || 'Design Project'}</p>
                            </div>
                            <button
                              onClick={() => sendToDesignCenter(item)}
                              disabled={busy}
                              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold text-blue-300 border border-blue-500/30 hover:bg-blue-500/10 transition disabled:opacity-50"
                            >
                              {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : linked ? <ExternalLink className="w-3.5 h-3.5" /> : <MoveRight className="w-3.5 h-3.5" />}
                              {linked ? 'Open in Design Center' : 'Send to Design Center'}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}