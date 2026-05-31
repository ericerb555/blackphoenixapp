# Data Flow Architecture

This document describes how data flows through the enterprise business management application, from user input to storage and across different modules.

## Core Data Flow Patterns

### 1. Project Lifecycle Flow

```
Client Work Request Form (Intake)
    ↓
Architecture Project Record
    ↓
├── Project Site Info
├── Building Program (Room Requirements)
├── Style Preferences
└── Rendering Requirements
    ↓
Design Modules (Parallel Processing)
    ├── Floor Plan Engine
    ├── Kitchen Cabinet Designer
    ├── CV Measurement Workflow
    └── AI Prompt Template Designer
    ↓
Quote Creation
    ↓
Work Orders
    ↓
Invoicing
    ↓
Payment & Completion
```

### 2. Authentication & Authorization Flow

```
User Login
    ↓
Auth Context (User Session)
    ↓
├── User Permissions Check
├── Company Memberships Fetch
└── Role Assignment
    ↓
Company Context (Active Company)
    ↓
View Mode Context (Preview Mode Support)
    ↓
Protected Routes
    ↓
Module Access Control
```

### 3. Multi-Company Data Isolation

```
User Request
    ↓
Company Context (activeCompanyId)
    ↓
Company Scope Utilities
    ↓
Database Query with RLS
    ↓
├── .eq('company_id', activeCompanyId)
└── Row Level Security Policies
    ↓
Filtered Data Response
```

## Module-Specific Data Flows

### Client Work Request Form → Database

**Input:** User fills comprehensive intake form  
**Process:**
1. Form validation (client-side)
2. Data transformation to match database schema
3. Multiple table inserts (transaction)

**Output Tables:**
- `architecture_projects` (main project record)
- `project_site_info` (lot and location details)
- `project_building_programs` (rooms and spatial requirements)
- `project_style_preferences` (design preferences)
- `project_rendering_requirements` (visualization needs)

**Data Structure:**
```typescript
FormData (100+ fields)
    ├── Project Info → architecture_projects
    ├── Site Info → project_site_info
    ├── Room Requirements → project_building_programs.rooms[]
    ├── Style Preferences → project_style_preferences
    └── Rendering → project_rendering_requirements
```

### Floor Plan Engine → Database

**Input:** User draws walls, rooms, openings  
**Process:**
1. Canvas interactions captured
2. Geometric calculations (area, perimeter)
3. Validation (overlaps, constraints)
4. Batch save operation

**Output Tables:**
- `floor_plans` (plan metadata)
- `floor_plan_walls` (wall geometry)
- `floor_plan_openings` (doors, windows)
- `floor_plan_rooms` (room polygons)

**Data Flow:**
```typescript
Canvas Interactions
    ↓
Wall[] + Room[] + Opening[] (in-memory state)
    ↓
Geometric Calculations
    ├── calculateArea()
    ├── findIntersections()
    └── validateConstraints()
    ↓
Database Transaction
    ├── DELETE existing walls/rooms
    ├── INSERT walls
    ├── INSERT openings (foreign key to walls)
    ├── INSERT rooms
    └── UPDATE floor_plan.total_area_sqft
```

### Kitchen Cabinet Designer → Database

**Input:** User places cabinets and appliances  
**Process:**
1. Load cabinet catalog
2. Load NKBA validation rules
3. Place items on canvas
4. Real-time work triangle validation
5. NKBA compliance checking
6. Save layout

**Output Tables:**
- `kitchen_layouts` (layout metadata + work triangle)
- `kitchen_cabinets` (placed cabinets)
- `kitchen_appliances` (placed appliances)

**Data Flow:**
```typescript
User Interaction
    ↓
Load Catalog & Rules
    ├── cabinet_catalog (products)
    └── kitchen_layout_rules (NKBA standards)
    ↓
Place Items
    ├── PlacedCabinet[] (position, size, fillers)
    └── Appliance[] (position, type)
    ↓
Real-time Validation
    ├── calculateWorkTriangle()
    ├── checkClearances()
    ├── validateNKBA()
    └── generateViolations[]
    ↓
Save to Database
    ├── kitchen_layouts (work_triangle JSON, validation_status)
    ├── kitchen_cabinets (all placed cabinets)
    └── kitchen_appliances (all appliances)
```

### Computer Vision Measurement → Database

**Input:** User uploads photos, configures workflow  
**Process:**
1. Configure CV workflow parameters
2. Upload images
3. Process images (server-side or API)
4. Extract measurements
5. Store results

**Output Tables:**
- `cv_measurement_workflows` (workflow configuration)
- `cv_measurement_sessions` (session data)
- `project_measurements` (extracted dimensions)

