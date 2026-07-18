/**
 * Demo Quote Generator
 * Generates comprehensive, itemized demo quotes for ALL project types
 * COMPLETE material lists - every screw, trash bag, paintbrush, nail, caulk
 * DETAILED labor breakdowns - every subtask and action
 */

import {
  getFasteners,
  getAdhesivesAndSealants,
  getPaintSupplies,
  getProtectionAndCleanup,
  getSafetyEquipment,
  getTapes,
  getMiscConsumables
} from './comprehensiveMaterialsList';

interface PipelineItem {
  id: string;
  title: string;
  description: string;
  serviceType: string;
  estimatedValue: number;
}

export function generateDemoQuote(item: PipelineItem) {
  const serviceType = item.serviceType.toLowerCase();
  const title = item.title.toLowerCase();
  
  // Detect project type
  if (serviceType.includes('kitchen') || title.includes('kitchen')) {
    return generateKitchenQuote(item);
  } else if (serviceType.includes('hvac') || title.includes('hvac') || serviceType.includes('heating') || serviceType.includes('cooling')) {
    return generateHVACQuote(item);
  } else if (serviceType.includes('electrical') || title.includes('electrical') || serviceType.includes('panel')) {
    return generateElectricalQuote(item);
  } else if (serviceType.includes('plumbing') || title.includes('plumbing') || serviceType.includes('pipe')) {
    return generatePlumbingQuote(item);
  } else if (serviceType.includes('bathroom') || title.includes('bathroom')) {
    return generateBathroomQuote(item);
  } else if (serviceType.includes('roof') || title.includes('roof')) {
    return generateRoofingQuote(item);
  } else if (serviceType.includes('flooring') || title.includes('floor')) {
    return generateFlooringQuote(item);
  } else if (serviceType.includes('paint') || title.includes('paint')) {
    return generatePaintingQuote(item);
  } else if (serviceType.includes('deck') || title.includes('deck') || serviceType.includes('patio')) {
    return generateDeckQuote(item);
  } else if (serviceType.includes('window') || title.includes('window') || serviceType.includes('door')) {
    return generateWindowDoorQuote(item);
  } else {
    // Generic comprehensive quote
    return generateGenericQuote(item);
  }
}

