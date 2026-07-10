/**
 * Auto Quote Generator
 * Automatically generates comprehensive quotes when work requests are submitted
 * Features:
 * - Detailed labor breakdown with hours and rates (all editable)
 * - Comprehensive materials list (all editable)
 * - Toggle visibility for each line item
 * - Auto-generate floor plans, layouts, and renderings on quote approval
 */

import { useState, useEffect } from 'react';
import { 
  Wand2, Eye, EyeOff, Edit3, Save, Trash2, Plus, DollarSign, Clock, 
  Package, Wrench, CheckCircle, Loader2, ImageIcon, FileText, Layout,
  Brain, Sparkles, ChevronDown, ChevronUp, AlertCircle
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { projectId, publicAnonKey } from '../utils/supabase/info';

const API_BASE = `https://${projectId}.supabase.co/functions/v1/make-server-57095a78`;

interface LaborLineItem {
  id: string;
  role: string;
  description: string;
  hours: number;
  hourlyRate: number;
  total: number;
  visible: boolean;
  editable: boolean;
}

interface MaterialLineItem {
  id: string;
  name: string;
  description: string;
  quantity: number;
  unit: string;
  unitCost: number;
  total: number;
  category: string;
  supplier?: string;
  visible: boolean;
  editable: boolean;
}

interface FloorPlanAsset {
  id: string;
  type: 'floorplan' | 'layout' | 'cabinet_layout' | 'schedule' | 'rendering';
  name: string;
  url: string;
  generatedAt: string;
}

interface AutoQuoteGeneratorProps {
  workRequestId: string;
  workRequestData: any;
  onQuoteGenerated?: (quoteId: string) => void;
  onClose?: () => void;
}

export default function AutoQuoteGenerator({ 
  workRequestId, 
  workRequestData, 
  onQuoteGenerated,
  onClose 
}: AutoQuoteGeneratorProps) {
  const [isGenerating, setIsGenerating] = useState(true);
  const [laborItems, setLaborItems] = useState<LaborLineItem[]>([]);
  const [materialItems, setMaterialItems] = useState<MaterialLineItem[]>([]);
  const [floorPlanAssets, setFloorPlanAssets] = useState<FloorPlanAsset[]>([]);
  const [isGeneratingFloorPlans, setIsGeneratingFloorPlans] = useState(false);
  
  const [quoteMetadata, setQuoteMetadata] = useState({
    quoteNumber: '',
    createdAt: new Date().toISOString(),
    validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'draft' as 'draft' | 'sent' | 'approved' | 'rejected'
  });

  const [expandedSections, setExpandedSections] = useState({
    labor: true,
    materials: true,
    floorPlans: true
  });

  const [editingItem, setEditingItem] = useState<{type: 'labor' | 'material', id: string} | null>(null);
  const [materialsMarkupPercent, setMaterialsMarkupPercent] = useState(0); // Loaded from profit settings

  // Auto-generate quote on mount
  useEffect(() => {
    generateQuote();
  }, []);

  const generateQuote = async () => {
    setIsGenerating(true);
    try {
      // First, fetch configured labor rates
      const ratesResponse = await fetch(
        `${API_BASE}/labor-rates/get`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`
          }
        }
      );

      let configuredRates: any = null;
      let profitSettings: any = null;

      if (ratesResponse.ok) {
        const ratesData = await ratesResponse.json();
        configuredRates = ratesData.laborRates?.laborRates || null;
        profitSettings = ratesData.profitSettings || null;
        console.log('[AutoQuoteGenerator] Loaded configured rates:', configuredRates?.length || 0);
        console.log('[AutoQuoteGenerator] Loaded profit settings:', profitSettings);
        
        // Set materials markup percentage from profit settings
        if (profitSettings?.materialsMarkup) {
          setMaterialsMarkupPercent(profitSettings.materialsMarkup);
        }
      }

      // Call server to generate comprehensive quote
      const response = await fetch(
        `${API_BASE}/quotes/auto-generate`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            workRequestId,
            workRequestData,
            configuredRates,
            profitSettings
          })
        }
      );

      if (!response.ok) {
        throw new Error('Failed to generate quote');
      }

      const data = await response.json();
      
      setQuoteMetadata({
        quoteNumber: data.quoteNumber,
        createdAt: data.createdAt,
        validUntil: data.validUntil,
        status: 'draft'
      });

      // Set labor items (all editable and visible by default)
      setLaborItems(data.labor.map((item: any) => ({
        ...item,
        visible: true,
        editable: true
      })));

      // Set material items (all editable and visible by default)
      setMaterialItems(data.materials.map((item: any) => ({
        ...item,
        visible: true,
        editable: true
      })));

      toast.success('Quote generated successfully!', {
        description: `${data.labor.length} labor items and ${data.materials.length} material items added`
      });

    } catch (error) {
      console.error('Error generating quote:', error);
      toast.error('Failed to generate quote');
      
      // Fallback to mock data for demo
      generateMockQuote();
    } finally {
      setIsGenerating(false);
    }
  };

  const generateMockQuote = () => {
    const quoteNum = `QT-${Date.now().toString().slice(-6)}`;
    setQuoteMetadata({
      quoteNumber: quoteNum,
      createdAt: new Date().toISOString(),
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'draft'
    });

    // Comprehensive Labor Items
    setLaborItems([
      { id: 'l1', role: 'Project Manager', description: 'Overall project coordination and management', hours: 40, hourlyRate: 85, total: 3400, visible: true, editable: true },
      { id: 'l2', role: 'Lead Carpenter', description: 'Cabinet installation and trim work', hours: 80, hourlyRate: 65, total: 5200, visible: true, editable: true },
      { id: 'l3', role: 'Carpenter Assistant', description: 'Cabinet prep and installation support', hours: 80, hourlyRate: 45, total: 3600, visible: true, editable: true },
      { id: 'l4', role: 'Licensed Electrician', description: 'Electrical upgrades, new circuits, under-cabinet lighting', hours: 24, hourlyRate: 95, total: 2280, visible: true, editable: true },
      { id: 'l5', role: 'Electrician Helper', description: 'Wire pulling and installation support', hours: 24, hourlyRate: 55, total: 1320, visible: true, editable: true },
      { id: 'l6', role: 'Licensed Plumber', description: 'Sink installation, dishwasher hookup, disposal', hours: 16, hourlyRate: 105, total: 1680, visible: true, editable: true },
      { id: 'l7', role: 'Plumber Helper', description: 'Plumbing support and prep work', hours: 16, hourlyRate: 60, total: 960, visible: true, editable: true },
      { id: 'l8', role: 'Drywall Specialist', description: 'Wall patching, texturing, finish work', hours: 24, hourlyRate: 55, total: 1320, visible: true, editable: true },
      { id: 'l9', role: 'Professional Painter', description: 'Prime and paint walls, ceiling, trim', hours: 32, hourlyRate: 50, total: 1600, visible: true, editable: true },
      { id: 'l10', role: 'Tile Installer', description: 'Backsplash tile installation', hours: 16, hourlyRate: 70, total: 1120, visible: true, editable: true },
      { id: 'l11', role: 'Countertop Installer', description: 'Template, fabricate, and install granite countertops', hours: 12, hourlyRate: 85, total: 1020, visible: true, editable: true },
      { id: 'l12', role: 'Demolition Crew', description: 'Remove existing cabinets, countertops, flooring', hours: 16, hourlyRate: 40, total: 640, visible: true, editable: true },
      { id: 'l13', role: 'Cleanup Crew', description: 'Daily cleanup and final detail cleaning', hours: 20, hourlyRate: 35, total: 700, visible: true, editable: true },
      { id: 'l14', role: 'Inspector Coordination', description: 'Schedule and coordinate all inspections', hours: 4, hourlyRate: 75, total: 300, visible: true, editable: true },
    ]);

    // Comprehensive Material Items
    setMaterialItems([
      // Permits & Fees
      { id: 'm1', name: 'Building Permit', description: 'Kitchen renovation permit', quantity: 1, unit: 'permit', unitCost: 425, total: 425, category: 'Permits & Fees', supplier: 'City Building Dept', visible: true, editable: true },
      { id: 'm2', name: 'Electrical Permit', description: 'Electrical work permit', quantity: 1, unit: 'permit', unitCost: 150, total: 150, category: 'Permits & Fees', supplier: 'City Building Dept', visible: true, editable: true },
      { id: 'm3', name: 'Plumbing Permit', description: 'Plumbing modification permit', quantity: 1, unit: 'permit', unitCost: 125, total: 125, category: 'Permits & Fees', supplier: 'City Building Dept', visible: true, editable: true },
      
      // Cabinets
      { id: 'm4', name: 'Upper Cabinets 36"', description: 'White shaker style wall cabinets', quantity: 4, unit: 'units', unitCost: 425, total: 1700, category: 'Cabinetry', supplier: 'Premier Cabinet Co', visible: true, editable: true },
      { id: 'm5', name: 'Upper Cabinets 30"', description: 'White shaker style wall cabinets', quantity: 3, unit: 'units', unitCost: 375, total: 1125, category: 'Cabinetry', supplier: 'Premier Cabinet Co', visible: true, editable: true },
      { id: 'm6', name: 'Base Cabinets 36"', description: 'White shaker style base cabinets', quantity: 3, unit: 'units', unitCost: 495, total: 1485, category: 'Cabinetry', supplier: 'Premier Cabinet Co', visible: true, editable: true },
      { id: 'm7', name: 'Base Cabinets 24"', description: 'White shaker style base cabinets', quantity: 2, unit: 'units', unitCost: 385, total: 770, category: 'Cabinetry', supplier: 'Premier Cabinet Co', visible: true, editable: true },
      { id: 'm8', name: 'Sink Base Cabinet 36"', description: 'Sink base with false drawer front', quantity: 1, unit: 'unit', unitCost: 525, total: 525, category: 'Cabinetry', supplier: 'Premier Cabinet Co', visible: true, editable: true },
      { id: 'm9', name: 'Lazy Susan Corner', description: '36" corner base with hardware', quantity: 1, unit: 'unit', unitCost: 675, total: 675, category: 'Cabinetry', supplier: 'Premier Cabinet Co', visible: true, editable: true },
      
      // Hardware
      { id: 'm10', name: 'Cabinet Hinges', description: 'Soft-close European hinges', quantity: 48, unit: 'pcs', unitCost: 5.75, total: 276, category: 'Hardware', supplier: 'Hardware Pro', visible: true, editable: true },
      { id: 'm11', name: 'Drawer Slides', description: 'Full-extension soft-close slides', quantity: 18, unit: 'pairs', unitCost: 24, total: 432, category: 'Hardware', supplier: 'Hardware Pro', visible: true, editable: true },
      { id: 'm12', name: 'Cabinet Pulls 5"', description: 'Brushed nickel bar pulls', quantity: 22, unit: 'pcs', unitCost: 9.50, total: 209, category: 'Hardware', supplier: 'Hardware Pro', visible: true, editable: true },
      { id: 'm13', name: 'Cabinet Knobs', description: 'Brushed nickel knobs', quantity: 24, unit: 'pcs', unitCost: 6.25, total: 150, category: 'Hardware', supplier: 'Hardware Pro', visible: true, editable: true },
      
      // Countertops
      { id: 'm14', name: 'Granite Countertops', description: 'Kashmir White, 3cm thick', quantity: 48, unit: 'sq ft', unitCost: 82, total: 3936, category: 'Countertops', supplier: 'Stone Masters', visible: true, editable: true },
      { id: 'm15', name: 'Undermount Sink', description: 'Stainless steel double bowl', quantity: 1, unit: 'unit', unitCost: 385, total: 385, category: 'Fixtures', supplier: 'Plumbing Supply Co', visible: true, editable: true },
      { id: 'm16', name: 'Kitchen Faucet', description: 'Pull-down spray faucet', quantity: 1, unit: 'unit', unitCost: 295, total: 295, category: 'Fixtures', supplier: 'Plumbing Supply Co', visible: true, editable: true },
      
      // Appliances
      { id: 'm17', name: 'Refrigerator', description: 'French door stainless', quantity: 1, unit: 'unit', unitCost: 2100, total: 2100, category: 'Appliances', supplier: 'Appliance Depot', visible: true, editable: true },
      { id: 'm18', name: 'Range/Oven', description: 'Gas range with convection', quantity: 1, unit: 'unit', unitCost: 1850, total: 1850, category: 'Appliances', supplier: 'Appliance Depot', visible: true, editable: true },
      { id: 'm19', name: 'Dishwasher', description: 'Built-in dishwasher', quantity: 1, unit: 'unit', unitCost: 750, total: 750, category: 'Appliances', supplier: 'Appliance Depot', visible: true, editable: true },
      { id: 'm20', name: 'Microwave', description: 'Over-range microwave', quantity: 1, unit: 'unit', unitCost: 425, total: 425, category: 'Appliances', supplier: 'Appliance Depot', visible: true, editable: true },
      
      // Electrical
      { id: 'm21', name: 'LED Under-Cabinet Lights', description: 'Dimmable LED light strips', quantity: 18, unit: 'ft', unitCost: 22, total: 396, category: 'Lighting', supplier: 'Electrical Supply', visible: true, editable: true },
      { id: 'm22', name: 'Pendant Lights', description: 'Modern pendant fixtures', quantity: 3, unit: 'units', unitCost: 185, total: 555, category: 'Lighting', supplier: 'Lighting Gallery', visible: true, editable: true },
      { id: 'm23', name: 'Recessed Lighting', description: 'LED recessed can lights', quantity: 6, unit: 'units', unitCost: 45, total: 270, category: 'Lighting', supplier: 'Electrical Supply', visible: true, editable: true },
      { id: 'm24', name: 'GFCI Outlets', description: 'Tamper-resistant GFCI', quantity: 4, unit: 'units', unitCost: 28, total: 112, category: 'Electrical', supplier: 'Electrical Supply', visible: true, editable: true },
      { id: 'm25', name: 'Electrical Wire 12/2', description: 'Romex wire for circuits', quantity: 250, unit: 'ft', unitCost: 0.85, total: 212.50, category: 'Electrical', supplier: 'Electrical Supply', visible: true, editable: true },
      
      // Plumbing
      { id: 'm26', name: 'PEX Water Lines', description: '1/2" PEX tubing', quantity: 50, unit: 'ft', unitCost: 1.25, total: 62.50, category: 'Plumbing', supplier: 'Plumbing Supply Co', visible: true, editable: true },
      { id: 'm27', name: 'Garbage Disposal', description: '3/4 HP garbage disposal', quantity: 1, unit: 'unit', unitCost: 195, total: 195, category: 'Plumbing', supplier: 'Plumbing Supply Co', visible: true, editable: true },
      { id: 'm28', name: 'PVC Drain Pipe', description: '2" PVC pipe and fittings', quantity: 20, unit: 'ft', unitCost: 3.50, total: 70, category: 'Plumbing', supplier: 'Plumbing Supply Co', visible: true, editable: true },
      
      // Backsplash
      { id: 'm29', name: 'Subway Tile', description: '3x6 white subway tile', quantity: 65, unit: 'sq ft', unitCost: 12, total: 780, category: 'Tile', supplier: 'Tile Warehouse', visible: true, editable: true },
      { id: 'm30', name: 'Tile Adhesive', description: 'Thinset mortar', quantity: 4, unit: 'bags', unitCost: 24, total: 96, category: 'Tile', supplier: 'Tile Warehouse', visible: true, editable: true },
      { id: 'm31', name: 'Tile Grout', description: 'Non-sanded grout', quantity: 3, unit: 'bags', unitCost: 18, total: 54, category: 'Tile', supplier: 'Tile Warehouse', visible: true, editable: true },
      
      // Paint & Finish
      { id: 'm32', name: 'Premium Paint', description: 'Interior paint & primer', quantity: 8, unit: 'gal', unitCost: 48, total: 384, category: 'Paint', supplier: 'Paint Supply', visible: true, editable: true },
      { id: 'm33', name: 'Trim Paint', description: 'Semi-gloss trim paint', quantity: 2, unit: 'gal', unitCost: 52, total: 104, category: 'Paint', supplier: 'Paint Supply', visible: true, editable: true },
      
      // Drywall & Patching
      { id: 'm34', name: 'Drywall Sheets', description: '1/2" drywall sheets', quantity: 8, unit: 'sheets', unitCost: 14, total: 112, category: 'Drywall', supplier: 'Lumber Yard', visible: true, editable: true },
      { id: 'm35', name: 'Joint Compound', description: 'All-purpose joint compound', quantity: 3, unit: 'buckets', unitCost: 22, total: 66, category: 'Drywall', supplier: 'Lumber Yard', visible: true, editable: true },
      { id: 'm36', name: 'Drywall Tape', description: 'Paper drywall tape', quantity: 4, unit: 'rolls', unitCost: 5, total: 20, category: 'Drywall', supplier: 'Lumber Yard', visible: true, editable: true },
      
      // Miscellaneous
      { id: 'm37', name: 'Construction Adhesive', description: 'Heavy-duty adhesive', quantity: 12, unit: 'tubes', unitCost: 8, total: 96, category: 'Adhesives', supplier: 'Hardware Pro', visible: true, editable: true },
      { id: 'm38', name: 'Caulk & Sealant', description: 'Silicone caulk', quantity: 18, unit: 'tubes', unitCost: 6, total: 108, category: 'Sealants', supplier: 'Hardware Pro', visible: true, editable: true },
      { id: 'm39', name: 'Sandpaper Assortment', description: 'Various grits', quantity: 2, unit: 'packs', unitCost: 24, total: 48, category: 'Supplies', supplier: 'Hardware Pro', visible: true, editable: true },
      { id: 'm40', name: 'Drop Cloths', description: 'Canvas drop cloths', quantity: 6, unit: 'units', unitCost: 18, total: 108, category: 'Protection', supplier: 'Paint Supply', visible: true, editable: true },
      { id: 'm41', name: 'Plastic Sheeting', description: 'Protective plastic sheeting', quantity: 200, unit: 'sq ft', unitCost: 0.35, total: 70, category: 'Protection', supplier: 'Hardware Pro', visible: true, editable: true },
      { id: 'm42', name: 'Masking Tape', description: 'Painter\'s tape', quantity: 12, unit: 'rolls', unitCost: 7, total: 84, category: 'Supplies', supplier: 'Paint Supply', visible: true, editable: true },
      { id: 'm43', name: 'Trash Bags', description: 'Heavy-duty contractor bags', quantity: 4, unit: 'boxes', unitCost: 22, total: 88, category: 'Cleanup', supplier: 'Hardware Pro', visible: true, editable: true },
      { id: 'm44', name: 'Dumpster Rental', description: '20-yard dumpster for 2 weeks', quantity: 1, unit: 'rental', unitCost: 485, total: 485, category: 'Waste', supplier: 'Waste Management', visible: true, editable: true },
    ]);
  };

  const toggleVisibility = (type: 'labor' | 'material', id: string) => {
    if (type === 'labor') {
      setLaborItems(items =>
        items.map(item =>
          item.id === id ? { ...item, visible: !item.visible } : item
        )
      );
    } else {
      setMaterialItems(items =>
        items.map(item =>
          item.id === id ? { ...item, visible: !item.visible } : item
        )
      );
    }
  };

  const updateLaborItem = (id: string, updates: Partial<LaborLineItem>) => {
    setLaborItems(items =>
      items.map(item =>
        item.id === id
          ? {
              ...item,
              ...updates,
              total: (updates.hours ?? item.hours) * (updates.hourlyRate ?? item.hourlyRate)
            }
          : item
      )
    );
  };

  const updateMaterialItem = (id: string, updates: Partial<MaterialLineItem>) => {
    setMaterialItems(items =>
      items.map(item =>
        item.id === id
          ? {
              ...item,
              ...updates,
              total: (updates.quantity ?? item.quantity) * (updates.unitCost ?? item.unitCost)
            }
          : item
      )
    );
  };

  const removeLaborItem = (id: string) => {
    setLaborItems(items => items.filter(item => item.id !== id));
    toast.success('Labor item removed');
  };

  const removeMaterialItem = (id: string) => {
    setMaterialItems(items => items.filter(item => item.id !== id));
    toast.success('Material item removed');
  };

  const addLaborItem = () => {
    const newItem: LaborLineItem = {
      id: `l-${Date.now()}`,
      role: 'New Labor Role',
      description: 'Enter description',
      hours: 0,
      hourlyRate: 0,
      total: 0,
      visible: true,
      editable: true
    };
    setLaborItems([...laborItems, newItem]);
    setEditingItem({ type: 'labor', id: newItem.id });
  };

  const addMaterialItem = () => {
    const newItem: MaterialLineItem = {
      id: `m-${Date.now()}`,
      name: 'New Material',
      description: 'Enter description',
      quantity: 0,
      unit: 'unit',
      unitCost: 0,
      total: 0,
      category: 'Materials',
      visible: true,
      editable: true
    };
    setMaterialItems([...materialItems, newItem]);
    setEditingItem({ type: 'material', id: newItem.id });
  };

  const generateFloorPlans = async () => {
    setIsGeneratingFloorPlans(true);
    toast.info('Generating floor plans, layouts, and renderings...', {
      description: 'This may take 30-60 seconds'
    });

    try {
      const response = await fetch(
        `${API_BASE}/floor-plans/auto-generate`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            workRequestId,
            quoteId: quoteMetadata.quoteNumber,
            workRequestData
          })
        }
      );

      if (!response.ok) {
        throw new Error('Failed to generate floor plans');
      }

      const data = await response.json();
      setFloorPlanAssets(data.assets);

      toast.success('Floor plans generated!', {
        description: `${data.assets.length} design assets created`
      });

    } catch (error) {
      console.error('Error generating floor plans:', error);
      toast.error('Floor plan generation failed - creating placeholders');
      
      // Create mock floor plan assets
      setFloorPlanAssets([
        { id: 'fp1', type: 'floorplan', name: 'Main Floor Plan', url: '/placeholder-floorplan.png', generatedAt: new Date().toISOString() },
        { id: 'fp2', type: 'layout', name: 'Kitchen Layout', url: '/placeholder-layout.png', generatedAt: new Date().toISOString() },
        { id: 'fp3', type: 'cabinet_layout', name: 'Cabinet Elevations', url: '/placeholder-cabinets.png', generatedAt: new Date().toISOString() },
        { id: 'fp4', type: 'schedule', name: 'Cabinet Schedule', url: '/placeholder-schedule.png', generatedAt: new Date().toISOString() },
        { id: 'fp5', type: 'rendering', name: '3D Rendering - View 1', url: '/placeholder-render1.png', generatedAt: new Date().toISOString() },
        { id: 'fp6', type: 'rendering', name: '3D Rendering - View 2', url: '/placeholder-render2.png', generatedAt: new Date().toISOString() },
      ]);
    } finally {
      setIsGeneratingFloorPlans(false);
    }
  };

  const saveQuote = async () => {
    toast.info('Saving quote...');
    
    try {
      const response = await fetch(
        `${API_BASE}/quotes/save`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            quoteMetadata,
            laborItems,
            materialItems,
            floorPlanAssets,
            workRequestId
          })
        }
      );

      if (response.ok) {
        toast.success('Quote saved successfully!');
        if (onQuoteGenerated) {
          onQuoteGenerated(quoteMetadata.quoteNumber);
        }
      }
    } catch (error) {
      console.error('Error saving quote:', error);
      toast.error('Failed to save quote');
    }
  };

  const calculateTotals = () => {
    const laborTotal = laborItems
      .filter(item => item.visible)
      .reduce((sum, item) => sum + item.total, 0);
    
    const materialsTotal = materialItems
      .filter(item => item.visible)
      .reduce((sum, item) => sum + item.total, 0);
    
    const subtotal = laborTotal + materialsTotal;
    const tax = subtotal * 0.0875; // 8.75% tax
    const total = subtotal + tax;

    return { laborTotal, materialsTotal, subtotal, tax, total };
  };

  const totals = calculateTotals();

  if (isGenerating) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="text-center">
          <Wand2 className="w-16 h-16 text-orange-400 animate-pulse mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Generating Quote...</h2>
          <p className="text-gray-400">Creating detailed labor and materials breakdown</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] p-6">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-6">
        <div className="bg-gradient-to-r from-[#1A1A1A] to-[#0F0F0F] border border-[#2A2A2A] rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <Sparkles className="w-8 h-8 text-orange-400" />
                <h1 className="text-3xl font-bold text-white">Auto-Generated Quote</h1>
              </div>
              <p className="text-gray-400">Quote #{quoteMetadata.quoteNumber} • Work Request #{workRequestId}</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={saveQuote}
                className="flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-semibold transition-all"
              >
                <Save className="w-5 h-5" />
                Save Quote
              </button>
              <button
                onClick={generateFloorPlans}
                disabled={isGeneratingFloorPlans}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white rounded-xl font-semibold transition-all disabled:opacity-50"
              >
                {isGeneratingFloorPlans ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Brain className="w-5 h-5" />
                    Generate Floor Plans
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-[#0A0A0A] border border-orange-500/30 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-5 h-5 text-orange-400" />
                <span className="text-sm text-gray-400">Labor</span>
              </div>
              <p className="text-2xl font-bold text-white">${totals.laborTotal.toLocaleString()}</p>
            </div>
            <div className="bg-[#0A0A0A] border border-blue-500/30 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Package className="w-5 h-5 text-blue-400" />
                <span className="text-sm text-gray-400">Materials</span>
              </div>
              <p className="text-2xl font-bold text-white">${totals.materialsTotal.toLocaleString()}</p>
            </div>
            <div className="bg-[#0A0A0A] border border-green-500/30 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="w-5 h-5 text-green-400" />
                <span className="text-sm text-gray-400">Subtotal</span>
              </div>
              <p className="text-2xl font-bold text-white">${totals.subtotal.toLocaleString()}</p>
            </div>
            <div className="bg-[#0A0A0A] border border-purple-500/30 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="w-5 h-5 text-purple-400" />
                <span className="text-sm text-gray-400">Total</span>
              </div>
              <p className="text-2xl font-bold text-white">${totals.total.toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto space-y-6">
        {/* Labor Section */}
        <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl overflow-hidden">
          <div
            className="p-6 cursor-pointer hover:bg-[#1A1A1A]/80 transition"
            onClick={() => setExpandedSections({ ...expandedSections, labor: !expandedSections.labor })}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Wrench className="w-6 h-6 text-orange-400" />
                <div>
                  <h2 className="text-xl font-bold text-white">Labor Items</h2>
                  <p className="text-sm text-gray-400">{laborItems.length} items • ${totals.laborTotal.toLocaleString()}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    addLaborItem();
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-semibold transition"
                >
                  <Plus className="w-4 h-4" />
                  Add Labor
                </button>
                {expandedSections.labor ? (
                  <ChevronUp className="w-5 h-5 text-gray-400" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-400" />
                )}
              </div>
            </div>
          </div>

          {expandedSections.labor && (
            <div className="border-t border-[#2A2A2A]">
              <table className="w-full">
                <thead className="bg-[#0A0A0A]">
                  <tr className="text-left text-sm text-gray-400">
                    <th className="p-4">Visible</th>
                    <th className="p-4">Role</th>
                    <th className="p-4">Description</th>
                    <th className="p-4 text-right">Hours</th>
                    <th className="p-4 text-right">Rate/Hr</th>
                    <th className="p-4 text-right">Total</th>
                    <th className="p-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2A2A2A]">
                  {laborItems.map((item) => (
                    <tr key={item.id} className={`hover:bg-[#0A0A0A]/50 transition ${!item.visible ? 'opacity-50' : ''}`}>
                      <td className="p-4">
                        <button
                          onClick={() => toggleVisibility('labor', item.id)}
                          className="p-2 hover:bg-[#2A2A2A] rounded-lg transition"
                        >
                          {item.visible ? (
                            <Eye className="w-4 h-4 text-green-400" />
                          ) : (
                            <EyeOff className="w-4 h-4 text-gray-600" />
                          )}
                        </button>
                      </td>
                      <td className="p-4">
                        {editingItem?.type === 'labor' && editingItem?.id === item.id ? (
                          <input
                            type="text"
                            value={item.role}
                            onChange={(e) => updateLaborItem(item.id, { role: e.target.value })}
                            className="bg-[#0A0A0A] border border-orange-500/30 rounded-lg px-3 py-2 text-white w-full"
                          />
                        ) : (
                          <span className="text-white font-semibold">{item.role}</span>
                        )}
                      </td>
                      <td className="p-4">
                        {editingItem?.type === 'labor' && editingItem?.id === item.id ? (
                          <input
                            type="text"
                            value={item.description}
                            onChange={(e) => updateLaborItem(item.id, { description: e.target.value })}
                            className="bg-[#0A0A0A] border border-orange-500/30 rounded-lg px-3 py-2 text-gray-300 w-full"
                          />
                        ) : (
                          <span className="text-gray-300">{item.description}</span>
                        )}
                      </td>
                      <td className="p-4 text-right">
                        {editingItem?.type === 'labor' && editingItem?.id === item.id ? (
                          <input
                            type="number"
                            value={item.hours}
                            onChange={(e) => updateLaborItem(item.id, { hours: parseFloat(e.target.value) || 0 })}
                            className="bg-[#0A0A0A] border border-orange-500/30 rounded-lg px-3 py-2 text-white w-24 text-right"
                          />
                        ) : (
                          <span className="text-white">{item.hours}</span>
                        )}
                      </td>
                      <td className="p-4 text-right">
                        {editingItem?.type === 'labor' && editingItem?.id === item.id ? (
                          <input
                            type="number"
                            value={item.hourlyRate}
                            onChange={(e) => updateLaborItem(item.id, { hourlyRate: parseFloat(e.target.value) || 0 })}
                            className="bg-[#0A0A0A] border border-orange-500/30 rounded-lg px-3 py-2 text-white w-28 text-right"
                          />
                        ) : (
                          <span className="text-white">${item.hourlyRate}</span>
                        )}
                      </td>
                      <td className="p-4 text-right">
                        <span className="text-orange-400 font-bold">${item.total.toLocaleString()}</span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() =>
                              editingItem?.id === item.id
                                ? setEditingItem(null)
                                : setEditingItem({ type: 'labor', id: item.id })
                            }
                            className="p-2 hover:bg-[#2A2A2A] rounded-lg transition"
                          >
                            {editingItem?.id === item.id ? (
                              <Save className="w-4 h-4 text-green-400" />
                            ) : (
                              <Edit3 className="w-4 h-4 text-blue-400" />
                            )}
                          </button>
                          <button
                            onClick={() => removeLaborItem(item.id)}
                            className="p-2 hover:bg-red-600/10 rounded-lg transition"
                          >
                            <Trash2 className="w-4 h-4 text-red-400" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Materials Section */}
        <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl overflow-hidden">
          <div
            className="p-6 cursor-pointer hover:bg-[#1A1A1A]/80 transition"
            onClick={() => setExpandedSections({ ...expandedSections, materials: !expandedSections.materials })}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Package className="w-6 h-6 text-blue-400" />
                <div>
                  <h2 className="text-xl font-bold text-white">Material Items</h2>
                  <p className="text-sm text-gray-400">{materialItems.length} items • ${totals.materialsTotal.toLocaleString()}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    addMaterialItem();
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition"
                >
                  <Plus className="w-4 h-4" />
                  Add Material
                </button>
                {expandedSections.materials ? (
                  <ChevronUp className="w-5 h-5 text-gray-400" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-400" />
                )}
              </div>
            </div>
          </div>

          {expandedSections.materials && (
            <div className="border-t border-[#2A2A2A]">
              <table className="w-full">
                <thead className="bg-[#0A0A0A]">
                  <tr className="text-left text-sm text-gray-400">
                    <th className="p-4">Visible</th>
                    <th className="p-4">Material</th>
                    <th className="p-4">Category</th>
                    <th className="p-4">Description</th>
                    <th className="p-4 text-right">Qty</th>
                    <th className="p-4">Unit</th>
                    <th className="p-4 text-right">Unit Cost</th>
                    <th className="p-4 text-right">Total</th>
                    <th className="p-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2A2A2A]">
                  {materialItems.map((item) => (
                    <tr key={item.id} className={`hover:bg-[#0A0A0A]/50 transition ${!item.visible ? 'opacity-50' : ''}`}>
                      <td className="p-4">
                        <button
                          onClick={() => toggleVisibility('material', item.id)}
                          className="p-2 hover:bg-[#2A2A2A] rounded-lg transition"
                        >
                          {item.visible ? (
                            <Eye className="w-4 h-4 text-green-400" />
                          ) : (
                            <EyeOff className="w-4 h-4 text-gray-600" />
                          )}
                        </button>
                      </td>
                      <td className="p-4">
                        {editingItem?.type === 'material' && editingItem?.id === item.id ? (
                          <input
                            type="text"
                            value={item.name}
                            onChange={(e) => updateMaterialItem(item.id, { name: e.target.value })}
                            className="bg-[#0A0A0A] border border-blue-500/30 rounded-lg px-3 py-2 text-white w-full"
                          />
                        ) : (
                          <span className="text-white font-semibold">{item.name}</span>
                        )}
                      </td>
                      <td className="p-4">
                        <span className="px-2 py-1 bg-blue-600/20 border border-blue-500/30 rounded-lg text-xs text-blue-300">
                          {item.category}
                        </span>
                      </td>
                      <td className="p-4">
                        {editingItem?.type === 'material' && editingItem?.id === item.id ? (
                          <input
                            type="text"
                            value={item.description}
                            onChange={(e) => updateMaterialItem(item.id, { description: e.target.value })}
                            className="bg-[#0A0A0A] border border-blue-500/30 rounded-lg px-3 py-2 text-gray-300 w-full"
                          />
                        ) : (
                          <span className="text-gray-300 text-sm">{item.description}</span>
                        )}
                      </td>
                      <td className="p-4 text-right">
                        {editingItem?.type === 'material' && editingItem?.id === item.id ? (
                          <input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => updateMaterialItem(item.id, { quantity: parseFloat(e.target.value) || 0 })}
                            className="bg-[#0A0A0A] border border-blue-500/30 rounded-lg px-3 py-2 text-white w-20 text-right"
                          />
                        ) : (
                          <span className="text-white">{item.quantity}</span>
                        )}
                      </td>
                      <td className="p-4">
                        {editingItem?.type === 'material' && editingItem?.id === item.id ? (
                          <input
                            type="text"
                            value={item.unit}
                            onChange={(e) => updateMaterialItem(item.id, { unit: e.target.value })}
                            className="bg-[#0A0A0A] border border-blue-500/30 rounded-lg px-3 py-2 text-white w-20"
                          />
                        ) : (
                          <span className="text-gray-400 text-sm">{item.unit}</span>
                        )}
                      </td>
                      <td className="p-4 text-right">
                        {editingItem?.type === 'material' && editingItem?.id === item.id ? (
                          <input
                            type="number"
                            value={item.unitCost}
                            onChange={(e) => updateMaterialItem(item.id, { unitCost: parseFloat(e.target.value) || 0 })}
                            className="bg-[#0A0A0A] border border-blue-500/30 rounded-lg px-3 py-2 text-white w-24 text-right"
                          />
                        ) : (
                          <span className="text-white">${item.unitCost.toLocaleString()}</span>
                        )}
                      </td>
                      <td className="p-4 text-right">
                        <span className="text-blue-400 font-bold">${item.total.toLocaleString()}</span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() =>
                              editingItem?.id === item.id
                                ? setEditingItem(null)
                                : setEditingItem({ type: 'material', id: item.id })
                            }
                            className="p-2 hover:bg-[#2A2A2A] rounded-lg transition"
                          >
                            {editingItem?.id === item.id ? (
                              <Save className="w-4 h-4 text-green-400" />
                            ) : (
                              <Edit3 className="w-4 h-4 text-blue-400" />
                            )}
                          </button>
                          <button
                            onClick={() => removeMaterialItem(item.id)}
                            className="p-2 hover:bg-red-600/10 rounded-lg transition"
                          >
                            <Trash2 className="w-4 h-4 text-red-400" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Floor Plans & Renderings Section */}
        {floorPlanAssets.length > 0 && (
          <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl overflow-hidden">
            <div
              className="p-6 cursor-pointer hover:bg-[#1A1A1A]/80 transition"
              onClick={() => setExpandedSections({ ...expandedSections, floorPlans: !expandedSections.floorPlans })}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Layout className="w-6 h-6 text-purple-400" />
                  <div>
                    <h2 className="text-xl font-bold text-white">Floor Plans & Renderings</h2>
                    <p className="text-sm text-gray-400">{floorPlanAssets.length} design assets generated</p>
                  </div>
                </div>
                {expandedSections.floorPlans ? (
                  <ChevronUp className="w-5 h-5 text-gray-400" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-400" />
                )}
              </div>
            </div>

            {expandedSections.floorPlans && (
              <div className="border-t border-[#2A2A2A] p-6">
                <div className="grid grid-cols-3 gap-4">
                  {floorPlanAssets.map((asset) => (
                    <div key={asset.id} className="bg-[#0A0A0A] border border-purple-500/30 rounded-xl p-4 hover:border-purple-500/50 transition">
                      <div className="flex items-center gap-3 mb-3">
                        {asset.type === 'rendering' ? (
                          <ImageIcon className="w-5 h-5 text-purple-400" />
                        ) : (
                          <FileText className="w-5 h-5 text-purple-400" />
                        )}
                        <span className="text-white font-semibold text-sm">{asset.name}</span>
                      </div>
                      <div className="aspect-video bg-[#2A2A2A] rounded-lg mb-2 flex items-center justify-center">
                        <Layout className="w-12 h-12 text-gray-600" />
                      </div>
                      <button className="w-full py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-semibold transition">
                        View Asset
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Quote Totals */}
        <div className="bg-gradient-to-r from-[#1A1A1A] to-[#0F0F0F] border border-[#2A2A2A] rounded-2xl p-6">
          <div className="max-w-md ml-auto space-y-3">
            <div className="flex items-center justify-between text-gray-300">
              <span>Labor Subtotal:</span>
              <span className="font-semibold">${totals.laborTotal.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between text-gray-300">
              <span>Materials Subtotal:</span>
              <span className="font-semibold">${totals.materialsTotal.toLocaleString()}</span>
            </div>
            <div className="border-t border-[#2A2A2A] pt-3 flex items-center justify-between text-gray-300">
              <span>Subtotal:</span>
              <span className="font-semibold">${totals.subtotal.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between text-gray-300">
              <span>Tax (8.75%):</span>
              <span className="font-semibold">${totals.tax.toLocaleString()}</span>
            </div>
            <div className="border-t-2 border-orange-500 pt-3 flex items-center justify-between">
              <span className="text-xl font-bold text-white">Total:</span>
              <span className="text-2xl font-bold text-orange-400">${totals.total.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}