**Data Flow:**
```typescript
Workflow Configuration
    ├── detection_config (model, thresholds)
    ├── calibration_method
    ├── edge_detection_params
    ├── perspective_correction
    └── measurement_algorithms
    ↓
Image Upload
    ├── uploaded_images[] (URLs, metadata)
    └── calibration_data (reference objects)
    ↓
Processing (Mock or Real API)
    ├── detect edges
    ├── correct perspective
    ├── calculate measurements
    └── generate confidence scores
    ↓
Results Storage
    ├── measurements[] (label, value, confidence)
    ├── status (completed/failed)
    └── processed_at timestamp
```

### AI Prompt Template Designer → AI Generation

**Input:** User creates/edits prompt templates  
**Process:**
1. Define base prompt with variables
2. Configure output format
3. Test template with sample data
4. Save versioned template
5. Use template for generation jobs

**Output Tables:**
- `ai_prompt_templates` (template definitions)
- `ai_generation_jobs` (generation requests/results)

**Data Flow:**
```typescript
Template Design
    ├── base_prompt (template string)
    ├── system_context (AI instructions)
    ├── variables[] (dynamic inputs)
    ├── style_modifiers{}
    └── output_format{}
    ↓
Template Testing
    ├── input_data (test values)
    ├── compile prompt
    └── preview output
    ↓
Template Save
    ├── version++
    └── ai_prompt_templates
    ↓
Generation Job
    ├── select template
    ├── provide input_data
    ├── generate prompt_used
    └── ai_generation_jobs
    ↓
AI Processing (External)
    ├── call AI API
    ├── track tokens/cost
    └── store output_data
```

## Quote & Work Order Flow

### Quote Creation Process

```typescript
Project Data
    ├── floor_plans
    ├── kitchen_layouts
    ├── cv_measurements
    └── customer requirements
    ↓
Quote Builder
    ├── select services
    ├── calculate materials (from floor plans)
    ├── estimate labor hours
    ├── add markup
    └── apply discount
    ↓
Quote Record
    ├── quote (header)
    ├── quote_line_items[] (details)
    └── quote_status: 'draft'
    ↓
Send to Customer
    ├── generate PDF
    ├── send email
    └── quote_status: 'sent'
    ↓
Customer Response
    ├── viewed_at timestamp
    ├── accepted/rejected
    └── quote_status: 'accepted'
    ↓
Convert to Work Order
```

### Work Order to Invoice Flow

```typescript
Accepted Quote
    ↓
Create Work Order
    ├── work_order (header)
    ├── work_order_tasks[]
    ├── scheduled_start/end
    └── assigned_to[]
    ↓
Task Execution
    ├── update task status
    ├── track actual_hours
    └── add completion_notes
    ↓
Work Order Completion
    ├── customer_signature
    ├── completion_notes
    └── status: 'completed'
    ↓
Generate Invoice
    ├── invoice (header)
    ├── invoice_line_items[] (from quote or actuals)
    ├── calculate totals
    └── invoice_status: 'sent'
    ↓
Payment Processing
    ├── payment records
    ├── update amount_paid
    └── invoice_status: 'paid'
```

## Subcontractor Integration

```typescript
Project Requirements
    ↓
Subcontractor Quote Request
    ├── scope_of_work
    ├── required_dates
    └── specifications
    ↓
Subcontractor Portal Access
    ├── receive notification
    ├── view project details
    └── submit quote
    ↓
Subcontractor Quote
    ├── subcontractor_quotes table
    ├── quote_amount
    ├── timeline
    └── status: 'submitted'
    ↓
Quote Review & Acceptance
    ├── compare quotes
    ├── select subcontractor
    └── status: 'accepted'
    ↓
Work Order Assignment
    ├── assigned_to[] includes subcontractor
    └── subcontractor notification
```

## Data Relationships & Foreign Keys

### Primary Relationships

```
companies
    └── company_id (RLS pivot)
        ├── customers
        ├── architecture_projects
        ├── quotes
        ├── work_orders
        ├── invoices
        ├── subcontractors
        └── company_members

architecture_projects
    └── project_id
        ├── project_site_info
        ├── project_building_programs
        ├── project_style_preferences
        ├── project_rendering_requirements
        ├── floor_plans
        ├── cv_measurement_sessions
        ├── ai_generation_jobs
        ├── quotes
        └── work_orders

floor_plans
    └── floor_plan_id
        ├── floor_plan_walls
        │   └── wall_id
        │       └── floor_plan_openings
        ├── floor_plan_rooms
        └── kitchen_layouts (via room_id)

kitchen_layouts
    └── kitchen_layout_id
        ├── kitchen_cabinets
        └── kitchen_appliances

quotes
    └── quote_id
        ├── quote_line_items
        └── invoices (optional link)

work_orders
    └── work_order_id
        ├── work_order_tasks
        └── invoices (optional link)

invoices
    └── invoice_id
        ├── invoice_line_items
        └── payments
```