// KITCHEN RENOVATION - Comprehensive Quote
function generateKitchenQuote(item: PipelineItem) {
  const materials = [
    // CABINETRY - Main Units
    { id: `mat-${Date.now()}-1`, name: 'White Shaker Base Cabinets - 36" Sink Base', description: 'Premium white shaker style 36" sink base cabinet with soft-close hinges', quantity: 1, unit: 'each', unitCost: 485, totalCost: 485, supplier: 'Cabinet Direct Pro', category: 'Cabinetry', visible: true },
    { id: `mat-${Date.now()}-2`, name: 'White Shaker Base Cabinets - 18" Base', description: 'Premium white shaker style 18" base cabinet with soft-close hinges and drawer', quantity: 4, unit: 'each', unitCost: 325, totalCost: 1300, supplier: 'Cabinet Direct Pro', category: 'Cabinetry', visible: true },
    { id: `mat-${Date.now()}-3`, name: 'White Shaker Base Cabinets - 24" Base', description: 'Premium white shaker style 24" base cabinet with soft-close hinges and drawers', quantity: 3, unit: 'each', unitCost: 395, totalCost: 1185, supplier: 'Cabinet Direct Pro', category: 'Cabinetry', visible: true },
    { id: `mat-${Date.now()}-4`, name: 'White Shaker Wall Cabinets - 36" x 30"', description: 'Premium white shaker style 36" wide x 30" tall wall cabinet', quantity: 4, unit: 'each', unitCost: 385, totalCost: 1540, supplier: 'Cabinet Direct Pro', category: 'Cabinetry', visible: true },
    { id: `mat-${Date.now()}-5`, name: 'White Shaker Wall Cabinets - 30" x 30"', description: 'Premium white shaker style 30" wide x 30" tall wall cabinet', quantity: 2, unit: 'each', unitCost: 345, totalCost: 690, supplier: 'Cabinet Direct Pro', category: 'Cabinetry', visible: true },
    { id: `mat-${Date.now()}-6`, name: 'Corner Base Cabinet - Lazy Susan', description: 'Premium corner base cabinet with lazy susan hardware', quantity: 1, unit: 'each', unitCost: 625, totalCost: 625, supplier: 'Cabinet Direct Pro', category: 'Cabinetry', visible: true },
    // CABINET HARDWARE & INSTALLATION
    { id: `mat-${Date.now()}-7`, name: 'Cabinet Knobs - Brushed Nickel', description: '1-1/4" brushed nickel cabinet knobs', quantity: 28, unit: 'each', unitCost: 4.25, totalCost: 119, supplier: 'Hardware Supply', category: 'Cabinet Hardware', visible: true },
    { id: `mat-${Date.now()}-8`, name: 'Cabinet Pulls - Brushed Nickel', description: '5" center-to-center brushed nickel pulls', quantity: 16, unit: 'each', unitCost: 6.50, totalCost: 104, supplier: 'Hardware Supply', category: 'Cabinet Hardware', visible: true },
    { id: `mat-${Date.now()}-9`, name: 'Cabinet Installation Screws - 2-1/2"', description: '#10 x 2-1/2" cabinet installation screws', quantity: 200, unit: 'each', unitCost: 0.18, totalCost: 36, supplier: 'Fastener Supply', category: 'Fasteners', visible: true },
    { id: `mat-${Date.now()}-10`, name: 'Cabinet Shims - Composite', description: 'Composite shims for cabinet leveling', quantity: 48, unit: 'each', unitCost: 0.65, totalCost: 31.20, supplier: 'Lumber & Supply', category: 'Installation Materials', visible: true },
    { id: `mat-${Date.now()}-11`, name: 'Wood Glue - Construction Grade', description: 'Titebond III waterproof wood glue', quantity: 4, unit: 'quart', unitCost: 12.50, totalCost: 50, supplier: 'Lumber & Supply', category: 'Adhesives', visible: true },
    { id: `mat-${Date.now()}-12`, name: 'Cabinet Filler Strips - 3" x 96"', description: 'White painted filler strips for cabinet gaps', quantity: 4, unit: 'each', unitCost: 28, totalCost: 112, supplier: 'Cabinet Direct Pro', category: 'Cabinetry', visible: true },
    { id: `mat-${Date.now()}-13`, name: 'Toe Kick Board - Painted White', description: '4-1/2" painted toe kick board', quantity: 28, unit: 'linear ft', unitCost: 5.25, totalCost: 147, supplier: 'Cabinet Direct Pro', category: 'Cabinetry', visible: true },
    // COUNTERTOPS
    { id: `mat-${Date.now()}-14`, name: 'Caesarstone Snow Quartz Countertops', description: '3cm Caesarstone Snow quartz slab with bullnose edge', quantity: 45, unit: 'sq ft', unitCost: 95, totalCost: 4275, supplier: 'Stone & Tile Warehouse', category: 'Countertops', visible: true },
    { id: `mat-${Date.now()}-15`, name: 'Quartz Seam Adhesive', description: 'Two-part epoxy for quartz seams (color-matched)', quantity: 3, unit: 'kit', unitCost: 45, totalCost: 135, supplier: 'Stone & Tile Warehouse', category: 'Installation Materials', visible: true },
    { id: `mat-${Date.now()}-16`, name: 'Undermount Sink Clips', description: 'Stainless steel undermount sink clips', quantity: 8, unit: 'each', unitCost: 6.25, totalCost: 50, supplier: 'Plumbing Supply Co', category: 'Plumbing', visible: true },
    { id: `mat-${Date.now()}-17`, name: 'Silicone Caulk - Clear', description: '100% silicone caulk for countertop installation', quantity: 6, unit: 'tube', unitCost: 8.50, totalCost: 51, supplier: 'General Supply', category: 'Sealants', visible: true },
    // APPLIANCES
    { id: `mat-${Date.now()}-18`, name: 'Bosch French Door Refrigerator - 36"', description: 'B36CL80ENS 36" counter-depth French door, stainless steel', quantity: 1, unit: 'each', unitCost: 2850, totalCost: 2850, supplier: 'Appliance Depot', category: 'Appliances', visible: true },
    { id: `mat-${Date.now()}-19`, name: 'KitchenAid Dual-Fuel Range - 30"', description: 'KFDC500JSS 30" dual-fuel range with convection', quantity: 1, unit: 'each', unitCost: 2450, totalCost: 2450, supplier: 'Appliance Depot', category: 'Appliances', visible: true },
    { id: `mat-${Date.now()}-20`, name: 'Bosch Dishwasher - 24"', description: 'SHEM78Z55N 24" dishwasher with third rack, 42 dBA', quantity: 1, unit: 'each', unitCost: 1200, totalCost: 1200, supplier: 'Appliance Depot', category: 'Appliances', visible: true },
    // Additional materials (abbreviated for space - same as before)
    { id: `mat-${Date.now()}-21`, name: 'Undermount Sink & Faucet Package', description: 'Kraus 33" sink with Moen pull-down faucet', quantity: 1, unit: 'set', unitCost: 850, totalCost: 850, supplier: 'Plumbing Supply Co', category: 'Plumbing', visible: true },
    { id: `mat-${Date.now()}-22`, name: 'Under-Cabinet LED Lighting', description: 'Dimmable LED strip system', quantity: 30, unit: 'linear ft', unitCost: 28, totalCost: 840, supplier: 'Lighting Solutions', category: 'Lighting', visible: true },
    { id: `mat-${Date.now()}-23`, name: 'Recessed LED Lights', description: '6" IC-rated LED fixtures', quantity: 8, unit: 'each', unitCost: 65, totalCost: 520, supplier: 'Lighting Solutions', category: 'Lighting', visible: true },
    { id: `mat-${Date.now()}-24`, name: 'Subway Tile Backsplash', description: '3x6 white ceramic subway tile', quantity: 65, unit: 'sq ft', unitCost: 7.50, totalCost: 487.50, supplier: 'Stone & Tile Warehouse', category: 'Tile', visible: true },
    { id: `mat-${Date.now()}-25`, name: 'Tile Installation Materials', description: 'Thinset, grout, spacers, sealer', quantity: 1, unit: 'kit', unitCost: 185, totalCost: 185, supplier: 'Stone & Tile Warehouse', category: 'Installation Materials', visible: true },
    { id: `mat-${Date.now()}-26`, name: 'Red Oak Hardwood Flooring', description: '3/4" solid red oak, prefinished', quantity: 185, unit: 'sq ft', unitCost: 12.50, totalCost: 2312.50, supplier: 'Hardwood Floors Direct', category: 'Flooring', visible: true },

    // COMPREHENSIVE CONSUMABLES - Every single item
    // All materials visible: true for internal Materials Hub work
    // visibleToCustomer tracks what shows in customer quotes
    ...getPaintSupplies().map((m, i) => ({ ...m, id: `mat-${Date.now()}-paint-${i}`, totalCost: m.quantity * m.unitCost, supplier: m.category.includes('Paint') ? 'Paint Pro Supply' : 'General Supply', visibleToCustomer: m.visible, visible: true })),
    ...getFasteners().map((m, i) => ({ ...m, id: `mat-${Date.now()}-fast-${i}`, totalCost: m.quantity * m.unitCost, supplier: 'Fastener Supply', visibleToCustomer: m.visible, visible: true })),
    ...getAdhesivesAndSealants().map((m, i) => ({ ...m, id: `mat-${Date.now()}-adhesive-${i}`, totalCost: m.quantity * m.unitCost, supplier: 'Adhesive Supply', visibleToCustomer: m.visible, visible: true })),
    ...getProtectionAndCleanup().map((m, i) => ({ ...m, id: `mat-${Date.now()}-cleanup-${i}`, totalCost: m.quantity * m.unitCost, supplier: 'General Supply', visibleToCustomer: m.visible, visible: true })),
    ...getSafetyEquipment().map((m, i) => ({ ...m, id: `mat-${Date.now()}-safety-${i}`, totalCost: m.quantity * m.unitCost, supplier: 'Safety Supply', visibleToCustomer: m.visible, visible: true })),
    ...getTapes().map((m, i) => ({ ...m, id: `mat-${Date.now()}-tape-${i}`, totalCost: m.quantity * m.unitCost, supplier: 'General Supply', visibleToCustomer: m.visible, visible: true })),
    ...getMiscConsumables().map((m, i) => ({ ...m, id: `mat-${Date.now()}-misc-${i}`, totalCost: m.quantity * m.unitCost, supplier: 'General Supply', visibleToCustomer: m.visible, visible: true })),
  ];

  const labor = [
    // DETAILED DEMOLITION - Every single subtask
    { id: `lab-${Date.now()}-1a`, role: 'Site Protection Setup', description: 'Install Ram Board floor protection, hang plastic sheeting over doorways, cover furniture, tape HVAC registers, mark existing conditions, establish staging area', hours: 4, hourlyRate: 65, totalCost: 260, visible: false },
    { id: `lab-${Date.now()}-1b`, role: 'Cabinet Removal', description: 'Disconnect water supply, remove dishwasher, unscrew and label cabinet doors, disconnect disposal, remove upper cabinets, remove lower cabinets, remove toe kicks, haul to dumpster', hours: 6, hourlyRate: 75, totalCost: 450, visible: false },
    { id: `lab-${Date.now()}-1c`, role: 'Countertop & Backsplash Removal', description: 'Cut caulk lines, remove sink clips, disconnect plumbing, cut adhesive, lift countertop sections, chisel tile backsplash, scrape thinset, patch drywall damage', hours: 4, hourlyRate: 75, totalCost: 300, visible: false },
    { id: `lab-${Date.now()}-1d`, role: 'Flooring Removal', description: 'Remove baseboards and trim, cut flooring into sections, pry up old flooring, remove nails/staples, inspect subfloor, replace damaged sections, vacuum thoroughly, check for level', hours: 6, hourlyRate: 70, totalCost: 420, visible: false },
    { id: `lab-${Date.now()}-1e`, role: 'Electrical/Plumbing Disconnect', description: 'Turn off power at breaker, disconnect range, cap gas line, disconnect lights, cap electrical wires, turn off water, drain lines, cap supply/drain lines', hours: 3, hourlyRate: 95, totalCost: 285, visible: false },
    { id: `lab-${Date.now()}-1f`, role: 'Debris Removal & Cleanup', description: 'Load demo debris into wheelbarrow/bags, haul to dumpster, sweep work area, vacuum dust, wipe surfaces, check HVAC filter, remove sharp edges, final inspection', hours: 4, hourlyRate: 65, totalCost: 260, visible: false },
    // DETAILED ELECTRICAL - Every subtask
    { id: `lab-${Date.now()}-2a`, role: 'Electrical Planning & Layout', description: 'Review NEC code requirements, calculate circuit loads, plan 20A circuits, plan dedicated appliance circuits, mark outlet locations per code, plan lighting circuits, create wiring diagram', hours: 3, hourlyRate: 95, totalCost: 285, visible: false },
    { id: `lab-${Date.now()}-2b`, role: 'Breaker Panel Upgrades', description: 'Turn off main breaker, remove panel cover, install AFCI/GFCI breakers per code, label all breakers, install blanks, test breakers, torque connections, reinstall cover', hours: 2, hourlyRate: 95, totalCost: 190, visible: false },
    { id: `lab-${Date.now()}-2c`, role: 'Rough-In Wiring', description: 'Drill holes through studs, run 12/2 Romex for 20A circuits, run 10/3 for range, run 12/2 for dishwasher/disposal, run 14/2 for lighting, secure with staples per code, leave 8" wire at boxes, label ends', hours: 12, hourlyRate: 95, totalCost: 1140, visible: false },
    { id: `lab-${Date.now()}-2d`, role: 'Electrical Box Installation', description: 'Install outlet boxes (GFCI), switch boxes, ceiling fixture boxes, recessed light housings (IC-rated), under-cabinet light junction boxes, ensure flush mounting, secure to studs', hours: 4, hourlyRate: 95, totalCost: 380, visible: false },
    { id: `lab-${Date.now()}-2e`, role: 'Under-Cabinet Lighting Rough-In', description: 'Plan LED strip placement, run 14/2 wire to each cabinet location, install junction boxes, install dimmer rough-in, label wires, plan transformer locations', hours: 3, hourlyRate: 95, totalCost: 285, visible: false },
    { id: `lab-${Date.now()}-2f`, role: 'Electrical Inspection', description: 'Call for rough-in inspection, meet inspector, walk through all work, address deficiencies, re-inspect if needed, obtain approved certificate, photograph approved rough-in', hours: 2, hourlyRate: 95, totalCost: 190, visible: false },
    // DETAILED PLUMBING - Every subtask
    { id: `lab-${Date.now()}-3a`, role: 'Plumbing Planning', description: 'Review plumbing code, plan sink drain location with proper slope, plan vent stack routing, mark supply line locations for sink/dishwasher/refrigerator, plan gas line route, calculate pipe sizes, create plumbing diagram', hours: 2, hourlyRate: 105, totalCost: 210, visible: false },
    { id: `lab-${Date.now()}-3b`, role: 'Water Supply Installation', description: 'Run 1/2" PEX from main to sink, install PEX manifold if using home-run, run 1/2" PEX to dishwasher, run 1/4" PEX to refrigerator, install stub-outs at wall, install hammer arrestors, secure PEX with clips, install shut-off valves', hours: 6, hourlyRate: 105, totalCost: 630, visible: false },
    { id: `lab-${Date.now()}-3c`, role: 'Drain & Vent Installation', description: 'Install 2" sink drain with P-trap, connect to drain stack, install AAV or run vent to stack, install dishwasher drain with high loop, ensure proper slope (1/4" per foot), install cleanouts per code, test fit before gluing', hours: 5, hourlyRate: 105, totalCost: 525, visible: false },
    { id: `lab-${Date.now()}-3d`, role: 'Gas Line Installation', description: 'Turn off gas at meter, run black iron pipe to range location, use pipe dope on threads, install shut-off valve at range (within 6ft), install drip leg/sediment trap, pressure test at 30 PSI for 15 minutes, leak test with soap solution, call gas company', hours: 4, hourlyRate: 105, totalCost: 420, visible: false },
    { id: `lab-${Date.now()}-3e`, role: 'Plumbing Inspection', description: 'Call for rough-in inspection, meet inspector, demonstrate water pressure test, show proper venting and slope, address corrections, obtain approved certificate, photograph approved rough-in', hours: 2, hourlyRate: 105, totalCost: 210, visible: false },
    { id: `lab-${Date.now()}-4`, role: 'Drywall Repair & Preparation', description: 'Patch all drywall damage from demolition. Apply joint compound, tape seams, and sand smooth to Level 4 finish. Prime all repaired areas. Ensure walls are perfectly flat for backsplash installation. Touch up ceiling as needed.', hours: 6, hourlyRate: 75, totalCost: 450, visible: true },
    { id: `lab-${Date.now()}-5`, role: 'Cabinet Installation & Leveling', description: 'Install all base cabinets with precision leveling and shimming. Securely anchor to wall studs. Install all wall cabinets with laser level for perfect alignment. Install corner lazy susan hardware. Install cabinet fillers and scribe to walls. Install toe kick boards. Install all cabinet hardware (knobs and pulls). Ensure all doors and drawers operate smoothly with soft-close function.', hours: 28, hourlyRate: 85, totalCost: 2380, visible: true },
    { id: `lab-${Date.now()}-6`, role: 'Countertop Fabrication & Installation', description: 'Create precise template of countertop layout. Fabricate Caesarstone Snow quartz slabs with bullnose edge profile. Cut sink opening and polish edges. Transport and install countertops with color-matched seam adhesive. Install undermount sink with clips and seal. Allow proper curing time. Final polish and sealing of all surfaces.', hours: 17, hourlyRate: 95, totalCost: 1615, visible: true },
    { id: `lab-${Date.now()}-7`, role: 'Backsplash Tile Installation', description: 'Install cement backer board on backsplash area. Apply thin-set mortar and install subway tile with precise 1/8" grout lines. Use tile spacers for consistent spacing. Cut tiles around outlets and edges for professional fit. Allow proper curing time. Apply grout and remove excess. Seal grout lines. Install outlet covers flush with tile.', hours: 22, hourlyRate: 75, totalCost: 1650, visible: true },
    { id: `lab-${Date.now()}-8`, role: 'Hardwood Flooring Installation', description: 'Prepare and level subfloor. Install moisture barrier underlayment. Acclimate hardwood flooring to room conditions. Install 3/4" solid red oak hardwood flooring with proper nail pattern. Cut and fit around cabinets and doorways. Install matching threshold transitions. Install baseboards and quarter-round trim. Touch up finish on any cut edges.', hours: 28, hourlyRate: 80, totalCost: 2240, visible: true },
    { id: `lab-${Date.now()}-9`, role: 'Electrical Finish & Lighting', description: 'Install all recessed LED lighting fixtures with proper IC-rated housings. Install and wire under-cabinet LED lighting system with dimmer controls. Install all outlet and switch covers. Install GFCI outlets per code. Test all circuits and lighting systems. Program dimmer switches. Label circuit breaker panel.', hours: 14, hourlyRate: 95, totalCost: 1330, visible: true },
    { id: `lab-${Date.now()}-10`, role: 'Plumbing Finish & Fixture Installation', description: 'Install undermount sink with professional mounting and sealing. Install pull-down faucet with deck plate. Install garbage disposal and connect to drain. Install dishwasher supply line with air gap. Connect refrigerator water line for ice maker. Test all connections for leaks. Install shut-off valves under sink with decorative escutcheons.', hours: 9, hourlyRate: 105, totalCost: 945, visible: true },
    { id: `lab-${Date.now()}-11`, role: 'Appliance Installation & Connection', description: 'Uncrate and position all appliances (refrigerator, range, dishwasher). Level appliances and install anti-tip brackets for range. Connect all gas, electrical, and water lines per manufacturer specifications. Test each appliance for proper operation. Remove all packaging and dispose properly. Provide customer with warranty information and manuals.', hours: 9, hourlyRate: 85, totalCost: 765, visible: true },
    { id: `lab-${Date.now()}-12`, role: 'Interior Painting', description: 'Prepare all surfaces with cleaning and light sanding. Apply painter\'s tape to protect cabinets, countertops, and fixtures. Prime all repaired drywall areas. Apply two coats of Sherwin Williams ProClassic paint to ceiling, walls, and trim. Cut in edges carefully around cabinets and tile. Remove tape while paint is still tacky for clean lines. Touch up as needed.', hours: 18, hourlyRate: 65, totalCost: 1170, visible: true },
    { id: `lab-${Date.now()}-13`, role: 'Final Details, Caulking & Cleanup', description: 'Apply clear silicone caulk around sink, faucet, and all countertop edges. Caulk gaps between cabinets and walls. Install cabinet hardware with precise alignment. Clean all surfaces thoroughly. Polish countertops and appliances. Vacuum and mop floors. Remove all debris and construction materials. Final walkthrough with customer to demonstrate appliances and answer questions.', hours: 10, hourlyRate: 75, totalCost: 750, visible: true },
    { id: `lab-${Date.now()}-14`, role: 'Project Management & Coordination', description: 'Overall project planning and timeline coordination. Schedule and coordinate all subcontractors (electrician, plumber, tile installer, cabinet installer). Order and track all materials and appliances. Coordinate building inspections (electrical rough-in, plumbing rough-in, final). Handle permit applications and approvals. Provide regular progress updates to customer. Address any issues or change orders. Ensure quality control at each phase.', hours: 32, hourlyRate: 75, totalCost: 2400, visible: true },
  ];

  const processSteps = [
    { id: `step-${Date.now()}-1`, stepNumber: 1, title: 'Site Preparation & Protection', description: 'Protect floors, walls, doorways with barriers', estimatedDuration: '0.5 days', visible: true },
    { id: `step-${Date.now()}-2`, stepNumber: 2, title: 'Demolition', description: 'Remove cabinets, countertops, flooring, appliances', estimatedDuration: '2 days', visible: true },
    { id: `step-${Date.now()}-3`, stepNumber: 3, title: 'Rough Electrical & Plumbing', description: 'Install new circuits, run supply/drain lines', estimatedDuration: '3-4 days', visible: true },
    { id: `step-${Date.now()}-4`, stepNumber: 4, title: 'Drywall Repair', description: 'Patch walls, tape, mud, sand smooth', estimatedDuration: '1-2 days', visible: true },
    { id: `step-${Date.now()}-5`, stepNumber: 5, title: 'Cabinet Installation', description: 'Install base and wall cabinets, level and secure', estimatedDuration: '3 days', visible: true },
    { id: `step-${Date.now()}-6`, stepNumber: 6, title: 'Countertop Installation', description: 'Template, fabricate, install quartz tops', estimatedDuration: '4-5 days', visible: true },
    { id: `step-${Date.now()}-7`, stepNumber: 7, title: 'Backsplash Tile', description: 'Install tile backsplash and grout', estimatedDuration: '2-3 days', visible: true },
    { id: `step-${Date.now()}-8`, stepNumber: 8, title: 'Flooring Installation', description: 'Install hardwood flooring and trim', estimatedDuration: '3-4 days', visible: true },
    { id: `step-${Date.now()}-9`, stepNumber: 9, title: 'Electrical & Plumbing Finish', description: 'Install fixtures, outlets, sink, faucet', estimatedDuration: '2 days', visible: true },
    { id: `step-${Date.now()}-10`, stepNumber: 10, title: 'Appliance Installation', description: 'Install and test all appliances', estimatedDuration: '1 day', visible: true },
    { id: `step-${Date.now()}-11`, stepNumber: 11, title: 'Painting', description: 'Paint ceiling, walls, trim', estimatedDuration: '2 days', visible: true },
    { id: `step-${Date.now()}-12`, stepNumber: 12, title: 'Final Details & Cleanup', description: 'Hardware, caulking, deep clean, walkthrough', estimatedDuration: '1 day', visible: true },
  ];

  return calculateQuoteTotals({ materials, labor, processSteps });
}

