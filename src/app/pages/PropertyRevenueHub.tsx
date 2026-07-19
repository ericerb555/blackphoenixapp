/**
 * Property Revenue Intelligence Hub
 * AI-powered revenue opportunity analysis for landlords, condo associations,
 * commercial property managers, and property managers.
 * NH-aware: flags New Hampshire-specific legal notes (RSA 540, RSA 356-B).
 */
import { useState, useEffect, useMemo } from 'react';
import {
  Building2, TrendingUp, DollarSign, Zap, Plus, ChevronRight,
  X, CheckCircle, AlertTriangle, Info, Settings, BarChart3,
  FileText, Star, Clock, Wrench, Home, Layers, Search,
  Filter, Download, Bell, Eye, ThumbsUp, Sliders, PieChart,
  Target, Shield, ChevronDown, ChevronUp, RefreshCw, Bot,
  Lightbulb, Package, Car, Wifi, Droplets, Sun, Users,
  MapPin, Edit2, Save, Trash2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { saveDual, loadDual } from '../lib/database';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, PieChart as RPieChart, Pie, Cell,
} from 'recharts';

// ─── Types ────────────────────────────────────────────────────────────────────

type PropertyType = 'landlord' | 'condo' | 'commercial' | 'manager';
type Difficulty = 'Low' | 'Medium' | 'High';
type Risk = 'Low' | 'Medium' | 'High';
type OppStatus = 'new' | 'under_review' | 'approved' | 'declined' | 'implemented';
type FilterKey = 'all' | 'lowest_cost' | 'highest_revenue' | 'fastest_payback' | 'lowest_risk' | 'easiest';

interface PropertyProfile {
  id: string;
  name: string;
  address: string;
  type: PropertyType;
  units: number;
  commercialUnits: number;
  sqft: number;
  lotSize: string;
  parkingSpaces: number;
  garageSpaces: number;
  hasStorage: boolean;
  storageCount: number;
  hasLaundry: boolean;
  hasRooftop: boolean;
  hasClubhouse: boolean;
  hasFitness: boolean;
  hasOutdoorSpace: boolean;
  hasBasement: boolean;
  hasAttic: boolean;
  zoning: string;
  currentIncome: number;
  operatingExpenses: number;
  reserveFund: number;
  occupancyRate: number;
  hasEVReady: boolean;
  hasSolar: boolean;
  avgUtilityCost: number;
  notes: string;
  createdAt: string;
}

interface Opportunity {
  id: string;
  propertyId: string;
  name: string;
  category: string;
  icon: any;
  iconColor: string;
  why: string;
  assets: string[];
  startupCost: [number, number]; // [min, max]
  monthlyRevenue: [number, number];
  annualRevenue: [number, number];
  annualSavings: [number, number];
  paybackMonths: [number, number];
  difficulty: Difficulty;
  risk: Risk;
  nhNote?: string;
  verify: string[];
  nextSteps: string[];
  confidence: number; // 0–100
  status: OppStatus;
  score: number; // computed ranking score
  requiresBoardApproval?: boolean;
}

interface ScenarioInput {
  opportunityId: string;
  units?: number;
  price?: number;
  occupancy?: number;
}

interface Alert {
  id: string;
  type: 'opportunity' | 'expense' | 'asset' | 'rebate' | 'contract';
  title: string;
  detail: string;
  ts: string;
}

// ─── Seed data ─────────────────────────────────────────────────────────────────

function seedProfile(): PropertyProfile {
  return {
    id: 'prop-001',
    name: 'Maple Street Apartments',
    address: '44 Maple St, Concord, NH 03301',
    type: 'landlord',
    units: 12,
    commercialUnits: 0,
    sqft: 11200,
    lotSize: '0.8 acres',
    parkingSpaces: 18,
    garageSpaces: 0,
    hasStorage: true,
    storageCount: 6,
    hasLaundry: true,
    hasRooftop: false,
    hasClubhouse: false,
    hasFitness: false,
    hasOutdoorSpace: true,
    hasBasement: true,
    hasAttic: false,
    zoning: 'Residential Multi-Family',
    currentIncome: 18000,
    operatingExpenses: 7200,
    reserveFund: 45000,
    occupancyRate: 83,
    hasEVReady: false,
    hasSolar: false,
    avgUtilityCost: 1800,
    notes: '',
    createdAt: new Date().toISOString(),
  };
}

// ─── AI Opportunity Engine ────────────────────────────────────────────────────

