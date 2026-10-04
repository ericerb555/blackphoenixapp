/**
 * GENERATED FILE — do not edit by hand.
 *
 * Written by scripts/gen-plan-pricing-data.mjs from
 * src/app/data/maintenancePlans.ts, which is still where prices are edited.
 * Re-run the generator after changing them; tests/planPricingData.test.ts
 * fails if this file has fallen behind.
 *
 * The server needs its own copy because the edge function deploys only
 * supabase/functions/server/ and cannot import front-end code. Task P2 replaces
 * this with plan_addon records held in the catalogue.
 *
 * 115 services across 8 entity types.
 */

export interface ServerServiceItem {
  id: string;
  name: string;
  category: string;
  unit: string;
  description: string;
  baseMonthlyPrice: number;
  recommended?: boolean;
  nhSpecific?: boolean;
}

/** Applied to a service's base price. Keys are the ids saved on a plan. */
export const SKILL_MULTIPLIERS: Record<string, number> = {
  "apprentice": 0.8,
  "journeyman": 1,
  "master": 1.3
};

export const FREQUENCY_MULTIPLIERS: Record<string, number> = {
  "monthly": 1,
  "quarterly": 0.9,
  "annual": 0.72
};

export const REGION_MULTIPLIERS: Record<string, number> = {
  "national": 1,
  "nh": 1
};

