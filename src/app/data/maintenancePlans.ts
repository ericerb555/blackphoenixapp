/**
 * maintenancePlans.ts — All service catalog data and pricing matrices.
 * Edit this file to add/remove services, adjust pricing, or change skill multipliers.
 * Nothing in the UI is hard-coded.
 */

// ─── Entity Types ─────────────────────────────────────────────────────────────

export type EntityType = 'homeowner' | 'condo' | 'landlord' | 'commercial';

export interface EntityConfig {
  id: EntityType;
  label: string;
  description: string;
  icon: string; // emoji
  accentColor: string;
}

export const ENTITY_TYPES: EntityConfig[] = [
  {
    id: 'homeowner',
    label: 'Homeowner',
    description: 'Single-family residential property',
    icon: '🏠',
    accentColor: '#3b82f6',
  },
  {
    id: 'condo',
    label: 'Condo Association',
    description: 'Multi-unit condo building or HOA',
    icon: '🏢',
    accentColor: '#8b5cf6',
  },
  {
    id: 'landlord',
    label: 'Landlord',
    description: 'Rental property owner (1–4 units)',
    icon: '🔑',
    accentColor: '#f59e0b',
  },
  {
    id: 'commercial',
    label: 'Commercial Property',
    description: 'Office, retail, or mixed-use building',
    icon: '🏗️',
    accentColor: '#10b981',
  },
];

// ─── Pricing Regions ──────────────────────────────────────────────────────────

export interface Region {
  id: string;
  label: string;
  description: string;
  priceMultiplier: number; // applied to every service base price for this region
}

export const REGIONS: Region[] = [
  {
    id: 'national',
    label: 'National (Standard)',
    description: 'Default pricing used outside specific service regions',
    priceMultiplier: 1.00,
  },
  {
    id: 'nh',
    label: 'New Hampshire',
    description: 'NH regional pricing — adjust the multiplier to set local rates',
    priceMultiplier: 1.00,
  },
];

// ─── Skill Levels ─────────────────────────────────────────────────────────────

export interface SkillLevel {
  id: string;
  label: string;
  description: string;
  multiplier: number; // applied to base price
  badge: string;
}

export const SKILL_LEVELS: SkillLevel[] = [
  {
    id: 'apprentice',
    label: 'Apprentice',
    description: 'Supervised tech, best value',
    multiplier: 0.80,
    badge: 'VALUE',
  },
  {
    id: 'journeyman',
    label: 'Journeyman',
    description: 'Licensed & experienced',
    multiplier: 1.00,
    badge: 'STANDARD',
  },
  {
    id: 'master',
    label: 'Master Technician',
    description: 'Top-tier specialist',
    multiplier: 1.30,
    badge: 'PREMIUM',
  },
];

// ─── Frequency / Subscription Tiers ──────────────────────────────────────────

export interface FrequencyTier {
  id: string;
  label: string;
  description: string;
  multiplier: number; // applied to base price
  savingsLabel?: string;
}

export const FREQUENCY_TIERS: FrequencyTier[] = [
  {
    id: 'monthly',
    label: 'Monthly',
    description: 'Every 30 days',
    multiplier: 1.00,
  },
  {
    id: 'quarterly',
    label: 'Quarterly',
    description: 'Every 3 months',
    multiplier: 0.90,
    savingsLabel: 'Save 10%',
  },
  {
    id: 'annual',
    label: 'Annual',
    description: 'Once per year',
    multiplier: 0.72,
    savingsLabel: 'Save 28%',
  },
];

// ─── Service Definition ────────────────────────────────────────────────────────

export interface ServiceItem {
  id: string;
  category: string;
  name: string;
  description: string;
  baseMonthlyPrice: number; // price at Journeyman + Monthly
  unit: string;             // e.g. "per visit", "per month"
  recommended?: boolean;
  nhSpecific?: boolean;     // NH regulatory or climate note
}

// ─── Service Catalog by Entity ────────────────────────────────────────────────

