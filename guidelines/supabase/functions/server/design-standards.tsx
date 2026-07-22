/**
 * Design Standards — the real rule & data source behind Design Studio Pro's
 * Building Code Checker and Construction Schedule Generator.
 *
 * These two tools used to run on constants hard-coded inside their React
 * components (and a fake setTimeout to look like they were "computing"). That's
 * what kept them in BETA. This module makes them data-driven:
 *
 *   • code-rules      → codified thresholds from the IRC 2021 / ICC A117.1 /
 *                       ADA 2010 Standards, each with a citable reference and a
 *                       jurisdiction tag, so a check can point at a real clause.
 *   • schedule-templates → standard residential construction phase/task data
 *                       with realistic crew sizes, durations, per-material lead
 *                       times, and which tasks trigger a required inspection.
 *
 * The datasets are seeded into the KV store on first read, so they become a
 * genuine editable data source (an admin can tune a jurisdiction's numbers
 * without shipping a new front-end build) rather than a component literal.
 *
 * KV layout:
 *   design_standard:code-rules:{jurisdiction}   → CodeRuleSet
 *   design_standard:schedule-templates          → SchedulePhase[]
 *
 * Registered with full "/make-server-57095a78/design-standards" prefixes and
 * mounted at "/" in index.tsx (same convention as designProjectsRouter).
 */

import { Hono } from 'npm:hono@4';
import { cors } from 'npm:hono/cors';
import * as kv from './kv_store.tsx';

const designStandardsRouter = new Hono();

designStandardsRouter.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}));

const CODE_RULES_KEY = (j: string) => `design_standard:code-rules:${j}`;
const SCHEDULE_KEY = 'design_standard:schedule-templates';

// ─── Default rulesets (real, citable code minimums) ─────────────────────────────
//
// Sources: 2021 International Residential Code (IRC), ICC A117.1-2017 Accessible
// and Usable Buildings and Facilities, and the 2010 ADA Standards for Accessible
// Design. Numbers are the code minimums; jurisdictions may amend them, which is
// exactly why they live in editable data rather than in the component.

const IRC_2021: any = {
  jurisdiction: 'IRC2021',
  label: 'IRC 2021 · ICC A117.1 · ADA 2010',
  updatedAt: new Date().toISOString(),
  thresholds: {
    minDoorWidthIn: 32,          // clear width, IRC R311.2
    stdDoorWidthIn: 36,          // common main-entry standard
    adaClearWidthIn: 32,         // ADA 404.2.3 clear opening
    egressWindowMinSqFt: 5.7,    // IRC R310.2.1 (5.0 at grade floor)
    egressWindowMinHeightIn: 24, // IRC R310.2.1 min opening height
    egressWindowMinWidthIn: 20,  // IRC R310.2.1 min opening width
    naturalLightMinPct: 8,       // IRC R303.1 (glazing ≥ 8% of floor area)
    naturalVentMinPct: 4,        // IRC R303.1 (openable ≥ 4% of floor area)
    bedroomMinSqFt: 70,          // IRC R304.2
    habitableMinDimIn: 84,       // IRC R304.3 (7 ft in any horizontal dim)
    bathroomMinSqFt: 35,         // typical practice / fixture clearances R307
    ceilingMinFt: 7,             // IRC R305.1 (habitable rooms)
    ceilingStdFt: 7.5,           // below-standard warning threshold
    loadBearingMinSpacingIn: 48, // heuristic flag for walls < 4 ft apart
    hallwayMinWidthIn: 36,       // IRC R311.6
  },
  references: {
    minDoorWidth: 'IRC R311.2',
    adaClearWidth: 'ADA Std. 404.2.3',
    egressWindow: 'IRC R310.2.1',
    naturalLight: 'IRC R303.1',
    loadBearing: 'IRC R602',
    bedroomSize: 'IRC R304.2',
    habitableDim: 'IRC R304.3',
    bathroomSize: 'IRC R307',
    ceilingHeight: 'IRC R305.1',
    hallway: 'IRC R311.6',
  },
};

const DEFAULT_CODE_RULES: Record<string, any> = {
  IRC2021: IRC_2021,
};

// ─── Default construction schedule templates (real sequencing & lead times) ─────
//
// Durations are working-day estimates for a typical single-family remodel/build;
// leadDays is the procurement lead time per material (how far ahead the delivery
// must be ordered before the task needs it); crew is the trade doing the work.

