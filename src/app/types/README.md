# Data Architecture Documentation

This directory contains the complete data architecture for the enterprise business management application specialized in architecture, construction, and kitchen/bath design.

## 📁 File Overview

### `database.types.ts`
**Complete TypeScript type definitions for all database tables.**

Contains interfaces for:
- Core business entities (Company, Customer, User)
- Architecture projects and related data
- CAD and floor planning (FloorPlan, Wall, Room, Opening)
- Kitchen design with NKBA compliance (KitchenLayout, Cabinet, Appliance)
- Computer vision measurement workflows
- AI prompt templates
- Financial records (Quote, Invoice, Payment)
- Work orders and scheduling
- Subcontractor management
- Documents and audit logs

**Usage:**
```typescript
import type { ArchitectureProject, FloorPlan, KitchenLayout } from './types/database.types';
```

### `data-flow.md`
**Comprehensive documentation of how data flows through the application.**

Covers:
- Project lifecycle from intake to completion
- Authentication and authorization flow
- Multi-company data isolation (RLS)
- Module-specific data flows
- Data relationships and foreign keys
- Context providers and state management
- Performance considerations and indexing

**Read this to understand:**
- How modules interact and share data
- Which tables are related to each other
- How to query data efficiently
- What indexes are needed

### `dataValidation.ts` (lib/)
**Centralized validation logic for all data types.**

Functions for validating:
- Architecture projects and room requirements
- Floor plans, walls, and rooms
- Kitchen layouts and NKBA work triangle rules
- Quotes, invoices, and work orders
- Financial calculations

**Usage:**
```typescript
import { validateArchitectureProject, validateKitchenLayout } from '../lib/dataValidation';

const validation = validateArchitectureProject(projectData);
if (!validation.isValid) {
  console.error('Validation errors:', validation.errors);
  console.warn('Warnings:', validation.warnings);
}
```

**Benefits:**
- Catch data errors before database insert
- Ensure NKBA compliance for kitchen designs
- Validate financial calculations
- Provide user-friendly error messages

### `dataTransforms.ts` (lib/)
**Data transformation utilities for converting between module formats.**

Functions for:
- Client Work Request Form → Database records
- Floor Plan → Quote line items (material estimates)
- Kitchen Layout → Quote line items (cost estimates)
- Quote → Invoice
- Financial calculations and totals

**Usage:**
```typescript
import { transformWorkRequestToProject, calculateQuoteTotals } from '../lib/dataTransforms';

// Transform form data to database format
const projectData = transformWorkRequestToProject(formData, companyId, customerId);

// Calculate quote totals from line items
const totals = calculateQuoteTotals(lineItems, 0.08); // 8% tax
```

**Benefits:**
- Consistent data transformation logic
- Automatic material and cost estimation
- Financial calculations with proper rounding
- Type-safe conversions

### `data-usage-examples.ts`
**Real-world examples of using the data architecture.**

Complete examples of:
1. Submitting client work request form
2. Creating quote from project data
3. Converting quote to invoice
4. Validating kitchen layout before save
5. Fetching complete project data
6. Batch validation
7. Complete project lifecycle

**Read this to learn:**
- How to combine validation + transformation + database operations
- Proper error handling patterns
- Multi-step workflows with rollback
- Company scoping and RLS implementation

## 🔄 Data Flow Patterns

### Pattern 1: User Input → Database

```
User Form Input
    ↓
Validate Data (dataValidation.ts)
    ↓
Transform to DB Format (dataTransforms.ts)
    ↓
Check Company Scope (CompanyContext)
    ↓
Insert to Supabase
    ↓
Log Audit Trail
```

### Pattern 2: Module → Module Data Sharing

```
Floor Plan Engine
    ↓ Saves to database
floor_plans table
    ↓ Foreign key reference
kitchen_layouts.room_id
    ↓ Read by
Kitchen Cabinet Designer
```

### Pattern 3: Quote Generation from Multiple Sources

```
Architecture Project
    ├── Floor Plans → Material Estimates
    ├── Kitchen Layouts → Cabinet Costs
    ├── CV Measurements → Labor Hours
    └── AI Generations → Design Fees
            ↓
        Quote Line Items
            ↓
        Calculate Totals
            ↓
        Quote Record
```