## Context Providers & State Management

### Auth Context State
```typescript
{
  user: User | null,
  session: Session | null,
  userRole: UserRole | null,
  companyContext: {
    activeCompany: CompanyContext | null,
    availableCompanies: CompanyMembership[],
    canSwitchCompany: boolean,
    isCompanyOwner: boolean,
    isCompanyAdmin: boolean
  }
}
```

### Company Context State
```typescript
{
  activeCompanyId: string | null,
  companies: Company[],
  activeCompany: Company | null,
  isSwitching: boolean
}
```

### View Mode Context State (Preview Mode)
```typescript
{
  isPreviewMode: boolean,
  previewRole: string | null,
  previewUserId: string | null,
  originalRole: string | null,
  canEnterPreviewMode: boolean
}
```

## Data Access Patterns

### Read Operations
1. Check Auth Context (user logged in?)
2. Get Active Company ID from Company Context
3. Query with company_id filter
4. Return scoped data

### Write Operations
1. Check Auth Context (user logged in?)
2. Check Permissions (can user perform action?)
3. Get Active Company ID
4. Insert/Update with company_id
5. Log to audit tables

### Company Switching
1. User selects different company
2. Verify user is member of target company
3. Log switch to `company_context_logs`
4. Update `active_company_sessions`
5. Reload permissions for new company
6. Refresh UI with new company data

## Module Integration Points

### How Modules Share Data

**Example: Kitchen Designer uses Floor Plan data**
```typescript
1. User creates floor plan in Floor Plan Engine
2. Saves walls, rooms to database
3. User opens Kitchen Cabinet Designer
4. Designer loads floor_plan_rooms where room_type = 'kitchen'
5. Uses room boundary points as kitchen boundary
6. User designs kitchen layout
7. Saves kitchen_layouts with room_id reference
8. Kitchen layout is now linked to specific room in floor plan
```

**Example: Quote uses multiple module outputs**
```typescript
1. Load project with project_id
2. Fetch floor_plans.total_area_sqft
3. Fetch kitchen_layouts with cabinet counts
4. Fetch cv_measurement_sessions for precise dimensions
5. Calculate materials needed
6. Generate quote_line_items
7. Apply pricing from catalog
8. Create quote record
```

## Important Data Integrity Rules

### Cascade Deletes
- Delete project → cascade to floor_plans, quotes, work_orders
- Delete floor_plan → cascade to walls, rooms, openings
- Delete kitchen_layout → cascade to cabinets, appliances
- Delete quote → cascade to line_items
- Delete work_order → cascade to tasks

### Required Fields
- All company-scoped tables MUST have company_id
- All versioned records MUST have created_at, updated_at
- All financial records MUST have audit trail (created_by)

### Data Validation
- Floor plan area calculations must match room totals
- Kitchen work triangle must be validated before save
- Quote totals must equal sum of line items
- Invoice amount_due = total_amount - amount_paid

## Performance Considerations

### Indexes Needed
```sql
-- Company scoping (most important)
CREATE INDEX idx_projects_company ON architecture_projects(company_id);
CREATE INDEX idx_customers_company ON customers(company_id);
CREATE INDEX idx_quotes_company ON quotes(company_id);

-- Foreign key lookups
CREATE INDEX idx_floor_plans_project ON floor_plans(project_id);
CREATE INDEX idx_walls_floor_plan ON floor_plan_walls(floor_plan_id);
CREATE INDEX idx_openings_wall ON floor_plan_openings(wall_id);
CREATE INDEX idx_cabinets_layout ON kitchen_cabinets(kitchen_layout_id);

-- Status filtering
CREATE INDEX idx_quotes_status ON quotes(quote_status);
CREATE INDEX idx_work_orders_status ON work_orders(status);
CREATE INDEX idx_invoices_status ON invoices(invoice_status);

-- Date range queries
CREATE INDEX idx_invoices_date ON invoices(invoice_date);
CREATE INDEX idx_work_orders_scheduled ON work_orders(scheduled_start);
```

### Batch Operations
- Floor plan saves use transactions (delete old + insert new)
- Kitchen layouts batch insert cabinets and appliances
- Quote line items inserted in single batch
- Audit logs buffered and batch inserted

### Lazy Loading
- Load project summary first
- Load related data (floor plans, quotes) on demand
- Paginate large lists (customers, projects, invoices)
- Use virtual scrolling for cabinet catalogs
