/**
 * Work on Quote Modal - Full Working Environment
 * Comprehensive quote editing with line items, attachments, and notes
 */

import { useState, useRef, useEffect } from 'react';
import {
  FileText, User, Package, Edit, Trash2, Send, Download, Eye,
  MessageSquare, X, Upload, Plus, FileImage, File, Save, Recycle,
  Clock, DollarSign, Sparkles, Wand2, Users, Check
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import QuoteMaterialsHub from './QuoteMaterialsHub';
import { comprehensiveLaborBreakdown, getAllPhases, getAllCategories } from '../lib/data/laborBreakdown';

interface LineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
  category?: 'labor' | 'materials' | 'waste' | 'other';
  markup?: number; // Individual item markup percentage
}

interface Attachment {
  id: string;
  name: string;
  size: string;
  type: 'pdf' | 'dwg' | 'zip' | 'image' | 'other';
  url?: string;
}

interface Note {
  id: string;
  author: string;
  initials: string;
  timestamp: string;
  content: string;
}

interface Quote {
  id: string;
  quoteNumber: string;
  customerName: string;
  customerEmail: string;
  businessName?: string;
  serviceType: string;
  description: string;
  status: 'draft' | 'pending_review' | 'sent' | 'approved' | 'rejected' | 'expired';
  createdDate: string;
  sentDate?: string;
  expiryDate: string;
  totalAmount: number;
  itemCount: number;
  assignedTo: string;
  priority: 'low' | 'medium' | 'high';
  lastModified: string;
  workRequestData?: {
    workRequestNumber: string;
    labor: string[];
    materials: string[];
    estimatedCost: { min: number, max: number };
    duration: number;
    complexityLevel: 'low' | 'medium' | 'high';
    requiresPermit: boolean;
    equipment: string[];
    floorPlanGenerated: boolean;
    photos: { name: string, size: string, url: string }[];
    documents: { name: string, size: string, url: string }[];
  };
  isFromWorkRequest?: boolean; // Flag to identify quotes created from work requests
}

interface WorkOnQuoteModalProps {
  quote: Quote;
  isOpen: boolean;
  onClose: () => void;
  getStatusColor: (status: Quote['status']) => string;
  getStatusLabel: (status: Quote['status']) => string;
  autoGenerate?: boolean; // Auto-generate on open for work requests
}