function generateOpportunities(p: PropertyProfile): Opportunity[] {
  const opps: Opportunity[] = [];

  const push = (o: Omit<Opportunity, 'id' | 'propertyId' | 'score' | 'status'>) =>
    opps.push({ ...o, id: `opp-${Math.random().toString(36).slice(2,8)}`, propertyId: p.id, status: 'new', score: 0 });

  // Storage rentals
  if (p.hasStorage || p.hasBasement) {
    const count = p.storageCount || 4;
    push({
      name: 'Storage Locker Rentals',
      category: 'Space Monetization',
      icon: Package,
      iconColor: '#fbbf24',
      why: `Your property has ${p.hasStorage ? `${p.storageCount} storage units` : 'basement space'} that could be converted into rentable lockers. In NH, storage demand is high year-round from residents with seasonal equipment and limited unit space.`,
      assets: ['Existing storage/basement space', 'Locks or access system', 'Optional shelving'],
      startupCost: [800, 3500],
      monthlyRevenue: [count * 35, count * 75],
      annualRevenue: [count * 420, count * 900],
      annualSavings: [0, 0],
      paybackMonths: [3, 8],
      difficulty: 'Low',
      risk: 'Low',
      nhNote: 'NH RSA 540 does not restrict storage rental fees. Verify your lease and any existing tenant storage assignments before converting.',
      verify: ['Confirm no existing tenant storage rights in current leases', 'Check zoning allows storage rental', 'Review insurance coverage for stored goods'],
      nextSteps: ['Survey tenants for interest', 'Get lock hardware quotes', 'Draft storage rental addendum'],
      confidence: 90,
      requiresBoardApproval: p.type === 'condo',
    });
  }

  // Parking
  const unusedParking = p.parkingSpaces - p.units;
  if (unusedParking > 0) {
    push({
      name: 'Reserved Parking Space Rentals',
      category: 'Parking Revenue',
      icon: Car,
      iconColor: '#60a5fa',
      why: `You have approximately ${unusedParking} parking spaces beyond what's assigned to units. These can be rented to tenants who want reserved spots or to nearby businesses/residents.`,
      assets: ['${unusedParking} unassigned parking spaces', 'Signage', 'Optional payment system'],
      startupCost: [200, 1200],
      monthlyRevenue: [unusedParking * 40, unusedParking * 120],
      annualRevenue: [unusedParking * 480, unusedParking * 1440],
      annualSavings: [0, 0],
      paybackMonths: [1, 3],
      difficulty: 'Low',
      risk: 'Low',
      nhNote: 'NH does not restrict parking fees for residential properties. Verify your leases do not include free parking as a stated term.',
      verify: ['Review all leases for parking provisions', 'Check whether spaces are in a shared lot or on private land', 'Consider liability for vehicle damage'],
      nextSteps: ['Map available spaces', 'Set monthly rate', 'Post notice to tenants and community'],
      confidence: 92,
    });
  }

  // EV Charging
  if (!p.hasEVReady && p.parkingSpaces > 0) {
    push({
      name: 'EV Charging Station Installation',
      category: 'Energy & Technology',
      icon: Zap,
      iconColor: '#a78bfa',
      why: `EV ownership in NH is growing rapidly. Installing 2–4 Level 2 charging stations can generate $80–$200/month per station in usage fees while attracting higher-income tenants who drive EVs.`,
      assets: ['Parking spaces with electrical access', '200A electrical service recommended'],
      startupCost: [4000, 14000],
      monthlyRevenue: [160, 800],
      annualRevenue: [1920, 9600],
      annualSavings: [0, 0],
      paybackMonths: [18, 48],
      difficulty: 'Medium',
      risk: 'Low',
      nhNote: 'NH Electric Co-op and Eversource offer EV charging rebates for commercial/multifamily installations. NH does not restrict tenant EV charging access under RSA 540. Apply for NH DOT EV Infrastructure grants.',
      verify: ['Electrical panel capacity assessment', 'Parking lot ownership/easement review', 'NH utility rebate eligibility', 'Insurance update for charging equipment'],
      nextSteps: ['Contact Eversource/NH Electric Co-op for rebate pre-approval', 'Get 3 electrical contractor quotes', 'Research ChargePoint, Blink, or Volta network partnerships'],
      confidence: 78,
    });
  }

  // Laundry upgrade
  if (p.hasLaundry) {
    push({
      name: 'Laundry Room Revenue Upgrade',
      category: 'Amenity Revenue',
      icon: Droplets,
      iconColor: '#34d399',
      why: `Your existing laundry room likely uses older coin-op equipment. Upgrading to a card or app-based system (CSC ServiceWorks, WASH, Hercules) increases revenue 20–35% and eliminates coin collection.`,
      assets: ['Existing laundry room', 'Adequate electrical and water connections'],
      startupCost: [0, 4000],
      monthlyRevenue: [p.units * 18, p.units * 42],
      annualRevenue: [p.units * 216, p.units * 504],
      annualSavings: [200, 600],
      paybackMonths: [0, 12],
      difficulty: 'Low',
      risk: 'Low',
      nhNote: 'Many NH property owners use revenue-share agreements (e.g., CSC ServiceWorks provides equipment free in exchange for 50–60% of revenue). NH RSA 540 does not regulate laundry fees.',
      verify: ['Review current laundry lease or equipment ownership', 'Check electrical capacity for modern machines', 'Compare revenue-share vs. ownership models'],
      nextSteps: ['Request quotes from CSC ServiceWorks, WASH Multifamily, Hercules', 'Compare revenue-share vs. outright machine purchase', 'Survey tenants on preferred payment method'],
      confidence: 88,
    });
  }

  // Solar
  if (!p.hasSolar && (p.hasRooftop || p.sqft > 5000)) {
    push({
      name: 'Solar Energy Program',
      category: 'Energy & Technology',
      icon: Sun,
      iconColor: '#f59e0b',
      why: `A ${Math.round(p.sqft * 0.15 / 100) * 100} sq ft rooftop or parking canopy solar installation could generate $${Math.round(p.units * 40)}-$${Math.round(p.units * 90)}/month in energy savings or sold credits.`,
      assets: ['Roof space or parking canopy', 'Adequate sun exposure', 'Sufficient electrical infrastructure'],
      startupCost: [20000, 80000],
      monthlyRevenue: [p.units * 25, p.units * 75],
      annualRevenue: [p.units * 300, p.units * 900],
      annualSavings: [1200, 4800],
      paybackMonths: [48, 96],
      difficulty: 'High',
      risk: 'Medium',
      nhNote: 'NH has net metering under RSA 362-A:9 — excess solar can be credited back to utility bill. The NH Community Development Finance Authority (CDFA) offers solar tax credits. Federal ITC (30%) significantly reduces cost.',
      verify: ['Structural roof assessment', 'Utility interconnection agreement', 'NH net metering eligibility', 'HOA/zoning approval if applicable', 'Federal ITC and NH CDFA credit eligibility'],
      nextSteps: ['Get 3 solar installation quotes', 'Contact Eversource/NH Electric Co-op for net metering application', 'Consult tax advisor on federal ITC', 'Review NH CDFA grant program'],
      confidence: 65,
    });
  }

  // Internet/WiFi
  push({
    name: 'Community Wi-Fi / Internet Package',
    category: 'Tenant Services',
    icon: Wifi,
    iconColor: '#818cf8',
    why: `Bulk internet agreements with Comcast, Consolidated Communications, or Metrocast for NH properties can provide all-property Wi-Fi for $15–25/unit/month (vs $60–80 individual rates), then offered as a $35–50/month amenity to tenants.`,
    assets: ['Property-wide network infrastructure', 'Router/switch hardware'],
    startupCost: [500, 8000],
    monthlyRevenue: [p.units * 12, p.units * 30],
    annualRevenue: [p.units * 144, p.units * 360],
    annualSavings: [0, 0],
    paybackMonths: [2, 10],
    difficulty: 'Low',
    risk: 'Low',
    nhNote: 'Consolidated Communications and Comcast both offer NH multifamily bulk agreements. No NH regulations restrict landlord-provided internet as an amenity.',
    verify: ['Contact Comcast Business / Consolidated for bulk rates', 'Assess in-unit wiring infrastructure', 'Determine if internet will be included in rent or billed separately'],
    nextSteps: ['Request bulk rate quotes from local ISPs', 'Survey tenants on current internet spend', 'Calculate net margin vs current individual subscriptions'],
    confidence: 82,
  });

  // Pet fees (landlord/manager)
  if (p.type === 'landlord' || p.type === 'manager') {
    push({
      name: 'Pet Fee Program',
      category: 'Fee Revenue',
      icon: Home,
      iconColor: '#f87171',
      why: `Implementing a structured pet program (non-refundable pet fee + monthly pet rent) can add $${Math.round(p.units * 0.4 * 35)}-$${Math.round(p.units * 0.6 * 75)}/month in additional income while formalizing your pet policy.`,
      assets: ['Existing pet policy or lease addendum'],
      startupCost: [0, 200],
      monthlyRevenue: [Math.round(p.units * 0.3 * 30), Math.round(p.units * 0.6 * 75)],
      annualRevenue: [Math.round(p.units * 0.3 * 360), Math.round(p.units * 0.6 * 900)],
      annualSavings: [0, 0],
      paybackMonths: [0, 1],
      difficulty: 'Low',
      risk: 'Low',
      nhNote: 'NH RSA 540 does not cap pet fees or pet rent — you may charge whatever the market supports. However, you cannot charge pet fees for documented service animals or emotional support animals under fair housing law (federal). Consult an attorney before updating leases mid-tenancy.',
      verify: ['Review existing leases for pet provisions', 'Confirm which units currently have pets', 'Ensure fair housing exemptions for service/ESA animals are honored', 'Consult NH attorney before changing existing lease terms'],
      nextSteps: ['Draft pet addendum with attorney review', 'Survey which tenants have pets', 'Set non-refundable pet fee and monthly pet rent tiers by animal type'],
      confidence: 85,
    });
  }

  // Outdoor space monetization
  if (p.hasOutdoorSpace) {
    push({
      name: 'Community Garden Plot Rentals',
      category: 'Outdoor Revenue',
      icon: Sun,
      iconColor: '#4ade80',
      why: `NH residents have strong interest in gardening. Dividing your outdoor space into 4x8 or 4x12 garden plots rented at $50–120/season can generate passive seasonal income with zero ongoing management.`,
      assets: ['Unused outdoor/lawn area', 'Water access', 'Basic fencing or plot markers'],
      startupCost: [200, 1500],
      monthlyRevenue: [0, 0],
      annualRevenue: [400, 1800],
      annualSavings: [200, 600],
      paybackMonths: [1, 4],
      difficulty: 'Low',
      risk: 'Low',
      nhNote: 'NH growing season is May–October. No zoning or legal restrictions on community gardens in residential multifamily. Check your property insurance for minor liability.',
      verify: ['Confirm no easements on outdoor area', 'Check water source availability', 'Review if lawn maintenance costs can be reduced'],
      nextSteps: ['Map available outdoor space', 'Post interest survey to tenants', 'Purchase plot markers and signage'],
      confidence: 72,
    });
  }

  // Vending
  push({
    name: 'Vending Machine Placement',
    category: 'Passive Income',
    icon: Package,
    iconColor: '#fb923c',
    why: `A vending machine operator can place machines in your common area or laundry room at zero cost to you, paying a monthly commission of $50–150/month per machine. No management required.`,
    assets: ['Common area or laundry room with electrical outlet'],
    startupCost: [0, 0],
    monthlyRevenue: [50, 200],
    annualRevenue: [600, 2400],
    annualSavings: [0, 0],
    paybackMonths: [0, 0],
    difficulty: 'Low',
    risk: 'Low',
    nhNote: 'Commission-based vending placements are standard in NH. Contact Granite State Vending, Canteen New England, or local operators for placement agreements.',
    verify: ['Review zoning for commercial activity in residential common areas', 'Check if existing common area rules restrict vending', 'Review insurance for third-party equipment on premises'],
    nextSteps: ['Contact local vending operators for quotes', 'Select high-traffic placement location', 'Negotiate commission percentage (typically 15–25% of gross sales)'],
    confidence: 80,
  });

  // Package lockers
  push({
    name: 'Smart Package Locker System',
    category: 'Tenant Services',
    icon: Package,
    iconColor: '#c084fc',
    why: `Package theft and missed deliveries are the top complaint for multifamily tenants. Smart locker systems (Amazon Hub, Parcel Pending, Luxer One) either pay you a monthly per-unit fee or improve retention and justify premium rents.`,
    assets: ['Lobby or secure common area', 'Electrical outlet', 'Internet connection'],
    startupCost: [3000, 12000],
    monthlyRevenue: [p.units * 5, p.units * 18],
    annualRevenue: [p.units * 60, p.units * 216],
    annualSavings: [0, 0],
    paybackMonths: [18, 36],
    difficulty: 'Medium',
    risk: 'Low',
    nhNote: 'Amazon Hub Locker and Parcel Pending both operate in NH. Some providers offer the hardware free in exchange for Amazon exclusive delivery rights — evaluate trade-offs.',
    verify: ['Measure lobby or entry area for locker footprint', 'Confirm internet connection availability', 'Check if building permits required for permanent fixture installation'],
    nextSteps: ['Request proposals from Luxer One, Parcel Pending, and Amazon Hub', 'Survey tenants on package delivery pain points', 'Compare free-install vs owned hardware economics'],
    confidence: 74,
  });

  // Condo-specific
  if (p.type === 'condo') {
    push({
      name: 'Clubhouse / Meeting Room Rentals',
      category: 'Amenity Revenue',
      icon: Users,
      iconColor: '#60a5fa',
      why: `If your association has a clubhouse or common meeting room, renting it for private events (birthday parties, baby showers, small business meetings) at $50–200/event can generate meaningful non-assessment income.`,
      assets: ['Clubhouse or multi-purpose room', 'Booking system', 'Usage rules'],
      startupCost: [0, 800],
      monthlyRevenue: [100, 600],
      annualRevenue: [1200, 7200],
      annualSavings: [0, 0],
      paybackMonths: [0, 2],
      difficulty: 'Low',
      risk: 'Low',
      nhNote: 'NH RSA 356-B (Condominium Act) requires board approval for new income-generating programs using common areas. Most bylaws require a majority vote. Verify your Declaration does not restrict commercial activity.',
      verify: ['Review Declaration for restrictions on common area commercial use', 'Confirm board authority to establish rental program', 'Update property liability insurance for event rentals'],
      nextSteps: ['Review Declaration and Rules & Regulations for restrictions', 'Present to board at next meeting', 'Draft rental agreement and usage policy'],
      confidence: 82,
      requiresBoardApproval: true,
    });

    push({
      name: 'Vendor Sponsorship Program',
      category: 'Partnership Revenue',
      icon: Star,
      iconColor: '#fbbf24',
      why: `Local NH businesses (insurance agents, HVAC companies, real estate attorneys, landscapers) will pay $50–300/month to be listed as "preferred vendors" in your newsletter, community app, or website in exchange for resident discounts.`,
      assets: ['Community newsletter or resident portal', 'Vendor vetting process'],
      startupCost: [0, 500],
      monthlyRevenue: [150, 900],
      annualRevenue: [1800, 10800],
      annualSavings: [0, 0],
      paybackMonths: [0, 1],
      difficulty: 'Low',
      risk: 'Low',
      nhNote: 'NH RSA 356-B does not restrict associations from sponsorship income. Disclose vendor relationships to residents as part of good governance. The board should approve the program.',
      verify: ['Confirm board approval to solicit vendors', 'Establish vetting criteria for endorsed vendors', 'Consult association attorney on disclosure requirements'],
      nextSteps: ['Create vendor sponsorship tier sheet ($50 basic, $150 featured, $300 exclusive)', 'Contact 5 local businesses aligned with resident needs', 'Add "Preferred Partners" section to newsletter'],
      confidence: 76,
      requiresBoardApproval: true,
    });
  }

  // Commercial
  if (p.type === 'commercial') {
    push({
      name: 'Coworking / Flex Space Sub-Leasing',
      category: 'Space Monetization',
      icon: Building2,
      iconColor: '#818cf8',
      why: `Unused offices or oversized suites can be converted to day-pass or monthly coworking memberships at $200–500/desk/month — significantly above traditional per-sq-ft lease rates.`,
      assets: ['Vacant or underused office space', 'WiFi and power access', 'Conference room access'],
      startupCost: [2000, 15000],
      monthlyRevenue: [800, 5000],
      annualRevenue: [9600, 60000],
      annualSavings: [0, 0],
      paybackMonths: [3, 18],
      difficulty: 'Medium',
      risk: 'Medium',
      nhNote: 'Verify your NH commercial lease and zoning allow subletting or shared use. Some lenders and master leases prohibit subleasing without consent. Concord, Manchester, and Portsmouth NH all have active coworking demand.',
      verify: ['Review master lease for subletting restrictions', 'Check zoning for coworking/shared office use', 'Assess fire occupancy rating for increased headcount'],
      nextSteps: ['Identify underused sq footage', 'Research local coworking rates (ImpactHub NH, WeWork alternatives)', 'List on Deskpass, Coworker.com, or LiquidSpace'],
      confidence: 68,
    });
  }

  // Maintenance subscriptions (all types)
  push({
    name: 'Resident Maintenance Membership',
    category: 'Service Revenue',
    icon: Wrench,
    iconColor: '#f87171',
    why: `Offer tenants a $15–35/month maintenance membership that covers small repairs (light bulbs, filter changes, minor plumbing) at no extra charge. Reduces one-off call costs and improves retention.`,
    assets: ['Black Phoenix maintenance crew', 'Scheduling system'],
    startupCost: [0, 500],
    monthlyRevenue: [p.units * 8, p.units * 25],
    annualRevenue: [p.units * 96, p.units * 300],
    annualSavings: [p.units * 30, p.units * 120],
    paybackMonths: [0, 2],
    difficulty: 'Low',
    risk: 'Low',
    nhNote: 'Maintenance subscription services are unregulated in NH. This aligns naturally with Black Phoenix\'s existing service capabilities.',
    verify: ['Define clearly what is and is not covered', 'Set response time SLAs', 'Ensure adequate crew capacity before launching'],
    nextSteps: ['Define membership tiers (basic / plus)', 'Launch to 2–3 pilot properties first', 'Use Black Phoenix Work Request Widget for member submissions'],
    confidence: 91,
  });

  // Score and rank
  const scored = opps.map(o => {
    const revMid = (o.annualRevenue[0] + o.annualRevenue[1]) / 2;
    const savMid = (o.annualSavings[0] + o.annualSavings[1]) / 2;
    const costMid = (o.startupCost[0] + o.startupCost[1]) / 2;
    const payMid = (o.paybackMonths[0] + o.paybackMonths[1]) / 2;
    const diffScore = o.difficulty === 'Low' ? 3 : o.difficulty === 'Medium' ? 2 : 1;
    const riskScore = o.risk === 'Low' ? 3 : o.risk === 'Medium' ? 2 : 1;
    const score =
      ((revMid + savMid) / 1000) * 30 +
      (100 - Math.min(payMid * 2, 100)) * 0.3 +
      diffScore * 10 +
      riskScore * 10 +
      (o.confidence / 100) * 20 -
      (costMid / 5000) * 5;
    return { ...o, score: Math.round(score) };
  });

  return scored.sort((a, b) => b.score - a.score);
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const TYPE_LABELS: Record<PropertyType, string> = {
  landlord: 'Landlord / Multifamily',
  condo: 'Condo Association',
  commercial: 'Commercial Property',
  manager: 'Property Manager',
};

const STATUS_CFG: Record<OppStatus, { label: string; color: string; bg: string }> = {
  new:          { label: 'New',           color: '#60a5fa', bg: 'rgba(96,165,250,0.1)'   },
  under_review: { label: 'Under Review',  color: '#fbbf24', bg: 'rgba(251,191,36,0.1)'   },
  approved:     { label: 'Approved',      color: '#4ade80', bg: 'rgba(74,222,128,0.1)'   },
  declined:     { label: 'Declined',      color: '#f87171', bg: 'rgba(248,113,113,0.1)'  },
  implemented:  { label: 'Implemented',   color: '#a78bfa', bg: 'rgba(167,139,250,0.1)'  },
};

function fmt(n: number) {
  return n >= 1000 ? `$${(n / 1000).toFixed(0)}k` : `$${n.toFixed(0)}`;
}

function fmtRange(r: [number, number]) {
  return `${fmt(r[0])} – ${fmt(r[1])}`;
}

const DIFFICULTY_COLOR: Record<Difficulty, string> = { Low: '#4ade80', Medium: '#fbbf24', High: '#f87171' };
const RISK_COLOR: Record<Risk, string> = { Low: '#4ade80', Medium: '#fbbf24', High: '#f87171' };

const PIE_COLORS = ['#f59e0b', '#6366f1', '#10b981', '#f43f5e', '#3b82f6', '#a78bfa'];

// ─── Main Component ───────────────────────────────────────────────────────────

export default function PropertyRevenueHub() {
  const [properties, setProperties] = useState<PropertyProfile[]>([]);
  const [selectedPropId, setSelectedPropId] = useState<string | null>(null);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [tab, setTab] = useState<'dashboard' | 'profile' | 'opportunities' | 'scenario' | 'proposals'>('dashboard');
  const [filterKey, setFilterKey] = useState<FilterKey>('all');
  const [searchOpps, setSearchOpps] = useState('');
  const [selectedOpp, setSelectedOpp] = useState<Opportunity | null>(null);
  const [showAddProp, setShowAddProp] = useState(false);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Profile form
  const [editProp, setEditProp] = useState<Partial<PropertyProfile>>({});
  const [editMode, setEditMode] = useState(false);

  // Scenario
  const [scenOpp, setScenOpp] = useState<Opportunity | null>(null);
  const [scenUnits, setScenUnits] = useState(5);
  const [scenPrice, setScenPrice] = useState(60);
  const [scenOcc, setScenOcc] = useState(80);

  const selectedProp = properties.find(p => p.id === selectedPropId) || null;

  useEffect(() => {
    (async () => {
      const saved = await loadDual('bp_properties');
      const propsArr: PropertyProfile[] = Array.isArray(saved) && saved.length ? saved : [seedProfile()];
      if (!Array.isArray(saved) || !saved.length) saveDual('bp_properties', propsArr);
      setProperties(propsArr);
      setSelectedPropId(propsArr[0]?.id || null);
    })();
  }, []);

  useEffect(() => {
    if (selectedProp) {
      const opps = generateOpportunities(selectedProp);
      setOpportunities(opps);
      setAlerts(generateAlerts(selectedProp, opps));
    }
  }, [selectedPropId, JSON.stringify(properties)]);

  function generateAlerts(p: PropertyProfile, opps: Opportunity[]): Alert[] {
    const a: Alert[] = [];
    if (!p.hasEVReady) a.push({ id: 'a1', type: 'rebate', title: 'NH EV Charger Rebate Available', detail: 'Eversource NH is offering rebates up to $2,500 per Level 2 charger for multifamily properties. Apply before Q4.', ts: new Date().toISOString() });
    if (p.occupancyRate < 90) a.push({ id: 'a2', type: 'asset', title: 'Below-Target Occupancy Detected', detail: `At ${p.occupancyRate}% occupancy, you have ${p.units - Math.round(p.units * p.occupancyRate / 100)} vacant units. Adding amenities from top revenue opportunities may improve tenant attraction.`, ts: new Date().toISOString() });
    if (p.hasStorage && p.storageCount > 0) a.push({ id: 'a3', type: 'opportunity', title: 'Storage Revenue Untapped', detail: `AI detected ${p.storageCount} storage units with no active rental program. Estimated upside: ${fmtRange([p.storageCount * 420, p.storageCount * 900])}/year.`, ts: new Date().toISOString() });
    if (!p.hasSolar) a.push({ id: 'a4', type: 'rebate', title: 'Federal Solar ITC (30%) + NH CDFA Credits', detail: 'The Inflation Reduction Act 30% Investment Tax Credit applies through 2032. NH CDFA offers additional solar incentives. Now is the optimal time to evaluate.', ts: new Date().toISOString() });
    return a;
  }

  function saveProperties(p: PropertyProfile[]) {
    setProperties(p);
    saveDual('bp_properties', p);
  }

  function runAnalysis() {
    if (!selectedProp) return;
    setIsAnalyzing(true);
    setTimeout(() => {
      const opps = generateOpportunities(selectedProp);
      setOpportunities(opps);
      setIsAnalyzing(false);
      setTab('opportunities');
      toast.success(`AI found ${opps.length} revenue opportunities for ${selectedProp.name}`);
    }, 2000);
  }

  function updateOppStatus(id: string, status: OppStatus) {
    setOpportunities(p => p.map(o => o.id === id ? { ...o, status } : o));
    toast.success(`Status updated to ${STATUS_CFG[status].label}`);
    if (selectedOpp?.id === id) setSelectedOpp(s => s ? { ...s, status } : s);
  }

  function saveProfile() {
    if (!selectedProp) return;
    const updated = { ...selectedProp, ...editProp };
    saveProperties(properties.map(p => p.id === updated.id ? updated : p));
    setEditMode(false);
    toast.success('Property profile saved');
  }

  function addProperty() {
    const np: PropertyProfile = {
      id: `prop-${Date.now()}`,
      name: editProp.name || 'New Property',
      address: editProp.address || '',
      type: editProp.type || 'landlord',
      units: editProp.units || 1,
      commercialUnits: editProp.commercialUnits || 0,
      sqft: editProp.sqft || 0,
      lotSize: editProp.lotSize || '',
      parkingSpaces: editProp.parkingSpaces || 0,
      garageSpaces: editProp.garageSpaces || 0,
      hasStorage: editProp.hasStorage || false,
      storageCount: editProp.storageCount || 0,
      hasLaundry: editProp.hasLaundry || false,
      hasRooftop: editProp.hasRooftop || false,
      hasClubhouse: editProp.hasClubhouse || false,
      hasFitness: editProp.hasFitness || false,
      hasOutdoorSpace: editProp.hasOutdoorSpace || false,
      hasBasement: editProp.hasBasement || false,
      hasAttic: editProp.hasAttic || false,
      zoning: editProp.zoning || '',
      currentIncome: editProp.currentIncome || 0,
      operatingExpenses: editProp.operatingExpenses || 0,
      reserveFund: editProp.reserveFund || 0,
      occupancyRate: editProp.occupancyRate || 100,
      hasEVReady: editProp.hasEVReady || false,
      hasSolar: editProp.hasSolar || false,
      avgUtilityCost: editProp.avgUtilityCost || 0,
      notes: editProp.notes || '',
      createdAt: new Date().toISOString(),
    };
    saveProperties([...properties, np]);
    setSelectedPropId(np.id);
    setShowAddProp(false);
    setEditProp({});
    toast.success(`${np.name} added — running AI analysis…`);
    setTimeout(() => runAnalysis(), 300);
  }

  // Filtered opportunities
  const filteredOpps = useMemo(() => {
    let list = [...opportunities];
    if (searchOpps) list = list.filter(o => o.name.toLowerCase().includes(searchOpps.toLowerCase()) || o.category.toLowerCase().includes(searchOpps.toLowerCase()));
    if (filterKey === 'lowest_cost') list.sort((a, b) => a.startupCost[0] - b.startupCost[0]);
    else if (filterKey === 'highest_revenue') list.sort((a, b) => b.annualRevenue[1] - a.annualRevenue[1]);
    else if (filterKey === 'fastest_payback') list.sort((a, b) => a.paybackMonths[0] - b.paybackMonths[0]);
    else if (filterKey === 'lowest_risk') list = list.filter(o => o.risk === 'Low').concat(list.filter(o => o.risk !== 'Low'));
    else if (filterKey === 'easiest') list = list.filter(o => o.difficulty === 'Low').concat(list.filter(o => o.difficulty !== 'Low'));
    return list;
  }, [opportunities, filterKey, searchOpps]);

  const totalPotentialAnnual = opportunities.reduce((a, o) => a + (o.annualRevenue[0] + o.annualRevenue[1]) / 2 + (o.annualSavings[0] + o.annualSavings[1]) / 2, 0);
  const topOpps = opportunities.slice(0, 5);
  const currentNOI = selectedProp ? selectedProp.currentIncome * 12 - selectedProp.operatingExpenses * 12 : 0;

  const revenueChartData = topOpps.map(o => ({
    name: o.name.split(' ').slice(0, 2).join(' '),
    low: o.annualRevenue[0],
    high: o.annualRevenue[1],
  }));

  const categoryData = useMemo(() => {
    const cats: Record<string, number> = {};
    opportunities.forEach(o => { cats[o.category] = (cats[o.category] || 0) + (o.annualRevenue[0] + o.annualRevenue[1]) / 2; });
    return Object.entries(cats).map(([name, value]) => ({ name, value: Math.round(value) }));
  }, [opportunities]);

  // Scenario calculation
  const scenConservative = scenOpp ? Math.round(scenUnits * scenPrice * (scenOcc / 100) * 0.7) : 0;
  const scenModerate    = scenOpp ? Math.round(scenUnits * scenPrice * (scenOcc / 100))      : 0;
  const scenOptimistic  = scenOpp ? Math.round(scenUnits * scenPrice * (scenOcc / 100) * 1.3): 0;
  const scenPayback     = scenOpp ? Math.round((scenOpp.startupCost[0] + scenOpp.startupCost[1]) / 2 / Math.max(scenModerate, 1)) : 0;

  const INPUT_CLASS = "w-full px-4 py-2.5 rounded-xl text-sm text-white placeholder-gray-600 focus:outline-none";
  const INPUT_STYLE = { background: '#0d0d0d', border: '1px solid rgba(255,255,255,0.08)' };
  const TOGGLE = (val: boolean, onToggle: () => void) => (
    <button onClick={onToggle} className="flex-shrink-0">
      {val
        ? <div className="w-11 h-6 rounded-full relative" style={{ background: '#f59e0b' }}><div className="absolute right-1 top-1 w-4 h-4 rounded-full bg-white" /></div>
        : <div className="w-11 h-6 rounded-full relative" style={{ background: '#333' }}><div className="absolute left-1 top-1 w-4 h-4 rounded-full bg-gray-500" /></div>}
    </button>
  );

  return (
    <div className="min-h-screen p-4 sm:p-6 space-y-5" style={{ background: '#0a0a0a', color: 'white', fontFamily: 'Inter, sans-serif' }}>
      <div className="max-w-6xl mx-auto space-y-5">

        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)' }}>
              <TrendingUp className="w-6 h-6 text-yellow-400" />
            </div>
            <div>
              <h1 className="text-3xl font-black">Property Revenue Intelligence</h1>
              <p className="text-gray-500 text-sm">AI-powered income & savings analysis · NH-aware</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => { setEditProp({}); setShowAddProp(true); }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-black text-white hover:brightness-110 transition"
              style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>
              <Plus className="w-4 h-4" /> Add Property
            </button>
          </div>
        </div>

        {/* Property selector */}
        {properties.length > 1 && (
          <div className="flex gap-2 flex-wrap">
            {properties.map(p => (
              <button key={p.id} onClick={() => setSelectedPropId(p.id)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-black transition"
                style={selectedPropId === p.id ? { background: '#f59e0b', color: 'white' } : { background: '#111', color: '#6b7280', border: '1px solid rgba(255,255,255,0.07)' }}>
                <Building2 className="w-3.5 h-3.5" /> {p.name}
              </button>
            ))}
          </div>
        )}

        {/* Alerts banner */}
        {alerts.length > 0 && (
          <div className="rounded-2xl p-4 flex items-start gap-3 overflow-x-auto" style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)' }}>
            <Bell className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              {alerts.map(a => (
                <div key={a.id} className="text-xs text-gray-300"><span className="font-black text-yellow-400">{a.title}: </span>{a.detail}</div>
              ))}
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 p-1 rounded-xl overflow-x-auto" style={{ background: '#111', border: '1px solid rgba(255,255,255,0.07)' }}>
          {([['dashboard','Dashboard'], ['profile','Property Profile'], ['opportunities','Opportunities'], ['scenario','Scenario Modeler'], ['proposals','Proposals']] as const).map(([v, label]) => (
            <button key={v} onClick={() => setTab(v)}
              className="flex-1 py-2.5 rounded-lg text-sm font-black whitespace-nowrap transition min-w-[110px]"
              style={tab === v ? { background: '#f59e0b', color: 'white' } : { color: '#6b7280' }}>
              {label}
            </button>
          ))}
        </div>

        {/* ── DASHBOARD ────────────────────────────────────────────────────── */}
        {tab === 'dashboard' && selectedProp && (
          <div className="space-y-5">
            {/* KPIs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Current Monthly Income', value: `$${selectedProp.currentIncome.toLocaleString()}`, sub: `$${(selectedProp.currentIncome * 12).toLocaleString()}/yr`, color: '#60a5fa' },
                { label: 'Revenue Potential (AI)', value: fmt(totalPotentialAnnual / 12) + '/mo', sub: `${fmt(totalPotentialAnnual)}/yr upside`, color: '#4ade80' },
                { label: 'Opportunities Found', value: opportunities.length, sub: `${opportunities.filter(o => o.difficulty === 'Low').length} easy wins`, color: '#fbbf24' },
                { label: 'Annual NOI', value: fmt(currentNOI), sub: `${selectedProp.occupancyRate}% occupied`, color: '#a78bfa' },
              ].map(k => (
                <div key={k.label} className="rounded-2xl p-4" style={{ background: '#111', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <p className="text-2xl font-black" style={{ color: k.color }}>{k.value}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{k.label}</p>
                  <p className="text-[10px] text-gray-700 mt-0.5">{k.sub}</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {/* Revenue chart */}
              <div className="rounded-2xl p-5" style={{ background: '#111', border: '1px solid rgba(255,255,255,0.07)' }}>
                <p className="font-black text-white mb-3 text-sm">Top 5 Opportunities — Annual Revenue Range</p>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={revenueChartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                    <XAxis dataKey="name" tick={{ fill: '#6b7280', fontSize: 9 }} />
                    <YAxis tick={{ fill: '#6b7280', fontSize: 9 }} tickFormatter={v => `$${v >= 1000 ? (v/1000).toFixed(0)+'k' : v}`} />
                    <Tooltip formatter={(v: number) => [`$${v.toLocaleString()}`, '']} contentStyle={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'white', fontSize: '11px' }} />
                    <Bar dataKey="low" fill="rgba(245,158,11,0.4)" radius={[3,3,0,0]} name="Conservative" />
                    <Bar dataKey="high" fill="#f59e0b" radius={[3,3,0,0]} name="Optimistic" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Category pie */}
              <div className="rounded-2xl p-5" style={{ background: '#111', border: '1px solid rgba(255,255,255,0.07)' }}>
                <p className="font-black text-white mb-3 text-sm">Revenue by Category</p>
                <ResponsiveContainer width="100%" height={160}>
                  <RPieChart>
                    <Pie data={categoryData} cx="50%" cy="50%" innerRadius={40} outerRadius={70} dataKey="value" paddingAngle={3}>
                      {categoryData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v: number) => [`$${v.toLocaleString()}/yr avg`, '']} contentStyle={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'white', fontSize: '11px' }} />
                  </RPieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap gap-2 mt-2">
                  {categoryData.slice(0, 5).map((c, i) => (
                    <div key={c.name} className="flex items-center gap-1.5 text-[9px] text-gray-400">
                      <div className="w-2 h-2 rounded-full" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                      {c.name}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Top 3 quick wins */}
            <div>
              <p className="font-black text-white mb-3">Top 3 Quick Wins — Low Cost, Fast Payback</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {opportunities.filter(o => o.difficulty === 'Low' && o.startupCost[0] < 2000).slice(0, 3).map(o => (
                  <button key={o.id} onClick={() => { setSelectedOpp(o); setTab('opportunities'); }}
                    className="text-left rounded-2xl p-4 hover:brightness-110 transition"
                    style={{ background: '#111', border: '1px solid rgba(255,255,255,0.07)' }}>
                    <o.icon className="w-6 h-6 mb-2" style={{ color: o.iconColor }} />
                    <p className="font-black text-sm text-white">{o.name}</p>
                    <p className="text-xs text-green-400 mt-1">{fmtRange(o.annualRevenue)}/yr</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(74,222,128,0.1)', color: '#4ade80' }}>Easy</span>
                      <span className="text-[9px] text-gray-500">{o.paybackMonths[0] === 0 ? 'No startup cost' : `${o.paybackMonths[0]}–${o.paybackMonths[1]}mo payback`}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Run analysis button */}
            <button onClick={runAnalysis} disabled={isAnalyzing}
              className="w-full py-4 rounded-2xl font-black text-sm text-white hover:brightness-110 transition flex items-center justify-center gap-3"
              style={{ background: isAnalyzing ? '#1a1a1a' : 'linear-gradient(135deg, #f59e0b, #d97706)', border: isAnalyzing ? '1px solid rgba(255,255,255,0.07)' : 'none' }}>
              {isAnalyzing ? <><RefreshCw className="w-5 h-5 animate-spin text-yellow-400" /><span className="text-yellow-400">AI analyzing property data…</span></> : <><Bot className="w-5 h-5" /> Re-Run AI Analysis</>}
            </button>
          </div>
        )}

        {/* ── PROFILE ──────────────────────────────────────────────────────── */}
        {tab === 'profile' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-black text-white">Property Information</h2>
                {!editMode
                  ? <button onClick={() => { setEditProp(selectedProp || {}); setEditMode(true); }} className="flex items-center gap-1.5 text-xs font-black text-yellow-400"><Edit2 className="w-3.5 h-3.5" /> Edit</button>
                  : <div className="flex gap-2"><button onClick={saveProfile} className="flex items-center gap-1.5 text-xs font-black text-green-400"><Save className="w-3.5 h-3.5" /> Save</button><button onClick={() => setEditMode(false)} className="text-xs text-gray-500">Cancel</button></div>}
              </div>

              {[
                { label: 'Property Name', key: 'name', type: 'text' },
                { label: 'Address', key: 'address', type: 'text' },
                { label: 'Square Footage', key: 'sqft', type: 'number' },
                { label: 'Lot Size', key: 'lotSize', type: 'text' },
                { label: 'Zoning', key: 'zoning', type: 'text' },
                { label: 'Residential Units', key: 'units', type: 'number' },
                { label: 'Commercial Units', key: 'commercialUnits', type: 'number' },
                { label: 'Parking Spaces', key: 'parkingSpaces', type: 'number' },
                { label: 'Garage Spaces', key: 'garageSpaces', type: 'number' },
                { label: 'Storage Units', key: 'storageCount', type: 'number' },
              ].map(f => {
                const val = (editMode ? editProp : selectedProp || {})[f.key as keyof PropertyProfile];
                return (
                  <div key={f.key} className="flex items-center justify-between py-2 border-b" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                    <span className="text-xs text-gray-500 flex-shrink-0 w-36">{f.label}</span>
                    {editMode
                      ? <input type={f.type} value={String(val ?? '')} onChange={e => setEditProp(p => ({ ...p, [f.key]: f.type === 'number' ? Number(e.target.value) : e.target.value }))} className="flex-1 px-3 py-1 rounded-lg text-sm text-white focus:outline-none text-right" style={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)' }} />
                      : <span className="text-sm font-bold text-white">{String(val ?? '—')}</span>}
                  </div>
                );
              })}

              {/* Property type */}
              <div className="flex items-center justify-between py-2 border-b" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                <span className="text-xs text-gray-500 w-36">Property Type</span>
                {editMode
                  ? <select value={(editProp.type || selectedProp?.type || 'landlord')} onChange={e => setEditProp(p => ({ ...p, type: e.target.value as PropertyType }))} className="flex-1 px-3 py-1 rounded-lg text-sm text-white focus:outline-none text-right" style={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)' }}>
                      {Object.entries(TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                  : <span className="text-sm font-bold text-white">{TYPE_LABELS[selectedProp?.type || 'landlord']}</span>}
              </div>
            </div>

            <div className="space-y-4">
              <h2 className="font-black text-white">Financial & Amenities</h2>

              {[
                { label: 'Monthly Income ($)', key: 'currentIncome', type: 'number' },
                { label: 'Monthly Expenses ($)', key: 'operatingExpenses', type: 'number' },
                { label: 'Reserve Fund ($)', key: 'reserveFund', type: 'number' },
                { label: 'Occupancy Rate (%)', key: 'occupancyRate', type: 'number' },
                { label: 'Avg Utility Cost ($)', key: 'avgUtilityCost', type: 'number' },
              ].map(f => {
                const val = (editMode ? editProp : selectedProp || {})[f.key as keyof PropertyProfile];
                return (
                  <div key={f.key} className="flex items-center justify-between py-2 border-b" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                    <span className="text-xs text-gray-500 flex-shrink-0 w-40">{f.label}</span>
                    {editMode
                      ? <input type="number" value={String(val ?? '')} onChange={e => setEditProp(p => ({ ...p, [f.key]: Number(e.target.value) }))} className="flex-1 px-3 py-1 rounded-lg text-sm text-white focus:outline-none text-right" style={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)' }} />
                      : <span className="text-sm font-bold text-white">{String(val ?? '—')}</span>}
                  </div>
                );
              })}

              <div className="space-y-2 pt-2">
                <p className="text-xs font-black text-gray-500 uppercase tracking-widest">Amenities & Features</p>
                {[
                  { label: 'Has Laundry Room', key: 'hasLaundry' },
                  { label: 'Has Storage Areas', key: 'hasStorage' },
                  { label: 'Has Basement', key: 'hasBasement' },
                  { label: 'Has Outdoor Space', key: 'hasOutdoorSpace' },
                  { label: 'Has Rooftop Access', key: 'hasRooftop' },
                  { label: 'Has Clubhouse', key: 'hasClubhouse' },
                  { label: 'EV-Ready Electrical', key: 'hasEVReady' },
                  { label: 'Has Solar', key: 'hasSolar' },
                ].map(f => {
                  const val = Boolean((editMode ? editProp : selectedProp || {})[f.key as keyof PropertyProfile]);
                  return (
                    <div key={f.key} className="flex items-center justify-between">
                      <span className="text-xs text-gray-400">{f.label}</span>
                      {editMode
                        ? TOGGLE(val, () => setEditProp(p => ({ ...p, [f.key]: !val })))
                        : <span className="text-xs font-black" style={{ color: val ? '#4ade80' : '#6b7280' }}>{val ? 'Yes' : 'No'}</span>}
                    </div>
                  );
                })}
              </div>
              {editMode && (
                <button onClick={saveProfile} className="w-full py-3 rounded-xl font-black text-sm text-white hover:brightness-110 transition mt-2" style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>
                  Save Profile
                </button>
              )}
            </div>
          </div>
        )}

        {/* ── OPPORTUNITIES ─────────────────────────────────────────────────── */}
        {tab === 'opportunities' && (
          <div className="space-y-4">
            {/* Search + filters */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                <input value={searchOpps} onChange={e => setSearchOpps(e.target.value)} placeholder="Search opportunities…"
                  className="w-full pl-10 pr-4 py-3 rounded-xl text-sm text-white placeholder-gray-600 focus:outline-none"
                  style={{ background: '#111', border: '1px solid rgba(255,255,255,0.08)' }} />
              </div>
              <div className="flex gap-1 p-1 rounded-xl overflow-x-auto" style={{ background: '#111', border: '1px solid rgba(255,255,255,0.07)' }}>
                {([['all','All'], ['lowest_cost','$ Lowest Cost'], ['highest_revenue','↑ Revenue'], ['fastest_payback','⚡ Fastest'], ['lowest_risk','🛡 Low Risk'], ['easiest','Easy']] as [FilterKey, string][]).map(([k, l]) => (
                  <button key={k} onClick={() => setFilterKey(k)}
                    className="px-3 py-1.5 rounded-lg text-xs font-black whitespace-nowrap transition"
                    style={filterKey === k ? { background: '#f59e0b', color: 'white' } : { color: '#6b7280' }}>
                    {l}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              {filteredOpps.map((o, idx) => {
                const sc = STATUS_CFG[o.status];
                return (
                  <motion.div key={o.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.03 }}
                    onClick={() => setSelectedOpp(o)}
                    className="flex items-center gap-4 rounded-2xl px-5 py-4 cursor-pointer hover:brightness-110 transition"
                    style={{ background: '#111', border: '1px solid rgba(255,255,255,0.07)' }}>
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: o.iconColor + '15' }}>
                      <o.icon className="w-5 h-5" style={{ color: o.iconColor }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-black text-white">{o.name}</p>
                        <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full" style={{ background: sc.bg, color: sc.color }}>{sc.label}</span>
                        {o.requiresBoardApproval && <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(99,102,241,0.15)', color: '#818cf8' }}>Board Approval</span>}
                      </div>
                      <p className="text-[10px] text-gray-500">{o.category} · <span style={{ color: DIFFICULTY_COLOR[o.difficulty] }}>{o.difficulty}</span> · <span style={{ color: RISK_COLOR[o.risk] }}>{o.risk} Risk</span></p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-black text-green-400">{fmtRange(o.annualRevenue)}/yr</p>
                      <p className="text-[10px] text-gray-600">Score: {o.score}</p>
                    </div>
                    <div className="text-xs font-black w-12 text-right flex-shrink-0" style={{ color: '#fbbf24' }}>#{idx + 1}</div>
                    <ChevronRight className="w-4 h-4 text-gray-700" />
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── SCENARIO MODELER ──────────────────────────────────────────────── */}
        {tab === 'scenario' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="rounded-2xl p-5 space-y-4" style={{ background: '#111', border: '1px solid rgba(255,255,255,0.07)' }}>
              <h2 className="font-black text-white">Model an Opportunity</h2>
              <div>
                <p className="text-xs text-gray-500 mb-1">Select opportunity</p>
                <select value={scenOpp?.id || ''} onChange={e => setScenOpp(opportunities.find(o => o.id === e.target.value) || null)}
                  className="w-full px-4 py-3 rounded-xl text-sm text-white focus:outline-none" style={{ background: '#0d0d0d', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <option value="">-- Choose --</option>
                  {opportunities.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                </select>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Number of units / spaces: <span className="text-white font-black">{scenUnits}</span></p>
                <input type="range" min={1} max={50} value={scenUnits} onChange={e => setScenUnits(Number(e.target.value))} className="w-full accent-yellow-400" />
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Monthly price per unit: <span className="text-white font-black">${scenPrice}</span></p>
                <input type="range" min={10} max={500} value={scenPrice} onChange={e => setScenPrice(Number(e.target.value))} className="w-full accent-yellow-400" />
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Occupancy / utilization: <span className="text-white font-black">{scenOcc}%</span></p>
                <input type="range" min={20} max={100} value={scenOcc} onChange={e => setScenOcc(Number(e.target.value))} className="w-full accent-yellow-400" />
              </div>
              {scenOpp && (
                <div className="rounded-xl p-3 text-xs text-gray-400" style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)' }}>
                  <p className="font-black text-yellow-400 mb-1">{scenOpp.name}</p>
                  <p>Startup cost: {fmtRange(scenOpp.startupCost)}</p>
                  <p>AI confidence: {scenOpp.confidence}%</p>
                  {scenOpp.nhNote && <p className="mt-1 text-blue-300">🏔 NH: {scenOpp.nhNote.split('.')[0]}.</p>}
                </div>
              )}
            </div>

            <div className="space-y-3">
              <h2 className="font-black text-white">Projected Results</h2>
              {[
                { label: 'Conservative (70%)', value: scenConservative, color: '#6b7280', annual: scenConservative * 12 },
                { label: 'Moderate (100%)',     value: scenModerate,    color: '#fbbf24', annual: scenModerate * 12    },
                { label: 'Optimistic (130%)',   value: scenOptimistic,  color: '#4ade80', annual: scenOptimistic * 12  },
              ].map(s => (
                <div key={s.label} className="rounded-2xl p-5" style={{ background: '#111', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <p className="text-xs text-gray-500 font-black">{s.label}</p>
                  <p className="text-3xl font-black mt-1" style={{ color: s.color }}>${s.value.toLocaleString()}<span className="text-base text-gray-500">/mo</span></p>
                  <p className="text-sm text-gray-400">${s.annual.toLocaleString()}/year</p>
                  {scenOpp && <p className="text-xs text-gray-600 mt-1">Payback: ~{Math.round((scenOpp.startupCost[0] + scenOpp.startupCost[1]) / 2 / Math.max(s.value, 1))} months</p>}
                </div>
              ))}
              {scenOpp && (
                <div className="rounded-2xl p-5" style={{ background: 'rgba(74,222,128,0.06)', border: '1px solid rgba(74,222,128,0.2)' }}>
                  <p className="text-xs font-black text-green-400 mb-1">Impact on Annual NOI</p>
                  <p className="text-2xl font-black text-white">+${(scenModerate * 12).toLocaleString()}<span className="text-sm text-gray-500"> moderate case</span></p>
                  {selectedProp && <p className="text-xs text-gray-500 mt-1">Current NOI: ${currentNOI.toLocaleString()} → Projected: ${(currentNOI + scenModerate * 12).toLocaleString()}</p>}
                </div>
              )}
              <p className="text-[10px] text-gray-600 px-1">Projections are estimates for planning purposes only. Results depend on actual market conditions, implementation quality, and property-specific factors. Verify with qualified professionals before committing capital.</p>
            </div>
          </div>
        )}

        {/* ── PROPOSALS ─────────────────────────────────────────────────────── */}
        {tab === 'proposals' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-black text-white">Board Proposals & Approvals</h2>
              <span className="text-xs text-gray-500">{opportunities.filter(o => o.status !== 'new').length} items in review</span>
            </div>
            {opportunities.filter(o => o.status !== 'new').length === 0 && (
              <div className="rounded-2xl p-10 text-center" style={{ background: '#111', border: '1px solid rgba(255,255,255,0.07)' }}>
                <FileText className="w-10 h-10 text-gray-700 mx-auto mb-2" />
                <p className="text-gray-500 text-sm">No opportunities in review yet.</p>
                <p className="text-gray-700 text-xs mt-1">Open an opportunity and click "Add to Board Review" to start a proposal.</p>
              </div>
            )}
            {opportunities.filter(o => o.status !== 'new').map(o => {
              const sc = STATUS_CFG[o.status];
              return (
                <div key={o.id} className="rounded-2xl p-5" style={{ background: '#111', border: `1px solid ${sc.color}30` }}>
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="flex items-start gap-3">
                      <o.icon className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: o.iconColor }} />
                      <div>
                        <p className="font-black text-sm text-white">{o.name}</p>
                        <p className="text-xs text-gray-500">{fmtRange(o.annualRevenue)}/yr · Startup: {fmtRange(o.startupCost)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[9px] font-black px-2 py-0.5 rounded-full" style={{ background: sc.bg, color: sc.color }}>{sc.label}</span>
                      <button onClick={() => updateOppStatus(o.id, 'approved')} className="text-[10px] px-2 py-1 rounded-lg font-black text-green-400 hover:brightness-110 transition" style={{ background: 'rgba(74,222,128,0.1)' }}>Approve</button>
                      <button onClick={() => updateOppStatus(o.id, 'declined')} className="text-[10px] px-2 py-1 rounded-lg font-black text-red-400 hover:brightness-110 transition" style={{ background: 'rgba(248,113,113,0.1)' }}>Decline</button>
                      <button onClick={() => updateOppStatus(o.id, 'implemented')} className="text-[10px] px-2 py-1 rounded-lg font-black text-purple-400 hover:brightness-110 transition" style={{ background: 'rgba(167,139,250,0.1)' }}>Mark Implemented</button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── OPPORTUNITY DETAIL SLIDE-IN ────────────────────────────────────── */}
      <AnimatePresence>
        {selectedOpp && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex justify-end" style={{ background: 'rgba(0,0,0,0.75)' }}
            onClick={e => { if (e.target === e.currentTarget) setSelectedOpp(null); }}>
            <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 28, stiffness: 280 }}
              className="w-full max-w-lg h-full overflow-y-auto" style={{ background: '#0d0d0d', borderLeft: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="sticky top-0 flex items-center justify-between p-5 border-b" style={{ background: '#0d0d0d', borderColor: 'rgba(255,255,255,0.07)' }}>
                <div className="flex items-center gap-3">
                  <selectedOpp.icon className="w-5 h-5" style={{ color: selectedOpp.iconColor }} />
                  <p className="font-black text-white">{selectedOpp.name}</p>
                </div>
                <button onClick={() => setSelectedOpp(null)}><X className="w-5 h-5 text-gray-500" /></button>
              </div>
              <div className="p-5 space-y-4">
                {/* Revenue at a glance */}
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: 'Monthly Rev', value: fmtRange(selectedOpp.monthlyRevenue) },
                    { label: 'Annual Rev', value: fmtRange(selectedOpp.annualRevenue) },
                    { label: 'Startup Cost', value: fmtRange(selectedOpp.startupCost) },
                  ].map(k => (
                    <div key={k.label} className="rounded-xl p-3 text-center" style={{ background: '#111' }}>
                      <p className="text-xs font-black text-yellow-400">{k.value}</p>
                      <p className="text-[9px] text-gray-600 mt-0.5">{k.label}</p>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: 'Payback', value: `${selectedOpp.paybackMonths[0]}–${selectedOpp.paybackMonths[1]} mo`, color: '#60a5fa' },
                    { label: 'Difficulty', value: selectedOpp.difficulty, color: DIFFICULTY_COLOR[selectedOpp.difficulty] },
                    { label: 'Risk', value: selectedOpp.risk, color: RISK_COLOR[selectedOpp.risk] },
                  ].map(k => (
                    <div key={k.label} className="rounded-xl p-3 text-center" style={{ background: '#111' }}>
                      <p className="text-xs font-black" style={{ color: k.color }}>{k.value}</p>
                      <p className="text-[9px] text-gray-600 mt-0.5">{k.label}</p>
                    </div>
                  ))}
                </div>

                {/* Confidence */}
                <div className="rounded-xl p-4" style={{ background: '#111' }}>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-black text-gray-400">AI Confidence</p>
                    <p className="text-xs font-black text-yellow-400">{selectedOpp.confidence}%</p>
                  </div>
                  <div className="h-2 rounded-full" style={{ background: 'rgba(255,255,255,0.07)' }}>
                    <div className="h-full rounded-full" style={{ width: `${selectedOpp.confidence}%`, background: selectedOpp.confidence > 80 ? '#4ade80' : selectedOpp.confidence > 60 ? '#fbbf24' : '#f87171' }} />
                  </div>
                  <p className="text-[10px] text-gray-600 mt-1">Based on available property data. Add more property info to improve accuracy.</p>
                </div>

                {/* Why */}
                <div className="rounded-xl p-4" style={{ background: 'rgba(96,165,250,0.06)', border: '1px solid rgba(96,165,250,0.15)' }}>
                  <p className="text-xs font-black text-blue-400 mb-1 flex items-center gap-1.5"><Bot className="w-3.5 h-3.5" /> AI Analysis</p>
                  <p className="text-xs text-gray-300 leading-relaxed">{selectedOpp.why}</p>
                </div>

                {/* NH note */}
                {selectedOpp.nhNote && (
                  <div className="rounded-xl p-4" style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.2)' }}>
                    <p className="text-xs font-black text-indigo-400 mb-1">🏔 New Hampshire Notes</p>
                    <p className="text-xs text-gray-300 leading-relaxed">{selectedOpp.nhNote}</p>
                  </div>
                )}

                {/* What to verify */}
                <div className="rounded-xl p-4" style={{ background: '#111' }}>
                  <p className="text-xs font-black text-yellow-400 mb-2 flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5" /> Must Verify Before Implementing</p>
                  {selectedOpp.verify.map((v, i) => <p key={i} className="text-xs text-gray-400 flex items-start gap-2 mb-1"><span className="text-yellow-400 flex-shrink-0">•</span>{v}</p>)}
                </div>

                {/* Next steps */}
                <div className="rounded-xl p-4" style={{ background: '#111' }}>
                  <p className="text-xs font-black text-green-400 mb-2">Recommended Next Steps</p>
                  {selectedOpp.nextSteps.map((s, i) => (
                    <div key={i} className="flex items-start gap-2 mb-1.5">
                      <div className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-black flex-shrink-0 mt-0.5" style={{ background: 'rgba(74,222,128,0.15)', color: '#4ade80' }}>{i + 1}</div>
                      <p className="text-xs text-gray-400">{s}</p>
                    </div>
                  ))}
                </div>

                {/* Status actions */}
                <div className="space-y-2">
                  {selectedOpp.status === 'new' && (
                    <button onClick={() => updateOppStatus(selectedOpp.id, 'under_review')}
                      className="w-full py-3 rounded-xl font-black text-sm hover:brightness-110 transition flex items-center justify-center gap-2"
                      style={{ background: 'rgba(251,191,36,0.1)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.2)' }}>
                      <FileText className="w-4 h-4" /> Add to Board Review
                    </button>
                  )}
                  {selectedOpp.status === 'under_review' && (
                    <div className="grid grid-cols-2 gap-2">
                      <button onClick={() => updateOppStatus(selectedOpp.id, 'approved')} className="py-3 rounded-xl font-black text-sm hover:brightness-110 transition" style={{ background: 'rgba(74,222,128,0.1)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.2)' }}>Approve</button>
                      <button onClick={() => updateOppStatus(selectedOpp.id, 'declined')} className="py-3 rounded-xl font-black text-sm hover:brightness-110 transition" style={{ background: 'rgba(248,113,113,0.1)', color: '#f87171', border: '1px solid rgba(248,113,113,0.2)' }}>Decline</button>
                    </div>
                  )}
                  {selectedOpp.status === 'approved' && (
                    <button onClick={() => updateOppStatus(selectedOpp.id, 'implemented')} className="w-full py-3 rounded-xl font-black text-sm hover:brightness-110 transition" style={{ background: 'rgba(167,139,250,0.1)', color: '#a78bfa', border: '1px solid rgba(167,139,250,0.2)' }}>
                      Mark as Implemented
                    </button>
                  )}
                  {/* Scenario shortcut */}
                  <button onClick={() => { setScenOpp(selectedOpp); setTab('scenario'); setSelectedOpp(null); }}
                    className="w-full py-3 rounded-xl font-black text-sm text-white hover:brightness-110 transition"
                    style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>
                    Model This Opportunity →
                  </button>
                </div>

                <p className="text-[10px] text-gray-700 text-center">AI estimates only. Not financial, legal, zoning, or insurance advice. Verify all figures with qualified professionals before implementation.</p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── ADD PROPERTY MODAL ─────────────────────────────────────────────── */}
      <AnimatePresence>
        {showAddProp && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.8)' }}>
            <motion.div initial={{ scale: 0.92 }} animate={{ scale: 1 }} exit={{ scale: 0.92 }}
              className="w-full max-w-lg rounded-3xl p-6 space-y-4 overflow-y-auto max-h-[90vh]"
              style={{ background: '#111', border: '1px solid rgba(255,255,255,0.1)' }}>
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-black text-white">Add New Property</h2>
                <button onClick={() => setShowAddProp(false)}><X className="w-5 h-5 text-gray-500" /></button>
              </div>
              {[
                { label: 'Property Name', key: 'name', type: 'text', placeholder: '14 Oak Street Apartments' },
                { label: 'Address', key: 'address', type: 'text', placeholder: '14 Oak St, Concord, NH 03301' },
                { label: 'Residential Units', key: 'units', type: 'number', placeholder: '12' },
                { label: 'Parking Spaces', key: 'parkingSpaces', type: 'number', placeholder: '18' },
                { label: 'Monthly Income ($)', key: 'currentIncome', type: 'number', placeholder: '18000' },
                { label: 'Monthly Expenses ($)', key: 'operatingExpenses', type: 'number', placeholder: '7200' },
              ].map(f => (
                <div key={f.key}>
                  <p className="text-xs text-gray-500 mb-1">{f.label}</p>
                  <input type={f.type} placeholder={f.placeholder} onChange={e => setEditProp(p => ({ ...p, [f.key]: f.type === 'number' ? Number(e.target.value) : e.target.value }))}
                    className={INPUT_CLASS} style={INPUT_STYLE} />
                </div>
              ))}
              <div>
                <p className="text-xs text-gray-500 mb-1">Property Type</p>
                <select onChange={e => setEditProp(p => ({ ...p, type: e.target.value as PropertyType }))} className={INPUT_CLASS} style={INPUT_STYLE}>
                  {Object.entries(TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Has Laundry', key: 'hasLaundry' },
                  { label: 'Has Storage', key: 'hasStorage' },
                  { label: 'Has Outdoor Space', key: 'hasOutdoorSpace' },
                  { label: 'Has Basement', key: 'hasBasement' },
                ].map(f => (
                  <div key={f.key} className="flex items-center justify-between rounded-xl px-3 py-2" style={{ background: '#0d0d0d', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <span className="text-xs text-gray-400">{f.label}</span>
                    {TOGGLE(Boolean(editProp[f.key as keyof PropertyProfile]), () => setEditProp(p => ({ ...p, [f.key]: !p[f.key as keyof PropertyProfile] })))}
                  </div>
                ))}
              </div>
              <button onClick={addProperty}
                className="w-full py-3.5 rounded-xl font-black text-sm text-white hover:brightness-110 transition"
                style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>
                Add Property + Run AI Analysis
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