export const SERVICE_CATALOG: Record<EntityType, ServiceItem[]> = {

  // ── HOMEOWNER ───────────────────────────────────────────────────────────────
  homeowner: [
    // HVAC
    { id: 'ho-hvac-filter',    category: 'HVAC',          name: 'HVAC Filter Replacement',          description: 'Replace air filters, check airflow and belt tension.',          baseMonthlyPrice: 45,  unit: 'per visit',   recommended: true },
    { id: 'ho-hvac-tune',      category: 'HVAC',          name: 'Furnace/AC Tune-Up',               description: 'Full system inspection, clean coils, test refrigerant.',        baseMonthlyPrice: 95,  unit: 'per visit' },
    { id: 'ho-hvac-duct',      category: 'HVAC',          name: 'Duct Cleaning & Sealing',          description: 'Clean ductwork, seal leaks, improve efficiency.',                baseMonthlyPrice: 120, unit: 'per visit',   nhSpecific: true },
    // Plumbing
    { id: 'ho-plumb-inspect',  category: 'Plumbing',      name: 'Plumbing Inspection',              description: 'Check all fixtures, water pressure, and drain flow.',           baseMonthlyPrice: 75,  unit: 'per visit',   recommended: true },
    { id: 'ho-plumb-winterize',category: 'Plumbing',      name: 'Pipe Winterization',               description: 'Insulate exposed pipes, blowout irrigation (NH winters).',     baseMonthlyPrice: 130, unit: 'per visit',   nhSpecific: true },
    { id: 'ho-plumb-water',    category: 'Plumbing',      name: 'Water Heater Service',             description: 'Flush tank, test anode rod, check T&P valve.',                  baseMonthlyPrice: 85,  unit: 'per visit' },
    // Electrical
    { id: 'ho-elec-panel',     category: 'Electrical',    name: 'Panel Safety Inspection',          description: 'Inspect breakers, check for overloads and arc faults.',         baseMonthlyPrice: 90,  unit: 'per visit' },
    { id: 'ho-elec-gfci',      category: 'Electrical',    name: 'GFCI/AFCI Testing',                description: 'Test and reset all ground fault and arc fault interrupters.',   baseMonthlyPrice: 55,  unit: 'per visit' },
    { id: 'ho-elec-gen',       category: 'Electrical',    name: 'Generator Maintenance',            description: 'Test load, change oil, inspect fuel system (NH essential).',   baseMonthlyPrice: 110, unit: 'per visit',   nhSpecific: true },
    // Roofing & Exterior
    { id: 'ho-roof-inspect',   category: 'Roofing',       name: 'Roof & Flashing Inspection',       description: 'Check shingles, flashing, soffits, and fascia.',                baseMonthlyPrice: 95,  unit: 'per visit',   recommended: true },
    { id: 'ho-gutter-clean',   category: 'Roofing',       name: 'Gutter Cleaning & Inspection',     description: 'Clear debris, flush downspouts, check for sags.',              baseMonthlyPrice: 80,  unit: 'per visit' },
    { id: 'ho-roof-snow',      category: 'Roofing',       name: 'Snow & Ice Dam Removal',           description: 'Safely remove snow and break up ice dams (NH winter).',        baseMonthlyPrice: 200, unit: 'per visit',   nhSpecific: true },
    // Landscaping
    { id: 'ho-lawn-mow',       category: 'Landscaping',   name: 'Lawn Mowing & Edging',             description: 'Mow, edge, and blow clippings — weekly or bi-weekly.',          baseMonthlyPrice: 110, unit: 'per month',   recommended: true },
    { id: 'ho-lawn-fert',      category: 'Landscaping',   name: 'Fertilization & Weed Control',     description: 'Seasonal treatment program tailored to NH climate.',            baseMonthlyPrice: 65,  unit: 'per visit',   nhSpecific: true },
    { id: 'ho-snow-plow',      category: 'Landscaping',   name: 'Snow Plowing & Salting',           description: 'Driveway plow after 2" accumulation, walkway salting.',        baseMonthlyPrice: 175, unit: 'per month',   nhSpecific: true },
    // Structural
    { id: 'ho-struct-inspect', category: 'Structural',    name: 'Annual Home Inspection',           description: 'Full walk-through: foundation, framing, insulation, roof.',    baseMonthlyPrice: 180, unit: 'per visit' },
    { id: 'ho-struct-deck',    category: 'Structural',    name: 'Deck & Porch Inspection',          description: 'Check joists, ledger board, railings, fasteners.',              baseMonthlyPrice: 85,  unit: 'per visit' },
    // Safety
    { id: 'ho-safe-smoke',     category: 'Safety',        name: 'Smoke & CO Detector Service',      description: 'Test, replace batteries, verify NH code compliance.',           baseMonthlyPrice: 40,  unit: 'per visit',   recommended: true },
    { id: 'ho-safe-radon',     category: 'Safety',        name: 'Radon Testing',                    description: 'Short or long-term radon test (NH has high radon risk).',      baseMonthlyPrice: 95,  unit: 'per visit',   nhSpecific: true },
  ],

  // ── CONDO ASSOCIATION ───────────────────────────────────────────────────────
  condo: [
    // Common Area HVAC
    { id: 'ca-hvac-common',    category: 'HVAC',          name: 'Common Area HVAC Service',         description: 'Service lobby, hallway, and amenity HVAC systems.',            baseMonthlyPrice: 220, unit: 'per visit',   recommended: true },
    { id: 'ca-hvac-units',     category: 'HVAC',          name: 'Unit HVAC Program',                description: 'Scheduled filter replacement across all units.',               baseMonthlyPrice: 380, unit: 'per month' },
    { id: 'ca-hvac-cooling',   category: 'HVAC',          name: 'Cooling Tower Maintenance',        description: 'Clean, treat water, inspect fans and drift eliminators.',     baseMonthlyPrice: 290, unit: 'per visit' },
    // Plumbing
    { id: 'ca-plumb-main',     category: 'Plumbing',      name: 'Main Line Camera Inspection',      description: 'CCTV inspection of shared drain lines and mains.',             baseMonthlyPrice: 310, unit: 'per visit' },
    { id: 'ca-plumb-backflow', category: 'Plumbing',      name: 'Backflow Preventer Testing',       description: 'Annual test per NH plumbing code requirements.',               baseMonthlyPrice: 145, unit: 'per visit',   nhSpecific: true },
    { id: 'ca-plumb-pump',     category: 'Plumbing',      name: 'Sump & Ejector Pump Service',      description: 'Test, clean, and inspect backup battery systems.',             baseMonthlyPrice: 120, unit: 'per visit',   recommended: true },
    // Electrical
    { id: 'ca-elec-common',    category: 'Electrical',    name: 'Common Area Electrical Inspection', description: 'Inspect panels, lighting, exit signs, and EV circuits.',      baseMonthlyPrice: 190, unit: 'per visit' },
    { id: 'ca-elec-emerg',     category: 'Electrical',    name: 'Emergency Lighting Testing',       description: 'Monthly test of emergency exit lights per NH fire code.',      baseMonthlyPrice: 110, unit: 'per month',   nhSpecific: true },
    { id: 'ca-elec-ev',        category: 'Electrical',    name: 'EV Charging Station Maintenance',  description: 'Inspect, clean, and test all EV charging units.',              baseMonthlyPrice: 160, unit: 'per visit' },
    // Elevator
    { id: 'ca-elev-monthly',   category: 'Elevator',      name: 'Elevator Monthly Maintenance',     description: 'Full service per NH elevator code — lubricate, inspect.',      baseMonthlyPrice: 350, unit: 'per month',   nhSpecific: true },
    { id: 'ca-elev-annual',    category: 'Elevator',      name: 'Annual Elevator State Inspection', description: 'Coordinate and assist with NH state certification visit.',      baseMonthlyPrice: 480, unit: 'per visit',   nhSpecific: true, recommended: true },
    // Roofing & Exterior
    { id: 'ca-roof-flat',      category: 'Roofing',       name: 'Flat Roof Membrane Inspection',    description: 'Check seams, penetrations, and drain flow on flat roofs.',     baseMonthlyPrice: 220, unit: 'per visit',   recommended: true },
    { id: 'ca-roof-facade',    category: 'Roofing',       name: 'Façade & Cladding Inspection',     description: 'Check masonry, stucco, or siding for water infiltration.',     baseMonthlyPrice: 280, unit: 'per visit' },
    // Grounds
    { id: 'ca-grounds-full',   category: 'Grounds',       name: 'Full Grounds Maintenance',         description: 'Lawn, beds, edging, pruning — complete weekly program.',       baseMonthlyPrice: 520, unit: 'per month',   recommended: true },
    { id: 'ca-grounds-snow',   category: 'Grounds',       name: 'Snow & Ice Management',            description: 'Plow, sand, and salt all common areas and paths.',             baseMonthlyPrice: 640, unit: 'per month',   nhSpecific: true },
    // Fire/Safety
    { id: 'ca-fire-system',    category: 'Fire & Safety', name: 'Fire Suppression Inspection',      description: 'Inspect sprinklers, pull stations, and alarm panels.',         baseMonthlyPrice: 320, unit: 'per visit',   nhSpecific: true, recommended: true },
    { id: 'ca-fire-exting',    category: 'Fire & Safety', name: 'Fire Extinguisher Service',        description: 'Annual inspection and recharge per NH fire code.',             baseMonthlyPrice: 140, unit: 'per visit',   nhSpecific: true },
    // Structural
    { id: 'ca-struct-garage',  category: 'Structural',    name: 'Parking Garage Inspection',        description: 'Check deck, drains, expansion joints, and sealant.',          baseMonthlyPrice: 390, unit: 'per visit' },
    { id: 'ca-struct-reserve', category: 'Structural',    name: 'Reserve Study Site Assessment',    description: 'Annual walk-through supporting capital reserve planning.',      baseMonthlyPrice: 450, unit: 'per visit' },
  ],

  // ── LANDLORD ────────────────────────────────────────────────────────────────
  landlord: [
    // Turn Services
    { id: 'll-turn-clean',     category: 'Turn Services', name: 'Unit Turn Cleaning',               description: 'Deep clean between tenants — all rooms, appliances, baths.',  baseMonthlyPrice: 195, unit: 'per unit',    recommended: true },
    { id: 'll-turn-paint',     category: 'Turn Services', name: 'Unit Paint Touch-Up',              description: 'Patch walls, repaint accent walls and trim.',                  baseMonthlyPrice: 240, unit: 'per unit' },
    { id: 'll-turn-inspect',   category: 'Turn Services', name: 'Move-In/Move-Out Inspection',      description: 'Documented condition report with photos for NH RSA 540.',      baseMonthlyPrice: 110, unit: 'per unit',    nhSpecific: true, recommended: true },
    // HVAC
    { id: 'll-hvac-program',   category: 'HVAC',          name: 'Multi-Unit HVAC Filter Program',   description: 'Replace filters across all units on a set schedule.',          baseMonthlyPrice: 55,  unit: 'per unit/mo', recommended: true },
    { id: 'll-hvac-boiler',    category: 'HVAC',          name: 'Boiler Annual Service',            description: 'Flush, burner tune, safety controls check for NH heat.',       baseMonthlyPrice: 165, unit: 'per visit',   nhSpecific: true },
    // Plumbing
    { id: 'll-plumb-drain',    category: 'Plumbing',      name: 'Drain & Trap Maintenance',         description: 'Clear slow drains, freshen traps, check for leaks.',           baseMonthlyPrice: 80,  unit: 'per unit',    recommended: true },
    { id: 'll-plumb-water',    category: 'Plumbing',      name: 'Water Heater Fleet Service',       description: 'Flush and inspect all water heaters in portfolio.',            baseMonthlyPrice: 90,  unit: 'per unit' },
    // Electrical
    { id: 'll-elec-gfci',      category: 'Electrical',    name: 'GFCI & Smoke Detector Check',      description: 'Test all GFCI outlets and smoke detectors per NH law.',        baseMonthlyPrice: 50,  unit: 'per unit',    nhSpecific: true, recommended: true },
    { id: 'll-elec-panel',     category: 'Electrical',    name: 'Electrical Panel Inspection',      description: 'Check for overloaded circuits, double-tapping, proper labeling.',baseMonthlyPrice: 95, unit: 'per unit' },
    // Exterior
    { id: 'll-ext-gutter',     category: 'Exterior',      name: 'Gutter Cleaning',                  description: 'Clean gutters and flush downspouts — spring and fall.',        baseMonthlyPrice: 75,  unit: 'per unit' },
    { id: 'll-ext-snow',       category: 'Exterior',      name: 'Snow Removal Program',             description: 'Driveway & walkway clearing — NH landlord liability protection.', baseMonthlyPrice: 145, unit: 'per month',  nhSpecific: true, recommended: true },
    { id: 'll-ext-lawn',       category: 'Exterior',      name: 'Lawn Maintenance',                 description: 'Weekly mow, edge, and cleanup for curb appeal.',               baseMonthlyPrice: 120, unit: 'per month' },
    // Appliances
    { id: 'll-appl-inspect',   category: 'Appliances',    name: 'Appliance Safety Inspection',      description: 'Test all landlord-provided appliances for safe operation.',    baseMonthlyPrice: 60,  unit: 'per unit' },
    { id: 'll-appl-dryer',     category: 'Appliances',    name: 'Dryer Vent Cleaning',              description: 'Clean lint from vent — fire prevention, NH code.',              baseMonthlyPrice: 70,  unit: 'per unit',    nhSpecific: true },
    // Structural / Compliance
    { id: 'll-comp-lead',      category: 'Compliance',    name: 'Lead Paint Visual Assessment',     description: 'Pre-1978 buildings: visual check per NH RSA 130-A.',            baseMonthlyPrice: 130, unit: 'per visit',   nhSpecific: true },
    { id: 'll-comp-habitab',   category: 'Compliance',    name: 'Habitability Inspection',          description: 'Structural, weatherproofing, and code walk-through.',           baseMonthlyPrice: 155, unit: 'per unit',    recommended: true },
  ],

  // ── COMMERCIAL ──────────────────────────────────────────────────────────────
  commercial: [
    // HVAC
    { id: 'cm-hvac-rtu',       category: 'HVAC',          name: 'Rooftop Unit (RTU) Service',       description: 'Full RTU inspection, coil cleaning, belt/filter replacement.', baseMonthlyPrice: 280, unit: 'per unit',    recommended: true },
    { id: 'cm-hvac-vav',       category: 'HVAC',          name: 'VAV Box Calibration',              description: 'Calibrate variable air volume boxes for zone control.',        baseMonthlyPrice: 160, unit: 'per zone' },
    { id: 'cm-hvac-chiller',   category: 'HVAC',          name: 'Chiller & Cooling Tower PM',       description: 'Full preventive maintenance on chiller and tower.',             baseMonthlyPrice: 650, unit: 'per visit' },
    { id: 'cm-hvac-ahu',       category: 'HVAC',          name: 'Air Handling Unit Service',        description: 'Clean coils, inspect dampers, replace belts and filters.',     baseMonthlyPrice: 310, unit: 'per unit' },
    // Plumbing
    { id: 'cm-plumb-grease',   category: 'Plumbing',      name: 'Grease Trap Service',              description: 'Pump and clean grease trap — NH health code compliance.',       baseMonthlyPrice: 280, unit: 'per visit',   nhSpecific: true, recommended: true },
    { id: 'cm-plumb-backflow', category: 'Plumbing',      name: 'Backflow Prevention Program',      description: 'Annual certified test per NH water quality regulations.',       baseMonthlyPrice: 195, unit: 'per device',  nhSpecific: true },
    { id: 'cm-plumb-hydrant',  category: 'Plumbing',      name: 'Fire Hydrant Inspection',          description: 'Flow test and inspection per NFPA and NH fire code.',           baseMonthlyPrice: 220, unit: 'per visit',   nhSpecific: true },
    // Electrical
    { id: 'cm-elec-thermo',    category: 'Electrical',    name: 'Thermographic Panel Scan',         description: 'Infrared scan to find hot spots and overloaded circuits.',     baseMonthlyPrice: 380, unit: 'per visit',   recommended: true },
    { id: 'cm-elec-ups',       category: 'Electrical',    name: 'UPS & Generator Testing',          description: 'Load-bank test, battery inspection, fuel check.',              baseMonthlyPrice: 290, unit: 'per visit' },
    { id: 'cm-elec-lighting',  category: 'Electrical',    name: 'LED Lighting Audit & Retrofit',    description: 'Measure foot-candles, identify upgrade opportunities.',         baseMonthlyPrice: 195, unit: 'per visit' },
    // Fire & Life Safety
    { id: 'cm-fire-annual',    category: 'Fire & Life Safety', name: 'Annual Fire System Inspection', description: 'Full NFPA 25 inspection — sprinklers, alarms, pull stations.', baseMonthlyPrice: 580, unit: 'per visit',  nhSpecific: true, recommended: true },
    { id: 'cm-fire-kitchen',   category: 'Fire & Life Safety', name: 'Kitchen Suppression System', description: 'Semi-annual inspection of hood suppression — NH required.',     baseMonthlyPrice: 310, unit: 'per visit',   nhSpecific: true },
    { id: 'cm-fire-exit',      category: 'Fire & Life Safety', name: 'Emergency Egress Inspection', description: 'Test all exit lighting, door hardware, and ADA compliance.',  baseMonthlyPrice: 145, unit: 'per visit' },
    // Roofing
    { id: 'cm-roof-flat',      category: 'Roofing',       name: 'Flat Roof PM Program',             description: 'Bi-annual inspection, drain clearing, seam sealing.',          baseMonthlyPrice: 310, unit: 'per visit',   recommended: true },
    { id: 'cm-roof-drain',     category: 'Roofing',       name: 'Roof Drain & Overflow Service',    description: 'Clear drains, test overflow, inspect waterproofing.',          baseMonthlyPrice: 175, unit: 'per visit' },
    // Exterior & Grounds
    { id: 'cm-ext-parking',    category: 'Exterior',      name: 'Parking Lot Sweeping',             description: 'Power sweep lot, clear catch basins, document condition.',     baseMonthlyPrice: 220, unit: 'per visit' },
    { id: 'cm-ext-snow',       category: 'Exterior',      name: 'Commercial Snow & Ice Management', description: 'Plow, sand, salt — 24/7 response SLA (NH winters).',           baseMonthlyPrice: 890, unit: 'per month',   nhSpecific: true, recommended: true },
    { id: 'cm-ext-facade',     category: 'Exterior',      name: 'Exterior Pressure Washing',        description: 'Wash building exterior, sidewalks, and entryways.',            baseMonthlyPrice: 280, unit: 'per visit' },
    // Structural
    { id: 'cm-struct-inspect', category: 'Structural',    name: 'Structural Integrity Inspection',  description: 'Engineer walk-through: foundation, columns, beams, roof.',     baseMonthlyPrice: 490, unit: 'per visit',   recommended: true },
    { id: 'cm-struct-acs',     category: 'Structural',    name: 'ADA Compliance Assessment',        description: 'Review ramps, door widths, restrooms vs. ADA standards.',      baseMonthlyPrice: 320, unit: 'per visit' },
  ],
};

// ─── Helper: compute price ─────────────────────────────────────────────────────

export function computePrice(
  baseMonthlyPrice: number,
  skillMultiplier: number,
  frequencyMultiplier: number,
  regionMultiplier: number = 1,
): number {
  return Math.round(baseMonthlyPrice * skillMultiplier * frequencyMultiplier * regionMultiplier);
}

// ─── Helper: get unique categories for an entity ──────────────────────────────

export function getCategories(entity: EntityType): string[] {
  return Array.from(new Set(SERVICE_CATALOG[entity].map(s => s.category)));
}
