/**
 * Data Usage Examples
 * 
 * This file demonstrates how to use the data types, validation,
 * and transformation utilities throughout the application.
 */

import { supabase } from '../lib/supabase';
import {
  validateArchitectureProject,
  validateQuote,
  validateKitchenLayout,
  validateWorkOrder,
  combineValidationResults,
} from '../lib/dataValidation';
import {
  transformWorkRequestToProject,
  transformWorkRequestToSiteInfo,
  transformWorkRequestToBuildingProgram,
  transformQuoteToInvoice,
  calculateQuoteTotals,
  estimateMaterialsFromFloorPlan,
  transformMaterialEstimatesToQuoteLineItems,
  ClientWorkRequestFormData,
} from '../lib/dataTransforms';
import type {
  ArchitectureProject,
  Quote,
  QuoteLineItem,
  FloorPlan,
  KitchenLayout,
} from './database.types';

// ============================================================================
// EXAMPLE 1: Client Work Request Form Submission
// ============================================================================

export async function submitClientWorkRequest(
  formData: ClientWorkRequestFormData,
  companyId: string,
  customerId: string,
  userId: string
) {
  try {
    // Step 1: Transform form data to project record
    const projectData = transformWorkRequestToProject(formData, companyId, customerId);

    // Step 2: Validate project data
    const projectValidation = validateArchitectureProject(projectData);
    if (!projectValidation.isValid) {
      console.error('Project validation failed:', projectValidation.errors);
      return { success: false, errors: projectValidation.errors };
    }

    // Step 3: Insert project record
    const { data: project, error: projectError } = await supabase
      .from('architecture_projects')
      .insert({
        ...projectData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (projectError || !project) {
      throw new Error(`Failed to create project: ${projectError?.message}`);
    }

    // Step 4: Insert related records in parallel
    const siteInfoData = transformWorkRequestToSiteInfo(formData, project.id);
    const buildingProgramData = transformWorkRequestToBuildingProgram(formData, project.id);

    await Promise.all([
      supabase.from('project_site_info').insert(siteInfoData),
      supabase.from('project_building_programs').insert(buildingProgramData),
    ]);

    // Step 5: Log to audit trail
    await supabase.from('security_audit_log').insert({
      user_id: userId,
      company_id: companyId,
      event_type: 'project_created',
      event_category: 'data',
      event_details: { project_id: project.id, project_name: formData.projectName },
      severity: 'info',
      created_at: new Date().toISOString(),
    });

    return {
      success: true,
      project_id: project.id,
      warnings: projectValidation.warnings,
    };
  } catch (error) {
    console.error('Error submitting work request:', error);
    return {
      success: false,
      errors: [{ field: 'general', message: (error as Error).message, code: 'SUBMISSION_ERROR' }],
    };
  }
}

// ============================================================================
// EXAMPLE 2: Create Quote from Project Data
// ============================================================================

export async function createQuoteFromProject(
  projectId: string,
  companyId: string,
  customerId: string,
  userId: string
) {
  try {
    // Step 1: Fetch project data
    const [projectRes, floorPlansRes, kitchenLayoutsRes] = await Promise.all([
      supabase.from('architecture_projects').select('*').eq('id', projectId).single(),
      supabase.from('floor_plans').select('*').eq('project_id', projectId),
      supabase
        .from('kitchen_layouts')
        .select('*, kitchen_cabinets(*)')
        .eq('project_id', projectId),
    ]);

    if (projectRes.error || !projectRes.data) {
      throw new Error('Project not found');
    }

    const project = projectRes.data as ArchitectureProject;
    const floorPlans = (floorPlansRes.data || []) as FloorPlan[];
    const kitchenLayouts = (kitchenLayoutsRes.data || []) as KitchenLayout[];

    // Step 2: Estimate materials from floor plans
    const materialEstimates: any[] = [];
    for (const plan of floorPlans) {
      // Fetch wall data for this plan
      const { data: walls } = await supabase
        .from('floor_plan_walls')
        .select('*')
        .eq('floor_plan_id', plan.id);

      if (walls && walls.length > 0) {
        const totalWallLength = walls.reduce((sum, wall) => {
          const dx = wall.end_x - wall.start_x;
          const dy = wall.end_y - wall.start_y;
          return sum + Math.sqrt(dx * dx + dy * dy);
        }, 0);

        const estimates = estimateMaterialsFromFloorPlan(
          plan,
          walls.length,
          0, // Room count would come from floor_plan_rooms
          totalWallLength
        );

        materialEstimates.push(...estimates);
      }
    }

    // Step 3: Create quote header
    const quoteData: Partial<Quote> = {
      company_id: companyId,
      customer_id: customerId,
      project_id: projectId,
      quote_number: `Q-${Date.now()}`, // Generate proper quote number
      quote_title: `Quote for ${project.project_name}`,
      quote_status: 'draft',
      quote_type: 'design_build',
      subtotal: 0, // Will be calculated
      tax_rate: 0.08, // 8% tax
      tax_amount: 0,
      discount_amount: 0,
      total_amount: 0,
      deposit_required: 0,
      deposit_percentage: 30,
      payment_terms: 'Net 30',
      valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      created_by: userId,
    };

    // Step 4: Validate quote
    const quoteValidation = validateQuote(quoteData);
    if (!quoteValidation.isValid) {
      return { success: false, errors: quoteValidation.errors };
    }

    // Step 5: Insert quote
    const { data: quote, error: quoteError } = await supabase
      .from('quotes')
      .insert(quoteData)
      .select()
      .single();

    if (quoteError || !quote) {
      throw new Error(`Failed to create quote: ${quoteError?.message}`);
    }

    // Step 6: Transform estimates to line items
    const lineItems = transformMaterialEstimatesToQuoteLineItems(
      materialEstimates,
      quote.id,
      30 // 30% markup
    );

    // Step 7: Insert line items
    const { data: insertedLineItems } = await supabase
      .from('quote_line_items')
      .insert(lineItems)
      .select();

    // Step 8: Calculate and update totals
    const totals = calculateQuoteTotals(insertedLineItems || [], quoteData.tax_rate || 0);

    await supabase
      .from('quotes')
      .update({
        subtotal: totals.subtotal,
        tax_amount: totals.tax_amount,
        total_amount: totals.total_amount,
        deposit_required: totals.total_amount * 0.3, // 30% deposit
      })
      .eq('id', quote.id);

    return {
      success: true,
      quote_id: quote.id,
      quote_number: quote.quote_number,
      total_amount: totals.total_amount,
    };
  } catch (error) {
    console.error('Error creating quote:', error);
    return {
      success: false,
      errors: [{ field: 'general', message: (error as Error).message, code: 'QUOTE_ERROR' }],
    };
  }
}

// ============================================================================
// EXAMPLE 3: Convert Quote to Invoice
// ============================================================================

export async function convertQuoteToInvoice(quoteId: string, userId: string) {
  try {
    // Step 1: Fetch quote and line items
    const [quoteRes, lineItemsRes] = await Promise.all([
      supabase.from('quotes').select('*').eq('id', quoteId).single(),
      supabase.from('quote_line_items').select('*').eq('quote_id', quoteId),
    ]);

    if (quoteRes.error || !quoteRes.data) {
      throw new Error('Quote not found');
    }

    const quote = quoteRes.data as Quote;
    const lineItems = (lineItemsRes.data || []) as QuoteLineItem[];

    // Step 2: Check quote status
    if (quote.quote_status !== 'accepted') {
      return {
        success: false,
        errors: [
          {
            field: 'quote_status',
            message: 'Quote must be accepted before converting to invoice',
            code: 'INVALID_STATUS',
          },
        ],
      };
    }

    // Step 3: Transform to invoice
    const invoiceNumber = `INV-${Date.now()}`;
    const invoiceDate = new Date().toISOString();
    const dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days

    const invoiceData = transformQuoteToInvoice(quote, lineItems, invoiceNumber, invoiceDate, dueDate);

    // Step 4: Insert invoice
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .insert({
        ...invoiceData,
        created_by: userId,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (invoiceError || !invoice) {
      throw new Error(`Failed to create invoice: ${invoiceError?.message}`);
    }

    // Step 5: Transform and insert line items
    const { transformQuoteLineItemsToInvoiceLineItems } = await import('../lib/dataTransforms');
    const invoiceLineItems = transformQuoteLineItemsToInvoiceLineItems(lineItems, invoice.id);

    await supabase.from('invoice_line_items').insert(invoiceLineItems);

    return {
      success: true,
      invoice_id: invoice.id,
      invoice_number: invoiceNumber,
    };
  } catch (error) {
    console.error('Error converting quote to invoice:', error);
    return {
      success: false,
      errors: [{ field: 'general', message: (error as Error).message, code: 'CONVERSION_ERROR' }],
    };
  }
}

// ============================================================================
// EXAMPLE 4: Validate Kitchen Layout Before Save
// ============================================================================

export async function saveKitchenLayoutWithValidation(
  layoutData: Partial<KitchenLayout>,
  cabinets: any[],
  appliances: any[],
  userId: string
) {
  try {
    // Step 1: Validate layout
    const layoutValidation = validateKitchenLayout(layoutData);

    if (!layoutValidation.isValid) {
      return {
        success: false,
        errors: layoutValidation.errors,
        warnings: layoutValidation.warnings,
      };
    }

    // Step 2: Insert or update layout
    let layoutId = layoutData.id;

    if (layoutId) {
      // Update existing
      await supabase.from('kitchen_layouts').update(layoutData).eq('id', layoutId);
    } else {
      // Insert new
      const { data: newLayout, error } = await supabase
        .from('kitchen_layouts')
        .insert(layoutData)
        .select()
        .single();

      if (error || !newLayout) {
        throw new Error('Failed to create kitchen layout');
      }

      layoutId = newLayout.id;
    }

    // Step 3: Delete existing cabinets/appliances and insert new
    await Promise.all([
      supabase.from('kitchen_cabinets').delete().eq('kitchen_layout_id', layoutId),
      supabase.from('kitchen_appliances').delete().eq('kitchen_layout_id', layoutId),
    ]);

    // Step 4: Insert cabinets and appliances
    const cabinetRecords = cabinets.map((cab) => ({
      kitchen_layout_id: layoutId,
      ...cab,
    }));

    const applianceRecords = appliances.map((app) => ({
      kitchen_layout_id: layoutId,
      ...app,
    }));

    await Promise.all([
      supabase.from('kitchen_cabinets').insert(cabinetRecords),
      supabase.from('kitchen_appliances').insert(applianceRecords),
    ]);

    return {
      success: true,
      layout_id: layoutId,
      warnings: layoutValidation.warnings,
      nkba_compliance_score: layoutData.nkba_compliance_score,
    };
  } catch (error) {
    console.error('Error saving kitchen layout:', error);
    return {
      success: false,
      errors: [{ field: 'general', message: (error as Error).message, code: 'SAVE_ERROR' }],
    };
  }
}

// ============================================================================
// EXAMPLE 5: Fetch Project with All Related Data
// ============================================================================

export async function fetchCompleteProjectData(projectId: string, companyId: string) {
  try {
    // Fetch all project-related data in parallel
    const [
      projectRes,
      siteInfoRes,
      buildingProgramRes,
      stylePrefsRes,
      floorPlansRes,
      kitchenLayoutsRes,
      quotesRes,
      workOrdersRes,
      invoicesRes,
    ] = await Promise.all([
      supabase.from('architecture_projects').select('*').eq('id', projectId).single(),
      supabase.from('project_site_info').select('*').eq('project_id', projectId).single(),
      supabase.from('project_building_programs').select('*').eq('project_id', projectId).single(),
      supabase.from('project_style_preferences').select('*').eq('project_id', projectId).single(),
      supabase.from('floor_plans').select('*').eq('project_id', projectId),
      supabase.from('kitchen_layouts').select('*').eq('project_id', projectId),
      supabase.from('quotes').select('*').eq('project_id', projectId),
      supabase.from('work_orders').select('*').eq('project_id', projectId),
      supabase.from('invoices').select('*').eq('project_id', projectId),
    ]);

    if (projectRes.error || !projectRes.data) {
      throw new Error('Project not found');
    }

    const project = projectRes.data as ArchitectureProject;

    // Verify company access
    if (project.company_id !== companyId) {
      throw new Error('Access denied: Project belongs to different company');
    }

    // Calculate financial summary
    const invoices = (invoicesRes.data || []) as any[];
    const totalInvoiced = invoices.reduce((sum, inv) => sum + (inv.total_amount || 0), 0);
    const totalPaid = invoices.reduce((sum, inv) => sum + (inv.amount_paid || 0), 0);

    return {
      success: true,
      data: {
        project: projectRes.data,
        site_info: siteInfoRes.data,
        building_program: buildingProgramRes.data,
        style_preferences: stylePrefsRes.data,
        floor_plans: floorPlansRes.data || [],
        kitchen_layouts: kitchenLayoutsRes.data || [],
        quotes: quotesRes.data || [],
        work_orders: workOrdersRes.data || [],
        invoices: invoicesRes.data || [],
        financial_summary: {
          total_invoiced: totalInvoiced,
          total_paid: totalPaid,
          outstanding: totalInvoiced - totalPaid,
        },
      },
    };
  } catch (error) {
    console.error('Error fetching project data:', error);
    return {
      success: false,
      errors: [{ field: 'general', message: (error as Error).message, code: 'FETCH_ERROR' }],
    };
  }
}

// ============================================================================
// EXAMPLE 6: Batch Validation Before Database Insert
// ============================================================================

export async function validateAndInsertMultipleRecords() {
  // Example: Validate multiple rooms before inserting
  const rooms = [
    { name: 'Kitchen', type: 'kitchen', min_sqft: 120, max_sqft: 180, target_sqft: 150 },
    { name: 'Living Room', type: 'living_room', min_sqft: 200, max_sqft: 300, target_sqft: 250 },
    { name: 'Master Bedroom', type: 'master_bedroom', min_sqft: 150, max_sqft: 250, target_sqft: 200 },
  ];

  const validationResults = rooms.map((room) => {
    const { validateRoomRequirement } = require('../lib/dataValidation');
    return validateRoomRequirement(room);
  });

  const combinedResult = combineValidationResults(validationResults);

  if (!combinedResult.isValid) {
    console.error('Validation failed for one or more rooms:', combinedResult.errors);
    return { success: false, errors: combinedResult.errors };
  }

  // All validations passed, safe to insert
  console.log('All rooms validated successfully');
  if (combinedResult.warnings.length > 0) {
    console.warn('Warnings:', combinedResult.warnings);
  }

  return { success: true, warnings: combinedResult.warnings };
}

// ============================================================================
// EXAMPLE 7: Data Flow - Complete Project Lifecycle
// ============================================================================

export async function completeProjectLifecycle(
  formData: ClientWorkRequestFormData,
  companyId: string,
  customerId: string,
  userId: string
) {
  // Step 1: Submit work request
  console.log('Step 1: Submitting work request...');
  const workRequestResult = await submitClientWorkRequest(formData, companyId, customerId, userId);

  if (!workRequestResult.success) {
    return { success: false, stage: 'work_request', errors: workRequestResult.errors };
  }

  const projectId = workRequestResult.project_id!;

  // Step 2: Create floor plan (would be done in Floor Plan Engine)
  console.log('Step 2: Floor plan creation (manual step)...');
  // This would be done by the user in the Floor Plan Engine UI

  // Step 3: Design kitchen (would be done in Kitchen Designer)
  console.log('Step 3: Kitchen design (manual step)...');
  // This would be done by the user in the Kitchen Cabinet Designer UI

  // Step 4: Generate quote from project data
  console.log('Step 4: Generating quote...');
  const quoteResult = await createQuoteFromProject(projectId, companyId, customerId, userId);

  if (!quoteResult.success) {
    return { success: false, stage: 'quote_creation', errors: quoteResult.errors };
  }

  const quoteId = quoteResult.quote_id!;

  // Step 5: Send quote to customer (manual approval)
  console.log('Step 5: Quote sent to customer (waiting for approval)...');
  await supabase
    .from('quotes')
    .update({
      quote_status: 'sent',
      sent_at: new Date().toISOString(),
    })
    .eq('id', quoteId);

  // Step 6: Customer accepts quote (simulated)
  console.log('Step 6: Customer accepts quote...');
  await supabase
    .from('quotes')
    .update({
      quote_status: 'accepted',
      accepted_at: new Date().toISOString(),
    })
    .eq('id', quoteId);

  // Step 7: Convert to invoice
  console.log('Step 7: Converting quote to invoice...');
  const invoiceResult = await convertQuoteToInvoice(quoteId, userId);

  if (!invoiceResult.success) {
    return { success: false, stage: 'invoice_creation', errors: invoiceResult.errors };
  }

  // Step 8: Create work order
  console.log('Step 8: Creating work order...');
  const workOrderData = {
    company_id: companyId,
    project_id: projectId,
    customer_id: customerId,
    quote_id: quoteId,
    work_order_number: `WO-${Date.now()}`,
    work_order_title: `Work Order for ${formData.projectName}`,
    work_order_type: 'installation',
    priority: 'medium',
    status: 'scheduled',
    scope_of_work: 'Complete kitchen renovation',
    created_by: userId,
  };

  const workOrderValidation = validateWorkOrder(workOrderData);
  if (workOrderValidation.isValid) {
    await supabase.from('work_orders').insert(workOrderData);
  }

  return {
    success: true,
    project_id: projectId,
    quote_id: quoteId,
    invoice_id: invoiceResult.invoice_id,
    message: 'Complete project lifecycle executed successfully',
  };
}
