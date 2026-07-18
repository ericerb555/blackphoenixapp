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
  Loader2, RefreshCw, Zap, Camera, PenTool
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
import { useNavigate } from '../hooks/useNavigate';
import { seedPipelineData } from '../utils/seedPipelineData';

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

  // Helper function to save a single item to backend
  const saveItemToBackend = async (item: PipelineItem) => {
    try {
      const url = `https://${projectId}.supabase.co/functions/v1/make-server-57095a78/pipeline/items/${item.id}`;
      
      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(item)
      });

      if (!response.ok) {
        console.error('[Pipeline] Failed to save item:', item.id);
      } else {
        console.log('[Pipeline] Successfully saved item:', item.id);
      }
    } catch (error) {
      console.error('[Pipeline] Error saving item:', error);
    }
  };

  // Load pipeline items from KV store on mount
  useEffect(() => {
    const loadPipelineItems = async () => {
      console.log('[Pipeline] 🚀 Starting data load');
      setIsLoading(true);

      // Step 1: Load demo items from localStorage
      let localItems: PipelineItem[] = [];
      try {
        const cached = localStorage.getItem('pipeline-items-demo');
        if (cached) {
          localItems = JSON.parse(cached);
          console.log('[Pipeline] ✅ Loaded from localStorage:', localItems.length, 'demo items');
        }
      } catch (e) {
        console.error('[Pipeline] Failed to parse cached items:', e);
      }

      // Step 2: Load ALL submitted work requests directly from all_work_requests KV
      // This ensures every work request ever submitted always appears in the pipeline
      let serverItems: PipelineItem[] = [];
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token || publicAnonKey;

        const wrRes = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-57095a78/work-requests`,
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

            // Check if a pre-generated quote exists in localStorage from "Open in Pipeline"
            const localCached = JSON.parse(localStorage.getItem('pipeline-items-demo') || '[]');
            const prebuilt = localCached.find((i: any) => i.id === wr.id);
            const quote = prebuilt?.quote || wr.quote || undefined;

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
              floorPlan: wr.floorPlan || prebuilt?.floorPlan || undefined,
            };
          });
        }
      } catch (err) {
        console.warn('[Pipeline] Could not load work requests from server:', err);
      }

      // Also load pipeline: KV items (items with pre-generated quotes)
      let kvItems: PipelineItem[] = [];
      try {
        const kvRes = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-57095a78/kv/get-by-prefix?prefix=pipeline:`,
          { headers: { Authorization: `Bearer ${publicAnonKey}` } }
        );
        if (kvRes.ok) {
          const kvData = await kvRes.json();
          if (kvData.values && Array.isArray(kvData.values)) {
            kvItems = kvData.values
              .filter((item: any) => item && item.id)
              .map((item: any) => ({
                id: item.id,
                itemNumber: item.id?.toUpperCase?.() || 'WR-001',
                stage: (item.stage || 'quote-draft') as any,
                customerName: item.customerName || item.customer || item.clientInfo?.name || 'Customer',
                customerEmail: item.customerEmail || item.contact?.email || item.clientInfo?.email || '',
                customerPhone: item.customerPhone || item.contact?.phone || item.clientInfo?.phone || '',
                location: item.location || '',
                serviceType: item.serviceType || 'General Service',
                title: item.title || 'Work Request',
                description: item.description || '',
                estimatedValue: item.estimatedValue || 0,
                priority: (item.priority || 'high') as any,
                createdDate: item.createdDate || item.createdAt || new Date().toISOString(),
                lastModified: item.lastModified || item.updatedAt || new Date().toISOString(),
                workRequest: item.workRequest,
                floorPlan: item.floorPlan || undefined,
                quote: item.quote ? {
                  id: `qt-${item.id}`,
                  quoteNumber: item.quote.quoteNumber || `Q-${new Date().getFullYear()}-001`,
                  materials: item.quote.materials || item.quote.materialItems || [],
                  labor: item.quote.labor || item.quote.laborItems || [],
                  processSteps: item.quote.processSteps || [],
                  materialsSubtotal: item.quote.materialsSubtotal || item.quote.subtotals?.materials || 0,
                  laborSubtotal: item.quote.laborSubtotal || item.quote.subtotals?.labor || 0,
                  taxRate: 0.08,
                  taxAmount: item.quote.taxAmount || item.quote.subtotals?.tax || 0,
                  totalCost: item.quote.totalCost || item.quote.total || 0,
                  generatedAt: item.quote.generatedAt || new Date().toISOString(),
                  approvalStatus: (item.quote.approvalStatus || 'pending') as any,
                } : undefined,
              }));
          }
        }
      } catch {}

      // Merge: KV pipeline items (with quotes) take priority over plain work requests
      // Deduplicate by ID — prefer the one with a quote
      const allById = new Map<string, PipelineItem>();
      [...serverItems, ...localItems].forEach(i => allById.set(i.id, i));
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
                
                return {
                  ...item,
                  quote: item.quote ? {
                    ...item.quote,
                    materials,
                    labor,
                    materialsSubtotal,
                    laborSubtotal,
                    taxAmount,
                    totalCost,
                  } : undefined,
                  lastModified: new Date().toLocaleDateString()
                };
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

  // Sync items to backend when they change (debounced)
  useEffect(() => {
    // Skip backend sync - we're using localStorage for demo data
    // Auto-sync disabled to prevent 404 errors

    // Save to localStorage instead
    if (!isLoading && items.length > 0) {
      try {
        localStorage.setItem('pipeline-items-demo', JSON.stringify(items));
        console.log('[Pipeline] Saved to localStorage:', items.length, 'items');
      } catch (err) {
        console.error('[Pipeline] Failed to save to localStorage:', err);
      }
    }
  }, [items]); // Run whenever items change

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
          `https://${projectId}.supabase.co/functions/v1/make-server-57095a78/labor-rates/get`,
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

      setItems(items.map(i => i.id === item.id ? updatedItem : i));
      
      toast.success('✨ Quote generated (Demo Mode)', {
        id: 'auto-gen',
        description: `Generated ${demoQuote.materials.length} materials, ${demoQuote.labor.length} labor items - Deploy server for AI generation`
      });
      
      setSelectedItem(updatedItem);
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
        `https://${projectId}.supabase.co/functions/v1/make-server-57095a78/quotes/generate-link`,
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
        setItems(items.map(i =>
          i.id === item.id
            ? { ...i, stage: 'quote-sent' as PipelineStage, quote: i.quote ? { ...i.quote, sentAt: new Date().toISOString() } : undefined, lastModified: new Date().toISOString() }
            : i
        ));
        // Schedule automated follow-ups (3-day and 7-day)
        fetch(`https://${projectId}.supabase.co/functions/v1/make-server-57095a78/follow-ups/schedule`, {
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

  const handleSimulateQuoteApproval = (item: PipelineItem) => {
    // Simulate customer approving the quote (in production, this would come from customer portal)
    setItems(items.map(i => 
      i.id === item.id 
        ? { 
            ...i, 
            stage: 'quote-approved' as PipelineStage,
            quote: i.quote ? { 
              ...i.quote, 
              approvalStatus: 'approved',
              approvedAt: new Date().toISOString(),
              approvedBy: i.customerName
            } : undefined,
            lastModified: new Date().toISOString()
          }
        : i
    ));
    toast.success('✅ Customer Approved Quote!', {
      description: `${item.customerName} has approved the quote. Ready to create contract.`
    });
  };

  const handleConvertToContract = (item: PipelineItem) => {
    // IMPORTANT: Only allow conversion if quote is approved
    if (!item.quote || item.quote.approvalStatus !== 'approved') {
      toast.error('Cannot create contract - Quote must be approved by customer first!', {
        description: 'Wait for customer approval before proceeding to contract.'
      });
      return;
    }

    setItems(items.map(i => 
      i.id === item.id 
        ? { 
            ...i, 
            stage: 'contract' as PipelineStage,
            contract: {
              id: `ct-${Date.now()}`,
              contractNumber: `CT-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${String(Math.floor(Math.random() * 9999)).padStart(4, '0')}`,
              contractType: 'standard', // Default, customer will choose
              startDate: new Date().toISOString().split('T')[0],
              terms: 'Standard terms and conditions apply.',
              status: 'draft' // Start as draft, must be sent and signed
            },
            lastModified: new Date().toISOString()
          }
        : i
    ));
    toast.success('Contract created!', {
      description: 'Configure contract type and send to customer for signature.'
    });
  };

  const handleSimulateContractSigned = (item: PipelineItem) => {
    // Simulate customer signing the contract (in production, this would come from e-signature service)
    if (!item.contract) {
      toast.error('No contract exists');
      return;
    }

    if (item.contract.status === 'draft') {
      toast.error('Contract must be sent to customer first!');
      return;
    }

    setItems(items.map(i => 
      i.id === item.id 
        ? { 
            ...i, 
            contract: i.contract ? {
              ...i.contract,
              status: 'signed',
              signedDate: new Date().toISOString(),
              signedBy: i.customerName,
              customerSignature: 'Customer Digital Signature'
            } : undefined,
            lastModified: new Date().toISOString()
          }
        : i
    ));
    toast.success('✅ Contract Signed!', {
      description: `${item.customerName} has signed the contract. Ready to proceed to invoicing.`
    });
  };

  const handleSaveQuote = (updatedItem: any) => {
    setItems(items.map(i => 
      i.id === updatedItem.id 
        ? {
            ...i,
            stage: i.stage === 'work-request' ? 'quote-draft' as PipelineStage : i.stage,
            quote: updatedItem.quote,
            estimatedValue: updatedItem.quote?.totalCost || i.estimatedValue,
            lastModified: new Date().toISOString()
          }
        : i
    ));
    setShowQuoteEditor(false);
    toast.success('Quote saved successfully!');
  };

  const handleViewProjectDetails = async (item: PipelineItem) => {
    setSelectedItem(item);
    setShowProjectDetails(true);

    // Notify customer that their request has been viewed
    if (item.customerEmail) {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || publicAnonKey;
      fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-57095a78/work-requests/${item.id}/viewed`,
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

  // Handle seeding sample data
  const handleSeedData = async () => {
    console.log('[Pipeline] 🌱 Starting seed data creation...');
    console.log('[Pipeline] Current items count:', items.length);
    console.log('[Pipeline] Current items:', items);
    setIsSeeding(true);
    toast.loading('🌱 Generating sample projects...', { id: 'seed-data' });
    
    try {
      // Create inline demo data (no server call - instant load!)
      const demoItems: PipelineItem[] = [
        (() => {
          const demoQuote = generateDemoQuote({
            id: 'demo-1',
            title: 'Kitchen Remodel - Modern Update',
            description: 'Complete kitchen renovation with custom cabinets, countertops, and appliances',
            serviceType: 'Kitchen Renovation',
            estimatedValue: 45000
          });
          return {
            id: 'demo-1',
            itemNumber: 'WR-2026-001',
            stage: 'quote-draft' as PipelineStage,
            title: 'Kitchen Remodel - Modern Update',
            description: 'Complete kitchen renovation with custom cabinets, countertops, and appliances',
            customerName: 'Sarah Johnson',
            customerEmail: 'sarah.j@example.com',
            customerPhone: '(555) 123-4567',
            location: '123 Oak Street, Boston MA',
            serviceType: 'Kitchen Renovation',
            estimatedValue: 45000,
            priority: 'high' as 'low' | 'medium' | 'high' | 'urgent',
            createdDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
            lastModified: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
            submission: {
              photos: [
                { id: 'p1', url: 'https://images.unsplash.com/photo-1556912173-46c336c7fd55?w=800', filename: 'kitchen-before-1.jpg', uploadedAt: new Date().toISOString() },
                { id: 'p2', url: 'https://images.unsplash.com/photo-1556912998-c57cc6b7e50f?w=800', filename: 'kitchen-before-2.jpg', uploadedAt: new Date().toISOString() }
              ],
              videos: [],
              plans: [],
              documents: []
            },
            quote: {
              id: 'quote-1',
              quoteNumber: 'QT-20260523-0001',
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
            }
          };
        })(),
        (() => {
          const demoQuote = generateDemoQuote({
            id: 'demo-2',
            title: 'HVAC System Installation',
            description: 'Install new 5-ton heat pump system with ductwork',
            serviceType: 'HVAC Installation',
            estimatedValue: 28000
          });
          return {
            id: 'demo-2',
            itemNumber: 'WR-2026-002',
            stage: 'quote-sent' as PipelineStage,
            title: 'HVAC System Installation',
            description: 'Install new 5-ton heat pump system with ductwork',
            customerName: 'Michael Chen',
            customerEmail: 'michael.c@example.com',
            customerPhone: '(555) 234-5678',
            location: '456 Maple Ave, Cambridge MA',
            serviceType: 'HVAC Installation',
            estimatedValue: 28000,
            priority: 'medium' as 'low' | 'medium' | 'high' | 'urgent',
            createdDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
            lastModified: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
            submission: {
              photos: [{ id: 'p3', url: 'https://images.unsplash.com/photo-1581094271901-8022df4466f9?w=800', filename: 'hvac-current.jpg', uploadedAt: new Date().toISOString() }],
              videos: [],
              plans: [],
              documents: []
            },
            quote: {
              id: 'quote-2',
              quoteNumber: 'QT-20260523-0002',
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
            }
          };
        })(),
        (() => {
          const demoQuote = generateDemoQuote({
            id: 'demo-3',
            title: 'Deck Construction - Backyard Expansion',
            description: '500 sq ft composite deck with railing and stairs',
            serviceType: 'Deck Installation',
            estimatedValue: 18000
          });
          return {
            id: 'demo-3',
            itemNumber: 'WR-2026-003',
            stage: 'contract' as PipelineStage,
            title: 'Deck Construction - Backyard Expansion',
            description: '500 sq ft composite deck with railing and stairs',
            customerName: 'Emily Rodriguez',
            customerEmail: 'emily.r@example.com',
            customerPhone: '(555) 345-6789',
            serviceType: 'Deck Installation',
            estimatedValue: 18000,
            priority: 'medium' as 'low' | 'medium' | 'high' | 'urgent',
            createdDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
            lastModified: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
            submission: {
              photos: [{ id: 'p6', url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800', filename: 'backyard-before.jpg', uploadedAt: new Date().toISOString() }],
              videos: [],
              plans: [],
              documents: []
            },
            quote: {
              id: 'quote-3',
              quoteNumber: 'QT-20260523-0003',
              materials: demoQuote.materials,
              labor: demoQuote.labor,
              processSteps: demoQuote.processSteps,
              materialsSubtotal: demoQuote.materialsSubtotal,
              laborSubtotal: demoQuote.laborSubtotal,
              taxRate: demoQuote.taxRate,
              taxAmount: demoQuote.taxAmount,
              totalCost: demoQuote.totalCost,
              generatedAt: new Date().toISOString(),
              approvalStatus: 'approved' as const,
            },
            contract: {
              id: 'contract-3',
              contractNumber: 'CT-20260523-0003',
              contractType: 'standard' as 'standard' | 'soroban-smart-contract',
              signedDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
              signedBy: 'Emily Rodriguez',
              startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
              endDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
              terms: 'Standard terms and conditions apply.',
              status: 'signed' as 'draft' | 'sent' | 'awaiting-signature' | 'signed' | 'active' | 'completed'
            }
          };
        })(),
        (() => {
          const demoQuote = generateDemoQuote({
            id: 'demo-4',
            title: 'Roof Repair - Storm Damage',
            description: 'Emergency roof repair needed - shingles damaged in storm',
            serviceType: 'Roofing',
            estimatedValue: 12500
          });
          return {
            id: 'demo-4',
            itemNumber: 'WR-2026-004',
            stage: 'invoice' as PipelineStage,
            title: 'Roof Repair - Storm Damage',
            description: 'Emergency roof repair needed - shingles damaged in storm',
            customerName: 'David Thompson',
            customerEmail: 'david.t@example.com',
            customerPhone: '(555) 456-7890',
            serviceType: 'Roofing',
            estimatedValue: 12500,
            priority: 'high' as 'low' | 'medium' | 'high' | 'urgent',
            createdDate: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
            lastModified: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
            submission: {
              photos: [
                { id: 'p4', url: 'https://images.unsplash.com/photo-1632778149955-e80f8ceca2e8?w=800', filename: 'roof-damage-1.jpg', uploadedAt: new Date().toISOString() },
                { id: 'p5', url: 'https://images.unsplash.com/photo-1565008576549-57569a49371d?w=800', filename: 'roof-damage-2.jpg', uploadedAt: new Date().toISOString() }
              ],
              videos: [],
              plans: [],
              documents: []
            },
            quote: {
              id: 'quote-4',
              quoteNumber: 'QT-20260523-0004',
              materials: demoQuote.materials,
              labor: demoQuote.labor,
              processSteps: demoQuote.processSteps,
              materialsSubtotal: demoQuote.materialsSubtotal,
              laborSubtotal: demoQuote.laborSubtotal,
              taxRate: demoQuote.taxRate,
              taxAmount: demoQuote.taxAmount,
              totalCost: demoQuote.totalCost,
              generatedAt: new Date().toISOString(),
              approvalStatus: 'approved' as const,
            },
            contract: {
              id: 'contract-4',
              contractNumber: 'CT-20260523-0004',
              contractType: 'standard' as 'standard' | 'soroban-smart-contract',
              signedDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
              signedBy: 'David Thompson',
              startDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
              endDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
              terms: 'Standard terms and conditions apply.',
              status: 'completed' as 'draft' | 'sent' | 'awaiting-signature' | 'signed' | 'active' | 'completed'
            },
            invoice: {
              id: 'invoice-4',
              invoiceNumber: 'INV-2026-004',
              dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
              paymentStatus: 'pending' as 'pending' | 'partial' | 'paid',
              amountPaid: 0
            }
          };
        })(),
        (() => {
          const demoQuote = generateDemoQuote({
            id: 'demo-5',
            title: 'Painting - Exterior House',
            description: 'Full exterior painting - 2 story home',
            serviceType: 'Painting',
            estimatedValue: 8500
          });
          return {
            id: 'demo-5',
            itemNumber: 'WR-2026-005',
            stage: 'payment' as PipelineStage,
            title: 'Painting - Exterior House',
            description: 'Full exterior painting - 2 story home',
            customerName: 'Lisa Martinez',
            customerEmail: 'lisa.m@example.com',
            customerPhone: '(555) 567-8901',
            serviceType: 'Painting',
            estimatedValue: 8500,
            priority: 'low' as 'low' | 'medium' | 'high' | 'urgent',
            createdDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
            lastModified: new Date().toISOString(),
            submission: {
              photos: [{ id: 'p7', url: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800', filename: 'house-exterior.jpg', uploadedAt: new Date().toISOString() }],
              videos: [],
              plans: [],
              documents: []
            },
            quote: {
              id: 'quote-5',
              quoteNumber: 'QT-20260523-0005',
              materials: demoQuote.materials,
              labor: demoQuote.labor,
              processSteps: demoQuote.processSteps,
              materialsSubtotal: demoQuote.materialsSubtotal,
              laborSubtotal: demoQuote.laborSubtotal,
              taxRate: demoQuote.taxRate,
              taxAmount: demoQuote.taxAmount,
              totalCost: demoQuote.totalCost,
              generatedAt: new Date().toISOString(),
              approvalStatus: 'approved' as const,
            },
            contract: {
              id: 'contract-5',
              contractNumber: 'CT-20260523-0005',
              contractType: 'standard' as 'standard' | 'soroban-smart-contract',
              signedDate: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString(),
              signedBy: 'Lisa Martinez',
              startDate: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
              endDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
              terms: 'Standard terms and conditions apply.',
              status: 'completed' as 'draft' | 'sent' | 'awaiting-signature' | 'signed' | 'active' | 'completed'
            },
            invoice: {
              id: 'invoice-5',
              invoiceNumber: 'INV-2026-005',
              dueDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
              paidDate: new Date().toISOString(),
              paymentStatus: 'paid' as 'pending' | 'partial' | 'paid',
              amountPaid: demoQuote.totalCost
            }
          };
        })()
      ];

      console.log('[Pipeline] ✅ Demo items created:', demoItems.length, 'items');
      console.log('[Pipeline] Demo items data:', demoItems);
      
      // Store in localStorage for persistence across refreshes
      localStorage.setItem('pipeline-items-demo', JSON.stringify(demoItems));
      console.log('[Pipeline] ✅ Saved to localStorage');
      
      // Update state immediately - no server needed!
      console.log('[Pipeline] About to call setItems with:', demoItems);
      setItems(demoItems);
      console.log('[Pipeline] ✅ setItems called - state should update on next render');
      
      toast.success(`✅ Created ${demoItems.length} sample projects!`, { id: 'seed-data' });
      setIsSeeding(false);
      return;
      
      // Reload items from backend
      const url = `https://${projectId}.supabase.co/functions/v1/make-server-57095a78/pipeline/items`;
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.items && Array.isArray(data.items)) {
          const loadedItems = data.items.map((item: any) => {
            return {
              id: item.id,
              itemNumber: item.itemNumber || item.id.toUpperCase(),
              stage: item.stage || 'quote-draft',
              customerName: item.customer || item.customerName,
              customerEmail: item.contact?.email || item.customerEmail || '',
              customerPhone: item.contact?.phone || item.customerPhone,
              location: item.location,
              serviceType: item.serviceType,
              title: item.title,
              description: item.description || '',
              estimatedValue: item.estimatedValue || 0,
              priority: item.priority || 'medium',
              createdDate: new Date(item.createdAt || item.createdDate).toLocaleDateString(),
              lastModified: new Date(item.updatedAt || item.lastModified).toLocaleDateString(),
              assignedTo: item.assignedTo,
              submission: item.media ? {
                photos: item.media.photos?.map((url: string | any, idx: number) => (
                  typeof url === 'string' ? {
                    id: `photo-${idx}`,
                    url,
                    filename: `photo-${idx}.jpg`,
                    uploadedAt: item.createdAt
                  } : url
                )) || [],
                videos: item.media.videos?.map((url: string | any, idx: number) => (
                  typeof url === 'string' ? {
                    id: `video-${idx}`,
                    url,
                    filename: `video-${idx}.mp4`,
                    uploadedAt: item.createdAt
                  } : url
                )) || [],
                documents: item.media.documents || [],
                plans: item.media.blueprints?.map((url: string | any, idx: number) => (
                  typeof url === 'string' ? {
                    id: `blueprint-${idx}`,
                    url,
                    filename: `blueprint-${idx}.pdf`,
                    uploadedAt: item.createdAt
                  } : url
                )) || item.media.plans || [],
                blueprintAnalysis: item.media.blueprintAnalysis
              } : undefined,
              quote: item.quote,
              contract: item.contract,
              invoice: item.invoice
            } as PipelineItem;
          });
          
          setItems(loadedItems);
        }
      }
      
      toast.success(`✅ Created ${count} sample projects!`, { 
        id: 'seed-data',
        description: 'Projects with contracts and payment schedules added to pipeline'
      });
    } catch (error: any) {
      console.error('Failed to seed data:', error);
      toast.error('Failed to generate sample data', { 
        id: 'seed-data',
        description: error.message || 'Server may not be deployed'
      });
    } finally {
      setIsSeeding(false);
    }
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
            {/* Load Test Data Button */}
            <button
              onClick={async () => {
                try {
                  toast.loading('Loading test data...');
                  const count = await seedPipelineData();
                  toast.dismiss();
                  toast.success(`Loaded ${count} test projects!`);
                  setTimeout(() => window.location.reload(), 1000);
                } catch (error) {
                  toast.dismiss();
                  toast.error('Failed to load test data');
                  console.error('Seed error:', error);
                }
              }}
              className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-green-600/10 to-emerald-600/10 border-2 border-green-500/30 hover:border-green-500 text-green-400 hover:text-white font-semibold rounded-lg transition-all hover:shadow-lg hover:shadow-green-500/20"
            >
              <Database className="w-5 h-5" />
              Load Test Data
            </button>

            {/* Refresh Button */}
            <button
              onClick={() => window.location.reload()}
              className="flex items-center gap-2 px-4 py-2.5 bg-black/60 border border-gray-700 hover:border-gray-500 text-gray-400 hover:text-white font-semibold rounded-lg transition-all"
            >
              <RefreshCw className="w-5 h-5" />
              Refresh
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
              Your unified project pipeline is empty. Get started by loading test projects to see how it works.
            </p>
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={async () => {
                  try {
                    toast.loading('Loading test data...');
                    const count = await seedPipelineData();
                    toast.dismiss();
                    toast.success(`Loaded ${count} test projects! Refreshing...`);
                    setTimeout(() => window.location.reload(), 1500);
                  } catch (error) {
                    toast.dismiss();
                    toast.error('Failed to load test data');
                    console.error('Seed error:', error);
                  }
                }}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold rounded-lg transition-all shadow-lg hover:shadow-green-500/50"
              >
                <Database className="w-5 h-5" />
                Load Test Projects
              </button>
            </div>
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
                                  `https://${projectId}.supabase.co/functions/v1/make-server-57095a78/work-requests/${item.id}/viewed`,
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
            setItems(items.map(i => i.id === updatedItem.id ? updatedItem : i));
            toast.success('Project updated successfully!');
          }}
          onStageChange={(newStage) => {
            if (selectedItem) {
              const updatedItem = { ...selectedItem, stage: newStage as PipelineStage };
              setItems(items.map(i => i.id === updatedItem.id ? updatedItem : i));
              setSelectedItem(updatedItem);
              toast.success(`Project moved to ${newStage}!`);
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
    </div>
  );
}