## 🛡️ Data Integrity Rules

### Required for ALL Company-Scoped Tables
- `company_id` (for multi-company isolation)
- `created_at` (timestamp)
- `updated_at` (timestamp for versioned records)

### Foreign Key Relationships
```
companies (1) ─── (many) architecture_projects
architecture_projects (1) ─── (many) floor_plans
floor_plans (1) ─── (many) floor_plan_walls
floor_plan_walls (1) ─── (many) floor_plan_openings
floor_plans (1) ─── (many) floor_plan_rooms
floor_plan_rooms (1) ─── (1) kitchen_layouts
kitchen_layouts (1) ─── (many) kitchen_cabinets
kitchen_layouts (1) ─── (many) kitchen_appliances
architecture_projects (1) ─── (many) quotes
quotes (1) ─── (many) quote_line_items
quotes (1) ─── (1) invoices
invoices (1) ─── (many) invoice_line_items
invoices (1) ─── (many) payments
```

### Cascade Delete Behavior
When deleting a parent record, all child records should be deleted:
- Delete project → delete floor_plans, quotes, work_orders, invoices
- Delete floor_plan → delete walls, rooms, openings
- Delete quote → delete line_items
- Delete invoice → delete line_items, payments

## 🎯 Best Practices

### 1. Always Validate Before Insert
```typescript
const validation = validateArchitectureProject(data);
if (!validation.isValid) {
  return { success: false, errors: validation.errors };
}
// Safe to insert
await supabase.from('architecture_projects').insert(data);
```

### 2. Use Transactions for Multi-Table Operations
```typescript
// Delete old records and insert new ones atomically
await supabase.from('kitchen_cabinets').delete().eq('kitchen_layout_id', layoutId);
await supabase.from('kitchen_cabinets').insert(newCabinets);
```

### 3. Always Include Company Scoping
```typescript
const { data } = await supabase
  .from('architecture_projects')
  .select('*')
  .eq('company_id', activeCompanyId); // Essential for multi-company apps
```

### 4. Log Important Events
```typescript
await supabase.from('security_audit_log').insert({
  user_id: userId,
  company_id: companyId,
  event_type: 'project_created',
  event_category: 'data',
  event_details: { project_id: newProject.id },
  severity: 'info',
});
```

### 5. Use Type Imports for Better Performance
```typescript
import type { ArchitectureProject } from './types/database.types';
// Not:
import { ArchitectureProject } from './types/database.types';
```

## 🔍 Common Queries

### Fetch Project with All Related Data
```typescript
const [project, siteInfo, floorPlans] = await Promise.all([
  supabase.from('architecture_projects').select('*').eq('id', projectId).single(),
  supabase.from('project_site_info').select('*').eq('project_id', projectId).single(),
  supabase.from('floor_plans').select('*').eq('project_id', projectId),
]);
```

### Fetch Floor Plan with Walls and Openings
```typescript
const { data } = await supabase
  .from('floor_plan_walls')
  .select('*, floor_plan_openings(*)')
  .eq('floor_plan_id', planId);
```

### Get Kitchen Layout with Cabinets and Appliances
```typescript
const { data } = await supabase
  .from('kitchen_layouts')
  .select('*, kitchen_cabinets(*), kitchen_appliances(*)')
  .eq('id', layoutId)
  .single();
```

### Calculate Project Financial Summary
```typescript
const { data: invoices } = await supabase
  .from('invoices')
  .select('total_amount, amount_paid')
  .eq('project_id', projectId);

const totalInvoiced = invoices.reduce((sum, inv) => sum + inv.total_amount, 0);
const totalPaid = invoices.reduce((sum, inv) => sum + inv.amount_paid, 0);
```

## 🚀 Performance Tips

### Use Indexes (Should be created in Supabase)
```sql
-- Company scoping (critical)
CREATE INDEX idx_projects_company ON architecture_projects(company_id);
CREATE INDEX idx_floor_plans_company ON floor_plans(company_id);

-- Foreign keys (important for joins)
CREATE INDEX idx_floor_plans_project ON floor_plans(project_id);
CREATE INDEX idx_walls_floor_plan ON floor_plan_walls(floor_plan_id);

-- Status filtering (for dashboards)
CREATE INDEX idx_quotes_status ON quotes(quote_status);
CREATE INDEX idx_work_orders_status ON work_orders(status);
```