export const SERVICE_CATALOG: Record<string, ServerServiceItem[]> = {
  "homeowner": [
    {
      "id": "ho-hvac-filter",
      "name": "HVAC Filter Replacement",
      "category": "HVAC",
      "unit": "per visit",
      "description": "Replace air filters, check airflow and belt tension.",
      "baseMonthlyPrice": 45,
      "recommended": true
    },
    {
      "id": "ho-hvac-tune",
      "name": "Furnace/AC Tune-Up",
      "category": "HVAC",
      "unit": "per visit",
      "description": "Full system inspection, clean coils, test refrigerant.",
      "baseMonthlyPrice": 95
    },
    {
      "id": "ho-hvac-duct",
      "name": "Duct Cleaning & Sealing",
      "category": "HVAC",
      "unit": "per visit",
      "description": "Clean ductwork, seal leaks, improve efficiency.",
      "baseMonthlyPrice": 120,
      "nhSpecific": true
    },
    {
      "id": "ho-plumb-inspect",
      "name": "Plumbing Inspection",
      "category": "Plumbing",
      "unit": "per visit",
      "description": "Check all fixtures, water pressure, and drain flow.",
      "baseMonthlyPrice": 75,
      "recommended": true
    },
    {
      "id": "ho-plumb-winterize",
      "name": "Pipe Winterization",
      "category": "Plumbing",
      "unit": "per visit",
      "description": "Insulate exposed pipes, blowout irrigation (NH winters).",
      "baseMonthlyPrice": 130,
      "nhSpecific": true
    },
    {
      "id": "ho-plumb-water",
      "name": "Water Heater Service",
      "category": "Plumbing",
      "unit": "per visit",
      "description": "Flush tank, test anode rod, check T&P valve.",
      "baseMonthlyPrice": 85
    },
    {
      "id": "ho-elec-panel",
      "name": "Panel Safety Inspection",
      "category": "Electrical",
      "unit": "per visit",
      "description": "Inspect breakers, check for overloads and arc faults.",
      "baseMonthlyPrice": 90
    },
    {
      "id": "ho-elec-gfci",
      "name": "GFCI/AFCI Testing",
      "category": "Electrical",
      "unit": "per visit",
      "description": "Test and reset all ground fault and arc fault interrupters.",
      "baseMonthlyPrice": 55
    },
    {
      "id": "ho-elec-gen",
      "name": "Generator Maintenance",
      "category": "Electrical",
      "unit": "per visit",
      "description": "Test load, change oil, inspect fuel system (NH essential).",
      "baseMonthlyPrice": 110,
      "nhSpecific": true
    },
    {
      "id": "ho-roof-inspect",
      "name": "Roof & Flashing Inspection",
      "category": "Roofing",
      "unit": "per visit",
      "description": "Check shingles, flashing, soffits, and fascia.",
      "baseMonthlyPrice": 95,
      "recommended": true
    },
    {
      "id": "ho-gutter-clean",
      "name": "Gutter Cleaning & Inspection",
      "category": "Roofing",
      "unit": "per visit",
      "description": "Clear debris, flush downspouts, check for sags.",
      "baseMonthlyPrice": 80
    },
    {
      "id": "ho-roof-snow",
      "name": "Snow & Ice Dam Removal",
      "category": "Roofing",
      "unit": "per visit",
      "description": "Safely remove snow and break up ice dams (NH winter).",
      "baseMonthlyPrice": 200,
      "nhSpecific": true
    },
    {
      "id": "ho-lawn-mow",
      "name": "Lawn Mowing & Edging",
      "category": "Landscaping",
      "unit": "per month",
      "description": "Mow, edge, and blow clippings — weekly or bi-weekly.",
      "baseMonthlyPrice": 110,
      "recommended": true
    },
    {
      "id": "ho-lawn-fert",
      "name": "Fertilization & Weed Control",
      "category": "Landscaping",
      "unit": "per visit",
      "description": "Seasonal treatment program tailored to NH climate.",
      "baseMonthlyPrice": 65,
      "nhSpecific": true
    },
    {
      "id": "ho-snow-plow",
      "name": "Snow Plowing & Salting",
      "category": "Landscaping",
      "unit": "per month",
      "description": "Driveway plow after 2\" accumulation, walkway salting.",
      "baseMonthlyPrice": 175,
      "nhSpecific": true
    },
    {
      "id": "ho-struct-inspect",
      "name": "Annual Home Inspection",
      "category": "Structural",
      "unit": "per visit",
      "description": "Full walk-through: foundation, framing, insulation, roof.",
      "baseMonthlyPrice": 180
    },
    {
      "id": "ho-struct-deck",
      "name": "Deck & Porch Inspection",
      "category": "Structural",
      "unit": "per visit",
      "description": "Check joists, ledger board, railings, fasteners.",
      "baseMonthlyPrice": 85
    },
    {
      "id": "ho-safe-smoke",
      "name": "Smoke & CO Detector Service",
      "category": "Safety",
      "unit": "per visit",
      "description": "Test, replace batteries, verify NH code compliance.",
      "baseMonthlyPrice": 40,
      "recommended": true
    },
    {
      "id": "ho-safe-radon",
      "name": "Radon Testing",
      "category": "Safety",
      "unit": "per visit",
      "description": "Short or long-term radon test (NH has high radon risk).",
      "baseMonthlyPrice": 95,
      "nhSpecific": true
    }
  ],
  "condo": [
    {
      "id": "ca-hvac-common",
      "name": "Common Area HVAC Service",
      "category": "HVAC",
      "unit": "per visit",
      "description": "Service lobby, hallway, and amenity HVAC systems.",
      "baseMonthlyPrice": 220,
      "recommended": true
    },
    {
      "id": "ca-hvac-units",
      "name": "Unit HVAC Program",
      "category": "HVAC",
      "unit": "per month",
      "description": "Scheduled filter replacement across all units.",
      "baseMonthlyPrice": 380
    },
    {
      "id": "ca-hvac-cooling",
      "name": "Cooling Tower Maintenance",
      "category": "HVAC",
      "unit": "per visit",
      "description": "Clean, treat water, inspect fans and drift eliminators.",
      "baseMonthlyPrice": 290
    },
    {
      "id": "ca-turn-paint",
      "name": "Quick Turn Paint Package",
      "category": "Unit Turnover",
      "unit": "per unit turn",
      "description": "Fast vacancy paint, patches and trim touch-ups for an individual unit.",
      "baseMonthlyPrice": 650,
      "recommended": true
    },
    {
      "id": "ca-turn-kitchen",
      "name": "Kitchen Refresh Add-On",
      "category": "Unit Turnover",
      "unit": "per unit / quoted add-on",
      "description": "Kitchen fixtures, cabinet hardware, paint and minor repair refresh.",
      "baseMonthlyPrice": 2450
    },
    {
      "id": "ca-turn-bathroom",
      "name": "Bathroom Refresh Add-On",
      "category": "Unit Turnover",
      "unit": "per unit / quoted add-on",
      "description": "Bathroom fixtures, vanity, caulk, paint and tile repair refresh.",
      "baseMonthlyPrice": 1950
    },
    {
      "id": "ca-turn-flooring",
      "name": "Flooring Replacement Add-On",
      "category": "Unit Turnover",
      "unit": "per unit / quoted add-on",
      "description": "Flooring replacement allowance; final material and room count are confirmed before work.",
      "baseMonthlyPrice": 1800
    },
    {
      "id": "ca-plumb-main",
      "name": "Main Line Camera Inspection",
      "category": "Plumbing",
      "unit": "per visit",
      "description": "CCTV inspection of shared drain lines and mains.",
      "baseMonthlyPrice": 310
    },
    {
      "id": "ca-plumb-backflow",
      "name": "Backflow Preventer Testing",
      "category": "Plumbing",
      "unit": "per visit",
      "description": "Annual test per NH plumbing code requirements.",
      "baseMonthlyPrice": 145,
      "nhSpecific": true
    },
    {
      "id": "ca-plumb-pump",
      "name": "Sump & Ejector Pump Service",
      "category": "Plumbing",
      "unit": "per visit",
      "description": "Test, clean, and inspect backup battery systems.",
      "baseMonthlyPrice": 120,
      "recommended": true
    },
    {
      "id": "ca-elec-common",
      "name": "Common Area Electrical Inspection",
      "category": "Electrical",
      "unit": "per visit",
      "description": "Inspect panels, lighting, exit signs, and EV circuits.",
      "baseMonthlyPrice": 190
    },
    {
      "id": "ca-elec-emerg",
      "name": "Emergency Lighting Testing",
      "category": "Electrical",
      "unit": "per month",
      "description": "Monthly test of emergency exit lights per NH fire code.",
      "baseMonthlyPrice": 110,
      "nhSpecific": true
    },
    {
      "id": "ca-elec-ev",
      "name": "EV Charging Station Maintenance",
      "category": "Electrical",
      "unit": "per visit",
      "description": "Inspect, clean, and test all EV charging units.",
      "baseMonthlyPrice": 160
    },
    {
      "id": "ca-elev-monthly",
      "name": "Elevator Monthly Maintenance",
      "category": "Elevator",
      "unit": "per month",
      "description": "Full service per NH elevator code — lubricate, inspect.",
      "baseMonthlyPrice": 350,
      "nhSpecific": true
    },
    {
      "id": "ca-elev-annual",
      "name": "Annual Elevator State Inspection",
      "category": "Elevator",
      "unit": "per visit",
      "description": "Coordinate and assist with NH state certification visit.",
      "baseMonthlyPrice": 480,
      "recommended": true,
      "nhSpecific": true
    },
    {
      "id": "ca-roof-flat",
      "name": "Flat Roof Membrane Inspection",
      "category": "Roofing",
      "unit": "per visit",
      "description": "Check seams, penetrations, and drain flow on flat roofs.",
      "baseMonthlyPrice": 220,
      "recommended": true
    },
    {
      "id": "ca-roof-facade",
      "name": "Façade & Cladding Inspection",
      "category": "Roofing",
      "unit": "per visit",
      "description": "Check masonry, stucco, or siding for water infiltration.",
      "baseMonthlyPrice": 280
    },
    {
      "id": "ca-grounds-full",
      "name": "Full Grounds Maintenance",
      "category": "Grounds",
      "unit": "per month",
      "description": "Lawn, beds, edging, pruning — complete weekly program.",
      "baseMonthlyPrice": 520,
      "recommended": true
    },
    {
      "id": "ca-grounds-snow",
      "name": "Snow & Ice Management",
      "category": "Grounds",
      "unit": "per month",
      "description": "Plow, sand, and salt all common areas and paths.",
      "baseMonthlyPrice": 640,
      "nhSpecific": true
    },
    {
      "id": "ca-fire-system",
      "name": "Fire Suppression Inspection",
      "category": "Fire & Safety",
      "unit": "per visit",
      "description": "Inspect sprinklers, pull stations, and alarm panels.",
      "baseMonthlyPrice": 320,
      "recommended": true,
      "nhSpecific": true
    },
    {
      "id": "ca-fire-exting",
      "name": "Fire Extinguisher Service",
      "category": "Fire & Safety",
      "unit": "per visit",
      "description": "Annual inspection and recharge per NH fire code.",
      "baseMonthlyPrice": 140,
      "nhSpecific": true
    },
    {
      "id": "ca-struct-garage",
      "name": "Parking Garage Inspection",
      "category": "Structural",
      "unit": "per visit",
      "description": "Check deck, drains, expansion joints, and sealant.",
      "baseMonthlyPrice": 390
    },
    {
      "id": "ca-struct-reserve",
      "name": "Reserve Study Site Assessment",
      "category": "Structural",
      "unit": "per visit",
      "description": "Annual walk-through supporting capital reserve planning.",
      "baseMonthlyPrice": 450
    }
  ],
  "landlord": [
    {
      "id": "ll-turn-clean",
      "name": "Unit Turn Cleaning",
      "category": "Turn Services",
      "unit": "per unit",
      "description": "Deep clean between tenants — all rooms, appliances, baths.",
      "baseMonthlyPrice": 195,
      "recommended": true
    },
    {
      "id": "ll-turn-paint",
      "name": "Unit Paint Touch-Up",
      "category": "Turn Services",
      "unit": "per unit",
      "description": "Patch walls, repaint accent walls and trim.",
      "baseMonthlyPrice": 240
    },
    {
      "id": "ll-turn-inspect",
      "name": "Move-In/Move-Out Inspection",
      "category": "Turn Services",
      "unit": "per unit",
      "description": "Documented condition report with photos for NH RSA 540.",
      "baseMonthlyPrice": 110,
      "recommended": true,
      "nhSpecific": true
    },
    {
      "id": "ll-turn-quick-paint",
      "name": "Quick Turn Paint Package",
      "category": "Unit Turnover",
      "unit": "per unit turn",
      "description": "Fast patch, prep, walls, trim and touch-ups for a rent-ready unit.",
      "baseMonthlyPrice": 650,
      "recommended": true
    },
    {
      "id": "ll-turn-kitchen",
      "name": "Kitchen Turnover Refresh",
      "category": "Unit Turnover",
      "unit": "per unit / quoted add-on",
      "description": "Cabinet hardware, paint, fixtures, sink/faucet and appliance-ready refresh. Scope confirmed before work.",
      "baseMonthlyPrice": 2450,
      "recommended": true
    },
    {
      "id": "ll-turn-bathroom",
      "name": "Bathroom Turnover Refresh",
      "category": "Unit Turnover",
      "unit": "per unit / quoted add-on",
      "description": "Vanity, toilet, fixtures, caulk, paint and tile repair refresh. Scope confirmed before work.",
      "baseMonthlyPrice": 1950,
      "recommended": true
    },
    {
      "id": "ll-turn-flooring",
      "name": "Flooring Replacement Allowance",
      "category": "Unit Turnover",
      "unit": "per unit / quoted add-on",
      "description": "Remove and replace damaged flooring; final scope depends on room count, material and subfloor condition.",
      "baseMonthlyPrice": 1800,
      "recommended": true
    },
    {
      "id": "ll-turn-full",
      "name": "Full Make-Ready Turn Package",
      "category": "Unit Turnover",
      "unit": "per unit turn",
      "description": "Coordinated clean, paint, minor repairs, punch list and move-in readiness review.",
      "baseMonthlyPrice": 3200,
      "recommended": true
    },
    {
      "id": "ll-hvac-program",
      "name": "Multi-Unit HVAC Filter Program",
      "category": "HVAC",
      "unit": "per unit/mo",
      "description": "Replace filters across all units on a set schedule.",
      "baseMonthlyPrice": 55,
      "recommended": true
    },
    {
      "id": "ll-hvac-boiler",
      "name": "Boiler Annual Service",
      "category": "HVAC",
      "unit": "per visit",
      "description": "Flush, burner tune, safety controls check for NH heat.",
      "baseMonthlyPrice": 165,
      "nhSpecific": true
    },
    {
      "id": "ll-plumb-drain",
      "name": "Drain & Trap Maintenance",
      "category": "Plumbing",
      "unit": "per unit",
      "description": "Clear slow drains, freshen traps, check for leaks.",
      "baseMonthlyPrice": 80,
      "recommended": true
    },
    {
      "id": "ll-plumb-water",
      "name": "Water Heater Fleet Service",
      "category": "Plumbing",
      "unit": "per unit",
      "description": "Flush and inspect all water heaters in portfolio.",
      "baseMonthlyPrice": 90
    },
    {
      "id": "ll-elec-gfci",
      "name": "GFCI & Smoke Detector Check",
      "category": "Electrical",
      "unit": "per unit",
      "description": "Test all GFCI outlets and smoke detectors per NH law.",
      "baseMonthlyPrice": 50,
      "recommended": true,
      "nhSpecific": true
    },
    {
      "id": "ll-elec-panel",
      "name": "Electrical Panel Inspection",
      "category": "Electrical",
      "unit": "per unit",
      "description": "Check for overloaded circuits, double-tapping, proper labeling.",
      "baseMonthlyPrice": 95
    },
    {
      "id": "ll-ext-gutter",
      "name": "Gutter Cleaning",
      "category": "Exterior",
      "unit": "per unit",
      "description": "Clean gutters and flush downspouts — spring and fall.",
      "baseMonthlyPrice": 75
    },
    {
      "id": "ll-ext-snow",
      "name": "Snow Removal Program",
      "category": "Exterior",
      "unit": "per month",
      "description": "Driveway & walkway clearing — NH landlord liability protection.",
      "baseMonthlyPrice": 145,
      "recommended": true,
      "nhSpecific": true
    },
    {
      "id": "ll-ext-lawn",
      "name": "Lawn Maintenance",
      "category": "Exterior",
      "unit": "per month",
      "description": "Weekly mow, edge, and cleanup for curb appeal.",
      "baseMonthlyPrice": 120
    },
    {
      "id": "ll-appl-inspect",
      "name": "Appliance Safety Inspection",
      "category": "Appliances",
      "unit": "per unit",
      "description": "Test all landlord-provided appliances for safe operation.",
      "baseMonthlyPrice": 60
    },
    {
      "id": "ll-appl-dryer",
      "name": "Dryer Vent Cleaning",
      "category": "Appliances",
      "unit": "per unit",
      "description": "Clean lint from vent — fire prevention, NH code.",
      "baseMonthlyPrice": 70,
      "nhSpecific": true
    },
    {
      "id": "ll-comp-lead",
      "name": "Lead Paint Visual Assessment",
      "category": "Compliance",
      "unit": "per visit",
      "description": "Pre-1978 buildings: visual check per NH RSA 130-A.",
      "baseMonthlyPrice": 130,
      "nhSpecific": true
    },
    {
      "id": "ll-comp-habitab",
      "name": "Habitability Inspection",
      "category": "Compliance",
      "unit": "per unit",
      "description": "Structural, weatherproofing, and code walk-through.",
      "baseMonthlyPrice": 155,
      "recommended": true
    }
  ],
  "commercial": [
    {
      "id": "cm-hvac-rtu",
      "name": "Rooftop Unit (RTU) Service",
      "category": "HVAC",
      "unit": "per unit",
      "description": "Full RTU inspection, coil cleaning, belt/filter replacement.",
      "baseMonthlyPrice": 280,
      "recommended": true
    },
    {
      "id": "cm-hvac-vav",
      "name": "VAV Box Calibration",
      "category": "HVAC",
      "unit": "per zone",
      "description": "Calibrate variable air volume boxes for zone control.",
      "baseMonthlyPrice": 160
    },
    {
      "id": "cm-hvac-chiller",
      "name": "Chiller & Cooling Tower PM",
      "category": "HVAC",
      "unit": "per visit",
      "description": "Full preventive maintenance on chiller and tower.",
      "baseMonthlyPrice": 650
    },
    {
      "id": "cm-hvac-ahu",
      "name": "Air Handling Unit Service",
      "category": "HVAC",
      "unit": "per unit",
      "description": "Clean coils, inspect dampers, replace belts and filters.",
      "baseMonthlyPrice": 310
    },
    {
      "id": "cm-plumb-grease",
      "name": "Grease Trap Service",
      "category": "Plumbing",
      "unit": "per visit",
      "description": "Pump and clean grease trap — NH health code compliance.",
      "baseMonthlyPrice": 280,
      "recommended": true,
      "nhSpecific": true
    },
    {
      "id": "cm-plumb-backflow",
      "name": "Backflow Prevention Program",
      "category": "Plumbing",
      "unit": "per device",
      "description": "Annual certified test per NH water quality regulations.",
      "baseMonthlyPrice": 195,
      "nhSpecific": true
    },
    {
      "id": "cm-plumb-hydrant",
      "name": "Fire Hydrant Inspection",
      "category": "Plumbing",
      "unit": "per visit",
      "description": "Flow test and inspection per NFPA and NH fire code.",
      "baseMonthlyPrice": 220,
      "nhSpecific": true
    },
    {
      "id": "cm-elec-thermo",
      "name": "Thermographic Panel Scan",
      "category": "Electrical",
      "unit": "per visit",
      "description": "Infrared scan to find hot spots and overloaded circuits.",
      "baseMonthlyPrice": 380,
      "recommended": true
    },
    {
      "id": "cm-elec-ups",
      "name": "UPS & Generator Testing",
      "category": "Electrical",
      "unit": "per visit",
      "description": "Load-bank test, battery inspection, fuel check.",
      "baseMonthlyPrice": 290
    },
    {
      "id": "cm-elec-lighting",
      "name": "LED Lighting Audit & Retrofit",
      "category": "Electrical",
      "unit": "per visit",
      "description": "Measure foot-candles, identify upgrade opportunities.",
      "baseMonthlyPrice": 195
    },
    {
      "id": "cm-fire-annual",
      "name": "Annual Fire System Inspection",
      "category": "Fire & Life Safety",
      "unit": "per visit",
      "description": "Full NFPA 25 inspection — sprinklers, alarms, pull stations.",
      "baseMonthlyPrice": 580,
      "recommended": true,
      "nhSpecific": true
    },
    {
      "id": "cm-fire-kitchen",
      "name": "Kitchen Suppression System",
      "category": "Fire & Life Safety",
      "unit": "per visit",
      "description": "Semi-annual inspection of hood suppression — NH required.",
      "baseMonthlyPrice": 310,
      "nhSpecific": true
    },
    {
      "id": "cm-fire-exit",
      "name": "Emergency Egress Inspection",
      "category": "Fire & Life Safety",
      "unit": "per visit",
      "description": "Test all exit lighting, door hardware, and ADA compliance.",
      "baseMonthlyPrice": 145
    },
    {
      "id": "cm-roof-flat",
      "name": "Flat Roof PM Program",
      "category": "Roofing",
      "unit": "per visit",
      "description": "Bi-annual inspection, drain clearing, seam sealing.",
      "baseMonthlyPrice": 310,
      "recommended": true
    },
    {
      "id": "cm-roof-drain",
      "name": "Roof Drain & Overflow Service",
      "category": "Roofing",
      "unit": "per visit",
      "description": "Clear drains, test overflow, inspect waterproofing.",
      "baseMonthlyPrice": 175
    },
    {
      "id": "cm-ext-parking",
      "name": "Parking Lot Sweeping",
      "category": "Exterior",
      "unit": "per visit",
      "description": "Power sweep lot, clear catch basins, document condition.",
      "baseMonthlyPrice": 220
    },
    {
      "id": "cm-ext-snow",
      "name": "Commercial Snow & Ice Management",
      "category": "Exterior",
      "unit": "per month",
      "description": "Plow, sand, salt — 24/7 response SLA (NH winters).",
      "baseMonthlyPrice": 890,
      "recommended": true,
      "nhSpecific": true
    },
    {
      "id": "cm-ext-facade",
      "name": "Exterior Pressure Washing",
      "category": "Exterior",
      "unit": "per visit",
      "description": "Wash building exterior, sidewalks, and entryways.",
      "baseMonthlyPrice": 280
    },
    {
      "id": "cm-struct-inspect",
      "name": "Structural Integrity Inspection",
      "category": "Structural",
      "unit": "per visit",
      "description": "Engineer walk-through: foundation, columns, beams, roof.",
      "baseMonthlyPrice": 490,
      "recommended": true
    },
    {
      "id": "cm-struct-acs",
      "name": "ADA Compliance Assessment",
      "category": "Structural",
      "unit": "per visit",
      "description": "Review ramps, door widths, restrooms vs. ADA standards.",
      "baseMonthlyPrice": 320
    }
  ],
  "vendor": [
    {
      "id": "vn-storefront-featured",
      "name": "Featured Storefront Placement",
      "category": "Storefront",
      "unit": "per month",
      "description": "Priority placement of your store on marketplace browse and search.",
      "baseMonthlyPrice": 149,
      "recommended": true
    },
    {
      "id": "vn-listings-extra",
      "name": "Extra Product Listings (+500)",
      "category": "Catalog",
      "unit": "per month",
      "description": "Raise your catalog cap by 500 active SKUs.",
      "baseMonthlyPrice": 79
    },
    {
      "id": "vn-multi-location",
      "name": "Additional Store Location",
      "category": "Operations",
      "unit": "per location/mo",
      "description": "Manage another storefront / warehouse under one account.",
      "baseMonthlyPrice": 89
    },
    {
      "id": "vn-inventory-sync",
      "name": "Real-Time Inventory Sync",
      "category": "Operations",
      "unit": "per month",
      "description": "Live stock sync across channels to prevent oversells.",
      "baseMonthlyPrice": 99,
      "recommended": true
    },
    {
      "id": "vn-api",
      "name": "API & Integrations Access",
      "category": "Operations",
      "unit": "per month",
      "description": "REST/webhook access for ERP, POS, and 3PL integrations.",
      "baseMonthlyPrice": 110
    },
    {
      "id": "vn-promo-tools",
      "name": "Marketing & Promotion Suite",
      "category": "Marketing",
      "unit": "per month",
      "description": "Coupons, bundles, flash sales, and email blasts.",
      "baseMonthlyPrice": 120,
      "recommended": true
    },
    {
      "id": "vn-analytics",
      "name": "Advanced Sales Analytics",
      "category": "Analytics",
      "unit": "per month",
      "description": "Cohorts, conversion funnels, and SKU-level margin reporting.",
      "baseMonthlyPrice": 70
    },
    {
      "id": "vn-priority-support",
      "name": "Priority Vendor Support",
      "category": "Support",
      "unit": "per month",
      "description": "Dedicated queue with same-business-day response.",
      "baseMonthlyPrice": 60
    }
  ],
  "subcontractor": [
    {
      "id": "sc-lead-pack",
      "name": "Extra Lead Package (+25/mo)",
      "category": "Leads",
      "unit": "per month",
      "description": "Add 25 qualified job leads in your trade and service area.",
      "baseMonthlyPrice": 129,
      "recommended": true
    },
    {
      "id": "sc-priority-dispatch",
      "name": "Priority Dispatch",
      "category": "Operations",
      "unit": "per month",
      "description": "First-look on new jobs before they hit the open board.",
      "baseMonthlyPrice": 89,
      "recommended": true
    },
    {
      "id": "sc-gps",
      "name": "GPS Fleet Tracking",
      "category": "Operations",
      "unit": "per month",
      "description": "Live crew/vehicle tracking with route history.",
      "baseMonthlyPrice": 59
    },
    {
      "id": "sc-crew-seat",
      "name": "Additional Crew Seat",
      "category": "Team",
      "unit": "per seat/mo",
      "description": "Add a technician login with scheduling and job access.",
      "baseMonthlyPrice": 39
    },
    {
      "id": "sc-insurance",
      "name": "Insurance & Compliance Manager",
      "category": "Compliance",
      "unit": "per month",
      "description": "Track COIs, licenses, and NH trade-license renewals.",
      "baseMonthlyPrice": 45,
      "nhSpecific": true
    },
    {
      "id": "sc-invoicing",
      "name": "Invoice & Payment Processing",
      "category": "Finance",
      "unit": "per month",
      "description": "Send invoices, collect card/ACH, and auto-reconcile payouts.",
      "baseMonthlyPrice": 49,
      "recommended": true
    },
    {
      "id": "sc-reviews",
      "name": "Review & Reputation Boost",
      "category": "Marketing",
      "unit": "per month",
      "description": "Automated review requests and a public reputation profile.",
      "baseMonthlyPrice": 55
    },
    {
      "id": "sc-portfolio",
      "name": "Featured Portfolio Placement",
      "category": "Marketing",
      "unit": "per month",
      "description": "Showcase completed work at the top of your trade category.",
      "baseMonthlyPrice": 75
    }
  ],
  "advertiser": [
    {
      "id": "ad-impressions",
      "name": "Extra Impression Pack (+50k)",
      "category": "Reach",
      "unit": "per month",
      "description": "Add 50,000 guaranteed impressions across the network.",
      "baseMonthlyPrice": 199,
      "recommended": true
    },
    {
      "id": "ad-homepage",
      "name": "Premium Homepage Placement",
      "category": "Placement",
      "unit": "per month",
      "description": "Hero/banner slot on high-traffic homepage and category pages.",
      "baseMonthlyPrice": 349
    },
    {
      "id": "ad-campaign",
      "name": "Additional Active Campaign",
      "category": "Campaigns",
      "unit": "per campaign/mo",
      "description": "Run another concurrent campaign with its own budget and creative.",
      "baseMonthlyPrice": 129
    },
    {
      "id": "ad-video",
      "name": "Video Ad Production",
      "category": "Creative",
      "unit": "per month",
      "description": "Produced short-form video ad, revisions included.",
      "baseMonthlyPrice": 450
    },
    {
      "id": "ad-targeting",
      "name": "Advanced Targeting Suite",
      "category": "Targeting",
      "unit": "per month",
      "description": "Geo, demographic, behavioral, and lookalike audience targeting.",
      "baseMonthlyPrice": 149,
      "recommended": true
    },
    {
      "id": "ad-abtest",
      "name": "A/B Testing & Optimization",
      "category": "Optimization",
      "unit": "per month",
      "description": "Automated creative/audience testing to lift ROAS.",
      "baseMonthlyPrice": 99
    },
    {
      "id": "ad-strategist",
      "name": "Dedicated Campaign Strategist",
      "category": "Support",
      "unit": "per month",
      "description": "A named strategist managing pacing, bids, and optimization.",
      "baseMonthlyPrice": 299
    },
    {
      "id": "ad-reporting",
      "name": "White-Label Reporting",
      "category": "Analytics",
      "unit": "per month",
      "description": "Branded, scheduled performance reports for your clients.",
      "baseMonthlyPrice": 89
    }
  ],
  "investor": [
    {
      "id": "in-dealroom",
      "name": "Full Deal Room Access",
      "category": "Access",
      "unit": "per month",
      "description": "Documents, financials, and diligence materials for open deals.",
      "baseMonthlyPrice": 99,
      "recommended": true
    },
    {
      "id": "in-early",
      "name": "Early / Priority Deal Access",
      "category": "Access",
      "unit": "per month",
      "description": "See and reserve allocations before deals open to the network.",
      "baseMonthlyPrice": 149,
      "recommended": true
    },
    {
      "id": "in-coinvest",
      "name": "Co-Investment Access",
      "category": "Access",
      "unit": "per month",
      "description": "Join syndicated co-investment opportunities alongside the fund.",
      "baseMonthlyPrice": 175
    },
    {
      "id": "in-reports",
      "name": "Monthly Portfolio Reports",
      "category": "Reporting",
      "unit": "per month",
      "description": "Statements, distributions, and performance summaries each month.",
      "baseMonthlyPrice": 79,
      "recommended": true
    },
    {
      "id": "in-analytics",
      "name": "Custom Portfolio Analytics",
      "category": "Analytics",
      "unit": "per month",
      "description": "Configurable dashboards for IRR, equity multiple, and cash flow.",
      "baseMonthlyPrice": 129
    },
    {
      "id": "in-tax",
      "name": "Tax Document Center",
      "category": "Compliance",
      "unit": "per month",
      "description": "K-1s, 1099s, and downloadable tax packages by entity.",
      "baseMonthlyPrice": 45
    },
    {
      "id": "in-strategy",
      "name": "Quarterly Strategy Call",
      "category": "Advisory",
      "unit": "per quarter",
      "description": "Portfolio review and strategy session with the investment team.",
      "baseMonthlyPrice": 199
    },
    {
      "id": "in-relations",
      "name": "Dedicated Investor Relations",
      "category": "Advisory",
      "unit": "per month",
      "description": "A named IR manager for questions, requests, and reporting.",
      "baseMonthlyPrice": 250
    }
  ]
};

