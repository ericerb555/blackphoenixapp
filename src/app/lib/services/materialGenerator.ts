/**
 * Comprehensive Material Generator
 * Generates detailed, realistic materials lists based on project scope
 */

interface LineItem {
  id: string;
  type: 'labor' | 'material';
  description: string;
  quantity: number;
  unit: string;
  hours?: number;
  unitPrice: number;
  total: number;
}

export function generateComprehensiveMaterials(workRequestData: any): LineItem[] {
  const materials: LineItem[] = [];
  let materialIndex = 0;
  
  const projectScope = workRequestData?.description?.toLowerCase() || '';
  const jobType = workRequestData?.projectType?.toLowerCase() || '';
  const requestedMaterials = workRequestData?.materials || [];
  
  // Detect project types
  const isKitchen = projectScope.includes('kitchen') || requestedMaterials.some((m: string) => 
    m.toLowerCase().includes('cabinet') || m.toLowerCase().includes('counter'));
  const isBathroom = projectScope.includes('bathroom') || projectScope.includes('bath');
  const isElectrical = projectScope.includes('electrical') || projectScope.includes('wiring') || 
    requestedMaterials.some((m: string) => m.toLowerCase().includes('electric'));
  const isPlumbing = projectScope.includes('plumbing') || projectScope.includes('pipe') || 
    requestedMaterials.some((m: string) => m.toLowerCase().includes('plumb'));
  const isHVAC = projectScope.includes('hvac') || projectScope.includes('air condition') || 
    projectScope.includes('heating');
  const isFraming = projectScope.includes('framing') || projectScope.includes('wall') || 
    projectScope.includes('addition');
  const isFlooring = projectScope.includes('floor') || requestedMaterials.some((m: string) => 
    m.toLowerCase().includes('floor'));
  const isRoofing = projectScope.includes('roof');
  const isPainting = projectScope.includes('paint');
  
  // KITCHEN MATERIALS
  if (isKitchen) {
    materials.push(
      { id: `material-${materialIndex++}`, type: 'material', description: 'Kitchen Base Cabinets (Set of 6)', quantity: 1, unit: 'set', unitPrice: 4500, total: 4500 },
      { id: `material-${materialIndex++}`, type: 'material', description: 'Kitchen Wall Cabinets (Set of 4)', quantity: 1, unit: 'set', unitPrice: 2800, total: 2800 },
      { id: `material-${materialIndex++}`, type: 'material', description: 'Pantry Cabinet - 84" Tall', quantity: 1, unit: 'unit', unitPrice: 1200, total: 1200 },
      { id: `material-${materialIndex++}`, type: 'material', description: 'Granite Countertops - Installed', quantity: 45, unit: 'sq ft', unitPrice: 85, total: 3825 },
      { id: `material-${materialIndex++}`, type: 'material', description: 'Undermount Kitchen Sink - Stainless Steel', quantity: 1, unit: 'unit', unitPrice: 350, total: 350 },
      { id: `material-${materialIndex++}`, type: 'material', description: 'Kitchen Faucet - Pull-Down Sprayer', quantity: 1, unit: 'unit', unitPrice: 285, total: 285 },
      { id: `material-${materialIndex++}`, type: 'material', description: 'Cabinet Hardware Kit - Handles & Hinges', quantity: 1, unit: 'kit', unitPrice: 425, total: 425 },
      { id: `material-${materialIndex++}`, type: 'material', description: 'Backsplash Tile - Subway Style', quantity: 60, unit: 'sq ft', unitPrice: 12, total: 720 },
      { id: `material-${materialIndex++}`, type: 'material', description: 'Tile Adhesive & Grout', quantity: 3, unit: 'box', unitPrice: 45, total: 135 },
      { id: `material-${materialIndex++}`, type: 'material', description: 'Under-Cabinet LED Lighting Kit', quantity: 1, unit: 'kit', unitPrice: 380, total: 380 }
    );
  }
  
  // BATHROOM MATERIALS
  if (isBathroom) {
    materials.push(
      { id: `material-${materialIndex++}`, type: 'material', description: 'Vanity Cabinet with Top - 36"', quantity: 1, unit: 'unit', unitPrice: 850, total: 850 },
      { id: `material-${materialIndex++}`, type: 'material', description: 'Toilet - Dual Flush Low Flow', quantity: 1, unit: 'unit', unitPrice: 320, total: 320 },
      { id: `material-${materialIndex++}`, type: 'material', description: 'Shower Base - 36" x 48"', quantity: 1, unit: 'unit', unitPrice: 450, total: 450 },
      { id: `material-${materialIndex++}`, type: 'material', description: 'Shower Walls - Acrylic Panels', quantity: 1, unit: 'set', unitPrice: 680, total: 680 },
      { id: `material-${materialIndex++}`, type: 'material', description: 'Shower Door - Frameless Glass', quantity: 1, unit: 'unit', unitPrice: 750, total: 750 },
      { id: `material-${materialIndex++}`, type: 'material', description: 'Shower Valve & Trim Kit - Chrome', quantity: 1, unit: 'kit', unitPrice: 285, total: 285 },
      { id: `material-${materialIndex++}`, type: 'material', description: 'Bathroom Faucet - Widespread', quantity: 1, unit: 'unit', unitPrice: 185, total: 185 },
      { id: `material-${materialIndex++}`, type: 'material', description: 'Ceramic Floor Tile - 12" x 24"', quantity: 80, unit: 'sq ft', unitPrice: 8, total: 640 },
      { id: `material-${materialIndex++}`, type: 'material', description: 'Bathroom Exhaust Fan with Light', quantity: 1, unit: 'unit', unitPrice: 165, total: 165 },
      { id: `material-${materialIndex++}`, type: 'material', description: 'Vanity Mirror - Framed 36"', quantity: 1, unit: 'unit', unitPrice: 125, total: 125 },
      { id: `material-${materialIndex++}`, type: 'material', description: 'Towel Bars & Accessories Set', quantity: 1, unit: 'set', unitPrice: 95, total: 95 }
    );
  }
  
  // ELECTRICAL MATERIALS
  if (isElectrical) {
    materials.push(
      { id: `material-${materialIndex++}`, type: 'material', description: 'Electrical Panel - 200 Amp', quantity: 1, unit: 'unit', unitPrice: 850, total: 850 },
      { id: `material-${materialIndex++}`, type: 'material', description: 'Circuit Breakers - Assorted', quantity: 12, unit: 'unit', unitPrice: 28, total: 336 },
      { id: `material-${materialIndex++}`, type: 'material', description: 'Romex Wire 12/2 - 250ft Roll', quantity: 3, unit: 'roll', unitPrice: 125, total: 375 },
      { id: `material-${materialIndex++}`, type: 'material', description: 'Romex Wire 14/2 - 250ft Roll', quantity: 2, unit: 'roll', unitPrice: 95, total: 190 },
      { id: `material-${materialIndex++}`, type: 'material', description: 'Electrical Boxes - Plastic', quantity: 24, unit: 'unit', unitPrice: 3.5, total: 84 },
      { id: `material-${materialIndex++}`, type: 'material', description: 'Outlets & Switches - Decorator Style', quantity: 20, unit: 'unit', unitPrice: 8, total: 160 },
      { id: `material-${materialIndex++}`, type: 'material', description: 'Wall Plates - White', quantity: 20, unit: 'unit', unitPrice: 2.5, total: 50 },
      { id: `material-${materialIndex++}`, type: 'material', description: 'GFCI Outlets - 20 Amp', quantity: 4, unit: 'unit', unitPrice: 18, total: 72 },
      { id: `material-${materialIndex++}`, type: 'material', description: 'Wire Connectors - Assorted Pack', quantity: 2, unit: 'box', unitPrice: 15, total: 30 },
      { id: `material-${materialIndex++}`, type: 'material', description: 'Conduit & Fittings', quantity: 1, unit: 'lot', unitPrice: 250, total: 250 }
    );
  }
  
  // PLUMBING MATERIALS
  if (isPlumbing) {
    materials.push(
      { id: `material-${materialIndex++}`, type: 'material', description: 'PEX Piping - 1/2" x 100ft', quantity: 3, unit: 'roll', unitPrice: 85, total: 255 },
      { id: `material-${materialIndex++}`, type: 'material', description: 'PEX Piping - 3/4" x 100ft', quantity: 2, unit: 'roll', unitPrice: 125, total: 250 },
      { id: `material-${materialIndex++}`, type: 'material', description: 'PEX Fittings & Connectors Kit', quantity: 1, unit: 'kit', unitPrice: 185, total: 185 },
      { id: `material-${materialIndex++}`, type: 'material', description: 'Shut-Off Valves - Assorted', quantity: 8, unit: 'unit', unitPrice: 12, total: 96 },
      { id: `material-${materialIndex++}`, type: 'material', description: 'PVC Drain Pipe - 2" x 10ft', quantity: 6, unit: 'unit', unitPrice: 18, total: 108 },
      { id: `material-${materialIndex++}`, type: 'material', description: 'PVC Drain Pipe - 3" x 10ft', quantity: 4, unit: 'unit', unitPrice: 24, total: 96 },
      { id: `material-${materialIndex++}`, type: 'material', description: 'PVC Fittings - Elbows, Tees, Couplings', quantity: 1, unit: 'lot', unitPrice: 145, total: 145 },
      { id: `material-${materialIndex++}`, type: 'material', description: 'PVC Cement & Primer', quantity: 2, unit: 'set', unitPrice: 22, total: 44 },
      { id: `material-${materialIndex++}`, type: 'material', description: 'Water Heater - 50 Gallon', quantity: 1, unit: 'unit', unitPrice: 850, total: 850 },
      { id: `material-${materialIndex++}`, type: 'material', description: 'Water Heater Installation Kit', quantity: 1, unit: 'kit', unitPrice: 95, total: 95 }
    );
  }
  
  // FRAMING MATERIALS
  if (isFraming) {
    materials.push(
      { id: `material-${materialIndex++}`, type: 'material', description: '2x4 Lumber - 8ft Studs', quantity: 100, unit: 'piece', unitPrice: 6.5, total: 650 },
      { id: `material-${materialIndex++}`, type: 'material', description: '2x6 Lumber - 8ft', quantity: 40, unit: 'piece', unitPrice: 9.5, total: 380 },
      { id: `material-${materialIndex++}`, type: 'material', description: '2x10 Headers - 12ft', quantity: 8, unit: 'piece', unitPrice: 28, total: 224 },
      { id: `material-${materialIndex++}`, type: 'material', description: 'Plywood - 3/4" x 4x8 Sheets', quantity: 20, unit: 'sheet', unitPrice: 52, total: 1040 },
      { id: `material-${materialIndex++}`, type: 'material', description: 'OSB - 7/16" x 4x8 Sheets', quantity: 15, unit: 'sheet', unitPrice: 32, total: 480 },
      { id: `material-${materialIndex++}`, type: 'material', description: 'Framing Nails - 50lb Box', quantity: 2, unit: 'box', unitPrice: 85, total: 170 },
      { id: `material-${materialIndex++}`, type: 'material', description: 'Metal Framing Brackets & Hangers', quantity: 1, unit: 'lot', unitPrice: 250, total: 250 },
      { id: `material-${materialIndex++}`, type: 'material', description: 'Drywall - 1/2" x 4x8 Sheets', quantity: 30, unit: 'sheet', unitPrice: 14, total: 420 },
      { id: `material-${materialIndex++}`, type: 'material', description: 'Drywall Screws - 5lb Box', quantity: 3, unit: 'box', unitPrice: 18, total: 54 },
      { id: `material-${materialIndex++}`, type: 'material', description: 'Joint Compound - 5 Gallon Bucket', quantity: 4, unit: 'bucket', unitPrice: 24, total: 96 },
      { id: `material-${materialIndex++}`, type: 'material', description: 'Drywall Tape - Paper', quantity: 6, unit: 'roll', unitPrice: 8, total: 48 },
      { id: `material-${materialIndex++}`, type: 'material', description: 'Insulation - R-19 Batts', quantity: 20, unit: 'bundle', unitPrice: 45, total: 900 }
    );
  }
  
  // FLOORING MATERIALS
  if (isFlooring) {
    materials.push(
      { id: `material-${materialIndex++}`, type: 'material', description: 'Hardwood Flooring - Oak 3/4" x 3.25"', quantity: 500, unit: 'sq ft', unitPrice: 6.5, total: 3250 },
      { id: `material-${materialIndex++}`, type: 'material', description: 'Floor Underlayment', quantity: 500, unit: 'sq ft', unitPrice: 0.75, total: 375 },
      { id: `material-${materialIndex++}`, type: 'material', description: 'Flooring Adhesive - 4 Gallon', quantity: 3, unit: 'bucket', unitPrice: 85, total: 255 },
      { id: `material-${materialIndex++}`, type: 'material', description: 'Baseboards - Primed MDF', quantity: 200, unit: 'linear ft', unitPrice: 1.25, total: 250 },
      { id: `material-${materialIndex++}`, type: 'material', description: 'Baseboard Trim - Quarter Round', quantity: 200, unit: 'linear ft', unitPrice: 0.85, total: 170 },
      { id: `material-${materialIndex++}`, type: 'material', description: 'Floor Finish - Polyurethane', quantity: 4, unit: 'gallon', unitPrice: 55, total: 220 }
    );
  }
  
  // HVAC MATERIALS
  if (isHVAC) {
    materials.push(
      { id: `material-${materialIndex++}`, type: 'material', description: 'Central AC Unit - 3 Ton', quantity: 1, unit: 'unit', unitPrice: 2850, total: 2850 },
      { id: `material-${materialIndex++}`, type: 'material', description: 'Air Handler Unit', quantity: 1, unit: 'unit', unitPrice: 1200, total: 1200 },
      { id: `material-${materialIndex++}`, type: 'material', description: 'Ductwork - Flexible Insulated', quantity: 150, unit: 'linear ft', unitPrice: 8, total: 1200 },
      { id: `material-${materialIndex++}`, type: 'material', description: 'Metal Duct - Rigid', quantity: 80, unit: 'linear ft', unitPrice: 12, total: 960 },
      { id: `material-${materialIndex++}`, type: 'material', description: 'Air Registers & Grilles', quantity: 12, unit: 'unit', unitPrice: 25, total: 300 },
      { id: `material-${materialIndex++}`, type: 'material', description: 'Refrigerant Line Set', quantity: 1, unit: 'set', unitPrice: 285, total: 285 },
      { id: `material-${materialIndex++}`, type: 'material', description: 'Thermostat - Programmable Smart', quantity: 1, unit: 'unit', unitPrice: 185, total: 185 }
    );
  }
  
  // ROOFING MATERIALS
  if (isRoofing) {
    materials.push(
      { id: `material-${materialIndex++}`, type: 'material', description: 'Asphalt Shingles - Architectural', quantity: 35, unit: 'bundle', unitPrice: 42, total: 1470 },
      { id: `material-${materialIndex++}`, type: 'material', description: 'Roofing Underlayment - Felt Paper', quantity: 4, unit: 'roll', unitPrice: 65, total: 260 },
      { id: `material-${materialIndex++}`, type: 'material', description: 'Drip Edge - Aluminum', quantity: 200, unit: 'linear ft', unitPrice: 2.5, total: 500 },
      { id: `material-${materialIndex++}`, type: 'material', description: 'Ridge Vent', quantity: 40, unit: 'linear ft', unitPrice: 5, total: 200 },
      { id: `material-${materialIndex++}`, type: 'material', description: 'Roofing Nails - 50lb Box', quantity: 2, unit: 'box', unitPrice: 75, total: 150 },
      { id: `material-${materialIndex++}`, type: 'material', description: 'Ice & Water Shield', quantity: 3, unit: 'roll', unitPrice: 85, total: 255 }
    );
  }
  
  // GENERAL CONSTRUCTION MATERIALS (always include)
  materials.push(
    { id: `material-${materialIndex++}`, type: 'material', description: 'Construction Adhesive - Tubes', quantity: 6, unit: 'tube', unitPrice: 8, total: 48 },
    { id: `material-${materialIndex++}`, type: 'material', description: 'Caulk - Silicone & Acrylic', quantity: 8, unit: 'tube', unitPrice: 6, total: 48 },
    { id: `material-${materialIndex++}`, type: 'material', description: 'Paint - Interior Premium', quantity: 5, unit: 'gallon', unitPrice: 45, total: 225 },
    { id: `material-${materialIndex++}`, type: 'material', description: 'Paint Primer - Interior', quantity: 3, unit: 'gallon', unitPrice: 32, total: 96 },
    { id: `material-${materialIndex++}`, type: 'material', description: 'Painting Supplies Kit', quantity: 1, unit: 'kit', unitPrice: 125, total: 125 },
    { id: `material-${materialIndex++}`, type: 'material', description: 'Drop Cloths & Tape', quantity: 1, unit: 'lot', unitPrice: 75, total: 75 },
    { id: `material-${materialIndex++}`, type: 'material', description: 'Misc Hardware & Fasteners', quantity: 1, unit: 'lot', unitPrice: 150, total: 150 },
    { id: `material-${materialIndex++}`, type: 'material', description: 'Safety Equipment & Supplies', quantity: 1, unit: 'lot', unitPrice: 85, total: 85 },
    { id: `material-${materialIndex++}`, type: 'material', description: 'Waste Disposal - Dumpster Rental', quantity: 1, unit: 'week', unitPrice: 450, total: 450 }
  );
  
  return materials;
}
