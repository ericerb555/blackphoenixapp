// Comprehensive Quote Generation Utility
// Generates ultra-detailed quotes with ALL materials from permits to trash bags
import { generateAIProjectSchedule } from './aiScheduleGeneration';

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
}

interface WorkRequest {
  id: string;
  requestNumber: string;
  serviceType: string;
  title: string;
  description: string;
  customerName: string;
  customerEmail: string;
}

export function generateComprehensiveQuote(workRequest: WorkRequest): Quote {
  const quoteId = `Q-${Date.now()}`;
  const quoteNumber = `QT-${workRequest.requestNumber.split('-')[1]}-${Math.floor(Math.random() * 1000)}`;
  
  let materials: MaterialItem[] = [];
  let labor: LaborItem[] = [];
  let processSteps: ProcessStep[] = [];

  // Generate ultra-detailed quote based on service type
  if (workRequest.serviceType === 'Renovation' && workRequest.title.toLowerCase().includes('kitchen')) {
    // COMPREHENSIVE KITCHEN RENOVATION QUOTE - EVERY SINGLE ITEM
    materials = [
      // === PERMITS & FEES ===
      { id: 'm1', name: 'Building Permit - Kitchen Renovation', description: 'Comprehensive building permit for structural and cosmetic changes', quantity: 1, unit: 'permit', unitCost: 425, totalCost: 425, supplier: 'City Building Department', category: 'Permits & Fees', visible: true },
      { id: 'm2', name: 'Electrical Permit', description: 'Permit for electrical upgrades and new circuits', quantity: 1, unit: 'permit', unitCost: 150, totalCost: 150, supplier: 'City Building Department', category: 'Permits & Fees', visible: true },
      { id: 'm3', name: 'Plumbing Permit', description: 'Permit for plumbing modifications', quantity: 1, unit: 'permit', unitCost: 125, totalCost: 125, supplier: 'City Building Department', category: 'Permits & Fees', visible: true },
      { id: 'm4', name: 'Plan Review Fees', description: 'Professional plan review and stamping', quantity: 1, unit: 'fee', unitCost: 200, totalCost: 200, supplier: 'Architectural Services', category: 'Permits & Fees', visible: true },
      
      // === CABINETS & CABINETRY HARDWARE ===
      { id: 'm5', name: 'Wall Cabinets - White Shaker 36"', description: '36"W x 30"H x 12"D wall cabinets', quantity: 4, unit: 'units', unitCost: 425, totalCost: 1700, supplier: 'Premier Cabinet Co', category: 'Cabinetry', visible: true },
      { id: 'm6', name: 'Wall Cabinets - White Shaker 30"', description: '30"W x 30"H x 12"D wall cabinets', quantity: 3, unit: 'units', unitCost: 375, totalCost: 1125, supplier: 'Premier Cabinet Co', category: 'Cabinetry', visible: true },
      { id: 'm7', name: 'Base Cabinets - White Shaker 36"', description: '36"W x 34.5"H x 24"D base cabinets', quantity: 3, unit: 'units', unitCost: 495, totalCost: 1485, supplier: 'Premier Cabinet Co', category: 'Cabinetry', visible: true },
      { id: 'm8', name: 'Base Cabinets - White Shaker 24"', description: '24"W x 34.5"H x 24"D base cabinets', quantity: 2, unit: 'units', unitCost: 385, totalCost: 770, supplier: 'Premier Cabinet Co', category: 'Cabinetry', visible: true },
      { id: 'm9', name: 'Sink Base Cabinet - 36"', description: '36" sink base with false drawer front', quantity: 1, unit: 'unit', unitCost: 525, totalCost: 525, supplier: 'Premier Cabinet Co', category: 'Cabinetry', visible: true },
      { id: 'm10', name: 'Lazy Susan Corner Cabinet', description: '36" corner base with lazy susan hardware', quantity: 1, unit: 'unit', unitCost: 675, totalCost: 675, supplier: 'Premier Cabinet Co', category: 'Cabinetry', visible: true },
      { id: 'm11', name: 'Drawer Base Cabinet - 24"', description: '24" drawer base with 3 drawers', quantity: 1, unit: 'unit', unitCost: 595, totalCost: 595, supplier: 'Premier Cabinet Co', category: 'Cabinetry', visible: true },
      { id: 'm12', name: 'Soft-Close Cabinet Hinges - European', description: '110° overlay soft-close hinges', quantity: 48, unit: 'pcs', unitCost: 5.75, totalCost: 276, supplier: 'Hardware Pro', category: 'Hardware', visible: true },
      { id: 'm13', name: 'Soft-Close Drawer Slides - Full Extension', description: '22" undermount soft-close drawer slides', quantity: 18, unit: 'pairs', unitCost: 24, totalCost: 432, supplier: 'Hardware Pro', category: 'Hardware', visible: true },
      { id: 'm14', name: 'Cabinet Pulls - Brushed Nickel 5"', description: 'Modern bar pulls with brushed nickel finish', quantity: 22, unit: 'pcs', unitCost: 9.50, totalCost: 209, supplier: 'Hardware Pro', category: 'Hardware', visible: true },
      { id: 'm15', name: 'Cabinet Knobs - Brushed Nickel', description: '1.25" diameter round knobs', quantity: 24, unit: 'pcs', unitCost: 6.25, totalCost: 150, supplier: 'Hardware Pro', category: 'Hardware', visible: true },
      { id: 'm16', name: 'Cabinet Mounting Screws', description: '#10 x 2.5" cabinet mounting screws', quantity: 100, unit: 'pcs', unitCost: 0.25, totalCost: 25, supplier: 'Hardware Pro', category: 'Hardware', visible: true },
      { id: 'm17', name: 'Cabinet Shims - Composite', description: 'Composite shims for leveling cabinets', quantity: 24, unit: 'pcs', unitCost: 0.75, totalCost: 18, supplier: 'Lumber Yard', category: 'Installation Materials', visible: true },
      
      // === COUNTERTOPS ===
      { id: 'm18', name: 'Granite Countertops - Kashmir White', description: '3cm thick granite slabs with polished eased edge', quantity: 48, unit: 'sq ft', unitCost: 82, totalCost: 3936, supplier: 'Stone Masters LLC', category: 'Countertops', visible: true },
      { id: 'm19', name: 'Granite Fabrication Fee', description: 'Custom fabrication, edging, and cutouts', quantity: 1, unit: 'job', unitCost: 850, totalCost: 850, supplier: 'Stone Masters LLC', category: 'Countertops', visible: true },
      { id: 'm20', name: 'Granite Sealer - Penetrating', description: 'Professional-grade impregnating sealer', quantity: 2, unit: 'quarts', unitCost: 32, totalCost: 64, supplier: 'Stone Masters LLC', category: 'Countertops', visible: true },
      { id: 'm21', name: 'Undermount Sink Clips', description: 'Stainless steel undermount sink clips', quantity: 8, unit: 'pcs', unitCost: 3.50, totalCost: 28, supplier: 'Plumb Pro Supply', category: 'Hardware', visible: true },
      
      // === BACKSPLASH TILE ===
      { id: 'm22', name: 'Subway Tile - White 3x6 Ceramic', description: 'Bright white glossy ceramic subway tiles', quantity: 40, unit: 'sq ft', unitCost: 13.50, totalCost: 540, supplier: 'Tile Emporium', category: 'Tile', visible: true },
      { id: 'm23', name: 'Tile Mortar - Modified Thinset', description: 'Polymer-modified white thinset mortar', quantity: 2, unit: '50lb bags', unitCost: 35, totalCost: 70, supplier: 'Home Depot', category: 'Tile Materials', visible: true },
      { id: 'm24', name: 'Tile Grout - Bright White Unsanded', description: 'Premium unsanded grout for narrow joints', quantity: 3, unit: '10lb bags', unitCost: 22, totalCost: 66, supplier: 'Home Depot', category: 'Tile Materials', visible: true },
      { id: 'm25', name: 'Grout Sealer - Penetrating', description: 'Penetrating grout and tile sealer', quantity: 1, unit: 'quart', unitCost: 26, totalCost: 26, supplier: 'Home Depot', category: 'Tile Materials', visible: true },
      { id: 'm26', name: 'Tile Spacers - 1/16"', description: 'Precision tile spacers for uniform grout lines', quantity: 500, unit: 'pcs', unitCost: 0.04, totalCost: 20, supplier: 'Home Depot', category: 'Tile Materials', visible: true },
      { id: 'm27', name: 'Tile Edge Trim - Bullnose', description: 'Bullnose trim pieces for exposed edges', quantity: 12, unit: 'pcs', unitCost: 4.25, totalCost: 51, supplier: 'Tile Emporium', category: 'Tile', visible: true },
      
      // === APPLIANCES ===
      { id: 'm28', name: 'Refrigerator - 36" French Door Stainless', description: '25 cu ft French door refrigerator with ice/water', quantity: 1, unit: 'unit', unitCost: 2450, totalCost: 2450, supplier: 'Appliance Depot', category: 'Appliances', visible: true },
      { id: 'm29', name: 'Gas Range - 30" Stainless Steel', description: '5-burner gas range with convection oven', quantity: 1, unit: 'unit', unitCost: 1600, totalCost: 1600, supplier: 'Appliance Depot', category: 'Appliances', visible: true },
      { id: 'm30', name: 'Dishwasher - Built-In Stainless Steel', description: 'Third rack dishwasher with stainless tub', quantity: 1, unit: 'unit', unitCost: 725, totalCost: 725, supplier: 'Appliance Depot', category: 'Appliances', visible: true },
      { id: 'm31', name: 'Over-Range Microwave - 30" Stainless', description: 'OTR microwave with 400 CFM exhaust', quantity: 1, unit: 'unit', unitCost: 425, totalCost: 425, supplier: 'Appliance Depot', category: 'Appliances', visible: true },
      { id: 'm32', name: 'Appliance Delivery & Installation', description: 'Professional delivery and basic installation', quantity: 1, unit: 'service', unitCost: 275, totalCost: 275, supplier: 'Appliance Depot', category: 'Services', visible: true },
      
      // === PLUMBING FIXTURES & SUPPLIES ===
      { id: 'm33', name: 'Kitchen Faucet - Brushed Nickel Pull-Down', description: 'Single-handle pull-down spray faucet', quantity: 1, unit: 'unit', unitCost: 365, totalCost: 365, supplier: 'Plumb Pro Supply', category: 'Plumbing Fixtures', visible: true },
      { id: 'm34', name: 'Undermount Sink - 32" Double Bowl Stainless', description: '16-gauge stainless steel with sound dampening', quantity: 1, unit: 'unit', unitCost: 325, totalCost: 325, supplier: 'Plumb Pro Supply', category: 'Plumbing Fixtures', visible: true },
      { id: 'm35', name: 'Garbage Disposal - 3/4 HP', description: 'Continuous feed disposal with sound insulation', quantity: 1, unit: 'unit', unitCost: 175, totalCost: 175, supplier: 'Plumb Pro Supply', category: 'Plumbing Fixtures', visible: true },
      { id: 'm36', name: 'Disposal Power Cord', description: 'Dishwasher power cord kit', quantity: 1, unit: 'unit', unitCost: 18, totalCost: 18, supplier: 'Plumb Pro Supply', category: 'Plumbing Parts', visible: true },
      { id: 'm37', name: 'Sink Drain Assembly - Chrome', description: 'Basket strainer drain assemblies', quantity: 2, unit: 'units', unitCost: 24, totalCost: 48, supplier: 'Plumb Pro Supply', category: 'Plumbing Parts', visible: true },
      { id: 'm38', name: 'Dishwasher Connector Kit', description: 'Braided supply line and drain connector', quantity: 1, unit: 'kit', unitCost: 32, totalCost: 32, supplier: 'Plumb Pro Supply', category: 'Plumbing Parts', visible: true },
      { id: 'm39', name: 'Faucet Supply Lines - Braided Stainless 20"', description: '3/8" compression braided supply lines', quantity: 2, unit: 'pcs', unitCost: 14, totalCost: 28, supplier: 'Plumb Pro Supply', category: 'Plumbing Parts', visible: true },
      { id: 'm40', name: 'Shut-Off Valves - 1/2" Compression', description: 'Quarter-turn angle stop valves', quantity: 2, unit: 'units', unitCost: 16, totalCost: 32, supplier: 'Plumb Pro Supply', category: 'Plumbing Parts', visible: true },
      { id: 'm41', name: 'PEX Tubing - 1/2" x 100ft', description: 'Red and blue PEX tubing for hot/cold', quantity: 2, unit: 'rolls', unitCost: 48, totalCost: 96, supplier: 'Plumb Pro Supply', category: 'Plumbing Parts', visible: true },
      { id: 'm42', name: 'PEX Fittings Assortment', description: 'Elbows, tees, and couplings for PEX', quantity: 1, unit: 'kit', unitCost: 65, totalCost: 65, supplier: 'Plumb Pro Supply', category: 'Plumbing Parts', visible: true },
      { id: 'm43', name: 'PEX Crimp Rings', description: 'Copper crimp rings for PEX connections', quantity: 50, unit: 'pcs', unitCost: 0.35, totalCost: 17.50, supplier: 'Plumb Pro Supply', category: 'Plumbing Parts', visible: true },
      { id: 'm44', name: 'Plumber\'s Putty - Non-Staining', description: 'Professional plumber\'s putty', quantity: 2, unit: 'tubs', unitCost: 9, totalCost: 18, supplier: 'Home Depot', category: 'Plumbing Materials', visible: true },
      { id: 'm45', name: 'Teflon Tape - Thread Seal', description: 'PTFE thread seal tape', quantity: 4, unit: 'rolls', unitCost: 2.75, totalCost: 11, supplier: 'Home Depot', category: 'Plumbing Materials', visible: true },
      { id: 'm46', name: 'Pipe Dope - Thread Sealant', description: 'Pipe joint compound for threaded connections', quantity: 1, unit: 'tube', unitCost: 7, totalCost: 7, supplier: 'Plumb Pro Supply', category: 'Plumbing Materials', visible: true },
      { id: 'm47', name: 'P-Trap Assemblies - Plastic', description: '1.5" PVC P-trap for sink drains', quantity: 2, unit: 'units', unitCost: 8, totalCost: 16, supplier: 'Home Depot', category: 'Plumbing Parts', visible: true },
      
      // === ELECTRICAL COMPONENTS ===
      { id: 'm48', name: 'Under-Cabinet LED Light Strips - 16ft Total', description: 'Dimmable LED strip lighting with power supply', quantity: 2, unit: '8ft strips', unitCost: 210, totalCost: 420, supplier: 'Lighting World', category: 'Lighting', visible: true },
      { id: 'm49', name: 'LED Power Supply - 60W', description: 'Dimmable LED driver for under-cabinet lights', quantity: 2, unit: 'units', unitCost: 42, totalCost: 84, supplier: 'Lighting World', category: 'Lighting', visible: true },
      { id: 'm50', name: 'Pendant Light Fixtures - Glass Globe', description: 'Modern brushed nickel pendant lights', quantity: 3, unit: 'fixtures', unitCost: 135, totalCost: 405, supplier: 'Lighting World', category: 'Lighting', visible: true },
      { id: 'm51', name: 'Recessed LED Lights - 6" Dimmable', description: '12W dimmable LED recessed lights', quantity: 8, unit: 'fixtures', unitCost: 52, totalCost: 416, supplier: 'Lighting World', category: 'Lighting', visible: true },
      { id: 'm52', name: 'Recessed Can Housings - IC Rated', description: 'Insulation contact rated housings', quantity: 8, unit: 'housings', unitCost: 18, totalCost: 144, supplier: 'Electrical Supply Co', category: 'Electrical', visible: true },
      { id: 'm53', name: 'GFCI Outlets - 20A Tamper Resistant', description: 'Ground fault circuit interrupter outlets', quantity: 4, unit: 'outlets', unitCost: 22, totalCost: 88, supplier: 'Electrical Supply Co', category: 'Electrical', visible: true },
      { id: 'm54', name: 'Standard Duplex Outlets - 20A Tamper Resistant', description: 'Commercial-grade tamper resistant outlets', quantity: 8, unit: 'outlets', unitCost: 5.50, totalCost: 44, supplier: 'Electrical Supply Co', category: 'Electrical', visible: true },
      { id: 'm55', name: 'Dimmer Switches - LED Compatible', description: 'Slide dimmer switches for LED loads', quantity: 4, unit: 'switches', unitCost: 32, totalCost: 128, supplier: 'Electrical Supply Co', category: 'Electrical', visible: true },
      { id: 'm56', name: 'Standard Light Switches', description: 'Decorator-style rocker switches', quantity: 3, unit: 'switches', unitCost: 4, totalCost: 12, supplier: 'Electrical Supply Co', category: 'Electrical', visible: true },
      { id: 'm57', name: 'Outlet & Switch Covers - Decorator White', description: 'Screwless decorator wall plates', quantity: 15, unit: 'pcs', unitCost: 2.50, totalCost: 37.50, supplier: 'Electrical Supply Co', category: 'Electrical', visible: true },
      { id: 'm58', name: 'Romex Wire - 12/2 with Ground', description: '12-gauge electrical wire for 20A circuits', quantity: 200, unit: 'feet', unitCost: 0.95, totalCost: 190, supplier: 'Electrical Supply Co', category: 'Electrical', visible: true },
      { id: 'm59', name: 'Romex Wire - 14/2 with Ground', description: '14-gauge electrical wire for 15A circuits', quantity: 100, unit: 'feet', unitCost: 0.68, totalCost: 68, supplier: 'Electrical Supply Co', category: 'Electrical', visible: true },
      { id: 'm60', name: 'Circuit Breakers - 20A Single Pole', description: 'Circuit breakers for new kitchen circuits', quantity: 4, unit: 'breakers', unitCost: 12, totalCost: 48, supplier: 'Electrical Supply Co', category: 'Electrical', visible: true },
      { id: 'm61', name: 'Wire Nuts & Connectors Assortment', description: 'Twist-on wire connectors in various sizes', quantity: 1, unit: 'box', unitCost: 18, totalCost: 18, supplier: 'Electrical Supply Co', category: 'Electrical', visible: true },
      { id: 'm62', name: 'Electrical Tape - Premium Vinyl', description: 'Black electrical tape 3/4" x 60ft', quantity: 4, unit: 'rolls', unitCost: 4.50, totalCost: 18, supplier: 'Electrical Supply Co', category: 'Electrical', visible: true },
      { id: 'm63', name: 'Electrical Boxes - New Work', description: 'Single gang new work electrical boxes', quantity: 15, unit: 'boxes', unitCost: 1.85, totalCost: 27.75, supplier: 'Electrical Supply Co', category: 'Electrical', visible: true },
      { id: 'm64', name: 'Electrical Box Extenders', description: 'Box extenders for proper depth', quantity: 6, unit: 'pcs', unitCost: 3, totalCost: 18, supplier: 'Electrical Supply Co', category: 'Electrical', visible: true },
      { id: 'm65', name: 'Wire Staples - Cable Staples', description: 'Insulated cable staples for Romex', quantity: 100, unit: 'pcs', unitCost: 0.12, totalCost: 12, supplier: 'Electrical Supply Co', category: 'Electrical', visible: true },
      { id: 'm66', name: 'Wire Strippers & Tools', description: 'Professional wire stripping and cutting tools', quantity: 1, unit: 'set', unitCost: 45, totalCost: 45, supplier: 'Electrical Supply Co', category: 'Tools', visible: true },
      
      // === FLOORING ===
      { id: 'm67', name: 'Luxury Vinyl Plank Flooring - Wood-Look', description: 'Waterproof LVP with attached underlayment', quantity: 280, unit: 'sq ft', unitCost: 5.25, totalCost: 1470, supplier: 'Flooring Unlimited', category: 'Flooring', visible: true },
      { id: 'm68', name: 'Flooring Underlayment - Foam with Moisture Barrier', description: 'Premium 2mm foam underlayment', quantity: 300, unit: 'sq ft', unitCost: 0.52, totalCost: 156, supplier: 'Flooring Unlimited', category: 'Flooring', visible: true },
      { id: 'm69', name: 'Transition Strips - T-Molding', description: 'Coordinating wood-look transition molding', quantity: 4, unit: 'pcs', unitCost: 28, totalCost: 112, supplier: 'Flooring Unlimited', category: 'Flooring', visible: true },
      { id: 'm70', name: 'Reducer Strips', description: 'Height transition reducer strips', quantity: 2, unit: 'pcs', unitCost: 25, totalCost: 50, supplier: 'Flooring Unlimited', category: 'Flooring', visible: true },
      { id: 'm71', name: 'Floor Adhesive - Premium', description: 'Pressure-sensitive flooring adhesive', quantity: 3, unit: 'gallons', unitCost: 42, totalCost: 126, supplier: 'Flooring Unlimited', category: 'Flooring Materials', visible: true },
      { id: 'm72', name: 'Tapping Block & Pull Bar', description: 'Installation tools for click-lock flooring', quantity: 1, unit: 'set', unitCost: 28, totalCost: 28, supplier: 'Flooring Unlimited', category: 'Tools', visible: true },
      
      // === PAINT & FINISHING MATERIALS ===
      { id: 'm73', name: 'Interior Wall Paint - Sherwin Williams Alabaster', description: 'Eggshell finish premium interior paint', quantity: 6, unit: 'gallons', unitCost: 72, totalCost: 432, supplier: 'Paint Pro Supply', category: 'Paint', visible: true },
      { id: 'm74', name: 'Trim Paint - SW Extra White Semi-Gloss', description: 'Semi-gloss enamel for trim and doors', quantity: 3, unit: 'gallons', unitCost: 75, totalCost: 225, supplier: 'Paint Pro Supply', category: 'Paint', visible: true },
      { id: 'm75', name: 'Ceiling Paint - Flat White', description: 'Premium flat ceiling paint', quantity: 2, unit: 'gallons', unitCost: 62, totalCost: 124, supplier: 'Paint Pro Supply', category: 'Paint', visible: true },
      { id: 'm76', name: 'Paint Primer - Bonding Primer', description: 'High-adhesion bonding primer', quantity: 4, unit: 'gallons', unitCost: 52, totalCost: 208, supplier: 'Paint Pro Supply', category: 'Paint', visible: true },
      { id: 'm77', name: 'Stain-Blocking Primer', description: 'Oil-based stain blocker for problem areas', quantity: 1, unit: 'quart', unitCost: 28, totalCost: 28, supplier: 'Paint Pro Supply', category: 'Paint', visible: true },
      { id: 'm78', name: 'Paint Roller Frames - 9"', description: 'Professional roller frames', quantity: 4, unit: 'frames', unitCost: 8, totalCost: 32, supplier: 'Paint Pro Supply', category: 'Paint Supplies', visible: true },
      { id: 'm79', name: 'Paint Roller Covers - 9" 3/8" Nap', description: 'High-quality microfiber roller covers', quantity: 24, unit: 'covers', unitCost: 3.50, totalCost: 84, supplier: 'Paint Pro Supply', category: 'Paint Supplies', visible: true },
      { id: 'm80', name: 'Paint Brushes - Angled Sash 2.5"', description: 'Professional angled trim brushes', quantity: 6, unit: 'brushes', unitCost: 12, totalCost: 72, supplier: 'Paint Pro Supply', category: 'Paint Supplies', visible: true },
      { id: 'm81', name: 'Paint Brushes - 3" Flat', description: 'Flat wall brushes for cutting in', quantity: 4, unit: 'brushes', unitCost: 9, totalCost: 36, supplier: 'Paint Pro Supply', category: 'Paint Supplies', visible: true },
      { id: 'm82', name: 'Painter\'s Tape - 2" Blue Tape', description: 'Premium multi-surface painter\'s tape', quantity: 8, unit: 'rolls', unitCost: 9, totalCost: 72, supplier: 'Paint Pro Supply', category: 'Paint Supplies', visible: true },
      { id: 'm83', name: 'Painter\'s Tape - 1.5"', description: 'Narrow tape for detail work', quantity: 4, unit: 'rolls', unitCost: 7, totalCost: 28, supplier: 'Paint Pro Supply', category: 'Paint Supplies', visible: true },
      { id: 'm84', name: 'Drop Cloths - 9x12 Canvas', description: 'Heavy-duty reusable canvas drop cloths', quantity: 4, unit: 'cloths', unitCost: 28, totalCost: 112, supplier: 'Paint Pro Supply', category: 'Paint Supplies', visible: true },
      { id: 'm85', name: 'Plastic Sheeting - 10ft x 100ft', description: '2 mil plastic sheeting for protection', quantity: 1, unit: 'roll', unitCost: 45, totalCost: 45, supplier: 'Home Depot', category: 'Protection Materials', visible: true },
      { id: 'm86', name: 'Paint Trays - Disposable Liners', description: 'Disposable paint tray liners', quantity: 24, unit: 'liners', unitCost: 1.25, totalCost: 30, supplier: 'Paint Pro Supply', category: 'Paint Supplies', visible: true },
      { id: 'm87', name: 'Sandpaper Assortment', description: '80, 120, 220 grit sandpaper sheets', quantity: 1, unit: 'pack', unitCost: 18, totalCost: 18, supplier: 'Home Depot', category: 'Paint Supplies', visible: true },
      { id: 'm88', name: 'Sanding Sponges - Fine/Medium', description: 'Dual-grit sanding sponges', quantity: 12, unit: 'sponges', unitCost: 2.50, totalCost: 30, supplier: 'Home Depot', category: 'Paint Supplies', visible: true },
      { id: 'm89', name: 'TSP Cleaner - Trisodium Phosphate', description: 'Heavy-duty wall cleaner and degreaser', quantity: 2, unit: 'boxes', unitCost: 12, totalCost: 24, supplier: 'Home Depot', category: 'Paint Supplies', visible: true },
      { id: 'm90', name: 'Paint Mixing Sticks', description: 'Wooden paint stirrers', quantity: 24, unit: 'sticks', unitCost: 0.15, totalCost: 3.60, supplier: 'Paint Pro Supply', category: 'Paint Supplies', visible: true },
      
      // === TRIM & MOLDING ===
      { id: 'm91', name: 'Crown Molding - 3.5" MDF', description: 'Primed MDF crown molding', quantity: 70, unit: 'feet', unitCost: 3.75, totalCost: 262.50, supplier: 'Lumber Yard', category: 'Trim & Molding', visible: true },
      { id: 'm92', name: 'Baseboard Molding - 5.25" MDF', description: 'Primed MDF baseboard', quantity: 90, unit: 'feet', unitCost: 2.85, totalCost: 256.50, supplier: 'Lumber Yard', category: 'Trim & Molding', visible: true },
      { id: 'm93', name: 'Quarter Round Molding - 3/4"', description: 'Primed quarter round for floor transitions', quantity: 80, unit: 'feet', unitCost: 1.25, totalCost: 100, supplier: 'Lumber Yard', category: 'Trim & Molding', visible: true },
      { id: 'm94', name: 'Door Casing - 2.25" Colonial', description: 'Primed colonial door casing', quantity: 60, unit: 'feet', unitCost: 2.40, totalCost: 144, supplier: 'Lumber Yard', category: 'Trim & Molding', visible: true },
      { id: 'm95', name: 'Window Casing - 2.25" Colonial', description: 'Primed colonial window casing', quantity: 40, unit: 'feet', unitCost: 2.40, totalCost: 96, supplier: 'Lumber Yard', category: 'Trim & Molding', visible: true },
      
      // === ADHESIVES, SEALANTS & FILLERS ===
      { id: 'm96', name: 'Caulk - Paintable White Latex', description: 'Acrylic latex caulk for trim and molding', quantity: 8, unit: 'tubes', unitCost: 5, totalCost: 40, supplier: 'Home Depot', category: 'Adhesives & Sealants', visible: true },
      { id: 'm97', name: '100% Silicone Caulk - Clear', description: 'Waterproof silicone for kitchen and bath', quantity: 6, unit: 'tubes', unitCost: 7.50, totalCost: 45, supplier: 'Home Depot', category: 'Adhesives & Sealants', visible: true },
      { id: 'm98', name: 'Construction Adhesive - Heavy Duty', description: 'Polyurethane construction adhesive', quantity: 8, unit: 'tubes', unitCost: 6, totalCost: 48, supplier: 'Home Depot', category: 'Adhesives & Sealants', visible: true },
      { id: 'm99', name: 'Wood Glue - Premium', description: 'Titebond III wood glue', quantity: 2, unit: 'quarts', unitCost: 14, totalCost: 28, supplier: 'Hardware Pro', category: 'Adhesives & Sealants', visible: true },
      { id: 'm100', name: 'Wood Filler - Sandable', description: 'Interior wood filler for nail holes', quantity: 3, unit: 'tubs', unitCost: 14, totalCost: 42, supplier: 'Home Depot', category: 'Fillers', visible: true },
      { id: 'm101', name: 'Spackle - Lightweight', description: 'Lightweight spackling compound', quantity: 2, unit: 'quarts', unitCost: 8, totalCost: 16, supplier: 'Home Depot', category: 'Fillers', visible: true },
      { id: 'm102', name: 'Drywall Joint Compound', description: 'All-purpose joint compound', quantity: 2, unit: '1gal buckets', unitCost: 16, totalCost: 32, supplier: 'Home Depot', category: 'Fillers', visible: true },
      { id: 'm103', name: 'Caulking Gun - Professional', description: 'Smooth-rod caulking gun', quantity: 3, unit: 'guns', unitCost: 12, totalCost: 36, supplier: 'Home Depot', category: 'Tools', visible: true },
      
      // === FASTENERS & HARDWARE ===
      { id: 'm104', name: 'Finish Nails - 16ga x 2"', description: 'Galvanized finish nails for trim', quantity: 5, unit: 'lbs', unitCost: 9, totalCost: 45, supplier: 'Hardware Pro', category: 'Fasteners', visible: true },
      { id: 'm105', name: 'Brad Nails - 18ga x 1.25"', description: 'Brad nails for delicate trim work', quantity: 3, unit: 'boxes', unitCost: 11, totalCost: 33, supplier: 'Hardware Pro', category: 'Fasteners', visible: true },
      { id: 'm106', name: 'Deck Screws - 2.5" Coated', description: 'Exterior-rated deck screws', quantity: 5, unit: 'lbs', unitCost: 14, totalCost: 70, supplier: 'Hardware Pro', category: 'Fasteners', visible: true },
      { id: 'm107', name: 'Drywall Screws - 1.25" Fine Thread', description: 'Black phosphate drywall screws', quantity: 3, unit: 'lbs', unitCost: 9, totalCost: 27, supplier: 'Hardware Pro', category: 'Fasteners', visible: true },
      { id: 'm108', name: 'Wall Anchors Assortment', description: 'Plastic and toggle anchors for drywall', quantity: 1, unit: 'kit', unitCost: 22, totalCost: 22, supplier: 'Hardware Pro', category: 'Fasteners', visible: true },
      { id: 'm109', name: 'Wood Screws Assortment', description: 'Various sizes of wood screws', quantity: 1, unit: 'kit', unitCost: 18, totalCost: 18, supplier: 'Hardware Pro', category: 'Fasteners', visible: true },
      
      // === WASTE MANAGEMENT & DISPOSAL ===
      { id: 'm110', name: '20-Yard Dumpster Rental - 2 Weeks', description: 'Construction debris dumpster rental', quantity: 1, unit: 'rental', unitCost: 475, totalCost: 475, supplier: 'Waste Management Inc', category: 'Waste & Disposal', visible: true },
      { id: 'm111', name: 'Heavy Duty Contractor Trash Bags - 55gal', description: '3 mil heavy-duty trash bags', quantity: 3, unit: 'boxes (20ct)', unitCost: 32, totalCost: 96, supplier: 'Janitorial Supply', category: 'Waste & Disposal', visible: true },
      { id: 'm112', name: 'Debris Chute - Temporary', description: 'Temporary debris chute for safe material disposal', quantity: 1, unit: 'rental', unitCost: 125, totalCost: 125, supplier: 'Contractor Supply', category: 'Waste & Disposal', visible: true },
      
      // === DUST CONTAINMENT & PROTECTION ===
      { id: 'm113', name: 'ZipWall Dust Barrier System', description: 'Adjustable poles and plastic for dust barriers', quantity: 1, unit: 'kit', unitCost: 225, totalCost: 225, supplier: 'Contractor Supply', category: 'Dust Control', visible: true },
      { id: 'm114', name: 'Ram Board Floor Protection - 100ft Roll', description: 'Heavy-duty temporary floor protection', quantity: 1, unit: 'roll', unitCost: 185, totalCost: 185, supplier: 'Contractor Supply', category: 'Protection Materials', visible: true },
      { id: 'm115', name: 'Carpet Protection Film - Self-Adhesive', description: 'Protective film for adjacent carpeted areas', quantity: 100, unit: 'sq ft', unitCost: 0.35, totalCost: 35, supplier: 'Contractor Supply', category: 'Protection Materials', visible: true },
      { id: 'm116', name: 'Temporary Door Covers', description: 'Zipper door covers for dust containment', quantity: 3, unit: 'doors', unitCost: 15, totalCost: 45, supplier: 'Contractor Supply', category: 'Dust Control', visible: true },
      { id: 'm117', name: 'HEPA Air Scrubber Rental', description: 'HEPA filtration air scrubber for dust control', quantity: 1, unit: '2-week rental', unitCost: 175, totalCost: 175, supplier: 'Equipment Rental', category: 'Dust Control', visible: true },
      
      // === CLEANING SUPPLIES ===
      { id: 'm118', name: 'Shop Vacuum Bags - HEPA', description: 'HEPA-rated vacuum bags for fine dust', quantity: 2, unit: 'packs', unitCost: 22, totalCost: 44, supplier: 'Home Depot', category: 'Cleaning Supplies', visible: true },
      { id: 'm119', name: 'Shop Vacuum Filters - HEPA', description: 'Replacement HEPA filters', quantity: 2, unit: 'filters', unitCost: 28, totalCost: 56, supplier: 'Home Depot', category: 'Cleaning Supplies', visible: true },
      { id: 'm120', name: 'All-Purpose Cleaner - Commercial Grade', description: 'Heavy-duty all-purpose cleaner concentrate', quantity: 2, unit: 'gallons', unitCost: 18, totalCost: 36, supplier: 'Janitorial Supply', category: 'Cleaning Supplies', visible: true },
      { id: 'm121', name: 'Degreaser - Heavy Duty', description: 'Professional kitchen degreaser', quantity: 2, unit: 'quarts', unitCost: 15, totalCost: 30, supplier: 'Janitorial Supply', category: 'Cleaning Supplies', visible: true },
      { id: 'm122', name: 'Glass Cleaner - Streak Free', description: 'Professional glass cleaner', quantity: 2, unit: 'bottles', unitCost: 8, totalCost: 16, supplier: 'Janitorial Supply', category: 'Cleaning Supplies', visible: true },
      { id: 'm123', name: 'Microfiber Cleaning Cloths', description: 'Reusable microfiber cloths', quantity: 24, unit: 'cloths', unitCost: 2, totalCost: 48, supplier: 'Janitorial Supply', category: 'Cleaning Supplies', visible: true },
      { id: 'm124', name: 'Shop Towels - Heavy Duty', description: 'Disposable shop towels on a roll', quantity: 6, unit: 'rolls', unitCost: 8, totalCost: 48, supplier: 'Home Depot', category: 'Cleaning Supplies', visible: true },
      { id: 'm125', name: 'Broom & Dustpan Set - Heavy Duty', description: 'Professional broom and dustpan', quantity: 2, unit: 'sets', unitCost: 18, totalCost: 36, supplier: 'Janitorial Supply', category: 'Cleaning Supplies', visible: true },
      { id: 'm126', name: 'Mop & Bucket Set', description: 'Commercial mop and wringer bucket', quantity: 1, unit: 'set', unitCost: 45, totalCost: 45, supplier: 'Janitorial Supply', category: 'Cleaning Supplies', visible: true },
      { id: 'm127', name: 'Floor Cleaner - No-Rinse', description: 'Professional no-rinse floor cleaner', quantity: 1, unit: 'gallon', unitCost: 22, totalCost: 22, supplier: 'Janitorial Supply', category: 'Cleaning Supplies', visible: true },
      { id: 'm128', name: 'Sponges & Scrub Pads', description: 'Non-scratch sponges and scrubbers', quantity: 12, unit: 'pcs', unitCost: 1.50, totalCost: 18, supplier: 'Janitorial Supply', category: 'Cleaning Supplies', visible: true },
      { id: 'm129', name: 'Trash Bags - 13 Gallon Kitchen', description: 'Standard kitchen trash bags', quantity: 2, unit: 'boxes', unitCost: 14, totalCost: 28, supplier: 'Janitorial Supply', category: 'Cleaning Supplies', visible: true },
      
      // === SAFETY & PPE ===
      { id: 'm130', name: 'Safety Glasses - ANSI Z87+', description: 'Impact-rated safety glasses', quantity: 8, unit: 'pairs', unitCost: 9, totalCost: 72, supplier: 'Safety Supply Co', category: 'Safety Equipment', visible: true },
      { id: 'm131', name: 'N95 Respirator Masks', description: 'NIOSH-approved N95 particulate respirators', quantity: 3, unit: 'boxes (20ct)', unitCost: 28, totalCost: 84, supplier: 'Safety Supply Co', category: 'Safety Equipment', visible: true },
      { id: 'm132', name: 'Work Gloves - Heavy Duty Leather', description: 'Leather palm work gloves', quantity: 12, unit: 'pairs', unitCost: 7, totalCost: 84, supplier: 'Safety Supply Co', category: 'Safety Equipment', visible: true },
      { id: 'm133', name: 'Disposable Nitrile Gloves', description: 'Powder-free nitrile gloves', quantity: 2, unit: 'boxes (100ct)', unitCost: 18, totalCost: 36, supplier: 'Safety Supply Co', category: 'Safety Equipment', visible: true },
      { id: 'm134', name: 'Knee Pads - Gel-Filled', description: 'Professional gel knee pads', quantity: 6, unit: 'pairs', unitCost: 22, totalCost: 132, supplier: 'Safety Supply Co', category: 'Safety Equipment', visible: true },
      { id: 'm135', name: 'Hearing Protection - Earplugs', description: 'Foam earplugs for noise protection', quantity: 2, unit: 'boxes (100 pairs)', unitCost: 15, totalCost: 30, supplier: 'Safety Supply Co', category: 'Safety Equipment', visible: true },
      { id: 'm136', name: 'First Aid Kit - OSHA Compliant', description: 'Fully stocked contractor first aid kit', quantity: 1, unit: 'kit', unitCost: 65, totalCost: 65, supplier: 'Safety Supply Co', category: 'Safety Equipment', visible: true },
      { id: 'm137', name: 'Fire Extinguisher - ABC Type', description: '10lb ABC fire extinguisher', quantity: 1, unit: 'extinguisher', unitCost: 55, totalCost: 55, supplier: 'Safety Supply Co', category: 'Safety Equipment', visible: true },
      { id: 'm138', name: 'Caution Tape - Yellow/Black', description: 'Construction caution tape', quantity: 2, unit: 'rolls', unitCost: 8, totalCost: 16, supplier: 'Safety Supply Co', category: 'Safety Equipment', visible: true },
      { id: 'm139', name: 'Safety Cones - 28"', description: 'Traffic safety cones', quantity: 4, unit: 'cones', unitCost: 18, totalCost: 72, supplier: 'Safety Supply Co', category: 'Safety Equipment', visible: true },
      
      // === MISCELLANEOUS SUPPLIES ===
      { id: 'm140', name: 'Extension Cords - 12ga 50ft', description: 'Heavy-duty grounded extension cords', quantity: 4, unit: 'cords', unitCost: 35, totalCost: 140, supplier: 'Home Depot', category: 'Tools & Equipment', visible: true },
      { id: 'm141', name: 'Work Lights - LED 5000 Lumen', description: 'Portable LED work lights with stands', quantity: 3, unit: 'lights', unitCost: 65, totalCost: 195, supplier: 'Home Depot', category: 'Tools & Equipment', visible: true },
      { id: 'm142', name: 'Sawhorses - Folding', description: 'Heavy-duty folding sawhorses', quantity: 4, unit: 'sawhorses', unitCost: 28, totalCost: 112, supplier: 'Home Depot', category: 'Tools & Equipment', visible: true },
      { id: 'm143', name: 'Utility Knife Blades', description: 'Replacement utility knife blades', quantity: 100, unit: 'blades', unitCost: 0.18, totalCost: 18, supplier: 'Home Depot', category: 'Tools & Equipment', visible: true },
      { id: 'm144', name: 'Marking Tools - Pencils & Markers', description: 'Carpenter pencils and permanent markers', quantity: 1, unit: 'set', unitCost: 15, totalCost: 15, supplier: 'Home Depot', category: 'Tools & Equipment', visible: true },
      { id: 'm145', name: 'Tape Measure - 25ft', description: 'Professional tape measures', quantity: 4, unit: 'measures', unitCost: 18, totalCost: 72, supplier: 'Home Depot', category: 'Tools & Equipment', visible: true },
      { id: 'm146', name: 'Level - 4ft Professional', description: 'Precision box levels', quantity: 2, unit: 'levels', unitCost: 45, totalCost: 90, supplier: 'Home Depot', category: 'Tools & Equipment', visible: true },
      { id: 'm147', name: 'Chalk Line', description: 'Chalk line reel with blue chalk', quantity: 2, unit: 'reels', unitCost: 12, totalCost: 24, supplier: 'Home Depot', category: 'Tools & Equipment', visible: true },
      { id: 'm148', name: 'Stud Finder - Electronic', description: 'Multi-scan stud finder', quantity: 2, unit: 'finders', unitCost: 32, totalCost: 64, supplier: 'Home Depot', category: 'Tools & Equipment', visible: true },
      { id: 'm149', name: 'Laser Level - Self-Leveling', description: 'Cross-line laser level', quantity: 1, unit: 'level', unitCost: 95, totalCost: 95, supplier: 'Home Depot', category: 'Tools & Equipment', visible: true },
      { id: 'm150', name: 'Pry Bars & Demolition Tools', description: 'Flat bars and wrecking bars', quantity: 1, unit: 'set', unitCost: 55, totalCost: 55, supplier: 'Home Depot', category: 'Tools & Equipment', visible: true }
    ];

    labor = [
      { id: 'l1', role: 'General Contractor / Project Manager', description: 'Complete project management, coordination, permitting, inspections, client communication, and quality control', hours: 100, hourlyRate: 95, totalCost: 9500, visible: true },
      { id: 'l2', role: 'Licensed Master Electrician', description: 'All electrical work including rough-in, wiring, circuit installation, fixture installation, and final inspection', hours: 40, hourlyRate: 105, totalCost: 4200, visible: true },
      { id: 'l3', role: 'Electrician Helper / Apprentice', description: 'Electrical assistant work - wire pulling, drilling, fixture prep', hours: 40, hourlyRate: 60, totalCost: 2400, visible: true },
      { id: 'l4', role: 'Licensed Master Plumber', description: 'All plumbing work including rough-in, supply/drain lines, fixture installation, gas line connection, and final inspection', hours: 32, hourlyRate: 115, totalCost: 3680, visible: true },
      { id: 'l5', role: 'Plumber Helper / Apprentice', description: 'Plumbing assistant work - pipe cutting, fitting prep, cleanup', hours: 32, hourlyRate: 65, totalCost: 2080, visible: true },
      { id: 'l6', role: 'Master Carpenter / Cabinet Installer', description: 'Expert cabinet installation, precise leveling, hardware installation, and finish carpentry', hours: 56, hourlyRate: 85, totalCost: 4760, visible: true },
      { id: 'l7', role: 'Carpenter Assistant', description: 'Carpentry support - material prep, holding, cleanup', hours: 56, hourlyRate: 50, totalCost: 2800, visible: true },
      { id: 'l8', role: 'Countertop Fabricator / Installer', description: 'Template measuring, off-site fabrication, on-site installation, and sealing of granite countertops', hours: 20, hourlyRate: 90, totalCost: 1800, visible: true },
      { id: 'l9', role: 'Tile Installer / Setter', description: 'Professional tile layout, mortar application, tile setting, grouting, and sealing', hours: 20, hourlyRate: 75, totalCost: 1500, visible: true },
      { id: 'l10', role: 'Flooring Specialist', description: 'Floor prep, underlayment installation, LVP installation, and transition strips', hours: 32, hourlyRate: 62, totalCost: 1984, visible: true },
      { id: 'l11', role: 'Professional Painter / Finisher', description: 'Wall prep, priming, painting (2 coats), trim painting, and final touch-ups', hours: 64, hourlyRate: 55, totalCost: 3520, visible: true },
      { id: 'l12', role: 'Painter Helper', description: 'Paint prep, masking, cleanup, and support work', hours: 48, hourlyRate: 38, totalCost: 1824, visible: true },
      { id: 'l13', role: 'Demolition Specialist', description: 'Careful selective demolition, debris sorting, and safe material removal', hours: 32, hourlyRate: 45, totalCost: 1440, visible: true },
      { id: 'l14', role: 'General Construction Laborer', description: 'Material handling, tool management, site cleanup, and general support', hours: 80, hourlyRate: 35, totalCost: 2800, visible: true },
      { id: 'l15', role: 'Drywall Repair Specialist', description: 'Drywall patching, mudding, taping, and sanding', hours: 16, hourlyRate: 55, totalCost: 880, visible: true },
      { id: 'l16', role: 'Trim Carpenter', description: 'Crown molding, baseboard, casing installation, caulking, and finish work', hours: 40, hourlyRate: 68, totalCost: 2720, visible: true },
      { id: 'l17', role: 'Final Cleanup Crew (2-person team)', description: 'Deep cleaning, HEPA vacuuming, surface cleaning, and final detailing', hours: 24, hourlyRate: 70, totalCost: 1680, visible: true },
      { id: 'l18', role: 'Site Supervisor / Safety Officer', description: 'Daily site supervision, safety compliance, quality checks, and crew coordination', hours: 60, hourlyRate: 75, totalCost: 4500, visible: true }
    ];

    processSteps = [
      { id: 's1', stepNumber: 1, title: 'Permit Application & Approval', description: 'Submit detailed plans and specifications to building department. Apply for building, electrical, and plumbing permits. Pay plan review fees. Await approval from all relevant departments. Schedule required inspections for each phase of work.', estimatedDuration: '5-7 business days', visible: true },
      
      { id: 's2', stepNumber: 2, title: 'Pre-Construction Meeting & Final Planning', description: 'Conduct detailed walkthrough with homeowner. Confirm all selections (colors, hardware, fixtures). Review project timeline and milestones. Discuss daily work hours and site access. Establish communication protocols. Order long-lead items (cabinets, countertops, appliances).', estimatedDuration: '1 day', dependencies: ['s1'], visible: true },
      
      { id: 's3', stepNumber: 3, title: 'Site Protection & Staging', description: 'Install heavy-duty floor protection (Ram Board) in all traffic paths from entry to kitchen. Set up dust containment system with ZipWall barriers to isolate work zone from rest of home. Cover adjacent rooms and furniture with plastic sheeting. Protect carpeted areas with adhesive protection film. Set up temporary workspace for tools and materials. Install temporary lighting if needed. Post safety signage and caution tape.', estimatedDuration: '1 day', dependencies: ['s2'], visible: true },
      
      { id: 's4', stepNumber: 4, title: 'Selective Demolition Phase', description: 'Shut off electrical circuits and water supply to kitchen. Carefully disconnect and remove all existing appliances (label and store if being reused). Remove existing faucet, sink, and plumbing fixtures. Disconnect garbage disposal and dishwasher. Remove existing countertops and backsplash tile carefully to minimize wall damage. Unscrew and remove all existing wall and base cabinets. Remove existing light fixtures. Remove old flooring down to subfloor. Remove old trim and molding. Sort debris for recycling vs. disposal. Load dumpster systematically. HEPA vacuum entire work area to control dust. Protect any newly exposed walls or floors.', estimatedDuration: '3 days', dependencies: ['s3'], visible: true },
      
      { id: 's5', stepNumber: 5, title: 'Structural Assessment & Repairs', description: 'Inspect exposed walls, subfloor, and ceiling for any structural issues, water damage, or mold. Repair or replace any damaged drywall. Ensure subfloor is level and structurally sound - repair or level as needed. Check wall studs and blocking for cabinet mounting - add blocking if necessary. Confirm proper ventilation in space. Document any issues and obtain homeowner approval for additional repairs.', estimatedDuration: '1-2 days', dependencies: ['s4'], visible: true },
      
      { id: 's6', stepNumber: 6, title: 'Rough Electrical Work Phase', description: 'Install new electrical circuits from panel to kitchen (20A for appliances, 15A for lighting). Run 12/2 and 14/2 Romex through walls and ceiling per code. Install electrical boxes for all outlets, switches, and fixtures - proper placement per cabinet layout. Wire dedicated 20A circuits for dishwasher, garbage disposal, microwave, and refrigerator. Wire circuits for under-cabinet lighting and pendant lights. Install wiring for recessed lights with IC-rated housings. Ensure all wiring is properly stapled and protected. Leave wire tails at boxes for future connections. Label all circuits clearly. Schedule rough electrical inspection. Pass inspection before proceeding.', estimatedDuration: '3 days', dependencies: ['s5'], visible: true },
      
      { id: 's7', stepNumber: 7, title: 'Rough Plumbing Work Phase', description: 'Relocate supply lines (hot/cold PEX) to new sink location if needed. Install new shut-off valves for sink. Run drain lines with proper slope and venting per code. Install dishwasher supply line and drain connection. Install ice maker supply line for refrigerator. Pressure test all supply lines to ensure no leaks. Install gas line stub-out for range (by licensed professional). Schedule rough plumbing inspection. Pass inspection before proceeding.', estimatedDuration: '2 days', dependencies: ['s5'], visible: true },
      
      { id: 's8', stepNumber: 8, title: 'Wall & Ceiling Preparation', description: 'Patch all drywall holes and damage from demolition and rough-in work. Apply drywall joint compound to patches - allow to dry. Sand all patches smooth (use dust containment methods). Patch any ceiling damage and sand smooth. Prime all patched areas with stain-blocking primer to ensure even paint coverage. Inspect walls for any imperfections and repair as needed. Ensure all surfaces are smooth and ready for paint.', estimatedDuration: '2-3 days', dependencies: ['s6', 's7'], visible: true },
      
      { id: 's9', stepNumber: 9, title: 'Subfloor Preparation & Leveling', description: 'Thoroughly clean subfloor of all debris and old adhesive. Check entire floor for levelness with 6ft level. Sand down any high spots. Fill low spots with floor leveling compound. Allow compound to cure per manufacturer specs. Ensure floor is smooth, level, and ready for underlayment and flooring installation.', estimatedDuration: '1 day', dependencies: ['s8'], visible: true },
      
      { id: 's10', stepNumber: 10, title: 'Flooring Installation Phase', description: 'Acclimate flooring materials in room for 48 hours before installation. Install premium foam underlayment with moisture barrier - tape seams. Plan flooring layout to minimize cuts and ensure balanced appearance. Begin installation from straightest wall or center of room. Click-lock LVP planks together with proper expansion gap at all walls (1/4"). Cut planks precisely around obstacles, cabinets, and doorways. Install transition strips at doorways and height changes. Install reducer strips where floor meets lower adjacent surfaces. Clean flooring thoroughly after installation. Allow flooring to settle before placing heavy cabinets.', estimatedDuration: '3 days', dependencies: ['s9'], visible: true },
      
      { id: 's11', stepNumber: 11, title: 'Interior Painting - Preparation', description: 'Protect new flooring with drop cloths. Mask all areas not being painted with painter\'s tape. Clean all walls and ceilings with TSP to remove grease and dirt. Allow surfaces to dry completely. Fill any remaining imperfections with spackle and sand smooth. Apply painter\'s tape to protect ceiling line and any areas staying unpainted.', estimatedDuration: '1 day', dependencies: ['s10'], visible: true },
      
      { id: 's12', stepNumber: 12, title: 'Interior Painting - Priming', description: 'Apply bonding primer to all walls using roller and brush. Apply stain-blocking primer to any problem areas (water stains, repairs). Prime ceiling with ceiling primer if needed. Allow primer to dry per manufacturer specifications (typically 4 hours). Inspect coverage and apply second coat of primer to any areas needing it.', estimatedDuration: '1 day', dependencies: ['s11'], visible: true },
      
      { id: 's13', stepNumber: 13, title: 'Interior Painting - First Coat', description: 'Paint ceiling with flat white ceiling paint using roller. Cut in wall edges with brush. Roll walls with first coat of Alabaster (Sherwin Williams) eggshell finish. Ensure even coverage with smooth, consistent technique. Check for any missed spots or drips. Allow paint to dry per manufacturer specs (typically 4-6 hours before second coat).', estimatedDuration: '1-2 days', dependencies: ['s12'], visible: true },
      
      { id: 's14', stepNumber: 14, title: 'Interior Painting - Final Coat', description: 'Apply second coat to ceiling if needed for full coverage. Cut in wall edges with second coat. Roll walls with final coat of paint using crisscross pattern for smooth finish. Touch up ceiling as needed. Inspect entire painted surface for even coverage and professional appearance. Allow paint to cure for 24 hours before cabinet installation.', estimatedDuration: '1-2 days', dependencies: ['s13'], visible: true },
      
      { id: 's15', stepNumber: 15, title: 'Cabinet Installation - Wall Cabinets', description: 'Locate and mark all wall studs clearly. Install temporary ledger board at proper height (54" from floor typically) to support cabinets during installation. Begin with upper corner cabinet if applicable. Install wall cabinets one by one, checking for level and plumb at each step. Use shims as needed to ensure perfect level and alignment. Clamp adjacent cabinets together and drill pilot holes for connection screws. Screw cabinets to each other and then to wall studs with appropriate screws (2.5"-3"). Install all wall cabinets ensuring faces are flush and aligned. Remove temporary ledger board. Install any crown molding or light rail molding at this time.', estimatedDuration: '2 days', dependencies: ['s14'], visible: true },
      
      { id: 's16', stepNumber: 16, title: 'Cabinet Installation - Base Cabinets', description: 'Start with base corner cabinet if applicable. Set base cabinets in position checking for level in all directions. Use shims under cabinets to achieve perfect level. Clamp adjacent base cabinets together ensuring faces are flush. Drill pilot holes and screw cabinets together. Screw base cabinets to wall studs through mounting rails. Install sink base cabinet with access for plumbing. Install all drawer boxes and ensure smooth operation. Check that all cabinet doors open and close properly. Adjust hinges for perfect alignment.', estimatedDuration: '2 days', dependencies: ['s15'], visible: true },
      
      { id: 's17', stepNumber: 17, title: 'Cabinet Hardware Installation', description: 'Mark precise locations for all pulls and knobs using template for consistency. Drill pilot holes at marked locations using correct drill bit size. Install pulls and knobs with provided screws - don\'t overtighten. Check that all hardware is straight and aligned. Install soft-close hinges on all cabinet doors and adjust for smooth, quiet operation. Install soft-close drawer slides and test all drawers for smooth operation. Make final adjustments to ensure all doors and drawers close perfectly.', estimatedDuration: '1 day', dependencies: ['s16'], visible: true },
      
      { id: 's18', stepNumber: 18, title: 'Countertop Template & Fabrication', description: 'Professional templater creates precise digital template of installed cabinets. Template includes exact measurements for sink cutout, faucet holes, and any other penetrations. Fabricator cuts granite slabs to exact specifications off-site. Edges are finished with eased edge profile and polished. Sink cutout is made with precision and edges are polished. Faucet holes are drilled if undermount sink is not being used. Quality check of fabricated pieces before delivery. (Note: 3-4 days of this time is off-site fabrication)', estimatedDuration: '5-6 days', dependencies: ['s17'], visible: true },
      
      { id: 's19', stepNumber: 19, title: 'Countertop Installation', description: 'Fabricators deliver granite pieces to site. Test-fit all pieces for proper fit and alignment. Apply construction adhesive and/or silicone to cabinet tops. Carefully set granite slabs in position - these are very heavy. Ensure countertops are level and properly supported. Apply color-matched silicone at seams if multiple pieces. Seam pieces together with mechanical seam clips on underside. Allow adhesive to cure per manufacturer instructions. Apply penetrating granite sealer to all surfaces following manufacturer directions. Allow sealer to penetrate and cure. Wipe off excess sealer and buff to shine.', estimatedDuration: '1 day', dependencies: ['s18'], visible: true },
      
      { id: 's20', stepNumber: 20, title: 'Sink & Plumbing Fixture Installation', description: 'Apply bead of 100% silicone to underside of sink rim. Set undermount sink in countertop cutout from below. Install undermount sink clips and tighten evenly to secure sink. Allow silicone to cure for 24 hours. Install faucet to sink or countertop per manufacturer instructions. Connect supply lines from shut-off valves to faucet. Connect drain assemblies to sink with plumber\'s putty and proper washers. Install P-trap and connect to drain line. Install garbage disposal under sink and wire power. Connect disposal to drain assembly. Install dishwasher drain connection to disposal or drain. Test all connections for leaks by running water. Make any adjustments needed for leak-free operation.', estimatedDuration: '1 day', dependencies: ['s19'], visible: true },
      
      { id: 's21', stepNumber: 21, title: 'Backsplash Tile Installation - Setting', description: 'Mark layout lines for tile installation using level and measuring carefully. Apply modified thinset mortar to wall using notched trowel (proper trowel size for tile). Set subway tiles in running bond pattern starting from bottom. Use spacers to maintain consistent grout lines (typically 1/16"). Ensure tiles are level and plumb as work progresses. Cut tiles precisely for outlets, edges, and obstacles using wet saw. Install bullnose or edge trim pieces at exposed edges. Allow thinset to cure for 24-48 hours before grouting. Clean any thinset from tile faces before it hardens.', estimatedDuration: '2 days', dependencies: ['s20'], visible: true },
      
      { id: 's22', stepNumber: 22, title: 'Backsplash Tile Installation - Grouting', description: 'Remove all tile spacers once thinset has fully cured. Mix unsanded grout to proper consistency per manufacturer directions. Apply grout to tile joints using rubber grout float at 45-degree angle. Work grout into all joints completely. Wipe excess grout from tile faces with damp sponge in circular motion. Continue wiping and rinsing sponge until tiles are clean. Allow grout to cure for 24-48 hours. Buff tile faces with dry cloth to remove any haze. Apply penetrating grout sealer per manufacturer instructions. Allow sealer to cure before exposing to water.', estimatedDuration: '1 day', dependencies: ['s21'], visible: true },
      
      { id: 's23', stepNumber: 23, title: 'Trim & Molding Installation', description: 'Measure and cut crown molding pieces with precise miter cuts at corners. Install crown molding at ceiling using finish nails and construction adhesive. Measure and cut baseboard pieces with tight miter joints at corners. Install baseboard at floor line using finish nails into studs. Install quarter round at floor transition if needed. Measure and cut window and door casing. Install all casing with tight miter joints and proper reveals. Set all nails below surface using nail set. Fill all nail holes with sandable wood filler. Allow filler to dry and sand smooth. Caulk all seams between trim and wall with paintable latex caulk. Smooth caulk lines with finger or caulk tool for professional appearance.', estimatedDuration: '3 days', dependencies: ['s22'], visible: true },
      
      { id: 's24', stepNumber: 24, title: 'Trim Painting', description: 'Lightly sand all trim pieces to ensure smooth surface. Wipe down trim with tack cloth to remove dust. Apply painter\'s tape to protect walls and floors adjacent to trim. Prime any new wood or filled areas with trim primer. Apply first coat of semi-gloss Extra White paint to all trim using quality angled brush. Allow first coat to dry per manufacturer specs. Lightly sand between coats with fine sandpaper for ultra-smooth finish. Apply second coat of semi-gloss paint for durability and perfect coverage. Touch up wall paint around trim as needed. Remove painter\'s tape while paint is still slightly wet for clean lines. Allow paint to cure for 24 hours.', estimatedDuration: '2-3 days', dependencies: ['s23'], visible: true },
      
      { id: 's25', stepNumber: 25, title: 'Electrical Fixture Installation Phase', description: 'Install all outlets and GFCI outlets with proper wiring. Install all switches and dimmer switches ensuring correct wiring. Install LED power supplies for under-cabinet lighting in concealed locations. Install under-cabinet LED strip lights and connect to power supplies. Install recessed LED lights in can housings and connect wiring. Hang pendant light fixtures over island or peninsula at proper height. Install any other light fixtures (ceiling lights, etc.). Install all electrical device covers (outlet and switch plates). Test all outlets with circuit tester to ensure proper wiring. Test all switches and dimmers for proper operation. Program any smart switches or dimmers if applicable. Schedule final electrical inspection. Pass inspection.', estimatedDuration: '2-3 days', dependencies: ['s24'], visible: true },
      
      { id: 's26', stepNumber: 26, title: 'Appliance Delivery & Installation', description: 'Coordinate delivery window with homeowner. Inspect all appliances upon delivery for damage. Uncrate and position refrigerator - install water line for ice maker and water dispenser. Level refrigerator and adjust feet as needed. Position gas range and connect gas line (by licensed plumber). Level range and test all burners and oven. Slide dishwasher into cabinet opening and secure to countertop. Connect dishwasher water supply and drain lines. Level dishwasher and test cycle. Install over-range microwave with proper mounting bracket. Connect microwave to dedicated circuit and test. Test all appliances for proper operation. Review operation manuals with homeowner. Register all appliances for warranty. Remove all packaging materials and dispose properly.', estimatedDuration: '1 day', dependencies: ['s25'], visible: true },
      
      { id: 's27', stepNumber: 27, title: 'Final Caulking & Detailing', description: 'Apply 100% silicone caulk around sink rim where it meets countertop. Caulk along backsplash where tile meets countertop with color-matched caulk. Caulk any gaps between countertop and wall. Apply silicone caulk around any plumbing penetrations through walls or floors. Caulk around any electrical penetrations if needed. Touch up any paint nicks or scratches from appliance installation. Install any final pieces of hardware or accessories. Tighten any loose screws on cabinets or hardware. Clean all caulk lines for professional appearance. Allow all caulk to cure per manufacturer specs.', estimatedDuration: '1 day', dependencies: ['s26'], visible: true },
      
      { id: 's28', stepNumber: 28, title: 'Final Inspections & Sign-Offs', description: 'Schedule final electrical inspection with building department. Walk inspector through all electrical work and corrections if any needed. Pass final electrical inspection and obtain signed permit card. Schedule final plumbing inspection with building department. Walk inspector through all plumbing work and corrections if any needed. Pass final plumbing inspection and obtain signed permit card. Schedule final building inspection. Walk inspector through entire project. Pass final building inspection. Obtain certificate of completion or occupancy if required. File all inspection records and permits for homeowner records.', estimatedDuration: '2-3 days (due to inspection scheduling)', dependencies: ['s27'], visible: true },
      
      { id: 's29', stepNumber: 29, title: 'Deep Cleaning & Final Cleanup', description: 'Remove all dust containment barriers carefully to avoid spreading dust. Remove all floor protection materials. HEPA vacuum entire kitchen including inside cabinets and drawers. Vacuum adjacent areas that may have collected dust. Clean all surfaces with appropriate cleaners (countertops, cabinets, appliances). Use glass cleaner on all windows, mirrors, and glass surfaces. Clean inside all cabinets and drawers. Clean all light fixtures and wipe down switch plates and outlet covers. Degrease and clean countertops and backsplash thoroughly. Clean and polish sink and faucet. Clean appliances inside and out - remove all stickers and protective films. Mop floor with appropriate cleaner until spotless. Clean and organize all tools and materials. Remove all construction debris and trash. Haul any remaining materials or trash off-site. Final detailed cleaning pass to ensure showroom quality. Ensure all cabinet doors and drawers are aligned and close properly.', estimatedDuration: '1-2 days', dependencies: ['s28'], visible: true },
      
      { id: 's30', stepNumber: 30, title: 'Client Walkthrough & Project Closeout', description: 'Schedule detailed final walkthrough with homeowner at their convenience. Walk through entire kitchen with homeowner noting every detail. Demonstrate operation of all appliances including features and cycles. Show how to care for granite countertops and provide sealer for future use. Explain cabinet hardware and soft-close features. Demonstrate dimmer switches and lighting controls. Provide all appliance manuals, warranties, and receipts in organized folder. Provide paint colors, product names, and supplier information for future reference. Provide care instructions for all materials (granite, cabinets, tile, grout). Create punch-list of any final touch-ups or corrections needed. Complete all punch-list items promptly. Obtain final homeowner approval and satisfaction sign-off. Collect final payment per contract terms. Provide warranty information for all work performed. Thank homeowner for their business and provide contact info for any future needs or questions.', estimatedDuration: '1 day + punch list time', dependencies: ['s29'], visible: true }
    ];
    
  } else {
    // Generic comprehensive quote for other service types - still very detailed
    materials = [
      // Permits
      { id: 'm1', name: 'Building Permit', description: 'Required permit for work', quantity: 1, unit: 'permit', unitCost: 285, totalCost: 285, supplier: 'City Building Dept', category: 'Permits', visible: true },
      
      // Core Materials
      { id: 'm2', name: 'Primary Materials Package', description: 'Main materials for project scope', quantity: 1, unit: 'lot', unitCost: 3200, totalCost: 3200, supplier: 'General Supply', category: 'Materials', visible: true },
      
      // Fasteners
      { id: 'm3', name: 'Screws Assortment', description: 'Various wood and drywall screws', quantity: 1, unit: 'set', unitCost: 65, totalCost: 65, supplier: 'Hardware Pro', category: 'Fasteners', visible: true },
      { id: 'm4', name: 'Nails Assortment', description: 'Finish and framing nails', quantity: 1, unit: 'set', unitCost: 45, totalCost: 45, supplier: 'Hardware Pro', category: 'Fasteners', visible: true },
      { id: 'm5', name: 'Anchors & Bolts', description: 'Wall anchors and mounting hardware', quantity: 1, unit: 'set', unitCost: 35, totalCost: 35, supplier: 'Hardware Pro', category: 'Fasteners', visible: true },
      
      // Adhesives & Sealants
      { id: 'm6', name: 'Construction Adhesive', description: 'Heavy-duty construction adhesive', quantity: 6, unit: 'tubes', unitCost: 6.50, totalCost: 39, supplier: 'Home Depot', category: 'Adhesives', visible: true },
      { id: 'm7', name: 'Silicone Caulk - Clear', description: 'Waterproof silicone sealant', quantity: 4, unit: 'tubes', unitCost: 7, totalCost: 28, supplier: 'Home Depot', category: 'Sealants', visible: true },
      { id: 'm8', name: 'Painter\'s Caulk - White', description: 'Paintable latex caulk', quantity: 6, unit: 'tubes', unitCost: 4.50, totalCost: 27, supplier: 'Home Depot', category: 'Sealants', visible: true },
      { id: 'm9', name: 'Wood Glue', description: 'Premium wood glue', quantity: 2, unit: 'bottles', unitCost: 12, totalCost: 24, supplier: 'Hardware Pro', category: 'Adhesives', visible: true },
      
      // Paint & Finish
      { id: 'm10', name: 'Interior Paint', description: 'Premium interior paint', quantity: 5, unit: 'gallons', unitCost: 68, totalCost: 340, supplier: 'Paint Pro Supply', category: 'Paint', visible: true },
      { id: 'm11', name: 'Paint Primer', description: 'Bonding primer', quantity: 3, unit: 'gallons', unitCost: 52, totalCost: 156, supplier: 'Paint Pro Supply', category: 'Paint', visible: true },
      { id: 'm12', name: 'Trim Paint - Semi-Gloss', description: 'Semi-gloss enamel for trim', quantity: 2, unit: 'gallons', unitCost: 72, totalCost: 144, supplier: 'Paint Pro Supply', category: 'Paint', visible: true },
      { id: 'm13', name: 'Paint Rollers & Covers', description: 'Professional roller set with covers', quantity: 1, unit: 'set', unitCost: 38, totalCost: 38, supplier: 'Paint Pro Supply', category: 'Paint Supplies', visible: true },
      { id: 'm14', name: 'Paint Brushes', description: 'Quality brush set (2.5", 3")', quantity: 1, unit: 'set', unitCost: 32, totalCost: 32, supplier: 'Paint Pro Supply', category: 'Paint Supplies', visible: true },
      { id: 'm15', name: 'Painter\'s Tape - 2"', description: 'Blue painter\'s tape', quantity: 6, unit: 'rolls', unitCost: 8.50, totalCost: 51, supplier: 'Paint Pro Supply', category: 'Paint Supplies', visible: true },
      { id: 'm16', name: 'Sandpaper Assortment', description: 'Various grits for surface prep', quantity: 1, unit: 'pack', unitCost: 22, totalCost: 22, supplier: 'Home Depot', category: 'Paint Supplies', visible: true },
      
      // Protection Materials
      { id: 'm17', name: 'Drop Cloths - Canvas', description: '9x12 canvas drop cloths', quantity: 3, unit: 'cloths', unitCost: 25, totalCost: 75, supplier: 'Paint Pro Supply', category: 'Protection', visible: true },
      { id: 'm18', name: 'Plastic Sheeting - 10x100ft', description: 'Heavy-duty plastic sheeting', quantity: 1, unit: 'roll', unitCost: 42, totalCost: 42, supplier: 'Home Depot', category: 'Protection', visible: true },
      { id: 'm19', name: 'Floor Protection - Ram Board', description: 'Temporary floor protection', quantity: 75, unit: 'sq ft', unitCost: 0.75, totalCost: 56.25, supplier: 'Contractor Supply', category: 'Protection', visible: true },
      { id: 'm20', name: 'Dust Barrier System', description: 'ZipWall dust containment poles and plastic', quantity: 1, unit: 'kit', unitCost: 165, totalCost: 165, supplier: 'Contractor Supply', category: 'Protection', visible: true },
      
      // Waste & Disposal
      { id: 'm21', name: 'Dumpster Rental - 10 Yard', description: '10-yard dumpster for 2 weeks', quantity: 1, unit: 'rental', unitCost: 385, totalCost: 385, supplier: 'Waste Management', category: 'Disposal', visible: true },
      { id: 'm22', name: 'Heavy Duty Trash Bags - 55gal', description: 'Contractor-grade trash bags', quantity: 2, unit: 'boxes', unitCost: 30, totalCost: 60, supplier: 'Janitorial Supply', category: 'Disposal', visible: true },
      
      // Cleaning Supplies
      { id: 'm23', name: 'All-Purpose Cleaner', description: 'Commercial-grade cleaner', quantity: 2, unit: 'gallons', unitCost: 16, totalCost: 32, supplier: 'Janitorial Supply', category: 'Cleaning', visible: true },
      { id: 'm24', name: 'Degreaser', description: 'Heavy-duty degreaser', quantity: 1, unit: 'gallon', unitCost: 22, totalCost: 22, supplier: 'Janitorial Supply', category: 'Cleaning', visible: true },
      { id: 'm25', name: 'Glass Cleaner', description: 'Streak-free glass cleaner', quantity: 2, unit: 'bottles', unitCost: 8, totalCost: 16, supplier: 'Janitorial Supply', category: 'Cleaning', visible: true },
      { id: 'm26', name: 'Microfiber Cloths', description: 'Reusable cleaning cloths', quantity: 24, unit: 'cloths', unitCost: 2, totalCost: 48, supplier: 'Janitorial Supply', category: 'Cleaning', visible: true },
      { id: 'm27', name: 'Shop Towels', description: 'Disposable shop towels', quantity: 4, unit: 'rolls', unitCost: 8, totalCost: 32, supplier: 'Home Depot', category: 'Cleaning', visible: true },
      { id: 'm28', name: 'Shop Vacuum Bags & Filters - HEPA', description: 'HEPA filtration for dust control', quantity: 1, unit: 'set', unitCost: 45, totalCost: 45, supplier: 'Home Depot', category: 'Cleaning', visible: true },
      { id: 'm29', name: 'Broom & Dustpan Set', description: 'Heavy-duty broom and dustpan', quantity: 2, unit: 'sets', unitCost: 16, totalCost: 32, supplier: 'Janitorial Supply', category: 'Cleaning', visible: true },
      { id: 'm30', name: 'Mop & Bucket', description: 'Commercial mop and wringer bucket', quantity: 1, unit: 'set', unitCost: 42, totalCost: 42, supplier: 'Janitorial Supply', category: 'Cleaning', visible: true },
      
      // Safety Equipment
      { id: 'm31', name: 'Safety Glasses - ANSI Rated', description: 'Impact-rated safety glasses', quantity: 6, unit: 'pairs', unitCost: 9, totalCost: 54, supplier: 'Safety Supply', category: 'Safety', visible: true },
      { id: 'm32', name: 'N95 Respirator Masks', description: 'NIOSH-approved respirators', quantity: 2, unit: 'boxes', unitCost: 28, totalCost: 56, supplier: 'Safety Supply', category: 'Safety', visible: true },
      { id: 'm33', name: 'Work Gloves - Heavy Duty', description: 'Leather palm work gloves', quantity: 10, unit: 'pairs', unitCost: 7, totalCost: 70, supplier: 'Safety Supply', category: 'Safety', visible: true },
      { id: 'm34', name: 'Disposable Nitrile Gloves', description: 'Powder-free nitrile gloves', quantity: 1, unit: 'box (100ct)', unitCost: 18, totalCost: 18, supplier: 'Safety Supply', category: 'Safety', visible: true },
      { id: 'm35', name: 'First Aid Kit - OSHA Compliant', description: 'Fully stocked first aid kit', quantity: 1, unit: 'kit', unitCost: 55, totalCost: 55, supplier: 'Safety Supply', category: 'Safety', visible: true },
      { id: 'm36', name: 'Fire Extinguisher - ABC', description: '10lb ABC fire extinguisher', quantity: 1, unit: 'extinguisher', unitCost: 50, totalCost: 50, supplier: 'Safety Supply', category: 'Safety', visible: true },
      
      // Tools & Equipment
      { id: 'm37', name: 'Extension Cords - 12ga 50ft', description: 'Heavy-duty extension cords', quantity: 3, unit: 'cords', unitCost: 35, totalCost: 105, supplier: 'Home Depot', category: 'Equipment', visible: true },
      { id: 'm38', name: 'Work Lights - LED', description: 'Portable LED work lights', quantity: 2, unit: 'lights', unitCost: 55, totalCost: 110, supplier: 'Home Depot', category: 'Equipment', visible: true },
      { id: 'm39', name: 'Utility Knife Blades', description: 'Replacement utility blades', quantity: 50, unit: 'blades', unitCost: 0.20, totalCost: 10, supplier: 'Home Depot', category: 'Tools', visible: true },
      { id: 'm40', name: 'Measuring Tools', description: 'Tape measures, levels, squares', quantity: 1, unit: 'set', unitCost: 75, totalCost: 75, supplier: 'Home Depot', category: 'Tools', visible: true }
    ];

    labor = [
      { id: 'l1', role: 'Project Manager', description: 'Complete project management, coordination, and client communication', hours: 50, hourlyRate: 90, totalCost: 4500, visible: true },
      { id: 'l2', role: 'Lead Technician', description: 'Primary skilled technical work', hours: 80, hourlyRate: 80, totalCost: 6400, visible: true },
      { id: 'l3', role: 'Assistant Technician', description: 'Support and preparation work', hours: 80, hourlyRate: 55, totalCost: 4400, visible: true },
      { id: 'l4', role: 'General Laborer', description: 'Material handling, cleanup, and general support', hours: 50, hourlyRate: 38, totalCost: 1900, visible: true },
      { id: 'l5', role: 'Demolition Specialist', description: 'Selective demolition and debris removal (if needed)', hours: 20, hourlyRate: 45, totalCost: 900, visible: true },
      { id: 'l6', role: 'Final Cleanup Crew', description: 'Deep cleaning and final detailing', hours: 12, hourlyRate: 70, totalCost: 840, visible: true }
    ];

    processSteps = [
      { id: 's1', stepNumber: 1, title: 'Permits & Pre-Planning', description: 'Obtain all required permits and approvals from building department. Submit plans if needed. Pay permit fees. Create detailed work plan and schedule. Order materials with appropriate lead times.', estimatedDuration: '3-5 business days', visible: true },
      { id: 's2', stepNumber: 2, title: 'Client Meeting & Final Walkthrough', description: 'Meet with client to review project scope, timeline, and expectations. Confirm all details and selections. Discuss site access, work hours, and parking. Answer any questions.', estimatedDuration: '0.5 day', dependencies: ['s1'], visible: true },
      { id: 's3', stepNumber: 3, title: 'Site Preparation & Protection', description: 'Set up work area with appropriate protection. Install floor protection in traffic paths. Set up dust containment barriers to isolate work zone. Protect furniture and adjacent areas. Set up tool staging area. Install safety signage.', estimatedDuration: '0.5-1 day', dependencies: ['s2'], visible: true },
      { id: 's4', stepNumber: 4, title: 'Demolition Phase (if required)', description: 'Carefully remove existing materials or fixtures as needed. Disconnect utilities safely. Sort debris for recycling vs disposal. Load dumpster systematically. Clean work area thoroughly. Minimize dust using HEPA vacuum.', estimatedDuration: '1-2 days', dependencies: ['s3'], visible: true },
      { id: 's5', stepNumber: 5, title: 'Rough-In Work', description: 'Complete any structural, electrical, or plumbing rough-in work required. Install backing or blocking as needed. Run new supply lines, drains, or wiring per code. Schedule and pass rough inspections if required.', estimatedDuration: '2-3 days', dependencies: ['s4'], visible: true },
      { id: 's6', stepNumber: 6, title: 'Surface Preparation', description: 'Prepare all surfaces for finish work. Patch and repair any damage. Sand surfaces smooth. Prime surfaces as needed. Ensure everything is level, plumb, and square.', estimatedDuration: '1-2 days', dependencies: ['s5'], visible: true },
      { id: 's7', stepNumber: 7, title: 'Primary Work Execution', description: 'Execute main scope of work according to specifications. Install new materials or fixtures. Ensure quality workmanship and adherence to all code requirements. Make adjustments as needed for perfect fit and function.', estimatedDuration: '4-6 days', dependencies: ['s6'], visible: true },
      { id: 's8', stepNumber: 8, title: 'Finish Work & Detailing', description: 'Complete all finishing touches and detail work. Apply paint, stain, or final coatings as required. Install trim, hardware, or accessories. Caulk and seal all penetrations and seams. Ensure professional appearance throughout.', estimatedDuration: '2-3 days', dependencies: ['s7'], visible: true },
      { id: 's9', stepNumber: 9, title: 'Quality Control Inspection', description: 'Conduct thorough quality inspection of all work. Test all systems and functions. Create punch-list of any items needing attention. Complete all punch-list items promptly. Verify everything meets specifications.', estimatedDuration: '1 day', dependencies: ['s8'], visible: true },
      { id: 's10', stepNumber: 10, title: 'Final Inspections', description: 'Schedule and pass all required final inspections (electrical, plumbing, building). Address any inspector comments or corrections. Obtain signed-off permits and certificates.', estimatedDuration: '1-2 days', dependencies: ['s9'], visible: true },
      { id: 's11', stepNumber: 11, title: 'Deep Cleaning & Restoration', description: 'Remove all protection materials and dust barriers. HEPA vacuum entire work area and adjacent spaces. Clean all surfaces thoroughly. Clean windows and fixtures. Mop floors. Remove all tools, materials, and debris. Restore site to pristine condition.', estimatedDuration: '1 day', dependencies: ['s10'], visible: true },
      { id: 's12', stepNumber: 12, title: 'Client Walkthrough & Closeout', description: 'Conduct detailed final walkthrough with client. Demonstrate any new features or systems. Provide all manuals, warranties, and care instructions. Address any final concerns. Obtain client approval and satisfaction sign-off. Collect final payment. Provide warranty information and future contact details.', estimatedDuration: '0.5 day', dependencies: ['s11'], visible: true }
    ];
  }

  const materialsSubtotal = materials.reduce((sum, m) => sum + m.totalCost, 0);
  const laborSubtotal = labor.reduce((sum, l) => sum + l.totalCost, 0);
  const taxRate = 0.08; // 8% sales tax
  const taxAmount = materialsSubtotal * taxRate;
  const totalCost = materialsSubtotal + laborSubtotal + taxAmount;
  
  // 🚨 NEW: Generate AI-powered project schedule from quote data
  const projectSchedule = generateAIProjectSchedule(
    workRequest,
    { materials, labor, processSteps }
  );

  return {
    id: quoteId,
    quoteNumber,
    materials,
    labor,
    processSteps,
    projectSchedule, // AI-generated schedule included
    materialsSubtotal,
    laborSubtotal,
    taxRate,
    taxAmount,
    totalCost,
    generatedAt: new Date().toISOString(),
    approvalStatus: 'pending'
  };
}