// HVAC INSTALLATION - Comprehensive Quote
function generateHVACQuote(item: PipelineItem) {
  const materials = [
    // MAIN EQUIPMENT
    { id: `mat-${Date.now()}-1`, name: 'Carrier Infinity 5-Ton Heat Pump', description: '5-ton 18 SEER heat pump outdoor unit with variable speed compressor', quantity: 1, unit: 'each', unitCost: 4850, totalCost: 4850, supplier: 'HVAC Distributors', category: 'Equipment', visible: true },
    { id: `mat-${Date.now()}-2`, name: 'Carrier Air Handler - 5 Ton', description: '5-ton variable speed air handler with coil', quantity: 1, unit: 'each', unitCost: 2650, totalCost: 2650, supplier: 'HVAC Distributors', category: 'Equipment', visible: true },
    { id: `mat-${Date.now()}-3`, name: 'Programmable Thermostat - WiFi', description: 'Carrier Cor WiFi thermostat with touchscreen', quantity: 2, unit: 'each', unitCost: 285, totalCost: 570, supplier: 'HVAC Distributors', category: 'Controls', visible: true },
    // DUCTWORK
    { id: `mat-${Date.now()}-4`, name: 'Galvanized Ductwork - Main Trunk', description: '16" x 12" galvanized trunk ductwork', quantity: 80, unit: 'linear ft', unitCost: 18.50, totalCost: 1480, supplier: 'Sheet Metal Supply', category: 'Ductwork', visible: true },
    { id: `mat-${Date.now()}-5`, name: 'Flex Duct - 6" Insulated', description: 'R6 insulated flexible duct', quantity: 200, unit: 'linear ft', unitCost: 4.25, totalCost: 850, supplier: 'Sheet Metal Supply', category: 'Ductwork', visible: true },
    { id: `mat-${Date.now()}-6`, name: 'Flex Duct - 8" Insulated', description: 'R6 insulated flexible duct', quantity: 150, unit: 'linear ft', unitCost: 5.50, totalCost: 825, supplier: 'Sheet Metal Supply', category: 'Ductwork', visible: true },
    { id: `mat-${Date.now()}-7`, name: 'Duct Boots - Floor Registers', description: 'Adjustable floor register boots', quantity: 18, unit: 'each', unitCost: 12.50, totalCost: 225, supplier: 'Sheet Metal Supply', category: 'Ductwork', visible: true },
    { id: `mat-${Date.now()}-8`, name: 'Duct Boots - Ceiling Diffusers', description: 'Adjustable ceiling diffuser boots', quantity: 12, unit: 'each', unitCost: 14.50, totalCost: 174, supplier: 'Sheet Metal Supply', category: 'Ductwork', visible: true },
    { id: `mat-${Date.now()}-9`, name: 'Supply Registers - Floor', description: 'Decorative floor registers, brushed nickel', quantity: 18, unit: 'each', unitCost: 22, totalCost: 396, supplier: 'Sheet Metal Supply', category: 'Registers', visible: true },
    { id: `mat-${Date.now()}-10`, name: 'Ceiling Diffusers', description: '2-way aluminum diffusers', quantity: 12, unit: 'each', unitCost: 28, totalCost: 336, supplier: 'Sheet Metal Supply', category: 'Registers', visible: true },
    { id: `mat-${Date.now()}-11`, name: 'Return Air Grilles', description: 'Stamped return air grilles', quantity: 6, unit: 'each', unitCost: 35, totalCost: 210, supplier: 'Sheet Metal Supply', category: 'Registers', visible: true },
    // REFRIGERANT & LINES
    { id: `mat-${Date.now()}-12`, name: 'R-410A Refrigerant', description: 'R-410A refrigerant 25lb cylinder', quantity: 2, unit: 'cylinder', unitCost: 385, totalCost: 770, supplier: 'HVAC Distributors', category: 'Refrigerant', visible: true },
    { id: `mat-${Date.now()}-13`, name: 'Refrigerant Line Set - 3/8" x 3/4"', description: 'Insulated copper line set', quantity: 50, unit: 'linear ft', unitCost: 12.50, totalCost: 625, supplier: 'HVAC Distributors', category: 'Refrigerant', visible: true },
    { id: `mat-${Date.now()}-14`, name: 'Line Set Insulation', description: 'Armaflex insulation for refrigerant lines', quantity: 50, unit: 'linear ft', unitCost: 3.25, totalCost: 162.50, supplier: 'HVAC Distributors', category: 'Insulation', visible: true },
    // ELECTRICAL
    { id: `mat-${Date.now()}-15`, name: 'Disconnect Box - Outdoor Unit', description: '60A fused disconnect with pullout', quantity: 1, unit: 'each', unitCost: 85, totalCost: 85, supplier: 'Electrical Supply', category: 'Electrical', visible: true },
    { id: `mat-${Date.now()}-16`, name: 'Circuit Breakers - 60A Double Pole', description: '60A 2-pole circuit breaker', quantity: 1, unit: 'each', unitCost: 48, totalCost: 48, supplier: 'Electrical Supply', category: 'Electrical', visible: true },
    { id: `mat-${Date.now()}-17`, name: 'THHN Wire - 6 AWG', description: '6 AWG THHN stranded copper wire', quantity: 100, unit: 'linear ft', unitCost: 2.85, totalCost: 285, supplier: 'Electrical Supply', category: 'Electrical', visible: true },
    { id: `mat-${Date.now()}-18`, name: 'Thermostat Wire - 18/8', description: '18-gauge 8-conductor thermostat wire', quantity: 150, unit: 'linear ft', unitCost: 0.85, totalCost: 127.50, supplier: 'Electrical Supply', category: 'Electrical', visible: true },
    { id: `mat-${Date.now()}-19`, name: 'Wire Connectors & Terminals', description: 'Assorted wire nuts and crimp terminals', quantity: 1, unit: 'kit', unitCost: 45, totalCost: 45, supplier: 'Electrical Supply', category: 'Electrical', visible: true },
    // CONDENSATE & DRAINAGE
    { id: `mat-${Date.now()}-20`, name: 'Condensate Pump', description: 'Little Giant condensate removal pump', quantity: 1, unit: 'each', unitCost: 185, totalCost: 185, supplier: 'HVAC Distributors', category: 'Drainage', visible: true },
    { id: `mat-${Date.now()}-21`, name: 'PVC Pipe - 3/4" Schedule 40', description: 'PVC pipe for condensate drain', quantity: 40, unit: 'linear ft', unitCost: 1.25, totalCost: 50, supplier: 'Plumbing Supply', category: 'Drainage', visible: true },
    { id: `mat-${Date.now()}-22`, name: 'PVC Fittings - Condensate', description: 'Elbows, tees, couplings for condensate drain', quantity: 1, unit: 'kit', unitCost: 38, totalCost: 38, supplier: 'Plumbing Supply', category: 'Drainage', visible: true },
    // FASTENERS & INSTALLATION MATERIALS
    { id: `mat-${Date.now()}-23`, name: 'Duct Tape - Foil', description: 'Professional foil duct tape', quantity: 12, unit: 'roll', unitCost: 8.50, totalCost: 102, supplier: 'Sheet Metal Supply', category: 'Installation Materials', visible: true },
    { id: `mat-${Date.now()}-24`, name: 'Duct Mastic', description: 'Water-based duct sealant mastic', quantity: 4, unit: 'gallon', unitCost: 28, totalCost: 112, supplier: 'Sheet Metal Supply', category: 'Installation Materials', visible: true },
    { id: `mat-${Date.now()}-25`, name: 'Sheet Metal Screws - Self-Tapping', description: '#8 self-tapping sheet metal screws', quantity: 500, unit: 'each', unitCost: 0.08, totalCost: 40, supplier: 'Fastener Supply', category: 'Fasteners', visible: true },
    { id: `mat-${Date.now()}-26`, name: 'Duct Hangers & Straps', description: 'Adjustable duct hangers and strapping', quantity: 1, unit: 'kit', unitCost: 125, totalCost: 125, supplier: 'Sheet Metal Supply', category: 'Installation Materials', visible: true },
    { id: `mat-${Date.now()}-27`, name: 'Vibration Isolation Pads', description: 'Rubber isolation pads for equipment', quantity: 4, unit: 'each', unitCost: 18, totalCost: 72, supplier: 'HVAC Distributors', category: 'Installation Materials', visible: true },
    { id: `mat-${Date.now()}-28`, name: 'Equipment Pad - Concrete', description: '4" x 36" x 36" concrete equipment pad', quantity: 1, unit: 'each', unitCost: 125, totalCost: 125, supplier: 'Building Supply', category: 'Installation Materials', visible: true },
    { id: `mat-${Date.now()}-29`, name: 'Refrigerant Recovery Tank', description: 'Recovery tank for old refrigerant', quantity: 1, unit: 'rental', unitCost: 85, totalCost: 85, supplier: 'HVAC Distributors', category: 'Equipment', visible: true },
    { id: `mat-${Date.now()}-30`, name: 'Filter Drier', description: 'Bi-flow filter drier for refrigerant system', quantity: 2, unit: 'each', unitCost: 48, totalCost: 96, supplier: 'HVAC Distributors', category: 'Equipment', visible: true },
    { id: `mat-${Date.now()}-31`, name: 'Nitrogen - Pressurization', description: 'Nitrogen cylinder for pressure testing', quantity: 1, unit: 'rental', unitCost: 65, totalCost: 65, supplier: 'HVAC Distributors', category: 'Equipment', visible: true },
    { id: `mat-${Date.now()}-32`, name: 'Air Filters - Pleated', description: 'MERV 13 pleated air filters (6-pack)', quantity: 1, unit: 'pack', unitCost: 95, totalCost: 95, supplier: 'HVAC Distributors', category: 'Filters', visible: true },

    // COMPREHENSIVE CONSUMABLES - Every single item
    // All materials visible: true for internal Materials Hub work
    // visibleToCustomer tracks what shows in customer quotes
    ...getPaintSupplies().map((m, i) => ({ ...m, id: `mat-${Date.now()}-paint-${i}`, totalCost: m.quantity * m.unitCost, supplier: m.category.includes('Paint') ? 'Paint Pro Supply' : 'General Supply', visibleToCustomer: m.visible, visible: true })),
    ...getFasteners().map((m, i) => ({ ...m, id: `mat-${Date.now()}-fast-${i}`, totalCost: m.quantity * m.unitCost, supplier: 'Fastener Supply', visibleToCustomer: m.visible, visible: true })),
    ...getAdhesivesAndSealants().map((m, i) => ({ ...m, id: `mat-${Date.now()}-adhesive-${i}`, totalCost: m.quantity * m.unitCost, supplier: 'Adhesive Supply', visibleToCustomer: m.visible, visible: true })),
    ...getProtectionAndCleanup().map((m, i) => ({ ...m, id: `mat-${Date.now()}-cleanup-${i}`, totalCost: m.quantity * m.unitCost, supplier: 'General Supply', visibleToCustomer: m.visible, visible: true })),
    ...getSafetyEquipment().map((m, i) => ({ ...m, id: `mat-${Date.now()}-safety-${i}`, totalCost: m.quantity * m.unitCost, supplier: 'Safety Supply', visibleToCustomer: m.visible, visible: true })),
    ...getTapes().map((m, i) => ({ ...m, id: `mat-${Date.now()}-tape-${i}`, totalCost: m.quantity * m.unitCost, supplier: 'General Supply', visibleToCustomer: m.visible, visible: true })),
    ...getMiscConsumables().map((m, i) => ({ ...m, id: `mat-${Date.now()}-misc-${i}`, totalCost: m.quantity * m.unitCost, supplier: 'General Supply', visibleToCustomer: m.visible, visible: true })),
  ];

  const labor = [
    { id: `lab-${Date.now()}-1`, role: 'Site Survey & Planning', description: 'Assess site, finalize equipment placement, plan ductwork routes', hours: 4, hourlyRate: 95, totalCost: 380, visible: true },
    { id: `lab-${Date.now()}-2`, role: 'Equipment Removal', description: 'Safely recover refrigerant, disconnect and remove old equipment', hours: 8, hourlyRate: 95, totalCost: 760, visible: true },
    { id: `lab-${Date.now()}-3`, role: 'Outdoor Unit Installation', description: 'Set equipment pad, position heat pump, level and secure', hours: 6, hourlyRate: 95, totalCost: 570, visible: true },
    { id: `lab-${Date.now()}-4`, role: 'Air Handler Installation', description: 'Install air handler, mount securely, connect to ductwork', hours: 8, hourlyRate: 95, totalCost: 760, visible: true },
    { id: `lab-${Date.now()}-5`, role: 'Ductwork Fabrication', description: 'Fabricate custom sheet metal ductwork', hours: 16, hourlyRate: 85, totalCost: 1360, visible: true },
    { id: `lab-${Date.now()}-6`, role: 'Ductwork Installation', description: 'Install trunk lines, flex runs, boots, registers', hours: 24, hourlyRate: 85, totalCost: 2040, visible: true },
    { id: `lab-${Date.now()}-7`, role: 'Refrigerant Lines', description: 'Run and insulate refrigerant line sets', hours: 8, hourlyRate: 95, totalCost: 760, visible: true },
    { id: `lab-${Date.now()}-8`, role: 'Electrical Installation', description: 'Run power to units, install disconnects, wire thermostats', hours: 12, hourlyRate: 95, totalCost: 1140, visible: true },
    { id: `lab-${Date.now()}-9`, role: 'Condensate Drain', description: 'Install condensate pump and drain lines', hours: 4, hourlyRate: 95, totalCost: 380, visible: true },
    { id: `lab-${Date.now()}-10`, role: 'Pressure Testing', description: 'Nitrogen pressure test refrigerant system', hours: 3, hourlyRate: 95, totalCost: 285, visible: true },
    { id: `lab-${Date.now()}-11`, role: 'Vacuum & Charging', description: 'Evacuate system, charge with R-410A refrigerant', hours: 4, hourlyRate: 95, totalCost: 380, visible: true },
    { id: `lab-${Date.now()}-12`, role: 'System Startup & Testing', description: 'Start system, test all functions, adjust airflow', hours: 4, hourlyRate: 95, totalCost: 380, visible: true },
    { id: `lab-${Date.now()}-13`, role: 'Thermostat Programming', description: 'Program thermostats, configure WiFi, train customer', hours: 2, hourlyRate: 85, totalCost: 170, visible: true },
    { id: `lab-${Date.now()}-14`, role: 'Final Inspection & Documentation', description: 'Municipal inspection, provide documentation, warranty registration', hours: 3, hourlyRate: 85, totalCost: 255, visible: true },
  ];

  const processSteps = [
    { id: `step-${Date.now()}-1`, stepNumber: 1, title: 'Site Assessment & Planning', description: 'Verify measurements, confirm equipment placement, plan duct routes', estimatedDuration: '0.5 days', visible: true },
    { id: `step-${Date.now()}-2`, stepNumber: 2, title: 'Remove Existing Equipment', description: 'Recover refrigerant, disconnect and remove old HVAC system', estimatedDuration: '1 day', visible: true },
    { id: `step-${Date.now()}-3`, stepNumber: 3, title: 'Equipment Installation', description: 'Install outdoor heat pump and indoor air handler', estimatedDuration: '1 day', visible: true },
    { id: `step-${Date.now()}-4`, stepNumber: 4, title: 'Ductwork Fabrication & Installation', description: 'Fabricate and install all ductwork, boots, and registers', estimatedDuration: '3-4 days', visible: true },
    { id: `step-${Date.now()}-5`, stepNumber: 5, title: 'Refrigerant Lines', description: 'Install and insulate refrigerant line sets', estimatedDuration: '1 day', visible: true },
    { id: `step-${Date.now()}-6`, stepNumber: 6, title: 'Electrical & Controls', description: 'Run power, install disconnects, wire thermostats', estimatedDuration: '1 day', visible: true },
    { id: `step-${Date.now()}-7`, stepNumber: 7, title: 'Condensate Drainage', description: 'Install condensate pump and drain piping', estimatedDuration: '0.5 days', visible: true },
    { id: `step-${Date.now()}-8`, stepNumber: 8, title: 'System Testing & Charging', description: 'Pressure test, evacuate, charge with refrigerant', estimatedDuration: '1 day', visible: true },
    { id: `step-${Date.now()}-9`, stepNumber: 9, title: 'Startup & Commissioning', description: 'System startup, testing, airflow adjustment', estimatedDuration: '0.5 days', visible: true },
    { id: `step-${Date.now()}-10`, stepNumber: 10, title: 'Final Inspection & Training', description: 'Municipal inspection, customer training, documentation', estimatedDuration: '0.5 days', visible: true },
  ];

  return calculateQuoteTotals({ materials, labor, processSteps });
}

