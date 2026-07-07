/**
 * Data Transformation Utilities
 * 
 * Functions to transform data between different module formats
 * and prepare data for database insertion/updates.
 */

import type {
  ArchitectureProject,
  ProjectSiteInfo,
  ProjectBuildingProgram,
  ProjectStylePreferences,
  ProjectRenderingRequirements,
  Quote,
  QuoteLineItem,
  Invoice,
  InvoiceLineItem,
  FloorPlan,
  KitchenLayout,
} from '../types/database.types';

// ============================================================================
// CLIENT WORK REQUEST FORM → DATABASE RECORDS
// ============================================================================

export interface ClientWorkRequestFormData {
  projectName: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  siteAddress: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  lotWidth: number;
  lotDepth: number;
  lotArea: number;
  lotShape: string;
  topography: string;
  orientation: string;
  existingStructures: string;
  zoningRestrictions: string;
  totalFloors: number;
  rooms: Array<{
    id: string;
    type: string;
    name: string;
    floor: number;
    minSqft: number;
    maxSqft: number;
    targetSqft: number;
    naturalLight: 'required' | 'preferred' | 'not_needed';
    adjacentTo: string[];
    features: string[];
    notes: string;
  }>;
  specialFeatures: string[];
  circulationStyle: string;
  accessibilityNeeds: string[];
  architecturalStyle: string;
  secondaryStyle: string;
  interiorStyle: string;
  colorPalette: string;
  colorPreferences: string[];
  flooringPreferences: string[];
  wallFinishes: string[];
  ceilingFinishes: string[];
  lightingStyle: string;
  naturalLightPriority: string;
  kitchenLayoutType: string;
  kitchenStyle: string;
  countertopMaterial: string;
  backsplashStyle: string;
  cabinetStyle: string;
  cabinetFinish: string;
  appliances: string[];
  applianceBrand: string;
  pantrySize: string;
  islandPreference: string;
  kitchenNotes: string;
  ceilingHeight: number;
  structuralSystem: string;
  foundationType: string;
  loadBearingNotes: string;
  structuralConstraints: string;
  renderingTimeOfDay: string[];
  renderingViews: string[];
  renderingStyle: string;
  cameraAngles: string[];
  renderingNotes: string;
  inspirationLinks: string[];
  inspirationNotes: string;
  budgetMin: number;
  budgetMax: number;
  budgetPriority: string;
  timeline: string;
  priorityLevel: string;
  additionalNotes: string;
}

export function transformWorkRequestToProject(
  formData: ClientWorkRequestFormData,
  companyId: string,
  customerId: string
): Partial<ArchitectureProject> {
  return {
    company_id: companyId,
    customer_id: customerId,
    project_name: formData.projectName,
    project_type: 'new_construction', // Could be derived from form
    project_status: 'intake',
    priority_level: formData.priorityLevel as 'low' | 'medium' | 'high' | 'urgent',
    budget_min: formData.budgetMin,
    budget_max: formData.budgetMax,
    timeline: formData.timeline,
    architectural_style: formData.architecturalStyle,
    interior_style: formData.interiorStyle,
    total_floors: formData.totalFloors,
    lot_area: formData.lotArea,
  };
}

export function transformWorkRequestToSiteInfo(
  formData: ClientWorkRequestFormData,
  projectId: string
): Partial<ProjectSiteInfo> {
  return {
    project_id: projectId,
    site_address: formData.siteAddress,
    city: formData.city,
    state: formData.state,
    zip_code: formData.zipCode,
    country: formData.country,
    lot_width: formData.lotWidth,
    lot_depth: formData.lotDepth,
    lot_area: formData.lotArea,
    lot_shape: formData.lotShape,
    topography: formData.topography as 'flat' | 'slight_slope' | 'moderate_slope' | 'steep_slope' | 'hillside',
    orientation: formData.orientation as 'north' | 'south' | 'east' | 'west' | 'northeast' | 'northwest' | 'southeast' | 'southwest',
    existing_structures: formData.existingStructures,
    zoning_restrictions: formData.zoningRestrictions,
  };
}

export function transformWorkRequestToBuildingProgram(
  formData: ClientWorkRequestFormData,
  projectId: string
): Partial<ProjectBuildingProgram> {
  return {
    project_id: projectId,
    total_floors: formData.totalFloors,
    ceiling_height: formData.ceilingHeight,
    structural_system: formData.structuralSystem,
    foundation_type: formData.foundationType,
    rooms: formData.rooms.map((room) => ({
      id: room.id,
      type: room.type,
      name: room.name,
      floor: room.floor,
      min_sqft: room.minSqft,
      max_sqft: room.maxSqft,
      target_sqft: room.targetSqft,
      natural_light: room.naturalLight,
      adjacent_to: room.adjacentTo,
      features: room.features,
      notes: room.notes,
    })),
    special_features: formData.specialFeatures,
    circulation_style: formData.circulationStyle,
    accessibility_needs: formData.accessibilityNeeds,
    load_bearing_notes: formData.loadBearingNotes,
    structural_constraints: formData.structuralConstraints,
  };
}

