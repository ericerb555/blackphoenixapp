/**
 * Unified Project Pipeline - THE ONE WORKFLOW FOR EVERYTHING
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
  Loader2, RefreshCw, Zap
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { BackToDashboard } from '../components/BackToDashboard';
import { QuoteToContractEditor } from '../components/QuoteToContractEditor';
import { ProjectDetailsModal } from '../components/ProjectDetailsModal';
import AutoJobScheduleGenerator from '../components/AutoJobScheduleGenerator';
import { projectId, publicAnonKey } from '../utils/supabase/info';
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
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItem, setSelectedItem] = useState<PipelineItem | null>(null);
  const [showQuoteEditor, setShowQuoteEditor] = useState(false);
  const [showProjectDetails, setShowProjectDetails] = useState(false);
  const [projectDetailsInitialTab, setProjectDetailsInitialTab] = useState<'overview' | 'submission' | 'quote' | 'design' | 'materials' | 'contract' | 'invoice'>('overview');
  const [showContractView, setShowContractView] = useState(false);
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const [showScheduleGenerator, setShowScheduleGenerator] = useState(false);
  const [scheduleGeneratorItem, setScheduleGeneratorItem] = useState<PipelineItem | null>(null);

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
      
      // Check localStorage FIRST (instant load, no server call)
      try {
        const cached = localStorage.getItem('pipeline-items-demo');
        if (cached) {
          const cachedItems = JSON.parse(cached);
          console.log('[Pipeline] ✅ Loaded from localStorage:', cachedItems.length, 'items');
          setItems(cachedItems);
          setIsLoading(false);
          return; // Exit early - we have data!
        }
      } catch (e) {
        console.error('[Pipeline] Failed to parse cached items:', e);
      }
      
      // No cached data - show empty state
      console.log('[Pipeline] No cached data - showing empty state');
      setItems([]);
      setIsLoading(false);
      
      // TEMPORARY: Skip server call to prevent CORS errors
      // Will be restored after server CORS is fixed
      return;
      
      // === OLD SERVER CODE (disabled) ===
      /*
      // Safety timeout - if loading takes more than 5 seconds, stop loading
      const timeout = setTimeout(() => {
        console.warn('[Pipeline] ⚠️ Loading timeout - stopping loader');
        setIsLoading(false);
      }, 5000);
      
      try {
        const url = `https://${projectId}.supabase.co/functions/v1/make-server-57095a78/pipeline/items`;
        
        console.log('[Pipeline] Loading items from:', url);
        
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          }
        });

        console.log('[Pipeline] Response status:', response.status, response.statusText);

        if (response.ok) {
          const data = await response.json();
          
          console.log('[Pipeline] Response data:', data);
          
          if (data.success && data.items && Array.isArray(data.items) && data.items.length > 0) {
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
                createdDate: new Date(item.createdAt).toLocaleDateString(),
                lastModified: new Date(item.updatedAt).toLocaleDateString(),
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
                quote: item.quote ? {
                  id: item.quote.id || `qt-${item.id}`,
                  quoteNumber: item.quote.quoteNumber || `QT-${new Date(item.quote.generatedAt).toISOString().slice(0, 10).replace(/-/g, '')}-${String(Math.floor(Math.random() * 9999)).padStart(4, '0')}`,
                  materials: item.quote.materialItems || item.quote.materials || [],
                  labor: item.quote.laborItems || item.quote.labor || [],
                  processSteps: item.quote.processSteps || [],
                  materialsSubtotal: item.quote.subtotals?.materials || 0,
                  laborSubtotal: item.quote.subtotals?.labor || 0,
                  taxRate: item.quote.taxRate || 0.08,
                  taxAmount: item.quote.taxAmount || item.quote.subtotals?.tax || 0,
                  totalCost: item.quote.totalCost || item.quote.total || 0,
                  generatedAt: item.quote.generatedAt,
                  sentAt: item.quote.sentAt,
                  approvedAt: item.quote.approvedAt,
                  approvedBy: item.quote.approvedBy,
                  rejectedAt: item.quote.rejectedAt,
                  rejectionReason: item.quote.rejectionReason,
                  expiryDate: item.quote.expiryDate,
                  customerViewedAt: item.quote.customerViewedAt,
                  approvalStatus: item.quote.approvalStatus || item.quote.status || 'pending',
                  laborRates: item.quote.laborRates,
                  profitSettings: item.quote.profitSettings
                } : undefined,
                contract: item.contract ? {
                  id: item.contract.id,
                  contractNumber: item.contract.contractNumber,
                  contractType: item.contract.contractType || 'standard',
                  contractTypeSelectedAt: item.contract.contractTypeSelectedAt,
                  signedDate: item.contract.signedDate,
                  signedBy: item.contract.signedBy,
                  customerSignature: item.contract.customerSignature,
                  companySignature: item.contract.companySignature,
                  startDate: item.contract.startDate,
                  endDate: item.contract.endDate,
                  terms: item.contract.terms,
                  status: item.contract.status,
                  sentAt: item.contract.sentAt,
                  customerViewedAt: item.contract.customerViewedAt,
                  paymentSchedule: item.contract.paymentSchedule,
                  sorobanContractId: item.contract.sorobanContractId,
                  sorobanTransactionHash: item.contract.sorobanTransactionHash
                } : undefined,
                invoice: item.invoice ? {
                  id: item.invoice.id,
                  invoiceNumber: item.invoice.invoiceNumber,
                  dueDate: item.invoice.dueDate,
                  sentDate: item.invoice.sentDate,
                  paidDate: item.invoice.paidDate,
                  paymentStatus: item.invoice.paymentStatus,
                  amountPaid: item.invoice.amountPaid
                } : undefined
              } as PipelineItem;
            });

            setItems(loadedItems);
            console.log(`✅ Loaded ${loadedItems.length} project(s) from database`);
            clearTimeout(timeout);
            setIsLoading(false);
            return; // Successfully loaded from server
          } else {
            console.log('📊 No pipeline items in database yet');
            clearTimeout(timeout);
            setIsLoading(false);
            return; // Successfully connected, just no items yet
          }
        } else {
          console.log('❌ Server response not ok:', response.status);
          clearTimeout(timeout);
          setIsLoading(false);
        }
      } catch (error) {
        console.log('Server not accessible, checking localStorage...', error);
        clearTimeout(timeout);
      }

      // Fallback: try loading from localStorage
      try {
        const localItems: PipelineItem[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith('pipeline_')) {
            const itemData = localStorage.getItem(key);
            if (itemData) {
              const item = JSON.parse(itemData);
              // Transform the item similar to the server response
              localItems.push({
                id: item.id,
                itemNumber: item.id.toUpperCase(),
                stage: item.stage || 'quote-draft',
                customerName: item.customer,
                customerEmail: item.contact?.email || '',
                customerPhone: item.contact?.phone,
                location: item.location,
                serviceType: item.serviceType,
                title: item.title,
                description: item.description || '',
                estimatedValue: item.estimatedValue || 0,
                priority: item.priority || 'medium',
                createdDate: new Date(item.createdAt).toLocaleDateString(),
                lastModified: new Date(item.updatedAt).toLocaleDateString(),
                assignedTo: item.assignedTo,
                submission: item.media ? {
                  photos: item.media.photos?.map((url: string, idx: number) => ({
                    id: `photo-${idx}`,
                    url,
                    filename: `photo-${idx}.jpg`,
                    uploadedAt: item.createdAt
                  })) || [],
                  videos: item.media.videos?.map((url: string, idx: number) => ({
                    id: `video-${idx}`,
                    url,
                    filename: `video-${idx}.mp4`,
                    uploadedAt: item.createdAt
                  })) || [],
                  documents: [],
                  plans: item.media.blueprints?.map((url: string, idx: number) => ({
                    id: `blueprint-${idx}`,
                    url,
                    filename: `blueprint-${idx}.pdf`,
                    uploadedAt: item.createdAt
                  })) || [],
                  blueprintAnalysis: item.media.blueprintAnalysis
                } : undefined,
                quote: item.quote ? {
                  id: item.quote.id,
                  quoteNumber: item.quote.quoteNumber,
                  materials: item.quote.materialItems || [],
                  labor: item.quote.laborItems || [],
                  processSteps: [],
                  materialsSubtotal: item.quote.subtotals?.materials || 0,
                  laborSubtotal: item.quote.subtotals?.labor || 0,
                  taxRate: item.quote.taxRate || 0.08,
                  taxAmount: item.quote.taxAmount || 0,
                  totalCost: item.quote.totalCost || 0,
                  generatedAt: item.quote.generatedAt,
                  sentAt: item.quote.sentAt,
                  approvedAt: item.quote.approvedAt,
                  approvedBy: item.quote.approvedBy,
                  expiryDate: item.quote.expiryDate,
                  customerViewedAt: item.quote.customerViewedAt,
                  approvalStatus: item.quote.approvalStatus || 'pending',
                  profitSettings: item.quote.profitSettings
                } : undefined,
                contract: item.contract,
                invoice: item.invoice
              } as PipelineItem);
            }
          }
        }
        
        if (localItems.length > 0) {
          setItems(localItems);
          console.log(`📦 Loaded ${localItems.length} project(s) from browser storage`);
        }
      } catch (localError) {
        console.log('No pipeline data found in localStorage either');
      }
      
      clearTimeout(timeout);
      setIsLoading(false);
      console.log('[Pipeline] ✅ Loading complete, isLoading set to false');
      */
      // === END OLD SERVER CODE ===
    };

    loadPipelineItems();
  }, []);

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
    // Skip if still loading initial data or no items
    if (isLoading || items.length === 0) {
      return;
    }

    // Debounce the save to avoid too many requests
    const timeoutId = setTimeout(async () => {
      console.log('[Pipeline] Auto-syncing items to backend...');
      
      // Save each item
      for (const item of items) {
        await saveItemToBackend(item);
      }
      
      console.log('[Pipeline] Auto-sync complete');
    }, 1000); // Wait 1 second after last change

    return () => clearTimeout(timeoutId);
  }, [items]); // Run whenever items change

  // Convert PipelineItem to WorkRequest format for the editor
  const convertToWorkRequest = (item: PipelineItem) => {
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
      quote: item.quote || undefined
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

  const handleSendQuote = (item: PipelineItem) => {
    // Can only send quotes that are in draft stage
    if (item.stage !== 'quote-draft') {
      toast.error('Can only send quotes in draft stage');
      return;
    }
    
    setItems(items.map(i => 
      i.id === item.id 
        ? { 
            ...i, 
            stage: 'quote-sent' as PipelineStage,
            quote: i.quote ? { ...i.quote, sentAt: new Date().toISOString() } : undefined,
            lastModified: new Date().toISOString()
          }
        : i
    ));
    toast.success('Quote sent to customer!', {
      description: 'Customer will receive an email to review and approve the quote.'
    });
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

  const handleViewProjectDetails = (item: PipelineItem) => {
    setSelectedItem(item);
    setShowProjectDetails(true);
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
        {
          id: 'demo-1',
          itemNumber: 'WR-2026-001',
          stage: 'quote-draft',
          title: 'Kitchen Remodel - Modern Update',
          description: 'Complete kitchen renovation with custom cabinets, countertops, and appliances',
          customerName: 'Sarah Johnson',
          customerEmail: 'sarah.j@example.com',
          customerPhone: '(555) 123-4567',
          serviceType: 'Kitchen Renovation',
          estimatedValue: 45000,
          priority: 'high',
          createdDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toLocaleDateString(),
          lastModified: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toLocaleDateString(),
          submission: {
            photos: [
              { id: 'p1', url: 'https://images.unsplash.com/photo-1556912173-46c336c7fd55?w=800', filename: 'kitchen-before-1.jpg', uploadedAt: new Date().toISOString() },
              { id: 'p2', url: 'https://images.unsplash.com/photo-1556912998-c57cc6b7e50f?w=800', filename: 'kitchen-before-2.jpg', uploadedAt: new Date().toISOString() }
            ],
            videos: [],
            plans: [],
            documents: []
          }
        },
        {
          id: 'demo-2',
          itemNumber: 'WR-2026-002',
          stage: 'quote-sent',
          title: 'Bathroom Renovation - Master Suite',
          description: 'Master bathroom upgrade with walk-in shower and modern fixtures',
          customerName: 'Michael Chen',
          customerEmail: 'michael.c@example.com',
          customerPhone: '(555) 234-5678',
          serviceType: 'Bathroom Remodel',
          estimatedValue: 28000,
          priority: 'medium',
          createdDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toLocaleDateString(),
          lastModified: new Date(Date.now() - 12 * 60 * 60 * 1000).toLocaleDateString(),
          submission: {
            photos: [{ id: 'p3', url: 'https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?w=800', filename: 'bathroom-current.jpg', uploadedAt: new Date().toISOString() }],
            videos: [],
            plans: [],
            documents: []
          },
          quote: {
            id: 'quote-2',
            totalCost: 28500,
            validUntil: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
            items: []
          }
        },
        {
          id: 'demo-3',
          itemNumber: 'WR-2026-003',
          stage: 'contract',
          title: 'Deck Construction - Backyard Expansion',
          description: '500 sq ft composite deck with railing and stairs',
          customerName: 'Emily Rodriguez',
          customerEmail: 'emily.r@example.com',
          customerPhone: '(555) 345-6789',
          serviceType: 'Deck Installation',
          estimatedValue: 18000,
          priority: 'medium',
          createdDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toLocaleDateString(),
          lastModified: new Date(Date.now() - 6 * 60 * 60 * 1000).toLocaleDateString(),
          submission: {
            photos: [{ id: 'p6', url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800', filename: 'backyard-before.jpg', uploadedAt: new Date().toISOString() }],
            videos: [],
            plans: [],
            documents: []
          },
          quote: {
            id: 'quote-3',
            totalCost: 18200,
            validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            items: []
          },
          contract: {
            id: 'contract-3',
            signedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
            startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            completionDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString()
          }
        },
        {
          id: 'demo-4',
          itemNumber: 'WR-2026-004',
          stage: 'invoice',
          title: 'Roof Repair - Storm Damage',
          description: 'Emergency roof repair needed - shingles damaged in storm',
          customerName: 'David Thompson',
          customerEmail: 'david.t@example.com',
          customerPhone: '(555) 456-7890',
          serviceType: 'Roofing',
          estimatedValue: 12500,
          priority: 'high',
          createdDate: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toLocaleDateString(),
          lastModified: new Date(Date.now() - 2 * 60 * 60 * 1000).toLocaleDateString(),
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
            totalCost: 12800,
            validUntil: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
            items: []
          },
          contract: {
            id: 'contract-4',
            signedAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
            startDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
            completionDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
          },
          invoice: {
            id: 'invoice-4',
            invoiceNumber: 'INV-2026-004',
            dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
            totalAmount: 12800
          }
        },
        {
          id: 'demo-5',
          itemNumber: 'WR-2026-005',
          stage: 'payment',
          title: 'Painting - Exterior House',
          description: 'Full exterior painting - 2 story home',
          customerName: 'Lisa Martinez',
          customerEmail: 'lisa.m@example.com',
          customerPhone: '(555) 567-8901',
          serviceType: 'Painting',
          estimatedValue: 8500,
          priority: 'low',
          createdDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toLocaleDateString(),
          lastModified: new Date().toLocaleDateString(),
          submission: {
            photos: [{ id: 'p7', url: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800', filename: 'house-exterior.jpg', uploadedAt: new Date().toISOString() }],
            videos: [],
            plans: [],
            documents: []
          },
          quote: {
            id: 'quote-5',
            totalCost: 8500,
            validUntil: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
            items: []
          },
          contract: {
            id: 'contract-5',
            signedAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString(),
            startDate: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
            completionDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString()
          },
          invoice: {
            id: 'invoice-5',
            invoiceNumber: 'INV-2026-005',
            dueDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
            totalAmount: 8500
          },
          payment: {
            id: 'payment-5',
            paidAt: new Date().toISOString(),
            amount: 8500,
            method: 'Credit Card'
          }
        }
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
          </div>
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
              Your unified project pipeline is empty. Get started by adding customers and creating projects as they come in.
            </p>
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={() => navigate('/customers')}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#ea580c] to-orange-600 hover:from-orange-600 hover:to-[#ea580c] text-white font-bold rounded-lg transition-all shadow-lg hover:shadow-[#ea580c]/50"
              >
                <Plus className="w-5 h-5" />
                Add Customer
              </button>
            </div>
            <div className="mt-8 p-4 bg-[#1a1a1a] border border-gray-700 rounded-lg">
              <h3 className="text-sm font-semibold text-gray-300 mb-2">What is the Unified Pipeline?</h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                This is your central command center for managing projects through every stage: from initial quote drafts, 
                to sending quotes to customers, tracking approvals, creating contracts, generating invoices, and tracking payments. 
                All with inline actions, materials searching, design integration, and full visibility into customer submissions.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {pipelineStages.map(({ stage, label, color, icon: Icon }) => {
            const stageItems = getItemsForStage(stage);
            const totalValue = getTotalValue(stageItems);
            
            // Color mapping for stage headers
            const colorClasses = {
              blue: { bg: 'from-blue-500/10 to-blue-600/10', text: 'text-blue-400', badge: 'bg-blue-500/20 border-blue-500/30 text-blue-400' },
              yellow: { bg: 'from-yellow-500/10 to-yellow-600/10', text: 'text-yellow-400', badge: 'bg-yellow-500/20 border-yellow-500/30 text-yellow-400' },
              purple: { bg: 'from-purple-500/10 to-purple-600/10', text: 'text-purple-400', badge: 'bg-purple-500/20 border-purple-500/30 text-purple-400' },
              green: { bg: 'from-green-500/10 to-green-600/10', text: 'text-green-400', badge: 'bg-green-500/20 border-green-500/30 text-green-400' },
              orange: { bg: 'from-[#ea580c]/10 to-[#fb923c]/10', text: 'text-[#ea580c]', badge: 'bg-[#ea580c]/20 border-[#ea580c]/30 text-[#ea580c]' },
              cyan: { bg: 'from-cyan-500/10 to-cyan-600/10', text: 'text-cyan-400', badge: 'bg-cyan-500/20 border-cyan-500/30 text-cyan-400' },
            };

            const colors = colorClasses[color as keyof typeof colorClasses];
            
            return (
              <div
                key={stage}
                className="flex-shrink-0 w-[380px] bg-black/40 border border-gray-700 rounded-xl overflow-hidden"
              >
              {/* Column Header */}
              <div className={`p-4 border-b border-gray-700 bg-gradient-to-r ${colors.bg}`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Icon className={`w-5 h-5 ${colors.text}`} />
                    <h3 className="font-bold text-white">{label}</h3>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full border text-sm font-bold ${colors.badge}`}>
                    {stageItems.length}
                  </span>
                </div>
                <div className="text-xs text-gray-400">
                  Total: <span className="text-green-400 font-semibold">${totalValue.toLocaleString()}</span>
                </div>
              </div>

              {/* Cards Container */}
              <div className="p-3 space-y-3 max-h-[calc(100vh-280px)] overflow-y-auto">
                {stageItems.length === 0 ? (
                  <div className="text-center py-8 text-gray-600">
                    <Icon className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">No items</p>
                  </div>
                ) : (
                  stageItems.map((item) => {
                    const isExpanded = expandedCards.has(item.id);
                    
                    return (
                      <div
                        key={item.id}
                        className="bg-[#1a1a1a] border border-gray-700 hover:border-gray-600 rounded-lg overflow-hidden transition-all group"
                      >
                        {/* Card Header */}
                        <div className="p-3">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1 min-w-0">
                              <h4 className="font-semibold text-white text-sm mb-1 line-clamp-2">{item.title}</h4>
                              <div className="text-xs font-mono text-[#ea580c]">{item.itemNumber}</div>
                            </div>
                            <span className={`ml-2 flex-shrink-0 px-2 py-0.5 rounded text-xs font-bold border ${getPriorityColor(item.priority)}`}>
                              {item.priority.charAt(0).toUpperCase()}
                            </span>
                          </div>

                          {/* Customer Info */}
                          <div className="flex items-center gap-2 text-xs text-gray-400 mb-2">
                            <User className="w-3 h-3" />
                            <span className="truncate">{item.customerName}</span>
                          </div>

                          {/* Service & Value */}
                          <div className="flex items-center justify-between text-xs mb-2">
                            <div className="flex items-center gap-1 text-gray-400 truncate">
                              <Wrench className="w-3 h-3 flex-shrink-0" />
                              <span className="truncate">{item.serviceType}</span>
                            </div>
                            <div className="flex items-center gap-1 text-green-400 font-bold flex-shrink-0 ml-2">
                              <DollarSign className="w-3 h-3" />
                              {(item.quote?.totalCost || item.estimatedValue).toLocaleString()}
                            </div>
                          </div>

                          {/* Media Indicators */}
                          {item.submission && (item.submission.photos.length > 0 || item.submission.videos.length > 0 || item.submission.plans.length > 0) && (
                            <div className="flex items-center gap-3 text-xs text-gray-500 mb-2">
                              {item.submission.photos.length > 0 && (
                                <span className="flex items-center gap-1">
                                  <Image className="w-3 h-3" />
                                  {item.submission.photos.length}
                                </span>
                              )}
                              {item.submission.videos.length > 0 && (
                                <span className="flex items-center gap-1">
                                  <Video className="w-3 h-3" />
                                  {item.submission.videos.length}
                                </span>
                              )}
                              {item.submission.plans.length > 0 && (
                                <span className="flex items-center gap-1">
                                  <FileCheck className="w-3 h-3" />
                                  {item.submission.plans.length}
                                </span>
                              )}
                            </div>
                          )}

                          {/* Expand/Collapse Toggle */}
                          <button
                            onClick={() => toggleCardExpanded(item.id)}
                            className="w-full mt-2 flex items-center justify-center gap-1 py-1.5 text-xs text-gray-400 hover:text-white border-t border-gray-700 hover:bg-gray-800/50 transition-all"
                          >
                            {isExpanded ? (
                              <>
                                <ChevronUp className="w-3 h-3" />
                                Hide Details
                              </>
                            ) : (
                              <>
                                <ChevronDown className="w-3 h-3" />
                                Show Details
                              </>
                            )}
                          </button>
                        </div>

                        {/* Expanded Details */}
                        {isExpanded && (
                          <div className="px-3 pb-3 border-t border-gray-700 pt-3 space-y-2">
                            <p className="text-xs text-gray-400 line-clamp-3">{item.description}</p>
                            
                            {item.location && (
                              <div className="flex items-start gap-1 text-xs text-gray-500">
                                <MapPin className="w-3 h-3 mt-0.5 flex-shrink-0" />
                                <span className="line-clamp-2">{item.location}</span>
                              </div>
                            )}
                            
                            {item.customerPhone && (
                              <div className="flex items-center gap-1 text-xs text-gray-500">
                                <Phone className="w-3 h-3" />
                                <span>{item.customerPhone}</span>
                              </div>
                            )}
                            
                            {item.customerEmail && (
                              <div className="flex items-center gap-1 text-xs text-gray-500">
                                <Mail className="w-3 h-3" />
                                <span className="truncate">{item.customerEmail}</span>
                              </div>
                            )}
                            
                            <div className="flex items-center gap-1 text-xs text-gray-500">
                              <Calendar className="w-3 h-3" />
                              <span>{new Date(item.createdDate).toLocaleDateString()}</span>
                            </div>
                          </div>
                        )}

                        {/* Actions */}
                        <div className="px-3 pb-3 space-y-2">
                          {/* Universal View All Details Button */}
                          <button
                            onClick={() => handleViewProjectDetails(item)}
                            className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-black border border-gray-700 hover:border-[#ea580c] text-gray-400 hover:text-[#ea580c] rounded-md text-xs font-semibold transition-all"
                          >
                            <Maximize2 className="w-3.5 h-3.5" />
                            Full Details
                          </button>

                          {/* Work Request Actions */}
                          {stage === 'work-request' && (
                            <>
                              <button
                                onClick={() => handleAutoGenerateQuote(item)}
                                className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-gradient-to-r from-[#ea580c] to-[#fb923c] hover:from-[#fb923c] hover:to-[#ea580c] text-white rounded-md text-xs font-bold transition-all shadow-lg"
                              >
                                <Sparkles className="w-3.5 h-3.5" />
                                AI Generate Quote
                              </button>
                              <button
                                onClick={() => handleOpenScheduleGenerator(item)}
                                className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-cyan-600 hover:to-blue-600 text-white rounded-md text-xs font-bold transition-all shadow-lg"
                              >
                                <Zap className="w-3.5 h-3.5" />
                                Auto-Generate Schedule
                              </button>
                              <button
                                onClick={() => handleCreateQuote(item)}
                                className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-black border border-[#ea580c]/50 hover:border-[#ea580c] text-[#ea580c] hover:text-white rounded-md text-xs font-semibold transition-all"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                                Manual Quote
                              </button>
                            </>
                          )}

                          {/* Quote Draft Actions */}
                          {stage === 'quote-draft' && (
                            <>
                              <button
                                onClick={() => handleEditQuote(item)}
                                className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-black border border-yellow-500/50 hover:border-yellow-500 text-yellow-400 rounded-md text-xs font-semibold transition-all"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                                Edit Quote
                              </button>
                              <button
                                onClick={() => handleOpenMaterialsHub(item)}
                                className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-gradient-to-r from-[#ea580c] to-[#fb923c] hover:from-[#fb923c] hover:to-[#ea580c] text-white rounded-md text-xs font-bold transition-all shadow-lg"
                              >
                                <Package className="w-3.5 h-3.5" />
                                Open Materials Hub
                              </button>
                              <button
                                onClick={() => handleSendQuote(item)}
                                className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-500 text-white rounded-md text-xs font-bold transition-all"
                              >
                                <Send className="w-3.5 h-3.5" />
                                Send to Customer
                              </button>
                            </>
                          )}

                          {/* Quote Sent Actions */}
                          {stage === 'quote-sent' && (
                            <>
                              <button
                                onClick={() => handleEditQuote(item)}
                                className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-black border border-purple-500/50 hover:border-purple-500 text-purple-400 rounded-md text-xs font-semibold transition-all"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                View Quote
                              </button>
                              <div className="w-full px-3 py-2 bg-purple-500/10 border border-purple-500/30 rounded-md text-center">
                                <div className="flex items-center justify-center gap-2 text-xs text-purple-400 mb-2">
                                  <Clock className="w-3.5 h-3.5" />
                                  Awaiting Customer
                                </div>
                              </div>
                              {/* DEMO: Simulate customer approval */}
                              <button
                                onClick={() => handleSimulateQuoteApproval(item)}
                                className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md text-xs font-bold transition-all"
                              >
                                <CheckCircle className="w-3.5 h-3.5" />
                                Simulate Approval
                              </button>
                            </>
                          )}

                          {/* Quote Approved Actions */}
                          {stage === 'quote-approved' && (
                            <>
                              <button
                                onClick={() => handleEditQuote(item)}
                                className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-black border border-green-500/50 hover:border-green-500 text-green-400 rounded-md text-xs font-semibold transition-all"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                View Quote
                              </button>
                              <button
                                onClick={() => handleConvertToContract(item)}
                                className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-gradient-to-r from-[#ea580c] to-[#fb923c] hover:from-[#fb923c] hover:to-[#ea580c] text-white rounded-md text-xs font-bold transition-all shadow-lg"
                              >
                                <MoveRight className="w-3.5 h-3.5" />
                                Create Contract
                              </button>
                            </>
                          )}

                          {/* Contract Actions */}
                          {stage === 'contract' && (
                            <>
                              <button
                                onClick={() => {
                                  setSelectedItem(item);
                                  setProjectDetailsInitialTab('contract');
                                  setShowProjectDetails(true);
                                  toast.info('Opening contract details...');
                                }}
                                className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-black border border-[#ea580c]/50 hover:border-[#ea580c] text-[#ea580c] rounded-md text-xs font-semibold transition-all"
                              >
                                <FileSignature className="w-3.5 h-3.5" />
                                View Contract
                              </button>
                              <button
                                onClick={() => {
                                  // Store project data in sessionStorage for invoice creation
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
                                  
                                  // Set flag to return to pipeline
                                  sessionStorage.setItem('invoiceReturnTo', 'pipeline');
                                  
                                  // Navigate to invoice page with createNew flag
                                  navigate('/invoices?createNew=true');
                                  toast.success('Opening invoice creator...');
                                }}
                                className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-500 text-white rounded-md text-xs font-bold transition-all"
                              >
                                <MoveRight className="w-3.5 h-3.5" />
                                Create Invoice
                              </button>
                            </>
                          )}

                          {/* Invoice Actions */}
                          {stage === 'invoice' && (
                            <button
                              className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-black border border-cyan-500/50 hover:border-cyan-500 text-cyan-400 rounded-md text-xs font-semibold transition-all"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              View Invoice
                            </button>
                          )}
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
          workRequest={convertToWorkRequest(selectedItem) as any}
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
    </div>
  );
}