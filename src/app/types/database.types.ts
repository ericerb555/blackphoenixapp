/**
 * Database Type Definitions
 * 
 * This file contains all TypeScript interfaces that map to Supabase database tables.
 * These types ensure type safety across the application and serve as documentation
 * for the database schema.
 */

// ============================================================================
// CORE BUSINESS ENTITIES
// ============================================================================

export interface Company {
  id: string;
  name: string;
  slug: string;
  is_primary: boolean;
  industry_type: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  country: string;
  phone: string;
  email: string;
  website: string;
  logo_url: string;
  tax_id: string;
  business_license: string;
  created_at: string;
  updated_at: string;
  is_active: boolean;
}

export interface CompanyMember {
  id: string;
  company_id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'manager' | 'technician' | 'subcontractor' | 'client';
  can_switch: boolean;
  permissions: Record<string, boolean>;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string;
  phone: string;
  role_id: string;
  is_master_admin: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserPermission {
  id: string;
  user_id: string;
  permission_key: string;
  granted: boolean;
  granted_by: string;
  granted_at: string;
}

// ============================================================================
// CUSTOMER & CLIENT MANAGEMENT
// ============================================================================

export interface Customer {
  id: string;
  company_id: string;
  customer_type: 'residential' | 'commercial' | 'institutional';
  first_name: string;
  last_name: string;
  company_name: string | null;
  email: string;
  phone: string;
  secondary_phone: string | null;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  country: string;
  latitude: number | null;
  longitude: number | null;
  notes: string;
  tags: string[];
  lead_source: string;
  customer_since: string;
  total_projects: number;
  total_revenue: number;
  credit_limit: number;
  payment_terms: string;
  preferred_contact_method: 'email' | 'phone' | 'sms' | 'portal';
  created_at: string;
  updated_at: string;
  is_active: boolean;
}

export interface Contact {
  id: string;
  customer_id: string;
  contact_type: 'primary' | 'secondary' | 'billing' | 'project_manager';
  first_name: string;
  last_name: string;
  title: string;
  email: string;
  phone: string;
  is_primary: boolean;
  can_approve_quotes: boolean;
  can_approve_changes: boolean;
  notes: string;
  created_at: string;
}

// ============================================================================
// ARCHITECTURE & DESIGN PROJECTS
// ============================================================================

export interface ArchitectureProject {
  id: string;
  company_id: string;
  customer_id: string;
  project_name: string;
  project_type: 'new_construction' | 'renovation' | 'addition' | 'remodel' | 'commercial';
  project_status: 'intake' | 'design' | 'review' | 'revision' | 'approved' | 'in_construction' | 'completed' | 'on_hold';
  priority_level: 'low' | 'medium' | 'high' | 'urgent';
  budget_min: number;
  budget_max: number;
  timeline: string;
  start_date: string | null;
  target_completion_date: string | null;
  actual_completion_date: string | null;
  assigned_designer: string | null;
  assigned_architect: string | null;
  architectural_style: string;
  interior_style: string;
  total_square_footage: number | null;
  lot_area: number | null;
  total_floors: number;
  created_at: string;
  updated_at: string;
}

export interface ProjectSiteInfo {
  id: string;
  project_id: string;
  site_address: string;
  city: string;
  state: string;
  zip_code: string;
  country: string;
  lot_width: number;
  lot_depth: number;
  lot_area: number;
  lot_shape: string;
  topography: 'flat' | 'slight_slope' | 'moderate_slope' | 'steep_slope' | 'hillside';
  orientation: 'north' | 'south' | 'east' | 'west' | 'northeast' | 'northwest' | 'southeast' | 'southwest';
  soil_type: string;
  flood_zone: string;
  existing_structures: string;
  zoning: string;
  zoning_restrictions: string;
  setback_front: number | null;
  setback_rear: number | null;
  setback_side: number | null;
  max_building_height: number | null;
  max_lot_coverage: number | null;
  utilities_available: string[];
  access_notes: string;
  created_at: string;
}

export interface ProjectBuildingProgram {
  id: string;
  project_id: string;
  total_floors: number;
  ceiling_height: number;
  structural_system: string;
  foundation_type: string;
  rooms: RoomRequirement[];
  special_features: string[];
  circulation_style: string;
  accessibility_needs: string[];
  load_bearing_notes: string;
  structural_constraints: string;
  created_at: string;
  updated_at: string;
}

export interface RoomRequirement {
  id: string;
  type: string;
  name: string;
  floor: number;
  min_sqft: number;
  max_sqft: number;
  target_sqft: number;
  natural_light: 'required' | 'preferred' | 'not_needed';
  adjacent_to: string[];
  features: string[];
  notes: string;
}

export interface ProjectStylePreferences {
  id: string;
  project_id: string;
  architectural_style: string;
  secondary_style: string | null;
  interior_style: string;
  color_palette: string;
  color_preferences: string[];
  flooring_preferences: string[];
  wall_finishes: string[];
  ceiling_finishes: string[];
  lighting_style: string;
  natural_light_priority: 'essential' | 'high' | 'medium' | 'low';
  inspiration_links: string[];
  inspiration_notes: string;
  created_at: string;
}

export interface ProjectRenderingRequirements {
  id: string;
  project_id: string;
  rendering_time_of_day: string[];
  rendering_views: string[];
  rendering_style: 'photorealistic' | 'artistic' | 'sketch' | 'technical';
  camera_angles: string[];
  include_landscaping: boolean;
  include_furniture: boolean;
  include_people: boolean;
  weather_conditions: string[];
  rendering_notes: string;
  created_at: string;
}

// ============================================================================
// CAD & FLOOR PLANNING
// ============================================================================

export interface FloorPlan {
  id: string;
  project_id: string;
  name: string;
  floor_level: number;
  unit_system: 'imperial' | 'metric';
  scale: string;
  total_area_sqft: number | null;
  bounds: {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
  };
  grid_settings: {
    show_grid: boolean;
    snap_to_grid: boolean;
    grid_size_inches: number;
    major_grid_interval: number;
  };
  version: number;
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface FloorPlanWall {
  id: string;
  floor_plan_id: string;
  start_x: number;
  start_y: number;
  end_x: number;
  end_y: number;
  thickness: number;
  wall_type: 'exterior' | 'interior' | 'partition';
  is_load_bearing: boolean;
  height: number;
  material: string;
  created_at: string;
}

export interface FloorPlanOpening {
  id: string;
  wall_id: string;
  opening_type: 'door' | 'window' | 'cased_opening' | 'sliding_door' | 'french_door';
  position_along_wall: number;
  width: number;
  height: number;
  sill_height: number;
  swing_direction: 'left' | 'right' | 'double' | 'none';
  rough_opening_width: number;
  rough_opening_height: number;
  created_at: string;
}

export interface FloorPlanRoom {
  id: string;
  floor_plan_id: string;
  room_name: string;
  room_type: string;
  points: Array<{ x: number; y: number }>;
  area_sqft: number;
  perimeter_ft: number;
  color_hex: string;
  created_at: string;
}

// ============================================================================
// KITCHEN DESIGN (NKBA Compliant)
// ============================================================================

export interface KitchenLayout {
  id: string;
  room_id: string;
  project_id: string;
  layout_type: 'one_wall' | 'galley' | 'l_shape' | 'u_shape' | 'island' | 'peninsula';
  cabinet_style: string;
  countertop_material: string;
  backsplash_style: string;
  appliance_brand: string;
  has_island: boolean;
  island_width: number | null;
  island_length: number | null;
  work_triangle_sink: { x: number; y: number } | null;
  work_triangle_range: { x: number; y: number } | null;
  work_triangle_refrigerator: { x: number; y: number } | null;
  work_triangle_total_distance: number | null;
  validation_status: 'valid' | 'warning' | 'invalid' | 'not_validated';
  validation_messages: string[];
  nkba_compliance_score: number;
  created_at: string;
  updated_at: string;
}

export interface CabinetCatalog {
  id: string;
  company_id: string | null;
  manufacturer: string;
  product_line: string;
  cabinet_type: 'base' | 'wall' | 'tall' | 'corner_base' | 'sink_base' | 'drawer_base' | 'specialty';
  cabinet_code: string;
  name: string;
  description: string;
  default_width_inches: number;
  depth_inches: number;
  height_inches: number;
  standard_widths: number[];
  has_fillers: boolean;
  filler_width_range: [number, number];
  price: number;
  lead_time_days: number;
  thumbnail_url: string;
  spec_sheet_url: string;
  is_active: boolean;
  created_at: string;
}

export interface KitchenCabinet {
  id: string;
  kitchen_layout_id: string;
  catalog_id: string;
  cabinet_type: string;
  cabinet_code: string;
  x_position: number;
  y_position: number;
  rotation: number;
  width: number;
  depth: number;
  height: number;
  wall_id: string | null;
  position_along_wall: number | null;
  left_filler: number;
  right_filler: number;
  run_number: number;
  sequence_in_run: number;
  created_at: string;
}

export interface KitchenAppliance {
  id: string;
  kitchen_layout_id: string;
  appliance_type: 'refrigerator' | 'range' | 'dishwasher' | 'microwave' | 'oven' | 'cooktop' | 'hood';
  brand: string;
  model: string;
  x_position: number;
  y_position: number;
  width: number;
  depth: number;
  rotation: number;
  is_work_triangle_vertex: boolean;
  requires_ventilation: boolean;
  electrical_requirements: string;
  gas_requirements: string;
  created_at: string;
}

export interface KitchenLayoutRule {
  id: string;
  rule_code: string;
  rule_name: string;
  description: string;
  rule_category: 'work_triangle' | 'clearance' | 'accessibility' | 'safety' | 'ergonomics';
  min_value: number | null;
  max_value: number | null;
  unit: string;
  severity: 'error' | 'warning' | 'info';
  nkba_reference: string;
  is_active: boolean;
  created_at: string;
}

// ============================================================================
// COMPUTER VISION & MEASUREMENT
// ============================================================================

export interface CVMeasurementWorkflow {
  id: string;
  company_id: string;
  workflow_name: string;
  workflow_type: 'room_scan' | 'object_measure' | 'floor_plan_extract' | 'elevation_capture';
  description: string;
  detection_config: {
    model: string;
    confidence_threshold: number;
    nms_threshold: number;
    target_classes: string[];
  };
  calibration_method: 'reference_object' | 'known_dimension' | 'aruco_marker' | 'depth_sensor';
  reference_objects: Array<{
    name: string;
    width_inches: number;
    height_inches: number;
  }>;
  edge_detection_params: {
    algorithm: string;
    low_threshold: number;
    high_threshold: number;
    aperture_size: number;
  };
  perspective_correction: {
    enabled: boolean;
    auto_detect_corners: boolean;
    vanishing_point_method: string;
  };
  line_detection_params: {
    algorithm: string;
    rho: number;
    theta: number;
    threshold: number;
    min_line_length: number;
    max_line_gap: number;
  };
  measurement_algorithms: {
    primary: string;
    fallback: string;
    unit: string;
    precision: number;
  };
  accuracy_thresholds: {
    excellent: number;
    good: number;
    acceptable: number;
    minimum_confidence: number;
  };
  preprocessing_steps: Array<{
    step: string;
    params: Record<string, unknown>;
  }>;
  output_config: {
    include_annotated_image: boolean;
    include_measurements_overlay: boolean;
    export_formats: string[];
  };
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CVMeasurementSession {
  id: string;
  project_id: string;
  workflow_id: string;
  session_name: string;
  session_type: string;
  uploaded_images: Array<{
    url: string;
    filename: string;
    size: number;
    uploaded_at: string;
  }>;
  calibration_data: Record<string, unknown>;
  measurements: Array<{
    id: string;
    label: string;
    value: number;
    unit: string;
    confidence: number;
    coordinates: number[][];
  }>;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  processed_at: string | null;
  created_by: string;
  created_at: string;
}

// ============================================================================
// AI PROMPT TEMPLATES
// ============================================================================

export interface AIPromptTemplate {
  id: string;
  company_id: string | null;
  template_name: string;
  template_type: 'floor_plan' | 'kitchen' | 'structural' | 'rendering' | 'wireframe';
  category: string;
  base_prompt: string;
  system_context: string;
  style_modifiers: Record<string, string>;
  room_prompts: Record<string, string>;
  dimension_prompts: Record<string, string>;
  output_format: Record<string, unknown>;
  variables: Array<{
    name: string;
    type: 'text' | 'number' | 'select' | 'multiselect' | 'array' | 'boolean';
    options?: string[];
    min?: number;
    max?: number;
    default?: unknown;
  }>;
  examples: Array<{
    input: Record<string, unknown>;
    output: string;
  }>;
  is_active: boolean;
  version: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface AIGenerationJob {
  id: string;
  project_id: string;
  template_id: string;
  input_data: Record<string, unknown>;
  prompt_used: string;
  model: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  output_data: Record<string, unknown> | null;
  output_url: string | null;
  error_message: string | null;
  processing_time_ms: number | null;
  tokens_used: number | null;
  cost: number | null;
  created_by: string;
  created_at: string;
  completed_at: string | null;
}

// ============================================================================
// QUOTES & ESTIMATES
// ============================================================================

export interface Quote {
  id: string;
  company_id: string;
  customer_id: string;
  project_id: string | null;
  quote_number: string;
  quote_title: string;
  quote_status: 'draft' | 'pending' | 'sent' | 'viewed' | 'accepted' | 'rejected' | 'expired' | 'revised';
  quote_type: 'design_only' | 'design_build' | 'consultation' | 'hourly' | 'fixed_price';
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  deposit_required: number;
  deposit_percentage: number;
  payment_terms: string;
  valid_until: string;
  notes: string;
  terms_and_conditions: string;
  created_by: string;
  sent_at: string | null;
  viewed_at: string | null;
  accepted_at: string | null;
  rejected_at: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface QuoteLineItem {
  id: string;
  quote_id: string;
  line_type: 'service' | 'material' | 'labor' | 'equipment' | 'subcontractor' | 'misc';
  item_name: string;
  description: string;
  quantity: number;
  unit: string;
  unit_price: number;
  markup_percentage: number;
  discount_percentage: number;
  line_total: number;
  notes: string;
  sort_order: number;
  is_optional: boolean;
  created_at: string;
}

// ============================================================================
// WORK ORDERS & SCHEDULING
// ============================================================================

export interface WorkOrder {
  id: string;
  company_id: string;
  project_id: string;
  customer_id: string;
  quote_id: string | null;
  work_order_number: string;
  work_order_title: string;
  work_order_type: 'service' | 'installation' | 'repair' | 'maintenance' | 'inspection';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'draft' | 'scheduled' | 'in_progress' | 'on_hold' | 'completed' | 'cancelled';
  scheduled_start: string | null;
  scheduled_end: string | null;
  actual_start: string | null;
  actual_end: string | null;
  assigned_to: string[];
  location: string;
  scope_of_work: string;
  special_instructions: string;
  required_equipment: string[];
  required_materials: string[];
  completion_notes: string | null;
  customer_signature: string | null;
  customer_signature_date: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface WorkOrderTask {
  id: string;
  work_order_id: string;
  task_name: string;
  description: string;
  assigned_to: string | null;
  estimated_hours: number;
  actual_hours: number | null;
  status: 'pending' | 'in_progress' | 'completed' | 'blocked';
  dependencies: string[];
  sort_order: number;
  completed_at: string | null;
  completed_by: string | null;
  notes: string;
  created_at: string;
}

// ============================================================================
// INVOICING & PAYMENTS
// ============================================================================

export interface Invoice {
  id: string;
  company_id: string;
  customer_id: string;
  project_id: string | null;
  quote_id: string | null;
  work_order_id: string | null;
  invoice_number: string;
  invoice_date: string;
  due_date: string;
  invoice_status: 'draft' | 'sent' | 'viewed' | 'partial' | 'paid' | 'overdue' | 'cancelled';
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  amount_paid: number;
  amount_due: number;
  payment_terms: string;
  notes: string;
  sent_at: string | null;
  paid_at: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface InvoiceLineItem {
  id: string;
  invoice_id: string;
  line_type: 'service' | 'material' | 'labor' | 'equipment' | 'subcontractor' | 'misc';
  item_name: string;
  description: string;
  quantity: number;
  unit: string;
  unit_price: number;
  line_total: number;
  sort_order: number;
  created_at: string;
}

export interface Payment {
  id: string;
  invoice_id: string;
  payment_method: 'cash' | 'check' | 'credit_card' | 'ach' | 'wire' | 'other';
  payment_amount: number;
  payment_date: string;
  transaction_id: string | null;
  reference_number: string | null;
  notes: string;
  processed_by: string;
  created_at: string;
}

// ============================================================================
// SUBCONTRACTOR MANAGEMENT
// ============================================================================

export interface Subcontractor {
  id: string;
  company_id: string;
  business_name: string;
  contact_name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  trade_specialties: string[];
  license_number: string;
  insurance_expiration: string;
  w9_on_file: boolean;
  rating: number;
  total_jobs: number;
  total_revenue: number;
  payment_terms: string;
  preferred_vendor: boolean;
  notes: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SubcontractorQuote {
  id: string;
  subcontractor_id: string;
  project_id: string;
  quote_request_id: string;
  quote_amount: number;
  estimated_hours: number;
  estimated_start_date: string;
  estimated_completion_date: string;
  scope_of_work: string;
  materials_included: boolean;
  equipment_included: boolean;
  warranty_terms: string;
  payment_schedule: string;
  status: 'pending' | 'submitted' | 'under_review' | 'accepted' | 'rejected';
  submitted_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
  notes: string;
  created_at: string;
}

// ============================================================================
// DOCUMENTS & MEDIA
// ============================================================================

export interface Document {
  id: string;
  company_id: string;
  related_to_type: 'project' | 'customer' | 'quote' | 'invoice' | 'work_order' | 'subcontractor';
  related_to_id: string;
  document_type: 'contract' | 'permit' | 'plan' | 'specification' | 'photo' | 'report' | 'invoice' | 'receipt' | 'other';
  file_name: string;
  file_url: string;
  file_size: number;
  mime_type: string;
  description: string;
  uploaded_by: string;
  is_public: boolean;
  tags: string[];
  version: number;
  created_at: string;
}

// ============================================================================
// AUDIT & LOGGING
// ============================================================================

export interface SecurityAuditLog {
  id: string;
  user_id: string | null;
  company_id: string | null;
  event_type: string;
  event_category: 'auth' | 'data' | 'system' | 'security';
  event_details: Record<string, unknown>;
  ip_address: string;
  user_agent: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  created_at: string;
}

export interface CompanyContextLog {
  id: string;
  user_id: string;
  from_company_id: string | null;
  to_company_id: string;
  switch_reason: string;
  ip_address: string;
  created_at: string;
}

export interface ActiveCompanySession {
  id: string;
  user_id: string;
  company_id: string;
  session_started_at: string;
  last_activity_at: string;
  is_active: boolean;
}

// ============================================================================
// MODULE CONFIGURATIONS
// ============================================================================

export interface ModuleConfiguration {
  id: string;
  company_id: string;
  module_name: string;
  is_enabled: boolean;
  settings: Record<string, unknown>;
  permissions: Record<string, string[]>;
  created_at: string;
  updated_at: string;
}

export interface DashboardConfiguration {
  id: string;
  user_id: string;
  company_id: string;
  role: string;
  layout: Record<string, unknown>;
  widgets: Array<{
    id: string;
    type: string;
    position: { x: number; y: number };
    size: { w: number; h: number };
    config: Record<string, unknown>;
  }>;
  theme_overrides: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}