export function transformWorkRequestToStylePreferences(
  formData: ClientWorkRequestFormData,
  projectId: string
): Partial<ProjectStylePreferences> {
  return {
    project_id: projectId,
    architectural_style: formData.architecturalStyle,
    secondary_style: formData.secondaryStyle,
    interior_style: formData.interiorStyle,
    color_palette: formData.colorPalette,
    color_preferences: formData.colorPreferences,
    flooring_preferences: formData.flooringPreferences,
    wall_finishes: formData.wallFinishes,
    ceiling_finishes: formData.ceilingFinishes,
    lighting_style: formData.lightingStyle,
    natural_light_priority: formData.naturalLightPriority as 'essential' | 'high' | 'medium' | 'low',
    inspiration_links: formData.inspirationLinks,
    inspiration_notes: formData.inspirationNotes,
  };
}

export function transformWorkRequestToRenderingRequirements(
  formData: ClientWorkRequestFormData,
  projectId: string
): Partial<ProjectRenderingRequirements> {
  return {
    project_id: projectId,
    rendering_time_of_day: formData.renderingTimeOfDay,
    rendering_views: formData.renderingViews,
    rendering_style: formData.renderingStyle as 'photorealistic' | 'artistic' | 'sketch' | 'technical',
    camera_angles: formData.cameraAngles,
    rendering_notes: formData.renderingNotes,
  };
}

// ============================================================================
// FLOOR PLAN → QUOTE LINE ITEMS
// ============================================================================

export interface MaterialEstimate {
  category: string;
  item_name: string;
  quantity: number;
  unit: string;
  unit_price: number;
  notes: string;
}

export function estimateMaterialsFromFloorPlan(
  floorPlan: FloorPlan,
  wallCount: number,
  roomCount: number,
  totalWallLength: number
): MaterialEstimate[] {
  const estimates: MaterialEstimate[] = [];
  const totalArea = floorPlan.total_area_sqft || 0;

  // Flooring estimate
  if (totalArea > 0) {
    estimates.push({
      category: 'flooring',
      item_name: 'Flooring Material',
      quantity: Math.ceil(totalArea * 1.1), // 10% waste factor
      unit: 'sqft',
      unit_price: 6.5, // Average cost per sqft
      notes: `Based on ${totalArea} sqft floor area + 10% waste`,
    });
  }

  // Drywall estimate
  if (totalWallLength > 0) {
    const wallArea = totalWallLength * 96; // 8 ft ceiling
    estimates.push({
      category: 'drywall',
      item_name: 'Drywall',
      quantity: Math.ceil((wallArea * 2) / 32), // Both sides, 4x8 sheets
      unit: 'sheets',
      unit_price: 15,
      notes: `Based on ${totalWallLength.toFixed(1)} linear ft of walls`,
    });
  }

  // Paint estimate
  if (totalArea > 0) {
    const paintableArea = (totalArea * 4) / 350; // Wall area / coverage per gallon
    estimates.push({
      category: 'paint',
      item_name: 'Interior Paint',
      quantity: Math.ceil(paintableArea * 2), // Two coats
      unit: 'gallons',
      unit_price: 45,
      notes: `Based on ${totalArea} sqft floor area, two coats`,
    });
  }

  return estimates;
}

export function transformMaterialEstimatesToQuoteLineItems(
  estimates: MaterialEstimate[],
  quoteId: string,
  markupPercentage: number = 30
): Partial<QuoteLineItem>[] {
  return estimates.map((estimate, index) => ({
    quote_id: quoteId,
    line_type: 'material',
    item_name: estimate.item_name,
    description: estimate.notes,
    quantity: estimate.quantity,
    unit: estimate.unit,
    unit_price: estimate.unit_price,
    markup_percentage: markupPercentage,
    discount_percentage: 0,
    line_total: estimate.quantity * estimate.unit_price * (1 + markupPercentage / 100),
    notes: '',
    sort_order: index + 1,
    is_optional: false,
  }));
}

// ============================================================================
// KITCHEN LAYOUT → QUOTE LINE ITEMS
// ============================================================================

export interface KitchenCostEstimate {
  cabinets_cost: number;
  cabinets_count: number;
  countertop_cost: number;
  countertop_sqft: number;
  appliances_cost: number;
  installation_hours: number;
  installation_cost: number;
  total_cost: number;
}

