/**
 * Kitchen Cabinet Schedule Generator
 * 
 * Generates professional cabinet schedules from kitchen layouts
 * Includes material takeoffs, cost estimates, and installation sequences
 * 
 * Routes:
 * - POST /make-server-57095a78/cabinet-schedule/generate
 * - GET  /make-server-57095a78/cabinet-schedule/:id
 * - POST /make-server-57095a78/cabinet-schedule/export-pdf
 */

import { Hono } from 'npm:hono@4';
import { cors } from 'npm:hono/cors';
import OpenAI from 'npm:openai@4';

const app = new Hono();

// Enable CORS
app.use('*', cors({
  origin: '*',
  allowMethods: ['POST', 'GET', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}));

const openai = new OpenAI({
  apiKey: Deno.env.get('OPENAI_API_KEY'),
});

interface CabinetScheduleRequest {
  kitchenData: KitchenLayout;
  projectName?: string;
  clientName?: string;
  includeHardware?: boolean;
  includeInstallation?: boolean;
  pricingLevel?: 'budget' | 'mid-range' | 'premium';
}

interface KitchenLayout {
  roomDimensions: {
    width: number;
    length: number;
    height: number;
    area: number;
  };
  cabinets: KitchenCabinet[];
  appliances: KitchenAppliance[];
  countertops: Countertop[];
  layout: {
    type: 'galley' | 'l-shaped' | 'u-shaped' | 'island' | 'peninsula' | 'one-wall';
    workTriangle: {
      sink: { x: number; y: number };
      stove: { x: number; y: number };
      refrigerator: { x: number; y: number };
      efficiency: number;
    };
  };
  totalCost: number;
}

interface KitchenCabinet {
  id: string;
  type: 'base' | 'wall' | 'tall' | 'corner' | 'island' | 'pantry';
  position: {
    x: number;
    y: number;
    wall: 'north' | 'south' | 'east' | 'west' | 'island';
  };
  dimensions: {
    width: number;
    height: number;
    depth: number;
  };
  material: string;
  finish: string;
  hardware: string;
  doors: number;
  drawers: number;
  estimatedCost: number;
}

interface KitchenAppliance {
  id: string;
  type: string;
  position: { x: number; y: number };
  dimensions: { width: number; height: number; depth: number };
  notes: string;
}

interface Countertop {
  id: string;
  material: string;
  length: number;
  depth: number;
  area: number;
  edgeProfile: string;
  estimatedCost: number;
}

interface CabinetScheduleItem {
  id: string;
  mark: string; // Cabinet identification mark (e.g., "BC-1", "WC-1")
  type: string;
  location: string;
  width: number;
  height: number;
  depth: number;
  material: string;
  finish: string;
  doors: number;
  drawers: number;
  hardware: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
  notes: string;
  installationSequence: number;
}

interface HardwareScheduleItem {
  id: string;
  type: 'hinge' | 'pull' | 'knob' | 'soft-close' | 'drawer-slide';
  description: string;
  finish: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
}

interface InstallationStep {
  sequence: number;
  description: string;
  estimatedTime: number; // in hours
  laborCost: number;
  notes: string;
}

interface CabinetSchedule {
  id: string;
  projectName: string;
  clientName: string;
  createdAt: string;
  roomDimensions: {
    width: number;
    length: number;
    height: number;
    area: number;
  };
  layoutType: string;
  cabinets: CabinetScheduleItem[];
  hardware: HardwareScheduleItem[];
  countertops: Countertop[];
  installation: InstallationStep[];
  materialTakeoff: {
    category: string;
    description: string;
    quantity: number;
    unit: string;
    unitCost: number;
    totalCost: number;
  }[];
  summary: {
    totalCabinets: number;
    totalLinearFeet: number;
    cabinetCost: number;
    hardwareCost: number;
    countertopCost: number;
    installationCost: number;
    subtotal: number;
    taxRate: number;
    tax: number;
    grandTotal: number;
  };
}

// Helper function to generate cabinet mark
function generateCabinetMark(cabinet: KitchenCabinet, index: number): string {
  const typePrefix = {
    'base': 'BC',
    'wall': 'WC',
    'tall': 'TC',
    'corner': 'CC',
    'island': 'IC',
    'pantry': 'PC'
  };
  return `${typePrefix[cabinet.type] || 'C'}-${index + 1}`;
}

// Helper function to calculate hardware requirements
function calculateHardware(cabinets: KitchenCabinet[], pricingLevel: string): HardwareScheduleItem[] {
  const hardware: HardwareScheduleItem[] = [];
  
  // Calculate hinges (assume 2 per door)
  const totalDoors = cabinets.reduce((sum, cab) => sum + cab.doors, 0);
  const totalDrawers = cabinets.reduce((sum, cab) => sum + cab.drawers, 0);
  
  const hingeCost = pricingLevel === 'premium' ? 8 : pricingLevel === 'mid-range' ? 5 : 3;
  const pullCost = pricingLevel === 'premium' ? 15 : pricingLevel === 'mid-range' ? 10 : 6;
  const slideCost = pricingLevel === 'premium' ? 25 : pricingLevel === 'mid-range' ? 18 : 12;
  
  if (totalDoors > 0) {
    hardware.push({
      id: 'hw-1',
      type: 'hinge',
      description: 'Concealed Cabinet Hinge',
      finish: 'Soft-Close',
      quantity: totalDoors * 2,
      unitCost: hingeCost,
      totalCost: totalDoors * 2 * hingeCost
    });
  }
  
  if (totalDoors > 0) {
    hardware.push({
      id: 'hw-2',
      type: 'pull',
      description: 'Cabinet Door Pull/Handle',
      finish: cabinets[0]?.hardware || 'Brushed Nickel',
      quantity: totalDoors + totalDrawers,
      unitCost: pullCost,
      totalCost: (totalDoors + totalDrawers) * pullCost
    });
  }
  
  if (totalDrawers > 0) {
    hardware.push({
      id: 'hw-3',
      type: 'drawer-slide',
      description: 'Full Extension Drawer Slide',
      finish: 'Soft-Close',
      quantity: totalDrawers * 2,
      unitCost: slideCost,
      totalCost: totalDrawers * 2 * slideCost
    });
  }
  
  return hardware;
}

// Helper function to generate installation sequence
function generateInstallationSequence(cabinets: CabinetScheduleItem[]): InstallationStep[] {
  const steps: InstallationStep[] = [];
  
  steps.push({
    sequence: 1,
    description: 'Prepare work area, protect floors, remove old cabinets if necessary',
    estimatedTime: 4,
    laborCost: 340,
    notes: 'Ensure utilities are properly shut off'
  });
  
  steps.push({
    sequence: 2,
    description: 'Install wall cabinets (start from corner, work outward)',
    estimatedTime: 6,
    laborCost: 510,
    notes: 'Level and secure to wall studs'
  });
  
  steps.push({
    sequence: 3,
    description: 'Install base cabinets (start from corner, work outward)',
    estimatedTime: 5,
    laborCost: 425,
    notes: 'Shim and level before securing'
  });
  
  steps.push({
    sequence: 4,
    description: 'Install tall cabinets and pantry units',
    estimatedTime: 3,
    laborCost: 255,
    notes: 'Secure to wall and adjacent cabinets'
  });
  
  steps.push({
    sequence: 5,
    description: 'Install island cabinets (if applicable)',
    estimatedTime: 4,
    laborCost: 340,
    notes: 'Secure to floor, ensure level'
  });
  
  steps.push({
    sequence: 6,
    description: 'Install countertops and backsplash',
    estimatedTime: 6,
    laborCost: 510,
    notes: 'Seal joints properly'
  });
  
  steps.push({
    sequence: 7,
    description: 'Install hardware (pulls, knobs, hinges)',
    estimatedTime: 3,
    laborCost: 255,
    notes: 'Ensure consistent spacing'
  });
  
  steps.push({
    sequence: 8,
    description: 'Final adjustments, door alignment, drawer operation',
    estimatedTime: 2,
    laborCost: 170,
    notes: 'Test all moving parts'
  });
  
  return steps;
}

// Helper function to generate material takeoff
function generateMaterialTakeoff(cabinets: CabinetScheduleItem[], countertops: Countertop[]): any[] {
  const materials: any[] = [];
  
  // Calculate total linear feet of cabinets
  const totalLinearFeet = cabinets.reduce((sum, cab) => sum + (cab.width / 12), 0);
  
  materials.push({
    category: 'Cabinet Boxes',
    description: '3/4" Plywood Cabinet Box Material',
    quantity: Math.ceil(totalLinearFeet * 4),
    unit: 'Sheet',
    unitCost: 65,
    totalCost: Math.ceil(totalLinearFeet * 4) * 65
  });
  
  materials.push({
    category: 'Cabinet Doors',
    description: 'Cabinet Door Panels (as specified)',
    quantity: cabinets.reduce((sum, cab) => sum + cab.doors, 0),
    unit: 'Each',
    unitCost: 45,
    totalCost: cabinets.reduce((sum, cab) => sum + cab.doors, 0) * 45
  });
  
  materials.push({
    category: 'Drawer Fronts',
    description: 'Drawer Front Panels',
    quantity: cabinets.reduce((sum, cab) => sum + cab.drawers, 0),
    unit: 'Each',
    unitCost: 35,
    totalCost: cabinets.reduce((sum, cab) => sum + cab.drawers, 0) * 35
  });
  
  materials.push({
    category: 'Finish Materials',
    description: 'Stain/Paint and Sealer',
    quantity: Math.ceil(totalLinearFeet / 10),
    unit: 'Gallon',
    unitCost: 55,
    totalCost: Math.ceil(totalLinearFeet / 10) * 55
  });
  
  materials.push({
    category: 'Installation Hardware',
    description: 'Mounting Brackets, Screws, Shims',
    quantity: 1,
    unit: 'Set',
    unitCost: 150,
    totalCost: 150
  });
  
  return materials;
}

/**
 * POST /make-server-57095a78/cabinet-schedule/generate
 * Generate a complete cabinet schedule from kitchen layout data
 */
app.post('/generate', async (c) => {
  try {
    const body = await c.req.json<CabinetScheduleRequest>();
    const {
      kitchenData,
      projectName = 'Kitchen Remodel Project',
      clientName = 'Client',
      includeHardware = true,
      includeInstallation = true,
      pricingLevel = 'mid-range'
    } = body;

    if (!kitchenData || !kitchenData.cabinets) {
      return c.json({ error: 'Kitchen data with cabinets required' }, 400);
    }

    console.log('🔨 Generating cabinet schedule...');
    console.log(`   Cabinets: ${kitchenData.cabinets.length}`);
    console.log(`   Pricing Level: ${pricingLevel}`);

    // Create cabinet schedule items
    const cabinetScheduleItems: CabinetScheduleItem[] = kitchenData.cabinets.map((cabinet, index) => {
      // Calculate pricing multiplier
      const pricingMultiplier = pricingLevel === 'premium' ? 1.5 : pricingLevel === 'mid-range' ? 1.0 : 0.7;
      const materialMultiplier = cabinet.material === 'cherry' ? 1.3 : 
                                 cabinet.material === 'walnut' ? 1.5 :
                                 cabinet.material === 'oak' ? 1.1 : 1.0;
      
      const baseCost = cabinet.estimatedCost || 500;
      const unitCost = baseCost * pricingMultiplier * materialMultiplier;
      
      return {
        id: cabinet.id,
        mark: generateCabinetMark(cabinet, index),
        type: cabinet.type.charAt(0).toUpperCase() + cabinet.type.slice(1) + ' Cabinet',
        location: `${cabinet.position.wall.charAt(0).toUpperCase() + cabinet.position.wall.slice(1)} Wall`,
        width: cabinet.dimensions.width,
        height: cabinet.dimensions.height,
        depth: cabinet.dimensions.depth,
        material: cabinet.material,
        finish: cabinet.finish,
        doors: cabinet.doors,
        drawers: cabinet.drawers,
        hardware: cabinet.hardware,
        quantity: 1,
        unitCost: Math.round(unitCost),
        totalCost: Math.round(unitCost),
        notes: `${cabinet.dimensions.width}W x ${cabinet.dimensions.height}H x ${cabinet.dimensions.depth}D`,
        installationSequence: index + 1
      };
    });

    // Calculate hardware
    const hardware = includeHardware ? calculateHardware(kitchenData.cabinets, pricingLevel) : [];

    // Generate installation sequence
    const installation = includeInstallation ? generateInstallationSequence(cabinetScheduleItems) : [];

    // Generate material takeoff
    const materialTakeoff = generateMaterialTakeoff(cabinetScheduleItems, kitchenData.countertops);

    // Calculate totals
    const cabinetCost = cabinetScheduleItems.reduce((sum, item) => sum + item.totalCost, 0);
    const hardwareCost = hardware.reduce((sum, item) => sum + item.totalCost, 0);
    const countertopCost = kitchenData.countertops.reduce((sum, ct) => sum + ct.estimatedCost, 0);
    const installationCost = installation.reduce((sum, step) => sum + step.laborCost, 0);
    const subtotal = cabinetCost + hardwareCost + countertopCost + installationCost;
    const taxRate = 0.08; // 8% tax
    const tax = subtotal * taxRate;
    const grandTotal = subtotal + tax;

    const totalLinearFeet = cabinetScheduleItems.reduce((sum, cab) => sum + (cab.width / 12), 0);

    const schedule: CabinetSchedule = {
      id: `schedule-${Date.now()}`,
      projectName,
      clientName,
      createdAt: new Date().toISOString(),
      roomDimensions: kitchenData.roomDimensions,
      layoutType: kitchenData.layout.type,
      cabinets: cabinetScheduleItems,
      hardware,
      countertops: kitchenData.countertops,
      installation,
      materialTakeoff,
      summary: {
        totalCabinets: cabinetScheduleItems.length,
        totalLinearFeet: Math.round(totalLinearFeet * 10) / 10,
        cabinetCost,
        hardwareCost,
        countertopCost,
        installationCost,
        subtotal,
        taxRate,
        tax,
        grandTotal
      }
    };

    console.log('✅ Cabinet schedule generated successfully');
    console.log(`   Total Cabinets: ${schedule.summary.totalCabinets}`);
    console.log(`   Total Cost: $${schedule.summary.grandTotal.toLocaleString()}`);

    return c.json({
      success: true,
      schedule
    });

  } catch (error: any) {
    console.error('Error generating cabinet schedule:', error);
    return c.json({
      error: 'Failed to generate cabinet schedule',
      details: error.message
    }, 500);
  }
});

/**
 * GET /make-server-57095a78/cabinet-schedule/:id
 * Retrieve a saved cabinet schedule
 */
app.get('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    
    // In a real implementation, this would retrieve from database
    // For now, return a sample response
    return c.json({
      error: 'Schedule retrieval not yet implemented',
      message: 'Use the generate endpoint to create a new schedule'
    }, 501);
    
  } catch (error: any) {
    console.error('Error retrieving cabinet schedule:', error);
    return c.json({
      error: 'Failed to retrieve cabinet schedule',
      details: error.message
    }, 500);
  }
});

/**
 * POST /make-server-57095a78/cabinet-schedule/export-pdf
 * Export cabinet schedule as PDF (future implementation)
 */
app.post('/export-pdf', async (c) => {
  try {
    const { scheduleId } = await c.req.json();
    
    return c.json({
      error: 'PDF export not yet implemented',
      message: 'PDF export functionality coming soon'
    }, 501);
    
  } catch (error: any) {
    console.error('Error exporting PDF:', error);
    return c.json({
      error: 'Failed to export PDF',
      details: error.message
    }, 500);
  }
});

export default app;
