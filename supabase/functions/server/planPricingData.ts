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
  baseMonthlyPrice: number;
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
      "baseMonthlyPrice": 45
    },
    {
      "id": "ho-hvac-tune",
      "name": "Furnace/AC Tune-Up",
      "category": "HVAC",
      "unit": "per visit",
      "baseMonthlyPrice": 95
    },
    {
      "id": "ho-hvac-duct",
      "name": "Duct Cleaning & Sealing",
      "category": "HVAC",
      "unit": "per visit",
      "baseMonthlyPrice": 120
    },
    {
      "id": "ho-plumb-inspect",
      "name": "Plumbing Inspection",
      "category": "Plumbing",
      "unit": "per visit",
      "baseMonthlyPrice": 75
    },
    {
      "id": "ho-plumb-winterize",
      "name": "Pipe Winterization",
      "category": "Plumbing",
      "unit": "per visit",
      "baseMonthlyPrice": 130
    },
    {
      "id": "ho-plumb-water",
      "name": "Water Heater Service",
      "category": "Plumbing",
      "unit": "per visit",
      "baseMonthlyPrice": 85
    },
    {
      "id": "ho-elec-panel",
      "name": "Panel Safety Inspection",
      "category": "Electrical",
      "unit": "per visit",
      "baseMonthlyPrice": 90
    },
    {
      "id": "ho-elec-gfci",
      "name": "GFCI/AFCI Testing",
      "category": "Electrical",
      "unit": "per visit",
      "baseMonthlyPrice": 55
    },
    {
      "id": "ho-elec-gen",
      "name": "Generator Maintenance",
      "category": "Electrical",
      "unit": "per visit",
      "baseMonthlyPrice": 110
    },
    {
      "id": "ho-roof-inspect",
      "name": "Roof & Flashing Inspection",
      "category": "Roofing",
      "unit": "per visit",
      "baseMonthlyPrice": 95
    },
    {
      "id": "ho-gutter-clean",
      "name": "Gutter Cleaning & Inspection",
      "category": "Roofing",
      "unit": "per visit",
      "baseMonthlyPrice": 80
    },
    {
      "id": "ho-roof-snow",
      "name": "Snow & Ice Dam Removal",
      "category": "Roofing",
      "unit": "per visit",
      "baseMonthlyPrice": 200
    },
    {
      "id": "ho-lawn-mow",
      "name": "Lawn Mowing & Edging",
      "category": "Landscaping",
      "unit": "per month",
      "baseMonthlyPrice": 110
    },
    {
      "id": "ho-lawn-fert",
      "name": "Fertilization & Weed Control",
      "category": "Landscaping",
      "unit": "per visit",
      "baseMonthlyPrice": 65
    },
    {
      "id": "ho-snow-plow",
      "name": "Snow Plowing & Salting",
      "category": "Landscaping",
      "unit": "per month",
      "baseMonthlyPrice": 175
    },
    {
      "id": "ho-struct-inspect",
      "name": "Annual Home Inspection",
      "category": "Structural",
      "unit": "per visit",
      "baseMonthlyPrice": 180
    },
    {
      "id": "ho-struct-deck",
      "name": "Deck & Porch Inspection",
      "category": "Structural",
      "unit": "per visit",
      "baseMonthlyPrice": 85
    },
    {
      "id": "ho-safe-smoke",
      "name": "Smoke & CO Detector Service",
      "category": "Safety",
      "unit": "per visit",
      "baseMonthlyPrice": 40
    },
    {
      "id": "ho-safe-radon",
      "name": "Radon Testing",
      "category": "Safety",
      "unit": "per visit",
      "baseMonthlyPrice": 95
    }
  ],
  "condo": [
    {
      "id": "ca-hvac-common",
      "name": "Common Area HVAC Service",
      "category": "HVAC",
      "unit": "per visit",
      "baseMonthlyPrice": 220
    },
    {
      "id": "ca-hvac-units",
      "name": "Unit HVAC Program",
      "category": "HVAC",
      "unit": "per month",
      "baseMonthlyPrice": 380
    },
    {
      "id": "ca-hvac-cooling",
      "name": "Cooling Tower Maintenance",
      "category": "HVAC",
      "unit": "per visit",
      "baseMonthlyPrice": 290
    },
    {
      "id": "ca-turn-paint",
      "name": "Quick Turn Paint Package",
      "category": "Unit Turnover",
      "unit": "per unit turn",
      "baseMonthlyPrice": 650
    },
    {
      "id": "ca-turn-kitchen",
      "name": "Kitchen Refresh Add-On",
      "category": "Unit Turnover",
      "unit": "per unit / quoted add-on",
      "baseMonthlyPrice": 2450
    },
    {
      "id": "ca-turn-bathroom",
      "name": "Bathroom Refresh Add-On",
      "category": "Unit Turnover",
      "unit": "per unit / quoted add-on",
      "baseMonthlyPrice": 1950
    },
    {
      "id": "ca-turn-flooring",
      "name": "Flooring Replacement Add-On",
      "category": "Unit Turnover",
      "unit": "per unit / quoted add-on",
      "baseMonthlyPrice": 1800
    },
    {
      "id": "ca-plumb-main",
      "name": "Main Line Camera Inspection",
      "category": "Plumbing",
      "unit": "per visit",
      "baseMonthlyPrice": 310
    },
    {
      "id": "ca-plumb-backflow",
      "name": "Backflow Preventer Testing",
      "category": "Plumbing",
      "unit": "per visit",
      "baseMonthlyPrice": 145
    },
    {
      "id": "ca-plumb-pump",
      "name": "Sump & Ejector Pump Service",
      "category": "Plumbing",
      "unit": "per visit",
      "baseMonthlyPrice": 120
    },
    {
      "id": "ca-elec-common",
      "name": "Common Area Electrical Inspection",
      "category": "Electrical",
      "unit": "per visit",
      "baseMonthlyPrice": 190
    },
    {
      "id": "ca-elec-emerg",
      "name": "Emergency Lighting Testing",
      "category": "Electrical",
      "unit": "per month",
      "baseMonthlyPrice": 110
    },
    {
      "id": "ca-elec-ev",
      "name": "EV Charging Station Maintenance",
      "category": "Electrical",
      "unit": "per visit",
      "baseMonthlyPrice": 160
    },
    {
      "id": "ca-elev-monthly",
      "name": "Elevator Monthly Maintenance",
      "category": "Elevator",
      "unit": "per month",
      "baseMonthlyPrice": 350
    },
    {
      "id": "ca-elev-annual",
      "name": "Annual Elevator State Inspection",
      "category": "Elevator",
      "unit": "per visit",
      "baseMonthlyPrice": 480
    },
    {
      "id": "ca-roof-flat",
      "name": "Flat Roof Membrane Inspection",
      "category": "Roofing",
      "unit": "per visit",
      "baseMonthlyPrice": 220
    },
    {
      "id": "ca-roof-facade",
      "name": "Façade & Cladding Inspection",
      "category": "Roofing",
      "unit": "per visit",
      "baseMonthlyPrice": 280
    },
    {
      "id": "ca-grounds-full",
      "name": "Full Grounds Maintenance",
      "category": "Grounds",
      "unit": "per month",
      "baseMonthlyPrice": 520
    },
    {
      "id": "ca-grounds-snow",
      "name": "Snow & Ice Management",
      "category": "Grounds",
      "unit": "per month",
      "baseMonthlyPrice": 640
    },
    {
      "id": "ca-fire-system",
      "name": "Fire Suppression Inspection",
      "category": "Fire & Safety",
      "unit": "per visit",
      "baseMonthlyPrice": 320
    },
    {
      "id": "ca-fire-exting",
      "name": "Fire Extinguisher Service",
      "category": "Fire & Safety",
      "unit": "per visit",
      "baseMonthlyPrice": 140
    },
    {
      "id": "ca-struct-garage",
      "name": "Parking Garage Inspection",
      "category": "Structural",
      "unit": "per visit",
      "baseMonthlyPrice": 390
    },
    {
      "id": "ca-struct-reserve",
      "name": "Reserve Study Site Assessment",
      "category": "Structural",
      "unit": "per visit",
      "baseMonthlyPrice": 450
    }
  ],
  "landlord": [
    {
      "id": "ll-turn-clean",
      "name": "Unit Turn Cleaning",
      "category": "Turn Services",
      "unit": "per unit",
      "baseMonthlyPrice": 195
    },
    {
      "id": "ll-turn-paint",
      "name": "Unit Paint Touch-Up",
      "category": "Turn Services",
      "unit": "per unit",
      "baseMonthlyPrice": 240
    },
    {
      "id": "ll-turn-inspect",
      "name": "Move-In/Move-Out Inspection",
      "category": "Turn Services",
      "unit": "per unit",
      "baseMonthlyPrice": 110
    },
    {
      "id": "ll-turn-quick-paint",
      "name": "Quick Turn Paint Package",
      "category": "Unit Turnover",
      "unit": "per unit turn",
      "baseMonthlyPrice": 650
    },
    {
      "id": "ll-turn-kitchen",
      "name": "Kitchen Turnover Refresh",
      "category": "Unit Turnover",
      "unit": "per unit / quoted add-on",
      "baseMonthlyPrice": 2450
    },
    {
      "id": "ll-turn-bathroom",
      "name": "Bathroom Turnover Refresh",
      "category": "Unit Turnover",
      "unit": "per unit / quoted add-on",
      "baseMonthlyPrice": 1950
    },
    {
      "id": "ll-turn-flooring",
      "name": "Flooring Replacement Allowance",
      "category": "Unit Turnover",
      "unit": "per unit / quoted add-on",
      "baseMonthlyPrice": 1800
    },
    {
      "id": "ll-turn-full",
      "name": "Full Make-Ready Turn Package",
      "category": "Unit Turnover",
      "unit": "per unit turn",
      "baseMonthlyPrice": 3200
    },
    {
      "id": "ll-hvac-program",
      "name": "Multi-Unit HVAC Filter Program",
      "category": "HVAC",
      "unit": "per unit/mo",
      "baseMonthlyPrice": 55
    },
    {
      "id": "ll-hvac-boiler",
      "name": "Boiler Annual Service",
      "category": "HVAC",
      "unit": "per visit",
      "baseMonthlyPrice": 165
    },
    {
      "id": "ll-plumb-drain",
      "name": "Drain & Trap Maintenance",
      "category": "Plumbing",
      "unit": "per unit",
      "baseMonthlyPrice": 80
    },
    {
      "id": "ll-plumb-water",
      "name": "Water Heater Fleet Service",
      "category": "Plumbing",
      "unit": "per unit",
      "baseMonthlyPrice": 90
    },
    {
      "id": "ll-elec-gfci",
      "name": "GFCI & Smoke Detector Check",
      "category": "Electrical",
      "unit": "per unit",
      "baseMonthlyPrice": 50
    },
    {
      "id": "ll-elec-panel",
      "name": "Electrical Panel Inspection",
      "category": "Electrical",
      "unit": "per unit",
      "baseMonthlyPrice": 95
    },
    {
      "id": "ll-ext-gutter",
      "name": "Gutter Cleaning",
      "category": "Exterior",
      "unit": "per unit",
      "baseMonthlyPrice": 75
    },
    {
      "id": "ll-ext-snow",
      "name": "Snow Removal Program",
      "category": "Exterior",
      "unit": "per month",
      "baseMonthlyPrice": 145
    },
    {
      "id": "ll-ext-lawn",
      "name": "Lawn Maintenance",
      "category": "Exterior",
      "unit": "per month",
      "baseMonthlyPrice": 120
    },
    {
      "id": "ll-appl-inspect",
      "name": "Appliance Safety Inspection",
      "category": "Appliances",
      "unit": "per unit",
      "baseMonthlyPrice": 60
    },
    {
      "id": "ll-appl-dryer",
      "name": "Dryer Vent Cleaning",
      "category": "Appliances",
      "unit": "per unit",
      "baseMonthlyPrice": 70
    },
    {
      "id": "ll-comp-lead",
      "name": "Lead Paint Visual Assessment",
      "category": "Compliance",
      "unit": "per visit",
      "baseMonthlyPrice": 130
    },
    {
      "id": "ll-comp-habitab",
      "name": "Habitability Inspection",
      "category": "Compliance",
      "unit": "per unit",
      "baseMonthlyPrice": 155
    }
  ],
  "commercial": [
    {
      "id": "cm-hvac-rtu",
      "name": "Rooftop Unit (RTU) Service",
      "category": "HVAC",
      "unit": "per unit",
      "baseMonthlyPrice": 280
    },
    {
      "id": "cm-hvac-vav",
      "name": "VAV Box Calibration",
      "category": "HVAC",
      "unit": "per zone",
      "baseMonthlyPrice": 160
    },
    {
      "id": "cm-hvac-chiller",
      "name": "Chiller & Cooling Tower PM",
      "category": "HVAC",
      "unit": "per visit",
      "baseMonthlyPrice": 650
    },
    {
      "id": "cm-hvac-ahu",
      "name": "Air Handling Unit Service",
      "category": "HVAC",
      "unit": "per unit",
      "baseMonthlyPrice": 310
    },
    {
      "id": "cm-plumb-grease",
      "name": "Grease Trap Service",
      "category": "Plumbing",
      "unit": "per visit",
      "baseMonthlyPrice": 280
    },
    {
      "id": "cm-plumb-backflow",
      "name": "Backflow Prevention Program",
      "category": "Plumbing",
      "unit": "per device",
      "baseMonthlyPrice": 195
    },
    {
      "id": "cm-plumb-hydrant",
      "name": "Fire Hydrant Inspection",
      "category": "Plumbing",
      "unit": "per visit",
      "baseMonthlyPrice": 220
    },
    {
      "id": "cm-elec-thermo",
      "name": "Thermographic Panel Scan",
      "category": "Electrical",
      "unit": "per visit",
      "baseMonthlyPrice": 380
    },
    {
      "id": "cm-elec-ups",
      "name": "UPS & Generator Testing",
      "category": "Electrical",
      "unit": "per visit",
      "baseMonthlyPrice": 290
    },
    {
      "id": "cm-elec-lighting",
      "name": "LED Lighting Audit & Retrofit",
      "category": "Electrical",
      "unit": "per visit",
      "baseMonthlyPrice": 195
    },
    {
      "id": "cm-fire-annual",
      "name": "Annual Fire System Inspection",
      "category": "Fire & Life Safety",
      "unit": "per visit",
      "baseMonthlyPrice": 580
    },
    {
      "id": "cm-fire-kitchen",
      "name": "Kitchen Suppression System",
      "category": "Fire & Life Safety",
      "unit": "per visit",
      "baseMonthlyPrice": 310
    },
    {
      "id": "cm-fire-exit",
      "name": "Emergency Egress Inspection",
      "category": "Fire & Life Safety",
      "unit": "per visit",
      "baseMonthlyPrice": 145
    },
    {
      "id": "cm-roof-flat",
      "name": "Flat Roof PM Program",
      "category": "Roofing",
      "unit": "per visit",
      "baseMonthlyPrice": 310
    },
    {
      "id": "cm-roof-drain",
      "name": "Roof Drain & Overflow Service",
      "category": "Roofing",
      "unit": "per visit",
      "baseMonthlyPrice": 175
    },
    {
      "id": "cm-ext-parking",
      "name": "Parking Lot Sweeping",
      "category": "Exterior",
      "unit": "per visit",
      "baseMonthlyPrice": 220
    },
    {
      "id": "cm-ext-snow",
      "name": "Commercial Snow & Ice Management",
      "category": "Exterior",
      "unit": "per month",
      "baseMonthlyPrice": 890
    },
    {
      "id": "cm-ext-facade",
      "name": "Exterior Pressure Washing",
      "category": "Exterior",
      "unit": "per visit",
      "baseMonthlyPrice": 280
    },
    {
      "id": "cm-struct-inspect",
      "name": "Structural Integrity Inspection",
      "category": "Structural",
      "unit": "per visit",
      "baseMonthlyPrice": 490
    },
    {
      "id": "cm-struct-acs",
      "name": "ADA Compliance Assessment",
      "category": "Structural",
      "unit": "per visit",
      "baseMonthlyPrice": 320
    }
  ],
  "vendor": [
    {
      "id": "vn-storefront-featured",
      "name": "Featured Storefront Placement",
      "category": "Storefront",
      "unit": "per month",
      "baseMonthlyPrice": 149
    },
    {
      "id": "vn-listings-extra",
      "name": "Extra Product Listings (+500)",
      "category": "Catalog",
      "unit": "per month",
      "baseMonthlyPrice": 79
    },
    {
      "id": "vn-multi-location",
      "name": "Additional Store Location",
      "category": "Operations",
      "unit": "per location/mo",
      "baseMonthlyPrice": 89
    },
    {
      "id": "vn-inventory-sync",
      "name": "Real-Time Inventory Sync",
      "category": "Operations",
      "unit": "per month",
      "baseMonthlyPrice": 99
    },
    {
      "id": "vn-api",
      "name": "API & Integrations Access",
      "category": "Operations",
      "unit": "per month",
      "baseMonthlyPrice": 110
    },
    {
      "id": "vn-promo-tools",
      "name": "Marketing & Promotion Suite",
      "category": "Marketing",
      "unit": "per month",
      "baseMonthlyPrice": 120
    },
    {
      "id": "vn-analytics",
      "name": "Advanced Sales Analytics",
      "category": "Analytics",
      "unit": "per month",
      "baseMonthlyPrice": 70
    },
    {
      "id": "vn-priority-support",
      "name": "Priority Vendor Support",
      "category": "Support",
      "unit": "per month",
      "baseMonthlyPrice": 60
    }
  ],
  "subcontractor": [
    {
      "id": "sc-lead-pack",
      "name": "Extra Lead Package (+25/mo)",
      "category": "Leads",
      "unit": "per month",
      "baseMonthlyPrice": 129
    },
    {
      "id": "sc-priority-dispatch",
      "name": "Priority Dispatch",
      "category": "Operations",
      "unit": "per month",
      "baseMonthlyPrice": 89
    },
    {
      "id": "sc-gps",
      "name": "GPS Fleet Tracking",
      "category": "Operations",
      "unit": "per month",
      "baseMonthlyPrice": 59
    },
    {
      "id": "sc-crew-seat",
      "name": "Additional Crew Seat",
      "category": "Team",
      "unit": "per seat/mo",
      "baseMonthlyPrice": 39
    },
    {
      "id": "sc-insurance",
      "name": "Insurance & Compliance Manager",
      "category": "Compliance",
      "unit": "per month",
      "baseMonthlyPrice": 45
    },
    {
      "id": "sc-invoicing",
      "name": "Invoice & Payment Processing",
      "category": "Finance",
      "unit": "per month",
      "baseMonthlyPrice": 49
    },
    {
      "id": "sc-reviews",
      "name": "Review & Reputation Boost",
      "category": "Marketing",
      "unit": "per month",
      "baseMonthlyPrice": 55
    },
    {
      "id": "sc-portfolio",
      "name": "Featured Portfolio Placement",
      "category": "Marketing",
      "unit": "per month",
      "baseMonthlyPrice": 75
    }
  ],
  "advertiser": [
    {
      "id": "ad-impressions",
      "name": "Extra Impression Pack (+50k)",
      "category": "Reach",
      "unit": "per month",
      "baseMonthlyPrice": 199
    },
    {
      "id": "ad-homepage",
      "name": "Premium Homepage Placement",
      "category": "Placement",
      "unit": "per month",
      "baseMonthlyPrice": 349
    },
    {
      "id": "ad-campaign",
      "name": "Additional Active Campaign",
      "category": "Campaigns",
      "unit": "per campaign/mo",
      "baseMonthlyPrice": 129
    },
    {
      "id": "ad-video",
      "name": "Video Ad Production",
      "category": "Creative",
      "unit": "per month",
      "baseMonthlyPrice": 450
    },
    {
      "id": "ad-targeting",
      "name": "Advanced Targeting Suite",
      "category": "Targeting",
      "unit": "per month",
      "baseMonthlyPrice": 149
    },
    {
      "id": "ad-abtest",
      "name": "A/B Testing & Optimization",
      "category": "Optimization",
      "unit": "per month",
      "baseMonthlyPrice": 99
    },
    {
      "id": "ad-strategist",
      "name": "Dedicated Campaign Strategist",
      "category": "Support",
      "unit": "per month",
      "baseMonthlyPrice": 299
    },
    {
      "id": "ad-reporting",
      "name": "White-Label Reporting",
      "category": "Analytics",
      "unit": "per month",
      "baseMonthlyPrice": 89
    }
  ],
  "investor": [
    {
      "id": "in-dealroom",
      "name": "Full Deal Room Access",
      "category": "Access",
      "unit": "per month",
      "baseMonthlyPrice": 99
    },
    {
      "id": "in-early",
      "name": "Early / Priority Deal Access",
      "category": "Access",
      "unit": "per month",
      "baseMonthlyPrice": 149
    },
    {
      "id": "in-coinvest",
      "name": "Co-Investment Access",
      "category": "Access",
      "unit": "per month",
      "baseMonthlyPrice": 175
    },
    {
      "id": "in-reports",
      "name": "Monthly Portfolio Reports",
      "category": "Reporting",
      "unit": "per month",
      "baseMonthlyPrice": 79
    },
    {
      "id": "in-analytics",
      "name": "Custom Portfolio Analytics",
      "category": "Analytics",
      "unit": "per month",
      "baseMonthlyPrice": 129
    },
    {
      "id": "in-tax",
      "name": "Tax Document Center",
      "category": "Compliance",
      "unit": "per month",
      "baseMonthlyPrice": 45
    },
    {
      "id": "in-strategy",
      "name": "Quarterly Strategy Call",
      "category": "Advisory",
      "unit": "per quarter",
      "baseMonthlyPrice": 199
    },
    {
      "id": "in-relations",
      "name": "Dedicated Investor Relations",
      "category": "Advisory",
      "unit": "per month",
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