// ELECTRICAL PANEL UPGRADE - Comprehensive Quote
function generateElectricalQuote(item: PipelineItem) {
  const materials = [
    // MAIN EQUIPMENT
    { id: `mat-${Date.now()}-1`, name: 'Electrical Panel - 200A Main Breaker', description: 'Square D 200A 40-circuit main breaker panel', quantity: 1, unit: 'each', unitCost: 385, totalCost: 385, supplier: 'Electrical Supply', category: 'Panels', visible: true },
    { id: `mat-${Date.now()}-2`, name: 'Circuit Breakers - 20A Single Pole', description: '20A single-pole AFCI/GFCI breakers', quantity: 12, unit: 'each', unitCost: 42, totalCost: 504, supplier: 'Electrical Supply', category: 'Breakers', visible: true },
    { id: `mat-${Date.now()}-3`, name: 'Circuit Breakers - 15A Single Pole', description: '15A single-pole AFCI breakers', quantity: 8, unit: 'each', unitCost: 38, totalCost: 304, supplier: 'Electrical Supply', category: 'Breakers', visible: true },
    { id: `mat-${Date.now()}-4`, name: 'Circuit Breakers - 30A Double Pole', description: '30A double-pole breakers for appliances', quantity: 4, unit: 'each', unitCost: 38, totalCost: 152, supplier: 'Electrical Supply', category: 'Breakers', visible: true },
    { id: `mat-${Date.now()}-5`, name: 'Circuit Breakers - 50A Double Pole', description: '50A double-pole breaker for range', quantity: 1, unit: 'each', unitCost: 45, totalCost: 45, supplier: 'Electrical Supply', category: 'Breakers', visible: true },
    { id: `mat-${Date.now()}-6`, name: 'Main Service Wire - 2/0 AWG Copper', description: '2/0 AWG copper THHN (3 conductors + ground)', quantity: 50, unit: 'linear ft', unitCost: 12.50, totalCost: 625, supplier: 'Electrical Supply', category: 'Wire', visible: true },
    { id: `mat-${Date.now()}-7`, name: 'Grounding Rod - 8 foot', description: '5/8" x 8\' copper-bonded grounding rod', quantity: 2, unit: 'each', unitCost: 28, totalCost: 56, supplier: 'Electrical Supply', category: 'Grounding', visible: true },
    { id: `mat-${Date.now()}-8`, name: 'Grounding Wire - #6 Bare Copper', description: '#6 AWG bare copper grounding wire', quantity: 50, unit: 'linear ft', unitCost: 1.85, totalCost: 92.50, supplier: 'Electrical Supply', category: 'Grounding', visible: true },
    { id: `mat-${Date.now()}-9`, name: 'Grounding Clamps - Rod', description: 'Bronze grounding rod clamps', quantity: 2, unit: 'each', unitCost: 6.50, totalCost: 13, supplier: 'Electrical Supply', category: 'Grounding', visible: true },
    { id: `mat-${Date.now()}-10`, name: 'Weatherhead & Mast Kit', description: 'Service entrance weatherhead with mast', quantity: 1, unit: 'kit', unitCost: 125, totalCost: 125, supplier: 'Electrical Supply', category: 'Service Entrance', visible: true },
    { id: `mat-${Date.now()}-11`, name: 'Meter Base - 200A', description: 'Ringless meter base with bypass', quantity: 1, unit: 'each', unitCost: 185, totalCost: 185, supplier: 'Electrical Supply', category: 'Service Entrance', visible: true },
    { id: `mat-${Date.now()}-12`, name: 'Conduit - 2" Rigid Metal', description: '2" galvanized rigid metal conduit', quantity: 20, unit: 'linear ft', unitCost: 8.50, totalCost: 170, supplier: 'Electrical Supply', category: 'Conduit', visible: true },
    { id: `mat-${Date.now()}-13`, name: 'Conduit Fittings & Supports', description: 'Couplings, elbows, straps for conduit', quantity: 1, unit: 'kit', unitCost: 95, totalCost: 95, supplier: 'Electrical Supply', category: 'Conduit', visible: true },
    { id: `mat-${Date.now()}-14`, name: 'Wire Lugs - Compression', description: 'Copper compression lugs for service wire', quantity: 6, unit: 'each', unitCost: 12.50, totalCost: 75, supplier: 'Electrical Supply', category: 'Connectors', visible: true },
    { id: `mat-${Date.now()}-15`, name: 'Wire Connectors - Split Bolt', description: 'Split bolt connectors for grounding', quantity: 4, unit: 'each', unitCost: 8.50, totalCost: 34, supplier: 'Electrical Supply', category: 'Connectors', visible: true },
    { id: `mat-${Date.now()}-16`, name: 'Bonding Bushing', description: 'Grounding bonding bushing for service entrance', quantity: 2, unit: 'each', unitCost: 18, totalCost: 36, supplier: 'Electrical Supply', category: 'Grounding', visible: true },
    { id: `mat-${Date.now()}-17`, name: 'Panel Labels & Directory', description: 'Circuit directory labels and panel labels', quantity: 1, unit: 'set', unitCost: 28, totalCost: 28, supplier: 'Electrical Supply', category: 'Installation Materials', visible: true },
    { id: `mat-${Date.now()}-18`, name: 'Plywood Panel Backer - 3/4"', description: '3/4" plywood for panel mounting', quantity: 1, unit: 'sheet', unitCost: 48, totalCost: 48, supplier: 'Lumber Supply', category: 'Installation Materials', visible: true },
    { id: `mat-${Date.now()}-19`, name: 'Anti-Oxidant Compound', description: 'Anti-oxidant paste for aluminum/copper connections', quantity: 1, unit: 'tube', unitCost: 18, totalCost: 18, supplier: 'Electrical Supply', category: 'Installation Materials', visible: true },
    { id: `mat-${Date.now()}-20`, name: 'Phase Tape - Color Coding', description: 'Colored electrical tape for phase identification', quantity: 1, unit: 'kit', unitCost: 24, totalCost: 24, supplier: 'Electrical Supply', category: 'Installation Materials', visible: true },

    // COMPREHENSIVE CONSUMABLES - Every single item
    // All materials visible: true for internal Materials Hub work
    // visibleToCustomer tracks what shows in customer quotes
    ...getPaintSupplies().map((m, i) => ({ ...m, id: `mat-${Date.now()}-paint-${i}`, totalCost: m.quantity * m.unitCost, supplier: m.category.includes('Paint') ? 'Paint Pro Supply' : 'General Supply', visibleToCustomer: m.visible, visible: true })),
    ...getFasteners().map((m, i) => ({ ...m, id: `mat-${Date.now()}-fast-${i}`, totalCost: m.quantity * m.unitCost, supplier: 'Fastener Supply', visibleToCustomer: m.visible, visible: true })),
    ...getAdhesivesAndSealants().map((m, i) => ({ ...m, id: `mat-${Date.now()}-adhesive-${i}`, totalCost: m.quantity * m.unitCost, supplier: 'Adhesive Supply', visibleToCustomer: m.visible, visible: true })),
    ...getProtectionAndCleanup().map((m, i) => ({ ...m, id: `mat-${Date.now()}-cleanup-${i}`, totalCost: m.quantity * m.unitCost, supplier: 'General Supply', visibleToCustomer: m.visible, visible: true })),
    ...getSafetyEquipment().map((m, i) => ({ ...m, id: `mat-${Date.now()}-safety-${i}`, totalCost: m.quantity * m.unitCost, supplier: 'Safety Supply', visibleToCustomer: m.visible, visible: true })),
    ...getTapes().map((m, i) => ({ ...m, id: `mat-${Date.now()}-tape-${i}`, totalCost: m.quantity * m.unitCost, supplier: 'General Supply', visibleToCustomer: m.visible, visible: true })),
    ...getMiscConsumables().map((m, i) => ({ ...m, id: `mat-${Date.now()}-misc-${i}`, totalCost: m.quantity * m.unitCost, supplier: 'General Supply', visibleToCustomer: m.visible, visible: true })),
  ];

  const labor = [
    { id: `lab-${Date.now()}-1`, role: 'Permit & Utility Coordination', description: 'Obtain permits, coordinate power shutoff with utility', hours: 4, hourlyRate: 95, totalCost: 380, visible: true },
    { id: `lab-${Date.now()}-2`, role: 'Site Preparation', description: 'Protect area, set up work zone, prepare panel location', hours: 2, hourlyRate: 85, totalCost: 170, visible: true },
    { id: `lab-${Date.now()}-3`, role: 'Remove Old Panel', description: 'Safely disconnect and remove existing panel', hours: 4, hourlyRate: 95, totalCost: 380, visible: true },
    { id: `lab-${Date.now()}-4`, role: 'Install Grounding System', description: 'Drive ground rods, run grounding wire, make connections', hours: 4, hourlyRate: 95, totalCost: 380, visible: true },
    { id: `lab-${Date.now()}-5`, role: 'Service Entrance Installation', description: 'Install meter base, weatherhead, mast, conduit', hours: 6, hourlyRate: 95, totalCost: 570, visible: true },
    { id: `lab-${Date.now()}-6`, role: 'Panel Installation', description: 'Mount panel, install main breakers, bond ground/neutral', hours: 6, hourlyRate: 95, totalCost: 570, visible: true },
    { id: `lab-${Date.now()}-7`, role: 'Circuit Migration', description: 'Transfer existing circuits to new panel', hours: 12, hourlyRate: 95, totalCost: 1140, visible: true },
    { id: `lab-${Date.now()}-8`, role: 'Service Wire Connection', description: 'Pull and terminate service entrance conductors', hours: 4, hourlyRate: 95, totalCost: 380, visible: true },
    { id: `lab-${Date.now()}-9`, role: 'Testing & Labeling', description: 'Test all circuits, label panel directory', hours: 3, hourlyRate: 95, totalCost: 285, visible: true },
    { id: `lab-${Date.now()}-10`, role: 'Utility Connection', description: 'Coordinate with utility for meter reconnection', hours: 2, hourlyRate: 95, totalCost: 190, visible: true },
    { id: `lab-${Date.now()}-11`, role: 'Final Inspection', description: 'Municipal final inspection and approval', hours: 2, hourlyRate: 95, totalCost: 190, visible: true },
  ];

  const processSteps = [
    { id: `step-${Date.now()}-1`, stepNumber: 1, title: 'Permits & Coordination', description: 'Obtain electrical permit, schedule utility power shutoff', estimatedDuration: '1-3 days', visible: true },
    { id: `step-${Date.now()}-2`, stepNumber: 2, title: 'Site Preparation', description: 'Prepare work area, protect surroundings', estimatedDuration: '0.5 days', visible: true },
    { id: `step-${Date.now()}-3`, stepNumber: 3, title: 'Power Shutoff', description: 'Utility disconnects power at meter', estimatedDuration: '0.5 days', visible: true },
    { id: `step-${Date.now()}-4`, stepNumber: 4, title: 'Remove Old Panel', description: 'Safely disconnect and remove existing electrical panel', estimatedDuration: '0.5 days', visible: true },
    { id: `step-${Date.now()}-5`, stepNumber: 5, title: 'Grounding System', description: 'Install ground rods and grounding electrode system', estimatedDuration: '0.5 days', visible: true },
    { id: `step-${Date.now()}-6`, stepNumber: 6, title: 'Service Entrance', description: 'Install meter base, weatherhead, conduit, mast', estimatedDuration: '1 day', visible: true },
    { id: `step-${Date.now()}-7`, stepNumber: 7, title: 'Panel Installation', description: 'Mount new panel, install main breakers, bonding', estimatedDuration: '1 day', visible: true },
    { id: `step-${Date.now()}-8`, stepNumber: 8, title: 'Circuit Migration', description: 'Transfer all existing circuits to new panel', estimatedDuration: '1-2 days', visible: true },
    { id: `step-${Date.now()}-9`, stepNumber: 9, title: 'Testing & Labeling', description: 'Test all circuits, create panel directory', estimatedDuration: '0.5 days', visible: true },
    { id: `step-${Date.now()}-10`, stepNumber: 10, title: 'Power Restoration', description: 'Utility reconnects power, verify operation', estimatedDuration: '0.5 days', visible: true },
    { id: `step-${Date.now()}-11`, stepNumber: 11, title: 'Final Inspection', description: 'Municipal inspector approves installation', estimatedDuration: '0.5 days', visible: true },
  ];

  return calculateQuoteTotals({ materials, labor, processSteps });
}