### Batch Operations
```typescript
// Good: Single insert with array
await supabase.from('kitchen_cabinets').insert(allCabinets);

// Bad: Multiple individual inserts
for (const cabinet of allCabinets) {
  await supabase.from('kitchen_cabinets').insert(cabinet);
}
```

### Lazy Load Related Data
```typescript
// Load project summary first (fast)
const project = await fetchProject(projectId);

// Load related data on demand (when user clicks tabs)
const floorPlans = await fetchFloorPlans(projectId); // Only when needed
```

## 📊 Module Data Dependencies

### Client Work Request Form
**Writes to:**
- `architecture_projects`
- `project_site_info`
- `project_building_programs`
- `project_style_preferences`
- `project_rendering_requirements`

**Reads from:** None (it's the entry point)

### Floor Plan Engine
**Writes to:**
- `floor_plans`
- `floor_plan_walls`
- `floor_plan_openings`
- `floor_plan_rooms`

**Reads from:**
- `architecture_projects` (to link floor plan)

### Kitchen Cabinet Designer
**Writes to:**
- `kitchen_layouts`
- `kitchen_cabinets`
- `kitchen_appliances`

**Reads from:**
- `cabinet_catalog` (product library)
- `kitchen_layout_rules` (NKBA rules)
- `floor_plan_rooms` (kitchen boundary)

### Computer Vision Workflow
**Writes to:**
- `cv_measurement_workflows` (configuration)
- `cv_measurement_sessions` (results)

**Reads from:**
- `architecture_projects` (to link measurements)

### AI Prompt Template Designer
**Writes to:**
- `ai_prompt_templates` (templates)
- `ai_generation_jobs` (generation requests)

**Reads from:**
- `architecture_projects` (for context)
- `project_building_programs` (for room data)

### Quote Creation
**Writes to:**
- `quotes`
- `quote_line_items`

**Reads from:**
- `architecture_projects`
- `floor_plans` (for material estimates)
- `kitchen_layouts` (for cabinet costs)
- `customers` (customer info)

### Work Orders
**Writes to:**
- `work_orders`
- `work_order_tasks`

**Reads from:**
- `quotes` (can be created from quote)
- `architecture_projects`
- `customers`

### Invoicing
**Writes to:**
- `invoices`
- `invoice_line_items`
- `payments`

**Reads from:**
- `quotes` (often converted from quote)
- `work_orders` (can be created from completed work)
- `customers`

## 🧪 Testing Data Validation

### Run Validation Tests
```typescript
import { validateArchitectureProject } from '../lib/dataValidation';

const testProject = {
  project_name: 'Test Project',
  customer_id: 'test-customer-id',
  company_id: 'test-company-id',
  budget_min: 50000,
  budget_max: 100000,
  total_floors: 2,
};

const result = validateArchitectureProject(testProject);
console.log('Valid:', result.isValid);
console.log('Errors:', result.errors);
console.log('Warnings:', result.warnings);
```

## 🔐 Security Considerations

### Row Level Security (RLS)
All company-scoped tables should have RLS policies:

```sql
-- Example RLS policy for architecture_projects
CREATE POLICY "Users can only access their company's projects"
ON architecture_projects
FOR ALL
USING (
  company_id IN (
    SELECT company_id FROM company_members WHERE user_id = auth.uid()
  )
);
```

### Audit Logging
Always log sensitive operations:
```typescript
await supabase.from('security_audit_log').insert({
  user_id: userId,
  event_type: 'data_export',
  event_category: 'security',
  severity: 'warning',
  event_details: { project_id, exported_by: userId },
});
```

## 📞 Support

For questions about the data architecture:
1. Read `data-flow.md` for conceptual understanding
2. Check `data-usage-examples.ts` for implementation patterns
3. Review type definitions in `database.types.ts`
4. Use validation functions from `dataValidation.ts`
5. Apply transformations from `dataTransforms.ts`

**Remember:** The data architecture is the foundation of the application. Proper use of these utilities ensures data integrity, type safety, and maintainability.