/** The three standard bundles per entity, by the service ids they contain. */
export const PLAN_PRESETS: Record<string, Array<{ id: string; name: string; serviceIds: string[] }>> = {
  "homeowner": [
    {
      "id": "ho-essential",
      "name": "Essential Care",
      "serviceIds": [
        "ho-hvac-filter",
        "ho-safe-smoke",
        "ho-plumb-inspect"
      ]
    },
    {
      "id": "ho-preferred",
      "name": "Preferred Home",
      "serviceIds": [
        "ho-hvac-tune",
        "ho-plumb-inspect",
        "ho-roof-inspect",
        "ho-safe-smoke",
        "ho-gutter-clean"
      ]
    },
    {
      "id": "ho-premium",
      "name": "Total Home",
      "serviceIds": [
        "ho-hvac-tune",
        "ho-plumb-inspect",
        "ho-roof-inspect",
        "ho-elec-panel",
        "ho-safe-smoke",
        "ho-safe-radon",
        "ho-snow-plow",
        "ho-lawn-mow"
      ]
    }
  ],
  "condo": [
    {
      "id": "ca-essential",
      "name": "Association Essential",
      "serviceIds": [
        "ca-hvac-common",
        "ca-fire-exting",
        "ca-elec-emerg"
      ]
    },
    {
      "id": "ca-preferred",
      "name": "Association Preferred",
      "serviceIds": [
        "ca-hvac-common",
        "ca-fire-system",
        "ca-plumb-pump",
        "ca-grounds-full",
        "ca-elec-emerg"
      ]
    },
    {
      "id": "ca-premium",
      "name": "Association Complete",
      "serviceIds": [
        "ca-hvac-common",
        "ca-hvac-units",
        "ca-fire-system",
        "ca-elev-monthly",
        "ca-grounds-full",
        "ca-grounds-snow",
        "ca-struct-reserve",
        "ca-plumb-pump"
      ]
    }
  ],
  "landlord": [
    {
      "id": "ll-essential",
      "name": "Landlord Essential",
      "serviceIds": [
        "ll-hvac-program",
        "ll-elec-gfci",
        "ll-turn-inspect"
      ]
    },
    {
      "id": "ll-preferred",
      "name": "Landlord Preferred",
      "serviceIds": [
        "ll-hvac-program",
        "ll-elec-gfci",
        "ll-turn-clean",
        "ll-ext-snow",
        "ll-comp-habitab"
      ]
    },
    {
      "id": "ll-premium",
      "name": "Portfolio Complete",
      "serviceIds": [
        "ll-hvac-program",
        "ll-elec-gfci",
        "ll-turn-clean",
        "ll-turn-quick-paint",
        "ll-ext-snow",
        "ll-ext-lawn",
        "ll-comp-habitab",
        "ll-appl-dryer"
      ]
    }
  ],
  "commercial": [
    {
      "id": "cm-essential",
      "name": "Commercial Essential",
      "serviceIds": [
        "cm-hvac-rtu",
        "cm-fire-exit",
        "cm-roof-drain"
      ]
    },
    {
      "id": "cm-preferred",
      "name": "Commercial Preferred",
      "serviceIds": [
        "cm-hvac-rtu",
        "cm-fire-annual",
        "cm-roof-flat",
        "cm-ext-snow",
        "cm-elec-thermo"
      ]
    },
    {
      "id": "cm-premium",
      "name": "Facility Complete",
      "serviceIds": [
        "cm-hvac-rtu",
        "cm-hvac-ahu",
        "cm-fire-annual",
        "cm-roof-flat",
        "cm-ext-snow",
        "cm-ext-parking",
        "cm-struct-inspect",
        "cm-elec-thermo"
      ]
    }
  ],
  "vendor": [
    {
      "id": "vn-essential",
      "name": "Vendor Starter",
      "serviceIds": [
        "vn-storefront-featured",
        "vn-inventory-sync"
      ]
    },
    {
      "id": "vn-preferred",
      "name": "Vendor Growth",
      "serviceIds": [
        "vn-storefront-featured",
        "vn-inventory-sync",
        "vn-analytics",
        "vn-promo-tools"
      ]
    },
    {
      "id": "vn-premium",
      "name": "Vendor Scale",
      "serviceIds": [
        "vn-storefront-featured",
        "vn-inventory-sync",
        "vn-analytics",
        "vn-promo-tools",
        "vn-multi-location",
        "vn-api",
        "vn-priority-support"
      ]
    }
  ],
  "subcontractor": [
    {
      "id": "sc-essential",
      "name": "Pro Starter",
      "serviceIds": [
        "sc-lead-pack",
        "sc-invoicing"
      ]
    },
    {
      "id": "sc-preferred",
      "name": "Pro Growth",
      "serviceIds": [
        "sc-lead-pack",
        "sc-priority-dispatch",
        "sc-reviews",
        "sc-invoicing"
      ]
    },
    {
      "id": "sc-premium",
      "name": "Crew Complete",
      "serviceIds": [
        "sc-lead-pack",
        "sc-priority-dispatch",
        "sc-gps",
        "sc-crew-seat",
        "sc-insurance",
        "sc-reviews",
        "sc-invoicing"
      ]
    }
  ],
  "advertiser": [
    {
      "id": "ad-essential",
      "name": "Campaign Starter",
      "serviceIds": [
        "ad-impressions",
        "ad-targeting"
      ]
    },
    {
      "id": "ad-preferred",
      "name": "Campaign Growth",
      "serviceIds": [
        "ad-impressions",
        "ad-targeting",
        "ad-abtest",
        "ad-reporting"
      ]
    },
    {
      "id": "ad-premium",
      "name": "Brand Complete",
      "serviceIds": [
        "ad-impressions",
        "ad-homepage",
        "ad-targeting",
        "ad-abtest",
        "ad-video",
        "ad-strategist",
        "ad-reporting"
      ]
    }
  ],
  "investor": [
    {
      "id": "in-essential",
      "name": "Observer",
      "serviceIds": [
        "in-dealroom",
        "in-reports"
      ]
    },
    {
      "id": "in-preferred",
      "name": "Partner",
      "serviceIds": [
        "in-dealroom",
        "in-reports",
        "in-early",
        "in-analytics"
      ]
    },
    {
      "id": "in-premium",
      "name": "Principal",
      "serviceIds": [
        "in-dealroom",
        "in-reports",
        "in-early",
        "in-analytics",
        "in-strategy",
        "in-coinvest",
        "in-relations",
        "in-tax"
      ]
    }
  ]
};