const DEFAULT_SCHEDULE_PHASES: any[] = [
  {
    name: 'Pre-Construction', crew: 'PM / Surveyor',
    tasks: [
      { name: 'Site Survey & Measurements', duration: 1, crewSize: 2, materials: [], inspectionRequired: false },
      { name: 'Permits & Approvals', duration: 10, crewSize: 1, materials: [], inspectionRequired: false },
      { name: 'Site Preparation', duration: 2, crewSize: 3, materials: [
        { item: 'Temporary Fencing', leadDays: 5 }, { item: 'Safety Signage', leadDays: 3 },
      ], inspectionRequired: false },
    ],
  },
  {
    name: 'Demolition', crew: 'Demo Crew',
    tasks: [
      { name: 'Interior Demolition', duration: 3, crewSize: 4, materials: [
        { item: 'Dumpster (30 yd)', leadDays: 3 }, { item: 'Dust Barriers', leadDays: 2 },
      ], inspectionRequired: false },
      { name: 'Debris Removal', duration: 1, crewSize: 3, materials: [], inspectionRequired: false },
    ],
  },
  {
    name: 'Foundation', crew: 'Concrete Crew',
    tasks: [
      { name: 'Foundation Excavation', duration: 2, crewSize: 3, materials: [
        { item: 'Gravel', leadDays: 4 }, { item: 'Vapor Barrier', leadDays: 5 },
      ], inspectionRequired: true },
      { name: 'Form & Rebar Installation', duration: 2, crewSize: 4, materials: [
        { item: 'Forms', leadDays: 5 }, { item: 'Rebar', leadDays: 7 }, { item: 'Ties', leadDays: 5 },
      ], inspectionRequired: true },
      { name: 'Concrete Pour', duration: 1, crewSize: 5, materials: [
        { item: 'Concrete (ready-mix)', leadDays: 2 },
      ], inspectionRequired: false },
      { name: 'Curing & Form Removal', duration: 7, crewSize: 2, materials: [], inspectionRequired: false },
    ],
  },
  {
    name: 'Framing', crew: 'Framing Crew',
    tasks: [
      { name: 'Floor Framing', duration: 3, crewSize: 4, materials: [
        { item: 'Lumber 2x10', leadDays: 7 }, { item: 'Joist Hangers', leadDays: 5 }, { item: 'Subfloor Plywood', leadDays: 7 },
      ], inspectionRequired: false },
      { name: 'Wall Framing', duration: 5, crewSize: 4, materials: [
        { item: 'Lumber 2x4', leadDays: 7 }, { item: 'Lumber 2x6', leadDays: 7 }, { item: 'Plates & Studs', leadDays: 7 },
      ], inspectionRequired: false },
      { name: 'Roof Framing', duration: 4, crewSize: 5, materials: [
        { item: 'Roof Trusses', leadDays: 21 }, { item: 'Roof Sheathing', leadDays: 7 }, { item: 'Hurricane Ties', leadDays: 5 },
      ], inspectionRequired: true },
      { name: 'Sheathing & House Wrap', duration: 2, crewSize: 3, materials: [
        { item: 'OSB Sheathing', leadDays: 7 }, { item: 'House Wrap', leadDays: 5 }, { item: 'Seam Tape', leadDays: 3 },
      ], inspectionRequired: false },
    ],
  },
  {
    name: 'Exterior', crew: 'Exterior Crew',
    tasks: [
      { name: 'Roofing', duration: 2, crewSize: 4, materials: [
        { item: 'Shingles', leadDays: 10 }, { item: 'Underlayment', leadDays: 7 }, { item: 'Drip Edge', leadDays: 5 }, { item: 'Ridge Vent', leadDays: 7 },
      ], inspectionRequired: false },
      { name: 'Windows & Exterior Doors', duration: 3, crewSize: 3, materials: [
        { item: 'Windows', leadDays: 28 }, { item: 'Exterior Doors', leadDays: 21 }, { item: 'Flashing', leadDays: 5 },
      ], inspectionRequired: false },
      { name: 'Siding Installation', duration: 5, crewSize: 4, materials: [
        { item: 'Siding', leadDays: 14 }, { item: 'Trim', leadDays: 10 }, { item: 'Caulk & Fasteners', leadDays: 3 },
      ], inspectionRequired: false },
    ],
  },
  {
    name: 'MEP Rough-In', crew: 'Electrical / Plumbing / HVAC',
    tasks: [
      { name: 'Electrical Rough-In', duration: 4, crewSize: 3, materials: [
        { item: 'Romex Wire', leadDays: 7 }, { item: 'Boxes', leadDays: 5 }, { item: 'Panel', leadDays: 14 }, { item: 'Conduit', leadDays: 5 },
      ], inspectionRequired: true },
      { name: 'Plumbing Rough-In', duration: 4, crewSize: 3, materials: [
        { item: 'PEX Tubing', leadDays: 7 }, { item: 'Fittings', leadDays: 5 }, { item: 'Drain Pipe', leadDays: 7 }, { item: 'Vents', leadDays: 5 },
      ], inspectionRequired: true },
      { name: 'HVAC Installation', duration: 3, crewSize: 3, materials: [
        { item: 'Ductwork', leadDays: 10 }, { item: 'Condenser/Unit', leadDays: 21 }, { item: 'Registers', leadDays: 7 }, { item: 'Thermostat', leadDays: 5 },
      ], inspectionRequired: true },
    ],
  },
  {
    name: 'Insulation & Drywall', crew: 'Insulation / Drywall Crew',
    tasks: [
      { name: 'Insulation Installation', duration: 2, crewSize: 3, materials: [
        { item: 'Insulation Batts R-19', leadDays: 7 }, { item: 'Insulation R-30', leadDays: 7 },
      ], inspectionRequired: true },
      { name: 'Drywall Hanging', duration: 4, crewSize: 4, materials: [
        { item: 'Drywall 1/2"', leadDays: 7 }, { item: 'Screws', leadDays: 3 },
      ], inspectionRequired: false },
      { name: 'Drywall Finishing', duration: 5, crewSize: 3, materials: [
        { item: 'Joint Compound', leadDays: 5 }, { item: 'Tape', leadDays: 3 }, { item: 'Corner Bead', leadDays: 5 },
      ], inspectionRequired: false },
    ],
  },
  {
    name: 'Interior Finishes', crew: 'Finish Carpenters / Painters',
    tasks: [
      { name: 'Interior Painting', duration: 5, crewSize: 3, materials: [
        { item: 'Primer', leadDays: 3 }, { item: 'Paint', leadDays: 5 }, { item: 'Supplies', leadDays: 3 },
      ], inspectionRequired: false },
      { name: 'Flooring Installation', duration: 4, crewSize: 3, materials: [
        { item: 'Flooring', leadDays: 21 }, { item: 'Underlayment', leadDays: 7 }, { item: 'Adhesive', leadDays: 5 },
      ], inspectionRequired: false },
      { name: 'Trim & Baseboards', duration: 3, crewSize: 2, materials: [
        { item: 'Trim & Baseboards', leadDays: 10 }, { item: 'Nails & Caulk', leadDays: 3 },
      ], inspectionRequired: false },
      { name: 'Cabinet Installation', duration: 2, crewSize: 2, materials: [
        { item: 'Cabinets', leadDays: 35 }, { item: 'Hardware', leadDays: 10 },
      ], inspectionRequired: false },
      { name: 'Countertop Installation', duration: 1, crewSize: 2, materials: [
        { item: 'Countertops', leadDays: 21 },
      ], inspectionRequired: false },
    ],
  },
  {
    name: 'Final Systems', crew: 'MEP Finish',
    tasks: [
      { name: 'Electrical Finish', duration: 2, crewSize: 2, materials: [
        { item: 'Outlets & Switches', leadDays: 5 }, { item: 'Fixtures', leadDays: 10 },
      ], inspectionRequired: true },
      { name: 'Plumbing Finish', duration: 2, crewSize: 2, materials: [
        { item: 'Faucets', leadDays: 10 }, { item: 'Toilets', leadDays: 10 },
      ], inspectionRequired: true },
      { name: 'HVAC Startup', duration: 1, crewSize: 1, materials: [], inspectionRequired: true },
    ],
  },
  {
    name: 'Completion', crew: 'PM / Cleanup',
    tasks: [
      { name: 'Final Cleanup', duration: 2, crewSize: 3, materials: [{ item: 'Cleaning Supplies', leadDays: 2 }], inspectionRequired: false },
      { name: 'Final / C.O. Inspection', duration: 1, crewSize: 1, materials: [], inspectionRequired: true },
      { name: 'Punch List Completion', duration: 3, crewSize: 3, materials: [], inspectionRequired: false },
    ],
  },
];