export function estimateKitchenCosts(
  layout: KitchenLayout,
  cabinetCount: number,
  avgCabinetPrice: number = 800
): KitchenCostEstimate {
  const cabinetsCost = cabinetCount * avgCabinetPrice;

  // Estimate countertop based on layout type
  let countertopSqft = 0;
  switch (layout.layout_type) {
    case 'one_wall':
      countertopSqft = 25;
      break;
    case 'galley':
      countertopSqft = 40;
      break;
    case 'l_shape':
      countertopSqft = 35;
      break;
    case 'u_shape':
      countertopSqft = 50;
      break;
    case 'island':
    case 'peninsula':
      countertopSqft = 60;
      break;
  }

  // Add island countertop if present
  if (layout.has_island && layout.island_width && layout.island_length) {
    countertopSqft += (layout.island_width * layout.island_length) / 144; // Convert to sqft
  }

  // Countertop pricing by material
  const countertopPrices: Record<string, number> = {
    laminate: 25,
    quartz: 75,
    granite: 65,
    marble: 85,
    quartzite: 95,
    soapstone: 70,
    butcher_block: 45,
  };

  const countertopPricePerSqft = countertopPrices[layout.countertop_material] || 50;
  const countertopCost = countertopSqft * countertopPricePerSqft;

  // Appliance estimate (rough average)
  const appliancesCost = 5000; // Average package

  // Installation labor (3-5 days at $75/hr)
  const installationHours = 32;
  const installationCost = installationHours * 75;

  const totalCost = cabinetsCost + countertopCost + appliancesCost + installationCost;

  return {
    cabinets_cost: cabinetsCost,
    cabinets_count: cabinetCount,
    countertop_cost: countertopCost,
    countertop_sqft: countertopSqft,
    appliances_cost: appliancesCost,
    installation_hours: installationHours,
    installation_cost: installationCost,
    total_cost: totalCost,
  };
}

export function transformKitchenEstimateToQuoteLineItems(
  estimate: KitchenCostEstimate,
  quoteId: string,
  layout: KitchenLayout
): Partial<QuoteLineItem>[] {
  return [
    {
      quote_id: quoteId,
      line_type: 'material',
      item_name: `Kitchen Cabinets - ${layout.cabinet_style}`,
      description: `${estimate.cabinets_count} cabinets`,
      quantity: estimate.cabinets_count,
      unit: 'units',
      unit_price: estimate.cabinets_cost / estimate.cabinets_count,
      markup_percentage: 0,
      discount_percentage: 0,
      line_total: estimate.cabinets_cost,
      notes: '',
      sort_order: 1,
      is_optional: false,
    },
    {
      quote_id: quoteId,
      line_type: 'material',
      item_name: `Countertops - ${layout.countertop_material}`,
      description: `${estimate.countertop_sqft.toFixed(1)} sqft`,
      quantity: estimate.countertop_sqft,
      unit: 'sqft',
      unit_price: estimate.countertop_cost / estimate.countertop_sqft,
      markup_percentage: 0,
      discount_percentage: 0,
      line_total: estimate.countertop_cost,
      notes: '',
      sort_order: 2,
      is_optional: false,
    },
    {
      quote_id: quoteId,
      line_type: 'material',
      item_name: `Kitchen Appliances - ${layout.appliance_brand || 'Standard Package'}`,
      description: 'Refrigerator, range, dishwasher, microwave',
      quantity: 1,
      unit: 'package',
      unit_price: estimate.appliances_cost,
      markup_percentage: 0,
      discount_percentage: 0,
      line_total: estimate.appliances_cost,
      notes: 'Actual cost may vary based on specific model selections',
      sort_order: 3,
      is_optional: false,
    },
    {
      quote_id: quoteId,
      line_type: 'labor',
      item_name: 'Kitchen Installation Labor',
      description: 'Professional installation of cabinets, countertops, and appliances',
      quantity: estimate.installation_hours,
      unit: 'hours',
      unit_price: 75,
      markup_percentage: 0,
      discount_percentage: 0,
      line_total: estimate.installation_cost,
      notes: '',
      sort_order: 4,
      is_optional: false,
    },
  ];
}

// ============================================================================
// QUOTE → INVOICE
// ============================================================================

