/**
 * Data Validation Utilities
 * 
 * Centralized validation logic to ensure data integrity across all modules.
 * These validators should be used before saving data to the database.
 */

import type {
  ArchitectureProject,
  FloorPlan,
  FloorPlanWall,
  FloorPlanRoom,
  KitchenLayout,
  Quote,
  Invoice,
  WorkOrder,
  RoomRequirement,
} from '../types/database.types';

// ============================================================================
// VALIDATION RESULT TYPES
// ============================================================================

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface ValidationWarning {
  field: string;
  message: string;
  code: string;
}

// ============================================================================
// PROJECT VALIDATION
// ============================================================================

export function validateArchitectureProject(
  project: Partial<ArchitectureProject>
): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  // Required fields
  if (!project.project_name || project.project_name.trim() === '') {
    errors.push({
      field: 'project_name',
      message: 'Project name is required',
      code: 'REQUIRED_FIELD',
    });
  }

  if (!project.customer_id) {
    errors.push({
      field: 'customer_id',
      message: 'Customer is required',
      code: 'REQUIRED_FIELD',
    });
  }

  if (!project.company_id) {
    errors.push({
      field: 'company_id',
      message: 'Company ID is required',
      code: 'REQUIRED_FIELD',
    });
  }

  // Budget validation
  if (project.budget_min !== undefined && project.budget_max !== undefined) {
    if (project.budget_min > project.budget_max) {
      errors.push({
        field: 'budget_max',
        message: 'Maximum budget must be greater than minimum budget',
        code: 'INVALID_RANGE',
      });
    }

    if (project.budget_min < 0 || project.budget_max < 0) {
      errors.push({
        field: 'budget',
        message: 'Budget values must be positive',
        code: 'INVALID_VALUE',
      });
    }
  }

  // Timeline validation
  if (project.start_date && project.target_completion_date) {
    const start = new Date(project.start_date);
    const end = new Date(project.target_completion_date);
    if (end < start) {
      errors.push({
        field: 'target_completion_date',
        message: 'Completion date must be after start date',
        code: 'INVALID_DATE_RANGE',
      });
    }
  }

  // Floor count validation
  if (project.total_floors !== undefined) {
    if (project.total_floors < 1 || project.total_floors > 10) {
      warnings.push({
        field: 'total_floors',
        message: 'Unusual number of floors (typical range: 1-10)',
        code: 'UNUSUAL_VALUE',
      });
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

export function validateRoomRequirement(room: Partial<RoomRequirement>): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  if (!room.name || room.name.trim() === '') {
    errors.push({
      field: 'name',
      message: 'Room name is required',
      code: 'REQUIRED_FIELD',
    });
  }

  if (!room.type) {
    errors.push({
      field: 'type',
      message: 'Room type is required',
      code: 'REQUIRED_FIELD',
    });
  }

  // Square footage validation
  if (room.min_sqft !== undefined && room.max_sqft !== undefined && room.target_sqft !== undefined) {
    if (room.min_sqft > room.max_sqft) {
      errors.push({
        field: 'max_sqft',
        message: 'Maximum square footage must be greater than minimum',
        code: 'INVALID_RANGE',
      });
    }

    if (room.target_sqft < room.min_sqft || room.target_sqft > room.max_sqft) {
      errors.push({
        field: 'target_sqft',
        message: 'Target square footage must be within min/max range',
        code: 'OUT_OF_RANGE',
      });
    }

    if (room.min_sqft < 0 || room.max_sqft < 0 || room.target_sqft < 0) {
      errors.push({
        field: 'sqft',
        message: 'Square footage values must be positive',
        code: 'INVALID_VALUE',
      });
    }

    // Reasonable room size warnings
    if (room.target_sqft > 5000) {
      warnings.push({
        field: 'target_sqft',
        message: 'Very large room (over 5000 sq ft)',
        code: 'UNUSUAL_SIZE',
      });
    }

    if (room.target_sqft < 40 && room.type !== 'closet' && room.type !== 'bathroom') {
      warnings.push({
        field: 'target_sqft',
        message: 'Very small room (under 40 sq ft)',
        code: 'UNUSUAL_SIZE',
      });
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

// ============================================================================
// FLOOR PLAN VALIDATION
// ============================================================================

export function validateFloorPlan(plan: Partial<FloorPlan>): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  if (!plan.name || plan.name.trim() === '') {
    errors.push({
      field: 'name',
      message: 'Floor plan name is required',
      code: 'REQUIRED_FIELD',
    });
  }

  if (!plan.project_id) {
    errors.push({
      field: 'project_id',
      message: 'Project ID is required',
      code: 'REQUIRED_FIELD',
    });
  }

  if (plan.floor_level !== undefined) {
    if (plan.floor_level < -3 || plan.floor_level > 10) {
      warnings.push({
        field: 'floor_level',
        message: 'Unusual floor level',
        code: 'UNUSUAL_VALUE',
      });
    }
  }

  if (plan.total_area_sqft !== undefined && plan.total_area_sqft < 0) {
    errors.push({
      field: 'total_area_sqft',
      message: 'Total area must be positive',
      code: 'INVALID_VALUE',
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

export function validateWall(wall: Partial<FloorPlanWall>): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  if (!wall.floor_plan_id) {
    errors.push({
      field: 'floor_plan_id',
      message: 'Floor plan ID is required',
      code: 'REQUIRED_FIELD',
    });
  }

  // Validate coordinates
  if (
    wall.start_x === undefined ||
    wall.start_y === undefined ||
    wall.end_x === undefined ||
    wall.end_y === undefined
  ) {
    errors.push({
      field: 'coordinates',
      message: 'Wall coordinates are required',
      code: 'REQUIRED_FIELD',
    });
  } else {
    // Check if wall has length
    const dx = wall.end_x - wall.start_x;
    const dy = wall.end_y - wall.start_y;
    const length = Math.sqrt(dx * dx + dy * dy);

    if (length < 12) {
      // Less than 12 inches
      warnings.push({
        field: 'length',
        message: 'Very short wall (less than 12 inches)',
        code: 'UNUSUAL_LENGTH',
      });
    }

    if (length > 1200) {
      // More than 100 feet
      warnings.push({
        field: 'length',
        message: 'Very long wall (over 100 feet)',
        code: 'UNUSUAL_LENGTH',
      });
    }
  }

  // Validate thickness
  if (wall.thickness !== undefined) {
    const validThicknesses = [3.5, 4.5, 6, 8, 10, 12];
    if (!validThicknesses.includes(wall.thickness)) {
      warnings.push({
        field: 'thickness',
        message: `Non-standard wall thickness (standard: ${validThicknesses.join(', ')} inches)`,
        code: 'NON_STANDARD',
      });
    }
  }

  // Validate height
  if (wall.height !== undefined) {
    if (wall.height < 84 || wall.height > 144) {
      // 7-12 feet
      warnings.push({
        field: 'height',
        message: 'Unusual wall height (typical: 8-10 feet)',
        code: 'UNUSUAL_HEIGHT',
      });
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

export function validateRoom(room: Partial<FloorPlanRoom>): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  if (!room.floor_plan_id) {
    errors.push({
      field: 'floor_plan_id',
      message: 'Floor plan ID is required',
      code: 'REQUIRED_FIELD',
    });
  }

  if (!room.room_name || room.room_name.trim() === '') {
    errors.push({
      field: 'room_name',
      message: 'Room name is required',
      code: 'REQUIRED_FIELD',
    });
  }

  if (!room.points || room.points.length < 3) {
    errors.push({
      field: 'points',
      message: 'Room must have at least 3 points',
      code: 'INSUFFICIENT_POINTS',
    });
  }

  if (room.area_sqft !== undefined) {
    if (room.area_sqft < 0) {
      errors.push({
        field: 'area_sqft',
        message: 'Room area must be positive',
        code: 'INVALID_VALUE',
      });
    }

    if (room.area_sqft < 20) {
      warnings.push({
        field: 'area_sqft',
        message: 'Very small room (less than 20 sq ft)',
        code: 'UNUSUAL_SIZE',
      });
    }

    if (room.area_sqft > 5000) {
      warnings.push({
        field: 'area_sqft',
        message: 'Very large room (over 5000 sq ft)',
        code: 'UNUSUAL_SIZE',
      });
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

// ============================================================================
// KITCHEN LAYOUT VALIDATION (NKBA)
// ============================================================================

export interface WorkTriangle {
  sink: { x: number; y: number } | null;
  range: { x: number; y: number } | null;
  refrigerator: { x: number; y: number } | null;
  legs: { a: number; b: number; c: number };
  total: number;
  isValid: boolean;
  violations: string[];
}

export function validateWorkTriangle(triangle: WorkTriangle): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  if (!triangle.sink || !triangle.range || !triangle.refrigerator) {
    errors.push({
      field: 'work_triangle',
      message: 'Work triangle requires sink, range, and refrigerator positions',
      code: 'INCOMPLETE_TRIANGLE',
    });
    return { isValid: false, errors, warnings };
  }

  // NKBA Rule: Each leg should be 4-9 feet
  const legNames = ['sink-range', 'range-refrigerator', 'refrigerator-sink'];
  const legs = [triangle.legs.a, triangle.legs.b, triangle.legs.c];

  legs.forEach((leg, index) => {
    if (leg < 48) {
      // Less than 4 feet
      errors.push({
        field: 'work_triangle',
        message: `${legNames[index]} leg is too short (${leg}" - minimum 48")`,
        code: 'LEG_TOO_SHORT',
      });
    }

    if (leg > 108) {
      // More than 9 feet
      errors.push({
        field: 'work_triangle',
        message: `${legNames[index]} leg is too long (${leg}" - maximum 108")`,
        code: 'LEG_TOO_LONG',
      });
    }
  });

  // NKBA Rule: Total perimeter should be 12-26 feet
  if (triangle.total < 144) {
    // Less than 12 feet
    errors.push({
      field: 'work_triangle',
      message: `Work triangle perimeter too small (${triangle.total}" - minimum 144")`,
      code: 'PERIMETER_TOO_SMALL',
    });
  }

  if (triangle.total > 312) {
    // More than 26 feet
    errors.push({
      field: 'work_triangle',
      message: `Work triangle perimeter too large (${triangle.total}" - maximum 312")`,
      code: 'PERIMETER_TOO_LARGE',
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

export function validateKitchenLayout(layout: Partial<KitchenLayout>): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  if (!layout.room_id && !layout.project_id) {
    errors.push({
      field: 'room_id',
      message: 'Kitchen layout must be linked to a room or project',
      code: 'REQUIRED_FIELD',
    });
  }

  if (!layout.layout_type) {
    errors.push({
      field: 'layout_type',
      message: 'Kitchen layout type is required',
      code: 'REQUIRED_FIELD',
    });
  }

  // Island dimensions
  if (layout.has_island) {
    if (layout.island_width !== undefined && layout.island_length !== undefined) {
      // NKBA: Minimum 24" x 48" island
      if (layout.island_width < 24 || layout.island_length < 48) {
        warnings.push({
          field: 'island',
          message: 'Island smaller than NKBA minimum (24" x 48")',
          code: 'BELOW_STANDARD',
        });
      }

      // Typical maximum
      if (layout.island_width > 60 || layout.island_length > 120) {
        warnings.push({
          field: 'island',
          message: 'Very large island dimensions',
          code: 'UNUSUAL_SIZE',
        });
      }
    }
  }

  // Work triangle validation
  if (
    layout.work_triangle_sink &&
    layout.work_triangle_range &&
    layout.work_triangle_refrigerator
  ) {
    const triangle: WorkTriangle = {
      sink: layout.work_triangle_sink,
      range: layout.work_triangle_range,
      refrigerator: layout.work_triangle_refrigerator,
      legs: { a: 0, b: 0, c: 0 },
      total: layout.work_triangle_total_distance || 0,
      isValid: layout.validation_status === 'valid',
      violations: layout.validation_messages || [],
    };

    // Calculate legs if not provided
    const distance = (p1: { x: number; y: number }, p2: { x: number; y: number }) => {
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      return Math.sqrt(dx * dx + dy * dy);
    };

    triangle.legs.a = distance(triangle.sink, triangle.range);
    triangle.legs.b = distance(triangle.range, triangle.refrigerator);
    triangle.legs.c = distance(triangle.refrigerator, triangle.sink);
    triangle.total = triangle.legs.a + triangle.legs.b + triangle.legs.c;

    const triangleValidation = validateWorkTriangle(triangle);
    errors.push(...triangleValidation.errors);
    warnings.push(...triangleValidation.warnings);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

// ============================================================================
// FINANCIAL VALIDATION
// ============================================================================

export function validateQuote(quote: Partial<Quote>): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  if (!quote.company_id) {
    errors.push({
      field: 'company_id',
      message: 'Company ID is required',
      code: 'REQUIRED_FIELD',
    });
  }

  if (!quote.customer_id) {
    errors.push({
      field: 'customer_id',
      message: 'Customer ID is required',
      code: 'REQUIRED_FIELD',
    });
  }

  if (!quote.quote_title || quote.quote_title.trim() === '') {
    errors.push({
      field: 'quote_title',
      message: 'Quote title is required',
      code: 'REQUIRED_FIELD',
    });
  }

  // Financial calculations
  if (
    quote.subtotal !== undefined &&
    quote.tax_amount !== undefined &&
    quote.discount_amount !== undefined &&
    quote.total_amount !== undefined
  ) {
    const calculatedTotal = quote.subtotal + quote.tax_amount - quote.discount_amount;
    const difference = Math.abs(calculatedTotal - quote.total_amount);

    if (difference > 0.01) {
      // Allow 1 cent rounding
      errors.push({
        field: 'total_amount',
        message: `Total amount (${quote.total_amount}) does not match calculation (${calculatedTotal.toFixed(2)})`,
        code: 'CALCULATION_MISMATCH',
      });
    }
  }

  // Negative values check
  if (quote.subtotal !== undefined && quote.subtotal < 0) {
    errors.push({
      field: 'subtotal',
      message: 'Subtotal cannot be negative',
      code: 'INVALID_VALUE',
    });
  }

  if (quote.total_amount !== undefined && quote.total_amount < 0) {
    errors.push({
      field: 'total_amount',
      message: 'Total amount cannot be negative',
      code: 'INVALID_VALUE',
    });
  }

  // Deposit validation
  if (quote.deposit_required !== undefined && quote.total_amount !== undefined) {
    if (quote.deposit_required > quote.total_amount) {
      errors.push({
        field: 'deposit_required',
        message: 'Deposit cannot exceed total amount',
        code: 'INVALID_VALUE',
      });
    }
  }

  // Valid until date
  if (quote.valid_until) {
    const validDate = new Date(quote.valid_until);
    const now = new Date();
    if (validDate < now) {
      warnings.push({
        field: 'valid_until',
        message: 'Quote expiration date is in the past',
        code: 'EXPIRED',
      });
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

export function validateInvoice(invoice: Partial<Invoice>): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  if (!invoice.company_id) {
    errors.push({
      field: 'company_id',
      message: 'Company ID is required',
      code: 'REQUIRED_FIELD',
    });
  }

  if (!invoice.customer_id) {
    errors.push({
      field: 'customer_id',
      message: 'Customer ID is required',
      code: 'REQUIRED_FIELD',
    });
  }

  // Financial calculations
  if (
    invoice.total_amount !== undefined &&
    invoice.amount_paid !== undefined &&
    invoice.amount_due !== undefined
  ) {
    const calculatedDue = invoice.total_amount - invoice.amount_paid;
    const difference = Math.abs(calculatedDue - invoice.amount_due);

    if (difference > 0.01) {
      errors.push({
        field: 'amount_due',
        message: `Amount due (${invoice.amount_due}) does not match calculation (${calculatedDue.toFixed(2)})`,
        code: 'CALCULATION_MISMATCH',
      });
    }
  }

  // Overpayment check
  if (invoice.amount_paid !== undefined && invoice.total_amount !== undefined) {
    if (invoice.amount_paid > invoice.total_amount) {
      warnings.push({
        field: 'amount_paid',
        message: 'Amount paid exceeds total amount (customer credit)',
        code: 'OVERPAYMENT',
      });
    }
  }

  // Date validation
  if (invoice.invoice_date && invoice.due_date) {
    const invoiceDate = new Date(invoice.invoice_date);
    const dueDate = new Date(invoice.due_date);

    if (dueDate < invoiceDate) {
      errors.push({
        field: 'due_date',
        message: 'Due date must be on or after invoice date',
        code: 'INVALID_DATE_RANGE',
      });
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

// ============================================================================
// WORK ORDER VALIDATION
// ============================================================================

export function validateWorkOrder(workOrder: Partial<WorkOrder>): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  if (!workOrder.company_id) {
    errors.push({
      field: 'company_id',
      message: 'Company ID is required',
      code: 'REQUIRED_FIELD',
    });
  }

  if (!workOrder.customer_id) {
    errors.push({
      field: 'customer_id',
      message: 'Customer ID is required',
      code: 'REQUIRED_FIELD',
    });
  }

  if (!workOrder.work_order_title || workOrder.work_order_title.trim() === '') {
    errors.push({
      field: 'work_order_title',
      message: 'Work order title is required',
      code: 'REQUIRED_FIELD',
    });
  }

  // Schedule validation
  if (workOrder.scheduled_start && workOrder.scheduled_end) {
    const start = new Date(workOrder.scheduled_start);
    const end = new Date(workOrder.scheduled_end);

    if (end < start) {
      errors.push({
        field: 'scheduled_end',
        message: 'Scheduled end must be after scheduled start',
        code: 'INVALID_DATE_RANGE',
      });
    }
  }

  // Actual time validation
  if (workOrder.actual_start && workOrder.actual_end) {
    const start = new Date(workOrder.actual_start);
    const end = new Date(workOrder.actual_end);

    if (end < start) {
      errors.push({
        field: 'actual_end',
        message: 'Actual end must be after actual start',
        code: 'INVALID_DATE_RANGE',
      });
    }
  }

  // Assignment validation
  if (!workOrder.assigned_to || workOrder.assigned_to.length === 0) {
    warnings.push({
      field: 'assigned_to',
      message: 'Work order has no assigned technicians',
      code: 'NO_ASSIGNMENT',
    });
  }

  // Completion validation
  if (workOrder.status === 'completed') {
    if (!workOrder.actual_end) {
      errors.push({
        field: 'actual_end',
        message: 'Actual end time required for completed work orders',
        code: 'REQUIRED_FOR_STATUS',
      });
    }

    if (!workOrder.completion_notes || workOrder.completion_notes.trim() === '') {
      warnings.push({
        field: 'completion_notes',
        message: 'Completion notes recommended for completed work orders',
        code: 'MISSING_RECOMMENDED',
      });
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

// ============================================================================
// HELPER UTILITIES
// ============================================================================

/**
 * Combine multiple validation results
 */
export function combineValidationResults(results: ValidationResult[]): ValidationResult {
  const allErrors: ValidationError[] = [];
  const allWarnings: ValidationWarning[] = [];

  results.forEach((result) => {
    allErrors.push(...result.errors);
    allWarnings.push(...result.warnings);
  });

  return {
    isValid: allErrors.length === 0,
    errors: allErrors,
    warnings: allWarnings,
  };
}

/**
 * Format validation result for display
 */
export function formatValidationMessage(result: ValidationResult): string {
  const messages: string[] = [];

  if (result.errors.length > 0) {
    messages.push('Errors:');
    result.errors.forEach((error) => {
      messages.push(`  • ${error.field}: ${error.message}`);
    });
  }

  if (result.warnings.length > 0) {
    messages.push('Warnings:');
    result.warnings.forEach((warning) => {
      messages.push(`  • ${warning.field}: ${warning.message}`);
    });
  }

  return messages.join('\n');
}