// ─── Routes ─────────────────────────────────────────────────────────────────

designStandardsRouter.get('/make-server-57095a78/design-standards/test', (c) =>
  c.json({ success: true, message: 'design-standards router alive' }));

// Building-code ruleset for a jurisdiction (seeds defaults into KV on first read).
designStandardsRouter.get('/make-server-57095a78/design-standards/code-rules', async (c) => {
  try {
    const jurisdiction = c.req.query('jurisdiction') || 'IRC2021';
    let ruleset = await kv.get(CODE_RULES_KEY(jurisdiction));
    if (!ruleset) {
      ruleset = DEFAULT_CODE_RULES[jurisdiction] || DEFAULT_CODE_RULES.IRC2021;
      await kv.set(CODE_RULES_KEY(ruleset.jurisdiction), ruleset);
    }
    return c.json({ success: true, ruleset });
  } catch (error) {
    console.log('design-standards code-rules error:', error);
    return c.json({ success: false, error: `Failed to load code rules: ${error}` }, 500);
  }
});

// Construction schedule phase/task templates (seeds defaults into KV on first read).
designStandardsRouter.get('/make-server-57095a78/design-standards/schedule-templates', async (c) => {
  try {
    let phases = await kv.get(SCHEDULE_KEY);
    if (!phases) {
      phases = DEFAULT_SCHEDULE_PHASES;
      await kv.set(SCHEDULE_KEY, phases);
    }
    return c.json({ success: true, phases });
  } catch (error) {
    console.log('design-standards schedule-templates error:', error);
    return c.json({ success: false, error: `Failed to load schedule templates: ${error}` }, 500);
  }
});

export default designStandardsRouter;