export function transformQuoteToInvoice(
  quote: Quote,
  lineItems: QuoteLineItem[],
  invoiceNumber: string,
  invoiceDate: string,
  dueDate: string
): Partial<Invoice> {
  return {
    company_id: quote.company_id,
    customer_id: quote.customer_id,
    project_id: quote.project_id,
    quote_id: quote.id,
    invoice_number: invoiceNumber,
    invoice_date: invoiceDate,
    due_date: dueDate,
    invoice_status: 'draft',
    subtotal: quote.subtotal,
    tax_rate: quote.tax_rate,
    tax_amount: quote.tax_amount,
    discount_amount: quote.discount_amount,
    total_amount: quote.total_amount,
    amount_paid: 0,
    amount_due: quote.total_amount,
    payment_terms: quote.payment_terms,
    notes: `Invoice for Quote #${quote.quote_number}`,
  };
}

export function transformQuoteLineItemsToInvoiceLineItems(
  lineItems: QuoteLineItem[],
  invoiceId: string
): Partial<InvoiceLineItem>[] {
  return lineItems.map((item) => ({
    invoice_id: invoiceId,
    line_type: item.line_type,
    item_name: item.item_name,
    description: item.description,
    quantity: item.quantity,
    unit: item.unit,
    unit_price: item.unit_price * (1 + item.markup_percentage / 100),
    line_total: item.line_total,
    sort_order: item.sort_order,
  }));
}

// ============================================================================
// DATA AGGREGATION
// ============================================================================

export interface ProjectSummary {
  project: ArchitectureProject;
  site_info: ProjectSiteInfo | null;
  building_program: ProjectBuildingProgram | null;
  style_preferences: ProjectStylePreferences | null;
  floor_plans_count: number;
  quotes_count: number;
  work_orders_count: number;
  invoices_count: number;
  total_invoiced: number;
  total_paid: number;
  completion_percentage: number;
}

export function calculateProjectCompletionPercentage(
  project: ArchitectureProject,
  completedTasks: number,
  totalTasks: number
): number {
  if (totalTasks === 0) return 0;

  const taskPercentage = (completedTasks / totalTasks) * 100;

  // Weight by project status
  const statusWeights: Record<string, number> = {
    intake: 10,
    design: 30,
    review: 50,
    revision: 60,
    approved: 70,
    in_construction: 85,
    completed: 100,
    on_hold: 0,
  };

  const statusWeight = statusWeights[project.project_status] || 0;

  // Average status weight and task completion
  return Math.min((statusWeight + taskPercentage) / 2, 100);
}

// ============================================================================
// FINANCIAL CALCULATIONS
// ============================================================================

export function calculateQuoteTotals(lineItems: Partial<QuoteLineItem>[], taxRate: number = 0): {
  subtotal: number;
  tax_amount: number;
  total_amount: number;
} {
  const subtotal = lineItems.reduce((sum, item) => {
    if (item.line_total) return sum + item.line_total;
    if (item.quantity && item.unit_price) {
      const basePrice = item.quantity * item.unit_price;
      const withMarkup = basePrice * (1 + (item.markup_percentage || 0) / 100);
      const withDiscount = withMarkup * (1 - (item.discount_percentage || 0) / 100);
      return sum + withDiscount;
    }
    return sum;
  }, 0);

  const tax_amount = subtotal * taxRate;
  const total_amount = subtotal + tax_amount;

  return {
    subtotal: Math.round(subtotal * 100) / 100,
    tax_amount: Math.round(tax_amount * 100) / 100,
    total_amount: Math.round(total_amount * 100) / 100,
  };
}

export function calculateInvoiceTotals(lineItems: Partial<InvoiceLineItem>[], taxRate: number = 0, discountAmount: number = 0): {
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
} {
  const subtotal = lineItems.reduce((sum, item) => sum + (item.line_total || 0), 0);
  const afterDiscount = subtotal - discountAmount;
  const tax_amount = afterDiscount * taxRate;
  const total_amount = afterDiscount + tax_amount;

  return {
    subtotal: Math.round(subtotal * 100) / 100,
    tax_amount: Math.round(tax_amount * 100) / 100,
    discount_amount: Math.round(discountAmount * 100) / 100,
    total_amount: Math.round(total_amount * 100) / 100,
  };
}

// ============================================================================
// NUMBER FORMATTING
// ============================================================================

export function formatCurrency(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
  }).format(amount);
}

export function formatSquareFeet(sqft: number): string {
  return `${sqft.toLocaleString('en-US')} sq ft`;
}

export function formatDimension(inches: number, unit: 'imperial' | 'metric' = 'imperial'): string {
  if (unit === 'metric') {
    const cm = inches * 2.54;
    return `${cm.toFixed(1)} cm`;
  }

  const feet = Math.floor(inches / 12);
  const remainingInches = Math.round(inches % 12);

  if (feet === 0) {
    return `${remainingInches}"`;
  }

  if (remainingInches === 0) {
    return `${feet}'`;
  }

  return `${feet}'-${remainingInches}"`;
}