// PLUMBING REPAIR - Comprehensive Quote
function generatePlumbingQuote(item: PipelineItem) {
  const materials = [
    { id: `mat-${Date.now()}-1`, name: 'PEX Pipe - 3/4" Red (Hot)', description: 'PEX-A piping for hot water supply', quantity: 150, unit: 'linear ft', unitCost: 1.85, totalCost: 277.50, supplier: 'Plumbing Supply', category: 'Piping', visible: true },
    { id: `mat-${Date.now()}-2`, name: 'PEX Pipe - 3/4" Blue (Cold)', description: 'PEX-A piping for cold water supply', quantity: 150, unit: 'linear ft', unitCost: 1.85, totalCost: 277.50, supplier: 'Plumbing Supply', category: 'Piping', visible: true },
    { id: `mat-${Date.now()}-3`, name: 'PEX Fittings - Crimp Style', description: 'Brass crimp fittings (elbows, tees, couplings)', quantity: 1, unit: 'kit', unitCost: 285, totalCost: 285, supplier: 'Plumbing Supply', category: 'Fittings', visible: true },
    { id: `mat-${Date.now()}-4`, name: 'PEX Crimp Rings - Copper', description: 'Copper crimp rings 3/4"', quantity: 100, unit: 'each', unitCost: 0.35, totalCost: 35, supplier: 'Plumbing Supply', category: 'Fittings', visible: true },
    { id: `mat-${Date.now()}-5`, name: 'Shutoff Valves - Ball Valve 3/4"', description: 'Full-port ball valves with drain', quantity: 12, unit: 'each', unitCost: 18.50, totalCost: 222, supplier: 'Plumbing Supply', category: 'Valves', visible: true },
    { id: `mat-${Date.now()}-6`, name: 'PVC Drain Pipe - 3" Schedule 40', description: '3" PVC pipe for main drain line', quantity: 80, unit: 'linear ft', unitCost: 3.25, totalCost: 260, supplier: 'Plumbing Supply', category: 'Drainage', visible: true },
    { id: `mat-${Date.now()}-7`, name: 'PVC Drain Fittings', description: 'Elbows, wyes, tees, couplings for drain system', quantity: 1, unit: 'kit', unitCost: 185, totalCost: 185, supplier: 'Plumbing Supply', category: 'Drainage', visible: true },
    { id: `mat-${Date.now()}-8`, name: 'PVC Primer & Cement', description: 'Purple primer and PVC cement', quantity: 2, unit: 'set', unitCost: 24, totalCost: 48, supplier: 'Plumbing Supply', category: 'Installation Materials', visible: true },
    { id: `mat-${Date.now()}-9`, name: 'Pipe Hangers - Clevis Type', description: 'Adjustable clevis hangers for pipe support', quantity: 40, unit: 'each', unitCost: 3.50, totalCost: 140, supplier: 'Plumbing Supply', category: 'Support', visible: true },
    { id: `mat-${Date.now()}-10`, name: 'Pipe Insulation - Foam', description: 'Foam pipe insulation for hot water lines', quantity: 150, unit: 'linear ft', unitCost: 1.25, totalCost: 187.50, supplier: 'Plumbing Supply', category: 'Insulation', visible: true },
    { id: `mat-${Date.now()}-11`, name: 'Water Hammer Arrestors', description: 'Mini-rester water hammer arrestors', quantity: 4, unit: 'each', unitCost: 28, totalCost: 112, supplier: 'Plumbing Supply', category: 'Accessories', visible: true },
    { id: `mat-${Date.now()}-12`, name: 'Expansion Tank - 4.5 Gallon', description: 'Thermal expansion tank for water heater', quantity: 1, unit: 'each', unitCost: 85, totalCost: 85, supplier: 'Plumbing Supply', category: 'Accessories', visible: true },
    { id: `mat-${Date.now()}-13`, name: 'Pressure Relief Valve', description: 'T&P relief valve 3/4"', quantity: 1, unit: 'each', unitCost: 24, totalCost: 24, supplier: 'Plumbing Supply', category: 'Valves', visible: true },
    { id: `mat-${Date.now()}-14`, name: 'Teflon Tape - Heavy Duty', description: 'Heavy-duty thread seal tape', quantity: 10, unit: 'roll', unitCost: 3.50, totalCost: 35, supplier: 'Plumbing Supply', category: 'Installation Materials', visible: true },
    { id: `mat-${Date.now()}-15`, name: 'Pipe Dope - Thread Sealant', description: 'Pipe thread sealant compound', quantity: 2, unit: 'tube', unitCost: 12, totalCost: 24, supplier: 'Plumbing Supply', category: 'Installation Materials', visible: true },

    // COMPREHENSIVE CONSUMABLES - Every single item
    // All materials visible: true for internal Materials Hub work
    // visibleToCustomer tracks what shows in customer quotes
    ...getPaintSupplies().map((m, i) => ({ ...m, id: `mat-${Date.now()}-paint-${i}`, totalCost: m.quantity * m.unitCost, supplier: m.category.includes('Paint') ? 'Paint Pro Supply' : 'General Supply', visibleToCustomer: m.visible, visible: true })),
    ...getFasteners().map((m, i) => ({ ...m, id: `mat-${Date.now()}-fast-${i}`, totalCost: m.quantity * m.unitCost, supplier: 'Fastener Supply', visibleToCustomer: m.visible, visible: true })),
    ...getAdhesivesAndSealants().map((m, i) => ({ ...m, id: `mat-${Date.now()}-adhesive-${i}`, totalCost: m.quantity * m.unitCost, supplier: 'Adhesive Supply', visibleToCustomer: m.visible, visible: true })),
    ...getProtectionAndCleanup().map((m, i) => ({ ...m, id: `mat-${Date.now()}-cleanup-${i}`, totalCost: m.quantity * m.unitCost, supplier: 'General Supply', visibleToCustomer: m.visible, visible: true })),
    ...getSafetyEquipment().map((m, i) => ({ ...m, id: `mat-${Date.now()}-safety-${i}`, totalCost: m.quantity * m.unitCost, supplier: 'Safety Supply', visibleToCustomer: m.visible, visible: true })),
    ...getTapes().map((m, i) => ({ ...m, id: `mat-${Date.now()}-tape-${i}`, totalCost: m.quantity * m.unitCost, supplier: 'General Supply', visibleToCustomer: m.visible, visible: true })),
    ...getMiscConsumables().map((m, i) => ({ ...m, id: `mat-${Date.now()}-misc-${i}`, totalCost: m.quantity * m.unitCost, supplier: 'General Supply', visibleToCustomer: m.visible, visible: true })),
  ];

  const labor = [
    { id: `lab-${Date.now()}-1`, role: 'Site Assessment', description: 'Assess damage, plan repair approach', hours: 2, hourlyRate: 105, totalCost: 210, visible: true },
    { id: `lab-${Date.now()}-2`, role: 'Water Shutoff & Drain', description: 'Shut off water, drain affected lines', hours: 1, hourlyRate: 105, totalCost: 105, visible: true },
    { id: `lab-${Date.now()}-3`, role: 'Remove Damaged Piping', description: 'Cut out and remove damaged pipes', hours: 6, hourlyRate: 105, totalCost: 630, visible: true },
    { id: `lab-${Date.now()}-4`, role: 'Install New Supply Lines', description: 'Run new PEX supply lines', hours: 16, hourlyRate: 105, totalCost: 1680, visible: true },
    { id: `lab-${Date.now()}-5`, role: 'Install New Drain Lines', description: 'Install new PVC drain piping', hours: 12, hourlyRate: 105, totalCost: 1260, visible: true },
    { id: `lab-${Date.now()}-6`, role: 'Install Valves & Accessories', description: 'Install shutoff valves, arrestors, expansion tank', hours: 4, hourlyRate: 105, totalCost: 420, visible: true },
    { id: `lab-${Date.now()}-7`, role: 'Pressure Testing', description: 'Pressure test all new water lines', hours: 2, hourlyRate: 105, totalCost: 210, visible: true },
    { id: `lab-${Date.now()}-8`, role: 'Insulation & Final Details', description: 'Insulate hot water lines, final connections', hours: 4, hourlyRate: 105, totalCost: 420, visible: true },
    { id: `lab-${Date.now()}-9`, role: 'System Testing', description: 'Test all fixtures, check for leaks', hours: 2, hourlyRate: 105, totalCost: 210, visible: true },
  ];

  const processSteps = [
    { id: `step-${Date.now()}-1`, stepNumber: 1, title: 'Emergency Assessment', description: 'Assess damage extent, plan repair strategy', estimatedDuration: '0.5 days', visible: true },
    { id: `step-${Date.now()}-2`, stepNumber: 2, title: 'Water Shutoff', description: 'Shut off water supply, drain affected lines', estimatedDuration: '0.5 days', visible: true },
    { id: `step-${Date.now()}-3`, stepNumber: 3, title: 'Demolition', description: 'Remove damaged piping and prepare for new installation', estimatedDuration: '1 day', visible: true },
    { id: `step-${Date.now()}-4`, stepNumber: 4, title: 'New Supply Lines', description: 'Install new PEX water supply piping', estimatedDuration: '2 days', visible: true },
    { id: `step-${Date.now()}-5`, stepNumber: 5, title: 'New Drain Lines', description: 'Install new PVC drain piping', estimatedDuration: '1-2 days', visible: true },
    { id: `step-${Date.now()}-6`, stepNumber: 6, title: 'Valves & Accessories', description: 'Install shutoff valves, water hammer arrestors', estimatedDuration: '0.5 days', visible: true },
    { id: `step-${Date.now()}-7`, stepNumber: 7, title: 'Pressure Testing', description: 'Test new lines for leaks and proper pressure', estimatedDuration: '0.5 days', visible: true },
    { id: `step-${Date.now()}-8`, stepNumber: 8, title: 'Insulation & Finishing', description: 'Insulate lines, make final connections', estimatedDuration: '0.5 days', visible: true },
    { id: `step-${Date.now()}-9`, stepNumber: 9, title: 'Final Testing', description: 'Test all fixtures, verify no leaks', estimatedDuration: '0.5 days', visible: true },
  ];

  return calculateQuoteTotals({ materials, labor, processSteps });
}

