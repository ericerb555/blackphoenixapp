/**
 * Comprehensive Labor Breakdown Data
 * 150+ detailed labor tasks organized by construction phases
 */

export interface LaborItem {
  id: string;
  task: string;
  skill: string;
  hours: number;
  rate: number;
  total: number;
  markup?: number;
  category: string;
  phase: string;
}

export const comprehensiveLaborBreakdown: LaborItem[] = [
  // ==================== PHASE 1: PRE-CONSTRUCTION ====================
  // Project Management & Planning
  { id: 'labor-1', task: 'Initial Site Visit & Assessment', skill: 'Project Manager', hours: 2, rate: 95, total: 190, markup: 0, category: 'Project Management', phase: 'Pre-Construction' },
  { id: 'labor-2', task: 'Detailed Scope Review & Planning', skill: 'Project Manager', hours: 4, rate: 95, total: 380, markup: 0, category: 'Project Management', phase: 'Pre-Construction' },
  { id: 'labor-3', task: 'Material Takeoff & Estimation', skill: 'Estimator', hours: 6, rate: 75, total: 450, markup: 0, category: 'Project Management', phase: 'Pre-Construction' },
  { id: 'labor-4', task: 'Subcontractor Coordination & Scheduling', skill: 'Project Manager', hours: 3, rate: 95, total: 285, markup: 0, category: 'Project Management', phase: 'Pre-Construction' },
  { id: 'labor-5', task: 'Weekly Progress Meetings (10 weeks)', skill: 'Project Manager', hours: 20, rate: 95, total: 1900, markup: 0, category: 'Project Management', phase: 'Pre-Construction' },
  { id: 'labor-6', task: 'Daily Site Supervision (50 days)', skill: 'Site Superintendent', hours: 400, rate: 75, total: 30000, markup: 0, category: 'Project Management', phase: 'Pre-Construction' },
  
  // Permits & Inspections
  { id: 'labor-7', task: 'Building Permit Application & Processing', skill: 'Project Manager', hours: 4, rate: 95, total: 380, markup: 0, category: 'Permits & Inspections', phase: 'Pre-Construction' },
  { id: 'labor-8', task: 'Electrical Permit Processing', skill: 'Master Electrician', hours: 1, rate: 95, total: 95, markup: 0, category: 'Permits & Inspections', phase: 'Pre-Construction' },
  { id: 'labor-9', task: 'Plumbing Permit Processing', skill: 'Master Plumber', hours: 1, rate: 95, total: 95, markup: 0, category: 'Permits & Inspections', phase: 'Pre-Construction' },
  { id: 'labor-10', task: 'HVAC Permit Processing', skill: 'Master HVAC Tech', hours: 1, rate: 95, total: 95, markup: 0, category: 'Permits & Inspections', phase: 'Pre-Construction' },
  { id: 'labor-11', task: 'Zoning Compliance Review', skill: 'Project Manager', hours: 2, rate: 95, total: 190, markup: 0, category: 'Permits & Inspections', phase: 'Pre-Construction' },
  { id: 'labor-12', task: 'HOA Approval Coordination (if applicable)', skill: 'Project Manager', hours: 2, rate: 95, total: 190, markup: 0, category: 'Permits & Inspections', phase: 'Pre-Construction' },
  
  // Site Survey & Engineering
  { id: 'labor-13', task: 'Professional Site Survey', skill: 'Licensed Surveyor', hours: 4, rate: 125, total: 500, markup: 0, category: 'Survey & Engineering', phase: 'Pre-Construction' },
  { id: 'labor-14', task: 'As-Built Measurements & Documentation', skill: 'Survey Tech', hours: 3, rate: 75, total: 225, markup: 0, category: 'Survey & Engineering', phase: 'Pre-Construction' },
  { id: 'labor-15', task: 'Structural Engineering Review', skill: 'Structural Engineer', hours: 6, rate: 150, total: 900, markup: 0, category: 'Survey & Engineering', phase: 'Pre-Construction' },
  { id: 'labor-16', task: 'CAD Drawing Preparation', skill: 'CAD Technician', hours: 8, rate: 65, total: 520, markup: 0, category: 'Survey & Engineering', phase: 'Pre-Construction' },
  { id: 'labor-17', task: 'Soil Testing Coordination', skill: 'Project Manager', hours: 2, rate: 95, total: 190, markup: 0, category: 'Survey & Engineering', phase: 'Pre-Construction' },
  { id: 'labor-18', task: 'Utility Location & Marking', skill: 'Laborer', hours: 2, rate: 45, total: 90, markup: 0, category: 'Survey & Engineering', phase: 'Pre-Construction' },
  
  // ==================== PHASE 2: SITE PREPARATION ====================
  // Site Protection & Safety
  { id: 'labor-19', task: 'Temporary Fencing Installation', skill: 'Laborer', hours: 3, rate: 45, total: 135, markup: 0, category: 'Site Protection', phase: 'Site Preparation' },
  { id: 'labor-20', task: 'Safety Barrier & Signage Setup', skill: 'Safety Coordinator', hours: 2, rate: 65, total: 130, markup: 0, category: 'Site Protection', phase: 'Site Preparation' },
  { id: 'labor-21', task: 'Floor Protection - Ram Board Installation', skill: 'Laborer', hours: 2, rate: 45, total: 90, markup: 0, category: 'Site Protection', phase: 'Site Preparation' },
  { id: 'labor-22', task: 'Wall Protection - Corner Guards', skill: 'Laborer', hours: 1.5, rate: 45, total: 67.50, markup: 0, category: 'Site Protection', phase: 'Site Preparation' },
  { id: 'labor-23', task: 'Door & Window Protection', skill: 'Laborer', hours: 1, rate: 45, total: 45, markup: 0, category: 'Site Protection', phase: 'Site Preparation' },
  { id: 'labor-24', task: 'Landscaping Protection - Tree Fencing', skill: 'Laborer', hours: 2, rate: 45, total: 90, markup: 0, category: 'Site Protection', phase: 'Site Preparation' },
  { id: 'labor-25', task: 'HVAC Protection - Existing Units', skill: 'Laborer', hours: 1, rate: 45, total: 45, markup: 0, category: 'Site Protection', phase: 'Site Preparation' },
  { id: 'labor-26', task: 'Safety Equipment Inspection', skill: 'Safety Coordinator', hours: 1, rate: 65, total: 65, markup: 0, category: 'Site Protection', phase: 'Site Preparation' },
  
  // Mobilization & Setup
  { id: 'labor-27', task: 'Tool Trailer Delivery & Setup', skill: 'Laborer', hours: 2, rate: 45, total: 90, markup: 0, category: 'Mobilization', phase: 'Site Preparation' },
  { id: 'labor-28', task: 'Power Distribution Setup - Temp Electrical', skill: 'Electrician', hours: 3, rate: 75, total: 225, markup: 0, category: 'Mobilization', phase: 'Site Preparation' },
  { id: 'labor-29', task: 'Water Service Temporary Connection', skill: 'Plumber', hours: 2, rate: 75, total: 150, markup: 0, category: 'Mobilization', phase: 'Site Preparation' },
  { id: 'labor-30', task: 'Portable Restroom Setup', skill: 'Laborer', hours: 0.5, rate: 45, total: 22.50, markup: 0, category: 'Mobilization', phase: 'Site Preparation' },
  { id: 'labor-31', task: 'Material Storage Area Setup', skill: 'Laborer', hours: 1.5, rate: 45, total: 67.50, markup: 0, category: 'Mobilization', phase: 'Site Preparation' },
  { id: 'labor-32', task: 'Dumpster Placement & Coordination', skill: 'Laborer', hours: 1, rate: 45, total: 45, markup: 0, category: 'Mobilization', phase: 'Site Preparation' },
  { id: 'labor-33', task: 'Scaffolding Setup (if required)', skill: 'Scaffold Erector', hours: 8, rate: 65, total: 520, markup: 0, category: 'Mobilization', phase: 'Site Preparation' },
  { id: 'labor-34', task: 'Equipment Delivery & Unloading', skill: 'Equipment Operator', hours: 2, rate: 85, total: 170, markup: 0, category: 'Mobilization', phase: 'Site Preparation' },
  
  // ==================== PHASE 3: DEMOLITION & REMOVAL ====================
  // Interior Demolition
  { id: 'labor-35', task: 'Drywall Removal - Walls', skill: 'Demolition Tech', hours: 8, rate: 55, total: 440, markup: 0, category: 'Demolition', phase: 'Demolition' },
  { id: 'labor-36', task: 'Drywall Removal - Ceilings', skill: 'Demolition Tech', hours: 6, rate: 55, total: 330, markup: 0, category: 'Demolition', phase: 'Demolition' },
  { id: 'labor-37', task: 'Flooring Removal - Carpet', skill: 'Demolition Tech', hours: 4, rate: 55, total: 220, markup: 0, category: 'Demolition', phase: 'Demolition' },
  { id: 'labor-38', task: 'Flooring Removal - Vinyl/Linoleum', skill: 'Demolition Tech', hours: 4, rate: 55, total: 220, markup: 0, category: 'Demolition', phase: 'Demolition' },
  { id: 'labor-39', task: 'Flooring Removal - Tile', skill: 'Demolition Tech', hours: 6, rate: 55, total: 330, markup: 0, category: 'Demolition', phase: 'Demolition' },
  { id: 'labor-40', task: 'Flooring Removal - Hardwood', skill: 'Demolition Tech', hours: 6, rate: 55, total: 330, markup: 0, category: 'Demolition', phase: 'Demolition' },
  { id: 'labor-41', task: 'Cabinet Removal - Kitchen', skill: 'Demolition Tech', hours: 4, rate: 55, total: 220, markup: 0, category: 'Demolition', phase: 'Demolition' },
  { id: 'labor-42', task: 'Cabinet Removal - Bathroom', skill: 'Demolition Tech', hours: 2, rate: 55, total: 110, markup: 0, category: 'Demolition', phase: 'Demolition' },
  { id: 'labor-43', task: 'Countertop Removal', skill: 'Demolition Tech', hours: 3, rate: 55, total: 165, markup: 0, category: 'Demolition', phase: 'Demolition' },
  { id: 'labor-44', task: 'Appliance Disconnection & Removal', skill: 'Demolition Tech', hours: 2, rate: 55, total: 110, markup: 0, category: 'Demolition', phase: 'Demolition' },
  { id: 'labor-45', task: 'Door Removal - Interior', skill: 'Carpenter', hours: 2, rate: 65, total: 130, markup: 0, category: 'Demolition', phase: 'Demolition' },
  { id: 'labor-46', task: 'Door Removal - Exterior', skill: 'Carpenter', hours: 2, rate: 65, total: 130, markup: 0, category: 'Demolition', phase: 'Demolition' },
  { id: 'labor-47', task: 'Window Removal', skill: 'Carpenter', hours: 3, rate: 65, total: 195, markup: 0, category: 'Demolition', phase: 'Demolition' },
  { id: 'labor-48', task: 'Trim & Baseboard Removal', skill: 'Demolition Tech', hours: 4, rate: 55, total: 220, markup: 0, category: 'Demolition', phase: 'Demolition' },
  { id: 'labor-49', task: 'Crown Molding Removal', skill: 'Demolition Tech', hours: 2, rate: 55, total: 110, markup: 0, category: 'Demolition', phase: 'Demolition' },
  { id: 'labor-50', task: 'Fixture Removal - Plumbing', skill: 'Plumber', hours: 3, rate: 75, total: 225, markup: 0, category: 'Demolition', phase: 'Demolition' },
  { id: 'labor-51', task: 'Fixture Removal - Electrical', skill: 'Electrician', hours: 2, rate: 75, total: 150, markup: 0, category: 'Demolition', phase: 'Demolition' },
  { id: 'labor-52', task: 'Light Fixture Removal', skill: 'Electrician', hours: 2, rate: 75, total: 150, markup: 0, category: 'Demolition', phase: 'Demolition' },
  
  // Structural Demolition
  { id: 'labor-53', task: 'Non-Load Bearing Wall Removal', skill: 'Demolition Tech', hours: 6, rate: 55, total: 330, markup: 0, category: 'Structural Demo', phase: 'Demolition' },
  { id: 'labor-54', task: 'Load Bearing Wall Removal (w/ Engineer)', skill: 'Master Carpenter', hours: 12, rate: 85, total: 1020, markup: 0, category: 'Structural Demo', phase: 'Demolition' },
  { id: 'labor-55', task: 'Temporary Support Installation', skill: 'Master Carpenter', hours: 4, rate: 85, total: 340, markup: 0, category: 'Structural Demo', phase: 'Demolition' },
  { id: 'labor-56', task: 'Beam Installation - Structural', skill: 'Master Carpenter', hours: 6, rate: 85, total: 510, markup: 0, category: 'Structural Demo', phase: 'Demolition' },
  
  // Debris Handling
  { id: 'labor-57', task: 'Debris Sorting & Separation', skill: 'Laborer', hours: 6, rate: 45, total: 270, markup: 0, category: 'Debris Removal', phase: 'Demolition' },
  { id: 'labor-58', task: 'Debris Loading - Manual', skill: 'Laborer', hours: 8, rate: 45, total: 360, markup: 0, category: 'Debris Removal', phase: 'Demolition' },
  { id: 'labor-59', task: 'Wheelbarrow & Cart Transport', skill: 'Laborer', hours: 4, rate: 45, total: 180, markup: 0, category: 'Debris Removal', phase: 'Demolition' },
  { id: 'labor-60', task: 'Dumpster Loading & Management', skill: 'Laborer', hours: 4, rate: 45, total: 180, markup: 0, category: 'Debris Removal', phase: 'Demolition' },
  { id: 'labor-61', task: 'Salvage Material Handling', skill: 'Laborer', hours: 3, rate: 45, total: 135, markup: 0, category: 'Debris Removal', phase: 'Demolition' },
  { id: 'labor-62', task: 'Recycling Coordination', skill: 'Laborer', hours: 2, rate: 45, total: 90, markup: 0, category: 'Debris Removal', phase: 'Demolition' },
  { id: 'labor-63', task: 'Hazmat Abatement Coordination', skill: 'Safety Coordinator', hours: 2, rate: 65, total: 130, markup: 0, category: 'Debris Removal', phase: 'Demolition' },
  
  // Dust Control & Containment
  { id: 'labor-64', task: 'Dust Barrier Installation - Zip Walls', skill: 'Laborer', hours: 3, rate: 45, total: 135, markup: 0, category: 'Dust Control', phase: 'Demolition' },
  { id: 'labor-65', task: 'Plastic Sheeting Installation', skill: 'Laborer', hours: 2, rate: 45, total: 90, markup: 0, category: 'Dust Control', phase: 'Demolition' },
  { id: 'labor-66', task: 'Negative Air Machine Setup', skill: 'Laborer', hours: 1, rate: 45, total: 45, markup: 0, category: 'Dust Control', phase: 'Demolition' },
  { id: 'labor-67', task: 'Daily Dust Containment Monitoring', skill: 'Laborer', hours: 10, rate: 45, total: 450, markup: 0, category: 'Dust Control', phase: 'Demolition' },
  { id: 'labor-68', task: 'Air Scrubber Maintenance', skill: 'Laborer', hours: 2, rate: 45, total: 90, markup: 0, category: 'Dust Control', phase: 'Demolition' },
  { id: 'labor-69', task: 'HEPA Vacuum Operation', skill: 'Laborer', hours: 4, rate: 45, total: 180, markup: 0, category: 'Dust Control', phase: 'Demolition' },
  
  // ==================== PHASE 4: FOUNDATION & STRUCTURAL ====================
  // Foundation Work
  { id: 'labor-70', task: 'Site Layout & Staking', skill: 'Survey Tech', hours: 3, rate: 75, total: 225, markup: 0, category: 'Foundation', phase: 'Foundation & Structural' },
  { id: 'labor-71', task: 'Foundation Excavation - Machine', skill: 'Equipment Operator', hours: 6, rate: 85, total: 510, markup: 0, category: 'Foundation', phase: 'Foundation & Structural' },
  { id: 'labor-72', task: 'Foundation Hand Digging & Cleanup', skill: 'Laborer', hours: 4, rate: 45, total: 180, markup: 0, category: 'Foundation', phase: 'Foundation & Structural' },
  { id: 'labor-73', task: 'Gravel Base Installation', skill: 'Equipment Operator', hours: 2, rate: 85, total: 170, markup: 0, category: 'Foundation', phase: 'Foundation & Structural' },
  { id: 'labor-74', task: 'Gravel Compaction', skill: 'Equipment Operator', hours: 2, rate: 85, total: 170, markup: 0, category: 'Foundation', phase: 'Foundation & Structural' },
  { id: 'labor-75', task: 'Vapor Barrier Installation', skill: 'Laborer', hours: 2, rate: 45, total: 90, markup: 0, category: 'Foundation', phase: 'Foundation & Structural' },
  { id: 'labor-76', task: 'Rigid Insulation Installation', skill: 'Laborer', hours: 3, rate: 45, total: 135, markup: 0, category: 'Foundation', phase: 'Foundation & Structural' },
  { id: 'labor-77', task: 'Form Building - Footings', skill: 'Carpenter', hours: 6, rate: 65, total: 390, markup: 0, category: 'Foundation', phase: 'Foundation & Structural' },
  { id: 'labor-78', task: 'Form Building - Foundation Walls', skill: 'Carpenter', hours: 8, rate: 65, total: 520, markup: 0, category: 'Foundation', phase: 'Foundation & Structural' },
  { id: 'labor-79', task: 'Form Bracing & Alignment', skill: 'Carpenter', hours: 4, rate: 65, total: 260, markup: 0, category: 'Foundation', phase: 'Foundation & Structural' },
  { id: 'labor-80', task: 'Rebar Cutting & Bending', skill: 'Ironworker', hours: 4, rate: 70, total: 280, markup: 0, category: 'Foundation', phase: 'Foundation & Structural' },
  { id: 'labor-81', task: 'Rebar Placement & Tying', skill: 'Ironworker', hours: 8, rate: 70, total: 560, markup: 0, category: 'Foundation', phase: 'Foundation & Structural' },
  { id: 'labor-82', task: 'Anchor Bolt Installation', skill: 'Ironworker', hours: 2, rate: 70, total: 140, markup: 0, category: 'Foundation', phase: 'Foundation & Structural' },
  { id: 'labor-83', task: 'Sleeves & Penetration Prep', skill: 'Laborer', hours: 2, rate: 45, total: 90, markup: 0, category: 'Foundation', phase: 'Foundation & Structural' },
  { id: 'labor-84', task: 'Concrete Pour Coordination', skill: 'Concrete Foreman', hours: 2, rate: 85, total: 170, markup: 0, category: 'Foundation', phase: 'Foundation & Structural' },
  { id: 'labor-85', task: 'Concrete Placement & Vibration', skill: 'Concrete Finisher', hours: 6, rate: 75, total: 450, markup: 0, category: 'Foundation', phase: 'Foundation & Structural' },
  { id: 'labor-86', task: 'Concrete Finishing & Troweling', skill: 'Concrete Finisher', hours: 4, rate: 75, total: 300, markup: 0, category: 'Foundation', phase: 'Foundation & Structural' },
  { id: 'labor-87', task: 'Concrete Curing - 7 Day Monitoring', skill: 'Laborer', hours: 3, rate: 45, total: 135, markup: 0, category: 'Foundation', phase: 'Foundation & Structural' },
  { id: 'labor-88', task: 'Form Stripping', skill: 'Carpenter', hours: 4, rate: 65, total: 260, markup: 0, category: 'Foundation', phase: 'Foundation & Structural' },
  { id: 'labor-89', task: 'Form Cleanup & Storage', skill: 'Laborer', hours: 2, rate: 45, total: 90, markup: 0, category: 'Foundation', phase: 'Foundation & Structural' },
  { id: 'labor-90', task: 'Foundation Waterproofing Application', skill: 'Waterproofing Tech', hours: 6, rate: 65, total: 390, markup: 0, category: 'Foundation', phase: 'Foundation & Structural' },
  { id: 'labor-91', task: 'Drainage Mat Installation', skill: 'Laborer', hours: 3, rate: 45, total: 135, markup: 0, category: 'Foundation', phase: 'Foundation & Structural' },
  { id: 'labor-92', task: 'French Drain Installation', skill: 'Laborer', hours: 4, rate: 45, total: 180, markup: 0, category: 'Foundation', phase: 'Foundation & Structural' },
  { id: 'labor-93', task: 'Sump Pit Installation', skill: 'Laborer', hours: 2, rate: 45, total: 90, markup: 0, category: 'Foundation', phase: 'Foundation & Structural' },
  { id: 'labor-94', task: 'Backfill - Material Placement', skill: 'Equipment Operator', hours: 3, rate: 85, total: 255, markup: 0, category: 'Foundation', phase: 'Foundation & Structural' },
  { id: 'labor-95', task: 'Backfill - Compaction', skill: 'Equipment Operator', hours: 3, rate: 85, total: 255, markup: 0, category: 'Foundation', phase: 'Foundation & Structural' },
  { id: 'labor-96', task: 'Foundation Inspection Coordination', skill: 'Project Manager', hours: 1, rate: 95, total: 95, markup: 0, category: 'Foundation', phase: 'Foundation & Structural' },
  
  // Structural Framing
  { id: 'labor-97', task: 'Material Delivery Coordination', skill: 'Project Manager', hours: 1, rate: 95, total: 95, markup: 0, category: 'Framing', phase: 'Foundation & Structural' },
  { id: 'labor-98', task: 'Lumber Package Unloading & Sorting', skill: 'Laborer', hours: 4, rate: 45, total: 180, markup: 0, category: 'Framing', phase: 'Foundation & Structural' },
  { id: 'labor-99', task: 'Sill Plate Layout & Installation', skill: 'Carpenter', hours: 3, rate: 65, total: 195, markup: 0, category: 'Framing', phase: 'Foundation & Structural' },
  { id: 'labor-100', task: 'Sill Seal Installation', skill: 'Carpenter', hours: 1, rate: 65, total: 65, markup: 0, category: 'Framing', phase: 'Foundation & Structural' },
  { id: 'labor-101', task: 'Floor Joist Layout & Cutting', skill: 'Carpenter', hours: 4, rate: 65, total: 260, markup: 0, category: 'Framing', phase: 'Foundation & Structural' },
  { id: 'labor-102', task: 'Floor Joist Installation', skill: 'Carpenter', hours: 12, rate: 65, total: 780, markup: 0, category: 'Framing', phase: 'Foundation & Structural' },
  { id: 'labor-103', task: 'Joist Hangers & Hardware Installation', skill: 'Carpenter', hours: 3, rate: 65, total: 195, markup: 0, category: 'Framing', phase: 'Foundation & Structural' },
  { id: 'labor-104', task: 'Rim Joist Installation', skill: 'Carpenter', hours: 3, rate: 65, total: 195, markup: 0, category: 'Framing', phase: 'Foundation & Structural' },
  { id: 'labor-105', task: 'Subfloor Glue & Screw Installation', skill: 'Carpenter', hours: 8, rate: 65, total: 520, markup: 0, category: 'Framing', phase: 'Foundation & Structural' },
  { id: 'labor-106', task: 'Subfloor Squeak Elimination', skill: 'Carpenter', hours: 2, rate: 65, total: 130, markup: 0, category: 'Framing', phase: 'Foundation & Structural' },
  { id: 'labor-107', task: 'Wall Layout & Chalk Lines', skill: 'Master Carpenter', hours: 3, rate: 85, total: 255, markup: 0, category: 'Framing', phase: 'Foundation & Structural' },
  { id: 'labor-108', task: 'Wall Plate Cutting & Prep', skill: 'Carpenter', hours: 4, rate: 65, total: 260, markup: 0, category: 'Framing', phase: 'Foundation & Structural' },
  { id: 'labor-109', task: 'Stud Cutting & Pre-Assembly', skill: 'Carpenter', hours: 6, rate: 65, total: 390, markup: 0, category: 'Framing', phase: 'Foundation & Structural' },
  { id: 'labor-110', task: 'Wall Framing - Exterior Load Bearing', skill: 'Master Carpenter', hours: 16, rate: 85, total: 1360, markup: 0, category: 'Framing', phase: 'Foundation & Structural' },
  { id: 'labor-111', task: 'Wall Framing - Interior Partitions', skill: 'Carpenter', hours: 14, rate: 65, total: 910, markup: 0, category: 'Framing', phase: 'Foundation & Structural' },
  { id: 'labor-112', task: 'Window Rough Opening Framing', skill: 'Carpenter', hours: 4, rate: 65, total: 260, markup: 0, category: 'Framing', phase: 'Foundation & Structural' },
  { id: 'labor-113', task: 'Door Rough Opening Framing', skill: 'Carpenter', hours: 3, rate: 65, total: 195, markup: 0, category: 'Framing', phase: 'Foundation & Structural' },
  { id: 'labor-114', task: 'Beam & Header Cutting', skill: 'Master Carpenter', hours: 3, rate: 85, total: 255, markup: 0, category: 'Framing', phase: 'Foundation & Structural' },
  { id: 'labor-115', task: 'Beam & Header Installation', skill: 'Master Carpenter', hours: 8, rate: 85, total: 680, markup: 0, category: 'Framing', phase: 'Foundation & Structural' },
  { id: 'labor-116', task: 'Engineered Lumber Installation (LVL/PSL)', skill: 'Master Carpenter', hours: 4, rate: 85, total: 340, markup: 0, category: 'Framing', phase: 'Foundation & Structural' },
  { id: 'labor-117', task: 'Ceiling Joist Layout & Installation', skill: 'Carpenter', hours: 10, rate: 65, total: 650, markup: 0, category: 'Framing', phase: 'Foundation & Structural' },
  { id: 'labor-118', task: 'Roof Truss/Rafter Layout', skill: 'Master Carpenter', hours: 4, rate: 85, total: 340, markup: 0, category: 'Framing', phase: 'Foundation & Structural' },
  { id: 'labor-119', task: 'Roof Truss/Rafter Installation', skill: 'Master Carpenter', hours: 12, rate: 85, total: 1020, markup: 0, category: 'Framing', phase: 'Foundation & Structural' },
  { id: 'labor-120', task: 'Roof Truss Bracing & Blocking', skill: 'Carpenter', hours: 4, rate: 65, total: 260, markup: 0, category: 'Framing', phase: 'Foundation & Structural' },
  { id: 'labor-121', task: 'Roof Sheathing Installation', skill: 'Carpenter', hours: 10, rate: 65, total: 650, markup: 0, category: 'Framing', phase: 'Foundation & Structural' },
  { id: 'labor-122', task: 'Roof Edge Blocking', skill: 'Carpenter', hours: 3, rate: 65, total: 195, markup: 0, category: 'Framing', phase: 'Foundation & Structural' },
  { id: 'labor-123', task: 'Wall Sheathing Installation', skill: 'Carpenter', hours: 12, rate: 65, total: 780, markup: 0, category: 'Framing', phase: 'Foundation & Structural' },
  { id: 'labor-124', task: 'Sheathing Gap & Clip Installation', skill: 'Carpenter', hours: 2, rate: 65, total: 130, markup: 0, category: 'Framing', phase: 'Foundation & Structural' },
  { id: 'labor-125', task: 'House Wrap Installation', skill: 'Carpenter', hours: 6, rate: 65, total: 390, markup: 0, category: 'Framing', phase: 'Foundation & Structural' },
  { id: 'labor-126', task: 'Weather Barrier Taping & Sealing', skill: 'Carpenter', hours: 3, rate: 65, total: 195, markup: 0, category: 'Framing', phase: 'Foundation & Structural' },
  { id: 'labor-127', task: 'Framing Hardware Installation (Straps, Ties)', skill: 'Carpenter', hours: 4, rate: 65, total: 260, markup: 0, category: 'Framing', phase: 'Foundation & Structural' },
  { id: 'labor-128', task: 'Framing Inspection Coordination', skill: 'Project Manager', hours: 1, rate: 95, total: 95, markup: 0, category: 'Framing', phase: 'Foundation & Structural' },
  { id: 'labor-129', task: 'Framing Correction & Touch-Up', skill: 'Carpenter', hours: 4, rate: 65, total: 260, markup: 0, category: 'Framing', phase: 'Foundation & Structural' },
  
  // ==================== PHASE 5: EXTERIOR ENVELOPE ====================
  // Roofing
  { id: 'labor-130', task: 'Existing Roof Tear-Off (if applicable)', skill: 'Roofer', hours: 8, rate: 60, total: 480, markup: 0, category: 'Roofing', phase: 'Exterior Envelope' },
  { id: 'labor-131', task: 'Roof Deck Inspection', skill: 'Carpenter', hours: 2, rate: 65, total: 130, markup: 0, category: 'Roofing', phase: 'Exterior Envelope' },
  { id: 'labor-132', task: 'Damaged Decking Replacement', skill: 'Carpenter', hours: 4, rate: 65, total: 260, markup: 0, category: 'Roofing', phase: 'Exterior Envelope' },
  { id: 'labor-133', task: 'Ice & Water Shield - Valleys & Eaves', skill: 'Roofer', hours: 3, rate: 60, total: 180, markup: 0, category: 'Roofing', phase: 'Exterior Envelope' },
  { id: 'labor-134', task: 'Roofing Felt Underlayment Installation', skill: 'Roofer', hours: 4, rate: 60, total: 240, markup: 0, category: 'Roofing', phase: 'Exterior Envelope' },
  { id: 'labor-135', task: 'Synthetic Underlayment Installation', skill: 'Roofer', hours: 3, rate: 60, total: 180, markup: 0, category: 'Roofing', phase: 'Exterior Envelope' },
  { id: 'labor-136', task: 'Drip Edge Installation - Eaves', skill: 'Roofer', hours: 2, rate: 60, total: 120, markup: 0, category: 'Roofing', phase: 'Exterior Envelope' },
  { id: 'labor-137', task: 'Drip Edge Installation - Rakes', skill: 'Roofer', hours: 2, rate: 60, total: 120, markup: 0, category: 'Roofing', phase: 'Exterior Envelope' },
  { id: 'labor-138', task: 'Starter Strip Installation', skill: 'Roofer', hours: 1, rate: 60, total: 60, markup: 0, category: 'Roofing', phase: 'Exterior Envelope' },
  { id: 'labor-139', task: 'Asphalt Shingle Installation', skill: 'Roofer', hours: 16, rate: 60, total: 960, markup: 0, category: 'Roofing', phase: 'Exterior Envelope' },
  { id: 'labor-140', task: 'Hip & Ridge Cap Installation', skill: 'Roofer', hours: 4, rate: 60, total: 240, markup: 0, category: 'Roofing', phase: 'Exterior Envelope' },
  { id: 'labor-141', task: 'Valley Flashing Installation', skill: 'Roofer', hours: 3, rate: 60, total: 180, markup: 0, category: 'Roofing', phase: 'Exterior Envelope' },
  { id: 'labor-142', task: 'Chimney Flashing & Counter-Flashing', skill: 'Roofer', hours: 3, rate: 60, total: 180, markup: 0, category: 'Roofing', phase: 'Exterior Envelope' },
  { id: 'labor-143', task: 'Pipe Boot Installation', skill: 'Roofer', hours: 1, rate: 60, total: 60, markup: 0, category: 'Roofing', phase: 'Exterior Envelope' },
  { id: 'labor-144', task: 'Ridge Vent Installation', skill: 'Roofer', hours: 3, rate: 60, total: 180, markup: 0, category: 'Roofing', phase: 'Exterior Envelope' },
  { id: 'labor-145', task: 'Gutter Installation - Hanging', skill: 'Roofer', hours: 6, rate: 60, total: 360, markup: 0, category: 'Roofing', phase: 'Exterior Envelope' },
  { id: 'labor-146', task: 'Downspout Installation', skill: 'Roofer', hours: 3, rate: 60, total: 180, markup: 0, category: 'Roofing', phase: 'Exterior Envelope' },
  { id: 'labor-147', task: 'Gutter Guard Installation', skill: 'Roofer', hours: 4, rate: 60, total: 240, markup: 0, category: 'Roofing', phase: 'Exterior Envelope' },
  { id: 'labor-148', task: 'Roof Cleanup & Magnet Sweep', skill: 'Laborer', hours: 2, rate: 45, total: 90, markup: 0, category: 'Roofing', phase: 'Exterior Envelope' },
  
  // Windows & Doors
  { id: 'labor-149', task: 'Window Opening Prep & Flashing', skill: 'Carpenter', hours: 4, rate: 65, total: 260, markup: 0, category: 'Windows & Doors', phase: 'Exterior Envelope' },
  { id: 'labor-150', task: 'Window Installation - Standard', skill: 'Carpenter', hours: 12, rate: 65, total: 780, markup: 0, category: 'Windows & Doors', phase: 'Exterior Envelope' },
  { id: 'labor-151', task: 'Window Installation - Bay/Bow', skill: 'Master Carpenter', hours: 8, rate: 85, total: 680, markup: 0, category: 'Windows & Doors', phase: 'Exterior Envelope' },
  { id: 'labor-152', task: 'Window Flashing & Weatherproofing', skill: 'Carpenter', hours: 4, rate: 65, total: 260, markup: 0, category: 'Windows & Doors', phase: 'Exterior Envelope' },
  { id: 'labor-153', task: 'Window Trim - Exterior', skill: 'Carpenter', hours: 6, rate: 65, total: 390, markup: 0, category: 'Windows & Doors', phase: 'Exterior Envelope' },
  { id: 'labor-154', task: 'Exterior Door Installation - Entry', skill: 'Carpenter', hours: 4, rate: 65, total: 260, markup: 0, category: 'Windows & Doors', phase: 'Exterior Envelope' },
  { id: 'labor-155', task: 'Storm Door Installation', skill: 'Carpenter', hours: 2, rate: 65, total: 130, markup: 0, category: 'Windows & Doors', phase: 'Exterior Envelope' },
  { id: 'labor-156', task: 'Sliding Glass Door Installation', skill: 'Carpenter', hours: 4, rate: 65, total: 260, markup: 0, category: 'Windows & Doors', phase: 'Exterior Envelope' },
  { id: 'labor-157', task: 'French Door Installation', skill: 'Carpenter', hours: 4, rate: 65, total: 260, markup: 0, category: 'Windows & Doors', phase: 'Exterior Envelope' },
  { id: 'labor-158', task: 'Garage Door Installation', skill: 'Garage Door Tech', hours: 4, rate: 75, total: 300, markup: 0, category: 'Windows & Doors', phase: 'Exterior Envelope' },
  { id: 'labor-159', task: 'Garage Door Opener Installation', skill: 'Garage Door Tech', hours: 2, rate: 75, total: 150, markup: 0, category: 'Windows & Doors', phase: 'Exterior Envelope' },
  { id: 'labor-160', task: 'Door Hardware Installation - Exterior', skill: 'Finish Carpenter', hours: 3, rate: 70, total: 210, markup: 0, category: 'Windows & Doors', phase: 'Exterior Envelope' },
  
  // Siding & Exterior Finishes
  { id: 'labor-161', task: 'Exterior Trim Layout & Measurement', skill: 'Carpenter', hours: 3, rate: 65, total: 195, markup: 0, category: 'Siding', phase: 'Exterior Envelope' },
  { id: 'labor-162', task: 'Corner Trim Installation', skill: 'Carpenter', hours: 4, rate: 65, total: 260, markup: 0, category: 'Siding', phase: 'Exterior Envelope' },
  { id: 'labor-163', task: 'Window & Door Casing - Exterior', skill: 'Carpenter', hours: 8, rate: 65, total: 520, markup: 0, category: 'Siding', phase: 'Exterior Envelope' },
  { id: 'labor-164', task: 'Vinyl Siding Installation', skill: 'Siding Installer', hours: 20, rate: 60, total: 1200, markup: 0, category: 'Siding', phase: 'Exterior Envelope' },
  { id: 'labor-165', task: 'Fiber Cement Siding Installation', skill: 'Siding Installer', hours: 24, rate: 60, total: 1440, markup: 0, category: 'Siding', phase: 'Exterior Envelope' },
  { id: 'labor-166', task: 'Wood Siding Installation', skill: 'Carpenter', hours: 28, rate: 65, total: 1820, markup: 0, category: 'Siding', phase: 'Exterior Envelope' },
  { id: 'labor-167', task: 'Stucco Application - 3 Coat', skill: 'Stucco Mason', hours: 32, rate: 70, total: 2240, markup: 0, category: 'Siding', phase: 'Exterior Envelope' },
  { id: 'labor-168', task: 'Brick Veneer Installation', skill: 'Mason', hours: 40, rate: 75, total: 3000, markup: 0, category: 'Siding', phase: 'Exterior Envelope' },
  { id: 'labor-169', task: 'Soffit Installation', skill: 'Carpenter', hours: 8, rate: 65, total: 520, markup: 0, category: 'Siding', phase: 'Exterior Envelope' },
  { id: 'labor-170', task: 'Fascia Installation', skill: 'Carpenter', hours: 6, rate: 65, total: 390, markup: 0, category: 'Siding', phase: 'Exterior Envelope' },
  { id: 'labor-171', task: 'Exterior Caulking - All Penetrations', skill: 'Carpenter', hours: 4, rate: 65, total: 260, markup: 0, category: 'Siding', phase: 'Exterior Envelope' },
  { id: 'labor-172', task: 'Exterior Painting/Priming', skill: 'Painter', hours: 12, rate: 55, total: 660, markup: 0, category: 'Siding', phase: 'Exterior Envelope' },
  { id: 'labor-173', task: 'Exterior Staining/Sealing', skill: 'Painter', hours: 10, rate: 55, total: 550, markup: 0, category: 'Siding', phase: 'Exterior Envelope' },
  
  // ==================== PHASE 6: MEP (MECHANICAL, ELECTRICAL, PLUMBING) ====================
  // Electrical - Rough-In
  { id: 'labor-174', task: 'Electrical Service Upgrade (if needed)', skill: 'Master Electrician', hours: 6, rate: 95, total: 570, markup: 0, category: 'Electrical Rough-In', phase: 'MEP Systems' },
  { id: 'labor-175', task: 'Main Panel Installation', skill: 'Master Electrician', hours: 4, rate: 95, total: 380, markup: 0, category: 'Electrical Rough-In', phase: 'MEP Systems' },
  { id: 'labor-176', task: 'Sub-Panel Installation', skill: 'Electrician', hours: 3, rate: 75, total: 225, markup: 0, category: 'Electrical Rough-In', phase: 'MEP Systems' },
  { id: 'labor-177', task: 'Circuit Planning & Layout', skill: 'Master Electrician', hours: 3, rate: 95, total: 285, markup: 0, category: 'Electrical Rough-In', phase: 'MEP Systems' },
  { id: 'labor-178', task: 'Cable Rough-In - Romex', skill: 'Electrician', hours: 12, rate: 75, total: 900, markup: 0, category: 'Electrical Rough-In', phase: 'MEP Systems' },
  { id: 'labor-179', task: 'Outlet Box Installation', skill: 'Electrician', hours: 6, rate: 75, total: 450, markup: 0, category: 'Electrical Rough-In', phase: 'MEP Systems' },
  { id: 'labor-180', task: 'Switch Box Installation', skill: 'Electrician', hours: 4, rate: 75, total: 300, markup: 0, category: 'Electrical Rough-In', phase: 'MEP Systems' },
  { id: 'labor-181', task: 'Light Box Installation - Ceiling', skill: 'Electrician', hours: 4, rate: 75, total: 300, markup: 0, category: 'Electrical Rough-In', phase: 'MEP Systems' },
  { id: 'labor-182', task: 'Light Box Installation - Wall', skill: 'Electrician', hours: 2, rate: 75, total: 150, markup: 0, category: 'Electrical Rough-In', phase: 'MEP Systems' },
  { id: 'labor-183', task: 'Can Light Rough-In', skill: 'Electrician', hours: 4, rate: 75, total: 300, markup: 0, category: 'Electrical Rough-In', phase: 'MEP Systems' },
  { id: 'labor-184', task: 'GFCI Protection Installation', skill: 'Electrician', hours: 2, rate: 75, total: 150, markup: 0, category: 'Electrical Rough-In', phase: 'MEP Systems' },
  { id: 'labor-185', task: 'AFCI Protection Installation', skill: 'Electrician', hours: 2, rate: 75, total: 150, markup: 0, category: 'Electrical Rough-In', phase: 'MEP Systems' },
  { id: 'labor-186', task: 'Low Voltage Wiring - Data/Phone', skill: 'Electrician', hours: 4, rate: 75, total: 300, markup: 0, category: 'Electrical Rough-In', phase: 'MEP Systems' },
  { id: 'labor-187', task: 'Low Voltage Wiring - Security', skill: 'Electrician', hours: 3, rate: 75, total: 225, markup: 0, category: 'Electrical Rough-In', phase: 'MEP Systems' },
  { id: 'labor-188', task: 'Smoke Detector Wiring', skill: 'Electrician', hours: 2, rate: 75, total: 150, markup: 0, category: 'Electrical Rough-In', phase: 'MEP Systems' },
  { id: 'labor-189', task: 'Carbon Monoxide Detector Wiring', skill: 'Electrician', hours: 1, rate: 75, total: 75, markup: 0, category: 'Electrical Rough-In', phase: 'MEP Systems' },
  { id: 'labor-190', task: 'Rough Electrical Inspection Coordination', skill: 'Master Electrician', hours: 1, rate: 95, total: 95, markup: 0, category: 'Electrical Rough-In', phase: 'MEP Systems' },
  
  // Plumbing - Rough-In
  { id: 'labor-191', task: 'Main Water Line Installation', skill: 'Master Plumber', hours: 4, rate: 95, total: 380, markup: 0, category: 'Plumbing Rough-In', phase: 'MEP Systems' },
  { id: 'labor-192', task: 'Water Distribution - Hot & Cold', skill: 'Plumber', hours: 8, rate: 75, total: 600, markup: 0, category: 'Plumbing Rough-In', phase: 'MEP Systems' },
  { id: 'labor-193', task: 'PEX Manifold Installation', skill: 'Plumber', hours: 3, rate: 75, total: 225, markup: 0, category: 'Plumbing Rough-In', phase: 'MEP Systems' },
  { id: 'labor-194', task: 'Drain Line Installation - Main', skill: 'Plumber', hours: 6, rate: 75, total: 450, markup: 0, category: 'Plumbing Rough-In', phase: 'MEP Systems' },
  { id: 'labor-195', task: 'Drain Line Installation - Branch', skill: 'Plumber', hours: 8, rate: 75, total: 600, markup: 0, category: 'Plumbing Rough-In', phase: 'MEP Systems' },
  { id: 'labor-196', task: 'Vent Stack Installation', skill: 'Plumber', hours: 4, rate: 75, total: 300, markup: 0, category: 'Plumbing Rough-In', phase: 'MEP Systems' },
  { id: 'labor-197', task: 'Toilet Flange Installation', skill: 'Plumber', hours: 2, rate: 75, total: 150, markup: 0, category: 'Plumbing Rough-In', phase: 'MEP Systems' },
  { id: 'labor-198', task: 'Shower Pan Installation', skill: 'Plumber', hours: 4, rate: 75, total: 300, markup: 0, category: 'Plumbing Rough-In', phase: 'MEP Systems' },
  { id: 'labor-199', task: 'Tub Rough-In', skill: 'Plumber', hours: 3, rate: 75, total: 225, markup: 0, category: 'Plumbing Rough-In', phase: 'MEP Systems' },
  { id: 'labor-200', task: 'Water Heater Installation', skill: 'Plumber', hours: 4, rate: 75, total: 300, markup: 0, category: 'Plumbing Rough-In', phase: 'MEP Systems' },
  { id: 'labor-201', task: 'Gas Line Installation', skill: 'Plumber', hours: 4, rate: 75, total: 300, markup: 0, category: 'Plumbing Rough-In', phase: 'MEP Systems' },
  { id: 'labor-202', task: 'Pressure Testing - Water Lines', skill: 'Plumber', hours: 2, rate: 75, total: 150, markup: 0, category: 'Plumbing Rough-In', phase: 'MEP Systems' },
  { id: 'labor-203', task: 'Rough Plumbing Inspection Coordination', skill: 'Master Plumber', hours: 1, rate: 95, total: 95, markup: 0, category: 'Plumbing Rough-In', phase: 'MEP Systems' },
  
  // HVAC - Installation
  { id: 'labor-204', task: 'HVAC System Design & Planning', skill: 'HVAC Engineer', hours: 4, rate: 95, total: 380, markup: 0, category: 'HVAC', phase: 'MEP Systems' },
  { id: 'labor-205', task: 'Ductwork Fabrication & Layout', skill: 'HVAC Technician', hours: 6, rate: 85, total: 510, markup: 0, category: 'HVAC', phase: 'MEP Systems' },
  { id: 'labor-206', task: 'Supply Duct Installation', skill: 'HVAC Technician', hours: 12, rate: 85, total: 1020, markup: 0, category: 'HVAC', phase: 'MEP Systems' },
  { id: 'labor-207', task: 'Return Duct Installation', skill: 'HVAC Technician', hours: 8, rate: 85, total: 680, markup: 0, category: 'HVAC', phase: 'MEP Systems' },
  { id: 'labor-208', task: 'Duct Sealing & Insulation', skill: 'HVAC Technician', hours: 6, rate: 85, total: 510, markup: 0, category: 'HVAC', phase: 'MEP Systems' },
  { id: 'labor-209', task: 'Furnace Installation', skill: 'Master HVAC Tech', hours: 6, rate: 95, total: 570, markup: 0, category: 'HVAC', phase: 'MEP Systems' },
  { id: 'labor-210', task: 'Air Conditioner Installation', skill: 'Master HVAC Tech', hours: 6, rate: 95, total: 570, markup: 0, category: 'HVAC', phase: 'MEP Systems' },
  { id: 'labor-211', task: 'Heat Pump Installation', skill: 'Master HVAC Tech', hours: 8, rate: 95, total: 760, markup: 0, category: 'HVAC', phase: 'MEP Systems' },
  { id: 'labor-212', task: 'Refrigerant Line Installation', skill: 'HVAC Technician', hours: 4, rate: 85, total: 340, markup: 0, category: 'HVAC', phase: 'MEP Systems' },
  { id: 'labor-213', task: 'Condensate Drain Installation', skill: 'HVAC Technician', hours: 2, rate: 85, total: 170, markup: 0, category: 'HVAC', phase: 'MEP Systems' },
  { id: 'labor-214', task: 'Thermostat Wiring', skill: 'HVAC Technician', hours: 2, rate: 85, total: 170, markup: 0, category: 'HVAC', phase: 'MEP Systems' },
  { id: 'labor-215', task: 'System Startup & Testing', skill: 'Master HVAC Tech', hours: 3, rate: 95, total: 285, markup: 0, category: 'HVAC', phase: 'MEP Systems' },
  { id: 'labor-216', task: 'Air Balancing', skill: 'HVAC Technician', hours: 4, rate: 85, total: 340, markup: 0, category: 'HVAC', phase: 'MEP Systems' },
  { id: 'labor-217', task: 'Ventilation System Installation', skill: 'HVAC Technician', hours: 4, rate: 85, total: 340, markup: 0, category: 'HVAC', phase: 'MEP Systems' },
  
  // Cleanup & Final Tasks
  { id: 'labor-218', task: 'Daily Site Cleanup (50 days x 1hr)', skill: 'Laborer', hours: 50, rate: 45, total: 2250, markup: 0, category: 'Cleanup', phase: 'Completion' },
  { id: 'labor-219', task: 'Final Deep Cleaning - Interior', skill: 'Cleaning Crew', hours: 8, rate: 50, total: 400, markup: 0, category: 'Cleanup', phase: 'Completion' },
  { id: 'labor-220', task: 'Window Cleaning', skill: 'Cleaning Crew', hours: 3, rate: 50, total: 150, markup: 0, category: 'Cleanup', phase: 'Completion' },
  { id: 'labor-221', task: 'Final Walkthrough', skill: 'Project Manager', hours: 2, rate: 95, total: 190, markup: 0, category: 'Project Management', phase: 'Completion' },
  { id: 'labor-222', task: 'Punch List Completion', skill: 'Multi-Trade', hours: 8, rate: 65, total: 520, markup: 0, category: 'Final Details', phase: 'Completion' },
  { id: 'labor-223', task: 'Site Demobilization', skill: 'Laborer', hours: 4, rate: 45, total: 180, markup: 0, category: 'Cleanup', phase: 'Completion' },
];

// Helper function to get labor items by phase
export function getLaborItemsByPhase(phase: string): LaborItem[] {
  return comprehensiveLaborBreakdown.filter(item => item.phase === phase);
}

// Helper function to get labor items by category
export function getLaborItemsByCategory(category: string): LaborItem[] {
  return comprehensiveLaborBreakdown.filter(item => item.category === category);
}

// Get all unique phases
export function getAllPhases(): string[] {
  return Array.from(new Set(comprehensiveLaborBreakdown.map(item => item.phase)));
}

// Get all unique categories
export function getAllCategories(): string[] {
  return Array.from(new Set(comprehensiveLaborBreakdown.map(item => item.category)));
}

// Calculate totals by phase
export function calculatePhaseTotal(phase: string): number {
  return getLaborItemsByPhase(phase).reduce((sum, item) => sum + item.total, 0);
}

// Calculate totals by category
export function calculateCategoryTotal(category: string): number {
  return getLaborItemsByCategory(category).reduce((sum, item) => sum + item.total, 0);
}