export function WorkOnQuoteModal({ quote, isOpen, onClose, getStatusColor, getStatusLabel, autoGenerate = false }: WorkOnQuoteModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Initialize line items from work request data if available
  const [lineItems, setLineItems] = useState<LineItem[]>(() => {
    // If it's from a work request and will auto-generate, start with empty array
    if (quote.isFromWorkRequest && autoGenerate) {
      return [];
    }
    
    const wrData = quote.workRequestData;
    
    if (wrData) {
      const items: LineItem[] = [];
      
      // Add labor items
      if (wrData.labor && Array.isArray(wrData.labor)) {
        wrData.labor.forEach((laborSkill: string, index: number) => {
          items.push({
            id: `labor-${index + 1}`,
            description: `${laborSkill} - Professional Services`,
            quantity: 1,
            unitPrice: wrData.estimatedCost?.min 
              ? Math.round((wrData.estimatedCost.min * 0.6) / wrData.labor.length)
              : 5000,
            total: wrData.estimatedCost?.min 
              ? Math.round((wrData.estimatedCost.min * 0.6) / wrData.labor.length)
              : 5000,
            category: 'labor'
          });
        });
      }
      
      // Add material items
      if (wrData.materials && Array.isArray(wrData.materials)) {
        wrData.materials.forEach((material: string, index: number) => {
          items.push({
            id: `material-${index + 1}`,
            description: material,
            quantity: 1,
            unitPrice: wrData.estimatedCost?.min 
              ? Math.round((wrData.estimatedCost.min * 0.4) / wrData.materials.length)
              : 2000,
            total: wrData.estimatedCost?.min 
              ? Math.round((wrData.estimatedCost.min * 0.4) / wrData.materials.length)
              : 2000,
            category: 'materials'
          });
        });
      }
      
      // If we have items from work request, use them
      if (items.length > 0) {
        return items;
      }
    }
    
    // Default items if no work request data
    return [
      { id: '1', description: 'HVAC Unit Installation', quantity: 2, unitPrice: 15000, total: 30000 },
      { id: '2', description: 'Ductwork Installation', quantity: 1, unitPrice: 8000, total: 8000 },
      { id: '3', description: 'Labor & Installation', quantity: 1, unitPrice: 7000, total: 7000 },
    ];
  });

  const [attachments, setAttachments] = useState<Attachment[]>(() => {
    const wrData = quote.workRequestData;
    const initialAttachments: Attachment[] = [];
    
    // Add documents from work request
    if (wrData?.documents && Array.isArray(wrData.documents)) {
      wrData.documents.forEach((doc: any, index: number) => {
        initialAttachments.push({
          id: `doc-${index}`,
          name: doc.name || `Document ${index + 1}`,
          size: doc.size || '0 MB',
          type: 'pdf',
          url: doc.url
        });
      });
    }
    
    // Add default attachments if from work request
    if (wrData) {
      if (wrData.floorPlanGenerated) {
        initialAttachments.push({
          id: 'floor-plan',
          name: 'AI-Generated-Floor-Plans.dwg',
          size: '3.5 MB',
          type: 'dwg'
        });
      }
      
      if (wrData.photos && wrData.photos.length > 0) {
        initialAttachments.push({
          id: 'photos',
          name: 'Site-Photos.zip',
          size: '12.8 MB',
          type: 'zip'
        });
      }
    }
    
    // Return default if no work request data
    if (initialAttachments.length === 0) {
      return [
        { id: '1', name: 'Project_Specs.pdf', size: '1.2 MB', type: 'pdf' },
        { id: '2', name: 'Floor_Plans.dwg', size: '3.5 MB', type: 'dwg' },
        { id: '3', name: 'Photos.zip', size: '12.8 MB', type: 'zip' },
      ];
    }
    
    return initialAttachments;
  });

  const [notes, setNotes] = useState<Note[]>(() => {
    const wrData = quote.workRequestData;
    const initialNotes: Note[] = [];
    
    // Add initial note about work request import
    if (wrData?.workRequestNumber) {
      initialNotes.push({
        id: 'wr-import',
        author: 'System',
        initials: 'SY',
        timestamp: 'Just now',
        content: `Quote created from Work Request ${wrData.workRequestNumber}. AI analysis included: ${wrData.labor?.length || 0} labor items, ${wrData.materials?.length || 0} materials. Estimated duration: ${wrData.duration || 'TBD'} hours.`
      });
      
      // Add complexity note
      if (wrData.complexityLevel) {
        initialNotes.push({
          id: 'complexity',
          author: 'AI Analysis',
          initials: 'AI',
          timestamp: 'Just now',
          content: `Project complexity: ${wrData.complexityLevel}. ${wrData.requiresPermit ? 'Building permit required.' : ''} ${wrData.equipment && wrData.equipment.length > 0 ? `Equipment needed: ${wrData.equipment.join(', ')}` : ''}`
        });
      }
    }
    
    // Default notes if no work request
    if (initialNotes.length === 0) {
      return [
        {
          id: '1',
          author: 'Mike Johnson',
          initials: 'MJ',
          timestamp: '2 hours ago',
          content: 'Customer requested additional electrical work for server room. Adding to quote.'
        },
        {
          id: '2',
          author: 'Tom Davis',
          initials: 'TD',
          timestamp: '1 day ago',
          content: 'Site inspection completed. All measurements confirmed.'
        }
      ];
    }
    
    return initialNotes;
  });

  const [newNote, setNewNote] = useState('');
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [editingItem, setEditingItem] = useState<LineItem | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const [newItem, setNewItem] = useState({
    description: '',
    quantity: 1,
    unitPrice: 0
  });

  // Waste & Disposal State
  const [wasteDisposalItems, setWasteDisposalItems] = useState<Array<{
    id: string;
    description: string;
    containerSize: string;
    quantity: number;
    laborHours: number;
    laborRate: number;
    materialCost: number;
    total: number;
    markup?: number; // Individual item markup percentage
  }>>([
    {
      id: 'waste-1',
      description: 'Construction Debris Removal',
      containerSize: '20 Yard Dumpster',
      quantity: 1,
      laborHours: 4,
      laborRate: 75,
      materialCost: 450,
      total: 750,
      markup: 0
    },
    {
      id: 'waste-2',
      description: 'Hazardous Material Disposal',
      containerSize: 'Special Container',
      quantity: 2,
      laborHours: 2,
      laborRate: 85,
      materialCost: 200,
      total: 570,
      markup: 0
    }
  ]);
  const [showAddWasteModal, setShowAddWasteModal] = useState(false);
  const [editingWaste, setEditingWaste] = useState<any>(null);
  const [newWaste, setNewWaste] = useState({
    description: '',
    containerSize: '',
    quantity: 1,
    laborHours: 0,
    laborRate: 75,
    materialCost: 0
  });

  // Bid Room Selection State
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());
  const [showBidRoomModal, setShowBidRoomModal] = useState(false);
  const [bidDeadline, setBidDeadline] = useState('');

  // View Toggle State
  const [showLaborDetails, setShowLaborDetails] = useState(true);
  const [showMaterialsDetails, setShowMaterialsDetails] = useState(true);
  const [showWasteDetails, setShowWasteDetails] = useState(true);
  const [showAttachments, setShowAttachments] = useState(true);
  const [showNotes, setShowNotes] = useState(true);

  // Materials Hub State
  const [showMaterialsHub, setShowMaterialsHub] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState<'grainger' | 'homedepot' | 'lowes' | null>(null);

  // Individual Item Visibility State (Controls what customer sees in detail - NOT what's included in price)
  const [visibleLaborIds, setVisibleLaborIds] = useState<Set<string>>(new Set());
  const [visibleMaterialIds, setVisibleMaterialIds] = useState<Set<string>>(new Set());
  const [visibleWasteIds, setVisibleWasteIds] = useState<Set<string>>(new Set());
  const [visibleLineItemIds, setVisibleLineItemIds] = useState<Set<string>>(new Set());
  const [visibleAttachmentIds, setVisibleAttachmentIds] = useState<Set<string>>(new Set());
  const [visibleNoteIds, setVisibleNoteIds] = useState<Set<string>>(new Set());

  // Section Markup Percentages (applied to each section's subtotal)
  const [laborMarkup, setLaborMarkup] = useState(0);
  const [materialsMarkup, setMaterialsMarkup] = useState(0);
  const [wasteMarkup, setWasteMarkup] = useState(0);
  const [lineItemsMarkup, setLineItemsMarkup] = useState(0);

  // Detailed Labor Breakdown (separate from line items for detailed view)
  const [laborItems, setLaborItems] = useState<Array<{
    id: string;
    task: string;
    skill: string;
    hours: number;
    rate: number;
    total: number;
    markup?: number; // Individual item markup percentage
  }>>([
    // Site Preparation & Setup
    { id: 'labor-1', task: 'Site Survey & Measurement', skill: 'Project Manager', hours: 2, rate: 95, total: 190, markup: 0 },
    { id: 'labor-2', task: 'Site Protection - Floor Covering Installation', skill: 'Laborer', hours: 1.5, rate: 45, total: 67.50, markup: 0 },
    { id: 'labor-3', task: 'Temporary Fencing & Barriers Setup', skill: 'Laborer', hours: 2, rate: 45, total: 90, markup: 0 },
    { id: 'labor-4', task: 'Tool & Equipment Setup', skill: 'Carpenter', hours: 1, rate: 65, total: 65, markup: 0 },
    
    // Demolition & Removal
    { id: 'labor-5', task: 'Existing Structure Demolition', skill: 'Demolition Tech', hours: 8, rate: 55, total: 440, markup: 0 },
    { id: 'labor-6', task: 'Debris Removal & Hauling', skill: 'Laborer', hours: 4, rate: 45, total: 180, markup: 0 },
    { id: 'labor-7', task: 'Dust Containment Setup & Monitoring', skill: 'Laborer', hours: 2, rate: 45, total: 90, markup: 0 },
    
    // Foundation & Structural
    { id: 'labor-8', task: 'Foundation Excavation', skill: 'Equipment Operator', hours: 6, rate: 75, total: 450, markup: 0 },
    { id: 'labor-9', task: 'Concrete Form Installation', skill: 'Carpenter', hours: 8, rate: 65, total: 520, markup: 0 },
    { id: 'labor-10', task: 'Rebar Placement & Tying', skill: 'Ironworker', hours: 6, rate: 70, total: 420, markup: 0 },
    { id: 'labor-11', task: 'Concrete Pour & Finishing', skill: 'Concrete Finisher', hours: 10, rate: 75, total: 750, markup: 0 },
    { id: 'labor-12', task: 'Concrete Curing & Monitoring (3 days)', skill: 'Laborer', hours: 2, rate: 45, total: 90, markup: 0 },
    
    // Framing
    { id: 'labor-13', task: 'Wall Framing - Load Bearing', skill: 'Master Carpenter', hours: 16, rate: 85, total: 1360, markup: 0 },
    { id: 'labor-14', task: 'Wall Framing - Interior Partitions', skill: 'Carpenter', hours: 12, rate: 65, total: 780, markup: 0 },
    { id: 'labor-15', task: 'Ceiling Joist Installation', skill: 'Carpenter', hours: 8, rate: 65, total: 520, markup: 0 },
    { id: 'labor-16', task: 'Door & Window Header Installation', skill: 'Carpenter', hours: 4, rate: 65, total: 260, markup: 0 },
    { id: 'labor-17', task: 'Sheathing Installation', skill: 'Carpenter', hours: 10, rate: 65, total: 650, markup: 0 },
    
    // Electrical
    { id: 'labor-18', task: 'Electrical Rough-In', skill: 'Master Electrician', hours: 12, rate: 95, total: 1140, markup: 0 },
    { id: 'labor-19', task: 'Outlet & Switch Box Installation', skill: 'Electrician', hours: 6, rate: 75, total: 450, markup: 0 },
    { id: 'labor-20', task: 'Panel & Circuit Installation', skill: 'Master Electrician', hours: 4, rate: 95, total: 380, markup: 0 },
    { id: 'labor-21', task: 'Fixture Installation', skill: 'Electrician', hours: 8, rate: 75, total: 600, markup: 0 },
    
    // Plumbing
    { id: 'labor-22', task: 'Plumbing Rough-In', skill: 'Master Plumber', hours: 10, rate: 95, total: 950, markup: 0 },
    { id: 'labor-23', task: 'Water Line Installation', skill: 'Plumber', hours: 6, rate: 75, total: 450, markup: 0 },
    { id: 'labor-24', task: 'Drain & Vent Installation', skill: 'Plumber', hours: 8, rate: 75, total: 600, markup: 0 },
    { id: 'labor-25', task: 'Fixture Installation', skill: 'Plumber', hours: 6, rate: 75, total: 450, markup: 0 },
    
    // HVAC
    { id: 'labor-26', task: 'Ductwork Installation', skill: 'HVAC Technician', hours: 12, rate: 85, total: 1020, markup: 0 },
    { id: 'labor-27', task: 'Unit Installation & Startup', skill: 'Master HVAC Tech', hours: 8, rate: 95, total: 760, markup: 0 },
    { id: 'labor-28', task: 'Thermostat & Controls Installation', skill: 'HVAC Technician', hours: 3, rate: 85, total: 255, markup: 0 },
    
    // Insulation & Drywall
    { id: 'labor-29', task: 'Insulation Installation - Walls', skill: 'Insulation Installer', hours: 8, rate: 55, total: 440, markup: 0 },
    { id: 'labor-30', task: 'Insulation Installation - Ceiling', skill: 'Insulation Installer', hours: 6, rate: 55, total: 330, markup: 0 },
    { id: 'labor-31', task: 'Drywall Hanging', skill: 'Drywall Installer', hours: 16, rate: 60, total: 960, markup: 0 },
    { id: 'labor-32', task: 'Drywall Taping & Mudding (3 coats)', skill: 'Drywall Finisher', hours: 20, rate: 65, total: 1300, markup: 0 },
    { id: 'labor-33', task: 'Drywall Sanding & Cleanup', skill: 'Drywall Finisher', hours: 8, rate: 65, total: 520, markup: 0 },
    
    // Painting
    { id: 'labor-34', task: 'Surface Preparation & Priming', skill: 'Painter', hours: 10, rate: 55, total: 550, markup: 0 },
    { id: 'labor-35', task: 'Interior Painting - Walls (2 coats)', skill: 'Painter', hours: 16, rate: 55, total: 880, markup: 0 },
    { id: 'labor-36', task: 'Interior Painting - Trim & Doors', skill: 'Painter', hours: 8, rate: 55, total: 440, markup: 0 },
    { id: 'labor-37', task: 'Touch-Up & Detail Work', skill: 'Painter', hours: 4, rate: 55, total: 220, markup: 0 },
    
    // Flooring
    { id: 'labor-38', task: 'Subfloor Preparation & Leveling', skill: 'Flooring Installer', hours: 6, rate: 60, total: 360, markup: 0 },
    { id: 'labor-39', task: 'Flooring Installation', skill: 'Flooring Installer', hours: 12, rate: 60, total: 720, markup: 0 },
    { id: 'labor-40', task: 'Baseboards & Trim Installation', skill: 'Finish Carpenter', hours: 8, rate: 70, total: 560, markup: 0 },
    
    // Final Details & Cleanup
    { id: 'labor-41', task: 'Hardware Installation (Doors, Cabinets)', skill: 'Finish Carpenter', hours: 4, rate: 70, total: 280, markup: 0 },
    { id: 'labor-42', task: 'Final Walkthrough & Punch List', skill: 'Project Manager', hours: 2, rate: 95, total: 190, markup: 0 },
    { id: 'labor-43', task: 'Site Cleanup - Daily (per day x 20 days)', skill: 'Laborer', hours: 20, rate: 45, total: 900, markup: 0 },
    { id: 'labor-44', task: 'Final Deep Cleaning', skill: 'Cleaning Crew', hours: 8, rate: 50, total: 400, markup: 0 },
    { id: 'labor-45', task: 'Debris Disposal & Site Restoration', skill: 'Laborer', hours: 4, rate: 45, total: 180, markup: 0 },
  ]);

  // Detailed Materials Breakdown (separate from line items for detailed view)
  const [materialItems, setMaterialItems] = useState<Array<{
    id: string;
    item: string;
    category: string;
    quantity: number;
    unit: string;
    unitPrice: number;
    total: number;
    vendor?: string;
    sku?: string;
    markup?: number; // Individual item markup percentage
  }>>([
    // Site Protection & Safety
    { id: 'mat-1', item: 'Plastic Floor Protection Roll (4\' x 100\')', category: 'Site Protection', quantity: 3, unit: 'rolls', unitPrice: 24.99, total: 74.97, vendor: 'Home Depot', sku: 'HD-FP-100', markup: 0 },
    { id: 'mat-2', item: 'Caution Tape (1000 ft)', category: 'Site Protection', quantity: 2, unit: 'rolls', unitPrice: 8.99, total: 17.98, vendor: 'Grainger', sku: 'GR-CT-1000', markup: 0 },
    { id: 'mat-3', item: 'Temporary Fence Panels (6\' x 10\')', category: 'Site Protection', quantity: 8, unit: 'panels', unitPrice: 45.00, total: 360.00, markup: 0 },
    { id: 'mat-4', item: 'Safety Cones (36")', category: 'Safety', quantity: 12, unit: 'ea', unitPrice: 15.99, total: 191.88, markup: 0 },
    { id: 'mat-5', item: 'Dust Barrier Sheeting (12\' x 100\')', category: 'Site Protection', quantity: 4, unit: 'rolls', unitPrice: 34.99, total: 139.96, markup: 0 },
    { id: 'mat-6', item: 'Zipwall Dust Containment System', category: 'Site Protection', quantity: 1, unit: 'kit', unitPrice: 189.99, total: 189.99, markup: 0 },
    
    // Foundation & Concrete
    { id: 'mat-7', item: 'Ready-Mix Concrete (3000 PSI)', category: 'Concrete', quantity: 12, unit: 'cu yd', unitPrice: 125.00, total: 1500.00, markup: 0 },
    { id: 'mat-8', item: 'Rebar #4 (20 ft)', category: 'Concrete', quantity: 45, unit: 'pcs', unitPrice: 12.50, total: 562.50, markup: 0 },
    { id: 'mat-9', item: 'Rebar Ties (Wire)', category: 'Concrete', quantity: 5, unit: 'lbs', unitPrice: 3.99, total: 19.95, markup: 0 },
    { id: 'mat-10', item: 'Concrete Forms (2x8x16)', category: 'Concrete', quantity: 60, unit: 'boards', unitPrice: 8.75, total: 525.00, markup: 0 },
    { id: 'mat-11', item: 'Form Release Agent (5 gal)', category: 'Concrete', quantity: 2, unit: 'pails', unitPrice: 42.99, total: 85.98, markup: 0 },
    { id: 'mat-12', item: 'Vapor Barrier (10\' x 100\' 6mil)', category: 'Concrete', quantity: 2, unit: 'rolls', unitPrice: 89.99, total: 179.98, markup: 0 },
    { id: 'mat-13', item: 'Concrete Sealer (5 gal)', category: 'Concrete', quantity: 1, unit: 'pail', unitPrice: 124.99, total: 124.99, markup: 0 },
    
    // Lumber & Framing
    { id: 'mat-14', item: '2x4x8 Kiln Dried Stud', category: 'Lumber', quantity: 150, unit: 'pcs', unitPrice: 4.25, total: 637.50, markup: 0 },
    { id: 'mat-15', item: '2x4x10 Pressure Treated', category: 'Lumber', quantity: 30, unit: 'pcs', unitPrice: 7.89, total: 236.70, markup: 0 },
    { id: 'mat-16', item: '2x6x8 Kiln Dried', category: 'Lumber', quantity: 80, unit: 'pcs', unitPrice: 6.99, total: 559.20, markup: 0 },
    { id: 'mat-17', item: '2x8x12 Kiln Dried', category: 'Lumber', quantity: 40, unit: 'pcs', unitPrice: 14.25, total: 570.00, markup: 0 },
    { id: 'mat-18', item: '2x10x16 Kiln Dried', category: 'Lumber', quantity: 25, unit: 'pcs', unitPrice: 24.99, total: 624.75, markup: 0 },
    { id: 'mat-19', item: 'OSB Sheathing 7/16" (4x8)', category: 'Lumber', quantity: 45, unit: 'sheets', unitPrice: 18.99, total: 854.55, markup: 0 },
    { id: 'mat-20', item: 'Plywood 3/4" (4x8 Grade A)', category: 'Lumber', quantity: 20, unit: 'sheets', unitPrice: 52.99, total: 1059.80, markup: 0 },
    
    // Fasteners & Hardware
    { id: 'mat-21', item: 'Framing Nails 16d (50 lb box)', category: 'Fasteners', quantity: 3, unit: 'boxes', unitPrice: 64.99, total: 194.97, markup: 0 },
    { id: 'mat-22', item: 'Finish Nails 8d (5 lb box)', category: 'Fasteners', quantity: 4, unit: 'boxes', unitPrice: 18.99, total: 75.96, markup: 0 },
    { id: 'mat-23', item: 'Screws 3" Deck (5 lb box)', category: 'Fasteners', quantity: 6, unit: 'boxes', unitPrice: 32.99, total: 197.94, markup: 0 },
    { id: 'mat-24', item: 'Drywall Screws 1-5/8" (5 lb)', category: 'Fasteners', quantity: 8, unit: 'boxes', unitPrice: 24.99, total: 199.92, markup: 0 },
    { id: 'mat-25', item: 'Simpson Strong-Tie Brackets (Various)', category: 'Hardware', quantity: 45, unit: 'pcs', unitPrice: 8.50, total: 382.50, markup: 0 },
    { id: 'mat-26', item: 'Structural Screws (100 pack)', category: 'Fasteners', quantity: 8, unit: 'packs', unitPrice: 42.99, total: 343.92, markup: 0 },
    { id: 'mat-27', item: 'Construction Adhesive (29 oz tubes)', category: 'Adhesives', quantity: 24, unit: 'tubes', unitPrice: 5.99, total: 143.76, markup: 0 },
    
    // Electrical
    { id: 'mat-28', item: 'Romex 12/2 Wire (250 ft roll)', category: 'Electrical', quantity: 6, unit: 'rolls', unitPrice: 89.99, total: 539.94, markup: 0 },
    { id: 'mat-29', item: 'Romex 14/2 Wire (250 ft roll)', category: 'Electrical', quantity: 4, unit: 'rolls', unitPrice: 65.99, total: 263.96, markup: 0 },
    { id: 'mat-30', item: 'Outlet Boxes (Single Gang)', category: 'Electrical', quantity: 35, unit: 'pcs', unitPrice: 0.89, total: 31.15, markup: 0 },
    { id: 'mat-31', item: 'Junction Boxes (4" Square)', category: 'Electrical', quantity: 20, unit: 'pcs', unitPrice: 1.25, total: 25.00, markup: 0 },
    { id: 'mat-32', item: 'Wire Nuts (Assorted 500 pack)', category: 'Electrical', quantity: 2, unit: 'packs', unitPrice: 12.99, total: 25.98, markup: 0 },
    { id: 'mat-33', item: 'Circuit Breaker Panel (200A)', category: 'Electrical', quantity: 1, unit: 'ea', unitPrice: 289.99, total: 289.99, markup: 0 },
    { id: 'mat-34', item: 'Circuit Breakers (15A-20A)', category: 'Electrical', quantity: 24, unit: 'pcs', unitPrice: 8.99, total: 215.76, markup: 0 },
    { id: 'mat-35', item: 'Outlets (15A Duplex)', category: 'Electrical', quantity: 35, unit: 'pcs', unitPrice: 1.89, total: 66.15, markup: 0 },
    { id: 'mat-36', item: 'Light Switches (Single Pole)', category: 'Electrical', quantity: 18, unit: 'pcs', unitPrice: 1.49, total: 26.82, markup: 0 },
    { id: 'mat-37', item: 'Electrical Tape (10 rolls)', category: 'Electrical', quantity: 2, unit: 'packs', unitPrice: 14.99, total: 29.98, markup: 0 },
    
    // Plumbing
    { id: 'mat-38', item: 'PEX Tubing 1/2" (300 ft coil)', category: 'Plumbing', quantity: 3, unit: 'coils', unitPrice: 89.99, total: 269.97, markup: 0 },
    { id: 'mat-39', item: 'PEX Fittings (Assorted 50 pack)', category: 'Plumbing', quantity: 4, unit: 'packs', unitPrice: 45.99, total: 183.96, markup: 0 },
    { id: 'mat-40', item: 'PVC Pipe 3" (10 ft)', category: 'Plumbing', quantity: 25, unit: 'pcs', unitPrice: 12.99, total: 324.75, markup: 0 },
    { id: 'mat-41', item: 'PVC Pipe 2" (10 ft)', category: 'Plumbing', quantity: 20, unit: 'pcs', unitPrice: 8.99, total: 179.80, markup: 0 },
    { id: 'mat-42', item: 'PVC Fittings (Elbows, Tees, Couplings)', category: 'Plumbing', quantity: 60, unit: 'pcs', unitPrice: 2.49, total: 149.40, markup: 0 },
    { id: 'mat-43', item: 'PVC Cement & Primer Kit', category: 'Plumbing', quantity: 3, unit: 'kits', unitPrice: 18.99, total: 56.97, markup: 0 },
    { id: 'mat-44', item: 'Plumber\'s Putty (14 oz)', category: 'Plumbing', quantity: 4, unit: 'pcs', unitPrice: 3.99, total: 15.96, markup: 0 },
    { id: 'mat-45', item: 'Teflon Tape (10 pack)', category: 'Plumbing', quantity: 2, unit: 'packs', unitPrice: 8.99, total: 17.98, markup: 0 },
    { id: 'mat-46', item: 'Water Shut-Off Valves 1/2"', category: 'Plumbing', quantity: 12, unit: 'pcs', unitPrice: 7.99, total: 95.88, markup: 0 },
    
    // HVAC
    { id: 'mat-47', item: 'HVAC Ductwork (Flexible 6" x 25\')', category: 'HVAC', quantity: 8, unit: 'rolls', unitPrice: 34.99, total: 279.92, markup: 0 },
    { id: 'mat-48', item: 'Duct Tape (Silver - 60 yd)', category: 'HVAC', quantity: 12, unit: 'rolls', unitPrice: 8.99, total: 107.88, markup: 0 },
    { id: 'mat-49', item: 'HVAC Registers (Various Sizes)', category: 'HVAC', quantity: 18, unit: 'pcs', unitPrice: 12.99, total: 233.82, markup: 0 },
    { id: 'mat-50', item: 'HVAC Return Grilles', category: 'HVAC', quantity: 6, unit: 'pcs', unitPrice: 24.99, total: 149.94, markup: 0 },
    { id: 'mat-51', item: 'Foil-Faced Duct Insulation', category: 'HVAC', quantity: 4, unit: 'rolls', unitPrice: 42.99, total: 171.96, markup: 0 },
    
    // Insulation
    { id: 'mat-52', item: 'Fiberglass Batt Insulation R-13 (15" x 93")', category: 'Insulation', quantity: 40, unit: 'packs', unitPrice: 24.99, total: 999.60, markup: 0 },
    { id: 'mat-53', item: 'Fiberglass Batt Insulation R-19 (23" x 93")', category: 'Insulation', quantity: 25, unit: 'packs', unitPrice: 34.99, total: 874.75, markup: 0 },
    { id: 'mat-54', item: 'Spray Foam Insulation (Great Stuff)', category: 'Insulation', quantity: 24, unit: 'cans', unitPrice: 7.99, total: 191.76, markup: 0 },
    
    // Drywall
    { id: 'mat-55', item: 'Drywall 1/2" x 4\' x 8\'', category: 'Drywall', quantity: 120, unit: 'sheets', unitPrice: 12.99, total: 1558.80, markup: 0 },
    { id: 'mat-56', item: 'Drywall 5/8" x 4\' x 8\' (Fire-Rated)', category: 'Drywall', quantity: 30, unit: 'sheets', unitPrice: 15.99, total: 479.70, markup: 0 },
    { id: 'mat-57', item: 'Joint Compound (5 gal bucket)', category: 'Drywall', quantity: 18, unit: 'buckets', unitPrice: 18.99, total: 341.82, markup: 0 },
    { id: 'mat-58', item: 'Drywall Tape (Paper 500 ft)', category: 'Drywall', quantity: 12, unit: 'rolls', unitPrice: 5.99, total: 71.88, markup: 0 },
    { id: 'mat-59', item: 'Corner Bead (Metal 8 ft)', category: 'Drywall', quantity: 35, unit: 'pcs', unitPrice: 2.49, total: 87.15, markup: 0 },
    { id: 'mat-60', item: 'Sanding Sponges (10 pack)', category: 'Drywall', quantity: 8, unit: 'packs', unitPrice: 12.99, total: 103.92, markup: 0 },
    { id: 'mat-61', item: 'Drywall Primer (5 gal)', category: 'Paint', quantity: 4, unit: 'buckets', unitPrice: 64.99, total: 259.96, markup: 0 },
    
    // Paint & Supplies
    { id: 'mat-62', item: 'Interior Paint (5 gal - Eggshell)', category: 'Paint', quantity: 12, unit: 'buckets', unitPrice: 124.99, total: 1499.88, markup: 0 },
    { id: 'mat-63', item: 'Interior Paint (5 gal - Semi-Gloss)', category: 'Paint', quantity: 4, unit: 'buckets', unitPrice: 134.99, total: 539.96, markup: 0 },
    { id: 'mat-64', item: 'Trim Paint (1 gal - Semi-Gloss White)', category: 'Paint', quantity: 8, unit: 'gals', unitPrice: 32.99, total: 263.92, markup: 0 },
    { id: 'mat-65', item: 'Paint Roller Covers (9" 10 pack)', category: 'Paint Supplies', quantity: 6, unit: 'packs', unitPrice: 14.99, total: 89.94, markup: 0 },
    { id: 'mat-66', item: 'Paint Brushes (Assorted Set)', category: 'Paint Supplies', quantity: 8, unit: 'sets', unitPrice: 19.99, total: 159.92, markup: 0 },
    { id: 'mat-67', item: 'Paint Trays & Liners (100 pack liners)', category: 'Paint Supplies', quantity: 2, unit: 'packs', unitPrice: 24.99, total: 49.98, markup: 0 },
    { id: 'mat-68', item: 'Painter\'s Tape 2" (60 yd)', category: 'Paint Supplies', quantity: 24, unit: 'rolls', unitPrice: 7.99, total: 191.76, markup: 0 },
    { id: 'mat-69', item: 'Drop Cloths (9\' x 12\' Canvas)', category: 'Paint Supplies', quantity: 6, unit: 'pcs', unitPrice: 18.99, total: 113.94, markup: 0 },
    
    // Flooring
    { id: 'mat-70', item: 'Underlayment Plywood 1/4" (4x8)', category: 'Flooring', quantity: 30, unit: 'sheets', unitPrice: 22.99, total: 689.70, markup: 0 },
    { id: 'mat-71', item: 'Flooring Material (per sq ft)', category: 'Flooring', quantity: 1200, unit: 'sq ft', unitPrice: 4.99, total: 5988.00, markup: 0 },
    { id: 'mat-72', item: 'Floor Adhesive (5 gal)', category: 'Flooring', quantity: 3, unit: 'buckets', unitPrice: 89.99, total: 269.97, markup: 0 },
    { id: 'mat-73', item: 'Baseboards (8 ft Colonial)', category: 'Trim', quantity: 80, unit: 'pcs', unitPrice: 8.99, total: 719.20, markup: 0 },
    { id: 'mat-74', item: 'Baseboard Corners & Returns', category: 'Trim', quantity: 40, unit: 'pcs', unitPrice: 3.99, total: 159.60, markup: 0 },
    { id: 'mat-75', item: 'Brad Nails 18ga (5000 pack)', category: 'Fasteners', quantity: 4, unit: 'packs', unitPrice: 24.99, total: 99.96, markup: 0 },
    
    // Doors & Windows
    { id: 'mat-76', item: 'Interior Door Slab (30" x 80")', category: 'Doors', quantity: 8, unit: 'pcs', unitPrice: 89.99, total: 719.92, markup: 0 },
    { id: 'mat-77', item: 'Door Hinges (3.5" Satin Nickel)', category: 'Hardware', quantity: 24, unit: 'pairs', unitPrice: 8.99, total: 215.76, markup: 0 },
    { id: 'mat-78', item: 'Door Handles/Knobs (Satin Nickel)', category: 'Hardware', quantity: 8, unit: 'sets', unitPrice: 24.99, total: 199.92, markup: 0 },
    { id: 'mat-79', item: 'Door Stops (Floor Mount)', category: 'Hardware', quantity: 8, unit: 'pcs', unitPrice: 4.99, total: 39.92, markup: 0 },
    
    // Cleanup Supplies (Down to every detail!)
    { id: 'mat-80', item: 'Heavy Duty Trash Bags (55 gal - 100 pack)', category: 'Cleanup', quantity: 8, unit: 'boxes', unitPrice: 32.99, total: 263.92, markup: 0 },
    { id: 'mat-81', item: 'Contractor Bags (42 gal - 50 pack)', category: 'Cleanup', quantity: 6, unit: 'boxes', unitPrice: 24.99, total: 149.94, markup: 0 },
    { id: 'mat-82', item: 'Shop Vacuum Filters (6 pack)', category: 'Cleanup', quantity: 3, unit: 'packs', unitPrice: 18.99, total: 56.97, markup: 0 },
    { id: 'mat-83', item: 'Shop Vacuum Bags (10 pack)', category: 'Cleanup', quantity: 4, unit: 'packs', unitPrice: 12.99, total: 51.96, markup: 0 },
    { id: 'mat-84', item: 'Brooms (Heavy Duty)', category: 'Cleanup', quantity: 6, unit: 'pcs', unitPrice: 14.99, total: 89.94, markup: 0 },
    { id: 'mat-85', item: 'Dust Pans (Commercial)', category: 'Cleanup', quantity: 6, unit: 'pcs', unitPrice: 8.99, total: 53.94, markup: 0 },
    { id: 'mat-86', item: 'Cleaning Rags (100 pack)', category: 'Cleanup', quantity: 5, unit: 'packs', unitPrice: 19.99, total: 99.95, markup: 0 },
    { id: 'mat-87', item: 'All-Purpose Cleaner (Gallon)', category: 'Cleanup', quantity: 8, unit: 'gals', unitPrice: 9.99, total: 79.92, markup: 0 },
    { id: 'mat-88', item: 'Window Cleaner (32 oz - 12 pack)', category: 'Cleanup', quantity: 2, unit: 'cases', unitPrice: 24.99, total: 49.98, markup: 0 },
    { id: 'mat-89', item: 'Sponges (24 pack)', category: 'Cleanup', quantity: 4, unit: 'packs', unitPrice: 12.99, total: 51.96, markup: 0 },
    { id: 'mat-90', item: 'Mop & Bucket Set', category: 'Cleanup', quantity: 2, unit: 'sets', unitPrice: 34.99, total: 69.98, markup: 0 },
    { id: 'mat-91', item: 'Paper Towels (12 roll pack)', category: 'Cleanup', quantity: 6, unit: 'packs', unitPrice: 18.99, total: 113.94, markup: 0 },
    { id: 'mat-92', item: 'Hand Sanitizer (1 gal)', category: 'Safety', quantity: 4, unit: 'gals', unitPrice: 24.99, total: 99.96, markup: 0 },
    { id: 'mat-93', item: 'First Aid Kit (Commercial)', category: 'Safety', quantity: 2, unit: 'kits', unitPrice: 49.99, total: 99.98, markup: 0 },
    { id: 'mat-94', item: 'Zip Ties (Assorted 500 pack)', category: 'Hardware', quantity: 3, unit: 'packs', unitPrice: 14.99, total: 44.97, markup: 0 },
    { id: 'mat-95', item: 'Utility Knife Blades (100 pack)', category: 'Tools', quantity: 4, unit: 'packs', unitPrice: 18.99, total: 75.96, markup: 0 },
  ]);

  // Auto-generate quote when opened from work request
  useEffect(() => {
    if (isOpen && autoGenerate && quote.isFromWorkRequest) {
      // Check if AI has already generated (avoid double generation)
      const hasAIGenerated = lineItems.some(item => item.id.startsWith('ai-'));
      
      if (!hasAIGenerated) {
        // Small delay to let modal render first
        const timer = setTimeout(() => {
          console.log('[Auto-Generate] Triggering AI quote generation for work request');
          handleAIGenerate();
        }, 800);
        return () => clearTimeout(timer);
      }
    }
  }, [isOpen, autoGenerate]);

  // Auto-show all labor items
  useEffect(() => {
    setVisibleLaborIds(new Set(laborItems.map(item => item.id)));
  }, [laborItems]);

  // Auto-show all material items
  useEffect(() => {
    setVisibleMaterialIds(new Set(materialItems.map(item => item.id)));
  }, [materialItems]);

  // Auto-show all waste items
  useEffect(() => {
    setVisibleWasteIds(new Set(wasteDisposalItems.map(item => item.id)));
  }, [wasteDisposalItems]);

  // Auto-show all line items
  useEffect(() => {
    setVisibleLineItemIds(new Set(lineItems.map(item => item.id)));
  }, [lineItems]);

  // Auto-show all attachments
  useEffect(() => {
    setVisibleAttachmentIds(new Set(attachments.map(att => att.id)));
  }, [attachments]);

  // Auto-show all notes
  useEffect(() => {
    setVisibleNoteIds(new Set(notes.map(note => note.id)));
  }, [notes]);

  if (!isOpen) return null;

  // Calculate section totals (ALWAYS includes ALL items - visibility is for customer detail view only)
  // Step 1: Apply individual item markups first
  const laborSubtotal = laborItems.reduce((sum, item) => sum + item.total, 0);
  const laborWithIndividualMarkup = laborItems.reduce((sum, item) => {
    const itemWithMarkup = item.total * (1 + (item.markup || 0) / 100);
    return sum + itemWithMarkup;
  }, 0);
  const laborWithMarkup = laborWithIndividualMarkup * (1 + laborMarkup / 100);
  
  const materialsSubtotal = materialItems.reduce((sum, item) => sum + item.total, 0);
  const materialsWithIndividualMarkup = materialItems.reduce((sum, item) => {
    const itemWithMarkup = item.total * (1 + (item.markup || 0) / 100);
    return sum + itemWithMarkup;
  }, 0);
  const materialsWithMarkup = materialsWithIndividualMarkup * (1 + materialsMarkup / 100);
  
  const lineItemsSubtotal = lineItems.reduce((sum, item) => sum + item.total, 0);
  const lineItemsWithIndividualMarkup = lineItems.reduce((sum, item) => {
    const itemWithMarkup = item.total * (1 + (item.markup || 0) / 100);
    return sum + itemWithMarkup;
  }, 0);
  const lineItemsWithMarkup = lineItemsWithIndividualMarkup * (1 + lineItemsMarkup / 100);
  
  const wasteSubtotal = wasteDisposalItems.reduce((sum, item) => sum + item.total, 0);
  const wasteWithIndividualMarkup = wasteDisposalItems.reduce((sum, item) => {
    const itemWithMarkup = item.total * (1 + (item.markup || 0) / 100);
    return sum + itemWithMarkup;
  }, 0);
  const wasteWithMarkup = wasteWithIndividualMarkup * (1 + wasteMarkup / 100);
  
  const subtotal = lineItemsWithMarkup + wasteWithMarkup;
  const tax = subtotal * 0.08;
  const total = subtotal + tax;

  const handleAddItem = () => {
    if (!newItem.description || newItem.unitPrice <= 0) {
      toast.error('Please fill in all item details');
      return;
    }

    const item: LineItem = {
      id: Date.now().toString(),
      description: newItem.description,
      quantity: newItem.quantity,
      unitPrice: newItem.unitPrice,
      total: newItem.quantity * newItem.unitPrice
    };

    setLineItems([...lineItems, item]);
    setNewItem({ description: '', quantity: 1, unitPrice: 0 });
    setShowAddItemModal(false);
    toast.success('Line item added successfully');
  };

  const handleEditItem = (item: LineItem) => {
    setEditingItem(item);
    setNewItem({
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice
    });
    setShowAddItemModal(true);
  };

  const handleUpdateItem = () => {
    if (!editingItem) return;

    setLineItems(lineItems.map(item =>
      item.id === editingItem.id
        ? {
            ...item,
            description: newItem.description,
            quantity: newItem.quantity,
            unitPrice: newItem.unitPrice,
            total: newItem.quantity * newItem.unitPrice
          }
        : item
    ));

    setEditingItem(null);
    setNewItem({ description: '', quantity: 1, unitPrice: 0 });
    setShowAddItemModal(false);
    toast.success('Line item updated successfully');
  };

  const handleDeleteItem = (id: string) => {
    if (confirm('Delete this line item?')) {
      setLineItems(lineItems.filter(item => item.id !== id));
      toast.success('Line item deleted');
    }
  };

  // Waste Disposal Handlers
  const handleAddWaste = () => {
    if (!newWaste.description || !newWaste.containerSize) {
      toast.error('Please fill in waste description and container size');
      return;
    }

    const laborCost = newWaste.laborHours * newWaste.laborRate;
    const totalCost = (laborCost + newWaste.materialCost) * newWaste.quantity;

    const wasteItem = {
      id: Date.now().toString(),
      description: newWaste.description,
      containerSize: newWaste.containerSize,
      quantity: newWaste.quantity,
      laborHours: newWaste.laborHours,
      laborRate: newWaste.laborRate,
      materialCost: newWaste.materialCost,
      total: totalCost
    };

    setWasteDisposalItems([...wasteDisposalItems, wasteItem]);
    setNewWaste({ description: '', containerSize: '', quantity: 1, laborHours: 0, laborRate: 75, materialCost: 0 });
    setShowAddWasteModal(false);
    toast.success('Waste disposal item added');
  };

  const handleEditWaste = (item: any) => {
    setEditingWaste(item);
    setNewWaste({
      description: item.description,
      containerSize: item.containerSize,
      quantity: item.quantity,
      laborHours: item.laborHours,
      laborRate: item.laborRate,
      materialCost: item.materialCost
    });
    setShowAddWasteModal(true);
  };

  const handleUpdateWaste = () => {
    if (!editingWaste) return;

    const laborCost = newWaste.laborHours * newWaste.laborRate;
    const totalCost = (laborCost + newWaste.materialCost) * newWaste.quantity;

    setWasteDisposalItems(wasteDisposalItems.map(item =>
      item.id === editingWaste.id
        ? {
            ...item,
            description: newWaste.description,
            containerSize: newWaste.containerSize,
            quantity: newWaste.quantity,
            laborHours: newWaste.laborHours,
            laborRate: newWaste.laborRate,
            materialCost: newWaste.materialCost,
            total: totalCost
          }
        : item
    ));

    setEditingWaste(null);
    setNewWaste({ description: '', containerSize: '', quantity: 1, laborHours: 0, laborRate: 75, materialCost: 0 });
    setShowAddWasteModal(false);
    toast.success('Waste disposal item updated');
  };

  const handleDeleteWaste = (id: string) => {
    if (confirm('Delete this waste disposal item?')) {
      setWasteDisposalItems(wasteDisposalItems.filter(item => item.id !== id));
      toast.success('Waste disposal item deleted');
    }
  };

  // Item Selection Handlers
  const toggleItemSelection = (itemId: string) => {
    const newSelection = new Set(selectedItemIds);
    if (newSelection.has(itemId)) {
      newSelection.delete(itemId);
    } else {
      newSelection.add(itemId);
    }
    setSelectedItemIds(newSelection);
  };

  const toggleSelectAll = () => {
    if (selectedItemIds.size === lineItems.length) {
      setSelectedItemIds(new Set());
    } else {
      setSelectedItemIds(new Set(lineItems.map(item => item.id)));
    }
  };

  // Send to Bid Room Handler
  const handleSendToBidRoom = () => {
    if (!bidDeadline) {
      toast.error('Please select a bid deadline');
      return;
    }

    const selectedItems = lineItems.filter(item => selectedItemIds.has(item.id));
    
    if (selectedItems.length === 0) {
      toast.error('Please select at least one item to send to bid room');
      return;
    }

    const bidRoomJob = {
      fromQuote: true,
      quoteId: quote.id,
      quoteNumber: quote.quoteNumber,
      title: `${quote.serviceType} - Selected Items`,
      property: quote.businessName || quote.customerName,
      category: quote.serviceType,
      description: quote.description,
      budget: selectedItems.reduce((sum, item) => sum + item.total, 0),
      selectedItems: selectedItems.map(item => ({
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        total: item.total
      })),
      timeline: '',
      startDate: '',
      bidDeadline: bidDeadline,
      priority: quote.priority === 'high' ? 'critical' : quote.priority,
      requirements: `Quote ${quote.quoteNumber} - ${selectedItems.length} items for subcontractor bidding`,
      scope: `${selectedItems.length} items included`,
      customerEmail: quote.customerEmail,
      customerName: quote.customerName
    };

    localStorage.setItem('pendingBidRoomJob', JSON.stringify(bidRoomJob));
    
    toast.success(`${selectedItems.length} items sent to Bid Room!`, {
      description: 'Navigate to Emergency Portal > Bids to view.'
    });
    
    setShowBidRoomModal(false);
    setBidDeadline('');
    setSelectedItemIds(new Set());
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach(file => {
      const attachment: Attachment = {
        id: Date.now().toString() + Math.random(),
        name: file.name,
        size: (file.size / 1024 / 1024).toFixed(2) + ' MB',
        type: getFileType(file.name),
        url: URL.createObjectURL(file)
      };
      setAttachments([...attachments, attachment]);
    });

    toast.success(`${files.length} file(s) uploaded successfully`);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getFileType = (filename: string): Attachment['type'] => {
    const ext = filename.split('.').pop()?.toLowerCase();
    if (ext === 'pdf') return 'pdf';
    if (ext === 'dwg' || ext === 'dxf') return 'dwg';
    if (ext === 'zip' || ext === 'rar') return 'zip';
    if (['jpg', 'jpeg', 'png', 'gif'].includes(ext || '')) return 'image';
    return 'other';
  };

  const handleViewAttachment = (attachment: Attachment) => {
    if (attachment.url) {
      window.open(attachment.url, '_blank');
    } else {
      toast.info(`Viewing ${attachment.name}`, {
        description: 'File preview would open here'
      });
    }
  };

  const handleDeleteAttachment = (id: string) => {
    if (confirm('Delete this attachment?')) {
      setAttachments(attachments.filter(att => att.id !== id));
      toast.success('Attachment deleted');
    }
  };

  // Individual Item Visibility Toggles
  const toggleLaborVisibility = (id: string) => {
    const newSet = new Set(visibleLaborIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setVisibleLaborIds(newSet);
  };

  const toggleMaterialVisibility = (id: string) => {
    const newSet = new Set(visibleMaterialIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setVisibleMaterialIds(newSet);
  };

  const toggleWasteVisibility = (id: string) => {
    const newSet = new Set(visibleWasteIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setVisibleWasteIds(newSet);
  };

  const toggleLineItemVisibility = (id: string) => {
    const newSet = new Set(visibleLineItemIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setVisibleLineItemIds(newSet);
  };

  const toggleAttachmentVisibility = (id: string) => {
    const newSet = new Set(visibleAttachmentIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setVisibleAttachmentIds(newSet);
  };

  const toggleNoteVisibility = (id: string) => {
    const newSet = new Set(visibleNoteIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setVisibleNoteIds(newSet);
  };

  const handleAddNote = () => {
    if (!newNote.trim()) {
      toast.error('Please enter a note');
      return;
    }

    const note: Note = {
      id: Date.now().toString(),
      author: 'Current User',
      initials: 'CU',
      timestamp: 'Just now',
      content: newNote
    };

    setNotes([note, ...notes]);
    setNewNote('');
    toast.success('Note added successfully');
  };

  const handleDownloadPDF = () => {
    toast.loading('Generating PDF...', { id: 'pdf-gen' });
    
    setTimeout(() => {
      // Simulate PDF generation
      const pdfContent = `
QUOTE: ${quote.quoteNumber}
Customer: ${quote.customerName}
Service: ${quote.serviceType}

LINE ITEMS:
${lineItems.map((item, i) => `${i + 1}. ${item.description} - Qty: ${item.quantity} - $${item.total.toLocaleString()}`).join('\n')}

Subtotal: $${subtotal.toLocaleString()}
Tax (8%): $${tax.toLocaleString()}
Total: $${total.toLocaleString()}
      `;
      
      const blob = new Blob([pdfContent], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${quote.quoteNumber}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success('PDF downloaded successfully!', { id: 'pdf-gen' });
    }, 1500);
  };

  const handlePreview = () => {
    setShowPreview(true);
  };

  const handleSaveDraft = () => {
    toast.loading('Saving draft...', { id: 'save-draft' });
    
    setTimeout(() => {
      localStorage.setItem(`quote_${quote.id}_draft`, JSON.stringify({
        lineItems,
        attachments,
        notes,
        updatedAt: new Date().toISOString()
      }));
      
      toast.success('Draft saved successfully!', { id: 'save-draft' });
    }, 800);
  };

  const handleSendToCustomer = () => {
    if (lineItems.length === 0) {
      toast.error('Cannot send empty quote');
      return;
    }

    if (confirm(`Send quote ${quote.quoteNumber} to ${quote.customerName}?`)) {
      toast.loading('Sending quote...', { id: 'send-quote' });
      
      setTimeout(() => {
        toast.success('Quote sent successfully!', {
          id: 'send-quote',
          description: `Email sent to ${quote.customerEmail}`
        });
      }, 1500);
    }
  };

  const getFileIcon = (type: Attachment['type']) => {
    switch (type) {
      case 'pdf': return <FileText className="w-8 h-8 text-blue-400" />;
      case 'dwg': return <FileText className="w-8 h-8 text-green-400" />;
      case 'zip': return <FileText className="w-8 h-8 text-purple-400" />;
      case 'image': return <FileImage className="w-8 h-8 text-pink-400" />;
      default: return <File className="w-8 h-8 text-gray-400" />;
    }
  };

  const handleAIGenerate = async () => {
    if (isGenerating) return;

    setIsGenerating(true);
    toast.loading('AI is analyzing the project and generating detailed quote...', { 
      id: 'ai-generate',
      duration: Infinity 
    });

    try {
      const url = `https://${projectId}.supabase.co/functions/v1/make-server-57095a78/api/generate-quote`;
      
      let data;
      let usedFallback = false;
      
      try {
        // Try server-based AI generation first with timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
        
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`
          },
          body: JSON.stringify({
            quoteNumber: quote.quoteNumber,
            customerName: quote.customerName,
            serviceType: quote.serviceType,
            description: quote.description,
            workRequestData: quote.workRequestData
          }),
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`Server returned ${response.status}`);
        }

        data = await response.json();
        console.log('✓ AI Quote generated via server');
        
      } catch (fetchError) {
        // Silently fall back to smart templates - this is expected in demo mode
        // when the Supabase backend is not deployed
        if (fetchError instanceof Error && fetchError.message.includes('Failed to fetch')) {
          console.log('ℹ️ Using template-based generation - Supabase backend not connected');
        } else {
          console.log('ℹ️ Using template-based generation:', fetchError instanceof Error ? fetchError.message : 'Unknown error');
        }
        usedFallback = true;
        
        // Fallback: Generate basic quote data locally
        const serviceType = quote.serviceType || 'General Service';
        const duration = quote.workRequestData?.duration || 40;
        
        // Generate fallback labor items
        const baseRate = 85;
        data = {
          success: true,
          laborItems: [
            {
              description: `${serviceType} - Professional Labor`,
              hours: Math.ceil(duration * 0.6),
              rate: baseRate
            },
            {
              description: `${serviceType} - Specialist Work`,
              hours: Math.ceil(duration * 0.4),
              rate: baseRate + 25
            }
          ],
          materialItems: [
            {
              description: `${serviceType} - Primary Materials`,
              quantity: 1,
              unitPrice: Math.ceil(duration * 50)
            },
            {
              description: `${serviceType} - Supplies & Consumables`,
              quantity: 1,
              unitPrice: Math.ceil(duration * 25)
            }
          ]
        };
        
        // Calculate totals for fallback
        const laborTotal = data.laborItems.reduce((sum: number, item: any) => 
          sum + (item.hours * item.rate), 0);
        const materialsTotal = data.materialItems.reduce((sum: number, item: any) => 
          sum + (item.quantity * item.unitPrice), 0);
        
        data.totals = {
          labor: laborTotal,
          materials: materialsTotal,
          grandTotal: laborTotal + materialsTotal
        };
      }

      console.log('[AI Generate] Using data:', data);

      // Update line items with AI-generated labor
      const aiLaborItems: LineItem[] = data.laborItems.map((item: any, index: number) => ({
        id: `ai-labor-${index + 1}`,
        description: item.description,
        quantity: item.hours || item.quantity || 1,
        unitPrice: item.rate || item.unitPrice,
        total: (item.hours || item.quantity || 1) * (item.rate || item.unitPrice),
        category: 'labor' as const
      }));

      // Update line items with AI-generated materials
      const aiMaterialItems: LineItem[] = data.materialItems.map((item: any, index: number) => ({
        id: `ai-material-${index + 1}`,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        total: item.quantity * item.unitPrice,
        category: 'materials' as const
      }));

      // Replace existing items with AI-generated ones
      setLineItems([...aiLaborItems, ...aiMaterialItems]);

      // Also populate detailed labor breakdown
      const detailedLabor = data.laborItems.map((item: any, index: number) => ({
        id: `labor-detail-${index + 1}`,
        task: item.description,
        skill: item.skill || (index === 0 ? 'Professional' : 'Specialist'),
        hours: item.hours || item.quantity || 1,
        rate: item.rate || item.unitPrice,
        total: (item.hours || item.quantity || 1) * (item.rate || item.unitPrice)
      }));
      setLaborItems(detailedLabor);

      // Also populate detailed materials breakdown
      const detailedMaterials = data.materialItems.map((item: any, index: number) => ({
        id: `material-detail-${index + 1}`,
        item: item.description,
        category: item.category || 'General Supplies',
        quantity: item.quantity,
        unit: item.unit || 'unit',
        unitPrice: item.unitPrice,
        total: item.quantity * item.unitPrice,
        vendor: item.vendor,
        sku: item.sku
      }));
      setMaterialItems(detailedMaterials);

      // Add AI generation note
      const aiNote: Note = {
        id: `ai-note-${Date.now()}`,
        author: usedFallback ? 'AI Assistant (Smart Templates)' : 'AI Assistant',
        initials: 'AI',
        timestamp: 'Just now',
        content: usedFallback 
          ? `Generated ${aiLaborItems.length} labor tasks and ${aiMaterialItems.length} materials using intelligent templates based on service type and scope. Review and adjust as needed.`
          : `AI generated ${aiLaborItems.length} labor tasks and ${aiMaterialItems.length} materials. ${data.summary || 'Quote ready for review and editing.'}`
      };
      setNotes([aiNote, ...notes]);

      toast.success('Quote generated successfully!', {
        id: 'ai-generate',
        description: `${aiLaborItems.length} labor tasks, ${aiMaterialItems.length} materials`
      });
    } catch (error) {
      console.error('AI generation error:', error);
      toast.error('AI generation error: ' + (error instanceof Error ? error.message : String(error)), {
        id: 'ai-generate',
        description: 'Please try again or add items manually'
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <>
      {/* Add/Edit Item Modal */}
      {showAddItemModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl shadow-2xl max-w-2xl w-full">
            <div className="p-6 border-b border-[#2A2A2A] flex items-center justify-between">
              <h3 className="text-xl font-bold text-white">
                {editingItem ? 'Edit Line Item' : 'Add Line Item'}
              </h3>
              <button
                onClick={() => {
                  setShowAddItemModal(false);
                  setEditingItem(null);
                  setNewItem({ description: '', quantity: 1, unitPrice: 0 });
                }}
                className="p-2 hover:bg-[#2A2A2A] rounded-lg transition"
              >
                <X className="w-6 h-6 text-gray-400" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-sm text-gray-400 mb-2 block">Description *</label>
                <input
                  type="text"
                  value={newItem.description}
                  onChange={e => setNewItem({ ...newItem, description: e.target.value })}
                  placeholder="Enter item description"
                  className="w-full px-4 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white focus:border-[#ea580c]/50 focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-400 mb-2 block">Quantity *</label>
                  <input
                    type="number"
                    min="1"
                    value={newItem.quantity}
                    onChange={e => setNewItem({ ...newItem, quantity: parseInt(e.target.value) || 1 })}
                    className="w-full px-4 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white focus:border-[#ea580c]/50 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-400 mb-2 block">Unit Price *</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={newItem.unitPrice}
                    onChange={e => setNewItem({ ...newItem, unitPrice: parseFloat(e.target.value) || 0 })}
                    className="w-full px-4 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white focus:border-[#ea580c]/50 focus:outline-none"
                  />
                </div>
              </div>
              <div className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Total:</span>
                  <span className="text-2xl font-bold text-[#ea580c]">
                    ${(newItem.quantity * newItem.unitPrice).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-[#2A2A2A] flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowAddItemModal(false);
                  setEditingItem(null);
                  setNewItem({ description: '', quantity: 1, unitPrice: 0 });
                }}
                className="px-6 py-2 bg-[#0A0A0A] hover:bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg text-white transition"
              >
                Cancel
              </button>
              <button
                onClick={editingItem ? handleUpdateItem : handleAddItem}
                className="px-6 py-2 bg-[#ea580c] hover:bg-[#dc2626] rounded-lg text-white font-semibold transition"
              >
                {editingItem ? 'Update Item' : 'Add Item'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Waste Disposal Modal */}
      {showAddWasteModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl shadow-2xl max-w-3xl w-full">
            <div className="p-6 border-b border-[#2A2A2A] flex items-center justify-between">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <Recycle className="w-6 h-6 text-green-400" />
                {editingWaste ? 'Edit Waste Disposal' : 'Add Waste Disposal'}
              </h3>
              <button
                onClick={() => {
                  setShowAddWasteModal(false);
                  setEditingWaste(null);
                  setNewWaste({ description: '', containerSize: '', quantity: 1, laborHours: 0, laborRate: 75, materialCost: 0 });
                }}
                className="p-2 hover:bg-[#2A2A2A] rounded-lg transition"
              >
                <X className="w-6 h-6 text-gray-400" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-sm text-gray-400 mb-2 block">Description *</label>
                <input
                  type="text"
                  value={newWaste.description}
                  onChange={e => setNewWaste({ ...newWaste, description: e.target.value })}
                  placeholder="e.g., Construction Debris Removal"
                  className="w-full px-4 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white focus:border-[#ea580c]/50 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-400 mb-2 block">Container Size *</label>
                  <select
                    value={newWaste.containerSize}
                    onChange={e => setNewWaste({ ...newWaste, containerSize: e.target.value })}
                    className="w-full px-4 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white focus:border-[#ea580c]/50 focus:outline-none"
                  >
                    <option value="">Select size...</option>
                    <option value="10 Yard Dumpster">10 Yard Dumpster</option>
                    <option value="20 Yard Dumpster">20 Yard Dumpster</option>
                    <option value="30 Yard Dumpster">30 Yard Dumpster</option>
                    <option value="40 Yard Dumpster">40 Yard Dumpster</option>
                    <option value="Compactor">Compactor</option>
                    <option value="Roll-off Container">Roll-off Container</option>
                    <option value="Special Container">Special Container</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm text-gray-400 mb-2 block">Quantity *</label>
                  <input
                    type="number"
                    min="1"
                    value={newWaste.quantity}
                    onChange={e => setNewWaste({ ...newWaste, quantity: parseInt(e.target.value) || 1 })}
                    className="w-full px-4 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white focus:border-[#ea580c]/50 focus:outline-none"
                  />
                </div>
              </div>

              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-blue-400 mb-3 flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Labor Details
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-gray-400 mb-2 block">Labor Hours</label>
                    <input
                      type="number"
                      min="0"
                      step="0.5"
                      value={newWaste.laborHours}
                      onChange={e => setNewWaste({ ...newWaste, laborHours: parseFloat(e.target.value) || 0 })}
                      className="w-full px-4 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white focus:border-[#ea580c]/50 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-gray-400 mb-2 block">Hourly Rate ($)</label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={newWaste.laborRate}
                      onChange={e => setNewWaste({ ...newWaste, laborRate: parseFloat(e.target.value) || 0 })}
                      className="w-full px-4 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white focus:border-[#ea580c]/50 focus:outline-none"
                    />
                  </div>
                </div>
                <div className="mt-2 flex items-center justify-between text-sm">
                  <span className="text-gray-400">Labor Cost:</span>
                  <span className="font-semibold text-blue-400">
                    ${(newWaste.laborHours * newWaste.laborRate).toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-green-400 mb-3 flex items-center gap-2">
                  <DollarSign className="w-4 h-4" />
                  Material / Disposal Costs
                </h4>
                <div>
                  <label className="text-sm text-gray-400 mb-2 block">
                    Material Cost (Container rental, disposal fees, etc.)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={newWaste.materialCost}
                    onChange={e => setNewWaste({ ...newWaste, materialCost: parseFloat(e.target.value) || 0 })}
                    className="w-full px-4 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white focus:border-[#ea580c]/50 focus:outline-none"
                  />
                </div>
              </div>

              <div className="bg-[#0A0A0A] border-2 border-[#ea580c] rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-400">Cost Per Unit:</span>
                  <span className="text-xl font-bold text-white">
                    ${((newWaste.laborHours * newWaste.laborRate) + newWaste.materialCost).toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-[#2A2A2A]">
                  <span className="text-gray-400">Total Cost (Qty: {newWaste.quantity}):</span>
                  <span className="text-2xl font-bold text-[#ea580c]">
                    ${(((newWaste.laborHours * newWaste.laborRate) + newWaste.materialCost) * newWaste.quantity).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-[#2A2A2A] flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowAddWasteModal(false);
                  setEditingWaste(null);
                  setNewWaste({ description: '', containerSize: '', quantity: 1, laborHours: 0, laborRate: 75, materialCost: 0 });
                }}
                className="px-6 py-2 bg-[#0A0A0A] hover:bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg text-white transition"
              >
                Cancel
              </button>
              <button
                onClick={editingWaste ? handleUpdateWaste : handleAddWaste}
                className="px-6 py-2 bg-[#ea580c] hover:bg-[#dc2626] rounded-lg text-white font-semibold transition"
              >
                {editingWaste ? 'Update Item' : 'Add Item'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {showPreview && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-8 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-2xl font-bold text-gray-900">Quote Preview</h3>
              <button
                onClick={() => setShowPreview(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition"
              >
                <X className="w-6 h-6 text-gray-400" />
              </button>
            </div>
            <div className="p-8 space-y-6">
              {/* Header */}
              <div className="flex items-start justify-between">
                <div>
                  <h1 className="text-4xl font-bold text-gray-900 mb-2">QUOTE</h1>
                  <p className="text-lg font-mono text-gray-600">{quote.quoteNumber}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600">Date: {quote.createdDate}</p>
                  <p className="text-sm text-gray-600">Expires: {quote.expiryDate}</p>
                </div>
              </div>

              <div className="border-t border-b border-gray-200 py-6">
                <div className="grid grid-cols-2 gap-8">
                  <div>
                    <h4 className="font-bold text-gray-900 mb-2">Bill To:</h4>
                    <p className="text-gray-700">{quote.customerName}</p>
                    {quote.businessName && <p className="text-gray-700">{quote.businessName}</p>}
                    <p className="text-gray-600">{quote.customerEmail}</p>
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 mb-2">Service:</h4>
                    <p className="text-gray-700">{quote.serviceType}</p>
                    <p className="text-sm text-gray-600 mt-2">{quote.description}</p>
                  </div>
                </div>
              </div>

              {/* Line Items */}
              <div>
                <h4 className="font-bold text-gray-900 mb-4">Items & Services</h4>
                <table className="w-full">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">#</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Description</th>
                      <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Qty</th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Unit Price</th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {lineItems.map((item, i) => (
                      <tr key={item.id}>
                        <td className="px-4 py-3 text-gray-700">{i + 1}</td>
                        <td className="px-4 py-3 text-gray-700">{item.description}</td>
                        <td className="px-4 py-3 text-center text-gray-700">{item.quantity}</td>
                        <td className="px-4 py-3 text-right text-gray-700">${item.unitPrice.toLocaleString()}</td>
                        <td className="px-4 py-3 text-right font-semibold text-gray-900">${item.total.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="border-t-2 border-gray-300">
                    <tr>
                      <td colSpan={4} className="px-4 py-3 text-right font-semibold text-gray-700">Subtotal:</td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-900">${subtotal.toLocaleString()}</td>
                    </tr>
                    <tr>
                      <td colSpan={4} className="px-4 py-2 text-right text-gray-600">Tax (8%):</td>
                      <td className="px-4 py-2 text-right text-gray-700">${tax.toLocaleString()}</td>
                    </tr>
                    <tr className="border-t-2 border-gray-900">
                      <td colSpan={4} className="px-4 py-4 text-right text-xl font-bold text-gray-900">Total:</td>
                      <td className="px-4 py-4 text-right text-2xl font-bold text-[#ea580c]">${total.toLocaleString()}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Terms */}
              <div className="bg-gray-50 rounded-lg p-6">
                <h4 className="font-bold text-gray-900 mb-2">Terms & Conditions</h4>
                <p className="text-sm text-gray-600">
                  This quote is valid until {quote.expiryDate}. Payment terms: 50% deposit required upon acceptance, 
                  remaining balance due upon completion. All work performed in accordance with industry standards and local building codes.
                </p>
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-end gap-3 bg-gray-50">
              <button
                onClick={() => setShowPreview(false)}
                className="px-6 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
              >
                Close
              </button>
              <button
                onClick={() => {
                  setShowPreview(false);
                  handleDownloadPDF();
                }}
                className="px-6 py-2 bg-[#ea580c] hover:bg-[#dc2626] rounded-lg text-white font-semibold transition flex items-center gap-2"
              >
                <Download className="w-5 h-5" />
                Download PDF
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
        <div className="bg-[#0A0A0A] border-2 border-[#ea580c]/50 rounded-2xl shadow-2xl w-[95vw] h-[95vh] flex flex-col">
          {/* Header */}
          <div className="p-6 border-b border-[#2A2A2A] flex items-center justify-between bg-gradient-to-r from-[#ea580c]/20 to-orange-600/20">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-[#ea580c] rounded-lg">
                <FileText className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">Work on Quote</h2>
                <p className="text-sm text-gray-400 font-mono">{quote.quoteNumber}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {/* AI Generate Button */}
              <button
                onClick={handleAIGenerate}
                disabled={isGenerating}
                className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold shadow-lg transition-all ${
                  isGenerating
                    ? 'bg-purple-600/50 text-purple-200 cursor-not-allowed'
                    : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white'
                }`}
              >
                {isGenerating ? (
                  <>
                    <Wand2 className="w-5 h-5 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    {lineItems.some(item => item.id.startsWith('ai-')) ? 'Re-Generate Quote' : 'AI Generate Quote'}
                  </>
                )}
              </button>

              <span className={`px-4 py-2 rounded-full text-sm font-bold text-white ${getStatusColor(quote.status)}`}>
                {getStatusLabel(quote.status)}
              </span>
              <button
                onClick={onClose}
                className="p-2 hover:bg-[#2A2A2A] rounded-lg transition"
              >
                <X className="w-6 h-6 text-gray-400" />
              </button>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Customer Information */}
            <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-6">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <User className="w-5 h-5 text-[#ea580c]" />
                Customer Information
              </h3>
              <div className="grid grid-cols-3 gap-6">
                <div>
                  <label className="text-sm text-gray-400 mb-2 block">Customer Name</label>
                  <input
                    type="text"
                    defaultValue={quote.customerName}
                    className="w-full px-4 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white focus:border-[#ea580c]/50 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-400 mb-2 block">Email</label>
                  <input
                    type="email"
                    defaultValue={quote.customerEmail}
                    className="w-full px-4 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white focus:border-[#ea580c]/50 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-400 mb-2 block">Business Name</label>
                  <input
                    type="text"
                    defaultValue={quote.businessName || ''}
                    placeholder="Optional"
                    className="w-full px-4 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white placeholder-gray-600 focus:border-[#ea580c]/50 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Quote Details */}
            <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-6">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#ea580c]" />
                Quote Details
              </h3>
              <div className="grid grid-cols-3 gap-6 mb-4">
                <div>
                  <label className="text-sm text-gray-400 mb-2 block">Service Type</label>
                  <select className="w-full px-4 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white focus:border-[#ea580c]/50 focus:outline-none">
                    <option>{quote.serviceType}</option>
                    <option>HVAC Installation</option>
                    <option>Plumbing Repair</option>
                    <option>Electrical Service</option>
                    <option>General Contracting</option>
                    <option>HVAC Maintenance</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm text-gray-400 mb-2 block">Priority</label>
                  <select className="w-full px-4 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white focus:border-[#ea580c]/50 focus:outline-none">
                    <option>{quote.priority}</option>
                    <option>low</option>
                    <option>medium</option>
                    <option>high</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm text-gray-400 mb-2 block">Assigned To</label>
                  <select className="w-full px-4 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white focus:border-[#ea580c]/50 focus:outline-none">
                    <option>{quote.assignedTo}</option>
                    <option>Mike Johnson</option>
                    <option>Tom Davis</option>
                    <option>Lisa Anderson</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-2 block">Description</label>
                <textarea
                  defaultValue={quote.description}
                  rows={4}
                  className="w-full px-4 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white focus:border-[#ea580c]/50 focus:outline-none"
                />
              </div>
            </div>

            {/* Detailed Labor Breakdown */}
            <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] overflow-hidden">
              <div className="p-6 border-b border-[#2A2A2A] bg-gradient-to-r from-blue-600/10 to-cyan-600/10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-600/20 rounded-lg">
                      <User className="w-5 h-5 text-blue-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white">Labor Breakdown</h3>
                      <p className="text-sm text-gray-400">
                        {laborItems.length} tasks • ${laborItems.reduce((sum, item) => sum + item.total, 0).toLocaleString()} total
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowLaborDetails(!showLaborDetails)}
                    className="px-4 py-2 bg-[#0A0A0A]/50 hover:bg-[#0A0A0A] border border-blue-500/30 rounded-lg text-blue-400 font-semibold transition flex items-center gap-2"
                  >
                    <Eye className="w-4 h-4" />
                    {showLaborDetails ? 'Hide' : 'Show'} Details
                  </button>
                </div>
              </div>
              
              {showLaborDetails && laborItems.length > 0 && (
                <div className="p-6">
                  <div className="bg-[#0A0A0A] rounded-lg border border-[#2A2A2A] overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-[#0F0F0F]">
                        <tr>
                          <th className="px-4 py-3 text-center text-sm font-semibold text-gray-400">View</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-400">Task</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-400">Skill Level</th>
                          <th className="px-4 py-3 text-right text-sm font-semibold text-gray-400">Hours</th>
                          <th className="px-4 py-3 text-right text-sm font-semibold text-gray-400">Rate/Hr</th>
                          <th className="px-4 py-3 text-right text-sm font-semibold text-gray-400">Cost</th>
                          <th className="px-4 py-3 text-right text-sm font-semibold text-gray-400">Markup %</th>
                          <th className="px-4 py-3 text-right text-sm font-semibold text-gray-400">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#2A2A2A]">
                        {laborItems.map(item => {
                          const itemWithMarkup = item.total * (1 + (item.markup || 0) / 100);
                          return (
                          <tr key={item.id} className={`hover:bg-[#1A1A1A]/50 transition ${!visibleLaborIds.has(item.id) ? 'opacity-30' : ''}`}>
                            <td className="px-4 py-3 text-center">
                              <button
                                onClick={() => toggleLaborVisibility(item.id)}
                                className={`p-1 rounded transition ${visibleLaborIds.has(item.id) ? 'text-blue-400 hover:bg-blue-500/10' : 'text-gray-600 hover:bg-gray-500/10'}`}
                                title={visibleLaborIds.has(item.id) ? 'Customer will see detail' : 'Customer will NOT see detail (only total)'}
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                            </td>
                            <td className="px-4 py-3 text-white font-medium">{item.task}</td>
                            <td className="px-4 py-3">
                              <span className="px-2 py-1 bg-blue-600/20 text-blue-400 rounded text-xs font-semibold">
                                {item.skill}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right text-white">{item.hours}</td>
                            <td className="px-4 py-3 text-right text-white">${item.rate}</td>
                            <td className="px-4 py-3 text-right text-gray-300">${item.total.toLocaleString()}</td>
                            <td className="px-4 py-3 text-right">
                              <input
                                type="number"
                                value={item.markup || 0}
                                onChange={(e) => {
                                  const updated = laborItems.map(i => 
                                    i.id === item.id ? { ...i, markup: Number(e.target.value) } : i
                                  );
                                  setLaborItems(updated);
                                }}
                                className="w-16 px-2 py-1 bg-[#0A0A0A] border border-blue-500/30 rounded text-white text-sm text-right"
                                placeholder="0"
                              />
                            </td>
                            <td className="px-4 py-3 text-right font-bold text-blue-400">${itemWithMarkup.toLocaleString()}</td>
                          </tr>
                        );
                        })}
                      </tbody>
                      <tfoot className="bg-[#0F0F0F] border-t-2 border-blue-500/30">
                        <tr>
                          <td colSpan={7} className="px-4 py-3 text-right text-gray-400">Base Labor Cost:</td>
                          <td className="px-4 py-3 text-right text-white">
                            ${laborSubtotal.toLocaleString()}
                          </td>
                        </tr>
                        <tr>
                          <td colSpan={7} className="px-4 py-2 text-right text-gray-400">After Individual Markups:</td>
                          <td className="px-4 py-2 text-right text-blue-200">
                            ${laborWithIndividualMarkup.toLocaleString()}
                          </td>
                        </tr>
                        <tr>
                          <td colSpan={7} className="px-4 py-2 text-right text-gray-400">
                            <div className="flex items-center justify-end gap-2">
                              <span>Section Markup:</span>
                              <input
                                type="number"
                                value={laborMarkup}
                                onChange={(e) => setLaborMarkup(Number(e.target.value))}
                                className="w-20 px-2 py-1 bg-[#0A0A0A] border border-blue-500/30 rounded text-white text-sm text-right"
                                placeholder="0"
                              />
                              <span>%</span>
                            </div>
                          </td>
                          <td className="px-4 py-2 text-right text-blue-300">
                            ${(laborWithIndividualMarkup * (laborMarkup / 100)).toLocaleString()}
                          </td>
                        </tr>
                        <tr className="border-t border-blue-500/20">
                          <td colSpan={7} className="px-4 py-4 text-right text-xl font-bold text-white">Labor Total (Customer Sees):</td>
                          <td className="px-4 py-4 text-right text-2xl font-bold text-blue-400">
                            ${laborWithMarkup.toLocaleString()}
                          </td>
                        </tr>
                        <tr>
                          <td colSpan={8} className="px-4 py-2 text-center text-xs text-gray-500">
                            Customer detail view: {visibleLaborIds.size} of {laborItems.length} items visible • Price always includes ALL items
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Detailed Materials Breakdown with Hub Access */}
            <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] overflow-hidden">
              <div className="p-6 border-b border-[#2A2A2A] bg-gradient-to-r from-purple-600/10 to-pink-600/10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-600/20 rounded-lg">
                      <Package className="w-5 h-5 text-purple-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white">Materials Breakdown</h3>
                      <p className="text-sm text-gray-400">
                        {materialItems.length} items • ${materialItems.reduce((sum, item) => sum + item.total, 0).toLocaleString()} total
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowMaterialsHub(!showMaterialsHub)}
                      className="px-4 py-2 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 rounded-lg text-white font-semibold transition flex items-center gap-2 shadow-lg shadow-orange-500/20"
                    >
                      <Package className="w-4 h-4" />
                      Materials Hub
                    </button>
                    <button
                      onClick={() => setShowMaterialsDetails(!showMaterialsDetails)}
                      className="px-4 py-2 bg-[#0A0A0A]/50 hover:bg-[#0A0A0A] border border-purple-500/30 rounded-lg text-purple-400 font-semibold transition flex items-center gap-2"
                    >
                      <Eye className="w-4 h-4" />
                      {showMaterialsDetails ? 'Hide' : 'Show'} Details
                    </button>
                  </div>
                </div>
              </div>

              {/* Materials Hub Vendor Access */}
              {showMaterialsHub && (
                <div className="p-6 bg-gradient-to-r from-orange-600/5 to-red-600/5 border-b border-[#2A2A2A]">
                  <h4 className="text-white font-bold mb-4 flex items-center gap-2">
                    <Package className="w-5 h-5 text-orange-400" />
                    Order Materials from Vendors
                  </h4>
                  <div className="grid grid-cols-3 gap-4">
                    <button
                      onClick={() => {
                        setSelectedVendor('grainger');
                        toast.info('Opening Grainger Materials Hub...');
                        window.open('/materials-hub?vendor=grainger', '_blank');
                      }}
                      className="p-4 bg-gradient-to-br from-red-600/20 to-red-700/20 hover:from-red-600/30 hover:to-red-700/30 border-2 border-red-500/40 rounded-xl transition group"
                    >
                      <div className="text-center">
                        <div className="w-12 h-12 mx-auto mb-2 bg-red-600 rounded-lg flex items-center justify-center text-white font-bold text-xl">
                          G
                        </div>
                        <p className="text-white font-bold">Grainger</p>
                        <p className="text-xs text-gray-400 mt-1">Industrial Supplies</p>
                      </div>
                    </button>
                    <button
                      onClick={() => {
                        setSelectedVendor('homedepot');
                        toast.info('Opening Home Depot Materials Hub...');
                        window.open('/materials-hub?vendor=homedepot', '_blank');
                      }}
                      className="p-4 bg-gradient-to-br from-orange-600/20 to-orange-700/20 hover:from-orange-600/30 hover:to-orange-700/30 border-2 border-orange-500/40 rounded-xl transition group"
                    >
                      <div className="text-center">
                        <div className="w-12 h-12 mx-auto mb-2 bg-orange-600 rounded-lg flex items-center justify-center text-white font-bold text-xl">
                          HD
                        </div>
                        <p className="text-white font-bold">Home Depot</p>
                        <p className="text-xs text-gray-400 mt-1">Building Materials</p>
                      </div>
                    </button>
                    <button
                      onClick={() => {
                        setSelectedVendor('lowes');
                        toast.info('Opening Lowe\'s Materials Hub...');
                        window.open('/materials-hub?vendor=lowes', '_blank');
                      }}
                      className="p-4 bg-gradient-to-br from-blue-600/20 to-blue-700/20 hover:from-blue-600/30 hover:to-blue-700/30 border-2 border-blue-500/40 rounded-xl transition group"
                    >
                      <div className="text-center">
                        <div className="w-12 h-12 mx-auto mb-2 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-xl">
                          L
                        </div>
                        <p className="text-white font-bold">Lowe's</p>
                        <p className="text-xs text-gray-400 mt-1">Home Improvement</p>
                      </div>
                    </button>
                  </div>
                </div>
              )}
              
              {showMaterialsDetails && materialItems.length > 0 && (
                <div className="p-6">
                  <div className="bg-[#0A0A0A] rounded-lg border border-[#2A2A2A] overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-[#0F0F0F]">
                        <tr>
                          <th className="px-4 py-3 text-center text-sm font-semibold text-gray-400">View</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-400">Item</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-400">Category</th>
                          <th className="px-4 py-3 text-right text-sm font-semibold text-gray-400">Quantity</th>
                          <th className="px-4 py-3 text-right text-sm font-semibold text-gray-400">Unit Price</th>
                          <th className="px-4 py-3 text-right text-sm font-semibold text-gray-400">Cost</th>
                          <th className="px-4 py-3 text-right text-sm font-semibold text-gray-400">Markup %</th>
                          <th className="px-4 py-3 text-right text-sm font-semibold text-gray-400">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#2A2A2A]">
                        {materialItems.map(item => {
                          const itemWithMarkup = item.total * (1 + (item.markup || 0) / 100);
                          return (
                          <tr key={item.id} className={`hover:bg-[#1A1A1A]/50 transition ${!visibleMaterialIds.has(item.id) ? 'opacity-30' : ''}`}>
                            <td className="px-4 py-3 text-center">
                              <button
                                onClick={() => toggleMaterialVisibility(item.id)}
                                className={`p-1 rounded transition ${visibleMaterialIds.has(item.id) ? 'text-purple-400 hover:bg-purple-500/10' : 'text-gray-600 hover:bg-gray-500/10'}`}
                                title={visibleMaterialIds.has(item.id) ? 'Customer will see detail' : 'Customer will NOT see detail (only total)'}
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                            </td>
                            <td className="px-4 py-3">
                              <p className="text-white font-medium">{item.item}</p>
                              {item.sku && <p className="text-xs text-gray-500">SKU: {item.sku}</p>}
                            </td>
                            <td className="px-4 py-3">
                              <span className="px-2 py-1 bg-purple-600/20 text-purple-400 rounded text-xs font-semibold">
                                {item.category}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right text-white">
                              {item.quantity} {item.unit}
                            </td>
                            <td className="px-4 py-3 text-right text-white">${item.unitPrice.toLocaleString()}</td>
                            <td className="px-4 py-3 text-right text-gray-300">${item.total.toLocaleString()}</td>
                            <td className="px-4 py-3 text-right">
                              <input
                                type="number"
                                value={item.markup || 0}
                                onChange={(e) => {
                                  const updated = materialItems.map(i => 
                                    i.id === item.id ? { ...i, markup: Number(e.target.value) } : i
                                  );
                                  setMaterialItems(updated);
                                }}
                                className="w-16 px-2 py-1 bg-[#0A0A0A] border border-purple-500/30 rounded text-white text-sm text-right"
                                placeholder="0"
                              />
                            </td>
                            <td className="px-4 py-3 text-right font-bold text-purple-400">${itemWithMarkup.toLocaleString()}</td>
                          </tr>
                        );
                        })}
                      </tbody>
                      <tfoot className="bg-[#0F0F0F] border-t-2 border-purple-500/30">
                        <tr>
                          <td colSpan={7} className="px-4 py-3 text-right text-gray-400">Base Materials Cost:</td>
                          <td className="px-4 py-3 text-right text-white">
                            ${materialsSubtotal.toLocaleString()}
                          </td>
                        </tr>
                        <tr>
                          <td colSpan={7} className="px-4 py-2 text-right text-gray-400">After Individual Markups:</td>
                          <td className="px-4 py-2 text-right text-purple-200">
                            ${materialsWithIndividualMarkup.toLocaleString()}
                          </td>
                        </tr>
                        <tr>
                          <td colSpan={7} className="px-4 py-2 text-right text-gray-400">
                            <div className="flex items-center justify-end gap-2">
                              <span>Section Markup:</span>
                              <input
                                type="number"
                                value={materialsMarkup}
                                onChange={(e) => setMaterialsMarkup(Number(e.target.value))}
                                className="w-20 px-2 py-1 bg-[#0A0A0A] border border-purple-500/30 rounded text-white text-sm text-right"
                                placeholder="0"
                              />
                              <span>%</span>
                            </div>
                          </td>
                          <td className="px-4 py-2 text-right text-purple-300">
                            ${(materialsWithIndividualMarkup * (materialsMarkup / 100)).toLocaleString()}
                          </td>
                        </tr>
                        <tr className="border-t border-purple-500/20">
                          <td colSpan={7} className="px-4 py-4 text-right text-xl font-bold text-white">Materials Total (Customer Sees):</td>
                          <td className="px-4 py-4 text-right text-2xl font-bold text-purple-400">
                            ${materialsWithMarkup.toLocaleString()}
                          </td>
                        </tr>
                        <tr>
                          <td colSpan={8} className="px-4 py-2 text-center text-xs text-gray-500">
                            Customer detail view: {visibleMaterialIds.size} of {materialItems.length} items visible • Price always includes ALL items
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Line Items */}
            <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Package className="w-5 h-5 text-[#ea580c]" />
                  Line Items ({quote.itemCount})
                </h3>
                <button
                  onClick={() => setShowAddItemModal(true)}
                  className="px-4 py-2 bg-[#ea580c] hover:bg-[#dc2626] rounded-lg text-white font-semibold transition"
                >
                  + Add Item
                </button>
              </div>

              {/* AI Generation Banner */}
              {isGenerating && (
                <div className="mb-4 p-4 bg-gradient-to-r from-purple-600/20 to-pink-600/20 border border-purple-500/30 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Wand2 className="w-5 h-5 text-purple-400 animate-spin" />
                    <div>
                      <p className="text-white font-semibold">AI is generating your quote...</p>
                      <p className="text-sm text-gray-400">Analyzing project details and creating detailed labor tasks and materials list</p>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Line Items Table */}
              <div className="bg-[#0A0A0A] rounded-lg border border-[#2A2A2A] overflow-hidden">
                <table className="w-full">
                  <thead className="bg-[#0F0F0F]">
                    <tr>
                      <th className="px-4 py-3 text-center text-sm font-semibold text-gray-400">View</th>
                      <th className="px-4 py-3 text-center">
                        <input
                          type="checkbox"
                          checked={selectedItemIds.size === lineItems.length && lineItems.length > 0}
                          onChange={toggleSelectAll}
                          className="w-4 h-4 rounded border-gray-600 bg-[#0A0A0A] text-[#ea580c] focus:ring-[#ea580c] focus:ring-offset-0 cursor-pointer"
                        />
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-400">#</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-400">Description</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-400">Qty</th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-gray-400">Unit Price</th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-gray-400">Total</th>
                      <th className="px-4 py-3 text-center text-sm font-semibold text-gray-400">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#2A2A2A]">
                    {lineItems.map(item => (
                      <tr key={item.id} className={`hover:bg-[#1A1A1A]/50 transition ${selectedItemIds.has(item.id) ? 'bg-[#ea580c]/10' : ''} ${!visibleLineItemIds.has(item.id) ? 'opacity-30' : ''}`}>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => toggleLineItemVisibility(item.id)}
                            className={`p-1 rounded transition ${visibleLineItemIds.has(item.id) ? 'text-[#ea580c] hover:bg-[#ea580c]/10' : 'text-gray-600 hover:bg-gray-500/10'}`}
                            title={visibleLineItemIds.has(item.id) ? 'Customer will see detail' : 'Customer will NOT see detail (only total)'}
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <input
                            type="checkbox"
                            checked={selectedItemIds.has(item.id)}
                            onChange={() => toggleItemSelection(item.id)}
                            className="w-4 h-4 rounded border-gray-600 bg-[#0A0A0A] text-[#ea580c] focus:ring-[#ea580c] focus:ring-offset-0 cursor-pointer"
                          />
                        </td>
                        <td className="px-4 py-3 text-white">{item.id}</td>
                        <td className="px-4 py-3 text-white">{item.description}</td>
                        <td className="px-4 py-3 text-white">{item.quantity}</td>
                        <td className="px-4 py-3 text-right text-white">${item.unitPrice.toLocaleString()}</td>
                        <td className="px-4 py-3 text-right font-bold text-[#ea580c]">${item.total.toLocaleString()}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => handleEditItem(item)}
                              className="p-1 text-blue-400 hover:bg-blue-500/10 rounded transition"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteItem(item.id)}
                              className="p-1 text-red-400 hover:bg-red-500/10 rounded transition"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-[#0F0F0F]">
                    <tr>
                      <td colSpan={6} className="px-4 py-3 text-right text-gray-400">Line Items Cost:</td>
                      <td className="px-4 py-3 text-right text-white">${lineItemsSubtotal.toLocaleString()}</td>
                      <td></td>
                    </tr>
                    <tr>
                      <td colSpan={6} className="px-4 py-2 text-right text-gray-400">
                        <div className="flex items-center justify-end gap-2">
                          <span>Markup:</span>
                          <input
                            type="number"
                            value={lineItemsMarkup}
                            onChange={(e) => setLineItemsMarkup(Number(e.target.value))}
                            className="w-20 px-2 py-1 bg-[#0A0A0A] border border-[#ea580c]/30 rounded text-white text-sm text-right"
                            placeholder="0"
                          />
                          <span>%</span>
                        </div>
                      </td>
                      <td className="px-4 py-2 text-right text-[#ea580c]/70">
                        ${(lineItemsSubtotal * (lineItemsMarkup / 100)).toLocaleString()}
                      </td>
                      <td></td>
                    </tr>
                    <tr className="border-t border-[#2A2A2A]">
                      <td colSpan={6} className="px-4 py-3 text-right font-bold text-white">Line Items Total:</td>
                      <td className="px-4 py-3 text-right font-bold text-[#ea580c]">
                        ${lineItemsWithMarkup.toLocaleString()}
                      </td>
                      <td></td>
                    </tr>
                    <tr>
                      <td colSpan={6} className="px-4 py-3 text-right text-gray-400">Waste & Disposal Cost:</td>
                      <td className="px-4 py-3 text-right text-white">${wasteSubtotal.toLocaleString()}</td>
                      <td></td>
                    </tr>
                    <tr>
                      <td colSpan={6} className="px-4 py-2 text-right text-gray-400">
                        <div className="flex items-center justify-end gap-2">
                          <span>Markup:</span>
                          <input
                            type="number"
                            value={wasteMarkup}
                            onChange={(e) => setWasteMarkup(Number(e.target.value))}
                            className="w-20 px-2 py-1 bg-[#0A0A0A] border border-green-500/30 rounded text-white text-sm text-right"
                            placeholder="0"
                          />
                          <span>%</span>
                        </div>
                      </td>
                      <td className="px-4 py-2 text-right text-green-300">
                        ${(wasteSubtotal * (wasteMarkup / 100)).toLocaleString()}
                      </td>
                      <td></td>
                    </tr>
                    <tr className="border-t border-[#2A2A2A]">
                      <td colSpan={6} className="px-4 py-3 text-right font-bold text-white">Waste Total:</td>
                      <td className="px-4 py-3 text-right font-bold text-green-400">
                        ${wasteWithMarkup.toLocaleString()}
                      </td>
                      <td></td>
                    </tr>
                    <tr className="border-t-2 border-[#ea580c]/30">
                      <td colSpan={6} className="px-4 py-4 text-right font-bold text-white">Subtotal (All Items):</td>
                      <td className="px-4 py-4 text-right font-bold text-white">
                        ${subtotal.toLocaleString()}
                      </td>
                      <td></td>
                    </tr>
                    <tr>
                      <td colSpan={6} className="px-4 py-2 text-right text-gray-400">Tax (8%):</td>
                      <td className="px-4 py-2 text-right text-gray-400">
                        ${tax.toLocaleString()}
                      </td>
                      <td></td>
                    </tr>
                    <tr className="border-t-2 border-[#ea580c]">
                      <td colSpan={6} className="px-4 py-4 text-right text-xl font-bold text-white">Grand Total (Customer Sees):</td>
                      <td className="px-4 py-4 text-right text-2xl font-bold text-[#ea580c]">
                        ${total.toLocaleString()}
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Waste & Disposal Section */}
            <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Recycle className="w-5 h-5 text-green-400" />
                  Waste & Disposal ({wasteDisposalItems.length} items)
                </h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowWasteDetails(!showWasteDetails)}
                    className="px-4 py-2 bg-[#0A0A0A]/50 hover:bg-[#0A0A0A] border border-green-500/30 rounded-lg text-green-400 font-semibold transition flex items-center gap-2"
                  >
                    <Eye className="w-4 h-4" />
                    {showWasteDetails ? 'Hide' : 'Show'}
                  </button>
                  <button
                    onClick={() => setShowAddWasteModal(true)}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-white font-semibold transition flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Add Waste Item
                  </button>
                </div>
              </div>

              {showWasteDetails && (wasteDisposalItems.length === 0 ? (
                <div className="bg-[#0A0A0A] border border-dashed border-[#2A2A2A] rounded-lg p-8 text-center">
                  <Recycle className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-400 mb-2">No waste disposal items added</p>
                  <p className="text-sm text-gray-500">Click "Add Waste Item" to include trash removal costs</p>
                </div>
              ) : (
                <div className="bg-[#0A0A0A] rounded-lg border border-[#2A2A2A] overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-[#0F0F0F]">
                      <tr>
                        <th className="px-4 py-3 text-center text-sm font-semibold text-gray-400">View</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-400">Description</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-400">Container</th>
                        <th className="px-4 py-3 text-center text-sm font-semibold text-gray-400">Qty</th>
                        <th className="px-4 py-3 text-right text-sm font-semibold text-gray-400">Labor (hrs)</th>
                        <th className="px-4 py-3 text-right text-sm font-semibold text-gray-400">Rate</th>
                        <th className="px-4 py-3 text-right text-sm font-semibold text-gray-400">Materials</th>
                        <th className="px-4 py-3 text-right text-sm font-semibold text-gray-400">Total</th>
                        <th className="px-4 py-3 text-center text-sm font-semibold text-gray-400">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#2A2A2A]">
                      {wasteDisposalItems.map(item => {
                        const laborCost = item.laborHours * item.laborRate;
                        return (
                          <tr key={item.id} className={`hover:bg-[#1A1A1A]/50 transition ${!visibleWasteIds.has(item.id) ? 'opacity-30' : ''}`}>
                            <td className="px-4 py-3 text-center">
                              <button
                                onClick={() => toggleWasteVisibility(item.id)}
                                className={`p-1 rounded transition ${visibleWasteIds.has(item.id) ? 'text-green-400 hover:bg-green-500/10' : 'text-gray-600 hover:bg-gray-500/10'}`}
                                title={visibleWasteIds.has(item.id) ? 'Customer will see detail' : 'Customer will NOT see detail (only total)'}
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                            </td>
                            <td className="px-4 py-3 text-white">{item.description}</td>
                            <td className="px-4 py-3 text-gray-300 text-sm">{item.containerSize}</td>
                            <td className="px-4 py-3 text-center text-white">{item.quantity}</td>
                            <td className="px-4 py-3 text-right text-gray-300">{item.laborHours}</td>
                            <td className="px-4 py-3 text-right text-gray-300">${item.laborRate}</td>
                            <td className="px-4 py-3 text-right text-gray-300">${item.materialCost.toLocaleString()}</td>
                            <td className="px-4 py-3 text-right font-bold text-green-400">${item.total.toLocaleString()}</td>
                            <td className="px-4 py-3">
                              <div className="flex items-center justify-center gap-2">
                                <button
                                  onClick={() => handleEditWaste(item)}
                                  className="p-1 text-blue-400 hover:bg-blue-500/10 rounded transition"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteWaste(item.id)}
                                  className="p-1 text-red-400 hover:bg-red-500/10 rounded transition"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot className="bg-[#0F0F0F]">
                      <tr>
                        <td colSpan={7} className="px-4 py-3 text-right font-bold text-green-400">Waste Disposal Cost (ALL items):</td>
                        <td className="px-4 py-3 text-right font-bold text-green-400">
                          ${wasteSubtotal.toLocaleString()}
                        </td>
                        <td></td>
                      </tr>
                      <tr>
                        <td colSpan={9} className="px-4 py-2 text-center text-xs text-gray-500">
                          Showing {visibleWasteIds.size} of {wasteDisposalItems.length} waste items
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              ))}

              {showWasteDetails && (
                <div className="mt-4 bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <Recycle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                    <div className="text-sm">
                      <p className="text-green-300 font-semibold mb-1">Waste & Disposal Pricing</p>
                      <p className="text-green-300/80">
                        Includes labor hours for loading/removal and material costs (container rental, dump fees, disposal charges). 
                        Edit each item to adjust labor hours, rates, and material costs.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Attachments */}
            <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Package className="w-5 h-5 text-[#ea580c]" />
                  Attachments ({attachments.length} files)
                </h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowAttachments(!showAttachments)}
                    className="px-4 py-2 bg-[#0A0A0A]/50 hover:bg-[#0A0A0A] border border-[#ea580c]/30 rounded-lg text-[#ea580c] font-semibold transition flex items-center gap-2"
                  >
                    <Eye className="w-4 h-4" />
                    {showAttachments ? 'Hide' : 'Show'}
                  </button>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-2 bg-[#ea580c] hover:bg-[#dc2626] rounded-lg text-white font-semibold transition"
                  >
                    + Upload File
                  </button>
                </div>
              </div>
              {showAttachments && (
                <div className="grid grid-cols-3 gap-4">
                {attachments.map(att => (
                  <div key={att.id} className={`bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg p-4 hover:border-[#ea580c]/50 transition ${!visibleAttachmentIds.has(att.id) ? 'opacity-30' : ''}`}>
                    <div className="flex items-center gap-2 mb-3">
                      <button
                        onClick={() => toggleAttachmentVisibility(att.id)}
                        className={`p-1 rounded transition flex-shrink-0 ${visibleAttachmentIds.has(att.id) ? 'text-[#ea580c] hover:bg-[#ea580c]/10' : 'text-gray-600 hover:bg-gray-500/10'}`}
                        title={visibleAttachmentIds.has(att.id) ? 'Customer will see attachment' : 'Customer will NOT see attachment'}
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      {getFileIcon(att.type)}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white truncate">{att.name}</p>
                        <p className="text-xs text-gray-400">{att.size}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleViewAttachment(att)}
                        className="flex-1 px-3 py-1 bg-blue-600/20 hover:bg-blue-600/30 rounded text-blue-400 text-xs font-semibold transition"
                      >
                        View
                      </button>
                      <button
                        onClick={() => handleDeleteAttachment(att.id)}
                        className="px-3 py-1 bg-red-600/20 hover:bg-red-600/30 rounded text-red-400 text-xs font-semibold transition"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
                </div>
              )}
              <input
                type="file"
                ref={fileInputRef}
                multiple
                className="hidden"
                onChange={handleFileUpload}
              />
            </div>

            {/* Notes & Comments */}
            <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-[#ea580c]" />
                  Notes & Comments ({notes.length})
                </h3>
                <button
                  onClick={() => setShowNotes(!showNotes)}
                  className="px-4 py-2 bg-[#0A0A0A]/50 hover:bg-[#0A0A0A] border border-[#ea580c]/30 rounded-lg text-[#ea580c] font-semibold transition flex items-center gap-2"
                >
                  <Eye className="w-4 h-4" />
                  {showNotes ? 'Hide' : 'Show'}
                </button>
              </div>
              {showNotes && (
                <div className="space-y-4 mb-4">
                {notes.map(note => (
                  <div key={note.id} className={`bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg p-4 ${!visibleNoteIds.has(note.id) ? 'opacity-30' : ''}`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => toggleNoteVisibility(note.id)}
                          className={`p-1 rounded transition ${visibleNoteIds.has(note.id) ? 'text-[#ea580c] hover:bg-[#ea580c]/10' : 'text-gray-600 hover:bg-gray-500/10'}`}
                          title={visibleNoteIds.has(note.id) ? 'Customer will see note' : 'Customer will NOT see note'}
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <div className="w-8 h-8 bg-[#ea580c] rounded-full flex items-center justify-center">
                          <span className="text-white text-sm font-bold">{note.initials}</span>
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-white">{note.author}</p>
                          <p className="text-xs text-gray-400">{note.timestamp}</p>
                        </div>
                      </div>
                    </div>
                    <p className="text-gray-300 text-sm">{note.content}</p>
                  </div>
                ))}
                </div>
              )}
              {showNotes && (
                <div className="flex gap-3">
                  <textarea
                    placeholder="Add a note or comment..."
                    rows={3}
                    value={newNote}
                    onChange={e => setNewNote(e.target.value)}
                    className="flex-1 px-4 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white placeholder-gray-600 focus:border-[#ea580c]/50 focus:outline-none"
                  />
                  <button
                    onClick={handleAddNote}
                    className="px-6 py-2 bg-[#ea580c] hover:bg-[#dc2626] rounded-lg text-white font-semibold transition flex items-center gap-2"
                  >
                    <Send className="w-4 h-4" />
                    Add Note
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="p-6 border-t border-[#2A2A2A] bg-[#0F0F0F] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={handleSaveDraft}
                className="px-6 py-3 bg-[#1A1A1A] hover:bg-[#2A2A2A] border border-[#2A2A2A] rounded-xl text-white font-bold transition"
              >
                Save Draft
              </button>
              <button
                onClick={handlePreview}
                className="px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-xl text-white font-bold transition flex items-center gap-2"
              >
                <Eye className="w-5 h-5" />
                Preview
              </button>
              {selectedItemIds.size > 0 && (
                <button
                  onClick={() => setShowBidRoomModal(true)}
                  className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 rounded-xl text-white font-bold transition flex items-center gap-2 shadow-lg shadow-green-500/30"
                >
                  <Users className="w-5 h-5" />
                  Send {selectedItemIds.size} to Bid Room
                </button>
              )}
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleDownloadPDF}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-xl text-white font-bold transition flex items-center gap-2"
              >
                <Download className="w-5 h-5" />
                Download PDF
              </button>
              <button
                onClick={handleSendToCustomer}
                className="px-6 py-3 bg-[#ea580c] hover:bg-[#dc2626] rounded-xl text-white font-bold transition flex items-center gap-2"
              >
                <Send className="w-5 h-5" />
                Send to Customer
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Bid Room Modal */}
      {showBidRoomModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl shadow-2xl max-w-2xl w-full">
            <div className="p-6 border-b border-[#2A2A2A] flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-white mb-1">Send Items to Bid Room</h2>
                <p className="text-gray-400">Set a deadline for subcontractors to submit bids</p>
              </div>
              <button
                onClick={() => {
                  setShowBidRoomModal(false);
                  setBidDeadline('');
                }}
                className="p-2 hover:bg-[#2A2A2A] rounded-lg transition"
              >
                <X className="w-6 h-6 text-gray-400" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Selected Items Summary */}
              <div className="bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 rounded-xl p-6">
                <h3 className="text-sm font-bold text-gray-400 mb-3">SELECTED ITEMS ({selectedItemIds.size})</h3>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {lineItems.filter(item => selectedItemIds.has(item.id)).map(item => (
                    <div key={item.id} className="flex items-center justify-between bg-[#0A0A0A]/50 rounded-lg p-3">
                      <div className="flex-1">
                        <p className="text-white font-semibold">{item.description}</p>
                        <p className="text-sm text-gray-400">Qty: {item.quantity} @ ${item.unitPrice.toLocaleString()}</p>
                      </div>
                      <div className="text-emerald-400 font-bold text-lg">
                        ${item.total.toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 pt-4 border-t border-emerald-500/20 flex items-center justify-between">
                  <span className="text-gray-300 font-semibold">Total Budget for Bidding:</span>
                  <span className="text-emerald-400 font-bold text-2xl">
                    ${lineItems.filter(item => selectedItemIds.has(item.id)).reduce((sum, item) => sum + item.total, 0).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Quote Info */}
              <div className="bg-[#0A0A0A] rounded-xl p-4 border border-[#2A2A2A]">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-400">Quote Number:</span>
                    <span className="text-white font-mono font-bold ml-2">{quote.quoteNumber}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Customer:</span>
                    <span className="text-white font-semibold ml-2">{quote.customerName}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Service Type:</span>
                    <span className="text-white font-semibold ml-2">{quote.serviceType}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Priority:</span>
                    <span className="text-orange-400 font-bold ml-2 uppercase">{quote.priority}</span>
                  </div>
                </div>
              </div>

              {/* Bid Deadline */}
              <div>
                <label className="block text-sm font-semibold text-gray-400 mb-3">
                  Bid Deadline *
                </label>
                <input
                  type="date"
                  value={bidDeadline}
                  onChange={(e) => setBidDeadline(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white focus:border-emerald-500/50 focus:outline-none"
                />
                <p className="text-xs text-gray-500 mt-2">
                  Subcontractors will have until this date to submit their competitive bids
                </p>
              </div>

              {/* Info Box */}
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Users className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-blue-400 font-semibold mb-1">Competitive Bidding Process</p>
                    <p className="text-sm text-gray-300">
                      Selected items will be posted to the Bid Room where approved subcontractors can submit competitive bids. 
                      You'll be able to review all bids and select the best offer for your project.
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t border-[#2A2A2A]">
                <button
                  onClick={() => {
                    setShowBidRoomModal(false);
                    setBidDeadline('');
                  }}
                  className="flex-1 px-6 py-3 bg-[#1A1A1A] border border-[#2A2A2A] hover:bg-[#2A2A2A] hover:border-[#3A3A3A] rounded-xl text-white font-bold transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSendToBidRoom}
                  disabled={!bidDeadline}
                  className={`flex-1 px-6 py-3 rounded-xl text-white font-bold transition flex items-center justify-center gap-2 ${
                    bidDeadline
                      ? 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 shadow-lg shadow-green-500/30'
                      : 'bg-gray-600 cursor-not-allowed opacity-50'
                  }`}
                >
                  <Users className="w-5 h-5" />
                  Send to Bid Room
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Materials Hub Modal */}
      <QuoteMaterialsHub
        isOpen={showMaterialsHub}
        onClose={() => setShowMaterialsHub(false)}
        onAddToQuote={(items) => {
          // Convert cart items to material items
          const newMaterials = items.map((item, index) => ({
            id: `mat-hub-${Date.now()}-${index}`,
            item: item.name,
            category: item.category,
            quantity: item.quantity,
            unit: item.unit,
            unitPrice: item.price,
            total: (item.price * item.quantity) * (1 + (item.markup || 0) / 100),
            vendor: item.vendor,
            sku: item.sku,
            markup: item.markup || 0
          }));
          
          // Add to existing materials
          setMaterialItems([...materialItems, ...newMaterials]);
          toast.success(`Added ${items.length} materials from hub`);
        }}
        existingItems={materialItems}
        quoteId={quote.id}
      />
    </>
  );
}