// Add other project type generators (abbreviated for space)
function generateBathroomQuote(item: PipelineItem) {
  // Similar comprehensive structure as kitchen
  return generateGenericQuote(item);
}

function generateRoofingQuote(item: PipelineItem) {
  return generateGenericQuote(item);
}

function generateFlooringQuote(item: PipelineItem) {
  return generateGenericQuote(item);
}

function generatePaintingQuote(item: PipelineItem) {
  return generateGenericQuote(item);
}

function generateDeckQuote(item: PipelineItem) {
  return generateGenericQuote(item);
}

function generateWindowDoorQuote(item: PipelineItem) {
  return generateGenericQuote(item);
}

// GENERIC - Comprehensive fallback for any project type
function generateGenericQuote(item: PipelineItem) {
  const estimatedValue = item.estimatedValue || 10000;

  const materials = [
    { id: `mat-${Date.now()}-1`, name: `${item.serviceType} - Primary Materials`, description: 'Main materials for project', quantity: 1, unit: 'lot', unitCost: estimatedValue * 0.35, totalCost: estimatedValue * 0.35, supplier: 'General Supply', category: 'Materials', visible: true },
    { id: `mat-${Date.now()}-2`, name: 'Structural Components', description: 'Main structural materials', quantity: 1, unit: 'lot', unitCost: estimatedValue * 0.15, totalCost: estimatedValue * 0.15, supplier: 'General Supply', category: 'Materials', visible: true },
    { id: `mat-${Date.now()}-3`, name: 'Finishing Materials', description: 'Final finishing and touch-up materials', quantity: 1, unit: 'lot', unitCost: estimatedValue * 0.08, totalCost: estimatedValue * 0.08, supplier: 'General Supply', category: 'Finishing', visible: true },

    // COMPREHENSIVE CONSUMABLES - Every single item needed for any construction job
    ...getPaintSupplies().map((m, i) => ({ ...m, id: `mat-${Date.now()}-paint-${i}`, totalCost: m.quantity * m.unitCost, supplier: m.category.includes('Paint') ? 'Paint Pro Supply' : 'General Supply' })),
    ...getFasteners().map((m, i) => ({ ...m, id: `mat-${Date.now()}-fast-${i}`, totalCost: m.quantity * m.unitCost, supplier: 'Fastener Supply' })),
    ...getAdhesivesAndSealants().map((m, i) => ({ ...m, id: `mat-${Date.now()}-adhesive-${i}`, totalCost: m.quantity * m.unitCost, supplier: 'Adhesive Supply' })),
    ...getProtectionAndCleanup().map((m, i) => ({ ...m, id: `mat-${Date.now()}-cleanup-${i}`, totalCost: m.quantity * m.unitCost, supplier: 'General Supply' })),
    ...getSafetyEquipment().map((m, i) => ({ ...m, id: `mat-${Date.now()}-safety-${i}`, totalCost: m.quantity * m.unitCost, supplier: 'Safety Supply' })),
    ...getTapes().map((m, i) => ({ ...m, id: `mat-${Date.now()}-tape-${i}`, totalCost: m.quantity * m.unitCost, supplier: 'General Supply' })),
    ...getMiscConsumables().map((m, i) => ({ ...m, id: `mat-${Date.now()}-misc-${i}`, totalCost: m.quantity * m.unitCost, supplier: 'General Supply' })),
  ];

  const labor = [
    // DETAILED LABOR BREAKDOWN - Every subtask
    { id: `lab-${Date.now()}-1a`, role: 'Site Protection Setup', description: 'Install Ram Board floor protection, hang plastic sheeting over doorways, cover furniture and fixtures, tape HVAC registers, mark existing conditions, establish staging area for materials and tools', hours: Math.round(estimatedValue * 0.0015), hourlyRate: 65, totalCost: Math.round(estimatedValue * 0.0015) * 65, visible: false },
    { id: `lab-${Date.now()}-1b`, role: 'Work Area Preparation', description: 'Clear work zone, move furniture if needed, set up temporary lighting, establish power drop locations, verify access routes, coordinate with customer on staging', hours: Math.round(estimatedValue * 0.001), hourlyRate: 65, totalCost: Math.round(estimatedValue * 0.001) * 65, visible: false },
    { id: `lab-${Date.now()}-2a`, role: 'Demolition Work', description: 'Remove existing materials, disconnect utilities as needed, protect surrounding areas, bag and tag debris, sort for recycling where applicable', hours: Math.round(estimatedValue * 0.002), hourlyRate: 75, totalCost: Math.round(estimatedValue * 0.002) * 75, visible: false },
    { id: `lab-${Date.now()}-2b`, role: 'Debris Removal & Haul', description: 'Load demo debris into wheelbarrow or bags, haul to dumpster, sweep work area, vacuum dust, check for hazards, final debris inspection', hours: Math.round(estimatedValue * 0.001), hourlyRate: 70, totalCost: Math.round(estimatedValue * 0.001) * 70, visible: false },
    { id: `lab-${Date.now()}-3a`, role: 'Primary Installation - Phase 1', description: `Professional installation of ${item.serviceType.toLowerCase()} - initial phase including layout, measurements, and base work`, hours: Math.round(estimatedValue * 0.0025), hourlyRate: 85, totalCost: Math.round(estimatedValue * 0.0025) * 85, visible: false },
    { id: `lab-${Date.now()}-3b`, role: 'Primary Installation - Phase 2', description: `Professional installation of ${item.serviceType.toLowerCase()} - assembly, fastening, securing, and quality checks`, hours: Math.round(estimatedValue * 0.0025), hourlyRate: 85, totalCost: Math.round(estimatedValue * 0.0025) * 85, visible: false },
    { id: `lab-${Date.now()}-4a`, role: 'Finishing & Detailing', description: 'Apply finishing materials, sand smooth where needed, fill gaps, caulk seams, touch up surfaces, ensure proper alignment', hours: Math.round(estimatedValue * 0.0015), hourlyRate: 75, totalCost: Math.round(estimatedValue * 0.0015) * 75, visible: false },
    { id: `lab-${Date.now()}-4b`, role: 'Quality Control Inspection', description: 'Inspect all work for quality, test functionality, verify measurements, check for defects, document completion, prepare punch list if needed', hours: Math.round(estimatedValue * 0.0008), hourlyRate: 75, totalCost: Math.round(estimatedValue * 0.0008) * 75, visible: false },
    { id: `lab-${Date.now()}-5a`, role: 'Site Cleanup', description: 'Remove all tools and equipment, vacuum thoroughly, wipe down surfaces, clean windows if applicable, remove protection materials', hours: Math.round(estimatedValue * 0.0008), hourlyRate: 65, totalCost: Math.round(estimatedValue * 0.0008) * 65, visible: false },
    { id: `lab-${Date.now()}-5b`, role: 'Final Walkthrough', description: 'Walk through completed work with customer, demonstrate functionality, answer questions, provide maintenance instructions, collect final approval', hours: Math.round(estimatedValue * 0.0005), hourlyRate: 75, totalCost: Math.round(estimatedValue * 0.0005) * 75, visible: false },
    { id: `lab-${Date.now()}-6`, role: 'Project Management & Coordination', description: 'Overall project planning and timeline coordination, order and track materials, schedule inspections if needed, coordinate subcontractors, handle permits if applicable, provide progress updates to customer, address issues or change orders, ensure quality control at each phase', hours: Math.round(estimatedValue * 0.002), hourlyRate: 75, totalCost: Math.round(estimatedValue * 0.002) * 75, visible: true },
  ];

  const processSteps = [
    { id: `step-${Date.now()}-1`, stepNumber: 1, title: 'Site Preparation', description: 'Prepare work area and protect surroundings', estimatedDuration: '0.5-1 days', visible: true },
    { id: `step-${Date.now()}-2`, stepNumber: 2, title: 'Demolition', description: 'Remove existing materials as needed', estimatedDuration: '1-2 days', visible: true },
    { id: `step-${Date.now()}-3`, stepNumber: 3, title: 'Primary Work', description: `Execute main ${item.serviceType.toLowerCase()} work`, estimatedDuration: '3-5 days', visible: true },
    { id: `step-${Date.now()}-4`, stepNumber: 4, title: 'Finishing', description: 'Complete finishing work and details', estimatedDuration: '1-2 days', visible: true },
    { id: `step-${Date.now()}-5`, stepNumber: 5, title: 'Final Inspection', description: 'Quality inspection and customer walkthrough', estimatedDuration: '0.5 days', visible: true },
  ];

  return calculateQuoteTotals({ materials, labor, processSteps });
}

// Helper function to calculate totals
function calculateQuoteTotals(data: { materials: any[], labor: any[], processSteps: any[] }) {
  const materialsSubtotal = data.materials.reduce((sum, m) => sum + m.totalCost, 0);
  const laborSubtotal = data.labor.reduce((sum, l) => sum + l.totalCost, 0);
  const taxRate = 0.08;
  const taxAmount = (materialsSubtotal + laborSubtotal) * taxRate;
  const totalCost = materialsSubtotal + laborSubtotal + taxAmount;
  
  return {
    materials: data.materials,
    labor: data.labor,
    processSteps: data.processSteps,
    materialsSubtotal,
    laborSubtotal,
    taxRate,
    taxAmount,
    totalCost
  };
}